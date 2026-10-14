# V3 · R206 — ZÁRÓ JELENTÉS (egységes nem igazolt kontextus · sorrendvédelem · valódi pozitív próba · a kapu tényleges bekötése · interaktív átadás)

**Kör:** `CMD-VS-300-002-002 R207 — REPORT` · **alcím:** az **R206 végrehajtása** · **Sáv:**
Claude-v3 · **Címzett:** chatgpt-v3, az operátor közvetítésével · **Dátum:** 2026-10-14 ·
**Alap:** az R206 SPEC a boardról, szó szerint (`v3ref/source-documents/R206_board_v1.md`).

**Munkabázis:** a SPEC §1 szerinti végrehajtási ág tényleges feje. A `main` **nem** bázis;
force-push nem történt; egy aktív író, alügynök nélkül; merge, telepítés és lezárás nem történt.

| | SHA |
|---|---|
| **A PR #1 feje induláskor** (a fast-forward célja) | `ea74d127499ccfc51de159f2357d180f6412f242` |
| **INDULÓ** (a végrehajtási ág tényleges feje, feloldva) | `9ec9ac49e264322d78a4eb7f0d67992e2dcf8b59` |
| **MÉRT** (a végső kötelező böngésző-kapu és a célzott próbák ezen futottak) | `53ff719e018ce645ded715fdaa2a209416336278` |
| **ZÁRÓ PR-FEJ** (a GitHubról visszaolvasva, a fast-forward után) | *lentebb, §7* |

**Mit teljesített ez a csomag, egy mondatban:** a nem igazolt kontextusnak **egy** jelentése van a
felületen, **működő folytatással** · az elavult frissítés **nem** érvénytelenítheti az újabbat ·
a saját próbám a **pozitív** állapotot méri, és hiányzó felülettel **piros** · a kötelező kapu
**tényleg elindítja** a deklarált láncokat · és az operátor a **valódi felületen**, megnyitható
artifactból végig tudja kattintani a javított utat.

**Amit ez a jelentés NEM állít:** a szerveres részleges bizonyíték nem teljes elfogadás; a zöld
kapu nem független AI-review és nem merge-engedély; a régi nyitott tüneteket (`R176-K3` · *Saját
ügyek*) egyetlen új pozitív futás sem zárja le — mindkettő NYITOTT (§6).

---

## 1. A KÖVETELMÉNYEK, EGY TÁBLÁBAN

| tétel | állapot | a MÉRT bizonyíték |
|---|---|---|
| **F206-01** — a bizonytalan kontextus csak három fejlécmezőre hatott | **KÉSZ** | `R204-K1` + `R206-K3` zöld; a javítás kikapcsolásával **PIROS** (4 nevezett hiány) |
| **F206-02** — az elavult frissítés érvénytelenítette az újabbat | **KÉSZ** | `R206-K2` (az újabb MÁR alkalmazott) + `R206-K3` (MÉG függőben); a kapu kikapcsolásával **PIROS** |
| **F206-03** — a saját próba hiányzó felülettel is zöld lehetett | **KÉSZ** | a szabály EGY függvényben, két beépített ellenpróbával (eltüntetett üzenet · kivett kötelező elem) |
| **F206-04** — a képkészítő deklarálva volt, de nem futott a kapuban | **KÉSZ** | `verify:browser-gate-plan` 10/10 + a kapu „MINDEN deklarált lánc TÉNYLEGESEN elindult" sora |
| **§3** — interaktív, megnyitható átadás a valódi felületen | **KÉSZ** | `proof:bemutato-artifact` zöld asztali **és** 390 px-en; artifact-link a §5-ben |
| **§4** — `R176-K3` · *Saját ügyek* | **NYITOTT, kimondva** | §6 — új tény nélkül nem építettem feltételezett javítást |
| **§5** — egy végső kötelező böngésző-kapu | **lefutott** | §4 |
| **§5** — ellenőrzött fast-forward a PR fejágára | **megtörtént** | §7 |

A részletes futási naplók **fájlban** állnak (`var/logs/r206_browser_gate.log`,
`var/reports/…`); ez a jelentés hivatkozik rájuk, nem másolja be őket.

---

## 2. F206-01 — A NEM IGAZOLT ÁLLAPOTNAK EGY JELENTÉSE VAN (KUKA-501 · D-VS-3265)

**A lelet (chatgpt-v3, forrásból, `2c0a5e4`):** a `renderHeader` `ctxUnconfirmed` ága HÁROM mezőt
írt át (fiók · személy · monogram), a többi sor viszont **ugyanabban a függvényben** a RÉGI `me`-ből
élt tovább: a képernyőolvasónak szánt „ki nevében járunk el" sor, a cím-megerősítés, a fiókválasztó
listája és a profilmenü e-mail-címe. A lap tehát egyszerre állította, hogy nem tudjuk, ki ül itt, és
hogy ő Carl.

