/** MRG-01 — A DARABOLT FUTÁS BEADVÁNY-KAPUJA (R81/F01–F03).
 *
 * MIÉRT SZÜLETETT. Az R79-ben megépített összefűzés (`mutate.mjs --merge`) a beadott egység-fájlok
 * SAJÁT ÖSSZEFOGLALÓIT vette mérésnek: a lefedettséget a `mutation_ids`, a darabszámot a `counts`,
 * a tisztaságot a `slice_clean`, a kötelező klauzula-készletet pedig az EGYIK BEADOTT EGYSÉG
 * `norm_required` mezője mondta meg. A RÉSZLETES eredményhez (`mutation_results`) egyik sem volt
 * mérve, a `run_contract` mezőt pedig senki nem olvasta el. A külső fél (chatgpt-v3, R81 §4) a
 * SAJÁT, VALÓDI egységeink másolatain négy alakban mutatta meg, mi következik ebből — mindegyik
 * `exit 0` · `run_state: complete` · `clean: true` lett:
 *
 *   F01a  minden `mutation_results` KIÜRÍTVE, a címkék és a számlálók meghagyva
 *         → „92 elkapva" 0 (nulla) részletes eredmény mellett
 *   F01b  minden részletes eredmény verdiktje `SURVIVED` · `probe_status: PASS` · üres
 *         `failed_assertions` — a lánc mégis 36 FEDETT klauzula-sort mondott
 *   F02   minden egység `norm_required.clauses` és `norm_chain` KIÜRÍTVE
 *         → „a kötelező készlet teljesül", mert a készlet maga lett üres
 *   F03   `run_contract: 'RUN-FOREIGN'` minden egységben → a kimenet változatlanul `RUN-02`-t írt
 *
 * A HIBA OSZTÁLYA — KUKA-121 AZ ÖSSZEFŰZÉSEN. „Amit a beadó BEGÉPELHET, az ÁLLÍTÁS, nem mérés."
 * Az R79-ben ugyanezt a szabályt az EGYSÉG-módra alkalmaztuk (`evidence_bound`), az ÖSSZEFŰZÉSRE
 * viszont nem: ott a beadott összefoglaló ugyanolyan „begépelhető" adat, mint bármely külső fél
 * beadványa. Mellette KUKA-126 (a `run_contract` kiírva, de senki nem olvassa — DÍSZ-mező) és
 * KUKA-124/2 (a HIÁNYZÓ mező némán ugyanoda sorolódott, mint a rendben lévő: „öröklött igen").
 *
 * A MEGOLDÁS ALAKJA — NÉGY SZABÁLY, MIND A RÉSZLETES BIZONYÍTÉKON:
 *
 *   (1) SZIGORÚ SÉMA + TÁMOGATOTT SZERZŐDÉS-VERZIÓ. Minden kötelező mező megléte ÉS típusa mérve,
 *       ÁTALAKÍTÁS NÉLKÜL (KUKA-125: a `Number()`/`String()` a megkülönböztetést törli el, nem a
 *       hibát). A hiányzó mező NEM „öröklött igen", hanem SAJÁT, nevezett akadály. A
 *       `run_contract` a TÁMOGATOTT készlethez mérve — ismeretlen verzió nem olvasható be.
 *
 *   (2) KÖLCSÖNÖS EGYÉRTELMŰ MEGFELELTETÉS (bijekció) a bejelentett mutáció-azonosítók és a
 *       RÉSZLETES eredmények között — és az ÖSSZESÍTŐK EBBŐL számolva. A lefedettség tehát nem a
 *       `mutation_ids` lista hossza: az a beadó SZAVA. Aki nem hozott részletes eredményt, az nem
 *       mért (KUKA-012 a mérőn: a hiányzó mérés nem zöld).
 *
 *   (3) A BEJELENTETT ÉS A MÉRT ADAT ELLENTMONDÁSA NEVEZETT AKADÁLY. Nem „a mért nyer" és nem „a
 *       bejelentett nyer": az ELLENTMONDÁS maga a lelet — ha a kettő nem ugyanazt mondja, a
 *       beadvány nem értelmezhető (KUKA-018: ahol egy tényről két ábrázolás él, látszania kell,
 *       melyik melyik, és ha ütköznek, az a hiba).
 *
 *   (4) A KÖTELEZŐ KÉSZLET, AZ ELVÁRT ÁLLAPOT ÉS A SZERZŐDÉS-LENYOMAT A MAI, RÖGZÍTETT FORRÁSBÓL.
 *       Nem a beadványból: a mérce nem jöhet attól, akit mérünk (KUKA-054 — a minta nem választhatja
 *       ki magát). A beadott érték ehhez MÉRVE lesz, és az eltérés akadály.
 *
 * ÉS AMIT A LÁNCRÓL MOND. Egy `covered` klauzula-sor nem azért fedett, mert a beadvány így nevezi:
 * a sor `falsified_by` mutációjának LÉTEZNIE kell a részletes eredmények között, `CAUGHT`
 * verdikttel, ugyanazon a próbán, és a sor állítás-azonosítóját a `failed_assertions` között
 * hordozva. Enélkül a sor NEM fedett — az F01b pontosan ezt a kötést vágta el.
 *
 * KIMONDOTT KORLÁT (változatlanul, KUKA-121 zárómondata). Ez a kapu a SZINTET emeli, nem
 * kriptográfiai bizonyíték: aki a fájlrendszerhez fér, elvileg gyárthat olyan egység-fájlt, ami
 * minden itteni szabálynak megfelel — ehhez viszont már VALÓDI, egymással összefüggő részletes
 * eredményeket kell előállítania, ami gyakorlatilag a battéria lefuttatása. A zárás feltétele
 * nevezett: aláírt egység-tanú.
 */

