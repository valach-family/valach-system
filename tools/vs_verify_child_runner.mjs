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
import { writeFileSync, appendFileSync, readFileSync, readdirSync, existsSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { runGuarded, signalOwnGroup, liveGroups, supportsProcessGroups, PLATFORM_LIMIT, CHILD_RUNNER_CONTRACT, groupAlive } from './lib/vs_child_runner.mjs';
import { runSequence, cleanupStateOf, NOT_STARTED_REASON, NOT_STARTED_INTERRUPTED, SWEEP_SEQUENCE_CONTRACT } from './lib/vs_sweep_sequence.mjs';
// SHD-01 (F101-01, R103): a közös megszakítási állapot szerződése. A `beginInterrupt` NEM hívható
// ebben a folyamatban (visszafordíthatatlan) — a szerződését külön folyamatban mérjük (CR15).
import { INTERRUPT_EXIT_CODES } from './lib/vs_shutdown_state.mjs';
// ITR-01 (F105-01, R105): a megszakítási jelentés BIZTOS csatornája. A feloldóit HÍVJUK (nem
// forrásszöveget vizsgálunk), és a TÉNYLEGES söprést futtatjuk a jelentés mérésére — CR16.
import { cleanupLine, deadlineMsFor, renderInterruptReport, registerPlan, markStarted, markSettled,
  planProgress, REPORT_MARGIN_MS, INTERRUPT_REPORT_CONTRACT } from './lib/vs_interrupt_report.mjs';

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
  // A MINTA A SZABÁLYRA ILLESZT, NEM EGY SZÓ SZERINTI SORRA (KUKA-045). Az első alak a
  // `notStarted.length) process.exit(1)` karaktersorra illesztett — a KUKA-250 egy ÚJ okot tett a
  // feltételbe (`|| interrupted.length`), és a minta azonnal elbukott, holott a SZABÁLY teljesült.
  // Amit mérni kell: a `notStarted.length` BENNE VAN-e a záró, hibával kilépő feltételben.
  const zaroKilepes = /if \(([^)]*)\) process\.exit\(1\);/.exec(sweepCode);
  const zarFeltetel = zaroKilepes ? zaroKilepes[1] : '';
  check('CR08', 'a söprés a MEG NEM INDULT feladatokat kiírja, és miattuk HIBÁVAL zár',
    /NEM INDULT EL/.test(sweep) && /notStarted\.length/.test(zarFeltetel),
    { kiirja: /NEM INDULT EL/.test(sweep), hibaval_zar: /notStarted\.length/.test(zarFeltetel), zaro_feltetel: zarFeltetel });

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
    // A HIBACSATORNA MOSTANTÓL NEM NÉMA, ÉS EZ A JAVÍTÁS (F105-01, R105 — a szöveg a valóságot
    // követi, KUKA-050). Az R104-es alak itt üres hibacsatornát KÖVETELT meg; közben épp a NÉMASÁG
    // volt a lelet: makacs gyermeknél a söprés jelentés nélkül lépett ki. Amit itt mérni kell: a
    // csatornán a MEGSZAKÍTÁSI JELENTÉS áll (a jellel), és NEM váratlan kivétel vagy veremkiírás.
    check('CR14', 'a lezárás alatt a hibacsatornán a MEGSZAKÍTÁSI JELENTÉS áll (a jellel), váratlan kivétel nélkül',
      eles.every((r) => /MEGSZAKÍTÁSI JELENTÉS \(ITR-01\)/.test(r.err) && r.err.includes(`JEL: ${r.sig}`)
        && !/\bat .*\.mjs:\d+|ERR_[A-Z_]+|UnhandledPromiseRejection/.test(r.err)),
      eles.map((r) => `${r.sig}: jelentes=${/MEGSZAKÍTÁSI JELENTÉS/.test(r.err)}`).join(' · '));

    // ══ CR15 — A KÉT KAPU ELLENPRÓBÁJA + A FUTTATÓ SAJÁT HATÁRA ═══════════════════════════════════
    // A ZÖLD CSAK AKKOR JELENT VÉDELMET, HA A KAPU KIVÉTELÉRE MÉRHETŐEN ELBUKIK (KUKA-127). A
    // forrásból jelölők mentén vesszük ki a kaput; ha a jelölő HIÁNYZIK, a válasz „nincs alkalmazható
    // eset", NEM zöld (KUKA-093 · KUKA-051: a hatókör szabály, nem lista).
    const kapuNelkul = (nev, jelolo) => {
      const d = join(F101, `nogate_${nev}`);
      rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true });
      let vagott = 0;
      // A LISTA A TELJES BEHÚZÁSI LÁNC (F105-01): a futtató az ITR-01-et is behúzza, és egy hiányzó
      // fájl miatt a másolat IMPORT-HIBÁRA futna — abból „a második visszahívás nem futott le"
      // látszana, vagyis a kapu nélküli alak is „zöldnek". Az ellenpróba akkor mér, ha FUT (KUKA-120).
      for (const f of ['vs_shutdown_state.mjs', 'vs_child_runner.mjs', 'vs_sweep_sequence.mjs', 'vs_interrupt_report.mjs']) {
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

    // ══ CR16 — F105-01: A MEGSZAKÍTÁS JELENTÉSE A TÉNYLEGES SÖPRÉS BELÉPÉSI PONTJÁN (R105) ════════
    //
    // A LELET (chatgpt-v3, R105 §F105-01, két független futtatásban; a saját reprodukcióm 2/2):
    // MAKACS gyermek + ISMÉTELT megszakító jel mellett a `tools/vs_verify_sweep.mjs` TELJESEN NÉMÁN
    // lépett ki — üres stdout ÉS stderr, kilépés 143. Új munka nem indult (az R104 kapuja működik),
    // de a jelentésből SEMMI nem látszott: se a jel, se a meg nem indult ellenőrző, se a lezárás.
    //
    // EZ A PRÓBA A TÉNYLEGES BELÉPÉSI PONTON MÉR (az R105 kikötése: „nem csupán a könyvtárak köré
    // írt hívón"): a VALÓDI söprést indítja `--root` kapcsolóval, KÉTTÉTELES szintetikus gyökéren.
    // Menetenként HAT dolgot mérünk, mert egyik sem elég önmagában:
    //   (1) a helyzet VALÓDI volt — az első ellenőrző gyermeke tényleg elindult (üres alapsokaság
    //       nem zöld, KUKA-093);
    //   (2) új munka NEM indult — a második ellenőrző nulla alkalommal futott le;
    //   (3) a kimenet NEM ÜRES, és GÉPILEG tartalmazza a jelet ÉS a meg nem indult tétel NEVÉT;
    //   (4) a lezárás NEVEZETT szóval áll ott (igazolt VAGY nevezetten nem igazolt) — és ha
    //       „igazolt", akkor MÉRVE nincs túlélő a saját fából (ez a hamis zöld tilalma);
    //   (5) a kilépés a JEL oka (128 + jelszám), tehát nem siker és nem „1-es hiba";
    //   (6) VÉGES idő.
    const F105 = join(TMP, `${tag}_f105`);
    mkdirSync(F105, { recursive: true });
    const SWEEP_UT = join(ROOT, 'tools', 'vs_verify_sweep.mjs');
    const LIB_FAJLOK = readdirSync(LIBDIR).filter((f) => f.endsWith('.mjs'));

    /**
     * A SZINTETIKUS GYÖKÉR — KÉT ellenőrzővel. Az első ÁLLÍTJA ELŐ a helyzetet, a második a tanú:
     * ha ő lefutott, akkor a megszakítás alatt ÚJ MUNKA indult. Rövid, kéttételes fixture (R105).
     */
    const f105Gyoker = (dir) => {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'package.json'), JSON.stringify({
        name: 'f105-szintetikus', version: '0.0.0', private: true,
        scripts: { 'verify:a': 'exec node elso.mjs', 'verify:b': 'node masodik.mjs' },
      }, null, 2));
      // A HÁROM HELYZET EGY FÁJLBAN, a módot a környezet adja — így a gyökér minden menetben azonos.
      writeFileSync(join(dir, 'elso.mjs'), `// A HELYZET ELŐÁLLÍTÓJA (F105-01 próbája).
import { appendFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
const mode = process.env.F105_MODE || 'makacs';
// A NYOM AZ INDÍTÁS ELŐTT ÍRÓDIK (REC-01): amit elindítunk, az AZONOSÍTHATÓ marad, ha a próba megszakad.
const jegyez = (role, pid) => { try { appendFileSync(process.env.F105_NYOM, role + ' ' + pid + '\\n'); } catch { /* a fájl eltűnt */ } };
jegyez('elso', process.pid);
let zar = false;
// SZABÁLYOS: a jelre KÉSLELTETVE (100 ms) zár. MAKACS és KISZÖKÖTT: elnyeli a jelet.
const zarj = () => { if (mode !== 'szabalyos' || zar) return; zar = true; setTimeout(() => process.exit(0), 100); };
process.on('SIGTERM', zarj); process.on('SIGINT', zarj); process.on('SIGHUP', zarj);
if (mode === 'makacs') {
  // UNOKA A SAJÁT CSOPORTUNKBAN: a csoport-jel eléri, tehát a lezárás IGAZOLHATÓ.
  const u = spawn(process.execPath, ['unoka.mjs'], { stdio: 'ignore' });
  jegyez('unoka', u.pid);
}
if (mode === 'kiszokott') {
  // A SAJÁT CSOPORTJÁBÓL KILÉPŐ CSŐVEZETÉK-TARTÓ: a futtató gyermek-csövét NYITVA tartja, ezért a
  // A close esemény SOHA nem érkezik meg — a RÉSZLETES jelentés útja bizonyítottan járhatatlan.
  // (Ez a CHILD_RUNNER_CONTRACT.not_guaranteed NEVEZETT tétele, nem új hiány.)
  const t = spawn(process.execPath, ['tarto.mjs'], { detached: true, stdio: ['ignore', 'inherit', 'inherit'] });
  jegyez('tarto', t.pid);
  t.unref();
}
writeFileSync(process.env.F105_JELZO, 'all');
setInterval(() => {}, 50);
`);
      writeFileSync(join(dir, 'unoka.mjs'), `process.on('SIGTERM', () => {});
process.on('SIGINT', () => {});
setInterval(() => {}, 50);
`);
      writeFileSync(join(dir, 'tarto.mjs'), `process.on('SIGTERM', () => {});
process.on('SIGINT', () => {});
setInterval(() => {}, 200);
`);
      writeFileSync(join(dir, 'masodik.mjs'), `// A TANÚ: ha ez a fájl létrejön, a megszakítás alatt ÚJ MUNKA indult el.
import { writeFileSync } from 'node:fs';
writeFileSync(process.env.F105_MASODIK, 'masodik-futott');
`);
      return dir;
    };

    /** A FELÍRT PID-EKRE, ÉS CSAK AZOKRA (R95 §F95-02): általános keresés vagy pkill TILOS. */
    const f105Takarit = (nyom) => {
      if (!existsSync(nyom)) return;
      for (const l of readFileSync(nyom, 'utf8').split('\n').filter(Boolean)) {
        const pid = Number(l.split(' ')[1]);
        if (Number.isInteger(pid)) { try { process.kill(pid, 'SIGKILL'); } catch { /* már nincs */ } }
      }
    };

    /** EGY MENET a TÉNYLEGES söprésen: elindít · megvárja a helyzetet · jelet küld · MÉR. */
    const f105Menet = async ({ toolsDir, mode, sig, ismetelt, cimke }) => {
      const dir = join(F105, `menet_${cimke}`);
      rmSync(dir, { recursive: true, force: true });
      const gyoker = f105Gyoker(join(dir, 'gyoker'));
      const nyom = join(dir, 'nyom.txt');
      const jelzo = join(dir, 'elso_all.txt');
      const masodik = join(dir, 'masodik_futott.txt');
      writeFileSync(nyom, '');
      const { spawn } = await import('node:child_process');
      const p = spawn(process.execPath, [join(toolsDir, 'vs_verify_sweep.mjs'), '--root', gyoker], {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, F105_MODE: mode, F105_NYOM: nyom, F105_JELZO: jelzo, F105_MASODIK: masodik },
      });
      let out = ''; let err = '';
      p.stdout.on('data', (d) => { out += d; });
      p.stderr.on('data', (d) => { err += d; });
      // A ZÁRÁS FIGYELŐJE A JELEK ELŐTT ÁLL FEL (KUKA-120: a próba ne a SAJÁT versenyét mérje).
      // A `close` a stdio EOF-ját is várja — a KISZÖKÖTT tartó épp ezt tartja nyitva, ezért az
      // `exit` után NEVEZETT, rövid ráhagyással zárunk; korlátlanul nem várunk (KUKA-121).
      const zarva = new Promise((r) => {
        let kesz = false;
        const zar = (c, honnan) => { if (kesz) return; kesz = true; r({ code: c, honnan }); };
        p.on('close', (c) => zar(c, 'close'));
        p.on('exit', (c) => setTimeout(() => zar(c, 'exit'), 1200));
        setTimeout(() => zar(null, 'idotullepes'), 40000);
      });
      const t0 = Date.now();
      while (!existsSync(jelzo) && Date.now() - t0 < 20000) await sleep(20);
      const elsoAll = existsSync(jelzo);
      const tSig = Date.now();
      p.kill(sig);
      if (ismetelt) { await sleep(150); try { p.kill(sig); } catch { /* már kilépett */ } }
      const z = await zarva;
      const ms = Date.now() - tSig;
      await sleep(250);
      const pidek = readFileSync(nyom, 'utf8').split('\n').filter(Boolean)
        .map((l) => ({ role: l.split(' ')[0], pid: Number(l.split(' ')[1]) })).filter((x) => Number.isInteger(x.pid));
      // A TÚLÉLŐK MÉRÉSE. A KISZÖKÖTT TARTÓ KIVÉTELE NEVEZETT, nem elhallgatott: a saját
      // folyamatcsoportjából ÖNÁLLÓAN kilépő leszármazottat a csoport-jel nem éri el, és ezt a
      // futtató szerződése (`not_guaranteed`) kimondja. A többi (első gyermek, unoka) a SAJÁT fánk.
      const tulelok = pidek.filter((x) => x.role !== 'tarto' && alive(x.pid));
      const kimenet = `${out}${err}`;
      return {
        cimke, mode, sig, ismetelt, elsoAll, masodikFutott: existsSync(masodik),
        code: z.code, honnan: z.honnan, ms, out, err, kimenet, pidek, tulelok, nyom,
        teljesenNema: out.trim() === '' && err.trim() === '',
        jelentes: /MEGSZAKÍTÁSI JELENTÉS \(ITR-01\)/.test(kimenet),
        jelNevezve: kimenet.includes(`JEL: ${sig}`),
        masodikNevezve: /NEM INDULT \(1\)/.test(kimenet) && /verify:b/.test(kimenet),
        reszletes: /SÖPRÉS \(/.test(out),
        lezarasIgazolt: /LEZÁRÁS: IGAZOLT/.test(kimenet),
        lezarasNevezve: /LEZÁRÁS: (IGAZOLT|NEM IGAZOLT|nincs alkalmazható eset)/.test(kimenet),
      };
    };

    // ── A MÁTRIX: KÉT gyermek-fajta × KÉT jel × egyszeri/ismételt, plusz a KISZÖKÖTT tartó ────────
    const f105Terv = [];
    for (const mode of ['szabalyos', 'makacs']) {
      for (const sig of ['SIGTERM', 'SIGINT']) {
        for (const ismetelt of [false, true]) {
          f105Terv.push({ mode, sig, ismetelt, cimke: `${mode}_${sig}_${ismetelt ? 'ismetelt' : 'egyszeri'}` });
        }
      }
    }
    f105Terv.push({ mode: 'kiszokott', sig: 'SIGTERM', ismetelt: true, cimke: 'kiszokott_SIGTERM_ismetelt' });
    f105Terv.push({ mode: 'kiszokott', sig: 'SIGINT', ismetelt: false, cimke: 'kiszokott_SIGINT_egyszeri' });

    const eles105 = [];
    for (const m of f105Terv) {
      const r = await f105Menet({ toolsDir: join(ROOT, 'tools'), ...m });
      eles105.push(r);
      // A TAKARÍTÁS AZONNAL, MENETENKÉNT: egy életben hagyott fa a KÖVETKEZŐ menet gépét terhelné,
      // és az időzítését átírná — ez a KUKA-246 leckéje a saját próbapadunkra fordítva.
      f105Takarit(r.nyom);
    }

    check('CR16', 'a helyzet VALÓDI mind a 10 menetben: az első ellenőrző gyermeke elindult (üres alapsokaság nem zöld)',
      eles105.length === 10 && eles105.every((r) => r.elsoAll),
      eles105.map((r) => `${r.cimke}:${r.elsoAll}`).join(' '));
    check('CR16', 'MEGSZAKÍTÁS után a MÁSODIK ellenőrző NULLA alkalommal indul el a TÉNYLEGES söprésen',
      eles105.every((r) => r.masodikFutott === false),
      eles105.filter((r) => r.masodikFutott).map((r) => r.cimke).join(' ') || '10/10: nem indult el');
    check('CR16', 'A KIMENET SOHA NEM ÜRES: a megszakítási jelentés MIND A 10 menetben megvan (ez az F105-01 javítása)',
      eles105.every((r) => !r.teljesenNema && r.jelentes),
      eles105.map((r) => `${r.cimke}: nema=${r.teljesenNema} jelentes=${r.jelentes}`).join(' · '));
    check('CR16', 'a jelentés MEGNEVEZI a megszakítás jelét — a VALÓDI jelet (SIGTERM és SIGINT, egyszeri és ismételt)',
      eles105.every((r) => r.jelNevezve),
      eles105.filter((r) => !r.jelNevezve).map((r) => r.cimke).join(' ') || '10/10: a jel nevezve');
    check('CR16', 'a jelentés MEGNEVEZI a MEG NEM INDULT ellenőrzőt (`verify:b`) — nem néma kihagyás és nem zöld',
      eles105.every((r) => r.masodikNevezve),
      eles105.filter((r) => !r.masodikNevezve).map((r) => r.cimke).join(' ') || '10/10: verify:b megnevezve');
    check('CR16', 'a lezárás NEVEZETT szóval áll a jelentésben (igazolt VAGY nevezetten nem igazolt — harmadik nincs)',
      eles105.every((r) => r.lezarasNevezve),
      eles105.map((r) => `${r.cimke}:${(/LEZÁRÁS: [^\n]*/.exec(r.kimenet) || ['—'])[0].slice(0, 40)}`).join(' · '));
    check('CR16', 'NINCS HAMIS ZÖLD: ahol a jelentés IGAZOLT lezárást ír, ott MÉRVE nincs túlélő a saját fából',
      eles105.every((r) => !r.lezarasIgazolt || r.tulelok.length === 0),
      eles105.map((r) => `${r.cimke}: igazolt=${r.lezarasIgazolt} tulelo=${r.tulelok.length}`).join(' · '));
    check('CR16', 'a kilépés a JEL oka (SIGTERM→143 · SIGINT→130) — nem siker és nem „1-es hiba"',
      eles105.every((r) => r.code === INTERRUPT_EXIT_CODES[r.sig]),
      eles105.map((r) => `${r.cimke}→${r.code}`).join(' · '));
    check('CR16', 'a kilépés VÉGES: minden menet a jel után 20 másodpercen belül lezárult',
      eles105.every((r) => Number.isFinite(r.ms) && r.ms < 20000),
      eles105.map((r) => `${r.cimke}: ${r.ms} ms`).join(' · '));

    // ── A DÖNTŐ MENET: ahol a RÉSZLETES út BIZONYÍTOTTAN járhatatlan, mégis van jelentés ──────────
    // Itt nem versenyről van szó: a kiszökött tartó a gyermek-csövet nyitva tartja, tehát a
    // `close` esemény soha nem érkezik meg, a `runGuarded` nem tér vissza, a söprés összegző sora
    // MEG SEM SZÜLETHET. Ha ilyenkor is megvan a jel, a kimaradó tétel NEVE és a lezárás szava,
    // akkor a láthatóság NEM a visszatekeredésen áll — és épp ez az F105-01 kérése.
    const kisz = eles105.filter((r) => r.mode === 'kiszokott');
    check('CR16', 'KISZÖKÖTT csővezeték-tartó: a RÉSZLETES söprés-jelentés MÉRHETŐEN elmarad, a MEGSZAKÍTÁSI JELENTÉS mégis kimegy',
      kisz.length === 2 && kisz.every((r) => r.reszletes === false && r.jelentes && r.jelNevezve && r.masodikNevezve),
      kisz.map((r) => `${r.cimke}: reszletes=${r.reszletes} jelentes=${r.jelentes} verify_b=${r.masodikNevezve}`).join(' · '));
    // ── A SAJÁT JELÜNKKEL LEÁLLÍTOTT ELLENŐRZŐ NEM PIROS (KUKA-250) ───────────────────────────────
    // Az élő próba (a VALÓDI söprés megszakítása) a saját jelentésemben mutatta meg: a megszakítás
    // alatt futó ellenőrző nem-nulla kilépése a MI folyamatcsoport-jelünk következménye, nem a
    // verifier ítélete — „piros"-nak könyvelni annyi, mint egy meg sem ítélt mérésre HIBÁT állítani.
    const lezart105 = eles105.filter((r) => /LEFUTOTT \(1\/2\)/.test(r.kimenet));
    check('CR16', 'a SAJÁT jelünkkel leállított ellenőrző MEGSZAKÍTVA, nem „piros" — se nem zöld, se nem hiba (KUKA-250)',
      lezart105.length === 8 && lezart105.every((r) => /verify:a \[megszakítva/.test(r.kimenet))
      && eles105.every((r) => !/PIROS: verify:a/.test(r.kimenet) && !/verify:a \[piros/.test(r.kimenet))
      && lezart105.every((r) => /MEGSZAKÍTVA \(1\): verify:a/.test(r.kimenet)),
      lezart105.map((r) => `${r.cimke}: ${(/verify:a \[[^\]]*\]/.exec(r.kimenet) || ['—'])[0]}`).join(' · '));
    check('CR16', 'a FÉLBEMARADT és a MEG NEM INDULT tétel KÜLÖN szóval áll (a kettő nem ugyanaz — KUKA-002)',
      kisz.every((r) => /FÉLBEMARADT \(1\): verify:a/.test(r.kimenet)),
      kisz.map((r) => (/FÉLBEMARADT[^\n]*/.exec(r.kimenet) || ['—'])[0]).join(' · '));

    // ── AZ ELLENPRÓBÁK: a zöld csak akkor jelent védelmet, ha a védelem KIVÉTELÉRE elbukik ────────
    /**
     * A MUTÁNS FORRÁSFA — NEVEZETT, MINIMÁLIS mutációkkal (KUKA-127). Kettő van, és külön is
     * kérhető: (a) a BIZTOS CSATORNA kivétele (a jelölt blokkok törlése), (b) az R104-es
     * IGAZOLÁS-TÜRELEM visszaállítása (`forceCuts: false` → `true`, vagyis az ismételt jel a
     * kényszer utáni IGAZOLÁST is elvágja). Ha a mutáció célja nincs meg a forrásban, az ellenpróba
     * „nincs alkalmazható eset", NEM zöld (KUKA-093 · KUKA-051).
     */
    const f105Mutans = (nev, { csatornaNelkul = false, regiIgazolas = false }) => {
      // A MUTÁNS FA A REPÓ SZERKEZETÉT TÜKRÖZI, ÉS ÖNÁLLÓ. Az első alakom csak a `lib/`-et és a
      // söprést másolta — a `vs_sweep_reuse.mjs` viszont `../../v3ref/bundleDigest.mjs`-t húz be,
      // tehát a másolat IMPORT-HIBÁRA futott, és az ellenpróba nem a védelmet mérte, hanem a saját
      // hiányos fixtúráját (KUKA-120). A próba ezt MEGFOGTA, mert a menet külön követeli, hogy az
      // első gyermek TÉNYLEG elinduljon (`elsoAll`) — üres alapsokaságon nincs zöld (KUKA-093).
      const d = join(F105, `mutans_${nev}`);
      rmSync(d, { recursive: true, force: true });
      mkdirSync(join(d, 'tools', 'lib'), { recursive: true });
      mkdirSync(join(d, 'v3ref'), { recursive: true });
      writeFileSync(join(d, 'v3ref', 'bundleDigest.mjs'), readFileSync(join(ROOT, 'v3ref', 'bundleDigest.mjs'), 'utf8'));
      let vagott = 0; let cserelt = 0;
      for (const f of LIB_FAJLOK) {
        let src = readFileSync(join(LIBDIR, f), 'utf8');
        if (csatornaNelkul) {
          for (;;) {
            const nyit = src.indexOf('[F105-01-BIZTOS-CSATORNA]');
            const zar = src.indexOf('[/F105-01-BIZTOS-CSATORNA]');
            if (!(nyit >= 0 && zar > nyit)) break;
            const sorEleje = src.lastIndexOf('\n', nyit) + 1;
            const sorVege = src.indexOf('\n', zar) + 1;
            src = src.slice(0, sorEleje) + src.slice(sorVege);
            vagott += 1;
          }
        }
        if (regiIgazolas) {
          const db = src.split('{ forceCuts: false }').length - 1;
          if (db) { src = src.split('{ forceCuts: false }').join('{ forceCuts: true }'); cserelt += db; }
        }
        writeFileSync(join(d, 'tools', 'lib', f), src);
      }
      writeFileSync(join(d, 'tools', 'vs_verify_sweep.mjs'), readFileSync(SWEEP_UT, 'utf8'));
      return { dir: join(d, 'tools'), vagott, cserelt };
    };

    // (a) A BIZTOS CSATORNA KIVÉVE — determinisztikus: a jelentés-blokk MÉRHETŐEN eltűnik.
    const mutA = f105Mutans('csatorna_nelkul', { csatornaNelkul: true });
    if (mutA.vagott < 1) {
      skip('CR16', 'a BIZTOS CSATORNA ellenpróbája',
        'a [F105-01-BIZTOS-CSATORNA] jelölő nem található — NINCS ALKALMAZHATÓ ESET (nem zöld)');
    } else {
      const ellenA = [];
      for (let i = 1; i <= 2; i += 1) {
        const r = await f105Menet({ toolsDir: mutA.dir, mode: 'makacs', sig: 'SIGTERM', ismetelt: true, cimke: `ellenA_${i}` });
        ellenA.push(r); f105Takarit(r.nyom);
      }
      check('CR16', `ELLENPRÓBA (a): a BIZTOS CSATORNA kivételére a megszakítási jelentés MÉRHETŐEN eltűnik (${mutA.vagott} jelölt blokk kivéve)`,
        ellenA.every((r) => r.elsoAll && r.jelentes === false && r.masodikFutott === false),
        ellenA.map((r) => `elso=${r.elsoAll} jelentes=${r.jelentes} masodik=${r.masodikFutott}`).join(' · '));
    }

    // (b) AZ R104-ES ALAK — a lelet eredeti helyzete: az ismételtjeles próbának EL KELL BUKNIA.
    const mutB = f105Mutans('r104_alak', { csatornaNelkul: true, regiIgazolas: true });
    if (mutB.vagott < 1 || mutB.cserelt < 1) {
      skip('CR16', 'az R104-es alak ellenpróbája',
        `a mutáció célja nem teljes (jelölt blokk: ${mutB.vagott} · igazolás-türelem: ${mutB.cserelt}) — NINCS ALKALMAZHATÓ ESET (nem zöld)`);
    } else {
      const ellenB = [];
      for (let i = 1; i <= 3; i += 1) {
        const r = await f105Menet({ toolsDir: mutB.dir, mode: 'makacs', sig: 'SIGTERM', ismetelt: true, cimke: `ellenB_${i}` });
        ellenB.push(r); f105Takarit(r.nyom);
      }
      const nemak = ellenB.filter((r) => r.teljesenNema).length;
      check('CR16', 'ELLENPRÓBA (b): az R104-ES ALAKON az ismételtjeles elfogadási próba MIND A 3 menetben ELBUKIK',
        ellenB.every((r) => r.elsoAll && !(r.jelentes && r.masodikNevezve)),
        ellenB.map((r) => `elso=${r.elsoAll} jelentes=${r.jelentes} verify_b=${r.masodikNevezve} nema=${r.teljesenNema}`).join(' · '));
      if (nemak >= 1) {
        check('CR16', `ELLENPRÓBA (b): az R104-es alakon a TELJES NÉMASÁG is reprodukálódott (${nemak}/3 menet: üres stdout ÉS stderr)`,
          true, ellenB.map((r) => `${r.cimke}: out=${r.out.length} err=${r.err.length} kilepes=${r.code}`).join(' · '));
      } else {
        // A NÉMASÁG VERSENY-TERMÉK, tehát gépenként eltérhet — ilyenkor NEVEZETT kihagyás áll itt,
        // nem zöld (KUKA-093). A determinisztikus (a) ellenpróba viszont MÉRT, és az a védelem jele.
        skip('CR16', 'az R104-es alak TELJES NÉMASÁGA',
          `ezen a gépen 0/3 menetben állt elő az üres kimenet (a néma kilépés versenyből ered) — `
          + `az (a) ellenpróba és a fenti bukás viszont MÉRT; kilépések: ${ellenB.map((r) => r.code).join(',')}`);
      }
    }

    // ── ITR-01 SZERZŐDÉSE, A FELOLDÓT HÍVVA (nem forrásszöveg-vizsgálat) ─────────────────────────
    check('CR16', 'ITR-01: a NEM MÉRT lezárás NEVEZETTEN „nem igazolt" — a hiányzó jelentésből nem lesz zöld',
      /^LEZÁRÁS: NEM IGAZOLT/.test(cleanupLine(null))
      && /nincs alkalmazható eset/.test(cleanupLine({ groups: [] }))
      && /^LEZÁRÁS: NEM IGAZOLT/.test(cleanupLine({ groups: [{ pgid: 9, verdict: 'nem_igazolt', leftovers: true }] }))
      && /^LEZÁRÁS: NEM IGAZOLT/.test(cleanupLine({ groups: [{ pgid: 9, verdict: 'nem_mert', leftovers: null }] }))
      && /^LEZÁRÁS: IGAZOLT/.test(cleanupLine({ groups: [{ pgid: 9, verdict: 'kenyszerrel', leftovers: false }] })),
      { nincs_jelentes: cleanupLine(null).slice(0, 48), nulla_csoport: cleanupLine({ groups: [] }).slice(0, 48) });
    check('CR16', 'ITR-01: a határidő SZÁRMAZTATOTT (a lezárás saját türelmeiből), és az ismételt jel CSAK a szabályos türelmet veszi ki',
      deadlineMsFor([{ graceMs: 5000, verifyMs: 5000 }]) === 10000 + REPORT_MARGIN_MS
      && deadlineMsFor([{ graceMs: 5000, verifyMs: 5000 }], { forced: true }) === 5000 + REPORT_MARGIN_MS
      && deadlineMsFor([]) === REPORT_MARGIN_MS
      && deadlineMsFor([{ graceMs: 1000, verifyMs: 500 }, { graceMs: 1000, verifyMs: 500 }]) === 3000 + REPORT_MARGIN_MS,
      { egy_csoport: deadlineMsFor([{ graceMs: 5000, verifyMs: 5000 }]), ismetelt: deadlineMsFor([{ graceMs: 5000, verifyMs: 5000 }], { forced: true }), rahagyas: REPORT_MARGIN_MS });
    {
      // A JELENTÉS SZÖVEGE A BEJELENTETT TERVBŐL SZÜLETIK — és a három halmaz KÜLÖN marad.
      registerPlan(['x:egy', 'x:ketto', 'x:harom']);
      markSettled('x:egy', 'zöld');
      markStarted('x:ketto');
      const p = planProgress();
      const szoveg = renderInterruptReport({ state: { signal: 'SIGTERM', code: 143 }, shutdown: null, forced: true });
      check('CR16', 'ITR-01: a jelentés a bejelentett tervből MEGNEVEZI a meg nem indult tételt, a félbemaradtat külön, és a lezárást nem nevezi igazoltnak',
        p.notStarted.join(',') === 'x:harom' && p.inFlight.join(',') === 'x:ketto'
        && /NEM INDULT \(1\): x:harom/.test(szoveg) && /FÉLBEMARADT \(1\): x:ketto/.test(szoveg)
        && /LEFUTOTT \(1\/3\): x:egy \[zöld\]/.test(szoveg) && /ISMÉTELT JEL: igen/.test(szoveg)
        && /LEZÁRÁS: NEM IGAZOLT/.test(szoveg) && !/A FUTÁS SIKERES/.test(szoveg),
        { nem_indult: p.notStarted, felbemaradt: p.inFlight });
      check('CR16', 'ITR-01: a szerződés KIMONDJA a határait (a részletes jelentés nem garantált · terv nélkül nincs névsor)',
        INTERRUPT_REPORT_CONTRACT.id === 'ITR-01'
        && INTERRUPT_REPORT_CONTRACT.states_limits.some((x) => /RÉSZLETES.*NEM garantált/.test(x))
        && INTERRUPT_REPORT_CONTRACT.states_limits.some((x) => /bejelentett feladatlista nélkül/.test(x))
        && /korlátlan várakozás/.test(INTERRUPT_REPORT_CONTRACT.never),
        { hatarok: INTERRUPT_REPORT_CONTRACT.states_limits.length });
    }
    check('CR16', 'BEKÖTÉS: a söprés a TERVÉT előre bejelenti, és a megszakítási jelentést a FUTTATÓ adja (nem a söprés törzse)',
      /registerPlan\(runs\.map/.test(readFileSync(SWEEP_UT, 'utf8'))
      && /markStarted\(item\.s\)/.test(readFileSync(SWEEP_UT, 'utf8'))
      && /emitInterruptReport\(/.test(readFileSync(join(LIBDIR, 'vs_child_runner.mjs'), 'utf8')),
      { sweep: SWEEP_UT });
  }
} finally {
  // A PRÓBA SAJÁT SZEMETE: a felírt PID-ek, majd a fájlok. A nyomot CSAK sikeres takarítás után visszük el.
  cleanupTraced();
  // Az F101-01 próbájának SAJÁT munkakönyvtára (fák, kapu nélküli másolatok, menet-naplók).
  try { rmSync(join(TMP, `${tag}_f101`), { recursive: true, force: true }); } catch { /* marad, és ez a nyom */ }
  // Az F105-01 próbájának SAJÁT munkakönyvtára (szintetikus gyökerek, mutáns forrásfák, nyom-fájlok).
  // A NYOMOKAT ELŐBB a benne felírt PID-ekre takarítjuk (REC-01: a kapocs csak azután vágható el,
  // hogy az azonosító megvolt) — a KISZÖKÖTT tartó a saját csoportjából lépett ki, ezért csak innen érhető el.
  try {
    const f105 = join(TMP, `${tag}_f105`);
    if (existsSync(f105)) {
      const jaras = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) {
        const ut = join(d, e.name);
        if (e.isDirectory()) jaras(ut);
        else if (e.name === 'nyom.txt') {
          for (const l of readFileSync(ut, 'utf8').split('\n').filter(Boolean)) {
            const pid = Number(l.split(' ')[1]);
            if (Number.isInteger(pid)) { try { process.kill(pid, 'SIGKILL'); } catch { /* már nincs */ } }
          }
        }
      } };
      jaras(f105);
      rmSync(f105, { recursive: true, force: true });
    }
  } catch { /* marad, és ez a nyom */ }
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
