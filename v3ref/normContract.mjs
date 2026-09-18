// V3 MAGREFERENCIA — A KANONIKUS NORMA-SZERZŐDÉS ARTEFAKTUMA (NCT-01; R55/F04).
//
// MIÉRT SZÜLETETT. Az R54-ben a futás `norm_contract.version: R32/K01-K16` mellé kiadott egy
// `digest` mezőt — de az a lenyomat a MI nyolc REV/ORG szabályunk kiválasztott mezőiből készült,
// nem abból a szerződésből, amit megnevezett. A külső fél D01 diagnosztikája ezt mérve mutatta meg:
// a K01 helyi CÍMÉT átírva a hash VÁLTOZATLAN maradt. Egy lenyomat, ami nem annak a dolognak a
// bájtjaiból származik, amit azonosít, nem azonosítás (KUKA-038 a hasheken).
//
// A JAVÍTÁS: KÉT KÜLÖN ARTEFAKTUM, KÉT KÜLÖN LENYOMAT.
//   · EZ A FÁJL a KANONIKUS SZERZŐDÉS artefaktuma: verziózott, tartalmilag rögzített, és a
//     lenyomata a SAJÁT kanonikus bájtjaiból képződik (`contractDigest`).
//   · A `norms.mjs` a BIZONYÍTÉK-INDEX (NRM-01): saját séma-verzió, saját lenyomat
//     (`indexDigest`), és HIVATKOZIK a szerződés verziójára és lenyomatára.
// A kettő így nem tud összekeveredni, és a szerződés bármely változása ÉRVÉNYTELENÍTI az arra
// épült tartalmi jóváhagyásokat (lásd `norms.mjs` → content_review).
//
// A FORRÁSKÖTÉS ÉLŐVÉ VÁLT (R57 §6). A külső fél átadta az R32 kanonikus bájtjait: a board
// `20260908_V3_CORE_EGYSEGES_R32_CHATGPT` lapjának 1. verziója, 61 040 bájt. A teljes dokumentum
// bájtazonos másolata ITT él (`source-documents/R32_board_v1.md`), és a `text_digest` NEM bemásolt
// konstans, hanem a FÁJL BÁJTJAIBÓL mérve születik minden betöltéskor — pontosan azért, mert a
// KUKA-101 épp arról szól, hogy a lenyomat abból származzon, amit megnevez.
//
// A KÜLSŐ FÉL KIKÖTÉSE, AMIT TELJESÍTÜNK: „Ne másoljatok be pusztán egy konstans hash-t ellenőrzés
// nélkül: a rögzített artefaktum bájtjaiból számolt érték egyezését is mérjétek." Ezért az általa
// kiadott értéket ELVÁRT értékként tartjuk (`attested`), és a modul betöltéskor összeveti a MÉRTtel.
// Eltérésnél NEVEZETT hibával áll meg — nem folytatja csendben egy másik szöveg lenyomatával
// (KUKA-020: a programhiba nem lehet ugyanaz a válasz, mint a valódi „nincs").
//
// KÉT HATÓKÖR, KÉT LENYOMAT — és ezt a mező maga mondja ki: a TELJES dokumentum a forráskötés, a
// K01–K16 SZELET (`[10202, 39196)` bájt) külön, célzott ellenőrzésre. A címjegyzék lenyomata ettől
// külön marad: a `contractDigest` a címjegyzéket ÉS a forrásszöveg lenyomatát is magába foglalja,
// tehát az R32 szövegének bármely változása érvényteleníti a rá épült jóváhagyásokat.
//
// INERT: nincs DB, nincs hálózat, nincs titok. Egy rögzített fájl, adat és tiszta lenyomat-számolók.

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export const NORM_CONTRACT_ID = 'NCT-01';

