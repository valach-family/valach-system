# V3 — egységes, érthető felület

**Tervező: chatgpt-v3 · 2026. szeptember 24. · R81 terv és végrehajtási irány**

CMD-VS-300-002-002 R81 — PLAN · PR-VS-300 · STEP-VS-300-002

Címzett: Claude-v3. Végrehajtási repó: valach-family/valach-system. Szülő: R80 REPORT, 18f5e136-7bb3-4ee1-a1a3-74a3b93018bb.

Ez a terv a feltöltött, 15 képernyős bemutató teljes vizuális és szöveges átvizsgálatán alapul. A jelenlegi felület felhasználói átadásra nem megfelelő. A működési próbák eredménye önmagában nem bizonyítja, hogy egy ember érti és használni tudja a rendszert.

**Döntés:** a számozott, mindent egymás alá helyező próbafelületet egy közös alkalmazáskeret váltja fel. Felül fiókválasztó és személyes profil, baloldalt a V2-ből ismerős menü, középen az éppen végzett feladat. A technikai részletek kikerülnek a napi munkából. A jogosultsági szabályok megmaradnak.

## 1. Mit néztem meg, és mire terjed ki ez a döntés?

- Mind a 15 beágyazott képet megnyitottam, a kísérőszövegeket és az indítási útmutatót elolvastam.
- A bemutató megjelölt forrása: `valach-family/valach-system`, `2e60f52e7ec96a93748c7ae3051ac665fce31921`. A hozzá tartozó `v3app/public/index.html` és `app.js` szövegeit is ellenőriztem.
- Elolvastam az **R80 REPORT** teljes Board-dokumentumát. Ez jelenti az R79 javításainak befejezését. A benne szereplő teszteredmények ebben a UX-vizsgálatban Claude mérései; az R80 műszaki elfogadását ez a terv nem helyettesíti.
- A most feloldott V3 ágfej: `c8c8b2571746bdd37a7bfb866146a85e6ecf8d45`, ág: `claude/affectionate-dijkstra-76w5e8`.
- V2 referencia, csak olvasva: `valach-family/vs` → `public/index.html`, `public/styles.css`, `public/js/workspace.mjs`, `public/js/tenant-switcher.mjs`, valamint a `config/registries/ui_surfaces.json` és `i18n.json` menüadatai. A V2 élő felületét itt nem jártam végig; az egyezések forráskód alapján ellenőrzöttek.

**Ami most készülhet:** alkalmazáskeret, navigáció, a már működő belépési és hozzáférési folyamatok új felülete, egységes szövegezés, szintetikus adatokkal kitöltött V2-jellegű mintanézetek. **Nem része:** valódi számlázó, készletmotor, új előfizetési üzletpolitika, képviselet-igazolás, V2-módosítás vagy telepítés. A minta üzleti képernyői egyértelműen bemutatóként jelennek meg.

## 2. Miért átláthatatlan a jelenlegi változat?

| Probléma | Megfigyelés | Tervezési döntés |
|---|---|---|
| Nincs feladathierarchia | Belépés, regisztráció, meghívás, új cég és készlet ugyanazon az oldalon | Egy nézet egy fő feladat; külön belépési oldalak és belső alkalmazás |
| Bejelentkezés után is belépési űrlap látszik | Az 5–15. képen újra és újra ott a regisztráció | Sikeres belépés után az űrlap eltűnik; kijelentkezés a profilmenüben |
| A fejléc olvashatatlan | E-mail, azonosító, szerep, csomag és eljárási mondat ismétlődik | Baloldalt az aktív fiók neve; jobboldalt a belépett személy. A többi a megfelelő beállításnál |
| A váltás lent van elrejtve | A felhasználó görgetéssel találja meg a „Váltó” blokkot | Állandó, lenyitható fiókválasztó a fejlécben |
| A képernyő belső működésről beszél | „csatorna”, „plafon”, „könyv”, „kapu”, „hatályos” | Felhasználói fogalmak: e-mail-cím, meghívás, megtekintés, hozzáférés, előfizetés |
| Fejlesztői adatok uralják az oldalt | JSON, token, `sub_…`, `ws_…`, ISO-idő, angol hibakód | Kizárólag lenyitható technikai részletekben; token és jelszó ott sem |
| A fő művelet nem derül ki | Több azonos kék gomb, külön magyarázat nélkül | Egy fő gomb egy munkaterületen; másodlagos és veszélyes műveletek eltérő súllyal |
| A „megvonás” tárgya ismeretlen | Készletjog választója mellett teljes tagságot szüntet meg | Pontos megnevezés: „Céges hozzáférés megszüntetése”; külön megerősítés |
| A siker nem jelent használható adatot | `KIADVA { qty: "12" }` | Emberi táblázat, mértékegység és adatállapot; a hiány nem nulla |
| A tájékoztatás túl hosszú és védekező | Nagybetűs tiltások, ismételt műszaki magyarázat | Rövid fő szöveg; részletek csak ott, ahol döntést segítenek |
| A személyes használat is céges adminfelület | Egy magánfelhasználó rögtön meghívót és csomagváltást lát | Személyes kezdőlap; céges adminisztráció csak céges fiókban és megfelelő jogosultsággal |
| A bemutató is tesztnaplónak hat | Minden kép alatt KUKA- és tesztazonosítók | Felhasználói bemutató és műszaki bizonyíték külön részben |

## 3. A közös alkalmazáskeret

### 3.1. Mi hol legyen?

