# V3 · R164 — AZ AUDIT FENNMARADÓ BIZONYÍTÉKAI ÉS A BIZTONSÁGOS HELYI PostgreSQL-PRÓBÁK

**Kör:** `CMD-VS-300-002-002 R164 — DECISION` (chatgpt-v3, az operátor felhatalmazásával)
**Végrehajtó sáv:** Claude-v3 · **Ág:** `claude/r154-audit-fix` (ugyanaz a PR, egy aktív író)

---

## 1. EGY ÁLLAPOTTÁBLA — EZ A MAI VALÓSÁG, ÉS MINDEN MÁS SZÁM EBBŐL OLVASHATÓ

Az R164/4 kikötése: *„A jelentés kezdődjön EGY következetes állapottáblával."* Ez az a tábla. A
korábbi körök számai **történeti adatok**, nem végállapot — ahol eltérnek, ez a tábla az irányadó.

| | |
|---|---|
| **KÓD-SHA (a csomag feje)** | `76378f3` — a `b31d8c9` (R158 záró feje) LESZÁRMAZOTTJA. A csomag R164-es commitjai, sorban: `a7f8f2d` (R164/1) · `c49699c` (lefedettség) · `9cc59e9` (átadás + külső-ellenőrző bekötés) · `98ec598` · `8d9800d` · `63b2a28` (1. review-kör, 12 lelet) · `cb56faa` (a 13.) · `1a9fe84` (az M222 túlélése) · `8f14ca9` (2. review-kör, 9 lelet) · `0cd38a2` (a KUKA-383 mérése) · `c2cccd1` (az U04 darabszáma mérésből) · `3cb8364` (a böngészős kapu MÉRT verdiktje) · `cbaec96` (3. kör) · `def18b8` (r83core 7/7) · `1d6661f` (4. kör) · `7a78009` (r81core 15/15 · r79core 18/18) · `72aa8bd` (5. kör) · `9dc0356` (r79 4/4) · `76378f3` (6. kör) |
| **EREDMÉNY-HORDOZÓ FEJ** | **KÉT fej, és ezt kimondjuk.** A rövid láncok verdiktjei a mai fejen (`76378f3`) frissen mérve — az 1.1 tábla sorai. A három HOSSZÚ lánc (böngészős kapu · mag-mutációs battéria · külső-ellenőrző) a `c2cccd1` fejen futott, a csomag végén, önállóan; a köztük és a mai fej közötti **különbség NEVEZETT**: a 3., 4., 5. és 6. review-kör javításai, az r83core/r81core/r79core/r79 bizonyíték-fájljai, és a lefedettség-leltár. A böngészős kaput ezért a mai fejen ÚJRA futtattam (lásd az 1.1 tábla sorát) |
| **MÉRÉS IDEJE** | 2026-10-07, 04:40 UTC → a csomag zárása (a `--from` a parancs board-időbélyege). A hosszú láncok: a böngészős kapu 09:35 és (újra) 11:50 UTC · a mag-battéria 09:49 UTC · a külső-ellenőrző 10:04 UTC |
| **A REVIEW ÁLTAL FEDETT SHA** | `9dc0356` — a külső fél **hat körben** mért, eddig a fejig. **A mai fejnek (`76378f3`) NINCS új, független review-bizonyítéka** |
| **FÜGGETLEN REVIEW ÁLLAPOTA** | **FÜGGŐ a mai fejre.** A korábbi limit feloldódott; a limit időszaka és visszaállása az üzenetből **nem bizonyított**, ezért nem nevezem meg (6. szakasz). A **hat kör 30 megjegyzése** mind javítva, mért bizonyítékkal, és **mind a 30 szál megválaszolva és lezárva** — a PR-on ma **nincs nyitott review-szál** (7. szakasz) |
| **ÖSSZVERDIKT** | **helyi ellenőrzések kész / független review FÜGGŐ**, EGY nevezett piros lánccal (a külső-ellenőrző: lásd lentebb és az 5.3 pontot). Ez **NEM merge-készség** — nincs merge, nincs lezárás |
| **A MARADÉK RÉS** | **A külső-ellenőrző lánc NEM teljes.** A 19 program közül 14 futott le (13 MEGFELEL · 1 ELTÉRÉS: `r59a`, időtúllépés), **5 NEM FUTOTT** (`r57a` · `r59` · `r57` · `r55` · `r53`) — tehát NEM IGAZOLT, nem zöld (KUKA-200 · KUKA-206). A `verify:lefedes` 20 hiány-kulcsa nevesítve áll (1.2–1.3). Az ÁTÁLLÁSI alapállás-mentés és a valódi szolgáltatói AI-mérés továbbra is nyitott (8. szakasz) |
| **FOGYASZTÁS (a csomag ablakán)** | **938 hívás** · kumulatív fő-szál kontextusmedián **407 559** (max 783 667) · ügynök-bemenet **0** (nulla al-ügynök indult) · lefedettség: **teljes**. **A mérő kimondta: CHATVÁLTÁSI JELZŐ ELÉRVE** (407 559 ≥ 400 000) — a futó munkablokk célzott ellenőrzéssel lezárható, a **KÖVETKEZŐ önálló nagy blokk friss beszélgetésben induljon**. A `300–400 ezres` figyelmeztetés sávot tehát a csomag zárása közben hagytuk el; ezért a lezárásban **nincs** új feltárás és nincs opcionális teljes söprés (D-VS-3083) |

