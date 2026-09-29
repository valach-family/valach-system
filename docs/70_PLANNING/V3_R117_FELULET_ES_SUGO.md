> **Kör:** R117 · **Sáv:** Claude-v3 · **Állapot:** lezárt

Repó: valach-system

# R117 — AZ ÖT HASZNÁLATI ÚT FELÜLETE ÉS SÚGÓJA BEFEJEZVE (A KILENC DÖNTÉS ÁTVEZETVE)

CMD-VS-300-002-002 R117 — REPORT (válasz az R116 SPEC-re)
PR-VS-300 · STEP-VS-300-002 · 2026-09-29
Sáv: Claude-v3 · Parancs: `CMD-VS-300-002-002 R116 — SPEC` (chatgpt-v3) · szülő: R115

**Forrás-kötés:** repó `valach-family/valach-system` · induló fej **`f76ef3b9670b7c75f2e0c8a8bdf7fd6da84c60e9`**
(a `claude/focused-sagan-gfuieq` ág TÉNYLEGES feje induláskor — nem állítottam vissza az ágat). A parancs
„utolsó függetlenül vizsgált feje", `ea093056…`, ennek őse — gépileg ellenőrizve
(`git merge-base --is-ancestor`); a kettő között csak az R114 és az R116 szövegének elmentése és az R115
levele áll. A parancs szó szerint: `v3ref/source-documents/R116_board_v1.md`. A munka commitjai:
**`1952ab4`** (a szöveg- és felület-csomag) · **`fd30dcc`** (a bizonyíték első újramérése) ·
**`6760cba`** (ez a lap + a francia próbanyelv átállítása) · **`116d339`** (a lap R117-re állítva és a
mutációs battéria eredménye — **EZEN a commiton futott a végső mérés**) · és a záró commit a
végső bizonyíték-lappal. A munka a
`claude/cmd-vs-300-002-002-r116-b1e4no` ágra megy fel, a fenti fejről indítva. Merge, telepítés,
V2-módosítás, új üzleti modul, jogosultsági modellváltás, core/CMD/PR-zárás nem történt.

---

## 1. RÖVIDEN — MI VÁLTOZOTT, MIRE JÓ

- **Egy szó egy dolgot jelent.** A „bemutató" eddig KÉT különböző dologra állt a képernyőn: a
  mintaadatos környezetre és a lépésről lépésre vezető segítségre. Aki azt olvasta, hogy „a bemutató
  nem kattint helyetted", nem tudhatta, melyikről van szó. Mostantól a mintaadatos környezet
  **Próbafelület**, a vezetett segítség **Lépésenkénti útmutató**, és a kilépés gombja kimondja, mit
  zár be: **„Útmutató bezárása"**. Ugyanez angolul (*test area* · *step-by-step guide*) és németül
  (*Testbereich* · *Schritt-für-Schritt-Anleitung*).
- **A kipróbáló lap megmondja, mit lehet kipróbálni.** A kezdőlap kérdése **„Mit szeretnél
  kipróbálni?"**, és hat kártya következik felhasználói néven: Személyes fiók · Vállalkozás
  hozzáadása · Munkatárs meghívása · Váltás a fiókok között · Hozzáférések kezelése · Probléma a
  meghívóval. Minden kártyán **két rövid mondat**: mit csinálsz, és mi lesz az eredménye.
- **A fejlesztői beszéd lekerült az előtérből.** A körszámok, a „bizonyító próba zöld" és a hasonló
  mondatok a lenyitható **„Ellenőrzési részletek"** alá kerültek — ott viszont ott van a mérés
  dátuma és a forrás-commit is. A mintaadat jelölése végig látszik a lap tetején: *„Itt
  mintaadatokkal próbálhatod ki a lépéseket. Nem küldünk meghívót, és nem módosítunk valódi
  adatokat."*
- **A lap kezelője is a felhasználó nyelvén szól.** Eddig a kipróbáló lap gombjai és feliratai
  magyarul voltak BEÉGETVE a generátorba: aki angolra vagy németre váltott, magyar kezelőt kapott a
  lefordított képernyők körül. Most ezek is a közös nyelvcsomagból jönnek — nincs külön bemutatós
  szótár.
