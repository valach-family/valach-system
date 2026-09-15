/** BLI-01 — A KORLÁT KIKÉNYSZERÍTÉSE: a felhatalmazás nem lehet tágabb, mint az alapja (ORG-N1b).
 *
 * MIÉRT ÉPP MOST. A `REQUIRED_EVIDENCE` req-5 terve ELŐRE leírta ezt a lépést (ORG-N1a után a
 * KORLÁT), és a külső ellenőrző fél az R90 §6-ban kifejezetten azt kérte, hogy a core munka
 * MENJEN TOVÁBB: *„Folytasd a meglévő normaterv következő kötelező core-bizonyítékát; a mérő
 * javítása ne legyen a core teljes munkájának előfeltétele."*
 *
 * A HELYZET, EMBERI NYELVEN. A határozat CSAK „user" szerepre és CSAK a készlet-adatkörre
 * hatalmaz fel. A meghívó kiadója „admin" szerepet és árlista-hozzáférést próbál adni. Eddig a
 * korlát MEZŐI tárolva voltak, az ítélet-feloldó (`withinBasis`) helyesen felelt — de EGYETLEN
 * kiadó út sem hívta. Ez pontosan a KUKA-041 alakja a jogon: a szűkítés LÁTSZOTT a papíron, és
 * semmi nem kényszerítette ki.
 *
 * A HÁROM KÖVETELMÉNY, AHOGY A TERV KIMONDTA (norms.mjs · req-5 · n:2):
 *   (a) a korláton TÚLI szerep/művelet/adatkör kiadása NEVEZETT elutasítás;
 *   (b) a korláton BELÜLI kiadás VÁLTOZATLANUL megy — ELLENPÁR, mert a kapu nem fal (KUKA-122);
 *   (c) a BEVÁLTÁS a korlátot is ÁTVISZI, nem csak a szerepet.
 *
 * EGY OTTHON, KÉT FOGYASZTÓ (KUKA-129 · KUKA-039). Az ítéletet a `limitVerdict` mondja ki, és
 * MINDKÉT oldal ŐT hívja: a KIADÁS (`issueInviteUnderBasis`) és a BEVÁLTÁS (`redeemInvite`). Ha
 * csak a kiadás ellenőrizne, egy nyers `INSERT INTO invite` megkerülné (KUKA-013: az őr, ami csak
 * az egyik írót ismeri); ha csak a beváltás, a kiadó nem tudná meg, hogy túllépett.
 *
 * AMIT EZ A MODUL MA NEM ÁLLÍT — KIMONDVA (KUKA-015 · KUKA-033):
 *   · NEM állítja, hogy MINDEN meghívónak van deklarált alapja. Az alap DEKLARÁLÁSÁNAK
 *     kötelezővé tétele SZERVEZETI döntés (ki hatalmaz fel kit, és mi történik a régi, alap
 *     nélküli meghívókkal) — az operátoré, nem a kódé. Amíg nincs kimondva, a deklaráció
 *     nélküli meghívó a MAI szabály szerint megy, és a válasz ezt KIMONDJA
 *     (`basis_declared: false`) — nem néma engedély, hanem nevezett, látható állapot.
 *   · Ezért az ORG-N1b ebben a körben `partially_covered`: a kikényszerítés MEGVAN és falszifikált,
 *     a „deklaráció kötelező" rész NEVEZETTEN nyitva marad.
 *   · A BÍRÁLATI hatáskör (`adjudication_authority`) útján a korlát TOVÁBBRA IS csak adat — ezt a
 *     `basisState.limit_enforced_paths` sorolja fel, hogy a mező ne állítson többet, mint amennyi
 *     igaz (KUKA-050: a szöveg a valóságot követi).
 */
import { basisAsOf, withinBasis, BASIS_LIMIT_AXES } from './authorityBasis.mjs';
import { canonicalize } from './command.mjs';

const frozen = (o) => Object.freeze(o);

