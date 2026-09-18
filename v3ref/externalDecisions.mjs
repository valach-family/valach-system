// V3 MAGREFERENCIA — A KÜLSŐ FÉL TARTALMI DÖNTÉSEI (EXD-01).
//
// MI EZ, ÉS MI NEM. Az OB-7 szerint a norma ↔ állítás TARTALMI megfelelését a KÜLSŐ ellenőrző fél
// (chatgpt-v3) bírálja el, és ezt Claude-írta elfogadás NEM helyettesítheti. A CMD-VS-300-002-002
// **R37 — ANALYSIS** lapon ezt a döntést meghozták, klauzulánként, indokkal. Ez a fájl AZT a
// döntést rögzíti, szó szerinti indokkal.
//
// EZ NEM GÉPI HITELESÍTÉS, és nem a repó `content_review` rekordja. Külön tengely, és a kettő
// SOHA nem vonható össze — a külső fél maga kötötte ki: „NEM állítom, hogy a repository
// content_review rekordjai már gépileg hitelesítettek. A mechanikus átvezetés nem adhat szélesebb
// jóváhagyást, és nem gyárthat operátori aláírást." (KUKA-102 · KUKA-105: a minősítési szintek
// összemosása néma elsőbbséget ad az egyiknek.)
//
// A HATÓKÖR, AHOGY ŐK KIMONDTÁK: „a referenciában elfogadva" az itt vizsgált EGYÍRÓS, SZINTETIKUS,
// megbízható belső kontextusú modellben a norma és a MEGNEVEZETT állítások tartalmi megfelelésére
// szól — nem általános biztonsági tanúsítvány és nem teljes rendszerkészültség. Forrás- vagy
// követelményváltozásnál az érintett döntés ÚJRAELLENŐRZENDŐ.
//
// PURE + INERT: nincs DB, nincs hálózat, nincs titok. Csak a rögzített döntés.

export const EXTERNAL_DECISION_SOURCE = Object.freeze({
  round: 'CMD-VS-300-002-002 R37 — ANALYSIS',
  decided_by: 'chatgpt-v3 (külső ellenőrző fél)',
  at: '2026-09-18',
  examined_revision: 'valach-family/valach-system@c89196134cfbfbab5fa9007c187aeeb150ff36c9',
  scope: 'egyírós, szintetikus, megbízható belső kontextusú referencia-modell — a norma és a '
    + 'MEGNEVEZETT állítások tartalmi megfelelése; NEM biztonsági tanúsítvány, NEM rendszerkészültség',
  not_a_machine_attestation: true,
  revalidate_on: 'forrás- vagy követelményváltozás az érintett klauzulán',
});

/** A HÁROM DÖNTÉS-SZÓ ZÁRT HALMAZ — ismeretlen szó nem csúszhat át „valaminek" (KUKA-101). */
export const EXTERNAL_VERDICTS = Object.freeze(['accepted_in_reference', 'partial', 'open', 'not_accepted_as_whole']);

/**
 * A KÉT MEZŐ VISZONYA, KIMONDVA (R39, a külső fél helyesbítése). A `reason` a KÜLSŐ döntés szövege,
 * SZÓ SZERINT, változatlanul — a fejlesztői előrehaladás oda NEM keveredhet bele. Az R37-es alakban
 * két indokba („R37-ben javítva/pótolva") belekerült a mi megjegyzésünk, és ettől a lap azt
 * állította, hogy a külső fél SZÓ SZERINT ezt mondta. Nem ezt mondta. A saját előrehaladás
 * mostantól KÜLÖN mezőben áll (`our_progress_note`), és az SOHA nem módosítja a döntést:
 * **új elfogadást Claude nem adhat magának** (KUKA-105: két minősítési szint összemosása néma
 * elsőbbséget ad az egyiknek).
 */
