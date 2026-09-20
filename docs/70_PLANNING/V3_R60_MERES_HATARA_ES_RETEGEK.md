# R59 végrehajtása — az őr állítása is mérés, és a hiány határa nem az út hibája

> **Sáv:** Claude-v3 · **Kör:** R60 · **Állapot:** lezárt

**Szülő:** CMD-VS-300-002-002 **R59 — ANALYSIS** (chatgpt-v3 → Claude-v3, 2026-09-20).
A külső fél lapja szó szerint mentve: `v3ref/source-documents/R59_board_v1.md`.

---

## Röviden, magyarul — mi történt

Az előző körben elkészült a jogadási utak leltára. A külső ellenőrző fél **használható alapnak**
ismerte el — de három ponton megfogta, amit **köré építettem**. Mindhárom leletük igaz volt, és
mindhármat **először reprodukáltam a saját fánkon**, csak utána javítottam.

**1. Rossz következtetést vontam le a saját leltáromból.** Azt mondtam: „az adatköri jogadásnak
nincs hívója, tehát ez a következő fejlesztés". Csakhogy ez a **testvéreire is igaz** — egyetlen
jogadási belépési pontnak sincs próbán kívüli hívója ebben a referenciában. Vagyis nem egy út
hibája, hanem **a mai réteg határa**. Egy működő függvény elé burkolót tenni emiatt nem javítás,
hanem felesleges munka.

**2. Az őröm többet állított, mint amennyit ellenőriz.** Azt írtam róla, hogy „minden jogadó író
szerepel a táblában, holnap nem tud némán elavulni". A külső fél három ellenpéldával mérte meg —
kettő **átment** rajta. Ez a rosszabb fajta hiba: nem csak nem fog, hanem **bizonyítványt is ad**
róla.

**3. A végső normaösszesítő csomag régi állapotot mutatott.** A kör végén nem generáltam újra, így
egy korábbi mérés lenyomatát és 40 döntéssort vitt, miközben a mag már máshol tartott.

**Hétköznapi hasonlat a 2. ponthoz:** olyan volt, mint egy füstérzékelő, amire ráírtam, hogy „minden
tüzet jelez". A szomszéd kipróbálta két fajta füsttel: az egyiket jelezte, a másikat nem. Most
kijavítottam, amit lehetett — és **ráírtam, mit NEM érzékel**, mert ez a fontosabb.

---

## 1. A három lelet reprodukálva — a javítás előtt

| lelet | amit ők mértek | amit én mértem a saját fánkon |
|---|---|---|
| F59-02 (1) új modul, sima `INSERT` | kilépés 1 — az őr fogta | **kilépés 1** — egyezik |
| F59-02 (2) ugyanaz `INSERT OR IGNORE` alakkal | kilépés 0 — átment | **kilépés 0** — egyezik |
| F59-02 (3) új függvény egy már felsorolt modulban | kilépés 0 — átment | **kilépés 0** — egyezik |
| F59-01 `issueInviteUnderBasis` alap nélkül | `basis_id_required` | **`basis_id_required`, és NULLA sor születik** |
| F59-03 a beadott normaösszesítő | régi `4ca52d2d…`, 40 döntéssor | **egyezik** — a mag `ca9c6739…`, a regiszter 42 soros |

Semmit nem javítottam, amíg a hibát a saját gépemen elő nem állítottam.

---

## 2. F59-01 — a következtetés visszavonva, a rétegek megnevezve

### Amit rosszul mondtam, és mi a mért valóság

**(a) „A deklarálatlan meghívó is kiadható."** — **Nem igaz.** A nevezett kiadó út az alapot
**követeli**: alap nélkül a válasz `basis_id_required`, és **nulla sor** születik (se meghívó, se
pecsét). Az alap nélküli meghívó **nyers írásból** keletkezik, ami ezt az utat **megkerüli**.

**(b) „Fél lánc, ez a bizonyított technikai hiány és az egyetlen következő munkacsomag."** —
**Visszavonva.** A hiányzó hívó nem ennek az útnak a sajátja: a testvéreinek sincs. Ez a
**referencia mai hatóköre**, tehát **későbbi adapter-/integrációs határ**, nem mai core-hiba.

### A három alap nélküli eset — külön, mert külön is döntendő

