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
jelentek**. A sorozat **1-ről 12-re** jutott (mind érvényes, horgonyzott, mai), de az összegző verdikt
**továbbra sem létezik**. Közben a javítás **futtatása négy saját leletet** is kibuktatott, mind a négy
javítva — és a **záró söprés a saját kör-közbeni állításomat is megbuktatta**: a legfinomabb bontás
ezen a gépen SEM fér bele egységesen (`3/253` = 12 348 ms), tehát az R195 szerkezeti lelete áll.
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

### EGY HELYESBÍTÉS A SAJÁT ELEMZÉSEMHEZ: A MUTÁCIÓS FUTÁSOK POOLOZVA MENNEK

A fenti tábla **egy mutációs** egységre igaz, és a `4 × 5 029 ms` szorzás **téves volna**: a
`runMutationAsync` egy **pool**-ban fut (`POOL = min(16, 4 × vCPU) = 16`), tehát az egy egységbe
eső mutációk **egyidejűleg** mennek. Ezt az `r55` futása buktatta ki (64 egység, mutációnként
~4 mutáció), és **mérve**:

| bontás | mutáció / egység | mért egységidő |
|---|---|---|
| 253 egység | 1 | **11,1–11,3 s** |
| 64 egység (`r55`, 792 s / 64) | ~4 | **12,4 s** |

Vagyis a **fix** költség ~**10,9 s**, a **marginális** költség ~**0,43 s/mutáció** — három extra
mutáció **1,3 s**. Ebből két dolog következik, és mind a kettő fontos:

1. **A fix költség a költségvetés 91%-át elviszi**, mielőtt egyetlen mutációt megmérnénk. Ez a §4
   (a)–(d) táblájának igazi jelentése.
2. **A FINOMABB darabolás összességében SOKKAL többet fogyaszt**, mert az alapvonalat egységenként
   újra kifizetjük: a 253 mutáció **64 egységen 13,2 perc** (mérve: `r55` = 792 s), **253 egységen
   ~47 perc** — **3,5-szeres**. A legfinomabb bontás tehát az egy egységre eső faliórát csökkenti, a
   **teljes ráfordítást növeli**; az R195 megállási feltétele helyes volt, de a „legfinomabb" nem
   egyben a „legkevesebb munka".

### A MÉRT TELJES EGYSÉGIDŐ — ÉS EGY KIMONDOTT MOZGÓ CÉLPONT

Ugyanazokon a szeleteken, amiket az R195 mért (a legfinomabb bontás, mutációnként egy egység):

| egység | az R195 mérése | a MAI mérés | belefér a 12 000 ms-ba? |
|---|---|---|---|
| `1/253` | 12 981 ms (`r83core` bizonyítéka) | 11 133 ms · kilépés 0 | igen |
| `5/253` | 12 140 ms (`verify:v3ref`, független tanú) | 11 100 ms · kilépés 0 | igen |
| `2/253` | — | 11 327 ms · kilépés 0 | igen |
| **`3/253`** | — | **12 348 ms** (a záró söprés `verify:v3ref`-je) | **NEM** |
| **`4/64`** | — | **13 691 ms** (ugyanott) | **NEM** |

### HELYESBÍTÉS — A HÁROM MINTÁM NEM VOLT BIZONYÍTÉK

A három fenti szeletet én választottam, és mind a három belefért. **Ebből azt írtam le a kör közben,
hogy „a legfinomabb bontás ezen a gépen belefér" — és ez az állítás HAMIS volt.** A záró söprés
`verify:v3ref`-je, ami a szeleteken VÉGIGMEGY (nem hármat mintáz), kimondta:

```
RESULT (EGYSÉG 3/253): a szelet TISZTA · belefér a korlátba: NEM
  GEPI-JEL: unit_over_budget
  a falióra (12 348 ms) a saját költségvetés (12 000 ms) fölé ment
NINCS TOVÁBBI FOK: a LEGFINOMABB megengedett, nem üres felosztás (253 egység, mutációnként egy)
  sem fér bele a költségvetésbe — a mérés HIÁNYOS
```

**Tehát az R195 szerkezeti lelete EZEN A GÉPEN IS ÁLL.** A gép valóban gyorsabb (a bukó szeleten
12 981 → 12 348 ms, ~5%), de **nem elég gyorsabb**: a legfinomabb felosztás **nem** fér bele
egységesen, és a `verify:v3ref` ugyanazt a nevezett, véges verdiktet adja, mint az R195-ben.

