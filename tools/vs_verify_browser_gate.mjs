#!/usr/bin/env node
// tools/vs_verify_browser_gate.mjs — A BÖNGÉSZŐS ELLENŐRZÉS KÖTELEZŐ KAPUJA (BRG-01, R158/2).
//
// MIÉRT SZÜLETETT. A söprés MINDEN `verify:*` scriptet lefuttat — a böngészős láncok viszont
// `test:e2e` és `proof:core-ux` néven futnak, tehát a NÉV-SZŰRŐ miatt SOHA nem kerültek a kapuba.
// A három örökölt piros helyzet (R89-06 · R91-03 · R93) pontosan ezért tudott körökön át pirosan
// állni: a kör-végi „zöld söprés" igaz volt, és közben a böngészőben három állítás bukott. Az R158
// ezt nevezetten elrendezte: „a `test:e2e` és a `proof:core-ux` legyen a KÖTELEZŐ teljes kiadási
// kapu része … hiányzó böngésző vagy el sem indult mérés NEM PASS."
//
// A KAPU HÁROM DOLGOT KÖT MEG, ÉS MINDHÁROM EGY-EGY KORÁBBI HIBA-OSZTÁLY:
//
//   1. A KÖTÉS (KUKA-207 · KUKA-227): a kapu ugyanazt a parancsot futtatja, amit a `package.json`
//      scriptjei NEVEZNEK. Ha egy script parancsa megváltozik, a kapu NEVEZETTEN pirosra vált —
//      nem mér csendben valami mást. „Amit próba nem tud MEGHÍVNI, azt bizalomból hisszük."
//
//   2. A BÖNGÉSZŐ LÉTE NEM HIT KÉRDÉSE (KUKA-220 · KUKA-049): nem elég, hogy a futtató-fájl ott
//      van — EL IS INDÍTJUK. És ha nincs vagy nem indul, az PIROS, nem „env-kihagyás": ez a kapu
//      SOHA nem deklarál környezeti kihagyást (a söprés `env_skipped` ága tudatosan érintetlen).
//
//   3. AZ EL SEM INDULT MÉRÉS NEM ZÖLD (KUKA-051 · KUKA-093 · KUKA-206): a futás JSON-jelentését
//      elolvassuk, és a mérésnek EL KELL INDULNIA. Nulla helyzet, kihagyott helyzet, vagy kevesebb
//      próba-FÁJL, mint ami a lemezen áll — mindhárom piros. Egy néma gyűjtés-kimaradás különben
//      „0 bukás"-ként jelenne meg.
//
// AMIT EZ A KAPU NEM ÁLLÍT — KIMONDVA. Nem állítja, hogy a böngészős bizonyíték HTTP- vagy
// tároló-bizonyíték minden pontján: a `proof:demo-walk` háttere a SZIMULÁLT bemutató-adapter, és ezt
// a lánc maga kimondja. A kapu azt köti meg, hogy a mérés MEGTÖRTÉNT és a verdiktje zöld.
//
// Kilépési kód: 0 = minden lánc zöld és a mérés igazoltan elindult · 1 = MÉRT hiba.

import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { runGuarded } from './lib/vs_child_runner.mjs';
import { chainPlan, planProblems, runPlan, planVerdict } from './lib/vs_browser_gate_plan.mjs';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { artifactPath, parseArtifactName } = require('../contracts/artifactNaming.js');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const VERSION = pkg.version;

const problems = [];
const lines = [];
const P = (ok, mit, reszlet) => {
  lines.push(`  ${ok ? 'ZÖLD ' : 'PIROS'} ${mit}${reszlet === undefined ? '' : `  — ${reszlet}`}`);
  if (!ok) problems.push(`${mit}${reszlet === undefined ? '' : ` (${reszlet})`}`);
};

const SELFTEST = process.argv.includes('--selftest');