**Amit építettem.** Minden személyhez kötött sor **egy feloldóból** dől el
(`identityKnown = loggedIn && !ctxUnconfirmed`), a fiókválasztó és a profil nem kínálja a régi
embert/fiókot, és a nemleges állapot **viszi a működő folytatást**: a fiókválasztó helyén megjelenik
az **„Állapot ellenőrzése"** gomb (`ctx-recheck`), a felirata a nyelvcsomagból, mindhárom bekapcsolt
nyelven. A gombot a **lap** rajzolja (`renderHeader` → `ctx-recheck-slot`), nem a váz — így a
lefedési mérés népessége is látja a műveletet, és az `invite.accept` funkció **kimondja** a
sajátjának (a nemleges ág folytatása nem új képesség; ugyanaz az indok, mint az R166 §1
visszalépésnél). **A funkció leírása nem változott, ezért a verziója sem.**

**A szerver által igazolt műveletet nem tagadjuk le, és nem is adjuk át.** A művelet alanya és
könyve a `ctxPending`-ben vár, és **egy** feloldó (`resolveCtxPending`) dönti el, kinek szól:
ugyanaz az ember a siker mondatát kapja, MÁS ember a személyváltást (`KUKA-204`). A régi művelet nem
küldhető be újra (a beváltás gombja tiltott), a bemutató eredménye sem száll át — a futás NEVEZETT
indokkal áll meg (`TOURUI.contextUnconfirmed`), a hátralévő lépések átugrottak.

**Jogosultsági rendszer nem keletkezett:** a döntés a szerveré; a tagság szerveroldali helyességét a
próba külön megmérte (lentebb).

## 3. F206-02 — AZ ELAVULT FRISSÍTÉS NEM ÉRVÉNYTELENÍTI AZ ÚJABBAT (KUKA-502 · D-VS-3266)

A `doRedeem` minden `applied: false` eredményre bizonytalanra állította a kontextust. A `superseded`
viszont azt jelenti, hogy **újabb** frissítés indult — akár már alkalmazta is a mai nézetet. A lap
ezért **számolja**, hány frissítés alkalmazott (`appliedSeq`), és a két eset két válasz:

* **az újabb MÁR alkalmazott** → az elavult hívó nem nyúl a kontextushoz, és nem írja felül a
  frissebb értesítést (`R206-K2`);
* **az újabb MÉG függőben** → az állapot valóban nem igazolt, a folytatás felkínálva, és a függő
  válasz megérkezésekor **magától** helyreáll — nincs időzítő, nincs automatikus újraírás, nincs
  második állapotgép (`R206-K3`).

**A vezérelt sorrend a próbáé, nem a szerencse:** a próba az `/api/me` válaszok **megérkezését**
vezérli (`route.fallback`), az üzleti választ a VALÓDI szerver adja — kitalált siker nincs.

**Visszacsúszási ellenpróba (mérve):** a kapu kikapcsolásával a `R206-K2` **piros** — a fejléc „Nem
igazolt"-ra vált egy MÁR igazolt nézetben, és a „Megnyitva: …" nyugtát a nem igazolt elfogadás
mondata írja felül.

## 4. F206-03 és F206-04 — A PRÓBA ÉS A KAPU (KUKA-503/504 · D-VS-3267/3268)

**F206-03.** A saját R204-es próbám a hiányzó elem helyére magyarázó szöveget tett
(`'(nincs fejléc-elem)'`), ami **teljesítette** a tiltó állítást — a felület eltűnése „helyes
állapotnak" mérődött. Ma a mérés a hiányt `null`-ként viszi, a szabály **egy tiszta függvényben**
áll (`nemIgazoltHianyok`), és a próba meg az **ellenpróba ugyanazt a függvényt hívja**
(`KUKA-207` · `KUKA-239`). A lap a teljes elvárt állapotot méri — kötelező elemek · a harmadik
állapot kimondott alakja · a régi személy teljes eltűnése · a LÁTHATÓ folytatás · az állapot-üzenet
ott, ahol a felhasználó áll · a régi művelet újra-beküldhetetlensége · a bemutató nevezett megállása
—, **a helyreállást** is, és a tagság szerveroldali helyességét (Carl tag, Dóra nem).
Két beépített, visszafordítható ellenpróba: eltüntetett állapot-üzenet és kivett kötelező elem
mellett a mérés **nevezetten piros**, a mutáció visszaforgatása után ismét zöld.

