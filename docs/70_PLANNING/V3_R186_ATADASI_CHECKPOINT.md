# V3 · R186 — ÁTADÁSI CHECKPOINT (a RÉGI író utolsó lapja)

`CMD-VS-300-002-002 R187 — NOTE` · 2026-10-09 · `PR-VS-300` · `STEP-VS-300-002`
Feladó: **Claude-v3** (régi író) · Címzett: **chatgpt-v3**, **operátor**, és a **friss Claude-v3
beszélgetés** (új író) · Szülő: `CMD-VS-300-002-002 R186 — SPEC`

---

## 0. EGY BEKEZDÉSBEN, ÜZLETI NYELVEN

Az R186 parancs a **(b) irányt** választotta: ez a munkablokk **rendezett átadással zárul**, a
fennmaradó munka **friss beszélgetésben** folytatódik, **ugyanazon a PR-en**. Ez a lap az átadás:
megmondja, **melyik kódot** adom át, **mi van készen**, **mi nincs**, **mit nem szabad elhinni**, és
**hogyan indul el** a próbakörnyezet. A parancs négy prioritását (bejáró · történet-azonosság ·
hét piros program · bizonyítékpótlás) **NEM kezdtem el** — az az új író dolga, és a parancs is így
rendeli. Ami ebből **már kész**, azt a 3. szakasz nevezetten elkülöníti attól, ami **nincs**.

---

## 1. A PONTOS FEJ — AMIT ÁTADOK

| | |
|---|---|
| **a kód feje (amit mértem)** | **`61881f2`** — a kötelező böngészős kapu EZEN a fejen zöld |
| **az ág feje (a jelentés-commit)** | **`38e0f1c`** — csak `docs/` lapot visz, kódot NEM érint |
| **ágak, amikre fel van tolva** | `claude/cmd-vs-300-002-002-r166-x7rrk4` (a kijelölt ügynök-ág) **és** `claude/r154-audit-fix` (a PR feje) — mind a kettő `38e0f1c`-n áll |
| **PR** | `valach-family/valach-system#1` · nyitott, **nem** mergelt · célág `claude/ecstatic-fermi-8c23co` · összeolvasztható (nincs ütközés) |
| **nem commitolt változás** | **ennek a lapnak a feltöltése előtt kettő**, mindkettő ehhez az átadáshoz tartozik: `v3ref/source-documents/R186_board_v1.md` (a SPEC szó szerint) és `docs/70_PLANNING/V3_R186_FOGYASZTAS_LELTAR.json` (tartalom nélküli leltár). **Ez a commit beviszi mindkettőt** — utána a munkafa TISZTA, és nincs át nem adott helyi munka |
| **futó folyamat** | **nincs** — a böngészős kapu lefutott és kilépett, nincs nyitott Playwright-, kiszolgáló- vagy mérő-folyamat |
| **saját tartós figyelés** | **leállítva** (lásd a 6. szakaszt): a PR-figyelés leiratkozva, ütemezett önellenőrző ébresztés **nincs** (a lista üres volt és üres is marad) |

**A `61881f2` a `2efaad3` igazolt leszármazottja** (a PR-fej, amit a review olvasott): `2efaad3` →
`61881f2` → `38e0f1c`. Force-push nem történt, történetet nem írtam át.

---

## 2. A MÉRT ÁLLAPOT — EGY TÁBLÁBAN (a `61881f2`/`38e0f1c` fejen)

| mérce | verdikt |
|---|---|
| **kötelező böngésző-kapu** (`verify:browser-gate`) | **ZÖLD** — **148 teljesült · 0 bukott · 0 ingadozó · 0 kihagyott**, 26 próba-fájl; `test:e2e + proof:core-ux` **514 s** · `proof:demo-walk` **479 s** (73 állítás) |
| `verify:kuka` | **ZÖLD — 1040/1040** · 434 bejegyzés (`KUKA-416`…`KUKA-443` ebben a csomagban); a `vs`-padló **92**, nem emelkedett |
| `verify:app-findings-r154` | **ZÖLD — 346/346** (`as37` új; az `ar9` átkötve a bejáró MAI otthonára) |
| `verify:decision-numbers` | **ZÖLD — 4/4** · `D-VS-3210`…`D-VS-3237`; a következő szabad: **`D-VS-3238`** |
| `verify:doc-html` | **ZÖLD — 9/9** (`docs:html` lefuttatva) |
| **külső ellenőrző lánc** | **NEM TELJES — 12 ZÖLD / 7 PIROS**; hat pirosnál a mért ok `spawnSync ETIMEDOUT`. A 19/19 **nem állítható** |
| **lefedési őr** | **17 ZÖLD / 1 PIROS** — pótolható **0** · osztályozatlan **0**; az `LT` szándékosan piros (a nevesített `personal.ownMatters` rés) |
| **fogyasztás** (mérve, modellhívás nélkül) | ablak `2026-10-08T00:00:00Z → 2026-10-09T08:20:00Z`: **1082 hívás** · fő-szál kontextusmedián **441 452,5** · max 782 838 · **ügynök-bemenet 0** · lefedettség **teljes** → a sáv **VÁLTÁS** (`D-VS-3083`). Leltár: `docs/70_PLANNING/V3_R186_FOGYASZTAS_LELTAR.json` (tartalom nélküli) |
| **review által FEDETT SHA** | **`2efaad3`** — kód-review 2026-10-09 07:42 UTC, biztonsági review 07:38 UTC. A mai fej (`61881f2`/`38e0f1c`) **NEM fedett** |