console.log(SELFTEST ? 'A BÖNGÉSZŐS KAPU ELLENPRÓBÁI (BRG-02 — a kapu SZŰK hívási határán)'
  : 'A BÖNGÉSZŐS ELLENŐRZÉS KÖTELEZŐ KAPUJA (BRG-01)');
console.log('='.repeat(94));

// ── 1. A KÖTÉS: a kapu a scriptek SAJÁT parancsát futtatja ───────────────────────────────────────
//
// A `test:e2e` és a `proof:core-ux` ma UGYANAZ a parancs (`playwright test`) — ezt NEM feltételezzük,
// hanem MÉRJÜK: ha szétválnak, a kapu mindkettőt külön futtatja, és ezt kimondja.
const CHAINS = [
  { script: 'test:e2e', expect: 'playwright test', kind: 'playwright' },
  { script: 'proof:core-ux', expect: 'playwright test', kind: 'playwright' },
  { script: 'proof:demo-walk', expect: 'node tools/v3_demo_walk_proof.mjs', kind: 'node',
    outputs: ['demo_walk'] },
  // R204 — AZ ATADASI BEMUTATO IS A KAPUBA KERUL (KUKA-500).
  //
  // MIERT. Ez az eszkoz allitja elo a VALODI szerveres, vegigkattinthato utat kepekkel (asztali
  // ES 390 px) — az operator ezt nyitja meg. Egyetlen gepi kapu sem futtatta, ezert amikor a
  // termek felulete tovabblepett, az eszkoz elvarasai NEMAN elcsusztak: egy mar nem letezo
  // horgonyra kattintott, es egy regi mondatot kereset. Merve: a 11. kepnel 30 masodperc utan
  // kivetellel allt meg — tehat az atadasi bizonyitek EGYALTALAN NEM keszult el, miközben
  // minden mas lanc zold volt. A nem mert eszkoz nem ,,ismeretlen allapotu", hanem zoldnek
  // latszik (KUKA-051), es a szallitas resze az, amit a cimzett meg tud nyitni (KUKA-079).
  //
  // R206/F206-04: A LISTA MOSTANTÓL A VÉGREHAJTÁST IS VEZÉRLI, és a lánc KIMENETE is deklarált —
  // az indulás, a befejezés és a kimenet KÜLÖN sort kap (lentebb). A `outputs` a generált fájlok
  // FAJTÁJA (`contracts/artifactNaming.js` `kind`-je): a kapu azt méri, hogy a lánc a MOSTANI
  // futásban írta-e meg őket. Egy lefutott, de kimenet nélküli lánc nem átadás (KUKA-079).
  { script: 'docs:kiprobalas-kepek', expect: 'node tools/v3_kiprobalas_kepek.mjs', kind: 'node',
    outputs: ['v3app_bemutato', 'v3app_muszaki'] },
  // R206 §3 — AZ INTERAKTÍV ÁTADÁS IS MÉRT LÁNC (ugyanaz a tanulság: KUKA-500 · KUKA-504).
  //
  // Ez a lánc azt a csomagot állítja elő és járja végig, amit az operátor MEGNYIT: a VALÓDI
  // felületi forrást egy sima statikus kiszolgálóról, asztali szélességen ÉS 390 px-en. Ha a
  // felület holnap új modult importál, vagy a javított út elromlik, ez a lánc vált pirosra —
  // nem a címzett veszi észre.
  { script: 'proof:bemutato-artifact', expect: 'node tools/v3_bemutato_artifact_proof.mjs', kind: 'node',
    outputs: ['v3app_interaktiv_bemutato_manifeszt'] },
];
/**
 * ══ ELLENPRÓBÁK (`--selftest`) — A KAPU SZŰK HÍVÁSI HATÁRÁN, BÖNGÉSZŐ NÉLKÜL ══════════════════
 *
 * Az R206 SPEC kikötése szó szerint: „Rövid ellenpróba: a képkészítő szándékos hibája a kapu nem
 * nulla eredményét okozza; a kihagyott hívás nem adhat ugyanilyen teljes zöldet. Teszteld a
 * meglévő futtató szűk hívási határán, ne minden ellenpróbához a teljes többperces böngészőláncot
 * ismételd."
 *
 * Ezért itt NEM indul böngésző: a terv, a verdikt és a FUTTATÓ (`runGuarded`) hibajelzése külön
 * mérhető — és pontosan ez a három dolog hiányzott ahhoz, hogy a hozzáadott lánc kimaradása
 * NEVEZETT hiba legyen (KUKA-207: amit próba nem tud MEGHÍVNI, azt bizalomból hisszük).
 */
