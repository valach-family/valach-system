# DECISION LOG — Valach System (V3)

**A számozás a 700-as blokkból megy.** A V2 (`valach-family/vs`) a 700 ALATT marad, a V3 a 700-tól —
így két repó egyszerre oszthat számot ütközés nélkül, és a `D-VS-…` továbbra is EGY dolgot jelöl,
nem kettőt. Gépi őr: `npm run verify:decision-numbers` (kiírja a következő szabad számot, és piros
lesz, ha valaki a blokkon kívülre lép).

A 700 előtti döntések a V2 repó `DECISION_LOG.md`-jében élnek. Nem másoljuk át: egy fogalomnak EGY
otthona van (KUKA-018).

---

## D-VS-704 — A `docs:html` a repó megnyitása óta NULLA lapot készített, és sikert jelentett

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R44
**Megtalálta:** a saját munkám — az operátornak szánt állapot-lap készítésekor futtattam a parancsot.

### A lelet

A `package.json` `docs:html` sora `--all` kapcsolót adott át; az eszköz a `--mind`-ot ismeri.
A kapcsoló nem egyezett, tehát a cél-lista ÜRES maradt, és a parancs ezt írta ki:

```
0 lap elkészült ide: docs/_olvashato/
```

— **nulla kilépési kóddal**, „Nyisd meg dupla kattintással" zárómondattal. Tehát a repó megnyitása
óta (D-VS-700) **egyetlen olvasható lap sem készült**, miközben a parancs sikeresnek látszott. És
pont ez az a parancs, ami az operátor EGYETLEN olvasható alakját állítja elő (KUKA-079).

### Miért nem fogta meg a söprés

A `verify:doc-html` DHT06 tétele azt mérte, hogy a `docs:html` sor **hivatkozik-e** az eszközre
(`.includes('vs_doc_html.mjs')`). Ez igaz volt. A **viszonyt** — hogy a leírt parancs tényleg
készít-e lapot — semmi nem mérte (**KUKA-024**: két hibátlan oldal együtt is lehet halott lánc).

### A hiba osztálya: KUKA-036, visszatérve — a saját nyitó csomagomban

Réteg-határon átmenő azonosítót (itt: egy kapcsoló nevét) **emlékezetből** írtam a `package.json`-ba,
ahelyett hogy az eszköztől kérdeztem volna meg. A néma siker pedig **KUKA-012 · KUKA-041**: az üres
eredmény sikerként jelentve. A regiszter KUKA-036 bejegyzése kiegészítve, VISSZATÉRT jelöléssel.

### A javítás — három darab, mind kell

1. **A kapcsoló-lista EGY otthonban, exportálva:** `ALL_FLAGS` a `tools/vs_doc_html.mjs`-ben.
   A `package.json` értékét a pin EHHEZ méri, nem egy második, kézi másolathoz (KUKA-018).
2. **Több írásmód elismerve** (`--mind` · `--all`) — egy be/ki kapcsoló ne EGYETLEN titkos írásmódot
   ismerjen el (**KUKA-014**); a feloldó egy, a nevek többen lehetnek.
3. **A NULLA lap PIROS**, mondattal, ami kiírja a helyes hívást és a kapott kapcsolókat — nem
   zsákutca (**KUKA-064**).

### Gépi jel

`npm run verify:doc-html` **DHT07**: a pin **LEFUTTATJA** a `package.json`-ban álló `docs:html`
parancsot, és lapokat követel (**padló 1**); mellé ellenpróba: ismeretlen kapcsolóval az eszköznek
**1-gyel** kell zárnia. **Visszacsúszásra mérve piros** — a `--minden` alakkal a DHT07 FAIL, a
söprés piros. A pin ma 9/9, a söprés 6/6.

---

## D-VS-703 — A repó-terv három kérdése lezárva: a PITR BE VAN KAPCSOLVA

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R44
**Forrás:** operátori válasz — *„a pitr engedélyezve van a railway / valach-family projects /
valach-system -ben"*

