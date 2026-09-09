'use strict';

// Valach System — A KIADÁSI MENETREND FELOLDÓJA (REL-01).
//
// EZ A SZABÁLY DÖNTI EL, HOGY EGY ROSSZ KIADÁS VISSZAGÖRGETHETŐ-E.
//
// A séma előre megy, a kód visszafelé is mehet. Ha egy kiadás EGYSZERRE dobja el az oszlopot és a
// kódot, ami használta, akkor a kód visszagörgetése olyan sémát talál, amiben az oszlop már nincs —
// és a visszaállás eltöri az adatbázist. Ezért a bontás HÁROM kiadásra oszlik:
//
//   1. BŐVÍTÉS   az új oszlop létrejön, üresen, kényszer nélkül   → a régi kód nem tud róla, működik
//   2. ÁTÁLLÁS   az új kód MINDKETTŐT írja, az ÚJAT olvassa        → a régi kód még mindig működik
//   3. SZŰKÍTÉS  a régi oszlop eldobva                             → ekkorra már nincs régi kód
//
// A TILTÁS, AMI MINDENT ELDÖNT:
//   a bontás SOHA nem lehet ugyanabban a kiadásban, mint a kód, ami abbahagyja a használatát.
//
// Ezért minden BONTÓ migráció fejlécében ki kell mondani, MELYIK kiadásban hagyta abba a kód a
// használatot — és annak SZIGORÚAN korábbinak kell lennie a mostaninál:
//
//   -- KIVEZETVE: 3.1.0
//   ALTER TABLE partner DROP COLUMN legacy_code;
//
// PURE + INERT: nincs DB, nincs hálózat, nincs titok. Csak szabály.
//
// Rokon tanulságok: KUKA-019 (a séma-elmaradás rendszer-állapot, nem riport-mondat) ·
// KUKA-028 (a második teremtő: új tábla előtt kötelező a név-keresés) · KUKA-009 (a pin ne a
// szöveget olvassa, hanem HÍVJA a döntést — ezért él ez külön, nevezett feloldóként).

const RELEASE_ORDER_CONTRACT_ID = 'REL-01';

// ═══ Q16 (R42 §2.4): AZ ISMERETLEN SQL NEM BIZTONSÁGOS BŐVÍTÉS ═════════════════════════════════
//
// Az első alak KIZÁRÓ felsorolással dolgozott: ami nem illett a „bontó" mintákra, az automatikusan
// `expand, ok:true` lett. A külső fél megmérte, és igaza lett — mind a négy ezt a választ kapta:
//     TRUNCATE TABLE partner;
//     ALTER TABLE partner DROP legacy_code;          ← a `COLUMN` szó a Postgresben OPCIONÁLIS
//     ALTER TABLE partner ADD CONSTRAINT c CHECK (…) ← a régi írókat kizárja
//     DELETE FROM stock_movement WHERE id<100;
//
// Ez a KUKA-057 pontosan: amit védünk, azt MEGENGEDŐ szabállyal védjük, nem kizáró felsorolással —
// a felsorolás a következő SQL-alakról nem tud, és a hiánya NÉMA. Rosszabb: itt a néma hiány
// „biztonságos"-nak MINŐSÍT (KUKA-041: a díszpipa sikert jelent arról, ami meg sem történt).
//
// Innentől négy osztály, és CSAK az ismert-biztonságos megy át magától:
//   expand       ismert, visszafelé ártalmatlan alak (a régi kód nem tud róla, működik)
//   contract     a régi kód alól kiveszi a talajt → `-- KIVEZETVE: <verzió>` kell, KORÁBBI a mainál
//   data_change  adatot ír/töröl → kód-visszagörgetéssel NEM visszavonható → deklaráció kell
//   unknown      nem ismerjük fel → NEM engedély; a szerző mondja meg, mi ez
//
// A regex itt ELŐSZŰRŐ, nem SQL-értelmező — ezt ki kell mondani (R42): nem állítjuk, hogy a
// mondat teljes jelentését értjük. Épp ezért esik minden fel nem ismert alak `unknown`-ra.

