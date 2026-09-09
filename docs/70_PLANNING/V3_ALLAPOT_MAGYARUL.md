# Hol tartunk — magyarul, érthetően

Claude-AUX · 2026-09-09 · CMD-VS-300-002-001 R44 — STATUS
Címzett: **az operátor**. Ez a lap NEM a külső félnek szól, és szándékosan rövid.

---

## 1. A négy kérdésed

### „Mi az, hogy mehet a 2. pont? Ezzel nem kell megvárni a ChatGPT-t?"

**Nem kell megvárni.** A külső fél a legutóbbi levelében maga adott egy **sorrendbe rakott
munkalistát** (1–5. pont), és külön kimondta: *„Az implementáció gazdája Claude-AUX… Az operátornak
most nincs eldöntendő kérdése."*

Tehát a munkamegosztás ez:

| Ki | Mit csinál |
|---|---|
| **Claude-AUX (én)** | megépíti / javítja |
| **ChatGPT** | UTÁNA független ellenőrzést ír rá |
| **Te** | továbbítod a lapokat — nem tesztelsz, nem döntesz jogmodellről |

Az 1. pontot (a mérőműszer hibáját) az előző körben lezártam. A **2. pont** a következő, és arra
nem kell engedély: a hibák meg vannak nevezve, és mindegyikhez oda van írva, mi a helyes viselkedés.
Ha megvárnám a választ, csak állnék.

### „Mi az, hogy Q01–Q16? Az is mehet a ChatGPT nélkül?"

A `Q` betű **nem a mi szóhasználatunk** — a külső fél így számozta be azt a **18 esetet**, amit
a saját, előre leírt elvárásaival lefuttatott a mi kódunkon. Mind a 18 **eltérést** mutatott.
Nem 18 egyforma súlyú hiba, de mind valódi.