### A három kérdés (V3_REPO_ES_UZEM_TERV.md §7) — mind megválaszolva

| # | Kérdés | Operátori válasz |
|---|---|---|
| 1 | A repó neve | **`valach-family/valach-system`** — *„ok, valach-system mehet"* |
| 2 | Három környezet (éles · teszt · demo mint cégtér a tesztben) | **rendben** — *„a három környezet is jó"* |
| 3 | Be van-e kapcsolva az időpontra visszaállítás (PITR) | **IGEN**, a `valach-system` projekten |

### Amit a 3. válasz eldönt — és amit NEM

**Eldönti a legrosszabb esetet:** a maximális adatvesztés **másodperc-nagyságrend**, nem az utolsó
mentésig terjedő akár 24 óra. Ez a repó-terv §4-ének első száma, és eddig nyitva állt.

**NEM dönti el a visszaállítás rendjét, és ezt ki kell mondani** (KUKA-050 — a szöveg a valóságot
kövesse, a képesség megléte nem eljárás): a bekapcsolt PITR **nem** teszi a visszaállítást első
eszközzé. A §4 szabálya változatlan: *a rossz kiadást a KÓD visszagörgetése javítja, nem az adatbázis
visszaállítása* — a visszaállítás a mentési pont óta született MINDEN valódi munkát eldobná.
A PITR a végső háló, három nevesített esetre: valódi adat-sérülés · téves tömeges törlés · olyan
romlás, amit célzott javító-esemény nem tud helyrehozni.

**És a képesség megléte nem bizonyíték arra, hogy működik** (KUKA-038). A `backups`/PITR-út egyetlen
érvényes bizonyítéka egy lefuttatott visszaállítás. **Nevesített függő:** az első éles adat előtt
ütemezett visszaállítás-gyakorlat, a V2-ből átemelt eszközzel. Amíg ez nem futott le, a
visszaállítási képességet sehol nem jelentjük késznek.

### Gépi jel

Ezen a körön **nincs új gépi jel, és ez kimondott**: a PITR a Railway szolgáltatás-beállítása, a
repó kódjából nem mérhető. A jel akkor születik meg, amikor az első visszaállítás-gyakorlat lefut —
a kimenete a `var/reports/` alá, a névszabály szerint.

---

## D-VS-702 — A mérőműszer hazudott: a Q18 reprodukálva és lezárva

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R42 → R43
**Forrás:** a külső tárgyaló fél független ellenőrzése (R42 — ANALYSIS), 17 kiegészítő eset.

### 1. A lelet, ami mindent megelőz

A külső fél a `run.mjs` helyére azonnal 86-tal kilépő programot tett — se JSON, se lefutott próba.
A `mutate.mjs` erre **„10 mutáció · 10 elkapva"**-t írt ki és **0-val zárt**. **Reprodukáltam.**

Egy sor okozta: `catch { failed = ['(a futás összeomlott)']; }` — a JSON-hibát BIZONYÍTÉKNAK
számolta. Mellette a `wrongCatcher` ki volt számolva, de a kilépési feltétel nem használta.

**Ez a KUKA-051/089 a mérő-eszközön** — a lehető legrosszabb helyen: ha a mérő zöldet mond a
semmire, minden rá hivatkozó bizonyíték nem gyengébb, hanem **hamis**. Az R33 „10/10 mutáció
elkapva" állítása ezért nem az volt, aminek jelentettem; visszamenőleg nem hitelesítem.

### 2. A javítás

Öt ítélet (`CAUGHT` · `WRONG_CATCHER` · `SURVIVED` · `HARNESS_ERROR` · `STALE_ANCHOR`), és minden
nem-`CAUGHT` piros. A hiba SOHA nem észlelés. A **megnevezett** próbának kell buknia. Futásidejű
kivétel csak akkor bizonyíték, ha a mutáció szerződése előre kimondja — és a kimenet kiírja, hogy a
bizonyíték ereje korlátozott.