/** A KIADÁS MŰVELETE — nevezett állandó, hogy a tengely ne elgépelt szövegen álljon (KUKA-036). */
export const INVITE_ISSUE_OPERATION = 'invite_issue';

/** A KORLÁT KANONIKUS ALAKJA — a pecséthez és az összehasonlításhoz EGY alak (KUKA-018). */
export function canonicalLimit(limit) {
  const picked = {};
  for (const axis of BASIS_LIMIT_AXES) {
    const v = limit && Array.isArray(limit[axis]) ? [...limit[axis]].sort() : [];
    picked[axis] = v;
  }
  return canonicalize(picked);
}

/**
 * AZ ÍTÉLET — EGY OTTHON, amit a KIADÁS és a BEVÁLTÁS is hív.
 *
 * `validAt` a KIADÁS ideje: a beváltás a KIADÁSKOR hatályos alaphoz mér, nem a mai szöveghez
 * (ORG-N1a/REV-N1b). `knownAt` a kérdezés ideje — a később rögzített verzió nem írja át a múltat.
 */
export function limitVerdict({ store, basisId, bookId, role, operation, scope, validAt, knownAt }) {
  if (typeof basisId !== 'string' || !basisId.trim()) {
    return frozen({ ok: false, reason: 'basis_id_required', basis_version: null, limit: null });
  }
  const basis = basisAsOf({ store, basisId, bookId, validAt, knownAt });
  if (basis.in_effect !== true) {
    return frozen({ ok: false, reason: basis.reason, basis_version: basis.version ?? null, limit: null });
  }
  const within = withinBasis(basis, { operation, role, scope });
  if (!within.ok) {
    return frozen({ ok: false, reason: within.reason, basis_version: basis.version, limit: basis.limit });
  }
  return frozen({ ok: true, reason: 'within_basis', basis_version: basis.version, limit: basis.limit });
}

/**
 * A KIADÁS ALAPON — a NEVEZETT kiadó út (a). A korláton túli kiadás NEVEZETTEN elakad, és
 * SEMMILYEN sort nem hagy maga után (KUKA-084: a lezárás nem hely, hanem csatorna — ha a meghívó
 * megszületne és csak a pecsét maradna el, a beváltás a „nincs deklarált alap" ágra esne vissza).
 */
export function issueInviteUnderBasis({
  store, token, bookId, inviteeNamespace, inviteeValue, offeredRole, issuerSubject, expiresAt,
  basisId, operation = INVITE_ISSUE_OPERATION, scope = null, issuedAt,
}) {
  const verdict = limitVerdict({
    store, basisId, bookId, role: offeredRole, operation, scope, validAt: issuedAt, knownAt: issuedAt,
  });
  if (!verdict.ok) return frozen({ ok: false, reason: verdict.reason, basis_version: verdict.basis_version });

  // A KÉT ÍRÁS EGY EGYSÉG (R88/F02 · KUKA-024): meghívó pecsét nélkül nem születhet.
  return store.atomic(() => {
    store.run(
      `INSERT INTO invite (token, book_id, invitee_namespace, invitee_value, offered_role,
                           issuer_subject, expires_at, redeemed_at)
       VALUES (?,?,?,?,?,?,?,NULL)`,
      token, bookId, inviteeNamespace, inviteeValue, offeredRole, issuerSubject, expiresAt);
    store.run(
      `INSERT INTO invite_basis (token, basis_id, basis_version, book_id, issued_at, operation, scope, sealed_limit)
       VALUES (?,?,?,?,?,?,?,?)`,
      token, basisId, verdict.basis_version, bookId, issuedAt, operation, scope,
      canonicalLimit(verdict.limit));
    return frozen({ ok: true, token, basis_id: basisId, basis_version: verdict.basis_version });
  });
}

/** A KIADOTT KORLÁT — a papír. Hiánya NEM hiba, hanem NEVEZETT állapot (KUKA-124/2). */
export function inviteBasisSeal(store, token) {
  const row = store.get('SELECT * FROM invite_basis WHERE token = ?', token);
  if (!row) return frozen({ declared: false, reason: 'no_declared_basis' });
  return frozen({ declared: true, seal: row });
}

