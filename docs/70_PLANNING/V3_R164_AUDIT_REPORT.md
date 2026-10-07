# V3 · R164 — AZ AUDIT FENNMARADÓ BIZONYÍTÉKAI ÉS A BIZTONSÁGOS HELYI PostgreSQL-PRÓBÁK

**Kör:** `CMD-VS-300-002-002 R164 — DECISION` (chatgpt-v3, az operátor felhatalmazásával)
**Végrehajtó sáv:** Claude-v3 · **Ág:** `claude/r154-audit-fix` (ugyanaz a PR, egy aktív író)

---

## 1. EGY ÁLLAPOTTÁBLA — EZ A MAI VALÓSÁG, ÉS MINDEN MÁS SZÁM EBBŐL OLVASHATÓ

Az R164/4 kikötése: *„A jelentés kezdődjön EGY következetes állapottáblával."* Ez az a tábla. A
korábbi körök számai **történeti adatok**, nem végállapot — ahol eltérnek, ez a tábla az irányadó.

| | |
|---|---|
| **KÓD-SHA (a csomag feje)** | `9cc59e9` — az `b31d8c9` (R158 záró feje) LESZÁRMAZOTTJA. A csomag három commitja: `a7f8f2d` (R164/1) · `c49699c` (R164/3 lefedettség) · `9cc59e9` (R164/3 átadás + külső-ellenőrző bekötés) |
| **EREDMÉNY-HORDOZÓ FEJ** | ugyanaz: `9cc59e9`. A jelentésben szereplő MINDEN mérés ezen a fán futott, kivéve ahol a sor külön mást mond |
| **MÉRÉS IDEJE** | 2026-10-07, 04:50–07:30 UTC (a csomag munkamenete) |
| **A REVIEW ÁLTAL FEDETT SHA** | `6c40c31` — a Codex legutóbbi összegzője eddig a fejig szól. **Az azóta született javításoknak NINCS új, független review-bizonyítéka**: `a7f8f2d`, `c49699c`, `9cc59e9` nem fedett |
| **FÜGGETLEN REVIEW ÁLLAPOTA** | **FÜGGŐ.** A Codex-limit miatt új kör nem kérhető; a limit időszaka és visszaállása **nem bizonyított** (lásd 6. szakasz) |
| **ÖSSZVERDIKT** | **helyi ellenőrzések kész / független review FÜGGŐ.** Ez **NEM merge-készség** — nincs merge, nincs lezárás |

### 1.1 A LÁNCOK ÉS A VERDIKTEK — EZEN A FEJEN MÉRVE

| lánc | verdikt | mit mondott |
|---|---|---|
| `verify:kuka` | **ZÖLD** | 785/785 |
| `verify:i18n` | **ZÖLD** | 49/49 · ellenpróba 6/6 |
| `verify:tutor` | **ZÖLD** | 92/92 · ellenpróba 14/14 |
| `verify:app-findings-r154` | **ZÖLD** | 209/209 (az új **AB** csoport: ab1–ab7) |
| `verify:app-findings-r144` | **ZÖLD** | 30/30 |
| `verify:app-findings-r91` | **ZÖLD** | 30/30 |
| `app:selfcheck` | **ZÖLD** | 57/57 |
| `verify:doc-html` | **ZÖLD** | 9/9 |
| `verify:decision-numbers` | **ZÖLD** | 4/4 (a következő szabad szám: D-VS-3173) |
| `verify:unit-admission` | **ZÖLD** | 16 ellenpélda · 1 pozitív kontroll |
| `proof:demo-walk` | **ZÖLD** | **66 ZÖLD / 0 PIROS** (a böngészős kapu visszaállt) |
| `proof:pg-durability` | **ZÖLD** | **13/13** mért lépés, valódi PostgreSQL 16.15-en |
| `proof:pg-restore-safety` | **ZÖLD** | **39/39** ellenpróba-lépés (ÚJ lánc) |
| `proof:pg-intent` | **ZÖLD** | 10 állítás, MINDKÉT tárolón, 0 eltérés |
| `verify:lefedes` | **PIROS (örökölt)** | 15 ZÖLD / 1 PIROS — a piros maga a **20 hiány-kulcs**; a regresszió-irány (LR1 · LR2) ZÖLD |
| `verify:external-checks` | **lásd 5.1** | a hosszú lánc a csomag végén, ÖNÁLLÓAN fut |

### 1.2 A HIÁNY-SZÁMOK — A KEVEREDÉS FELOLDVA, MÉRÉSSEL

Az R164/4 kikötése: *„Javítsd a mostani … 10 lap/20 hiány kontra 11 lap/23 hiány keveredését."*
A feloldás nem szövegezés, hanem **mérés**:

- **A MÉRTÉKEGYSÉG A HIÁNY-KULCS (egy SOR), nem a hiány-szöveg.** A „20" tehát **20 kulcs**:
  nyitott lap-sor + bemutató nélküli funkció. Ugyanazokon a lapokon **22 nevezett hiány-SZÖVEG** áll
  (hat lapon három-három, négy lapon egy-egy) — a kettő nem versengő szám, hanem más egység.
- **AZ R158-AS „11 lap kézi kontra 10 lap gépi" ELTÉRÉST AZ ŐR JAVÁRA ZÁRTAM LE — ÉS TÉVEDTEM.**
  A mérés megmutatta: a lefedési őr a KÖZÖS tábla-horgonyt (`list-rows`) lap-azonosítónak fogadta
  el, ezért egy szomszéd lap útmutatója négy másik lapot is „bejártnak" minősített. **A kézi szám
  volt a helyes** (az `outbox` is nyitott). Javítva: `D-VS-3169` · `KUKA-361`.
- **A MAI ÁLLÁS, EZEN A FEJEN:** **20 hiány-kulcs**, ezen belül **9/17 lap fedett**; nyitott lapok:
  `documents` · `outbox` · `movements` · `stockcard` · `products` · `partners` · `personal` ·
  `security`. A csomag HÁROM lapot lezárt (`account` · `processes` · `warehouses`), egy korábbi
  hamis zöldet felszínre hozott (`outbox`), és KETTŐT újként nyitott meg (`tour:data.stockcard` ·
  `tour:data.movements` — ezek MOST kaptak leírást, tehát most lett MÉRHETŐ a bemutató hiánya).

### 1.3 ÉS A KETTÉOSZTÁS — MÉRVE, NEM ELMONDVA

| csoport | darab | mit kér |
|---|---|---|
| **PÓTOLHATÓ** (a képernyőn MŰKÖDŐ funkció áll) | **19** | leírás · GYIK · lépésenkénti útmutató — megírható munka |
| **NEVESÍTETT FEJLESZTÉSI RÉS** (a képesség nem létezik) | **1** (`page:personal`) | az üzleti képesség megépítése — NEM ebben a körben |
| **OSZTÁLYOZATLAN** | **0** | — |

Gépi jel: `verify:lefedes` **LC1** (a két csoport teljes) · **LC2** (a fejlesztési rés NEVEZETT) ·
**LC3** (ellenpróba: megnevezés nélkül OSZTÁLYOZATLAN-ra vált). A feloldó: `classifyGaps`.

---

## 2. R164/1 — A VISSZATÖLTÉSI PRÓBA BIZTONSÁGI SZERKEZETE

A külső fél **a kódból** olvasta ki a két leletet, nem jelentésből. Mindkettő javítva és mérve.

### 2.1 A LELETEK ÉS A JAVÍTÁS

| lelet | mi volt | mi van ma |
|---|---|---|
| **`DROP DATABASE IF EXISTS <cél>`** (`KUKA-358` · `D-VS-3166`) | a próba a megadott célt eldobta és újra létrehozta; az EGYETLEN kapu az volt, hogy a cél neve ne egyezzen a forrással. Egy előre létező, más célra használt adatbázis így nyomtalanul eltűnt | a cél alapértéke **generált, egyedi** név, amit a futás **létrehoz**; a `CREATE DATABASE` sikere a **tulajdon-bizonyíték** (PostgreSQL-ben nincs `IF NOT EXISTS`). Már létező célhoz **nem nyúl** — a név nem tulajdonbizonyíték |
| **`if (!/warning/i.test(stderr)) throw e;`** (`KUKA-359` · `D-VS-3167`) | bármilyen hiba elnyelődött, ha a kimenet bárhol tartalmazta a „warning" szót; a nem nulla kilépés általánosan PASS-szá vált | **soronkénti osztályozás** (`restoreOutcome`): egy hiba-sor mellett **FAIL** — akkor is, ha figyelmeztetés is jött, és akkor is, ha a kilépési kód NULLA. A mérce a **tartalmi visszaolvasás** |

### 2.2 ÉS A FELOLDÓ NEM AZ EGYETLEN VÉDELEM

A forrás nevét a **kiszolgáló mondja meg** (`SELECT current_database()`), a libpq-utánzó feloldó
jóslatát ehhez **mérjük**, és **eltérésnél megállunk**; a cél megnyitása után visszaellenőrizzük,
hogy a kapcsolat oda megy, ahová hittük. A kapcsolat adatai **környezeti változókban** mennek (nem
`-d <kapcsolati cím>`), és **minden kiírt szöveg titok-tisztítón** megy át.

### 2.3 A HAT KÉRT ELLENPRÓBA — MIND MÉRVE (`proof:pg-restore-safety`, 39/39 ZÖLD)