**Ez pontosan az a hiba-osztály, amire a repó szabálya szól** (*„A SAJÁT PÉLDÁM NEM BIZONYÍTÉK"* ·
`D-VS-477`): amit én választok fixtúrának, az az én előfeltevésemet igazolja vissza. Három szelet
nem a 253 szelet; a mérést a **teljes** készleten kell megismételni, és itt a saját söprésem buktatta
ki a saját állításomat.

**A szám, ami ezt megmagyarázza, a §4 (c)–(d) és a pooling-helyesbítés:** a fix költség ~**10,9 s**,
a költségvetés **12 000 ms** — tehát a margó ~**1,1 s (9%)**, a szeletek közti szórás pedig **ezt
meghaladja** (11,1 → 12,3 s a mért szeleteken). A költségvetést nem a *tartalom* feszíti, hanem a
**fix költség + a szórás**. Más gépre ebből nem következtetek.

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

### `KUKA-486` — a kapu a saját bizonyítéka közzétételét sem élte túl

Ez a **szállítás** lépéséből jött, nem próbából. Kitoltam a 12 programos, horgonyzott, **MAI**
sorozat bizonyítékát — és az összesítő azonnal `MAI: NEM`-et írt:

```
git diff --name-only 1f42ae6..661f22f -- 'v3ref/*.mjs' 'v3ref/external-checks/*.mjs'  →  0 fájl
az összesítő mégis:  fresh=false
```

A commit **nulla** mért forrás-fájlt érintett (csak `docs/` és `results/`), mert a kötés
AZONOSSÁGÁBA a **commit-azonosítót** is beletettem. Vagyis **elfogadott sorozat SOHA nem létezhetett
volna könyvelt állapotban** — a kapu a gyakorlatban használhatatlan volt. A szám, amit mértem, MÁS
kérdésre felelt („ugyanaz a fa-azonosító?"), mint amire használtam („ugyanaz a MÉRÉS?") — a
`KUKA-033` alakja a bizonyíték-kapun.

**Javítva:** az azonosság a **mért forrás tartalma** (`bundle_digest` = a `v3ref/*.mjs` köteg BND-01
lenyomata — pontosan amit a battéria futtat — + manifeszt + futtató + konfiguráció + tisztaság), a
`commit` pedig **`provenance`**: minden rekordon és a horgonyon ott van a visszakereséshez,
megtartotta a saját mércéjét (könyvelt 40-hex; a `…+uncommitted` elesik), de **nem azonosság**.

**És az első `EXS16`-alakom sem fogta meg a visszacsúszást:** a fixtúra véletlen alakjára
illeszkedett, nem a *shape*-re — a `commit` visszatétele a `canonBinding`-ba nem pirosította. Ezért a
mérce most **közvetlen**: két kötés, ami CSAK egy `commit` mezőben tér el, **ugyanazt** a
sorozatazonosítót adja (`KUKA-239`).

---

## 6. A SOROZAT MAI ÁLLAPOTA — PROGRAMONKÉNTI VERDIKT

`npm run verify:external-series -- --aggregate`, a **mai** sorozatra:

```
SOROZAT s8efde465d71d · 12 rekord
  HORGONY (a futtató rögzítette 2026-10-11T16:21:16.211Z): mért forrás 9e80eefd3059…
           SZÁRMAZÁS: a2060778131c…
  TELJES: NEM · HORGONYZOTT: IGEN · MAI: IGEN · ELFOGADVA: NEM
  GEPI: complete=false anchored=true fresh=true accepted=false green=12 failed=0 invalid=0 measured=12 of=19
```

| kategória | darab | programok |
|---|---|---|
| **sikeres** | **12** | `r61` · `r53` · `r55` · `r16core` · `r92authz` · `r88core` · `r85core` · `r77` · `r75` · `r69` · `r67` · `r79core` |
| **tartalmi hibás** | **0** | — |
| **hiányos mérésű** | **0** | — |
| **hiányos ÉS tartalmi hibás** | **0** | — |
| **környezeti kihagyás** | **0** | — |
| **érvénytelen rekord** | **0** | — |
| **el nem indult** | **7** | `r83core` · `r81core` · `r79` · `r59a` · `r57a` · `r59` · `r57` |

