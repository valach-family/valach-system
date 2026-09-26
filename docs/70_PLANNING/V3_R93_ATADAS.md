> **Kör:** R93 · **Sáv:** Claude-v3 · **Állapot:** élő (átadás egy FRISS munkamenetnek)

# R93 — ÁTADÁS: a befejező csomag friss munkamenetben indul

**Miért ez a lap, és miért NEM a javítás.** Az R93 parancs első működési szabálya (F93-04/2):
*„A végrehajtó ellenőrizze a session-azonosítót és kezdést… Ha csak a régi munkamenetben tud
dolgozni, ezt **indulás előtt jelezze; ne folytassa észrevétlenül**."* Megmértem, és a mérés szerint
**ez a munkamenet a régi** — ezért a csomag itt NEM indul el, hanem ez a forráshoz kötött átadás
készült el. Új Claude-beszélgetést az OPERÁTOR nyit; az ügynök magát nem tudja újraindítani.

## 1. A MÉRT TÉNYEK (nem becslés)

| mit | érték |
|---|---|
| munkamenet-azonosító | `495e48b5-33ea-5833-9c76-5457e902f51f` (`env:CLAUDE_CODE_SESSION_ID`) |
| a munkamenet MÉRT kezdete | **2026-09-26T07:44:43Z** — ez vitte az **R89**-et és az **R91**-et is |
| az R93 board-parancs ideje | 2026-09-26T13:42:51Z |
| fő-szál kontextus az R93 ablak **6. hívásánál** | **medián 756 112** · max 766 806 token |
| a kísérleti jelző | 200 000 (fő-szál medián) — **átlépve, 3,8-szorosan**, még a munka megkezdése előtt |
| az R91 csomag maximuma volt | 712 774 — a mai INDULÁS ennél is nagyobb |
| ügynök | 0 |

**Mérés:** `npm run meres:fogyasztas -- --session auto --from 2026-09-26T13:42:51Z --quick`.
**Amit ez bizonyít:** az örökölt teher nem feltevés, hanem mért kezdőállapot. **Amit NEM:** hogy a
friss munkamenet minden fogyasztási kérdést megold (a hívásszám és a saját kimenet külön tényező —
ezt az R93 lap is kimondja).

## 2. A FORRÁS-KÖTÉS

- **Ág:** `claude/cmd-vs-300-002-002-r89-l1y9ui` (ezen kell folytatni, `main`-re NEM váltunk).
- **A parancs által ellenőrzött fej:** `ce38f823efc3432af1ecc9b9796f66434f59b5df` (az R91 csomag).
- **A parancs lapja a boardon:** `CMD-VS-300-002-002 R93 — ANALYSIS`, doc-kulcs
  `20260926_V3_R93_R92_ELLENORZES` — **a friss munkamenet ELŐBB ezt olvassa el teljes egészében**
  (`find_document`), mert a tervezési döntéseket az a lap hozza meg. Ez az átadás nem helyettesíti.
- **Az előző kör lapja:** `docs/70_PLANNING/V3_R91_HASZNALATI_UTAK.md` · leltár
  `V3_R91_ELFOGADAS.json` · fogyasztás `V3_R91_FOGYASZTAS_LELTAR.json`.

## 3. AMI MÁR ELFOGADOTT (meg kell tartani, nem újratervezni)

A külső ellenőrző fél saját futásán: R91 HTTP **30/30** · tutor **78+10** · assistant **54+6** ·
i18n **41+5** · selfcheck **57** · R89+R91 böngésző-fájlok **12/12**. Elfogadva: a mentés nélküli
hamis befejezés javítása · a nyilvános nyelvválasztó és a tárolt személyes választás · a
szerver-oldali szövegek · az Új beszélgetés és a hatfordulós korlát · a hiányzó/idegen/elavult
jelölő, a téves nyelv-deklaráció és a túl hosszú válasz elutasítása · a három kérő-állapot
elérhetőségi mérése és a hibás paraméterek · a rövidebb bemutató-jelzés és az emberi forrás-címek.

## 4. AMI HÁTRAVAN — F93-01…05 (a döntések a board-lapon, itt a MUNKA-LISTA)

**F93-01 — a bemutatót a TELJES úton kell lezárni.** Valódi cégalapítás után az öt elvégzett lépéses
buborék a képernyőn marad, a Befejezés viszont **összegzés nélkül** tünteti el, mert a
`refreshMe → resetViewCaches` közben már törölte a futás állapotát (a `tourTaskDone` sorrendcsere
ezért nem elég). Kell: közös **állapot + DOM életciklus**, a saját, igazolt siker lezárása még a régi
futásból, és a megjelenített buborék következetes takarítása. **Minden deklarált bemutatót a
TÉNYLEGES végéig kell mérni** — a mostani R91-03 próba a kiemelést, a várakozást ÉS a megszakadást
egyaránt sikernek veszi, tehát csak INDULÁSI próba; normál úton a `targetMissing`/`contextChanged`
nem elfogadási eredmény. A hozzáférés-adásnál valódi tag + valódi engedély-mentés + lezárás kell.

