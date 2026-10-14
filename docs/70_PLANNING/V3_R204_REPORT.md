# V3 · R204 — ZÁRÓ JELENTÉS (a személyváltás utáni képernyő egysége · a Saját ügyek állapotszövege)

**Kör:** `CMD-VS-300-002-002 R204 — REPORT` · **Sáv:** Claude-v3 · **Címzett:** chatgpt-v3, az
operátor közvetítésével · **Dátum:** 2026-10-14 · **Alap:** az R204 SPEC
(`20261014_V3_R204_VALODI_FELULETI_UTAK`, board, 2026-10-14 07:05:30Z).

**Munkabázis:** a PR #1 **tényleges feje** — `ea74d127499ccfc51de159f2357d180f6412f242`
(ág: `claude/r154-audit-fix`). A `main` **nem** bázis; force-push nem történt; egy aktív író.

| | SHA |
|---|---|
| **INDULÓ** (a SPEC §0 szerinti tényleges fej) | `ea74d127499ccfc51de159f2357d180f6412f242` |
| **MÉRT és ZÁRÓ** (ezen a fejen futott minden alábbi mérés) | `7d713d85e5fa48e525399ccc1e95390ceb7399cd` |

**Ez a jelentés RÉSZLEGES, és ezt a legelső szakasz mondja ki — nem a végén.** A SPEC két
termékhibát és egy teljes felhasználói átadást rendelt meg; ebből **az egyik hiba gyökérokig
megoldva és ellenpróbával igazolva**, a másik **mért állapottal, de mechanizmus nélkül** áll, az
átadási bemutató **nem készült el**. A pontos maradék a 7. szakaszban, tételesen.

---

## 0. AMI A KÖR ELEJÉN ROSSZUL INDULT — ki kell mondanom, mert a keretet ez vitte el

A munkamenet a kör megnevezésével indult (`CMD-VS-300-002-002 R204 — SPEC`), **a SPEC szövege
nélkül**. A repó állapotában egyetlen nevesített „következő szállítmány" állt (az R20 §8/3 szerinti
K1 mennyiség-szerződés), és a `SPEC` címke is ehhez illett — ezért **először azt kezdtem el**, a
`main` ágon.

**A hiba akkor derült ki, amikor a boardot megnyitottam:** a valódi R204 SPEC ott állt, egészen más
tárggyal, és **kimondottan nem a `main`-t** nevezte munkabázisnak. A félreindított munkát
**eldobtam** (nem commitoltam, nem tolódott fel), és a PR tényleges fejéről újraindultam.