**És a lényeg: két ÁLLANDÓ kapu minden futáskor** — (a) az alapvonal zöld-e, (b) a **Q18-ellenpróba**:
egy szándékosan elrontott futtatót `HARNESS_ERROR`-nak kell minősíteni. A (b) minden futásnál
elvégzi a külső fél támadását a saját kódunkon. Ez az egyetlen dolog, amitől a többi számnak értéke
van.

**Bizonyítva:** a Q18-támadás a javított mérőn → alapvonal-kapu piros, a mutációk **nem futnak**,
kilépési kód 1. Az M6 elkapóját `P-A08`-ra írva → `WRONG_CATCHER`, kilépési kód 1.

### 3. Három további, ugyanebből a pontból

- **`v3ref:evidence` nem létezett**, pedig az R33 rá hivatkozott — nem létező futtatóra hivatkozó
  riport (KUKA-011/038 osztálya). Felvéve.
- **`executed_by: 'Claude-AUX'` beégetve** — a rekord akkor is a mi nevünket vitte, amikor a külső
  fél futtatta a saját gépén: a bizonyíték a végrehajtójáról hazudott (KUKA-056). Most
  `--executed-by=` / env / kimondott `unknown`.
- **A hatókör nélküli `verified_by`** üresen marad; helyette próbánkénti, hatókörös rekordok
  (`v3ref/reviews.mjs`) **`residual` mezővel** és `gate_closed: false`-szal, a forrás-committhoz
  kötve — az elévülés kimondva (KUKA-041 · KUKA-050).

### 4. És három lelet a SAJÁT, EGY KÖRREL KORÁBBI őreimben

Nem a külső fél sorrendjének 2. pontja, hanem **hamis biztonságot állítottak** — ezért nem vártak:

- **Q16:** a kiadási menetrend őre KIZÁRÓ felsorolással dolgozott, ezért a `TRUNCATE`, a
  `DROP legacy_code` (a `COLUMN` szó a Postgresben **opcionális**), az azonnal érvényesített `CHECK`
  és a `DELETE` mind **`expand, ok:true`** választ kapott. Most **megengedő szabály** (KUKA-057):
  `expand` · `contract` · `data_change` · `unknown`, és csak az ismert-biztonságos megy át magától.
  Kimondva a kódban: **az őr előszűrő, nem SQL-értelmező.**
- **SemVer:** `3.1.0-alpha` és `3.1.0` között 0-t adott, és elfogadta a `03.1.0` alakot. Szigorú
  parse + előkiadás-rendezés (semver.org 11.4).
- **`artifactNaming`:** `area:'toString'` → `undefined/…` út (örökölt kulcs), perjeles „verzió" →
  útvonal-részek a névben. Sajátkulcs-ellenőrzés + szigorú verzió-alak.

**Mind a hat új viselkedés FIXTÚRÁVAL őrizve** — hogy ne ismétlődjön a Q16 osztálya: új ág, mérés
nélkül. `verify:release-order` 27/27 · `verify:artifact-naming` 28/28.

### 5. Ami NEM történt meg — kimondva

- **Az R42 §3 2–5. pontja el sem kezdődött** (Q01–Q15 magviselkedés · A08 konkurencia · A07+A15 ·
  a többi core-eset). Szándékosan: a mérő hibás volt, tehát bármilyen „a mutáció megfogja" állítás
  addig értéktelen lett volna.
- **Q17 valódi íróra** (futásazonosító + atomi létrehozás) — ilyen író ma nincs; a helye az elsőnél.
- **A gépi bizonyíték teljes mezőkészlete** részben van meg: UTC-időpont, futásazonosító és tartalmi
  lenyomat még **nincs**.
- **Egyetlen kapu sem billent át.** A G4/G5/G6 nyitva marad.

