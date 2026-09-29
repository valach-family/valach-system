# R109 — Meghívott felhasználó végigvezetése és egységes, érthető felületi szövegek

CMD-VS-300-002-002 R109 — SPEC
2026-09-29 · PR-VS-300 · STEP-VS-300-002
Tervező és ellenőrző: chatgpt-v3. Végrehajtó: Claude-v3.
Felhasználói engedély: „mehetünk tovább”.

## Mi készül, és mire jó?
A fejlesztési futtató javítása lezárult. Most egy felhasználó számára látható termékblokk következik: a meghívott ember értse, hová hívták, melyik személyes fiókjával lép be, mit kap az elfogadással, és mit tehet, ha elakad. Ugyanebben a blokkban a meglévő alkalmazás és tutor szövegeit egységesen, röviden és érthetően rendezzük magyarul, angolul és németül.

Ez meglévő képességek befejezése, nem a jogosultsági rendszer újratervezése. A tervezési irányt ez a parancs adja; a belső megoldás részleteit nem az operátornak kell kitalálnia. Egy összesített REPORT és kipróbálható bemutató a cél.

## Forrás és kiindulás
Repo: valach-family/valach-system.
Ág: claude/focused-sagan-gfuieq.
Ellenőrzött induló fej: 2ce0872ce8b14898f709608802db84e840c4e4e6.
Szülő: R108 NOTE, 10b6fe73-97c8-4adb-8653-dae8d0b2c102.
Board induláskor: R107 done; R109 még nem volt.
R108 elfogadva: saját mérő-önellenőrzés 18/18 és hét külön CLI-határértékpróba sikeres. Ez a munkarendi átvezetés elfogadása, nem termék- vagy megtakarítási állítás.

A termékhiányok hiteles előzménye R95 ANALYSIS és R94 REPORT §8. A kilenc korábbi túra R95-ben saját teljes böngészős futással elfogadva; a nyelvmegőrzés későbbi elfogadása és a futtató R107 elfogadása megmarad. A jelenlegi invite.accept regisztráció még tour:null/tour_note állapotú. Induláskor ellenőrizd az aktuális parancsot és fejet; idegen munkát ne írj felül. Ne töltsd be újra a teljes R1–R108 történetet: e lap, R107 munkarend, a kötelező helyi szabályok és a célzott források szükségesek.

## P109-01 — Meghívó elfogadása: saját képernyőről használható segítség
A meglévő meghívóképernyőn legyen rövid magyarázat, kapcsolódó GYIK és innen indítható kattintós útmutató. Nem kell meghívó nélkül láthatóvá tenni védett meghívásadatokat, és nem kell a súgó főoldaláról mesterséges meghívót létrehozni.

A képernyő meglévő, jogosan megjeleníthető adatai alapján:
- Legyen egyértelmű a célvállalkozás/munkatér és a felajánlott hozzáférés. Kizárólag a szerver által megengedett adat jelenjen meg.
- A személyes belépés és a vállalkozáshoz csatlakozás külön lépés. A meghívás nem új személyes fiók és nem automatikus tulajdonosi jogosultság.
- Bejelentkezés/regisztráció szükségességénél a meglévő út folytatható legyen; a meghívás kontextusa biztonságosan megmaradjon, token ne kerüljön chatbe vagy nyilvános bizonyítékba.
- Másik ember fiókjával belépve legyen érthető javítási út. Sem a tutor, sem az AI nem válthat identitást vagy fogadhat el meghívót a felhasználó helyett.
- A tényleges elfogadás önálló, kifejezett felhasználói kattintás. A bemutató következő/befejezés gombja nem helyettesíti. Csak a szerver igazolt sikere zárhatja sikeresen a feladatot.
- Lejárt, visszavont jogosultságú, ismeretlen, már felhasznált, megváltozott feltételű vagy eltérő címzetthez tartozó meghívás ne kapjon hamis sikerállapotot. A szerver meglévő döntése és elutasítási oka maradjon irányadó.
- Siker után egyértelmű visszajelzés és továbbhaladás az érintett fiókhoz. Másik fiók/személy/nyelv közben történő váltása ne hagyjon régi buborékot, késő választ vagy idegen állapotot.

Javasolt magyar alapszövegek, a tényleges állapothoz igazítva:
„Meghívás a(z) {vállalkozás} fiókjába” helyett természetes névelőfüggetlen cím: „Meghívás” és alatta a vállalkozás neve.
Gomb: „Meghívás elfogadása”.
Súgó: „A meghívás elfogadásával a megadott hozzáférést kapod ehhez a fiókhoz.”
Siker: „Elfogadtad a meghívást.” Gomb: „Fiók megnyitása”.
Lejárat: „Ez a meghívás lejárt. Kérj új meghívót attól, aki küldte.”
Eltérő személy: „Másik fiókkal vagy bejelentkezve. Jelentkezz be azzal a fiókkal, amelyhez a meghívás tartozik.”
Biztonsági okból nem megjeleníthető címzettadatot e szövegek kedvéért se adj ki.

A közös tutor-regisztert, tudásblokkokat, GYIK-et, oldaltérképet és meglévő chatmagyarázatot együtt vezesd át. Az AST-05 forrásszöveg-szerződés és az írásmentes segédhatár megmarad. Ne induljon új AI-szolgáltató vagy külső modellmérés.

## P109-02 — A meglévő felület és tutor teljes, körülhatárolt nyelvi átnézése
Hatókör: az aktuális v3app felhasználói képernyői, üres/hiba/sikerállapotai, űrlapjai, levelei és tutoranyagának HU/EN/DE szövegei. Történeti jelentések, fejlesztői naplók, V2 és jövőbeli modulok nem részei.

