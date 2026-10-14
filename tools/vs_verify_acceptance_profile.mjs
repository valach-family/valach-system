#!/usr/bin/env node
/**
 * PRF-01 PROFIL-KAPU (PRF01–PRF08) — A MAI ELFOGADÁSI PROFIL GÉPI JELE (R202 §1–§2).
 *
 * MIT MÉR, ÉS MIT NEM. Ez a próba a PROFIL KEZELÉSÉT méri: hogy a mai, 17-programos elfogadási
 * mérce a FÜGGETLEN profil-otthonból jön, hogy a történeti 19-programos eredmény gépileg nem
 * adható be mai profilként, és hogy a biztonsági szándék tanúja ÉL. NEM termékelfogadás, és nem
 * független AI-review: a működő saját futtató zöldje a sajátunk (R202 §3).
 *
 * A HÉT KÉRT ESET (R202 §2) + egy tanú-ellenőrzés:
 *   PRF01  jó, teljes mai készlet ELFOGADVA a mai profil neve alatt
 *   PRF02  egyetlen aktív program/eset hiánya, bukása vagy érvénytelen bizonyítéka ELUTASÍTVA
 *   PRF03  az `r57a`/`r59a` hiányát a történeti eredeti SEMMILYEN állapota nem pótolja
 *   PRF04  történeti profil eredménye NEM adható be mai profilként
 *   PRF05  az R201-ből ismert régi bukások MEGMARADNAK a történeti nézetben, de nem aktív programok
 *   PRF06  a változatlan eredeti fájlok AZONOSSÁGA — olcsó összehasonlítással, az R201 rekordjaihoz
 *   PRF07  a biztonsági szándék TANÚJA él: a nevezett magpróbák futnak és ZÖLDEK, a jelek a forrásban
 *   PRF08  a profil-otthon SAJÁT kapuja: elcsúszott profil, néma alapérték és kitalált profil elesik
 *
 * (A „részleges `--only` nem teljes profilbizonyíték" és a „régi CLI és új profilos CLI nem
 * keverhető" esetek a futtató ÉLŐ útján mérődnek: PRF04/b és PRF04/c.)
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  PROFILE_CONTRACT, PROFILE_CONTRACT_VERSION, PROFILES, SUBSTITUTIONS,
  ACCEPTANCE_PROFILE, HISTORICAL_PROFILE, resolveProfile, profileProgramRows, profileCaseKeys,
  measureProfileFiles, profileDigest, profileProblems, profileLine,
} from '../v3ref/external-checks/acceptanceProfile.mjs';
import { PROGRAMS } from '../v3ref/external-checks/case-manifest.mjs';
import {
  verifySeries, makeAnchor, makeRecord, configDigest, evidenceDigest, seriesId, BINDING_ANCHOR_FILE,
} from '../v3ref/external-checks/seriesLedger.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HERE = join(ROOT, 'v3ref/external-checks');
const problems = [];
let count = 0;
const say = (id, ok, msg) => { count += 1; if (!ok) problems.push(`${id}: ${msg}`); };

const TODAY = resolveProfile(ACCEPTANCE_PROFILE).profile;
const HIST = resolveProfile(HISTORICAL_PROFILE).profile;
const TODAY_FILES = measureProfileFiles(HERE, TODAY, PROGRAMS);
const HIST_FILES = measureProfileFiles(HERE, HIST, PROGRAMS);
const TODAY_DIGEST = profileDigest({ profile: TODAY, programs: PROGRAMS, fileDigests: TODAY_FILES });
const HIST_DIGEST = profileDigest({ profile: HIST, programs: PROGRAMS, fileDigests: HIST_FILES });
const TODAY_ROWS = profileProgramRows(TODAY, PROGRAMS).filter(Boolean);

const hex = (n, seed) => createHash('sha256').update(String(seed)).digest('hex').slice(0, n);
const CFG = configDigest({ battery_units: 64, unit_plan: [64, 253], unit_budget_ms: 12_000, external_cap_ms: 15_000, node: process.version });
/** A FIXTÚRA KÖTÉSE — a profil az OTTHONBÓL, nem beírt értékből (KUKA-495). */
const bindingFor = (profile, digest) => ({
  bundle_digest: hex(64, 'prf-bundle'),
  programs_digest: hex(64, 'prf-manifest'),
  runner_digest: hex(64, 'prf-runner'),
  config_digest: CFG,
  profile_id: profile.id,
  profile_digest: digest,
  clean: true,
});
const TODAY_BINDING = bindingFor(TODAY, TODAY_DIGEST);
const HIST_BINDING = bindingFor(HIST, HIST_DIGEST);
const PROV = { commit: hex(40, 'prf-commit') };
const EV = (id) => hex(64, `prf-evidence-${id}`);
const recFor = (p, binding, over = {}) => ({
  ...makeRecord({
    binding,
    provenance: PROV,
    program: { id: p.id, digest: hex(64, `prf-dg-${p.id}`) },
    exit: 0,
    ok: true,
    cases: (p.cases || []).map((id) => ({ id, pass: true })),
    evidence_digest: EV(p.id),
  }),
  ...over,
});
const fullToday = () => TODAY_ROWS.map((p) => recFor(p, TODAY_BINDING));
const digestsFor = (rows) => new Map(rows.map((p) => [p.id, EV(p.id)]));

