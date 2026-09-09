#!/usr/bin/env node
// Valach System — KUKA (kivezetett megoldások) + ÁLLANDÓ OPERÁTORI SZABÁLYOK verifier.
// READ-ONLY + offline. Exit 0/1.
//
// A V2-ből átjött 89 tanulság AKTÍV MEMÓRIA: ami itt nincs, az a következő körben nem létezik.
// Ez az őr a V2-belihez képest EGY dologgal többet tud, és épp azért, mert új repó vagyunk:
//
//   KUK01  a regiszter alakja (kötelező mezők, egyedi azonosítók, guard_note ha nincs jel)
//   KUK02  a kivezetett minták NEM jöttek vissza — CSAK az ITT honos jelekre (forbidden)
//   KUK03  ami a helyükre lépett, az OTT van — CSAK az ITT honos jelekre (positive)
//   KUK04  a regiszter és az AUTO-BETÖLTÖTT memória (CLAUDE.md) EGYÜTT él
//   KUK05  a kanonikus terminál-blokk (az operátor VALÓDI, idézőjeles útjával) + az állandók
//   KUK06  a memória a CLAUDE.md-ben ÜL (nem külső .md mögött), és a gépi őrre mutat
//   KUK07  AZ ŐR-OTTHON KIMONDVA — minden bejegyzésnek van deklarált otthona, a deklaráció
//          VISSZAMÉRVE, és a V2-ben maradt jelek száma PADLÓ (csökkenhet, nőni nem szabad)
//
// KUK07 MIÉRT: a V2 fájljaira mutató tiltó-jel itt NÉMÁN átmenne (nincs mit szkennelni ⇒ nincs
// találat ⇒ „zöld"), tehát a védelem MEGLÉVŐNEK LÁTSZANA. Ez a KUKA-051 és a KUKA-041 hibája
// egyszerre: a nem mért dolog nem „ismeretlen állapotú", hanem zöldnek látszik. Ezért a hiányt
// KIMONDJUK, névvel és számmal.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const { RETIRED_PATTERNS, RETIRED_PATTERN_CONTRACT } = require(join(ROOT, 'contracts', 'retiredPatternRegistry.js'));
const { GUARD_HOME, VS_HOMED_CEILING } = require(join(ROOT, 'contracts', 'guardHome.js'));
const CLAUDE_MD = read('CLAUDE.md');

const categories = new Map(); const failureLines = [];
function bump(c, ok) { const x = categories.get(c) || { pass: 0, fail: 0 }; if (ok) x.pass++; else x.fail++; categories.set(c, x); }
function check(c, label, cond, detail = '') { const ok = Boolean(cond); bump(c, ok); if (!ok) failureLines.push(`  FAIL  [${c}] ${label}${detail ? ' — ' + detail : ''}`); return ok; }
function summary(title) {
  let pass = 0, fail = 0; for (const x of categories.values()) { pass += x.pass; fail += x.fail; }
  const out = ['', title, '='.repeat(title.length)];
  for (const [n, x] of categories) out.push(`${n}: ${x.pass}/${x.pass + x.fail} ${x.fail ? 'FAIL' : 'PASS'}`);
  if (failureLines.length) { out.push(''); out.push(...failureLines); }
  out.push('', '-'.repeat(46), `RESULT: ${pass}/${pass + fail} PASS${fail ? ` — ${fail} FAIL` : ''}`);
  console.log(out.join('\n')); return fail;
}

const SRC_EXT = new Set(['.js', '.mjs', '.sql', '.json', '.html']);
// A REGISZTER-FÁJLOK SOHA nem szkennelendők: bennük a rossz minták SZÖVEGE adatként szerepel.
const SELF_EXCLUDE = new Set(['contracts/retiredPatternRegistry.js', 'contracts/guardHome.js']);
function filesUnder(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return [];
  if (statSync(abs).isFile()) return SELF_EXCLUDE.has(rel) ? [] : [rel];
  const out = [];
  (function walk(dir) {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const p = `${dir}/${e.name}`.replace(/\/+/g, '/');
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '.git') walk(p); }
      else if (SRC_EXT.has(e.name.slice(e.name.lastIndexOf('.'))) && !SELF_EXCLUDE.has(p)) out.push(p);
    }
  })(rel.replace(/\/$/, ''));
  return out;
}
// Egy KÓD-SOR számít találatnak, a magyarázó komment NEM.
function codeLines(src) {
  return src.split('\n').filter((l) => !/^\s*(\/\/|--|\*|\/\*)/.test(l)).join('\n');
}
const signalPaths = (e) => [...new Set([...(e.forbidden || []), ...(e.positive || [])].flatMap((f) => f.paths))];

