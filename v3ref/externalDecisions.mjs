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

/**
 * R45 — AZ ÚJ, HATÓKÖRÖS DÖNTÉS SAJÁT FORRÁSSAL (a külső fél kikötése az R45-ben):
 * *„Az R37 14 elfogadott / 15 részleges vagy nyitott döntése történeti állapot. Ezt ne írd át
 * visszamenőleg: az új, hatókörös K10-b döntés forrása R45. A döntéseket forrásukkal és
 * hatókörükkel vezesd át; a történeti idézetet őrizd meg."*
 *
 * EZÉRT NEM ÍRTUK FELÜL A FENTI SORT. A regiszter mostantól KÉT rétegű: a történeti (R37) döntés
 * ÉRINTETLENÜL megmarad, az R45-ös pedig MELLÉ kerül, saját forrással — és a MAI állapotot a
 * `externalDecisionFor` a LEGÚJABB döntésből adja, a történetit pedig `superseded` alatt viszi
 * magával (KUKA-105: két minősítési szintet soha nem mosunk össze; itt két IDŐÁLLAPOTOT nem).
 */
export const EXTERNAL_DECISION_SOURCE_R45 = Object.freeze({
  round: 'CMD-VS-300-002-002 R45 — ANALYSIS',
  decided_by: 'chatgpt-v3 (külső ellenőrző fél)',
  at: '2026-09-18',
  examined_revision: 'valach-family/valach-system@a0d41d9062a6ae2ce214a199c63903b3d11ebdac',
  scope: 'a jelenlegi egyírós, szintetikus referencia belső séma- és kanonikus bevétútja — NEM az '
    + 'OB-3 külső HTTP-/bizalmi határa, és nem minden korábbi tárolt adat változatlansága',
  not_a_machine_attestation: true,
  revalidate_on: 'forrás- vagy követelményváltozás az érintett klauzulán',
});

/**
 * R47 — AZ R45-ÖS TÖRTÉNETMEGŐRZÉSI CSOMAG LEZÁRÁSA, saját forrással. Az R45-ös döntéseket NEM
 * írjuk felül: *„Az R45 történeti döntést ne írd át; az R47 lezárást és pontosított K10-d indokot
 * saját forrással vezesd át."*
 */
export const EXTERNAL_DECISION_SOURCE_R47 = Object.freeze({
  round: 'CMD-VS-300-002-002 R47 — ANALYSIS',
  decided_by: 'chatgpt-v3 (külső ellenőrző fél)',
  at: '2026-09-18',
  examined_revision: 'valach-family/valach-system@0c32ec602589b62fce09fd861abcb1288823612f',
  scope: 'a vizsgált belső referencia és a megnevezett adattáblák bizonyítása — NEM éles üzem, NEM '
    + 'több író, és NEM összeomlás utáni tartósság elfogadása',
  not_a_machine_attestation: true,
  revalidate_on: 'forrás- vagy követelményváltozás az érintett klauzulán',
});

/**
 * R51 — AZ R49-ES KÉT ÁRKIADÁSI JAVÍTÁS ELFOGADÁSA a referencia hatókörében, DE a K05-DSC-c
 * egésze NEM zárul: *„Az F49-01 és F49-02 konkrét árkiadási hibájának javítását a vizsgált,
 * egyírós szintetikus referencia hatókörében elfogadom. … K05-DSC-c egészét még nem zárom le."*
 * Ugyanitt: *„A 15, referencia-hatókörben elfogadott egész klauzula száma nem nő; ez nem
 * készültségi százalék."*
 */
