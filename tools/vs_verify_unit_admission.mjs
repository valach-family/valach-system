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
 * UAD08  a darabszámnak EGY deklarált otthona van, és az otthon tényleg hat (KUKA-129 · KUKA-126)
 */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, cpSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { admitUnits, chainBacking, SUPPORTED_RUN_CONTRACTS } from '../v3ref/unitAdmission.mjs';
import { REQUIRED_EVIDENCE, indexDigest, expectedChainRows, chainRowKey } from '../v3ref/norms.mjs';
import { EXPECTED_PROBES } from '../v3ref/manifest.mjs';
import { contractRef } from '../v3ref/normContract.mjs';
import { DECLARED_UNITS, unitsScriptLine, unitsScriptLineAuto, unitsScriptLineIsHomed } from '../v3ref/external-checks/batteryUnits.mjs';
import { PROGRAMS } from '../v3ref/external-checks/case-manifest.mjs';

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
// A MAI REGISZTER ALAKJA (R83/F01): a kapu innen tudja meg a mutáció SZERZŐDÉSÉT és NEVEZETT
// elkapóját — a fixtúra ezért teljes regiszter-bejegyzéseket ad, nem puszta azonosítókat.
const registryOf = (kinds = {}) => ALL_IDS.map((id) => ({ id, catcher: `P-${id}`, expect: kinds[id] || 'probe_fail' }));
const admit = (units, kinds) => admitUnits(units, { today: TODAY, mutations: registryOf(kinds), pinned: PINNED });

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
  // ── R83/F01 — a külső fél KÉT új ellenpéldája, és a saját, ugyanebből a családból valók ────────
  { id: 'R83a — TÖRÖLT próba-állapot minden eredményben',
    apply: (us) => us.forEach((u) => u.mutation_results.forEach((r) => { delete r.probe_status; })),
    want: /a `probe_status` mező HIÁNYZIK/ },
  { id: 'R83b — ISMERETLEN próba-állapot minden eredményben',
    apply: (us) => us.forEach((u) => u.mutation_results.forEach((r) => { r.probe_status = 'UNKNOWN'; })),
    want: /ISMERETLEN próba-állapot: "UNKNOWN"/ },
  { id: 'R83c — a verdikt és az állapot ELLENTMOND (CAUGHT + THREW egy probe_fail mutáción)',
    apply: (us) => { us[0].mutation_results[0].probe_status = 'THREW'; },
    want: /ELLENTMONDÁS: a verdikt `CAUGHT` \(a mutáció szerződése: probe_fail\)/ },
  { id: 'R83d — NULL próba-állapot elkapott mutáción',
    apply: (us) => { us[0].mutation_results[0].probe_status = null; },
    want: /a `probe_status` NULL, a verdikt viszont `CAUGHT`/ },
  { id: 'R83e — az elkapó ELTÉR a mai regisztertől',
    apply: (us) => { us[0].mutation_results[0].catcher = 'P-IDEGEN'; us[0].mutation_results[0].probe_id = 'P-IDEGEN'; },
    want: /a beadott elkapó ELTÉR a mai regiszterétől/ },
  { id: 'R83f — ELAVULT HORGONY részletes eredményként',
    apply: (us) => { us[0].mutation_results[0].verdict = 'STALE_ANCHOR'; },
    want: /ELAVULT HORGONY verdikt RÉSZLETES eredményként/ },
];
for (const c of CASES) {
  const us = fresh();
  c.apply(us);
  const got = admit(us);
  say('UAD04', !got.ok, `[${c.id}] a kapu BEFOGADTA — pedig el kellett volna utasítania`);
  say('UAD04', got.problems.some((p) => c.want.test(p)),
    `[${c.id}] elutasította, de NEM a nevezett akadállyal — kapott: ${got.problems.slice(0, 2).join(' · ') || '(egy sem)'}`);
}

