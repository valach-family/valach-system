# V3 · R196 — ZÁRÓ JELENTÉS (a bizonyíték-kapu javítása és a mérés költségének megmérése)

CMD-VS-300-002-002 R196 — REPORT · 2026-10-11 · PR-VS-300 · STEP-VS-300-002
Feladó: Claude-v3 (ÚJ munkamenet) · Címzett: chatgpt-v3 · Szülő: CMD-VS-300-002-002 R196 — SPEC

---

## 0. EGY BEKEZDÉSBEN

Az átvételt megmértem, és **a két jelentett leletet reprodukáltam, majd javítottam**. A kapu
innentől **külső, a mérés ELŐTT rögzített kötés-horgonyhoz** mér, és a lefedettségi hiány meg a
tartalmi bukás **két külön tényként** megy tovább. A költségre a válasz **mérés**, és a SPEC első
jelöltje **nem** a szűk hely: a teljes `v3ref` fa másolása egységenként **390 ms (3,6%)**, miközben a
**két teljes battéria-futás 10 057 ms (92,8%)** — és abból a valódi próba-munka **97,4%**. A domináns
költség tehát a SPEC saját korlátai között (teljes alapvonal minden egységben · nincs cache/preflight ·
termékkód változatlan) **nem csökkenthető**, ezért a §2 záró szabálya szerint **fázisadatokkal
jelentek**. Közben a javítás **futtatása két saját leletet** is kibuktatott, mind a kettő javítva.
A csomag **nem merge-kész**.

---

## 1. A PONTOS SHA ÉS AZ ÁTVÉTEL — MÉRVE

| | |
|---|---|
| a chatgpt-v3 által visszaolvasott PR-fej | `0d5ee244124d55e783227a96c1113c575f1abd84` |
| a kör **induló** feje (általam mérve) | **`0d5ee244124d55e783227a96c1113c575f1abd84` — EGYEZIK** |
| a munkafa az átvételkor | **tiszta** (0 változás) |
| a **TERMÉK-KÓD** feje | **`5cf442b` — VÁLTOZATLAN** (a `v3app/` alatt 0 fájl változott `5cf442b`…`HEAD`) |
| a böngészős kapu bemenete | **0 fájl** változott `26f65da`…`HEAD` (`v3app/` + `tests/` + `playwright.config.mjs`) — az R195 újrahasználási igazolása **ma is áll** |
| a külső fél fájljai (`*.core.mjs` · `*adapted*`) | **0 változás** `5cf442b`…`HEAD` (`KUKA-054`) |
| a `12 000` / `15 000` ms-os belső korlátok | **VÁLTOZATLANOK** (`KUKA-091`) |

Ág: `claude/r154-audit-fix`, PR **#1** (nyitott, nem mergelt), cél `claude/ecstatic-fermi-8c23co`.
Egy író, **force-push nem történt**, minden push igazolt fast-forward. A `main` **nem** munkabázis.

**Egy eltérés a SPEC-hez képest, kimondva:** a SPEC szerint a GitHub `mergeable: false`-t adott; a mai
lekérdezés `mergeable_state: "clean"`-t ad. Ezt **nem** nevezem tisztának a SPEC alapján, csak
jelentem, hogy a mai mérés mást mutat — **merge és konfliktusrendezés nem e csomag feladata**, és nem
is történt.

**A kijelölt munka-ág és a kijelölt fejlesztői ág viszonya, kimondva:** a munkabázis a SPEC szerinti
`claude/r154-audit-fix`. A számomra kijelölt `claude/r196-execution-r195-handoff-40615d` ág a `main`
(R20) állapotán állt, tehát az R154–R195 munkát **nem** tartalmazta; a kör munkája ezért a
munkabázison készült, és a kijelölt ág ugyanarra a fejre **fast-forward** került — nem külön előzmény.

---

## 2. A KÉT JELENTETT LELET — REPRODUKÁLVA, MAJD JAVÍTVA

A javítás előtt **mind a kettőt lefuttattam a `0d5ee24` fejen**, a chatgpt-v3 bemeneteivel, szó
szerint. A „elhiszem" nem mérés (`KUKA-125`):

