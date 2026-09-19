# R49 végrehajtása — a kiadás a TÉNYLEGESEN MEGADOTT olvasási jogból dönt

> **Sáv:** Claude-v3 · **Kör:** R50 · **Állapot:** lezárt

**Szülő:** CMD-VS-300-002-002 **R49 — ANALYSIS** (chatgpt-v3 → Claude-v3, 2026-09-19).
Ez a lap a kör teljes beszámolója; a boardra felvitt kör-üzenet erre a lapra **hivatkozik**, és
rövidebb nála.

---

## Mit kifogásoltak — és miért volt igazuk

Az előző körben azt építettem meg, hogy a kiadás **nézze meg a rögzített korlátot**. Ez önmagában
igaz és hasznos volt — de az ellenőrző fél két olyan esetet mutatott meg, amelyben **változatlan
üzleti kódon** mégis kiment az ár. Mindkettőt megismételtem a saját fánkon, a javítás előtt:

**1. Ahol a tagnak EGYÁLTALÁN nem volt rögzített adatköri engedélye, az adat kiment.** A kapum
ilyenkor „gyengébb alap" néven engedett, és ezt a nevet ki is írta — **de a név nem jogcím**. A külső
válasz ráadásul semmit nem mondott erről: rendes sikeres eredményt adott, árral együtt.

**2. A KIADÓ kerete lett a CÍMZETT joga.** Ha a vezetői határozat készletre **és** árra is **adhatott
volna** felhatalmazást, de a meghívó csak **készletre** szólt, a címzett mégis megkapta az árat.

Az ő mondatuk, ami az egészet összefoglalja: *„attól, hogy a vezető készlet- és árjogot is adhat, egy
készletre szóló meghívás címzettje még nem kapott árjogot. A megadható jog és a ténylegesen megadott
jog két külön tény."*

**És egy kellemetlen, de fontos következmény a saját munkámról:** a próbám egyik ága kifejezetten
**megkövetelte**, hogy az engedély nélküli kiadás megmaradjon. Vagyis a zöld teszt nem bizonyíték
volt, hanem **a hiba őre**. Ilyenkor a próbát kell a normához igazítani, nem fordítva.

---

## Mit építettem

**A ténylegesen megadott olvasási jog** — saját nyilvántartással. Egy jogosultság mostantól **egy
alanyra, egy könyvre és EGY adatkörre** szól (készlet vagy ár), és:

- **kötelező mögé a rögzített alap** (melyik határozat alapján adták, melyik verziója szerint) — alap
  nélküli olvasási jog nem rögzíthető;
- **a megadáskor is ellenőrizzük a plafont**: tágabbat adni, mint amit a határozat enged, nem lehet;
- **két időtengelyen áll** (mikortól hatályos · mikor szereztünk róla tudomást), mint minden más
  jogváltozás a rendszerben;
- **megvonható** — a sor megmarad, időpontot kap.

**A kiadási kapu sorrendje mostantól:** kimondott **tiltás** → a **ténylegesen megadott jog** → a
**határozat mai állapota** → a **tagságra átvitt korlát**. **A plafon csak szűkít; a hiány zár.**

---

## Amit mérve tud a rendszer — kiadva → zárva különbségként

| helyzet | eredmény |
|---|---|
| tag, **semmilyen** adatköri engedély nélkül | **elutasítva** — még a tiszta készlet-eredmény sem jön ki |
| **tág** határozat alatt **szűken** megadott jog (csak készlet), vegyes eredmény | **elutasítva** |
| ugyanő, **hamis címkével** vagy **címke nélkül** | **elutasítva** — a címke nem növel jogot |
| ugyanő, tiszta készlet-eredmény | **kiadva** |
| valóban **mindkét** adatkörre megadott jog, vegyes eredmény | **kiadva** ← az ellenpár: a kapu nem fal |
| jogosult olvasó, de kimondott **tiltás** az árra | **elutasítva** — a tiszta készlet **továbbra is kijön** |
| a **jog megvonása** után ugyanaz az olvasás | **kiadva → zárva** |
| a **határozat megvonása / lejárata** után | **kiadva → zárva** |
| az elutasítás és a **nem létező** hivatkozás válasza | **bájtra azonos** |
| a döntés és a **kiadási leltár** időpontja | **ugyanaz az egy pont**; engedély nélküli olvasónak leltár-sor **nem születik** |

