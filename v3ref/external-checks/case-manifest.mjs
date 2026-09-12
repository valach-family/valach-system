/** EXT-02 — A KÜLSŐ ELLENŐRZŐ PROGRAMOK ESET-MANIFESZTJE ÉS AZ EREDMÉNY-SZEMLE (R59/F02).
 *
 * MIÉRT SZÜLETETT. Az R58-ban leszállított futtató (EXT-01) azt kérdezte meg egy programtól, hogy
 * „amit visszaadtál, abban minden eset `pass`-e?". A külső fél E08 esete megmutatta, mi hiányzik
 * ebből: kicserélte a programot egy csonkra, ami EGYETLEN `{id:'T01',pass:true}` sort ír ki — és a
 * futtató MEGFELEL-t mondott. Kilenc DARAB `T01` sorra ugyanúgy. A futtató tehát nem tudta, MIT
 * kellett volna mérni, csak azt nézte, hogy amit kapott, az zöld-e.
 *
 * A HIBA OSZTÁLYA. Ez a KUKA-051 alakja a futtatón: a mérés hatóköre a BEMENETBŐL származott, nem
 * SZABÁLYBÓL. Aki a bemenetből veszi az elvárást, azt a bemenet bármikor átverheti — a nyolc
 * hiányzó eset nem hibaként, hanem NEM LÉTEZŐKÉNT jelenik meg (KUKA-012 a mérőn). És mert a
 * futtató a lánc VÉGE (a söprés és a külső fél ezt olvassa), a hazugsága a legdrágább.
 *
 * A MEGOLDÁS ALAKJA. Minden program mellé oda kell írni, MELY ESETEKET kell hoznia — pontos
 * azonosítóval —, és a futtató a KAPOTT listát ehhez méri, MINDKÉT IRÁNYBAN (KUKA-039):
 *   · HIÁNYZÓ eset      → a program nem futott végig, vagy kicserélték;
 *   · ISMERETLEN eset   → nem az a program felelt, amit hívtunk;
 *   · DUPLIKÁLT eset    → egy eredmény többször számolva „teljesnek" látszó listát ad;
 *   · ROSSZ ALAKÚ eset  → `pass` nem logikai érték / nincs azonosító / hiba-nyom van benne.
 *
 * HONNAN JÖN AZ ELVÁRT LISTA. NEM egy lefutásból (az önmagát igazolná vissza — KUKA-054), hanem a
 * program KÍSÉRŐ SZÖVEGÉBŐL: a külső fél a boardon minden körben kiírja, mely eseteket futtat
 * (R57: „T01–T05 · E01–E04", R59: „P01 · P02 · E05–E09"), a két saját programunknál pedig a mi
 * korabeli körünk jegyzőkönyve. Ezért a lista mellé oda van írva a FORRÁSA is.
 *
 * A RÉSZLEGES FUTÁS NEM TELJES BIZONYÍTÉK. A `--only` legitim (egy programot gyorsan újrafuttatni),
 * de az eredménye SOHA nem a teljes lánc bizonyítéka. A gépi kimenet ezért `scope`-ot visz, és a
 * képernyő kimondja — a néma részleges futás ugyanaz a hazugság, mint a néma üres lista.
 */

