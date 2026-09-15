# CLAUDE — Valach System (a V3 fejlesztés otthona)

**Ez a fájl a memória.** A rendszer minden körben automatikusan betölti; ami itt nincs, az a
következő körben nem létezik.

**A repó neve verzió-semleges, és ez szándékos** (D-VS-3000): a termék EGY, a verzió CÍMKE a
git-történetben (`v3.0.0`, `v3.1.0`, `v4.0.0`). Nem lesz `vs4` nevű repó. A V2 a saját nevén él
tovább (`valach-family/vs`), és onnan jött át minden, ami nem verzió-függő: a tanulságok, az
operátori állandók, a szállítási forma.

---

## AKTÍV MEMÓRIA — EZ a memóriám. Nincs más.

Operátori kérdés (2026-07-30): *„a kukát és az operátor rule-okat egyáltalán nem tudnád a memóriádba
menteni? … azokat az .md-ket legyünk őszinték, senki nem fogja olvasni!!"*

**Őszinte válasz:** az ügynöknek NINCS session-ök közti memóriája — minden kör NULLÁRÓL indul.
Egyetlen dolog jön át: amit a rendszer **automatikusan betölt**, és az EZ A FÁJL. Egy külön `.md`,
amit senki nem nyit meg, **nem memória**.

A részletes indoklás **kódban** van, mert azt a GÉP futtatja, nem a jóindulat:
`contracts/retiredPatternRegistry.js` (a 89 tanulság) + `contracts/guardHome.js` (hol fut ma a
hozzájuk tartozó gépi jel) → **`npm run verify:kuka`** (a söprés része; visszacsúszásnál piros).

### 1. A TERMINÁL-BLOKK — szó szerint ez, mindig teljes

Az operátor gépén a repó útja **szóközt és `+` jelet is tartalmaz**, ezért IDÉZŐJEL kell —
`cd ~/valach-system` nem létezik nála (KUKA-007):

```bash
cd "/Users/valachzsolt/Documents/CREATOR/DESIGN + WEB/vfamily/00_Admin/valach-system"
git checkout main
git fetch origin
git pull origin main
npm run verify:sweep
npm run docs:html
```

Miért mind: **checkout** = lehet, hogy egy korábbi ág van kint · **fetch+pull** = két sáv (dev+aux)
tolja ugyanazt a main-t, friss kód nélkül a RÉGI állapotot nézné · **verify:sweep** = nem hisszük el,
ellenőrizzük · **docs:html** = a friss lapok OLVASHATÓ alakja (`docs/_olvashato/index.html` — se
hálózat, se kulcs; az olvashatóság ne a MI emlékezetünkön múljon — KUKA-079). Ha egy lépés éppen
no-op, **akkor is bent marad** — az operátor egy blokkot másol, nem gondolkodik azon, mit hagyjon ki.

**Adatbázis-sor még NINCS a blokkban, és ez KIMONDOTT, nem feledékenység:** a V3-ban ma nulla
migráció áll, a magreferencia (`v3ref/`) saját, eldobható fájl-tárolón fut. Az `npm run db:migrate`
sor akkor kerül ide, amikor az ELSŐ migráció megszületik — és a `verify:release-order` őr onnantól
méri, hogy a séma és a kód együtt jár.


### 2. KUKA — amit egyszer elbuktunk, azt NEM építjük újra

**A TELJES TÁBLA — 157 bejegyzés — a `docs/KUKA_ARCHIVUM.md` lapon áll**, karakterre
ugyanazzal a szöveggel; a kanonikus forrás a kód: `contracts/retiredPatternRegistry.js`. Ide nem
másoljuk vissza: a tábla a fájl **92,5%-át** tette ki, tehát minden feladathoz betöltődött, akkor is,
ha egyetlen sora sem volt releváns (D-VS-3031 / R8 §4).

**FELADATHOZ KÖTÖTT ELŐVÉTEL — ez a szabály, nem ajánlás.** Mielőtt írsz, nyisd meg az archívumból
AZT a sort, amelyik a munkád hiba-osztályát fedi. A kötelező elővétel esetei:

| ha ezt csinálod | ELŐBB ezt vedd elő |
|---|---|
| **új gépi őrt / pint írsz** | KUKA-009 · 045 · 049 · 051 · 057 · 068 · 091 · 124 |
| **bizonyítékot fogadsz be** (külső fél, futás-tanú, beadvány) | KUKA-121 · 122 · 125 · 126 · 128 · 132 |
| **szabályt javítasz, ami több helyen igaz** | KUKA-003 · 013 · 029 · 039 · 129 · 130 |
| **jogosultsági kaput építesz** | KUKA-047 · 059 · 062 · 076 · 083 · 084 · 085 · 164 |
| **mérést vagy riportot írsz** | KUKA-033 · 054 · 067 · 082 · 131 · 133 · 134 |
| **szerszámot szállítasz az operátornak** | KUKA-031 · 040 · 064 · 072 · 079 · 089 · 165 |
| **felületet módosítasz** | KUKA-011 · 015 · 025 · 041 · 055 · 078 · 080 · 092 |

**Ha egy megoldást azért vezetünk ki, mert HIBÁS volt** → ugyanabban a körben KUKA-bejegyzés a
regiszterbe (kötelező: mi volt · miért rossz · mi váltja · **ki találta meg** · tanulság · gépi jel; ha
nincs gépi jel, azt ki kell mondani) **és egy sor az archívum táblájába**. A verifier mindkettőt
ellenőrzi.

---

### 3. HASZNÁLAT-PRÓBA — kiadás előtt, ÍRÁSBAN megválaszolva (D-VS-497)

Operátori lelet (2026-08-20): *„6-szor 10-szer kell nekiugrani ugyanannak az egyszerű feladatnak …
lefejleszted a mentést, amiről a feladat szól, de nem tűnik fel, hogy hiányzik a gomb, amivel
használni lehetett volna a mentést."*

