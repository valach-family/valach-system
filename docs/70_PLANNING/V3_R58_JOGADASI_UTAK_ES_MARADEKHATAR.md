# R57 végrehajtása — a jogadási utak táblája, és a maradék útankénti megnevezése

> **Sáv:** Claude-v3 · **Kör:** R58 · **Állapot:** lezárt

**Szülő:** CMD-VS-300-002-002 **R57 — ANALYSIS** (chatgpt-v3 → Claude-v3, 2026-09-20).
A külső fél lapja szó szerint mentve: `v3ref/source-documents/R57_board_v1.md`.

---

## Röviden, magyarul — mi történt ebben a körben

A külső ellenőrző fél **elfogadta** az előző két javításunkat, és lezártnak mondta a bírálati
hatáskörről szóló javítócsomagot — de csak abban a szűk körben, amit megvizsgált. Ez fontos
megkülönböztetés, és szándékosan nem tágítjuk: **a rendszer készültsége nem nőtt**, egy konkrét
munkadarab zárult le.

Cserébe egy régi adósságot kért be: **a „mi hiányzik még?" mondatunk túl általános volt.** Azt
mondtuk, hogy „hiányzik az általános képviseleti lefedés" — ez viszont olyan mondat, amiről nem
lehet megmondani, mi teljesítené. Ráadásul **kétszeresen is hazudott**: egyrészt letagadta azt a
munkát, ami már elkészült (a bírálati hatáskör és az adatköri jogadás is hordozza és ellenőrzi az
alapot), másrészt egy régi magyarázat **jelen időben** állította, hogy a meghívó nem tárol
határozat-azonosítót — holott tárol, hónapok óta.

Ezért ebben a körben **nem új funkciót építettünk**, hanem rendet raktunk abban, amit már tudunk:
elkészült **a jogadási utak táblája** — hogy ki, hol, milyen jogot ad, mi alapján, és hol áll kapu.
A tábla **kódban él**, és a gép **visszaméri**, tehát holnap nem tud némán elavulni.

**Hétköznapi hasonlat.** Eddig azt mondtuk: „a kulcsosztás nincs rendben". Most azt mondjuk:
„négy helyen osztunk kulcsot; hármon kérjük is a felhatalmazó papírt, egy helyen a papír kötelező,
két helyen viszont papír nélkül is lehet kulcsot adni — és ez utóbbi nem programhiba, hanem **a
gazda döntése**, hogy kötelező legyen-e."

---

## 1. Mi zárult le — és mi NEM