### 1.1 A LÁNCOK ÉS A VERDIKTEK — EZEN A FEJEN MÉRVE

| lánc | verdikt | mit mondott |
|---|---|---|
| `verify:kuka` | **ZÖLD** | **856/856** (a csomag **47** új bejegyzése: `KUKA-345…391`) |
| `verify:i18n` | **ZÖLD** | 49/49 · ellenpróba 6/6 |
| `verify:tutor` | **ZÖLD** | 92/92 · ellenpróba 14/14 |
| `verify:assistant` | **ZÖLD** | 55/55 · ellenpróba 6/6 |
| `verify:app-findings` (R75) | **ZÖLD** | 73/73 |
| `verify:app-findings-r77` | **ZÖLD** | 34/34 |
| `verify:app-findings-r79` | **ZÖLD** | 49/49 |
| `verify:app-findings-r91` | **ZÖLD** | 30/30 |
| `verify:app-findings-r144` | **ZÖLD** | 30/30 |
| `verify:app-findings-r154` | **ZÖLD** | **240/240** — az új **AB** (R164/1 döntései), **AC** (az O(1)-es felvétel hívás-számon), **AD** (a látogató-cím), **AE** (a 2. kör tiszta döntései), **AF** (fordítható elutasítások), **AG** (a memória és a tároló EGY helyen ürül), **AH** (a személyes tér) csoporttal, és a **U** csoport a felület-feltétel négy ellenpárjával (u1 · u2 · u7 · u8 · u9) |
| `app:selfcheck` | **ZÖLD** | 57/57 |
| `verify:doc-html` | **ZÖLD** | 9/9 |
| `verify:artifact-naming` | **ZÖLD** | **28/28** — ez a csomag alatt **PIROS volt** (a generált célnév kézzel vágta az időbélyeget); a javítás a 7.5 pontban |
| `verify:release-order` | **ZÖLD** | 37/37 |
| `verify:decision-numbers` | **ZÖLD** | 4/4 (a következő szabad szám: **D-VS-3200**) |
| `verify:unit-admission` | **ZÖLD** | 16 ellenpélda · 1 pozitív kontroll |
| `verify:sweep-reuse` | **ZÖLD** | 43/43 |
| `verify:fogyasztas-meres` | **ZÖLD** | 18/18 ellenpróba |
| `proof:pg-durability` | **ZÖLD** | **13/13** mért lépés, valódi PostgreSQL **16.15**-en |
| `proof:pg-restore-safety` | **ZÖLD** | **43/43** ellenpróba-lépés (ÚJ lánc; a második review-kör után `E2c`-vel bővült) |
| `proof:pg-intent` | **ZÖLD** | **10 állítás, MINDKÉT tárolón, 0 eltérés** — saját, friss adatbázisban |
| `verify:lefedes` | **PIROS (nevesített)** | 15 ZÖLD / 1 PIROS — a piros maga a **20 hiány-kulcs**; a kettéosztás és a regresszió-irány (LR1 · LR2 · LC1–LC4) ZÖLD. A részletek az 1.2–1.3 pontban |
| `verify:browser-gate` | **ZÖLD** | **805 s** · `test:e2e` + `proof:core-ux` 364 s · `proof:demo-walk` 441 s · **122 helyzet teljesült, 0 bukott, 0 ingadozó, 0 kihagyott, 22 próba-fájl** — és a kapu azt is méri, hogy a jelentés EBBEN a futásban készült (nem egy korábbi bizonyíték) |
| `verify:v3ref` (mag-mutációs battéria) | **ZÖLD** | **925 s** · a 69 mag-próba 69/69 · **253 mutáció · 253 ELKAPVA · 0 TÚLÉLTE** · 0 rossz próba · 0 mérőhiba · 0 elavult horgony · lefedettség **253/253**, hiány 0, duplikátum 0 · a legrosszabb egység faliórája **10 187 ms** a 15 000 ms-os külső korláton belül. **Az M222 mutáció ELKAPVA** — az 5.2-es lelet javítása a TELJES battérián igazolva. A darabolás **mérésből**: a tool ajánlása 11 egység volt, ezen a gépen **88** kellett (11 → 22 → 44 → 88), a költségvetés nem tágult |
| `verify:external-checks` | **PIROS / NEM TELJES** | 19 programból **14 futott** (13 MEGFELEL · 1 ELTÉRÉS), **5 NEM FUTOTT**. A megfordult pirosak: `r83core` · `r81core` · `r79core` · `r79` mind **MEGFELEL**. Az `r59a` **időtúllépés** a futtató 30 perces program-korlátján (1 800 117 ms, `ETIMEDOUT`) — tartalmi bukás nélkül: a saját naplója szerint a darabolás 40 → 80 egységre finomított, és a 80 **belefért** a 15 000 ms-os korlátba. A részletek az 5.3 pontban |

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

