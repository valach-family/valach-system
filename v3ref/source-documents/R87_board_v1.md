# R87 — Az R85 négy javításának elfogadása az R86 független ellenőrzése után

CMD-VS-300-002-002 R87 — ANALYSIS
PR-VS-300 · STEP-VS-300-002 · 2026-09-25
Repó: valach-family/valach-system · ág: claude/affectionate-dijkstra-76w5e8

## Döntés, közérthetően

Az R85-ben kért négy javítást a vizsgált szintetikus bemutató hatókörében elfogadom. A korábban általam reprodukált négy hibát ugyanazon eseménysorokkal újra ellenőriztem: most helyesen működnek. Ez a javítócsomag lezárható; nem adok újabb kódolási feladatot ugyanarra.

Ez ellenőrzési és elfogadási dokumentum, nem új végrehajtási parancs. Az R85 feladatait új munkamenetben sem kell újra elvégezni. A már elkészült javításokat meg kell őrizni.

A felületi keret és az ellenőrzött alapfolyamat rendelkezésre áll: személyes fiók, vállalkozás hozzáadása, fiókváltás, meghívás, tagság és adat-hozzáférés kezelése. A mintakészlet továbbra is szintetikus; ez nem kész üzleti készletmodul. A következő munka kiindulópontja ez az állapot. A felhasználónak most a látható felületet kell megmutatni; belső jogosultsági megoldásokról nem kell újra döntenie.

## Forráskötés

Az R86 teljes aktuális REPORT-ját find_document-tal elolvastam, a körüzenetet és az aktív parancsot ellenőriztem. Az aktív parancs R85 volt; R87 még nem szerepelt. R86 üzenetazonosító: ee3c4782-aadc-4863-8a12-048986bb8f4f.

A jelentés mérési forrása: 165cdc27f0bd040b9010dc0e082353775e0a4f14. Ellenőrzött ágfej: 66137eec1d0c68ea915b9f9c227bcdcf172eca00. A GitHub-összehasonlítás szerint e kettő között csak a fogyasztási leltár és a REPORT került be; az alkalmazáskód azonos.

A korábbi ellenőrzött f968c0472c80672e0b240b8001dd86835d873f6b állapothoz képest mind a 19 változott fájlt letöltöttem és Git-blob SHA-val, pontos bájtegyezéssel ellenőriztem. A változatlan forrás az előző ellenőrző másolatból származik. Ez rekonstruált helyi ellenőrző másolat, nem tiszta git-klón. A mag végrehajtható kódja változatlan; a v3ref/source-documents könyvtárban új R85 forrásdokumentum van, ezért a REPORT „v3ref egyetlen fájlja sem változott” mondata csak a magkódra szűkítve pontos.

Saját környezet: Node v24.19.0, Playwright 1.56.0, helyi Chromium, külön SQLite-tárolók. A böngésző indítási helye és a riportoló a helyi környezethez igazított; alkalmazáskódot nem javítottam. A generált UX-bizonyítékot elkülönítettem a beadott változattól.

## Saját futás és saját ellenpéldák

| Ellenőrzés | Saját eredmény |
|---|---|
| R85 + R83 + R81 UX böngészőfájlok együtt | 18/18 sikeres |
| HTTP selfcheck | 57/57 sikeres |
| R79 célzott HTTP-battéria | 49/49 sikeres |
| Magpróbák | 62/62 sikeres |
| Saját, külön megírt böngészős ellenőrzés | Hat eset eredménye rögzítve; a négy korábbi ellenpélda javult |

**F85-01 — elfogadva.** Anna megkezdett vállalkozásűrlapja közben ugyanazon böngésző sütijével Bélára jelentkeztem be. A régi űrlap beküldése HTTP 409, reason=context_mismatch, wrote=false eredményt adott. A vizsgált book, membership, scope_grant, authority_basis és app_demo_fixture táblák tartalma változatlan maradt, a szerkesztő eltűnt. Frissen megnyitott űrlap az aktuális személy alatt HTTP 201-gyel működött. A beadott, nálam is sikeres R85 próba két valódi böngészőlapon is végigjárta a helyzetet, és az eredeti személy új belépésének pozitív párját is mérte. A kódban a személy összevetése a szerveren, az írás előtt áll.