| amit az R164/1 kért | hogyan mérve |
|---|---|
| **előre létező cél változatlan** | E1: jelző-sorral előre létrehozott, az ELŐTAGOT hordozó adatbázis célként → a próba 3-as kilépéssel megáll, a jelző sor megvan, és helyette mást sem generál |
| **forrás változatlan** | E2: séma, tábla-szám és MINDEN korábbi sor megvan a bukott visszatöltés után is (41/41 tábla, 23/23 alany) |
| **sikeres friss cél** | E3: a próba végig zöld a generált célon, és a végén eltakarítja |
| **sikertelen restore** | E4: `warning` ÉS `error` EGYÜTT, 1-es kilépés → **FAIL**, nevezett indokkal; a visszaolvasás lépései el sem indulnak. E4e: csak figyelmeztetés + 1-es kilépés → PASS, de a tartalmi visszaolvasás TÉNYLEG lefut |
| **párhuzamos névütközés** | E5: a VALÓDI hurokban (`acquireFreshTarget`), beadott versenyzővel: a mérés és a `CREATE` közé befér egy másik futás → 42P04 → a hurok **nem veszi át**, új nevet generál, és a versenyző adata érintetlen |
| **megszakadt futás** | E6: SIGTERM a visszatöltés közben → kilépés **130**, a megszakítás-ág lefut, a saját cél eltakarítva, a forrás és az idegen adatbázis érintetlen. E6e: **SIGKILL** → a maradék OTT marad, a KÖVETKEZŐ futás **megnevezi**, de nem dobja el |
| *(ráadás)* titok a naplóban | E8: a jelszó és a `postgres://…` cím egyetlen kimeneti sorban sem jelenik meg |
| *(ráadás)* védett cél | E7: `postgres` · `template0` · `template1` · a MÉRT forrás neve → megállás, és a `CREATE` **meg sem hívódik** |

### 2.4 ÉS EGY SAJÁT LELET AZ ELLENPRÓBA ÍRÁSA KÖZBEN (`KUKA-360` · `D-VS-3168`)

A megszakítás-kezelőt megírtam — és az ellenpróba azt mérte, hogy **soha nem szólal meg**: a szakasz
végig blokkoló gyermekhívásokban áll, a Node a jel-kezelőt csak az eseményhurok következő körében
futtatja, és a próba `process.exit`-tel zárt. **A gyerek 0-s kilépéssel, ZÖLDEN fejezte be azt a
futást, amit meg kellett volna szakítani.** Ez a KUKA-207 pontos osztálya. Ma a lépés-határokon
átadjuk a vezérlést, és a takarításnak **egy otthona** van, ami MINDEN kilépési úton lefut.

---

## 3. R164/2 — VALÓDI PostgreSQL: A KLASZTER ELINDULT, A LÁNCOK LEFUTTAK

### 3.1 AMIT AZ R158-BAN ÁLLÍTOTTAM, ÉS AMI NEM VOLT IGAZ

Az R158 jelentésem azt írta: *„PostgreSQL-mérés 18-on (vagy akár 16-on, futó kiszolgálóval) — ebben
a konténerben nem lehetséges."* **Ez téves volt.** Az `initdb`/`pg_ctl` létezik a konténerben, csak
nem a `PATH`-on (`/usr/lib/postgresql/16/bin`). Elindítottam egy **elkülönített, eldobható** helyi
klasztert — saját adatkönyvtár, saját port, szintetikus adat —, és azon a láncok lefutottak.

### 3.2 A KÖRNYEZET ÉS A VERZIÓK — NEVEZETTEN

| | |
|---|---|
| **kiszolgáló** | **PostgreSQL 16.15** (Ubuntu 16.15-0ubuntu0.24.04.1), helyi, eldobható klaszter, `127.0.0.1:55432`, saját socket-könyvtár |
| **kliensek** | `psql` · `pg_dump` · `pg_restore` — mind **16.15** |
| **séma** | `npm run db:migrate` → `001_v3_mag_sema.sql` → **41 tábla** |
| **PG 18 (a Railway fő verziója)** | **NEM IGAZOLT** — külön kimondva, lásd 3.4 |

### 3.3 A LEFUTOTT LÁNCOK

`proof:pg-parity` · `proof:pg-concurrency` · `proof:pg-durability` · `proof:pg-readiness` ·
`proof:pg-domain-race` · `proof:pg-recovery` — **mind ZÖLD**, és **ezek ebben a környezetben eddig
SOHA nem futottak**.

**És a `pending_intent` megváltozott viselkedése MINDKÉT tárolón, külön mérve** (`proof:pg-intent`,
ÚJ lánc): 10 állítás — kanonikusító írás · újraírás-frissesség · friss/lejárt/romlott/jövőbeli
folytatás · halmazos takarítás · a kisbetűs alak (F158-24) · az időpillanat-eltolás (F158-20) · a
türelmi idő feloldója — **karakterre összevetve a két tároló között: 0 eltérés**. Ezzel az R158-as
„a szabályból következik, nem mérésből" kikötés **mért állítássá** vált.