A cél nem szótárkulcs-egyezés vagy névelő-regex, hanem tartalmi és nyelvi átnézés. Rövid, aktív mondatok; a gomb nevezze meg a cselekvést; a hiba mondja meg a következő használható lépést. Egy fogalom ugyanazt jelentse a képernyőn, levélben, GYIK-ben és túrában. Személyes fiók, kezelt vállalkozási fiók, tagság és hozzáférés ne mosódjon össze. A közös fiókválasztó, személyes menü és V2-höz igazított keret megmarad; nincs oldalanként új felületi logika.

A technikai azonosító, receipt, scope, tenant, fixture, provider, hash nem mindennapi felületi magyarázat. Szükséges diagnosztika külön lenyitható részben maradhat. A mintaadat-jelölés legyen világos, de ne nyomja el a feladatot. Ne ígérj kész számlázást, éles AI-t, hatósági igazolást vagy kész üzleti modult.

Készíts rövid, feladathoz kötött terminológiai megfeleltetést a meglévő otthonában; ne új hosszú gyökérdokumentumot. A három nyelv természetes szöveg legyen. Új nyelv ugyanazt a regisztert és működést használja; ne legyen három kódág. A francia aktiválása most nem feladat, a bővíthetőség megőrzendő.

A REPORT nevezze meg pontosan az átnézett szövegkészletet és módszert. AI által végzett átnézés nem független anyanyelvi lektorálás. Kimaradt rész legyen nevesítve, ne „teljes” állítás mögé rejtve.

## P109-03 — Kipróbálható, hiteles bemutató és célzott ellenőrzés
Készüljön a változott forrásból megnyitható bemutató: új meghívott ember, már regisztrált ember, hibás/lejárt meghívó. A bemutató egyértelműen szimuláció; a valódi HTTP+böngészős bizonyíték külön. A hivatkozások és kapcsolódó fájlok működését ténylegesen ellenőrizd, ne újabb „page not found” legyen az átadás. Telepítés nem engedélyezett; a meglévő bemutató-előállító és publikálási csatorna használható.

Szükséges próbák:
1. Valódi szintetikus meghívó küldése → címzett meglévő belépési/regisztrációs útja → saját képernyős súgó/túra → kifejezett elfogadás → igazolt tagság/hozzáférés és megfelelő fiók. HU/EN/DE.
2. Elutasítási állapotok és a segítség megnyitása/bezárása/kihagyása ne okozzon tagsági vagy jogosultsági írást; ismételt kattintás ne duplázzon. A már felhasznált meghívó a meglévő szerződés szerint viselkedjen.
3. Fiók-/személy-/nyelvváltás és késő válasz célzott ellenpróbái; kijelentkezés/újrabelépés után nyelvmegőrzés.
4. A módosult közös tutorviselkedés érintett korábbi útjai; a kilenc teljes túra egyszeri regressziója indokolt, ha a közös túramotort módosítod.
5. Nyelvkulcs-, tudásregiszter-, helyettesítés- és megjelenési ellenőrzések, asztali és keskeny nézetben. Ezek nem helyettesítik a szöveg tartalmi átnézését.

Célzott teszt az alapértelmezett. Változatlan core, futtató és teljes hosszú külső lánc ne fusson újra automatikusan. Megnevezett új kockázat esetén csak a hozzá szükséges kör bővüljön. A korábbi piros/hiányos core- és V2-bizonyíték ettől nem lesz zöld.

## Munkarend, határ és átadás
E lap előre körülhatárolt egyetlen termékblokk; ne növeld közben korlátlanul. A jelenlegi Claude-chat használható az R107 szerint: 300k csak figyelmeztetés; 400k-nál a már megkezdett blokk lezárható, következő nagy blokk friss chatben. Induláskor a meglévő mérővel nézd meg az aktuális állapotot, ne csak az R108 régi pillanatképét használd. 400k fölött még meg nem kezdett blokkhoz az R107 szerinti rövid átadás szükséges. Nincs körszám szerinti chatváltás.

Az operátor tudatos ultracode-választása megmarad; nincs előírt modellváltás. Egy fő végrehajtó; legfeljebb egy indokolt, szűk ellenőrző, nem kötelező agentindítás. Alügynök ne olvassa újra az egész történetet; minden rá vonatkozó kötelező szabályt ismerjen. Folyamatos polling, üres commit-ébresztések, öncélú dokumentumhalmozás ne legyen.

Egy végső REPORT: mi változott a használatban, P109-01…03 eredmény, tényleges parancsok/futási eredmények, változott fájlok, kódcommit és bizonyítékforrás/manifeszt, kipróbálási út, pontos maradékhiányok. A csomag fogyasztását a parancs időbélyegétől tartalommentes sorokkal mérd, a kumulatív chatjelzőt külön; a végső pillanatkép és publikálási farok legyen megkülönböztetve. Ismeretlen költség null, heti-limit- vagy megtakarítási arány nem következtethető.

Nincs merge, telepítés, V2-módosítás, új üzleti mini modul, új előfizetés vagy teljes core-core/CMD/PR-zárás. 16 elfogadott/13 részleges nem százalék. QNT24/36 megmarad: ismeretlen mennyiség kezelhető, utólagos mérés nem írja át a becslés múltját, pontosítás nem készletmozgás.
A kommunikáció legalább fele közérthető magyar haladásmagyarázat. A következő REPORT számát a Board aktuális állapotából vedd; köztes visszaigazolás nem szükséges.
