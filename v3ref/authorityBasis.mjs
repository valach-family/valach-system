/** BAS-01 — A FELHATALMAZÁS ALAPJA, KÉT IDŐ-TENGELYEN (ORG-N1a).
 *
 * MIÉRT ÉPP MOST. Az R53 §7 sorrendje szerint a REV-N2 után az ORG-N1 következik, és a külső fél
 * (chatgpt-v3) az R85 §1-ben kifejezetten ezt kérte a két core-javítás MELLÉ, EGY csomagban:
 * *„az ORG-N1a/b-hez kapcsolódó felhatalmazási alap és annak időbeli nyilvántartása"*. Az R85 §5
 * ehhez a listát is megadta: **azonosító · verzió · hatály · rögzítési idő · eseményhez kötött
 * bizonyíték**.
 *
 * MIÉRT VOLT EZ AZ ELŐFELTÉTELE A REV-N2-NEK. Egy határozatnak SAJÁT hatálya van, és a róla
 * szerzett tudomás KÉSŐBB érkezhet — enélkül az „érvényes volt-e az alap, amikor a hatáskört
 * adták?" kérdés meg sem fogalmazható. A két tengely tehát nem új szerkezet: UGYANAZ, amit a
 * megvonás (R83) és a tagságadás (R85/F01) már használ. Három azonos alakú tényt nem tartunk
 * három különböző szerkezetben (KUKA-003).
 *
 * A HELYZET, EMBERI NYELVEN. A cégvezető márciusi határozata felhatalmaz egy munkatársat. A
 * határozatot júniusban ÚJ VERZIÓRA cserélik. Ekkor KÉT kérdés van, és mindkettőre más a válasz:
 *
 *   „mi volt az alap MÁRCIUSBAN"        → az 1. verzió — és ezt a júniusi csere NEM írja át
 *   „mi az alap MA"                     → a 2. verzió
 *
 * AMIT EZ A MODUL MA NEM ÁLLÍT — KIMONDVA (KUKA-015 · KUKA-033).
 *   · Az ORG-N1b (a KORLÁT kikényszerítése a kiadásnál és a beváltásnál) NEM ÉPÜLT MEG. A korlát
 *     MEZŐI itt tárolva vannak, és a `withinBasis` feloldó ki is mondja az ítéletet — de a
 *     meghívó-kiadás és a beváltás MÉG NEM HÍVJA. Amíg nem hívja, a korlát NEM VÉDELEM, csak
 *     adat: ezt a `basisState` `limit_enforced: false` mezője kimondja, hogy senki ne higgye
 *     megépültnek (KUKA-041: a nem-kapuzó mező LÁTSSZON, és mondja meg magáról).
 *   · Ezért az ORG-N1a/b NEM kerül be a kötelező készletbe ebben a körben (a req-4 marad).
 */
import { instantMs } from './store.mjs';

const frozen = (o) => Object.freeze(o);

/** A háromféle korlát-tengely — zárt készlet, hogy egy elgépelt név ne néma engedély legyen. */
export const BASIS_LIMIT_AXES = Object.freeze(['operations', 'roles', 'scopes']);

const parseList = (raw) => {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) && v.every((x) => typeof x === 'string') ? v : null;
  } catch { return null; }
};

/**
 * EGY ÚJ VERZIÓ RÖGZÍTÉSE — a régi sort SOHA nem írjuk át (REV-N1b: a múlt tartalma sértetlen).
 *
 * A bizonyíték-hivatkozás KÖTELEZŐ, és az ESEMÉNY saját adata — ez az R85/F02 tanulsága átvíve:
 * ami csak egy származtatott szerkezetben (ott: a felülvizsgálati körben) él, az a szerkezet nélküli
 * ágakon nyomtalanul elvész.
 */
