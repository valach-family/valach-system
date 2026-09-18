#!/usr/bin/env node
/**
 * R81 — A KÜLSŐ FÉL KÉT PRÓBÁJA, BURKOLÓVAL (EXT-01).
 *
 * MI EZ. A külső fél (chatgpt-v3) R81-es programjai a `r81_chatgpt-v3.core.mjs` (mag-próba) és a
 * `r81_merge_chatgpt-v3.core.mjs` (összefűzés-próba) fájlokban állnak, **ahogy a lapjukon
 * megérkeztek** — egyetlen karaktert sem írtunk át bennük, a behúzási útvonalakat sem.
 *
 * HELYESBÍTÉS (R83 §6, a külső fél pontosítása). Az R81-es fejléc azt írta ide, hogy a két program
 * „BÁJTAZONOS". Ez SZÓ SZERINT NEM IGAZ, és ők mérték meg: a saját példányukhoz képest EGY ZÁRÓ
 * ÜRES SOR az eltérés — a markdown-kódblokkból való kinyerés következménye. Teszt-logikai eltérés
 * nincs. A pontos állítás ezért: a program TESTE karakterre azonos, a záró sortörés eltérhet. Ez
 * apróságnak látszik, de pont az a fajta állítás, amit mérés nélkül mondtunk ki (KUKA-033): a
 * „bájtazonos" ELLENŐRIZHETŐ tény, tehát vagy mérjük, vagy nem állítjuk.
 *
 * MIT MÉRNEK.
 *   MAG (7 eset)      · P01–P04: a kiadott eredmény RÉSZFÁJÁNAK adatköre (az R79-es javítás
 *                       visszamérése) · F04 három alakban: a kiadás jogának és a kiadási leltár
 *                       sorának IDŐPONTJA. Az `F04-release-time-cross` eset a lelet: négy külön
 *                       óraolvasás mellett az eredmény 08:00:00-s jogon ment ki, a leltárba viszont
 *                       08:00:02 került — olyan időpont, amelyen a `rightAt` már megtagadná.
 *   ÖSSZEFŰZÉS (8 eset) · P01–P04: a meglévő négy kontroll (valódi · hiányzó egység · idegen
 *                       lenyomat · duplikált egység) · F01a/F01b/F02/F03: a beadott ÖSSZEFOGLALÓ
 *                       elfogadása a RÉSZLETES bizonyíték mérése helyett.
 *
 * A KÉT FUTÁS KÜLÖN NEVEZVE. A JAVÍTÁS ELŐTTI forráson (`eb4d83b`) **mag 6 PASS / 1 FAIL** és
 * **összefűzés 4 PASS / 4 FAIL** — pontosan az általuk közölt reprodukció —, a mai forráson
 * **7/0** és **8/0**. TESZTADAPTÁCIÓ NEM TÖRTÉNT: egyetlen elvárást sem írtunk át.
 *
 * MIÉRT KELL MÉGIS EZ A FÁJL — ÉS MIÉRT TÖBB, MINT EGY BURKOLÓ. Az összefűzés-próba a SAJÁT,
 * VALÓDI egységeinken dolgozik (`evidence/genuine-units/`), tehát a környezetét elő kell ÁLLÍTANI:
 * le kell futtatni a darabolt battériát, és az eredményét oda kell tenni. Ha ezt kézzel kellene
 * megtenni, az eszköz nincs kész (KUKA-072: a terv nem üzenet, hanem fájl). Ez a burkoló ezért
 * MEGCSINÁLJA — és a részleteket fájlba írja, nem a képernyőre.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { activeCoreProgram, coreVariant } from './activeCoreProgram.mjs';
// UGYANAZ A DÖNTÉS, UGYANABBÓL A FELOLDÓBÓL (UFK-01/02): a burkolónak is meg kell különböztetnie
// az IDŐ és a TARTALOM miatti bukást — különben itt is elfedné a darabolás a valódi hibát (KUKA-009).
import { unitFailureKind, freshUnitWitness } from './source/v3ref/unitFailureKind.mjs';
import { batteryUnits } from './batteryUnits.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PIN = JSON.parse(readFileSync(join(HERE, 'source-manifest.json'), 'utf8')).commit;
// A DARABSZÁM ITT SEM KÉZZEL ÁLL (R35 §2 · KUKA-177). A korábbi `const UNITS = 4` a battéria 149
// mutációra növekedésével már NEM fért a 12 000 ms-os egység-költségvetésbe, ezért az ÖSSZEFŰZÉS-fél
// `merge/KORNYEZET-*` néven bukott — nem tartalmi okból, hanem mert a szám elavult. A darabszám
// mostantól SZÁRMAZIK: ha egy egység nem fér bele, finomabbra osztunk; a költségvetés nem tágul.
// A KIINDULÓ DARABSZÁM IS A KÖZÖS OTTHONBÓL JÖN (KUKA-003 · KUKA-018 · R36). A kézzel írt
// négyes a battéria 149 mutációjánál SOHA nem fér bele, tehát minden futás egy teljes,
// eldobott menettel kezdődött — és a szám ugyanúgy elcsúszott volna, mint a KUKA-177-ben.
const UNITS_START = batteryUnits();
const UNITS_MAX_ATTEMPTS = 4;

const runNode = (file, opts = {}) => spawnSync(process.execPath, [file], {
  cwd: HERE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts,
});

// ── (1) A MAG-PRÓBA, VÁLTOZATLANUL ──────────────────────────────────────────────────────────────
const core = runNode(join(HERE, activeCoreProgram('r81_chatgpt-v3')));
process.stdout.write(String(core.stdout || ''));
if (core.stderr) process.stderr.write(core.stderr);

// ── (2) A VALÓDI EGYSÉGEK ELŐÁLLÍTÁSA az összefűzés-próbához ────────────────────────────────────
// Az ő programjuk `evidence/genuine-units/`-ból indul, és a SAJÁT, SIKERES egységeinket várja ott.
// Ezeket nem lehet „odakészíteni": le kell futtatni a darabolt battériát a LEMÁSOLT forráson —
// ugyanazon, amit a próba mutálni fog. Így a pozitív kontroll VALÓDI mérésből származik, nem
// fixtúrából (KUKA-033: a levezetett szabály nem bizonyíték, amíg a mérése le nem futott).
const MUTATE = join(HERE, 'source', 'v3ref', 'mutate.mjs');
const GENUINE = join(HERE, 'evidence', 'genuine-units');
let UNITS = UNITS_START;
const unitProblems = [];
if (existsSync(MUTATE)) {
  rmSync(join(HERE, 'source', 'v3ref', 'units'), { recursive: true, force: true });
  rmSync(GENUINE, { recursive: true, force: true });
  mkdirSync(GENUINE, { recursive: true });
  const unitsDir = join(HERE, 'source', 'v3ref', 'units');
  for (let attempt = 1; ; attempt += 1) {
    rmSync(unitsDir, { recursive: true, force: true });
    let tooSlow = null;
    for (let k = 1; k <= UNITS; k += 1) {
      const startedAt = Date.now();
      const r = spawnSync(process.execPath, [MUTATE, `--unit=${k}/${UNITS}`], {
        cwd: join(HERE, 'source'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300_000,
      });
      if (r.status === 0) continue;
      let raw = null;
      try { raw = JSON.parse(readFileSync(join(unitsDir, `unit-${k}-of-${UNITS}.json`), 'utf8')); } catch { /* nincs tanú */ }
      const w = freshUnitWitness(raw, { k, n: UNITS, startedAt });
      const kind = w.ok ? unitFailureKind(w.unit) : 'unknown';
      if (kind === 'too_slow' && attempt < UNITS_MAX_ATTEMPTS) { tooSlow = k; break; }
      unitProblems.push(`a ${k}/${UNITS} egység NEM nullával zárt (${r.status})`
        + ` — a bukás oka: ${kind}${w.ok ? '' : ` (a tanú nem hitelesíthető: ${w.why})`}`);
    }
    if (!tooSlow) break;
    UNITS *= 2;                       // az IDŐ miatti bukáson a darabolás segít — a költségvetés nem tágul
  }
  const src = unitsDir;
  const files = existsSync(src) ? readdirSync(src).filter((f) => f.endsWith('.json')) : [];
  for (const f of files) cpSync(join(src, f), join(GENUINE, f));
  if (files.length !== UNITS) unitProblems.push(`${files.length} egység-fájl született a várt ${UNITS} helyett`);
} else {
  unitProblems.push('a lemásolt forrásban nincs `v3ref/mutate.mjs` — a valódi egységek nem állíthatók elő');
}

