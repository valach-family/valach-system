# V3 — R45 teljesítve: a mérő öt fennmaradó alakja, a kiadási őr összesítése, a forrás-kötés

Claude-AUX · 2026-09-09 · CMD-VS-300-002-001 R46 — REPORT
Előzmény: R42 — ANALYSIS · R43 — REPORT · **R45 — ANALYSIS**
Forrás-állapot: `34d053c` (a ti mérésetek a `71c69bb`-n készült — a leletek onnan mind érvényesek
voltak, egyik sem múlt az R44-es dokumentum-javításon; ezt magatok is kimondtátok)

---

## 0. Elfogadva, ellenvetés nélkül

**Mind az öt mérőhiba-alak (H02–H06) igaz, és mind reprodukálva.** A Q18 javítása után öt testvér-
alak maradt életben, és a saját, frissen írt kapunk mind az ötben ZÖLD volt — mert azt mérte, VAN-E
JSON, nem azt, hogy **érvényes-e a mérés**.

**A közös gyökeret is elfogadjuk, és ez a kör legfontosabb mondata:** a mérő a várt próbakészletet a
FUTÁS EREDMÉNYÉBŐL olvasta ki — vagyis **a mért féltől kérdezte meg, mit kellett volna mérnie.**
A saját regiszterünkben ennek neve van (KUKA-054, körkörös mérés), és most a mérő-eszközön
ismétlődött meg. Új bejegyzés: **KUKA-090**, napló: **D-VS-3006**.

**A Q16 lelet is igaz:** a javítás eljutott az osztályozóig, a fogyasztójáig nem. Ez betűre ugyanaz
az osztály, mint az aznapi `docs:html` leletünk (D-VS-3004) — ahogy ti is megnevezitek.

---

## 1. A mérő — javítási szerződésetek pontonként

| Kérésetek | Mit tettünk |
|---|---|
| **1. Előbb érvényes mérés, utána ítélet** | `classifyRun` hat lépcsőben ellenőriz, MIELŐTT ítélne: indulási hiba/jel/időtúllépés · **rendellenes kilépési kód** · értelmezhető JSON · **manifest-egyezés** · lefutott-e egyáltalán állítás · kilépési kód ↔ eredmény ellentmondás. Bármelyik ⇒ `HARNESS_ERROR`, soha nem elkapás. |
| **2. A tervezett készlet külső szerződés** | ÚJ fájl: `v3ref/manifest.mjs` — nevezett próbák + a hozzájuk tartozó **állítás-azonosító**, a futás eredményétől függetlenül. Hiányzó · ismétlődő · **ismeretlen** azonosító egyaránt mérőhiba. A rövidebb lista NEM válhat új teljes készletté. |
| **3. Típusos kimenetek** | `PASS` · `FAIL` (nevezett állítás) · `THREW` (**hibakód + fázis kötelező**) · `SKIP` · `NOT_STARTED`. Bizonyíték CSAK a `FAIL`. A `SKIP`/`NOT_STARTED` **mérőhiba**, mert a mai hatpróbás csomaghoz nincs deklarált korai-megállási profil — ahogy írtátok. |
| **4. Az elkapás oka deklarált** | `probe_fail`: a nevezett próba `assertion_id`-jének egyeznie kell a manifest állításával. `runtime_error`: **csak** próbán belüli `THREW`, ELŐRE megnevezett hibakóddal és fázissal. Az M5 szerződése mostantól `ERR_SQLITE_ERROR` · `probe_body` — **mérésből**, nem feltevésből. |
| **5. M5 korlátozott bizonyíték** | Megmarad, és a kimenet minden futásnál kiírja. A `weak` jelölés a rekordban is ott van. |
| **6. Az ellenpróbák a teljes belépési pontot vizsgálják** | **Hat ÁLLANDÓ kapu** minden futáskor: `Q18` · `H03` · `H04` · `H05` · `H06` · `H0X` (ismétlődő + ismeretlen azonosító). Mindegyiknél **mindkét szerződés** alatt tilos az elkapás. |

### A H06 mércéje — külön, kimondva

A H06 kimenete **formailag érvényes mérés** (minden tervezett próba szerepel, ismert állapottal),
ezért NEM mérőhibának minősítjük, hanem a helyes ítéletet követeljük meg: **`WRONG_CATCHER`**.
Ha `harness`-nak követelnénk, a mércénk hazudna arról, mit mértünk. A kapu ezt a várt ítéletet
NÉVVEL tartalmazza (`expect_verdict`).

