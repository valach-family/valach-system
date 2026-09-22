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
  board-sorszámonként; egy csomagon belül a kör megszakítás nélkül fut. A váltás ELŐTT az átadás kész:
  a SPEC-ek szó szerint (`v3ref/source-documents/`), a tartalom nélküli fogyasztás-leltár
  (`docs/70_PLANNING/…_FOGYASZTAS_LELTAR.json`, a régi környezetből exportálva — a `var/` helyi fájl
  puszta megnevezése nem átadás), a záró REPORT commitolva és feltolva. Párhuzamos második végrehajtó
  nem indul. Mentő commit a csomag közben MEGENGEDETT (a cél az üres ébresztés, nem a commit).
- **A KIJELÖLT ÁG AZ ÜGYNÖKÉ, a `main` az operátoré — és a kettő nem cserélhető.** Az ügynök a
  munkamenetben megadott ágon dolgozik, NEM vált `main`-re. A lenti terminál-blokk a KIADÁS
  megtekintése (a `main`-en összeolvasztott állapot): egy össze nem olvasztott ág eredményét
  ezzel NEM lehet megnézni, ezért az ügynök ilyen csomaghoz NEM ad az operátornak checkout/pull/söprés
  utasítást — a kipróbálás útja az artifact-link és a board-lap, vagy az operátor kimondott
  ág-kérése (R67 F67-04).
