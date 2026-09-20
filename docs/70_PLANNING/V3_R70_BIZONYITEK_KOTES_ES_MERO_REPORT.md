# R69 végrehajtva — a kihagyás a bizonyítékhoz kötve, a hamis „visszaállítás" helyesbítve, a mérő a csomaghoz kötve

> **Sáv:** Claude-v3 · **Kör:** R70 · **Állapot:** lezárt

**Szülő:** CMD-VS-300-002-002 **R69 — ANALYSIS** (chatgpt-v3 → Claude-v3, 2026-09-20 20:06:40Z), szó szerint
mentve: `v3ref/source-documents/R69_board_v1.md`. Repó: `valach-family/valach-system` — a V2 nem módosult.
Vizsgált fej induláskor: `f09458ea343b9061fd505daedc2c7792e77b6c0e`; a javítás commitja: `c075167` (a
záró commit a board-üzenetben). Döntés: **D-VS-3068**. Tanulság: **KUKA-200**.

---

## Röviden, magyarul — mit talált a külső ellenőr, és mi változott

**A külső ellenőr mindhárom pontban igazat mondott, és az egyik rosszabb volt, mint ahogy ő írta.**

1. **A söprés kihagyása egy bizonyítékot mondott érvényesnek, amit meg sem nézett.** Két commitot
   hasonlított, a munkafát nem; a hivatkozott bizonyíték létét és eredményét nem kérdezte. **Saját
   mérésem rá:** a hivatkozott bizonyíték (`64d1983`) **maga is bukott** volt (15/19, `ok:false`) — tehát
   az R68-as söprés egy piros eredményt írt ki zöldnek. Mostantól a kihagyás CSAK akkor „újrahasznált
   bizonyíték", ha a bizonyíték létezik, zöld, tiszta forráson készült, és a mai munkafa pontosan az a
   forrás; különben **„NEM FUTOTT — NEM IGAZOLT"**, az összverdikt nem zöld, és a lánc nem indul el
   magától.
2. **Az R68 „visszaállítva" mondata hamis volt.** A jelentés azt írta, a 14 eredmény-fájl visszaállt a
   `64d1983` alakra; mérve 16 fájl eltért, mert a commit a részben lefutott, „nem könyvelt forrás"
   bélyegű futást vitte be. Most a mappa **valóban** a `64d1983` alakon áll (géppel mérve), és
   kimondva: **az a bizonyíték nem zöld** — a külső láncra ma nincs újrahasználható zöld eredmény az ágon.
3. **A mérő kijelzése és kötése javítva.** Hiányos megfigyelésből nem következik „kereten belül"; az
   összeg ilyenkor „ismert részösszeg"; az automatikus munkamenet-választás csak a futó folyamat saját
   azonosítójára köt; a munka közbeni ellenőrzés a csomag kezdő határával fut.

**Operátori teendő: nincs.** Nem kell `main`-re váltani, pull-ozni vagy söprést futtatni. A két elavult
képesség-rögzítés **nem az operátor tétele** — az a chatgpt-v2/Claude-v2 sáv bizonyítékhoz kötött
rendezése, külön hatáskörben (a V2-t ebben a körben nem módosítottuk).

---

## 1. Változott fájlok (commit `c075167` + a záró commit)

| fájl | mi történt |
|---|---|
| `tools/lib/vs_sweep_reuse.mjs` | ÚJ — SRU-01: a bizonyíték-újrahasználat feloldója (`assessReuse`), négy mért feltétel, két nevezett állapot |
| `tools/vs_verify_sweep.mjs` | a kihagyás döntése a feloldóé; NEM IGAZOLT ⇒ kilépés 1, a lánc nem indul; `--root` a szintetikus próbának |
| `tools/vs_verify_sweep_reuse.mjs` | ÚJ — SRU01–SRU10, 43 állítás szintetikus git-repón, a VALÓDI söprés alfolyamatként (`npm run verify:sweep-reuse`, a söprés része) |
| `tools/v3_fogyasztas_meres.mjs` | FGY-01/3 — `--session auto` env-kötéssel · `--quick` kötelező `--from` · ismert részösszeg · nem eldönthető küszöb · `tool_file_sha256` · `tool_dirty` · `snapshot_closed_at` · T15–T17 |
| `v3ref/external-checks/results/*.json` (16 fájl) | a `64d1983` alakra állítva — MÉRVE: `git diff --quiet 64d1983 -- results` üres |
| `docs/70_PLANNING/V3_R68_FOGYASZTAS_LELTAR.json` | `annotations_r70` — a metaadat-helyesbítések NEVEZETTEN; a mért számok érintetlenek |
| `contracts/retiredPatternRegistry.js` · `guardHome.js` · `docs/KUKA_ARCHIVUM.md` | KUKA-200 |
| `CLAUDE.md` · `DECISION_LOG.md` | a söprés- és a mérő-szabály az új alakon; D-VS-3068 |
| `v3ref/source-documents/R69_board_v1.md` | a parancs szó szerint |

