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
// A FÜGGETLENÜL ELVÁRT program-/esetkészlet: a rögzítő NEM a saját számát nevezi teljesnek (R200 §2).
import { PROGRAMS } from '../v3ref/external-checks/case-manifest.mjs';
import { BATCH_EXTRA_FILES } from '../v3ref/mutationBatch.mjs';
// A MAI ELFOGADÁSI PROFIL (PRF-01 · R202 §1) — a próba a profilból veszi a darabszámot.
import { ACCEPTANCE_PROFILE, resolveProfile, profileProgramRows, measureProfileFiles, profileDigest } from '../v3ref/external-checks/acceptanceProfile.mjs';
import { seriesId, makeAnchor, makeRecord, configDigest, evidenceDigest, SERIES_CONTRACT, BINDING_ANCHOR_FILE } from '../v3ref/external-checks/seriesLedger.mjs';

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
/**
 * A TELJES, KÖTÖTT KÉSZLET — A FÜGGETLEN MANIFESZTBŐL (R200 §2).
 *
 * A RÉGI RÖGZÍTŐM `3/3`-at állított, `complete_evidence: true`-val, `scope` és `programs` nélkül — és
 * ÁTMENT. Pontosan ez volt a lelet: a bizonyíték a SAJÁT hatókörét nevezte teljesnek. A pozitív
 * kontroll innentől a kívülről elvárt 19 programot és MINDEN esetüket hordozza; ha a manifeszt bővül,
 * a rögzítő VELE bővül, nem marad el tőle (KUKA-003).
 */
const fullPrograms = () => PROGRAMS.map((p) => ({
  id: p.id, file: p.file, ok: true, exit: 0,
  case_rows: (p.cases || []).map((id) => ({ id, pass: true })),
}));
const extEvidence = (o = {}) => JSON.stringify({
  at: '2026-09-20T00:00:00.000Z', node: NODE, source: { commit: C0, clean: true },
  scope: { complete: true, scope: 'full', ran: PROGRAMS.map((p) => String(p.id)), skipped: [] },
  verdict: { ok: true, complete_evidence: true, green: PROGRAMS.length, env_skipped: 0, of: PROGRAMS.length },
  programs: fullPrograms(),
  ...o,
});
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
  // A HÁROM ÁLLAPOT (R202 §3): a söprés a „nincs érvényes mérés" VAGY a „mért bukás" szóval mondja
  // ki a nem igazolt kihagyást — a pin a SZABÁLYT méri (van nevezett állapot + nem zöld összverdikt),
  // nem a korábbi egyetlen szövegalakot (`KUKA-009`).
  say('SRU02', /NINCS ÉRVÉNYES MÉRÉS|MÉRT BUKÁS/.test(s.out) && /ÖSSZVERDIKT: NEM ZÖLD/.test(s.out),
    'a söprés nem mondja ki a nevezett állapotot (NINCS ÉRVÉNYES MÉRÉS / MÉRT BUKÁS) és a nem zöld összverdiktet');
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

// ══════════════════════════════════════════════════════════════════════════════════════════════════
// A TELJESSÉG — A LÁNC ÚJRAHASZNÁLATA A FÜGGETLENÜL ELVÁRT KÉSZLETHEZ KÖTVE (R200 §2, SRU11–SRU14)
//
// A LELET, a chatgpt-v3-tól: a feloldó `verify:external-checks` ága csak a zöld verdiktet és a tiszta
// forrást kérte, a TELJESSÉGET nem — így egy EGYETLEN RÉSZPROGRAM eredménye (`1/1`,
// `complete_evidence: false`) a TELJES lánc újrahasznált bizonyítékaként ment át. Itt a négy eset,
// amit a SPEC nevez: (11) a mai 1/1 alak ELUTASÍTVA · (12) hiányos SOROZAT elutasítva akkor is, ha a
// saját számai egyöntetűen zöldek · (13) valódi TELJES, KÖTÖTT készlet elfogadva · (14) érintett
// segédmodul változása érvénytelenít. Mindegyiknél mérjük azt is, hogy az ELUTASÍTÁS NEM INDÍT
// hosszú láncot (R69).
// ══════════════════════════════════════════════════════════════════════════════════════════════════

