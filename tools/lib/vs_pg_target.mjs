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
export function effectiveDatabase(sourceUrl, env = process.env) {
  let u;
  try { u = new URL(String(sourceUrl)); } catch { return { name: null, basis: 'a forrás-cím nem értelmezhető' }; }
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
  if (qDbLast.ertek) return { name: qDbLast.ertek, basis: 'a cím `?dbname=` paramétere FELÜLÍRJA az utat' };
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
 * EGY CÍM EGY MEGNEVEZETT ADATBÁZISRA. A `?dbname=` paramétert KIVESSZÜK, különben felülírná a
 * beállított utat — ez a fenti lelet második fele (a kiszolgáló-URL-ek is hordozták a felülírást).
 */
export function withDatabase(sourceUrl, name) {
  const u = new URL(String(sourceUrl));
  u.pathname = `/${String(name)}`;
  try { u.searchParams.delete('dbname'); } catch { /* nincs query */ }
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
  const t = new Date(Number(now)).toISOString().replace(/[^0-9]/g, '').slice(0, 14);
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
export function redactConnStrings(text) {
  let s = String(text ?? '');
  s = s.replace(/\b(postgres(?:ql)?|pg):\/\/[^\s'"]*/gi, '«kapcsolati cím elrejtve»');
  /**
   * AZ IDÉZŐJELES ÉRTÉK IS TELJESEN ELTŰNIK (R164, KÜLSŐ REVIEW, Codex, P2).
   *
   * A LELET: az első alakom érték-osztálya KIZÁRTA az idézőjelet (`[^\s&'";]+`), ezért a
   * megszokott `PGPASSWORD='top secret'` és `password="top secret"` alakra EGYÁLTALÁN nem illett —
   * a jelszó változatlanul a naplóba került volna. Idézőjel nélküli, szóközt tartalmazó értéknél
   * pedig csak az ELSŐ szó tűnt el. A szabály nem tűr kivételt: titok sem naplóba, sem parancssorba.
   *
   * MOSTANTÓL három alak, EGY helyen: aposztróf-idézett · idézőjel-idézett · idézet nélküli (a
   * sor/elválasztó végéig). Az idézett alaknál a ZÁRÓ idézőjelig megyünk, tehát a belső szóköz is
   * eltűnik.
   */
  s = s.replace(/\b(PGPASSWORD|PGPASSFILE|password|passwd|pwd)(\s*=\s*)'[^']*'/gi, '$1$2«elrejtve»');
  s = s.replace(/\b(PGPASSWORD|PGPASSFILE|password|passwd|pwd)(\s*=\s*)"[^"]*"/gi, '$1$2«elrejtve»');
  s = s.replace(/\b(PGPASSWORD|PGPASSFILE|password|passwd|pwd)(\s*=\s*)[^\s&;'"]+/gi, '$1$2«elrejtve»');
  return s;
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
  let u;
  try { u = new URL(String(sourceUrl)); } catch { return { host: null, decidable: false, basis: 'a forrás-cím nem értelmezhető' }; }
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
export const LOCAL_HOSTS = Object.freeze(['127.0.0.1', 'localhost', '::1', '[::1]', '0:0:0:0:0:0:0:1']);
export function localOnlyVerdict(sourceUrl, env = process.env) {
  const override = String(envValue(env, 'VS_SAFETY_ALLOW_REMOTE') ?? '').trim();
  const h = effectiveHost(sourceUrl, env);
  if (override === '1') {
    return { allowed: true, host: h.host, decidable: h.decidable, override: true,
      basis: 'KIMONDOTT felülírás (`VS_SAFETY_ALLOW_REMOTE=1`) — a helyi kapu szándékosan kikapcsolva' };
  }
  if (!h.decidable) return { allowed: false, host: null, decidable: false, override: false, basis: h.basis };
  const local = LOCAL_HOSTS.includes(h.host) || h.host.startsWith('/') || h.host.startsWith('.');
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
