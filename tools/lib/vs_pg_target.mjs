// tools/lib/vs_pg_target.mjs — A VISSZATÖLTÉSI CÉL KÉT DÖNTÉSE, EGY OTTHONBAN ÉS MEGHÍVHATÓAN (R154).
//
// MIÉRT KÜLÖN MODUL. A `proof:pg-durability` lánc VALÓDI PostgreSQL-t kér, ezért a söprésben nem fut
// (KUKA-307) — a benne álló két döntés viszont TISZTA függvény, és amit a próba nem tud MEGHÍVNI, azt
// bizalomból hisszük (KUKA-207). Innentől mindkettő itt él, és a battéria közvetlenül méri.
//
// A KÉT DÖNTÉS, ÉS MINDKETTŐ EGY KÜLSŐ REVIEW LELETE (Codex, R154 hatodik kör, mindkettő P1):
//
//   1. `restoreTargetProblem` — a cél ALAKJA. A hiba NEM írhatja ki az értéket: ha az operátor épp azt
//      a hibát követi el, amire ez az őr figyel (kapcsolati címet ad meg adatbázis-név helyett), akkor
//      az érték JELSZÓT tartalmaz, és a korábbi alak `JSON.stringify`-jal a naplóba tette — terminálba
//      és CI-naplóba egyaránt. A szabály ebben a rendszerben nem tűr kivételt: `DATABASE_URL` és
//      bármely kulcs soha nem kerül naplóba (CLAUDE.md 1. szakasz). Ezért a hiba a mért TÉNYEKET
//      mondja el (hossz · kezdet-osztály · tartalmaz-e `://`-t vagy `@`-ot), az értéket nem.
//
//   2. `sameDatabase` — a forrás és a cél AZONOSSÁGA. A `URL.pathname` a NYERS, százalékkal kódolt
//      alakot adja: egy `postgres://…/foo%24bar` forrás és egy `VS_RESTORE_TEST_DB=foo$bar` cél
//      UGYANAZ az adatbázis, a nyers összehasonlítás szerint viszont KÜLÖNBÖZŐ — és a lánc másik
//      végén `DROP DATABASE` áll, tehát a próba pont azt a forrást törölte volna, amit ígérete
//      szerint soha nem ír felül. Ezért a nevet DEKÓDOLJUK, mielőtt összevetjük; a hibás
//      százalék-escape pedig NEM kivétel, hanem „nem megállapítható" — és akkor a válasz az
//      ÓVATOS: azonosnak vesszük, tehát megállunk (KUKA-049 · KUKA-203).

/** A megengedett adatbázis-NÉV alakja (idézőjel nélkül használható azonosító). */
// A NÉVADÁS KÖZÖS OTTHONA — az idő-rész innen jön, nem kézi vágásból (`ART05` · KUKA-003).
import naming from '../../contracts/artifactNaming.js';

export const DB_NAME = /^[A-Za-z_][A-Za-z0-9_$]{0,62}$/;

/** PostgreSQL azonosító idézőjelezése — a belső idézőjel duplázódik. */
export const qid = (name) => `"${String(name).replace(/"/g, '""')}"`;

/**
 * A visszatöltési cél alakja. `null` = rendben; különben a hiba leírása az ÉRTÉK NÉLKÜL.
 * A `looks_like_url` azért van, mert a leggyakoribb hiba épp ez — és így a hibaüzenet tud segíteni
 * anélkül, hogy a titkot kiírná.
 */
export function restoreTargetProblem(value) {
  const v = String(value ?? '');
  if (!v) return { reason: 'üres', length: 0, starts: 'nincs', looks_like_url: false };
  if (DB_NAME.test(v)) return null;
  return {
    reason: 'nem adatbázis-NÉV',
    length: v.length,
    starts: /^[A-Za-z_]/.test(v) ? 'betű vagy alulvonás' : /^[0-9]/.test(v) ? 'szám' : 'egyéb karakter',
    looks_like_url: v.includes('://') || v.includes('@'),
  };
}

/**
 * A KAPCSOLATI CÍM QUERY-PARAMÉTEREI IS SZÁMÍTANAK (F154-39, külső review, Codex, tizedik kör, P1).
 *
 * A LELET: a PostgreSQL URI a kapcsolati kulcsszavakat QUERY-paraméterként is elfogadja
 * (`?dbname=…`, `?user=…`), és a megadott paraméter FELÜLÍRJA a cím megfelelő részét. Egy
 * `postgres://decoy@host/?user=source` cím tehát `source` felhasználóként kapcsolódik, és adatbázis-út
 * híján a `source` adatbázist nyitja — a korábbi alak viszont a `decoy` nevet vetette össze a céllal,
 * „eltér"-t mondott, és a lánc végén álló `DROP DATABASE "source"` a VALÓDI FORRÁST törölte volna.
 * Ráadásul a kiszolgáló-URL-ek megtartották a `?dbname=…`-t, ami a BEÁLLÍTOTT utat is felülírta volna.
 *
 * Dokumentáció: PostgreSQL „Connection URIs" — a query-rész kulcsszavai, és hogy az adatbázis
 * alapértelmezése a tényleges felhasználó.
 */
/**
 * EGY KAPCSOLATI KULCSSZÓ ÉRTÉKE — libpq SZEMANTIKÁVAL (F158-01, külső review, Codex, P1).
 *
 * A LELET: `URLSearchParams.get()` az ELSŐ előfordulást adja, a libpq viszont az UTOLSÓ, nem üres
 * ismétlést veszi. Egy `postgres://u@host/decoy?dbname=decoy&dbname=source` cím tehát a `source`
 * adatbázist nyitja, a régi alak mégis `decoy`-t mondott — így a `VS_RESTORE_TEST_DB=source`
 * átment a biztonsági kapun, és a lánc végén álló `DROP DATABASE "source"` a VALÓDI forrást
 * törölte volna. Dokumentáció: PostgreSQL „libpq — Connection Strings" (ismételt kulcs: az
 * utolsó, nem üres érték győz).
 */
function queryParam(u, nev) {
  try {
    const all = u.searchParams.getAll(nev).map((v) => String(v).trim()).filter((v) => v !== '');
    return all.length ? all[all.length - 1] : '';
  } catch { return ''; }
}

/**
 * AZ ÜRES ÉRTÉK IS FELÜLÍRÁS (F158-22, külső review, Codex, BIZTONSÁGI átolvasás, P1).
 *
 * A LELET: a `queryParam` az üres értékeket KISZŰRI, tehát egy `postgres://source@host/decoy?dbname=`
 * címnél az ÚTRA (`decoy`) esett vissza. A libpq viszont az üres felülírást IS eltárolja, és az üres
 * `dbname`-et a FELHASZNÁLÓ nevére oldja fel — tehát a `pg_dump` a `source` adatbázist olvassa, a
 * kapu mégis `decoy`-t mondott, és a lánc végén álló `DROP DATABASE "source"` a VALÓDI forrást
 * törölte volna.
 *
 * A VÁLASZ NEM A LIBPQ PONTOS UTÁNZÁSA, HANEM A MEGÁLLÁS — és ezt kimondom. A libpq ismételt-kulcs
 * szabályáról (F158-01) azt vettem alapul, hogy az UTOLSÓ, NEM ÜRES érték győz; ez a lelet azt
 * mutatja, hogy az üres érték AKTÍV. A két olvasat ott válik el, ahol a `DROP DATABASE` áll — ezért
 * ahol a kettő MÁST adna, a név NEM MEGÁLLAPÍTHATÓ, és megállunk (KUKA-020 · KUKA-049).
 *
 * A szabály tehát: ha a kulcs JELEN VAN, és az UTOLSÓ előfordulása ÜRES, a név nem tudható.
 */
function queryLast(u, nev) {
  try {
    const all = u.searchParams.getAll(nev).map((v) => String(v).trim());
    return all.length ? { jelen: true, ertek: all[all.length - 1] } : { jelen: false, ertek: '' };
  } catch { return { jelen: false, ertek: '' }; }
}

/**
 * EGY KAPCSOLATI KULCSSZÓ A KÖRNYEZETBŐL (F158-16, külső review, Codex, P1).
 *
 * Az üres érték NEM érték: a libpq a `dbname`-et üres sztring esetén is az alapértelmezésre
 * (a felhasználó nevére) oldja fel, ezért a levágás utáni üres értéket NEM MEGADOTTNAK vesszük.
 */
function envValue(env, nev) {
  try {
    const v = env ? env[nev] : undefined;
    return v == null ? '' : String(v).trim();
  } catch { return ''; }
}

