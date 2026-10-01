# R132 — Meghívó visszavonása és munkatárs újbóli belépése
CMD-VS-300-002-002 R132 — SPEC
2026-10-01 · PR-VS-300 · STEP-VS-300-002
Repó: valach-family/valach-system
Tervező és független ellenőrző: chatgpt-v3.
Végrehajtó: Claude-v3, ÚJ beszélgetés.
Szülő: R131 DECISION, 6a1ca7cc-72de-4a97-a955-cf1acccd7c6c.

## Aktív végrehajtási parancs
Építsd meg az alábbi összefüggő csomagot, a domain-műveletektől a tényleges kezelőfelületig, HU/EN/DE súgóval és kipróbálható bemutatóval. A specifikáció a körülhatárolt megvalósítás engedélye. Egyetlen összesített REPORT kell; köztes LETTER vagy rutinszerű új engedélykérés nem kell. A kapcsolódó hibákat ugyanebben a munkában javítsd.

Közérthető cél: a kezelő visszavonhasson egy még el nem fogadott meghívást anélkül, hogy más jogát megszüntetné. Egy korábban eltávolított munkatársat pedig tudatos döntéssel, új meghívással lehessen visszahívni úgy, hogy a régi hozzáférései és régi meghívói ne éledjenek fel.

Az R131-ben elfogadott adatkör-csomag lezárt. Nem újabb ellenőrzőkört kérünk hozzá. Aktív szakasz továbbra is core-core az R13 szerint; törzsek, készlet, pricing vagy új üzleti modul nem indul.

## Ellenőrzött kiindulás
Elfogadott SHA: 812410723ed0964f55d4cfe4ca9cc338abb49321.
Ismert ág: claude/chatgpt-board-r121-error-favm2e.
Ez hivatkozási pont, nem utasítás újabb munka visszaállítására. Az induló ágat és fejet ellenőrizd. Új munkameneti ág az elfogadott V3-leszármazásból induljon; a régi main nem megfelelő alap, létező munka nem írható felül.

Chatgpt-v3 ebben a tervezési körben elolvasta az R131 döntést, R121 és R112 specifikációkat, az R13 szakaszkaput, valamint a záró SHA-n:
- v3ref/norms.mjs ORG-N1a/b és NEXT_REQUIRED_EVIDENCE részeit;
- contracts/grantPathRegistry.js;
- v3ref/invite.mjs, delegation.mjs, bitemporal.mjs érintett útjait;
- docs/70_PLANNING/V3_CORE_LEZARASI_LISTA.json.

Mért forrásmegfigyelés: a membershipOutcome a megszűnt tagságot revoked_needs_decision kimenettel kezeli; a grantMembership jelenlegi írója új tagságsor beszúrására épül. A meghívási ablak feloldója lejáratot/beváltást kezel, saját visszavonási eseményt nem. Az ORG-N1a remaining szövege éppen e két életciklus-hiányt nevezi meg.

A GPR-01 több prózai sora régi állapotot állít az alap nélküli meghívóról/hatásköradásról, miközben a norms.mjs későbbi leírása már zárást mond. A core-lista last_round értéke R77. Ezeket ne tekintsd friss futási eredménynek. A módosuló utak leírását az élő kódhoz kell igazítani, korábbi jelentéseket nem átírni.

A forrásvizsgálat nem új futtatás. A Boardon az R132 lap és üzenet az ellenőrzéskor szabad volt; az aktív mutató R129 volt, annak feladata R131 szerint már teljesült. Ez a parancs lesz az új aktív feladat.

## 1. Rögzített állapot- és jogosultsági szerződés
Külön tény marad: meghívási ajánlat, címzett igazolt azonossága, tagsági időszak, adatkörjog, delegálási plafon, előfizetés, tiltás és felfüggesztés. Egyik új művelet sem olvaszthatja ezeket össze.

A kiadott meghívó feltételei változtathatatlanok. Címzett, szerep, alap vagy időablak módosítása új meghívó, új token és új pecsét; a régi token nem használható új ajánlatként. Az új technikai állapotokhoz zárt szerződés és egy közös feloldó tartozzon az olvasó, író és felületi utakon.

Minden módosítás a szerveres munkamenet alanyához és fiókjához kötött. A domainben is legyen kapu: mai tagság, megfelelő hatáskör, élő alap és delegálási plafon a véglegesítési ponton. Kliens által beküldött szerep, book vagy actor nem felhatalmazás. GET nem ír jogosultsági állapotot. Elutasítás nem hagy félkész alapot, meghívót, tagságot vagy jogváltozást.

