'use strict';

// Valach System — A GENERÁLT FÁJLOK NEVE ÉS HELYE (ART-01).
//
// OPERÁTORI PARANCS (2026-09-09): „Az újra generálódó fileok (script logok, backupok) a következő
// file néven legyenek: v3_v3.1.1_20260909_104201_…"
//
// A NÉV ALAKJA — hat darab, alulvonással:
//
//     v3   _  v3.1.1  _  20260909  _  104201  _  <mit>   .  <kiterjesztés>
//     ↑       ↑          ↑            ↑          ↑
//     fő      pontos     dátum        idő        mi ez
//     vonal   verzió                             (kisbetűs, ékezet nélkül)
//
// MIÉRT ÁLL OTT A FŐ VONAL IS (`v3`), ha a pontos verzióból (`v3.1.1`) amúgy is kiolvasható —
// és MI NEM AZ INDOKA. Az operátor így kérte, és a redundancia olcsó: a szem egy pillantással
// látja, melyik vonal kimenete, és a `v3_*` minta egy vonalat egyben fog meg.
//
// AMIT NEM CSINÁL, ÉS EZT KI KELL MONDANI: az előtag NEM rendez. MÉRVE (ART06 ellenpár):
//   ELŐTAGGAL   → v3_v3.10.0_…   v3_v3.9.0_…   v4_v4.0.0_…
//   NÉLKÜLE     →    v3.10.0_…      v3.9.0_…      v4.0.0_…
// A `3.10` mindkét alakban a `3.9` ELÉ kerül (ábécé-rendben az `1` < `9`), és a v4 mindkét alakban
// a végén áll. Az első alakomban azt írtam ide, hogy az előtag „a v3.9 és a v3.10 közé kerülést"
// akadályozza meg — ez HAMIS volt, és a saját mérésem cáfolta meg (KUKA-033: levezetett állítást
// nem jelölünk bizonyítéknak, amíg a mérése le nem futott).
//
// AMI VISZONT IGAZ, és ez a név valódi értéke: a DÁTUM+IDŐ fix szélességű, ezért EGY VONALON BELÜL
// az ábécé-rend pontosan IDŐ-rend. A verzió a névben SZÁRMAZÁS (melyik kód írta), nem rendezési
// kulcs. Ezt az ART06 önpróba MÉRI, nem ígéri.
//
// MIÉRT ÍRJUK BELE A VERZIÓT EGYÁLTALÁN: egy hónapokkal későbbi mentésnél az első kérdés az, hogy
// MELYIK KÓD írta. A visszaállítás rendje (VERSIONING.md 5.) erre épül: a rossz kiadást a KÓD
// visszagörgetése javítja — ehhez tudni kell, melyik kiadás állította elő az adott állományt.
//
// A VERZIÓ A `package.json`-BÓL JÖN, SOHA NEM GÉPELVE (KUKA-005 · KUKA-033): a hívó átadja, a
// verifier pedig méri, hogy a szerszámok tényleg onnan veszik.
//
// AZ IDŐ A GÉP HELYI IDEJE, nem UTC — mert ezeket a fájlneveket EMBER olvassa a saját gépén, és
// a 12:42-kor készült mentés ne „10:42"-t mondjon. Ezt ki kell mondani, mert felhőben futtatva
// (ahol a gép órája UTC) más lesz: a fájl a KELETKEZÉS HELYÉNEK idejét viseli.
//
// PURE + INERT: nincs DB, nincs hálózat, nincs titok, nincs fájlrendszer-írás. Csak név-számítás.

const ARTIFACT_NAMING_CONTRACT_ID = 'ART-01';

// A GENERÁLT KIMENET EGYETLEN GYÖKERE. A V2-ben ez kilenc külön helyen élt (backups · runtime_logs ·
// test_logs · test-results · audit_out · i18n_munka · i18n_atiras · logs · tmp), mindegyik külön
// alkalommal, külön .gitignore-sorral — és emiatt egy elrontott út `undefined/` nevű, KÖVETETT
// könyvtárat hozott létre három képpel a repóban. Egy fogalomnak EGY otthona (KUKA-018 · KUKA-003).
const VAR_ROOT = 'var';

// A TERÜLETEK — nevezett, zárt halmaz. Új terület csak ide kerülhet, mert a `.gitignore` és a
// takarítás is EBBŐL dolgozik; egy „majd csinálok egy mappát" alak némán kikerülne a védelem alól.
const AREAS = Object.freeze({
  logs: Object.freeze({ dir: `${VAR_ROOT}/logs`, what: 'futás-naplók: mit csinált egy szerszám, mikor' }),
  backups: Object.freeze({ dir: `${VAR_ROOT}/backups`, what: 'adatbázis-mentések — ÜZLETI ADAT, a repóba soha' }),
  reports: Object.freeze({ dir: `${VAR_ROOT}/reports`, what: 'mérések, átvilágítások, lábnyom-riportok' }),
  exports: Object.freeze({ dir: `${VAR_ROOT}/exports`, what: 'kivitt adat (CSV, XLSX) — ÜZLETI ADAT' }),
  tmp: Object.freeze({ dir: `${VAR_ROOT}/tmp`, what: 'eldobható munka-állomány; bármikor törölhető' }),
});

