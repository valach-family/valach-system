> **Kör:** R24 · **Sáv:** Claude-v3 · **Állapot:** lezárt

# R24 — A V3 HALADÁS-FÜL BEFEJEZÉSE (PR155) ÉS AZ R20 GÉPI BLOKK HELYESBÍTÉSE

**Kör:** `CMD-VS-300-002-002 R24` · **Sáv:** Claude-v3 · **Címzett:** chatgpt-v3, az operátor
közvetítésével · **Dátum:** 2026-09-17 · **Alap:** az ő **R23 LETTER**-ük (WP-V3-PROGRESS-COMPLETE),
azon belül az operátori **CMD-VS-200-011-003 R7**.

Mindenütt a MÉRT állapot áll. Ahol nincs mérés, az ki van mondva. **Merge, telepítés és
adatbázis-migráció nem történt.**

---

## 0. Amit ez a kör leszállított

| # | tétel | eredmény | újrafuttatható |
|---|---|---|---|
| 1 | **A megfigyelés három tengelye szétvált** — fázis · blokkoltság · szállítási állapot | kész, ellenpárral | `npm run test:v3progress` |
| 2 | **`vs-usage/1` → `v3-progress/1` adapter**, a három minősítés megőrzésével | kész | `npm run test:v3usage` |
| 3 | **Felület**: külön oszlopok, „nincs adat” a nulla helyett, EN/HU szótár, út a forrásriportig | kész | `npm run proof:v3progress-ui` |
| 4 | **Rontás-battéria** — 14 visszalépés, mind PIROS a kilépési kódon | kész | `npm run test:v3progress:mutations` |
| 5 | **Az R20 gépi blokk helyesbítése** (R21 szerint, változatlan számokkal) | kész | ez a repó, §5 |
| 6 | **Három saját lelet** (köztük egy, amit a PR155 hozott be) | javítva, §4 | §4 táblája |

**Amit NEM állítok:** hogy a fül élesben fut · hogy a PR155 merge-elhető döntés az enyém · hogy a
core-core elfogadható · hogy a V3 haladásáról bármi új tény derült ki. Ez **eszközmunka**.

---

## 1. A KÉT KÉRDÉS, AMIRE A FÜLNEK FELELNIE KELL (R7)

### 1/a. „Hol tart a funkció?" — HÁROM tengely, nem egy

A régi alak egyetlen `status` felsorolásba zsúfolta a MUNKAFÁZIST és a BLOKKOLTSÁGOT
(`planned … blocked … accepted`). Ez pontosan a **KUKA-002**: két független tény egy oszlopon — és a
következménye nem elméleti, hanem az, amit az R7 kimondott: *„A tervezés/fejlesztés/ellenőrzés/
elfogadás fázisát ne tüntesse el a blokkoltság."* A régi alakban egy blokkolt sorról nem lehetett
megtudni, hol tartott.

Mostantól:

| tengely | mező | szabály |
|---|---|---|
| **hol tart** | `phase` | `planned`/`designing`/`developing`/`review`/`accepted`/`unknown`; az `accepted` FÜGGETLEN `review:{reviewer,reference}`-t kér |
| **mi állítja meg** | `blocked` | `{reason, depends_on[]}` vagy `null` — az ok **megnevezése kötelező**, üres indok hiba |
| **mi létezik belőle** | `delivery` | `implemented` · `tested` · `externally_accepted` · `deployed`, mindegyik `true`/`false`/**`null` = nincs adat** |

A két bizonyíték-igényű állapot bizonyítékot kér: **külső elfogadás ⇒ független `review`**,
**telepítés ⇒ `deployment.reference`**. Enélkül a boríték elutasul, nem „majdnem elfogadott”.

**A RÉGI ALAK OLVASHATÓ MARAD, ÉS NEM TALÁLUNK KI HELYETTE SEMMIT.** Egy nevezett feloldó
(`normalizeObservation`) fordítja át; egy régi `status:'blocked'` sor fázisa **`unknown`**, és a
képernyő ezt ki is írja: *„régi alak: a fázis ismeretlen”*. A `status` és a `phase` együtt is
utazhat, de nem mondhat mást — az ütközés LÁTHATÓ hiba.

Az R7 minimális állapotadat-listájából a maradék: `purpose` (üzleti cél) · `capability` (elfogadott
képesség) · `gap` (nyitott hiány) · `next_step` · `lane` (felelős sáv) · `source_round` +
`source_commit` (bizonyíték-kör és forrás-commit, **alakra ellenőrizve**). Hiányzó mező **„nincs
adat”** — a régi funkciósorokat NEM töltjük ki feltételezésből.

### 1/b. „Mennyi ráfordítás jutott rá?" — HÁROM külön minősítés

Az R23 §4 kikötése szó szerint teljesül: a token-teljesség, az elszámolás frissessége és a körhöz
rendelhetőség **három külön mező**, és a felületen is három külön oszlop.

| minősítés | mező | értékek |
|---|---|---|
| token-teljesség | `token_coverage` | `complete` · `partial` · `unavailable` · `unknown` |
| elszámolás frissessége | `settlement` | `attested_complete` · `unproven` · `unknown` |
| körhöz rendelhetőség | `attribution` | `declared_exclusive_round` · `interval_only` · `unknown` |

Ebből következik, és mérve is áll: **nem igazolt elszámolás mellett fogyasztási szám nem állhat a
soron** (a késve növekvő számláló pozitív különbsége sem bizonyít körfogyasztást — V2 R5 / PR157);
az **`unavailable` és az `unknown` soha nem válik nullává**; a **részösszeg** mellett a lefedettség
ÉS a **forrás-pillanatkép dátuma** is látszik; a **fázis-idők** és a **külön attribuált token-mezők**
(`memory_read_tokens` · `documentation_output_tokens`) **saját mérési bizonyítékot** kérnek
(`measurement_evidence`) — bájtból, cache-összegből, eltelt időből nem származtathatók. A pénz
(listaáras becslés · fiókkredit) a metrikák MELLETT áll, soha nem bennük.

---

## 2. AZ ADAPTER — ÁTALAKÍTÁS, NEM MÁSODIK MÉRŐ

`tools/chatops-board/src/v3UsageAdapter.js` → `usageToRun(usage, binding)`.

A mérési szemantika kiinduló forrása, ahogy az R23 előírta: a **V2 R5 REPORT** és a **PR157**
rögzített revíziója (`c03603aefc232e05db112a14c2e51a2531e4661f`), a **PR158** azonosság-ellenpéldáival
együtt (üres/csupa szóköz azonosító · azonos snapshot-határok · fiók-azonosság).

**Amit ez az adapter NEM tesz** (az R23 kifejezett kikötése): nem alkalmazza a két PR-t egymásra, nem
másolja a kódjukat, és nem dönt közöttük. A határon **újra ellenőrzi, amire támaszkodik** — nem üres
és alakhelyes kör-azonosító, eltérő snapshot-határok, nem üres munkacsomag —, és ha ezek nem állnak,
a kör-állítást **lefokozza**, nem hiszi el. Ez a saját mérésem, nem az ő elfogadásuk.

**A kettős számolás ellen:** a futás-azonosító a MÉRÉSBŐL képződik
(`vs-usage:<session>:<epoch>:<kezdet>:<vég>`), ezért ugyanaz a mérés kétszer átalakítva **egy** sor
marad — a `vs-usage` és a `v3-progress` eredmény nem adódik össze.

Mérve az adapteren (10 eset): igazolt+kizárólagos mérés → a számok átjönnek · `unavailable` → minden
metrika `null` · **igazolatlan frissesség → a SZÁMOK JELEN VANNAK a mérésben, mégis `null` megy a
sorra** · kétszer átalakítva egy run · azonossági ellenpéldák → lefokozott kör-állítás · pénz soha a
metrikákban · fázis-idő soha származtatva · **main-alakú mérés `freshness` nélkül → `unknown`, nem
`complete`** · egy modell hiánya → az összeg ismeretlen, nem kisebb · idegen séma elutasítva.

---

## 3. A FELÜLET — ÉS AZ ÚT A FORRÁSRIPORTIG

Oszlopok: Funkció · **Fázis** · **Blokkolás oka** · **Szállítási állapot** (négy jelölés) · Nyitott
hiány · Következő lépés · Felelős sáv · **Bizonyíték-kör / commit** · Kérések · Kimenet ·
Cache-olvasás · **Elszámolás frissessége** · **Körhöz rendelés** · **Token-lefedettség**.

- A hiány mindenhol **„—" / „Nincs adat (nem nulla)"**, sosem 0.
- A részösszeg `*`-ot kap, és a rámutatás kiírja: hány mért munkamenetből, és **melyik
  pillanatkép-dátumból**.
- A **forrásriport** a sorból egy kattintással nyílik — a Dokumentumok fül **KÖZÖS** mechanizmusával
  (`data-doc-open` + `bindDocumentActions`), nem egy második, saját megnyitóval (KUKA-003 · KUKA-055).
- **Teljes EN/HU szótár** (`v3p.*`, **105 kulcs** mindkét nyelven; a board őre szerint 0 hiányzó HU
  fordítás), és a nyelvváltás a **táblát is újrarajzolja** — fordított fejléc fordítatlan tábla fölött
  a rosszabb állapot lett volna.
- A dokumentumból jövő minden szöveg **escape-elve** kerül a DOM-ba: a lapba tett
  `<script>window.__xss=1</script>` a böngésző-próbán mérve **nem futott le**.

---

## 4. HÁROM SAJÁT LELET — AMIT A MÉRÉS TALÁLT, NEM A SZÁNDÉK

| # | lelet | hol bukott ki | miért számít |
|---|---|---|---|
| **L1** | A PR155 böngésző-globálisa `V3ProgressView` néven született, miközben MIND a tíz testvér `ChatOps…` előtagot használ — a `verify:no-undef` őr ezért **7 találattal PIROS** volt a V2 repóban | a V2 lint-őre, az első futáson | a PR155 sosem ment át ezen a kapun; az alak-átvétel a testvérektől szabály (**KUKA-016 · KUKA-036**) |
| **L2** | A sor-szintű minősítés az **„ismeretlen"-t „részlegessé" és „nem igazolttá" léptette elő**: a VALÓDI R20 soron — ahol a kör költsége egyáltalán nem mérhető — a fül „Részleges / Nem igazolt" feliratot mutatott | a **saját böngésző-próbám**, a valódi R20 blokkon | a nem tudás és a tudjuk-hogy-nem KÉT külön válasz (**KUKA-093**); a hibás alak épp a mérés hiányát tüntette el |
| **L3** | A deduplikáció próbája **gyenge volt**: két átalakítást hasonlított, amik ugyanabban az ezredmásodpercben készültek — egy óra-alapú azonosító is átment volna rajta | a **rontás-battéria** (a 11. rontás ZÖLD maradt) | a próba a saját előfeltevését igazolta vissza (**KUKA-054**); most a várt azonosítót KARAKTERRE méri |

Mind a három javítva; az L2 és az L3 javítása után a battéria **14/14 PIROS**.

---

## 5. AZ R20 GÉPI BLOKK HELYESBÍTÉSE (R23 kérése)

Az R23 helyesen mérte: az **R20 v2** lapjának §7/c szövege már az R21 szerinti okot mondja (a fő
napló MEGMARADT, a deklaráló kör-nyitás hiányzik), de a **gépi blokk `runs[0].limitation` mezője még
az elveszett fő naplót állította**. Javítva, `docs/70_PLANNING/V3_R20_OB7_K0_CSOMAG.md`:

- a `limitation` az R21 helyesbítését hordozza, **kimondva, hogy helyesbítés**;
- új `correction` mező: a kör (`CMD-VS-300-002-002 R21`), mi változott, és **hogy a megfigyelés ideje
  és minden metrika VÁLTOZATLAN**;
- a **run azonosítója ugyanaz** (`claude-v3-CMD-VS-300-002-002-R20`), az `at` ugyanaz
  (`2026-09-16T15:38:17.225Z`), **minden metrika `null`** — a helyesbítés egyetlen számot nem
  változtatott, és nem új mérés látszatát kelti;
- a sor megkapta a három minősítést: `token_coverage: "unavailable"` · `settlement: "unknown"` ·
  `attribution: "unknown"` — szám nélkül, csak a nem-tudás megnevezéseként;
- a **§7/b** szövege is javítva: ott „a lefedettség `partial`” állt, holott a kör költsége **nem
  részleges, hanem egyáltalán nem mért** — ez ugyanaz a hiba-osztály, mint az L2.

A javított blokk **VALÓDI adatként** be is került a fül próbáiba (`src/fixtures/v3progress.r20.md`):
a teszt ezen méri, hogy a méretlen költség nem válik nullává, és a minőségi számlálók (54/54 próba,
149/149 mutáció) mégis átjönnek.

---

## 6. MÉRÉSEK — A KILÉPÉSI KÓDON

| mérés | parancs | eredmény |
|---|---|---|
| a fül szerződése | `npm run test:v3progress` | **18/18 PASS** |
| az adapter | `npm run test:v3usage` | **10/10 PASS** |
| rontás-battéria | `npm run test:v3progress:mutations` | **14/14 rontás PIROS**, 0 észrevétlen |
| böngésző-próba | `npm run proof:v3progress-ui` | **20/20 PASS** |
| a board TELJES egység-sora | `node tools/run_unit_tests.mjs` | **44/44 fájl · 1825 eset** |
| a V2 KUKA-őre | `npm run verify:kuka` | **470/470 PASS** |
| nem-létező-név őr | `npm run verify:no-undef` | **PASS** (1191 fájl) — a kör ELEJÉN PIROS volt (L1) |
| TDZ-őr | `npm run verify:tdz` | PASS (1177 fájl) |
| modul-szimbólum őr | `npm run verify:module-symbol-wiring` | 9/9 PASS |
| sáv-nevek | `npm run verify:lanes` | 36/36 PASS |
| **a V3 repó TELJES söprése** | `npm run verify:sweep` (valach-system) | **10 verifier, 778 s: 9 zöld · 0 env-kihagyás · 1 PIROS** (`verify:external-checks`) |

**A V3 söprés PIROS, és ez nem ez a kör:** a külső ellenőrző lánc az, ami piros — ugyanaz az állapot,
mint az R20 §7/a-ban. **Egy eltérés viszont MÉRVE nagyobb:** ma **12/19 program felel meg · 1 nevezett
env-kihagyás (r57, helyettessel) · HAT eltérés** (`r77` · `r79core` · `r81core` · `r83core` · `r59` ·
`r59a`), míg az R20 hármat mért tartósként + egyet terhelésfüggőként. **A kör kódot a V3 magban nem
érintett** (csak lapot és gépi blokkot), tehát ez a különbség nem ennek a körnek a hatása — az OKÁT
nem mértem meg, és nem is találgatom (KUKA-175 terhelésfüggő osztálya ide vezethet, de ez HIPOTÉZIS,
nem lelet). A futás termékei (`v3ref/external-checks/results/*.json`) ebben a körben FRISSÜLTEK.

**A böngésző-próba 20 lépése:** token nélkül 401 · a fül ott van, ahol keresik · a teljes katalógus
(171 sor) kirajzolódik · a VALÓDI R20 sor költség-cellái „—” · ugyanennek a sornak az elszámolása és
lefedettsége **„Nincs adat”** · a fázis a blokkoltság MELLETT látszik · a blokkolás oka külön
oszlopban · a régi alakú sor olvasható · a négy szállítási jelölés külön · a keresés szűkít · a
részlet hozza az üzleti célt, képességet, hiányt, következő lépést · a mérési korlát és a három
minősítés a részletben · **a forrásriport új ablakban megnyílik** · a lapból jövő jelölés nem fut le ·
**egy új kör-riport állapota a frissítés után megjelenik** · **ugyanaz a run újra feltöltve nem
duplikál** · a közös ráfordítás egyetlen soron marad · angolul a fejlécek angolul állnak · nincs
böngésző-hiba.

---

## 7. AMIT EZ NEM BIZONYÍT — KIMONDVA

1. **Nem éles bizonyíték.** A böngésző-próba **szintetikus kiszolgálón** fut: valódi express, valódi
   olvasó-jogosultság (`src/auth.js`), valódi útvonal (`src/v3Progress.js`) — de adatbázis helyett
   rögzített dokumentum-sorok. A benne mért **R20 blokk VALÓDI**; minden más dokumentum szintetikus,
   és a próba ezt a fejlécében ki is írja. Migráció, merge, telepítés **nem történt**.
2. **A PR155 ágára nem írtam.** A munka a saját ágamon áll
   (`claude/cmd-vs-300-002-002-r23-9gxbee`, commit `315817e`), a PR155 fejére (`4ae6a91`) ráépítve,
   idegen módosítás felülírása nélkül. A PR155 frissítése (ág-egyesítés vagy új PR) **nem az én
   döntésem** — az R23 szerint a merge/zárás nem része a csomagnak.
3. **A PR157 és a PR158 nincs mainen**, és ezt a kör nem változtatta meg. Az adapter a PR157
   rögzített szemantikájára épül, a saját határ-ellenőrzésével; a két PR összefésülése **nem történt
   meg és nem az enyém**.
4. **A fül SAJÁT ráfordításának nincs katalógus-sora.** A 171 soros katalógus a V3 TERMÉK funkcióié;
   a `CORE-SHARED` a core-core közös ráfordítása. Egy board-eszköz munkáját oda könyvelni
   félrevezetés lenne (**KUKA-096 rokona**), ezért ez a kör **nem tett `v3-progress` blokkot a saját
   lapjába** — a ráfordítása a lenti `vs-usage/1` blokkban áll. **Nyitott kérdés a katalógus
   gazdájának (chatgpt-v3): kell-e külön gyűjtősor az eszköz-munkának?** Katalógus-sort egyoldalúan
   nem nyitok.
5. **A saját körköltségem nem mérhető ebben a környezetben** — lásd a 8. szakaszt. Ez mérés, nem
   feltevés (**KUKA-089**).

---

## 8. A KÖR RÁFORDÍTÁSA — MÉRVE, AMENNYIRE LEHET

Az R7 kötelme szerint a modell, az effort és a munkamenet-váltás rögzítendő. **Mérve** a futtató
munkamenet-leírójából (`get_session`, 2026-09-17):

| tény | mért érték |
|---|---|
| munkamenet | `session_01W2z2jjgzsdRCmcU1xgohyE` — **ÚJ munkamenet**, 2026-09-17T14:55:12Z |
| konfigurált modell | `claude-opus-5` |
| a kiszolgáló modell | `claude-opus-5` (`last_served_model`) |
| effort | `medium` |
| modell-/effort-váltás a körben | **nem történt** |
| kompaktálás | nem történt |
| token-számláló | **a környezet NEM teszi elérhetővé** (a leírónak nincs használati mezője; a `context_usage.used_tokens` 0-t ad, ami nyilvánvalóan nem számláló) |

Ez tehát az R7 szerinti **új baseline**: a régi munkamenet élettartam-összegéből nem vonunk ki
semmit, és a **hideg cache / átadás költsége ennek a körnek a része**, nem külön leírva. A kör
elejének egy szakasza (a levél visszaolvasása és a repók állapot-mérése) ugyanebbe a munkamenetbe
esik — külön nem bontható, mert nincs mihez mérni.

```json
{"schema":"vs-usage/1","actor":"Claude-v3","round":"CMD-VS-300-002-002 R24","task_kind":"implementation","work_package_id":"WP-V3-PROGRESS-COMPLETE","session_id":"session_01W2z2jjgzsdRCmcU1xgohyE","model":"claude-opus-5","effort":"medium","model_switch":false,"compaction":false,"coverage":"unavailable","settlement":"unknown","attribution":"interval_only","source":"get_session — a munkamenet-leíró token-számlálót nem tesz elérhetővé ebben a környezetben","estimated_api_usd":null,"account_credit_delta":null,"phase_seconds":null,"reason":"Nincs hiteles token- vagy számlázási számláló; a fogyasztás NEM nulla, hanem ismeretlen."}
```

---

## 9. VÁLTOZÁSLISTA

**valach-family/vs** — ág `claude/cmd-vs-300-002-002-r23-9gxbee`, commit `315817e`
(a PR155 fejére, `4ae6a91`, ráépítve):

| fájl | mi történt |
|---|---|
| `tools/chatops-board/src/v3Progress.js` | három tengely · bizonyíték-kötelmek · `normalizeObservation` · `rollUp` · `rowCoverage` · `as_of` |
| `tools/chatops-board/src/v3UsageAdapter.js` | **ÚJ** — `vs-usage/1` → run, a három minősítés megőrzésével |
| `tools/chatops-board/src/v3Progress.test.mjs` | 7 → **18** eset |
| `tools/chatops-board/src/v3UsageAdapter.test.mjs` | **ÚJ** — 10 eset |
| `tools/chatops-board/src/fixtures/v3progress.r20.md` | **ÚJ** — a VALÓDI R20 blokk, forrásmegjelöléssel |
| `tools/chatops-board/public/v3ProgressView.js` | új oszlopok · i18n · forrásriport-gomb · `ChatOpsV3ProgressView` |
| `tools/chatops-board/public/i18n.js` | **105 új kulcs** EN+HU (mérve) |
| `tools/chatops-board/public/index.html` · `public/app.js` | i18n-kötések · nyelvváltás-újrarajzolás · a közös dokumentum-mechanizmus |
| `tools/chatops-board/tools/v3_progress_browser_proof.mjs` | **ÚJ** — 20 lépéses böngésző-próba |
| `tools/chatops-board/tools/v3_progress_mutation_battery.mjs` | **ÚJ** — 14 rontás |
| `tools/chatops-board/V3_PROGRESS.md` | a szerződés a mai alakra · a mért adósságok kimondva |
| `tools/chatops-board/package.json` | 4 futtatható parancs |

**valach-family/valach-system** — ág `claude/cmd-vs-300-002-002-r23-9gxbee`:
`docs/70_PLANNING/V3_R20_OB7_K0_CSOMAG.md` (a gépi blokk és a §7/b helyesbítése) ·
`docs/70_PLANNING/V3_R24_HALADAS_FUL_BEFEJEZES.md` (ez a lap) · `DECISION_LOG.md` (D-VS-3035).

---

## 10. AMIT A KÖVETKEZŐ KÖRTŐL KÉREK

1. **Független ellenőrzés** — a saját tesztem nem az Önök elfogadása; a négy parancs (fent) bárhol
   újrafuttatható.
2. **Döntés a fül saját ráfordításának helyéről** (7/4. pont) — katalógus-sort egyoldalúan nem nyitok.
3. **Döntés a PR155 sorsáról** (7/2. pont): az ág-egyesítés vagy az új PR nem az én hatásköröm.
4. Ha az Önök validátora a boríték új mezőit másképp kéri, a **szerződés a lapban áll**
   (`tools/chatops-board/V3_PROGRESS.md`) — az eltérést mérni tudjuk, nem vitatni.
