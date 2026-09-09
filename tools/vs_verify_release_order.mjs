#!/usr/bin/env node
// Valach System — A KIADÁSI MENETREND ŐRE (REL-01). READ-ONLY + offline. Exit 0/1.
//
// MIT VÉD: azt, hogy egy rossz kiadás VISSZAGÖRGETHETŐ legyen. A séma előre megy, a kód visszafelé
// is mehet — de csak akkor, ha a bontás soha nem esik egybe azzal a kiadással, amelyben a kód
// abbahagyta a használatot. A szabály a `contracts/releaseOrder.js`-ben él, és ez az őr HÍVJA
// (nem másolja — KUKA-009).
//
//   REL01  a migrációk alakja: számozott, egyedi, előrefelé
//   REL02  a KIADOTT migrációt senki nem szerkesztette át (LEDGER sha256 · „ami lefutott, kőbe vésve")
//   REL03  minden BONTÓ migráció kimondja, melyik kiadásban hagyta abba a kód a használatot
//   REL04  a CHANGELOG alakja: van Unreleased szakasz, a kiadott verziók csökkenő semver-sorban
//   REL05  a package.json verziója érvényes semver, és nem régebbi a CHANGELOG legfrissebb kiadásánál
//   REL06  ÖNPRÓBA: a szabály BIZONYÍTOTTAN TÜZEL — a feloldó fixtúrákon lefuttatva
//
// REL06 MIÉRT KELL. Nulla migrációval a REL03 „zöld" volna anélkül, hogy bármit mért volna — ez a
// KUKA-051/089 hibája: a nem mért dolog nem „ismeretlen állapotú", hanem zöldnek látszik. Ezért a
// szabályt fixtúrákon FUTTATJUK: egy bontó migráció fejléc nélkül PIROS kell legyen, ugyanaz helyes
// fejléccel ZÖLD. Így a REL03 az első naptól bizonyított, nem ígéret.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const { classifyMigration, compareSemver, parseSemver } = require(join(ROOT, 'contracts', 'releaseOrder.js'));

let pass = 0, fail = 0; const bad = [];
const check = (id, name, ok, detail = '') => {
  if (ok) pass++; else { fail++; bad.push(`  FAIL [${id}] ${name}${detail ? ' — ' + detail : ''}`); }
  return Boolean(ok);
};

const pkg = JSON.parse(read('package.json'));
const VERSION = pkg.version;

// ── REL01: a migrációk alakja ────────────────────────────────────────────────────────────────────
const MIG_DIR = 'migrations';
const files = existsSync(join(ROOT, MIG_DIR))
  ? readdirSync(join(ROOT, MIG_DIR)).filter((f) => f.endsWith('.sql')).sort()
  : null;
check('REL01', 'a migrations/ könyvtár létezik', files !== null);
const named = (files || []).filter((f) => /^\d{3}_[a-z0-9_]+\.sql$/.test(f));
check('REL01', `minden migráció-fájl neve NNN_nev.sql alakú (${named.length}/${(files || []).length})`,
  named.length === (files || []).length,
  (files || []).filter((f) => !named.includes(f)).join(', '));
const nums = named.map((f) => Number(f.slice(0, 3)));
check('REL01', 'a sorszámok egyediek (két sáv nem vehette ki ugyanazt)',
  new Set(nums).size === nums.length,
  nums.filter((n, i) => nums.indexOf(n) !== i).map((n) => String(n).padStart(3, '0')).join(', '));

// ── REL02: a kiadott migráció ÉRINTHETETLEN ──────────────────────────────────────────────────────
// A LEDGER azt rögzíti, mi futott már le valahol. Ami benne van, annak a tartalma nem változhat;
// javítani ÚJ migrációval lehet. Ami nincs benne, az még nem ment ki — az szerkeszthető.
const LEDGER = 'migrations/LEDGER.json';
const hasLedger = existsSync(join(ROOT, LEDGER));
check('REL02', 'a kiadás-napló (migrations/LEDGER.json) létezik', hasLedger);
let ledger = { released: [] };
if (hasLedger) {
  ledger = JSON.parse(read(LEDGER));
  const drift = [];
  const orphan = [];
  for (const row of ledger.released || []) {
    const p = `${MIG_DIR}/${row.file}`;
    if (!existsSync(join(ROOT, p))) { orphan.push(row.file); continue; }
    const sha = createHash('sha256').update(readFileSync(join(ROOT, p))).digest('hex');
    if (sha !== row.sha256) drift.push(row.file);
  }
  check('REL02', `a KIADOTT migrációkat senki nem írta át (${(ledger.released || []).length} mérve)`,
    drift.length === 0, drift.join(', '));
  check('REL02', 'a naplóban nincs olyan migráció, ami a fájlrendszerből eltűnt (a kiadottat törölni sem szabad)',
    orphan.length === 0, orphan.join(', '));
}

