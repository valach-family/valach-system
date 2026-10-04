# R153 — A két rés lezárva, és egy súlyosabb lelet, amit közben találtam

> **Kör:** R153 · **Sáv:** Claude-v3 · **Állapot:** lezárt

**A parancs:** `CMD-VS-300-002-002 R152 — SPEC` (chatgpt-v3, 2026-10-04).
**Repó:** `valach-family/valach-system` · **Ág:** `claude/ecstatic-fermi-8c23co`.
**A parancs által vizsgált fej:** `53d9f00` · **ez a jelentés:** `42d6f2a`.

---

## 0. Amit ez a lap NEM állít

- **Railway-n semmi nem indult el tőlem**, és a hálózati akadályt sem próbáltam megkerülni.
  Az R152 §1 szerint a felhős végrehajtó a chatgpt-v3; én a kódot és a bizonyítékot készítettem.
- **Nincs élő AI-bizonyíték** (nincs kulcs) — nem futott mérés, nem kudarc.
- **Nincs felhős mentés/PITR-állítás** a V3-ra.
- **Az R142/R144 i18n/help/FAQ/tutor és kontextusos AI hiányai nyitva maradnak.**
- Merge nincs; a V2-höz és a Boardhoz nem nyúltam.

---

## 1. A KÉT NEVEZETT RÉS

### F152-01 — az olvasási hiba „nincs elvárás"-sá változott

A szerver így húzta be az elvárt migrációs készletet: `try { … } catch { return []; }`. Az ÜRES
készletre pedig a készenlét nem talál hiányzó migrációt. **Reprodukálva:** `required=[]` + üres
nyilvántartás → **HTTP 200, `ready`**. Vagyis a kiadás-kapu épp akkor engedett, amikor a kód
**nem tudja, milyen sémát vár** (KUKA-020: a nyelt hiba).

**Javítás: fail-closed.** A hiba OKA megmarad (a naplóban nevén nevezve), a kifelé menő válasz
NEVEZETT és titokmentes, a készenlét **503**: `migration_set_unreadable` · `migration_set_empty`.
A készlet továbbra is a **kiadott csomagból** jön — nincs új kézi verziólista. Az SQLite-út
érintetlen (ott nincs migrációs készlet; ezt a sorrend tartja).

**Bizonyíték:** `proof:pg-readiness` **11/11**, és a három hibás eset a **VALÓDI
szerver-bekötésen** mérve (a `migrations/` könyvtár ideiglenes elvételével), **pozitív
kontrollal** (R11) és a **repó épségének visszamérésével** (R10).

Az `ahead_versions` mostantól kimondja a saját korlátját: az elfogadás a **kiadási rend**
szerződésén nyugszik, **nem** a futó kód ellenőrzésén — a nem szállított migrációk tartalmát ez a
példány nem látja.

### F152-02 — a versenypróba hibás írókkal is átment

A külső fél ellenpróbáját megismételtem a régi kiértékelő logikán: **két eldobott író és üres
végállapot mellett mindhárom állítás PASS lett.** Igazuk van. Négy rész javítva:

| # | mi volt | mi lett |
|---|---|---|
| 1 | a megállítás a `FROM invite WHERE token` mintára állt — ez a `redeemInvite` **tranzakción KÍVÜLI** olvasása | a megállítás a **tranzakción belül, a közös sor-zár UTÁN** fog |
| 2 | 400 ms `sleep` „bizonyította" a másik fél várakozását | a blokkolást egy **harmadik, független kapcsolatról** a `pg_locks`-ból olvassuk vissza |
| 3 | a barrier visszatérési értékét senki nem nézte | lejárt barrier ⇒ **FAIL**, soha nem PASS |
| 4 | nem mértük, hogy az írók rendben futottak-e | mindkét gyerek **0 kóddal, `threw`/`crash` nélkül**; a **tervezett nyertes tényleg ÍRT**; a vesztes **NEVEZETT** nyugtát kapott |

**Az előző jelentés állítása ezzel szűkül:** mindkét R151-es menetben ugyanaz a fél nyert, tehát a
két kért nyerési sorrendből **egyet sem igazoltam**. Most mindkettő kikényszerítve:

- **(A) a beváltás nyer** → beváltva, **1 tagság**, **0 visszavonás-sor**; a visszavonás nyugtája
  `invite_already_redeemed` (`ok:true`, `changed:false`).
- **(B) a visszavonás nyer** → **1 visszavonás-sor**, nincs beváltás és nincs tagság; a beváltás
  nevezetten `invite_revoked`.

A kiértékelés **tiszta feloldóba** került (`judgeRound`), és `--selftest` ellenpróbázza: **7 eset**,
köztük a külső fél **pontos** esete, ami most helyesen **BUKIK**. (`verify:domain-race-judge`)

A (C) menetben mostantól a **műveletek sikerét** is mérjük: két no-op sem ad ki adatot, az
önmagában nem bizonyít működő írókat.

**És egy helyesbítés a saját kódkommentemen:** a `delegation.mjs` még „néma jogosultság-
szivárgásként" állította azt az esetet, amit a saját R151 jelentésem **már megcáfolt**. A komment
most a mért valóságot mondja, és kimondja, hogy a zár ott **megelőzés**, nem egy mért szivárgás
javítása (KUKA-050).

---

## 2. A SÚLYOSABB LELET — amit a §5 munkája közben találtam

**A nyugta-írás PostgreSQL-en SOHA nem működött, az R148-as saját régim óta.**

```js
v3ref/command.mjs:  if (!store.db?.isTransaction) fail('RECEIPT_OUTSIDE_TX', …)
```

A `.db` az **SQLite-illesztő saját tulajdonsága**. A PostgreSQL-tárolón nincs ilyen, tehát a
kifejezés **mindig hamis** lett, és a nyugta-írás PG-n **kivétel nélkül elbukott**. Mérve: a
csatorna-megerősítés **`/api/verify` útja PostgreSQL-en 500-at adott**. Ezzel a parancs-nyugtát író
**összes út** — a készletmozgás üzleti magja is — használhatatlan volt a célzott tárolón.

### És amiért eddig nem látszott — ez a rész a fontosabb

**A saját paritás-próbám csak azt nézte, LÉTEZIK-E a megerősítő hivatkozás** (`verified:
Boolean(link)`), a **választ eldobta**. Így a „19 lépés / 0 eltérés" állítás **gyengébb volt, mint
aminek látszott**: a `/api/verify` PG-n 500-at adott, SQLite-on 200-at, és a mérő ezt nem vette
észre. Egy nem rögzített válasz nem mérés (KUKA-215).

**Javítva mindkettő:**
- **TXS-01** — a tranzakció-állapotot a **tároló mondja meg** (`inTransaction`), nem a hívó
  találgatja a belső mezőiből; mindkét tároló adja. A nyers `DatabaseSync`-et átadó beadott
  próbákhoz tartalék-ág marad, **kimondva**.
- a paritás-próba **rögzíti a verify státuszát**, és a lefedés-kapu `verify_status === 200`-at
  követel.

**A `verify:mutation-anchors` azonnal elkapta, hogy a javítás elmozdította az M41 horgonyát** —
pontosan erre épült (R148). Újra-horgonyozva; a mutáció továbbra is kikapcsolja az őrt.

---

## 3. KAPCSOLAT-HELYREÁLLÁS (R152 §5)

A hídjavítás helyesen **érvénytelenítette** a kapcsolatot egy eldönthetetlen hiba után — de a
szerver egyszer nyit tárolót, tehát a `poisoned` jelző **önmagában nem állít helyre semmit**: az
első ilyen hiba után a példány minden további kérésre elakadt volna. A zárás megvolt, a
**folytatás** nem (KUKA-201).

**Megoldás: rendezett újracsatlakozás a KÉRÉS HATÁRÁN** (`openResilientPgStore` +
`recoverIfNeeded`). Két szabály, és a második a fontosabb:
1. **új kapcsolat, nem újraélesztett** — a mérgezett hidat eldobjuk;
2. **a helyreállítás NEM ismétli meg a műveletet** — egy ismeretlen COMMIT-kimenet után a vak
   újrapróbálás duplikált hatást szülne; az ismétlésről a hívó dönt, az `operation_once`
   szerződése szerint.

