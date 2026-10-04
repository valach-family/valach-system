# R148 — A V3 tartós adatútja PostgreSQL-en, és a telepíthető staging-csomag

> **Kör:** R148 · **Sáv:** Claude-v3 · **Állapot:** lezárt

**A parancs:** `CMD-VS-300-002-002 R146 — DECISION` + `R147 — DECISION` (chatgpt-v3, 2026-10-04).
**Repó:** `valach-family/valach-system` · **Ág:** `claude/ecstatic-fermi-8c23co`.

---

## 0. Amit ez a lap NEM állít — elöl, hogy ne kelljen keresni

- **Railway-n SEMMI nem indult el.** Nem hoztam létre Postgres-szolgáltatást, volume-ot, domaint,
  és nem telepítettem. A parancs ezt a végső operátori jóváhagyáshoz kötötte — a csomag KÉSZ, az
  indítás nem történt meg. **Minden lentebbi mérés HELYI, konténeres PostgreSQL 16.14-en készült.**
- **A helyi siker nem Railway-siker.** Amit itt mértem (migráció, paritás, párhuzamosság,
  tartósság, mentés-visszatöltés), azt a valódi célon ÚJRA kell mérni az első telepítés után.
- **Nincs AI-bizonyíték.** Szolgáltatói kulcs ebben a környezetben nincs, ezért az élő
  UI→backend→modell út NEM mért. Ez NEM „nem működik": ez **nem futott mérés**. Minden más munka
  haladt (R147 kikötése szerint).
- **Nincs PITR- és nincs felhős mentés-bizonyíték.** A helyi `pg_dump`/visszatöltés nem állít
  semmit a Railway mentéseiről (KUKA-089).
- **Az R142/R144 húsz tartalmi hiánya és a kontextusos AI továbbra is NYITOTT.** Ez a kör
  infrastruktúra volt; azokat nem teljesítette és nem is állítja.
- **Merge nincs**, a `main`-hez nem nyúltam, a V2-t és a Boardot nem módosítottam.

---

## 1. A kiindulás — egy olyan hiba, amit előbb kellett javítani, mint bármit építeni

Az R146 a bázist az `ea113c92` fejre tette, *„vagy igazolt későbbi leszármazottjára… régi mainre
ne lépj vissza"*. **A munkamenet kijelölt ága a `main`-en állt, ami MÉRVE a megadott fej ŐSE** — tehát
a munka a régi állapotra épült volna. Az ágat ezért a `0705f911` fejre állítottam: ez az `ea113c92`
IGAZOLT, közvetlen leszármazottja (`git merge-base --is-ancestor` mérve), és már hordozza a két
board-kört a forrás-dokumentumok között. Saját commit nem veszett el (a mérés szerint az ág nem
hordozott egyetlen egyedi commitot sem).

---

## 2. A központi tervezési döntés — miért NEM írtam át a magot

A parancs három dolgot követelt EGYSZERRE, és ezek első olvasásra kizárják egymást:

| # | A kikötés | Honnan |
|---|---|---|
| a | a mai szerver írói/olvasói PostgreSQL-en fussanak, dísz-Postgres nem kész | R146 §4 |
| b | **ugyanaz a domain-szabály éljen, ne épüljön második üzleti motor** | R146 §4 |
| c | a beadott külső bizonyíték VÁLTOZATLANUL futtatható marad | KUKA-121 · 122 |

A (c) azért kemény korlát, mert a `v3ref/external-checks/` **24 beadott programja** a tároló
**szinkron** API-ját hívja (`store.get(...)`, `store.run(...)`), a `v3ref/` mag pedig **93 fájlon
át** ugyanezt az alakot használja. Az „írjuk át az egészet `async/await`-re" út tehát nemcsak
nagy — a **beadott tanút is átírná**, amit nem szabad.

**A feloldás: a különbség nem a szemantikában van, hanem a SZÁLLÍTÁSBAN.** A PostgreSQL illesztő
azért aszinkron, mert hálózaton megy — nem azért, mert a tranzakciói mások. Ezért a hálózatot egy
**munkás szál** végzi, a hívó szál pedig `Atomics.wait`-tel megvárja (`v3ref/pgBridge.mjs`). A hívó
ugyanazt a szinkron ajtót látja, a másik oldalon viszont **teljes értékű PostgreSQL** áll: valódi
tranzakció, mentéspont, trigger, idegen kulcs, sor-zár. **A mag egyetlen domain-sora sem változott
a tárolóváltás miatt** — csak három, mért hordozhatósági hiba javult (4. szakasz).

