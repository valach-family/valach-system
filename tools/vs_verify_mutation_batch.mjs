#!/usr/bin/env node
/** MBX-01 ŐR — AZ EGYSZER MÉRT ALAPVONAL KAPUJA (R198 §2–§3).
 *
 * MIT MÉR. Azt, hogy a megosztott alapvonal CSAK a nevezett, aktív batch változatlan másolatain
 * használható — és hogy minden más esetben NEVEZETT hibát ad, nem hamis zöldet. A kapu döntése
 * tiszta függvény, ezért a próba KÖZVETLENÜL hívja (`KUKA-207`), és a VISELKEDÉST méri, nem a
 * forrás szövegét (`KUKA-239`).
 *
 * AMIT EZ KIMONDOTTAN NEM ÁLLÍT: nem termékelfogadás, és nem kriptográfiai védelem egy minden
 * fájlhoz hozzáférő rosszindulatú író ellen — konzisztencia-ellenőrzés (ugyanaz a korlát, amit az
 * `EXS-01` kapu is kimond).
 *
 * A nyolc eset az R198 §3 felsorolása, plusz a POZITÍV KONTROLL (`KUKA-122`: ha a kapu sosem lehet
 * zöld, a pirosa sem jelent semmit).
 */
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  BATCH_CONTRACT, BATCH_CONTRACT_VERSION, BATCH_ANCHOR_FILE, BATCH_BASELINE_FILE, BATCH_ATTEMPTS_FILE,
  makeBatchAnchor, verifyBatchForUnit, batchAnchorProblems, baselineProblems, batchRunnerDigest,
  batchConfigDigest, batchRuntimeDigest, evidenceDigest, attemptLine, readAttempts, batchId,
} from '../v3ref/mutationBatch.mjs';
import { EXPECTED_IDS } from '../v3ref/manifest.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const say = (id, ok, msg) => { if (!ok) problems.push(`${id}: ${msg}`); };
const hex = (n, seed) => createHash('sha256').update(String(seed)).digest('hex').slice(0, n);

// ── A FIXTÚRA: egy ÉP batch — valódi ALAKÚ lenyomatokkal (helyőrzővel a mércét nem lehetne mérni) ──
const PROBES = EXPECTED_IDS.map(String);
const RECORDS = PROBES.map((id) => ({ probe_id: id, status: 'PASS' }));
const BASELINE = { contract: BATCH_CONTRACT, ok: true, probes: PROBES, records: RECORDS, digest: `sha256:${hex(64, 'mbx-base')}`, ms: 3550, at: '2026-10-12T00:00:00.000Z' };
const BASE_BYTES = Buffer.from(`${JSON.stringify(BASELINE, null, 2)}\n`);
const BINDING = {
  source_digest: hex(64, 'mbx-source'),
  runner_digest: hex(64, 'mbx-runner'),
  programs_digest: hex(64, 'mbx-programs'),
  config_digest: hex(16, 'mbx-config'),
  runtime_digest: hex(16, 'mbx-runtime'),
};
const SLICES = { 1: ['M1'], 2: ['M2'], 3: ['M3'], 4: ['M4'] };
const PLAN = { units: 4, mutation_count: 4, slices: SLICES };
const ANCHOR = makeBatchAnchor({ binding: BINDING, plan: PLAN, baseline_evidence_digest: evidenceDigest(BASE_BYTES), recorded_by: 'fixtúra' });
const unitOf = (k) => ({ k, n: 4, mutations: SLICES[k] });
const gate = (over = {}) => verifyBatchForUnit({
  anchor: ANCHOR, unit: unitOf(1), liveBinding: BINDING, baselineBytes: BASE_BYTES,
  baseline: BASELINE, expectedProbes: PROBES, ...over,
});

