#!/usr/bin/env node
// V3 — PÁRHUZAMOS ÍRÁS VALÓDI PostgreSQL-EN (PCC-01). `npm run proof:pg-concurrency`
//
// AZ OPERÁTORI KIKÖTÉS (R146 §8): *„jogosultsági/hatáskör/idempotencia regressziók
// PostgreSQL-en, célzott párhuzamos írással"*, és (§4): *„PostgreSQL-specifikus atomiságot és
// párhuzamos írást VALÓDI PostgreSQL-en mérj."*
//
// AMIT MÉR, KÉT TENGELYEN:
//   (A) EGYSZERISÉG — N folyamat UGYANAZZAL az idempotencia-kulccsal ír. Elvárás: PONTOSAN EGY
//       nyer, a többi NEVEZETT `once_only_race` kimenetet kap (nem programhibát). Ez az a hely,
//       ahol a tárolóváltás némán elbukott volna: a régi felismerés két SQLite-jelre épült.
//   (B) KULCS-INVARIÁNS — N folyamat UGYANAZT a tagság-sort írja. Elvárás: PONTOSAN EGY sor, és
//       a vesztesek egyediség-sértést (SQLSTATE 23505) kapnak, nem duplikált tagságot.
//
// A MÉRÉS SZAVAI (D-VS-693): az ALAPSOKASÁG (hány folyamat indult) mindig kiíródik; a nulla
// ütközés ÜRES alapsokaságon nem zöld, hanem „nincs alkalmazható eset".
import { spawn } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRepoEnv } from './lib/vs_tool_env.mjs';
import { openPgStore } from '../v3ref/pgStore.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadRepoEnv(ROOT);
const CHILD = join(ROOT, 'tools/v3_pg_concurrency_child.mjs');
const N = Number(process.env.VS_RACE_N || 8);

function runChildren(url, mode) {
  const startAt = Date.now() + 1200;    // közös rajt: a gyerekek indulása ennél tovább tart
  return Promise.all(Array.from({ length: N }, (_, i) => new Promise((res) => {
    const p = spawn(process.execPath, [CHILD, url, mode, String(startAt), `c${i}`], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; let err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => {
      try { res({ code, ...JSON.parse(out.trim().split('\n').pop()) }); }
      catch { res({ code, tag: `c${i}`, out: null, crashed: true, err: err.slice(-400) }); }
    });
  })));
}

const url = String(process.env.DATABASE_URL || '').trim();
if (!url) {
  console.error('proof:pg-concurrency — nincs DATABASE_URL: ELAKADT MÉRÉS, a párhuzamosságról semmit nem állítunk.');
  process.exit(2);
}

console.log('PÁRHUZAMOS ÍRÁS VALÓDI PostgreSQL-EN');
console.log('='.repeat(78));
console.log(`ALAPSOKASÁG: ${N} KÜLÖN OS-folyamat, egyenként SAJÁT kapcsolattal, közös rajttal.`);

const store = openPgStore(url);
store.run('DELETE FROM operation_once WHERE book_id = ?', 'race-book');
store.run('DELETE FROM membership WHERE book_id = ?', 'race-book');
// AZ IDEGEN KULCS SZÜLEI ELŐBB. Enélkül a verseny NEM az egyediségen dőlne el, hanem idegen
// kulcs hiányán (23503) — és a próba „0 nyertest" mérne egy ÉP rendszeren. Ez a mérő hibája
// volt az első futáson, és pontosan az, amiről a KUKA-171 szól: ami megállít, annak NEVE legyen.
store.run("INSERT INTO book (id, name) VALUES (?,?) ON CONFLICT DO NOTHING", 'race-book', 'Verseny');
store.run("INSERT INTO subject (id, kind) VALUES (?,?) ON CONFLICT DO NOTHING", 'race-subject', 'person');

const problems = [];

// ── (A) EGYSZERISÉG ────────────────────────────────────────────────────────────────────────────
const a = await runChildren(url, 'once-only');
const winners = a.filter((r) => r.out && r.out.ok === true);
const races = a.filter((r) => r.out && r.out.ok === false && r.out.reason === 'once_only_race');
const crashed = a.filter((r) => r.crashed || (r.out && r.out.threw));
const rows = store.get('SELECT COUNT(*) AS n FROM operation_once WHERE book_id = ?', 'race-book').n;
console.log('\n(A) EGYSZERISÉG — ugyanaz az idempotencia-kulcs, egyszerre');
console.log(`    nyertes: ${winners.length} · nevezett ÜTKÖZÉS: ${races.length} · összeomlott: ${crashed.length}`);
console.log(`    a tárolóban: ${rows} sor`);
if (winners.length !== 1) problems.push(`(A) nem PONTOSAN EGY nyertes: ${winners.length}`);
if (rows !== 1) problems.push(`(A) nem PONTOSAN EGY sor született: ${rows}`);
if (races.length !== N - 1) problems.push(`(A) a vesztesek nem mind NEVEZETT ütközést kaptak: ${races.length}/${N - 1}`);
if (crashed.length) problems.push(`(A) ${crashed.length} folyamat programhibával állt meg (a versenynek NEVEZETT kimenete kell legyen)`);
for (const c of crashed) console.log(`    összeomlás: ${c.tag} — ${(c.err || c.out?.message || '').slice(0, 200)}`);

// ── (B) KULCS-INVARIÁNS ────────────────────────────────────────────────────────────────────────
const b = await runChildren(url, 'membership');
const bWin = b.filter((r) => r.out && r.out.ok === true);
const bUnique = b.filter((r) => r.out && r.out.unique === true);
const mrows = store.get('SELECT COUNT(*) AS n FROM membership WHERE book_id = ?', 'race-book').n;
console.log('\n(B) KULCS-INVARIÁNS — ugyanaz a tagság-sor, egyszerre');
console.log(`    nyertes: ${bWin.length} · egyediség-sértés (23505): ${bUnique.length}`);
console.log(`    a tárolóban: ${mrows} sor`);
if (bWin.length !== 1) problems.push(`(B) nem PONTOSAN EGY nyertes: ${bWin.length}`);
if (mrows !== 1) problems.push(`(B) nem PONTOSAN EGY tagság-sor: ${mrows}`);
if (bUnique.length !== N - 1) {
  const codes = [...new Set(b.filter((r) => r.out && r.out.ok === false).map((r) => r.out.code || '(nincs kód)'))];
  problems.push(`(B) a vesztesek nem mind egyediség-sértést kaptak: ${bUnique.length}/${N - 1} `
    + `— a kapott SQLSTATE-ek: ${codes.join(', ')}`);
}

store.run('DELETE FROM operation_once WHERE book_id = ?', 'race-book');
store.run('DELETE FROM membership WHERE book_id = ?', 'race-book');
store.close();

console.log(`\n${'='.repeat(78)}`);
if (problems.length === 0) {
  console.log(`RENDBEN — ${N} folyamatos versenyben mindkét invariáns tartott.`);
  process.exit(0);
}
console.log('LELET:');
for (const p of problems) console.log(`  · ${p}`);
process.exit(3);