if (SELFTEST) {
  const KEP = 'docs:kiprobalas-kepek';
  const terv = chainPlan(CHAINS);
  const fed = new Set(terv.flatMap((x) => x.covers));
  P(fed.has(KEP), `a \`${KEP}\` lánc BENNE van a futtatási tervben`,
    terv.map((x) => `${x.label} (${x.kind})`).join(' · '));
  P(planProblems(CHAINS, terv).length === 0, 'a deklarált láncok és a terv nem csúszik el', 'nincs eltérés');

  // 1. A RÉGI, HIBÁS ALAK: a terv CSAK a Playwright-láncokból és egy fixen beírt `proof:demo-walk`-ból
  //    áll. A kapunak NEVEZETTEN pirosnak kell lennie — ez az F206-04 gépi jele.
  const regiTerv = terv.filter((x) => x.kind === 'playwright' || x.script === 'proof:demo-walk');
  const regiBajok = planProblems(CHAINS, regiTerv);
  P(regiBajok.some((b) => b.includes(KEP)), 'a KIMARADT lánc NEVEZETT hiba (a korábbi, fixen beírt alak PIROS)',
    regiBajok.join(' · ') || 'nincs baj — ez volna a hamis zöld');

  // 2. A SZÁNDÉKOS HIBA ÁTSZIVÁROG A VERDIKTBE: a képkészítő nem nulla kilépése a kapu verdiktjét
  //    pirosra viszi. A futtatót a próba adja (nincs többperces lánc).
  const hibasFutas = await runPlan(terv, { run: async (step) => ({ ok: step.script !== KEP, ms: 1, detail: step.script === KEP ? 'kilépés 3' : null }) });
  const hibasVerdikt = planVerdict({ chains: CHAINS, plan: terv, results: hibasFutas });
  P(hibasVerdikt.ok === false && hibasVerdikt.bajok.some((b) => b.includes(KEP)),
    'a képkészítő SZÁNDÉKOS hibája a kapu NEM NULLA eredményét okozza', hibasVerdikt.bajok.join(' · '));

  // 3. ÉS A KIHAGYOTT HÍVÁS NEM ADHAT UGYANILYEN TELJES ZÖLDET: ha a lánc el sem indul, a verdikt
  //    akkor sem zöld, ha MINDEN elindított lépés zöld volt (KUKA-206: a nem futott nem „részben").
  const kihagyottFutas = await runPlan(regiTerv, { run: async () => ({ ok: true, ms: 1, detail: null }) });
  const kihagyottVerdikt = planVerdict({ chains: CHAINS, plan: regiTerv, results: kihagyottFutas });
  P(kihagyottVerdikt.ok === false && kihagyottVerdikt.bajok.some((b) => b.includes(KEP)),
    'a KIHAGYOTT hívás NEM ad teljes zöldet (minden elindított lépés zöld volt)', kihagyottVerdikt.bajok.join(' · '));

  // 4. A TELJES, ZÖLD FUTÁS viszont ZÖLD verdiktet ad — különben az őr mindig pirosat mondana, és
  //    egy mindig piros őr sem mér semmit (KUKA-049).
  const jo = await runPlan(terv, { run: async () => ({ ok: true, ms: 1, detail: null }) });
  const joVerdikt = planVerdict({ chains: CHAINS, plan: terv, results: jo });
  P(joVerdikt.ok === true, 'a teljes, zöld futás ZÖLD verdiktet ad', joVerdikt.bajok.join(' · ') || 'nincs baj');

  // 5. A FUTTATÓ SZŰK HÍVÁSI HATÁRA: a nem nulla kilépést a kapu futtatója (`runGuarded`) tényleg
  //    hibának látja — enélkül a 2. pont csak egy szép elmélet volna (KUKA-220).
  const nemNulla = await runGuarded('node -e "process.exit(3)"', { cwd: ROOT, timeoutMs: 30_000 });
  P(nemNulla.exitCode === 3 && !nemNulla.timedOut, 'a futtató a NEM NULLA kilépést hibának látja',
    `kilépés: ${nemNulla.exitCode}`);
  const nulla = await runGuarded('node -e "process.exit(0)"', { cwd: ROOT, timeoutMs: 30_000 });
  P(nulla.exitCode === 0, 'és a nulla kilépést zöldnek', `kilépés: ${nulla.exitCode}`);

  // 6. A PLAYWRIGHT-EGYESÍTÉS SZABÁLYA MÉRT: azonos parancs ⇒ EGY lépés, KÜLÖN parancs ⇒ KETTŐ.
  const szetvalt = chainPlan([{ script: 'test:e2e', cmd: 'playwright test', kind: 'playwright' },
    { script: 'proof:core-ux', cmd: 'playwright test --grep ux', kind: 'playwright' }]);
  P(szetvalt.length === 2, 'KÜLÖN parancsú Playwright-láncok KÉT lépést adnak', `${szetvalt.length} lépés`);
  const egyutt = chainPlan([{ script: 'test:e2e', cmd: 'playwright test', kind: 'playwright' },
    { script: 'proof:core-ux', cmd: 'playwright test', kind: 'playwright' }]);
  P(egyutt.length === 1 && egyutt[0].covers.length === 2, 'azonos parancsú láncokat EGY futás fed le',
    `${egyutt.length} lépés, ${egyutt[0] ? egyutt[0].covers.join(' + ') : '—'}`);

  console.log(lines.join('\n'));
  console.log('='.repeat(94));
  if (problems.length) {
    console.log(`RESULT: FAIL — ${problems.length} mért hiba`);
    for (const x of problems) console.log(`  · ${x}`);
    process.exit(1);
  }
  console.log('RESULT: PASS — a kapu futtatási terve és verdiktje MÉRVE: a kimaradt vagy hibás lánc NEM zöld.');
  process.exit(0);
}