export const EXTERNAL_DECISION_SOURCE_R51 = Object.freeze({
  round: 'CMD-VS-300-002-002 R51 — ANALYSIS',
  decided_by: 'chatgpt-v3 (külső ellenőrző fél)',
  at: '2026-09-19',
  examined_revision: 'valach-family/valach-system@aa801458a17fe16c34cb37706abef0431a8a3ffa',
  scope: 'a vizsgált, EGYÍRÓS szintetikus referencia hatóköre — NEM éles üzem, NEM több író, és '
    + 'NEM összeomlás utáni tartósság elfogadása',
  not_a_machine_attestation: true,
  revalidate_on: 'forrás- vagy követelményváltozás az érintett klauzulán',
});

/**
 * R53 — A K05-DSC-c ELFOGADÁSA a szűk referencia-hatókörben, és az ORG-N1b kijelölése következőnek.
 * Az elfogadás KIMONDOTTAN nem terjed ki a külső hitelesítési/HTTP-határra, a teljes szervezeti
 * képviseletre és a core-core lezárásra. A korábbi R37/R51 döntések `superseded` történetként
 * maradnak meg — a történeti állapotot nem írjuk át.
 */
export const EXTERNAL_DECISION_SOURCE_R53 = Object.freeze({
  round: 'CMD-VS-300-002-002 R53 — ANALYSIS',
  decided_by: 'chatgpt-v3 (külső ellenőrző fél)',
  at: '2026-09-19',
  examined_revision: 'valach-family/valach-system@203fe870cf093e250120b8ca1fa27232af6fc871',
  scope: 'a jelenlegi EGYÍRÓS, SZINTETIKUS, megbízható belső kontextusú referencia explicit '
    + 'adatköri jogadása és eredménykiadása — NEM a külső hitelesítési/HTTP-határ, NEM a teljes '
    + 'szervezeti képviselet, és NEM a teljes core-core lezárás',
  not_a_machine_attestation: true,
  revalidate_on: 'forrás- vagy követelményváltozás az érintett klauzulán',
});

/**
 * R55 — AZ R53-AS HATÁSKÖRI CSOMAG ELLENŐRZÉSE. A K05-DSC-c elfogadása ÉRVÉNYBEN MARAD; az
 * ORG-N1a/b TOVÁBBRA IS RÉSZLEGES, req-5-re lépés nincs, és az elfogadott egész klauzulák száma
 * változatlanul 16. A hatásköri csomagot ez a kör KIMONDOTTAN nem zárja le teljesen.
 */
export const EXTERNAL_DECISION_SOURCE_R55 = Object.freeze({
  round: 'CMD-VS-300-002-002 R55 — ANALYSIS',
  decided_by: 'chatgpt-v3 (külső ellenőrző fél)',
  at: '2026-09-19',
  examined_revision: 'valach-family/valach-system@f675aed6e74038ab6fe34764e9376d912eba9831',
  scope: 'az R53-as hatásköri csomag ellenőrzése a beadott forráson — a K05-DSC-c korábbi '
    + 'elfogadása érvényben marad, az ORG-N1a/b részleges, és NINCS req-5-re lépés vagy '
    + 'core-core lezárás',
  not_a_machine_attestation: true,
  revalidate_on: 'forrás- vagy követelményváltozás az érintett klauzulán',
});

/**
 * R57 — AZ F55-01 ÉS F55-02 JAVÍTÁSÁNAK ELFOGADÁSA, SZŰK HATÓKÖRBEN. A külső fél kimondta: az
 * R53–R56 deklarált alapú bírálati hatásköri javítócsomag EBBEN a hatókörben lezárt — de az
 * ORG-N1a/b EGÉSZE TOVÁBBRA IS RÉSZLEGES, req-5-re lépés és core-core lezárás NINCS, és az
 * elfogadott egész klauzulák száma VÁLTOZATLANUL 16. Saját szavukkal: „A részcsomag lezárását nem
 * szabad új egész-klauzulás elfogadásként számolni." Ezért a verdikt itt `partial` MARAD — a
 * részcsomag lezárása a döntés INDOKÁBAN áll, nem a klauzula minősítésében (KUKA-105: két
 * minősítési szintet soha nem mosunk össze).
 */