**Amit ezek a számok NEM állítanak** (`KUKA-216`): a 148-as kapu az **én** mérésem, és — ahogy az
R186 kiindulása is kimondja — a mérőeszköz-lelet miatt **nem** bizonyítja minden felkínált útmutató
teljes bejárását. A 12/7 külső állapot **nem** elfogadás. A válaszolt review-szál **nem** elfogadás.

---

## 3. AZ R186 NÉGY PRIORITÁSA — MI KÉSZ, MI NINCS (ez a lap LÉNYEGE)

### 3.1 §1 — a bejáró ne állítson teljesítést részleges futásról → **RÉSZBEN KÉSZ**

**AMI KÉSZ** (`61881f2` · `KUKA-443` · `D-VS-3237`), mert a lelet a parancs megírása ELŐTT érkezett,
és még a régi munkablokkban javítottam:
- a verdikt (`walkOutcome`) és a jelentés-sor (`walkReport`) a bejáró **közös otthonába** került
  (`tests/e2e/tourWalk.mjs`), és **mind a négy** hívó azt kérdezi — **a névtelen ÉS a bejelentkezett
  ág is** (`R166-U1` · `R166-U2` · `R166-U3` · a minta-kapu őre);
- a `taskStop` és az `elert` többé nem olvad `OK`-ká; az `elert !== lepes` nevezett ok nélkül is
  `MEGSZAKADT`;
- **a kiírt szám a MÉRÉSBŐL jön** (`r.elert`), nem a regiszterből (`r.lepes`);
- a pótolt tizenkettőnél a követelmény a **TELJES** bejárás maradt, tehát egy jövőbeli `task` ott
  **nevezett pirosat** ad, nem csendes zöldet;
- **mért visszacsúszás:** a régi alakkal az `R166-U5` próba **PIROS**, a maival **ZÖLD**;
- **mért hatókör:** a lelet **lappangó** volt — a pótolt tizenkettő közül ma **egyetlen** lépés sem
  deklarál `task`-ot, tehát hamis zöld a mai fejen **nem keletkezett**. A javítás a **csapdát** zárja be.

**AMI NINCS KÉSZ, és az új íróra vár** (a parancs §1 másik két kérése):
- **„a teljes bejárásként számolt történetnél valódi művelet után MINDEN későbbi lépést is mérj"** —
  ehhez a bejárónak **el kell végeznie** a feladatot (meghívó létrehozása, jog kiadása), amit ma nem
  tud. **Nem építettem meg.**
- **„célzott ellenpróba bizonyítsa, hogy az ELSŐ FELADAT UTÁNI hibát is észleli a teljes bejárást
  állító mérés"** — **nincs meg.** A mai `R166-U5` azt bizonyítja, hogy a részleges futás nem olvasható
  teljesnek; azt **nem**, hogy egy feladat utáni hibát a mérés elkapna.
- a korábbi számok **történeti adatként** megvannak (a jelentés 1. és 7.3–7.4 szakasza a 147-es és a
  148-as mérést is nevezetten hordozza, körönként).

### 3.2 §2 — egy történet ugyanazt a meghívót és résztvevőt kövesse → **NEM KEZDTEM EL**

A parancs **DÖNT**: épüljön meg a történet konkrét céljának kötése, a négy réteg módosítása
engedélyezett. Ez **az új író első nagy feladata**. Amit átadok hozzá:

| tétel | hol áll a mért út | státusz |
|---|---|---|
| a **személyváltás** szánt résztvevője | jelentés **7.5/a** | **nem épült meg**, a review-szál nyitva |
| a **vegyes tagságú** céges eset | jelentés **7.5/b** | **javítás ELKÉSZÍTVE, BE NEM VITT** — és lásd a figyelmeztetést lentebb |
| az új **meghívó/levél-azonossági** lelet | jelentés **7.5/c** + a review-szál válasza | **nem épült meg**, a költség és két lehetséges út mérve |

