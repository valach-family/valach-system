# R77 — A kontextus a kiszolgáláskor dől el, és a munkakörnyezet egy egységben születik

> **Kör:** CMD-VS-300-002-002 R77 · **Sáv:** Claude-v3 · **Állapot:** lezárt
> **Repó:** `valach-family/valach-system` · **Ág:** `claude/affectionate-dijkstra-76w5e8`
> **Forrás-commit (kód):** `9d6637a` — az R77 ANALYSIS által vizsgált fejre (`c33b394`) építve
> **Parancs:** a külső ellenőrző fél (chatgpt-v3) **R77 ANALYSIS** lapja · **Döntés:** D-VS-3070

---

## Röviden, magyarul — mi lett jobb, és mit lehet most kézbe venni

**Két konkrét hibát javítottunk, mindkettőt a külső ellenőrző fél találta meg** (chatgpt-v3, valódi
méréssel a futó rendszeren):

1. **Két böngésző-lap összekeverhette a cégeket.** Ha valaki egy másik fülön átváltott a másik cégre, az
   első fülön a RÉGI cég fejléce alatt megjelenhetett az ÚJ cég adata. Most a lap minden adat-kérésnél
   megmondja, melyik nézetben indult, a szerver ugyanabban a kiszolgálásban ellenőrzi ezt, a válasz pedig
   kimondja, **kinek és melyik cégnek szolgált ki** — a lap csak akkor rajzol, ha a kettő egyezik.
2. **Egy elgépelt adószámtól félkész cég keletkezett.** A `---` beírására a rendszer programhibát adott
   (HTTP 500), a munkakörnyezet viszont **megszületett** — könyvvel, tagsággal, indulási jogokkal, üzleti
   azonosság nélkül. Most a képernyő **megmondja, melyik mező a baj**, és a kör, a tagság és a jogok közül
   **egy sem születik meg**: vagy minden együtt jön létre, vagy semmi.

**És most van mit kézbe venni:** egy magyar nyelvű lap **15 képernyővel** a valódi felületről (a két
javítás külön képen), benne a **saját gépes kipróbálás pontos, végigpróbált útja** — külön mappába töltött
másolat, a meglévő munkamásolat és a `main` érintése nélkül.

**Amit ez NEM jelent.** Továbbra sem üzemi rendszer: nincs valódi levélküldés, nincs adatbázis-szerver,
nincs nyilvános cím, és a core-core teljes lezárása **nincs elfogadva** — azt a külső ellenőrző fél mondja
ki, nem mi.

---

## 1. A két lelet — ELŐTTE és UTÁNA, ugyanazzal a programmal mérve

A két állapotot **ugyanaz a mérő-program** adta, külön letöltött munkamásolaton: előbb a javítás ELŐTTI
forráson (`c33b394`), majd a javítás UTÁNIN (`9d6637a`). Nem emlékezetből írom le, és nem is a külső fél
szövegét ismétlem: a számok a saját futásból valók.

### F77-01 — két lap, egy munkamenet

| amit mérünk | ELŐTTE (`c33b394`) | UTÁNA (`9d6637a`) |
|---|---|---|
| a lap fejléce ezt hiszi | `A STARTER` | `A STARTER` |
| a szerver válasza a régi nézet olvasására | HTTP 200 · `ok=true` · az eredmény a **másik cég** ára (`unit_price: 3490`, ami csak a pro körben jár) | HTTP 200 · `ok=true` · **és a válasz megnevezi**, hogy a B körnek szolgált ki |
| a válasz megmondja-e, kinek szolgált ki | **NINCS ilyen mező** | `served_book_id` · `served_subject_id` |
| a nézethez KÖTÖTT kérés (`expected_book_id=A`) | HTTP 200 · a mező **némán figyelmen kívül hagyva** (`ignored_params: ["expected_book_id"]`) | **HTTP 409 `context_mismatch`**, adat nélkül |
| mit lát a felhasználó | a régi fejléc alatt az új cég adata | a fejléc és a panel **együtt mozdul**, és a képernyő kimondja, hogy időközben máshol váltottak |

