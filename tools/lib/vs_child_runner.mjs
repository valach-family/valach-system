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
// SHD-01 (F101-01, R103): a MEGSZAKÍTÁS közös, nevezett állapota. A futtató NEM tart saját
// kapcsolót — ugyanazt kérdezi, amit a sorozat-vezérlő (R101 kikötése: nem egymástól független
// kapcsolók). A `spawn` ELŐTTI kérdés ezen az állapoton áll.
import { beginInterrupt, interruptState, isInterrupted, forceRequested, HANDLED_SIGNALS } from './vs_shutdown_state.mjs';

/**
 * A SAJÁT, ÉLŐ csoportok — a jel-küldés HATÓKÖRE. Ami nincs benne, arra nem küldünk jelet.
 *
 * AZ ÉRTÉK A HÍVÓ TÜRELMÉT IS HORDOZZA (`graceMs` · `verifyMs`) — F98-01/B. A megszakítási út
 * UGYANAZT a rendet futtatja, mint a normál, és ahhoz ismernie kell a türelmet; a régi alak a
 * beállított türelmet NEM ismerte, ezért SIGTERM után azonnal SIGKILL-t küldött, és a szabályos
 * gyermek nem jutott el a SAJÁT takarításáig (chatgpt-v3 mérése: 1000 ms türelem mellett a 100 ms-os
 * lezárás jelzőfájlja meg sem született).
 */
const live = new Map();
let hooksInstalled = false;
/** A FUTÓ megszakítási takarítás. EGY van belőle: ismételt jel NEM indít versengő második menetet. */
let shutdown = null;
/**
 * CSOPORTONKÉNT EGY LEZÁRÁS — a normál és a megszakítási út UGYANAZT várja meg (F101-01/3).
 *
 * A régi alakban a két út egymástól függetlenül hívta a lezárót ugyanarra a csoportra: az egyik
 * kivette a nyilvántartásból, a másik ott már KIVÉTELBE futott, és a `nem_igazolt` verdikt nem a
 * gépről szólt, hanem a saját versenyhelyzetünkről (KUKA-120: a próbapad a saját versenyét mérte).
 * Az ígéret a MEGÁLLAPODÁS pontja: aki másodikként ér ide, ugyanazt az EGY mérést kapja vissza.
 * A bejegyzés a lezárás végén törlődik — a rendszer újrahasznosíthatja a PID-et, és egy elévült
 * verdikt egy ÚJ csoportra a legrosszabb fajta hazugság lenne.
 */
const closings = new Map();
/** A megszakítási lezárás MÉRT eredménye — a próba és a hívó ebből látja, hogy a rend lefutott. */
let lastShutdown = null;
export function lastShutdownReport() { return lastShutdown; }

/** A MEGSZAKÍTÁS TÉNYE a futtató felől is olvasható — a hívónak nem kell két modult ismernie. */
export { interruptState, isInterrupted } from './vs_shutdown_state.mjs';

/** A FUTÓ megszakítási lezárás ígérete (vagy `null`) — a hívó MEGVÁRHATJA, mielőtt kilép. */
export function shutdownSettled() { return shutdown; }

/** A MEG NEM INDULT FELADAT NEVEZETT OKA a futtató oldalán (KUKA-093: a néma kihagyás tilos). */
export const NOT_STARTED_INTERRUPT = 'nem indult — MEGSZAKÍTÁS alatt a futtató nem indít új gyermeket';

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
    // ISMÉTELT MEGSZAKÍTÁS: a türelem VÉGE, nem egy MÁSODIK takarítás indulása (F98-01/B). A hívás
    // visszatér, és a MÁR FUTÓ rend lép tovább a kényszerre — versengő takarítás nem keletkezik.
    if (forceRequested()) return !groupAlive(pgid);
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

/**
 * A LEZÁRÁS EGYETLEN BEJÁRATA — csoportonként EGY menet, akárhány hívó kéri (F101-01/3).
 *
 * A normál út (a gyermek bezárult) és a megszakítási út UGYANARRA a csoportra érkezhet. Itt
 * találkoznak: az első hívó indítja a mérést, a többi ugyanazt az ígéretet kapja vissza — így a
 * verdikt EGY, és a nyilvántartásból is EGYSZER kerül ki. A takarítás hibája HIBA marad, nem
 * „igazolt nulla maradék" (KUKA-126 · D-VS-703).
 */