for (const c of CHAINS) {
  const cmd = String((pkg.scripts || {})[c.script] || '');
  c.cmd = cmd;
  P(cmd === c.expect, `a \`${c.script}\` parancsa az, amit a kapu futtat`,
    cmd === c.expect ? cmd : `MA: "${cmd}" · A KAPU SZERINT: "${c.expect}" — a kapu nem mér mást csendben`);
}
/**
 * A FUTTATÁSI TERV A LISTÁBÓL SZÜLETIK (R206 — F206-04, `tools/lib/vs_browser_gate_plan.mjs`).
 *
 * A korábbi alak a Playwright-láncot és egy FIXEN beírt `proof:demo-walk`-ot indított, a listát
 * pedig csak a parancsalak ellenőrzésére használta — így egy ÚJ lánc felvétele után a kapu teljes
 * zöldet adott egy el sem indult mérésre. Ma a terv a listából jön, és a kapu NEVEZETTEN pirosra
 * vált, ha egy deklarált lánc kimaradna belőle.
 */
const PLAN = chainPlan(CHAINS);
const tervBajok = planProblems(CHAINS, PLAN);
P(tervBajok.length === 0, 'MINDEN deklarált lánc benne van a futtatási tervben',
  tervBajok.length === 0 ? PLAN.map((s) => s.label).join(' · ') : tervBajok.join(' · '));
