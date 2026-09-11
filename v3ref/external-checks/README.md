# Külső ellenőrző programok — EXT-01

**Mi ez.** Azok a programok, amelyekkel a V3 magreferenciát KÍVÜLRŐL mérték, itt állnak a repóban,
változatlanul, és **egy paranccsal lefuttathatók**.

```bash
node v3ref/external-checks/run-all.mjs
```

Ez összerakja a környezetet (`source/` · `source-manifest.json` · `evidence/`), lefuttatja mind a
három programot, a **teljes, géppel olvasható eredményt** a `results/` alá teszi, és **nem-nulla
kóddal zár**, ha bármelyik eset elbukik.

---

## Miért van ez a könyvtár

Az R57 §7 kimondott követelménye: *„Az új programok tényleges fájlja vagy teljes szövege; pontos
commit; teljes, géppel olvasható eredmény."*

Ezt azért kérték, mert az R57-ben ezt írták: *„Az R56-ban említett `restated.mjs` és
`f03-restated.mjs` nem található a megadott commit teljes, nem csonkolt fájlfájában… Ezért **saját
rekonstrukciót** futtattam a leírt elvárásokból."*

Ez a mi mulasztásunk volt: a programokra HIVATKOZTUNK, de nem tettük őket a repóba — tehát nem
adtuk át őket (KUKA-079: amit a címzett nem tud megnyitni vagy futtatni, azt nem szállítottuk le).
A külső fél kénytelen volt rekonstruálni, és a rekonstrukció **más programot mér**, mint amiről a
jelentésünk beszélt.

---

## A három program — és **ki írta**

A szerző nem díszítés. A külső fél programja **független tanú**; a másik kettő a **mi
önvizsgálatunk**. Ha a kettőt egy kalap alá vennénk, a saját programunk zöldje független
bizonyítéknak látszana (KUKA-054: a mérés nem igazolhatja vissza a saját előfeltevését).

| fájl | írta | kör | mit mér | esetek |
|---|---|---|---|---|
| `r57_chatgpt-v3.mjs` | **chatgpt-v3 — KÜLSŐ, független fél** | R57 | `T01–T05`: az R56-ban tett pecsét-állítások · `E01–E04`: megkerülhető-e a bizonyíték-kapu | 9 |
| `r55_restated.mjs` | Claude-v3 — a saját sávunk | R56 | az R55 öt esete újrafogalmazva a mai szerződésre, mindegyikhez **ellenpárral** | 5 |
| `r53_f03_restated.mjs` | Claude-v3 — a saját sávunk | R54 | az R53/F03 támadás egyenértékű alakja (`G01`) + érintetlen **ellenpár** (`G02`) | 2 |

A fájlok szövegéhez a futtató **nem nyúl**. A `r57_chatgpt-v3.mjs` bájtazonos azzal, ahogy a boardon
érkezett; a másik kettő azzal, ahogy a saját körében lefutott.

---

## Mit csinál a futtató

1. **Megméri a forrás-állapotot.** `git rev-parse HEAD`, és megnézi, van-e a lemásolt forráson
   nem-könyvelt változás. Ha van, a bemondott commit `+uncommitted` jelölést kap, és a futtató
   **kiírja, mely fájlokon**.
   *Miért:* a bemondott commit **állítás, nem mérés** (R45 P01 / KUKA-056) — pontosan ezen bukott el
   egy korábbi kör, amikor a `71c69bb…` forráson futó programnak a régi `c58f5f6…` commitot adták át.
   A forrás tartalmi lenyomatát a programok által indított `run.mjs` maga számolja ki; **az** a
   bizonyíték, nem ez a szöveg.
2. **Összerakja a környezetet** egy ideiglenes könyvtárban: `source/v3ref/…` (a `v3ref/` másolata az
   `external-checks/` és a generált eredmény nélkül) · `source-manifest.json` · üres `evidence/` ·
   a három program.
   *Miért gép:* eddig ezt kézzel raktuk össze, és a részleteket vissza kellett olvasni a fejlesztőnek.
   Ha egy eszköz használatához futár kell, az eszköz nincs kész (KUKA-072).
3. **Lefuttatja** mindhármat, és **kimondja az összesítést**.
4. **Kimenti a gépi eredményt** a `results/` alá (vagy `--out <könyvtár>`).

### Kapcsolók

| kapcsoló | mit csinál |
|---|---|
| `--only r57` \| `r55` \| `r53` | csak az egyik program (ismeretlen névnél felsorolja a választhatókat) |
| `--out <könyvtár>` | a gépi eredmény máshova kerül (alap: `v3ref/external-checks/results/`) |
| `--keep` | a munkakönyvtár megmarad, és a futtató kiírja az útját |

### Kilépési kód

**0**, ha minden lefuttatott eset `pass` — különben **1**.

Ez a futtató **saját** döntése: a három program maga mindig `0`-val zár, csak kiírja a JSON-t. Ez
pontosan az az alak, amit az R57 F01 leletként nevezett meg nálunk — ezért a saját futtatónkban sem
engedjük meg, hogy a nemleges eredmény csak a képernyőn látsszon.

**A SÖPRÉS RÉSZE.** `npm run verify:external-checks` néven ott van a `verify:sweep`-ben, tehát minden
kör végén lefut. Ez szándékos: egy söprésen KÍVÜL álló próba egy napig pirosan állhat úgy, hogy senki
nem látja (KUKA-081 · KUKA-051). Ha egy szigorúbb határ elavít egy esetet, a söprés PIROSRA vált — és
akkor az esetet a szándéka szerint újra kell fogalmazni, nem a határt lazítani (KUKA-102).

**Mérve, mindkét irányban** (2026-09-11, Node v22.22.2):

- érintetlen forráson: `RESULT: 3/3 program MEGFELEL`, kilépés **0** (16 eset: 9 + 5 + 2)
- szándékosan eltört magpróbán (`run.mjs` elején dobott kivétel, a mérés után visszaállítva):
  `RESULT: 0/1 program MEGFELEL — ELTÉRÉS: r53`, kilépés **1**

---

## Amit a `results/` tartalmaz

| fájl | mi van benne |
|---|---|
| `external-checks-result.json` | az összesítő: a mért commit, a piszkos fájlok, programonként a kilépési kód, az esetszám, az elbukott esetek neve, futásidő |
| `r57_r56-challenge.json` | a külső fél programjának **teljes** eset-naplója |
| `r55_restated.json` | az R55 újrafogalmazott esetek teljes naplója |
| `r53_f03-restated.json` | az R53/F03 két esetének teljes naplója |

Ezek **származtatott** fájlok: minden futás felülírja őket. A repóban azért állnak, mert a külső fél
kimondottan kérte a „teljes, géppel olvasható eredményt" egy „pontos commiton" — a
`external-checks-result.json` `source.commit` mezője mondja meg, melyiken készültek.

---

## Követelmények

- **Node 22+** (a magreferencia a beépített `node:sqlite`-ot használja — nincs telepítendő függőség,
  nincs hálózat, nincs adatbázis-elérés).
- A programok **elkülönített, ideiglenes** tárolón dolgoznak; a repó forrásához egyik sem nyúl.
- A leghosszabb eset a teljes mutációs battéria (46 mutáció) — a teljes futás nagyságrendje
  **10–15 másodperc**.
