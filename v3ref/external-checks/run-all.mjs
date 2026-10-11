#!/usr/bin/env node
/** EXT-01 — A KÜLSŐ ELLENŐRZŐ PROGRAMOK FUTTATÓJA (egy paranccsal).
 *
 * MIÉRT VAN. Az R57 §7 kimondott átadhatósági követelménye: „Az új programok tényleges fájlja vagy
 * teljes szövege; pontos commit; teljes, géppel olvasható eredmény". A külső fél az R57-ben azt
 * írta, hogy az R56-ban HIVATKOZOTT programokat a megadott commit fájlfájában nem találta, ezért
 * SAJÁT rekonstrukciót futtatott. Rekonstrukciót futtatni a mi mulasztásunk következménye: a
 * programok nem voltak a repóban, tehát nem voltak leszállítva (KUKA-079 — amit a címzett nem tud
 * megnyitni/futtatni, azt nem adtuk át).
 *
 * MIÉRT EGY PARANCS. A három program mindegyike SAJÁT környezetet vár maga mellett (`source/`,
 * `source-manifest.json`, `evidence/`), és ezt eddig kézzel raktuk össze. Ha egy eszköz használatához
 * a fejlesztőnek kell fel-alá üzengetnie a részleteket, az eszköz nincs kész (KUKA-072). Ez a futtató
 * összerakja a környezetet, lefuttatja mind a hármat, a gépi eredményt fájlba teszi, és KIMONDJA az
 * összesítést — ember nélkül.
 *
 * MIT NEM CSINÁL. A három program szövegéhez NEM nyúl. A `r57_chatgpt-v3.mjs` a KÜLSŐ fél munkája,
 * bájtazonosan; a másik kettő a mi korábbi köreink programja, szintén változatlanul. Ha a futtató
 * „megjavítaná" őket, az ellenőrzés a saját előfeltevésünket igazolná vissza (KUKA-054).
 *
 * A BEMONDOTT COMMIT NEM MÉRÉS (R45 P01 / KUKA-056). A `source-manifest.json` `commit` mezője a
 * programok felé továbbadott ÁLLÍTÁS. Ezért itt MÉRJÜK: ha a munkamásolatban a lemásolt forrást
 * érintő, nem-könyvelt változás áll, a commit `+uncommitted` jelölést kap, és a futtató kiírja,
 * mely fájlokon. A forrás tartalmi lenyomatát a programok által indított `run.mjs` maga számolja —
 * az a bizonyíték, nem ez a szöveg.
 *
 * Használat:
 *   node v3ref/external-checks/run-all.mjs                  # mind a három, eredmény a results/ alá
 *   node v3ref/external-checks/run-all.mjs --only r57       # csak a külső fél programja
 *   node v3ref/external-checks/run-all.mjs --out /tmp/ki     # máshova írja a gépi eredményt
 *   node v3ref/external-checks/run-all.mjs --keep           # a munkakönyvtárat is meghagyja
 *
 * Kilépési kód: 0, ha MINDEN lefuttatott eset `pass` — különben 1. (A három program maga mindig
 * 0-val zár, csak kiírja a JSON-t; a döntést ezért itt kell meghozni — az R57 F01 leckéje a saját
 * futtatónkra fordítva: a nemleges eredménynek a KILÉPÉSI KÓDBAN is látszania kell.)
 */
import {
  cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { batteryUnits, unitPlan, UNIT_BUDGET_MS, EXTERNAL_CAP_MS } from './batteryUnits.mjs';
// A SOROZAT-FŐKÖNYV (EXS-01, R194 §2): a programonként folytatható, forráshoz kötött mérés. A
// döntése TISZTA FÜGGVÉNY, hogy a kapu próbából is hívható legyen (KUKA-207).
import {
  configDigest, seriesId, makeRecord, makeAnchor, anchorProblems,
  bindingMismatch, evidenceDigest, BINDING_ANCHOR_FILE,
} from './seriesLedger.mjs';
import { MUTATIONS } from '../mutations.mjs';
// A KÖTÉS MÉRÉSE KÜLÖN OTTHONBAN (R196 §1 · KUKA-003): az ÖSSZESÍTŐ is UGYANEZT hívja, hogy a
// frissesség-ellenőrzés ne két, egymástól elcsúszó példányon dőljön el.
import { measureSource, liveBinding } from './seriesBinding.mjs';
// A PROGRAM-REGISZTER ÉS AZ ESET-SZEMLE KÜLÖN MODULBAN ÁLL (EXT-02, R59/F02), hogy a verifier
// HÍVHASSA ugyanazt a döntést, amit a futtató használ — ne a forrás szövegét olvassa (KUKA-009).
import {
  PROGRAMS, auditCases, auditEvidenceArtifact, runScope,
  // A KÖRNYEZETI KIHAGYÁS FELTÉTELEI (R83/F03): a MÉRT kudarc-fajta és a felmentés döntése is
  // nevezett feloldóban áll, hogy a pin ugyanazt hívhassa, amit a futtató használ (KUKA-009).
  measuredFailureKind, environmentalObstacle,
  // A PROGRAM AZONOSSÁGA (EXT-03, R8 §3): mért lenyomat + az eredethez vezető kapcsolat.
  programIdentity,
} from './case-manifest.mjs';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));   // v3ref/external-checks
const REF = resolve(HERE, '..');                        // v3ref
const ROOT = resolve(REF, '..');                        // a repó gyökere (KUKA-031: nincs beégetett út)