**Amit ez NEM old meg, kimondva:** a hívó szál a lekérdezés idejére blokkol, tehát **egy folyamaton
belül a kérések sorosak**. A párhuzamosságot a FOLYAMATOK adják (Railway-n a példányok) — és a
párhuzamos írást pontosan így is mértem: külön OS-folyamatokkal (5.3). Ez nem kerülőút: egy
egyszálú async szerveren a legtöbb ütközés fel sem lépne, külön kapcsolatokon viszont valódi.

### Amit a parancs tiltott, és amit tényleg nem csináltam

*„Ne próbáld szöveges SQL-helyettesítésekkel SQLite-nak álcázni a Postgrest."* — **Egyetlen**
szöveges átalakítás van, a **kötés-jelölés** (`?` → `$1`, `pgDialect.mjs`): ez jelölés, nem
szemantika, és tokenizálva történik, hogy a literálokban és kommentekben álló `?` érintetlen
maradjon. **Nem** emulálok típusaffinitást, **nem** fordítok triggert JS-be (19 VALÓDI plpgsql
trigger-függvény született), és **nem** pótolok PostgreSQL-képességet szöveg-cserével. A
`lastInsertRowid` (amire a PostgreSQL-ben nincs fogalom) `RETURNING id`-ből jön, és a tároló a
**sémától kérdezi meg**, mely táblák hordoznak identitás-kulcsot — nem találgatásból.

---

## 3. Mi készült el

| Terület | Hol | Mit |
|---|---|---|
| szinkron PG-kapu | `v3ref/pgBridge.mjs` · `pgBridgeWorker.mjs` | munkás szál + `Atomics.wait`; indulási jel, véges határidő, hibakód-átadás |
| tároló-illesztő | `v3ref/pgStore.mjs` | ugyanaz az ajtó: `run/get/all/tx/atomic/close` |
| kötés-jelölés | `v3ref/pgDialect.mjs` | `?` → `$n`, literál- és komment-tudatosan |
| hiba-feloldó | `v3ref/storeError.mjs` | egyediség-sértés felismerése MINDKÉT tárolón |
| séma | `migrations/001_v3_mag_sema.sql` | 39 mag-tábla + 1 alkalmazás-tábla · 19 trigger · 8 index |
| séma-származtatás | `tools/v3_pg_schema_gen.mjs` | a kanonikus sémából; a fájl ettől kezdve artefaktum |
| migrációs futtató | `tools/v3_db_migrate.mjs` | számozott · sha256 · ismételhető · `pg_advisory_lock` |
| kiadás | `railway.json` · `.nvmrc` · `.env.example` | pre-deploy migráció, rögzített futtató, változó-NEVEK |

**Új gépi jelek:** `verify:pg-schema-parity` · `verify:env-loading` · `verify:mutation-anchors`
**Új élő bizonyítók:** `proof:pg-parity` · `proof:pg-concurrency` · `proof:pg-durability`

---

## 4. HÁROM MÉRT HORDOZHATÓSÁGI LELET — mindhárom NÉMÁN bukott volna

Ezek nem elméleti kockázatok: mindhármat a mérés buktatta ki, és mindhárom úgy hibázott volna,
hogy közben zöldnek látszik.

**(1) Az egyszeriség felismerése két SQLite-jelre épült.** Az `onceOnly.mjs` így ismerte fel a
kulcs-ütközést: `message.includes('UNIQUE') || code === 'ERR_SQLITE_ERROR'`. PostgreSQL-en az
SQLSTATE `23505`, a mondat pedig más — **egyik jel sem illeszkedett volna**. A verseny vesztese nem
a nevezett `once_only_race` kimenetet kapta volna (amiből a hívó ismétlést csinál), hanem
programhibát: **az idempotencia pont a versenyhelyzetben bukik el.** A felismerés most EGY helyen
áll (`storeError.isUniqueViolation`), és mindkét tároló jelét ismeri.
*Megtalálta: Claude-v3, célzott kódolvasáson. Gépi jel: `proof:pg-concurrency` (A).*