// A SZINTETIKUS SOROZAT — valódi lenyomatokkal, hogy a MEGLÉVŐ EXS szabály dönthessen róla.
const SERIES_BASE_REL = 'v3ref/external-checks/results/series';
const synthHex = (n, seed) => {
  let out = '';
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  while (out.length < n) { h = (h * 1103515245 + 12345) >>> 0; out += h.toString(16).padStart(8, '0'); }
  return out.slice(0, n);
};
const SYN_CFG = configDigest({ battery_units: 64, unit_plan: [64, 253], unit_budget_ms: 12_000, external_cap_ms: 15_000, node: NODE });
/**
 * A SZINTETIKUS KÖTÉS A MAI ELFOGADÁSI PROFILT HORDOZZA (PRF-01 · R202 §1).
 *
 * MÉRVE: amikor a kötés a profil-párral bővült, ez a fixtúra még a PRF-01 ELŐTTI alakot építette, és
 * az SRU12–SRU14 pirosat adott egy HELYES kódra („MÁS PROFIL (nincs megnevezve)"). Ez a `KUKA-495`
 * osztálya — a szerződés-bővítés kinőtte a saját próbáját. Ezért a profil-lenyomatot UGYANAZZAL a
 * függvénnyel számoljuk, amit a feloldó is hív, UGYANARRÓL a szintetikus gyökérről: így a két érték
 * KONSTRUKCIÓ SZERINT egyezik, nem egyeztetés útján (`KUKA-003`).
 */
const SYN_PROFILE = resolveProfile(ACCEPTANCE_PROFILE).profile;
const SYN_PROFILE_ROWS = profileProgramRows(SYN_PROFILE, PROGRAMS).filter(Boolean);
const SYN_PROFILE_DIGEST = profileDigest({
  profile: SYN_PROFILE,
  programs: PROGRAMS,
  // A SZINTETIKUS GYÖKÉRRŐL: ott a külső program-fájlok nincsenek meg, tehát a mért lenyomatok
  // `null`-ok — és épp ez a lényeg: a feloldó UGYANÍGY számol, tehát ugyanezt kapja.
  fileDigests: measureProfileFiles(join(tmp, 'v3ref/external-checks'), SYN_PROFILE, PROGRAMS),
});
const SYN_BINDING = Object.freeze({
  bundle_digest: synthHex(64, 'sru-bundle'),
  programs_digest: synthHex(64, 'sru-manifest'),
  runner_digest: synthHex(64, 'sru-runner'),
  config_digest: SYN_CFG,
  profile_id: SYN_PROFILE.id,
  profile_digest: SYN_PROFILE_DIGEST,
  clean: true,
});
const SYN_SID = seriesId(SYN_BINDING);
/**
 * EGY SOROZAT KIÍRÁSA A SZINTETIKUS REPÓBA.
 *
 * A BIZONYÍTÉK-FÁJLT ELŐBB ÍRJUK, ÉS A LENYOMATOT RÓLA MÉRJÜK — nem kitalált értéket írunk a
 * rekordba. Így a sorozat ugyanazon az úton bírálható, amin a kapu bírálja (KUKA-207: amit próba nem
 * tud MEGHÍVNI, azt bizalomból hisszük).
 */
const writeSeries = (ids, { sid = SYN_SID, binding = SYN_BINDING, provenance = { commit: C0 } } = {}) => {
  const dir = `${SERIES_BASE_REL}/${sid}`;
  W(`${dir}/${BINDING_ANCHOR_FILE}`, JSON.stringify(makeAnchor({
    // AZ ELVÁRT KÉSZLET A MAI PROFILBÓL — nem a teljes történeti regiszterből (R202 §1).
    binding, provenance, programs: SYN_PROFILE_ROWS.map((x) => String(x.id)), recorded_by: 'sru-fixture',
  }), null, 2));
  for (const id of ids) {
    const prog = PROGRAMS.find((x) => String(x.id) === String(id));
    const evBytes = Buffer.from(JSON.stringify({ id, ok: true, cases: (prog.cases || []).map((c) => ({ id: c, pass: true })) }));
    W(`${dir}/evidence/${id}.json`, evBytes);
    W(`${dir}/${id}_sru.json`, JSON.stringify(makeRecord({
      binding,
      provenance,
      program: { id, digest: synthHex(64, `dg-${id}`) },
      exit: 0,
      ok: true,
      cases: (prog.cases || []).map((c) => ({ id: c, pass: true })),
      evidence_digest: evidenceDigest(evBytes),
      ms: 1234,
    }), null, 2));
  }
  return dir;
};
const dropSeries = () => { rmSync(join(tmp, SERIES_BASE_REL), { recursive: true, force: true }); };