| Csoport | Miről szól, magyarul |
|---|---|
| **Q01–Q08** | **A parancs és a joghatár.** Pl.: Bob csak a B cég könyvében tag, mégis megkapja az A cégben született tétel azonosítóját. Vagy: egy tétel mennyisége 1-ről 999-re változik, és a rendszer ugyanannak a kérésnek látja. |
| **Q09–Q13** | **A meghívás tényleg befejeződik-e.** Pl.: a rendszer „sikert" jelent, közben nem születik fiók, tehát az illető nem tud belépni. Vagy: félbeszakad az utolsó írás, és marad egy féllábon álló jogosultság. |
| **Q14–Q15** | **Adatkiadás.** Pl.: ugyanazt az eredményt kétszer elolvasva a rendszer hibára fut. |
| **Q16–Q17** | **A SAJÁT őreim**, amiket egy körrel korábban én írtam, és **hamis biztonságot** állítottak (pl. egy tábla-ürítést „biztonságos bővítésnek" minősítettek). |
| **Q18** | **Maga a mérőműszer.** Ez volt a legsúlyosabb: a mérő „minden rendben"-t írt ki akkor is, amikor **egyetlen próba sem futott le**. |

**JAVÍTVA (R45 · 2026-09-09):** a fenti táblázat első alakja azt mondta, hogy „a Q16, Q17 és Q18
már kész". **Ez az általános alakban nem volt tartható**, és a külső fél megcáfolta:

- **Q18** — az EREDETI összeomlási alak javult, de a mérőnek ÖT MÁSIK hazugság-alakja maradt
  (H02–H06). Mind reprodukált. Azóta mind a hat ellenpróba a mérő ÁLLANDÓ kapuja.
- **Q16** — az osztályozó javult, de a TELJES kiadási őr átengedte: csak a `contract` csoport
  elutasítását nézte, tehát egy `TRUNCATE TABLE partner` mellett 27/27 PASS-t írt ki. Javítva.
- **Q17** — a névvalidáció javult; az azonos nevű tényleges írás ütközésvédelme **rögzített
  függő** az első valódi íróig, nem lezárás.

**A Q01–Q15 ezután jön**, és igen: ez is mehet ChatGPT nélkül, mert minden esethez oda van írva,
mi a hiba és mi a helyes válasz.

### „A PITR engedélyezve van a Railway / valach-family / valach-system-ben"

**Köszönöm — ezzel a repó-terv mindhárom kérdése le van zárva** (név · három környezet · PITR).
Naplózva: **D-VS-3003**.

Amit ez a gyakorlatban jelent:

- **Elvben másodpercek, nem egy nap** — PITR nélkül az utolsó mentésig esnénk vissza (akár 24 óra).
  **DE ez a szolgáltatás LEÍRT képessége, nem mért garancia** (R45): vállalássá csak ellenőrzött
  szolgáltatási feltételekkel ÉS egy lefuttatott visszaállítási próbával válik.
- **A visszaállítás nem állítja le az élest.** A Railway az eredeti MELLÉ épít egy új adatbázist —
  megnézzük, és utána döntünk, mit másolunk vissza.
- **De ez nem mentesít a fegyelem alól.** A rossz kiadást továbbra sem adatbázis-visszaállítással
  javítjuk, hanem a **kód visszagörgetésével** — a visszaállítás elveszítené a közben született
  valódi munkát is. A PITR a végső háló, nem az első eszköz.
- **És a nem próbált mentés nem mentés.** A visszaállítást ütemezetten gyakorolni kell; ezt az első
  éles adat előtt beütemezem.

---

## 2. Mi a „core-core"? — egy bekezdésben

Nem modul, hanem az a **hét gépezet**, amire MINDEN modul rá fog ülni. Ha ezek közül egy később
megváltozik, minden fölé épített modult újra kell írni — ezért megy ez ilyen lassan és ilyen
körülményesen.

| # | Gépezet | Magyarul |
|---|---|---|
| 1 | **Azonosság** | ki ez az ember, és melyik tere az övé |
| 2 | **Könyv / tér** | melyik cég könyvében mozdul egy sor |
| 3 | **Jog** | ki mit csinálhat, melyik könyvben, milyen alapon |
| 4 | **Parancs → hatás** | egy kérés **pontosan egy** hatást könyvel — akkor is, ha kétszer érkezik |
| 5 | **Meghívás** | a tagság EGYETLEN születési útja |
| 6 | **Adatkiadás** | ki mit láthat, a MAI jogán, nyomot hagyva |
| 7 | **Idő** | mi számít friss bizonyítéknak, mi járt le |

Ehhez jön még kettő, ami már félig a modulok felé néz: **egyeztetés/behozatal** (két rendszer
ugyanazt a szállítást jelzi → egy hatás) és **nyitóállomány**.

---

## 3. Mi van meg MA — mérve, nem emlékezetből

| Mi | Állapot |
|---|---|
| **A V3 repó megnyitva** (`valach-family/valach-system`) | ✔ él, 6 commit |
| **Verzió- és kiadás-rend** (v3.1 · v3.1.2 · v4 egymás mellett) | ✔ leírva + gépi őr |
| **Három környezet** (éles · teszt · demo mint cégtér a tesztben) | ✔ eldöntve, még nincs felállítva |
| **Visszaállítási rend + PITR** | ✔ leírva, PITR bekapcsolva |
| **A 89 tanulság (KUKA) átemelve** | ✔ és mindegyiknél KIMONDVA, hol él az őre: **4 a V3-ban · 83 a V2-ben · 2-nek nincs** |
| **A generált fájlok neve és helye** (`v3_v3.1.1_20260909_104201_…`) | ✔ gépi őrrel |
| **Működő mag-referencia** (`v3ref/`) | ✔ fut ELKÜLÖNÍTETT SQLite-tárolón: 6 próba + 10 mutáció |
| **A mérőműszer önpróbája** | ✔ minden futásnál elvégzi magán a külső fél HAT támadását (R45 H02–H06 + Q18) |

**Amit ez a referencia MA tud:** végigvezet egy meghívást, egy jogosultsági döntést és egy parancsot
a hatásig. **Amit NEM tud:** nem ír valódi készlet-főkönyvet, nincs mögötte Postgres, nincs
képernyő. Ez szándékos — a szabályt bizonyítjuk, nem a terméket építjük.

**PONTOSÍTÁS (R45):** korábban azt írtam, hogy „adatbázis nélkül fut". Ez pontatlan volt — a
referencia **elkülönített SQLite-tárolót** használ. A különbség számít: a tranzakciós és
versenyhelyzeti bizonyíték megítéléséhez tudni kell, hogy VAN tároló, csak nem a Postgres.

---

## 4. Mi hiányzik — őszintén

| Sorrend | Munka | Becslés |
|---|---|---|
| **2.** | **Q01–Q15** — a 15 megnevezett maghiba javítása (parancs · jog · meghívás · adatkiadás · idő) | 2–3 kör |
| **3.** | **Egyidejűség és megszakadás** — mi történik, ha ugyanaz a parancs kétszer fut egyszerre, vagy áram alatt szakad meg | 1–2 kör |
| **4.** | **Egyeztetés + nyitóállomány** — 12 előre rögzített üzleti eset (két rendszer ugyanazt a szállítást jelzi; részteljesítés; megszakadt import; nyitókészlet) | 2–3 kör |
| **5.** | A maradék core-esetek (összesítési jog · együttes képviselet · azonosság-korrekció · történet · visszavonás) | 2–3 kör |

**Ez papíron 7–11 kör. De a kör-szám NEM a jó mérce, és nem is ígérem be** — a legutóbbi kör
egyetlen felülvizsgálata 18 új leletet hozott. Ha a következő is ennyit hoz, a szám nem ér semmit.

### A helyes mérce — ezt javaslom

> **A core-core akkor van kész, amikor egy független ellenőrző kör már NEM talál maghibát**,
> csak hatókör- és profil-megjegyzést.

**PONTOSÍTVA (R45):** ez önmagában NEM elég lezárási feltétel, és igazuk van. Kell mellé: előre
rögzített teljes vállalt lefedettség · megfelelő negatív kontroll · valódi futási bizonyíték ·
megszakítási/versenyhelyzeti mérés · és a G1–G8 kapuk tételes állapota. A „most nem találtunk új
hibát" ezek MELLETT kiegészítő eredmény, nem helyettük.

**Ma nem tartunk itt:** a legutóbbi kör 15 nyitott maghibát adott, plusz öt mérőhibát (javítva).

### És mikortól mehet a mini modulok tervezése?

Az első alakomban azt írtam: „a 4. pont után". **A külső fél ezt megcáfolta, és elfogadom** —
az 5. pontban maradó esetek (összesítési jog · együttes képviselet · azonosság-korrekció · történet ·
visszavonás) **a mag HATÁRÁT érintik**, nem finomítások. Bizonyítás nélkül nem minősíthetem őket
annak. A jogosultságot megjelenítő felület sem független ezektől.

**A valós sorrend tehát: a 2–5. pont MIND kell**, és utána indul a modul-tervezés.

### Ami NINCS blokkolva

**A felület és az UX tervezése nem függ ettől.** A képernyő-elrendezés a magtól független munka —
ha akarod, az a szálon párhuzamosan mehet, és nem kell megvárnia semmit. Ezt te döntöd el.

---

## 5. A te becslésed és az enyém

| Amit írtál | Egyetértek? | Pontosítás |
|---|---|---|
| „a V3 core-core teljesen új alapokon" | **Igen** | A V2 azonosság-/jogosultság-modellje nem jön át. Ami átjön: a **folyamat-doktrína** (tulajdonos-könyv modell), a **89 tanulság**, és a kiadási/elnevezési fegyelem. |
| „talán a folyamatokból marad valami" | **Igen** | Ez a legerősebb V2-örökség — pont ezt nem kell újragondolni. |
| „mini modulok nagy vonalak 50–70%" | **Egyetértek** | Újra kell nézni őket a rögzített mag-felülethez mérve, de nem nulláról. |
| „UX, felület elrendezés 80–90%" | **Egyetértek** | És ez az, ami nincs blokkolva (lásd fent). |

---

## 6. „Lesz új döntési napló a V3-hoz?"

**Már van, és pontosan azért, amit írsz.**

- A V3 naplója a **700-as számtól** indul, az új repóban. Ma három bejegyzés van benne
  (D-VS-3000 · 701 · 702), plusz a mai (703). **Semmit nem másoltam át.**
- A V2 naplója a **700 alatt** marad. A két repó így egyszerre oszthat számot ütközés nélkül —
  gépi őr figyeli.
- A V3 napló első bekezdése kimondja, hogy a 700 előtti döntések a V2 repóban élnek, és
  **szándékosan nincsenek átmásolva** (két másolat előbb-utóbb elcsúszik egymástól).

**Ami átjön, az nem a döntés, hanem a TANULSÁG** — a 89 KUKA-bejegyzés. És nem sejtésre: mindegyik
mellé oda van írva, hogy az őre a V3-ban fut-e, a V2-ben marad-e, vagy még megépítendő. Ma:
**4 · 83 · 2**. Ez azért fontos, mert enélkül mind a 89 zöldnek látszana a V3-ban, holott a
többségük őre V2-fájlokra mutat.

---

## 7. Egy hiba, amit MOST találtam — és ami pont téged érintett

Miközben ezt a lapot készítettem, lefuttattam az olvasható változatot előállító parancsot
(`npm run docs:html`). Ez jött ki:

> **0 lap elkészült** — és „sikeresen" zárt.

Vagyis a V3 repó megnyitása óta ez a parancs **egyetlen olvasható lapot sem** készített, miközben
azt mondta magáról, hogy rendben van. **Pont az a parancs, ami a te olvasható változatodat gyártja.**

Az ok egy elgépelt kapcsoló a beállításban (`--all` a `--mind` helyett), amit én írtam bele
emlékezetből a repó megnyitásakor. Az őr azért volt zöld, mert azt nézte, hogy a parancs **hivatkozik-e**
az eszközre — azt nem, hogy **készít-e lapot**.

**Javítva, három ponton:** a kapcsoló-lista most magától az eszköztől jön (nem gépelem le) · több
írásmódot is elfogad · és **a nulla lap innentől PIROS**, olyan mondattal, ami megmondja a helyes
hívást. Az őr mostantól tényleg **lefuttatja** a parancsot és lapokat követel; visszaállítva a régi
alakot, bizonyítottan pirosra vált. Naplózva: **D-VS-3004**.

Azért írom ide, mert ez pontosan az a hibafajta, ami miatt a mag ilyen lassan halad: **egy darab
külön-külön hibátlan volt, csak a kettő KAPCSOLATA volt halott** — és ezt semmi nem jelezte.

---

## 8. Egy tény, ami rád tartozik

A külső fél a legutóbbi levele végén ezt írta: *„A repóhoz és a boardhoz ebben a beszélgetésben
hozzáférek."* Ez ellentmond annak, amit korábban mondtál (hogy nem tud írni-olvasni a boardon).

**Ha tényleg hozzáfér, akkor neked nem kell futárnak lenned** a lapokkal. Nem változtatok a mai
renden a te szavad nélkül — csak jelzem, mert időt spórolna neked. Ha megerősíted, a következő
körtől a lapok mennek a boardra, és nem kell átmásolnod őket.

---

*Gépi jelek ezen az állapoton: `npm run verify:sweep` 6/6 zöld · `npm run verify:v3ref` (két kapu +
10 mutáció) · `npm run verify:kuka` (89 tanulság, mind otthonnal). Napló: D-VS-3003.*