// A PLAYWRIGHT-EGYESÍTÉS MEGMARAD, és a sor KIMONDJA (nem hallgatjuk el).
const pwSteps = PLAN.filter((s) => s.kind === 'playwright');
const egyPlaywrightFutas = pwSteps.length === 1 && pwSteps[0].covers.length === 2;
lines.push(`  TÉNY  a \`test:e2e\` és a \`proof:core-ux\` ${egyPlaywrightFutas ? 'UGYANAZ a parancs — EGY futás mindkettőt lefedi' : 'KÜLÖN parancs — mindkettő külön fut'}`);
lines.push(`  TÉNY  a kapu ${PLAN.length} lépést indít: ${PLAN.map((s) => `${s.label} (${s.kind})`).join(' · ')}`);

// ── 2. A BÖNGÉSZŐ: megvan-e, ÉS elindul-e ───────────────────────────────────────────────────────
let browserOk = false;
try {
  const { chromium } = await import('@playwright/test');
  const exe = chromium.executablePath();
  const van = Boolean(exe) && existsSync(exe) && statSync(exe).isFile();
  P(van, 'a böngésző futtatható fájlja a lemezen van', van ? exe : `NINCS: ${exe || '(a Playwright nem ad utat)'}`);
  if (van) {
    // AZ INDÍTÁS A BIZONYÍTÉK (KUKA-220): a fájl léte nem indulás.
    const b = await chromium.launch();
    const v = b.version();
    await b.close();
    browserOk = true;
    P(true, 'és EL IS INDUL (nem csak ott van)', `chromium ${v}`);
  }
} catch (e) {
  P(false, 'a böngésző elindítható', `a mérés elakadt: ${e && e.message}`);
}
if (!browserOk) {
  // EZ A PONT A KAPU LÉNYEGE: a hiányzó böngésző NEM env-kihagyás, hanem PIROS (R158/2).
  lines.push('  TÉNY  a hiányzó vagy nem induló böngésző NEM „env-kihagyás" és NEM PASS — a kapu PIROS');
}

// ── 3. A LÁNCOK FUTTATÁSA, ÉS A MÉRÉS ELINDULÁSÁNAK IGAZOLÁSA ───────────────────────────────────
const REPORT = resolve(ROOT, artifactPath({ area: 'reports', kind: 'v3app_e2e_eredmeny', ext: 'json', version: VERSION }));
const futtat = async (cmd, label, env) => {
  const t0 = Date.now();
  const r = await runGuarded(cmd, { cwd: ROOT, timeoutMs: 1_800_000, env: { ...process.env, ...(env || {}) } });
  const ms = Date.now() - t0;
  const ok = r.exitCode === 0 && !r.timedOut;
  P(ok, `a \`${label}\` lánc lefutott és ZÖLD`, ok ? `${Math.round(ms / 1000)} s`
    : r.timedOut ? `IDŐTÚLLÉPÉS ${Math.round(ms / 1000)} s után — a nem befejezett mérés nem zöld`
      : `kilépés ${r.exitCode}; az utolsó sorok: ${String(r.output || '').split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 400)}`);
  return { ok, r, ms };
};

/**
 * A LÁNC KIMENETE IS MÉRT TÉNY (R206 — F206-04: „Az új lánc indulásának, befejezésének és
 * kimenetének legyen külön sora").
 *
 * A fájl LÉTEZÉSE nem elég: egy korábbi futás fájlja ugyanúgy ott áll (ez volt az F158-15 lelete a
 * Playwright-jelentésen). Ezért a kimenetnek EBBEN a futásban kell megszületnie, és a fajtát a
 * közös névképző mondja meg (`contracts/artifactNaming.js`), nem egy ide írt minta.
 */
