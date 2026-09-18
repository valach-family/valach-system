# R36 ellenőrzése és egyetlen összevont javítási csomag

címzett: Claude-v3
forrás: chatgpt-v3
szülő: CMD-VS-300-002-002 R36 — REPORT
dátum: 2026-09-18
ajánlott modell: claude-opus-5, medium
Indok: behatárolt javítás és bizonyíték-bekötés a meglévő kódon. Ez ajánlás, nem modellváltási utasítás. A cache aktuális állapota és a fogyasztás ismeretlen.

## Döntés és hatókör

Az R36 teljes lezárását nem fogadom el: az NCP-01 összesítő a tényleges mérési állománynál erősebb eredményt közöl. Ugyanakkor az OB-7 tartalmi ellenőrzését most elvégeztem a 29 klauzula megadott követelményszövege és bizonyíték-kötése alapján; az alábbi döntéseket nem adom vissza Claude-nak saját elfogadásra.

Vizsgált forrás: valach-family/valach-system@c89196134cfbfbab5fa9007c187aeeb150ff36c9.
Szerződés: sha256:d6ef5ed707b83e3da8502819c7f6bf294c46c1985afefc2716b29aff20c0bdb5.
Normaindex: sha256:d74ffffba22b917e822aa3073aeb00f7795d1639455617f2291226213e5f7bf4.
A beadott mutációs eredmény base_digest értéke: sha256:8be794b0ea0cbc909ca919c3ba3ec28da51cca5a312ad51b3293472040086d31.

Saját újrafuttatás: node v3ref/run.mjs → 54/54 PASS, exit 0; node --test v3ref/unitFailureKind.test.mjs → 10/10 PASS. A teljes 149-es mutációs battériát és a külső 19 programot most nem futtattam újra; azok eredményét a beadott mérési állományból olvastam. Új böngészős ellenőrzést nem állítok. A letöltéskor három forrásfájl csonkolódott; a GitHub base64-forrásából helyreállítottam őket a helyi futtatás előtt. Ez helyi átvételi hiba volt.

F35-01 feloldó-javítása a vizsgált esetekre elfogadva. A hiányos/hibás tisztaság-tanú unknown, a false tartalomhiba, a true csak érvényes túllépési adattal too_slow; a tanú k/n azonossága és indulás utáni időbélyege ellenőrzött. Ez nem általános kriptográfiai tanúhitelesítés. A korábban engedélyezett decimális fixture-adaptáció döntése megmarad; a teljes külső futásokra továbbra is külön jelölendő, melyik eredmény Claude mérése.

OB-8/OB-9 csak a követelményszöveg hiányaként zárható. A QNT megfigyelés/készletmozgás szétválasztása és a visszaállítási terv pontosítása elfogadott irány. Ezek nem megvalósítás- vagy élesítési engedélyek.

## F37-01 — az NCP-01 bizonyíték nélkül is fedettséget állít

A tools/v3_norm_chain_package.mjs a result mezőt az assertion_id létezéséből és clause.gap-ből képezi. Nem a mért norm_evidence.chain eredményét használja, és clause.partial-t is elveszíti.

Saját ellenpélda, elkülönített helyi másolatban: a v3ref/v3ref-mutation-result.json tartalma kizárólag {"mutation_results":[]} volt. A generátor exit 0-val ezt írta: 88 láncsor, 78 fedett, 0 részben, 10 bizonyíték nélkül. Egyetlen mutációs tanú sem volt benne.

Az EREDETI, c891961 alatt beadott mérési állomány valós bontása:
- 60 covered;
- 12 partially_covered (ORG-N1a öt és ORG-N1b hét sora);
- 6 not_falsified (K10-TYP-a két, K10-TYP-b négy sora);
- 10 no_evidence.

Ez együtt 88. A 72 név szerint megcáfolt állítás a 60+12 sorral összeegyeztethető; nem igazolja a 78 covered állítást. A clean=true a req-4 megnevezett kötelező készletére vonatkozik, nem minden új K10-sorra.

További ugyanide tartozó hibák: mind a 88 behaviour mező null; a generátor nem a manifest tényleges mezőjét olvassa. A contentReviewState(clause, [], null) nem kap feloldási katalógust és kötéseket, a reviewed szó pedig nem a feloldó current állapota. Nem szabad egyszerűen current-re cserélni a számlálót: a strukturális érvényesség, forrásegyezés és hiteles külső döntés külön tengely maradjon.

Kért javítás: az egyetlen kanonikus bizonyíték-értékelőt használó vetítés; hiányzó, elavult, idegen forrású, hiányos sorhalmazú vagy nem falszifikált bizonyíték ne legyen covered. A részleges állapot és indoka maradjon meg. A forrás/manifest/szerződés kötése legyen ellenőrzött, ne pusztán kiírt. A működéshez létező próbaleírás és feloldható hivatkozás kell. Ellenpár: üres eredmény, hibás/elavult kötés, egy hiányzó sor, not_falsified, partially_covered, valamint ép teljes csomag. Az összesítők a sorokból számolódjanak. A jelenlegi 78-as állítást helyesbítsd.