// ── Parancssor ──────────────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? (argv[i + 1] ?? null) : null;
};
const only = flag('--only');
const keep = argv.includes('--keep');
const OUT = resolve(flag('--out') || join(HERE, 'results'));

if (only && !PROGRAMS.some((p) => p.id === only)) {
  // KUKA-064: a nemleges válasz ne legyen zsákutca — a választható halmaz jöjjön vele.
  console.error(`ismeretlen program: "${only}" — választható: ${PROGRAMS.map((p) => p.id).join(' · ')}`);
  process.exit(2);
}
const selected = only ? PROGRAMS.filter((p) => p.id === only) : PROGRAMS;

// A FORRÁS-ÁLLAPOT MÉRÉSE a `seriesBinding.mjs`-ben él (R196 §1): a futtató ÉS az összesítő
// ugyanazt a szabályt hívja, nem két példányt (KUKA-003 · KUKA-029).

// ── A KÖRNYEZET ÖSSZERAKÁSA ─────────────────────────────────────────────────────────────────────
// A programok mellett `source/v3ref/…`, `source-manifest.json` és `evidence/` kell — ezt eddig kézzel
// raktuk össze, innentől a gép.
// A FUTTATÓ IS A LEMÁSOLT FORRÁS RÉSZE (R59/F02). A külső fél E08 esete magát a FUTTATÓT támadja:
// kicseréli az egyik programot egy csonkra, majd a másolatban futó `run-all.mjs`-től kérdezi meg,
// észreveszi-e. Ehhez a másolatban ott kell lennie a futtatónak és a programoknak — csak a GENERÁLT
// kimenet marad ki (a `results/` és a mutációs eredmény-fájl nem forrás).
function stage(src) {
  const dir = mkdtempSync(join(tmpdir(), 'v3ref-ext-'));
  const skip = [join(HERE, 'results'), join(REF, 'v3ref-mutation-result.json'), join(REF, 'units')];
  cpSync(REF, join(dir, 'source', 'v3ref'), {
    recursive: true,
    filter: (from) => !skip.some((s) => from === s || from.startsWith(`${s}/`)),
  });
  writeFileSync(join(dir, 'source-manifest.json'), `${JSON.stringify({
    commit: src.commit,
    measured_at: new Date().toISOString(),
    source_state: src.note,
    dirty_files: src.dirty_files,
    staged_from: 'v3ref/ (a generált eredmény nélkül: external-checks/results/, v3ref-mutation-result.json és units/)',
  }, null, 2)}\n`);
  mkdirSync(join(dir, 'evidence'), { recursive: true });
  // A PROGRAM NEM FELTÉTLENÜL EGY FÁJL. Ahol a külső fél szövegét BÁJTAZONOSAN tartjuk meg, ott a
  // bejegyzés egy BURKOLÓRA mutat, és a változatlan próba a `companions` listán áll — a másolat
  // enélkül némán hiányos volna, és a program „nem futott végig" jelzéssel bukna el egy olyan
  // okból, aminek semmi köze a méréshez (KUKA-049).
  for (const p of PROGRAMS) {
    for (const f of [p.file, ...(p.companions || [])]) cpSync(join(HERE, f), join(dir, f));
  }
  return dir;
}

// ── Az eredmény kiolvasása ──────────────────────────────────────────────────────────────────────
// Mind a három program a szabvány kimenetre írja az esetek listáját, és a részleteset az
// `evidence/` alá. A KETTŐ KÖZÜL a fájl az erősebb (teljes), a kimenet a gyors összegzés.
// A RÉSZLETES FÁJL AZ IGAZSÁG, A SZABVÁNY KIMENET DIAGNOSZTIKA (R61/F02). A régi alak a fájl
// hiányában NÉMÁN visszaesett a kimenetre — így egy semmit nem futtató csonk „teljes bizonyítéknak"
// látszott. Innentől a kettő KÜLÖN olvasódik, és az ítéletet a FÁJL hordozza.
function parseJson(text) {
  if (!text) return null;
  const t = String(text).trim();
  const at = Math.min(...['[', '{'].map((c) => (t.indexOf(c) < 0 ? Infinity : t.indexOf(c))));
  if (!Number.isFinite(at)) return null;
  try { return JSON.parse(t.slice(at)); } catch { return null; }
}
const casesOf = (v) => (Array.isArray(v) ? v : (v && Array.isArray(v.cases) ? v.cases : null));

// ── Futtatás ────────────────────────────────────────────────────────────────────────────────────
const src = measureSource(ROOT);
const dir = stage(src);
mkdirSync(OUT, { recursive: true });

console.log('');
console.log('V3 MAGREFERENCIA — KÜLSŐ ELLENŐRZŐ PROGRAMOK (EXT-01)');
console.log('='.repeat(88));
console.log(`  forrás commit:  ${src.commit}`);
console.log(`  forrás állapot: ${src.note}`);
for (const f of src.dirty_files) console.log(`                  · ${f}`);
console.log(`  munkakönyvtár:  ${dir}`);
console.log(`  gépi eredmény:  ${OUT}`);
console.log(`  node:           ${process.version}`);
console.log('');

// A LENYOMAT A TÉNYLEGES FÁJLBÓL (EXT-03). A manifeszt a KAPCSOLATOT deklarálja, a SZÁMOT itt
// mérjük — begépelt sha256 az első szerkesztéskor elavulna és zölden hazudna (KUKA-045 · KUKA-121).
const digestOf = (file) => {
  const path = join(HERE, file);
  if (!existsSync(path)) return null;
  return createHash('sha256').update(readFileSync(path)).digest('hex');
};