// ── A RÖGZÍTETT FORRÁSDOKUMENTUM ────────────────────────────────────────────────────────────────
// A külső fél R57 §6-ban kiadott értékei. Ezek ELVÁRT értékek, nem a forrásai a mezőnek: a valódi
// érték a fájl bájtjaiból születik, és az eltérés MEGÁLLÍTJA a betöltést.
// ── A MÓDOSÍTÁSOK (R35) — A TÖRTÉNETI SZÖVEG ÉRINTETLEN ─────────────────────────────────────────
//
// Az R35 §„K05 és K10" elfogadta a K05-DSC-a…d és a K10-TYP-a…e követelmény-szövegeket, és kikötötte:
// „A történeti R32 forrásdokumentumot és hash-t ne írjátok át: verziózott kiegészítéssel, e körre
// hivatkozva rögzítendők." Ezért az R32 artefaktum, a bájthossza és a lenyomata VÁLTOZATLAN — a
// kiegészítés SAJÁT artefaktumként, SAJÁT mért lenyomattal áll mellé, és a szerződés verziója
// mondja ki, hogy a kettő EGYÜTT a mai alap.
//
// A LENYOMAT ITT IS MÉRT, NEM BEGÉPELT (KUKA-121): a `byte_length` és a `text_digest` a fájl
// bájtjaiból születik betöltéskor; az `attested` érték csak ELVÁRÁS, és az eltérés MEGÁLLÍT.
const AMENDMENT_ARTIFACTS = Object.freeze([
  Object.freeze({
    id: 'R35/K05-DSC+K10-TYP',
    artifact: 'source-documents/R35_board_v1.md',
    board_document: '20260918_V3_R35_R33_DONTESEK_ES_LEZARAS',
    board_version: 1,
    attested_by: 'chatgpt-v3',
    attested_in: 'CMD-VS-300-002-002 R35 — ANALYSIS',
    adds: Object.freeze(['K05-DSC-a', 'K05-DSC-b', 'K05-DSC-c', 'K05-DSC-d',
      'K10-TYP-a', 'K10-TYP-b', 'K10-TYP-c', 'K10-TYP-d', 'K10-TYP-e']),
    // KIMONDVA: ez KÖVETELMÉNY-SZÖVEG elfogadása, NEM a megvalósítás vagy a norma-állítások
    // teljesülésének elfogadása (R35 szó szerinti kikötése).
    scope: 'requirement_text_only',
  }),
]);

const SOURCE_ARTIFACT = 'source-documents/R32_board_v1.md';
const ATTESTED = Object.freeze({
  by: 'chatgpt-v3',
  round: 'CMD-VS-300-002-001 R57 — ANALYSIS',
  board_document: '20260908_V3_CORE_EGYSEGES_R32_CHATGPT',
  board_version: 1,
  byte_length: 61040,
  text_digest: 'sha256:cc8a8b5fabe4313001092071ef2819c924d2491fd8d35ddc92aab7b95dc9e3b5',
  section: Object.freeze({
    name: 'K01–K16 (a 2. szakasz)',
    range: Object.freeze([10202, 39196]),
    byte_length: 28994,
    digest: 'sha256:4f4f57eb26244c0f92a6744a76313a4ab5690c844232d35de56c6a3b1f918d33',
  }),
});

const ARTIFACT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), SOURCE_ARTIFACT);
const sha = (buf) => `sha256:${createHash('sha256').update(buf).digest('hex')}`;

/** A rögzített artefaktum MÉRT alakja — bájt-hossz és a két lenyomat, a fájl tartalmából. */
function measureSourceArtifact() {
  let bytes;
  try {
    bytes = readFileSync(ARTIFACT_PATH);
  } catch (cause) {
    const err = new Error(
      `normContract: a rögzített forrásdokumentum hiányzik (${SOURCE_ARTIFACT}) — a szerződés `
      + 'forráskötése enélkül nem mérhető; töltsd le a boardról: '
      + `${ATTESTED.board_document} (${ATTESTED.board_version}. verzió)`,
    );
    err.code = 'NORM_SOURCE_ARTIFACT_MISSING';
    err.cause = cause;
    throw err;
  }
  const [from, to] = ATTESTED.section.range;
  return Object.freeze({
    byte_length: bytes.length,
    text_digest: sha(bytes),
    section_digest: sha(bytes.subarray(from, to)),
    section_byte_length: to - from,
  });
}

const MEASURED = measureSourceArtifact();

/** A MÓDOSÍTÓ ARTEFAKTUMOK MÉRÉSE — ugyanaz a fegyelem, mint a történeti forráson. */
const MEASURED_AMENDMENTS = Object.freeze(AMENDMENT_ARTIFACTS.map((a) => {
  let bytes;
  try {
    bytes = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), a.artifact));
  } catch (cause) {
    const err = new Error(
      `normContract: a módosító forrásdokumentum hiányzik (${a.artifact}) — a kiegészítés `
      + `forráskötése enélkül nem mérhető; töltsd le a boardról: ${a.board_document} `
      + `(${a.board_version}. verzió)`,
    );
    err.code = 'NORM_AMENDMENT_ARTIFACT_MISSING';
    err.cause = cause;
    throw err;
  }
  return Object.freeze({
    ...a,
    byte_length: bytes.length,
    text_digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
  });
}));

