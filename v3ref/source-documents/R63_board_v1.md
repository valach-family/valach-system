# Vissza a vállalt célhoz — egyszerű indulás, elkülönült szerepek, kipróbálható core-folyamat

CMD-VS-300-002-002 R63 — SPEC
PR-VS-300 · STEP-VS-300-002 · 2026-09-20
chatgpt-v3 → Claude-v3
Szülő: R62 REPORT, 53d3b413-cb06-465e-899d-8c1c9d35c9cf.
A dokumentum és a végrehajtási parancs törzse azonos.

## 1. Kötelező iránykorrekció és felelősség

Az operátor mai üzenete tisztázza a feladatot: a magánszemélytől az egyéni adószámos szereplőn és kis családi cégen át a nagy, nemzetközi szervezetig közös, átjárható alap kell. Az operátor a kívánt élethelyzeteket mondja el; a regisztráció, meghívás, jogadás és bizonyítás biztonságos szakmai szabályait nekünk kell ezekből levezetnünk. Nem várunk tőle belső adatmodellről vagy engedélyezési algoritmusról döntést.

Az R61-ben hibásan minősítettem az A/B kérdést általános, kizárólag az operátor által feloldható üzleti akadálynak. Az R62 ezt a hibás keretezést vitte tovább. Ezt itt HELYESBÍTEM. Nem írjuk át visszamenőleg a történeti lapokat; az R63 a folytatásra nézve felülírja a döntésre várás állapotát.

Forrás:
- CMD-VS-300-002-001 R24 PLAN, különösen 0., 6., 10. és 13. szakasz: könnyű saját indulás; a saját admin nem globális céges képviselet; a szakmai bizonytalanság fejlesztői feladat; akkor sem volt operátori döntési kérdés.
- Ugyanezen korábbi CMD R32 SPEC K01–K04, K09, K11–K14 és G3: külön személy/minőség/munkatér; jogadási alaphoz kötött meghívás; hatókörös delegálás; egyszerű indulás; élethelyzetekre épülő ellenőrzés.
- Az operátor jelen üzenete a követelmények legfrissebb pontosítása. Nem újratervezési megbízás.

A korábbi részcsomag-elfogadások megmaradnak. Az R57–R60 leltár-/átadási munka lezárt. Az, hogy e csomagban nem találtunk új hibát, nem jelenti, hogy nincs implementálandó core-követelmény. A belső referencia elkészülése, a felhasználói folyamat elkészülése és az üzemi alkalmasság külön eredmény.

## 2. A most ellenőrzött állapot

Repo: valach-family/valach-system
Ág: claude/cmd-vs-300-002-002-r23-9gxbee
R62 vizsgált fej: ecf696150877be9db81142dee872bd65492c3b8b
Magforrás-lenyomat: sha256:8a872bf5490bc4ee4b941b6b3e998f952909090e60e92ec0c763662722bcecd4

Az R62 teljes szövegét find_document-tal elolvastam. A nyolc változott fájlt GitHubról rögzített SHA-val letöltöttem, git blob-lenyomatukat ellenőriztem. Saját futás: 61/61 magpróba; 44/44 döntésidézet; 9/9 leltársor; az önpróba három ellenpéldája mind kilépés 1. Saját digest egyezik a beadott mutációs bemenet és NCP digestjével. A beadott NCP 128 sort, 44 döntéssort és 78/40/2/8 bizonyítékbontást tartalmaz.

192/192 mutáció Claude beadott mérése; teljes mutációt ebben a körben nem futtattam újra. Az R62 321/321 és 25/25 eredményét dokumentumállításként vettem át. A külső 19 programos láncot az R62 sem futtatta újra; a korábbi futás nem az új fej friss mérése.

A normaszöveg továbbra is egyírós, belső referenciát nevez meg; hiányként szerepel a tényleges külső kérésfogadási határ és a két valódi kapcsolat közötti konkurens véglegesítés bizonyítéka. A régi OB-leírások között időközben részben elavult állítások is vannak: a jelenlegi hiányt a konkrét kód és az elfogadási rekord együtt határozza meg, nem egy régi why mondat.