/**
 * A KÖTÉS-HORGONY A SOROZAT INDÍTÁSAKOR (EXS-01 · R196 §1) — ÉS EZ A LÉNYEG: A MÉRÉS ELŐTT.
 *
 * MIÉRT KELLETT IDE HOZNI. Az R195-ös alak a kötést a futás UTÁN, a rekordok mellé írta — tehát a
 * VÁRT érték ugyanabból a futásból keletkezett, amit igazolni kellett volna. A chatgpt-v3 MÉRTE,
 * mit jelent ez: egy piszkos forrású, kitalált lenyomatú, EGYÖNTETŰ készlet „teljes bizonyítékot"
 * kapott, mert nem volt mihez mérni (`KUKA-121`: a bizonyíték a saját állítását igazolta vissza).
 *
 * A HORGONY EZÉRT A MÉRÉS ELŐTT, KÜLÖN FÁJLBA kerül: `results/series/<sorozat>/binding.json`. Ez a
 * MEGBÍZHATÓ FUTTATÓ által rögzített ELVÁRT kötés, és az összesítő EHHEZ mér — nem a rekordok
 * egyöntetűségéhez. Ugyanabba a sorozatba eső későbbi `--only` futás ugyanezt a horgonyt találja
 * (a sorozatazonosító a kötésből SZÁRMAZIK, tehát a könyvtár és a kötés együtt jár), és a sorozat
 * INDULÁSI idejét NEM írja át — a horgony a sorozat születését rögzíti, nem az utolsó futást.
 *
 * ÉS HA A LEMEZEN ÁLLÓ HORGONY MÁST MOND: az NEVEZETT HIBA, nem néma felülírás (`KUKA-050`). Ez
 * konzisztencia-ellenőrzés, nem védelem egy minden fájlhoz hozzáférő író ellen (R196 §1).
 */
const seriesConfig = {
  battery_units: batteryUnits(),
  unit_plan: unitPlan({ startUnits: batteryUnits(), mutationCount: MUTATIONS.length }),
  unit_budget_ms: UNIT_BUDGET_MS,
  external_cap_ms: EXTERNAL_CAP_MS,
  node: process.version,
};
// A KÖTÉST A MEGOSZTOTT MÉRŐ ADJA — ugyanaz, amit az összesítő is hív (R196 §1). A FUTTATÓ-lenyomat
// a NEVEZETT fájl-listából jön (`RUNNER_FILES`), mert a futtató ma már nem egy fájl: a kapu
// (`seriesLedger.mjs`) és a kötés-mérő (`seriesBinding.mjs`) is dönt a mérés eredményéről.
const seriesBinding = liveBinding({ root: ROOT, here: HERE, configDigest: configDigest(seriesConfig) }).binding;
const SERIES = seriesId(seriesBinding);
const seriesDir = join(OUT, 'series', SERIES);
const anchorPath = join(seriesDir, BINDING_ANCHOR_FILE);
{
  const fresh = makeAnchor({
    binding: seriesBinding,
    // AZ ELVÁRT KÉSZLET A TELJES MANIFESZT, NEM A MOSTANI `--only` VÁLASZTÁS: a részfutás nem
    // szűkítheti le azt, amihez a teljességet mérjük (KUKA-206).
    programs: PROGRAMS.map((p) => p.id),
    config: seriesConfig,
    recorded_by: 'run-all.mjs',
  });
  const own = anchorProblems(fresh);
  if (own.length) {
    // A FUTTATÓ NEM ÍR OLYAN HORGONYT, AMIT A SAJÁT KAPUJA ELUTASÍT (KUKA-129: a nyugta is igazat
    // mond). Piszkos forráson a sorozat NEM indul — a részfutás nem lesz bizonyítékká attól, hogy
    // lefutott. A mérés magára a futásra ettől nem áll le: a legacy index és a programok mennek.
    console.log('  SOROZAT:        NEM INDUL — a kötés-horgony a SAJÁT kapuján elesik:');
    for (const w of own) console.log(`                  · ${w}`);
    console.log('                  a sorozat-rekordok ezért NEM íródnak ki (R196 §1).');
  } else {
    // A könyvtár CSAK akkor jön létre, ha a horgony megáll — különben egy ÜRES sorozat-könyvtár
    // fantom-sorozatként jelenne meg az összesítőben (KUKA-041: a dísz-pipa elve).
    mkdirSync(seriesDir, { recursive: true });
    if (existsSync(anchorPath)) {
      let prev = null;
      try { prev = JSON.parse(readFileSync(anchorPath, 'utf8')); } catch { prev = null; }
      const mm = prev ? bindingMismatch(prev.binding, seriesBinding) : ['a lemezen álló horgony OLVASHATATLAN'];
      if (mm.length) {
        console.error(`  SOROZAT-HIBA:   a lemezen álló horgony MÁST mond, mint a most mért kötés: ${mm.join(' · ')}`);
        console.error('                  ugyanaz a sorozat-könyvtár NEM tartozhat két kötéshez (EXS-01) — a futás megszakad.');
        process.exit(2);
      }
      console.log(`  SOROZAT:        ${SERIES} — a horgony MEGVAN (${prev.recorded_at}), a sorozat FOLYTATÓDIK`);
    } else {
      writeFileSync(anchorPath, `${JSON.stringify(fresh, null, 2)}\n`);
      console.log(`  SOROZAT:        ${SERIES} — ÚJ kötés-horgony rögzítve (${fresh.recorded_at})`);
    }
  }
}
const seriesAnchorOk = anchorProblems(makeAnchor({ binding: seriesBinding, programs: PROGRAMS.map((p) => p.id) })).length === 0;

