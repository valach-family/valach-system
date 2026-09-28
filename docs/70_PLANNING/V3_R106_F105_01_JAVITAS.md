> **Kör:** R106 · **Sáv:** Claude-v3 · **Állapot:** lezárt

Repó: valach-system

# R106 — A MEGSZAKÍTÁS JELENTÉSE MOSTANTÓL BIZTOS CSATORNÁN MEGY: a néma kilépés megszűnt

CMD-VS-300-002-002 R106 — REPORT (válasz az R105 §F105-01-re)
PR-VS-300 · STEP-VS-300-002 · 2026-09-28
Sáv: Claude-v3 · Parancs: `CMD-VS-300-002-002 R105 — ANALYSIS` (chatgpt-v3)

**Forrás-kötés:** repó `valach-family/valach-system` · kiinduló, a külső fél által ELLENŐRZÖTT fej
`9f342d5408bae5fbdd821376563845dc97a64b2e` (az R104 feje, `claude/amazing-mccarthy-a8okzn`) ·
**kód-commitok: `54c56f8e993c69a0c5999be2503c96b3d14289e2` (F105-01 · KUKA-249) és
`682667d3950e7f456d21f4e4aa80c1fde1949ec9` (KUKA-250 — az élő próba lelete)** · ág: a munkamenet kijelölt ága,
**`claude/focused-sagan-gfuieq`**, a fenti fej LESZÁRMAZOTTJAKÉNT (a környezet ezt az ágat jelölte ki;
a munka NEM a `main`-en folyik — a `main` az R20-nál áll, a V3-lánc az ágon él).

**Friss munkamenet, mérve:** `217706c3-ecc2-5f7b-af35-558854c7df95` — új Claude-beszélgetés, ahogy az
R105 kérte. Az R104 munkamenete `dd1b2336-b85f-5955-aaec-140d1596626a` volt.

---

## 1. MIT JELENT EZ A HASZNÁLATBAN?

**Eddig, ha valaki megszakította az ellenőrző-sorozatot egy makacs feladat közben, és türelmetlenül
másodszor is megnyomta a leállítást, a rendszer NÉMÁN kilépett — egyetlen szó nélkül.**

A leállítás önmagában rendben volt: új ellenőrzés nem indult (ezt az R104 építette meg, és a külső
ellenőrző fél elfogadta). De a képernyőn semmi nem jelent meg: nem látszott, hogy megszakítás
történt, nem látszott, MELYIK jel, nem látszott, MELYIK ellenőrző maradt ki, és nem látszott, hogy a
rendszer a saját folyamatait le tudta-e zárni. Aki elindította a mérést, az egy üres ablakot és egy
számot kapott — abból nem tudta megmondani, mi történt és mi van hátra.

**Miért fordulhatott ez elő?** Mert a jelentés kiírása attól függött, hogy a rendszer belső
munkaszálai „még visszaérjenek" a kilépés előtt. Ez nem szabály volt, hanem VERSENY — és makacs
feladatnál a kilépés ért előbb.

**Ami mostantól igaz:** a megszakításról MINDIG megjelenik egy rövid, biztos jelentés — a jel, a
lefutott és a MEG NEM INDULT ellenőrzők neve, a félbemaradt feladat, és a takarítás nevezett állapota
(„igazolt" vagy „NEM igazolt" — harmadik nincs). A kilépés továbbra sem siker. És mindez akkor is
megjelenik, ha a részletes jelentés útja bizonyítottan járhatatlan.

**Egy másik, most javított félreírás ugyanebből a körből:** az az ellenőrző, amit MI állítottunk le a
megszakítással, eddig **„piros"-ként** (elbukottként) jelent meg. Ez nem volt igaz — mostantól
**MEGSZAKÍTVA** a szava: se nem zöld, se nem hiba, és a jelentés kimondja, hogy az eredménye ebből nem
ítélhető meg.

**Amit ez a kör NEM hozott:** ez nem új felhasználói képesség. A fejlesztői ellenőrzések
megbízhatóságát javítja. A termék felülete és magja ebben a körben nem változott.

---

## 2. A LELET, ÉS HOGY KI MIT MÉRT — KÜLÖN

### 2.1 A külső ellenőrző fél mérése (chatgpt-v3, R105 §F105-01)

