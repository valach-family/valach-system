// R79 §6 — A FUTÁS SZERZŐDÉSE (RUN-02), ÚJRAFOGALMAZVA A DARABOLT FUTÁSRA.
//
// MIÉRT VAN EZ A PROGRAM. A külső fél R59-es és R57-es programja a mutációs battériát EGYETLEN
// hívásban futtatja, 15 000 ms-os időkorláttal. Ez a korlát az ő gépükön bőven elég volt (ott a
// battéria 1,7 mp), a MI mai futtató-gépünkön viszont NEM: 4 vCPU mellett a teljes battéria
// legjobb mért alakja 17,1 mp (párhuzamosság 4 · 6 · 8 · 16 mind 17–19 mp között). Ezért az ő
// programjuk nálunk ETIMEDOUT-tal áll meg — a MÉRÉS akad el, nem a kód bukik.
//
// EZT NEM HALLGATJUK EL, ÉS NEM IS ÍRJUK ÁT AZ Ő PROGRAMJUKAT (az a lánc alapja: az idegen
// programot VÁLTOZATLANUL futtatjuk). A helyes válasz a KUKA-089 szerint: mérjük meg a PONTOS
// technikai akadályt, és állítsuk elő azt a futtatási alakot, amiben a próba MÉGIS elvégezhető.
// Ez a program ezért UGYANAZOKAT az állításokat méri, csak a DARABOLT futáson (`--unit` + `--merge`).
// A DARABSZÁM futtatási paraméter (R8 §3), és a `v3ref/batteryUnits.mjs` deklarált otthonából jön —
// NEM ebbe a fájlba beégetve. Miért: az első alak `--unit=k/4`-et használt, és amikor a battéria
// 134 → 145 mutációra nőtt, a négyes bontás egységei átlépték a `mutate.mjs` saját költségvetését
// (12 000 ms = a külső korlát 80%-a), ezért az U04-es POZITÍV ELLENPÁR pirosra ment egy ép
// rendszeren — a program tárgya viszont a futás SZERZŐDÉSE, nem a négyes szám (KUKA-129).
//
// AMIT MÉR (mind a három a battéria-szerződés egy-egy kijáratát támadja):
//   U01  a hamisított bizonyíték az EGYSÉG-módban is elutasításra fut (az R57/E03 · R59/E07 alakja)
//   U02  az összefűzés NEM ad teljes összefoglalót hiányzó egységre (R59/F02 szabálya magunkra)
//   U03  az összefűzés NEM fogad be MÁS FORRÁSON készült egységet (KUKA-127 · KUKA-128)
//   U04  POZITÍV ELLENPÁR: a teljes, érintetlen darabolt futás ELFOGADOTT — enélkül a fenti három
//        egy „mindent elutasítok" alakkal is teljesülne (KUKA-092 · KUKA-049)
import { readFileSync, writeFileSync, cpSync, mkdtempSync, rmSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { batteryUnits, unitArgs } from './batteryUnits.mjs';

const root = import.meta.dirname;

// A DARABSZÁM NEM EBBEN A PROGRAMBAN LAKIK (KUKA-129). Az első alak `--unit=k/4`-et égetett be, és
// amikor a battéria 134 → 145 mutációra nőtt, a négyes bontás átlépte a `mutate.mjs` SAJÁT
// költségvetését: az U04-es POZITÍV ELLENPÁR pirosra ment egy ép rendszeren. A program tárgya a
// futás SZERZŐDÉSE („darabolható, és a teljesség külön mező"), nem a négyes szám — ezért a
// darabszámot ugyanabból a deklarált otthonból veszi, amit a söprés útja is használ.
const UNITS = batteryUnits();
const UNIT_ARGS = unitArgs(UNITS);
const unitName = (k) => `unit-${k}-of-${UNITS}.json`;
const src = join(root, 'source');
const pin = JSON.parse(readFileSync(join(root, 'source-manifest.json'), 'utf8')).commit;
const cases = [];

// A KORLÁT UGYANAZ, AMIT A KÜLSŐ FÉL HASZNÁL — az egész program lényege, hogy EBBE beleférjen.
const CAP_MS = 15000;
function run(dir, args) {
  const r = spawnSync(process.execPath, [join(dir, 'v3ref', 'mutate.mjs'), ...args],
    { cwd: dir, encoding: 'utf8', timeout: CAP_MS, maxBuffer: 32 * 1024 * 1024 });
  return { exit: r.status, timed_out: !!r.error, error: r.error ? String(r.error.message || r.error) : null,
    stdout: r.stdout || '', stderr: r.stderr || '' };
}
function copy(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'r79-'));
  try { cpSync(src, dir, { recursive: true }); return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}
function replace(path, from, to) {
  const s = readFileSync(path, 'utf8');
  if (s.split(from).length !== 2) throw Error(`Anchor not unique: ${from}`);
  writeFileSync(path, s.replace(from, to));
}
function add(id, expected, fn) {
  try { cases.push({ id, expected, ...fn() }); }
  catch (e) { cases.push({ id, expected, pass: false, test_error: e.stack }); }
}
const unitsOf = (dir) => { try { return readdirSync(join(dir, 'v3ref', 'units')).sort(); } catch { return []; } };
const resultOf = (dir) => JSON.parse(readFileSync(join(dir, 'v3ref', 'v3ref-mutation-result.json'), 'utf8'));