## 2. Egy függő meghívó visszavonása
A jogosult helyi kezelő az adott fiók függő meghívóját vonhatja vissza, akkor is, ha másik jogosult kezelő adta ki; a kezelhetőség a saját mai hatáskörén és plafonján áll. A token birtoklása és a meghívott személy volta önmagában nem ad kezelői jogot.

A visszavonás külön, auditálható esemény: meghívó stabil hivatkozása, fiók, cselekvő, szerveres rögzítési és hatályidő. A nyilvános kezelői művelet mostani hatályú; múltbeli/jövőbeli dátum nem kliensválasztás. A kiadási feltételek és korábbi események megmaradnak.

Visszavonás után a régi hivatkozás sem megfigyelésből, sem belépés utáni folytatásból, sem közvetlen beváltásból nem ad tagságot. A jogosult címzett érthető végállapotot kap; nem igazolt vagy idegen néző a meglévő semleges válaszszerződésen marad. A token és a meghívólista nem válik nyilvános címlistává.

Ismételt visszavonás ugyanazon eseményt nem duplikálja. Már elfogadott meghívó visszavonása nem tagságmegvonás: nevezett, hatásmentes kimenet és külön kezelői folytatás. Lejárt meghívóhoz se mutass hamis sikeres változást. A listában a lejárt, visszavont és elfogadott állapot külön legyen.

Beváltás és visszavonás versenyében a véglegesítési sorrend dönt: ha a visszavonás véglegesült előbb, nincs tagság; ha a beváltás előbb, a visszavonás nem törli utólag a tagságot. Nem adhat mindkét művelet egymással ellentétes sikeres nyugtát.

## 3. Újbóli meghívás: külön, kifejezett kezelői döntés
A rendes meghívás meglévő revoked_needs_decision védelmét ne töröld és ne alakítsd csendes reaktiválássá. Az eltávolított tag mellett legyen saját „Újra meghívás” művelet, világos megerősítéssel. Ez új ajánlatot hoz létre, nem azonnali tagságot.

Az új ajánlat kötődjön a kiválasztott korábbi személyhez, fiókhoz és a konkrét lezárt tagsági időszakhoz/megvonási eseményhez. Címváltozás vagy másik személyhez átkerült e-mail nem lehet a korábbi személy tagságának átvételi útja. Meglévő személy hitelesítő adata, jelszava és más fiókja érintetlen.

Új szerep és új alap/verzió a mai kezelői hatáskörből származzon, a mai korláton belül. A rendszer tárolja, ki, mikor, milyen alapon engedte az új belépési ajánlatot. A címzett saját, igazolt belépéssel fogadja el. Az elfogadáskor minden alkalmazandó kapu ismét álljon; a közben visszavont/lejárt alap, eltávolított kiadó, visszavont meghívó vagy megváltozott célállapot nem kerülhető meg.

E csomagban a szokásos, jelen idejű tagságmegszüntetés utáni visszahívás épül meg. Visszamenőleges érvénytelenségi döntés, nyitott felülvizsgálat, felfüggesztés, személy-/hitelesítő-/fióktiltás nem oldható fel ezzel. Ezeknél nevezett zárás és a meglévő jogosult eljárásra mutató folytatás kell. A visszahívás nem utólagos joghatás-felülvizsgálat és nem a REV-N4 kompenzáló folyamat.

## 4. Új tagsági időszak, sértetlen múlt
Az elfogadás új tagságadó eseményt és új eredet-/korlátkötést hozzon létre. A régi grant, megvonás, audit és akkor ismert döntés nem törölhető vagy írható át. A mai vetület frissíthető, de a történeti igazság az eseményekből jön. A két időtengely maradjon külön.

Új belépéskor a régi adatkörjogok, bírálati hatáskörök, delegálási alapok és korábban kiadott függő meghívók NEM éledhetnek fel. A négy olvasási kör újra külön, kifejezett megadást igényel; maga az új tagság egyiket sem adja meg. A korábbi jog történetileg továbbra is lekérdezhető.

Ehhez a tagsági időszak/eredet kötése legyen egyértelmű, azonos időbélyegű eseményeknél is. A „régebbi dátum ⇒ valószínűleg régi jog” heurisztika nem megfelelő. A már létező egyszeri tagságoknak maradjon kompatibilis, reprodukálható feloldása; nincs adateldobás vagy minden jog általános újraengedélyezése.

Egy megszűnésre kiadott újrahívási ajánlat nem használható egy későbbi megszűnés újranyitására. Több párhuzamos ajánlatból sem lehet több élő tagsági időszak vagy egymást felülíró szerep. Újabb megszüntetés/újabb visszahívás ismét végigvihető legyen, a teljes történet megtartásával.