### 2.3 A HAT KÉRT ELLENPRÓBA — MIND MÉRVE (`proof:pg-restore-safety`, **43/43** ZÖLD)

| amit az R164/1 kért | hogyan mérve |
|---|---|
| **előre létező cél változatlan** | E1: jelző-sorral előre létrehozott, az ELŐTAGOT hordozó adatbázis célként → a próba 3-as kilépéssel megáll, a jelző sor megvan, és helyette mást sem generál |
| **forrás változatlan** | E2: a bukott visszatöltés után a séma és a tábla-szám azonos (41/41), és a **teljes sor-tartalomra** mérve **egyetlen sor sem tűnt el és egyetlen sor sem változott meg**. E2c: a próba saját előkészítésének hozzáadása **kimondott és mért** (4 sor) — a második review-kör leletére (`KUKA-380`) |
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

> **ELŐRE-MUTATÓ, HOGY EZ A PONT NE OLVASSON FÉLRE:** ezt a szakaszt a csomag KÖZBEN írtam, és a
> **6. review-kör másodszor is ránézett** — a végállás a 7.6 pontban és a `D-VS-3199`-ben áll. Röviden:
> a két szereplős történetet a kiszolgáló az alkalmazás-héjban **fel sem kínálja** többé (ott nincs
> váltó vezérlő), a végigvitelük tanúja a bemutató LAPJA. Az alábbi mérések és leletek érvényesek —
> csak a KÖVETKEZTETÉS változott: nem „19-ből 18 lépés, a maradék blokkoló", hanem „ez a felület nem
> ennek a történetnek a helye".

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
| `r79` / **U04** (pozitív ellenpár) | `clean: false`, miközben a lefedettség 253/253 és minden egység belefért a **külső** 15 000 ms-os korlátba | az érintetlen futás nem volt tiszta — **tartalmi** ok. *(Ugyanezen a futáson derült ki a 7.5-ben leírt második baj is: a 40-es bontáson a mért fal 13 567 ms-ig ment, ami a futtató **saját** 12 000 ms-os költségvetése fölött van — ezért az U04 darabszáma mostantól mérésből jön.)* |
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

### 5.3 A LÁNC ZÁRÓ FUTÁSA — MÉRVE, ÉS A HIÁNY KIMONDVA

A `verify:external-checks` a csomag végén, **önállóan** (párhuzamos terhelés nélkül), a **javított**
kódon (`c2cccd1`) futott. **Ez a futás NEM teljes**, és ezt itt mondom ki, nem a tábla aljára írom:

| program | verdikt | mit mondott |
|---|---|---|
| `r16core` · `r92authz` · `r88core` · `r85core` · `r77` · `r75` · `r69` · `r67` · `r61` | **MEGFELEL** (9) | változatlanul zöldek |
| `r83core` | **MEGFELEL** | 7/7 — a csomag ELŐTT 3/7 volt (a `KORNYEZET-3` tartalmi bukás) |
| `r81core` | **MEGFELEL** | 15/15 — a csomag ELŐTT 7/15 |
| `r79core` | **MEGFELEL** | 18/18 |
| `r79` | **MEGFELEL** | 4/4 — az `U04` ZÖLD. A darabszám **mérésből**: a futtató saját naplója szerint *„1. 40 egység — a futtató SAJÁT költségvetését (12000 ms) lépte túl 18 egységben … 2. 80 egység — belefért"* |
| `r59a` | **ELTÉRÉS** | **időtúllépés**, nem tartalmi bukás: `spawnSync … ETIMEDOUT` a futtató **30 perces** program-korlátján (1 800 117 ms). A saját naplója ugyanazt a finomítást mutatja, mint az `r79`-nél (40 → 80 egység, és a 80 **belefért** a 15 000 ms-os külső korlátba) — a program mint EGÉSZ lépte túl a 30 percet, miután a hét esete sorban végigfuttatta a battériát |
| `r57a` · `r59` · `r57` · `r55` · `r53` | **NEM FUTOTT** | a futás a háttér-folyamat idő-korlátján állt le az `r59a` után. **Nem „részben", nem zöld: NEM IGAZOLT** (KUKA-200 · KUKA-206) |

