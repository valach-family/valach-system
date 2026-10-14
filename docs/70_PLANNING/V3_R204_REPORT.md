# V3 · R204 — ZÁRÓ JELENTÉS (a személyváltás utáni képernyő egysége · átadási bemutató · a Saját ügyek állapotszövege)

**Kör:** `CMD-VS-300-002-002 R204 — REPORT` · **Sáv:** Claude-v3 · **Címzett:** chatgpt-v3, az
operátor közvetítésével · **Dátum:** 2026-10-14 · **Alap:** az R204 SPEC
(`20261014_V3_R204_VALODI_FELULETI_UTAK`, board, 2026-10-14 07:05:30Z).

**Munkabázis:** a PR #1 **tényleges feje**. A `main` **nem** bázis; force-push nem történt; egy
aktív író; merge, telepítés és lezárás nem történt.

| | SHA |
|---|---|
| **INDULÓ** (a SPEC §0 szerinti tényleges fej) | `ea74d127499ccfc51de159f2357d180f6412f242` |
| **MÉRT** (a kötelező böngésző-kapu és a célzott próbák ezen futottak) | `7d713d85e5fa48e525399ccc1e95390ceb7399cd` |
| **ZÁRÓ** (az átadási bemutató képi bizonyítéka ezen, TISZTA munkafán) | `2c0a5e4030bd5e0c3af87c2f744dcdf2c3643ba2` |

**Mit teljesített ez a csomag, egy mondatban:** **egy hiba gyökérokig megoldva és visszacsúszási
ellenpróbával igazolva** (`R112-I3`) · **az átadási bemutató képi bizonyítéka elkészült** a valódi
héjon, asztali és 390 px-es méretben · **a Saját ügyek állapotszövege a valóságot követi** ·
**egy hiba (`R176-K3`) mért állapottal, de mechanizmus nélkül NYITOTT** — és ezt nem írom zöldnek.

---

## 0. AMI A KÖR ELEJÉN ROSSZUL INDULT — ki kell mondanom, mert a keretet ez vitte el

A munkamenet a kör megnevezésével indult (`CMD-VS-300-002-002 R204 — SPEC`), **a SPEC szövege
nélkül**. A repó állapotában egyetlen nevesített „következő szállítmány" állt, és a `SPEC` címke is
ahhoz illett — ezért **először azt kezdtem el**, a `main` ágon.

**A hiba akkor derült ki, amikor a boardot megnyitottam:** a valódi R204 SPEC ott állt, egészen más
tárggyal, és kimondottan **nem a `main`-t** nevezte munkabázisnak. A félreindított munkát
**eldobtam** (nem commitoltam, nem tolódott fel), és a PR tényleges fejéről újraindultam.

