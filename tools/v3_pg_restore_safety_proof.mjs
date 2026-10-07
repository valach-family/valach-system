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
  restoreOutcome, redactConnStrings, localOnlyVerdict, RESTORE_TARGET_PREFIX, PROTECTED_DB_NAMES,
  cliEnvFor, effectiveDatabase } from './lib/vs_pg_target.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadRepoEnv(ROOT);
const { openPgStore } = await import('../v3ref/pgStore.mjs');

/**
 * A MEGADOTT CÍM A KISZOLGÁLÓT ADJA MEG, NEM A FORRÁST (R164 review, Codex, P2 — `KUKA-386` · `D-VS-3194`).
 *
 * A LELET: a lánc a MEGADOTT adatbázist használta forrásként — és minden `futtat()` elindítja a
 * tartóssági próbát, aminek az ELŐKÉSZÍTÉSE fiókot regisztrál és vállalkozást hoz létre EBBEN az
 * adatbázisban. A helyi kapu csak azt mondta ki, hogy a kiszolgáló HELYI; a HELYI viszont nem jelenti
 * az ELDOBHATÓT: egy mindennapi fejlesztői adatbázis így maradandó sorokat kapott, pedig a lánc
 * szerződése épp a sértetlenség.
 *
 * A VÁLASZ: a lánc SAJÁT, FRISS forrás-adatbázist hoz létre, a repó migrációs eszközével felépíti, a
 * gyermekeket ERRE állítja, és a végén eldobja. A megadott adatbázist NEM írja. Így a „forrás
 * változatlan" állítás a lánc SAJÁT adatbázisáról szól — nem egy idegen adatról, amibe bele is ír.
 */
const bazisUrl = String(process.env.DATABASE_URL || '').trim();
if (!bazisUrl) { console.error('proof:pg-restore-safety — nincs DATABASE_URL: ELAKADT MÉRÉS.'); process.exit(2); }

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
  const kapu = localOnlyVerdict(bazisUrl);
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
/**
 * A CLI-KÖRNYEZET A KÖZÖS OTTHONBÓL JÖN (R164 review, Codex, P2 — `KUKA-379`, HARMADIK hely).
 *
 * SAJÁT TANULSÁG, KIMONDVA: az előző körben a `pgEnv` KÉT másolatát vontam össze egy otthonba — és a
 * HARMADIKAT, ezt, nem vettem észre. A reviewer megtalálta. Pontosan ez a `KUKA-003` alakja: ha egy
 * szabály több házban él, a javítás annyi házat ér el, amennyit MEGKERESTEM — nem annyit, ahány van.
 * A tanulság nem az, hogy „jobban kell figyelni", hanem hogy a másolatokat GÉP keresse: a `KUKA-379`
 * pozitív mintája mostantól MIND A HÁROM fájlra szól, tehát egy negyedik másolat is piros lenne.
 */
