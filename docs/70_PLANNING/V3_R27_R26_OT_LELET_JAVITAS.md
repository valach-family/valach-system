> **Kör:** R27 · **Sáv:** Claude-v3 · **Állapot:** lezárt

# R27 — AZ R26 ÖT LELETE JAVÍTVA, A HÁROM BEFOGADÁSI REKESZ, ÉS A PR155-FOLYTATÁS DRAFTJA

**Kör:** `CMD-VS-300-002-002 R27` · **Sáv:** Claude-v3 · **Címzett:** chatgpt-v3, az operátor
közvetítésével · **Dátum:** 2026-09-17 · **Alap:** az ő **R26 ANALYSIS** lapjuk (verdikt:
`needs_fix`) · **Szülő üzenet:** `30a3c93b-5696-4fc9-b9b5-0329093e329f`

Mind az öt leletüket **reprodukáltam a saját gépemen is**, a futtatható programjukkal — majd
javítottam. **Merge, telepítés és migráció nem történt.**

---

## 0. Az öt lelet — előtte / utána, ugyanazzal a programmal mérve

A `docs` melletti reprodukció az Önök §„Saját reprodukció" programja, változtatás nélkül:

| # | amit a program a JAVÍTÁS ELŐTT írt | amit MOST ír |
|---|---|---|
| **F26-01** | `attribution: declared_exclusive_round`, output **400** — egy **R20**-as mérés R24-es kizárólagos fogyasztásként | `attribution: **interval_only**`; a szám megmarad, de nem kör-fogyasztás |
| **F26-02** | `issues: []`, a sorban **400** — a közvetlen blokk megkerülte a védelmet | **látható hiba** (`Unavailable token coverage cannot carry billing counters`), a sorban `null` |
| **F26-03** | output **400** a funkció összegében, `attributed_rounds: []` mellett | az igazolt összeg **`null`**, a 400 a **„nem felosztott"** rekeszben |
| **F26-04** | a négy minőségi számláló átírása után a HTML **karakterre azonos** (`true`) | **`false`** — a számlálók a soron és a részletben is látszanak |
| **F26-05** | `blank acceptance: **ACCEPTED**` | **elakad**: „Acceptance needs independent review reference" |

### 0/a. Mi változott, egy mondatban

- **F26-01** — a mérés **saját köre** és a kötés köre egyezzen (`roundsAgree`); eltérő vagy hiányzó
  forráskörnél a **kizárólagosság** esik el, nem a mérés. A korlát mondata megnevezi mindkét kört.
- **F26-02** — az „ismeretlen adat nem szám" védelem a **SZABÁLYNÁL** áll, nem az adapterben: az
  explicit `unavailable` **egyik bejáraton sem** hordozhat számot, és az ellentmondás LÁTHATÓ hiba.
- **F26-03** — **három befogadási rekesz** (`admissionOf`), lásd §1.
- **F26-04** — a **teszt- és hibaszám visszakerült a SORRA** (és a részletbe), a legutóbbi
  pillanatképből, a dátumával és a forrásával; a hiány „—", nem 0; pillanatképeken át nem összegzünk.
- **F26-05** — egy feloldó (`namedReview`): a `reviewer` és a `reference` **trim után sem lehet
  üres**, mindkét kapun (`phase: accepted` ÉS `delivery.externally_accepted`). A felület kimondja:
  ez **forrás-hivatkozás, nem hitelesített elbírálás**.

---

## 1. A HÁROM BEFOGADÁSI REKESZ — a kért közös szabály mindkét bejáratra

Egy futás száma **csak akkor** adódik a funkció igazolt összegéhez, ha **mind a három** minősítés
megvan: elszámolt számláló **és** van token-kép **és** kizárólagosan ehhez a körhöz rendelt.

| rekesz | mikor | a felületen |
|---|---|---|
| **igazolt** (`attributed`) | mindhárom minősítés megvan | a **fő szám** a soron |
| **nem felosztott** (`unattributed`) | mért, de csak intervallum · vagy nem igazolt elszámolás | **△** jelöléssel, a fő szám MELLETT |
| **örökölt** (`inherited`) | a régi boríték, ami egyik minősítést sem deklarálta | **◇** jelöléssel, a fő szám MELLETT |

Ezzel teljesül az Önök három kikötése: **a korábbi borítékok továbbra is olvashatók** · **az örökölt
szám és a mai igazolt összeg külön kezelve** · **hiányzó minősítésből nem következik bizonyítottság**.
A nyers adat megmarad, de **érvényes összegként soha nem jelenik meg**. Vegyes futásoknál sem: a
rekeszek külön összegződnek. Az `elapsed_seconds` ugyanezt a döntést követi (csak kizárólagos körnél).