/** A TÁMOGATOTT FUTÁSI SZERZŐDÉSEK. Ismeretlen verziójú beadványt NEM olvasunk be: nem tudjuk,
 *  mit jelentenek a mezői (R81/F03 — a `RUN-FOREIGN` eddig némán átment). */
export const SUPPORTED_RUN_CONTRACTS = Object.freeze(['RUN-02']);

/** A VERDIKT-SZÓKÉSZLET. Ismeretlen verdikt nem „valami más", hanem olvashatatlan (KUKA-020). */
export const VERDICTS = Object.freeze(['CAUGHT', 'SURVIVED', 'WRONG_CATCHER', 'HARNESS_ERROR', 'STALE_ANCHOR']);

const isPlainObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const isText = (v) => typeof v === 'string' && v.length > 0;
const isBool = (v) => typeof v === 'boolean';
const isCount = (v) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

/** A HIÁNY ÉS A ROSSZ TÍPUS KÉT KÜLÖN VÁLASZ (KUKA-124/2) — a szöveg is ezt mondja ki. */
function fieldWhy(u, key) {
  if (!(key in u)) return 'a mező HIÁNYZIK';
  const v = u[key];
  if (v === null) return 'a mező NULL';
  return `a mező típusa nem megfelelő (${Array.isArray(v) ? 'tömb' : typeof v})`;
}

/** (1) SZIGORÚ SÉMA. A sorrend szándékos: a szerződés-verzió ELŐSZÖR, mert ha azt nem ismerjük, a
 *  többi mező jelentéséről sem tudunk semmit. */