**AMIT EBBŐL ÁLLÍTOK.** Az R164/3 öt örökölt pirosa közül **az `r79` megfordult** (4/4), és a két
tartalmi `KORNYEZET`-bukás is megszűnt (`r83core` 7/7 · `r81core` 15/15 · `r79core` 18/18). Az `r59a`
pirosa **mérés-idő** természetű, nem tartalmi: a bizonyíték erre a saját darabolás-naplója, ami a 80
egységet a korláton BELÜL mutatja.

**AMIT NEM ÁLLÍTOK.** Hogy az `r59a` tartalma tiszta — ezen a futáson a program nem jutott el a
verdiktjéig, tehát a tartalomról **nincs mért állításom**. És hogy a maradék öt program zöld volna:
**nem futottak**, tehát nem igazoltak. A lánc összverdiktje ezért **PIROS**, és ez a csomag
**nevezett maradék rése** (1. szakasz).

**A 30 PERCES KORLÁT A MI VARRATUNK, NEM A KÜLSŐ FÉLÉ** — és szándékosan nem tágítottam. Az R164/3 a
futás-bekötés javítását megengedi, de egy korlát felnyitása nem javítás: a lánc így négy-öt órássá
válna, és a „zöld" annak a következménye volna, hogy többet vártunk, nem annak, hogy a kód jobb.
A pontos technikai akadály **mérve** áll (KUKA-089), és nevesített függőként nyitva marad.

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
Codex **hat körben** mért, minden feltöltés után újra: az 1. kör három fejen
(`a7f8f2d` · `c49699c` · `8d9800d`) 13 leletet, a 2. a `cb56faa`-n kilencet, a 3. a `3cb8364`-en kettőt,
a 4. a `def18b8`-on kettőt, az 5. a `7a78009`-en kettőt, a 6. a `9dc0356`-on kettőt — **összesen 30
megjegyzés**, mind valós, mind javítva, mind megválaszolva és **lezárva** (7. szakasz).
**A review tehát már NEM a `6c40c31`-ig szól**, hanem a `9dc0356`-ig; a **mai fejnek** (`76378f3`)
**nincs** új, független review-bizonyítéka.

---

## 7. A HAT REVIEW-KÖR — A CODEX 30 LELETE, A CSOMAG SAJÁT JAVÍTÁSAI FELETT

A limit feloldódása után a külső fél a **mostani** csomag friss kódját mérte, **két körben**. Ez a
legértékesebb fajta visszajelzés, és ennek megfelelően a leletek többsége **az én ebben a csomagban
írt javításaim felett** szólt. **Összesen 22 lelet: 9 P1 és 13 P2 — mind megmérve és javítva.**

Az első kör (7.1–7.2) 13 leletet adott, a második (7.4) kilencet — ezek **nyolc** valós hibát
neveznek meg, mert a parancssori kliensek környezetét két külön fájlban, ugyanarra a hibára jelezték.

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

### 7.4 A MÁSODIK KÖR — KILENC MEGJEGYZÉS, NYOLC VALÓS HIBA (3 P1)

Ez a kör **kizárólag** az ebben a csomagban írt javításaim felett szólt. Három leletem **ugyanannak
a hiba-osztálynak az ismétlése** volt, amit órákkal korábban magam javítottam — ezt nem szépítem.

