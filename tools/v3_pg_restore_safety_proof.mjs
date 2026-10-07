#!/usr/bin/env node
// V3 — A VISSZATÖLTÉSI PRÓBA BIZTONSÁGI SZERKEZETÉNEK ELLENPRÓBÁI (RSF-01).
// `npm run proof:pg-restore-safety`
//
// AZ R164/1 KIKÖTÉSE SZÓ SZERINT: *„Ezekre célzott bizonyítékot készíts: előre létező cél változatlan
// marad; forrás változatlan marad; sikeres friss cél; sikertelen restore; párhuzamos névütközés;
// megszakadt futás biztonságos kezelése. Destruktív ellenpróbát csak eldobható helyi környezetben
// végezz."*
//
// MIÉRT KÜLÖN LÁNC: a `proof:pg-durability` a SIKERT méri. Egy biztonsági kapu viszont attól kapu,
// hogy a ROSSZ esetben MEGÁLL — és azt csak úgy lehet igazolni, ha a rossz esetet ELŐ IS ÁLLÍTJUK
// (KUKA-049: az őr jelét meg kell mérni; KUKA-215: a választ MEG KELL MÉRNI). Ez a lánc tehát
// SZÁNDÉKOSAN állít elő ütközést, hibát és megszakítást — ezért kell eldobható klaszter.
//
// AMIT EZ NEM ÁLLÍT: nem Railway-mentés bizonyítéka, és nem PITR. Helyi, eldobható PostgreSQL-en
// mért viselkedés — a kiszolgáló és a kliensek verziója a kimenetben NEVESÍTVE áll.
import { execFileSync, spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { loadRepoEnv } from './lib/vs_tool_env.mjs';
import { qid, withDatabase, freshTargetName, acquireFreshTarget, restoreTargetDecision,
  restoreOutcome, redactConnStrings, localOnlyVerdict, RESTORE_TARGET_PREFIX, PROTECTED_DB_NAMES } from './lib/vs_pg_target.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadRepoEnv(ROOT);
const { openPgStore } = await import('../v3ref/pgStore.mjs');

const url = String(process.env.DATABASE_URL || '').trim();
if (!url) { console.error('proof:pg-restore-safety — nincs DATABASE_URL: ELAKADT MÉRÉS.'); process.exit(2); }

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ELDOBHATÓ KÖRNYEZET KÖTELEZŐ KAPUJA. Ez a lánc SZÁNDÉKOSAN hoz létre és dob el adatbázisokat, és
// megszakított futást is előállít. Felhős vagy ismeretlen kiszolgálón ez NEM futhat (R164/1: a
// destruktív ellenpróba helye az eldobható HELYI környezet).
// ════════════════════════════════════════════════════════════════════════════════════════════════
{
  /**
   * A KAPU A TÉNYLEGES GAZDAGÉPRE ÁLL (R164, KÜLSŐ REVIEW, Codex, P1 ×2).
   *
   * KÉT LELET egy helyen, és mindkettő a megengedő ágra vitt:
   *   1. a régi alak a cím AUTORITÁS-gazdagépét olvasta — a `node-postgres` viszont a `?host=`
   *      paramétert FELÜLÍRÓNAK kezeli, tehát egy `postgres://u@localhost/db?host=production.example`
   *      cím ÁTMENT a kapun, miközben a kapcsolat a TERMELÉSI kiszolgálóra ment volna;
   *   2. a `VS_SAFETY_ALLOW_REMOTE` felülírás BÁRMILYEN nem üres értékre állt — egy környezet-kezelő
   *      által beírt `0` vagy `false` is IGAZ értékű sztring, tehát a kikapcsolt felülírás kapcsolt be.
   *
   * A döntés egy meghívható feloldóban áll (`localOnlyVerdict`), a `?service=`/`hostaddr`/több-gazdagép
   * eseteket NEM ELDÖNTHETŐ-nek mondja, és a nem eldönthető NEM „helyi" (KUKA-020 · KUKA-203).
   */
  const kapu = localOnlyVerdict(url);
  if (!kapu.allowed) {
    console.error('proof:pg-restore-safety — ELAKADT MÉRÉS: destruktív ellenpróbát csak HELYI, eldobható');
    console.error(`  kiszolgálón futtatunk. A kapu indoka: ${kapu.basis}`);
    console.error('  (a gépnevet nem írjuk ki; kimondott felülírás: VS_SAFETY_ALLOW_REMOTE=1)');
    process.exit(2);
  }
  console.log(`  TÉNY a helyi kapu: ${kapu.basis}`);
}

const PSQL = process.env.VS_PSQL || 'psql';
const PGRESTORE = process.env.VS_PGRESTORE || 'pg_restore';
function pgEnv(dbName, extra = {}) {
  const u = new URL(url);
  const e = { ...process.env };
  if (u.hostname) e.PGHOST = decodeURIComponent(u.hostname);
  if (u.port) e.PGPORT = u.port;
  if (u.username) e.PGUSER = decodeURIComponent(u.username);
  if (u.password) e.PGPASSWORD = decodeURIComponent(u.password);
  e.PGDATABASE = String(dbName);
  delete e.PGSERVICE; delete e.PGSERVICEFILE;
  return { ...e, ...extra };
}
function psql(args, dbName = 'postgres') {
  try {
    const out = execFileSync(PSQL, ['-X', '-A', '-t', '-q', ...args],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: pgEnv(dbName) });
    return { code: 0, out: String(out || ''), err: '' };
  } catch (e) {
    return { code: Number(e.status ?? 1), out: String(e.stdout || ''), err: redactConnStrings(String(e.stderr || e.message || '')) };
  }
}
const letezik = (nev) => psql(['-c', `SELECT 1 FROM pg_database WHERE datname = '${nev}'`]).out.trim() === '1';

