#!/usr/bin/env node
/** OB-7 LEKÉPEZÉS-GENERÁTOR (R20) — klauzula → forrás → bizonyíték.
 *
 * MIT CSINÁL. Az OB-7 lezárási láncának HÉT lépéséből az ÖTÖT a REPÓBÓL veszi, nem emlékezetből:
 * a normaszöveget és a lenyomatot a normaregiszterből, a pozitív/negatív esetet és a mutációkat a
 * lánc-sorokból, a TÉNYLEGESEN megbukó állítást a mutációs eredményből. A maradék kettő (élethelyzet,
 * maradék hatókör) PRÓZA — azt a `docs/70_PLANNING/OB7_PROZA.json` hordozza, és a generátor CSAK
 * beilleszti: ami ott nincs, az itt `null`, nem kitalált mondat (KUKA-005 · KUKA-033).
 *
 * AMIT EZ NEM CSINÁL — KIMONDVA. Ez LEKÉPEZÉS, nem ELBÍRÁLÁS. A `content_review` mezőt nem írja és
 * nem is írhatja: azt a független fél (chatgpt-v3) rögzíti, a saját hitelesítésével (R57/F03). Egyetlen
 * klauzuláról sem állítja, hogy „teljesül" — azt mondja meg, MIT mér a lánc és MIT nem.
 *
 * MIÉRT GENERÁTOR, ÉS NEM KÉZZEL ÍRT LAP. A kézzel írt kivonat elcsúszik a gépi leltártól, és az
 * olvasó a lapot hiszi el (KUKA-082). Itt a számok és az azonosítók MINDIG a mai forrásból jönnek;
 * ha egy próba vagy mutáció eltűnik, a leképezés vele változik, nem marad halott hivatkozás.
 */
const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const { resolve, dirname, join } = require('node:path');

const ROOT = resolve(dirname(__filename), '..');
const norms = require(join(ROOT, 'v3ref/norms.mjs'));
const { MUTATIONS } = require(join(ROOT, 'v3ref/mutations.mjs'));
const RESULT = require(join(ROOT, 'v3ref/v3ref-mutation-result.json'));

const PROSE_PATH = join(ROOT, 'docs/70_PLANNING/OB7_PROZA.json');
const OUT_PATH = join(ROOT, 'docs/70_PLANNING/OB7_LEKEPEZES.json');

const prose = existsSync(PROSE_PATH) ? JSON.parse(readFileSync(PROSE_PATH, 'utf8')) : {};
const chain = RESULT.norm_evidence.chain;
const mutById = new Map(MUTATIONS.map((m) => [m.id, m]));
const resById = new Map(RESULT.mutation_results.map((r) => [r.mutation_id, r]));

// ── SOR-HORGONYOK: a hivatkozás fájl:sor alakban, a VALÓDI fájlból mérve ───────────────────────
const lineIndex = (file, needleOf) => {
  const lines = readFileSync(join(ROOT, file), 'utf8').split('\n');
  return (key) => {
    const needle = needleOf(key);
    const i = lines.findIndex((l) => l.includes(needle));
    return i < 0 ? null : `${file}:${i + 1}`;
  };
};
const probeAnchor = lineIndex('v3ref/run.mjs', (id) => `probe('${id}'`);
const mutAnchor = lineIndex('v3ref/mutations.mjs', (id) => `id: '${id}'`);
const probeTitle = (() => {
  const src = readFileSync(join(ROOT, 'v3ref/run.mjs'), 'utf8');
  return (id) => {
    const m = new RegExp(`probe\\('${id.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}',\\s*'([^']*)'`).exec(src);
    return m ? m[1] : null;
  };
})();

const rowsByClause = new Map();
for (const r of chain) {
  if (!rowsByClause.has(r.clause_id)) rowsByClause.set(r.clause_id, []);
  rowsByClause.get(r.clause_id).push(r);
}

