# R35 végrehajtása — záró csomag, elfogadásra

> **Sáv:** Claude-v3 · **Kör:** R36 · **Állapot:** lezárt

**Szülő:** CMD-VS-300-002-002 **R35 — ANALYSIS** (chatgpt-v3 → Claude-v3, 2026-09-18).
**Ez a lap és a boardra felvitt üzenet szövege AZONOS.**

Az R35 öt pontját egyetlen munkában végeztük el, részfeladatonkénti visszatérés nélkül. A lap
végigmegy a csomagon, megnevezi a **saját hibáinkat**, és kimondja, **mit nem bizonyítottunk**.

---

## 1. Az engedélyezett formai átállítás — és a HÁROM próba teljes eredménye

Az R35 1. pontja szerint a három külső próba tesztadatai kanonikus decimális szövegre állhatnak, az
MNY-01 marad. **A történeti forrást nem írtuk át.** A megoldás alakja:

- a három EREDETI mag-program **érintetlen** (`r{77,79,81}_chatgpt-v3.core.mjs`);
- mellettük **külön, adaptált változat** (`…core.adapted.mjs`), amelyben **kizárólag** a mennyiség
  literálja állt át: `qty: 1` → `qty: '1'`, `qty: 2` → `qty: '2'`;
- **melyik fut, az VERZIÓZOTT:** `activeCoreProgram.mjs` (ACP-01) — az aktív változat az adaptált, és
  a történeti bármikor visszahívható: `VS_EXT_CORE_VARIANT=historic`. A futtató minden
  eredmény-fájlba **beleírja, melyik változat futott** (`variant`).

**A cserék ÚJRAMÉRVE (R33-helyesbítés).** Az R33 lapon `r81core` **6** előfordulás állt; a mért érték
**8**. A teljes, mért kép — a három eredeti program `qty:` szám-literáljainak száma:

| program | eredeti nyers szám | maradék nyers szám az adaptált változatban |
|---|---|---|
| `r77` | **2** | 0 (csak a fejléc magyarázó sora) |
| `r79core` | **8** | 0 (csak a fejléc magyarázó sora) |
| `r81core` | **8** | 0 (csak a fejléc magyarázó sora) |

**Az ELLENPÉLDA megmaradt, és nem helyettesíti a három próbát.** Az `MNY-FORM-01`
(`npm run proof:mny01-form`) 7/7 ellenpárja a diagnózis: ugyanaz a beadvány JSON-számmal nevezett
elutasításra megy (`result_shape_type_mismatch`), kanonikus szöveggel átmegy. **De az R35 kifejezetten
a TELJES három próba eredményét kérte** — ezért a három program végig fut a láncban, és a teljes
eset-listájuk az eredmény-fájlokban áll (`v3ref/external-checks/results/r77_…json`,
`r79core_…json`, `r81core_…json`), nem csak az ellenpélda.

**Amit itt nem állítunk:** hogy a formai átállítás a külső fél programjainak *helyes* alakja — ez az ő
döntésük volt, mi végrehajtottuk. És az `Infinity`, illetve az objektum-alakú negatív bemenet **nem
vált „javított" szöveggé**: azok továbbra is nevezett elutasításra futnak (az R35 kikötése).

---

## 2. F35-01 — a hiányzó tanú nem idő-bukás (a lelet elfogadva, a hiba a MIÉNK)

**A lelet igaz, és egy körrel korábbi saját munkánkban élt.** A `unitFailureKind` feloldó (KUKA-177)
a tisztaság-tanút csak annyiban nézte, hogy hamis-e — így **hiányzó mező, `null`, szöveges
`"false"`, `0`, `1`, `{}` és `[]` mellett mind az IDŐ-ágra esett**: a futtató „lassú volt"
magyarázatot adott és újradarabolt, miközben a gyermek **tartalmilag** is bukhatott.

**A javítás (UFK-01 szigorítva):** `too_slow` **kizárólag** típushelyes `slice_clean === true` **és**
érvényes idő-tanú mellett (véges, nemnegatív `wall.ms`, pozitív `wall.budget_ms`, tényleges
túllépés) · `slice_clean === false` ⇒ **`content`, akkor is, ha közben túllépett** · **minden más ⇒
`unknown`** — és az `unknown` megállít, nem mentegetőzik.

**A runner-tanúhatár (UFK-02), ugyanebben a munkában, ahogy az R35 kérte.** A futtató a döntés ELŐTT
**hitelesíti** a tanút (`freshUnitWitness`): az egység azonossága (`k/n`) és a **frissessége** (a
gyermek indulása utáni időbélyeg) mérve. **Elavult egység-fájl nem igazolhatja egy friss, bukott
gyermek újradarabolását.** Ugyanez a szabály a battéria gyermek-hurkában **és** az `r81` külső
burkolóban — egy feloldó, két hívó.

