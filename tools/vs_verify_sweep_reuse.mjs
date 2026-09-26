#!/usr/bin/env node
/** SRU-01 GÉPI JELE — A SÖPRÉS BIZONYÍTÉK-ÚJRAHASZNÁLATA (R69 F69-01 · KUKA-200).
 *
 * MIT MÉR, ÉS MIÉRT ÍGY. A külső ellenőrző fél (chatgpt-v3, R69) izolált szintetikus git-repón
 * bizonyította, hogy az R68-as kihagyás módosított munkafán és bukott teszt mellett is „érvényes"-t írt.
 * Ez a próba UGYANAZT az alakot építi fel (szintetikus repó, ártalmatlan rövid láncok), és a feloldót
 * HÍVJA, majd a VALÓDI söprést alfolyamatként futtatja rajta — a kilépési kódon és a jelölő-fájlokon mérve,
 * hogy a kihagyott lánc TÉNYLEG nem indult el (KUKA-009 · KUKA-024: a viszony, nem a szöveg).
 *
 *   SRU01  az ÉRVÉNYES pár: tiszta munkafa + zöld, tiszta bizonyíték + azonos környezet ⇒ `reused`,
 *          a söprés 0-val zár, a hosszú lánc NEM fut, az olcsó fele (a próbák) IGEN
 *   SRU02  MÓDOSÍTOTT MUNKAFA (commit nélkül) ⇒ `unverified`, a söprés 1-gyel zár, a lánc NEM indul
 *   SRU03  STAGED változás (az index eltér, a munkafa nem) ⇒ `unverified`
 *   SRU04  KÖVETETLEN bemeneti fájl ⇒ `unverified`
 *   SRU05  HIÁNYZÓ bizonyíték a hivatkozott commitban ⇒ `unverified`
 *   SRU06  BUKOTT bizonyíték (`ok:false` · SURVIVED mutáció) ⇒ `unverified`
 *   SRU07  NEM TISZTA forráson készült bizonyíték (`+uncommitted` · `clean:false`) ⇒ `unverified`
 *   SRU08  fel nem oldható hivatkozás és SHELL-METAKARAKTERES hivatkozás ⇒ `unverified`, végrehajtás nélkül
 *   SRU09  lánc-szkript · függőség · package-lock · futtató-verzió eltérés ⇒ `unverified`
 *   SRU10  a söprés a KÖZÖS feloldót hívja, és a régi, két-commitos shell-alak nem jött vissza
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { assessReuse, reuseLine, resolveCommit, CHAINS, SRU_CONTRACT } from './lib/vs_sweep_reuse.mjs';
import { digestOfBundle } from '../v3ref/bundleDigest.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SWEEP = join(ROOT, 'tools', 'vs_verify_sweep.mjs');
const problems = []; let count = 0;
const say = (id, ok, msg) => { count += 1; if (!ok) problems.push(`${id}: ${msg}`); };

// ── A SZINTETIKUS REPÓ ─────────────────────────────────────────────────────────────────────────────
const tmp = mkdtempSync(join(tmpdir(), 'vs-sru-'));
const GIT_ENV = { ...process.env, GIT_AUTHOR_NAME: 'sru', GIT_AUTHOR_EMAIL: 'sru@x', GIT_COMMITTER_NAME: 'sru', GIT_COMMITTER_EMAIL: 'sru@x' };
const git = (...a) => execFileSync('git', a, { cwd: tmp, env: GIT_ENV, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
const W = (rel, text) => { mkdirSync(dirname(join(tmp, rel)), { recursive: true }); writeFileSync(join(tmp, rel), text); };
const MARK_CHAIN = join(tmp, 'CHAIN-RAN'); const MARK_CHEAP = join(tmp, 'CHEAP-RAN');
const PKG = (scripts) => JSON.stringify({ name: 'sru-synthetic', version: '0.0.0', engines: { node: '>=22' }, devDependencies: { x: '1.0.0' }, scripts }, null, 2);
const SCRIPTS = {
  'verify:ok': 'node ok.js',
  'verify:v3ref': 'node long.js',
  'verify:external-checks': 'node long.js',
};
W('package.json', PKG(SCRIPTS));
W('package-lock.json', '{"lockfileVersion":3}\n');
W('ok.js', 'process.exit(0)\n');
// A HOSSZÚ LÁNC ÁRTALMATLAN HELYETTESE: jelölő-fájlt ír, és BUKIK — ha a söprés elindítja, az látszik.
W('long.js', `require('fs').writeFileSync(${JSON.stringify(MARK_CHAIN)}, 'ran'); process.exit(1)\n`);
W('v3ref/a.mjs', 'export const a = 1;\n');
W('v3ref/run.mjs', `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(MARK_CHEAP)}, 'ran'); console.log('RESULT: 1/1 PASS');\n`);
W('contracts/c.js', 'module.exports = 1;\n');
W('.gitignore', 'CHAIN-RAN\nCHEAP-RAN\n');
git('init', '-q'); git('add', '-A'); git('commit', '-q', '-m', 'C0 forrás');
const C0 = git('rev-parse', 'HEAD');
const NODE = process.version;
const extEvidence = (o = {}) => JSON.stringify({ at: '2026-09-20T00:00:00.000Z', node: NODE, source: { commit: C0, clean: true }, verdict: { ok: true, complete_evidence: true, green: 3, env_skipped: 0, of: 3 }, ...o });
const mutEvidence = (o = {}) => JSON.stringify({ at: '2026-09-20T00:00:00.000Z', node: NODE, base_digest: digestOfBundle(tmp), clean: true, run_state: 'complete', coverage: { expected: 2, seen: 2, missing: [] }, mutation_results: [{ mutation_id: 'M1', verdict: 'CAUGHT' }, { mutation_id: 'M2', verdict: 'CAUGHT' }], ...o });
W(CHAINS['verify:external-checks'].evidence_path, extEvidence());
W(CHAINS['verify:v3ref'].evidence_path, mutEvidence());
git('add', '-A'); git('commit', '-q', '-m', 'C1 bizonyíték');
const C1 = git('rev-parse', 'HEAD');

const assess = (chain, ref) => assessReuse({ root: tmp, chain, reuseRef: ref });
const both = (ref) => [assess('verify:external-checks', ref), assess('verify:v3ref', ref)];
const sweep = (args) => {
  for (const m of [MARK_CHAIN, MARK_CHEAP]) rmSync(m, { force: true });
  const r = spawnSync(process.execPath, [SWEEP, '--root', tmp, ...args], { cwd: tmp, env: GIT_ENV, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}\n${r.stderr}`, chainRan: existsSync(MARK_CHAIN), cheapRan: existsSync(MARK_CHEAP) };
};
const SKIP = ['--skip', 'verify:external-checks,verify:v3ref'];

// ── SRU01 — AZ ÉRVÉNYES PÁR (csak VALÓDI bizonyítékkal) ────────────────────────────────────────────
{
  const [e, v] = both(C1);
  say('SRU01', e.status === 'reused', `tiszta munkafa + zöld bizonyíték mellett a külső lánc nem reused: ${e.why}`);
  say('SRU01', v.status === 'reused', `tiszta munkafa + zöld mutációs bizonyíték mellett a mag-battéria nem reused: ${v.why}`);
  say('SRU01', /ÚJRAHASZNÁLT BIZONYÍTÉK/.test(reuseLine(e)) && /olcsó fele/.test(reuseLine(v)), 'a reused sor nem nevezi meg az újrahasználatot / az olcsó felet');
  const s = sweep([...SKIP, '--reuse', C1]);
  say('SRU01', s.code === 0, `a VALÓDI söprés érvényes újrahasználattal nem 0-val zárt (${s.code}): ${s.out.slice(-400)}`);
  say('SRU01', !s.chainRan, 'a söprés érvényes újrahasználat mellett ELINDÍTOTTA a hosszú láncot');
  say('SRU01', s.cheapRan, 'a söprés érvényes újrahasználat mellett NEM futtatta a mag-battéria olcsó felét (a próbákat)');
  say('SRU01', (s.out.match(/ÚJRAHASZNÁLT BIZONYÍTÉK/g) || []).length === 2, 'a söprés kimenete nem két újrahasznált sort ír');
}

// ── SRU02 — MÓDOSÍTOTT MUNKAFA (commit nélkül) ─────────────────────────────────────────────────────
{
  W('v3ref/a.mjs', 'export const a = 2; // módosítva\n');
  const [e, v] = both(C1);
  say('SRU02', e.status === 'unverified' && /munkafa eltér/.test(e.why), `módosított munkafán a külső lánc kihagyása átment: ${e.why}`);
  say('SRU02', v.status === 'unverified' && /lenyomata|munkafa eltér/.test(v.why), `módosított munkafán a mag-battéria kihagyása átment: ${v.why}`);
  const s = sweep([...SKIP, '--reuse', C1]);
  say('SRU02', s.code === 1, `a VALÓDI söprés módosított munkafán nem 1-gyel zárt (${s.code})`);
  say('SRU02', /NEM FUTOTT — NEM IGAZOLT/.test(s.out) && /ÖSSZVERDIKT: NEM ZÖLD/.test(s.out), 'a söprés nem mondja ki a NEM IGAZOLT állapotot és a nem zöld összverdiktet');
  say('SRU02', !s.chainRan, 'a söprés az elutasított kihagyás után ELINDÍTOTTA a hosszú láncot (R69: nem indíthat)');
  say('SRU02', !/érvényes/.test(s.out), 'a söprés módosított munkafán is „érvényes"-t ír');
  git('checkout', '--', 'v3ref/a.mjs');
}

// ── SRU03 — STAGED változás (az index eltér, a munkafa nem) ────────────────────────────────────────
{
  W('v3ref/a.mjs', 'export const a = 3;\n'); git('add', 'v3ref/a.mjs'); W('v3ref/a.mjs', 'export const a = 1;\n');
  const [e, v] = both(C1);
  say('SRU03', e.status === 'unverified' && /index/.test(e.why), `staged változás mellett a külső lánc kihagyása átment: ${e.why}`);
  say('SRU03', v.status === 'unverified' && /index/.test(v.why), `staged változás mellett a mag-battéria kihagyása átment: ${v.why}`);
  git('reset', '-q', '--hard', 'HEAD');
}

// ── SRU04 — KÖVETETLEN bemeneti fájl ───────────────────────────────────────────────────────────────
{
  W('v3ref/external-checks/uj.mjs', 'export const u = 2;\n');
  const [e] = both(C1);
  say('SRU04', e.status === 'unverified' && /követetlen/.test(e.why), `követetlen bemeneti fájl mellett a kihagyás átment: ${e.why}`);
  rmSync(join(tmp, 'v3ref/external-checks/uj.mjs'));
  W('v3ref/b.mjs', 'export const b = 1;\n');
  const [, v] = both(C1);
  say('SRU04', v.status === 'unverified', `követetlen v3ref-fájl mellett a mag-battéria kihagyása átment: ${v.why}`);
  rmSync(join(tmp, 'v3ref/b.mjs'));
}

// ── SRU05 — HIÁNYZÓ bizonyíték ─────────────────────────────────────────────────────────────────────
{
  const [e, v] = both(C0);
  say('SRU05', e.status === 'unverified' && /nincs bizonyíték-fájl/.test(e.why), `bizonyíték nélküli commitra a külső lánc kihagyása átment: ${e.why}`);
  say('SRU05', v.status === 'unverified' && /nincs bizonyíték-fájl/.test(v.why), `bizonyíték nélküli commitra a mag-battéria kihagyása átment: ${v.why}`);
}

// ── SRU06 — BUKOTT bizonyíték ──────────────────────────────────────────────────────────────────────
{
  W(CHAINS['verify:external-checks'].evidence_path, extEvidence({ verdict: { ok: false, complete_evidence: false, green: 2, env_skipped: 0, of: 3 } }));
  W(CHAINS['verify:v3ref'].evidence_path, mutEvidence({ mutation_results: [{ mutation_id: 'M1', verdict: 'CAUGHT' }, { mutation_id: 'M2', verdict: 'SURVIVED' }] }));
  git('add', '-A'); git('commit', '-q', '-m', 'C2 bukott bizonyíték');
  const C2 = git('rev-parse', 'HEAD');
  const [e, v] = both(C2);
  say('SRU06', e.status === 'unverified' && /nem zöld/.test(e.why), `bukott külső-lánc bizonyíték újrahasználva: ${e.why}`);
  say('SRU06', v.status === 'unverified' && /nem minden mutáció elkapva/.test(v.why), `SURVIVED mutáció mellett a mag-battéria újrahasználva: ${v.why}`);
  const s = sweep([...SKIP, '--reuse', C2]);
  say('SRU06', s.code === 1 && !s.chainRan, `bukott bizonyítékra a söprés nem 1-gyel zárt vagy elindította a láncot (${s.code}, lánc futott: ${s.chainRan})`);
}

// ── SRU07 — NEM TISZTA forráson készült bizonyíték ─────────────────────────────────────────────────
{
  W(CHAINS['verify:external-checks'].evidence_path, extEvidence({ source: { commit: `${C0}+uncommitted`, clean: false } }));
  W(CHAINS['verify:v3ref'].evidence_path, mutEvidence({ clean: false }));
  git('add', '-A'); git('commit', '-q', '-m', 'C3 piszkos bizonyíték');
  const C3 = git('rev-parse', 'HEAD');
  const [e, v] = both(C3);
  say('SRU07', e.status === 'unverified' && /NEM tiszta/.test(e.why), `+uncommitted forrású bizonyíték újrahasználva: ${e.why}`);
  say('SRU07', v.status === 'unverified' && /nem tiszta/.test(v.why), `clean:false mutációs bizonyíték újrahasználva: ${v.why}`);
  // vissza a zöld bizonyítékhoz, ÚJ commitban (a történet nem íródik át)
  W(CHAINS['verify:external-checks'].evidence_path, extEvidence());
  W(CHAINS['verify:v3ref'].evidence_path, mutEvidence());
  git('add', '-A'); git('commit', '-q', '-m', 'C4 zöld bizonyíték újra');
}
const C4 = git('rev-parse', 'HEAD');
say('SRU07', both(C4).every((a) => a.status === 'reused'), 'a zöld bizonyíték újbóli commitja után az érvényes pár nem áll vissza (a próba saját feltevése)');

// ── SRU08 — fel nem oldható és SHELL-METAKARAKTERES hivatkozás ─────────────────────────────────────
{
  const marker = join(tmp, 'SHELL-RAN');
  for (const ref of ['deadbeef', '', `HEAD; touch ${marker}`, `$(touch ${marker})`, 'HEAD`touch x`']) {
    const [e] = both(ref);
    say('SRU08', e.status === 'unverified' && /nem oldható fel/.test(e.why), `a(z) ${JSON.stringify(ref)} hivatkozás nem nevezett elutasítás: ${e.why}`);
  }
  say('SRU08', !existsSync(marker) && !existsSync(join(tmp, 'x')), 'a hivatkozásba írt parancs LEFUTOTT — shell-interpoláció');
  say('SRU08', resolveCommit(tmp, 'HEAD') === C4 && resolveCommit(tmp, C4.slice(0, 7)) === C4, 'a szabályos hivatkozás (HEAD · rövid sha) nem oldódik fel commitra');
  const s = sweep([...SKIP, '--reuse', 'deadbeef']);
  say('SRU08', s.code === 1 && !s.chainRan && /NEM IGAZOLT/.test(s.out), `fel nem oldható hivatkozásra a söprés nem NEM IGAZOLT-tal zárt (${s.code}, lánc futott: ${s.chainRan})`);
  const s2 = sweep(SKIP);
  say('SRU08', s2.code === 1 && !s2.chainRan, `--reuse nélküli kihagyás nem NEM IGAZOLT (${s2.code})`);
}

// ── SRU09 — lánc-szkript · függőség · package-lock · futtató-verzió eltérés ────────────────────────
{
  W('package.json', PKG({ ...SCRIPTS, 'verify:v3ref': 'node long.js --masik' }));
  say('SRU09', both(C4).every((a) => a.status === 'unverified' && /lánc szkriptjei/.test(a.why)), 'megváltozott lánc-szkript mellett a kihagyás átment');
  W('package.json', PKG(SCRIPTS).replace('"x": "1.0.0"', '"x": "2.0.0"'));
  say('SRU09', both(C4).every((a) => a.status === 'unverified' && /függőség-szerződés/.test(a.why)), 'megváltozott függőség mellett a kihagyás átment');
  git('checkout', '--', 'package.json');
  W('package-lock.json', '{"lockfileVersion":3,"x":1}\n');
  say('SRU09', both(C4).every((a) => a.status === 'unverified' && /package-lock/.test(a.why)), 'megváltozott package-lock mellett a kihagyás átment');
  git('checkout', '--', 'package-lock.json');
  const other = `v${Number(NODE.replace(/^v/, '').split('.')[0]) + 1}.0.0`;
  const e = assessReuse({ root: tmp, chain: 'verify:external-checks', reuseRef: C4, runtime: other });
  say('SRU09', e.status === 'unverified' && /futtató/.test(e.why), `más fő verziójú futtatón a kihagyás átment: ${e.why}`);
  say('SRU09', assessReuse({ root: tmp, chain: 'verify:ok', reuseRef: C4 }).status === 'unverified', 'nem nevezett lánc kihagyása átment');
}

// ── SRU10 — A SÖPRÉS A KÖZÖS FELOLDÓT HÍVJA, a régi alak nem jött vissza ───────────────────────────
{
  const src = readFileSync(SWEEP, 'utf8');
  say('SRU10', /import \{[^}]*assessReuse[^}]*\} from '\.\/lib\/vs_sweep_reuse\.mjs'/.test(src) && /assessReuse\(\{/.test(src), 'a söprés nem a közös feloldót hívja');
  say('SRU10', !/git diff --quiet \$\{reuse\}/.test(src) && !/execSync\(`git diff/.test(src), 'a régi, shell-interpolált két-commitos git diff visszajött a söprésbe');
  // A PIN A SZABÁLYT MÉRI, NEM A SOR SZÓRENDJÉT (R97 javítás, KUKA-009). A korábbi alak két KONKRÉT
  // szövegalakot fogadott el; amikor a söprés kilépési feltétele egy ÚJ, szabályos taggal bővült (a
  // folyamat-MARADVÁNY, F95-02), a pin pirosat adott egy HELYES kódra. Amit mérünk: a kilépési
  // feltételben OTT VAN a NEM IGAZOLT kihagyás — a tagok sorrendje nem szabály.
  say('SRU10', /if \([^)]*\bunverified\.length\b[^)]*\) process\.exit\(1\)/.test(src),
    'a NEM IGAZOLT kihagyás nem viszi 1-re a söprés kilépési kódját');
  say('SRU10', SRU_CONTRACT.statuses.length === 2 && SRU_CONTRACT.chains.length === 2, 'a szerződés nem két állapot / két lánc');
}

rmSync(tmp, { recursive: true, force: true });
console.log('='.repeat(78));
console.log(`SRU-01 — a söprés bizonyíték-újrahasználata (${SRU_CONTRACT.rule})`);
console.log('='.repeat(78));
for (const p of problems) console.log(`FAIL ${p}`);
console.log(`RESULT: ${count - problems.length}/${count} PASS${problems.length ? ` — ${problems.length} FAIL` : ''}`);
process.exit(problems.length ? 1 : 0);