**A kliens jelzése nem jog.** A megerősítő mező SOHA nem választ könyvet vagy alanyt: csak szűkít. Idegen
könyvre hivatkozva a válasz ugyanúgy 409, adat nélkül — mérve (battéria `(h)` pontja).

### F77-02 — normalizálva üres azonosító

| amit mérünk | ELŐTTE (`c33b394`) | UTÁNA (`9d6637a`) |
|---|---|---|
| a válasz | **HTTP 500** · `internal_error` · `attachBusinessIdentity: value_required` | **HTTP 400** · `tax_id_value_required` · mező: `business.tax_id` · `wrote: false` |
| a mondat a képernyőn | programhiba (nem mondja meg, mit javítson) | „az azonosító normalizálás után ÜRES (a szóköz és a kötőjel nem számít) — adj meg valódi azonosítót, vagy hagyd el a vállalkozási minőséget" |
| könyvek | **3 → 4** | 3 → 3 |
| tagságok | **3 → 4** | 3 → 3 |
| jogosultsági alapok | **3 → 4** | 3 → 3 |
| üzleti azonosságok | 0 → 0 | 0 → 0 |

**A szabály nem új, csak végre megkérdezzük.** A `---` azért üres, mert a rendszer saját normalizálója a
kötőjelet és a szóközt elhagyja — ezt a szabályt eddig is ismerte, csak az ÍRÁS KÖZEPÉN kérdezte meg.
Négy „normalizálás után üres" írásmódot mértünk (`---` · `-` · `" - - "` · `"\t-\t"`): mind nevezett 4xx,
írás nélkül. A csupa szóköz a határ meglévő `nonempty_string` szabályán akad el (`invalid_type`) — más
néven, **ugyanazzal az eredménnyel**: nevezett elutasítás, írás nélkül.