export function unitSchemaProblems(u, { file = '(névtelen)' } = {}) {
  const p = [];
  const at = (m) => `[${file}] ${m}`;
  if (!isPlainObject(u)) return [at('a beadvány nem objektum')];

  if (!isText(u.run_contract)) p.push(at(`\`run_contract\`: ${fieldWhy(u, 'run_contract')}`));
  else if (!SUPPORTED_RUN_CONTRACTS.includes(u.run_contract)) {
    p.push(at(`ISMERETLEN futási szerződés: \`${u.run_contract}\` — támogatott: ${SUPPORTED_RUN_CONTRACTS.join(' · ')}`));
  }

  if (!isPlainObject(u.unit) || !isCount(u.unit.k) || !isCount(u.unit.n)
    || u.unit.n < 1 || u.unit.k < 1 || u.unit.k > u.unit.n) {
    p.push(at('`unit`: az egység-jelölés hiányzik vagy érvénytelen (k/n egész, 1 ≤ k ≤ n)'));
  }

  for (const key of ['base_digest', 'run_state', 'norm_index_digest']) {
    if (!isText(u[key])) p.push(at(`\`${key}\`: ${fieldWhy(u, key)}`));
  }
  if (isText(u.run_state) && !['complete', 'incomplete'].includes(u.run_state)) {
    p.push(at(`\`run_state\`: ismeretlen állapot (\`${u.run_state}\`) — csak \`complete\` vagy \`incomplete\``));
  }
  for (const key of ['base_gate_ok', 'attacks_ok', 'slice_clean', 'portable', 'evidence_bound']) {
    if (!isBool(u[key])) p.push(at(`\`${key}\`: ${fieldWhy(u, key)}`));
  }
  for (const key of ['mutation_ids', 'mutation_results', 'norm_chain', 'evidence_unbound']) {
    if (!Array.isArray(u[key])) p.push(at(`\`${key}\`: ${fieldWhy(u, key)}`));
  }
  if (Array.isArray(u.mutation_ids) && !u.mutation_ids.every(isText)) {
    p.push(at('`mutation_ids`: minden elemnek nem üres szövegnek kell lennie'));
  }
  if (!isPlainObject(u.counts)) p.push(at(`\`counts\`: ${fieldWhy(u, 'counts')}`));
  else {
    for (const k of ['measured', 'caught', 'survived', 'wrong', 'harness', 'stale']) {
      if (!isCount(u.counts[k])) p.push(at(`\`counts.${k}\`: ${fieldWhy(u.counts, k)}`));
    }
  }
  if (!isPlainObject(u.wall) || !isCount(u.wall.ms)) p.push(at('`wall.ms`: hiányzik vagy nem nemnegatív egész'));
  if (!isPlainObject(u.norm_required) || !Array.isArray(u.norm_required.clauses)
    || !isText(u.norm_required.expected_state) || !isText(u.norm_required.version)) {
    p.push(at('`norm_required`: hiányzik vagy nem teljes (`version` · `expected_state` · `clauses`)'));
  }
  if (!isPlainObject(u.norm_contract) || !isText(u.norm_contract.version) || !isText(u.norm_contract.digest)) {
    p.push(at('`norm_contract`: hiányzik vagy nem teljes (`version` · `digest`)'));
  }
  if (!isBool(u.norm_integrity_ok)) p.push(at(`\`norm_integrity_ok\`: ${fieldWhy(u, 'norm_integrity_ok')}`));
  return p;
}

