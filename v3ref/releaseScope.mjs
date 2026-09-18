/**
 * RSB-01 — AZ ADATKÖRRE SZÓLÓ OLVASÁSI DÖNTÉS EGY OTTHONA (K05-DSC-c engedő ága, R47).
 *
 * MI VOLT A HIÁNY, ÉS MI A KÜLÖNBSÉG. A kiadás eddig KÉT tényt kérdezett meg: (1) tag-e a kérő a
 * könyvben (`releaseAllowed` → `rightAt`), és (2) van-e rá TILTÁS az eredmény adatköreire
 * (`resultReleasable` → `banEffectiveAt`). A klauzula viszont ennél többet mond:
 *
 *     „Minden érintett adatkörre ÉRVÉNYES OLVASÁSI DÖNTÉS kell … a készletjog nem jogosít
 *      ármező kiadására."
 *
 * A TILTÁS HIÁNYA NEM ENGEDÉLY. A külső ellenőrző fél ezt az R37-ben mondta ki, és az R47-ben
 * konkrét feladattá tette. MÉRVE (R47, a saját fánkon, a teljes meghívó-láncon): egy olyan tag,
 * akinek a TAGSÁGA egy `scopes: ['stock']`-ra korlátozott határozat alatt született — tehát a
 * rendszer maga rögzítette, hogy a felhatalmazása készlet-adatkörre szól —, a vegyes eredményt
 * ÁREGYÜTT megkapta (`unit_price: 12345`). A korlát ott volt az adatbázisban, olvasható alakban;
 * a kiadási úton SEMMI nem kérdezte meg.
 *
 * MIRE ÉPÜL EZ A FELOLDÓ — ÉS MIRE NEM. Nem találunk ki új üzleti szerepkört és nem adunk
 * hallgatólagos „mindenhez jogot". A MEGLÉVŐ jogalap-kezelést kötjük be:
 *   · `authority_basis.allowed_scopes` — a határozat ADATKÖR-tengelye (ORG-N1a);
 *   · `grant_basis.granted_limit` — a beváltáskor a TAGSÁGRA átvitt korlát (ORG-N1b);
 *   · `subject_ban` — a kimondott TILTÁS (REV-N5b), ami az engedély MELLETT is érvényesül.
 * Az ORG-N1b szövege szó szerint ezt írja elő: *„a felhatalmazás nem lehet tágabb, mint az
 * alapja (szerep · művelet · adatkör)"*. A korlát tehát PLAFON, nem engedély — és a kiadás nem
 * lehet tágabb nála.
 *
 * AMI EBBŐL NEM VEZETHETŐ LE, ÉS EZÉRT NEM IS TALÁLJUK KI (R47 kikötése):
 *   (1) Ha a tagsághoz NINCS rögzített korlát (`no_declared_basis` — ma a mag minden próba-világa
 *       ilyen), akkor a mai viselkedés marad: a tagság + tiltás-hiány kiad. Ezt viszont NEM
 *       nevezzük adatkörre szóló engedélynek: a döntés `basis: 'membership_only'`, és a válasz
 *       KIMONDJA, hogy ez GYENGÉBB tanú (KUKA-049 · KUKA-127). A nyitott üzleti kérdés a
 *       jelentésben áll, ellenpéldával.
 *   (2) A korlát ADATKÖR-tengelye ma SZABAD SZÖVEG (a meglévő világok `'stock'`/`'price'` szavakat
 *       használnak), a tartalom-besoroló viszont ZÁRT halmazt (`keszlet` · `arak`). A kettő nem
 *       ugyanaz a szótár, és egy gép nem tippelhet: az ismeretlen szótárú korlát ZÁR, saját
 *       nevezett indokkal (`basis_scope_vocabulary_unknown`) — nem nyit, és nem is fordítjuk le
 *       némán (KUKA-022 · KUKA-061: a név nem bizonyíték, és új szó új fogalom).
 *
 * PURE: csak olvas, nem ír.
 */
import { banEffectiveAt } from './banScope.mjs';
import { basisAsOf } from './authorityBasis.mjs';
import { grantBasisFor } from './basisLimit.mjs';
import { membershipAsOf } from './bitemporal.mjs';
import { KNOWN_DATA_SCOPES } from './resultScope.mjs';

const frozen = (o) => Object.freeze(o);

/** A DÖNTÉS ALAPJÁNAK ZÁRT HALMAZA — ismeretlen szó nem csúszhat át „valaminek" (KUKA-101). */
export const RELEASE_BASES = Object.freeze(['explicit_ban', 'authority_basis', 'membership_only', 'none']);

