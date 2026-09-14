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
// 2026-09-14 (R75/F01, D-VS-3021) — EZ A MODUL MOST MÁR TILTÁST IS NÉZ, ÉS EZ A LÉNYEG.
// Az R73-as alak szándékosan NEM nézett tiltást („a tiltás-kapu az engedő utak saját első
// kérdése") — és pont ez volt a hiba: a tiltás KIADÁSA is engedő út, csak nem ismertük el annak.
// Aki a nyers hatásköri sort olvassa, az a döntésnek CSAK A FELÉT kapja meg; a másik fele (a
// kiadó SAJÁT tiltásai) némán kimarad. Ezért a TELJES döntés ide költözött, és a tiltás-feloldót
// egy olyan modulból hívjuk (`banScope.mjs`), ami semmit nem importál vissza — a kör megszűnt,
// nem megkerülve, hanem a függőség IRÁNYÁNAK megfordításával.

import { instantMs } from './store.mjs';
import { banEffectiveAt, banRequestFor } from './banScope.mjs';

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

// ═══ A TELJES VÉGREHAJTHATÓSÁGI DÖNTÉS — EGY RÉTEG, AMIBŐL A KIADÁS SEM MARAD KI (R75/F01) ═════
//
// A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL, R75/F01). A `judge` A könyvön `alter_right` hatáskörrel
// rendelkezett, de UGYANARRA a könyvre hatályos tiltása volt. Az `adjudicationRightAt` helyesen
// `allowed:false, ban_scope_book` választ adott — ugyanő viszont az `issueBan`-nal SIKERESEN
// letiltotta a dolgozót, mert a kiadási út csak az `authorityRowAt`-et hívta.
//
// A HIBA OSZTÁLYA: nem az AUT-01 volt hibás, hanem az, hogy a HÍVÓ tette hozzá (vagy nem tette
// hozzá) a hiányzó felét. Ez a KUKA-039 („fél őr") és a KUKA-132 együtt: a döntést két darabra
// vágtam, és a második darab összerakását a hívóra bíztam — ami pontosan ugyanaz a szerkezet, mint
// a `authorityOk` bemondás, csak eggyel följebb.
//
// EZÉRT A DÖNTÉS EGÉSZBEN ÁLL ITT, és minden hatáskör-igényes út EZT hívja: a művelet neve · az
// eljáró megléte · az óra · a TILTÁS · a hatásköri sor. Aki ezt megkerüli és a `authorityRowAt`-et
// hívja közvetlenül, az fél döntést kap — ezt gépi jel méri (`verify:v3ref`, M73).
//
// A SORREND KIMONDOTT: a tiltás ELŐBB dől el, mint a hatáskör. Így a tiltott eljáró ugyanazt a
// választ kapja, akár van hatásköre, akár nincs — a különbség nem szivárog ki (KUKA-084).
/**
 * @returns {{ok:true, granted_at:string} | {ok:false, reason:string, message:string}}
 */
export function executableRightAt({ store, subjectId, bookId, operation, nowIso, credentials }) {
  if (!ADJUDICATION_OPS.includes(operation)) {
    return {
      ok: false,
      reason: 'unknown_adjudication_op',
      message: `ismeretlen hatáskör-igényes művelet ("${operation}") — a zárt halmaz: ${ADJUDICATION_OPS.join(', ')}`,
    };
  }
  const who = String(subjectId || '').trim();
  if (!who) {
    return {
      ok: false,
      reason: 'actor_missing',
      message: 'a művelet ELJÁRÓ ALANYT igényel: meg kell mondani, KI végzi. A hatáskör nem a hívás '
        + 'tényéből jön (REV-N3a).',
    };
  }
  const now = instantMs(nowIso);
  if (!now.ok) return { ok: false, reason: `clock_${now.reason}`, message: 'az óra nem értelmezhető' };

  // REV-N5a — A TILTÁS MINDEN ENGEDŐ ÚTON HAT, A KIADÁSI ÚTON IS.
  const ban = banEffectiveAt({
    store, subjectId: who, nowIso, request: banRequestFor({ bookId, opClass: operation }, credentials),
  });
  if (ban.banned) {
    return {
      ok: false,
      reason: ban.reason,
      message: ban.message
        || `"${who}" ellen célzott tiltás van hatályban, ezért hatásköri művelet nem végezhető`,
    };
  }
  return authorityRowAt({ store, subjectId: who, bookId, operation, nowIso });
}
