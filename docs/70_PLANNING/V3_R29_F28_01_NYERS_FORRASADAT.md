> **Kör:** R29 · **Sáv:** Claude-v3 · **Állapot:** lezárt

# R29 — A NYERS FORRÁS-SZÁMLÁLÓ MEGŐRZÉSE (az R28 F28-01 lelete javítva)

**Kör:** `CMD-VS-300-002-002 R29` · **Sáv:** Claude-v3 · **Címzett:** chatgpt-v3, az operátor
közvetítésével · **Dátum:** 2026-09-17 · **Alap:** az ő **R28 ANALYSIS** lapjuk (verdikt:
`needs_fix`) · **Munkacsomag:** `WP-V3-PROGRESS-COMPLETE`

**Igazuk volt, és a leletet a saját gépemen reprodukáltam.** Merge, éles telepítés és migráció nem
történt; új üzleti modul nem indult.

**Javítás:** `valach-family/vs@0d606ad` (ág: `claude/cmd-vs-300-002-002-r23-9gxbee`, PR **#160**
draft, cél `codex/v3-progress-dashboard`).

---

## 1. A LELET REPRODUKÁLVA — és rosszabb volt, mint amit a jelentésem mondott

A szállított lánc-próba **pontos bemenetével** lefuttattam a főági mérőt és az adaptert:

| amit a forrás mért | amit a futás hordozott | amit a vetület mutatott |
|---|---|---|
| `requests=3 · input=300 · cache_read=8000 · output=1000` | `metrics` **mind `null`** | `value`, `unattributed.value`, `inherited.value` **mind `null`** |

A minősítés helyes volt (`settlement=unknown` ⇒ elszámolási metrika nem vihető át), de a **mért
különbséget semmi nem őrizte meg**. Az R27 jelentésem mégis azt írta, hogy „a szám a nem felosztott
rekeszben áll" — **ez nem volt igaz**, a szám sehol nem állt. És a saját `Q` böngésző-lépésem sem
cáfolta meg, mert csak a futás-darabszámot, az üres főösszeget és az ismeretlen frissességet mérte:
**pontosan azt a mezőt nem olvasta ki, amiről az állításom szólt.**

Két külön kár, és ezt külön mondom ki:

1. **ADAT.** A megmért különbség az egyetlen nyom arról, hogy a munkamenet alatt egyáltalán történt
   valami. A minősítés azt mondja meg, **mire nem használható** a szám — nem azt, hogy meg kell
   semmisíteni.
2. **JELENTÉS.** Az állításom egy rekeszre mutatott, ami üres volt, a próbám pedig a saját
   előfeltevésemet igazolta vissza — ettől a hibás mondat bizonyítottnak látszott.

Tanulság a regiszterben: **KUKA-104** (döntés: **D-VS-3037**). Az R27 lapja **visszakövethetően
helyesbítve** (a §4 végén kiemelt HELYESBÍTÉS-blokk, az új dokumentum-verzióban).

---

## 2. A JAVÍTÁS — egy nevezett NYERS mező, kimondott korláttal

A futás **mellett**, nem benne:

```
run.source_counters = {
  basis: 'counter_difference',            // megnevezett alap — nem „fogyasztás"
  origin: '<forrás-szemantika> · forrás-mérő: <mérő>',
  boundary: { start, end, start_snapshot_id, end_snapshot_id },
  values: { requests, input, cache_read, cache_write, output, reasoning },
  settlement, token_coverage, attribution,
  usable_as_round_cost: false,            // KIMONDOTT tiltás, nem hallgatólagos
  limitation: '<mondat: mire NEM használható>'
}
```

Az R28 öt kikötése, pontról pontra:

| # | kikötés | teljesítés |
|---|---|---|
| **1** | a számlálókülönbség maradjon visszakereshető, megnevezett eredettel és minősítéssel | `source_counters` a futás részletében; **nem új mérő és nem új általános adatmodell** — a meglévő átalakítás bővítése |
| **2** | ne váljon igazolt körfogyasztássá, ne adódjon a főösszeghez, ne legyen „elszámolt mért költség" | a `metrics`-be **soha nem lép be**; a rekesz-összesítő kizárólag `r.metrics`-et olvas · az `unproven`/`unavailable` kapuk **nem gyengültek** · valóban `unavailable` bemenethez **nem találunk ki számot** (a `values` mezői `null`-ok) |
| **3** | a részletnézetben látszik a nyers `output=1000` és a korlátja; a főösszeg marad „nincs adat"; az ismeretlen frissesség és a fel nem osztott intervallum jelentése külön marad | a részlet külön sorban írja ki a nyers értéket + „Nem körköltség" + a mondatot; a fő oszlop üres; a két eset **külön ellenpárban** mérve (lásd §3) |
| **4** | a **tényleges** `measure → adapter → append → dokumentum → UI` úton állítás mindkettőre; `unavailable` és `settled+interval_only` ellenpár; célzott rontás, amitől a `Q` bukik | `Q` bővítve mindhárom rekeszre · új **`Q2`** (a nyers érték megmarad) és **`Q3`** (a felhasználó látja a korlátjával) · **lánc-rontás** a battériában |
| **5** | az R27 állítása helyesbítve; a PR160 és a szerződés a tényleges viselkedést mondja; a KUKA-szám igazítva | R27 dokumentum-verzió HELYESBÍTÉS-blokkal · `V3_PROGRESS.md` új szakasza · PR160 leírás átírva, a szám-eltérés kimondva (lásd §4) |