Az átvitt korlát jelentését e csomag nem módosítja: a mai alapplafon és a külön megadott adatkörjog elválasztása marad. Ne használd a munkát hallgatólagos plafonbővítésre vagy régi v1 fiók szabályfrissítésére.

## 5. Atomiság és egyszeri hatás
Az ajánlat, pecsét, újrahívási döntés és kapcsolódó alapírás egységben szülessen. Elfogadáskor új tagságesemény, vetület, átvitt korlát és tokenfogyasztás együtt marad vagy együtt visszagörgetődik. Nulla érintett sor és tárolási kivétel is konkrét ellenpróba legyen.

Dupla kattintás, hálózati újraküldés, elveszett sikeres válasz és párhuzamos elfogadás ne adjon új üzleti hatást. Azonos ismétlési azonosság eltérő tartalommal nevezett ütközés; a nyugta a tényleges állapotot mondja. A puszta letiltott gomb nem szerveres egyszeri-hatás védelem.

A meglevő SQLite referenciahatáron a versenyek két tényleges kapcsolat/folyamat közötti, szinkronizált próbával álljanak, nem csak egymás után meghívott függvényekkel. Ez nem Postgres-, hálózati terhelési vagy üzemi használati igazolás, L1 nem zárul.

## 6. Felület, segítség és közös bemutató
A meglévő Felhasználók/meghívás felületet és V2-höz illesztett keretet bővítsd. A kezelő lássa, mi függő, elfogadott, lejárt vagy visszavont; a korábban eltávolított tag legyen visszakereshető. A meghívó visszavonása, tagság megszüntetése és egyetlen adatkör visszavonása három külön, röviden megnevezett művelet.

Az újrahívás megerősítése mondja ki: a címzettnek el kell fogadnia, és a régi adatjogai nem állnak vissza. Visszalépés/mégse ne írjon. Elavult panel, másik lap fiók-/személyváltása és késői válasz ne más kontextusba írjon vagy rajzoljon. Az R131 ismert észlelési határa marad; új azonnali cross-tab rendszer nem feladat.

HU/EN/DE együtt: képernyők, nyugták, elutasítások, üres/bizonytalan kimenet, próbaüzenet, GYIK, oldaltérkép, tutor és chat tudáskapcsolat. A tudás-/AI-műveletszerződés a képernyő előtt készüljön el: magyaráz és megnyit, nem fogad el, nem von vissza és nem ad jogot a felhasználó helyett. Élő MI-szolgáltató és valódi külső levélküldés nincs.

Két teljes történet ugyanazon közös bemutatóban:
1. Függő meghívó → visszavonás → régi link zárt → új meghívó → szabályos elfogadás.
2. Munkatárs jogokkal → tagság megszüntetése → régi tokenek zártak → kifejezett újrahívás → saját elfogadás → tagság van, adatjog nincs → külön készletjog-megadás → csak mennyiségi nézet.
Szintetikus szimuláció és valódi HTTP+DB-bizonyíték külön megnevezve. Kanonikus HTML-forrás a repóban, generálási parancs és megnyitható átadás; asztali és keskeny nézet ténylegesen kipróbálva.

## 7. Előre rögzített elfogadási feltételek
| ID | Kötelező eredmény és tanú |
|---|---|
| A132-01 | Függő meghívó külön visszavonható; minden beváltási/folytatási út zár, más tagság/jog érintetlen; valódi UI→HTTP→DB. |
| A132-02 | Jogosulatlan, idegen fiókú, elavult kontextusú, érvénytelen alapú vagy plafonon túli művelet hatásmentes; pozitív ellenpár működik. Idegen néző nem kap címlistát/tokenadatot. |
| A132-03 | Beváltás↔visszavonás mindkét véglegesítési sorrendje két valódi kapcsolaton; legfeljebb egy megengedett hatás és hozzá igaz nyugta. |
| A132-04 | Rendes meghívó nem reaktivál; külön újrahívási döntés és címzetti elfogadás új tagsági időszakot ad. Ugyanaz a személy, változatlan hitelesítő és más fiókok. |
| A132-05 | Régi olvasási jog/hatáskör/delegálás/függő meghívó nem éled fel. Mind a négy adatkör zárt új megadásig; új készletjog után mennyiség igen, ár/dokumentum/beszállító nem. |
| A132-06 | Régi tagság → megszűnt köztes időszak → új tagság két időtengelyen reprodukálható. Régi események sértetlenek; két visszahívási ciklus és azonos időbélyeg sem keveredik. |
| A132-07 | Közben megváltozott célállapot, tiltás/felfüggesztés/felülvizsgálat, címeltérés és korábbi ciklus ajánlata nem kerülhető meg; elutasítás nem fogyaszt el hibásan tokent és nem ír részleges jogot. |
| A132-08 | Dupla beküldés, elveszett nyugta utáni ismétlés, párhuzamos ajánlat/elfogadás és tárolási hiba: egyszeri teljes hatás vagy teljes visszagörgetés; nulla soros írás is mérve. |
| A132-09 | HU teljes történetek; EN/DE célzott teljes új út és súgó; mobilos bemutató használható. Késői válaszoknál feldolgozás utáni DOM-tanú és pozitív kontroll. |
| A132-10 | Szerződés–út–próba–állítás–cáfolat kapcsolata valós. GPR-01 és ORG-N1 érintett mai leírása friss, történeti jelentés érintetlen; kimondott maradék, nincs automatikus req-5/core-zárás. |