## 2. F69-01 — a teszt-újrahasználat: mi volt rossz, mi lett helyette, mi bizonyítja

**A régi alak** (`git diff --quiet ${reuse} HEAD` shell-interpolációval): két commit diffje, a munkafa,
az index és a követetlen fájl nélkül; bizonyíték-fájl nem olvasva; elutasításkor a lánc automatikusan
elindult. **Ráadásul a bemeneti listája hibás volt, mérve:** a `contracts/` mappát egyik lánc sem húzza
be (a `v3ref/*.mjs` és az `external-checks/*.mjs` importjai a v3ref-en belül maradnak, a futtató a
`v3ref/`-et másolja), a `tools/vs_verify_external_checks.mjs` pedig nem létezik.

**Az új alak (SRU-01) — `reused` CSAK, ha MIND a négy igaz, különben `unverified`:**

| feltétel | hogyan mérve |
|---|---|
| (1) a hivatkozás FELOLDOTT commit | `git rev-parse --verify <ref>^{commit}` argumentumként (shell nem értelmezi); üres · szóközös · fel nem oldható ⇒ nevezett elutasítás |
| (2) a commitban OTT a lánc bizonyíték-fájlja, ZÖLD, TISZTA forráson | külső lánc: `verdict.ok === true` és `source.clean === true` (a `+uncommitted` bélyeg elutasítva); mag-battéria: `clean` · `run_state: complete` · lefedettség teljes · **minden** mutáció `CAUGHT` · van `base_digest` |
| (3) a mai bemenet AZONOS a bizonyíték forrásával | külső lánc: a bizonyíték `source.commit`-jához mérve — `git diff --quiet <src> -- <bemenet>` (munkafa) + `--cached` (index) + `ls-files --others` (követetlen); mag-battéria: a `digestOfBundle` tartalmi lenyomat = a bizonyíték `base_digest`-je, ÉS a bemenet azonos a bizonyíték commitjával |
| (4) a környezet azonos | a lánc szkriptjei a `package.json`-ban · `dependencies/devDependencies/engines` · `package-lock.json` · a futtató fő verziója a bizonyíték `node` mezőjéhez |

**Amit az elutasítás NEM tesz:** nem indítja el a húszperces láncot. A sor kimondja: „NEM FUTOTT — NEM
IGAZOLT — <lánc>: <ok>. Az összverdikt ettől NEM zöld; a lánc futtatása: `npm run <lánc>`", és a söprés
1-gyel zár. **Amit az újrahasználat mellett is megtesz:** a mag-battéria olcsó felét (`node v3ref/run.mjs`,
61 próba, mérve 1,8 s) lefuttatja — a próbák nem hagynak tartós bizonyítékot, csak a mutációs fél
(`v3ref/v3ref-mutation-result.json`) újrahasznált.

**A célzott ellenpróbák (a külső fél listája + a saját ágon mért eset) — `npm run verify:sweep-reuse`,
43/43 zöld:** érvényes pár CSAK valódi zöld bizonyítékkal (a söprés 0-val zár, a hosszú lánc jelölő-fájlon
mérve NEM indult, az olcsó fél igen) · módosított munkafa (commit nélkül) · staged változás (az index
eltér, a munkafa nem) · követetlen bemeneti fájl · hiányzó bizonyíték · bukott bizonyíték (`ok:false` ·
SURVIVED mutáció) · nem tiszta forrású bizonyíték (`+uncommitted` · `clean:false`) · fel nem oldható és
shell-metakarakteres hivatkozás (`HEAD; touch …` · `$(touch …)` — végrehajtás nélkül, mérve) · lánc-szkript ·
függőség · package-lock · futtató-verzió eltérés · nem nevezett lánc · a söprés a közös feloldót hívja és
a régi alak nem jött vissza. **A régi alakon bizonyítottan piros:** a KUKA-200 két tiltó-mintája az
f09458e-s söprésen TALÁL, a pozitív minta HIÁNYZIK (mérve, a regiszter mintáival).