const summary = [];
for (const p of selected) {
  const identity = programIdentity(p, digestOf);
  const evidencePath = join(dir, 'evidence', p.evidence);
  // A RÉGI EREDMÉNY-FÁJL FÉLRETÉTELE A FUTÁS ELŐTT (R81 §5 · KUKA-127).
  //
  // MIÉRT LETT EBBŐL KÖTELEZŐ LÉPÉS. Eddig minden programnak SAJÁT eredmény-fájlneve volt, tehát a
  // „megvan a fájl" egyben azt is jelentette, hogy EZ a program írta. Az R81-ben a külső fél KÉT
  // ADAPTÁLT programot küldött (r57a · r59a), amelyek — szándékosan, hiszen az eredetiek változatai
  // — UGYANAZT az eredmény-fájlnevet írják, mint az eredetik. Ettől a „fájl megléte" MÁSIK kérdésre
  // felel, mint amit a szemle kérdez: egy időtúllépésre futó program mellett a SZOMSZÉDJA fájlja
  // maradna ott, azonos eset-listával és azonos commit-kötéssel — tehát ZÖLDNEK látszana.
  //
  // A bizonyítást ezért ELŐ KELL ÁLLÍTANI, nem megfigyelni: a régi fájl megy, és az újnak MEG KELL
  // SZÜLETNIE. Ez pontosan a KUKA-127 szabálya (a külső fél R71 §5 lelete) a saját futtatónkon.
  rmSync(evidencePath, { force: true });
  // A LEMÁSOLT FORRÁS MINDEN PROGRAMNAK UGYANAZ — a generált kimenete NEM (a SAJÁT söprésem lelete,
  // R81). Az R81-es burkoló a mérése előtt lefuttatja a darabolt battériát a lemásolt forráson, és
  // az EGYSÉG-FÁJLOKAT odaírja (`source/v3ref/units/`). A `stage()` ezt a könyvtárat szándékosan
  // kihagyja a másolásból — de attól még KELETKEZHET futás közben, és a KÖVETKEZŐ program már azt
  // találja ott. Mérve: a `r79` önmagában 4/4, a teljes láncban U02 BUKOTT, mert a „hiányzó egység"
  // esetéhez másolt forrás MÁR HORDOZTA az előző program három egység-fájlját — vagyis a mérés nem
  // azt mérte, amit megnevezett (KUKA-127 · KUKA-054). A generált állapotot ezért minden program
  // ELŐTT töröljük: a lemásolt forrás legyen ugyanaz mindenkinek.
  for (const leftover of [join(dir, 'source', 'v3ref', 'units'),
    join(dir, 'source', 'v3ref', 'v3ref-mutation-result.json')]) {
    rmSync(leftover, { recursive: true, force: true });
  }
  const t0 = Date.now();
  // A BATTÉRIA EGYSÉG-DARABSZÁMA EGY OTTHONBÓL (KUKA-172 · R64): az adaptált külső programok a
  // saját alakjukat számolják (ceil(mutáció/24)), ami 204 mutációnál 9 — és az egységek a 15 000 ms-os
  // gyermek-korlát fölé nőttek (mérve: 14 033 … 14 905 ms, az E02/E03 időtúllépésbe futott). A
  // deklarált, MÉRT darabszámot (`batteryUnits.mjs`) ezért a futtató adja át a környezetben; a
  // program a saját `VS_BATTERY_UNITS` olvasóján veszi, a kézi felülírás továbbra is lehetséges.
  /**
   * A PROGRAM-KERET A MÉRT KÖLTSÉGHEZ IGAZODIK (R164/3 — SAJÁT LELET, MÉRVE).
   *
   * A LELET. A keret 600 000 ms volt, és ez EGY feltevésen állt: hogy egy program legfeljebb egyszer
   * futtatja végig a mutációs battériát, és az belefér tíz percbe. MÉRVE az R164-ben: a battéria 253
   * mutációra és 69 mag-próbára nőtt, és a 15 000 ms-os KÜLSŐ egység-korlát betartásához 40 egység
   * kell (egység 11 960 ms) — egy TELJES battéria-pass így ~8 perc, mert minden egység újra felállítja
   * a próba-környezetet. Az a két program, amelyik KÉT battéria-passzt futtat (`r81core` · `r83core`),
   * ezért a kereten HALT MEG: `kilépés null · 600 107 ms`, részletes eredmény nélkül — vagyis a lánc
   * IDŐ-okból mondott eltérést egy olyan programra, aminek a TARTALMÁRÓL semmit nem mért.
   *
   * A KÉT KORLÁT EGYMÁSNAK FESZÜL, ÉS EZT KI KELL MONDANI: a külső fél EGYSÉG-korlátja (15 000 ms)
   * finomabb darabolást kér, a finomabb darabolás viszont NÖVELI a teljes időt (egységenkénti
   * indulási költség). A helyes feloldás nem az egység-korlát lazítása (az a külső fél szava,
   * KUKA-091), hanem a SAJÁT keretünk igazítása a MÉRT költséghez — nevezetten, nem csendben.
   *
   * AMIT EZ NEM ÁLLÍT: nem „gyorsabb lett". A lánc EZÉRT hosszú, és ezért nem fut a söprésben
   * (KUKA-307). A mért keret: két battéria-pass (~16 perc) + a programok saját munkája.
   */
  /**
   * A KERET AZ R186 §3 ÁLTAL ENGEDÉLYEZETT PLAFONON ÁLL — ÉS KIMONDOTTAN NEM EZ VOLT A BAJ.
   *
   * AZ R186 §3 ENGEDÉLYE: *„konkrétan engedélyezek legfeljebb 120 percet programonként a meglévő
   * futtatón, kizárólag szervezési keretként. Ez plafon, nem futásidő-becslés."* Ezért 120 perc.
   *
   * ÉS AMIT A MÉRÉS KIMONDOTT, MIELŐTT EZT A SZÁMOT HOZZÁNYÚLTAM (ez a §3 lényege): a lánc öt
   * `spawnSync … ETIMEDOUT`-ja NEM a keretből és NEM a gép gyengeségéből jött, hanem a SAJÁT
   * darabolásunkból. A deklarált 40-es bontás egysége ezen a gépen 13 271 ms-ot kért — a
   * `mutate.mjs` saját 12 000 ms-os költségvetése FÖLÖTT —, ezért az `adaptiveUnitPlan` minden
   * hívónál finomított, és a finomítás a TELJES battériát futtatja újra: 40 → 80 → 160 egység,
   * összesen ~41 perc. A bontás mért-jóra állítása után (`batteryUnits.mjs`: 64 egység, 9 728 ms)
   * az `r57a` a VÁLTOZATLAN, 30 perces kereten **9/9 eset zölddel, 21,1 perc alatt** lefutott.
   *
   * A KERET EMELÉSE TEHÁT NEM A JAVÍTÁS, HANEM TARTALÉK a KÉT battéria-passzt futtató programoknak
   * (`r81core` · `r83core`): egy passz MÉRVE 10,4 perc (64 egység), kettő 21 perc, és efölé jön a
   * program saját munkája. A plafon azért a megengedett maximum, mert egy ALACSONYABB keret csak
   * újabb vak, tartalom nélküli időtúllépést termelne — amit a §3 nevezetten tilt.
   *
   * AMIT EZ NEM LAZÍT: a külső fél 15 000 ms-os EGYSÉG-korlátja és a `mutate.mjs` 12 000 ms-os saját
   * költségvetése VÁLTOZATLAN (`KUKA-091`), és egyetlen program szövegéhez sem nyúltunk (`KUKA-054`).
   */
  const PROGRAM_BUDGET_MS = 7_200_000;
  const q = spawnSync(process.execPath, [join(dir, p.file)], {
    cwd: dir, encoding: 'utf8', timeout: PROGRAM_BUDGET_MS, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, VS_BATTERY_UNITS: String(batteryUnits()) },
  });
  const ms = Date.now() - t0;
  const exists = existsSync(evidencePath);
  const parsed = exists ? parseJson(readFileSync(evidencePath, 'utf8')) : null;
  const cases = casesOf(parsed);              // az ÍTÉLET a részletes fájlból
  const stdoutCases = casesOf(parseJson(q.stdout)); // a kimenet csak diagnosztika és ellentmondás-szemle

  // A gépi eredmény a kimenő könyvtárba kerül — ezt kérte a külső fél („teljes, géppel olvasható").
  let saved = null;
  if (exists) {
    saved = join(OUT, `${p.id}_${p.evidence}`);
    cpSync(evidencePath, saved);
  }

  // AZ ARTEFAKTUM-SZEMLE (R61/F02). ELŐBB, mint az esetek: ha nincs részletes eredmény, nincs mit
  // megítélni — a szabvány kimenet nem lép a helyébe.
  const artifact = auditEvidenceArtifact(p, { exists, parsed, expectedCommit: src.commit, stdoutCases });

  // AZ ESET-SZEMLE (EXT-02). Nem az a kérdés, hogy amit KAPTUNK, az zöld-e, hanem hogy AZ ÉRKEZETT-E
  // MEG, aminek meg kellett — hiány · ismeretlen · duplikátum · rossz alak · bukás, mind külön szóval.
  const audit = auditCases(p, cases);
  // AZ AZONOSSÁG-MÉRÉS HIÁNYA valódi hiba (nem olvasható fájl); a helyettesíthetőség VISZONT nem
  // itt dől el, hanem a felmentés-kapunál — lásd `programIdentity` fejléc (KUKA-124/1 · KUKA-049).
  audit.problems.unshift(...artifact.problems, ...identity.problems);
  const ok = artifact.ok && audit.ok && identity.problems.length === 0
    && q.status === 0 && !q.error;
  if (q.status !== 0) audit.problems.push(`[${p.id}] a program NEM NULLÁVAL zárt (kilépés ${q.status})`);
  if (q.error) audit.problems.push(`[${p.id}] a futtatás elszállt: ${q.error.message || q.error}`);

  // A KUDARC FAJTÁJA A NYERS EREDMÉNYBŐL (R83/F03) — itt, ahol az esetek és a folyamat állapota még
  // kéznél van. A környezeti kihagyás DÖNTÉSE lentebb születik, de az ADAT itt keletkezik: a
  // felmentés csak bizonyított akadályra állhat, tehát mérni kell, MI akadt el.
  const failure = measuredFailureKind(p, {
    cases, audit, artifactOk: artifact.ok, exitCode: q.status,
    spawnError: q.error ? String(q.error.code || q.error.message || q.error) : null,
    // A KÉT TANÚ: a program SAJÁT hibaszövege és a FUTTATÓ mért ideje. Az elsőt a program írja
    // (tehát állítás), a másodikat mi mérjük — környezeti akadályt csak a kettő EGYÜTT igazol.
    stderr: q.stderr || '', elapsedMs: ms,
  });

  summary.push({
    id: p.id, file: p.file, by: p.by, origin: p.origin,
    // AZ AZONOSSÁG A GÉPI KIMENETBEN IS (EXT-03, R8 §3): a lenyomat MÉRT, az eredet KÖVETHETŐ.
    // `adapted_from: null` = nem adaptált program — a hiány itt is külön válasz (KUKA-124/2).
    program_digest: identity.digest,
    adapted: identity.adapted,
    adapted_from: identity.origin,
    exit: q.status, ms,
    // A NYERS EREDMÉNY MEGMARAD (a külső fél kimondott kérése): a kudarc fajtája és esetenkénti
    // indoka akkor is a gépi kimenetben áll, ha a program végül környezeti kihagyást kap.
    failure_kind: failure.kind, failure_why: failure.why, failure_rows: failure.rows,
    // A JEL EREJE A GÉPI KIMENETBEN IS (R85 §5): a `witness_limit` kimondja, hol NEM független a két
    // tanú, a `witness_basis` pedig azt, mi tartja a döntést ott, ahol erős. A hiány külön válasz:
    // `null` = nincs kimondott korlát ezen az ágon (KUKA-124/2).
    failure_witness_limit: failure.witness_limit ?? null,
    failure_witness_basis: failure.witness_basis ?? null,
    expected_cases: [...p.cases], expected_from: p.cases_source,
    evidence_file: p.evidence, evidence_present: artifact.present, evidence_pin: artifact.pin,
    total: cases ? cases.length : null,
    // A SOROZAT-REKORD az ESET-EREDMÉNYT is hordozza (R194 §2), nem csak a darabszámot.
    case_rows: (cases || []).map((c) => ({ id: String((c && c.id) ?? ''), pass: Boolean(c && c.pass === true) })),
    present: audit.present, missing: audit.missing, unknown: audit.unknown,
    duplicate: audit.duplicate, failed: audit.failed,
    problems: audit.problems,
    ok, saved,
    stderr: (q.stderr || '').trim().split('\n').filter(Boolean).slice(0, 4),
    error: q.error ? String(q.error.message || q.error) : null,
    // A BUKÓ GYERMEKFUTÁS NYOMA TELJES EGÉSZÉBEN MEGMARAD (R85 §2 — a külső fél kimondott kérése).
    //
    // MIÉRT KELLETT. Az R85-ben az ő futásuk r59/P01-et és r55/N04-et jelentett eltérésnek, a mienk
    // nem — és EGYIKÜNK SEM tudta eldönteni, mi volt a kiváltó ok, mert a gyermekfolyamat hibaszövege
    // NÉGY SORRA volt csonkolva, a jelzés (signal) és a szabvány kimenet pedig sehol nem maradt meg.
    // A csonkolt nyom ugyanaz a némaság, mint a hiányzó nyom: az ELTÉRÉS látszik, az OKA nem
    // (KUKA-012 · KUKA-026 — a kudarc nyoma nem veszhet el a futás sorsával együtt).
    //
    // A NYOM CSAK A KUDARCNÁL TELJES: zöld futásnál fölösleges zaj lenne, és a fájl is hízna.
    child_trace: ok ? null : Object.freeze({
      status: q.status ?? null,
      signal: q.signal ?? null,
      spawn_error_code: q.error ? String(q.error.code || '') || null : null,
      elapsed_ms: ms,
      stderr_tail: (q.stderr || '').trim().split('\n').filter(Boolean).slice(-60),
      stdout_tail: (q.stdout || '').trim().split('\n').filter(Boolean).slice(-20),
      truncated: {
        stderr_lines: (q.stderr || '').trim().split('\n').filter(Boolean).length,
        stdout_lines: (q.stdout || '').trim().split('\n').filter(Boolean).length,
      },
    }),
  });

  const head = ok ? 'MEGFELEL' : 'ELTÉRÉS ';
  console.log(`  ${head}  [${p.id}] ${p.file}`);
  console.log(`            írta:      ${p.by} · ${p.origin}`);
  console.log(`            lenyomat:  ${identity.digest ? `${identity.digest.slice(0, 16)}…` : 'NINCS (a fájl nem olvasható)'}`
    + (identity.origin
      ? ` · ADAPTÁLT — eredeti [${identity.origin.id}] ${identity.origin.file}: `
        + `${identity.origin.digest ? `${identity.origin.digest.slice(0, 16)}…` : 'NINCS MEG'}`
      : ''));
  if (identity.origin) {
    console.log(`            adaptálta: ${identity.origin.by.join(' · ')}`);
    console.log(`            változott: ${identity.origin.changed}`);
  }
  console.log(`            mit mér:   ${p.what}`);
  console.log(`            elvárt:    ${p.cases.length} eset (${p.cases.join(' · ')}) — forrás: ${p.cases_source}`);
  // A ZÖLD SZÁM A SZEMLÉBŐL JÖN, NEM ITT SZÜLETIK KIVONÁSSAL (R186 §3 · `KUKA-003` · `KUKA-009`):
  // a korábbi `present - failed` a HIÁNYZÓ esetet kétszer számolta be (lásd az `auditCases` fejét).
  console.log(`            eredmény:  ${cases ? `${audit.green.length}/${p.cases.length} eset zöld` : 'NINCS részletes eredmény'}`
    + ` · részletes fájl: ${artifact.present ? `megvan (kötés: ${artifact.pin ? `${artifact.pin.slice(0, 12)}…` : 'NINCS'})` : 'HIÁNYZIK'}`
    + ` · kilépés ${q.status} · ${ms} ms`);
  for (const w of audit.problems) console.log(`            ELTÉRÉS:   ${w}`);
  for (const l of summary.at(-1).stderr) console.log(`            stderr:    ${l}`);
  if (saved) console.log(`            fájl:      ${saved}`);
  console.log('');
}