Célzott negatív kontroll kell a visszavonási kapu, a régi tagsági időszak jogainak feléledése és az atomi véglegesítés ellen. Ne csak egy tetszőleges hibát kapjon el: a konkrét nem megengedett hatást vagy részleges tárolt állapotot mutassa ki.

A módosult mag, HTTP, i18n, tudás és böngészőút ellenőrzése egy rögzített forráson történjen. A változatlan régi eredmény örökölhető forráskötéssel. Új teljes hosszú söprés csak konkrét keresztmetszeti kockázat vagy előírt kiadási kapu miatt, egyszer; a célzottan kimaradt mérés nem zöld.

## 8. Követelménykapcsolat és határok
Az ORG-N1a/b már rögzített életciklus-maradékát teljesítjük a core-core szakaszon belül. L8 többi megvonási/felülvizsgálati klauzulája, ORG-N3 képviseleti adapter, valódi levél, Postgres, QNT24/36 és üzleti kompenzáció ettől nem készül el.

Req-5 nem puszta verzióátírás: az ORG-N1 teljes klauzulájához tartozó minden vállalt állítás tényleges bizonyítéka kell. E csomag mutassa meg a mai fennmaradó rést és a lezárási feltételt; req-5 kötelezővé emelését külön független döntésre hagyjuk. Ez ne állítsa meg a fenti működési csomag teljes befejezését.

Célzott igénykapcsolat az R13 szerint: kisvállalkozás belépő/kilépő munkatársa; több fiókot kezelő könyvelő; későbbi Shoprenter/VShop/VMarket, számlázó, eGN/agrár, gép/scanner/mérleg és AI ugyanazon személy-/fiók-/jogéletciklust kapja, saját modul vagy gépi identitás most nem épül. A célzott V2-tanulságokat a már átvett KUKA-forrásokból és a meglévő keretből használd; V2 teljes audit és módosítás nincs.

Külső elsődleges összevetés, olvasva 2026-10-01:
https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
Tény: legkisebb jogosultság, alapértelmezett elutasítás, kérésenkénti jogosultságellenőrzés és jogosultsági integrációs próbák ajánlottak. Saját VS-tervezői döntés az explicit újrahívás, az új tagsági időszak és a régi jogok automatikus felélesztésének tiltása; ez nem OWASP-tanúsítás vagy jogi képviselet-igazolás.

## 9. Új beszélgetés indítása és egyetlen átadás
Az új Claude-v3 chat ezt a SPEC-et olvassa be a Board find_document eszközével; get_current_command mutató és tényleges ágfej ellenőrzése után kezdjen dolgozni. A Board-lap és a parancs teljes tartalma azonos. Kötelező célzott forrás: R131 döntés, e SPEC, a helyi szabályok, a fent nevesített élő kód; R13/R121 és a tagság-/alap-/tiltásmodell szükséges részei. Teljes régi beszélgetésbetöltés nem kell.

Ultracode marad. Egy fő végrehajtó, automatikus agentmunka nélkül. Ha már friss beszélgetésben indultál, további új chat nem kell. A megkezdett teljes csomagot fejezd be. Csomagablak és kumulatív munkamenetmérés külön; tömörítés nem új beszélgetés; hiányzó költség null. Nincs külön fogyasztási vagy nyugtázási kör.

Az egyetlen REPORT: közérthető eredmény, A132-01…10 pontos bizonyítéktáblája, történeti kompatibilitás, releváns döntés-/forrásdelta, friss/örökölt mérések, ág/induló/mért/záró SHA, bemutatólink és rövid kipróbálási sorrend, nevesített maradék és élő Board-mátrix eltérések. A commit/push Claude feladata. A következő REPORT számát élő Boardból válaszd.

Nincs merge, éles telepítés, V2-módosítás, új fizetős szolgáltatás, külső címzettnek levél vagy core/CMD/PR-zárás. Valódi, e szerződésből nem eldönthető alapkövetelmény-ütközést pontos ellenpéldával jelezz; rutinszerű megoldási döntéseket ne adj vissza az operátornak.