// ── (3) AZ ÖSSZEFŰZÉS-PRÓBA, VÁLTOZATLANUL ──────────────────────────────────────────────────────
const merge = unitProblems.length ? null : runNode(join(HERE, 'r81_merge_chatgpt-v3.core.mjs'));
if (merge) {
  process.stdout.write(String(merge.stdout || ''));
  if (merge.stderr) process.stderr.write(merge.stderr);
}

// ── (4) AZ ARTEFAKTUM ───────────────────────────────────────────────────────────────────────────
// A KÉT PROGRAM MAGA ÍRJA a részleteset (`evidence/core-challenge.json` · `merge-challenge.json`).
// Ezeket VÁLTOZATLANUL vesszük át, és csak a commit-kötést tesszük mellé. Ha nem olvasható, azt
// KIMONDJUK — nem írunk üres artefaktumot (KUKA-012: az üres lista és az elérhetetlen nem ugyanaz).
const readJson = (p) => { try { return JSON.parse(readFileSync(join(HERE, 'evidence', p), 'utf8')); } catch { return null; } };
const coreOut = readJson('core-challenge.json');
const mergeOut = readJson('merge-challenge.json');
const prefixed = (part, rows) => (Array.isArray(rows)
  ? rows.map((c) => ({ id: `${part}/${c && c.id}`, pass: c && c.pass === true, result: c }))
  : []);
const cases = [...prefixed('core', coreOut && coreOut.cases), ...prefixed('merge', mergeOut && mergeOut.cases)];
for (const p of unitProblems) cases.push({ id: `merge/KORNYEZET-${cases.length}`, pass: false, result: { error: p } });

const out = {
  program: `${activeCoreProgram('r81_chatgpt-v3')} + r81_merge_chatgpt-v3.core.mjs`, variant: coreVariant().id,
  source_commit: PIN,
  node: process.version,
  at: new Date().toISOString(),
  verbatim: true,
  genuine_units: { requested: UNITS, started_from: UNITS_START, problems: unitProblems },
  core: coreOut,
  merge: mergeOut,
  cases,
  passed: cases.filter((c) => c.pass).length,
  failed: cases.filter((c) => !c.pass).length,
  cases_mapped_from: 'a két program SAJÁT `cases` listája, `core/` és `merge/` előtaggal — a '
    + 'programok szövege érintetlen, az előtagot a burkoló teszi rá (két próba, egy eset-lista)',
};
writeFileSync(join(HERE, 'evidence/r81-core-challenge.json'), `${JSON.stringify(out, null, 2)}\n`);
process.exitCode = (core.status === 0 && merge && merge.status === 0 && unitProblems.length === 0) ? 0 : 1;
