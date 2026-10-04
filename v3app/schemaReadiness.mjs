// V3 — KÉSZENLÉT A KIADOTT KÓDHOZ MÉRVE (RDY-01).
//
// A LELET (a külső ellenőrző fél F150-02 esete, saját kézzel is reprodukálva). A korábbi `/ready`
// kiolvasta a `schema_migration` verzióit, lefuttatott egy `SELECT 1`-et, és MINDIG 200-at adott.
// Mérve, a forrásból változtatás nélkül kiemelt kezelővel:
//   · `versions=[]`      → HTTP 200 · ok:true · schema_head:null
//   · `versions=['000']` → HTTP 200 · ok:true · schema_head:'000'
// Vagyis egy ÜRES vagy IDEGEN sémájú adatbázisra a kiadás-kapu ZÖLDET mondott volna, és a
// telepítő ráirányította volna a forgalmat. Ez a KUKA-049 alakja a készenléten: a zöld nem a
// valóságot mondta, hanem azt, hogy a kérdést fel sem tettük.
//
// A MÉRCE MOSTANTÓL A KIADOTT KÓD ELVÁRÁSA. A csomag `migrations/` könyvtára MAGA a szerződés:
// ami ott van, annak le kell futnia, UGYANAZZAL az ellenőrzőösszeggel. Nem a legnagyobb verziót
// hasonlítjuk — egy KIMARADT köztes migráció ugyanúgy bukik, mint egy hiányzó utolsó (KUKA-039:
// a fél őr a negyediken némán hibázik).
//
// A JÖVŐBELI BŐVÍTÉS KIMONDOTT SZABÁLYA. Ha az adatbázison a kiadott készleten FELÜL is van
// migráció (mert egy újabb kiadás már lefuttatta, és most visszagörgettünk), az NEM készenlét-
// hiba: a bővítő migrációk előre-kompatibilisek, és a visszagörgetés útja épp ez. Az ilyen
// többletet NEVESÍTVE jelezzük (`ahead_versions`), nem némán elnyeljük — a kiadás lássa, hogy
// régebbi kód fut egy újabb sémán.
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

/** A KIADOTT csomag elvárt migrációs készlete — a lemezről, a kód mellől. */
export function requiredMigrations(dir) {
  return readdirSync(dir)
    .filter((f) => /^\d{3}_[a-z0-9_]+\.sql$/.test(f))
    .sort()
    .map((f) => ({
      version: f.slice(0, 3),
      file: f,
      sha256: createHash('sha256').update(readFileSync(join(dir, f), 'utf8')).digest('hex'),
    }));
}

/** A készenlét NEVEZETT állapotai. A szöveg a telepítőnek és az embernek szól, titok nélkül. */
export const READINESS_REASONS = Object.freeze({
  ready: 'a séma a kiadott kódhoz illik',
  store_unreachable: 'a tároló nem érhető el',
  migration_ledger_missing: 'a migrációs nyilvántartás nem létezik — a séma még nem épült fel',
  migration_missing: 'a kiadott kód által elvárt migráció(k) NEM futottak le',
  migration_checksum_mismatch: 'lefutott migráció(k) tartalma ELTÉR a kiadott kódétól',
  migration_set_unreadable: 'a kiadott csomag migrációs készlete NEM OLVASHATÓ — a kód nem tudja, milyen sémát vár',
  migration_set_empty: 'a kiadott csomag migrációs készlete ÜRES — PostgreSQL-üzemben ez nem elfogadható elvárás',
});

/**
 * A KÉSZLET BETÖLTÉSE FAIL-CLOSED (RDY-03).
 *
 * A LELET (a külső ellenőrző fél F152-01 esete, saját méréssel igazolva). A szerver így húzta be
 * az elvárt készletet:
 *
 *     try { return requiredMigrations(dir); } catch { return []; }
 *
 * Az ÜRES készletre pedig a `schemaReadiness` nem talál hiányzó migrációt — tehát egy olvasási
 * hiba vagy egy hiányzó `migrations/` könyvtár mellett a készenlét **ÜRES adatbázison is
 * `ready: true`, HTTP 200** lett. MÉRVE: `required=[]` + üres nyilvántartás → 200 · `ready` ·
 * `schema_head: null`. Vagyis a kiadás-kapu épp akkor mondott zöldet, amikor a kód **nem tudja,
 * milyen sémát vár**. Ez a KUKA-020 alakja: a nyelt hiba „nincs elvárás"-sá változott.
 *
 * A SZABÁLY: „nem tudom, mit várok" SOHA nem jelenti azt, hogy „semmit nem várok". A hiba OKÁT
 * megőrizzük (nem tüntetjük el), és a készlet NEM kézi verziólistából jön — továbbra is a kiadott
 * csomagból (a parancs kikötése: „ne új kézi verziólista legyen").
 */
export function loadMigrationSet(dir) {
  try {
    const list = requiredMigrations(dir);
    return Object.freeze({ ok: true, list: Object.freeze(list) });
  } catch (e) {
    // AZ OK MEGMARAD — a naplóban nevén nevezzük; a KIFELÉ menő válaszba nem tesszük bele.
    return Object.freeze({ ok: false, cause_code: e && e.code, cause: String(e && e.message || e) });
  }
}

