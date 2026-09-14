#!/usr/bin/env node
/**
 * R83 — A KÜLSŐ FÉL KÉT PRÓBÁJA, BURKOLÓVAL (EXT-01).
 *
 * MI EZ. A külső fél (chatgpt-v3) R83-as programjai a `r83_merge_chatgpt-v3.core.mjs` (összefűzés-
 * próba) és a `r83_runner_chatgpt-v3.core.mjs` (futtató-próba) fájlokban állnak **úgy, ahogy a
 * lapjukon megérkeztek** — egyetlen karaktert sem írtunk át bennük.
 *
 * A PONTOS ÁLLÍTÁS (az R83 §6 helyesbítése után): a program TESTE karakterre azonos a lapjukon
 * álló szöveggel; a ZÁRÓ SORTÖRÉS eltérhet az ő saját példányuktól, mert a szöveget a
 * markdown-kódblokkból nyertük ki. „Bájtazonost" nem állítunk — az mérhető tény, és nem mértük
 * (KUKA-033: a levezetett állítás nem bizonyíték, amíg a mérése le nem futott).
 *
 * MIT MÉRNEK.
 *   ÖSSZEFŰZÉS (4 eset) · `P01-genuine` a pozitív kontroll; `F01-missing-probe-status` és
 *                       `F01-unknown-probe-status` a próba-állapot törlése és ismeretlenre
 *                       állítása; `F02-remove-required-row` UGYANANNAK az egy REV-N3a állítás-
 *                       sornak a kivétele MINDEN egységből.
 *   FUTTATÓ (3 eset)    · `all-green` a pozitív kontroll; `original-real-failure` egy VALÓDI
 *                       (nem időtúllépéses) eset-hiba az eredeti `r57`-en; `original-and-sub-
 *                       failure` ugyanaz az adaptált helyettessel együtt. A futtató-próba a VALÓDI
 *                       `run-all.mjs`-t futtatja SZINTETIKUS program-kimenetekkel — a külső fél
 *                       kimondta, hogy ez nem termék-működési állítás, hanem a besorolás mérése.
 *
 * A KÉT FUTÁS KÜLÖN NEVEZVE. A JAVÍTÁS ELŐTTI forráson (`594f49f`) **összefűzés 1 PASS / 3 FAIL**
 * és **futtató 2 PASS / 1 FAIL** — pontosan az általuk közölt reprodukció —, a mai forráson
 * **4/0** és **3/0**. TESZTADAPTÁCIÓ NEM TÖRTÉNT: egyetlen elvárást sem írtunk át (R83 §7:
 * „Az elvárásokat ne puhítsd a jelenlegi implementációhoz").
 *
 * MIÉRT KELL MÉGIS EZ A FÁJL. Az összefűzés-próba a SAJÁT, VALÓDI egységeinken dolgozik
 * (`evidence/genuine-units/`), tehát a környezetét elő kell ÁLLÍTANI: le kell futtatni a darabolt
 * battériát, és az eredményét oda kell tenni. Kézzel ez üzengetés volna (KUKA-072). A SAJÁT
 * egységeket állítjuk elő, nem a szomszéd program hagyatékát használjuk — a program-közti
 * szennyeződés a SAJÁT R81-es leletem volt (KUKA-127).
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PIN = JSON.parse(readFileSync(join(HERE, 'source-manifest.json'), 'utf8')).commit;
const UNITS = 4;

const runNode = (file, opts = {}) => spawnSync(process.execPath, [file], {
  cwd: HERE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts,
});

// ── (1) A VALÓDI EGYSÉGEK ELŐÁLLÍTÁSA az összefűzés-próbához ────────────────────────────────────
const MUTATE = join(HERE, 'source', 'v3ref', 'mutate.mjs');
const GENUINE = join(HERE, 'evidence', 'genuine-units');
const unitProblems = [];
if (existsSync(MUTATE)) {
  rmSync(join(HERE, 'source', 'v3ref', 'units'), { recursive: true, force: true });
  rmSync(GENUINE, { recursive: true, force: true });
  mkdirSync(GENUINE, { recursive: true });
  for (let k = 1; k <= UNITS; k += 1) {
    const r = spawnSync(process.execPath, [MUTATE, `--unit=${k}/${UNITS}`], {
      cwd: join(HERE, 'source'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300_000,
    });
    if (r.status !== 0) unitProblems.push(`a ${k}/${UNITS} egység NEM nullával zárt (${r.status})`);
  }
  const src = join(HERE, 'source', 'v3ref', 'units');
  const files = existsSync(src) ? readdirSync(src).filter((f) => f.endsWith('.json')) : [];
  for (const f of files) cpSync(join(src, f), join(GENUINE, f));
  if (files.length !== UNITS) unitProblems.push(`${files.length} egység-fájl született a várt ${UNITS} helyett`);
} else {
  unitProblems.push('a lemásolt forrásban nincs `v3ref/mutate.mjs` — a valódi egységek nem állíthatók elő');
}

// ── (2) AZ ÖSSZEFŰZÉS-PRÓBA, VÁLTOZATLANUL ──────────────────────────────────────────────────────
const merge = unitProblems.length ? null : runNode(join(HERE, 'r83_merge_chatgpt-v3.core.mjs'));
if (merge) {
  process.stdout.write(String(merge.stdout || ''));
  if (merge.stderr) process.stderr.write(merge.stderr);
}

// ── (3) A FUTTATÓ-PRÓBA, VÁLTOZATLANUL ──────────────────────────────────────────────────────────
// A SAJÁT egység-fájljainkat a próba előtt eltakarítjuk a lemásolt forrásból: a futtató-próba a
// `run-all.mjs` besorolását méri, és a generált állapot nem a MÉRT forrás része (KUKA-127).
rmSync(join(HERE, 'source', 'v3ref', 'units'), { recursive: true, force: true });
rmSync(join(HERE, 'source', 'v3ref', 'v3ref-mutation-result.json'), { force: true });
const runner = runNode(join(HERE, 'r83_runner_chatgpt-v3.core.mjs'));
process.stdout.write(String(runner.stdout || ''));
if (runner.stderr) process.stderr.write(runner.stderr);

// ── (4) AZ ARTEFAKTUM ───────────────────────────────────────────────────────────────────────────
// A KÉT PROGRAM MAGA ÍRJA a részleteset (`evidence/merge-r83.json` · `runner-r83.json`). Ezeket
// VÁLTOZATLANUL vesszük át, és csak a commit-kötést tesszük mellé. A futtató-próba sorai `mode`
// néven hordozzák az azonosítót — az előtagot és a névre fordítást a BURKOLÓ teszi, a programok
// szövege érintetlen.
const readJson = (p) => { try { return JSON.parse(readFileSync(join(HERE, 'evidence', p), 'utf8')); } catch { return null; } };
const mergeOut = readJson('merge-r83.json');
const runnerOut = readJson('runner-r83.json');
const prefixed = (part, rows) => (Array.isArray(rows)
  ? rows.map((c) => ({ id: `${part}/${(c && (c.id ?? c.mode)) ?? '(névtelen)'}`, pass: c && c.pass === true, result: c }))
  : []);
const cases = [...prefixed('merge', mergeOut && mergeOut.cases), ...prefixed('runner', runnerOut && runnerOut.cases)];
for (const p of unitProblems) cases.push({ id: `merge/KORNYEZET-${cases.length}`, pass: false, result: { error: p } });

const out = {
  program: 'r83_merge_chatgpt-v3.core.mjs + r83_runner_chatgpt-v3.core.mjs',
  source_commit: PIN,
  node: process.version,
  at: new Date().toISOString(),
  verbatim: true,
  genuine_units: { requested: UNITS, problems: unitProblems },
  merge: mergeOut,
  runner: runnerOut,
  runner_scope: 'a VALÓDI run-all.mjs, SZINTETIKUS program-kimenetekkel — a külső fél kimondott '
    + 'hatóköre: ez a besorolás mérése, nem termék-működési állítás és nem az r57 új hibájának állítása',
  cases,
  passed: cases.filter((c) => c.pass).length,
  failed: cases.filter((c) => !c.pass).length,
  cases_mapped_from: 'a két program SAJÁT `cases` listája, `merge/` és `runner/` előtaggal',
};
writeFileSync(join(HERE, 'evidence/r83-core-challenge.json'), `${JSON.stringify(out, null, 2)}\n`);
process.exitCode = (merge && merge.status === 0 && runner.status === 0 && unitProblems.length === 0) ? 0 : 1;
