#!/usr/bin/env node
/**
 * NCP-01 — A NORMA-LÁNC ÖNÁLLÓAN VISSZAELLENŐRIZHETŐ CSOMAGJA (R35 §3).
 *
 * MIÉRT. A tárgyaló fél a 20 klauzula és a láncsoraik VÉGSŐ forrásállapotához EGYETLEN csomagot
 * kért, soronként: megnevezett FORRÁS · MŰKÖDÉS · POZITÍV és NEGATÍV próba · MUTÁCIÓ · MARADÉK
 * HATÓKÖR. Kézzel írva ez a lap az első módosításnál elcsúszna a kódtól (KUKA-082: amit kézzel
 * írunk egy gépi állományból, azt a GÉPNEK kell visszamérnie), ezért a csomag SZÁRMAZTATOTT: a
 * szerződésből (`normContract.mjs`), a normákból (`norms.mjs`), a manifesztből (`manifest.mjs`), a
 * mutáció-katalógusból (`mutations.mjs`) és a MÉRT mutációs eredményből.
 *
 * AMIT A CSOMAG NEM ÁLLÍT (kimondva, KUKA-033). Nem mond tartalmi megfelelést: az OB-7 szerinti
 * emberi elbírálás a tárgyaló félé. A `content_review` oszlop ezért a MÉRT állapotot írja ki
 * (ma: 0/88), nem a szerző véleményét.
 *
 * PURE + INERT: nincs hálózat, nincs DB, nincs titok. Két kimenet, ugyanabból a futásból:
 *   docs/70_PLANNING/V3_R36_NORMA_LANC_CSOMAG.json   (gépi — ezt olvassa a következő kör)
 *   docs/70_PLANNING/V3_R36_NORMA_LANC_CSOMAG.md     (emberi — EBBŐL rajzolva, nem külön írva)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_NORMS, OPEN_BLOCKERS, CLOSED_BLOCKERS, USE_GATES, expectedChainRows, contentReviewState, NORM_CONTRACT_VERSION } from '../v3ref/norms.mjs';
import { EXPECTED_PROBES } from '../v3ref/manifest.mjs';
import { MUTATIONS } from '../v3ref/mutations.mjs';
import { contractRef, NORM_CONTRACT } from '../v3ref/normContract.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const measured = JSON.parse(readFileSync(join(ROOT, 'v3ref/v3ref-mutation-result.json'), 'utf8'));

const probeById = new Map(EXPECTED_PROBES.map((p) => [p.id, p]));
const clauseById = new Map();
for (const n of ALL_NORMS) for (const c of (n.clauses || [])) clauseById.set(c.id, { norm: n, clause: c });

// A MUTÁCIÓ A PRÓBÁHOZ KÖTŐDIK (`catcher`), nem az állításhoz — ezt KIMONDJUK, nem elmossuk.
// Ahol a MÉRT eredmény nevesíti a hamisra fordult állítást, ott az ERŐSEBB bizonyíték, és külön áll.
const byCatcher = new Map();
for (const m of MUTATIONS) {
  if (!byCatcher.has(m.catcher)) byCatcher.set(m.catcher, []);
  byCatcher.get(m.catcher).push(m);
}
const measuredByMutation = new Map((measured.mutation_results || []).map((r) => [r.mutation_id, r]));

const rows = expectedChainRows(EXPECTED_PROBES).map((row) => {
  const hit = clauseById.get(row.clause_id) || {};
  const clause = hit.clause || {};
  const probe = row.probe_id ? probeById.get(row.probe_id) : null;
  const muts = (byCatcher.get(row.probe_id) || []).map((m) => {
    const res = measuredByMutation.get(m.id);
    return {
      id: m.id, what: m.what, rule: m.rule,
      verdict: res ? res.verdict : null,
      names_this_assertion: !!(res && Array.isArray(res.failed_assertions) && res.failed_assertions.includes(row.assertion_id)),
    };
  });
  return {
    norm_id: row.norm_id,
    clause_id: row.clause_id,
    covers: clause.covers ? [...clause.covers] : [],
    clause_text: clause.text || null,
    // FORRÁS: melyik rögzített, mért forrásdokumentum mondja ki a klauzulát.
    source: clause.source || contractRef().source_document.name,
    assertion_id: row.assertion_id,
    probe_id: row.probe_id,
    behaviour: probe ? probe.title || probe.what || null : null,
    positive_evidence: row.probe_id ? `${row.probe_id} · node v3ref/run.mjs` : null,
    negative_evidence: muts.length
      ? `${muts.length} mutáció a próbára (npm run v3ref:mutate) — ebből ${muts.filter((m) => m.names_this_assertion).length} nevesíti EZT az állítást`
      : null,
    mutations: muts,
    residual_scope: clause.gap || null,
    result: row.assertion_id ? (clause.gap ? 'partially_covered' : 'covered') : 'no_evidence',
    content_review: contentReviewState(clause, [], null).state || 'not_reviewed',
  };
});

const pkg = {
  schema: 'v3-norm-chain-package/1',
  id: 'NCP-01',
  at: new Date().toISOString(),
  contract: { id: NORM_CONTRACT.id, version: NORM_CONTRACT_VERSION, digest: contractRef().digest },
  amendments: (NORM_CONTRACT.amendments || []).map((a) => ({ id: a.id, scope: a.scope, source: a.source_document || a.artifact })),
  totals: {
    norms: ALL_NORMS.length,
    clauses: clauseById.size,
    chain_rows: rows.length,
    covered: rows.filter((r) => r.result === 'covered').length,
    partially_covered: rows.filter((r) => r.result === 'partially_covered').length,
    no_evidence: rows.filter((r) => r.result === 'no_evidence').length,
    content_reviewed: rows.filter((r) => r.content_review === 'reviewed').length,
  },
  open_blockers: OPEN_BLOCKERS.map((b) => ({ id: b.id, title: b.title })),
  closed_blockers: CLOSED_BLOCKERS.map((b) => ({ id: b.id, title: b.title, closed_in: b.closed_in, guard: b.guard, residual: b.residual })),
  use_gates: USE_GATES.map((g) => ({ id: g.id, title: g.title, closed_until: g.closed_until,
    not_authorized: g.what_the_green_reference_does_not_authorize, source: g.source })),
  stated_limits: [
    'A mutáció a PRÓBÁHOZ kötődik (`catcher`), nem az állításhoz. Ahol a MÉRT eredmény nevesíti a '
      + 'hamisra fordult állítást, az erősebb bizonyíték — a sor ezt külön jelzi.',
    'A `content_review` oszlop a MÉRT állapot, nem a szerző véleménye: a tartalmi elbírálás az OB-7 '
      + 'szerint a tárgyaló félé, és ma 0/88 soron áll.',
    'A `covered` annyit mond, hogy a klauzulához tartozik lefutott, falszifikált állítás — NEM azt, '
      + 'hogy a klauzula normatív tartalma maradéktalanul teljesül.',
  ],
  rows,
};

const outJson = join(ROOT, 'docs/70_PLANNING/V3_R36_NORMA_LANC_CSOMAG.json');
writeFileSync(outJson, `${JSON.stringify(pkg, null, 2)}\n`);

// ── A LAP A CSOMAGBÓL RAJZOLVA (KUKA-082) ───────────────────────────────────────────────────────
const esc = (t) => String(t == null ? '—' : t).replace(/\|/g, '\\|').replace(/\n+/g, ' ');
const md = [];
md.push('# A norma-lánc végső forrásállapota — önállóan visszaellenőrizhető csomag');
md.push('');
md.push('> **Sáv:** Claude-v3 · **Kör:** R36 · **Állapot:** lezárt');
md.push('');
md.push('**EZ A LAP SZÁRMAZTATOTT.** Egyetlen sorát sem gépeltük: a `npm run docs:norm-chain` (NCP-01)');
md.push('rajzolja a szerződésből, a normákból, a manifesztből, a mutáció-katalógusból és a MÉRT mutációs');
md.push('eredményből. A gépi alak a `V3_R36_NORMA_LANC_CSOMAG.json` — **a következő kör azt olvassa.**');
md.push('');
md.push(`**Szerződés:** ${pkg.contract.id} · verzió: \`${pkg.contract.version}\` · lenyomat: \`${String(pkg.contract.digest).slice(0, 26)}…\``);
md.push('');
md.push(`**Összesítő:** ${pkg.totals.norms} norma · ${pkg.totals.clauses} klauzula · ${pkg.totals.chain_rows} láncsor — `
  + `**${pkg.totals.covered} fedett** · ${pkg.totals.partially_covered} részben fedett · ${pkg.totals.no_evidence} bizonyíték nélkül · `
  + `**tartalmilag elbírálva: ${pkg.totals.content_reviewed}/${pkg.totals.chain_rows}** (OB-7 — ez a tárgyaló félé).`);
md.push('');
md.push('## Amit ez a csomag NEM állít');
md.push('');
for (const l of pkg.stated_limits) md.push(`- ${l}`);
md.push('');
md.push('## A láncsorok');
md.push('');
md.push('| klauzula | forrás | K-fedés | működés (próba) | pozitív | negatív / mutáció | maradék hatókör | eredmény |');
md.push('|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  md.push(`| **${r.clause_id}** (${r.norm_id}) | ${esc(r.source)} | ${r.covers.join('+') || '—'} `
    + `| ${esc(r.behaviour)} | ${esc(r.positive_evidence)} | ${esc(r.negative_evidence)} `
    + `| ${esc(r.residual_scope)} | ${r.result} |`);
}
md.push('');
md.push('## Nyitott blokkolók');
md.push('');
for (const b of pkg.open_blockers) md.push(`- **${b.id}** — ${b.title}`);
md.push('');
md.push('## Lezárt blokkolók — a lezárás jelével és a MARADÉKÁVAL');
md.push('');
for (const b of pkg.closed_blockers) {
  md.push(`- **${b.id}** — ${b.title}`);
  md.push(`  - lezárta: ${b.closed_in} · jel: ${String(b.guard).split(' — ')[0]}`);
  md.push(`  - **maradék:** ${b.residual}`);
}
md.push('');
md.push('## Használati kapuk — az elhalasztott követelmény NEM eltűnt követelmény');
md.push('');
for (const g of pkg.use_gates) {
  md.push(`- **${g.id}** — ${g.title}`);
  md.push(`  - zárva addig: ${g.closed_until}`);
  md.push(`  - amit a ZÖLD referencia NEM engedélyez: ${g.not_authorized}`);
  md.push(`  - forrás: ${g.source}`);
}
md.push('');
writeFileSync(join(ROOT, 'docs/70_PLANNING/V3_R36_NORMA_LANC_CSOMAG.md'), `${md.join('\n')}\n`);

console.log(`NCP-01 — ${pkg.totals.chain_rows} láncsor · ${pkg.totals.covered} fedett · `
  + `${pkg.totals.partially_covered} részben · ${pkg.totals.no_evidence} bizonyíték nélkül · `
  + `tartalmilag elbírálva ${pkg.totals.content_reviewed}`);
console.log(`  gépi: docs/70_PLANNING/V3_R36_NORMA_LANC_CSOMAG.json`);
console.log(`  lap:  docs/70_PLANNING/V3_R36_NORMA_LANC_CSOMAG.md`);
