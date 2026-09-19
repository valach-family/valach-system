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
 * AZ R49 JAVÍTÁSA — A GYENGÉBB ALAP MEGSZŰNT (F49-01). Az R47-es első alakom még kiadott ott, ahol
 * SEMMILYEN adatköri engedély nem volt rögzítve: a döntés `basis: 'membership_only'` nevet kapott,
 * és a válasz kimondta, hogy ez gyengébb tanú. A külső ellenőrző fél ezt NEM fogadta el, és igaza
 * volt: *„amíg nincs igazolt, az érintett adatkörre szóló olvasási jog, az adat nem adható ki"* —
 * a gyengébb alap MEGNEVEZÉSE nem teszi jogossá a kiadást (KUKA-190). INNENTŐL a 2. pont (a
 * ténylegesen megadott, SGR-01 szerinti jog) HIÁNYA ZÁR, és nincs alatta engedő tartalék.
 *
 * A TAGSÁGOT EZ A KAPU NEM DÖNTI EL. A hiányzó tagság a KÖNYV-kapu dolga, és az ELŐBB fut — a két
 * ellenőrzés két külön kérdésre felel, és egyiket sem szabad a másik kedvéért kivenni (R49).
 *
 * AMI EBBŐL NEM VEZETHETŐ LE, ÉS EZÉRT NEM IS TALÁLJUK KI (R47 kikötése):
 *   (1) A korlát ADATKÖR-tengelye ma SZABAD SZÖVEG (a meglévő világok `'stock'`/`'price'` szavakat
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
import { readScopeGrantAt } from './scopeGrant.mjs';

const frozen = (o) => Object.freeze(o);

/** A DÖNTÉS ALAPJÁNAK ZÁRT HALMAZA — ismeretlen szó nem csúszhat át „valaminek" (KUKA-101). */
export const RELEASE_BASES = Object.freeze(['explicit_ban', 'scope_grant', 'none']);

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
 * A SORREND KIMONDOTT: (1) a TILTÁS előbb dönt, mint bármely engedő alap (REV-N5b: a kimondott
 * tiltás az engedély mellett is érvényesül) · (2) a ténylegesen MEGADOTT jog — a hiánya ZÁR, és
 * nincs alatta engedő tartalék (R49/F49-01) · (3) a jog ALAPJÁNAK mai állapota · (4) a tagságra
 * átvitt plafon, ami csak SZŰKÍT (a hiánya ezért nem zár: a jogot a 2. pont adta).
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

  // 2. A TÉNYLEGESEN MEGADOTT OLVASÁSI JOG (SGR-01, R49). A HIÁNY ZÁR — a „megadható" nem a
  //    „megadott", és a tiltás hiánya nem engedély. Ez a kapu NEM dönti el a TAGSÁGOT (az a
  //    könyv-kapu dolga, és előbb fut); azt dönti el, hogy erre az ADATKÖRRE van-e joga.
  const grant = readScopeGrantAt({ store, subjectId, bookId, scope, validAt: nowIso, knownAt });
  if (grant.granted !== true) {
    return frozen({
      ...base, allowed: false, basis: 'scope_grant', reason: grant.reason,
      message: `a(z) "${scope}" adatkörre ennek az olvasónak NINCS igazolt olvasási joga `
        + `(${grant.reason}) — a tiltás hiánya nem engedély, és a megadható jog nem a megadott`,
    });
  }
  const shape = { ...base, basis: 'scope_grant', basis_id: grant.basis_id, basis_version: grant.basis_version };

  // 3. A JOG ALAPJA MA IS ÁLLJON. Megvont, lejárt vagy idegen könyvre szóló határozat mellett a
  //    belőle származó jog sem él tovább (ORG-N1a) — a jog nem élheti túl az alapját.
  const state = basisAsOf({ store, basisId: grant.basis_id, bookId, validAt: nowIso, knownAt: knownAt ?? nowIso });
  if (state.in_effect !== true) {
    return frozen({ ...shape, allowed: false, reason: state.reason });
  }
  // A MEGADÁSKORI VERZIÓ NEM ÍRJA FELÜL A MAIT: ha az alap azóta SZŰKÜLT, a szűkebb dönt (ORG-N1b).
  const live = Array.isArray(state.limit && state.limit.scopes) ? state.limit.scopes : [];
  if (!live.includes(scope)) {
    const unknown = live.filter((x) => !KNOWN_DATA_SCOPES.includes(x));
    if (live.length > 0 && unknown.length === live.length) {
      return frozen({
        ...shape, allowed: false, reason: 'basis_scope_vocabulary_unknown',
        ceiling: Object.freeze([...live]), unknown_names: Object.freeze([...unknown]),
        message: `a felhatalmazás adatkör-tengelye a(z) ${unknown.join(', ')} nevet hordozza, a `
          + `tartalom-besorolás zárt halmaza viszont: ${KNOWN_DATA_SCOPES.join(', ')} — a kettő `
          + 'megfeleltetése ÜZLETI DÖNTÉS, gép nem tippelheti meg',
      });
    }
    return frozen({
      ...shape, allowed: false, reason: 'outside_basis_scopes', ceiling: Object.freeze([...live]),
      message: `a felhatalmazás adatkör-plafonja (${live.join(', ') || '—'}) nem tartalmazza a(z) `
        + `"${scope}" adatkört — a megadott jog nem lehet tágabb az alapjánál`,
    });
  }

  // 4. A TAGSÁGRA ÁTVITT KORLÁT IS SZŰKÍT, ahol rögzítve van (R48 megőrzött ága). Ez PLAFON: nem
  //    ad jogot, csak elvesz. A hiánya ezért NEM zár — a jogot a 2. pont adta.
  const limit = recordedScopeLimit({ store, subjectId, bookId, validAt: nowIso, knownAt });
  if (limit.declared === true && limit.usable !== true) {
    return frozen({ ...shape, allowed: false, reason: limit.reason });
  }
  if (limit.declared === true && limit.usable === true && !limit.scopes.includes(scope)) {
    const unknown = limit.scopes.filter((x) => !KNOWN_DATA_SCOPES.includes(x));
    if (limit.scopes.length > 0 && unknown.length === limit.scopes.length) {
      return frozen({
        ...shape, allowed: false, reason: 'membership_limit_vocabulary_unknown',
        ceiling: Object.freeze([...limit.scopes]), unknown_names: Object.freeze([...unknown]),
        message: `a TAGSÁGRA átvitt korlát a(z) ${unknown.join(', ')} nevet hordozza, a `
          + `tartalom-besorolás zárt halmaza viszont: ${KNOWN_DATA_SCOPES.join(', ')} — a `
          + 'megfeleltetés üzleti döntés, gép nem tippelheti meg',
      });
    }
    return frozen({
      ...shape, allowed: false, reason: 'outside_membership_limit',
      ceiling: Object.freeze([...limit.scopes]),
      message: `a tagságra átvitt korlát (${limit.scopes.join(', ') || '—'}) nem tartalmazza a(z) `
        + `"${scope}" adatkört`,
    });
  }

  return frozen({
    ...shape, allowed: true, reason: 'scope_granted_and_within_limits',
    ceiling: Object.freeze([...live]),
    membership_limit: limit.declared === true ? Object.freeze([...limit.scopes]) : null,
  });
}