| eset | mi a helyzet ma (mérve) |
|---|---|
| **pecsét nélküli meghívó BEVÁLTÁSA** | a nevezett kiadó út nem engedi; a nyersen keletkezett meghívót a beváltás **átengedi**, `no_declared_basis` néven kimondva |
| **alap nélküli BÍRÁLATI jogadás** | itt a **nevezett függvény engedi**: a hatáskör-sor `basis_id = NULL` értékkel létrejön |
| **explicit ADATKÖRI jogadás** | **nem áll fenn** — itt az alap feltétel, alap nélkül nincs jog |

### A rétegek szótára — minden sorra ugyanaz

Az R57-es „termékbeli jogadási felület" szót **kivezettem**: működő éles vagy felhasználói felületet
sugallt, ilyen a V3-ban ma nincs. A négy réteg:

| réteg | jelentés |
|---|---|
| **belső referencia-belépési pont** | exportált, megbízható belső belépési pont; a hívása valódi jogot ad **ebben a referenciában** — nem éles és nem felhasználói felület |
| **másik út belső írója** | exportált, de ma csak egy nevezett út hívja |
| **mérési előkészítő** | a jogot azért adja, hogy legyen mit mérni |
| **későbbi adapter-/felhasználói felület** | ma **nem létező** réteg; a szótárban azért áll, hogy a **határt nevezni** lehessen |

---

## 3. F59-02 — az őr javítva, és most ki is mondja, mit nem fog

**Javítás (a) — a hiányzó írás-alak.** Az `INSERT OR IGNORE/REPLACE/ABORT/FAIL/ROLLBACK` és a
`REPLACE INTO` ugyanúgy jogadó írás. A (2) ellenpélda ettől pirosra vált.

**Javítás (b) — GP06, arányos válasz a (3)-ra.** A jogadó írás-helyek **darabszáma modulonként
deklarált**: egy már felsorolt modulba írt új jogadó út **megemeli a számot ⇒ piros**. Ez nem
hívási lánc-elemzés, és nem is annak adja ki magát.

**A kézzel léptetett számláló csapdája ellen:** a mérési előkészítők (`run.mjs` · `mutations.mjs`)
**deklaráltan változók**. Ott minden új próba jogosan ír fixtúra-sort, és egy rögzített darabszám
pontosan azt tanítaná be, hogy a javítás = a szám átírása.

**Javítás (c) — a szöveg a valóságot mondja.** Az őr kimenete most ezt írja ki:

> A MÉRÉS HATÁRA, KIMONDVA: ez STRUKTURÁLIS, szöveg-szintű vizsgálat a `v3ref/*.mjs` fájlokon —
> NEM hívási lánc-elemzés, és a próbákat NEM futtatja. A FÜGGVÉNY-szintű teljesség és a
> HÍVÓ-besorolás **KÉZI felülvizsgálati határ**.

**És az állítás maga is mérve van.** Az `npm run verify:grant-paths` innentől **két futás**: az ép
fán a hat ellenőrzés (pozitív ellenpár), majd `--selftest` módban a **három ellenpélda egy eldobható
másolaton** — és megköveteli, hogy mind a három **pirosra vigye** az őrt, a **kilépési kódon** mérve.
Mérve: **3/3 bizonyítottan piros**.

---

## 4. F59-03 — a végső csomag frissessége

A beadott `V3_R36_NORMA_LANC_CSOMAG.json` a korábbi `4ca52d2d…` lenyomatot és **40** döntéssort
hordozott, miközben a mag `ca9c6739…`, a döntésregiszter **42** soros. **Nem generátorhiba:** a
végső beadásból maradt ki az újragenerált csomag — egy ellenpélda-futás köztes kimenete maradt bent.

**Innentől a sorrend kötött:** a bizonyíték-próbák **után**, az ép, eredeti bemenetből generálunk
újra, és **vissza is olvassuk**. A JSON és az olvasható párja együtt megy a végső forráshoz.

---

## 4/b. A kör gépi bizonyítéka

A magforrás szövege ebben a körben is változott, tehát a korábbi mérés **nem címkézhető át**.

| mit | érték |
|---|---|
| forrás-lenyomat (ma mérve) | `sha256:d1a96c90d37cf17bd82ee45e6dd34c1ce38999ddb5925faed5bdfecb090e6922` |
| magpróbák | 61/61 |
| mutáció | **192 / 192 elkapva** · 0 túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony |
| norma-lánc | 128/128 elvárt sor · hiányzó 0 · idegen 0 |
| jogadási utak (GP01–GP06) | 9/9 · és az **önpróba 3/3 bizonyítottan piros** |
| tanulság-ellenőrzés | 321/321 (KUKA-197 · KUKA-198-cal) |
| idézet-hűség | 42/42 |
| norma-csomag ellenpróbája | 25/25 |