**(2) Négy SQLite-bővítés a domain-kódban.** `INSERT OR IGNORE` (3×) és `INSERT OR REPLACE` (1×) —
PostgreSQL-en **szintaktikai hiba**. Ez buktatta a paritás-próba első futását: a csatorna-bizonyíték
sora nem jött létre, a munkakörnyezet pedig `creator_channel_unproven`-nel állt meg. Hordozható
`ON CONFLICT` alakra írva: **egy mondat, két motoron**, tároló szerinti elágazás nélkül. (Az
`INSERT OR REPLACE` jelentése nem is azonos a frissítéssel — az SQLite TÖRÖL és beszúr, tehát DELETE
triggert is tüzelne; az érintett táblán MÉRVE nincs trigger, ezért a két alak itt azonos hatású.)
*Megtalálta: `proof:pg-parity`. Gépi jel: `verify:pg-schema-parity` (a maradék alakokra).*

**(3) A kiadási őr a PG trigger-függvényeket töredékekre szedte.** A `releaseOrder.js` mondat-vágója
a `;` mentén vágott, a plpgsql törzs viszont dollár-idézésben áll és saját pontosvesszőket tartalmaz.
Az első PG-migráció ezért **nem a tartalma miatt** bukott meg, hanem mert a vágás összetörte; a
törzsben álló `INSERT` ráadásul migráció-kori adatváltozásnak látszott. **Az őrt nem kapcsoltam ki**
(R146 §5), hanem megtanítottam a dollár-idézésre, a `CREATE FUNCTION` (bővítés) és a
`CREATE TRIGGER` (szorító) alakra. A migráció most **kimondott `-- BESOROLÁS: restrictive` fejlécet**
visel, azzal az indokkal, hogy a szorító alakok kizárólag UGYANEBBEN a migrációban született
táblákra vonatkoznak — nincs múltbeli adat és nincs régi író. `verify:release-order`: **37/37 PASS**.

---

## 4/b. A NEGYEDIK LELET — amit a hordozható SQL NÉMÁN magával rántott

A (4/2) átírás (`INSERT OR IGNORE` → `ON CONFLICT`) **két további dolgot vitt magával**, és egyik
sem a terméken jelentkezett. Mindkettő ugyanabból az egy okból: **ami a MEGVALÓSÍTÁS SZÖVEGÉHEZ
köti magát, az tárolóváltáskor lecsúszik.**

**(a) Két mutációs horgony (M59 · M203).** A mutációs battéria a mag FORRÁSSZÖVEGÉT írja át: minden
bejegyzés egy `from` (a mai szöveg) és egy `to` (az elrontott szöveg) párt hordoz. Ha a `from`
szöveg megváltozik, **a mutáció nem keletkezik** — és ez néma: nem hiba, csak *kevesebb* mutáció
fut, a hozzá tartozó próba pedig „NEM FALSZIFIKÁLT" lesz. **Elveszítünk egy őrt anélkül, hogy
bárki észrevenné.** A tünet három réteggel távolabb jelent meg: a külső fél `r83core` programja
bukott el *„a 17/36 egység NEM nullával zárt — a bukás oka: content"* üzenettel.

**(b) A beadott tanú befecskendezési pontja (r67/F04).** A külső fél programja a tároló-hibát a
mondat SZÖVEGÉRE illesztve fecskendezi be (`sql.includes('INSERT OR IGNORE INTO claim')`). A termék
viselkedése **nem változott** — a horog nem talált többé, tehát a próba nem a terméken bukott el.
A **történeti tanú bájtazonos maradt** (KUKA-121 · 122); az adaptált nemzedék (`adapted-v4`)
hatóköre **egyetlen karakterlánc**, és ezt a `case-manifest` és az `activeCoreProgram` ki is mondja.

**ÚJ GÉPI JEL — `verify:mutation-anchors` (MUT-02).** Mind a **231** horgonyt méri: megtalálható-e a
megnevezett forrásban, és **pontosan egyszer** szerepel-e. Ellenpróbával igazolva: egy elcsúsztatott
horgonyra PIROS, és kiírja a nevét **meg az őrizetlenül maradt próba nevét is**. Órákkal és három
rétegen át derült ki, amit ez az egy illesztés-ellenőrzés azonnal megmondott volna.

