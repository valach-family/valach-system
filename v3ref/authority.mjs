// V3 MAGREFERENCIA — A HATÁSKÖR-SOR ÉRTÉKELÉSE, EGY OTTHONBAN (AUT-01, D-VS-3020).
//
// MIÉRT SZÜLETETT (R73/C-F03). Az `imposeBan` a hatáskör helyén egy BEMONDHATÓ igaz/hamis értéket
// nézett (`authorityOk === true`), és a hatáskört soha nem oldotta fel. Mérve: egy `outsider`,
// akinek NULLA hatásköri rekordja van, `authorityOk: true` mellett sikeresen tiltott — a célszemély
// hozzáférése tényleg megszűnt. Ez a KUKA-121/122 családja: amit a hívó BEGÉPELHET, az ÁLLÍTÁS.
//
// A JAVÍTÁS SZERKEZETI AKADÁLYA — ÉS MIÉRT NEM INDOK. A feloldás az `adjudication.mjs`-ben élt, az
// viszont a `ban.mjs`-t importálja, tehát a fordított irányú import KÖRT csinálna. A külső fél ezt
// előre kimondta: *„A függőségi kör szerkezeti feladat, nem indok az ellenőrzés elhagyására."*
// Ezért a hatáskör-sor ÉRTÉKELÉSE ide költözött, egy semleges modulba, amit MINDKÉT oldal importál:
// az `adjudication.mjs` (a saját jog-feloldójában) és a `ban.mjs` (a kiadáskor). A szabály így nem
// két másolatban él (KUKA-003), és a kör megszűnt.
//
// AMIT EZ A MODUL NEM CSINÁL: nem néz tiltást. A tiltás-kapu az engedő utak SAJÁT első kérdése
// (REV-N5a) — ide húzva épp azt a kört építenénk vissza, amit megszüntettünk.

import { instantMs } from './store.mjs';

export const ADJUDICATION_OPS = Object.freeze(['suspend', 'adjudicate', 'alter_right']);

export const OP_MEANING = Object.freeze({
  suspend: 'tagság felfüggesztése',
  adjudicate: 'beadvány elbírálása',
  alter_right: 'jog megváltoztatása',
});

/**
 * A HATÁSKÖR-SOR ÉRTÉKELÉSE. Csak a rekordot és az időt nézi — a hívó dolga a tiltás-kapu és a
 * művelet-név ellenőrzése (azt az `adjudication.mjs` végzi a saját bejáratán).
 *
 * @returns {{ok:true, granted_at:string} | {ok:false, reason:string, message:string}}
 */
export function authorityRowAt({ store, subjectId, bookId, operation, nowIso }) {
  const who = String(subjectId || '').trim();
  const now = instantMs(nowIso);
  if (!now.ok) return { ok: false, reason: `clock_${now.reason}`, message: 'az óra nem értelmezhető' };

  const row = store.get(
    'SELECT * FROM adjudication_authority WHERE subject_id = ? AND book_id = ? AND operation = ?',
    who, bookId, operation);
  if (!row) {
    return {
      ok: false,
      reason: 'authority_not_established',
      message: `"${who}" nem rendelkezik ${operation} hatáskörrel ezen a könyvön `
        + `(${OP_MEANING[operation] || operation}). A tagság — akár admin — ehhez nem elég: a `
        + 'hatáskör MŰVELETENKÉNT adott.',
    };
  }
  if (row.revoked_at !== null && row.revoked_at !== undefined) {
    const rev = instantMs(row.revoked_at);
    if (!rev.ok) {
      return { ok: false, reason: 'authority_revocation_undecidable', message: 'a hatáskör megvonásának ideje nem értelmezhető' };
    }
    if (rev.ms <= now.ms) {
      return { ok: false, reason: 'authority_revoked', message: `"${who}" ${operation} hatásköre vissza lett vonva` };
    }
  }
  const from = instantMs(row.granted_at);
  if (!from.ok) {
    return { ok: false, reason: 'authority_grant_undecidable', message: 'a hatáskör keletkezésének ideje nem értelmezhető' };
  }
  if (from.ms > now.ms) {
    return { ok: false, reason: 'authority_not_yet_effective', message: 'a hatáskör még nem hatályos' };
  }
  return { ok: true, granted_at: row.granted_at };
}