export const EXTERNAL_DECISION_SOURCE_R57 = Object.freeze({
  round: 'CMD-VS-300-002-002 R57 — ANALYSIS',
  decided_by: 'chatgpt-v3 (külső ellenőrző fél)',
  at: '2026-09-20',
  examined_revision: 'valach-family/valach-system@de47183cd043474c0c385b5f0519e04d2b5ee90a',
  scope: 'az R53–R56 deklarált alapú bírálati hatásköri javítócsomag a három meglévő műveletre '
    + '(suspend · adjudicate · alter_right) a vizsgált egyírós, szintetikus, megbízható belső '
    + 'kontextusú referenciában — NEM a teljes általános szervezeti képviselet, NEM az alap nélkül '
    + 'adott jogok általános üzleti szabálya, és NEM core-core lezárás',
  not_a_machine_attestation: true,
  revalidate_on: 'forrás- vagy követelményváltozás az érintett klauzulán',
});

/**
 * R61 — AZ R57–R60 LELTÁR-/ÁTADÁSI CSOMAG LEZÁRÁSA. A külső fél az R59 három javítását a vizsgált
 * referencia-hatókörben ELFOGADTA, és kimondta, hogy a csomag LEZÁRHATÓ — de ugyanabban a
 * mondatban azt is: „Ez nem az összes core-követelmény lezárása." Az ORG-N1a/b EGÉSZE továbbra is
 * részleges, req-5 és core-core lezárás NINCS, az elfogadott egész klauzulák száma VÁLTOZATLANUL
 * 16. A verdikt ezért itt is `partial` MARAD (KUKA-105).
 *
 * EGY KÜLÖN KÖRÜLMÉNY, KIMONDVA: az R61 maga írja, hogy „Ez ellenőrzési dokumentum, nem új
 * végrehajtási parancs" — tehát a kör NEM hozott új munkát, csak elfogadást és KÉT operátori
 * döntési kérdést. A két megnevezett szöveges maradványt (a „TÉNYLEG fut" próba-állítás és az
 * „EGYETLEN út" fordulat) a felülvizsgálat maga helyesbítette; a forrásban is javítottuk.
 */
export const EXTERNAL_DECISION_SOURCE_R61 = Object.freeze({
  round: 'CMD-VS-300-002-002 R61 — ANALYSIS',
  decided_by: 'chatgpt-v3 (külső ellenőrző fél)',
  at: '2026-09-20',
  examined_revision: 'valach-family/valach-system@252f38eb3f77bbe9e48ea586cc14a8b8a4d2ddfe',
  scope: 'az R59 három javítása (F59-01 · F59-02 · F59-03) a vizsgált referencia-hatókörben, és az '
    + 'R57–R60 leltár-/átadási csomag lezárhatósága — NEM az összes core-követelmény lezárása, NEM '
    + 'req-5, NEM core-core lezárás, és NEM a mai kód hibamentessége minden jövőbeli használatra',
  not_a_machine_attestation: true,
  revalidate_on: 'forrás- vagy követelményváltozás az érintett klauzulán',
});

/** A regiszter FORRÁSAI, időrendben — a `source` mező ezekre hivatkozik. */
export const EXTERNAL_DECISION_SOURCES = Object.freeze([
  Object.freeze({ id: 'R37', document: 'v3ref/source-documents/R37_board_v1.md', ...EXTERNAL_DECISION_SOURCE }),
  Object.freeze({ id: 'R45', document: 'v3ref/source-documents/R45_board_v1.md', ...EXTERNAL_DECISION_SOURCE_R45 }),
  Object.freeze({ id: 'R47', document: 'v3ref/source-documents/R47_board_v1.md', ...EXTERNAL_DECISION_SOURCE_R47 }),
  Object.freeze({ id: 'R51', document: 'v3ref/source-documents/R51_board_v1.md', ...EXTERNAL_DECISION_SOURCE_R51 }),
  Object.freeze({ id: 'R53', document: 'v3ref/source-documents/R53_board_v1.md', ...EXTERNAL_DECISION_SOURCE_R53 }),
  Object.freeze({ id: 'R55', document: 'v3ref/source-documents/R55_board_v1.md', ...EXTERNAL_DECISION_SOURCE_R55 }),
  Object.freeze({ id: 'R57', document: 'v3ref/source-documents/R57_board_v1.md', ...EXTERNAL_DECISION_SOURCE_R57 }),
  Object.freeze({ id: 'R61', document: 'v3ref/source-documents/R61_board_v1.md', ...EXTERNAL_DECISION_SOURCE_R61 }),
]);

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