const kimenetSor = (step, indult) => {
  if (!step.outputs.length) {
    lines.push(`  TÉNY  a \`${step.label}\` láncnak nincs deklarált kimenete — a kapu a kilépési kódjával mér`);
    return;
  }
  const dir = join(ROOT, 'var', 'reports');
  for (const kind of step.outputs) {
    let found = null;
    try {
      for (const f of readdirSync(dir)) {
        const parsed = parseArtifactName(f);
        if (!parsed || parsed.kind !== kind) continue;
        const st = statSync(join(dir, f));
        if (st.mtimeMs >= indult - 2000 && (!found || st.mtimeMs > found.mtimeMs)) {
          found = { f, mtimeMs: st.mtimeMs, size: st.size };
        }
      }
    } catch (e) {
      P(false, `a \`${step.label}\` lánc kimenete olvasható (${kind})`, e && e.message);
      continue;
    }
    P(Boolean(found && found.size > 0), `a \`${step.label}\` lánc KIMENETE ebben a futásban született meg (${kind})`,
      found ? `${found.f} · ${Math.round(found.size / 1024)} kB`
        : `NINCS friss \`${kind}\` fájl a var/reports alatt — a lefutott, de kimenet nélküli lánc nem átadás (KUKA-079)`);
  }
};

/** A PLAYWRIGHT-FUTÁS TANÚJA: el INDULT-e a mérés, és MENNYI futott (KUKA-206). */
const jelentesEllenorzes = (futasIndult) => {
  if (!existsSync(REPORT)) {
    P(false, 'a futás JSON-jelentése megszületett', `NINCS: ${REPORT} — mérés nélkül nincs verdikt`);
    return;
  }
  let rep = null;
  try { rep = JSON.parse(readFileSync(REPORT, 'utf8')); } catch (e) { P(false, 'a jelentés olvasható', e.message); }
  if (!rep) return;
  const st = rep.stats || {};
  const indulasMs = Date.parse(String(st.startTime || ''));
  P(Boolean(st.startTime) && Number.isFinite(indulasMs) && indulasMs >= futasIndult - 2000,
    'a mérés EBBEN a futásban indult el (a jelentés kezdő időpontja a futtatás UTÁN van)',
    `${st.startTime || 'nincs'} · a futtatás indult: ${new Date(futasIndult).toISOString()}`);
  P(Number(st.expected || 0) > 0, 'a mérés NEM nulla helyzetet futtatott', `teljesült: ${st.expected ?? '?'}`);
  P(Number(st.unexpected || 0) === 0, 'egy helyzet sem bukott', `bukott: ${st.unexpected ?? '?'}`);
  P(Number(st.flaky || 0) === 0, 'egy helyzet sem volt ingadozó', `ingadozó: ${st.flaky ?? '?'}`);
  // A KIHAGYOTT HELYZET NEVEZETT TÉNY, nem zöld: ami nem futott, arról nem tudunk semmit.
  P(Number(st.skipped || 0) === 0, 'egy helyzetet sem hagytunk ki', `kihagyott: ${st.skipped ?? '?'}`);
  // ÉS A PRÓBA-FÁJLOK SZÁMA IS MÉRT: egy néma gyűjtés-kimaradás „0 bukás"-ként jelenne meg.
  const lemezen = readdirSync(join(ROOT, 'tests', 'e2e')).filter((f) => f.endsWith('.spec.mjs')).sort();
  const jelentesben = [...new Set((rep.suites || []).map((x) => x.file))].sort();
  const hianyzo = lemezen.filter((f) => !jelentesben.includes(f));
  P(hianyzo.length === 0, 'MINDEN próba-fájl bekerült a mérésbe',
    hianyzo.length === 0 ? `${lemezen.length} fájl` : `a jelentésből HIÁNYZIK: ${hianyzo.join(', ')}`);
};