**Amit ebből magamra veszek:** a kör első dolga a SPEC **beolvasása** kell legyen a boardról, nem a
repó állapotából való következtetés. A `CLAUDE.md` 3. szakasza ezt elő is írja („a SPEC szó
szerint"), és a board-eszköz **ebből a repóból elérhető** (`vs_board_doc.mjs --list`) — tehát a
félreindulás nem környezeti korlát volt, hanem az én sorrendi hibám. **Ez a kör keretének jelentős
részét elvitte**, és ez a magyarázata annak, hogy a csomag részleges (lásd a 6. és a 7. szakaszt).
Új KUKA-bejegyzést ehhez **nem** írtam: nem megoldást vezettem ki, és a szabály, amit megszegtem,
**már áll** a memóriában — a hiány nem a szabályban volt.

---

## 1. R112-I3 — A MECHANIZMUS ELŐSZÖR MÉRVE, ÉS JAVÍTVA

### 1/a. Amit az előző körök hagytak

Az `R112-I3` próba a **tünetet** rögzítette (R176 · R186 §4), és a saját fején **zöld**: a hiba
egyszeri, nem vezérelt eseménysoron jött elő. A jelentések kimondták, hogy a **mechanizmus mérve
nincs**, és két jelölt okot (elavult `/api/me` · fókuszra induló második frissítés) **mérve
kizártak**. A `refreshMe` `seq`-ágára adott magyarázat **feltételezés** volt, nem talált hiba.

### 1/b. A VEZÉRELT eseménysor — és ez most reprodukált

Új, célzott próba: **`tests/e2e/v3app-r204-kontextus.spec.mjs` · `R204-K1`**. Amit vezérel, és amit
nem:

| vezérelt | nem vezérelt, nem kitalált |
|---|---|
| a beváltás válaszának **megérkezési ideje** (a szerver MÁR feldolgozta) | a beváltás üzleti eredménye — a **valódi** szerver adja (`route.fetch()`), és a próba a tárolt tényt is visszaolvassa |
| **egyetlen** `/api/me` olvasó kérés elvesztése (`route.abort`) — a valódi hálózati hiba alakja | a tagság, a jogosultsági döntések, a nyelv — egyik sem hamisítva |

**Az eseménysor:** Carl a meghívó képernyőjén elfogad → a választ visszatartjuk → közben **Dóra**
belép ugyanabban a böngészőben (Carl munkamenete lecserélődik) → a beváltás UTÁNI frissítés olvasó
kérése **elveszik** → a késő válasz megérkezik Carl régi lapjára.

### 1/c. A MÉRT eredmény a javítás ELŐTT

```
fejléc (header-subject):  r204-….carl@pelda.hu          ← az ELŐZŐ ember címe
global-notice (látszik):  „Elfogadtad a meghívást. Csatlakoztál ehhez a fiókhoz:
                           »Személyes fiók«. Az adatok megtekintését a fiókkezelő
                           külön engedélyezi."            ← DÓRÁNAK, az ő SAJÁT fiókjára
/api/me (a szerver):      a munkamenet DÓRÁÉ
tárolt tény:              Carl lett tag, Dóra NEM        ← ez végig helyes volt
```

Vagyis **pontosan az a hiba jött vissza, amit az R112 a `KUKA-204` kapujával akart kizárni**: a
siker annak szólt, aki nem végezte, és a fejléc a régi embert mutatta.

### 1/d. A GYÖKÉROK — egy mondatban

A `refreshMe`-nek **két korai kilépése** van (`seq`-eltérés · `status === 0`), és **mindkettő úgy
tér vissza, hogy a `state.me` a RÉGI emberé marad** — a hívó viszont ezt nem tudta megkülönböztetni
a sikeres frissítéstől. A beváltás ágán a védelem (`state.me.subject_id !== r.subject_id`) így
**Carlt hasonlította Carlhoz**, átengedte, és a siker mondata az ott ülő embernek szólt. A kapu
tehát megvolt; **a bemenete volt hamis**.

Két rokon tény ugyanerről a határról, amit a mérés hozott elő:

- a `global-notice` elem **csak a héj `main`-jében születik**, a meghívó képernyőn nincs a lapon —
  ezért a `notice()` üzenete ott **némán** az állapotba kerül (ez illeszkedik ahhoz a történeti
  rögzítéshez, amiben a sáv „sehol" volt);
- a két korai kilépés **kihagyja a `render()`-t**, tehát a kontextus-váltás a meghívó képernyőn
  **se nem látszik, se nem mondódik ki**.

### 1/e. A JAVÍTÁS — három pont, mindhárom a kár helyén (`KUKA-202`)

1. **A frissítés kimondja, alkalmazta-e a szerver igazságát** (`{ applied, why }`). Aki a
   `state.me`-ből dönt, annak előbb ezt kell megkérdeznie.
2. **A beváltás nem állít személyre szóló sikert nem alkalmazott frissítés után.** A szerver TÉNYE
   nem tűnik el és nem is lesz „meghiúsult": a mondat a **nem eldönthető** állapotot mondja ki, a
   teendővel (`KUKA-201`). A hordozott lezárás sem száll át. És **nem** rajzolunk át egy
   kontextust, amit nem igazoltunk (a SPEC §2: *„Késői válasz ne rajzoljon vissza régi
   személyt/adatot"*).
3. **A fejléc a HARMADIK állapotot mondja ki** (`Nem igazolt` / `Not confirmed` /
   `Nicht bestätigt`), nem a régi embert. A régi név megtartása itt nem óvatosság, hanem hamis
   állítás — a „nincs belépve" szintén az volna (`KUKA-012`: az üres és az elérhetetlen nem
   ugyanaz). A frissítés törli ezt az állapotot, amint újra alkalmazott igazsága van.

**Új felirat két kulcson, mindhárom BEKAPCSOLT nyelven** (hu · en · de) — sablonba égetve semmi
(`SZO-01` · `I18N-01`).

### 1/f. VISSZACSÚSZÁSI ELLENPRÓBA — mérve

A javítás kikapcsolva (`if (false && !frissult.applied)`) a próba **ismét** a hibát méri: a fejléc
Carl címe, és a siker-mondat láthatóan Dórának szól. Visszatéve: **zöld**. A javítás tehát nem
„elvileg" hat, hanem a mérés mindkét irányban megfordul.

### 1/g. Amit NEM állítok

- **Nem** állítom, hogy az `R112-I3` TÖRTÉNETI, egyszeri bukása pontosan ezen az úton keletkezett.
  Amit állítok: ugyanaz a **határ**, ugyanaz a **tünet-alak** (régi fejléc · elmaradt rajzolás ·
  néma sáv), és ez az út most **vezérelve, ismételhetően** előáll. A történeti előfordulás
  rögzítése változatlanul ott áll a próbában.
- **Nem** gyengítettem a személy- és fiókvédelmet: a próba visszaolvassa, hogy Dóra **nem** lett tag.
- **Nem** vezettem be automatikus újrapróbálkozást — az elfedné a hibát, nem javítaná.

---

## 2. R176-K3 — MÉRT ÁLLAPOT, MECHANIZMUS NÉLKÜL (nevesített nyitott tétel)

A SPEC §3 belépőjét elolvastam (`tests/e2e/v3app-r176-ket-szereplo.spec.mjs` · `R176-K3`), és
megkerestem a **legutóbbi nyomot**: az **R191 §3** egy önálló mérőpaddal
(`tests/e2e/v3app-r190-k3-diag.diag.mjs`, öt eset) már lefuttatta a célzott vizsgálatot — a keret
(**60 perc / 20 eset**) elfogyott, **reprodukció nem történt**, és a fő gyanút (`D4`: az újratöltés
a visszaállás ablakába esik) **mérés zárta ki**; a 390 px (`D5`) **3/3 zöld**, tehát a szélesség
nem a különböztető jegy.

**Ebben a körben** az `R176-K3` a kötelező böngésző-kapu részeként futott (lásd a 4. szakaszt). Ami
ebből következik, és amit a SPEC §5 elő is ír: **mechanizmus nélkül javítást nem építek**, és nem is
várok véletlen előfordulásra. A tétel **NYITOTT**, a mért nyom és a pontos nyitott ok:

> A hiba a **váltás határán történő újratöltés** körül él, 390 px-en jött elő egyszer, és a
> rendelkezésre álló öt vezérelt eset egyike sem állítja elő. **A pontos nyitott ok:** nincs olyan
> megfigyelt eseménysor, amelyben a szabályosan mentett haladás elvész — az átadás-rekesz írását,
> olvasását és ürítését a mérőpad naplózza, és a naplók mind konzisztensek. Amíg egy újabb
> előfordulás naplója meg nem adja az eltérő sorrendet, a tétel nem a kódban, hanem a
> **megfigyelésben** hiányos.

**Amit NEM tettem:** nem futtattam harmadik, érdemben különböző megközelítést. A SPEC hibánként
legfeljebb kettőt és összesen 90 percet engedett; az első kettő (R191) elfogyott, és a kör keretét
a 0. szakaszban leírt félreindulás vitte el. **Ezt részleges teljesítésként adom át, nem zöldként.**

---

## 3. A SAJÁT ÜGYEK — ÁLLAPOTPONTOSÍTÁS, NEM MEGVALÓSÍTÁS (SPEC §1)

A SPEC kimondta: *„Ha a jelen felület ürességként állítja a hiányzó képességet, a feliratot és
meglévő súgóját igazítsd egyértelmű »még nem elérhető« állapotra minden bekapcsolt nyelven."*

**A mért eltérés:** a lap szövege **üres listát** állított (*„Még nincs megjeleníthető ügyleted"*),
a GYIK viszont azt, hogy **a képesség nem létezik**. Ugyanarról a tényről két mondat, két irányba —
`KUKA-050`.

| | előtte | utána |
|---|---|---|
| a lap bevezetője | „A saját ügyeid egy helyen." | „A saját ügyeid helye. **Ez a képesség még nem elérhető.**" |
| az üres doboz címe | „Még nincs megjeleníthető ügyleted" | „**Ez a lista még nem elérhető**" |
| az üres doboz szövege | „A vállalkozásaid ügyeit a fejléc fiókválasztójából éred el." | „**A saját ügyek listáját még nem építettük meg — nem arról van szó, hogy neked nincs ügyleted.** A vállalkozásaid ügyeit addig a fejléc fiókválasztójából éred el." |

Mindhárom **bekapcsolt** nyelven (hu · en · de). A **súgó és a GYIK már helyes volt**
(*„a képesség még nem létezik"*) — ott nem kellett javítani, és nem is nyúltam hozzá.

**És amit kifejezetten NEM tettem, ahogy a SPEC kéri:** nem építettem kitalált ügy- vagy
jegyzetmodult; a `personal.ownMatters` a tudás-regiszterben **változatlanul** `planned`, a
`missing_capability` és a `tour_note` érintetlen; a **lefedési követelményt nem töröltem, nem
neveztem át teljesítettnek, és nem pótoltam szimulált ügyekkel** — a `verify:lefedes` emiatt
**változatlanul PIROS** (1 örökölt hiány, a cél nulla).

---

## 4. A MÉRÉSEK — mind a záró fejen

| mérés | eredmény |
|---|---|
| **`R204-K1`** (új, vezérelt próba) | **ZÖLD** — és a javítás visszavételével **PIROS**, a hiba eredeti alakjával |
| **`v3app-r112-invite`** (a teljes meghívó-történet) | **8/8 ZÖLD** — benne az `R112-I3` is |
| **`verify:i18n`** | **49/49 PASS · ellenpróba 6/6** |
| **`verify:tutor`** (tudás · súgó · GYIK · bemutató összhangja) | **94/94 PASS · ellenpróba 14/14** |
| **`verify:lefedes`** | **ZÖLD=17 · PIROS=1** — az örökölt `page:personal` rés, **változatlanul** |
| **`verify:decision-numbers`** | **4/4 PASS** |
| **`app:selfcheck`** (a HTTP-héj) | **57/57 PASS** |
| **A KÖTELEZŐ BÖNGÉSZŐ-KAPU** (`verify:browser-gate`, egyszer, külső kerettel) | **MÉG FUT — az eredménye a lezáró commitban áll.** Amíg nincs meg, erre a sorra NEM írok zöldet (`KUKA-093`: a hiányzó mérés nem zöld). |

**Mérési körülmény, kimondva:** a futtatókörnyezet **4 processzoros**. Ez a mag mutációs battériáját
érinti (a deklarált 7-es bontás itt nem fér a 15 000 ms-os korlátba) — **a mag battériája ebben a
körben nem futott**, mert a bemenete nem változott: `v3ref/` alatt **0 fájl** módosult. A SPEC §5
ezt kifejezetten megengedi (*„csak tényleges bemeneti érintettség … esetén induljon"*).

---

## 5. A VÁLTOZÁS TERJEDELME — mit érintettem, és mit nem

| érintve | nem érintve |
|---|---|
| `v3app/public/app.js` (a frissítés verdiktje · a beváltás ága · a fejléc harmadik állapota) | `v3ref/` — **0 fájl** (a mag, a külső lánc, a pinek, az elfogadási profil) |
| `v3app/public/i18n/{hu,en,de}.mjs` (2 új kulcs + 3 javított állapotszöveg) | a jogosultsági döntések, a tároló, a HTTP-határ sémája |
| `tests/e2e/v3app-r204-kontextus.spec.mjs` (új, célzott próba) | a V2 repó · production · felhős beállítás és titok |

---

## 6. A KÖR RÁFORDÍTÁSA

A mérés a csomag board-időbélyegétől (`2026-10-14T07:05:30Z`) indul, a `meres:fogyasztas`
szerződése szerint. **Közbenső, kötelező ellenőrzési pont** (a SPEC §1 utáni feladatcsoport után):

```
hívás 107 · fő-szál kontextus medián 315 041 / max 441 623 · ügynök-bemenet 0 (0 ügynök)
lefedettség: teljes · FIGYELMEZTETÉS (a 300 000–400 000 sávban)
```

**Alügynököt nem indítottam** (a SPEC tiltja, és a mérés is 0-t ad). **Amit a számhoz ki kell
mondani:** a ráfordítás **jelentős részét a 0. szakaszban leírt félreindulás vitte el** — ezt nem
mosom bele a termékmunka költségébe, és megtakarítást nem állítok. A záró mérés a csomag végén, a
tartalom nélküli leltárral együtt készül.

---

## 7. A PONTOS MARADÉK — tételesen, nevesítve

| # | tétel | állapot |
|---|---|---|
| 1 | **`R176-K3`** | **NYITOTT, mechanizmus nélkül.** A mért nyom és a pontos nyitott ok a 2. szakaszban. Harmadik, érdemben különböző megközelítés nem futott. |
| 2 | **A SPEC §4 teljes felhasználói átadása** — a valódi héjon végigkattintható út, asztali **és** 390 px-es **képi** ellenőrzéssel | **NEM KÉSZÜLT EL.** Ez a csomag legnagyobb hiánya; a keretet a 0. szakasz vitte el. A tudás-regiszter, a súgó, a GYIK és a bemutató **összhangja** mérve áll (`verify:tutor` 94/94), de **bemutató-bizonyíték nincs**. |
| 3 | **`personal.ownMatters` / `page:personal`** | **NYITOTT üzleti hiány**, változatlanul. A javított állapotszöveg **nem** jelenti a képesség elkészültét. |
| 4 | **Board-lap és kör-üzenet** | a REPORT ehhez a körhöz **új kört** kap (a parancs-körhöz válasz-lap nem tölthető fel) — lásd a kör-üzenetet. |
| 5 | **Független elfogadás** | nincs. A saját futtató zöldje **nem** független AI-review; a PR **nem** merge-kész, és nem is kérem. |

**Amit ez a jelentés NEM állít:** nem rendszer-készültség, nem termékelfogadás, nem az `R176-K3`
megoldása, nem a Saját ügyek elkészülte, és nem állítja, hogy a csomag teljes. **Egy hiba gyökérokig
megoldva és ellenpróbával igazolva, egy hiba mért állapottal nyitva, az átadási bemutató hiányzik.**
