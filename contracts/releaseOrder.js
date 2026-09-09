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

// BONTÓ műveletek: ezek egy RÉGI kód alól veszik ki a talajt.
const CONTRACTION_PATTERNS = Object.freeze([
  { name: 'DROP COLUMN', re: /\bALTER\s+TABLE\b[\s\S]{0,200}?\bDROP\s+COLUMN\b/i },
  { name: 'DROP TABLE', re: /\bDROP\s+TABLE\b/i },
  { name: 'RENAME COLUMN', re: /\bALTER\s+TABLE\b[\s\S]{0,200}?\bRENAME\s+COLUMN\b/i },
  { name: 'RENAME TABLE', re: /\bALTER\s+TABLE\b[\s\S]{0,200}?\bRENAME\s+TO\b/i },
  { name: 'SET NOT NULL', re: /\bALTER\s+COLUMN\b[\s\S]{0,120}?\bSET\s+NOT\s+NULL\b/i },
  { name: 'DROP TYPE', re: /\bDROP\s+TYPE\b/i },
  { name: 'ALTER COLUMN TYPE', re: /\bALTER\s+COLUMN\b[\s\S]{0,120}?\b(?:TYPE|SET\s+DATA\s+TYPE)\b/i },
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

function parseSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(String(v || '').trim());
  return m ? { major: +m[1], minor: +m[2], patch: +m[3] } : null;
}

function compareSemver(a, b) {
  const x = parseSemver(a); const y = parseSemver(b);
  if (!x || !y) return null;
  if (x.major !== y.major) return x.major < y.major ? -1 : 1;
  if (x.minor !== y.minor) return x.minor < y.minor ? -1 : 1;
  if (x.patch !== y.patch) return x.patch < y.patch ? -1 : 1;
  return 0;
}

// A KIVEZETVE fejléc: melyik kiadásban hagyta abba a KÓD a használatot.
function declaredRetiredIn(sql) {
  const m = /^\s*--\s*KIVEZETVE:\s*([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?)\s*$/m.exec(String(sql || ''));
  return m ? m[1] : null;
}

/**
 * Egy migráció besorolása. A verifier EZT HÍVJA — nem másolja le a logikát (KUKA-009).
 *
 * @returns {{shape:'expand'|'contract', operations:string[], retired_in:string|null,
 *            ok:boolean, reason:string}}
 */
function classifyMigration(sql, currentVersion) {
  const body = sqlWithoutComments(sql);
  const operations = CONTRACTION_PATTERNS.filter((p) => p.re.test(body)).map((p) => p.name);
  if (operations.length === 0) {
    return { shape: 'expand', operations: [], retired_in: null, ok: true, reason: 'bővítés — a régi kód alól semmit nem vesz ki' };
  }
  const retired = declaredRetiredIn(sql);
  if (!retired) {
    return {
      shape: 'contract', operations, retired_in: null, ok: false,
      reason: `bontó művelet (${operations.join(', ')}) KIVEZETVE fejléc nélkül — ki kell mondani, melyik kiadásban hagyta abba a kód a használatát`,
    };
  }
  const cmp = compareSemver(retired, currentVersion);
  if (cmp === null) {
    return { shape: 'contract', operations, retired_in: retired, ok: false, reason: `a KIVEZETVE (${retired}) vagy a mai verzió (${currentVersion}) nem értelmezhető verziószám` };
  }
  if (cmp >= 0) {
    return {
      shape: 'contract', operations, retired_in: retired, ok: false,
      reason: `a bontás UGYANABBAN (vagy későbbi) a kiadásban áll, mint ahol a kód abbahagyta a használatát (KIVEZETVE ${retired}, mai verzió ${currentVersion}) — így a visszagörgetés eltöri az adatbázist`,
    };
  }
  return {
    shape: 'contract', operations, retired_in: retired, ok: true,
    reason: `a kód a ${retired} kiadásban hagyta abba a használatát, a bontás ennél későbbi kiadásban áll — a visszagörgetés biztonságos`,
  };
}

module.exports = {
  RELEASE_ORDER_CONTRACT_ID,
  CONTRACTION_PATTERNS,
  classifyMigration,
  declaredRetiredIn,
  parseSemver,
  compareSemver,
  sqlWithoutComments,
};
