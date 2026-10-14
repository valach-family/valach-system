Repó: valach-family/valach-system

# R206 — Egységes személyállapot, működő átadási kapu és valóban kattintható bemutató
CMD-VS-300-002-002 R206 — SPEC
2026-10-14 · PR-VS-300 · STEP-VS-300-002
Feladó: chatgpt-v3 · Címzett: Claude-v3, új munkamenet
Szülő: bd30c3a2-6a0c-4853-890b-eb075287b5d3 (R205 NOTE és REPORT).

## 0. Először a parancs, utána a munka
Az operátor 2026-10-14-i iránya: gyorsabb, összefüggőbb végrehajtás; az UltraCode módot ő állítja be. Ez egyetlen végrehajtási csomag, egy végső REPORT-tal. Nem kérünk köztes PLAN-t, átvételi levelet vagy új „mehet”-et rutin döntésekhez.

ELSŐ MŰVELET: ezt a SPEC-et teljes egészében olvasd be a Boardról. A hivatkozás nem tartalomhiány és nem engedély a repóban talált másik szállítmány megkezdésére. A SPEC olvasása és a munkabázis ellenőrzése előtt nincs forrásmódosítás. Ha a Board ténylegesen nem érhető el, a konkrét hozzáférési hibát jelentsd, ne találj ki parancsot.
A szó szerinti SPEC a projekt előírt forrásdokumentumába kerüljön. Az R204_board_v1.md a vizsgált végrehajtási ágon a GitHub lekérés szerint 404 volt; keresd meg, más néven megvan-e, és ha nincs, a Board eredeti R204 szövegét is változtatás nélkül őrizd meg. Ne emlékezetből rekonstruáld.

Új munkamenet: az R205 mért kontextusmediánja 422 334, ezért a projekt meglévő 400 ezres szabálya szerint a következő önálló csomag friss beszélgetésben indul. A régi Claude feladata véget ért; nem kérünk tőle új átadó kört. Egy aktív író, alügynök nélkül.

### Munkaszervezés az operátor legújabb kérésére
Az UltraCode-ra váltás célja a megvalósítás gyorsítása és a kevesebb oda-vissza kör. A csomagot önállóan vidd végig: ne állj meg a reprodukció után javítási tervért, a javítás után bemutatótervért vagy a már engedélyezett PR-frissítés előtt új engedélyért.
A kommunikáció ne váljon önálló munkacsomaggá. Köztes státusz legfeljebb néhány mondat: mi készült el, mi a konkrét akadály, mi következik. Egyetlen záró REPORT, egy rövid Board-NOTE és a chat végén rövid továbbítható összegzés; ne másold be ugyanazt a teljes jelentést mindhárom helyre. A követelmények egy rövid táblában követhetők; a részletes futási naplók és gépi bizonyítékok fájlban maradjanak, a jelentés hivatkozzon rájuk.
A projekt kötelező SPEC-, döntés-, tanulság- és bizonyítékrögzítését teljesítsd célzottan, egyszer. Ne írj többoldalas történeti magyarázatokat a javított függvények mellé, új párhuzamos leltárat vagy minden alpontnak külön dokumentumot. A korábbi teljes jelentéseket és archívumokat ne olvasd vissza ismételten. Belső rutin döntéseket és javítási sorrendet magad válassz.
A több rendelkezésre álló kapacitást a fenti működés, a negatív és helyreálló esetek, valamint a megnyitható interaktív átadás befejezésére fordítsd. Az előírt ellenőrzések megmaradnak; opcionális teljes újraellenőrzés és öncélú jelentésbővítés nem feladat.

## 1. Ellenőrzött munkabázis és a már megadott felhatalmazás
PR #1 jelenlegi feje GitHubról: ea74d127499ccfc51de159f2357d180f6412f242, ág claude/r154-audit-fix; cél claude/ecstatic-fermi-8c23co; nyitott, nem mergelt.
Az R205 munkája a claude/cmd-vs-300-002-002-r204-2l0dva ágon áll. A jelentett 2c0a5e4030bd5e0c3af87c2f744dcdf2c3643ba2 fej a PR-fejhez képest 4 committal előrébb, 0-val hátrébb van, közös őse pontosan a PR-fej. Ezt chatgpt-v3 compare_commits-szal ellenőrizte.
A végrehajtási ág a 2c0a5e4-hez képest további két commitot tartalmaz; az összehasonlításban csak a V3_R204_REPORT.md és a V3_R205_FOGYASZTAS_LELTAR.json változik. Ezeket őrizd meg, induláskor oldd fel az ág tényleges teljes SHA-ját. Ne indulj a main-ről, és ne hagyd le az R204 kódját azért, mert még nem a PR fejágán van.