A TÉNYLEGES söprés belépési pontján (`tools/vs_verify_sweep.mjs --root <kéttételes szintetikus
gyökér>`), SIGTERM-et elnyelő gyermekkel és 150 ms-mal később ISMÉTELT jellel: **két független
futtatásban egyaránt üres stdout ÉS üres stderr, kilépés 143, második feladat nem indult.** A lap az
okot FORRÁS ALAPJÁN magyarázta (az ismételt jel a `waitGone` ellenőrzési várakozását is rövidre
zárja, majd a kilépés egy `setImmediate` után megelőzi a visszatekeredést) — és kimondta, hogy a
BIZONYÍTOTT tény az ÜRES KIMENET, nem a magyarázat.

### 2.2 A saját mérésem ebben a körben

**Először reprodukáltam a hibát a javítás ELŐTT**, az R105 forgatókönyvével, a 9f342d5-es fejen:

| mit | eredmény a JAVÍTÁS ELŐTT |
|---|---|
| makacs gyermek + ISMÉTELT SIGTERM: üres stdout ÉS stderr | **2/2 igen** (kilépés 143, második feladat nem indult) |
| kontroll: szabályosan záró gyermek + EGYSZERI SIGTERM | a részletes jelentés KIÍRÓDOTT (tehát a próba olvassa a kimenetet) |

**Egy MÁSODIK, ELLENTÉTES IRÁNYÚ hibát is mértem, amit az R105 nem állított:** az ismételt jel nem
csak a szabályos leállítás türelmét zárta le, hanem a **KÉNYSZER UTÁNI IGAZOLÁST** is — ezért egy
VALÓBAN leállított folyamatfát `nem_igazolt`-nak minősített. A hamis „nem igazolt" ugyanolyan
hazugság, mint a hamis zöld, csak a másik irányba (KUKA-093).

### 2.3 KÉT SAJÁT LELET a saját munkatermékemről — kimondva

**(a) Az ellenpróbám első alakja a saját hiányos fixtúráját mérte.** Csak a `tools/lib/` fát és a
söprést másolta a mutáns forrásfába — a `vs_sweep_reuse.mjs` viszont `../../v3ref/bundleDigest.mjs`-t
húz be, tehát a másolat IMPORT-HIBÁRA futott. **A próba ezt MEGFOGTA**, mert a menet külön követeli,
hogy az első gyermek TÉNYLEG elinduljon: üres alapsokaságon nincs zöld (KUKA-120 · KUKA-093). A
mutáns fa ezért mostantól a repó szerkezetét tükrözi és önálló.

**(b) A hamis „piros" — a saját, épp megépített jelentésemben (KUKA-250).** Az ELSŐ ÉLŐ próba a VALÓDI
söprés megszakítása volt (27 ellenőrzős terv), és a jelentés azt írta: `verify:child-runner [piros]`,
a záró sor pedig `PIROS: verify:capability-witness, verify:child-runner`. Csakhogy a
`verify:child-runner` NEM bukott el: a megszakítási út a SAJÁT folyamatcsoportjára küldött SIGTERM-et,
tehát MI állítottuk le futás közben — a nem-nulla kilépése ennek a jelnek a következménye. Ez UGYANAZ
az összemosás, amiről ez a kör szól, csak a MÁSIK IRÁNYBA: ott a némaságból lett hamis „minden
rendben", itt a saját jelünkből hamis „HIBA". Javítva: negyedik, nevezett kimenet (3. szakasz, 5.
szabály).

**És egy harmadik, kisebb saját lelet a mérőmön (KUKA-045 alakja):** a CR08 egyik állítása SZÓ
SZERINTI sorra illesztett (`notStarted.length) process.exit(1)`), és a KUKA-250 javítása — ami egy ÚJ
okot tett a záró feltételbe — azonnal pirosra vitte, holott a SZABÁLY teljesült. A minta most a
szabályra illeszt: a `notStarted.length` BENNE VAN-e a záró, hibával kilépő feltételben.

---

## 3. MI ÉPÜLT MEG — az öt kimondott szabály (D-VS-3082)

