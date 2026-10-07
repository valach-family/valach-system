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
import { restoreTargetProblem, sameDatabase, qid, withDatabase, effectiveDatabase, freshTargetName,
  acquireFreshTarget, restoreOutcome, redactConnStrings, RESTORE_TARGET_PREFIX } from './lib/vs_pg_target.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadRepoEnv(ROOT);
const require = createRequire(import.meta.url);
const { artifactPath } = require('../contracts/artifactNaming.js');
const VERSION = require('../package.json').version;

const { startServer } = await import('../v3app/server.mjs');
const { openPgStore } = await import('../v3ref/pgStore.mjs');

const url = String(process.env.DATABASE_URL || '').trim();
if (!url) { console.error('proof:pg-durability — nincs DATABASE_URL: ELAKADT MÉRÉS.'); process.exit(2); }

// ════════════════════════════════════════════════════════════════════════════════════════════════
// A CÉL ALAPÉRTÉKE FRISS, EGYEDI, A FUTÁS ÁLTAL LÉTREHOZOTT ADATBÁZIS (R164/1, chatgpt-v3).
//
// A LELET, AMIT A KÜLSŐ FÉL A KÓDBÓL OLVASOTT KI: a próba a megadott célon `DROP DATABASE IF EXISTS`-t
// futtatott, majd `CREATE`-et. Egy ELŐRE LÉTEZŐ, akár teljesen más célra használt adatbázis így
// ELTŰNT, ha a neve egyezett a `VS_RESTORE_TEST_DB` értékével — a próba tehát olyan erőforrást
// takarított, amit nem ő hozott létre. A név nem tulajdonbizonyíték.
//
// A MAI SZABÁLY (mind a döntés, mind a jele meghívható — KUKA-207):
//   · a cél alapértéke GENERÁLT, egyedi név (`freshTargetName`);
//   · a próba a célt LÉTREHOZZA — a `CREATE DATABASE` sikere a tulajdon-bizonyíték (PostgreSQL-ben
//     nincs `IF NOT EXISTS`, tehát a siker azt jelenti, hogy ELŐTTE nem létezett);
//   · MÁR LÉTEZŐ célt nem töröl és nem ír felül, akkor sem, ha a neve más, mint a forrásnak;
//   · és CSAK a saját, igazoltan létrehozott adatbázisát takarítja.
//
// A `VS_RESTORE_TEST_DB` megmarad KIMONDOTT választásnak: ha meg van adva és NEM létezik, a próba
// létrehozza (tehát a sajátja lesz); ha LÉTEZIK, a próba NEVEZETTEN megáll, és nem nyúl hozzá.
// ════════════════════════════════════════════════════════════════════════════════════════════════
const explicitTarget = String(process.env.VS_RESTORE_TEST_DB || '').trim() || null;

/**
 * A CÉL NEVE AZONOSÍTÓ, ÉS EZT MEG IS KELL MÉRNI (F154-18).
 *
 * A LELET, MÉRVE (saját, R154): a `VS_RESTORE_TEST_DB`-t kapcsolati CÍMMEL adtam meg — ami kézenfekvő
 * tévedés, hiszen a `DATABASE_URL` is cím —, és a lánc a `3b` lépésen `ERROR: syntax error at or
 * near ":"` üzenettel bukott el. Két hiba egyszerre:
 *
 *   1. AZ ÉRTÉK KÖZVETLENÜL EGY `DROP DATABASE` UTASÍTÁSBA KERÜLT, szöveg-összefűzéssel. Egy
 *      elgépelt vagy rosszindulatú érték (pontosvessző, idézőjel) így a GAZDA adatbázison futó
 *      utasítássá válik — és a másik végén `DROP DATABASE` áll. Ilyen minta nem létezhet, akkor sem,
 *      ha az érték „csak" a saját környezetünkből jön.
 *   2. A HIBA NYERS SQL-ÜZENET VOLT, nem nevezett elutasítás. A mentés-visszatöltés GYAKORLÁSA
 *      kiadási függő (lásd a CLAUDE.md 5. szakaszát); ha az operátor egy érthetetlen SQL-hibán
 *      elakad, a gyakorlás nem történik meg (KUKA-291 · KUKA-215).
 *
 * A JAVÍTÁS KÉT SZINTŰ: a név ALAKJA mérve (zárt minta), ÉS a beillesztés IDÉZŐJELEZVE — mert ahol
 * a következmény `DROP DATABASE`, ott egy őr nem elég.
 */