> **FIGYELMEZTETÉS AZ ELŐKÉSZÍTETT JAVÍTÁSRA — EZT NE VIGYE BE SENKI VÁLTOZATLANUL.**
> A 7.5/b-hez készen állt egy **egy-feltételes** javítás (`storyDataFacts`: a felkínálás akkor jár,
> ha **MINDEN** másik hatályos tag alkalmas — `masok.length > 0 && masok.every(...)`). **Az R186 §2
> ezt nevezetten NEM fogadja el végleges megoldásként**, mert „egy nem érintett, alkalmatlan tag ne
> tegye elérhetetlenné a legitim bemutatót". A javítás tehát **ELŐKÉSZÍTETT, BE NEM VITT, és
> FELÜLÍRT**: a parancs szerinti megoldás a **konkrét cél kötése**, nem a felkínálás szűkítése.
> Kódban ez a javítás **nincs** benne — sem a `61881f2`-ben, sem a `38e0f1c`-ben.

**A mért alapok, amikre az új író épít** (forrásból mérve, nem emlékezetből):
- `storyDataFacts` → `pending_invite`: `rows.some(...)` igazolja, hogy VAN jogosult meghívó (függő ·
  le nem járt · plafonon belüli · nem visszavont · **levele megérkezett**), az **azonosságát eldobja**;
- `tour.inviteRevoke` s3 · s4 · s5: mindhárom cél az **általános** `invites-table`;
- `doRevokeInvite(ref, …)`: `if (r.changed) tourTaskDone('invite.revoked')` — **bármelyik** sor;
- a sor gombja: `revocable: state === 'pending' && plafonRoles.includes(r.offered_role)` — a **levél
  NEM feltétele** a gombnak;
- s7–s9 (`demo-mail-open` → `mailbox` → `invite-observe`): a fogadó **minden** levelet kilistáz;
- a `story_data` **zárt** készletű, logikai tény; a `tourGateOpen` nevezetten elakad kitalált
  mezőnévre és tömbre (`KUKA-236`) — egy `ref` sztring **ezt a szerződést nyitja ki**, tehát a
  bővítésnek erre is kell ellenpárt írnia;
- a lépés-célok ma **állandó** `data-testid` sztringek a regiszterben — adat-vezérelt cél-feloldás
  ma **nincs** a motorban;
- és minden réteg **fail-closed**: egy át nem vitt mező `undefined`, a kapu a SAJÁT történetünket
  állítaná meg. Ez a `KUKA-394` mért leckéje, és ebben a csomagban **háromszor** meg is történt
  (`KUKA-427` · `432` · `435`) — a `KUKA-435`-nél a mechanikám **háromszor** vágta el a legitim utat
  (a kapu 145 → 136/2 → 140/1 → 145/0 utat járta be), **és egy forrás-pin mind a hármat zöldnek
  látta volna**.

### 3.3 §3 — a hét piros külső program → **NEM KEZDTEM EL**

A parancs **120 perc/program** szervezési plafont engedélyez, és **tiltja** a vak ismételgetést. Amit
átadok: a 19 program egyenkénti mért állapota a jelentés **3.2** szakaszában (12 ZÖLD / 7 PIROS), a
hat `spawnSync ETIMEDOUT` nevezetten, és az `r57`/`r59` **belső** timeoutjának különválasztása a
külső kerettől. **Új mérést ehhez nem indítottam** — a parancs szerint ez az új író dolga, és a
korábbi szabály is áll: a programokat **nem írjuk át** (`KUKA-054`).

### 3.4 §4 — célzott bizonyítékpótlás → **NEM KEZDTEM EL**

Átadva: a `KUKA-431`/`437` **szűk szerep-plafon** nevesített mérés-hiánya (ma forrás-pin, az élő
ellenpár a TELJES plafon), a `KUKA-442` **kitiltás**-ágának hiánya, és az **`R112-I3`** nevesített
egyszeri bukása — a rögzített állapot a jelentés **2.5** szakaszában áll (a munkamenet már a másik
emberé volt, a meghívó-képernyő mégis kirajzolva, `global-notice` nélkül). **Mechanizmust nem
állítottam**, és nem minősítettem „ingadozó próbának": a tétel **NYITOTT**.

---

## 4. A PRÓBAKÖRNYEZET ÚJRAINDÍTÁSA — TITOKMENTESEN, ÉS AHOL TÉNYLEG FUT

**HOL FUT:** az **ügynök felhős tárolójában**, nem az operátor gépén. A `127.0.0.1:3300` cím **csak
ott** érvényes; az operátor böngészőjéből **nem** elérhető. Telepítés nem történt, és nem is kérem.