// ── PRF01 — A JÓ, TELJES MAI KÉSZLET ELFOGADVA (pozitív kontroll — KUKA-122) ───────────────────────
{
  const anchor = makeAnchor({ binding: TODAY_BINDING, provenance: PROV, programs: TODAY_ROWS.map((p) => p.id), recorded_by: 'prf-fixtúra' });
  const { verdict, problems: pr } = verifySeries({
    records: fullToday(), programs: TODAY_ROWS, expected: anchor, live: TODAY_BINDING, evidenceDigests: digestsFor(TODAY_ROWS),
  });
  say('PRF01', pr.length === 0, `az ÉP mai készlet leleteket adott: ${pr.slice(0, 3).join(' · ')}`);
  say('PRF01', verdict.accepted === true, `a jó, teljes MAI készlet NEM lett elfogadva: ${verdict.why}`);
  say('PRF01', verdict.of === TODAY_ROWS.length && verdict.green === TODAY_ROWS.length,
    `a verdikt nem ${TODAY_ROWS.length}/${TODAY_ROWS.length}: ${verdict.green}/${verdict.of}`);
  say('PRF01', TODAY_ROWS.length === 17, `a mai profil nem 17 programot nevez meg: ${TODAY_ROWS.length}`);
  say('PRF01', profileCaseKeys(TODAY, PROGRAMS).length === 152,
    `a mai aktív eset-készlet nem 152: ${profileCaseKeys(TODAY, PROGRAMS).length}`);
}

// ── PRF02 — EGYETLEN AKTÍV PROGRAM/ESET HIÁNYA, BUKÁSA VAGY ÉRVÉNYTELEN BIZONYÍTÉKA ELUTASÍTVA ────
{
  const anchor = makeAnchor({ binding: TODAY_BINDING, provenance: PROV, programs: TODAY_ROWS.map((p) => p.id), recorded_by: 'prf-fixtúra' });
  const gate = (recs, digests) => verifySeries({
    records: recs, programs: TODAY_ROWS, expected: anchor, live: TODAY_BINDING,
    evidenceDigests: digests || digestsFor(TODAY_ROWS),
  }).verdict;
  // (a) HIÁNYZÓ program
  for (const drop of ['r57a', 'r59a', 'r83core']) {
    const recs = fullToday().filter((r) => r.program !== drop);
    const v = gate(recs);
    say('PRF02', v.accepted === false && v.complete === false && v.missing.includes(drop),
      `a HIÁNYZÓ ${drop} MÉGIS elfogadva: ${v.why}`);
  }
  // (b) BUKOTT program
  {
    const recs = fullToday();
    const i = recs.findIndex((r) => r.program === 'r61');
    recs[i] = recFor(PROGRAMS.find((p) => p.id === 'r61'), TODAY_BINDING, { ok: false, exit: 1 });
    const v = gate(recs);
    say('PRF02', v.accepted === false && v.failed >= 1, `a BUKOTT r61 MÉGIS elfogadva: ${v.why}`);
  }
  // (c) HIÁNYZÓ ESET egy zöld programon — a program-szintű zöld nem fedi (KUKA-206)
  {
    const recs = fullToday();
    const i = recs.findIndex((r) => r.program === 'r59a');
    const row = PROGRAMS.find((p) => p.id === 'r59a');
    recs[i] = recFor(row, TODAY_BINDING, { cases: (row.cases || []).slice(0, -1).map((id) => ({ id, pass: true })) });
    const v = gate(recs);
    say('PRF02', v.accepted === false, 'a HIÁNYZÓ ESET (r59a) mellett a készlet MÉGIS elfogadva');
  }
  // (d) ÉRVÉNYTELEN bizonyíték-lenyomat
  {
    const d = digestsFor(TODAY_ROWS);
    d.set('r57a', hex(64, 'prf-atirt'));
    const v = gate(fullToday(), d);
    say('PRF02', v.accepted === false, 'az ÁTÍRT bizonyíték-lenyomat (r57a) mellett a készlet MÉGIS elfogadva');
  }
}