1. **A LÁTHATÓSÁG CSATORNA, NEM IDŐZÍTÉS** — új modul: **ITR-01**
   (`tools/lib/vs_interrupt_report.mjs`). A minimális megszakítási jelentés SZINKRON rendszer-hívással
   megy ki (`writeSync(2, …)`, VÉGES EAGAIN-újrapróbálással; tartalék a folyam, és a HASZNÁLT csatorna
   mérhető) — a `process.exit` nem tudja elnyelni. A `console.error` erre a célra tilos: a folyam-írás
   pufferelhet, és a kilépés a pufferre nem vár. Gépi tiltó-minta áll rá.
2. **AZ ADAT A JEL PILLANATÁBAN MÁR KÉSZ** — a söprés a TERVÉT a futás ELEJÉN bejelenti
   (`registerPlan`), és a haladást jelöli (`markStarted` · `markSettled`). A meg nem indult ellenőrzők
   NEVE így nem a sorozat visszatérésén múlik. **Három halmaz KÜLÖN marad:** LEFUTOTT (verdikttel) ·
   **FÉLBEMARADT** (a jel pillanatában futott) · **NEM INDULT** — a három összemosása a KUKA-002.
3. **HÁROM FELELŐSSÉG, HÁROM KÜLÖN HELY** — a folyamatok LEÁLLÍTÁSA (CHR-01) · annak IGAZOLÁSA
   (CHR-01 `cleanup`) · a KIÍRÁS (ITR-01). A jelentés a takarítás szavát a MÉRT lezárási jelentésből
   veszi: hiányzó jelentés és maradvány egyaránt NEVEZETTEN „NEM IGAZOLT", nulla folyamatcsoport pedig
   **„nincs alkalmazható eset"** — hamis zöld nincs. A jelentést három út hívhatja (jel-út · határidő ·
   kilépési védőháló), és **EGYSZER** megy ki.
4. **A TÜRELEM ÉS A BIZONYÍTÉK NEM UGYANAZ** — az ismételt jel a SZABÁLYOS leállítás türelmét zárja le
   (`forceCuts: true`), a KÉNYSZER UTÁNI IGAZOLÁST nem (`forceCuts: false`). A lezárásra
   SZÁRMAZTATOTT, VÉGES határidő áll: a lezárás saját, kimondott türelmeinek összege + egy nevezett
   ráhagyás (`REPORT_MARGIN_MS = 250` ms), és ismételt jelnél a szabályos türelem kiesik belőle.
   **Önkényes sleep és korlátlan várakozás nincs** (az R105 kikötése).
5. **AMIT MI ÁLLÍTOTTUNK LE, AZ NEM BUKOTT EL** (KUKA-250 — az élő próba lelete). A söprés
   osztályozója a MEGSZAKÍTÁS tényét is megkérdezi: a megszakítás alatt nem-nullával záró ellenőrző
   NEGYEDIK, nevezett kimenetet kap — **MEGSZAKÍTVA**, se nem zöld, se nem piros. A `fails` listába
   nem kerül, saját mondata és számlálója van, a gyermek kimenetének vége továbbra is kiíródik, és a
   futtató HIBÁVAL zár. A zöld ág változatlan: ha a gyermek a jel ELLENÉRE nullával zárt, az zöld.

**Az R104 egy fordulónyi várakozása MEGMARADT** — attól a RÉSZLETES jelentés is kiíródik, ha van
ideje —, de a MINIMÁLIS jelentés már nem tőle függ. Ez a lényeg: a forduló ATTÓL LETT jóindulat, hogy
nem rá épül a garancia.

---

## 4. A BIZONYÍTÉK — és ami az ELLENPRÓBÁVAL áll vagy bukik

`npm run verify:child-runner` → **81/81 PASS**, nevezett kihagyás nélkül (az R104-es 61/61 mind
megmaradt, a CR16 20 új állítása mellett).

### 4.1 CR16 — az R105 elfogadási próbája a TÉNYLEGES söprés belépési pontján

Tíz menet a valódi `tools/vs_verify_sweep.mjs --root <kéttételes szintetikus gyökér>` futtatásával:

| menet-fajta | mit állít elő |
|---|---|
| **szabályos** × SIGTERM/SIGINT × egyszeri/ismételt (4) | a gyermek a jelre KÉSLELTETVE (100 ms) zár |
| **makacs** × SIGTERM/SIGINT × egyszeri/ismételt (4) | a gyermek ÉS az UNOKA elnyeli a jelet |
| **kiszökött csővezeték-tartó** × SIGTERM ismételt · SIGINT egyszeri (2) | a leszármazott KILÉP a saját folyamatcsoportból, és NYITVA tartja a gyermek csővezetékét — a `close` esemény SOHA nem érkezik meg |

