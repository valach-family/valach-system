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
 *   · A BÍRÁLATI hatáskör (`adjudication_authority`) útján a korlát az R53 óta KAPU, két ponton:
 *     a hatáskör MEGADÁSAKOR és a tényleges HASZNÁLATKOR (ABL-01). A `basisState.limit_enforced`
 *     ezért MÉRT érték, nem beégetett hamis — és a `limit_enforced_paths` továbbra is felsorolja,
 *     hol VAN ma kapu. Egyetlen igen/nem mező itt hazudna (KUKA-041 · KUKA-050).
 *   · AMI EBBŐL KIMARAD, KIMONDVA: az alap NÉLKÜL adott, történeti hatáskörök. Ahol `basis_id`
 *     nincs, ott a mai viselkedés változatlan — erről az R53 kifejezetten NEM hoz üzleti döntést,
 *     tehát nem is találunk ki hozzá szabályt (KUKA-033).
 *   · A req-5 harmadik lépése (a két klauzula BEEMELÉSE a kötelező készletbe) TUDATOS lépés, és
 *     az ORG-N1b teljes lezárásához kötött — addig a req-4 marad.
 */
import { instantMs } from './store.mjs';
import { lookupClosed } from './closedRegistry.mjs';

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
 * EGY KONKRÉT VERZIÓ KORLÁTJA — ABV-01 (R53/ORG-N1b).
 *
 * MIÉRT KELL KÜLÖN. A `basisAsOf` mindig a KÉRDEZETT IDŐBEN hatályos LEGMAGASABB verziót adja. A
 * kikényszerítéshez viszont a MÚLTAT is tudni kell: melyik verzió alatt adták a hatáskört. A külső
 * fél kikötése (R53): *„A kiadott jogot a később tágabb alap önmagában ne szélesítse."* Ha csak a
 * mai verziót néznénk, egy holnapi bővítés visszamenőleg kitágítana egy tegnap adott hatáskört —
 * anélkül, hogy bárki újra megadta volna (KUKA-074: a megváltozott tény nem nyelhető el, de a
 * MEGADOTT jog sem nőhet magától).
 *
 * A HIÁNY MINDEN ALAKJA SAJÁT, NEVEZETT VÁLASZ, ÉS ZÁR (KUKA-124/2 · KUKA-020): nincs ilyen verzió ·
 * idegen könyv · olvashatatlan korlát-lista. PURE: csak olvas.
 */
export function basisVersionLimit({ store, basisId, bookId, version }) {
  if (typeof basisId !== 'string' || !basisId.trim()) {
    return frozen({ ok: false, reason: 'basis_id_required', limit: null });
  }
  if (typeof bookId !== 'string' || !bookId.trim()) {
    return frozen({ ok: false, reason: 'book_id_required', limit: null });
  }
  if (!Number.isInteger(Number(version))) {
    return frozen({ ok: false, reason: 'basis_version_required', limit: null });
  }
  const row = store.get('SELECT * FROM authority_basis WHERE basis_id = ? AND version = ?', basisId, Number(version));
  if (!row) return frozen({ ok: false, reason: 'granted_basis_version_missing', limit: null });
  if (String(row.book_id) !== String(bookId)) {
    return frozen({ ok: false, reason: 'basis_belongs_to_other_book', limit: null });
  }
  const ops = parseList(row.allowed_operations);
  const roles = parseList(row.allowed_roles);
  const scopes = parseList(row.allowed_scopes);
  if (ops === null || roles === null || scopes === null) {
    return frozen({ ok: false, reason: 'granted_basis_version_undecidable', limit: null });
  }
  return frozen({
    ok: true, reason: 'granted_basis_version_read', version: Number(version),
    limit: frozen({ operations: frozen([...ops]), roles: frozen([...roles]), scopes: frozen([...scopes]) }),
  });
}

/**
 * A KORLÁT ÍTÉLETE — MA MÁR KIKÉNYSZERÍTVE (a szöveg a valóságot követi, KUKA-050).
 *
 * Ez a feloldó megmondja, hogy egy kért (művelet · szerep · adatkör) hármas belefér-e az alapba.
 * A régi mondat („MA EGYETLEN KIADÓ ÚT SEM HÍVJA") az R90 óta, a bírálati útra pedig az R53 óta
 * NEM IGAZ. Aki ma hívja: a MEGHÍVÓ kiadása és beváltása (`basisLimit.mjs`), valamint a BÍRÁLATI
 * hatáskör megadása és használata (`adjudicationLimitVerdict` → `grantAdjudicationAuthority` +
 * `authorityRowAt`). A `limit_enforced_paths` sorolja fel, hol áll ma kapu.
 *
 * ÜRES LISTA = NINCS MEGENGEDVE, nem „minden": a hiány nem lehet néma engedély (fail-closed).
 */