**Amit magamra veszek:** a kör első dolga a SPEC **beolvasása** a boardról, nem a repó állapotából
való következtetés. A `CLAUDE.md` 3. szakasza ezt elő is írja („a SPEC szó szerint"), és a
board-eszköz **ebből a repóból elérhető** — tehát nem környezeti korlát volt, hanem sorrendi hibám.
**Ez a kör keretének jelentős részét elvitte** (lásd a 6. szakaszt). Új KUKA-bejegyzést ehhez nem
írtam: nem megoldást vezettem ki, és a szabály, amit megszegtem, **már áll** a memóriában — a hiány
nem a szabályban volt.

---

## 1. R112-I3 — A MECHANIZMUS ELŐSZÖR MÉRVE, ÉS JAVÍTVA

### 1/a. Amit az előző körök hagytak

Az `R112-I3` próba a **tünetet** rögzítette (R176 · R186 §4), és a saját fején **zöld**: a hiba
egyszeri, nem vezérelt eseménysoron jött elő. A jelentések kimondták, hogy a **mechanizmus mérve
nincs**, és két jelölt okot (elavult `/api/me` · fókuszra induló második frissítés) **mérve
kizártak**. A `refreshMe` `seq`-ágára adott magyarázat **feltételezés** volt, nem talált hiba.

### 1/b. A VEZÉRELT eseménysor — és ez most reprodukált

Új, célzott próba: **`tests/e2e/v3app-r204-kontextus.spec.mjs` · `R204-K1`**.

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

A `refreshMe`-nek **két korai kilépése** van (`seq`-eltérés · elérhetetlen kiszolgáló), és **mindkettő
úgy tér vissza, hogy a `state.me` a RÉGI emberé marad** — a hívó viszont ezt nem tudta
megkülönböztetni a sikeres frissítéstől. A beváltás ágán a védelem
(`state.me.subject_id !== r.subject_id`) így **Carlt hasonlította Carlhoz**, átengedte, és a siker
mondata az ott ülő embernek szólt. **A kapu megvolt; a BEMENETE volt hamis.**

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

**Két új felirat, mindhárom BEKAPCSOLT nyelven** (hu · en · de) — sablonba égetve semmi
(`SZO-01` · `I18N-01`).

### 1/f. VISSZACSÚSZÁSI ELLENPRÓBA — mérve

A javítás kikapcsolva a próba **ismét** a hibát méri: a fejléc Carl címe, és a siker-mondat
láthatóan Dórának szól. Visszatéve: **zöld**. A javítás tehát nem „elvileg" hat — a mérés mindkét
irányban megfordul.

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
(**60 perc / 20 eset**) elfogyott, **reprodukció nem történt**, a fő gyanút (`D4`: az újratöltés a
visszaállás ablakába esik) **mérés zárta ki**, és a 390 px (`D5`) **3/3 zöld** volt, tehát a
szélesség nem a különböztető jegy.

**Ebben a körben** az `R176-K3` a kötelező böngésző-kapu **155 helyzetének része** volt, és **zöld**
(0 bukott, 0 ingadozó). **Ez nem zárja le a tételt:** egy zöld futás nem cáfol egy korábbi pirosat.

A SPEC §5 szabálya szerint (legfeljebb két érdemben különböző megközelítés, és mechanizmus nélkül
nincs kitalált javítás) a tétel **NYITOTT**. A mért nyom és a pontos nyitott ok:

> A hiba a **váltás határán történő újratöltés** körül él, 390 px-en jött elő egyszer, és a
> rendelkezésre álló öt vezérelt eset egyike sem állítja elő. **A pontos nyitott ok:** nincs olyan
> megfigyelt eseménysor, amelyben a szabályosan mentett haladás elvész — az átadás-rekesz írását,
> olvasását és ürítését a mérőpad naplózza, és a naplók mind konzisztensek. Amíg egy újabb
> előfordulás naplója nem adja meg az eltérő sorrendet, a tétel nem a kódban, hanem a
> **megfigyelésben** hiányos.

**Amit NEM tettem:** nem futtattam harmadik, érdemben különböző megközelítést — a keretet a 0.
szakaszban leírt félreindulás vitte el. **Ezt részleges teljesítésként adom át, nem zöldként.**

---

## 3. AZ ÁTADÁSI BEMUTATÓ — ELKÉSZÜLT, ÉS KÖZBEN EGY SÚLYOS LELET (SPEC §4 · KUKA-500)

### 3/a. A lelet: az átadás eszköze egyetlen kapuban sem volt

A SPEC §4 azt kérte, hogy legyen **egy ténylegesen végigkattintható út a meglévő valódi héjon**,
asztali **és** 390 px-es **képi** ellenőrzéssel. Erre a repóban kész eszköz áll
(`npm run docs:kiprobalas-kepek`) — **és amikor lefuttattam, kivétellel megállt.**

**Mérve:** a 11. képnél, 30 másodperc után, mert egy olyan felületi horgonyra kattintott
(`member-scope-select-<alany>`), ami a termékben **már nem létezik** — a név **egyetlen
előfordulása maga az eszköz volt**, már a **változatlan** fejen (`ea74d12`) is. Tehát **nem az én
változásom okozta**, és ez a kontroll a mérés része, nem feltételezés. Utána a 17. lépés egy **régi
mondatot** keresett (`/fiókot váltottál|Megnyitva/`), miközben a nyelvcsomag mást mond.

**Következmény:** az átadási bizonyíték **egyáltalán nem készült el** — miközben minden más lánc
zöld volt. Az eszköz **semmilyen gépi kapuban nem futott**, tehát a némán elcsúszott elvárás
senkinek nem tűnt fel. *A nem mért eszköz nem „ismeretlen állapotú", hanem zöldnek látszik*
(`KUKA-051`), és a szállítás része az, amit a címzett meg tud nyitni (`KUKA-079`).

**Javítás:** a mai horgonyt hívja (`member-scope-grant-<alany>-<adatkör>` — **ugyanaz, amit a
próbák hívnak**, tehát a két út nem tud elcsúszni), a 17. lépés mércéje pedig a **nyelvcsomagból**
jön, nem begépelt mintából (`KUKA-237`). **És a lényeg:** a lánc bekerült a **kötelező
böngésző-kapu** lista[j]ába, ami a parancs **alakját** is méri — egy következő felület-változás után
nem tud újra némán elcsúszni. Tanulság: **KUKA-500**.

### 3/b. A bizonyíték, amit az operátor meg tud nyitni

| mi | hol |
|---|---|
| **felhasználói bemutató** — 18 képernyő, minden lépésnél „mit próbálj ki" és „miből látod a sikert" | `var/reports/v3_v3.0.0-alpha_20261014_090941_v3app_bemutato.html` (2,2 MB) |
| **műszaki melléklet** — forrás-commit, indítás, szerződés-azonosítók, nevezett hiányok | `var/reports/v3_v3.0.0-alpha_20261014_090941_v3app_muszaki.html` (9 kB) |

**Mérve:** **18 kép, mind beágyazva · külső erőforrás NINCS** (hálózat nélkül megnyitható, dupla
kattintásra) · a bemutató sha256
`75aaed6af4ebc3881bcbd408d6f887f0be5aac8e8032cdc6f004b43914c4ecdb` · a melléklet sha256
`a92b74104231dc99dc524ea6fa18428055b70b729fe5fed1e4187ebe72ec1a86` · **forrás-commit
`2c0a5e4030bd5e0c3af87c2f744dcdf2c3643ba2`, TISZTA munkafán**. A kattintásokat valódi Chromium
végezte a valódi kiszolgálón, és **minden lépés mért állítással zárul** — a 17. kép például a
személyváltás „együtt mozduló" képét méri (fejléc · mondat · a régi szerkesztő bezárása).

**Benne van a 390 px is:** a 16. kép a mobil nézet (390×844), és a mérce az `UX-17` (390×844 és
1440×900) — tehát a SPEC „asztali és 390 px-es képi ellenőrzés" kérése **mindkét méretre** teljesül.

### 3/c. Amit az átadásról NEM állítok

- A **szimulált** bemutató (`proof:demo-walk`, zöld, 482 s) **melléklet**, nem a valódi szerveres
  út — a SPEC ezt így is kéri, és a kettőt nem keverem.
- A tudás-regiszter, a súgó, a GYIK, az oldaltérkép és a bemutatók **összhangja** mérve áll
  (`verify:tutor` 94/94 + 14/14 ellenpróba), de **élő modellhívás nem történt**, és helyi csonk
  eredménye nem élő nyelvértési bizonyíték.
- **Új felhős telepítés nincs**; a már engedélyezett helyi/artifact átadást használtam.

---

## 4. A SAJÁT ÜGYEK — ÁLLAPOTPONTOSÍTÁS, NEM MEGVALÓSÍTÁS (SPEC §1)

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

**Megkerestem azt is, amit a SPEC §6 kért:** nincs a repóban korábban elfogadott, kész
**ügytípus-/forrásfolyamat-specifikáció**. A három hivatkozott forrás (`V3_R91_HASZNALATI_UTAK.md` ·
`features.mjs` · `V3_R81_UX_ELFOGADAS.json`) a felületi elfogadásról és a hiány nevesítéséről szól,
üzleti ügy-adatmodellt egyik sem rendel meg — tehát **új üzleti modult ebben a körben sem indítottam**.

---

## 5. A MÉRÉSEK — és a változás terjedelme

### 5/a. A kötelező böngésző-kapu (egyszer, külső kerettel)

```
RESULT: PASS — a böngészős láncok lefutottak, a mérés igazoltan elindult, és minden verdikt zöld.
  test:e2e + proof:core-ux   ZÖLD · 626 s   (EGY futás fedi mindkettőt — a kapu ezt MÉRI, nem feltételezi)
  155 helyzet teljesült · 0 bukott · 0 ingadozó · 0 kihagyott · MIND a 27 próba-fájl mérve
  proof:demo-walk            ZÖLD · 482 s
  chromium 141.0.7390.37     elindult (a fájl léte nem indulás — KUKA-220)
```

### 5/b. A célzott mérések

| mérés | eredmény |
|---|---|
| **`R204-K1`** (új, vezérelt próba) | **ZÖLD** — és a javítás visszavételével **PIROS**, a hiba eredeti alakjával |
| **`v3app-r112-invite`** (a teljes meghívó-történet) | **8/8 ZÖLD** — benne az `R112-I3` is |
| **`verify:i18n`** | **49/49 PASS · ellenpróba 6/6** |
| **`verify:tutor`** (tudás · súgó · GYIK · bemutató) | **94/94 PASS · ellenpróba 14/14** |
| **`verify:kuka`** | **1252/1252 PASS** (491 bejegyzés, +KUKA-500) |
| **`verify:lefedes`** | **ZÖLD=17 · PIROS=1** — az örökölt `page:personal` rés, **változatlanul** |
| **`verify:decision-numbers`** | **4/4 PASS** — a következő szabad szám D-VS-3265 |
| **`app:selfcheck`** (a HTTP-héj) | **57/57 PASS** |
| **`docs:kiprobalas-kepek`** | **végigfut** · 18 képernyő · önhordó · TISZTA commitra kötve |

**Amit nem futtattam, és miért:** a **mag mutációs battériája** — a `v3ref/` alatt **0 fájl**
változott, és a SPEC §5 kifejezetten így kéri (*„csak tényleges bemeneti érintettség … esetén
induljon"*). **Általános teljes söprést sem** ismételtem: a SPEC a célzott és a böngészős
ellenőrzést rendelte meg. **Kimondott mérési körülmény:** a futtatókörnyezet **4 processzoros** — a
mag battériájának deklarált 7-es bontása itt nem férne a 15 000 ms-os korlátba; ez **nem**
kódregresszió, és ebben a körben nem is érintett.

### 5/c. Mit érintettem, és mit nem

| érintve | nem érintve |
|---|---|
| `v3app/public/app.js` (a frissítés verdiktje · a beváltás ága · a fejléc harmadik állapota) | **`v3ref/` — 0 fájl** (a mag, a külső lánc, a pinek, az elfogadási profil) |
| `v3app/public/i18n/{hu,en,de}.mjs` (2 új kulcs + 3 javított állapotszöveg) | a jogosultsági döntések, a tároló, a HTTP-határ sémája |
| `tests/e2e/v3app-r204-kontextus.spec.mjs` (új, célzott próba) | a V2 repó · production · felhős beállítás és titok |
| `tools/v3_kiprobalas_kepek.mjs` · `tools/vs_verify_browser_gate.mjs` (KUKA-500) | a söprés szerződése, az újrahasznosítás feloldója |
| `DECISION_LOG.md` (D-VS-3264) · a KUKA-regiszter, az archívum, az őr-otthon, az alapvonal | — |

---

## 6. A KÖR RÁFORDÍTÁSA

A mérés a csomag board-időbélyegétől (`2026-10-14T07:05:30Z`) indul. **Közbenső, kötelező
ellenőrzési pont** (a feladatcsoportok között):

```
hívás 107 · fő-szál kontextus medián 315 041 / max 441 623 · ügynök-bemenet 0 (0 ügynök)
lefedettség: teljes · FIGYELMEZTETÉS (a 300 000–400 000 sávban)
```

**Alügynököt nem indítottam** (a SPEC tiltja, és a mérés is 0-t ad). **Amit a számhoz ki kell
mondani:** a ráfordítás **jelentős részét a 0. szakaszban leírt félreindulás vitte el** — ezt nem
mosom bele a termékmunka költségébe, és **megtakarítást nem állítok**. A záró mérés a kör-üzenettel
együtt megy ki.

---

## 7. A PONTOS MARADÉK — tételesen, nevesítve

| # | tétel | állapot |
|---|---|---|
| 1 | **`R176-K3`** | **NYITOTT, mechanizmus nélkül.** A mért nyom és a pontos nyitott ok a 2. szakaszban. Harmadik, érdemben különböző megközelítés nem futott. |
| 2 | **`personal.ownMatters` / `page:personal`** | **NYITOTT üzleti hiány**, változatlanul. A javított állapotszöveg **nem** jelenti a képesség elkészültét; a `verify:lefedes` emiatt piros. |
| 3 | **Független elfogadás** | **nincs.** A saját futtató zöldje **nem** független AI-review; a PR **nem** merge-kész, és nem is kérem. |
| 4 | **A kijelölt ág és a PR feje** | a munka a `claude/cmd-vs-300-002-002-r204-2l0dva` ágon áll, a PR fejére építve. **A PR fejágára nem toltam fel** — a munkamenet kijelölt ága kötött, és a fast-forward átvezetés **operátori döntés**. |
| 5 | **A `main`-en nézhető kiadás** | ez a csomag **össze nem olvasztott ágon** áll, ezért az operátornak **nem** adok checkout/pull/söprés utasítást: a kipróbálás útja az átadási bemutató lapja (3/b) és a board-lap. |

**Amit ez a jelentés NEM állít:** nem rendszer-készültség, nem termékelfogadás, nem az `R176-K3`
megoldása, nem a Saját ügyek elkészülte, és nem állítja, hogy a bemutató-lap zöldje a határ zöldje.
**Egy hiba gyökérokig megoldva és ellenpróbával igazolva · az átadási bemutató elkészült és
önhordó · egy hiba mért állapottal nyitva.**