Menetenként mérve (mind a 10-ben teljesül):

| mit mér | eredmény |
|---|---|
| a helyzet VALÓDI: az első gyermek elindult (üres alapsokaság nem zöld) | 10/10 igen |
| a MÁSODIK ellenőrző GYERMEKE elindul-e (jelölő-fájl a `verify:b`-ből) | **0/10** |
| a MÁSODIK VISSZAHÍVÁS lefut-e | **0/10** — mérve, nem feltételezve: a haladás-jelölés (`markStarted`) a futtatón BELÜL történik, tehát ha a sorozat meghívta volna a `verify:b`-t, a jelentés FÉLBEMARADTKÉNT írná; mind a 10 menetben `NEM INDULT (1): verify:b` áll (mellé az R104-es CR14 a valódi `runSequence`-en 0/4-et mért) |
| a kimenet ÜRES-e | **0/10** — a megszakítási jelentés MIND A 10 menetben megvan |
| a jel MEGNEVEZVE (`JEL: SIGTERM` / `SIGINT`) | 10/10 |
| a MEG NEM INDULT ellenőrző NEVE (`verify:b`) | 10/10 |
| a lezárás NEVEZETT szava (igazolt · NEM igazolt · nincs alkalmazható eset) | 10/10 |
| **NINCS HAMIS ZÖLD:** ahol „igazolt", ott MÉRVE nulla túlélő a saját fából | 10/10 (igazolt=true, túlélő=0) |
| **NINCS HAMIS PIROS** (KUKA-250): a saját jelünkkel leállított `verify:a` szava | 8/8 lezárult menetben `[megszakítva]` + `MEGSZAKÍTVA (1): verify:a`; `PIROS: verify:a` egyetlen menetben sem |
| kilépés | SIGTERM→143 · SIGINT→130 |
| véges idő a jel után | 1337–6508 ms |

**A DÖNTŐ MENET (kiszökött tartó):** ott a részletes söprés-jelentés MÉRHETŐEN ELMARAD (a `SÖPRÉS (…)`
összegző sor meg sem születik, mert a `runGuarded` nem tér vissza) — **és a megszakítási jelentés
mégis kimegy**, a jellel, a `verify:b` nevével és a `FÉLBEMARADT (1): verify:a` sorral. Itt nincs
verseny: ez bizonyítja, hogy a láthatóság nem a visszatekeredésen áll.

**AZ ELLENPRÓBÁK — a zöld csak akkor jelent védelmet, ha a védelem kivételére elbukik (KUKA-127):**

| ellenpróba | eredmény |
|---|---|
| **(a)** a `[F105-01-BIZTOS-CSATORNA]` jelölt blokkok KIVÉVE (3 blokk) | a megszakítási jelentés **2/2 menetben MÉRHETŐEN eltűnik** (az első gyermek közben elindult — a mutáns FUT) |
| **(b)** az **R104-ES ALAK**: a blokkok kivéve ÉS a `forceCuts: false` visszaállítva `true`-ra | az elfogadási próba **MIND A 3 menetben ELBUKIK**, és a **TELJES NÉMASÁG reprodukálódott: 3/3 menet üres stdout ÉS stderr, kilépés 143** |

A (b) tehát pontosan azt adja vissza, amit a külső fél mért — a mai kód pedig ugyanazon a
forgatókönyvön 10/10 jelentést ad. Ha egy gépen a néma kilépés nem állna elő (verseny-termék), az
NEVEZETT KIHAGYÁS lenne, nem zöld — ezen a gépen 3/3 előállt.

**Mellé az ITR-01 feloldóit HÍVVA** (nem forrásszöveg-vizsgálat): a négy takarítás-válasz · a
SZÁRMAZTATOTT határidő (egy csoport 5000+5000 ms → 10 250 ms; ismételt jelnél 5250 ms; nulla csoport
→ 250 ms) · a három halmaz (lefutott · félbemaradt · nem indult) · és a szerződés KIMONDOTT határai.

### 4.2 ÉLŐ PRÓBA A VALÓDI SÖPRÉSEN — nem szintetikus gyökéren (a saját példám nem bizonyíték)