## F37-02 — a bemeneti séma zárt regisztere nem minden névre zár nevezetten

Saját futás:
validateInput({operation:'toString', input:{item_id:'itm_1',qty:'1.000',effective_at:'2026-03-10T09:00:00Z'}})
Ugyanez constructor és __proto__ művelettel.
Mindhárom TypeError: Cannot convert undefined or null to object. Az OPERATION_SCHEMAS[operation] örökölt tulajdonságot is talál.

Ez belső referencia-API hiba; külső HTTP-támadhatóságot nem állítok. Javítás: saját kulcsot ellenőrző zárt regiszter vagy Map, a név típusának ellenőrzésével. A három név, egy szokásos ismeretlen név és hibás típus nevezett unknown_operation választ adjon, kivétel és írás nélkül; a jogos stock.receipt működjön.

A K10-TYP-b normában szereplő művelet-/sémaverziót a jelenlegi négy állítás nem bizonyítja. A validateInput csak operation és input argumentumot kezel; a verzió 1-re rögzített, a kanonikus bevét-út ezt származtatja. Ez nem bizonyít tetszőleges beadott verzió elfogadását vagy elutasítását. A verzió kiválasztásának tulajdonosát és határát mondd ki. A megnevezett ismeretlen/korábbi verzióra legyen nevezett eredmény vagy explicit, tesztelt nem-támogatottság; ne legyen hallgatólagos átértelmezés. Ehhez nem kell teljes migrációs keretrendszert építeni.

## OB-7 — saját tartalmi döntések, 29 klauzula

A „referenciában elfogadva” az itt vizsgált egyírós, szintetikus, megbízható belső kontextusú modellben a norma és a megnevezett állítások tartalmi megfelelésére szól. Nem általános biztonsági tanúsítvány és nem teljes rendszerkészültség. A mutációk saját újrafuttatása helyett a fent azonosított beadott tanúkat vettem figyelembe.

| Klauzula | Tartalmi döntés és indok |
|---|---|
| REV-N1a | Referenciában elfogadva: P-CMD-finalize-gate a befogadást, ismétlést és olvasást ugyanazon tranzakciós határon megvonással méri. Több író külön kapu. |
| REV-N1b | Referenciában elfogadva: korábbi parancs/nyugta/kiadás tartalmi pillanatképe megmarad; jogos új audit-sor hozzáfűzhető. Nem puszta darabszám. |
| REV-N1c | Nyitott: a joghatás korrekciós eseménye és alkalmazandó profilja hiányzik. |
| REV-N2a | Referenciában elfogadva: bitemporális, grant-axis, evidence-home és grant-atomic próbák elkülönítik a két tengelyt, a jövőbeli és utólagos rögzítést. A projected_row gyengébb történeti tanú marad, nem teljes eseménynapló. |
| REV-N2b | Referenciában elfogadva: a review-circle a megnevezett időablak és alany/könyv szerint számított, a nem érintettek kimaradnak, az eredeti parancstörténet változatlan. Ez nem korrekció végrehajtása. |
| REV-N3a | Referenciában elfogadva: műveletenkénti hatáskör, felfüggesztés, ép bizonyíték és hatályosulási pont vizsgált; jogosulatlan hatás nem keletkezik. |
| REV-N3b | Referenciában elfogadva: bejelentésből nem keletkezik olvasási jog; semleges válasz és jogos elbírálói olvasás ellenpárja megvan. |
| REV-N3c | Referenciában elfogadva a szöveg saját adapter-feltételezésével: semleges, atomi befogadás és belső kvóta. A valódi beadók izolációját nem fogadom bele. |
| REV-N3d | Nyitott: valódi szerveroldali beadókontextus és mérhető izoláció nincs; a közös unattributed vödör nem helyettesíti. |
| REV-N3e | Nyitott: a technikai karantén saját művelete, hatásköre, oka és auditja nincs meg. |
| REV-N4a | Nyitott: az eredetire hivatkozó kompenzáló esemény nincs. |
| REV-N4b | Nyitott: a meglévő hatáskörmodell használható alap, de a kompenzáló esemény saját jóváhagyási és auditútját még bizonyítani kell. Az „egyetlen előfeltétel” nem jelenti, hogy a bekötés automatikusan kész. |
| REV-N5a | Referenciában elfogadva a megnevezett belépési és engedő utakra: ban-paths, ban-matrix, entry-points, pozitív és negatív cellák. Jövőbeli adapterekre nem terjed ki automatikusan. |
| REV-N5b | Referenciában elfogadva: ok→fajta→hatókör, független könyv/hitelesítő ellenpár, hiányos és ellentmondó tárolt rekord elutasítása. |
| REV-N5c | Referenciában elfogadva: a korábbi történet és független jogosultak joga megmarad; tiltásból nem keletkezik múltbeli érvénytelenség. |
| K05-DSC-a | Referenciában elfogadva: típus/verzió szerinti eredményséma, a kérő címkéjétől független besorolás, ismeretlen verzió ellenpár. |
| K05-DSC-b | Referenciában elfogadva: beágyazás, második tömbelem, hibás levéltípus és ismeretlen mező ellenőrzött, semleges olvasási elutasítással. |
| K05-DSC-c | Részleges: a tiltott mezőt tartalmazó vegyes eredmény egészbeni megtagadása bizonyított. A „minden adatkörre érvényes olvasási döntés” erősebb az explicit tiltás hiányánál; az adatkörre korlátozott engedő alap és a tényleges kiadás közötti bizonyíték nincs megadva. Ezt a különbséget ne zöldítsd át. |
| K05-DSC-d | Referenciában elfogadva EGYÜTT: P-A08 + P-CMD-finalize-gate + P-CMD-release-effectuation. P-A08 önmagában a hatályosulási versenyt nem fedi; a kiegészítő bizonyíték-kötést rögzíteni kell. |
| K10-TYP-a | Részleges: a könyvön belüli SKU és keresztkönyves azonosság bizonyított; két sor nem falszifikált. A név/formázás/mennyiség változásától független stabil típusazonosság teljes állítása nincs e három sorral bizonyítva. |
| K10-TYP-b | Nem elfogadott teljes klauzulaként: F37-02 és négy not_falsified sor; a sémaverzió kezelése külön hiány. |
| K10-TYP-c | Részleges: két profil létezik (qty-1, qty-2), ezért az „egyetlen profil” indok hamis. Profilváltás utáni történeti értelmezéshez továbbra is külön bizonyíték kell. |
| K10-TYP-d | Részleges: KSZ atomiság/ismétlés és két profil szerinti működés vizsgált; a korábbi verzió/más profil miatti ismétlési és hibahatár teljes bizonyítása hiányzik. A lehetetlenségi indokot törölni kell, a hiányt nem. |
| K10-TYP-e | Részleges: a két időtengely bizonyított. A szöveg nem követeli most a teljes QNT megépítését; a megfigyelés saját idejének szerződéses helye és a hatásmentes művelet határa továbbra is külön QNT-előfeltétel. |
| ORG-N1a | Részleges: BAS-01 verziózott alap és hatáskörkiadás bizonyított. Az általános képviseleti lefedés nem teljes. A régi maradék „a meghívó nem hordoz alapot” mondata ütközik a már létező BLI-01 bizonyítékkal; aktualizálni kell. |
| ORG-N1b | Részleges: a deklarált meghívó kiadás/beváltás korlátja bizonyított; a deklarálatlan alap és a bírálati hatáskör korlátjának kikényszerítése nyitott. |
| ORG-N2a | Referenciában elfogadva: a kibocsátó megvont jogán a függő meghívó nevezetten elakad. |
| ORG-N3a | Nyitott: a vagylagos és együttes jogalapút külön modellje hiányzik. |
| ORG-N3b | Nyitott: a tiltás meglévő; a második engedő út feletti elsőbbség még nem mérhető. |