/**
 * AZ R45 DÖNTÉSEI — a K10-csoport négy klauzulájára, SZÓ SZERINTI indokkal az R45-ös lapról.
 * A K10-TYP-b itt lép `not_accepted_as_whole`-ról `accepted_in_reference`-re, KIMONDOTT, SZŰKEBB
 * hatókörrel: ez NEM általános elfogadás, és a döntés az ÖVÉK — Claude magának nem ad elfogadást.
 */
export const EXTERNAL_CLAUSE_DECISIONS_R45 = Object.freeze([
  Object.freeze({ clause: 'K10-TYP-b', verdict: 'accepted_in_reference', source: 'R45',
    reason: '**K10-TYP-b elfogadva a jelenlegi egyírós, szintetikus referencia belső séma- és kanonikus bevétútjára.** A megnevezett művelet/sémaverzió, hiányzó és ismeretlen mező, hibás típus nevezett válasza ellenőrzött. A korábbi bemeneti javítást nem nyitom újra. Ez nem fogadja el az OB-3 külső HTTP-/bizalmi határát, és nem igazolja önmagában minden korábbi tárolt adat változatlanságát.' }),
  Object.freeze({ clause: 'K10-TYP-a', verdict: 'partial', source: 'R45',
    reason: '**K10-TYP-a részleges marad.** Könyv szerinti azonosság, mennyiségi mozgások alatti stabil hivatkozás és formázási ismétlés mérve. Nincs megjelenítési név/átnevezési művelet; ennek határa megmarad. A jelentés helyesen nem állítja ezt megépítettnek.' }),
  Object.freeze({ clause: 'K10-TYP-c', verdict: 'partial', source: 'R45',
    reason: '**K10-TYP-c részleges marad.** A saját profil tárolása és az olvasó eltérés-ellenőrzése elfogadható részeredmény. Támogatott profilváltás nincs; a nyers fixtúra nem annak bizonyítéka.' }),
  Object.freeze({ clause: 'K10-TYP-d', verdict: 'partial', source: 'R45',
    reason: '**K10-TYP-d részleges marad; az R43 teljes történetmegőrzési bizonyítása nincs lezárva.** A jogos bevét és ismétlés működése igazolt, a teljes tartalom változatlanságára a lent reprodukált rés fennáll.' }),
]);

/**
 * AZ R47 DÖNTÉSEI — az R45-ös csomag LEZÁRÁSA és a pontosított K10-d indok. Az R45-ös sorokat NEM
 * írjuk át. A K10-TYP-b R45-beli elfogadása VÁLTOZATLAN (az R47 kimondja), ezért itt nem szerepel.
 *
 * KIMONDVA, az ő szavukkal: *„Ez nem új egész-klauzulás K10-d elfogadás. A 15 referencia-hatókörben
 * elfogadott klauzula száma ettől nem nő."*
 */
