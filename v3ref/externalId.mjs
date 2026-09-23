// V3 MAGREFERENCIA — XID-01: NÉVTEREZETT KÜLSŐ AZONOSÍTÓK ÉS JOGHATÓSÁGI PROFILOK (K01 · R63 §3).
//
// A SZABÁLY, SZÓ SZERINT (R63): „Az ország- és iparágfüggetlen maghoz névterezett külső
// azonosítók, joghatósági profilok és külön műveleti feltételek kellenek. Nem építünk magyar
// adószámra vagy élelmiszeripari szerepre univerzális főkulcsot. Egyéni szereplő és társaság
// későbbi jogi átalakulását nem tekintjük automatikus azonosságnak."
//
// HÁROM KÜLÖN TÉNY, HÁROM KÜLÖN OBJEKTUM (R63 §3 — „Adóregisztráció, jogalany, személy és fiók nem
// ugyanaz az objektum"):
//   · a SZEMÉLY alanya (kind=person) — ehhez tartozik a fiók és a csatorna-bizonyíték;
//   · a VÁLLALKOZÁSI MINŐSÉG alanya (kind=legal_entity) — ehhez a névterezett külső azonosító;
//   · a MUNKAKÖRNYEZET (book) — amit a `business_identity` KÖT a jogalanyhoz.
//
// AZ AZONOSÍTÓ ÁLLÍTÁS, NEM BIZONYÍTÉK. Az `issuer = 'self_asserted'` kimondja: ezt a felhasználó
// írta be, hatóság nem igazolta. Ebből következik a két legfontosabb szabály (R63 §5.3/5 és /12):
//   · ugyanazt a karaktersort MÁS is beírhatja — attól nem kap hozzáférést ehhez a
//     munkakörnyezethez, és a saját, független indulása is lehetséges (nincs globális lefoglalás);
//   · a HU és az AT névtér azonos karaktersora KÉT különböző tény: az azonosság kulcsa
//     (namespace · jurisdiction · issuer · value_norm), nem a puszta szöveg.
// A HATÓSÁGI igazolás egy KÉSŐBBI, országonkénti adapter dolga (`verification: 'none_available'`);
// ez a modul ilyet nem ígér, és a hiányát a válaszban KIMONDJA (KUKA-015 · KUKA-060).

const frozen = (o) => Object.freeze(o);

/** A NÉVTEREK ZÁRT SZÓTÁRA (K01). A `email` az önbevallott csatorna-cím, a többi vállalkozási. */
export const KNOWN_NAMESPACES = frozen(['email', 'tax_id', 'company_registry']);

/**
 * JOGHATÓSÁGI PROFILOK — NEM ország-specifikus szabályok, hanem ugyanannak a szerkezetnek a
 * példányai. Minden profil UGYANAZT mondja a lényegről: az azonosító önmagában NEM ad képviseleti
 * jogot (`representation_from_identifier: false`), és a saját munkát nem tiltja
 * (`own_work_allowed: true`). A KÜLÖNBSÉG csak abban lehet, mely névterek értelmezhetők, és van-e
 * igazoló adapter — ma egyiknél sincs (KUKA-060: a hatókört nem a mai bérlők iparágából vezetjük le).
 */
const PROFILE_SHAPE = frozen({
  representation_from_identifier: false,
  own_work_allowed: true,
  verification: 'none_available',
});
export const JURISDICTION_PROFILES = frozen({
  HU: frozen({ ...PROFILE_SHAPE, known: true, namespaces: frozen(['tax_id', 'company_registry']) }),
  AT: frozen({ ...PROFILE_SHAPE, known: true, namespaces: frozen(['tax_id', 'company_registry']) }),
  DE: frozen({ ...PROFILE_SHAPE, known: true, namespaces: frozen(['tax_id', 'company_registry']) }),
  SK: frozen({ ...PROFILE_SHAPE, known: true, namespaces: frozen(['tax_id', 'company_registry']) }),
  RO: frozen({ ...PROFILE_SHAPE, known: true, namespaces: frozen(['tax_id', 'company_registry']) }),
});

