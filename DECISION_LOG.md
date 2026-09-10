# DECISION LOG — Valach System (V3)

**A számozás a 3000-es blokkból megy.** A V2 (`valach-family/vs`) a 3000 ALATT marad, a V3 a
3000-től — így két repó egyszerre oszthat számot ütközés nélkül, és a `D-VS-…` továbbra is EGY
dolgot jelöl, nem kettőt. Gépi őr: `npm run verify:decision-numbers` (kiírja a következő szabad
számot, és piros lesz, ha valaki a blokkon kívülre lép).

**A határ mérésből jön, nem tippből** (D-VS-3005): az első alak a 700 volt, és a V2 akkor a 670-nél
állt — 29 szabad szám, a git-történetből mért ütemen (433 → 670 huszonkét nap alatt) **egy hét**.
A V2 nem áll le: a Shoprenter-szinkron és a folyamatok alapszintű működése még hátravan, három
cégtér használja a KS kiváltására. A 3000-es határ **2329 szabad számot** hagy neki, ami a mért
leggyorsabb ütemen is 215 nap, a mai ütemen másfél év.

A 3000 előtti döntések a V2 repó `DECISION_LOG.md`-jében élnek. Nem másoljuk át: egy fogalomnak EGY
otthona van (KUKA-018).

---

## D-VS-3009 — Az R51 tíz lelete javítva; a megvonás és a szervezeti alap a normatív magba

**Kör:** CMD-VS-300-002-001 R51→R52 · sáv: Claude-AUX · a külső fél független ellenőrzése az
R50-re, tizennégy célzott ellenpróbával a JAVÍTÁSAINK VARRATAIN.

**A bemenet.** A ti R49-es harminc esetetek náluk is 30/30. Az ÚJ tizennégyből **négy megfelelt, tíz
nem**. Reprodukáltuk: **10/10, karakterre az ő eredményükkel.**

### A kör legsúlyosabb lelete: a SAJÁT ÁLLÍTÁSOM volt hamis

Az R50 §2.3-ban ezt írtam: *„Ugyanezt a három ágat végigmérve az ISMÉTLÉS és az OLVASÁS MÁR ZÁRVA
VAN — ezt kimondjuk, hogy a lelet ne legyen tágabb, mint amit mértünk."*

**Nem volt zárva.** Az N08/N09 a `store.tx` BELÉPÉSÉNÉL avatkozik be; ott az olvasás visszaadta a
védett `price: 100` tartalmat, az ismétlés a sikeres nyugtát, és mindkettő kiadási sort írt. Az ok:
a saját próbám Y2/Y3 ága a megvonást a HÍVÁS ELŐTT végezte — azt a tranzakción KÍVÜLI ellenőrzés
úgyis elkapja. **Gyengébb esetet mértem, és az erősebb állítást írtam le** — miközben a mondat, amivel
a hatókör-fegyelmemet dicsértem, pontosan ezt a hibát fedte el. → **KUKA-094**.

### A második: az egyik feltételt lezártam, és a védelmet jelentettem késznek