### És egy HELYESBÍTÉS a saját attribúciómon

Az első jelentés-alakomban az `r81core` eltérést *„örökölt / környezeti"*-nek minősítettem, mert a
BÁZISON futtatva 600 másodperc után időtúllépéssel állt meg, részletes eredmény nélkül. **Ez a
következtetés hibás volt**, és a hiba fajtája nevesíthető: egy **elakadt mérésből** olvastam ki azt,
hogy „nem a miénk". Az elakadt mérés definíció szerint SEMMIT nem állít — sem azt, hogy jó, sem
azt, hogy a hiba máshonnan jön (D-VS-693). A horgony-javítás után, HEAD-en, egyedül futtatva:
**`r81core` 15/15 zöld**. Mind a három eltérés UGYANANNAK az egy oknak a következménye volt.

> **A saját attribúcióm is MÉRÉS, nem besorolás (KUKA-033).** Ha a viszonyítási pont maga elakadt,
> akkor nincs viszonyítási pont — újra kell mérni, nem értelmezni.

---

## 5. A BIZONYÍTÉKOK — mi futott VALÓBAN, helyi PostgreSQL 16.14-en

### 5.1 Migráció — tiszta adatbázis, ismételt futtatás, rontás, verseny

| Mérés | Eredmény |
|---|---|
| tiszta adatbázisra | `1 új · 0 már futott` — 40 tábla, 19 trigger, 19 trigger-függvény |
| **ismételt** futtatás | `0 új · 1 már futott`, kilépés 0 (a kiadási lánc minden telepítésnél hívja) |
| egy MÁR LEFUTOTT migráció átírása | **megáll**, `MIGRATION_CHECKSUM_MISMATCH`, kilépés 1 |
| **4 futtató EGYSZERRE**, tiszta adatbázison | 1 alkalmazott · 3 megvárta · a nyilvántartásban **pontosan 1 sor**, mind 0-val lép ki |

### 5.2 Tároló-paritás — ugyanaz a felhasználói út, két tárolón (`proof:pg-parity`)

**19 mért lépés, 0 eltérés.** Lefedve: regisztráció → csatorna-bizonyítás → belépés → anti-enumeráció
→ rossz jelszó → munkakörnyezet → meghívó kiadása (pecsételő trigger) → beváltás → **ugyanaz a
meghívó másodszor** (`invite_already_redeemed`) → tagok → adatkör-olvasás engedéllyel és anélkül →
hatáskör megadása és megvonása → **kliens által küldött jogosultsági mezők figyelmen kívül hagyása**
→ tagság megvonása → megvont tag olvasása.

> **A mérő SAJÁT lelete, mert enélkül hazudott volna:** az első alak **18 EGYFORMA KUDARCOT** mért
> „0 eltérésnek" — a lánc az első lépésnél elakadt (az én próbám kis-nagybetű-érzékenyen hasonlított
> címet, a rendszer viszont normalizál), és két egyforma kudarc is „egyezik". A próba azóta **kiírja
> a mért értéket**, és **LEFEDÉS-kapuja** van: öt kulcs-lépésnek VALÓBAN sikerülnie kell, különben a
> kimenet nem zöld, hanem *„A MÉRÉS SEKÉLY"* (KUKA-127 · KUKA-216).

### 5.3 Párhuzamos írás — 8 KÜLÖN OS-folyamat, saját kapcsolattal (`proof:pg-concurrency`)

| Tengely | Eredmény |
|---|---|
| **egyszeriség** (ugyanaz az idempotencia-kulcs) | 1 nyertes · **7 NEVEZETT `once_only_race`** · 0 összeomlás · a tárolóban 1 sor |
| **kulcs-invariáns** (ugyanaz a tagság-sor) | 1 nyertes · **7 egyediség-sértés (23505)** · a tárolóban 1 sor |

Ez a (4/1) lelet élő ellenpróbája: a régi felismerés mellett a 7 vesztes programhibát kapott volna.

### 5.4 Tartósság, mentés, visszatöltés (`proof:pg-durability`) — 7/7