function pgEnv(dbName, extra = {}) {
  // A KISZOLGÁLÓ a MEGADOTT címből jön, az ADATBÁZIST a hívó adja meg — így ez a feloldó a bázis
  // kiszolgálón ÉS a lánc saját forrás-adatbázisán is ugyanaz (KUKA-003).
  const r = cliEnvFor({ sourceUrl: bazisUrl, database: dbName, env: process.env });
  if (!r.ok) throw new Error(`a parancssori kliens környezete nem állítható össze: ${r.reason}`);
  return { ...r.env, ...extra };
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
/**
 * A LÉTEZÉS HÁROM ÁLLAPOTÚ, ÉS AZ ISMERETLEN NEM „NINCS OTT" (R166, KÜLSŐ REVIEW, Codex, P2 · `KUKA-401`).
 *
 * A LELET: a régi alak a `psql` BUKÁSÁT `false`-ra fordította (üres kimenet → nem `'1'`), ezért az
 * „eltakarítva" állítások (E4d · E4e4 · E3b · E6b · Z) attól is ÁTMENTEK, hogy az ellenőrző kérés
 * maga nem tudott lefutni. Egy ott maradt adatbázist így sikeres takarításként jelentettünk volna.
 *
 * MOSTANTÓL a feloldó MEGTARTJA a parancs állapotát, és a két kérdésnek KÜLÖN, FAIL-CLOSED alakja
 * van: a `nincsOtt` csak BIZONYÍTOTT hiányra igaz, az `ottVan` csak BIZONYÍTOTT jelenlétre. Az
 * ismeretlen tehát MINDKETTŐT megbuktatja — a bizonytalanság nem a megengedő ág (`KUKA-200`).
 */
const letezikV = (nev) => {
  const r = psql(['-c', `SELECT 1 FROM pg_database WHERE datname = '${nev}'`]);
  return r.code === 0
    ? { known: true, exists: r.out.trim() === '1', hiba: '' }
    : { known: false, exists: null, hiba: r.err.slice(0, 120) || `psql kilépés ${r.code}` };
};
const ottVan = (nev) => letezikV(nev).exists === true;
const nincsOtt = (nev) => { const v = letezikV(nev); return v.known === true && v.exists === false; };
const letezesAlap = (nev) => { const v = letezikV(nev); return v.known ? (v.exists ? 'a kiszolgálón VAN' : 'a kiszolgálón NINCS') : `NEM ELDÖNTHETŐ — ${v.hiba}`; };

const marks = [];
const tény = (t) => console.log(`  TÉNY ${t}`);
const step = (name, ok, detail) => { marks.push({ name, ok, detail }); console.log(`  ${ok ? 'OK ' : 'NEM'} ${name}${detail ? `  — ${detail}` : ''}`); };

console.log('A VISSZATÖLTÉSI KAPU ELLENPRÓBÁI (eldobható helyi PostgreSQL)');
console.log('='.repeat(94));

// ════════════════════════════════════════════════════════════════════════════════════════════════
// A LÁNC SAJÁT, FRISS FORRÁS-ADATBÁZISA (`KUKA-386` · `D-VS-3194`)
//
// MIÉRT: a HELYI nem jelenti az ELDOBHATÓT. A gyermek (tartóssági próba) előkészítése fiókot
// regisztrál és vállalkozást hoz létre a FORRÁSBAN, és ezt minden eset megismétli — egy mindennapi
// fejlesztői adatbázis így maradandó sorokat kapott volna. A lánc ezért SAJÁT forrást hoz létre, a
// repó migrációs eszközével építi fel, és a végén eldobja. A megadott adatbázist NEM írja.
//
// ÉS A TULAJDON ITT IS A LÉTREHOZÁS: ugyanaz a `acquireFreshTarget` hurok dönt, mint a célnál — már
// létező adatbázist nem veszünk át, névütközésre új nevet generálunk (R164/1).
// ════════════════════════════════════════════════════════════════════════════════════════════════
const sajatDb = new Set();
/**
 * A TAKARÍTÁS EREDMÉNYE VISSZATÉR, MERT A VERDIKT HASZNÁLJA (R166, KÜLSŐ REVIEW, Codex, P2 · `KUKA-405`).
 *
 * A LELET: ez a függvény csak a `process.on('exit')` horogról futott — vagyis a verdikt és a
 * kilépési kód MÁR megvolt, mire kiderült, hogy egy `DROP DATABASE` elbukott. A lánc így
 * „RENDBEN"-t írt és 0-val lépett ki, miközben a SAJÁT generált adatbázisai ott maradtak a
 * kiszolgálón — és ismételt futásokon halmozódtak. Egy figyelmeztetés nem verdikt.
 */
function dobjaSajat() {
  const maradt = [];
  for (const n of [...sajatDb]) {
    const r = psql(['-v', 'ON_ERROR_STOP=1', '-c', `DROP DATABASE IF EXISTS ${qid(n)} WITH (FORCE)`]);
    if (r.code === 0) { sajatDb.delete(n); console.log(`  a lánc saját forrás-adatbázisa eldobva: ${n}`); }
    else {
      maradt.push(`${n} — ${r.err.slice(0, 120) || `psql kilépés ${r.code}`}`);
      console.error(`  FIGYELEM: a saját forrás-adatbázis NEM lett eldobva: ${n} — ${r.err.slice(0, 120)}`);
    }
  }
  return maradt;
}
// A GYEREK AZONOSÍTÓJA A JEL-KEZELŐ ELŐTT ÁLL: egy KORAI jel különben a deklaráció előtt olvasná
// (TDZ-hiba), és a kezelő pont akkor bukna el, amikor a legnagyobb szükség van rá (KUKA-360).
let gyerekPid = 0;
process.on('exit', dobjaSajat);

/**
 * A MEGSZAKÍTÁS ELŐBB A GYEREKET ÁLLÍTJA LE, CSAK UTÁNA TAKARÍT (R166, KÜLSŐ REVIEW, Codex, P2 · `KUKA-403`).
 *
 * A LELET: a jel-kezelő eldobta a saját adatbázisokat és kilépett — a `detached: true`-val indított
 * gyerek-folyamatcsoportnak viszont NEM szólt. A gyerek így a szülő kilépése UTÁN is futtathatta a
 * `pg_dump`/`pg_restore`-t, versenyben a takarítással: a már eldobott forrásra írt, vagy a SAJÁT
 * generált célját hagyta ott — pontosan az a szemét, amit ez a lánc mér.
 *
 * MOSTANTÓL a sorrend KÖTÖTT: (1) a gyerek FOLYAMATCSOPORTJA megáll (`-pid`, tehát a `psql`/`pg_dump`
 * unokák is), (2) csak azután dobjuk el a sajátot. A `SIGKILL` a `SIGTERM` után jön, rövid türelmi
 * idővel — mert egy `pg_restore` közbeni azonnali halál pont azt a félbehagyott állapotot
 * keletkezteti, amit a takarítás még nem lát (`KUKA-360`: a megszakítás-kezelőt meg kell tudni hívni).
 */
function allitsdLeAGyereket() {
  if (!gyerekPid) return;
  for (const jel of ['SIGTERM', 'SIGKILL']) {
    try { process.kill(-gyerekPid, jel); } catch { return; /* már véget ért a csoport */ }
    const hatarido = Date.now() + (jel === 'SIGTERM' ? 1500 : 500);
    // SZINKRON várakozás: a jel-kezelőben nincs esemény-ciklus, amire várhatnánk.
    while (Date.now() < hatarido) {
      try { process.kill(-gyerekPid, 0); } catch { return; /* elment */ }
    }
  }
}
for (const jel of ['SIGINT', 'SIGTERM']) {
  process.on(jel, () => { allitsdLeAGyereket(); dobjaSajat(); process.exit(130); });
}

const forrasDb = (() => {
  const sz = acquireFreshTarget({
    measuredSource: (() => {
      /**
       * A BOOTSTRAP-KÉRDÉS IS A FELOLDÓT HÍVJA (R166, külső review, Codex, P2 · KUKA-402).
       * A régi alak az ÚTAT csupaszította névre — a `socket:` címen viszont az út a SOCKET-KÖNYVTÁR,
       * nem adatbázis (`socket:/var/run/postgresql?db=forras` → „var/run/postgresql"). A kapcsolat
       * elbukott, a `measuredSource` null lett, és a próba a saját adatbázisa előtt kilépett.
       */
      const fel = effectiveDatabase(bazisUrl);
      if (!fel.name) { console.error(`  FIGYELEM: a forrás adatbázis-neve NEM ELDÖNTHETŐ — ${fel.basis}`); return null; }
      const r = psql(['-c', 'SELECT current_database()'], fel.name);
      return r.code === 0 ? r.out.trim() : null;
    })(),
    explicitTarget: null,
    generate: () => `${RESTORE_TARGET_PREFIX}forras_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    exists: (n) => {
      const r = psql(['-c', `SELECT 1 FROM pg_database WHERE datname = '${n}'`]);
      return r.code === 0 ? { known: true, exists: r.out.trim() === '1' } : { known: false, hiba: r.err.slice(0, 120) };
    },
    create: (n) => {
      const c = psql(['-v', 'ON_ERROR_STOP=1', '-c', `CREATE DATABASE ${qid(n)}`]);
      if (c.code === 0) { sajatDb.add(n); return { ok: true }; }
      if (/42P04|already exists/i.test(c.err)) return { ok: false, collision: true };
      return { ok: false, hiba: c.err.slice(0, 120) };
    },
  });
  if (!sz.target) {
    console.error(`proof:pg-restore-safety — ELAKADT MÉRÉS: a lánc saját forrása nem jött létre — ${sz.basis}`);
    process.exit(2);
  }
  return sz.target;
})();
const url = withDatabase(bazisUrl, forrasDb).toString();
console.log(`  a lánc SAJÁT, friss forrása: ${forrasDb} (a megadott adatbázist NEM írjuk)`);
{
  // A SÉMA a repó saját migrációs eszközével megy be — nem kézi SQL (KUKA-016).
  try {
    execFileSync(process.execPath, [resolve(ROOT, 'tools/v3_db_migrate.mjs')],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, DATABASE_URL: url } });
  } catch (e) {
    console.error('proof:pg-restore-safety — ELAKADT MÉRÉS: a séma telepítése a saját forrásba nem sikerült — '
      + redactConnStrings(String(e.stderr || e.message)).slice(0, 200));
    process.exit(2);
  }
}

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
  const tablak = s.all("SELECT table_name AS t FROM information_schema.tables "
    + "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name").map((x) => String(x.t));
  const sorok = new Map();
  for (const t of tablak) {
    // A TELJES SOR szövege, halmazként. A `x::text` az EGÉSZ sort adja (összetett érték), tehát
    // bármely mező megváltozása MÁS szöveget ad — nem kell tudnunk, melyik az elsődleges kulcs.
    sorok.set(t, new Set(s.all(`SELECT x::text AS sor FROM ${qid(t)} x`).map((r) => String(r.sor))));
  }
  const kep = {
    tablak: tablak.length,
    tablaNevek: tablak,
    semaverzio: s.all('SELECT version FROM schema_migration ORDER BY version').map((x) => x.version).join(','),
    sorok,
  };
  s.close();
  return kep;
}

/**
 * AZ ÖSSZEVETÉS — MINDEN TÁBLÁRA, ÉS AZ ÁLLÍTÁS A PONTOS ALAKJÁBAN
 * (R164 review, Codex, P2 — `KUKA-387` · `D-VS-3195`).
 *
 * A LELET: az előző alak CSAK két tábla (`subject` · `book`) sor-tartalmát vitte. A gyermek
 * előkészítése viszont hitelesítőt, külső azonosítót, csatorna-igazolást, tagságot és engedélyt is ír
 * — tehát egy NEM SZÁNT törlés vagy módosítás BÁRMELYIK másik táblában ZÖLDEN maradt volna. Egy
 * biztonsági bizonyíték nem állíthat többet, mint amit mér (KUKA-216).
 *
 * MA MINDEN `public` tábla benne van, és az állítás a PONTOS alakjában szól:
 *   · `eltunt` — ami a futás ELŐTT megvolt és UTÁNA nincs. Egy MÓDOSÍTÁS is ide esik, mert a sor
 *     szövege megváltozott, tehát a régi szöveg eltűnt. Ez az, aminek NULLÁNAK kell lennie.
 *   · `jott`   — ami a futás UTÁN van és előtte nem volt: a gyermek SAJÁT előkészítése. Ezt
 *     KIMONDJUK és a MÉRT mértékhez kötjük, nem hallgatjuk el.
 *   · `eltuntTabla` / `ujTabla` — séma-szintű változás; mindkettőnek üresnek kell lennie.
 *
 * AMIT EZ NEM ÁLLÍT: nem kriptográfiai bizonyíték, és nem mondja meg, MELYIK mező változott — azt
 * mondja meg, hogy VALAMI eltűnt-e. A lánc SAJÁT forrás-adatbázisán dolgozik (`KUKA-386`), tehát a
 * mérés tárgya a lánc saját adata, nem egy idegen fejlesztői adatbázis.
 */
function forrasValtozas(elotte, utana) {
  const eltunt = []; const jott = [];
  for (const [t, be] of elotte.sorok) {
    const ut = utana.sorok.get(t);
    if (!ut) continue;                       // a tábla eltűnését külön mondjuk ki
    for (const sor of be) if (!ut.has(sor)) eltunt.push(t);
    for (const sor of ut) if (!be.has(sor)) jott.push(t);
  }
  const eltuntTabla = [...elotte.sorok.keys()].filter((t) => !utana.sorok.has(t));
  const ujTabla = [...utana.sorok.keys()].filter((t) => !elotte.sorok.has(t));
  return {
    eltunt, jott, eltuntTabla, ujTabla,
    semaAll: utana.semaverzio === elotte.semaverzio && utana.tablak === elotte.tablak
      && eltuntTabla.length === 0 && ujTabla.length === 0,
  };
}

/** A gyermek előkészítésének MÉRT hozzáadása — az ELSŐ futás adja, a többi ehhez mérve dől el. */
let elokeszitesMerteke = null;
const forrasElott = forrasKep();
tény(`forrás: ${forrasNev} (a lánc SAJÁT, friss adatbázisa) · ${forrasElott.tablak} tábla MÉRVE · `
  + `séma [${forrasElott.semaverzio}] · ${[...forrasElott.sorok.values()].reduce((n, h) => n + h.size, 0)} sor összesen`);

// ── AZ IDEGEN MARADÉK: olyan adatbázis, ami NEM a próbáé, de a NEVE az előtagot hordozza ────────
// (R164/1: „A név előtagja önmagában nem tulajdonbizonyíték.")
const idegen = `${RESTORE_TARGET_PREFIX}idegen_${Date.now().toString(36)}`;
const JELZO = `idegen-adat-${Date.now()}`;
{
  const c = psql(['-v', 'ON_ERROR_STOP=1', '-c', `CREATE DATABASE ${qid(idegen)}`]);
  if (c.code !== 0) { console.error(`  ELAKADT MÉRÉS: az idegen próba-adatbázis nem jött létre — ${c.err.slice(0, 160)}`); process.exit(2); }
  /**
   * ÉS A MÉRÉS SAJÁT „IDEGEN" ADATBÁZISA IS A TAKARÍTÁSI LISTÁRA KERÜL (R166, KÜLSŐ REVIEW, Codex, P2 · `KUKA-411`).
   *
   * A LELET: ezt az adatbázist a MÉRÉS hozta létre (a `CREATE` sikere a tulajdon-bizonyíték), de nem
   * került a `sajatDb` listába — a jel-kezelő és a kilépési horog pedig CSAK azt a listát dobja el.
   * Egy megszakított futás így OTT HAGYTA, minden alkalommal: a gyerek leállítása és a forrás
   * takarítása megvolt, ez viszont maradt. Pontosan az a szemét, amit ez a lánc mér.
   *
   * A KÉT FOGALOM NEM UGYANAZ, ÉS EZ A LÉNYEG: „idegen" a DURABILITY-GYEREK szemszögéből — neki NEM
   * szabad hozzányúlnia, és épp ezt mérjük (E1b · E2b). A SZÜLŐ szemszögéből viszont a SAJÁTJA, tehát
   * a szülő takarítási listájára tartozik. A `sajatDb` kizárólag a szülő listája; a gyereknek sajátja van.
   *
   * A SORREND RENDBEN: a záró `Z.` lépés ELŐBB dobja el és méri a hiányt, a `dobjaSajat()` csak utána
   * fut — a `DROP DATABASE IF EXISTS` ilyenkor no-op, és a név kikerül a listából.
   */
  sajatDb.add(idegen);
  psql(['-v', 'ON_ERROR_STOP=1', '-c', 'CREATE TABLE idegen_jelzo (v text)', '-c', `INSERT INTO idegen_jelzo VALUES ('${JELZO}')`], idegen);
}
const idegenEl = () => ottVan(idegen) && psql(['-c', 'SELECT v FROM idegen_jelzo'], idegen).out.trim() === JELZO;
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
function futtat({ env = {}, onLine = null, timeoutMs = 180_000 } = {}) {
  return new Promise((keszen) => {
    const ch = spawn(process.execPath, [resolve(ROOT, 'tools/v3_pg_durability_proof.mjs')],
      // A GYERMEK ALAPBÓL A LÁNC SAJÁT FORRÁSÁRA MEGY — a megadott adatbázisba egyetlen eset sem ír.
      { cwd: ROOT, env: { ...process.env, DATABASE_URL: url, ...env }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
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
  step('E4d. a saját, FRISS célt a bukás után is ELTAKARÍTOTTA', cel !== null && nincsOtt(cel),
    cel ? `${cel} — ${letezesAlap(cel)}` : 'nem jött létre cél');
  const utan = forrasKep();
  const v = forrasValtozas(e4Elott, utan);
  elokeszitesMerteke = v.jott.length;
  step('E2. a FORRÁS egyetlen sora sem TŰNT EL — MINDEN `public` táblára, a teljes sor-tartalomra mérve (a módosítás is eltűnésként jelenik meg)',
    v.semaAll && v.eltunt.length === 0,
    `${utan.tablak}/${e4Elott.tablak} tábla MÉRVE · séma [${utan.semaverzio}] · eltűnt sor: ${v.eltunt.length}`
    + ` · eltűnt tábla: ${v.eltuntTabla.length} · új tábla: ${v.ujTabla.length}`);
  step('E2c. ÉS A GYERMEK SAJÁT ELŐKÉSZÍTÉSE KIMONDOTT: a hozzáadott sorok száma MÉRVE, nem elhallgatva',
    v.jott.length >= 0, `a tartóssági próba előkészítése ${v.jott.length} ÚJ sort adott a lánc saját forrásához `
    + '— ez a MÉRCE a további futásokhoz (a sorok a fiók-, azonosító-, tagság- és vállalkozás-táblákban állnak)');
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
  step('E4e4. a saját cél eltakarítva a bukás után is', cel !== null && nincsOtt(cel),
    cel ? `${cel} — ${letezesAlap(cel)}` : 'nem jött létre cél');
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
  step('E3b. a cél FRISS, a futás hozta létre, és a végén eltakarítva', cel !== null && nincsOtt(cel),
    cel ? `${cel} — ${letezesAlap(cel)}` : 'nem jelent meg generált cél');
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
      const v = letezikV(nev);
      const van = v.exists === true;
      if (v.known === false) return v;
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
  const versenyzoEp = versenyzo !== null && ottVan(versenyzo)
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
  step('E6b. a saját, félbehagyott cél ELTAKARÍTVA (nem maradt szemét)', celNev !== null && nincsOtt(celNev),
    celNev ? `${celNev} nincs a kiszolgálón` : 'nem sikerült kiolvasni a cél nevét');
  step('E6c. az idegen adatbázis a megszakítás alatt sem sérült', idegenEl(), idegen);
  step('E6d. a FORRÁS a megszakítás után is áll: semmi nem tűnt el, semmi nem változott, és a hozzáadás a MÉRT előkészítésnél nem több',
    (() => {
      const v = forrasValtozas(e6Elott, forrasKep());
      return v.semaAll && v.eltunt.length === 0
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
  step('E6e2. a félbehagyott cél ott maradt (nem hazudunk takarítást)', maradek !== null && ottVan(maradek),
  maradek ? `${maradek} — ${letezesAlap(maradek)}` : 'nem sikerült kiolvasni');
  // ÉS MOST A KÖVETKEZŐ FUTÁS: megnevezi-e, és hozzányúl-e?
  const kov = await futtat({ env: { VS_RESTORE_TEST_DB: '' } });
  step('E6e3. a KÖVETKEZŐ futás a maradékot MEGNEVEZI a kimenetében', maradek !== null && kov.out.includes(maradek),
    maradek !== null && kov.out.includes(maradek) ? 'a maradék neve megjelent a jelentésben' : 'NEM nevezte meg');
  step('E6e4. és NEM dobta el (a név nem tulajdonbizonyíték)', maradek !== null && ottVan(maradek)
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
    exists: (n) => letezikV(n),
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

// ════════════════════════════════════════════════════════════════════════════════════════════════
// E10 — A `socket:` SÉMA ÁTIRÁNYÍTÁSA VALÓDI KISZOLGÁLÓN (R166/P1, `#discussion_r4207213198`)
//
// MIÉRT ÉPP ÍGY. A lelet a `?db=` felülírást állította, és a kitűzött könyvtáron (`pg-connection-string`)
// MÉRVE a HÁLÓZATI sémán ez nem áll elő. A mechanizmus viszont a `socket:` sémán LÉTEZIK, ott pedig az
// ÚT a socket-KÖNYVTÁR. A tiszta függvények pinjei a söprésben állnak (`verify:app-findings-r154`, AC
// csoport) — ez a lépés a KÁRT méri: az átirányítás UTÁN tényleg a FRISS célra megy-e az írás, és
// marad-e érintetlen az EREDETI adatbázis. A régi alakot ugyanitt, egymás mellett futtatjuk.
//
// A SOCKET-KÖNYVTÁR A KISZOLGÁLÓTÓL JÖN, NEM TIPPBŐL. Ha a kiszolgáló nem hallgat Unix-socketen, ez a
// lépés NEM MÉRT — és nevezetten az, nem néma zöld (KUKA-093 · KUKA-363).
// ════════════════════════════════════════════════════════════════════════════════════════════════
console.log('\nE10 — a `socket:` séma átirányítása (R166/P1)');
const nemMert = [];
{
  const sockDir = psql(['-c', 'SHOW unix_socket_directories']).out.trim().split(',')[0].trim();
  const port = psql(['-c', 'SHOW port']).out.trim();
  const user = psql(['-c', 'SELECT current_user']).out.trim();
  if (!sockDir || !sockDir.startsWith('/')) {
    nemMert.push('E10 — a kiszolgáló nem hallgat Unix-socketen (`unix_socket_directories` üres vagy nem abszolút), ezért a `socket:` séma ellenpárja NEM MÉRT');
    console.log(`  KIH E10 — ${nemMert[nemMert.length - 1]}`);
  } else {
    const sockCim = (db) => `socket:${sockDir}?port=${encodeURIComponent(port)}&user=${encodeURIComponent(user)}&db=${encodeURIComponent(db)}`;
    /** A RÉGI alak, karakterre az R166 előtti kódból: az ÚT kapja a nevet, a `?db=` érintetlen marad. */
    const withDatabaseREGI = (sourceUrl, name) => {
      const u = new URL(String(sourceUrl));
      u.pathname = `/${String(name)}`;
      try { u.searchParams.delete('dbname'); } catch { /* nincs query */ }
      return u;
    };
    // A lánc SAJÁT, friss „eredetije" és „friss célja" — a megadott adatbázist itt sem írjuk.
    const e10eredeti = freshTargetName();
    const e10cel = freshTargetName();
    let elokeszult = true;
    for (const n of [e10eredeti, e10cel]) {
      const c = psql(['-v', 'ON_ERROR_STOP=1', '-c', `CREATE DATABASE ${qid(n)}`]);
      if (c.code !== 0) { elokeszult = false; break; }
      sajatDb.add(n);
    }
    if (!elokeszult) {
      nemMert.push('E10 — a két saját adatbázis nem jött létre, ezért a `socket:` ellenpár NEM MÉRT');
      console.log(`  KIH E10 — ${nemMert[nemMert.length - 1]}`);
    } else {
      // Nyomot HAGYÓ írás mindkét alakkal, ÉLŐ kapcsolaton, a socketen keresztül.
      const ir = (cim, jel) => {
        try {
          const s = openPgStore(cim);
          const hova = String(s.get('SELECT current_database() AS db').db);
          s.run('CREATE TABLE IF NOT EXISTS vs_r166_nyom (jel text)');
          s.run(`INSERT INTO vs_r166_nyom VALUES ('${jel}')`);
          s.close();
          return { hova };
        } catch (e) { return { hiba: redactConnStrings(String(e.message || e)).slice(0, 90) }; }
      };
      const nyomok = (db) => {
        const r = psql(['-c', 'SELECT jel FROM vs_r166_nyom ORDER BY jel'], db);
        return r.code === 0 ? r.out.trim().split('\n').filter(Boolean) : [];
      };
      const forrasCim = sockCim(e10eredeti);
      const regi = ir(withDatabaseREGI(forrasCim, e10cel).toString(), 'regi');
      const uj = ir(withDatabase(forrasCim, e10cel).toString(), 'uj');

      step('E10a. a RÉGI alak az ÚTAT (a socket-könyvtárat) írta át, ezért a kapcsolat NEM a friss célra ment — a `?db=` érintetlen maradt',
        regi.hova !== e10cel,
        regi.hiba ? `a régi alak kapcsolata elbukott: ${regi.hiba}` : `a régi alak ide ment: ${regi.hova}`);
      step('E10b. az ÚJ alak átirányítása a FRISS CÉLRA megy — valódi kiszolgálón, Unix-socketen',
        uj.hova === e10cel, `mérve: ${uj.hova ?? uj.hiba} · szándék: ${e10cel}`);
      step('E10c. és az EREDETI adatbázis ÉRINTETLEN: nincs benne a mérés nyoma',
        nyomok(e10eredeti).length === 0, `az eredetiben talált nyomok: ${nyomok(e10eredeti).length}`);
      step('E10d. a nyom a FRISS CÉLBAN áll (az írás tényleg megtörtént, nem csak „nem hibázott")',
        nyomok(e10cel).join(',') === 'uj', `a célban talált nyomok: ${nyomok(e10cel).join(',') || '(nincs)'}`);
      step('E10e. a `socket:` cím a CLI-gyermeknek környezetként megy át (a libpq a `socket:` URI-t nem értelmezi)',
        (() => { const r = cliEnvFor({ sourceUrl: forrasCim, database: e10cel, env: process.env });
          return r.ok && r.env.PGHOST === sockDir && r.env.PGDATABASE === e10cel; })(),
        `PGHOST a socket-könyvtár · PGDATABASE a megnevezett cél`);
      tény(`a mért socket-könyvtár a KISZOLGÁLÓTÓL jött (\`SHOW unix_socket_directories\`), nem tippből`);
    }
  }
}

// ── ZÁRÁS: a mérés saját szemetét MI takarítjuk (eldobható környezet) ──────────────────────────
psql(['-c', `DROP DATABASE ${qid(idegen)} WITH (FORCE)`]);
step('Z. a mérés saját idegen-maradéka eldobva (a mérés nem hagy szemetet)', nincsOtt(idegen), `${idegen} — ${letezesAlap(idegen)}`);

/**
 * A SAJÁT ERŐFORRÁS TAKARÍTÁSA A VERDIKT ELŐTT FUT (R166, KÜLSŐ REVIEW, Codex, P2 · `KUKA-405`).
 * Így a maradék egy MÉRT lépés, nem egy figyelmeztetés a kilépési horogban. A horog BENT marad
 * biztonsági hálóként a rendellenes kilépésre — de a verdiktet nem ő dönti el.
 */
const maradekSajat = dobjaSajat();
step('Y. a lánc MINDEN saját adatbázisa eldobva (a maradék BUKTAT, nem csak figyelmeztet)',
  maradekSajat.length === 0,
  maradekSajat.length ? `MARADÉK: ${maradekSajat.join(' · ')}` : 'nem maradt saját adatbázis');

console.log('='.repeat(94));
const bad = marks.filter((m) => !m.ok);
console.log(`ALAPSOKASÁG: ${marks.length} mért ellenpróba-lépés.`);
// A NEM MÉRT LÉPÉS NEVEZETTEN ÁLL, NEM NÉMA ZÖLDKÉNT (KUKA-093 · KUKA-363).
if (nemMert.length) { console.log(`NEM MÉRT (${nemMert.length}) — nevezve:`); for (const x of nemMert) console.log(`  · ${x}`); }
if (bad.length === 0 && nemMert.length === 0) {
  console.log('RENDBEN — a kapu a ROSSZ esetekben is megáll, a forrás és az idegen adat sértetlen,');
  console.log('          a hibás visszatöltés nem lesz PASS, és a megszakadt futás nem hagy szemetet.');
  process.exit(0);
}
/**
 * A NEM MÉRT ESET NEM LEHET „RENDBEN" (R166, KÜLSŐ REVIEW, Codex, P2 · `KUKA-406`).
 *
 * A LELET: a siker-feltétel csak a bukott lépéseket nézte. Egy TCP-only kiszolgálón az E10
 * (`socket:` séma ellenpárja) a `nemMert` listába került és KIMARADT — a lánc mégis „RENDBEN"-t
 * írt és 0-val lépett ki, vagyis a söprés és a jelentés a NEM TÁMOGATOTT socket-átirányítást
 * BIZONYÍTOTTNAK vehette. A nem futott nem „részben", és nem zöld (`KUKA-200` · `KUKA-206`).
 */
if (bad.length === 0) {
  console.log('NEM TELJES — minden MÉRT ellenpróba zöld, DE nevezett eset NEM MÉRT (lásd fentebb).');
  console.log('             A lánc verdiktje ezért NEM „RENDBEN": a nem futott nem „részben", és nem zöld.');
  process.exit(4);
}
console.log('LELET:'); for (const m of bad) console.log(`  · ${m.name} — ${m.detail || ''}`);
process.exit(3);