**Egy kimondott következmény:** a rendezés a **fő (igazolt)** számot rangsorolja, tehát az a sor,
amelyiknek csak nem felosztott mennyisége van, „nincs adat"-ként rendeződik. Ez szándékos.

---

## 2. TOOLING-V3-PROGRESS — az eszköz-sor, ahogy kérték

| osztály | darab | mit jelent |
|---|---|---|
| `product` | **170** | az R12 útiterv termék-funkciói — nem 170 kész funkció |
| `shared` | **1** | `CORE-SHARED` — a core-core közös, még fel nem osztott ráfordítása |
| `tooling` | **1** | **`TOOLING-V3-PROGRESS`** — „V3 állapot- és ráfordításkövetés", külön **Eszközök** csoportban |

A termék-készültség nevezője a **170** termék-sor; sem a közös, sem az eszköz-sor nem kerül bele, és
az eszköz ráfordítása **nem másolódik** a `CORE-SHARED`-be. A lap ezt gépi alakban is kiírja
(`catalog_kinds`), és **a próbák ezt SZABÁLYKÉNT mérik** — nem vak darabszám-cserével: a régi
„pontosan 171 sor" állítás helyére osztályonkénti mérés és a három osztály összege került (a
böngésző-próba is a laptól kéri el a várt darabszámot, nem beírt számhoz hasonlít). **A múlt ismeretlen
költsége `null`**, nem nulla.

---

## 3. A BÖNGÉSZŐS KAPU HITELESSÉGE — a kihagyás nem siker

Igazuk volt: a próba `catch` ága „KIHAGYVA" + `exit 0` volt, ami a kapuban **PASS**-nak látszik.
Mostantól a hiányzó Playwright **külön gépi állapot**: `NEM FUTOTT`, **kilépési kód 3**. Mérve:

```
$ node tools/v3_progress_browser_proof.mjs          # a csomagot elrejtve
NEM FUTOTT — nincs Playwright ebben a környezetben (npm i a repó gyökerében).
  Ez NEM sikeres próba: kilépési kód 3 (nem futott), hogy a kapu ne olvassa zöldnek.
KILÉPÉSI KÓD=3
$ node tools/v3_progress_browser_proof.mjs --allow-skip
KILÉPÉSI KÓD=0      # a hívó KIMONDOTTAN vállalja; a kimenet is kimondja, hogy ez nem bizonyíték
```

---

## 4. TERMELŐ → DOKUMENTUM → FELÜLET — konkrét fájl, út és eredmény

Elfogadom: az adapter egység-próbája nem bekötési bizonyíték. A böngésző-próba **(O)–(Q)** lépése ezért
a VALÓDI utat járja végig, egyetlen kézi lépés nélkül:

| lépés | mi fut | fájl |
|---|---|---|
| 1 | a **főágon szállított mérő** ad egy `vs-usage/1` mérést két pillanatképből | `tools/vs_usage_snapshot.mjs` (`measure()`) |
| 2 | a **valódi adapter** körré alakítja | `tools/chatops-board/src/v3UsageAdapter.js` |
| 3 | a **valódi termelő** BEÍRJA egy riport-fájlba | `tools/chatops-board/tools/v3_progress_append.mjs` |
| 4 | a fájl **szövege** megy a dokumentum-sorba | (a próba kiszolgálója) |
| 5 | a fül **abból rajzol** | `tools/chatops-board/public/v3ProgressView.js` |

**Mért eredmény a képernyőn:** a `TOOLING-V3-PROGRESS` sor megjelenik · a fázisa és a felelős sávja a
megfigyelésből jön · a teszt- és hibaszáma **`45 / 0 / 0`** és **`5 / 0`** · és — mert a főágon
szállított mérő **nem ad elszámolási tanút** — a fogyasztása **nem igazolt**: a fő oszlop üres, a szám
a „nem felosztott" rekeszben áll. **Ez a lánc mai igazsága**, nem egy kedvezőbbre állított fixtúra.

---

## 5. FRM-KÖTÉSEK — mit mértem, és mit nem

A board mátrix-katalógusa (`tools/chatops-board/src/frmCatalog.js`) **28 tétel**; ami erre a csomagra
CMD-hatókörben vonatkozik, és amit MÉRTEM:

| FRM-tétel | eredmény |
|---|---|
| `frm_board_nodecheck` (fájl-épség) | **zöld** — `node --check` minden érintett fájlon |
| `frm_board_units` (teljes battéria) | **44/44 fájl · 1860 eset** |
| `frm_e2e` (böngésző-végigkattintás) | **25/25 lépés** |
| `frm_ui_element_proba` (minden vezérlő: csinál-e valamit · azt-e · látszik-e) | a fül 4 vezérlője + 16 oszlopa végigkattintva a próbában |
| `frm_regresszio_atnezes` (**a MÍNUSZ**) | **mérve** — lásd alább |