Írás a FUTÓ alkalmazáson át → **az alkalmazás leáll és újraindul** → a fiók megvan →
`pg_dump` → visszatöltés **ELKÜLÖNÍTETT** cél-adatbázisba (a próba megáll, ha a cél a forrás volna)
→ **visszaolvasás**: sor-számok egyeznek, séma-verzió egyezik, és a KONKRÉT bizonyított csatorna
visszajött. *A nem próbált mentés nem mentés (KUKA-038).*

### 5.5 A kiadási csomag úgy, ahogy a Railway futtatja

`npm run db:migrate` (pre-deploy) → `node v3app/server.mjs` (start) → mérve:

```
[v3app] fut: a konténer PORT-ján (8099)  · tároló: PostgreSQL (tartós)
[v3app] környezet: staging · hozzáférés-védelem: BE · fejlesztői felület: KI
```

| Próba | Eredmény |
|---|---|
| `/health` hitelesítés nélkül | **200** (a telepítő kérdezi; a kéréskorlát sem érinti) |
| `/ready` | **200** — `{"store":"postgres","schema_head":"001","dev_surface":false}` |
| `/` hitelesítés nélkül | **401** |
| `/` hitelesítéssel | **200** |
| `/dev/mailbox` **hitelesítéssel is** | **404** — két független réteg, ahogy a parancs kérte |
| kötési cím | **`0.0.0.0`** telepítve, `127.0.0.1` helyben (mérve, nem állítva) |
| SIGTERM | **szabályos leállás** |

> **Egy mért részlet, ami a konfigurációt megváltoztatta:** `npm start`-tal indítva a SIGTERM az
> npm-burokhoz ment, és a szabályos leállás **nem futott le**. A `railway.json` ezért közvetlenül
> `node v3app/server.mjs`-t indít.

### 5.6 Regressziók — a tárolóváltással érintett invariánsokon

`verify:release-order` **37/37** · `verify:pg-schema-parity` **PASS** (mindkét irányban) ·
`verify:env-loading` **7/7** · `verify:kuka` **600/600** · `verify:artifact-naming` **28/28** ·
`verify:decision-numbers` **4/4** · `verify:mutation-anchors` **231/231** ·
`app:selfcheck` és az app-lelet-battériák (R75 · R121 · R144) **PASS**.

**A külső ellenőrző fél programjai (`verify:external-checks`) — attribúcióval.** A battéria
MINDEN eltérését a BÁZIS commithoz (`0705f911`) mérve soroltam be, nem a saját ágamhoz
(KUKA-122). A három eltérést, amit ez a kör okozott, EGYENKÉNT, EGYEDÜL futtatva mértem újra a
javítás után:

| program | bázis | HEAD a javítás előtt | HEAD a javítás után |
|---|---|---|---|
| `r67` | MEGFELEL | 7/8 — ELTÉRÉS | **8/8 zöld** |
| `r81core` | *elakadt mérés* (600 s időtúllépés) | 7/15 — ELTÉRÉS | **15/15 zöld** |
| `r83core` | 7/7 MEGFELEL | 3/7 — ELTÉRÉS | **7/7 zöld** |
| `r57` · `r57a` · `r59` · `r59a` · `r79` | **a bázison is ELTÉRÉS** | ELTÉRÉS | ebben a körben nem érintve |

> **KIMONDVA, mert a „nem futott" nem „zöld" (KUKA-200):** a TELJES battéria záró újrafuttatása
> **NEM FUTOTT VÉGIG** — 19 programból 9 ért véget (mind MEGFELEL, köztük a javított `r67`), majd a
> futás megszakadt, mert a saját takarításom lőtte ki a folyamatot. Ez tehát **elakadt mérés**, nem
> eredmény, és nem is rejtjük el. A fenti három sor viszont NEM ebből a futásból való: mindhármat
> külön, `--only` kapcsolóval, ÜRES gépen mértem meg — az ő állapotuk IGAZOLT. A maradék tíz
> programra a jelen lap **nem állít** záró eredményt; közülük ötről (a `r57` · `r57a` · `r59` ·
> `r59a` · `r79`) azt tudjuk, hogy a BÁZISON is piros volt.

---

## 6. A `.env` út javítva — és MÉRVE, nem ígérve

