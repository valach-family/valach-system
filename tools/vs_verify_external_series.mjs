#!/usr/bin/env node
/** EXS-01 ŐR — A PROGRAMONKÉNT FOLYTATHATÓ MÉRÉSI SOROZAT KAPUJA (R194 §2).
 *
 * KÉT MÓD, EGY MODULRA:
 *   (alap)        a CÉLZOTT ELLENPRÓBÁK — a kapu elutasítja a hiányzó programot, az eltérő
 *                 commitot, a duplikátumot és a megszakadt fájlt; elfogadja a teljes, egyező
 *                 készletet; és TOVÁBBADJA a valós bukást. Tiszta függvényen, valódi futás nélkül
 *                 (`KUKA-207`), és a VISELKEDÉST hívja, nem a forrás szövegét (`KUKA-239`).
 *   --aggregate   a LEMEZEN álló sorozatok összesítése: programonkénti státusz a négy kategóriában.
 *
 * ÉS AMIT EZ KIMONDOTTAN NEM ÁLLÍT (R194 §2 utolsó sora): *„Szintetikus összesítőpróba nem
 * termékelfogadás."* Ez az őr a BIZONYÍTÉK-KEZELÉST méri — azt, hogy hiányos vagy idegen
 * bizonyítékból ne lehessen teljes verdikt. A termékről semmit nem mond.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { PROGRAMS } from '../v3ref/external-checks/case-manifest.mjs';
import {
  SERIES_CONTRACT, configDigest, seriesId, makeRecord, verifySeries, classify, tally,
} from '../v3ref/external-checks/seriesLedger.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const say = (id, ok, msg) => { if (!ok) problems.push(`${id}: ${msg}`); };

// ── A FIXTÚRA: egy ÉP sorozat, amiből az ellenpárok rontanak ─────────────────────────────────────
const BINDING = {
  commit: 'a'.repeat(40),
  clean: true,
  config_digest: configDigest({ battery_units: 64, unit_plan: [64, 253], unit_budget_ms: 12_000, external_cap_ms: 15_000, node: process.version }),
  programs_digest: 'pd0',
  runner_digest: 'rd0',
};
const recFor = (p, over = {}) => ({
  ...makeRecord({
    binding: BINDING,
    program: { id: p.id, digest: `dg-${p.id}` },
    exit: 0,
    ok: true,
    cases: (p.cases || []).map((id) => ({ id, pass: true })),
    evidence_digest: `ev-${p.id}`,
  }),
  ...over,
});
const fullSet = () => PROGRAMS.map((p) => recFor(p));

// ── EXS01 — A TELJES, EGYEZŐ KÉSZLET ELFOGADVA (pozitív kontroll — KUKA-122) ─────────────────────
{
  const { verdict, problems: pr } = verifySeries({ records: fullSet(), programs: PROGRAMS });
  say('EXS01', pr.length === 0, `az ÉP sorozat leleteket adott: ${pr.slice(0, 3).join(' · ')}`);
  say('EXS01', verdict.complete === true && verdict.ok === true,
    `az ÉP, teljes sorozat nem lett elfogadva: ${JSON.stringify(verdict).slice(0, 180)}`);
  say('EXS01', verdict.of === PROGRAMS.length && verdict.measured === PROGRAMS.length,
    `a számlálás hibás: of=${verdict.of} measured=${verdict.measured} (várt ${PROGRAMS.length})`);
}

// ── EXS02 — HIÁNYZÓ PROGRAM: folytathatóan részleges, de NEM teljes verdikt (KUKA-206) ───────────
{
  const recs = fullSet().slice(0, PROGRAMS.length - 1);
  const { verdict } = verifySeries({ records: recs, programs: PROGRAMS });
  say('EXS02', verdict.complete === false && verdict.ok === false,
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
// kapun, ami a forrás-egyezést már nem mérte. A két ellenőrzést ezért KÜLÖN-KÜLÖN kell mérni —
// ugyanaz a lecke, mint a `KUKA-207`/`KUKA-239` páros: az állítás ne legyen MÁS mechanizmussal is
// kielégíthető, mint amit vizsgál.
{
  const recs = fullSet();
  // A HAMISÍTOTT rekord: a sorozatazonosító EGYEZIK, a kötésben lévő commit NEM.
  recs[3] = recFor(PROGRAMS[3], { binding: { ...BINDING, commit: 'b'.repeat(40) } });
  const { verdict, problems: pr } = verifySeries({ records: recs, programs: PROGRAMS });
  say('EXS03', verdict.ok === false, 'az ELTÉRŐ forrású rekord MÉGIS teljes verdiktbe került');
  say('EXS03', pr.some((x) => /KÜLÖNBÖZŐ forrásból/i.test(x)),
    `az eltérő COMMIT nincs NEVEZETTEN elutasítva (a sorozatazonosító egyezett): ${pr.slice(0, 3).join(' · ')}`);
}

// ── EXS03b — ELTÉRŐ SOROZAT-AZONOSÍTÓ, UGYANAZON commit alatt ───────────────────────────────────
{
  const recs = fullSet();
  recs[4] = recFor(PROGRAMS[4], { series: 'sIDEGEN00000' });
  const { verdict, problems: pr } = verifySeries({ records: recs, programs: PROGRAMS });
  say('EXS03b', verdict.ok === false, 'az IDEGEN sorozatú rekord MÉGIS teljes verdiktbe került');
  say('EXS03b', pr.some((x) => /KÜLÖNBÖZŐ sorozatból/i.test(x)),
    `az eltérő SOROZAT nincs NEVEZETTEN elutasítva (a commit egyezett): ${pr.slice(0, 3).join(' · ')}`);
}

// ── EXS04 — ELTÉRŐ KONFIGURÁCIÓ: ugyanaz a commit ÉS sorozat, más darabolás ─────────────────────
{
  const otherCfg = configDigest({ battery_units: 11, unit_plan: [11, 253], unit_budget_ms: 12_000, external_cap_ms: 15_000, node: process.version });
  const recs = fullSet();
  recs[5] = recFor(PROGRAMS[5], { binding: { ...BINDING, config_digest: otherCfg } });
  const { verdict, problems: pr } = verifySeries({ records: recs, programs: PROGRAMS });
  say('EXS04', verdict.ok === false, 'az eltérő KONFIGURÁCIÓJÚ rekord MÉGIS teljes verdiktbe került');
  say('EXS04', pr.some((x) => /KÜLÖNBÖZŐ konfigurációval/i.test(x)),
    `az eltérő KONFIGURÁCIÓ nincs NEVEZETTEN elutasítva (commit és sorozat egyezett): ${pr.slice(0, 3).join(' · ')}`);
}

// ── EXS05 — DUPLIKÁTUM: nem dönthető el, melyik az érvényes ──────────────────────────────────────
{
  const recs = [...fullSet(), recFor(PROGRAMS[0], { ok: false, exit: 1 })];
  const { verdict, problems: pr } = verifySeries({ records: recs, programs: PROGRAMS });
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
    const { verdict, problems: pr } = verifySeries({ records: recs, programs: PROGRAMS });
    say('EXS06', verdict.ok === false && pr.length > 0,
      `a(z) „${nev}" alakú rekord MÉGIS átment: ${JSON.stringify(verdict).slice(0, 120)}`);
  }
  // ÉS A NEM-OBJEKTUM (üres vagy félbeírt fájl) sem dőlhet el némán.
  const recs = fullSet(); recs[2] = 'nem objektum';
  const { problems: pr } = verifySeries({ records: recs, programs: PROGRAMS });
  say('EXS06', pr.some((x) => /sérült vagy megszakadt/i.test(x)),
    'a megszakadt fájl nincs NEVEZETTEN elutasítva');
}

// ── EXS07 — A VALÓS BUKÁS TOVÁBBADVA, és a korábbi siker NEM fedi el (R194 §2) ───────────────────
{
  const recs = fullSet();
  recs[recs.length - 1] = recFor(PROGRAMS[PROGRAMS.length - 1], {
    ok: false, exit: 1, failure_kind: 'content',
    cases: (PROGRAMS[PROGRAMS.length - 1].cases || []).map((id, i) => ({ id, pass: i !== 0 })),
  });
  const { verdict } = verifySeries({ records: recs, programs: PROGRAMS });
  say('EXS07', verdict.complete === true, 'a készlet teljes, mégsem annak látszik');
  say('EXS07', verdict.ok === false && verdict.failed === 1,
    `a VALÓS bukást a sorozat elfedte: ${JSON.stringify(verdict).slice(0, 180)}`);
  say('EXS07', verdict.green === PROGRAMS.length - 1,
    `a zöldek számlálása hibás: ${verdict.green} (várt ${PROGRAMS.length - 1})`);
}

// ── EXS08 — A NÉGY KATEGÓRIA HATÁRAI (R194 §Döntés: a „10/19 végzett" pontatlan volt) ───────────
{
  say('EXS08', classify(null) === 'el_nem_indult', 'a rekord NÉLKÜLI program nem „el nem indult"');
  say('EXS08', classify({ ok: true }) === 'sikeres', 'a zöld rekord nem „sikeres"');
  say('EXS08', classify({ ok: false, failure_kind: 'content' }) === 'tartalmi_hibas',
    'a tartalmi hiba nem „tartalmi hibás"');
  say('EXS08', classify({ ok: false, failure_kind: 'too_slow' }) === 'hianyos_meresu',
    'az IDŐ miatti bukás nem „hiányos mérésű" — pedig nem tudjuk, mit mondana a program');
  say('EXS08', classify({ ok: false, env_skipped: true }) === 'kornyezeti_kihagyas',
    'a nevezett környezeti kihagyás „sikeres"-nek számít — pedig zöld bizonyítékot NEM ad (KUKA-089)');
  const t = tally({ byId: new Map(), programs: PROGRAMS });
  say('EXS08', t.el_nem_indult.length === PROGRAMS.length,
    `üres sorozatnál nem mind „el nem indult": ${JSON.stringify(Object.keys(t).map((k) => [k, t[k].length]))}`);
}

// ── ÖSSZESÍTŐ MÓD (--aggregate): a LEMEZEN álló sorozatok ────────────────────────────────────────
if (process.argv.includes('--aggregate')) {
  const base = join(ROOT, 'v3ref/external-checks/results/series');
  console.log('');
  console.log('EXS-01 — A LEMEZEN ÁLLÓ MÉRÉSI SOROZATOK');
  console.log('='.repeat(94));
  if (!existsSync(base)) {
    console.log('  Egyetlen sorozat sincs még. A következő futás létrehozza: npm run verify:external-checks');
  } else {
    const dirs = readdirSync(base).filter((d) => statSync(join(base, d)).isDirectory());
    if (!dirs.length) console.log('  A sorozat-könyvtár üres.');
    for (const d of dirs) {
      const files = readdirSync(join(base, d)).filter((f) => f.endsWith('.json'));
      const records = files.map((f) => {
        try { return JSON.parse(readFileSync(join(base, d, f), 'utf8')); } catch { return `OLVASHATATLAN: ${f}`; }
      });
      const { verdict, problems: pr, byId } = verifySeries({ records, programs: PROGRAMS });
      const t = tally({ byId, programs: PROGRAMS });
      console.log(`\n  SOROZAT ${d}  ·  ${records.length} rekord`);
      const any = records.find((r) => r && r.binding);
      if (any) console.log(`    kötés: ${String(any.binding.commit).slice(0, 12)} · tiszta: ${any.binding.clean} · konfiguráció: ${any.binding.config_digest}`);
      console.log(`    TELJES: ${verdict.complete ? 'IGEN' : 'NEM'} · ÖSSZVERDIKT: ${verdict.ok ? 'ZÖLD' : 'NEM ZÖLD'}`);
      console.log(`    sikeres ${t.sikeres.length} · tartalmi hibás ${t.tartalmi_hibas.length} · `
        + `hiányos mérésű ${t.hianyos_meresu.length} · környezeti kihagyás ${t.kornyezeti_kihagyas.length} · `
        + `el nem indult ${t.el_nem_indult.length}  (összesen ${PROGRAMS.length})`);
      for (const k of ['tartalmi_hibas', 'hianyos_meresu', 'kornyezeti_kihagyas', 'el_nem_indult']) {
        if (t[k].length) console.log(`      ${k}: ${t[k].join(' · ')}`);
      }
      if (pr.length) {
        console.log(`    A BIZONYÍTÉK LELETEI (${pr.length}):`);
        for (const x of pr.slice(0, 10)) console.log(`      · ${x}`);
        if (pr.length > 10) console.log(`      … és még ${pr.length - 10}`);
      }
      console.log(`    ${verdict.why}`);
    }
  }
  console.log('');
}

console.log(`EXS-01 SOROZAT-KAPU (EXS01–EXS08, az EXS03b-vel): ${PROGRAMS.length} program · szerződés ${SERIES_CONTRACT}`);
console.log('  AMIT EZ NEM ÁLLÍT: a szintetikus összesítő-próba NEM termékelfogadás — a bizonyíték');
console.log('  KEZELÉSÉT méri, nem a terméket (R194 §2).');
if (problems.length) {
  console.error(`\nPIROS (${problems.length}):`);
  for (const p of problems) console.error(`  · ${p}`);
  process.exit(1);
}
console.log('ZÖLD — hiányos, duplikált, sérült vagy idegen forrású bizonyítékból nem lesz teljes verdikt.');
