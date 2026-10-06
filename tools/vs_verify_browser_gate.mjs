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

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { runGuarded } from './lib/vs_child_runner.mjs';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { artifactPath } = require('../contracts/artifactNaming.js');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const VERSION = pkg.version;

const problems = [];
const lines = [];
const P = (ok, mit, reszlet) => {
  lines.push(`  ${ok ? 'ZÖLD ' : 'PIROS'} ${mit}${reszlet === undefined ? '' : `  — ${reszlet}`}`);
  if (!ok) problems.push(`${mit}${reszlet === undefined ? '' : ` (${reszlet})`}`);
};

console.log('A BÖNGÉSZŐS ELLENŐRZÉS KÖTELEZŐ KAPUJA (BRG-01)');
console.log('='.repeat(94));

// ── 1. A KÖTÉS: a kapu a scriptek SAJÁT parancsát futtatja ───────────────────────────────────────
//
// A `test:e2e` és a `proof:core-ux` ma UGYANAZ a parancs (`playwright test`) — ezt NEM feltételezzük,
// hanem MÉRJÜK: ha szétválnak, a kapu mindkettőt külön futtatja, és ezt kimondja.
const CHAINS = [
  { script: 'test:e2e', expect: 'playwright test', kind: 'playwright' },
  { script: 'proof:core-ux', expect: 'playwright test', kind: 'playwright' },
  { script: 'proof:demo-walk', expect: 'node tools/v3_demo_walk_proof.mjs', kind: 'node' },
];
for (const c of CHAINS) {
  const cmd = String((pkg.scripts || {})[c.script] || '');
  c.cmd = cmd;
  P(cmd === c.expect, `a \`${c.script}\` parancsa az, amit a kapu futtat`,
    cmd === c.expect ? cmd : `MA: "${cmd}" · A KAPU SZERINT: "${c.expect}" — a kapu nem mér mást csendben`);
}
// A KÉT PLAYWRIGHT-LÁNC EGYSZER FUT, HA UGYANAZ A PARANCS (és ezt a sor KIMONDJA — nem hallgatjuk el).
const pw = CHAINS.filter((c) => c.kind === 'playwright');
const egyPlaywrightFutas = pw.length === 2 && pw[0].cmd === pw[1].cmd && pw[0].cmd === 'playwright test';
lines.push(`  TÉNY  a \`test:e2e\` és a \`proof:core-ux\` ${egyPlaywrightFutas ? 'UGYANAZ a parancs — EGY futás mindkettőt lefedi' : 'KÜLÖN parancs — mindkettő külön fut'}`);

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

if (browserOk) {
  // A KAPU A SCRIPTET FUTTATJA, NEM EGY ÚJRAÉPÍTETT PARANCSOT (KUKA-207). ÉS NEM ÍRJA ÁT A JELENTŐT:
  // az első alakom `--reporter=list`-et adott hozzá, ami FELÜLÍRJA a konfiguráció jelentő-listáját —
  // a JSON-jelentés meg sem született, tehát a kapu épp azt a tanút lőtte ki, amiért létezik. A
  // lelet a kapu SAJÁT pirosából jött: „a futás JSON-jelentése megszületett — NINCS" (MÉRVE).
  const pwRun = await futtat(`npm run --silent ${pw[0].script}`, egyPlaywrightFutas ? 'test:e2e + proof:core-ux' : 'test:e2e',
    { VS_E2E_REPORT_PATH: REPORT });

  // A JELENTÉS A TANÚ: el INDULT-e a mérés, és MENNYI futott (KUKA-206: a nem futott nem „részben").
  if (!existsSync(REPORT)) {
    P(false, 'a futás JSON-jelentése megszületett', `NINCS: ${REPORT} — mérés nélkül nincs verdikt`);
  } else {
    let rep = null;
    try { rep = JSON.parse(readFileSync(REPORT, 'utf8')); } catch (e) { P(false, 'a jelentés olvasható', e.message); }
    if (rep) {
      const st = rep.stats || {};
      P(Boolean(st.startTime), 'a mérés EL INDULT (a jelentés kezdő időpontja megvan)', st.startTime || 'nincs');
      P(Number(st.expected || 0) > 0, 'a mérés NEM nulla helyzetet futtatott', `teljesült: ${st.expected ?? '?'}`);
      P(Number(st.unexpected || 0) === 0, 'egy helyzet sem bukott', `bukott: ${st.unexpected ?? '?'}`);
      P(Number(st.flaky || 0) === 0, 'egy helyzet sem volt ingadozó', `ingadozó: ${st.flaky ?? '?'}`);
      // A KIHAGYOTT HELYZET NEVEZETT TÉNY, nem zöld: ami nem futott, arról nem tudunk semmit.
      P(Number(st.skipped || 0) === 0, 'egy helyzetet sem hagytunk ki', `kihagyott: ${st.skipped ?? '?'}`);
      // ÉS A PRÓBA-FÁJLOK SZÁMA IS MÉRT: egy néma gyűjtés-kimaradás „0 bukás"-ként jelenne meg.
      const lemezen = readdirSync(join(ROOT, 'tests', 'e2e')).filter((f) => f.endsWith('.spec.mjs')).sort();
      const jelentesben = [...new Set((rep.suites || []).map((s) => s.file))].sort();
      const hianyzo = lemezen.filter((f) => !jelentesben.includes(f));
      P(hianyzo.length === 0, 'MINDEN próba-fájl bekerült a mérésbe',
        hianyzo.length === 0 ? `${lemezen.length} fájl` : `a jelentésből HIÁNYZIK: ${hianyzo.join(', ')}`);
    }
  }
  if (!egyPlaywrightFutas) await futtat(`npm run --silent ${pw[1].script}`, pw[1].script);
  // A BEMUTATÓ-JÁRÁS AKKOR IS FUT, HA A FENTI BUKOTT: egy piros lánc nem rejthet el egy másikat —
  // a kapu MINDEN láncról külön sort ad (KUKA-012: a hiány nem lehet néma).
  void pwRun;
  await futtat('npm run --silent proof:demo-walk', 'proof:demo-walk');
}

console.log(lines.join('\n'));
console.log('='.repeat(94));
if (problems.length) {
  console.log(`RESULT: FAIL — ${problems.length} mért hiba`);
  for (const p of problems) console.log(`  · ${p}`);
  process.exit(1);
}
console.log('RESULT: PASS — a böngészős láncok lefutottak, a mérés igazoltan elindult, és minden verdikt zöld.');