// ── MBX01 — POZITÍV KONTROLL: JÓ ALAPVONALBÓL JÓ CSOMAG (R198 §3/1) ─────────────────────────────
{
  const r = gate();
  say('MBX01', r.ok === true, `az ÉP batch NEM lett elfogadva: ${r.problems.slice(0, 4).join(' · ')}`);
  say('MBX01', batchAnchorProblems(ANCHOR).length === 0, `az ÉP horgony leleteket adott: ${batchAnchorProblems(ANCHOR).join(' · ')}`);
  say('MBX01', baselineProblems(BASELINE, PROBES).length === 0, `az ÉP alapvonal leleteket adott: ${baselineProblems(BASELINE, PROBES).join(' · ')}`);
  // És MINDEN tervezett egység elfogadható, nem csak az első.
  for (const k of [1, 2, 3, 4]) {
    const x = verifyBatchForUnit({ anchor: ANCHOR, unit: unitOf(k), liveBinding: BINDING, baselineBytes: BASE_BYTES, baseline: BASELINE, expectedProbes: PROBES });
    say('MBX01', x.ok === true, `a ${k}/4 egység nem lett elfogadva: ${x.problems.slice(0, 3).join(' · ')}`);
  }
}

// ── MBX02 — PIROS / HIÁNYOS ALAPVONAL (R198 §3/2) ───────────────────────────────────────────────
{
  /**
   * A MÉRCE NE LEGYEN MÁS MECHANIZMUSSAL IS KIELÉGÍTHETŐ (SAJÁT lelet, R198 — `KUKA-483` osztálya).
   *
   * Az első alakom minden rossz alapvonalhoz a MÓDOSÍTOTT bájtokat adta be, a horgonyban viszont az
   * ÉP lenyomat maradt — tehát a `r.ok === false` a LENYOMAT-ELTÉRÉSTŐL is igaz lett, és az
   * alapvonal-érvényesség ellenőrzését ELFEDTE. MÉRVE: a `b.ok !== true` kapu visszacsúsztatásakor
   * az MBX02 NEM tüzelt (csak az átfogó, élő MBX09). Ezért a horgony itt KÖVETI a módosított
   * bájtokat — így az EGYETLEN mechanizmus, ami bukhat, a vizsgált alapvonal-érvényesség —, és
   * minden eset a SAJÁT nevezett mondatára illeszkedik, nem a puszta `ok === false`-ra.
   */
  const anchorFor = (bytes) => makeBatchAnchor({
    binding: BINDING, plan: PLAN, baseline_evidence_digest: evidenceDigest(bytes), recorded_by: 'fixtúra',
  });
  for (const [nev, bl, minta] of [
    ['nem zöld', { ...BASELINE, ok: false }, /az ALAPVONAL nem ZÖLD/i],
    ['nincs próba', { ...BASELINE, probes: [] }, /egyetlen lefutott próbát sem nevez meg/i],
    ['nincs rekord (a puszta PASS nem bizonyíték)', { ...BASELINE, records: [] }, /nem hordoz próba-rekordokat/i],
    ['kitalált forrás-lenyomat', { ...BASELINE, digest: 'unverified' }, /forrás-lenyomata nem valódi/i],
    ['HIÁNYZÓ elvárt próba', { ...BASELINE, probes: PROBES.slice(0, -1), records: RECORDS.slice(0, -1) }, /HIÁNYZÓ elvárt próba/i],
    ['elvárt próba NEM PASS', { ...BASELINE, records: RECORDS.map((r, i) => (i === 0 ? { ...r, status: 'FAIL' } : r)) }, /NEM PASS elvárt próba/i],
  ]) {
    const bytes = Buffer.from(`${JSON.stringify(bl, null, 2)}\n`);
    const r = gate({ anchor: anchorFor(bytes), baseline: bl, baselineBytes: bytes });
    say('MBX02', r.ok === false, `a(z) „${nev}" alapvonal MÉGIS elfogadva — hibás alapvonal után NINCS mutációs elfogadás`);
    say('MBX02', r.problems.some((x) => minta.test(x)),
      `a(z) „${nev}" alapvonal nincs a SAJÁT nevezett mondatával elutasítva (${minta}): ${r.problems.slice(0, 3).join(' · ')}`);
    // ÉS A LENYOMAT-ELTÉRÉS NEM LEHET AZ OK: a horgony követi a bájtokat, tehát az nem bukhat.
    say('MBX02', !r.problems.some((x) => /ALAPVONAL-BIZONYÍTÉK MÁS/i.test(x)),
      `a(z) „${nev}" esetben a LENYOMAT-eltérés fedte el a vizsgált mechanizmust — a próba nem a saját tárgyát méri`);
  }
}

