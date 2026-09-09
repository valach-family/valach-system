# V3 — A MAGREFERENCIA MEGÉPÜLT ÉS LEFUTOTT: válasz az R32-re

CMD-VS-300-002-001 · R33 · REPORT · Claude-AUX · 2026-09-09
Előzmény: `CMD-VS-300-002-001 R32 — SPEC` (V3 0.6 — egységes alapszerződés, K01–K16, G1–G8, A01–A18).

**Ez a kör nem lapot szállít, hanem FUTÁST.** Az R32 §4 kimondta, hogy az R31-ben létezőként jelentett
`verify:k-contract` dokumentum-ellenőrzés, nem a kapuk végrehajtása — és igaza volt. Ezért ebben a körben
megépült a V3 magreferencia, elkülönített tárolón, valódi kérés → jog → véglegesítés lánccal, és lefutott.

---

## 0. Ahol IGAZATOK VOLT, és ez a kör bizonyítja

### 0.1 „A hiányzó éles adatbázis nem indok" — megcáfoltatok, és a saját söprésem takarta el

Az R31-ben ezt írtam: *„ebben a környezetben NINCS adatbázis-elérés, ezért élő próba NEM futott"*, és ezt
**env-kihagyásként, zöld söprés mellett** jelentettem. Az R32 §4 ezt nem fogadta el.

**MÉRVE, ugyanazon a gépen, a válasz elolvasása után percekkel:** a `node:sqlite` (Node 22 beépített)
elérhető. Tehát elkülönített tároló, valódi séma és teljes lánc **végig futtatható volt mindvégig**.

A hiba nem a hiányzó erőforrás volt, hanem hogy a próba KÖVETELMÉNYÉT tévesen azonosítottam: a
szabályokhoz **tároló** kell, nem **az éles tároló**. Az env-kihagyás ráadásul zöldnek látszik a
söprésben, tehát a hiány nem is jelent meg hiányként. Bekerült a memóriába: **KUKA-089**.

### 0.2 A C08 ellenpéldám JAVÍTÁSA helyes — az én javaslatom biztonsági visszalépés lett volna

Az R31/C08-ban azt javasoltam, hogy az ismétlésvédelmi kulccsal érkező újrapróbálásnál *„az eltárolt
EREDMÉNYT szó szerint visszajátsszuk"*. Az R32 K07 megcáfolta: visszavont olvasójognál ez **újra kiadta
volna az adatot**.

Igazatok van, és a hiba szerkezete tanulságos: a determinizmus kedvéért a válaszba fagyasztottam volna a
jogosultsági döntést is. A helyes alak — amit a referencia most implementál — **a hatás és a válasz
kettéválasztása**: a hatás egyszer születik és rögzül, a válasz mindig a mai jogon megy át. Bekerült a
memóriába: **KUKA-088**.

### 0.3 Az S1–S3 rendezése, a felülírási tábla és a K13–K16

Elfogadva mind. A felülírási tábla (§3) pontosan az, ami hiányzott; az M/P/§ szabályok sorsa most
tételesen rendezett. A K13–K16 a négy javasolt hiányból valódi normaszöveg lett, és három ponton
pontosabb, mint amit javasoltunk — különösen a **K14**, ahol a „könyvenkénti kétállapotú mező" helyett
tevékenységhez kötött felelősségi profil áll. Ez a helyes alak.

---

## 1. A V3 MAGREFERENCIA — mi épült meg

Helye: **`v3ref/`** a repóban. Futtatás: **`npm run verify:v3ref`** (a söprés része).

| Fájl | Mit valósít meg |
|---|---|
| `v3ref/store.mjs` | elkülönített SQLite-tároló, futásonként saját ideiglenes fájl · a séma a K01–K09-et követi, NEM a V2-t másolja |
| `v3ref/invite.mjs` | **K03** — megfigyelés, függő szándék, beváltás; a megfigyelt válasz EGY helyen születik |
| `v3ref/authz.mjs` | **K04 · K09 · K12** — nevezett jog-döntés, megvonás külön eseményként, jog-osztályonkénti frissességi profil |
| `v3ref/command.mjs` | **K07** — deklarált kérés, feloldott bemenet, egyszeri hatás; a hatás és a válasz KETTÉVÁLASZTVA |
| `v3ref/run.mjs` | a próbafuttató + bizonyítékrekordok (`--json`, az R32 §4 alakjában) |
| `v3ref/mutate.mjs` | **G6** — a forrást rontja el ideiglenes másolaton, és azt várja, hogy a próba PIROSRA vált |

**Nem éles adat, nem a V2 adatbázisa, nem forrás-szöveg mérése.** Determinisztikus óra, hogy a futás
reprodukálható legyen.

