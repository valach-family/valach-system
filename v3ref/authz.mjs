// V3 MAGREFERENCIA — K04 (engedély és frissesség) + K09 (megvonás) + K12 (kiesés).
//
// A K04 mércéje: „A jogosultsági döntés az összes releváns függőséget és lejáratot hordozza…
// Véglegesítéskor hiteles AKTUÁLIS helyi jogállapot kell; külső bizonyítékra a K12 profilja
// vonatkozik." A K09-é: „Érvényes biztonsági megvonás nem vár utódra."
// A K12-é: „elfogadott friss bizonyíték érvényes lehet szolgáltatói kiesés alatt is a rögzített
// határig… Megszűnt, lejárt vagy bizonyítottan visszavont alapra NINCS türelmi hosszabbítás."
//
// A döntés NEVEZETT alakot ad vissza (nem igent/nemet), hogy a képernyő meg tudja mondani, MIÉRT
// nem lehet (a mi KUKA-062-es tanulságunk: a jog-alapot nevezni kell).

import { instantMs } from './store.mjs';

// ═══ JOG-OSZTÁLY: SAJÁT KULCS, NEM ÖRÖKÖLT (Q07) ════════════════════════════════════════════════
//
// A régi alak sima objektumot indexelt: `FRESHNESS_PROFILE[opClass]`. Ez OROKOLT tulajdonságot is
// megtalál, ezért az `opClass: 'toString'` (vagy `'constructor'`, `'__proto__'`) NEM esett a
// `if (!profile)` ágba — a függvény tagság alapján ENGEDÉLYT adott egy nem létező jog-osztályra.
//
// KIMONDVA, MIT MÉRTÜNK: ez ÖRÖKÖLT-KULCS hiba, NEM bizonyított prototípus-módosítás. Nem
// állítunk többet, mint amit mértünk (KUKA-033).
//
// A profil `Map`-ben él: a Map kulcs-tere SAJÁT, nincs prototípus-lánc, amin átcsúszhatna valami.
const OP_CLASSES = new Map([
  // SAJÁT könyv: a helyi jogot minden használatnál ellenőrizzük, de nem függ külső forrástól.
  ['own_book', Object.freeze({ external_dependency: null, max_age_ms: null })],
  // MÁS nevében eljárás: külső megbízás-bizonyíték kell, meghatározott legnagyobb korral.
  ['representation', Object.freeze({ external_dependency: 'mandate_registry', max_age_ms: 24 * 3600 * 1000 })],
]);

/** A régi név megmarad OLVASHATÓ vetületként (a próbák és a dokumentáció hivatkozik rá). */
export const FRESHNESS_PROFILE = Object.freeze(Object.fromEntries(OP_CLASSES));

/** A jog-osztály feloldása. Ismeretlen osztály ⇒ null, SOHA nem örökölt találat. */
export function profileFor(opClass) {
  return typeof opClass === 'string' && OP_CLASSES.has(opClass) ? OP_CLASSES.get(opClass) : null;
}

/**
 * KELL-E KÜLSŐ BIZONYÍTÉK? — EGY predikátum, amit a VALIDÁTOR és a FOGYASZTÓ is hív.
 * A régi kód két különböző dolgot mért ugyanarról: az alak-szabály `=== null`-t, a fogyasztó
 * igazságértéket — az ÜRES SZÖVEG a kettő között fail-OPEN volt (KUKA-018).
 */
export function needsExternalEvidence(profile) {
  return typeof profile?.external_dependency === 'string' && profile.external_dependency.trim() !== '';
}

/**
 * A PROFIL ALAKJA — tiszta függvény, hogy a próba MÉRHESSE (a betöltéskori dobás a mérő
 * szerződése szerint nem szabályos bizonyíték, hanem mérőhiba).
 * @returns {string[]} a talált alak-hibák; üres tömb = rendben
 */
export function assertProfileShape(name, p) {
  const bad = [];
  if (!p || typeof p !== 'object') return [`${name}: nem objektum`];
  const dep = p.external_dependency;
  if (!(dep === null || (typeof dep === 'string' && dep.trim() !== ''))) {
    bad.push(`${name}: az external_dependency csak null vagy NEM ÜRES szöveg lehet (kapott: ${JSON.stringify(dep)})`);
  }
  if (needsExternalEvidence(p) && !(Number.isFinite(p.max_age_ms) && p.max_age_ms > 0)) {
    bad.push(`${name}: külső függés mellett a max_age_ms kötelező, véges és pozitív`);
  }
  if (!needsExternalEvidence(p) && p.max_age_ms !== null) {
    bad.push(`${name}: külső függés nélkül a max_age_ms értelmetlen — legyen null`);
  }
  return bad;
}