/**
 * A BEVÁLTÁS KAPUJA (c) — a korlát a beváltáskor is hat, és a KIADÁSKORI alaphoz mér.
 *
 * HÁROM KÜLÖN, NEVEZETT VÁLASZ (KUKA-124/2 — a hiány nem a rossz érték alesete):
 *   · nincs deklarált alap ⇒ `basis_declared: false`, a MAI szabály dönt, és ezt kimondjuk;
 *   · a kiadáskori alap már nem az, ami a pecséten áll ⇒ `basis_version_changed`;
 *   · a pecséten álló korlát eltér az alap korlátjától ⇒ `sealed_limit_differs_from_basis`.
 */
export function redemptionLimitGate({ store, invite, knownAt }) {
  const sealed = inviteBasisSeal(store, invite.token);
  if (!sealed.declared) {
    return frozen({ ok: true, basis_declared: false, reason: 'no_declared_basis', limit: null, seal: null });
  }
  const s = sealed.seal;
  if (String(s.book_id) !== String(invite.book_id)) {
    return frozen({ ok: false, basis_declared: true, reason: 'basis_book_differs', limit: null, seal: s });
  }
  const verdict = limitVerdict({
    store, basisId: s.basis_id, bookId: invite.book_id, role: invite.offered_role,
    operation: s.operation, scope: s.scope, validAt: s.issued_at, knownAt,
  });
  if (!verdict.ok) {
    return frozen({ ok: false, basis_declared: true, reason: verdict.reason, limit: verdict.limit, seal: s });
  }
  if (Number(verdict.basis_version) !== Number(s.basis_version)) {
    return frozen({ ok: false, basis_declared: true, reason: 'basis_version_changed', limit: verdict.limit, seal: s });
  }
  if (canonicalLimit(verdict.limit) !== String(s.sealed_limit)) {
    return frozen({ ok: false, basis_declared: true, reason: 'sealed_limit_differs_from_basis', limit: verdict.limit, seal: s });
  }
  return frozen({ ok: true, basis_declared: true, reason: 'within_basis', limit: verdict.limit, seal: s });
}

/** A KORLÁT ÁTVITELE A TAGSÁGADÓ ESEMÉNYRE (c) — a beváltás nem csak a szerepet viszi át. */
export function recordGrantBasis({ store, grantEventId, gate }) {
  if (!gate || gate.basis_declared !== true || !gate.seal) {
    return frozen({ ok: false, reason: 'no_declared_basis' });
  }
  store.run(
    'INSERT INTO grant_basis (grant_event_id, token, basis_id, basis_version, granted_limit) VALUES (?,?,?,?,?)',
    grantEventId, gate.seal.token, gate.seal.basis_id, gate.seal.basis_version, canonicalLimit(gate.limit));
  return frozen({ ok: true, grant_event_id: grantEventId, basis_id: gate.seal.basis_id });
}

/** A TAGSÁG KORLÁTJA — a beváltás UTÁN olvasható tény. Hiánya NEVEZETT (nem néma „korlátlan"). */
export function grantBasisFor(store, grantEventId) {
  const row = store.get('SELECT * FROM grant_basis WHERE grant_event_id = ?', grantEventId);
  if (!row) return frozen({ declared: false, reason: 'no_declared_basis' });
  let limit = null;
  try { limit = JSON.parse(row.granted_limit); } catch { limit = null; }
  // AZ OLVASHATATLAN SOR ZÁR — nem néma „nincs korlát" (KUKA-020).
  if (limit === null) return frozen({ declared: true, reason: 'granted_limit_undecidable', limit: null });
  return frozen({
    declared: true, reason: 'granted_limit_recorded',
    basis_id: row.basis_id, basis_version: Number(row.basis_version), limit: frozen(limit),
  });
}