export function withinBasis(basis, { operation = null, role = null, scope = null, required = [] } = {}) {
  if (!basis || basis.in_effect !== true) {
    return frozen({ ok: false, reason: basis && basis.reason ? basis.reason : 'no_basis' });
  }
  // A KÖTELEZŐ TENGELY HIÁNYA SAJÁT, NEVEZETT VÁLASZ — R92/F02 (a külső fél lelete).
  //
  // A LELET. A `scope` alapértéke `null` volt, a feloldó pedig a null értékű tengelyt ÁTUGROTTA.
  // Ettől az `allowedScopes: []` alap (ahol fogalmilag SEMMI nincs megengedve) egy egyszerű
  // ELHAGYÁSSAL megkerülhető volt: scope-pal `outside_basis_scopes`, scope nélkül `ok:true` — és
  // a beváltás valódi tagságot adott. A hiány tehát nem „nem kérdezem", hanem KIKAPCSOLÁS volt
  // (KUKA-020 · KUKA-124/2: a hiánynak saját, nevezett kapuja van).
  //
  // A FELOLDÓ PARAMÉTEREZETT MARAD (az ő kikötésük), de a kötelezőséget nem a HÍVÓ szabja meg
  // esetről esetre: a `required` listát a MŰVELETI SZERZŐDÉS adja (MOP-01, `basisLimit.mjs`).
  const want = new Set(Array.isArray(required) ? required : []);
  const values = { operations: operation, roles: role, scopes: scope };
  for (const axis of BASIS_LIMIT_AXES) {
    if (!want.has(axis)) continue;
    const v = values[axis];
    if (v === null || v === undefined || v === '') {
      return frozen({ ok: false, reason: `axis_value_required_${axis}`, basis_version: basis.version });
    }
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
export const LIMIT_ENFORCED_PATHS = Object.freeze([
  'invite_issue', 'invite_redeem',
  // R53 — A BÍRÁLATI ÚT MINDKÉT PONTJA KAPU LETT (ABL-01): a hatáskör MEGADÁSA és a tényleges
  // HASZNÁLAT is az alap korlátjához mér. A lista ezért nő — és nem egy igen/nem mezővé olvad
  // össze, mert az elhallgatná, MELYIK úton áll ma kapu (KUKA-050).
  'adjudication_grant', 'adjudication_use',
]);

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
    // ORG-N1b — EZEN AZ ÚTON MÁR KAPU (R53 · ABL-01). KÉT KÜLÖN TÉNY, KÉT KÜLÖN MEZŐ (KUKA-002):
    //
    //   `limit_enforced`    — VAN-E KAPU ezen az úton. Ez a KÓD tulajdonsága, és alapra hivatkozó
    //                         hatáskör-sornál az R53 óta IGAZ. (Alap nélküli sor ide el sem jut.)
    //   `within_limit_now`  — BELEFÉR-E MA ez a konkrét hatáskör. Ez a MÉRÉS: ugyanazt a feloldót
    //                         hívja, amit a használat, tehát a mező nem tud elcsúszni a valóságtól.
    //
    // Ha a kettőt egy mezőbe vonnánk, egy JOGOSAN elutasított hatáskör „nincs kapu"-nak látszana —
    // vagyis a mező a saját nevétől eltérő kérdésre felelne (KUKA-073).
    limit_enforced: true,
    within_limit_now: adjudicationLimitVerdict({
      store, basisId: row.basis_id, bookId, operation, mode: 'use',
      grantedUnderVersion: row.basis_version ?? null, validAt, knownAt,
    }),
    limit_enforced_paths: LIMIT_ENFORCED_PATHS,
  });
}