**F85-02 — elfogadva.** Az Első Műhely várakozó meghívásának megnyitása után a Második Műhelyre váltottam, és annak új listaválaszát visszatartottam. A második cég alatt az első címzett nem jelent meg; helyette „Meghívások betöltése…” látszott. A közös resetViewCaches a saját váltásból és a külső nézetváltozásból is meghívódik. A beadott késleltetéses próba és helyes új listára vonatkozó pozitív pár nálam is sikeres.

**F85-03 — elfogadva.** Annának két saját cége van, Béla csak a másodikhoz csatlakozott. Ugyanabban a Második Műhelyben most mindketten ugyanazt a Szenzormodul-sort és ugyanazt a teljes készlettáblát látták. Béla további saját cégeinek létrehozása nem változtatta meg a közös cég mintacsomagját. A harmadik, hozzá nem rendelt cégnél és a személyes fióknál a fixture null. A két kijelölt demócég eltérő csomagját a beadott R85 próba is ellenőrizte. A hozzárendelés immár tárolt fióktulajdonság, nem a néző aktuális listájából számolt érték.

**F85-04 — elfogadva a kért levél-újrakérési útban.** A szerver ténylegesen feldolgozta a kérést, HTTP 200-at adott és a fejlesztői levélfogadóban 1-ről 2-re nőtt a levelek száma; csak a böngésző válaszát szakítottam meg. Most a „Nem tudjuk biztosan, hogy a kérés teljesült. Nézd meg a leveleidet…” szöveg jelent meg. A cím megmaradt. A beadott tesztekben a megszakítás, hibás választest, siker és a mesterségesen beadott elutasító válasz ágai is sikeresek voltak. Az utóbbi klienság-próba, nem a semleges végpont valós elutasításának bizonyítéka. Valódi külső levél nem ment ki.

Az új meghíváslista szerverhatárát is ellenőriztem: jogos kezelő 200; idegen expected_book_id 409; egyszerű tag 403; nyers meghívótoken nincs a listában. Névtelen néző nem kap cégnevet, a bizonyított címzett a megfelelő cégnevet és szerepet kapja.

## Az elfogadás határa

Claude teljes 53/53 böngészőfutása, R75 73/73, R77 34/34, KUKA 392/392 és dokumentumkapui az ő beadott mérései. Ezek teljes sorozatát nem futtattam újra. A fenti táblázat külön mutatja a saját mérést. A teljes söprés, hosszú mutációs és külső láncok nem futottak; nem minősítem őket zöldnek.

Elolvastam a módosult UX-05/15/20 bizonyítékait, valamint az UX-18/21 részlegességét. A négy javítás ellenőrzése megszünteti az előző kör konkrét kifogásait. Ez nem jelenti a teljes 22 pontos UX vagy minden lehetséges versenyhelyzet feltétel nélküli elfogadását. A 20 bizonyítva + 2 részleges Claude tesztleltárának bontása, nem készültségi százalék. A billentyűzetes hozzáférés nem vizsgált alesetei és az eredeti melléklet hozzáférési hiánya továbbra is nevesítve maradnak.

Az új olvasási hibaüzenet „a készletadatokat nem kérdeztük le” megfogalmazása technikailag tágabb a bizonyíthatónál: a válasz elveszhetett akkor is, ha az olvasás lefutott. Pontosabb szöveg: „A készletadatokat nem sikerült betölteni.” Ez szövegpontosítás a következő, egyébként is érintett felületi csomagban; önmagában nem indít új javítókört, és nem nyitja újra az írás bizonytalan kimenetének most elfogadott javítását.

## Képes átadás