// ── PRF03 — AZ `r57a`/`r59a` HIÁNYÁT A TÖRTÉNETI EREDETI SEMMILYEN ÁLLAPOTA NEM PÓTOLJA ───────────
{
  const anchor = makeAnchor({ binding: TODAY_BINDING, provenance: PROV, programs: TODAY_ROWS.map((p) => p.id), recorded_by: 'prf-fixtúra' });
  for (const [hianyzo, eredeti] of [['r57a', 'r57'], ['r59a', 'r59']]) {
    const row = PROGRAMS.find((p) => p.id === eredeti);
    for (const [nev, over] of [
      ['ZÖLD eredeti', {}],
      ['BUKOTT eredeti', { ok: false, exit: 1 }],
      ['környezeti akadályon elakadt eredeti', { ok: false, exit: 1, failure_kind: 'wall_clock_timeout' }],
    ]) {
      const recs = fullToday().filter((r) => r.program !== hianyzo);
      recs.push(recFor(row, TODAY_BINDING, over));
      const d = digestsFor(TODAY_ROWS); d.set(eredeti, EV(eredeti));
      const { verdict } = verifySeries({
        records: recs, programs: TODAY_ROWS, expected: anchor, live: TODAY_BINDING, evidenceDigests: d,
      });
      say('PRF03', verdict.accepted === false && verdict.missing.includes(hianyzo),
        `a(z) ${hianyzo} hiányát a(z) „${nev}" (${eredeti}) PÓTOLTA: ${verdict.why}`);
    }
  }
}