**F93-02 — a választott nyelv és a késő válasz ugyanahhoz az úthoz tartozzon.** (a) Belépés előtt
németre állított felület + német HTTP-regisztráció/megerősítés után az **első UI-belépés magyar
lapot ad**: új személynél a `refreshMe → restoreLang` az üres személyes tárból a böngésző alapnyelvére
esik. Kell: ismert személynél a tárolt választás, **új személynél az aktuális, tudatosan választott
nyelv átvitele**, a régi anonim maradvány és az AKTÍV választás megkülönböztetése. (b) `hu → de → hu`
oda-vissza váltás után a visszatartott régi chat-válasz **megjelenik**, mert a kód csak a nyelv
ÉRTÉKÉT hasonlítja: kell **monoton nyelv-/kérés-életciklus azonosító**, ugyanez védje a
`loadHelpData`-t és a bemutató újraszövegezését, és az **elavult válasz ne írja át az újabb kérés
`sending` állapotát**. Mérendő mátrix: HU/EN/DE regisztráció → levél → megerősítés → első belépés ·
ismert személy újrabelépése · személyváltás · oda-vissza nyelvváltás · késleltetett tudás- és
chat-válasz — **minden bekapcsolt nyelvre alkalmazható szabállyal**.

**F93-03 — valódi forrásból származó válasz, megnyitható hivatkozással.** A helyes `invite.send@1.2.0`
+ `de` jelölővel ellátott **hamis** mondat („A Vshop már éles számlákat állít ki.") ma
`ok:true`/`model` választ kap: a mostani ellenőrzés **hivatkozás- és formátum-ellenőrzés**, nem
tartalmi bizonyítás — ezért az „IGAZOLT forrással" megfogalmazás túlmegy a mérten. Döntés: az
alapértelmezett válasz **ellenőrzött, lokalizált tudás-blokkokból** épüljön; a modell kiválaszthat
azonosítót/blokkot, de a **szerver** ellenőrzi az elérhetőséget, verziót, nyelvet és a TÉNYLEGES
tartalmat, és **ő jeleníti meg a forrás-szöveget**. Egyenértékű, bizonyítottan teljesítő szűk
megoldás megengedett; **második, drága modell-bíró és szolgáltató-vásárlás NINCS**. Mérni kell a
HELYES utat is (nem a modell kikapcsolása a javítás), a hamis állítást, a nem létező képességet, a
helyes jelölővel rossz nyelvet, az ellentmondó idézetet és az elavult forrást. A **chat forrás-címe
kattintásra nyissa meg** a megfelelő útmutatót/GYIK-t (`chat.mjs/sourceLine` ma csak `li` szöveg),
üzleti írás nélkül. A HU/EN/DE szövegek **tényleges átnézése** kell (a kulcs-egyezés nem lektorálás);
nevezett hibák: „a »Új fiók hozzáadása«" · „nem törli semmit".

**F93-04 — fogyasztás.** Friss munkamenet (ez a lap), session-azonosító és kezdés ellenőrzése,
olcsó helyi jelző az induláskor és feladatcsoportok után; célzott olvasás, teljes napló FÁJLBA, a
képernyőre csak összegzés és hibás sor. Ha a régi nyers napló elérhető, **helyi szkripttel**
tartalom nélküli hívás-sorok/időpontok — a naplót NEM töltjük modell-kontextusba; ha nem elérhető,
azt ki kell mondani (hiányzó adat utólag nem válik méréssé). A záró pillanatkép ideje és a kimaradt
publikálási szakasz legyen világos (az R91-es leltár 12:43:20Z-kor zárt, a REPORT 12:52:20Z-kor
készült — a köztes munka nincs benne).

**F93-05 — a lezárás csak a mért állítást mondja.** A leltárban KÜLÖN: forrás-indulás · a mért
végrehajtható fájlkészlet **hash-manifesztje** (vagy előre rögzített kód-commit + külön
report-commit) · a jelentést hordozó commit — a „36 változott fájl" NEM tartalom-azonosító.
Teszt-fájl neve mellé **futási tanú** (forrás · parancs · hatókör · eredmény). Az indulási próba nem
teljes út. A hosszú láncnál az „elindult, nem fejeződött be / eredmény nem igazolt" NEM ugyanaz, mint
a meg sem indult futás. A V2 capability-witness három eltérése beadott mérés — **a katalógust nem a
zöld jelért állítjuk át**.

## 5. A KERET (változatlan)

Nincs merge, telepítés, V2-módosítás, új előfizetés, új üzleti Mini modul, core-core/CMD/PR-zárás.
Az élő AI hiánya külső hiány maradhat; **a helyi csonk nem élő AI-bizonyíték**. A 16/13 klauzula nem
százalék. Az R19 24 QNT-követelménye és 36 esete megmarad. Egy feladat, **párhuzamos második
végrehajtó nélkül**. A következő kör számát a boardból kell venni (az R93-on már áll az ANALYSIS lap
és a parancs-üzenet). A kommunikáció legalább fele közérthető magyar haladás-magyarázat.
