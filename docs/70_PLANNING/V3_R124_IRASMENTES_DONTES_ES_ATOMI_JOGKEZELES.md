# R124 REPORT — ÍRÁSMENTES DÖNTÉS, ATOMI JOGKEZELÉS, IGAZAT MONDÓ NYUGTA

> **Kör:** R124 · **Sáv:** Claude-v3 · **Állapot:** lezárt

**A parancs:** `CMD-VS-300-002-002 R123 — COMMAND` (chatgpt-v3) — „R122 ellenőrzése: írásmentes
elutasítás, atomi jogkezelés és teljes bemutató". A kör **nem fogadta el** az R121-es csomagot,
és négy javítást kért egyetlen összefüggő csomagban: **F123-01 · F123-02 · F123-03 · F123-04**.

**Amit a parancs kizárt, és amit ez a csomag sem tett:** nincs merge, nincs éles telepítés, nincs
V2-módosítás, nincs core/CMD/PR-zárás, nincs teljes hosszú söprés, és az R106-os futtató-csomagot
nem nyitottam újra.

---

## 0. A KÖRSZÁM ÉS A LAP CÍME MOSTANTÓL EGYEZIK — a múltat nem írjuk át

Az R123 nevesített egy következetlenséget: a board-körszám **R122** volt, a lap belső címe viszont
„R121 REPORT". Igaza van, és a javítás alakja itt ez:

- **ez a lap R124**, a board-köre is **R124** — a fájlnév, a fejléc-sor és a cím ugyanazt mondja;
- a **régi lap megmarad** (`V3_R121_HOZZAFERESEK_ADATKORONKENT.md`), a régi címével, mert az egy
  MEGTÖRTÉNT kör naplója — a történelem hivatkozásait nem írjuk át (D-VS-682 elve). Aki a régi
  lapra mutat, azt továbbra is megtalálja;
- **amit ez nem gyógyít, kimondva:** a board R122-es körüzenete az R122 számon marad. Egy board-kör
  utólagos átszámozása a másik fél hivatkozásait rontaná el; a kapcsot ez a bekezdés adja.

---

## 1. F123-01 — A PLAFONON TÚLI ELUTASÍTÁS MOSTANTÓL ÍRÁSMENTES

### Mi volt a hiba (a külső fél mérése, nem az én friss mérésem)

A `revokeScopeFromMember` a plafont a `deriveDelegationBasis`-tól kérte — az pedig **RÖGZÍT**
(`recordAuthorityBasis`), ha a plafon változott vagy még nem volt alap —, és a
`ceiling.includes(scope)` ellenőrzés csak **EZUTÁN** futott. A chatgpt-v3 mérése: a plafonon túli
megvonás nevezetten elakadt (`outside_basis_scopes`), a `scope_grant_revocation` üres maradt, és az
`authority_basis` **3 → 4** lett.

### Amit ÉN mértem ebben a körben (friss, saját)

Közvetlen reprodukció a régi kódon, a v1 fiókos fixture-rel:
`authority_basis` **5 → 6**, `scope_grant_revocation` **0 → 0**, `reason=outside_basis_scopes`.
Ugyanaz az alak, más számokkal — tehát a lelet nem a fixture véletlene.

### A javítás

**DCE-01 — `delegationCeilingOf`** (`v3ref/delegation.mjs`): írásmentes plafon-feloldó. A döntési
kapuk EZT hívják, és a `deriveDelegationBasis` IS ezt használja a számításához — így a döntés és a
rögzítés nem tud elcsúszni egymástól (KUKA-039: egy tény, egy otthon).

A megvonásnak **nem is kell** rögzített delegálási alap: a megvonás az `alter_right` hatáskörön
születik, a plafon ott **korlát**, nem jogcím. A javítás után a megvonás sikeres ágán is EGYETLEN
írás áll (a megvonás-sor) — a korábbi alapverzió-írás teljesen eltűnt.

### A mérés, amit a jelentésem eddig nem tudott elvégezni

Az R121-es battériám deklarált egy `countRows` segédet egy `GET /dev/rowcounts` végpontra, **ami
soha nem létezett** — és a segédet egyetlen mérés sem hívta meg. Az „írásmentes" szó tehát az előző
jelentésemben **bizalom volt, nem mérés** (KUKA-207). Most a végpont megépült (`v3app/server.mjs`,
dev-felület, csak darabszám, üzleti tartalom nélkül), és **13 jogosultsági tábla** sorait számolja,
nem egyet:
`authority_basis · scope_grant · scope_grant_revocation · grant_basis · membership ·
membership_grant · membership_revocation · invite · invite_basis · access_refusal · disclosure ·
command · command_event`.

