// V3 MAGREFERENCIA — ENT-02: AZ ELŐFIZETÉS FUNKCIÓT BIZTOSÍT, NEM ADATJOGOT (R63 §3 · §5.3/11).
//
// A SZABÁLY, SZÓ SZERINT: „Az előfizetés funkciót biztosít, nem céges adatjogot. A két feltételt
// külön ellenőrizzük." Ezért ez a modul SEMMIT nem tud a tagságról, a hatáskörről vagy az adatköri
// jogról — és azok sem tudnak erről. A két kapu EGYMÁS MELLETT áll, nem egymásba folyik:
//   · a JOG kapuja (rightAt · scopeReleaseDecision · authorityRowAt) azt dönti el, KI mit tehet;
//   · az ELŐFIZETÉS kapuja azt, hogy a könyvön ELÉRHETŐ-e egy funkció.
// Egy előfizetésileg elérhető funkcióhoz jogosulatlan munkatárs nem jut; egy jogosult személy sem
// használhat előfizetésileg nem engedett műveletet — és a válasz MEGMONDJA, melyik kapu zárt
// (KUKA-064). A két tényt egy mezőbe vonni pont az a hiba volna, amit a KUKA-002 tilt.
//
// TESZTPROFIL, FIZETÉSI INTEGRÁCIÓ NÉLKÜL (R63 §5.3/11): a terv és a funkció-lista rögzített tény
// a tárolóban; hogy KI és MIÉRT állítja be, az a későbbi számlázási adapter dolga, ami ITT nem
// épül. A profil hiánya NEVEZETT állapot, nem néma „minden elérhető" (KUKA-012).

const frozen = (o) => Object.freeze(o);

/** A FUNKCIÓK ZÁRT SZÓTÁRA — ismeretlen név nem csúszhat át (KUKA-101). */
export const KNOWN_FEATURES = frozen(['workspace', 'invite', 'stock_view', 'price_view']);

/** A TERVEK ZÁRT SZÓTÁRA. A `pro` a példa arra, hogy egy funkció (ár-nézet) előfizetéshez kötött. */
export const PLANS = frozen({
  starter: frozen(['workspace', 'invite', 'stock_view']),
  pro: frozen(['workspace', 'invite', 'stock_view', 'price_view']),
});

export const ENTITLEMENT_CONTRACT = frozen({
  id: 'ENT-02',
  owns: 'egy könyvön ELÉRHETŐ funkciók halmaza (előfizetési tesztprofil)',
  requires: frozen([
    'a terv és a funkció a zárt szótárból való',
    'a profil hiánya nevezett állapot, nem néma engedély',
    'a döntés SOHA nem olvassa és nem írja a jogosultsági táblákat',
  ]),
  forbids: frozen([
    'előfizetésből levezetett adatjog vagy tagság',
    'a jog-kapu és az előfizetés-kapu egy mezőbe vonása',
  ]),
});

export function setEntitlementProfile({ store, bookId, plan, at }) {
  if (typeof bookId !== 'string' || !bookId.trim()) return frozen({ ok: false, reason: 'book_id_required' });
  if (!Object.hasOwn(PLANS, plan)) {
    return frozen({ ok: false, reason: 'unknown_plan', message: `választható tervek: ${Object.keys(PLANS).join(' · ')}` });
  }
  if (typeof at !== 'string' || !at.trim()) return frozen({ ok: false, reason: 'recorded_at_required' });
  store.run(
    `INSERT INTO entitlement_profile (book_id, plan, features, recorded_at) VALUES (?,?,?,?)
     ON CONFLICT(book_id) DO UPDATE SET plan = excluded.plan, features = excluded.features, recorded_at = excluded.recorded_at`,
    bookId, plan, JSON.stringify([...PLANS[plan]]), at);
  return frozen({ ok: true, book_id: bookId, plan, features: PLANS[plan] });
}

/** ELÉRHETŐ-E a funkció ezen a könyvön — CSAK az előfizetés tengelye. */
export function entitlementFor({ store, bookId, feature }) {
  if (!KNOWN_FEATURES.includes(feature)) {
    return frozen({ available: false, reason: 'unknown_feature', plan: null, message: `ismert funkciók: ${KNOWN_FEATURES.join(' · ')}` });
  }
  const row = store.get('SELECT * FROM entitlement_profile WHERE book_id = ?', bookId);
  if (!row) return frozen({ available: false, reason: 'no_entitlement_profile', plan: null });
  let features;
  try { features = JSON.parse(row.features); } catch { features = null; }
  if (!Array.isArray(features)) return frozen({ available: false, reason: 'entitlement_profile_undecidable', plan: row.plan });
  if (!features.includes(feature)) return frozen({ available: false, reason: 'feature_not_in_plan', plan: row.plan });
  return frozen({ available: true, reason: 'feature_entitled', plan: row.plan });
}

/**
 * A KÉT KAPU EGYÜTTES ÍTÉLETE — ANÉLKÜL, HOGY ÖSSZEMOSNÁ ŐKET. A hívó MINDKÉT döntést átadja; a
 * válasz kimondja, MELYIK zárt. Tiszta függvény: se tároló, se óra.
 */
export function twoGateVerdict({ right, entitlement }) {
  const r = !!(right && right.allowed === true);
  const e = !!(entitlement && entitlement.available === true);
  if (r && e) return frozen({ allowed: true, refused_by: null });
  return frozen({
    allowed: false,
    refused_by: !r && !e ? 'both' : (!r ? 'right' : 'entitlement'),
    right_reason: right ? (right.reason ?? null) : 'right_missing',
    entitlement_reason: entitlement ? (entitlement.reason ?? null) : 'entitlement_missing',
  });
}
