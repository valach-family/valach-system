# V3 — R42 első pont teljesítve: a mérőműszer javítva, a Q18 reprodukálva

Claude-AUX · 2026-09-09 · CMD-VS-300-002-001 R43 — REPORT
Előzmény: R32 — SPEC · R33 — REPORT · R41 — LETTER · **R42 — ANALYSIS**
Forrás-állapot: `71c69bb77d0647d11e62440e621bfcf25ee79683` (a ti felülvizsgálatotok a `c58f5f66`-on
készült — a mai kimenet ezt **elévültként** jelzi, lásd §3).

---

## 0. A Q18 igaz, és ez a kör legfontosabb mondata

**Reprodukáltam.** A `run.mjs` helyére a ti leírásotok szerinti, azonnal 86-tal kilépő programot
téve a régi `mutate.mjs` ezt írta ki:

```
10 mutáció · 10 elkapva · 0 túlélte · 0 elavult horgony
RESULT: MINDEN VESZÉLYES MUTÁCIÓ ÉSZLELT
── kilépési kód: 0 ──
```

Egyetlen próba sem futott le.

Az ok egy sor volt — `catch { failed = ['(a futás összeomlott)']; }` —, ami a JSON-hibát
**bizonyítéknak** számolta; mellette a `wrongCatcher` ki volt számolva, de a kilépési feltétel nem
használta.

**Ebből három következtetés, mind a miénk:**

1. **Az R33 „10/10 mutáció elkapva" állítása nem az volt, aminek jelentettem.** A számok azóta
   ugyanazok, de akkor nem tudtam, hogy a mérő nem tud különbséget tenni „a próba megfogta" és „a
   program összeomlott" között. A régi futás eredményét visszamenőleg nem hitelesítem.
2. **Ez a saját regiszterünk KUKA-051/089-e**, a lehető legrosszabb helyen: a mérő-eszközön. Ha a
   mérő zöldet mond a semmire, minden rá hivatkozó bizonyíték hamis — nem gyengébb, hanem hamis.
3. **Az R33 „csak ez árulja el" mondata túl erős volt.** Elfogadom: független elvárt kimenet,
   tulajdonságvizsgálat, kódreview és integrációs próba is találhat fedezetvesztést. A mutáció egy
   módszer, nem a bizonyítás.

---

## 1. Az R42 §3/1 — teljesítve, készfeltételenként

| Készfeltétel | Állapot | Bizonyíték |
|---|---|---|
| **Hibás futtató PIROS** | ✔ | a Q18-támadás a javított mérőn: az alapvonal-kapu piros, a mutációk **nem futnak**, kilépési kód **1** |
| **Ép alap ZÖLD** | ✔ | `10 mutáció · 10 elkapva (ebből 1 korlátozott erejű) · 0 túlélte · 0 rossz próba · 0 mérőhiba` |
| **Minden mutáció a MEGNEVEZETT módon bukik** | ✔ | az M6 elkapóját `P-A08`-ra írva → **WRONG_CATCHER**, kilépési kód **1** |
| **Próba- és bizonyítékazonosítók verzióhoz kötöttek** | ✔ | a rekord `norm_version` · `impl_version` · `source_commit`; a felülvizsgálat elévülése kimondva |

### A javított szerződés

Öt ítélet, és **minden nem-`CAUGHT` piros** (a kilépési kód is):

| Ítélet | Mit jelent |
|---|---|
| `CAUGHT` | a **megnevezett** próba bukott |
| `WRONG_CATCHER` | bukott valami, de nem a megnevezett — a próba-térkép hazudik |
| `SURVIVED` | minden próba átment — a próba lyuka |
| `HARNESS_ERROR` | nincs JSON · spawn-hiba · időtúllépés · nulla próba · hiányzó `records` — **ez nem észlelés** |
| `STALE_ANCHOR` | a mutáció horgonya vagy a megnevezett próba nem létezik |

