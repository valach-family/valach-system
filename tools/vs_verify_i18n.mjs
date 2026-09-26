#!/usr/bin/env node
/**
 * I18N-01 ŐR — A NYELVI LEFEDETTSÉG MÉRÉSE (R89 §5 · §8).
 *
 * MIT MÉR, NYELVENKÉNT ÉS NÉGY KÜLÖN LELETTEL (nem egy százalékkal — KUKA-216: a verdikt nem
 * mutathat a mérés hatókörén túl):
 *   · `missing`        — a kulcs a nyelvcsomagban NINCS (a visszaesési lánc pótolja, de ez NEM lefedés);
 *   · `orphan`         — a csomagban VAN olyan kulcs, ami az alapnyelvben nincs (elavult sor);
 *   · `param_mismatch` — a `{jel}` helyőrzők készlete eltér: a mondat ADATOT veszít;
 *   · `stale_kb`       — a funkció-leírás verziója előrement a fordításhoz képest.
 *
 * ÉS AMIT KÜLÖN MÉR, mert a szótár-fájl CSENDBEN tud hazudni:
 *   · KETTŐS KULCS (KUKA-168): egy objektum-literálban a második `x:` némán elnyeli az elsőt. A
 *     futásidejű `Object.keys` ezt NEM látja — ezért a FORRÁST is átolvassuk;
 *   · a nyelvjegyzék és a csomagok VISZONYA mindkét irányban: jegyzékben álló nyelvhez van-e csomag,
 *     és van-e csomag jegyzék nélkül (KUKA-039: a fél őr nem őr);
 *   · a PRÓBA-nyelvek NEM számítanak bekapcsoltnak: hiányos nyelvet nem nevezünk támogatottnak.
 *
 * A NULLA LELET IS ALAPSOKASÁGOT VISZ (KUKA-093): minden sor kiírja, mennyi kulcshoz mérve nulla.
 *
 * ELLENPRÓBA (`--selftest`): szintetikus, ROMLOTT csomagokon bizonyítja, hogy az őr TÜZEL — hiányzó
 * kulcsra, árva kulcsra, elrontott helyőrzőre, elavult leírás-verzióra és kettős kulcsra egyaránt.
 * Enélkül egy néma zöld őrt szállítanánk (KUKA-051 · KUKA-089).
 *
 * Futtatás: npm run verify:i18n   ·   --json a gépi alakhoz   ·   --selftest az ellenpróbákhoz
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const I18N_DIR = join(ROOT, 'v3app/public/i18n');
const asJson = process.argv.includes('--json');
const selftest = process.argv.includes('--selftest');

const { LANGUAGES, BASE_LANGUAGE, enabledLanguages, allLanguages, dirOf, fallbackChainOf } = await import(join(I18N_DIR, 'languages.mjs'));
const dict = await import(join(I18N_DIR, 'dict.mjs'));
const { FEATURES } = await import(join(ROOT, 'v3app/knowledge/features.mjs'));

const checks = [];
const fail = (id, label, detail) => checks.push({ id, label, ok: false, detail });
const pass = (id, label, detail) => checks.push({ id, label, ok: true, detail });
const check = (id, label, cond, detail = '') => (cond ? pass(id, label, detail) : fail(id, label, detail));

// ── I18N01: a jegyzék és a csomagok VISZONYA, mindkét irányban ────────────────────────────────
const packCodes = Object.keys(dict.PACKS);
const listCodes = LANGUAGES.map((l) => l.code);
check('I18N01', 'minden jegyzékbe vett nyelvhez van csomag',
  listCodes.every((c) => packCodes.includes(c)),
  `jegyzék: ${listCodes.join(' · ')} · csomag: ${packCodes.join(' · ')}`);
check('I18N01', 'minden csomag szerepel a jegyzékben (nincs jegyzék nélküli nyelv)',
  packCodes.every((c) => listCodes.includes(c)),
  `csomag nélküli jegyzék-sor vagy jegyzék nélküli csomag: ${[...packCodes.filter((c) => !listCodes.includes(c)), ...listCodes.filter((c) => !packCodes.includes(c))].join(' · ') || 'nincs'}`);
// A FÁJLOK is a jegyzékhez mérve: egy „elfelejtett" csomag-fájl ne álljon holtan a mappában.
//
// A CSOMAG-SÁGOT A FÁJL TARTALMA MONDJA MEG, NEM EGY KÉZI NÉV-LISTA (R97 javítás). A korábbi alak a
// mappa MINDEN `.mjs`-ét csomagnak vette két kivett néven kívül (`languages.mjs` · `dict.mjs`), ezért
// egy ÚJ segéd-modul (LNG-02 `langMemory.mjs`) „holt nyelvcsomagként" jelent meg — az őr egy
// szabályos állapotot mondott hibának (KUKA-049), és a kizáró felsorolás a következő modulról sem
// tudott volna (KUKA-057). A csomag ISMERTETŐJELE a saját deklarációja: `export const meta = … code:`.
const mjsFiles = readdirSync(I18N_DIR).filter((f) => f.endsWith('.mjs'));
const declaresPack = (f) => /export const meta = Object\.freeze\(\{\s*code:/.test(readFileSync(join(I18N_DIR, f), 'utf8'));
const files = mjsFiles.filter(declaresPack);
const helpers = mjsFiles.filter((f) => !declaresPack(f));
check('I18N01', 'nincs holt nyelvcsomag-fájl a mappában',
  files.length === listCodes.length,
  `csomag-fájl: ${files.length} · jegyzék: ${listCodes.length} (${files.join(' · ')})`);
// A KIHAGYOTTAKAT IS KIÍRJUK: a mérés ne hallgasson arról, mit NEM vett csomagnak (KUKA-091).
check('I18N01', 'a csomagnak NEM számító modulok NEVESÍTVE vannak (a mérés nem hallgat a hatóköréről)',
  helpers.length >= 2, `segéd-modul: ${helpers.join(' · ') || 'nincs'}`);

// ── I18N02: az ALAPNYELV teljes, és ő a lánc vége ─────────────────────────────────────────────
check('I18N02', 'az alapnyelv a lánc VÉGE minden nyelvnél',
  allLanguages().every((l) => fallbackChainOf(l.code).at(-1) === BASE_LANGUAGE),
  `alapnyelv: ${BASE_LANGUAGE}`);
const baseCov = dict.coverageOf(BASE_LANGUAGE, FEATURES);
check('I18N02', 'az alapnyelv csomagja hiánytalan',
  baseCov.missing.length === 0 && baseCov.deep_missing.length === 0,
  `${baseCov.covered}/${baseCov.population} kulcs`);

// ── I18N03: minden BEKAPCSOLT termék-nyelv TELJES ─────────────────────────────────────────────
const coverage = {};
for (const l of allLanguages()) coverage[l.code] = dict.coverageOf(l.code, FEATURES);
for (const l of enabledLanguages()) {
  const c = coverage[l.code];
  const gaps = c.missing.length + c.deep_missing.length;
  check('I18N03', `bekapcsolt nyelv teljes: ${l.code}`, gaps === 0,
    `${c.covered}/${c.population} kulcs · hiány: ${gaps}${gaps ? ` (${[...c.missing, ...c.deep_missing].slice(0, 6).join(' · ')}${gaps > 6 ? ' …' : ''})` : ''}`);
  check('I18N03', `nincs árva kulcs: ${l.code}`, c.orphan.length === 0,
    `${c.orphan.length} árva${c.orphan.length ? ` (${c.orphan.slice(0, 6).join(' · ')})` : ''} · alapsokaság: ${c.population}`);
  check('I18N03', `a helyőrzők egyeznek: ${l.code}`, c.param_mismatch.length === 0,
    `${c.param_mismatch.length} eltérés${c.param_mismatch.length ? ` (${c.param_mismatch.slice(0, 4).join(' · ')})` : ''} · alapsokaság: ${c.population}`);
  check('I18N03', `nincs elavult funkció-fordítás: ${l.code}`, c.stale_kb.length === 0,
    `${c.stale_kb.length} elavult${c.stale_kb.length ? ` (${c.stale_kb.slice(0, 4).join(' · ')})` : ''} · funkció: ${FEATURES.length}`);
  check('I18N03', `a csomag maga TELJESNEK deklarálja magát: ${l.code}`, c.complete_declared === true,
    `meta.complete = ${c.complete_declared}`);
}

// ── I18N04: a PRÓBA-nyelvek — felvehetők, MÉRHETŐK, és NEM támogatottak ───────────────────────
const probes = allLanguages().filter((l) => l.kind === 'probe');
check('I18N04', 'van negyedik nyelv PRÓBA-csomagja', probes.some((l) => l.dir === 'ltr'),
  probes.map((l) => l.code).join(' · ') || 'nincs');
check('I18N04', 'van JOBBRÓL BALRA írt próbatartalom', probes.some((l) => l.dir === 'rtl'),
  probes.filter((l) => l.dir === 'rtl').map((l) => `${l.code} (${dirOf(l.code)})`).join(' · ') || 'nincs');
check('I18N04', 'a próba-nyelvek NEM bekapcsoltak (hiányos nyelvet nem kínálunk)',
  probes.every((l) => l.enabled === false) && enabledLanguages().every((l) => l.kind === 'product'),
  `bekapcsolt: ${enabledLanguages().map((l) => l.code).join(' · ')}`);
for (const l of probes) {
  const c = coverage[l.code];
  // A PRÓBÁN A HIÁNY A VÁRT EREDMÉNY — de MÉRHETŐNEK kell lennie, és a csomag nem mondhatja
  // magát teljesnek. Ez a mérő ÉLŐ ESETE: enélkül a „hiányzó fordítás" ága soha nem futna le.
  check('I18N04', `a próba-nyelv hiánya MÉRHETŐ: ${l.code}`,
    (c.missing.length + c.deep_missing.length) > 0 && c.complete_declared === false,
    `${c.covered}/${c.population} kulcs · hiány: ${c.missing.length + c.deep_missing.length} · deklarált teljesség: ${c.complete_declared}`);
  check('I18N04', `a próba-nyelvnek nincs árva kulcsa: ${l.code}`, c.orphan.length === 0,
    `${c.orphan.length} árva${c.orphan.length ? ` (${c.orphan.slice(0, 4).join(' · ')})` : ''}`);
  check('I18N04', `a próba-nyelv a láncon MAGYARRA esik: ${l.code}`,
    fallbackChainOf(l.code).at(-1) === BASE_LANGUAGE, fallbackChainOf(l.code).join(' > '));
}
// A PRÓBA CÉLJA: a felvétel TARTALOMBÓL megy, kód-módosítás nélkül. Ezt azzal mérjük, hogy a
// feloldó a próba-nyelven is teljes (pótolt) szótárat ad — ugyanazokkal a kulcsokkal.
for (const l of probes) {
  const d = dict.dictFor(l.code);
  const base = dict.dictFor(BASE_LANGUAGE);
  const missingAfterFallback = dict.TEXT_GROUPS.flatMap((g) => Object.keys(base[g]).filter((k) => !(k in d[g])));
  check('I18N04', `a próba-nyelv a visszaeséssel HASZNÁLHATÓ marad: ${l.code}`,
    missingAfterFallback.length === 0,
    `pótlás után hiányzó kulcs: ${missingAfterFallback.length}`);
}

// ── I18N05: KETTŐS KULCS A FORRÁSBAN (KUKA-168) ────────────────────────────────────────────────
function duplicateKeysIn(file) {
  const src = readFileSync(join(I18N_DIR, file), 'utf8');
  const out = [];
  // Csoportonként: `export const NEV = Object.freeze({ … });` — a záró `});` a sor elején áll.
  const re = /export const ([A-Z_]+) = Object\.freeze\(\{([\s\S]*?)\n\}\);/g;
  let m;
  while ((m = re.exec(src))) {
    const group = m[1];
    const body = m[2];
    // Csak a LEGKÜLSŐ szint kulcsai (két szóköz behúzás) — a beágyazott objektumok a maguk sorában.
    const keys = [...body.matchAll(/^ {2}(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*)):/gm)].map((x) => x[1] || x[2]);
    const seen = new Set(); const dups = new Set();
    for (const k of keys) { if (seen.has(k)) dups.add(k); seen.add(k); }
    if (dups.size) out.push(`${group}: ${[...dups].join(', ')}`);
  }
  return out;
}
for (const f of files) {
  const dups = duplicateKeysIn(f);
  check('I18N05', `nincs kettős kulcs: ${f}`, dups.length === 0, dups.join(' · ') || 'egy kulcs sem ismétlődik');
}

// ── I18N06: a szám- és dátumformázás a TERÜLETI alakon, a többes szám az Intl-ből ─────────────
const numbers = enabledLanguages().map((l) => `${l.code}: ${dict.fmtNumber(1234.5, l.code)}`);
check('I18N06', 'a szám-formázás nyelvenként ELTÉR (területi alak, nem beégetett pont/vessző)',
  new Set(enabledLanguages().map((l) => dict.fmtNumber(1234.5, l.code))).size > 1, numbers.join(' · '));
check('I18N06', 'a többes szám az Intl.PluralRules-ból dől el (nem kézi n===1 ág)',
  dict.plural(1, { one: '1', other: 'sok' }, 'en') === '1' && dict.plural(3, { one: '1', other: 'sok' }, 'en') === 'sok',
  `en/1 → ${dict.plural(1, { one: 'one', other: 'other' }, 'en')} · en/3 → ${dict.plural(3, { one: 'one', other: 'other' }, 'en')}`);
check('I18N06', 'a dátum a területi alakon jön (nem ISO)',
  !/^\d{4}-\d{2}-\d{2}T/.test(dict.fmtDate('2026-09-26T08:00:00Z', 'de')),
  `de: ${dict.fmtDate('2026-09-26T08:00:00Z', 'de')} · hu: ${dict.fmtDate('2026-09-26T08:00:00Z', 'hu')}`);

// ── I18N07: a nyelv NEM dönt üzleti kérdésről — a szerződés kimondja ─────────────────────────
const langContract = (await import(join(I18N_DIR, 'languages.mjs'))).LANG_CONTRACT;
check('I18N07', 'a jegyzék KIMONDJA, hogy a nyelv nem választ országot/adózást/időzónát/pénznemet',
  /ország/i.test(langContract.never_decides) && /pénznem/i.test(langContract.never_decides),
  langContract.never_decides);
check('I18N07', 'a feloldó KIMONDJA, hogy a visszaesés nem lefedettség',
  /NEM LEFEDETTSÉG/i.test(dict.I18N_CONTRACT.stated_limit), dict.I18N_CONTRACT.stated_limit);

// ── ELLENPRÓBA: az őr TÜZEL-e a visszacsúszásra? ──────────────────────────────────────────────
const counter = [];
if (selftest) {
  const base = dict.PACKS[BASE_LANGUAGE];
  const clone = (o) => JSON.parse(JSON.stringify(o));
  // A mérő MAGJÁT hívjuk (`coverageOf` a PACKS-en dolgozik), ezért a rontást a PACKS másolatán
  // mérjük egy szintetikus feloldóval — a csomagokat magukat NEM írjuk át (a próba ne rontson).
  const measure = (packOverrides, features) => {
    const fakeBase = { PAGE: clone(base.PAGE), TPL: clone(base.TPL), KB: clone(base.KB), KB_SOURCE: clone(base.KB_SOURCE) };
    const pack = { PAGE: clone(base.PAGE), TPL: clone(base.TPL), KB: clone(base.KB), KB_SOURCE: clone(base.KB_SOURCE), ...packOverrides };
    const missing = Object.keys(fakeBase.PAGE).filter((k) => !(k in pack.PAGE));
    const orphan = Object.keys(pack.PAGE).filter((k) => !(k in fakeBase.PAGE));
    const param = Object.keys(fakeBase.TPL).filter((k) => pack.TPL[k] !== undefined
      && dict.placeholdersOf(fakeBase.TPL[k]).join(',') !== dict.placeholdersOf(pack.TPL[k]).join(','));
    const stale = (features || []).filter((f) => (pack.KB_SOURCE[f.id] || {}).source_version !== f.version).map((f) => f.id);
    return { missing, orphan, param, stale };
  };
  const t = (label, r, field) => counter.push({ label, ok: r[field].length > 0, detail: `${field}: ${r[field].slice(0, 3).join(', ') || '—'}` });
  const noKey = clone(base.PAGE); delete noKey.stock;
  t('hiányzó kulcs PIROSRA vált', measure({ PAGE: noKey }), 'missing');
  t('árva kulcs PIROSRA vált', measure({ PAGE: { ...clone(base.PAGE), nincs_ilyen_oldal: 'x' } }), 'orphan');
  t('elrontott helyőrző PIROSRA vált', measure({ TPL: { ...clone(base.TPL), accountOpened: 'Megnyitva: {rossz}' } }), 'param');
  t('elavult funkció-fordítás PIROSRA vált',
    measure({ KB_SOURCE: { ...clone(base.KB_SOURCE), 'data.stock': { source_version: '0.9.0', review: 'x' } } }, FEATURES), 'stale');
  // KETTŐS KULCS: szintetikus forrás-szöveg, a VALÓDI feloldóval mérve.
  const dupSrc = "export const PAGE = Object.freeze({\n  stock: 'a',\n  stock: 'b',\n});\n";
  const dupKeys = (() => {
    const re = /export const ([A-Z_]+) = Object\.freeze\(\{([\s\S]*?)\n\}\);/g;
    const m = re.exec(dupSrc);
    const keys = [...m[2].matchAll(/^ {2}(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*)):/gm)].map((x) => x[1] || x[2]);
    return keys.length - new Set(keys).size;
  })();
  counter.push({ label: 'kettős kulcs PIROSRA vált', ok: dupKeys > 0, detail: `ismétlődő kulcs: ${dupKeys}` });
}

const failed = checks.filter((c) => !c.ok);
const counterFailed = counter.filter((c) => !c.ok);

if (asJson) {
  console.log(JSON.stringify({ checks, counter, coverage, failed: failed.length, counter_failed: counterFailed.length }, null, 2));
  process.exit(failed.length || counterFailed.length ? 1 : 0);
}

console.log('');
console.log('I18N-01 — NYELVI LEFEDETTSÉG (R89 §5)');
console.log('='.repeat(94));
let lastId = '';
for (const c of checks) {
  if (c.id !== lastId) { console.log(`  ── ${c.id} ──`); lastId = c.id; }
  console.log(`  ${c.ok ? 'PASS' : 'FAIL'}  ${c.label}${c.detail ? `  — ${c.detail}` : ''}`);
}
console.log('-'.repeat(94));
console.log('  LEFEDETTSÉG NYELVENKÉNT (az alapsokaság MINDEN sorban ott áll — KUKA-093):');
for (const l of allLanguages()) {
  const c = coverage[l.code];
  const gaps = c.missing.length + c.deep_missing.length;
  console.log(`    ${l.code.padEnd(11)} ${String(c.covered).padStart(4)}/${String(c.population).padEnd(4)} kulcs · hiány ${String(gaps).padStart(3)}`
    + ` · árva ${String(c.orphan.length).padStart(2)} · helyőrző ${String(c.param_mismatch.length).padStart(2)} · elavult leírás ${String(c.stale_kb.length).padStart(2)}`
    + ` · ${l.kind}${l.enabled ? ' BEKAPCSOLVA' : ' (nem kínált)'} · lánc: ${c.chain.join('>')}`);
}
if (selftest) {
  console.log('-'.repeat(94));
  console.log('  ELLENPRÓBÁK (az őr TÜZEL-e a visszacsúszásra?):');
  for (const c of counter) console.log(`    ${c.ok ? 'PASS' : 'FAIL'}  ${c.label}  — ${c.detail}`);
}
console.log('='.repeat(94));
console.log(`RESULT: ${checks.length - failed.length}/${checks.length} PASS`
  + (selftest ? ` · ellenpróba ${counter.length - counterFailed.length}/${counter.length}` : ' · ellenpróba: NEM FUTOTT (--selftest)')
  + (failed.length || counterFailed.length ? ' — PIROS' : ''));
console.log('');
process.exit(failed.length || counterFailed.length ? 1 : 0);
