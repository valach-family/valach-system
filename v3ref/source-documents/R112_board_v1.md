# R112 — Nagyobb, egyben átadandó V3 használati csomag

CMD-VS-300-002-002 R112 — SPEC
2026-09-29 · PR-VS-300 · STEP-VS-300-002
Tervező és ellenőrző: chatgpt-v3. Végrehajtó: Claude-v3.
Szülő: R111, ae1c4066-68f6-4d05-a6c3-b46a0ae44917.
Operátori kérés: „Egy kicsit nagyobb feladatok kellenének, mert a limit nagy része megmarad!”

## A cél most egy teljes, kipróbálható használati csomag
Az R111 javítása, az R109 nyelvi átnézése és bemutatója kötelezően megmarad. Ezek mellé most a meglévő regisztráció–fiókkezelés–meghívás–hozzáférés funkciók összefüggő felhasználói útjainak rendbetétele és közös bemutatása is engedélyezett. Egyetlen végső REPORT; részenkénti visszaigazolás nem kell.

Ez az R111 folytatásának bővítése, NEM párhuzamos feladat. Ha már dolgozol rajta, az elkészült részt tartsd meg, ne kezdd újra. A Board open állapota önmagában nem bizonyítja, hogy a végrehajtás még nem indult.

Repo: valach-family/valach-system. Ismert ág: claude/focused-sagan-gfuieq.
Utolsó függetlenül vizsgált fej: d610b51f45228e837dafe5680fb03f2322c06e0f — történeti ellenőrzési pont, nem automatikusan az induláskori fej. Induláskor ellenőrizd az aktuális ágat/fejet/parancsot, meglévő munkát ne írj felül.

## 1. Végigvihető használati utak
A jelenleg megépült funkciókból az alábbi öt történet legyen következetesen használható, érthető és bemutatható:
1. Magánszemély: regisztráció → e-mail megerősítése → belépés → személyes fiók → kijelentkezés/újrabelépés, megmaradó nyelvvel. A vásárlás későbbi funkció, ne készíts hozzá új üzleti modult.
2. Egyedül dolgozó vállalkozó: meglévő személyes belépés → vállalkozási fiók hozzáadása a már támogatott ország/azonosító-kezeléssel → személyes és vállalkozási fiók közötti váltás. Ne legyen belőle új személyes identitás, és ne vezess be új hatósági igazolási eljárást.
3. Bővülő kisvállalkozás: meglévő kezelő meghív egy második embert → új vagy már regisztrált címzett belép → saját súgóval elfogad → megfelelő vállalkozási fiókba jut.
4. Több vállalkozásban dolgozó személy: meglévő tagságok között vált → mindig világos, melyik fiókban dolgozik és ott mire jogosult. A fiókváltás ne vigyen át idegen űrlapot, adatot vagy chatválaszt.
5. Kezelő és munkatárs: tagság létrejötte → a már megépült adatköri hozzáférés megadása → munkatárs ténylegesen elérhető nézete → hozzáférés visszavonása és érthető visszajelzés. A már rögzített jogosultsági döntéseket ne módosítsd.

A történetekben feltárt, e hatókörön belüli összekötési, állapotkezelési, felületi és szövegezési hibákat ugyanebben a csomagban javítsd. Nem kizárólag hibajegyzék a feladat. A működő részeket ne írd újra. Új jogosultsági modell, vállalati hierarchiamotor, adózási logika, számlázás, Vshop/Vmarket vagy más üzleti modul nincs engedélyezve. A nagyvállalati bővíthetőséget őrizd meg, de kész nagyvállalati rendszert e történetek alapján ne állíts.

## 2. Egységes felület, nyelvek és tutor ugyanabban a munkában
- Az R109 P109-02 teljes HU/EN/DE tartalmi szövegátnézése marad a hatókör: aktuális képernyők, űrlapok, levelek, hiba/üres/sikerállapotok, súgó, GYIK, bemutató és chat tudásanyaga.
- A kezelt fiókok közös dropdownja, a személyes menü és a V2-höz igazított keret megmarad. Ne legyen minden történetnek más kezelési logikája.
- A tagság, hozzáférés, személyes belépés és vállalkozási fiók rövid, következetes megnevezést kapjon. Belső gépi kifejezések ne váljanak fő felületi szöveggé.
- Mind az öt úthoz a meglévő közös regiszterben legyen megfelelő segítség, GYIK/oldaltérkép-kapcsolat és szükség szerint kattintós bemutató. A már jó bemutatót használd újra; ne készíts azonos tartalmú külön változatokat.
- Az AI csak a meglévő, engedélyezett, forráshoz kötött súgófunkciókat használhatja. Nem fogadhat el meghívót és nem adhat jogosultságot a felhasználó helyett. Élő szolgáltató bekötése/költése külön engedély nélkül nem része.
- Új nyelv később ugyanazon szerkezetbe illeszkedjen. Francia aktiválása most nem feladat. AI által végzett szövegátnézés nem független anyanyelvi lektorálás.