A munkád a kijelölt munkamenetágon történjen, a fenti végrehajtási ág tényleges fejére építve. A záráskor az ellenőrzött eredmény PR-fejágra történő FAST-FORWARD ÁTVEZETÉSE ENGEDÉLYEZETT, ezt már az R204 §0 és §6 is megadta. Ne kérj rá új operátori döntést. A PR-ág frissítése nem a PR merge-elése.
Friss fetch után igazold a távoli PR-fej ősviszonyát. Nincs force-push, ismeretlen távoli munka felülírása vagy ágátnevezéssel való megkerülés. Ha tényleges platform-/jogosultsági korlát tiltja az átvezetést, annak pontos elutasítását jelentsd; hozzáférési korlátot ne kerülj meg, és ne nevezd a már meglévő felhatalmazást hiányzó engedélynek.

## 2. R205 értékelése és konkrét javítandó hiányok
A vezérelt R204-K1 értékes lelet: késő beváltási válasz és elveszett /api/me után a régi személyhez tartozó siker jelent meg. A tagság szerveroldali helyességét a javítás nem ronthatja.
A beadott 155/155 böngészőeredmény Claude mérése. Chatgpt-v3 most forrást és összehasonlításokat olvasott, nem futtatott böngészőtesztet. Az eredeti, egyszeri R112-I3 történeti előfordulás pontos mechanizmusa továbbra sem bizonyítottan azonos az új reprodukcióval: ezt a két állítást ne vond össze.

Az alábbiakat a 2c0a5e4 forrásából ellenőriztem; a későbbi két dokumentumcommit nem módosítja őket:

### F206-01 — A bizonytalan kontextus csak három fejlécmezőre hat
A renderHeader ctxUnconfirmed ága átírja a header-workspace, header-subject és avatar mezőket, majd ugyanabban a függvényben:
- a header-acting-as továbbra is actingAsText(me);
- a channel-proven továbbra is a régi me.channel_proven;
- a fiókválasztó és a profil megjelenése a régi loggedIn értéktől függ;
- a profilmenü identity része a régi me.email / subject_id értéket írja ki;
- a fióklista továbbra is a régi me.workspaces alapján készül.
Ez forrásból igazolt belső ellentmondás: a három semleges felirat mellett tovább él a régi személyazonosság és fiókkínálat.

A bizonytalan állapotnak a tényleges felületen egyetlen következetes jelentése legyen. A régi személyt/fiókot sem a nyitott profilban, sem a választóban, sem a képernyőolvasónak szánt szövegben ne állítsa aktuálisnak. A régi művelet és annak bemutató-eredménye ne legyen újra beküldhető/átadható másik személynek. A meglévő szerveroldali ellenőrzés megmarad; a javítás nem kliensoldali jogosultsági rendszer.
Legyen látható, működő folytatás az állapot ellenőrzésére. Sikeres frissítés után a valós személy, fiók, nézet és értesítés együtt álljon helyre. Az ismert, szerveren már sikeres műveletet ne mondd sikertelennek; az aktuális személy azonosságának bizonytalanságát külön kezeld.

### F206-02 — Az elavult frissítés nem érvénytelenítheti az újabbat
A doRedeem minden applied:false eredménynél ctxUnconfirmed=true-t ír, a why különbségétől függetlenül. A refreshMe superseded eredménye viszont azt jelenti, hogy egy újabb frissítés elindult — akár már alkalmazta is a mai nézetet.
Ez konkrét forrásalapú kockázat, a böngészős reprodukció még hiányzik. Készíts vezérelt sorrendet: régebbi frissítés függő → újabb frissítés sikeresen alkalmazva → régebbi visszatér superseded eredménnyel. A régi hívó nem teheti újra bizonytalanná és nem írhatja felül a már igazolt frissebb képet/értesítést.
A függő újabb frissítés és a valóban elérhetetlen kiszolgáló esete külön kontroll legyen. A meglévő generáció/sorszám mechanizmust használd; nincs végtelen várakozás, automatikus újraírás vagy széttartó helyi állapotgép. Csak igazolt hibát javíts.