16 egész klauzula elfogadott, 13 részleges/nyitott; ez nem készültségi százalék és nem a teljes termék leltára. ORG-N1a/b teljes elfogadása, req-5 és a teljes core-core lezárása továbbra sincs.

## 3. A felhasználói működés kötelező alapja

| Élethelyzet | Felhasználói működés | A mag kötelező határa |
|---|---|---|
| Magánszemély vásárló | Egyszerű fiók, saját rendelések/iratok későbbi modulnézete. | Saját személyes kör; nincs kötelező cégalapítás vagy szervezeti hierarchia. |
| Ugyanez az ember egy cég alkalmazottja | A meglévő fiókkal elfogadja a meghívót, és a felületen munkateret vált. | A személyes és céges adatok/jogok elkülönülnek; nincs új fiók vagy meglévő jelszó átírása. |
| Egyéni adószámos szereplő | A meglévő fiókhoz vállalkozási minőség és saját munkakörnyezet kapcsolható. | Adóregisztráció, jogalany, személy és fiók nem ugyanaz az objektum. Új adószám nem olvaszt össze történeteket. |
| Kétszemélyes családi vállalkozás | Az egyik tag elindul, majd egyszerű szerepválasztással meghívja a másikat. | A helyi létrehozói alap és a meghívó alapja automatikusan, auditálhatóan keletkezik. Nincs általános hatósági igazolási akadály a saját elkülönült munkához. |
| Növekvő vállalkozás | Munkatársakat, csoportokat és körülhatárolt kezelői jogot adhat hozzá. | Ugyanaz a fiók-/tagság-/engedélymodell; növekedéskor nem kell új rendszerbe átköltözni. |
| Nagy szervezet | Szervezeti egységek, telephelyek, csoportok, delegált adminisztráció és szükséges jóváhagyások. | A hierarchia nem automatikus mindenadat-jog. Jogadás csak a továbbadható hatáskörben; együttes jóváhagyás és önjóváhagyás tilalma ott, ahol a profil előírja. |
| Magán- és üzleti értékesítő | VMarket mindkét minőségnek; VShop az operátor által megadott adószámos célcsoportnak. | Ez termékkövetelmény, nem globális jogi mentesség és nem ebben a körben megépítendő piactér. |
| Termelés, gyártás vagy szolgáltatás | A megfelelő modul és előfizetés szerint használható később. | Az előfizetés funkciót biztosít, nem céges adatjogot. A két feltételt külön ellenőrizzük. |

Az ország- és iparágfüggetlen maghoz névterezett külső azonosítók, joghatósági profilok és külön műveleti feltételek kellenek. Nem építünk magyar adószámra vagy élelmiszeripari szerepre univerzális főkulcsot. Egyéni szereplő és társaság későbbi jogi átalakulását nem tekintjük automatikus azonosságnak.

A felület a kicsiknél kevés kérdést mutat, a részletes beállítások szükség szerint nyílnak meg. Nem négy külön jogosultsági motort építünk. Külön munkatérhez tartozó jogosultságot sem előfizetés, sem azonos e-mail-domain, sem nyilvános cégazonosító nem pótol.

A számlázás/hatósági kapcsolatok külön műveleti profilt és szolgáltatói kapcsolatot kapnak. A saját munkatér regisztrációja nem állíthatja, hogy minden későbbi szabályozott műveletre jogosít. Országonként eltérő konkrét követelményt nem írunk elő a teljes rendszer általános regisztrációjánál. Külső számlázó integrációja sem tekintendő automatikusan minden jogi kötelezettség teljesítésének.

## 4. Az A/B helyett alkalmazandó szakmai alapértelmezés

### Jogadás és első indulás

Minden aktív joghoz legyen megnevezhető eredet, hatókör, szabályverzió és időbeli érvény. Ezt a rendszer rögzíti; normál meghíváskor a felhasználótól nem kérünk külön alapobjektumot vagy okiratot.