// ═══════════════════════════════════════════════════════════════════════════════════════════════
// A KORLÁT ÍTÉLETE ITT LAKIK — ÉS EZ SZERKEZETI DÖNTÉS, NEM KÉNYELEM (R53).
//
// MIÉRT KÖLTÖZÖTT IDE a `basisLimit.mjs`-ből. Az ORG-N1b kikényszerítéséhez a BÍRÁLATI úton a közös
// belépési pontnak (`authority.mjs` → `authorityRowAt`) kell hívnia az ítéletet. A `basisLimit.mjs`
// viszont a `command.mjs`-t importálja (a pecsét kanonikus alakjához), az pedig vissza az
// `authority.mjs`-t — tehát a közvetlen behúzás KÖRT csinált volna. Ugyanaz a helyzet, mint az
// R73-ban a hatáskör-sor értékelésénél, és ugyanaz a válasz, a külső fél akkori mondatával:
// *„A függőségi kör szerkezeti feladat, nem indok az ellenőrzés elhagyására."*
//
// AMI ITT VAN: a SZERZŐDÉS (mely tengely kötelező melyik műveleten) és az ÍTÉLET (belefér-e).
// AMI A `basisLimit.mjs`-BEN MARAD: a MEGHÍVÓ-út írói (kiadás · pecsét · beváltás), mert azok
// tárolnak és kanonizálnak. Egy fogalom, egy otthon — az ítélet nem másolódik szét (KUKA-003).
/** A KIADÁS MŰVELETE — nevezett állandó, hogy a tengely ne elgépelt szövegen álljon (KUKA-036). */
export const INVITE_ISSUE_OPERATION = 'invite_issue';

/**
 * MOP-01 — A MŰVELETI SZERZŐDÉS (R92/F01 + R92/F02, a külső fél két bizonyított megkerülése).
 *
 * MI VOLT A KÉT LELET, MÉRVE (az ő programjuk a változatlan kódon, teljes kiadás→beváltás úton):
 *   · **F01** — a `operation` paraméter a HÍVÓÉ volt. Egy CSAK `suspend`-re felhatalmazó alappal az
 *     `operation:'suspend'` átírással a meghívó KIADÁSA és BEVÁLTÁSA is sikerült, és valódi
 *     user-TAGSÁG keletkezett. A kapu tehát azt a nevet mérte, amit a hívó MONDOTT, nem azt a
 *     hatást, amit a belépési pont VÉGREHAJT (KUKA-121: amit a beadó begépelhet, az állítás).
 *     Ráadásul a beváltás UGYANAZT a hamis nevet olvasta vissza a pecsétből — a közös feloldó két
 *     helyen hívása ezért nem zárta a rést (KUKA-129 határa: a közös otthon nem véd, ha a BEMENET
 *     hamis).
 *   · **F02** — a `scope` alapértéke `null`, a feloldó pedig a null tengelyt ÁTUGROTTA. Így az
 *     `allowedScopes: []` alap (ahol fogalmilag SEMMI nincs megengedve) egy ELHAGYÁSSAL
 *     megkerülhető volt: scope-pal elakadt, scope nélkül átment.
 *
 * A SZERZŐDÉS EZÉRT MŰVELETHEZ KÖTÖTT, NEM HÍVÓHOZ:
 *   · `operation` — a belépési pont RÖGZÍTI. Eltérő deklarált művelet NEVEZETT elutasítás, és a
 *     nyers pecsétből érkező eltérő művelet is (a pecsét sem hívó-állítás többé);
 *   · `axes` — mely tengelyek KÖTELEZŐEK. A hiány saját, nevezett válasz (`axis_value_required_*`),
 *     nem az ellenőrzés kikapcsolása. Ahol egy tengely fogalmilag nem alkalmazható, azt a
 *     SZERZŐDÉS mondja ki (`not_applicable`) — a hívó soha.
 *
 * Az általános feloldó (`withinBasis`) paraméterezett marad; a KÖTELEZŐSÉGET innen kapja.
 */
