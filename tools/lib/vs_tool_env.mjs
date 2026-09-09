// Valach System (VS) v2 — A SZÁLLÍTOTT ESZKÖZ KÖRNYEZET-BETÖLTÉSE, EGY NEVEZETT HELYEN (KUKA-040).
//
// OPERÁTORI LELET (2026-08-20, az ELSŐ éles futtatáson): a KS munka/projekt visszatöltő a KS-oldalt
// hibátlanul végigmérte (1542 sor · 1200 bizonylat · 62 elnevezés · 72 projekt), majd ezzel állt meg:
// „nincs DATABASE_URL beállítva (ez a gép nem éri el az adatbázist)" — az operátor SAJÁT gépén, ahol a
// DATABASE_URL a repó `.env` fájljában él, és ahol minden más eszköz eléri az adatbázist. Az eszköz
// egyszerűen nem olvasta be a `.env`-et: ezt a repó 88 másik eszköze BEMÁSOLT kód-blokként hordozza,
// és a 89. kimaradt. Ami másolatban él, azt egy új fájl NÉMÁN kihagyhatja (KUKA-003).
//
// EZ A HELY a betöltés. Két szabály köti:
//   • ÉRTÉKET SOHA nem ad vissza és nem ír ki (ÁLLANDÓ: a DATABASE_URL és bármely kulcs csak `.env`-ben
//     él — se chat, se napló, se hibaüzenet); a visszatérési érték csak TÉNY: van-e, honnan jött;
//   • MEGLÉVŐ környezeti változót SOHA nem ír felül — éles futáson (Railway) a valódi környezet az
//     erősebb, a fájl csak akkor szólal meg, ha a környezet hallgat.
//
// A meglévő 88 eszköz bemásolt blokkja működik, ezért nem bántjuk; az új és a javított eszközök viszont
// ide jönnek. A gépi jel nem a másolatokat számolja, hanem azt méri, hogy az OPERÁTOR ÁLTAL FUTTATHATÓ
// (--apply/--confirm kapus, adatbázist hívó) eszközök közül egyik se maradjon környezet-betöltés nélkül.

import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);

// A `.env` sorai: `KULCS=érték`, `export KULCS=érték`, idézőjelezve is; `#`-kezdetű sor komment.
// Saját olvasó azért van, hogy a betöltés akkor is menjen, ha a dotenv csomag hiányzik (a szállított
// eszköz nem függhet attól, mi van éppen telepítve az operátor gépén).
export function parseEnvText(text) {
  const out = new Map();
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    const q = v[0];
    if ((q === '"' || q === "'") && v.length > 1 && v[v.length - 1] === q) v = v.slice(1, -1);
    else { const hash = v.indexOf(' #'); if (hash > 0) v = v.slice(0, hash).trim(); }
    out.set(m[1], v);
  }
  return out;
}

// Kik hívták ebben a folyamatban (gyökér-utak, titok nélkül). Ettől a HÍVÁS ténye MÉRHETŐ: a gépi őr
// nem a forrás szövegét olvassa, hanem betölti az eszközt és megnézi, hogy tényleg lefutott-e a
// betöltés (KUKA-009 · KUKA-024 — a hívó és a betöltő VISZONYA a mérendő, nem a két oldal külön).
const loadedRoots = [];
export function envLoadsSoFar() { return loadedRoots.slice(); }

// A repó gyökeréhez tartozó `.env` betöltése. A `root` KÖTELEZŐ és a HÍVÓ adja (az eszköz a saját
// fájljához képest oldja fel — KUKA-031), hogy a betöltő se tippelje meg senki környezetét.
export function loadRepoEnv(root, { file = '.env' } = {}) {
  loadedRoots.push(String(root));
  const envFile = join(root, file);
  const envFileExists = existsSync(envFile);
  const hadDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const applied = [];

  if (envFileExists) {
    let wanted = new Map();
    try { wanted = parseEnvText(readFileSync(envFile, 'utf8')); } catch { /* olvashatatlan: lásd lent */ }
    // MI HIÁNYZOTT a betöltés ELŐTT — a lelet ehhez mérődik, nem ahhoz, hogy KI töltötte be (különben
    // a dotenv csendben elvégzi a munkát, és a jelentésünk üres marad: néma alul-jelentés, KUKA-012).
    const missingBefore = [...wanted.keys()].filter((k) => process.env[k] === undefined);
    // Elsőként a dotenv (ezt ismeri a repó többi 88 eszköze — ugyanaz a fájl ugyanúgy olvasódjon),
    // utána a saját olvasó pótol: ami a környezetben MÉG nincs, azt teszi be.
    try { require('dotenv').config({ path: envFile }); } catch { /* a csomag opcionális */ }
    for (const [k, v] of wanted) if (process.env[k] === undefined && v !== '') process.env[k] = v;
    for (const k of missingBefore) if (process.env[k] !== undefined) applied.push(k);
  }

  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  return Object.freeze({
    envFile,
    envFileExists,
    // Csak TÉNY, soha nem érték: 'env' = a környezetből jött · 'file' = a `.env`-ből · null = sehonnan.
    databaseUrlFrom: hadDatabaseUrl ? 'env' : (hasDatabaseUrl ? 'file' : null),
    hasDatabaseUrl,
    // Mely KULCSOK jöttek a fájlból (nevek, értékek nélkül) — diagnosztikához elég, titkot nem visz.
    appliedKeys: Object.freeze(applied),
  });
}

// Az az EGY mondat, amit egy eszköz kiír, ha nincs adatbázis-elérése. A kudarcot ott nevezi meg, ahol
// TÖRTÉNT — nem a gépre keni (a „futtasd az operátor gépén" pont akkor hangzott el, amikor ott futott).
export function noDatabaseReason(env) {
  if (!env || !env.envFileExists) {
    return 'Nem találtam adatbázis-elérést: a környezetben nincs beállítva, és a repó gyökerében nincs '
      + '`.env` fájl sem. (Ez a gép így nem éri el az adatbázist — nincs mit javítani a betöltésen.)';
  }
  return 'Nem találtam adatbázis-elérést: a repó gyökerében lévő `.env` fájlt beolvastam, de nincs benne '
    + 'DATABASE_URL sor (vagy üres). A fájl helye: ' + env.envFile;
}