// ── MBX03 — IDEGEN BATCH (R198 §3/3) ────────────────────────────────────────────────────────────
{
  const idegenBinding = { ...BINDING, source_digest: hex(64, 'mbx-idegen') };
  const idegen = makeBatchAnchor({ binding: idegenBinding, plan: PLAN, baseline_evidence_digest: evidenceDigest(BASE_BYTES) });
  const r = gate({ anchor: idegen });
  say('MBX03', r.ok === false, 'az IDEGEN batch horgonya MÉGIS elfogadva');
  say('MBX03', r.problems.some((x) => /nem a horgony batchéhez tartozik/i.test(x)),
    `az idegen batch nincs NEVEZETTEN elutasítva: ${r.problems.slice(0, 3).join(' · ')}`);
  // ÉS A BATCH-AZONOSÍTÓ A KÖTÉSBŐL+TERVBŐL SZÁRMAZIK: a hamisított azonosító elesik.
  const hamis = { ...ANCHOR, batch_id: 'bHAMIS0000000' };
  const h = gate({ anchor: hamis });
  say('MBX03', h.ok === false && h.problems.some((x) => /ÚJRASZÁMOLVA/i.test(x)),
    `a hamisított batch-azonosító nincs ÚJRASZÁMOLVA: ${h.problems.slice(0, 3).join(' · ')}`);
}

// ── MBX04 — MEGVÁLTOZOTT FORRÁS / CONFIG / FUTTATÓ / MANIFESZT / FUTTATÓKÖRNYEZET (R198 §3/4) ───
{
  for (const k of Object.keys(BINDING)) {
    const live = { ...BINDING, [k]: k.endsWith('config_digest') || k.endsWith('runtime_digest') ? hex(16, `mas-${k}`) : hex(64, `mas-${k}`) };
    const r = gate({ liveBinding: live });
    say('MBX04', r.ok === false, `a megváltozott ${k} mellett a batch MÉGIS elfogadva`);
    say('MBX04', r.problems.some((x) => x.includes(k)),
      `a megváltozott ${k} nincs MEZŐNKÉNT megnevezve: ${r.problems.slice(0, 2).join(' · ')}`);
  }
  // ÉS AZ ÚJRAINDÍTOTT / FINOMÍTOTT BATCH: más egység-szám ÚJ alapvonalat kér.
  const r = gate({ unit: { k: 1, n: 8, mutations: ['M1'] } });
  say('MBX04', r.ok === false && r.problems.some((x) => /ÚJ alapvonalat kér/i.test(x)),
    `a MÁS bontásból jövő egység nincs elutasítva: ${r.problems.slice(0, 3).join(' · ')}`);
  // ÉS A TERVEN KÍVÜLI SZELET: ami nem a tervezett mutációkészlet, az nem ez a batch.
  const s = gate({ unit: { k: 1, n: 4, mutations: ['M99'] } });
  say('MBX04', s.ok === false && s.problems.some((x) => /nem a tervezett/i.test(x)),
    `a terven kívüli szelet nincs elutasítva: ${s.problems.slice(0, 3).join(' · ')}`);
}

// ── MBX05 — HIÁNYZÓ / ÁTÍRT ALAPVONAL-BIZONYÍTÉK (R198 §3/5) ────────────────────────────────────
{
  const a = gate({ baselineBytes: null });
  say('MBX05', a.ok === false && a.problems.some((x) => /NEM TALÁLHATÓ/i.test(x)),
    `a HIÁNYZÓ alapvonal-bizonyíték nincs NEVEZVE: ${a.problems.slice(0, 3).join(' · ')}`);
  const b = gate({ baselineBytes: Buffer.from('{"ok":true}\n') });
  say('MBX05', b.ok === false && b.problems.some((x) => /ALAPVONAL-BIZONYÍTÉK MÁS/i.test(x)),
    `az ÁTÍRT alapvonal-bizonyíték nincs NEVEZVE (a lenyomat nem lett újraszámolva): ${b.problems.slice(0, 3).join(' · ')}`);
  // ÉS A „baseline=PASS" ALAKÚ NEM-BIZONYÍTÉK: egy puszta igaz érték nem bizonyíték (R198 §2).
  const c = { contract: BATCH_CONTRACT, ok: true, probes: PROBES, records: [], digest: BASELINE.digest };
  const r = gate({ baseline: c, baselineBytes: Buffer.from(`${JSON.stringify(c)}\n`) });
  say('MBX05', r.ok === false && r.problems.some((x) => /nem hordoz próba-rekordokat/i.test(x)),
    `a rekord NÉLKÜLI „PASS" bizonyítéknak számított: ${r.problems.slice(0, 3).join(' · ')}`);
}