//
// R53 — A HÁROM BÍRÁLATI MŰVELET IS SZERZŐDÉST KAP (ORG-N1b a hatásköri úton).
//
// MIÉRT: a külső fél MÉRTE, hogy egy CSAK `invite_issue`-ra szóló határozattal `adjudicate`
// hatáskört lehetett adni ÉS használni; a korlát ott állt az adatbázisban, olvasható alakban, és
// senki nem kérdezte meg (KUKA-126 · a saját `limit_enforced: false` mezőnk ezt ki is mondta).
//
// MELY TENGELYEKET HORDOZZÁK VALÓBAN — EZT ELŐBB MEG KELL NEVEZNI (R53 kikötése):
//   · `operations` — KÖTELEZŐ. A művelet neve MAGA a tengely értéke (`suspend` · `adjudicate` ·
//     `alter_right`), és a hatáskör-sor pontosan erre az egy műveletre szól. Ez az egyetlen
//     tengely, amit ezek a műveletek ténylegesen hordoznak.
//   · `roles` — NEM ÉRTELMEZHETŐ. A bírálati művelet nem ad és nem vesz fel tagsági SZEREPET: a
//     felfüggesztés, az elbírálás és a jogváltoztatás nem „user"-ként vagy „admin"-ként történik.
//     Aki ide szerepet találna ki, egy NÉMA megfeleltetést gyártana (KUKA-022 · KUKA-061).
//   · `scopes` — NEM ÉRTELMEZHETŐ. A bírálat tárgya egy BEADVÁNY, nem egy tartalom-adatkör; a
//     beadvány szövege nincs a zárt adatkör-szótárba besorolva. A hallgatólagos „keszlet/arak"
//     megfeleltetés itt találmány volna, nem szabály.
//
// A `not_applicable` tehát NEM kikapcsolás, hanem KIMONDOTT állítás arról, hogy a tengelynek ezen a
// műveleten nincs értelme — és a szerződés mondja ki, soha nem a hívó (MOP-01 eredeti elve).
export const ADJUDICATION_LIMIT_OPERATIONS = Object.freeze(['suspend', 'adjudicate', 'alter_right']);

const ADJUDICATION_AXES = Object.freeze({
  operations: 'required', roles: 'not_applicable', scopes: 'not_applicable',
});

export const OPERATION_LIMIT_CONTRACT = Object.freeze({
  [INVITE_ISSUE_OPERATION]: Object.freeze({
    operation: INVITE_ISSUE_OPERATION,
    axes: Object.freeze({ operations: 'required', roles: 'required', scopes: 'required' }),
  }),
  ...Object.fromEntries(ADJUDICATION_LIMIT_OPERATIONS.map((op) => [op, Object.freeze({
    operation: op,
    axes: ADJUDICATION_AXES,
    axis_note: 'a szerep- és adatkör-tengely ezen a műveleten FOGALMILAG nem értelmezhető — a '
      + 'bírálat nem tagsági szerepben történik, és a beadvány nem tartalom-adatkör (R53)',
  })])),
});

/** A szerződés KÖTELEZŐ tengelyei — egy nevezett feloldó, hogy a lista ne másolódjon szét. */
export function requiredAxesFor(operation) {
  // ZÁRT REGISZTER, SAJÁT KULCSON (CLR-01, R37 · KUKA-180). A régi alak `toString` névre nyers
  // `TypeError`-ral állt meg a következő sorban — a hívó fail-closed ága meg sem valósult.
  const c = lookupClosed(OPERATION_LIMIT_CONTRACT, operation, { shape: (v) => typeof v === 'object' && v.axes });
  if (!c) return null;                                    // ismeretlen művelet ⇒ a hívó ZÁR (fail-closed)
  return Object.freeze(Object.entries(c.axes).filter(([, v]) => v === 'required').map(([k]) => k));
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
  // A MŰVELET A SZERZŐDÉSBŐL KAPJA A KÖTELEZŐ TENGELYEIT (MOP-01). Ismeretlen művelet ⇒ ZÁR: nem
  // azért, mert „biztos baj van", hanem mert nem tudjuk, mit kellene mérni rajta (KUKA-020).
  const required = requiredAxesFor(operation);
  if (required === null) {
    return frozen({ ok: false, reason: 'operation_has_no_limit_contract', basis_version: null, limit: null });
  }
  const basis = basisAsOf({ store, basisId, bookId, validAt, knownAt });
  if (basis.in_effect !== true) {
    return frozen({ ok: false, reason: basis.reason, basis_version: basis.version ?? null, limit: null });
  }
  const within = withinBasis(basis, { operation, role, scope, required });
  if (!within.ok) {
    return frozen({ ok: false, reason: within.reason, basis_version: basis.version, limit: basis.limit });
  }
  return frozen({ ok: true, reason: 'within_basis', basis_version: basis.version, limit: basis.limit });
}

