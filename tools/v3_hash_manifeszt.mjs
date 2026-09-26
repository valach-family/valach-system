#!/usr/bin/env node
// tools/v3_hash_manifeszt.mjs — A MÉRT FÁJLKÉSZLET TARTALOM-AZONOSÍTÓJA (HSH-01, R93 F93-05).
//
// MIÉRT KELL. A külső ellenőrző fél az R93-ban kimondta: „A »36 változott fájl« nem azonosítja a
// mért bájtokat." Egy fájl-DARABSZÁM nem tartalom-azonosító: ugyanaz a 36 fájl holnap más bájtokat
// hordozhat. A jelentés eddig a COMMIT-ra hivatkozott, de a jelentést hordozó commit önmagát nem
// tartalmazhatja — ezért a lánc egy pontján mindig szakadás volt.
//
// A MEGOLDÁS, amit a külső fél elfogadhatónak nevezett: a MÉRT VÉGREHAJTHATÓ FÁJLKÉSZLET
// hash-manifesztje. Három dolog KÜLÖN áll benne, és ez a lényeg:
//   · `source_commit`  — a FORRÁS-INDULÁS: melyik könyvelt állapotról indult a munka;
//   · `tree_digest`    — a MÉRT fájlkészlet tartalom-azonosítója (a munkafáról, nem a commitból);
//   · a jelentés-commit a REPORT-ban áll, KÜLÖN — ide nem is kerül, mert még nem létezik.
//
// A GÖRDÜLŐ ÖSSZEG DETERMINISZTIKUS: a fájlok ÚTJUK szerint rendezve, minden sor `sha256  út`
// alakban, és a lista sha256-ja a `tree_digest`. Ugyanaz a fa ⇒ ugyanaz a szám, gépen át is.
//
// AMIT EZ NEM ÁLLÍT, kimondva: nem bizonyítja, hogy a mérés EZEKEN a bájtokon futott — azt a
// mérés-jelentések saját ideje és a munkafa tisztasága (`dirty`) együtt mondja meg. Azt bizonyítja,
// hogy MELYIK bájtokról beszélünk, és hogy azok utólag nem cserélhetők ki észrevétlenül.
//
// HASZNÁLAT: node tools/v3_hash_manifeszt.mjs [--out <fájl>] [--selftest]
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const require = createRequire(import.meta.url);
const { artifactPath } = require('../contracts/artifactNaming.js');
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
export const TOOL_VERSION = 'HSH-01/1';

/**
 * A MÉRT KÉSZLET: ami a mérést VÉGREHAJTJA vagy amit a mérés MÉR. A `var/` (generált), a
 * `node_modules/` (nem a miénk) és a `.git/` KIMARAD — ezt a lista KIMONDJA, nem hallgatólagos.
 */