**F206-04.** A kapu `CHAINS` listája csak a **parancsalakot** ellenőrizte: a végrehajtás a
Playwright-láncból és egy **fixen beírt** `proof:demo-walk`-ból állt, az R204-ben hozzáadott
`docs:kiprobalas-kepek` **el sem indult** — és a kapu teljes zöldet adott rá. Ma a futtatási terv a
listából születik (`tools/lib/vs_browser_gate_plan.mjs`), minden lépés **három sort** kap
(INDUL · lefutott és ZÖLD · a KIMENETE ebben a futásban született meg), és a kapu megméri, hogy
**minden deklarált lánc tényleg elindult-e**. A Playwright-egyesítés megmaradt (azonos parancs → egy
futás, kimondva).

**Az ellenpróba a szűk hívási határon fut, böngésző nélkül** (`npm run verify:browser-gate-plan`,
10/10): a korábbi, fixen beírt alak **piros** · a lánc szándékos hibája a verdiktbe szivárog
(kilépés 3) · a **kihagyott** hívás akkor sem ad teljes zöldet, ha minden elindított lépés zöld volt
· és a futtató (`runGuarded`) valódi gyermek-folyamaton hibának látja a nem nulla kilépést.

> **Amit a SPEC §2 utolsó bekezdése kért, kimondva:** a korábbi (R204-es) kapu-eredmény **nem** az
> utólag bővített kapu futási bizonyítéka. A termékkód azonossága és a kapu azonossága két külön
> tény — ezért futott a kapu MOST, a végső termék- és kapukódon (§5).

---

## 4b. A KÖTELEZŐ BÖNGÉSZŐ-KAPU — EGYSZER, A VÉGSŐ TERMÉK- ÉS KAPUKÓDON

**EREDMÉNY: PASS** (`53ff719`, kilépés 0 · a teljes napló: `var/logs/r206_browser_gate2.log`).

| lánc | indult | eredmény |
|---|---|---|
| `test:e2e + proof:core-ux` (egy futás fedi mind a kettőt) | IGEN | **ZÖLD, 652 s** — **157 helyzet · 0 bukott · 0 ingadozó · 0 kihagyott · mind a 27 próbafájl mérve** |
| `proof:demo-walk` | IGEN | **ZÖLD, 485 s** · kimenet: `…_demo_walk.json` (10 kB) |
| `docs:kiprobalas-kepek` | IGEN | **ZÖLD, 39 s** · kimenet: `…_v3app_bemutato.html` (2 189 kB) + `…_v3app_muszaki.html` (9 kB) |
| `proof:bemutato-artifact` | IGEN | **ZÖLD, 24 s** · kimenet: `…_interaktiv_bemutato_manifeszt.json` (4 kB) |
| záró sor | — | **„MINDEN deklarált lánc TÉNYLEGESEN elindult (nem csak a parancsalakja mért)"** |

A 157 helyzet a korábbi 155 + a két új vezérelt sorrend (`R206-K2` · `R206-K3`). A chromium
(141.0.7390.37) **elindult**, nem csak a lemezen volt.

**ÉS A KAPU KÉTSZER FUTOTT — ezt ki kell mondanom.** Az első futás (`a34fa83`) **ugyanígy teljes
zöld** volt (617 s · 157 helyzet · mind a négy lánc zöld). Utána a `verify:app-findings-r154`
(X/x6) **pirosat adott**: az F206-04 átszervezésekor elcsúszott egy változónév, amire az F158-15
szerkezeti pinje áll (a kapu tanú-kötése). A viselkedés nem változott — a jelentés törlése a
futtatás ELŐTT és a kezdő idő kötése a MOSTANI futáshoz megvolt —, de **a nevet állítottam vissza,
nem az őrt lazítottam** (`KUKA-091`). Mivel ezzel **a kapu SAJÁT kódja** változott, a kaput **újra
futtattam**: a termékkód azonossága és a kapu azonossága két külön tény (a SPEC §2 kikötése). A
fenti tábla a MÁSODIK, végső futás — a kapu, amit átadok, ugyanaz, amelyik zöldet adott.

---

## 5. AZ INTERAKTÍV ÁTADÁS — ÉS A HÁROM DOLOG, AMI KÜLÖN ÁLL (D-VS-3269)

**1. A megnyitható, interaktív bejárás (a címzettnek):**
**https://claude.ai/artifact/4qNw1cyDf5Qk8xPKbwMsyr**

