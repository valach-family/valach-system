# R85 — R84 ellenőrzése és a megmaradt felületi hibák javítása

CMD-VS-300-002-002 R85 — ANALYSIS
PR-VS-300 · STEP-VS-300-002 · 2026-09-25
Repó: valach-family/valach-system · ág: claude/affectionate-dijkstra-76w5e8

## Hol tartunk, ki mit csinál?

A közös felületi keret elkészült és megmarad: felül fiókválasztó és saját profil, balra egységes menü, középen munkalapok, külön személyes nézet. A meghívó, jogosultságadás és csomagmódosítás korábbi elavultpanel-hibájára beadott próbák sikeresek; az űrlap kitöltése munkalapváltáskor megmarad. A vállalkozás létrehozása után egy sikerjelzés és egy érthető meghívási lehetőség látszik. Ezek tényleges előrelépések.

Az R84 teljes lezárását mégsem fogadom el: négy saját ellenpélda maradt. Ezek egyike továbbra is másik személyhez ír, kettő a fiókok adatainak megjelenítését keveri, a negyedik elveszett válasz után téves újrapróbálásra biztat. Nem új funkciókat kérünk, hanem a már vállalt közös szabályok következetes befejezését.

Tervezés és ellenőrzés: chatgpt-v3. Javítás: Claude-v3, egy összefüggő csomagban. Az operátornak nem kell a belső megoldások között választania. Újratervezés, új üzleti modul, V2-módosítás, merge és telepítés nincs.

## 1. Forrás és bizonyíték

Az R84 teljes aktuális REPORT-ját find_document-tal elolvastam, az R83 követelményeivel és a Board körüzenetével összevetettem. Az aktív parancs ellenőrzéskor R83, az új jelentés R84, az R85 még üres volt. R84 körüzenet: cc3848f0-7cc9-478b-a0c1-4efda0d850e3.

Mérési forrás: 05184e79377f4d1e05d6b2ebc3615a0f8704af2b. Ellenőrzött ágfej: f968c0472c80672e0b240b8001dd86835d873f6b. A GitHub-összehasonlítás szerint e kettő között csak a fogyasztási leltár és a REPORT változott, az alkalmazáskód azonos. A történeti b8ae580 fejhez képest a változott alkalmazás- és tesztfájlokat letöltöttem. A 18 letöltött fájl bájtról bájtra egyezett a Git-blob SHA-val. A változatlan részek az előző ellenőrző másolatból származnak; ez rekonstruált helyi ellenőrző forrás, nem tiszta git-klón.

Saját környezet: Node v24.19.0, Playwright 1.56.0, helyi Chromium és külön SQLite-adatbázisok. A böngésző indítási helyét és riportolót a környezethez igazítottam. Termékkódot nem módosítottam. A próbával generált UX-leltárt külön megőriztem, a beadott változatot visszaállítottam.

| Saját futás | Eredmény | Mit bizonyít? |
|---|---:|---|
| R83 célzott böngészőfájl | 5/5 | Beadott meghívó-, jogadás-, csomag-, űrlap-, készletkapu- és kapcsolatmegszakítási esetek |
| R81 UX böngészőfájl | 8/8 | A beadott UX-állítások próbái végigfutnak; a 20+2 ítélet nem automatikusan helyes |
| HTTP selfcheck | 57/57 | Alkalmazás és mag kapcsolata |
| R79 célzott HTTP-battéria | 49/49 | Korábbi nézetkötési esetek |
| Magpróbák | 62/62 | Az olcsó magbattéria; nem a teljes mutációs lánc |
| Saját, külön megírt böngészős ellenőrzés | 5 eset | Egy pozitív API-határvizsgálat és a lent részletezett négy ellenpélda |

Claude állítása: teljes böngészőcsomag 48/48, R75 73/73, R77 34/34, KUKA 384/384, további dokumentumkapuk sikeresek. Ezek teljes sorozatát én nem futtattam újra. A teljes söprés és hosszú mutációs/külső láncok ebben az ellenőrzésben sem futottak; nem minősítem őket zöldnek. Az R84 ezt a hiányt már helyesen jelöli.

Saját pozitív ellenőrzés az új meghíváslistán: jogos fiókkezelő 200 és saját meghívás, idegen expected_book_id 409, egyszerű tag 403, nyers meghívótoken nem szerepel a listában. A névtelen meghívónéző nem kap cégnevet; a bizonyított címzett a helyes cégnevet és szerepet kapja. Ez a szerveroldali határ a mért esetekben helyes.

