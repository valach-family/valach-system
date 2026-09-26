// tools/lib/vs_child_runner.mjs — CHR-01: A FUTTATÓ, AMI A SAJÁT FÁJÁT LEZÁRJA (F95-02, R97).
//
// A LELET (chatgpt-v3, R95 §F95-02, saját elkülönített próbával reprodukálva): a söprés `execSync`-kel
// indította a gyermekeket, 900 000 ms türelemmel. A Node időtúllépéskor a KÖZVETLEN gyermeknek küld
// jelet — itt egy héjnak, ami node-ot indít, ami továbbiakat. Az UNOKÁK életben maradtak: a
// folyamatfa `ppid=1`-gyel tovább futott, a terhelés négy magon 10,85 volt, MIKÖZBEN már a következő
// ellenőrzés mért. Két kár egyszerre: a gép terhelése és a MÉRÉS hitele (a következő próba egy
// terhelt gépen fut, és az időzítése ettől más).
//
// MIT BIRTOKOL EZ A MODUL. Egy külső parancs futtatását ÚGY, hogy a végén IGAZOLVA legyen: a futtatott
// fából nem maradt élő folyamat. Ehhez a gyermek SAJÁT FOLYAMATCSOPORTBAN indul (`detached`), és a
// leállítás a CSOPORTRA megy (`-pgid`), nem a közvetlen gyermekre.
//
// A NÉGY KÖTELEM (R95 §F95-02 előírása):
//   1. szabályos leállítás (SIGTERM) → VÉGES türelmi idő → szükség esetén kényszerleállítás (SIGKILL)
//      → és IGAZOLT befejezés, MIELŐTT a következő próba indul;
//   2. rendezett takarítás sikernél, hibánál ÉS megszakításnál is (SIGINT/SIGTERM/kilépés);
//   3. SOHA nincs gépszintű `pkill`, küszöb-emelés vagy állítás-gyengítés: a modul KIZÁRÓLAG a MAGA
//      által indított, NYILVÁNTARTOTT csoportokra küld jelet — idegen csoportra kérésre sem;
//   4. nem támogatott platform NEVEZETT korlátot kap (a Windows folyamatcsoport-jelei mások) — a
//      hiányt a hívó KIÍRJA, nem hallgatja el (KUKA-012).
//
// AMIT NEM BIRTOKOL: a verdiktet (azt a hívó feloldója hozza — SWV-01), és a türelem MÉRTÉKÉT (az a
// hívó döntése). Ez a modul a FOLYAMATOKRÓL szól, nem arról, hogy egy ellenőrző zöld-e.
import { spawn } from 'node:child_process';

/** A SAJÁT, ÉLŐ csoportok — a jel-küldés HATÓKÖRE. Ami nincs benne, arra nem küldünk jelet. */
const live = new Map();
let hooksInstalled = false;

/** A folyamatcsoport-jel támogatása. Windowson a csoport-jel más gépezet: NEVEZETT korlát. */
export function supportsProcessGroups() { return process.platform !== 'win32'; }

export const PLATFORM_LIMIT = supportsProcessGroups() ? null
  : 'win32: a POSIX folyamatcsoport-jel (kill -pgid) nem alkalmazható — a futtató csak a KÖZVETLEN '
    + 'gyermeket állítja le, az unokák felügyelete NEVEZETT HIÁNY ezen a platformon';

/** ÉL-E MÉG BÁRMI a csoportban? Az `EPERM` ÉLŐNEK számít: létezik, csak nem a miénk (KUKA-094). */
export function groupAlive(pgid) {
  if (!Number.isInteger(pgid) || pgid <= 1) return false;
  try { process.kill(-pgid, 0); return true; } catch (e) { return e && e.code === 'EPERM'; }
}

/**
 * JEL A SAJÁT CSOPORTRA — ÉS CSAK ARRA. Ez a modul EGYETLEN jel-küldő pontja; idegen azonosítóra
 * KIVÉTELT dob, nem „biztos, ami biztos" alapon lő. A gépszintű `pkill` tilalma itt, kódban áll.
 */
