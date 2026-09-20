# CLAUDE — Valach System (a V3 fejlesztés otthona)

**Ez a fájl a memória.** A rendszer minden körben automatikusan betölti; ami itt nincs, az a
következő körben nem létezik. **És minden ügynök-indításkor is betöltődik** (a fő szál és minden
általános al-ügynök egyaránt) — ezért RÖVID: ami feladathoz kötött, azt a 3. szakasz forrásindexe
mondja meg, és csak akkor olvasod, ha a feladat kéri (R65, D-VS-3066).

**A repó neve verzió-semleges, és ez szándékos** (D-VS-3000): a termék EGY, a verzió CÍMKE a
git-történetben. A V2 a saját nevén él tovább (`valach-family/vs`); onnan jött át, ami nem
verzió-függő: a tanulságok, az operátori állandók, a szállítási forma.

---

## AKTÍV MEMÓRIA — EZ a memóriám. Nincs más.

Az ügynöknek **NINCS session-ök közti memóriája** — minden kör NULLÁRÓL indul. Egyetlen dolog jön
át: amit a rendszer automatikusan betölt, és az EZ A FÁJL. Egy külön `.md`, amit senki nem nyit meg,
nem memória (operátori kérdés 2026-07-30). A részletes indoklás **kódban** van, mert azt a GÉP
futtatja: `contracts/retiredPatternRegistry.js` (a tanulságok) + `contracts/guardHome.js` (hol fut
ma a gépi jelük) → **`npm run verify:kuka`** (a söprés része; visszacsúszásnál piros).

### 1. A MUNKAREND — kevés szabály, mindegyik gépi jellel vagy kimondott hiánnyal

- **Minden válasz magyarul**, `WORK CONTEXT` fejléccel. Az operátor **nem fejlesztő** — üzleti nyelven.
- **A SPEC ELSŐ SORA A REPÓ.** Minden parancs (SPEC) kimondja: `Repó: valach-system` (alapérték) —
  a V2 (`valach-family/vs`) csatolását **nem az operátor dönti el**, hanem a Claude-v3 vagy a
  chatgpt-v3 kéri, indokkal és a CÉLZOTT olvasnivaló megnevezésével (fájl/szakasz), mert a csatolt
  repó gyökér-fájlja MINDEN ügynöknek betöltődik (a V2-é 222 614 bájt — mérve, R64). Gépi jel: nincs
  (szervezési szabály); a mérése a `meres:fogyasztas` kimenete.
- **EGY CSOMAG = EGY MUNKAMENET.** Új Claude-beszélgetést ÖSSZEFÜGGŐ munkacsomagonként nyitunk, nem
  board-sorszámonként; egy csomagon belül a kör megszakítás nélkül fut. A csomag ELŐTT a régi
  munkamenet mérés-forrásai mentve (`v3ref/source-documents/`), a záró REPORT commitolva és feltolva.
- **A KIJELÖLT ÁG AZ ÜGYNÖKÉ, a `main` az operátoré.** Az ügynök a munkamenetben megadott ágon
  dolgozik, és NEM vált `main`-re; a lenti terminál-blokk az OPERÁTOR gépén fut. Ez a két dolog
  nem mond ellent egymásnak: más gép, más szerep (R65 rendezte).
- **A SÖPRÉS A CSOMAG VÉGÉN TELJES, közben célzott.** `npm run verify:sweep` a csomagot záró commit
  előtt; közben a módosított terület saját ellenőrzője elég. **A többperces külső lánc
  (`external-checks`) NEM fut újra változatlan magra** — a legutóbbi teljes futás eredmény-fájlját és
  commit-SHA-ját hivatkozzuk (R63 §5 szabálya, itt kimondva). A környezethez kötött kihagyás
  NEVESÍTVE jelenik meg, nem néma zöldként.
- **PÁRHUZAMOS ÜGYNÖK csak indokolt, SZÉTVÁLASZTHATÓ részfeladatra**, ügynökönként kimondott céllal ·
  forrással · elvárt kimenettel · hívás-kerettel. **Csak olvasó** feladatra az `Explore` fajta
  (mérve: NEM kapja meg a gyökér-fájlokat); írásra az általános (megkapja). Nagy, sokügynökös
  kutatást alapból nem indítunk — az R63/R64 ablak hívásainak 65%-a workflow-ügynök volt (mérve).
- **A FOGYASZTÁS MÉRÉS, nem érzés:** `npm run meres:fogyasztas -- --session <azonosító> --from
  <ISO-idő>` → `var/reports/…_fogyasztas.json` (tartalom nélkül: hívás · friss bemenet ·
  cache-írás/-olvasás · kimenet · fő-szál kontextus medián/max, fajtánként és modellenként). A
  csomag végén EGY rövid összefoglaló sor a REPORT-ban; **körönkénti usage-melléklet nincs többé**
  (az operátor: abból senki nem vette észre a bajt). Kísérleti jelzők: fő-szál medián > 200 ezer ·
  ügynök-bemenet > 40 M / csomag. Egyenlőtlen feltételek mellett megtakarítást NEM állítunk.