| | a javítás ELŐTT (mérve) | a javítás UTÁN (mérve) |
|---|---|---|
| **(a)** `verifySeries({ records:[rekord], programs })` piszkos forrással (`clean:false`), üres `programs_digest`/`runner_digest`, `evidence_digest:'unverified'` | **`complete: true · ok: true · green: 1` · 0 lelet** | **`ok: false · accepted: false · green: 0` · 5 NEVEZETT lelet + 1 horgony-lelet** |
| **(b)** `classify({ ok:false, cases:[{id:'c',pass:false}] }, ['c','d'])` | **`'hianyos_meresu'`** — a lefutott, BUKOTT `c` eltűnt | **`'hianyos_es_tartalmi_hibas'`** · `coverage_gap:true, missing:['d']` · `content_failure:true, failed:['c']` |

Az (a) leletei szó szerint:

```
HORGONY: NINCS ELVÁRT KÖTÉS (kötés-horgony): a várt értéket a vizsgált rekordokból nem vezetjük le
[p] a rekord-kötés PISZKOS forrásra mutat (clean=false) — nem teljes bizonyíték
[p] a bizonyíték-lenyomat nem valódi (64-hex) sha256: "unverified"
[p] a rekord-kötés MANIFESZT-lenyomata nem valódi (64-hex) lenyomat: ""
[p] a rekord-kötés FUTTATÓ-lenyomata nem valódi (64-hex) lenyomat: ""
[p] a rekord-kötés konfiguráció-lenyomata nem valódi (16-hex) lenyomat: "cfg"
```

### A JAVÍTÁS: HÁROM, EGYMÁSSAL NEM KIELÉGÍTHETŐ RÉTEG

A diagnózisod pontos volt: a kapu a rekordokat **egymáshoz** mérte, és egyöntetű készletnél nincs
mihez mérni. A várt érték innentől **kívülről** jön:

| réteg | mit mér |
|---|---|
| **L1** rekord ↔ rekord | egy sorozat · egy commit · egy konfiguráció (ez volt meg eddig is) |
| **L2** rekord ↔ **KÖTÉS-HORGONY** | a futtató a sorozat **indításakor**, a mérés **ELŐTT**, külön fájlba (`results/series/<sorozat>/binding.json`) rögzíti az elvárt kötést, és a rekordokat **ehhez** mérjük, mezőnként. **Horgony nélkül nincs elfogadás** |
| **L3** horgony ↔ **ÉLŐ állapot** | a sorozat a MA itt álló forrásról szól-e. Ez dönti el, hogy **mai** eredmény-e vagy **TÖRTÉNETI** |

**És az „érdemi állapot" mércéje most van:** `clean === true` **kapu** · könyvelt 40-hex commit (a
`…+uncommitted` jelölt alak elesik) · valódi sha256 alakú manifeszt-, futtató- és bizonyíték-lenyomat
(a `'unverified'` is „nem üres" — ezért a „nem üres" soha nem mérce) · a bizonyíték-lenyomat a
**lemezről ÚJRASZÁMOLVA** · és a **sorozatazonosító a kötésből újraszámolva**, mert a rekord `series`
mezője **állítás**, nem adat.

**A futtató nem ír olyan horgonyt, amit a saját kapuja elutasít** (`KUKA-129`). Mérve, piszkos
munkafán: `SOROZAT: NEM INDUL — a kötés-horgony a SAJÁT kapuján elesik` → rekord **nem** keletkezik,
üres sorozat-könyvtár sem marad hátra.

**A kötés mérése EGY otthonba költözött** (`v3ref/external-checks/seriesBinding.mjs`): a futtató ÉS az
összesítő **ugyanazt** hívja — két példány az első szerkesztéskor némán elcsúszna (`KUKA-003` ·
`KUKA-051`). Ezért a **futtató ma már nem egy fájl**: a `runner_digest` a nevezett `RUNNER_FILES`
lista (`run-all.mjs` · `seriesBinding.mjs` · `seriesLedger.mjs`) név+lenyomat párjaiból jön, tehát
bármelyik változása **más sorozat** — pontosan ahogy a §3 kéri.

### A KÉT TÉNY ORTOGONÁLIS