**LEZÁRT** (a külső fél szavával: *„a vizsgált egyírós, szintetikus, megbízható belső kontextusú
referenciában"*): az R53–R56 deklarált alapú **bírálati hatásköri javítócsomag**, a három meglévő
műveletre (felfüggesztés · ügy elbírálása · jogváltoztatás).

**KIFEJEZETTEN NEM ZÁRULT LE**, és ezt a nyilvántartásban is így vezettük át:

| állítás | mai érték |
|---|---|
| ORG-N1a / ORG-N1b egésze | **részleges** (`partial`) — nem emeltük `accepted`-re |
| elfogadott EGÉSZ klauzulák száma | **16** — nem nőtt |
| req-5 (a két klauzula kötelezővé tétele) | **nem lépett életbe** |
| core-core lezárás | **nincs** |
| teljes általános szervezeti képviselet | **nincs elfogadva** |
| alap nélküli jogok általános üzleti szabálya | **nincs, és e körben nem is született** |

A külső fél kikötése szó szerint: *„A részcsomag lezárását nem szabad új egész-klauzulás
elfogadásként számolni."* A döntésregiszterben ezért a **verdikt `partial` maradt**, a lezárás ténye
pedig a döntés **indokában** áll, saját **R57 forrással**. A korábbi R55-ös döntés nem tűnt el:
`superseded` alatt utazik tovább, visszakereshetően.

---

## 2. A jogadási utak táblája — mi adhat ma jogot ebben a magforrásban

A tábla **kódban él**: `contracts/grantPathRegistry.js` (GPR-01). Nem lap, hanem nyilvántartás,
mert egy kézzel írt táblázat a következő körben némán elcsúszik a kódtól.

### Termékbeli jogadási felületek (4)

| út | belépési pont | adott jog | alap tárolása | megadási kapu | használati kapu |
|---|---|---|---|---|---|
| **GP-INVITE-ISSUE** | `basisLimit.mjs → issueInviteUnderBasis` | a meghívóban kiajánlott szerep (még nem tagság) | `invite_basis` — azonosító · verzió · hatály · pecsételt korlát | igen (a korláton túli kiadás nyom nélkül elakad) | igen (beváltáskor, a KIADÁSKORI alaphoz mérve) |
| **GP-INVITE-REDEEM** | `invite.mjs → redeemInvite` | a tényleges tagság + az első hitelesítő adat | `grant_basis` — a tagságadó eseményhez kötve | hétlépcsős lánc, benne a korlát-kapu | igen (a tagság két idő-tengelyen oldódik fel) |
| **GP-ADJUDICATION-AUTHORITY** | `adjudication.mjs → grantAdjudicationAuthority` | bírálati hatáskör egy műveletre | `adjudication_authority.basis_id + basis_version` | igen (`mode: grant`) | igen (`authorityRowAt`, `mode: use`) |
| **GP-SCOPE-GRANT** | `scopeGrant.mjs → grantReadScope` | explicit olvasási jog egy adatkörre | `scope_grant` — **az alap itt KÖTELEZŐ** | igen (alap nélkül `grant_needs_recorded_basis`) | igen (`readScopeGrantAt` → kiadási döntés) |

### Ami NEM termékbeli jogadási felület — és miért (R57 kifejezett kérése)

| elem | besorolás | miért |
|---|---|---|
| `bitemporal.mjs → grantMembership` | **egy másik út írója** | exportált, de a termékben **egyetlen** hívója van: a meghívó beváltása. Mérve. Nem önálló felület — viszont ki kell mondani, hogy egy jövőbeli hívó megkerülhetné a meghívó kapuit, tehát a védelem ma a hívók számán áll, nem kapun |
| `banMatrix.mjs` · `entryPoints.mjs` | **mérési előkészítő** | a jogot azért adják, hogy legyen mit mérni; a termék egyetlen útja sem hívja őket |
| `run.mjs` · `mutations.mjs` | **mérési előkészítő** | a próbák kezdeti állapota. A nyers `INSERT` itt **szándékos**: több próba épp azt méri, hogy a kapu a nyers íráson is hat. *„Egy teszt-előkészítő nem válik ettől automatikusan termékbeli jogadási felületté."* |
| `store.mjs` tükör-triggerei | **sémaszintű tükrözés** | nem ad jogot: a kiadott feltételeket rögzíti, hogy utólag ne lehessen átírni |

### A tábla nem hiheti el magát — a gép visszaméri

`npm run verify:grant-paths` (GP01–GP05). A lényeg a **GP04**: a mérés alanyait nem kézi lista adja,
hanem **a forrás** — minden modul, ami jogadó táblába ír, kötelezően szerepel a táblában, tehát egy
holnap született író magától pirosra viszi. A fordított irányban: egy deklarált sor vagy **maga ír**,
vagy **kimondott delegálást** mér (a beváltás szándékosan az írókra bízza a tagságadást).

**Az őr az első futásán négy valódi eltérést talált** a saját, frissen írt táblámon: a
`mutations.mjs` hiányzó besorolását, a `redeemInvite` ki nem mondott delegálását, és **mindkét**
általános maradék-szöveget.

---

## 3. A konkrét technikai hiány — bizonyítva, megnevezve

A „hiányzik az általános képviselet" helyett **három külön dolog**, mert három külön következményük
van:

**(1) LÉTEZŐ ÚT, NEM KÖTELEZŐ ALAP — ez OPERÁTORI DÖNTÉS, nem rejtett kód-hiány.**
A `grantAdjudicationAuthority` `basisId` paramétere ma **opcionális**, és a **deklarálatlan meghívó**
is kiadható. Ezeken a klauzula szövege („tárolja a határozat azonosítóját, verzióját és hatályát")
nem kényszerül ki. A rendszer viszont **kimondja** a hiányt (`no_declared_basis` ·
`authority_without_recorded_basis`), tehát nem néma engedély.

**(2) LÉTEZŐ ÚT, HIÁNYZÓ BEJÁRAT — ez VALÓDI technikai hiány.**
A **GP-SCOPE-GRANT** író oldalát a termékben ma **semmi nem hívja**: az adatköri jogot csak próba
tudja megadni. Az **olvasó** oldal be van kötve (kiadási döntés → eredmény-hatókör). Ez **fél lánc**:
a hiányzó darab **egy belépési pont**, nem egy szabály. Mérve: a `grantReadScope` hívói a
`v3ref/run.mjs` próbái és a külső fél átvett programjai — termék-kód nincs köztük.

**(3) MÉG NEM LÉTEZŐ KÉPESSÉG — külön határ, nem hiány.**
Az **általános szervezeti képviselet** (képviselő szervezet nevében, delegálási lánccal, több úton
át) ma nem létező képesség. **Nincs olyan meglévő út, amit megsértene**, és e feladat alatt nem is
terveztünk hozzá modult.

---

## 4. Operátori döntési pontok — a szabályon MOST nem változtattunk

A külső fél kérte, hogy a valóban operátori maradékot rövid, közérthető döntésként adjuk át. **Ez
két külön kérdés**, és nem szabad összevonni őket.

### Döntés A — SZÜLETHET-E EZUTÁN alap nélküli jog?

**Ma:** igen. Két helyen: meghívót lehet kiadni felhatalmazó határozat megnevezése nélkül, és
bírálati hatáskört is lehet adni alap nélkül. A rendszer ezt **kiírja**, de nem tiltja.

**Érintett utak:** GP-INVITE-ISSUE · GP-INVITE-REDEEM · GP-ADJUDICATION-AUTHORITY.
Nem érintett: GP-SCOPE-GRANT (ott az alap már ma is feltétel).

| ha… | mi történik |
|---|---|
| **marad, ahogy van** | gyorsabb a mindennapi munka, de a rendszer nem tudja megmondani, MI alapján kapott valaki jogot — vitás helyzetben ez nem visszakereshető |
| **kötelezővé tesszük** | minden jogadáshoz előbb kell egy rögzített határozat. Az adminisztráció nő; cserébe minden jog visszavezethető egy döntésre. A kód oldaláról ez **kis munka** (a kapu áll, csak az „opcionális" szót kell elvenni) |

**Ajánlás:** tegyük kötelezővé — de **csak az ezután születő** jogokra, és **csak akkor**, ha a
határozat rögzítése az operátornak nem külön munkalépés, hanem a jogadás űrlapjának része. Kapu
előbb, mint kényelem, nincs értelme.

### Döntés B — MI LEGYEN a MÁR MEGLÉVŐ, alap nélküli jogokkal?

**Ma:** a régi szerint mennek. A rendszer kiírja róluk, hogy nincs rögzített alapjuk
(`authority_without_recorded_basis`), de dolgozni lehet velük.

| ha… | mi történik |
|---|---|
| **marad, ahogy van** | senki munkája nem áll meg; a régi jogok viszont örökre „alap nélkül" maradnak |
| **visszamenőleg lezárjuk** | a mai működő jogok **azonnal elakadnának** — ez a legrosszabb változat, mert egy adminisztratív hiányosság miatt állna meg a valódi munka |
| **átmenettel pótoltatjuk** | határidőig minden meglévő jog mellé kell alapot rögzíteni; utána a pótlatlanok elakadnak. A rendszer ma **meg tudja mondani**, melyek ezek |

**Ajánlás:** **átmenettel pótoltatni**, és a határnapot az operátor mondja ki. A visszamenőleges
lezárást nem javaslom.

**E körben egyik döntés sem született meg, és a kódban semmi nem változott miattuk** — az R57
kifejezett kikötése volt: *„Most NE változtass ezen az üzleti szabályon."*

---

## 5. A mérés határa — kié melyik szám

Ezt a külső fél külön kérte, mert az előző körökben csúszott: *„a saját kiegészítő ellenőrzésemet ne
írd Claude-futásnak."*

| mérés | kié |
|---|---|
| 61/61 magpróba · a teljes mutációs battéria · 316/316 tanulság-ellenőrzés · döntésszám · idézet-hűség · jogadási utak | **Claude-v3 saját futása** ebben a körben |
| 36 kapuvizsgálat (három művelet × hat alapállapot × megadás/használat) · 12 történeti verzióeset · 6 pozitív ellenpár · 5 módszerződés-eset | **chatgpt-v3 SAJÁT programja** — átvett mérés, nem Claude-futás |
| M190 · M191 · M194 · M195 négy külön forrásmásolaton | **chatgpt-v3 saját futása** |

**A repository próbájáról önmagában nem állítunk teljes mátrixot.** A `P-ORG-adjudication-basis-limit`
(f1) három **megadási** alapállapotot mér, (f2) három **használati** alapállapotot és három
verzióhibát — ez **nem** a teljes „hatállapot × kétkapu" kereszt. A hiányzó keresztirányokat a külső
fél saját kiegészítése ellenőrizte; ezt a **bizonyíték eredeténél** őrizzük meg, nem olvasztjuk be a
saját mérésünkbe.

---

## 5/b. Az ÚJ forrás-lenyomat gépi bizonyítéka

A magforrás szövege változott (`v3ref/norms.mjs` · `v3ref/externalDecisions.mjs`), tehát a korábbi
mérés **nem címkézhető át**. Az új lenyomathoz tartozó teljes battéria ebben a körben lefutott:

| mit | érték |
|---|---|
| forrás-lenyomat (ma mérve) | `sha256:ca9c6739637e73fcff5af392f957030b71ee45b585548e6d13693e0cee1d4883` |
| mutáció | **192 / 192 elkapva** · 0 túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony |
| lefedettség | 192/192, hiány 0, duplikátum 0 |
| norma-lánc | 128/128 elvárt sor · hiányzó 0 · idegen 0 |
| egységek | 16 szelet, mind belefér a külső 15 000 ms-os korlátba (legrosszabb: 11 234 ms) |

**Két kimondott korlát, változatlanul.** Az egység-fájl nincs kriptográfiailag a futásához kötve (a
lenyomat-egyezés szűkít, de nem bizonyít — nevezett függő: aláírt egység-tanú). És: a darabolás
ezen a gépen **16** szeletet kívánt a deklarált 8 helyett; a futtató ezt **kiírja**, a költségvetés
változatlan.

---

## 6. A következő egyetlen munkacsomag

**A GP-SCOPE-GRANT hiányzó termékbeli bejárata** — a 3.(2) pontban bizonyított technikai hiány.
Ez az egyetlen olyan maradék, ami **ma létező úton**, **kódmunkával** zárható, és nem igényel sem új
modult, sem operátori üzleti döntést: az adatköri jogadásnak van kapuja, szabálya, tárolása és
mérése, csak **hívója nincs**.

Nem ez a következő: az alap kötelezővé tétele (A és B döntésre vár) és az általános szervezeti
képviselet (nem létező képesség, nem tervezünk hozzá modult).

---

## 7. Amit ebben a körben nem tettünk meg — kimondva

- **Nem** emeltük 16 fölé az elfogadott klauzulák számát, és nem léptettük életbe a req-5-öt.
- **Nem** hoztunk üzleti döntést az alap nélküli jogokról.
- **Nem** építettünk új funkciót és nem terveztünk új modult.
- **Nem** írtuk át a történeti vállalásokat: a régi terv szövege megmaradt, a mai állapotot **külön,
  dátumozott mező** mondja ki (`current_state_note`), hogy a kettő ne csússzon össze.
- **Nincs gépi jel arra**, hogy egy megírt hiány-mondat **tartalmilag** helyes-e — a GP05 csak azt
  méri, hogy **nevez-e** konkrét utat. Ez kimondott korlát, nem feledékenység.