// A HATÓKÖR KIMONDVA (R59/F02). A `--only` legitim, de a RÉSZLEGES futás soha nem a lánc teljes
// bizonyítéka — és ezt a GÉPI kimenetnek is hordoznia kell, nem csak a képernyőnek (KUKA-104: két
// csatorna, két igazság). Aki a JSON-t olvassa, a `scope`-ból tudja meg, mit ér a zöld.
const scope = runScope(selected.map((p) => p.id), PROGRAMS.map((p) => p.id));

// ── A KÖRNYEZETI KIHAGYÁS — NEVEZETTEN, ÉS CSAK ÉLŐ HELYETTESSEL (R81 §5) ───────────────────────
//
// KÉT PROGRAM (az EREDETI `r57` · `r59`) a mutációs battériát EGY hívásban futtatja, 15 000 ms
// korláttal — ez a mai, 4 vCPU-s futtató-gépünkön MÉRVE nem fér bele (KUKA-089: a „nincs hozzá
// környezetem" MÉRÉS, nem következtetés). Az R81-ben a külső fél ADAPTÁLT változatot küldött, ami
// UGYANAZOKAT az eseteket futtatja darabolt battériával — és az ZÖLD.
//
// A KIHAGYÁS EZÉRT FELTÉTELES, NEM MENTESSÉG (KUKA-041 · KUKA-122). NÉGY feltétel EGYÜTT:
//   (1) a bejegyzés KIMONDJA a technikai akadályt (`env_limit`) — FAJTÁVAL, a zárt készletből;
//   (2) MEGNEVEZI a helyettest, és az ebben a futásban BENNE VOLT;
//   (3) a helyettes ZÖLD;
//   (4) és a program TÉNYLEGES kudarca MÉRVE ugyanaz a fajta, mint amit a bejegyzés bejelentett.
// Bármelyik hiánya ⇒ a program ÚGY piros, mintha nem is volna helyettese.
//
// A (4) AZ R83/F03 JAVÍTÁSA. Nélküle a felmentés a `superseded_by` + `env_limit` MEGLÉTÉN állt,
// tehát egy VALÓDI assertion-hibát is felmentett — a külső fél ezt szintetikus futtatással
// bizonyította (`exit 0` · `verdict.ok: true` · `env_skipped: 1` egy „NOT a timeout" indokú
// bukásra). A döntést innentől nevezett feloldó hozza, a MÉRT kudarc-fajtából.
const byId = new Map(summary.map((s) => [s.id, s]));
// A HELYETTES AZONOSSÁGA a felmentés ÖTÖDIK feltétele (R8 §3) — mérve, nem feltételezve.
const identityById = new Map(selected.map((p) => [p.id, programIdentity(p, digestOf)]));
for (const s of summary) {
  const p = selected.find((x) => x.id === s.id);
  if (s.ok || !p) continue;
  if (!p.superseded_by && !p.env_limit) continue;      // nincs bejelentett akadály — nincs mit mérni
  const sub = byId.get(p.superseded_by) || null;
  const obstacle = environmentalObstacle(p, { kind: s.failure_kind, why: s.failure_why }, sub,
    sub ? identityById.get(sub.id) || null : null);
  s.env_obstacle = obstacle;
  if (obstacle.excusable) {
    s.env_skipped = true;
    s.env_limit = p.env_limit.why;
    s.env_limit_kind = obstacle.declared_kind;
    s.superseded_by = p.superseded_by;
  } else {
    s.problems.push(`[${s.id}] a környezeti kihagyás NEM áll: ${obstacle.why}`);
  }
}
const envSkipped = summary.filter((s) => s.env_skipped);
const green = summary.filter((s) => s.ok).length;
const all = {
  at: new Date().toISOString(),
  node: process.version,
  source: src,
  scope,
  verdict: {
    ok: green + envSkipped.length === summary.length,
    complete_evidence: scope.complete && green === summary.length,
    green,
    env_skipped: envSkipped.length,
    of: summary.length,
    // A ZÖLD ÉS A KIHAGYÁS KÉT KÜLÖN SZÁM, és a `complete_evidence` CSAK a valódi zöldre igaz —
    // a környezeti kihagyás nem lesz bizonyítékká attól, hogy nem piros (KUKA-089 · KUKA-122).
  },
  programs: summary,
};
const indexPath = join(OUT, 'external-checks-result.json');
writeFileSync(indexPath, `${JSON.stringify(all, null, 2)}\n`);