/**
 * A KÉT DÖNTÉS EGY OTTHONBAN ÉS MEGHÍVHATÓAN: `tools/lib/vs_pg_target.mjs` (KUKA-207 · KUKA-003).
 * Mindkettőt a hatodik külső review-kör leletei hozták ide, és mindkettő P1 volt:
 *   · a hiba NEM írhatja ki az értéket (jelszót tartalmazhat — a naplóba sem);
 *   · az azonosság-vizsgálat DEKÓDOLJA a forrás nevét, mert a `pathname` nyers alakot ad.
 */
if (explicitTarget !== null) {
  const problem = restoreTargetProblem(explicitTarget);
  if (problem) {
    console.error(`proof:pg-durability — a VS_RESTORE_TEST_DB értéke ${problem.reason}. AZ ÉRTÉKET NEM ÍRJUK KI`
      + ' (kapcsolati cím esetén jelszót tartalmazhat, és a titok naplóba sem kerül).');
    console.error(`  amit mértünk: hossz ${problem.length} · kezdet: ${problem.starts}`
      + (problem.looks_like_url ? ' · KAPCSOLATI CÍM alakú (`://` vagy `@`)' : ''));
    console.error('  ADATBÁZIS-NEVET kér, nem kapcsolati címet — vagy hagyd el, és a próba generál egyet.');
    process.exit(2);
  }
  // A FELOLDÓ CSAK AZ ELSŐ KAPU, NEM AZ EGYETLEN (R164/1): itt még a KAPCSOLAT ELŐTT megállhatunk.
  const azonos = sameDatabase(url, explicitTarget);
  if (azonos.same) {
    console.error(`proof:pg-durability — a visszatöltés célja AZONOS a forrással (${azonos.basis}). Megálltam.`);
    process.exit(2);
  }
}

const PSQL = process.env.VS_PSQL || 'psql';
const PGDUMP = process.env.VS_PGDUMP || 'pg_dump';
const PGRESTORE = process.env.VS_PGRESTORE || 'pg_restore';

/**
 * A KLIENSEK A KÖRNYEZETBŐL KAPJÁK A CÉLT, NEM A PARANCSSORBÓL (R164/1).
 *
 * MIÉRT: a `-d <kapcsolati cím>` alak a JELSZÓT a parancssorba teszi — onnan a `ps` kiolvassa, és a
 * hibaüzenetek is visszaidézik. A szabály nem tűr kivételt: titok sem naplóba, sem parancssorba
 * (CLAUDE.md 1. szakasz · R164/1). Ezért a kapcsolat adatai KÖRNYEZETI változókban mennek, és a
 * CÉL is ott áll — így „a kliens számára átadott cél és a végrehajtás környezete következetes".
 */
