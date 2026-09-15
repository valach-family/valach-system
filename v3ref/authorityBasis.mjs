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
 *   · Az ORG-N1b (a KORLÁT kikényszerítése) az R90 §6-ban RÉSZBEN megépült — de NEM ITT: a kapu a
 *     `basisLimit.mjs` (BLI-01), és a MEGHÍVÓ útján hat (kiadás + beváltás). Ez a modul továbbra is
 *     a NYILVÁNTARTÁS és az ÍTÉLET otthona: a `withinBasis` megmondja, belefér-e valami az alapba,
 *     a kikényszerítés a hívóké.
 *   · A BÍRÁLATI hatáskör (`adjudication_authority`) útján a korlát TOVÁBBRA IS csak adat — ezért
 *     marad a `basisState.limit_enforced: false`, és ezért sorolja fel a `limit_enforced_paths`,
 *     hol VAN ma kapu. Egyetlen igen/nem mező itt hazudna: `true` többet állítana, `false`
 *     kevesebbet (KUKA-041 · KUKA-050).
 *   · A req-5 harmadik lépése (a két klauzula BEEMELÉSE a kötelező készletbe) TUDATOS lépés, és
 *     az ORG-N1b teljes lezárásához kötött — addig a req-4 marad.
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

  if (typeof bookId !== 'string' || !bookId.trim()) return frozen({ ok: false, reason: 'book_id_required' });

  // A VERZIÓ NEM VÁLTHAT KÖNYVET (R88/F01 második fele — a külső fél kimondott kérése: „a verziók
  // közötti cégtérváltást se lehessen ugyanazon alapazonosító csendes újrahasználatával megtenni").
  //
  // Enélkül a fenti olvasó-oldali kötés MEGKERÜLHETŐ volna: elég volna az `A`-ra szóló alapra egy
  // `B` könyvű 2. verziót írni, és a `basisAsOf` onnantól `B`-ben is hatályosat találna. A javítás
  // ott áll, ahol az érték SZÜLETIK (KUKA-070), nem csak ott, ahol olvassuk (KUKA-129).
  const existing = store.all('SELECT DISTINCT book_id FROM authority_basis WHERE basis_id = ?', basisId);
  const other = existing.filter((r) => String(r.book_id) !== String(bookId));
  if (other.length) return frozen({ ok: false, reason: 'basis_id_belongs_to_other_book' });

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
export function basisAsOf({ store, basisId, bookId, validAt, knownAt }) {
  const valid = instantMs(validAt);
  const known = instantMs(knownAt);
  const base = {
    basis_id: basisId ?? null, book_id: bookId ?? null,
    valid_at: validAt ?? null, known_at: knownAt ?? null, version: null, limit_enforced: false,
  };
  if (!valid.ok) return frozen({ ...base, in_effect: false, reason: `valid_at_${valid.reason}` });
  if (!known.ok) return frozen({ ...base, in_effect: false, reason: `known_at_${known.reason}` });
  // A KÖNYV KÖTELEZŐ, ÉS A HIÁNYA ZÁR (R88/F01 — a külső fél lelete).
  //
  // MI VOLT A HIBA. Az alap TÁROLTA a könyvet, de a feloldás CSAK az azonosítóra szűrt, a
  // hatáskör-adás pedig az IDŐBELI érvényességet nézte, a könyv egyezését nem: az `A` könyvre
  // szóló határozatra hivatkozva létre lehetett hozni `B`-ben egy élő `adjudicate` hatáskört. A
  // mező tehát KI VOLT ÍRVA, de senki nem KÉRDEZTE meg (KUKA-126) — és mivel a döntést egyetlen
  // tengely (az idő) hozta, a hiányzó második tengely nem látszott (KUKA-159).
  //
  // MIÉRT KÖTELEZŐ, NEM OPCIONÁLIS. Egy „ha megadják, ellenőrizzük" alak néma kiskaput hagyna: aki
  // elfelejti átadni, ugyanazt a korlátlan választ kapná, mint ma (KUKA-041). A hiány ezért SAJÁT,
  // nevezett válasz, és ZÁR — a fail-closed itt nem választás (KUKA-020).
  if (typeof bookId !== 'string' || !bookId.trim()) {
    return frozen({ ...base, in_effect: false, reason: 'book_id_required' });
  }

  const rows = store.all('SELECT * FROM authority_basis WHERE basis_id = ? ORDER BY version', basisId);
  if (!rows.length) return frozen({ ...base, in_effect: false, reason: 'no_recorded_basis' });
  // AZ IDEGEN KÖNYV KÜLÖN, NEVEZETT VÁLASZ — nem ugyanaz, mint a „nincs ilyen alap" (KUKA-124/2).
  // A LEGSZŰKEBB SZŰRŐ a lekérdezésben is állhatna, de akkor az idegen könyv „nincs ilyen alap"-nak
  // látszana, és a befogadó nem tudná megkülönböztetni a két esetet (KUKA-064: a nemleges válasz
  // mondja meg, MIÉRT).
  const foreign = rows.filter((r) => String(r.book_id) !== String(bookId));
  if (foreign.length) {
    return frozen({ ...base, in_effect: false, reason: 'basis_belongs_to_other_book' });
  }

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
/**
 * HOL VAN A KORLÁT MA KIKÉNYSZERÍTVE — NEVEZETT LISTA, nem egy igen/nem mező (R90 §6 · KUKA-050).
 *
 * MIÉRT LISTA. Az ORG-N1b megépítése után a korlát a MEGHÍVÓ-úton VALÓDI kapu (BLI-01: a kiadás és
 * a beváltás is a közös feloldót hívja), a BÍRÁLATI hatáskör útján viszont továbbra is csak adat.
 * Egyetlen boolean ezek közül az egyiket elhallgatná — és az elhallgatás mindkét irányban rossz:
 * `true` többet állítana, `false` kevesebbet. A mező ezért felsorolja, MELYIK úton áll kapu.
 */
export const LIMIT_ENFORCED_PATHS = Object.freeze(['invite_issue', 'invite_redeem']);

export function basisState({ store, subjectId, bookId, operation, validAt, knownAt }) {
  const row = store.get(
    'SELECT * FROM adjudication_authority WHERE subject_id = ? AND book_id = ? AND operation = ?',
    subjectId, bookId, operation);
  if (!row) {
    return frozen({
      recorded: false, reason: 'no_authority_row',
      limit_enforced: false, limit_enforced_paths: LIMIT_ENFORCED_PATHS,
    });
  }
  if (row.basis_id === null || row.basis_id === undefined) {
    // A HIÁNY KIMONDVA: a hatáskör él, de nem tudjuk, mi alapján adták. Ez NEM hiba ma — de nem is
    // hallgatható el (KUKA-012 · KUKA-127: a gyengébb tanút meg kell nevezni).
    return frozen({
      recorded: false, reason: 'authority_without_recorded_basis',
      limit_enforced: false, limit_enforced_paths: LIMIT_ENFORCED_PATHS,
    });
  }
  const basis = basisAsOf({ store, basisId: row.basis_id, bookId, validAt, knownAt });
  return frozen({
    recorded: true,
    basis_id: row.basis_id,
    granted_under_version: row.basis_version ?? null,
    in_effect: basis.in_effect,
    reason: basis.reason,
    version_now: basis.version,
    evidence_ref: basis.evidence_ref ?? null,
    limit: basis.limit ?? null,
    // ORG-N1b — RÉSZBEN MEGÉPÜLT (R90 §6). EZEN az úton (bírálati hatáskör) a korlát TOVÁBBRA IS
    // csak adat: a `limit_enforced` ezért marad hamis. Ahol viszont KAPU lett belőle, azt a lista
    // megnevezi — a mező nem állít többet és nem is kevesebbet a valóságnál (KUKA-050).
    limit_enforced: false,
    limit_enforced_paths: LIMIT_ENFORCED_PATHS,
  });
}