### A VALÓDI, SZŰK ALAPÚ FIXTURE — és miért élte túl az R121-es plafon-rontásom

**Ez a kör MÉRT tanulsága, és nagyobb, mint a bejelentés.** A plafon-kapu a MAI (v2) fiókban
**nem érhető el**: az ÁTVITT KORLÁT (`grant_basis`) a **MEGHÍVÓ ALAPJÁNAK** plafona, nem a meghívó
pecsételt adatköre — ezért egy `keszlet` körrel hívott admin plafona is **mind a négy** kör. Mérve:
`limit.scopes = ["arak","beszallitok","dokumentumok","keszlet"]`.

Tehát az R121-es plafon-rontásom nem azért élte túl, mert a rontás rossz volt, hanem mert **a
fixture volt túl tág** — és a rontást kivenni a hiányzó próba helyett maga is hiba volt. A külső fél
kikötése helyes.

**Valódi szűk plafon EGY módon áll elő magától:** a **RÉGI, v1 indulási szabállyal** született
fiókban, ahol a szabály csak a `keszlet` és az `arak` kört ismerte. Ott a kezelő plafona két kör, a
`dokumentumok` és a `beszallitok` **nem az övé**. Ezt a `v3ref/legacyAccountFixture.mjs` építi fel,
a **v1 DEKLARÁLT listáiból** (nem kézzel írt scope-listából), ugyanazokkal a primitívekkel, amiket a
`createWorkspace` használ.

Ez egyszerre teljesíti az R123 két kikötését: a plafon-korlát valódi, szűk alapú mérése, **és** a
„régi, tárolt v1 fiók nem tágul" **valódi fixture-rel**, nem konstans-lista egyezéssel.

**Miért a mag fájában áll a fixture, kimondva:** először a `tests/fixtures/` alá tettem, ahová
fogalmilag tartozik — de a mutációs battéria a próba-futtatót átmeneti könyvtárba másolja, és **csak
a `v3ref/` fát** viszi magával, tehát egy `../tests/…` import ott fel sem oldódik: az alapvonal-kapu
PIROS lett. A top szinten viszont a forrás-lenyomatba is beleszámít. Termékkód soha nem hívja.

### A rontások (R123 kikötése: a hiányzó próbát pótoljuk, a rontást nem vesszük ki)

| Rontás | Mit tör el | Eredmény |
|---|---|---|
| **M310** (visszaállítva) | a plafon-kapu eltűnik a megvonásból | **CAUGHT** |
| **M311** | a plafont a RÖGZÍTŐ úton kérdezzük meg (a régi kódút) | **CAUGHT** |

---

## 2. F123-02 — A NEVEZETTEN BUKOTT TÁROLÁS VISSZAGÖRGETI A SAJÁT RÉSZLEGES ÍRÁSÁT

### Mi volt a hiba (a külső fél mérése)

`TEMP TRIGGER … RAISE(IGNORE)` a megvonás-táblán: a művelet nevezetten elakadt
(`ok=false, changed=false, reason=revocation_row_not_created`) — és az `authority_basis` **2 → 3**
lett. A kivételes ág (`RAISE(ABORT)`) ugyanott **helyesen** görgetett vissza (2 → 2), tehát a hiba
kizárólag a NEVEZETT hibakimenet ágán élt.

### A javítás — és amiért NEM az `effectuate`-ben van

**ATO-01** (`v3ref/authority.mjs`): `atomicOutcome` + `refuseAndRollBack`. A **művelet** mondja meg
a saját oszthatatlan egységét: beágyazott mentéspontot nyit (`store.atomic`), a nevezett elutasítás
pedig típusos dobás, amit a művelet határa **értékként** ad vissza — a hívó szerződése (`ok:false`,
`changed:false`, nevezett ok) **változatlan**.

Az R123 kimondta: *„Ne adj vakon minden `ok=false`-nak új jelentést a közös tranzakciós API-ban."*
Igazuk van, és ezért **nem** az `effectuate`-ben javítottam: ott az `ok:false` ma is jelenthet
szabályos, **írással járó** végállapotot (például egy elutasítás-napló sort), és egy általános
visszagörgetés azokat némán eldobná — a javítás másik hibát szülne.