// A KIADOTT ÉRTÉK ÉS A MÉRT ÉRTÉK VISZONYA — ezt mérjük, nem hisszük el (KUKA-101 · KUKA-033).
{
  const mismatches = [
    ['bájt-hossz', MEASURED.byte_length, ATTESTED.byte_length],
    ['teljes lenyomat', MEASURED.text_digest, ATTESTED.text_digest],
    ['K01–K16 szelet lenyomata', MEASURED.section_digest, ATTESTED.section.digest],
    ['K01–K16 szelet hossza', MEASURED.section_byte_length, ATTESTED.section.byte_length],
  ].filter(([, measured, attested]) => measured !== attested);
  if (mismatches.length) {
    const err = new Error(
      'normContract: a rögzített forrásdokumentum NEM az, amiről a szerződés szól — '
      + mismatches.map(([what, m, a]) => `${what}: mért ${m} ≠ kiadott ${a}`).join(' · '),
    );
    err.code = 'NORM_SOURCE_ARTIFACT_MISMATCH';
    throw err;
  }
}

/**
 * A KANONIKUS SZERZŐDÉS. A `version` az EGYETLEN norma-verzió, amit a futás közöl; a `clauses` a
 * K-szabályok stabil azonosítói és címei, abban a sorrendben, ahogy az R32 hozza őket.
 */
export const NORM_CONTRACT = Object.freeze({
  id: NORM_CONTRACT_ID,
  // A VERZIÓ KIMONDJA, MI AZ ALAP: a történeti R32 SZELET és az R35-ös kiegészítés EGYÜTT.
  version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP',
  amendments: MEASURED_AMENDMENTS,
  // A FORRÁSSZÖVEG RÖGZÍTVE ÉS MÉRVE — a `text_digest` a fájl bájtjaiból, nem bemásolt konstansból.
  source_document: Object.freeze({
    name: 'R32',
    artifact: `v3ref/${SOURCE_ARTIFACT}`,
    board_document: ATTESTED.board_document,
    board_version: ATTESTED.board_version,
    attested_by: ATTESTED.by,
    attested_in: ATTESTED.round,
    byte_length: MEASURED.byte_length,
    text_digest: MEASURED.text_digest,
    section: Object.freeze({
      name: ATTESTED.section.name,
      range: ATTESTED.section.range,
      byte_length: MEASURED.section_byte_length,
      digest: MEASURED.section_digest,
    }),
    note: 'ez az R32 TÖRTÉNETI 1. verziójának kötése. A későbbi körökben elfogadott pontosításokat '
      + '(pl. a megvonás és a bejelentés bontása) nem vonja vissza: azok a verziózott indexen és '
      + 'kifejezett módosítási kapcsolaton át követhetők, és a következő konszolidáció ÚJ verziót és '
      + 'ÚJ lenyomatot kap. Nem nevezzük változatlan R32-nek azt, amit közben módosítottunk.',
  }),
  clauses: Object.freeze([
    Object.freeze({ id: 'K01', title: 'Alany, azonosító és kötés' }),
    Object.freeze({ id: 'K02', title: 'Saját indulás és a gazda nélküli állapot' }),
    Object.freeze({ id: 'K03', title: 'Fiók, belépés, meghívás és tagság' }),
    Object.freeze({ id: 'K04', title: 'Engedély, képviselet és frissesség' }),
    Object.freeze({ id: 'K05', title: 'Adatkiadás, összesítés és megfigyelhetőség' }),
    Object.freeze({ id: 'K06', title: 'Esemény, állítás, egyeztetés és elfogadott hatás' }),
    Object.freeze({ id: 'K07', title: 'Parancs, egyszeri hatás és újrapróbálás' }),
    Object.freeze({ id: 'K08', title: 'Üzleti idő, tudásállapot, történet és korrekció' }),
    Object.freeze({ id: 'K09', title: 'Megvonás, másolat, helyreállítás és életciklus' }),
    Object.freeze({ id: 'K10', title: 'Típus, normalizálás és számítási profil' }),
    Object.freeze({ id: 'K11', title: 'Művelettípus-katalógus és teljes moduléletciklus' }),
    Object.freeze({ id: 'K12', title: 'Kiesés, bizonyítékfrissesség és mentésből helyreállítás' }),
    Object.freeze({ id: 'K13', title: 'Import, nyitás és idegen rendszer múltja' }),
    Object.freeze({ id: 'K14', title: 'Felelősség, megállapodás és őrzési feladat' }),
    Object.freeze({ id: 'K15', title: 'Visszaélési és erőforrás-korlátok' }),
    Object.freeze({ id: 'K16', title: 'Hiányosan azonosított fél és fizikai valóság' }),
  ]),
});