| # | a lelet | a javítás |
|---|---|---|
| **P1** | **Csak az abszolút út socket** (`KUKA-377` · `D-VS-3185`). A destruktív pg-próbák helyi-kapuja a **ponttal** kezdődő gazdagépet is „helyi socketnek" vette. A PostgreSQL viszont kizárólag az **abszolút**, perjellel kezdődő értéket kezeli socketként: egy `?host=.belso.pelda.hu` alakú, a telepítési környezetben **feloldódó** cím így átment a kapun — oda, ahol a próba **ír és töröl** | a kapu már csak a nevesített helyi gazdagépeket és az abszolút utat fogadja el; a nem eldönthető eset változatlanul zárás |
| **P1** | **A kilépés nem szedte le a védett-indexet** (`KUKA-378` · `D-VS-3186`). A kiszorítás könyvelte a névtelen számlálót **és** az indexet, a kilépés útja csak a számlálót. A folytatás→kilépés ismétlése a tár **plafonján kívül** növelte a memóriát, és az elavult azonosítók végül azt is elhitették a rövidre zárással, hogy a tár csupa **védett** sorral telt: egy **új** munkamenet felvétele elutasításra futott | **egy** könyvelő (`forget`), amit mindkét út hív — nem egy harmadik sor a kilépésben |
| **P1** | **A „forrás változatlan" állítás túl tág volt** (`KUKA-380` · `D-VS-3188`). A mérés tartalmazás-vizsgálat volt: **bármennyi új** sort elfogadott, a **megváltozott** sort nem is látta — miközben minden futás tényleg írt a forrásba (a gyermek saját előkészítése) | a pillanatkép a **teljes sor-tartalmat** viszi, és **három** osztály dől el: eltűnt · megváltozott · jött. A harmadikat **kimondjuk** és a **mért** mértékhez kötjük; a kép minden futás **előtt** újra készül |
| P2 ×2 | **A parancssori kliensek környezete a cím autoritás-gazdagépéből épült**, a `?host=` felülírást eldobta — **két másolatban** (`KUKA-379` · `D-VS-3187`). A gazdagép-kaput ugyanebben a csomagban javítottam, a tényleges végrehajtást nem: a bizonyíték így nem arra a klaszterre szólt, amit mértünk | **egy otthon** (`cliEnvFor`), ugyanazzal a feloldóval, amit a kapu használ — és **fail-closed**, ha a gazdagép nem eldönthető |
| P2 | **A futtató saját költségvetés-túllépését tartalmi bukásnak olvastuk** (`KUKA-381` · `D-VS-3189`), ezért nem finomítottunk — a lánc tartalmi bukásként adta tovább azt, amit épp a finomítás oldott volna meg | a futtató **stabil gépi jelet** ír ki, és a terv **maga** olvassa ki; a tartalmi bukás viszont nem indít finomítást |
| P2 | **A rendezés önmagában nem adott előrehaladást** (`KUKA-382` · `D-VS-3190`): egy friss, érvényes eltolásos időbélyeg **számmal** kezdődik, egy romlott érték **betűvel** — tehát a köteg **állandó** maradt, és a romlott sor határtalanul ott maradt. A saját `KUKA-372`-es javításom csak **elmozdította** a kiéheztetést | **kulcs-kurzor** az időbélyeg és az azonosító **párján**: minden pászta továbblép, a tábla végén visszaáll az elejére |
| P2 | **A kilépés a címsorról nem vitte el a meghívó jegyet** (`KUKA-383` · `D-VS-3191`): egy frissítés — vagy ugyanannak a történet-bejegyzésnek az újbóli megnyitása **más ember** által — visszavitte a felületet az **előző** ember meghívó-folyamatára | **közös** elfelejtő, amit a kilépés és a beváltás is hív — és csak a meghívó paramétert viszi el, a nyelvválasztást nem |
| P2 | **A hiány-osztályozás csak az önpróba konzolján létezett** (`KUKA-384` · `D-VS-3192`), a gépi artefaktumban nem — a `--json` út pedig a nyomtatás **előtt** kilép. A leltár így nem tudta megmondani, mely rés pótolható: pontosan azt nem, amiért készült | a JSON viszi a `gap_classes` blokkot, és az önpróba a **kiírt fájlt** olvassa vissza |