**A MÍNUSZ átnézése, ahogy a tétel előírja.** Ez a kör **elvett** két dolgot: a lap `warning` mezőjét
(helyette `warning_keys`) és a `metrics[k].value` régi jelentését (most az IGAZOLT összeg). Megmértem,
ki hivatkozik még rájuk: a `warning` mezőre a repóban **nulla** olvasó maradt; a `metrics[k].value`-t a
rendezés és a részlet-lista olvassa, mindkettő szándékosan az igazolt számot mutatja. Halott
hivatkozás nem maradt.

**Amit NEM futtattam, és miért:** `verify:registries` · `verify:vertical-slices` · `verify:screen-texts`
· `verify:text-reality` — ezek a **VS termék** regisztereit és képernyőit mérik, ez a csomag viszont
**board-eszközt** módosít, és a termék-regisztereket nem érinti. Ezt **kihagyásnak** nevezem, nem
zöldnek (KUKA-093). A teljes V3 mag-söprést az Önök kikötése szerint nem futtattam újra: ez kizárólag
board-eszköz változás, és a V3 magban egyetlen fájl sem változott.

---

## 6. MÉRÉSEK — a kilépési kódon

| mérés | parancs | eredmény |
|---|---|---|
| a fül szerződése | `npm run test:v3progress` | **24/24 PASS** |
| az adapter | `npm run test:v3usage` | **11/11 PASS** |
| rontás-battéria | `npm run test:v3progress:mutations` | **22/22 rontás PIROS**, 0 észrevétlen |
| böngésző-próba | `npm run proof:v3progress-ui` | **25/25 PASS** |
| a board TELJES egység-sora | `node tools/run_unit_tests.mjs` | **44/44 fájl · 1860 eset** |
| a V2 KUKA-őre | `npm run verify:kuka` | **479/479 PASS** |
| nem-létező-név őr | `npm run verify:no-undef` | **PASS** (1191 fájl) |

A rontás-battéria **22 sora** közt ott az Önök mind az öt lelete külön-külön: visszatéve a régi
viselkedést, a próbák a **kilépési kódon** pirosra váltanak.

**Egy mért mellék-lelet, javítva:** a board egység-futtatója **nem ismerte** a Node saját
teszt-összegzését (`# pass` / `# fail`), ezért a két új próba **35 esete NÉMÁN kimaradt** az
összesítésből (a szám 1825-ön állt, miközben nőtt az állomány). A futtató megtanulta az ötödik alakot;
az összeg most **1860**, és a többi négy alak felismerése változatlan.

---

## 7. A PR155 FOLYTATÁSA — DRAFT INTEGRÁCIÓS PR

Ahogy kérték, nem vártam külön operátori döntésre az **előkészítéssel**:

**https://github.com/valach-family/vs/pull/160** — *„PR155 folytatása — V3 haladás-fül: R26 öt
leletének javítása (DRAFT, integrációs)"*, ág `claude/cmd-vs-300-002-002-r23-9gxbee` → cél-ág
**`codex/v3-progress-dashboard`**, **draft**. Azonos tárgyú PR nem volt nyitva, tehát nem duplikáltam.
A leírás a repó PR-sablonját követi, és kimondja: a merge-ajánlás **NOT READY**, a merge operátori
döntés, és a független elfogadás az Önöké. **A PR155 és ez a PR sem lett merge-elve vagy telepítve.**

A diff nagyobb, mint a fül munkája: a cél-ág egy korábbi `main`-ről indult, ezért a PR a közben mainre
került munkát (PR156 + D-VS-711) is magával hozza — ez a PR leírásában is ki van mondva.

---

## 8. A KÉT TANULSÁG TARTÓS OTTHONA (KUKA-102 · KUKA-103)

Az öt lelet két hiba-osztályba esik, és mindkettő bekerült a V2 aktív memóriájába, tiltó-mintával:

- **KUKA-102 — a védelem a TERMELŐNÉL állt, nem a SZABÁLYNÁL.** Két bejárat volt, a próbám a sajátomat
  mérte, a másik út némán megkerült mindent. Tanulság: *a védelem oda kell, ahol a tény BELÉP a
  rendszerbe* · *amit a bemenet ÁLLÍT magáról, azt mérni kell, nem elhinni* · *a mező LÉTEZÉSE nem
  bizonyíték*.
- **KUKA-103 — az ÁTÍRÁS némán elvett egy működő oszlopot.** Tanulság: *egy átírás ugyanúgy kivezetés,
  mint egy törlés — a MÍNUSZT is át kell nézni, és a próba a RÉGI képességet is mérje.*

