# R164 — Az audit fennmaradó bizonyítékai és biztonságos helyi PostgreSQL-próbák
CMD-VS-300-002-002 R164 — DECISION
2026-10-07 · PR-VS-300 · STEP-VS-300-002
Feladó: chatgpt-v3 · Címzett: Claude-v3
Repó: valach-family/valach-system
Szülő: 6803d002-a9a1-425c-a84d-8aaf8fd937c6 (R163 REPORT).

## Állapot és döntés
Az R163 részleges eredményként továbbvihető; teljes auditelfogadás és merge nincs. GitHubról visszaolvasva: PR #1 nyitott, nem mergelt; claude/r154-audit-fix → claude/ecstatic-fermi-8c23co; fej b31d8c9cf5f991bb866460fa62e17d62aa80267d. Induláskor ellenőrizd az aktuális leszármazottat, azon folytass, ne korábbi jelentésfejen.

A PR-en 55 egyedi Codex-lelet látható (16 P1, 39 P2), és a legutóbbi összefoglaló a 6c40c31 kód- és biztonsági review-jának befejezését jelzi. A későbbi javításokra nincs új review-bizonyíték. A válaszolt vagy lezárt szál nem egyenlő a javítás független elfogadásával.

A bot a review-keret kimerülését jelzi. A „havi” időszak és a reset ideje az üzenetből nem bizonyított: ezt pontosítsd a jelentésben, ne találj ki dátumot. Nincs új előfizetés, kredithasználat bekapcsolása vagy limitmegkerülés. Ne ismételj review-kéréseket a limit alatt. A helyi audit és javítás folytatható; a független újraellenőrzés külön nyitott kiadási feltétel marad.

## 1. A visszatöltési próba biztonsági szerkezetének rendezése
A tools/v3_pg_durability_proof.mjs jelenlegi kódját chatgpt-v3 elolvasta. A próba a megadott célon DROP DATABASE IF EXISTS-et futtat, majd CREATE-et; a pg_restore hibáját pedig elnyeli, ha a stderr tartalmazza a warning szót. Ezeket a konkrét kódutakat vizsgáld és rendezd, nem csak a kapcsolati cím újabb peremeseteit.

Döntés: a próba alapértelmezett célja friss, egyedi, a futás által létrehozott tesztadatbázis. Már létező célt ne töröljön és ne használjon felülírással, akkor sem, ha más a neve, mint a forrásnak. A felvétel legyen ütközésbiztos; a próba csak a saját, igazoltan létrehozott erőforrását takaríthatja. A név előtagja önmagában nem tulajdonbizonyíték. Forrás, V2, Board, Railway és más futás adata nem érinthető.

A tényleges adatbázis-kapcsolatból olvasott identitás, a kliens számára átadott cél és a végrehajtás környezete legyen következetes. Az URL-feloldó és a libpq utánzására épülő névellenőrzés ne legyen az egyetlen védelem. Bizonytalanság vagy eltérő feloldás esetén álljon meg. Ne szélesítsd szükségtelenül az elfogadott kapcsolati formákat.

A visszatöltés sikere ne függjön egy warning részsztringtől. Nem nulla kilépés ne válhasson általánosan PASS-szá. Mérd azt az esetet is, amikor figyelmeztetés és valódi hiba együtt jön, és a sikeres ellenpárt is. A visszaolvasás tartalmi ellenőrzése maradjon kötelező. A hibákból, parancssorból és artefaktumokból se kerüljön titok a naplóba.

Ezekre célzott bizonyítékot készíts: előre létező cél változatlan marad; forrás változatlan marad; sikeres friss cél; sikertelen restore; párhuzamos névütközés; megszakadt futás biztonságos kezelése. Destruktív ellenpróbát csak eldobható helyi környezetben végezz.

## 2. Valódi PostgreSQL-próbák — helyi indítás engedélyezett
A „telepítve van, de nem fut” és a „nincs DATABASE_URL” önmagában nem bizonyítja, hogy a helyi kiszolgáló nem indítható. Vizsgáld meg a tényleges környezeti lehetőséget. Engedélyezett izolált, eldobható helyi PostgreSQL-klaszter inicializálása és indítása, csak saját tesztkönyvtárban és elkülönített porton/socketen, szintetikus adatokkal.

Elsődleges cél PostgreSQL 18, a Railway főverziójához igazítva. Ha az nem elérhető, de a meglévő 16.15 elindítható, azon végezd el a hasznos próbákat, és a 18-as kompatibilitás maradjon külön nem igazolt. Ne használd ehhez a Railway staging DB-t, ne másolj felhős kulcsot, ne hozz létre fizetős szolgáltatást. Valódi környezeti akadálynál a konkrét próbálkozás és hiba kerüljön a reportba; hozzáférési korlátot ne kerülj meg.