/**
 * ABL-01 — A BÍRÁLATI HATÁSKÖR ALAPJÁNAK KORLÁTJA, KÉT PONTON (ORG-N1b, R53).
 *
 * A KÜLSŐ FÉL KIKÖTÉSE, SZÓ SZERINT: *„A deklarált alap a hatáskör MEGADÁSAKOR és a tényleges
 * használat alkalmazható időpontjában is korlátozzon; ne csak az alap létét/hatályát nézd."*
 *
 * A KÉT PONT KÉT KÜLÖN KÉRDÉSRE FELEL, és egyik sem helyettesíti a másikat (KUKA-124):
 *   · MEGADÁSKOR — szabad-e EBBŐL az alapból EZT a hatáskört adni? (`grantedUnderVersion: null`)
 *   · HASZNÁLATKOR — a MAI alap még mindig megengedi-e? A jog nem élheti túl az alapját.
 *
 * ÉS A HARMADIK SZABÁLY, AMI NÉLKÜL A MÁSODIK FÉL VOLNA: *„A kiadott jogot a később tágabb alap
 * önmagában ne szélesítse."* Ezért a használat a MEGADÁSKORI verzió korlátját is megkérdezi: a
 * művelet MINDKETTŐBEN benne kell legyen. Egy holnapi bővítés így nem nyit ki visszamenőleg egy
 * tegnap adott hatáskört — ahhoz ÚJ megadás kell, ami a saját nyomát hagyja (KUKA-074).
 *
 * A múlt visszakereshető marad: a hatáskör-sor `basis_id` + `basis_version` mezőjéhez nem nyúlunk,
 * és a régi verzió sorát sem írjuk át (REV-N1b).
 *
 * ── R55/F55-01 — A MÓD KIMONDOTT, NEM A `null`-BÓL KITALÁLT ─────────────────────────────────────
 *
 * A LELET (megtalálta: a KÜLSŐ ELLENŐRZŐ FÉL, R55/F55-01; a saját fánkon mindhárom műveletre
 * megismételve). Az R53-as alak a HIÁNYZÓ megadáskori verziót (`null`) úgy értette, hogy „nincs
 * korábbi bélyegző, tehát csak a MAI alap dönt" — és engedett. Csakhogy ugyanez a `null` KÉT,
 * egymástól gyökeresen különböző helyzetet jelölt:
 *
 *   MEGADÁS  — „most adjuk a jogot": tényleg nincs még korábbi verzió, a mai alap a helyes mérce;
 *   HASZNÁLAT — „egy MÁR MEGADOTT jog történeti bizonyítéka HIÁNYZIK": ebből engedély NEM következhet.
 *
 * Mérve, a változatlan R53-as forráson: egy `basis_id='B'`, `basis_version=NULL` hatáskör-sorral a
 * február 1-jei használat MIND A HÁROM műveletre ÁTMENT, és VALÓDI hatást fejtett ki — felfüggesztés
 * létrejött, ügy `resolved` lett, tagság megvonva. Ez a KUKA-002 alakja a MÓDON: két külön tény ült
 * egy jelölésen, és a hiány NÉMÁN engedéllyé vált (KUKA-012 · KUKA-124/2).
 *
 * INNENTŐL A MÓDOT A HÍVÓ MONDJA KI (`mode: 'grant' | 'use'`), és egyik mód sem következtethető a
 * `null`-ból. HASZNÁLAT módban a megadáskori verzió KÖTELEZŐ: a hiánya, az értelmezhetetlen alakja
 * és a nem létező verzió MIND külön nevezett elutasítás — hatás és írás nélkül.
 *
 * PURE: csak olvas, nem ír.
 */

/** A KÉT MÓD ZÁRT HALMAZA — ismeretlen mód nem „valamelyik", hanem NEM DÖNTHETŐ (KUKA-101). */
export const LIMIT_CHECK_MODES = Object.freeze(['grant', 'use']);