// ── SRU11 — A MAI ALAK: EGYETLEN RÉSZPROGRAM, `complete_evidence: false` → ELUTASÍTVA ─────────────
{
  const only = String(PROGRAMS[0].id);
  W(CHAINS['verify:external-checks'].evidence_path, extEvidence({
    scope: { complete: false, scope: 'partial', ran: [only], skipped: PROGRAMS.slice(1).map((x) => String(x.id)) },
    verdict: { ok: true, complete_evidence: false, green: 1, env_skipped: 0, of: 1 },
    programs: fullPrograms().filter((r) => r.id === only),
  }));
  git('add', '-A'); git('commit', '-q', '-m', 'SRU11 reszprogram-bizonyitek');
  const C = git('rev-parse', 'HEAD');
  const e = assess('verify:external-checks', C);
  say('SRU11', e.status === 'unverified',
    `az EGYETLEN RÉSZPROGRAM (1/1, complete_evidence:false) bizonyítéka a TELJES lánc kihagyásaként ÁTMENT: ${e.why}`);
  // A DARABSZÁM A MAI PROFILBÓL JÖN, NEM BEÍRT „18/19"-BŐL (R202 §1 · `KUKA-003`): ha a profil
  // változik, a próba VELE változik, nem marad el tőle.
  const AKTIV = profileProgramRows(resolveProfile(ACCEPTANCE_PROFILE).profile, PROGRAMS).filter(Boolean).length;
  say('SRU11', /complete_evidence=false/.test(e.why) && new RegExp(`HIÁNYZIK ${AKTIV - 1}/${AKTIV}`).test(e.why),
    `az elutasítás nem nevezi meg sem a nem-teljes jelet, sem a MAI profil készletének hiányát (elvárt: ${AKTIV - 1}/${AKTIV}): ${e.why}`);
  say('SRU11', /EGYETLEN SOROZAT SINCS/.test(e.why),
    `az elutasítás nem mondja ki, hogy a sorozat-út sem adja a teljes bizonyítékot: ${e.why}`);
  // AZ ELUTASÍTÁS NEM INDÍT HOSSZÚ LÁNCOT (R69).
  const sw = sweep([...SKIP, '--reuse', C]);
  say('SRU11', sw.code === 1 && /NINCS ÉRVÉNYES MÉRÉS|MÉRT BUKÁS/.test(sw.out), `a söprés a részprogram-bizonyítékot elfogadta (${sw.code})`);
  say('SRU11', !sw.chainRan, 'a söprés az elutasított kihagyás után ELINDÍTOTTA a hosszú láncot');
}

// ── SRU12 — HIÁNYOS SOROZAT, EGYÖNTETŰEN ZÖLD SAJÁT SZÁMOKKAL → ELUTASÍTVA ────────────────────────
{
  // A sorozat 18 programot visz a 19-ből, MINDET zölden: a saját könyvelése hibátlan.
  const ids = SYN_PROFILE_ROWS.slice(0, SYN_PROFILE_ROWS.length - 1).map((x) => String(x.id));
  const missing = String(SYN_PROFILE_ROWS[SYN_PROFILE_ROWS.length - 1].id);
  writeSeries(ids);
  git('add', '-A'); git('commit', '-q', '-m', 'SRU12 hianyos sorozat, sajat szamai zoldek');
  const C = git('rev-parse', 'HEAD');
  const e = assess('verify:external-checks', C);
  say('SRU12', e.status === 'unverified',
    `a HIÁNYOS sorozat (${ids.length}/${PROGRAMS.length}) a TELJES lánc kihagyásaként ÁTMENT, mert a saját számai zöldek: ${e.why}`);
  say('SRU12', new RegExp(`RÉSZLEGES sorozat: 1 program még nem futott \\(${missing}`).test(e.why),
    `az elutasítás nem nevezi meg a hiányzó programot (${missing}): ${e.why}`);
  const sw = sweep([...SKIP, '--reuse', C]);
  say('SRU12', sw.code === 1 && !sw.chainRan, `a hiányos sorozat elfogadva vagy a lánc elindult (${sw.code}, lánc futott: ${sw.chainRan})`);
}

