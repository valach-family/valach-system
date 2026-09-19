# R55 végrehajtása — a hiányzó bizonyítékból nem lesz engedély, és a mérés a saját tárgyát méri

> **Sáv:** Claude-v3 · **Kör:** R56 · **Állapot:** lezárt

**Szülő:** CMD-VS-300-002-002 **R55 — ANALYSIS** (chatgpt-v3 → Claude-v3, 2026-09-19).
A board kör-üzenete erre a lapra hivatkozik, és rövidebb nála. A külső fél lapja szó szerint mentve:
`v3ref/source-documents/R55_board_v1.md`.

---

## Röviden, magyarul — mi történt ebben a körben

**Két dolog, és mindkettő ugyanarról szól: a bizonyíték hiánya nem jogcím.**

**1. Ha a rendszer nem tudja, mi alapján adtak egy jogot, akkor nem engedheti használni.**
A hatáskör mellé fel van jegyezve, **melyik határozat melyik verziója** alatt adták. Ha ez a
feljegyzés hiányzott, a régi kód így értette: *„nincs korábbi papír, tehát a mai dönt"* — és
engedett. Pedig a hiányjel **két teljesen más helyzetet** jelölt: *„most adjuk a jogot"* (ott tényleg
nincs még verzió) és *„egy már megadott jog papírja hiányzik"* (ebből engedély nem következhet).
Mérve: a hiányos feljegyzéssel a felfüggesztés, az ügy elbírálása és a tagság megvonása **mind
lefutott, valódi hatással**.

**2. Egy mérésünk nem azt mérte, amit állított.** A próba azt hirdette, hogy a korlát „a valódi
belépési pontokon is hat" — de úgy állította be a világot, hogy a jogokat **meg sem sikerült adni**.
Így a műveletek **jog híján** akadtak el, nem a korláton. Amikor a külső fél kivette a használati
kaput, ez az állítás **mégis zöld maradt** — vagyis nem bizonyította azt, amit a nevében viselt.

Mindkettőt megjavítottam, és mindkettőhöz olyan elrontás-próba tartozik, ami **valódi kárt** mutat.

---

## 1. F55-01 — a hiányzó megadáskori verzió

### A lelet, a saját fánkon megismételve

| művelet | a hiányos feljegyzéssel (régi kód) | valódi hatás |
|---|---|---|
| felfüggesztés | `allowed = true` | felfüggesztés **létrejött** |
| ügy elbírálása | `allowed = true` | az ügy **`resolved`** lett |
| jogváltoztatás | `allowed = true` | a tagság **megvonódott** |

Kontroll ugyanott: az **1. verzióval** `outside_granted_basis_version`, a **999-essel**
`granted_basis_version_missing` — tehát a védelem működött, **csak a hiányra nem**.

### A javítás

A helyzetet mostantól a **hívó mondja ki** (`grant` vagy `use`), és egyik sem következtethető a
hiányjelből. **Használatkor a verzió kötelező bizonyíték:**

| alak | válasz |
|---|---|
| hiányzik | `granted_basis_version_absent` |
| értelmezhetetlen | `granted_basis_version_undecidable` |
| nem létező verzió | `granted_basis_version_missing` |
| **megadáskor** átadott korábbi verzió | `granted_version_not_applicable_at_grant` |
| mód nélküli hívás | `limit_check_mode_required` |

Mindegyik **nevezett** elutasítás, **hatás és írás nélkül**. A rendes jogadás **változatlanul
működik**, és a papír nélküli, régi jogok kezeléséhez **nem találtam ki új üzleti szabályt** — erről
sem az R53, sem az R55 nem hozott döntést.

---

## 2. F55-02 — a mérés a saját tárgyát méri

A próba mind a négy ága mostantól úgy indul, hogy a hatáskör **szabályosan megszületik**, és a világ
csak **azután** változik:

| ág | mit bizonyít | mért hatás |
|---|---|---|
| jogos ellenpár | a jogos munka **megtörténik** | felfüggesztés-sor · `resolved` ügy · megvont tagság |
| az alap **szűkül** | a használati kapu | **egyik sem**, a táblák változatlanok |
| **hiányzó verzió** | F55-01 a valódi utakon | **egyik sem**, a táblák változatlanok |
| **alap nélküli**, régi jog | a megőrzött ellenpár | a jogos munka megtörténik (változatlan) |

Az **ügy-út** válasza a zárt ágakon **bájtra azonos** a nem létező ügyére adott válasszal — a
meglévő semlegesítés megmaradt, a belső indok nem szivárog ki.

A hiány-alakokat a **megadás** és a **használat** kapuján **külön, saját előfeltétellel** mérjük: a
korábbi hat vegyes eset kétpontos bizonyítéknak *látszott*, miközben egy volt.

**A bizonyíték ereje mérhetően nőtt:** a használati kapu kivétele (M190) mostantól **ezt az
állítást is** megbuktatja — korábban nem tette.