/**
 * A SOROZAT-FŐKÖNYV ÍRÁSA (EXS-01, R194 §2) — A LEGKISEBB SZÜKSÉGES KIEGÉSZÍTÉS.
 *
 * MIÉRT NEM A FENTI INDEX ELÉG. Azt a fájlt a KÜLSŐ FÉL programjai olvassák név szerint (`r59` ·
 * `r59a` · `r61` · `r83_runner`), tehát a nevéhez és alakjához nem nyúlunk (`KUKA-054`) — viszont
 * minden futás FELÜLÍRJA, így két `--only` futás eredménye nem adódik össze, és a korábbi TELJES
 * bizonyíték is elvész. MÉRVE: ma az index `scope: full` · `verdict.ok: true`-t ír egy 2026-10-09-i,
 * PISZKOS forrásról, miközben a mellette álló per-program fájlok NÉGY különböző forrásból valók.
 *
 * EZÉRT A SOROZAT MELLÉ KERÜL: minden program a SAJÁT rekordját kapja, a kötéssel együtt, és az
 * összesítést a `verifySeries` végzi — a részfutás tehát MEGMARAD és FOLYTATHATÓ, de teljes
 * verdiktet csak a teljes, ellenőrzött készlet adhat.
 */
// A KÖTÉS ÉS A HORGONY MÁR A SOROZAT INDÍTÁSAKOR rögzült (fentebb, a program-ciklus ELŐTT) — itt
// már csak a per-program rekordok íródnak ki, UGYANAHHOZ a kötéshez. És ha a horgony a saját
// kapuján elesett (piszkos forrás, kitalált lenyomat), rekord SEM keletkezik: a részfutás nem lesz
// bizonyítékká attól, hogy lefutott (R196 §1).
if (!seriesAnchorOk) {
  console.log('  SOROZAT:        rekord NEM íródott — a kötés-horgony a saját kapuján elesett (lásd fentebb).');
} else {
for (const s2 of summary) {
  const rec = makeRecord({
    binding: seriesBinding,
    program: { id: s2.id, digest: s2.program_digest },
    exit: Number.isInteger(s2.exit) ? s2.exit : -1,
    // A KIHAGYÁS NEM ZÖLD (KUKA-089 · KUKA-122): a rekord `ok`-ja a VALÓDI zöldre igaz, a nevezett
    // környezeti kihagyás külön mezőben áll, és az összesítő is külön számolja.
    ok: s2.ok === true,
    cases: s2.case_rows || [],
    // A LENYOMAT A MEGOSZTOTT OTTHONBÓL: az összesítő UGYANEZZEL a függvénnyel számolja újra a
    // lemezen álló fájlból, tehát a két oldal nem csúszhat el (KUKA-003 · R196 §1).
    evidence_digest: s2.saved ? evidenceDigest(readFileSync(s2.saved)) : '',
    failure: { kind: s2.failure_kind, why: s2.failure_why },
    ms: s2.ms,
  });
  rec.env_skipped = s2.env_skipped === true;
  writeFileSync(join(seriesDir, `${s2.id}.json`), `${JSON.stringify(rec, null, 2)}\n`);
}
console.log(`  SOROZAT:        ${SERIES}  (${summary.length} rekord írva ide: ${seriesDir})`);
console.log(`  kötés-horgony:  ${anchorPath}`);
console.log('  a sorozat összesítése:  npm run verify:external-series -- --aggregate');
}