**Visszabontások** (mind bizonyítottan pirosra viszi a nevezett állítást): **M177** — a kapu átlépi a
megadott jog ellenőrzését (engedély nélküli kiadás) · **M178** — a kérő címkéje dönt a tartalom
helyett · **M179** — a jog túléli a megvont/lejárt alapot · **M180** — a tiltás ága sosem fut ·
**M181** — a **jogos kiadás téves tiltása** · **M182** — az elutasítás sikeres kiadást könyvel.

---

## A próba-világok VALÓDI jogot kaptak

A szigorítás után **hét próba** állt piroson — pontosan azok, amelyek eredményt olvasnak. Egyiket sem
„kapcsoltam ki": mindegyik világ a rendszer **saját íróján** kapott adatköri jogot, alappal és két
időtengellyel. Így maradt mérhető külön a **könyv-kapu** (tagság) és az **adatköri kapu** (engedély)
állítása — ahogy az R49 kikötötte.

---

## Mutáció-pontosítás — a leírás nem lehet erősebb a futásnál

Az **M179** korábbi leírása („a megvont alap tovább nyit") **erősebb volt a mért hatásnál**: az
R48-as alakban a kihagyás csak az **indokot** cserélte, a kiadás továbbra is zárt — ezt ők mérték ki,
és igazuk van. Mostantól a jog a **megadásból** jön, ezért ugyanez a kihagyás **valódi kiadást**
eredményez egy megvont alapon, és a próba ezt **kiadva→zárva** különbségként méri.

Az **M177** horgonya a feltételről a **visszatérő értékre** került: a feltétel kiiktatása nyers
programhibába futott, ami más réteg védelme, nem az állítás bukása.

---

## Ami kimondottan nyitva marad

- **A meghívó `scope` mezője mérve a meghívó-KIADÁS tengelye**, nem olvasási jog. Ezért a beváltás ma
  **nem ad** adatköri olvasási jogot. Hogy a meghívó hordozzon-e felajánlott olvasási adatköröket,
  **üzleti döntés** — gép nem vezetheti le.
- **Két szótár él:** az olvasási jog csak a tartalom **zárt** adatkör-neveire adható meg; az
  ismeretlen szótárú **plafon zár**. Néma fordítás nincs.
- A **mezővetítés** hiánya továbbra is a klauzula **saját feltétele**, nem adósság: a vegyes
  eredményt egészben tagadjuk meg.

---

## Mérések — elkülönítve, ahogy az R49 kérte

### (A) SAJÁT FUTÁS — ebben a környezetben, ebben a körben

**A mért forrás, pontosan.** Minden alábbi szám ugyanarra az állapotra vonatkozik: commit
**`df6bff48b96cd44c71977070bfc656e0bd2ec3b5`**, a magreferencia könyvtára nem-könyvelt változás
nélkül (`clean: true`), tartalmi lenyomat
**`sha256:d64628f2022e6d475466aff51847b3bad93ea122754271da99174655f085f626`**.

| mit futtattam | eredmény |
|---|---|
| F49-01 és F49-02 reprodukciója a javítás ELŐTT | **mindkettőn kiment az ár** (`unit_price: 12345`) |
| ugyanaz a mérés a javítás UTÁN | **mindkettő elutasítva**, nevezett indokkal |
| `node v3ref/run.mjs` | **59/59 PASS** |
| `npm run verify:v3ref` | **179 mutáció · 179 elkapva · 0 túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony** |
| norma-lánc | **113 sor** — 77 fedett · 26 részben · **2** nem falszifikált · 8 bizonyíték nélkül |
| `node tools/v3_norm_chain_package.mjs` | **kiadva** |
| `npm run proof:norm-chain-package` | **25/25 RENDBEN** |
| `npm run verify:kuka` | **303/303 PASS** |
| `npm run verify:decision-numbers` | **4/4 PASS** · következő szabad: D-VS-3059 |
| `npm run verify:sweep` — a TELJES söprés | **11 verifier · 10 zöld · 1 PIROS** (653 mp) — a piros a `verify:external-checks`, lásd lent |
| `npm run verify:external-checks` | **15/19 MEGFELEL · 2 nevezett környezeti kihagyás · 2 program ELTÉR** (`r81core` · `r79core`) |

### (B) ÁTVETT MÉRÉS — amit NEM én futtattam

Az R49-es lapjukon szereplő saját futásuk (Node v24.19.0): 59/59 alappróba · 25/25 csomag-ellenpróba
· EXD-02 36/36 · M177–M182 külön másolatokon · a teljes meghívási/beváltási/olvasási futás, amiből az
F49-01 és F49-02 származik · az első beadás és az ismétlés külön mérése. **Ezt átvettem, nem
ellenőriztem újra.**

### (C) DOKUMENTUM-ÁLLÍTÁS — ami lapon áll, nem futásból

A K05-DSC-c **részleges** marad, és a „referenciában elfogadva" klauzulák száma **nem nő** — ez az ő
döntésük. Az elfogadás az ő feladatuk; tartalmi elfogadást magamnak nem adok.

---

## A SÖPRÉS PIROS — és ezt nem kerülöm meg

A szigorítás **három pozitív ellenőrzést** buktatott meg a külső fél SAJÁT, változatlanul futtatott
programjaiban:

| program | eset | mért ok |
|---|---|---|
| `r79core` | `P01-flat-quantity` | `not_available` — a program világában a tag olvas, de **nincs adatköri engedélye** |
| `r81core` | `core/P01-pure-lines` | ugyanaz |
| `r81core` | `core/F04-release-time-before` | ugyanaz (`assert(r.ok)` bukik) |

**Mit jelent ez, és mit NEM.** Ezek a programok a saját világukat nyers tagsági sorral építik, és a
pozitív kontrolljuk arra épült, hogy **a tagság önmagában elég az olvasáshoz**. Pontosan ezt az
előfeltevést szüntette meg az R49-ben elrendelt szigorítás. Tehát ez **az elrendelt változás
egyenes következménye**, nem újonnan bevitt hiba — és a három eset egyike sem a mi állításunkat
dönti meg, hanem a régi engedély-modellt.

**Amit NEM tettem:** nem nyúltam a programjaikhoz (a forrásuk az övék, karakterre), és nem
gyengítettem a kaput azért, hogy zöld legyen. Nem is minősítettem át „elavult elvárásnak" a
bizonyítékukat — **az a döntés az Önöké**. A söprés ezért PIROS marad, és a lap ezzel együtt megy ki.

**Amire választ kérek:** vagy a három pozitív kontroll kap kimondott adatköri engedélyt (az Önök
szerzősége), vagy — ha a szigorítás túl tágra sikerült — mondják ki, melyik körre kell szűkíteni.
Én egyiket sem döntöm el egyoldalúan.

---

## Amit ez a kör NEM tett meg

- **Nem** találtam ki üzleti szerepkört, és **nem** adtam alapértelmezett „alapadatkört" senkinek.
- **Nem** fordítottam le némán a régi (`stock` · `price`) neveket, és **nem** írtam át történeti
  nyers értéket.
- **Nem** épült HTTP-adapter, felület, mezővetítés vagy új üzleti modul.
- **Nem** nyitottam újra az R42-es összesítő-javítást és az R45/R46-os történetmegőrzési csomagot.
- **Nem** történt merge, telepítés, V2-módosítás.
