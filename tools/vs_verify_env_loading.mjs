#!/usr/bin/env node
// V3 — A `.env` BETÖLTÉS ŐRE (ENV-01). `npm run verify:env-loading`
//
// MIÉRT MÉRÜNK, ÉS MIÉRT NEM OLVASUNK FORRÁST. Mert a „benne van a sor" nem bizonyíték: a sor
// állhat egy soha le nem futó ágban, rossz sorrendben, vagy egy olyan import UTÁN, ami már
// olvasta a környezetet. Ezért az őr BETÖLTI az eszközöket egy KÜLÖN folyamatban, valódi `.env`
// fájllal, és a VISELKEDÉST méri (KUKA-009 · KUKA-207: amit próba nem tud MEGHÍVNI, azt
// bizalomból hisszük).
//
// A HAT ÁLLÍTÁS, amit a parancs kért (R146 §6):
//   ENV01  a szerver a `.env`-ből látja a beállítást
//   ENV02  mindkét AI-eszköz is látja
//   ENV03  MEGLÉVŐ környezeti változót a betöltés NEM ÍR FELÜL (élesben a környezet az erősebb)
//   ENV04  MÁS munkakönyvtárból indítva is a REPÓ `.env`-je töltődik be (nem a cwd-é)
//   ENV05  a diagnosztika TITOKMENTES: a visszatérési érték csak TÉNYT visz, értéket soha
//   ENV06  az ESM import-sorrend MÉRVE: a behúzott modulok nem olvasnak környezetet
//          BETÖLTÉSKOR (ezért elég a törzs elején betölteni)
import { execFileSync } from 'node:child_process';
import { writeFileSync, rmSync, existsSync, readFileSync, mkdtempSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = join(ROOT, '.env');
const SENTINEL = 'ENV_ORE_PROBA_ERTEK_NEM_TITOK';

const results = [];
const check = (id, name, ok, detail) => { results.push({ id, name, ok, detail }); };

// A VALÓDI `.env`-hez NEM NYÚLUNK. Ha van, félretesszük és visszatesszük — a próba nem
// semmisítheti meg a fejlesztő beállítását (KUKA-012).
const had = existsSync(ENV_FILE);
const backup = had ? readFileSync(ENV_FILE) : null;

function node(code, { cwd = ROOT, env = {} } = {}) {
  const f = join(mkdtempSync(join(tmpdir(), 'envore-')), 'p.mjs');
  writeFileSync(f, code);
  try {
    return execFileSync(process.execPath, [f], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, VS_AI_PROVIDER: undefined, VS_AI_API_KEY: undefined, ...env },
    }).trim();
  } catch (e) { return `HIBA: ${String(e.stderr || e.message).slice(-400)}`; }
}