export const EXTERNAL_CLAUSE_DECISIONS_R47 = Object.freeze([
  Object.freeze({ clause: 'K10-TYP-d', verdict: 'partial', source: 'R47',
    reason: '**K10-TYP-d részleges marad a teljes normaszövegre**, de a történetmegőrzési és tranzakciós hibahatárra vonatkozó R45-lelet már lezárt. A fennmaradó határ: ugyanazon cikk támogatott profilváltása nincs; a próbák a három nevezett táblát és a disclosure előzményeit fedik, nem a teljes séma összes történetét.' }),
  Object.freeze({ clause: 'K10-TYP-a', verdict: 'partial', source: 'R47',
    reason: '**K10-TYP-a és K10-TYP-c részleges marad.** Átnevezési funkció és támogatott profilváltás továbbra sincs, a nyers profil-fixtúra nem ezek megvalósítása.' }),
  Object.freeze({ clause: 'K10-TYP-c', verdict: 'partial', source: 'R47',
    reason: '**K10-TYP-a és K10-TYP-c részleges marad.** Átnevezési funkció és támogatott profilváltás továbbra sincs, a nyers profil-fixtúra nem ezek megvalósítása.' }),
]);

export const EXTERNAL_CLAUSE_DECISIONS_R51 = Object.freeze([
  Object.freeze({ clause: 'K05-DSC-c', verdict: 'partial', source: 'R51',
    reason: 'Az F49-01 és F49-02 konkrét árkiadási hibájának javítását a vizsgált, egyírós szintetikus referencia hatókörében elfogadom. Saját, korábbi teljes meghívási/beváltási/olvasási programom változatlan üzleti kód mellett most mindkét esetben not_available választ kap. Egy külön saját kiegészítésben csak készletjoggal a vegyes eredmény zárt; a tényleges árjog megadása után kijön; az árjog megvonása után ismét zárt. A megadható keret többé nem önmagában olvasási jog. K05-DSC-c egészét még nem zárom le. Az új jog megvonása nem őrzi meg külön a tudomásszerzés idejét; és az M179-ről a jelentés továbbra is erősebbet állít a mért hatásnál.' }),
]);

export const EXTERNAL_CLAUSE_DECISIONS_R53 = Object.freeze([
  Object.freeze({ clause: 'K05-DSC-c', verdict: 'accepted_in_reference', source: 'R53',
    reason: '**K05-DSC-c elfogadva a jelenlegi egyírós, szintetikus, megbízható belső kontextusú referencia explicit adatköri jogadására és eredménykiadására.** Minden érintett adatkörre külön megadott jog kell; a készletjog nem ad árjogot; a hiány és az alkalmazható tiltás zár; a vegyes eredmény egészben megtagadott, ha bármely érintett adatkörre nincs érvényes döntés. A megvonás hatálya és tudásideje külön kezelhető, az újraadás nem írja át a köztes történetet. Ez nem fogadja el a külső hitelesítési/HTTP-határt, a teljes szervezeti képviseletet vagy a teljes core-core lezárását.' }),
]);

export const EXTERNAL_CLAUSE_DECISIONS_R55 = Object.freeze([
  Object.freeze({ clause: 'ORG-N1a', verdict: 'partial', source: 'R55', reason: 'Az R53 K05-DSC-c elfogadása érvényben marad. Az R54 döntésátvezetése és a korábbi próbakorrekciók ellenőrzöttek. A mostani hatásköri csomagot nem zárom le teljesen; ORG-N1a/b továbbra is részleges, req-5-re lépés nincs. Az elfogadott egész klauzulák száma 16, a további 13 részleges/nyitott. Ez nem készültségi százalék és nem teljes core-core elfogadás.' }),
  Object.freeze({ clause: 'ORG-N1b', verdict: 'partial', source: 'R55', reason: 'Az R53 K05-DSC-c elfogadása érvényben marad. Az R54 döntésátvezetése és a korábbi próbakorrekciók ellenőrzöttek. A mostani hatásköri csomagot nem zárom le teljesen; ORG-N1a/b továbbra is részleges, req-5-re lépés nincs. Az elfogadott egész klauzulák száma 16, a további 13 részleges/nyitott. Ez nem készültségi százalék és nem teljes core-core elfogadás.' }),
]);

