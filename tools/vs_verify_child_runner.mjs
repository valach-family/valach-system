#!/usr/bin/env node
// tools/vs_verify_child_runner.mjs — CR01–CR08: A FUTTATÓ SZINTETIKUS PRÓBÁJA (F95-02, R97).
//
// MIÉRT KELL SZINTETIKUS PRÓBA. A söprés türelme 900 000 ms: a valódi úton EGY időtúllépés
// tizenöt percet kérne, és a „makacs unoka" helyzetet nem lehet kivárni egy ellenőrzőben. Ezért a
// helyzeteket MI állítjuk elő, MÁSODPERC alatt — de a MECHANIZMUS ugyanaz: héj → node → node, azaz
// gyermek és UNOKA, mindkettő SIGTERM-re MAKACS.
//
// AMIT MÉR (az R95 §F95-02 négy kötelme + a bekötés):
//   CR01  normál siker: kimenet megvan, kilépés 0, a fa üres
//   CR02  hibás kilépés: a kód MEGMARAD (nem mossuk el), a hibacsatorna is megvan
//   CR03  MAKACS gyermek/unoka időtúllépéskor: a futtató IGAZOLTAN lezárja a FÁT
//   CR04  nincs további életjel, és NINCS ÁTFEDÉS a következő ellenőrzéssel
//   CR05  ELLENPRÓBA: a RÉGI mechanizmus (execSync + timeout) ugyanitt SZIVÁROG — tehát a próba
//         a VÉDELMET méri, nem valami mást (KUKA-127); ha egy platformon nem szivárog, az
//         „nincs alkalmazható eset", NEM zöld (KUKA-093)
//   CR06  MEGSZAKÍTÁS (SIGINT): a futtatót megszakítva sem marad élő folyamat
//   CR07  HATÓKÖR: idegen folyamatcsoportra a modul KIVÉTELT dob, és gépszintű `pkill` nincs a kódban
//   CR08  BEKÖTÉS: a söprés TÉNYLEGESEN ezt a futtatót hívja, és `execSync`-et már nem (KUKA-165)
//
// A NYOM (REC-01 elve): minden általunk indított makacs folyamat PID-je fájlba kerül, MIELŐTT bármit
// leállítanánk — így egy megszakadt próba után is AZONOSÍTHATÓ, mit hagytunk hátra, és a takarítás
// KIZÁRÓLAG a felírt PID-eket bántja. Általános „minden node-ot leállítok" SOHA.
import { writeFileSync, appendFileSync, readFileSync, existsSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { runGuarded, signalOwnGroup, liveGroups, supportsProcessGroups, PLATFORM_LIMIT, CHILD_RUNNER_CONTRACT, groupAlive } from './lib/vs_child_runner.mjs';
import { runSequence, cleanupStateOf, NOT_STARTED_REASON, NOT_STARTED_INTERRUPTED, SWEEP_SEQUENCE_CONTRACT } from './lib/vs_sweep_sequence.mjs';
// SHD-01 (F101-01, R103): a közös megszakítási állapot szerződése. A `beginInterrupt` NEM hívható
// ebben a folyamatban (visszafordíthatatlan) — a szerződését külön folyamatban mérjük (CR15).
import { INTERRUPT_EXIT_CODES } from './lib/vs_shutdown_state.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TMP = join(ROOT, 'var', 'tmp');
mkdirSync(TMP, { recursive: true });
const tag = `chr_proba_${process.pid}`;
const SCEN = join(TMP, `${tag}_makacs.mjs`);
const HB = join(TMP, `${tag}_eletjel.txt`);
const TRACE = join(TMP, `${tag}_nyom.txt`);
const INTERRUPT = join(TMP, `${tag}_megszakitas.mjs`);

const results = [];
function check(id, name, cond, detail) {
  const pass = !!cond;
  results.push({ id, name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${name}${detail !== undefined ? '  — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
  return pass;
}
const skips = [];
function skip(id, name, why) { skips.push({ id, name, why }); console.log(`KIHAGYVA  ${id}  ${name} — ${why}`); }

// ── A MAKACS FA FORGATÓKÖNYVE: szülő + unoka, MINDKETTŐ elnyeli a szabályos leállító jelet ───────
writeFileSync(SCEN, `// A PRÓBA MAKACS FÁJA — szándékosan nem áll le SIGTERM-re (a helyzet, amit mérni kell).
import { appendFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
const [role, hb, trace] = process.argv.slice(2);
process.on('SIGTERM', () => {});
process.on('SIGINT', () => {});
process.on('SIGHUP', () => {});
appendFileSync(trace, role + ' ' + process.pid + '\\n');
if (role === 'szulo') {
  spawn(process.execPath, [new URL(import.meta.url).pathname, 'unoka', hb, trace], { stdio: 'ignore' });
}
setInterval(() => { try { appendFileSync(hb, role[0]); } catch { /* a fájl eltűnt */ } }, 50);
`);
writeFileSync(HB, '');
writeFileSync(TRACE, '');

const hbSize = () => (existsSync(HB) ? statSync(HB).size : -1);
const tracedPids = () => readFileSync(TRACE, 'utf8').split('\n').filter(Boolean)
  .map((l) => ({ role: l.split(' ')[0], pid: Number(l.split(' ')[1]) })).filter((x) => Number.isInteger(x.pid));
/**
 * ÉLETBEN VAN-E — ÉS A ZOMBIE NEM AZ (a saját első mérésem hibája, R97).
 *
 * A `process.kill(pid, 0)` egy ZOMBIE-ra is SIKERES: a folyamat már megszűnt, csak a szülője nem
 * takarította el (konténerben a PID 1 gyakran nem takarít). Az első alakom ezért „életben maradt"-at
 * mért egy SIGKILL-lel már leállított fára — a tünetet mérte, nem a mechanizmust (KUKA-049). Amit
 * mérünk: a folyamat ÁLLAPOTA (`/proc/<pid>/stat` harmadik mezője; `Z` = zombie), és emellett az
 * ÉLETJEL is (a fájl nem nő) — kettő, mert egyik sem hordozza egyedül az igazságot.
 */
const alive = (pid) => {
  try { process.kill(pid, 0); } catch (e) { if (!(e && e.code === 'EPERM')) return false; }
  if (existsSync(`/proc/${pid}/stat`)) {
    try {
      const st = readFileSync(`/proc/${pid}/stat`, 'utf8');
      const state = st.slice(st.lastIndexOf(')') + 2).trim().split(/\s+/)[0];
      return state !== 'Z';                      // a zombie NEM futó folyamat
    } catch { return false; }
  }
  try {
    const st = execSync(`ps -o state= -p ${pid}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return Boolean(st) && !st.startsWith('Z');
  } catch { return false; }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** TAKARÍTÁS CSAK A FELÍRT PID-EKRE — általános keresés vagy pkill TILOS (R95 §F95-02). */
function cleanupTraced() {
  for (const { pid } of tracedPids()) { try { process.kill(pid, 'SIGKILL'); } catch { /* már nincs */ } }
}

console.log(`── CHR-01 futtató szintetikus próbája ${'─'.repeat(50)}`);
if (PLATFORM_LIMIT) console.log(`NEVEZETT PLATFORM-KORLÁT: ${PLATFORM_LIMIT}`);

try {
  // ══ CR01 — NORMÁL SIKER ════════════════════════════════════════════════════════════════════════
  const ok = await runGuarded(`node -e "console.log('siker-jel'); process.exit(0)"`, { cwd: ROOT, timeoutMs: 20000 });
  check('CR01', 'normál siker: kimenet megvan, kilépés 0, időtúllépés nincs',
    ok.exitCode === 0 && ok.stdout.includes('siker-jel') && ok.timedOut === false,
    { exit: ok.exitCode, timedOut: ok.timedOut, ms: ok.ms });
  check('CR01', 'a siker ágán is IGAZOLT a lezárás (a fa üres, maradvány nincs)',
    ok.cleanup.leftovers === false && ['mar_ures', 'szabalyosan', 'kenyszerrel'].includes(ok.cleanup.verdict),
    ok.cleanup);
  check('CR01', 'a futás után a nyilvántartás ÜRES (nem gyűlnek benne a csoportok)', liveGroups().length === 0, liveGroups());

  // ══ CR02 — HIBÁS KILÉPÉS ═══════════════════════════════════════════════════════════════════════
  const bad = await runGuarded(`node -e "console.error('hiba-jel'); process.exit(3)"`, { cwd: ROOT, timeoutMs: 20000 });
  check('CR02', 'a hibás kilépési kód MEGMARAD (3), és NEM időtúllépésként jelenik meg',
    bad.exitCode === 3 && bad.timedOut === false, { exit: bad.exitCode, timedOut: bad.timedOut });
  check('CR02', 'a hibacsatorna is megvan (a lelet nem tűnik el a jelentésből)',
    bad.stderr.includes('hiba-jel') && bad.output.includes('hiba-jel'), { stderr: bad.stderr.trim() });
  check('CR02', 'a hiba ágán is rendezett a takarítás', bad.cleanup.leftovers === false, bad.cleanup);

  // ══ CR03 — MAKACS GYERMEK ÉS UNOKA IDŐTÚLLÉPÉSKOR ══════════════════════════════════════════════
  if (!supportsProcessGroups()) {
    skip('CR03', 'makacs fa lezárása', PLATFORM_LIMIT);
    skip('CR04', 'nincs további életjel', PLATFORM_LIMIT);
  } else {
    const stubborn = await runGuarded(`node ${JSON.stringify(SCEN)} szulo ${JSON.stringify(HB)} ${JSON.stringify(TRACE)}`,
      { cwd: ROOT, timeoutMs: 700, graceMs: 300, verifyMs: 4000 });
    const pids = tracedPids();
    check('CR03', 'a helyzet VALÓDI: szülő ÉS unoka is elindult (héj → node → node)',
      pids.length >= 2 && pids.some((p) => p.role === 'szulo') && pids.some((p) => p.role === 'unoka'), pids);
    check('CR03', 'a futtató időtúllépést jelent (nem „hibát"), és kiélesítette a leállítást',
      stubborn.timedOut === true && Array.isArray(stubborn.escalation) && stubborn.escalation.length >= 1,
      { timedOut: stubborn.timedOut, escalation: stubborn.escalation, ms: stubborn.ms });
    check('CR03', 'a lezárás IGAZOLT: a folyamatcsoport üres, maradvány nincs',
      stubborn.cleanup.leftovers === false && groupAlive(stubborn.pgid) === false, stubborn.cleanup);
    const stillAlive = pids.filter((p) => alive(p.pid));
    check('CR03', 'NEVEZETT PID-EN mérve: sem a makacs szülő, sem az UNOKA nem él tovább',
      stillAlive.length === 0, stillAlive.length ? stillAlive : `${pids.length} PID mérve, mind megszűnt`);

    // ══ CR04 — NINCS TOVÁBBI ÉLETJEL, ÉS NINCS ÁTFEDÉS A KÖVETKEZŐ ELLENŐRZÉSSEL ═════════════════
    const before = hbSize();
    const next = await runGuarded(`node -e "let s=0; for(let i=0;i<3e6;i++) s+=i; console.log('kovetkezo-ellenorzes', s>0)"`,
      { cwd: ROOT, timeoutMs: 20000 });
    await sleep(250);
    const after = hbSize();
    check('CR04', 'a következő ellenőrzés LEFUT (a takarítás nem törte el az utat)',
      next.exitCode === 0 && next.stdout.includes('kovetkezo-ellenorzes'), { exit: next.exitCode });
    check('CR04', 'a lejárt fa életjele NEM NŐTT a következő ellenőrzés alatt (nincs átfedés)',
      after === before, { elotte: before, utana: after });
  }

  // ══ CR05 — ELLENPRÓBA: A RÉGI MECHANIZMUS UGYANITT SZIVÁROG ════════════════════════════════════
  // Ez a mérés HARMADIK szava (KUKA-127): a fenti zöld csak akkor jelent védelmet, ha a RÉGI alak
  // ugyanezen a helyzeten MÉRHETŐEN elbukik. A takarítás a FELÍRT PID-ekre megy, és a nyom megmarad.
  const legacyTrace = join(TMP, `${tag}_nyom_regi.txt`);
  const legacyHb = join(TMP, `${tag}_eletjel_regi.txt`);
  writeFileSync(legacyTrace, ''); writeFileSync(legacyHb, '');
  let legacyPids = [];
  try {
    try {
      execSync(`node ${JSON.stringify(SCEN)} szulo ${JSON.stringify(legacyHb)} ${JSON.stringify(legacyTrace)}`,
        { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], timeout: 700 });
    } catch { /* ETIMEDOUT — pontosan ez a helyzet */ }
    await sleep(300);
    legacyPids = readFileSync(legacyTrace, 'utf8').split('\n').filter(Boolean)
      .map((l) => Number(l.split(' ')[1])).filter(Number.isInteger);
    const leakedBefore = legacyPids.filter((pid) => alive(pid));
    const sizeA = statSync(legacyHb).size;
    await sleep(250);
    const sizeB = statSync(legacyHb).size;
    if (leakedBefore.length === 0) {
      skip('CR05', 'a RÉGI mechanizmus szivárgása', 'ezen a platformon a régi alak sem hagyott életben folyamatot — NINCS ALKALMAZHATÓ ESET (nem zöld)');
    } else {
      check('CR05', 'a RÉGI alak (execSync + timeout) MÉRHETŐEN életben hagyta a fát — a próba a VÉDELMET méri',
        leakedBefore.length >= 1 && sizeB > sizeA, { eletben: leakedBefore, eletjel: `${sizeA} → ${sizeB}` });
    }
  } finally {
    // A NYOM ALAPJÁN, EGYENKÉNT — általános keresés nélkül.
    for (const pid of legacyPids) { try { process.kill(pid, 'SIGKILL'); } catch { /* már nincs */ } }
  }

  // ══ CR06 — MEGSZAKÍTÁS: SIGINT a futtatóra ═════════════════════════════════════════════════════
  if (!supportsProcessGroups()) {
    skip('CR06', 'megszakítás utáni rend', PLATFORM_LIMIT);
  } else {
    const intTrace = join(TMP, `${tag}_nyom_megszakitas.txt`);
    const intHb = join(TMP, `${tag}_eletjel_megszakitas.txt`);
    writeFileSync(intTrace, ''); writeFileSync(intHb, '');
    writeFileSync(INTERRUPT, `// A FUTTATÓT HASZNÁLÓ FOLYAMAT, amit menet közben MEGSZAKÍTUNK.
import { runGuarded } from ${JSON.stringify(join(ROOT, 'tools', 'lib', 'vs_child_runner.mjs'))};
console.log('indul');
await runGuarded(${JSON.stringify(`node ${JSON.stringify(SCEN)} szulo ${JSON.stringify(intHb)} ${JSON.stringify(intTrace)}`)}, { timeoutMs: 60000 });
`);
    const { spawn } = await import('node:child_process');
    const runner = spawn(process.execPath, [INTERRUPT], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((r) => { runner.stdout.on('data', (d) => { if (String(d).includes('indul')) r(); }); setTimeout(r, 3000); });
    await sleep(600);                                  // hagyjuk felállni a makacs fát
    const intPids = readFileSync(intTrace, 'utf8').split('\n').filter(Boolean)
      .map((l) => Number(l.split(' ')[1])).filter(Number.isInteger);
    const hbBefore = statSync(intHb).size;
    runner.kill('SIGINT');
    const code = await new Promise((r) => { runner.on('close', (c) => r(c)); setTimeout(() => r(null), 8000); });
    await sleep(500);
    const hbAfterInterrupt = statSync(intHb).size;
    await sleep(400);
    const hbLater = statSync(intHb).size;
    const survivors = intPids.filter((pid) => alive(pid));
    try {
      check('CR06', 'a fa elindult a megszakítás előtt (van mit lezárni — üres alapsokaság nem zöld)',
        intPids.length >= 2, intPids);
      check('CR06', 'MEGSZAKÍTÁS (SIGINT) után sem marad élő folyamat a futtató fájából',
        survivors.length === 0, survivors.length ? survivors : `${intPids.length} PID mérve, mind megszűnt`);
      check('CR06', 'a megszakítás után NINCS TOVÁBBI ÉLETJEL (a fájl nem nő — a folyamat-állapot mellett a második tanú)',
        hbLater === hbAfterInterrupt, { megszakitas_elott: hbBefore, utana: hbAfterInterrupt, kesobb: hbLater });
      check('CR06', 'a megszakítás JELE nem nyelődik el: a futtató 130-cal lép ki (a saját oka igaz marad)',
        code === 130, { kilepes: code });
    } finally {
      for (const pid of survivors) { try { process.kill(pid, 'SIGKILL'); } catch { /* már nincs */ } }
    }
  }

  // ══ CR07 — HATÓKÖR: CSAK A SAJÁT FA ════════════════════════════════════════════════════════════
  let refused = false; let msg = '';
  try { signalOwnGroup(999999, 'SIGTERM'); } catch (e) { refused = true; msg = e.message; }
  check('CR07', 'IDEGEN folyamatcsoportra a modul KIVÉTELT dob (nem lő bele a gépbe)', refused, msg);
  let refusedSelf = false;
  try { signalOwnGroup(1, 'SIGTERM'); } catch { refusedSelf = true; }
  check('CR07', 'az 1-es (init) és az érvénytelen azonosító is elutasítva', refusedSelf);
  const runnerSrc = readFileSync(join(ROOT, 'tools', 'lib', 'vs_child_runner.mjs'), 'utf8');
  const codeOnly = runnerSrc.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  // A TILALOM A VÉGREHAJTÁSRA ÁLL, NEM A SZÖVEGRE (a saját első alakom a SZERZŐDÉS `never` mezőjét
  // mérte hibának — a tiltó minta a saját dokumentációját találta meg, KUKA-239 alakja).
  check('CR07', 'a futtató nem HAJT VÉGRE gépszintű leállítást (nincs héj-hívás, nincs killall/kill -1)',
    !/(execSync|spawnSync|exec)\s*\(/.test(codeOnly) && !/killall|kill\s+-9\s+-1|process\.kill\(-1\b/.test(codeOnly),
    { hej_hivas: /(execSync|spawnSync|exec)\s*\(/.test(codeOnly) });
  // A SZABÁLY, NEM A DARABSZÁM (KUKA-045): EGY jel-küldő pont + EGY állapot-kérdező (a 0-jel nem jel).
  const probes = (codeOnly.match(/process\.kill\(-[^,]+,\s*0\)/g) || []).length;
  const senders = (codeOnly.match(/process\.kill\(-/g) || []).length - probes;
  check('CR07', 'EGY jel-küldő pont van, és mellette EGY állapot-kérdező (a 0-jel nem küld jelet)',
    senders === 1 && probes === 1, { jel_kuldo: senders, allapot_kerdezo: probes });
  check('CR07', 'a megszakítási út is a NYILVÁNTARTOTT csoportokon megy (a hatókör nem szóródik szét)',
    /for \(const pgid of \[\.\.\.live\.keys\(\)\]\)/.test(codeOnly) && /signalOwnGroup\(pgid, 'SIGKILL'\)/.test(codeOnly));
  check('CR07', 'a szerződés KIMONDJA a hatókört és a tilalmat',
    /nyilvántartott/.test(CHILD_RUNNER_CONTRACT.scope) && /pkill/.test(CHILD_RUNNER_CONTRACT.never));

  // ══ CR08 — BEKÖTÉS: A SÖPRÉS TÉNYLEGESEN EZT HÍVJA ═════════════════════════════════════════════
  const sweep = readFileSync(join(ROOT, 'tools', 'vs_verify_sweep.mjs'), 'utf8');
  const sweepCode = sweep.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  check('CR08', 'a söprés a védett futtatót hívja (nem saját ága van)',
    /vs_child_runner\.mjs/.test(sweepCode) && /runGuarded\(/.test(sweepCode));
  check('CR08', 'a söprésben NINCS `execSync` (a régi, unokát elengedő mechanizmus kivezetve)',
    !/execSync\(/.test(sweepCode), { talalat: (sweepCode.match(/execSync\(/g) || []).length });
  check('CR08', 'a söprés a MARADVÁNYT is kiírja, nem csak az időtúllépést (a némaság tilos — KUKA-012)',
    /cleanup/.test(sweepCode) && /leftovers|maradv/.test(sweepCode));
  // A SORREND IS BEKÖTÖTT ÚT: a söprés a KÖZÖS vezérlőt hívja, nem a törzsében őrzött másolatot.
  check('CR08', 'a söprés a KÖZÖS sorozat-vezérlőt hívja (SEQ-01), nem saját ciklusa dönt a sorrendről',
    /vs_sweep_sequence\.mjs/.test(sweepCode) && /runSequence\(/.test(sweepCode));
  check('CR08', 'a söprés a MEG NEM INDULT feladatokat kiírja, és miattuk HIBÁVAL zár',
    /NEM INDULT EL/.test(sweep) && /notStarted\.length\) process\.exit\(1\)/.test(sweepCode),
    { kiirja: /NEM INDULT EL/.test(sweep), hibaval_zar: /notStarted\.length\) process\.exit\(1\)/.test(sweepCode) });

  // ══ CR09 — A SOROZAT MEGY TOVÁBB, HA A LEZÁRÁS IGAZOLT ═════════════════════════════════════════
  // A TÉNYLEGES vezérlőt (SEQ-01) hívjuk, és CSAK a futtató válaszát helyettesítjük — pontosan úgy,
  // ahogy az R98 a hibát mérte. Így a próba nem egy másolatot igazol (KUKA-207 · KUKA-051).
  const IGAZOLT = { verdict: 'mar_ures', steps: [], leftovers: false };
  const valasz = (cleanup, exitCode = 0) => async () => ({ exitCode, timedOut: false, stdout: 'ok', output: 'ok', cleanup });
  {
    const inditva = [];
    const r = await runSequence([{ s: 'elso' }, { s: 'masodik' }], {
      run: async (it) => { inditva.push(it.s); return valasz(IGAZOLT)(); },
    });
    check('CR09', 'IGAZOLT lezárás után a második feladat PONTOSAN EGYSZER indul el',
      inditva.join(',') === 'elso,masodik' && r.notStarted.length === 0 && !r.halted,
      { inditva, nem_indult: r.notStarted.length, megallt: Boolean(r.halted) });

    // A FELADAT EREDMÉNYE ÉS A LEZÁRÁS KÉT KÜLÖN TÉNY (R98 előírása).
    const piros = [];
    const rp = await runSequence([{ s: 'a' }, { s: 'b' }], {
      run: async (it) => { piros.push(it.s); return valasz(IGAZOLT, 1)(); },
    });
    check('CR09', 'PIROS verifier NEM állítja meg a sorozatot (az eredmény és a lezárás külön tény)',
      piros.join(',') === 'a,b' && !rp.halted, { inditva: piros });
  }

  // ══ CR10 — IGAZOLATLAN LEZÁRÁS UTÁN A KÖVETKEZŐ NULLA ALKALOMMAL INDUL ══════════════════════════
  for (const [cim, cleanup] of [
    ['MARADVÁNY', { verdict: 'nem_igazolt', steps: ['a csoport a KÉNYSZER után sem ürült ki'], leftovers: true }],
    ['PLATFORM-KORLÁT (nem mérhető lezárás)', { verdict: 'nem_mert', steps: ['nincs folyamatcsoport-támogatás'], leftovers: null }],
    ['HIÁNYZÓ takarítás-válasz', undefined],
  ]) {
    const inditva = [];
    const r = await runSequence([{ s: 'elso' }, { s: 'masodik' }, { s: 'harmadik' }], {
      run: async (it) => { inditva.push(it.s); return valasz(cleanup)(); },
    });
    check('CR10', `${cim}: a KÖVETKEZŐ feladat NULLA alkalommal indul el`,
      inditva.join(',') === 'elso' && r.results.length === 1, { inditva });
    check('CR10', `${cim}: a kimaradt feladatok MEGNEVEZVE, nevezett okkal (nem néma kihagyás, nem zöld)`,
      r.notStarted.map((n) => n.item.s).join(',') === 'masodik,harmadik'
      && r.notStarted.every((n) => n.reason === NOT_STARTED_REASON),
      r.notStarted.map((n) => `${n.item.s}: ${n.reason}`));
  }
  check('CR10', 'a takarítás-állapot feloldója NEVEZETT választ ad (igazolt · maradvany · nem_igazolhato; a negyedik, `nem_indult` a CR15-ben)',
    cleanupStateOf({ leftovers: false }).state === 'igazolt'
    && cleanupStateOf({ leftovers: true }).state === 'maradvany'
    && cleanupStateOf({ leftovers: null }).state === 'nem_igazolhato'
    && cleanupStateOf(undefined).state === 'nem_igazolhato',
    { platform_korlat: SWEEP_SEQUENCE_CONTRACT.platform_limit });

  // ══ CR11 — MEGSZAKÍTÁSKOR A SZABÁLYOS GYERMEK BEFEJEZI A SAJÁT TAKARÍTÁSÁT ══════════════════════
  // EZ AZ R98 MÉRÉSE: 1000 ms türelem mellett egy 100 ms alatt záró gyermek jelzőfájlja meg sem
  // született, mert a jel-út SIGTERM után AZONNAL SIGKILL-t küldött.
  const KESZ = join(TMP, `${tag}_szabalyos_kesz.txt`);
  const SZABALYOS = join(TMP, `${tag}_szabalyos.mjs`);
  const RUNNER_UT = join(ROOT, 'tools', 'lib', 'vs_child_runner.mjs');
  if (!supportsProcessGroups()) {
    skip('CR11', 'a szabályos gyermek türelmen belüli takarítása', PLATFORM_LIMIT);
    skip('CR12', 'a makacs fa véges kényszerleállítása megszakításkor', PLATFORM_LIMIT);
    skip('CR13', 'ismételt megszakítás', PLATFORM_LIMIT);
  } else {
    const { spawn } = await import('node:child_process');
    writeFileSync(SZABALYOS, `// SZABÁLYOSAN LEZÁRÓ gyermek: SIGTERM-re 100 ms alatt takarít és NYOMOT hagy.
import { writeFileSync } from 'node:fs';
let zar = false;
process.on('SIGTERM', () => {
  if (zar) return; zar = true;
  setTimeout(() => { writeFileSync(${JSON.stringify(KESZ)}, 'LEZART'); process.exit(0); }, 100);
});
setInterval(() => {}, 1000);
console.log('gyermek-indult');
`);
    /** Egy futtatót indít, megvárja az indulást, majd megszakítja — és MÉRI a lezárást. */
    const megszakit = async ({ file, cmd, graceMs, jelek = 1, kozotte = 120, varakozas = 12000 }) => {
      writeFileSync(file, `import { runGuarded } from ${JSON.stringify(RUNNER_UT)};
console.log('indul');
await runGuarded(${JSON.stringify(cmd)}, { timeoutMs: 60000, graceMs: ${graceMs}, verifyMs: 3000 });
`);
      const runner = spawn(process.execPath, [file], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
      await new Promise((r) => { runner.stdout.on('data', (d) => { if (String(d).includes('indul')) r(); }); setTimeout(r, 4000); });
      await sleep(700);                                   // hagyjuk felállni a fát
      // A ZÁRÁS FIGYELŐJE A JELEK ELŐTT ÁLL FEL. Az első alakom a jel-küldő ciklus UTÁN kötötte be, és
      // az ismételt jelre GYORSAN (≈180 ms) kilépő futtató `close` eseménye a ciklus alatt ELVESZETT —
      // a próba a SAJÁT versenyhelyzetét mérte a rendszer helyett, és ártatlan kódot mondott hibásnak
      // (KUKA-120 · KUKA-127: a piros nem a védelem miatt piros).
      const zarva = new Promise((r) => { runner.on('close', (c) => r(c)); setTimeout(() => r(null), varakozas); });
      const t0 = Date.now();
      for (let i = 0; i < jelek; i += 1) { runner.kill('SIGINT'); if (i + 1 < jelek) await sleep(kozotte); }
      const code = await zarva;
      return { code, ms: Date.now() - t0 };
    };

    const r11 = await megszakit({
      file: join(TMP, `${tag}_futtato_szabalyos.mjs`),
      cmd: `node ${JSON.stringify(SZABALYOS)}`,
      graceMs: 1000,
    });
    check('CR11', 'MEGSZAKÍTÁSKOR a szabályos gyermek a TÜRELMEN BELÜL befejezi a saját takarítását',
      existsSync(KESZ), { jelzo_letrejott: existsSync(KESZ), kilepes: r11.code, ms: r11.ms });
    check('CR11', 'és a jel így sem nyelődik el: a futtató 130-cal lép ki, VÉGES időn belül',
      r11.code === 130 && r11.ms < 12000, { kilepes: r11.code, ms: r11.ms });

    // ══ CR12 — MAKACS FA: A VÉGES KÉNYSZERLEÁLLÍTÁS IS IGAZOLT A MEGSZAKÍTÁSI ÚTON ════════════════
    const TR12 = join(TMP, `${tag}_nyom_cr12.txt`);
    const HB12 = join(TMP, `${tag}_eletjel_cr12.txt`);
    writeFileSync(TR12, ''); writeFileSync(HB12, '');
    const r12 = await megszakit({
      file: join(TMP, `${tag}_futtato_makacs.mjs`),
      cmd: `node ${JSON.stringify(SCEN)} szulo ${JSON.stringify(HB12)} ${JSON.stringify(TR12)}`,
      graceMs: 400,
    });
    await sleep(400);
    const pids12 = readFileSync(TR12, 'utf8').split('\n').filter(Boolean)
      .map((l) => Number(l.split(' ')[1])).filter(Number.isInteger);
    const tul12 = pids12.filter((pid) => alive(pid));
    const hb12 = statSync(HB12).size; await sleep(300); const hb12k = statSync(HB12).size;
    try {
      check('CR12', 'a MAKACS fa (szülő + unoka) tényleg felállt — üres alapsokaság nem zöld',
        pids12.length >= 2, pids12);
      check('CR12', 'megszakításkor a türelem után a KÉNYSZERLEÁLLÍTÁS is lefut: nem marad élő folyamat',
        tul12.length === 0, tul12.length ? tul12 : `${pids12.length} PID mérve, mind megszűnt`);
      check('CR12', 'a lezárás VÉGES (a türelem + kényszer nem nyúlik el), és nincs további életjel',
        r12.ms < 12000 && hb12k === hb12, { ms: r12.ms, eletjel: `${hb12} → ${hb12k}`, kilepes: r12.code });
    } finally {
      for (const pid of tul12) { try { process.kill(pid, 'SIGKILL'); } catch { /* már nincs */ } }
    }

    // ══ CR13 — ISMÉTELT MEGSZAKÍTÁS: EGYÉRTELMŰ, VÉGES, VERSENGÉS NÉLKÜL ══════════════════════════
    const TR13 = join(TMP, `${tag}_nyom_cr13.txt`);
    const HB13 = join(TMP, `${tag}_eletjel_cr13.txt`);
    writeFileSync(TR13, ''); writeFileSync(HB13, '');
    // HOSSZÚ türelem + KÉT jel: az ismételt jel a türelmet zárja le — a kilépés a türelemnél GYORSABB.
    const r13 = await megszakit({
      file: join(TMP, `${tag}_futtato_ismetelt.mjs`),
      cmd: `node ${JSON.stringify(SCEN)} szulo ${JSON.stringify(HB13)} ${JSON.stringify(TR13)}`,
      graceMs: 9000,
      jelek: 3,
      kozotte: 150,
    });
    await sleep(400);
    const pids13 = readFileSync(TR13, 'utf8').split('\n').filter(Boolean)
      .map((l) => Number(l.split(' ')[1])).filter(Number.isInteger);
    const tul13 = pids13.filter((pid) => alive(pid));
    try {
      check('CR13', 'ISMÉTELT megszakítás (3 jel): a futtató VÉGES időn belül kilép — a türelmet a jel zárja le',
        r13.code !== null && r13.ms < 9000, { kilepes: r13.code, ms: r13.ms, turelem_volt: 9000 });
      check('CR13', 'ismételt jel után sem marad ÉLŐ folyamat (versengő takarítás nem szakítja meg a lezárást)',
        tul13.length === 0, tul13.length ? tul13 : `${pids13.length} PID mérve, mind megszűnt`);
      check('CR13', 'a kilépési ok IGAZ marad ismételt jelnél is (130), nem lesz belőle összeomlás',
        r13.code === 130, { kilepes: r13.code });
    } finally {
      for (const pid of tul13) { try { process.kill(pid, 'SIGKILL'); } catch { /* már nincs */ } }
    }

    // A NORMÁL SIKER ÉS A HIBÁS KILÉPÉS NYILVÁNTARTÁSI MARADVÁNYA — a négyes lefedés zárása.
    await runGuarded('node -e "process.exit(0)"', { cwd: ROOT, timeoutMs: 20000, graceMs: 300, verifyMs: 300 });
    await runGuarded('node -e "process.exit(4)"', { cwd: ROOT, timeoutMs: 20000, graceMs: 300, verifyMs: 300 });
    check('CR13', 'normál siker és hibás kilépés után a NYILVÁNTARTÁS is üres (nem gyűlnek a csoportok)',
      liveGroups().length === 0, liveGroups());

    // ══ CR14 — MEGSZAKÍTÁS UTÁN NINCS ÚJ FELADAT (F101-01, R101/R103) ═════════════════════════════
    // AZ ELFOGADÁSI PRÓBA, ahogy a külső ellenőrző fél kérte: VALÓDI jel, VALÓDI `runSequence` +
    // `runGuarded`, külön folyamatban. A mérés HÁROM dolgot mond ki egyszerre, mert egyik sem elég:
    //   · a második VISSZAHÍVÁS nulla   (a sorozat nem hívta meg a következő feladatot)
    //   · a második GYERMEK nulla       (a futtató nem indított új folyamatot)
    //   · az első feladat lezárása IGAZOLT volt (`igazolt`) — tehát a megállást NEM hamis maradvány
    //     és NEM a tiszta takarítás letagadása okozta, hanem a nevezett MEGSZAKÍTÁS (R101/2).
    const F101 = join(TMP, `${tag}_f101`);
    mkdirSync(F101, { recursive: true });
    const LIBDIR = join(ROOT, 'tools', 'lib');
    writeFileSync(join(F101, 'elso.mjs'), `// SZABÁLYOSAN, KÉSLELTETVE záró gyermek: jelre 100 ms alatt kilép.
import { writeFileSync } from 'node:fs';
let zar = false;
const zarj = () => { if (zar) return; zar = true; setTimeout(() => process.exit(0), 100); };
process.on('SIGTERM', zarj); process.on('SIGINT', zarj);
setInterval(() => {}, 1000);
writeFileSync(process.argv[2], 'elso-gyermek-all');
`);
    writeFileSync(join(F101, 'masodik.mjs'), 'setInterval(() => {}, 50);\n');
    writeFileSync(join(F101, 'szulo.mjs'), `// A VALÓDI vezérlőt és a VALÓDI futtatót használó szülő.
import { writeFileSync } from 'node:fs';
const [libDir, dir] = process.argv.slice(2);
const { runGuarded } = await import(libDir + '/vs_child_runner.mjs');
const { runSequence } = await import(libDir + '/vs_sweep_sequence.mjs');
const here = import.meta.dirname;
const seq = await runSequence(['a', 'b'], {
  run: async (name) => {
    if (name === 'b') writeFileSync(dir + '/masodik_visszahivas.txt', 'meghivva');
    // Az ELSŐ parancs exec-kel indít node-ot (egyetlen folyamat a csoportban), a MÁSODIK a héjból
    // AZONNAL jelzi az indulását — így a „második gyermek" ténye a spawn pillanatában látszik.
    const cmd = name === 'a'
      ? 'exec node ' + JSON.stringify(here + '/elso.mjs') + ' ' + JSON.stringify(dir + '/elso_all.txt')
      : 'printf masodik > ' + JSON.stringify(dir + '/masodik_gyermek.txt') + '; exec node ' + JSON.stringify(here + '/masodik.mjs');
    return runGuarded(cmd, { timeoutMs: 60000, graceMs: 1000, verifyMs: 1000 });
  },
});
writeFileSync(dir + '/seq.json', JSON.stringify({
  elso_cleanup: (seq.results[0] || {}).cleanup_state || null,
  halted: seq.halted, notStarted: seq.notStarted.map((n) => ({ item: n.item, reason: n.reason, kind: n.kind, signal: n.signal })),
}));
`);
    /** EGY menet: elindít, megvárja az első gyermek indulását, jelet küld, és MÉR. */
    const f101Menet = async (libDir, sig, i) => {
      const dir = join(F101, `m_${libDir === LIBDIR ? 'eles' : 'ellen'}_${sig}_${i}`);
      rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
      const { spawn } = await import('node:child_process');
      const p = spawn(process.execPath, [join(F101, 'szulo.mjs'), libDir, dir], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
      let err = '';
      p.stderr.on('data', (d) => { err += d; });
      const zarva = new Promise((r) => { p.on('close', (c) => r(c)); setTimeout(() => r(null), 25000); });
      const t0 = Date.now();
      while (!existsSync(join(dir, 'elso_all.txt')) && Date.now() - t0 < 10000) await sleep(20);
      const elsoAll = existsSync(join(dir, 'elso_all.txt'));
      p.kill(sig);
      const code = await zarva;
      await sleep(250);
      const seq = existsSync(join(dir, 'seq.json')) ? JSON.parse(readFileSync(join(dir, 'seq.json'), 'utf8')) : null;
      return {
        elsoAll,
        masodikVisszahivas: existsSync(join(dir, 'masodik_visszahivas.txt')),
        masodikGyermek: existsSync(join(dir, 'masodik_gyermek.txt')),
        code, ms: Date.now() - t0, seq, err: err.trim(),
      };
    };

    const eles = [];
    for (const sig of ['SIGTERM', 'SIGINT']) {
      for (let i = 1; i <= 2; i += 1) eles.push({ sig, ...(await f101Menet(LIBDIR, sig, i)) });
    }
    check('CR14', 'a helyzet VALÓDI: mind a négy menetben elindult az ELSŐ gyermek (üres alapsokaság nem zöld)',
      eles.every((r) => r.elsoAll), eles.map((r) => `${r.sig}:${r.elsoAll}`).join(' '));
    check('CR14', 'MEGSZAKÍTÁS után a MÁSODIK VISSZAHÍVÁS nulla alkalommal fut le (SIGTERM és SIGINT)',
      eles.every((r) => r.masodikVisszahivas === false),
      eles.map((r) => `${r.sig}:${r.masodikVisszahivas}`).join(' '));
    check('CR14', 'MEGSZAKÍTÁS után a MÁSODIK GYERMEK nulla alkalommal indul el',
      eles.every((r) => r.masodikGyermek === false),
      eles.map((r) => `${r.sig}:${r.masodikGyermek}`).join(' '));
    check('CR14', 'a megállás oka NEVEZETT MEGSZAKÍTÁS — nem hamis maradvány, és nem a tiszta takarítás letagadása',
      eles.every((r) => r.seq && r.seq.elso_cleanup === 'igazolt' && r.seq.halted
        && r.seq.halted.kind === 'megszakitas' && r.seq.halted.signal === r.sig),
      eles.map((r) => `${r.sig}: elso_lezaras=${r.seq && r.seq.elso_cleanup} megallas=${r.seq && r.seq.halted && r.seq.halted.kind}`).join(' · '));
    check('CR14', 'a MEG NEM INDULT tétel megnevezve marad, a jellel együtt (nem néma kihagyás, nem zöld)',
      eles.every((r) => r.seq && r.seq.notStarted.length === 1 && r.seq.notStarted[0].item === 'b'
        && r.seq.notStarted[0].reason === NOT_STARTED_INTERRUPTED && r.seq.notStarted[0].signal === r.sig),
      eles[0].seq && eles[0].seq.notStarted);
    check('CR14', 'a kilépés NEM siker, és a jel oka igaz marad (SIGTERM→143 · SIGINT→130), VÉGES időn belül',
      eles.every((r) => r.code === INTERRUPT_EXIT_CODES[r.sig] && r.ms < 20000),
      eles.map((r) => `${r.sig}→${r.code} (${r.ms} ms)`).join(' · '));
    check('CR14', 'a lezárás alatt a felvett lista MÖGÉ nem került új csoport, és a hibacsatorna néma',
      eles.every((r) => r.err === ''), eles.map((r) => r.err).filter(Boolean).slice(0, 2));

    // ══ CR15 — A KÉT KAPU ELLENPRÓBÁJA + A FUTTATÓ SAJÁT HATÁRA ═══════════════════════════════════
    // A ZÖLD CSAK AKKOR JELENT VÉDELMET, HA A KAPU KIVÉTELÉRE MÉRHETŐEN ELBUKIK (KUKA-127). A
    // forrásból jelölők mentén vesszük ki a kaput; ha a jelölő HIÁNYZIK, a válasz „nincs alkalmazható
    // eset", NEM zöld (KUKA-093 · KUKA-051: a hatókör szabály, nem lista).
    const kapuNelkul = (nev, jelolo) => {
      const d = join(F101, `nogate_${nev}`);
      rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true });
      let vagott = 0;
      for (const f of ['vs_shutdown_state.mjs', 'vs_child_runner.mjs', 'vs_sweep_sequence.mjs']) {
        let src = readFileSync(join(LIBDIR, f), 'utf8');
        const nyit = src.indexOf(`[${jelolo}]`);
        const zar = src.indexOf(`[/${jelolo}]`);
        if (nyit >= 0 && zar > nyit) {
          const sorEleje = src.lastIndexOf('\n', nyit) + 1;
          const sorVege = src.indexOf('\n', zar) + 1;
          src = src.slice(0, sorEleje) + src.slice(sorVege);
          vagott += 1;
        }
        writeFileSync(join(d, f), src);
      }
      return vagott === 1 ? d : null;
    };

    // ── (a) A SOROZAT-KAPU: kivéve visszatér a MÉRT hiba (a második visszahívás lefut).
    const nogateSeq = kapuNelkul('sorozat', 'F101-01-KAPU:SOROZAT');
    if (!nogateSeq) {
      skip('CR15', 'a sorozat-kapu ellenpróbája', 'a [F101-01-KAPU:SOROZAT] jelölő nem található — NINCS ALKALMAZHATÓ ESET (nem zöld)');
    } else {
      const ellen = [];
      for (let i = 1; i <= 2; i += 1) ellen.push(await f101Menet(nogateSeq, 'SIGTERM', i));
      check('CR15', 'ELLENPRÓBA: a SOROZAT-KAPU nélkül a második visszahívás MÉRHETŐEN lefut — tehát a CR14 a VÉDELMET méri',
        ellen.every((r) => r.elsoAll) && ellen.every((r) => r.masodikVisszahivas === true),
        ellen.map((r) => `elso=${r.elsoAll} masodik_visszahivas=${r.masodikVisszahivas}`).join(' · '));
    }

    // ── (b) A FUTTATÓ SAJÁT HATÁRA: közvetlen hívás a leállítás ALATT — és a kapu ellenpróbája.
    // A sorozat itt nincs a képben: ezt a kaput a futtató maga tartja (R101/2 második fele).
    // A MAKACS gyermek KÜLÖN FÁJL: a beágyazott idézőjelek az első alakomban a PRÓBÁT buktatták el
    // (`exit 1`, üres válasz), nem a rendszert — pontosan az a hiba-osztály, amiről a KUKA-120 szól.
    writeFileSync(join(F101, 'makacs.mjs'), `process.on('SIGTERM', () => {});
process.on('SIGINT', () => {});
setInterval(() => {}, 50);
`);
    writeFileSync(join(F101, 'hatar.mjs'), `// KÖZVETLEN futtató-hívás a rendezett lezárás KÖZBEN.
import { writeFileSync } from 'node:fs';
const [libDir, dir] = process.argv.slice(2);
const { runGuarded } = await import(libDir + '/vs_child_runner.mjs');
const here = import.meta.dirname;
// MAKACS fa hosszú türelemmel: a lezárás eltart egy ideig — ez a MÉRHETŐ ABLAK.
const p = runGuarded('exec node ' + JSON.stringify(here + '/makacs.mjs'), { timeoutMs: 60000, graceMs: 2500, verifyMs: 3000 });
// A SAJÁT figyelőnk a futtatóé UTÁN fut (az övé települt előbb) — a tilalom tehát MÁR áll.
process.on('SIGTERM', () => {
  setTimeout(async () => {
    const r = await runGuarded('printf masodik > ' + JSON.stringify(dir + '/kozvetlen_gyermek.txt') + '; exec node ' + JSON.stringify(here + '/makacs.mjs'),
      { timeoutMs: 20000, graceMs: 300, verifyMs: 300 });
    writeFileSync(dir + '/kozvetlen.json', JSON.stringify({
      started: r.started === true, not_started: r.not_started || null, verdict: r.cleanup && r.cleanup.verdict, pgid: r.pgid,
    }));
  }, 500);
});
console.log('indul');
await p;
`);
    const hatarMenet = async (libDir, cimke) => {
      const dir = join(F101, `hatar_${cimke}`);
      rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
      const { spawn } = await import('node:child_process');
      const p = spawn(process.execPath, [join(F101, 'hatar.mjs'), libDir, dir], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
      const zarva = new Promise((r) => { p.on('close', (c) => r(c)); setTimeout(() => r(null), 25000); });
      await new Promise((r) => { p.stdout.on('data', (d) => { if (String(d).includes('indul')) r(); }); setTimeout(r, 5000); });
      await sleep(400);
      p.kill('SIGTERM');
      const code = await zarva;
      await sleep(200);
      return {
        gyermek: existsSync(join(dir, 'kozvetlen_gyermek.txt')),
        valasz: existsSync(join(dir, 'kozvetlen.json')) ? JSON.parse(readFileSync(join(dir, 'kozvetlen.json'), 'utf8')) : null,
        code,
      };
    };
    const h = await hatarMenet(LIBDIR, 'eles');
    check('CR15', 'a futtató SAJÁT HATÁRÁN sem indul gyermek a leállítás alatt (a sorozat nincs a képben)',
      h.gyermek === false && h.valasz && h.valasz.started === false && h.valasz.pgid === null, h);
    check('CR15', 'és a válasz NEVEZETT: „nem indult" + `nem_indult` verdikt — nem hamis maradvány, nem tiszta takarítás',
      Boolean(h.valasz && h.valasz.verdict === 'nem_indult' && /MEGSZAKÍTÁS/.test(String(h.valasz.not_started))),
      h.valasz);
    const nogateChr = kapuNelkul('inditas', 'F101-01-KAPU:INDITAS');
    if (!nogateChr) {
      skip('CR15', 'az indítási kapu ellenpróbája', 'a [F101-01-KAPU:INDITAS] jelölő nem található — NINCS ALKALMAZHATÓ ESET (nem zöld)');
    } else {
      const he = await hatarMenet(nogateChr, 'ellen');
      check('CR15', 'ELLENPRÓBA: az INDÍTÁSI KAPU nélkül a leállítás alatt MÉRHETŐEN elindul egy új gyermek',
        he.gyermek === true && he.valasz && he.valasz.started === true && Number.isInteger(he.valasz.pgid), he);
    }

    // ── (c) A KAPU HELYE SZABÁLY, NEM SZÖVEG: a kérdés és a `spawn` közé nem kerülhet `await`.
    // Ha odakerülne, a jelkezelő KÖZÉJÜK tudna futni, és a rés visszanyílna — időzítéstől függően,
    // tehát némán (KUKA-202: az őr ott álljon, ahol a kár keletkezik).
    const runnerTxt = readFileSync(join(LIBDIR, 'vs_child_runner.mjs'), 'utf8');
    const kapuTol = runnerTxt.indexOf('if (isInterrupted()) {');
    const spawnIg = runnerTxt.indexOf('const child = spawn(cmd, {');
    check('CR15', 'az indítási kapu és a `spawn` között NINCS `await` (jel nem tud közéjük futni)',
      kapuTol >= 0 && spawnIg > kapuTol && !/\bawait\b/.test(runnerTxt.slice(kapuTol, spawnIg)),
      { kapu_a_spawn_elott: kapuTol >= 0 && spawnIg > kapuTol });
    check('CR15', 'a takarítás-feloldó a MEG NEM INDULT feladatot sem nevezi igazoltnak',
      cleanupStateOf({ verdict: 'nem_indult', leftovers: null }).state === 'nem_indult'
      && SWEEP_SEQUENCE_CONTRACT.halts_on.includes('nem_indult'),
      { halts_on: SWEEP_SEQUENCE_CONTRACT.halts_on });
    // A KÖZÖS ÁLLAPOT SZERZŐDÉSE külön folyamatban mérve: a `beginInterrupt` visszafordíthatatlan,
    // ezért a saját folyamatunkban NEM hívjuk meg (az a próba hátralévő részét bénítaná meg).
    const SHD = join(F101, 'shd.mjs');
    writeFileSync(SHD, `import { beginInterrupt, isInterrupted, forceRequested, interruptState, INTERRUPT_EXIT_CODES }
  from ${JSON.stringify(join(LIBDIR, 'vs_shutdown_state.mjs'))};
const elotte = isInterrupted();
const a = beginInterrupt('SIGTERM');
const kozben = forceRequested();
const b = beginInterrupt('SIGINT');
console.log(JSON.stringify({ elotte, elso_friss: a.fresh, kozben, ismetelt_friss: b.fresh, force: forceRequested(),
  jel: interruptState().signal, kod: interruptState().code, terkep: INTERRUPT_EXIT_CODES }));
`);
    const shdOut = await runGuarded(`node ${JSON.stringify(SHD)}`, { cwd: ROOT, timeoutMs: 20000, graceMs: 300, verifyMs: 300 });
    let shd = null;
    try { shd = JSON.parse(shdOut.stdout.trim()); } catch { /* nevezett hiány lesz belőle */ }
    check('CR15', 'SHD-01: az ELSŐ jel állítja be az állapotot, az ISMÉTELT csak a kényszert kéri — az ok az ELSŐ jelé',
      Boolean(shd) && shd.elotte === false && shd.elso_friss === true && shd.kozben === false
      && shd.ismetelt_friss === false && shd.force === true && shd.jel === 'SIGTERM' && shd.kod === 143,
      shd || shdOut.output.trim().slice(0, 200));
    check('CR15', 'SHD-01: a kilépési kód 128 + jelszám mind a három kezelt jelre (a SIGHUP is 129, nem 143)',
      Boolean(shd) && shd.terkep.SIGINT === 130 && shd.terkep.SIGTERM === 143 && shd.terkep.SIGHUP === 129,
      shd && shd.terkep);
  }
} finally {
  // A PRÓBA SAJÁT SZEMETE: a felírt PID-ek, majd a fájlok. A nyomot CSAK sikeres takarítás után visszük el.
  cleanupTraced();
  // Az F101-01 próbájának SAJÁT munkakönyvtára (fák, kapu nélküli másolatok, menet-naplók).
  try { rmSync(join(TMP, `${tag}_f101`), { recursive: true, force: true }); } catch { /* marad, és ez a nyom */ }
  for (const f of [SCEN, HB, TRACE, INTERRUPT, join(TMP, `${tag}_nyom_regi.txt`), join(TMP, `${tag}_eletjel_regi.txt`),
    join(TMP, `${tag}_nyom_megszakitas.txt`), join(TMP, `${tag}_eletjel_megszakitas.txt`),
    join(TMP, `${tag}_szabalyos.mjs`), join(TMP, `${tag}_szabalyos_kesz.txt`), join(TMP, `${tag}_futtato_szabalyos.mjs`),
    join(TMP, `${tag}_futtato_makacs.mjs`), join(TMP, `${tag}_nyom_cr12.txt`), join(TMP, `${tag}_eletjel_cr12.txt`),
    join(TMP, `${tag}_futtato_ismetelt.mjs`), join(TMP, `${tag}_nyom_cr13.txt`), join(TMP, `${tag}_eletjel_cr13.txt`)]) {
    try { rmSync(f, { force: true }); } catch { /* marad, és ez a nyom */ }
  }
}

const pass = results.filter((r) => r.pass).length;
console.log(`\n${'='.repeat(100)}`);
console.log(`CHR-01 (F95-02) szintetikus próba: ${pass}/${results.length} PASS`
  + `${skips.length ? ` · ${skips.length} NEVEZETT KIHAGYÁS` : ''}${pass === results.length ? '' : ` — ${results.length - pass} FAIL`}`);
for (const s of skips) console.log(`  · KIHAGYVA ${s.id}: ${s.why}`);
console.log('KIMONDVA: ez a MECHANIZMUST méri (héj → node → node, makacs jel-elnyeléssel), NEM az eredeti');
console.log('15 perces söprés-futást — azt a lánc célzott futtatása mutatja meg. A processzor-terhelés és a');
console.log('modell-fogyasztás KÜLÖN mérték: a beragadt futás pontos token-költsége NEM mérve (R95).');
process.exit(pass === results.length ? 0 : 1);