// ── MBX06 — MEGSZAKÍTÁS: A MEGSZAKADT KÍSÉRLET NEM „EL NEM INDULT" (R198 §3/6 · §4) ─────────────
//
// AZ R197 SAJÁT HIBÁJA: az `r79` ELINDULT, majd az én 1500 s-os eszköz-korlátom megszakította, és a
// jelentésem „el nem indult"-ként sorolta be. A napló ezért a gyermek ELŐTT ír, és a pár nélküli
// `started` sor a MEGSZAKADT kísérlet gépi jele.
{
  const planned = ['1/4', '2/4', '3/4', '4/4'];
  const log = [
    attemptLine({ batch_id: ANCHOR.batch_id, unit: '1/4', state: 'started' }),
    attemptLine({ batch_id: ANCHOR.batch_id, unit: '1/4', state: 'finished', exit: 0, ms: 5000 }),
    attemptLine({ batch_id: ANCHOR.batch_id, unit: '2/4', state: 'started' }),   // PÁR NÉLKÜL: megszakadt
    attemptLine({ batch_id: ANCHOR.batch_id, unit: '3/4', state: 'started' }),
    attemptLine({ batch_id: ANCHOR.batch_id, unit: '3/4', state: 'finished', exit: 1, ms: 6000 }),
  ].join('') + '{"csonka":';   // a megszakított írás utolsó, FÉLBEMARADT sora
  const a = readAttempts(log, planned);
  say('MBX06', a.befejezett.join() === '1/4,3/4', `a BEFEJEZETT kísérletek hibásan: ${JSON.stringify(a.befejezett)}`);
  say('MBX06', a.megszakadt.join() === '2/4',
    `a MEGSZAKADT kísérlet nem ismerhető fel (pár nélküli „started"): ${JSON.stringify(a.megszakadt)}`);
  say('MBX06', a.el_nem_indult.join() === '4/4',
    `az EL NEM INDULT és a MEGSZAKADT összekeveredett: ${JSON.stringify({ m: a.megszakadt, e: a.el_nem_indult })}`);
  say('MBX06', a.olvashatatlan.length === 1,
    `a CSONKA napló-sor némán eltűnt (nem lett nevezve): ${JSON.stringify(a.olvashatatlan)}`);
  // A HELYREÁLLÍTÁS: a szülő kényszerű leállása után a nyitott kísérlet FELISMERHETŐ marad.
  const only = readAttempts(attemptLine({ batch_id: ANCHOR.batch_id, unit: '1/4', state: 'started' }), planned);
  say('MBX06', only.megszakadt.join() === '1/4' && only.befejezett.length === 0,
    `a szülő leállása utáni NYITOTT kísérlet nem felismerhető: ${JSON.stringify(only)}`);
}

// ── MBX07 — A TERVEN KÍVÜLI NAPLÓ-SOR SEM VÉSZ EL ───────────────────────────────────────────────
{
  const a = readAttempts(attemptLine({ batch_id: ANCHOR.batch_id, unit: '9/4', state: 'started' }), ['1/4']);
  say('MBX07', Array.isArray(a.terven_kivul) && a.terven_kivul.join() === '9/4',
    `a TERVEN KÍVÜLI egység naplósora némán eltűnt: ${JSON.stringify(a)}`);
}