/**
 * A MEGLÉVŐ KORLÁT KIOLVASÁSA — a tagság ADOTT hatályos adásához kötve.
 * A hiány NEVEZETT állapot, nem néma „korlátlan" (KUKA-012).
 */
export function recordedScopeLimit({ store, subjectId, bookId, validAt, knownAt }) {
  const m = membershipAsOf({ store, subjectId, bookId, validAt, knownAt: knownAt ?? validAt });
  if (m.effective !== true) return frozen({ declared: false, reason: `membership_${m.reason}`, membership: m });
  if (!m.grant_event_id) return frozen({ declared: false, reason: 'no_declared_basis', membership: m });
  const carried = grantBasisFor(store, m.grant_event_id);
  if (carried.declared !== true) return frozen({ declared: false, reason: carried.reason, membership: m });
  if (!carried.limit || !Array.isArray(carried.limit.scopes)) {
    return frozen({ declared: true, usable: false, reason: 'granted_limit_undecidable', membership: m });
  }
  return frozen({
    declared: true, usable: true, reason: 'granted_limit_recorded',
    basis_id: carried.basis_id, basis_version: carried.basis_version,
    scopes: Object.freeze([...carried.limit.scopes]), membership: m,
  });
}

/**
 * EGY ADATKÖR OLVASÁSI DÖNTÉSE — a kiadás közös kapuja.
 *
 * A SORREND KIMONDOTT: a TILTÁS előbb dönt, mint bármely engedő alap (REV-N5b: a kimondott tiltás
 * az engedély mellett is érvényesül). Utána a tagság korlátja; a korlát HIÁNYA nem engedély, hanem
 * NEVEZETT, gyengébb alap.
 */
