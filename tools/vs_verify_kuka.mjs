#!/usr/bin/env node
// Valach System — KUKA (kivezetett megoldások) + ÁLLANDÓ OPERÁTORI SZABÁLYOK verifier.
// READ-ONLY + offline. Exit 0/1.
//
// A V2-ből átjött tanulságok AKTÍV MEMÓRIA: ami itt nincs, az a következő körben nem létezik.
// (A darabszámot nem írjuk le: a kimenet a MÉRT értéket mondja ki — KUKA-045.)
// Ez az őr a V2-belihez képest EGY dologgal többet tud, és épp azért, mert új repó vagyunk:
//
//   KUK01  a regiszter alakja (kötelező mezők, egyedi azonosítók, guard_note ha nincs jel)
//   KUK02  a kivezetett minták NEM jöttek vissza — CSAK az ITT honos jelekre (forbidden)
//   KUK03  ami a helyükre lépett, az OTT van — CSAK az ITT honos jelekre (positive)
//   KUK04  a regiszter és a MEGŐRZÖTT MEMÓRIA együtt él: MINDEN azonosító feloldható, a szöveg
//          nem csonkolt, az archívum megvan, és a CLAUDE.md megnevezi (R8 §4 — lásd lentebb)
//   KUK05  a kanonikus terminál-blokk (az operátor VALÓDI, idézőjeles útjával) + az állandók
//   KUK06  a RÖVID KÖTELEZŐ ALAP a CLAUDE.md-ben ÜL, mutat a gépi őrre ÉS az archívumra, és
//          kimondja a FELADATHOZ KÖTÖTT ELŐVÉTEL szabályát
//
// KUK04/KUK06 MÓDOSÍTVA (D-VS-3031, a külső fél R8 §4 kimondott hozzájárulásával). A régi alak
// azt követelte, hogy a TELJES tanulság-tábla MAGÁBAN a CLAUDE.md-ben álljon. Mérve: a tábla a
// fájl 92,5%-át tette ki (176 819 / 191 097 bájt), tehát MINDEN feladathoz betöltődött, akkor is,
// ha egyetlen sora sem volt releváns. A tábla a `docs/KUKA_ARCHIVUM.md` lapra költözött; a
// védelem NEM gyengült, hanem ÁTHELYEZŐDÖTT — az őr innentől a KÖLTÖZTETÉS ÉPSÉGÉT méri:
//   (a) MINDEN regiszter-azonosító feloldható az archívumban — egyetlen elveszett bejegyzés PIROS;
//   (b) az archívum LÉTEZIK és a CLAUDE.md MEGNEVEZI — törött hivatkozás PIROS (KUKA-132);
//   (c) a szöveg NEM CSONKOLT: sor-hossz padló + összméret padló (KUKA-045: padló, nem egyenlőség);
//   (d) a rövid alap TÉNYLEG rövid (plafon) — különben visszaszivárog, amit kiköltöztettünk;
//   (e) a CLAUDE.md kimondja a FELADATHOZ KÖTÖTT ELŐVÉTEL szabályát, és az általa NEVEZETT
//       azonosítók LÉTEZNEK a regiszterben (kitalált hivatkozás PIROS — KUKA-066);
//   (f) az állandó biztonsági szabályok és az őr-otthon térkép MARADNAK (KUK05 + KUK07 érintetlen).
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
import { compare as compareArchiveBaseline, BASELINE_REL } from './vs_kuka_baseline.mjs';

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const { RETIRED_PATTERNS, RETIRED_PATTERN_CONTRACT } = require(join(ROOT, 'contracts', 'retiredPatternRegistry.js'));
const { GUARD_HOME, VS_HOMED_CEILING } = require(join(ROOT, 'contracts', 'guardHome.js'));
const CLAUDE_MD = read('CLAUDE.md');
// A MEGŐRZÖTT TANULSÁG-TÁBLA otthona (D-VS-3031). A HIÁNY külön válasz, nem üres szöveg
// (KUKA-124/2): ha az archívum nincs meg, azt a KUK04 NEVEZETTEN mondja ki, nem néma nullát mér.
const ARCHIVE_PATH = 'docs/KUKA_ARCHIVUM.md';
const ARCHIVE_PRESENT = existsSync(join(ROOT, ARCHIVE_PATH));
const ARCHIVE_MD = ARCHIVE_PRESENT ? read(ARCHIVE_PATH) : '';
// PADLÓK — a mért MAI értékek alatt, hogy a NÉMA ZSUGORODÁS piros legyen, a szabályos bővülés ne.
// (Mért 2026-09-15: 157 sor · összméret 176 819 bájt · legrövidebb sor 121 karakter.)
const ARCHIVE_BYTES_FLOOR = 170000;
const ARCHIVE_ROW_CHARS_FLOOR = 100;
// A RÖVID ALAP PLAFONJA: a mért 15 402 bájtra van szabva, kényelmes ráhagyással. Ha valaki
// visszamásolja ide a táblát, ez pirosra megy — ez a szabály ÉRTELME, nem esztétika.
const BASE_BYTES_CEILING = 40000;

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
      // A pozitív jelek indoka a regiszterben `why` néven áll (a tiltóké `reason`); az első alak
      // csak a `reason`-t olvasta, ezért MINDEN pozitív bukás „(undefined)" indokkal jelent meg.
      check('KUK03', `${e.id}: a helyére lépett megoldás ÉL (${f.reason || f.why})`, misses.length === 0, misses.join(', '));
    }
  }

  // ── KUK04: a MEGŐRZÖTT memória hiánytalan és nem csonkolt ────────────────────────────────────
  // (a) az archívum LÉTEZIK — ez az ELSŐ kérdés, mert nélküle minden alábbi mérés némán nulla
  check('KUK04', `a tanulság-archívum megvan (${ARCHIVE_PATH})`, ARCHIVE_PRESENT,
    ARCHIVE_PRESENT ? '' : 'a fájl nincs meg — a megőrzött tábla ELVESZETT, nem „üres"');
  // (b) a CLAUDE.md MEGNEVEZI (törött/hiányzó hivatkozás = a memória elérhetetlen — KUKA-132)
  check('KUK04', 'a CLAUDE.md MEGNEVEZI az archívumot (nem lóg a levegőben)',
    CLAUDE_MD.includes(ARCHIVE_PATH));
  // (c) MINDEN azonosító feloldható — egyetlen elveszett bejegyzés is PIROS
  const unresolved = RETIRED_PATTERNS
    .filter((e) => !CLAUDE_MD.includes(e.id) && !ARCHIVE_MD.includes(e.id))
    .map((e) => e.id);
  check('KUK04', `MINDEN regiszter-azonosító feloldható (rövid alap VAGY archívum) — ${RETIRED_PATTERNS.length} db`,
    unresolved.length === 0, unresolved.join(', '));
  // (d) A SZÖVEG NEM CSONKOLT — SORONKÉNTI LENYOMAT, NEM PADLÓ (R10-F04).
  //
  // AMI ELŐTTE VOLT, ÉS MIÉRT VOLT ROSSZ. Itt PADLÓK álltak: „a legrövidebb sor legalább 100
  // karakter" és „az összméret legalább 170 000 bájt". A külső fél MÉRTE, hogy ez nem teljesíti az
  // ígéretet: az ELSŐ sort 238 karakterről 120-ra vágva a battéria 244/244 PASS maradt — a 120 a
  // padló FÖLÖTT van, és egy sor az összméretben eltűnik. A padló egy MÁSIK kérdésre felel („van-e
  // egyáltalán tartalom?"), mint az ígéret („megvan-e MINDEN sor, VÁLTOZATLANUL?") — KUKA-045.
  //
  // A MAI ALAK: verziózott, soronkénti lenyomat-alapvonal (`contracts/kukaArchiveBaseline.json`).
  // A kulcs a sor ELSŐ CELLÁJÁBÓL jön, nem a szövegből: 157 sorból 128 hivatkozik MÁSIK
  // KUKA-azonosítóra, tehát egy szöveg-keresés a sorok többségét rossz kulcs alá tenné (KUKA-134).
  // A padlók MEGMARADNAK olcsó másodlagos jelként, de a bizonyíték a lenyomat.
  const archiveRows = ARCHIVE_MD.split('\n').filter((l) => /^\|\s*\*\*KUKA-/.test(l));
  const shortest = archiveRows.length ? Math.min(...archiveRows.map((l) => l.length)) : 0;
  check('KUK04', `az archívum táblája nem csonkolt — legrövidebb sor ${shortest} karakter (padló ${ARCHIVE_ROW_CHARS_FLOOR})`,
    archiveRows.length > 0 && shortest >= ARCHIVE_ROW_CHARS_FLOOR);
  check('KUK04', `az archívum összmérete ${ARCHIVE_MD.length} bájt (padló ${ARCHIVE_BYTES_FLOOR}) — a néma zsugorodás PIROS`,
    ARCHIVE_MD.length >= ARCHIVE_BYTES_FLOOR);
  check('KUK04', `a táblának minden bejegyzéshez van SORA — ${archiveRows.length} sor, ${RETIRED_PATTERNS.length} bejegyzés`,
    archiveRows.length >= RETIRED_PATTERNS.length);

  const baselinePath = join(ROOT, BASELINE_REL);
  const baselinePresent = existsSync(baselinePath);
  check('KUK04', `a soronkénti alapvonal megvan (${BASELINE_REL})`, baselinePresent,
    baselinePresent ? '' : 'nincs alapvonal — futtasd: node tools/vs_kuka_baseline.mjs --write');
  if (baselinePresent && ARCHIVE_PRESENT) {
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
    const diff = compareArchiveBaseline(ARCHIVE_MD, baseline);
    const baselineRows = Object.keys(baseline.rows || {}).length;
    check('KUK04', `MINDEN alapvonalbeli sor BÁJTRA VÁLTOZATLAN — alapvonal v${baseline.baseline_version}, ${baselineRows} sor`,
      diff.changed.length === 0,
      diff.changed.map((c) => `${c.id}: ${c.was_chars}→${c.now_chars} karakter`).join(' · '));
    check('KUK04', 'egyetlen alapvonalbeli sor sem TŰNT EL', diff.missing.length === 0, diff.missing.join(', '));
    check('KUK04', 'egy azonosító egyszer szerepel (a duplikátum egyik sora némán kimaradna)',
      diff.duplicates.length === 0, diff.duplicates.join(', '));
    // AZ ÚJ SOR NEM HIBA — de NEM IS NÉMA: az alapvonal ilyenkor RÉGEBBI, és frissíteni kell.
    // A hiány és a bővülés két külön válasz (KUKA-124/2).
    check('KUK04', `az alapvonal naprakész — ${diff.added.length} új sor, amiről még nem tud`,
      diff.added.length === 0,
      diff.added.length ? `${diff.added.join(', ')} — futtasd: node tools/vs_kuka_baseline.mjs --write` : '');
    // A KORLÁT KIMONDVA (KUKA-127): ez NEM megváltoztathatatlanság. Az alapvonal újragenerálható,
    // tehát egy SZÁNDÉKOS átírás „legalizálható" — amit az őr ad, az LÁTHATÓSÁG: a változás nem
    // történhet véletlenül, és a verziókövetésben el kell számolni vele.
    check('KUK04', 'az alapvonal KIMONDJA a saját erejének korlátját (nem ad hamis biztonságot)',
      /LÁTHATÓSÁG/.test(readFileSync(join(ROOT, 'tools/vs_kuka_baseline.mjs'), 'utf8')));
  }
  // (e) a forrás-megnevezések MARADNAK — a kód a kanonikus, a lap az emberi olvasat (KUKA-018)
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
  // A RÖVID ALAP TÉNYLEG RÖVID — különben visszaszivárog, amit kiköltöztettünk (D-VS-3031).
  check('KUK06', `a rövid kötelező alap mérete ${CLAUDE_MD.length} bájt (plafon ${BASE_BYTES_CEILING})`,
    CLAUDE_MD.length <= BASE_BYTES_CEILING);
  // A FELADATHOZ KÖTÖTT ELŐVÉTEL SZABÁLYA — az archívum önmagában nem memória, ha senki nem
  // nyitja meg; a CLAUDE.md-nek meg kell mondania, MIKOR kötelező elővenni (KUKA-015).
  check('KUK06', 'a CLAUDE.md kimondja a FELADATHOZ KÖTÖTT ELŐVÉTEL szabályát',
    /FELADATHOZ KÖTÖTT ELŐVÉTEL/.test(CLAUDE_MD));
  const preFetchIds = [...new Set((CLAUDE_MD.match(/KUKA-\d{3}/g) || []))];
  check('KUK06', `az elővétel-tábla legalább 8 hiba-osztályt nevez meg (mért: ${preFetchIds.length} azonosító)`,
    preFetchIds.length >= 8);
  // A NEVEZETT AZONOSÍTÓ LÉTEZZEN — kitalált hivatkozás ugyanaz a néma hazugság, mint a hiányzó
  // forrás (KUKA-066): a sor „megvan"-nak látszik, és semmire nem mutat.
  const known = new Set(RETIRED_PATTERNS.map((e) => e.id));
  const ghosts = preFetchIds.filter((id) => !known.has(id));
  check('KUK06', 'a rövid alap MINDEN hivatkozott azonosítója létezik a regiszterben',
    ghosts.length === 0, ghosts.join(', '));

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
  // A SZÁM MÉRVE, NEM KÉZZEL LÉPTETVE (KUKA-045): a felirat a regiszter mai méretét írja ki — egy
  // beírt szám a következő bejegyzésnél némán elcsúszna a mért értéktől.
  console.log(`Ez NEM hiba, hanem a valóság kimondása: a ${RETIRED_PATTERNS.length} tanulság átjött, a hozzájuk tartozó`);
  console.log('őrök nagy része a V2 kódjához tapad. Ahogy a V3 megépíti a saját megfelelőjét, a');
  console.log('„vs" szám CSÖKKEN — nőnie nem szabad, azt a KUK07 padló fogja meg.');
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error('VERIFIER ERROR:', e && e.message); process.exit(1); });
