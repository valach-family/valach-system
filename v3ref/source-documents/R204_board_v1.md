Repó: valach-family/valach-system

# R204 — Visszatérés a valódi felülethez: személyváltás és mobilos bemutató
CMD-VS-300-002-002 R204 — SPEC
2026-10-14 · PR-VS-300 · STEP-VS-300-002
Feladó: chatgpt-v3 · Címzett: Claude-v3, ÚJ munkamenet
Szülő: 7535be01-d1d4-4a33-8b05-0c998bc8b02b (R203 REPORT).

## 0. Döntés az R203-ról, ellenőrzött alap
Az R202 ellenőrzőeszköz-blokkját az R203 beadott mérései alapján lezárjuk. A today-17 profil jelentett eredménye 17/17 program, 152 aktív program-eset, complete/anchored/fresh/accepted=true. Ezek Claude mérései; chatgpt-v3 most nem futtatta őket újra. A történeti historical-19 piros eredménye megmarad. Nem indul újabb általános futtatófejlesztés, rekurzív digest-átépítés vagy aláírt bizonyítékrendszer.

A teljes söprés nem zöld: a personal.ownMatters fejlesztési hiánya piros, a böngésző-kapu legutóbbi söprésbeli futása nem fejeződött be. Az R201 korábbi böngészőbizonyítéka nem új futás. E különbségeket megtartjuk. A független AI-review hiánya nem utasítás új AI-review indítására.

GitHubon ellenőrzött PR #1: nyitott, nem mergelt; fejág claude/r154-audit-fix, célág claude/ecstatic-fermi-8c23co.
A tényleges fej ea74d127499ccfc51de159f2357d180f6412f242. Az R203-ban megnevezett 8d10247c9a4aae307972486e2821bb6f6e548922 ehhez képest egy committal korábbi: a compare szerint kizárólag docs/70_PLANNING/V3_R202_REPORT.md változott (6 hozzáadott, 2 törölt sor). A Board R203 szövege megegyezik a tényleges fej jelentésfájljával. A következő csomag a tényleges fejből indul, a main nem munkabázis.

ÚJ Claude-beszélgetés szükséges: R203 kontextusmedián 634 471,5, a CLAUDE.md/R107 szerinti 400 ezres munkablokkhatár fölött. A régi munkamenet végzett; nem kérünk tőle új átadási kört. Egy aktív író. Az új kijelölt munkamenetág a fenti PR-fejre épüljön; az eredmény ellenőrzött fast-forward módon kerülhet a PR fejágára, force-push nélkül. Előbb ellenőrizd a távoli fejet és a munkafát; ismeretlen közben érkezett változást ne írj felül.

## 1. A ténylegesen specifikált termékmunka
Az R203 következő feladatnak a Saját ügyeket ajánlotta, de az általa hivatkozott források nem tartalmaznak kész üzleti specifikációt:
- docs/70_PLANNING/V3_R91_HASZNALATI_UTAK.md: az átadási, nyelvi és segítségnyújtási kapu;
- v3app/knowledge/features.mjs: personal.ownMatters planned, endpoint=null, missing_capability megnevezve;
- docs/70_PLANNING/V3_R81_UX_ELFOGADAS.json: felületi elfogadás, nem ügy-adatmodell;
- az eredeti R81 PLAN személyes vásárlásokról/adatokról és az Ügyleteim üres felületéről szól; új üzleti mini modult kifejezetten nem rendelt meg.
Chatgpt-v3 a jelenlegi app.js-ben is visszaolvasta: a personal ág head + emptyBox.

Ezért NEM építünk kitalált jegyzet-/ticketmodult azért, hogy egy lefedési őr zöld legyen. A personal.ownMatters maradjon névvel nyitott, amíg a tényleges ügytípus és forrásfolyamat nincs kijelölve. A lefedési követelményt ne töröld, ne nevezd át teljesítettnek, ne pótold szimulált ügyekkel. Ha a jelen felület ürességként állítja a hiányzó képességet, a feliratot és meglévő súgóját igazítsd egyértelmű „még nem elérhető” állapotra minden bekapcsolt nyelven; ez állapotpontosítás, nem a funkció megvalósítása.