/** A RÉSZLETES EREDMÉNY SÉMÁJA ÉS ÖNELLENTMONDÁS-SZEMLÉJE. */
function resultProblems(r, i, { file, today }) {
  const p = [];
  const at = (m) => `[${file}] a ${i + 1}. részletes eredmény: ${m}`;
  if (!isPlainObject(r)) return [at('nem objektum')];
  const id = isText(r.mutation_id) ? r.mutation_id : '(azonosító nélkül)';
  const on = (m) => `[${file}] ${id}: ${m}`;
  if (!isText(r.mutation_id)) p.push(at('nincs `mutation_id`'));
  if (r.applied !== true) p.push(on('a mutáció alkalmazása nincs igazolva (`applied` ≠ true)'));
  if (!isText(r.base_digest)) p.push(on(`\`base_digest\`: ${fieldWhy(r, 'base_digest')}`));
  else if (r.base_digest !== today) p.push(on(`az ALAP-lenyomat IDEGEN (${r.base_digest} ≠ a MA mért ${today})`));
  if (!isText(r.mutated_digest)) p.push(on(`\`mutated_digest\`: ${fieldWhy(r, 'mutated_digest')}`));
  else if (r.mutated_digest === r.base_digest) p.push(on('a mutált forrás lenyomata AZONOS az alapéval — a szerkesztés nem történt meg'));
  if (!isText(r.run_token)) p.push(on(`\`run_token\`: ${fieldWhy(r, 'run_token')} — nem eldönthető, MELYIK futás eredménye`));
  if (!isText(r.probe_id)) p.push(on(`\`probe_id\`: ${fieldWhy(r, 'probe_id')}`));
  if (!isText(r.catcher)) p.push(on(`\`catcher\`: ${fieldWhy(r, 'catcher')}`));
  else if (isText(r.probe_id) && r.catcher !== r.probe_id) {
    p.push(on(`a nevezett elkapó és a mért próba KÜLÖNBÖZIK (${r.catcher} ≠ ${r.probe_id})`));
  }
  if (!Array.isArray(r.failed_assertions)) p.push(on(`\`failed_assertions\`: ${fieldWhy(r, 'failed_assertions')}`));
  if (!isText(r.verdict)) p.push(on(`\`verdict\`: ${fieldWhy(r, 'verdict')}`));
  else if (!VERDICTS.includes(r.verdict)) p.push(on(`ISMERETLEN verdikt: \`${r.verdict}\` — a szókészlet: ${VERDICTS.join(' · ')}`));
  // ÖNELLENTMONDÁS. A nevezett próba ÁTMENT — akkor nem kapott el semmit. (A megfordítottja NEM
  // szabály: a `runtime_error` szerződésű mutáció CAUGHT verdikttel, de ÜRES `failed_assertions`
  // listával jogos — a valódi adatunkon mérve. KUKA-049: az őr ne a kért eredményt jelentse hibának.)
  if (r.verdict === 'CAUGHT' && r.probe_status === 'PASS') {
    p.push(on('ELLENTMONDÁS: a verdikt `CAUGHT`, de a nevezett próba `PASS` — átment próba nem kap el semmit'));
  }
  return p;
}