export function signalOwnGroup(pgid, signal) {
  if (!Number.isInteger(pgid) || pgid <= 1) throw new Error(`vs_child_runner: érvénytelen folyamatcsoport (${pgid})`);
  if (!live.has(pgid)) throw new Error(`vs_child_runner: IDEGEN folyamatcsoportra nem küldünk jelet (${pgid}) — a hatókör a saját, nyilvántartott fa`);
  try { process.kill(-pgid, signal); return true; } catch { return false; }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitGone(pgid, ms, stepMs = 25) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (!groupAlive(pgid)) return true;
    await sleep(stepMs);
  }
  return !groupAlive(pgid);
}

/**
 * A LEZÁRÁS — UGYANEZ AZ ÚT sikernél, hibánál és időtúllépésnél. A verdikt NEVEZETT: `mar_ures` ·
 * `szabalyosan` · `kenyszerrel` · `nem_igazolt`. A negyedik NEM zöld: azt a hívónak ki kell írnia.
 */
async function ensureGroupGone(pgid, { graceMs, verifyMs }) {
  const steps = [];
  if (!groupAlive(pgid)) return { verdict: 'mar_ures', steps: ['a csoport a gyermek kilépésekor már üres volt'], leftovers: false };
  steps.push('a gyermek kilépése után MARADT élő folyamat a csoportban (unoka)');
  signalOwnGroup(pgid, 'SIGTERM');
  steps.push('SIGTERM a SAJÁT folyamatcsoportra');
  if (await waitGone(pgid, graceMs)) return { verdict: 'szabalyosan', steps, leftovers: false };
  steps.push(`a csoport a ${graceMs} ms türelmi idő alatt nem ürült ki → SIGKILL`);
  signalOwnGroup(pgid, 'SIGKILL');
  if (await waitGone(pgid, verifyMs)) return { verdict: 'kenyszerrel', steps, leftovers: false };
  steps.push('a csoport a KÉNYSZERLEÁLLÍTÁS után SEM ürült ki — ez NEVEZETT HIÁNY, nem zöld');
  return { verdict: 'nem_igazolt', steps, leftovers: true };
}

/** MEGSZAKÍTÁSKOR IS REND VAN: a saját csoportokat lezárjuk, idegenhez nem nyúlunk. */
function installHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  // A MEGSZAKÍTÁSI ÚT IS AZ EGYETLEN JEL-KÜLDŐN megy át (`signalOwnGroup`) — különben a hatókör
  // két helyen élne, és a második elcsúszna (KUKA-018 · KUKA-003).
  const sweepOwn = () => {
    for (const pgid of [...live.keys()]) {
      try { signalOwnGroup(pgid, 'SIGTERM'); } catch { /* már nincs, vagy már kivettük */ }
      try { signalOwnGroup(pgid, 'SIGKILL'); } catch { /* már nincs, vagy már kivettük */ }
      live.delete(pgid);
    }
  };
  process.on('exit', sweepOwn);
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(sig, () => {
      sweepOwn();
      // A JELET NEM NYELJÜK EL: a saját kilépési okunk maradjon igaz (128 + jelszám).
      process.exit(sig === 'SIGINT' ? 130 : 143);
    });
  }
}

/** A NYILVÁNTARTÁS OLVASHATÓ ALAKJA — a próba ebből látja, hogy a hatókör a saját fa. */
export function liveGroups() { return [...live.entries()].map(([pgid, v]) => ({ pgid, ...v })); }

/**
 * EGY PARANCS FUTTATÁSA, IGAZOLT LEZÁRÁSSAL.
 *
 * A visszatérés MÉRT KIMENET: `stdout` · `stderr` · `exitCode` · `signal` · `timedOut` · `ms` ·
 * `cleanup` (a lezárás verdiktje és lépései) · `platform_limit`. A hívó ebből dönt — a `timedOut` és
 * a `cleanup.leftovers` KÜLÖN két dolog: az első azt mondja, hogy nem fejeződött be, a második azt,
 * hogy maradt-e utána élet (a kettő összemosása volt a régi alak hibája).
 */