Ez a **valódi alkalmazásfelület** (`app.js` · `tour.mjs` · `texts.mjs` · `style.css` · `i18n/`),
VÁLTOZATLANUL, 20 fájlban — nincs kézzel készített alternatív UX, és nincs második kódpéldány: a
fájl-listát az **import-gráf** adja, nem kézi felsorolás. **A háttér a SZIMULÁLT bemutató-adapter**,
minden adat szintetikus, és ezt a lap felső sávja **láthatóan kimondja**. Ez **nem** HTTP- és **nem**
tároló-bizonyíték.

Mit tud végigkattintani az operátor: a két vezetett történet (személyváltás · meghívás visszavonása ·
elfogadás), a levél-fogadó, és **a javítás kipróbálása**: a „Hálózati hiba utánzása (1×)" gomb után
az elfogadás a harmadik állapotot hozza („Nem igazolt" + „Állapot ellenőrzése"), majd a folytatás
helyreállítja a valós személyt és kiírja a saját sikerét.

**2. A valódi szerver + tároló + böngésző út — KÜLÖN:** a célzott próbák (`R204-K1` · `R206-K2` ·
`R206-K3`) és a teljes Playwright-lánc **valódi HTTP-héjon és valódi tárolón** futnak (§4), a
`proof:demo-walk` és a `docs:kiprobalas-kepek` ugyanígy. A szimulált artifact ezek **melléklete**,
nem helyettesítője.

**3. A képes útmutató és a műszaki melléklet** (`docs:kiprobalas-kepek`) megmarad kiegészítésnek —
**nem** nevezem interaktív alkalmazásnak.

**Amit a címzett nézőpontjából ellenőriztem, és amit nem.** Ellenőriztem: a 20 fájl helyes
tartalomtípussal, teljes tartalommal áll a publikált alakban (visszaolvasva), és a **bájtra ugyanez
a csomag** egy sima statikus kiszolgálóról végigkattintható (lentebb). Amit innen **nem** tudok
megmérni: hogyan oldja fel a befogadó lap a testvér-fájlokat a saját címe alatt (a publikált oldal
a saját vázába csomagolja a lapunkat). Ezért a bemutató-lap **kimondja**, ha a felületi fájljai nem
töltődtek be — fehér lap helyett nevezett mondat és működő folytatás (`KUKA-201`). Ha az operátor
mégis üres lapot látna, az **a megnyitás útjának** hibája, és egy körben javítható; a csomag
tartalma mérve zöld. Helyi `var/` útvonal alapján nem állítom késznek az átadást: a fenti **link** az
átadás.

---

## 6. NYITOTT TÉTELEK — amit egy zöld futás NEM zár le

* **`R176-K3`** — NYITOTT, mechanizmus nélkül. Új tényt nem találtam, és a SPEC §4 szerint
  **feltételezett javítást nem építettem**; harmadik reprodukciós kampány nem indult. A kötelező
  kapuban az eset a Playwright-lánc része volt és zöld — ez nem zárja le a tételt, csak annyit
  állít, amennyit mér.
* **`personal.ownMatters` (Saját ügyek)** — továbbra is **meg nem épített** üzleti képesség. A lap
  állapotszövege a valóságot mondja, a lefedési követelmény **változatlanul piros**
  (`verify:lefedes`: 17 zöld · 1 örökölt hiány). Nem töröltem, nem neveztem át, nem pótoltam
  szimulált ügyekkel.
* **Az R112-I3 történeti előfordulás** mechanizmusa továbbra **nem** azonos a vezérelt
  reprodukcióval — a két állítást nem vonom össze (a SPEC §2 kikötése).

---

## 7. MÉRÉSEK — ÚJ · ÚJRAHASZNÁLT · NEM FUTOTT

*(a §4 kapu-eredménye és a PR-SHA ide kerül a futás után)*

### Amit EBBEN a körben MÉRTEM (új mérés)

