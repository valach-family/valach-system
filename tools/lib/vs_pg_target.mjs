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
function queryParam(u, nev) {
  try { const v = u.searchParams.get(nev); return v === null ? '' : String(v).trim(); } catch { return ''; }
}

/** A TÉNYLEGES adatbázis-név: query `dbname` → út → query `user` → cím-felhasználó; különben NEM TUDHATÓ. */
export function effectiveDatabase(sourceUrl) {
  let u;
  try { u = new URL(String(sourceUrl)); } catch { return { name: null, basis: 'a forrás-cím nem értelmezhető' }; }
  const qDb = queryParam(u, 'dbname');
  if (qDb) return { name: qDb, basis: 'a cím `?dbname=` paramétere FELÜLÍRJA az utat' };
  let path;
  try { path = decodeURIComponent(String(u.pathname || '').replace(/^\/+/, '')); }
  catch { return { name: null, basis: 'a forrás adatbázis-neve hibás százalék-kódolást tartalmaz' }; }
  if (path) return { name: path, basis: 'a cím útja nevezi meg az adatbázist' };
  const qUser = queryParam(u, 'user');
  if (qUser) return { name: qUser, basis: 'nincs adatbázis-út, és a `?user=` paraméter adja a felhasználót — az adatbázis alapértelmezése a felhasználó neve' };
  let user;
  try { user = decodeURIComponent(String(u.username || '')); } catch { user = String(u.username || ''); }
  if (user) return { name: user, basis: 'nincs adatbázis-út, ezért a FELHASZNÁLÓ neve az adatbázis' };
  return { name: null, basis: 'sem adatbázis, sem felhasználó nincs a címben — a tényleges nevet a kliens a rendszer-felhasználóból veszi' };
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
export function sameDatabase(sourceUrl, restoreTarget) {
  try { new URL(String(sourceUrl)); }
  catch { return { same: true, basis: 'a forrás-cím nem értelmezhető — ÓVATOS megállás' }; }
  const eff = effectiveDatabase(sourceUrl);
  if (!eff.name) return { same: true, basis: `${eff.basis} — NEM megállapítható, ÓVATOS megállás` };
  if (eff.name === String(restoreTarget)) return { same: true, basis: `AZONOS a céllal: ${eff.basis}` };
  return { same: false, basis: `a tényleges forrás-név eltér a céltól (${eff.basis})` };
}