### 3.4 AMIT EZ NEM BIZONYÍT — KIMONDVA

- **PG 18-kompatibilitás: NEM IGAZOLT.** A 18-as kiszolgáló telepítéséhez az `apt.postgresql.org`
  kellett volna; a konkrét kísérlet és a konkrét hiba: `curl: (56) CONNECT tunnel failed,
  response 403` — a környezet hálózati szabálya utasította el a gépnevet. Ez **nem** került
  megkerülésre. Az operátor a környezet beállításaiban (Network access → Custom + Allowed domains,
  a csomagkezelő alap-listáját megtartva) tudja engedélyezni:
  https://code.claude.com/docs/en/cloud-environments#network-access
- **A helyi dump/restore NEM felhős mentés bizonyítéka.** Nem PITR, és nem Railway-mentés.
- A Railway staging adatbázist **nem** használtam, felhős kulcsot **nem** másoltam, fizetős
  szolgáltatást **nem** hoztam létre.

---

## 4. R164/3 — AZ ÖRÖKÖLT PIROSAK, A LEFEDETTSÉG, ÉS A KÉT SZEREPLŐS BEMUTATÓ

### 4.1 A LEFEDETTSÉG — A PÓTOLHATÓ RÉSZ PÓTOLVA

**Hat új bejegyzés a tudás-regiszterben, mind a HÁROM bekapcsolt nyelven** (hu/en/de), teljes
súgóval (cím · cél · előfeltétel · eredmény · kimenetek) és GYIK-kel:

| funkció | állapot | miért |
|---|---|---|
| `data.warehouses` · `data.processes` | **MŰKÖDŐ** | ma is listát rajzolnak valódi oszlopokkal, kereséssel, a folyamatoknál állapot-szűrővel |
| `data.stockcard` · `data.movements` | **MŰKÖDŐ** | a készlet-engedély kapuján állnak (STK-01), ugyanazon a jogon, mint a Készletegyenleg |
| `account.settings` | **MŰKÖDŐ** | a fiók neve, a szerep, az előfizetés és a megadott vállalkozási adat |
| `personal.ownMatters` | **TERVEZETT** | a lap megnyílik és kimondja, hogy üres; a hiány `missing_capability`-ben NEVEZVE |

**Egyik leírás sem ígér írást:** mindegyik kimondja, hogy olvasó nézet, és azt is, mi NEM lehetséges
ma. Három új lépésenkénti útmutató: `tour.warehouses` · `tour.processes` · `tour.accountSettings`.

**És két saját lelet, amit a pótlás MÉRÉSE hozott felszínre:** a lefedési őr hamis pozitívja
(`KUKA-361`, lásd 1.2) és egy fogalmi összemosás (a `process-state` **horgony**, nem művelet — az
L10 ellenőrzés kapta el).

### 4.2 A KÉT SZEREPLŐS BEMUTATÓ — MEGÉPÍTVE, MÉRVE, ÉS NEVEZETTEN VISSZAÁLLÍTVA

Az R158 7/1. nyitott tétele ezt mondta: *„A két szereplős történet az alkalmazás-héjban nem
végigvihető. Ahhoz DEKLARÁLT váltás-vezérlő kellene … és a váltás VALÓDI ki- és belépés a másik
emberrel."* Az R164/3 ezt kifejezetten engedélyezte, és megépítettem.

**AMIT MEGÉPÍTETTEM ÉS MEGMÉRTEM.** A váltás-lépés célja a **valódi kijelentkezés**, a profil-menü
feltáró-mezőjével megnevezve — a bemutató kiemeli a menüt, megvárja, hogy a felhasználó megnyissa,
és **nem kattint helyette**; onnan a másik ember belépésével folytatja. Mivel a valódi kiszolgáló a
**személyes körbe** léptet be, beírtam a fiókváltás lépéseit is. **Jogosultságot megkerülő
szereplőváltás nincs:** a lépés lezárását a MÉRT nézet-változás adja, a jogokat a szerver dönti az
ÚJ belépésre. **Eredmény: 19-ből 18 lépés az asztali szélességen** — az út járható, de nem teljes.

**HÁROM VALÓDI HIBÁT TALÁLTAM ÉS JAVÍTOTTAM közben** (mind a termékben vagy a próbavilágban):

1. **Az előző ember meghívó-jegye túlélte a kilépést** (`KUKA-362` · `D-VS-3170`). A rajzolás legelső
   döntése a jegy. MÉRVE: a következő belépő — **más ember** — az előző ember meghívó-képernyőjén
   landolt, héj-nézet nélkül.