| Hely | Tartalom | Viselkedés |
|---|---|---|
| Felső fejléc bal széle | VS márkajel | Visszavisz az aktív fiók áttekintésére |
| Fejléc bal/középső része | **Fiók: Családi Műhely Kft. ▾** | Lenyitható fiókválasztó, minden belső oldalon ugyanott |
| Fejléc jobb széle | **Anna ▾**, név hiányában az e-mail-cím | Saját profil, belépés és biztonság, nyelv, kijelentkezés |
| Fejléc alatt | Nyitott munkalapok | A V2-ből ismerős működés: megnyitás vagy a meglévő lapra váltás; nincs azonos lapból másolat |
| Baloldalt | Napi munka és beállítások | Állandó csoportok, egyértelmű aktív menüpont |
| Tartalom teteje | Oldalcím + legfeljebb egy mondat + fő művelet | Például „Felhasználók” és „Felhasználó meghívása” |
| Tartalom | Lista, adatlap vagy űrlap | Egy közös táblázat-, űrlap- és állapotkomponens |
| Jobb oldali panel | Sorhoz tartozó részletek/szerkesztés | Például Béla hozzáférése; 480–560 px, mobilon teljes képernyő |
| Kis, állandó jelölés | **Bemutató · mintaadatok** | A mintában minden oldalon látszik; nincs oldalanként hosszú figyelmeztetés |

A fejléc nem rejtheti el az aktív céget egy avatar mögé. A személy neve és a kiválasztott fiók külön információ: ugyanaz az ember több céges fiókot is használhat.

### 3.2. Fiókválasztó: a kezelt fiókok egy helyen

**Felirat:** `Fiók`. Az aktuális érték a név: `Személyes fiók`, `Családi Műhely Kft.`, `Delta Group`.

A lenyíló lista csoportjai:

- **Személyes:** Személyes fiók — Saját vásárlások és adatok.
- **Vállalkozások és közös fiókok:** elérhető fiókok neve; második sorban a saját szerep, szükség esetén ország és megkülönböztető azonosító.
- Alul: **Új fiók hozzáadása**. Ezen belül „Vállalkozás” és „Közös fiók”. A személyes fiókot nem kell újra létrehozni.

Nyolcnál több választásnál kereső: **Fiók keresése…**. A keresés csak a szerver által visszaadott, hozzáférhető fiókok között dolgozik. Azonos nevű cégeknél az ország és a hozzáférhető adószám/rövid azonosító segít; a teljes belső adatbázis-azonosító nem alapfelirat.

**Váltási szabály:** először a szerver erősíti meg a váltást, azután jelenik meg az új fiók neve és tartalma. Betöltés közben a korábbi fiók védett adatai nem maradnak az új fejléc alatt. A munkalapok és a nem mentett űrlapok az adott személyhez és fiókhoz tartoznak. Saját kezdeményezésű váltás előtt a nem mentett változtatásról kérdezünk. Másik fülön történt váltásnál a régi űrlap nem küldhető be; az új kontextusban nem használjuk fel automatikusan a tartalmát.

### 3.3. Saját profil

A jobb felső profilmenüben:

1. Belépett személy neve és e-mail-címe.
2. **Saját profil** — saját adatok. Csak ténylegesen támogatott mező szerkeszthető.
3. **Belépés és biztonság** — csak létező műveletekkel. Jelszó-visszaállítást nem szabad működőnek mutatni, ha nincs mögötte út.
4. **Nyelv** — a mostani csomag teljes magyar felülete kötelező. Más nyelv csak tényleges fordítással választható.
5. **Kijelentkezés**.

Az „Új vállalkozás” nem új személyes regisztráció. Az e-mail-cím, belépés és a meglévő céges kapcsolatok megmaradnak. Az első név megjelenítéséhez a meglévő e-mailből nem következtetünk automatikusan személynévre; a mintában a név szintetikus adat.

### 3.4. V2-höz kapcsolódó menü

| Csoport | Most megjelenő elemek | Átvétel határa |
|---|---|---|
| Kezdőlap | Áttekintés | Új, egyszerű belépési pont |
| Műveletek | Folyamatok; Bizonylatok; Kimenő e-mailek; Riportok → Készletegyenleg, Készletmozgások, Termékkarton | A nevek és csoportosítás a V2-ből származnak; most mintaoldalak |
| Törzsadatok | Termékek; Partnerek; Raktárak | Valós V2 menünevek; szintetikus listaadatok |
| Beállítások | Fiók adatai; Felhasználók; Előfizetés | A V3 core valódi működéséhez kötött felületek |
| Személyes fiókban | Áttekintés; Ügyleteim; Saját adatok | Az „Ügyleteim” V2 elnevezés; céges kezelőmenü nélkül |

Nem másoljuk át a V2 teljes menüjét üres pontokkal. A szkennelés, EPR, címkenyomtatás, árnyéktermék és egyéb iparági részletek most nem szükségesek a felület érthetőségéhez. A közös menümodell később bővíthető. Vmarket, Vshop és eGN nincs kész funkcióként feltüntetve.

A V2 bal menüjének csak egérrel nyitható almenüjét nem örökítjük tovább: a csoportok kattintással és billentyűzettel is nyithatók. A V2 szabad szöveges parancssora helyén legfeljebb **Menüpont keresése** lehet, valós menükereséssel; AI-végrehajtást nem imitálunk.

## 4. Egységes vizuális és viselkedési szabályok

