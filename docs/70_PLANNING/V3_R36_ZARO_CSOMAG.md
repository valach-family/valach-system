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
| MNY-01 formai ellenpélda | `npm run proof:mny01-form` | **7/7** (0 bukott) |
| **TELJES SÖPRÉS** | `npm run verify:sweep` | **10 verifier · 10 zöld · 0 env-kihagyás · 0 piros** (606 mp) |
| **külső lánc (terheletlen gépen)** | `node v3ref/external-checks/run-all.mjs` | **17/19 program MEGFELEL · 2 ENV-KIHAGYÁS (nevezett helyettessel) · 0 ELTÉRÉS · kilépés 0** |

**A három korábban piros program a mai revízión:** `r77` **39/39** · `r79core` **18/18** ·
`r81core` **15/15** — mindhárom `variant: adapted` jelöléssel az eredmény-fájljában.

**A két ENV-KIHAGYÁS változatlan és nevesített** (`r59`, `r57`): a programok a battériát EGY
hívásban futtatják 15 000 ms-os korláttal, tehát a MÉRÉS akad el, nem a kód bukik; mindkettőt a
saját, darabolt helyettesük (`r59a`, `r57a`) futtatja végig **zölden**. A kihagyás csak addig áll,
amíg a helyettes zöld.

**A lánc ELŐSZÖR teljesen eltérés-mentes.** A menet előtt 14/19 állt (három piros: `r77`,
`r79core`, `r81core`), a formai átállítás után 16/19 — és ekkor bukott ki az `r83core`, a testvér-ág
(2/b). A javítás után **17/19, nulla eltéréssel**; a kiinduló darabszám közös otthonba tétele után a
**megismételt** menet ugyanezt adta, és a két burkoló már **finomítás nélkül** fér bele
(`requested: 7`, `problems: []`).

**Terhelési fegyelem:** a láncot **terheletlen gépen** futtattuk, ahogy az R35 kérte — párhuzamos
munka mellett korábban öt program esett ki pusztán időzítés miatt (11/19 a valódi érték helyett), és
azt a mérést nem engedtük a jelentésbe (KUKA-177).

---

## 7. Végső revíziók

- **V3 (`valach-family/valach-system`), ág `claude/cmd-vs-300-002-002-r23-9gxbee`:** **`6a83f35`** — ez a lap feje. A MÉRÉSEK a **`c891961`** revízión futottak; a kettő között **mérve** egyetlen fájl változott, és az EZ A LAP (`git diff --name-only c891961..6a83f35` → `docs/70_PLANNING/V3_R36_ZARO_CSOMAG.md`), tehát mért kód nem mozdult
- **V2 (`valach-family/vs`), ág `claude/cmd-vs-300-002-002-r23-9gxbee`:** `98a4270` — **ebben a
  körben nem változott** (a board-munka az R31-gyel lezárult; a visszaállítási terv javítása a V3
  lapján áll).

**Szállított lapok:** ez a lap · `V3_R36_NORMA_LANC_CSOMAG.md` + `.json` (a gépi csomag) · a
javított `V3_R33_BOARD_ATADAS_ES_CORE_ZARAS.md`. Mindegyikből HTML is készül
(`npm run docs:html` → `docs/_olvashato/`).

---

# Függelék — a norma-lánc végső forrásállapota (NCP-01)

**EZ A LAP SZÁRMAZTATOTT.** Egyetlen sorát sem gépeltük: a `npm run docs:norm-chain` (NCP-01)
rajzolja a szerződésből, a normákból, a manifesztből, a mutáció-katalógusból és a MÉRT mutációs
eredményből. A gépi alak a `V3_R36_NORMA_LANC_CSOMAG.json` — **a következő kör azt olvassa.**

**Szerződés:** NCT-01 · verzió: `R32/K01-K16 + R35/K05-DSC+K10-TYP` · lenyomat: `sha256:d6ef5ed707b83e3da85…`

**Összesítő:** 10 norma · 29 klauzula · 88 láncsor — **78 fedett** · 0 részben fedett · 10 bizonyíték nélkül · **tartalmilag elbírálva: 0/88** (OB-7 — ez a tárgyaló félé).

## Amit ez a csomag NEM állít

