Repó: valach-system

# R116 — Az öt használati út felületének és súgójának befejezése
CMD-VS-300-002-002 R116 — SPEC
2026-09-29 · PR-VS-300 · STEP-VS-300-002
Címzett: Claude-v3, friss beszélgetés. Tervező és ellenőrző: chatgpt-v3.
Szülő: R115, 0e2189c7-dd82-4960-8ddd-5a733584a0b3.

## Végrehajtási parancs
Az R114 kilenc felületi döntését most engedélyezetten valósítsd meg egy összefüggő csomagban. A cél: az öt már működő használati utat a felhasználó rövid, következetes szövegekkel értse és tudja kipróbálni; a felület, súgó, GYIK, útmutató és chat tudásanyaga ugyanazt mondja. A működő alapfolyamatokat őrizd meg. Egyetlen végső REPORT kell, köztes átvételi levél és részenkénti visszaigazolás nélkül.

## Indulás és források
Repo valach-family/valach-system; ismert ág claude/focused-sagan-gfuieq. Utolsó függetlenül vizsgált fej ea093056b3b93166c9506d1baccc524a89f5ce76. Az R115 lap cd29cda2c7bdfeb88e0fe31f1921e41b21cbdafd pontot, a Board-üzenete már 0b55011 pontot nevez; ezek történeti jelölések. Induláskor a tényleges aktuális fejet és parancsot ellenőrizd, ne állítsd vissza az ágat.
Olvasd e specifikációt, a Board find_document-tal a teljes R114 ANALYSIS-t és R115 LETTER-t, az R113 REPORT 2., 4., 6. szakaszát, a rád vonatkozó helyi szabályokat, majd az érintett kódot. Az R114 repóbeli másolata v3ref/source-documents/R114_board_v1.md; az R113 docs/70_PLANNING/V3_R113_HASZNALATI_TORTENETEK.md. Ne olvasd újra a teljes történetet.
Fő helyek: v3app/public/i18n/{hu,en,de}.mjs, közös szövegfeloldás, v3app/knowledge, tools/v3_r89_bemutato.mjs és tools/lib/v3_tortenet_lejatszo*. A helyi kötelező olvasást nem írja felül ez a célzott lista.

## Egyben elvégzendő munka
1. Az R114 mind a kilenc döntése kötelező és kész tervezői döntés: Próbafelület/Lépésenkénti útmutató szétválasztása; megtekintési sablon; e-mail-megerősítés; vállalkozási súgó; Kimutatások és hiányállapotok; rövid kezdőcím/kártyák; kétmondatos magyarázatok; fejlesztői részletek külön; közös HU/EN/DE forrás.
2. Ugyanezeket vezesd át az érintett valódi képernyőkön, súgón, GYIK-en, oldaltérképen, vezetett útmutatón és chat tudásanyagon. Ne legyen külön bemutatós szótár, nyers belső üzenet vagy eltérő fogalom ugyanarra a dologra.
3. A teljes öt történetet nézd végig felhasználóként, az új/már regisztrált meghívott és elutasítási helyzetekkel együtt. Az e változtatásokból eredő elrendezési, helyőrző-, fordítási, navigációs és érthetőségi hibákat ugyanebben a csomagban javítsd. Tartsd meg a közös fiókválasztót, személyes menüt és V2-höz igazított keretet.
4. HU/EN/DE értelmileg egyezzen; az angol és német szöveg természetes megfelelő legyen. A „nem adták meg” és „nem ismert” állapot ne mosódjon össze. Az országfüggő azonosító-követelmény leírása a létező viselkedést tükrözze, ne találjon ki új hatósági ellenőrzést.
5. A bemutató műszaki bizonyítékai maradjanak elérhetők az Ellenőrzési részletekben, forrással és dátummal; az előtérben a felhasználó feladata és eredménye álljon. A mintaadat/szimuláció jelölése maradjon látható. Az ismert, nem újramért eredményt ne nevezd új mérésnek.
6. Generáld újra a közös kattintható HTML-t, nyisd meg és ellenőrizd asztali és keskeny nézetben, mindhárom nyelven célzottan. Add át a meglévő csatornán megnyitható bemutatót és az önálló HTML-t, rövid kipróbálási sorrenddel. Új demóplatform nem kell.

## Ellenőrzés és lezárási feltétel
A kilenc döntésről egy rövid teljesült/nyitott táblázat a végső REPORT-ban elég; nem kilenc új dokumentum.
A fordítási, tutor- és érintett böngészős próbák fussanak. Őrizd meg a meghívás utáni igazolt útmutatólezárást, a személy/fiók elkülönítését és a hozzáférés megadásának/visszavonásának tárolt következményét. A szövegfüggő próbákat helyesen frissítsd; viselkedési állításokat ne gyengíts egy zöld eredményért. A szótárra kötött gépi próba mellett képernyőn is olvasd el a mondatokat.
Változatlan core-ra nem kell automatikus teljes mutációs/külső söprés. R112-I3 egyszeri hibája továbbra is ismert, azonosítatlan okú tétel; újabb előfordulás nélkül ne indíts tömeges ismétlést. Ha előjön, a rögzített állapotból diagnosztizálj.
Szöveg vagy elavult teszt ütközését oldd meg e döntések szerint. Valódi biztonsági/üzleti ellentmondásnál ne változtass önkényesen jogosultságot: pontosan nevezd meg az akadályt. Egyszerű elnevezésről ne kérdezd az operátort.
Végső átadás: rövid magyar „mi változott, mire jó”; kilenc döntés státusza; végleges forráskötés; tényleges mérések; megnyitható bemutató; őszinte maradéklista. Az AI átnézés nem anyanyelvi lektorálás. Az elfogadott működés újraengedélyeztetése nem feladat.

## Munkamenet és fogyasztás
Az R115 szerint a régi főszál kumulatív mediánja 419490: ez a már elfogadott 400k munkablokkhatár fölött van. E csomag friss beszélgetésben induljon; ha ezt az operátor már megnyitotta, ne kérj még egyet. A 300k figyelmeztetés/400k blokkhatár marad; nem jelent oldalankénti vagy jelentésenkénti váltást.
Egy fő végrehajtó. Egyszerű kereséshez nincs külön agent. Legfeljebb egy valóban indokolt szűk ellenőrző, csak szükséges forrásokkal és a rá vonatkozó szabályokkal; automatikus szétosztás nincs. Új modellbeállítás nem feltétel; jelenlegi modell használható.
A csomag és teljes munkamenet fogyasztását külön rögzítsd tartalommentes sorokból. Nincs önálló mérési/nyugtázási kör. Az R115 17 hívás/5,5M cache-read adata Claude állítása, nem bizonyított okmagyarázat; a nagy kontextus ismételt bevitelét nem a dokumentum nevének átírása csökkenti. Az ismeretlen költség null; heti limitarányt vagy megtakarítást ne számolj belőle.

Nincs merge, telepítés, V2-módosítás, új üzleti modul, jogosultsági modellváltás vagy teljes core/CMD/PR-zárás. A 16/13 nem készültségi százalék; QNT24/36 és alapelvei megmaradnak. A kommunikáció legalább fele közérthető magyar állapotmagyarázat legyen. A következő REPORT számát a Board alapján állapítsd meg.
