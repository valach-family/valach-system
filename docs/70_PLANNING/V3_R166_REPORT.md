# V3 · R166 — JELENTÉS

**Kör:** `CMD-VS-300-002-002 R166 — DECISION` (chatgpt-v3, az operátor felhatalmazásával)
**Sáv:** Claude-v3 · **Ág:** `claude/cmd-vs-300-002-002-r166-x7rrk4` (a PR #1 fejére épülve)
**Dátum:** 2026-10-07

Ez a lap az R166 **egyetlen** jelentése. Az átadási checkpoint (`V3_R166_ATADAS_CHECKPOINT.md`) a
RÉGI munkamenet zárása volt; ez a lap az ÚJ munkamenet eredménye.

---

## 1. AZ ÖSSZVERDIKT — KIMONDVA

| | |
|---|---|
| **Kód-SHA (a csomag feje)** | lásd a lap alján: `git log -1` ezen az ágon |
| **A review által FEDETT SHA** | `3fea359` — az azóta született **összes** munka (a nyitott P1 javítása, az R166 §1 és §3) **NEM fedett**: a mai fejre nincs független review-bizonyíték |
| **R166 §0 átadás** | **KÉSZ** — a checkpoint ellenőrizve, a régi író leállt, a munka a PR aktuális fejére épült (force-push nélkül) |
| **R166/P1 (a nyitott review-szál)** | **KÉSZ és MÉRVE** — `D-VS-3201` · `KUKA-393` |
| **R166 §1 (meghívóképernyő)** | **KÉSZ és MÉRVE** — a böngészős mérés, ami eddig **bejárhatatlan** volt, lefutott |
| **R166 §3 (19 pótolható lefedési hiány)** | **KÉSZ** — elfogadási cél: pótolható **0** · osztályozatlan **0** (`LT2` ZÖLD); `D-VS-3202` · `KUKA-394` |
| **R166 §2 (valódi két szereplős bejárás)** | **NEM KÉSZÜLT EL** — átadva, lásd a 6. szakaszt. Nem állítom késznek |
| **R166 §4 (hat külső program)** | **NEM FUTOTT** — átadva, lásd a 6. szakaszt. A `verify:external-checks` továbbra is **NEM TELJES** |
| **R166 §5 (nevezett szöveghiba)** | **KÉSZ** — az `E4e` sor már javítva volt (a régi munkamenet elvégezte), és a kód ezt mondja (`E9b`: nem nulla kilépés → BUKÁS) |
| **Merge-készség** | **NEM.** Két parancs-pont nem készült el, a külső-ellenőrző lánc nem teljes, és a mai fejnek nincs független review-ja |

**MIÉRT NEM KÉSZÜLT EL MINDEN, ÉS EZ NEM KIFOGÁS, HANEM A SZABÁLY ALKALMAZÁSA.** A `D-VS-3083`
mérce szerint a fő-szál kontextusmediánja a munkablokk zárásánál **396 717,5** — a 300–400 ezres
FIGYELMEZTETŐ sáv felső határa. A szabály kimondja: a **futó** munkablokk célzott ellenőrzéssel
lezárható, a **következő önálló nagy blokk** pedig friss beszélgetésben induljon. A §2 (valódi
bejárás a felületen) és a §4 (hat hosszú program) MINDKETTŐ önálló nagy blokk. Ezért zártam a
futót, és adom át a kettőt — nem félkészen, hanem **el sem kezdve**, kimondva.

---

## 2. R166/P1 — A NYITOTT REVIEW-SZÁL (az átvevő ELSŐ teendője)

A nyolcadik review-kör P1-je (`#discussion_r4207213198`): *„Strip node-postgres `db` overrides when
retargeting"*. A szálat **nem** zártam le „nem reprodukálható" címen.

**A MÉRÉS ELŐBB.** A kitűzött könyvtáron (`pg-connection-string` **2.14.1**) a **leírt eset nem áll
elő**: a hálózati sémán az út feltétel nélkül győz, mind a négy mért cím `original`-t adott. **A
mechanizmus viszont valódi, csak a `socket:` sémán** — és ott a kár **néma** volt:

| | RÉGI | ÚJ |
|---|---|---|
| `effectiveDatabase('socket:/var/run/postgresql?db=eles')` | **`var/run/postgresql`** (az ÚT!) | **`eles`** |
| `sameDatabase(…, 'eles')` → a biztonsági kapu | **ÁTENGED** → `DROP DATABASE "eles"` a **valódi** adatbázison | **MEGÁLL** |
| `withDatabase(…, friss_cél)` | az **ÚTAT** írja át (a socket-könyvtárat), a `?db=` érintetlen → az átirányítás nem irányít át | az **ÚT érintetlen**, a `?db=` kapja a nevet |

**A javítás egy otthonban:** `PG_URL_SHAPES` + `pgUrlShape` zárt listával, és mind a **négy** feloldó
(`effectiveDatabase` · `withDatabase` · `effectiveHost` · `cliEnvFor`) erre ágazik. Ahol a **két
fogyasztó** (node-postgres a kódban, libpq a `pg_dump`/`psql` gyermekben) **mást olvas**, a név
**nem megállapítható**. Ismeretlen sémán a `withDatabase` nevezett `TypeError`-ral megáll.

**A bizonyíték — ellenpár a KÁRRA, nem a listára:**

- `verify:app-findings-r154` **AC csoport (ac1–ac8)**, a söprésben → a battéria **250/250 PASS**;
- `proof:pg-restore-safety` **E10a–E10e**, VALÓDI kiszolgálón, Unix-socketen: a régi alak kapcsolata
  nem a friss célra ment · az új alak **a friss célra** ment · az **eredeti adatbázis érintetlen**
  (0 nyom) · a nyom **a friss célban** áll · a CLI-környezet a socket-könyvtárat kapja. A lánc
  **48/48** (volt 43/43); a socket-könyvtár a **kiszolgálótól** jött, nem tippből;
- **visszacsúszás-próba mérve:** a séma-sort és a divergencia-blokkot visszaállítva a battéria **11
  pinje piros**, köztük az `ac3` — a kapu újra átengedte volna a valódi adatbázist;
- a három pg-lánc **újramérve**: `proof:pg-intent` **10 állítás / 0 eltérés** ·
  `proof:pg-restore-safety` **48/48** · `proof:pg-durability` **13/13**, valódi PostgreSQL **16.15**-en.

**ÉS A SAJÁT PINJEIM NÉGY ÁLLÍTÁSÁT ÁT KELLETT ÍRNOM.** Az `r5` · `w1` · `y2` · `aa2` a `?dbname=`
**libpq-olvasatát** állította eldöntött névnek — ez **fél igazság** volt. Ma az **eltérést** állítják,
tehát erősebbek: a kapu **mindkét** névre megáll. A `KUKA-326` gépi jele is a mai alakra igazítva.

A szálra a PR-on **válaszoltam**, a mérésekkel együtt.

---

## 3. R166 §1 — A MEGHÍVÓKÉPERNYŐ NEM ZSÁKUTCA

**A termék-döntés megszületett, és a vele együtt megnyíló mérés is lefutott.** Az R164 jelentés 8/7.
tétele ezt **nevezett maradék résként** adta át: a meghívó-képernyő a teljes alkalmazás-héjat
lecseréli, ezért ott **nincs profil-menü és nincs kilépés-vezérlő** — a felületen nem volt út, amin a
meghívó-jegy a címsorban állva kilépés érné. A `KUKA-362`/`KUKA-383` kilépés-ágának böngészős mérése
emiatt volt **bejárhatatlan**.

**Ami megépült** (`v3app/public/app.js`): a folytatás sora (`invite-continue`) **minden**
meghívó-állapoton; `invite-back` a hitelesítési állapothoz igazodó megnevezéssel (belépve a saját
fiókba, belépés nélkül a kezdőlapra); `invite-logout` a **meglévő** `logout` műveleten, tehát a
közös ürítőn. A visszalépés egyetlen hatása a jegy elfelejtése a közös otthonon — **nem fogad el
meghívást és nem módosít tagságot**. A szöveg a közös nyelvi forrásból, mind a **három bekapcsolt
nyelven**; az `invite.accept` `refused` sora is a mai valóságot mondja.

**A MÉRÉS** (`tests/e2e/v3app-r166-invite-leave.spec.mjs`, **7/7**):

| | mit mér |
|---|---|
| **M1** | névtelen: visszalépés a kezdőlapra, a jegy a **címsorból** is elmegy, a **frissítés** nem hozza vissza (nincs hurok), és a meghívó **beváltatlan** marad |
| **M2** | belépett: a **héj** jön vissza, a saját nézetben |
| **M3** | **a kilépés ága**: az előző ember a meghívó-képernyőjéről lép ki, utána **más ember** lép be ugyanabban a böngészőben — a héjban landol, nem az előző ember meghívó-lapján, és a frissítés sem éleszti újra |
| **M4** | mind az **öt** meghívó-állapot kap folytatást: beváltott · visszavont · lejárt (fejlesztői óra) · ismeretlen · más személynek címzett |
| **M5** | a feliratok a nyelvcsomagból, `hu` · `en` · `de` |

**Visszacsúszás-próba:** a folytatás sorát kivéve a lap pirosra vált.

**ÉS EGY SAJÁT MÉRŐHIBA, KIMONDVA.** Az M1 első alakja **abszolút** számot állított a megosztott
tárolón (`COUNT(*) … redeemed_at IS NOT NULL` = 0). Egyedül futtatva **zöld** volt; a teljes
próbasorban **35**-öt adott — 35 másik lap váltott be meghívót. **A rendszer helyes volt, a mérőm
nem** (`KUKA-094`). Ma a mérés a **konkrét** meghívó során áll.

**Átadási kapu:** az új vezérlőt a lefedési őr **azonnal** elkapta új hiányként
(`action:invite-leave`) — regisztrálva az `invite.accept` funkció `ui_actions`-ébe és horgonyai közé.

---

## 4. R166 §3 — MIND A 19 PÓTOLHATÓ LEFEDÉSI HIÁNY LEZÁRVA

**Az elfogadási cél teljesül, és a két kérdés külön áll.**

| mérés | előtte | most |
|---|---|---|
| **pótolható hiány** | 19 | **0** |
| **osztályozatlan** | 0 | **0** |
| nevesített fejlesztési rés | 1 (`page:personal`) | **1** (változatlanul, kimondva) |
| **bemutató-lefedés** | 21/33 mért lépéssel · „csak szöveg" **12** | **33/33** mért lépéssel · „csak szöveg" **0** |
| oldal-lefedés | 9/17 | **16/17** |
| művelet-lefedés | 42/43 | **43/43** |

**Ahogy lezárult:** tizenkét **működő** funkció SAJÁT, bejárható útmutatót kapott (`tour.verify` ·
`login` · `resend` · `logout` · `personalAccount` · `documents` · `partners` · `assistant` ·
`products` · `stockcard` · `movements` · `outbox`), a `shell.profile` pedig **kimondott közös utat**
(`tour.language/s1`) — eddig ezt csak a `tour_note` **prózája** állította, tehát a gép nem mérte. A
hét lap-hiány ezekkel szűnt meg, és mindegyik olyan lépésen áll, ami a **lapra** mutat, nem egy
minden lapon ott álló héj-horgonyon: az volt a hamis zöld, amit az R164 épp megszüntetett.

**AZ ŐRT NEM GYENGÍTETTEM.** Az `LT` (teljes hiány-halmaz) szövegén és feltételén **egy karaktert sem**
változtattam, és **PIROS marad** az egyetlen megmaradó soron. Az R166 §3 elfogadási célját külön
állítás méri: **`LT2` ZÖLD** — *pótolható 0 · osztályozatlan 0 · a maradék 1 nevesített fejlesztési
rés: `page:personal`*. A két kérdés így nem mosódik össze.

### 4.1 NÉGY VALÓDI HIBA, AMIT CSAK A BÖNGÉSZŐ HOZOTT KI

A statikus őrök (lefedési leltár · tanító-őr · nyelvi őr) **mind zöldek** voltak, miközben:

| lelet | mérve |
|---|---|
| a belépés előtti útmutató **mindig a regisztrációs lapra** vitt — a cél az **egyetlen akkori** ilyen útmutatóból volt általánosítva | a „mutasd meg, hogyan lépek be" a **regisztrációs űrlapon** ért véget (`KUKA-394`) |
| a `tour.resend` célja **másik képernyőn** volt | azonnali nevezett megszakítás (`KUKA-232` osztálya) |
| a `tour.logout` a **céges térben nem létező** `nav-security` menüpontra állt | a Belépés és biztonság csak a **személyes** menüben van; az út a **profil-menűn** megy |
| a `tour.assistant` feltáró-lánca **pontatlan** volt | a kérdés-mezőt nem a súgó megnyitása tárja fel, hanem a **Kérdezz fül** |

**És egy ötödik, a legtanulságosabb — a KIEMELÉS eltűnése.** A nézet újrarajzolása kicserélte a
`main` tartalmát, és ezzel a futó útmutató **kiemelése** eltűnt: a buborék a helyes lépésen maradt,
de **semmit nem mutatott**. A tagok-lap adata ezt eddig is bejelentette (`loadMembers` →
`tourRecheck`), a többi nézet **nem** — egy szabály, sok ház. A javítás **egy** otthonba került: a
`render()` végén, mert a szabály nem az, hogy „a minta-adat megérkezett", hanem hogy „a nézet
újrarajzolt" — így egy **jövőbeli** lekérő sem tud elfelejteni bejelentkezni a listára.

**Két kisebb, ugyanitt javítva:** a megerősítő levél újraküldéséhez vezető gombnak **nem volt
fogantyúja** (`auth-resend-open` — `KUKA-011`: hol kattint?), és a `tour.outbox` feltárója nem
korábbi lépés célja volt — **ezt a `verify:tutor` fogta meg, nem én**.

**És két SAJÁT próba-lapom kézzel írt névsorát ki kellett vezetni** (`KUKA-045` negyedszer): az
`R91-03` egy beírt négy-nevű listához mérte a kizártakat (miközben a saját megjegyzése tiltja ezt),
az `R93` pedig egy kézi bejárási listához. Ma az első **padló** (a korábban kizártak maradnak
kizárva, a halmaz nőhet), a második pedig **két nevezett tanú összege**, közös otthonból olvasott
listával (`tests/e2e/r166Tours.mjs`) — ha egy új útmutató EGYIK tanúba sem kerül be, az állítás
pirosra vált.

### 4.2 A BEJÁRHATÓSÁG ÉLŐ TANÚJA

`tests/e2e/v3app-r166-utmutatok.spec.mjs` — **4/4**:
**U0** a szövegek megléte mind a három bekapcsolt nyelven · **U1** a belépés előttiek végigkattintva ·
**U2** a belépettek végigkattintva · **U3** **390 px** szélességben is. A lap a **nevezett
megszakítást bukásnak** veszi, nem „nincs is baj"-nak.

---

## 5. A MÉRT ÁLLAPOT — SORONKÉNT

| lánc | verdikt |
|---|---|
| `verify:app-findings-r154` (a HTTP-határ és a pg-feloldók) | **ZÖLD — 250/250** (AC csoport: ac1–ac8 új) |
| `proof:pg-intent` | **ZÖLD** — 10 állítás, mindkét tárolón, **0 eltérés**, valódi PostgreSQL 16.15 |
| `proof:pg-restore-safety` | **ZÖLD — 48/48** (E10a–E10e új, Unix-socketen) |
| `proof:pg-durability` | **ZÖLD — 13/13** |
| `verify:kuka` | **ZÖLD — 867/867** (KUKA-393 · KUKA-394 új) |
| `verify:tutor` | **ZÖLD — 94/94** (két új állítás: a zárt listás `auth_view`, és hogy a nézet-nevek a felület forrásában is megvannak) |
| `verify:i18n` | **ZÖLD — 49/49** · ellenpróba 6/6 (809 → **821** kulcs, mind a három bekapcsolt nyelven) |
| `verify:assistant` | **ZÖLD — 55/55** |
| `app:selfcheck` | **ZÖLD — 57/57** |
| `verify:decision-numbers` | **ZÖLD — 4/4** |
| `verify:lefedes` | **17 ZÖLD / 1 PIROS** — a `LT` a nevesített fejlesztési résen (`LT2` ZÖLD: pótolható 0) |
| `verify:browser-gate` (`test:e2e` + `proof:core-ux` + `proof:demo-walk`) | **ZÖLD** — `test:e2e + proof:core-ux` **368 s**, `proof:demo-walk` **440 s** · **133 helyzet teljesült / 0 bukott / 0 ingadozó / 0 kihagyott** |
| `verify:external-checks` | **PIROS / NEM TELJES** — a hat hiányzó program **nem futott** (R166 §4, átadva) |

---

## 6. AMI NEM KÉSZÜLT EL — ÁTADVA, NEM ELHALLGATVA

### 6.1 R166 §2 — a valódi két szereplős bejárás a VS-felületen

**EL SEM KEZDTEM.** Ez önálló nagy blokk, és a `D-VS-3083` sávja szerint friss beszélgetésbe
tartozik. Amit az átvevőnek tudnia kell:

- a `D-VS-3199` felületfüggő elrejtés **nem teljesíti** az R164 kérését, és az R166 §2 ezt
  kimondottan **felülírja**: a két történetet a **tényleges** VS-felületen, valódi HTTP-vel és
  tárolóval kell végigvinni (két böngésző-munkamenet VAGY valódi ki-/belépés);
- **a §1 munkája épp ehhez nyit utat:** a meghívóképernyőn MOST van kilépés és visszalépés, tehát a
  „valódi ki-/belépés" útja a felületen **létezik** — a két szereplős bejárás ezen mehet végig,
  megszemélyesítő éles kapcsoló nélkül (amit az R166 §2 nem is engedélyez);
- a `proof:demo-walk` a **szimulált** adapteren visz végig — pontos jelöléssel; az ő zöldje nem a
  határ zöldje;
- a javítandók a parancs szerint: a **hiányzó utolsó lépés** és a **meghívó elfogadása utáni
  folytatásvesztés**; asztali ÉS **390 px**, újraindítással is; pozitív tesztben a kívánt végeredmény
  a **befejezés**, nem a megszakadás vagy a kihagyás.

### 6.2 R166 §4 — a hat külső ellenőrző program

**NEM FUTOTT.** `r57a` · `r59` · `r57` · `r55` · `r53` (nem futott) és `r59a` (időtúllépött) — hat
program tartalmi verdiktje hiányzik. Amit az átvevőnek tudnia kell:

- a futtatás módja **egyenként**: `node v3ref/external-checks/run-all.mjs --only <prog>`, párhuzamos
  terhelés nélkül;
- a futtató **program-kerete ma 30 perc** (`PROGRAM_BUDGET_MS = 1_800_000`,
  `v3ref/external-checks/run-all.mjs`). Az R166 §4 **engedélyezi** ennek **mért** futásidőhöz
  igazítását — de csak a **szervezési** keretet, a **mutációs egység** 15 000 ms-os korlátját NEM,
  és a korlát nem válhat végtelenné. Az indokot és a megszakítás utáni folytatást rögzíteni kell;
- a részleges futás verdiktje **soha** nem a lánc összverdiktje (ezt a futtató maga mondja ki);
- a **mag kódja ebben a csomagban nem változott** — a `v3ref/` alatt egyetlen termék-fájlt sem
  érintettem (a változás `v3app/`, `tools/`, `contracts/`, `tests/` és `docs/` alatt áll), tehát a
  hat program a mai fejen ugyanazt méri, mint a `3fea359`-en.

### 6.3 Ami korábbról nyitott, és most sem változott

PG 18-kompatibilitás · felhős mentés-visszaállítás · belső teszt-fiók · élő AI-szolgáltató · és a
`personal.ownMatters` nevesített fejlesztési rés. Egyik sem mozdult ebben a körben, és egyiket sem
állítom késznek.

---

## 7. A HELYI PostgreSQL — TITOKMENTESEN

A konténer **eldobható**: friss munkamenetben a klaszter nincs meg, újra kell építeni. Jelszó nincs
és nem is kell: a klaszter csak a hurok-címen hallgat, `trust` hitelesítéssel, szintetikus adattal.
**Nem éles adat és nem felhős kiszolgáló.**

**Egy ÚJ, mért csapda, hogy ne ismétlődjön:** ebben a környezetben a folyamat **root**-ként fut, és
az `initdb` **nevezetten elutasítja** (`initdb: error: cannot be run as root`). A klasztert
jogosulatlan felhasználóval kell felépíteni és indítani (`su postgres -c '…'`), a könyvtárak
tulajdonosát előtte átállítva. A kapcsolat összetevői (gazdagép · port · szerep · adatbázis ·
socket-könyvtár · a binárisok útja) az átadási checkpoint 4. pontjában állnak — **a kapcsolati cím
összeállítva a `.env`-be megy, nem a parancssorba és nem egy lapra.**

---

## 8. AMIT EZ A JELENTÉS NEM ÁLLÍT

- **Nem** állítja, hogy a csomag merge-kész: két parancs-pont nem készült el.
- **Nem** állítja, hogy a mai fejet független fél elfogadta — a review a `3fea359`-et fedi, az azóta
  született munkát **nem**. A **válaszolt vagy lezárt szál nem elfogadás**.
- **Nem** állítja, hogy a külső-ellenőrző lánc zöld: **nem teljes**, hat program verdiktje hiányzik.
  A nem futott nem „részben", és nem zöld (`KUKA-200` · `KUKA-206`).
- **Nem** állítja, hogy a lefedési őr zöld: a `LT` **PIROS**, és az ok nevesítve áll. Az elfogadási
  célt (`LT2`) teljesítettük — a kettő nem ugyanaz.
- **Nem** állítja, hogy a két szereplős történet az alkalmazás-héjban végigvihető: az R166 §2 **nem
  készült el**.
- **Nem** állítja, hogy a PostgreSQL-mérés a Railway üzemére vagy a 18-as verzióra érvényes.
- **Nem** szolgáltatói limit és nem megtakarítási ígéret a fogyasztás-szám.

---

## 9. A FOGYASZTÁS

A csomag ablakán (`--from` a parancs board-időbélyege, `2026-10-07T13:40Z`): **310 hívás** ·
fő-szál kontextusmedián **396 717,5** · max **599 020** · **ügynök-bemenet 0** (nulla al-ügynök) ·
lefedettség **teljes**. A mérő sávja **FIGYELMEZTETÉS** (300–400 ezer), a medián a sáv **felső
határán** — ezért zártam a futó munkablokkot célzott ellenőrzéssel, és ezért megy a §2 és a §4
**friss beszélgetésbe** (`D-VS-3083`). A tartalom nélküli leltár a zárásnál készül.

---

## 10. A DÖNTÉSEK ÉS A TANULSÁGOK

| szám | miről |
|---|---|
| **D-VS-3201** | a kapcsolati cím sémája zárt lista, és a két fogyasztó eltérése megállás |
| **D-VS-3202** | a 19 pótolható lefedési hiány lezárva, és az elfogadási cél külön mérve |
| **KUKA-393** | egy címet annyiféleképpen olvasnak, ahány fogyasztó futtatja |
| **KUKA-394** | amiből egy példa van, abból nem szabad szabályt olvasni — és a regiszter zöldje nem bejárhatóság |