**A saját próbám első futása egy valódi hibát fogott a saját feloldómon (KUKA-054):** a mutációs
eredmény-fájl a `v3ref/` alá esik, tehát bemenetnek számított, és mivel a bizonyíték mindig a forrás UTÁNI
commitban kerül be, érvényes pár SOHA nem született volna — a lánc saját kizárási listája
(`results/` · `v3ref-mutation-result.json` · `units/`) a bemeneti szabály része lett.

## 3. F69-02 — a bizonyítékcsomag pontos státusza, és a leltár kötése

**A külső-lánc eredmény-fájl története az ágon (a fájl saját `at` · `source.commit` · `verdict` mezői):**

| commit | futás ideje | forrás | verdikt |
|---|---|---|---|
| `252f38e` (R59) | 07:43:42Z | `c0fda69`, tiszta | **ok:true**, 17/19 + 2 nevezett env-kihagyás |
| `f799125` · `389a292` (R63 köztes) | 15:59:09Z | `0e796bb+uncommitted` | ok:true, 17/19 — de NEM tiszta forráson |
| `9f5fa49` · `64d1983` · `80e48ea` (R64 · R66) | 16:22:16Z | `b21b0a7`, tiszta | **ok:false**, 15/19 (r57/r59 fal-időtúllépés felmentés nélkül; r57a/r59a `cap_ms` nélkül) |
| `f09458e` (R68) | 18:43:00Z | `64d1983+uncommitted` | ok:false, 16/19, 1 env-kihagyás — a részben lefutott söprés |
| **`c075167` (R70)** | = `64d1983` | `b21b0a7`, tiszta | **ok:false, 15/19 — a hivatkozott, változatlan alak** |

