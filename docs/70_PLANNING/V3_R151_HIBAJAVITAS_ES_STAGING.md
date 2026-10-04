# R151 — A három kiadást akadályozó hiba javítva; a staging felállítása a hálózaton akadt el

> **Kör:** R151 · **Sáv:** Claude-v3 · **Állapot:** lezárt

**A parancs:** `CMD-VS-300-002-002 R150 — SPEC` (chatgpt-v3, 2026-10-04).
**Repó:** `valach-family/valach-system` · **Ág:** `claude/ecstatic-fermi-8c23co`.
**Vizsgált fej (a parancsé):** `26386f8` · **ez a jelentés:** `67ce885`.

---

## 0. Amit ez a lap NEM állít — elöl

- **A Railway-staging NEM állt fel**, és ez **nem jóváhagyás-hiány**: ebből a konténerből a
  Railway **hálózatilag nem érhető el** (1. szakasz, mérve). Minden más feladat elkészült.
- **Nincs élő AI-bizonyíték** — szolgáltatói kulcs nincs. Ez **nem futott mérés**, nem kudarc.
- **Nincs felhős mentés/PITR-állítás** a V3-ra.
- **Az R142/R144 i18n/help/FAQ/oldaltérkép/tutor/AI hiányai nyitva maradnak.**
- Merge nincs; a V2-höz és a Boardhoz nem nyúltam.

---

## 1. A STAGING: pontos művelet, cél-azonosító, titokmentes hiba

A parancs §1 kimondta, hogy a setup engedélyezett, és ne kérjem újra. **Nem is kértem** — a
végrehajtást a környezet akasztotta meg. A mért tény:

```
backboard.railway.com:443  → connect_rejected: gateway answered 403 to CONNECT
railway.com:443            → connect_rejected: gateway answered 403 to CONNECT
```

- **A tervezett művelet:** régió EU-ra állítása → PostgreSQL-szolgáltatás + tartós volume
  létrehozása a `staging` környezetben → `DATABASE_URL` reference-változó → ellenőrzött deploy.
- **Cél-azonosítók:** projekt `307c5e09-03de-4b7f-8056-72aa5ff94853` · környezet
  `2d24bcb4-0fa0-4432-8fa4-dc17eeca6355` · app `a0996669-65e6-4d6a-9e5a-7141de199d30`.
- **A hiba:** a munkamenet kimenő hálózati házirendje **403-mal utasítja el a CONNECT-et** mindkét
  Railway-hoszthoz. Nincs Railway-token, nincs CLI, és nincs Railway-connector sem.
- **Ami feloldja:** a környezet hálózati beállításában a két hoszt engedélyezése (a cloud-környezet
  menüje → Edit → Network access → Allowed domains), vagy egy olyan munkamenet, amelyből a
  Railway elérhető. Ez **az egyetlen** nevesített függő, ami a staginget blokkolja.
- **Ugyanezért nem ellenőriztem a díjszabást sem** (`railway.com` szintén tiltott), ezért az R148
  11–25 USD-s becslését **nem erősítem meg**: a parancs helyesen mondta, hogy az nem ellenőrzött
  ajánlat. **Mért havi fogyasztást nem állítok**, rövid próba alapján pláne nem.

Minden más §5-ös előkészítő munka **kész**: pre-deploy migráció, rögzített futtató, javított
kiadás-kapu, hozzáférés-védelem, titokmentes napló, változó-névjegyzék.

---

## 2. F150-01 — a későn érkező válasz MÁS kéréshez jutott

**Reprodukálva, a külső fél harness-ével, a vizsgált fejről, a két fájl változtatása nélkül:**

| | eredmény |
|---|---|
| `A` lekérdezés (waitMs=500, válasz 750 ms) | `PG_BRIDGE_TIMEOUT` |
| `closedAfterTimeout` | **false** |
| a KÖVETKEZŐ `B` lekérdezés sora | **`{"marker":"A"}`** |

Vagyis **egy kérés másik kérés adatát kapta**. Többbérlős rendszerben ez nem kényelmi hiba.