A szerver és **mindkét** AI-eszköz a közös `loadRepoEnv`-et hívja, a konfiguráció kiértékelése előtt.
A `verify:env-loading` hét állítást mér **külön folyamatban, valódi `.env` fájllal**: a szerver és a
két eszköz látja a fájlt · **meglévő környezeti változót nem ír felül** (élesben a Railway az
erősebb) · más munkakönyvtárból is a REPÓ `.env`-je töltődik · a diagnosztika **titokmentes** · és
az **ESM import-sorrend mérve**: a betöltés ELŐTT behúzott modul is a betöltés UTÁNI értéket látja.

> A parancs kikötése szó szerint teljesült: *„Nem ígérem egyetlen sornak: az ESM-importok
> inicializálási sorrendjét is mérd."*

> **Saját mérő-lelet:** az őr első alakja a két eszközt behúzta egy próbamodulba — de azok
> `process.exit()`-tel zárnak, így a mérősor sosem futott, és **FAIL-t írt két MŰKÖDŐ eszközre**. A
> hazug piros ugyanolyan rossz, mint a hazug zöld (KUKA-049 · KUKA-093).

---

## 7. A TELEPÍTÉSI CSOMAG — konkrétan, a jóváhagyáshoz

**Cél (az R147 azonosítói szerint):**

| Elem | Név | Azonosító |
|---|---|---|
| workspace | valach-family's Projects | `63a10f3f-ddf4-4045-a042-786592504683` |
| projekt | valach-system | `307c5e09-03de-4b7f-8056-72aa5ff94853` |
| környezet | staging | `2d24bcb4-0fa0-4432-8fa4-dc17eeca6355` |
| alkalmazás | app | `a0996669-65e6-4d6a-9e5a-7141de199d30` |
| PostgreSQL | *még nem létezik* | a jóváhagyás után jön létre |

**Teendő az indításnál, sorrendben:**
1. **RÉGIÓ** — az `app` alapértelmezése a leltár szerint `us-west2`; **az első indítás ELŐTT** közös
   elérhető EU régióra kell állítani, és a Postgres-t UGYANOTT létrehozni (R147).
2. Postgres-szolgáltatás + tartós volume ugyanabban a környezetben.
3. Változók (NEVEK, értékek soha nem kerülnek lapra vagy chatbe) — a teljes jegyzék: `.env.example`.

| Változó | Érték forrása |
|---|---|
| `DATABASE_URL` | az ÚJ staging Postgres **reference** változója (`${{ Postgres.DATABASE_URL }}`) — soha nem a V2-é vagy a Boardé |
| `VS_APP_ENV` | `staging` |
| `VS_APP_ACCESS_USER` / `VS_APP_ACCESS_PASSWORD` | operátor adja; **enélkül a szolgáltatás el sem indul** |
| `VS_APP_TRUST_PROXY` | `1` |
| `VS_AI_PROVIDER` / `VS_AI_API_KEY` / `VS_AI_BASE_URL` / `VS_AI_MODEL` | a már engedélyezett szolgáltatói elérés; kitalált értéket a setup nem ír be |
| `PORT` | a Railway adja — kézzel nem állítjuk |

4. Kiadás **rögzített, ellenőrzött commitból** (`df23abd`, ág `claude/ecstatic-fermi-8c23co`);
   fejlesztői push ne telepítsen automatikusan.

**Ami a kódban már be van állítva:** pre-deploy `npm run db:migrate` (hibára a KIADÁS áll meg, nem
az adat törik) · `healthcheckPath: /health` · `numReplicas: 1` · Node 22-re rögzített futtató ·
`npm ci --omit=dev`.

### Költség — becslés, kimondott feltevésekkel

**Ez BECSLÉS, nem ajánlat**: a Railway díjszabását ebből a környezetből nem kérdeztem le, a számok a
szolgáltató ma ismert nagyságrendjein alapulnak, és a jóváhagyás előtt az operátornak a Railway
felületén érdemes visszaolvasnia.

| Tétel | Feltevés | Havi nagyságrend |
|---|---|---|
| app compute | 1 példány, kis terhelésű staging, ~0,5 GB | ~5–10 USD |
| PostgreSQL compute | 1 kis példány | ~5–10 USD |
| volume | 1–5 GB | ~0,5–1,5 USD |
| mentés | a szolgáltató beépített mentése, kis adatmennyiség | ~0–2 USD |
| forgalom | belső tesztelés, néhány GB | ~0–1 USD |
| **összesen (AI nélkül)** | | **~11–25 USD/hó** |
| **AI** | **külön sor** — modellhívásonként, nem fix; kulcs nélkül ma **0** | külön |