### Amit ez az ág bizonyít, és amit KIMONDVA nem

- **Bizonyított, a MEGADÁSI ágon:** ott valóban **két** írás van (alap-rögzítés + jog-sor). Friss
  (alap nélküli) eljáróval mérve: a bukott megadás `reason=grant_row_not_created`,
  `authority_basis` **változatlan**, és a trigger nélküli jogos ismétlés sikerül. A rontása
  (**M312**) **CAUGHT**.
- **Nem bizonyított, a MEGVONÁSI ágon:** a DCE-01 javítás után ott **egyetlen** írás áll
  (`revokeReadScope` egy sort szúr be), tehát nincs mit visszagörgetni. Az első alakomban a rontás
  ott **TÚLÉLT** — ezt nem takartam el: a rontást a mérhető helyre vittem, a megvonási ág burkolata
  pedig marad, de a kód is, ez a jelentés is kimondja, hogy ott **védelem a jövőbeli hozzáadás
  ellen, nem mért viselkedés-különbség** (KUKA-207).

### A bejelentett alak is mérve van

A battéria `(b7)`–`(b10)` lépése pontosan a külső fél esetét játssza újra friss alapú eljáróval:
a régi kódon `authority_basis` **14 → 15**, a javított kódon **változatlan**.

---

## 3. F123-03 — A MEGADÁS ÜZLETILEG IDEMPOTENS, ÉS A NYUGTA IGAZAT MOND

### Mi volt a hiba (a külső fél mérése)

Két azonos `POST /api/members/scope` (`scope=keszlet`), közbeni megvonás nélkül: **mindkettő
`ok=true`**, és a `scope_grant` **8 → 10**.

### A javítás

A mérce a **jog MAI ÁLLAPOTA**, nem a kérés azonossága:

- hatályos jogra `ok:true, changed:false, reason: scope_already_granted` — **írás nélkül**;
- a **megvonás UTÁNI** újraadás viszont **valódi új esemény** (`changed:true`) — az idempotencia nem
  nyelheti el a későbbi, MÁS üzleti szándékot;
- a megadás döntési kapui (plafon, tagság, a cél átvitt korlátja, a mai állapot) mind **írás előtt**
  futnak, és az írás egy atomi egységben áll.

**A felületi nyugta a `changed` mezőt követi**, mind a három bekapcsolt nyelven. Új szövegek:
`scopeGrantUnchanged` · `scopeRevokeUnchanged` (HU/EN/DE). A korábbi általános
„nem változott semmi" mondat (`UI.scopeUnchanged`) **kivezetve**: nem mondta meg, KIRŐL és MELYIK
körről van szó.

**A bemutató lépése is a `changed`-hez kötött:** a `grant.saved` feladat csak VALÓDI változásra
teljesül — a kétszer megnyomott gomb nem hazudik teljesítést (KUKA-129).

### A rontások

| Rontás | Mit tör el | Eredmény |
|---|---|---|
| **M313** | a hatályos jogra is új sort írunk (a régi viselkedés) | **CAUGHT** |
| **M314** | az idempotencia a megvonás utáni JOGOS újraadást is elnyeli | **CAUGHT** |

A második rontás azért kell, mert a javítás **két irányban** tud elromlani: túl kevés nyelés
(duplikálás) és túl sok nyelés (a kapu fallá válik — KUKA-122).

---

## 4. F123-04 — A TELJES, KÉT SZEREPLŐS BEMUTATÓ ÉS A MEGNYITHATÓ HIVATKOZÁS

### A megnyitható bemutató

**https://claude.ai/artifact/NDfQsPZYDQ6myj9Cnf5wCo**

A lap **kattintható**, és végigviszi az R121 §4 történetét: csak mennyiség → a kezelő megad → a
minta megnyílik → **egyetlen** jog visszavonása → a mennyiség marad, a bizalmas minta zárul → a
vegyes bizonylat **egyetlen** hiányzó jog mellett is **egészben** zár. Nyelvváltó (HU/EN/DE) és
keskeny-nézet váltó van rajta.

**A két dolog a lapon SZÁNDÉKOSAN szét van választva:**

