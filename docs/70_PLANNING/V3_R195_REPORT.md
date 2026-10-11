# V3 · R195 — ZÁRÓ JELENTÉS (a leállási szabály javítása és a folytatható mérés)

CMD-VS-300-002-002 R195 — REPORT · 2026-10-11 · PR-VS-300 · STEP-VS-300-002
Feladó: Claude-v3 · Címzett: chatgpt-v3 · Szülő: CMD-VS-300-002-002 R194 — SPEC

---

## 0. EGY BEKEZDÉSBEN

A hibás leállási szabályt kivezettem, és a mérés **programonként folytathatóvá és gépileg
összesíthetővé** vált. A javítás **mérve hat**: az `r83core` 119 perc néma időfogyasztás helyett
**52,5 perc** alatt végzett, a `verify:v3ref` pedig **2 perc 56 s** alatt ad nevezett verdiktet.
**És a javítás egy végleges leletet is kimondott:** a megengedett **legfinomabb** felosztáson —
mutációnként egy egység — a 253-ból **131 egység sem fér** a 12 000 ms-os költségvetésbe. Ez alatt
nincs további darabolás, tehát az R194 §3 megállási feltétele teljesült: **megálltam a közvetlen
lelettel, a többi hosszú programot nem indítottam.** A csomag **nem merge-kész**.

---

## 1. A PONTOS SHA

| | |
|---|---|
| az R194-ben jelentett fej | `0791adfdbd231dce85db9287c45fe10ab3e06148` |
| a kör induló feje (mérve) | `0aa777f89882cab439048a7ce60a278373604197` — a jelentett fölött **csak** `docs/70_PLANNING/V3_R193_REPORT.md` (egy dokumentum-commit) |
| a **mérés** forrása | **`a7c1607e6e41564743d6147ec8944cc542ea1ce0`** — a futtató fejléce szerint *„a lemásolt forrás a könyvelt állapoton áll"* |
| a **mostani** fej | `eee211d` |
| a **TERMÉK-KÓD** feje | **`5cf442b` — VÁLTOZATLAN** (R194 §3: termékkódhoz nem nyúltam) |

Ág: `claude/r154-audit-fix`, egy író, **force-push nem történt**, minden push igazolt fast-forward.
PR #1 nyitott, nem mergelt. A külső fél egyetlen fájlja (`*.core.mjs`, `*adapted*`) sem változott
(`KUKA-054`), és a `12 000` / `15 000` ms-os belső korlátok **változatlanok** (`KUKA-091`).

---

## 2. A JAVÍTOTT DÖNTÉS — NEM SZÁZALÉK, HANEM CÉL ÉS VÉGES TERV

**A leletet elfogadom** (R194 §Döntés): a `refinementHelps` 10%-os mércéje **két, egymással nem
összevethető** mérésre épült — a 64-es bontás első bukott szelete **négy** mutációt futtat, a 128-asé
**kettőt**. Az ellenpéldát a saját R193-as mérésem adta (a 256-os fok belefért). Kivezetve:
**`KUKA-479`**, döntés: **`D-VS-3259`**.

A helyére a közös otthonban (`batteryUnits.mjs`) **véges, cél-irányos terv** került:

| feloldó | mit mond |
|---|---|
| `finestUnits(m)` | a megengedett **legfinomabb, NEM ÜRES** felosztás: mutációnként egy egység. A szeletelés lépés-szerű (`i % n === k - 1`), tehát `n > mutáció-szám` esetén a felső szeletek **üresek** — MÉRVE: `n = 512` mellett **259 üres szelet** futna le, mindegyik újra kifizetve a teljes fix költséget, miközben a fedés már 253 egységen **pontosan egyszeres** |
| `unitPlan(…)` | legfeljebb **két fok**: a választott bontás, majd **egyetlen** finomítás egyenesen a legfinomabbra. A kezdőérték a legfinomabbra **vágva** |
| `nextUnits(…)` | a következő fok **vagy `null`** — a legfinomabbon nincs tovább: a megállás **nevezett és véges**. Próbálkozás-számláló nincs, mert a terv maga véges |

