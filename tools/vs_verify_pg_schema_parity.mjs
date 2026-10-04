#!/usr/bin/env node
// V3 — A KÉT SÉMA-ALAK PARITÁSÁNAK ŐRE (PGS-02). `npm run verify:pg-schema-parity`
//
// MIÉRT LÉTEZIK. A kanonikus séma (`v3ref/store.mjs`, SQLite) és a PostgreSQL-migráció
// (`migrations/001_…`) UGYANAZT a fogalmat hordozza két alakban. A generátor a SZÜLETÉSÜKET köti
// össze — de a generátor EGYSZER fut. Ha holnap valaki ÚJ oszlopot tesz a kanonikus sémába, a
// migráció nem változik vele, és a kettő NÉMÁN elcsúszik: a referencia-battéria zöld marad, a
// telepített rendszer pedig hiányzó oszlopra fut. Ez a KUKA-018 (egy fogalom, egy otthon) és a
// KUKA-051 (a védelem SZABÁLY legyen, ne lista) együtt.
//
// EZÉRT MÉRÜNK MINDKÉT IRÁNYBAN: ami a magban van, legyen a migrációban is — ÉS fordítva, ami a
// migrációban van, annak legyen helye. A hiányzó és a TÖBBLET egyformán lelet.
//
// A DEKLARÁLT KIVÉTEL. A migráció egy ALKALMAZÁS-rétegbeli táblát is hordoz
// (`app_demo_fixture`), ami fogalmilag nem a magé. Ez NEVESÍTETT kivétel, nem néma eltérés — és
// ha egy újabb ilyen születne, azt ide KELL írni, különben az őr piros (KUKA-048).
import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { canonicalSchemaText, splitStatements } from './v3_pg_schema_gen.mjs';

// A KÉT ALAKOT KÉT KÜLÖN VÁGÓ OLVASSA, ÉS EZ SZÁNDÉKOS. A kanonikus séma SQLite-alakú (a trigger
// törzse `BEGIN … END;`), a migráció PostgreSQL-alakú (a törzs DOLLÁR-IDÉZÉSBEN áll, és saját
// pontosvesszőket tartalmaz). Egyetlen vágóval mérve a migráció 40 táblájából 17 látszott — a
// mérő NÉMÁN alul-olvasott, és 22 „hiányzó" táblát jelentett egy HIÁNYTALAN migrációra. A hazug
// piros ugyanolyan rossz, mint a hazug zöld (KUKA-049 · KUKA-093).
const require = createRequire(import.meta.url);
const { statementsOf: pgStatements, sqlWithoutComments } = require('../contracts/releaseOrder.js');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATION = join(ROOT, 'migrations/001_v3_mag_sema.sql');

/** A migráció által hordozott, de a maghoz NEM tartozó táblák — kimondva. */
const APP_LAYER_TABLES = Object.freeze(['app_demo_fixture']);
/** A migrációs futtató saját nyilvántartása — nem séma-tábla, futásidőben születik. */
const RUNNER_TABLES = Object.freeze(['schema_migration']);

/** `CREATE TABLE x ( … )` → { név → oszlopnevek }. Nem SQL-értelmező: a szerkezetet olvassa. */
function tablesOf(sql, split) {
  const out = new Map();
  for (const st of split(sql)) {
    const code = st.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');
    const m = /^\s*CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([A-Za-z_][\w]*)"?\s*\(([\s\S]*)\)\s*;?\s*$/i.exec(code);
    if (!m) continue;
    const cols = [];
    let depth = 0; let line = '';
    for (const ch of m[2]) {
      if (ch === '(') depth += 1;
      if (ch === ')') depth -= 1;
      if (ch === ',' && depth === 0) { cols.push(line); line = ''; continue; }
      line += ch;
    }
    cols.push(line);
    const names = cols
      .map((c) => c.split('\n').filter((l) => !/^\s*--/.test(l)).join(' ').trim())
      .filter(Boolean)
      // A táblaszintű kényszerek (PRIMARY KEY (…), UNIQUE (…), CHECK (…), FOREIGN KEY …) nem oszlopok.
      .filter((c) => !/^(PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY|CONSTRAINT)\b/i.test(c))
      .map((c) => (/^"?([A-Za-z_][\w]*)"?/.exec(c) || [])[1])
      .filter(Boolean);
    out.set(m[1], names);
  }
  return out;
}