**Korlátok, amiket betartottam:** nincs Redis, nincs külön frontend-hoszt, nincs nyilvános
demo-másolat, nincs három üres környezet, nincs csomagváltás és nincs új fizetős AI-előfizetés.
**A workspace-szintű költési limithez NEM nyúltam** (az a V2 és a Board működését veszélyeztetné).

**Megfigyelés:** `/health` (folyamat) és `/ready` (tároló + séma-verzió) — a `/ready` 503-at ad, ha a
migráció elmaradt, tehát egy féltelepítés nem látszik zöldnek.

---

## 8. NEVESÍTETT FÜGGŐK — mi marad nyitva, és mi oldja fel

| # | Mi | Mi oldja fel |
|---|---|---|
| F1 | **Railway-provisioning és -telepítés** | operátori jóváhagyás a költségkeretre; utána ugyanezeket a próbákat a valódi célon is meg kell futtatni |
| F2 | **Védett tesztlink, asztali és mobil bemutatással** | F1 után |
| F3 | **Élő AI-bizonyíték** (UI→backend→engedélyezett kontextus→modell→ellenőrzött válasz) | `VS_AI_API_KEY` a staging app Variables lapján. Ma **nem futott mérés**, nem kudarc |
| F4 | **PITR és felhős mentés igazolása, mért helyreállítási idő** | production előtt; a helyi dump/restore erről semmit nem állít |
| F5 | **`migrations/LEDGER.json` bejegyzés** | a 001 még **sehol nem futott ki** (`released: []`), ezért szándékosan üres; az első staging-kiadás után kerül bele |
| F6 | **Kéréskorlát több példányon** | a mai korlát PÉLDÁNYONKÉNT számol, memóriában; ha a production több példányra nő, elosztott korlát kell |
| F7 | **`node:sqlite` kísérleti figyelmeztetés a PG-telepítésen is** | a szerver statikusan húzza be az SQLite-tárolót; ártalmatlan, de zajos — lusta behúzással szüntethető meg |
| F8 | **`V3_REPO_ES_UZEM_TERV.md` pontosítása** | az R146 kérte: a „három környezet" / „demo cégtér a stagingben" ellentmondás és a PITR-állítás mai azonosítókhoz kötése |
| F9 | **Az R142/R144 húsz tartalmi hiánya + kontextusos AI** | az előző SPEC szerint folytatandó, új követelménygyártás nélkül |

---

## 9. Az elkülönítés szintje — egy kimondott tervezési döntés

A tranzakciók **`READ COMMITTED`** szinten futnak (a PostgreSQL alapértelmezése). Ez SZÁNDÉKOS, és a
séma saját elvét követi: a kanonikus séma kimondja, hogy az invariánst **a KULCS tartja**
(`PRIMARY KEY` + `UNIQUE`), *„nem egy alkalmazás-oldali ellenőrzés, amit egy versenyhelyzet
megkerülhet"* (KUKA-047). A kulcs-ütközés `READ COMMITTED` mellett is kulcs-ütközés, és a vesztes
nevezett kimenetet kap — ezt az 5.3 **meg is mérte**.

**Amit ez NEM állít:** hogy minden „olvass, aztán írj" minta sorosítva van. Az SQLite
`BEGIN IMMEDIATE`-je a tranzakció elejétől írás-zárat fog; PostgreSQL-en ennek pontos megfelelője
`SERIALIZABLE` lenne, ami viszont sorosítási hibákat (`40001`) ad vissza, és a mag ma nem ismétel.
Ahol tehát egy invariánst ma NEM kulcs tart, ott a két tároló viselkedése elvben eltérhet. A mért
utakon eltérés nem volt; a nem mért utakra **nem állítunk semmit**.

---

## 10. Összefoglalás egy mondatban

**A V3 mai funkciói valódi PostgreSQL-en futnak, ugyanazzal a domain-kóddal, számozott és
ellenőrzőösszeggel őrzött migrációval, hozzáférés-védett és szabályosan leálló szolgáltatásként —
helyben, mérve; a felhős indítás a jóváhagyásra vár, és három olyan hordozhatósági hiba javult
közben, amelyik némán bukott volna el.**