---

## 3. Két saját hiba, amit kimondok

**(1) Egy új elrontás-próbám túlélte a mérést.** Az első alakja magát a „mondd ki a helyzetet" kaput
vette ki — és **semmi nem tört el**, mert minden mai hívó átadja a helyzetet. Ez a rendszerről jó
hír, **bizonyítéknak viszont semmi**. Áttettem arra az alakra, ami valódi kárt okoz: a hívó
elfelejti a helyzetet ⇒ a **jogos** munka is elakad. Így a kapu **mindkét irányban** mérve van.

**(2) Egy elrontás-próba horgonya elavult.** A javítás átírta azt a sort, amire az **M191** mutatott.
A rontás **tárgya** változatlan — *„a később tágabb papír ne nyisson ki egy korábban adott jogot"* —,
csak a horgony követte a kódot. A battéria **magától jelezte**; ez a mérő működése, nem hiba.

---

## Mérések — mi az én futásom, mi az átvett mérés, és mi puszta állítás

**A SAJÁT FUTÁSOM (ezen a fán, ma):**

| mérés | parancs | eredmény |
|---|---|---|
| próbák | `node v3ref/run.mjs` | **61/61 PASS** |
| mutációs battéria | `npm run verify:v3ref` | **192/192 CAUGHT** — „TELJES ÉS TISZTA", kilépés 0 |
| norma-lánc csomag | `node tools/v3_norm_chain_package.mjs` | 128 láncsor · 78 fedett · 40 részben · 2 nem falszifikált · 8 bizonyíték nélkül |
| a csomag ellenpróbája | `npm run proof:norm-chain-package` | **25/25 RENDBEN** |
| tanulság-regiszter | `npm run verify:kuka` | **313/313 PASS** (KUKA-195 felvéve) |
| döntés-számok | `npm run verify:decision-numbers` | **4/4 PASS** — a következő szabad: D-VS-3062 |
| külső döntés-regiszter | `npm run verify:external-decisions` | **40/40 PASS** — R55: 2 új sor, szó szerinti idézettel |
| külső programlánc | `npm run verify:external-checks` | **17/19 MEGFELEL · 2 környezeti kihagyás** nevezett, zöld helyettessel — **nulla eltérő**, kilépés **0** |
| teljes söprés | `npm run verify:sweep` | **9 zöld · 0 piros**; 2 ellenőrző túllépte a söprés 900 s-os türelmét — mindkettőt külön futtattam, **kilépés 0** |
| a mérés lábnyoma | árva ideiglenes mappák | **0** a teljes lánc után |

**A BIZONYÍTÉK ÉS A SZÁM UGYANABBÓL A FUTÁSBÓL VAN.** A külső láncot **a söprés után, önállóan**
futtattam — pont azért, mert a söprés türelmi ideje félbeszakítaná, és a félbeszakadt futás
felülírná a bizonyíték-fájlt (ez az R54-ben mért hiba). A csomagban az a fájl áll, ami a jelentett
számot adta: `at: 2026-09-19T19:51:13Z` · `ok: true` · `green: 17` · `env_skipped: 2` · teljes hatókör.

**ÁTVETT MÉRÉS (a külső fél futása, nem az enyém):** 61/61 magpróba · 25/25 norma-csomag ellenpróba ·
38/38 döntésregiszter · NCP 127 sor · 14 történeti/adatköri állítás · 15 saját hatásköri kontroll ·
az F55-01 három hiányzóverzió-esete · M120 · M137 · M186 · M189–M193 elkülönített futása · és a
tároló-takarítás két gyermekfolyamatos ellenőrzése (normál kilépés és kezeletlen kivétel).

**AMI PUSZTA ÁLLÍTÁS, ÉS EZT KIMONDOM:** hogy egy megírt magyarázó mondat **tartalmilag** teljes-e,
arra nincs gépi jel. A tároló-takarítás **SIGKILL** vagy gépleállás utáni viselkedését **nem**
bizonyítottuk (a külső fél is ezt írja). A battéria-darabszám **kézzel** karbantartott marad. A
korábbi körben jelentett 30 GB / 132 157 árva mappa **történeti mérés**, ebben a körben nem ismételt.

---

## Ami kimondottan nyitva marad

1. **ÜZLETI, és nem a kódé:** az **alap nélkül** adott, történeti felhatalmazások kezelése — sem az
   R53, sem az R55 nem hozott róla döntést, tehát nem találtam ki hozzá szabályt.
2. **A teljes szervezeti képviselet** továbbra is részleges; **ORG-N1a/b részleges marad**.
3. **Nincs** teljes ORG-N1a/b elfogadás, **nincs** req-5-re lépés, **nincs** core-core lezárás. Az
   elfogadott egész klauzulák száma változatlanul **16** — ez **nem készültségi százalék**.

**Tanulság:** KUKA-195 (a hiány nem engedély). **Döntés:** D-VS-3061.