// ── PRF04 — TÖRTÉNETI PROFIL EREDMÉNYE NEM ADHATÓ BE MAI PROFILKÉNT ──────────────────────────────
{
  // (a) A KÖTÉS szintjén: a történeti horgony alatt mért rekordok a mai elvárt kötéshez NEM állnak.
  const todayAnchor = makeAnchor({ binding: TODAY_BINDING, provenance: PROV, programs: TODAY_ROWS.map((p) => p.id), recorded_by: 'prf-fixtúra' });
  const histRecs = TODAY_ROWS.map((p) => recFor(p, HIST_BINDING));
  const { verdict: v1, problems: p1 } = verifySeries({
    records: histRecs, programs: TODAY_ROWS, expected: todayAnchor, live: TODAY_BINDING, evidenceDigests: digestsFor(TODAY_ROWS),
  });
  say('PRF04', v1.accepted === false, 'a TÖRTÉNETI kötésű rekordok a MAI horgony alatt elfogadva');
  say('PRF04', p1.some((x) => /profile_id|profile_digest/i.test(x)),
    `az elutasítás nem a PROFIL-eltérést nevezi meg: ${p1.slice(0, 3).join(' · ')}`);
  // (b) A SÖPRÉS feloldója: a profil nélküli / történeti sorozat nem mai profilbizonyíték.
  say('PRF04', TODAY_DIGEST !== HIST_DIGEST,
    `a két profil lenyomata AZONOS (${TODAY_DIGEST}) — a kötés így nem választja el őket`);
  say('PRF04', seriesId(TODAY_BINDING) !== seriesId(HIST_BINDING),
    'a két profil UGYANABBA a sorozatba esik — a szétválasztás nem gépi');
  // (c) A RÉGI CLI és az új profilos CLI nem keverhető: a futtató a mai profilban az EREDETIT elutasítja.
  const r = spawnSync(process.execPath, [join(ROOT, 'v3ref/external-checks/run-all.mjs'), '--profile', ACCEPTANCE_PROFILE, '--only', 'r57'], {
    cwd: ROOT, encoding: 'utf8', timeout: 120_000,
  });
  say('PRF04', r.status === 2 && /NEM AKTÍV/i.test(String(r.stderr) + String(r.stdout)),
    `a mai profilban az EREDETI r57 futtatása nem NEVEZETTEN elakadt (kilépés ${r.status})`);
  say('PRF04', /r57a/.test(String(r.stderr) + String(r.stdout)),
    'az elutasítás nem nevezi meg a helyettesítőt (r57a)');
  // ÉS A RÉGI ÚT VÁLTOZATLAN: profil nélkül az eredeti program VÁLASZTHATÓ (nem fut le, csak elfogadja).
  const r2 = spawnSync(process.execPath, [join(ROOT, 'v3ref/external-checks/run-all.mjs'), '--profile', HISTORICAL_PROFILE, '--only', 'r57', '--out', mkdtempSync(join(tmpdir(), 'prf-out-'))], {
    cwd: ROOT, encoding: 'utf8', timeout: 120_000,
  });
  say('PRF04', !/NEM AKTÍV/i.test(String(r2.stderr)),
    'a TÖRTÉNETI profilban az eredeti r57 is elakadt — a régi út NEM maradt változatlan');
}

// ── PRF05 — A RÉGI BUKÁSOK MEGMARADNAK A TÖRTÉNETI NÉZETBEN, DE NEM AKTÍV PROGRAMOK ──────────────
{
  const histIds = HIST.programs.map(String);
  say('PRF05', histIds.includes('r57') && histIds.includes('r59'),
    'a TÖRTÉNETI profil nem tartalmazza az eredeti r57/r59-et — a bukásaik eltűntek');
  say('PRF05', HIST.programs.length === PROGRAMS.length,
    `a történeti profil nem a TELJES regiszter: ${HIST.programs.length} ≠ ${PROGRAMS.length}`);
  const todayIds = TODAY.programs.map(String);
  say('PRF05', !todayIds.includes('r57') && !todayIds.includes('r59'),
    'a MAI profil MÉGIS aktívnak nevezi az eredeti r57/r59-et');
  // ÉS A TÖRTÉNETI REKORDOK OLVASHATÓK: az R201 sorozatának bukásai a lemezen állnak.
  const sdir = join(ROOT, 'v3ref/external-checks/results/series');
  let foundRed = false;
  if (existsSync(sdir)) {
    for (const d of readdirSync(sdir)) {
      for (const id of ['r57', 'r59']) {
        const f = join(sdir, d, `${id}.json`);
        if (!existsSync(f)) continue;
        try { if (JSON.parse(readFileSync(f, 'utf8')).ok === false) foundRed = true; } catch { /* olvashatatlan */ }
      }
    }
  }
  say('PRF05', foundRed,
    'az R201-ből ismert régi bukások (r57/r59) NEM találhatók a lemezen álló sorozatokban — a történeti nézet elveszett');
}