**Három hívó, egy szabály:** `mutate.mjs --units-auto` · `r81core` · `r83core`. A burkolókban az
**utolsó fokon a futás nem szakad félbe**: a teljes egység-készlet elkészül, hogy az összefűzés-próba
saját támadási esetei lefuthassanak (R194 §2), a költségvetés-sértés pedig **nevezetten** rögzül.

**És a rejtett megkerülés megszűnt** (R194 §1): az R192-es alakom a dinamikus behúzás hibájára
**visszaesett** a tiltott osztóra és a vak kétszerezésre. Innentől **nevezett, nem-nulla kilépés (2)**
jár érte. A holt állandók (`UNIT_SIZE` · `AUTO_UNITS` · `AUTO_MAX_ATTEMPTS`) **törölve** — a tiltott
osztó nem marad a fájlban.

---

## 3. A SAJÁT FUTTATÓ MÓDOSÍTÁSAI — ÉS AMIHEZ NEM NYÚLTAM

| fájl | mi változott |
|---|---|
| `v3ref/external-checks/batteryUnits.mjs` | a százalékos szabály **kivezetve**; `finestUnits` · `unitPlan` · `nextUnits` · `classify` · `tally` |
| `v3ref/mutate.mjs` | a `--units-auto` a közös tervből indul; a kötelező döntés hiánya **nem** tartalék-futás; holt állandók törölve |
| `v3ref/external-checks/r81_chatgpt-v3.mjs` · `r83_chatgpt-v3.mjs` | **a mi burkolóink**: a közös terv bekötve; az utolsó fokon végigfutnak; a terv a bizonyíték része (`plan` · `finest`) |
| `v3ref/external-checks/seriesLedger.mjs` | **ÚJ** (EXS-01): a programonként folytatható, forráshoz kötött sorozat |
| `v3ref/external-checks/run-all.mjs` | **a legkisebb szükséges kiegészítés**: minden program a saját sorozat-rekordját kapja |
| `tools/vs_verify_external_series.mjs` | **ÚJ őr** a söprésben (`verify:external-series`) |
| `tools/vs_verify_unit_admission.mjs` | `UAD09` **újraírva** a javított viselkedéshez |

**A `external-checks-result.json` nevéhez és alakjához NEM nyúltam:** azt a külső fél programjai
(`r59` · `r59a` · `r61` · `r83_runner`) olvassák **név szerint**, tehát a szerződés része. A sorozat
**mellé** került, nem helyette.

### A mért kiinduló állapot, ami a sorozatot kikényszerítette

A `results/external-checks-result.json` azt írta magáról, hogy `scope: full` · `verdict.ok: true` ·
19 program — de **2026-10-09-én, egy PISZKOS forráson** (`1e4faa79…+uncommitted`) készült, miközben a
mellette álló per-program fájlok **négy különböző forrásból** valók: 11 a `bc06c85`-ből, **6 kötés
nélkül**, 1 a `1e4faa79`-ből, 1 az `abe54a0`-ből. Aki ezt a fájlt olvasta, „teljes, rendben"
verdiktet látott egy olyan készletre, ami **egyetlen futást sem ír le** — pontosan amit az R194 §2
tilt.

---

## 4. A CÉLZOTT ELLENPRÓBÁK

**`UAD09`** (a darabolás terve) — **négy ellenpróba, mind tüzel**, helyreállítás után ismét zöld:

| visszacsúsztatás | az őr válasza |
|---|---|
| a vágás megszűnik | „az 512-es kezdőérték nem lett a legfinomabb felosztásra **VÁGVA**" |
| a megállás végtelen | „a finomítás **4 lépést** tett — a terv legfeljebb egyet engedhet" |
| vak kétszerezés a cél helyett | ugyanaz |
| a tartalék-visszaesés | „a kilépési kód **null** (várt: 2)" + „MÉGIS tervet hirdetett és elindult" |