**Futásidejű kivétel csak akkor bizonyíték, ha a mutáció szerződése ELŐRE kimondja**
(`expect: 'runtime_error'`). Az **M5** így van jelölve, és a kimenet minden futásnál kiírja:

> ⚠ a bizonyíték ereje korlátozott: a mai kódon egyedi kulcs-ütközést vált ki — ez a
> **viselkedés-változás** észlelése, **nem** két sikeresen lekönyvelt hatás bizonyítéka.

### És a lényeg: két ÁLLANDÓ kapu, minden futáskor

```
KAPU (a) alapvonal:      ZÖLD — 6 próba futott
KAPU (b) Q18-ellenpróba: ZÖLD — helyesen HARNESS_ERROR
```

A **(b)** minden egyes futásnál elvégzi a ti támadásotokat a saját magunk kódján, és megköveteli,
hogy `HARNESS_ERROR` legyen belőle. Nem kapcsolóra fut, nem külön parancs: **ez az egyetlen dolog,
amitől a többi számnak értéke van.** Ha egyszer újra „elkapásnak" minősülne, a mérő azonnal piros.

---

## 2. A másik három, ugyanebből a pontból

| Lelet | Állapot |
|---|---|
| **A `v3ref:evidence` parancs nem létezett**, pedig az R33 rá hivatkozott | felvéve a `package.json`-ba. A hiba osztálya a mienk: nem létező futtatóra hivatkozó riport |
| **`executed_by: 'Claude-AUX'` beégetve** | megszűnt. Sorrend: `--executed-by=` → `V3REF_EXECUTED_BY` → **`unknown`**. Beírt alapérték nincs; ha nem mondják meg, a kimenet **kimondja**, hogy nem tudja |
| **Hatókör nélküli `verified_by`** | üresen marad, ahogy kértétek. Helyette próbánkénti, hatókörös rekord (`v3ref/reviews.mjs`) a ti JSON-alakotokban — **`residual` mezővel**, mert enélkül ugyanaz a pecsét volna, csak több mezővel. Az R42 hat ítélete beírva, szó szerinti maradék-szöveggel, `gate_closed: false` |

---

## 3. Amit a §2.4-ből is lezártam — mert a saját, egy körrel korábbi őreim mondtak hamisat

Ezek nem a ti sorrendetek 2. pontja, hanem a **„folyamatos kiadási feltétel"** sora. Kicsik,
egyértelműek, és **hamis biztonságot** állítottak — ezért nem vártak.

**Q16 — az ismeretlen SQL nem biztonságos bővítés.** Reprodukáltam mind a négyet:

| Bemenet | Régi válasz | Mai válasz |
|---|---|---|
| `TRUNCATE TABLE partner;` | `expand, ok:true` | `data_change, ok:false` |
| `ALTER TABLE partner DROP legacy_code;` | `expand, ok:true` | `contract, ok:false` |
| `ALTER TABLE partner ADD CONSTRAINT c CHECK (…);` | `expand, ok:true` | `contract, ok:false` |
| `DELETE FROM stock_movement WHERE id<100;` | `expand, ok:true` | `data_change, ok:false` |

Az ok a KIZÁRÓ felsorolás volt. Most **megengedő szabály**: `expand` · `contract` · `data_change` ·
`unknown`, és **csak az ismert-biztonságos megy át magától**; a `data_change` és az `unknown`
kimondott `-- BESOROLÁS:` fejlécet követel. Igazatok van abban is, hogy **a regex előszűrő, nem
SQL-értelmező** — ezért esik minden fel nem ismert alak `unknown`-ra, és ez a kódban ki van mondva.

**SemVer.** `compareSemver('3.1.0-alpha','3.1.0')` **0**-t adott, és a `03.1.0` átment. Mindkettő
javítva: szigorú alak (vezető nulla tilos) + előkiadás-rendezés a semver.org 11.4 szerint.

**Az `artifactNaming` két bemenete.** `area:'toString'` → `undefined/…` és perjeles „verzió" →
útvonal-részek a névben. Mindkettő mondattal áll meg: sajátkulcs-ellenőrzés + szigorú verzió-alak.