/**
 * A TÉNYLEGES adatbázis-név. A SORREND a libpq feloldási sorrendje: a kapcsolati CÍM megelőzi a
 * KÖRNYEZETET, a környezet a beépített alapértelmezést — query `dbname` → út → `PGDATABASE` →
 * query `user` → cím-felhasználó → `PGUSER`; ha egyik sincs, NEM TUDHATÓ.
 *
 * A KÖRNYEZET IS A BEMENET RÉSZE (F158-16, külső review, Codex, P1).
 *
 * A LELET: egy út nélküli `postgres://decoy@host` cím mellett `PGDATABASE=source` esetén a kliens a
 * `source` adatbázist nyitja — a korábbi alak mégis a cím FELHASZNÁLÓJÁT (`decoy`) mondta forrásnak,
 * tehát a `VS_RESTORE_TEST_DB=source` „eltér"-t kapott, a lánc elindult, és a `DROP DATABASE "source"`
 * a VALÓDI forrást törölte volna. A `pg_dump` a környezetet ÖRÖKLI, a kapu viszont nem nézte.
 *
 * ÉS AMIT EZ A SAJÁT KORÁBBI MONDATOMRÓL ÁLLÍT: a `KUKA-341`-ben kimondtam, hogy a környezeti
 * változók „nincsenek benne, és ezért minden bizonytalanság az óvatos ágra esik" — ez NEM volt igaz.
 * A felhasználó-alapú tartalék NEVET adott, a név pedig ELDÖNTÖTT válasz: a kapu nem megállt, hanem
 * TOVÁBBENGEDETT. Egy kimondott hiány csak akkor védelem, ha a kód tényleg megáll (KUKA-020 · KUKA-050).
 *
 * Dokumentáció: PostgreSQL „libpq — Environment Variables" (`PGDATABASE` ≡ `dbname`, `PGUSER` ≡ `user`,
 * `PGSERVICE` ≡ `service`) és „Connection Strings" (a cím paraméterei megelőzik a környezetet).
 */
/**
 * A SÉMA DÖNTI EL, HOL ÁLL AZ ADATBÁZIS ÉS HOL A GAZDAGÉP — ZÁRT LISTÁVAL
 * (R166/P1, külső review, Codex, nyolcadik kör: „Strip node-postgres `db` overrides when retargeting",
 * `#discussion_r4207213198`).
 *
 * A LELET SZÖVEGE ÉS A MÉRÉS. A lelet azt állította, hogy `postgres://u@localhost/original?db=source`
 * mellett a node-postgres a FORRÁS adatbázisra kapcsolódik. **A KITŰZÖTT KÖNYVTÁRON MEGMÉRVE
 * (`pg-connection-string` 2.14.1) EZ AZ ESET NEM ÁLL ELŐ:** a hálózati sémánál a könyvtár az utat
 * FELTÉTEL NÉLKÜL írja a `database`-re, tehát sem `db=`, sem `dbname=`, sem `database=` nem írhatja
 * felül — mind a négy mért cím `original`-t adott.
 *
 * A MECHANIZMUS VISZONT LÉTEZIK, CSAK MÁS SÉMÁN — ÉS EZ A VALÓDI RÉS. A könyvtárban a `db=`
 * felülírás KIZÁRÓLAG a `socket:` séma ágán áll, és ott az ÚT a SOCKET-KÖNYVTÁR, nem adatbázis
 * (`config.host = decodeURI(result.pathname); config.database = result.searchParams.get('db')`).
 * A régi alak tehát `socket://u@/var/run/pg?db=eles` mellett
 *   · `effectiveDatabase`-ben az ÚTAT (`var/run/pg`) mondta adatbázis-névnek — a kapu így egy
 *     `eles` nevű célt „eltér"-nek látott, és a `DROP DATABASE "eles"` a VALÓDI adatbázist vitte volna;
 *   · `withDatabase`-ben az ÚTAT írta át a friss cél nevére — vagyis a SOCKET-KÖNYVTÁRAT rontotta el,
 *     a `db=`-t pedig érintetlenül hagyta: az átirányítás UTÁN is az EREDETI adatbázisra ment volna,
 *     miközben a takarítás a saját, üres célt dobja el.
 *
 * MIÉRT EGY HELYEN. Mert a séma-feltevés NÉGY feloldóban élt (`effectiveDatabase` · `withDatabase` ·
 * `effectiveHost` · és rajta keresztül a `cliEnvFor`), és egy szabály négy háza az a hiba, amit a
 * `KUKA-003` és a `KUKA-129` nevez meg. A lista ZÁRT: ami nincs rajta, az NEM tipp, hanem nevezett
 * megállás (`KUKA-236` — a zárt lista a mezőkre is érvényes).
 *
 * Dokumentáció: `pg-connection-string` README, „Unix domain socket" szakasz — amire maga a lelet is
 * hivatkozik.
 */
export const PG_URL_SHAPES = Object.freeze({
  'postgres:': 'halozati',
  'postgresql:': 'halozati',
  'socket:': 'socket',
});

export function pgUrlShape(sourceUrl) {
  const nyers = String(sourceUrl);
  let url;
  try { url = new URL(nyers); } catch {
    // ── KÉT ALAK, AMIT A KLIENS ELFOGAD, A WHATWG URL VISZONT NEM — ÉS EZÉRT MEGÁLLUNK ────────────
    //
    // Mérve (`pg-connection-string` 2.14.1): a `socket://u@/út?db=x` címet a könyvtár egy PÓT-gazdagép
    // behelyezésével (`@/` → `@___DUMMY___/`) mégis elfogadja, a perjellel kezdődő sztringet pedig
    // egyáltalán nem URL-ként, hanem „gazdagép SZÓKÖZ adatbázis" alakban olvassa. Mindkettő VALÓDI,
    // működő bemenet a kliensnek — a mi feloldónk mégsem utánozza le, mert ahol a lánc végén
    // `DROP DATABASE` áll, a második értelmezési szabály a második hibalehetőség (KUKA-020 · KUKA-203).
    // A válasz tehát NEVEZETT megállás, nem néma „nem értelmezhető".
    if (nyers.startsWith('/')) {
      return { shape: null, url: null,
        basis: 'a cím PERJELLEL kezdődik — ezt a kliens nem URL-ként, hanem „gazdagép SZÓKÖZ adatbázis" alakban olvassa; ezt a feloldó szándékosan NEM utánozza, tehát NEM megállapítható' };
    }
    if (/^socket:/i.test(nyers)) {
      return { shape: null, url: null,
        basis: 'a `socket:` cím `@/` alakú (üres autoritás-gazdagép) — a kliens egy PÓT-gazdagéppel elfogadja, a WHATWG URL nem értelmezi; a feloldó itt NEM tippel, tehát NEM megállapítható' };
    }
    return { shape: null, url: null, basis: 'a forrás-cím nem értelmezhető' };
  }
  if (!Object.prototype.hasOwnProperty.call(PG_URL_SHAPES, url.protocol)) {
    return { shape: null, url,
      basis: `a cím sémája nincs a zárt listán (\`${Object.keys(PG_URL_SHAPES).join('` · `')}\`) — a kliens máshol keresheti az adatbázist és a gazdagépet, tehát NEM megállapítható` };
  }
  const shape = PG_URL_SHAPES[url.protocol];
  return { shape, url,
    basis: shape === 'socket'
      ? 'a cím `socket:` sémájú — az ÚT a socket-KÖNYVTÁR, az adatbázist a `?db=` nevezi meg'
      : 'a cím hálózati sémájú — az ÚT nevezi meg az adatbázist' };
}

/**
 * A `socket:` SÉMA ADATBÁZIS-NEVE. Itt NINCS két olvasat, mert a libpq a `socket:` URI-t nem is
 * értelmezi — a CLI-eszközök ezért SOHA nem a címet kapják, hanem a `cliEnvFor` környezetét. A
 * node-postgres az ELSŐ `?db=` előfordulást veszi (`searchParams.get`), a mi libpq-szabályunk az
 * UTOLSÓ, nem üreset (F158-01) — ahol a kettő MÁST adna, a név NEM megállapítható.
 */