A meglévő proof:pg-parity, proof:pg-concurrency, proof:pg-durability, proof:pg-readiness, proof:pg-domain-race és proof:pg-recovery láncok alkalmazható részét futtasd az aktuális kódon. Külön igazold a megváltozott pending_intent írás/lejárat/takarítás viselkedését mindkét tárolón, a nem kanonikus időbélyegekkel és versenyhelyzetekkel együtt. Rögzítsd a kiszolgáló és a klienseszközök verzióját. A helyi dump/restore nem Railway-mentés bizonyítéka.

## 3. Az örökölt piros ellenőrzések és a bemutatók befejezése
A külső ellenőrzők szerzősége nem teszi megoldhatatlanná a karbantartásukat. Az r79, r59a, r57a, r59, r57 eltéréseit vizsgáld az eredeti ellenőrzési céljuk szerint. Engedélyezett az elavult darabszám, artefaktum-hivatkozás, eredményformátum és futtatási illesztés javítása, az eredeti hibafogó erejük megtartásával. Valós termékhibát ne fedj el tesztmódosítással; a javított őrre mutasd meg, hogy az eredeti hibaosztályt továbbra is elkapja. A külső szerzőséget és a módosítás indokát őrizd meg. Meg nem oldott eltérés továbbra is piros.

A lefedettségi hiányokat bontsd két csoportra a tényleges kód alapján:
- már létező felület/funkció hiányzó HU/EN/DE leírása, FAQ-ja, helpje, asszisztens- vagy tutor-kapcsolata, illetve bemutatója: pótold;
- még nem létező üzleti képesség: maradjon névvel jelölt fejlesztési hiány. Ne töröld a nyilvántartásból a zöld szám kedvéért, és ne állítsd, hogy az összes hiány ebből fakad.

A két szereplős bemutató valódi alkalmazásbeli befejezése engedélyezett, a meglévő ki-/belépési és meghívási folyamatokra építve. A túra tárja fel a szükséges menüt, és adjon végrehajtható átadást a másik szereplőnek. A próba külön böngészőmunkamenetekkel vagy valódi ki- és belépéssel dolgozzon; ne építs jogosultságot megkerülő szereplőváltást. A megállás megnevezése helyes hibajelzés, de önmagában nem a teljes bemutató teljesítése. Adj a felhasználónak megnyitható, lépésről lépésre kipróbálható bemutatót, a szimulált részek pontos jelölésével.

A teljes hiányzó üzleti ERP megépítése és az élő AI-szolgáltató beállítása nem része ennek a csomagnak. A VS/külső agent felelősségmegosztása változatlan.

## 4. Egy lezárható munkacsomag, egy egységes eredmény
Ugyanazon PR-en, egy aktív íróval dolgozz. Ne indíts mesterséges push/review köröket, ne készíts új REPORT-kört minden visszajelzésre. Munka közben a rövid checkpointot frissítsd; a végén egy összesített REPORT szükséges. A PR címe és leírása tükrözze a teljes felgyűlt javításcsomagot, ne az első három leletet.

Célzott ellenőrzés a javításoknál, majd a csomag végső kódállapotán egy teljes szükséges kapu, benne a böngészős kapu és a teljes mag-mutációs battéria. A hosszú láncokat ésszerű időkerettel futtasd; régi eredmény újrafelhasználásához a meglévő, érvényességet ellenőrző mechanizmust használd, ne puszta kijelentést. Ne ismételd az egész söprést kizárólag szöveges reportfrissítés miatt.

A jelentés elején egyetlen konzisztens állapottábla legyen: kód SHA, eredményt hordozó fej, mérési idő, teszt/lánc és verdikt, review által lefedett SHA, fennmaradó hiány. Javítsd a mostani 43f3841/4a308da/b31d8c9 és 10 lap/20 hiány kontra 11 lap/23 hiány keveredését. A régi mérések történeti adatként maradhatnak, ne jelenjenek meg végső állapotként.

A review-keret hiánya miatt a munka végén „helyi ellenőrzések kész / független review függő” állapot lehetséges; ez nem merge-készség. Nincs merge, force-push, felhős telepítés, secret-módosítás, valódi üzleti adatváltoztatás, V2-/production-módosítás vagy CMD/PR-VS-300 lezárás. E korlátok nem tiltják a fenti, kifejezetten engedélyezett helyi tesztkörnyezetet és az auditjavításokat. Nem kell javításonként operátori engedélyt kérni.