export function scopeReleaseDecision({ store, subjectId, bookId, scope, nowIso, knownAt, request }) {
  const base = { scope, basis: 'none', basis_id: null, basis_version: null, weaker: false };
  if (typeof scope !== 'string' || !scope) {
    return frozen({ ...base, allowed: false, reason: 'scope_required' });
  }
  // 1. A KIMONDOTT TILTÁS — az ENGEDÉLY MELLETT IS. Ez a meglévő REV-N5b kapu, változatlanul.
  const ban = banEffectiveAt({
    store, subjectId, nowIso,
    request: { ...(request && typeof request === 'object' ? request : {}), dataScope: scope },
  });
  if (ban.banned) {
    return frozen({ ...base, allowed: false, basis: 'explicit_ban', reason: ban.reason, message: ban.message ?? null });
  }

  // 2. A TAGSÁGRA ÁTVITT KORLÁT — a MEGLÉVŐ jogalap-lánc (ORG-N1a → ORG-N1b).
  const limit = recordedScopeLimit({ store, subjectId, bookId, validAt: nowIso, knownAt });
  if (limit.declared !== true) {
    // EZ A KAPU NEM DÖNTI EL A TAGSÁGOT — ÉS EZ MÉRT TANULSÁG (R47, a saját battériám lelete).
    //
    // Az első alakom a hiányzó tagságra ZÁRT. Ettől a kapu MÁSODIK otthona lett ugyanannak a
    // ténynek (KUKA-003 · KUKA-018), és a következménye azonnal megjelent: az **M4** mutáció — ami
    // a KÖNYV-szintű jog teljes kiiktatását méri — a nevezett próbáján ZÖLD maradt, mert az én új
    // kapum fogta meg helyette. Egy meglévő bizonyíték NÉMÁN elvesztette az erejét (KUKA-187).
    //
    // A tagságot a KÖNYV-kapu dönti el (`releaseAllowed` → `rightAt`), és az ELŐBB fut. Itt a
    // hiánya nem zárás, hanem ugyanaz a NEVEZETT, gyengébb alap: nincs rögzített adatkör-korlát.
    return frozen({
      ...base, allowed: true, basis: 'membership_only', weaker: true,
      reason: String(limit.reason).startsWith('membership_') ? 'no_declared_basis' : limit.reason,
      membership_note: limit.reason,
      note: 'a tagsághoz NINCS rögzített adatkör-korlát: ez a döntés a KÖNYVHÖZ való tagságon áll, '
        + 'NEM adatkörre szóló engedélyen — a tiltás hiánya nem engedély (K05-DSC-c nyitott ága). '
        + 'A TAGSÁGOT nem ez a kapu dönti el: az a könyv-szintű jog dolga, és ELŐBB fut.',
    });
  }
  if (limit.usable !== true) {
    return frozen({ ...base, allowed: false, basis: 'authority_basis', reason: limit.reason });
  }

  // 3. A HATÁROZAT MAI ÁLLAPOTA — a lepecsételt korlát nem élheti túl az alapját.
  //    Hiányzó · más könyvre szóló · még nem hatályos · lejárt · megvont alap NEM NYIT (R47/3).
  const state = basisAsOf({
    store, basisId: limit.basis_id, bookId, validAt: nowIso, knownAt: knownAt ?? nowIso,
  });
  const shape = { ...base, basis: 'authority_basis', basis_id: limit.basis_id, basis_version: limit.basis_version };
  if (state.in_effect !== true) {
    return frozen({ ...shape, allowed: false, reason: state.reason });
  }

  // 4. A PLAFON A KETTŐ METSZETE: a beváltáskor átvitt korlát ÉS a határozat MAI korlátja. Egy
  //    későbbi, TÁGABB verzió nem szélesítheti visszamenőleg a már kiadott tagságot, egy SZŰKEBB
  //    viszont szűkít — mindkét irányban a SZŰKEBB dönt (ORG-N1b).
  const live = Array.isArray(state.limit && state.limit.scopes) ? state.limit.scopes : [];
  const ceiling = limit.scopes.filter((s) => live.includes(s));
  if (ceiling.includes(scope)) {
    return frozen({ ...shape, allowed: true, reason: 'within_basis_scopes', ceiling: Object.freeze([...ceiling]) });
  }
  // AZ ISMERETLEN SZÓTÁR KÜLÖN VÁLASZ, ÉS ZÁR. Ha a plafon EGYETLEN neve sem a zárt tartalom-halmazból
  // való, akkor nem azt tudjuk, hogy „nem fér bele", hanem azt, hogy NEM TUDJUK ÖSSZEVETNI — és a
  // gép ilyenkor nem fordít (KUKA-022). A nemleges válasz megmondja, mit kell eldönteni (KUKA-064).
  const unknown = ceiling.filter((s) => !KNOWN_DATA_SCOPES.includes(s));
  if (ceiling.length > 0 && unknown.length === ceiling.length) {
    return frozen({
      ...shape, allowed: false, reason: 'basis_scope_vocabulary_unknown',
      ceiling: Object.freeze([...ceiling]), unknown_names: Object.freeze([...unknown]),
      message: `a felhatalmazás adatkör-tengelye a(z) ${unknown.join(', ')} nevet hordozza, a `
        + `tartalom-besorolás zárt halmaza viszont: ${KNOWN_DATA_SCOPES.join(', ')} — a kettő `
        + 'megfeleltetése ÜZLETI DÖNTÉS, gép nem tippelheti meg',
    });
  }
  return frozen({
    ...shape, allowed: false, reason: 'outside_basis_scopes',
    ceiling: Object.freeze([...ceiling]),
    message: `a felhatalmazás adatkör-plafonja (${ceiling.join(', ') || '—'}) nem tartalmazza a(z) `
      + `"${scope}" adatkört`,
  });
}

/** A SZERZŐDÉS, KIMONDVA — mit véd ez a kapu, és mit NEM. */
export const RSB_CONTRACT = Object.freeze({
  id: 'RSB-01',
  owns: 'adatkörönkénti olvasási döntés a kiadás közös határán',
  sources: Object.freeze(['subject_ban (REV-N5b)', 'grant_basis (ORG-N1b)', 'authority_basis (ORG-N1a)']),
  order: Object.freeze(['explicit_ban', 'membership', 'recorded scope limit', 'live basis state', 'ceiling']),
  forbids: Object.freeze([
    'a kérő saját címkéjéből (dataScope) levezetett jog',
    'a tiltás hiányából levezetett engedély',
    'a korlát adatkör-nevének néma lefordítása a tartalom-szótárára',
    'tágabb kiadás, mint a rögzített alap',
  ]),
  stated_limits: Object.freeze([
    'rögzített korlát NÉLKÜL a döntés a KÖNYV-tagságon áll (membership_only) — ez NEM adatkörre '
      + 'szóló engedély, és a válasz ezt kimondja; a nyitott üzleti kérdés a jelentésben áll',
    'a korlát adatkör-tengelye szabad szöveg, a tartalom-besorolás zárt halmaz — az ismeretlen '
      + 'szótárú plafon ZÁR, a megfeleltetés üzleti döntés',
    'mezővetítés nincs: a vegyes eredményt egészben tagadjuk meg (a klauzula saját feltétele)',
  ]),
});
