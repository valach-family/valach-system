#!/usr/bin/env node
/** EXS-01 ŐR — A PROGRAMONKÉNT FOLYTATHATÓ MÉRÉSI SOROZAT KAPUJA (R194 §2 · R196 §1).
 *
 * HÁROM MÓD, ÉS A HÁROM KILÉPÉSI KÓD NEM KEVERHETŐ ÖSSZE (R196 §1):
 *
 *   (alap)        A CÉLZOTT ELLENPRÓBÁK — szintetikus bemeneten, tiszta függvényen, valódi futás
 *                 nélkül (`KUKA-207`), a VISELKEDÉST hívva, nem a forrás szövegét (`KUKA-239`).
 *                 Kilépés: 0 = minden ellenpróba tüzel · 1 = valamelyik NEM fogta meg a visszacsúszást.
 *
 *   --aggregate   ÁLLAPOTLEKÉRDEZÉS a lemezen álló sorozatokról. NEM elfogadási kapu: megmondja,
 *                 mi van, és azt is, hogy ELFOGADVA-e — de a sorozat pirossága NEM a saját
 *                 kilépési kódja. Kilépés: 0/1 a SZINTETIKUS próbákból.
 *
 *   --gate        ELFOGADÁSI KAPU: a lemezen álló sorozat csak akkor zöld, ha TELJES, HORGONYZOTT,
 *                 a MA itt álló forrásról szól és minden rekordja érvényes és zöld.
 *                 Kilépés: 0 = elfogadva · 1 = a SZINTETIKUS próba bukott · 3 = a SOROZAT nem
 *                 fogadható el. A 3 szándékosan MÁS, mint az 1: a két bukás KÉT KÜLÖN TÉNY.
 *
 * MIÉRT KELLETT SZÉTVÁLASZTANI. Az R195-ös alak `--aggregate` módban KIÍRTA, hogy a sorozat „NEM
 * ZÖLD", de a process kilépési kódja CSAK a szintetikus próbákból jött — tehát a piros sorozat
 * mellett a parancs 0-val tért vissza. Ugyanaz a hiba-osztály, mint az R195 harmadik saját lelete
 * (a `| tail -1` csővezeték elnyelte az őr kilépési kódját): a JEL NE LEGYEN MÁS MECHANIZMUSSAL IS
 * KIELÉGÍTHETŐ, MINT AMIT VIZSGÁL (`KUKA-012` · `KUKA-207` · `KUKA-239`).
 *
 * ÉS AMIT EZ KIMONDOTTAN NEM ÁLLÍT (R194 §2 utolsó sora): *„Szintetikus összesítőpróba nem
 * termékelfogadás."* Ez az őr a BIZONYÍTÉK-KEZELÉST méri — azt, hogy hiányos, idegen vagy piszkos
 * forrású bizonyítékból ne lehessen teljes verdikt. A termékről semmit nem mond.
 */