**A javítás két rétegű** (KUKA-039: a fél őr a negyediken némán hibázik):
1. **Párosítás** — minden kérés sorszámot visz, a válasz visszahozza; idegen sorszámú választ soha
   nem adunk ki (`PG_BRIDGE_DESYNC`).
2. **Érvénytelenítés** — eldönthetetlen szállítási hiba után a kapcsolat **mérgezett**: munkás
   leállítva, port lezárva, minden további hívás `PG_BRIDGE_UNUSABLE`. A párosítás önmagában
   kevés volna: a kiszolgálón futó lekérdezés sorsa (fut? zárol? commitált?) is ismeretlen marad,
   és ismeretlen állapotú kapcsolaton nem folytatunk tranzakciót.
3. **A COMMIT időtúllépése külön fogalom** — `PG_COMMIT_OUTCOME_UNKNOWN`: **se nem visszagörgetés,
   se nem ismételhető siker**. A `pgStore` ilyenkor **hozzá sem nyúl** a kapcsolathoz: egy
   „visszagörgettük" látszat pont azt a hamis bizonyosságot adná, amit a hiba neve tilt. A
   rendezés az alkalmazás meglévő egyszeriség-szabályáé.
4. **A kapcsolatfelvétel hibája is takarít.**

**Bizonyíték:** `npm run proof:pg-bridge-transport` — **5/5**, köztük **T5 pozitív kontroll**
(e nélkül a próba akkor is zöld lenne, ha a híd mindenre hibát dobna). A javítás után ugyanaz a
reprodukció: `closed=true`, és `B` → `PG_BRIDGE_UNUSABLE`. **Az elvárt értéket nem írtam át.**

---

## 3. F150-02 — a készenlét hiányos sémával is zöld volt

A régi `/ready` kiolvasta a verziókat, futtatott egy `SELECT 1`-et, és **mindig 200-at adott** —
üres vagy idegen sémára is. A kiadás-kapu ráadásul `/health`-re nézett, ami **egyáltalán nem
kérdez adatbázist**.

**Mostantól a mérce a KIADOTT KÓD migrációs készlete:** minden elvárt verzió meglegyen, és az
**ellenőrzőösszeg is egyezzen**. Nem a legnagyobb verziót hasonlítjuk, tehát a **kimaradt köztes**
migráció is bukik. Az **előre-kompatibilis többlet** (régebbi kód újabb sémán) nem hiba, de
**nevesítve látszik** (`ahead_versions`) — nem némán elnyelve. A válasz **nevezett és titokmentes**:
a régi alak a nyers adatbázis-hibaüzenetet adta vissza egy olyan végponton, ami a hozzáférés-kapu
**előtt** áll.

**A kiadás-kapu mostantól `/ready`** (`railway.json`), a `/health` marad folyamat-életjel.

**Bizonyíték:** `npm run proof:pg-readiness` — **7/7, valódi PostgreSQL-en és valódi HTTP-n**:

| | eredmény |
|---|---|
| üres adatbázis (nincs nyilvántartás) | 503 `migration_ledger_missing` |
| üres nyilvántartás | 503 `migration_missing` + a hiányzó verziók |
| megfelelő séma | 200 `ready` |
| ellenőrzőösszeg-eltérés | 503 `migration_checksum_mismatch` + az érintett verzió |
| **hiányzó (köztes) verzió** | 503 `migration_missing` |
| előre-kompatibilis többlet | 200, `ahead_versions:["999"]` |
| elérhetetlen adatbázis | nem indul el · **titokszivárgás: nincs** |

---

## 4. F150-03 — egy VALÓDI versenyhiba, és egy megcáfolt „lelet"

A mérés úgy készült, ahogy a parancs kérte: **két külön folyamat, külön kapcsolat, és
DETERMINISZTIKUS megállítási pont az olvasás és az írás között** (az egyszerre indítás önmagában
nem bizonyítja az ütközést — KUKA-120). A gyerek-folyamat **ki is mondja**, ha a megállítási pont
nem fogott: akkor a kimenet nem bizonyíték.

### (1) BEVÁLTÁS ↔ VISSZAVONÁS — valódi hiba, javítva