export function recordAuthorityBasis({
  store, basisId, bookId, issuerSubject, effectiveAt, recordedAt,
  expiresAt = null, allowedOperations = [], allowedRoles = [], allowedScopes = [], evidenceRef,
}) {
  const eff = instantMs(effectiveAt);
  const rec = instantMs(recordedAt);
  if (typeof basisId !== 'string' || !basisId.trim()) return frozen({ ok: false, reason: 'basis_id_required' });
  if (!eff.ok) return frozen({ ok: false, reason: `effective_at_${eff.reason}` });
  if (!rec.ok) return frozen({ ok: false, reason: `recorded_at_${rec.reason}` });
  if (typeof evidenceRef !== 'string' || !evidenceRef.trim()) return frozen({ ok: false, reason: 'evidence_ref_required' });
  if (expiresAt !== null && !instantMs(expiresAt).ok) return frozen({ ok: false, reason: 'expires_at_unparseable' });

  const prev = store.get('SELECT MAX(version) AS v FROM authority_basis WHERE basis_id = ?', basisId);
  const version = Number(prev && prev.v ? prev.v : 0) + 1;
  store.run(
    `INSERT INTO authority_basis (basis_id, version, book_id, issuer_subject, effective_at,
       recorded_at, expires_at, revoked_at, allowed_operations, allowed_roles, allowed_scopes, evidence_ref)
     VALUES (?,?,?,?,?,?,?,NULL,?,?,?,?)`,
    basisId, version, bookId, issuerSubject, effectiveAt, recordedAt, expiresAt,
    JSON.stringify([...allowedOperations]), JSON.stringify([...allowedRoles]),
    JSON.stringify([...allowedScopes]), evidenceRef);
  return frozen({ ok: true, basis_id: basisId, version, effective_at: effectiveAt, recorded_at: recordedAt });
}

/**
 * AZ ALAP ÁLLAPOTA A KÉT TENGELYEN — pontosan a `membershipAsOf` szerkezete.
 *
 *   `recorded_at <= knownAt`   — EKKOR MÁR ISMERTÜK ezt a verziót?
 *   `effective_at <= validAt`  — a KÉRDEZETT NAPRA hatályos-e?
 *
 * A LEGKÉSŐBBI ILYEN VERZIÓ dönt: az újabb verzió a régit VÁLTJA, nem törli. A lejárat és a
 * visszavonás KÜLÖN nevezett válasz — a KUKA-124/2 elve: a hiány és a rossz érték nem ugyanaz.
 */
export function basisAsOf({ store, basisId, validAt, knownAt }) {
  const valid = instantMs(validAt);
  const known = instantMs(knownAt);
  const base = { basis_id: basisId ?? null, valid_at: validAt ?? null, known_at: knownAt ?? null, version: null, limit_enforced: false };
  if (!valid.ok) return frozen({ ...base, in_effect: false, reason: `valid_at_${valid.reason}` });
  if (!known.ok) return frozen({ ...base, in_effect: false, reason: `known_at_${known.reason}` });

  const rows = store.all('SELECT * FROM authority_basis WHERE basis_id = ? ORDER BY version', basisId);
  if (!rows.length) return frozen({ ...base, in_effect: false, reason: 'no_recorded_basis' });

  let best = null;
  for (const r of rows) {
    const rec = instantMs(r.recorded_at);
    const eff = instantMs(r.effective_at);
    // Az OLVASHATATLAN sor ZÁR — nem néma kihagyás (KUKA-020).
    if (!rec.ok || !eff.ok) return frozen({ ...base, in_effect: false, reason: 'basis_row_undecidable' });
    if (rec.ms > known.ms) continue;    // ezt a verziót akkor még nem ismertük
    if (eff.ms > valid.ms) continue;    // erre a napra még nem hatályos
    if (best === null || r.version > best.version) best = r;
  }
  if (best === null) return frozen({ ...base, in_effect: false, reason: 'no_basis_version_in_effect' });

  const shape = { ...base, version: best.version, issuer_subject: best.issuer_subject, evidence_ref: best.evidence_ref, effective_at: best.effective_at, recorded_at: best.recorded_at };
  if (best.revoked_at !== null && best.revoked_at !== undefined) {
    const rv = instantMs(best.revoked_at);
    if (!rv.ok) return frozen({ ...shape, in_effect: false, reason: 'basis_revoked_at_undecidable' });
    if (rv.ms <= valid.ms) return frozen({ ...shape, in_effect: false, reason: 'basis_revoked' });
  }
  if (best.expires_at !== null && best.expires_at !== undefined) {
    const ex = instantMs(best.expires_at);
    if (!ex.ok) return frozen({ ...shape, in_effect: false, reason: 'basis_expires_at_undecidable' });
    if (ex.ms <= valid.ms) return frozen({ ...shape, in_effect: false, reason: 'basis_expired' });
  }
  const ops = parseList(best.allowed_operations);
  const roles = parseList(best.allowed_roles);
  const scopes = parseList(best.allowed_scopes);
  if (ops === null || roles === null || scopes === null) {
    return frozen({ ...shape, in_effect: false, reason: 'basis_limit_undecidable' });
  }
  return frozen({
    ...shape,
    in_effect: true,
    reason: 'basis_in_effect',
    limit: frozen({ operations: frozen([...ops]), roles: frozen([...roles]), scopes: frozen([...scopes]) }),
  });
}

