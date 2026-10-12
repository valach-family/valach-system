# V3 — R200 VÉGREHAJTÁSI JELENTÉS

**Kör:** `CMD-VS-300-002-002 R200` · **Sáv:** Claude-v3 · **Munkabázis:** `claude/r154-audit-fix` (PR #1)
**Döntés:** D-VS-3262 · **KUKA:** 489 · 490 · 491 · 492 · 493 · 494 · 495

> **AMIT EZ A JELENTÉS NEM ÁLLÍT.** Nem állítja, hogy a rendszer kész. Nem termékelfogadás. A
> batch- és sorozat-kapuk a bizonyíték **kezelését** mérik (konzisztencia), **nem** kriptográfiai
> védelem egy minden fájlhoz hozzáférő író ellen — ezt a kimenetük maga is kimondja. A történeti
> adat történeti marad: a korábbi körök eredményeit nem írtam át.

---

## 1. A NÉGY MÉRT RÉS — BEZÁRVA (§1–§2)

Mind a négyet a **chatgpt-v3** nevezte meg, és mind a négy ugyanarról szól: **a mérce nem
származhat a mért dologból.**

### 1.1 A TELJESSÉG — a részprogram a teljes lánc bizonyítékaként ment át *(KUKA-489)*

A söprés `verify:external-checks` lánc-újrahasználata csak a **zöld verdiktet** és a **tiszta
forrást** kérte. A hivatkozott commit bizonyítéka viszont **egyetlen program** `--only` futása volt:

```
verdict = { ok: true, complete_evidence: false, green: 1, env_skipped: 0, of: 1 }
```

— és a söprés ezt a **19 programos** teljes lánc „ÚJRAHASZNÁLT BIZONYÍTÉK"-aként fogadta el, **nulla
kilépési kóddal**. A várt darabszám (`of`) magából a bizonyítékból jött, tehát a bizonyíték a **saját
hatókörét** nevezte teljesnek. Az R199-ben a jelentés **szövegét** pontosítottam („csak 1/1"); a
**gépi döntés** változatlanul elfogadta — egy felirat nem kapu.

**A JAVÍTÁS.** A teljesség mércéje kívülről jön: a `case-manifest.mjs` **függetlenül elvárt** 19
programja és 168 esete (`externalCompleteness`). Két elfogadott alak van, és mindkettő ehhez a
készlethez szól:

1. **egy futás, ami maga is teljes** — a hatóköre teljes, és a 19 program minden elvárt esete ott
   van, zölden;
2. **a SOROZAT**, a **meglévő** EXS elfogadási szabállyal (`verifySeries` → `verdict.accepted`) — a
   szabály nincs újraírva, és a sorozat a **hivatkozott commitból** olvasódik, nem a munkafáról
   (a munkafán álló sorozat bármikor írható, tehát nem bizonyíték).

Ha a teljességet a sorozat adja, akkor a munkafát a **horgony származásához** mérjük, nem a
`results/` alatti, minden futással felülírt egyfutás-fájl commitjához — különben egy részleges mai
futás hitelesítene egy más forráson született sorozatot.

### 1.2 AZ EGYSZERI FUTÁS — a lezárt csomag új futást szolgált *(KUKA-491)*

Az MBX-01 azonossága tisztán **tartalmi** volt (`batch_id` = forrás + terv). Ugyanaz a forrás és
bontás ugyanazt az azonosítót adta, így egy **lezárt vagy megszakadt** korábbi csomag alapvonala egy
**új** indítás „friss" alapvonalaként elfogadható volt.

**A JAVÍTÁS.** A kettő szétvált: `batch_id` a **tartalmi** azonosság, `run_id` az **egyszeri
futáspéldány** (minden indításnál friss). A horgony, az alapvonal-bizonyíték, minden egység bélyege és
az összefűzés is ehhez kötődik; a horgony emellett az **elvárt alapvonal-forrást** is kimondja, és azt
a batch **kötéséből** veszi, nem a bizonyíték állításából. *Az „ugyanarról a forrásról" nem
„ugyanabban a mérésben".*

### 1.3 AZ ÖSSZEFŰZÉS KAPUJA — a kapcsolóra volt kötve *(KUKA-490)*

A `--merge` ágban a horgonyhoz mérés `if (BATCH_ARG)` alatt futott: a **kapcsoló nélkül** indított
összefűzés a megosztott egységek bélyegeit csak **egymáshoz** mérte, és a kapcsoló megadásakor sem
olvasta újra az alapvonal bizonyítékát.

**A JAVÍTÁS.** A kapu a **megosztott egységek létére** szól (`if (shared.length)`): a horgony
kötelező, az alapvonal-bizonyíték **újraolvasva** és a lenyomata **újraszámolva** ellenőrződik, és
minden bélyeg a horgony `batch_id`-jához, `run_id`-jához és kötéséhez mérődik, mezőnként. *A kapu ott
álljon, ahol a kár keletkezik — nem a parancssor alakján.*

### 1.4 AZ IDŐ — az óra az első előkészítés után indult *(KUKA-492)*

A `--units-auto` ágban az összesített óra a `prepareBatch(n)` **után** indult. Az R199-ben jelentett
„TELJES, az előkészítéssel együtt" **375 707 ms** ezért **nem** tartalmazta az első alapvonal **3 422
ms**-át — és a jelentett teljes idő **kisebb** volt a részfázisok összegénél (379 115 ms).

**A JAVÍTÁS.** A `phaseAccounting` tiszta függvény, szabályozható időforrással: az óra a
**parancsnál** indul, és az elszámolás **megméri magát** — a részösszegnél kisebb teljes idő nevezett
lelet. Nem drága lánccal mérjük, hanem itt.

---

## 2. ÉS KÉT SAJÁT HIBA, UGYANEBBEN A KÖRBEN

- **A lánc bemeneti listája nem fedte a batch futtatójának saját függőségét** *(KUKA-493)*. A
  `verify:v3ref` a felső szintű `v3ref/*.mjs`-t mérte, a `digestOfBundle` pedig **nem rekurzív** —
  így az `external-checks/batteryUnits.mjs` kiesett a kötésből. A lista innentől az MBX **saját**
  deklarációjából jön (`BATCH_EXTRA_FILES`), nem másolatból.
- **Az élő `MBX09` a lemezen HAGYOTT batch-könyvtárat mérte** *(KUKA-494)*, és ha az nem volt ott,
  kiírta a hiányt, de **zöld maradt**. Amikor a szerződés v2-re bővült, ez az ág a **helyes** kódra
  adott pirosat, mert a lemezen álló horgony még v1 volt. Innentől a próba **maga állítja elő a
  tárgyát** (`--batch-prepare`), és az előkészítés hibája **piros**, nem felirat.
- **A szerződés-bővítés kinőtte a saját rögzítőjét** *(KUKA-495)*: a v2 szabály mellett a fixtúra v1
  alakú horgonya **25 pirosat** adott egy helyes kódra — mind ugyanarra a gyökérre. A rögzítő most a
  szerződés **saját otthonából** építi a mércét (`newRunId()`, `baseline_source_digest` a kötésből).

---

## 3. A CÉLZOTT PRÓBÁK ÉS AZ ELLENPRÓBÁK

**TELJESSÉG — `npm run verify:sweep-reuse` (59/59 ZÖLD), négy új eset:**

| eset | mit mér | eredmény |
|---|---|---|
| `SRU11` | a mai `1/1` + `complete_evidence:false` | **ELUTASÍTVA**, nevezetten (nem-teljes jel · 18/19 hiányzó program · a sorozat-út sem adja) |
| `SRU12` | hiányos sorozat (18/19), **egyöntetűen zöld** saját számokkal | **ELUTASÍTVA**, a hiányzó program megnevezve |
| `SRU13` | valódi **teljes, kötött** sorozat (19/19) | **ELFOGADVA** — és az elfogadás a SOROZATOT nevezi meg |
| `SRU14` | érintett segédmodul változása (`v3ref/a.mjs` · `batteryUnits.mjs`) | **ÉRVÉNYTELENÍT** |

Mindegyiknél mérve: **az elutasítás NEM indít hosszú láncot** (a söprés 1-gyel zár, a lánc-jelölő
fájl nem keletkezik).

**BATCH — `npm run verify:mutation-batch` (MBX01–MBX13 ZÖLD), négy új eset:**

| eset | mit mér | eredmény |
|---|---|---|
| `MBX10` | két külön indítás ugyanazzal a forrással és tervvel | azonos `batch_id`, **külön** `run_id`; az „A" futás egysége a „B" horgony alatt elesik; a sajátjában elfogadott |
| `MBX11` | korábbi eredmény beadása új indításba | **ELUTASÍTVA** („az ALAPVONAL MÁS FUTÁSBÓL való"); a futáspéldány nélküli alapvonal is |
| `MBX12` | összefűzés horgony / bizonyíték nélkül — **és a `--batch` kapcsoló nélkül is** | mind **NEVEZETTEN** elutasítva, ÉLŐ `--merge` futással |
| `MBX13` | a jó batch teljes összeállítása | **nincs** batch-kötési akadály (pozitív kontroll) |

**ELLENPRÓBÁK — a javítást visszagörgetve a SAJÁT őrének pirosat kell adnia** (KUKA-051 · 089 · 122 · 207):

| visszagörgetés | mi tüzel |
|---|---|
| a teljesség-kapu kiejtése (`if (false && !comp.complete)`) | `SRU11` + `SRU12` bukik — **és a söprés 0-val zárt** a részprogram-bizonyítékra: ez maga a lelet |
| `if (shared.length)` → `if (BATCH_ARG)` | `MBX12`: „a `--batch` kapcsoló NÉLKÜL a megosztott egység horgony nélkül is összefűzhető volt (ez volt a rés)" |
| `--batch-prepare=0` (az előkészítés bukik) | `MBX09`: „a batch ELŐKÉSZÍTÉSE nem sikerült (kilépés 2)" — nem felirat, **piros** |

**A RÉGI POZITÍV KONTROLLOK ZÖLDEK:** `verify:external-series` (EXS01–EXS16) ·
`verify:unit-admission` (UAD01–UAD09) · `verify:external-decisions` (44/44) · `verify:kuka`
(1236/1236) · `verify:decision-numbers` (4/4) · `verify:artifact-naming` · `verify:release-order` ·
`verify:fogyasztas-meres` · a mag próbái (`node v3ref/run.mjs`) **69/69**.

*Egy pin-javítás menet közben:* az `MBX13` első mintám a puszta „horgony" szóra illeszkedett, és az
összefűzés **ártatlan** összegző sorát („0 elavult horgony") minősítette akadálynak — a próba a
szomszéd sort mérte (`KUKA-239`). A minta most a batch-kötés **nevezett** elutasító mondataira szűkít.

---

## 4. A VÉGES MÉRÉSI SOROZAT (§3) — MIND A 19 PROGRAM LEFUTOTT

A javított forrás rögzítve (`b5799c5`), a futtatót a mérés közben **nem** változtattam.

### 4.1 A mag mutációs battériája — TELJES ÉS TISZTA

| mit | mérve |
|---|---|
| lefedettség | **253/253** mutáció pontosan egyszer · hiány 0 · duplikátum 0 |
| verdikt | **253 elkapva** · 0 túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony |
| legrosszabb egység | **6 424 ms** (külső korlát 15 000 ms — nem emeltem) · minden egység belefér |
| beadvány-kapu | **BEFOGADVA** (MRG-01, RUN-02) · norma-lánc 78/169 sor FEDETT, hiányzó 0, idegen 0 |
| alapvonal | **1 tényleges futás · 3 334 ms** (a régi szerződésben ez 64× futott volna) |
| **teljes parancs** | **366 834 ms** — a parancs elejétől a végéig, az ELSŐ előkészítést is beleértve |
| részfázisok | 366 792 ms (alapvonal 3 334 + egységek 363 075 + összefűzés 383) |
| el nem számolt | 42 ms szülő-munka — **nevezve**, nem elhallgatva |

A teljes idő most **nagyobb** a részösszegnél, és a különbség meg van nevezve. Az R199-es alak ennek
az ellenkezőjét adta (375 707 < 379 115), mert az első 3 334 ms-ot kihagyta.

### 4.2 A 19 külső program — EGY sorozatban, EGY kötésről

Új sorozat: **`sc8598e8472f6`**, saját horgonnyal (19 elvárt program · tiszta kötés · származás
`84cadab`). Az R199-es `r59a` rekord a **saját** sorozatában maradt — nem neveztem át ebbe.

| program | állapot | kilépés | idő |
|---|---|---|---|
| `r83core` | befejezett | 0 | 569 133 ms |
| `r16core` | befejezett | 0 | 465 ms |
| `r92authz` | befejezett | 0 | 441 ms |
| `r88core` | befejezett | 0 | 420 ms |
| `r85core` | befejezett | 0 | 505 ms |
| `r77` | befejezett | 0 | 895 ms |
| `r75` | befejezett | 0 | 407 ms |
| `r69` | befejezett | 0 | 425 ms |
| `r67` | befejezett | 0 | 494 ms |
| `r61` | befejezett | 0 | 1 522 ms |
| `r81core` | befejezett | 0 | 567 806 ms |
| `r79core` | befejezett | 0 | 596 ms |
| `r79` | befejezett | 0 | **1 146 747 ms** |
| `r59a` | befejezett | 0 | 1 083 405 ms |
| `r57a` | befejezett | 0 | 1 088 488 ms |
| **`r59`** | befejezett | **1** | 19 077 ms |
| **`r57`** | befejezett | **1** | 53 477 ms |
| `r55` | befejezett | 0 | 536 924 ms |
| `r53` | befejezett | 0 | 6 646 ms |

**Egy program sem maradt „el nem indult", és egy sem szakadt meg.** A sorozat ideje **4 508 760 ms**
(75,1 perc) + az `r83core` külön mért 569 133 ms-a — a 6 órás keretnek a ~24%-a. Programonkénti
korlát: a futtató sajátja, **7 200 000 ms = 120 perc**; nem szűkítettem és nem emeltem.

**Az `r79` az, amit az R197-ben a saját 1500 s-os eszköz-korlátom megszakított** (ezt az R198-ban
helyesbítettem: MEGSZAKADT, nem „el nem indult"). Most **végigment**, 1 146 747 ms alatt.

### 4.3 AZ ELFOGADÁSI KAPU: TELJES, HORGONYZOTT, MAI — DE NEM ELFOGADVA

```
series=sc8598e8472f6  complete=true  anchored=true  fresh=true  accepted=false
green=17  failed=2  invalid=1  measured=19  of=19
```

A kapu kilépési kódja **3** (`verify:external-series -- --gate`), ahogy a szerződés mondja.

**A két nem zöld program a külső fél VÁLTOZATLAN, eredeti programja** (`r57_chatgpt-v3.mjs`,
`r59_chatgpt-v3.mjs` — „változatlanul, ahogy a boardon érkezett"). Mindkettő a SAJÁT bejelentett
**15 000 ms-os belső korlátjába** futott, ami a nevesített `ENV_LIMIT_KINDS` egyetlen fajtája
(`wall_clock_timeout`). **Ezt a korlátot a SPEC tiltja emelni, a programokat pedig nem módosítom.**

- **`r59`** — érvénytelen rekord: a program **eredmény nélkül** állt meg, tehát részletes bizonyíték
  sem keletkezett. A futtató a saját szavával: *„két jel, KÖZÖS OKBÓL (nem független tanúk)"*. A
  lefedettségi hiány mind a 7 esetre áll (P01 · E05 · E06 · E07 · E08 · P02 · E09), tartalmi bukás
  **nincs** — a kettő ortogonálisan utazik, ahogy a §1b-ben megterveztem.
- **`r57`** — tartalmi bukás: `T01✗ T02✗ T03✓ T04✓ T05✗ E01✓ E02✗ E03✗ E04✓`. A futtató ezt is
  szétszedi: **mért időtúllépés 2 esetben** (E02 · E03), és a `T01 · T02 · T05` a **bejelentett
  szabályváltás** miatt bukik (R63, `invite_without_basis`) — tehát nem új regresszió.
- **Az ADAPTÁLT párjuk átment:** `r57a` 1 088 488 ms, `r59a` 1 083 405 ms. Pontosan ezért létezik az
  adaptáció.

**AMIT EBBŐL NEM KÖVETKEZTETEK.** Nem állítom, hogy a mag hibás: a két bukás a külső programok saját
korlátján és egy bejelentett szabályváltáson áll. De azt sem állítom, hogy „zöld": az elfogadási kapu
**PIROS**, és ez a kör mért állapota. Nevesített függő, nem elintézett tétel.

### 4.4 A BÖNGÉSZŐS KAPU: LEFUTOTT

**154 eset zöld, 8,9 perc, kilépés 0** (`proof:core-ux` · Playwright · Chromium). A suite a saját
negatív kontrolljával együtt fut (R127-N1: a kapu kikapcsolásával a mérés állítása elbukik), tehát
nem díszpipa.

Az indításhoz egy **helyi, lockfile-alapú** telepítés kellett, és a buktatót érdemes kimondani: a
konténerben **`NODE_ENV=production`** áll, ezért az `npm ci` `omit=dev`-vel futott, és az első
telepítés csak 14 csomagot tett fel — a `@playwright/test` **nem** került fel, a
`node_modules/@playwright/` üres könyvtár maradt. A hibát a kapu maga mondta ki
(`ERR_MODULE_NOT_FOUND`). A javítás helyi: `NODE_ENV=development npm ci --include=dev`, az **előre
telepített** Chromiummal (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`), letöltés nélkül. **Mérve: a
`package.json` és a `package-lock.json` bájtazonos maradt** mindkét telepítés után — forrás-,
lockfile-, Railway- és fizetett infra-változás nem történt.

---

## 5. A KÖR FOGYASZTÁSA

Mérve, modellhívás nélkül (`npm run meres:fogyasztas -- --session auto --from … --quick`):

| mit | mérve |
|---|---|
| hívás | 324 |
| fő-szál kontextusmedián | **326 148** · max 783 937 |
| **ügynök-bemenet** | **0 (0 ügynök)** — ebben a körben al-ügynököt nem indítottam |
| cache-olvasás | 123 391 989 [teljes összeg] |
| lefedettség | **teljes** (a mérés a futó folyamat saját azonosítójára kötött) |
| sáv (a mérő mondja ki) | **FIGYELMEZTETÉS** — a 300 000–400 000 sávban: rövid állapotmérés a munkablokk határán, **megállni nem kell, új beszélgetés nem kell** |

Az ablak kezdetét a csomag kezdetéhez igazítottam; **a határ bizonytalan, ezért jelölve** — a
board-üzenet pontos időbélyegéhez képest pár perc eltérés lehet. A kísérleti ügynök-jelző
(> 40 M / csomag) **nem** lépett életbe: nulla ügynök-bemenet.

---

## 6. AMI NYITOTT MARADT — NEVESÍTVE

1. **Az elfogadási kapu PIROS** (`accepted=false`): a külső fél két **eredeti** programja (`r57`,
   `r59`) a saját bejelentett 15 000 ms-os belső korlátjába fut ezen a gépen. A korlát nem emelhető,
   a programok nem módosíthatók. Ami ebből **eldönthető** volna, de nem az én döntésem: a külső fél
   nyilatkozata arról, hogy az eredeti programok korlátja a mai gép-osztályon mérésre alkalmas-e,
   vagy az adaptált változat az egyetlen mérhető alak. **Ez chatgpt-v3/operátori döntés.**
2. **Az `r57` három esete bejelentett szabályváltás miatt bukik** (R63, `invite_without_basis`). Ez
   historikusan ismert, de a programonkénti verdiktben **minden körben** újra megjelenik. Nevesített
   függő: vagy az eset-manifeszt mondja ki, hogy ez a három eset a mai szerződés szerint elvárt
   módon bukik, vagy a külső fél frissíti a programot. Kivezetési feltétel nélkül nem írom át.
3. **A `digestOfBundle` nem rekurzív** (BND-01). Az MBX-függőséget most **névvel** fedtem le
   (`BATCH_EXTRA_FILES`), de a gyökér-ok megmaradt: aki új alkönyvtárat visz be a mag forrásába,
   annak kézzel kell a listát bővítenie. Nevesített függő: rekurzív köteg-lenyomat, külön körben,
   mert a `base_digest` megváltozása MINDEN korábbi mutációs bizonyítékot érvénytelenít.
4. **Az egység-fájl nincs kriptográfiailag a futásához kötve** — ezt a futtató maga írja ki minden
   összefűzésnél („kézzel írt egység-fájl is beolvadna; a forrás-lenyomat egyezése szűkít, de nem
   bizonyít"). Nevesített függő: aláírt egység-tanú. A mai kapuk a bizonyíték **kezelését** mérik.

---

## 7. AMIT EZ A KÖR NEM TETT MEG

Nem volt merge, deploy, force-push, titok- vagy üzleti-adat-változás, V2- vagy production-érintés,
fizetett infra, al-ügynök, Codex vagy helyettesítő AI-szemle, CMD/PR-zárás. A termékkódot
(`v3app/`), a külső eredeti/mag/adaptált programokat, a külső pint és a külső elvárást **nem**
módosítottam. A 12 000 ms-os egység- és a 15 000 ms-os külső korlát **nem emelkedett**.