export const MEASURED_ROOTS = Object.freeze(['v3app', 'v3ref', 'contracts', 'tools', 'tests', 'migrations']);
export const MEASURED_FILES = Object.freeze(['package.json', 'playwright.config.mjs']);
export const EXCLUDED = Object.freeze(['var', 'node_modules', '.git', 'docs/_olvashato']);
const EXT = Object.freeze(['.mjs', '.js', '.json', '.sql', '.css', '.html']);

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = join(dir, e.name);
    const rel = relative(ROOT, p).split(sep).join('/');
    if (EXCLUDED.some((x) => rel === x || rel.startsWith(`${x}/`))) continue;
    if (e.isDirectory()) walk(p, out);
    else if (EXT.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

/** Egy determinisztikus manifeszt a munkafáról. A sorrend az ÚT szerinti, nem a fájlrendszeré. */
export function manifest(root = ROOT) {
  const files = [];
  for (const r of MEASURED_ROOTS) files.push(...walk(join(root, r)));
  for (const f of MEASURED_FILES) { try { statSync(join(root, f)); files.push(join(root, f)); } catch { /* nincs */ } }
  const rows = files.map((p) => {
    const buf = readFileSync(p);
    return { path: relative(root, p).split(sep).join('/'), bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') };
  }).sort((a, b) => a.path.localeCompare(b.path));
  const list = rows.map((r) => `${r.sha256}  ${r.path}`).join('\n');
  return { rows, tree_digest: createHash('sha256').update(list).digest('hex'), files: rows.length, bytes: rows.reduce((s, r) => s + r.bytes, 0) };
}

function git(cmd) { try { return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return null; }
}

export function report(root = ROOT) {
  const m = manifest(root);
  const dirty = git('status --porcelain');
  return {
    tool: TOOL_VERSION,
    generated_at: new Date().toISOString(),
    // A HÁROM DOLOG KÜLÖN (R93 §8) — és a harmadik SZÁNDÉKOSAN hiányzik innen.
    source_commit: git('rev-parse HEAD'),
    source_branch: git('rev-parse --abbrev-ref HEAD'),
    worktree_dirty: dirty === null ? null : dirty.length > 0,
    tree_digest: m.tree_digest,
    report_commit: null,
    report_commit_note: 'A jelentést HORDOZÓ commit nem állhat itt: a manifeszt a commit TARTALMA, '
      + 'tehát önmagát nem azonosíthatja. A REPORT lap mondja ki, melyik commit hordozza — a '
      + 'két szám együtt zárja a láncot (R93 §8).',
    scope: { roots: [...MEASURED_ROOTS], files: [...MEASURED_FILES], excluded: [...EXCLUDED], extensions: [...EXT] },
    counts: { files: m.files, bytes: m.bytes },
    files: m.rows,
    verify: 'node tools/v3_hash_manifeszt.mjs --out - | grep tree_digest',
  };
}

export function selftest() {
  const out = [];
  const ok = (id, pass) => { out.push({ id, pass }); };
  const a = manifest();
  const b = manifest();
  ok('HSH-T1 ugyanaz a fa ⇒ ugyanaz a szám (determinisztikus)', a.tree_digest === b.tree_digest);
  ok('HSH-T2 a készlet nem üres, és minden sornak van tartalom-azonosítója',
    a.files > 50 && a.rows.every((r) => /^[0-9a-f]{64}$/.test(r.sha256) && r.path && r.bytes >= 0));
  ok('HSH-T3 a generált és idegen fa KIMARAD (var · node_modules · .git)',
    !a.rows.some((r) => EXCLUDED.some((x) => r.path === x || r.path.startsWith(`${x}/`))));
  // EGY BÁJT ELÉG: ha a manifeszt nem változik egy megváltozott fájlra, nem tartalom-azonosító.
  const rows = a.rows.map((r) => ({ ...r }));
  rows[0].sha256 = `${rows[0].sha256.slice(0, 63)}${rows[0].sha256.endsWith('0') ? '1' : '0'}`;
  const tampered = createHash('sha256').update(rows.map((r) => `${r.sha256}  ${r.path}`).join('\n')).digest('hex');
  ok('HSH-T4 EGY megváltozott bájt más gördülő összeget ad (a visszacsúszás látszik)', tampered !== a.tree_digest);
  // A SORREND NEM A FÁJLRENDSZERÉ: összekeverve UGYANAZT kell adnia.
  const shuffled = [...a.rows].reverse().sort((x, y) => x.path.localeCompare(y.path));
  ok('HSH-T5 a sorrend az ÚT szerinti, nem a bejárásé',
    createHash('sha256').update(shuffled.map((r) => `${r.sha256}  ${r.path}`).join('\n')).digest('hex') === a.tree_digest);
  const r = report();
  ok('HSH-T6 a jelentés-commit KIMONDOTTAN üres (önmagát nem azonosíthatja)',
    r.report_commit === null && typeof r.report_commit_note === 'string' && r.report_commit_note.length > 60
    && typeof r.source_commit === 'string' && r.tree_digest === a.tree_digest);
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--selftest')) {
    const rs = selftest();
    for (const r of rs) console.log(`${r.pass ? 'ZÖLD' : 'PIROS'}  ${r.id}`);
    const bad = rs.filter((x) => !x.pass).length;
    console.log(`RESULT: ${rs.length - bad}/${rs.length} ellenpróba ZÖLD`);
    process.exit(bad ? 1 : 0);
  }
  const i = process.argv.indexOf('--out');
  const rep = report();
  const out = i >= 0 ? process.argv[i + 1] : join(ROOT, artifactPath({ area: 'reports', kind: 'hash_manifeszt', ext: 'json', version: VERSION }));
  if (out === '-') { console.log(JSON.stringify(rep, null, 1)); process.exit(0); }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(rep, null, 1)}\n`);
  console.log(`HSH-01 — forrás-indulás ${String(rep.source_commit).slice(0, 12)} (${rep.source_branch})${rep.worktree_dirty ? ' · a munkafa NEM tiszta' : ' · tiszta munkafa'}`);
  console.log(`  mért készlet: ${rep.counts.files} fájl · ${rep.counts.bytes} bájt`);
  console.log(`  tartalom-azonosító (tree_digest): ${rep.tree_digest}`);
  console.log(`  a jelentés-commit KÜLÖN áll — a REPORT mondja ki (R93 §8)`);
  console.log(`  manifeszt: ${out}`);
}
