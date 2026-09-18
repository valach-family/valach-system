#!/usr/bin/env node
/**
 * NCP-01 — A NORMA-LÁNC ÖNÁLLÓAN VISSZAELLENŐRIZHETŐ CSOMAGJA (R35 §3 · JAVÍTVA R37/F37-01).
 *
 * MI VOLT A HIBA, ÉS MIÉRT SÚLYOS (a külső ellenőrző fél, chatgpt-v3, R37/F37-01 lelete). Az első
 * alak a `result` mezőt SAJÁT KEZŰLEG képezte: „ha van `assertion_id`, akkor `covered`, kivéve ha a
 * klauzulának van `gap`-je". Tehát a MÉRÉST nem is olvasta. Következmény, az ő ellenpéldájukkal
 * reprodukálva: a mutációs eredményfájl helyére `{"mutation_results":[]}` téve a generátor
 * **kilépés 0-val 78 fedett sort** írt ki — NULLA mutációs tanú mellett. A valóság a beadott
 * mérésben: **60 covered · 12 partially_covered · 6 not_falsified · 10 no_evidence**.
 *
 * Ez a KUKA-101 hibája (az összevonás határozottabb választ adott, mint a részei) és a KUKA-102-é
 * (a védelmet a TERMELŐNÉL kellett volna keresni, nem ott, ahol én állítom elő): a lánc kanonikus
 * ítélője a `checkNorms`, és annak a vetületét a `v3ref/mutate.mjs` KIÍRJA
 * (`norm_evidence.chain`) — ezt kell olvasni, nem újraszámolni.
 *
 * A MAI ALAK HÁROM SZABÁLYA:
 *   1. **EGY ÍTÉLŐ.** A `result` és a `why` KIZÁRÓLAG a mért `norm_evidence.chain`-ből jön. A
 *      generátor egyetlen sor minősítését sem képezi.
 *   2. **A KÖTÉS ELLENŐRZÖTT, NEM KIÍRT.** Szerződés-lenyomat · norma-index lenyomat · a sorhalmaz
 *      MINDKÉT irányban · az integritás-jelzés · a hivatkozott falszifikáló mutáció TÉNYLEGES
 *      jelenléte és ítélete. Bármelyik bukása NEVEZETT megállás, **nem** csendes csomag.
 *   3. **AMI NEM FELOLDHATÓ, AZ NEM MŰKÖDÉS-LEÍRÁS.** A `behaviour` a próba VALÓDI címe, a
 *      futtatóból kiolvasva; ha egyetlen próbáé sem oldható fel, a csomag nem születik meg.
 *
 * AMIT A CSOMAG NEM ÁLLÍT, KIMONDVA (KUKA-033): nem mond tartalmi megfelelést. Az OB-7 szerinti
 * emberi elbírálás a tárgyaló félé; a `content_review` oszlop a MÉRT állapotot írja, és a külső
 * döntés KÜLÖN tengely (`external_decision`), amit gépi hitelesítésként sem itt, sem máshol nem
 * kezelünk.
 *
 * PURE + INERT: nincs hálózat, nincs DB, nincs titok.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_NORMS, OPEN_BLOCKERS, CLOSED_BLOCKERS, USE_GATES, expectedChainRows, chainRowKey, NORM_CONTRACT_VERSION, indexDigest } from '../v3ref/norms.mjs';
import { EXPECTED_PROBES } from '../v3ref/manifest.mjs';
import { MUTATIONS } from '../v3ref/mutations.mjs';
import { contractRef, NORM_CONTRACT } from '../v3ref/normContract.mjs';
import { EXTERNAL_CLAUSE_DECISIONS, externalDecisionFor } from '../v3ref/externalDecisions.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MEASURED = join(ROOT, 'v3ref/v3ref-mutation-result.json');

const stop = (code, ...lines) => {
  console.error('NCP-01 — A CSOMAG NEM KÉSZÜLT EL, mert a bizonyíték-kötés nem ellenőrizhető:');
  for (const l of lines) console.error(`  · ${l}`);
  console.error('  A csomag SOHA nem születhet meg mért, kötött bizonyíték nélkül (R37/F37-01).');
  process.exit(code);
};

// ── (1) A MÉRT ÁLLOMÁNY ─────────────────────────────────────────────────────────────────────────
let measured;
try { measured = JSON.parse(readFileSync(MEASURED, 'utf8')); }
catch (e) { stop(2, `a mért állomány nem olvasható: ${MEASURED}`, String(e && e.message)); }

const ev = measured.norm_evidence;
if (!ev || !Array.isArray(ev.chain)) stop(2, 'a mért állományban nincs `norm_evidence.chain` — nincs mit vetíteni');
if (!Array.isArray(measured.mutation_results) || measured.mutation_results.length === 0) {
  stop(2, 'a mért állományban NULLA mutációs eredmény áll — bizonyíték nélkül nincs fedettség');
}

// ── (2) A KÖTÉS ELLENŐRZÉSE — MINDEN ÁGON, MINDKÉT IRÁNYBAN ─────────────────────────────────────
const problems = [];
const ref = contractRef();
if (!ev.contract || ev.contract.digest !== ref.digest) {
  problems.push(`a mérés MÁS szerződés-lenyomaton készült: mért=${ev.contract && ev.contract.digest} · mai=${ref.digest}`);
}
if (!ev.contract || ev.contract.version !== NORM_CONTRACT_VERSION) {
  problems.push(`a mérés MÁS szerződés-verzión készült: mért=${ev.contract && ev.contract.version} · mai=${NORM_CONTRACT_VERSION}`);
}
const idx = indexDigest();
if (ev.index_digest !== idx) problems.push(`a norma-index lenyomata eltér: mért=${ev.index_digest} · mai=${idx}`);
if (ev.integrity_ok !== true) {
  problems.push(`a mérés integritás-jelzése nem igaz (${JSON.stringify(ev.integrity_problems || null)})`);
}

// A SORHALMAZ MINDKÉT IRÁNYBAN (KUKA-039): hiányzó sor ÉS idegen sor is kötés-hiba.
const wantRows = expectedChainRows(EXPECTED_PROBES);
const wantKeys = new Set(wantRows.map(chainRowKey));
const gotKeys = new Set(ev.chain.map(chainRowKey));
const missing = [...wantKeys].filter((k) => !gotKeys.has(k));
const foreign = [...gotKeys].filter((k) => !wantKeys.has(k));
if (missing.length) problems.push(`${missing.length} VÁRT láncsor hiányzik a mérésből (első: ${missing[0]})`);
if (foreign.length) problems.push(`${foreign.length} IDEGEN láncsor áll a mérésben (első: ${foreign[0]})`);
if (gotKeys.size !== ev.chain.length) problems.push('ISMÉTLŐDŐ láncsor a mérésben — a kulcs nem egyedi');

// A MINŐSÍTÉS ZÁRT HALMAZ: ismeretlen szó nem csúszhat át „valaminek".
const ALLOWED = new Set(['covered', 'partially_covered', 'not_falsified', 'no_evidence']);
for (const r of ev.chain) {
  if (!ALLOWED.has(r.result)) problems.push(`ismeretlen minősítés a láncon: ${JSON.stringify(r.result)} (${r.clause_id})`);
}

// A HIVATKOZOTT FALSZIFIKÁLÓ MUTÁCIÓ TÉNYLEG LEFUTOTT, ÉS TÉNYLEG ELKAPTA (KUKA-038: a létezés nem
// bizonyíték arra, hogy fut). A `covered` sor `falsified_by` mezőjének VALÓDI, CAUGHT eredményre
// kell mutatnia — különben a fedettség egy nem létező tanún állna.
const byMutation = new Map(measured.mutation_results.map((m) => [m.mutation_id, m]));
const knownMutation = new Set(MUTATIONS.map((m) => m.id));
for (const r of ev.chain) {
  if (r.result !== 'covered') continue;
  const id = r.falsified_by;
  if (!id) { problems.push(`${r.clause_id}: „covered", de nincs megnevezett falszifikáló mutáció`); continue; }
  if (!knownMutation.has(id)) { problems.push(`${r.clause_id}: a falszifikáló ${id} nincs a mutáció-katalógusban`); continue; }
  const res = byMutation.get(id);
  if (!res) { problems.push(`${r.clause_id}: a falszifikáló ${id} NEM futott le ebben a mérésben`); continue; }
  if (res.verdict !== 'CAUGHT') problems.push(`${r.clause_id}: a falszifikáló ${id} ítélete ${res.verdict}, nem CAUGHT`);
  if (!(res.failed_assertions || []).includes(r.assertion_id)) {
    problems.push(`${r.clause_id}: a(z) ${id} NEM nevezi meg a sor állítását (${r.assertion_id})`);
  }
}

// ── (3) A MŰKÖDÉS-LEÍRÁS FELOLDHATÓ HIVATKOZÁS ──────────────────────────────────────────────────
// A próba CÍME egy helyen él: a futtatóban, a `probe(...)` harmadik argumentumában. Innen olvassuk
// ki, és MÉRJÜK, hogy mind a 54 feloldható, mindkét irányban. KIMONDOTT KORLÁT: ez forrás-olvasás,
// nem futásidejű regiszter — ha a `probe(` hívás alakja változik, ez a lépés NEVEZETTEN megáll
// (nem ad néma üres címet).
const runSrc = readFileSync(join(ROOT, 'v3ref/run.mjs'), 'utf8');
const titles = new Map();
// A KÉT ARGUMENTUM KÖZÖTT KOMMENT-BLOKK IS ÁLLHAT — ezt a saját őröm ELSŐ futása mutatta meg
// (`P-NORM-evidence`, ahol négy magyarázó sor áll a leképezés és a cím között). A cím tehát nem
// egy merev alakzat, hanem a KÉT nyitó szöveg-literál KÖZÜL A MÁSODIK, a törzs (`() =>`) előtt.
for (const m of runSrc.matchAll(/^probe\(\s*'([^']+)'\s*,/gm)) {
  const id = m[1];
  const head = runSrc.slice(m.index, runSrc.indexOf('() =>', m.index));
  const lits = [];
  for (const l of head.matchAll(/'((?:[^'\\]|\\.)*)'/g)) lits.push(l[1]);
  // [0] az azonosító · [1] a leképezés · [2] a CÍM. Ha nincs harmadik, NEM találgatunk.
  if (lits.length >= 3) titles.set(id, lits[2].replace(/\\'/g, "'"));
}
const probeIds = new Set(EXPECTED_PROBES.map((p) => p.id));
const unresolved = [...probeIds].filter((id) => !titles.has(id));
const strayTitles = [...titles.keys()].filter((id) => !probeIds.has(id));
if (unresolved.length) problems.push(`${unresolved.length} próba CÍME nem oldható fel a futtatóból (első: ${unresolved[0]})`);
if (strayTitles.length) problems.push(`${strayTitles.length} futtatóbeli próba NINCS a manifesztben (első: ${strayTitles[0]})`);

if (problems.length) stop(3, ...problems);

// ── (4) A VETÜLET — A MÉRT ÍTÉLET ÁTVÉTELE, NEM ÚJRASZÁMOLÁSA ───────────────────────────────────
const clauseById = new Map();
for (const n of ALL_NORMS) for (const c of (n.clauses || [])) clauseById.set(c.id, c);

const byCatcher = new Map();
for (const m of MUTATIONS) {
  if (!byCatcher.has(m.catcher)) byCatcher.set(m.catcher, []);
  byCatcher.get(m.catcher).push(m);
}

const rows = ev.chain.map((r) => {
  const clause = clauseById.get(r.clause_id) || {};
  const muts = (byCatcher.get(r.probe_id) || []).map((m) => {
    const res = byMutation.get(m.id);
    return {
      id: m.id, what: m.what, verdict: res ? res.verdict : 'nem futott',
      names_this_assertion: !!(res && (res.failed_assertions || []).includes(r.assertion_id)),
    };
  });
  const naming = muts.filter((m) => m.names_this_assertion);
  return {
    norm_id: r.norm_id,
    clause_id: r.clause_id,
    covers: r.covers ? [...r.covers] : [],
    clause_text: clause.text || null,
    source: clause.source || ref.source_document.name,
    assertion_id: r.assertion_id,
    probe_id: r.probe_id,
    behaviour: r.probe_id ? titles.get(r.probe_id) || null : null,
    positive_evidence: r.probe_id ? `${r.probe_id} — „${titles.get(r.probe_id)}" · node v3ref/run.mjs` : null,
    negative_evidence: naming.length
      ? `${naming.length} mutáció NÉV SZERINT dönti hamisra ezt az állítást: ${naming.map((m) => m.id).join(', ')}`
      : (muts.length
        ? `a próbára ${muts.length} mutáció szól, de EGYIK SEM nevezi meg ezt az állítást — ezért a sor NEM „fedett"`
        : null),
    mutations: muts,
    residual_scope: clause.gap || null,
    // A MÉRT ÍTÉLET. A generátor NEM képez minősítést (R37/F37-01).
    result: r.result,
    why: r.why || null,
    evidence_limit: r.evidence_limit || null,
    content_review: r.content_review || null,
    external_decision: externalDecisionFor(r.clause_id),
  };
});

const count = (v) => rows.filter((r) => r.result === v).length;
const contentReviewed = rows.filter((r) => r.content_review && r.content_review.state === 'current').length;

const pkg = {
  schema: 'v3-norm-chain-package/2',
  id: 'NCP-01',
  at: new Date().toISOString(),
  measured_from: { file: 'v3ref/v3ref-mutation-result.json', base_digest: measured.base_digest, execution: measured.execution },
  contract: { id: NORM_CONTRACT.id, version: NORM_CONTRACT_VERSION, digest: ref.digest, index_digest: idx },
  amendments: (NORM_CONTRACT.amendments || []).map((a) => ({ id: a.id, scope: a.scope, source: a.source_document || a.artifact })),
  binding_checked: [
    'szerződés-lenyomat és -verzió', 'norma-index lenyomat', 'integritás-jelzés',
    'a sorhalmaz MINDKÉT irányban', 'a minősítés zárt halmaza',
    'minden „covered" sor falszifikáló mutációja LEFUTOTT, CAUGHT, és NÉV SZERINT megnevezi az állítást',
    'minden próba címe feloldható a futtatóból, mindkét irányban',
  ],
  totals: {
    norms: ALL_NORMS.length,
    clauses: clauseById.size,
    chain_rows: rows.length,
    covered: count('covered'),
    partially_covered: count('partially_covered'),
    not_falsified: count('not_falsified'),
    no_evidence: count('no_evidence'),
    content_review_current: contentReviewed,
    external_decisions: EXTERNAL_CLAUSE_DECISIONS.length,
  },
  open_blockers: OPEN_BLOCKERS.map((b) => ({ id: b.id, title: b.title })),
  closed_blockers: CLOSED_BLOCKERS.map((b) => ({ id: b.id, title: b.title, closed_in: b.closed_in, guard: b.guard, residual: b.residual })),
  use_gates: USE_GATES.map((g) => ({ id: g.id, title: g.title, closed_until: g.closed_until,
    not_authorized: g.what_the_green_reference_does_not_authorize, source: g.source })),
  stated_limits: [
    'A `result` és a `why` a MÉRT `norm_evidence.chain`-ből jön; a generátor egyetlen minősítést sem képez.',
    'A `covered` annyit mond, hogy a klauzula deklarált állítását egy lefutott mutáció NÉV SZERINT '
      + 'hamisra fordította — NEM azt, hogy a klauzula normatív tartalma maradéktalanul teljesül.',
    'A `content_review` a REPÓBAN rögzített rekord állapota. A `external_decision` a boardon rögzített '
      + 'KÜLSŐ tartalmi döntés — külön tengely, és NEM gépi hitelesítés: a kettőt nem vonjuk össze.',
    'A próba CÍME forrás-olvasással oldódik fel a futtatóból; ha a `probe(` hívás alakja változik, ez '
      + 'a lépés nevezetten megáll, nem ad néma üres címet.',
  ],
  rows,
};

writeFileSync(join(ROOT, 'docs/70_PLANNING/V3_R36_NORMA_LANC_CSOMAG.json'), `${JSON.stringify(pkg, null, 2)}\n`);

// ── (5) A LAP A CSOMAGBÓL RAJZOLVA (KUKA-082) ───────────────────────────────────────────────────
const esc = (t) => String(t == null ? '—' : t).replace(/\|/g, '\\|').replace(/\n+/g, ' ');
const md = [];
md.push('# A norma-lánc végső forrásállapota — önállóan visszaellenőrizhető csomag');
md.push('');
md.push('> **Sáv:** Claude-v3 · **Kör:** R37 · **Állapot:** lezárt');
md.push('');
md.push('**EZ A LAP SZÁRMAZTATOTT.** Egyetlen sorát sem gépeltük: a `npm run docs:norm-chain` (NCP-01)');
md.push('rajzolja — és a minősítéseket **a MÉRT lánc-vetületből** veszi, nem képezi. A gépi alak a');
md.push('`V3_R36_NORMA_LANC_CSOMAG.json`; **a következő kör azt olvassa.**');
md.push('');
md.push(`**Szerződés:** ${pkg.contract.id} · verzió: \`${pkg.contract.version}\` · lenyomat: \`${String(ref.digest).slice(0, 26)}…\``);
md.push(`**A mérés forrása:** \`${pkg.measured_from.file}\` · base: \`${String(measured.base_digest).slice(0, 26)}…\``);
md.push('');
md.push('**Ellenőrzött kötések** (bármelyik bukása esetén a csomag MEG SEM SZÜLETIK):');
md.push('');
for (const b of pkg.binding_checked) md.push(`- ${b}`);
md.push('');
md.push(`**Összesítő:** ${pkg.totals.norms} norma · ${pkg.totals.clauses} klauzula · ${pkg.totals.chain_rows} láncsor — `
  + `**${pkg.totals.covered} fedett** · ${pkg.totals.partially_covered} részben fedett · `
  + `${pkg.totals.not_falsified} nem falszifikált · ${pkg.totals.no_evidence} bizonyíték nélkül. `
  + `Repóban rögzített tartalmi felülvizsgálat: **${pkg.totals.content_review_current}/${pkg.totals.chain_rows}**. `
  + `Boardon rögzített KÜLSŐ tartalmi döntés: **${pkg.totals.external_decisions} klauzulán** (külön tengely).`);
md.push('');
md.push('## Amit ez a csomag NEM állít');
md.push('');
for (const l of pkg.stated_limits) md.push(`- ${l}`);
md.push('');
md.push('## A láncsorok');
md.push('');
md.push('| klauzula | forrás | K-fedés | működés (próba) | pozitív | negatív / mutáció | maradék hatókör | MÉRT eredmény | külső döntés |');
md.push('|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  const ext = r.external_decision ? r.external_decision.verdict : '—';
  md.push(`| **${r.clause_id}** (${r.norm_id}) | ${esc(r.source)} | ${r.covers.join('+') || '—'} `
    + `| ${esc(r.behaviour)} | ${esc(r.positive_evidence)} | ${esc(r.negative_evidence)} `
    + `| ${esc(r.residual_scope || r.why)} | **${r.result}** | ${esc(ext)} |`);
}
md.push('');
md.push('## A külső fél tartalmi döntései (OB-7, boardon rögzítve)');
md.push('');
md.push('> Ez **nem** gépi hitelesítés és **nem** a repó `content_review` rekordja — külön tengely.');
md.push('');
md.push('| klauzula | döntés | indok |');
md.push('|---|---|---|');
for (const d of EXTERNAL_CLAUSE_DECISIONS) md.push(`| **${d.clause}** | ${d.verdict} | ${esc(d.reason)} |`);
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
  + `${pkg.totals.partially_covered} részben · ${pkg.totals.not_falsified} nem falszifikált · `
  + `${pkg.totals.no_evidence} bizonyíték nélkül · repó-felülvizsgálat ${pkg.totals.content_review_current} · `
  + `külső döntés ${pkg.totals.external_decisions} klauzulán`);