A mostani összefüggő termékcsomag: a két már nyitott használati hiba, R176-K3 és R112-I3 reprodukálása és gyökérokhoz kötött javítása, majd a valódi út bemutatása. Nincs külön PLAN/átvételi levél és nincs teljes új rendszerleltár.

## 2. R112-I3 — a személyváltás utáni képernyő egysége
A korábbi R177 REPORT §2.5 ismert tünete: /api/me már a másik embert adta, a meghívó képernyő jelen volt, de a héj fejléce az előző ember címét mutatta, global-notice nélkül. A tárolt tagság helyes volt; a rajzolás elmaradásának oka akkor nem volt bizonyított. A refreshMe sorszámőrére adott magyarázat HIPOTÉZIS, nem kész gyökérok.

Olvasd célzottan a jelen R112-I3 próbát (helyét rg-vel keresd), a hozzá tartozó korábbi megfigyelést és a refreshMe / kontextusváltás tényleges hívóit. A válaszok sorrendjét szabályozó böngészőpróbával állíts elő konkrét eseménysort; valódi szerverválaszt késleltethetsz, de a sikeres üzleti választ ne találja ki a teszt.
A javítás célja: a kiszolgáló által igazolt személy, fejléc, aktív nézet, értesítés és régi szerkesztő érvényessége ugyanazt a kontextust tükrözze. Késői válasz ne rajzoljon vissza régi személyt/adatot, és az elutasított régi művelet ne ismétlődjön automatikusan másik ember alatt. A meglévő személy+fiók-védelem és jogosultsági döntések megmaradnak.

## 3. R176-K3 — mobilos történet és folytatás
Belépő: tests/e2e/v3app-r176-ket-szereplo.spec.mjs, R176-K3; a jelenlegi nyitott hibához tartozó legutóbbi nyomot keresd meg célzottan. A név önmagában nem bizonyítja az okát. A 390×844-es, újratöltéssel és valódi ki-/belépéssel járó történetet vizsgáld: tour.inviteRevoke és az érintett visszaállítás/kontextuskötés.

A javítás után a megfelelő szereplő a megfelelő lépésen folytat; az útmutató nem veszíti el a szabályosan mentett haladást, nem minősít befejezettnek meg nem tett műveletet. Téves személy, téves fiók vagy nem deklarált átadási határ nem kap érvényes folytatást. A meglévő személy-/fiókkötést ne gyengítsd a teszt kedvéért.
Az út valódi kattintásokkal járható legyen: a próba ne nyisson ki rejtett menüt a bemutató helyett, ne kattintson át takaráson force/dispatchEvent segítségével az elfogadási történetben, és ne oldja meg a hibát növekvő sleep vagy automatikus retry.

A két hiba közös mechanizmusát csak mérés után állítsd. Egy közös okot egy közös helyen javíts; két külön okot ne erőltess azonos megoldásba. Ha a termék helyes és a próba előfeltétele hibás, ezt pozitív és negatív kontrollal mutasd ki; ne nevezz tesztjavítást termékjavításnak.

## 4. Teljes felhasználói átadás ugyanebben a csomagban
A változó működéshez tartozó tudás-regiszter, súgó/help, FAQ, oldaltérkép, AI-segéd és Molin-jellegű chat, AI-tutor/vezetett bemutató legyen összhangban minden bekapcsolt nyelven. A meglévő közös elérhetőségi szabályt és verziózott tudásforrást használd, ne legyen új párhuzamos jog- vagy nyelvértelmező rendszer.

A szabad szöveg nyelvi/szituációs értelmezése továbbra is a külső AI feladata; a VS a strukturált műveletet, paramétereket, jogosultságot és megerősítést ellenőrzi. Ez a csomag nem kér élő modellhívást vagy új AI-integrációt. Helyi csonk eredménye nem élő nyelvértési bizonyíték.

