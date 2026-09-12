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
    id: 'r59',
    file: 'r59_chatgpt-v3.mjs',
    by: 'chatgpt-v3 — KÜLSŐ, független fél',
    origin: 'R59 (változatlanul, ahogy a boardon érkezett)',
    what: 'P01 · P02 pozitív ellenpár · E05–E09: az elvárás-séma, az eredmény-séma, a futtató és a '
      + 'jóváhagyás-rekord megkerülhetősége',
    evidence: 'r58-challenge.json',
    cases: Object.freeze(['P01', 'E05', 'E06', 'E07', 'E08', 'P02', 'E09']),
    cases_source: 'a külső fél R59-es kísérő lapja (§2 esetlista)',
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
