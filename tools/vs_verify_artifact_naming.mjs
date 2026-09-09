#!/usr/bin/env node
// Valach System — A GENERÁLT FÁJLOK NEVÉNEK ÉS HELYÉNEK ŐRE (ART-01). READ-ONLY + offline. Exit 0/1.
//
// Operátori parancs: „Az újra generálódó fileok (script logok, backupok) a következő file néven
// legyenek: v3_v3.1.1_20260909_104201_…"
//
// Az őr a `contracts/artifactNaming.js` feloldót HÍVJA (nem másolja le a mintát — KUKA-009), és
// mindent a VALÓDI `package.json`-hoz mér, nem beírt értékhez.
//
//   ART01  a feloldó pontosan az operátor által kért alakot adja (karakterre, fixtúrákon)
//   ART02  a verzió a package.json-ból jön, és a hibás bemenet MONDATTAL áll meg (nem néma)
//   ART03  a területek zárt halmaza mind a `var/` alatt van, és mindnek van MAGYARÁZATA
//   ART04  a `var/` gitignore-olva van, a szerkezet mégis LÁTSZIK a gitben (var/README.md)
//   ART05  egyetlen szerszám sem gyárt KÉZZEL időbélyeges nevet (a V2-ben 40 tette, 3 nyelvjárásban)
//   ART06  ÖNPRÓBA: a név RENDEZHETŐ — és az ELLENPÁR kimondja, mit NEM rendez
//   ART07  a név VISSZAFEJTHETŐ: a generált névből kiolvasható, melyik kiadás írta és mikor
//
// ART06 MIÉRT — ÉS EGY SAJÁT JAVÍTÁS. Az első alakomban azt írtam ide, hogy a `v3_` előtag azért
// van, hogy a lista ábécé-rendben idő- és vonal-helyes legyen. A SAJÁT MÉRÉSEM CÁFOLTA MEG: az
// előtaggal is a `v3.10` áll a `v3.9` ELŐTT, tehát az előtag NEM rendez. Ami rendez: a fix
// szélességű dátum+idő — EGY VONALON BELÜL az ábécé-rend pontosan idő-rend. Az előtag a szemnek
// szól (egy pillantás: melyik vonal), és az operátor így kérte. A próba mindkét állítást méri,
// az ellenpárt is (KUKA-033: a levezetett állítás a méréséig csak javaslat).

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const N = require(join(ROOT, 'contracts', 'artifactNaming.js'));

let pass = 0, fail = 0; const bad = [];
const check = (id, name, ok, detail = '') => {
  if (ok) pass++; else { fail++; bad.push(`  FAIL [${id}] ${name}${detail ? ' — ' + detail : ''}`); }
  return Boolean(ok);
};

const pkg = JSON.parse(read('package.json'));
const VERSION = pkg.version;
const AT = new Date(2026, 8, 9, 10, 42, 1); // 2026-09-09 10:42:01 HELYI idő — az operátor példája

// ── ART01: az operátor által kért alak, KARAKTERRE ───────────────────────────────────────────────
// A parancsban szereplő minta: v3_v3.1.1_20260909_104201_…
check('ART01', 'a feloldó pontosan az operátor mintáját adja (v3_v3.1.1_20260909_104201_…)',
  N.artifactName({ kind: 'script_log', ext: 'txt', version: '3.1.1', at: AT })
    === 'v3_v3.1.1_20260909_104201_script_log.txt',
  N.artifactName({ kind: 'script_log', ext: 'txt', version: '3.1.1', at: AT }));
check('ART01', 'a mai verzióval is helyes alakot ad (előkiadás-jelölővel együtt)',
  N.artifactName({ kind: 'sema mentés', ext: 'SQL', version: VERSION, at: AT })
    === `v3_v${VERSION}_20260909_104201_sema_mentes.sql`,
  N.artifactName({ kind: 'sema mentés', ext: 'SQL', version: VERSION, at: AT }));
check('ART01', 'az ékezet és a szóköz kisbetűs, alulvonásos alakra fordul (hordozható fájlnév)',
  N.slug('Készlet Átvilágítás — Fordulónap') === 'keszlet_atvilagitas_fordulonap',
  N.slug('Készlet Átvilágítás — Fordulónap'));
check('ART01', 'az idő a gép HELYI ideje (nem UTC — a fájlnevet ember olvassa a saját gépén)',
  N.stampParts(AT).time === '104201' && N.stampParts(AT).date === '20260909');

// ── ART02: a verzió NEM gépelhető, a hiba MONDATTAL áll meg ──────────────────────────────────────
const throwsWith = (fn, re) => { try { fn(); return false; } catch (e) { return re.test(e.message); } };
check('ART02', 'verzió nélkül NEM ad nevet, és a mondat megmondja, honnan kell jönnie',
  throwsWith(() => N.artifactName({ kind: 'x', ext: 'txt' }), /package\.json/));
check('ART02', 'értelmezhetetlen verzióra MONDATTAL áll meg (nem néma tartalék-érték — KUKA-020)',
  throwsWith(() => N.artifactName({ kind: 'x', ext: 'txt', version: 'kacsa' }), /verzió/));