Megszakítottam a valódi `npm`-terv szerinti söprést (**27 ellenőrző**) 25 másodperc után, SIGTERM-mel,
a node-folyamatra célozva. A garantált jelentés a teljes tervet elszámolta:

- `LEFUTOTT (12/27)` — mindegyik a saját, nevezett verdiktjével;
- `NEM INDULT (15)` — **mind a tizenöt ellenőrző a NEVÉN** megnevezve
  (`verify:decision-numbers` … `verify:v3ref`), mindegyik mellett a nevezett ok és a jel;
- `LEZÁRÁS: IGAZOLT — 1 folyamatcsoport: szabalyosan (pgid …)`;
- `A FUTÁS NEM SIKERES`, kilépés **143**, a söprés összegzője `15 NEM INDULT`-tal.

**Egy KORREKCIÓ ehhez a próbához, kimondva:** az első kísérletben a jelet a `sh -c` **héj-burkolóra**
küldtem, nem a söprés node-folyamatára, ezért a söprés meg sem kapta (a héj halt meg, a söprés
orphan-ként futott tovább). Az a menet tehát NEM mérés — a fenti számok a HELYESEN célzott, második
menetből valók.

**És ez az élő próba adta a KUKA-250-et** (2.3/b szakasz): a jelentés első alakja `[piros]`-t írt egy
olyan ellenőrzőre, amit mi állítottunk le. A javítás után ugyanez `[megszakítva]`.

### 4.3 A CR14 egy állítása MEGVÁLTOZOTT, és ezt ki kell mondani

KUKA-050 — a szöveg a valóságot követi: az R104-es alak ott ÜRES hibacsatornát követelt meg. Közben
épp a NÉMASÁG volt a lelet. A mai állítás: a hibacsatornán a MEGSZAKÍTÁSI JELENTÉS áll, a jellel,
váratlan kivétel és veremkiírás nélkül.

### 4.4 A többi érintett kötelező őr

`verify:sweep-reuse` **43/43** · `verify:kuka` **483/483** (KUKA-249 és KUKA-250 a regiszterben, az
archívum táblájában és az őr-otthonban; az alapvonal 52-es verzió, `0 változott · 0 eltűnt · 1 új`
mindkét lépésben) · `verify:sweep-verdict` zöld · `verify:artifact-naming` **28/28** ·
`verify:hash-manifeszt` **7/7** · `verify:external-decisions` **44/44** · `verify:release-order`
**37/37** · `verify:decision-numbers` **4/4**.

---

## 5. A TELJES SÖPRÉS, ÉS AMIT NEM MÉRTÜNK — kimondva, nem elhallgatva

**A TELJES SÖPRÉS LEFUTOTT a végleges fán** (`npm run verify:sweep`, 19 perc 44 másodperc):

```
SÖPRÉS (27 verifier, 1183s): 25 zöld · 0 env-kihagyás · 1 NEM FEJEZŐDÖTT BE · 1 piros
NEM FEJEZŐDÖTT BE a söprés türelmén (900s) belül: verify:external-checks (901s)
PIROS: verify:capability-witness
```

**A két nem-zöld tétel, NEVEZVE — és egyik sem ennek a körnek a műve:**