export const EXTERNAL_CLAUSE_DECISIONS_R57 = Object.freeze([
  Object.freeze({ clause: 'ORG-N1a', verdict: 'partial', source: 'R57', reason: '**Az F55-01 és F55-02 javítását elfogadom a vizsgált egyírós, szintetikus, megbízható belső kontextusú referenciában. Az R53–R56 deklarált alapú bírálati hatásköri javítócsomag ebben a hatókörben lezárt.** Ez konkrét előrelépés: a hatáskör alapja már nemcsak egy eltett adat. A rendszer a jog megadásakor és használatakor is ellenőrzi, hogy az adott művelet belefér-e; a hiányzó megadáskori verzióból nem lesz engedély. A jogos munka ugyanakkor továbbra is elvégezhető. A megerősített próba a védelem kivételét már a valódi jogváltoztatáson is észleli. Az elfogadás a három meglévő műveletre szól: suspend, adjudicate, alter_right. Kiterjed a jelenlegi alap és a megadáskori verzió korlátjának ellenőrzésére, a szűkülés miatti zárásra, a későbbi tágulásból nem származó automatikus jogbővülésre, a hiányzó/hibás/nem létező verzió zárására, a jogos ellenpárra és az ügyválasz meglévő semlegesítésére. Nem fogadja el a teljes általános szervezeti képviseletet vagy az alap nélkül adott jogok általános üzleti szabályát. ORG-N1a/b egésze továbbra is részleges; req-5-re lépés és core-core lezárás nincs. A 16 elfogadott egész klauzula és 13 részleges/nyitott állapot változatlan, nem készültségi százalék. A részcsomag lezárását nem szabad új egész-klauzulás elfogadásként számolni.' }),
  Object.freeze({ clause: 'ORG-N1b', verdict: 'partial', source: 'R57', reason: '**Az F55-01 és F55-02 javítását elfogadom a vizsgált egyírós, szintetikus, megbízható belső kontextusú referenciában. Az R53–R56 deklarált alapú bírálati hatásköri javítócsomag ebben a hatókörben lezárt.** Ez konkrét előrelépés: a hatáskör alapja már nemcsak egy eltett adat. A rendszer a jog megadásakor és használatakor is ellenőrzi, hogy az adott művelet belefér-e; a hiányzó megadáskori verzióból nem lesz engedély. A jogos munka ugyanakkor továbbra is elvégezhető. A megerősített próba a védelem kivételét már a valódi jogváltoztatáson is észleli. Az elfogadás a három meglévő műveletre szól: suspend, adjudicate, alter_right. Kiterjed a jelenlegi alap és a megadáskori verzió korlátjának ellenőrzésére, a szűkülés miatti zárásra, a későbbi tágulásból nem származó automatikus jogbővülésre, a hiányzó/hibás/nem létező verzió zárására, a jogos ellenpárra és az ügyválasz meglévő semlegesítésére. Nem fogadja el a teljes általános szervezeti képviseletet vagy az alap nélkül adott jogok általános üzleti szabályát. ORG-N1a/b egésze továbbra is részleges; req-5-re lépés és core-core lezárás nincs. A 16 elfogadott egész klauzula és 13 részleges/nyitott állapot változatlan, nem készültségi százalék. A részcsomag lezárását nem szabad új egész-klauzulás elfogadásként számolni.' }),
]);