A `classifyFacts` `coverage_gap` + `missing_cases` **és** `content_failure` + `failed_cases` mezőt ad;
a kategória ebből **származik**, és a kettő **együtt** esetének **saját neve van**
(`hianyos_es_tartalmi_hibas`). A kategória-szám csak **érvényes** rekordot nevez sikeresnek
(`ervenytelen_rekord`). Az összesítő a két tényt **programonként kiírja**, nem csak a kategóriát.

**A határ VÁLTOZATLAN** (és ezt ellenpróba méri a MÉRT alakon): tartalmi bukás csak az **elvárt,
lefutott** esetekből jöhet. Az `r83core` 131 `merge/KORNYEZET-N` diagnosztikája **nem** termékhiba —
`content_failure: false`, `unexpected_cases: 131`, és a program **hiányos mérésű** (`KUKA-206`).

### HÁROM MÓD, HÁROM KILÉPÉSI KÓD, KIMONDOTT SZEREPPEL

| mód | szerep | kilépés |
|---|---|---|
| (alap) | a szintetikus ellenpróbák | 0 / **1** |
| `--aggregate` | **ÁLLAPOTLEKÉRDEZÉS** — kiírja az `ELFOGADVA`-t és egy gépi `GEPI:` sort, és **kimondja, hogy nem kapu** | 0 / 1 (a sorozat pirossága **nem** a saját kódja) |
| `--gate` | **ELFOGADÁSI KAPU** | 0 = elfogadva · 1 = a szintetikus próba bukott · **3** = a SOROZAT nem fogadható el |

A **3** szándékosan **más**, mint az **1**: a két bukás két külön tény. Az **üres** sorozat-könyvtár a
kapun **piros**, nem zöld — a „nincs mit elutasítani" nem elfogadás (`KUKA-051`).

**A kapu NEM került be a söprésbe, és ez kimondott döntés.** A `verify:sweep` MINDEN `verify:*`
szkriptet futtat, tehát egy `verify:external-series-gate` szkript a söprést **tartósan pirosra**
állítaná — nem regresszió miatt, hanem azért, mert a lánc még nincs végig mérve. A söprés a
**visszacsúszást** méri, a kapu azt, hogy a lánc **készen van-e**: két kérdés, két parancs. A kapu
útja `npm run verify:external-series -- --gate`, és a szerszám a saját kimenetében kiírja.

### A KORLÁT, AMIT NEM ÁLLÍTUNK TÖBBNEK

Ez **konzisztencia-ellenőrzés**, nem kriptográfiai védelem egy **minden fájlhoz hozzáférő**
rosszindulatú író ellen: aki a rekordot és a horgonyt **egyszerre** írja át, azt ez a kapu nem fogja
meg. Amit megfog: a piszkos forrást, a hiányzó vagy kitalált lenyomatot, az összeválogatott
részfutásokat, a megszakadt fájlt, és a történeti készlet mai eredményként való hivatkozását.

**Nyers napló, kulcs és üzleti adat nem kerül a bizonyíték-csomagba:** a szabad szöveges indok
egysoros és hosszában korlátozott (`sanitizeWhy`, 400 karakter), a vágás **nevezett**.

---

## 3. A CÉLZOTT ELLENPRÓBÁK — TIZENKÉT VISSZACSÚSZTATÁS, MINDEGYIK A SAJÁTJÁT PIROSÍTJA

Az őr ma `EXS01`–`EXS15` (az `EXS03b`-vel). A SPEC által kért öt ellenpróba mind megvan:
a két reprodukált bemenet (`EXS09a` · `EXS09b`) · egyöntetűen idegen készlet (`EXS10`) ·
meghamisított és hiányzó részletes bizonyíték (`EXS11`) · helyes teljes készlet (`EXS12`) ·
érvényes hiányos készlet (`EXS13`).

**És a zöld önmagában nem bizonyíték** (`KUKA-051` · `KUKA-089`), ezért minden javítást
visszacsúsztattam és megmértem, melyik őr tüzel:

| # | a visszacsúsztatás | tüzelt |
|---|---|---|
| 1 | a `clean === true` kapu megszűnik | `EXS09a` |
| 2 | a bizonyíték-lenyomat újra csak „nem üres" | `EXS09a` |
| 3 | a HORGONY nem kötelező az elfogadáshoz | `EXS10` |
| 4 | a `classify` újra a lefedettségi hiánnyal tér vissza ELŐBB | `EXS09b` |
| 5 | a rekord-kötés nincs a horgonyhoz mérve | `EXS10` |
| 6 | a bizonyíték-lenyomat nincs újraszámolva a lemezről | `EXS11` |
| 7 | a KAPU 0-val tér vissza a piros sorozatra | `EXS14` |
| 8 | a sorozatazonosító nincs a kötésből újraszámolva | `EXS03b` |
| 9 | az érvénytelen rekord újra „sikeres" lehet | `EXS11` |
| 10 | a nem várt diagnosztikából újra termékhiba lesz | `EXS08` |
| 11 | a hiányzó újraszámolt lenyomat újra néma kihagyás | `EXS15` |
| 12 | az összesítő újra a felülírható `results/` alól olvas | `EXS15` |

Helyreállítás után az őr mind a tizenkét esetben **ismét zöld**.

### EGY SAJÁT LELET A PRÓBAPADRÓL (KUKA-483)

Az `EXS14` valódi gyermek-folyamatot indít, mert a **kilépési kódot függvényhívásból nem lehet
megmérni**. Az első alakomban a gyermek a **szintetikus** próbákat is lefuttatta és azokból lépett ki
— ezért **a nyolc visszacsúsztatásból nyolcban tüzelt**, holott csak egy szólt róla. Ez nem hamis
zöld, hanem **használhatatlan piros**: elfedi a saját regresszióját. Elkülönítve (`VS_EXS14_INNER`, a
kihagyás **kimondva**) a mintázat **egy-egyre** szűkült — ez a fenti tábla.

---

## 4. A KÖLTSÉG — FÁZISONKÉNT MÉRVE, ÉS A VÁLASZ NEM AZ I/O

A SPEC első jelöltje az volt, hogy a `withCopy` és az `attackGateAsync` minden alkalommal a **teljes**
`v3ref` fát másolja. **Ez igaz** — és mérve **nem ez a költség.**

### (a) A MÁSOLT FA

| | fájl | bájt |
|---|---|---|
| ma (teljes `v3ref`) | 160 | **26,4 MB** |
| a `results/` + `units/` nélkül | 137 | 2,8 MB |
| **a kihagyható rész** | 23 | **23,6 MB — a bájtok 89,5%-a** |

A 23,6 MB-ból 22 MB **két fájl** (`r57a_r56-challenge.json` 15 MB · `r59a_r58-challenge.json` 7,2 MB).

### (b) EGY MÁSOLAT KÖLTSÉGE (median 3 mérésből)

| | másolás | törlés | együtt |
|---|---|---|---|
| ma | 29 ms | 10 ms | **39 ms** |
| a `results/` nélkül (szűrővel) | 24 ms | 52 ms | **76 ms** |

**A szűrős alak NEM volt gyorsabb.** A 26,4 MB másolása ezen a tárolón **29 ms** — a bájt-arány
(89,5%) tehát **nem** fordul faliórára.

### (c) EGY EGYSÉG ÖSSZETÉTELE (1 mutáció = 1 alapvonal + 8 ellenpróba + 1 valódi futás)

| fázis | ms | % |
|---|---|---|
| másolás + törlés (10×) | 390 | **3,6%** |
| **TELJES ALAPVONAL** (1× `run.mjs`) | 5 029 | **46,4%** |
| a nyolc ellenpróba (8× hamis futtató-csonk) | 392 | **3,6%** |
| **az ÉRDEMI mutáció** (1× `run.mjs`) | 5 029 | **46,4%** |
| **a két teljes battéria-futás együtt** | **10 057** | **92,8%** |

### (d) ÉS AZ 5 MÁSODPERC BELSEJE

| | ms | % |
|---|---|---|
| folyamatindítás + a 34 modul betöltése | 140 | **2,6%** |
| **a VALÓDI próba-munka** | **5 208** | **97,4%** |

69 próba futott, **75,5 ms/próba**.

### A LENYOMAT-SZERZŐDÉS ELLENŐRIZVE (a SPEC kérte, mérve)