**Mind a hat új viselkedés fixtúrával őrizve** (`verify:release-order` 27/27 ·
`verify:artifact-naming` 28/28) — hogy ne ismétlődjön a Q16 hiba-osztálya: új ág, mérés nélkül.

---

## 4. Amit NEM tettem meg — kimondva

- **A §3 2–5. pontja el sem kezdődött.** Q01–Q15, az A08 konkurencia, az A07+A15, majd a többi
  core-eset: a ti sorrendetek áll, és a következő kör az. **Szándékosan nem kezdtem bele félig:**
  a saját mérőm hibás volt, tehát bármilyen „a mutáció megfogja" állítás addig értéktelen lett volna.
- **Q17 valódi íróra.** Egyetértek: az egyediséget a valódi írónak kell adnia (futásazonosító +
  atomi, felülírást kizáró létrehozás). **Ilyen író ma nincs** — a `var/` alá egyetlen szerszám sem
  ír. Ezt nem javítom előre, mert a helye az első írónál van; addig a `var/README.md` és a
  fixtúra-készlet mondja ki.
- **A gépi bizonyíték teljes mezőkészlete** (kötelező UTC, időzóna-eltolás, futásazonosító,
  konfiguráció-verzió, tartalmi lenyomat, monoton óra az időtartamhoz) **részben van meg**: ma a
  `source_commit`, az `executed_by`, a `norm_version` és az `impl_version` áll benne. **UTC-időpont,
  futásazonosító és tartalmi lenyomat még nincs.** Ez a következő kör 1. pontjának maradéka.
- **A migrációs lenyomat védett alaphoz mérése** (nem az együtt átírt LEDGER) — elfogadom a
  leletet, nem javítottam. A telepített környezet migrációs nyilvántartása külön bizonyíték;
  az első valódi migráció előtt kell.
- **Egyetlen kaput sem billentek át.** A G4/G5/G6 nyitva marad; ez a kör a mérőműszerről szól.

---

## 5. A felülvizsgálatotok elévülése — gépi jel

A rekordjaitok a `c58f5f66` állapoton készültek; a mai forrás `71c69bb7`. A futtató ezt **kimondja**:

```
Felülvizsgálat: ELÉVÜLT 6 próbán (más forrás-állapot)
```

Ez nem szemrehányás, hanem a mechanizmus: egy hatókörös ítélet a forrás-állapotához tartozik, és a
kód azóta változott. **Nem kérek újra-hitelesítést erre a körre** — a §3-as sorrend szerinti 2. pont
után lesz értelme, egyben.

---

## 6. Amit kérek

1. **A javított mérő ellenpróbája.** Ugyanaz a támadás, plusz amit még kitaláltok: a
   `HARNESS_ERROR`-nak minden „a próba nem futott le" alakra ki kell terjednie. Ha találtok olyan
   utat, amin a mérő még mindig észlelésnek minősít egy nem-futást, az a legfontosabb lelet.
2. **A `runtime_error` szerződés helyessége.** Az M5-nél előre kimondtam, hogy a bizonyíték ereje
   korlátozott. Ha ez így is túl megengedő — mert egy összeomlás akkor sem bizonyít viselkedést —,
   mondjátok, és az M5 átkerül a „nincs megfelelő próba" oszlopba.
3. **A §3 2. pontjának egy pontosítása:** a Q02 kanonizálásnál a „verziózott bemenetséma" a ti
   K10-etek alá tartozik-e, vagy külön szerződés-elem? Ettől függ, hova kerül a séma otthona.

*Gépi jelek ezen a forrás-állapoton: `npm run verify:v3ref` (két kapu + 10 mutáció) ·
`npm run verify:release-order` 27/27 · `npm run verify:artifact-naming` 28/28 ·
`npm run verify:sweep` 6/6 zöld, 0 piros. Napló: D-VS-5002.*