const marks = [];
const tény = (t) => console.log(`  TÉNY ${t}`);
const step = (name, ok, detail) => { marks.push({ name, ok, detail }); console.log(`  ${ok ? 'OK ' : 'NEM'} ${name}${detail ? `  — ${detail}` : ''}`); };

console.log('A VISSZATÖLTÉSI KAPU ELLENPRÓBÁI (eldobható helyi PostgreSQL)');
console.log('='.repeat(94));

// ── A FORRÁS PILLANATKÉPE: a „forrás változatlan" ehhez mérünk ──────────────────────────────────
const forrasNev = (() => { const s = openPgStore(url); const r = s.get('SELECT current_database() AS db'); s.close(); return String(r.db); })();
/**
 * A FORRÁS PILLANATKÉPE — A TELJES SOR-TARTALOMMAL (R164 review, Codex, P1 — `KUKA-380` · `D-VS-3188`).
 *
 * A LELET. A korábbi kép csak az alany-AZONOSÍTÓKAT vitte, és a „forrás változatlan" állítás
 * `every(… includes …)` alakban állt: tehát BÁRMENNYI ÚJ sort elfogadott, és egy MEGVÁLTOZTATOTT sort
 * egyáltalán nem látott. Márpedig minden `futtat()` elindítja a tartóssági próbát, ami a saját
 * előkészítésében fiókot regisztrál és vállalkozást hoz létre a FORRÁS adatbázisban — vagyis a forrás
 * TÉNYLEGESEN változott, miközben a lépés „változatlan"-t írt. Egy biztonsági bizonyíték nem
 * állíthat olyat, amit nem mér (KUKA-216).
 *
 * A VÁLASZ: a kép a teljes SOR-TARTALMAT viszi (`subject::text` · `book::text`), az összevetés pedig
 * HÁROM osztályt ad vissza — ELTŰNT · MEGVÁLTOZOTT · JÖTT —, és az állítás az első kettőre szól. A
 * harmadikat (a gyermek saját előkészítése) NEM elhallgatjuk, hanem KIMONDJUK és KORLÁTOZZUK: minden
 * futás UGYANANNYI sort tehet hozzá, különben egy nem szánt írás is „előkészítésnek" látszana.
 */
function forrasKep() {
  const s = openPgStore(url);
  const sorok = (tabla) => new Map(s.all(`SELECT id, ${tabla}::text AS sor FROM ${tabla} ORDER BY id`)
    .map((x) => [String(x.id), String(x.sor)]));
  const kep = {
    tablak: s.get("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = 'public'").n,
    semaverzio: s.all('SELECT version FROM schema_migration ORDER BY version').map((x) => x.version).join(','),
    alany: sorok('subject'),
    konyv: sorok('book'),
  };
  kep.alanyIdk = [...kep.alany.keys()];
  s.close();
  return kep;
}

/** Az összevetés HÁROM osztálya — az állítás az ELTŰNT és a MEGVÁLTOZOTT sorokra szól. */
function forrasValtozas(elotte, utana) {
  const osztaly = (e, u) => {
    const eltunt = []; const modosult = []; const jott = [];
    for (const [id, sor] of e) {
      if (!u.has(id)) eltunt.push(id);
      else if (u.get(id) !== sor) modosult.push(id);
    }
    for (const id of u.keys()) if (!e.has(id)) jott.push(id);
    return { eltunt, modosult, jott };
  };
  const a = osztaly(elotte.alany, utana.alany);
  const k = osztaly(elotte.konyv, utana.konyv);
  return {
    eltunt: [...a.eltunt, ...k.eltunt],
    modosult: [...a.modosult, ...k.modosult],
    jott: [...a.jott, ...k.jott],
    semaAll: utana.semaverzio === elotte.semaverzio && utana.tablak === elotte.tablak,
  };
}

/** A gyermek előkészítésének MÉRT hozzáadása — az ELSŐ futás adja, a többi ehhez mérve dől el. */
let elokeszitesMerteke = null;
const forrasElott = forrasKep();
tény(`forrás: ${forrasNev} · ${forrasElott.tablak} tábla · séma [${forrasElott.semaverzio}] · ${forrasElott.alanyIdk.length} alany`);