**Pozitív ellenpárok** (hogy ne „védelem" címén a jó eset is elakadjon): érvényes HU adószámmal a kör
elindul, a minőség önbevallott marad; és az **ISMERETLEN országprofil sem tiltja** a legitim saját munkát
(H12 · REP-01). Vezérelt bukást tettünk az egység egy KÉSŐBBI lépésébe is: nevezett elutasítás jött, és
**egyetlen sor sem maradt hátra** (7 → 7). A minta-rekordok szándékosan az egységen KÍVÜL maradnak (a
parancs-írás saját, mért tranzakciós határa) — a hiányuk ezért **nevezett** (`seed_failed`), nem néma.

---

## 2. Mi változott a kódban — két szerződés

- **KTX-02 (az olvasás nézethez kötése).** Minden kontextusfüggő olvasás viszi a nézetét
  (`expected_book_id` · `expected_subject_id`), a mezőket a HATÁR sémaregisztere deklarálja
  (`v3app/httpSchema.mjs` → `readContextQuery`), a szerver **ugyanabban a kiszolgálásban** veti össze
  (`readContextGate`), és minden ilyen válasz kimondja a ténylegesen kiszolgált kontextust. A lap csak
  egyezésnél rajzol (`servedMatches`) — **a hiányzó mező nem egyezés**. Az alany- és a könyv-váltást
  együtt nézzük: közös sütinél a másik lap MÁS FIÓKBA is beléphet, és ezt a képernyő kimondja.
- **PRV-01 (atomi munkakörnyezet-indítás).** A vállalkozási minőség problémáját írás ELŐTT olvassuk ki a
  normalizáló saját szabályából (`businessIdentityProblem`), a mag (könyv · tagság · indulási tények ·
  üzleti azonosság) **egy atomi egységben** íródik, bukásra nulla sor marad, és a munkamenet csak sikeres
  egység után vált az új körre.

**Amit ezek NEM oldanak meg, kimondva:** egy nyers HTTP-kérés, ami NEM viszi a megerősítő mezőt, továbbra
is a munkamenet SAJÁT mai körét kapja meg — ez így helyes (a saját kontextusát mindenki olvashatja). A
védelem nem a mező jelenléte, hanem hogy (a) a válasz megnevezi a kiszolgált kontextust, (b) a lap csak
egyezésnél rajzol, és (c) ha a kérés viszi a kötést, az eltérés nevezett elutasítás.

---

## 3. §4 — tartalmi helyesbítések (új képesség nélkül)

A külső ellenőrző fél leletei a SAJÁT korábbi állításaimról szóltak. Mindegyiket helyesbítettem, és ahol
lehetett, **gépi jelet is tettem a szó mellé**, hogy ne csússzon vissza:

- **L2 (képviselet): „lezárt" → `dontes_megvan`.** A saját lezárási feltétele („nevezett képviseleti alap
  + próba") **teljesületlen**: nulla adapter van bekötve, és nulla megépített művelet tartozik a két zárt
  osztályba. Ami kész: a DÖNTÉS (mi indulhat képviselet nélkül) és a BELÉPÉSI HATÁR (fail-closed
  osztály-regiszter, nevezett nemleges válasz).
- **A09 és A18: „fedett" → „részben".** Mindkét sor nevezett hiányt hordozott a saját szövegében (A09: a
  „régi beadott FÁJL" fogalma nincs; A18: a valós FIZIKAI lista mint MŰVELET nincs megépítve). Az
  összegzés ezzel **1 fedett · 13 részben · 4 nevezett hiány**.
- **H08 („cégváltáskor nem keverednek a cégek"): a bizonyíték a helyzet SAJÁT sorába került.** A két lapos
  verseny mérése most a H08-ban áll (nem egy másik lapon), a javítás utáni állapottal. **Kimondva, mit
  jelent ez az állapotra:** a „bizonyítva" szót azért TARTOM, mert az ellenpélda ebben a körben MEGSZŰNT —
  a H08 saját próbája a két lapos versenyt is méri (a fejléc és a panel együtt mozdul, a régi nézethez
  kötött kérés 409), és a négy időzítési pont külön próbában áll. Ha a külső ellenőrző fél ezt másként
  ítéli meg, az állapot EGY sorban átállítható: a bizonyíték és a pontos hatóköre így is a lapon áll.
- **H07 · H09 · H10: „bizonyítva" → „részben"**, mert a címsoruk többet állít, mint ami mérve áll:
  H07-ben a „számla" és a „beszállítói" adatosztály **nem létezik** a rendszerben (az adatkör-szótár két
  tagú); H09-ben a meghívó lejárata és a **jogosultsági alap** lejárata két külön állítás, külön
  bizonyítékkal és külön szinten; H10-ben a valódi szervezeti **hierarchia** hiánya mostantól az
  ÁLLAPOTBAN áll, nem a megjegyzésben.
- **Az elfogadási helyzet-lap összegzése újraszámolva:** **9 bizonyítva · 3 részben · 2 nem böngészőben**
  (a korábbi 12 / 0 helyett).
- **H11 szöveg-lelete JAVÍTVA.** Az R75-ben még csak leírtam: ha a jog-kapu enged és csak az előfizetés
  zár, a válasz a mag kiadás-mondatát („az eredmény kiadva") vitte az ELUTASÍTVA felirat alá. Mostantól az
  elutasítás mondatát a ZÁRÓ KAPU adja, névvel; a „kiadva" csak tényleges kiadáskor hangzik el — és ezt
  mindkét irányban próba méri.
- **L10 kimondott hatókörrel zárt.** A SZERKEZETI teljesség gépi jellel áll (mind a 18 eset a
  forrás-dokumentumból, egyetlen mező sem üres, az összegzés SZÁMOLT); a TARTALMI helyesség olvasás
  dolga — és az R77 ezen az úton két sort (A09 · A18) ténylegesen helyesbített is.

**Hogy a szó ne szakadjon el a mércéjétől**, a lezárási lista minden sora viszi, hogy a saját feltétele
teljesült-e (`lezarasi_feltetel_teljesult`), és ahol nem, ott MEGNEVEZI, mi hiányzik; a kettő együtt mozog,
gépi jellel. A megfeleltetésen pedig „fedett" csak ott állhat, ahol a sor KIMONDJA, hogy nincs nevezett
maradék.

---

## 4. Két saját lelet ebben a körben (nem a külső féltől)

- **A részleges futás felülírta a teljes mérés lapját.** Egy szűkített böngésző-futás (`-g "H11"`) a többi
  tizenhárom helyzetet „részben"-re állította, és a közzétett bizonyíték-lapot **felülírta** — a mért
  9/3/2 némán 1/13 lett. A hiányzó mérés eredmény-szót kapott, ami ugyanaz a hiba, mint amiről a KUKA-093
  szól. **Javítva:** a nem futott helyzet saját szót kap (`nem_futott`), a lap viszi a futás hatókörét
  (`partial_run` · `measured_ids` · `not_run_ids`), és részleges futás a közzétett lapot **nem írja felül**.
  Gépi jel: `verify:app-findings-r77` R77 §4 (c/0).
- **Sorrend-hiba a saját javításomban.** A `fetchData` előbb frissítette a fejlécet, és csak utána ürítette
  a panelt — lassú válasz alatt a RÉGI cég adata a képernyőn maradt (a teljes csomag futtatásakor ez egy
  próbát meg is buktatott, terhelés alatt). Mostantól az **ürítés az első lépés**, és ezt vezérelt
  lassítású böngésző-próba méri. Ugyanitt derült ki, hogy a váltás utáni fejléc-frissítéssel a próbák
  **versenyeztek**: a segéd most megvárja — egy próba nem versenyezhet a saját előkészítésével.

**Új tanulságok a regiszterben:** **KUKA-204** (a kontextus a KISZOLGÁLÁSKOR dől el) · **KUKA-205** (ami
együtt igaz, azt egy egységben írjuk; a meglévő szabályt írás ELŐTT kérdezzük meg) · **KUKA-206** (a
részleges futás nem írhatja felül a teljes mérés lapját).

---

## 5. Az átadás — ami MOST a kezében van

**(1) A képernyős lap.** 15 képernyő a valódi felületről, valódi böngészőben: Anna regisztrál → lejárt
levél és a működő folytatás → személyes kör → családi vállalkozás köre → Béla meghívása → **külön**
adatkör-adás → készlet-nézet → megvonás és annak hatása; a végén **az R77 két javítása külön képen**. A lap
fejléce kimondja, melyik ágból és melyik commitból készült, és azt is, hogy a munkafa tiszta volt-e.

**(2) A saját gépes kipróbálás — végigpróbált út.** A lapon ott a négy sor; a lényeg: **külön mappába**
tölt le, tehát a meglévő munkamásolatot és a `main`-t nem érinti, és a futtatáshoz **nem kell** adatbázis,
kulcs vagy internet. Előfeltétel: **Node 22.5 vagy újabb** (`node -v`). Indítás után a cím
`http://127.0.0.1:3300/`, a kimenő levelek a `/dev/mailbox` lapon állnak, leállítás **Ctrl + C**, a próba
adatai a letöltött mappán belül élnek.

**Ezt az utat végigpróbáltam**, nem leírtam: friss letöltés a `9d6637a` commitra → indítás → a lap
válaszol → regisztráció → a megerősítő levél a fejlesztői levél-fogadóban. Amit a címzett nem tud
megnyitni vagy elindítani, azt nem szállítottuk le (KUKA-079).

**Ami továbbra sincs, kimondva:** nyilvános telepítés, Railway-változtatás, merge, külső levélküldés — és a
fejlesztői levél-fogadó nyilvánosan nem tehető ki (hitelesítés nélkül mutatja a kimenő leveleket).

---

## 6. Bizonyítékok — mi futott, és mi az eredménye

| mérés | mit mér | eredmény |
|---|---|---|
| `npm run verify:app-findings-r77` | az R77 két lelete piros/zöld ágon + H11 felirat + a §4 tartalmi kötések | **34/34 PASS** |
| `npm run verify:app-findings` | az R75 három lelete + L2 · L3 · L8 · L10 számai | **73/73 PASS** |
| `npm run app:selfcheck` | a héj határ-szabályai | **57/57 PASS** |
| `npm run proof:core-ux` | 33 böngésző-próba (Chromium): magfolyam · elfogadási helyzetek · R75 · R77 | **33/33 PASS** |
| `npm run verify:kuka` | a kivezetett minták nem jöttek vissza (197 tanulság) | **351/351 PASS** |
| `npm run verify:v3ref` | a mag mutációs battériája | **204 mutáció · 204 elkapva · 0 túlélte** |
| `npm run verify:external-checks` | a külső fél 19 beadott programja | **17/19 MEGFELEL · 2 ENV-KIHAGYÁS nevezett, ZÖLD helyettessel** (r57→r57a · r59→r59a; a mért akadály `wall_clock_timeout`) · kilépés **0** · a bizonyíték a `9d6637a` commithoz kötve, tiszta forráson |
| `npm run verify:sweep` | a TELJES söprés (16 verifier + 2 ÚJRAHASZNÁLT bizonyíték) | **15 zöld · 0 env-kihagyás · 1 piros** — a piros a `verify:capability-witness` (lásd alább) |

### 6/b. Az R76-os ellentmondás feloldva — futási azonosító és forrás szerint

A külső ellenőrző fél joggal kérte számon, hogy az R76-os lapom §9 szakasza **egyszerre** állította, hogy a
két hosszú lánc külön futott (eredménnyel), és hogy „a 19 külső program teljes sorozata nem futott újra
ebben a körben". **A két mondat KÉT KÜLÖNBÖZŐ futásról szólt, és a lap ezt összemosta** — a feloldás a
bizonyíték-fájl saját adataiból:

- **A söprésen BELÜLI futás nem fejeződött be** a söprés 900 s-os türelmén belül — ez az, amire a
  „nem futott újra" mondat vonatkozott (és amire a verdikt helyesen „nem futott — nem igazolt").
- **A láncot KÜLÖN futtattam, és az VÉGIGFUTOTT**: a bizonyíték-fájl
  (`v3ref/external-checks/results/external-checks-result.json`) az R76-os alakjában
  `at: 2026-09-22T21:58:00.259Z` · `node: v22.22.2` · forrás-commit **`6a7bfc2`, tiszta munkafán** ·
  hatókör: **teljes, mind a 19 program lefutott**, kihagyás nélkül · verdikt: **17 zöld · 2 ENV-kihagyás
  (nevezett helyettessel: r57→r57a · r59→r59a)** · `complete_evidence: false` — tehát a 19 program
  LEFUTOTT, de a lánc SAJÁT szótárában a bizonyíték nem teljes, mert kettő környezeti okból kihagyott.
- **Ebben a körben (R77) újra futott**, a mai forráson: a bizonyíték-fájl forrás-commitja **`9d6637a`**,
  és minden részletes eredmény-fájl ehhez a commithoz van kötve (a chain minden sorban kiírja a kötést).

A tanulság a lap szövegére: **a „futott" állítás mindig a futás AZONOSÍTÓJÁHOZ tartozik** (idő · forrás ·
hatókör), nem a lánc nevéhez — két futásról egy mondatban beszélni ugyanaz a hiba, mint a mérés hatókörét
elhallgatni (KUKA-033).

---

## 7. Amit ez a kör NEM állít

- A **core-core teljes lezárása nincs elfogadva** — ezt a külső ellenőrző fél mondja ki.
- A **„16 elfogadott / 13 részleges klauzula" nem készültségi arány**, és a „lezárt" sorok sem azok:
  mindegyik a SAJÁT feltételére zárult, kimondott maradékkal.
- Az **R19 QNT** (24 követelmény / 36 eset) és a mag alapjai változatlanul nyitva állnak.
- **Becslésből visszamenőleg nem lesz mérés**: ahol nem mértünk, ott az áll, hogy nem mértünk.
- Üzemi használat nem állítható (a lezárási lista L1 · L4 · L5 sora nyitott).

---

### 6/c. A söprés — és a két hosszú lánc újrahasználata (SRU-01)

A két több-tízperces láncot **egyszer** futtattam le a célzott javítások után, a `9d6637a` commiton,
tiszta munkafán; a záró söprés ezeket **nem futtatta újra**, hanem a bizonyítékukat használta fel —
és ezt a feloldó MÉRTE, nem én állítom:

- `verify:external-checks` → **ÚJRAHASZNÁLT BIZONYÍTÉK**: a `9bb1be7` commit bizonyítéka ZÖLD
  (17/19, env-kihagyás 2, `2026-09-23T18:30:47.835Z`), azonosság mérve (nevezett lánc · feloldott
  commit · zöld, tiszta forrás · azonos lánc-bemenet a munkafán).
- `verify:v3ref` → **ÚJRAHASZNÁLT BIZONYÍTÉK**: ugyanennek a commitnak a bizonyítéka ZÖLD
  (204/204 mutáció elkapva, `2026-09-23T18:06:37.084Z`), azonosság mérve.

**És egy kimondott kitérő, mert a kapu ELŐSZÖR elutasította.** Az első söprés-futásom a `9d6637a`
commitra hivatkozott, a friss bizonyíték-fájlok viszont akkor még csak a MUNKAFÁN álltak — a feloldó
ezért a commitban lévő RÉGI bizonyítékot mérte, és nevezetten elutasította: „a munkafa eltér a commit
alakjától" (external-checks) · „a forrás-köteg lenyomata ≠ a bizonyíték base_digest-je" (v3ref). A
söprés összverdiktje ekkor **NEM ZÖLD** volt, „nem futott — nem igazolt" minősítéssel. A megoldás nem
a kapu megkerülése volt, hanem a friss bizonyíték COMMITOLÁSA (`9bb1be7`) és a söprés megismétlése
erre a commitra — a hosszú láncok újrafuttatása nélkül. **Így néz ki a kapu, amikor dolgozik.**

**A söprés egyetlen pirosa: `verify:capability-witness` — ÖRÖKÖLT, és NEM ebben a körben keletkezett.**
A verifier a V2 repó board-regiszteréhez méri a V3 fáját
(`/home/user/vs/tools/chatops-board/config/matrix-capabilities.json`), és két RÖGZÍTÉS elavult:
`v3-ui-slice` és `v3-vertical-slice` mérve **present**, a regiszterben **absent** (9/11 egyezik; további
2 tétel gépileg nem mérhető, kimondva). Ezt az R76-os kör mérte örököltnek (a kiinduló fejen,
`f8828ba`, ugyanez a 9/11), és a javítás helye a **V2 repó** — amit ez a parancs kimondottan tilt.
Javaslat változatlanul: a két sort a V2 sáv állítsa `present`-re.

---

## 8. Fogyasztás

A csomag ablaka a parancs board-időbélyegétől (`2026-09-22T22:39:22Z`) a zárásig: **433 hívás ·
fő-szál kontextus medián 403 074 / max 783 902 token · 0 al-ügynök · cache-olvasás 166 M · lefedettség:
teljes.** A **kísérleti jelzőt átléptük** (medián 403 074 > 200 000) — kimondva, indokkal: ez a
munkamenet KÉT kört vitt végig (R75 és R77), és a kör tárgya végig nagy fájlokon (böngésző-csomag,
mérőlapok, regiszterek) dolgozott. Amit emiatt szűkítettem: **nulla al-ügynököt** indítottam, a
terminálra csak összegző és hibás sor ment (a teljes napló fájlba), és a hosszú láncok egyszer futottak.
Amit a KÖVETKEZŐ csomag tesz: **új munkamenet**, mert a jelző a munkamenet-szintű kontextusra mér.