// ── PRF06 — A VÁLTOZATLAN EREDETI FÁJLOK AZONOSSÁGA, OLCSÓ ÖSSZEHASONLÍTÁSSAL ─────────────────────
//
// A SPEC (§3): *„A változatlan eredeti fájlok és esetállítások azonosságát olcsó összehasonlítással
// igazold."* A mérce NEM új, kézzel beírt pin (az a `KUKA-003`), hanem a már KÖNYVELT bizonyíték: a
// korábbi sorozatok rekordjainak `program_digest`-je.
{
  const sdir = join(ROOT, 'v3ref/external-checks/results/series');
  const fileOf = new Map(PROGRAMS.map((p) => [String(p.id), p.file]));
  const measured = new Map();
  for (const id of ['r57', 'r59', 'r57a', 'r59a']) {
    try { measured.set(id, createHash('sha256').update(readFileSync(join(HERE, fileOf.get(id)))).digest('hex')); }
    catch { measured.set(id, null); }
  }
  let compared = 0; const mismatches = [];
  if (existsSync(sdir)) {
    for (const d of readdirSync(sdir)) {
      for (const id of ['r57', 'r59', 'r57a', 'r59a']) {
        const f = join(sdir, d, `${id}.json`);
        if (!existsSync(f)) continue;
        let rec = null;
        try { rec = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
        const booked = String(rec.program_digest || '');
        if (!/^[0-9a-f]{64}$/.test(booked)) continue;
        compared += 1;
        if (booked !== measured.get(id)) mismatches.push(`${d}/${id}: könyvelt ${booked.slice(0, 12)}… ≠ mért ${String(measured.get(id)).slice(0, 12)}…`);
      }
    }
  }
  say('PRF06', compared >= 4,
    `a könyvelt program-lenyomatokhoz képest kevesebb mint négy összehasonlítás történt (${compared}) — `
    + 'az azonosság NEM igazolt (üres alapsokaságon nincs zöld — KUKA-093)');
  say('PRF06', mismatches.length === 0,
    `a változatlannak állított fájlok lenyomata ELTÉR a könyvelt bizonyítéktól: ${mismatches.slice(0, 3).join(' · ')}`);
  // ÉS AZ ESETÁLLÍTÁSOK: az eredeti és az adaptált UGYANAZT a nevezett eset-készletet hordozza.
  for (const sub of SUBSTITUTIONS) {
    const a = (PROGRAMS.find((p) => p.id === sub.from) || {}).cases || [];
    const b = (PROGRAMS.find((p) => p.id === sub.to) || {}).cases || [];
    say('PRF06', a.length > 0 && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort()),
      `a(z) ${sub.from} és ${sub.to} eset-készlete NEM azonos: [${a.join(' ')}] vs [${b.join(' ')}] — `
      + 'a helyettesítés akkor nem UGYANAZT méri');
  }
}

// ── PRF07 — A BIZTONSÁGI SZÁNDÉK TANÚJA ÉL (R202 §2) ─────────────────────────────────────────────
{
  const w = (SUBSTITUTIONS.find((s) => s.from === 'r57') || {}).security_witness || null;
  say('PRF07', w && Array.isArray(w.asserted_in_probe) && Array.isArray(w.measured_in_output)
    && Array.isArray(w.probes) && w.probes.length >= 2,
    'a helyettesítés nem nevezi meg a biztonsági tanút (próbák + a két jel-csoport)');
  if (w) {
    // (a) AZ ELUTASÍTÓ JELEK A PRÓBA SAJÁT SZÖVEGÉBEN: a magpróba TÉNYLEG ezeket állítja.
    const src = readFileSync(join(ROOT, 'v3ref/run.mjs'), 'utf8');
    for (const tok of w.asserted_in_probe) {
      say('PRF07', src.includes(tok), `az ELUTASÍTÓ jel NEM található a magpróbák forrásában: ${tok}`);
    }
    // (b) ÉS A PRÓBÁK TÉNYLEGESEN FUTNAK, ZÖLDEK, ÉS A JELEK A MÉRT KIMENETBEN ÁLLNAK (KUKA-207).
    const r = spawnSync(process.execPath, [join(ROOT, 'v3ref/run.mjs')], { cwd: ROOT, encoding: 'utf8', timeout: 300_000, maxBuffer: 64 * 1024 * 1024 });
    const out = String(r.stdout);
    for (const probe of w.probes) {
      say('PRF07', new RegExp(`PASS\\s+\\[${probe}\\]`).test(out),
        `a nevezett tanú-próba nem ZÖLD a futó magpróbákban: ${probe}`);
    }
    for (const tok of w.measured_in_output) {
      say('PRF07', out.includes(tok), `a nevezett jel NEM jelenik meg a magpróbák MÉRT kimenetében: ${tok}`);
    }
    say('PRF07', /RESULT: \d+\/\d+ PASS/.test(out) && r.status === 0,
      `a magpróbák nem futottak le zölden (kilépés ${r.status})`);
  }
}