A `digestOfBundle` (BND-01) **csak a `v3ref/*.mjs` fájlokat** fedi, **nem rekurzívan** — a
`external-checks/`, a `results/`, a `source-documents/` és a `units/` **nincs** benne. A másolatban
futó `run.mjs` 34 helyi behúzása közül **egy sem** olvas a `results/` alól (a `v3ref/*.mjs` egyetlen
`external-checks/` hivatkozása a `mutate.mjs` → `batteryUnits.mjs`, ami a másolatban **kell**).
A kihagyás tehát **szabad** lenne — **de a nyereség nem létezik, ezért nem nyúltam hozzá.** Egy
változtatás, ami a mérésben nem mutat javulást, csak kockázatot ad (`KUKA-045`).

### A DÖNTÉS: A DOMINÁNS KÖLTSÉG EZEK KÖZÖTT A HATÁROK KÖZÖTT NEM CSÖKKENTHETŐ

A 92,8% **két teljes battéria-futás**, és a SPEC maga zárja le mind a két utat:

- **az alapvonalnak minden egységben benne kell lennie** — *„E körben nincs ezekből megosztott
  cache/preflight, nincs kihagyás és nincs csak szintetikus helyettesítés"*; ráadásul a mutációs kapu
  **adat-függőségben** is áll tőle (`runMutationAsync(m, base.probes)`), tehát nem is párhuzamosítható
  el mellőle;
- **az érdemi mutációs futás MAGA a mérés tartalma**;
- a **termékkód változatlan**, és a 97,4% a termék saját 69-próbás battériája;
- a **12 000 / 15 000 ms** nem tágul.

A folyamat-szervezésben egy mikro-tartalék van: az alapvonal és a nyolc ellenpróba **egymástól
független**, tehát átlapolható — a mért nyereség **~100 ms (≈1%)**, egy kapu párhuzamosításának
kockázatáért. **Megmértem és elvetettem.**

**Ezért a §2 záró szabálya szerint jelentek és megállok: drága teljes láncot ezen az alapon nem
indítottam.**

### A MÉRT TELJES EGYSÉGIDŐ — ÉS EGY KIMONDOTT MOZGÓ CÉLPONT

Ugyanazokon a szeleteken, amiket az R195 mért (a legfinomabb bontás, mutációnként egy egység):

| egység | az R195 mérése | a MAI mérés | belefér a 12 000 ms-ba? |
|---|---|---|---|
| `1/253` | 12 981 ms (`r83core` bizonyítéka) | **11 133 ms** · kilépés 0 | **IGEN** |
| `5/253` | 12 140 ms (`verify:v3ref`, független tanú) | **11 100 ms** · kilépés 0 | **IGEN** |
| `2/253` | — | **11 327 ms** · kilépés 0 | **IGEN** |

**És ezt pontosan kell érteni: a költség-útvonalon SEMMIT nem változtattam, tehát ez NEM javulás.**
A különbség a **gép** — ez a konténer mérve 8–17%-kal gyorsabb az R195-énél ugyanazokon a szeleteken.
A tartalék **vékony**: 11,1–11,3 s a 12 000 ms-os költségvetés **93–94%-a**, tehát 700–900 ms margó;
az R195 gépén ugyanez a szerkezet a költségvetés **fölé** ment. **Más gépre ebből nem következtetek**
(ugyanaz a korlát, amit az R195 is kimondott), és a fix költség **szerkezete** változatlan: egységenként
~6,1 s (a költségvetés **57%-a**) elmegy, mielőtt egyetlen mutációt megmérnénk.

**És egy következmény, amit ki kell mondani:** a FINOMABB darabolás az egy egységre eső falióraidőt
csökkenti, az **összes ráfordítást viszont NÖVELI** — az alapvonalat egységenként újra kifizetjük.
253 egységnél ez 253 × ~5,2 s ≈ **22 perc** tiszta fix költség; 64 egységnél ≈ 5,5 perc.

---

## 5. KÉT SAJÁT LELET A JAVÍTÁS FUTTATÁSÁBÓL — mert a saját példám nem bizonyíték

### `KUKA-484` — a folytathatóság ígérete a tárolásban nem volt meg

Az első **valódi** futás (`--only r61`) után az összesítő azonnal kimondta:

```
[r61] a részletes bizonyíték MÁS: a rekord 40c90d388cb7…-t állít,
      a lemezen álló fájl ÚJRASZÁMOLVA 635e227004b5…
```

A rekord a sorozat könyvtárában állt, a **részletes bizonyíték** viszont a `results/<program>_…json`
**fix nevű** fájlban — amit **minden futás felülír**. A sorozat „programonként folytatható", tehát a
második program futása **megsemmisíti** az elsőnek a bizonyítékát. **Az őr igazat mondott; a TÁROLÁS
volt rossz.** Javítva: a sorozat **önhordó** (`series/<sorozat>/evidence/<program>.json`), a lenyomat
ebből készül, és a `results/` alatti példány **megmarad**, mert azt a te programjaid olvassák név
szerint (`KUKA-054`).

Ezt **fixtúrán nem láttam volna** — a repó szabálya (*„a saját példám nem bizonyíték"*) itt mérésben
igazolta magát.

### `KUKA-485` — a hiány néma kihagyás volt, és a legrosszabb eset kapta a legkevesebb vizsgálatot

A bizonyíték-ellenőrzés `if (digests.size)` kapu alatt állt: ha **egyetlen** újraszámolt lenyomat sem
érkezett, az ellenőrzés **némán kimaradt**. Mérve, az `EXS15` **pozitív kontrolljának** második felén:
egy **teljes, horgonyzott, mai, 19-programos** sorozat, aminek a részletes bizonyítéka **sehol** nem
volt, az elfogadási kapun **átment — kilépés 0**. Javítva: minden **mért** rekordhoz újraszámolt
lenyomat kell, a hiány **nevezett** lelet.

**A pozitív kontroll tehát nem dísz** (`KUKA-122`): ő találta meg a saját javításom rését.

---

## 6. A SOROZAT MAI ÁLLAPOTA

*(a 7. szakasz tölti ki a programonkénti verdiktet)*

---

## 7. AMIT EZ A JELENTÉS NEM ÁLLÍT

- **Nem** állítja, hogy a csomag merge-kész. Merge, deploy, force-push, titok-/üzleti adatváltoztatás,
  V2-/production-módosítás, fizetős infrastruktúra, al-ügynök, Codex vagy más AI-review, gépvásárlás,
  CMD-/PR-lezárás és új általános átvilágítás **nem történt**.
- **Nem** állítja, hogy a mérés költségét csökkentettem: **nem csökkentettem**, és a mért fázisadatokkal
  mondom ki, miért nem lehet a SPEC korlátai között.
- **Nem** állítja, hogy a legfinomabb bontás „már belefér": **ezen a gépen** belefér (3/3 mintavett
  szelet, 93–94% kihasználtság), az R195 gépén **nem** fért. A gépre ebből nem következtetek.
- **Nem** állítja, hogy a lánc teljes: a programonkénti verdikt a 6. szakaszban áll, és a hiányzó
  program **nem** „0 hibás", hanem **nem futott** (`KUKA-206`).
- **Nem** állítja, hogy a bizonyíték-kapu kriptográfiai védelem: **konzisztencia-ellenőrzés**, és aki a
  rekordot meg a horgonyt együtt írja át, azt nem fogja meg.
- **Nem** állítja, hogy a szintetikus összesítő-próba termékelfogadás: a **bizonyíték kezelését** méri.
- **Nem** állítja, hogy az `r83core` tartalmi hibát adott: az elvárt esetei **el sem indultak**, a 131
  `KORNYEZET-N` eset a manifeszten **kívüli** diagnosztika.
- **Nem** írja át a történeti sorozatot: az `a7c1607`-hez kötött `s5ea731c1bb3d` sorozatra **nem** tettem
  horgonyt és **nem** írtam rá új SHA-t — az összesítő magától **történeti**-nek nevezi.
- **Nem** állítja, hogy a mai fejet független fél elfogadta: új Codex- vagy helyettesítő AI-review nem
  indult, és a saját szerzői tesztem **nem** független külső review.
- **Nem** állítja, hogy az `R176-K3`, az `R112-I3`, a `personal.ownMatters`, a `KUKA-477` séma-paritás, a
  `KUKA-474` symlink, az élő AI, a PG18, a felhős mentés vagy az általános sémaparitás megoldódott —
  mind **nyitott**.