- `DATABASE_URL` és bármely kulcs **soha nem kerül chatbe** (csak `.env`). Üzleti adat (törzs, árak,
  bolti válasz) **nem kerül a repóba** és a boardra sem — a feltöltés gépi titok-őrön megy át.
- **Ne írj új `.md`-t azért, hogy „legyen dokumentálva".** Ami operatív, az ide jön; ami
  ellenőrizhető, az verifierbe. Egy kör = EGY REPORT lap (nem alpontonként külön).
- **AZ OPERÁTOR NEM TUD `.md`-T MEGNYITNI — MINDEN NEKI SZÁNT LAPBÓL HTML IS KELL** (KUKA-079):
  artifact-link a válaszban + `npm run docs:html` → `docs/_olvashato/*.html` (származtatott,
  gitignore; a forrás az `.md`). Gépi jel: `npm run verify:doc-html`.
- **AZ ELSŐ ÚT A BOARD** (D-VS-655). A lap: `node tools/vs_board_doc.mjs <lap>.md --pr 300 --step 2
  --cmd 2 --round R<n> --label REPORT --by Claude-v3`; a kör-üzenet: `node tools/vs_board_round.mjs
  reply --pr 300 --step 2 --cmd 2 --type NOTE --by Claude-v3 --round R<n> --text-file <fájl>`.
  **Ami EBBŐL a repóból megy, mérve (R65):** lap-feltöltés és kör-üzenet — a `CHATOPS_WRITE_TOKEN`
  a környezetben áll. **Ami NEM:** a zárás mátrixa (`close-cmd/-step/-pr`) — a katalógus a V2 repóban
  él, az eszköz ezt nevezett hibával mondja ki. Egy körhöz EGY üzenet és EGY lap fér (a board 409-cel
  utasítja el a másodikat) — teszt-kört nem gyártunk.
- **A KÜLSŐ ELLENŐRZŐ FÉL (chatgpt-v3)** a boardot az MCP-hídon OLVASSA és lapot tölthet fel, de
  **parancsot nem ad, gazda-sáv nem lehet**; a csatorna az operátor, minden üzenet ÖNMAGÁBAN
  ÉRTHETŐ FÁJL (`docs/70_PLANNING/`). A sáv-nevek: `Claude-v3` · `Claude-v2` · `chatgpt-v3` ·
  `chatgpt-v2` · `operator` (a régi alak alias, a múltat nem írjuk át; a lista a V2
  `config/registries/lanes.json`-jában él, ide NEM másoljuk).
- **A SZÖVEG A VALÓSÁGOT KÖVETI** (KUKA-050): függő ígéret csak NEVESÍTVE (indok · dátum ·
  kivezetési feltétel). **D-VS szám a 3000-es blokkból**, ne emlékezetből: `npm run
  verify:decision-numbers` kiírja a következőt.
- **Folyamat-motor MAG-varrat érintése előtt levél a másik sávnak, nem patch.**

### 2. A TERMINÁL-BLOKK — az OPERÁTOR gépén, szó szerint, mindig teljes

Az útban **szóköz és `+` jel** van, ezért IDÉZŐJEL kell — `cd ~/valach-system` nem létezik nála (KUKA-007):

```bash
cd "/Users/valachzsolt/Documents/CREATOR/DESIGN + WEB/vfamily/00_Admin/valach-system"
git checkout main
git fetch origin
git pull origin main
npm run verify:sweep
npm run docs:html
```

Miért mind: **checkout** = lehet, hogy egy korábbi ág van kint · **fetch+pull** = a sávok ugyanazt a
main-t tolják, friss kód nélkül a RÉGI állapotot nézné · **verify:sweep** = nem hisszük el,
ellenőrizzük · **docs:html** = a friss lapok OLVASHATÓ alakja (`docs/_olvashato/index.html`). Ha egy
lépés éppen no-op, **akkor is bent marad**. **Adatbázis-sor még NINCS, kimondva:** a V3-ban nulla
migráció áll; az `npm run db:migrate` az ELSŐ migrációval kerül ide (`verify:release-order` őrzi).

### 3. FORRÁSINDEX — feladathoz kötve olvasd, ne előre