// ── AZ IDEGEN MARADÉK: olyan adatbázis, ami NEM a próbáé, de a NEVE az előtagot hordozza ────────
// (R164/1: „A név előtagja önmagában nem tulajdonbizonyíték.")
const idegen = `${RESTORE_TARGET_PREFIX}idegen_${Date.now().toString(36)}`;
const JELZO = `idegen-adat-${Date.now()}`;
{
  const c = psql(['-v', 'ON_ERROR_STOP=1', '-c', `CREATE DATABASE ${qid(idegen)}`]);
  if (c.code !== 0) { console.error(`  ELAKADT MÉRÉS: az idegen próba-adatbázis nem jött létre — ${c.err.slice(0, 160)}`); process.exit(2); }
  psql(['-v', 'ON_ERROR_STOP=1', '-c', 'CREATE TABLE idegen_jelzo (v text)', '-c', `INSERT INTO idegen_jelzo VALUES ('${JELZO}')`], idegen);
}
const idegenEl = () => letezik(idegen) && psql(['-c', 'SELECT v FROM idegen_jelzo'], idegen).out.trim() === JELZO;
tény(`idegen maradék létrehozva (az ELŐTAGOT hordozza, mégsem a próbáé): ${idegen}`);

// ── A SZÁNDÉKOS KLIENS-HELYETTESÍTŐK (var/, gitignore) ─────────────────────────────────────────
const TMP = resolve(ROOT, 'var/pg_safety');
mkdirSync(TMP, { recursive: true });
const valodiRestore = (() => { try { return execFileSync('command', ['-v', PGRESTORE], { encoding: 'utf8', shell: '/bin/sh' }).trim(); } catch { return PGRESTORE; } })();
function wrapper(nev, test) {
  const p = resolve(TMP, nev);
  writeFileSync(p, `#!/bin/sh\n${test}\n`, 'utf8');
  chmodSync(p, 0o755);
  return p;
}
const HIBAS = wrapper('pg_restore_hibas.sh',
  'echo "pg_restore: warning: errors ignored on restore: 1" 1>&2\n'
  + 'echo "pg_restore: error: could not execute query: SZANDEKOS ellenproba-hiba" 1>&2\n'
  + 'exit 1');
const CSAK_FIGYELMEZTET = wrapper('pg_restore_figyelmeztet.sh',
  `${valodiRestore} "$@" || exit $?\n`
  + 'echo "pg_restore: warning: SZANDEKOS figyelmeztetes az ellenprobabol" 1>&2\n'
  + 'exit 1');
const LASSU = wrapper('pg_restore_lassu.sh', `sleep 8\nexec ${valodiRestore} "$@"`);