function socketDatabase(u) {
  let all;
  try { all = u.searchParams.getAll('db').map((v) => String(v).trim()); } catch { all = []; }
  if (!all.length) {
    return { name: null, basis: 'a `socket:` cím nem hordoz `?db=` paramétert — az adatbázist a kliens a felhasználóból vagy a környezetből venné, ami innen nem tudható' };
  }
  const elso = all[0];
  if (elso === '') {
    return { name: null, basis: 'a `socket:` cím `?db=` paramétere ÜRES — a kliens az alapértelmezésre esne, tehát a név NEM megállapítható' };
  }
  if (all.some((v) => v !== '' && v !== elso)) {
    return { name: null, basis: 'a `socket:` cím TÖBB, egymástól ELTÉRŐ `?db=` értéket hordoz — a node-postgres az ELSŐT veszi, a libpq-szabály az UTOLSÓT; a kettő MÁST ad, tehát NEM megállapítható' };
  }
  return { name: elso, basis: 'a `socket:` cím `?db=` paramétere nevezi meg az adatbázist (az ÚT a socket-könyvtár, nem adatbázis)' };
}

export function effectiveDatabase(sourceUrl, env = process.env) {
  const alak = pgUrlShape(sourceUrl);
  if (!alak.shape) return { name: null, basis: alak.basis };
  const u = alak.url;
  // A `socket:` SÉMÁNÁL AZ ÚT NEM ADATBÁZIS (R166/P1) — a név a `?db=`-ben áll, külön feloldóban.
  if (alak.shape === 'socket') return socketDatabase(u);
  // ── A SZOLGÁLTATÁS-FÁJL OLVASHATATLAN INNEN (F158-02, külső review, Codex, P1) ──────────────────
  //
  // A LELET: `?service=prod` esetén a libpq a `pg_service.conf`-ból vesz további paramétereket —
  // köztük `dbname`-et —, amit a kapcsolati cím NEM tartalmaz. Egy út nélküli
  // `postgres://decoy@host/?service=prod` cím tehát a szolgáltatás `dbname`-ét nyitja, a régi alak
  // mégis a cím FELHASZNÁLÓJÁT (`decoy`) mondta forrásnak — és a `DROP DATABASE` a valódi forrást
  // vitte volna. A fájl tartalma itt elvileg sem tudható (más gépen, más engedélyekkel áll), ezért
  // a válasz NEM találgatás, hanem NEVEZETT „nem megállapítható" — ott, ahol a következmény
  // adatbázis-törlés, a nem tudás MEGÁLLÁST jelent (KUKA-049 · KUKA-203).
  // A SZOLGÁLTATÁST A KÖRNYEZET IS MEGNEVEZHETI (`PGSERVICE` ≡ `service`, F158-16) — ugyanaz a
  // következmény, tehát ugyanaz a válasz: NEM megállapítható.
  if (queryParam(u, 'service') || envValue(env, 'PGSERVICE')) {
    const honnan = queryParam(u, 'service')
      ? 'a cím `?service=` paramétert hordoz'
      : 'a környezet `PGSERVICE`-t ad meg';
    return { name: null, basis: `${honnan} — a szolgáltatás-fájl \`dbname\`-et is adhat, amit innen NEM látunk` };
  }
  const qDbLast = queryLast(u, 'dbname');
  if (qDbLast.jelen && qDbLast.ertek === '') {
    return { name: null, basis: 'a cím ÜRES `?dbname=` felülírást hordoz — a libpq ezt AKTÍV felülírásként tárolja, és a nevet a felhasználóra oldja fel; a kettő MÁST adhat, tehát NEM megállapítható' };
  }
  // ── A KÉT FOGYASZTÓ OLVASATÁT ÖSSZE KELL VETNI (R166/P1 — lásd a `pgUrlShape` fejét) ─────────────
  //
  // A `?dbname=` az EGYETLEN pont a hálózati sémában, ahol a két fogyasztó MÁST olvas: a libpq veszi,
  // a node-postgres pedig az utat írja a `database`-re FELTÉTEL NÉLKÜL (mérve: `pg-connection-string`
  // 2.14.1, `config.database = pathname ? decodeURI(pathname) : null`). A régi alak itt a libpq
  // olvasatát adta ELDÖNTÖTT névnek — és ezzel a kapu egy olyan célt engedhetett át, amit a
  // node-postgres-oldali lánc ÉPPEN HASZNÁL (KUKA-039: a szabály egyik végén javítva).
  const kozos = sharedDatabase(u, env);
  if (!qDbLast.jelen) return kozos;
  if (!kozos.name) {
    return { name: null, basis: `a cím \`?dbname=\` felülírást hordoz, amit a libpq VESZ, a node-postgres pedig NEM — és a node-olvasat neve sem tudható (${kozos.basis}), tehát NEM megállapítható` };
  }
  if (kozos.name !== qDbLast.ertek) {
    return { name: null, basis: `a KÉT FOGYASZTÓ MÁST olvas: a libpq (\`pg_dump\`/\`psql\`) a cím \`?dbname=\` paraméterét veszi, a node-postgres viszont ${kozos.basis} — ahol a lánc végén \`DROP DATABASE\` áll, a kétértelműség MEGÁLLÁS (KUKA-049 · KUKA-203)` };
  }
  return { name: kozos.name, basis: `a cím \`?dbname=\` paramétere és a node-olvasat UGYANAZT nevezi meg (${kozos.basis})` };
}

/**
 * A KÉT FOGYASZTÓ KÖZÖS olvasata a hálózati sémában: út → `PGDATABASE` → `?user=` → cím-felhasználó
 * → `PGUSER`. Ebben a láncban a libpq és a node-postgres MEGEGYEZIK (az út nélküli címnél mindkettőnél
 * a FELHASZNÁLÓ neve lesz az adatbázis — a node-postgres oldalán a kiszolgáló oldja fel így).
 */
function sharedDatabase(u, env) {
  let path;
  try { path = decodeURIComponent(String(u.pathname || '').replace(/^\/+/, '')); }
  catch { return { name: null, basis: 'a forrás adatbázis-neve hibás százalék-kódolást tartalmaz' }; }
  if (path) return { name: path, basis: 'a cím útja nevezi meg az adatbázist' };
  // A CÍM NEM NEVEZI MEG — innentől a KLIENS alapértékei döntenek, és azok a KÖRNYEZETBEN állnak.
  const envDb = envValue(env, 'PGDATABASE');
  if (envDb) return { name: envDb, basis: 'a cím nem nevez meg adatbázist, ezért a környezet `PGDATABASE` értéke dönt' };
  // ÉS UGYANEZ A FELHASZNÁLÓRA (F158-22): egy ÜRES `?user=` felülírja a cím felhasználóját, tehát a
  // cím-felhasználó innentől nem jelölt — a kliens a környezetből vagy a rendszer-felhasználóból veszi.
  const qUserLast = queryLast(u, 'user');
  if (qUserLast.ertek) return { name: qUserLast.ertek, basis: 'nincs adatbázis-út, és a `?user=` paraméter adja a felhasználót — az adatbázis alapértelmezése a felhasználó neve' };
  let user;
  try { user = decodeURIComponent(String(u.username || '')); } catch { user = String(u.username || ''); }
  if (user && !(qUserLast.jelen && qUserLast.ertek === '')) {
    return { name: user, basis: 'nincs adatbázis-út, ezért a FELHASZNÁLÓ neve az adatbázis' };
  }
  const envUser = envValue(env, 'PGUSER');
  if (envUser) return { name: envUser, basis: 'sem adatbázis, sem felhasználó a címben — a környezet `PGUSER` értéke lesz a felhasználó, és egyben az adatbázis neve' };
  return { name: null, basis: 'sem a cím, sem a környezet nem nevezi meg — a tényleges nevet a kliens a RENDSZER-felhasználóból veszi, ami innen nem tudható' };
}

/**
 * EGY CÍM EGY MEGNEVEZETT ADATBÁZISRA — A SÉMÁHOZ IGAZÍTVA (R166/P1).
 *
 * A HÁLÓZATI sémánál az ÚT nevezi meg az adatbázist, és a `?dbname=` felülírást KIVESSZÜK, különben a
 * libpq-oldali fogyasztó (`pg_dump`/`psql`) a RÉGI nevet olvasná a frissen beállított út mellett. A
 * `?db=` és a `?database=` ugyanebből az okból megy ki: egyik fogyasztó sem veszi őket a hálózati
 * ágon, de egy ottmaradt kulcs a KÖVETKEZŐ olvasót megtéveszti (KUKA-050).
 *
 * A `socket:` SÉMÁNÁL AZ ÚT A SOCKET-KÖNYVTÁR — ha azt írjuk át, a KAPCSOLATOT rontjuk el, az
 * adatbázis pedig a `?db=`-ben marad, vagyis az átirányítás NEM irányít át. Ezért itt az ÚT
 * ÉRINTETLEN, és a `?db=` kapja a nevet, PONTOSAN EGY előfordulással.
 *
 * ÉS AMI NINCS A ZÁRT LISTÁN: `TypeError`-ral MEGÁLLUNK. Egy ismeretlen sémán nem tudjuk, hol áll az
 * adatbázis — ott a néma „átirányítás" a legrosszabb válasz (KUKA-020 · KUKA-236).
 */
