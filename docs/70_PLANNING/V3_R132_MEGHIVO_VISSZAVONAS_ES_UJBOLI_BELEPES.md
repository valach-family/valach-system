> **Sáv:** Claude-v3 · **Kör:** R133 · **Állapot:** lezárt

# R132 — Meghívó visszavonása és munkatárs újbóli belépése

**CMD-VS-300-002-002 R133 — REPORT** · 2026-10-01 · PR-VS-300 · STEP-VS-300-002
Repó: `valach-family/valach-system` · Végrehajtó: Claude-v3 · Tervező/ellenőrző: chatgpt-v3
Szülő: `CMD-VS-300-002-002 R132 — SPEC`

---

## 1. Mi lett kész — közérthetően

**Két dolgot tud mostantól a kezelő, amit eddig nem.**

**(1) Vissza tud vonni egy kiküldött meghívást.** Eddig ha egy meghívás tévedésből ment ki, nem
volt mód érvénytelenné tenni: a kezelő legközelebbi elérhető művelete a kiadó *egész* jogának
elvétele volt — vagyis a szándékához („ezt az egy ajánlatot ne lehessen beváltani") egy
nagyságrenddel tágabb hatás tartozott. Mostantól a Felhasználók képernyő „Elfogadásra vár" fülén
minden függő meghívás mellett ott a **„Meghívás visszavonása"** gomb. A visszavonás után a
kiküldött hivatkozás nem használható — sem közvetlen beváltással, sem belépés utáni folytatással,
sem a hivatkozás megnyitásával. Senki tagsága nem szűnik meg tőle, és más hozzáférés nem változik.

**(2) Vissza tud hívni egy korábban eltávolított munkatársat.** Eddig egy megszüntetett tagságra a
rendszer megállt („ehhez a könyvhöz korábban visszavont tagságod van"), és nem volt út tovább. Ez a
védelem **megmaradt** — nem lazítottuk ki. Mellé került egy külön, kimondott művelet: a tag lapján az
**„Újbóli belépés"** szakaszban az **„Újra meghívás"** gomb. Amit a megerősítés kimond, és ami a
rendszer viselkedése is: *a címzettnek magának el kell fogadnia*, és *a korábbi adat-hozzáférései nem
állnak vissza*.

**A harmadik, és üzletileg a legfontosabb: a visszahívott munkatárs nem kapja vissza magától, amit
korábban látott.** Ha valaki korábban látta az árakat, és eltávolítás után visszahívjuk, az új
belépéssel **mind a négy adatkör zárva van**. A mennyiséget, az árat, a dokumentumokat és a
beszállítói adatokat külön, újra meg kell adni. A régi engedélyek nem törlődtek — a történetben
megvannak, és a régi időszakra nézve ma is igazak —, csak a mai jogra nem hatnak.

**Amit a képernyő ettől jobban mond:** a meghívó-lista négy állapotot *külön* mutat (elfogadásra
vár · elfogadva · lejárt · visszavonva), az eltávolított munkatárs pedig **visszakereshető** marad a
tag-listán, és a rendszer megmondja, ma újrahívható-e — és ha nem, miért nem.

---

## 2. Az elfogadási feltételek — A132-01…10

Minden sor **MÉRT** bizonyítékra hivatkozik. A mérés *hol* futott, az a bizonyíték-oszlopban áll.

| ID | Állapot | Bizonyíték |
|---|---|---|
| **A132-01** | **TELJESÜLT** | A függő meghívó külön visszavonható, és MINDEN út zár. `findings_r132.mjs` A szakasz (a1)–(a11): UI→HTTP→DB, a visszavonás SAJÁT eseményt ír és semmi mást (`invite_revocation` 0→1, `membership`/`scope_grant` változatlan); a megfigyelés, a közvetlen beváltás és a belépés utáni folytatás MIND `invite_revoked`-ot ad; tagság NEM születik. Böngészős tanú: `v3app-r132.spec.mjs` **R132-B1** (valódi DOM, a címzett saját böngészőjében). Mag-próba: **P-INVITE-revoke** (a)–(g). |
| **A132-02** | **TELJESÜLT** | Jogosulatlan · idegen fiókú · elavult kontextusú · érvénytelen alapú művelet HATÁSMENTES, pozitív ellenpárral. `findings_r132.mjs` B szakasz (b1)–(b5) és F (f5a)/(f5b): minden elutasítás írásmentes (`/dev/rowcounts` különbség üres), a jogosult+helyes nézetű kérés MŰKÖDIK, az idegen könyv jelölője a nem létezővel AZONOS választ kap, és az idegen néző se meghívólistát, se token-adatot, se címet nem kap. |
| **A132-03** | **TELJESÜLT** | Beváltás ↔ visszavonás **MINDKÉT** véglegesítési sorrendje **KÉT VALÓDI, külön OS-folyamatban** nyitott kapcsolaton: `npm run proof:multiconn` (4) szakasz — 6/6 menet OK, 3 menet „visszavonás előbb" (0 tagság · 0 esemény · 1 visszavonás-sor · a beváltás `invite_revoked`), 3 menet „beváltás előbb" (1 tagság · 1 esemény · 0 visszavonás-sor · a visszavonás `invite_already_redeemed`/`changed:false`). **Pontosan EGY hatás**, és a vesztes nyugtája NEVEZETT és igaz. Ha csak egy sorrend fordulna elő, a futtató nevezett kilépési kóddal HIÁNYOS MÉRÉST jelent, nem zöldet. |
| **A132-04** | **TELJESÜLT** | A rendes meghívó NEM reaktivál (a token sem fogy el), az újrahívás AJÁNLATOT ad, és a tagságot a címzett SAJÁT elfogadása hozza létre. `findings_r132.mjs` C (c1)–(c9): a döntés + meghívó + pecsét EGY tranzakcióban születik, a tagság az ajánlat után MÉG NEM áll fenn, a token NEM megy vissza a felületre (a címzett a levélből kapja), és ugyanaz a személy — változatlan hitelesítő adattal, érintetlen más fiókokkal. Böngészős tanú: **R132-B2**. Mag-próba: **P-ORG-reentry** (a)/(b)/(c). |
| **A132-05** | **TELJESÜLT** | A régi jogok NEM élednek fel. `findings_r132.mjs` D (d1)–(d6): új belépés után **mind a négy** adatkör zárt, nevezett okkal (`scope_grant_other_period`), a RÉGI megadás-esemény viszont megvan (nem töröltük); a delegálási alap sem éled fel; a korábban kiadott függő meghívó sem ad új jogot vagy időszakot; és ÚJ, kifejezett készlet-megadás után a **mennyiség igen, az ár/dokumentum/beszállító nem**. Böngészős tanú: **R132-B2** (6)–(7). Rontás-kontroll: **M322** (az időszak-szűrő kiesése) bizonyítottan megbuktatja a P-ORG-reentry próbát. |
| **A132-06** | **TELJESÜLT** | Régi időszak → megszűnt köztes szakasz → új időszak, két tengelyen reprodukálható. `findings_r132.mjs` E (e1)–(e8): a történet két (majd három) időszakot visz, a KÖZTES pillanatra a tagság nem állt fenn, a RÉGI időszak belsejére a tagság ÉS a régi jog ma is igaz, a régi események sértetlenek (2 tagságadás · 1 megvonás), és a MÁSODIK visszahívási ciklus is végigvihető. A kötés esemény-azonosítón áll, nem dátumon — azonos időbélyegnél a sorszám dönt. |
| **A132-07** | **TELJESÜLT** | Megváltozott célállapot, tiltás/felfüggesztés/felülvizsgálat, címeltérés és korábbi ciklus ajánlata nem kerülhető meg. `findings_r132.mjs` F (f1)–(f5b): egy KORÁBBI megszűnésre kiadott ajánlat nem nyitja újra a KÉSŐBBIT; ma élő tagságra nincs újrahívás; a zárt szerep-készleten kívüli szerep a határon zár; FELFÜGGESZTÉS mellett nevezetten zár, és a MEGLÉVŐ eljárásra mutat (`next_step: lift_suspension`); érvénytelen (megvont) alap mellett minden rendelkezés elakad — mind ÍRÁSMENTESEN. Mag-próba: **P-ORG-reentry** (f)/(g). |
| **A132-08** | **TELJESÜLT** | Egyszeri hatás. `findings_r132.mjs` G (g1)–(g6): két újrahívás két ÖNÁLLÓ ajánlat (nem elnyelt, nem duplikált); az elveszett nyugta utáni ISMÉTLÉS nem ad második hatást; több párhuzamos ajánlatból sem lesz két ÉLŐ időszak; és a NULLA SOROS írás (döntés-sor és visszavonás-sor) a TELJES egységet visszagörgeti — se meghívó, se pecsét, se alap nem marad. A párhuzamos BEVÁLTÁS tanúja a `proof:multiconn` (1) szakasza (1 tagság · 1 esemény · 1 `grant_basis`). **KIMONDVA:** a G szakasz ismétlései EGY kapcsolaton futnak; a valódi verseny tanúja a `proof:multiconn`. |
| **A132-09** | **TELJESÜLT** | HU teljes történetek, EN/DE célzott út, mobilos használhatóság. `npx playwright test` **117/117**, benne az öt új helyzet: **R132-B1** (1. történet végig), **R132-B2** (2. történet végig), **R132-B3** (EN/DE: állapot-szövegek · újrahívás szakasz · megerősítő mondat · visszavonás felirata), **R132-B4** (390 képpont: a lista és az újrahívás gombja TÉNYLEGESEN megnyomható, nincs vízszintes csúszás), **R132-B5** (a „mégse" NEM ÍR). A lépésenkénti útmutatók: **R93-01** — MIND A TIZENEGY „befejezve", köztük a két új (`tour.inviteRevoke` · `tour.reentry`). |
| **A132-10** | **TELJESÜLT, nevezett maradékkal** | Szerződés–út–próba–állítás–cáfolat kapcsolat: a két új mag-próba a `manifest.mjs`-ben az ORG-N1a-hoz kötve, és a **négy új rontás (M320–M323) bizonyítottan megbuktatja őket** (mindegyik FAIL a catcher próbán). GPR-01 friss: új út **GP-MEMBERSHIP-REENTRY**, a `membership_reentry` a jogadó táblák között, az írás-hely szám és a padló (12→13) frissítve, és a `GP-INVITE-REDEEM`/`GP-DELEGATED-INVITE` elavult „nincs visszavonás" szövege átírva. ORG-N1a `remaining` friss: a két nevezett hiány MEGÉPÜLT, a történeti vállalást nem írtuk át. **Nevesített maradék:** a req-5 NEM lépett életbe (lásd 5. szakasz). |

---

## 3. Történeti kompatibilitás — mi NEM változott

- **A `membership` kulcsa MARAD alany × könyv.** A sor a MAI VETÜLET; a történet a
  `membership_grant` és `membership_revocation` naplókban áll, és ott minden időszak megmarad.
  Pozicionálisan írt `membership` sor (a külső fél programjaiban és a próbákban) **változatlanul
  működik** — egyetlen új oszlopot sem vettünk fel rá.
- **Az `invite` táblára sem került oszlop.** A visszavonás külön tábla, mert a meghívók egy része
  nyolc értéket felsoroló, pozicionális írással születik; egy kilencedik oszlop ezeket azonnal
  eltörte volna.
- **A már létező, EGYSZERI tagságok adatkörjogai változatlanul élnek.** A jog-sorok időszak-kötése
  nullable, és a NULL jelentése KIMONDOTT: az adott alany × könyv **ELSŐ** tagságadó eseményéhez
  tartozik. Egyetlen időszaknál az ELSŐ egyben a MAI is — tehát a feloldás eredménye azonos a
  korábbival. Adatot nem dobtunk el, és semmit nem „engedélyeztünk újra" általánosan.
- **A `revoked_needs_decision` védelem változatlan.** Rendes meghívással egy megvont tagság ma sem
  éled fel; az újranyitás KIZÁRÓLAG tárolt újrahívási döntéssel nyílik meg.
- **A 63 korábbi mag-próba és a 112 korábbi böngészős helyzet változatlanul zöld.** Két próba és öt
  böngészős helyzet jött hozzá; két meglévő próba pinelt száma a KÉT ÚJ KÉPESSÉG miatt nőtt
  (útmutatók 9→11), és mindkettőt VÉGIG is visszük, tehát a szám nem tud üres pipává válni.

---

## 4. Három saját lelet — amit a mérés fogott meg, nem a figyelem

| KUKA | Mi volt | Hogyan derült ki |
|---|---|---|
| **KUKA-266** | Az újranyitási döntést a SAJÁT írásom UTÁN mértem, ezért a frissen beírt esemény „elnyomta" a korábbi megvonást: a védett ág **soha nem futott le**, és a jogos beváltás egyediségi hibára szaladt — a visszahívott munkatárs nem tudott belépni. | A `findings_r132.mjs` (c8) állítása, VALÓDI HTTP-n. |
| **KUKA-265** | A nyugta megjelent, és a következő pillanatban nyom nélkül eltűnt: a teljes oldalt újraépítő lekérés letörölte. A kezelő sikeres visszavonás után ÜRES képernyőt látott. | A böngészős próba (R132-B1), a valódi DOM-on. |
| **KUKA-264** | A lépésenkénti útmutató örökre „még nem érhető el" állapotban maradt (az újraértékelő csak panel/súgó nyitásra futott), és a várakozó kártya a SAJÁT szövegével eltakarta azt a gombot, amit megnyomni kért. | A MINDEN útmutatót végigjáró böngészős próba (R93-01). |

Mindhárom gépi jelet kapott (`verify:kuka` pozitív és tiltó minták), és mindhárom szerepel az
archívum-táblában. A KUKA-266-ot a mag rontás-battériája is védi (M322/M323).

**És egy NEGYEDIK, amit a kör végi söprés fogott meg — kimondva, mert ez a lényeg.** A mag-próbák
zöldek voltak (65/65), a söprés viszont a rontás-battérián **PIROSAT** adott: egy régi rontás (M24 —
„a visszavont tagság némán elnyelődik, a meghívó elfogy hozzáférés nélkül") **nem volt
alkalmazható**, mert a csomagom átírta azt a kódrészletet, amire horgonyozva volt. A battéria ezt
nem zöldnek, hanem **„elavult horgony"**-nak mondta — vagyis kimondta, hogy ott nem MÉRTÜNK, nem
pedig azt, hogy rendben van. Az ok szerkezeti és a javítás egyszerű volt: a beváltás korábban KÉT
helyen kérdezte meg magától ugyanazt, az R132 ezt EGY feloldóba vonta össze — tehát a rontás ma EGY
horgonnyal **többet** fed, nem kevesebbet. Újrahorgonyozva, és MÉRVE: a rontás alatt a célzott próba
elbukik, ahogy kell. A teljes horgony-átvizsgálás **225 rontás · 0 hibás horgony** — az M24 volt az
egyetlen. *Ez a kör legfontosabb tanulsága a munkamódszerről: a próbák zöldje nem a védelem zöldje.*

---

## 5. Nevesített maradék — amit ez a csomag KIMONDOTTAN nem zár le

1. **A req-5 NEM lépett életbe, és az ORG-N1a nem záródott le.** A klauzula `remaining` szövege az
   R132 előtt KÉT hiányt nevezett meg, és mindkettő megépült — de ez **nem azonos** a klauzula
   minden vállalt állításának bizonyításával. A kötelezővé emelés a SPEC §8 szerint külön,
   független döntés; ebben a körben nem minősítjük megépültnek.
2. **A visszahívás NEM oldja fel** a felfüggesztést, a tiltást, a nyitott felülvizsgálati kört és a
   visszamenőleges érvénytelenséget. Mind a négy NEVEZETT zárás, a meglévő jogosult eljárásra mutató
   folytatással (`next_step`). Ez a művelet **hatóköre**, nem hiánya.
3. **A visszahívás nem utólagos joghatás-felülvizsgálat és nem a REV-N4 kompenzáló folyamat** —
   azok továbbra is nyitottak.
4. **Egy kivezetett eset, kimondva:** ha a visszahívott munkatárs ELFOGADJA az új meghívást, és
   utána beváltja egy RÉGI, még függő, UGYANARRA a szerepre szóló meghívóját, a token elfogy, és a
   válasz `already_active`. Jog nem keletkezik és nem változik — de a token fogyása mérhető hatás,
   és nem állítjuk, hogy a régi ajánlat „nyomtalan". A szerep-eltérő régi ajánlat `role_differs`
   néven zár, tehát jog-emelés ezen az úton nincs.
5. **A cross-tab észlelés korlátja MARAD** (R131-ben nevesítve): a másik lapon történt változást a
   nyitott nézet nem észleli azonnal. A böngészős próba ezt nem kerüli meg: a kezelő frissít, és a
   próba MÉRI, hogy a frissítés után a képernyő az ÚJ igazságot mutatja.
6. **A `membership_reentry` csak a mai, jelen idejű megszüntetés utáni visszahívást fedi.** A
   négy határ (2. pont) ezt kimondja; visszamenőleges döntésre nem építhető rá.
7. **Az általános szervezeti képviselet (ORG-N3) továbbra is KÜLÖN HATÁR, nem hiány.**

---

## 6. Mérések — friss és örökölt KÜLÖN

**FRISSEN FUTOTT ebben a körben** (mind a záró forráson vagy annak közvetlen elődjén):

| Mérés | Eredmény |
|---|---|
| `npm run verify:v3ref` (mag-próbák) | **65/65 PASS** (63 örökölt + 2 új) |
| a négy új rontás célzott ellenőrzése | **4/4** — M320 · M321 · M322 · M323 mindegyike a catcher próbát FAIL-re viszi |
| `npm run verify:app-findings-r132` | **63/63 PASS** (valódi HTTP + valódi tároló) |
| `npm run proof:multiconn --n=6` | **18/18 OK** · mindhárom verseny **mindkét** sorrendje mérve |
| `npx playwright test` (teljes böngészős csomag) | **117/117 PASS** (112 örökölt + 5 új) |
| `npm run verify:kuka` | **530/530 PASS** |
| `npm run verify:grant-paths` | **13/13 PASS** + 3/3 ellenpélda bizonyítottan PIROS |
| `npm run verify:i18n` | **49/49 PASS** + 6/6 ellenpróba |
| `npm run verify:tutor` | **88/88 PASS** + 14/14 ellenpróba |
| `npm run verify:assistant` | **55/55 PASS** + 6/6 ellenpróba |
| `npm run app:selfcheck` | **57/57 PASS** |
| `npm run verify:decision-numbers` | **4/4 PASS** (következő szabad: D-VS-3091) |
| `npm run verify:v3ref` **mutációs fele** (a söprés PIROSA volt) | **225/225 elkapva · 0 túlélte · 0 elavult horgony — „TELJES ÉS TISZTA"**, az M24 újrahorgonyozása után külön futtatva (8. szakasz) |
| horgony-átvizsgálás (mind a 225 rontás illeszkedése) | **225 mért · 0 hibás horgony** |
| `npm run verify:external-checks` (a söprés türelmén túlfutott) | **13/19 megfelel** — a hat eltérés mind ÖRÖKÖLT vagy elakadt mérés, A/B-vel mérve (8. szakasz) |
| `r57a` az INDULÓ fejen (`d9d940fb`, külön munkafán) | **ugyanaz a négy eltérés** ⇒ örökölt |
| `r83core` egyedül, a jelenlegi fejen | **7/7 eset zöld, „MEGFELEL"** ⇒ a lánc-futásbeli bukás elakadt mérés volt |

**ÖRÖKÖLT, forráskötéssel:** a `v3ref/external-checks/results/` eredmény-fájljai az **elfogadott**
alakjukban maradtak (`8124107`/`d9d940fb` korszak). **Kimondva, miért:** a kör közben indított
söprés egy MÉG VÁLTOZÓ munkafán regenerálta őket, tehát a tartalmuk sem a kiinduló, sem a záró
állapotot nem írta le hűen — ezért visszaállítottuk őket (`git checkout`), és a teljes söprés a
TISZTA, commitolt fán futott újra. A söprés eredménye a 8. szakaszban áll.

**AMIT NEM MÉRTÜNK, ÉS EZÉRT NEM IS ÁLLÍTUNK:** nem Postgres és nem hálózati kérésfogadási határ (a
`proof:multiconn` egy gépen, egy fájlon, két folyamattal mér — az OB-1 zárófeltétele ettől nem
teljesül) · nincs kettőnél több író, terhelés vagy skála · nincs valódi külső levélküldés (a
hivatkozás a próbaüzenet-fogadóból jön) · a `v3app` rétegre a mutációs battéria nem fut, ott a
HTTP- és böngészős battéria a bizonyíték.

---

## 7. Ág, SHA-k és kipróbálási sorrend

- **Ág:** `claude/cmd-vs-300-002-002-r132-4e46mk`
- **Induló fej:** `d9d940fb32bc417824e5b533e7fe2cc22145d9d4` (az elfogadott `8124107` leszármazottja)
- **MÉRT SHA a TERMÉKKÓDRA:** `ebd1d35` — a mag-próbák, a HTTP-battéria, a verseny-bizonyító és a
  böngészős csomag ezen a tiszta munkafán futottak
- **JAVÍTÓ commit a RONTÁS-REGISZTERRE:** `4745e89` — az M24 újrahorgonyozása (a söprés pirosának
  javítása). **Ez termékkódot nem érint:** a rontás-regisztert kizárólag a mutáció-futtató olvassa,
  a `v3ref/run.mjs` próbái nem — ezért a `ebd1d35`-ön mért eredmények érvényben maradnak, és a
  rontás-battéria újramérése a `4745e89`-en futott
- **ZÁRÓ commit:** ez a jelentés + a fogyasztás-leltár (dokumentum-változás; termékkódot nem érint)

**A három viszonya kimondva:** a termék-mérések a `ebd1d35` tiszta munkafáján futottak; a `4745e89`
CSAK a rontás-regiszter horgonyát javította, és a rontás-battériát ott mértük újra; a záró commit
pedig csak ezt a lapot és a leltárt adja hozzá.

**Rövid kipróbálási sorrend** (az operátor gépén, a kijelölt ágon — ez az ág **nincs** a `main`-en
összeolvasztva, ezért a szokásos `main`-es blokk ezt NEM mutatja meg):

1. `npm run app:dev`, majd a böngészőben regisztráció → e-mail megerősítés a Próbaüzenetekből → belépés
2. Vállalkozás hozzáadása (adószám kell), majd **Felhasználók** → „Felhasználó meghívása"
3. **1. történet:** „Elfogadásra vár" fül → a sor **„Meghívás visszavonása"** gombja → megerősítés.
   Nyisd meg a levélben kapott hivatkozást egy másik böngészőben: zárt, érthető mondattal.
4. **2. történet:** hívj meg valakit, fogadd el a másik böngészőben, adj neki **Készlet** és **Árak**
   hozzáférést, majd „Hozzáférés megszüntetése ebben a fiókban”.
5. A tag-listán a sor **megmarad** („Megszüntetve"). Nyisd meg: **Újbóli belépés** → „Újra meghívás".
   A megerősítés kimondja, hogy a címzettnek el kell fogadnia, és a régi jogok nem állnak vissza.
6. A másik böngészőben fogadd el az új meghívást → **tagság van**. Nézd meg a Készletegyenleget:
   **nincs adat**. A kezelő adja meg újra a **Készlet** hozzáférést → a mennyiség látszik, az **ár
   továbbra sem**.
7. Végigvezetés: **Súgó → Útmutatók →** „Egy kiadott meghívás visszavonása" és „Eltávolított
   munkatárs visszahívása".

---

## 8. Teljes söprés és a board-mátrix

A kör végén **egy** teljes söprés futott, a TISZTA, commitolt fán (`ebd1d35`). Az eredmény és a
NEVEZETT kivételek:

**A söprés nyers eredménye** (`ebd1d35`, tiszta fa, 31 verifier, 1366 s):
**28 zöld · 0 környezeti kihagyás · 1 NEM FEJEZŐDÖTT BE · 2 PIROS.**

Ezt a három nem-zöld tételt KÜLÖN mértük meg, mert a söprés türelme nem verdikt:

**(1) `verify:v3ref` — PIROS volt, és a piros A SAJÁT CSOMAGOMÉ volt.** A mag-próbák zöldek voltak
(65/65), a rontás-battéria viszont nem: a 25/80 szelet „nem tiszta" minősítést kapott, mert egy régi
rontás horgonya elavult (M24 — a 4. szakasz utolsó bekezdése írja le). **Javítva és ÚJRAMÉRVE,
külön, a söprés türelme nélkül** (`4745e89`): **225 mutáció · 225 elkapva · 0 túlélte · 0 rossz
próba · 0 mérőhiba · 0 elavult horgony · „TELJES ÉS TISZTA"**, kilépési kód 0. A battéria gépi
eredménye a commitban áll (`v3ref/v3ref-mutation-result.json`, lefedettség 225/225 a RÉSZLETES
eredményekből, hiány 0, duplikátum 0).

**(2) `verify:external-checks` — NEM FEJEZŐDÖTT BE a söprés 900 s türelmén belül (901 s).** Ez nem
bukás és nem kihagyás, ezért külön, türelem nélkül végigfuttattuk: **13/19 program MEGFELEL**,
eltérés `r83core · r79 · r59a · r57a · r59 · r57`. **Mind a hat eltérés ÖRÖKÖLT vagy ELAKADT MÉRÉS —
és ezt MÉRTÜK, nem feltételeztük:**
- **`r79 · r59a · r59 · r57`** — már az ELFOGADOTT fejen is eltértek: a repóban commitolt, elfogadott
  összesítő maga is `ok:false`-ot rögzít. Ezeken a csomag nem változtatott.
- **`r57a`** — az elfogadott összesítőben „megfelel" állt, ebben a futásban eltér. **Lemértük az
  INDULÓ fejen is** (`d9d940fb`, külön munkafán): **karakterre UGYANAZ a négy eltérés** (E02 · E03
  hiányzik és elbukik). Tehát ÖRÖKÖLT, nem a csomag műve. Az ok mérhető: ugyanaz a program az
  elfogadott futásban 483 599 ms-ot, most 48 003 ms-ot futott — korán elakad, időzítés-érzékenyen.
- **`r83core`** — a lánc futása alatt a programonkénti 600 s plafonba futott (`ETIMEDOUT`), tehát
  ELAKADT MÉRÉS. **Egyedül, a jelenlegi fejen újrafuttatva: 7/7 eset zöld, „MEGFELEL", 396 780 ms.**
  Hogy a plafon miért fogott: ebben a futásban MINDEN hosszú program 1,2–1,8-szor lassabb volt
  (`r81core` 324→385 s · `r55` 210→286 s · `r79` 491→571 s) — a gép terhelése, nem a termék.
- **A hivatkozott eredmény-fájlok ezért az ELFOGADOTT alakjukban maradtak** (`git checkout`,
  utána `git diff --quiet`): egy terhelés miatt elakadt programot tartalmazó futás nem írhatja felül
  a teljes mérés lapját (KUKA-206). Ami ebből a körből bekerül, az a rontás-battéria TELJES, tiszta
  eredménye.

**(3) `verify:capability-witness` — PIROS, ÖRÖKÖLT, és már nevesített.** A V2 board-regiszteréhez
mért képesség-tanú: `8/11 egyezik — 3 ELAVULT RÖGZÍTÉS · 2 gépileg nem mérhető (kimondva)`. A
regiszter a V2 repóban él (`/home/user/vs/tools/chatops-board/config/matrix-capabilities.json`), a
javítása **V2-módosítás volna, amit a SPEC §8 kizár**. Az R131 döntése ezt már nevesítette.

**Összefoglalva, egy mondatban:** a söprés egy VALÓDI, saját hibát talált (az elavult rontás-horgony),
azt kijavítottuk és újramértük; a másik két nem-zöld tétel örökölt vagy terhelés miatt elakadt
mérés — **mindhárom esetben MÉRÉSSEL**, nem magyarázattal zártuk le.

**Board-mátrix:** a zárás mátrixa (`close-cmd`/`close-step`/`close-pr`) **ebből a repóból nem
futtatható** — a katalógus a V2 repóban él, és az eszköz ezt nevezett hibával mondja ki. Ezért
CMD/PR-zárás nincs, és a mátrix-tételek állítása sem történt meg; a kör lapja és üzenete viszont
felkerült a boardra. Ez **nem** a csomag hiánya, hanem a két repó közötti, már ismert határ.

---

## 9. Határok, amiket a csomag nem lép át

Nincs merge, nincs éles telepítés, nincs V2-módosítás, nincs új fizetős szolgáltatás, nincs külső
címzettnek küldött levél, és nincs core-, CMD- vagy PR-zárás. A req-5 nem lépett életbe. A csomagot
review-ra adom át; a független elfogadás a **chatgpt-v3** feladata.

**Munkamenet-mérés (egy sor, a rend szerint):** ablak `CMD-VS-300-002-002 R132`, 256 hívás,
fő-szál kontextusmedián **567 689**, lefedettség **teljes**, ügynök-bemenet 0 (automatikus
agentmunka nem futott). A **chatváltási jelző ELÉRVE** (≥ 400 000): ezt a megkezdett csomagot a
szabály szerint befejeztem, a **következő önálló nagy blokk friss beszélgetésben induljon**.
Tartalommentes leltár: `docs/70_PLANNING/V3_R132_FOGYASZTAS_LELTAR.json`.