**Igaza van, és az ok nem a figyelem, hanem a LÁTÓSZÖG:** a megnevezett darabot építem meg, nem a
LÁNCOT, amin a felhasználó végigmegy. A szabályok külön-külön mind megvoltak (KUKA-011 · 015 · 025 ·
041), csak szétszórva — utólag hivatkoztam rájuk, nem előre futtattam le őket. Ezért innentől EGY
kapu, és a válaszokat KI KELL ÍRNI a kiadás előtt (a „megnéztem" nem válasz):

1. **KI OLVASSA?** — minden új mentett érték. Ha senki, a képernyő mondja ki. (KUKA-015)
2. **MI VISZI KI?** — minden új írás. Van-e út, ami eljuttatja a céljához? (KUKA-025)
3. **HOL KATTINT?** — minden új futtató: van-e ELÉRHETŐ és ENGEDÉLYEZETT gomb, azon a képernyőn, ahol
   a felhasználó keresi? És minden TILTÁS: érvényes-e ezen az irányon? (KUKA-011 · 041)
4. **MIT LÁT UTÁNA?** — a művelet után a képernyő az ÚJ igazságot mutatja, vagy egy elavult számot?

**És két mérési szabály, mert a zöld söprés nem elég:**

- **A SAJÁT PÉLDÁM NEM BIZONYÍTÉK.** Amit én találok ki fixture-nek, az az én előfeltevésemet igazolja
  vissza. A mérést az OPERÁTOR valódi adat-alakján kell megismételni (D-VS-477: a saját példáimon
  „kész" szabály az első éles listán 24 hibás sort adott).
- **A MEGVÁLTOZTATOTT KÉPERNYŐT VÉGIG KELL KATTINTANI.** A repóban KÉSZEN áll a böngésző-próba
  (`npm run test:e2e`, Playwright + Chromium, `tests/e2e/`). A 2026-08-20-i körben **egyszer sem
  futott** — miközben pontosan azokat a hibákat fogta volna meg, amiket az operátor talált meg
  helyettem (hiányzó gomb · letiltott gomb · elavult fejléc · elvesztett kijelölés).

**Az operátor kimondott elve, ami innentől kötelező:** *„sokkal olcsóbb 50%-kal tovább fejleszteni …
de körültekintően, mint egyfolytában ugyanazon a dolgon újabb és újabb kisebb hibákat javítani"*. A
plusz idő NEM a saját kódom újraolvasására megy — hanem a fenti négy kérdésre és a végigkattintásra.

---


### 2/b. AZ ŐR-OTTHON — a 89 tanulság átjött, a jelek nagy része NEM

**Ezt ki kell mondani, mert különben némán hazudna a battéria.** A fenti tanulságok mind érvényesek,
de a hozzájuk tartozó **gépi jelek** többsége a V2 fájljaira mutat (`src/…`), ami ebben a repóban nem
létezik. Egy nem létező fájlon a tiltó-minta „nem talál semmit", tehát **zöldnek látszana** — pontosan
a KUKA-051 és a KUKA-041 hibája.

Ezért minden bejegyzésnek **kimondott otthona** van (`contracts/guardHome.js`), a `verify:kuka` a
listát **kiírja**, és a deklarációt **visszaméri mindkét irányban**:

| otthon | jelentés |
|---|---|
| **`v3`** | a jel cél-fájljai ITT vannak — a jel LEFUT, valódi védelem |
| **`vs`** | a jel a V2 repóban él; itt NEM fut, a tanulság viszont érvényes |
| **`none`** | a bejegyzésnek nincs gépi jele, és ezt maga a bejegyzés mondja ki (`guard_note`) |

A `vs` szám **PADLÓ**: csökkenhet (ahogy a V3 megépíti a saját őrét), **nőni nem szabad**.
Új V3-őr építésekor a bejegyzés otthonát át kell állítani `v3`-ra — a verifier ellenőrzi, hogy a
cél-fájlok tényleg itt vannak.

---

### 4. A KIADÁSI MENETREND — ettől lehet visszaállni

Az operátori döntés (D-VS-3000) három szabálya, gépi őrrel (`npm run verify:release-order`):

1. **A verzió CÍMKE:** `FŐ.ALVERZIÓ.JAVÍTÁS`. Egy `main` ág; `release/3.x` ág CSAK akkor születik,
   ha egy régi verziót támogatni kell, miközben a `main` továbbment. A v4 ugyanebben a repóban lesz.
2. **A migráció előrefelé megy, számozott, és a merge után SOHA nem szerkesztjük.** Ami egyszer
   lefutott bárhol, az kőbe van vésve — a `migrations/LEDGER.json` sha256-tal méri. Javítani ÚJ
   migrációval lehet.
3. **BŐVÍTÉS → ÁTÁLLÁS → SZŰKÍTÉS, három külön kiadásban.**
   **A tiltás, ami mindent eldönt: a bontás SOHA nem lehet ugyanabban a kiadásban, mint a kód, ami
   abbahagyja a használatát.** Minden bontó migráció fejlécében ott a `-- KIVEZETVE: <verzió>`, és
   annak szigorúan korábbinak kell lennie a mainál. A szabály `contracts/releaseOrder.js`-ben él, a
   verifier HÍVJA (KUKA-009), és **fixtúrákon bizonyítottan tüzel** — tehát nulla migrációval sem
   „üres zöld" (KUKA-051 · KUKA-089).

**A rossz kiadást NEM adatbázis-visszaállítással javítjuk, hanem a KÓD visszagörgetésével** — a
visszaállítás elveszíti a mentés óta született minden tranzakciót. Sorrend: kód-visszagörgetés →
célzott javító-esemény → és csak valódi adat-sérülésnél visszaállítás.
**A nem próbált mentés nem mentés** (KUKA-038): a visszaállítást ütemezetten gyakorolni kell.

**NEVESÍTETT FÜGGŐ — nincs még alapállás-mentés.** A V2-ben van
(`BASELINE_LOT_KODOK_20260731.dump`); itt azért nincs, mert még nincs adat. Az első éles adatbázis
megszületésekor ide kerül a mester-mentés neve, a visszatöltő parancs és a visszaolvasás — addig ez
a szakasz KIMONDOTT hiány, nem feledékenység (KUKA-050).

---

### 5. KÖRNYEZETEK

Három környezet EGY Railway-projektben (D-VS-3000):

| környezet | mire való | adat |
|---|---|---|
| **production** | az élő rendszer | valódi |
| **staging** | itt próbáljuk a migrációt és a kiadást, MIELŐTT élesre megy | minta-adat, soha nem éles |
| **demo** | bemutató — **CÉGTÉR a stagingben**, nem külön környezet | minta-adat, éjszaka visszaállítva |

A fejlesztői és a teszt-tároló **NEM a felhőben** van: a magreferencia saját, eldobható fájl-tárolón
fut. Az automata ellenőrzés soha nem függhet a felhőtől — különben egy üzemzavar a fejlesztést is
megállítja.

---

### 6. ÁLLANDÓK

- **Minden válasz magyarul**, `WORK CONTEXT` fejléccel. Az operátor **nem fejlesztő** — üzleti nyelven.
- **AZ OPERÁTOR NEM TUD `.md`-T MEGNYITNI — MINDEN NEKI SZÁNT LAPBÓL HTML IS KELL** (KUKA-079).
  Az `.md` a GÉPÉ (git, diff, verifier), a HTML az EMBERÉ — **ugyanabból a forrásból**, hogy ne
  tudjon elcsúszni. Két út, mindkettő kötelező: (1) a válaszban **artifact-link**, amit itt, a
  beszélgetésben megnyit; (2) a repóban `npm run docs:html` → `docs/_olvashato/*.html`, önálló lapok,
  internet nélkül is. A `docs/_olvashato/` **származtatott** (gitignore), a forrás mindig az `.md`.
  Gépi jel: `npm run verify:doc-html`. **Ez a szállítás része, nem udvariasság: amit a címzett nem
  tud megnyitni, azt nem szállítottuk le.**
- **AZ ELSŐ ÚT A BOARD — oda kerül a lap, nem a letöltésekbe** (operátori parancs, D-VS-655).
  Minden körhöz szállított lap a board **Dokumentumok** fülére megy:
  `node tools/vs_board_doc.mjs <lap>.md --pr <n> --step <n> --cmd <n> --round R1 --label PLAN --by Claude-v3`.
  Az eszköz kiírja a **MÁSOLHATÓ HIVATKOZÁST** — ezt kell a válaszba tenni. **Titok és üzleti adat
  oda sem kerülhet** — a feltöltés gépi titok-őrön megy át.
- `DATABASE_URL` és bármely kulcs **soha nem kerül chatbe** (csak `.env`). Üzleti adat (törzs, árak,
  bolti válasz) **nem kerül a repóba** — csak operátori csatornán.
- **D-VS szám: a V3 a 3000-es blokkból oszt** (D-VS-3000 · a határ D-VS-3005). A V2 (`vs` repó) a
  3000 ALATT marad, a V3 a 3000-től — így két repó egyszerre oszthat számot ütközés nélkül, és a
  szám továbbra is EGY dolgot
  jelöl. Ezt ne emlékezetből: **`npm run verify:decision-numbers`** kiírja a következő szabad számot,
  és piros lesz, ha a blokkot valaki átlépi.
- **Ne írj új `.md`-t azért, hogy „legyen dokumentálva".** Ami operatív, az ide jön; ami
  ellenőrizhető, az verifierbe. A doksi-írás nem eredmény.
- **Kör vége előtt TELJES söprés: `npm run verify:sweep`** (minden `verify:*`; a környezethez kötött
  ellenőrzések kihagyása NEVESÍTVE jelenik meg, nem néma zöldként). A cél-verifier zöldje NEM elég.
- **Folyamat-motor MAG-varrat érintése előtt levél a másik sávnak, nem patch.**
- **A SÁV-NEVEK A VERZIÓT KÖVETIK** (operátori átnevezés 2026-09-11, D-VS-675 — *„átnevezlek
  Claude-v3-nak, a chatgpt-det pedig chatgpt-v3-nak. A deveket ugyanígy v2-nek"*):
  **`Claude-v3`** (ez a sáv — a V3-at viszi) · **`Claude-v2`** (a V2 sáv) · **`chatgpt-v3`** (a mi
  külső ellenőrző felünk) · **`chatgpt-v2`** (a V2-é) · **`operator`**. A kanonikus lista a V2 repó
  `config/registries/lanes.json` fájljában él (LANE-01), és a board a feltöltésnél ELLENŐRZI. A régi
  alak (`Claude-AUX` · `Claude-DEV` · `ChatGPT`) **ALIAS marad, nem tiltott bemenet** — a board
  elfogadja és a mai névre fordítja. A MÚLTAT nem írjuk át: a napló és a korábbi körök a korabeli
  néven maradnak. Gépi jel (a V2 repóban): `npm run verify:lanes`.
- **A KÜLSŐ TÁRGYALÓ FÉL (chatgpt-v3) NEM ÍR A BOARDRA PARANCSOT** — olvasni tud (MCP-híd) és
  dokumentumot tölt fel, de parancsot nem ad és gazda-sáv nem lehet. A csatorna az OPERÁTOR, és
  minden üzenet **ÖNMAGÁBAN ÉRTHETŐ FÁJL** (`docs/70_PLANNING/`), nem chat-töredék.
- **A SZÖVEG A VALÓSÁGOT KÖVETI** (KUKA-050): minden új/módosuló felirat előtt a kérdés — IGAZ-E,
  amit állít. Rendszer-változásnál a rá hivatkozó leíró szövegek is a kör munkalistájára kerülnek.
  Függő ígéret („egyelőre", „hamarosan") csak NEVESÍTVE élhet: indok + dátum + kivezetési feltétel.

---

### 7. A KÖNYVTÁRREND ÉS A GENERÁLT FÁJLOK NEVE (operátori parancs, 2026-09-09)

*„Az újra generálódó fileok (script logok, backupok) a következő file néven legyenek:
`v3_v3.1.1_20260909_104201_…`. A könyvtárstuktúra nagyjából már jó volt a v2-ben is, de nézd át
azért, és ezek alapján készüljön minden."*

**A NÉV — hat darab, alulvonással.** Soha nem gépeljük: `artifactPath({ area, kind, ext, version })`
(`contracts/artifactNaming.js`). A verzió a `package.json`-ból jön (KUKA-005 · KUKA-033), az idő a
gép **helyi** ideje (a fájlnevet ember olvassa a saját gépén).

```
var/backups/v3_v3.1.1_20260909_104201_sema_mentes.sql
            │  │      │        │      └─ mi ez (kisbetűs, ékezet nélkül)
            │  │      │        └──────── idő (helyi)
            │  │      └───────────────── dátum
            │  └──────────────────────── a pontos verzió, ami írta
            └─────────────────────────── a fő vonal
```

**Amit az előtag NEM csinál, és ezt ki kell mondani:** nem rendez. Mérve: `v3_v3.10.0` az előtaggal
is a `v3_v3.9.0` ELÉ kerül. Ami rendez: a fix szélességű **dátum+idő** — egy vonalon belül az
ábécé-rend pontosan idő-rend. **A verzió a névben SZÁRMAZÁS** (melyik kiadás írta — ez kell a
visszaállításhoz), nem rendezési kulcs.

**A HELY — minden generált kimenet a `var/` alá.** A V2-ben ez kilenc külön helyen élt
(`backups/` · `runtime_logs/` · `test_logs/` · `test-results/` · `audit_out/` · `i18n_munka/` ·
`i18n_atiras/` · `logs/` · `tmp/`), és egy elrontott út `undefined/` nevű, **követett** könyvtárat
hozott létre három képpel a repóban. Egy fogalomnak egy otthona (KUKA-018 · KUKA-003).

| Terület | Mi kerül ide |
|---|---|
| `var/logs` | futás-naplók |
| `var/backups` | adatbázis-mentések — **ÜZLETI ADAT**, a repóba soha |
| `var/reports` | mérések, átvilágítások |
| `var/exports` | kivitt adat — **ÜZLETI ADAT** |
| `var/tmp` | eldobható |

A `var/` gitignore-olva van, egyetlen kivétellel: a `var/README.md` **látszik**, hogy egy új kör
tudja, hova írjon. **Egyetlen szerszám sem gyárt kézzel időbélyeges nevet** — gépi jel:
`npm run verify:artifact-naming` (ART01–ART07; bizonyítottan pirosra vált a visszacsúszásra).

**Kivétel, kimondva:** a `docs/_olvashato/` marad a helyén (nem költözik a `var/` alá) — a forrása
mellett él, és az operátori terminál-blokk erre az útra hivatkozik.