// A régi kód alól kiveszi a talajt.
const CONTRACTION_PATTERNS = Object.freeze([
  // A `COLUMN` kulcsszó OPCIONÁLIS a Postgresben — a régi minta emiatt ment el a DROP mellett.
  { name: 'DROP COLUMN', re: /\bALTER\s+TABLE\b[\s\S]{0,200}?\bDROP\s+(?:COLUMN\s+)?(?:IF\s+EXISTS\s+)?["\w]/i },
  { name: 'DROP TABLE', re: /\bDROP\s+TABLE\b/i },
  { name: 'DROP VIEW/INDEX/TYPE/SCHEMA', re: /\bDROP\s+(?:MATERIALIZED\s+VIEW|VIEW|INDEX|TYPE|SCHEMA|SEQUENCE|FUNCTION|TRIGGER)\b/i },
  { name: 'RENAME', re: /\bALTER\s+TABLE\b[\s\S]{0,200}?\bRENAME\b/i },
  { name: 'SET NOT NULL', re: /\bALTER\s+COLUMN\b[\s\S]{0,120}?\bSET\s+NOT\s+NULL\b/i },
  { name: 'ALTER COLUMN TYPE', re: /\bALTER\s+COLUMN\b[\s\S]{0,120}?\b(?:TYPE|SET\s+DATA\s+TYPE)\b/i },
  // Egy azonnal érvényesített megszorítás kizárja a régi írókat — ugyanaz a hatás, mint a NOT NULL.
  { name: 'ADD CONSTRAINT (érvényesített)', re: /\bADD\s+(?:CONSTRAINT\b[\s\S]{0,120}?)?(?:CHECK|UNIQUE|FOREIGN\s+KEY|PRIMARY\s+KEY)\b(?![\s\S]{0,120}?\bNOT\s+VALID\b)/i },
]);

// Adatot ír vagy töröl: a KÓD visszagörgetése ezt NEM vonja vissza.
const DATA_CHANGE_PATTERNS = Object.freeze([
  { name: 'TRUNCATE', re: /\bTRUNCATE\b/i },
  { name: 'DELETE', re: /\bDELETE\s+FROM\b/i },
  { name: 'UPDATE', re: /\bUPDATE\s+\w/i },
  { name: 'INSERT', re: /\bINSERT\s+INTO\b/i },
  { name: 'COPY', re: /\bCOPY\b/i },
]);

// ISMERT, VISSZAFELÉ ÁRTALMATLAN alakok — CSAK ezek mennek át deklaráció nélkül.
const EXPAND_PATTERNS = Object.freeze([
  { name: 'CREATE TABLE', re: /^\s*CREATE\s+TABLE\b/i },
  { name: 'CREATE INDEX', re: /^\s*CREATE\s+(?:UNIQUE\s+)?INDEX\b/i },
  { name: 'ADD COLUMN', re: /^\s*ALTER\s+TABLE\b[\s\S]*\bADD\s+(?:COLUMN\b)?/i },
  { name: 'ADD CONSTRAINT NOT VALID', re: /\bADD\s+CONSTRAINT\b[\s\S]*\bNOT\s+VALID\b/i },
  { name: 'DROP DEFAULT / DROP NOT NULL', re: /\bALTER\s+COLUMN\b[\s\S]{0,120}?\bDROP\s+(?:DEFAULT|NOT\s+NULL)\b/i },
  { name: 'SET DEFAULT', re: /\bALTER\s+COLUMN\b[\s\S]{0,120}?\bSET\s+DEFAULT\b/i },
  { name: 'COMMENT', re: /^\s*COMMENT\s+ON\b/i },
  { name: 'CREATE SCHEMA/TYPE/SEQUENCE', re: /^\s*CREATE\s+(?:SCHEMA|TYPE|SEQUENCE|EXTENSION)\b/i },
]);

// A kommentek nem számítanak: a szabály a VÉGREHAJTOTT mondatokról szól, nem arról, amit
// magyarázatként leírunk róluk (ugyanaz az elv, amiért a KUKA-őr is csak kód-sorokat néz).
function sqlWithoutComments(sql) {
  return String(sql || '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .filter((l) => !/^\s*--/.test(l))
    .join('\n');
}

// SZIGORÚ SemVer (R42 §2.4 két mért hibája):
//   · `03.1.0` NEM érvényes — a semver tiltja a vezető nullát; a régi alak elfogadta;
//   · `3.1.0-alpha` NEM egyenlő `3.1.0`-val — az ELŐKIADÁS KORÁBBI a végleges kiadásnál
//     (semver.org 2.0.0, 9. és 11. pont). A régi `compareSemver` 0-t adott, tehát egy
//     előkiadásra hivatkozó `KIVEZETVE` fejléc „nem korábbi"-nak számított volna.
// Ha SemVernek nevezzük, akkor a szabályát kell követni — nem egy közelítését.
function parseSemver(v) {
  const m = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/
    .exec(String(v || '').trim());
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] ? m[4].split('.') : [] };
}

// Az előkiadás-azonosítók összevetése a semver 11.4 szerint: szám < szó, szám számként,
// szó ASCII-rendben, és a HOSSZABB lista nyer, ha az előtag egyezik.
function comparePrerelease(a, b) {
  if (!a.length && !b.length) return 0;
  if (!a.length) return 1;            // a VÉGLEGES nagyobb, mint bármely előkiadás
  if (!b.length) return -1;
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] === undefined) return -1;
    if (b[i] === undefined) return 1;
    const na = /^\d+$/.test(a[i]); const nb = /^\d+$/.test(b[i]);
    if (na && nb) { if (+a[i] !== +b[i]) return +a[i] < +b[i] ? -1 : 1; continue; }
    if (na !== nb) return na ? -1 : 1;   // szám mindig kisebb, mint szó
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