const pad = (n, w = 2) => String(n).padStart(w, '0');

// SZIGORÚ SemVer — ugyanaz az alak, amit a kiadási menetrend használ (semver.org 2.0.0).
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

/**
 * A NÉV IDŐ-RÉSZE a gép HELYI idejéből. Nem `toISOString()` — az UTC-re vált, és a fájlnév
 * hazudna az embernek, aki a saját gépén nézi (a V2-ben 40 szerszám épített kézzel ilyen nevet,
 * legalább három különböző alakban — KUKA-003).
 * @returns {{date: string, time: string}} pl. { date: '20260909', time: '104201' }
 */
function stampParts(at) {
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) throw new Error('artifactNaming: érvénytelen időpont');
  return {
    date: `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`,
    time: `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`,
  };
}

/** A fő vonal a pontos verzióból — `3.1.1` → `v3`, `3.0.0-alpha` → `v3`. */
function majorLine(version) {
  const m = /^(\d+)\./.exec(String(version || '').trim());
  if (!m) throw new Error(`artifactNaming: nem értelmezhető verzió: ${version}`);
  return `v${m[1]}`;
}

/**
 * A „mit" darab: kisbetűs, ékezet nélküli, alulvonásos. A fájlnév hordozható marad (az operátor
 * útjában amúgy is van szóköz és `+` — a fájlnév ne tegyen hozzá újabb bajt), és a szét-daraboláskor
 * sem ütközik az elválasztóval.
 */
function slug(kind) {
  const s = String(kind || '').trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // ékezet le
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!s) throw new Error('artifactNaming: üres megnevezés (kind)');
  return s;
}

/**
 * A TELJES FÁJLNÉV. A verifier EZT HÍVJA — nem másolja le a mintát (KUKA-009).
 *
 * @param {{kind:string, ext:string, version:string, at?:Date|string}} o
 * @returns {string} pl. 'v3_v3.1.1_20260909_104201_sema_mentes.sql'
 */
function artifactName({ kind, ext, version, at = new Date() }) {
  const v = String(version || '').trim();
  if (!v) throw new Error('artifactNaming: hiányzik a verzió (a package.json-ból kell jönnie, nem gépelve)');
  // R42 §2.4 mérése: perjeleket tartalmazó „verzió" ÚTVONAL-RÉSZEKET vitt a fájlnévbe
  // (`v1_v1.0.0/../../etc_…`). A `majorLine` csak az elejét nézte, a többit változatlanul beírtuk.
  // A verzió a `package.json`-ból jön, tehát ma bizalmas bemenet — de a közös segédnek nem szabad
  // ezen múlnia: EGY nem várt hívó, és a név útvonallá válik.
  if (!SEMVER.test(v)) throw new Error(`artifactNaming: a verzió nem érvényes SemVer: ${JSON.stringify(v)}`);
  const e = String(ext || '').trim().replace(/^\.+/, '').toLowerCase();
  if (!/^[a-z0-9]{1,8}$/.test(e)) throw new Error(`artifactNaming: nem értelmezhető kiterjesztés: ${ext}`);
  const { date, time } = stampParts(at);
  return `${majorLine(v)}_v${v}_${date}_${time}_${slug(kind)}.${e}`;
}

/**
 * A TELJES ÚT a repó gyökeréhez képest — a terület a zárt halmazból.
 * @returns {string} pl. 'var/backups/v3_v3.1.1_20260909_104201_sema_mentes.sql'
 */
function artifactPath({ area, ...rest }) {
  // R42 §2.4 mérése: `area: 'toString'` az ÖRÖKÖLT tulajdonságot találta meg, és `undefined/…`
  // útvonalat adott — hiba nélkül. A sima objektum indexelése örökölt kulcsot is talál; SAJÁT
  // kulcsra kell kérdezni (ugyanaz a hiba-osztály, mint a Q07 a jogosultsági osztályoknál).
  const a = Object.prototype.hasOwnProperty.call(AREAS, area) ? AREAS[area] : null;
  if (!a) throw new Error(`artifactNaming: ismeretlen terület: ${JSON.stringify(area)} — a választható: ${Object.keys(AREAS).join(', ')}`);
  return `${a.dir}/${artifactName(rest)}`;
}

/** Visszafejtés: a névből kiolvasható, MELYIK kiadás írta és MIKOR. */
function parseArtifactName(name) {
  const m = /^v(\d+)_v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)_(\d{8})_(\d{6})_([a-z0-9_]+)\.([a-z0-9]{1,8})$/.exec(String(name || ''));
  if (!m) return null;
  return { major: `v${m[1]}`, version: m[2], date: m[3], time: m[4], kind: m[5], ext: m[6] };
}

module.exports = {
  ARTIFACT_NAMING_CONTRACT_ID,
  VAR_ROOT,
  AREAS,
  artifactName,
  artifactPath,
  parseArtifactName,
  majorLine,
  slug,
  stampParts,
};