// ═══ A TAGSÁG HATÁLY-INTERVALLUMA (Q08 + Q13) ═══════════════════════════════════════════════════
//
// A `[granted_at, revoked_at)` intervallum KÉT vége eddig KÉT helyen és KÉT szabállyal dőlt el: a
// `rightAt` a `revoked_at <= now`-t nézte, a meghívó-oldal nyers igazságértéket. Jövőbeli dátumú
// (ÜTEMEZETT) megvonásnál a kettő ELLENTMONDOTT egymásnak: az egyik szerint él a hozzáférés, a
// másik szerint nem — és a felhasználó HAMIS INDOKOT kapott.
//
// EGY feloldó, három nevezett ok. A döntések, kimondva:
//   · granted_at a JÖVŐBEN  ⇒ még nem hatályos (Q08: a tagsági idő KEZDŐ HATÁLY, nem puszta
//     keletkezési könyvelés — ezt választjuk, mert a séma egyetlen idő-mezőt ad, és a jog
//     kérdése mindig „MOST szabad-e", nem „mikor írták be")
//   · granted_at == most     ⇒ ENGED (a határeset zárt alsó vég)
//   · revoked_at a JÖVŐBEN   ⇒ ENGED (ütemezett megvonás; a mai szemantika megőrizve)
//   · revoked_at <= most     ⇒ visszavonva
//   · bármelyik vég ELDÖNTHETETLEN ⇒ FAIL-CLOSED, nevezett okkal (nem „általában jó lesz")
export function membershipEffectiveAt(m, nowIso) {
  if (!m) return Object.freeze({ effective: false, reason: 'no_membership' });

  const g = instantMs(m.granted_at);
  const now = instantMs(nowIso);
  if (!now.ok) return Object.freeze({ effective: false, reason: `clock_${now.reason}` });
  if (!g.ok) return Object.freeze({ effective: false, reason: `membership_granted_at_${g.reason}` });
  if (g.ms > now.ms) return Object.freeze({ effective: false, reason: 'membership_not_yet_effective' });

  if (m.revoked_at !== null && m.revoked_at !== undefined) {
    const r = instantMs(m.revoked_at);
    if (!r.ok) return Object.freeze({ effective: false, reason: `membership_revoked_at_${r.reason}` });
    if (r.ms <= now.ms) return Object.freeze({ effective: false, reason: 'membership_revoked' });
  }
  return Object.freeze({ effective: true, reason: 'membership_effective' });
}

// ═══ A BIZONYÍTÉK ÁLLÁSA (Q05 + Q06) ════════════════════════════════════════════════════════════
//
// A Q05 és a Q06 UGYANAZT az objektumot bírálja el, ezért EGY feloldó, EGY név tényenként.
//
// A HÁROM TENGELY, amit a régi kód EGYBE mosott:
//   1. a LEKÉRÉS KORA        — mikor kérdeztük meg (obtained_at)   → K12 frissességi ablak
//   2. az ÁLLÍTÁS HATÁLYA    — meddig érvényes a megbízás (valid_until)
//   3. a MEGVONÁS            — visszavonták-e (revoked)
// A régi kód CSAK az 1. és a 3. tengelyt nézte, ezért a „friss lekérdezés, LEJÁRT megbízás"
// engedélyt kapott. A hatály nem is volt modellezve.
//
// AZ ALAK-ŐR MEGENGEDŐ LISTA, ÉS NÉGY KULCSOT ISMER. A `source_down` KÖTELEZŐEN benne van: a K12
// kimondja, hogy a szolgáltatói kiesés önmagában NEM zár, tehát ez a mező a szerződés része, nem
// idegen zaj. `Reflect.ownKeys` kell, mert a prototípuson álló getter, a szimbólum és a nem
// felsorolható mező a `for…in`/`Object.keys` elől elbújna.
export const EVIDENCE_KEYS = Object.freeze(['obtained_at', 'valid_until', 'revoked', 'source_down']);

/** A bizonyíték kiemelése a borítékból — SAJÁT kulcson, örökölt találat nélkül (Q07 rokona). */
export function evidenceFor(externalEvidence, dependency) {
  if (!externalEvidence || typeof externalEvidence !== 'object') return null;
  if (!Object.prototype.hasOwnProperty.call(externalEvidence, dependency)) return null;
  return externalEvidence[dependency];
}

/**
 * A bizonyíték állása — KIMONDOTT SORRENDDEL: alak → megvonás → idő-olvashatóság/jövő → kor → hatály.
 * @returns {{ok:true, age_ms:number, source_down:boolean} | {ok:false, reason:string}}
 */