```bash
# 1) a próba-alkalmazás (SQLite, üzleti adat nélkül, titok nélkül)
DATABASE_URL= VS_DEMO=1 npm run app:dev        # → http://127.0.0.1:3300/
# 2) a kötelező böngészős kapu (kb. 17 perc: 514 s + 479 s)
npm run verify:browser-gate
# 3) a rövid láncok
npm run verify:kuka && npm run verify:app-findings-r154 && npm run verify:decision-numbers
npm run docs:html && npm run verify:doc-html
```

**Titok nincs benne:** üres `DATABASE_URL` mellett a rendszer SQLite-on fut, migráció nem kell,
`.env` nem szükséges. `DATABASE_URL` és bármely kulcs **soha nem kerül chatbe és lapra** — a boardra
töltött lapok gépi titok-őrön mennek át.

**A bemutató két útja** (mérve, mindhárom HTTP 200): `http://127.0.0.1:3300/demo-index.html`
(bemutató-lap) és `http://127.0.0.1:3300/` (**a VALÓDI felület**). Előfeltétel a két átívelő
történethez: függő meghívás **a levelével**, illetve **hatályos** másik tag — e nélkül a kiszolgáló
nem is kínálja fel őket (ez a `KUKA-417`…`442` sor tanulsága: a felkínálás a végigvihetőség állítása).

**AZ OPERÁTORNAK:** ez a csomag **össze nem olvasztott ágon** áll, ezért a `main`-es terminál-blokk
EZT nem mutatja meg (`R67 F67-04`). Amit meg tud nyitni: a board-lapok olvasható (HTML) alakja.

---

## 5. A NYITOTT REVIEW-K ÉS SZÁLAK — ÁTADVA, NEM LEZÁRVA

- **A `2efaad3` fejen lefutott kör KÉT P2-je megválaszolva** (mért ténnyel, visszacsúszás-próbával,
  illetve a végigkövetett úttal és a költséggel): `#discussion_r4228051875` (bejáró-verdikt — **javítva**)
  és `#discussion_r4228057225` (meghívó-azonosság — **nem épült meg**, az R186 §2 most dönt róla).
- **A mai fejre (`61881f2`/`38e0f1c`) kód- és biztonsági review ESEDÉKES** — a parancs §5 ezt a
  **végső** megvalósítás fejére kéri; a mai fej nem a végső.
- **A szálak github-oldali lezárását nem végeztem el**, és nem is végzem: a parancs §5 kimondja, hogy
  a nyitott leleteket **nem** zárjuk le pusztán megválaszolás vagy új blokk miatt. A **válaszolt szál
  nem elfogadás**.
- Összesen **28 külső P2** jött **tizenkét** körben; **25**-re született kód (**26** javítás),
  **háromra** nem — mindhárom a jelentés **7.5/a–c** pontjában, végigkövetett úttal és költséggel.

---

## 6. AMIT A RÉGI ÍRÓ LEÁLLÍTOTT

| | |
|---|---|
| **PR-figyelés (Auto-fix)** | **leiratkozva** a `valach-family/valach-system#1`-ről — a régi beszélgetés többé nem ébred fel GitHub-eseményre, és nem indít javítási kört |
| **ütemezett önellenőrző ébresztés** | **nincs** — a lista üres volt, és nem is hoztam létre újat |
| **futó folyamat** | **nincs** (ellenőrizve: se Playwright, se kiszolgáló, se mérő) |
| **új javítási kör** | **nem indul** — ez a lap az utolsó írásom ebben a munkamenetben |

**AZ ÚJ ÍRÓNAK:** a PR-figyelést **neki kell felvennie**, ha kéri — egy PR eseményeit egyszerre egy
munkamenet kapja meg, és a régi leiratkozása után a sáv szabad.

---

## 7. AMIT EZ A LAP NEM ÁLLÍT

- **Nem** állítja, hogy az R186 §1 teljesült: a feladat utáni lépések mérése és a hozzá tartozó
  ellenpróba **nincs meg** (3.1).
- **Nem** állítja, hogy a §2, §3, §4 bármely része elkezdődött.
- **Nem** állítja, hogy az előkészített 7.5/b javítás megoldás: az R186 §2 **felülírta** (3.2).
- **Nem** állítja, hogy a mai fejet független fél elfogadta: a fedett SHA a `2efaad3`.
- **Nem** állítja, hogy a külső lánc zöld (12/7), és hogy a hat `ETIMEDOUT` oka a gép gyengesége —
  a parancs §3 épp ennek szétválasztását kéri, és azt **nem** végeztem el.
- **Nem** merge, **nem** force-push, **nem** felhős telepítés, **nem** titok-módosítás, **nem**
  valódi üzleti adatváltoztatás, **nem** V2-/production-módosítás, **nem** új fizetős keret, és
  **nem** `CMD`/`PR-VS-300` lezárás.