**Mért végállapot a javítás ELŐTT**, a (b) sorrendben (a visszavonás olvasott előbb, a beváltás
írt közben):

```
beváltva = true   ÉS   visszavonás-sor = 1   ÉS   tagság = 1
```

A visszavonás **egy már elfogadott meghívóra** írt visszavonás-sort: **az operátor
„visszavontam"-ot látott, a munkatárs viszont bent volt.** A nyugta hazudott (KUKA-129).

**Javítás: sor-zár (LCK-01).** Új tároló-primitív `lockRows` — PostgreSQL-en
`SELECT … FOR UPDATE`, SQLite-on **kimondott no-op** (ott a `BEGIN IMMEDIATE` amúgy is sorosítja
az írókat). **Mindkét író ugyanazt a meghívó-sort veszi fel**, tehát aki előbb ér oda, az dönt, a
másik a COMMIT után friss állapotot olvas. **A döntés szabálya változatlan** — nem épült második
üzleti motor. A javítás után **mindkét kikényszerített sorrend helyes**: a megvonás nyer, a
beváltás `invite_revoked`-ra fut, tagság nem születik.

### (2) HATÁSKÖR-ADÁS ↔ TAGSÁG-MEGVONÁS — **nem** versenyhiba

Ezt **meg kellett mérni, nem eldönteni** — és a saját mérőm kétszer is tévedett, mielőtt igazat
mondott:

- Az **első** mérőm azt állította, hogy a megvont tag élő adatkört kap. A **negatív kontroll**
  (ugyanaz a két művelet **sorban**, verseny nélkül) viszont **ugyanazt adta** → tehát nem a
  verseny okozza.
- A **második** mérőm ezután derült ki, hogy **rosszat kérdez**: a kiadás **két kapun** áll
  (tagság + adatkör, külön mérve — ENT-02, a kód ezt ki is mondja), és én csak az adatkör-feloldót
  kérdeztem. **A két kapu együtt** — ahogy a héj is kérdezi — helyesen tagad.
- A **valódi HTTP-úton** is megmérve: megvonás után a válasz `not_a_member`.

**A sor-zár a tagság-soron ettől függetlenül bent marad** mindkét írónál
(`grantScopeToMember` + `revokeMembership`), mert a parancs kikötése szerint a megoldás **minden
érintett íróra** vonatkozik — és a későbbi hívók nem támaszkodhatnak arra, hogy éppen két kapu áll
a sorban.

### (3) A meglévő versenyek megőrizve

`proof:pg-concurrency` változatlanul: **1 nyertes + 7 nevezett ütközés** mindkét tengelyen.

**Bizonyíték:** `npm run proof:pg-domain-race` — 3 kikényszerített menet, 9 állítás, negatív
kontrollal.

---

## 5. A SAJÁT REGRESSZIÓM, amit a repó battériája fogott meg

Az R148-ban a **kéréskorlátot minden környezetben** bekapcsoltam. A helyi lelet-battériák ennél
több kérést küldenek egyetlen címről: az `app-findings-r134` **300 kérésből 60-at `429`-cel**
kapott vissza, és egy `undefined` levelesládán hasalt el. **A védelem a fejlesztést akasztotta
meg, ahol nincs mitől védeni** (KUKA-092).

A kéréskorlát **telepített környezet védelme**: helyben alapból KI, mindkét irányban felülírható.
**Ellenpróbával igazolva:** stagingben továbbra is fog (30 kérésből 10 → `429`), és az **életjel a
korlát után is 200** (különben a védelem okozna újraindítási hurkot).

---

## 6. Lezárt nyitott tétel az R148-ból

Az R148 jelentés kimondta, hogy a teljes `verify:external-checks` újrafuttatás nem futott végig.
**Azóta végigfutott: 19/19 program, 14 MEGFELEL.** Az öt eltérés (`r57` · `r57a` · `r59` · `r59a` ·
`r79`) **pontosan az, ami a bázis commiton is piros volt** — tehát az R148 három javítása
(`r67` · `r81core` · `r83core`) a teljes futáson is megerősítést kapott.

---

