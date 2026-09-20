#!/usr/bin/env node
// GPR-02 — A JOGADÁSI UTAK NYILVÁNTARTÁSÁNAK VISSZAMÉRÉSE (R57 §2).
//
// A tábla `contracts/grantPathRegistry.js`-ben él. Ez az őr MINDKÉT IRÁNYBAN méri (KUKA-039):
//   GP01  minden deklarált belépési pont LÉTEZIK a megnevezett fájlban (a szimbólum definiálva van)
//   GP02  minden deklarált próba TÉNYLEG fut a `v3ref/run.mjs`-ben
//   GP03  zárt besorolás-szótár, kitöltött mezők, PADLÓ a néma zsugorodás ellen
//   GP04  MINDEN modul, ami JOGADÓ táblába ír, SZEREPEL a táblában — és fordítva: halott sor nincs
//   GP05  az ORG-N1a/b maradék-szövege KONKRÉT utat nevez meg a táblából, nem általánosságot
//
// A GP04 a lényeg: a lista nem kézi felsorolás, hanem a FORRÁSBÓL mért halmazhoz mért deklaráció —
// egy holnap született jogadó író magától PIROSRA viszi (KUKA-051).

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { CLASSIFICATIONS, GRANTING_TABLES, PATHS, PATH_FLOOR } = require(join(ROOT, 'contracts/grantPathRegistry.js'));

const fails = [];
const notes = [];
const fail = (id, msg) => fails.push(`${id} — ${msg}`);

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
/** A sor-megjegyzéseket LEVÁGJUK: egy kommentbeli INSERT nem író (KUKA-009: a jel a viselkedést mérje). */
const stripComments = (src) => src.split('\n')
  .map((l) => l.replace(/^\s*(\/\/|\*|\/\*).*$/, ''))
  .join('\n');