// ── REL03: a BONTÁS-SZABÁLY az ÉLŐ migrációkon ───────────────────────────────────────────────────
const verdicts = named.map((f) => ({ file: f, v: classifyMigration(read(`${MIG_DIR}/${f}`), VERSION) }));
const contractions = verdicts.filter((x) => x.v.shape === 'contract');
const broken = contractions.filter((x) => !x.v.ok);
check('REL03', `minden bontó migráció megfelel a menetrendnek (${contractions.length} bontó a ${named.length}-ből)`,
  broken.length === 0, broken.map((x) => `${x.file}: ${x.v.reason}`).join(' | '));

// ── REL04 + REL05: a CHANGELOG és a verzió ───────────────────────────────────────────────────────
const CH = 'CHANGELOG.md';
check('REL04', 'a CHANGELOG.md létezik', existsSync(join(ROOT, CH)));
let released = [];
if (existsSync(join(ROOT, CH))) {
  const ch = read(CH);
  check('REL04', 'van „Unreleased" szakasz (a következő kiadás gyűjtője)', /^##\s*\[Unreleased\]/m.test(ch));
  released = [...ch.matchAll(/^##\s*\[(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\]/gm)].map((m) => m[1]);
  const descending = released.every((v, i) => i === 0 || compareSemver(released[i - 1], v) > 0);
  check('REL04', `a kiadott verziók csökkenő sorrendben állnak (${released.length} kiadás)`, descending,
    released.join(' → '));
}
check('REL05', `a package.json verziója érvényes semver (${VERSION})`, parseSemver(VERSION) !== null);
if (released.length) {
  check('REL05', `a package.json verziója (${VERSION}) nem régebbi a CHANGELOG legfrissebb kiadásánál (${released[0]})`,
    compareSemver(VERSION, released[0]) >= 0);
}

// ── REL06: ÖNPRÓBA — a szabály BIZONYÍTOTTAN TÜZEL ───────────────────────────────────────────────
// Nulla (vagy csupa bővítő) migrációval a REL03 nem mérne semmit. Itt a feloldót FIXTÚRÁKON hívjuk,
// hogy a szabály az első naptól bizonyított legyen — ne ígéret. (KUKA-051 · KUKA-089)
const FIXTURES = [
  { name: 'bővítés — új oszlop, kényszer nélkül',
    sql: 'ALTER TABLE partner ADD COLUMN vat_number TEXT;', expect: { shape: 'expand', ok: true } },
  { name: 'bontás fejléc NÉLKÜL — tilos',
    sql: 'ALTER TABLE partner DROP COLUMN legacy_code;', expect: { shape: 'contract', ok: false } },
  { name: 'bontás UGYANABBAN a kiadásban — tilos',
    sql: `-- KIVEZETVE: ${VERSION}\nALTER TABLE partner DROP COLUMN legacy_code;`, expect: { shape: 'contract', ok: false } },
  { name: 'bontás KORÁBBI kiadás után — megengedett',
    sql: '-- KIVEZETVE: 0.0.1\nALTER TABLE partner DROP COLUMN legacy_code;', expect: { shape: 'contract', ok: true } },
  { name: 'a KOMMENTBEN álló DROP nem bontás (a szabály a végrehajtott mondatról szól)',
    sql: '-- ide jön majd egy DROP COLUMN, de még nem\nALTER TABLE partner ADD COLUMN note TEXT;', expect: { shape: 'expand', ok: true } },
  { name: 'SET NOT NULL is bontás (a régi kód üresen írhatta)',
    sql: 'ALTER TABLE partner ALTER COLUMN vat_number SET NOT NULL;', expect: { shape: 'contract', ok: false } },
];
for (const f of FIXTURES) {
  const v = classifyMigration(f.sql, VERSION);
  check('REL06', `önpróba: ${f.name}`, v.shape === f.expect.shape && v.ok === f.expect.ok,
    `kapott: shape=${v.shape} ok=${v.ok} (${v.reason})`);
}

console.log('');
console.log('KIADÁSI MENETREND ŐR (REL-01)');
console.log('='.repeat(50));
if (bad.length) console.log(bad.join('\n'));
console.log(`  mai verzió: ${VERSION} · migráció: ${named.length} db (bontó: ${contractions.length}) · kiadva a naplóban: ${(ledger.released || []).length}`);
if (named.length === 0) {
  console.log('  MEGJEGYZÉS: még NINCS migráció — a REL03 élő adaton nem mért semmit.');
  console.log('  Ezért fut a REL06 önpróba: a szabály fixtúrákon BIZONYÍTOTTAN tüzel (a hiányzó');
  console.log('  mérés nem zöld, hanem kimondott hiány — KUKA-051 · KUKA-089).');
}
console.log(`RESULT: ${pass}/${pass + fail} PASS${fail ? ` — ${fail} FAIL` : ''}`);
process.exit(fail ? 1 : 0);