import { readFileSync, readdirSync, existsSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { PROGRAMS } from '../v3ref/external-checks/case-manifest.mjs';
import { batteryUnits, unitPlan, UNIT_BUDGET_MS, EXTERNAL_CAP_MS } from '../v3ref/external-checks/batteryUnits.mjs';
import { MUTATIONS } from '../v3ref/mutations.mjs';
import { liveBinding } from '../v3ref/external-checks/seriesBinding.mjs';
import {
  SERIES_CONTRACT, BINDING_ANCHOR_FILE, configDigest, seriesId, makeRecord, makeAnchor,
  verifySeries, classify, classifyFacts, tally, evidenceDigest,
} from '../v3ref/external-checks/seriesLedger.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HERE = join(ROOT, 'v3ref/external-checks');
const problems = [];
const say = (id, ok, msg) => { if (!ok) problems.push(`${id}: ${msg}`); };

/**
 * A BELSŐ FUTÁS (EXS14) CSAK A MÓD-SZERZŐDÉST MÉRI — ÉS EZT KI KELL MONDANI.
 *
 * Az EXS14 valódi folyamatot indít, hogy a KILÉPÉSI KÓDOT megmérhesse. Ha a belső folyamat a
 * szintetikus ellenpróbákat is lefuttatná és azokból lépne ki, akkor BÁRMELY más javítás
 * visszacsúszása is elrontaná az EXS14-et — tehát az EXS14 állítása MÁS MECHANIZMUSSAL IS
 * kielégíthető (illetve sérthető) lenne, mint amit vizsgál. Pontosan ez az a hiba-osztály, amit az
 * R195 három saját lelete kimondott (`KUKA-207` · `KUKA-239` · `KUKA-012`).
 *
 * MÉRVE: a javítás előtt a nyolc visszacsúsztatásos ellenpróbából NYOLCBAN tüzelt az EXS14 is,
 * holott csak EGY szólt róla. Ezért a belső futás a szintetikus próbákból NEM lép ki: a kilépési
 * kódja kizárólag a mód-szerződésé (állapotlekérdezés vs. elfogadási kapu).
 */
const INNER = Boolean(process.env.VS_EXS14_INNER);
const MODE_AGGREGATE = process.argv.includes('--aggregate');
const MODE_GATE = process.argv.includes('--gate');
const seriesBaseArg = (() => {
  const i = process.argv.indexOf('--series-base');
  return i >= 0 ? process.argv[i + 1] : null;
})();

// ── A FIXTÚRA: egy ÉP sorozat ÉS a hozzá tartozó KÖTÉS-HORGONY ───────────────────────────────────
//
// A LENYOMATOK VALÓDI ALAKÚAK, és ez nem kozmetika (R196 §1). Az R195-ös fixtúra `'pd0'` · `'rd0'` ·
// `'ev-<id>'` alakú helyőrzőket használt — azokkal a „valódi lenyomat" mércéjét nem lehetett volna
// megmérni, mert a próba maga sem adott valódi lenyomatot. Ami nem valódi alakú, azt a kapu
// elutasítja, tehát a FIXTÚRÁNAK is azt kell adnia, amit az éles futtató ad.
const hex = (n, seed) => createHash('sha256').update(String(seed)).digest('hex').slice(0, n);
const CFG = configDigest({ battery_units: 64, unit_plan: [64, 253], unit_budget_ms: 12_000, external_cap_ms: 15_000, node: process.version });
const BINDING = {
  bundle_digest: hex(64, 'r196-fixture-bundle'),
  programs_digest: hex(64, 'r196-fixture-manifest'),
  runner_digest: hex(64, 'r196-fixture-runner'),
  config_digest: CFG,
  clean: true,
};
const PROV = { commit: hex(40, 'r196-fixture-commit') };
const ANCHOR = makeAnchor({ binding: BINDING, provenance: PROV, programs: PROGRAMS.map((p) => p.id), recorded_by: 'fixtúra' });
const EV = (id) => hex(64, `r196-evidence-${id}`);
const recFor = (p, over = {}) => ({
  ...makeRecord({
    binding: BINDING,
    provenance: PROV,
    program: { id: p.id, digest: hex(64, `dg-${p.id}`) },
    exit: 0,
    ok: true,
    cases: (p.cases || []).map((id) => ({ id, pass: true })),
    evidence_digest: EV(p.id),
  }),
  ...over,
});
const fullSet = () => PROGRAMS.map((p) => recFor(p));
// A LEMEZEN ÁLLÓ RÉSZLETES BIZONYÍTÉK ÚJRASZÁMOLT lenyomatai — az ÉP esetben egyezők.
const fullDigests = () => new Map(PROGRAMS.map((p) => [p.id, EV(p.id)]));
// Az ÉP kötés egyben az ÉLŐ állapot is: a fixtúra-sorozat „mai".
const LIVE = { ...BINDING };

// ── EXS01 — A TELJES, EGYEZŐ, HORGONYZOTT KÉSZLET ELFOGADVA (pozitív kontroll — KUKA-122) ────────
{
  const { verdict, problems: pr, anchorIssues, freshness } = verifySeries({
    records: fullSet(), programs: PROGRAMS, expected: ANCHOR, live: LIVE, evidenceDigests: fullDigests(),
  });
  say('EXS01', pr.length === 0, `az ÉP sorozat leleteket adott: ${pr.slice(0, 3).join(' · ')}`);
  say('EXS01', anchorIssues.length === 0, `az ÉP HORGONY leleteket adott: ${anchorIssues.slice(0, 2).join(' · ')}`);
  say('EXS01', freshness.length === 0, `az ÉP sorozat nem „mai"-nak látszik: ${freshness.join(' · ')}`);
  say('EXS01', verdict.complete === true && verdict.ok === true && verdict.accepted === true,
    `az ÉP, teljes, horgonyzott sorozat nem lett ELFOGADVA: ${JSON.stringify(verdict).slice(0, 200)}`);
  say('EXS01', verdict.of === PROGRAMS.length && verdict.measured === PROGRAMS.length,
    `a számlálás hibás: of=${verdict.of} measured=${verdict.measured} (várt ${PROGRAMS.length})`);
}

// ── EXS02 — HIÁNYZÓ PROGRAM: folytathatóan részleges, de NEM teljes verdikt (KUKA-206) ───────────
{
  const recs = fullSet().slice(0, PROGRAMS.length - 1);
  const { verdict } = verifySeries({ records: recs, programs: PROGRAMS, expected: ANCHOR, live: LIVE, evidenceDigests: fullDigests() });
  say('EXS02', verdict.complete === false && verdict.ok === false && verdict.accepted === false,
    `a hiányzó program MÉGIS teljes verdiktet adott: ${JSON.stringify(verdict).slice(0, 180)}`);
  say('EXS02', verdict.missing.length === 1 && verdict.missing[0] === PROGRAMS[PROGRAMS.length - 1].id,
    `a hiányzó program nincs MEGNEVEZVE: ${JSON.stringify(verdict.missing)}`);
  say('EXS02', /folytathat/i.test(verdict.why),
    'a részleges sorozat nem mondja ki, hogy FOLYTATHATÓ (a következő kör nem tudná, mit tehet)');
}

// ── EXS03 — ELTÉRŐ COMMIT, UGYANAZON SOROZAT-AZONOSÍTÓ ALATT ────────────────────────────────────
//
// MIÉRT ÍGY, ÉS NEM EGYSZERŰEN „más commit". Az első alakom egy olyan rekordot tett be, aminek a
// commitja ÉS a sorozatazonosítója is más volt, az állítás pedig a KETTŐ KÖZÜL BÁRMELYIK nevezett
// mondatát elfogadta. Ellenpróbán MÉRVE ez NEM fogta meg a visszacsúszást: amikor a commit-egyezés
// ellenőrzését kikapcsoltam, a SOROZAT-ellenőrzés még tüzelt, tehát a próba zölden állt egy olyan
// kapun, ami a forrás-egyezést már nem mérte. A két ellenőrzést ezért KÜLÖN-KÜLÖN kell mérni.
{
  const recs = fullSet();
  recs[3] = recFor(PROGRAMS[3], { binding: { ...BINDING, bundle_digest: hex(64, 'r196-idegen-forras') } });
  const { verdict, problems: pr } = verifySeries({ records: recs, programs: PROGRAMS, expected: ANCHOR, live: LIVE, evidenceDigests: fullDigests() });
  say('EXS03', verdict.ok === false, 'az ELTÉRŐ MÉRT FORRÁSÚ rekord MÉGIS teljes verdiktbe került');
  say('EXS03', pr.some((x) => /KÜLÖNBÖZŐ forrásból/i.test(x)),
    `az eltérő MÉRT FORRÁS nincs NEVEZETTEN elutasítva (a sorozatazonosító egyezett): ${pr.slice(0, 3).join(' · ')}`);
}

// ── EXS03b — ELTÉRŐ SOROZAT-AZONOSÍTÓ, UGYANAZON commit alatt ───────────────────────────────────
{
  const recs = fullSet();
  recs[4] = recFor(PROGRAMS[4], { series: 'sIDEGEN00000' });
  const { verdict, problems: pr } = verifySeries({ records: recs, programs: PROGRAMS, expected: ANCHOR, live: LIVE, evidenceDigests: fullDigests() });
  say('EXS03b', verdict.ok === false, 'az IDEGEN sorozatú rekord MÉGIS teljes verdiktbe került');
  say('EXS03b', pr.some((x) => /KÜLÖNBÖZŐ sorozatból/i.test(x)),
    `az eltérő SOROZAT nincs NEVEZETTEN elutasítva (a commit egyezett): ${pr.slice(0, 3).join(' · ')}`);
  // ÉS AZ ÚJRASZÁMOLÁS KÜLÖN JEL (R196 §1): a `series` mező ÁLLÍTÁS, a kötésből számolva más.
  say('EXS03b', pr.some((x) => /ÚJRASZÁMOLVA/i.test(x)),
    `a sorozatazonosító nincs a kötésből ÚJRASZÁMOLVA — egyöntetűen hamisított azonosítót nem fogna meg: ${pr.slice(0, 3).join(' · ')}`);
}

// ── EXS04 — ELTÉRŐ KONFIGURÁCIÓ: ugyanaz a commit ÉS sorozat, más darabolás ─────────────────────
{
  const otherCfg = configDigest({ battery_units: 11, unit_plan: [11, 253], unit_budget_ms: 12_000, external_cap_ms: 15_000, node: process.version });
  const recs = fullSet();
  recs[5] = recFor(PROGRAMS[5], { binding: { ...BINDING, config_digest: otherCfg } });
  const { verdict, problems: pr } = verifySeries({ records: recs, programs: PROGRAMS, expected: ANCHOR, live: LIVE, evidenceDigests: fullDigests() });
  say('EXS04', verdict.ok === false, 'az eltérő KONFIGURÁCIÓJÚ rekord MÉGIS teljes verdiktbe került');
  say('EXS04', pr.some((x) => /KÜLÖNBÖZŐ konfigurációval/i.test(x)),
    `az eltérő KONFIGURÁCIÓ nincs NEVEZETTEN elutasítva (commit és sorozat egyezett): ${pr.slice(0, 3).join(' · ')}`);
}

// ── EXS05 — DUPLIKÁTUM: nem dönthető el, melyik az érvényes ──────────────────────────────────────
{
  const recs = [...fullSet(), recFor(PROGRAMS[0], { ok: false, exit: 1 })];
  const { verdict, problems: pr } = verifySeries({ records: recs, programs: PROGRAMS, expected: ANCHOR, live: LIVE, evidenceDigests: fullDigests() });
  say('EXS05', verdict.ok === false, 'a DUPLIKÁLT rekord MÉGIS teljes verdiktet adott');
  say('EXS05', pr.some((x) => /DUPLIKÁLT rekord/i.test(x)),
    `a duplikátum nincs NEVEZETTEN elutasítva: ${pr.slice(0, 3).join(' · ')}`);
}

// ── EXS06 — MEGSZAKADT / SÉRÜLT FÁJL: a hiányos rekord nem bizonyíték ────────────────────────────
{
  for (const [nev, over] of [
    ['nincs kilépési állapot', { exit: null }],
    ['nincs bizonyíték-lenyomat', { evidence_digest: '' }],
    ['nincs kötés', { binding: undefined }],
    ['idegen szerződés', { contract: 'MAS-01' }],
    ['csonkolt eset-lista', { cases: [] }],
  ]) {
    const recs = fullSet();
    recs[1] = recFor(PROGRAMS[1], over);
    const { verdict, problems: pr } = verifySeries({ records: recs, programs: PROGRAMS, expected: ANCHOR, live: LIVE, evidenceDigests: fullDigests() });
    say('EXS06', verdict.ok === false && pr.length > 0,
      `a(z) „${nev}" alakú rekord MÉGIS átment: ${JSON.stringify(verdict).slice(0, 120)}`);
  }
  // ÉS A NEM-OBJEKTUM (üres vagy félbeírt fájl) sem dőlhet el némán.
  const recs = fullSet(); recs[2] = 'nem objektum';
  const { problems: pr } = verifySeries({ records: recs, programs: PROGRAMS, expected: ANCHOR, live: LIVE, evidenceDigests: fullDigests() });
  say('EXS06', pr.some((x) => /sérült vagy megszakadt/i.test(x)),
    'a megszakadt fájl nincs NEVEZETTEN elutasítva');
}

// ── EXS07 — A VALÓS BUKÁS TOVÁBBADVA, és a korábbi siker NEM fedi el (R194 §2) ───────────────────
{
  const last = PROGRAMS[PROGRAMS.length - 1];
  const recs = fullSet();
  recs[recs.length - 1] = recFor(last, {
    ok: false, exit: 1, failure_kind: 'content',
    cases: (last.cases || []).map((id, i) => ({ id, pass: i !== 0 })),
  });
  const { verdict } = verifySeries({ records: recs, programs: PROGRAMS, expected: ANCHOR, live: LIVE, evidenceDigests: fullDigests() });
  say('EXS07', verdict.complete === true, 'a készlet teljes, mégsem annak látszik');
  say('EXS07', verdict.ok === false && verdict.accepted === false && verdict.failed === 1,
    `a VALÓS bukást a sorozat elfedte: ${JSON.stringify(verdict).slice(0, 180)}`);
  say('EXS07', verdict.green === PROGRAMS.length - 1,
    `a zöldek számlálása hibás: ${verdict.green} (várt ${PROGRAMS.length - 1})`);
}

// ── EXS08 — A KATEGÓRIÁK HATÁRAI, ÉS A KÉT TÉNY KÜLÖN (R194 §Döntés · R196 §1) ──────────────────
{
  say('EXS08', classify(null) === 'el_nem_indult', 'a rekord NÉLKÜLI program nem „el nem indult"');
  say('EXS08', classify({ ok: true }) === 'sikeres', 'a zöld rekord nem „sikeres"');
  say('EXS08', classify({ ok: false, failure_kind: 'content', cases: [{ id: 'A', pass: false }, { id: 'B', pass: true }] }, ['A', 'B']) === 'tartalmi_hibas',
    'a lefutott, de bukott elvárt eset nem „tartalmi hibás"');
  say('EXS08', classify({ ok: false, failure_kind: 'too_slow' }) === 'hianyos_meresu',
    'az IDŐ miatti bukás nem „hiányos mérésű" — pedig nem tudjuk, mit mondana a program');
  /**
   * A HATÁR, AMIT AZ `r83core` FUTÁSA ÉLESÍTETT (R194 §3): sok bukott eset, de MIND a manifeszten
   * KÍVÜLI diagnosztika, miközben az ELVÁRT esetek el sem indultak. Ez HIÁNYOS MÉRÉS, nem
   * termék-lelet — és ezt az R196 javítása sem írhatja felül.
   */
  const r83 = {
    ok: false,
    failure_kind: 'assertion_failure',
    cases: Array.from({ length: 131 }, (_, i) => ({ id: `merge/KORNYEZET-${i + 3}`, pass: false })),
  };
  const r83want = ['merge/P01-genuine', 'merge/F01-missing-probe-status'];
  say('EXS08', classify(r83, r83want) === 'hianyos_meresu',
    'a manifeszten KÍVÜLI diagnosztika-áradat „tartalmi hibának" számít, pedig az ELVÁRT esetek el sem '
    + 'indultak — ez termék-leletet állítana ott, ahol a MÉRÉS maradt hiányos (KUKA-206)');
  const r83f = classifyFacts(r83, r83want);
  say('EXS08', r83f.content_failure === false && r83f.unexpected_cases.length === 131,
    `a NEM VÁRT diagnosztikából termékhiba lett: ${JSON.stringify({ c: r83f.content_failure, u: r83f.unexpected_cases.length })}`);
  say('EXS08', classify({ ok: false, env_skipped: true }) === 'kornyezeti_kihagyas',
    'a nevezett környezeti kihagyás „sikeres"-nek számít — pedig zöld bizonyítékot NEM ad (KUKA-089)');
  const t = tally({ byId: new Map(), programs: PROGRAMS });
  say('EXS08', t.el_nem_indult.length === PROGRAMS.length,
    `üres sorozatnál nem mind „el nem indult": ${JSON.stringify(Object.keys(t).map((k) => [k, Array.isArray(t[k]) ? t[k].length : '-']))}`);
}

// ── EXS09 — A CHATGPT-V3 KÉT MÉRT LELETE (R196 §1) — SZÓ SZERINT A JELENTETT BEMENETEKKEL ───────
//
// Ez a kör NEM a leletek újrafogalmazása, hanem a REGRESSZIÓJUK: a két bemenet ugyanaz, mint amit a
// külső fél izolált Node-futtatásban mért a `0d5ee24` fejen. Ha a javítás visszacsúszik, ITT pirosodik.
{
  // (a) PISZKOS forrás + HIÁNYZÓ érdemi lenyomatok → az R195-ös alak `complete:true · ok:true · green:1`-et adott.
  const programs = [{ id: 'p', cases: ['c'] }];
  const rossz = makeRecord({
    binding: { bundle_digest: '', clean: false, config_digest: 'cfg', programs_digest: '', runner_digest: '' },
    provenance: { commit: 'a'.repeat(40) },
    program: { id: 'p', digest: '' }, exit: 0, ok: true, cases: [{ id: 'c', pass: true }], evidence_digest: 'unverified',
  });
  const r = verifySeries({ records: [rossz], programs });
  say('EXS09a', r.verdict.ok === false && r.verdict.accepted === false && r.verdict.green === 0,
    `a PISZKOS forrású, kitalált lenyomatú EGYÖNTETŰ készlet MÉGIS teljes bizonyíték: ${JSON.stringify(r.verdict).slice(0, 200)}`);
  say('EXS09a', r.anchorIssues.some((x) => /NINCS ELVÁRT KÖTÉS/i.test(x)),
    `a HORGONY hiánya nincs NEVEZVE — a várt érték így a vizsgált rekordokból keletkezne: ${r.anchorIssues.join(' · ')}`);
  say('EXS09a', r.problems.some((x) => /PISZKOS forrásra mutat/i.test(x)),
    `a PISZKOS FORRÁS nincs NEVEZETTEN elutasítva: ${r.problems.slice(0, 4).join(' · ')}`);
  say('EXS09a', r.problems.some((x) => /bizonyíték-lenyomat nem valódi/i.test(x)),
    `az "unverified" szó lenyomatként átment — a „nem üres" nem mérce: ${r.problems.slice(0, 4).join(' · ')}`);
  say('EXS09a', r.problems.some((x) => /MANIFESZT-lenyomata nem valódi/i.test(x)) && r.problems.some((x) => /FUTTATÓ-lenyomata nem valódi/i.test(x)),
    `a HIÁNYZÓ manifeszt-/futtató-lenyomat nincs NEVEZVE: ${r.problems.slice(0, 5).join(' · ')}`);
  say('EXS09a', r.problems.some((x) => /MÉRT FORRÁS-lenyomata nem valódi/i.test(x)),
    `a HIÁNYZÓ mért forrás-lenyomat nincs NEVEZVE: ${r.problems.slice(0, 6).join(' · ')}`);

  // (b) A LEFEDETTSÉGI HIÁNY MÖGÜL A TARTALMI BUKÁS NEM TŰNHET EL.
  const f = classifyFacts({ ok: false, cases: [{ id: 'c', pass: false }] }, ['c', 'd']);
  say('EXS09b', f.coverage_gap === true && f.missing_cases.join() === 'd',
    `a lefedettségi hiány elveszett: ${JSON.stringify(f)}`);
  say('EXS09b', f.content_failure === true && f.failed_cases.join() === 'c',
    `a LEFUTOTT és BUKOTT eset ténye elveszett a lefedettségi hiány mögött: ${JSON.stringify(f)}`);
  say('EXS09b', f.category === 'hianyos_es_tartalmi_hibas',
    `a két tény EGY kategóriába olvadt, és az egyik elhallgatódott: ${f.category}`);
}

// ── EXS10 — EGYÖNTETŰEN IDEGEN KÉSZLET: minden rekord UGYANARRÓL az idegen forrásról ─────────────
//
// EZ AZ A RÉS, AMIT AZ R195 NEM FOGOTT MEG: a rekordok EGYMÁSSAL egyeztek, tehát L1 átengedte őket.
// A horgony (L2) és az élő állapot (L3) az, ami most kimondja, hogy ez nem a mi mérésünk.
{
  const idegen = { ...BINDING, bundle_digest: hex(64, 'r196-teljesen-idegen') };
  const recs = PROGRAMS.map((p) => ({
    ...makeRecord({
      binding: idegen, provenance: PROV, program: { id: p.id, digest: hex(64, `dg-${p.id}`) }, exit: 0, ok: true,
      cases: (p.cases || []).map((id) => ({ id, pass: true })), evidence_digest: EV(p.id),
    }),
  }));
  const r = verifySeries({ records: recs, programs: PROGRAMS, expected: ANCHOR, live: LIVE, evidenceDigests: fullDigests() });
  say('EXS10', r.verdict.accepted === false,
    `az EGYÖNTETŰEN IDEGEN forrású készlet ELFOGADVA — pedig egyik rekordja sem a horgony forrásáról szól: ${JSON.stringify(r.verdict).slice(0, 180)}`);
  say('EXS10', r.problems.some((x) => /nem az ELVÁRT/i.test(x)),
    `az idegen kötés nincs a HORGONYHOZ mérve (a rekordok egymással egyeztek): ${r.problems.slice(0, 3).join(' · ')}`);
  // ÉS A TÖRTÉNETI KÉSZLET: ugyanez a készlet a SAJÁT horgonyával teljes — de nem MAI eredmény.
  const sajatHorgony = makeAnchor({ binding: idegen, provenance: PROV, programs: PROGRAMS.map((p) => p.id) });
  const h = verifySeries({ records: recs, programs: PROGRAMS, expected: sajatHorgony, live: LIVE, evidenceDigests: fullDigests() });
  say('EXS10', h.verdict.ok === true && h.verdict.accepted === false && h.verdict.fresh === false,
    `a TÖRTÉNETI (saját forrásáról szóló) teljes készlet MAI eredménynek számít: ${JSON.stringify(h.verdict).slice(0, 180)}`);
  say('EXS10', h.freshness.some((x) => /TÖRTÉNETI/i.test(x)),
    `a történeti készlet nincs NEVEZETTEN annak mondva: ${h.freshness.join(' · ')}`);
}

// ── EXS11 — MEGHAMISÍTOTT / HIÁNYZÓ RÉSZLETES BIZONYÍTÉK ────────────────────────────────────────
{
  // (a) A rekord lenyomata NEM egyezik a lemezen álló fájl ÚJRASZÁMOLT lenyomatával.
  const d = fullDigests();
  d.set(PROGRAMS[2].id, hex(64, 'r196-mas-fajl'));
  const a = verifySeries({ records: fullSet(), programs: PROGRAMS, expected: ANCHOR, live: LIVE, evidenceDigests: d });
  say('EXS11', a.verdict.accepted === false && a.verdict.ok === false,
    'a MEGHAMISÍTOTT részletes bizonyíték (más fájl ugyanazzal a rekorddal) ELFOGADVA');
  say('EXS11', a.problems.some((x) => /a részletes bizonyíték MÁS/i.test(x)),
    `a lenyomat-eltérés nincs NEVEZVE — a rekord saját állítását fogadtuk el: ${a.problems.slice(0, 3).join(' · ')}`);
  // (b) A részletes bizonyíték-fájl NINCS MEG.
  const d2 = fullDigests(); d2.delete(PROGRAMS[2].id);
  const b = verifySeries({ records: fullSet(), programs: PROGRAMS, expected: ANCHOR, live: LIVE, evidenceDigests: d2 });
  say('EXS11', b.verdict.accepted === false,
    'a HIÁNYZÓ részletes bizonyíték-fájl mellett a sorozat ELFOGADVA');
  say('EXS11', b.problems.some((x) => /NEM TALÁLHATÓ/i.test(x)),
    `a hiányzó bizonyíték-fájl nincs NEVEZVE: ${b.problems.slice(0, 3).join(' · ')}`);
  // (c) ÉS AZ ÉRVÉNYTELEN REKORD NEM „SIKERES" — a kategória-számok csak érvényeset nevezhetnek zöldnek.
  const t = tally({ byId: a.byId, programs: PROGRAMS, invalidById: a.invalidById });
  say('EXS11', !t.sikeres.includes(PROGRAMS[2].id) && t.ervenytelen_rekord.includes(PROGRAMS[2].id),
    `a hamisított bizonyítékú rekord „sikeres"-nek számolódott: ${JSON.stringify({ s: t.sikeres.length, e: t.ervenytelen_rekord })}`);
}

// ── EXS12 — A HELYES TELJES KÉSZLET (pozitív kontroll, a horgonnyal és a frissességgel) ─────────
{
  const r = verifySeries({ records: fullSet(), programs: PROGRAMS, expected: ANCHOR, live: LIVE, evidenceDigests: fullDigests() });
  const t = tally({ byId: r.byId, programs: PROGRAMS, invalidById: r.invalidById });
  say('EXS12', r.verdict.accepted === true && r.verdict.anchored === true && r.verdict.fresh === true,
    `a HELYES teljes készlet nem lett elfogadva: ${JSON.stringify(r.verdict).slice(0, 200)}`);
  say('EXS12', t.sikeres.length === PROGRAMS.length,
    `a helyes teljes készletben nem mind „sikeres": ${JSON.stringify(Object.entries(t).filter(([k, v]) => Array.isArray(v) && v.length).map(([k, v]) => [k, v.length]))}`);
}

// ── EXS13 — ÉRVÉNYES HIÁNYOS KÉSZLET: folytathatóan részleges, de NEM hibás ──────────────────────
{
  const recs = fullSet().slice(0, 2);
  const d = new Map([[PROGRAMS[0].id, EV(PROGRAMS[0].id)], [PROGRAMS[1].id, EV(PROGRAMS[1].id)]]);
  const r = verifySeries({ records: recs, programs: PROGRAMS, expected: ANCHOR, live: LIVE, evidenceDigests: d });
  const t = tally({ byId: r.byId, programs: PROGRAMS, invalidById: r.invalidById });
  say('EXS13', r.problems.length === 0,
    `az ÉRVÉNYES hiányos készlet rekord-leletet adott — pedig a hiány nem hiba: ${r.problems.slice(0, 3).join(' · ')}`);
  say('EXS13', r.verdict.accepted === false && r.verdict.complete === false,
    `a hiányos készlet ELFOGADVA: ${JSON.stringify(r.verdict).slice(0, 180)}`);
  say('EXS13', t.sikeres.length === 2 && t.el_nem_indult.length === PROGRAMS.length - 2,
    `a hiányos készlet kategória-számai hibásak: sikeres=${t.sikeres.length} el_nem_indult=${t.el_nem_indult.length}`);
  say('EXS13', t.ervenytelen_rekord.length === 0 && t.tartalmi_hibas.length === 0,
    'a hiányos készlet két ÉRVÉNYES rekordja hibásnak számolódott — a hiány nem tartalmi lelet');
}

// ── EXS14 — A KILÉPÉSI KÓDOK SZÉTVÁLASZTVA, MÉRVE (R196 §1) ─────────────────────────────────────
//
// MIÉRT KELL IDE VALÓDI FOLYAMAT. Az állítás tárgya maga a CLI-szerződés: hogy a SZINTETIKUS próba
// zöldje és a SOROZAT pirosa KÉT KÜLÖN kilépési kód. Ezt függvényhívásból nem lehet megmérni — a
// kilépési kódot csak egy valódi folyamat adja (ez az R195 harmadik saját leletének tanulsága:
// a `| tail -1` pont azért tudta elnyelni a pirosat, mert a kódot senki nem MÉRTE).
if (!process.env.VS_EXS14_INNER) {
  const tmp = mkdtempSync(join(tmpdir(), 'exs14-'));
  const run = (args) => spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...args], {
    encoding: 'utf8', timeout: 60_000, env: { ...process.env, VS_EXS14_INNER: '1' },
  });
  try {
    // (a) PIROS sorozat (horgony nélküli, egyetlen rekord) — az ÁLLAPOTLEKÉRDEZÉS 0, a KAPU 3.
    const red = join(tmp, 'red', 'sRED');
    mkdirSync(red, { recursive: true });
    writeFileSync(join(red, `${PROGRAMS[0].id}.json`), JSON.stringify(recFor(PROGRAMS[0])));
    const agg = run(['--aggregate', '--series-base', join(tmp, 'red')]);
    const gate = run(['--gate', '--series-base', join(tmp, 'red')]);
    say('EXS14', agg.status === 0,
      `az ÁLLAPOTLEKÉRDEZÉS (--aggregate) a piros sorozatra ${agg.status}-cal tért vissza — `
      + 'pedig nem elfogadási kapu, és a szintetikus próbák zöldek');
    say('EXS14', gate.status === 3,
      `az ELFOGADÁSI KAPU (--gate) a piros sorozatra ${gate.status}-cal tért vissza (várt: 3) — `
      + 'a sorozat pirosa és a szintetikus bukás (1) NEM lehet ugyanaz a kód');
    say('EXS14', /ELFOGADVA:\s*NEM/i.test(agg.stdout),
      'az állapotlekérdezés nem mondja ki GÉPILEG, hogy ELFOGADVA: NEM');
    say('EXS14', /ÁLLAPOTLEKÉRDEZÉS/i.test(agg.stdout) && /NEM elfogadási kapu/i.test(agg.stdout),
      'az --aggregate nem mondja ki a SAJÁT szerepét (státuszlekérdezés, nem kapu)');
    // (b) ÜRES sorozat-könyvtár: a KAPU nem lehet zöld attól, hogy nincs mit elutasítani (KUKA-051).
    const empty = join(tmp, 'empty');
    mkdirSync(empty, { recursive: true });
    const gateEmpty = run(['--gate', '--series-base', empty]);
    say('EXS14', gateEmpty.status === 3,
      `az ELFOGADÁSI KAPU ÜRES sorozat-könyvtárra ${gateEmpty.status}-cal tért vissza (várt: 3) — `
      + 'a „nincs mit mérni" nem zöld (KUKA-051)');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ── EXS16 — A SOROZAT TÚLÉLI A SAJÁT BIZONYÍTÉKA COMMITOLÁSÁT (R196 §1, SAJÁT lelet) ────────────
//
// A LELET, MÉRVE. Az első alakomban a `commit` is az AZONOSSÁG része volt. Amikor a 12 programos
// sorozat SAJÁT bizonyítékát commitoltam (`1f42ae6` → `661f22f`), a commit **nulla** mért
// forrás-fájlt érintett — csak `docs/`-ot és `results/`-ot —, a sorozat mégis azonnal `MAI: NEM`-re
// váltott. Egy horgony, ami a saját bizonyítéka közzétételét nem éli túl, SOHA nem adhat elfogadott
// sorozatot: a mechanizmus a gyakorlatban használhatatlan volt.
//
// A MÉRCE EZÉRT A MÉRT FORRÁS TARTALMA. Ez az ellenpróba pontosan azt méri, hogy egy ELTÉRŐ
// COMMIT, de AZONOS mért forrás (a) ugyanabba a sorozatba esik, (b) MAI marad, és (c) elfogadható —
// miközben az ELTÉRŐ TARTALOM továbbra is elesik (azt az EXS03/EXS10 méri).
{
  /**
   * A KÖZVETLEN MÉRCE: két kötés, ami CSAK egy `commit` mezőben tér el, UGYANAZT a sorozatot adja.
   * Ha a `commit` visszakerül az azonosságba (`canonBinding`), ez a két azonosító ELVÁLIK — és
   * pontosan ez volt a mért hiba. Ezt függvény-szinten kérdezzük, mert a shape-et méri, nem egy
   * fixtúra véletlen alakját (`KUKA-239`).
   */
  say('EXS16', seriesId({ ...BINDING, commit: 'a'.repeat(40) }) === seriesId({ ...BINDING, commit: 'b'.repeat(40) }),
    'a CSAK commitban eltérő kötés KÉT sorozatot ad — a commit visszakerült az AZONOSSÁGBA, tehát a '
    + 'sorozat nem élné túl a saját bizonyítéka commitolását (R196 §1, mérve: 1f42ae6 → 661f22f, '
    + '0 mért forrás-fájl változott, mégis MAI: NEM)');
  say('EXS16', seriesId({ ...BINDING, bundle_digest: hex(64, 'mas-forras') }) !== seriesId(BINDING),
    'az eltérő MÉRT FORRÁS ugyanazt a sorozatot adja — az azonosság elvesztette a tartalmi mércéjét');

  const prov2 = { commit: hex(40, 'r196-masodik-commit') };
  // Ugyanaz a kötés (tartalom), MÁS származás — mintha a bizonyítékot közben commitoltuk volna.
  const recs = PROGRAMS.map((p, i) => recFor(p, i % 2 === 0 ? {} : { provenance: prov2 }));
  say('EXS16', new Set(recs.map((r) => r.series)).size === 1,
    'az azonos MÉRT FORRÁSÚ, de más commitú rekordok KÜLÖN sorozatba estek — a sorozat nem élné túl a '
    + 'saját bizonyítéka commitolását');
  const r = verifySeries({ records: recs, programs: PROGRAMS, expected: ANCHOR, live: LIVE, evidenceDigests: fullDigests() });
  say('EXS16', r.problems.length === 0,
    `az eltérő COMMIT (azonos mért forrás) LELETET adott — pedig ugyanazt a mérést írja le: ${r.problems.slice(0, 3).join(' · ')}`);
  say('EXS16', r.verdict.fresh === true && r.verdict.accepted === true,
    `a sorozat a saját bizonyítéka commitolása után NEM maradt MAI/elfogadott: ${JSON.stringify(r.verdict).slice(0, 200)}`);
  say('EXS16', Array.isArray(r.verdict.provenances) && r.verdict.provenances.length === 2,
    `a KÉT származás nincs KIÍRVA (a commit nem veszhet el, csak nem azonosság): ${JSON.stringify(r.verdict.provenances)}`);
  // ÉS A HATÁR: a JELÖLT (nem könyvelt) származás továbbra is elesik.
  const dirty = PROGRAMS.map((p) => recFor(p, { provenance: { commit: `${hex(40, 'x')}+uncommitted` } }));
  const d = verifySeries({ records: dirty, programs: PROGRAMS, expected: ANCHOR, live: LIVE, evidenceDigests: fullDigests() });
  say('EXS16', d.verdict.accepted === false && d.problems.some((x) => /JELÖLT, nem könyvelt/i.test(x)),
    `a JELÖLT (nem könyvelt) származás ELFOGADVA — a commit elvesztette a saját mércéjét: ${d.problems.slice(0, 3).join(' · ')}`);
}

// ── EXS15 — A SOROZAT ÖNHORDÓ: A LENYOMAT A SAJÁT BIZONYÍTÉK-PÉLDÁNYÁBÓL (R196 §1) ──────────────
//
// MIÉRT VALÓDI FOLYAMATTAL. Az állítás tárgya az, hogy az összesítő HONNAN olvassa a részletes
// bizonyítékot — ez út-kérdés, amit csak a lemezen álló sorozaton lehet megmérni. És ez az
// ellenpróba egyben a TELJES lánc POZITÍV KONTROLLJA is: egy hibátlan, horgonyzott, mai, saját
// bizonyítékkal álló 19-program-os sorozaton a KAPU ZÖLD (kilépés 0). Ha a kapu ilyenkor sem tud
// zöld lenni, akkor a „piros" nem jelent semmit (`KUKA-122`).
if (!INNER) {
  const tmp = mkdtempSync(join(tmpdir(), 'exs15-'));
  const run = (args) => spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...args], {
    encoding: 'utf8', timeout: 60_000, env: { ...process.env, VS_EXS14_INNER: '1' },
  });
  try {
    // ÉP, TELJES sorozat: horgony + 19 rekord + a sorozat SAJÁT bizonyíték-példányai.
    const dir = join(tmp, 'ok', ANCHOR.series);
    mkdirSync(join(dir, 'evidence'), { recursive: true });
    writeFileSync(join(dir, BINDING_ANCHOR_FILE), JSON.stringify(ANCHOR, null, 2));
    for (const pr of PROGRAMS) {
      // A tartalom tetszőleges — a LENYOMAT abból SZÁMOLÓDIK, nem begépelt (KUKA-045).
      const body = JSON.stringify({ program: pr.id, cases: (pr.cases || []).map((id) => ({ id, pass: true })) });
      writeFileSync(join(dir, 'evidence', `${pr.id}.json`), body);
      writeFileSync(join(dir, `${pr.id}.json`), JSON.stringify(
        recFor(pr, { evidence_digest: evidenceDigest(Buffer.from(body)) }), null, 2));
    }
    const ok = run(['--gate', '--series-base', join(tmp, 'ok')]);
    say('EXS15', ok.status === 0,
      `az ÉP, TELJES, horgonyzott, SAJÁT bizonyítékkal álló sorozatot a KAPU elutasította `
      + `(kilépés ${ok.status}) — ha a kapu sosem lehet zöld, a pirosa sem jelent semmit:\n      `
      + String(ok.stdout || '').split('\n').filter((l) => /LELET|·/.test(l)).slice(0, 6).join('\n      '));
    say('EXS15', /ELFOGADVA: IGEN/.test(ok.stdout), 'az ÉP teljes sorozat nem mondja ki, hogy ELFOGADVA: IGEN');

    // UGYANAZ, de a sorozat SAJÁT bizonyíték-példánya NINCS MEG: a lenyomat NEM ellenőrizhető.
    // A kapu NEM eshet vissza némán a `results/` alatti, FELÜLÍRHATÓ példányra (KUKA-051).
    const bad = join(tmp, 'noev', ANCHOR.series);
    mkdirSync(bad, { recursive: true });
    writeFileSync(join(bad, BINDING_ANCHOR_FILE), JSON.stringify(ANCHOR, null, 2));
    for (const pr of PROGRAMS) {
      const body = JSON.stringify({ program: pr.id });
      writeFileSync(join(bad, `${pr.id}.json`), JSON.stringify(
        recFor(pr, { evidence_digest: evidenceDigest(Buffer.from(body)) }), null, 2));
    }
    const noev = run(['--gate', '--series-base', join(tmp, 'noev')]);
    say('EXS15', noev.status === 3,
      `a SAJÁT bizonyíték-példány nélküli teljes sorozat a kapun ÁTMENT (kilépés ${noev.status}, várt 3)`);
    say('EXS15', /NEM TALÁLHATÓ/.test(noev.stdout),
      'a hiányzó SAJÁT bizonyíték-példány nincs NEVEZVE — a kapu némán visszaeshetett a felülírható példányra');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ── A LEMEZEN ÁLLÓ SOROZATOK (--aggregate | --gate) ─────────────────────────────────────────────
let gateVerdict = null;
if (MODE_AGGREGATE || MODE_GATE) {
  const base = seriesBaseArg
    ? resolve(seriesBaseArg)
    : join(ROOT, 'v3ref/external-checks/results/series');
  // AZ ÉLŐ ÁLLAPOT A MEGOSZTOTT MÉRŐBŐL (L3) — ugyanaz a szabály, amit a futtató is hív.
  const liveFull = seriesBaseArg ? { binding: LIVE, provenance: PROV } : liveBinding({
    root: ROOT,
    here: HERE,
    configDigest: configDigest({
      battery_units: batteryUnits(),
      unit_plan: unitPlan({ startUnits: batteryUnits(), mutationCount: MUTATIONS.length }),
      unit_budget_ms: UNIT_BUDGET_MS,
      external_cap_ms: EXTERNAL_CAP_MS,
      node: process.version,
    }),
  });
  const live = liveFull.binding;
  const liveProv = liveFull.provenance || {};

  console.log('');
  console.log(MODE_GATE
    ? 'EXS-01 — ELFOGADÁSI KAPU a lemezen álló mérési sorozatokon'
    : 'EXS-01 — ÁLLAPOTLEKÉRDEZÉS a lemezen álló mérési sorozatokról (NEM elfogadási kapu)');
  console.log('='.repeat(94));
  // A KIÍRÁS A MAI KÖTÉS-ALAKOT KÖVETI (KUKA-050): az azonosság a MÉRT FORRÁS, a commit SZÁRMAZÁS.
  // Az első alakom még a kötésből kérte a commitot — ott már nincs —, és a képernyőre `undefined`
  // került. Egy felirat, ami nem igaz, nem felirat.
  // A RÖVIDÍTÉS CSAK LENYOMATOT VÁG, a nevezett hiányt NEM (különben a felirat maga lesz csonka).
  const sh = (v, hiany = 'NINCS') => (v ? `${String(v).slice(0, 12)}…` : hiany);
  console.log(`  ÉLŐ forrás (mért tartalom): ${sh(live.bundle_digest)} · tiszta: ${live.clean} · konfiguráció: ${live.config_digest}`);
  console.log(`              manifeszt ${sh(live.programs_digest)} · futtató ${sh(live.runner_digest)}`);
  console.log(`              SZÁRMAZÁS (a mai könyvelt állapot): ${sh(liveProv.commit)}`);

  const dirs = existsSync(base)
    ? readdirSync(base).filter((d) => statSync(join(base, d)).isDirectory())
    : [];
  if (!dirs.length) {
    console.log('\n  Egyetlen sorozat sincs még. A következő futás létrehozza: npm run verify:external-checks');
  }
  const accepted = [];
  for (const d of dirs) {
    const all = readdirSync(join(base, d)).filter((f) => f.endsWith('.json'));
    // A HORGONY NEM REKORD (R196 §1): ha rekordként olvasnánk be, „idegen szerződésű" leletet adna
    // magára, és a sorozat sosem lehetne zöld — a jel a SAJÁT könyvelésén bukna el (KUKA-041).
    const files = all.filter((f) => f !== BINDING_ANCHOR_FILE);
    const anchorPath = join(base, d, BINDING_ANCHOR_FILE);
    let anchor = null;
    if (existsSync(anchorPath)) {
      try { anchor = JSON.parse(readFileSync(anchorPath, 'utf8')); } catch { anchor = { contract: 'OLVASHATATLAN' }; }
    }
    const records = files.map((f) => {
      try { return JSON.parse(readFileSync(join(base, d, f), 'utf8')); } catch { return `OLVASHATATLAN: ${f}`; }
    });
    /**
     * A RÉSZLETES BIZONYÍTÉK ÚJRASZÁMOLT LENYOMATA — A SOROZAT SAJÁT PÉLDÁNYÁBÓL (R196 §1).
     *
     * MIÉRT NEM A `results/` ALÓL. Az a fájlnév FIX, tehát minden futás FELÜLÍRJA — egy
     * programonként folytatható sorozatban a korábbi programok bizonyítéka így eltűnne, és az
     * újraszámolás NEM a rekordhoz tartozó fájlt mérné. MÉRVE (R196, valódi adaton): a mai
     * `--only r61` futás után az előző sorozat `r61` rekordja azonnal eltérő lenyomatot kapott.
     * A sorozat ezért ÖNHORDÓ: a saját `evidence/` könyvtárából mérünk. Ahol az nincs (a horgony
     * bevezetése ELŐTTI sorozatok), ott a lenyomat NEM ellenőrizhető, és ezt a kapu KIMONDJA —
     * nem esik vissza némán a felülírt, megosztott példányra (`KUKA-051`).
     */
    const evidenceDigests = new Map();
    const evDir = join(base, d, 'evidence');
    for (const p of PROGRAMS) {
      const own = join(evDir, `${p.id}.json`);
      if (existsSync(own)) evidenceDigests.set(p.id, evidenceDigest(readFileSync(own)));
    }
    const { verdict, problems: pr, anchorIssues, freshness, byId, invalidById } = verifySeries({
      records, programs: PROGRAMS, expected: anchor, live, evidenceDigests,
    });
    const t = tally({ byId, programs: PROGRAMS, invalidById });
    accepted.push(verdict.accepted === true);

    console.log(`\n  SOROZAT ${d}  ·  ${records.length} rekord`);
    if (anchor && anchor.binding) {
      console.log(`    HORGONY (a futtató rögzítette ${anchor.recorded_at || '?'}): mért forrás `
        + `${sh(anchor.binding.bundle_digest, 'NINCS — a mai kötés-alak ELŐTTI horgony')}`
        + ` · tiszta: ${anchor.binding.clean} · konfiguráció: ${anchor.binding.config_digest}`);
      console.log(`             SZÁRMAZÁS: ${sh((anchor.provenance || {}).commit, '(nincs rögzítve — a mai alak előtti horgony)')}`);
    } else {
      console.log('    HORGONY: NINCS — ez a sorozat a kötés-horgony bevezetése ELŐTT készült (R196 §1).');
      console.log('             TÖRTÉNETI eredmény: a saját forrásáról beszélhet, MAI bizonyítékként nem hivatkozható.');
    }
    console.log(`    TELJES: ${verdict.complete ? 'IGEN' : 'NEM'} · HORGONYZOTT: ${verdict.anchored ? 'IGEN' : 'NEM'} · `
      + `MAI: ${verdict.fresh === null ? '?' : (verdict.fresh ? 'IGEN' : 'NEM')} · ELFOGADVA: ${verdict.accepted ? 'IGEN' : 'NEM'}`);
    console.log(`    GEPI: series=${d} complete=${verdict.complete} anchored=${verdict.anchored} fresh=${verdict.fresh} `
      + `accepted=${verdict.accepted} green=${verdict.green} failed=${verdict.failed} invalid=${verdict.invalid.length} `
      + `measured=${verdict.measured} of=${verdict.of}`);
    console.log(`    sikeres ${t.sikeres.length} · tartalmi hibás ${t.tartalmi_hibas.length} · `
      + `hiányos mérésű ${t.hianyos_meresu.length} · hiányos ÉS tartalmi hibás ${t.hianyos_es_tartalmi_hibas.length} · `
      + `környezeti kihagyás ${t.kornyezeti_kihagyas.length} · érvénytelen rekord ${t.ervenytelen_rekord.length} · `
      + `el nem indult ${t.el_nem_indult.length}  (összesen ${PROGRAMS.length})`);
    for (const k of ['tartalmi_hibas', 'hianyos_meresu', 'hianyos_es_tartalmi_hibas', 'kornyezeti_kihagyas', 'ervenytelen_rekord', 'el_nem_indult']) {
      if (t[k].length) console.log(`      ${k}: ${t[k].join(' · ')}`);
    }
    // A KÉT TÉNY PROGRAMONKÉNT — a jelentés ebből idéz, nem az egy-szavas kategóriából.
    for (const [id, f] of Object.entries(t.facts)) {
      if (f.ran && (f.coverage_gap || f.content_failure)) {
        console.log(`      ${id}: lefedettségi hiány=${f.coverage_gap}${f.missing_cases.length ? ` (${f.missing_cases.slice(0, 3).join(' · ')}${f.missing_cases.length > 3 ? ' …' : ''})` : ''}`
          + ` · tartalmi bukás=${f.content_failure}${f.failed_cases.length ? ` (${f.failed_cases.slice(0, 3).join(' · ')}${f.failed_cases.length > 3 ? ' …' : ''})` : ''}`
          + (f.unexpected_cases.length ? ` · nem várt diagnosztika: ${f.unexpected_cases.length}` : ''));
      }
    }
    if (anchorIssues.length) {
      console.log(`    A HORGONY LELETEI (${anchorIssues.length}):`);
      for (const x of anchorIssues.slice(0, 6)) console.log(`      · ${x}`);
    }
    if (freshness.length) {
      console.log('    FRISSESSÉG:');
      for (const x of freshness) console.log(`      · ${x}`);
    }
    if (pr.length) {
      console.log(`    A BIZONYÍTÉK LELETEI (${pr.length}):`);
      for (const x of pr.slice(0, 10)) console.log(`      · ${x}`);
      if (pr.length > 10) console.log(`      … és még ${pr.length - 10}`);
    }
    console.log(`    ${verdict.why}`);
  }
  gateVerdict = { any: dirs.length > 0, accepted: dirs.length > 0 && accepted.some(Boolean) };
  console.log('');
  if (MODE_GATE) {
    console.log(`ELFOGADÁSI KAPU: ${gateVerdict.accepted ? 'ZÖLD — van elfogadott, MAI, teljes sorozat' : 'PIROS — nincs elfogadható sorozat'}`);
  } else {
    console.log('ÁLLAPOTLEKÉRDEZÉS — NEM elfogadási kapu: a fenti sorozat-állapot a saját kilépési kódját NEM adja.');
    console.log('  az elfogadási kapu külön parancs:  npm run verify:external-series -- --gate   (kilépés 3, ha nem fogadható el)');
  }
}

console.log('');
console.log(`EXS-01 SOROZAT-KAPU (EXS01–EXS16, az EXS03b-vel): ${PROGRAMS.length} program · szerződés ${SERIES_CONTRACT}`);
console.log('  AMIT EZ NEM ÁLLÍT: a szintetikus összesítő-próba NEM termékelfogadás — a bizonyíték');
console.log('  KEZELÉSÉT méri, nem a terméket (R194 §2).');
if (problems.length && !INNER) {
  console.error(`\nPIROS (${problems.length}) — a SZINTETIKUS ellenpróbák:`);
  for (const p of problems) console.error(`  · ${p}`);
  process.exit(1);
}
if (problems.length && INNER) {
  // A BELSŐ FUTÁS KIMONDJA, hogy nem a szintetikus próbákból lép ki — nem némán hagyja el őket.
  console.error(`\n(belső futás: ${problems.length} szintetikus lelet NEM ebből a kilépésből szól — `
    + 'az EXS14 kizárólag a mód-szerződés kilépési kódját méri)');
}
console.log('ZÖLD — a szintetikus ellenpróbák: hiányos, duplikált, sérült, piszkos, idegen vagy horgony');
console.log('       nélküli bizonyítékból nem lesz teljes verdikt.');
if (MODE_GATE && !(gateVerdict && gateVerdict.accepted)) {
  console.error('\nA SOROZAT NEM FOGADHATÓ EL (kilépés 3) — ez MÁS tény, mint a szintetikus bukás (kilépés 1).');
  process.exit(3);
}