Az R50-es nyugta-könyv védelmét egyetlen mondattal adtam ki („a fajták regisztere ZÁRT"). Négy eset
mutatta meg, mi maradt nyitva MEGENGEDETT fajtanév mellett: árva nyugta nem létező parancsra (N03) ·
második nyugta ugyanarra (N04) · idegen hatásazonosító és lehetetlen állapot (N05) · **nulla soros
beszúrás**, amitől a parancs véglegesült, a válasz sikert mondott, és nyugta sehol nem keletkezett
(N02). → **KUKA-095**.

### A javítások — öt csoport

**J1 · A kiadás engedélyezési pontja a tranzakción BELÜL** (N08 · N09). EGY nevezett feloldó
(`releaseAllowed`), amit MIND A HÁROM kiadó ág hív. A próba mind a három ága UGYANAZT a
tx-belépési beavatkozást kapja, és az olvasó ág a TARTALOM hiányát is méri, nem csak a hibakódot.

**J2 · A meghívó döntése a FRISS sorhoz kötve** (N10 · N11). A feltételek VÁLTOZTATHATATLANOK
(`inviteTerms`, INV-05): ha a döntés és az írás nem ugyanarra a példányra vonatkozik,
`invite_terms_changed` — nem zsákutca, a mondat megmondja, hogy új meghívó kell. A KIMENET a
tranzakción BELÜL számolódik újra; minden írás a friss sorból dolgozik. A régi alak a friss soron
ELLENŐRZÖTT, de a RÉGI példány `admin` szerepét ÍRTA.

**J3 · A nyugta invariánsai kikényszerítve** (N02–N05). SÉMA: idegen kulcs a parancs elsődleges
kulcsára + egyediség a (parancs × esemény) páron. ÍRÓ: csak a véglegesítés tranzakciójából; a
hatásazonosító és az állapot a PARANCS SAJÁT sorához mérve; a beszúrás PONTOSAN egy sort ír.

**J4 · A kiadás nyoma és két fogalmi pontosítás** (N12). Sikeres leltár-írás nélkül a védett
tartalom NEM adható ki (`DISCLOSURE_NOT_LEDGERED`, a tranzakció visszagördül). Mellé a mezőút
TÍPUSOS és ÜTKÖZÉSMENTES lett (`k:` kulcs · `i:` index · `~0`/`~1` védés): az `{"a.b":…}` és az
`{"a":{"b":…}}` többé nem képződik egy útra — ezt nyitott adósságként közöltük, ők megcáfolták,
mert a kár MAGÁBAN A LELTÁRBAN van (incidensnél nem lehetne megmondani, melyik adat jutott ki).

**J5 · A futás azonosítása** (M01). A szülő a VALÓBAN előállított (mutált) forrás-csomagból számolja
az elvárt lenyomatot, és minden gyermeknek EGYEDI futás-jelet oszt ki; eltérés vagy hiány =
MÉRŐHIBA. Két új hazugság-ellenpróba méri (H08 idegen lenyomat · H09 korábbi futás jele).

### Két fogalmi állításunkat ők helyesbítették, és igazuk volt

1. **„a tény SEHOL nem hagyott nyomot"** — TÚL ERŐS. A `command` sor a végleges állapotot MÁR
   rögzítette; az eseménykönyv ettől még hasznos, de KÜLÖN megnevezett szerződésként, nem egy nem
   létező hiány pótlásaként.
2. **A kiadási leltár NEM „KI LÁTOTT" bizonyosság, és NEM csak a kérés előtt is álló adatra
   vonatkozik.** Azt rögzíti, mit ENGEDETT KI a rendszer — a frissen SZÁMOLT, idegen árakat
   felhasználó összesítés is védett adatkiadás. Ha ezt nem mondjuk ki, a következő számolt nézet
   kicsúszik a leltár alól.

### A NORMATÍV MAG — kódban, nem prózában

Új: `v3ref/norms.mjs` (NRM-01). A megvonás protokollja **öt nevezett szabály** (REV-N1…N5), a
megmaradó szervezeti alap **három** (ORG-N1…N3), és **hat nyitott blokkoló** (OB-1…6). A regiszter
nem tud hazudni: `implemented` ⇒ NEVEZETT próba, ami a tervezett készletben SZEREPEL; `planned` ⇒
NEVEZETT hiány, legalább 40 karakter; minden blokkolóhoz INDOK és LEZÁRÁSI FELTÉTEL; padló a
darabszámokon. A futtató KAPUKÉNT futtatja — hamis állapotra 2-es kilépési kód.

**Az őszinte állapot, amit a regiszter kimond:** a nyolc szabályból **kettő** megépült (REV-N1,
ORG-N2), **hat** `planned`. Az ORG-N2 (tiltó alapértelmezés, amíg nincs explicit szervezeti alap)
nem hiányosság, hanem a hiányzó modell helyes kezelése.

### Mérés

| Mérés | Eredmény |
|---|---|
| A külső fél **R51-es tizennégy** esete | **14/14** |
| A külső fél **R49-es változatlan harminc** esete | **30/30** |
| V3 magreferencia próbák | **26/26 PASS** (24 → 26) |
| Mutációs battéria | **43/43 elkapva**, 0 túlélte, 0 mérőhiba, 0 elavult horgony |
| Hazugság-ellenpróbák | **8/8 védett** (6 → 8) |
| Retired-pattern regiszter | **151/151** |
| Teljes söprés | **6 zöld · 0 piros** |

### Kimondott korlátok

1. **A falóra a MI gépünkön mért szám: 11,8 mp** a 15 000 ms-os korlát mellett. A 43 mutációval a
   négyes párhuzamosság 15,1 mp-et adott — a korlát FÖLÖTT —, ezért négyszeres túlfoglalásra
   váltottunk (mérve: 4 mag → 15,1 · 8 → 14,3 · 12 → 12,6 · 16 → 11,1–11,8 mp, változatlan
   eredménnyel). A külső fél a saját gépén 1,7 mp-et mért; LASSABB gépen a korlát közelebb kerülhet.
2. A hat nyitott blokkoló (OB-1…6) a `norms.mjs`-ben áll, nem itt — hogy a következő kör ne a
   naplóból keresse elő.
3. **Az eredet-ellenőrzés korlátja kimondva:** ELAVULT és IDEGEN FORRÁSÚ csomag ellen véd, nem
   rosszindulat ellen. Egy futtató, ami a szülőtől kapott jelet visszaírja, ezen a kapun átmegy —
   ehhez kriptográfiai hitelesítés kellene, amit nem ígérünk.
4. Az N03–N05 belső írófelület-próbák: nem állítjuk, hogy egy távoli felhasználó ma közvetlenül
   hívhatná ezeket. A közös magfelület megbízhatóságát mérik, a rá épülő mini modulok számára.

---

## D-VS-3008 — A külső fél 30 ellenőrző esete: a hiányzó ŐRÖK megépítve, és a NYUGTA-SZERZŐDÉS

**Kör:** CMD-VS-300-002-001 R49→R50 · sáv: Claude-AUX · a külső fél független ellenőrzése az
R47-es javításunkra.

**A bemenet.** A külső fél a saját, VÁLTOZATLAN próbájával visszamérte az R47-et, és 30 ÚJ esetet
adott a javításaink VARRATAIRA. Ebből 19 bukott. Reprodukáltuk: **19/19, karakterre az ő
számaikkal** — vagyis a leletük megállt, nem kellett hozzá értelmezés.

**A kör legfontosabb megállapítása viszont a SAJÁT kezünkből jött.** A javítások átvezetése után a
saját battériánk 17/17 zöldet és 29/29 elkapott mutációt mutatott. Kísérletként **kitöröltük a
frissen beépített ötsoros véglegesítési kaput** — és a saját battériánk VÁLTOZATLANUL zöld maradt;
egyedül a KÜLSŐ próba esett 30/30-ról 28/30-ra. A kör legfontosabb javítását tehát semmi nem
őrizte a mi oldalunkon. A teljesség-vizsgálat ezután kimutatta: **a hét szükséges saját őrből hat
hiányzott.** → **KUKA-092**.

**A második megállapítás a külső féltől jött, és a mi R47-es INDOKUNKAT cáfolta meg.** Az R47-ben
azzal vezettük ki a befogadás kiadás-sorát, hogy a válasz „nem közöl új tényt": az `effect_id` a
hívó saját bemeneteinek lenyomata, a `state` állandó. Ez **téves**. Az `effect_id` valóban
levezethető, de az, hogy a parancs **VÉGLEGESÜLT-E**, nem a hívó bemenete — az a szerver oldalán
keletkezett új tény, és épp ezért hív a hívó egyáltalán. A `disclosure` sor elhagyása helyes volt
(a befogadás nem kiszolgálás), de a **helyére semmit nem tettünk**, ezért a véglegesítés
nyomtalan maradt. → **KUKA-093**.

### Amit a kör megépített

**1. NYUGTA-SZERZŐDÉS (R50).** Két kérdés, két otthon, de egyik sem üres:
* a `disclosure` arra felel, **KI LÁTOTT** olyan tartalmat, ami a kéréstől függetlenül is állt;
* az új `command_event` könyv arra, **MIT KÖTELEZETT EL a szerver** ebben a kérésben.

A nyugta ALAKJÁT egy feloldó adja (`commandReceipt`), amit a befogadás ÉS az ismétlés is hív —
a hívó a válasz alakjából nem tudja megkülönböztetni a két ágat, a `replayed` mondja meg
(KUKA-039). NYOMOT viszont csak ott hagyunk, ahol a szerver tényleg elkötelezett valamit: az
ismétlés semmit nem ír, tehát nyugta-sort sem szül. A sor a **hatással EGY tranzakcióban**
születik — ez a KUKA-026 ellenpárja: a kudarc nyoma nem utazhat a visszagördülő tranzakcióval,
a siker nyugtája viszont kötelezően azzal utazik, különben meg nem történt hatásról adnánk nyugtát.

**2. VÉGLEGESÍTÉSI KAPU A PARANCS-OLDALON.** A feloldás utáni jog-ellenőrzés a tranzakción KÍVÜL
állt, tehát csak azt zárta le, ami a `resolve()` alatt történt. Mérve: ha a megvonás a `store.tx`
HATÁRÁN következik be, a parancs `finalized` lett és a sor megszületett. Ugyanezt a három ágat
végigmérve az ISMÉTLÉS és az OLVASÁS **már zárva volt** (mindkettő `not_available`, nulla
leltár-sorral) — ezt kimondjuk, hogy a lelet ne legyen tágabb, mint amit mértünk.

**3. HAT ÚJ PRÓBA A HIÁNYZÓ ŐRÖK HELYÉRE** (`P-INVITE-finalize-gate` · `P-CMD-finalize-gate` ·
`P-AUTHZ-roles` · `P-CANON-shape` · `P-TIME-calendar` · `P-IDENTITY-address`), plusz a
`P-CMD-receipt` a nyugta-szerződésre. **24/24 PASS.**

**4. NYOLC ÚJ MUTÁCIÓ** (M31–M38), és az M15 ÚJRA-HORGONYOZVA. **37 mutáció · 37 elkapva · 0
túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony.**

### Amit a saját mérésünk talált a saját munkánkban, a kör közben

* **Az M15 TÚLÉLTE** az első futást — nem azért, mert a hiba nincs meg, hanem mert az új parancs-
  oldali kapu KÉTRÉTEGŰVÉ tette a védelmet, és egyetlen szerkesztés nem tudja kinyitni. A mutációt
  átírtuk: MINDKÉT réteget elveszi. Egy próba, ami nem tud pirosra váltani, nem bizonyít semmit.
* **Az `also` kulcs, amit kitaláltam, NEM LÉTEZETT.** Az M15 újra-horgonyzásához egy második
  szerkesztést egy `also` mezőbe írtam — a futtató viszont soha nem olvasta. Ez a **KUKA-016**
  visszatérése (kitalált mezőnév a regiszterben). Nem lett néma: a mutációs szerződés `SURVIVED`
  ítélete PIROS, tehát a saját eszközünk fogta meg. A helyére `edits` tömb került, EGY normalizálón
  át, MINDEN szerkesztés horgonyát külön mérve.
* **Az M31 TÚLÉLTE** — és ez a saját ÚJ próbám lyuka volt. A `P-INVITE-finalize-gate` három ága az
  ÓRÁT és a TAGSÁG-táblát mozgatta, amiket a kapu úgyis frissen olvas; egyik sem mérte, hogy a
  **MEGHÍVÓ SAJÁT SORÁT** is újra kell olvasni. Két új ág került be: a határon VISSZAVONT meghívó
  (elavult olvasással tagság születne — valódi jogsértés) és a határon KÖZBEN FELHASZNÁLT meghívó
  (elavult olvasással a válasz KIVÉTEL lenne a nevezett elutasítás helyett — KUKA-020).
* **A `P-TIME-calendar` első alakja TÚLKÖVETELT:** azonos indokot vártam a 13. hónapra és a
  február 30-ra. A 13. hónap már ALAKILAG sem időpont, a február 30. viszont szabályos alakú, csak
  nem létező nap — a megkülönböztetés TÖBBET mond, nem kevesebbet. A követelmény az én kitalált
  többletem volt, nem a joghatár része; javítva.

### Mérés

| Mérés | Eredmény |
|---|---|
| A külső fél VÁLTOZATLAN próbája (`check.mjs`, 30 eset) | **30/30** |
| V3 magreferencia próbák (`verify:v3ref`) | **24/24 PASS** |
| Mutációs battéria | **37/37 elkapva**, 0 túlélte, 0 mérőhiba, 0 elavult horgony |
| Hazugság-ellenpróbák (a mérő önmagán) | **6/6 védett** |
| KUKA-regiszter (`verify:kuka`) | **142/142** |
| Teljes söprés (`verify:sweep`) | **6 zöld · 0 env-kihagyás · 0 piros** |

### Kimondott korlátok — amit ez a kör NEM zárt le

1. **A falióra a MI gépünkön mért szám.** 37 mutáció, 4 mag: a mag-számhoz kötött párhuzamosság
   12,0 mp-et adott a külső fél 15 000 ms-os korlátja mellett. A plafon rossz volt: egy
   mutáció-futás nem telíti a magot (folyamat-indítás és modul-betöltés dominál), ezért kétszeres
   túlfoglalásra váltottunk — **9,9 mp, változatlan eredménnyel**. Lassabb gépen a korlát közelebb
   kerülhet; a futás ezért KIÍRJA a mért időt és a korlátot.
2. **A több-írós véglegesítési határ nincs megoldva.** A `node:sqlite` `BEGIN IMMEDIATE` egyetlen
   íróval dolgozik. Postgresen sor-zár vagy verzió-őr kell — ez tervezési adósság, nem elintézett
   kérdés.
3. **A megvonás VISSZAMENŐLEGES hatálya** nyitott: ma a megvonás előre hat, a már megszületett
   hatásokat nem érinti. Hogy ez helyes-e, üzleti döntés, nem technikai.
4. **A `releasedFieldPaths` pont-összefűzése kétértelmű**: az `a.b` nevű mező és az `a` alatti `b`
   ugyanazt az utat adja. Ma nem okoz kárt (a leltár nem kulcs), de nevesített adósság.
5. **A szigorúbb kiadási osztályozót NEM mértük vissza a V2 migrációs korpuszán.** A V3-ban NULLA
   `.sql` migráció van, tehát az a mérés ÜRES halmazon futott — semmit nem bizonyít. Ezt kimondjuk,
   nem hallgatjuk el.
6. **Q17 (műtermék-útvonal ütközése)** és a **bemeneti séma-regiszter** nyitott tételek.
7. **A Q09 „maradék önálló szervezeti alapja"** — a külső fél kérdése — nincs megválaszolva.

---

## D-VS-3007 — A tizenöt megnevezett maghiba javítva, a KÜLSŐ FÉL saját próbáján mérve

**Dátum:** 2026-09-10 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R46 → R47
**Rendelte:** az OPERÁTOR („mehet a Q01–Q15") · **A hibalistát adta:** a KÜLSŐ TÁRGYALÓ FÉL (R42 §3/2)

### 1. Mit mérünk, és miért a TI próbátokkal

A javítás bizonyítéka nem a saját próbánk zöldje. A saját próba a saját olvasatunkat igazolja
vissza (KUKA-054) — ezért a külső fél **változatlan** `challenge.mjs`-ét futtattuk a MAI forráson,
a `source/` alá bemásolt `v3ref/*.mjs` + `contracts/*` állománnyal.

| | R42 (`c58f5f6…`) | ma |
|---|---|---|
| tétel | 17 | 17 |
| **PASS** | **0** | **16** |
| FAIL | 17 | 1 (Q17) |
| ERROR | 0 | 0 |

A fixtúrájuk VÁLTOZATLANUL betöltődött, pedig a séma több ponton változott — tehát nem a mi új
alakunkra szabott próbát mértünk.

### 2. A tizenöt tétel — a javítás helye

| # | hol | mi lett belőle |
|---|---|---|
| Q01 | `command.mjs` · `commandScope` | az ismétlésvédelmi kulcs HATÓKÖRÖS: `(book_id, actor, idem_key)` az elsődleges kulcs; hiányos címre KIVÉTEL, nem néma szűkítés |
| Q02 · Q03 | `command.mjs` · `canonicalize`, `commandIdentity` | REKURZÍV kanonizálás minden szinten; az azonosság a típust ÉS a típus-verziót is lefedi |
| Q04 | `command.mjs` · `submitCommand` | a jog ÚJRA megkérdezve a `resolve()` UTÁN, az INSERT ELŐTT |
| Q05 · Q06 | `authz.mjs` · `instantMs`, `evidenceStandingAt` | a bizonyíték HÁROM tengelye külön: kor · HATÁLY (`valid_until` kötelező) · megvonás; ismeretlen mező nem nyelődik el |
| Q07 | `authz.mjs` · `OP_CLASSES` (Map) | az ÖRÖKÖLT név (`toString` · `constructor` · `__proto__`) nem talál profilt ⇒ fail-closed |
| Q08 | `authz.mjs` · `membershipEffectiveAt` | a tagság KÉT vége EGY feloldón — ugyanezt hívja a meghívó-oldal is |
| Q09 · Q10 · Q13 | `invite.mjs` · `inviteGrantAt`, `redeemShapeFor`, `membershipOutcome` | a kibocsátó MAI joga · az idegen alany őre · négy KÜLÖN tagság-kimenet |
| Q11 · Q12 | `invite.mjs` · `redeemInvite`, `store.tx` | a születés VALÓBAN fiókot hoz létre; minden írás EGY tranzakcióban |
| Q14 · Q15 | `store.mjs` séma + `command.mjs` · `disclose` | a kiadási sor saját azonosítót kapott (az időbélyeg nem azonosság); a feloldott TARTALOM kizárólag a leltározott OLVASÓ úton mehet ki |

Állandó jelek: **16 próba · mind PASS** · **27 mutáció · mind a NEVEZETT állításon elkapva** ·
6 állandó hazugság-ellenpróba · mind védett.

### 3. AMIT A SAJÁT TELJESSÉG-KRITIKÁNK TALÁLT — és a külső fél NEM

> **A LEJÁRT MEGHÍVÓ TAGSÁGOT ADOTT, HA AZ IDŐPONTJA ELTOLÁSOS ZÓNÁBAN ÁLLT.**

A régi kód SZÖVEGET hasonlított (`inv.expires_at <= clock.now()`). Mérve, az akkori ÉLŐ forráson:
`expires_at = '2026-09-09T09:00:00+02:00'` valósan **07:00Z**, az óra 08:00Z — tehát **LEJÁRT**;
szövegként viszont `'…T09…' > '…T08…'`, tehát „még nyitva". A beváltás lefutott, `shape: 'birth'`,
és **tagságot adott**.

Ez a saját KUKA-039-ünk („a fél őr"): a bizonyíték-oldalon bevezettük az `instantMs` feloldót, és a
meghívó-oldalra NEM vittük végig — egy körrel azután, hogy a szabályt idéztük. Javítva
(`inviteWindowAt`), állandó próba `P-INVITE-window`, mutáció **M21**.

### 4. A Q14 — ELŐSZÖR TÉVEDTÜNK, ÉS A SAJÁT MÉRÉSÜNK CÁFOLT MEG

Ezt a kört először azzal a mondattal zártuk volna, hogy *„a Q14 azért bukik, mert a külső fél Q14 és
Q15 elvárása ütközik"*. **Ez téves volt.** A cáfolat nem érvelésből jött, hanem abból, hogy a saját
állításunkat próbáltuk megbuktatni: a Q15 állítása `!r.resolved || count > 0`, tehát a BAL ág is
elég — arra nem gondoltunk. Négy alakon lemérve a külső fél KÉT állítását:

| alak | a beadás ad tartalmat? | leltároz? | sorok | Q14 | Q15 |
|---|---|---|---|---|---|
| **A** — az akkori alakunk | igen | igen | 3 | **FAIL** | PASS |
| **B** — nem ad, nem leltároz | nem | nem | 2 | **PASS** | PASS |
| **C** — nem ad, de leltározza az `effect_id`/`state`-et | nem | igen | 3 | **FAIL** | PASS |

Létezik tehát olyan alak, amiben MINDKETTŐ teljesül: az ütközés a MI tervezői döntésünkből eredt.

**A javítás mégsem a „B" lett** — nem a zöldhöz igazítottuk a kódot, hanem megkérdeztük, MIT TUD MEG
a hívó az egyes ágakon:

- **BEFOGADÁS:** az `effect_id` a hívó SAJÁT bemeneteinek lenyomata (`hash(book|actor|idem_key)`),
  a `state` ezen az ágon állandó — a hívó semmi olyat nem tud meg, amit ne ő adott volna. Ami nem
  közöl új tényt, arra leltár-sort írni zaj, nem védelem.
- **ISMÉTLÉS:** a válasz egy MÁR LÉTEZŐ parancs állapotát közli — ÚJ tény, marad leltározva.
- **A FELOLDOTT TARTALOM:** kiszolgálás, tehát KIZÁRÓLAG a leltározott olvasó úton mehet ki.
  A külső fél szavaival: a beadás válasza „ELŐKÉSZÍTVE", nem „KISZOLGÁLVA".

A `command_accept` kiadás-fajta ezért **kivezetve** — a szó is, nem csak a hívás: a `disclose`
ismeretlen fajtaként DOB rá, ha valaki visszatenné (KUKA-052, fail-closed).

**Ettől a tartalomnak EGYETLEN kijárata maradt** (korábban kettő) — tehát a javítás nem csak zöldre
vitte a Q14-et, hanem szigorúbb adatkiadási alakot is adott. Két mutáció őrzi mindkét irányt:
**M16** (a beadás megint kiszolgál, leltár nélkül) és **M27** (az ismétlés nyom nélkül közli egy
létező parancs állapotát) — mindkettő bizonyítottan PIROS.

**A TANULSÁG, amit magunkra nézve rögzítünk:** amikor egy KÜLSŐ próba bukik, és a magyarázatunk az,
hogy *a próba a hibás*, az a létező legönigazolóbb helyzet (KUKA-054 a saját védekezésünkön).
Ilyenkor nem magyarázni kell, hanem a SAJÁT állítást megcáfolni — itt ez történt, és a cáfolat nem
csak a tévedést mutatta meg, hanem egy jobb alakot is.

**Q17 — az egyetlen megmaradt FAIL, valódi és NYITOTT.** Két azonos hívás ugyanazt az útnevet adja.
Szándékosan nem javítva: az operátor a Q01–Q15-öt rendelte meg, és az R46-ban már visszavontuk a
korábbi „Q17 kész" állításunkat. Ez **kockázat, nem ütemezés**: amint a rendszer valódi állományokat
ír, két egyidejű futás felülírhatja egymást. A következő kör bemenete.

### 5. A FELÜLVIZSGÁLATOK MARADÉKAI — mondatonként, gépi őrrel

Az R42 hat próbához adott hatókörös ítéletet, és mindegyikhez **maradékot** írt, ami NÉV SZERINT
sorolta a Q01–Q15 ellenpéldákat. Ha csak annyit írnánk, hogy „javítva", a lap a mai kódról állítana
valótlant (KUKA-050) — a vallomást viszont nem írjuk át, mert az TÖRTÉNELEM (KUKA-062).

Ezért KÜLÖN rekord áll melléjük: `v3ref/reviews.mjs` → **`RESIDUAL_RESOLUTIONS`**. Mért mai állás:

**23 mondat · 15 próbával MÉRVE · 0 „javítva de méretlen" · 8 NYITOTT** — és a nyolc nyitott a
futtató képernyőjén NÉV SZERINT megjelenik (HTTP-réteg · fiókváltási út · belépés ·
csatornabizonyítás · MFA · `pending_intent` lejárat · a szándék-életút · a 24 óra mint
tesztparaméter).

**A lezárás nem lehet szó.** A `checkResolutions` a futtató INDÍTÁSAKOR fut, és négy irányban mér;
bizonyítottan piros mind a háromra, amit kipróbáltunk:

- kitalált mondat (nem szerepel a vallomás maradékában) → *„a mondat SZÓ SZERINT nem szerepel"*
- „mérve", de nem létező próbára → *„a megnevezett próba nincs a szerződésben"*
- néma lezárás, érdemi indok nélkül → *„az indok túl rövid"*

Mindkét irányban mér: amelyik vallomásnak van maradéka, ahhoz KELL bejegyzés (KUKA-039).

### 6. Egy maradék, amit ÚJRA megmértünk — és igazuk volt

Az R42 a P-A14-hez ezt írta: *„a megvonás → képviseleti lekérdezés kombináció külön hiányzik"*.
A tizenöt javítás után újra megnéztük: a kombinációt **semmi nem mérte**. A meglévő ág a BIZONYÍTÉK
megvonását nézte (`revoked: true`) — az MÁSIK tengely.

Pótolva: a `P-AUTHZ-evidence` utolsó ága visszavonja a TAGSÁGOT, majd hibátlan, friss megbízással
kérdez ⇒ `membership_revoked`. Új mutáció (**M26**) megcseréli a két ág sorrendjét, és
bizonyítottan pirosra viszi — mert a képviseleti ág `return`-öl, tehát a sorrend-csere NÉMÁN adna
`allowed: true`-t (KUKA-002: két tengely, és a sorrendjük a szabály).

### 7. Ami NEM történt meg — kimondva

- **A08 konkurencia** (R42 §3/3): valódi párhuzamos kapcsolatokkal. A Q04 determinisztikus
  ellenpróbája NEM helyettesíti.
- **A07 + A15** (§3/4) · **A06 · A05 · A01/A02 · A09 · A10** (§3/5) · **Q17** (4. pont).
- **Bemenet-séma-regiszter** — enélkül a Q02 „ismeretlen mező ELUTASÍTÁSA" fele nem teljesíthető.
  Ma az ismeretlen mező az AZONOSSÁGBA beleszámít (nem tűnik el), de nem tiltott.
- **A „megmaradó független szervezeti alap"** (Q09) nincs modellezve: ma a kibocsátó személyes
  joga az EGYETLEN alap.
- **Visszaállítási próba** ütemezve, az első éles adat ELŐTT; **migráció-ujjlenyomat** védett
  kiadási alapvonalhoz mérve. Mindkettő NEVESÍTETT függő.

### Gépi jelek

- `npm run verify:v3ref` — 16 próba + **27** mutáció + 6 hazugság-ellenpróba
- `npm run verify:sweep` — teljes söprés
- a maradék-őr a futtatóba van kötve (`checkResolutions`), tehát nem külön parancs: hibás
  maradék-tábla mellett a próbafutás **2-es kóddal** áll meg, mielőtt bármit mérne

---

## D-VS-3006 — A mérő ÖT további alakban hazudott, és a kiadási őr átengedte, amit elutasított

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R45 → R46
**Megtalálta: a KÜLSŐ TÁRGYALÓ FÉL** (R45 — ANALYSIS), 19 rögzített ellenpróbával.

### 1. A mérő: a Q18 javítása után ÖT testvér-alak maradt életben

A `71c69bb` forráson mérve, mind reprodukálva — a mérő „10 mutáció · 10 elkapva"-t írt ki és
**0-val zárt**:

| # | Támadás | Miért nyerte meg |
|---|---|---|
| **H02** | a mutáns indulása UTÁN `process.exit(86)`, JSON nélkül | az M5 `runtime_error` szerződése BÁRMILYEN kivételt elfogadott — a teljes futtató hibáját is |
| **H03** | egyetlen próba sem futott, csak `SKIP` rekordok a hat ismert azonosítóhoz | a `status !== 'PASS'` bármit „bukott állításnak" vett |
| **H04** | csak a BUKOTT rekordok a kimenetben | a hiányzó négy rekordot semmi nem nézte |
| **H05** | valódi JSON, de a futtató 86-tal lép ki | értelmezhető JSON mellett a rendellenes folyamat-kilépés elveszett |
| **H06** | idegen infrastruktúra-kivétel a nevezett próbán | a mérő nem nézte, hogy a MEGFELELŐ ÁLLÍTÁS bukott-e el |

**A közös gyökér:** a mérő a VÁRT PRÓBAKÉSZLETET a FUTÁS EREDMÉNYÉBŐL olvasta ki — vagyis
**a mért féltől kérdezte meg, mit kellett volna mérnie** (KUKA-054 a mérő-eszközön). A saját,
egy körrel korábbi Q18-kapunk mind az ötben ZÖLD maradt, mert azt mérte, VAN-E JSON, nem azt,
hogy ÉRVÉNYES-E A MÉRÉS. **KUKA-090.**

### 2. A javítás: előbb érvényes mérés, utána ítélet

1. **A várt készlet KÜLSŐ szerződés** — `v3ref/manifest.mjs`: nevezett próbák + a hozzájuk tartozó
   ÁLLÍTÁS azonosítója. Hiányzó · ismétlődő · ISMERETLEN azonosító egyaránt mérőhiba.
2. **Típusos kimenetek** — `PASS` · `FAIL` (nevezett állítás) · `THREW` (hibakód + fázis) · `SKIP` ·
   `NOT_STARTED`. Bizonyíték CSAK a `FAIL`.
3. **A kilépési kód szerződés** (0 vagy 1), és az eredménnyel való ellentmondása mérőhiba.
4. **A `runtime_error` SZŰKÍTVE** — csak a próbán BELÜLI, ELŐRE megnevezett hibakódú és fázisú
   kivétel. Az M5 szerződése mostantól `ERR_SQLITE_ERROR` · `probe_body`, **mérésből**.
5. **Az elkapáshoz a NEVEZETT ÁLLÍTÁS kell** (`assertion_id`), nem elég, hogy „valami történt".
6. **HAT állandó hazugság-ellenpróba** minden futáskor (Q18 · H03 · H04 · H05 · H06 · H0X), és
   mindegyiknél MINDKÉT szerződés alatt tilos az elkapás.

**Mérve:** 6/6 ellenpróba védett · 10/10 mutáció a NEVEZETT ÁLLÍTÁSSAL elkapva · visszacsúszásra
bizonyítottan piros (az M5 hibakódját átírva → `WRONG_CATCHER`, kilépési kód 1).

### 3. Q16: a javítás eljutott az osztályozóig, a fogyasztójáig nem

Az előző kör az OSZTÁLYOZÓT javította — az azóta helyesen mond `data_change, ok:false`-t a
`TRUNCATE TABLE partner`-re. **De a teljes kiadási őr csak a `contract` csoport elutasítását
nézte**, tehát egy tábla-ürítés mellett **27/27 PASS, exit 0**.

**Ez PONTOSAN a mai `docs:html` lelet osztálya** (D-VS-3004): a darab ép volt, a VISZONY halott
(KUKA-024). A külső fél maga is így nevezte meg. Javítva: **minden megvizsgált migráció MINDEN
elutasítása megállítja a teljes ellenőrzést**, és a mondat megnevezi a fájlt, a besorolást és az
indokot (KUKA-064).

### 4. És a besorolás JELENTÉSE — öt további lelet

| # | Alak | Volt | Lett |
|---|---|---|---|
| **L03** | `ADD CONSTRAINT … CHECK … NOT VALID` | `expand, ok:true` | `restrictive, ok:false` |
| **L04** | `CREATE UNIQUE INDEX` | `expand, ok:true` | `restrictive, ok:false` |
| **L05** | `ADD COLUMN … NOT NULL` | `expand, ok:true` | `restrictive, ok:false` |
| **L06** | vegyes fájl: `DROP` + `UPDATE` | `data_change, ok:true`, a kivezetés ELVESZETT | mindkét kötelem külön, `ok:false` fejléc nélkül |
| **L07** | `-- BESOROLÁS: expand` egy `SELECT 1` fölött | elutasítva, UGYANAZT a fejlécet kérve | `unknown` besorolással átmegy — az ajánlott folytatás MŰKÖDIK |

**A SAJÁT FIXTÚRÁM INDOKLÁSA VOLT HAMIS.** A régi sor azt állította, hogy a `NOT VALID` megszorítás
„a régi írókat nem zárja ki". A PostgreSQL szerint a `NOT VALID` csak a MEGLÉVŐ sorok
végigellenőrzését halasztja el — az ÚJ beszúrást a feltétel MÁR korlátozza. A fixtúra tehát egy
hamis állítást őrzött zölden (**KUKA-068**: a pin védte a hibát).

Az L03–L05 nem TILTOTT: csak nem BIZONYÍTOTTAN ártalmatlan. Saját alakot kaptak (`restrictive`), és
a szerzőnek ki kell mondania, hogyan marad kompatibilis a régi író. Az L06 tanulsága, hogy **a
kötelmek ÖSSZEADÓDNAK, nem versenyeznek**: egy adatváltozási indoklás nem helyettesít kivezetést.

### 5. P01: a bemondott commit nem forrás-azonosság

A külső fél a ténylegesen `71c69bb`-n futó programnak a RÉGI `c58f5f6` commitot adta át
`--source-commit`-ként, és a kimenet ezt „a mai forrásra érvényes"-nek mondta. **A bemondott commit
puszta ÁLLÍTÁS** (KUKA-056 a forráson). Javítva: a futtató KISZÁMOLJA a saját forrás-csomagja
tartalmi lenyomatát (`source_digest`), és a bemondott érték külön, `declared_source_commit` néven
áll. Mellé `run_id` — két futás eredménye ne legyen összekeverhető.

### 6. Amit a külső fél a SAJÁT állításaimból cáfolt meg

- **„az UTC-időpont még nincs"** — HAMIS volt; a rekord `at` mezője már akkor is UTC-ben állt.
- **„Q16, Q17, Q18 kész"** — ebben az általános alakban nem tartható (lásd fent).
- **„a mini modulok a 4. pont után indulhatnak"** — nem: az 5. pont esetei a mag HATÁRÁT érintik.
- **„adatbázis nélkül fut"** — pontatlan: elkülönített SQLite-ot használ.
- **„a PITR-rel a legrosszabb eset másodpercek"** — a szolgáltatás LEÍRT képessége, nem mért
  garancia; vállalássá visszaállítási próbával válik.

Mind az öt átvezetve a lapokon (KUKA-050: a szöveg a valóságot követi).

### 7. Gépi jelek

`npm run verify:v3ref` (6 próba + 6 hazugság-ellenpróba + 10 mutáció) · `verify:release-order`
**35/35** (nyolc új fixtúrával) · `verify:kuka` (90 tanulság, mind otthonnal) · `verify:sweep`
6/6 zöld. **Nyitva marad:** a Q01–Q15 magviselkedés — az a következő kör, most már a helyesbített
mérővel.

## D-VS-3005 — A blokk-határ 700 → 3000: a V2 egy héten belül elfogyott volna

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R45
**Megtalálta: az OPERÁTOR** — *„biztos hogy jó, hogy 700-tól már a v3 van? hova mennek majd a v2-nek
a maradék apró dolgai?"*

### A lelet — mérve, nem tippelve

A D-VS-3000 a V3-nak a **700-as** blokkot adta. A kérdésre elvégzett mérés (a V2 repó git-történetéből,
`DECISION_LOG.md` a `main` egymást követő állapotain):

| dátum | legmagasabb D-VS | Δ | ütem |
|---|---|---|---|
| 2026-08-18 | 433 | — | — |
| 2026-08-22 | 520 | +87 | 21,8 / nap |
| 2026-08-26 | 577 | +57 | 14,3 / nap |
| 2026-08-30 | 607 | +30 | 7,5 / nap |
| 2026-09-03 | 642 | +35 | 8,8 / nap |
| 2026-09-06 | 659 | +17 | 5,7 / nap |
| 2026-09-09 | 670 | +11 | 3,7 / nap |

**237 szám 22 nap alatt (~10,8/nap), a mai ütem 3,7/nap.** A V2-nek a 700-as határig **29** száma
maradt — vagyis a mai, leglassabb ütemen is **kb. egy hét**, az átlagon **három nap**.

És a V2 nem áll le. Az operátor kimondta: a Claude-DEV sávval folytatódik minden, ami nem érinti
erősen a jogosultságot; a folyamatok maradnak, amíg alapszinten működnek; három cégtér használja a
KS kiváltására; a **Shoprenter-szinkron még nem működik**. Tehát nem „pár apró dolog" jön még.

### Miért ez a legrosszabb fajta hiba

A túlcsordulás **NÉMA lett volna**: a V2 kiadja a D-VS-700-at, a V3 is — és a `D-VS-…` onnantól
két különböző döntést jelöl, két repóban, visszamenőleg javíthatatlanul (a szám kódba, KUKA-
bejegyzésekbe, board-körökbe és képernyőkre is beég). Ez a **KUKA-045** alakja a névtéren: a kézzel
léptetett határ nem szabály, hanem tipp a jövőről — és a tévedése nem jelez.

### A javítás

**A V3 blokkja 3000-től.** A meglévő öt bejegyzés átszámozva: D-VS-700…704 → **D-VS-3000…5004**
(11 fájlban, minden hivatkozással együtt — egy napos, öt bejegyzés, ez volt a legolcsóbb pillanat).

**A határ mérésből számolt fedezet:** 3000 − 671 = **2329 szabad szám** a V2-nek, ami a MÉRT
leggyorsabb ütemen (10,8/nap) is 215 nap, a mai ütemen (3,7/nap) másfél év. A V2 ennél hamarabb
nyugdíjba megy — és ha mégsem, a V2 őre 250 szabad szám alatt FIGYELMEZTET, jóval a baj előtt.

### A HATÁR A REPÓÉ, NEM A VERZIÓÉ — az operátor javaslata, egy pontosítással

Operátori kérdés: *„»3000« a v3-ból kiindulva? majd 4000 a v4-től?"* — **a 3000-et átvettem, a
verziónkénti blokkot NEM.** A különbség:

- **A szám a REPÓT jelöli, nem a verziót.** A 3000 ma emlékeztet a V3-ra, és ez kényelmes — de a
  jelentése az, hogy *ezt a blokkot a `valach-system` repó naplója osztja*, **felső határ nélkül**.
- **Miért nem 4000 a V4-től:** mert a V4 UGYANEBBEN a repóban születne. A repó neve szándékosan
  verzió-semleges (D-VS-3000: a verzió git-CÍMKE, nem név), tehát a V3→V4 váltás nem repó-váltás.
  Ha a szám verzió szerint hasadna, EGY repó naplója két blokkra esne, és a számból többé nem
  lehetne megmondani, melyik RENDSZERRŐL beszél — épp az a kétértelműség jönne vissza, amit most
  szüntetünk meg (**KUKA-061**: új név = új fogalom, akkor is, ha nem akartuk).
- **Nem is fogy el:** a blokk felfelé nyitott, tehát a V4 egyszerűen folytatja (3xxx → 4xxx → …)
  ugyanabban a naplóban. Új blokk-határ csak ÚJ REPÓNÁL kell — akkor a következő szabad ezresnél.

**Amit NEM választottunk, és miért:** külön előtag (`D-V3-…`). Az soha nem ütközne, de ugyanabba a
csapdába lép: a VERZIÓT tenné egy állandó azonosítóba.

### Gépi jel — MINDKÉT repóban, és a fogyás LÁTSZIK

- **V3:** `verify:decision-numbers` **DNR03** — minden szám `>= 3000`.
- **V2:** `verify:decision-numbers` **DNR04** (ÚJ) — minden szám `< 3000`. **Eddig NEM volt felső
  határ ezen az oldalon**, tehát a V2 vidáman átlépett volna a V3 blokkjába. Visszacsúszásra mérve:
  egy `D-VS-3001` fejléc a V2 naplójában → `3/4 PASS — 1 FAIL`.
- **És a némaság ellen:** a V2 őre minden futáskor **kiírja a maradék szabad helyet**, és 250 alatt
  FIGYELMEZTET a teendővel. A blokk elfogyása így rendszer-állapot, nem egy `.md`-ben álló mondat
  (KUKA-019) — jóval a baj előtt megszólal, nem akkor, amikor már késő.

## D-VS-3004 — A `docs:html` a repó megnyitása óta NULLA lapot készített, és sikert jelentett

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R44
**Megtalálta:** a saját munkám — az operátornak szánt állapot-lap készítésekor futtattam a parancsot.

### A lelet

A `package.json` `docs:html` sora `--all` kapcsolót adott át; az eszköz a `--mind`-ot ismeri.
A kapcsoló nem egyezett, tehát a cél-lista ÜRES maradt, és a parancs ezt írta ki:

```
0 lap elkészült ide: docs/_olvashato/
```

— **nulla kilépési kóddal**, „Nyisd meg dupla kattintással" zárómondattal. Tehát a repó megnyitása
óta (D-VS-3000) **egyetlen olvasható lap sem készült**, miközben a parancs sikeresnek látszott. És
pont ez az a parancs, ami az operátor EGYETLEN olvasható alakját állítja elő (KUKA-079).

### Miért nem fogta meg a söprés

A `verify:doc-html` DHT06 tétele azt mérte, hogy a `docs:html` sor **hivatkozik-e** az eszközre
(`.includes('vs_doc_html.mjs')`). Ez igaz volt. A **viszonyt** — hogy a leírt parancs tényleg
készít-e lapot — semmi nem mérte (**KUKA-024**: két hibátlan oldal együtt is lehet halott lánc).

### A hiba osztálya: KUKA-036, visszatérve — a saját nyitó csomagomban

Réteg-határon átmenő azonosítót (itt: egy kapcsoló nevét) **emlékezetből** írtam a `package.json`-ba,
ahelyett hogy az eszköztől kérdeztem volna meg. A néma siker pedig **KUKA-012 · KUKA-041**: az üres
eredmény sikerként jelentve. A regiszter KUKA-036 bejegyzése kiegészítve, VISSZATÉRT jelöléssel.

### A javítás — három darab, mind kell

1. **A kapcsoló-lista EGY otthonban, exportálva:** `ALL_FLAGS` a `tools/vs_doc_html.mjs`-ben.
   A `package.json` értékét a pin EHHEZ méri, nem egy második, kézi másolathoz (KUKA-018).
2. **Több írásmód elismerve** (`--mind` · `--all`) — egy be/ki kapcsoló ne EGYETLEN titkos írásmódot
   ismerjen el (**KUKA-014**); a feloldó egy, a nevek többen lehetnek.
3. **A NULLA lap PIROS**, mondattal, ami kiírja a helyes hívást és a kapott kapcsolókat — nem
   zsákutca (**KUKA-064**).

### Gépi jel

`npm run verify:doc-html` **DHT07**: a pin **LEFUTTATJA** a `package.json`-ban álló `docs:html`
parancsot, és lapokat követel (**padló 1**); mellé ellenpróba: ismeretlen kapcsolóval az eszköznek
**1-gyel** kell zárnia. **Visszacsúszásra mérve piros** — a `--minden` alakkal a DHT07 FAIL, a
söprés piros. A pin ma 9/9, a söprés 6/6.

---

## D-VS-3003 — A repó-terv három kérdése lezárva: a PITR BE VAN KAPCSOLVA

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R44
**Forrás:** operátori válasz — *„a pitr engedélyezve van a railway / valach-family projects /
valach-system -ben"*

### A három kérdés (V3_REPO_ES_UZEM_TERV.md §7) — mind megválaszolva

| # | Kérdés | Operátori válasz |
|---|---|---|
| 1 | A repó neve | **`valach-family/valach-system`** — *„ok, valach-system mehet"* |
| 2 | Három környezet (éles · teszt · demo mint cégtér a tesztben) | **rendben** — *„a három környezet is jó"* |
| 3 | Be van-e kapcsolva az időpontra visszaállítás (PITR) | **IGEN**, a `valach-system` projekten |

### Amit a 3. válasz eldönt — és amit NEM

**Eldönti a legrosszabb esetet:** a maximális adatvesztés **másodperc-nagyságrend**, nem az utolsó
mentésig terjedő akár 24 óra. Ez a repó-terv §4-ének első száma, és eddig nyitva állt.

**NEM dönti el a visszaállítás rendjét, és ezt ki kell mondani** (KUKA-050 — a szöveg a valóságot
kövesse, a képesség megléte nem eljárás): a bekapcsolt PITR **nem** teszi a visszaállítást első
eszközzé. A §4 szabálya változatlan: *a rossz kiadást a KÓD visszagörgetése javítja, nem az adatbázis
visszaállítása* — a visszaállítás a mentési pont óta született MINDEN valódi munkát eldobná.
A PITR a végső háló, három nevesített esetre: valódi adat-sérülés · téves tömeges törlés · olyan
romlás, amit célzott javító-esemény nem tud helyrehozni.

**És a képesség megléte nem bizonyíték arra, hogy működik** (KUKA-038). A `backups`/PITR-út egyetlen
érvényes bizonyítéka egy lefuttatott visszaállítás. **Nevesített függő:** az első éles adat előtt
ütemezett visszaállítás-gyakorlat, a V2-ből átemelt eszközzel. Amíg ez nem futott le, a
visszaállítási képességet sehol nem jelentjük késznek.

### Gépi jel

Ezen a körön **nincs új gépi jel, és ez kimondott**: a PITR a Railway szolgáltatás-beállítása, a
repó kódjából nem mérhető. A jel akkor születik meg, amikor az első visszaállítás-gyakorlat lefut —
a kimenete a `var/reports/` alá, a névszabály szerint.

---

## D-VS-3002 — A mérőműszer hazudott: a Q18 reprodukálva és lezárva

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R42 → R43
**Forrás:** a külső tárgyaló fél független ellenőrzése (R42 — ANALYSIS), 17 kiegészítő eset.

### 1. A lelet, ami mindent megelőz

A külső fél a `run.mjs` helyére azonnal 86-tal kilépő programot tett — se JSON, se lefutott próba.
A `mutate.mjs` erre **„10 mutáció · 10 elkapva"**-t írt ki és **0-val zárt**. **Reprodukáltam.**

Egy sor okozta: `catch { failed = ['(a futás összeomlott)']; }` — a JSON-hibát BIZONYÍTÉKNAK
számolta. Mellette a `wrongCatcher` ki volt számolva, de a kilépési feltétel nem használta.

**Ez a KUKA-051/089 a mérő-eszközön** — a lehető legrosszabb helyen: ha a mérő zöldet mond a
semmire, minden rá hivatkozó bizonyíték nem gyengébb, hanem **hamis**. Az R33 „10/10 mutáció
elkapva" állítása ezért nem az volt, aminek jelentettem; visszamenőleg nem hitelesítem.

### 2. A javítás

Öt ítélet (`CAUGHT` · `WRONG_CATCHER` · `SURVIVED` · `HARNESS_ERROR` · `STALE_ANCHOR`), és minden
nem-`CAUGHT` piros. A hiba SOHA nem észlelés. A **megnevezett** próbának kell buknia. Futásidejű
kivétel csak akkor bizonyíték, ha a mutáció szerződése előre kimondja — és a kimenet kiírja, hogy a
bizonyíték ereje korlátozott.

**És a lényeg: két ÁLLANDÓ kapu minden futáskor** — (a) az alapvonal zöld-e, (b) a **Q18-ellenpróba**:
egy szándékosan elrontott futtatót `HARNESS_ERROR`-nak kell minősíteni. A (b) minden futásnál
elvégzi a külső fél támadását a saját kódunkon. Ez az egyetlen dolog, amitől a többi számnak értéke
van.

**Bizonyítva:** a Q18-támadás a javított mérőn → alapvonal-kapu piros, a mutációk **nem futnak**,
kilépési kód 1. Az M6 elkapóját `P-A08`-ra írva → `WRONG_CATCHER`, kilépési kód 1.

### 3. Három további, ugyanebből a pontból

- **`v3ref:evidence` nem létezett**, pedig az R33 rá hivatkozott — nem létező futtatóra hivatkozó
  riport (KUKA-011/038 osztálya). Felvéve.
- **`executed_by: 'Claude-AUX'` beégetve** — a rekord akkor is a mi nevünket vitte, amikor a külső
  fél futtatta a saját gépén: a bizonyíték a végrehajtójáról hazudott (KUKA-056). Most
  `--executed-by=` / env / kimondott `unknown`.
- **A hatókör nélküli `verified_by`** üresen marad; helyette próbánkénti, hatókörös rekordok
  (`v3ref/reviews.mjs`) **`residual` mezővel** és `gate_closed: false`-szal, a forrás-committhoz
  kötve — az elévülés kimondva (KUKA-041 · KUKA-050).

### 4. És három lelet a SAJÁT, EGY KÖRREL KORÁBBI őreimben

Nem a külső fél sorrendjének 2. pontja, hanem **hamis biztonságot állítottak** — ezért nem vártak:

- **Q16:** a kiadási menetrend őre KIZÁRÓ felsorolással dolgozott, ezért a `TRUNCATE`, a
  `DROP legacy_code` (a `COLUMN` szó a Postgresben **opcionális**), az azonnal érvényesített `CHECK`
  és a `DELETE` mind **`expand, ok:true`** választ kapott. Most **megengedő szabály** (KUKA-057):
  `expand` · `contract` · `data_change` · `unknown`, és csak az ismert-biztonságos megy át magától.
  Kimondva a kódban: **az őr előszűrő, nem SQL-értelmező.**
- **SemVer:** `3.1.0-alpha` és `3.1.0` között 0-t adott, és elfogadta a `03.1.0` alakot. Szigorú
  parse + előkiadás-rendezés (semver.org 11.4).
- **`artifactNaming`:** `area:'toString'` → `undefined/…` út (örökölt kulcs), perjeles „verzió" →
  útvonal-részek a névben. Sajátkulcs-ellenőrzés + szigorú verzió-alak.

**Mind a hat új viselkedés FIXTÚRÁVAL őrizve** — hogy ne ismétlődjön a Q16 osztálya: új ág, mérés
nélkül. `verify:release-order` 27/27 · `verify:artifact-naming` 28/28.

### 5. Ami NEM történt meg — kimondva

- **Az R42 §3 2–5. pontja el sem kezdődött** (Q01–Q15 magviselkedés · A08 konkurencia · A07+A15 ·
  a többi core-eset). Szándékosan: a mérő hibás volt, tehát bármilyen „a mutáció megfogja" állítás
  addig értéktelen lett volna.
- **Q17 valódi íróra** (futásazonosító + atomi létrehozás) — ilyen író ma nincs; a helye az elsőnél.
- **A gépi bizonyíték teljes mezőkészlete** részben van meg: UTC-időpont, futásazonosító és tartalmi
  lenyomat még **nincs**.
- **Egyetlen kapu sem billent át.** A G4/G5/G6 nyitva marad.

## D-VS-3001 — A generált fájlok neve és helye: `v3_v3.1.1_20260909_104201_…` a `var/` alatt

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX
**Operátori parancs:** *„Az újra generálódó fileok (script logok, backupok) a következő file néven
legyenek: v3_v3.1.1_20260909_104201_… A könyvtárstuktúra nagyjából már jó volt a v2-ben is, de nézd
át azért, és ezek alapján készüljön minden."*

### 1. A V2 átnézése — három lelet, mérve

| Lelet | Mért adat |
|---|---|
| **Szétszórt otthon** | a generált kimenet **kilenc** helyre ment: `backups/` · `runtime_logs/` · `test_logs/` · `test-results/` · `audit_out/` · `i18n_munka/` · `i18n_atiras/` · `logs/` · `tmp/` — mindegyik külön alkalommal, külön `.gitignore`-sorral (KUKA-018 · KUKA-003) |
| **`undefined/`** | egy elrontott út `undefined` nevű könyvtárat hozott létre — és az **KÖVETETT** a gitben, **3 PNG-vel**. Nem gitignore-olva, tehát a hiba be is került a repóba |
| **40 kézzel gyártott név** | 40 szerszám épít időbélyeges fájlnevet kézzel, legalább **három** különböző alakban (`toISOString().slice(0,19).replace(/[:T]/g,'')` · `.replace(/[-:T]/g,'').slice(0,12)` · `.slice(0,10)`) — egy fogalom, negyven másolat, három nyelvjárás |

Az operátor „nagyjából jó volt" ítélete pontos: a **szerkezet** helyes (a generált kimenet a
forráson kívül, gitignore-olva), a **darabszám** és a **kézi névgyártás** a gyenge pont.

### 2. A döntés

- **A NÉV:** `v3_v3.1.1_20260909_104201_<mit>.<kiterjesztés>` — pontosan az operátor kérése szerint.
  Nevet **soha nem gépelünk**: `artifactPath({ area, kind, ext, version })`
  (`contracts/artifactNaming.js`, REL-01 mintájára nevezett feloldó).
- **A verzió a `package.json`-ból jön**, nem emlékezetből (KUKA-005 · KUKA-033).
- **Az idő a gép HELYI ideje**, nem UTC — a fájlnevet ember olvassa a saját gépén, és a 12:42-kor
  készült mentés ne „10:42"-t mondjon. Felhőben futtatva ez UTC lesz: a fájl a **keletkezés helyének**
  idejét viseli, és ez ki van mondva.
- **A HELY:** minden generált kimenet a **`var/`** alá, öt nevezett területre (`logs` · `backups` ·
  `reports` · `exports` · `tmp`). A `var/` gitignore-olva; egyetlen kivétel a `var/README.md`, hogy a
  szerkezet **látsszon** — különben egy új kör nem tudná, hova írjon (KUKA-011).
- **Kivétel, kimondva:** a `docs/_olvashato/` marad a helyén — a forrása mellett él, és az operátori
  terminál-blokk erre az útra hivatkozik.

### 3. Amit a saját őröm cáfolt meg — a `v3_` előtag indoka

Az első alakban azt írtam a kódba, hogy az előtag azért kell, mert így „a v4 nem kerül a v3.9 és a
v3.10 közé". **A saját mérésem cáfolta meg:**

```
ELŐTAGGAL     → v3_v3.10.0_…   v3_v3.9.0_…   v4_v4.0.0_…
ELŐTAG NÉLKÜL →    v3.10.0_…      v3.9.0_…      v4.0.0_…
```

A `3.10` **mindkét** alakban a `3.9` elé kerül (ábécé-rendben `1` < `9`), és a v4 **mindkét** alakban
a végén áll. **Az előtag tehát nem rendez.** Ami rendez: a fix szélességű **dátum+idő** — egy vonalon
belül az ábécé-rend pontosan idő-rend. A verzió a névben **származás** (melyik kiadás írta — ez kell
a visszaállításhoz, `VERSIONING.md` 5.), nem rendezési kulcs.

Az előtag marad, mert az operátor így kérte és a szemnek segít — de **hamis indoklással nem**
(KUKA-033: a levezetett állítás a méréséig csak javaslat). Az ART06 önpróba most az **ellenpárt** is
méri, tehát a helyes állítás gépi úton áll.

### 4. Gépi jel

`npm run verify:artifact-naming` — **ART01–ART07, 25 ellenőrzés**:

- **ART01** a feloldó **karakterre** az operátor mintáját adja (fixtúrákon, a mai verzióval is)
- **ART02** verzió/megnevezés/terület hiányára **MONDATTAL** áll meg, és a terület-hiba **felsorolja**
  a választhatókat (KUKA-064) — nem néma tartalék-érték (KUKA-020)
- **ART03** a területek zárt halmaza mind a `var/` alatt, mind érdemi magyarázattal; az üzleti adatot
  hordozók **ki vannak mondva**
- **ART04** a `var/` gitignore-olva, a `var/README.md` mégis látszik, és **minden területet felsorol**
  (a lap nem csúszhat el a kódtól — KUKA-018)
- **ART05** egyetlen szerszám sem gyárt kézzel időbélyeges nevet — **bizonyítottan tüzel**: egy
  V2-alakú fájlt bemásolva a próba PIROSRA vált, majd eltávolítva visszazöldül
- **ART06** önpróba a rendezésre **és az ellenpárra** (lásd a 3. pontot)
- **ART07** a név visszafejthető (melyik kiadás írta, mikor), és idegen alakra **nem** ad hamis
  eredményt

### 5. Ami NEM történt meg — kimondva

- **A V2-t nem alakítottam át.** A hatókör-szabály (D-VS-667) érvényben van: ott csak az épül, ami a
  következő hónapokhoz kell. A `undefined/` könyvtár és a 40 kézi névgyártás **a V2-ben marad**;
  jelentve az operátornak, javítás külön döntésre.
- **Nincs még olyan szerszám, ami ténylegesen ír** a `var/` alá — a szabály előbb áll, mint az első
  írója. Ezt az ART05 „a mérés nem üres" padlója és a `var/README.md` mondja ki, nem hallgatja el.

---

## D-VS-3000 — A V3 repó megnyitása: `valach-family/valach-system`

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Operátori jóváhagyás:** *„ok, valach-system mehet,
a három környezet is jó"*

### A döntés

1. **A repó neve verzió-semleges: `valach-family/valach-system`.** A verzió CÍMKE a git-történetben
   (`v3.0.0`, `v3.1.0`, `v4.0.0`), nem repó-név és nem mappa. Nem lesz `vs4`.
2. **A V2 a saját nevén él tovább** (`valach-family/vs`). Nem költöztetjük, nem nevezzük át.
3. **Három környezet egy Railway-projektben:** production · staging · **demo mint CÉGTÉR a
   stagingben** (nem negyedik adatbázis).
4. **A fejlesztői és a teszt-tároló nem a felhőben van** — a magreferencia saját, eldobható
   fájl-tárolón fut, tehát az automata ellenőrzés nem függ a felhőtől.
5. **Kiadási menetrend:** egy `main`, semver címkék, `release/3.x` csak szükség esetén; migráció
   előrefelé, számozva, merge után érinthetetlenül; **bővítés → átállás → szűkítés három külön
   kiadásban**, a bontás soha nem eshet egybe azzal a kiadással, amelyben a kód abbahagyta a
   használatot.
6. **A rossz kiadást a KÓD visszagörgetése javítja, nem adatbázis-visszaállítás.**
7. **A D-VS számozás a V3-ban a 700-as blokkból megy.**

### Miért így — és mi volt a saját hibám

Az előző körben **én a `vs3` nevet ajánlottam. Ez hibás volt**, és az operátor kérdése mutatta meg,
miért: ha a repó neve verziószámot hordoz, a v4-nél `vs4` kellene, és az egész memória-, eszköz- és
board-gépezetet újra át kellene költöztetni — pontosan az a probléma ismétlődne, ami miatt egyáltalán
gondolkodunk.

**A javaslat nem új fogalmat vezetett be, és ezt mérve mondtuk ki**, nem emlékezetből: a V2 repó
`package.json`-ja már ma is `"name": "valach-system"` / `"version": "2.0.0-alpha"` — a termék neve és
a verzió már ott is külön mezőben állt. Csak a GitHub-repó neve (`vs`) csúszott el ettől.

### Mit hozott át a nyitó csomag, és mit NEM

| Átjött | Miért |
|---|---|
| `CLAUDE.md` (aktív memória) + a **89 KUKA-tanulság** | a tanulság nem verzió-függő |
| a lap-eszközök (`vs_doc_html`, `vs_verify_doc_html`) | az operátor nem tud `.md`-t megnyitni (KUKA-079) |
| a board-eszközök (`vs_board_doc`, `vs_board_round`) | hogy a tárgyalás ne szakadjon meg |
| a **magreferencia** (`v3ref/`) + a mutációs próbapad | a V3 mag-szabályai már futnak, adatbázis nélkül |
| a söprés (`verify:sweep`) | az első naptól, akkor is, ha kevés ellenőrzővel indul |

**NEM jött át** a V2 alkalmazás-kódja, sémája, üzleti adata és a 700 alatti döntés-napló.

### A csapda, amit külön kezelni kellett

A 89 tanulság átjött — a hozzájuk tartozó **gépi jelek 85-e viszont a V2 fájljaira mutat**. Nem
létező fájlon a tiltó-minta nem talál semmit, tehát **zöldnek látszana**: a védelem meglévőnek
tűnne, holott nincs (KUKA-051 · KUKA-041). Ezért minden bejegyzésnek **kimondott őr-otthona** van
(`contracts/guardHome.js`: `v3` / `vs` / `none`), a `verify:kuka` a listát **kiírja**, a deklarációt
**mindkét irányban visszaméri** (egy `v3`-nak jelölt bejegyzés cél-fájljának tényleg itt kell lennie;
egy `vs`-nek jelölt jel tényleg nem futtatható itt), és a `vs` szám **padló**: csökkenhet, nőni nem.

Mérve ma: **`v3` 2 · `vs` 85 · `none` 2**.

### Gépi jelek

- `npm run verify:kuka` — **KUK07** az őr-otthon (kimondás + visszamérés + padló)
- `npm run verify:release-order` — **REL01–REL06**; a REL06 fixtúrákon bizonyítja, hogy a
  bontás-szabály tüzel, mert nulla migrációval a REL03 nem mérne semmit
- `npm run verify:decision-numbers` — a 700-as blokk őre
- `npm run verify:doc-html` — a szállítási forma (a címzett meg tudja nyitni)
- `npm run verify:v3ref` — a magreferencia 6 próbája + 10 mutáció

### Ami NEM történt meg — kimondva

- **A repót nem én hoztam létre**: a session GitHub-alkalmazása nem kaphat repó-létrehozási jogot
  (mérve: `POST /user/repos` → 403 „Resource not accessible by integration"). Az üres repót az
  operátor nyitotta meg, a nyitó csomagot ez a döntés kíséri.
- **Nincs alapállás-mentés** (a V2-ben van) — mert még nincs adat. NEVESÍTETT függő: az első éles
  adatbázis megszületésekor kerül a `CLAUDE.md`-be a mester-mentés neve és a visszaolvasás.
- **Nincs migráció**, ezért a bontás-szabály élő adaton nem mért semmit; ezt a REL06 önpróba pótolja,
  és a verifier ki is írja.
- **A PITR (időpontra visszaállítás) állapota nem mérve** — azt az operátor látja a Railway-en, a
  session nem.