// ── GP01 + GP02 + GP03 ────────────────────────────────────────────────────────────────────────
const runSrc = read('v3ref/run.mjs');
const probeIds = new Set([...runSrc.matchAll(/probe\(\s*'([^']+)'/g)].map((m) => m[1]));
notes.push(`a run.mjs ${probeIds.size} próbát deklarál`);

if (PATHS.length < PATH_FLOOR) fail('GP03', `a tábla ${PATHS.length} utat sorol, a padló ${PATH_FLOOR}`);
const seenIds = new Set();
for (const p of PATHS) {
  if (seenIds.has(p.id)) fail('GP03', `ismétlődő azonosító: ${p.id}`);
  seenIds.add(p.id);
  if (!Object.hasOwn(CLASSIFICATIONS, p.classification)) {
    fail('GP03', `${p.id}: ismeretlen besorolás (${p.classification})`);
  }
  for (const field of ['entry_point', 'granted_right', 'basis_storage', 'grant_gate', 'use_gate', 'norm', 'works', 'missing']) {
    if (typeof p[field] !== 'string' || p[field].trim().length < 4) {
      fail('GP03', `${p.id}: a(z) "${field}" mező üres vagy túl rövid`);
    }
  }
  let src = null;
  try { src = read(p.module); } catch { fail('GP01', `${p.id}: a modul nem létezik (${p.module})`); }
  if (src) {
    const defined = new RegExp(`(export\\s+)?(async\\s+)?(function|const|let)\\s+${p.symbol}\\b`).test(src);
    if (!defined) fail('GP01', `${p.id}: a(z) ${p.symbol} szimbólum NINCS definiálva a ${p.module} fájlban`);
  }
  for (const id of p.probes) {
    if (!probeIds.has(id)) fail('GP02', `${p.id}: a hivatkozott próba nem fut (${id})`);
  }
  // A TERMÉKBELI felületnek legalább EGY mérése legyen — különben az állítás mögött nincs semmi.
  if (p.classification === 'product_grant_surface' && p.probes.length === 0) {
    fail('GP02', `${p.id}: termékbeli jogadási felület MÉRÉS nélkül`);
  }
}

// ── GP04 — A FORRÁSBÓL MÉRT ÍRÓK ──────────────────────────────────────────────────────────────
const declaredModules = new Set(PATHS.flatMap((p) => [p.module, ...(p.extra_modules || [])]));
const measuredModules = new Set();
const tableRe = new RegExp(`INSERT\\s+INTO\\s+(${GRANTING_TABLES.join('|')})\\b`, 'g');
for (const name of readdirSync(join(ROOT, 'v3ref')).filter((f) => f.endsWith('.mjs'))) {
  const rel = `v3ref/${name}`;
  const src = stripComments(read(rel));
  if ([...src.matchAll(tableRe)].length > 0) measuredModules.add(rel);
}
notes.push(`jogadó táblába író modul MÉRVE: ${[...measuredModules].sort().join(' · ')}`);
for (const m of measuredModules) {
  if (!declaredModules.has(m)) fail('GP04', `a(z) ${m} jogadó táblába ír, de a tábla nem sorolja fel`);
}
// A FORDÍTOTT IRÁNY. Egy jogadási út NEM köteles maga írni: a beváltás SZÁNDÉKOSAN átruházza az
// írást (`grantMembership` · `recordGrantBasis`), és pont ettől születik a tagság egy helyen. Ezért
// a deklarált sor akkor ép, ha MAGA ír, VAGY egy MÁSIK deklarált út szimbólumát HÍVJA — de a
// delegálást KI KELL MONDANI, és a hívást MÉRJÜK (KUKA-041: a néma feltevés nem védelem).
for (const p of PATHS) {
  const mods = [p.module, ...(p.extra_modules || [])];
  if (mods.some((m) => measuredModules.has(m))) continue;
  const targets = p.delegates_to || [];
  if (targets.length === 0) {
    fail('GP04', `a(z) ${p.id} sem jogadó táblába nem ír, sem delegálást nem mond ki — halott sor`);
    continue;
  }
  let src = '';
  try { src = stripComments(read(p.module)); } catch { /* GP01 már jelentette */ }
  for (const t of targets) {
    if (!new RegExp(`\\b${t}\\s*\\(`).test(src)) {
      fail('GP04', `a(z) ${p.id} a(z) ${t} delegálását mondja ki, de MÉRVE nem hívja`);
    }
  }
}

// ── GP05 — A HIÁNY-SZÖVEG KONKRÉT UTAT NEVEZ ──────────────────────────────────────────────────
const normsSrc = read('v3ref/norms.mjs');
const knownIds = PATHS.map((p) => p.id);
for (const clause of ['ORG-N1a', 'ORG-N1b']) {
  const at = normsSrc.indexOf(`id: '${clause}'`);
  if (at < 0) { fail('GP05', `a(z) ${clause} klauzula nem található a norms.mjs-ben`); continue; }
  const block = normsSrc.slice(at, at + 9000);
  const remAt = block.indexOf('remaining:');
  if (remAt < 0) { fail('GP05', `${clause}: nincs remaining szöveg`); continue; }
  const rem = block.slice(remAt, remAt + 3000);
  if (!knownIds.some((id) => rem.includes(id))) {
    fail('GP05', `${clause}: a maradék-szöveg egyetlen konkrét jogadási utat sem nevez meg `
      + `(a GPR-01 azonosítói közül) — az általános hiány-mondat nem mérhető`);
  }
}

// ── JELENTÉS ──────────────────────────────────────────────────────────────────────────────────
const line = '='.repeat(78);
console.log(line);
console.log('GPR-02 — A JOGADÁSI UTAK NYILVÁNTARTÁSA (R57 §2)');
console.log(line);
for (const p of PATHS) console.log(`  ${p.classification === 'product_grant_surface' ? '●' : '○'} ${p.id.padEnd(28)} ${p.entry_point}`);
for (const n of notes) console.log(`  ${n}`);
console.log('-'.repeat(78));
if (fails.length) {
  for (const f of fails) console.log(`  PIROS: ${f}`);
  console.log(`RESULT: ${fails.length} HIBA — a tábla és a forrás nincs szinkronban`);
  process.exit(1);
}
console.log(`RESULT: ${PATHS.length}/${PATHS.length} PASS — minden deklarált út létezik és mérve van, `
  + 'és minden jogadó író szerepel a táblában');