## D-VS-701 — A generált fájlok neve és helye: `v3_v3.1.1_20260909_104201_…` a `var/` alatt

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX
**Operátori parancs:** *„Az újra generálódó fileok (script logok, backupok) a következő file néven
legyenek: v3_v3.1.1_20260909_104201_… A könyvtárstuktúra nagyjából már jó volt a v2-ben is, de nézd
át azért, és ezek alapján készüljön minden."*

### 1. A V2 átnézése — három lelet, mérve

| Lelet | Mért adat |
|---|---|
| **Szétszórt otthon** | a generált kimenet **kilenc** helyre ment: `backups/` · `runtime_logs/` · `test_logs/` · `test-results/` · `audit_out/` · `i18n_munka/` · `i18n_atiras/` · `logs/` · `tmp/` — mindegyik külön alkalommal, külön `.gitignore`-sorral (KUKA-018 · KUKA-003) |
| **`undefined/`** | egy elrontott út `undefined` nevű könyvtárat hozott létre — és az **KÖVETETT** a gitben, **3 PNG-vel**. Nem gitignore-olva, tehát a hiba be is került a repóba |
| **40 kézzel gyártott név** | 40 szerszám épít időbélyeges fájlnevet kézzel, legalább **három** különböző alakban (`toISOString().slice(0,19).replace(/[:T]/g,'')` · `.replace(/[-:T]/g,'').slice(0,12)` · `.slice(0,10)`) — egy fogalom, negyven másolat, három nyelvjárás |

Az operátor „nagyjából jó volt" ítélete pontos: a **szerkezet** helyes (a generált kimenet a
forráson kívül, gitignore-olva), a **darabszám** és a **kézi névgyártás** a gyenge pont.

### 2. A döntés

- **A NÉV:** `v3_v3.1.1_20260909_104201_<mit>.<kiterjesztés>` — pontosan az operátor kérése szerint.
  Nevet **soha nem gépelünk**: `artifactPath({ area, kind, ext, version })`
  (`contracts/artifactNaming.js`, REL-01 mintájára nevezett feloldó).
- **A verzió a `package.json`-ból jön**, nem emlékezetből (KUKA-005 · KUKA-033).
- **Az idő a gép HELYI ideje**, nem UTC — a fájlnevet ember olvassa a saját gépén, és a 12:42-kor
  készült mentés ne „10:42"-t mondjon. Felhőben futtatva ez UTC lesz: a fájl a **keletkezés helyének**
  idejét viseli, és ez ki van mondva.
- **A HELY:** minden generált kimenet a **`var/`** alá, öt nevezett területre (`logs` · `backups` ·
  `reports` · `exports` · `tmp`). A `var/` gitignore-olva; egyetlen kivétel a `var/README.md`, hogy a
  szerkezet **látsszon** — különben egy új kör nem tudná, hova írjon (KUKA-011).
- **Kivétel, kimondva:** a `docs/_olvashato/` marad a helyén — a forrása mellett él, és az operátori
  terminál-blokk erre az útra hivatkozik.

### 3. Amit a saját őröm cáfolt meg — a `v3_` előtag indoka

Az első alakban azt írtam a kódba, hogy az előtag azért kell, mert így „a v4 nem kerül a v3.9 és a
v3.10 közé". **A saját mérésem cáfolta meg:**

```
ELŐTAGGAL     → v3_v3.10.0_…   v3_v3.9.0_…   v4_v4.0.0_…
ELŐTAG NÉLKÜL →    v3.10.0_…      v3.9.0_…      v4.0.0_…
```

A `3.10` **mindkét** alakban a `3.9` elé kerül (ábécé-rendben `1` < `9`), és a v4 **mindkét** alakban
a végén áll. **Az előtag tehát nem rendez.** Ami rendez: a fix szélességű **dátum+idő** — egy vonalon
belül az ábécé-rend pontosan idő-rend. A verzió a névben **származás** (melyik kiadás írta — ez kell
a visszaállításhoz, `VERSIONING.md` 5.), nem rendezési kulcs.