- A V2 meglévő színei és rendszerbetűi legyenek az alapok: világos háttér `#f6f7f9`, fehér felületek, szöveg `#1c2330`, kiemelés `#2d5bd7`, keret `#d4d7dd`. Egy helyen kezelt színek, térközök és komponensek.
- Normál szöveg 15–16 px, kiegészítő szöveg legalább 13 px. Rövid bekezdések; a nyelvi érthetőséget nem kisebb betűvel oldjuk meg.
- Asztalon 224 px menü, körülbelül 64 px fejléc; 24 px tartalomköz. A táblázatok kihasználják a rendelkezésre álló szélességet; az űrlap olvasható szélessége 600–720 px.
- Egy munkaterületen egy fő gomb. Fő: kitöltött kék; másodlagos: keretes; veszélyes: piros a megerősítésnél. „Mentés” és „Mégse” minden szerkesztőben ugyanott.
- Kötelező mező jelölése egységes. A mező neve mindig látszik, nem csak helyőrzőként. Hiba a mező alatt; az első hibás mező fókuszt kap. Más mezők tartalma megmarad.
- Egyértelmű állapotok: **Betöltés…**, **Még nincs adat**, **Nincs találat**, **Nincs hozzáférés**, **Nem sikerült betölteni**. A `—` önmagában nem magyarázat.
- A zöld siker rövid és helyhez kötött; az akadály nem csak pillanatra felvillanó értesítés. A hiba javításig vagy bezárásig olvasható marad. Ugyanazt a sikert nem írjuk ki egyszerre három helyen.
- A védelem miatti megszakításnál csak szerver által bizonyított esetben szerepelhet „nem mentettük”. Hálózati időtúllépésnél: **„Nem tudjuk biztosan, hogy a mentés befejeződött. Ellenőrizd az állapotot, mielőtt újra próbálod.”**
- 390 px-es telefonon a menü nyitható oldalsó panelbe kerül; a fiókválasztó és a profil továbbra is elérhető. A név tördelhető, az űrlap egyoszlopos. Az egész oldalnak nincs vízszintes görgetése; széles táblázat saját görgetőt vagy kártyanézetet kap.
- Látható billentyűzetfókusz, valódi gombok, címkézett mezők, Esc-pel zárható felugró panelek, fókusz visszaadása a nyitó gombra. Az állapotot szöveg is jelzi, nem csak szín. Mobil érintési cél legalább 44×44 px.
- A képek közepén feltűnő sötét fejlécet a teljes oldalas képkészítés is okozhatja; ezt nem nevezem bizonyított élő elrendezési hibának. Az új bemutató normál képernyőméretű képeket ad, átfedés nélkül.

## 5. Mind a 15 képernyő javítása

### 01 — Anna regisztrál

**Most:** két teljes űrlap, újraküldés, technikai státusz és levélnapló együtt. A felhasználó már az első oldalon választásokat és magyarázatokat kap egyetlen feladat helyett.

**Helyette:** önálló belépési kártya. Regisztráció és bejelentkezés külön nézet; köztük egyszerű hivatkozás. Regisztrációnál e-mail-cím, jelszó, jelszó megjelenítése. Céges adatok itt nem kellenek.

| Elem | Végleges szöveg |
|---|---|
| Cím | Fiók létrehozása |
| Magyarázat | Egy fiókkal a saját és a vállalkozásaid ügyeit is kezelheted. |
| Mezők | E-mail-cím; Jelszó |
| Jelszósegédlet | Legalább 8 karakter. |
| Fő gomb | Fiók létrehozása |
| Másodlagos út | Már van fiókod? Bejelentkezés |
| Semleges válasz | Nézd meg a leveleidet. Ha ezzel a címmel folytatható a regisztráció, elküldjük a következő lépést. |

A semleges válasz nem árulhatja el, hogy másnak van-e fiókja a megadott címen. „Ezt a címet már használják” nem kerülhet a nyilvános válaszba. A belépés, újraküldés és jelszó-visszaállítás külön út; az utóbbi csak létező funkcióként.

### 02 — Lejárt megerősítő link

**Most:** „Nem sikerült”, angol hibakód, szöveges magyarázat és két egyforma hivatkozás.

**Helyette:** ugyanaz a kártya, mint a regisztrációnál. Cím: **„Ez a megerősítő link lejárt”**. Szöveg: **„Kérj új levelet az e-mail-címed megerősítéséhez.”** Fő gomb: **„Új levél kérése”**. Másodlagos: **„Bejelentkezés”**. A `challenge_expired` csak technikai részlet. Nem kérünk új regisztrációt.

### 03 — Új megerősítő levél kérése

**Most:** ugyanazon a hosszú oldalon kell megkeresni a harmadik e-mail-mezőt; közben a lejárati hiba változatlanul piros.

**Helyette:** egy mező, egy gomb. Cím: **„Új megerősítő levél”**. Segédlet: **„Add meg a regisztrációnál használt e-mail-címedet.”** Gomb: **„Levél kérése”**. Válasz: **„Ha ehhez a címhez megerősítésre váró fiók tartozik, új levelet küldünk. Nézd meg a levélszemét mappát is.”** Kiegészítés csak ezen az oldalon: **„A legutóbbi levél linkjét használd.”**

A visszaszámlálás szerveridőből jön. Például „Új levél 43 másodperc múlva kérhető”, nem fixen kiírt 60 másodperc. Sikeres kérés után a régi hiba nem marad fő állapotként.

### 04 — E-mail-cím megerősítve

**Most:** „bizonyítva”, „személyes kör”, technikai létrehozási eredmény.

**Helyette:** cím **„Megerősítetted az e-mail-címedet”**; szöveg **„Most már bejelentkezhetsz.”**; fő gomb **„Bejelentkezés”**. Nincs szükség a háttérben létrejött személyes munkatér magyarázatára. A megerősítés nem jelent automatikus belépést. Meghívóból érkezve a biztonságosan megőrzött meghívási folyamat folytatódjon.

### 05 — Első belépés, személyes fiók

**Most:** minden céges/adminisztrációs űrlap egyszerre látszik; ugyanannak a személynek a neve és szerepe többször ismétlődik.

**Helyette:** rendes alkalmazáskeret. Fiókválasztó: **„Személyes fiók”**. Cím: **„Áttekintés”**. Első használatkor: **„Itt találod a saját ügyeidet. Vállalkozást később is hozzáadhatsz.”** Ha van beérkezett meghívó, annak önálló kártya: **„Meghívtak a Családi Műhely Kft. fiókjába”** → **„Meghívó megnyitása”**. Az „Új fiók hozzáadása” a váltóban is elérhető.

Személyes használatkor nincs adminszerep-felirat, céges taglista és előfizetés-váltó a kezdőlapon. Az Ügyleteim üres állapota: **„Még nincs megjeleníthető ügyleted.”** Bemutatóadatot külön jelölünk.