/**
 * Készenlét-ítélet. SOHA nem ad vissza nyers adatbázis-hibaüzenetet: a kifelé menő válasz
 * NEVEZETT állapot, mert a `/ready` a publikus URL-en is elérhető (a kapu előtt áll).
 *
 * @param {{all:Function,get:Function}} store
 * @param {string} dialect
 * @param {{version:string,sha256:string}[]} required
 */
export function schemaReadiness(store, dialect, requiredSet) {
  // A BEMENET LEHET NYERS LISTA (visszafelé) VAGY a `loadMigrationSet` eredménye.
  const set = Array.isArray(requiredSet) ? { ok: true, list: requiredSet } : (requiredSet || { ok: false, cause: 'nincs készlet' });
  const required = set.ok ? set.list : null;
  // Az SQLite-út fejlesztői, eldobható tároló: ott a séma a tároló NYITÁSAKOR épül fel, nincs
  // migrációs nyilvántartás, és nincs mihez mérni. Ezt KIMONDJUK, nem hallgatólagosan zöldezzük.
  // AZ SQLITE-ÚT A KÉSZLETTŐL FÜGGETLEN, és ezt a SORREND tartja: ott a séma a tároló
  // nyitásakor épül fel, migrációs készlet fogalmilag nincs — egy olvasási hiba tehát nem
  // minősítheti nem-késszé a fejlesztői tárolót.
  if (dialect !== 'postgres') {
    try { store.get('SELECT 1 AS ok'); } catch {
      return { ready: false, reason: 'store_unreachable', http: 503, detail: { store: dialect } };
    }
    return { ready: true, reason: 'ready', http: 200, detail: { store: dialect, schema_managed_by: 'store_open', migrations: 'nincs alkalmazható eset (fejlesztői SQLite)' } };
  }

  // FAIL-CLOSED A KÉSZLETRE (RDY-03) — a tároló megkérdezése ELŐTT. Ha a kód nem tudja, milyen
  // sémát vár, akkor nincs mihez mérni: a készenlét NEM eldönthető, tehát NEM zöld.
  if (!set.ok) {
    return { ready: false, reason: 'migration_set_unreadable', http: 503, detail: { store: dialect } };
  }
  if (required.length === 0) {
    return { ready: false, reason: 'migration_set_empty', http: 503, detail: { store: dialect } };
  }

  let applied;
  try {
    applied = store.all('SELECT version, sha256 FROM schema_migration ORDER BY version');
  } catch (e) {
    // A KÉT OK KÜLÖNBÖZŐ (KUKA-171): a NYILVÁNTARTÁS hiánya nem ugyanaz, mint az elérhetetlen
    // adatbázis. Az előbbit egy lefuttatatlan migráció okozza, az utóbbit a hálózat vagy a
    // kiszolgáló. A telepítő mindkettőre 503-at kap, de a NEVE más, mert a teendő is más.
    const missingTable = String(e && e.code) === '42P01' || /schema_migration/.test(String(e && e.message));
    return missingTable
      ? { ready: false, reason: 'migration_ledger_missing', http: 503, detail: { store: dialect } }
      : { ready: false, reason: 'store_unreachable', http: 503, detail: { store: dialect } };
  }

  const have = new Map(applied.map((r) => [String(r.version), String(r.sha256)]));
  const missing = required.filter((m) => !have.has(m.version)).map((m) => m.version);
  if (missing.length) {
    return { ready: false, reason: 'migration_missing', http: 503,
      detail: { store: dialect, missing_versions: missing, required_count: required.length } };
  }
  const mismatched = required.filter((m) => have.get(m.version) !== m.sha256).map((m) => m.version);
  if (mismatched.length) {
    return { ready: false, reason: 'migration_checksum_mismatch', http: 503,
      detail: { store: dialect, mismatched_versions: mismatched } };
  }
  const requiredVersions = new Set(required.map((m) => m.version));
  const ahead = applied.map((r) => String(r.version)).filter((v) => !requiredVersions.has(v));
  return { ready: true, reason: 'ready', http: 200,
    detail: {
      store: dialect,
      schema_head: required.length ? required[required.length - 1].version : null,
      required_count: required.length,
      // ELŐRE-KOMPATIBILIS TÖBBLET: nem hiba, de NEVESÍTVE látszik.
      ahead_versions: ahead,
      // ÉS AMIT A TÖBBLET NEM BIZONYÍT (F152-02 kikötése). A többlet elfogadása NEM a mi
      // ellenőrzésünkön áll — a futó kód ezeket a migrációkat NEM IS SZÁLLÍTJA, tehát a
      // tartalmukat nem tudja megnézni. Az elfogadás a KIADÁSI RENDEN nyugszik
      // (`contracts/releaseOrder.js`: BŐVÍTÉS → ÁTÁLLÁS → SZŰKÍTÉS, és a bontó migráció
      // `-- KIVEZETVE:` fejléce KORÁBBI a mainál). Ha az a rend sérül, ez a sor NEM véd meg —
      // ezért mondjuk ki, ahelyett hogy a puszta számot bizonyítéknak látszanánk (KUKA-049).
      ahead_note: ahead.length
        ? 'a többlet elfogadása a kiadási rend (bővítés-először) szerződésén nyugszik, NEM a futó kód ellenőrzésén — a nem szállított migrációk tartalmát ez a példány nem látja'
        : null,
    } };
}