function compareSemver(a, b) {
  const x = parseSemver(a); const y = parseSemver(b);
  if (!x || !y) return null;
  if (x.major !== y.major) return x.major < y.major ? -1 : 1;
  if (x.minor !== y.minor) return x.minor < y.minor ? -1 : 1;
  if (x.patch !== y.patch) return x.patch < y.patch ? -1 : 1;
  return comparePrerelease(x.prerelease, y.prerelease);
}

// A KIVEZETVE fejléc: melyik kiadásban hagyta abba a KÓD a használatot.
function declaredRetiredIn(sql) {
  const m = /^\s*--\s*KIVEZETVE:\s*([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?)\s*$/m.exec(String(sql || ''));
  return m ? m[1] : null;
}

// A migráció MONDATOKRA bontva. Nem SQL-értelmező: a pontosvessző mentén vágunk, és ha egy
// mondat felismerhetetlen, az `unknown` — tehát a durva vágás a BIZTONSÁG felé téved.
function statementsOf(sql) {
  return sqlWithoutComments(sql).split(';').map((x) => x.trim()).filter(Boolean);
}

// A szerző KIMONDOTT besorolása az `unknown`/`data_change` alakokra:
//   -- BESOROLÁS: data_change — a 2019-es sorok egységesítése, visszaállítás a 042-es mentésből
function declaredShape(sql) {
  const m = /^\s*--\s*BESOROLÁS:\s*(expand|contract|data_change)\s*[—-]\s*(.+)$/mi.exec(String(sql || ''));
  return m ? { shape: m[1].toLowerCase(), why: m[2].trim() } : null;
}

const RANK = { expand: 0, contract: 1, data_change: 2, unknown: 3 };

function classifyStatement(st) {
  const hit = (list) => list.filter((p) => p.re.test(st)).map((p) => p.name);
  const contract = hit(CONTRACTION_PATTERNS);
  if (contract.length) return { shape: 'contract', operations: contract };
  const data = hit(DATA_CHANGE_PATTERNS);
  if (data.length) return { shape: 'data_change', operations: data };
  const expand = hit(EXPAND_PATTERNS);
  if (expand.length) return { shape: 'expand', operations: expand };
  return { shape: 'unknown', operations: [`fel nem ismert alak: ${st.slice(0, 60)}${st.length > 60 ? '…' : ''}`] };
}

/**
 * Egy migráció besorolása. A verifier EZT HÍVJA — nem másolja le a logikát (KUKA-009).
 *
 * @returns {{shape:'expand'|'contract'|'data_change'|'unknown', operations:string[],
 *            retired_in:string|null, ok:boolean, reason:string}}
 */
function classifyMigration(sql, currentVersion) {
  const sts = statementsOf(sql);
  if (sts.length === 0) {
    return { shape: 'unknown', operations: [], retired_in: null, ok: false, reason: 'a migráció NEM tartalmaz végrehajtható mondatot' };
  }
  const parts = sts.map(classifyStatement);
  const worst = parts.reduce((a, b) => (RANK[b.shape] > RANK[a.shape] ? b : a));
  const operations = [...new Set(parts.filter((p) => p.shape === worst.shape).flatMap((p) => p.operations))];
  const shape = worst.shape;

  if (shape === 'expand') {
    return { shape, operations, retired_in: null, ok: true, reason: 'ismert, visszafelé ártalmatlan bővítés — a régi kód alól semmit nem vesz ki' };
  }

  if (shape === 'contract') {
    const retired = declaredRetiredIn(sql);
    if (!retired) {
      return { shape, operations, retired_in: null, ok: false,
        reason: `bontó művelet (${operations.join(', ')}) KIVEZETVE fejléc nélkül — ki kell mondani, melyik kiadásban hagyta abba a kód a használatát` };
    }
    const cmp = compareSemver(retired, currentVersion);
    if (cmp === null) {
      return { shape, operations, retired_in: retired, ok: false,
        reason: `a KIVEZETVE (${retired}) vagy a mai verzió (${currentVersion}) nem érvényes SemVer` };
    }
    if (cmp >= 0) {
      return { shape, operations, retired_in: retired, ok: false,
        reason: `a bontás UGYANABBAN (vagy későbbi) a kiadásban áll, mint ahol a kód abbahagyta a használatát (KIVEZETVE ${retired}, mai verzió ${currentVersion}) — így a visszagörgetés eltöri az adatbázist` };
    }
    return { shape, operations, retired_in: retired, ok: true,
      reason: `a kód a ${retired} kiadásban hagyta abba a használatát, a bontás ennél későbbi kiadásban áll` };
  }

  // data_change és unknown: KIMONDOTT besorolás nélkül nincs engedély (Q16).
  const decl = declaredShape(sql);
  if (!decl || decl.shape !== shape) {
    return { shape, operations, retired_in: null, ok: false,
      reason: shape === 'data_change'
        ? `ADATVÁLTOZÁS (${operations.join(', ')}) — a kód visszagörgetése ezt NEM vonja vissza; `
          + 'kell egy `-- BESOROLÁS: data_change — <mit és honnan állítható vissza>` fejléc'
        : `ISMERETLEN alak (${operations.join(' · ')}) — az őr NEM SQL-értelmező, ezért nem minősíti `
          + 'biztonságosnak; kell egy `-- BESOROLÁS: expand|contract|data_change — <indok>` fejléc' };
  }
  return { shape, operations, retired_in: declaredRetiredIn(sql), ok: true,
    reason: `a szerző kimondta a besorolást: ${decl.shape} — ${decl.why}` };
}

module.exports = {
  RELEASE_ORDER_CONTRACT_ID,
  CONTRACTION_PATTERNS,
  DATA_CHANGE_PATTERNS,
  EXPAND_PATTERNS,
  declaredShape,
  statementsOf,
  classifyMigration,
  declaredRetiredIn,
  parseSemver,
  compareSemver,
  sqlWithoutComments,
};