function pgEnv(dbName) {
  const u = new URL(url);
  const e = { ...process.env };
  if (u.hostname) e.PGHOST = decodeURIComponent(u.hostname);
  if (u.port) e.PGPORT = u.port;
  if (u.username) e.PGUSER = decodeURIComponent(u.username);
  if (u.password) e.PGPASSWORD = decodeURIComponent(u.password);
  e.PGDATABASE = String(dbName);
  const ssl = u.searchParams.get('sslmode');
  if (ssl) e.PGSSLMODE = ssl;
  // A gyermek NEM kaphat `service`-t: a szolgáltatás-fájl felülírhatná a kimondott célt (KUKA-349).
  delete e.PGSERVICE; delete e.PGSERVICEFILE;
  return e;
}
/** Futtatás NEVEZETT eredménnyel: kilépési kód + TISZTÍTOTT kimenet (titok nélkül). */
function shTry(cmd, args, dbName) {
  try {
    const out = execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: pgEnv(dbName) });
    return { code: 0, stdout: String(out || ''), stderr: '' };
  } catch (e) {
    return { code: Number(e.status ?? 1), stdout: String(e.stdout || ''), stderr: String(e.stderr || e.message || '') };
  }
}
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

// ── 3. MENTÉS ÉS VISSZATÖLTÉS FRISS, SAJÁT CÉLRA ───────────────────────────────────────────────

// 3-0. A FORRÁS IDENTITÁSA A VALÓDI KAPCSOLATBÓL MÉRVE — a feloldó NEM az egyetlen védelem (R164/1).
//
// A szabály: „Az adatbázis-identitás (a valódi kapcsolatból olvasott), a kliens számára átadott cél
// és a végrehajtás környezete legyen következetes; az URL-feloldó/libpq-utánzás ne az egyetlen
// védelem legyen; bizonytalanság vagy eltérő feloldás esetén állj meg."
// Ezért a forrás nevét a kiszolgáló MONDJA MEG (`current_database()`), és a feloldó jóslatát ehhez
// MÉRJÜK: eltérésnél megállunk, mert akkor nem tudjuk, mit véd a kapu.
const sourceIdentity = (() => {
  try {
    const s = openPgStore(url);
    const r = s.get('SELECT current_database() AS db, current_user AS felh, version() AS verzio');
    s.close();
    return { db: String(r.db), felh: String(r.felh), verzio: String(r.verzio) };
  } catch (e) { return { db: null, hiba: redactConnStrings(String(e?.message || e)).slice(0, 160) }; }
})();
step('3-0. a FORRÁS neve a VALÓDI kapcsolatból mérve', sourceIdentity.db !== null,
  sourceIdentity.db !== null ? `adatbázis: ${sourceIdentity.db} · felhasználó: ${sourceIdentity.felh}` : sourceIdentity.hiba);

// A FELOLDÓ ÉS A MÉRÉS ÖSSZEVETÉSE. A feloldó a kapcsolat MEGNYITÁSA ELŐTT is tud dönteni (ez az
// első kapu), de nem ő az utolsó szó. Ha a kettő mást mond, a környezet nem az, aminek hisszük.
const resolved = effectiveDatabase(url);
const identityConsistent = sourceIdentity.db !== null && resolved.name !== null && resolved.name === sourceIdentity.db;
step('3-0b. a feloldó jóslata EGYEZIK a mért identitással', identityConsistent,
  `feloldva: ${resolved.name ?? `NEM MEGÁLLAPÍTHATÓ (${resolved.basis})`} · mérve: ${sourceIdentity.db ?? '—'}`);

const versions = {
  kiszolgalo: (sourceIdentity.verzio || '').split(/\s+/).slice(0, 2).join(' ') || '—',
  psql: (shTry(PSQL, ['--version'], 'postgres').stdout || '').trim() || '—',
  pg_dump: (shTry(PGDUMP, ['--version'], 'postgres').stdout || '').trim() || '—',
  pg_restore: (shTry(PGRESTORE, ['--version'], 'postgres').stdout || '').trim() || '—',
};
console.log(`  TÉNY kiszolgáló: ${versions.kiszolgalo} · kliensek: ${versions.psql} / ${versions.pg_dump} / ${versions.pg_restore}`);

