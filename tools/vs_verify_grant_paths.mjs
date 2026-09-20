#!/usr/bin/env node
// GPR-02 — A JOGADÁSI UTAK NYILVÁNTARTÁSÁNAK VISSZAMÉRÉSE (R57 §2 · R59/F59-02 szerint SZŰKÍTVE).
//
// MIT MÉR EZ AZ ŐR, PONTOSAN. STRUKTURÁLIS, SZÖVEG-SZINTŰ vizsgálat a `v3ref/*.mjs` fájlokon.
// NEM hívási lánc-elemző, NEM általános JS/SQL elemző, és a próbákat NEM futtatja le.
//
//   GP01  a deklarált szimbólum DEFINIÁLVA van a megnevezett fájlban (szövegben keresve)
//   GP02  a hivatkozott próba-azonosító SZEREPEL a `v3ref/run.mjs` deklarációi között (nem futtatás)
//   GP03  zárt besorolás-szótár, kitöltött mezők, PADLÓ a néma zsugorodás ellen
//   GP04  MODUL-SZINT: minden `v3ref/*.mjs`, amiben JOGADÓ TÁBLÁRA menő SQL-írás áll, szerepel a
//         táblában — és fordítva, a deklarált sor vagy maga ír, vagy KIMONDOTT delegálást mér
//   GP06  MODULON BELÜLI ARÁNYOS ELLENŐRZÉS: a jogadó írás-helyek DARABSZÁMA modulonként
//         deklarált; egy már felsorolt modulba írt ÚJ jogadó út megemeli a számot ⇒ PIROS
//   GP05  az ORG-N1a/b maradék-szövege KONKRÉT utat nevez meg a táblából, nem általánosságot
//
// ═══ AMIT EZ AZ ŐR NEM BIZONYÍT — KIMONDVA (R59/F59-02) ════════════════════════════════════════
//
// A külső ellenőrző fél HÁROM izolált ellenpéldával mérte meg az R57-es alak hatókörét, és
// MINDHÁRMAT reprodukáltam a saját fánkon:
//   (1) új modul, sima `INSERT INTO membership`      → kilépés 1  (az őr helyesen fogta)
//   (2) ugyanaz `INSERT OR IGNORE INTO membership`   → kilépés 0  (ELSZALASZTOTTA — a minta hiánya)
//   (3) új függvény egy MÁR FELSOROLT modulban       → kilépés 0  (ELSZALASZTOTTA — modul-szint)
//
// A (2) a minta hibája volt: javítva (az `INSERT OR …` és a `REPLACE INTO` alak is jogadó írás).
// A (3) a GRANULARITÁS határa: erre a GP06 arányos, célzott válasz (írás-hely darabszám), NEM
// hívási lánc-elemzés. Ezért az R58-as állítás — „minden jogadó író szerepel a táblában, holnap
// nem tud némán elavulni" — TÚL ERŐS VOLT, és itt szűkítve áll:
//
//   KIMONDOTT KÉZI FELÜLVIZSGÁLATI HATÁR: a FÜGGVÉNY-szintű teljesség és a HÍVÓ-besorolás
//   (ki hívja ma ezt az utat, és milyen rétegből) NEM gépileg bizonyított. Az őr a jogadó
//   SQL-írás HELYÉT és DARABSZÁMÁT méri, nem azt, hogy melyik függvényben áll és ki hívja.
//   Új jogadó út bevezetésekor a besorolás EMBERI döntés, amit a GP06 csak kikényszerít, hogy
//   ne lehessen NÉMÁN megtenni (KUKA-041: a kapu nem fal, de a hiány nem lehet néma).
//
// A `--selftest` kapcsoló a három ellenpéldát egy ELDOBHATÓ MÁSOLATON lefuttatja, és megköveteli,
// hogy MIND A HÁROM pirosra vigye az őrt — a pozitív ellenpár az ép fán mért zöld (KUKA-089:
// a „bizonyítottan piros" állítás maga is mérés).