/** Ismeretlen országprofil: NEM ad széles jogot, és NEM tiltja a független saját munkát (R63 §5.3/12). */
export function profileFor(jurisdiction) {
  const j = String(jurisdiction || '').trim().toUpperCase();
  const known = JURISDICTION_PROFILES[j];
  if (known) return frozen({ jurisdiction: j, ...known });
  // Az üres és a beírt „unknown" ugyanaz az ismeretlen — EGY írásmódon (KUKA-029: minden olvasó
  // a gyógyított alakot nézze; az R64 ellenséges felülvizsgálat H12 lelete).
  return frozen({ jurisdiction: j || 'UNKNOWN', ...PROFILE_SHAPE, known: false, namespaces: frozen([]) });
}

/**
 * FORMÁTUM-SEMLEGES NORMALIZÁLÁS — nem érvényesítés. Nagybetű, a szóköz és a kötőjel elhagyva. A
 * szabályt ki kell mondani: ez az AZONOSSÁG-egyeztetés kulcsa, nem annak bizonyítéka, hogy az
 * azonosító létezik (KUKA-022: a név nem bizonyíték).
 */
export function normalizeExternalValue(valueRaw) {
  return String(valueRaw ?? '').trim().toUpperCase().replace(/[\s-]+/g, '');
}

/**
 * A BEMENET BAJA — ÍRÁS ELŐTT, NEVEZETTEN (R77/F77-02).
 *
 * MI VOLT A HIBA. A `{"tax_id":"---"}` érték normalizálva ÜRES; ezt eddig CSAK az írás közben, a
 * `recordSelfAssertedExternalId` belsejében vettük észre, és az `attachBusinessIdentity` ott már
 * kivételt dobott — a hívó HTTP 500-at kapott, a MUNKAKÖRNYEZET viszont addigra megszületett.
 *
 * A SZABÁLY NEM ÚJ, ÉS NEM „ADÓELLENŐRZÉS": pontosan a MEGLÉVŐ normalizáló saját szabálya
 * (`normalizeExternalValue`) — csak most MEGKÉRDEZHETŐ, mielőtt bármit írnánk (KUKA-039: egy
 * fogalom, egy otthon; a kérdést ahhoz tesszük, aki tudja a választ). Az ISMERETLEN országprofil
 * továbbra sem tiltás: a profil-ismeretlenség nem hiba, csak `known: false` (H12).
 *
 * @returns {null|{error:string, detail:string}} `null`, ha a bemenet rögzíthető.
 */
export function businessIdentityProblem({ namespace, jurisdiction, valueRaw } = {}) {
  if (!KNOWN_NAMESPACES.includes(namespace)) {
    return { error: 'unknown_namespace', detail: `ismert névterek: ${KNOWN_NAMESPACES.join(' · ')}` };
  }
  const profile = profileFor(jurisdiction);
  if (namespace !== 'email' && profile.known && !profile.namespaces.includes(namespace)) {
    return { error: 'namespace_not_in_profile', detail: `a(z) ${profile.jurisdiction} profil névterei: ${profile.namespaces.join(' · ')}` };
  }
  if (!normalizeExternalValue(valueRaw)) {
    return {
      error: 'value_required',
      detail: 'az azonosító normalizálás után ÜRES (a szóköz és a kötőjel nem számít) — '
        + 'adj meg valódi azonosítót, vagy hagyd el a vállalkozási minőséget',
    };
  }
  return null;
}

/**
 * ÖNBEVALLOTT KÜLSŐ AZONOSÍTÓ RÖGZÍTÉSE egy alanyra. Több alany ugyanazt beírhatja
 * (cardinality: many_to_many) — épp ez a K01 lényege: az azonosítót a kötés minősíti, nem fordítva.
 */
export function recordSelfAssertedExternalId({ store, subjectId, namespace, jurisdiction, valueRaw, at }) {
  if (typeof subjectId !== 'string' || !subjectId.trim()) return frozen({ ok: false, reason: 'subject_id_required' });
  if (!KNOWN_NAMESPACES.includes(namespace)) {
    return frozen({ ok: false, reason: 'unknown_namespace', message: `ismert névterek: ${KNOWN_NAMESPACES.join(' · ')}` });
  }
  const profile = profileFor(jurisdiction);
  if (namespace !== 'email' && profile.known && !profile.namespaces.includes(namespace)) {
    return frozen({ ok: false, reason: 'namespace_not_in_profile', jurisdiction: profile.jurisdiction });
  }
  const valueNorm = normalizeExternalValue(valueRaw);
  if (!valueNorm) return frozen({ ok: false, reason: 'value_required' });
  if (typeof at !== 'string' || !at.trim()) return frozen({ ok: false, reason: 'recorded_at_required' });
  store.run(
    `INSERT INTO external_id (subject_id, namespace, issuer, jurisdiction, value_raw, value_norm,
                              cardinality, valid_from, valid_to)
     VALUES (?,?,?,?,?,?,?,?,NULL)`,
    subjectId, namespace, 'self_asserted', profile.jurisdiction, String(valueRaw), valueNorm,
    namespace === 'email' ? 'one_to_one' : 'many_to_many', at);
  return frozen({
    ok: true, subject_id: subjectId, namespace, jurisdiction: profile.jurisdiction,
    value_norm: valueNorm, issuer: 'self_asserted', profile_known: profile.known,
    verification: profile.verification,
  });
}