### F206-03 — A saját próba hiányzó felülettel is zöld lehet
A tests/e2e/v3app-r204-kontextus.spec.mjs R204-K1:
- ha nincs fejléc-elem, a rögzítő '(nincs fejléc-elem)' szöveget ad, ami teljesíti a not.toBe(carl.email) állítást;
- ha nincs látható global-notice, a sikerre vonatkozó állítást nem futtatja;
- a felhasználónak ígért bizonytalan állapot és működő folytatás pozitív ellenőrzése hiányzik.
Ne csak a rossz mondat hiányát mérd. A ténylegesen választott képernyőn látszódjon az előírt helyes állapot és használható folytatás; a profil/fiókválasztó/régi művelet se mondjon ellent neki. Mérd a helyreállást az újabb sikeres /api/me után, az új személy és a tagság változatlan helyességét, valamint azt, hogy eltüntetett állapotüzenet vagy hiányzó kötelező elem mellett a teszt piros.
Egy szűk, érdemi ellenpróba kell, nem új általános tesztrendszer.

### F206-04 — A képkészítő deklarálva van, de nem fut a kapuban
A tools/vs_verify_browser_gate.mjs CHAINS listájába bekerült a docs:kiprobalas-kepek, de a tényleges végrehajtás csak:
1. a Playwright-láncot/láncokat;
2. majd a fixen meghívott proof:demo-walk-ot
indítja. A docs:kiprobalas-kepek futtatása hiányzik. A lista jelenleg a parancsalakot ellenőrzi; nem indítja el a hozzáadott láncot.

Az R205 „bekerült a kötelező kapuba” állítása ezért végrehajtási értelemben nem teljesült. Kösd be ténylegesen, a szükséges láncok pontosan egyszer fussanak; a meglévő Playwright-egyesítés maradjon. Az új lánc indulásának, befejezésének és kimenetének legyen külön sora.
Rövid ellenpróba: a képkészítő szándékos hibája a kapu nem nulla eredményét okozza; a kihagyott hívás nem adhat ugyanilyen teljes zöldet. Teszteld a meglévő futtató szűk hívási határán, ne minden ellenpróbához a teljes többperces böngészőláncot ismételd.

A jelentett mért kód 7d713d8 és a záró 2c0a5e4 között a gate és a képkészítő is változott. Ezért a korábbi kapu eredménye nem az utólag bővített kapu futási bizonyítéka. A termékkód azonossága és a kapu azonossága két külön tény.

## 3. Az operátornak valódi kattintható bemutató kell
Az R205-ben megnevezett két var/reports fájl a végrehajtó helyi kimenete; az elérési út és a hash önmagában nem átadás. A v3_kiprobalas_kepek.mjs által készített felhasználói HTML képekből és leírásokból áll. Ez képes útmutató; nem az operátor által korábban kért „ide kattintok a valódi UX-en, ez történik, majd ott kattintok” bejárás.

Egy csomagban add át:
- A meglévő alkalmazásfelületet használó INTERAKTÍV bejárást a javított személyváltás és meghívó-elfogadás útján. A vezetés valódi vezérlőt jelöljön, várja meg a felhasználó műveletét, majd a mért következményt. Asztali és 390 px. A kilépés, folytatás, kihagyás és befejezés a meglévő tutor szabályát kövesse.
- Operátor által megnyitható artifact/csatolmány a meglévő engedélyezett átadási úton, működő linkkel a záró chatben. Ha az offline artifact a meglévő szimulált adaptert használja, ezt röviden, láthatóan jelöld; ugyanazt a felületi kódot használja, ne új, kézzel készített alternatív UX legyen. E melléklet nem szerveroldali bizonyíték.
- A valódi helyi szerver + tároló + böngésző út külön ellenőrzése a fenti célzott próbákkal. A képes útmutató és a műszaki melléklet maradhat kiegészítés, de ne nevezd őket interaktív alkalmazásnak.
Új felhős deploy nincs. A már meglévő artifact átadás nem engedély valódi adatok nyilvánossá tételére. Csak szintetikus adatok és titokmentes kimenet.
A linket/csatolmányt a címzett nézőpontjából ellenőrizd. Ha az eszköz ténylegesen nem tud letölthető artifactot adni, nevezd meg az átadási akadályt; helyi var/ útvonal alapján ne állítsd késznek az átadást.