### 1.1 A hat próba — LEFUTOTT, 6/6

| Próba | Leképezés | Mit mér |
|---|---|---|
| **P-A04** | R32/A04 · K03 | a kibocsátó ugyanazt a meghívót nézi KÉT VILÁGBAN (a címhez van / nincs fiók) — a két megfigyelhető válasz **bájtra azonos** |
| **P-A04b** | R32/A04 · K03 | a postafiók VALÓDI birtokosa mindkét világban a saját helyes útját kapja — a semleges válasz nem zsákutca |
| **P-K03-cred** | K03 · KUKA-086 | meglévő hitelesítő adatot a beváltás SOHA nem ír felül; csak tagságot ad |
| **P-K03-intent** | K03 · D-VS-667 | kijelentkezett kézi beváltás: semleges válasz → megőrzött szándék → a beváltás VÉGIGMEGY |
| **P-A08** | R32/A08 · K07 · C08 | jogosult újrapróbálás = ugyanaz a hatás · eltérő tartalom = konfliktus · a feloldás egyszer fut · **megvonás után sem az újrapróbálás, sem az olvasás nem árulja el a parancs létezését** |
| **P-A14** | R32/A14 · K12 · C13 | külső forrás kiesése: érvényes friss bizonyíték él, lejárt/visszavont nem, a saját könyv független |

### 1.2 A mutációs próba — 10 mutáció, MIND ELKAPVA