- Saját új, elkülönült munkakörnyezet: az ellenőrzött fiók saját létrehozási művelete és verziózott indulási szabálya alapozza meg a helyi kezelői jogot. A keletkező jog csak az új saját körre szól. Nem igazolt törvényes képviselet, nem idegen adatok átvétele, nem egy cégnév globális lefoglalása.
- Munkatárs meghívása: a rendszer a meghívó jogosultjának aktuális, továbbadható jogából képezi az alapot. Címzetti kötés, lejárat, egyszeri beváltás, a kiadáskori plafon és a beváltáskori aktuális érvényesség kötelező.
- Bírálati/felülvizsgálati hatáskör: nevezett, erre jogosult delegáló vagy külön védett rendszerüzemeltetői kiinduló szabály kell. Sima regisztráció vagy saját munkatér-létrehozás nem ad globális bírálói jogot. A helyi admin és platformbíráló nem olvad össze.
- Hiányzó, lejárt, visszavont vagy a kéréshez elégtelen alapból nincs új engedély. A megengedett saját indulás pozitív út marad; a megoldás nem lehet az, hogy mindenki elakad.
- Nyers tárolói írással keletkezett, alap nélküli meghívó vagy hatáskör nem kerülheti meg az új használati határt. Belső író és külső bemenet felelőssége külön, az érvényesítési ellenőrzés szerveroldali.

A meglévő rekordokat nem utólag kitalált felhatalmazással töltjük fel. A szintetikus tesztadatok szándékát megtartva, expliciten alakítjuk át a tesztelőképeket az új szabályhoz. A történeti tény megmarad; a mai használat külön döntés. Ismeretlen eredetű régi aktív jog nem lesz automatikusan érvényes. Új, szabályos felhatalmazás új esemény, nem visszamenőleges igazolás. Éles adatmigrációt és határnapot ez a csomag nem végez.

A korábbi, tudatosan alap nélküli viselkedést elfogadó próbák verziózott elvárt eredményét és az érintett szerződést együtt kell átvezetni. Ez a jelen utasításból következő viselkedésváltozás; nem a korábbi részcsomagok önkényes visszanyitása.

## 5. Egyetlen összevont végrehajtási feladat

### 5.1 Rövid, forrásból ellenőrzött eltéréslista — a munka részeként

A fenti élethelyzeteket és a meglévő K01–K16, G1–G8, OB/USE, QNT követelményeket rendeld a jelenlegi implementációhoz. Soronként: mi működik most; konkrét forrás és bizonyíték; mi hiányzik; az első core-folyamatot, a mini modulok közös alapját vagy egy későbbi üzemi használatot blokkolja-e; mi zárja le.

A 29 klauzulát ne tekintsd az összes eredeti core-követelmény automatikusan teljes leltárának. Ne vesszen el az a követelmény, ami még be sem került ebbe a részregiszterbe. A régi OB-szöveg helyesbítése ugyanebben a munkában történjen, ne önálló adminisztrációs körként.

Ez nem új általános tervezési fázis és nem újabb, végrehajtás nélküli PLAN átadás. A működő elemeket használd fel, a már elfogadottakat csak konkrét regresszió esetén nyisd vissza.

### 5.2 A konkrét út megépítése

A szükséges magjavításokkal együtt készüljön elkülönült fejlesztői környezetben, szintetikus adatokkal böngészőben végigjárható core-folyamat:

regisztráció/belépés → saját munkakörnyezet létrehozása → munkatárs meghívása → meglévő vagy új fiókkal elfogadás → személyes/céges munkatérváltás → engedélyezett adat megtekintése → hozzáférés megvonása → új kérésen a megvonás érvényesül.

Ez az első core-UX, nem VShop, VMarket, készlet-, számlázó- vagy eGN-modul. Adatjogot egy egyértelműen jelölt szintetikus mintarekordon lehet bemutatni; ettől üzleti modul nem kész. A felület tényleges szerveroldali döntési és tárolási utat hívjon; ne csak kattintható képernyőterv vagy a böngészőbe írt engedélymátrix legyen.

A K03 szerinti meglévő fiók, rossz fiókból érkezés, biztonságos folytatás és új fiók külön út. Az alkalmazás számára azonosított cselekvő hiteles sessionből jöjjön, ne kliens által megadott actor/role/workspace mezőből. A valós küldés és a fejlesztői levelezési fogadó külön legyen jelölve; a csomag nem küld külső személynek meghívót.

