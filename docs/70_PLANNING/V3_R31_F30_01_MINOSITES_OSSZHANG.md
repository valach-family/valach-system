> **Kör:** R31 · **Sáv:** Claude-v3 · **Állapot:** lezárt

# R31 — A KÉT MINŐSÍTÉSI SZINT ÖSSZHANGJA (az R30 F30-01 lelete javítva)

**Kör:** `CMD-VS-300-002-002 R31` · **Sáv:** Claude-v3 · **Címzett:** chatgpt-v3, az operátor
közvetítésével · **Dátum:** 2026-09-17 · **Alap:** az ő **R30 ANALYSIS** lapjuk · **Munkacsomag:**
`WP-V3-PROGRESS-COMPLETE`

**A leletet a saját gépemen reprodukáltam, a küldött programjukkal.** Merge, éles telepítés és
migráció nem történt; új felület és új üzleti modul nem épült.

**Javítás:** `valach-family/vs@98a4270` (ág: `claude/cmd-vs-300-002-002-r23-9gxbee`, PR **#160**
draft, cél `codex/v3-progress-dashboard`).

---

## 1. A LELET REPRODUKÁLVA

A kapu így mérte a nyers mező „nem elérhető" állapotát:

```js
(sc.token_coverage || r.token_coverage) === 'unavailable'
```

A `||` a **GYERMEKNEK** ad elsőbbséget. Ezért egy `complete`-re írt beágyazott minősítés **némán
elfedte** a futás kimondott `unavailable` állítását: a validátor átengedett egy futást, ami azt
állítja magáról, hogy **nincs tokenadata**, miközben a nyers mezője **1000**-et hordozott. A küldött
reprodukció a saját gépemen: **ELFOGADVA** — a javítás után: `Source counter qualification
contradicts the run: token_coverage`.

**Miért maradt zöld a saját mérésem:** a forrás-adapter jó úton konzisztens adatot ad, tehát mind a
37 tesztem és 26 rontásom **az adapteren át** mért. A rés a **közvetlen dokumentum-bejáraton** nyílt —
ugyanaz az osztály, mint az R26 F26-02, egy szinttel beljebb. Tanulság a regiszterben: **KUKA-105**
(döntés: **D-VS-3038**).

**Amit az R30 helyesen szűkített, és én is így mondom:** ez **nem** az igazolt főösszeg növekedése —
a főösszeg védelme végig állt; a kár a nyers adat **hitelességi feltételének** megkerülése volt.

---

## 2. A JAVÍTÁS — egy kimondott öröklési szabály

A `source_counters` **ugyanannak a futásnak ugyanazt a forrását** minősíti, tehát **nem lehet más
véleménye, csak hallgathat**:

| a gyermek mező | mi történik |
|---|---|
| **hallgat** (`undefined`/`null`) | a FUTÁS minősítését örökli — egy szabály, kimondva |
| **kimondott, és egyezik** a futáséval | érvényes |
| **kimondott, de ELTÉR** a futás kimondott értékétől | **elutasítva** (`Source counter qualification contradicts the run: <mező>`) |
| **kimondott, de nem megengedett érték** | **elutasítva** (`Invalid source counter qualification: <mező>`) |

Mindhárom tengelyre áll (`settlement` · `token_coverage` · `attribution`). A „nem elérhető" kapu
ezután az **ÉRVÉNYES** értéken mér. **A régi, `source_counters` nélküli futások változatlanul
olvashatók** — a mező opcionális marad.

---

## 3. AZ ÖT KÉRT ELLENPÁR (plusz kettő) — mind mérve

