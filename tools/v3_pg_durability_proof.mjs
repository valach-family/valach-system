#!/usr/bin/env node
// V3 — TARTÓSSÁG, MENTÉS ÉS VISSZATÖLTÉS VALÓDI PostgreSQL-EN (DUR-01).
// `npm run proof:pg-durability`
//
// AZ OPERÁTORI KIKÖTÉS (R146 §7): *„tényleges PostgreSQL dump/restore-próba elkülönített
// teszt-célon. Alkalmazás-újraindítás és újratelepítés után a szintetikus tesztadat
// fennmaradását mérd."* — és (KUKA-038): **A NEM PRÓBÁLT MENTÉS NEM MENTÉS.**
//
// NÉGY LÉPÉS, mind MÉRVE:
//   1. ÍRÁS      — a futó alkalmazáson át (nem közvetlen SQL): valódi felhasználói út.
//   2. ÚJRAINDÍTÁS — az alkalmazás LEÁLL és ÚJRAINDUL. Az adatnak ott kell lennie. Ez az a pont,
//      ahol a néma SQLite-visszaesés lelepleződne: egy konténer-fájlban az adat ELTŰNNE.
//   3. MENTÉS + VISSZATÖLTÉS — `pg_dump` egy ELKÜLÖNÍTETT cél-adatbázisba töltve vissza. A
//      visszatöltés SOHA nem a forrásra megy: egy „gyakorlás", ami felülírja az éleset, nem
//      gyakorlás (R146 §7: „A restore nem írja felül a V2-t, a Boardot vagy az eredeti tesztadatot").
//   4. VISSZAOLVASÁS — a visszatöltött adatbázisban UGYANAZ a sor és UGYANAZ a séma-verzió áll.
//
// AMIT EZ NEM ÁLLÍT (kimondva): ez NEM PITR-bizonyíték és nem Railway-mentés bizonyítéka. Helyi,
// konténeres PostgreSQL-en mért dump/restore — a felhős mentés igazolása a telepítés után
// következik, és azt a jelentés NEVESÍTETT függőként viszi (KUKA-089).
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadRepoEnv } from './lib/vs_tool_env.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadRepoEnv(ROOT);
const require = createRequire(import.meta.url);
const { artifactPath } = require('../contracts/artifactNaming.js');
const VERSION = require('../package.json').version;

const { startServer } = await import('../v3app/server.mjs');
const { openPgStore } = await import('../v3ref/pgStore.mjs');

const url = String(process.env.DATABASE_URL || '').trim();
if (!url) { console.error('proof:pg-durability — nincs DATABASE_URL: ELAKADT MÉRÉS.'); process.exit(2); }

