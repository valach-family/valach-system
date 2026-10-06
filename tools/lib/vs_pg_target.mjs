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
 * Ugyanarra az adatbázisra mutat-e a forrás-cím és a cél NÉV? A dekódolás kötelező, a bizonytalanság
 * pedig IGEN-t ad: ahol a következmény `DROP DATABASE`, ott a „nem tudom" nem lehet „nem egyezik".
 */
export function sameDatabase(sourceUrl, restoreTarget) {
  let raw;
  try { raw = String(new URL(String(sourceUrl)).pathname || '').replace(/^\/+/, ''); }
  catch { return { same: true, basis: 'a forrás-cím nem értelmezhető — ÓVATOS megállás' }; }
  let decoded;
  try { decoded = decodeURIComponent(raw); }
  catch { return { same: true, basis: 'a forrás adatbázis-neve hibás százalék-kódolást tartalmaz — NEM megállapítható, ÓVATOS megállás' }; }
  if (decoded === String(restoreTarget)) {
    return { same: true, basis: raw === decoded ? 'a két név azonos' : 'a két név a forrás DEKÓDOLÁSA után azonos' };
  }
  return { same: false, basis: 'a dekódolt forrás-név és a cél eltér' };
}