const core = tablesOf(canonicalSchemaText(), splitStatements);
const migText = readFileSync(MIGRATION, 'utf8');
const mig = tablesOf(migText, pgStatements);

const problems = [];

// 1. MAG → MIGRÁCIÓ
for (const [t, cols] of core) {
  if (!mig.has(t)) { problems.push(`a magban van, a migrációból HIÁNYZIK: ${t}`); continue; }
  const have = new Set(mig.get(t));
  const missing = cols.filter((c) => !have.has(c));
  if (missing.length) problems.push(`${t}: a migrációból hiányzó oszlop(ok): ${missing.join(', ')}`);
}
// 2. MIGRÁCIÓ → MAG
for (const [t, cols] of mig) {
  if (APP_LAYER_TABLES.includes(t) || RUNNER_TABLES.includes(t)) continue;
  if (!core.has(t)) { problems.push(`a migrációban van, a magban NINCS és nem deklarált kivétel: ${t}`); continue; }
  const have = new Set(core.get(t));
  const extra = cols.filter((c) => !have.has(c));
  if (extra.length) problems.push(`${t}: a migráció TÖBBLET oszlopa: ${extra.join(', ')}`);
}
// 3. A triggerek SZÁMA — az őrök nem veszhetnek el a tárolóváltáson
const coreTrg = (canonicalSchemaText().match(/^CREATE TRIGGER/gm) || []).length;
const migTrg = (migText.match(/^CREATE TRIGGER/gm) || []).length;
if (coreTrg !== migTrg) problems.push(`trigger-szám eltérés: mag ${coreTrg} · migráció ${migTrg}`);
// 4. SQLite-specifikus alak NEM maradhat a migráció VÉGREHAJTOTT mondataiban.
//    A KOMMENTEKBEN maradhat: a kanonikus séma indoklásai SZÓ SZERINT hoznak át olyan mondatokat
//    (`INSERT OR REPLACE INTO invite_terms …`), amelyek egy MEGHIÚSÍTOTT TÁMADÁST írnak le. Azok
//    magyarázatok, nem utasítások — és ha a kommentre mérnénk, az őr a saját dokumentációnkat
//    jelentené hibának (KUKA-091: a gyűjtő-mappa nem egy fogalom mappája).
const migCode = sqlWithoutComments(migText);
for (const [name, re] of [['AUTOINCREMENT', /\bAUTOINCREMENT\b/], ['RAISE(ABORT', /RAISE\s*\(\s*ABORT/], ['INSERT OR', /\bINSERT\s+OR\s+(IGNORE|REPLACE)\b/]]) {
  if (re.test(migCode)) problems.push(`a migrációban SQLite-specifikus alak maradt: ${name}`);
}

console.log('A KÉT SÉMA-ALAK PARITÁSA (PGS-02)');
console.log('='.repeat(74));
console.log(`  mag: ${core.size} tábla · ${coreTrg} trigger`);
console.log(`  migráció: ${mig.size} tábla (ebből deklarált kivétel: ${APP_LAYER_TABLES.length}) · ${migTrg} trigger`);
if (problems.length === 0) { console.log(`RESULT: PASS — a két alak fedi egymást, mindkét irányban.`); process.exit(0); }
console.log('LELET:');
for (const p of problems) console.log(`  · ${p}`);
console.log(`RESULT: FAIL — ${problems.length} eltérés`);
process.exit(1);