| ha ezt csinálod | ELŐBB ezt olvasd (célzottan) |
|---|---|
| **bármit** — a kör parancsa | a SPEC szó szerint: `v3ref/source-documents/R<n>_board_v1.md`; a legutóbbi REPORT: `docs/70_PLANNING/V3_R<n>_…md` |
| **a magot** (v3ref) módosítod | `v3ref/` (modulonként, a belépő `v3ref/entryPoints.mjs`) · a mutációs battéria `npm run verify:v3ref` (204 mutáció, 18 egység) · `v3ref/external-checks/` |
| **a próba-alkalmazást** (v3app) | `v3app/` · `npm run app:selfcheck` · `npm run proof:core-ux` (Playwright) |
| **kiadás / migráció** | e fájl 5. szakasza · `contracts/releaseOrder.js` · `migrations/LEDGER.json` |
| **generált fájlt írsz** | `contracts/artifactNaming.js` (`artifactPath`) · a `var/` rend (5. szakasz) |
| **fogyasztást mérsz** | `tools/v3_fogyasztas_meres.mjs` (`--selftest` az ellenpróbák) · `docs/70_PLANNING/V3_R64_FOGYASZTAS_SZABALYOK_LEVEL.md` |
| **boardra töltesz** | `tools/vs_board_doc.mjs` · `tools/vs_board_round.mjs` (1. szakasz) |
| **döntést rögzítesz** | `DECISION_LOG.md` feje (a szám a `verify:decision-numbers`-ből) |
| **a V2-ből kell valami** | CSAK a megnevezett fájl/szakasz, a SPEC-ben kimondva — a V2 CLAUDE.md-jét nem olvassuk be egészben |

### 4. KUKA — amit egyszer elbuktunk, azt NEM építjük újra

**A TELJES TÁBLA a `docs/KUKA_ARCHIVUM.md` lapon áll**, karakterre a kód szövegével; a kanonikus
forrás `contracts/retiredPatternRegistry.js`. Ide nem másoljuk vissza (D-VS-3031: a tábla a fájl
92,5%-át tette ki, és minden feladathoz betöltődött).

**FELADATHOZ KÖTÖTT ELŐVÉTEL — szabály, nem ajánlás.** Mielőtt írsz, nyisd meg az archívumból AZT a
sort, amelyik a munkád hiba-osztályát fedi:

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
regiszterbe (mi volt · miért rossz · mi váltja · **ki találta meg** · tanulság · gépi jel; ha nincs
gépi jel, kimondva) **és egy sor az archívum táblájába**. A verifier mindkettőt ellenőrzi.

**Az ŐR-OTTHON:** sok tanulság gépi jele a V2 fájljaira mutat, ami itt nem létezik — egy nem létező
fájlon a tiltó-minta zöldnek látszana (KUKA-051). Ezért minden bejegyzésnek kimondott otthona van
(`contracts/guardHome.js`: `v3` = itt fut · `vs` = a V2-ben él · `none` = nincs jele, kimondva), a
`vs` szám PADLÓ: csökkenhet, nőni nem szabad.

**HASZNÁLAT-PRÓBA kiadás előtt, ÍRÁSBAN** (D-VS-497): KI OLVASSA? (KUKA-015) · MI VISZI KI?
(KUKA-025) · HOL KATTINT? (KUKA-011 · 041) · MIT LÁT UTÁNA? A saját példám nem bizonyíték (az
operátor valódi adat-alakján mérünk), és a megváltoztatott képernyőt VÉGIG kell kattintani
(`npm run test:e2e`). Az operátor elve: *„sokkal olcsóbb 50%-kal tovább fejleszteni … de
körültekintően, mint egyfolytában ugyanazon a dolgon újabb és újabb kisebb hibákat javítani"*.

### 5. KIADÁS, KÖRNYEZET, KÖNYVTÁRREND — röviden, a részlet gépi őrben

- **Kiadási menetrend** (D-VS-3000, `npm run verify:release-order`): a verzió CÍMKE
  (`FŐ.ALVERZIÓ.JAVÍTÁS`), egy `main`; a migráció előrefelé megy, számozott, merge után soha nem
  szerkesztjük (`migrations/LEDGER.json` sha256); **BŐVÍTÉS → ÁTÁLLÁS → SZŰKÍTÉS három külön
  kiadásban** — a bontó migráció fejlécében `-- KIVEZETVE: <verzió>`, szigorúan korábbi a mainál
  (`contracts/releaseOrder.js`, fixtúrán bizonyítottan tüzel). A rossz kiadást a KÓD
  visszagörgetésével javítjuk, nem adatbázis-visszaállítással. **Nevesített függő:** alapállás-mentés
  még nincs (nincs adat); az első éles adatbázissal ide kerül a mester neve és a visszaolvasás.
  **A kiadás nem a kör:** a kör átadása board-üzenet + REPORT; a kiadás ez a menetrend — a kettő
  nem helyettesíti egymást (R65 rendezte).
- **Környezetek** (egy Railway-projekt): production (valódi adat) · staging (minta, itt próbáljuk a
  kiadást) · demo (CÉGTÉR a stagingben). A fejlesztői/teszt-tároló nem a felhőben van.
- **Generált fájl neve és helye** (operátori parancs 2026-09-09): `artifactPath({ area, kind, ext,
  version })` — `var/<terület>/v3_<verzió>_<dátum>_<idő>_<mi_ez>.<ext>`; kézzel soha. A verzió
  SZÁRMAZÁS, a dátum+idő rendez. `var/logs` · `var/backups` (ÜZLETI ADAT) · `var/reports` ·
  `var/exports` (ÜZLETI ADAT) · `var/tmp`; a `var/` gitignore-olva, a `docs/_olvashato/` a helyén
  marad. Gépi jel: `npm run verify:artifact-naming`.