**Az R195-ben ugyanez 1 sikeres · 1 hiányos mérésű · 17 el nem indult volt.** A sorozat tehát
**1-ről 12-re** jutott, és mind a 12 **érvényes, horgonyzott, mai** rekord.

**ÉS AZ ÖSSZEGZŐ VERDIKT TOVÁBBRA IS NEM LÉTEZIK: `ELFOGADVA: NEM`.** 12/19 nem „részben zöld" —
hét program **nem futott**, és a „nem futott" nem „0 hibás" (`KUKA-206`). A kapu ezt gépileg is
kimondja (`accepted=false`), és a `--gate` **3**-mal lép ki.

### MÉRT IDŐK, ÉS EGY SAJÁT KORLÁT NEVEZETTEN

| program | mért idő |
|---|---|
| `r55` | **792 s** (64 egység × 12,4 s, 253 mutáció) |
| `r53` | 10 s · `r61` 2 s |
| a kilenc rövid program (`r16core` · `r92authz` · `r88core` · `r85core` · `r77` · `r75` · `r69` · `r67` · `r79core`) | **0–1 s** egyenként |

**Az `r79`-et a SAJÁT 1500 s-os engedélyem vágta el (kilépés 124) — NEM termék-hiba, és nem is
nevezem annak.** Mérve: az `r79` a 64 egységes fokról **128**-ra finomít, ~12,5 s/egység, tehát
**~40 percet** kér. A SPEC 120 percet engedne programonként; ezt a következő futásnak megfelelő
engedéllyel kell adni. Rekord **nem keletkezett** róla, tehát „el nem indult" marad.

**A többi hat program (`r83core` · `r81core` · `r59a` · `r57a` · `r59` · `r57`) NEM INDULT EL, és ez
döntés, nem feledékenység:** a §2 záró szabálya *„drága teljes lánc ne induljon"*, és ezek mind
battéria- vagy összefűzés-programok (az R195-ben az `r83core` 52,5 perc volt). A sorozat
**folytatható ugyanebből a kötésből**: `node v3ref/external-checks/run-all.mjs --only <program>` —
az elkészült 12 rekord megmarad.

### HÁROM SOROZAT ÁLL A LEMEZEN, ÉS MIND A HÁROM IGAZAT MOND

Ez nem rendetlenség, hanem a `KUKA-486` szabályának a működése: **a futtató megváltozása új
sorozatot nyit**, és a régit **nem írjuk át** (R196 §3 tiltja).

| sorozat | kötés | állapot |
|---|---|---|
| **`s8efde465d71d`** | mért forrás `9e80eefd3059` · származás `a206077` | **A MAI** — horgonyzott, mai, 12 érvényes zöld rekord |
| `sd73fde3419fa` | a `1f42ae6` futtatójával, a **régi** (commit-alapú) kötés-alakban | e kör **közbenső** futtató-állapota; a mai szerződés alatt a rekordjai nem érvényesek, és ezt a kapu NEVEZVE mondja ki |
| `s0b1af9a4b62d` | az `ec2d2a6` futtatójával, saját bizonyíték-példány nélkül | e kör **első** futtató-állapota (a `KUKA-484` előtt) |
| `s5ea731c1bb3d` | az `a7c1607`-hez kötve, horgony nélkül | az **R195 TÖRTÉNETI** sorozata — érintetlen, nem írtam rá horgonyt és nem írtam rá új SHA-t |

### ÉS A DÖNTŐ PRÓBA: A SOROZAT TÚLÉLTE A SAJÁT BIZONYÍTÉKA COMMITOLÁSÁT

A `KUKA-486` javítását a **szállítás** lépésén mértem meg, nem fixtúrán:

```
a206077 → f8ce5c7   (a sorozat SAJÁT bizonyítékának commitja)
git diff --name-only a206077..f8ce5c7 -- 'v3ref/*.mjs' 'v3ref/external-checks/*.mjs'  →  0 fájl
az összesítő a commit UTÁN:  MAI: IGEN · fresh=true
```

A javítás előtt ugyanez a lépés `MAI: NEM`-re váltott. **A horgony innentől túléli a saját
bizonyítéka közzétételét** — enélkül elfogadott sorozat könyvelt állapotban soha nem létezhetett volna.

---

## 7. A ZÁRÓ SÖPRÉS — SZÓ SZERINT