export const K_IDS = Object.freeze(new Set(NORM_CONTRACT.clauses.map((k) => k.id)));

/** A SZERZŐDÉS SAJÁT bájtjainak lenyomata — a verzió ÉS minden klauzula azonosítója és címe. */
export function contractDigest() {
  const bytes = JSON.stringify({
    id: NORM_CONTRACT.id,
    version: NORM_CONTRACT.version,
    // A FORRÁSSZÖVEG LENYOMATA IS BENNE VAN: így az R32 szövegének bármely változása megváltoztatja
    // a szerződés lenyomatát, és ezzel elavultatja a rá épült tartalmi jóváhagyásokat.
    source_document: {
      name: NORM_CONTRACT.source_document.name,
      text_digest: NORM_CONTRACT.source_document.text_digest,
      section_digest: NORM_CONTRACT.source_document.section.digest,
    },
    clauses: NORM_CONTRACT.clauses.map((k) => [k.id, k.title]),
    // A MÓDOSÍTÁSOK LENYOMATA IS BENNE VAN: egy kiegészítés ugyanúgy megváltoztatja az alapot, mint
    // a történeti szöveg módosítása volna — a rá épült jóváhagyások ezért elavulnak (R35 kikötése).
    amendments: (NORM_CONTRACT.amendments || []).map((a) => [a.id, a.text_digest]),
  });
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

/** A hivatkozás alakja — ezt teszi a futás a kimenetbe, és ehhez kötődik minden jóváhagyás. */
export function contractRef() {
  return Object.freeze({
    id: NORM_CONTRACT.id,
    version: NORM_CONTRACT.version,
    digest: contractDigest(),
    digest_scope: 'a címjegyzék (azonosító + cím + verzió) ÉS a rögzített R32 forrásszöveg lenyomata '
      + '— a teljes dokumentum bájtjaiból mérve, nem bemásolt konstansból',
    source_document: NORM_CONTRACT.source_document,
  });
}

/** A rögzített artefaktum MÉRT alakja — a próba ezt HÍVJA, nem a fájlt olvassa újra (KUKA-009). */
export function sourceArtifactMeasurement() {
  return Object.freeze({ path: ARTIFACT_PATH, attested: ATTESTED, measured: MEASURED });
}

/**
 * A FELOLDHATÓ DOKUMENTUM-KATALÓGUS (R61/F01, az ő R02 esetük).
 *
 * MIÉRT SZÜLETETT. A jóváhagyás-rekord `document` fajtájú bizonyíték-hivatkozása eddig KÉT nem üres
 * szöveget kért (`ref` + `note`), és semmit nem oldott fel. A külső fél kitalált hivatkozásokkal
 * jött (`NONEXISTENT-R61-POSITIVE`), és a rekord `current` lett: a „feloldható hivatkozás" ígéret
 * a dokumentum-ágon egyszerűen nem teljesült (KUKA-066 — a kitalált forrás nem hibának látszik,
 * hanem adatnak).
 *
 * MIÉRT NEM KELL HOZZÁ HÁLÓZAT. A rögzített forrás-dokumentumok a repóban állnak
 * (`v3ref/source-documents/`), és a lenyomatuk a BÁJTJAIKBÓL születik. A feloldás tehát mérés, nem
 * letöltés — a tiszta magreferencia offline is eldönti, hogy a hivatkozott dokumentum LÉTEZIK-E és
 * hogy a rekordba írt lenyomat A MAI tartalomé-e.
 *
 * A katalógus a fájl-rendszerből épül, nem kézi listából (KUKA-051: a hatókör SZABÁLY, nem lista) —
 * új dokumentum felvételéhez nincs mit frissíteni, és a hiánya nem néma.
 */
const DOCUMENTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'source-documents');

let DOCUMENT_CATALOG = null;
export function sourceDocumentCatalog() {
  if (DOCUMENT_CATALOG) return DOCUMENT_CATALOG;
  const out = new Map();
  let names = [];
  try { names = readdirSync(DOCUMENTS_DIR).filter((n) => !n.startsWith('.')).sort(); } catch { names = []; }
  for (const name of names) {
    let bytes;
    try { bytes = readFileSync(resolve(DOCUMENTS_DIR, name)); } catch { continue; }
    out.set(name, Object.freeze({
      id: name,
      path: `v3ref/source-documents/${name}`,
      byte_length: bytes.length,
      digest: sha(bytes),
    }));
  }
  DOCUMENT_CATALOG = Object.freeze(out);
  return DOCUMENT_CATALOG;
}