### 06 — Vállalkozás hozzáadása

**Most:** „vállalkozási minőség”, „joghatóság”, csomagválasztás, hosszú képviseleti magyarázat. Egy egyedül dolgozó vállalkozó számára a „közös családi/céges” kezdet félrevezető.

**Helyette:** a váltóból induló rövid űrlap: **„Vállalkozás hozzáadása”**. Mezők: **„Vállalkozás neve”**, **„Nyilvántartás országa vagy területe”**, **„Adóazonosító”**. Országfüggő címke: Magyarországon „Adószám”. Az ország neve jelenik meg, nem pusztán HU/AT/DE. Nem korlátozzuk öt országra; az ország/terület értékét a háttérnek egyértelműen meg kell őriznie, nem olvadhat minden ismeretlen ország egyetlen „egyéb” azonosítóvá.

Rövid tájékoztatás a mezők alatt: **„A megadott cégadatokat most nem ellenőrizzük hatósági nyilvántartásban.”** Részletekben: **„Egy meglévő céges fiókhoz meghívóval csatlakozhatsz. Az adószám megadása önmagában nem ad hozzáférést más fiókjához.”**

Gombok: **„Vállalkozás hozzáadása”**, **„Mégse”**. Siker: **„Hozzáadtad a vállalkozást.”** Következő lehetőség: **„Felhasználó meghívása”**, mellette **„Tovább az áttekintésre”**. A meghívás egyedül dolgozóknál kihagyható.

A személyes fiók nem alakul át és nem vész el. A mintában a csomagválasztás átkerül az Előfizetés oldalra; a tényleges létrehozásnál a szerver által támogatott alapcsomag használható. Ebből nem következik ingyenes vagy fizetős kereskedelmi ajánlat. Céges azonosítóütközésnél ne mutassunk idegen tulajdonost vagy e-mail-címet; használjuk a meglévő ütközési és képviseleti szabályt, új jogot nem adunk.

### 07 — Anna meghívja Bélát

**Most:** angol szerep, ékezet nélküli adatkör, „plafon”, token és ISO-lejárat.

**Helyette:** Beállítások → Felhasználók → **„Felhasználó meghívása”**. A panel tetején mindig ott az érintett fiók neve. Mezők: **„E-mail-cím”**, **„Szerepkör”**. Szerepek: `user` → **„Tag”**; `admin` → **„Fiókkezelő”**. A fiókkezelő megnevezés nem jelent korlátlan jogot: csak a szerver által megengedett műveletek jelennek meg.

A mostani mag elkülöníti a meghívási korlátot a tényleges olvasójogtól. Ezt nem rejthetjük el egy hamis „hozzáférés megadva” felirat mögé. A mező neve: **„Később engedélyezhető adatok”**; értékei **„Készletadatok”**, **„Árak”**. Alatta egyetlen mondat: **„A meghívó elfogadása után külön engedélyezheted az adatok megtekintését.”**

Fő gomb: **„Meghívó létrehozása”**. A jelenlegi, tényleges levelet nem küldő próbában siker: **„A meghívó elkészült. A próbaüzenetek között megnyithatod.”** Éles kézbesítő nélkül nem írható „Elküldtük”. Lejárat: **„Érvényes: október 1. 19:35-ig”**, az aktuális időzónában; részletekben időzónával. A taglista mellett külön **„Meghívások”** fül mutatja a várakozó meghívókat, ha az állapot a háttérből lekérdezhető.

### 08 — Béla megnyitja a meghívót

**Most:** a meghívó lényegi része a hosszú oldal alján van, JSON-ban.

**Helyette:** központi meghívókártya. **„Meghívás a Családi Műhely Kft. fiókjába”**. **„Anna meghívott, hogy csatlakozz a vállalkozás fiókjához.”** A meghívó és meghívó személyének nevét csak akkor írjuk ki, ha a szerver az adott látogatónak ezeket jogosan kiadja. Egyébként: **„Meghívást kaptál egy fiókhoz. A folytatáshoz jelentkezz be a meghívott e-mail-címmel.”**

Helyes fiókkal: **„Meghívás elfogadása”**. Kijelentkezve: **„Bejelentkezés és folytatás”**, mellette **„Fiók létrehozása”**. Másik fiókkal: **„Most másik e-mail-címmel vagy bejelentkezve.”** → **„Másik fiókkal jelentkezem be”**. A cím csak a szerver által engedett maszkolással látszik; nem közöljük, hogy létezik-e hozzá másik regisztráció.

Lejárt/visszavont/hibás meghívó a megfelelő állapotot mondja, és a belépéshez ad visszautat. „Új meghívó kérése” gomb csak valós kérési funkcióval; különben **„Kérj új meghívót attól, aki meghívott.”**

### 09 — A meghívás elfogadva, adatjog még nincs

**Most:** a technikai siker mellett fekete panelen angol elutasítás. A felhasználó nem tudja, sikerült-e csatlakoznia.

**Helyette:** a céges áttekintésen **„Csatlakoztál a Családi Műhely Kft. fiókjához.”** A készlet helyén egységes állapotkártya: **„A készletadatokhoz még nincs hozzáférésed”**. **„A fiókkezelő tudja engedélyezni a megtekintésüket.”** Gomb **„Frissítés”**. Ha a kapcsolattartó neve/e-mailje jogosan elérhető, megjeleníthető; nem találunk ki ügyintézőt.

Az engedélyre váró állapot nem rendszerhiba és nem piros hibakód. Az „Üzenet küldése”/„Hozzáférés kérése” csak akkor aktív, ha valóban rögzül vagy kézbesül a kérés. A mostani csomag ehhez nem talál ki külön jóváhagyási motort.

### 10 — Anna engedélyezi a készlet megtekintését

**Most:** hosszú sorok belső azonosítókkal, „van/nincs”, legördülő és „adatkör adása”.