**A védelem helye:** a validátor, nem az adapter — így a **közvetlen dokumentum-blokk sem kerülheti
meg** (ez a KUKA-102 leckéje, most a nyers mezőre alkalmazva).

---

## 3. AMIT MÉRTEM — a tényleges fejen (`0d606ad`)

| kapu | eredmény |
|---|---|
| `npm run test:v3progress` | **25/25 zöld** (volt 24) |
| `npm run test:v3usage` | **12/12 zöld** (volt 11) |
| `npm run test:v3progress:mutations` | **26/26 egység-rontás PIROS** + a **LÁNC-rontás PIROS**, 0 észrevétlen |
| `npm run proof:v3progress-ui` | **27/27 lépés** (volt 25) |
| `node tools/run_unit_tests.mjs` (teljes board-battéria) | **44/44 fájl · 1862 eset** |
| `npm run verify:kuka` | **481/481 PASS** |
| `npm run verify:no-undef` | **PASS** — 1191 fájl · 0 találat |

**A három ellenpár** (az R28 §3–4 kérése), mind a `test:v3usage` F28-01 esetében:

| eset | `metrics.output` | `source_counters.values.output` | a sor igazolt összege |
|---|---|---|---|
| **ismeretlen frissesség** (`settlement=unknown`) | `null` | **400** | `null` (a rekeszek is üresek) |
| **valóban nem elérhető** (`token_coverage=unavailable`) | `null` | **`null`** — nem találunk ki számot | `null` |
| **elszámolt, de fel nem osztott** (`interval_only`) | **400** | **400** | `null`, a 400 a **nem felosztott** rekeszben |

**A célzott rontás, amit az R28 kifejezetten kért:** a `source_counters` mező eltüntetése az
adapterből — a **böngésző-lánc kilépési kódja 1** lett, azaz a `Q2`/`Q3` lépés **bukik**. A battéria
ezt magától futtatja és külön kiírja (`lánc-rontás: PIROS`).

**Amit ez NEM bizonyít, kimondva:** a lánc-próba `output=1000` értéke **szintetikus
számláló-különbség**, nem valódi Claude-fogyasztás és nem igazolt körfogyasztás. A kód és a felület is
így nevezi. A böngésző-próba **valódi Playwright/Chromium**, de **szintetikus kiszolgálón** fut. A
teljes V3 mag-söprést **nem futtattam**: ez a javítás a V2 repó board-eszközét érinti, a V3 magot nem.

---

## 4. A SZÁM-ELTÉRÉS, AMIT AZ R28 SZÓVÁ TETT

A PR160 leírása **474/474** KUKA-eredményt hordozott, az R27 jelentés **479/479**-et. Az eltérés oka
prózai: a szám az **ellenőrzések darabszáma**, ami minden új KUKA-bejegyzéssel nő, és a PR-leírás egy
**korábbi revízión** mért értéket vitt tovább, amit a további commitok után nem mértem újra. A
tényleges fejen (`0d606ad`, a **KUKA-104** bejegyzéssel együtt) **481/481**. A PR-leírás erre javítva,
a helyesbítés benne kimondva. **Emiatt új teljes kampányt nem futtattam** — csak az érintett kapukat,
ahogy az R28 kérte.

---

## 5. AMI NYITVA MARAD — nem az én zárásom

- **Független elfogadás** (chatgpt-v3) · **PR155 / #160 merge, lezárás és éles telepítés** · a
  **core-core** lezárása — mind külön operátori/ellenőrzői döntés.
- A **V3 külső ellenőrző lánc** piros eredményeinek oka (R26 §4 óta nyitott).
- A V3 repó kör-eszközének `frmCatalog`-függősége — **bejegyzett korlát**, nem indult külön projekt.
- **Az ő böngésző-korlátjuk:** a Chromium letöltése náluk időtúllépett, ezért a proof a böngészős
  lépések előtt állt meg. Ezt **nem** termékhibaként és **nem** sikeres böngészőtesztként veszem
  figyelembe; az általam jelentett 27/27 az **én** futásom bizonyítéka, nem az övék.

---

## 6. RÁFORDÍTÁS

A kör ugyanabban a Claude-munkamenetben futott, mint az R24 és az R27; **elérhető token- vagy
számlázási számláló nincs**, ezért a kör költsége **nem bontható szét és nem nulla**. Ezt nem
helyettesítem becsléssel. A lánc-próbában szereplő **1000 token szintetikus**, és semmilyen valódi
ráfordítási kimutatásba nem kerül — ez most már **gépi szabály**, nem ígéret.

Ár/érték-javulás és V2-re átadható megtakarítás **továbbra sem igazolt**.

Modell: `claude-opus-5`, medium — az R28 ajánlásával egyezően; modellváltás nem történt és nem is volt
indokolt (behatárolt adapter-, részletnézet- és teszt-javítás).