/**
 * A KORLÁT ÍTÉLETE — ORG-N1b ELŐKÉSZÍTÉSE, KIMONDOTTAN NEM KIKÉNYSZERÍTVE.
 *
 * Ez a feloldó megmondja, hogy egy kért (művelet · szerep · adatkör) hármas belefér-e az alapba.
 * MA EGYETLEN KIADÓ ÚT SEM HÍVJA — a meghívó-kiadás és a beváltás bekötése az ORG-N1b munkája.
 * Ezt a `basisState` `limit_enforced: false` mezője mondja ki, és a próba is méri: a nem-kapuzó
 * adat LÁTSZIK és megmondja magáról, hogy még nem véd (KUKA-041).
 *
 * ÜRES LISTA = NINCS MEGENGEDVE, nem „minden": a hiány nem lehet néma engedély (fail-closed).
 */
export function withinBasis(basis, { operation = null, role = null, scope = null } = {}) {
  if (!basis || basis.in_effect !== true) {
    return frozen({ ok: false, reason: basis && basis.reason ? basis.reason : 'no_basis' });
  }
  const check = (axis, value) => {
    if (value === null || value === undefined) return null;
    return basis.limit[axis].includes(value) ? null : `outside_basis_${axis}`;
  };
  const problem = check('operations', operation) || check('roles', role) || check('scopes', scope);
  if (problem) return frozen({ ok: false, reason: problem, basis_version: basis.version });
  return frozen({ ok: true, reason: 'within_basis', basis_version: basis.version });
}

/**
 * EGY HATÁSKÖR-SOR ALAPJÁNAK ÁLLAPOTA — a felhatalmazás MELLÉ, nem helyette.
 *
 * A `rightAt` MAI válasza változatlanul dönt a jogról; ez a feloldó azt mondja meg, MI ALAPJÁN
 * adták, és az az alap a kérdezett időben/tudásban állt-e. A KETTŐ KÜLÖN: az ORG-N1a a
 * NYILVÁNTARTÁST írja elő, a kikényszerítés az ORG-N1b-é.
 */
export function basisState({ store, subjectId, bookId, operation, validAt, knownAt }) {
  const row = store.get(
    'SELECT * FROM adjudication_authority WHERE subject_id = ? AND book_id = ? AND operation = ?',
    subjectId, bookId, operation);
  if (!row) return frozen({ recorded: false, reason: 'no_authority_row', limit_enforced: false });
  if (row.basis_id === null || row.basis_id === undefined) {
    // A HIÁNY KIMONDVA: a hatáskör él, de nem tudjuk, mi alapján adták. Ez NEM hiba ma — de nem is
    // hallgatható el (KUKA-012 · KUKA-127: a gyengébb tanút meg kell nevezni).
    return frozen({ recorded: false, reason: 'authority_without_recorded_basis', limit_enforced: false });
  }
  const basis = basisAsOf({ store, basisId: row.basis_id, validAt, knownAt });
  return frozen({
    recorded: true,
    basis_id: row.basis_id,
    granted_under_version: row.basis_version ?? null,
    in_effect: basis.in_effect,
    reason: basis.reason,
    version_now: basis.version,
    evidence_ref: basis.evidence_ref ?? null,
    limit: basis.limit ?? null,
    // ORG-N1b — KIMONDOTT ADÓSSÁG: a korlátot ma SENKI nem kényszeríti ki.
    limit_enforced: false,
  });
}