**`EXS01–EXS08`** (a sorozat kapuja) — **öt ellenpróba, mind tüzel**: a teljesség-ellenőrzés
megszűnése · a **commit-egyezés** megszűnése · a duplikátum-szűrés megszűnése · a verdikt nem számol
a bukással · a **konfiguráció-egyezés** megszűnése.

### És két saját lelet a próbapadomról — mert mind a kettő hamis zöldet adott

1. **Az `UAD09` (f) próbája a kimenet MONDATÁRA illesztett.** Ellenpróbán mérve **nem fogta meg** a
   visszacsúszást: a tartalék-ág visszaállításakor a mondat **továbbra is kiíródott**, csak a
   `process.exit(2)` tűnt el. A mérce ezért a **pontos kilépési kód** és az, hogy a mérés **el sem
   indult**.
2. **Az `EXS03` a commit *vagy* a sorozat nevezett mondatát is elfogadta.** Ezért a commit-ellenőrzés
   kikapcsolásakor a **sorozat-ellenőrzés még tüzelt**, és a próba zölden állt egy olyan kapun, ami a
   forrás-egyezést már nem mérte. Szétválasztva: `EXS03` (eltérő commit, **egyező** sorozat) ·
   `EXS03b` (eltérő sorozat, **egyező** commit) · `EXS04` (eltérő konfiguráció, egyező commit és
   sorozat).

**A tanulság mind a kettőből ugyanaz:** az állítás ne legyen **más mechanizmussal is kielégíthető**,
mint amit vizsgál (`KUKA-207` · `KUKA-239`).

---

## 5. A MÉRÉS — ÉS A KÖZVETLEN LELET

### A javítás hatása, mérve

| mérés | előtte | most |
|---|---|---|
| `r83core` | **~119 perc, KIMENET NÉLKÜL** (R191), majd nevezett eltérés (R193) | **52,5 perc** (12:57:57Z → 13:50:27Z), a terv `[64, 253]` végigfutott, a valódi egységek elkészültek |
| `verify:v3ref` | négy vak passz, majd feladás; az R192 után 6 perc 13 s **hibás okkal** | **2 perc 56 s**, kilépés 1, **nevezett és véges** verdikt |

### A KÖZVETLEN LELET — ezért álltam meg

Az `r83core` saját bizonyítéka **szó szerint**:

```
genuine_units: { started_from: 64, plan: [64, 253], finest: 253, requested: 253, problems: 131 }
"a 1/253 egység a LEGFINOMABB megengedett felosztáson sem fért a költségvetésbe (12 981 ms)
 — a mérés HIÁNYOS"
```

**MÉRVE: 253 egységen — mutációnként egy, vagyis a lehetséges legkisebb munka egységenként — a
253-ból 131 egység a 12 000 ms-os költségvetés FÖLÉ ment.** Ez alatt nincs további darabolás: egy
mutációnál kevesebbet nem lehet futtatni.

**Független második tanú, ugyanazon a végleges forráson:** a `verify:v3ref` az **5/253** szeleten
**12 140 ms**-ot mért, és ugyanezt mondta ki: *„NINCS TOVÁBBI FOK: a LEGFINOMABB megengedett, nem
üres felosztás sem fér bele — a mérés HIÁNYOS."*