// A VISSZATÖLTÉS CÉLJA KÜLÖN ADATBÁZIS, ÉS A NEVÉT KI KELL MONDANI (a D-VS-703 elve: ami
// véglegesít, ahhoz kapu kell — itt a kapu az, hogy a cél SOHA nem a forrás).
const restoreTarget = String(process.env.VS_RESTORE_TEST_DB || '').trim();
if (!restoreTarget) {
  console.error('proof:pg-durability — nincs VS_RESTORE_TEST_DB: a visszatöltés célját KI KELL MONDANI.');
  console.error('  Kapu nélkül nem töltünk vissza: a gyakorlás nem írhatja felül a forrást.');
  process.exit(2);
}
const u = new URL(url);
if ((u.pathname || '').replace(/^\//, '') === restoreTarget) {
  console.error('proof:pg-durability — a visszatöltés célja AZONOS a forrással. Megálltam.');
  process.exit(2);
}
const admin = new URL(url); admin.pathname = '/postgres';
const target = new URL(url); target.pathname = `/${restoreTarget}`;

const PSQL = process.env.VS_PSQL || 'psql';
const PGDUMP = process.env.VS_PGDUMP || 'pg_dump';
const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const marks = [];
const step = (name, ok, detail) => { marks.push({ name, ok, detail }); console.log(`  ${ok ? 'OK ' : 'NEM'} ${name}${detail ? `  — ${detail}` : ''}`); };

console.log('TARTÓSSÁG · MENTÉS · VISSZATÖLTÉS (valódi PostgreSQL)');
console.log('='.repeat(78));

// ── 1. ÍRÁS A FUTÓ ALKALMAZÁSON ÁT ─────────────────────────────────────────────────────────────
const email = `tartos${Date.now()}@proba.hu`;
let app = await startServer({ port: 0, host: '127.0.0.1', devSurface: true });
if (app.store.dialect !== 'postgres') { console.error('  ELAKADT MÉRÉS: nem PostgreSQL-en fut.'); process.exit(2); }
{
  let ck = null;
  const call = async (m, p, b) => {
    const h = { 'content-type': 'application/json' }; if (ck) h.cookie = ck;
    const r = await fetch(`http://127.0.0.1:${app.port}${p}`, { method: m, headers: h, body: b === undefined ? undefined : JSON.stringify(b) });
    const sc = r.headers.get('set-cookie'); if (sc) ck = sc.split(';')[0];
    const ct = r.headers.get('content-type') || '';
    return { s: r.status, b: ct.includes('json') ? await r.json() : await r.text() };
  };
  await call('POST', '/api/register', { email, password: 'tartos-titok-1' });
  const mb = await call('GET', '/dev/mailbox');
  const mail = (mb.b.mails || []).find((x) => String(x.to).toLowerCase() === email.toLowerCase());
  if (mail) { const l = new URL(mail.link); await call('GET', l.pathname + l.search); }
  const login = await call('POST', '/api/login', { email, password: 'tartos-titok-1' });
  const ws = await call('POST', '/api/workspaces', { name: 'Tartossag Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '12345678-2-42' } });
  step('1. írás a futó alkalmazáson át', login.b?.ok === true && ws.b?.ok === true, `munkakörnyezet: ${ws.b?.ok ? 'létrejött' : JSON.stringify(ws.b).slice(0, 90)}`);
}
await app.close();

// ── 2. ÚJRAINDÍTÁS ─────────────────────────────────────────────────────────────────────────────
app = await startServer({ port: 0, host: '127.0.0.1', devSurface: true });
{
  const r = await fetch(`http://127.0.0.1:${app.port}/api/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'tartos-titok-1' }),
  });
  const body = await r.json();
  step('2. ÚJRAINDÍTÁS után a fiók megvan', body.ok === true, 'ugyanazzal a jelszóval belép');
}
const beforeCounts = (() => {
  const s = openPgStore(url);
  const n = s.get('SELECT COUNT(*) AS n FROM subject').n;
  const b = s.get('SELECT COUNT(*) AS n FROM book').n;
  const v = s.all('SELECT version FROM schema_migration ORDER BY version').map((x) => x.version).join(',');
  s.close();
  return { n, b, v };
})();
await app.close();

// ── 3. MENTÉS ÉS VISSZATÖLTÉS ELKÜLÖNÍTETT CÉLRA ───────────────────────────────────────────────
mkdirSync(resolve(ROOT, 'var/backups'), { recursive: true });
const dumpRel = artifactPath({ area: 'backups', kind: 'pg_tartossag_proba', ext: 'dump', version: VERSION });
const dumpPath = resolve(ROOT, dumpRel);
let dumped = false;
try {
  sh(PGDUMP, ['-Fc', '-f', dumpPath, '-d', url]);
  dumped = true;
  step('3a. pg_dump', true, dumpRel);
} catch (e) { step('3a. pg_dump', false, String(e.stderr || e.message).slice(0, 160)); }

let restored = false;
if (dumped) {
  try {
    sh(PSQL, ['-d', admin.toString(), '-v', 'ON_ERROR_STOP=1', '-q',
      '-c', `DROP DATABASE IF EXISTS ${restoreTarget}`, '-c', `CREATE DATABASE ${restoreTarget}`]);
    // A `pg_restore` figyelmeztethet (pl. tulajdonos) — a MÉRCE a visszaolvasás, nem a némaság.
    try { sh(process.env.VS_PGRESTORE || 'pg_restore', ['-d', target.toString(), '--no-owner', dumpPath]); }
    catch (e) { if (!/warning/i.test(String(e.stderr || ''))) throw e; }
    restored = true;
    step('3b. visszatöltés ELKÜLÖNÍTETT célra', true, `cél adatbázis: ${restoreTarget} (NEM a forrás)`);
  } catch (e) { step('3b. visszatöltés ELKÜLÖNÍTETT célra', false, String(e.stderr || e.message).slice(0, 200)); }
}

// ── 4. VISSZAOLVASÁS — a mentés csak akkor mentés, ha VISSZA IS OLVASHATÓ ───────────────────────
if (restored) {
  const s = openPgStore(target.toString());
  const got = {
    n: s.get('SELECT COUNT(*) AS n FROM subject').n,
    b: s.get('SELECT COUNT(*) AS n FROM book').n,
    v: s.all('SELECT version FROM schema_migration ORDER BY version').map((x) => x.version).join(','),
  };
  const acct = s.get("SELECT COUNT(*) AS n FROM channel_proof WHERE value_norm = ?", email.toLowerCase()).n;
  s.close();
  step('4a. a sor-számok egyeznek', got.n === beforeCounts.n && got.b === beforeCounts.b,
    `alany ${got.n}/${beforeCounts.n} · könyv ${got.b}/${beforeCounts.b}`);
  step('4b. a séma-verzió egyezik', got.v === beforeCounts.v, `visszatöltve: [${got.v}] · eredeti: [${beforeCounts.v}]`);
  step('4c. a KONKRÉT bizonyított csatorna visszajött', acct === 1, `${acct} sor a mért címre`);
}

console.log('='.repeat(78));
const bad = marks.filter((m) => !m.ok);
console.log(`ALAPSOKASÁG: ${marks.length} mért lépés.`);
if (bad.length === 0) { console.log('RENDBEN — tartós az újraindításon át, és a mentés VISSZA IS OLVASHATÓ.'); process.exit(0); }
console.log('LELET:'); for (const m of bad) console.log(`  · ${m.name} — ${m.detail || ''}`);
process.exit(3);