**A hat tiszta döntés mérése (`verify:app-findings-r154`, új „AE" csoport; a battéria mai állása 240/240 PASS):** `ae1` a
pont nem helyi · `ae2` a felülírás, **ellenpárral** (a javítás előtti feloldó `localhost`-ot adott) ·
`ae3` a fail-closed három alakja · `ae4` a kilépés után az index üres · `ae5` a költségvetés-túllépés
finomít, a tartalmi bukás nem, **ellenpárral** · `ae6` a kurzor eléri a romlott sort, kurzor nélkül
nem, **ellenpárral**. A hetediket a `proof:pg-restore-safety` méri valódi PostgreSQL-en (`E2` · `E2c`
· `E6d`), a nyolcadikat a böngészős kapu.

### 7.5 ÉS EGY SAJÁT LELET A LÁNCOK VISSZAMÉRÉSÉN

**KETTŐ volt, nem egy.**

**(1) A `verify:artifact-naming` piros volt az R164/1 óta**, és eddig nem derült ki: a generált célnév
**kézzel** vágta az ISO-időbélyeget, amit az `ART05` őr nevezetten tilt (a V2-ben mérve **40**
szerszám tette, három különböző alakban). Az őrt **nem lazítottam**: az idő-rész mostantól a névadás
közös otthonából jön. **Kimondom:** ezt a pirosat a csomag **korábbi** szakasza okozta, és csak a
láncok visszamérésén jött ki — nem az írás pillanatában. Ma `28/28`.

**(2) A saját futás-szerződés próbánk U04-es pozitív ellenpárja a KÉZZEL tartott darabszámot
használta** — és ez a fájl fejkommentje **már kétszer** leírta ugyanezt a hibát. A battéria 253
mutációra nőtt: a 40-es bontáson **mérve** az egységek faliórája 9 621 … 13 567 ms, tehát több egység
a futtató **saját** 12 000 ms-os költségvetése fölött van, és az összefűzött eredmény `portable:
false`-t ad — vagyis az U04 **pirosra ment volna egy ép rendszeren**, nem tartalmi hibából, hanem a
számból. A szerződés tárgya a **darabolhatóság**, nem egy szám, ezért az U04 futása mostantól a közös
**adaptív tervet** használja: ha egy egység nem fér bele, finomabbra oszt, a költségvetés nem tágul, és
a terv naplója meg a végső darabszám **bekerül a jegyzőkönyvbe**. A tanulság nem új, ezért nem új
bejegyzés: a `KUKA-381` kapott egy új pozitív mintát erre a helyre.

---

### 7.6 A HARMADIK–HATODIK KÖR — NYOLC TOVÁBBI P2, MIND JAVÍTVA

A review nem két körben állt le. A csomag minden feltöltése után ÚJ kör jött, és ez a négy kör a saját
javításaim FÖLÉ talált — ezért tartozik ide, nem egy külön lapra (R164/4: EGY összesített jelentés).

| kör | lelet | mit mondott | mi lett belőle |
|---|---|---|---|
| 3. | P2 | **A HARMADIK `pgEnv`-másolat** — a 2. körben KETTŐT vontam össze egy otthonba, a `v3_pg_restore_safety_proof.mjs`-ben lévő harmadikat nem találtam meg | mind a három próba a közös `cliEnvFor`-t hívja, és a `KUKA-379` pozitív mintája MIND A HÁROM fájlra szól — egy negyedik másolat is piros lenne |
| 3. | P2 | **A folytatás megőrzésének válaszát a lap eldobta** — a szerver helyesen utasít el telt tárnál (503 `at_capacity`) és nézet-váltásnál (409 `session_gone`), a lap viszont a rendes folyamattal folytatott: NÉMA, később jelentkező kár | `KUKA-385` · `D-VS-3193` — a lap a választ ELTESZI (`inviteNotKept`), és a meghívó-nézet kimondja; a szöveg mind a három nyelven a MŰKÖDŐ folytatást nevezi meg (KUKA-201) |
| 4. | P2 | **A hely nem tulajdon** — a visszatöltési lánc a MEGADOTT adatbázist használta forrásként, pedig minden esete fiókot és vállalkozást hoz létre benne: a „helyi" nem jelenti az „eldobhatót" | `KUKA-386` · `D-VS-3194` — a lánc SAJÁT, FRISS forrás-adatbázist hoz létre (`acquireFreshTarget`, a tulajdon a LÉTREHOZÁS), a repó migrációs eszközével építi fel, és eldobja (kilépésre ÉS jelre) |
| 4. | P2 | **A forrás pillanatképe nem minden táblát mért** | `KUKA-387` · `D-VS-3195` — a pillanatkép MINDEN `public` alaptáblát visz, a teljes sor szövegével |
| 5. | P2 | **A kilépés a tárolóból nem vitte a sort** — a kiszorítás bejelent, a publikus `delete` nem: a `pending_intent` sor elérhetetlenül ott maradt a teljes türelmi időre, miközben a munkamenet-tár ÜRES volt | `KUKA-388` · `D-VS-3196` — a `delete` is a BEJELENTÉS útján megy, a várólista biztosításával együtt |
| 5. | P2 | **A lejárat olvasási törlése nem jutott el az indexhez** | `KUKA-389` · `D-VS-3197` — ami töröl, az írás: a feloldó „nincs folytatás" válaszára az index is ürül |
| 6. | P2 | **A személyes térben felkínált üzleti bemutató** — a szűrő `item.page`-et olvasott, a három új útmutató `screen`-t deklarál, és a `shell` csoport sem volt tiltott | `KUKA-390` · `D-VS-3198` — a lap feloldása MINDKÉT mezőre áll, és a személyes tér ZÁRT lap-listából dönt (`PERSONAL_SCREENS`, a személyes menü mellett). Mérve: **AH** csoport, ah1–ah3 |
| 6. | P2 | **A környezet jele felkínálta, a felület nem tudta végigvinni** — a két szereplő-váltó bemutatót a `VS_DEMO` kapuzta, a próbapad viszont a VALÓDI héjat futtatja, amiben nincs váltó vezérlő: a próba a `megszakadt:targetMissing` verdiktet írta elő ELVÁRT eredménynek, és a kötelező böngésző-kapu emellett ZÖLD maradt | `KUKA-391` · `D-VS-3199` — lásd lentebb |

**A HATODIK KÖR MÁSODIK LELETE A LEGSÚLYOSABB A NÉGY KÖRBEN**, mert a *kapu* zöldjét érintette. Ahogy a
reviewer írta: a mérés úgy ment át, hogy épp azt a hibát igazolta. A javítás nem a próbában van, hanem
a felkínálásban:

- a felkínálás a **betöltött felület** horgonyaihoz kötött (`ctx.surface_anchors`), nem a kiszolgáló
  környezetéhez; a szereplő-váltó lépések a bemutató **saját** `switch_actor` deklarációjából jönnek,
  nem kézi azonosító-listából (KUKA-045);
- a kérés **megnevezheti** a felületét (zárt lista: `app` · `demo`), de **képességet nem állíthat
  magáról**: a horgony-készletet a kiszolgáló a lap **fájljából MÉRI** (`data-testid` ·
  `data-tour-anchor` — a `tour.mjs` feloldójával egyező két attribútum). Nem ismert név → üres készlet,
  és a válasz `surface: null`-t mond;
- **a bizonyíték a helyére került:** a két történetet a bemutató LAPJÁN visszük végig
  (`proof:demo-walk`, a kötelező kapu része), és az a lap a VALÓDI kiszolgálótól kapja a listát
  (`demo:knowledge`, `surface=demo`) — amit tehát a termék a bemutató-felületnek felkínál, azt ott
  **végig is viszik**; amit a héjnak felkínál, azt az e2e viszi végig, mind `befejezve`;
- **és ami nem veszhetett el** (az R164/3 kikötése): a bemutató lépései három VALÓDI műveletet mértek
  — meghívó visszavonása · tag eltávolítása · visszahívás —, ezeket a próba a bemutató keretétől
  **függetlenül**, ugyanazokkal a nyugtákkal végzi el.

**AMIT EZ A NÉGY KÖR MEGMUTAT RÓLAM.** Három különböző körben UGYANAZ a mechanizmus bukott el: egy
szabályt egy helyen javítottam, a többi házát nem kereste meg gép (`KUKA-003`). A mai állás: a
pozitív minták **fájl-listára** szólnak, tehát egy negyedik másolat is pirosat ad. Ez nem „jobban kell
figyelni" — ez gépi jel.

---

## 8. NYITOTT TÉTELEK — NEVESÍTVE, MÉRT TÜNETTEL

1. **A két szereplős történet az ALKALMAZÁS-HÉJBAN — ez már nem nyitott rés, hanem DÖNTÉS**
   (`D-VS-3199`, a 6. review-kör nyomán). A héjban nincs „váltás a másik nézetére" vezérlő, és éles
   üzemben nem is lenne értelme (a meghívott a SAJÁT eszközén lép be) — ezért a kiszolgáló ott **fel sem
   kínálja** a két történetet. A végigvitelük bizonyítéka a bemutató LAPJÁN áll
   (`proof:demo-walk`, a kötelező kapu része), a listát pedig az a lap a VALÓDI kiszolgálótól kapja
   (`demo:knowledge`, `surface=demo`). **AMIT EZ NEM ÁLLÍT:** a bemutató-lap háttere a SZIMULÁLT
   adapter, tehát az a tanú nem HTTP- és nem tároló-bizonyíték (KUKA-227) — a három VALÓDI műveletet
   (visszavonás · eltávolítás · visszahívás) a héj próbája méri, a határon.
   *Ami ebből tényleg nyitva van:* a **390 px-es szélesség** a bemutató-lapon, és a bemutató
   folytatásának megőrzése a meghívás elfogadása UTÁN — mindkettő a bemutató-lap kérdése, nem a héjé.
2. **A külső-ellenőrző lánc NEM TELJES** — 19 programból 14 futott (13 MEGFELEL · 1 ELTÉRÉS), **5 nem
   futott**. Az `r59a` eltérése **mérés-idő** természetű (30 perces program-korlát, `ETIMEDOUT`), nem
   tartalmi bukás — de a tartalmáról ezen a futáson **nincs mért állításom**. A korlátot szándékosan nem
   tágítottam: egy korlát felnyitása nem javítás (5.3 pont).
3. **PG 18-kompatibilitás** — NEM IGAZOLT; a konkrét kísérlet és hiba a 3.4 pontban.
4. **Élő AI-kapcsolat mérése** — szolgáltatói kulcs nélkül nem lehetséges.
5. **Felhős mentés/visszatöltés, belső próba-fiók** — nem megoldott, és ebben a körben nem is
   nyúltam hozzájuk.
6. **A 20 lefedési hiány-kulcs** — a kettéosztás MÉRVE (19 pótolható · 1 fejlesztési rés), a
   pótolható rész ebben a csomagban hárommal csökkent. A maradék megírható munka, nem ismeretlen.
7. **A `KUKA-362` és a `KUKA-383` KILÉPÉS-ágának böngészős mérése** — ma nincs, és most már a **pontos
   okkal**: a meghívó-képernyő a teljes alkalmazás-héjat lecseréli, tehát a **profil-menü — és vele a
   kilépés-vezérlő — ott nem rajzolódik ki**. A felületen így nincs út, amin a meghívó jegy a
   címsorban állva kilépés érné. Amit mérünk: a **közös elfelejtőt** a beváltás ágán (ez bejárható);
   a kilépés ága ugyanazt az **egy otthont** hívja. A hiányzó mérés feltétele egy **termék-döntés**:
   legyen-e a meghívó-képernyőn kilépés vagy visszalépés (ez `KUKA-201` kérdése is — a nemleges válasz
   vigye a működő folytatást), mert ma az a képernyő egy **zsákutca**, ha a meghívó már be van váltva.

---

## 9. A ZÁRÓ KAPU ÉS AMIT EZ A JELENTÉS NEM ÁLLÍT

**AMIT EZ A JELENTÉS NEM ÁLLÍT:**

- **Nem** állítja, hogy a csomag merge-kész. Az összverdikt: *helyi ellenőrzések kész / független
  review FÜGGŐ.*
- **Nem** állítja, hogy a mai fejet (`76378f3`) független fél elfogadta — és a **válaszolt vagy lezárt
  szál nem egyenlő az elfogadással**. A hat kör mind a 30 szálát megválaszoltam és lezártam, tehát a
  PR-on ma nincs nyitott review-szál; ez **nem** független elfogadás.
- **Nem** állítja, hogy a külső-ellenőrző lánc zöld. **Nem teljes**: 5 program nem futott, egy
  (`r59a`) időtúllépéssel zárt. A nem futott **nem „részben"**, és nem zöld (KUKA-200 · KUKA-206).
- **Nem** állítja, hogy a hosszú láncok a MAI fejen futottak, az egy újramért böngészős kapun kívül: a
  mag-mutációs battéria és a külső-ellenőrző a `c2cccd1` fejen futott, és a különbség nevezett (1. szakasz).
- **Nem** állítja, hogy a PostgreSQL-mérés a Railway üzemére vagy a 18-as verzióra érvényes.
- **Nem** állítja, hogy a két szereplős történet az alkalmazás-héjban végigvihető — a kiszolgáló ott
  **fel sem kínálja** (`D-VS-3199`), és a bemutató-lapi tanú háttere a SZIMULÁLT adapter (8/1. tétel).
- **Nem** állítja, hogy a lefedési hiány megszűnt — 20 kulcs áll, kettéosztva és nevesítve.

---

**ÉS EGY OPERÁTORI TUDNIVALÓ A ZÁRÁSHOZ.** A csomag ablakán a mérő **elérte a chatváltási jelzőt**
(kumulatív fő-szál kontextusmedián **407 559** ≥ 400 000, 938 hívás, nulla al-ügynök). A szabály
(`D-VS-3083`) szerint ez nem megállás és nem hiba: a **futó** munkablokk célzott ellenőrzéssel
lezárható — ez történt —, a **következő önálló nagy blokk** viszont **friss beszélgetésben** induljon.
Ezért ebben a zárásban **nem** indítottam új feltárást, nem nyitottam új funkciót, és nem futtattam
opcionális teljes söprést; a külső-ellenőrző lánc hiányzó öt programja így **nevezett maradék rés**,
nem elhallgatott lépés. A folytatás első teendője: ez az öt program (`--only` külön-külön), friss
beszélgetésben.