## 2. F85-01 — A vállalkozás-létrehozás még másik személyhez ír (blokkoló)

Reprodukció: Anna megnyitja az új vállalkozás űrlapját és kitölti. Ugyanazon böngésző sütijével egy másik belépés Bélára vált; a régi lap erről még nem kapott frissítést. Anna régi űrlapján létrehozás: HTTP 201. Az új fiók neve „Anna félbehagyott vállalkozása”, de a belépett és létrehozó személy Béla. A képernyőkép ezt a saját profilban és az új fiók fejlécében együtt mutatja.

Ok: a doCreateWorkspace ellenőrzi a helyi generációbélyeget, de api('POST','/api/workspaces',body) útján nem küldi a megnyitáskori személyt; a szerver kizárólag az aktuális session.subject_id alapján ír. A böngésző másik lapjának belépése nem módosítja magától a régi lap helyi generációját. Előzetes /api/me-frissítés önmagában sem zárja le a frissítés és írás közötti versenyhelyzetet.

Javítási irány: a létrehozás kapjon szerveren, írás előtt ellenőrzött, megnyitáskori személyhez kötést. Itt még nincs célkönyv, tehát a személy az elsődleges kötés; ne követelj nem létező új könyvazonosítót. A séma, kliens és végpont egy csomagban változzon. Az elavult személy nevezett, írásmentes elutasítás, a régi szerkesztő érvénytelenítése és érthető üzenet legyen: „Másik felhasználó jelentkezett be. A korábbi kitöltést nem mentettük el. Indítsd újra a létrehozást a saját fiókodból.”

Próba: két valódi böngészőlap közös sütivel; két beküldési kísérlet; a könyvek, tagságok, jogosultságok és vállalkozási adatok teljes releváns változásának hiánya; pozitív pár frissen megnyitott helyes személy alatt. A közös szabály minden író űrlapra vonatkozó állítását csak a ténylegesen érintett utak vizsgálata után tartsd fenn. Ez szándék és végrehajtó eltérése; nem állítok általános jogosultság-megkerülést.

## 3. F85-02 — Az előző cég várakozó meghívása az új cég alatt marad

Reprodukció: az Első Műhelyben egy várakozó meghívás van, címzettje csak-elso-ceg@example.test. Megnyitom a Várakozó meghívások lapot, átváltok a Második Műhelyre, ott megnyitom a Felhasználók lapot. A Második Műhely új listaválaszát késleltetem. A fejléc már a Második Műhelyt mutatja, a táblázatban még az Első Műhely címzettje áll. Az új válasz késleltetése tudatos tesztfeltétel; nem valódi hálózati hibaállítás.

Ok: a state.invites nincs a közös fiók/személyváltáskori ürítésben. A render a korábbi tömbből rajzol; loadInvites ezután nulláz, de a már kirajzolt régi tábla a válaszig látható marad. Az érkező válasz generációvédelme ezt nem javítja.

Javítás: minden nézethez kötött gyorsítótár ürüljön az új nézet első kirajzolása előtt, a meghíváslista is. Egy közös reset legyen. Új lekéréskor azonnal „Meghívások betöltése…” vagy nevesített hiba látszódjon, ne régi sor. Lassú válasz, elveszett válasz, saját fiókváltás és külső személyváltás esetén se jelenjen meg idegen sor. A sikeres új válasz továbbra is kötötten jelenjen meg. A hiba a helyi megjelenítésben van; az új végpont szerveroldali hozzáférésvizsgálata a saját próbámban helyes.

## 4. F85-03 — Ugyanaz a cég két felhasználónak más bemutatóadatot mutat

Reprodukció: Anna létrehoz két céget. Bélát a másodikba meghívja és készletjogot ad neki. Mindketten ugyanazt a Második Műhely fiókot nyitják meg. Anna Szenzormodult lát 120 db-bal; Béla Rögzítőelem M8-at 840 db-bal. A közös fejléc ugyanaz, a különbség a mintacsomagban van, nem eltérő készletjogból ered.

Ok: demoFor és demoSource a néző személy saját workspaces listájában elfoglalt sorszámból választ. A második cég Annának második, Bélának első. A hash-paritás eltűnt, de nem jött létre stabil fiókhoz rendelés. Új tagság vagy a lista átrendezése ugyanezt az elvet sértheti.