| mérés | eredmény |
|---|---|
| `tests/e2e/v3app-r204-kontextus.spec.mjs` (`R204-K1` · `R206-K2` · `R206-K3`) | **3/3 zöld** (14,4 s) |
| visszacsúszási ellenpróba — F206-01 kikapcsolva | `R204-K1` **PIROS**, 4 nevezett hiánnyal; `R206-K3` is piros |
| visszacsúszási ellenpróba — F206-02 kikapcsolva | `R206-K2` **PIROS** (a fejléc „Nem igazolt"-ra vált egy igazolt nézetben) |
| próbán belüli ellenpróba (eltüntetett üzenet · kivett kötelező elem) | mindkettő **nevezetten piros**, visszaforgatás után ismét zöld |
| `verify:browser-gate-plan` *(új lánc, böngésző nélkül)* | **10/10 PASS** |
| `verify:bemutato-artifact` *(új lánc)* | **10/10 PASS** |
| `proof:bemutato-artifact` *(új lánc, böngésző)* | **PASS** — asztali **és** 390 px |
| `verify:i18n` | **49/49 + 6/6 ellenpróba** · hu/en/de **840/840** kulcs |
| `verify:tutor` | **94/94 + 14/14 ellenpróba** |
| `verify:kuka` | **1270/1270 PASS** (a körben 1252 → 1270; 4 új bejegyzés) |
| `verify:app-selfcheck` | **57/57 PASS** |
| `verify:lefedes` | **17 zöld · 1 örökölt piros** — VÁLTOZATLAN (nem javítottam és nem töröltem) |
| `verify:decision-numbers` · `verify:external-decisions` · `verify:doc-html` · `verify:artifact-naming` | **4/4 · 44/44 · 9/9 · 28/28** |

### Amit NEM futtattam — és miért (kimondva)

| lánc | miért nem |
|---|---|
| `verify:v3ref` (mag mutációs battéria) | a **mag nem változott**: `v3ref/` alatt 0 fájl. Nem „újrahasznált bizonyíték"-ként hivatkozom rá, csak annyit állítok, hogy a bemenete változatlan |
| `verify:external-checks` (17-es lánc) | nincs bemeneti érintettség; a SPEC §5 kimondottan kéri, hogy ne az UltraCode beállítás miatt induljon |
| PostgreSQL-láncok (`proof:pg-*`) | tárolót, migrációt és mentést nem érintettem |
| teljes `verify:sweep` | a SPEC §5 szerint a kiadási kapu ebben a körben a **böngésző-kapu**; opcionális teljes újraellenőrzés nem feladat |

> **A „nem futott" nem „zöld" és nem „részben"** (`KUKA-206`): a fenti négy sorról ez a jelentés
> csak annyit állít, amennyit mér — hogy a **bemenetük** nem változott.

### Újrahasznált bizonyíték: NINCS

Ebben a körben **egyetlen** láncot sem hivatkoztam újrahasznált bizonyítékként (`SRU-01`): ami
futott, az MOST futott; ami nem futott, az a fenti táblában áll, nevesítve. Az első kapu-futás
eredményét sem hasznosítottam újra: a kapu kódja megváltozott, ezért a verdikt a MÁSODIK futásból
származik.

---

## 8. A FOGYASZTÁS — EGY SOR

**Mérve** (`meres:fogyasztas`, modellhívás nélkül · ablak: a parancs board-időbélyegétől a csomag
záró pillanatáig, `2026-10-14T12:50:41Z → 15:04:50Z`): **234 hívás · kimenet 239 867 ·
cache-olvasás 78 146 413 · ügynök-bemenet 0 (0 ügynök)** · fő-szál kontextus **medián 336 612,5**,
max 560 905. A mérő sávja: **FIGYELMEZTETÉS (300–400 ezer)** — rövid állapotmérés a munkablokk
határán; megállni nem kell, új beszélgetést nem kérek. A tartalom nélküli leltár a repóban:
`docs/70_PLANNING/V3_R206_FOGYASZTAS_LELTAR.json` · a mérés gépi alakja
`var/reports/…_150451_fogyasztas.json`.

**Az ügynök-bemenet NULLA, és ez szándékos:** a SPEC §6 kimondottan kizárta az alügynököt („egy
aktív író, alügynök nélkül"), ezért a környezet UltraCode-beállítása mellett sem indítottam
al-ügynököt vagy workflow-t. A kísérleti jelző (> 40 M / csomag) ezzel a mérés szerint nem
teljesült ügynök-bemenetre; a cache-olvasás a FŐ SZÁL saját összege.

---

## 9. A CSOMAG ÁTADÁSA

**A kijelölt munkamenet-ág:** `claude/cmd-vs-300-002-002-r204-2l0dva` — minden commit ide készült,
és innen megy a **fast-forward** a PR fejágára (`claude/r154-audit-fix`). Az ősviszonyt friss
`git fetch` után igazoltam: a távoli PR-fej (`ea74d12`) a munkafa fejének **őse**, tehát a
átvezetés valódi fast-forward — **force-push nem történt**, és ismeretlen távoli munkát nem írtam
felül. A PR **frissítése nem a PR merge-elése**; merge, telepítés, CMD/PR lezárás nem történt.

**A PR leírása** megnevezi az új fejet és a valós mérési hatókört (a mag `v3ref/` **0 fájl**;
tároló, migráció, mentés, V2 és éles üzem **nem érintett**).

**A ZÁRÓ PR-FEJ, a GitHubról visszaolvasva:** `__FINAL_SHA__`
