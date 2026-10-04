// V3 — A TÁROLÓ HIBÁINAK EGY FELOLDÓJA (STE-01).
//
// MIÉRT SZÜLETETT — MÉRT LELET, NEM ÓVATOSSÁG. Az `onceOnly.mjs` a kulcs-ütközést így ismerte fel:
//
//     if (String(e && e.message).includes('UNIQUE') || String(e && e.code) === 'ERR_SQLITE_ERROR')
//
// Ez KÉT SQLite-specifikus jelre épült. PostgreSQL-en az egyediség-sértés `code` mezője `23505`,
// a mondata pedig „duplicate key value violates unique constraint …" — EGYIK jel sem illeszkedik.
// A következmény NEM elméleti: a feltétel hamisra fordult volna, a kivétel TOVÁBBDOBÓDIK, és a
// két valódi kapcsolat versenyének VESZTESE nem a nevezett `once_only_race` kimenetet kapta
// volna (amiből a hívó ISMÉTLÉST csinál), hanem programhibát — vagyis az EGYSZERISÉG (idempotencia)
// pont a versenyhelyzetben, pont a tárolóváltás után bukott volna el, NÉMÁN.
//
// Ez a KUKA-039 alakja (a fél őr): a felismerés három helyen jó volt, a negyediken — az új
// tárolón — némán hibás. Ezért a felismerés mostantól EGY helyen áll (KUKA-003 · KUKA-018), és
// MINDKÉT tároló jelét ismeri; aki új tárolót köt be, ide teszi a jelét, nem egy új `if`-be.
//
// Megtalálta: Claude-v3, az R146/R147 PostgreSQL-átvezetés célzott olvasásán.

/** SQLSTATE-ek, amelyek EGYEDISÉG-ütközést jelentenek. */
const PG_UNIQUE_VIOLATION = '23505';

/**
 * EGYEDISÉG- (vagy elsődlegeskulcs-) ütközés volt-e a tároló hibája?
 *
 * Tárolófüggetlen: a PostgreSQL SQLSTATE-jét, a `node:sqlite` hibakódját és a két illesztő
 * mondatát egyaránt ismeri. A mondat-egyezés SZÁNDÉKOSAN az utolsó jel: a kód a megbízható,
 * a szöveg a tartalék (és a tartalék LÉTE kimondott, nem rejtett — KUKA-117).
 */
export function isUniqueViolation(e) {
  if (!e) return false;
  const code = String(e.code ?? '');
  if (code === PG_UNIQUE_VIOLATION) return true;                 // PostgreSQL
  if (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === 'SQLITE_CONSTRAINT_PRIMARYKEY') return true;
  if (code === 'ERR_SQLITE_ERROR') return true;                  // node:sqlite gyűjtőkódja
  const msg = String(e.message ?? '');
  return msg.includes('UNIQUE constraint failed')
      || msg.includes('duplicate key value violates unique constraint');
}