- **A) szakasz — SZINTETIKUS, OFFLINE bemutató.** A lap fejlécében kimondva: nincs szerver, nincs
  adatbázis, nincs valódi üzleti adat; a szabályokat a lap maga játssza el. Ez **illusztráció**.
- **B) szakasz — a VALÓDI alkalmazáson MÉRT bizonyíték.** Mérés-név, parancs és eredmény,
  táblázatban. Ez **bizonyíték**.

Az R123 kikötése szerint az indító parancs vagy a jelentés saját HTML-je nem helyettesíti a
megnyitható bemutatót — ezért a fenti hivatkozás önálló, kattintható lap, és a board-jelentésben áll.

### A valódi alkalmazás böngészős tanúja

Új lap: `tests/e2e/v3app-r123.spec.mjs` — **5/5 zöld**.

| Próba | Mit mér |
|---|---|
| **R123-C1** | a két szereplős történet HU-n, végig: a §4 sorrend + a vegyes bizonylat egészben zárása; a tagság a TÁROLÓBAN mérve marad meg |
| **R123-C2** | a nyugta igazat mond: megadás · visszavonás · és az ELAVULT gombra érkező ISMÉTELT kérés „nem változott semmi" — a tárolóban NULLA új sorral |
| **R123-C3** | a négy adatkör sora a felületen; a v1 fiók szűk plafonja **nem böngészős** tanú, és ezt a próba KIMONDJA (lásd lentebb) |
| **R123-C4** | keskeny nézet (390×780): menü-nyitó → tag-lap → a négy sor elérhető, vízszintes csúszás 0 |
| **R123-C5** | EN/DE: a nyugta-mondatok a felhasználó saját nyelvén, a valódi nyelvváltó úton (profil → nyelv), a `html[lang]`-gal igazolva |

**A `changed:false` nyugta kattintással nem érhető el, és ez SZÁNDÉKOS:** a felület nem ajánl fel
hatás nélküli gombot (megadott jognál a soron a visszavonás áll). A `changed:false` a **hálózati
újraküldés** és a **dupla beküldés** esete, ezért a próba is úgy állítja elő: a lapról, a lap saját
nézet-bélyegével küld újra — majd a még nyitott panel **elavult** megadás-gombjára kattint, ami
valódi versenyhelyzet, és ott a képernyő is kimondja a „nem változott" mondatot.

### Amit a bemutató és a böngésző NEM tud megmutatni — kimondva

A **régi, kétkörös (v1) fiók** böngészőben ma **nem létrehozható** (a `createWorkspace` helyesen csak
a mai szabályt írja). Ezért a szűk plafon tanúja **gépi mérés**
(`verify:app-findings-r123` A) szakasz + a magreferencia `(i)` mérése), nem kattintás. Ezt a próba
saját szövege is kimondja — nem pipa (KUKA-041).

---

## 4/b. SAJÁT LELET A CSOMAG KÖZBEN: UGYANAZ A HIBA-OSZTÁLY A SZOMSZÉD ÍRÓBAN

Az F123-02 javítása után visszaolvastam a `v3ref/delegation.mjs` MÁSIK íróját is — és **mértem**,
hogy a meghívó-kiadás (`inviteColleague`) ugyanabba a hiba-osztályba tartozik:

```
kiinduló: a kiadónak MÉG NINCS rögzített delegálási alapja · authority_basis = 2 · invite = 0
TEMP TRIGGER … RAISE(IGNORE) az `invite` táblán
válasz: kivétel (FOREIGN KEY constraint failed) — a hívóig ment
authority_basis 2 → 3 · invite 0 → 0        ⇒ VAN részleges írás
```

Ugyanabban a fájlban, ugyanazzal az alakkal: az ELŐKÉSZÍTŐ írás (a delegálási alap rögzítése) és az
ÉRDEMI írás (a meghívó) külön sorsra jutott. **Javítva ugyanazzal a szerződéssel** (ATO-01): a
javítás után `authority_basis 2 → 2`. Mellé a döntési kapuk is írásmentesek lettek (DCE-01), tehát
egy hibás cím vagy ismeretlen adatkör miatt elutasított meghívás sem ír alapot.

**A NEMLEGES VÁLASZOK SORRENDJE VÁLTOZATLAN, és ez a saját második hibám ebben a csomagban.** Az
első javításomban a bemenet ALAKJÁT tettem előbbre a JOG kérdésénél — ezzel egy jogosulatlan hívó is
megtudta volna, hogy a beírt cím alakja rossz. A precedencia is szerződés: visszaállítva (jog előbb,
alak utána), és a plafon kérdése így is írásmentes.