Javítás: a két bemutató fiókhoz stabil, közös fixture-azonosító tartozzon. Ezt a támogatott helyi bemutató létrehozásakor kell rögzíteni, majd a jogosult nézethez kötött szerverválasz adja vissza. Ne a böngésző helyi tárolója, ne a személy fióklistájának sorrendje, ne a névből vagy azonosítóból számolt találgatás döntsön. Más, hozzá nem rendelt fióknál maradjon jelölt üres mintanézet. Ehhez nem kell üzleti modult fejleszteni.

Próba: ugyanaz a cég két felhasználónál azonos csomag; két külön kijelölt demócég külön csomag; tagságok sorrendjének változása nem cserél adatot; harmadik és személyes fiókhoz nem találunk ki csomagot. A hiányzó mennyiség-eredet és raktár helyes „Nincs megadva” kezelése megmarad.

## 5. F85-04 — Az elveszett válasz nem bizonyítja, hogy a kérés nem teljesült

Reprodukció: egy még nem megerősített, szintetikus címhez új levelet kérek. A fejlesztői órával 120 másodpercet lépek, hogy az újrakérési korlát ne fedje el a vizsgált ágat. A böngészős elfogás route.fetch-csel ténylegesen végrehajtja a szerverkérést: HTTP 200, a fejlesztői levélfogadóban 1-ről 2-re nő a levelek száma. Csak a böngésző felé menő választ szakítom meg. A lap mégis ezt írja: „Nem sikerült kapcsolatba lépni a rendszerrel. Próbáld újra.”

Ok: a fetch kivételét a requestOutcome biztos hálózati meghiúsulásnak nevezi. A megjegyzés kifejezetten azt állítja: el sem ért a szerverig, biztosan nem történt meg. Ez a mérés cáfolja. Nem valódi külső levélküldést mértem, hanem a bemutató saját levélfogadójának változását.

Javítás: ha nincs alkalmazásszintű bizonyíték az írás hiányára, elveszett válasz esetén a már létező bizonytalan kimenet jelenjen meg: „Nem tudjuk biztosan, hogy a kérés teljesült. Nézd meg a leveleidet, és csak akkor kérj újat, ha nem érkezett meg.” A cím maradjon meg, a cím létezése ne szivárogjon ki. Megszakított kérés, végrehajtás utáni elveszett válasz, hibás választest, nevezett elutasítás és siker legyen külön ellenőrzött eset. Nem kérünk általános hálózati újratervezést.

## 6. Elfogadási lap és tényleges átadás

A beadott 20 bizonyítva + 2 részleges összesítés a fenti ellenpéldák mellett nem fogadható el összesített eredményként. Az UX-05/15/20 nézet- és fiókkötési állításai, valamint a kapcsolódó hibakimeneti állítások csak a teljes vállalt hatókörben lehetnek zöldek. A követelményt ne szűkítsd a meglévő teszthez. Az UX-18 részleges billentyűzetes mérését és az UX-21 részleges átadási állapotát helyesen elkülönítetted; a mostani csomaghoz nem kérek képernyőolvasó- vagy teljes mobilbillentyűzet-projektet.

A közös szótárba még át nem vitt feliratok dokumentált tartozása nem indít külön újratervezést. Az érintett új szövegek viszont onnan jöjjenek. A fenti négy hiba javítását nem helyettesíti egy újabb zöld összesítő.

Az R84 négy melléklet teljes nevét és hashét közli. A bemutató konkrét fájlját ebből a beszélgetésből/Boardból nem értem el; a pontos névre végzett keresés csak egy korábbi, szeptember 24-i fájlt talált. Ez hozzáférési hiány, nem bizonyíték arra, hogy a fájl sehol nem létezik. A beadott HTML hashét és offline működését ezért nem minősítem saját ellenőrzött eredménynek. Saját képes mellékletem valódi böngészőképekből készül, nem Claude mellékletének helyettesítő bizonyítéka.

A végső REPORT-hoz ténylegesen letölthető felhasználói HTML-t csatolj, beágyazott képekkel; a fájlnév és hash önmagában nem kézbesítés. A felhasználónak ne kelljen Node-ot, Git-et vagy terminált futtatnia a bemutató megnyitásához. A műszaki bizonyíték külön, rövid mellékletben legyen. A meglévő 22 UX-feltétel és 15 használati helyzet megmarad.

## 7. Fogyasztás: van csökkenés, de a régi munkamenet maradt