if (browserOk) {
  // A KAPU A SCRIPTET FUTTATJA, NEM EGY ÚJRAÉPÍTETT PARANCSOT (KUKA-207). ÉS NEM ÍRJA ÁT A JELENTŐT:
  // az első alakom `--reporter=list`-et adott hozzá, ami FELÜLÍRJA a konfiguráció jelentő-listáját —
  // a JSON-jelentés meg sem született, tehát a kapu épp azt a tanút lőtte ki, amiért létezik. A
  // lelet a kapu SAJÁT pirosából jött: „a futás JSON-jelentése megszületett — NINCS" (MÉRVE).
  /**
   * A KORÁBBI JELENTÉST ELŐBB ELTAKARÍTJUK (F158-15, külső review, Codex, P2).
   *
   * A LELET: a kapu csak azt kérdezte, hogy a jelentés-fájl LÉTEZIK-E. Ha egy korábbi futás fájlja ott
   * állt, és a MOSTANI Playwright-hívás JSON nélkül zárt nullával (mert valaki kivette vagy elrontotta
   * a jelentőt), akkor a kapu a RÉGI fájlt olvasta be, és annak kezdő időpontját, helyzet-számát és
   * zöldjeit a MOSTANI futásnak írta be. Pontosan azt a célt ejtette el, amiért létezik.
   *
   * KÉT ZÁR EGYSZERRE: (1) a fájl a futtatás ELŐTT törlődik; (2) a jelentés kezdő időpontjának a
   * MOSTANI futás indulása UTÁN kell lennie — így egy menet közben visszacsempészett régi fájl sem
   * mehet át. A másodperc-tűrés 2000 ms, mert a jelentő a saját óráját írja.
   */
  try { rmSync(REPORT, { force: true }); } catch { /* nem volt mit törölni */ }
  /**
   * ÉS MOST A TERV FUT LE — MINDEN LÉPÉS, EGYSZER, A SAJÁT SORAIVAL (R206 — F206-04).
   *
   * Három sor minden lépésről: INDUL (mit indítunk el), lefutott-e és ZÖLD-e, és megszületett-e a
   * KIMENETE. Egy piros lánc nem állítja meg a többit — egy hiba nem rejthet el egy másikat
   * (KUKA-012).
   */
  const results = await runPlan(PLAN, {
    run: async (step) => {
      // A LÉPÉS INDULÁSÁNAK IDŐPONTJA A TANÚ KÖTÉSE IS (F158-15): a jelentés és a lánc-kimenetek
      // kezdő idejét EHHEZ hasonlítjuk, tehát egy visszacsempészett régi fájl nem mehet át. A név
      // a kötést mondja ki, és a `verify:app-findings-r154` (X/x6) ERRE a kötésre áll.
      const futasIndult = Date.now();
      lines.push(`  INDUL a \`${step.label}\` lánc — ${step.cmd || `npm run ${step.script}`}`);
      const r = await futtat(`npm run --silent ${step.script}`, step.label,
        step.report ? { VS_E2E_REPORT_PATH: REPORT } : null);
      if (step.report) jelentesEllenorzes(futasIndult);
      kimenetSor(step, futasIndult);
      return { ok: r.ok, ms: r.ms, detail: r.ok ? null : `kilépés ${r.r.exitCode}${r.r.timedOut ? ' (időtúllépés)' : ''}` };
    },
  });
  /**
   * A ZÁRÓ KÉRDÉS, AMI AZ F206-04-ET KIZÁRJA: TÉNYLEGESEN elindult-e MINDEN deklarált lánc? A
   * parancsalak ellenőrzése (1. szakasz) és a FUTÁS két külön tény — pontosan ezen a különbségen
   * tudott az R205 „bekerült a kötelező kapuba" állítása végrehajtási értelemben nem teljesülni.
   */
  const futott = new Set(results.flatMap((r) => r.step.covers || []));
  const nemFutott = CHAINS.filter((c) => !futott.has(c.script)).map((c) => c.script);
  P(nemFutott.length === 0, 'MINDEN deklarált lánc TÉNYLEGESEN elindult (nem csak a parancsalakja mért)',
    nemFutott.length ? `NEM futott: ${nemFutott.join(', ')}` : CHAINS.map((c) => c.script).join(' · '));
}

console.log(lines.join('\n'));
console.log('='.repeat(94));
if (problems.length) {
  console.log(`RESULT: FAIL — ${problems.length} mért hiba`);
  for (const p of problems) console.log(`  · ${p}`);
  process.exit(1);
}
console.log('RESULT: PASS — a böngészős láncok lefutottak, a mérés igazoltan elindult, és minden verdikt zöld.');
