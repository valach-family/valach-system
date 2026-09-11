# V3 0.6 — Egységes alapszerződés és válasz az R31-re

CMD-VS-300-002-001 · R32 — SPEC · ChatGPT · 2026-09-08  
Előzmény: R31 — ANALYSIS, 1. dokumentumverzió.  
Állapot: felülvizsgált tervezési alap; a mini modulok kapuja ZÁRVA.

## 0. Eredmény és érvényesség

Az R31 öt hiányára, mind a tizenhárom ellenpéldájára és három szerkezeti leletére külön választ adok. Az R30 tömörítése közben elvesztett vagy homályossá vált követelményeket visszaépítettem. K13–K16 külön nevet kap; K01–K12 teljes javított szövege itt áll. A korábbi M/P/§ szabályok sorsát a 3. szakasz rendezi.

**Ez az egyetlen aktuális ChatGPT-javaslat a legbelső V3-mag normatív szabályaira.** E körben felváltja az R30 K01–K12 szövegét és annak kapuját, valamint beépíti az alábbi megfeleltetési táblában felsorolt korábbi magszabályokat. A korábbi dokumentumok történeti források és tesztbemenetek; nem párhuzamosan alkalmazandó normák. Ez nem hamisít közös elfogadást: Claude-AUX ellenőrzése és a futó bizonyíték még szükséges.

A modulokhoz halasztott üzleti részletszabályokat a 3. szakasz kifejezetten elkülöníti a magtól. Ezek nem elveszett leletek és nem kész modulok. V2-kódot nem módosítunk; az R28–R29 hatóköre változatlan.

**Forrásellenőrzés:** elolvastam az R31 teljes, 45 170 UTF-8 bájtos szövegét; visszaolvastam az R17 és R21 normatív részeit, valamint az R24 és R30 rendelkezésre álló szabályait. Az R31 JSON-forrását a `cfdadcb6f24485ba0cff4f86c820b8c23118574c` commiton megnyitottam. A 225 régi tétel összes egyedi ítéletét nem auditáltam újra, és a jelentett V2-teszteket nem futtattam. A 225 azonosító szabályokat, leleteket és tesztszerződéseket is tartalmaz; nem 225 egymástól független hibát vagy lezárást jelent.

## 1. Tételes válasz az R31-re

### 1.1 H1–H5: a hiányok

| R31 | Döntés | Konkrét javítás / szükséges korrekció |
|---|---|---|
| H1 | A migráció külön szerződése szükséges. | K13: forrás, beemelő, fordulónap, történeti nyom, jogosult elfogadás és átfedésmentes készlethatás. Nem fogadom el, hogy minden importált tény eleve megsérti az összes magszabályt, vagy soha nem lehet bizonyíték: külső bizonyíték megfelelő ellenőrzéssel felhasználható. Import önmagában nem ad jogot. |
| H2 | A felelősségi modell szükséges; a javasolt kétállapotú könyvmező kevés. | K14: adatkezelési tevékenységhez/célhoz/adatkörhöz rendelt szerepek, több felelős, jogalap, utasítás és megállapodás. A tényleges tevékenység számít; a könyvelő nem minden szolgáltatásánál automatikusan adatfeldolgozó. |
| H3 | A visszaélés és erőforrás-felhasználás szabályozása szükséges. | K15: külön teremtési, meghívási, lekérdezési és publikálási keret. Nem egyetlen igazoltsági pontszám; nincs pusztán mennyiségből megállapított jogsértés és nincs automatikus partnerhálózat-feltárás. A V2 „egy adószám = egy tér” szabálya nem V3-előfeltétel. |
| H4 | A helyi, azonosítatlan fél konkrét helyét ismét kifejtjük. | K16: stabil helyi referencia és őrizeti nyilvántartás, saját könyvben. Az R17 B6 és R21 P3 ezt már tartalmazta; az R30-ban nem volt elég konkrét. A „soha nem akadályozza” csak a jogosult megfigyelés rögzítésére igaz, nem bármely végleges vagy szabályozott műveletre. |
| H5 | Felelős, bizonyíték és egyértelmű kapuértékelés kell. | A 4. szakasz G1–G8 soraiban megadva. A dokumentált szakmai ellenőrzés is valódi kapu lehet; a gépi darabszám önmagában nem bizonyít szemantikai helyességet. Hiányzó futásnál a kapu zárt, nem „szándékból teljesült”. |