export function evidenceStandingAt(ev, nowIso, profile) {
  if (!ev || typeof ev !== 'object') return Object.freeze({ ok: false, reason: 'evidence_missing' });

  const keys = Reflect.ownKeys(ev).filter((k) => typeof k === 'string');
  const alien = keys.filter((k) => !EVIDENCE_KEYS.includes(k));
  if (alien.length || Reflect.ownKeys(ev).some((k) => typeof k === 'symbol')) {
    // Az ISMERETLEN MEZŐT NEM NYELJÜK EL: ha elnyelnénk, a hívó azt hihetné, hogy a lejárat
    // vizsgálva van, holott egy elgépelt mezőnév mögé bújt (Q06 kimondott elvárása).
    return Object.freeze({ ok: false, reason: 'evidence_shape_unknown_field' });
  }

  if (ev.revoked === true) return Object.freeze({ ok: false, reason: 'evidence_revoked' });
  if (ev.revoked !== undefined && typeof ev.revoked !== 'boolean') {
    return Object.freeze({ ok: false, reason: 'evidence_shape_bad_revoked' });
  }
  if (ev.source_down !== undefined && typeof ev.source_down !== 'boolean') {
    return Object.freeze({ ok: false, reason: 'evidence_shape_bad_source_down' });
  }

  const now = instantMs(nowIso);
  if (!now.ok) return Object.freeze({ ok: false, reason: `clock_${now.reason}` });

  const got = instantMs(ev.obtained_at);
  if (!got.ok) return Object.freeze({ ok: false, reason: `evidence_obtained_at_${got.reason}` });

  const age = now.ms - got.ms;
  // A JÖVŐBELI LEKÉRÉS NEM FRISSESSÉG. A régi kód negatív kort számolt, ami kisebb a plafonnál,
  // tehát a 2099-es dátum a LEGFRISSEBB bizonyítéknak látszott. Tűrést SZÁNDÉKOSAN nem adunk:
  // mérve, hogy a lelet zárásához nem kellett, egy méretlen tűrés pedig csak a plafont tolná el
  // (KUKA-045: a kézzel léptetett szám a saját megkerülésére tanít).
  if (age < 0) return Object.freeze({ ok: false, reason: 'evidence_future_dated' });

  // A HATÁLY KÜLÖN TENGELY, és KÖTELEZŐ: enélkül a „friss lekérdezés" örökre érvényesnek látszana.
  const until = instantMs(ev.valid_until);
  if (!until.ok) return Object.freeze({ ok: false, reason: `evidence_valid_until_${until.reason}` });
  if (until.ms <= now.ms) return Object.freeze({ ok: false, reason: 'evidence_expired' });

  if (Number.isFinite(profile?.max_age_ms) && age > profile.max_age_ms) {
    return Object.freeze({ ok: false, reason: 'evidence_stale' });
  }
  return Object.freeze({ ok: true, age_ms: age, source_down: ev.source_down === true });
}

export function rightAt({ store, subjectId, bookId, opClass, clock, externalEvidence }) {
  const profile = profileFor(opClass);
  if (!profile) return deny('unknown_op_class', 'ehhez a művelethez nincs frissességi profil');

  const m = store.get('SELECT * FROM membership WHERE subject_id = ? AND book_id = ?', subjectId, bookId);
  // A tagság KÉT vége EGY feloldón (Q08 + Q13) — a `rightAt` és a meghívó-oldal nem tud elcsúszni.
  const eff = membershipEffectiveAt(m, clock.now());
  if (!eff.effective) {
    return deny(eff.reason, eff.reason === 'no_membership'
      ? 'ehhez a könyvhöz nincs tagságod'
      : (eff.reason === 'membership_revoked'
        ? 'a tagságod ehhez a könyvhöz vissza lett vonva'
        : 'a tagságod ehhez a könyvhöz most nem hatályos'));
  }

  // K12: külső bizonyíték csak akkor számít, ha a profil kéri — a PREDIKÁTUMON át, amit az
  // alak-szabály is hív (különben az üres szöveg a kettő között fail-OPEN, KUKA-018).
  if (needsExternalEvidence(profile)) {
    const ev = evidenceFor(externalEvidence, profile.external_dependency);
    if (!ev) return deny('evidence_missing', 'a képviselethez szükséges megbízás-bizonyíték nincs meg');
    const standing = evidenceStandingAt(ev, clock.now(), profile);
    if (!standing.ok) return deny(standing.reason, 'a megbízás-bizonyíték most nem fogadható el');
    // A SZOLGÁLTATÓI KIESÉS önmagában NEM zár: érvényes, friss bizonyíték a határig él.
    return allow('representation_mandate', { evidence_age_ms: standing.age_ms, source_down: standing.source_down });
  }

  return allow('own_membership', { role: m.role });
}

function allow(basis, detail) { return Object.freeze({ allowed: true, basis, detail: Object.freeze(detail || {}) }); }
function deny(reason, message) { return Object.freeze({ allowed: false, basis: null, reason, message }); }

// K09: a megvonás KÜLÖN esemény, nem sor-törlés — a történet megmarad.
export function revokeMembership({ store, subjectId, bookId, clock }) {
  store.run('UPDATE membership SET revoked_at = ? WHERE subject_id = ? AND book_id = ? AND revoked_at IS NULL',
    clock.now(), subjectId, bookId);
}