/** (2)+(3) A BIJEKCIÓ ÉS AZ ÖSSZESÍTŐK — A RÉSZLETES EREDMÉNYBŐL. */
function measureUnit(u, { file, today }) {
  const problems = [];
  const details = Array.isArray(u.mutation_results) ? u.mutation_results : [];
  for (const [i, r] of details.entries()) problems.push(...resultProblems(r, i, { file, today }));

  const declared = Array.isArray(u.mutation_ids) ? u.mutation_ids : [];
  const declaredSet = new Set(declared);
  const seen = new Map();
  for (const r of details) if (isPlainObject(r) && isText(r.mutation_id)) seen.set(r.mutation_id, (seen.get(r.mutation_id) || 0) + 1);

  const dupDetail = [...seen.entries()].filter(([, c]) => c > 1).map(([id, c]) => `${id}×${c}`);
  const foreign = [...seen.keys()].filter((id) => !declaredSet.has(id));
  const unmeasured = declared.filter((id) => !seen.has(id));
  if (dupDetail.length) problems.push(`[${file}] ugyanarra a mutációra TÖBB részletes eredmény: ${dupDetail.join(', ')}`);
  if (foreign.length) problems.push(`[${file}] a részletes eredmény olyan mutációról szól, amit az egység nem jelentett be: ${foreign.join(', ')}`);
  if (unmeasured.length) {
    // A BEJELENTETT, DE NEM MÉRT MUTÁCIÓ. Egyetlen jogos alakja van: az ELAVULT HORGONY, ami
    // verdiktet ad, de falszifikációs bizonyítékot fogalmilag nem — és azt a beadott `stale`
    // számnak PONTOSAN meg kell magyaráznia. Minden más esetben a beadvány többet állít, mint
    // amennyit mért (R81/F01a: 92 bejelentett azonosító NULLA részletes eredmény mellett).
    const stale = isPlainObject(u.counts) && isCount(u.counts.stale) ? u.counts.stale : null;
    if (stale === null || stale !== unmeasured.length) {
      problems.push(`[${file}] BEJELENTETT, de nem mért mutáció (${unmeasured.length}): ${unmeasured.slice(0, 8).join(', ')}`
        + `${unmeasured.length > 8 ? ' …' : ''} — a beadott elavult-horgony szám ${stale === null ? 'hiányzik' : `${stale}`}, `
        + 'tehát a hiányt nem magyarázza');
    }
  }

  // AZ ÖSSZESÍTŐ A RÉSZLETESBŐL SZÁMOLVA — és a beadotthoz mérve. Az ELTÉRÉS az akadály.
  const measured = { measured: details.length, caught: 0, survived: 0, wrong: 0, harness: 0, stale: 0 };
  const key = { CAUGHT: 'caught', SURVIVED: 'survived', WRONG_CATCHER: 'wrong', HARNESS_ERROR: 'harness', STALE_ANCHOR: 'stale' };
  for (const r of details) if (isPlainObject(r) && key[r.verdict]) measured[key[r.verdict]] += 1;
  // Az elavult horgony verdiktet ad, részletes eredményt nem — a bejelentett szám ezért a mérthez
  // ADÓDIK, nem helyettesíti (a `measured` a TÉNYLEGESEN mért mutációk száma).
  const declaredStale = isPlainObject(u.counts) && isCount(u.counts.stale) ? u.counts.stale : 0;
  const expectMeasured = details.length + declaredStale;
  if (isPlainObject(u.counts)) {
    const diffs = [];
    if (isCount(u.counts.measured) && u.counts.measured !== expectMeasured) {
      diffs.push(`measured: bejelentve ${u.counts.measured}, a részletesből ${expectMeasured}`);
    }
    for (const k of ['caught', 'survived', 'wrong', 'harness']) {
      if (isCount(u.counts[k]) && u.counts[k] !== measured[k]) diffs.push(`${k}: bejelentve ${u.counts[k]}, mérve ${measured[k]}`);
    }
    if (diffs.length) problems.push(`[${file}] ELLENTMONDÁS a bejelentett és a részletesből mért számok között — ${diffs.join(' · ')}`);
  }

  // A TISZTASÁG IS MÉRVE, NEM ÁTVÉVE. Ami a részletesben túlélt/rossz próbát/mérőhibát mutat, az
  // nem lehet „tiszta szelet", akárhogy is nevezi magát a beadvány.
  const dirty = measured.survived + measured.wrong + measured.harness + declaredStale;
  if (u.slice_clean === true && dirty > 0) {
    problems.push(`[${file}] ELLENTMONDÁS: az egység TISZTÁNAK mondja magát, de a részletes eredményben `
      + `${measured.survived} túlélő · ${measured.wrong} rossz próba · ${measured.harness} mérőhiba · ${declaredStale} elavult horgony áll`);
  }
  if (u.run_state === 'complete' && unmeasured.length && declaredStale !== unmeasured.length) {
    problems.push(`[${file}] ELLENTMONDÁS: az egység VÉGIGFUTOTTNAK mondja magát, de ${unmeasured.length} bejelentett mutációról nincs eredménye`);
  }
  // A KÖTÉS-ÁLLÍTÁS ÖNMAGÁVAL IS ELLENTMONDHAT (R81 §4: „ne pusztán örökölt `evidence_bound: true`").
  if (u.evidence_bound === true && Array.isArray(u.evidence_unbound) && u.evidence_unbound.length) {
    problems.push(`[${file}] ELLENTMONDÁS: \`evidence_bound: true\`, miközben a kötetlen tételek listája nem üres (${u.evidence_unbound.join(', ')})`);
  }

  return { problems, details, declared, seen, measured, expectMeasured, clean: u.slice_clean === true && dirty === 0 };
}