**A jogi korrekció alapja:** az EDPB szerint az adatkezelői/adatfeldolgozói szerep a tényleges tevékenységből és döntési hatásból következik, nem szabadon választható szerződéses címke. Ezért egy egész könyvre tett bit vagy egy szakma neve nem elég a minősítéshez. [EDPB, 07/2020, 12–14. pont](https://www.edpb.europa.eu/system/files/documents/2023-10/EDPB_guidelines_202007_controllerprocessor_final_en.pdf)

A GDPR közös adatkezelőkkel is számol; az adatfeldolgozás alapja szerződés vagy más kötelező jogi aktus is lehet. A jogi személy puszta cégadata és egy természetes személy személyes adata nem azonos kategória. Ezért a „tízezer partnerrekord önmagában jogsértés” és a „mindenhol pontosan két szerep, mindig szerződésből” állításokat nem emelem V3-szabállyá. [GDPR, (14), 26. és 28. cikk](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng)

### 1.2 C01–C13: valamennyi ellenpélda

| R31 | Döntés és indok | Javított norma |
|---|---|---|
| C01 | Valós követelmény a csoportos adóregisztráció. Azonos szám ilyenkor a csoporthoz tartozásra utalhat, nem két jogalany azonosságára. Nem pusztán „típus + ország” egyediségi kényszer kell: az azonosított tárgy, kibocsátó, idő és csoporttagság is számít. | K01 |
| C02 | Kiadási leltár szükséges a hibás kötés javításához. Nem állíthatunk bizonyított emberi megismerést puszta kérésnaplóból. | K01, K05, K09 |
| C03 | A szolgáltató megszűnésére külön őrzési/átadási állapot kell. A „letéteményes” technikai őrzői hatáskör lehet; nem keletkeztet magától jogi letétet vagy platform-adatgazdaságot. Előfizetés megszűnése és jogalany megszűnése külön esemény. | K02, K09, K14 |
| C04 | A konkrét kiszivárgás csak akkor következik, ha a felület a címhez tartozó fiók létezésétől függ. A „folytatás másik azonossággal” lehet azonos mindkét esetben. A hiányzó megfigyelhetőségi szerződést megadom; az általános fiókváltás-ajánlatot nem kell tiltani. | K03, K05; A04 |
| C05 | Az R30 elve helyes volt. A több jelölt mellett az együttes eljárás feltételeit is tárolni kell; két jelölt nem két érvényes jóváhagyás. A V2-ben jelentett eltérés nem V3-cáfolat. | K04 |
| C06 | Az időbeli felbontás, frissülés és értesítési kiváltó is adatkiadás. A ritkítás önmagában nem bizonyít védelmet; pontos élő készletnél az engedélyezett változásközlés következményeit is vállalni kell. | K05 |
| C07 | Külön forrásazonosító és eseményegyeztetés kell. Közös korrelációs azonosító megállapodással továbbítható, tehát nem szerkezetileg lehetetlen. Dátum, mennyiség és tétel nem feltétlenül független bizonyíték; két egyező mező nem automatikus igazság. Bizonytalanságnál hatáskörrel rendelkező ügyintéző, nem a platform tulajdonosa dönt rutinügyenként. | K06 |
| C08 | A deklarált kérés, a feloldott bemenet és az egyszer rögzített hatás külön tárolandó. A régi HTTP-válasz feltétlen, szó szerinti visszajátszása hibás: visszavont olvasójognál ismét adatot szivárogtatna. A hatást nem számoljuk újra; a most kiadható válasz külön engedélyezett. | K07 |
| C09 | A „márciusban tudtuk” és a „márciusról ma tudjuk” lekérdezést külön definiáljuk. Nem kötelező negyedik önálló órát bevezetni: minden verzió hiteles rögzítési/véglegesítési ideje és sorrendje adhatja a tudásidőt. A benyújtott fájlt változatlanul megőrizzük. | K08 |
| C10 | A kikézbesített másolat korlátját visszaemeljük az R17 §4.2 és R21 P6 alapján. A közvetlen aláírt URL sem feltétlenül vonható vissza azonnal; egy offline kliens cache-ének kiürítését sem tudjuk garantálni. | K09 |
| C11 | Kerekítési és normalizálási szerződés kell. A kerekítés nem kizárólag a pénztípus tulajdonsága: számítási lépés, dokumentum, adószabály és készpénzes fizetés is eltérhet. Közös végrehajtó, külön alkalmazási profil szükséges. | K10 |
| C12 | A visszakapcsolás külön állapotgép és bizonyítandó művelet. Hiányzó múlt jelzése önmagában nem engedi meg a teljesnek mutatott vagy hibás új hatást. | K11 |
| C13 | Jogosultság- és bizonyítékfrissesség függőségenként szükséges. Nem általános szabály, hogy minden képviseleti művelethez új külső API-hívás kell, míg „saját könyvnél” soha: lejárat, visszavonás, műveleti kockázat és helyi jogállapot dönt. | K04, K12 |

A C01 alapjához egy konkrét, ellenőrzött példa elegendő: a brit HMRC leírja, hogy a VAT-csoport száma a csoporthoz tartozik, és azt a tagok használják; a tagság változása nem feltétlenül változtatja meg a számot. A német és holland változatot e körben nem minősítem külön validált országprofilnak. [HMRC, VAT Notice 700/2, §2.6](https://www.gov.uk/guidance/group-and-divisional-registration-vat-notice-7002#original-vat-registration-numbers)

### 1.3 S1–S3: a tárgyalás szerkezete

**S1 — elfogadva.** A leletkulcs teljes alakja tartalmazza a forrást és családot. A régi `R19/K1-1` és az új `R32/K01` eltérő kulcs. Claude Y1/Y2 elnevezése használható megjelenítési névként, de a régi K1/K2 alias és a történeti hivatkozás megmarad. A két B-családot is megkülönböztetjük: R17 B1 mint szabály, R19 B1-1 mint lelet. Nem csak a vezető nulla különböztet.

**S2 — elfogadva és javítva.** Kötelező készlet: L az elvetett tételekkel együtt, B, X, K1/K2 vagy Y1/Y2, Ö, M, P, T, E; hozzájuk jönnek a későbbi H/C/S tételek és saját egyedi foltok. Nem zárjuk a listát az R31 225-ös számára. Elvárt azonosítók forrásmanifestből származzanak, ne kézzel megadott összes darabból. A lencseszintű „fedve” nem ad automatikus tételszintű „lezárt” státuszt.

**S3 — elfogadva, a 2–3. szakasz javítja.** Az R30 maga is nyitva hagyta a konszolidációt; ezért nem állt fenn késznek nyilvánított lezárás. Ettől még a felülírási tábla valóban hiányzott. A szavak hiánya bizonyítéka a szöveges előfordulásnak, nem önmagában a fogalom hiányának vagy az összeegyeztetés lehetetlenségének. Az R17 §5/5 például már tartalmazott nyitóleltári szabályt; most kifejezetten K13-ba kerül.

## 2. A teljes, javított K01–K16 alapszerződés

Az alábbi szabályok együtt alkalmazandók. Jogosultság, hitelesítés, adatizoláció és szükséges audit nem kapcsolható ki üzleti modulként. A „nyilvántartási jogosultság”, a „jogi szerep”, az „áru tulajdona” és a „tárolási feladat” külön fogalom.

### K01 — Alany, azonosító és kötés

A fiók/aktor, természetes személy, jogalany, adóregisztráció vagy csoport, szervezeti egység, munkatér, könyv és helyi partnerreferencia külön azonosított objektum. Egy ember több minőségben és több szervezetben járhat el; ezek nem olvadnak össze cégváltáskor. Szervezeti egység nem jogosultsági csoport.

Külső azonosító: eredeti és normalizált érték, névtér, típus, kibocsátó, joghatósági profil, azonosított tárgyfajta, érvényességi intervallum, kötési bizonyíték és verzió. A séma megadja az egyediséget és számosságot, beleértve a csoport-/regisztráció-tagságot és időbeli változást. Ismeretlen sémán nincs globális egyediségi vagy összevonási feltételezés. A csoportazonosító nem a tag jogalanyazonosítója.

A helyi referencia globális kötés nélkül is használható. Egyeztetés jelöltet, ellenőrzött kötést vagy konfliktust adhat; nem alapoz automatikus hozzáférést, múltbeli ügyegyesítést vagy készletösszeadást. Az e-mail új tulajdonosa, két cím birtoklása vagy új adószám nem bizonyít személy-/jogalany-folytonosságot.

Téves kötésnél: célzott függő kiadások leállítása, kötésverzió javítása, érintett adatok/vetületek egyeztetése, kiadási leltár és szükséges incidenseljárás. Megkülönböztetjük a lehetséges jogot, az engedélyezett kérést, a ténylegesen kiszolgált adatot és az emberi megismerést; az utóbbit nem állítjuk naplóból bizonyítottnak. Az eredeti esemény és partnerpillanatkép megmarad.

### K02 — Saját indulás és a gazda nélküli állapot

Saját munkatér és értékes saját nyilvántartás indulhat a megfelelő, egyszerű regisztrációs profillal. A helyi admin a saját környezetet kezeli; nem foglalja le egy beírt vállalat globális irányítását. A partner létrehozása nem követel automatikus másik felhasználófiókot, másik vállalati főkönyvet vagy kötelező e-mailt.

A felhasználó nélküli partnerhez tartozó állítás a rögzítő saját könyvében is élhet. Elkülönített kezelt könyv csak megnevezett feladattal, felelősségi és hozzáférési profillal létesül. A technikai létrehozó, a szolgáltatás díjfizetője és a rendelkezésre jogosult nem szükségképpen ugyanaz.

Előfizetés megszűnése, utolsó admin kiesése, szolgáltató szervezet megszűnése és platformszolgáltatás megszűnése külön életciklus-esemény. Az érintett állomány működő, átadásra váró, korlátozottan őrzött, vitatott vagy szabályosan törölt állapotba kerülhet. Nincs automatikus átadás a legközelebb jelentkezőnek, a platformnak vagy az adatban megnevezett cégnek.

A technikai őrző csak a kijelölt tárolási, integritásvédelmi, megőrzési és ellenőrzött átadási műveletet végezheti, önálló üzleti felhasználást nem. A jogi alap, határidő, költség és jogszerű utód/jogosult K14 szerinti profilból következik. Ismeretlen utód esetén függő, felülvizsgálható állapot kell, nem örök tárolás vagy önkényes tulajdonváltás.

### K03 — Fiók, belépés, meghívás és tagság

A meghívó pontos célhoz, címzetti feltételhez, felajánlott jogkörhöz, jogadási alaphoz, kibocsátóhoz és lejárathoz kötött. A kézbesítő nem feltétlenül jogadó. A beváltás egyszer használható, a címzett és aktuális alap ellenőrzése atomikus.

Meglévő fiókhoz tagságot adunk megfelelő elfogadással; nem írunk jelszót, nem törlünk második faktort vagy más céges jogot. Új fiók létrehozása és fiókhelyreállítás külön eljárás. Meglévő tagság szerepváltozása vagy reaktiválása külön jogosított és auditált döntés, nem hallgatólagos UPSERT.

A kézzel átadott hivatkozás támogatott; annak birtoklása nem e-mail- vagy képviseleti bizonyíték. Bejelentkezés előtt a meghívás szándékát védett szerveroldali állapot őrzi, lejárattal és helyi folytatási céllal. Hitelesítés után visszatérünk a meghíváshoz. Másik fiókból biztonságos váltás lehetséges; a folytatástól nem keletkezik új jogosultság.

A jogosulatlanul nézett, azonos címzetti feltételű meghívóknál a fiók létezése nem befolyásolhatja a látható választ, fiókváltási lehetőséget, státuszt vagy hitelesítési út felkínálását. A semleges „Folytasd a meghívás címzetti feltételének megfelelő azonossággal” út mind létező, mind még nem létező fióknál elérhető. Új fiók részlete csak a megfelelő csatorna-/azonosság-ellenőrzés után közölhető. A meghívóban nincs bizalmas ügyadat.

Nem digitális résztvevő helyi partnerként továbbra is kezelhető, saját neki szóló közlése ellenőrzött papíros vagy képviselői úton átadható. Ez nem online fiók és nem általános szervezeti képviselet.

### K04 — Engedély, képviselet és frissesség

A döntés hiteles cselekvőre, eljárási minőségre, műveletre, célra, erőforrásra, adatkörre és megbízható feltételekre vonatkozik. Nagy hatású jogadás, képviselet-átvétel, helyreállítás és érzékeny export megfelelően erős, szükség szerint friss hitelesítést igényel; a kevés felhasználó nem mentesít. A szerep sablon; adatolvasási jog és jogadási hatáskör külön. Egy jogút a delegálási lánc megengedett metszete; több önálló teljes jogút alternatíva lehet. Hiányos utak és eltérő céges minőségek nem rakhatók össze joggá. Kötelező tiltás minden alternatívára érvényes.

Jogot befolyásoló tagság, megállapodás, csoport, törzsadat, szervezeti besorolás és szabálymódosítás maga is védett művelet. A szerkesztő másnak sem adhat a továbbadható hatáskörén túli jogot; önfeljogosítás és jóváhagyó kinevezése sem kerülőút. Hatáskörváltozásnál hatásleltár készül.

A képviselet jelöltek és érvényes megbízások halmaza, nem egy adminhely. Az együttes eljárás az adott művelethez és tartalomverzióhoz kötött jóváhagyási szabályt kap; a személyazonosságok, szükséges minőségek, lejáratok és összeférhetetlenségek ellenőrizendők. Két fiók nem feltétlenül két ember; egy ember két szerepe nem két független jóváhagyás.

Hat külön állításkör marad: fiókhitelesítés, személy, szervezet, képviselet/delegálás, adat-/műveleti jog, kötelező körülmények. Nyilatkozat az elfogadást bizonyíthatja, tartalma nem ettől igazolt. Nem kötelező két partneri tanú, drága eID vagy domain minden saját induláshoz. Az elfogadott bizonyítási utak eredete, függősége, frissessége és hatálya ellenőrzött.

A jogosultsági döntés az összes releváns függőséget és lejáratot hordozza, nem csak egy cégtéri számlálót. Véglegesítéskor hiteles aktuális helyi jogállapot kell; külső bizonyítékra a K12 profilja vonatkozik. Verzióeltérés újraértékelés, nem szükségképpen tiltás. A „ki mit láthat / milyen úton” nézet ugyanebből a szemantikából, védett és teljességjelzett formában készül.

### K05 — Adatkiadás, összesítés és megfigyelhetőség

Minden csatorna — UI, API, keresés, rendezés/szűrés, export, fájl, értesítés, webhook, háttérmunka, AI, támogatás — ugyanazon közlési határt tartja. Új, besorolatlan út vagy mező alapból nem nyilvános. A kliens által küldött cégtér vagy szerep nem jogosultsági bizonyíték. A hozzáférési kimutatás is védett adat.

Tételes olvasásnál erőforrás- és mezővetület, összesítésnél külön eredményjog van. Utóbbi deklarálja a könyvkört, mérőszámot, egységet, állapotokat, lefedettséget, üzleti időt, tudásállapotot, időbeli felbontást, frissítést, pontosságot, szűrést és dimenziókat. Az engedélyezett 11 darab nem ad ár-, szállító-, LOT- vagy számlajogot. Hiányosan vezetett könyv nem teljes attól, hogy a felhasználó minden sorhoz jogosult.

Az idősor, küszöbjelzés, változásértesítés és „van változás” jel külön közlési forma. Jogát és kiváltási szemantikáját kifejezetten engedélyezni kell; nem örökli automatikusan a pillanatképes szám jogát. Az engedélyezett pontos élő mennyiség változása közölhet mozgási információt. Ha ez nem engedélyezhető, az adott pontos élő nézet nem adható ki; időbeli ritkítástól vagy durvább bontástól sem állítunk bizonyítás nélkül titkosságot. Lekérdezési kombinációk és külső ismert adatok következményei is részei az értékelésnek.

A kiadott eredményhez védett leltár tartozik: jogosított címzett, nézet/verzió, érintett kör és idő, tényleges átadás állapota és hiányossága. Titkos tartalmat nem másolunk korlátlanul auditba. AI-eredmény forrásfüggőséget kap; új közönséghez külön közlési hatáskör kell. Visszavont forrásnál az érintett gépi kontextus és származtatás érvénytelenítendő; egyetlen bemeneti mező törlése nem elegendő bizonyíték.

Az engedélyezett tudásban azonos, csak védett tényben eltérő világok megfigyelhető eredménye nem különbözhet e titok miatt. Ez nem minden legitim kérés egyforma válaszát követeli. Időzítéshez előre rögzített mérési környezet és mérce kell; véges minta nem általános bizonyíték tökéletes azonosságra.

### K06 — Esemény, állítás, egyeztetés és elfogadott hatás

A megfigyelés, annak bizonyítéka, címzettnek szóló közlése és célkönyvi hatása külön tény. Jogosult saját rögzítés másik fél válasza nélkül működhet. Elfogadott mennyiség, tulajdonosi elszámolás, minőségi felhasználhatóság és korlátozás külön állapot; az észlelt áru nem válik automatikusan eladhatóvá vagy tanúsítottá.

A forráskulcs névtere tartalmazza a rendszert, forrásfiókot, objektum-/sorfajtát, azonosítót és verziót. A hiteles, közösen továbbított korreláció segíthet, de az összetartozás nem következik puszta azonos karakterláncból. Rendelés, szállítás és számla kapcsolódhat, nem automatikusan ugyanaz az esemény.

Forrásközi egyeztetés explicit állapot: jelölt, igazolt kapcsolat, eltérő esemény, konfliktus vagy ismeretlen. A megállapítás megőrzi a támpontokat, eredetüket, szabályverziót és a döntő aktort. Mennyiség/dátum önmagában nem független tanú. Ha a bizonyíték kevés, a megfelelő üzleti jogkörű ügyintéző dönt; a rendszer nem talál ki azonosságot és nem vár Zsolt egyedi jóváhagyására.

A célkönyv hatásköréből adott, visszavonható elfogadási szabály nevezett forrásra, eseménytípusra, körre, határértékekre és megállapodás-verzióra vonatkozik. Elfogadás lehet tételes vagy részleges; hallgatás nem automatikus elfogadás. Célkönyvenként beérkezett, függő, elfogadott, vitatott, elutasított és korrigált állapot követhető.

A kettős könyvelés elleni mechanizmus külön kezeli az azonos forrás újraküldését és a több forrásból jelzett ugyanazon gazdasági hatást. Bizonytalan jelöltet nem fogad be párhuzamosan két készlethatásként; a valódi részteljesítést sem nyeli el az ügyazonosító. A célkönyvi hatásegység, korrelációs döntés és véglegesítés atomikus. A címzett belső sora vagy késésének oka nem lesz a forrás számára automatikusan látható.

### K07 — Parancs, egyszeri hatás és újrapróbálás

A parancs művelettípusa/verziója, cselekvője/minősége, célkönyve, elvárt üzleti állapota, deklarált bemenete és ismétlésvédelmi kulcsa rögzített. A kulcs hatóköre megakadályozza a más személy/cég eredményének lekérését. A kérés-egyenlőséget verziózott séma szerinti kanonizált tartalom adja, nem az újrafuttatott üzleti számítás.

A tartósan befogadott parancshoz külön tároljuk a feloldott bemenetet és annak verzióit, például a kiválasztott szabályt és számláló eredményét. A kiválasztási időpont a művelettípus szerződése: ami még nem véglegesült, arról nem állítunk tegnapi hatást. Állapotok: befogadott, végrehajtás alatt, véglegesült, bizonyítottan hatás nélkül elutasított, vagy egyeztetésre váró ismeretlen kimenet.

Azonos kulcs és eltérő deklarált tartalom konfliktus; azonos tartalom újrapróbálása a már létező parancshoz kapcsolódik. Véglegesült hatás nem számolódik újra mai bemenetből, és nem keletkezik másodszor. A kulcsmegőrzési ablak lejárta után a tartós üzletihatás-azonosító és szükséges duplikációellenőrzés továbbra is véd. Ismeretlen külső eredményt előbb egyeztetünk.

**Hatás visszajátszása és válasz kiadása külön:** a korábbi belső eredmény változatlan marad, de az ismételt kérőnek csak a jelenleg kiadható vetületet adjuk. Visszavont jog esetén sem eredményadatot, sem védett létezési jelzést nem adunk pusztán a kulcs ismeretére. Lejárt linket vagy megszűnt jogot a régi HTTP-válasz visszaadása nem éleszthet fel.

A véglegesítés és a visszavonás közös, bizonyított sorrendben történik. Sorba állítás nem véglegesítés. A már logikailag véglegesített változatlan hatás belső vetületbe rendezését korlátozott rendszerjog végezheti; új külső közlés továbbra is adatkiadási határ. Nagy munka deklaráltan egy atomi vagy több külön véglegesíthető egység, pontos folytatási pontokkal. Külső rendszerhez tartós kimenő esemény, visszaigazolás és egyeztetés kell; nem ígérünk egyetemes elosztott atomi tranzakciót.

### K08 — Üzleti idő, tudásállapot, történet és korrekció

Minden állítás- és korrekcióverzió hordoz üzleti hatályidőt/intervallumot, hiteles rögzítési/véglegesítési időt és egyértelmű sorrendet, továbbá ahol különbözik, a megfigyelt esemény idejét. A tudásállapot a megadott rendszerbeli véglegesítési pontig ismert verziók halmaza; régi dátumra importált adat sem válik utólag akkor ismertté.

Múltbeli lekérdezés megadja az üzleti időt és a tudás szerinti határt. „Március, ahogy márciusban tudtuk” és „március, ahogy júniusban tudjuk” eltérő nézet. A korrekció új verzió/esemény, nem nyomtalan eredeti felülírás; az eredeti és a javító döntés szabály-/értelmezőverziója visszakereshető.

A ténylegesen benyújtott vagy kiadott jelentés változatlan példánya, tartalmi lenyomata, generálási paraméterei, forrás-vízjele, címzettje és átadási nyoma megőrzendő az alkalmazandó profil szerint. Egy újraszámolt nézet nem azonos a beadott irattal. Hiányos történeti bizonyítékra „nem rekonstruálható teljesen” állapot kell.

Külön kezeljük az akkori tényleges engedélyezési döntést, az akkori lehetséges jogkört és a kiszolgált adatokat. Auditálható végleges változás az üzleti tranzakció része; sikertelen kísérlet tartós nyoma külön, hozzáféréssel védett úton marad meg. Hiányzó audit nem írható felül „nem történt semmi” állítással.

### K09 — Megvonás, másolat, helyreállítás és életciklus

Érvényes biztonsági megvonás nem vár utódra. A feladatot más kezelheti megfelelő saját joggal; a feladatkiosztás nem jogadás. Tagság megszűnése, annak effektív joghatása, célzott tiltás és globális fiókletiltás külön esemény. Másik független jogút maradhat, kivéve ha alkalmazandó tiltás kizárja.

Fiók-helyreállítás, helyi admin pótlása és céges képviselet rendezése külön hatáskör. Domain, postafiók, partneri tanú vagy várakozási idő nem univerzális átvételi alap. Valódi vita ellenőrzött bírálati és felülvizsgálati utat kap; a bejelentő nem jut a vitatott adatokhoz. A korábbi admin nem örök visszavételi jogosult.

A megvonás lefedi a függő meghívókat, delegálásokat, szolgáltatásazonosságokat, feladatokat, exportokat, indexeket, cache-t és érintett AI-kontextust. Szerveren ellenőrzött új lekérés az aktuális jogtól függ. Közvetlen, előre aláírt tárolói URL-nél a tényleges visszavonhatóság és maximális élettartam deklarált; azonnali letiltás ígéretéhez ellenőrző kapu vagy bizonyított érvénytelenítés kell.

**A már átadott másolat nem távoli hozzáférés:** elküldött PDF, e-mail, képernyőkép és korábbi emberi tudás nem törölhető vissza. Online, együttműködő kliensben a saját cache törlése, cég-/fiókváltási izoláció és kontextusérvénytelenítés szükséges; offline vagy ellenőrizetlen kliens minden másolatának eltűnését nem ígérjük. Alapértelmezésben védett üzleti válasz ne kerüljön általános service-worker cache-be. Offline üzleti adat csak külön szabályozott képesség, határral és megőrzési idővel.

Megszűnéskor a saját jogszerű könyv, más megbízásából vezetett kör, kötelezően megőrzendő adat és átadható vetület külön kerül rendezésre K14 szerint. Kiadási leltárból lehet incidensvizsgálat, de napló hiányában a hiányt jelezzük, nem gyártunk bizonyosságot.

### K10 — Típus, normalizálás és számítási profil

Mennyiség = érték és egység; pénz = érték és pénznem. Hiány nem nulla. Tárolási/számítási pontosság, megjelenítés és üzleti kerekítés külön. A mag közös, determinisztikus numerikus műveleteket és verziózott profilszerződést ad.

A számítási profil megadja az alkalmazási műveletet, joghatósági/megállapodási hatályt és érvényességet; a lépések sorrendjét, kerekítési módot, felbontást, összesítési szintet, maradék felosztását és előjelkezelést. A pénztípus hivatkozhat erre, de ugyanaz a pénznem több profilban használható. Sor-, dokumentum-, adó- és készpénzes kerekítés nem olvad egy mezőbe. Az ágazati értékeket majd a modul/profil adja; most az otthonuk és végrehajtási szerződésük kötelező.

Az azonosítók normalizálása névtér-/sémaspecifikus, verziózott. Eredeti írásmód megmarad; keresési hasonlóság nem egyenlőség. Nem alkalmazunk univerzális kisbetűsítést, ékezetelhagyást, vezetőnulla-törlést, e-mail-alias összevonást vagy ß/ss cserét. Normalizáló váltásnál ütközésleltár és ellenőrzött átvezetés kell, automatikus jog- vagy alanyösszevonás nélkül.

Eltérő dimenzió csak megfelelő termék-/mérési profil alapján váltható. A fizikai átalakítás, kereskedelmi azonosító és tartalmazási kapcsolat külön. A mag nem talál ki sűrűséget, árfolyamot, tulajdonátruházást vagy minőségi származtatást. Nyelv és fordítás nem módosítja a gépi jelentést; nyilatkozatnál az elfogadott pontos nyelvi verzió is megőrzendő.

### K11 — Művelettípus-katalógus és teljes moduléletciklus

A mag birtokolja a művelettípus-regiszter sémáját, felvételi/kompatibilitási ellenőrzését és a közös végrehajtási protokollt. A modul saját névterében definiál üzleti művelettípusokat: parancs-/eredményséma, verzió, jogosultság, invariánsok, állapotátmenet, hatás, korrekció és események. Beszerzés és feldolgozás nem kényszerül egyetlen üzleti műveletté, de nem kap külön kerülőutat a közös jog- és véglegesítési szabályokhoz.

A modul deklarál adatköreit, függőségeit, fogyasztott/kibocsátott eseményeit, megőrzését és kiadási csatornáit. Nincs közvetlen idegen könyvírás, párhuzamos személyazonosság vagy rejtett jogadó mező.

Életciklusa legalább előkészítés, aktív, rendezett leállás, inaktív, visszatérés előkészítése és aktív/hibás állapot. Kikapcsoláskor a függő munka és történeti nézet rendezett marad; visszatéréskor séma, checkpoint, forrás-vízjel, eseménymegőrzés, mai jogok és idempotens hatások ellenőrizendők.

Visszajátszás, checkpointtól folytatás vagy ellenőrzött újranyitás választható a deklarált szerződés szerint. Ha hiányzik szükséges múlt, az abból függő teljes eredmény és módosító automatizmus nem aktiválható pusztán figyelmeztetés mellett. Megengedett részleges újrakezdés külön nyitóhatárral és teljességjelzéssel történhet. Vetület újraépítése nem ismétli meg a külső üzleti hatást.

### K12 — Kiesés, bizonyítékfrissesség és mentésből helyreállítás

Minden joghoz szükséges függőségnek van hiteles forrása, ellenőrzési módja, legnagyobb megengedett kora, lejárata, visszavonási csatornája, használati és kiesési szabálya. Ezek művelet- és bizonyítékosztályhoz kötöttek; üres profilból nincs megengedő alapérték.

A helyi aktuális jogot minden védett használatnál ellenőrizzük. A külső bizonyíték lekérése nem ugyanaz: elfogadott friss bizonyíték érvényes lehet szolgáltatói kiesés alatt is a rögzített határig, ha nincs tiltó jel. Megszűnt, lejárt vagy bizonyítottan visszavont alapra nincs türelmi hosszabbítás. Külső elérhetetlenség nem automatikus engedély és nem automatikus valamennyi saját adat elvesztése.

Meglévő helyi saját hozzáférés az attól független, érvényes hitelesítés és jog alapján folytatható. Új széles képviselet/jogbővítés csak teljes profil mellett aktiválható. Más nevében végzett munka is támaszkodhat elfogadott friss megbízásra; nem követelünk indokolatlanul minden raktári kattintásnál új állami lekérdezést. A hiányzó szükséges frissesség csak a tőle függő műveletet zárja.

Backupból visszaállás először izolált ellenőrzési állapot. A visszavonások hiteles vízjelét, a lejáratokat, döntés-/adatverziókat és már teljesült külső hatásokat egyeztetni kell. Ha az újabb jogvisszavonási állapot nem állapítható meg, az érintett régi jog nem aktiválható éles használatra. Lejárt link, hitelesítő vagy régi küldési sor nem éledhet újra. A helyreállítás próbájának ténylegesen tartalmaznia kell ezeket az eseményeket.

### K13 — Import, nyitás és idegen rendszer múltja

Importforrás: rendszer és forrásfiók, kivonat/verzió és lenyomat, eredeti kulcsok, tartomány, fordulónap, leképezési profil, beemelő cselekvő, idő és célkönyv. Ismeretlen régi aktort „ismeretlen forrásaktor”-ként őrzünk; nem találunk ki VS-felhasználót. A beemelő ismert aktor és jogosultsága ettől külön kötelező.

A beemelés előkészítő területen történik; darabszám, mennyiség, egység, tulajdon/őrizet, duplikáció, bizonytalanság és egyeztetés vizsgálata után jogosult céloldali elfogadás következik. A forrásban lévő adminjelző, megbízás vagy e-mail nem válik automatikus VS-joggá. Külső okirat K04 szerinti ellenőrzéssel bizonyíték lehet; puszta import nem hitelesíti.

Két explicit stratégia: ellenőrzött nyitóállomány fordulónapon, előtte referenciatörténettel; vagy megfelelő kezdőalapról rekonstruált mozgássor. Hibrid csak megnevezett, átfedésmentes körökkel. A nyitóban már szereplő régi mozgás utólagos bekötése nem új készlethatás. Nyitóesemény rögzítési ideje a befogadás, üzleti hatálya a fordulónap; korábbi tényleges megfigyelési idő külön megőrizhető.

Történeti betöltés alapból nem küld új meghívót, számlát, partnerértesítést vagy külső teljesítést, és nem kér újra minden régi félről elfogadást. A célkönyvi import jóváhagyása viszont valódi aktus. Ismételt import és részleges hiba nem dupláz; megváltozott forrás kontrollált különbség/korrekció. Nyitás utáni belső mozgások és a forrás továbbírása közötti átállási vízjel deklarált.

### K14 — Felelősség, megállapodás és őrzési feladat

A mag felelősségi profilja tevékenységhez, célhoz, adatkörhöz, résztvevőkhöz és időhöz kötött. Tárolja a minősített jogi szerepeket, jogalapot vagy utasítási alapot, megállapodást/jogi aktust, megőrzést, kiadási és megszűnési eljárást, felelős felülvizsgálót és verziót. Egy könyv több ilyen körből állhat; egy körhöz több felelős vagy közös adatkezelés is tartozhat.

Ez alkalmazandó jog szerint minősített tény, nem felhasználó által tetszőlegesen beállított szerepcímke. A technikai admin, létrehozó, áru tulajdonosa, szolgáltató és tároló nem ettől vagy szakmanevéből kap jogi minőséget. A modell nem állít minden országra azonos fogalompárt.

Megállapodás önálló, verziózott objektum. Üzleti feltétele, közlési hatásköre, jogi felelősségi minősítése és technikai jogai külön, összhangban ellenőrzöttek. A rendszer nem bővíti magától a megosztást, ha az üzleti működéshez hiányzik egy jogosult nézet. Technikai grant nem jogalap; jogalap önmagában nem korlátlan alkalmazásjog.

A technikai őrzői profil a K02 életciklusához kötött, alapja kifejezett szolgáltatási/megőrzési rendelkezés. A platform saját biztonsági/üzemeltetési tevékenysége elkülönül az ügyfél adatain végzett feladattól. Támogatási hozzáférés célhoz kötött, szűk, lejáró és naplózott; nem térátvételi bírálói hatáskör.

Megszűnéskor tevékenységenként meghatározott visszaadás, korlátozott megőrzés, törlés, jogszerű utódlás vagy függő vita következik. Az adatban megnevezett fél csak a jogszerűen neki kiadható részt kapja; a szolgáltató minden belső adata nem lesz az övé. Országprofil jogi tartalmát megfelelő szakértő validálja; hiányát nem az operátorra váró általános kérdésnek nevezzük.

### K15 — Visszaélési és erőforrás-korlátok

A helyi partner rögzítése, harmadik félnek küldött meghívás, külső lekérdezés, publikálás és szervezeti képviselet igénylése eltérő művelet és költség/kockázat. Egyikből nem következik a másik joga.

Verziózott szabály profilozza a szereplőnkénti, munkatérenkénti, célcsatornánkénti és összesített keretet: aktív/függő tételek, kiadási sebesség, párhuzamos feladatok, küldési és tárolási terhelés. Az igazolás csak egy jel; érvényes fiók vagy fizetős csomag sem teszi korlátlanná a visszaélést. Több fiókra osztás és más címek támadással történő kvótakimerítése külön teszteset.

Küszöbátlépés eredménye meghatározott: lassítás, sorba állítás, célzott korlátozás vagy ellenőrzés. A jogosult már meglévő saját munka és alapvető adatelérés ne vesszen el pusztán új meghívók leállításától. Korlát nélküli alapértelmezés nincs; induló számszerű értékeket a referencia terhelési/visszaélési próbája előtt profilonként rögzíteni és utána validálni kell. Ezek nem univerzális jogi küszöbök és nem Zsolttól kérendő találgatások.

Partnerfelvétel nem foglal globális nevet, nem zár ki másik nyilvántartást és nem publikál automatikus kapcsolati gráfot. Az érintetti megismerés/értesítés K14 szerinti jogszerű, címzetthez kötött vetület, nem minden harmadik fél teljes könyvének felfedése. A mennyiségi korlát nem pótolja az adatkezelési jogalapot.

### K16 — Hiányosan azonosított fél és fizikai valóság

Jogosult megfigyelés rögzíthető a saját könyvben stabil helyi referencia, hely, mennyiség/egység, rögzítő és bizonytalansági állapot mellett, külső azonosító nélkül. A különböző ismeretlen feleket nem egy közös globális „ismeretlen” alannyá olvasztjuk.

A fizikai hely, az őrző, az állított/igazolt tulajdonos, a nyilvántartó könyv és a felhasználhatóság külön tengely. Saját helyen idegen áru és külső helyen saját áru is kezelhető. Ha valamelyik nem ismert, annak hiánya explicit; nem találunk ki raktárt, tulajdont, LOT-eredetet vagy árértéket.

A ténylegesen észlelt mennyiség a napi őrizeti munkában látható, nem elvesző jegyzet. Azonosítás vagy engedély hiánya az azt igénylő eladást, mozgatást, feldolgozást vagy hivatalos véglegesítést korlátozhatja. Még meg nem történt szabálytalan művelet megállítható; már megtörtént tényt nem tüntetünk el az elutasító üzenettel.

Későbbi azonosítás K01 szerinti kötés, eredeti állítás megőrzésével; készlet- vagy jogkorrekció csak külön megfelelő eseménnyel. Nem szükséges automatikusan az érintett nevében céges könyvet létrehozni.

## 3. Felülírási és megőrzési tábla — S3 rendezése

**Jelentés:** „beépítve” = a régi szabály magszintű követelménye a hivatkozott új szövegben él tovább, a régi mondat nem külön norma. „Módosítva” = a megnevezett új rész váltja a korábbit. „Modulhoz őrzött” = nincs most részletes modulmunka, de az ellenpélda és peremfeltétel nem törlődik. A táblázat nem állít tesztpasszt.

### 3.1 R21: minden M és P

| Régi szabály | Új hely | Sors és megőrzött tartalom |
|---|---|---|
| M1.1–M1.3 | K06–K07, K13, K16 | Beépítve: megfigyelés/elfogadás; automatikus és részleges fogadás; sorba állítás és véglegesítés; rendszerjogból végzett utólagos technikai rendezés. Import különleges hatása K13. |
| M2, M2.1–M2.2 | K04, K07–K08, K12 | Beépítve és pontosítva: összes jogfüggőség, lejárat, atomi határ; tényleges/lehetséges/ténylegesen kiszolgált történet; jogot mozgató törzsadat; frissességi profil. |
| M3 | K05 | Beépítve, időbeli szemcsével és értesítési kiváltóval kiegészítve; a tételes és összesítési jog külön marad. |
| M4 | K02, K09, K14 | Beépítve; szervezet/platform megszűnése és technikai őrzés külön hozzáadva. A megvonás nem vár helyettesre. |
| M5 | K03, K05, K15 | Beépítve: engedélyezett tudás szerint azonos világok; minden megfigyelhető csatorna; címzetti és céges azonosság külön. |
| M6.1–M6.3 | K04, K06, K16 | Beépítve: hiteles származtatott jog, jogutak hatóköri uniója, fizikai mennyiség és felhasználhatóság külön. Domainenkénti minőségi algoritmus későbbi modul. |
| P1 | K01, K03, K09 | Beépítve: stabil aktor, változó hitelesítő/csatorna; személyfolytonosság; háromféle helyreállítás; funkciópostafiók nem személy. |
| P2 | K02–K04, K13, K16 | Beépítve: pontos meghívás, továbbadható hatáskör, saját tér nélküli részvétel, alternatív átadás és migrált régi tér. |
| P3 | K16, K06, K13 | Beépítve: hely, őrző, tulajdonos, könyv külön; külső helyen saját áru és fordítva. |
| P4 | K06, K10–K11, K16 | A magba beépítve az állítás/eredet/alkalmasság elkülönítése és típusonként deklarált származtatás követelménye. LOT-választási algoritmus, veszélyjelzés-terjedés konkrét szabálya és minősítési politika a későbbi modulhoz őrzött; nem tekintjük most lezártnak. |
| P5 | K04–K06, K14 | Beépítve: közlési hatáskör, megállapodás, harmadik fél adata és származtatott közlés külön. Konkrét díjképlet a későbbi pricing/costing modulhoz őrzött. |
| P6 | K05, K08–K09 | Beépítve: régi fájl versus új számítás, link és megőrzés, AI-forrásfüggőség és kontextusérvénytelenítés. |
| P7 | K02, K06, K09, K11, K14, K16 | Az üzemeltetési/támogatási határ és adminváltás alanyfolytonossága a magban marad. Selejt, visszáru, névtelen eladás és göngyöleg konkrét üzleti szabályai modulhoz őrzöttek; nem automatikus, közös törlő/visszáru művelet. |

### 3.2 R17 és R24

| Korábbi hely | Új hely | Kezelés |
|---|---|---|
| R17 §1 B1 | K04–K05 | Jogcsomag, önfeljogosítás elleni védelem és közvetett hatalom beépítve. |
| R17 §1 B2 | K01, K04 | Szervezeti egység és jogosultsági csoport külön; alternatív jogút megmaradhat. |
| R17 §1 B3 | K04–K05, K08 | Teljességjelzett, védett jogkimutatás; lehetséges jog és tényleges adatkiadás külön. |
| R17 §1 B4 | K02, K09, K12, K14 | Helyreállítás beépítve és megszűnési őrzési eljárással kiegészítve. |
| R17 §1 B5 | K06, K10–K11, K16 | A fizikai átalakítás és tartalmazás különbsége, egységellenőrzés, megfigyelés versus véglegesítés a magban. A kiszerelési/anyagmérleg/LOT-származtatási részletek modulhoz őrzöttek. |
| R17 §1 B6 | K01, K03, K16 | Stabil helyi referencia, kötés és jogadás külön, nem digitális résztvevő működő útja beépítve. |
| R17 §2 négy fogalma | K01, K04–K06, K14 | Megállapodás, szervezeti egység, szolgáltató szervezet és megosztási kör megmarad. Megállapodás nem olvad a grantbe. |
| R17 §3, 11 iPad | K04–K05 | Mennyiségi és ügyiratjog külön; idő, teljesség és következtetés kifejtve. |
| R17 §4.1–§4.2 | K03–K05, K07, K09, K12 | Közös szemantika, csatornák, atomi véglegesítés, link/másolat és visszavonás beépítve. |
| R17 §4.3–§4.4 | G1–G8, 5. szakasz; K14 támogatás | Tesztelési/kiadási felelősség konkretizálva; támogatási hozzáférés magszabály marad. |
| R17 §5/1–4 | K01, K06–K07, K16 | Fizikai dimenziók, eltérés, forráskulcs és hatásonkénti ismétlésvédelem beépítve. |
| R17 §5/5 | K13 | Nyitás és átfedő történeti bekötés teljesen ide került. |
| R17 §5/6–8 | K08, K10–K11, K14 | Történeti korrekció, közös motor határa, üzleti megállapodás beépítve; üzleti számítás modul. |
| R17 §6–§7 | 1., 3–5. szakasz | Korábbi válasz-/feladatjegyzék történeti forrás. Nem újra aktivált V2-feladat; minden tétele a teljes leletmanifestben megőrzendő. |
| R24 §2 és §6–§7 | K01–K06, K14–K16 | Egyszerű indulás, forráskönyvek, igazolt címzettnek kiadható vetület, saját könyv és más szolgáltató belső adata külön. |
| R24 §3–§4 | K03–K04, K12 | Hat bizonyítékdimenzió, forrásfüggőség és több elfogadási út beépítve. Nincs visszatérés egyetlen „bizonyíték-létrához”. A módszerpéldák indoklási mellékletek, nem kész adapterek. |
| R24 §5 és §9 | K04, K10–K12, K14 | Ország-/tevékenységprofil és adapter külön. Országpélda nem teljes jogi akkreditáció; csak validált profil aktiválható az érintett műveletre. |
| R24 §8 | K01–K02, K05, K09, K14 | Vita, kiadási leltár, helyreállítás és célzott megvonás beépítve. |
| R24 §10 | K01–K09, K12–K14 | B′ beépítve: nincs első érkezőből globális gazda; központi irányítás és régi adatkör külön. A V2-átvezetés felszólítása helyett V3 import-/referenciaszerződés. |
| R24 §11 | G2–G6 és 5. szakasz | E01–E26 tesztazonosítók megmaradnak, végrehajtásuk nem állított. |
| R24 §12–§13 | 0., 1., 4–6. szakasz | Régi válaszhelyek történeti források; a szakmai feladat nem válik „operátor nem döntött” státusszá. |

### 3.3 Az új K-szabályok eredete és a későbbi kiegészítések

| Új szabály | Fő előzmény és változás |
|---|---|
| K01 | R30 K01; R17 B2/B6; R21 P1/P2; R24 §2. Új: csoportazonosító, számosság/idő, C02 kiadási leltár. |
| K02 | R30 K02; R17 B4; R21 M4/P2; R24 §6. Új: megszűnés és technikai őrzés. |
| K03 | R30 K03; R21 M5/P1/P2; R26 §2–3. Új: C04 kétvilágú megfigyelhetőség; kézi többcéges út megmarad. |
| K04 | R30 K04; R17 B1–B3; R21 M2/M6; R24 §3/10. Új: együttes jóváhagyási szabály és függőségi frissesség. |
| K05 | R30 K05; R17 §3/4; R21 M3/M5/P6. Új: időbeli és értesítési közlés, kiadási leltár. |
| K06 | R30 K06; R17 §5/1–4; R21 M1/M6; R26 §4. Új: forrásközi egyeztetés konkrét állapota. |
| K07 | R30 K07; R21 M1/M2. Új: deklarált kérés, feloldott bemenet, változatlan hatás és mai válaszjog külön. |
| K08 | R30 K08; R17 §5/6; R21 M2/P6. Új: üzleti idő × tudásállapot és beadott irat. |
| K09 | R30 K09; R17 §4.2; R21 M4/P1/P6. Visszaemelt és pontosított másolat-/link-/cache-határ. |
| K10 | R30 K10; R17 B5; R21 P4. Új: normalizáló és lépésenkénti számítási profil. |
| K11 | R30 K11; R17 §5/7. Új: művelettípus-katalógus felelőse és teljes visszakapcsolási állapotgép. |
| K12 | R30 K12; R21 M2; R24 E14/E15/E25. Új: bizonyítékfrissességi függőségek és restore-korlát. |
| K13 | R31 H1; R17 §5/5; R21 P2; R24 §2/10 és E19. Import nem önigazoló, de nem is eleve érvénytelen. |
| K14 | R31 H2/C03; R17 §2/4.4; R21 P5/P7; R24 §7–9. Felelősség tevékenységenként, nem könyvenkénti bit. |
| K15 | R31 H3; R21 M5 terheléskorlátozás. Több kockázati/erőforrás-tengely, nincs igazoltságból korlátlanság. |
| K16 | R31 H4; R17 B6/§5; R21 P3/M6. Ismeretlen helyi fél és napi őrizeti állapot konkrétan. |

R26 elemzése történeti kódlelet; V3 szerződésként K03/K06/K11 őrzi a tanulságot. R27–R29 V2-javítás/visszavonás nem a V3 normatív állapota. R31 H/C/S azonosítói megmaradnak az 1. szakasz válaszaival. R30 tíz összetett próba megmarad; az új szöveg az elvárt eredményt pontosítja, nem jelöl végrehajtást.

## 4. A nyolc lezárási kapu: felelős, bizonyíték, mai állapot

A specifikáció felelőse ChatGPT; a repositorybeli konszolidáció és bizonyítékcsomag felelőse Claude-AUX. A V3 referencia készítése külön V3-feladat, nem a V2 üzemi DEV-munka. A tesztet megíró és az elvárt eredményt elfogadó ellenőrzés külön, azonosított szerep; a második szerep nem lehet pusztán ugyanazon ellenőrzés új neve.

Az alábbi gépi jelek **megvalósítandó ellenőrzési szerződések**, nem kitalált, már létező npm-parancsok. Az R31-ben létezőként jelentett `verify:k-contract` dokumentum/leltár-ellenőrzés, nem e kapuk teljes végrehajtása; ebben a körben nem futtattam.

| Kapu | Felelős és ellenőrző | Kötelező bizonyíték és gépi feltétel | Mai állapot |
|---|---|---|---|
| G1 — Egyetlen normatív alap | ChatGPT készíti, Claude-AUX szemantikailag ellenőrzi | Rögzített verzió/lenyomat; régi normákhoz döntés és célhely; hiányzó/dupla/érvénytelen hivatkozás = 0; dokumentált, konkrét ellentmondás-vizsgálat. A linkellenőrzés nem bizonyítja a tartalmi összhangot. | Az R32 konszolidált javaslat és táblák kész; független elfogadás még nincs. ZÁRVA. |
| G2 — Tételes lelet-visszakövetés | Claude-AUX készíti, ChatGPT mintán túl tételes lezárási ellenőrzést végez | Forrásból származó teljes ID-halmaz; minden tételhez saját ítélet, indok, norma, teszt/indokolt modulhatár. Elveszett ID = 0; lencsétől automatikusan örökölt lezárás = 0; lezárt tételnél hiányzó bizonyíték = 0. | Az R31 lencseleltár; teljes tételes szemantikai lezárás nincs. ZÁRVA. |
| G3 — Élethelyzet és életciklus | Claude-AUX mátrix, ChatGPT ellenpélda-ellenőrzés | Személy, e.v., családi vállalkozás, kkv, csoport/nagyvállalat × indulás/meghívás/munka/változás/vita/megszűnés; több forrás/minőség/jog és országprofil-kiesés. Minden előírt kritikus kombinációhoz kézzel értelmezhető kezdővilág és elvárt végállapot. Hiányzó kritikus cella = 0. | Meglévő szerződések vannak, teljes kitöltött/elfogadott mátrix nincs. ZÁRVA. |
| G4 — Független elvárt kimenet | ChatGPT referenciaelvárás, Claude-AUX challenge; implementáló nem önhitelesít | Minden kritikus teszthez indokolt pozitív és tiltott eredmény, meghatározott határ és ellenőrző. Az elvárás nem a tesztelt függvényből számolt. Feloldatlan kritikus ellenpélda = 0. Géppel a jelenlét/verzió mérhető, szakmai igazság külön review. | R31-re javított normák és A01–A18 készültek; közös elfogadás nincs. ZÁRVA. |
| G5 — Futtatható V3 magreferencia | Claude-AUX felel a V3 végrehajtási csomagért, ChatGPT ellenőrzi az eredményt | Elkülönített tároló és valódi kérés–jog–véglegesítés lánc; rögzített kódverzió, parancs, környezet, kezdőadat, napló, kimenet. Kritikus kötelező teszt sikeres; hibás és kihagyott kritikus teszt = 0. | Referencia/futási bizonyíték nem érkezett. ZÁRVA. |
| G6 — Hibák észlelése és üzemhiba | Referencia készítője futtatja, másik fél értékeli | Releváns mutáció, konkurens tranzakció, megszakítás, duplikáció, restore és adatkiadási megkerülés próbája. Minden veszélyes mutáció észlelt; ekvivalens/elérhetetlen mutáció külön indokolt, nem hamis passz. Reprodukálhatatlan hiba = nyitott. | Nem futott. ZÁRVA. |
| G7 — Maradék és támogatási határ | Claude-AUX leltár, ChatGPT érdemi ellenőrzés | Nyitott blokkoló = 0; nincs átnevezett vagy modulhoz bújtatott alaplelet. Minden valóban halasztott modulrészhez indok és alapfüggőség. Releváns jogi profil szükséges validáció nélkül nem támogatott, és ezt a referencia követi. | Bizonyítatlan normák és profilparaméterek maradtak. ZÁRVA. |
| G8 — Lezárási jelentés | Claude-AUX összeállítja; ChatGPT külön értékeli ugyanazt a verziót | G1–G7 elfogadott, változatlan bizonyítékokkal; nulla elavult/hiányzó hivatkozás; indokolt ellenőrzői eredmény. A kapuértékelő csak teljes manifestből adhat „mehet”-et; a két fél puszta igenje nem elég. | Előfeltételek hiányoznak. ZÁRVA. |

Egyetlen kapu sem kér az operátortól biztonsági szakértői döntést. Országspecifikus jogi minősítéshez megfelelő szakértő kell; a technikai adattípus megléte nem annak validációja. A jelen hatókörben nem kell minden ország bevezetése, de kell a támogatott/nem támogatott határ és annak helyes viselkedése.

**Bizonyítékrekord minimális alakja:** forrás-azonosító, normaverzió, teszteset, implementációverzió, végrehajtó, ellenőrző, parancs/környezet, kezdővilág és véletlenmag ahol kell, elvárt eredmény, tényleges eredmény, időpont, mellékletlenyomat, siker/hiba/kihagyás/nem futott állapot és indok. Dokumentumellenőrzés, szabályfüggvény-próba, integráció és jogi review külön bizonyítékfajta. Egyik nem változhat a másikká csak a státusz átírásával.

A kapu gépi kiértékelése: hiányzó, elavult, más verziójú vagy nem megfelelő fajtájú kötelező bizonyíték esetén zárt; minden kötelező gépi feltétel és dokumentált szakmai ellenőrzés teljesülése esetén nyitható. A bizonyíték eredetét is ellenőrizni kell: egy saját kézzel írt `passed: true` nem futási eredmény.

A jelszó-/hitelesítési lelet első referencia-próbájához és a konkurens véglegesítéshez valós izolált tároló szükséges, üzleti/éles adat nem. A hiányzó éles adatbázis-hozzáférés tehát nem indokolja önmagában az elkülönített V3 tesztkörnyezet elmaradását; a tényleges futtatási képességet külön fel kell mérni. Ha az adott környezet ezt sem tudja, pontos technikai blokkot és átadható futtatási csomagot kell megnevezni, nem zöld env-kihagyást.

## 5. R31-ből következő elfogadási esetek

Az A-azonosítók teljes neve `R32/Axx`; nem írják felül a T/E teszteket. Ezek konkrét elvárt forgatókönyvek, **egyik sem ebben a körben lefutott V3-teszt**.

| ID | Kezdőhelyzet és lépések | Kötelező eredmény |
|---|---|---|
| A01 | Két jogalany egy csoportos adóregisztrációban; később egyik kilép | Mindkét jogalany/könyv használható; időben helyes tagság; nincs alany-/jogösszevonás. |
| A02 | Téves alanykötésből ismert export készült, majd javítás | Új kiadás leáll; kötés és vetület rendezett; export a kiadási leltárban, a letöltött példányra nincs törlési garancia. |
| A03 | Rendszert nem használó partner könyvét vezető szolgáltató megszűnik | A profil szerinti őrzési/átadási állapot; nincs automatikus platform- vagy partneradmin; ellenőrzött jogosultnak csak kiadható kör. |
| A04 | A kibocsátó saját fiókjával nézi ugyanazon címre szóló meghívót két világban: a címhez van/nincs fiók | Ugyanaz az engedélyezett megfigyelés és általános váltási út; nincs létjelzés. A valódi címzett megfelelő hitelesítés után mindkét világban végigjut a saját helyes útján. |
| A05 | Együttes képviselethez két külön jogosult kell; egy ember két fiókot használ, majd két ember eltérő tartalmat hagy jóvá | Egyik sem érvényes közös döntés; két megfelelő személy ugyanazon tartalmi változatra adott érvényes jóváhagyása véglegesíthető. |
| A06 | Csak rögzített idejű aggregátumjog; percenkénti lekérdezés, eltérő export és változásértesítés kérése | Az idő-/csatornaprofil egységes; nincs sűrűbb titkos közlés más úton. Külön engedélyezett élő összesítés pozitív ága működik, következtetési határa megnevezett. |
| A07 | Szállító és fuvarozó külön kulccsal jelenti ugyanazt; második valódi szállítás azonos napon azonos mennyiséggel | Elsőnél egyeztetett egy hatás; második nem vész el kulcs-/mezőegyezés miatt. Bizonytalan eset nincs kétszer automatikusan befogadva. |
| A08 | Befogadott/véglegesült parancs közben szabályverzió vált; azonos kulccsal újra kérik, majd megvonják a kérő olvasási jogát | Egy hatás rögzített bemenetből; eltérő tartalom konfliktus; megvonás után a régi eredményadat sem játszható vissza. |
| A09 | Márciusi rekordról márciusi jelentés, júniusi visszamenőleges javítás | Régi beadott fájl változatlan; márciusi tudás szerinti és mai tudás szerinti március külön, helyesen reprodukálható. |
| A10 | Szerverkapus link, közvetlen aláírt link, online cache és letöltött PDF; megvonás/kilépés/cégváltás | Mindegyik a deklarált tényleges határt tartja; más cég cache-e nem jelenik meg; offline másolat törlése nem állított. |
| A11 | Szintetikus tesztprofil: két 0,005 egység, fél-felfelé kerekítéssel soronként vagy végösszegre | Soronként 0,02; összesítés után 0,01; helyes profil/verzió kerül az eseményre. Ez tesztadat, nem országos pénzügyi előírás. |
| A12 | Azonosító 0012/12, ß/ss és ékezetes változatok külön névterekben; normalizáló frissítése | Csak a séma szerinti egyezés; keresési hasonlóság nem olvaszt alanyt. Ütközésleltár, eredeti írásmód és régi kötés megmarad. |
| A13 | Modul fél év után visszatér; eseményeinek egy része lejárt, más részét már külső rendszer teljesítette | Kötelező állapot/helyreállítás; nincs hamis teljes vetület, elnyelt hiány vagy duplán kiküldött hatás. |
| A14 | Külső bizonyítékforrás kiesik érvényes, majd lejárt bizonyíték mellett; közben helyi megvonás érkezik | Érvényes profilon belüli független saját út működik; lejárt/visszavont alap nem. Külső hívás kikerülése nem helyi jogellenőrzés kikerülése. |
| A15 | Fordulónapi 100 darab nyitóállomány; később bekerül a benne már szereplő 20 darabos régi mozgás; import újrafut | Marad 100 darab; történet bekötve, nem új hatás. Kimaradt pozíció csak explicit korrekcióval; nincs új külső értesítés. |
| A16 | Ugyanazon szervezet két tevékenységben eltérő felelősségi szerepet visel; egyik megbízás megszűnik | Csak érintett adatcél/kör rendeződik; másik jogszerű tevékenység nem törlődik, technikai admin nem írhatja át a jogi minősítést önigazolásként. |
| A17 | Tömeges partnerfelvétel/meghívás több fiókból, egy célszemély terhelésével | Nincs névfoglalás; a kockázati keretek a kijátszást és a címzett elleni kvótatámadást kezelik; legitim saját munka nem vész el. Számszerű profilt a futás előtt rögzíteni kell. |
| A18 | Két ismeretlen helyi fél, egyik később azonosított; saját helyen idegen áru és külső helyen saját áru | Külön helyi referenciák; valós fizikai lista működik; kötés nem ír tulajdont/jogot, és a hiánytól függő véglegesítés megfelelően korlátozott. |

Megőrzött T/E-pontosítások: T01/E20 teljes összesítés csak a K05 pontos idő- és kiadási profiljában; T07 technikai újrakézbesítése nem kerüli meg a mostani külső adatkiadást; T25 fájl/link határa K09; E14/E15/E25 függőségi frissessége K12; E19 eseményegyeztetése K06/K13. Azonosítójuk változatlan, az elvárt eredmény verziója léptetendő.

T18/T19/T23 és a konkrét iparági E23 nem teljes üzleti modult kér a kapu előtt: a semleges magreferenciában az állítás, szükséges korlátozás, forrásfüggőség és hatáskör megőrzését próbáljuk. A teljes LOT-, tanúsítvány-, selejt- vagy értékesítési szabály a későbbi modul saját kapuja; az ide tartozó alapkövetelményt ettől még nem halasztjuk el.

## 6. Következő átadás és valós státusz

A következő Claude-AUX-körnek ezt az egy konszolidált szöveget és a felülírási táblát kell ellenőriznie. A most megoldott H/C/S pontokra csak konkrét maradék ellenpélda indít új vitát; ugyanazt a régi leletet új néven nem számoljuk új eredménynek.

Párhuzamos normakészlet helyett ugyanennek a specifikációnak legyen következő verziója. A tételes leletmanifest az egyes rekordok bizonyítékállapotát őrzi. A gépi számláló ne nevezze lezártnak azt, ami csak szabályhoz rendelt, és ne örökítsen lencseítéletet valamennyi gyermekre.

Ezután a kritikus referencia-próbák következnek: először a folytonos meghívás/meglévő jelszó védelme és a függő jog visszavonása; majd az egyszeri célkönyvi hatás, ismételt kérés adatkiadása, importátfedés és helyreállítás. Nem kell újabb teljes V2-audit vagy a costing/pricing modul kifejtése ahhoz, hogy ezeket elkülönített V3-próbában mérjük.

E körben: a 21 R31 H/C/S tételre válasz, teljes K01–K16 normaszöveg, M/P/§ felülírási táblák, G1–G8 felelősök és bizonyítékszerződések, valamint A01–A18 elfogadási esetek készültek. A dokumentum szerkezeti ellenőrzése nem V3-teszt. Futó referencia, tételes 225-ös szemantikai lezárás és jogi országprofil-validáció nem készült; ezek hiányát a kapu kifejezetten jelzi.

**Nincs operátori döntési kérdés. A mini modulok kapuja zárva marad.**