- A mutáció a PRÓBÁHOZ kötődik (`catcher`), nem az állításhoz. Ahol a MÉRT eredmény nevesíti a hamisra fordult állítást, az erősebb bizonyíték — a sor ezt külön jelzi.
- A `content_review` oszlop a MÉRT állapot, nem a szerző véleménye: a tartalmi elbírálás az OB-7 szerint a tárgyaló félé, és ma 0/88 soron áll.
- A `covered` annyit mond, hogy a klauzulához tartozik lefutott, falszifikált állítás — NEM azt, hogy a klauzula normatív tartalma maradéktalanul teljesül.

## A láncsorok

| klauzula | forrás | K-fedés | működés (próba) | pozitív | negatív / mutáció | maradék hatókör | eredmény |
|---|---|---|---|---|---|---|---|
| **REV-N1a** (REV-N1) | R32 | K07+K09 | — | P-CMD-finalize-gate · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N1b** (REV-N1) | R32 | K08+K09 | — | P-CMD-finalize-gate · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 3 nevesíti EZT az állítást | — | covered |
| **REV-N1c** (REV-N1) | R32 | K08 | — | — | — | Nincs korrekciós esemény-fogalom és nincs „alkalmazandó profil" a magban, tehát a joghatás felülvizsgálata nem modellezhető. A REV-N2 (hatály ⊥ tudomás) és a REV-N4 (kompenzáló folyamat) megépítése ELŐFELTÉTEL — enélkül csak azt tudjuk kimondani, hogy a régi sort nem írjuk át. | no_evidence |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-bitemporal · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-bitemporal · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-bitemporal · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-bitemporal · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-grant-axis · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-grant-axis · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-grant-axis · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-grant-axis · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-evidence-home · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-evidence-home · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-evidence-home · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-evidence-home · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-ORG-grant-atomic · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-ORG-grant-atomic · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-ORG-grant-atomic · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N2b** (REV-N2) | R32 | K08+K09 | — | P-REV-review-circle · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 3 nevesíti EZT az állítást | — | covered |
| **REV-N2b** (REV-N2) | R32 | K08+K09 | — | P-REV-review-circle · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2b** (REV-N2) | R32 | K08+K09 | — | P-REV-review-circle · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N2b** (REV-N2) | R32 | K08+K09 | — | P-REV-review-circle · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 4 nevesíti EZT az állítást | — | covered |
| **REV-N3a** (REV-N3) | R32 | K04+K09 | — | P-REV-authority · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N3a** (REV-N3) | R32 | K04+K09 | — | P-REV-suspension · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N3a** (REV-N3) | R32 | K04+K09 | — | P-REV-claim-decide · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N3a** (REV-N3) | R32 | K04+K09 | — | P-REV-effectuation · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 3 nevesíti EZT az állítást | — | covered |
| **REV-N3a** (REV-N3) | R32 | K04+K09 | — | P-REV-effectuation · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N3a** (REV-N3) | R32 | K04+K09 | — | P-CMD-effectuation · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N3a** (REV-N3) | R32 | K04+K09 | — | P-CMD-effectuation · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N3a** (REV-N3) | R32 | K04+K09 | — | P-CMD-release-effectuation · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 3 nevesíti EZT az állítást | — | covered |
| **REV-N3a** (REV-N3) | R32 | K04+K09 | — | P-CMD-release-effectuation · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N3b** (REV-N3) | R32 | K05+K09 | — | P-REV-claim-read · node v3ref/run.mjs | 7 mutáció a próbára (npm run v3ref:mutate) — ebből 5 nevesíti EZT az állítást | — | covered |
| **REV-N3b** (REV-N3) | R32 | K05+K09 | — | P-REV-claim-read · node v3ref/run.mjs | 7 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N3c** (REV-N3) | R32 | K05+K15 | — | P-REV-authority · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N3c** (REV-N3) | R32 | K05+K15 | — | P-REV-claim-read · node v3ref/run.mjs | 7 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N3c** (REV-N3) | R32 | K05+K15 | — | P-REV-claim-decide · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N3d** (REV-N3) | R32 | K05+K15 | — | — | — | A mai magban NINCS adapter, ami valódi, szerver-oldali beadó-kontextust adna (hálózati eredet, csatorna-azonosság, igazolt hívó). Amíg nincs, MINDEN kontextus nélküli beadás EGYETLEN nevezett, közös vödörbe esik (`UNATTRIBUTED_INTAKE_KEY = chan:unattributed`). Ez REFERENCIA-HELYETTESÍTŐ, nem védelem: azt a tulajdonságot állítja helyre, hogy a kulcsot a hívó ne tudja átírni (ezt a REV-N3c bizonyítja is), de a jóhiszemű beadókat nem különbözteti meg egymástól — így egyetlen elárasztó a közös vödörrel a többiek keretét is elveszi. A hiány zárásának feltétele (mind a hat): (1) a publikus bemenetből NEM másolható át tetszőleges csatorna-kulcs a belső kontextusba; (2) a korlát kulcsának EREDETE és BIZALMI SZINTJE adapterenként kimondott — a hálózati cím önmagában nem igazolt személyazonosság; (3) két külön beadó izolációját AZONOS, szabadon állított hivatkozás mellett is mérni kell (nem igazolt másik-fél-azonosító ne vehesse el a keretét); (4) pozitív ellenpár KÖZÖS hálózatról érkező jóhiszemű beadókra, és negatív pár EGY beadó több hivatkozására; (5) a kvóta versenyhelyzete és a tárolási hiba utáni állapot a VALÓDI adapterrel is mérendő; (6) a vállalt terhelési tartomány NEVEZETT — a „senki sem akadályozhat mást" korlátlan ígérete véges közös infrastruktúrán nem tartható, az izolációt a MÉRT tartományban kell bizonyítani. | no_evidence |
| **REV-N3e** (REV-N3) | R32 | K05 | — | — | — | MA NINCS MEGÉPÍTVE — szándékosan. A CLM-01 a sérült/hiányzó tartalmú ügyön minden érdemi döntést elutasít (ez a helyes válasz: JELENTENI kell, nem üres kézzel dönteni), tehát az ilyen ügy jelenleg nyitva marad. A karantén-műveletet azért nem építettük meg ebben a körben, mert új hatáskört, új állapotot és új audit-utat igényel, félig megépítve pedig pontosan az a kockázat, ami ellen a C-F01 szól: érdemi lezárásnak látszó technikai lépés. A hiány zárásának feltétele: (1) saját műveleti név és saját hatáskör (az `adjudicate` NEM elég); (2) kötelező, tárolt ok; (3) az ügy állapota megkülönböztethető az érdemben lezárttól; (4) próba, amiben a karantén UTÁN sem lehet érdemi döntést hozni, és a panasz tárgyáról semmilyen állítás nem keletkezik. | no_evidence |
| **REV-N4a** (REV-N4) | R32 | K06+K08 | — | — | — | Nincs kompenzáló-esemény fogalom a magban. A V2-ben van (`reverse`), de a V3 magja ezt még nem modellezi, és a kettő összekötése nem történt meg. | no_evidence |
| **REV-N4b** (REV-N4) | R32 | K04+K06 | — | — | — | EGYETLEN előfeltétel hiányzik: a REV-N4a KOMPENZÁLÓ-ESEMÉNY fogalma — enélkül nincs mit jóváhagyni. A jóváhagyói HATÁSKÖR modellje MEGVAN (REV-N3a, fedett), tehát ha a korrekciós esemény megszületik, ez a klauzula a meglévő hatáskör-kapura épülhet. | no_evidence |
| **REV-N5a** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-paths · node v3ref/run.mjs | 7 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N5a** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-paths · node v3ref/run.mjs | 7 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N5a** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-paths · node v3ref/run.mjs | 7 mutáció a próbára (npm run v3ref:mutate) — ebből 4 nevesíti EZT az állítást | — | covered |
| **REV-N5a** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-paths · node v3ref/run.mjs | 7 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N5a** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-paths · node v3ref/run.mjs | 7 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N5a** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-matrix · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N5a** (REV-N5) | R32 | K09+K15 | — | P-REV-entry-points · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N5a** (REV-N5) | R32 | K09+K15 | — | P-REV-entry-points · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N5b** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-scope · node v3ref/run.mjs | 5 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N5b** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-scope · node v3ref/run.mjs | 5 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N5b** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-scope · node v3ref/run.mjs | 5 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N5b** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-scope · node v3ref/run.mjs | 5 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N5b** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-scope · node v3ref/run.mjs | 5 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N5b** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-matrix · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N5b** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-record-shape · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N5c** (REV-N5) | R32 | K09 | — | P-REV-ban-past · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N5c** (REV-N5) | R32 | K09 | — | P-REV-ban-past · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **K05-DSC-a** (DSC-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K05 | — | P-REV-result-scope · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **K05-DSC-b** (DSC-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K05 | — | P-REV-result-scope · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 3 nevesíti EZT az állítást | — | covered |
| **K05-DSC-b** (DSC-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K05 | — | P-REV-result-shape · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **K05-DSC-b** (DSC-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K05 | — | P-REV-result-shape · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 3 nevesíti EZT az állítást | — | covered |
| **K05-DSC-c** (DSC-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K05 | — | P-REV-result-scope · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **K05-DSC-d** (DSC-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K05 | — | P-A08 · node v3ref/run.mjs | 5 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **K10-TYP-a** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | P-KAT-item-identity · node v3ref/run.mjs | 1 mutáció a próbára (npm run v3ref:mutate) — ebből 0 nevesíti EZT az állítást | — | covered |
| **K10-TYP-a** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | P-KAT-item-identity · node v3ref/run.mjs | 1 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **K10-TYP-a** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | P-KAT-item-identity · node v3ref/run.mjs | 1 mutáció a próbára (npm run v3ref:mutate) — ebből 0 nevesíti EZT az állítást | — | covered |
| **K10-TYP-b** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | P-BEM-input-schema · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 0 nevesíti EZT az állítást | — | covered |
| **K10-TYP-b** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | P-BEM-input-schema · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 0 nevesíti EZT az állítást | — | covered |
| **K10-TYP-b** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | P-BEM-input-schema · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 0 nevesíti EZT az állítást | — | covered |
| **K10-TYP-b** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | P-BEM-input-schema · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 0 nevesíti EZT az állítást | — | covered |
| **K10-TYP-c** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | — | — | A kanonikus alak és a profil-kötés mérve van, de a PROFILVÁLTÁS hatása a korábbi tárolt értékre nincs: a magban egyetlen mennyiség-profil él (`qty-1`), verzióváltás nem történt, ezért erre a mondatra ma nincs bizonyíték. | no_evidence |
| **K10-TYP-d** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | — | — | Az atomiság és az ismétlés-védelem mérve van (KSZ-01), de a „korábbi verziójú vagy más PROFILÚ bemenet" ága nincs: egyetlen élő séma- és mennyiség-profil mellett ellenpélda nem állítható elő, tehát a mondat erre a felére nincs bizonyíték. | no_evidence |
| **K10-TYP-e** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | — | — | A két idő-tengely elválasztása mérve van (KSZ-01 · BEM-01), de a MEGFIGYELÉSI idő fogalma nincs a magban (K0/D1 mérés: a tárolt sor `recorded_at` és `effective_at` tengelyt hordoz, a MÉRÉS ideje sehol) — ez a QNT-munka előfeltétele, nem e kör tárgya. | no_evidence |
| **ORG-N1a** (ORG-N1) | R32 | K04+K14 | — | P-ORG-basis · node v3ref/run.mjs | 8 mutáció a próbára (npm run v3ref:mutate) — ebből 3 nevesíti EZT az állítást | — | covered |
| **ORG-N1a** (ORG-N1) | R32 | K04+K14 | — | P-ORG-basis · node v3ref/run.mjs | 8 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **ORG-N1a** (ORG-N1) | R32 | K04+K14 | — | P-ORG-basis · node v3ref/run.mjs | 8 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **ORG-N1a** (ORG-N1) | R32 | K04+K14 | — | P-ORG-basis · node v3ref/run.mjs | 8 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **ORG-N1a** (ORG-N1) | R32 | K04+K14 | — | P-ORG-basis · node v3ref/run.mjs | 8 mutáció a próbára (npm run v3ref:mutate) — ebből 4 nevesíti EZT az állítást | — | covered |
| **ORG-N1b** (ORG-N1) | R32 | K04+K05 | — | P-ORG-basis-limit · node v3ref/run.mjs | 11 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **ORG-N1b** (ORG-N1) | R32 | K04+K05 | — | P-ORG-basis-limit · node v3ref/run.mjs | 11 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **ORG-N1b** (ORG-N1) | R32 | K04+K05 | — | P-ORG-basis-limit · node v3ref/run.mjs | 11 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **ORG-N1b** (ORG-N1) | R32 | K04+K05 | — | P-ORG-basis-limit · node v3ref/run.mjs | 11 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **ORG-N1b** (ORG-N1) | R32 | K04+K05 | — | P-ORG-basis-limit · node v3ref/run.mjs | 11 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **ORG-N1b** (ORG-N1) | R32 | K04+K05 | — | P-ORG-basis-limit · node v3ref/run.mjs | 11 mutáció a próbára (npm run v3ref:mutate) — ebből 4 nevesíti EZT az állítást | — | covered |
| **ORG-N1b** (ORG-N1) | R32 | K04+K05 | — | P-ORG-basis-limit · node v3ref/run.mjs | 11 mutáció a próbára (npm run v3ref:mutate) — ebből 3 nevesíti EZT az állítást | — | covered |
| **ORG-N2a** (ORG-N2) | R32 | K03+K04 | — | P-INVITE-authority · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **ORG-N3a** (ORG-N3) | R32 | K04 | — | — | — | A magban EGYETLEN jogalap-út van (tagság), tehát a VAGY/ÉS megkülönböztetés fogalmilag sem jelenik meg. A modell bővítése nélkül ez nem mérhető — és a méretlen klauzula zöldnek látszana (KUKA-051), ezért áll itt kimondva. | no_evidence |
| **ORG-N3b** (ORG-N3) | R32 | K04+K15 | — | — | — | EGYETLEN előfeltétel hiányzik: az ORG-N3a VAGYLAGOS jogalap-út — a magban ma egyetlen út van (tagság), tehát nincs mit kizárni. A célzott tiltás alany-szintű fogalma MEGVAN (REV-N5a, fedett); az elsőbbségi szabálynak a MÁSODIK út hiányzik, nem a tiltás. | no_evidence |

## Nyitott blokkolók

- **OB-1** — A valódi TÖBB-ÍRÓS véglegesítési határ
- **OB-2** — Q17 — műtermék-útvonal ütközése
- **OB-3** — Bemeneti séma-regiszter — RÉSZBEN MEGÉPÜLT, a HATÁR hiányzik
- **OB-4** — A kiadási osztályozó ellenőrzése NEM ÜRES korpuszon
- **OB-5** — A megvonás visszamenőleges hatálya (REV-N1c · REV-N2 … REV-N5)
- **OB-6** — Az önálló szervezeti alap (ORG-N1, ORG-N3)
- **OB-7** — A norma ↔ állítás TARTALMI megfelelése

## Lezárt blokkolók — a lezárás jelével és a MARADÉKÁVAL

- **OB-8** — K05 — a KIADÁSI OSZTÁLYOZÓNAK nincs klauzulája
  - lezárta: CMD-VS-300-002-002 R35 (a szöveg) → R36 (a bekötés) · jel: npm run verify:v3ref
  - **maradék:** A K05-DSC-c MEZŐVETÍTÉS-ága NYITOTT ÚT, nem adósság: a klauzula maga mondja ki, hogy „amíg nincs külön bizonyított mezővetítés", a vegyes eredmény egészben megtagadandó — a mai rendszer pontosan ezt teszi. Ha valaha mezővetítés épül, annak SAJÁT bizonyítéka kell.
- **OB-9** — K10 — a TÍPUS, NORMALIZÁLÁS ÉS SZÁMÍTÁSI PROFIL klauzulája
  - lezárta: CMD-VS-300-002-002 R35 (a szöveg) → R36 (a bekötés) · jel: npm run verify:v3ref
  - **maradék:** HÁROM klauzula NYITOTT, nevezett hiánnyal: K10-TYP-c (a PROFILVÁLTÁS hatása a korábbi tárolt értékre nincs mérve — egyetlen élő profil) · K10-TYP-d (a „korábbi verziójú vagy más PROFILÚ bemenet" ága) · K10-TYP-e (a MEGFIGYELÉSI idő fogalma nincs a magban — a QNT-munka előfeltétele). Ezek NEM a blokkoló maradékai, hanem a klauzulák saját, kimondott hiányai.
- **OB-10** — A SÖPRÉS A SZÖVEGET OLVASSA, NEM A VERDIKTET — a piros lánc kihagyásnak látszik
  - lezárta: R16 (chatgpt-v3 §2 kérésére) · jel: npm run verify:sweep-verdict
  - **maradék:** A V2 söprése ugyanezt a részszöveges osztályozót viseli, tehát ott a szerződés NEM áll. A maradék átvitele NEVESÍTETT függő: előbb a négy V2-verifier (challenge-inventory · doc-order · mcp-bridge · repo-root) kapja meg a gépi kihagyás-deklarációt, és csak utána vihető át a verdikt-olvasó söprés — V2-módosításra ebben a körben nincs engedély.

## Használati kapuk — az elhalasztott követelmény NEM eltűnt követelmény

- **USE-G1** — Több-írós vagy valódi üzleti használat
  - zárva addig: OB-1 — valódi, több-írós véglegesítési határ bizonyítva, nem egyírós SQLite-on
  - amit a ZÖLD referencia NEM engedélyez: A referencia egyetlen folyamaton, egyetlen írón, szintetikus adaton mérve zöld. Ebből NEM következik, hogy két párhuzamos író alatt a véglegesítési határ tart. Az R35 §4 szó szerint: „csak a megnevezett egyírós referencia határain belüli technikai továbblépés engedhető."
  - forrás: R35 §„Meghozott döntések" 4.
- **USE-G2** — Valódi (nem szintetikus) migrációs korpusz a kiadási osztályozón
  - zárva addig: OB-4 — az ELSŐ valódi import, valódi adaton mérve
  - amit a ZÖLD referencia NEM engedélyez: A szintetikus pozitív/negatív korpusz a referencia-osztályozó TECHNIKAI kapujára elfogadható, de NEM teljesíti az OB-4 „valódi, nem üres migrációs korpusz" feltételét — ez KÉT KÜLÖN vállalás (R35 §„Meghozott döntések" 2.). A migrációs kapu az első valódi importig zárva.
  - forrás: R35 §„Meghozott döntések" 2.
- **USE-G3** — Bizonytalan mennyiséggel dolgozó valódi folyamat (QNT)
  - zárva addig: a QNT megvalósítás és ellenőrzés — a MEGFIGYELÉS mint hatásmentes, nem készletmozgató művelet, saját ismétlés-kulccsal
  - amit a ZÖLD referencia NEM engedélyez: A mennyiségi ÁLLÍTÁS és a KÉSZLETMOZGÁS elválik (R35 §„Meghozott döntések" 3.): egy 100-ról 90-re pontosított megfigyelés önmagában NEM új 90-es mozgás és NEM 190-es készlet. A mai magban a `stock.receipt` az egyetlen mennyiségi művelet, és az MOZGÁST ír — a megfigyelés fogalma hiányzik (K0/C2 · E1 · D1 mérés). A „magon kívül" megfogalmazás NEM törli az R19-ben magra kijelölt alapkövetelményeket: a core-határ szerződésében a megfigyelésnek és hatásmentes rögzítésének EXPLICIT helye van (K10-TYP-e nyitott sora), a jelenlegi receipt művelet NEM helyettesíti. Az ilyen folyamat valódi használatának kapuja ZÁRT.
  - forrás: R35 §„Meghozott döntések" 3.
- **USE-G4** — A „core kész" állítás hatóköre
  - zárva addig: OB-7 — a folyamat által érintett klauzula-sorok TARTALMI elbírálása a külső ellenőrző fél részéről (ma 0/88 soron van érvényes emberi jóváhagyás)
  - amit a ZÖLD referencia NEM engedélyez: A gépi lánc azt méri, hogy a kód teljesíti-e az ÁLLÍTÁST — nem azt, hogy az állítás a NORMÁT fedi-e. A tartalmi elbírálás a tárgyaló félé, és Claude által írt elfogadás NEM helyettesíti (R35 §„OB-7" szó szerint).
  - forrás: R35 §„OB-7 — saját tartalmi ellenőrzés állapota"