**Az újragenerált végső csomag visszaolvasva** (F59-03): `measured_from.base_digest` =
`source_digest_today` = `sha256:d1a96c90…`, `source_bound: true`, 128 láncsor, **42 döntéssor** — a
csomag lenyomata **egyezik** a mutációs mérés `base_digest` értékével. A sorrend kötött volt: előbb
a norma-csomag ellenpróbája (25/25), **utána** az újragenerálás az ép bemenetből, **utána** a
visszaolvasás.

---

## 5. Mi működik ma, mi hiányzik, mi későbbi határ, mi üzleti döntés

**MŰKÖDIK a jelenlegi megbízható referenciában.** Négy belső belépési pont ad jogot, mindegyik
mérve: a meghívó kiadása **alapot követel**; a beváltás a kiadáskori alaphoz mér és a korlátot is
átviszi; a bírálati hatáskör megadáskor **és** használatkor is kapun megy át; az adatköri jogadásnál
az alap **feltétel**, a megvonás saját eseményként, két idő-tengelyen él.

**BIZONYÍTOTT MAI TECHNIKAI HIÁNY.** Ebben a körben **nem találtam újat**, és ezt kimondom: az
R58-ban ilyennek nevezett adatköri bejárat a mérés szerint nem az — a régi állítást visszavontam.

**KÉSŐBBI ADAPTER-HATÁR.** Egyik belépési pontnak sincs próbán kívüli hívója; ez a referencia
hatóköre, nem hiba. Ide tartozik az általános szervezeti képviselet is: ma **nem létező képesség**,
nincs olyan meglévő út, amit megsértene.

**MÉG MEGHOZANDÓ ÜZLETI DÖNTÉS** — változatlanul kettő, és a szabályon most sem változtattam:

**Döntés A — születhet-e ezután alap nélküli jog?** Ma két helyen igen: a **nyersen keletkezett**
meghívó beváltásánál és a **bírálati** jogadásnál (az adatkörinél nem). *Ajánlás:* tegyük
kötelezővé, de csak az ezutániakra.
**Amit nem állítok:** hogy ez „kis munka" — ezt az R58-as becslést **visszavonom**, nem volt mérve;
a bootstrap (az első jogadás, amikor még nincs mire hivatkozni), a történeti sorok kezelése és az
érintett hívók átnézése nincs felmérve. És: a magbeli **rögzített felhatalmazási esemény** nem
ugyanaz, mint egy **feltöltött, formális határozati irat** — a kód az elsőt követeli, a másodikról
semmit nem mond.

**Döntés B — mi legyen a már meglévő, alap nélküli jogokkal?** *Ajánlás:* átmenettel pótoltatni, a
határnapot az operátor mondja ki.
**Amit nem állítok:** hogy ma éles V3-jogok migrációjáról döntünk. Ilyen jogok nincsenek — ez a
referencia szintetikus. A „a meglévő jogok azonnal leállnának" mondat **feltételes üzemeltetési
forgatókönyv** arra az esetre, ha egyszer lesz éles adat; **nem** a mai referencia ténye.

---

## 6. Egy mondat helyesbítése a saját R58-as jelentésemből

Azt írtam: *„a rendszer készültsége nem nőtt."* A külső fél pontosabb alakot adott, és elfogadom:
**az elfogadott egész klauzulák darabszáma nem nőtt (16 marad), de az előző kör egy működési
részcsomagot bizonyítottan lezárt.** A kettő nem ugyanaz.

Változatlanul: 16 egész klauzula elfogadott, 13 részleges/nyitott — **ez nem készültségi százalék**;
ORG-N1a/b egésze részleges; req-5 és core-core lezárás nincs.

---

## 7. Amit ebben a körben nem tettem meg — kimondva

- **Nem** építettem adatköri bejáratot, HTTP-adaptert vagy felületet (az R59 kifejezetten tiltja).
- **Nem** hoztam jogadási üzleti szabályt, és nem oldottam fel az ORG-N1 részlegességét.
- **Nem** fejlesztettem általános JS/SQL elemzőmotort — a GP06 arányos, célzott ellenőrzés.
- **Nem** címkéztem át régi mérést: a magforrás szövege változott, tehát a battéria újra lefutott.
- **Nincs gépi jel** arra, hogy egy levont következtetés a testvér-utakon is mérve lett-e, és arra
  sem, hogy egy hiány-mondat tartalmilag helyes-e. Mindkettő emberi fegyelem, kimondva.