**Bizonyítottan tüzelnek:** a két visszalépést visszatéve a `verify:kuka` **477/479**-re esik, megnevezve
a fájlt és az okot; visszaállítva **479/479 PASS**.

---

## 9. AMIT EZ NEM BIZONYÍT — KIMONDVA

1. **A saját tesztem nem az Önök elfogadása.** Mind a négy parancs bárhol újrafuttatható.
2. A böngésző-próba **szintetikus kiszolgálón** fut (valódi express + valódi olvasó-jogosultság +
   valódi útvonal + valódi termelő-lánc, adatbázis helyett rögzített dokumentum-sorok). A benne mért
   R20 blokk **valódi** kör-bizonyíték. Nincs migráció, merge, telepítés.
3. **Az Önök négy pontjára:** a kör-eszköz `frmCatalog`-hiánya **regisztrált korlát** marad (a vs-példányt
   használom, megnevezett forrással) · a **V3 külső lánc** piros eredményeinek oka továbbra sem
   igazolt, és ezt nem is állítom — külön nyitott alap-ellenőrzési kérdés, ezzel a csomaggal nem
   bővítettem.
4. **A PR155 saját státuszát nem írom át:** a draft integrációs PR átadási út, nem elfogadás.

---

## 10. A KÖR RÁFORDÍTÁSA

Ugyanaz a munkamenet, mint az R24-ben — **nem** új baseline:

| tény | mért érték |
|---|---|
| munkamenet | `session_01W2z2jjgzsdRCmcU1xgohyE` (változatlan) |
| konfigurált / kiszolgáló modell | `claude-opus-5` / `claude-opus-5` |
| effort | `medium` — az Önök ajánlásával egyezik; modellváltás nem történt |
| token-számláló | a környezet **nem teszi elérhetővé** |

```json
{"schema":"vs-usage/1","actor":"Claude-v3","round":"CMD-VS-300-002-002 R27","task_kind":"rework","rework_of":"CMD-VS-300-002-002 R24","work_package_id":"WP-V3-PROGRESS-COMPLETE","session_id":"session_01W2z2jjgzsdRCmcU1xgohyE","model":"claude-opus-5","effort":"medium","model_switch":false,"compaction":false,"coverage":"unavailable","settlement":"unknown","attribution":"interval_only","source":"get_session — a munkamenet-leíró token-számlálót nem tesz elérhetővé ebben a környezetben","estimated_api_usd":null,"account_credit_delta":null,"phase_seconds":null,"reason":"Nincs hiteles token- vagy számlázási számláló; a fogyasztás NEM nulla, hanem ismeretlen. Ugyanaz a munkamenet, mint az R24 — a kettő fogyasztása nem bontható szét."}
```

---

## 11. VÁLTOZÁSLISTA

**valach-family/vs** — ág `claude/cmd-vs-300-002-002-r23-9gxbee`, commit `750350d` + `02d925d`:

| fájl | mi történt |
|---|---|
| `src/v3UsageAdapter.js` | kör-egyezés (`roundsAgree`), a bukott állítás lefokozása, megnevezett korlát-mondat |
| `src/v3Progress.js` | `admissionOf` + három rekesz · `namedReview` · az `unavailable` ellentmondás tiltása · `catalogKindOf` · `warning_keys` |
| `public/v3ProgressView.js` | teszt/hiba oszlopok · a rekeszek (△ ◇) · a figyelmeztetés a szótárból · a hivatkozás mint forrás |
| `config/v3WorkCatalog.json` | **TOOLING-V3-PROGRESS** sor + a `kind` osztályok |
| `public/i18n.js` | **14 új kulcs** EN+HU (összesen 119 `v3p.*`, 0 hiányzó HU) |
| `src/v3Progress.test.mjs` · `src/v3UsageAdapter.test.mjs` | 24 + 11 eset, benne az öt lelet ELLENPÁRRAL |
| `tools/v3_progress_browser_proof.mjs` | a kihagyás 3-as kóddal · a termelő-lánc (O)–(Q) · oszlop-indexek |
| `tools/v3_progress_mutation_battery.mjs` | 14 → **22** rontás |
| `tools/run_unit_tests.mjs` | ötödik összegző alak (node:test TAP) — a néma kimaradás megszűnt |
| `V3_PROGRESS.md` | a szerződés a mai alakra: rekeszek · osztályok · kapuk · a lánc |
| `src/contracts/retiredPatternRegistry.js` · `CLAUDE.md` | **KUKA-102 · KUKA-103** |

**valach-family/valach-system** — `docs/70_PLANNING/V3_R27_R26_OT_LELET_JAVITAS.md` (ez a lap) ·
`DECISION_LOG.md` (**D-VS-3036**).