/** (4) A MAI, RÖGZÍTETT SZERZŐDÉS A MÉRCE — nem a beadvány. */
function pinnedProblems(u, { file, pinned }) {
  const p = [];
  const req = isPlainObject(u.norm_required) ? u.norm_required : null;
  if (req && Array.isArray(req.clauses)) {
    const want = pinned.required.clauses;
    if (JSON.stringify([...req.clauses].sort()) !== JSON.stringify([...want].sort())) {
      p.push(`[${file}] a beadott KÖTELEZŐ KÉSZLET eltér a mai szerződéstől — beadva: `
        + `[${req.clauses.join(', ') || '(üres)'}] · a mai (${pinned.required.version}): [${want.join(', ')}]`);
    }
    if (isText(req.version) && req.version !== pinned.required.version) {
      p.push(`[${file}] a beadott kötelező készlet VERZIÓJA eltér a maitól (${req.version} ≠ ${pinned.required.version})`);
    }
    if (isText(req.expected_state) && req.expected_state !== pinned.required.expected_state) {
      p.push(`[${file}] a beadott ELVÁRT ÁLLAPOT eltér a maitól (${req.expected_state} ≠ ${pinned.required.expected_state})`);
    }
  }
  const ct = isPlainObject(u.norm_contract) ? u.norm_contract : null;
  if (ct) {
    if (isText(ct.digest) && ct.digest !== pinned.contract.digest) {
      p.push(`[${file}] a beadott SZERZŐDÉS-LENYOMAT eltér a maitól (${ct.digest} ≠ ${pinned.contract.digest})`);
    }
    if (isText(ct.version) && ct.version !== pinned.contract.version) {
      p.push(`[${file}] a beadott szerződés-VERZIÓ eltér a maitól (${ct.version} ≠ ${pinned.contract.version})`);
    }
  }
  if (isText(u.norm_index_digest) && u.norm_index_digest !== pinned.index_digest) {
    p.push(`[${file}] a beadott INDEX-LENYOMAT eltér a maitól (${u.norm_index_digest} ≠ ${pinned.index_digest})`);
  }
  return p;
}

/** A LÁNC-SOR FEDETTSÉGE A RÉSZLETES EREDMÉNYRE VISSZAVEZETVE (R81/F01b).
 *  Egy `covered` sor csak akkor marad fedett, ha a `falsified_by` mutációnak VAN részletes
 *  eredménye, `CAUGHT` verdikttel, UGYANAZON a próbán, és a sor állítás-azonosítóját a
 *  `failed_assertions` között hordozza. Enélkül a sor nem fedett — és ezt ki is mondjuk. */
export function chainBacking(rows, detailsById) {
  const problems = [];
  const backed = [];
  for (const c of rows) {
    if (c.result !== 'covered') continue;
    const r = detailsById.get(c.falsified_by);
    if (!r) {
      problems.push(`a FEDETT ${c.clause_id} → ${c.assertion_id} sort a(z) ${c.falsified_by || '(megnevezetlen)'} mutációra hivatkozva állítja, `
        + 'de arról NINCS részletes eredmény a beadványban');
      continue;
    }
    if (r.verdict !== 'CAUGHT') {
      problems.push(`a FEDETT ${c.clause_id} → ${c.assertion_id} sor mögött a(z) ${c.falsified_by} verdiktje \`${r.verdict}\`, nem \`CAUGHT\``);
      continue;
    }
    if (r.probe_id !== c.probe_id) {
      problems.push(`a FEDETT ${c.clause_id} sor a ${c.probe_id} próbáról szól, a(z) ${c.falsified_by} eredménye viszont a ${r.probe_id}-ről`);
      continue;
    }
    if (!Array.isArray(r.failed_assertions) || !r.failed_assertions.includes(c.assertion_id)) {
      problems.push(`a FEDETT ${c.clause_id} → ${c.assertion_id} sor mögött a(z) ${c.falsified_by} eredménye NEM ezt az állítást buktatta `
        + `(bukott: ${Array.isArray(r.failed_assertions) && r.failed_assertions.length ? r.failed_assertions.join(', ') : 'egy sem'})`);
      continue;
    }
    backed.push(c);
  }
  return { problems, backed };
}

/**
 * A KAPU. Beadott egység-fájlok → befogadható-e, és MI A MÉRT (nem bejelentett) igazságuk.
 *
 * @param {Array<{file:string}>} units  a beolvasott egység-fájlok (mindegyiken `file` a fájlnév)
 * @param {object} ctx
 *   - today        a MA mért forrás-lenyomat (az összefűzés maga méri, nem a beadványból veszi)
 *   - mutationIds  a mai regiszter MINDEN mutáció-azonosítója
 *   - pinned       { required: {version, clauses, expected_state}, contract: {version, digest}, index_digest }
 */
