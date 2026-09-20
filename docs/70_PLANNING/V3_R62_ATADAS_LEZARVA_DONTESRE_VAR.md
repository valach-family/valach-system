# R61 átvezetése — az átadási csomag lezárva, két kérdés az operátornak

> **Sáv:** Claude-v3 · **Kör:** R62 · **Állapot:** lezárt

**Szülő:** CMD-VS-300-002-002 **R61 — ANALYSIS** (chatgpt-v3 → Claude-v3, 2026-09-20).
A külső fél lapja szó szerint mentve: `v3ref/source-documents/R61_board_v1.md`.

---

## Röviden, magyarul — hol tartunk

A külső ellenőrző fél **elfogadta** az előző kör három javítását, és kimondta: az elmúlt négy kör
munkája — a jogadási utak leltára és a hozzá tartozó bizonyítékcsomag — **lezárható**.

A lapjuk saját szavával **„ellenőrzési dokumentum, nem új végrehajtási parancs"**: nem adtak új
fejlesztési feladatot, és **új blokkoló technikai hibát sem találtak**.

**Ezért ebben a körben nem fejlesztés történt, hanem átadás.** Amit csináltam: átvezettem az
elfogadást, kijavítottam két hamis mondatot a saját forrásomban, és **előkészítettem két kérdést,
amire csak az operátor tud válaszolni.**

> **A lényeg egy mondatban:** a technikai munka ezen a szakaszon áll, a következő lépés **üzleti
> döntés** — nem újabb kör kódolás.

---

## 1. Mi zárult le — és mi nem

**LEZÁRT:** az R57–R60 leltár- és átadási csomag. A jogadási utak táblája, az őr szűkített és
ellenpéldával mért állítása, és a friss, forráshoz kötött normaösszesítő.

**VÁLTOZATLAN, és ezt a külső fél is megismételte:**

| állítás | mai érték |
|---|---|
| elfogadott EGÉSZ klauzulák száma | **16** — nem nőtt |
| részleges / nyitott | **13** — *ez nem készültségi százalék* |
| ORG-N1a / ORG-N1b egésze | **részleges** |
| req-5 · core-core lezárás | **nincs** |
| a mai kód hibamentessége minden jövőbeli használatra | **nem állítva** |

---

## 2. A két hamis mondat a saját forrásomban — javítva

A külső fél megnevezte őket, és kifejezetten **nem** indított miattuk javítókört. Mégis kijavítottam:
hamis állítás nem maradhat a kódban, akkor sem, ha senki nem kéri számon.

**(a) „minden itt deklarált próba TÉNYLEG fut"** — nem igaz. Az őr a **deklarációt** keresi a
forrásszövegben; a próbákat nem futtatja le. Azt a `verify:v3ref` méri. Javítva.

**(b) „ez az EGYETLEN út, ahol az alap nem opció"** — túl erős volt: a meghívó-kiadó is követeli az
alapot.

**És a javítás közben megmértem, mi a VALÓDI különbség** — ez maradt a lapon a törölt állítás
helyén:

| út | mi történik NYERS írással (a nevezett függvényt megkerülve) |
|---|---|
| **adatköri jogadás** | **elakad a sémán** — `NOT NULL constraint failed: scope_grant.basis_id`. Alap nélküli adatköri jog **egyáltalán nem keletkezhet** |
| **meghívó** | a nyers `INSERT INTO invite` **átmegy**, és a beváltás az ilyet elfogadja |

A különbség tehát **nem a függvény szigora, hanem a kapu helye**: az egyiknél a séma is véd, a
másiknál csak a függvény.

**Új tanulság-bejegyzést nem vettem fel, és ezt kimondom:** mindkét maradvány a már meglévő
KUKA-197 (az állítás többet mond, mint a mérés) és KUKA-050 (a szöveg a valóságot követi) esete —
nem új hiba-osztály. Közel azonos bejegyzést felvenni hígítaná a regisztert.

---

## 3. A két kérdés, amire az operátor válasza kell

Mindkettő **üzleti döntés**, nem technikai. A kód mindkét irányt el tudja vinni; azt kell eldönteni,
**melyiket akarjuk.**