/** A programok — KI ÍRTA, MIT MÉR, és PONTOSAN MELY ESETEKET kell hoznia. */
export const PROGRAMS = Object.freeze([
  Object.freeze({
    id: 'r61',
    file: 'r61_chatgpt-v3.mjs',
    by: 'chatgpt-v3 — KÜLSŐ, független fél',
    origin: 'R61 (változatlanul, ahogy a boardon érkezett)',
    what: 'P03 pozitív ellenpár · R01–R03: a bizonyíték-hivatkozás tényleges FELOLDÁSA és a részletes '
      + 'eredmény-artefaktum kötelezősége',
    evidence: 'r60-challenge.json',
    cases: Object.freeze(['P03', 'R01', 'R02', 'R03']),
    cases_source: 'a külső fél R61-es kísérő lapja (§8 esetkészlet)',
    evidence_pin_field: 'pin',
  }),
  Object.freeze({
    id: 'r59',
    file: 'r59_chatgpt-v3.mjs',
    by: 'chatgpt-v3 — KÜLSŐ, független fél',
    origin: 'R59 (változatlanul, ahogy a boardon érkezett)',
    what: 'P01 · P02 pozitív ellenpár · E05–E09: az elvárás-séma, az eredmény-séma, a futtató és a '
      + 'jóváhagyás-rekord megkerülhetősége',
    evidence: 'r58-challenge.json',
    cases: Object.freeze(['P01', 'E05', 'E06', 'E07', 'E08', 'P02', 'E09']),
    cases_source: 'a külső fél R59-es kísérő lapja (§2 esetlista)',
    evidence_pin_field: 'pin',
  }),
  Object.freeze({
    id: 'r57',
    file: 'r57_chatgpt-v3.mjs',
    by: 'chatgpt-v3 — KÜLSŐ, független fél',
    origin: 'R57 (változatlanul, ahogy a boardon érkezett)',
    what: 'T01–T05: az R56-ban tett pecsét-állítások · E01–E04: a bizonyíték-kapu megkerülhetősége',
    evidence: 'r56-challenge.json',
    cases: Object.freeze(['T01', 'T02', 'T03', 'T04', 'T05', 'E01', 'E02', 'E03', 'E04']),
    cases_source: 'a külső fél R57-es kísérő lapja („T01–T05 · E01–E04")',
    evidence_pin_field: 'pin',
  }),
  Object.freeze({
    id: 'r55',
    file: 'r55_restated.mjs',
    by: 'Claude-v3 — a SAJÁT sávunk (önvizsgálat)',
    origin: 'R56',
    what: 'az R55 öt esete újrafogalmazva a mai szerződésre, mindegyikhez ellenpárral',
    evidence: 'restated.json',
    cases: Object.freeze(['C11-restated', 'N10-restated', 'F01-restated', 'N04-restated', 'D01-restated']),
    cases_source: 'az R56-os körünk jegyzőkönyve (az R55 öt esete)',
    evidence_pin_field: 'source_commit',
  }),
  Object.freeze({
    id: 'r53',
    file: 'r53_f03_restated.mjs',
    by: 'Claude-v3 — a SAJÁT sávunk (önvizsgálat)',
    origin: 'R54',
    what: 'az R53/F03 támadás egyenértékű alakja (G01) + érintetlen ellenpár (G02)',
    evidence: 'f03-restated.json',
    cases: Object.freeze(['G01', 'G02']),
    cases_source: 'az R54-es körünk jegyzőkönyve (támadás + ellenpár)',
    evidence_pin_field: 'pin',
  }),
]);

/**
 * EGY ESET ALAKJA. A `pass` SZIGORÚAN logikai: a „truthy" elfogadás (`'igen'`, `1`, `{}`) épp azt
 * a rést nyitná, amit az egész manifeszt zár (KUKA-020 az eredmény-sémán).
 */
export function caseShape(c, at) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return `${at}: az eset nem objektum`;
  if (typeof c.id !== 'string' || !c.id.trim()) return `${at}: az esetnek nincs azonosítója`;
  if (typeof c.pass !== 'boolean') {
    return `${at} (${c.id}): a \`pass\` nem logikai érték (${c.pass === undefined ? 'HIÁNYZIK' : typeof c.pass})`;
  }
  if (c.test_error) return `${at} (${c.id}): az eset HIBÁVAL futott — ${String(c.test_error).split('\n')[0]}`;
  return null;
}

/**
 * A KAPOTT ESETLISTA SZEMLÉJE a program manifesztjéhez mérve. MINDKÉT IRÁNY.
 *
 * @returns {{ok: boolean, problems: string[], present: string[], missing: string[], unknown: string[], duplicate: string[], failed: string[]}}
 */