export function admitUnits(units, { today, mutationIds, pinned }) {
  const problems = [];
  const perUnit = [];
  const allDetails = [];
  const tokenOwner = new Map();

  for (const u of units) {
    const file = u.file || '(névtelen)';
    const schema = unitSchemaProblems(u, { file });
    problems.push(...schema);
    // A SÉMA-HIBÁS BEADVÁNYT NEM MÉRJÜK TOVÁBB: a mezői jelentéséről nem tudunk semmit, és a
    // ráépülő „mérés" a saját félreolvasásunkat igazolná vissza (KUKA-054).
    if (schema.length) { perUnit.push({ file, admitted: false }); continue; }
    // A FÁJLNÉV ÉS A BENNE ÁLLÓ EGYSÉG-JELÖLÉS EGYEZZEN. Ez az R81 P04 kontrolljának (duplikált
    // egység MÁS néven) az önálló, nevezett alakja: két különböző név ugyanarról az egységről.
    const m = /^unit-(\d+)-of-(\d+)\.json$/.exec(file);
    if (m && (Number(m[1]) !== u.unit.k || Number(m[2]) !== u.unit.n)) {
      problems.push(`[${file}] a fájlnév és a benne álló egység-jelölés KÜLÖNBÖZIK (${u.unit.k}/${u.unit.n})`);
    }
    problems.push(...pinnedProblems(u, { file, pinned }));
    const measured = measureUnit(u, { file, today });
    problems.push(...measured.problems);
    for (const r of measured.details) {
      if (!isPlainObject(r) || !isText(r.run_token)) continue;
      const prev = tokenOwner.get(r.run_token);
      if (prev) problems.push(`ugyanaz a futás-jel KÉT eredményen: ${prev} és ${file}/${r.mutation_id} (${r.run_token})`);
      else tokenOwner.set(r.run_token, `${file}/${r.mutation_id}`);
    }
    allDetails.push(...measured.details.filter(isPlainObject));
    perUnit.push({ file, admitted: true, ...measured });
  }

  // A LEFEDETTSÉG A RÉSZLETESBŐL. Ami nincs mérve, az nincs — akárhány azonosítót sorol fel a
  // beadvány (R81/F01a).
  const detailsById = new Map();
  const duplicated = [];
  for (const r of allDetails) {
    if (!isText(r.mutation_id)) continue;
    if (detailsById.has(r.mutation_id)) duplicated.push(r.mutation_id);
    else detailsById.set(r.mutation_id, r);
  }
  const missing = mutationIds.filter((id) => !detailsById.has(id));
  const unknown = [...detailsById.keys()].filter((id) => !mutationIds.includes(id));
  if (missing.length) problems.push(`HIÁNYZÓ mutáció — nincs RÉSZLETES eredménye (${missing.length}): ${missing.join(', ')}`);
  if (duplicated.length) problems.push(`DUPLIKÁLT mutáció-eredmény: ${[...new Set(duplicated)].join(', ')}`);
  if (unknown.length) problems.push(`ISMERETLEN mutáció az egységekben: ${unknown.join(', ')}`);
  if (!units.length) problems.push('NINCS egység-fájl — a `--merge` nem tud mit összefűzni');

  return {
    ok: problems.length === 0,
    problems,
    units: perUnit,
    details: allDetails,
    detailsById,
    coverage: { expected: mutationIds.length, seen: detailsById.size, missing, duplicated: [...new Set(duplicated)], unknown },
    counts: ['caught', 'survived', 'wrong', 'harness'].reduce((a, k) => {
      a[k] = perUnit.reduce((s, u) => s + (u.measured ? u.measured[k] : 0), 0); return a;
    }, { measured: perUnit.reduce((s, u) => s + (u.measured ? u.measured.measured : 0), 0) }),
  };
}