### Döntés A — kell-e felhatalmazó alap az ÚJ jogadásokhoz?

**Miről van szó, hétköznapi nyelven.** Amikor valaki jogot kap a rendszerben, ma két helyen
**nem kötelező** megmondani, **minek alapján** kapja:

| hol | mi a helyzet ma (mérve) |
|---|---|
| **bírálati jogosultság** adása | a nevezett függvény **engedi** alap nélkül |
| **pecsét nélküli meghívó** beváltása | a beváltás **átengedi**, és kiírja, hogy nem volt alap |
| adatköri jogosultság adása | **nem érintett** — ott az alap már ma is feltétel |

**A külső fél ajánlása: igen, legyen kötelező.** És külön kiemelték: **ez nem jelent feltöltött,
formális okiratot** — a rendszer egy **rögzített felhatalmazási eseményt** kér (ki, mikor, mire
hatalmazott fel), nem egy beszkennelt papírt.

**Amit külön rendezni kell, ha az „igen" a válasz:** a **legelső** jogosultság esete — amikor még
nincs mire hivatkozni. Erre a rendszernek külön szabály kell.

**Amit NEM állítok:** hogy ez kis munka. A legelső jogosultság szabálya, a meglévő sorok kezelése és
az érintett hívók átnézése **nincs felmérve** — a méretet a felmérés után tudom megmondani.

### Döntés B — mi legyen a már meglévő, alap nélküli bejegyzésekkel?

**Miről van szó.** Ha az A-ra „igen" a válasz, marad a kérdés: azokkal mi legyen, amik **már most is
alap nélkül állnak**?

| lehetőség | következménye |
|---|---|
| **a történetet megőrizni, a jövőbeli használatot külön szabályozni** *(a külső fél ajánlása)* | a múlt sértetlen marad, de kimondjuk, mire használható még és mire nem |
| visszamenőleg érvényteleníteni | a múlt átíródik — ezt **nem** javaslom |

**Amit NEM állítok, és ez fontos:** hogy ma éles rendszer-jogok migrációjáról döntünk. **Ilyen jogok
nincsenek** — ez a referencia szintetikus, próba-adatokkal. Éles határnapot és valós üzemi
fennakadást **nem** állítunk tényként; ez a szabály arra az esetre készül, amikor egyszer lesz éles
adat.

---

## 4. A kör gépi bizonyítéka

| mit | érték |
|---|---|
| forrás-lenyomat (ma mérve) | `sha256:8a872bf5490bc4ee4b941b6b3e998f952909090e60e92ec0c763662722bcecd4` |
| magpróbák | 61/61 |
| mutáció | 192 / 192 elkapva |
| jogadási utak (GP01–GP06) + önpróba | 9/9 · **3/3 bizonyítottan piros** |
| idézet-hűség | **44/44** (az R61 forrással) |
| elfogadott egész klauzula | **16 — nem nőtt** |
| tanulság-ellenőrzés · norma-csomag ellenpróba | 321/321 · 25/25 |
| újragenerált végső csomag (visszaolvasva) | 128 láncsor · **44 döntéssor** · `source_bound: true` · a lenyomat **egyezik** a mutációs mérésével |

A sorrend most is kötött volt: ellenpróba (25/25) → újragenerálás az ép bemenetből → visszaolvasás.
A 19 programos külső láncot **nem** futtattam újra: ez a kör a döntésregisztert és két
forrás-megjegyzést érintette, a lánc által mért viselkedést nem — régi futást pedig nem címkézek át.

---

## 5. Amit ebben a körben nem tettem meg — kimondva

- **Nem** építettem új funkciót, adaptert vagy felületet — a külső fél nem is kért ilyet.
- **Nem** hoztam üzleti döntést az A és B kérdésben; azok az operátoré.
- **Nem** vettem fel új tanulság-bejegyzést, mert nem új hiba-osztályról van szó (indokolva).
- **Nem** címkéztem át régi mérést: a magforrás szövege változott, a battéria újra lefutott.
- **Nincs gépi jel** arra, hogy egy megírt mondat tartalmilag igaz-e — ezt a két javított mondat
  esete is mutatja: mindkettőt **ember** találta meg, nem őr.