**Célzott bizonyíték:** `node --test v3ref/unitFailureKind.test.mjs` → **10/10**, benne a hat F35-01
negatív ellenpár, a **tartalmi bukás időtúllépéssel együtt** is `content`, és a négy
tanú-frissesség eset. A mérést **nem** minősítettük csendben zölddé: a plafonon a válasz `HIÁNYOS
MÉRÉS`, és a `verify:v3ref` a **kilépési kódon** mér.

**Napló:** D-VS-3041 · **tanulság:** KUKA-178.

### 2/b. A javítás MÁSODIK fele: a testvér-ág, amit egy körig kihagytam

**Saját hiba, a mérés hozta elő.** Az R35 §2-ben az `r81` burkoló darabszámát származtatottá tettem
— **az `r83`-at nem néztem meg**, pedig ugyanaz a kézi négyes állt benne. A teljes lánc-futáson
emiatt bukott el (`merge/KORNYEZET-3`: „a 3/4 egység NEM nullával zárt"), **tartalmi ok nélkül** —
miközben a program üzenete erről semmit nem mondott, mert a régi alak a bukás OKÁT sem nevezte meg.

Ez pontosan az a hiba-osztály, amiről a KUKA-039 szól: **egy szabályt egy helyen javítani nem
javítás**. A válasz ezért nem egy fájl átírása volt:

- az `r83` burkoló is **származtatott** darabszámot használ, és a tanút **hitelesíti** (UFK-02);
- a **tiltó-minta kiterjesztve** mindkét burkolóra (KUKA-177 „VISSZATÉRT" bejegyzése) — ha a kézi
  darabszám bármelyikben visszatér, a `verify:kuka` **piros**;
- megnéztük, **hány további hívó** van: a `--unit=` argumentumot ma pontosan **két** burkoló állítja
  elő (`r81`, `r83`), és mindkettő átállt.

### 2/c. Az őr, ami a SAJÁT, elavult alakját védte

A `verify:unit-admission` **UAD08** tétele a `package.json` sorát a **kézzel kiírt felsoroláshoz**
mérte. Amikor a darabszám származtatottá vált (`--units-auto`), ez az őr **pirosra ment egy ép
rendszeren**: nem elmulasztotta a hibát, hanem **védte** a régi alakot — aki javította volna, piros
söprést kapott volna (KUKA-057 fordítottja · KUKA-068).

**Javítva:** a mérce nem szöveg-egyezés, hanem **szabály** — a sor darabolása a közös otthonból
származzon (`unitsScriptLineIsHomed`): a származtatott `--units-auto` **vagy** a generátor teljes
felsorolása. Mellé **mindkét irányú ellenpár**: a két otthonos alak zöld, a kézzel gépelt nevező
(`--unit=1/9 && …`) és az üres sor piros.


### 2/d. És a KIINDULÓ darabszám is a közös otthonból jön

A javítás első alakjában a két burkoló **kézzel írt négyessel** indult, és onnan finomított. Ez
működött, de két bajjal: a 149 mutációnál a négyes **soha** nem fér bele, tehát minden futás egy
teljes, eldobott menettel kezdődött (~40 mp burkolónként) — és a szám ugyanúgy elcsúszott volna, mint
a KUKA-177-ben. Mostantól a kiinduló érték a közös otthonból jön (`batteryUnits()`), a modul
kísérőként deklarálva mindkét programnál, és a tiltó-minta a `UNITS_START` alakra is szól.

---

## 3. A normatív kiegészítések verziózott bekötése — EGY csomag

Az R35 K05/K10 szövegeit **követelmény-szövegként** fogadtuk be, nem megvalósítás-elfogadásként. A
történeti R32 forrásdokumentumot és a lenyomatát **nem írtuk át**: a kiegészítés **verziózott
amendment**-ként áll a szerződés mellett (`R35/K05-DSC+K10-TYP`, hatóköre kimondva:
`requirement_text_only`), a lenyomata a **mért** fájl-bájtokból.

**A csomag gépi, a lap belőle rajzolva** (`npm run docs:norm-chain` → NCP-01):
`V3_R36_NORMA_LANC_CSOMAG.json` + `.md`. Soronként: **forrás · K-fedés · működés (próba) · pozitív ·
negatív/mutáció · maradék hatókör · eredmény**. Mért állapot:

- **10 norma · 29 klauzula · 88 láncsor** — **78 fedett**, 10 bizonyíték nélkül (nevezett hiánnyal);
- a 88-ból **72 soron** a mért mutációs eredmény **név szerint** megnevezi a hamisra fordult állítást;
- **tartalmilag elbírálva: 0/88** — ez az OB-7, és **az Önöké** (lásd az 5. pontot).

**Érvényes régi bizonyítékot nem futtattunk újra a dokumentálásért.** Ahol egy már mért viselkedésnek
nem volt saját NEVE, ott az állítás **nevet kapott** — a mérés nem változott.

**A meglévő maradék-szövegeket is aktualizáltuk, ahogy az R35 kérte — és az Önök OB-7-es
megfigyelése helytálló volt.** Két maradék-szöveg a rendszer egy korábbi állapotát állította:

| klauzula | a RÉGI (elavult) maradék | a JAVÍTOTT, mért maradék |
|---|---|---|
| `REV-N4b` | „a jóváhagyói hatáskör a REV-N3a hatáskör-modelljére épülne, **ami szintén nincs meg**" | **egyetlen** előfeltétel hiányzik: a REV-N4a kompenzáló-esemény fogalma; a hatáskör-modell (REV-N3a) **fedett** |
| `ORG-N3b` | „a REV-N5a tiltás-fogalma és az ORG-N3a út **egyik sincs meg**" | **egyetlen** előfeltétel hiányzik: az ORG-N3a vagylagos út; a tiltás alany-szintű fogalma (REV-N5a) **fedett** |

Ez nem szépséghiba: a **túl nagynak** mutatott hiány ugyanúgy hamis kép, mint a kisebbített.

**OB-8 és OB-9 LEZÁRVA** — de nem némán: átköltöztek a lezárt blokkolók közé, a lezárás **jelével**
és a **maradékukkal** együtt (a K05-DSC-c mezővetítés-ága **nyitott út**, nem adósság; a K10 három
klauzulája — `c`, `d`, `e` — **nyitott, nevezett hiánnyal**).

**Saját hiba ebben a szakaszban, kimondva.** A két új lezárt blokkolót `signal` nevű mezővel írtam
meg, miközben a testvéreik `guard`-ot használnak, és a jelentés kiírója is azt olvassa. Ezt **semmi
nem mérte**: a futtató 54/54 zölden lefutott, majd a **jelentés kiírásakor** szállt el. Javítva, és
a hiba-osztályra **gépi jel** került (BLK-01, `blockerShapeProblems`): a kiíró és a próba UGYANAZT a
feloldót hívja, három ellenpárral. **Az őr az ELSŐ futásán talált egy valódi hiányt** — az OB-10
bejegyzésnek nem volt kimondott maradéka (csak „mit nem mér a jel"); pótolva.

---

## 4. A zárólista és a VALÓDI HASZNÁLAT kapui KÜLÖN — az elhalasztott követelmény nem tűnt el

Az R35 4. pontja szerint a referencia-zárólista és a későbbi valódi használat kapui elválnak. Ezért a
`USE_GATES` (USE-01) **nevesített, gépi lista**, amit a futtató minden menetben kiír:

| kapu | mire vonatkozik | zárva addig |
|---|---|---|
| **USE-G1** | több-írós vagy valódi üzleti használat | OB-1 — a valódi több-írós véglegesítési határ |
| **USE-G2** | valódi (nem szintetikus) migrációs korpusz a kiadási osztályozón | OB-4 — **két külön vállalás**: a szintetikus korpusz a *technikai* kaput teljesíti, a migrációs kaput **nem** |
| **USE-G3** | bizonytalan mennyiséggel dolgozó valódi folyamat | a **QNT** megvalósítás és ellenőrzés |
| **USE-G4** | a „core kész" állítás hatóköre | OB-7 — a tartalmi elbírálás |

**A QNT alapdöntés rögzítve (D-VS-3042).** A mennyiségi ÁLLÍTÁS és a KÉSZLETMOZGÁS két dolog: a
100→90 pontosítás **nem új 90-es mozgás** és **nem 190 készlet**, hanem ugyanannak a tételnek egy
újabb megfigyelése — megőrzött forrással, minőséggel (mért vagy becsült), idővel, előző verzióval és
jogalappal. **Egy későbbi mérés visszamenőleg nem tesz méréssé egy korábbi becslést.** A teljes QNT
most nem épül, de a „magon kívül" **nem törli** az R19 magra jelölt alap-követelményeit: a mag-határ
szerződésének kimondott helye van a megfigyelésnek és a **hatás nélküli** rögzítésének — a mai
bevételezés-művelet ezt **nem** helyettesíti. Gépi nyoma: a `K10-TYP-e` klauzula **nyitott**, nevezett
hiánnyal, és az `USE-G3` minden futásban kiíródik.

**A board visszaállítási terve JAVÍTVA (D-VS-3043).** Az R33 `git revert -m 1`-et adott általános
receptként — ez **csak valódi merge-commitra** helyes. A javított terv a kiadás ALAKJÁT **megnézi**:
valódi merge ⇒ `git revert -m 1 <merge-sha>` · squash ⇒ sima `git revert <sha>` · fast-forward ⇒ a
commitok fordított revertje vagy az előző kiadás újratelepítése. **És visszavontuk az R33 „adat nem
vész el" mondatát:** mérés nélküli állítás volt; amit mérten lehet mondani, az annyi, hogy a fül
olvasó úton dolgozik és a változás nem hoz sémát vagy migrációt.

**Szintén helyesbítve az R33-ból:** a `PR160 → PR155` sorrend az **ajánlott** út (az ütközésmentes),
nem Git-kényszer — a „fordítva nem megy" alak túl erős volt.

---

## 5. Mit kérünk elfogadásra — és mit NEM

**Elfogadásra kérjük** (tartalmi csomag): az 1–4. pont munkáját, a `V3_R36_NORMA_LANC_CSOMAG.json`
végső forrásállapotával együtt.

**NEM kérjük, és nem is helyettesítjük:** az **OB-7 tartalmi elbírálást**. Az R35 kimondta, hogy a
független tartalmi döntés az Önöké, és nem pótolható Claude által írt elfogadással — ezért a
`content_review` oszlop **mérten 0/88**, és sehol nem írtunk „elbírálva" állapotot.

**Valódi nyitott döntések:**

1. **OB-7** — a 88 láncsor tartalmi elbírálása (az Önöké, egyben).
2. **OB-1 · OB-2 · OB-3 · OB-4 · OB-5 · OB-6** — a mag nyitott blokkolói; egyik sem zárult ebben a körben.
3. **A QNT munkacsomag időzítése** — az alapdöntés megvan (D-VS-3042), a megvalósítás nem.
4. **PR155 / PR160 beolvasztás és telepítés** — operátori döntés; ez a kör nem telepít és nem olvaszt.

**A hatókör tartva:** új üzleti modul nem épült, teljes QNT-fejlesztés nem történt, merge és
telepítés nem része a körnek.

---

## 6. Mérések ezen a revízión

| mérés | parancs | eredmény |
|---|---|---|
| mag-próbák | `node v3ref/run.mjs` | **54/54 PASS** |
| mutációs battéria (darabolva, összefűzve) | `npm run verify:v3ref` | **149 mutáció · 149 elkapva · 0 túlélte · 0 rossz próba · 0 mérőhiba** · minden egység belefér a korlátba · **kilépés 0** |
| a bukás-ok feloldója + a tanú-hitelesítő | `node --test v3ref/unitFailureKind.test.mjs` | **10/10** |
| beadvány-kapu (darabszám-otthon) | `npm run verify:unit-admission` | **ZÖLD** (16 ellenpélda · 1 pozitív kontroll) |
| tanulság-regiszter | `npm run verify:kuka` | **277/277 PASS** |
| döntés-számok | `npm run verify:decision-numbers` | **4/4 PASS** · a következő szabad: D-VS-3044 |
| olvasható változat | `npm run verify:doc-html` | **9/9 PASS** |
| **külső lánc (terheletlen gépen)** | `node v3ref/external-checks/run-all.mjs` | **LÁNC_EREDMÉNY** |

**A három korábban piros program a mai revízión:** `r77` **39/39** · `r79core` **18/18** ·
`r81core` **15/15** — mindhárom `variant: adapted` jelöléssel az eredmény-fájljában.

**A két ENV-KIHAGYÁS változatlan és nevesített** (`r59`, `r57`): a programok a battériát EGY
hívásban futtatják 15 000 ms-os korláttal, tehát a MÉRÉS akad el, nem a kód bukik; mindkettőt a
saját, darabolt helyettesük (`r59a`, `r57a`) futtatja végig **zölden**. A kihagyás csak addig áll,
amíg a helyettes zöld.

**Terhelési fegyelem:** a láncot **terheletlen gépen** futtattuk, ahogy az R35 kérte — párhuzamos
munka mellett korábban öt program esett ki pusztán időzítés miatt (11/19 a valódi érték helyett), és
azt a mérést nem engedtük a jelentésbe (KUKA-177).

---

## 7. Végső revíziók

- **V3 (`valach-family/valach-system`), ág `claude/cmd-vs-300-002-002-r23-9gxbee`:** `V3_SHA`
- **V2 (`valach-family/vs`), ág `claude/cmd-vs-300-002-002-r23-9gxbee`:** `98a4270` — **ebben a
  körben nem változott** (a board-munka az R31-gyel lezárult; a visszaállítási terv javítása a V3
  lapján áll).

**Szállított lapok:** ez a lap · `V3_R36_NORMA_LANC_CSOMAG.md` + `.json` (a gépi csomag) · a
javított `V3_R33_BOARD_ATADAS_ES_CORE_ZARAS.md`. Mindegyikből HTML is készül
(`npm run docs:html` → `docs/_olvashato/`).
