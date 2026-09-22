// V3 MAGREFERENCIA — REP-01: A KÉPVISELET CSERÉLHETŐ ELLENŐRZÉSE (R64 L2 · R75 §3/3).
//
// A KÉRDÉS, AMIT EZ A MODUL ELDÖNT: kell-e a művelethez annak bizonyítása, hogy a cselekvő egy MÁS
// jogalany nevében járhat el — és ha igen, van-e ilyen bizonyíték.
//
// A HATÁR, SZÓ SZERINT (R75 §3/3): „önbevallott saját munkatér, belső készlet-/folyamatpróba és
// saját felület UX-egyeztetése indulhat hatósági képviselet-igazolás nélkül. Más szervezet már
// létező körének átvétele vagy joghatásos képviselete ebből nem következik."
//
// MIÉRT KELL EHHEZ KÜLÖN MODUL, HA MA EGYETLEN MŰVELET SEM IGÉNYEL KÉPVISELETET. Mert a hiányt
// eddig PRÓZA hordozta (OB-6 · ORG-N3 „nyitva"), és a próza nem kapu: amikor az első ilyen művelet
// megszületik, a fejlesztője vagy megkeresi a szabályt, vagy nem (KUKA-041 · KUKA-092). Itt a
// szabály ZÁRT REGISZTER, a hiány NEVEZETT válasz, és az adapter helye ki van vágva — nem „majd
// megoldjuk", hanem „ide kerül, és addig ez a művelet nem indul".
//
// AMIT EZ A MODUL NEM CSINÁL — KIMONDVA:
//   · nem országprofil-adapter és nem hatósági kapcsolat (az L5 marad nyitva, üzemi feltétel);
//   · a hiányzó képviseleti bizonyíték CSAK AZ ADOTT MŰVELETET zárja — a regisztrációt, a saját kör
//     indítását és a saját adatok kezelését SOHA (ez a R75 §3/3 kimondott kikötése);
//   · nem dönt jogosultságról: a tagságot és a hatáskört továbbra is a mag jogosultsági kapui
//     (`authz.mjs`, `authorityBasis.mjs`) mérik — ez a modul EGY TOVÁBBI feltétel, nem helyettesítő.

const frozen = (o) => Object.freeze(o);

/**
 * A MŰVELET-OSZTÁLYOK ZÁRT REGISZTERE. Ismeretlen osztály FAIL-CLOSED (KUKA-122/2): aki elnevezi
 * másnak a műveletét, nem kerüli meg a kaput, hanem nevezett elutasítást kap.
 */
export const REPRESENTATION_CLASSES = frozen({
  // MA ÉLŐ, ENGEDETT OSZTÁLY — ezen áll az egész első core-folyamat.
  own_self_declared_work: frozen({
    requires_proof: false,
    what: 'a saját, ÖNBEVALLOTT munkatér indítása és használata (saját kör · belső készlet- és '
      + 'folyamatpróba · a saját felület UX-egyeztetése) — az adószám itt ÁLLÍTÁS, nem igazolás',
    stated_limit: 'ebből NEM következik más jogalany képviselete, és nem következik cégnév vagy '
      + 'azonosító globális lefoglalása',
  }),
  // MA ZÁRT OSZTÁLYOK — egyik művelet sincs megépítve; ha megépül, ezen a kapun kell átmennie.
  represent_existing_legal_person: frozen({
    requires_proof: true,
    what: 'joghatású eljárás egy MÁS, már létező jogalany nevében (hatósági beadvány · szerződéskötés '
      + 'a nevében · hivatalos adatszolgáltatás)',
    stated_limit: 'ma NINCS megépítve ilyen művelet; a kapu azért áll, hogy az első ilyen művelet ne '
      + 'az önbevallott adószámra épüljön',
  }),
  take_over_existing_space: frozen({
    requires_proof: true,
    what: 'egy MÁR LÉTEZŐ, más által nyitott kör átvétele (nem meghívóval, hanem képviseleti jogon)',
    stated_limit: 'ma a kör átvételének EGYETLEN útja a meghívó (DLG-01) — ez a sor a meghívó '
      + 'NÉLKÜLI átvételre szól, ami nincs megépítve',
  }),
});