// ── A GYEREK-FUTÁS: a VALÓDI láncot futtatjuk, nem utánozzuk (KUKA-207) ────────────────────────
let gyerekPid = 0;
function futtat({ env = {}, onLine = null, timeoutMs = 180_000 } = {}) {
  return new Promise((keszen) => {
    const ch = spawn(process.execPath, [resolve(ROOT, 'tools/v3_pg_durability_proof.mjs')],
      { cwd: ROOT, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    gyerekPid = ch.pid;
    let ki = '';
    /**
     * AZ IDŐTÚLLÉPÉS A FOLYAMATCSOPORTOT ÖLI MEG (R164, KÜLSŐ REVIEW, Codex, P2).
     *
     * A LELET: `ch.kill('SIGKILL')` CSAK a Node-gyereket ölte meg, a leszármazott adatbázis-klienst
     * nem — az tovább dolgozott, és az ÖRÖKÖLT kimeneti csöveket is tartotta, tehát a `close` esemény
     * (és vele ez az időtúllépés) a „megölt" parancs TÉNYLEGES végéig nem jött meg; a félbehagyott
     * adatbázis pedig ott maradt, mert a SIGKILL megkerüli a takarítást. A gyerek `detached`, tehát
     * saját folyamatcsoport-vezető: a jel a csoportnak megy (`-pid`), ahogy a megszakítás-mérésben is.
     */
    const t = setTimeout(() => {
      try { process.kill(-ch.pid, 'SIGKILL'); } catch { /* már véget ért */ }
      try { ch.kill('SIGKILL'); } catch { /* már véget ért */ }
    }, timeoutMs);
    const fogad = (d) => {
      const sz = String(d); ki += sz;
      if (onLine) for (const l of sz.split(/\r?\n/)) if (l.trim()) onLine(l, ch);
    };
    ch.stdout.on('data', fogad); ch.stderr.on('data', fogad);
    ch.on('close', (code, signal) => { clearTimeout(t); keszen({ code, signal, out: ki }); });
  });
}
const sajatCelNev = (out) => (out.match(new RegExp(`${RESTORE_TARGET_PREFIX}\\d{14}_[0-9a-f]{6}`)) || [null])[0];

// ════════════════════════════════════════════════════════════════════════════════════════════════
// E1 — ELŐRE LÉTEZŐ CÉL VÁLTOZATLAN MARAD
// ════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nE1 — ELŐRE LÉTEZŐ CÉL (a próba NEM törli és NEM írja felül)');
{
  const r = await futtat({ env: { VS_RESTORE_TEST_DB: idegen } });
  const megall = r.code !== 0 && /MÁR LÉTEZIK/.test(r.out) && !/RENDBEN/.test(r.out);
  step('E1a. a próba MEGÁLL a már létező célon', megall, `kilépés ${r.code} · ${/MÁR LÉTEZIK/.test(r.out) ? 'nevezett indok megjelent' : 'a nevezett indok NEM jelent meg'}`);
  step('E1b. az idegen adatbázis ÉS a benne lévő adat ÉRINTETLEN', idegenEl(), idegenEl() ? `${idegen} · a jelző sor megvan` : 'ELTŰNT VAGY MEGVÁLTOZOTT');
  step('E1c. a próba NEM hozott létre helyette mást (kimondott célnál nem generál)', sajatCelNev(r.out) === null,
    sajatCelNev(r.out) === null ? 'egy generált célnév sem jelent meg' : `MÉGIS generált: ${sajatCelNev(r.out)}`);
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// E2 + E4 — SIKERTELEN RESTORE (figyelmeztetés ÉS valódi hiba EGYÜTT) ÉS A FORRÁS VÁLTOZATLANSÁGA
// ════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nE4 — SIKERTELEN RESTORE: a „warning" jelenléte NEM oldja fel a hibát  ·  E2 — a FORRÁS változatlan');
{
  const e4Elott = forrasKep();            // a MÉRÉS a FUTÁS ELŐTTI állapothoz szól, nem a globálishoz
  const r = await futtat({ env: { VS_PGRESTORE: HIBAS, VS_RESTORE_TEST_DB: '' } });
  const cel = sajatCelNev(r.out);
  step('E4a. a verdikt FAIL, nem PASS', r.code !== 0 && !/RENDBEN/.test(r.out), `kilépés ${r.code}`);
  step('E4b. az indok NEVEZETT (hiba-sor, a figyelmeztetés nem oldja fel)', /HIBA-sor a kimenetben/.test(r.out),
    (r.out.match(/HIBA-sor a kimenetben[^\n]*/) || ['nem jelent meg'])[0].slice(0, 110));
  step('E4c. a bukott visszatöltés UTÁN sem állít tartalmi egyezést', !/4a\. a sor-számok egyeznek/.test(r.out),
    'a visszaolvasás lépései el sem indultak — nincs mire zöldet mondani');
  step('E4d. a saját, FRISS célt a bukás után is ELTAKARÍTOTTA', cel !== null && !letezik(cel), cel ? `${cel} nincs a kiszolgálón` : 'nem jött létre cél');
  const utan = forrasKep();
  const v = forrasValtozas(e4Elott, utan);
  elokeszitesMerteke = v.jott.length;
  step('E2. a FORRÁS egyetlen sora sem TŰNT EL és egyetlen sora sem VÁLTOZOTT MEG (a teljes sor-tartalomra mérve)',
    v.semaAll && v.eltunt.length === 0 && v.modosult.length === 0,
    `${utan.tablak}/${e4Elott.tablak} tábla · séma [${utan.semaverzio}] · eltűnt: ${v.eltunt.length} · megváltozott: ${v.modosult.length}`);
  step('E2c. ÉS A GYERMEK SAJÁT ELŐKÉSZÍTÉSE KIMONDOTT: a hozzáadott sorok száma MÉRVE, nem elhallgatva',
    v.jott.length >= 0, `a tartóssági próba előkészítése ${v.jott.length} sort adott a forráshoz (fiók + vállalkozás) — ez a MÉRCE a további futásokhoz`);
  step('E2b. az idegen adatbázis ebben a futásban is ÉRINTETLEN', idegenEl(), idegen);
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// E4e — A SIKERES PÁR: csak FIGYELMEZTETÉS + nem nulla kilépés → tolerálva, és a TARTALOM dönt
// (R164/1: „mérd a figyelmeztetés+valódi hiba együttesét ÉS a sikeres párt")
// ════════════════════════════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════════════════════════════
// E4e — A NEM NULLA KILÉPÉS AKKOR IS BUKÁS, HA A KIMENETBEN NINCS FELISMERT HIBA-SOR
//
// EZ A MÉRÉS MEGFORDULT (R164, KÜLSŐ REVIEW, Codex, P1). Az első alakom a „csak figyelmeztetés +
// nem nulla kilépés" esetet TOLERÁLTA, és a tartalmi visszaolvasásra bízta a döntést. A reviewer
// megmutatta, hogy ez két úton ad hamis zöldet: a `pg_restore` diagnosztikája lehet ÜRES vagy MÁS
// NYELVŰ (az angol `error:` jelölő nélkül), és a PostgreSQL dokumentált viselkedése szerint a
// visszatöltés az SQL-hibák UTÁN folytatódik, a hibák SZÁMÁT a végén jelenti — a nem nulla kilépés
// tehát épp a hiba jele. A tartalmi visszaolvasás nem pótolja: csak a megmért táblákat, a
// séma-verziót és EGY csatorna-sort nézi (KUKA-216).
// ════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nE4e — NEM NULLA KILÉPÉS felismert hiba-sor NÉLKÜL: ez is BUKÁS (a mérés MEGFORDULT)');
{
  const r = await futtat({ env: { VS_PGRESTORE: CSAK_FIGYELMEZTET, VS_RESTORE_TEST_DB: '' } });
  const cel = sajatCelNev(r.out);
  step('E4e1. a verdikt FAIL, nem „tolerált PASS"', r.code !== 0 && !/RENDBEN/.test(r.out) && !/tolerálva/.test(r.out),
    `kilépés ${r.code} · ${(r.out.match(/NEM NULLA kilépés[^\n·]*/) || ['a nevezett indok NEM jelent meg'])[0].slice(0, 110)}`);
  step('E4e2. az indok NEVEZETT: a kilépési kód dönt, nem a kimenet szavai',
    /NEM NULLA kilépés/.test(r.out), 'a próba kimondja, hogy a diagnosztika lehet üres vagy más nyelvű');
  step('E4e3. és a tartalmi visszaolvasás EL SEM INDUL a bukott visszatöltés után',
    !/4a\. a sor-számok egyeznek/.test(r.out), 'nincs mire zöldet mondani');
  step('E4e4. a saját cél eltakarítva a bukás után is', cel !== null && !letezik(cel), cel || 'nem jött létre cél');
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// E3 + E8 — SIKERES FRISS CÉL, ÉS A TITOK NEM KERÜL A NAPLÓBA
// ════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nE3 — SIKERES FRISS CÉL  ·  E8 — a kapcsolati cím és a jelszó NEM kerül a kimenetbe');
{
  // A JELSZÓ A CÍMBE: a helyi klaszter `trust` módban is elfogadja, viszont a próba kimenete így
  // MÉRHETŐEN tartalmazhatná — és épp azt kell igazolni, hogy NEM tartalmazza.
  const TITOK = `titok${Math.random().toString(36).slice(2, 10)}`;
  const u = new URL(url); u.password = TITOK;
  const r = await futtat({ env: { DATABASE_URL: u.toString(), VS_RESTORE_TEST_DB: '' } });
  const cel = sajatCelNev(r.out);
  step('E3a. a próba VÉGIG zöld a friss, saját célon', r.code === 0 && /RENDBEN/.test(r.out), `kilépés ${r.code} · ${(r.out.match(/ALAPSOKASÁG: \d+ mért lépés/) || [''])[0]}`);
  step('E3b. a cél FRISS, a futás hozta létre, és a végén eltakarítva', cel !== null && !letezik(cel), cel || 'nem jelent meg generált cél');
  step('E8a. a JELSZÓ egyetlen kimeneti sorban sem jelenik meg', !r.out.includes(TITOK), r.out.includes(TITOK) ? 'MEGJELENT' : 'nem jelenik meg');
  step('E8b. kapcsolati cím (`postgres://…`) sem jelenik meg', !/postgres(?:ql)?:\/\//i.test(r.out), 'a hibákban és a lépés-sorokban sem');
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// E5 — PÁRHUZAMOS NÉVÜTKÖZÉS: a VALÓDI kiszolgálón, a VALÓDI hurokkal
//
// A versenyt ott állítjuk elő, ahol keletkezik: a LÉTEZÉS-MÉRÉS és a `CREATE` KÖZÉ beírunk egy másik
// „futást" — pontosan úgy, ahogy két párhuzamos próba egymásba lépne (KUKA-202: az őr ott álljon,
// ahol a kár keletkezik). A hurok `acquireFreshTarget`, UGYANAZ, amit az éles próba futtat.
// ════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nE5 — PÁRHUZAMOS NÉVÜTKÖZÉS (a mérés és a CREATE közé befér egy másik futás)');
{
  const letrehozott = [];
  const versenyzoNevek = [];
  let versenyJelzo = null;
  const sz = acquireFreshTarget({
    measuredSource: forrasNev,
    explicitTarget: null,
    generate: () => freshTargetName(),
    exists: (nev) => {
      const van = letezik(nev);
      if (!van && versenyzoNevek.length === 0) {
        // A VERSENYZŐ: a mérés UTÁN, a `CREATE` ELŐTT létrehozza ugyanazt a nevet, és beír egy jelzőt.
        versenyJelzo = `versenyzo-${Date.now()}`;
        psql(['-v', 'ON_ERROR_STOP=1', '-c', `CREATE DATABASE ${qid(nev)}`]);
        psql(['-v', 'ON_ERROR_STOP=1', '-c', 'CREATE TABLE versenyzo (v text)', '-c', `INSERT INTO versenyzo VALUES ('${versenyJelzo}')`], nev);
        versenyzoNevek.push(nev);
      }
      return { known: true, exists: van };
    },
    create: (nev) => {
      const c = psql(['-v', 'ON_ERROR_STOP=1', '-c', `CREATE DATABASE ${qid(nev)}`]);
      if (c.code === 0) { letrehozott.push(nev); return { ok: true }; }
      if (/42P04|already exists/i.test(c.err)) return { ok: false, collision: true };
      return { ok: false, hiba: c.err.slice(0, 120) };
    },
  });
  const versenyzo = versenyzoNevek[0] || null;
  step('E5a. az ütközés VALÓBAN bekövetkezett (42P04 a CREATE-ben)', /párhuzamos névütközés/.test(sz.log.join(' | ')),
    sz.log.map((x) => x.replace(/^\d+\. /, '')).join(' → ').slice(0, 150));
  step('E5b. a hurok NEM vette át a másik futás adatbázisát', sz.target !== versenyzo && sz.target !== null,
    `megszerzett cél: ${sz.target} · a versenyzőé: ${versenyzo}`);
  const versenyzoEp = versenyzo !== null && letezik(versenyzo)
    && psql(['-c', 'SELECT v FROM versenyzo'], versenyzo).out.trim() === versenyJelzo;
  step('E5c. a versenyző adatbázisa ÉS adata érintetlen (nem töröltük, nem írtuk felül)', versenyzoEp, versenyzo || '—');
  step('E5d. a megszerzett cél a MÁSODIK kísérletből lett (új név, nem átvétel)', sz.attempts === 2 && sz.created === true, `${sz.attempts} kísérlet`);
  // A SAJÁT takarítása: amit MI hoztunk létre ebben a mérésben — a versenyzőét is, mert ezt a mérés
  // állította elő eldobható környezetben (nem a próba vette át).
  for (const n of [...letrehozott, ...versenyzoNevek]) psql(['-c', `DROP DATABASE ${qid(n)} WITH (FORCE)`]);
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// E6 — MEGSZAKADT FUTÁS: a saját célt takarítja, idegenhez nem nyúl
// ════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nE6 — MEGSZAKADT FUTÁS (SIGTERM a visszatöltés közben)');
{
  // A JELET A KISZOLGÁLÓRÓL OLVASSUK, NEM A GYEREK NAPLÓJÁBÓL.
  //
  // MÉRVE: a gyerek `stdout`-ja csővezetéken blokk-pufferelt, ezért a „3b. cél létrehozva" sor csak a
  // futás VÉGÉN érkezett meg — a naplóra időzített jel elkésett, és a mérés zöldnek látszott volna
  // úgy, hogy a megszakítás-ág meg sem szólalt (KUKA-216: a verdikt nem mutathat a mérés hatókörén
  // túl). A cél LÉTREJÖTTE viszont a kiszolgálón AZONNAL látszik: oda kérdezünk.
  const alapLista = () => {
    const e = `'${RESTORE_TARGET_PREFIX.replace(/_+$/, '')}'`;
    const r = psql(['-c', `SELECT datname FROM pg_database WHERE left(datname, length(${e})) = ${e}`]);
    return new Set(r.out.split(/\r?\n/).map((x) => x.trim()).filter(Boolean));
  };
  const elotte = alapLista();
  let celNev = null;
  let jelKuldve = false;
  const e6Elott = forrasKep();            // a megszakítás mérése is a FUTÁS ELŐTTI állapothoz szól
  const futas = futtat({ env: { VS_PGRESTORE: LASSU, VS_RESTORE_TEST_DB: '' } });
  const figyelo = setInterval(() => {
    if (jelKuldve) return;
    for (const n of alapLista()) {
      if (!elotte.has(n)) {
        celNev = n; jelKuldve = true;
        // A JEL A FOLYAMATCSOPORTNAK MEGY (`-pid`), nem csak a Node-nak — ahogy a Ctrl-C is teszi.
        // MIÉRT: a próba épp egy BLOKKOLÓ `pg_restore`-ban áll; ha csak a Node kapja meg a jelet, a
        // kezelő a blokkoló hívás végéig nem szólal meg. A csoportnak küldött jel a `pg_restore`-t is
        // megszakítja, tehát a megszakítás ott ér, AHOL a valóságban is érné.
        // 2 MP KÉSLELTETÉS: a cél LÉTREJÖTTE még nem a visszatöltés — a jelnek a `pg_restore` KÖZBEN
        // kell érnie, különben csak a Node sorába kerül, és nem azt mérjük, amit mérni akarunk.
        setTimeout(() => { try { process.kill(-gyerekPid, 'SIGTERM'); } catch { /* már véget ért */ } }, 2000);
        break;
      }
    }
  }, 150);
  const r = await futas;
  clearInterval(figyelo);
  const megszakitott = /MEGSZAKÍTÁS \(SIGTERM\)/.test(r.out);
  step('E6a. a megszakítás VALÓBAN a futás közben érte el (nem a vége után)', megszakitott && r.code === 130,
    `kilépés ${r.code} · ${megszakitott ? 'a megszakítás-ág lefutott' : 'a megszakítás-ág NEM futott le — a mérés nem ítélhető'}`);
  step('E6b. a saját, félbehagyott cél ELTAKARÍTVA (nem maradt szemét)', celNev !== null && !letezik(celNev),
    celNev ? `${celNev} nincs a kiszolgálón` : 'nem sikerült kiolvasni a cél nevét');
  step('E6c. az idegen adatbázis a megszakítás alatt sem sérült', idegenEl(), idegen);
  step('E6d. a FORRÁS a megszakítás után is áll: semmi nem tűnt el, semmi nem változott, és a hozzáadás a MÉRT előkészítésnél nem több',
    (() => {
      const v = forrasValtozas(e6Elott, forrasKep());
      return v.semaAll && v.eltunt.length === 0 && v.modosult.length === 0
        && (elokeszitesMerteke === null || v.jott.length <= elokeszitesMerteke);
    })(), forrasNev);
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// E6e — A KEZELHETETLEN MEGSZAKÍTÁS (SIGKILL): a MARADÉKOT MEGNEVEZZÜK, de SOHA nem dobjuk el
//
// A SIGKILL-t nem lehet elkapni: ilyenkor a félbehagyott cél OTT MARAD. A szabály erre nem az, hogy a
// következő futás „rendet tesz" — az előtag nem tulajdonbizonyíték (R164/1), és nem tudjuk, nem fut-e
// épp valaki azon. A helyes viselkedés: a következő futás MEGNEVEZI a maradékot, és NEM nyúl hozzá.
// ════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nE6e — KEZELHETETLEN MEGSZAKÍTÁS (SIGKILL): a maradék megnevezve, de nem eldobva');
{
  const elotte = new Set(psql(['-c', `SELECT datname FROM pg_database WHERE left(datname, 16) = 'vs_restore_proba'`]).out.split(/\r?\n/).map((x) => x.trim()).filter(Boolean));
  let maradek = null;
  let kuldve = false;
  const futas = futtat({ env: { VS_PGRESTORE: LASSU, VS_RESTORE_TEST_DB: '' } });
  const figyelo = setInterval(() => {
    if (kuldve) return;
    const most = psql(['-c', `SELECT datname FROM pg_database WHERE left(datname, 16) = 'vs_restore_proba'`]).out.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    for (const n of most) if (!elotte.has(n)) {
      maradek = n; kuldve = true;
      setTimeout(() => { try { process.kill(-gyerekPid, 'SIGKILL'); } catch { /* már véget ért */ } }, 1500);
      break;
    }
  }, 150);
  const r = await futas;
  clearInterval(figyelo);
  step('E6e1. a futás VALÓBAN kezelhetetlenül szakadt meg (SIGKILL, nincs takarítás-ág)',
    (r.signal === 'SIGKILL' || r.code === 137) && !/MEGSZAKÍTÁS/.test(r.out), `kilépés ${r.code} · jel ${r.signal}`);
  step('E6e2. a félbehagyott cél ott maradt (nem hazudunk takarítást)', maradek !== null && letezik(maradek), maradek || 'nem sikerült kiolvasni');
  // ÉS MOST A KÖVETKEZŐ FUTÁS: megnevezi-e, és hozzányúl-e?
  const kov = await futtat({ env: { VS_RESTORE_TEST_DB: '' } });
  step('E6e3. a KÖVETKEZŐ futás a maradékot MEGNEVEZI a kimenetében', maradek !== null && kov.out.includes(maradek),
    maradek !== null && kov.out.includes(maradek) ? 'a maradék neve megjelent a jelentésben' : 'NEM nevezte meg');
  step('E6e4. és NEM dobta el (a név nem tulajdonbizonyíték)', maradek !== null && letezik(maradek)
    && /NEM dobjuk el őket/.test(kov.out), 'a maradék a kiszolgálón van, és a próba kimondja, miért nem nyúl hozzá');
  step('E6e5. a következő futás ettől függetlenül ZÖLD a saját friss célján', kov.code === 0 && /RENDBEN/.test(kov.out), `kilépés ${kov.code}`);
  if (maradek) psql(['-c', `DROP DATABASE ${qid(maradek)} WITH (FORCE)`]);  // a MÉRÉS takarítja a saját szemetét
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// E7 — A VÉDETT ÉS A FORRÁS NEVE CÉLKÉNT: megállás, MÉG A LÉTEZÉS-MÉRÉS EREDMÉNYÉTŐL FÜGGETLENÜL
// ════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nE7 — VÉDETT RENDSZER-ADATBÁZIS és a FORRÁS neve célként');
{
  const tiltott = [...PROTECTED_DB_NAMES, forrasNev];
  let hivottCreate = 0;
  const eredmenyek = tiltott.map((nev) => acquireFreshTarget({
    measuredSource: forrasNev, explicitTarget: nev,
    generate: () => freshTargetName(),
    exists: (n) => ({ known: true, exists: letezik(n) }),
    create: () => { hivottCreate += 1; return { ok: true }; },
  }));
  step('E7a. MINDEGYIK tiltott célon megáll', eredmenyek.every((e) => e.target === null), tiltott.join(', '));
  step('E7b. és a `CREATE` MEG SEM HÍVÓDOTT (nem a hibából tanulunk, hanem a döntésből)', hivottCreate === 0, `CREATE hívás: ${hivottCreate}`);
  const indokok = eredmenyek.map((e) => e.basis);
  step('E7c. az indok NEVEZETT (forrás-azonosság, illetve védett rendszer-adatbázis)',
    indokok.some((b) => /AZONOS a MÉRT forrással/.test(b)) && indokok.some((b) => /VÉDETT rendszer-adatbázis/.test(b)),
    indokok.map((b) => b.slice(0, 44)).join(' · '));
  // A NÉV NEM TULAJDONBIZONYÍTÉK — a döntés akkor is elutasít, ha a cél NEM létezik:
  const nemLetezo = restoreTargetDecision({ measuredSource: forrasNev, explicitTarget: 'template0', exists: false, generated: freshTargetName() });
  step('E7d. a védettség nem a létezéstől függ (nem létező `template0` is elutasítva)', nemLetezo.use === null, nemLetezo.basis.slice(0, 80));
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// E9 — A VERDIKT-FELOLDÓ ÉS A TITOK-TISZTÍTÓ KÖZVETLEN MÉRÉSE (a határesetek)
// ════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nE9 — a verdikt-feloldó határesetei és a titok-tisztító');
{
  const r1 = restoreOutcome({ exitCode: 1, stderr: 'pg_restore: warning: x\npg_restore: error: y' });
  const r2 = restoreOutcome({ exitCode: 1, stderr: 'pg_restore: warning: x' });
  const r3 = restoreOutcome({ exitCode: 0, stderr: '' });
  const r4 = restoreOutcome({ exitCode: 0, stderr: 'pg_restore: error: y' });
  step('E9a. hiba + figyelmeztetés EGYÜTT → FAIL', r1.ok === false && r1.errors === 1 && r1.warnings === 1, r1.basis.slice(0, 80));
  step('E9b. csak figyelmeztetés + NEM NULLA kilépés → BUKÁS (a kilépési kód dönt)', r2.ok === false && r2.exitCode === 1, r2.basis.slice(0, 95));
  // ÉS A SIKERES PÁR: NULLA kilépés mellett a figyelmeztetés NEM buktat.
  const r5 = restoreOutcome({ exitCode: 0, stderr: 'pg_restore: warning: owner' });
  step('E9b2. a SIKERES PÁR: nulla kilépés + figyelmeztetés → PASS (a figyelmeztetés nem buktat)',
    r5.ok === true && r5.warnings === 1, r5.basis.slice(0, 80));
  // ÉS AZ ÜRES, FELISMERHETETLEN DIAGNOSZTIKA (a reviewer pontos esete): nem nulla kód, üres kimenet.
  const r6 = restoreOutcome({ exitCode: 3, stderr: '' });
  step('E9b3. nem nulla kilépés ÜRES (vagy más nyelvű) diagnosztikával → BUKÁS', r6.ok === false, r6.basis.slice(0, 95));
  step('E9c. tiszta futás → PASS', r3.ok === true && r3.warnings === 0, r3.basis.slice(0, 60));
  step('E9d. NULLA kilépés mellett is FAIL, ha hiba-sor van (a kód sem elég magában)', r4.ok === false, r4.basis.slice(0, 80));
  const t = redactConnStrings('hiba: postgres://u:titkos@gep:5432/db ; PGPASSWORD=masik');
  step('E9e. a tisztító a kapcsolati címet ÉS a jelszót is elrejti', !/titkos|masik/.test(t) && /elrejtve/.test(t), t.slice(0, 90));
}

// ── ZÁRÁS: a mérés saját szemetét MI takarítjuk (eldobható környezet) ──────────────────────────
psql(['-c', `DROP DATABASE ${qid(idegen)} WITH (FORCE)`]);
step('Z. a mérés saját idegen-maradéka eldobva (a mérés nem hagy szemetet)', !letezik(idegen), idegen);

console.log('='.repeat(94));
const bad = marks.filter((m) => !m.ok);
console.log(`ALAPSOKASÁG: ${marks.length} mért ellenpróba-lépés.`);
if (bad.length === 0) {
  console.log('RENDBEN — a kapu a ROSSZ esetekben is megáll, a forrás és az idegen adat sértetlen,');
  console.log('          a hibás visszatöltés nem lesz PASS, és a megszakadt futás nem hagy szemetet.');
  process.exit(0);
}
console.log('LELET:'); for (const m of bad) console.log(`  · ${m.name} — ${m.detail || ''}`);
process.exit(3);