async function main() {
  // ── KUK01: a regiszter alakja ────────────────────────────────────────────────────────────────
  const required = RETIRED_PATTERN_CONTRACT.required_fields;
  check('KUK01', 'a regiszter nem üres', RETIRED_PATTERNS.length > 0);
  check('KUK01', 'minden bejegyzésen ott a kötelező mezők mindegyike',
    RETIRED_PATTERNS.every((e) => required.every((f) => typeof e[f] === 'string' && e[f].trim().length > 0)),
    RETIRED_PATTERNS.filter((e) => !required.every((f) => e[f])).map((e) => e.id).join(', '));
  check('KUK01', 'az azonosítók egyediek', new Set(RETIRED_PATTERNS.map((e) => e.id)).size === RETIRED_PATTERNS.length);
  check('KUK01', 'minden bejegyzés megnevezi a MEGTALÁLÓT (a lelet forrása nem vész el)',
    RETIRED_PATTERNS.every((e) => e.found_by && e.found_by.length > 2));
  check('KUK01', 'ha egy bejegyzésnek NINCS gépi jele, azt KIMONDJA (guard_note)',
    RETIRED_PATTERNS.every((e) => signalPaths(e).length > 0 || (e.guard_note || '').length > 10),
    RETIRED_PATTERNS.filter((e) => !signalPaths(e).length && !e.guard_note).map((e) => e.id).join(', '));
  check('KUK01', 'a szerződés darabszáma egyezik', RETIRED_PATTERN_CONTRACT.entry_count === RETIRED_PATTERNS.length);

  // ── KUK07: AZ ŐR-OTTHON — a némaság ellen ────────────────────────────────────────────────────
  const missingHome = RETIRED_PATTERNS.filter((e) => !GUARD_HOME[e.id]).map((e) => e.id);
  check('KUK07', 'MINDEN bejegyzésnek van KIMONDOTT őr-otthona (néma bejegyzés nincs)',
    missingHome.length === 0, missingHome.join(', '));
  const strayHome = Object.keys(GUARD_HOME).filter((id) => !RETIRED_PATTERNS.some((e) => e.id === id));
  check('KUK07', 'az otthon-térkép nem beszél NEM LÉTEZŐ bejegyzésről (a halott sor is hiba)',
    strayHome.length === 0, strayHome.join(', '));

  // A DEKLARÁCIÓ VISSZAMÉRVE — mindkét irányban, hogy a térkép ne a saját állítását igazolja vissza.
  const wrongV3 = [], wrongVs = [], wrongNone = [];
  for (const e of RETIRED_PATTERNS) {
    const home = (GUARD_HOME[e.id] || {}).home;
    const paths = signalPaths(e);
    const allHere = paths.length > 0 && paths.every((p) => existsSync(join(ROOT, p)));
    if (home === 'v3' && !allHere) wrongV3.push(e.id);
    if (home === 'vs' && allHere) wrongVs.push(e.id);       // itt is futhatna ⇒ NEM maradhat 'vs'-nek jelölve
    if (home === 'none' && paths.length > 0) wrongNone.push(e.id);
  }
  check('KUK07', "a 'v3'-nak jelölt bejegyzések cél-fájljai TÉNYLEG itt vannak", wrongV3.length === 0, wrongV3.join(', '));
  check('KUK07', "a 'vs'-nek jelölt bejegyzés jele TÉNYLEG nem futtatható itt (nincs elrejtett, futtatható őr)",
    wrongVs.length === 0, wrongVs.join(', '));
  check('KUK07', "a 'none'-nak jelölt bejegyzésnek TÉNYLEG nincs jele", wrongNone.length === 0, wrongNone.join(', '));

  const vsHomed = RETIRED_PATTERNS.filter((e) => (GUARD_HOME[e.id] || {}).home === 'vs').map((e) => e.id);
  check('KUK07', `a V2-ben maradt őrök száma nem NŐTT a padló (${VS_HOMED_CEILING}) fölé — ma ${vsHomed.length}`,
    vsHomed.length <= VS_HOMED_CEILING);

  // ── KUK02 + KUK03: a jelek — CSAK ott, ahol tényleg futnak ───────────────────────────────────
  for (const e of RETIRED_PATTERNS) {
    if ((GUARD_HOME[e.id] || {}).home !== 'v3') continue;
    for (const f of (e.forbidden || [])) {
      const re = new RegExp(f.pattern, f.flags || '');
      const hits = [];
      for (const p of f.paths) for (const file of filesUnder(p)) if (re.test(codeLines(read(file)))) hits.push(file);
      check('KUK02', `${e.id}: a kivezetett minta NEM jött vissza (${f.reason})`, hits.length === 0, hits.join(', '));
    }
    for (const f of (e.positive || [])) {
      const re = new RegExp(f.pattern, f.flags || '');
      const misses = f.paths.filter((p) => !filesUnder(p).some((file) => re.test(read(file))));
      check('KUK03', `${e.id}: a helyére lépett megoldás ÉL (${f.reason})`, misses.length === 0, misses.join(', '));
    }
  }

  // ── KUK04: a regiszter és az AUTO-BETÖLTÖTT memória együtt él ────────────────────────────────
  for (const e of RETIRED_PATTERNS) {
    check('KUK04', `${e.id} szerepel az auto-betöltött memóriában (CLAUDE.md)`, CLAUDE_MD.includes(e.id));
  }
  check('KUK04', 'a CLAUDE.md megnevezi az adat-forrást (a kettő nem csúszhat szét)',
    /contracts\/retiredPatternRegistry\.js/.test(CLAUDE_MD));
  check('KUK04', 'a CLAUDE.md megnevezi az ŐR-OTTHON térképet is', /contracts\/guardHome\.js/.test(CLAUDE_MD));
  check('KUK04', 'a CLAUDE.md kimondja, MIKOR kell új KUKA-bejegyzés', /Ha egy megoldást azért vezetünk ki, mert HIBÁS volt/.test(CLAUDE_MD));
  check('KUK04', 'a CLAUDE.md kimondja, hogy nincs session-ök közti memória (az elv, amiért ez a fájl a memória)',
    /NINCS session-ök közti memóriája/.test(CLAUDE_MD));

  // ── KUK05: az állandó szabályok + a kanonikus terminál-blokk ─────────────────────────────────
  for (const line of ['git checkout main', 'git fetch origin', 'git pull origin main', 'npm run verify:sweep', 'npm run docs:html']) {
    check('KUK05', `ott a kanonikus sor: ${line}`, CLAUDE_MD.includes(line));
  }
  // Az OPERÁTOR VALÓDI útja, IDÉZŐJELBEN (szóköz + `+` van benne) — KUKA-007 ezt is fogja.
  check('KUK05', 'a cd sor az operátor VALÓDI, idézőjeles útját tartalmazza (nem tippelt rövidítést)',
    /cd "\/Users\/valachzsolt\/Documents\/CREATOR\/DESIGN \+ WEB\/vfamily\/00_Admin\/valach-system"/.test(CLAUDE_MD));
  check('KUK05', 'a blokk sorai INDOKOLVA vannak (nem csak felsorolás)', /Miért mind:/.test(CLAUDE_MD));
  check('KUK05', 'a titok-szabály benne van (DATABASE_URL soha nem megy chatbe)',
    /DATABASE_URL/.test(CLAUDE_MD) && /soha nem kerül chatbe/i.test(CLAUDE_MD));
  check('KUK05', 'a „ne írj .md-t azért, hogy legyen dokumentálva" szabály benne van (operátori lelet)',
    /Ne írj új `\.md`-t/.test(CLAUDE_MD));
  check('KUK05', 'a válasz-forma benne van (magyarul, WORK CONTEXT fejléccel)',
    /WORK CONTEXT/.test(CLAUDE_MD) && /Minden válasz magyarul/.test(CLAUDE_MD));

  // ── KUK06: a memória ELÉRHETŐ ────────────────────────────────────────────────────────────────
  check('KUK06', 'a CLAUDE.md mutat a GÉPI őrre (a részlet kódban van, nem doksiban)',
    /npm run verify:kuka/.test(CLAUDE_MD) && /retiredPatternRegistry\.js/.test(CLAUDE_MD));
  check('KUK06', 'a memória-szakasz a CLAUDE.md-ben van (nem külső hivatkozás mögött)',
    /## AKTÍV MEMÓRIA/.test(CLAUDE_MD));
  check('KUK06', 'a KUKA-tábla MAGÁBAN a CLAUDE.md-ben áll (nem csak hivatkozásként)',
    /KUKA-001/.test(CLAUDE_MD) && /KUKA-089/.test(CLAUDE_MD));

  const fail = summary('KUKA + ÁLLANDÓ OPERÁTORI SZABÁLYOK (V3 nyitó csomag)');

  // A HIÁNY KIMONDVA — ez a lényeg, nem a zöld szám (KUKA-051 · KUKA-041).
  const v3Homed = RETIRED_PATTERNS.filter((e) => (GUARD_HOME[e.id] || {}).home === 'v3').map((e) => e.id);
  const noneHomed = RETIRED_PATTERNS.filter((e) => (GUARD_HOME[e.id] || {}).home === 'none').map((e) => e.id);
  console.log('');
  console.log('ŐR-OTTHON — hol fut ma a gépi jel? (KUK07)');
  console.log('-'.repeat(46));
  console.log(`  ITT FUT (v3):        ${v3Homed.length} — ${v3Homed.join(', ') || '—'}`);
  console.log(`  A V2-BEN ÉL (vs):    ${vsHomed.length} db, padló ${VS_HOMED_CEILING} — a tanulság érvényes, a JEL itt NEM fut`);
  console.log(`  NINCS gépi jele:     ${noneHomed.length} — ${noneHomed.join(', ') || '—'} (a bejegyzés maga mondja ki)`);
  console.log('');
  console.log('Ez NEM hiba, hanem a valóság kimondása: a 89 tanulság átjött, a hozzájuk tartozó');
  console.log('őrök nagy része a V2 kódjához tapad. Ahogy a V3 megépíti a saját megfelelőjét, a');
  console.log('„vs" szám CSÖKKEN — nőnie nem szabad, azt a KUK07 padló fogja meg.');
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error('VERIFIER ERROR:', e && e.message); process.exit(1); });