export function auditCases(program, cases) {
  const problems = [];
  const want = Array.isArray(program && program.cases) ? program.cases : [];

  // A MANIFESZT MAGA IS MÉRENDŐ: elvárás nélkül a szemle ugyanazt a felmentést adná, mint amit
  // meg akar szüntetni (a hiány nem lehet megengedő — R59/F01 elve a futtatón).
  if (want.length === 0) {
    problems.push(`[${program && program.id}] a programhoz NINCS eset-manifeszt — mérce nélkül az eredmény nem ítélhető meg`);
  }
  if (new Set(want).size !== want.length) {
    problems.push(`[${program.id}] a MANIFESZT maga tartalmaz ismétlődő azonosítót`);
  }

  if (!Array.isArray(cases)) {
    problems.push(`[${program && program.id}] a program kimenete nem értelmezhető eset-listaként`);
    return {
      ok: false, problems, present: [], missing: [...want], unknown: [], duplicate: [], failed: [],
    };
  }

  const seen = new Map();
  for (const [i, c] of cases.entries()) {
    const bad = caseShape(c, `[${program.id}] ${i + 1}. eset`);
    if (bad) { problems.push(bad); continue; }
    seen.set(c.id, (seen.get(c.id) || 0) + 1);
  }

  const present = [...seen.keys()];
  const duplicate = [...seen.entries()].filter(([, n]) => n > 1).map(([id, n]) => `${id}×${n}`);
  const missing = want.filter((id) => !seen.has(id));
  const unknown = present.filter((id) => !want.includes(id));
  const failed = cases
    .filter((c) => c && typeof c === 'object' && (c.pass !== true || c.test_error))
    .map((c) => (c && c.id) || '(azonosító nélkül)');

  if (missing.length) {
    problems.push(`[${program.id}] HIÁNYZÓ eset: ${missing.join(' · ')} — a program nem futott végig, `
      + 'vagy nem az futott, amit hívtunk');
  }
  if (unknown.length) {
    problems.push(`[${program.id}] a manifesztben NEM SZEREPLŐ eset: ${unknown.join(' · ')}`);
  }
  if (duplicate.length) {
    problems.push(`[${program.id}] DUPLIKÁLT eset: ${duplicate.join(' · ')} — az ismétlés „teljesnek" `
      + 'láttat egy hiányos listát');
  }
  if (failed.length) problems.push(`[${program.id}] ELBUKOTT eset: ${[...new Set(failed)].join(' · ')}`);

  return { ok: problems.length === 0, problems, present, missing, unknown, duplicate, failed };
}

/**
 * A RÉSZLETES EREDMÉNY-ARTEFAKTUM KÖTELEZŐ (R61/F02, az ő R03 esetük).
 *
 * MIÉRT SZÜLETETT. Az R60-as futtató a részletes eredményfájlt csak AKKOR olvasta, ha létezett —
 * különben visszaesett a szabvány kimenetre, és az `ok`/`complete_evidence` ezt nem bánta. A külső
 * fél mind a négy gyermek-programot olyan csonkra cserélte, ami az ÖSSZES elvárt azonosítóra kiír
 * egy `{id, pass:true}` sort, de nem futtat semmit és nem ír részletes fájlt. Az összesítő
 * `{"ok":true,"complete_evidence":true,"green":4,"of":4}` eredménnyel, 0 kilépéssel zárt, miközben
 * mind a négy program `saved` értéke `null` volt.
 *
 * A HIBA OSZTÁLYA. Ugyanaz, amit a KUKA-108-ban javítottam, harmadszor, egy ÚJ helyen: a szabály
 * feltételes volt ahhoz képest, amit védeni kell („ha van fájl, azt olvasom"). A megkerülése egy
 * NEM-ÍRÁS. És a szabvány kimenet mint tartalék épp a legerősebb bizonyítékot cserélte le a
 * leggyengébbre — némán (KUKA-049 rokona: a tartalék mérce nem veheti fel a pontos tanú nevét).
 *
 * MIT NEM ÁLLÍT EZ A JAVÍTÁS. A fájl LÉTEZÉSE nem bizonyítja egy rosszindulatú gyermek-program
 * őszinteségét — ezt a külső fél maga is kimondta, és mi sem állítjuk. Ez a javítás az ÁTADHATÓSÁGI
 * szerződést zárja: a részletes eredmény kötelező, a futáshoz kötött, és a szabvány kimenet
 * DIAGNOSZTIKA marad, nem bizonyíték.
 *
 * @returns {{ok: boolean, problems: string[], present: boolean, pin: string|null}}
 */