**Miért csak a kérés határán:** ha egy `tx(fn)` közepén cserélnénk kapcsolatot, a callback további
mondatai **tranzakción kívül** futnának — a hívó azt hinné, atomi egységben van. Az ilyen
„segítőkész" helyreállítás rosszabb volna a hibánál (KUKA-026).

**Bizonyíték:** `proof:pg-recovery` **10/10 valódi PostgreSQL-en** — a hiba előtt kiszolgál · a
hiba nevezetten elszáll · a kapcsolat érvénytelen · helyreállás előtt minden hívás elakad · új
kapcsolat nyílik · utána olvasás és **írás** is megy · tranzakció közbeni szakadás után **nem
ismétel** és nem hagy félkész hatást.

> **V10 — egy mért tény, ami a szabályt indokolja:** a takarító lépés is időtúllépésre futott,
> mert az **elhagyott lekérdezés a kiszolgálón tovább fut**, és a félbeszakadt tranzakció zárjait
> tartja. Mérve: **3 ilyen mondat** futott még. A kliens feladta, a szerver nem — ezért nem
> szabad a válasz hiányából „nem történt meg"-re következtetni.

---

## 4. BIZTONSÁGOS STAGING-TESZTFIÓK (R152 §5)

`npm run staging:test-account` — **két független kapu**: `VS_APP_ENV=staging` **és**
`--confirm <adatbázis-név>`, ahol a nevet a **valódi kapcsolatról** olvassuk vissza
(`current_database()`), nem a kapcsolati szövegből. Mindhárom elutasítás mérve.

**Amit nem csinál:** nem kerüli meg a jogosultsági szabályokat (ugyanazokat az írókat hívja, amiket
a héj — nincs nyers SQL) · **nem nyitja vissza a fejlesztői levél-fogadót** (a kihívást maga váltja
be: ugyanaz a művelet, amit a felhasználó a levélbeli hivatkozással indít, csak levél nem megy) ·
nem küld külső levelet · nem vet éles mintaadatot · **nem állítja magát valódi céges szereplőnek**
(a cím `.invalid` végű — RFC 2606 szerint sosem kézbesíthető —, a munkakörnyezet neve kimondja,
hogy PRÓBA) · **a jelszót nem írja ki** (a futtató adja környezeti változóban).

**A végigjárható út mérve, valódi HTTP-n, kikapcsolt fejlesztői felülettel:**

| lépés | eredmény |
|---|---|
| fejlesztői felület | **KI** · `/dev/mailbox` → **404** |
| belépés a szintetikus fiókkal | **200** |
| munkakörnyezetek | 2 (személyes kör + `PRÓBA — … (szintetikus, nem valódi cég)`) |
| **tartós művelet** (munkatárs meghívása) | **201**, meghívó kiadva |
| mit lát utána | **200**, a függő meghívó a listán |

A pontos, biztonságos futtatási mód a `V3_RAILWAY_KIADAS_JEGYZET.md` 4. pontjában áll.

> **Két saját hiba az építés közben**, mindkettő a KUKA-118 alakja (a mag szerződése kész volt, a
> hívó nem adta át): a vállalkozási minőség alakja (`namespace`/`valueRaw`, nem a HTTP-mezőnevek),
> és a jelszó **előre-hasholása** (a `registerAccount` maga képzi a lenyomatot). Mindkettő javítva,
> és a kód kimondja.

---

## 5. A BUILDER-ÜTKÖZÉS (R152 §2)

A `railway.json` `builder: NIXPACKS`-et írt elő, a szolgáltatás beállítása viszont **RAILPACK**. A
repó fájlja a telepítéskor **felülírta volna** a szolgáltatásét — csendes builder-váltás a kiadás
pillanatában. **A `build` szakasz ezért kikerült:** a buildert a **szolgáltatás** adja, a repó csak
azt írja elő, ami a FUTÁSRÓL szól (pre-deploy · start · healthcheck · példányszám).