// ── MBX08 — A RÉGI, ÖNÁLLÓ HÍVÁS MEGTARTJA A SAJÁT ALAPVONALÁT (R198 §3/8) ──────────────────────
//
// EZ VALÓDI FOLYAMAT, mert az állítás tárgya a CLI viselkedése: `--batch` nélkül az egység a SAJÁT
// alapvonalát futtatja. Ez a külső programok (`r57` · `r59` · `r57a` · `r59a` · `r81` · `r83`)
// változatlan útja — ha ez elcsúszna, a külső szerződés sérülne, és azt NEM szabad.
if (!process.env.VS_MBX_SKIP_LIVE) {
  const r = spawnSync(process.execPath, [join(ROOT, 'v3ref/mutate.mjs'), '--unit=254/254'], {
    cwd: ROOT, encoding: 'utf8', timeout: 120_000, maxBuffer: 32 * 1024 * 1024,
  });
  say('MBX08', r.status === 0, `a --batch NÉLKÜLI egység nem futott le (kilépés ${r.status})`);
  say('MBX08', /KAPU \(a\) ALAPVONAL: (ZÖLD|PIROS)/.test(String(r.stdout)),
    'a `--batch` nélküli egység NEM a saját alapvonalát futtatta — a régi, önálló hívás útja elcsúszott');
  say('MBX08', !/ALAPVONAL: MEGOSZTOTT/.test(String(r.stdout)),
    'a `--batch` nélküli egység MEGOSZTOTT alapvonalat használt — a megosztás csak nevezett batchben engedett');
}

// ── MBX09 — A MUTÁCIÓ NEM ÍRHATJA ÁT AZ ALAPVONALAT VAGY A FORRÁST (R198 §3/7 · §2) ─────────────
//
// A szennyezés kizárását a MÉRT állapoton kérdezzük: egy valódi, batchben futó egység UTÁN a mért
// forrás-köteg lenyomata és a batch alapvonal-bizonyítéka BÁJTAZONOS marad.
if (!process.env.VS_MBX_SKIP_LIVE) {
  const batchDir = join(ROOT, 'v3ref/units/.batch');
  if (existsSync(join(batchDir, BATCH_ANCHOR_FILE)) && existsSync(join(batchDir, BATCH_BASELINE_FILE))) {
    const anchorBefore = readFileSync(join(batchDir, BATCH_ANCHOR_FILE));
    const baseBefore = readFileSync(join(batchDir, BATCH_BASELINE_FILE));
    const a = JSON.parse(anchorBefore.toString('utf8'));
    const r = spawnSync(process.execPath, [join(ROOT, 'v3ref/mutate.mjs'), `--unit=1/${a.plan.units}`, `--batch=${batchDir}`], {
      cwd: ROOT, encoding: 'utf8', timeout: 120_000, maxBuffer: 32 * 1024 * 1024,
    });
    say('MBX09', r.status === 0, `a batchben futó egység nem futott le (kilépés ${r.status}): ${String(r.stderr).slice(0, 200)}`);
    say('MBX09', /ALAPVONAL: MEGOSZTOTT/.test(String(r.stdout)),
      'a batchben futó egység NEM a megosztott alapvonalat használta');
    say('MBX09', Buffer.compare(readFileSync(join(batchDir, BATCH_ANCHOR_FILE)), anchorBefore) === 0,
      'a mutációs futás ÁTÍRTA a batch-horgonyt');
    say('MBX09', Buffer.compare(readFileSync(join(batchDir, BATCH_BASELINE_FILE)), baseBefore) === 0,
      'a mutációs futás ÁTÍRTA a batch ALAPVONAL-BIZONYÍTÉKÁT');
  } else {
    console.log('  MBX09: nincs előkészített batch a repóban — ez a próba a `--batch-prepare` után fut le.');
    console.log('         (NEM kihagyás-mentesség: a nevezett feltétel hiánya kimondva — KUKA-093.)');
  }
}

console.log('');
console.log(`MBX-01 BATCH-KAPU (MBX01–MBX09): szerződés ${BATCH_CONTRACT} v${BATCH_CONTRACT_VERSION} · `
  + `${PROBES.length} elvárt próba`);
console.log('  AMIT EZ NEM ÁLLÍT: nem termékelfogadás, és nem kriptográfiai védelem egy minden fájlhoz');
console.log('  hozzáférő író ellen — a megosztott alapvonal KEZELÉSÉT méri (konzisztencia).');
if (problems.length) {
  console.error(`\nPIROS (${problems.length}):`);
  for (const p of problems) console.error(`  · ${p}`);
  process.exit(1);
}
console.log('ZÖLD — a megosztott alapvonal csak a nevezett, aktív batch változatlan másolatain használható;');
console.log('       a piros/hiányos alapvonal, az idegen batch, a megváltozott kötés és az átírt vagy');
console.log('       hiányzó bizonyíték NEVEZETT hibát ad, és a MEGSZAKADT kísérlet nem „el nem indult".');