// U04 — POZITÍV ELLENPÁR ELŐSZÖR: az érintetlen darabolt futás TELJES és TISZTA, és MINDEN egység
// belefér a külső korlátba. Ez a program alapja: ha ez nem áll, a többi eset semmit nem mond.
add('U04', 'Untouched chunked run: every unit fits the external cap and the merge is complete and clean.', () => copy((dir) => {
  const us = UNIT_ARGS.map((a) => run(dir, [a]));
  const m = run(dir, ['--merge']);
  const result = resultOf(dir);
  return {
    pass: us.every((u) => u.exit === 0 && !u.timed_out) && m.exit === 0
      && result.run_state === 'complete' && result.clean === true && result.portable === true
      && result.coverage.missing.length === 0 && result.coverage.duplicated.length === 0
      && result.coverage.seen === result.coverage.expected,
    units: unitsOf(dir),
    unit_exits: us.map((u) => u.exit), merge_exit: m.exit,
    unit_walls: result.units.map((u) => u.wall_ms), cap_ms: CAP_MS,
    run_state: result.run_state, clean: result.clean, portable: result.portable, coverage: result.coverage,
  };
}));

// U01 — HAMISÍTOTT BIZONYÍTÉK AZ EGYSÉG-MÓDBAN. Ugyanaz a horgony, amit a külső fél R57/E03 és
// R59/E07 esete használ; a különbség CSAK a futtatási alak. Az egységnek NEM NULLÁVAL kell zárnia.
add('U01', 'Forged evidence is rejected in unit mode too (the R57/E03 and R59/E07 attack, chunked).', () => copy((dir) => {
  replace(join(dir, 'v3ref/mutate.mjs'),
    'const mutationResults = results.map((r) => r.falsification).filter(Boolean);',
    "const mutationResults = results.map((r) => r.falsification).filter(Boolean)"
    + ".map(x => ({...x, base_digest: 'sha256:foreign-base', run_token: 'old-run', mutated_digest: 'sha256:foreign-mutated'}));");
  const u1 = run(dir, [UNIT_ARGS[0]]);
  return { pass: u1.exit !== 0 && !u1.timed_out, unit_exit: u1.exit, timed_out: u1.timed_out,
    note: 'az egység a SAJÁT szülői főkönyvéhez méri a bizonyítékot (R57/F02 · R59/F01) — az idegen csomag ott sem megy át' };
}));

// U02 — HIÁNYZÓ EGYSÉG. A teljes összefoglaló FELTÉTELE, hogy minden mutáció pontosan egyszer
// szerepeljen. A hiány NEVEZETT, és `run_state: 'incomplete'` — nem „majdnem kész", és nem is a
// kód hibája (KUKA-124/2: a hiánynak saját válasza jár).
add('U02', 'The merge refuses to produce a complete summary when a unit is missing.', () => copy((dir) => {
  run(dir, [UNIT_ARGS[0]]);
  const m = run(dir, ['--merge']);
  const result = resultOf(dir);
  return {
    pass: m.exit === 2 && result.run_state === 'incomplete' && result.clean === null
      && result.coverage.missing.length > 0,
    merge_exit: m.exit, run_state: result.run_state, clean: result.clean,
    missing_count: result.coverage.missing.length, why: result.why,
  };
}));

// U03 — MÁS FORRÁSON KÉSZÜLT EGYSÉG. Két egység csak akkor fűzhető össze, ha UGYANARRA a forrásra
// hivatkoznak, és az a MA mért lenyomat — különben egy tegnapi (vagy idegen) mérés olvadna be.
add('U03', 'The merge refuses a unit that points at a different source digest.', () => copy((dir) => {
  for (const a of UNIT_ARGS) run(dir, [a]);
  const f = join(dir, 'v3ref', 'units', unitName(2));
  const u = JSON.parse(readFileSync(f, 'utf8'));
  const original = u.base_digest;
  u.base_digest = 'sha256:idegen-forras';
  writeFileSync(f, JSON.stringify(u, null, 2));
  const m = run(dir, ['--merge']);
  const result = resultOf(dir);
  return {
    pass: m.exit === 2 && result.run_state === 'incomplete' && result.clean === null
      && result.why.some((w) => w.includes('MÁS FORRÁSRA')),
    merge_exit: m.exit, run_state: result.run_state, clean: result.clean,
    original_digest: original, why: result.why,
  };
}));

writeFileSync(join(root, 'evidence/r79-run-contract.json'),
  `${JSON.stringify({ source_commit: pin, node: process.version, at: new Date().toISOString(), cap_ms: CAP_MS, cases }, null, 2)}\n`);
console.log(JSON.stringify(cases.map(({ id, pass, test_error }) => ({ id, pass, test_error })), null, 2));