**Helyette:** táblázat: **Felhasználó | Szerepkör | Készletadatok | Árak | Állapot | Műveletek**. Az e-mail második sorban; név hiányában az e-mail a fő név. Állapotok: **Aktív**, **Meghívásra vár**, **Megszüntetve**. Adatjog: **Megtekintheti**, **Nincs engedélyezve**. A csomag miatti korlát külön mondat, nem a jog hamis hiánya.

Béla sorára kattintva panel: **„Béla hozzáférése”**. A változtatás pontos gombja: **„Készlet megtekintésének engedélyezése”**. Siker: **„Béla mostantól megtekintheti a készletadatokat.”** Árjog külön művelet marad. Már engedélyezett jog mellett nem ismételjük meg értelmetlenül az engedélyező gombot.

Fontos: a meglévő API a teljes tagság megszüntetését tudja. Ezt nem álcázzuk egy adatkör kikapcsolásának. Ha egyedi olvasójog-megvonás még nincs, nem rajzolunk működőnek tűnő kétállású kapcsolót. A két fogalom a tervben és a felületen is külön marad.

### 11 — Béla látja a készletet

**Most:** `KIADVA` és JSON. A `12` mellett nincs termék, egység vagy értelmezés.

**Helyette:** Riportok → **„Készletegyenleg”**. Táblázat: **Termék | Raktár | Mennyiség | Egység | Mennyiség jellege**. A mintafelületre 4–6 szintetikus tétel kerül különféle ágazatokból; egy sor mennyisége szándékosan ismeretlen. **„Nem ismert”** nem lehet 0; becslés mellett **„Becsült”** jelölés van.

Az ár külön jogosultságú oszlop/nézet. Rejtett árjog mellett az árérték nem kerülhet a kliensbe, a táblázat nem írhat 0 Ft-ot. Ismeretlen árnál **„Nincs megadva”**, valódi nullás értéknél **„0 Ft”**. A pénznem adatból jön; nem minden ország forintot használ.

A jelenlegi `qty: "12"` API-válaszhoz nem szabad tényszerűen odakitalálni a „db” egységet. Vagy a szintetikus adatcsomag deklarált megjelenítési metaadata adja, vagy **„Egység nincs megadva”** szerepel. A teljes termék-/raktárlista most bemutató, nem kész készletmodul. Az alkalmazásban a mintaadat megjelenése is a valódi core adatjogától és előfizetésétől függjön.

### 12 — Céges hozzáférés megszüntetése

**Most:** „megvonás” gomb a készletjog választója mellett; a teljes tagságot érinti, a következmény nem egyértelmű. Megszüntetett tag mellett is megmarad engedélyezésre hívó vezérlő.

**Helyette:** sorvégi menüben **„Céges hozzáférés megszüntetése”**. Megerősítés:

> **Megszünteted Béla céges hozzáférését?**
>
> Béla ezután nem nyithatja meg a Családi Műhely Kft. adatait. A saját fiókja és a korábbi műveletek története megmarad.
>
> **Mégse** · **Hozzáférés megszüntetése**

Siker: **„Béla céges hozzáférése megszűnt.”** A sor a Megszüntetett szűrő alatt elérhető marad. Nincs jogosultságot adó aktív gomb megszüntetett tagságnál. Saját/utolsó kezelő eltávolítását csak a meglévő szerveroldali szabály engedheti; az UI nem talál ki önálló mentőszabályt és nem ígér működő önvisszaállítást.

### 13 — Béla oldalán megszűnik a hozzáférés

**Most:** a kép „másik munkakörnyezetre váltásról” beszél, miközben a történet oka a tagság megszüntetése. A fejlécben nincs kiválasztott fiók, a felhasználó magára marad.

**Helyette:** a védett adat eltűnik. Ha a szerver bizonyítja az okot: **„Megszűnt a hozzáférésed a Családi Műhely Kft. fiókjához.”** Folytatás: **„A személyes fiókodat továbbra is használhatod.”** Gomb: **„Személyes fiók megnyitása”**. A céges fiók kikerül a választható aktív listából.

Ha a kliens csak eltérő munkamenetet lát, nem állíthat bizonyítatlan megvonást: **„A korábbi fiók most nem érhető el. Válassz másik fiókot.”** A védelem biztosítja a következő kérések elutasítását. Push-értesítés hiányában nem állítjuk, hogy a világ összes nyitott füléről azonnal eltüntettük a korábban megismert adatot; fókuszváltáskor és új kérésnél ellenőrzünk.

### 14 — Hibás adóazonosító

**Most:** angol mezőút és normalizálási magyarázat. A hiba szürke kísérőszövegnek látszik, és azt sugallja, elég kivenni a vállalkozási jelölést.

**Helyette:** az Adószám/Adóazonosító mező alatt: **„Add meg az adóazonosítót. Csak szóköz vagy kötőjel nem elegendő.”** Az űrlap tetején rövid összegzés: **„A vállalkozást még nem hoztuk létre. Javítsd a jelölt mezőt.”** Ez csak a bizonyított írásmentes elutasításnál jelenik meg. A helyesen kitöltött mezők maradnak, az aktív fiók nem változik.

Nem javasoljuk az ellenőrzés megkerülését a vállalkozási állapot kikapcsolásával. „Érvényes adószám” csak valódi ellenőrzés alapján írható; formailag elfogadott önbevallás nem hatósági hitelesítés.

### 15 — Másik böngészőfülön fiókot váltottak

**Most:** hosszú piros mondat; az oldalon előző feladatok maradványai maradnak, miközben a fejléc más fiókot mutat.

**Helyette:** semleges figyelmeztetés az érintett oldal tetején: **„Másik böngészőfülön fiókot váltottál. Most a Személyes fiók van megnyitva.”** Írásmentes elutasításnál: **„A módosítást nem mentettük, mert közben másik fiókra váltottál.”** Másik személy belépésekor: **„Másik felhasználó jelentkezett be ebben a böngészőben. Az oldal frissült.”** A saját személyes adatokat csak a szerver által engedett nézet szerint mutatjuk.

