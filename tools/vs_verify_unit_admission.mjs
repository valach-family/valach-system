#!/usr/bin/env node
/** MRG-01 GÉPI JELE — A DARABOLT FUTÁS BEADVÁNY-KAPUJA (R81/F01–F03).
 *
 * MIT MÉR. Nem a forrás SZÖVEGÉT: HÍVJA ugyanazt a feloldót (`admitUnits`), amit az összefűzés
 * használ (KUKA-009), és a külső fél NÉGY ellenpéldáját, valamint a NÉGY kontrolljukat egyenként
 * végigfuttatja rajta. A jel akkor ér valamit, ha a RÉGI alakon PIROS — ezért minden ellenpélda
 * mellé oda van írva, MELYIK visszacsúszás hozná vissza.
 *
 * UAD01  az összefűzés a KÖZÖS feloldót hívja (nem másolatot), és a lánc-fedezetet is méri
 * UAD02  a mérce a MAI, rögzített szerződés — a beadványból vett kötelező készlet TILTOTT alak
 * UAD03  POZITÍV KONTROLL: a valódi alakú hármas BEFOGADVA (különben az őr csak zár — KUKA-122)
 * UAD04  a négy R81-es ellenpélda, mind a SAJÁT nevezett akadályával
 * UAD05  a fixtúra ALAKJA az ÍRÓTÓL származik, nem az emlékezetből (padlóval — KUKA-016/068)
 * UAD06  a támogatott futási szerződés SZABÁLY, és az ismeretlen verzió nem olvasható be
 */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { admitUnits, chainBacking, SUPPORTED_RUN_CONTRACTS } from '../v3ref/unitAdmission.mjs';
import { REQUIRED_EVIDENCE, indexDigest } from '../v3ref/norms.mjs';
import { contractRef } from '../v3ref/normContract.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MUTATE = readFileSync(join(ROOT, 'v3ref/mutate.mjs'), 'utf8');
const problems = [];
const say = (id, ok, msg) => { if (!ok) problems.push(`${id}: ${msg}`); };

// ── UAD01 — A KÖZÖS FELOLDÓ HÍVVA, ÉS AZ EREDMÉNYE TÉNYLEG HAT ──────────────────────────────────
//
// A FORRÁS SZÖVEGE NEM ELÉG (KUKA-009). A pin első alakja csak a behúzást és a hívás-szöveget
// mérte — a visszacsúszás-próbán kiderült, hogy egy „meghívom, de a válaszát eldobom" alakot NEM
// fog meg. Ezért a hívást ÉLESBEN mérjük: az összefűzés egy IDEGEN futási szerződésű egység-fájlra
// futtatva a kapu SAJÁT, nevezett mondatát kell hogy kiírja a gépi végeredménybe.
say('UAD01', /import \{[^}]*admitUnits[^}]*\} from '\.\/unitAdmission\.mjs'/.test(MUTATE),
  'az összefűzés nem a közös `unitAdmission.mjs` feloldót hívja');