export function withDatabase(sourceUrl, name) {
  const alak = pgUrlShape(sourceUrl);
  if (!alak.shape) throw new TypeError(`withDatabase — az átirányítás NEM biztonságos: ${alak.basis}`);
  const u = alak.url;
  for (const kulcs of ['dbname', 'db', 'database']) {
    try { u.searchParams.delete(kulcs); } catch { /* nincs query */ }
  }
  if (alak.shape === 'socket') {
    u.searchParams.set('db', String(name));
    return u;
  }
  u.pathname = `/${String(name)}`;
  return u;
}

/**
 * Ugyanarra az adatbázisra mutat-e a forrás-cím és a cél NÉV? A dekódolás kötelező, a bizonytalanság
 * pedig IGEN-t ad: ahol a következmény `DROP DATABASE`, ott a „nem tudom" nem lehet „nem egyezik".
 */
export function sameDatabase(sourceUrl, restoreTarget, env = process.env) {
  try { new URL(String(sourceUrl)); }
  catch { return { same: true, basis: 'a forrás-cím nem értelmezhető — ÓVATOS megállás' }; }
  const eff = effectiveDatabase(sourceUrl, env);
  if (!eff.name) return { same: true, basis: `${eff.basis} — NEM megállapítható, ÓVATOS megállás` };
  if (eff.name === String(restoreTarget)) return { same: true, basis: `AZONOS a céllal: ${eff.basis}` };
  return { same: false, basis: `a tényleges forrás-név eltér a céltól (${eff.basis})` };
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// A VISSZATÖLTÉSI PRÓBA BIZTONSÁGI DÖNTÉSEI — TISZTA FÜGGVÉNYEKBEN, MEGHÍVHATÓAN (R164/1).
//
// MIÉRT ITT, ÉS MIÉRT TISZTÁN. A chatgpt-v3 az R164-ben a próba KÉT KONKRÉT kódútját nevezte meg:
// a `DROP DATABASE IF EXISTS` a megadott célon, és a `pg_restore` hibájának elnyelése, ha a stderr
// tartalmazza a „warning" szót. Mindkettő a próba belsejében, egyszer lefutó, nem meghívható kódban
// állt — amit a próba nem tud MEGHÍVNI, azt bizalomból hisszük (KUKA-207). Innentől a döntés tiszta
// függvény, a battéria közvetlenül méri, a próba pedig csak hívja.
// ════════════════════════════════════════════════════════════════════════════════════════════════

/** A próba által generált célnevek FELISMERHETŐ előtagja. FIGYELEM: az előtag NEM tulajdonbizonyíték. */
export const RESTORE_TARGET_PREFIX = 'vs_restore_proba_';

/**
 * EGY FRISS, EGYEDI CÉLNÉV. A próba ezt HOZZA LÉTRE, nem ezt keresi meg.
 *
 * MIÉRT GENERÁLT: az R164 döntése szerint a próba alapértelmezett célja friss, egyedi, a futás által
 * létrehozott adatbázis — már létező célt nem törölhet és nem használhat felülírással, akkor sem, ha
 * a neve más, mint a forrásnak. Egy FIX név (`vs_visszatoltes_proba`) ezt fogalmilag nem tudja: a
 * második futás vagy ütközik, vagy töröl.
 */
export function freshTargetName({ now = Date.now(), rand = Math.random() } = {}) {
  /**
   * AZ IDŐ-RÉSZ A NÉVADÁS KÖZÖS OTTHONÁBÓL JÖN (`contracts/artifactNaming.js` · `stampParts`).
   *
   * MIÉRT: az első alakom KÉZZEL vágta az ISO-időbélyeget, és ezt az `ART05` őr NEVEZETTEN tiltja —
   * a V2-ben MÉRVE 40 szerszám gyártott így nevet, legalább három különböző alakban (KUKA-003). Az
   * őrt NEM lazítottam (KUKA-091): a kézi vágás helyére a közös feloldó lépett. SAJÁT LELET, és
   * kimondom: a pirosat a csomag korábbi szakasza okozta, és a lánc visszamérésén derült ki — nem
   * az írás pillanatában.
   */
  const { date, time } = naming.stampParts(new Date(Number(now)));
  const t = `${date}${time}`;
  const r = Math.floor(Number(rand) * 0xffffff).toString(16).padStart(6, '0');
  const name = `${RESTORE_TARGET_PREFIX}${t}_${r}`;
  if (!DB_NAME.test(name)) throw new Error('freshTargetName: a generált név nem adatbázis-NÉV alakú');
  return name;
}

/**
 * HASZNÁLHATÓ-E A CÉL? — A TULAJDON a LÉTREHOZÁS, nem a név.
 *
 * A LELET (R164/1): a régi próba `DROP DATABASE IF EXISTS <cél>`-t futtatott, majd `CREATE`-et. Egy
 * ELŐRE LÉTEZŐ, akár teljesen más célra használt adatbázis így ELTŰNT, ha a neve egyezett a
 * `VS_RESTORE_TEST_DB` értékével — a próba tehát olyan erőforrást takarított, amit nem ő hozott létre.
 *
 * A SZABÁLY: a próba CSAK azt az adatbázist használhatja és takaríthatja, amit ebben a futásban ő
 * hozott létre. A `CREATE DATABASE` sikere a tulajdon-bizonyíték (PostgreSQL-ben nincs
 * `IF NOT EXISTS`: ütközésnél 42P04 jön, tehát a siker azt jelenti, hogy ELŐTTE nem létezett).
 * A NÉV-ELŐTAG nem bizonyíték: egy korábbi futás maradéka ugyanilyen nevű, mégsem a miénk.
 *
 * @param {{ measuredSource: string|null, explicitTarget: string|null, exists: boolean, generated: string }} x
 *   measuredSource — a FORRÁS neve, a VALÓDI kapcsolatból mérve (`current_database()`), nem feloldva.
 */
export function restoreTargetDecision({ measuredSource, explicitTarget = null, exists = false, generated }) {
  if (!generated || !DB_NAME.test(generated)) {
    return { use: null, stop: true, basis: 'a generált célnév nem adatbázis-NÉV alakú — megállás' };
  }
  if (explicitTarget !== null && explicitTarget !== '') {
    const problem = restoreTargetProblem(explicitTarget);
    if (problem) return { use: null, stop: true, basis: `a megadott cél alakja hibás (${problem.reason}) — megállás`, problem };
    if (!measuredSource) {
      return { use: null, stop: true, basis: 'a FORRÁS neve a kapcsolatból nem mérhető — megállás (nem találgatunk a törlés előtt)' };
    }
    if (explicitTarget === measuredSource) {
      return { use: null, stop: true, basis: 'a megadott cél AZONOS a MÉRT forrással — megállás' };
    }
    if (PROTECTED_DB_NAMES.includes(explicitTarget)) {
      return { use: null, stop: true, basis: `a megadott cél VÉDETT rendszer-adatbázis (${explicitTarget}) — megállás` };
    }
    if (exists) {
      return { use: null, stop: true,
        basis: 'a megadott cél MÁR LÉTEZIK — a próba nem törli és nem írja felül, mert nem ő hozta létre (a név nem tulajdonbizonyíték)' };
    }
    return { use: explicitTarget, stop: false, basis: 'a megadott cél NEM létezik — a próba LÉTREHOZZA, tehát a sajátja lesz' };
  }
  if (!measuredSource) {
    return { use: null, stop: true, basis: 'a FORRÁS neve a kapcsolatból nem mérhető — megállás' };
  }
  if (generated === measuredSource) {
    return { use: null, stop: true, basis: 'a generált név AZONOS a mért forrással (gyakorlatilag lehetetlen) — megállás' };
  }
  if (exists) {
    return { use: null, stop: true,
      basis: 'a GENERÁLT név már létezik (korábbi futás maradéka vagy ütközés) — a próba nem veszi át, ÚJ nevet kell generálni' };
  }
  return { use: generated, stop: false, basis: 'friss, egyedi, a futás által létrehozott cél' };
}

/** A SOHA nem célként használható rendszer-adatbázisok. */
export const PROTECTED_DB_NAMES = Object.freeze(['postgres', 'template0', 'template1']);

/**
 * A VISSZATÖLTÉS VERDIKTJE — SORONKÉNT OSZTÁLYOZVA, NEM RÉSZSZTRINGGEL (R164/1).
 *
 * A LELET: a régi alak `if (!/warning/i.test(stderr)) throw e;` volt — vagyis BÁRMILYEN hiba
 * ELNYELŐDÖTT, ha a kimenet BÁRHOL tartalmazta a „warning" szót. Egy valódi hiba és egy ártalmatlan
 * figyelmeztetés EGYÜTT érkezve tehát SIKERNEK számított, és a nem nulla kilépés általánosan PASS-szá
 * vált. Ez a KUKA-124 osztálya (a rossz nevű válasz elrejti az igazit) és a KUKA-215-é (a választ MEG
 * KELL MÉRNI).
 *
 * A SZABÁLY: a `pg_restore` a saját kimenetét OSZTÁLYOZVA írja (`pg_restore: warning:` ·
 * `pg_restore: error:`), ezért SORONKÉNT számolunk. Nem nulla kilépés CSAK akkor tolerálható, ha
 * NULLA hiba-sor van; egyetlen hiba-sor mellett a verdikt FAIL, akkor is, ha figyelmeztetés is jött.
 * És a végső mérce ettől függetlenül a TARTALMI visszaolvasás (a hívó kötelezően méri).
 */
export function restoreOutcome({ exitCode = 0, stderr = '' } = {}) {
  const sorok = String(stderr || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const hibak = sorok.filter((l) => /(^|:\s*)error:/i.test(l));
  const figyelmeztetesek = sorok.filter((l) => /(^|:\s*)warning:/i.test(l));
  const kod = Number(exitCode) || 0;
  if (hibak.length > 0) {
    return { ok: false, errors: hibak.length, warnings: figyelmeztetesek.length, exitCode: kod,
      basis: `${hibak.length} HIBA-sor a kimenetben — a figyelmeztetések jelenléte ezt nem oldja fel` };
  }
  if (kod !== 0) {
    /**
     * A NEM NULLA KILÉPÉS BUKÁS — AKKOR IS, HA A KIMENETBEN NINCS HIBA-SOR (R164, KÜLSŐ REVIEW, P1).
     *
     * A LELET (Codex, az R164/1-es javításom FELETT): az első alakom a nem nulla kilépést
     * TOLERÁLTA, ha egyetlen `error:`-sort sem talált. Ez két úton ad hamis zöldet:
     *   · a `pg_restore` diagnosztikája LEHET ÜRES vagy MÁS NYELVŰ — ilyenkor az angol `error:`
     *     jelölő nincs ott, és a soronkénti osztályozás nullát talál;
     *   · a PostgreSQL dokumentált viselkedése szerint a visszatöltés az SQL-hibák UTÁN FOLYTATÓDIK,
     *     és a hibák SZÁMÁT a végén jelenti — a nem nulla kilépés tehát épp azt mondja, hogy volt
     *     hiba, nem azt, hogy „csak figyelmeztetés".
     * És a tartalmi visszaolvasás ezt nem pótolja: az CSAK a megmért táblákat, a séma-verziót és
     * EGY csatorna-sort nézi — egy nem mért objektum hibája így végig zöld maradt volna (KUKA-216).
     *
     * MOSTANTÓL: `ok` CSAK nulla kilépés mellett. A figyelmeztetés továbbra sem buktat, a kilépési
     * kód igen. (Ez SZŰKÍTI a korábbi döntésemet — D-VS-3167 → D-VS-3174.)
     */
    return { ok: false, errors: hibak.length, warnings: figyelmeztetesek.length, exitCode: kod,
      basis: `NEM NULLA kilépés (${kod}) — a visszatöltés nem sikeres, akkor sem, ha a kimenetben nincs `
        + `felismert hiba-sor (a diagnosztika lehet üres vagy más nyelvű, és a pg_restore az SQL-hibák `
        + `UTÁN is folytatja a munkát)` };
  }
  return { ok: true, errors: 0, warnings: figyelmeztetesek.length, exitCode: 0,
    basis: figyelmeztetesek.length ? `nulla kilépés, ${figyelmeztetesek.length} figyelmeztetés` : 'nulla kilépés, tiszta kimenet' };
}

/**
 * TITOKMENTES SZÖVEG A NAPLÓHOZ (R164/1: „a hibákból, parancssorból és artefaktumokból se kerüljön
 * titok a naplóba").
 *
 * A `pg_dump`/`pg_restore`/`psql` hibái és a parancssorok VISSZAIDÉZHETIK a kapcsolati címet, abban
 * pedig jelszó áll. A szabály ebben a rendszerben nem tűr kivételt: `DATABASE_URL` és bármely kulcs
 * soha nem kerül naplóba (CLAUDE.md 1. szakasz) — ezért minden kiírt szöveg ezen a tisztítón megy át.
 */
/**
 * A TITOK VÉGÉT A SHELL-SZÓ HATÁRA ADJA, NEM AZ ELSŐ ZÁRÓ IDÉZŐJEL (R166, külső review, Codex, P2).
 *
 * A LELET: a korábbi alak az idézett értéket az ELSŐ záró idézőjelig vitte
 * (`'[^']*'` · `"[^"]*"`). A shell viszont a `'pa'\''ss'` alakot EGY SZÓNAK olvassa (aposztróf a
 * jelszóban), és a dupla idézeten belül a `\"` sem zár. MÉRVE a lelet pontos esetén:
 * `PGPASSWORD='pa'\''ss'` → `PGPASSWORD=«elrejtve»''ss'` — a jelszó MARADÉKA a naplóba került.
 *
 * A VÁLASZ A LELET SAJÁT JAVASLATA: a titkot a megbízható FIELD-HATÁRIG rejtjük el, és azt a határt
 * a shell szabálya adja — nem egy idézőjel-pár. Ez a letapogató az értéket EGY szóként fogyasztja:
 * aposztróf-idézett szakasz (abban nincs escape) · idézőjel-idézett szakasz (`\x` escape-ekkel) ·
 * escape-elt karakter · sima karakter — amíg IDÉZETEN KÍVÜLI szóköz, `&` vagy `;` nem jön. A nyitott,
 * záratlan idézet a sor VÉGÉIG tart: ahol a határ nem tudható, a többet rejtünk el, nem a kevesebbet
 * (KUKA-049 — a titoknál a bizonytalanság nem a megengedő ág).
 */
/**
 * AZ ELVÁLASZTÓ-KÉSZLET A HÍVÓTÓL JÖN (R166, KÜLSŐ REVIEW, Codex, P2 · `KUKA-410`).
 *
 * A LELET: a `KUKA-404` javításom a kapcsolati cím végét is ezzel a letapogatóval kereste — benne a
 * `&` és a `;` ELVÁLASZTÓ. A shellben azok tényleg szó-határok, egy URL-ben viszont LEGÁLISAK (a
 * jelszó-részben és a query-ben is), tehát `postgres://u:pa;ss@host/db` esetén a rejtés a `pa` után
 * megállt, és a `;ss@host/db` — a jelszó maradéka ÉS a gazdagép — a naplóba került. Vagyis SHELL-
 * nyelvtant alkalmaztam olyan szövegre, ami nem feltétlenül shell-parancs.
 *
 * MOSTANTÓL a hívó mondja meg, mi zár: a kulcs=érték alak (`PGPASSWORD=…`) SHELL-szót olvas, tehát
 * nála a `&` és a `;` is határ; a KAPCSOLATI CÍM viszont csak a FEHÉR SZÓKÖZIG (illetve az idézet
 * záróig vagy a sor végéig) tart — egy URL-ben nem lehet escape-elés nélküli szóköz, tehát ez a
 * pontos határ, és a bizonytalanság itt is a SZIGORÚBB ág (`KUKA-200`).
 */
/**
 * A REJTÉS SÉMA-KÉSZLETE A BEFOGADOTT SÉMÁK ZÁRT LISTÁJÁBÓL JÖN (R166, KÜLSŐ REVIEW, Codex, P2 ·
 * `KUKA-414`).
 *
 * A LELET: a rejtés sémái BEÍRT névsorból jöttek (`postgres` · `postgresql` · `pg`), miközben a
 * `pgUrlShape` zárt listája a `socket:` sémát is BEFOGADJA, a `cliEnvFor` pedig a `socket://` cím
 * `user:jelszó@` részéből VALÓDI `PGPASSWORD`-öt állít a gyermeknek. MÉRVE: a
 * `socket://u:JELSZÓ@localhost/út?db=forrás` cím a rejtésen BETŰRE VÁLTOZATLANUL ment át — tehát egy
 * napló- vagy hibasor a jelszót kiírta volna. Ugyanaz az osztály, mint a `KUKA-227`: egy ÚJ,
 * befogadott alak a RÉGI olvasók listájából nem vezethető le.
 *
 * MOSTANTÓL a készlet a `PG_URL_SHAPES` kulcsaiból épül, tehát egy jövőbeli séma a befogadásával
 * EGYÜTT kerül a rejtésbe. ÉS A RÁADÁS SZÁNDÉKOS: a rejtés TÖBBET takar, mint amit a feloldó
 * elfogad (`pg:` nincs a zárt listán, de egy diagnosztikai sorban megjelenhet) — a titoknál a
 * bizonytalanság a SZIGORÚBB ág (`KUKA-049`), és az aszimmetria iránya csak EZ lehet: a rejtés soha
 * nem szűkebb a befogadásnál.
 */
const REDACT_EXTRA_SEMA = Object.freeze(['pg:']);
const REDACT_SEMA = new RegExp(
  `(${[...new Set([...Object.keys(PG_URL_SHAPES), ...REDACT_EXTRA_SEMA])]
    .map((x) => x.replace(/:$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}):\\/\\/`, 'i');

const SHELL_SEPARATORS = Object.freeze([' ', '\t', '\n', '\r', '&', ';']);
const WHITESPACE_ONLY = Object.freeze([' ', '\t', '\n', '\r']);
function shellWordEnd(s, i, separators = SHELL_SEPARATORS) {
  let k = i;
  while (k < s.length) {
    const c = s[k];
    if (c === '\\') { k += 2; continue; }
    if (c === "'") {
      const z = s.indexOf("'", k + 1);
      if (z < 0) return s.length;                       // záratlan idézet: a sor végéig
      k = z + 1; continue;
    }
    if (c === '"') {
      let z = k + 1;
      while (z < s.length) {
        if (s[z] === '\\') { z += 2; continue; }        // `\"` NEM zár
        if (s[z] === '"') break;
        z += 1;
      }
      if (z >= s.length) return s.length;               // záratlan idézet: a sor végéig
      k = z + 1; continue;
    }
    if (separators.includes(c)) return k;
    k += 1;
  }
  return s.length;
}

export function redactConnStrings(text) {
  let s = String(text ?? '');
  /**
   * A CÍM VÉGÉT IS A SHELL-SZÓ HATÁRA ADJA (R166, KÜLSŐ REVIEW, Codex, P2 · `KUKA-404`).
   *
   * A LELET: a régi alak `[^\s'"]*`-gal zárt, vagyis az IDÉZŐJEL volt a határ. Egy aposztrófot
   * tartalmazó jelszónál (`postgres://u:pa'ss@host/db`) a minta a `pa` után megállt, és a
   * `«elrejtve»'ss@host/db` alakban a jelszó MARADÉKA és a GAZDAGÉP kiszivárgott.
   *
   * MIÉRT UGYANAZ A HIBA, MINT A JELSZÓ-KULCSNÁL (2.1): az idézőjel a shellben NEM szó-határ —
   * `'pa'\''ss'` EGY szó. A cím végét tehát ugyanaz a letapogató adja (`shellWordEnd`), és ahol a
   * határ nem tudható (záratlan idézet), a SOR VÉGÉIG rejtünk: titoknál a bizonytalanság nem a
   * megengedő ág. A javítást a jelszó-kulcs passzusával EGY otthonba hoztuk (KUKA-003).
   */
  {
    /**
     * A LETAPOGATÓ A SZÓ ELEJÉRŐL MŰKÖDIK, ezért a sémától indítani HIBA lett volna: egy
     * `'postgres://…'` alakú, idézett szó belsejéből indulva a nyitó idézőjelet már nem látjuk,
     * a záró pedig „nyitónak" tűnik — és a rejtés a sor végéig futott volna, elvéve a sor
     * hasznos részét (`-f ki.dump`). Ezért SZAVAKRA bontunk, és a címet a SAJÁT szaván belül
     * rejtjük el: a szó végéig, de nem tovább.
     */
    const SEMA = REDACT_SEMA;
    const SEPARATOR = /[ \t\n\r&;]/;
    let ki = '';
    let i = 0;
    while (i < s.length) {
      if (SEPARATOR.test(s[i])) { ki += s[i]; i += 1; continue; }
      // A CÍM HATÁRA CSAK A FEHÉR SZÓKÖZ: a `;` és a `&` LEGÁLIS egy URL-ben (KUKA-410).
      const vege = shellWordEnd(s, i, WHITESPACE_ONLY);
      const szo = s.slice(i, vege);
      const t = SEMA.exec(szo);
      ki += t ? szo.slice(0, t.index) + '«kapcsolati cím elrejtve»' : szo;
      i = vege;
    }
    s = ki;
  }
  /**
   * EGY HELYEN, HÁROM ALAK HELYETT EGY SZABÁLY (R164 P2 → R166 P2).
   *
   * Az R164-es köre három külön mintát adott (aposztróf-idézett · idézőjel-idézett · idézet nélküli),
   * és a kettő közül az idézett kettő az első záró idézőjelnél megállt. Mostantól a kulcsot keressük
   * meg, az ÉRTÉK végét pedig a `shellWordEnd` letapogató adja — tehát a belső szóköz, az
   * escape-elt idézőjel és a `'pa'\''ss'` alakú glued szó is TELJESEN eltűnik.
   */
  const kulcs = /\b(PGPASSWORD|PGPASSFILE|password|passwd|pwd)(\s*=\s*)/gi;
  let ki = '';
  let pos = 0;
  let m;
  while ((m = kulcs.exec(s)) !== null) {
    const ertekKezd = m.index + m[0].length;
    const vege = shellWordEnd(s, ertekKezd);
    if (vege <= ertekKezd) { kulcs.lastIndex = ertekKezd; continue; }  // nincs érték: nincs mit elrejteni
    ki += s.slice(pos, ertekKezd) + '«elrejtve»';
    pos = vege;
    kulcs.lastIndex = vege;
  }
  ki += s.slice(pos);
  return ki;
}

/**
 * ════════════════════════════════════════════════════════════════════════════════════════════════
 * A TÉNYLEGES GAZDAGÉP — A `?host=` FELÜLÍRJA A CÍM GAZDAGÉPÉT (R164, KÜLSŐ REVIEW, Codex, P1)
 * ════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * A LELET. A destruktív ellenpróba „csak helyi kiszolgálón fut" kapuja a kapcsolati cím AUTORITÁS-
 * gazdagépét olvasta (`new URL(url).hostname`). A `node-postgres` viszont a QUERY `host`
 * paraméterét FELÜLÍRÓNAK kezeli — a `pg-connection-string` ezt dokumentálja. Egy
 * `postgres://u@localhost/db?host=production.example` cím tehát a kapun ÁTMENT („localhost"),
 * miközben a tényleges kapcsolat a TERMELÉSI kiszolgálóra ment volna — és a próba ott végzett volna
 * regisztrációt, munkakörnyezet-írást és adatbázis-eldobást.
 *
 * A SZABÁLY. A gazdagép feloldása a node-postgres sorrendjét követi: `?host=` → a cím autoritása →
 * `PGHOST`. És ahol a felolDÁS NEM ELDÖNTHETŐ, ott NEM a megengedő ág nyer:
 *   · `?service=` vagy `PGSERVICE` → a szolgáltatás-fájl gazdagépet is adhat, amit innen nem látunk;
 *   · `?hostaddr=` vagy `PGHOSTADDR` → a NÉV mellett a cím is dönt, és a kettő mást mondhat;
 *   · több `host` érték (vesszős lista) → nem egy gazdagép;
 *   · ha egyik sem nevez meg → a libpq a helyi socketre esik, de ezt NEM tippeljük meg.
 * Mindegyik válasza: `decidable: false` — és a hívó ilyenkor MEGÁLL (KUKA-020 · KUKA-203).
 */
export function effectiveHost(sourceUrl, env = process.env) {
  const alak = pgUrlShape(sourceUrl);
  if (!alak.shape) return { host: null, decidable: false, basis: alak.basis };
  const u = alak.url;
  // ── A `socket:` SÉMÁNÁL AZ ÚT A GAZDAGÉP (R166/P1) ───────────────────────────────────────────────
  //
  // A könyvtár itt a `?host=` paramétert FELÜLÍRJA az úttal (`config.host = decodeURI(pathname)` a
  // korai visszatérés előtt), tehát a gazdagép az ÚT — és ha a cím mégis `?host=`-ot hordoz, a két
  // érték MÁST mond: ott nem tippelünk. A PostgreSQL csak az ABSZOLÚT utat kezeli socketként, ezért a
  // relatív út itt NEM eldönthető (a helyi kapu `KUKA-377` szabálya ugyanez a mérce).
  if (alak.shape === 'socket') {
    let utvonal;
    try { utvonal = decodeURI(String(u.pathname || '')); } catch { utvonal = String(u.pathname || ''); }
    if (!utvonal) {
      return { host: null, decidable: false, basis: 'a `socket:` cím nem hordoz utat — a socket-könyvtár nem eldönthető' };
    }
    if (!utvonal.startsWith('/')) {
      return { host: null, decidable: false, basis: 'a `socket:` cím útja nem ABSZOLÚT — a PostgreSQL csak a perjellel kezdődő gazdagépet kezeli socketként, tehát nem eldönthető' };
    }
    const qHostSocket = queryLast(u, 'host');
    if (qHostSocket.jelen && qHostSocket.ertek !== utvonal) {
      return { host: null, decidable: false, basis: 'a `socket:` cím ÚTJA és a `?host=` paramétere MÁST mond — a node-postgres az utat veszi, de a kétértelműség itt nem tippelhető' };
    }
    return { host: utvonal, decidable: true, basis: 'a `socket:` cím ÚTJA a socket-könyvtár (ez a gazdagép)' };
  }
  if (queryParam(u, 'service') || envValue(env, 'PGSERVICE')) {
    return { host: null, decidable: false,
      basis: 'a cím vagy a környezet SZOLGÁLTATÁST nevez meg (`service`/`PGSERVICE`) — a szolgáltatás-fájl gazdagépet is adhat, amit innen NEM látunk' };
  }
  if (queryParam(u, 'hostaddr') || envValue(env, 'PGHOSTADDR')) {
    return { host: null, decidable: false,
      basis: 'a cím vagy a környezet `hostaddr`-t ad meg — a NÉV és a numerikus cím MÁST mondhat, tehát a tényleges gazdagép nem eldönthető' };
  }
  const qHost = queryLast(u, 'host');
  let host = null; let basis = null;
  if (qHost.jelen) {
    if (qHost.ertek === '') {
      return { host: null, decidable: false, basis: 'a cím ÜRES `?host=` felülírást hordoz — a libpq ezt AKTÍV felülírásként tárolja, a tényleges gazdagép nem eldönthető' };
    }
    host = qHost.ertek; basis = 'a cím `?host=` paramétere FELÜLÍRJA a cím gazdagépét (node-postgres)';
  } else if (u.hostname) {
    try { host = decodeURIComponent(u.hostname); } catch { host = u.hostname; }
    basis = 'a cím autoritás-gazdagépe';
  } else {
    const envHost = envValue(env, 'PGHOST');
    if (envHost) { host = envHost; basis = 'a cím nem nevez meg gazdagépet, ezért a környezet `PGHOST` értéke dönt'; }
  }
  if (host === null) {
    return { host: null, decidable: false,
      basis: 'sem a cím, sem a környezet nem nevez meg gazdagépet — a libpq a HELYI socketre esne, de ezt nem tippeljük meg' };
  }
  if (host.includes(',')) {
    return { host: null, decidable: false, basis: 'TÖBB gazdagép van megadva (vesszős lista) — nem egy kiszolgáló, tehát nem eldönthető' };
  }
  return { host, decidable: true, basis };
}

/**
 * HELYI ÉS ELDOBHATÓ-E A CÉL? — a destruktív ellenpróba KAPUJA, egy helyen, meghívhatóan.
 *
 * A megengedő ág NEM a hiba ága: ha a gazdagép nem eldönthető, a válasz NEM „helyi". A kimondott
 * felülírás (`VS_SAFETY_ALLOW_REMOTE`) CSAK a pontos `1` értékre áll — egy környezet-kezelő által
 * beírt `0` vagy `false` IGAZ értékű sztring, és a régi alakom ezeket is felülírásnak vette
 * (R164, KÜLSŐ REVIEW, Codex, P1).
 */
/**
 * EGY KAPCSOLÓ-OLVASÓ, EGY OTTHON (R166 — KÜLSŐ REVIEW, Codex, P2 · `KUKA-398`).
 *
 * A LELET: a `VS_KEEP_RESTORE_TARGET` a PUSZTA igaz-értéken állt (`if (process.env.X)`), ezért a
 * környezet-kezelő által beírt `VS_KEEP_RESTORE_TARGET=0` vagy `=false` BEKAPCSOLTA a megtartást —
 * vagyis a kikapcsolásnak szánt érték hagyott maradék adatbázist a kiszolgálón, futásonként egyet.
 *
 * ÉS A SZABÁLY MÁR MEGVOLT. Pontosan ezt a hibát javította az R164 a `VS_SAFETY_ALLOW_REMOTE`-on —
 * de a HELYSZÍNEN javította, nem szabályként (`KUKA-003` · `KUKA-129`: egy szabály, egy otthon). A
 * testvér-kapcsoló így a régi alakban maradt. Ezért a kapcsoló-olvasás mostantól EGY feloldó, és
 * mindkét fogyasztó ezt hívja; a következő kapcsoló nem tud elcsúszni.
 *
 * A BEKAPCSOLÁS CSAK A PONTOS `1` — ez a repó házi szabálya (`VS_APP_TRUST_PROXY`, `VS_DEMO`,
 * `VS_AI_GROUNDED_PROSE`, `VS_KEPEK_JPEG`, `VS_EXT_*`). Ami nem `1`, az KI — de ha nem üres és
 * mégsem `1`, azt a feloldó KIMONDJA (`recognised: false`), mert a néma tartalék-ág elrejti az
 * elírást (`KUKA-238`). A hívó ezt a sorába írja: a kapcsoló NEM lesz csendben figyelmen kívül hagyva.
 */
export const SWITCH_ON = '1';
export function explicitSwitch(env, name) {
  const raw = envValue(env, name);
  if (raw === '') {
    return { on: false, raw, recognised: true,
      basis: `a(z) \`${name}\` nincs beállítva (vagy üres) — a kapcsoló KI` };
  }
  if (raw === SWITCH_ON) {
    return { on: true, raw, recognised: true,
      basis: `a(z) \`${name}=${SWITCH_ON}\` KIMONDOTT bekapcsolás` };
  }
  return { on: false, raw, recognised: false,
    basis: `a(z) \`${name}\` értéke ${JSON.stringify(raw)}, a bekapcsolás viszont CSAK a pontos \`${SWITCH_ON}\` — a kapcsoló KI. (A puszta igaz-érték alapú olvasás a \`0\` és a \`false\` sztringet is bekapcsolásnak vette.)` };
}

export const LOCAL_HOSTS = Object.freeze(['127.0.0.1', 'localhost', '::1', '[::1]', '0:0:0:0:0:0:0:1']);
export function localOnlyVerdict(sourceUrl, env = process.env) {
  const override = explicitSwitch(env, 'VS_SAFETY_ALLOW_REMOTE');
  const h = effectiveHost(sourceUrl, env);
  if (override.on) {
    return { allowed: true, host: h.host, decidable: h.decidable, override: true,
      basis: 'KIMONDOTT felülírás (`VS_SAFETY_ALLOW_REMOTE=1`) — a helyi kapu szándékosan kikapcsolva' };
  }
  if (!h.decidable) return { allowed: false, host: null, decidable: false, override: false, basis: h.basis };
  /**
   * CSAK AZ ABSZOLÚT ÚT SOCKET (R164 review, Codex, P1 — `KUKA-377` · `D-VS-3185`).
   *
   * A LELET: a feltétel a PONTTAL kezdődő értéket is helyinek vette („relatív socket-könyvtár"). A
   * PostgreSQL viszont KIZÁRÓLAG az ABSZOLÚT, perjellel kezdődő gazdagépet kezeli Unix-socketként;
   * minden más érték HÁLÓZATI gazdagép-név. Egy `.belso.pelda.hu` alakú — a telepítési környezetben
   * FELOLDÓDÓ — név így átment a destruktív próbák helyi-kapuján, a kimondott felülírás NÉLKÜL.
   *
   * A nem eldönthető eset már korábban is ZÁRÁS; itt a tévesen ELDÖNTÖTT eset szűnik meg.
   */
  const local = LOCAL_HOSTS.includes(h.host) || h.host.startsWith('/');
  return { allowed: local, host: h.host, decidable: true, override: false,
    basis: local ? `a tényleges gazdagép HELYI (${h.basis})` : `a tényleges gazdagép NEM helyi (${h.basis})` };
}

/**
 * A CÉL MEGSZERZÉSE — A HURKOT IS MEG KELL TUDNI MÉRNI (KUKA-207).
 *
 * MIÉRT ITT: a „friss, saját cél" döntései ebben a fájlban élnek (KUKA-003: egy szabály, egy otthon).
 * A megszerzés HURKA viszont a próbában volt, beágyazva a `psql`-hívások közé — vagyis egy próba nem
 * tudta MEGHÍVNI, csak a végeredményt látta. A párhuzamos névütközés pedig pontosan a hurokban dől el:
 * a LÉTEZÉS-MÉRÉS és a `CREATE` KÖZÉ befér egy másik futás. Ezért a hurok itt áll, TISZTÁN, a
 * kiszolgáló-hívásokkal BEADVA (`exists` · `create` · `generate`) — így ugyanazt a kódot futtatja az
 * éles próba és az ellenpróba, és az ütközés BEADHATÓ.
 *
 * A SZERZŐDÉS:
 *   exists(nev)   → { known: boolean, exists?: boolean, hiba?: string }   (a „nem tudom" NEVEZETT)
 *   create(nev)   → { ok: boolean, collision?: boolean, hiba?: string }   (ok = MI hoztuk létre)
 *   generate()    → friss, egyedi név
 *
 * AMIT ÁLLÍT: a visszaadott `target` CSAK akkor nem null, ha a `create` SIKERRE futott rajta — tehát
 * a tulajdon bizonyított. Ütközésnél (akár a mérésben, akár a `CREATE`-ben) ÚJ nevet kér, és SOHA nem
 * veszi át a másik futás adatbázisát. KIMONDOTT cél esetén nem generál helyette mást: megáll.
 */
export function acquireFreshTarget({ measuredSource, explicitTarget = null, exists, create, generate, maxAttempts = 5 }) {
  const log = [];
  let last = { use: null, stop: true, basis: 'egy kísérlet sem futott' };
  for (let k = 0; k < Math.max(1, maxAttempts); k++) {
    const generated = generate();
    const jelolt = explicitTarget ?? generated;
    const l = exists(jelolt);
    if (!l.known) {
      last = { use: null, stop: true, basis: `a cél létezése NEM MÉRHETŐ (${l.hiba || 'nevezetlen ok'}) — megállás` };
      log.push(`${k + 1}. ${last.basis}`);
      break;
    }
    const d = restoreTargetDecision({ measuredSource, explicitTarget, exists: l.exists, generated });
    last = d;
    log.push(`${k + 1}. ${d.use ? `létrehozás: ${d.basis}` : `elutasítva: ${d.basis}`}`);
    if (d.stop) { if (explicitTarget !== null) break; continue; }
    const c = create(d.use);
    if (c.ok) return { target: d.use, created: true, attempts: k + 1, log, basis: d.basis };
    if (c.collision) {
      // PÁRHUZAMOS NÉVÜTKÖZÉS: a mérés és a `CREATE` közé befért egy másik futás. A kiszolgáló atomi
      // `CREATE`-je a döntő — nem vesszük át az övét, ÚJ nevet kérünk.
      last = { use: null, stop: true, basis: 'párhuzamos névütközés a CREATE-ben — nem vesszük át a másik futás adatbázisát' };
      log.push(`${k + 1}. ${last.basis}`);
      if (explicitTarget !== null) break; continue;
    }
    last = { use: null, stop: true, basis: `a CREATE DATABASE elakadt: ${c.hiba || 'nevezetlen ok'}` };
    log.push(`${k + 1}. ${last.basis}`);
    break;
  }
  return { target: null, created: false, attempts: log.length, log, basis: last.basis };
}

/**
 * A PARANCSSORI KLIENSEK KÖRNYEZETE — EGY OTTHON, A KAPUVAL AZONOS FELOLDÁSSAL
 * (R164 review, Codex, 2× P2 — `KUKA-379` · `D-VS-3187`).
 *
 * A LELET. A két pg-próba (`proof:pg-durability` és `proof:pg-intent`) SAJÁT, egymás másolatát jelentő
 * `pgEnv` függvénnyel állította össze a `psql`/`pg_dump`/`pg_restore` környezetét — és mindkettő a cím
 * AUTORITÁS-gazdagépéből építette (`new URL(url).hostname`). A node-postgres viszont a `?host=`
 * paramétert FELÜLÍRÓNAK kezeli. Egy
 * `postgres://u@localhost/forras?host=/var/run/postgresql-alt` címnél tehát az ALKALMAZÁS és a
 * forrás-azonosság ellenőrzése az EGYIK klaszterre ment, a `pg_dump`, a cél létrehozása, a
 * visszatöltés és a takarítás pedig egy MÁSIKRA. A bizonyíték így nem arról szólt, amiről állította —
 * és a próba egy NEM SZÁNT helyi PostgreSQL-példányt módosíthatott.
 *
 * MIÉRT EGY HELYEN. Mert a hiba épp abból jött, hogy a szabály KÉT házban élt, és a gazdagép-kapu
 * javításakor (`KUKA-366`) csak az EGYIKET — a kaput — javítottam, a tényleges CLI-környezetet nem
 * (KUKA-003 · KUKA-129: a szabály egyik végén javítva, a másikon változatlanul).
 *
 * ÉS FAIL-CLOSED. Ha a tényleges gazdagép nem eldönthető (`service` · `hostaddr` · több gazdagép ·
 * üres felülírás), ez a függvény NEM ad környezetet: `{ ok: false, reason }`. A hívó megáll — nem
 * tippelünk (KUKA-020).
 *
 * AMIT EZ NEM ÁLLÍT: nem a libpq teljes utánzata. Azt a négy értéket viszi át, amit a próbák
 * használnak (gazdagép · port · felhasználó · jelszó + `sslmode`), és a `service`/`hostaddr`
 * változókat a gyermektől ELVESZI, hogy egy szolgáltatás-fájl ne írhassa felül a kimondott célt.
 */
export function cliEnvFor({ sourceUrl, database, env = process.env } = {}) {
  const h = effectiveHost(sourceUrl, env);
  if (!h.decidable) return { ok: false, reason: `a tényleges gazdagép NEM eldönthető — ${h.basis}` };
  let u;
  try { u = new URL(String(sourceUrl)); } catch { return { ok: false, reason: 'a forrás-cím nem értelmezhető' }; }
  const e = { ...env };
  e.PGHOST = h.host;
  /** Egy felülíró paraméter: JELEN van-e, és mi az ÉRTÉKE — az ÜRES érték AKTÍV felülírás (F158-22). */
  const felulir = (nev, alap) => {
    const q = queryLast(u, nev);
    if (!q.jelen) return { ok: true, ertek: alap };
    if (q.ertek === '') return { ok: false };
    return { ok: true, ertek: q.ertek };
  };
  const dec = (x) => { try { return decodeURIComponent(String(x || '')); } catch { return String(x || ''); } };
  const port = felulir('port', u.port);
  if (!port.ok) return { ok: false, reason: 'a cím ÜRES `?port=` felülírást hordoz — a tényleges port nem eldönthető' };
  const user = felulir('user', dec(u.username));
  if (!user.ok) return { ok: false, reason: 'a cím ÜRES `?user=` felülírást hordoz — a tényleges felhasználó nem eldönthető' };
  const pass = felulir('password', dec(u.password));
  if (!pass.ok) return { ok: false, reason: 'a cím ÜRES `?password=` felülírást hordoz — a tényleges jelszó nem eldönthető' };
  if (port.ertek) e.PGPORT = String(port.ertek);
  if (user.ertek) e.PGUSER = String(user.ertek);
  if (pass.ertek) e.PGPASSWORD = String(pass.ertek);
  const ssl = queryLast(u, 'sslmode');
  if (ssl.jelen && ssl.ertek) e.PGSSLMODE = ssl.ertek;
  if (database !== undefined && database !== null) e.PGDATABASE = String(database);
  // A gyermek NEM kaphat `service`-t és `hostaddr`-t: felülírhatnák a kimondott célt (KUKA-349).
  delete e.PGSERVICE; delete e.PGSERVICEFILE; delete e.PGHOSTADDR;
  return { ok: true, env: e, host: h.host, basis: h.basis };
}