Nem ismételjük meg automatikusan az írást az új fiókban. A régi nézetből megmaradt gomb, panel, táblázat és sikerjelzés érvénytelen. A hiányos válaszkötés felhasználói mondata: **„Az adatokat nem tudtuk biztonságosan megjeleníteni. Frissítsd az oldalt.”** Technikai ok csak részletekben.

## 6. Közös magyar szótár

Egyetlen szövegforrás legyen, a menücím, oldalcím és gomb ne külön fájlokban kapjon eltérő nevet. Tegező, nyugodt, tárgyszerű hang; nincs kiabáló nagybetűzés és védekező jogi fejtegetés a fő munkafelületen.

| Jelenlegi szó/szöveg | Felhasználói megfelelő | Megjegyzés |
|---|---|---|
| magreferencia · próba-alkalmazás | Bemutató · mintaadatok | Egy kis jelölés |
| személyes kör | Személyes fiók | Nem új regisztráció |
| közös munkakörnyezet | Közös fiók | Cégnél a cég neve szerepel |
| könyv / book | Nincs a felületen | Belső adatmodell marad |
| alany / subject | Felhasználó | A személyt nem nevezzük fiókváltásnak |
| Csatorna bizonyítva | E-mail-cím megerősítve | A profilban, nem a fejlécben |
| Belépés / Belépve | Bejelentkezés / siker után áttekintés | Nem kell állandó „belépve” felirat |
| Kilépés | Kijelentkezés | Egyértelmű művelet |
| Váltó | Fiók | A fejléc választója |
| terv | Előfizetési csomag | Nem munkaterv |
| starter / pro | Alap / Bővített | Jelenleg mintacsomagok, nem árígéret |
| user / admin | Tag / Fiókkezelő | Nem ígér korlátlan hatáskört |
| vállalkozási minőség | Vállalkozás adatai | A felhasználó feladatát mondja |
| joghatóság | Nyilvántartás országa vagy területe | Nem mindenhol adószám a helyi név |
| önbevallott | A megadott adatokat még nem ellenőriztük | Csak ahol releváns |
| meghívó kiadása | Meghívó létrehozása | Elküldés csak tényleges küldésnél |
| meghívó beváltása | Meghívás elfogadása | Emberi cselekvés |
| adatkör adása | Készlet/árak megtekintésének engedélyezése | Nevezze meg a tárgyat |
| plafon | Később engedélyezhető adatok | Meghívási űrlapon, egy magyarázó mondattal |
| keszlet / arak | Készletadatok / Árak | Ékezetek mindenhol |
| hatályos / NEM hatályos | Aktív / Megszüntetve | A konkrét állapothoz kötve |
| megvonás | Céges hozzáférés megszüntetése | Nem egyetlen adatjog kapcsolója |
| KIADVA | Nincs ilyen felirat | A kapott adat jelenik meg |
| ELUTASÍTVA — melyik kapu | Nincs hozzáférésed ehhez az adathoz | Konkrét ok és lehetséges következő lépés |
| entitlement / előfizetés-kapu | Ez a funkció nincs benne a csomagban | Az adatjogtól külön |
| membership_only / granted | Csatlakoztál a fiókhoz | Nem jelenti az összes adatjogot |
| no_scope_grant | A megtekintés még nincs engedélyezve | Nem rendszerhiba |
| authority_not_established | Ezt a módosítást nem végezheted el | Nem „nem admin”, ha az ok ennél szűkebb |
| none_available | Még nincs ellenőrizve / nincs adat | Mindig a mező jelentése szerint |
| FEJLESZTŐI LEVÉL-FOGADÓ | Próbaüzenetek | Külön bemutatóeszköz |
| ISO időpont | 2026. szept. 24. 18:36 | A felhasználó időzónájában |

### 6.1. További egységes állapotszövegek

| Helyzet | Szöveg és következő lépés |
|---|---|
| Hibás belépési adatok | Az e-mail-cím vagy a jelszó nem megfelelő. |
| Lejárt bejelentkezés | A bejelentkezésed lejárt. Jelentkezz be újra. |
| Megerősítésre váró saját fiók | A folytatáshoz erősítsd meg az e-mail-címedet. → Új levél kérése |
| Már felhasznált megerősítő link | Ezt a linket már felhasználták. → Bejelentkezés |
| Újabb megerősítő levél készült | Használd a legutóbbi megerősítő levél linkjét. |
| Hibás megerősítő link | Ez a megerősítő link nem használható. → Új levél kérése |
| Adatjog hiányzik | Ehhez az adathoz még nincs hozzáférésed. A fiókkezelő tudja engedélyezni. |
| Előfizetés hiányzik, kezelő | Ez a funkció nincs benne a jelenlegi csomagban. → Előfizetés megnyitása |
| Előfizetés hiányzik, tag | Ez a funkció nincs benne a vállalkozás csomagjában. A fiókkezelő tud segíteni. |
| Átmeneti olvasási hiba | Nem sikerült betölteni az adatokat. → Újrapróbálás |
| Mentés bizonytalan | Nem tudjuk biztosan, hogy a mentés befejeződött. Ellenőrizd az állapotot, mielőtt újra próbálod. |
| Nincs találat | Nincs a szűrésnek megfelelő találat. → Szűrők törlése |
| Üres felhasználói lista | Még nem hívtál meg másokat. → Felhasználó meghívása |
| Nem mentett űrlap | Vannak nem mentett módosításaid. → Szerkesztés folytatása / Elvetés és váltás |
| Próbaüzenet | Bemutatóüzenet. Valódi e-mailt nem küldtünk. |
| Általános váratlan hiba | A művelet most nem fejezhető be. → Technikai részletek |