- **A SÖPRÉS A CSOMAG VÉGÉN FUT, a hosszú láncok kihagyása NEVESÍTETT és a BIZONYÍTÉKHOZ KÖTÖTT.** A
  `npm run verify:sweep` alapból MINDEN `verify:*`-ot elindít (a két több-tízperces lánc a 900 s türelmen
  túl „NEM FEJEZŐDÖTT BE"-t kap — az nem kihagyás és nem zöld). Szerszám-/szabály-csomagnál a célzott
  út: `npm run verify:sweep -- --skip verify:external-checks,verify:v3ref --reuse <commit>` — a kihagyás
  CSAK akkor „ÚJRAHASZNÁLT BIZONYÍTÉK", ha a feloldó (SRU-01, `tools/lib/vs_sweep_reuse.mjs`) mind a
  négyet MÉRTE: feloldott commit · a commitban ZÖLD, TISZTA forráson született bizonyíték-fájl · a lánc
  bemenete a MUNKAFÁN (munkafa + index + követetlen) azonos a bizonyíték forrásával · lánc-szkriptek,
  függőségek, futtató azonosak. Különben **„NEM FUTOTT — NEM IGAZOLT"**: az összverdikt NEM zöld, a
  lánc nem indul magától — külön futtatod (`npm run <lánc>`), és a REPORT a NEM IGAZOLT állapotot írja,
  nem zöldet (R69 F69-01 · KUKA-200). A mag-battéria olcsó fele (a próbák) mindig lefut. A
  hivatkozott eredmény-fájlok a hivatkozott commit alakjában maradnak; „visszaállítva" csak `git diff
  --quiet` után írható le. Gépi jel: `npm run verify:sweep-reuse`.
- **PÁRHUZAMOS ÜGYNÖK csak indokolt, SZÉTVÁLASZTHATÓ részfeladatra**, ügynökönként kimondott céllal ·
  forrással · elvárt kimenettel · hívás-kerettel. **Csak olvasó** feladatra az `Explore` fajta
  (mérve: NEM kapja meg a gyökér-fájlokat); írásra az általános (megkapja). Nagy, sokügynökös
  kutatást alapból nem indítunk — az R63/R64 ablak hívásainak 65%-a workflow-ügynök volt (mérve).
- **A FOGYASZTÁS MÉRÉS, nem érzés — és munka KÖZBEN is nézzük:** `npm run meres:fogyasztas --
  --session auto --from <a parancs board-időbélyege> --quick` egy sor, modellhívás nélkül — kötelező
  ellenőrzési pont (1) MINDEN nagyobb delegálás (2+ ügynök vagy workflow) ELŐTT és (2) minden lényeges
  feladatcsoport UTÁN. Az `auto` CSAK a futó folyamat saját azonosítójára köt (`CLAUDE_CODE_SESSION_ID`);
  ha nem köthető, explicit `--session <id>` (R69 F69-03). A `--from` a CSOMAG kezdete — nélküle a jelző a
  múlt ablakait mérné. Átlépett jelzőnél a koordinátor szűkít (új munkamenet, kevesebb ügynök, célzott
  olvasás) vagy a REPORT-ban indokolja — nem az operátorra hárítja; **hiányos megfigyelésből nem
  következik „kereten belül"** (a mérő ezt NEM ELDÖNTHETŐ-nek írja, az összeg ISMERT RÉSZÖSSZEG). A csomag
  végén a teljes mérés (`--session <id> --from <ISO> --to <ISO> --label <ablak>`), a tartalom nélküli
  leltár a repóba (fent), EGY rövid sor a REPORT-ban; **körönkénti usage-melléklet nincs többé**. Az
  ablak-határ a board-üzenetek időbélyege (parancs → válasz), a bizonytalan határ jelölve, a nyitott
  ablak záró pillanatképe a jelentésben; az esemény utáni hívás nem automatikusan az esemény költsége.
  Kísérleti jelzők: fő-szál medián > 200 ezer · ügynök-bemenet > 40 M / csomag. Egyenlőtlen feltételek
  mellett megtakarítást NEM állítunk.
- **A SAJÁT KIMENET IS KONTEXTUS (R73, mérve):** a 47 hívásos ablak növekedésének ~40%-a az előző válaszok
  (usage-ban mért kimenet), ~27%-a az eszközválaszok és mellékletek (bájt/4 becslés), a többi becslési hiba
  és nem tárolt tényező. Ezért: terminálra CSAK összesítő és a hibás sor (a teljes napló fájlba, `var/`);
  board-lapból csak a kért szakasz (`sed -n`), nem az egész; nagy fájlt egy eszközzel írunk (Write VAGY
  shell), nem vegyesen — a kevert írás a harness `edited_text_file` visszatöltését váltja ki. A
  gyökér-fájl induló terhe MÉRVE: a csatolt V2 repó `CLAUDE.md`-je 334 kB (KUKA-tábla 189 kB + Állandók
  137 kB), a V3-é 17 kB — a csatolást a munkamenet forrás-listája adja, nem ez a fájl (3. szakasz).
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
  **Ami EBBŐL a repóból megy, mérve (R65/R67):** lap-feltöltés és kör-üzenet — a `CHATOPS_WRITE_TOKEN`
  a környezetben áll; a `repo` mező a git-távoliból jön (`valach-family/valach-system`), `--repo`
  felülír. **Ami NEM:** a zárás mátrixa (`close-cmd/-step/-pr`) — a katalógus a V2 repóban él, az
  eszköz ezt nevezett hibával mondja ki. Egy körhöz EGY üzenet és EGY lap fér (a board 409-cel
  utasítja el a másodikat) — teszt-kört nem gyártunk.
- **A KÜLSŐ ELLENŐRZŐ FÉL (chatgpt-v3) — a tényleges felhatalmazás szerint (R67 F67-04):** az
  MCP-hídon olvassa a boardot, lapot tölt fel, és **az OPERÁTOR felhatalmazásával PARANCS-KÖRT ír**
  (SPEC/ANALYSIS; mérve: az R65 és az R67 `COMMAND` kör, `chatgpt-v3` forrással). A felhatalmazás az
  operátoré — a technikai hozzáférés önmagában nem az; ha az operátor visszavonja, a sor itt is
  változik. Gazda-sáv nem lehet, a végrehajtó a Claude-v3; minden üzenet ÖNMAGÁBAN ÉRTHETŐ
  (`docs/70_PLANNING/` vagy board-lap). A sáv-nevek: `Claude-v3` · `Claude-v2` · `chatgpt-v3` ·
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
| **a próba-alkalmazást** (v3app) | `v3app/` · a HATÁR sémája `v3app/httpSchema.mjs` (HTP-01) · `npm run app:selfcheck` · `npm run verify:app-findings` (az R75 leletei) · `npm run proof:core-ux` (Playwright) |
| **kiadás / migráció** | e fájl 5. szakasza · `contracts/releaseOrder.js` · `migrations/LEDGER.json` |
| **generált fájlt írsz** | `contracts/artifactNaming.js` (`artifactPath`) · a `var/` rend (5. szakasz) |
| **fogyasztást mérsz** | `tools/v3_fogyasztas_meres.mjs` (`--selftest` az ellenpróbák) · `docs/70_PLANNING/V3_R64_FOGYASZTAS_SZABALYOK_LEVEL.md` |
| **hosszú láncot hagysz ki a söprésből** | `tools/lib/vs_sweep_reuse.mjs` (SRU-01) · `npm run verify:sweep-reuse` |
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
| **bizonyítékot fogadsz be** (külső fél, futás-tanú, beadvány) | KUKA-121 · 122 · 125 · 126 · 128 · 132 · 200 |
| **szabályt javítasz, ami több helyen igaz** | KUKA-003 · 013 · 029 · 039 · 129 · 130 |
| **jogosultsági kaput építesz** | KUKA-047 · 059 · 062 · 076 · 083 · 084 · 085 · 164 |
| **mérést vagy riportot írsz** | KUKA-033 · 054 · 067 · 082 · 131 · 133 · 134 |
| **szerszámot szállítasz az operátornak** | KUKA-031 · 040 · 064 · 072 · 079 · 089 · 165 |
| **felületet módosítasz** | KUKA-011 · 015 · 025 · 041 · 055 · 078 · 080 · 092 · **201** (a nemleges válasz vigye a MŰKÖDŐ folytatást) |
| **külső határt (HTTP) vagy bemenetet érintesz** | **203** (a kényszerítés nem ellenőrzés, a „nevezett maradék" nem védelem) · KUKA-092 |
| **versenyhelyzetet védesz** (váltás, késő válasz) | KUKA-041 · 046 · **202** (az őr ott álljon, ahol a kár keletkezik) |

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

### 5. KIADÁS, KÖRNYEZET, KÖNYVTÁRREND — a részlet gépi őrben, itt csak a mutató

- **Kiadás** (D-VS-3000): verzió = CÍMKE, egy `main`; migráció előre, számozott, merge után nem szerkesztjük
  (`migrations/LEDGER.json`); **BŐVÍTÉS → ÁTÁLLÁS → SZŰKÍTÉS három kiadásban**, a bontó migráció `-- KIVEZETVE:`
  fejléce korábbi a mainál — `contracts/releaseOrder.js` · `npm run verify:release-order`. Rossz kiadás: KÓD
  visszagörgetése. Alapállás-mentés még nincs (nincs adat) — nevesített függő. A kiadás nem a kör (R65).
- **Környezetek:** production · staging (itt próbáljuk a kiadást) · demo (CÉGTÉR a stagingben); a fejlesztői
  tároló nem a felhőben.
- **Generált fájl:** `artifactPath({ area, kind, ext, version })` → `var/<terület>/…`, kézzel soha; `var/`
  gitignore, `docs/_olvashato/` marad — `contracts/artifactNaming.js` · `npm run verify:artifact-naming`.