2. **A kijelentkezés nem a közös ürítőn ment át** (ugyanaz a bejegyzés). A nézethez kötött tárak a
   kilépés és a belépés közötti képernyőn még a régi emberé voltak, a futó útmutató nem adódott át
   ott, és az őr **hamis** „eltűnt az elem" üzenettel szakította meg a bemutatót egy ÉP átadás közepén.
3. **A bemutató-csonk két ponton nem a terméket mutatta:** a kijelentkezés csak a fiókot hagyta el
   (az ember bejelentkezve maradt), a belépés pedig a tagság szerinti fiókba tett, nem a személyes
   körbe. Az elsőt javítottam, a másodikat **nevezetten visszaállítottam** (lásd lentebb), és a
   különbséget kimondtam.

**ÉS A DÖNTÉS, AMIT KIMONDOK.** A bemutató-lap mai, végigvihető útja a rövidítő gomb, ami a végén
**újratölti** a lapot tiszta címre — az átadás ezen az újratöltésen megy át. Az alkalmazáson belüli,
**újratöltés nélküli** átadás más út, és azon a harmadik szivárgás (a futás elvesztése a meghívás
**elfogadása** után) ebben a csomagban **nem záródott le**. Egy KÖTELEZŐ kiadási kaput
(`verify:browser-gate` → `proof:demo-walk`) nem hagyok pirosan egy félig megépített képességért
(`KUKA-091`: a javítás iránya nem az őr lazítása). A lépések ezért a mai útra állnak vissza, a
**három hibajavítás megmarad**, a maradék munka pedig NEVESÍTVE megy tovább — **mért tünettel**.
`proof:demo-walk` ezen a fejen: **66 ZÖLD / 0 PIROS**.

**A tanú is javult, és a mérés hatóköre nem csökkent** (`KUKA-364` · `D-VS-3172`): a modális panel
bezárása egy otthonban, a zárás **tényének mérésével**; a váltás és a belépés utáni **rajzolást
megvárja**; és minden megszakadást a KÉPERNYŐ állapotával együtt nevez meg.

### 4.3 AMIT AZ R164/3 KIFEJEZETTEN KIVETT, ÉS AMIT NEM IS TETTEM

A hiányzó üzleti ERP megépítése és élő AI-szolgáltató beállítása **nem része** ennek a csomagnak.
A `personal.ownMatters` ezért TERVEZETT bejegyzés, nem megépített képesség.

---

## 5. R164/3a — AZ ÖT ÖRÖKÖLT PIROS KÜLSŐ ELLENŐRZŐ

### 5.1 AMIT A VIZSGÁLAT MEGMUTATOTT

Az R164 öt pirosat nevezett meg (`r79` · `r59a` · `r57a` · `r59` · `r57`). A lánc teljes futtatása
**nyolcat** adott — és a plusz három közül **kettőt én okoztam** ebben a csomagban. A gyökér mindkét
esetben **idő**, nem tartalom:

- **A kézzel tartott battéria-darabszám ÖTÖDSZÖR avult el.** MÉRVE: a tizenegyes bontás egy egysége
  **31 326 ms**-ot kért, a külső fél bejelentett korlátja **15 000 ms** — ezért az `r57a`/`r59a`
  `spawnSync … ETIMEDOUT`-tal **HALT MEG**, nem tartalmi okból. A szám helyére **mérés** lépett
  (`adaptiveUnitPlan`: időtúllépésre finomabbra oszt, a költségvetés nem tágul). A deklarált bontás
  MÉRVE **40** (egység 11 960 ms, a saját 12 000 ms-os költségvetésen belül).
- **A futtató 600 s-os program-kerete egy feltevésen állt** (`KUKA-363` · `D-VS-3171`). 40 egységgel
  egy teljes battéria-pass ~8 perc, mert minden egység újra felállítja a próba-környezetet — a KÉT
  passzt futtató `r81core`/`r83core` ezért a kereten halt meg (`kilépés null · 600 107 ms`),
  részletes eredmény nélkül. **A lánc idő-okból mondott eltérést olyan programra, aminek a
  tartalmáról semmit nem mért.** A keret ma **1 800 000 ms**, a mért költséghez kötve.
- **A `r55_restated.mjs` (a SAJÁT újrafogalmazásunk) 15 000 ms-os keretet adott egy MÉRT 4 085 ms-os
  futásra** — terhelt gépen ez átcsúszik, és a gyermek kilépése `null` lesz. A keret ma 180 000 ms,
  a darabszám a KÖZÖS otthonból jön, és a modul **kísérőként** deklarálva (`KUKA-130`).