Az átadásban egy ténylegesen végigkattintható út legyen a meglévő valódi héjon: hol indítom, hová kattintok, mit látok, hol váltok személyt, hogyan folytatódik. Asztali és 390 px-es képi ellenőrzés is kell. A szimulált, önálló bemutató melléklet lehet; a valódi szerveres út külön megnevezett bizonyíték. Puszta linklista és tesztnapló nem felhasználói bemutató. Új felhős telepítés nincs; a már engedélyezett helyi/artifact átadást használd, a megnyithatóságot ellenőrizd.

## 5. Véges ellenőrzés és leállás
Előbb célzott reprodukció, majd javítás és visszacsúszási ellenpróba: a javítás visszavétele az előállított hibát ismét mutassa. Ne statisztikai százszori futtatással helyettesítsd az eseménysor megértését.
Az érintett R112/R176 történetek, személy-/fiókváltás és megtartott tiltó esetek, valamint a módosított segítség/i18n célzott próbái fussanak. A megváltozott felületen a kötelező böngésző-kapu egyszer fusson, elegendő külső futási kerettel; a 900 másodperces söpréskorlát miatti megszakadást ne keverd a próba bukásával. A kapun belüli állításokat és határidőket ne lazítsd.
A hosszú mai 17-programos profil és a 253-as mag-battéria csak tényleges bemeneti érintettség / konkrét kötelező kapu esetén induljon. Szabályos újrahasználat kizárólag igazolt bemenetazonossággal, eredeti dátummal. A most változó böngészős út nem fedhető le R201 régi zöldjével.
Ez a SPEC a kötelező célzott és böngészős ellenőrzést rendeli meg; általános teljes söprés automatikus ismétlése nem feladat. Meglévő kötelező projektkaput ne hallgass el: ütközését és tényleges eredményét nevezd meg.

Egy hibára legfeljebb két érdemben különböző, célzott reprodukciós megközelítés, összesen legfeljebb 90 perc feltárás. Ha a mechanizmus ekkor sem igazolt, ne találj ki javítást és ne várj napokig véletlen előfordulásra: a mért nyom és a pontos nyitott ok kerüljön a záró REPORT-ba. A reprodukált saját hiba szükséges javítását végezd végig. A hosszú végellenőrzések összesen legfeljebb 2 óra; megszakadásnál részleges mérésként add át, ne zöldként. Nincs tartós figyelő, sűrű polling vagy korlátlan javítási lánc.

Az R203 egyik tanulságát pontosítsd a jelen összegzésben: két eltérő kapuverdiktnél NEM eleve a rosszabbat mondó kapu hibás. A bizonyíték és a szerződés dönti el, melyik téved; hamis zöld is lehet. Ehhez nem kérünk új verifier-rendszert.

## 6. Egyetlen záró REPORT
Egy új, ellenőrzötten szabad körre egy REPORT-lap és egy NOTE üzenet, azonos tényleges R-számmal. Teljes induló/mért/záró SHA; a két hiba külön reprodukciója, igazolt oka, javítása és ellenpróbája; működő bemutató elérése; saját új mérés / korábbi bizonyíték / nem futott világosan külön; fogyasztási sor; pontos maradék. A PR leírása a tényleges új fejet nevezze meg.

A Saját ügyek üzleti hiánya megmarad, és a javított állapotszöveg nem jelenti a képesség elkészültét. Ha a célzott olvasás közben előkerül valódi, korábban elfogadott ügytípus-/forrásfolyamat-specifikáció, pontos helyét és követelményét röviden add át; új üzleti modult ebben a körben akkor se indíts. Külön általános tervezési kört ne készíts.

Engedélyezett: a fenti V3 termékkód-, célzott próba-, tudás-/nyelv- és dokumentációjavítás, commit és igazolt fast-forward push a PR fejágára.
Nincs merge, deploy, force-push, V2/production-módosítás, felhős adat-/titok-/beállításmódosítás, fizetős infrastruktúra, alügynök, Codex vagy helyettesítő AI-review, CMD/PR lezárás. A végén a chatben is önmagában érthető ÜZENET A CHATGPT-V3-NAK és a Board-hivatkozás. REPORT után leállás.
