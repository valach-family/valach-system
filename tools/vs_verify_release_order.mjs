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
// ═══ R45 Q16 — A JAVÍTÁS ELJUTOTT AZ OSZTÁLYOZÓIG, A FOGYASZTÓJÁIG NEM ══════════════════════════
//
// Az előző kör megengedő szabályra cserélte a KIZÁRÓ felsorolást — az OSZTÁLYOZÓ azóta helyesen
// mond `data_change, ok:false`-t a `TRUNCATE TABLE partner`-re és `unknown, ok:false`-t a
// `SELECT 1`-re. **Csak épp ez a verifier egyiket sem nézte:** a `contract` alakra szűrt, tehát a
// másik két csoport elutasítása NEM tette pirossá a teljes ellenőrzést (R45 L01 · L02: 27/27 PASS,
// exit 0 egy tábla-ürítés mellett).
//
// Ez PONTOSAN ugyanaz a hiba-osztály, mint a mai `docs:html` lelet (D-VS-3004): a darab ép volt, a
// VISZONY halott (KUKA-024). Innentől: MINDEN megvizsgált migráció MINDEN elutasítása megállít.
const rejected = verdicts.filter((x) => !x.v.ok);
check('REL03', `NINCS elutasított migráció — bármely alakban (${verdicts.length} migráció mérve; elutasítva: ${rejected.length})`
  // NEM ZSÁKUTCA (KUKA-064): a mondat megnevezi a FÁJLT, a BESOROLÁST és az INDOKOT — enélkül a
  // felhasználó ott áll meg, ahol elindult.
  + (rejected.length ? `\n         ${rejected.map((x) => `${x.file} → [${x.v.shape}] ${x.v.reason}`).join('\n         ')}` : ''),
  rejected.length === 0);

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

  // ── R42 Q16: AZ ISMERETLEN SQL NEM BIZTONSÁGOS BŐVÍTÉS ────────────────────────────────────────
  // Mind a négyre `expand, ok:true` volt a válasz, mielőtt a kizáró felsorolást megengedő
  // szabályra cseréltük (KUKA-057). Ezek a sorok azok, amiket a külső fél MEGMÉRT.
  { name: 'Q16 — TRUNCATE nem bővítés (a kód visszagörgetése nem hozza vissza az adatot)',
    sql: 'TRUNCATE TABLE partner;', expect: { shape: 'data_change', ok: false } },
  { name: 'Q16 — a DROP-ban a COLUMN szó OPCIONÁLIS (dokumentált Postgres-alak)',
    sql: 'ALTER TABLE partner DROP legacy_code;', expect: { shape: 'contract', ok: false } },
  { name: 'Q16 — azonnal érvényesített CHECK kizárja a régi írókat',
    sql: 'ALTER TABLE partner ADD CONSTRAINT c CHECK (vat IS NOT NULL);', expect: { shape: 'contract', ok: false } },
  { name: 'Q16 — DELETE nem bővítés',
    sql: 'DELETE FROM stock_movement WHERE id < 100;', expect: { shape: 'data_change', ok: false } },
  { name: 'Q16 — a FEL NEM ISMERT alak sem engedély (az őr nem SQL-értelmező)',
    sql: 'SELECT pg_sleep(1);', expect: { shape: 'unknown', ok: false } },
  // ═══ R45 L03–L07 — A SAJÁT FIXTÚRÁM INDOKLÁSA VOLT HAMIS ══════════════════════════════════════
  // A régi sor azt állította, hogy a `NOT VALID` megszorítás „a régi írókat nem zárja ki". A
  // PostgreSQL szerint a `NOT VALID` csak a MEGLÉVŐ sorok végigellenőrzését halasztja el; az ÚJ
  // beszúrást/módosítást a feltétel MÁR korlátozza. Tehát a fixtúra egy HAMIS állítást őrzött
  // zölden — pontosan az a hiba-osztály, amiről a KUKA-068 szól (a pin védte a hibát).
  { name: 'R45 L03 — NOT VALID megszorítás: SZORÍTÓ, mert az ÚJ írásokat már korlátozza',
    sql: 'ALTER TABLE partner ADD CONSTRAINT c CHECK (vat IS NOT NULL) NOT VALID;',
    expect: { shape: 'restrictive', ok: false } },
  { name: 'R45 L04 — CREATE UNIQUE INDEX: SZORÍTÓ (a múltbeli duplikátumon megbukhat)',
    sql: 'CREATE UNIQUE INDEX ix_partner_code ON partner(code);',
    expect: { shape: 'restrictive', ok: false } },
  { name: 'R45 L05 — ADD COLUMN … NOT NULL: SZORÍTÓ (meglévő sorok + az új mezőt nem író régi kód)',
    sql: 'ALTER TABLE partner ADD COLUMN required TEXT NOT NULL;',
    expect: { shape: 'restrictive', ok: false } },
  { name: 'R45 L03 — a SZORÍTÓ átmegy, ha a szerző kimondja, hogyan marad kompatibilis a régi író',
    sql: '-- BESOROLÁS: restrictive — a 3.0.0 óta minden író kitölti; a meglévő sorokat a 041 töltötte fel\nALTER TABLE partner ADD COLUMN required TEXT NOT NULL;',
    expect: { shape: 'restrictive', ok: true } },
  { name: 'R45 L06 — VEGYES fájl: az adatváltozás NEM nyeli el a bontás kivezetési kötelmét',
    sql: '-- BESOROLÁS: data_change — a 2019-es sorok egységesítése\nALTER TABLE partner DROP legacy_code;\nUPDATE partner SET x = 1;',
    expect: { shape: 'data_change', ok: false } },
  { name: 'R45 L06 — ugyanaz KIVEZETVE fejléccel is: MINDKÉT kötelem teljesül',
    sql: '-- BESOROLÁS: data_change — a 2019-es sorok egységesítése, a 042-es mentésből visszaállítható\n-- KIVEZETVE: 2.9.0\nALTER TABLE partner DROP legacy_code;\nUPDATE partner SET x = 1;',
    expect: { shape: 'data_change', ok: true } },
  // ═══ R49/L05 — AZ ÖNBEVALLÓ `unknown` FEJLÉC KIVEZETVE ════════════════════════════════════════
  //
  // A régi sor azt mérte, hogy az `-- BESOROLÁS: unknown` fejléc ÁTENGEDI az ismeretlen alakot —
  // és ez volt a KUKA-064 szerinti „ajánlott folytatás". A külső fél MÉRTE (R49/L05), hogy egy
  // HIBÁT DOBÓ `DO $$ … $$` blokk ugyanezzel a fejléccel `ok:true`-t kap: a szerző EGYETLEN SZAVA
  // engedéllyé vált. Ezért az `unknown` kikerült a fejléc-nyelvtanból.
  //
  // A KUKA-064 KÖTELME NEM SZŰNIK MEG, csak az ajánlott út változott — és a REL06 dolga továbbra
  // is az, hogy a MINDENKORI üzenet által ajánlott folytatást MÉRJE. Ezért ez a fixtúra-pár az ÚJ
  // ajánlást méri: (a) írd át FELISMERT alakra ⇒ működik · (b) az önbevalló fejléc ⇒ NEM engedély.
  { name: 'R49 L05 — az ÚJ ajánlott folytatás működik: felismert alakra átírva ÁTMEGY',
    sql: '-- BESOROLÁS: expand — a felismert alak, amit az üzenet ajánl\nALTER TABLE partner ADD COLUMN note TEXT;',
    expect: { shape: 'expand', ok: true } },
  { name: 'R49 L05 — az ÖNBEVALLÓ `unknown` fejléc többé NEM engedély (a szerző szava nem bizonyíték)',
    sql: '-- BESOROLÁS: unknown — csak olvasó mondat, semmilyen sémát és adatot nem érint\nSELECT 1;',
    expect: { shape: 'unknown', ok: false } },
  { name: 'R49 L05 — a HIBÁT DOBÓ blokk sem megy át önbevallással (a külső fél mért esete)',
    sql: "-- BESOROLÁS: unknown — x\nDO $$ BEGIN RAISE EXCEPTION 'failure'; END $$;",
    expect: { shape: 'unknown', ok: false } },
  { name: 'R45 L07 — de a ROSSZ besorolás NEM elég: az `expand` fejléc egy ismeretlen mondaton nem engedély',
    sql: '-- BESOROLÁS: expand — szerintem ártalmatlan\nSELECT 1;',
    expect: { shape: 'unknown', ok: false } },
  { name: 'Q16 — KIMONDOTT besorolással az adatváltozás átmegy',
    sql: '-- BESOROLÁS: data_change — a 2019-es sorok egységesítése, a 042-es mentésből visszaállítható\nUPDATE partner SET x = 1;',
    expect: { shape: 'data_change', ok: true } },
  { name: 'Q16 — de a MÁSIK osztály deklarációja nem fogadható el',
    sql: '-- BESOROLÁS: expand — szerintem ártalmatlan\nTRUNCATE TABLE partner;',
    expect: { shape: 'data_change', ok: false } },

  // ── R42 §2.4: SZIGORÚ SemVer ──────────────────────────────────────────────────────────────────
  { name: 'SemVer — az ELŐKIADÁS korábbi a véglegesnél (a régi alak 0-t adott)',
    sql: '-- KIVEZETVE: 3.0.0-alpha\nALTER TABLE partner DROP COLUMN x;', expect: { shape: 'contract', ok: true },
    version: '3.0.0' },
  { name: 'SemVer — vezető nullás alak NEM érvényes',
    sql: '-- KIVEZETVE: 03.0.0\nALTER TABLE partner DROP COLUMN x;', expect: { shape: 'contract', ok: false } },
];
for (const f of FIXTURES) {
  const v = classifyMigration(f.sql, f.version || VERSION);
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