/**
 * SQL-LITERÁL: CSAK adatbázis-NÉV alakú érték mehet be, és NEM szökéssel, hanem ELUTASÍTÁSSAL.
 *
 * Miért nem psql-változó (`-v nev=… :'nev'`): a `-c` kapcsoló a sztringet a kiszolgálóra adja, és a
 * psql-változókat NEM helyettesíti be — mérve: `syntax error at or near ":"`. Miért nem idézőjel-
 * duplázás: a szökés megengedő feloldás (KUKA-020). Itt a bemenet alakja ELLENŐRZÖTT, tehát a
 * helyes válasz a ZÁRÓDÓ kapu: ami nem név-alakú, az nem megy SQL-be.
 */
function lit(v) {
  const t = String(v);
  if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(t) || t.length > 63) {
    throw new Error('lit: csak adatbázis-NÉV alakú érték mehet SQL-literálba — megállás');
  }
  return `'${t}'`;
}

/** LÉTEZIK-E? — NEVEZETT „nem tudom" is lehet a válasz (a nem tudott nem „nem létezik", KUKA-220). */
function dbExists(name) {
  const r = shTry(PSQL, ['-X', '-A', '-t', '-q',
    '-c', `SELECT 1 FROM pg_database WHERE datname = ${lit(name)}`], 'postgres');
  if (r.code !== 0) return { known: false, hiba: redactConnStrings(r.stderr).slice(0, 160) };
  return { known: true, exists: r.stdout.trim() === '1' };
}