export async function runGuarded(cmd, {
  cwd = process.cwd(),
  timeoutMs = 900000,
  graceMs = 5000,
  verifyMs = 5000,
  env = process.env,
  maxBuffer = 64 * 1024 * 1024,
} = {}) {
  installHooks();
  const startedAt = Date.now();
  const child = spawn(cmd, {
    cwd, env, shell: true, detached: supportsProcessGroups(), stdio: ['ignore', 'pipe', 'pipe'],
  });
  // A CSOPORT VEZETŐJE A GYERMEK PID-je (detached indítás) — ez a hatókörünk azonosítója.
  const pgid = supportsProcessGroups() && Number.isInteger(child.pid) ? child.pid : null;
  if (pgid) live.set(pgid, { cmd, startedAt });
  let stdout = ''; let stderr = ''; let truncated = false;
  const add = (which, d) => {
    const s = String(d);
    if (which === 'out') { if (stdout.length + s.length > maxBuffer) truncated = true; else stdout += s; }
    else if (stderr.length + s.length > maxBuffer) truncated = true; else stderr += s;
  };
  child.stdout.on('data', (d) => add('out', d));
  child.stderr.on('data', (d) => add('err', d));

  let timedOut = false;
  let escalation = null;
  // A KIÉLESÍTÉS SAJÁT ÍGÉRETE: a lezárás MEGVÁRJA. Enélkül a nyilvántartásból már kivett csoportra
  // futna bele egy késői jel-küldés — az pedig KIVÉTEL egy időzítő visszahívásában, vagyis néma
  // összeomlás a takarítás közben (a saját első alakom hibája volt: KUKA-118 alakja a futtatón).
  let escalating = null;
  const closed = new Promise((resolve) => {
    let timer = setTimeout(() => {
      timedOut = true;
      escalation = ['időtúllépés: SIGTERM a SAJÁT csoportra'];
      escalating = (async () => {
        if (pgid) {
          if (live.has(pgid)) signalOwnGroup(pgid, 'SIGTERM');
          if (!(await waitGone(pgid, graceMs))) {
            escalation.push(`a türelmi idő (${graceMs} ms) letelt → SIGKILL a csoportra`);
            if (live.has(pgid)) signalOwnGroup(pgid, 'SIGKILL');
          }
        } else {
          escalation.push('nincs folyamatcsoport (nevezett platform-korlát): csak a közvetlen gyermek');
          try { child.kill('SIGTERM'); } catch { /* már nincs */ }
        }
      })();
    }, timeoutMs);
    const done = (res) => { clearTimeout(timer); timer = null; resolve(res); };
    child.on('error', (e) => done({ exitCode: null, signal: null, spawnError: e.message }));
    child.on('close', (code, signal) => done({ exitCode: code, signal }));
  });
  const res = await closed;
  if (escalating) await escalating;          // a késői jel SOHA nem érhet a nyilvántartás után
  // ── A LEZÁRÁS MINDEN ÁGON UGYANEZ: siker · hiba · időtúllépés (rendezett takarítás).
  const cleanup = pgid
    ? await ensureGroupGone(pgid, { graceMs, verifyMs })
    : { verdict: 'nem_mert', steps: ['nincs folyamatcsoport-támogatás: a fa lezárása nem igazolható'], leftovers: null };
  if (pgid) live.delete(pgid);
  return {
    cmd,
    stdout,
    stderr,
    output: `${stdout}${stderr ? `\n${stderr}` : ''}`,
    exitCode: typeof res.exitCode === 'number' ? res.exitCode : (res.spawnError ? 127 : 1),
    signal: res.signal || null,
    spawnError: res.spawnError || null,
    timedOut,
    escalation,
    ms: Date.now() - startedAt,
    pgid,
    cleanup,
    truncated,
    platform_limit: PLATFORM_LIMIT,
  };
}

export const CHILD_RUNNER_CONTRACT = Object.freeze({
  id: 'CHR-01',
  owns: 'egy külső parancs futtatása ÚGY, hogy a végén IGAZOLT: a saját folyamatfából nem maradt élő folyamat',
  does_not_own: 'a verdikt (SWV-01) · a türelem mértéke (a hívó döntése) · a gyermek kimenetének értelmezése',
  escalation: Object.freeze(['SIGTERM a saját csoportra', 'véges türelmi idő', 'SIGKILL a csoportra', 'IGAZOLT üresség']),
  cleanup_verdicts: Object.freeze(['mar_ures', 'szabalyosan', 'kenyszerrel', 'nem_igazolt']),
  scope: 'KIZÁRÓLAG a maga indította, nyilvántartott folyamatcsoportok — idegenre kérésre sem',
  never: 'gépszintű pkill · küszöb-emelés · állítás-gyengítés · a jel elnyelése megszakításnál',
  stated_limit: PLATFORM_LIMIT || 'POSIX: a csoport-jel a mért út; Windowson NEVEZETT korlát lép életbe',
});