export function auditEvidenceArtifact(program, { exists, parsed, expectedCommit, stdoutCases }) {
  const problems = [];
  const id = (program && program.id) || '(névtelen)';
  const wantFile = program && program.evidence;

  if (!wantFile) {
    problems.push(`[${id}] a manifeszt nem nevezi meg a kötelező eredmény-artefaktumot`);
    return { ok: false, problems, present: false, pin: null };
  }
  if (!exists) {
    problems.push(`[${id}] HIÁNYZIK a részletes eredmény-artefaktum (evidence/${wantFile}) — a szabvány `
      + 'kimenet DIAGNOSZTIKA, nem bizonyíték: részletes eredmény nélkül a futás nem igazolható');
    return { ok: false, problems, present: false, pin: null };
  }
  if (!parsed || typeof parsed !== 'object') {
    problems.push(`[${id}] a részletes eredmény-artefaktum nem értelmezhető JSON-objektum (evidence/${wantFile})`);
    return { ok: false, problems, present: true, pin: null };
  }

  // A FUTÁS-KÖTÉS: a fájl mondja meg, MELYIK forrás-állapoton készült. Az idegen vagy elavult
  // kötés ugyanolyan baj, mint a hiányzó fájl — csak alattomosabb.
  const field = program.evidence_pin_field;
  let pin = null;
  if (typeof field !== 'string' || !field.trim()) {
    problems.push(`[${id}] a manifeszt nem nevezi meg, MELYIK mező hordozza a futás-kötést `
      + '(evidence_pin_field) — kötés nélkül nem eldönthető, hogy a fájl EHHEZ a futáshoz tartozik');
  } else if (!Object.prototype.hasOwnProperty.call(parsed, field)) {
    problems.push(`[${id}] a részletes eredményből HIÁNYZIK a futás-kötés (${field})`);
  } else if (typeof parsed[field] !== 'string' || !parsed[field].trim()) {
    problems.push(`[${id}] a futás-kötés (${field}) nem nem-üres szöveg`);
  } else {
    pin = parsed[field];
    if (expectedCommit && pin !== expectedCommit) {
      problems.push(`[${id}] a részletes eredmény IDEGEN forrás-állapothoz kötött (${pin} ≠ ${expectedCommit}) `
        + '— egy korábbi vagy másik futás fájlja nem bizonyítja a mostanit');
    }
  }

  // A FÁJL AZ ERŐSEBB TANÚ: ha a szabvány kimenet MÁST mond, a csomag nem hiányos, hanem
  // ELLENTMOND — és ezt külön kell kimondani (KUKA-020).
  const fileCases = Array.isArray(parsed.cases) ? parsed.cases : (Array.isArray(parsed) ? parsed : null);
  if (Array.isArray(stdoutCases) && Array.isArray(fileCases)) {
    const onFile = new Map(fileCases.filter((c) => c && typeof c.id === 'string').map((c) => [c.id, c.pass === true]));
    const drift = stdoutCases
      .filter((c) => c && typeof c.id === 'string' && onFile.has(c.id) && onFile.get(c.id) !== (c.pass === true))
      .map((c) => c.id);
    if (drift.length) {
      problems.push(`[${id}] a szabvány kimenet és a részletes eredmény ELLENTMOND egymásnak: ${drift.join(' · ')}`);
    }
  }

  return { ok: problems.length === 0, problems, present: true, pin };
}

/**
 * A FUTÁS HATÓKÖRE — kimondva. A `--only` legitim, de a részleges futás nem a lánc bizonyítéka.
 */
export function runScope(selectedIds, allIds) {
  const complete = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
  return Object.freeze({
    complete,
    scope: complete ? 'full' : 'partial',
    ran: [...selectedIds],
    skipped: allIds.filter((id) => !selectedIds.includes(id)),
    why: complete
      ? 'MINDEN nyilvántartott program lefutott — ez a lánc teljes bizonyítéka'
      : 'RÉSZLEGES futás (--only): ez NEM a lánc teljes bizonyítéka, csak a megnevezett programé',
  });
}