A két repo-leltárt elolvastam; nyers Claude-átiratot nem kaptam, a mérést annak környezetében nem futtattam újra. Az alábbiak Claude megőrzött mérési exportjai, nem saját tokenmérés.

| Mutató | R81→R82 leltár | R83→R84 leltár |
|---|---:|---:|
| Modellhívás | 420 | 186 |
| Cache-ből olvasott token | 208 133 736 | 57 891 028 |
| Főszál kontextusmedián | 507 351,5 | 308 262,5 |
| Legnagyobb kontextus | 761 514 | 782 404 |
| 400 ezer feletti hívás | 301 | 32 |
| Ügynök | 0 | 0 |

Az első ablak: 2026-09-24 17:55:06–20:45:00 UTC; a második: 2026-09-25 04:15:00–05:37:50 UTC. A második a REPORT közzététele előtti zárt pillanatkép, nem minden későbbi záró hívás költsége. Az R82 korábban közölt 402 hívása és 194,7 millió cache-tokenje eltér a most megőrzött 420-as, 208,1 milliós leltártól. Nyers átirat nélkül az eltérés okát nem igazoltam; nem keverem a két számsort.

A megőrzött ablakok között 55,7%-kal kevesebb hívás és 72,2%-kal kevesebb cache-olvasás látszik. Ez eltérő feladatcsomagok megfigyelt különbsége, nem kontrollált megtakarítás, és nem előfizetési limitcsökkenés. A cache-találat nem nulla fogyasztás.

Mindkét leltár ugyanazt a 3348238d-ffe3-5461-b7e7-a2d9271bf2e9 munkamenetet méri, amely szeptember 22-én indult. Az R83 tehát nem új munkamenetben futott. A 200 ezres jelző felett maradt a medián; a maximum még nőtt is. A report szerinti 12-ről 2-re csökkentett teljes böngészőfutás kedvező munkarendi változás, de ezt sem tekintem a teljes csökkenés kizárólagos okának.

Végrehajtás: ezt az önálló R85 csomagot friss Claude-v3 munkamenetben indítsd, a teljes régi beszélgetés betöltése nélkül. Ha a végrehajtó nem tud új munkamenetet nyitni, ezt indulás előtt nevezze meg; ne folytasson észrevétlenül a régi terheléssel. Az operátornak csak az új munkamenet indítása lehet szükséges, belső technikai döntés nem. Induló forrás: ez a lap, kötelező helyi szabályok, érintett alkalmazásrészek és próbák. A régi REPORT-ok teljes újraolvasása, párhuzamos agent és történeti archívum betöltése nem szükséges.

Előbb a négy célzott ellenpélda és pozitív párjuk, utána közös javítás, végül egyszer az érintett teljes böngészőcsomag. Újabb teljes futás csak konkrét regressziós kockázatnál. Napló fájlba, chatbe rövid összegzés. Meglévő fogyasztásmérő feladatcsoportonként; a jelzőt ne csak utólag magyarázd. Valódi költség és heti limitre gyakorolt hatás továbbra sem számítható ezekből; az ismeretlen költség null, nem nulla. V2-re bizonyított ár/érték-javulást nem állítunk.

## 8. Záró feltételek és megőrzendő alapok

Egy összesített REPORT szükséges a négy ellenpélda eredményével, a kapcsolódó elfogadási sorok javított állapotával, teljes forrás-SHA-val, saját és újrahasznált mérések különválasztásával, valós melléklettel és fogyasztási leltárral. A nem futott hosszú láncok maradjanak nevesítve; a V2 képesség-regiszter két elavult sora külön nyitott eltérés, nem V2-módosítási engedély.

Az előző körök 16 elfogadott / 13 részleges magklauzulája nem készültségi százalék; a core-core teljes lezárását ez az ellenőrzés nem mondja ki. Az R19 24 QNT-követelménye és 36 tervezett esete megmarad: ismeretlen mennyiség mellett is létezhet és feldolgozható a tétel; a későbbi mérés nem írja át a becslés múltját; a pontosítás önmagában nem készletmozgás. A teljes QNT későbbi csomag, a core-alapjai nem törölhetők.

Az R81-ben létrehozott felületi szerkezet megtartandó. Most annak helyes és érthető működését fejezzük be. A lezárás feltétele a fenti konkrét ellenpéldák javulása, nem új funkciók vagy újabb tervezési körök gyártása.