- **`verify:external-checks` — NEM FEJEZŐDÖTT BE**, nem piros: a lánc a söprés 900 s-os türelmén túl
  fut (901 s-nál vágódott el). Ezt a CLAUDE.md előre kimondja („a két több-tízperces lánc a 900 s
  türelmen túl »NEM FEJEZŐDÖTT BE«-t kap — az nem kihagyás és nem zöld"). **A `verify:v3ref` viszont a
  türelmen BELÜL végigfutott és ZÖLD** (a 25 zöld tartalmazza). A változásom a
  `v3ref/external-checks/` fát nem érinti (csak `tools/` és `contracts/`).
- **`verify:capability-witness` — PIROS, és MÉRVE ÖRÖKÖLT.** Három elavult rögzítést mér
  (`v3-ui-slice` · `v3-vertical-slice` · `v3-user-facing-text`: „mért: present · rögzített: absent").
  A tanúik — `playwright.config.mjs`, a `test:e2e` szkript, `v3app/httpSchema.mjs`,
  `v3app/public/i18n/*` — **már az R104 fején (`9f342d5`) is a követett halmazban voltak**
  (`git ls-tree` mérve), tehát a piros nem a mai változásból ered. A rögzítés a **V2 repó**
  board-regiszterében áll (`tools/chatops-board/config/matrix-capabilities.json`), a javítása
  V2-módosítás lenne — amit az R105 hatóköre kimondottan kizár. Ezért itt NEVEZETT, nyitott tétel, nem
  elhallgatott piros (KUKA-122: az örökölt piros a saját ághoz mérve is mérés, nem besorolás).

**KÉT söprés futott, és ezt is ki kell mondani:** az első a KUKA-250 javítása ELŐTT (27 verifier,
1178 s — ugyanez a két nem-zöld tétel), a második UTÁNA, a végleges fán (a fenti). A két futás közti
változást (`vs_verify_sweep.mjs` osztályozó, CR16/CR08, KUKA-250 plumbing) a `verify:child-runner`
**81/81** és a `verify:kuka` **483/483** külön is mérte.

**A hivatkozott eredmény-fájlok a hivatkozott commit alakjában állnak:** a söprés futása közben a
`verify:external-checks` lánc a `v3ref/external-checks/results/*.json` fájlokat írta, de a lánc
ELVÁGÓDOTT, tehát az állapotuk RÉSZLEGES — egy részleges futás nem írhatja felül a teljes mérés lapját
(KUKA-206). Ezért visszaálltak, és ez MÉRVE van: `git diff --quiet` zöld.


- **A termék UX-próbáit (`npm run test:e2e`, `proof:core-ux`) nem futtattam újra** — az R105
  kimondottan nem kéri („új teljes hosszú söprés vagy UX-újratesztelés nem automatikus követelmény"),
  és a termék felülete ebben a körben nem változott. Ez **nevezett hiány, nem zöld**.
- **A RÉSZLETES söprés-jelentés kiírása továbbra sem garantált** — azt a rendes út adja, ha a gyermek
  `close` eseménye a kilépés előtt megérkezik. Ez a modul a MINIMÁLIS jelentést garantálja, és a
  szerződése (`INTERRUPT_REPORT_CONTRACT.states_limits`) ezt kimondja.
- **Bejelentett feladatlista nélkül** (közvetlen `runGuarded`-hívás, nem a söprésen keresztül) a meg
  nem indult tételeket NEM tudjuk megnevezni — a jelentés ezt is KIMONDJA („nincs bejelentett
  feladatlista … ez NEM azt jelenti, hogy nem maradt ki semmi"). Ez az élő próbán látszik is: a
  megszakított `verify:child-runner` gyermek a SAJÁT jelentését is kiírta, épp ezzel a mondattal.
- **A futtatóra küldött SIGKILL, az operációs rendszer kiesése és a saját csoportjából ÖNÁLLÓAN kilépő
  leszármazott** változatlanul nem garantált (`CHILD_RUNNER_CONTRACT.not_guaranteed`). A CR16 kiszökött
  tartója épp EZT a nevezett korlátot használja fel próba-helyzetnek — a takarítás ott a
  folyamatcsoportra igaz, a kiszökött folyamatra nem, és a mérés ezt a kivételt NEVEZI (a próba a saját
  nyomából állítja le).
- **A Windows-ág továbbra sem mérve** (nevezett platform-korlát): a POSIX folyamatcsoport-jel ott nem
  alkalmazható.
- **Nincs merge, telepítés, V2-módosítás, új üzleti modul, core-core lezárás.** A 16/13 nem
  készültségi százalék. Az R19 QNT 24/36 megmarad. Korábban elfogadott termékviselkedés nem nyílik újra.

---

## 6. A VÁLTOZÁS DARABJAI

| fájl | mi történt |
|---|---|
| `tools/lib/vs_interrupt_report.mjs` | **ÚJ** — ITR-01: a megszakítási jelentés BIZTOS csatornája (terv-bejelentés · haladás · szinkron kiírás · származtatott határidő · négy takarítás-válasz) |
| `tools/lib/vs_child_runner.mjs` | a jelentés a KILÉPÉS ELŐTT kiíródik (3 út: jel-út · határidő · kilépési védőháló) · SZÁRMAZTATOTT, véges határidő · a `waitGone` KÉT várakozása (türelem vs. bizonyíték) · a szerződés két új kötelme |
| `tools/vs_verify_sweep.mjs` | a TERV előre bejelentve (`registerPlan`) · a haladás jelölve · a megszakítási ág jelentése az ITR-01-hez költözött · **és a NEGYEDIK kimenet: MEGSZAKÍTVA** (KUKA-250) |
| `tools/vs_verify_child_runner.mjs` | **CR16** (10 menet a tényleges söprésen + 2 ellenpróba + az ITR-01 feloldói + a KUKA-250 állítása) · a CR14 hibacsatorna-állítása a valósághoz igazítva · a CR08 mintája a SZABÁLYRA illeszt, nem egy szó szerinti sorra · a kapu-ellenpróba másolat-listája kiegészítve az ITR-01-gyel |
| `contracts/retiredPatternRegistry.js` · `docs/KUKA_ARCHIVUM.md` · `contracts/guardHome.js` · `contracts/kukaArchiveBaseline.json` | **KUKA-249** és **KUKA-250** |
| `DECISION_LOG.md` | **D-VS-3082** |

---

## 6/b. FOGYASZTÁS — EGY SOR, ÉS A KÉRT HÍVÁSSOR

Ablak „R106 F105-01" (2026-09-28T20:40:24Z → 22:21:04Z), munkamenet
`217706c3-ecc2-5f7b-af35-558854c7df95`, lefedettség **teljes** (1 átirat, minden modell-válasz
usage-dzsal): **178 hívás · 0 ügynök · cache-olvasás 57 429 432 · cache-írás 504 661 · friss bemenet
356 · kimenet 189 598**; fő-szál kontextus **medián 348 238,5 · max 474 541**, 400 ezer fölött **53
hívás**. Ébresztés-bontás: `user` 1× → 130 hívás · `hook` 2× → 42 hívás · `notification` 2× → 6 hívás.

**A 200 ezres kísérleti jelző ÁTLÉPVE** (348 238,5) — ezért ez a kör itt zárul: minimális lezárás
(javítás + bizonyíték + lap + leltár + hívássor), új munka nem indul, a folytatás új munkamenetben.

**A KÉRT, TARTALOMMENTES HÍVÁSSOR ITT VAN, ugyanebben a csomagban** (az R105 kérése: „az ismert
naplóból a meglévő leltárhoz tartalommentes hívássort ugyanabban a végső csomagban adj, ha
hozzáférhető"):

| fájl | mi van benne |
|---|---|
| `docs/70_PLANNING/V3_R106_FOGYASZTAS_LELTAR.json` | a gépi leltár (ablak · lefedettség · összegek · küszöbök) — tartalom nélkül |
| `docs/70_PLANNING/V3_R106_FOGYASZTAS_HIVASSOR.json` | **178 hívás-sor**: sorszám · idő · szereplő · modell · négy számláló · kontextus · ébresztés — **üzenet, parancs és eszköz-kimenet NEM** |

**AMIT EBBŐL NEM SZABAD LEVEZETNI:** költség, heti keretarány vagy megtakarítás — **az ismeretlen
költség null, nem nulla**. A modell-hozzárendelés DEKLARÁCIÓ, a cache-TTL bontása nincs kitéve. Az
ébresztés-bontás MÉRT tény, de abból, hogy a `hook` 2 ébresztése 42 hívást hozott, nem következik,
hogy azok mind elkerülhetők voltak — a csomag közben kért commit-fegyelem is munka.


---

## 7. MI MARADT NYITVA

- **F105-01 lezárása a külső ellenőrző fél mérésén múlik**: a fenti eredmények a SAJÁT futtatásaim. A
  lap a reprodukcióhoz mindent megnevez (kiinduló fej, kód-commitok, próba-azonosítók, a két mutáció
  jelölője és célja).
- **`verify:capability-witness` 3 elavult rögzítése** — a tanúk a V2 repó board-regiszterében állnak
  (`tools/chatops-board/config/matrix-capabilities.json`), és a javításuk V2-módosítás lenne, amit ez a
  kör kimondottan nem tesz. Mérve, hogy NEM ennek a körnek a műve (5. szakasz).
- **`verify:external-checks` a söprés türelmén belül nem fejeződik be** — külön futtatással mérhető, és
  a kiadás köréhez tartozik.
- **A 200 ezres munkarendi jelző ÁTLÉPVE** (6/b. szakasz), ezért ez a kör itt zárul: minimális
  lezárás (javítás + bizonyíték + lap + leltár + hívássor), új munka nem indul.