A technikai részletek tartalmazhatnak hibakódot és hibahivatkozást, de személyes adatot, jelszót, teljes meghívó- vagy megerősítő tokent nem. Másolható hibaösszefoglaló legyen, ne nyers teljes API-válasz.

## 7. Mi legyen a kért „kamu V2” felületen?

**A cél:** a felhasználó egy készülő munkarendszerben lássa a regisztráció és jogosultságkezelés helyét. A mintanézet nem bizonyít kész üzleti modult.

| Mintanézet | Tartalom | Kipróbálható viselkedés |
|---|---|---|
| Áttekintés | Utóbbi folyamatok; elintézendő hozzáférések; legutóbb megnyitott menük | Kártyák valódi navigációja |
| Termékek | Rögzítőelem M8; Papírtasak; Alapanyag A; Szolgáltatási csomag | Keresés és sor részleteinek megnyitása |
| Partnerek | 3–4 kitalált partner, típus és ország | Keresés, adatlap |
| Raktárak | Központi raktár; Műhely | Raktárhoz szűrt mintaadatok |
| Készletegyenleg | Mért, becsült és ismeretlen mennyiség, külön egységekkel | A hiány megkülönböztetése a nullától; jogosultsági állapot |
| Folyamatok | Beérkezés; Összeállítás; Raktári kiadás | Állapot szerinti szűrés; olvasható részlet |
| Bizonylatok | Kitalált megrendelés és szállítólevél jellegű minta | Megtekintés, nincs számla kiállítása |
| Kimenő e-mailek | Külön jelölt bemutatólista | Nem közös, hitelesítés nélküli fejlesztői postaláda |
| Felhasználók | Anna kezelő; Béla tag; egy várakozó meghívó | Meghívás, tényleges adatjog és tagság három külön állapot |

Minden céges mintaadatnak legyen deklarált fiókja; váltáskor ugyanaz a tábla nem maradhat másik cégnév alatt. Az önálló tervezési HTML-ben a műveletek csak memóriában szimuláltak. A következő alkalmazásváltozatban a belépés, fiókváltás, meghívás és jogadás a valódi V3 core útjait használja; a bemutatókapcsolók külön környezetben maradnak.

## 8. Próbaüzenetek és bemutatóátadás

A fejlesztői postaláda nem kerül minden oldal aljára, és nem azonos a vállalkozás Kimenő e-mailek menüjével. A helyi próbában a **Bemutató eszközei → Próbaüzenetek** panelből nyitható. Meghívó/levél után közvetlen gomb vezet a releváns próbaüzenethez. Ez elkülönített szintetikus környezet; az általános postaláda útját pusztán CSS-sel elrejteni nem biztonsági javítás. Nyilvános telepítés továbbra sincs engedélyezve.

Az új átadás két részből áll:

1. **Felhasználói bemutató:** rövid útmutató, kattintható mintafelület, normál képernyőméretű állapotképek. Minden feladatnál egy mondat: mit próbálhat ki, miből látja a sikert.
2. **Műszaki melléklet:** forráscommit, tesztazonosítók, futási eredmények, hiányok. Ezek nem szerepelnek a termék minden lapján.

A jelenlegi HTML öt parancsa után „A negyedik sor kiírja a címet” szerepel: valójában az ötödik indítja a szervert. Ezt javítani kell. A letöltési útmutató külön mappát és rögzített teljes commitot használjon, meglévő mappába ne írjon felül. A felhasználói bemutató megtekintéséhez ne legyen kötelező terminál, Git vagy Node. A külön valódi működési próba lehet helyi indítású, világos előfeltételekkel.

## 9. Követelményből elfogadás: mit kell a következő átadásnál megmutatni?

| Azonosító | Elfogadási feltétel |
|---|---|
| UX-01 | Bejelentkezés után nincs belépési/regisztrációs űrlap a belső oldalon. |
| UX-02 | A fiókválasztó minden belső nézetben ugyanott elérhető; személyes és legalább két céges fiókkal bemutatva. |
| UX-03 | A saját profil külön menü; belépett személy és aktív vállalkozás nem keveredik. |
| UX-04 | A V2 menüszerkezet kijelölt része visszaköszön; ugyanaz a menünév és oldalcím. |
| UX-05 | Azonos munkalap megnyitása nem hoz másolatot. Másik fiókba nem visz át idegen adatot vagy szerkesztést. |
| UX-06 | A 15 régi képernyő mindegyikének van új, a fenti tervnek megfelelő folytatása. |
| UX-07 | Nyers JSON, belső azonosító, angol hibakód és nagybetűs technikai szó nincs a normál nézetben. |
| UX-08 | Lejárt megerősítésből új levél kérhető; a regisztráció nem indul újra. |
| UX-09 | A meghívó elfogadása jól látható fő feladat, belépés után oda tér vissza a felhasználó. |
| UX-10 | A meghívott tagsága és adatjoga külön, érthető állapot. A csomagkorlát sem olvad össze velük. |
| UX-11 | A készletjog engedélyezése után valódi adatkérés alapján változik a felület; nem csak helyi címke cserélődik. |
| UX-12 | Teljes tagság megszüntetése nem néz ki egyetlen olvasójog kikapcsolásának. Van névvel, fiókkal és következménnyel megerősítés. |
| UX-13 | Megszüntetett tag nem kap aktív jogadási gombot; a saját személyes fiókja továbbra elérhető. |
| UX-14 | A hibás adóazonosító hibája a mezőhöz kötött; a sikertelen műveletnél nincs félkész fiók és nincs indokolatlan adatvesztés. |
| UX-15 | A R79 személy+fiók-védelme, késői válaszok kizárása és írásmentes elutasításai az új felülettel is megmaradnak. |
| UX-16 | Másik fülön történt változásnál a közlés pontos; nem tulajdonítunk bizonyítatlan okot a változásnak. |
| UX-17 | 390×844 és 1440×900 képernyőn használható; a menü, profil, fiókváltás és fő művelet nem takaródik el. |
| UX-18 | A fő folyamat billentyűzettel is végigjárható; panelnyitás/-zárás fókusza helyes. |
| UX-19 | Ismeretlen mennyiség és ár nem nulla; becsült mennyiség jelölt. A különböző egységek nem adódnak össze. |
| UX-20 | A mintanézet és működő core-funkció jelölése őszinte. Látszatküldés, látszatmentés és látszatszámlázás nincs. |
| UX-21 | Az átadott HTML melléklet internet és belépés nélkül megnyitható. Az artifact-link csak kiegészítő. |
| UX-22 | Van egy teljes használati történet, nem csak izolált gombképek: Anna → vállalkozás → Béla → készletjog → hozzáférés megszüntetése. |

