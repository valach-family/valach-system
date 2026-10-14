# V3 · R208 — ZÁRÓ JELENTÉS (a bizonyítékhatókör helyesbítése · az interaktív átadás befejezése · egy néma termékhiba)

**Kör:** `CMD-VS-300-002-002 R209 — REPORT` · **alcím:** az **R208 végrehajtása** · **Sáv:** Claude-v3 ·
**Címzett:** chatgpt-v3, az operátor közvetítésével · **Dátum:** 2026-10-14 · **Alap:** az R208 SPEC
szó szerint: `v3ref/source-documents/R208_board_v1.md`.

| | SHA |
|---|---|
| **INDULÓ** (a PR #1 feje, a SPEC §1 szerint ellenőrizve) | `2704602a549e6118d533d91a0b187f05db6e70a8` |
| **MÉRT** (a kötelező böngésző-kapu ezen futott) | `566424c1d0a70ebbec4378b2f42c4d663451edb2` |
| **ZÁRÓ PR-FEJ** (a GitHubról visszaolvasva) | *lentebb, §6* |

**Egy mondatban:** a `proof:demo-walk` hatóköre **helyesbítve** mind a négy helyen (a mért futások
érvényesek, csak másról szólnak) · az átadási bejárás **kibővítve** a bájt-azonosságra, a
nyelvcsomagok éles váltására és **mind a két vezetett történetre** · és ez a bővítés **egy néma,
három napja élő termékhibát talált** (`KUKA-505`) · a **végleges host** ellenőrzése **hozzáférési
korlát miatt NEM IGAZOLT**, a csomag és a link átadva.

---

## 1. §2 — A BIZONYÍTÉKHATÓKÖR HELYESBÍTÉSE (a korábbi tévedés megőrizve)

**Amit az R207 jelentésem állított (TÉVESEN):** *„…a célzott próbák és a teljes Playwright-lánc valódi
HTTP-héjon és valódi tárolón futnak (§4), a `proof:demo-walk` és a `docs:kiprobalas-kepek`
ugyanígy."* — vagyis a **`proof:demo-walk`-ot a valódi HTTP/tároló bizonyítékai közé sorolta.**

**Amit a forrás mond (magam is megmértem):** a `tools/v3_demo_walk_proof.mjs` **saját statikus
fájlkiszolgálót** indít (`createServer` a `v3app/public` fájljaira), a `demo-index.html`-t nyitja, és
a háttere a **jelölt `demo-adapter.mjs` csonk**. A fájl fejléce (19. sor) és a záró kiírása (763.
sor) ezt **ki is mondja**: *„AMIT EZ A TANÚ NEM ÁLLÍT: HTTP- vagy adatbázis-bizonyítékot."* Statikus
fájlok HTTP-s átvitele **nem** az üzleti API és a tároló ellenőrzése.

**A `docs:kiprobalas-kepek` ettől KÜLÖN valóban valódi szerveres:** `import { startServer } from
'../v3app/server.mjs'` → `startServer({ port: 0, dbPath })` eldobható SQLite-tal (mérve a forrásban:
29., 74. és 77. sor).

**A HELYES megnevezés, mostantól mindenhol:** a valódi szerveres/tárolós tanú a **Playwright-lánc**
(`tests/e2e/global-setup.mjs` → `startServer` + SQLite), a **`findings_*` battériák**, a **mag**
(`v3ref/run.mjs`) és a **`docs:kiprobalas-kepek`**. A `proof:demo-walk` a **bemutató-felület élő
tanúja** — a két teljes történet 19-19 lépéses végigjárása, mindkét méreten —, **azonos
hatókör-osztályban** az új `proof:bemutato-artifact`-tal.

**Hol javítottam (négy hely, mindenhol a korábbi tévedés megőrzésével):**
`docs/70_PLANNING/V3_R206_REPORT.md` §5 · `DECISION_LOG.md` D-VS-3269 §2 ·
`tools/v3_bemutato_artifact.mjs` fejléce · `tools/v3_bemutato_artifact_proof.mjs` fejléce. **A PR
leírásának** megfelelő sorát is helyesbítettem. **A mért futásokat nem nevezem sikertelennek:**
mindkettő zöld volt és zöld maradt — csak a hatókörük megnevezése volt rossz.

---

## 2. §3 — AZ ÁTADÁSI BEJÁRÁS KIBŐVÍTVE (és mit mér most)

A `proof:bemutato-artifact` lánc mostantól — **asztali szélességen ÉS 390 px-en**:

| mérés | eredmény |
|---|---|
| a csomag **MINDEN fájlja BÁJTRA azonos** a repó forrásával (sha256) | **ZÖLD** — 20 fájl |
| a csomag megnyitva feláll, JavaScript-hiba nélkül; a betöltés-hiba mondata **nem** jelenik meg | **ZÖLD** |
| a szimulált háttér **láthatóan** jelölt | **ZÖLD** |
| **a nyelvcsomagok éles váltása** a csomagban (magyar → angol → magyar), a mérce a csomagból | **ZÖLD** |
| **1. vezetett történet:** indulás · a vezetés valódi vezérlőt jelöl vagy kimondja, mire vár · a feladatot nem végzi el helyettünk · a kilépés elszámol | **ZÖLD** |
| **2. vezetett történet** (a meghívó-út után, tiszta címről): ugyanaz a négy állítás | **ZÖLD** |
| személyváltás a valódi úton · levél-fogadó · meghívó-képernyő | **ZÖLD** |
| **a javított út:** kért hálózati hiba → „Nem igazolt" (a régi személy/fiók sehol) → a beváltás tiltott → „Állapot ellenőrzése" → **helyreállás** a saját siker-mondatával | **ZÖLD** |
| a statikus kiszolgálóhoz beérkezett API-kérés | **egy sem** — mindet az adapter fogta el |

**A bájt-azonosság az, ami a két mérést összekötheti** (`KUKA-216`): a **két történet minden
lépésének** végigjárását (19-19 lépés, valódi kattintásokkal, mindkét méreten) a `proof:demo-walk`
méri — **ugyanezeken a bájtokon**. Ez a lánc a **csomagolást** és a **javított út
kattinthatóságát** méri. A kettő együtt teljes; egyik sem helyettesíti a másikat.

---

## 3. AMIT A BŐVÍTÉS TALÁLT: EGY NÉMA, HÁROM NAPJA ÉLŐ TERMÉKHIBA (`KUKA-505` · `D-VS-3270`)

A nyelvváltás nyugtájának mércéje **nem létező változó-páron** állt (`got === wanted`), ezért
**minden felületi nyelvváltás `ReferenceError`-ral szakadt meg** — pontosan a nyugta kiírása ELŐTT.
A nyelv váltott (a `lang` attribútum, a feliratok, a tudás-index), de a **kimondott visszajelzés és a
fókusz-visszatérés némán elmaradt**. A hiba az **R195 (2026-10-11)** óta élt a termékben.

**Miért maradt zöld:** három próba is váltott nyelvet a felületen, de **mind csak a KÖVETKEZMÉNYT
mérte** (a `lang` attribútumot és a feliratokat) — a **nyugtát egyik sem**, a kivétel pedig a kezelő
után keletkezik, tehát a lap látható állapota rendben volt.

**Javítva:** a mérce létező, mért értékeken áll (`wanted` = a kért kód, `code` = amit a feloldó
adott), tehát a „nem bekapcsolt nyelvet kértem" eset is **kimondottan** figyelmeztetés.
**A gépi jel oda került, ahol a szabály él:** az i18n-próba (`R97-02`) megméri a nyugta
megjelenését és azt, hogy a mondata a **kapott nyelv csomagjából** jön.
**Visszacsúszási ellenpróba MÉRVE:** a régi sorral a próba **PIROS** („a nyelvváltás nyugtája
megjelenik").

---

## 4. AZ ÁTADÁS — EREDMÉNY ÉS AKADÁLY, KIMONDVA

**A link (változatlan csomag, 2. verzió):** **https://claude.ai/artifact/4qNw1cyDf5Qk8xPKbwMsyr**

**A hozzáférés, pontosan.** Ez az artifact **privát**: csak a **tulajdonos** (az operátor
claude.ai-fiókja) és akinek ő megosztási jogot ad, tudja megnyitni. A chatgpt-v3 által látott
*„Sign in to view this page"* lap ezért **hozzáférési korlát abban a böngészőben**, nem csomaghiba —
és nem bizonyítja, hogy az operátor saját fiókjában ne működne. **A megosztást én nem tudom
átállítani** (azt a lap „Share" menüje végzi, a tulajdonosnál). Jelszót nem kértem, hozzáférést nem
lazítottam.

**ÁTADÁSI STÁTUSZ: a csomag ÁTADVA, a VÉGLEGES HOST ellenőrzése NEM IGAZOLT.**

| amit ellenőriztem | amit NEM |
|---|---|
| a publikált alak mind a **20 fájlt** hordozza, helyes tartalomtípussal, teljes tartalommal (visszaolvasva) | a végleges host **testvérfájl-feloldása** a lap saját címe alatt |
| a **bájtra ugyanez** a csomag sima statikus kiszolgálóról **végigkattintható** (a §2 táblája) | a publikált lap **tényleges böngésző-megjelenítése** |

**A pontos akadály:** a végleges előnézet megnyitásához **bejelentkezett claude.ai böngésző-munkamenet**
kell; ebben a futtató környezetben **nincs** ilyen (és jelszót nem kérek, hozzáférést nem lazítok).
Ismételt vak próbálkozást nem végeztem, új felhős telepítést nem indítottam.

**Ha a befogadó mégsem szolgálná ki a testvérfájlokat:** a lap **nem** üres képernyőt ad — a
bemutató-lap 8 másodperc után **nevezett mondatot** ír ki (mi történt, hogy a csomag tartalma rendben
van, és mi a működő folytatás). Ezt az R206-ban építettem be, és a bejárás pozitív ága **méri, hogy
működő csomagnál NEM jelenik meg**. Ez a mondat a mai állapot szerint **tervezett viselkedés**, nem
mért eset — ha az operátor üres lapot vagy ezt a mondatot látja, a csomagot **egy körben** az átadási
felülettel kompatibilis alakra építem át (a meglévő felületi forrásból, második UX nélkül).

**Két konkrét lépés, amit csak a tulajdonos tud megtenni:** (1) nyissa meg a linket a saját
claude.ai-fiókjában, és írja meg, mit lát; (2) ha a chatgpt-v3-nak is látnia kell, a lap „Share"
menüjéből ossza meg vele.

**ÉS EGY TÉNY, AMIT A JAVÍTÁS KÖVETELT MEG:** a publikált csomag a 2. verzióban még a **javítás
előtti** `app.js`-t hordozta, tehát a nyelvváltás hibája benne volt. Ezért a kapu UTÁN, a **végleges
kódból épült** csomagot publikáltam ugyanarra a linkre (**3. verzió**). Mérve, a publikált alak
fájl-listájával összevetve: mind a **19 kísérő fájl bájtra egyezik** a csomaggal (`app.js` **260 092**
bájt — a javítás mérete is benne), az `index.html` a publikált alakban 364 bájttal nagyobb, mert a
befogadó a saját vázát (doctype · head · alap-stílus) teszi a lapunk körül — ezt visszaolvasva is
látom, és ez nem tartalmi eltérés.

---

## 5. MÉRÉSEK — ÚJ · KORÁBBI · NEM FUTOTT

**A kötelező böngésző-kapu (a végleges kódon, `566424c`): PASS** — a teljes napló:
`var/logs/r208_browser_gate.log`.

| lánc | eredmény |
|---|---|
| `test:e2e + proof:core-ux` | **ZÖLD, 644 s** — **157 helyzet · 0 bukott · 0 ingadozó · 0 kihagyott · mind a 27 próbafájl mérve** |
| `proof:demo-walk` | **ZÖLD, 481 s** (a BEMUTATÓ-felület tanúja — lásd §1) |
| `docs:kiprobalas-kepek` | **ZÖLD, 38 s** (valódi `startServer` + eldobható SQLite) |
| `proof:bemutato-artifact` *(a kibővített lánc)* | **ZÖLD, 25 s** |
| záró sor | **„MINDEN deklarált lánc TÉNYLEGESEN elindult"** |

**Új mérés ebben a körben:** a bájt-azonosság (20 fájl) · a nyelvcsomagok éles váltása a csomagban ·
mind a két vezetett történet indulása/haladása/kilépése · az `R97-02` nyugta-állítása · és a
visszacsúszási ellenpróba a nyelvváltás javítására (**a régi sorral PIROS**).
**Korábbi, változatlan mérés:** `verify:kuka` **1273/1273** (1270 volt — egy új bejegyzés) ·
`verify:i18n` 49/49 + 6/6 · `verify:tutor` 94/94 + 14/14 · `verify:bemutato-artifact` 10/10 ·
`verify:browser-gate-plan` 10/10 · `verify:decision-numbers` 4/4 · `verify:doc-html` 9/9.

**NEM futott, és miért (kimondva):** `verify:v3ref` (a mag `v3ref/` alatt **0 fájl** változott) ·
`verify:external-checks` (nincs bemeneti érintettség) · PostgreSQL-láncok (tárolót, migrációt,
mentést nem érintettem) · teljes `verify:sweep` (a SPEC §4 szerint a kiadási kapu ebben a körben a
böngésző-kapu). **A „nem futott" nem „zöld"** (`KUKA-206`): ezekről csak annyit állítok, hogy a
**bemenetük** nem változott. Újrahasznált bizonyítékra ebben a körben sem hivatkoztam.

**A konkrét érintettség, amiért a TELJES kapu futott** (a SPEC §4 kérése): a `v3app/public/app.js`
**termékkód** változott (a nyelvváltás javítása), és vele a próba-kód (`tests/e2e/v3app-r97.spec.mjs`
+ `tools/v3_bemutato_artifact_proof.mjs`). Mind a négy lánc betölti az `app.js`-t, tehát mind a négy
érintett volt — ezért nem célzott újramérés, hanem **egy teljes kapu-futás** zárja a kört.

---

## 6. A CSOMAG ÁTADÁSA

**A kijelölt munkamenet-ág:** `claude/cmd-vs-300-002-002-r204-2l0dva`; innen **fast-forward** a PR
fejágára (`claude/r154-audit-fix`), friss `git fetch` utáni ősviszony-igazolással, **force-push
nélkül**. A PR frissítése nem a PR merge-elése; merge, telepítés, CMD/PR lezárás nem történt.
A PR leírása az új fejet, a valós mérési hatókört **és a §1 helyesbítését** mondja.

**A ZÁRÓ PR-FEJ, a GitHubról visszaolvasva:** `__FINAL_SHA__`

---

## 7. FOGYASZTÁS — EGY SOR

**Mérve** (`meres:fogyasztas`, modellhívás nélkül · ablak: a parancs board-időbélyegétől a csomag
záró pillanatáig, `2026-10-14T15:25:20Z → 16:08:49Z`): **47 hívás · kimenet 65 177 · cache-olvasás
31 066 204 · ügynök-bemenet 0 (0 ügynök** — a SPEC §4 kizárta az alügynököt). A tartalom nélküli
leltár a repóban: `docs/70_PLANNING/V3_R208_FOGYASZTAS_LELTAR.json`; a mérés gépi alakja
`var/reports/…_160849_fogyasztas.json`.

> **A CHATVÁLTÁSI JELZŐ ELÉRVE, és ezt ki kell mondanom.** A mérő a fő-szál kontextusmediánját
> **665 154**-nek mérte (max 700 636) — a 400 ezres sáv **fölött**. A projekt szabálya szerint
> (`D-VS-3083`) **ez a futó munkablokk célzott ellenőrzéssel lezárható** (ez a jelentés az), a
> **KÖVETKEZŐ önálló nagy blokk viszont friss beszélgetésben induljon.** A lezárás címén nem nyitottam
> új feltárást, új funkciót és nem indítottam opcionális teljes söprést. Gépi jel:
> `verify:fogyasztas-meres` (a sáv-kiírás egy feloldóból jön).

---

## 8. AMIT EZ A JELENTÉS NEM ÁLLÍT

- **Nem** állítja, hogy a végleges host megjelenítése ellenőrzött — az **nem igazolt** (§4).
- **Nem** merge-engedély és **nem** független AI-review: a zöld kapu a saját mérésem.
- **Nem** nyitja újra az `R176-K3` és a *Saját ügyek* tételeket: mindkettő **változatlanul nyitott**,
  egyikre sem indítottam kampányt (a SPEC §1 kikötése).
- **Nem** minősíti sikertelennek a `proof:demo-walk` korábbi futásait: azok zöldek voltak és azok
  maradnak — csak a **hatókörük** megnevezése volt téves.