```
SÖPRÉS (40 verifier + 2 NEM IGAZOLT kihagyás, 223s): 38 zöld · 0 env-kihagyás · 2 piros
NEM FUTOTT — NEM IGAZOLT — verify:external-checks
NEM FUTOTT — NEM IGAZOLT — verify:browser-gate
ÖSSZVERDIKT: NEM ZÖLD — 2 lánc nem futott és nem igazolt
PIROS: verify:lefedes, verify:v3ref
```

| tétel | mit jelent |
|---|---|
| **38 zöld** | köztük `verify:kuka` **1211/1211**, `verify:external-series` (`EXS01`–`EXS16`), `verify:unit-admission`, `verify:doc-html` **9/9**, `verify:decision-numbers`, `verify:artifact-naming` **28/28** |
| `verify:lefedes` **PIROS** | az `LT` sor **szándékosan** piros: a nevesített `personal.ownMatters` rés — **előző körökből nyitott tétel**, nem e kör romlása |
| `verify:v3ref` **PIROS** | a `3/253` szelet **12 348 ms** — ez a **helyesbítés tárgya** (lásd a 4. szakaszt), és nevezetten *„a mérés HIÁNYOS"*, nem tartalmi bukás |
| `verify:external-checks` **NEM IGAZOLT** | a 19 programos láncot **nem** futtattam egyben (a §2 záró szabálya); **12 programját programonként** futtattam, a sorozat a 6. szakaszban áll |
| `verify:browser-gate` **NEM IGAZOLT** | a bemenete **0 fájlban** változott a `26f65da`…`HEAD` szakaszon, tehát az R195 újrahasználása áll — **a söprés ezt nem fogadja el igazolásként, és ezt nem írom át** |

**Az összverdikt tehát NEM ZÖLD, és nem is nevezem annak.** A két piros közül az egyik előző körökből
nyitott, a másik a saját helyesbítésem tárgya; a két „nem igazolt" kihagyás **nevezetten** jelenik
meg, nem néma zöldként.

---

## 8. FOGYASZTÁS — A KÖR ÉS A MUNKAMENET

Meglévő mérőből (`npm run meres:fogyasztas -- --session auto --from … --quick`):

| ablak | hívás | fő-szál kontextus medián / max | ügynök | sáv |
|---|---|---|---|---|
| **a KÖR** (az R196 SPEC `14:47:30Z` → a jelentés) | **172** | **316 214** / 484 474 | **0** (0 ügynök) | **FIGYELMEZTETÉS** (a 300 000–400 000 sávban) — a mérő szava: *„rövid állapotmérés a munkablokk határán — MEGÁLLNI NEM KELL, új beszélgetés NEM kell"* |

Lefedettség **teljes**. Al-ügynököt **nem** indítottam (a SPEC §4 tiltja). Ez a munkamenet a kör
elején indult, tehát a kör és a munkamenet ablaka **ugyanaz** — külön munkamenet-sort ezért nem írok,
hogy ne két néven álljon ugyanaz a szám (`KUKA-033`).

A kör **hosszú mérései** faliórát fogyasztottak, nem hívást: `r55` 2 × 792 s · a záró söprés 223 s ·
az `r79` elvágott futása 1500 s · a profilozás és a 4 egység-futás ~5 perc. Együtt **jóval** a
megengedett 6 óra alatt.

---

## 9. AMIT EZ A JELENTÉS NEM ÁLLÍT

- **Nem** állítja, hogy a csomag merge-kész. Merge, deploy, force-push, titok-/üzleti adatváltoztatás,
  V2-/production-módosítás, fizetős infrastruktúra, al-ügynök, Codex vagy más AI-review, gépvásárlás,
  CMD-/PR-lezárás és új általános átvilágítás **nem történt**.
- **Nem** állítja, hogy a mérés költségét csökkentettem: **nem csökkentettem**, és a mért fázisadatokkal
  mondom ki, miért nem lehet a SPEC korlátai között.
- **Nem** állítja, hogy a legfinomabb bontás „már belefér" — és a kör közben ezt tévesen leírtam.
  A záró söprés `verify:v3ref`-je a **`3/253`** szeleten **12 348 ms**-ot mért, tehát a legfinomabb
  felosztás **ezen a gépen sem** fér bele egységesen; az R195 szerkezeti lelete **áll**. A három
  mintám nem volt bizonyíték (`D-VS-477`).
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