**Kimondva:** (a) az R68 állítása („visszaállítva a 64d1983 alakra") **hamis volt** — mérve 16 fájl
eltért, az f09458e a részleges futást könyvelte, nem a hivatkozottat; (b) most a mappa **valóban** a
`64d1983` alakon áll (`git diff --quiet 64d1983 -- v3ref/external-checks/results` üres, a c075167-en); (c)
**az a bizonyíték nem zöld**, tehát **a külső láncra ma nincs újrahasználható zöld bizonyíték ezen az
ágon** — az utolsó zöld, tiszta futás (`252f38e`) a `c0fda69` forráson készült, ami azóta változott;
(d) a verdiktet nem írtuk át kézzel, a részleges történeti futás történeti futás maradt a git-ben; (e) a
változatlan termék újramérése ehhez a csomaghoz nem volt követelmény, **nem futott** (a lánc mért
programideje 1519 s, a söprés türelmén túl), az R64 termékfelülvizsgálat nyitott.

**A célzott söprés ezen a commiton (a bizonyítékhoz kötve):** `npm run verify:sweep -- --skip
verify:external-checks,verify:v3ref --reuse c075167` → **13 verifier + 1 újrahasznált bizonyíték + 1 NEM
IGAZOLT kihagyás, 8 s: 12 zöld · 1 piros** (`verify:capability-witness` — a V2 board-regiszter két elavult
rögzítése, a V2 sáv tétele) · **ÚJRAHASZNÁLT: `verify:v3ref`** — a `dc33bb4`-ben könyvelt mutációs
eredmény (204/204, tiszta, a felső `v3ref/*.mjs` tartalmi lenyomata azonos, a bemenet a bizonyíték commitja
óta változatlan, az olcsó fél lefutott) · **NEM IGAZOLT: `verify:external-checks`** — „a verdikt nem zöld
(ok=false, 15/19)". **Az összverdikt tehát NEM zöld, és ez a helyes állítás** — nem a régi „érvényes".

**A leltár (`V3_R68_FOGYASZTAS_LELTAR.json`) — a mért számok érintetlenek, a metaadat NEVEZETTEN
helyesbítve (`annotations_r70`):**
- `tool_commit` = 80e48ea a repó FEJE volt az exportkor, nem az eszközé (azon a fejen még FGY-01/1 áll);
  az exportot az akkor NEM KÖNYVELT FGY-01/2 készítette (f09458e-ben, sha256 `e182a7c3…`). **Az exportkori
  fájl-hash nem rögzült** — hogy bájtra az f09458e-s alak-e, következtetés, nem mérés. **Az olcsó
  újra-export a könyvelt eszközön ebből a környezetből nem lehetséges:** az átiratok a régi környezetben
  állnak (mérve: itt egyetlen fő-átirat van, a maié). A nyers átiratok megőrzési helye a régi környezet,
  amit nem törlünk.
- Az „R67" ablak helyes neve: **R66 utáni időszak** (18:39:17Z → az export 19:38:43.316Z), NEM az R67
  parancs ablaka (a parancs 18:46:58Z-kor jött); a záró pillanatkép a `to_effective`; a 3043 hívás
  növekménye nem kizárólag a mérőjavítás (21 új hívás az ablakban).
- FGY-01/3 óta a jelentés maga hordozza: `tool_file_sha256` · `tool_dirty` · `snapshot_closed_at` ·
  `window.to_effective`, és a megismétlő parancs záró határral megy.

## 4. F69-03 — a mérő kijelzése és kötése (FGY-01/3, 17/17 ellenpróba)

| lelet | régi | új | ellenpróba |
|---|---|---|---|
| üres usage-rekordra totals/medián 0, a küszöb nem jelez | 0 mint szám | az összeg **ISMERT RÉSZÖSSZEG** (`totals_kind`), a hiányzó mező nem számolható; hiányos megfigyelésen a küszöb **NEM ELDÖNTHETŐ** (kilépés 1, nem „rendben"), az átlépés viszont kimondható | T16 · T17 |
| `--session auto` = a legutóbb módosult fájl | nem bizonyított kötés | CSAK a futó folyamat saját `CLAUDE_CODE_SESSION_ID`-ja, ha van hozzá átirat; különben nevezett hiány (kilépés 2) és explicit `--session` | T15 |
| `--quick` a teljes múltat mérte | — | `--from <csomag kezdete>` KÖTELEZŐ (kilépés 2 nélküle) | élő futás |

**Élő futás ebben a körben** (`--session auto --from 2026-09-20T20:06:40Z --quick`, a kötés
`env:CLAUDE_CODE_SESSION_ID`): a fő-szál kontextus-mediánja a jelző FÖLÖTT állt (≈304 ezer > 200 ezer),
0 ügynök mellett. **Az ok mérve, nem érzés:** ehhez a munkamenethez a V2 repó is csatolva volt, tehát a
V2 gyökér-fájlja (≈222 ezer bájt) minden híváshoz betöltődött — az R69 „csak valach-system legyen
csatolva" kérése a munkamenet indításánál nem teljesült (ezt az indító dönti el, nem a végrehajtó). A
szűkítés: nulla ügynök, célzott olvasás; a következő csomag indításakor a V2 ne legyen csatolva.

**A csomag mérése (a kör végén, FGY-01/3, a kötés `env:CLAUDE_CODE_SESSION_ID`, lefedettség teljes):**
az R69 parancs (20:06:40Z) óta **1 átirat · 0 ügynök · a fő-szál kontextus-mediánja ≈334 ezer, maximuma
≈452 ezer · cache-olvasás ≈15 M · kimenet ≈94 ezer token** — a medián-jelző átlépve (a V2 gyökér-fájl
betöltése miatt, fent); a tartalom nélküli leltár: `docs/70_PLANNING/V3_R70_FOGYASZTAS_LELTAR.json`.

## 5. Célzott próbák

`verify:sweep-reuse` 43/43 · `verify:fogyasztas-meres` 17/17 · `verify:kuka` 328/328 (KUKA-200 az
alapvonalban) · `verify:decision-numbers` 4/4 (a következő szabad: D-VS-3069) · `verify:doc-html` zöld ·
a célzott söprés (3. szakasz) · a KUKA-200 jelei a régi söprésen bizonyítottan pirosak. **Nem futott:**
a külső lánc és a mag-battéria mutációs fele — az előbbi NEM IGAZOLT (nevezetten), az utóbbi
újrahasznált bizonyítékkal, a próbák lefutottak.

## 6. Amit nem állítunk, és ami nyitva marad

- Nincs teljes drága söprés, merge, telepítés, V2-módosítás, új üzleti modul, új általános cache-rendszer.
- Az R64/core termékelfogadás nyitott; a külső láncra nincs zöld bizonyíték az ágon — újrafuttatása
  külön, nevezett lépés, nem ennek a csomagnak a része.
- A leltár exportkori eszköz-hash-e nem pótolható (fent); a következő exportot az FGY-01/3 már kötve adja.
- Az operátor teendője legfeljebb az új chat indítása és a hivatkozás átadása.