const clauses = [];
const missingProse = [];
for (const norm of norms.ALL_NORMS) {
  for (const c of norm.clauses) {
    const rows = rowsByClause.get(c.id) || [];
    const p = prose[c.id] || null;
    if (!p) missingProse.push(c.id);

    // 4–6. lépés: a lánc-sorok, minden azonosító a mai forrásból feloldva
    const evidence = rows.map((r) => {
      const muts = (r.mutation_candidates || []).map((id) => {
        const m = mutById.get(id);
        const res = resById.get(id);
        return {
          mutation_id: id,
          known: Boolean(m),
          rule: m ? m.rule : null,
          what_it_changes: m ? m.what : null,        // a mutáció SAJÁT magyar leírása
          target_file: m ? `v3ref/${m.file}` : null,
          source_ref: mutAnchor(id),
          expect: m ? m.expect : null,
          // 6. lépés: a TÉNYLEGESEN megbukó állítás — CSAK ami az eredmény-állományban áll
          actually: res ? {
            catcher: res.catcher, probe_id: res.probe_id, probe_status: res.probe_status,
            failed_assertions: res.failed_assertions || [], verdict: res.verdict,
          } : null,
          is_falsifier: r.falsified_by === id,
        };
      });
      return {
        assertion_id: r.assertion_id,
        probe_id: r.probe_id,
        probe_title: r.probe_id ? probeTitle(r.probe_id) : null,
        probe_source_ref: r.probe_id ? probeAnchor(r.probe_id) : null,
        mutations: muts,
        falsified_by: r.falsified_by,
        evidence_limit: r.evidence_limit,
        result: r.result,
        why: r.why,
      };
    });

    const counts = { total: rows.length, covered: 0, partially_covered: 0, no_evidence: 0 };
    for (const r of rows) if (counts[r.result] !== undefined) counts[r.result] += 1;

    clauses.push({
      norm_id: norm.id,
      clause_id: c.id,
      // 1. lépés — a normaszöveg SZÓ SZERINT és a lenyomata
      norm_text_verbatim: c.text,
      norm_example_verbatim: norm.example,
      clause_digest: norms.clauseDigest ? norms.clauseDigest(c) : null,
      covers: c.covers || [],
      gap: c.gap || null,
      // 2–3. lépés — PRÓZA, a `null` itt HIÁNY, nem üresség
      life_situation: p ? p.life_situation : null,
      measured_property: p ? p.measured_property : null,
      // 4–6. lépés — gépi
      evidence,
      // 7. lépés — PRÓZA + a gépi korlátok
      residual_scope: p ? p.residual_scope : null,
      chain_rows: counts,
      // az ELBÍRÁLÁS nem a miénk
      content_review: null,
    });
  }
}

const doc = {
  schema: 'ob7-lekepezes/1',
  round: 'CMD-VS-300-002-002 R20',
  lane: 'Claude-v3',
  generated_from: {
    norms: 'v3ref/norms.mjs (ALL_NORMS)',
    chain: 'v3ref/v3ref-mutation-result.json → norm_evidence.chain',
    mutations: 'v3ref/mutations.mjs',
    mutation_results: 'v3ref/v3ref-mutation-result.json → mutation_results',
    prose: 'docs/70_PLANNING/OB7_PROZA.json',
    base_digest: RESULT.base_digest || null,
    norms_digest: norms.normsDigest ? norms.normsDigest() : null,
  },
  what_this_is:
    'KLAUZULA → FORRÁS → BIZONYÍTÉK leképezés az OB-7 lezárási láncának hét lépése szerint '
    + '(a feltételt a `norms.mjs` OB-7 `closes_when` mezője mondja ki). A hétből ÖT lépés a repóból '
    + 'van mérve, KETTŐ (élethelyzet · maradék hatókör) próza.',
  what_this_is_not:
    'NEM elbírálás. A `content_review` minden klauzulán `null`, mert azt CSAK a független fél '
    + 'rögzítheti (R18 §1 · R57/F03). Egyetlen sor sem állítja, hogy a klauzula „teljesül".',
  summary: {
    clauses: clauses.length,
    chain_rows: chain.length,
    chain_rows_by_result: chain.reduce((a, r) => { a[r.result] = (a[r.result] || 0) + 1; return a; }, {}),
    clauses_with_gap: clauses.filter((c) => c.gap).length,
    clauses_without_prose: missingProse,
    distinct_probes: [...new Set(chain.map((r) => r.probe_id).filter(Boolean))].length,
    distinct_falsifiers: [...new Set(chain.map((r) => r.falsified_by).filter(Boolean))].length,
    unresolved_mutation_ids: [...new Set(chain.flatMap((r) => r.mutation_candidates || []))].filter((id) => !mutById.has(id)),
    unresolved_probe_ids: [...new Set(chain.map((r) => r.probe_id).filter(Boolean))].filter((id) => !probeAnchor(id)),
  },
  clauses,
};

writeFileSync(OUT_PATH, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`OB-7 LEKÉPEZÉS: ${doc.summary.clauses} klauzula · ${doc.summary.chain_rows} lánc-sor · `
  + `${JSON.stringify(doc.summary.chain_rows_by_result)} · ${doc.summary.distinct_probes} próba · `
  + `${doc.summary.distinct_falsifiers} falszifikáló mutáció`);
if (doc.summary.unresolved_mutation_ids.length || doc.summary.unresolved_probe_ids.length) {
  console.error(`FEL NEM OLDOTT: mutáció ${doc.summary.unresolved_mutation_ids.join(',')} · `
    + `próba ${doc.summary.unresolved_probe_ids.join(',')}`);
  process.exit(1);
}
console.log(missingProse.length
  ? `PRÓZA HIÁNYZIK: ${missingProse.length} klauzula — ${missingProse.join(', ')}`
  : 'PRÓZA: mind a 20 klauzulán megvan');
console.log(`KIÍRVA: ${OUT_PATH.replace(`${ROOT}/`, '')}`);