Az előtag marad, mert az operátor így kérte és a szemnek segít — de **hamis indoklással nem**
(KUKA-033: a levezetett állítás a méréséig csak javaslat). Az ART06 önpróba most az **ellenpárt** is
méri, tehát a helyes állítás gépi úton áll.

### 4. Gépi jel

`npm run verify:artifact-naming` — **ART01–ART07, 25 ellenőrzés**:

- **ART01** a feloldó **karakterre** az operátor mintáját adja (fixtúrákon, a mai verzióval is)
- **ART02** verzió/megnevezés/terület hiányára **MONDATTAL** áll meg, és a terület-hiba **felsorolja**
  a választhatókat (KUKA-064) — nem néma tartalék-érték (KUKA-020)
- **ART03** a területek zárt halmaza mind a `var/` alatt, mind érdemi magyarázattal; az üzleti adatot
  hordozók **ki vannak mondva**
- **ART04** a `var/` gitignore-olva, a `var/README.md` mégis látszik, és **minden területet felsorol**
  (a lap nem csúszhat el a kódtól — KUKA-018)
- **ART05** egyetlen szerszám sem gyárt kézzel időbélyeges nevet — **bizonyítottan tüzel**: egy
  V2-alakú fájlt bemásolva a próba PIROSRA vált, majd eltávolítva visszazöldül
- **ART06** önpróba a rendezésre **és az ellenpárra** (lásd a 3. pontot)
- **ART07** a név visszafejthető (melyik kiadás írta, mikor), és idegen alakra **nem** ad hamis
  eredményt

### 5. Ami NEM történt meg — kimondva

- **A V2-t nem alakítottam át.** A hatókör-szabály (D-VS-667) érvényben van: ott csak az épül, ami a
  következő hónapokhoz kell. A `undefined/` könyvtár és a 40 kézi névgyártás **a V2-ben marad**;
  jelentve az operátornak, javítás külön döntésre.
- **Nincs még olyan szerszám, ami ténylegesen ír** a `var/` alá — a szabály előbb áll, mint az első
  írója. Ezt az ART05 „a mérés nem üres" padlója és a `var/README.md` mondja ki, nem hallgatja el.

---

## D-VS-700 — A V3 repó megnyitása: `valach-family/valach-system`

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Operátori jóváhagyás:** *„ok, valach-system mehet,
a három környezet is jó"*

### A döntés

1. **A repó neve verzió-semleges: `valach-family/valach-system`.** A verzió CÍMKE a git-történetben
   (`v3.0.0`, `v3.1.0`, `v4.0.0`), nem repó-név és nem mappa. Nem lesz `vs4`.
2. **A V2 a saját nevén él tovább** (`valach-family/vs`). Nem költöztetjük, nem nevezzük át.
3. **Három környezet egy Railway-projektben:** production · staging · **demo mint CÉGTÉR a
   stagingben** (nem negyedik adatbázis).
4. **A fejlesztői és a teszt-tároló nem a felhőben van** — a magreferencia saját, eldobható
   fájl-tárolón fut, tehát az automata ellenőrzés nem függ a felhőtől.
5. **Kiadási menetrend:** egy `main`, semver címkék, `release/3.x` csak szükség esetén; migráció
   előrefelé, számozva, merge után érinthetetlenül; **bővítés → átállás → szűkítés három külön
   kiadásban**, a bontás soha nem eshet egybe azzal a kiadással, amelyben a kód abbahagyta a
   használatot.
6. **A rossz kiadást a KÓD visszagörgetése javítja, nem adatbázis-visszaállítás.**
7. **A D-VS számozás a V3-ban a 700-as blokkból megy.**

### Miért így — és mi volt a saját hibám