say('UAD01', /\bchainBacking\(/.test(MUTATE), 'a lánc-fedezet (`chainBacking`) nincs meghívva — a FEDETT sor mögött nem mérnénk részletes eredményt');
{
  const dir = mkdtempSync(join(tmpdir(), 'uad-'));
  try {
    cpSync(join(ROOT, 'v3ref'), join(dir, 'v3ref'), { recursive: true,
      filter: (f) => !f.startsWith(join(ROOT, 'v3ref/units')) && !f.startsWith(join(ROOT, 'v3ref/external-checks/results')) });
    mkdirSync(join(dir, 'v3ref/units'), { recursive: true });
    const foreign = { run_contract: 'RUN-FOREIGN', unit: { k: 1, n: 1 }, base_digest: 'sha256:x',
      base_gate_ok: true, attacks_ok: true, run_state: 'complete', slice_clean: true, portable: true,
      wall: { ms: 1 }, mutation_ids: [], counts: { measured: 0, caught: 0, survived: 0, wrong: 0, harness: 0, stale: 0 },
      norm_chain: [], evidence_bound: true, evidence_unbound: [], norm_index_digest: 'sha256:x',
      norm_required: { version: 'x', stage: 'measured', expected_state: 'covered', clauses: [] },
      norm_contract: { version: 'x', digest: 'sha256:x' }, norm_integrity_ok: true, mutation_results: [] };
    writeFileSync(join(dir, 'v3ref/units/unit-1-of-1.json'), JSON.stringify(foreign));
    const r = spawnSync(process.execPath, [join(dir, 'v3ref/mutate.mjs'), '--merge'],
      { cwd: dir, encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024 });
    const out = JSON.parse(readFileSync(join(dir, 'v3ref/v3ref-mutation-result.json'), 'utf8'));
    say('UAD01', r.status === 2, `az idegen szerződésű beadványra az összefűzés ${r.status} kóddal zárt (várt: 2)`);
    say('UAD01', out.run_state === 'incomplete' && out.clean === null,
      `hibás bizonyítéknál a szerződés szerint \`clean: null\` jár — kapott: run_state=${out.run_state}, clean=${JSON.stringify(out.clean)}`);
    say('UAD01', (out.why || []).some((w) => /ISMERETLEN futási szerződés/.test(w)),
      'az összefűzés NEM a beadvány-kapu nevezett mondatát írta ki — a kapu eredménye nem hat');
    say('UAD01', out.admission && out.admission.contract === 'MRG-01',
      'a gépi végeredmény nem hordozza a beadvány-kapu állapotát (`admission`)');
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

// ── UAD02 — A MÉRCE A MAI SZERZŐDÉS, NEM A BEADVÁNY ─────────────────────────────────────────────
say('UAD02', /REQUIRED_EVIDENCE/.test(MUTATE) && /contractRef\(\)/.test(MUTATE) && /indexDigest\(\)/.test(MUTATE),
  'az összefűzés nem a rögzített forrásból veszi a kötelező készletet / szerződés- és index-lenyomatot');
say('UAD02', !/units\.find\(\(u\) => u\.norm_required\)/.test(MUTATE),
  'VISSZACSÚSZÁS: a kötelező készlet megint az EGYIK BEADOTT EGYSÉGBŐL jön (R81/F02)');
say('UAD02', !/const sum = \(k\) => units\.reduce\(\(a, u\) => a \+ \(u\.counts/.test(MUTATE),
  'VISSZACSÚSZÁS: az összesítő megint a BEADOTT `counts` mezőkből adódik össze (R81/F01a)');

// ── A FIXTÚRA: valódi alakú egység-hármas ───────────────────────────────────────────────────────
const TODAY = 'sha256:aaaa';
const PINNED = {
  required: { version: REQUIRED_EVIDENCE.version, clauses: REQUIRED_EVIDENCE.clauses, expected_state: 'covered' },
  contract: { version: contractRef().version, digest: contractRef().digest },
  index_digest: indexDigest(),
};
const CLAUSE = REQUIRED_EVIDENCE.clauses[0];
let tok = 0;
const result = (id, extra = {}) => ({
  mutation_id: id, catcher: `P-${id}`, applied: true, base_digest: TODAY,
  mutated_digest: `sha256:mut-${id}`, run_token: `rt_${id}-${++tok}`, probe_id: `P-${id}`,
  probe_status: 'FAIL', failed_assertions: [`A-${id}`], verdict: 'CAUGHT', evidence_limit: null, ...extra,
});
const chainRow = (id) => ({ clause_id: CLAUSE, assertion_id: `A-${id}`, probe_id: `P-${id}`,
  falsified_by: id, result: 'covered', why: null });
const unit = (k, ids) => ({
  file: `unit-${k}-of-3.json`, run_contract: 'RUN-02', unit: { k, n: 3 }, at: '2026-09-14T00:00:00.000Z',
  node: process.version, base_digest: TODAY, base_gate_ok: true, attacks_ok: true, run_state: 'complete',
  slice_clean: true, portable: true, wall: { ms: 100, budget_ms: 12000, external_cap_ms: 15000 },
  mutation_ids: [...ids], counts: { measured: ids.length, caught: ids.length, survived: 0, wrong: 0, harness: 0, stale: 0, weak: 0 },
  norm_chain: ids.map(chainRow), evidence_bound: true, evidence_unbound: [],
  norm_required: { version: PINNED.required.version, stage: 'measured', expected_state: 'covered',
    clauses: [...PINNED.required.clauses], satisfied: [], missing: [], ok: true },
  norm_integrity_ok: true, norm_integrity_problems: [], norm_contract: { ...PINNED.contract },
  norm_index_digest: PINNED.index_digest, mutation_results: ids.map((id) => result(id)), why: [],
});
const IDS = [['MA1', 'MA2'], ['MB1', 'MB2'], ['MC1', 'MC2']];
const ALL_IDS = IDS.flat();
const fresh = () => { tok = 0; return JSON.parse(JSON.stringify(IDS.map((ids, i) => unit(i + 1, ids)))); };
const admit = (units) => admitUnits(units, { today: TODAY, mutationIds: ALL_IDS, pinned: PINNED });

// ── UAD05 — A FIXTÚRA ALAKJA AZ ÍRÓTÓL ──────────────────────────────────────────────────────────
// Ha az egység-író új mezőt kap, a fixtúra NE maradjon némán elavult: a pin az író mező-listáját
// olvassa ki, és megköveteli, hogy a fixtúra mindet hordozza (KUKA-016: az alakot a testvértől).
const writerBlock = MUTATE.slice(MUTATE.indexOf('const unitFile = join(UNITS_DIR'), MUTATE.indexOf('egység-eredmény:'));
const writerKeys = [...writerBlock.matchAll(/^\s{6}([a-z_]+):/gm)].map((m) => m[1]);
say('UAD05', writerKeys.length >= 20, `az egység-író mező-listája nem olvasható ki (${writerKeys.length} mező — padló: 20)`);
const fixtureKeys = new Set(Object.keys(fresh()[0]));
const absent = writerKeys.filter((k) => !fixtureKeys.has(k));
say('UAD05', absent.length === 0, `a fixtúra nem hordozza az író MINDEN mezőjét: ${absent.join(', ')} — az őr elavult alakot mérne`);

// ── UAD03 — POZITÍV KONTROLL ────────────────────────────────────────────────────────────────────
// KUKA-122: minden kapunál a MÁSODIK kérdés az, HOGYAN TELJESÍTHETŐ. Ha a valódi alak sem megy át,
// a kapu nem kapu, hanem fal.
const positive = admit(fresh());
say('UAD03', positive.ok, `a VALÓDI alakú hármas sem megy át a kapun: ${positive.problems.join(' · ')}`);
say('UAD03', positive.coverage.seen === ALL_IDS.length,
  `a lefedettség nem a részletes eredményből jön (${positive.coverage.seen} ≠ ${ALL_IDS.length})`);
say('UAD03', positive.counts.caught === ALL_IDS.length,
  `az elkapott darabszám nem a részletesből számolódik (${positive.counts.caught} ≠ ${ALL_IDS.length})`);
const posBacking = chainBacking(fresh().flatMap((u) => u.norm_chain), positive.detailsById);
say('UAD03', posBacking.problems.length === 0 && posBacking.backed.length === ALL_IDS.length,
  `a valódi lánc-sorok fedezete sem áll meg: ${posBacking.problems.join(' · ')}`);

// ── UAD04 — A NÉGY ELLENPÉLDA, MIND A SAJÁT NEVEZETT AKADÁLYÁVAL ────────────────────────────────
// Mindegyik a külső fél R81 §4-es alakja, a SAJÁT, VALÓDI egységeink másolatain végrehajtva.
const CASES = [
  { id: 'F01a — üres részletes eredmény',
    apply: (us) => us.forEach((u) => { u.mutation_results = []; }),
    want: /BEJELENTETT, de nem mért mutáció/ },
  { id: 'F01b — önellentmondó verdikt',
    apply: (us) => us.forEach((u) => u.mutation_results.forEach((r) => {
      r.verdict = 'SURVIVED'; r.probe_status = 'PASS'; r.failed_assertions = [];
    })),
    want: /ELLENTMONDÁS a bejelentett és a részletesből mért számok között/ },
  { id: 'F02 — kiürített kötelező készlet',
    apply: (us) => us.forEach((u) => { u.norm_required.clauses = []; u.norm_chain = []; }),
    want: /a beadott KÖTELEZŐ KÉSZLET eltér a mai szerződéstől/ },
  { id: 'F03 — idegen futási szerződés',
    apply: (us) => us.forEach((u) => { u.run_contract = 'RUN-FOREIGN'; }),
    want: /ISMERETLEN futási szerződés/ },
  // …és a saját, ugyanebből a családból származó alakjaink:
  { id: 'S01 — a kötés-állítás önmagának mond ellent',
    apply: (us) => { us[0].evidence_unbound = ['MA1']; },
    want: /ELLENTMONDÁS: `evidence_bound: true`/ },
  { id: 'S02 — idegen alap-lenyomat a RÉSZLETESBEN (a fejléc maradhat helyes)',
    apply: (us) => { us[0].mutation_results[0].base_digest = 'sha256:tegnapi'; },
    want: /az ALAP-lenyomat IDEGEN/ },
  { id: 'S03 — ugyanaz a futás-jel két eredményen',
    apply: (us) => { us[1].mutation_results[0].run_token = us[0].mutation_results[0].run_token; },
    want: /ugyanaz a futás-jel KÉT eredményen/ },
  { id: 'S04 — a mutált lenyomat azonos az alapéval (a szerkesztés nem történt meg)',
    apply: (us) => { us[0].mutation_results[0].mutated_digest = TODAY; },
    want: /AZONOS az alapéval/ },
  { id: 'S05 — hiányzó kötelező mező (nem „öröklött igen")',
    apply: (us) => { delete us[0].evidence_bound; },
    want: /`evidence_bound`: a mező HIÁNYZIK/ },
];
for (const c of CASES) {
  const us = fresh();
  c.apply(us);
  const got = admit(us);
  say('UAD04', !got.ok, `[${c.id}] a kapu BEFOGADTA — pedig el kellett volna utasítania`);
  say('UAD04', got.problems.some((p) => c.want.test(p)),
    `[${c.id}] elutasította, de NEM a nevezett akadállyal — kapott: ${got.problems.slice(0, 2).join(' · ') || '(egy sem)'}`);
}

// A LÁNC-FEDEZET KÜLÖN MÉRVE (R81/F01b a saját feloldóján) — ÉS A NÉGY FELTÉTEL KÜLÖN-KÜLÖN.
//
// A SAJÁT ŐRÖM ELSŐ ALAKJA ITT BUKOTT MEG (KUKA-123 a saját munkámon): egyetlen ellenpéldát adtam,
// ami MIND A NÉGY feltételt egyszerre sértette (rossz verdikt ÉS üres állítás-lista). A
// visszacsúszás-próbán kiderült, hogy a verdikt-feltétel KIVÉTELÉTŐL a pin ZÖLD MARAD — mert az
// ellenpéldát a szomszéd feltétel is elkapta. Ahol egy feloldó TÖBB feltételt hordoz, mindegyiket
// KÜLÖN, csak azt sértő ellenpéldával kell mérni, különben az őr a feltételek EGYÜTTESÉT méri, és
// egy darab néma kivétele nem látszik (KUKA-039: a fél őr).
const BACKING_CASES = [
  { id: 'lánc/verdikt — a mutáció nem kapott el (a többi mező ép)',
    apply: (r) => { r.verdict = 'SURVIVED'; }, want: /verdiktje `SURVIVED`, nem `CAUGHT`/ },
  { id: 'lánc/állítás — más állítást buktatott',
    apply: (r) => { r.failed_assertions = ['A-MASIK']; }, want: /NEM ezt az állítást buktatta/ },
  { id: 'lánc/próba — másik próbáról szól',
    apply: (r) => { r.probe_id = 'P-MASIK'; }, want: /a FEDETT .* sor a .* próbáról szól/ },
  { id: 'lánc/hiány — a hivatkozott mutációról nincs eredmény',
    apply: (r, u) => { u.mutation_results = u.mutation_results.filter((x) => x !== r); u.mutation_ids = u.mutation_ids.filter((i) => i !== r.mutation_id); u.counts.measured -= 1; u.counts.caught -= 1; },
    want: /NINCS részletes eredmény a beadványban/ },
];
for (const c of BACKING_CASES) {
  const us = fresh();
  c.apply(us[0].mutation_results[0], us[0]);
  const got = chainBacking(us.flatMap((u) => u.norm_chain), admit(us).detailsById);
  say('UAD04', got.backed.length === ALL_IDS.length - 1,
    `[${c.id}] a FEDETT sor fedezet nélkül is megmaradt (${got.backed.length} fedett, várt ${ALL_IDS.length - 1})`);
  say('UAD04', got.problems.some((p) => c.want.test(p)),
    `[${c.id}] elbukott, de NEM a nevezett okkal — kapott: ${got.problems.join(' · ') || '(egy sem)'}`);
}

// ── UAD06 — A TÁMOGATOTT SZERZŐDÉS SZABÁLY ──────────────────────────────────────────────────────
say('UAD06', Array.isArray(SUPPORTED_RUN_CONTRACTS) && SUPPORTED_RUN_CONTRACTS.includes('RUN-02'),
  'a támogatott futási szerződések listája nem tartalmazza a RUN-02-t');
const noContract = fresh();
noContract.forEach((u) => { delete u.run_contract; });
say('UAD06', admit(noContract).problems.some((p) => /`run_contract`: a mező HIÁNYZIK/.test(p)),
  'a HIÁNYZÓ futási szerződés nem külön válasz (KUKA-124/2: a hiány némán ugyanoda sorolódik)');

console.log(`MRG-01 BEADVÁNY-KAPU (UAD01–UAD06): ${CASES.length + 1} ellenpélda · 1 pozitív kontroll · `
  + `${writerKeys.length} író-mező · kötelező készlet: ${REQUIRED_EVIDENCE.version} (${REQUIRED_EVIDENCE.clauses.length} klauzula)`);
if (problems.length) {
  console.error(`\nPIROS (${problems.length}):`);
  for (const p of problems) console.error(`  · ${p}`);
  process.exit(1);
}
console.log('ZÖLD — a kapu a RÉSZLETES bizonyítékot méri, a mérce a mai rögzített szerződés.');