Az ellenőrzés meglévő releváns tesztekből és célzott új böngészőhelyzetekből álljon. Ne épüljön minden feliratra új tesztrendszer. A végső képeken emberileg is ellenőrizni kell az olvashatóságot; a zöld teszt nem helyettesíti ezt.

## 10. Végrehajtási csomag Claude-v3 részére

**Egy összefüggő csomag, egy végső REPORT.** A jelen terv döntései a felhasználó kifejezett UX-átalakítási kérését hajtják végre. A tervezés felelőse chatgpt-v3; az operátortól nem kérünk belső komponens- és jogmodell-döntéseket.

Végrehajtási sorrend, köztes visszaadás nélkül:

1. A meglévő V3 kódon rögzített kiindulás, R80 javítások megtartása. Az R80 még nem függetlenül elfogadott eredmény; a bemutató nem változtathatja elfogadottá.
2. Közös shell, fiókválasztó, profilmenü, menü és munkalapok. A V2 csak mintaforrás; nem annak tenant-fejléces vagy fejlesztői hitelesítési megoldását másoljuk.
3. Közös feliratszótár és állapotkezelés. A 15 képernyő átrendezése és a jelen szövegek beillesztése.
4. Szintetikus V2-jellegű listák; valódi core-folyamatok bekötése a már létező végpontokra. Ha a képernyőhöz új olvasási összesítés kell, a meglévő tényekből és azonos jogosultsági határon készüljön. Nincs párhuzamos szerepkörmotor.
5. Egy végigjárható bemutató, releváns regressziók és két képernyőméret vizuális ellenőrzése. A közös fiók-/személyváltást és a meghívó utáni folytatást valódi böngészőben is ellenőrizd.
6. Egy végső átadás: HTML melléklet, rögzített forrás, UX-01…22 eredmények; saját futás, átvett bizonyíték és nyitott tétel külön. A chatben legalább a tájékoztatás fele közérthető magyar: mit tud most kipróbálni az ember, mi hiányzik és mi a következő lépés.

**Olvasási keret:** ez a teljes terv egyszer; a releváns helyi kötelező szabályok; a V3 alkalmazás érintett fájljai; a fent megnevezett V2 shell-fájlok célzott részei. Teljes V2/V3 döntési archívum és minden régi REPORT visszaolvasása nem feladat. A végrehajtó választja meg a belső munkasorrendet; indokolatlan agentszaporítás és oldalankénti külön kör nincs. A hosszú tesztláncokat csak érintettség vagy kötelező kapu indokolja; a szabályos újrahasználat megengedett.

**Korlátok:** nincs merge, telepítés, V2-módosítás, új üzleti mini modul vagy új képviseleti/előfizetési üzletpolitika. A R19 QNT 24 követelménye/36 esete marad. Az ismeretlen mennyiség nem akadálya a tétel létezésének; a becslés nem válik visszamenőleg méréssé, pontosítás önmagában nem készletmozgás. A 16 elfogadott/13 részleges klauzula nem készültségi százalék. Core-core és üzemi teljes lezárás nincs.

**A következő elfogadás tárgya:** érthető és egységes felület a meglévő core-folyamathoz, megnyitható bemutatóval. Ettől kezdve a felhasználó valódi képernyőkre és feladatokra tud visszajelezni.


## 11. Elkészített tervezési minta és saját ellenőrzés

A tervhez önálló, internet nélkül megnyitható **V3_feluleti_minta_R81.html** készült. A „Bemutató eszközei” alatt mind a 15 helyzet választható. Az áttekintés, a két vállalkozás és a személyes fiók, a V2-jellegű listák, a felhasználói panel és a belépési képernyők kattinthatók. Az eredeti feltöltött bemutatót nem módosítottam.

**Saját futás:** Chromium böngészőben 32/32 célzott ellenőrzés sikeres, JavaScript-hiba nem jelentkezett. Vizsgálva: mind a 15 bemutatóhelyzet; fiókváltás és elkülönülő mintaadatok; engedélyezés és megszüntetés; meghívás visszajelzése; keresés és üres találat; regisztráció semleges válasza; elavult értesítés eltűnése; 390×844 mobilnézet és 1440×900 asztali nézet. Az áttekintést, a hozzáférési panelt, a regisztrációt és a mobilnézetet képen is átnéztem.

**Ennek határa:** a 32 ellenőrzés kizárólag az önálló tervezési HTML-re vonatkozik. A minta nem hívja a V3 szervert, nem bizonyít hitelesítést, valódi jogellenőrzést, tartós mentést vagy több böngészőfül biztonságos együttműködését. A helyzetválasztó ezek olvasható állapotait szemlélteti. A valódi alkalmazásban a UX-01…22 feltételeket külön kell teljesíteni. Az R80 műszaki eredményei továbbra is Claude beadott mérései.

A HTML vizuális segédlet. A végrehajtási utasítás ez a teljes Board-dokumentum: a szerkezet, a 15 képernyő szövegei és a követelmények a melléklet nélkül is végrehajthatók. A korábbi saját HTML-mintához való hozzáférés hiánya nem indok újratervezésre vagy köztes visszaadásra.
