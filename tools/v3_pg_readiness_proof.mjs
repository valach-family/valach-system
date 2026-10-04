#!/usr/bin/env node
// V3 — A KÉSZENLÉT ÉLŐ BIZONYÍTÉKA (RDY-02). `npm run proof:pg-readiness`
//
// Az R150 §3 öt célzott esetét méri VALÓDI PostgreSQL-en és VALÓDI HTTP-n: üres nyilvántartás ·
// hiányzó (KÖZTES) verzió · ellenőrzőösszeg-eltérés · megfelelő séma · elérhetetlen adatbázis.
// Plusz kettő, amit a parancs elve követel: a válasz TITOKMENTES, és az előre-kompatibilis
// TÖBBLET nem hiba.
//
// MIÉRT ÉLŐ, ÉS NEM CSAK A FELOLDÓ EGYSÉGPRÓBÁJA. Mert a hiba, amit javítunk, pont a BEKÖTÉSBEN
// élt: a feloldó helyessége nem bizonyítja, hogy a végpont tényleg azt kérdezi (KUKA-207 — amit
// próba nem tud MEGHÍVNI, azt bizalomból hisszük).
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRepoEnv } from './lib/vs_tool_env.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadRepoEnv(ROOT);
const { startServer } = await import('../v3app/server.mjs');
const { openPgStore } = await import('../v3ref/pgStore.mjs');