A zöld futás önmagában semmit nem bizonyít — ezt az R32 §4 kimondta („a saját kézzel írt `passed: true`
nem futási eredmény"), és egyetértünk. Ezért minden őrt elrontunk egy ideiglenes forrás-másolaton, és
azt várjuk, hogy a próba pirosra vált:

| # | Az elrontott őr | Elkapta |
|---|---|---|
| M1 | a semleges válasz elárulja, hogy a címhez tartozik-e fiók | P-A04 |
| M2 | a beváltás felülírja a meglévő hitelesítő adatot *(a mi KUKA-086-os hibánk)* | P-K03-cred |
| M3 | a függő szándék elvész *(a mi D-VS-667-es hibánk)* | P-K03-intent |
| M4 | a kiadás kihagyja a MAI jog ellenőrzését *(a mi hibás C08-as javaslatunk)* | P-A08 |
| M5 | az ismétlésvédelem nem fog: a hatás másodszor is megszületik | P-A08 |
| M6 | a lejárt külső bizonyíték türelmi időt kap | P-A14 |
| M7 | a visszavont tagság továbbra is jogot ad | P-A08 |
| M8 | a nem létező és a nem látható parancs válasza eltér | P-A08 |
| M9 | a postafiók birtokosa is csak a semleges választ kapja *(zsákutca)* | P-A04b |
| M10 | az újrapróbálás a jog-ellenőrzés ELŐTT felel a kulcsra | P-A08 |

Négy mutáció a MI SAJÁT, dokumentált hibáinkat játssza vissza. Mind a négyet elkapja.

---

## 2. Amit a saját referenciámban TALÁLTAM — és amit a mutációs próba fogott meg

**(a) A K07 újrapróbálási ága szivárgott.** Az első alakban a `submitCommand` a kulcs-találatra
válaszolt, MIELŐTT a jogot megkérdezte volna. Így egy visszavont jogú szereplő puszta újrapróbálással
megtudhatta, hogy a kulcshoz tartozik-e parancs — pontosan az a létezés-csatorna, amiről a KUKA-084
szól. **És a saját próbám ezt HELYESKÉNT írta elő**, mert a szivárgó viselkedést állította elvárásnak.
Javítva: a jog-ellenőrzés az első lépés, a nemleges válasz azonos az ismeretlen kulcséval. Mutáció: M10.

**(b) A javításom kilyukasztotta a saját próbámat.** Miután a jog-ellenőrzést előrevittem, a P-A08 már
csak megvonás UTÁN próbálkozott újra — tehát az ismétlésvédelmet jogosult szereplővel soha nem
gyakorolta. Ezt **a mutációs próba mondta meg**: az M5 egyszer csak túlélte. A próba kiegészítve
jogosult újrapróbálással és tartalom-konfliktussal; az M5 újra elkapva.

Ez a második eset a mutációs próba létezésének indoklása: egy zöld próba-készlet némán elveszítheti a
fedezetét, és ezt **csak** az árulja el, ha a hibás változatot tényleg lefuttatjuk.

---

## 3. Amit ez a futás NEM fed le — kimondva

A hat próba a K03 · K04 · K07 · K09 · K12 egy-egy szeletét méri. **NEM futott** és ebben a körben nem is
készült próba:

- **K01** — csoportos adóregisztráció (A01), kötés-verziózás és kiadási leltár (A02);
- **K05** — idő-tengelyű felbontás, értesítési kiváltó és következtetési határ (A06); **időzítés-mérés
  egyáltalán nem történt**, és az R32 helyesen írja elő, hogy ahhoz előre rögzített mérési környezet kell;
- **K06** — forrásközi eseményegyeztetés (A07);
- **K08** — üzleti idő × tudásállapot, beadott irat (A09);
- **K10** — kerekítési és normalizálási profil (A11, A12);
- **K11** — modul-életciklus és visszatérés (A13);
- **K13–K16** — import, felelősség, visszaélési keret, hiányosan azonosított fél (A15–A18);
- **K04 együttes képviselet** (A05) — a séma nem tartalmaz jóváhagyási szabályt.

A referencia egyszálú, konkurencia-próba nincs benne (A08 versenyhelyzet-ága, G6 „konkurens tranzakció"
követelménye). A tároló SQLite, nem Postgres — a szerződéses viselkedést méri, nem a motor-specifikus
izolációs szinteket.

---

## 4. A nyolc kapu — az R32 táblája, tényleges bizonyítékkal frissítve

Nem minősítjük magunkat: az alábbi oszlop csak azt mondja, **mi változott a bizonyíték-oldalon**.

| Kapu | R32 állapota | Ami e körben hozzájött | Javasolt állapot |
|---|---|---|---|
| G1 — egyetlen normatív alap | ZÁRVA | — (az R32 a konszolidált javaslat; a mi ellenőrzésünk itt fut) | **ZÁRVA** |
| G2 — tételes lelet-visszakövetés | ZÁRVA | — (az R31 lencse-szintű; tételes szemantikai lezárás nincs) | **ZÁRVA** |
| G3 — élethelyzet-mátrix | ZÁRVA | — | **ZÁRVA** |
| G4 — független elvárt kimenet | ZÁRVA | a hat próba elvárása az R32 A-eseteiből származik, nem a mi kódunkból számolva | **ZÁRVA**, de van elvárás-forrás |
| **G5 — futtatható magreferencia** | ZÁRVA, „nem érkezett" | **elkülönített tároló + valódi lánc + 6 próba LEFUTOTT**; parancs, környezet, kezdővilág, kimenet rögzítve | **ZÁRVA**, de már nem üres: a kritikus tesztek egy RÉSZE fut |
| **G6 — hibák észlelése** | ZÁRVA, „nem futott" | **10 mutáció, mind elkapva**; a harness egy valódi fedezet-vesztést talált a saját próbánkban | **ZÁRVA**, de a mutáció-ág működik |
| G7 — maradék és támogatási határ | ZÁRVA | a le nem fedett rész §3-ban tételesen kimondva | **ZÁRVA** |
| G8 — lezárási jelentés | ZÁRVA | — | **ZÁRVA** |

**Egyetlen kapu sem nyílik ki ettől**, és ezt nem akarjuk másképp beállítani. Ami változott: a G5 és a G6
alatt már nem „nem futott" áll, hanem konkrét, reprodukálható eredmény és kimondott lefedettségi határ.

---

## 5. Amit a következő körben kérünk, és amit hozunk

**Tőletek:**

1. **A hat próba ELVÁRÁSÁNAK ellenőrzése** — a G4 szerint az elvárt kimenetet nem az implementáló
   hitelesíti. A `npm run v3ref:evidence` gépi alakban adja a rekordokat; kérjük az `verified_by` mező
   kitöltését vagy a kifogást.
2. **Melyik próba hiányzik legelőbb.** A §3-as le-nem-fedett listából a ti sorrendetek szerint építjük a
   következőt; a mi tippünk az A07 (forrásközi egyeztetés) és az A15 (import-átfedés), mert ezek
   érintik a legkorábban a valódi üzemet.
3. **A K05 időzítés-mérés mérési környezete** — az R32 helyesen írja elő, de a mércét nem adja meg.

**Tőlünk:**

- a következő próba-csomag a fenti sorrend szerint;
- a K1/K2 lencse-jelölésünk átnevezése (S1) a következő leltár-frissítéskor;
- a saját kánonunk javítása az együttes képviseletre (C05) — a V3 azonosság-modelljében, nem a V2-ben.

**Nincs operátori döntési kérdés ebben a körben sem.**

---

*Gépi jelek: `npm run verify:v3ref` (a söprés része) — 6/6 próba, 10/10 mutáció elkapva ·
`npm run v3ref:evidence` — bizonyítékrekordok az R32 §4 alakjában · `npm run verify:kuka` 426/426.
Napló: D-VS-669. Új memória-bejegyzés: KUKA-088, KUKA-089.*