export const EXTERNAL_CLAUSE_DECISIONS = Object.freeze([
  Object.freeze({ clause: 'REV-N1a', verdict: 'accepted_in_reference',
    reason: 'P-CMD-finalize-gate a befogadást, ismétlést és olvasást ugyanazon tranzakciós határon megvonással méri. Több író külön kapu.' }),
  Object.freeze({ clause: 'REV-N1b', verdict: 'accepted_in_reference',
    reason: 'korábbi parancs/nyugta/kiadás tartalmi pillanatképe megmarad; jogos új audit-sor hozzáfűzhető. Nem puszta darabszám.' }),
  Object.freeze({ clause: 'REV-N1c', verdict: 'open',
    reason: 'a joghatás korrekciós eseménye és alkalmazandó profilja hiányzik.' }),
  Object.freeze({ clause: 'REV-N2a', verdict: 'accepted_in_reference',
    reason: 'bitemporális, grant-axis, evidence-home és grant-atomic próbák elkülönítik a két tengelyt, a jövőbeli és utólagos rögzítést. A projected_row gyengébb történeti tanú marad, nem teljes eseménynapló.' }),
  Object.freeze({ clause: 'REV-N2b', verdict: 'accepted_in_reference',
    reason: 'a review-circle a megnevezett időablak és alany/könyv szerint számított, a nem érintettek kimaradnak, az eredeti parancstörténet változatlan. Ez nem korrekció végrehajtása.' }),
  Object.freeze({ clause: 'REV-N3a', verdict: 'accepted_in_reference',
    reason: 'műveletenkénti hatáskör, felfüggesztés, ép bizonyíték és hatályosulási pont vizsgált; jogosulatlan hatás nem keletkezik.' }),
  Object.freeze({ clause: 'REV-N3b', verdict: 'accepted_in_reference',
    reason: 'bejelentésből nem keletkezik olvasási jog; semleges válasz és jogos elbírálói olvasás ellenpárja megvan.' }),
  Object.freeze({ clause: 'REV-N3c', verdict: 'accepted_in_reference',
    reason: 'a szöveg saját adapter-feltételezésével: semleges, atomi befogadás és belső kvóta. A valódi beadók izolációját nem fogadom bele.' }),
  Object.freeze({ clause: 'REV-N3d', verdict: 'open',
    reason: 'valódi szerveroldali beadókontextus és mérhető izoláció nincs; a közös unattributed vödör nem helyettesíti.' }),
  Object.freeze({ clause: 'REV-N3e', verdict: 'open',
    reason: 'a technikai karantén saját művelete, hatásköre, oka és auditja nincs meg.' }),
  Object.freeze({ clause: 'REV-N4a', verdict: 'open',
    reason: 'az eredetire hivatkozó kompenzáló esemény nincs.' }),
  Object.freeze({ clause: 'REV-N4b', verdict: 'open',
    reason: 'a meglévő hatáskörmodell használható alap, de a kompenzáló esemény saját jóváhagyási és auditútját még bizonyítani kell. Az „egyetlen előfeltétel” nem jelenti, hogy a bekötés automatikusan kész.' }),
  Object.freeze({ clause: 'REV-N5a', verdict: 'accepted_in_reference',
    reason: 'a megnevezett belépési és engedő utakra: ban-paths, ban-matrix, entry-points, pozitív és negatív cellák. Jövőbeli adapterekre nem terjed ki automatikusan.' }),
  Object.freeze({ clause: 'REV-N5b', verdict: 'accepted_in_reference',
    reason: 'ok→fajta→hatókör, független könyv/hitelesítő ellenpár, hiányos és ellentmondó tárolt rekord elutasítása.' }),
  Object.freeze({ clause: 'REV-N5c', verdict: 'accepted_in_reference',
    reason: 'a korábbi történet és független jogosultak joga megmarad; tiltásból nem keletkezik múltbeli érvénytelenség.' }),
  Object.freeze({ clause: 'K05-DSC-a', verdict: 'accepted_in_reference',
    reason: 'típus/verzió szerinti eredményséma, a kérő címkéjétől független besorolás, ismeretlen verzió ellenpár.' }),
  Object.freeze({ clause: 'K05-DSC-b', verdict: 'accepted_in_reference',
    reason: 'beágyazás, második tömbelem, hibás levéltípus és ismeretlen mező ellenőrzött, semleges olvasási elutasítással.' }),
  Object.freeze({ clause: 'K05-DSC-c', verdict: 'partial',
    reason: 'a tiltott mezőt tartalmazó vegyes eredmény egészbeni megtagadása bizonyított. A „minden adatkörre érvényes olvasási döntés” erősebb az explicit tiltás hiányánál; az adatkörre korlátozott engedő alap és a tényleges kiadás közötti bizonyíték nincs megadva. Ezt a különbséget ne zöldítsd át.' }),
  Object.freeze({ clause: 'K05-DSC-d', verdict: 'accepted_in_reference',
    reason: 'EGYÜTT: P-A08 + P-CMD-finalize-gate + P-CMD-release-effectuation. P-A08 önmagában a hatályosulási versenyt nem fedi; a kiegészítő bizonyíték-kötést rögzíteni kell.' }),
  Object.freeze({ clause: 'K10-TYP-a', verdict: 'partial',
    reason: 'a könyvön belüli SKU és keresztkönyves azonosság bizonyított; két sor nem falszifikált. A név/formázás/mennyiség változásától független stabil típusazonosság teljes állítása nincs e három sorral bizonyítva.',
    our_progress_note: 'R37: a két nem falszifikált sorra célzott mutáció készült (M159 · M160), '
      + 'mindkettő elkapva és NÉV SZERINT a saját állítását döntve. A klauzula MARADÉKA (a stabil '
      + 'típusazonosság teljes állítása) ettől NEM szűnt meg — a külső döntés változatlanul áll.' }),
  Object.freeze({ clause: 'K10-TYP-b', verdict: 'not_accepted_as_whole',
    reason: 'F37-02 és négy not_falsified sor; a sémaverzió kezelése külön hiány.',
    our_progress_note: 'R37: az F37-02 javítva (SOP-01, saját kulcsos feloldás), a négy sorra '
      + 'célzott mutáció készült (M153 · M155 · M156 · M157), és a sémaverzió tulajdonosa/határa '
      + 'kimondva (SVR-01). R39: a határ a KANONIKUS bevét-úton is végigmegy (M163), mert addig a '
      + 'felső szintű `version` argumentum némán eltűnt. A klauzula EGÉSZKÉNT azonban továbbra sem '
      + 'elfogadott — az a külső fél döntése, és nem a miénk.' }),
  Object.freeze({ clause: 'K10-TYP-c', verdict: 'partial',
    reason: 'két profil létezik (qty-1, qty-2), ezért az „egyetlen profil” indok hamis. Profilváltás utáni történeti értelmezéshez továbbra is külön bizonyíték kell.' }),
  Object.freeze({ clause: 'K10-TYP-d', verdict: 'partial',
    reason: 'KSZ atomiság/ismétlés és két profil szerinti működés vizsgált; a korábbi verzió/más profil miatti ismétlési és hibahatár teljes bizonyítása hiányzik. A lehetetlenségi indokot törölni kell, a hiányt nem.' }),
  Object.freeze({ clause: 'K10-TYP-e', verdict: 'partial',
    reason: 'a két időtengely bizonyított. A szöveg nem követeli most a teljes QNT megépítését; a megfigyelés saját idejének szerződéses helye és a hatásmentes művelet határa továbbra is külön QNT-előfeltétel.' }),
  Object.freeze({ clause: 'ORG-N1a', verdict: 'partial',
    reason: 'BAS-01 verziózott alap és hatáskörkiadás bizonyított. Az általános képviseleti lefedés nem teljes. A régi maradék „a meghívó nem hordoz alapot” mondata ütközik a már létező BLI-01 bizonyítékkal; aktualizálni kell.' }),
  Object.freeze({ clause: 'ORG-N1b', verdict: 'partial',
    reason: 'a deklarált meghívó kiadás/beváltás korlátja bizonyított; a deklarálatlan alap és a bírálati hatáskör korlátjának kikényszerítése nyitott.' }),
  Object.freeze({ clause: 'ORG-N2a', verdict: 'accepted_in_reference',
    reason: 'a kibocsátó megvont jogán a függő meghívó nevezetten elakad.' }),
  Object.freeze({ clause: 'ORG-N3a', verdict: 'open',
    reason: 'a vagylagos és együttes jogalapút külön modellje hiányzik.' }),
  Object.freeze({ clause: 'ORG-N3b', verdict: 'open',
    reason: 'a tiltás meglévő; a második engedő út feletti elsőbbség még nem mérhető.' }),
]);

const BY_CLAUSE = new Map(EXTERNAL_CLAUSE_DECISIONS.map((d) => [d.clause, d]));

/** Egy klauzula KÜLSŐ döntése, vagy `null`. A hiány NEM „elfogadva" (KUKA-093). */
export function externalDecisionFor(clauseId) {
  return BY_CLAUSE.get(clauseId) || null;
}

/** Hány klauzulán áll ma „referenciában elfogadva" — MÉRVE, nem beírva (KUKA-045). */
export function acceptedInReference() {
  return EXTERNAL_CLAUSE_DECISIONS.filter((d) => d.verdict === 'accepted_in_reference').map((d) => d.clause);
}