### Mért eredmény ezen a forrás-állapoton

```
KAPU (a) ALAPVONAL: ZÖLD — 6 próba futott, mind PASS
KAPUK (b): 6 hazugság-ellenpróba · 6 védett
10 mutáció · 10 elkapva (ebből 1 korlátozott erejű) · 0 túlélte · 0 rossz próba · 0 mérőhiba
```

**Visszacsúszás-próba:** az M5 szerződéses hibakódját `MAS_HIBAKOD`-ra írva a verdikt
`WRONG_CATCHER`, kilépési kód **1**. Tehát a szűkítés nem díszlet.

---

## 2. Q16 — az összesítés és a besorolás jelentése

**Az átengedés javítva:** minden megvizsgált migráció **minden** elutasítása megállítja a teljes
ellenőrzést, nem csak a `contract` csoporté. Teljes parancson mérve:

| Bemenet | Régi teljes őr | Mai teljes őr |
|---|---|---|
| `TRUNCATE TABLE partner;` | 27/27 PASS, exit 0 | **FAIL [REL03], exit 1** |
| `SELECT 1;` | 27/27 PASS, exit 0 | **FAIL [REL03], exit 1** |

Az üzenet megnevezi a fájlt, a besorolást és az indokot — nem zsákutca (KUKA-064).

**A besorolás jelentése (L03–L07):**

| # | Alak | Volt | Lett |
|---|---|---|---|
| L03 | `ADD CONSTRAINT … CHECK … NOT VALID` | `expand, ok:true` | **`restrictive, ok:false`** |
| L04 | `CREATE UNIQUE INDEX` | `expand, ok:true` | **`restrictive, ok:false`** |
| L05 | `ADD COLUMN … NOT NULL` | `expand, ok:true` | **`restrictive, ok:false`** |
| L06 | vegyes: `DROP` + `UPDATE` | `data_change, ok:true`, a kivezetés ELVESZETT | **mindkét kötelem külön** |
| L07 | `-- BESOROLÁS: expand` egy `SELECT 1` fölött | elutasítva, UGYANAZT kérve | **`unknown` besorolással átmegy** |

**Igazatok van a `NOT VALID`-ban, és a saját fixtúránk indoklása volt hamis.** A régi sor azt
állította, hogy „a régi írókat nem zárja ki" — a `NOT VALID` viszont csak a MEGLÉVŐ sorok
végigellenőrzését halasztja el, az ÚJ írást már korlátozza. A fixtúra tehát egy hamis állítást
őrzött zölden; a saját regiszterünkben ennek is neve van (KUKA-068: a pin nem elmulasztja a hibát,
hanem VÉDI). Az elvárt fixtúra-eredmény javítva.

**Az L03–L05 nem tiltott** — csak nem bizonyítottan ártalmatlan. Saját alakot kaptak
(`restrictive`), és a szerzőnek KI KELL MONDANIA, hogyan marad kompatibilis a régi író.
**Az L06 tanulsága:** a kötelmek ÖSSZEADÓDNAK, nem versenyeznek — egy adatváltozási indoklás nem
helyettesít kivezetést. **Az L07-et nem vak fejléc-elfogadással javítottuk:** az `unknown` alakhoz
`-- BESOROLÁS: unknown — <miért biztonságos>` kell, és a ROSSZ besorolás (`expand` egy ismeretlen
mondaton) továbbra is elutasított — ez külön fixtúra.

`verify:release-order`: **35/35 PASS**, nyolc új fixtúrával.

**Amit NEM oldottunk meg, kimondva:** a védett, korábbi kiadási alaphoz mért migrációs lenyomat és
a telepített környezet migrációs nyilvántartása. Elfogadjuk a leletet; a helye az első valódi
migráció előtt van, és addig nem jelentjük késznek.

---

## 3. P01 — a forrás-kötés

**Igazatok van: a bemondott commit nem forrás-azonosság.** Javítva:

- a futtató **kiszámolja** a saját forrás-csomagja tartalmi lenyomatát → `source_digest`
  (sha256, a `v3ref/*.mjs` fájlokon, névvel és tartalommal),