check('ART02', 'üres megnevezésre MONDATTAL áll meg', throwsWith(() => N.artifactName({ kind: '  ', ext: 'txt', version: VERSION }), /megnevezés/));
check('ART02', 'ismeretlen területre MONDATTAL áll meg, és FELSOROLJA a választhatókat (KUKA-064)',
  throwsWith(() => N.artifactPath({ area: 'nincs_ilyen', kind: 'x', ext: 'txt', version: VERSION }),
    /ismeretlen terület[\s\S]*logs/));

// ── ART03: a területek — zárt halmaz, mind a var/ alatt, mind magyarázattal ──────────────────────
const areaKeys = Object.keys(N.AREAS);
check('ART03', `a területek mind a \`${N.VAR_ROOT}/\` alatt vannak (${areaKeys.length} db: ${areaKeys.join(', ')})`,
  areaKeys.length > 0 && areaKeys.every((k) => N.AREAS[k].dir.startsWith(`${N.VAR_ROOT}/`)));
check('ART03', 'minden területnek van ÉRDEMI magyarázata (mire való) — a néma bejegyzés nincs',
  areaKeys.every((k) => (N.AREAS[k].what || '').length > 15),
  areaKeys.filter((k) => (N.AREAS[k].what || '').length <= 15).join(', '));
check('ART03', 'az üzleti adatot hordozó területek KI VANNAK MONDVA (mentés · kivitel)',
  /ÜZLETI ADAT/.test(N.AREAS.backups.what) && /ÜZLETI ADAT/.test(N.AREAS.exports.what));
check('ART03', 'a teljes út a területtel együtt áll össze',
  N.artifactPath({ area: 'backups', kind: 'sema_mentes', ext: 'sql', version: '3.1.1', at: AT })
    === 'var/backups/v3_v3.1.1_20260909_104201_sema_mentes.sql');

// ── ART04: a var/ nem kerülhet a repóba, a SZERKEZETE viszont látszik ────────────────────────────
const gitignore = existsSync(join(ROOT, '.gitignore')) ? read('.gitignore') : '';
check('ART04', 'a `var/` tartalma gitignore-olva (üzleti adat SOHA nem kerülhet a repóba)',
  /^var\/\*$/m.test(gitignore) || /^var\/$/m.test(gitignore));
check('ART04', 'a szerkezet mégis LÁTSZIK a gitben (var/README.md kivétel) — különben egy új körben senki nem tudja, hova írjon',
  /^!var\/README\.md$/m.test(gitignore) && existsSync(join(ROOT, 'var', 'README.md')));
const varReadme = existsSync(join(ROOT, 'var', 'README.md')) ? read('var/README.md') : '';
check('ART04', 'a var/README.md MINDEN területet felsorol (a lap nem csúszhat el a kódtól — KUKA-018)',
  areaKeys.every((k) => varReadme.includes(N.AREAS[k].dir)),
  areaKeys.filter((k) => !varReadme.includes(N.AREAS[k].dir)).join(', '));