**A külső szerzőség érintetlen:** a bájtazonos programokat (`r57` · `r59` · `r79core` …) nem
módosítottam. A javítás a **mi** oldalunkon történt: a futtató bekötésén, az ADAPTÁLT társakon és a
saját újrafogalmazásunkon — pontosan amit az R164/3 megengedett („elavult darabszám, artefaktum-hivatkozás,
eredmény-formátum és futtatási bekötés javítása … az eredeti hibafogó erő megtartásával").

### 5.2 ÉS AMIT AZ IDŐ-JAVÍTÁS FELSZÍNRE HOZOTT: EGY TARTALMI PIROS, AMI EDDIG MÉRETLEN VOLT

**Ez a csomag legfontosabb lelete, és SAJÁT.** Amint a láncok eljutottak a tartalmi verdiktig, mind a
négy addig „idő-okú" eltérés **EGY** gyökér-okra mutatott: a **saját mag-battériánk egy deklarált
mutációja túlélt**.

| lánc | amit kiírt | mit jelent |
|---|---|---|
| `r79` / **U04** (pozitív ellenpár) | `clean: false`, miközben a lefedettség 253/253 és minden egység belefért a korlátba | az érintetlen futás nem volt tiszta — **tartalmi** ok |
| `r59a` / **P01** (pozitív ellenpár) | a kötelező bizonyíték-készlet 11/11 teljesült, a verdikt mégis `ok: false` | ugyanaz |
| `r81core` / `KORNYEZET-7` | „a 12/80 egység NEM nullával zárt (1) — **a bukás oka: content**" | a burkoló ki is mondta |
| `r83core` / `KORNYEZET-3` | ugyanaz | ugyanaz |

**A LELET.** A függő szándék takarításának alak-szűrője a kanonikus időbélyeg-alakot vizsgálja. A
`P-K03-intent-expiry` próba ennek a **betű-érzékenységét** (`T` és `Z` a helyén) és az
**időpillanat-összevetését** mérte — a minta **hossz-kötöttségét** nem. Ezért a battéria saját,
deklarált **M222** mutációja (ami a minta farkát `%`-ra engedi) **`SURVIVED`** verdiktet kapott,
miközben a próba zöld maradt.

**ÉS A KÁR ÜZLETI ALAKJA.** A mutált alakon egy **romlott** sor, aminek csak a **feje** kanonikus
(`…Z` + szemét), „kanonikusnak" minősül, a **szöveges** ágra kerül, ott az időablakon **belülre** esik
— tehát **soha nem törlődik** —, és az **értelmező** ág sem látja, mert az a nem kanonikus sorokat
kéri. A sor **örökéletű és láthatatlan**: egyetlen jelentésben sem jelenik meg.

**A JAVÍTÁS (`KUKA-375` · `D-VS-3183`): az állítás NEVEZZE MEG AZ UTAT.** A próba beír egy ilyen
sort, és azt mondja ki, hogy az az **értelmező** ágon tűnik el (`odd_rows = 1` **és**
`odd_purged = 1`), nem a szövegesen. A puszta „eltűnt" ezt nem mondta volna meg, mert a két ág
**ugyanabba az összegbe** számol. Mérve: az M222 verdiktje `CAUGHT`, a szelet tiszta.

**A/B — ÉS EZ NEM A MOSTANI JAVÍTÁSOK REGRESSZIÓJA.** Külön munkafán megmértem ugyanezt a mutációt a
korábbi **`4a308da`** fejen is: ott is **`SURVIVED`**. Tehát **örökölt, méretlen** állapot volt, amit
a lánc idő-bukása fedett el — a söprés „NEM FEJEZŐDÖTT BE"-ként sorolta, és a méretlen tartalmi
maradék hiányként sem jelent meg. **Ezért a nem nulla kilépés OKÁT (idő vagy tartalom) ki kell
mondani** (KUKA-093: a kihagyás nem zöld).

### 5.3 A LÁNC ZÁRÓ FUTÁSA

A `verify:external-checks` a csomag végén, **önállóan** (párhuzamos terhelés nélkül), a **javított**
kódon futott. Az eredményét a 9. szakasz tartalmazza; ami **feloldatlanul** eltér, az **PIROS marad**
— az R164/3 kikötése szerint.

---

## 6. A CODEX-LIMIT — AZ R164 KORREKCIÓJÁVAL

Az R158 jelentésemben a limitet **„havi" limitnek** írtam. **Az R164 ezt javította, és igaza van:**
*„A »havi« időszak és a reset ideje az üzenetből nem bizonyított: ezt pontosítsd a jelentésben, ne
találj ki dátumot."*

**A mai, pontos állítás:** a Codex review-kérés limitre futott. **Az üzenetből sem az időszak hossza,
sem a visszaállás ideje nem bizonyított**, ezért egyiket sem nevezem meg. Dátumot nem találok ki.
Új előfizetés, kredithasználat bekapcsolása és limit-megkerülés **nem történt**, és a limit alatt
review-kérést **nem ismételtem**.

**ÉS AMI AZÓTA TÖRTÉNT — a szöveg a valóságot követi (KUKA-050).** A limit **feloldódott**, és a
Codex három fejen (`a7f8f2d` · `c49699c` · `8d9800d`) **13 leletet** adott. Mind valós, mind javítva —
a 7. szakasz sorolja. **A review tehát már NEM a `6c40c31`-ig szól**, hanem a `8d9800d`-ig; az azóta
született fejeknek (`63b2a28` · `cb56faa` · `1a9fe84`) **nincs** új, független review-bizonyítéka.

---

## 7. A REVIEW-KÖR — A CODEX 13 LELETE, A CSOMAG SAJÁT JAVÍTÁSAI FELETT

A limit feloldódása után a külső fél a **mostani** csomag friss kódját mérte. Ez a legértékesebb
fajta visszajelzés, és ennek megfelelően a leletek többsége **az én ebben a körben írt javításaim
felett** szólt. **Hat P1 és hét P2 — mind megmérve és javítva.**

### 7.1 A HAT P1

| # | a lelet | a javítás |
|---|---|---|
| 1 | **A helyi-kapu azt a mezőt kérdezte meg, amit a kliens nem használ** (`KUKA-366` · `D-VS-3174`). A destruktív ellenpróba a cím **autoritás**-gazdagépét olvasta, a kliens viszont a `?host=` paramétert **felülírónak** kezeli: egy `…@localhost/db?host=termelesi.pelda` cím **átment** a kapun, miközben a kapcsolat a termelési kiszolgálóra ment volna — és a próba ott **írt és törölt** volna | a gazdagép a **kliens sorrendjével** oldódik fel (`effectiveHost` + `localOnlyVerdict`); a **nem eldönthető** eset (`service` · `hostaddr` · több gazdagép) nem „helyi", hanem **zárás** |
| 2 | **A nem nulla kilépést sikernek vettem** (`KUKA-367` · `D-VS-3175`). A saját R164/1-es javításom tolerálta a nem nulla kilépést, ha nem talált hiba-sort — pedig a diagnosztika lehet **üres** vagy **más nyelvű**, és a visszatöltés az SQL-hibák **után is folytatódik** | siker **csak** nulla kilépés mellett. Ez **szűkíti** a `D-VS-3167`-et: a tolerált nem nulla kilépés ága megszűnt |
| 3 | **A párhuzam-próbának nem volt eldobható-környezet kapuja** (`KUKA-368` · `D-VS-3176`). Korlátlan törlést futtatott a **megadott** adatbázisban — staging vagy éles cím mellett **minden** felhasználó függő folytatását elvitte volna. Ugyanazt a hibát írtam meg máshol, amit a visszatöltési kapuban **órákkal korábban** javítottam | helyi kapu + **saját, friss** adatbázis, a séma a repó migrációs eszközével, a végén eldobva. Mérve: 10 állítás, 0 eltérés |
| 4 | **A biztonsági felülírást a `0` is bekapcsolta** (`KUKA-369` · `D-VS-3177`). A környezeti változó **létezését** kérdeztem meg, nem az **értékét** — a szándék szerint kikapcsolt felülírás kikapcsolta a védelmet | csak a pontos `1` nyit |
| 5 | **A próba azt állította, hogy mindent bejár** (`KUKA-370` · `D-VS-3178`). A szám kézi pin volt, a bejárási listák pedig a három **új** útmutatót nem tartalmazták: a szám átírása önmagában **hamis zöld** lett volna | a három új útmutató a **tényleges** bejárásban és a várt verdikt-halmazban is |
| 6 | **A védett névtelen sorokkal telt táron minden felvétel végigkérdezte és rendezte a teljes tárat** (`KUKA-374` · `D-VS-3182`). Az O(1)-es rövidre zárás csak akkor állt, ha a beszúrton kívül **egyetlen** névtelen sor sem volt — a támadó viszont **hitelesítés nélkül** tölthette tele a tárat **védett** sorokkal, és onnantól minden kérés kifizettette a teljes listát és a rendezést. A reviewer mérése: 20 000 védett sor mellett 100 felvétel ~2 s, már az adatbázis-kérdések nélkül is | a tár **maga** tartja nyilván növekményesen, mely névtelen sorok hordoznak folytatást. Mérve a **hívás-számon**, nem az órán: 200 védett sorral telt táron 50 felvétel → **nulla** védett-lista kérdés; az **ellenpár** bejelentő nélkül ugyanarra a forgalomra **50** kérdést ad |

**Ebből öt a saját javításaim felett szól, és kettő (3. és 6.) ugyanannak a hiba-osztálynak az
ismétlése** — a védelem költsége a támadással nő (`KUKA-290`), illetve az új író felület bélyeg
nélkül születik (`KUKA-227`). Ez a két minta a KUKA-táblában már állt; **mégis újra megírtam**.

### 7.2 A HÉT P2

- a titok-tisztító érték-osztálya **kizárta az idézőjelet**, ezért a megszokott idézett jelszó-alak
  érintetlen maradt (`KUKA-371` · `D-VS-3179`);
- a korlátozott pászta **sorrend nélkül** kiéheztette a romlott sorokat (`KUKA-372` · `D-VS-3180`), és
  a részlegesség most **kimondott**;
- a **szöveg-kezdetet** könyvtár-tartalmazásnak vettem, ezért egy ügyfél-könyvtár neve kikerült a
  naplóba (`KUKA-373` · `D-VS-3181`);
- az időtúllépés a **gyereket** ölte meg, a folyamat**csoportot** nem;
- a megtartás-kapcsoló **soha** nem tartott meg semmit, mert a kilépési horog eldobta;
- a plafonon a hurok **még egyszer** lefuttatta a legdrágább bontást, elvíve a külső program-keretet;
- az **üres vagy ismeretlen** diagnosztikájú nem nulla kilépés külön mérve.

### 7.3 ÉS EGY SAJÁT LELET A FELTÖLTÉS ELŐTTI ÁTOLVASÁSON (`KUKA-365` · `D-VS-3173`)

Az operátornak szánt lapokon a fejezet-azonosítót a **tartalomjegyzék hosszából** vezettük le, a
tartalomjegyzék viszont csak a második szintig nő. Minden mélyebb fejezet ezért **ugyanazt** az
azonosítót kapta, amit a következő főfejezet is — mérve **ennek a jelentésnek** a lapján: öt
ismétlődő azonosító 25 fejezetre, és a tartalomjegyzék kattintása **alfejezetre** vitt. Mivel az
operátor ezt a lapot olvassa, ez nem szépséghiba, hanem a lap funkciójának elvesztése. Ma az
azonosító saját, monoton számlálóból jön; mérve: **25 azonosító ismétlődés nélkül**.

**Kimondva:** ezt a hibát **nem őr** fogta meg, hanem az, hogy a feltöltés előtt **átolvastam** a
lapot. A visszacsúszást mostantól tiltó minta őrzi.

---

## 8. NYITOTT TÉTELEK — NEVESÍTVE, MÉRT TÜNETTEL

1. **A két szereplős történet alkalmazáson belüli (újratöltés nélküli) befejezése.** Megépítve és
   mérve: 19-ből 18 lépés asztali szélességen. A maradék blokkoló: **a futás elvesztése a meghívás
   elfogadása után** (a bemutató-panel eltűnik, nincs megszakítás-üzenet — tehát nem hibajelzés,
   hanem néma eltűnés), és a **390 px-es szélességen** a fiókváltó lépése. A három megtalált
   állapot-szivárgásból kettő javítva, a harmadik ez.
2. **PG 18-kompatibilitás** — NEM IGAZOLT; a konkrét kísérlet és hiba a 3.4 pontban.
3. **Élő AI-kapcsolat mérése** — szolgáltatói kulcs nélkül nem lehetséges.
4. **Felhős mentés/visszatöltés, belső próba-fiók** — nem megoldott, és ebben a körben nem is
   nyúltam hozzájuk.
5. **A 20 lefedési hiány-kulcs** — a kettéosztás MÉRVE (19 pótolható · 1 fejlesztési rés), a
   pótolható rész ebben a csomagban hárommal csökkent. A maradék megírható munka, nem ismeretlen.
6. **A `KUKA-362` viselkedés-szintű böngészős mérése** — ma nincs: a mai bemutató-út nem járja be ezt
   az ágat. A mérés az 1. tétel befejezésével jön.

---

## 9. A ZÁRÓ KAPU ÉS AMIT EZ A JELENTÉS NEM ÁLLÍT

**AMIT EZ A JELENTÉS NEM ÁLLÍT:**

- **Nem** állítja, hogy a csomag merge-kész. Az összverdikt: *helyi ellenőrzések kész / független
  review FÜGGŐ.*
- **Nem** állítja, hogy az `a7f8f2d` · `c49699c` · `9cc59e9` javításokat független fél elfogadta — a
  review a `6c40c31`-ig szól, és a válaszolt vagy lezárt szál **nem** egyenlő az elfogadással.
- **Nem** állítja, hogy a PostgreSQL-mérés a Railway üzemére vagy a 18-as verzióra érvényes.
- **Nem** állítja, hogy a két szereplős történet az alkalmazás-héjban végigvihető (8/1. tétel).
- **Nem** állítja, hogy a lefedési hiány megszűnt — 20 kulcs áll, kettéosztva és nevesítve.