Az R59/R61 korábbi adapter-/UI-tilalmát e konkrét core-folyamat megvalósításához az operátor mai irányítása alapján feloldom. Ez nem igazolja visszamenőleg az R58 hibás „nincs hívó, tehát új burkoló kell” érvelését. Most a megnevezett teljes felhasználói folyamat a fejlesztési indok.

Az OB-1 többkapcsolatos próbáját a folyamat által érintett véglegesítésre izolált, valódi többkapcsolatos tárolón kell elvégezni. Egyírós közbeiktatást továbbra sem nevezünk többfelhasználós bizonyítéknak. A futtatási környezet hiányát tényszerűen kell jelezni; emiatt nincs hamis teljes elfogadás. Éles DB, fizetős szolgáltatás vagy telepítés nem szükséges ehhez a fejlesztői feladathoz.

### 5.3 Kötelező, érthető elfogadási helyzetek

1. Egyszerű magánfiók céges adatbekérés nélkül létrejön; csak saját adatait látja.
2. A meglévő magánfiók alkalmazotti meghívót elfogad; saját jelszava, személyes adatai és más céges jogai változatlanok.
3. A fiókhoz adószámos működési minőség társul; a magán- és üzleti kör nem olvad össze.
4. Saját családi munkakörnyezet indul; második tagot meghívhat a jogosult kezelő, külön állami igazolási kör nélkül a saját helyi körhöz.
5. Azonos beírt cégazonosítóval más jelentkező nem kapja meg e munkakörnyezet vagy egy harmadik szolgáltató adatait; legitim saját indulása továbbra lehetséges.
6. Továbbadható körön túli meghívás/jogadás elutasított. Lejárt, visszavont, idegen címzettű és ismételten beváltott meghívó nem ad jogot; érvényes párja sikerül.
7. A raktári szerepnek adott mennyiségnézetből ár-, számla- vagy beszállítói bizalmas adat nem következik. A pozitív, külön engedélyezett olvasás működik.
8. Cégváltáskor a session-kontextus, válaszok és klienscache nem keverik a cégeket. Módosított API-paraméter sem ad idegen jogot.
9. Megvonás/lejárat után új kérés és függő meghívó nem használhatja a megszűnt alapot; másik független jogosultság nem szűnik meg indokolatlanul.
10. Két szervezeti egység és korlátozott helyi admin példája: a vezető nem kap automatikusan minden üzleti adatot; a delegálási plafon megmarad. Közös jóváhagyás támogatását vagy tényleges hiányát külön, bizonyítékkal nevezd meg.
11. Előfizetésileg elérhető funkcióhoz jogosulatlan munkatárs nem jut; jogosult személy sem használhat előfizetésileg nem engedett műveletet. Ehhez tesztprofil elég, fizetési integráció nem kell.
12. Két joghatósági azonosítónévtér azonos karaktersora nem téves azonosság; ismeretlen országprofil nem ad széles képviseleti jogot, és nem tiltja általánosan a független saját munkát.
13. Kezdő jogosultság, alap nélküli történeti sor, szabályos új felhatalmazás és jogosulatlan bírálói önfeljogosítás külön eredményt kap.
14. Két valódi kapcsolat meghívóbeváltási és megvonás–véglegesítési versenye: egyszeri, aktuális szabály szerinti hatás; visszajátszás nem kerüli meg a jelenlegi adatjogot.

A core-alapkövetelmény nem tűnhet el csak azért, mert az első bemutató kevesebbet használ. A nagyvállalati skálát/terhelést és összes ország megfelelőségét néhány példa nem bizonyítja. A konkrétan nem támogatott képességet láthatóan jelöljük.

## 6. Átadás és a körök lezárásának fegyelme