// ── ART05: senki nem gyárt KÉZZEL időbélyeges nevet ──────────────────────────────────────────────
// A V2-ben MÉRVE: 40 szerszám tette, legalább három különböző alakban (KUKA-003). Itt tiltjuk.
const HAND_BUILT = [
  { re: /toISOString\(\)\s*\.\s*(slice|replace)/, why: 'kézzel vágott ISO-időbélyeg fájlnévhez' },
  { re: /replace\(\/\[-:T\]\/g/, why: 'kézzel tisztított időbélyeg' },
  { re: /Date\.now\(\)\s*\)?\s*\}?\s*[.`]\s*(sql|json|csv|txt|log)/i, why: 'ezredmásodperc a fájlnévben' },
];
const scanDirs = ['tools', 'v3ref', 'contracts'];
const SELF = new Set(['contracts/artifactNaming.js', 'tools/vs_verify_artifact_naming.mjs']);
const files = [];
for (const d of scanDirs) {
  if (!existsSync(join(ROOT, d))) continue;
  (function walk(dir) {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); }
      else if (/\.(mjs|js)$/.test(e.name) && !SELF.has(p)) files.push(p);
    }
  })(d);
}
const codeOnly = (s) => s.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
for (const rule of HAND_BUILT) {
  const hits = files.filter((f) => rule.re.test(codeOnly(read(f))));
  check('ART05', `egyetlen szerszám sem gyárt kézzel időbélyeges nevet (${rule.why})`, hits.length === 0, hits.join(', '));
}
check('ART05', `a mérés nem ÜRES: van mit átnézni (${files.length} forrás-fájl a ${scanDirs.join(', ')} alatt)`,
  files.length >= 8);

// ── ART06: ÖNPRÓBA — a név RENDEZHETŐ (ezért áll ott a `v3_` előtag) ─────────────────────────────
const seq = [
  N.artifactName({ kind: 'a', ext: 'txt', version: '3.1.1', at: new Date(2026, 8, 9, 10, 42, 1) }),
  N.artifactName({ kind: 'a', ext: 'txt', version: '3.1.1', at: new Date(2026, 8, 9, 10, 42, 2) }),
  N.artifactName({ kind: 'a', ext: 'txt', version: '3.2.0', at: new Date(2026, 8, 10, 8, 0, 0) }),
];
check('ART06', 'önpróba: AZONOS vonalon az ábécé-rend IDŐ-rend is',
  [...seq].sort().join('|') === seq.join('|'), seq.join(' | '));
// A vonalak nem keverednek: a v4 kimenete a v3-asok után áll.
const mixed = [
  N.artifactName({ kind: 'a', ext: 'txt', version: '3.9.0', at: AT }),
  N.artifactName({ kind: 'a', ext: 'txt', version: '3.10.0', at: AT }),
  N.artifactName({ kind: 'a', ext: 'txt', version: '4.0.0', at: AT }),
];
const sorted = [...mixed].sort();
check('ART06', 'önpróba: a v4 kimenete a v3-asok UTÁN áll — a vonalak nem keverednek',
  sorted[sorted.length - 1].startsWith('v4_') && sorted.slice(0, 2).every((s) => s.startsWith('v3_')),
  sorted.join(' | '));

// ELLENPÁR — ÉS AMIT KIMOND. Az első alakomban azt állítottam, hogy az előtag akadályozza meg a
// `v3.10` becsúszását a `v3.9` elé. A MÉRÉS EZT MEGCÁFOLTA: az előtaggal is a 3.10 áll elöl.
// A próba most azt méri, ami IGAZ — hogy a verzió NEM rendezési kulcs, tehát a listát DÁTUM szerint
// kell nézni, nem verzió szerint (KUKA-033: a levezetett állítás a mérésig csak javaslat).
const withPrefix = [...mixed].sort();
const withoutPrefix = [...mixed.map((n) => n.replace(/^v\d+_/, ''))].sort();
check('ART06', 'önpróba (ELLENPÁR): a verzió NEM rendez — a 3.10 az előtaggal IS a 3.9 elé kerül, tehát az előtag nem rendezési eszköz',
  /v3\.10\.0/.test(withPrefix[0]) && /v?3\.10\.0/.test(withoutPrefix[0]),
  `előtaggal: ${withPrefix[0]} · nélküle: ${withoutPrefix[0]}`);

// AMI VISZONT REND: EGY VONALON BELÜL az ábécé-rend IDŐ-rend, mert a dátum+idő fix szélességű.
const sameLine = [
  N.artifactName({ kind: 'a', ext: 'txt', version: '3.1.1', at: new Date(2026, 11, 31, 23, 59, 59) }),
  N.artifactName({ kind: 'a', ext: 'txt', version: '3.1.1', at: new Date(2026, 0, 1, 0, 0, 0) }),
  N.artifactName({ kind: 'a', ext: 'txt', version: '3.1.1', at: new Date(2026, 8, 9, 10, 42, 1) }),
];
check('ART06', 'önpróba: AZONOS verzión az ábécé-rend pontosan IDŐ-rend (fix szélességű dátum+idő) — EZ a név valódi értéke',
  [...sameLine].sort().join('|') === [...sameLine].sort((a, b) =>
    (N.parseArtifactName(a).date + N.parseArtifactName(a).time).localeCompare(
      N.parseArtifactName(b).date + N.parseArtifactName(b).time)).join('|'));

// ── ART07: a név VISSZAFEJTHETŐ ──────────────────────────────────────────────────────────────────
const made = N.artifactName({ kind: 'keszlet riport', ext: 'csv', version: VERSION, at: AT });
const back = N.parseArtifactName(made);
check('ART07', 'a generált névből visszaolvasható a kiadás és az időpont (melyik kód írta, mikor)',
  back && back.version === VERSION && back.date === '20260909' && back.time === '104201'
  && back.kind === 'keszlet_riport' && back.ext === 'csv', JSON.stringify(back));
check('ART07', 'az idegen alakú név NEM ad hamis eredményt (a néma tartalék rosszabb a nemleges válasznál)',
  N.parseArtifactName('backup_2026.sql') === null && N.parseArtifactName('') === null);

console.log('');
console.log('GENERÁLT FÁJL NÉV + HELY ŐR (ART-01)');
console.log('='.repeat(50));
if (bad.length) console.log(bad.join('\n'));
console.log(`  minta a mai verzióval: ${N.artifactPath({ area: 'backups', kind: 'sema_mentes', ext: 'sql', version: VERSION, at: AT })}`);
console.log(`  területek: ${areaKeys.map((k) => N.AREAS[k].dir).join(' · ')}`);
console.log(`  kézi időbélyeg-gyártásra átnézve: ${files.length} forrás-fájl`);
console.log(`RESULT: ${pass}/${pass + fail} PASS${fail ? ` — ${fail} FAIL` : ''}`);
process.exit(fail ? 1 : 0);