- a hívó által adott érték külön, **`declared_source_commit`** néven marad — állítás, nem mérés,
- **`run_id`** minden futáshoz, hogy két eredmény ne legyen összekeverhető.

**És egy javítás a saját R43-as állításunkon:** az „UTC-időpont még nincs" **hamis volt** — a rekord
`at` mezője akkor is UTC-ben állt. Ti mértétek meg a mi rekordunkon. A hiányzó eredet-mezőket
innentől a MEGLÉVŐ rekordból kiindulva leltározzuk.

---

## 4. A séma helye — elfogadva, kérdés nélkül

Elfogadjuk a K11/K07/K10/K04–K05 felosztást úgy, ahogy leírtátok: a **K11** birtokolja a
művelettípus-katalógust, a verziót és a regisztrálási protokollt (benne az `input_schema` és az
egyenlőségi profil hivatkozása); a **K07** a közös parancsborítékot, a kulcshatókört és a
kanonizáló-verzió rögzítését; a **K10** a közös értéktípusokat és normalizálókat; a **K04/K05** a
megbízható cselekvői kontextust. **Nem nyitunk új magpontot és nem viszünk iparági mezőt a magba.**
A Q02 javítása ezzel a felosztással készül a következő körben.

---

## 5. Az R44-es korrekcióitok — mind átvezetve

| # | Amit cáfoltatok | Átvezetve |
|---|---|---|
| 1 | „Q16, Q17, Q18 kész" ebben az általános alakban | a lap most alakonként mondja meg, mi kész és mi függő |
| 2 | a mini modulok a 4. pont után indulhatnak | **visszavonva** — a 2–5. pont mind kell; az 5. pont esetei a mag HATÁRÁT érintik |
| 3 | egy hibamentes kör nem lezárási definíció | a lap most felsorolja a teljes feltétel-készletet (lefedettség · negatív kontroll · futási bizonyíték · megszakítás/verseny · G1–G8 tételesen) |
| 4 | a PITR nem mért adatvesztési garancia | „a szolgáltatás leírt képessége, nem mért garancia" — visszaállítási próbáig |
| 5 | „adatbázis nélkül fut" | **elkülönített SQLite** — a különbség a tranzakciós bizonyíték megítéléséhez kell |

---

## 6. Ami NEM készült el ebben a körben — kimondva

- **A Q01–Q15 magviselkedés el sem kezdődött.** Szándékosan: a saját mérőnk öt alakban hazudott,
  tehát bármilyen „a mutáció megfogja" állítás addig értéktelen lett volna. **Ez a következő kör**,
  már a helyesbített mérővel, ahogy kéritek.
- **Nem billentünk át kaput.** G4/G5/G6 marad ZÁRVA; ez a kör a mérőről és a kiadási őrről szól.
- **Nem kértünk újra-hitelesítést** a hat próbára. A hatókörös R42-es ítéleteket történeti,
  pontos hatókörű állításként őrizzük; az új implementációra új forrás-kötés kell.

---

## 7. Amit kérünk

1. **A hat ellenpróba megtámadása.** Ha találtok olyan utat, amin a mérő MÉG MINDIG elkapásnak
   minősít egy nem-futást, egy hiányos csomagot vagy egy idegen kivételt, az a legfontosabb lelet.
   Külön érdekel: **időtúllépés** (ezt ti sem futtattátok), és a **sérült/részleges JSON**.
2. **A `restrictive` alak határa.** Jó helyen húztuk meg? Van olyan alak, ami ma `expand`, de
   szintén szoríthat (pl. `ALTER COLUMN … TYPE` szűkítő irányban, generált oszlop, trigger)?
3. **Az L07 alakja.** Az `unknown` besorolás elfogadása őszinte „ez az alak nem támogatott, de
   ezért biztonságos" nyilatkozat — vagy még mindig túl megengedő? Ha az, mondjátok, és az
   `unknown` egyszerűen elutasított marad, felsorolt támogatott alakokkal.

*Gépi jelek ezen a forrás-állapoton: `npm run verify:v3ref` (6 próba · 6 hazugság-ellenpróba ·
10 mutáció) · `npm run verify:release-order` **35/35** · `npm run verify:kuka` (90 tanulság, mind
otthonnal) · `npm run verify:sweep` **6/6 zöld, 0 piros**. Napló: D-VS-3006, regiszter: KUKA-090.*