## 7. Dokumentáció-pontosítások (a parancs §6)

- **`V3_REPO_ES_UZEM_TERV.md`** — a PITR-állítás **azonosítóhoz kötve**: a 2026-09-09-i „igen" a ma
  **`vs`** nevű (V2) projektre vonatkozik (`d84106d1…`); a V3 **új** `valach-system` projektjén
  (`307c5e09…`) **nincs PITR, mert adatbázis sincs**. A „három környezet" ↔ „demo cégtér a
  stagingben" ellentmondás feloldva: **ma egyetlen környezet épül, a `staging`**; a `production` és
  a külön `demo` **nem működik és nem is állítható működőnek**.
- **`VERSIONING.md`** — a `valach-system` repó **és** a Railway-projekt a V3 után is megmarad; a v4
  **normál esetben git-kiadás és migráció ugyanabban a termék-otthonban**, nem automatikusan új
  repó/projekt/üres éles DB. Hosszú párhuzamos üzemnél külön szolgáltatás/DB indokolt, **explicit
  adatgazdával** — és inkompatibilis írók nem írhatnak ellenőrizetlenül közös adatbázisba.
- **Az R148 jelentés §9 helyesbítve:** a `SERIALIZABLE` **nem** a `BEGIN IMMEDIATE` „pontos
  megfelelője" (más mechanizmus, `40001` visszadobással, teljes újrapróbálási kötelemmel), és **nem
  a szálak száma dönt, hanem a kapcsolatok/tranzakciók átfedése** — egy egyszálú async szerver is
  tarthat sok nyitott kapcsolatot. Ugyanez a híd kommentjében is javítva.

---

## 8. Mi futott — összesítve

| mérés | eredmény |
|---|---|
| `proof:pg-bridge-transport` | **5/5** (1 pozitív kontroll) |
| `proof:pg-readiness` | **7/7** valódi PG + valódi HTTP |
| `proof:pg-domain-race` | **9/9** állítás, 3 menet, negatív kontrollal |
| `proof:pg-parity` | **19 lépés, 0 eltérés**, kétszer egymás után ugyanazon a DB-n |
| `proof:pg-concurrency` | 1 nyertes + 7 nevezett ütközés, mindkét tengelyen |
| `proof:pg-durability` | **7/7** |
| `verify:release-order` · `pg-schema-parity` · `env-loading` · `mutation-anchors` · `kuka` · `artifact-naming` | mind PASS |
| app-lelet battériák (selfcheck · R75 · R121 · R132 · R134 · R144) | mind PASS |
| `verify:external-checks` (az R148 nyitott tétele) | **19/19 lefutott**, 14 MEGFELEL, 5 örökölt piros |

---

## 9. NEVESÍTETT FÜGGŐK

| # | Mi | Mi oldja fel |
|---|---|---|
| F1 | **A Railway-staging felállítása és a védett tesztlink** | a hálózati házirend engedje a `railway.com` és `backboard.railway.com` hosztokat (vagy olyan munkamenet, ahonnan elérhető). Minden más előkészítő munka kész |
| F2 | **Tételes, hivatalos díjszabás szerinti becslés** | ugyanaz, mint F1 (`railway.com` ma tiltott). Az R148 11–25 USD **nem ellenőrzött ajánlat** |
| F3 | **Élő AI-bizonyíték** | `VS_AI_API_KEY` a staging app Variables lapján. Ma **nem futott mérés** |
| F4 | **Felhős mentés / PITR a V3-ra** | F1 után; a helyi dump/restore erről semmit nem állít |
| F5 | **`migrations/LEDGER.json` bejegyzés** | a 001 még sehol nem futott ki élesben (`released: []`) — az első staging-kiadás után |
| F6 | **Kéréskorlát több példányon** | példányonként számol, memóriában; több példánynál elosztott korlát kell |
| F7 | **`node:sqlite` kísérleti figyelmeztetés a PG-telepítésen is** | lusta behúzás; ártalmatlan, de zajos |
| F8 | **Az R142/R144 húsz tartalmi hiánya + kontextusos AI** | az előző SPEC szerint, új követelménygyártás nélkül |