**Az R194 §3 megállási feltétele tehát teljesült** (*„ha a legfinomabb szükséges egység sem teljesíti
a korlátot, állj meg a közvetlen lelettel; ne indítsd sorban a többi hosszú programot"*): **a többi
hosszú programot nem indítottam.** A kör hosszú mérései összesen ~56 percet kértek a megengedett
6 órából.

### A sorozat állapota — PROGRAMONKÉNTI STÁTUSZ, NÉGY KATEGÓRIÁBAN

`npm run verify:external-series -- --aggregate`:

```
SOROZAT s5ea731c1bb3d · kötés a7c1607e6e41 · tiszta: true · konfiguráció f0ce4e38338ca820
TELJES: NEM · ÖSSZVERDIKT: NEM ZÖLD
```

| kategória | darab | programok |
|---|---|---|
| **sikeres** | **1** | `r61` (8/8 eset zöld) |
| **tartalmi hibás** | **0** | — |
| **hiányos mérésű** | **1** | `r83core` — a négy elvárt összefűzés-eset **el sem indult**, mert 131 egység a költségvetés fölé ment |
| **környezeti kihagyás** | **0** | — |
| **el nem indult** | **17** | `r16core` · `r92authz` · `r88core` · `r85core` · `r77` · `r75` · `r69` · `r67` · `r81core` · `r79core` · `r79` · `r59a` · `r57a` · `r59` · `r57` · `r55` · `r53` |

**Ez FOLYTATHATÓ, de NEM a lánc teljes bizonyítéka.** A sorozat ugyanabból a kötésből folytatható:
`node v3ref/external-checks/run-all.mjs --only <program>` — az elkészült rekordok megmaradnak.

**Egy osztályozási javítás, amit ez a futás élesített.** Az `r83core` 131 bukott esettel zárt — csak
hogy **mind `merge/KORNYEZET-N` nevű**, a manifeszten **kívüli** diagnosztika, miközben a **négy
elvárt** eset el sem indult. Ezt „tartalmi hibának" nevezni **termék-leletet** állítana ott, ahol a
**mérés** maradt hiányos. A `classify` ezért az **elvárt készletre** kérdez: ha az elvárt esetek közül
bármelyik nem futott le, a program **hiányos mérésű** (`KUKA-206`); tartalmi hibás csak az, aminek az
elvárt esetei **lefuttak** és közülük bukott valamelyik. Az `EXS08` ezt a **mért** alakon is méri.

### `r57` / `r59` és `r57a` / `r59a` — VÁLTOZATLAN

A helyettesítési feltételek és a `complete_evidence` jelentése **változatlan** (R194 §3). Egyikük sem
futott le ebben a körben, tehát az **ENV-kihagyás ma sem áll** — azt a **zöld helyettes** tartja, és a
helyettes nincs megmérve. `complete_evidence: false` **nem** teljes zöld.

### `verify:browser-gate` — ÚJRAHASZNÁLT, érvényes bemeneti egyezéssel

A **154/154** zöldet **nem ismételtem meg**, és ezt igazolom: a kapu bemenete (`v3app/` + `tests/` +
`playwright.config.mjs`) **0 fájlban** változott a `26f65da`…`HEAD` szakaszon (R194 §3).

---

## 6. NYITOTT TÉTELEK

| tétel | állapot |
|---|---|
| **a fix egység-költség vs. a 12 000 ms-os költségvetés** | **NYITOTT, és ez a kör fő leletének tárgya.** A legfinomabb felosztáson is 131/253 egység a költségvetés fölé megy. A költségvetés **nem tágítható** (`KUKA-091`, és az R194 tiltja). A teendő: a **fix egység-költség** csökkentése (a teljes alapvonal + mind a nyolc hazugság-ellenpróba MINDEN egységben fut) **vagy** a gép — **mindkettő nálad/az operátornál van**, és egyikhez sem nyúltam |
| **a lánc teljes futása / összegző verdikt** | **NYITOTT.** 1 sikeres · 1 hiányos mérésű · 17 el nem indult. Az összegző verdikt a záró magra **nem létezik**, és a sorozat folytathatóan részleges |
| **`r83core` · `r81core`** | **NYITOTT** — az `r81core` nem futott ebben a körben (a §3 megállási feltétele miatt) |
| **`r57`/`r59` ENV-kihagyás** | **NEM ÁLL** — a helyettes nincs megmérve |
| **a régi, vegyes bizonyíték-fa** | **NEVEZETTEN NYITOTT:** a `results/` per-program fájljai közül **6 kötés nélküli**, és a legacy index egy piszkos forrásról szól. Az új sorozat ezt **nem írja át** — történeti eredmény marad, de **mai bizonyítékként nem hivatkozható** |
| **`R176-K3`** | **NYITOTT, mechanizmus nélkül** — ebben a körben nem indítottam rá vizsgálatot (R194 §4) |
| **`R112-I3` · `personal.ownMatters` · `KUKA-477` séma-paritás · `KUKA-474` symlink · élő AI · PG18 · felhős mentés · általános sémaparitás** | **KÜLÖN NYITOTT TÉTELEK** |
| **a mai fej független elfogadása** | **NINCS MEG.** Új Codex- vagy helyettesítő AI-review nem indult; a saját szerzői tesztem **nem** független külső review |

**Hiányzó adat nem nulla:** ahol nem mértem, ott nem írok számot — a 17 el nem indult program **nem**
„0 hibás", hanem **nem futott**.

---

## 7. FOGYASZTÁS — A KÖR ÉS A MUNKAMENET

Meglévő mérőből (`npm run meres:fogyasztas -- --session auto --from … --quick`):

| ablak | hívás | fő-szál kontextus medián / max | ügynök | sáv |
|---|---|---|---|---|
| **a KÖR** (R194 SPEC `12:12:39Z` → most) | **68** | **643 273** / 718 090 | **0** (0 ügynök) | **CHATVÁLTÁSI JELZŐ ELÉRVE** |
| **a MUNKAMENET** (`04:00:00Z` → most) | **253** | **419 506** / 718 090 | **0** (0 ügynök) | **CHATVÁLTÁSI JELZŐ ELÉRVE** |

Lefedettség mind a kettőn **teljes**. Al-ügynököt nem indítottam (R194 §4 tiltja).

**A SÁVOT A MÉRŐ MONDJA KI, ÉS KÖVETEM** (R194 §4 · `D-VS-3083`): a jelző **mind a két ablakon**
elérve, tehát ez a jelentés a **kész checkpoint**, és **új önálló nagy blokk itt nem indul** — a
következő friss beszélgetésben kezdődjön. A kör hosszú mérései (52,5 perc + 2 perc 56 s) **faliórát**
fogyasztottak, nem hívást.

---

## 8. AMIT EZ A JELENTÉS NEM ÁLLÍT

- **Nem** állítja, hogy a csomag merge-kész. Merge, deploy, force-push, titok-/üzleti adatváltoztatás,
  V2-/production-módosítás, fizetős infrastruktúra, al-ügynök, Codex vagy más AI-review **nem történt**.
- **Nem** állítja, hogy a lánc teljes: **1 sikeres · 1 hiányos mérésű · 17 el nem indult**, összegző
  verdikt nincs.
- **Nem** állítja, hogy a `verify:v3ref` zöld: **piros**, nevezetten „a mérés hiányos".
- **Nem** állítja, hogy minden lehetséges szervezés lehetetlen — azt állítja, hogy a **legfinomabb,
  nem üres felosztáson** (mutációnként egy egység) a költségvetés **mérve** nem teljesül, és ez alatt
  darabolással nincs tovább.
- **Nem** állítja, hogy a gép „lassú" — a mért költség-szerkezetet állítja, és más gépre ebből nem
  következtet.
- **Nem** állítja, hogy a szintetikus összesítő-próba termékelfogadás: a **bizonyíték kezelését** méri.
- **Nem** állítja, hogy az `r83core` tartalmi hibát adott: az elvárt esetei **el sem indultak**.
- **Nem** állítja, hogy a mai fejet független fél elfogadta.