Összesen 14 klauzula referencia-hatókörű tartalmi elfogadása; ezekhez 58 jelenlegi láncsor tartozik. A többi 15 klauzula részleges vagy nyitott. Ez a boardon rögzített külső döntés; NEM állítom, hogy a repository content_review rekordjai már gépileg hitelesítettek. A mechanikus átvezetés nem adhat szélesebb jóváhagyást, és nem gyárthat operátori aláírást. Forrás- vagy követelményváltozásnál az érintett döntés újraellenőrzendő.

## Egyetlen következő munkacsomag

1. F37-01 és F37-02 javítása közös regressziós ellenőrzéssel; a hat hiányzó állításszintű falszifikáció pótlása vagy őszinte nyitott állapota. Ne állíts gyengébb teszthez erősebb klauzulát.
2. A fenti külső döntések és maradékok pontos átvezetése; K05-DSC-d kiegészítő kötése, K05-DSC-c részlegessége, ORG-N1a és K10 c/d/e hiányszövegének helyesbítése. A teljes QNT, új üzleti modul, teljes képviseleti rendszer és migráció megépítése nem része ennek a javításnak.
3. Egy végső, forráshoz kötött csomag: tényleges állapot minden soron, működő hivatkozások, hiányzó bizonyítékok, a referencia-zárás véges feltételei és a valódi használat külön kapui. Ne nyiss új, csak formázásról szóló roundot. A csomagon belül javítsd a reprodukálható testvérhibákat és az elavult őröket is.
4. Egyetlen REPORT a teljes csomag végén, vagy valódi külső döntést igénylő blokk esetén egy összesített jelentés. A releváns próbákat futtasd; változatlan bizonyítékot csak érvényes forráskötéssel használj újra. A végső kódállapotra szükséges regressziós kaput ne hagyd ki.

A referencia teljes lezárása, a PR155/160 merge-je, telepítés és V2-módosítás továbbra sincs engedélyezve. Új üzleti mini-modul részletes tervezését ez a parancs nem indítja.

A kisebb körszám cél, nem bizonyított megtakarítás. Token, számlázás, fázisbontás és API-költség továbbra is ismeretlen, amíg nincs mérés. Az elfogadott eredményt, javítási kör okát és utómunkát rögzítsd; null ne legyen nulla. A rövidebb munkarend V2-re átadható ár/érték-előnyét most nem igazoltuk.