// ── SRU13 — VALÓDI TELJES, KÖTÖTT KÉSZLET → ELFOGADVA (pozitív kontroll, SOROZAT-alapon) ──────────
{
  dropSeries();
  writeSeries(SYN_PROFILE_ROWS.map((x) => String(x.id)));
  // Az EGYFUTÁS-fájl RÉSZLEGES marad: a teljességet KIZÁRÓLAG a sorozat adja — így az is mérve van,
  // hogy a sorozat-út önmagában elég, és nem a `results/` alatti, felülírt fájl hitelesít.
  git('add', '-A'); git('commit', '-q', '-m', 'SRU13 teljes kotott sorozat');
  const C = git('rev-parse', 'HEAD');
  const e = assess('verify:external-checks', C);
  say('SRU13', e.status === 'reused', `a VALÓDI teljes, kötött sorozat kihagyása NEM ment át: ${e.why}`);
  say('SRU13', /SOROZAT/.test(e.evidence.summary) && new RegExp(`${SYN_PROFILE_ROWS.length}/${SYN_PROFILE_ROWS.length}`).test(e.evidence.summary),
    `az elfogadás nem a SOROZATOT és a teljes készletet nevezi meg: ${e.evidence.summary}`);
  const sw = sweep([...SKIP, '--reuse', C]);
  say('SRU13', sw.code === 0, `a söprés a valódi teljes készlettel nem 0-val zárt (${sw.code}): ${sw.out.slice(-300)}`);
  say('SRU13', !sw.chainRan, 'a söprés érvényes újrahasználat mellett ELINDÍTOTTA a hosszú láncot');
}

// ── SRU14 — ÉRINTETT SEGÉDMODUL VÁLTOZÁSA ÉRVÉNYTELENÍT ───────────────────────────────────────────
{
  const C = git('rev-parse', 'HEAD');
  // (a) A KÜLSŐ LÁNC segédmodulja: a `v3ref/` alatti forrás, amit a lánc olvas.
  W('v3ref/a.mjs', 'export const a = 3; // érintett segédmodul\n');
  const e = assess('verify:external-checks', C);
  say('SRU14', e.status === 'unverified' && /munkafa eltér/.test(e.why),
    `az érintett segédmodul változása után a TELJES sorozat kihagyása ÁTMENT: ${e.why}`);
  git('checkout', '--', 'v3ref/a.mjs');
  say('SRU14', assess('verify:external-checks', C).status === 'reused', 'a visszaállítás után az érvényes pár nem áll vissza (a próba saját feltevése)');
  /**
   * (b) ÉS A MAG-BATTÉRIA MBX-FÜGGŐSÉGE (R200 §2): a `batteryUnits.mjs` a BATCH futtatójának része
   * (`BATCH_EXTRA_FILES`), tehát a változása a mutációs mérést is érvényteleníti. A régi bemeneti
   * lista csak a felső szintű `v3ref/*.mjs`-t fedte — ez a sor azt méri, hogy nem csúszott vissza.
   */
  for (const f of BATCH_EXTRA_FILES) {
    say('SRU14', CHAINS['verify:v3ref'].inputs.includes(`v3ref/${f}`),
      `a mag-battéria bemeneti listája NEM fedi az MBX saját függőségét: v3ref/${f}`);
    W(`v3ref/${f}`, 'export const UNITS = [];\n');
    const v = assess('verify:v3ref', C);
    say('SRU14', v.status === 'unverified' && /munkafa eltér|lenyomata|követetlen bemeneti fájl/.test(v.why),
      `a(z) v3ref/${f} változása után a mag-battéria kihagyása ÁTMENT: ${v.why}`);
    rmSync(join(tmp, 'v3ref', f), { force: true });
  }
}

rmSync(tmp, { recursive: true, force: true });
console.log('='.repeat(78));
console.log(`SRU-01 — a söprés bizonyíték-újrahasználata (${SRU_CONTRACT.rule})`);
console.log('='.repeat(78));
for (const p of problems) console.log(`FAIL ${p}`);
console.log(`RESULT: ${count - problems.length}/${count} PASS${problems.length ? ` — ${problems.length} FAIL` : ''}`);
process.exit(problems.length ? 1 : 0);