try {
  writeFileSync(ENV_FILE, `VS_AI_PROVIDER=anthropic\nVS_AI_API_KEY=${SENTINEL}\nVS_ENV_ORE_JEL=1\n`);

  // ENV01 — a szerver belépője betölti
  const a = node(`
    const m = await import(${JSON.stringify(join(ROOT, 'v3app/server.mjs'))});
    console.log(JSON.stringify({ loaded: m.ENV_LOAD.envFileExists, keys: m.ENV_LOAD.appliedKeys,
      sees: process.env.VS_ENV_ORE_JEL === '1' }));`);
  let p = null; try { p = JSON.parse(a); } catch { /* lásd a detail-t */ }
  check('ENV01', 'a szerver belépője betölti a `.env`-et', Boolean(p && p.sees && p.loaded), p ? `kulcsok: ${p.keys.join(',')}` : a.slice(0, 160));

  // ENV02 — MINDKÉT AI-ESZKÖZ, A SAJÁT FUTÁSUKON MÉRVE.
  //
  // Az első alakom a két eszközt BEHÚZTA egy próba-modulba, és utána nézte a `process.env`-et —
  // csakhogy mindkét eszköz `process.exit()`-tel zár, tehát a próba sora SOHA nem futott le, és a
  // mérés FAIL-t írt egy MŰKÖDŐ eszközre. A hazug piros ugyanolyan rossz, mint a hazug zöld
  // (KUKA-049 · KUKA-093). Ezért mostantól az eszköz SAJÁT folyamatként fut, és a KIMENETÉT
  // mérjük: azt az állítást, ami CSAK a `.env`-ből jöhetett.
  const runTool = (tool, args = []) => {
    try {
      return execFileSync(process.execPath, [join(ROOT, tool), ...args], {
        cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, VS_AI_PROVIDER: undefined, VS_AI_API_KEY: undefined },
      });
    } catch (e) { return String(e.stdout || '') + String(e.stderr || ''); }
  };
  const kap = runTool('tools/v3_ai_kapcsolat_allapot.mjs', ['--json']);
  check('ENV02a', 'v3_ai_kapcsolat_allapot.mjs betölti a `.env`-et',
    /"configured"\s*:\s*true/.test(kap) && /anthropic/.test(kap),
    'a „configured: true" CSAK a `.env`-ből jöhetett (a környezetből a változókat kivettük)');
  const live = runTool('tools/v3_assistant_live_proof.mjs', ['--json']);
  // Az élő próba hálózatot hívna, ezért NEM a sikerét mérjük — azt, hogy TÚLJUTOTT a
  // „nincs beállítva" ágon. A hálózat hiánya itt nem lelet, a beállítás VAKSÁGA az lenne.
  check('ENV02b', 'v3_assistant_live_proof.mjs betölti a `.env`-et',
    !/assistant_not_configured/.test(live),
    /assistant_not_configured/.test(live) ? 'az eszköz NEM látta a `.env`-ben álló beállítást' : 'túljutott a „nincs beállítva" ágon');

  // ENV03 — a MEGLÉVŐ környezeti változót NEM írja felül
  const b = node(`
    const { loadRepoEnv } = await import(${JSON.stringify(join(ROOT, 'tools/lib/vs_tool_env.mjs'))});
    loadRepoEnv(${JSON.stringify(ROOT)});
    console.log(process.env.VS_AI_API_KEY);`, { env: { VS_AI_API_KEY: 'KORNYEZETBOL_JOTT' } });
  check('ENV03', 'MEGLÉVŐ környezeti változót NEM ír felül', b === 'KORNYEZETBOL_JOTT',
    b === SENTINEL ? 'a fájl FELÜLÍRTA a környezetet — élesben ez a Railway beállítását törölné' : `kapott: ${b.slice(0, 60)}`);

  // ENV04 — MÁS munkakönyvtárból is a REPÓ `.env`-je
  const other = mkdtempSync(join(tmpdir(), 'maskonyvtar-'));
  const c = node(`
    const m = await import(${JSON.stringify(join(ROOT, 'v3app/server.mjs'))});
    console.log(JSON.stringify({ sees: process.env.VS_ENV_ORE_JEL === '1', cwd: process.cwd() }));`, { cwd: other });
  check('ENV04', 'MÁS munkakönyvtárból indítva is a REPÓ `.env`-je töltődik', /"sees":true/.test(c), c.slice(0, 160));

  // ENV05 — a diagnosztika titokmentes
  const d = node(`
    const { loadRepoEnv } = await import(${JSON.stringify(join(ROOT, 'tools/lib/vs_tool_env.mjs'))});
    console.log(JSON.stringify(loadRepoEnv(${JSON.stringify(ROOT)})));`);
  check('ENV05', 'a betöltés visszatérési értéke TITOKMENTES', !d.includes(SENTINEL),
    d.includes(SENTINEL) ? 'a kulcs ÉRTÉKE megjelent a diagnosztikában' : 'csak nevek és tények');

  // ENV06 — az ESM import-sorrend MÉRVE
  const e = node(`
    // A behúzott modulok BETÖLTÉSKOR nem olvashatnak kornyezetet: ha olvasnanak, egy betoltes
    // ELOTT behuzott modul a REGI (ures) erteket rogzitene. Itt a modulokat a .env betoltese
    // ELOTT huzzuk be, majd UTANA kerdezzuk - es a valasznak a FRISS erteket kell adnia.
    const prov = await import(${JSON.stringify(join(ROOT, 'v3app/assistant/provider.mjs'))});
    const before = prov.providerStatus(process.env).configured;
    const { loadRepoEnv } = await import(${JSON.stringify(join(ROOT, 'tools/lib/vs_tool_env.mjs'))});
    loadRepoEnv(${JSON.stringify(ROOT)});
    const after = prov.providerStatus(process.env).configured;
    console.log(JSON.stringify({ before, after }));`);
  let q = null; try { q = JSON.parse(e); } catch { /* lásd a detail-t */ }
  check('ENV06', 'a behúzott modul a betöltés UTÁNI értéket látja (nincs import-kori befagyás)',
    Boolean(q && q.before === false && q.after === true), q ? JSON.stringify(q) : e.slice(0, 160));
} finally {
  if (had) writeFileSync(ENV_FILE, backup); else rmSync(ENV_FILE, { force: true });
}

console.log('A `.env` BETÖLTÉS ŐRE (ENV-01)');
console.log('='.repeat(74));
for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'} [${r.id}] ${r.name}${r.ok || !r.detail ? '' : `\n         ${r.detail}`}`);
const bad = results.filter((r) => !r.ok).length;
console.log(`RESULT: ${results.length - bad}/${results.length} PASS${bad ? ` — ${bad} FAIL` : ''}`);
process.exit(bad ? 1 : 0);