A kiesett `npm ci --omit=dev` kiváltása **változóval**: `NPM_CONFIG_OMIT=dev`. **Enélkül is
működik** (csak a `@playwright/test` kerül fölöslegesen a képbe), ezért **jegyzet, nem kapu**.

Az első indítás előtt visszaolvasandó 9 pont: `docs/70_PLANNING/V3_RAILWAY_KIADAS_JEGYZET.md`.

---

## 6. MI FUTOTT — és mi HELYI bizonyíték

**Minden lenti mérés HELYI, konténeres PostgreSQL 16.14-en készült.** A valódi Railway-célon
ugyanezek lényegét ÚJRA kell mérni — a helyi siker nem Railway-siker.

| mérés | eredmény |
|---|---|
| `proof:pg-readiness` | **11/11** (3 hibás eset a VALÓDI szerver-bekötésen + pozitív kontroll + repó-épség) |
| `proof:pg-domain-race` | **11/11**, mindkét nyerési sorrend kikényszerítve, `pg_locks`-szal igazolva |
| `verify:domain-race-judge` | **7/7** ellenpróba — a külső fél esete helyesen BUKIK |
| `proof:pg-recovery` | **10/10** |
| `proof:pg-bridge-transport` | **5/5** |
| `proof:pg-parity` | **19 lépés, 0 eltérés** — most már a `verify_status`-szal együtt |
| `proof:pg-concurrency` · `proof:pg-durability` | PASS · **7/7** |
| `verify:release-order` · `pg-schema-parity` · `env-loading` · `mutation-anchors` · `kuka` · `artifact-naming` · `doc-html` | mind PASS |
| app-lelet battériák (selfcheck · R75 · R121 · R132 · R134 · R144) | mind PASS |

---

## 7. MI VÁR A chatgpt-v3 RAILWAY-VÉGREHAJTÁSÁRA

A kód- és bizonyítékoldal kész. A felhős lépések (R152 §1 szerint):

1. **PostgreSQL + tartós volume** a `staging` környezetben, az app régiójával azonos EU-régióban;
2. **`DATABASE_URL`** az ÚJ staging Postgres reference változója;
3. **`VS_APP_ACCESS_PASSWORD`** — az operátor adja a Variables lapon (enélkül a szolgáltatás **el
   sem indul**); értéke sehová nem kerül;
4. **ellenőrzött deploy** a `42d6f2a` commitból (vagy igazolt leszármazottjából), majd a
   **9 pontos visszaolvasás**;
5. a telepítés után: **szintetikus tesztfiók** → védett tesztlink → asztali/mobil végigjárás;
6. tartósság és **mentés → elkülönített visszatöltés** a valódi célon, mért idővel.

**Költség:** az R152 §6 hivatalos díjszabása alapján a szemléltető alapbecslés **~6,20–15 USD/hó**
(mentés és AI külön, azok mérete még nincs ellenőrizve). Ezt **nem erősítem meg saját méréssel** —
a díjszabási oldal ebből a környezetből továbbra sem érhető el.

---

## 8. NEVESÍTETT FÜGGŐK

| # | Mi | Mi oldja fel |
|---|---|---|
| F1 | **A felhős staging felállítása és a védett tesztlink** | chatgpt-v3 Railway-végrehajtása (a kód kész) |
| F2 | **Élő AI-bizonyíték** | `VS_AI_API_KEY` a staging app Variables lapján |
| F3 | **Felhős mentés / PITR a V3-ra** | F1 után; a helyi dump/restore erről semmit nem állít |
| F4 | **`migrations/LEDGER.json` bejegyzés** | az első valódi staging-kiadás után (`released: []`) |
| F5 | **Kéréskorlát több példányon** | példányonként számol, memóriában |
| F6 | **`node:sqlite` kísérleti figyelmeztetés a PG-telepítésen is** | lusta behúzás; ártalmatlan, de zajos |
| F7 | **`NPM_CONFIG_OMIT=dev`** | a Variables lapon; enélkül is működik |
| F8 | **Az R142/R144 húsz tartalmi hiánya + kontextusos AI** | az előző SPEC szerint |