/** A SZERZŐDÉS, KIMONDVA — mit véd ez a kapu, és mit NEM. */
export const RSB_CONTRACT = Object.freeze({
  id: 'RSB-01',
  owns: 'adatkörönkénti olvasási döntés a kiadás közös határán',
  sources: Object.freeze([
    'subject_ban (REV-N5b)',
    'scope_grant + scope_grant_revocation (SGR-01 — a ténylegesen megadott jog, két idő-tengelyen)',
    'authority_basis (ORG-N1a — a jog alapjának mai állapota)',
    'grant_basis (ORG-N1b — a tagságra átvitt plafon; szűkít, nem ad)',
  ]),
  order: Object.freeze(['explicit_ban', 'recorded scope grant', 'live basis state', 'carried membership limit']),
  forbids: Object.freeze([
    'a kérő saját címkéjéből (dataScope) levezetett jog',
    'a tiltás hiányából levezetett engedély',
    'a korlát adatkör-nevének néma lefordítása a tartalom-szótárára',
    'tágabb kiadás, mint a rögzített alap',
  ]),
  stated_limits: Object.freeze([
    'igazolt, adatkörre szóló olvasási jog NÉLKÜL nincs kiadás — a tagság önmagában nem jogosít, '
      + 'és nincs engedő tartalék a megadott jog hiánya alatt (R49/F49-01)',
    'a TAGSÁGOT ez a kapu nem dönti el: a hiányzó tagságot a könyv-kapu zárja, és az előbb fut',
    'a korlát adatkör-tengelye szabad szöveg, a tartalom-besorolás zárt halmaz — az ismeretlen '
      + 'szótárú plafon ZÁR, a megfeleltetés üzleti döntés',
    'mezővetítés nincs: a vegyes eredményt egészben tagadjuk meg (a klauzula saját feltétele)',
  ]),
});
