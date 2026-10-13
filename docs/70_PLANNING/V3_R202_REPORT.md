# V3 — R202 VÉGREHAJTÁSI JELENTÉS

**Kör:** `CMD-VS-300-002-002 R202` · **Sáv:** Claude-v3 · **Munkabázis:** `claude/r154-audit-fix` (PR #1)
**Döntés:** D-VS-3263 · **KUKA:** 497 · 498 · **Szerződés:** `PRF-01`

> **AMIT EZ A JELENTÉS NEM ÁLLÍT.** Nem rendszer-készültség, és nem termékelfogadás. A működő saját
> futtató zöldje **nem** független AI-review (R202 §3). A kapuk a bizonyíték **kezelését** mérik, nem
> kriptográfiai védelmet adnak egy minden fájlhoz hozzáférő író ellen — és ez nem is e projektblokk
> elfogadási követelménye.

---

## 0. AZ ÁTVÉTEL — MÉRVE

| mit | a SPEC szerint | mérve |
|---|---|---|
| PR-fej | `4b0a239c3d509595dd2984dabb1b235206bcaf33` | **egyezik** |
| ág | `claude/r154-audit-fix`, PR #1 nyitott, nem mergelt | egyezik |
| munkafa | tiszta | **0 változás** |
| történeti regiszter | 19 program | **19 program · 168 eset** |
| a mai aktív készlet | 17 program · 152 program-eset | **17 · 152** — a FÜGGETLEN profilból számolva |
| a kimaradó kettő | az eredeti `r57` (9 eset) és `r59` (7 eset) | egyezik: 168 − 9 − 7 = 152 |

---

## 1. A DÖNTÉS ÁTVEZETÉSE — `PRF-01` (§1)

A chatgpt-v3 az R202 §0-ban meghozta az R201-ben kért szakmai döntést: **a mai elfogadási profilban
az `r57` helyét az `r57a`, az `r59` helyét az `r59a` tölti be.** Az eredeti kettő
**történeti/diagnosztikai** program marad, a saját nyers eredményével.

### 1.1 A profil saját, verziózott otthona

`v3ref/external-checks/acceptanceProfile.mjs`:

| profil | mit jelent | mérve |
|---|---|---|
| **`today-17`** | a **mai** elfogadási mérce | 17 program · **152 aktív program-eset** · lenyomat `1964f62c4f96870b` |
| **`historical-19`** | a **változatlan** régi futtató-szerződés | 19 program · 168 eset · lenyomat `7abf08b62d6ad2a9` |

Az aktív eset-készlet a program-azonosító + eset-azonosító **párok** uniója, és a `profileCaseKeys`
**soha nem lát mérési eredményt** — csak a profilt és a manifesztet. A SPEC ezt kifejezetten kérte:
*„a számot a független profilból számítsd, ne a beérkező eredményből."*

### 1.2 A szétválasztás a KÖTÉSBEN áll, nem a szövegben

A profil azonosítója és **tartalmi lenyomata** bekerül a sorozat kötésébe (`canonBinding`), tehát
**más profil → más kötés → más sorozat**. Mérve:

```
historical-19  → sorozat s3047746cb171 · profil-lenyomat 7abf08b62d6ad2a9
today-17       → sorozat sa7aa58f09e92 · profil-lenyomat 1964f62c4f96870b
```

És a `bindingMismatch` **megnevezi** az eltérést: `profile_id: "historical-19" ≠ ELVÁRT "today-17"`.
Egy történeti eredmény így **gépileg** nem adható be mai profilbizonyítékként — nem a jóindulat
választ (`KUKA-121`).

A profil-lenyomat **tartalmi**: magában foglalja a helyettesítésben szereplő fájlok **mért** sha256-át,
ezért egy adaptált program megváltozása **új kötést** ad, nevezetten. Kézzel beírt pint szándékosan
nem vezettem be (az a `KUKA-003` osztálya) — az azonosságot a **könyvelt** R201-es rekordokhoz mérem.

### 1.3 A választás EXPLICIT, a régi út változatlan

`--profile <név>` nélkül a futtató a **történeti**, 19-programos szerződés szerint fut: ez a külső
programok és a korábbi körök útja, és a SPEC szerint változatlan kell maradnia. A mai profilt
**kézzel** kell kérni. Mérve, a három ág:

```
(a) --profile today-17 --only r57
    → a(z) "r57" program LÉTEZIK a regiszterben, de a(z) today-17 profilban NEM AKTÍV.
      a helyettesítője ebben a profilban: r57a (döntés: R63 §4 … · R202 §0 …)
      a történeti futtatásához: … --only r57   (profil nélkül)          [kilépés 2]

(b) --profile nincs-ilyen
    → PROFIL: nem nevezett profil: "nincs-ilyen" (nevezett profilok: historical-19 · today-17)

(c) --only r57   (profil nélkül)
    → PROFIL historical-19 … (ez a TÖRTÉNETI szerződés: az eredeti r57/r59 is aktív, a bukásaik LÁTHATÓK)
```

A mérce **a kimeneten is látszik** (a futtató és az összesítő fejlécében), mert ha nem látszik, az
olvasó nem tudja, mihez mértünk.

### 1.4 Elfogadás csak 17/17-tel — és a hiányt az eredeti nem pótolja

Mérve (`PRF02`, `PRF03`): egyetlen aktív program hiánya, bukása, egy **eset** hiánya vagy az átírt
bizonyíték-lenyomat mind **elutasítva**; és az `r57a`/`r59a` hiányát a történeti eredeti **semmilyen**
állapota nem pótolja — se zölden, se bukottan, se környezeti akadályon elakadva.

---

## 2. A BIZTONSÁGI SZÁNDÉK MEGTARTVA — TANÚVAL (§2)

A SPEC kérte, hogy a **69 magpróba meglévő készletében** nevezzem meg az alap nélküli meghívó
**elutasításának** közvetlen tanúját és a szabályos pozitív párját, és ha nincs ilyen, pótolja egy
célzott próba. **Van ilyen** — ezért új próbát nem gyártottam, hanem megnevezte a profil, és gépi jel
fogja (`PRF07`):

| mit | hol | mérve |
|---|---|---|
| **az elutasítás** | `P-ORG-basis-limit` (e) | nyers, pecsét nélküli `INSERT INTO invite` → `redemptionLimitGate` `basis_declared:false` · `no_declared_basis`; `redeemInvite` `invite_without_basis`; **és a meghívó NEM fogy el** (`redeemed_at === null`); a kikényszerítés helye nevezve: `LIMIT_ENFORCED_PATHS ⊇ invite_redeem_without_basis` |
| **a pozitív pár** | `P-ORG-basis-limit` (b)+(c) | a szabályos, alapból kiadott meghívó beváltása **MEGY**, és a korlátot **átviszi** (`granted_limit_recorded`) — tehát a kapu nem fal |
| **az R63 (A) szabálya** | `P-ORG-adjudication-basis-limit` (h) | alap nélküli hatáskör: megadás elutasítva / 0 sor · használat `false` (`authority_without_recorded_basis`) · `usable_now=false` · `enforced=true` |

A `PRF07` nem feliratot mér: lefuttatja a magpróbákat, és megköveteli, hogy **mind a két tanú-próba
ZÖLD** legyen, az elutasító jelek a próba **forrásában**, a többi a **mért kimenetben** álljon. *(A
két csoportot a mérés döntötte el: az `invite_without_basis` a próba szövegében áll, a kimenetre nem
kerül ki; a `granted_limit_recorded` a termékmodulban él. Az első alakom ezen bukott el — a pin a
rossz helyen keresett.)*

**A termék szabálya nem gyengült.** Az `r57a` a TESZT-ELŐFELTÉTELT vezette át szabályos alapra, és a
támadási utak valódiak maradtak: a T02 őr nélküli ágán a nyers `UPDATE invite SET offered_role`
**szándékos** (a pecsét-eltérés tényét állítja elő), és a T05 tizennégy nyers DML-alakja is.

### 2.1 HELYESBÍTÉS A SAJÁT SZÖVEGEMBEN *(KUKA-498)*

A manifeszt **mindkét** adaptált programról azt írta, hogy „**KIZÁRÓLAG** a battéria hívásának
alakja" változott. A chatgpt-v3 ezt pontatlannak nevezte; **a két forrás diffjével megmértem, és
igaza van**:

- **`r57a`** — a hívásalakon **túl** a `world()` fixtúra meghívója is változott: nyers
  `INSERT INTO invite VALUES (…)` helyett **nevezett, rögzített felhatalmazási alap** alatt születik
  (`recordAuthorityBasis` + `issueInviteUnderBasis`, BAS-01/BLI-01), ugyanazokkal a meghívó-mezőkkel
  és ugyanazon az órán — az **R63 §4** előírt átvezetése szerint.
- **`r59a`** — a darabolt hívás mellett **egy diagnosztikai mező**:
  `result.norm_evidence.required` → `result.norm_evidence?.required ?? null`. A **pass-predikátum
  változatlan** (`pass: process.exit !== 0`), tehát az ítéletet nem érinti — de „kizárólag hívásalak"
  ettől már nem állítható.

A két leírás mostantól a mért valóságot mondja, sorszámozva.

---

## 3. A CÉLZOTT PRÓBÁK ÉS AZ ELLENPRÓBÁK

**Új őr: `npm run verify:acceptance-profile`** (`PRF01`–`PRF08`, **53 állítás**), bekötve a söprésbe.
A SPEC hét kért esete:

| eset | mit mér | eredmény |
|---|---|---|
| `PRF01` | jó, teljes mai készlet a profil neve alatt | **ELFOGADVA** · 17/17 · 152 eset |
| `PRF02` | egy aktív program/eset hiánya · bukása · érvénytelen bizonyítéka | **ELUTASÍTVA** (négy alak) |
| `PRF03` | `r57a`/`r59a` hiánya + az eredeti három állapota | **nem pótolja** (6 kombináció) |
| `PRF04` | történeti eredmény mai profilként | **ELUTASÍTVA** — a kötés és az ÉLŐ futtató-úton is |
| `PRF05` | a régi bukások a történeti nézetben | **megmaradnak**, és nem aktív programok |
| `PRF06` | a változatlan eredeti fájlok azonossága | **igazolva** a KÖNYVELT rekordokhoz (olcsó összehasonlítás) |
| `PRF07` | a biztonsági tanú | **ÉL** — a próbák futnak és zöldek |
| `PRF08` | a profil-otthon saját kapuja | elcsúszott profil · néma alapérték · kitalált profil **elesik** |

*(A „részleges `--only` nem teljes profilbizonyíték" és a „régi és új CLI nem keverhető" eset a `PRF04`
élő futtató-ágán mérődik; a részleges hatókör kimondása az `SRU11`–`SRU12`-ben is áll.)*

**ELLENPRÓBÁK — a javítást visszagörgetve a saját őrének pirosat kell adnia:**

| visszagörgetés | mi tüzel |
|---|---|
| a profil kivéve a kötésből | `PRF04`: **„a két profil UGYANABBA a sorozatba esik — a szétválasztás nem gépi"** · `PRF01` 0/17 |
| néma alapérték a profil-feloldóban | `PRF08`: „az ÜRES profil-név nem NEVEZETTEN esik el (néma alapérték)" |
| az `r57` aktívan hagyva a mai profilban | `PRF01` (18≠17 · 161≠152) · `PRF04` · `PRF05` |

**A MEGLÉVŐ POZITÍV KONTROLLOK ZÖLDEK:** `verify:external-series` (EXS01–EXS16) ·
`verify:sweep-reuse` (SRU01–SRU14, **59/59**) · `verify:mutation-batch` (MBX01–MBX13) ·
`verify:unit-admission` · `verify:external-decisions` · `verify:kuka` **1246/1246** ·
`verify:decision-numbers` 4/4 · `verify:artifact-naming` · `verify:release-order` ·
`verify:fogyasztas-meres` · `verify:doc-html` · **a mag próbái 69/69**.

### 3.1 A SÖPRÉS HÁROM ÁLLAPOTA (§3)

A SPEC kérte, hogy a söprés kiírása különböztesse meg a három állapotot. A régi alak **kettőt**
ismert, és a mért bukást is „nem igazolt"-nak nevezte — ami elhallgatja, hogy **tudjuk** az
eredményt (`KUKA-206`). Mostantól:

```
ÚJRAHASZNÁLT BIZONYÍTÉK — <lánc>: MOST NEM FUTOTT, a(z) <commit> bizonyítéka ZÖLD …
MÉRT BUKÁS          — <lánc>: a mai profil alatt a készlet TELJES, de a verdikt NEM ZÖLD — …
                      Ez NEM „nincs mérés": az eredmény MEGVAN és piros.
NINCS ÉRVÉNYES MÉRÉS — <lánc>: …
```

---

## 4. HÁROM SAJÁT HIBA, MENET KÖZBEN ELKAPVA

1. **Az első `seriesLedger` szerkesztésem assert-en elhasalt a write ELŐTT**, ezért a `canonBinding`
   és a `bindingMismatch` módosítása **elveszett**, és csak a `bindingProblems` ment át. A hibát a
   **futtató saját kapuja** mondta ki: *„a horgony-kötés nem nevezi meg az ELFOGADÁSI PROFILT"*.
   Pótolva. *(Ugyanaz az osztály, amit az R200-ban is elkaptam — a néma, részleges szerkesztés.)*
2. **A szintetikus rögzítőim kinőtték a szerződést** (`EXS15`, `SRU12`–`SRU14`): a kötés profil-párral
   bővült, a fixtúrák viszont a `PRF-01` előtti alakot építették, és **helyes kódra adtak pirosat**.
   Ez a `KUKA-495` osztálya, amit az R200-ban épp kivezettem. Javítva úgy, hogy a profil-lenyomatot
   **ugyanazokkal a függvényekkel** számolják, amiket az éles út hív — tehát konstrukció szerint
   egyeznek, nem egyeztetés útján.
3. **A mérés-vezénylőm a teljes mérést kihagyta volna.** Az első alakja a sorozatokat a
   `bundle_digest` egyezésével válogatta — a BND-01 köteg-lenyomat viszont **nem rekurzív**
   (`KUKA-493`), tehát egy kizárólag `v3ref/external-checks/` alatti változás után **változatlan**.
   Így az R201-es, **profil nélküli** sorozat „már rögzítettnek" látszott, és a vezénylő mind a 17
   programot kihagyta, **2 ms alatt „végzett"**. Pontosan az, amit a SPEC tilt. Javítva: a folytatható
   sorozat az, aminek a **sorozatazonosítója** azonos azzal, amit a futtató ma számolna (a teljes
   kötésből, a profil-párral együtt) — **egy mező összevetése nem azonosság**. *(A futtató maga helyes
   volt: ő a teljes kötésből képzi a sorozat útját.)*