// A TAKARÍTÁS CSAK A SAJÁTUNKRA ÁLL. Ebbe a listába KIZÁRÓLAG sikeres `CREATE DATABASE` után kerül
// név: a `CREATE` sikere a tulajdon-bizonyíték. A név-előtag önmagában NEM tulajdonbizonyíték.
const sajatCelok = new Set();
let takaritasJelentes = null;
function dropOwn(name) {
  if (!sajatCelok.has(name)) return { ok: false, basis: 'NEM a mi erőforrásunk — nem nyúlunk hozzá' };
  let r = shTry(PSQL, ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-c', `DROP DATABASE ${qid(name)}`], 'postgres');
  if (r.code !== 0 && /being accessed|other users/i.test(r.stderr)) {
    r = shTry(PSQL, ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-c', `DROP DATABASE ${qid(name)} WITH (FORCE)`], 'postgres');
  }
  if (r.code === 0) { sajatCelok.delete(name); return { ok: true }; }
  return { ok: false, basis: redactConnStrings(r.stderr).slice(0, 160) };
}
/**
 * MEGSZAKADT FUTÁS: a saját célt TAKARÍTJUK, idegenhez NEM nyúlunk (R164/1).
 * A jel (SIGINT/SIGTERM) ugyanazon az egy úton fut le, mint a rendes záró takarítás — két út két
 * viselkedést adna (KUKA-003: egy szabály, egy otthon).
 */
let megszakitasAlatt = false;
function onSignal(sig) {
  if (megszakitasAlatt) return; megszakitasAlatt = true;
  const nevek = [...sajatCelok];
  console.log(`\n  MEGSZAKÍTÁS (${sig}) — a SAJÁT célok takarítása: ${nevek.length ? nevek.join(', ') : 'nincs'}`);
  for (const n of nevek) {
    const d = dropOwn(n);
    console.log(`  ${d.ok ? 'OK ' : 'NEM'} ${n} eldobva${d.ok ? '' : ` — MARADÉK, kézzel nézd meg: ${d.basis}`}`);
  }
  process.exit(130);
}
process.on('SIGINT', () => onSignal('SIGINT'));
process.on('SIGTERM', () => onSignal('SIGTERM'));
/**
 * ÉS A TAKARÍTÁS MINDEN KILÉPÉSI ÚTON LEFUT — nem csak a jelen.
 *
 * MÉRVE (R164/1 ellenpróba, E6): a jel a futás KÖZBEN érkezhet úgy, hogy a Node épp egy BLOKKOLÓ
 * gyermekhívásban áll (`execFileSync` a `pg_restore` alatt) — a JS jel-kezelő ilyenkor csak a hívás
 * után, az eseményhurok következő körében szólal meg, és ha a folyamat előbb kilép, SOHA. Egy
 * dobott kivétel vagy egy korai `process.exit` ugyanezt teszi. Ezért a takarításnak EGY otthona van
 * (KUKA-003), és az a KILÉPÉS: ami a miénk, azt a `exit` horgon is eldobjuk — szinkron hívásokkal,
 * mert az `exit` kezelőben csak szinkron munka fut le.
 */
/**
 * A LÉPÉS-HATÁROKON ÁTADJUK A VEZÉRLÉST — különben a megszakítás jele SOHA nem szólal meg.
 *
 * MÉRVE (R164/1 ellenpróba, E6): a 3. szakasz lépései BLOKKOLÓ gyermekhívások (`execFileSync`), és a
 * Node a JS jel-kezelőt csak az eseményhurok következő körében futtatja. Egy végig szinkron szakasz
 * tehát lefut úgy, hogy a SIGTERM ott áll a sorban — a megszakítás-ág pedig kód, amit semmi nem
 * tudott MEGHÍVNI (KUKA-207). A `setImmediate`-re várás a lépések KÖZÖTT egy hurok-kört ad: a jel
 * ott szólal meg, a félbehagyott munka pedig takarítva zárul.
 */
const megszakithato = () => new Promise((r) => setImmediate(r));

process.on('exit', () => {
  for (const n of [...sajatCelok]) {
    const d = dropOwn(n);
    console.log(`  ${d.ok ? 'OK ' : 'NEM'} kilépéskori takarítás: ${n}${d.ok ? ' eldobva' : ` — MARADÉK: ${d.basis}`}`);
  }
});

mkdirSync(resolve(ROOT, 'var/backups'), { recursive: true });
const dumpRel = artifactPath({ area: 'backups', kind: 'pg_tartossag_proba', ext: 'dump', version: VERSION });
const dumpPath = resolve(ROOT, dumpRel);
let dumped = false;
{
  // A TITOK NEM MEGY A PARANCSSORBA: a cél a KÖRNYEZETBŐL jön (`pgEnv`), nem `-d <kapcsolati cím>`.
  const r = shTry(PGDUMP, ['-Fc', '-f', dumpPath], sourceIdentity.db ?? '');
  dumped = r.code === 0;
  step('3a. pg_dump (a kapcsolat a KÖRNYEZETBŐL, nem a parancssorból)', dumped,
    dumped ? dumpRel : redactConnStrings(r.stderr).slice(0, 160));
}

// 3b. A CÉL MEGSZERZÉSE: a MEGHÍVHATÓ hurok (`acquireFreshTarget`) dönt — a kiszolgáló-hívásokat
// beadjuk, így UGYANEZT a kódot futtatja az ellenpróba is (KUKA-207).
/** `CREATE DATABASE` — a siker a TULAJDON-bizonyíték (PostgreSQL-ben nincs `IF NOT EXISTS`: 42P04). */
function createDb(name) {
  const c = shTry(PSQL, ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-c', `CREATE DATABASE ${qid(name)}`], 'postgres');
  if (c.code === 0) { sajatCelok.add(name); return { ok: true }; }
  if (/42P04|already exists/i.test(c.stderr)) return { ok: false, collision: true };
  return { ok: false, hiba: redactConnStrings(c.stderr).slice(0, 140) };
}
const szerzes = identityConsistent
  ? acquireFreshTarget({ measuredSource: sourceIdentity.db, explicitTarget, exists: dbExists, create: createDb, generate: () => freshTargetName() })
  : { target: null, log: [], basis: 'az identitás nem következetes — a cél megszerzéséig sem megyünk el' };
const restoreTarget = szerzes.target;
step('3b. FRISS, SAJÁT cél LÉTREHOZVA (a CREATE sikere a tulajdon-bizonyíték)', restoreTarget !== null,
  restoreTarget !== null ? `cél: ${restoreTarget} · ${szerzes.basis}` : szerzes.basis);
if (szerzes.log.length > 1) for (const x of szerzes.log) console.log(`       · ${x}`);
await megszakithato();

// 3c. A CÉL IDENTITÁSA IS MÉRVE: a kapcsolat ODA megy, ahová hittük.
let targetUrl = null;
let targetOk = false;
if (restoreTarget !== null) {
  targetUrl = withDatabase(url, restoreTarget).toString();
  let mert = null;
  try { const s = openPgStore(targetUrl); mert = String(s.get('SELECT current_database() AS db').db); s.close(); }
  catch (e) { mert = null; }
  targetOk = mert === restoreTarget && mert !== sourceIdentity.db;
  step('3c. a CÉL-kapcsolat identitása a MÉRT cél (és nem a forrás)', targetOk,
    `mérve: ${mert ?? 'nem mérhető'} · szándék: ${restoreTarget} · forrás: ${sourceIdentity.db}`);
}
await megszakithato();

let restored = false;
if (dumped && targetOk) {
  // A VERDIKT MÉRÉS, NEM RÉSZSZTRING: a `restoreOutcome` SORONKÉNT osztályoz, és egyetlen hiba-sor
  // mellett FAIL — akkor is, ha figyelmeztetés is jött. (A régi alak BÁRMILYEN hibát elnyelt, ha a
  // kimenet bárhol tartalmazta a „warning" szót.)
  // A `pg_restore` NEM veszi a `PGDATABASE`-t magától (mérve: „one of -d/--dbname and -f/--file must
  // be specified"), ezért kimondjuk — de ADATBÁZIS-NÉVVEL, nem kapcsolati címmel: a név nem titok, a
  // kapcsolat (gép, felhasználó, jelszó) továbbra is a KÖRNYEZETBŐL megy (R164/1).
  const r = shTry(PGRESTORE, ['--no-owner', '-d', restoreTarget, dumpPath], restoreTarget);
  const verdikt = restoreOutcome({ exitCode: r.code, stderr: r.stderr });
  restored = verdikt.ok;
  step('3d. visszatöltés a SAJÁT friss célra', restored,
    `${verdikt.basis}${restored ? '' : ` · ${redactConnStrings(r.stderr).split(/\r?\n/).filter(Boolean).slice(-2).join(' | ').slice(0, 200)}`}`);
}
await megszakithato();

// ── 4. VISSZAOLVASÁS — a mentés csak akkor mentés, ha VISSZA IS OLVASHATÓ (KÖTELEZŐ) ───────────
if (restored) {
  const s = openPgStore(targetUrl);
  const got = {
    n: s.get('SELECT COUNT(*) AS n FROM subject').n,
    b: s.get('SELECT COUNT(*) AS n FROM book').n,
    v: s.all('SELECT version FROM schema_migration ORDER BY version').map((x) => x.version).join(','),
  };
  const acct = s.get('SELECT COUNT(*) AS n FROM channel_proof WHERE value_norm = ?', email.toLowerCase()).n;
  s.close();
  step('4a. a sor-számok egyeznek', got.n === beforeCounts.n && got.b === beforeCounts.b,
    `alany ${got.n}/${beforeCounts.n} · könyv ${got.b}/${beforeCounts.b}`);
  step('4b. a séma-verzió egyezik', got.v === beforeCounts.v, `visszatöltve: [${got.v}] · eredeti: [${beforeCounts.v}]`);
  step('4c. a KONKRÉT bizonyított csatorna visszajött', acct === 1, `${acct} sor a mért címre`);
}

// ── 5. A FORRÁS VÁLTOZATLAN — a gyakorlás nem írhat a forrásba ─────────────────────────────────
{
  let after = null;
  try {
    const s = openPgStore(url);
    after = {
      db: String(s.get('SELECT current_database() AS db').db),
      n: s.get('SELECT COUNT(*) AS n FROM subject').n,
      b: s.get('SELECT COUNT(*) AS n FROM book').n,
      v: s.all('SELECT version FROM schema_migration ORDER BY version').map((x) => x.version).join(','),
    };
    s.close();
  } catch { after = null; }
  step('5. a FORRÁS a mentés-visszatöltés UTÁN is változatlan', after !== null
    && after.db === sourceIdentity.db && after.n === beforeCounts.n && after.b === beforeCounts.b && after.v === beforeCounts.v,
    after ? `forrás: ${after.db} · alany ${after.n}/${beforeCounts.n} · könyv ${after.b}/${beforeCounts.b}` : 'a forrás NEM mérhető a futás után');
}

// ── 6. TAKARÍTÁS: CSAK A SAJÁT, IGAZOLTAN LÉTREHOZOTT ERŐFORRÁS ─────────────────────────────────
if (restoreTarget !== null && process.env.VS_KEEP_RESTORE_TARGET) {
  /**
   * A MEGTARTÁS TÉNYLEGES MEGTARTÁS (R164, KÜLSŐ REVIEW, Codex, P2).
   *
   * A LELET: a kapcsoló a RENDES eldobást kihagyta, de a nevet a saját-listában hagyta — a
   * `process.on('exit')` horog pedig feltétel nélkül végigmegy a listán, és eldobta mégis. A
   * meghirdetett „hagyd meg, megnézem" kapcsoló tehát SOHA nem tartott meg semmit (KUKA-050: a
   * szöveg a valóságot kövesse). Mostantól a név KIKERÜL a saját-listából: így sem a záró
   * takarítás, sem a kilépési horog nem nyúl hozzá — és a próba KIMONDJA, hogy maradékot hagy.
   */
  sajatCelok.delete(restoreTarget);
  step('6. a SAJÁT cél MEGTARTVA (kimondott kérésre)', true,
    `${restoreTarget} a kiszolgálón marad — VS_KEEP_RESTORE_TARGET; kézzel kell eldobni`);
} else if (restoreTarget !== null) {
  const d = dropOwn(restoreTarget);
  takaritasJelentes = d;
  step('6. a SAJÁT cél eldobva (idegenhez nem nyúlunk)', d.ok,
    d.ok ? `${restoreTarget} eldobva` : `MARADÉK: ${restoreTarget} — ${d.basis}`);
}
// MARADÉK-JELENTÉS: a korábbi futások előtagos adatbázisait MEGNEVEZZÜK, de SOHA nem dobjuk el — a
// név nem tulajdonbizonyíték, és nem tudjuk, ki futtatja épp (R164/1).
{
  const elotag = lit(RESTORE_TARGET_PREFIX.replace(/_+$/, ''));
  const r = shTry(PSQL, ['-X', '-A', '-t', '-q',
    '-c', `SELECT datname FROM pg_database WHERE left(datname, length(${elotag})) = ${elotag} ORDER BY datname`], 'postgres');
  const maradek = r.code === 0 ? r.stdout.split(/\r?\n/).map((x) => x.trim()).filter(Boolean) : [];
  if (maradek.length) {
    console.log(`  TÉNY ${maradek.length} korábbi próba-adatbázis maradt a kiszolgálón: ${maradek.join(', ')}`);
    console.log('       NEM dobjuk el őket: nem ez a futás hozta létre, a név pedig nem tulajdonbizonyíték.');
  }
}

console.log('='.repeat(78));
const bad = marks.filter((m) => !m.ok);
console.log(`ALAPSOKASÁG: ${marks.length} mért lépés.`);
if (bad.length === 0) { console.log('RENDBEN — tartós az újraindításon át, és a mentés VISSZA IS OLVASHATÓ.'); process.exit(0); }
console.log('LELET:'); for (const m of bad) console.log(`  · ${m.name} — ${m.detail || ''}`);
process.exit(3);