export const EXTERNAL_CLAUSE_DECISIONS_R61 = Object.freeze([
  Object.freeze({ clause: 'ORG-N1a', verdict: 'partial', source: 'R61', reason: 'Az R59 három összefüggő javítását a vizsgált referencia-hatókörben elfogadom. Claude helyesbítette a következő fejlesztés indoklását, javította és korlátozta a leltár ellenőrzőjének állítását, valamint friss, forráshoz kötött végső normaösszesítőt adott át. Az R57–R60 leltár-/átadási csomag lezárható. Új termékfunkciót ez a kör nem adott: a meglévő működésről lett megbízhatóbb a kép, és elkerültünk egy nem indokolt fejlesztést. Ez nem az összes core-követelmény lezárása. A korábbi hatásköri részcsomag elfogadása megmarad. 16 egész klauzula elfogadott, 13 részleges/nyitott; ez nem készültségi százalék. ORG-N1a/b egésze részleges, req-5 és core-core lezárás nincs.' }),
  Object.freeze({ clause: 'ORG-N1b', verdict: 'partial', source: 'R61', reason: 'Az R59 három összefüggő javítását a vizsgált referencia-hatókörben elfogadom. Claude helyesbítette a következő fejlesztés indoklását, javította és korlátozta a leltár ellenőrzőjének állítását, valamint friss, forráshoz kötött végső normaösszesítőt adott át. Az R57–R60 leltár-/átadási csomag lezárható. Új termékfunkciót ez a kör nem adott: a meglévő működésről lett megbízhatóbb a kép, és elkerültünk egy nem indokolt fejlesztést. Ez nem az összes core-követelmény lezárása. A korábbi hatásköri részcsomag elfogadása megmarad. 16 egész klauzula elfogadott, 13 részleges/nyitott; ez nem készültségi százalék. ORG-N1a/b egésze részleges, req-5 és core-core lezárás nincs.' }),
]);

/** A REGISZTER MINDEN DÖNTÉSE, forrással — a történeti sor `source: 'R37'`-et kap. */
export const ALL_EXTERNAL_DECISIONS = Object.freeze([
  ...EXTERNAL_CLAUSE_DECISIONS.map((d) => Object.freeze({ source: 'R37', ...d })),
  ...EXTERNAL_CLAUSE_DECISIONS_R45,
  ...EXTERNAL_CLAUSE_DECISIONS_R47,
  ...EXTERNAL_CLAUSE_DECISIONS_R51,
  ...EXTERNAL_CLAUSE_DECISIONS_R53,
  ...EXTERNAL_CLAUSE_DECISIONS_R55,
  ...EXTERNAL_CLAUSE_DECISIONS_R57,
  ...EXTERNAL_CLAUSE_DECISIONS_R61,
]);

// A LEGÚJABB DÖNTÉS NYER, DE A RÉGI NEM TŰNIK EL. A sorrend a `EXTERNAL_DECISION_SOURCES` szerinti:
// egy későbbi kör döntése felülírja a korábbit, és a korábbi `superseded`-ként UTAZIK vele (KUKA-103:
// az átírás is kivezetés — a mínuszt is át kell nézni).
const SOURCE_ORDER = new Map(EXTERNAL_DECISION_SOURCES.map((x, i) => [x.id, i]));
const BY_CLAUSE = new Map();
for (const d of ALL_EXTERNAL_DECISIONS) {
  const prev = BY_CLAUSE.get(d.clause);
  if (!prev || SOURCE_ORDER.get(d.source) > SOURCE_ORDER.get(prev.source)) {
    BY_CLAUSE.set(d.clause, prev ? Object.freeze({ ...d, superseded: prev }) : d);
  }
}

/** Egy klauzula MAI külső döntése, vagy `null`. A hiány NEM „elfogadva" (KUKA-093). */
export function externalDecisionFor(clauseId) {
  return BY_CLAUSE.get(clauseId) || null;
}

/** Hány klauzulán áll ma „referenciában elfogadva" — MÉRVE, nem beírva (KUKA-045). */
export function acceptedInReference() {
  // A MAI állapotot mérjük, nem a történetit: a felülírt R37-es döntés `superseded`-ként megmarad,
  // de a számba a MOSTANI verdikt megy (KUKA-050: a szöveg a valóságot követi).
  return [...BY_CLAUSE.values()].filter((d) => d.verdict === 'accepted_in_reference').map((d) => d.clause);
}