import { readFileSync, readdirSync, writeFileSync, appendFileSync, cpSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { CLASSIFICATIONS, GRANTING_TABLES, GRANT_WRITE_SITES, PATHS, PATH_FLOOR } = require(join(ROOT, 'contracts/grantPathRegistry.js'));

// ═══ ÖNPRÓBA — A HÁROM ELLENPÉLDA (R59/F59-02) ════════════════════════════════════════════════
// A `--selftest` egy ELDOBHATÓ MÁSOLATON rontja el a fát, és megköveteli, hogy MINDHÁROM alak
// PIROSRA vigye az őrt. A „bizonyítottan piros" állítás maga is mérés (KUKA-089), és a KILÉPÉSI
// KÓDON mérjük, nem a kimenet szövegén (KUKA-094/4). Az ép fán mért zöld a pozitív ellenpár.
const GRANT_SQL = "'INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)'";
const IGNORE_SQL = "'INSERT OR IGNORE INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)'";
const COUNTEREXAMPLES = Object.freeze([
  Object.freeze({ id: 'CX1', why: 'ÚJ modul, sima INSERT — az R57-es alak is fogta',
    apply: (dir) => writeFileSync(join(dir, 'v3ref/auditNewWriter.mjs'),
      `export function auditNewWriter(store) {\n  store.run(${GRANT_SQL}, 'x', 'a', 'user', '2026-01-01T00:00:00.000Z');\n}\n`) }),
  Object.freeze({ id: 'CX2', why: 'ÚJ modul, INSERT OR IGNORE — az R57-es alak ELSZALASZTOTTA',
    apply: (dir) => writeFileSync(join(dir, 'v3ref/auditNewWriter.mjs'),
      `export function auditNewWriter(store) {\n  store.run(${IGNORE_SQL}, 'x', 'a', 'user', '2026-01-01T00:00:00.000Z');\n}\n`) }),
  Object.freeze({ id: 'CX3', why: 'ÚJ függvény egy MÁR FELSOROLT modulban — az R57-es alak ELSZALASZTOTTA',
    apply: (dir) => appendFileSync(join(dir, 'v3ref/scopeGrant.mjs'),
      `\nexport function freshUnregisteredWriter(store) {\n  store.run(${GRANT_SQL}, 'x', 'a', 'user', '2026-01-01T00:00:00.000Z');\n}\n`) }),
]);

function runSelfTest() {
  const line = '='.repeat(78);
  console.log(line);
  console.log('GPR-02 ÖNPRÓBA — a három R59/F59-02 ellenpélda a KILÉPÉSI KÓDON mérve');
  console.log(line);
  let bad = 0;
  for (const cx of COUNTEREXAMPLES) {
    const dir = mkdtempSync(join(tmpdir(), 'gpr-selftest-'));
    try {
      for (const d of ['contracts', 'tools', 'v3ref']) {
        cpSync(join(ROOT, d), join(dir, d), { recursive: true, filter: (p2) => !p2.includes('node_modules') });
      }
      cx.apply(dir);
      const r = spawnSync(process.execPath, [join(dir, 'tools/vs_verify_grant_paths.mjs')],
        { encoding: 'utf8', timeout: 60000 });
      const red = r.status === 1;
      console.log(`  ${red ? 'ZÖLD ' : 'PIROS'} [${cx.id}] ${cx.why} → kilépés ${r.status}`
        + `${red ? ' (helyesen PIROS)' : ' — AZ ŐR ÁTENGEDTE'}`);
      if (!red) bad += 1;
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
  console.log('-'.repeat(78));
  if (bad) { console.log(`RESULT: ${bad}/${COUNTEREXAMPLES.length} ellenpélda ÁTMENT — az őr nem fog`); process.exit(1); }
  console.log(`RESULT: ${COUNTEREXAMPLES.length}/${COUNTEREXAMPLES.length} ellenpélda bizonyítottan PIROS`);
  console.log('  KIMONDVA: ez a három ALAK van mérve, nem „minden lehetséges jogadó út" — a');
  console.log('  függvény-szintű teljesség és a hívó-besorolás KÉZI felülvizsgálati határ marad.');
}

if (process.argv.includes('--selftest')) { runSelfTest(); process.exit(0); }

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
  if (p.classification === 'internal_reference_entry_point' && p.probes.length === 0) {
    fail('GP02', `${p.id}: belső referencia-belépési pont MÉRÉS nélkül`);
  }
}

// ── GP04 — A FORRÁSBÓL MÉRT ÍRÓK ──────────────────────────────────────────────────────────────
const declaredModules = new Set(PATHS.flatMap((p) => [p.module, ...(p.extra_modules || [])]));
const measuredModules = new Set();
// AZ ÍRÁS-ALAKOK NEVEZETT LISTÁJA (R59/F59-02 (2) ellenpélda). A `INSERT OR IGNORE` ugyanúgy
// jogadó írás, mint a sima `INSERT`; a `REPLACE INTO` a SQLite-ban ennek rövidítése.
const WRITE_FORMS = 'INSERT(?:\\s+OR\\s+(?:IGNORE|REPLACE|ABORT|FAIL|ROLLBACK))?\\s+INTO|REPLACE\\s+INTO';
const tableRe = new RegExp(`(?:${WRITE_FORMS})\\s+(${GRANTING_TABLES.join('|')})\\b`, 'gi');
const siteCount = new Map();
for (const name of readdirSync(join(ROOT, 'v3ref')).filter((f) => f.endsWith('.mjs'))) {
  const rel = `v3ref/${name}`;
  const src = stripComments(read(rel));
  const n = [...src.matchAll(tableRe)].length;
  if (n > 0) { measuredModules.add(rel); siteCount.set(rel, n); }
}
notes.push(`jogadó SQL-írás-helyet tartalmazó modul MÉRVE (${measuredModules.size}): `
  + [...siteCount.entries()].sort().map(([m, n]) => `${m.replace('v3ref/', '')}×${n}`).join(' · '));
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

// ── GP06 — MODULON BELÜLI ARÁNYOS ELLENŐRZÉS (R59/F59-02, (3) ellenpélda) ─────────────────────
// Az írás-helyek SZÁMA modulonként deklarált. Egy MÁR FELSOROLT modulba írt ÚJ jogadó út megemeli
// a számot ⇒ PIROS. A mérési előkészítők deklaráltan VÁLTOZÓK (KUKA-045 — lásd a regiszter indokát).
let pinned = 0;
for (const [mod, declared] of Object.entries(GRANT_WRITE_SITES)) {
  const measured = siteCount.get(mod);
  if (measured === undefined) {
    fail('GP06', `a(z) ${mod} írás-hely száma deklarált (${declared}), de MÉRVE nincs benne jogadó írás`);
    continue;
  }
  if (declared === 'variable') continue;
  pinned += 1;
  if (measured !== declared) {
    fail('GP06', `a(z) ${mod} jogadó írás-helyeinek száma MÉRVE ${measured}, deklarálva ${declared} — `
      + 'egy új jogadó út került a modulba (vagy egy régi tűnt el): a BESOROLÁSÁT ki kell mondani '
      + 'a GPR-01 táblában, nem elég a számot átírni');
  }
}
for (const mod of siteCount.keys()) {
  if (!Object.hasOwn(GRANT_WRITE_SITES, mod)) {
    fail('GP06', `a(z) ${mod} jogadó írást tartalmaz, de az írás-hely száma nincs deklarálva`);
  }
}
notes.push(`GP06: ${pinned} modul rögzített írás-hely számmal · `
  + `${Object.values(GRANT_WRITE_SITES).filter((v) => v === 'variable').length} deklaráltan VÁLTOZÓ (mérési előkészítő)`);

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
for (const p of PATHS) console.log(`  ${p.classification === 'internal_reference_entry_point' ? '●' : '○'} ${p.id.padEnd(28)} ${p.entry_point}`);
for (const n of notes) console.log(`  ${n}`);
console.log('-'.repeat(78));
if (fails.length) {
  for (const f of fails) console.log(`  PIROS: ${f}`);
  console.log(`RESULT: ${fails.length} HIBA — a tábla és a forrás nincs szinkronban`);
  process.exit(1);
}
console.log(`RESULT: ${PATHS.length}/${PATHS.length} PASS — a deklarált szimbólumok és próba-azonosítók `
  + 'megvannak, minden jogadó SQL-írást tartalmazó modul szerepel a táblában, és az írás-helyek '
  + 'száma a deklarálttal egyezik');
console.log('  A MÉRÉS HATÁRA, KIMONDVA: ez STRUKTURÁLIS, szöveg-szintű vizsgálat a v3ref/*.mjs');
console.log('  fájlokon — NEM hívási lánc-elemzés, és a próbákat NEM futtatja. A FÜGGVÉNY-szintű');
console.log('  teljesség és a HÍVÓ-besorolás KÉZI felülvizsgálati határ (R59/F59-02).');
