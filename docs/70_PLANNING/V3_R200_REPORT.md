# V3 — R200 VÉGREHAJTÁSI JELENTÉS

**Kör:** `CMD-VS-300-002-002 R200` · **Sáv:** Claude-v3 · **Munkabázis:** `claude/r154-audit-fix` (PR #1)
**Döntés:** D-VS-3262 · **KUKA:** 489 · 490 · 491 · 492 · 493 · 494 · 495

> **AMIT EZ A JELENTÉS NEM ÁLLÍT.** Nem állítja, hogy a rendszer kész. Nem termékelfogadás. A
> batch- és sorozat-kapuk a bizonyíték **kezelését** mérik (konzisztencia), **nem** kriptográfiai
> védelem egy minden fájlhoz hozzáférő író ellen — ezt a kimenetük maga is kimondja. A történeti
> adat történeti marad: a korábbi körök eredményeit nem írtam át.

---

## 1. A NÉGY MÉRT RÉS — BEZÁRVA (§1–§2)

Mind a négyet a **chatgpt-v3** nevezte meg, és mind a négy ugyanarról szól: **a mérce nem
származhat a mért dologból.**

### 1.1 A TELJESSÉG — a részprogram a teljes lánc bizonyítékaként ment át *(KUKA-489)*

A söprés `verify:external-checks` lánc-újrahasználata csak a **zöld verdiktet** és a **tiszta
forrást** kérte. A hivatkozott commit bizonyítéka viszont **egyetlen program** `--only` futása volt:

```
verdict = { ok: true, complete_evidence: false, green: 1, env_skipped: 0, of: 1 }
```

— és a söprés ezt a **19 programos** teljes lánc „ÚJRAHASZNÁLT BIZONYÍTÉK"-aként fogadta el, **nulla
kilépési kóddal**. A várt darabszám (`of`) magából a bizonyítékból jött, tehát a bizonyíték a **saját
hatókörét** nevezte teljesnek. Az R199-ben a jelentés **szövegét** pontosítottam („csak 1/1"); a
**gépi döntés** változatlanul elfogadta — egy felirat nem kapu.

**A JAVÍTÁS.** A teljesség mércéje kívülről jön: a `case-manifest.mjs` **függetlenül elvárt** 19
programja és 168 esete (`externalCompleteness`). Két elfogadott alak van, és mindkettő ehhez a
készlethez szól:

1. **egy futás, ami maga is teljes** — a hatóköre teljes, és a 19 program minden elvárt esete ott
   van, zölden;
2. **a SOROZAT**, a **meglévő** EXS elfogadási szabállyal (`verifySeries` → `verdict.accepted`) — a
   szabály nincs újraírva, és a sorozat a **hivatkozott commitból** olvasódik, nem a munkafáról
   (a munkafán álló sorozat bármikor írható, tehát nem bizonyíték).

Ha a teljességet a sorozat adja, akkor a munkafát a **horgony származásához** mérjük, nem a
`results/` alatti, minden futással felülírt egyfutás-fájl commitjához — különben egy részleges mai
futás hitelesítene egy más forráson született sorozatot.

### 1.2 AZ EGYSZERI FUTÁS — a lezárt csomag új futást szolgált *(KUKA-491)*

Az MBX-01 azonossága tisztán **tartalmi** volt (`batch_id` = forrás + terv). Ugyanaz a forrás és
bontás ugyanazt az azonosítót adta, így egy **lezárt vagy megszakadt** korábbi csomag alapvonala egy
**új** indítás „friss" alapvonalaként elfogadható volt.

**A JAVÍTÁS.** A kettő szétvált: `batch_id` a **tartalmi** azonosság, `run_id` az **egyszeri
futáspéldány** (minden indításnál friss). A horgony, az alapvonal-bizonyíték, minden egység bélyege és
az összefűzés is ehhez kötődik; a horgony emellett az **elvárt alapvonal-forrást** is kimondja, és azt
a batch **kötéséből** veszi, nem a bizonyíték állításából. *Az „ugyanarról a forrásról" nem
„ugyanabban a mérésben".*

### 1.3 AZ ÖSSZEFŰZÉS KAPUJA — a kapcsolóra volt kötve *(KUKA-490)*

A `--merge` ágban a horgonyhoz mérés `if (BATCH_ARG)` alatt futott: a **kapcsoló nélkül** indított
összefűzés a megosztott egységek bélyegeit csak **egymáshoz** mérte, és a kapcsoló megadásakor sem
olvasta újra az alapvonal bizonyítékát.

**A JAVÍTÁS.** A kapu a **megosztott egységek létére** szól (`if (shared.length)`): a horgony
kötelező, az alapvonal-bizonyíték **újraolvasva** és a lenyomata **újraszámolva** ellenőrződik, és
minden bélyeg a horgony `batch_id`-jához, `run_id`-jához és kötéséhez mérődik, mezőnként. *A kapu ott
álljon, ahol a kár keletkezik — nem a parancssor alakján.*

### 1.4 AZ IDŐ — az óra az első előkészítés után indult *(KUKA-492)*

A `--units-auto` ágban az összesített óra a `prepareBatch(n)` **után** indult. Az R199-ben jelentett
„TELJES, az előkészítéssel együtt" **375 707 ms** ezért **nem** tartalmazta az első alapvonal **3 422
ms**-át — és a jelentett teljes idő **kisebb** volt a részfázisok összegénél (379 115 ms).

**A JAVÍTÁS.** A `phaseAccounting` tiszta függvény, szabályozható időforrással: az óra a
**parancsnál** indul, és az elszámolás **megméri magát** — a részösszegnél kisebb teljes idő nevezett
lelet. Nem drága lánccal mérjük, hanem itt.

---

## 2. ÉS KÉT SAJÁT HIBA, UGYANEBBEN A KÖRBEN

- **A lánc bemeneti listája nem fedte a batch futtatójának saját függőségét** *(KUKA-493)*. A
  `verify:v3ref` a felső szintű `v3ref/*.mjs`-t mérte, a `digestOfBundle` pedig **nem rekurzív** —
  így az `external-checks/batteryUnits.mjs` kiesett a kötésből. A lista innentől az MBX **saját**
  deklarációjából jön (`BATCH_EXTRA_FILES`), nem másolatból.
- **Az élő `MBX09` a lemezen HAGYOTT batch-könyvtárat mérte** *(KUKA-494)*, és ha az nem volt ott,
  kiírta a hiányt, de **zöld maradt**. Amikor a szerződés v2-re bővült, ez az ág a **helyes** kódra
  adott pirosat, mert a lemezen álló horgony még v1 volt. Innentől a próba **maga állítja elő a
  tárgyát** (`--batch-prepare`), és az előkészítés hibája **piros**, nem felirat.
- **A szerződés-bővítés kinőtte a saját rögzítőjét** *(KUKA-495)*: a v2 szabály mellett a fixtúra v1
  alakú horgonya **25 pirosat** adott egy helyes kódra — mind ugyanarra a gyökérre. A rögzítő most a
  szerződés **saját otthonából** építi a mércét (`newRunId()`, `baseline_source_digest` a kötésből).

---

## 3. A CÉLZOTT PRÓBÁK ÉS AZ ELLENPRÓBÁK

**TELJESSÉG — `npm run verify:sweep-reuse` (59/59 ZÖLD), négy új eset:**

| eset | mit mér | eredmény |
|---|---|---|
| `SRU11` | a mai `1/1` + `complete_evidence:false` | **ELUTASÍTVA**, nevezetten (nem-teljes jel · 18/19 hiányzó program · a sorozat-út sem adja) |
| `SRU12` | hiányos sorozat (18/19), **egyöntetűen zöld** saját számokkal | **ELUTASÍTVA**, a hiányzó program megnevezve |
| `SRU13` | valódi **teljes, kötött** sorozat (19/19) | **ELFOGADVA** — és az elfogadás a SOROZATOT nevezi meg |
| `SRU14` | érintett segédmodul változása (`v3ref/a.mjs` · `batteryUnits.mjs`) | **ÉRVÉNYTELENÍT** |

Mindegyiknél mérve: **az elutasítás NEM indít hosszú láncot** (a söprés 1-gyel zár, a lánc-jelölő
fájl nem keletkezik).

**BATCH — `npm run verify:mutation-batch` (MBX01–MBX13 ZÖLD), négy új eset:**

| eset | mit mér | eredmény |
|---|---|---|
| `MBX10` | két külön indítás ugyanazzal a forrással és tervvel | azonos `batch_id`, **külön** `run_id`; az „A" futás egysége a „B" horgony alatt elesik; a sajátjában elfogadott |
| `MBX11` | korábbi eredmény beadása új indításba | **ELUTASÍTVA** („az ALAPVONAL MÁS FUTÁSBÓL való"); a futáspéldány nélküli alapvonal is |
| `MBX12` | összefűzés horgony / bizonyíték nélkül — **és a `--batch` kapcsoló nélkül is** | mind **NEVEZETTEN** elutasítva, ÉLŐ `--merge` futással |
| `MBX13` | a jó batch teljes összeállítása | **nincs** batch-kötési akadály (pozitív kontroll) |

**ELLENPRÓBÁK — a javítást visszagörgetve a SAJÁT őrének pirosat kell adnia** (KUKA-051 · 089 · 122 · 207):

| visszagörgetés | mi tüzel |
|---|---|
| a teljesség-kapu kiejtése (`if (false && !comp.complete)`) | `SRU11` + `SRU12` bukik — **és a söprés 0-val zárt** a részprogram-bizonyítékra: ez maga a lelet |
| `if (shared.length)` → `if (BATCH_ARG)` | `MBX12`: „a `--batch` kapcsoló NÉLKÜL a megosztott egység horgony nélkül is összefűzhető volt (ez volt a rés)" |
| `--batch-prepare=0` (az előkészítés bukik) | `MBX09`: „a batch ELŐKÉSZÍTÉSE nem sikerült (kilépés 2)" — nem felirat, **piros** |

**A RÉGI POZITÍV KONTROLLOK ZÖLDEK:** `verify:external-series` (EXS01–EXS16) ·
`verify:unit-admission` (UAD01–UAD09) · `verify:external-decisions` (44/44) · `verify:kuka`
(1236/1236) · `verify:decision-numbers` (4/4) · `verify:artifact-naming` · `verify:release-order` ·
`verify:fogyasztas-meres` · a mag próbái (`node v3ref/run.mjs`) **69/69**.

*Egy pin-javítás menet közben:* az `MBX13` első mintám a puszta „horgony" szóra illeszkedett, és az
összefűzés **ártatlan** összegző sorát („0 elavult horgony") minősítette akadálynak — a próba a
szomszéd sort mérte (`KUKA-239`). A minta most a batch-kötés **nevezett** elutasító mondataira szűkít.

---