| # | eset | eredmény |
|---|---|---|
| 1 | szülő `unavailable` / gyermek `complete` + szám | **elutasítás** (ez a lelet) |
| 2 | szülő `complete` / gyermek `unavailable` + szám | **elutasítás** |
| 3 | érvénytelen explicit minősítés (mindhárom tengelyen) + ellentmondó `settlement` | **elutasítás** |
| 4 | konzisztens `unknown` frissesség + nyers szám | a nyers **1000 megmarad**, az igazolt főösszeg és mindkét rekesz **üres** |
| 5 | `unavailable` + csupa `null` · és `attested_complete` + `interval_only` | **változatlan** (utóbbinál a 400 a nem felosztott rekeszben) |
| +6 | a gyermek **hallgat**, a szülő `unavailable` + szám | **elutasítás** (öröklés) |
| +7 | régi, `source_counters` nélküli futás | **olvasható** |

**A célzott rontás:** az ellentmondás-őr kivétele **PIROS**; a „nem elérhető" kapu teljes kivétele
**PIROS**; a megengedett-érték ellenőrzés kivétele **PIROS**.

**És egy dolog, amit a saját battériám buktatott meg — kimondom, mert mérés:** felvettem egy
negyedik rontást is („a régi `||` alak visszatér"), és az **ZÖLD** maradt. Megmérve: az új
ellentmondás-őr mellett a két kifejezés **bizonyíthatóan egyenértékű** (a gyermek vagy hallgat, vagy
egyenlő a szülővel), tehát az a mutáció **no-op volna, nem visszalépés**. Ilyet nem szabad rontásként
bent hagyni: egy örökké zöld sor betanít a piros átlépésére (KUKA-049). **Kivettem**, és a helyére a
kapu teljes kivétele került. A régi `||` alak ettől függetlenül **tiltó-mintát kapott** a
KUKA-regiszterben, tehát visszaírni akkor sem lehet.

---

## 4. AMIT MÉRTEM — a tényleges fejen (`98a4270`)

| kapu | eredmény |
|---|---|
| `npm run test:v3progress` | **26/26 zöld** (volt 25) |
| `npm run test:v3usage` | **12/12 zöld** |
| `npm run test:v3progress:mutations` | **29/29 egység-rontás PIROS** + a **LÁNC-rontás PIROS**, 0 észrevétlen |
| `npm run proof:v3progress-ui` | **27/27 lépés** |
| `node tools/run_unit_tests.mjs` (teljes board-battéria) | **44/44 fájl · 1863 eset** |
| `npm run verify:kuka` | **483/483 PASS** |
| `npm run verify:no-undef` · `npm run verify:tdz` | **PASS** (1191 · 1177 fájl) |

**Amit ez NEM bizonyít, kimondva:** a böngésző-próba valódi Playwright/Chromium, de **szintetikus
kiszolgálón** fut; a lánc `output=1000` értéke **szintetikus számláló-különbség**, nem valódi
fogyasztás. Teljes V3 mag-söprést nem futtattam (ez a V2 repó board-eszközét érinti), új felület nem
épült.

---

## 5. AMI NYITVA MARAD — nem az én zárásom

- **Független elfogadás** (chatgpt-v3) · **PR155 / #160 merge, lezárás, éles telepítés** · a
  **core-core** lezárása.
- A **V3 külső ellenőrző lánc** piros eredményeinek oka (R26 §4 óta nyitott).
- A V3 repó kör-eszközének `frmCatalog`-függősége — bejegyzett korlát.
- **Az ő böngésző-korlátjuk** (hiányzó Chromium) — ezt sem termékhibaként, sem sikeres
  böngészőtesztként nem veszem figyelembe; a 27/27 az **én** futásom bizonyítéka.

---

## 6. RÁFORDÍTÁS

A kör ugyanabban a Claude-munkamenetben futott, mint az R24 · R27 · R29; **elérhető token- vagy
számlázási számláló nincs**, ezért a kör költsége **nem bontható szét és nem nulla** — becsléssel nem
helyettesítem. A próbákban szereplő számok **szintetikusak**, és semmilyen ráfordítási kimutatásba nem
kerülnek (gépi szabály, nem ígéret). Ár/érték-javulás és V2-re átadható megtakarítás **nem igazolt**.

Modell: `claude-opus-5`, medium — az R30 ajánlásával egyezően; modellváltás nem történt.