if (keep) console.log(`  a munkakönyvtár MEGMARADT: ${dir}`);
else rmSync(dir, { recursive: true, force: true });

console.log('='.repeat(88));
console.log(`  hatókör:        ${scope.scope} — ${scope.why}`);
if (scope.skipped.length) console.log(`  NEM futott:     ${scope.skipped.join(' · ')}`);
console.log(`  összesítő fájl: ${indexPath}`);
for (const s of envSkipped) {
  console.log(`  ENV-KIHAGYÁS:   ${s.id} — ez a program EBBEN A KÖRNYEZETBEN nem futtatható végig.`);
  console.log(`                  bejelentett akadály: ${s.env_limit_kind} · MÉRVE: ${s.env_obstacle.measured_kind}`);
  console.log(`                  ${s.failure_why}`);
  console.log(`                  ${s.env_limit}`);
  // A BIZONYÍTÉK EREJE, KIMONDVA (R85 §5). Ahol a jelek KÖZÖS OKBÓL származnak, ott a kihagyást nem
  // ők tartják, hanem a ZÖLD HELYETTES — és ezt ki kell írni, különben a két ág ereje egyformának
  // látszik (KUKA-127: a gyengébb kötést meg kell nevezni).
  if (s.failure_witness_limit) console.log(`                  KIMONDOTT KORLÁT: ${s.failure_witness_limit}`);
  else if (s.failure_witness_basis) console.log(`                  a kihagyás alapja: ${s.failure_witness_basis}`);
  console.log(`                  helyette MÉRVE: ${s.superseded_by} (zöld)`);
}
const bad = summary.filter((s) => !s.ok && !s.env_skipped);
console.log(`RESULT: ${green}/${summary.length} program MEGFELEL`
  + (envSkipped.length ? ` · ${envSkipped.length} ENV-KIHAGYÁS (nevezett helyettessel)` : '')
  + (bad.length ? ` — ELTÉRÉS: ${bad.map((s) => s.id).join(' · ')}` : '')
  + (scope.complete ? '' : ' · RÉSZLEGES FUTÁS — nem a lánc teljes bizonyítéka'));
console.log('');
process.exit(bad.length === 0 ? 0 : 1);