Az előző körben **én a `vs3` nevet ajánlottam. Ez hibás volt**, és az operátor kérdése mutatta meg,
miért: ha a repó neve verziószámot hordoz, a v4-nél `vs4` kellene, és az egész memória-, eszköz- és
board-gépezetet újra át kellene költöztetni — pontosan az a probléma ismétlődne, ami miatt egyáltalán
gondolkodunk.

**A javaslat nem új fogalmat vezetett be, és ezt mérve mondtuk ki**, nem emlékezetből: a V2 repó
`package.json`-ja már ma is `"name": "valach-system"` / `"version": "2.0.0-alpha"` — a termék neve és
a verzió már ott is külön mezőben állt. Csak a GitHub-repó neve (`vs`) csúszott el ettől.

### Mit hozott át a nyitó csomag, és mit NEM

| Átjött | Miért |
|---|---|
| `CLAUDE.md` (aktív memória) + a **89 KUKA-tanulság** | a tanulság nem verzió-függő |
| a lap-eszközök (`vs_doc_html`, `vs_verify_doc_html`) | az operátor nem tud `.md`-t megnyitni (KUKA-079) |
| a board-eszközök (`vs_board_doc`, `vs_board_round`) | hogy a tárgyalás ne szakadjon meg |
| a **magreferencia** (`v3ref/`) + a mutációs próbapad | a V3 mag-szabályai már futnak, adatbázis nélkül |
| a söprés (`verify:sweep`) | az első naptól, akkor is, ha kevés ellenőrzővel indul |

**NEM jött át** a V2 alkalmazás-kódja, sémája, üzleti adata és a 700 alatti döntés-napló.

### A csapda, amit külön kezelni kellett

A 89 tanulság átjött — a hozzájuk tartozó **gépi jelek 85-e viszont a V2 fájljaira mutat**. Nem
létező fájlon a tiltó-minta nem talál semmit, tehát **zöldnek látszana**: a védelem meglévőnek
tűnne, holott nincs (KUKA-051 · KUKA-041). Ezért minden bejegyzésnek **kimondott őr-otthona** van
(`contracts/guardHome.js`: `v3` / `vs` / `none`), a `verify:kuka` a listát **kiírja**, a deklarációt
**mindkét irányban visszaméri** (egy `v3`-nak jelölt bejegyzés cél-fájljának tényleg itt kell lennie;
egy `vs`-nek jelölt jel tényleg nem futtatható itt), és a `vs` szám **padló**: csökkenhet, nőni nem.

Mérve ma: **`v3` 2 · `vs` 85 · `none` 2**.

### Gépi jelek

- `npm run verify:kuka` — **KUK07** az őr-otthon (kimondás + visszamérés + padló)
- `npm run verify:release-order` — **REL01–REL06**; a REL06 fixtúrákon bizonyítja, hogy a
  bontás-szabály tüzel, mert nulla migrációval a REL03 nem mérne semmit
- `npm run verify:decision-numbers` — a 700-as blokk őre
- `npm run verify:doc-html` — a szállítási forma (a címzett meg tudja nyitni)
- `npm run verify:v3ref` — a magreferencia 6 próbája + 10 mutáció

### Ami NEM történt meg — kimondva

- **A repót nem én hoztam létre**: a session GitHub-alkalmazása nem kaphat repó-létrehozási jogot
  (mérve: `POST /user/repos` → 403 „Resource not accessible by integration"). Az üres repót az
  operátor nyitotta meg, a nyitó csomagot ez a döntés kíséri.
- **Nincs alapállás-mentés** (a V2-ben van) — mert még nincs adat. NEVESÍTETT függő: az első éles
  adatbázis megszületésekor kerül a `CLAUDE.md`-be a mester-mentés neve és a visszaolvasás.
- **Nincs migráció**, ezért a bontás-szabály élő adaton nem mért semmit; ezt a REL06 önpróba pótolja,
  és a verifier ki is írja.
- **A PITR (időpontra visszaállítás) állapota nem mérve** — azt az operátor látja a Railway-en, a
  session nem.
