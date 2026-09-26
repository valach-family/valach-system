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
} finally {
  // A PRÓBA SAJÁT SZEMETE: a felírt PID-ek, majd a fájlok. A nyomot CSAK sikeres takarítás után visszük el.
  cleanupTraced();
  for (const f of [SCEN, HB, TRACE, INTERRUPT, join(TMP, `${tag}_nyom_regi.txt`), join(TMP, `${tag}_eletjel_regi.txt`),
    join(TMP, `${tag}_nyom_megszakitas.txt`), join(TMP, `${tag}_eletjel_megszakitas.txt`)]) {
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