export function adjudicationLimitVerdict({
  store, basisId, bookId, operation, mode, grantedUnderVersion = null, validAt, knownAt,
}) {
  // A MÓD NÉLKÜLI HÍVÁS NEM „ALAPÉRTELMEZETTEN HASZNÁLAT" ÉS NEM „ALAPÉRTELMEZETTEN MEGADÁS":
  // mindkét tippelés pont azt a kétértelműséget hozná vissza, ami a leletet okozta (KUKA-020).
  if (!LIMIT_CHECK_MODES.includes(mode)) {
    return frozen({
      ok: false, reason: 'limit_check_mode_required', checked: 'mode',
      basis_version: null, limit: null, granted_under_version: grantedUnderVersion ?? null,
      message: `az ellenőrzés MÓDJÁT ki kell mondani (${LIMIT_CHECK_MODES.join(' | ')}) — a `
        + 'megadáskori verzió hiánya MEGADÁSNÁL természetes, HASZNÁLATNÁL viszont hiányzó '
        + 'történeti bizonyíték, és a kettőből nem következhet ugyanaz a válasz',
    });
  }
  // A MAI ÁLLAPOT — a közös ítélőn át, hogy a meghívó-út és a bírálati út ne tudjon elcsúszni
  // (KUKA-003: egy fogalom, egy otthon). A szerep- és adatkör-tengely itt fogalmilag nem
  // alkalmazható, ezt a MOP-01 szerződés mondja ki — nem a hívó hagyja el (R92/F02).
  const today = limitVerdict({
    store, basisId, bookId, operation, role: null, scope: null, validAt, knownAt,
  });
  if (today.ok !== true) {
    return frozen({ ...today, checked: 'today', granted_under_version: grantedUnderVersion ?? null });
  }
  const versionAbsent = grantedUnderVersion === null || grantedUnderVersion === undefined;
  if (mode === 'grant') {
    // MEGADÁSKOR nincs korábbi bélyegző — és nem is szabad, hogy legyen. Ha a hívó mégis ad egyet,
    // az nem „extra óvatosság", hanem összekevert mód: NEVEZETTEN elutasítjuk (KUKA-121).
    if (!versionAbsent) {
      return frozen({
        ok: false, reason: 'granted_version_not_applicable_at_grant', checked: 'mode',
        basis_version: today.basis_version, limit: today.limit,
        granted_under_version: grantedUnderVersion,
      });
    }
    return frozen({
      ok: true, reason: 'within_basis', checked: 'today',
      basis_version: today.basis_version, limit: today.limit, granted_under_version: null,
    });
  }
  // HASZNÁLAT módban a megadáskori verzió KÖTELEZŐ BIZONYÍTÉK. A hiánya nem „nincs korlát", hanem
  // NEM TUDJUK, mi alapján adták — és amit nem tudunk, abból engedély nem lehet (R55/F55-01).
  if (versionAbsent) {
    return frozen({
      ok: false, reason: 'granted_basis_version_absent', checked: 'granted_version',
      basis_version: today.basis_version, limit: today.limit, granted_under_version: null,
      message: `a hatáskör a(z) ${basisId} alapra hivatkozik, de NEM ŐRZI, melyik verzió alatt `
        + 'adták — a hiányzó történeti bizonyítékból engedély nem következhet',
    });
  }
  if (!Number.isInteger(Number(grantedUnderVersion))) {
    return frozen({
      ok: false, reason: 'granted_basis_version_undecidable', checked: 'granted_version',
      basis_version: today.basis_version, limit: today.limit,
      granted_under_version: grantedUnderVersion,
    });
  }
  const granted = basisVersionLimit({ store, basisId, bookId, version: grantedUnderVersion });
  if (granted.ok !== true) {
    return frozen({
      ok: false, reason: granted.reason, checked: 'granted_version',
      basis_version: today.basis_version, limit: today.limit,
      granted_under_version: grantedUnderVersion,
    });
  }
  if (!granted.limit.operations.includes(operation)) {
    return frozen({
      ok: false, reason: 'outside_granted_basis_version', checked: 'granted_version',
      basis_version: today.basis_version, limit: today.limit,
      granted_under_version: grantedUnderVersion, granted_limit: granted.limit,
      message: `a hatáskört a(z) ${basisId} alap ${grantedUnderVersion}. verziója alatt adták, és az `
        + `a verzió a(z) "${operation}" műveletet nem engedte meg — egy KÉSŐBBI, tágabb verzió `
        + 'önmagában nem szélesíti ki a MÁR KIADOTT jogot',
    });
  }
  return frozen({
    ok: true, reason: 'within_basis', checked: 'today_and_granted_version',
    basis_version: today.basis_version, limit: today.limit,
    granted_under_version: grantedUnderVersion, granted_limit: granted.limit,
  });
}