- **Négy szövegdöntés a valódi képernyőkön.** A tag paneljén a megtekintés szakasza megnevezi a
  fiókot (*„Adatok megtekintése — Minta Kft"*). A megerősítetlen e-mail sora kimondja az állapotot, és
  **mellette áll a valóban elérhető következő művelet** (új megerősítő levél kérése). A vállalkozási
  fiók súgója a MAI ország/azonosító-követelményt magyarázza el. A „Riportok" menücsoport neve
  **Kimutatások**, és angolul a két hiányállapot végre két külön szó: *Not provided* (nem adták meg)
  ≠ *Unknown* (nem ismert).

**Amit ez NEM jelent.** Nem nyelvi lektorálás: az átnézést és a fordítást AI végezte, anyanyelvi
lektor nem olvasta. Nem készültségi jelentés: a V3 továbbra sem kész nagyvállalati rendszer, nincs
benne számlázás, adózás vagy üzleti mini modul. A QNT24/36 és alapelvei változatlanok.

---

## 2. A KILENC DÖNTÉS — ÁLLAPOT

| # | Döntés (R114) | Állapot | Hol látszik |
|---|---|---|---|
| 1 | Próbafelület · mintaadatok / Lépésenkénti útmutató / „Útmutató bezárása"; a Kijelentkezés marad | **teljesült** | a lap tetején a sáv · a súgó buboréka · `TOURUI` · `STATE.demo` — mindhárom nyelven |
| 2 | Megtekintési sablon: „Adatok megtekintése — {fiók}", a változó NÉV | **teljesült** | a tag panelje (`TPL.dataViewingOf`), képernyőn ellenőrizve |
| 3 | „Az e-mail-címed még nincs megerősítve." + a ténylegesen elérhető következő művelet, igazolás-állítás nélkül | **teljesült** | profilmenü + Saját profil oldal; a gomb ugyanaz az újraküldés, ami eddig is működött |
| 4 | A vállalkozási fiók súgója a jelenlegi ország/azonosító-követelményt magyarázza | **teljesült** | `KB.account.add_business` · `FAQ.faq.business.taxId` — a szabály nem változott |
| 5 | „Riportok" → „Kimutatások"; EN „Not provided" ≠ „Unknown" | **teljesült** | a bal menü csoportcíme · `STATE.notGiven` / `STATE.unknownQty` / `QUALITY` |
| 6 | „Mit szeretnél kipróbálni?" + hat kártyanév | **teljesült** | a kipróbáló lap kezdőlapja, három nyelven |
| 7 | Kártyánként legfeljebb két rövid, cselekvést és eredményt magyarázó mondat | **teljesült** | a hat kártya szövege (`STORY`), a példamondat szó szerint átvéve |
| 8 | A fejlesztői részletek lenyitható „Ellenőrzési részletek" alá, dátummal és eredettel; a szimuláció jelölése látható marad | **teljesült** | a lap sávja · minden út alján a lenyíló · a „Súgó és képernyők" mód lenyílója |
| 9 | Közös HU/EN/DE forrás; nincs külön bemutatós szövegforrás | **teljesült** | új `STORYUI` csoport a három nyelvcsomagban; a generátorban és a lejátszóban nem maradt beégetett felirat |

**Nyitott tétel a kilencből: nincs.** Ami maradt, az a 7. szakasz maradéklistája — az NEM ezekből a
döntésekből való.

---

## 3. AMIT A DÖNTÉSEKBŐL KÖVETKEZETT — ÉS KÜLÖN KIMONDOK

Az 1. döntés a vezetett segítségnek az **„útmutató"** szót adta. Ez a szó eddig MÁST jelentett a
rendszerben: a súgó cikkeit hívtuk így (Súgó → Útmutatók, „keresés az útmutatókban", „nincs
ellenőrzött útmutató"). Ha mindkettő marad, a 9. döntés sérül — ugyanarra a dologra két szó, és egy
szóra két dolog. Ezért a súgó cikkeinek neve **„Leírások"** lett (angolul *Topics*, németül
*Themen*); a szövegek eddig is „leírásnak" hívták a tartalmukat, tehát ez nem új fogalom, hanem a
meglévő szó következetes használata. Ez **35 mondatot** érintett magyarul és ugyanennyit a másik két
nyelven. **Ez nem önálló döntés, hanem az 1. és a 9. döntés együttes következménye** — kimondom,
mert a hatóköre nagyobb, mint amit a döntés szövege szó szerint nevesít.

**Gépi jel a visszacsúszásra.** A három csomag kerülendő-listája (`TERMS_AVOID`) mostantól pirosra
váltja a mérést, ha a régi szó visszakerül a felhasználói szövegbe: magyarul a `bemutató`, angolul a
`demo|walkthrough|tour`, németül a `Demo|Rundgang`. A `TERMS` tábla a `walkthrough` helyett három
fogalmat visz: `guidedTour` · `helpTopic` · `sandbox`. Ez nem a figyelemre támaszkodik:
`npm run verify:i18n` (I18N08) futtatja.

---

## 4. A KIPRÓBÁLHATÓ LAP — MEGNYITÁS ÉS SORREND

**Megnyitás:** a válaszban adott artifact-link (az operátor ezt nyitja meg; másnak a lap Megosztás
menüjéből adható) — ugyanez a repóban: `docs/_olvashato/V3_R112_TORTENETEK_BEMUTATO.html` (a meglévő
generátor írja: `npm run docs:r89-bemutato`). **Új bemutató-platform nem készült**, a csatorna
ugyanaz.

**Kipróbálási sorrend (kb. 8 perc):**

1. Nyisd meg a linket. Felül a sárga sáv: **„Próbafelület · mintaadatok"**, alatta a mondat, ami
   kimondja, hogy nem megy ki meghívó és nem módosul valódi adat.
2. A kezdőlapon a kérdés: **„Mit szeretnél kipróbálni?"** — válaszd a **Személyes fiók** kártyát, és
   kattints végig a hat lépésen. Minden lépésnél fent a magyarázat, középen a képernyő képe, alatta a
   megnyomható gomb; kattintás után a látható eredmény és a „Tovább".
3. A nyelvválasztó lépésnél válts nyelvet, majd lépj ki és be: a lap megmutatja, hogy a nyelv
   megmarad.
4. **Vissza a választáshoz**, és válaszd a **Munkatárs meghívása** utat: a fiókkezelő meghív, a
   címzett belép, elfogad, és a vállalkozás fiókjába kerül.
5. A **Probléma a meghívóval** úton nézd meg a más címre szóló, a lejárt és a már felhasznált
   meghívót — mindegyiknél azt, hogy mit mond a lap, és mi a következő lépés.
6. Bármelyik út alján nyisd le az **„Ellenőrzési részletek"** részt: ott áll a mért eredmény, a mérés
   dátuma és a forrás-commit. Ami nincs mérve, ott „nem mért" áll — nem zöld.
7. Válts a fejlécben **angolra és németre**, és nézd meg keskeny ablakban vagy telefonon is: a kezelő
   szövege is fordul, és nincs vízszintes kilógás.

**Mi mintaadat, mi bizonyított:** a lap képernyői a valódi alkalmazás EGYSZERŰSÍTETT képei,
szintetikus adattal (`pelda.hu` címek, „Minta Kft"). A feliratok és az eredmény-mondatok viszont a
valódi nyelvcsomagokból jönnek — nincs második szövegváltozat. Hogy a valódi alkalmazás ugyanezt
teszi-e, azt az „Ellenőrzési részletek" alatt felsorolt böngészős próbák mérik.

---

## 5. A BIZONYÍTÉK — TÉNYLEGES PARANCSOK ÉS EREDMÉNYEK

### 5.1 Böngészős próbák (Playwright · Chromium · valódi HTTP-szerver és adatbázis)

`npx playwright test` a **`116d339`** commiton, a munkafa TISZTA állapotában
(`git diff --quiet HEAD -- v3app tests tools` — a mért bemenet karakterre a commit fája):

**92/92 zöld, 4,4 perc.** (A csomag közben egyszer már végigfutott, ugyancsak 92/92 zölden — a
végső szám a fenti commité.) Ebben benne van az öt történet és a meghívó-helyzetek teljes köre
(R112-I1…I5 · R112-S1…S5 · R112-D1…D3), a kilenc lépésenkénti útmutató végigvitele (R93-01…03), a
három nyelv megmaradása (R97-01/02), és az R81 huszonkét UX-feltétele.

**A történet-bizonyíték újramérve:** `node tools/v3_r89_bemutato.mjs --from-report <a futás
jelentése>` → `docs/70_PLANNING/V3_R112_TORTENETEK_BIZONYITEK.json`: **41 bizonyíték-bejegyzés, 44
próba-futás, mind zöld**, hiányzó bejegyzés nincs. Mérve `2026-09-29T16:24:18Z`, commit `116d339`.
Ez ugyanaz a darabszám, mint az R113-ban — bizonyíték nem veszett el.

### 5.2 Gépi őrök (a végső állapoton)

| Parancs | Eredmény |
|---|---|
| `npm run verify:i18n` | **49/49 PASS · ellenpróba 6/6** — hu/en/de mind **687/687 kulcs**, 0 hiány · 0 árva · 0 helyőrző-eltérés |
| `npm run verify:tutor` | **86/86 PASS · ellenpróba 14/14** |
| `npm run verify:assistant` | **55/55 PASS · ellenpróba 6/6** |
| `npm run verify:app-selfcheck` | **57/57 PASS** |
| `npm run verify:app-findings` (R75) | **73/73 PASS** |
| `…-r77` · `…-r79` · `…-r89` · `…-r91` · `…-r95` | **34/34** · **49/49** · **41/41** · **30/30** · **42/42** |
| `npm run verify:kuka` | **501/501 PASS** |
| `npm run verify:doc-html` · `verify:artifact-naming` | **9/9** · **28/28 PASS** |
| `npm run verify:external-decisions` | **44/44 PASS** |
| `npm run verify:sweep-reuse` · `release-order` · `decision-numbers` | **43/43** · **37/37** · **4/4 PASS** |

**A söprés összverdiktje NEM ZÖLD, és ezt kimondom.** `npm run verify:sweep -- --skip
verify:external-checks,verify:v3ref`: **25 verifierből 24 zöld · 1 piros · 2 lánc NEM FUTOTT — NEM
IGAZOLT.**

- **A piros: `verify:capability-witness`** (8/11 egyezik — 3 elavult rögzítés). **Nem ez a csomag
  okozza:** a saját munkám ELŐTTI állapoton (a változásokat félretéve) MÉRVE ugyanez a
  `8/11`-es eredmény áll. A tétel a V2 repóban élő board-regisztert (`matrix-capabilities.json`) méri
  a V3 fájljaihoz; a rögzítés frissítése V2-módosítás lenne, amit ez a parancs kizár.
- **A két nem futott lánc** a mag mutációs battériája és a külső ellenőrző lánc. A parancs kimondja:
  „Változatlan core-ra nem kell automatikus teljes mutációs/külső söprés." A mag változatlansága
  MÉRVE: `git diff --stat ea09305..HEAD -- v3ref/` csak a boardról elmentett SPEC-lapokat mutatja, a
  mag moduljait nem. **A `verify:v3ref` ettől függetlenül külön lefutott ebben a körben, és ZÖLD**
  (204/204 mutáció elkapva — a 8. szakasz részletezi); a `verify:external-checks` NEM futott.
  **Amit ez NEM jelent:** a kihagyást nem „újrahasznált bizonyítéknak" hívom; a feloldó (SRU-01)
  nem oldott fel commitot, tehát a helyes szó a NEM IGAZOLT (KUKA-200).

### 5.3 Amit a képernyőn olvastam el (nem gépi mérés)

A parancs kikötése: „A szótárra kötött gépi próba mellett képernyőn is olvasd el a mondatokat." Ezt
megtettem, és a leolvasott szöveget kiírattam:

- **A kipróbáló lap**: kezdőlap + egy teljes út + mindkét lenyíló, **asztali (1280×860) és keskeny
  (390×844) nézetben, mindhárom nyelven**. Vízszintes kilógás mindenütt **0 px**.
- **A valódi alkalmazás megváltoztatott képernyői**: bal menü (Kimutatások) · a tag panelje (a
  megtekintés-szakasz a fiók nevével) · a súgó panel négy füle · az „Új fiók hozzáadása" képernyő ·
  és a **megerősítetlen** e-mailű felhasználó profilmenüje. Ez utóbbi állapot elérhető: a
  megerősítés nélküli belépés lehetséges, és a menüben a mondat mellett ott a gomb.

---

## 6. AMIT MUNKA KÖZBEN TALÁLTAM ÉS JAVÍTOTTAM

1. **Kétszer ugyanaz a szó a tag panelén.** A nem engedélyezett adatkör sora a mondatban ÉS a jelölőn
   is azt írta: „Nincs engedélyezve". A mondat mostantól a következményt mondja meg: *„Most nem tudja
   megtekinteni"*, a jelölő marad az állapot. (Nem az R114-ből ered — a 2. döntés képernyőjén
   olvasva tűnt fel.)
2. **A lenyitható részletek listájában összefolyt két mondat.** A magyarázó sor a listaelem
   szövegéhez tapadt („…bekapcsolt termék-nyelv.A kulcsok megléte…"); most saját sorba kerül.
3. **Egy mondat nem volt igaz.** A „Súgó és képernyők" mód részletei azt írták, hogy a futási
   bizonyíték „az Ellenőrzési részletek alatt olvasható" — miközben pont ott állt a mondat. Most
   megmondja, hol van valójában: a Használati utak alatt, minden út végén.
4. **A mérés száma kikerült a mindig látszó fejlécből.** Az első alakomban az „Ellenőrzési
   részletek" összecsukott fejléce is vitte a „…próba zöld" számot — a 8. döntés viszont pont ezt a
   megfogalmazást nevezi meg fejlesztőinek. A szám most a lenyíló ALATT áll.
5. **Egy halott kulcs.** A `UI.dataViewing` a 2. döntés után sehol nem hívódott; kivettem mindhárom
   csomagból, hogy ne maradjon szöveg, amit senki nem olvas.

---

## 7. ŐSZINTE MARADÉKLISTA — AMI NEM KÉSZÜLT EL

- **Nem független anyanyelvi lektorálás.** Az angol és a német szöveget AI írta és nézte át;
  anyanyelvi lektor nem olvasta. Az „értelmileg egyezik" állítást a kulcs- és helyőrző-mérés
  támasztja alá, a stílust nem méri gép.
- **A `verify:capability-witness` piros marad** (3 elavult rögzítés). A javítása a V2 repó
  board-regiszterének átírása lenne — ez a parancs V2-módosítást kizár. Nevesített, nem elfedett.
- **A külső ellenőrző lánc (`verify:external-checks`) nem futott** (lásd 5.2 és 8.) — a hivatkozott
  állapot NEM IGAZOLT, nem zöld. (A mutációs lánc külön lefutott és zöld.)
- **A két próbanyelv (francia, arab írásirány-próba) szándékosan hiányos marad**, és nem volt a
  hatókörben.
- **Az élő MI-szolgáltatói mérés továbbra is nyitott** (`npm run kapcsolat:ai` ·
  `npm run proof:assistant-live`): a segéd ágát helyi csonkkal mérjük, ez nem élő eredmény.
- **Az R112-I3 egyszeri bukása** továbbra is ismert, azonosítatlan okú tétel. Ebben a körben
  **kétszer futott végig zölden** (a csomag közbeni és a végső teljes futásban). A parancs szerint
  újabb előfordulás nélkül tömeges ismétlést nem indítottam; ha előjön, a rögzített állapotból kell
  diagnosztizálni.
- **A „Leírások" átnevezés a felhasználónak ÚJ szó.** Aki a korábbi képernyőt ismerte, a Súgó
  második fülét „Útmutatók" néven kereste. A régi néven nincs átirányítás — a kereső-szinonimák
  (`SEARCH`) viszont megtartották a korábbi szavakat is.

---

## 8. A KÉT HOSSZÚ LÁNC ÁLLAPOTA

- **`npm run verify:v3ref` — LEFUTOTT, ZÖLD.** A söprésen KÍVÜL, külön indítva: **204 mutáció · 204
  elkapva · 0 túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony**; 36 egység, mind belefér az
  idő-korlátba (legrosszabb egység 7 929 ms a 15 000 ms-os keretben), a beadvány-kapu (MRG-01)
  BEFOGADTA, a lefedettség **204/204**, hiány és duplikátum nincs. Verdikt: *TELJES ÉS TISZTA*.
  Gépi végeredmény: `v3ref/v3ref-mutation-result.json`. **A lánc saját kimondott korlátja megmarad:**
  az egység-fájl nincs kriptográfiailag a futásához kötve — a forrás-lenyomat egyezése szűkít, de nem
  bizonyít (nevesített függő: aláírt egység-tanú). A norma-lánc 135 elvárt klauzula-sorából **78 FEDETT**,
  hiányzó és idegen sor nincs — ez a mai szerződés állapota, nem ennek a körnek a hiánya.
- **`npm run verify:external-checks` — NEM FUTOTT, tehát NEM IGAZOLT.** A parancs a változatlan magra
  nem kéri, és a mag változatlansága mérve van (5.2). **Nem hívom „újrahasznált bizonyítéknak":** a
  feloldó (SRU-01) nem oldott fel commitot, ezért a helyes szó a NEM IGAZOLT (KUKA-200). Emiatt a
  söprés ÖSSZVERDIKTJE nem zöld, akkor sem, ha a mutációs lánc külön zölden lefutott.

---

## 9. MUNKAMENET ÉS FOGYASZTÁS — KÜLÖN

Friss munkamenet, a parancs kikötése szerint. A mérés a csomag ablakára (a parancs board-időbélyegétől):
`npm run meres:fogyasztas -- --session auto --from 2026-09-29T12:44:22.315Z`

- **hívás: 149** · **fő-szál kontextusmedián: 320 666** · maximum: **441 091**
- **ügynök-bemenet: 0 (0 ügynök)** — egy fő végrehajtó, külön ellenőrző ügynök nélkül
- **cache-olvasás: 44 819 705** · lefedettség: teljes
- **sáv: FIGYELMEZTETÉS** (320 666 a 300 000–400 000 sávban) — a rend szerint megállni nem kell, új
  beszélgetést nem kérünk; a következő önálló nagy blokk indul friss beszélgetésben.
- **Költség: ismeretlen (`null`).** Heti limitarányt és megtakarítást ebből nem számolok.

---

## 10. A VÁLTOZÁS DARABJAI

| Fájl | Mi változott |
|---|---|
| `v3app/public/i18n/hu.mjs` · `en.mjs` · `de.mjs` | a kilenc döntés szövegei · az új `STORYUI` csoport (34 kulcs) · `TPL.dataViewingOf` · `TPL.storySteps` · `TPL.evidenceGreen` · `UI.cannotView` · a `TERMS`/`TERMS_AVOID` átállítása |
| `v3app/public/i18n/dict.mjs` | a `STORYUI` csoport bejegyzése a szerződéses csoport-listába |
| `v3app/public/app.js` | a tag paneljének megtekintés-szakasza a fiók nevével · az újraküldés gombja a profilmenüben és a Saját profil oldalon · a kétszeres felirat javítása |
| `tools/v3_r89_bemutato.mjs` | a lap kerete (sáv · módok · legördülők · lenyíló) a nyelvcsomagból; a beégetett magyar feliratok megszűntek; egy elrendezési javítás |
| `tools/lib/v3_tortenet_lejatszo.page.js` | a kezdőlap, a kártyák, a lejátszó és az „Ellenőrzési részletek" — mind a nyelvcsomagból |
| `tests/e2e/…` (5 fájl) | a szövegfüggő állítások a nyelvcsomagból olvassák a mondatot (KUKA-237); viselkedési állítás nem gyengült |
| `docs/70_PLANNING/V3_R112_TORTENETEK_BIZONYITEK.json` | a bizonyíték újramérve a tiszta commiton |
| `docs/70_PLANNING/V3_R75_…json` · `V3_R81_UX_ELFOGADAS.json` | a futás által újraírt elfogadási lapok (a szövegváltozás átvezetése) |

---

## 11. MI A KÖVETKEZŐ

Ez a csomag a felületi és szövegbeli maradékot zárja. A következő blokk tárgya nem ebből következik —
a döntés a tervező-ellenőrző sávé. Az elfogadott működés újraengedélyeztetése nem feladat; merge,
telepítés és zárás ebben a körben nem történt.