## 3. Olyan bemutató, amit az operátor ténylegesen használhat
Egy közös belépőoldalról választható legyen az öt történet; ugyanaz az alkalmazáskeret és világosan jelölt szintetikus adatok. Az R109 kért új/már regisztrált meghívott és hibás/lejárt meghívó helyzete is legyen kipróbálható.

A bemutató ne csak képsor vagy fejlesztői parancslista legyen. Legyenek valóban kattintható lépések, rövid magyarázat, újrakezdés és látható eredmény. A szimulált és a valódi alkalmazásban bizonyított működés külön legyen megnevezve. A meglévő generátort és átadási csatornát használd, nem új demóplatformot.

Az átadás előtt ténylegesen nyisd meg a kész belépőoldalt, ellenőrizd a kapcsolódó fájlokat/linkeket, valamint asztali és keskeny nézetben az alapvető használhatóságot. Ne maradjon „page not found”. Telepítés továbbra sem engedélyezett.

## 4. A minőség a végrehajtás része
F111-01 kötelező: az elfogadás utáni igazolt túralezárás maradjon meg; a tagság létrejötte önmagában nem bizonyítja a bemutató befejezését. F111-02 teljes út- és elutasítási bizonyítékai szintén megmaradnak.

Először röviden rendeld a meglévő bizonyítékokat az öt történethez, majd csak a hiányzó vagy érintett helyeken bővíts. Egy érvényes régi bizonyíték megőrizhető; a változtatás által érintett viselkedést újra kell mérni. A zöld név vagy tesztszám nem helyettesíti a tényleges végállapotot.

Az R109/R111 előírt háromnyelvű meghívási útjai megmaradnak. A további történetekhez a nyelvi/megjelenési mátrix legyen kockázat szerint célzott; ugyanazt a változatlan core-próbát nem kell minden nyelvre külön másolni. Jogosultsági írásoknál valódi szintetikus tárolt következményt is ellenőrizz, ne kizárólag feliratot. A teljes hosszú core/külső söprés nem automatikus feltétel.

A végrehajtó a saját felfedezett hibáit javítsa és célzottan ellenőrizze a beadás előtt. Köztes visszaadás csak valódi külső akadálynál, egymásnak ellentmondó alapkövetelménynél vagy a munkamenet indokolt átadásánál szükséges.

## 5. Egyetlen átadás és felelős kerethasználat
A végső REPORT tartalmazzon:
- rövid magyar összefoglalót arról, mi lett használhatóbb;
- az öt történet státuszát és pontos bizonyítékát;
- R109 P109-01…03, F111-01/02 lezárt és fennmaradó részét;
- megnyitható bemutatót, rövid kipróbálási sorrenddel;
- forráskötést, módosított fájlokat, célzott futások eredményét;
- átnézett szövegek hatókörét és megmaradt hiányait;
- csomagfogyasztást és kumulatív munkamenetjelzőt külön, tartalommentes mérési sorokkal.

A feladatméretet növeltük, nem a felesleges hívások számát. A megmaradt előfizetési keret nem elköltendő cél. Egy fő végrehajtó; az eddigi legfeljebb egy indokolt, szűk ellenőrző engedélye marad, automatikus agent-szétosztás nélkül. A jelenlegi modellbeállítás használható; kötelező modellváltás nincs.

Az R107/R111 300k figyelmeztetés/400k munkablokkhatár változatlan. Az R111-hez kért friss chatben, ha már elindultál, folytasd: ez a bővítés önmagában nem új-chat ok. Új chatet se oldalanként, se jelentésenként ne kérj. Az e lapban körülhatárolt csomagot ne nevezd át önkényesen sok új nagy feladattá; valódi környezeti korlátnál rövid, folytatható átadás kell, nem újratervezés. A keretkihasználás és a beszélgetés kontextusmérete külön mérték; ebből heti százalék vagy megtakarítás nem számolható. Ismeretlen költség null.

Nincs merge, telepítés, V2-módosítás, új előfizetés vagy teljes core-core/CMD/PR-zárás. A 16/13 nem készültségi százalék. QNT24/36 és az ismeretlen mennyiség, múltbeli becslés, készletmozgás elválasztása megmarad. A közérthető magyar haladásmagyarázat legyen a kommunikáció legalább fele.

Kötelező forrás: e lap, az R111 teljes ellenőrzése és R109 teljes specifikációja, valamint a rá vonatkozó helyi szabályok és célzott kód. A teljes múlt újraolvasása nem feladat. A következő REPORT számát a Board aktuális állapotából állapítsd meg.
