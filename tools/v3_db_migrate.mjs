#!/usr/bin/env node
// V3 — MIGRÁCIÓS FUTTATÓ (MIG-01). `npm run db:migrate`
//
// MIT GARANTÁL (R146 §4 négy kikötése, egyenként):
//   1. SZÁMOZOTT migrációk, ALKALMAZOTT-VERZIÓ és ELLENŐRZŐÖSSZEG nyilvántartással
//      (`schema_migration` tábla: verzió · fájlnév · sha256 · mikor · ki · meddig tartott).
//   2. ISMÉTELT FUTTATÁS NEM ÍRJA ÚJRA AZ ADATOT: ami már fut, azt kihagyja — a futás ilyenkor
//      is SIKERES (0), mert a kiadási lánc minden telepítésnél meghívja.
//   3. PÁRHUZAMOS MIGRÁCIÓS INDÍTÁS KONTROLLÁLT: `pg_advisory_lock` — két egyszerre induló
//      példány közül az egyik VÁR, nem versenyez. (Két Railway-példány egyszerre indul el.)
//   4. VÉGES IDŐKORLÁT, és hibára MEGÁLL — a kiadás áll meg, nem az adat törik.
//
// ÉS EGY ÖTÖDIK, amit a parancs nem kért, de a kiadási szabály követel: ha egy MÁR ALKALMAZOTT
// migráció fájlja MEGVÁLTOZOTT, a futtató NEVEZETTEN megáll. A „merge után érinthetetlen" szabály
// (D-VS-3000 / 2.) csak akkor szabály, ha a gép méri — különben jóindulat (KUKA-004).
//
// AMIT NEM CSINÁL: nem hoz létre adatbázist, nem töröl, nem vet vissza (a visszaút a KÓD
// visszagörgetése, nem a séma visszavonása), és NEM tölt be mintaadatot (az külön, kifejezett
// fejlesztői művelet — R146 §4).
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRepoEnv } from './lib/vs_tool_env.mjs';
import { openPgBridge } from '../v3ref/pgBridge.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MIG_DIR = join(ROOT, 'migrations');
const LOCK_KEY = 8274610394; // a V3 séma-migráció tanácsadó zárja — egy rögzített, saját szám

export function migrationFiles(dir = MIG_DIR) {
  return readdirSync(dir)
    .filter((f) => /^\d{3}_[a-z0-9_]+\.sql$/.test(f))
    .sort()
    .map((f) => {
      const sql = readFileSync(join(dir, f), 'utf8');
      return { file: f, version: f.slice(0, 3), sha256: createHash('sha256').update(sql).digest('hex'), sql };
    });
}

const LEDGER_DDL = `
CREATE TABLE IF NOT EXISTS schema_migration (
  version      text PRIMARY KEY,
  file         text NOT NULL,
  sha256       text NOT NULL,
  applied_at   timestamptz NOT NULL DEFAULT now(),
  applied_by   text NOT NULL,
  duration_ms  integer NOT NULL
)`;

export function runMigrations({ url, timeoutMs = 120000, log = console.log } = {}) {
  const files = migrationFiles();
  const bridge = openPgBridge(url, { waitMs: timeoutMs + 5000, statementTimeoutMs: timeoutMs });
  const applied = [];
  const skipped = [];
  try {
    // A ZÁR A SÉMA-NYILVÁNTARTÁS LÉTREHOZÁSA ELŐTT: két egyszerre induló példány közül a második
    // különben ugyanazt a `CREATE TABLE IF NOT EXISTS`-t futtatná ugyanabban a pillanatban.
    bridge.query(`SELECT pg_advisory_lock(${LOCK_KEY})`);
    bridge.query(LEDGER_DDL);

    const have = new Map(bridge.query('SELECT version, file, sha256 FROM schema_migration').rows
      .map((r) => [r.version, r]));

    for (const m of files) {
      const prior = have.get(m.version);
      if (prior) {
        // A KŐBE VÉSETT MIGRÁCIÓ ÁTÍRÁSA NEVEZETT MEGÁLLÁS, nem figyelmeztetés.
        if (prior.sha256 !== m.sha256) {
          const e = new Error(
            `a ${m.file} migráció MÁR LEFUTOTT, de a fájl azóta MEGVÁLTOZOTT `
            + `(nyilvántartott sha256 ${prior.sha256.slice(0, 12)}…, mai ${m.sha256.slice(0, 12)}…). `
            + 'Ami egyszer lefutott, az érintethetetlen — a javítás ÚJ migráció.');
          e.code = 'MIGRATION_CHECKSUM_MISMATCH';
          throw e;
        }
        skipped.push(m.file);
        continue;
      }
      const t0 = Date.now();
      // EGY MIGRÁCIÓ = EGY TRANZAKCIÓ. A PostgreSQL DDL-je tranzakciós, tehát egy félbeszakadt
      // migráció NEM hagy fél sémát hátra — vagy egészben megvan, vagy nincs.
      bridge.query('BEGIN');
      try {
        bridge.query(m.sql);
        bridge.query(
          'INSERT INTO schema_migration (version, file, sha256, applied_by, duration_ms) VALUES ($1,$2,$3,$4,$5)',
          [m.version, m.file, m.sha256, process.env.VS_APP_ENV || 'local', Date.now() - t0]);
        bridge.query('COMMIT');
      } catch (e) {
        try { bridge.query('ROLLBACK'); } catch { /* az EREDETI hiba megy tovább */ }
        throw e;
      }
      applied.push(m.file);
      log(`  alkalmazva: ${m.file}  (${Date.now() - t0} ms)`);
    }
    return { ok: true, applied, skipped, total: files.length };
  } finally {
    try { bridge.query(`SELECT pg_advisory_unlock(${LOCK_KEY})`); } catch { /* a zár a kapcsolattal úgyis elenged */ }
    bridge.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const env = loadRepoEnv(ROOT);
  const url = String(process.env.DATABASE_URL || '').trim();
  if (!url) {
    // A HIÁNY OKÁT OTT NEVEZZÜK MEG, AHOL TÖRTÉNT (KUKA-089): a `.env` megléte és a környezet
    // KÜLÖN tény — a hitelesítő a konténer környezetében is állhat.
    console.error('db:migrate — nincs DATABASE_URL.');
    console.error(env.envFileExists
      ? `  a ${env.envFile} fájlt beolvastam, de DATABASE_URL nincs benne (vagy üres)`
      : `  a környezetben nincs beállítva, és ${env.envFile} fájl sincs`);
    process.exit(2);
  }
  const t0 = Date.now();
  console.log('V3 séma-migráció');
  try {
    const r = runMigrations({ url, timeoutMs: Number(process.env.VS_MIGRATE_TIMEOUT_MS || 120000) });
    console.log(`  kész: ${r.applied.length} új · ${r.skipped.length} már futott · ${r.total} összesen `
      + `· ${Date.now() - t0} ms`);
    process.exit(0);
  } catch (e) {
    console.error(`  MEGÁLLT: ${e.message}`);
    console.error(`  kód: ${e.code || '(nincs)'} — a KIADÁS áll meg, az adat nem törik.`);
    process.exit(1);
  }
}