// ── PRF08 — A PROFIL-OTTHON SAJÁT KAPUJA ─────────────────────────────────────────────────────────
{
  say('PRF08', profileProblems({ profile: TODAY, programs: PROGRAMS, fileDigests: TODAY_FILES }).length === 0,
    'az ÉP mai profil leleteket adott a saját kapuján');
  say('PRF08', profileProblems({ profile: HIST, programs: PROGRAMS, fileDigests: HIST_FILES }).length === 0,
    'az ÉP történeti profil leleteket adott a saját kapuján');
  // (a) NÉMA ALAPÉRTÉK NINCS
  say('PRF08', resolveProfile('').ok === false && /EXPLICIT/.test(resolveProfile('').why),
    'az ÜRES profil-név nem NEVEZETTEN esik el (néma alapérték)');
  say('PRF08', resolveProfile('kitalalt').ok === false && /nem nevezett profil/.test(resolveProfile('kitalalt').why),
    'a KITALÁLT profil-név nem NEVEZETTEN esik el');
  // (b) ELCSÚSZOTT PROFIL: nem létező program · aktívan hagyott helyettesített · hiányzó lenyomat
  const bad1 = { ...TODAY, programs: [...TODAY.programs, 'nincs-ilyen-program'] };
  say('PRF08', profileProblems({ profile: bad1, programs: PROGRAMS, fileDigests: TODAY_FILES }).some((x) => /NEM létezik/i.test(x)),
    'a MANIFESZTBEN nem létező program nincs NEVEZETTEN elutasítva');
  const bad2 = { ...TODAY, programs: [...TODAY.programs, 'r57'] };
  say('PRF08', profileProblems({ profile: bad2, programs: PROGRAMS, fileDigests: TODAY_FILES }).some((x) => /MÉGIS aktív/i.test(x)),
    'az aktívan hagyott, helyettesített r57 nincs NEVEZETTEN elutasítva');
  say('PRF08', profileProblems({ profile: TODAY, programs: PROGRAMS, fileDigests: {} }).some((x) => /MÉRT fájl-lenyomata/i.test(x)),
    'a MÉRT fájl-lenyomat hiánya nincs NEVEZETTEN elutasítva');
  const bad3 = { ...TODAY, programs: [...TODAY.programs, 'r53'] };
  say('PRF08', profileProblems({ profile: bad3, programs: PROGRAMS, fileDigests: TODAY_FILES }).some((x) => /ISMÉTLŐDŐ/i.test(x)),
    'az ISMÉTLŐDŐ program nincs NEVEZETTEN elutasítva');
  // (c) A LENYOMAT TARTALMI: egy MEGVÁLTOZOTT adaptált fájl ÚJ profil-lenyomatot ad
  const other = { ...TODAY_FILES, r57a: hex(64, 'mas-r57a') };
  say('PRF08', profileDigest({ profile: TODAY, programs: PROGRAMS, fileDigests: other }) !== TODAY_DIGEST,
    'az adaptált fájl megváltozása NEM ad új profil-lenyomatot — a kötés nem tartalmi');
}

rmSync(join(tmpdir(), 'prf-nonexistent'), { recursive: true, force: true });
console.log('='.repeat(96));
console.log(`${PROFILE_CONTRACT} PROFIL-KAPU (PRF01–PRF08) v${PROFILE_CONTRACT_VERSION}`);
console.log(`  MAI:        ${profileLine({ profile: TODAY, programs: PROGRAMS, fileDigests: TODAY_FILES })}`);
console.log(`  TÖRTÉNETI:  ${profileLine({ profile: HIST, programs: PROGRAMS, fileDigests: HIST_FILES })}`);
console.log('  AMIT EZ NEM ÁLLÍT: nem termékelfogadás, és a működő saját futtató zöldje NEM független');
console.log('  AI-review — a profil KEZELÉSÉT méri (R202 §3).');
console.log('='.repeat(96));
for (const p of problems) console.log(`FAIL ${p}`);
console.log(`RESULT: ${count - problems.length}/${count} PASS${problems.length ? ` — ${problems.length} FAIL` : ''}`);
process.exit(problems.length ? 1 : 0);