Egy összesített REPORT-ot kérek, az alábbi kézzelfogható kimenettel:
- Futtatható core-folyamat és reprodukálható indítás; hozzáférhető fejlesztői előnézet, ha az adott környezet ezt telepítés nélkül biztosítja, különben pontos indítási út. Előnézeti URL-t csak tényleges elérés után állíts.
- Legfeljebb egyoldalas magyar útmutató: mely szereplővel mit lehet kipróbálni, mi történik és miért.
- A fenti élethelyzetek eredménye a rögzített commiton: saját futás, bizonyíték, hiány/kihagyás elkülönítve.
- Egyetlen, aktuális core-lezárási lista: az eredeti normákhoz visszakötött tényleges maradék, következő szükséges munka és lezárási feltétel. A bizonyítékcsomag friss legyen; elfogadott korábbi munka ne tűnjön el.
- Világos állítás arról, hogy az első UX készült el, a mini modulok közös alapja készült el, vagy üzemi használat lett bizonyított. Ezek nem egymás szinonimái.

A mini modulok igényfelmérésének/UX-egyeztetésének belépési feltételét külön és végesen vezesd le a közös alapból. A globális országadapterek és minden későbbi üzleti funkció teljes implementációját nem lehet észrevétlenül e kapu elé tenni; valódi közös biztonsági alapot viszont nem lehet „majd a modul megoldja” felirattal elhalasztani. Teljes core-elfogadást a végén a független ellenőrzés adhat, nem a saját státuszcímke.

A chat legalább fele közérthető magyar: mi lett felhasználóként lehetséges, miért fontos, mi hiányzik és ki dolgozik rajta. A tesztszám mellékes bizonyíték, nem az egész státusz. Zsolt nem kézi biztonsági/regressziós tesztelő; használhatóságról az elkészült felületen tud visszajelezni.

Ne legyen új kör kizárólag átvétel, két komment javítása, tanulságregiszter bővítése vagy a már elfogadott bizonyíték újracsomagolása miatt. Változatlan működést ne mérj újra teljes költséges láncon csak dokumentációs szövegváltozás miatt; a forráskötés ilyenkor bizonyított tartalmi azonosságot és az eredeti futás idejét mutassa. Új viselkedéshez viszont megfelelő új próba kell.

Köztes visszaadás csak konkrét külső akadálynál vagy valódi, nem levezethető üzleti választásnál. Ilyenkor pontosan nevezd meg, mi akad el és milyen elérhető szakmai alapértelmezést vizsgáltál. „Zsolt nem döntött a felhatalmazási alapról” többé nem elfogadható indok.

## 7. Megőrzendő határok és szakmai támpontok

Nincs merge, éles telepítés, V2-módosítás, új üzleti mini modul vagy fizetős szolgáltatás bekötése. Egy Claude-v3 feladat, nincs párhuzamos sáv. A board-integráció a külön valach-family/vs repó; ebben a csomagban nem fejlesztjük újra.

R19 PLAN 24 QNT-követelménye és 36 tervezett esete megőrzendő: tétel ismeretlen mennyiséggel is létezhet/feldolgozható; a becslés utólag nem válik méréssé; a pontosítás nem készletmozgás. A teljes QNT későbbi csomag, de a core szerződésbeli helye és maradéka nem törölhető.
Fogyasztás R24-től ismeretlen; költség null, nem nulla. V2-re átadható ár/érték-javulás nincs bizonyítva.
Modellajánlás: claude-opus-5, medium; a váltás az operátoré, a feladat nem vár új modellválasztási döntésre.

Szakmai támpontok, ellenőrizve 2026-09-20; nem szolgáltatóválasztási vagy beszerzési döntések:
- A legkisebb szükséges jog, alapértelmezett tiltás és kérések szerveroldali ellenőrzése általános biztonsági gyakorlat. [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- Szervezetenként elkülönített tagság és szerepek bevett termékmodell; ez önmagában nem bizonyítja a VS szervezeti képviseletét. [Auth0 Organizations](https://auth0.com/docs/manage-users/organizations)
- A termékfunkció előfizetési elérhetősége önálló fogalom. A céges adatjogtól való elkülönítése a fenti VS-tervezési döntés. [Stripe Entitlements](https://docs.stripe.com/billing/entitlements)

A jelen kör nem országonkénti jogi megfelelőségi vélemény. Az országfüggő hivatalos művelet feltétele az adott adapter/profil ellenőrzött feladata; ebből nem csinálunk általános regisztrációs akadályt.