// ── A MUTÁCIÓ FAJTÁJA SZÁMÍT — ELLENPÁRRAL MÉRVE (R83/F01 · KUKA-049 · KUKA-122) ────────────────
//
// A külső fél kimondta: „A legitim runtime_error esetet ne törje el egy túl egyszerű »minden CAUGHT
// csak FAIL lehet« szabály." Ezt nem elég ÁLLÍTANI: a KÉT ág UGYANAZON a beadványon, csak MÁS
// szerződés-fajtával mérve — az egyik zöld, a másik piros. Enélkül nem tudnánk, hogy a fajta
// tényleg számít-e, vagy csak a verdikt (KUKA-068: a pin ne a saját nyelvjárását mérje).
{
  const shape = (us) => {
    const r = us[0].mutation_results[0];
    r.probe_status = 'THREW'; r.failed_assertions = [];     // a próbán BELÜLI, szerződött kivétel
  };
  const green = fresh(); shape(green);
  const okRuntime = admit(green, { MA1: 'runtime_error' });
  say('UAD04', okRuntime.ok,
    `[R83/pozitív] a LEGITIM runtime_error alak (CAUGHT + THREW) sem megy át: ${okRuntime.problems.join(' · ')}`);
  const red = fresh(); shape(red);
  const badFail = admit(red);                                // ugyanaz az alak, probe_fail szerződéssel
  say('UAD04', !badFail.ok && badFail.problems.some((p) => /a mutáció szerződése: probe_fail/.test(p)),
    '[R83/ellenpár] a probe_fail szerződésű mutáció THREW állapottal is átment — a fajta nem számít');
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

// ── UAD07 — A LÁNC-SOROK HALMAZA A RÖGZÍTETT SZERZŐDÉSBŐL (R83/F02) ─────────────────────────────
//
// MIÉRT ÉLES FUTÁSSAL. A hiányzó sort a forrás SZÖVEGE nem árulja el: a szabály attól él, hogy az
// összefűzés MIT CSINÁL vele. Ezért a pin megépít egy egység-fájlt a TELJES elvárt lánccal, majd
// négy alakban rontja el, és minden alkalommal a VALÓDI `mutate.mjs --merge` gépi kimenetét olvassa.
// A kontroll ELLENPÁR: ugyanaz a lánc KÉT egységben (a darabolás jogos ismétlése) NEM lehet hiba.
{
  const expected = expectedChainRows(EXPECTED_PROBES);
  say('UAD07', expected.length >= 40, `az elvárt lánc-sorok száma padló alatt (${expected.length} < 40)`);
  const keys = new Set(expected.map(chainRowKey));
  say('UAD07', keys.size === expected.length, 'az elvárt lánc-sorok között ISMÉTLŐDŐ hármas van');
  say('UAD07', expected.some((r) => r.clause_id === REQUIRED_EVIDENCE.clauses[0]),
    'az elvárt sorok között nincs egyetlen KÖTELEZŐ klauzula sem — a mérce nem a mai szerződésből jön');

  const dir = mkdtempSync(join(tmpdir(), 'uad-f02-'));
  try {
    cpSync(join(ROOT, 'v3ref'), join(dir, 'v3ref'), { recursive: true,
      filter: (f) => !f.startsWith(join(ROOT, 'v3ref/units')) && !f.startsWith(join(ROOT, 'v3ref/external-checks/results')) });
    const chainRow = (r) => ({ norm_id: r.norm_id, clause_id: r.clause_id, covers: [],
      assertion_id: r.assertion_id, probe_id: r.probe_id, mutation_candidates: [], falsified_by: null,
      evidence_limit: null, content_review: null, result: 'falsification_pending', why: null });
    const unitWith = (k, n, chain) => ({ run_contract: 'RUN-02', unit: { k, n }, base_digest: 'sha256:x',
      base_gate_ok: true, attacks_ok: true, run_state: 'complete', slice_clean: true, portable: true,
      wall: { ms: 1 }, mutation_ids: [], counts: { measured: 0, caught: 0, survived: 0, wrong: 0, harness: 0, stale: 0 },
      norm_chain: chain, evidence_bound: true, evidence_unbound: [], norm_index_digest: 'sha256:x',
      norm_required: { version: 'x', stage: 'measured', expected_state: 'covered', clauses: [] },
      norm_contract: { version: 'x', digest: 'sha256:x' }, norm_integrity_ok: true, mutation_results: [] });
    const mergeWith = (units) => {
      rmSync(join(dir, 'v3ref/units'), { recursive: true, force: true });
      mkdirSync(join(dir, 'v3ref/units'), { recursive: true });
      for (const [i, u] of units.entries()) {
        writeFileSync(join(dir, `v3ref/units/unit-${i + 1}-of-${units.length}.json`), JSON.stringify(u));
      }
      spawnSync(process.execPath, [join(dir, 'v3ref/mutate.mjs'), '--merge'],
        { cwd: dir, encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024 });
      return (JSON.parse(readFileSync(join(dir, 'v3ref/v3ref-mutation-result.json'), 'utf8')).why || []);
    };
    const full = expected.map(chainRow);
    const has = (why, re) => why.some((w) => re.test(w));

    // (a) KONTROLL: a teljes lánc — se hiányzó, se idegen, se ismétlődő sor.
    const whyFull = mergeWith([unitWith(1, 1, full)]);
    say('UAD07', !has(whyFull, /HIÁNYZÓ lánc-sor/), 'a TELJES lánc mellett is hiányzó sort jelent a kapu');
    say('UAD07', !has(whyFull, /IDEGEN lánc-sor/), 'a TELJES lánc mellett idegen sort jelent a kapu');
    say('UAD07', !has(whyFull, /ISMÉTLŐDŐ lánc-sor/), 'a TELJES lánc mellett ismétlődést jelent a kapu');

    // (b) ELLENPÁR: UGYANAZ a lánc KÉT egységben — a darabolás jogos ismétlése, nem hiba.
    const whyTwo = mergeWith([unitWith(1, 2, full), unitWith(2, 2, full)]);
    say('UAD07', !has(whyTwo, /ISMÉTLŐDŐ lánc-sor/),
      'a KÉT egységben megjelenő AZONOS sort hibának mondja a kapu — a darabolás így lehetetlen volna');

    // (c) A KÜLSŐ FÉL ALAKJA: egy kötelező sor kivéve MINDEN egységből.
    const reqRow = expected.find((r) => REQUIRED_EVIDENCE.clauses.includes(r.clause_id) && r.assertion_id);
    const minusOne = full.filter((r) => chainRowKey(r) !== chainRowKey(reqRow));
    const whyMinus = mergeWith([unitWith(1, 2, minusOne), unitWith(2, 2, minusOne)]);
    say('UAD07', has(whyMinus, /HIÁNYZÓ lánc-sor/),
      'a MINDEN egységből kivett kötelező lánc-sor NEM lett nevezett akadály (R83/F02)');
    // ÉS A RANG IS MÉRVE, NEM CSAK A HIBALISTA. A hiányzó sornak a KLAUZULA ítéletét kell vinnie:
    // ha csak a hibalistára kerül, de a láncba nem, a klauzula a MEGMARADT sorok alapján ítélődik —
    // pontosan az a rés, amit a külső fél talált. (A SAJÁT első alakom itt bukott meg: a
    // `hiányzó kötelező bizonyíték` mondat a fixtúrában amúgy is mindig ott állt, tehát a
    // visszacsúszást nem fogta meg — KUKA-124/1: a már eldöntött tényt mérő ellenőrzés nem véd.)
    say('UAD07', has(whyMinus, new RegExp(`${reqRow.clause_id}: row_missing`)),
      'a kivett sor klauzulája NEM `row_missing` ítéletet kapott — a hiányzó sor nem viszi a leggyengébb rangot');

    // (d) A CSERE: a kivett sor helyére IDEGEN sor — a darabszám stimmel, az azonosság nem.
    const swapped = [...minusOne, chainRow({ norm_id: 'X', clause_id: reqRow.clause_id,
      assertion_id: 'A-NEM-LETEZIK', probe_id: 'P-NEM-LETEZIK' })];
    const whySwap = mergeWith([unitWith(1, 1, swapped)]);
    say('UAD07', has(whySwap, /IDEGEN lánc-sor/) && has(whySwap, /HIÁNYZÓ lánc-sor/),
      'a KICSERÉLT sor (azonos darabszám) nem lett nevezett akadály — a szám mögé bújt volna');

    // (e) EGY egységen belüli ismétlés.
    const dup = [...full, chainRow(reqRow)];
    const whyDup = mergeWith([unitWith(1, 1, dup)]);
    say('UAD07', has(whyDup, /ISMÉTLŐDŐ lánc-sor EGY egységen belül/),
      'az EGY egységen belüli ismétlődő lánc-sor nem lett nevezett akadály');
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

// ── UAD08 — A DARABSZÁMNAK EGY DEKLARÁLT OTTHONA VAN, ÉS AZ OTTHON TÉNYLEG HAT ─────────────────
//
// MIÉRT. A darabszám HÁROM helyen élt, HÁROM értékkel (`package.json` · adaptált külső programok ·
// a saját futás-szerződés próbánk `--unit=k/4` alakban BEÉGETVE). A battéria 134 → 145 mutációra
// nőtt, és a négyes bontás átlépte a `mutate.mjs` saját költségvetését: a SAJÁT U04-es pozitív
// ellenpárunk pirosra ment egy ép rendszeren (KUKA-129 — a szabály egyik végén javítva, a másikon
// változatlanul). A `package.json` nem tud modult behúzni, ezért az „egy otthon" csak akkor kötés
// és nem dísz, ha a GÉP veti össze a kettőt (KUKA-126).
//
// AMIT EZ NEM MÉR — KIMONDVA: hogy a deklarált darabszám BELEFÉR-e a költségvetésbe. Azt nem
// jóslat őrzi, hanem maga a `mutate.mjs`: túllépésnél nem nullával lép ki (KUKA-045 — ahol a
// szabály megfogalmazható, ott ne előre beírt számot mérjünk).
{
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const line = pkg.scripts['v3ref:mutate:units'];
  // HELYESBÍTVE (R36). A régi alak a KÉZZEL KIÍRT felsorolással EGYEZÉST követelt — és amikor a
  // darabszám a KUKA-177 nyomán SZÁRMAZTATOTTÁ vált (`--units-auto`), ez az őr pirosra ment egy ÉP
  // rendszeren: nem elmulasztotta a hibát, hanem VÉDTE a régi, elavult alakot (KUKA-057 fordítottja
  // · KUKA-068). A mérce ezért nem egy szöveg, hanem a SZABÁLY: a sor darabolása a közös otthonból
  // származzon — akár a származtatott `--units-auto`, akár a generátor teljes felsorolása.
  const homed = unitsScriptLineIsHomed(line);
  say('UAD08', homed.ok,
    `a package.json \`v3ref:mutate:units\` sora nem a deklarált otthonból származik:\n`
    + `      van : ${line}\n      ${homed.why || ''}`);
  // ELLENPÁR MINDKÉT IRÁNYBAN (KUKA-039): a két otthonos alak ZÖLD, a kézzel gépelt nevező PIROS.
  say('UAD08', unitsScriptLineIsHomed(unitsScriptLineAuto()).form === 'derived'
    && unitsScriptLineIsHomed(unitsScriptLine(DECLARED_UNITS)).form === 'enumerated'
    && !unitsScriptLineIsHomed('node v3ref/mutate.mjs --unit=1/9 && node v3ref/mutate.mjs --merge').ok
    && !unitsScriptLineIsHomed('').ok,
    'az otthon-felismerő nem mér mindkét irányban (a két otthonos alak zöld, a kézzel gépelt nevező piros)');

  const R79 = readFileSync(join(ROOT, 'v3ref/external-checks/r79_run_contract_restated.mjs'), 'utf8');
  const code = R79.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  say('UAD08', /from '\.\/batteryUnits\.mjs'/.test(code),
    'a futás-szerződés próba nem a közös `batteryUnits.mjs` otthonból veszi a darabszámot');
  // A BEHÚZÁS LÉTEZÉSE NEM BIZONYÍTÉK ARRA, HOGY FUT (KUKA-038 · KUKA-130). A futtató a programot
  // EGY IDEIGLENES MAPPÁBA másolja, és csak a `file` + `companions` fájlokat viszi magával: az első
  // alakom a közös modult a `v3ref/` alá tette, `../batteryUnits.mjs` behúzással, és a program a
  // MÉRÉS ELŐTT halt meg (ERR_MODULE_NOT_FOUND, 57 ms) — a forrás-olvasó ellenőrzés zölden állt.
  // Ezért a KÍSÉRŐ-DEKLARÁCIÓT is mérni kell, és a modulnak a másolt fában kell lennie.
  const entry = PROGRAMS.find((x) => x.id === 'r79');
  say('UAD08', entry && (entry.companions || []).includes('batteryUnits.mjs'),
    'a darabszám közös modulja NINCS kísérőként deklarálva — a másolt futtatásban nem lenne ott');
  say('UAD08', existsSync(join(ROOT, 'v3ref/external-checks/batteryUnits.mjs')),
    'a darabszám közös modulja nincs a programmal AZONOS mappában (a kísérő onnan másolódik)');
  // MEGENGEDŐ SZABÁLY, NEM TILTÓ FELSOROLÁS (KUKA-057). Az első két alakom a beégetett NEVEZŐ
  // írásmódjait sorolta; mérve mindkettő rést hagyott — `` `--unit=${k}/4` `` az elsőn, a
  // `"--unit=" + k + "/4"` összefűzés a másodikon csúszott át (KUKA-068: a pin a saját kitalált
  // nyelvjárását mérte). A helyes mérce nem az, hogy MELYIK írásmód tilos, hanem hogy az egység-
  // argumentumnak EGYETLEN forrása van: a közös `unitArgs`. Ezért a program KÓDJÁBAN a `--unit`
  // szó egyáltalán nem állhat, az egység-fájlnév `-of-` része pedig csak változóval folytatódhat.
  say('UAD08', !code.includes('--unit'),
    'a futás-szerződés próba MAGA állítja elő az egység-argumentumot (`--unit`) — az egyetlen '
    + 'megengedett forrás a közös `unitArgs`');
  const burnedName = (code.match(/-of-(?!\$\{)./g) || []);
  say('UAD08', burnedName.length === 0,
    `az egység-fájlnévben BEÉGETETT nevező maradt: ${burnedName.join(', ')}`);

  // POZITÍV ELLENPÁR a saját generátorunkra (KUKA-122: a kapu legyen teljesíthető, és mérve az).
  say('UAD08', unitsScriptLine(2) === 'node v3ref/mutate.mjs --unit=1/2 && node v3ref/mutate.mjs --unit=2/2 && node v3ref/mutate.mjs --merge',
    'a parancs-sor generátor maga hibás — az UAD08 összevetése így önmagát igazolná vissza');
}

console.log(`MRG-01 BEADVÁNY-KAPU (UAD01–UAD08): ${CASES.length + 1} ellenpélda · 1 pozitív kontroll · `
  + `${writerKeys.length} író-mező · kötelező készlet: ${REQUIRED_EVIDENCE.version} (${REQUIRED_EVIDENCE.clauses.length} klauzula)`);
if (problems.length) {
  console.error(`\nPIROS (${problems.length}):`);
  for (const p of problems) console.error(`  · ${p}`);
  process.exit(1);
}
console.log('ZÖLD — a kapu a RÉSZLETES bizonyítékot méri, a mérce a mai rögzített szerződés.');