/**
 * A CSERÉLHETŐ ADAPTER HELYE. Ma egyetlen adapter sincs bekötve, és ezt a válasz KIMONDJA
 * (`adapter: 'none_available'`) — nem üres igazzal, nem néma engedéllyel (KUKA-012 · KUKA-089).
 *
 * Az adapter alakja szándékosan MINIMÁLIS: `{ id, verify({ actorSubjectId, targetRef, at }) →
 * { proven: boolean, evidence_ref?, reason? } }`. Aki beköt egyet, a saját bizonyítékával jön.
 */
export const REPRESENTATION_ADAPTERS = frozen({});

export function adapterFor(adapterId) {
  if (typeof adapterId !== 'string') return null;
  if (!Object.prototype.hasOwnProperty.call(REPRESENTATION_ADAPTERS, adapterId)) return null;
  return REPRESENTATION_ADAPTERS[adapterId];
}

export function classFor(operationClass) {
  if (typeof operationClass !== 'string') return null;
  if (!Object.prototype.hasOwnProperty.call(REPRESENTATION_CLASSES, operationClass)) return null;
  const found = REPRESENTATION_CLASSES[operationClass];
  return found && typeof found === 'object' && typeof found.requires_proof === 'boolean' ? found : null;
}

/**
 * A DÖNTÉS. Mindig NEVEZETT, és mindig megmondja, MIT zár — a művelet zárása sosem terjed ki a
 * regisztrációra vagy a saját munkára (KUKA-064: a nemleges válasz vigye magával a folytatást).
 */
export function representationCheck({ operationClass, adapterId = null, actorSubjectId = null, targetRef = null, at = null } = {}) {
  const spec = classFor(operationClass);
  if (!spec) {
    return frozen({
      allowed: false, reason: 'unknown_representation_class', adapter: 'none_available',
      closes: 'only_this_operation',
      message: `ismeretlen képviseleti osztály: ${JSON.stringify(operationClass)} — választható: ${Object.keys(REPRESENTATION_CLASSES).join(' · ')}`,
    });
  }
  if (!spec.requires_proof) {
    return frozen({
      allowed: true, reason: 'no_representation_required', adapter: null, closes: null,
      basis: 'self_declared', stated_limit: spec.stated_limit, message: spec.what,
    });
  }
  const adapter = adapterFor(adapterId);
  if (!adapter) {
    return frozen({
      allowed: false, reason: 'representation_unproven', adapter: 'none_available',
      closes: 'only_this_operation',
      does_not_close: frozen(['registration', 'own_self_declared_work', 'own_data_use']),
      message: 'ehhez a művelethez MÁS jogalany képviseletének bizonyítéka kellene; ilyen ellenőrzés '
        + 'ma nincs bekötve — ez a művelet nem indítható, a saját köröd indítása és használata viszont igen',
    });
  }
  const verdict = adapter.verify({ actorSubjectId, targetRef, at });
  if (!verdict || verdict.proven !== true) {
    return frozen({
      allowed: false, reason: 'representation_unproven', adapter: adapter.id,
      closes: 'only_this_operation', detail: (verdict && verdict.reason) || null,
      does_not_close: frozen(['registration', 'own_self_declared_work', 'own_data_use']),
      message: 'a képviseleti ellenőrzés nem igazolta a jogot ehhez a művelethez',
    });
  }
  return frozen({
    allowed: true, reason: 'representation_proven', adapter: adapter.id,
    evidence_ref: verdict.evidence_ref ?? null, closes: null,
  });
}

export const REP_CONTRACT = frozen({
  id: 'REP-01',
  owns: 'kell-e képviseleti bizonyíték a művelethez, és van-e',
  classes: frozen(Object.keys(REPRESENTATION_CLASSES)),
  adapters: frozen(Object.keys(REPRESENTATION_ADAPTERS)),
  fail_closed: 'ismeretlen osztály ⇒ unknown_representation_class (nincs megengedő ág)',
  scope_of_refusal: 'CSAK az adott művelet — a regisztráció, a saját kör indítása és a saját adatok '
    + 'kezelése soha nem zárul be képviseleti bizonyíték hiányától',
  stated_gap: 'ma NULLA adapter van bekötve, és NULLA megépített művelet tartozik a két zárt '
    + 'osztályba — a kapu előre áll, hogy az első ilyen művelet ne az önbevallott adószámra épüljön',
});