/**
 * KIK ÁLLÍTJÁK UGYANEZT — a KULCS a teljes névtér-négyes, tehát a HU és az AT azonos karaktersora
 * NEM találja meg egymást. A válasz LISTA, nem jog: az egyezés önmagában semmit nem enged.
 */
export function identityClaimsMatching({ store, namespace, jurisdiction, valueRaw }) {
  const profile = profileFor(jurisdiction);
  const rows = store.all(
    `SELECT subject_id, issuer FROM external_id
     WHERE namespace = ? AND jurisdiction = ? AND value_norm = ? AND valid_to IS NULL ORDER BY subject_id`,
    namespace, profile.jurisdiction, normalizeExternalValue(valueRaw));
  return frozen({
    namespace, jurisdiction: profile.jurisdiction, value_norm: normalizeExternalValue(valueRaw),
    subjects: frozen(rows.map((r) => r.subject_id)),
    grants_any_right: false,
  });
}

/**
 * A MUNKAKÖRNYEZET VÁLLALKOZÁSI MINŐSÉGE: ÚJ legal_entity alany + névterezett azonosító + kötés.
 * A SZEMÉLY alanyához NEM nyúl (nem írja át a fajtáját, nem olvaszt össze történetet).
 */
export function attachBusinessIdentity({ store, bookId, namespace, jurisdiction, valueRaw, at }) {
  if (typeof bookId !== 'string' || !bookId.trim()) return frozen({ ok: false, reason: 'book_id_required' });
  if (namespace === 'email' || !KNOWN_NAMESPACES.includes(namespace)) {
    return frozen({ ok: false, reason: 'business_namespace_required', message: 'tax_id vagy company_registry' });
  }
  // A BEMENET BAJA NEVEZETT VÁLASZ, NEM KIVÉTEL AZ ÍRÁS KÖZEPÉN (R77/F77-02 · KUKA-020).
  const problem = businessIdentityProblem({ namespace, jurisdiction, valueRaw });
  if (problem) return frozen({ ok: false, reason: problem.error, message: problem.detail });
  const existing = store.get('SELECT * FROM business_identity WHERE book_id = ?', bookId);
  if (existing) return frozen({ ok: false, reason: 'business_identity_already_attached', entity_subject_id: existing.entity_subject_id });
  const entityId = `ent_${bookId}`;
  return store.atomic(() => {
    store.run('INSERT INTO subject (id, kind) VALUES (?, ?)', entityId, 'legal_entity');
    const x = recordSelfAssertedExternalId({ store, subjectId: entityId, namespace, jurisdiction, valueRaw, at });
    if (!x.ok) throw Object.assign(new Error(`attachBusinessIdentity: ${x.reason}`), { code: x.reason });
    store.run(
      'INSERT INTO business_identity (book_id, entity_subject_id, namespace, jurisdiction, recorded_at) VALUES (?,?,?,?,?)',
      bookId, entityId, namespace, x.jurisdiction, at);
    return frozen({ ok: true, book_id: bookId, entity_subject_id: entityId, ...x });
  });
}

export function businessIdentityOf({ store, bookId }) {
  const row = store.get('SELECT * FROM business_identity WHERE book_id = ?', bookId);
  if (!row) return frozen({ attached: false, reason: 'no_business_identity' });
  const xid = store.get(
    'SELECT * FROM external_id WHERE subject_id = ? AND namespace = ? AND valid_to IS NULL',
    row.entity_subject_id, row.namespace);
  return frozen({
    attached: true, entity_subject_id: row.entity_subject_id, namespace: row.namespace,
    jurisdiction: row.jurisdiction, value_norm: xid ? xid.value_norm : null, issuer: xid ? xid.issuer : null,
    profile: profileFor(row.jurisdiction),
  });
}