const url = String(process.env.DATABASE_URL || '').trim();
if (!url) { console.error('proof:pg-readiness — nincs DATABASE_URL: ELAKADT MÉRÉS.'); process.exit(2); }
const PSQL = process.env.VS_PSQL || 'psql';
const admin = new URL(url); admin.pathname = '/postgres';
const DB = `v3ready_${Date.now().toString(36)}`;
const target = new URL(url); target.pathname = `/${DB}`;
const sh = (a) => execFileSync(PSQL, a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const marks = [];
const check = (id, name, ok, detail) => { marks.push({ id, name, ok, detail }); console.log(`  ${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? `\n          ${detail}` : ''}`); };

async function ask(dbUrl) {
  const prev = process.env.DATABASE_URL;
  process.env.DATABASE_URL = dbUrl;
  let app = null;
  try {
    app = await startServer({ port: 0, host: '127.0.0.1', devSurface: false });
    const r = await fetch(`http://127.0.0.1:${app.port}/ready`);
    return { status: r.status, body: await r.json() };
  } catch (e) {
    return { status: null, startupError: String(e && e.code || e.message) };
  } finally {
    if (app) await app.close();
    process.env.DATABASE_URL = prev;
  }
}

console.log('A KÉSZENLÉT ÉLŐ BIZONYÍTÉKA (RDY-02) — valódi PostgreSQL, valódi HTTP');
console.log('='.repeat(78));

try {
  sh(['-d', admin.toString(), '-v', 'ON_ERROR_STOP=1', '-q', '-c', `CREATE DATABASE ${DB}`]);

  // ── 1. ÜRES ADATBÁZIS — nincs is nyilvántartó tábla ─────────────────────────────────────────
  let r = await ask(target.toString());
  check('R1', 'ÜRES adatbázis (nincs nyilvántartás) → 503, nevezett',
    r.status === 503 && r.body.reason === 'migration_ledger_missing',
    `HTTP ${r.status} · ${r.body && r.body.reason}`);

  // ── 2. ÜRES NYILVÁNTARTÁS — a tábla megvan, sor nincs ───────────────────────────────────────
  sh(['-d', target.toString(), '-v', 'ON_ERROR_STOP=1', '-q', '-c',
    'CREATE TABLE schema_migration (version text PRIMARY KEY, file text NOT NULL, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now(), applied_by text NOT NULL, duration_ms integer NOT NULL)']);
  r = await ask(target.toString());
  check('R2', 'ÜRES nyilvántartás → 503, a hiányzó verziók NEVESÍTVE',
    r.status === 503 && r.body.reason === 'migration_missing' && Array.isArray(r.body.missing_versions) && r.body.missing_versions.length > 0,
    `HTTP ${r.status} · ${r.body && r.body.reason} · hiányzik: ${JSON.stringify(r.body && r.body.missing_versions)}`);

  // ── 3. MEGFELELŐ SÉMA — a rendes migráció lefuttatva ────────────────────────────────────────
  sh(['-d', target.toString(), '-v', 'ON_ERROR_STOP=1', '-q', '-c', 'DROP TABLE schema_migration']);
  execFileSync(process.execPath, [resolve(ROOT, 'tools/v3_db_migrate.mjs')],
    { env: { ...process.env, DATABASE_URL: target.toString() }, stdio: 'ignore' });
  r = await ask(target.toString());
  check('R3', 'MEGFELELŐ séma → 200, ready',
    r.status === 200 && r.body.reason === 'ready' && r.body.ok === true,
    `HTTP ${r.status} · fej: ${r.body && r.body.schema_head} · többlet: ${JSON.stringify(r.body && r.body.ahead_versions)}`);

  // ── 4. ELLENŐRZŐÖSSZEG-ELTÉRÉS ──────────────────────────────────────────────────────────────
  const s1 = openPgStore(target.toString());
  const realSha = s1.get('SELECT sha256 FROM schema_migration WHERE version = ?', '001').sha256;
  s1.run('UPDATE schema_migration SET sha256 = ? WHERE version = ?', 'f'.repeat(64), '001');
  s1.close();
  r = await ask(target.toString());
  check('R4', 'ELLENŐRZŐÖSSZEG-eltérés → 503, az érintett verzió NEVESÍTVE',
    r.status === 503 && r.body.reason === 'migration_checksum_mismatch' && (r.body.mismatched_versions || []).includes('001'),
    `HTTP ${r.status} · ${r.body && r.body.reason} · ${JSON.stringify(r.body && r.body.mismatched_versions)}`);

  // ── 5. HIÁNYZÓ (KÖZTES) VERZIÓ — a sor törlésével ───────────────────────────────────────────
  const s2 = openPgStore(target.toString());
  s2.run('UPDATE schema_migration SET sha256 = ? WHERE version = ?', realSha, '001');
  s2.run('DELETE FROM schema_migration WHERE version = ?', '001');
  s2.close();
  r = await ask(target.toString());
  check('R5', 'HIÁNYZÓ verzió → 503 (nem a legnagyobb verziót hasonlítjuk)',
    r.status === 503 && r.body.reason === 'migration_missing' && (r.body.missing_versions || []).includes('001'),
    `HTTP ${r.status} · ${r.body && r.body.reason} · ${JSON.stringify(r.body && r.body.missing_versions)}`);

  // ── 6. ELŐRE-KOMPATIBILIS TÖBBLET — régebbi kód újabb sémán ─────────────────────────────────
  // A NYILVÁNTARTÁS SORÁT ÁLLÍTJUK VISSZA, nem a migrációt futtatjuk újra: az R5-ben csak a
  // KÖNYVELÉS sorát töröltük, a TÁBLÁK megvannak — egy újrafuttatás ezért a már létező
  // táblákba ütközne. (A futtató ezt helyesen hibának is látja; itt viszont a mérés célja más.)
  const s3 = openPgStore(target.toString());
  s3.run('INSERT INTO schema_migration (version, file, sha256, applied_by, duration_ms) VALUES (?,?,?,?,?)',
    '001', '001_v3_mag_sema.sql', realSha, 'proof', 0);
  s3.run('INSERT INTO schema_migration (version, file, sha256, applied_by, duration_ms) VALUES (?,?,?,?,?)',
    '999', '999_jovobeli.sql', 'a'.repeat(64), 'proof', 0);
  s3.close();
  r = await ask(target.toString());
  check('R6', 'ELŐRE-KOMPATIBILIS többlet → 200, de NEVESÍTVE (nem néma)',
    r.status === 200 && r.body.ok === true && (r.body.ahead_versions || []).includes('999'),
    `HTTP ${r.status} · többlet: ${JSON.stringify(r.body && r.body.ahead_versions)}`);

  // ── 7. ELÉRHETETLEN ADATBÁZIS + TITOKMENTESSÉG ──────────────────────────────────────────────
  const dead = new URL(url); dead.pathname = '/postgres'; dead.port = '59999';
  r = await ask(dead.toString());
  const txt = JSON.stringify(r.body || r.startupError || '');
  const leaks = /59999|password|postgresql:\/\//i.test(txt);
  check('R7', 'ELÉRHETETLEN adatbázis → nem indul el / 503, és a válasz TITOKMENTES',
    (r.status === 503 || r.status === null) && !leaks,
    `${r.status === null ? `indulási hiba: ${r.startupError}` : `HTTP ${r.status} · ${r.body.reason}`} · szivárgás: ${leaks ? 'IGEN' : 'nincs'}`);
} finally {
  try { sh(['-d', admin.toString(), '-q', '-c', `DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`]); } catch { /* takarítás */ }
}

console.log('='.repeat(78));
const bad = marks.filter((m) => !m.ok);
console.log(`ALAPSOKASÁG: ${marks.length} mért eset, valódi PostgreSQL-en és valódi HTTP-n.`);
if (!bad.length) { console.log('RESULT: PASS — a készenlét a kiadott kódhoz mérve dől el.'); process.exit(0); }
console.log(`RESULT: FAIL — ${bad.length} eset`); process.exit(1);