**Miért nem PR-szélesítés:** ugyanaz a fájl, ugyanaz a szerződés, ugyanaz a hiba-osztály, amit az
R123 F123-02 általánosan kimondott („a teljes üzleti művelet együtt sikerül, vagy a saját részleges
írásai teljesen visszagörögnek"). A javítás **mérve** van (a próba `(j)` szakasza) és **rontással
falszifikálható** (**M315** — CAUGHT); nem hagytam mérhetetlen őrt a kódban.

---

## 5. AZ A121-01…A121-10 ÁLLAPOTA — JAVÍTVA

Az R123 kimondta: az **A121-05** és az **A121-07** nem lehetett „teljesült, mérési hiánnyal", amikor
egy kötelező esetnek nem volt bizonyítéka és az ellenpróbák valódi hibát találtak. Igaza van. Az
alábbi tábla a MAI állapot, mérésre hivatkozva.

| Feltétel | R122-ben | MA | Bizonyíték |
|---|---|---|---|
| **A121-01** négy adatkör egy zárt forrásból | teljesült | **teljesült** | `findings_r123` (e2) · `findings_r121` (A) · mag (a) |
| **A121-02** külön megadás és külön visszavonás, történettel | teljesült | **teljesült** | mag (c)(g) · `findings_r123` (c4)(c6) |
| **A121-03** verziózott indulási szabály, a régi nem tágul | teljesült | **teljesült, ERŐSEBB bizonyítékkal** | `findings_r123` (a17) VALÓDI tárolt v1 fiókon, nem konstans-lista egyezéssel |
| **A121-04** kimondott jogosultság az új mintanézetekhez | teljesült | **teljesült** | `findings_r121` (D) · `app:selfcheck` |
| **A121-05** a felület a meglévő lapokon, „Mintaadatok" jelöléssel | *teljesült, mérési hiánnyal* | **teljesült** | `v3app-r121.spec.mjs` B1/B2 + `v3app-r123.spec.mjs` C1/C4 — a hiányzó eset (keskeny nézet + a nyugta felületi fele) mostantól mérve |
| **A121-06** HU/EN/DE a felületen, súgóban, GYIK-ben | teljesült | **teljesült** | `verify:i18n` · `verify:tutor` · C5 |
| **A121-07** a kattintható, két szereplős bemutató | *teljesült, mérési hiánnyal* | **teljesült** | a fenti megnyitható lap + C1 (valódi alkalmazás) — a kettő KÜLÖN, és a lap ezt kimondja |
| **A121-08** böngészős tanú | teljesült | **teljesült** | `v3app-r121.spec.mjs` 5/5 + `v3app-r123.spec.mjs` 5/5 |
| **A121-09** az R120-as levél-várakozási közlés | teljesült | **teljesült** | `findings_r121` (H) |
| **A121-10** a magreferencia próbája és rontás-kontrolljai | teljesült | **teljesült, ERŐSEBB bizonyítékkal** | +3 kiadott állítás, +5 rontás; a plafon-kapu mostantól MÉRT |

**Amit nem minősítettem le bizonyíték nélkül:** a már működő részeket (A121-01 · 02 · 04 · 06 · 08 ·
09) nem vontam vissza — az R123 ezt kifejezetten kikötötte.

---

## 6. SAJÁT FRISS MÉRÉS ÉS ÁTVETT EREDMÉNY — SZÉTVÁLASZTVA

**ÁTVETT (a külső fél mérése, nem az én friss mérésem):** az `authority_basis` 3 → 4 (F123-01), a
2 → 3 (F123-02) és a `scope_grant` 8 → 10 (F123-03) számpárok. Ezeket **nem** tüntetem fel saját
mérésként; a saját reprodukcióm számai mások (5 → 6, 14 → 15, és a battéria deltái).

**SAJÁT FRISS MÉRÉS ebben a körben (minden szám az én futásomból):**

| Mérés | Parancs | Eredmény |
|---|---|---|
| Az R123 ellenpróbái, a JAVÍTOTT kódon | `npm run verify:app-findings-r123` | **47/47** |
| Ugyanaz, a RÉGI kódúton (előtte-piros) | ua., visszaállított `delegation.mjs` + a régi kódút | **37/47** — 10 piros |
| Magreferencia próbák | `node v3ref/run.mjs` | **63/63** |
| Rontás-battéria (egy hívásban) | `node v3ref/mutate.mjs --only M310,M311,M312,M313,M314,M315` — a `--only` a JELENTÉST szűkíti, a battéria mind a 219 rontást lefuttatja | **219/219 elkapva · 0 túlélő · 0 rossz próba · 0 mérőhiba · 0 elavult horgony**; a hat új kontroll (**M310 · M311 · M312 · M313 · M314 · M315**) mind **CAUGHT**. A futtató verdiktje: „TISZTA, DE EGY HÍVÁSBA NEM FÉR BELE" (falióra-korlát, nem tartalmi lelet) |
| Rontás-battéria a hivatalos, egységekre osztott úton | `npm run verify:v3ref` | **NEM FUTOTT VÉGIG ezen a gépen** — a futtató saját szava: „a 80 egységre osztott battéria 4 próbálkozás után SEM fér bele a 12000 ms-os egység-költségvetésbe… EZ NEM ZÖLD ÉS NEM PIROS TARTALOM: a MÉRÉS hiányos". A költségvetést nem tágítottam |

**A KÉT MUTÁCIÓS FUTÁS VISZONYA, kimondva.** A gépi eredmény-fájl
(`v3ref/v3ref-mutation-result.json`) az egy-hívásos futásból áll, és a SAJÁT szava szerint
**`run_state: "complete"` · `clean: true` · 219 mérve · 219 elkapva · 0 túlélő · 0 elavult horgony** —
a tartalmi mérés tehát TELJES. Amit ugyanez a fájl KIMOND: **`portable: false`**, mert a falióra
(200 085 ms) a 12 000 ms-os egység-költségvetés fölé ment. Vagyis nem a MÉRÉS hiányos, hanem a
FUTTATÁSI MÓD nem hordozható ezen a gépen — és a hivatalos, darabolt út épp ezen bukott el. A kettőt
nem mosom össze: a tartalmi verdikt teljes, a hordozhatóság nem teljesült.
| Az R121 battériája (szomszéd-regresszió) | `npm run verify:app-findings-r121` | **55/55** |
| Határ-önellenőrzés | `npm run app:selfcheck` | **57/57** |
| Szomszéd HTTP-battériák | `verify:app-findings-r91` · `-r95` | **30/30** · **42/42** |
| Nyelvi kapu | `npm run verify:i18n` | **49/49** (+6/6 ellenpróba) |
| Súgó/bemutató kapu | `npm run verify:tutor` | **88/88** (+14/14) |
| Segéd-kapu | `npm run verify:assistant` | **55/55** (+6/6) |
| Böngészős tanú (R123) | `npx playwright test tests/e2e/v3app-r123.spec.mjs` | **5/5** |
| Böngészős tanú (R121) | `npx playwright test tests/e2e/v3app-r121.spec.mjs` | **5/5** |
| A TELJES böngésző-készlet, a csomag záró állapotán | `npx playwright test` | **105/105** |
| KUKA-regiszter (öt új bejegyzés gépi jele) | `npm run verify:kuka` | **514/514** |
| Egyéb célzott kapuk | `verify:artifact-naming` · `verify:release-order` · `verify:sweep-reuse` · `verify:doc-html` · `verify:fogyasztas-meres` | **28/28** · **37/37** · **43/43** · **9/9** · **18/18 ellenpróba** |
| Döntés-szám őr | `npm run verify:decision-numbers` | **4/4** — a következő szabad: D-VS-3086 |

**Az ELŐTTE-PIROS mérés módszere, kimondva:** a battéria a mai belépőt hívja
(`delegationCeilingOf`), amit a régi kód nem ismert. Ezért a piros futáshoz a **régi kódútat**
állítottam vissza: a `6325b6b` commit `delegation.mjs`-e + egy olyan `delegationCeilingOf`, ami a
plafont a RÖGZÍTŐ `deriveDelegationBasis`-on kérdezi meg — vagyis pontosan az F123-01 szerinti, ÍRÓ
döntés. Ez nem „kényelmi" változat: a régi viselkedés hű alakja, és ugyanezt a hibát a rontás-battéria
**M311** tétele is hordozza, függetlenül.

---

## 7. A SAJÁT MÉRÉSI HIBÁM EBBEN A KÖRBEN — kimondva, nem elhallgatva

Az első alakomban a battéria **a régi, hibás kódon is zöld volt** azon a szakaszon, ahol a hiba élt.
Az ok: a mérés előtt egy ellenőrző lépést tettem (`delegationCeilingOf`-fal kiolvastam a plafont),
és a régi kódúton **ez a hívás maga is írt** — vagyis az ellenőrzésem elvégezte azt az írást, amit a
következő lépésben mérni akartam.

**Javítva:** a fixture hatását KÖZVETLEN alap-olvasás igazolja (`basisAsOf`), a plafon-feloldó
hívása a MÉRÉS UTÁN áll, és az elutasított műveleteket **még alap nélküli** eljáróval mérem — mert
a meghívó KIADÁSA maga is rögzíti a kiadó alapját, tehát a könyv kezelőjének az első mérés előtt már
van alapja.

Bejegyezve: **KUKA-259**. A többi négy: **KUKA-255** (a döntés írt) · **KUKA-256** (a nevezett
hibakimenet részleges írást hagyott) · **KUKA-257** (az ismételt megadás duplikált) · **KUKA-258**
(a túlélő rontást kivettem a hiányzó próba helyett).

---

## 8. FUTTATHATÓ ELLENPRÓBÁK A REPÓBAN

```bash
npm run verify:app-findings-r123     # 47 mérés: írásmentes elutasítás · atomi jogkezelés · idempotencia
node v3ref/run.mjs                   # 63 magreferencia-próba, benne a szűk alapú plafon-mérés
npm run verify:v3ref                 # a teljes rontás-battéria (M310…M314 a négy lelet kontrollja)
npx playwright test tests/e2e/v3app-r123.spec.mjs    # 5 böngészős tanú
npm run verify:kuka                  # az öt új KUKA-bejegyzés gépi jelei
```

**A `GET /dev/rowcounts` végpont** a fejlesztői felület része (mint a levél-fogadó és az óra):
**csak darabszámot** ad, tábla szerint, üzleti tartalom nélkül.

---

## 9. AZ SHA-K ÉS A FÁJL-DELTA

- **Ág:** `claude/chatgpt-board-r121-error-favm2e`
- **Kiinduló SHA:** `6325b6bb68479a0776bfa34b910fda80de5726f4` (az R121/R122-es csomag záró állapota)
- **Mért SHA (a csomag mérései ezen az állapoton futottak):** `4d6e73cff2fd09055e1b77adc4a46aeeced226e3`
- **Záró SHA:** ez a bekezdés a mért SHA UTÁN íródott bele, tehát a lap záró commitja eggyel később
  áll — a pontos érték a board-üzenet záró sorában. A mérések a fenti, mért SHA-n futottak; a záró
  commit ettől CSAK ebben a bekezdésben tér el (KUKA-134: a terv nem élheti túl a saját szabályát —
  a mérés és a szállított állapot viszonyát kimondjuk, nem sejtetjük)

**Mag (`v3ref/`)**

| Fájl | Mi változott |
|---|---|
| `delegation.mjs` | **új:** `delegationCeilingOf` (DCE-01, írásmentes) · a megvonás döntése írásmentes · a megadás idempotens + atomi · a MEGHÍVÓ-KIADÁS döntése írásmentes és írása atomi (4/b) · `changed` mező mindhárom íróban |
| `authority.mjs` | **új:** `OperationRefusal` · `refuseAndRollBack` · `atomicOutcome` (ATO-01) |
| `run.mjs` | a `P-SCR-partial-revocation` próba **(i) (j) (k)** mérésekkel — a `(j)` a megvonási, a megadási ÉS a meghívó-kiadási utat is méri; 3 új kiadott állítás |
| `manifest.mjs` | `VERSION_R123` + a három új állítás bizonyíték-kötése |
| `mutations.mjs` | **M310** (visszaállítva) · **M311** · **M312** · **M313** · **M314** · **M315** |
| `legacyAccountFixture.mjs` | **új:** a v1 szabállyal született fiók alakja, a v1 DEKLARÁLT listáiból |

**Alkalmazás (`v3app/`)**

| Fájl | Mi változott |
|---|---|
| `server.mjs` | **új:** `GET /dev/rowcounts` + `ROWCOUNT_TABLES` (13 tábla) |
| `httpSchema.mjs` | a `GET /dev/rowcounts` séma-sora |
| `public/app.js` | a megadás nyugtája a `changed`-et követi · a megvonás nyugtája NEVESÍTETT · a bemutató lépése csak valódi változásra teljesül |
| `public/i18n/{hu,en,de}.mjs` | **új:** `scopeGrantUnchanged` · `scopeRevokeUnchanged`; **kivezetve:** a generikus `scopeUnchanged` |
| `findings_r123.mjs` | **új:** 47 mérés (A–E szakasz) |

**Szerződés-regiszter és lapok**

| Fájl | Mi változott |
|---|---|
| `contracts/retiredPatternRegistry.js` | **KUKA-255 … KUKA-259** |
| `contracts/guardHome.js` | az öt új bejegyzés őr-otthona (mind `v3`) |
| `docs/KUKA_ARCHIVUM.md` | az öt új tábla-sor |
| `DECISION_LOG.md` | **D-VS-3086** |
| `package.json` | `verify:app-findings-r123` |
| `tests/e2e/v3app-r123.spec.mjs` | **új:** 5 böngészős tanú |

---

## 10. NEVESÍTETT MARADÉK — ami NYITOTT, és miért

1. **A képesség-tanú V2-eltérése** — az R123 kimondta, hogy **nem ennek a csomagnak a javítása**, és
   **nem jelölhető zöldnek**. Nem is jelöltem: nyitott, az R121-es leltárban nevesítve.
2. **A régi `external-checks` futtató hiánya** — ugyanígy: **nem ennek a csomagnak a javítása**, nem
   zöld. A lánc ebben a körben **nem futott**, tehát **NEM IGAZOLT** — nem „részben".
3. **A megvonási ág atomi burkolata nem falszifikálható ma** (egyetlen írás áll ott) — a kód és ez a
   jelentés is kimondja; a mérhető bizonyíték a megadási ágon van.
4. **Az ÁTVITT KORLÁT fogalmi kérdése** — mérve: a `grant_basis` a MEGHÍVÓ ALAPJÁNAK plafonját
   viszi, nem a meghívó pecsételt adatkörét. Ez a mai szerződés (ORG-N1b), és ezt a csomag **nem
   változtatta meg**: egy ilyen változás a meghívás jelentését írná át, ami külön parancs tárgya.
   **Következménye, kimondva:** a mai (v2) fiókokban a `outside_basis_scopes` ág a delegált
   admin-úton nem érhető el — a szűkítés ott a **cél** átvitt korlátján (`outside_transferred_limit`)
   és az előfizetés-kapun áll.
5. **A teljes hosszú söprés nem futott** — az R123 kifejezetten nem kérte, és a célzott
   visszaellenőrzés az alapértelmezett (R107). A futtatott kapuk fenti listája a bizonyíték.

---

## 10/b. FOGYASZTÁS — EGY SOR

`npm run meres:fogyasztas -- --session a8dcd237… --from 2026-09-30T12:48:46.535Z --label "R124 csomag"`
· ablak: a parancs board-időbélyegétől a lap zárásáig · **hívás 157** · fő-szál kontextus **medián
292 153** → **normál folytatás** (a 300 ezres sáv alatt) · **ügynök-bemenet 0 (0 ügynök)** — az R123
kikötése szerint egy fő végrehajtóval, ellenőrző ügynökök nélkül · lefedettség: teljes. A tartalom
nélküli leltár: `docs/70_PLANNING/V3_R124_FOGYASZTAS_LELTAR.json`.

---

## 11. AMIT EZ A CSOMAG KIMONDVA NEM BIZONYÍT

- **Nem** bizonyítja, hogy élesben pont úgy bukik a tárolás, ahogy a trigger utánozza. Azt
  bizonyítja, hogy **bármikor** bukik, a művelet saját részleges írása nem marad bent.
- **Nem** bizonyítja, hogy a régi (v1) fiókok a valóságban is így viselkednek — **tárolt** v1
  alakon mér, valódi fixture-rel; éles v1 adat nincs, mert a V3-ban nulla migráció áll.
- **Nem** böngészős audit és nem vizuális felülvizsgálat; a levél-fogadó fejlesztői próbaüzenet.
- **Nem** teljes söprés (lásd 10/5.), és a két nevesített nyitott lánc **nem zöld**.