Az R86 négy konkrét HTML-fájlt és SHA-256 lenyomatot nevez meg. A jelentés szerint Claude csatolta őket, de ebben a beszélgetésben nem kaptam meg őket; a két pontos bemutatófájlnévre végzett keresés csak a korábbi, szeptember 24-i fájlt találta. Emiatt az eredeti csatolmány hashét és önhordóságát nem tudtam saját méréssel igazolni. Ez hozzáférési hiány, nem állítás a fájl nemlétéről.

Az ellenőrzéshez saját, beágyazott képeket tartalmazó HTML-t adok át. Valódi képernyőképek az ellenőrzött forrásból, szintetikus adatokkal. Ez képes ellenőrzési bemutató, nem kattintható üzleti alkalmazás és nem Claude eredeti mellékletének hitelesítése. Nem indítunk újabb kódolási kört csak a hiányzó csatolmány miatt.

## Fogyasztás: kevesebb hívás, de nagyobb teher hívásonként

A repo két megőrzött leltárának adatai; nyers Claude-átiratot nem kaptam, a tokenmérést én nem futtattam újra:

| Mutató | R83→R84 | R85→R86 |
|---|---:|---:|
| Modellhívás | 186 | 82 |
| Cache-olvasás | 57 891 028 | 42 626 376 |
| Átlagos cache-olvasás hívásonként | 311 242 | 519 834 |
| Főszál kontextusmedián | 308 262,5 | 524 763 |
| 400 ezer feletti hívás | 32 | 82, az összes |
| Ügynök | 0 | 0 |

Az új leltár ablaka 2026-09-25 07:29:39–08:46:41 UTC (Budapesten 09:29:39–10:46:41). A teljes cache-olvasás 26,4%-kal kisebb, de hívásonként átlagosan 67%-kal több. Ez két eltérő feladatcsomag megfigyelt összevetése, nem kontrollált megtakarítás és nem heti limit- vagy pénzösszeg.

Mindkét leltár ugyanazt a szeptember 22-én indult 3348238d-ffe3-5461-b7e7-a2d9271bf2e9 munkamenetet jelöli. Új munkamenet nem indult. A report ezt már kimondja. Az induló 465 019-es medián és az előzetes jelzés időpontja dokumentumállítás: külön induló pillanatkép vagy időbélyeges üzenet nélkül ezt nem nevezem saját igazolásnak. A záró leltár az 524 763-as mediánt rögzíti. A régi munkamenet nagy terhe látszik; az egyes kontextusforrások pontos részesedését ez az export nem bontja fel.

A teljes böngészőcsomag egyszeri futását Claude közli; ez kedvező változás a korábbi ismétlésekhez képest. Mégis minden új hívás nagy előzményt cipelt. A következő fejlesztési csomag friss Claude-v3 munkamenetben induljon, csak az aktuális rövid feladattal, kötelező szabályokkal és szükséges forrásokkal. Az R85/R86 munkáját emiatt megismételni tilos: már elkészült és most ellenőrizve lett. A valódi költség továbbra is ismeretlen, null és nem nulla; V2-re bizonyított ár/érték-javulást nem állítunk.

## Következő lépés és megőrzött határok

A négyhiba-csomag lezárult. Most nincs új Claude-v3 végrehajtási feladat. A következő fejlesztést ebből az elfogadott állapotból, a használható felület és a későbbi üzleti folyamat felé kell kijelölni; a belső tervezés felelőse továbbra is chatgpt-v3. A felhasználónak a megnyitható bemutatót és a használati folyamatot kell látnia, nem a belső jogosultsági részletekről döntenie.

A core-core teljes lezárását nem mondom ki. A 16 elfogadott / 13 részleges magklauzula nem készültségi százalék. Az R19 24 QNT-követelménye és 36 tervezett esete megmarad: ismeretlen mennyiségű tétel létezhet és feldolgozható; a későbbi mérés nem írja át a becslés múltját; a pontosítás nem készletmozgás. A teljes QNT későbbi csomag, core-alapjai nem törölhetők.

A V2 képesség-regiszter két elavult sora külön nyitott eltérés. Ez az elfogadás nem merge-, telepítési-, V2-módosítási vagy új üzleti modulra szóló engedély, és nem zárja le a teljes CMD-t vagy PR-t.
