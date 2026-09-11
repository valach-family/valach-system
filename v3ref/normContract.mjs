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
// KIMONDOTT HIÁNY, AMIT NEM HELYETTESÍTÜNK (`source_document.text_digest: null`). A K01–K16
// SZÖVEGE a külső félnél, az R32 dokumentumban él; nálunk csak az AZONOSÍTÓ és a CÍM van meg. Ezért
// ez az artefaktum a szerződés CÍMJEGYZÉKÉNEK kanonikus alakja, és a lenyomata IS annak a
// lenyomata — nem a teljes normaszövegé. Ezt kimondjuk, nem pótoljuk egy hihető hash-sel: a
// hiányzó kötés hangosabb, mint egy hamis (KUKA-012 · KUKA-033). A lezárás útja egy sor a
// következő körben: a külső fél megadja az R32 kanonikus bájtjait vagy azok lenyomatát, és a
// `source_document.text_digest` élővé válik.
//
// PURE + INERT: nincs DB, nincs hálózat, nincs titok. Adat és egy tiszta lenyomat-számoló.

import { createHash } from 'node:crypto';

export const NORM_CONTRACT_ID = 'NCT-01';

/**
 * A KANONIKUS SZERZŐDÉS. A `version` az EGYETLEN norma-verzió, amit a futás közöl; a `clauses` a
 * K-szabályok stabil azonosítói és címei, abban a sorrendben, ahogy az R32 hozza őket.
 */
export const NORM_CONTRACT = Object.freeze({
  id: NORM_CONTRACT_ID,
  version: 'R32/K01-K16',
  // A SZÖVEG NEM ITT ÉL — és ezt a mező maga mondja ki.
  source_document: Object.freeze({
    name: 'R32',
    holder: 'a külső tárgyaló fél',
    text_digest: null,
    gap: 'a K01–K16 teljes normaszövege nálunk nincs meg, csak az azonosító és a cím; a szöveg '
      + 'lenyomatához a külső fél kanonikus bájtjai (vagy azok hash-e) kellenek. Amíg ez nincs meg, '
      + 'a `contractDigest` a CÍMJEGYZÉK lenyomata — és ezt a futás kiírja, nem hallgatja el.',
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
    source_document: {
      name: NORM_CONTRACT.source_document.name,
      text_digest: NORM_CONTRACT.source_document.text_digest,
    },
    clauses: NORM_CONTRACT.clauses.map((k) => [k.id, k.title]),
  });
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

/** A hivatkozás alakja — ezt teszi a futás a kimenetbe, és ehhez kötődik minden jóváhagyás. */
export function contractRef() {
  return Object.freeze({
    id: NORM_CONTRACT.id,
    version: NORM_CONTRACT.version,
    digest: contractDigest(),
    digest_scope: 'a szerződés CÍMJEGYZÉKE (azonosító + cím + verzió) — a teljes normaszöveg nem itt él',
    source_document: NORM_CONTRACT.source_document,
  });
}