function closeGroup(pgid) {
  const running = closings.get(pgid);
  if (running) return running;
  const rec = live.get(pgid) || {};
  const graceMs = Number.isFinite(rec.graceMs) ? rec.graceMs : 5000;
  const verifyMs = Number.isFinite(rec.verifyMs) ? rec.verifyMs : 5000;
  const p = (async () => {
    let v;
    try { v = await ensureGroupGone(pgid, { graceMs, verifyMs }); }
    catch (e) { v = { verdict: 'nem_igazolt', steps: [`a lezárás kivétellel állt meg: ${e && e.message}`], leftovers: true }; }
    live.delete(pgid);
    return v;
  })();
  closings.set(pgid, p);
  // A BEJEGYZÉS A MÉRÉS UTÁN ELTŰNIK — lásd a `closings` indoklását (PID-újrahasznosítás).
  p.then(() => closings.delete(pgid), () => closings.delete(pgid));
  return p;
}

/**
 * MEGSZAKÍTÁSKOR IS REND VAN — ÉS UGYANAZ A REND (F98-01/B).
 *
 * A RÉGI ALAK HIBÁJA (chatgpt-v3, R98): a jelkezelő SIGTERM-et és SIGKILL-t küldött KÖZVETLENÜL
 * egymás után, majd törölte a nyilvántartást és kilépett. A beállított türelmi idő ezen az úton NEM
 * LÉTEZETT: egy szabályosan, 100 ms alatt záró gyermek 1000 ms türelem mellett sem jutott el a saját
 * takarításáig. A lezárási szerződésnek KÉT ÚTJA van (normál és megszakítási), és csak az egyik volt
 * megépítve — ugyanaz a hiba-osztály, mint a söprés vezérlési útja (KUKA-041: a szabály egy irányon
 * érvényesült, a másikon nem).
 *
 * A MAI REND — ugyanaz a VÉGES lánc, mint a normál úton: jel → türelem → csak SZÜKSÉG ESETÉN
 * kényszer → IGAZOLÁS. A türelem a HÍVÓ beállítása (a nyilvántartásból), nem egy itteni új szám.
 *
 * ISMÉTELT JEL: NEM indít második takarítást (versengés nélkül), hanem a türelmet zárja le — a futó
 * rend lép tovább a kényszerre. Így a viselkedés egyértelmű ÉS véges marad.
 *
 * A SZINKRON `exit`-HOOK CSAK VÉGSŐ VÉDŐHÁLÓ: a kilépés pillanatában már nem lehet várni, ezért ott
 * csak az marad, ami akkor még a nyilvántartásban van (rendes úton: semmi). Nem ez helyettesíti az
 * aszinkron ellenőrzést.
 */
function installHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;

  // ── VÉGSŐ VÉDŐHÁLÓ (szinkron): a kilépéskor még nyilvántartott csoportok. Itt nincs mit várni,
  // ezért itt a türelem NEM értelmezhető — és épp ezért NEM ez a lezárás fő útja.
  const sweepOwn = () => {
    for (const pgid of [...live.keys()]) {
      try { signalOwnGroup(pgid, 'SIGTERM'); } catch { /* már nincs, vagy már kivettük */ }
      try { signalOwnGroup(pgid, 'SIGKILL'); } catch { /* már nincs, vagy már kivettük */ }
      live.delete(pgid);
    }
  };
  process.on('exit', sweepOwn);

  // ── A MEGSZAKÍTÁSI ÚT (aszinkron, véges): csoportonként UGYANAZ a feloldó fut, mint a normál úton.
  const shutdownOwn = async (reason) => {
    const groups = [];
    const seen = new Set();
    // A LISTA A LEÁLLÍTÁS PILLANATÁBAN ÁLL ÖSSZE, ÉS MÖGÉ ÚJ NEM KERÜLHET (F101-01/3): a `runGuarded`
    // a megszakítás beálltától nem indít gyermeket, tehát nincs miből újabb csoport keletkezzen.
    // A ciklus MÉGIS újranéz, mert a NÉMÁN kimaradó csoport a rosszabb hiba (KUKA-012): ha valami
    // mégis bekerülne, azt is lezárjuk, és a jelentés KIÍRJA, hogy a felvett lista után érkezett.
    const firstBatch = live.size;
    for (;;) {
      const pending = [...live.keys()].filter((pgid) => !seen.has(pgid));
      if (!pending.length) break;
      for (const pgid of pending) {
        seen.add(pgid);
        const rec = live.get(pgid) || {};
        // A KÖZÖS LEZÁRÓ: ha a normál út már elindította ugyanerre a csoportra, ugyanazt várjuk meg.
        const v = await closeGroup(pgid);
        groups.push({ pgid, cmd: rec.cmd || null, ...v });
      }
    }
    return {
      reason,
      forced: forceRequested(),
      groups,
      leftovers: groups.some((g) => g.leftovers === true),
      // NEVEZETT TÉNY, nem elhallgatott: hány csoport került a felvett lista MÖGÉ (elvárt: 0).
      late_groups: Math.max(0, groups.length - firstBatch),
    };
  };

  for (const sig of HANDLED_SIGNALS) {
    process.on(sig, () => {
      // ── AZ ELSŐ LÉPÉS, SZINKRON: AZ ÚJ INDÍTÁSOK TILALMA (F101-01/1). Ez MEGELŐZI az aszinkron
      // takarítás minden sorát — így a `runGuarded` és a `runSequence` a jel pillanatától tudja,
      // hogy nem kezdhet újat. A régi alak csak a TAKARÍTÁST indította el, a tilalmat nem: a
      // szabályosan záró gyermek után a sorozat elindította a következőt (a mért rés).
      const { fresh, state } = beginInterrupt(sig);
      // ISMÉTELT JEL: a türelmet a közös állapot zárja le (`forceRequested`), új menet NEM indul.
      if (!fresh || shutdown) return;
      // A JELET NEM NYELJÜK EL: a saját kilépési okunk igaz marad (128 + jelszám) — csak most a
      // lezárás IGAZOLÁSA UTÁN lépünk ki, nem előtte.
      // A KILÉPÉS EGY ESEMÉNYHUROK-FORDULÓT VÁR (F101-01/4). A lezárás kész, a fa üres — de a
      // FOLYAMATBAN LÉVŐ hívások (`runGuarded` visszatérése, a sorozat következő döntése) még nem
      // tekeredtek vissza. Ha itt AZONNAL kilépnénk, a MEG NEM INDULT tételek és a megszakítás oka
      // soha nem kerülne a jelentésbe — a hiány NÉMA lenne (KUKA-012), és ami még rosszabb: a
      // védelem MÉRHETETLEN maradna, mert a versenyt a kilépés döntené el, nem a kapu (KUKA-127).
      // Egy forduló VÉGES és elhanyagolható; új munkát pedig nem enged, mert a tilalom már áll.
      const zarasUtan = (r, e) => {
        lastShutdown = e ? { reason: sig, error: String(e && e.message), leftovers: null } : r;
        return new Promise((resolve) => { setImmediate(() => { resolve(); process.exit(state.code); }); });
      };
      shutdown = shutdownOwn(sig).then((r) => zarasUtan(r, null), (e) => zarasUtan(null, e));
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
  // ── AZ INDÍTÁSI KAPU (F101-01/2): MEGSZAKÍTÁS ALATT NEM INDUL ÚJ GYERMEK. A kérdés és a `spawn`
  // között NINCS `await`: a jelkezelő az eseményhurokban fut, tehát ezt a szinkron sorozatot nem
  // tudja kettévágni — a rés bezárása ezen áll, nem időzítésen.
  //
  // A TILTÁS NEVEZETT ÁLLAPOT, nem hamis maradvány és nem a tiszta takarítás letagadása (R101/2
  // kikötése): a válasz kimondja, hogy a feladat MEG SEM INDULT, és MELYIK jel miatt.
  // [F101-01-KAPU:INDITAS] — a kapu, aminek a KIVÉTELÉRE a CR15 ellenpróbája PIROS lesz.
  if (isInterrupted()) {
    const intr = interruptState();
    return {
      cmd,
      started: false,
      interrupted: intr,
      not_started: NOT_STARTED_INTERRUPT,
      stdout: '',
      stderr: '',
      output: '',
      exitCode: null,
      signal: null,
      spawnError: null,
      timedOut: false,
      escalation: null,
      ms: 0,
      pgid: null,
      // NINCS MIT IGAZOLNI: gyermek sem indult. Ezt NEM nevezzük „igazolt lezárásnak" — a nevezett
      // `nem_indult` verdikt a sorozat-vezérlőnél is MEGÁLLÍTÓ válasz, nem zöld (KUKA-093).
      cleanup: { verdict: 'nem_indult', steps: [`${NOT_STARTED_INTERRUPT} (${intr.signal})`], leftovers: null },
      truncated: false,
      platform_limit: PLATFORM_LIMIT,
    };
  }
  // [/F101-01-KAPU:INDITAS]
  const child = spawn(cmd, {
    cwd, env, shell: true, detached: supportsProcessGroups(), stdio: ['ignore', 'pipe', 'pipe'],
  });
  // A CSOPORT VEZETŐJE A GYERMEK PID-je (detached indítás) — ez a hatókörünk azonosítója.
  const pgid = supportsProcessGroups() && Number.isInteger(child.pid) ? child.pid : null;
  if (pgid) live.set(pgid, { cmd, startedAt, graceMs, verifyMs });
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
  // A KÉT ÚT TALÁLKOZHAT: ha közben MEGSZAKÍTÁS érkezett, a csoportot a jel-út már kivehette a
  // nyilvántartásból — ilyenkor a jel-küldés KIVÉTELT dob. A kivétel NEM némulhat el és nem
  // dönthet össze egy futást a takarítás közben (KUKA-118): NEVEZETT `nem_igazolt` lesz belőle.
  let cleanup;
  if (pgid) {
    // A KÖZÖS BEJÁRAT (F101-01/3): ha a megszakítási út már lezárja ezt a csoportot, ugyanazt az EGY
    // mérést kapjuk vissza — nem indul második menet, és nem keletkezik versengésből hamis verdikt.
    cleanup = await closeGroup(pgid);
  } else {
    cleanup = { verdict: 'nem_mert', steps: ['nincs folyamatcsoport-támogatás: a fa lezárása nem igazolható'], leftovers: null };
  }
  return {
    cmd,
    started: true,
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
  // A MEGSZAKÍTÁSI ÚT KÜLÖN KIMONDVA (F98-01/B): ugyanaz a lánc, a HÍVÓ türelmével.
  interrupt: 'kezelhető jelre (SIGINT · SIGTERM · SIGHUP) UGYANAZ a véges lánc fut, mint a normál úton, '
    + 'a hívó `graceMs`/`verifyMs` beállításával; ISMÉTELT jel a türelmet zárja le, második takarítást '
    + 'NEM indít; a szinkron `exit`-hook csak VÉGSŐ VÉDŐHÁLÓ, nem az aszinkron igazolás helyettesítője',
  // AZ INDÍTÁSI TILALOM KÜLÖN KIMONDVA (F101-01, R103): a lezárás KÉT kötelem, nem egy.
  no_new_starts: 'a MEGSZAKÍTÁS pillanatától (SHD-01, szinkron) a futtató NEM indít új gyermeket: a válasz '
    + '`started:false` + nevezett `not_started` ok + `cleanup.verdict="nem_indult"` — nem hamis maradvány '
    + 'és nem a tiszta takarítás letagadása',
  one_close_per_group: 'csoportonként EGY lezárási menet fut; a normál és a megszakítási út UGYANAZT az '
    + 'ígéretet várja meg (nincs versengő második takarítás, és a verdikt EGY)',
  // A GARANCIA HATÁRA — amit NEM állítunk (KUKA-012 · KUKA-089: a hiányt kimondjuk, nem elhallgatjuk).
  not_guaranteed: Object.freeze([
    'SIGKILL a FUTTATÓRA (a saját folyamatunkra): a jel nem kezelhető, takarítás nem fut — a fa a rendszernél marad',
    'az operációs rendszer kiesése (áramszünet, kernel-leállás): semmilyen felhasználói kód nem fut',
    'a SAJÁT folyamatcsoportjából ÖNÁLLÓAN kilépő leszármazott (pl. `setsid`): a csoport-jel nem éri el, '
      + 'tehát a mai csoport-kezelés NEM bizonyítja felügyeltnek',
  ]),
});