A módosított működés nyelvcsomagjai, súgó/help, FAQ, oldaltérkép, AI-segéd, Molin-jellegű chat és tutor a közös tudásforrásból kövesse a tényleges állapotot minden bekapcsolt nyelven. Ahol nincs tartalmi változás, nincs öncélú újraírás. Nincs élő AI-hívás vagy új VS-oldali szabad szövegértelmező.

## 4. Ami most nem indít újabb kört
R176-K3: új tény nélkül most NEM kérek harmadik általános reprodukciós kampányt. A történeti hiba nyitott megfigyelési tétel marad; a szokásos célzott/böngészős kapu futása és meglévő naplózása marad. Ha e csomag közben új előfordulás ad konkrét sorrendet, annak közvetlen javítása belefér; véletlen ismételt futtatással ne keresd napokig.
personal.ownMatters: továbbra is meg nem épített üzleti képesség. A valós állapotszöveg és a nyitott lefedési hiány megmarad. Nincs kitalált jegyzet-/ügy-/rendelésmodul, és nincs új teljes üzleti leltár.
Az R202 eszközblokk nem nyílik újra. Nincs rekurzív digest-tervezés, kriptográfiai bizonyítékprojekt vagy általános review-kampány. Codex GitHub review és helyettesítő automatikus AI-review kikapcsolva marad.

## 5. Végrehajtás, ellenőrzés, PR-frissítés
Sorrend: SPEC + bázis → fenti célzott reprodukció és kódjavítás → pozitív/negatív kontrollok → interaktív átadás → egy végső kötelező böngésző-kapu → ellenőrzött fast-forward a PR fejágára → egy REPORT.
A célzott próbák igazolják a teljes felhasználói állapotot, a tiltó és helyreálló utat. A meglévő R112/R176 kapcsolódó esetek, i18n/tutor és a közvetlenül érintett projektkapuk fussanak. A teljes böngésző-kapu a végső termék- és kapukódon egyszer fusson; saját konkrét hibánál előbb célzott javítás/újramérés, teljes ismétlés csak tényleges érintettség miatt. A mag és a külső 17-es lánc csak valódi bemeneti érintettség vagy konkrét kötelező kapu miatt induljon, ne az UltraCode beállítás miatt.

A tágabb felhasználói keretet az összefüggő megvalósításra használd; nem cél a maradék limit elköltése. Nincs sűrű polling, tartós figyelő vagy korlátlan újrapróbálkozás. A fogyasztást a meglévő szabály szerint a feladatcsoportok végén mérd, nagy kimenetet ne tölts be ismételten. Ha a most rögzített csomag közben a chatváltási sáv elérődik, a megkezdett blokk lezárása a meglévő szabály szerint végezhető; új feladatot ne csatolj hozzá.

Push előtt friss távoli fej + ősviszony + tiszta/megmagyarázott munkafa; push után a GitHubról olvasd vissza a PR tényleges teljes fej-SHA-ját. A PR leírása az új fejet és valós mérési hatókört mondja. Nem kell új operátori engedély az itt pontosan engedélyezett fast-forwardhoz; platformtilalom esetén annak konkrét tényét jelenteni kell.

## 6. Egyetlen záró átadás
Egy új szabad körön egy REPORT és egy NOTE, mindkettő fejlécében a TÉNYLEGES új körszám; az „R206 végrehajtása” alcím lehet. A korábbi R205 Board-lap R204-es belső fejlécét ne vidd tovább új hibaként.
Teljes induló, mért kód-, kapu- és végső PR-SHA; F206-01…04 tételes eredménye; valódi szerveres próba és szimulált artifact külön; címzettnek működő bemutatólink/csatolmány; új/újrahasznált/nem futott mérések; R176-K3 és Saját ügyek nyitott állapota; fogyasztási sor.
A szerveres részleges bizonyíték nem teljes elfogadás. A zöld kapu nem független AI-review és nem merge-engedély. Régi nyitott tünetet ne törölj pusztán egy új pozitív futástól.
A chat végén önmagában érthető ÜZENET A CHATGPT-V3-NAK és a tényleges Board-reference.

Engedélyezett: a fenti V3 termék-, célzott próba-, közvetlen kapubekötés-, tudás-/nyelv-, demo- és dokumentációmódosítás, commit, push és ellenőrzött fast-forward a PR fejágára.
Nincs merge, deploy, force-push, V2-/production-módosítás, titok-/felhős adat-/beállításmódosítás, fizetős infrastruktúra, alügynök, automatikus AI-review, CMD/PR lezárás. REPORT után leállás.
