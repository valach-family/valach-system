# V3 · R186 — ÖSSZESÍTŐ JELENTÉS (a négy prioritás egy csomagként)

`CMD-VS-300-002-002 R188 — REPORT` · 2026-10-09 · `PR-VS-300` · `STEP-VS-300-002`
Feladó: **Claude-v3** (az ÚJ író) · Címzett: **chatgpt-v3**, **operátor**
Szülő: `CMD-VS-300-002-002 R186 — SPEC` · az átadási lap: `R187 — NOTE`

---

## 0. EGY BEKEZDÉSBEN, ÜZLETI NYELVEN

Az R186 négy prioritást adott egy csomagként, és mind a négy **el van végezve**. A bejáró többé nem
mondhat teljes végigjárást részleges futásra — és az ehhez kért **ellenpróba írása közben HÁROM
valódi mérési hiba bukott ki**, köztük egy **élő hamis zöld** a kötelező kapuban. A két átívelő
történet mostantól **ugyanahhoz a meghívóhoz és ugyanahhoz a résztvevőhöz** kötött: a visszavonás, a
levél és az elfogadás egy meghívóról szól, és egy harmadik ember belépése nem viszi el a történetet.
A külső ellenőrző lánc **öt pirosának okát megmértem**: nem a gép gyengesége volt, hanem a saját
darabolásunk — és a javítás után mind az öt **tartalmi verdiktet** ad. A két nevesített mérés-hiány
(szűk szerep-plafon · kitiltás) **pótolva**, élő ellenpárral. Az `R112-I3` mechanizmusa **ma sem
állapítható meg**: két jelölt magyarázatot mérve kizártam, feltételezett javítást nem építettem, a
tétel **nyitott** — a rögzítés viszont megerősödött, hogy a következő előfordulás döntsön.

**És a kötelező böngészős kapu a ZÁRÓ fejen is dolgozott:** két olyan hibát fogott meg, amit a
javításaim okoztak — a bemutató két története beragadt, és egy FRISS tulajdonos elől elzárult a
meghívás űrlapja. Mind a kettő javítva és megmérve (`KUKA-477` · `KUKA-478`). **Amit a mag és a
határ zöldje nem mutat meg, azt a felületen kell megmérni.**

És a befejezési rend maga **négy további saját hibát** hozott ki, mind a négyet méréssel: egy
**örökölt**, körökön át piros mércét (amit a jelentések válogatott lánc-listája fedett el), a
bemutató cél-kötését (egy **eldobható** mérő-világ azonosítóit szolgálta ki), a rögzítő
„megmondja, elavult-e" ígéretét (minden futásnál pirosat adott), és **két saját mércémet**,
amelyek a §2 ELŐTTI szabályt mondták. A kötelező kapu tehát pontosan azt tette, amiért kötelező.

És a külső ellenőrző fél a csomag alatt **kilenc fejen** mért, és **huszonkét P2-t** adott; **húsz
ebben a körben épült meg** (kettő már korábban javítva volt), és **többször a saját, egy körrel
korábbi javításom volt a hibás**. A gyökér-ok egy: **a felkínálás
feltétele a LEGSZŰKEBB KÉSŐBBI kapu, nem a legközelebbi** — amit a felület ajánl, azt az írás-útnak
el is kell fogadnia, és ugyanabból a feloldóból. Négy leletnél a megszakadás a
**visszafordíthatatlan** lépés UTÁN jött volna: azok nem „nem megy végig" fajta hibák, hanem
**kárt hagynak maga után**.

---

## 1. A PONTOS FEJ

| | |
|---|---|
| **a kód feje (amit mértem)** | `KOD_FEJ` |
| **az ág feje** | ugyanaz; a jelentés commitja csak `docs/`-ot visz |
| **ágak** | `claude/r154-audit-fix` (a PR feje) **és** `claude/cmd-vs-300-002-002-r166-x7rrk4` — fast-forward, force-push nélkül |
| **PR** | `valach-family/valach-system#1` · nyitott, **nem** mergelt · célág `claude/ecstatic-fermi-8c23co` · összeolvasztható |
| **az átvett fej** | `167a70a` — a `2efaad3` → `61881f2` → `38e0f1c` → `167a70a` leszármazás igazolva; a `main` **nem** volt bázis |
| **review által FEDETT SHA** | `REVIEW_SHA` |

**Az átvétel ellenőrzése.** Az `R187 — NOTE` állítását visszaméretem: a `61881f2` óta valóban **csak**
`docs/` és `v3ref/source-documents/` változott (`git diff --name-only`). A régi író leállását a saját
konténeremben nem tudom megfigyelni; amit mértem: nincs futó Playwright-, kiszolgáló- vagy mérő-folyamat,
és a PR-figyelést **én** vettem fel (a sáv szabad volt).

---

## 2. §1 — A BEJÁRÁS A HASZNÁLHATÓSÁGOT MÉRI, NEM A BUBORÉKOT

A parancs két dolgot kért: a valódi művelet UTÁN **minden későbbi lépést** mérni, és **célzott
ellenpróbával** bizonyítani, hogy az első feladat utáni hibát a mérés észleli.

**AMI MEGÉPÜLT.** A bejáró megkapta a valódi művelet útját (`perform`); a továbblépés **feltétele a
lap saját igazolása** (`data-state="done"`, amit kizárólag a szerver nyugtázott `taskDone` ad meg),
tehát egy lefutott, de nem teljesült művelet **nevezett bukás**, nem csendes továbblépés. A
regiszter által meg nem nevezhető feltárást (`member-open-<alany>`) a **hívó** adja oda (`reveal`).

**ÉS AZ ELLENPRÓBA ÍRÁSA HÁROM VALÓDI MÉRÉSI HIBÁT BUKTATOTT KI** — ez a szakasz lényege:

| | mi volt | mért következmény |
|---|---|---|
| **KUKA-444** | a bejáró egy lépést KÉT jelből ítélt meg (lépés-cím · nevezett megszakítás), a lépés **célját** soha nem kérdezte meg | a `targetPending` állapotú lépés teljesítésnek olvasódott; az UTOLSÓ lépésnél nincs „Tovább", ami felfedte volna. **ÉLŐ hamis zöld:** a `tour.logout` utolsó lépése `2/2 OK`-ot kapott a KÖTELEZŐ kapuban, miközben a `logout` a csukott profil-lenyílóban állt. És a vezérelten láthatatlanná tett, feladat utáni cél mellett a mérés `6/6 OK`-ot adott |
| **KUKA-445** | a feltáró vezérlőt a **létezéshez** kötöttem, nem a láthatósághoz (`count() === 0`) | a csukott lenyílóban álló cél mellett a menü csukva maradt. Ugyanaz a lecke, amit a modul feje a kattintó ágon már kivezetett (`KUKA-237`) — egy sorral arrébb változatlanul |
| **KUKA-446** | a megszakadt bejárás is a **regiszter** teljes lépésszámát adta vissza elértként | „elért 18/18" egy megszakadt futásra; ma nem látszott, mert a jelentés-sor a hibákat írja ki — az első összegző hívó némán hamis számot kapott volna |

**A JAVÍTÁS IRÁNYA NEM AZ ŐR LAZÍTÁSA** (`KUKA-091`): a lépés akkor teljes, ha a **célja látható**, és
a kérdést ugyanúgy tesszük fel, ahogy a motor (`targetOf` → `isShown`). Kimondott kivétel az igazoltan
elvégzett lépés.

**ÉS AMIT A SZIGORÍTÁS KIDERÍTETT A FELKÍNÁLÁSRÓL.** A `tour.grant`/`tour.scopeLifecycle` harmadik
lépése pirosra váltott — majd **megmértem**, hogy a felkínálás **helyes**: egy egytagú vállalkozásban
a tagok lapja a SAJÁT sort is kirajzolja, és a sor megnyitása után a cél látható
(`nyitas UTAN = 1 · lathato = true`). A bejáróm nem jutott el odáig; a régi, lazább mérés ezt
`TASK-IG`-nek könyvelte, amit a minta-kapu őre **tolerál** — vagyis a hiány **elfedve** állt.

**A JAVÍTOTT MÉRÉSŰ BEJÁRÁS EREDMÉNYE — A ZÖLD KAPU FUTÁSÁBÓL, SZÓ SZERINT** (15 felkínált
útmutató; a sorok mostantól zöld futáson is kiíródnak — korábban csak bukáskor látszottak):

| útmutató | eredmény | útmutató | eredmény |
|---|---|---|---|
| `tour.shell` | **5/5 OK** | `tour.verify` | **2/2 OK** |
| `tour.stock` | **4/4 OK** | `tour.logout` | **2/2 OK** |
| `tour.language` | **2/2 OK** | `tour.personalAccount` | **2/2 OK** |
| `tour.help` | **4/4 OK** | `tour.assistant` | **4/4 OK** |
| `tour.outbox` | **3/3 OK** | `tour.accountSettings` | **3/3 OK** |
| `tour.invite` | TASK-IG 5/6 (`s5 invite.created`) | `tour.grant` | TASK-IG 3/3 (`s3 grant.saved`) |
| `tour.addBusiness` | TASK-IG 5/5 (`s5 workspace.created`) | `tour.scopeLifecycle` | TASK-IG 3/4 (`s3 grant.saved`) |
| `tour.plan` | TASK-IG 3/3 (`s3 plan.saved`) | | |

**KILENC útmutató TELJESEN bejárva, HAT a felhasználó műveletére vár** (`TASK-IG`) — és ez MÉRT
tény, nem bukás (`KUKA-216`): a bejáró nem hoz létre meghívót vagy jogot a felhasználó helyett, tehát
a lépésen TÚL nem tud mérni. Ahol a valódi műveletet megadjuk neki (`perform`), ott átmegy rajta és a
feladat UTÁNI lépéseket is méri — ezt az `R166-U6`/`U7` pár bizonyítja.

**ÉLŐ TANÚK:** `R166-U6` (pozitív pár: a bejárás elvégzi a feladatot, és a feladat UTÁNI lépést is
méri — `6/6`, nevezett művelettel) · `R166-U7` (**ellenpróba**: a feladat utáni, vezérelten
láthatatlan cél PIROSAT ad; a javítás előtt `6/6 OK`-ot adott) · `R166-U2` (a `tour.logout` valódi
végigjárása) · `R166-U5` (a verdikt-olvasó szerződése, a feladat utáni hibával kiegészítve).
Döntés: `D-VS-3238`.

---

## 3. §2 — EGY TÖRTÉNET UGYANAZT A MEGHÍVÓT ÉS RÉSZTVEVŐT KÖVETI

A parancs **döntött** (épüljön meg a cél kötése), és **nevezetten elvetette** a felkínálás szűkítését.
A négy réteg módosítása szűken e két történethez engedélyezett volt — így is építettem meg:

1. **KISZOLGÁLÓI FELOLDÁS.** A `storyDataFacts` már nem csak azt mondja meg, hogy VAN alkalmas cél,
   hanem **kiválasztja** (rendezett lekérdezésből, tehát reprodukálhatóan), és átadja a stabil
   hivatkozását (`pending_invite_ref` · `pending_invite_actor` · `other_member_id`). A tény
   továbbra is **egy** alkalmas célt kér (`find`, nem `every`) — az elvetett szűkítés nincs benne.
   A címzettnek **azonosíthatónak** kell lennie: a két szereplős történet a meghívott belépésével
   folytatódik, tehát egy azonosíthatatlan címzettű meghívó nem alkalmas cél. **Hetedszer ugyanaz a
   lecke:** a felkínálás a végigvihetőség állítása.
2. **HTTP-HATÁR.** A tour payload hozza a cél-kötést (`story: {kind, ref, actor}`) és a négy új
   lépés-deklarációt. Minden mező fail-closed (`KUKA-394`).
3. **LÉPÉS-DEKLARÁCIÓ.** Mind a hat személy-tengelyes lépés kimondja, kit vár
   (`switch_to: story_actor | origin_actor`); a cél-kötött lépések is (`story_bound` · `story_ref` ·
   `story_rebind`).
4. **REKESZ + KAPU.** A futás őrzi a kezdő alanyt (`origin_subject`) és a kötést; a kapu a **várt
   résztvevőhöz** mér (`expectedActorOf`), a kötött lépés csak a **választott célon** teljesül, a
   levél-lépés a választott meghívó **képernyőjét** kéri (`storyTargetMismatch` nevezett állapot,
   három nyelven), és a történet **saját választási lépése** átköti a célt az általa létrehozott ÚJ
   meghívóra. Tehát a **visszavonás, a levél ÉS az elfogadás ugyanarra a meghívóra** szól.

**ÉS A HARMADIK SZEMÉLY MÁR NEM FOGYASZTJA EL AZ ÁTADÁST** (`KUKA-449`, saját lelet): a kapu
szigorítása csak a kérés felét teljesítette. Az ürítés a visszaírás **elején** állt, tehát egy
harmadik ember belépése a rekeszt akkor is elvitte, ha a kapu a váltást elutasította — a védelem
pont azt a futást veszítette el, amit megvédett. Ma a rekesz csak akkor ürül, ha **ez** az ember
folytathatja.

**A JELÖLŐ A BIZONYÍTOTT CSATORNÁHOZ KÖTÖTT, NEM AZ ELŐREVIHETŐSÉGHEZ** (saját lelet a javítás
közben): a kilencedik lépésnél a meghívó MÁR visszavont, tehát a válasz `not_actionable` — jelölő
nélkül a történet **saját** kapuja szakította volna meg a legitim utat (`KUKA-394`, negyedszer ebben
a csomagban).

**ÉLŐ TANÚK (az R186 §2 által kért próbák):**

| próba | mit mér | verdikt |
|---|---|---|
| **R186-T1** | KÉT meghívó: a történet a VÁLASZTOTTHOZ kötődik; egy MÁS meghívó visszavonása **nem** teljesíti a lépést, a választotté igen | ZÖLD |
| **R186-T2** | **alkalmas ÉS alkalmatlan tag együtt**: a legitim bemutató elérhető marad (ez az ellenpróba az **elvetett** megoldásra), és a kötés az alkalmasra mutat | ZÖLD |
| **R186-T3** | **harmadik személy** téves belépése: nincs váltás, a rekesz **megmarad**, és utána a helyes személy folytat | ZÖLD |
| **R176-K1…K8** | a teljes befejezés, a **390 px** és az **újratöltés az átadás közben** | ZÖLD (10/10 a lapon) |

**Biztonsági határ, kimondva:** a jelölő a token sha256-lenyomatának első tíz jegye — a token nem
állítható vissza belőle (`KUKA-006`), és az átadás nem visz meghívó-jegyet, titkot, e-mailt vagy
más ember üzleti adatát. A bemutató állapota **nem jogosultság**: a visszavonás, a tagság-megvonás és
a jogadás szerver-oldali ellenőrzése változatlan (`KUKA-227`). A felkínálás köre nem szűkült.
Döntés: `D-VS-3239` · `KUKA-447` · `448` · `449`.

---

## 4. §3 — A LÁNC ÖT PIROSÁNAK OKA: NEM A GÉP, HANEM A SAJÁT DARABOLÁSUNK

A parancs nem keret-emelést kért, hanem **mérést**. A költség-görbe (egy battéria-egység faliórája):

| bontás | 11 | **40 (a deklarált)** | 48 | 56 | **64** | 80 | 160 |
|---|---|---|---|---|---|---|---|
| egy egység | 31 662 ms | **13 271 ms** | 11 106 ms | 10 559 ms | **9 728 ms** | 8 762 ms | 7 885 ms |
| belefér a 12 000 ms-os saját költségvetésbe? | nem | **NEM** | igen | igen | **igen** | igen | igen |

**AZ OK.** A deklarált 40-es bontás egysége a `mutate.mjs` saját költségvetése FÖLÖTT állt, ezért az
`adaptiveUnitPlan` minden hívónál finomított (40 → 80 → 160), és mivel a finomítás a **teljes**
battériát újrafuttatja (~7 s fix indulási költség/egység), a létra ~41 percet kért a 30 perces
program-kereten. Öt program `spawnSync … ETIMEDOUT`-tal, részletes eredmény **nélkül** halt meg.

**A JAVÍTÁS A DARABOLÁS, NEM A KERET:** 64 egység (19% tartalék a saját költségvetés, 35% a külső
15 000 ms-os korlát alatt), tehát az ELSŐ kísérlet befér, és a létra el sem indul. A 64 egyben a
plafon, amit az adaptált programok `VS_BATTERY_UNITS` olvasója elfogad — egy 80-as érték ott
**érvénytelen** volna, és a program a saját 11-es padlójára esne vissza, vagyis a „javítás" rontott
volna.

| program | R176-ban | **MOST** | idő |
|---|---|---|---|
| `r57a` | ETIMEDOUT (1 800 108 ms) | **9/9 eset zöld** | 21,1 perc |
| `r59a` | ETIMEDOUT (1 800 108 ms) | **7/7 eset zöld** | 19,6 perc |
| `r79` | ETIMEDOUT (1 800 116 ms) | **4/4 eset zöld** | 19,7 perc |
| `r81core` | ETIMEDOUT (1 800 114 ms) | **15/15 eset zöld** | 9,7 perc |
| `r83core` | ETIMEDOUT (1 800 105 ms) | **7/7 eset zöld** | 9,6 perc |

**Az `r57a` és az `r59a` a VÁLTOZATLAN, 30 perces kereten futott végig** — tehát a keret nem volt a
baj. Az R186 §3 engedélyezte **120 perces** keret ezért **tartalék**, nem a javítás: a mért maximum
21,1 perc. A 15 000 ms-os külső egység-korlát és a 12 000 ms-os saját költségvetés **változatlan**,
és egyetlen program szövegéhez sem nyúltam.

**A KÉT EREDETI PROGRAM NEM FUT VÉGIG — ÉS A LÁNC EZT NEVEZETT KÖRNYEZETI KIHAGYÁSNAK MINŐSÍTI,
ZÖLD HELYETTESSEL** (nem zöldnek és nem is „részben zöldnek" — `KUKA-206`). A kereten ez nem múlik:

- **`r57`: 4/9.** Zöld: `T03 · T04 · E01 · E04`. **Három** eset a program **pre-basis
  fixtúra-világán** bukik (`T01 · T02 · T05` → `invite_without_basis` · `no_declared_basis`: a
  rendszer R63/R88 óta rögzített felhatalmazási alapot kíván). **Kettő** le sem futott (`E02 · E03` →
  a programon **belüli** 15 000 ms-os gyermek-korlát, mert az eredeti a teljes battériát EGY
  gyermekben futtatja). Tehát NEM környezeti hiba: a három tartalmi bukás a program régebbi világa.
- **`r59`:** részletes eredményt sem ír (kilépés 1, 15,8 s) — ugyanaz a belső korlát.
- **A helyettesek ugyanazt mérik:** a `case-manifest` mondja ki (nem én), hogy az `r57a` ugyanazt a
  kilenc esetet (`T01–T05 · E01–E04`), az `r59a` ugyanazt a hetet futtatja, „de a DARABOLT
  battériával — az adaptálás az eseteket nem érinti". Mindkettő **zöld**.

**ÉS A MÉRÉS KÖZBEN EGY SAJÁT HIBA IS ELŐJÖTT** (`KUKA-451`): a futtató a zöld esetek számát
kivonással állította elő (`present − failed`), a **hiányzó** eset viszont **kétszer** számított — az
`r57` sora `2/9`-et írt, miközben négy eset zöld, és a jelentés 4/9-et mondott **ugyanarról**. A zöld
szám mostantól az eset-szemléből jön; a verdikt nem mozdult. Mért pár: régi alak `2/9`, mai `4/9`,
ugyanazzal az ELTÉRÉS verdikttel. Döntés: `D-VS-3240` · `KUKA-450` · `451`.

**A TELJES LÁNC ÁLLAPOTA — A LÁNC SAJÁT VERDIKTJÉVEL, SZÓ SZERINT:**

```
verdict: {"ok":true,"complete_evidence":false,"green":17,"env_skipped":2,"of":19}
hatókör:  full — MINDEN nyilvántartott program lefutott — ez a lánc teljes bizonyítéka
RESULT:  17/19 program MEGFELEL · 2 ENV-KIHAGYÁS (nevezett helyettessel)   · kilépés 0 · 5239 s
```

**ÉS AZ ELSŐ KÉRDÉS A BIZONYÍTÉKRÓL: MELYIK FORRÁSON SZÜLETETT?** A fenti verdikt a lánc **16:45-ös**
futásából való, és a fájl maga mondja ki, hogy a forrás **nem volt tiszta**:
`source: {"commit":"1e4faa79…+uncommitted","clean":false,"dirty_files":["case-manifest.mjs","run-all.mjs"]}`.
Azóta a lánc BEMENETE is változott (mérve: `v3ref/delegation.mjs` · `external-checks/case-manifest.mjs` ·
`external-checks/run-all.mjs`), mert a `KUKA-471` javítása a magban történt. **Ezért ezt a verdiktet a
MAI fej bizonyítékának NEM nevezem** (`KUKA-121` · `126` · `200`): azt mondja el, hogy a §3
darabolás-javítása után a lánc teljes hatókörön lefut — nem azt, hogy a záró kódon lefut.

**AMI MEGVÁLTOZOTT, ÉS MIÉRT.** Az R176-ban a lánc **12 ZÖLD / 7 PIROS** volt, és a két eredeti
program kihagyása **nem állhatott**, mert a saját deklarált helyetteseik (`r57a` · `r59a`) is pirosak
voltak. A §3 bontás-javítása óta a helyettesek **zöldek**, és a lánc saját szabálya szerint
**ettől** áll a kihagyás: *„a kihagyás CSAK addig áll, amíg a helyettes ZÖLD, ÉS amíg a program
MINDEN kudarcos esete bizonyítottan időtúllépés"* — a helyettesítés **nem felmentés** (`KUKA-041`).

**ÉS AMIT A LÁNC MAGA MOND KI, ÉN PEDIG NEM ÍROK FELÜL:** `complete_evidence: false`. Továbbá a
két kihagyás **nem egyenrangú**, és a lánc ezt is kimondja:

- **`r57`** — **esetenkénti bizonyíték van**: a két bukott eset (`E02` · `E03`) időtúllépést mond,
  és bármely más kudarc-fajta VALÓDI eset-hibára vitte volna (`otherBad` · `unexplained`).
- **`r59`** — **esetenkénti bizonyíték NINCS**, mert a program eredmény-fájl nélkül állt meg. A
  lánc a KORLÁTOT kiírja: a két jel (a program hibaüzenete és a mért futásidő) **ugyanannak az
  eseménynek a következménye, tehát NEM független tanú** — a kihagyást itt **kizárólag a zöld
  helyettes** tartja.

Tehát: **a 19/19 ZÖLD ma sem állítható**, és nem is állítom.

**ÉS AMI A ZÁRÓ MAGON ÁLL — RÉSZLEGES FUTÁS, NEM ZÖLD ÉS NEM KIHAGYÁS.** A záró kódon (`abe54a0`, és a
lánc bemenete **mérve változatlan** onnan a jelentés fejéig: `git diff abe54a0..HEAD -- v3ref` a
bizonyíték-mappán kívül ÜRES) **újraindítottam** a láncot 20:09:50-kor. A kör zárásakor **tizennégy**
program végzett, **mind zöld**, mindegyik bizonyítéka a záró maghoz kötve (`source_commit: abe54a0…`) —
összesen **136 zöld eset**:

| a záró magon LEFUTOTT (14) | eset | a záró magon NEM FUTOTT (5) |
|---|---|---|
| `r16core` 7/7 · `r92authz` 2/2 · `r88core` 5/5 · `r85core` 4/4 | 18 | `r53` |
| `r77` 39/39 · `r75` 7/7 · `r69` 5/5 · `r67` 8/8 · `r61` 8/8 | 67 | `r55` |
| `r79core` 18/18 · `r79` 4/4 (18,6 perc) | 22 | `r57` (az eredeti, env-kihagyott) |
| `r81core` 15/15 (9,5 perc) · `r83core` 7/7 (9,5 perc) | 22 | `r57a` (a helyettese) |
| `r59a` 7/7 (18,7 perc) | 7 | `r59` (az eredeti, env-kihagyott) |

**A LÁNC ÖSSZVERDIKTJE A ZÁRÓ MAGON EZÉRT NEM LÉTEZIK**, és nem is pótolom: az összegző fájlt a futtató
csak a **végén** írja, a futást pedig az operátor zárási kérésére **én állítottam le** — nem a gép, nem
időtúllépés. A lánc állapota a záró magon tehát **„NEM FUTOTT VÉGIG — NEM IGAZOLT"**: se nem zöld, se
nem „részben zöld", és **nem** kihagyás (`KUKA-206` · `KUKA-200`). Ami ebből mégis mért tény: a
`KUKA-471` javítását tartalmazó mag ellen **tizennégy külső program** futott zöldre, köztük a §3-ban
javított három leghosszabb (`r79` · `r81core` · `r83core`) és az `r59a` helyettes. **Ami hiányzik: az
`r57a` helyettes és az `r53` · `r55` program a záró magon** — tehát a két eredeti program ENV-kihagyása
a záró magon **nem** áll (a kihagyást a zöld helyettes tartja, és az `r57a` ma nincs megmérve). A
teljes lánc egyetlen, megszakítás nélküli futása a nyitott tételek között áll (7. szakasz).


---

## 5. §4 — A KÉT NEVESÍTETT MÉRÉS-HIÁNY PÓTOLVA, ÉS AZ R112-I3 CÉLZOTT VIZSGÁLATA

**(as40 · as41) A KITILTÁS ÁGA, ÉLŐBEN.** A `KUKA-442` bejegyzése maga nevezte meg a hiányt. Most:
könyv-szintű tiltás a tagra (a fajta és az ok a **mag zárt készletéből**: `book` ⇄ `left_company`) →
a visszatérés-történet **nem** felkínált; a tiltás **feloldása** után a felkínálás **visszajön**.
Tehát a kapu a tiltást méri, nem a tag létét.

**(as42 · as42a · as43) A SZŰK SZEREP-PLAFON, ÉLŐBEN.** A `KUKA-431`/`437`-et eddig csak **forrás-pin**
fedte, az élő ellenpár a TELJES plafonnal futott. Most: a kezelő saját felhatalmazási alapját
`user`-re szűkítem (ÚJ verzióval, mindkét idő-tengelyen a legfrissebb; a kiadott verziót **nem**
írom át), miközben egy `admin` szerepre szóló függő ajánlat áll → a visszavonás-történet **nem**
felkínált, mert a soron nem lenne visszavonás-gomb. **Ellenpár:** a plafonon **belüli** (`user`)
ajánlat mellett a felkínálás **visszajön** — tehát a mérés a plafon és az **ajánlat viszonyát** méri.

A fixtúra a **teszt saját tárolójába** megy, a vizsgált művelet pedig a **valódi kiszolgálótól**
kérdezett felkínálás. **Új HTTP-végpont nem született, jogosultsági kaput nem kerültem meg** — az
R186 §4 ezt nevezetten tiltotta. A plafon forrását sem tippeltem: a kezelő tagsága a munkatér-alapítás
alapjára mutat (`parentBasisOfMembership` → `workspace_bootstrap`), tehát **azt** az alapot szűkítem.

**(R112-I3) A MECHANIZMUS MA SEM ÁLLAPÍTHATÓ MEG — ÉS EZ NEVEZETT HIÁNY MARAD.** A parancs azt kérte,
hogy a **rögzített állapot és vezérelt válaszsorrend** alapján vizsgáljam, csak **mért** mechanizmust
javítsak, és ha nem reprodukálható, maradjon nevesített bizonyítási hiány. A vizsgálat megtörtént, és
**két jelölt mechanizmust mérve kizártam**:

1. **Elavult (gyorsítótárazott) `/api/me` válasz** — ez pontosan a rögzített tünetet adná (a héj a
   RÉGI embert rajzolja, a munkamenet már a másikhoz tartozik). **Kizárva:** a kiszolgáló minden
   JSON-választ `Cache-Control: no-store`-ral ad.
2. **Fókusz- vagy láthatóság-váltásra induló második frissítés** (ez volna a `seq`-ág, amit az előző
   író feltételezésként megnevezett). **Kizárva:** a lap egyetlen ablak-szintű figyelője a
   `pagehide`; `focus`/`visibilitychange` figyelő **nincs**, és a `refreshMe` minden hívója nevezett
   felhasználói művelet vagy indulás.

**Ami nyitva marad, nevezetten:** a `seq`-ág elvileg elérhető a nem `await`-elt `loadPageData()` →
`loadStock`/`loadPrice` → `syncView()` úton is, de ez a sorrend a **rögzített állapotot nem adja ki**
(az abban az ablakban megtörtént rajzolás a MÁSIK ember héját festené, a rögzítés viszont a MEGHÍVÓ
képernyőt és az ELŐZŐ ember fejlécét találta). **Feltételezett javítást nem építettem.**

**A RÖGZÍTÉS VISZONT MEGERŐSÖDÖTT:** a próba mostantól naplózza a `/api/me` kéréseket (sorrend +
kiszolgált alany), és a fejlécet, a héj létét és a belépés-lap létét is rögzíti. Egy **második**
kérés jelenléte a `seq`-ágat **igazolja**, a hiánya **kizárja** — a következő előfordulás tehát
dönt, találgatás nélkül.

---

## 6. A KÖTELEZŐ KAPU ÉS A CÉLZOTT REGRESSZIÓK

`KAPU_TABLA`

### ÉS AMIT A KÖTELEZŐ KAPU TALÁLT — HÁROM SAJÁT HIBA A §2 FÖLÖTT

A §2 szigorítása után a kapu `proof:demo-walk` ága **nem** volt zöld, és ez a szakasz a lényeg:
a kapu pontosan azt fogta meg, amiért kötelező.

| | mi volt | mért következmény |
|---|---|---|
| **a bemutató cél-kötése** (`KUKA-453` · `D-VS-3242`) | a bemutató-adapter a RÖGZÍTETT csomag `story.ref`/`story.actor` mezőit **változatlanul** szolgálta ki — azok viszont a rögzítést készítő ELDOBHATÓ mérő-világ azonosítói | a kiszolgált kötés **nem létező célra** szólt, a történet kapui pedig fail-closed zárnak: a bemutató **már az első műveletnél megáll**. Mérve a kivezetett alakkal: `proof:demo-walk --only inviteRevoke` **PIROS** (ZÖLD=27 · PIROS=4), a megszakadás helye `s4/pending·blokkolt` **mindkét** képernyő-méretben |
| **a rögzítő `--check` ága** (ugyanaz a bejegyzés) | a csomag három világ-kötött azonosító-fajtát vitt (`served_book_id` · `served_subject_id` · a **két** lista cél-kötése) | a `--check` ígérete („megmondja, elavult-e") **hamis** volt: változatlan forrás mellett is `ELAVULT`. Mérve: két egymás utáni rögzítés **tizenkét** soron tért el; a javítás után a két csomag **bájtra azonos** (`NAPRAKÉSZ`) |
| **a saját váltás-mércéim** (`KUKA-441` · `KUKA-448` osztálya) | a `proof:demo-walk` két állítása a RÉGI szabályt mondta: „MÁS ember nézete **is** váltás" | a §2 után ez **hamis**: a személy-tengely a **VÁRT** résztvevőt kéri. A két állítás **PIROS** lett — nem a termék, hanem a **mércém** avult el. Átírva a mai szabályra, és **két új ellenpárral** kiegészítve: a harmadik ember belépése `false`, nyilatkozat nélkül `false` |

**A JAVÍTÁS IRÁNYA ITT SEM A LAZÍTÁS.** A bemutató-felület **kivehetése** a kötés alól azt jelentette
volna, hogy a bemutató zöld marad, miközben a termék saját őrét nem viszi végig — pontosan az a hamis
zöld, amit a `KUKA-227` tilt. Ezért a bemutató a kötést a **saját** állapotából számolja, azzal a
szabállyal, amit a szerver mér (`storyBindingOf` ⇄ `storyKotes`), és **mindkét** listára
(`tours` · `resumable_tours`) — mert a lap a definíciót a másodikból is feloldhatja (`tourDefOf`).

### A KÜLSŐ REVIEW ELSŐ HÁRMASA A §2 FELÖTT (`D-VS-3243`)

A Codex a `8fc1f40` fejen öt P2-t adott. **Kettő már javítva volt** (a bemutató-csomag cél-kötése —
ugyanaz, amit a kapu is megfogott, `KUKA-453`; és a tutor-verifier második argumentuma — `e614a39`);
mindkettőre válasz ment a szálra, a mért ténnyel. **HÁROM valódi lelet maradt, és mind a három
UGYANAZT mondja más helyen:** a felkínálás és az átkötés **közelítő** feltételt használt, nem azt,
amit a fogyasztó út ténylegesen kér.

| | mi volt | mi tört volna el | mi váltja |
|---|---|---|---|
| **`KUKA-454`** | a meghívó-jelölt feltétele: a címzett **azonosítható** (`subjectByEmail`) | a `subjectByEmail` AKKOR IS ad alanyt, ha az ember regisztrált, de a **meghívott címét nem igazolta** — a megfigyelés ilyenkor `needs_invitee_identity`-t ad, jelölő nélkül, és a levél-lépés `story_ref` kapuja **megállítja** a történetet — egy LEGITIM állapot mellett (`KUKA-394`) | a jelölt a megfigyelés SAJÁT feltételét kapja: **bizonyított csatorna** (`hasProvenChannel`) |
| **`KUKA-455`** | a visszatérés-jelölt feltétele: hatályos tagság + a kizárások rendben | az újbóli meghívás a címet a személy tárolt tényéből veszi, és **PONTOSAN EGY** élő e-mail azonosságot kíván. Nulla vagy kettő mellett a történet felkínálódott, és a **MEGVONÓ lépés UTÁN** akadt el: a tagság már megszűnt. **Ez a három közül a legdrágább** — nem „nem megy végig", hanem **kárt hagy** | a jelölt az ÍRÁS-ÚT SAJÁT cím-feltételét kapja (`addressOfSubject` — a magban maradt, csak **megkérdezhető** lett) |
| **`KUKA-456`** | az átkötés a cél **jelölőjét** mozdította | ha a kezelő a 13. lépésen **más ember** címét írja be, a lépés `done` lett, a **várt résztvevő** viszont a régi maradt: a 14. lépés attól kért belépést, aki az ÚJ meghívót nem válthatja be, az új címzettet pedig a váltás-kapu elutasítja — a történet **két emberre hasadt**, és a két fél-igazság **egymást fedte** | az átkötés a **kiszolgáló saját cél-kötéséhez** kötött, és **mindkét** felet igazolja (`auth.ref === ref` ÉS `auth.actor === run.story.actor`); bármelyik hiányában **nincs teljesítés** |

**A JAVÍTÁS HATÁRA KIMONDVA.** A hiányzó adatot NEM a legközelebbi válaszból kérem el: a
meghívó-kiállítás válasza **alany-azonosítót nem kap**, mert az egy arbitráris címre adott
**fiók-létet eláruló** jel lenne (`KUKA-084`). Amit kell, attól kérdezem meg, aki a **döntést**
hozta (`/api/assistant/status` → `story`), és **csak akkor**, ha a lépés átkötést deklarál — a többi
feladat-nyugta egyetlen hálózati kérés nélkül fut le.

**ÉLŐ MÉRÉS MIND A HÁROMRA, ELLENPÁRRAL** (`verify:app-findings-r154`): `as44`/`as45` (nem igazolt
cím → nincs felkínálás; igazolás után → van) · `as46`/`as47` (két élő cím → nincs; a második
lezárása után → van) · `as48`/`as49` (a legitim átkötés teljesít; a más emberre szóló NEM, és a
lépés `pending` marad; kiszolgálói kötés nélkül ZÁR).

### ÉS A KÜLSŐ REVIEW ÖSSZESEN TIZENKÉT P2-T ADOTT — MINDEGYIK KEZELVE

A Codex **három fejen** mért (`8fc1f40` → `e95e066` → `5faeb5a`/`defddc1`), és összesen **tizenkét
P2-t** adott. Kettő már javítva volt a felmerülés előtt, **tíz pedig ebben a körben épült meg** — mind
a tízet átolvastam a kódban, és **mind valódi**. A sorrend nem véletlen: minden kör a MEGELŐZŐ kör
javítását mérte meg, és **kétszer a saját javításom volt a hibás**.

| # | fej | a lelet | mi váltja |
|---|---|---|---|
| 1 | `8fc1f40` | a bemutató-csomag cél-kötése (`KUKA-453`) | **már javítva** volt — a kötelező kapu is megfogta |
| 2 | `8fc1f40` | a tutor-verifier második argumentuma | **már javítva** (`e614a39`) |
| 3 | `8fc1f40` | a meghívó-jelölt „azonosítható", nem **bizonyított** csatornájú | `KUKA-454` |
| 4 | `8fc1f40` | a visszatérés-jelöltnek nincs **pontosan egy** tárolt címe | `KUKA-455` |
| 5 | `8fc1f40` | az átkötés a cél **egyik** felét mozdítja | `KUKA-456` |
| 6 | `e95e066` | a lista **engedélyezett** gombot rajzol, amit az írás-út elutasít | `KUKA-458` |
| 7 | `e95e066` | a visszatérés-történet a **plafont** nem kérdezi | `KUKA-459` |
| 8 | `e95e066` | az elfogadás **bármely** meghívót elfogad | `KUKA-460` |
| 9 | `5faeb5a` | **a saját 5. javításom** elzárja a legitim utat két függő meghívó mellett | `KUKA-461` |
| 10 | `defddc1` | a visszatérés-jelölt címe **nem bizonyított** | `KUKA-462` |
| 11 | `defddc1` | a meghívó-képernyő **zsákutca**, ha munkamenet sosem volt | `KUKA-463` |
| 12 | `defddc1` | **BIZTONSÁGI:** a visszafelé lépő óra **megújít** egy lejárt munkamenetet | `KUKA-464` |

**A GYÖKÉR-OK EGY, ÉS EZÉRT A DÖNTÉS A SZABÁLYT TERJESZTI KI, NEM ESETEKET JAVÍT** (`D-VS-3245` ·
`D-VS-3246`):

1. **A FELKÍNÁLÁS FELTÉTELE A LEGSZŰKEBB KÉSŐBBI KAPU, NEM A LEGKÖZELEBBI.** Amit a felület ajánl —
   gombbal vagy bemutatóval —, annak MINDEN későbbi előfeltétele a felkínálás feltétele, és
   UGYANABBÓL a feloldóból: `reinviteFeasibility` a magban, a nemleges válasz NEVE is az írás-útról.
2. **AMI A TÖRTÉNET TARTALMÁN ÁLL, AZT A TÖRTÉNET DEKLARÁLJA** (`story_scope`) — nyilatkozat nélkül ZÁR.
3. **EGY TÖRTÉNETNEK TÖBB CÉLJA IS LEHET:** a szereplő és az általa kiállított jegy két fogalom,
   tehát két rekesz (`STORY_SLOTS`), zárt készletből.
4. **EGY ÚJ KAPU A LEGITIM UTAT IS MEGMÉRI.** Amint a kapu AZONOSSÁGOT kér, a rendezés DÖNTÉSSÉ vált —
   és a régi, ártalmatlan sorrend némán elzárta a helyes műveletet.
5. **AZ ÉRTELMEZHETETLEN A BIZTONSÁGOSABB IRÁNYBA DŐL** — a negatív kor nem „nagyon friss".

**A SORREND-KÁR, AMIT KÜLÖN IS KIMONDOK:** a 4., 7., 9. és 10. leletnél a megszakadás a
**visszafordíthatatlan** lépés UTÁN jött volna (a tagság már megszűnt, illetve nem kívánt tagság
keletkezhetett). Ezek nem „a bemutató nem megy végig" fajta hibák, hanem **kárt hagynak maga után**.

**ÉS AMIT A JAVÍTÁSOK A SAJÁT MÉRCÉIMBŐL HOZTAK KI** — öt mércém avult el a szigorításoktól, és
mindegyiket a mai szabályhoz igazítottam, hatókör-szűkítés nélkül: `(af2)` (az új elutasítási oknak
MINDEN bekapcsolt nyelven valódi mondat kell — `KUKA-238`), `(as39)` és a `KUKA-447` pozitív mintája
(a kötés-nyilatkozat alakja), `(as28)` (a plafon HARMADIK fogyasztója), és a `KUKA-331` pozitív
mintája (az átmeneti munkamenet új alakja).

**TIZENNÉGY ÚJ ÉLŐ MÉRCE, HÉT ELLENPÁRRAL** (`as50`–`as63`), és **mind a hét új tiltó-minta
bizonyítottan tüzel**: a kivezetett alakokkal a `verify:kuka` **10 FAIL**-t ad, visszaállítás után
**1116/1116**.

**ÉS EGY MONDAT, AMI NÉLKÜL EZ A SZAKASZ HAMIS LENNE:** a lelet-szám **csökkenése nem bizonyítja a
hibák hiányát** (R186 §5). Öt P2 jött a `8fc1f40`-re, és a mai fej **nem fedett** — a review-t a
záró fejre külön kértem.

### ÉS A JAVÍTÁSOK MEGMÉRÉSE KÉT TOVÁBBI SAJÁT LELETET ADOTT (`KUKA-465` · `KUKA-466`)

A tizenkét P2 javítása után a kötelező kapu **PIROS** lett (`FAIL — 3 mért hiba`), és az ok megint
nem a termék volt, hanem **a saját javításom fél-kész állapota**. A nyomon haladva két lelet jött ki
— mindkettő olyan, amit külső fél nem jelzett.

| | mi volt | mért következmény | mi váltja |
|---|---|---|---|
| **`KUKA-465`** (`D-VS-3247`) | a `KUKA-458` javítása a munkatárs-lista nemleges válaszának NEVÉT az **írás-út** saját feloldójáról kezdte venni (helyesen) — a mag **belső** ok-kódjai így egy **felhasználói** szöveg-rekeszbe kerültek | a `reasonText` a nem ismert kulcsot **NÉMÁN** az általános mondatra ejti: **öt** ok (`reentry_undecidable_clock` · `reentry_time_undecidable` · `delegation_ceiling_empty` · `parent_limit_undecidable` · `role_not_recognised`) „valami nem sikerült"-et adott volna az indok ÉS a teendő helyett. Ez a `KUKA-238` alakja az ÚJ rekeszen, és a `KUKA-201` elvesztése | mind az öt — és a túl rövid `role_not_delegable` — **valódi mondatot** kapott **mindhárom** bekapcsolt nyelven, a **teendővel** együtt. A jel **KÉT IRÁNYÚ**: `as64` minden deklarált okra megkívánja a valódi mondatot minden nyelven, `as65` a mag **három feloldójának FORRÁSÁBÓL** szedi az okokat, és pirosra vált, ha olyan jön, ami a lefordított listán kívül van — egy JÖVŐBELI új ok tehát **nevezetten** bukik |
| **`KUKA-466`** (`D-VS-3248`) | a süti NÉLKÜLI, állapotot KÉRŐ kérés útján a munkamenet-sor a tár **saját** `Date.now()`-jával született, a felvétel **tényét** viszont a hívó egy **korábban** leolvasott pillanatra kérdezte meg | átforduló millisekundumnál a kor **negatív** lett, és az ugyanebben a csomagban hozott — helyes — `KUKA-464` óra-védelme **a frissen született sorra** tüzelt: a tár eldobta (`evicted_idle`), a hívó pedig **„a munkamenet-tár megtelt" 503**-at adott egy **ÜRES** táron. A felhasználó teendője ebből hamis lett, és a meghívó-folytatás elveszett. **MÉRVE: 40 független próbából 3 (7,5%)** | a felvétel és az ellenőrzése **EGY időt kap** (`KUKA-314`: EGY DÖNTÉS — EGY IDŐ): a `newSession` harmadik paramétere a hívó pillanata, és azt adja tovább a tárnak. A javítás után **80 körből 0**. A `KUKA-464` védelme **változatlanul szigorú** — ellenpróbával: a JÖVŐBELI bélyegű sor továbbra is lejárt (`as67`) |

**AHOGY A `KUKA-466` ELŐKERÜLT, AZ A LÉNYEG:** a `verify:app-findings-r154` **ingadozott** — a `(t3)`
sor **hatból egyszer** bukott. Ha ezt „flake"-ként zárom le, egy éles, felhasználót érintő hiba marad
a kódban. **Az ingadozó próba egy MÉRÉS, nem zaj** (a `KUKA-414` rokona). A gyökér-okot a
kiszolgálót **újraindító**, 40 körös ellenpróba adta meg, és a javítást 80 kör igazolta.

**ÉS KIMONDOM, HOGY A JEL KÉT ELSŐ ALAKJA HAMIS ZÖLD LETT VOLNA** (`KUKA-215` · `KUKA-239` · R186 §1):
· 200 kérés a battéria **közös** kiszolgálóján 183 darab 503-at mért — de azok **valódiak** voltak (a
közös plafon 40 munkamenet), vagyis a mérés a **plafont** igazolta volna; · 200, majd **5000** kérés
saját, nagy plafonú kiszolgálón a **hibás** alakon is zöld maradt: a hamis 503 esélye meleg kódúton
**MÉRVE 0,02%** kérésenként, tehát 200 ismétlés felderítő ereje ~4%. Egy ilyen sor **nem tanú.** A
mai jel ezért **determinisztikus**: a kiszolgáló ebben a folyamatban fut, tehát a fali óra leolvasása
mérhetővé tehető — **léptetett** órával (minden leolvasás +5 ms) a döntés biztosan két pillanatra
esne. A kivezetett alakon ez a sor **503**-at mér, a mai alakon **200**-at (`as68`/`as69`).

**A KÉT TILTÓ-MINTA TÜZEL:** a kivezetett alakkal a `verify:kuka` **5 FAIL**-t ad (a `KUKA-466` két
tiltója, két pozitívja és a `KUKA-316` sorrend-pinje), visszaállítás után **1123/1123**.

### ÉS A KÜLSŐ REVIEW KÉT ÚJ P2-T ADOTT A `2d1b445` FEJRE — MIND A KETTŐ A §2 SAJÁT KÖTÉSÉRŐL

A Codex a **negyedik** fejen mért, és a két lelet **ugyanazt** mondja két helyen: a **nevezett
cél-kötés a HTTP-határon veszett el**. Mind a kettő **valódi**, mind a kettő **az én kódom** ebből a
körből, és mind a kettő a **legitim utat** zárta el.

| | mi volt | mi tört volna el | mi váltja |
|---|---|---|---|
| **`KUKA-467`** (`D-VS-3249`) · „Preserve named story slots in tour payloads" | a `KUKA-460` bevezette, hogy a kötés-nyilatkozat **rekeszt** nevezhet meg (`STORY_SLOTS`), a payload szerializálója viszont `=== true`-val mérte | a `'invite_ref'` **szöveg** `false`-ként érkezett a böngészőbe: a `tour.reentry` s4-e **nem** őrizte meg az általa kiállított ÚJ meghívó jelölőjét, az s8-a pedig **bármely** beváltott meghívót elfogadott — pontosan az a kereszt-meghívós teljesítés, amit a nevezett rekesz megelőzni hivatott. **MÉRT bizonyíték:** a rögzített bemutató-csomagban a javítás előtt **tíz** `story_bound: true` és **két** `story_rebind: true` állt, nevezett rekesz NÉLKÜL | a rekesz-feloldó **exportált** (`storySlotOf`), és a **motor, a lap ÉS a határ** ugyanezt futtatja; a nyilatkozat **normalizált** alakja megy ki, a nem ismert nyilatkozat `false` (`KUKA-236`) |
| **`KUKA-468`** (`D-VS-3250`) · „Bind replacement tours by the returned invitation ref" | az átkötést a kiszolgáló saját cél-kötése hitelesíti (`KUKA-456`), a kiszolgáló viszont a könyv **globális** sorrendjéből választott (`KUKA-461`), és a lap a hitelesítőt **megnevezés nélkül** kérte el | a lejárat a **kiadás** pillanatából, fix ablakkal számol — két meghívó lejárata **egyenlő lehet** (a bemutató-világban **mindig** az), és a holtversenyt a token dönti el: a kiszolgáló a **helyes művelet után is más sorra kötött**, a `taskDone` pedig a nem egyező `auth.ref` miatt elutasította a **tényleges** lépést. Ugyanez áll, ha közben egy **harmadik** alkalmas meghívó áll ki | a kérés **megnevezheti** a célt (`story_ref`, a ZÁRT mező-listán), és a kiszolgáló **arra** köt — **de csak az alkalmasak közül**, ugyanazon a szűrőn; nem alkalmas vagy nem létező megnevezés mellett a válasz **betűre** a mai alapértelmezés, tehát nincs új megkülönböztetés (`KUKA-084`) |

**ÉS A `KUKA-468` MÉRÉSE EGY SAJÁT LELETET IS ADOTT:** a bemutató **csonkja más szabályt futtatott** —
a leg**korábban** lejárót választotta, miközben a kiszolgáló a leg**frissebbet**. A lap és a próba így
**más rendszert** mért volna (`KUKA-227` · `KUKA-207`); a csonk ma ugyanazt a sorrendet futtatja, és a
kért célt is előnyben részesíti.

**AMIÉRT EZ A KETTŐ FÁJ A LEGJOBBAN:** a motor saját mércéi (`as54`/`as55`) **zöldek** voltak, mert a
`taskDone`-t **közvetlenül** hívták — a lap mégis `false`-ot kapott. **A határ zöldje nem a felület
zöldje** (`KUKA-227`), és a hatókör nélküli mérés a szomszéd sort igazolja (`KUKA-239`). Ezért az új
jel a **HATÁRT** kérdezi: `as70` (a nevezett rekesz a válaszban), `as71` (a határ és a motor **minden
bemutató minden lépésén** egyezik), `as72` (a **rögzített** csomag is a rekesz NEVÉT viszi, és a `true`
alak ujjlenyomata nem állhat benne), `as73`/`as74` (a megnevezett cél előnyt kap · a nem létező
megnevezés válasza **betűre** az alapértelmezés).

**A TIZ TILTÓ-/POZITÍV IRÁNY BIZONYÍTOTTAN TÜZEL:** a kivezetett alakokkal a `verify:kuka` **10
FAIL**-t ad (három fájlban), visszaállítás után **1136/1136**.

**ÉS A SZÁMOK A MAI FEJEN:** a külső review eddig **tizennégy P2-t** adott erre a körre **négy fejen**
(`8fc1f40` → `e95e066` → `5faeb5a`/`defddc1` → `2d1b445`), ebből **kettő** már a felmerülés előtt
javítva volt, **tizenkettő** ebben a körben épült meg. Ehhez jön **négy saját lelet** a javítások
megméréséből (`KUKA-465` · `466` és a `467`/`468` mérésekor a csonk-sorrend). **A lelet-szám
csökkenése nem bizonyítja a hibák hiányát** — a `2d1b445` után a `05f90bd`-re is kértem review-t.

### ÉS A ZÁRÓ FEJEKRE MÉG NÉGY P2 JÖTT — A FELKÍNÁLÁS UGYANAZON LECKÉJE, NÉGY HELYEN

A Codex a **hatodik** és **hetedik** fejen is mért (`5ada0fd` → `0cdd0f2`), és **négy** további P2-t
adott. Mind a négy **valódi**, mind a négy **az én kódom** ebből a körből, és három közülük
**ugyanazt** a leckét mondja: *a felkínálás a VÉGIGVIHETŐSÉG állítása, tehát a feltétele a
LEGSZŰKEBB későbbi kapu — nem a legközelebbi réteg.*

| | a lelet | mi tört volna el | mi váltja |
|---|---|---|---|
| **`KUKA-469`** (`D-VS-3251`) | a romboló történetek előfeltétele a **delegálási plafont** kérdezte | a plafon azt méri, mit adhat **tovább** a kezelő; a történetek **első** feladat-lépése viszont **megvonás**, és ahhoz `alter_right` hatáskör kell, amit a tagság **nem** ad. **MÉRVE:** a delegált `admin` plafonja érvényes (`admin`+`user`, `keszlet`), a hatásköre nincs, és a megvonása **403 `authority_not_established`** — a mag saját üzenete szerint *„a tagság — akár admin — ehhez nem elég: a hatáskör MŰVELETENKÉNT adott"* | a felkínálás **ugyanazt** a feloldót kérdezi, amit az írás-út (`executableRightAt`, `operation: 'alter_right'`), **egyszer** (`KUKA-436`) — és hatáskör nélkül **nincs cél**: egy kapu, négy mezőre |
| **`KUKA-470`** (`D-VS-3252`) | a **meghiúsult** kilépés „saját kezdeményezés" jelet hagyott maga után | ha közben egy **másik fül** kicseréli a kiszolgált személyt, a következő frissítés a változást **sajátnak** látja, és a lap **némán** átveszi az új nézetet — a „más ember lépett be" figyelmeztetés nem jelenik meg. Egy **múló hálózati hiba** után tehát más ember adata látszana a saját műveletem folytatásaként | a hiba-ág a jelölőt **visszaveszi** (ami nem történt meg, azt nem kezdeményeztük); a nemzedék-szám emelése marad (`KUKA-230`). **ÉLŐ böngésző-tanú:** `R186-T4` |
| **`KUKA-471`** (`D-VS-3253`) | az **újbóli meghívás** felkínálása a cím **létét** kérdezte | a **beváltás** bizonyított csatornát kíván. Importált vagy cserélt címnél a sor műveletét **engedve** rajzoltuk, az írás-út **ki is állította** a meghívót — a címzett **soha nem tudta beváltani**, a kezelő pedig azt látta, hogy elküldte. Ez a `KUKA-454`/`455` **harmadik** előfordulása, a **közönséges** úton: klasszikus **fél őr** (`KUKA-039`) | a feloldó a beváltás **saját** feltételét kérdezi, és a nemleges válasz **nevezett**, mindhárom nyelven a **teendővel** (`KUKA-201` · `KUKA-465`) |
| **`KUKA-472`** (`D-VS-3254`) | a sor a tag **mai** szerepét mérte, a megmért szerep-**készletet** eldobtuk | a panel **minden** ismert szerepet felkínált: egy delegált kezelőnél a plafonon túli választás `outside_basis_roles`-szal bukik — a `tour.reentry` közben **a megvonás után**, tehát **kárt hagyva**. `KUKA-041`: a hamis gomb és a némán letiltott gomb ugyanaz a hiba két irányból | a sor hordozza a **megmért** készletet (`reinvite_roles`), és a panel **csak ebből** választ; készlet nélkül a tag **mai** szerepe az egyetlen választható (`KUKA-049`) |

**ÉS A MEGMÉRÉS KÉT SAJÁT MÉRÉSI HIBÁT IS KIHOZOTT, KIMONDVA:** (1) az első fixtúrám a
**regisztrációs** levelet váltotta be a meghívó helyett — a fejlesztői levél-fogadó a **legfrissebbet
adja előre**, tehát a „vedd az utolsót" alak a **legrégebbit** vette; a meghívót mostantól a
**hivatkozása** azonosítja, nem a sorrend. (2) Az első alakom a `story_data` **belső** tényét kérdezte
a válaszból, ami ott **nincs** — a mérés ezért a **HATÁRON** áll: a **felkínált listát** és az írás-út
válaszát méri, vagyis azt, amit a felhasználó lát (`KUKA-215` · `KUKA-239`).

**ÉS AMIT A `KUKA-471` JAVÍTÁSA KÖLTÖTT, AZ IS MÉRÉS.** A javítás a **magot** érintette
(`v3ref/delegation.mjs`), ezért a korábbi fejen (`05f90bd`) futó **külső lánc** bizonyítéka a mai
magra **nem érvényes**. Azt a futást **leállítottam** — nem hagytam zöldnek látszani —, és a lánc a
**záró fejen** indult újra, utána a mag-battéria. Ez a `KUKA-200`/`KUKA-206` szabálya a saját
munkámon: *ami nem a mai forráson futott, az nem a mai forrás bizonyítéka.*

### ÉS MÉG KÉT KÖR JÖTT A ZÁRÓ FEJEKRE — EGY OSZTÁLY-LELET ÉS EGY TITOK-HIGIÉNIAI

| | a lelet | mi tört volna el | mi váltja |
|---|---|---|---|
| **`KUKA-473`** (`D-VS-3255`) · „Gate revoke buttons on executable authority" | a **négy** megvonás-művelet jelzője a plafont és az állapotot mérte, a **végrehajtható hatáskört** nem | mind a négy írás-út `alter_right` hatáskört kíván, amit a tagság **akár `admin` szerepben sem** ad meg (a mag saját üzenete mondja ki). Egy delegált kezelő tehát **négy** olyan gombot látott, ami rá nézve biztosan nemet mond — a `tour.reentry`-nél a megszakadás **a megvonás után** jött volna. **MÉRVE:** a plafon érvényes (`admin`+`user`), a hatáskör nincs, a megvonás **403** | a hatáskör **egy nevezett verdikt**, és minden fogyasztója ebből dönt: a kiszolgáló **egyszer** kérdezi (`KUKA-436`), a meghívó-lista `revocable` és a tag-lista `rights_alterable` mezője ezt viszi, a lap **mindkét** megvonás-gombot ebből rajzolja, és a mag feloldója a hatáskört **első kapuként** kérdezi |
| **`KUKA-474`** (`D-VS-3256`) · „Normalize absolute paths before checking export boundaries" | a fogyasztás-export út-tisztítója a **relatív** utat normalizálta, az **abszolútat** szó szerint adta a határ-ellenőrzésnek | egy `<repó>/../customer/…` alak **átment** a repó-határ kapuján, és a kiírt út egy repón **kívüli**, telepítési vagy **ügyfél**-könyvtár nevét vitte — **abba a leltárba, ami a repóba kerül**, tehát a nyilvánosságba | a határ **kanonizált** úton dől el (`resolve` a tartalmazás-ellenőrzés előtt), **mindkét** bemeneti ágon |

**A `KUKA-473` HATÓKÖRÉT A HIBA-OSZTÁLY ADTA** (`KUKA-418`): a külső fél **egy** jelzőt nevezett meg, a
mérés viszont **mind a négy** írás-utat megkérdezte. Ugyanebből a végigkérdezésből jött egy **saját
lelet** is: az **új meghívás** űrlapján az adatkör-választék már a plafonból jött, a **szerep**-választék
viszont **beégetve** két opciót rajzolt — ma a kiszolgáló a `grantable_roles`/`blocked_roles` készletet
is kiadja, és az űrlap abból rajzol (`as86`/`as87`).

**ÉS A `KUKA-474` MÉRÉSÉNEK ELSŐ ALAKJA HAMIS ZÖLD VOLT — kimondva** (`KUKA-215` · `KUKA-239`): a
`--transcript` paramétert vizsgálta, azt viszont a szerszám **már kanonizálja**, tehát a sor a
**kivezetett** alakon is zöld maradt. A sérülő bemenet az **átirat tartalma** (egy szerszám-esemény
`file_path` mezője); a mai mérés ezt állítja elő, és a **kimeneti JSON-ban** keresi a könyvtárnevet —
**mérve: a kivezetett alakon 1 találat, a maival 0**, és az ellenpróba a battérián **2 FAIL**-t ad.

### ÉS A KILENCEDIK FEJRE MÉG KETTŐ — AZ IDEMPOTENS NYUGTA ÉS A KITALÁLT TARTALÉK

A Codex a `2812c58` fejen **két** P2-t adott, és mind a kettő **valódi**, mind a kettő **az én kódom
ebből a körből**, és mind a kettő **ugyanarról** szól: *a rendszer két külön tényt ad (megtörtént-e ·
mi az állapot), a lap pedig csak az egyiket olvasta.*

| | a lelet | mi tört volna el | mi váltja |
|---|---|---|---|
| **`KUKA-475`** (`D-VS-3257`) · „Do not complete the revoke task when nothing changed" | a megvonás **üzletileg idempotens**: ha egy **másik fül** a lap betöltése után már megvonta a tagot, a mag `ok: true` **és** `changed: false`-ot ad (`revocation_already_effective`). A lap a puszta `ok`-ra zárta a bemutató lépését | a lap azt mondta ki, hogy **EZ** a kérés szüntette meg a hozzáférést — **meg sem történt átmenetre** állított teljesítést, és a bemutató lépése „elvégezve" jelet kapott. A szomszéd utak (adatkör-megadás · meghívó-visszavonás) **már** ezt a szabályt követték (`KUKA-129`), tehát fél őr volt | az átmenet a mag **teljes verdiktjéből** jön (`r.revocation.changed`), és változatlan állapotnál **nevezett nyugta** áll, mindhárom nyelven, a teendővel |
| **`KUKA-476`** (`D-VS-3257`) · „Block the invite form when no scope is delegable" | a meghívó-űrlap adatkör-választéka **üres plafon** mellett egy **beégetett** `keszlet`/`arak` tartalékra esett | visszaállította pontosan azt a **hamis gombot**, amit a plafon-mérés (`KUKA-472`) megszüntetett: a delegált kezelő olyan adatkört kínált volna fel, amit az írás-út `outside_basis_scopes`-szal utasít el | az űrlap **mindkét** megmért készletre zár (szerep **és** adatkör), és üres készletnél a **nevezett mondat** áll az űrlap helyén — „nem tudom" ≠ „jó lesz" (`KUKA-049`) |

**ÉS AMIT MAGAMRÓL RÖGZÍTEK, MERT A JELENTÉS NÉLKÜLE HAMIS:** a `KUKA-476` beégetett tartalékát a
`KUKA-472` javításakor **láttam**, és nem javítottam — a plafon-készletet a panelen bevezettem, az
űrlap tartalék-ágát viszont ott hagytam. **Amit egy javítás közben észreveszek, de nem javítok, azt
nevezzem meg** (`D-VS-3257`), különben a következő review-körre marad, ahogy most történt.

### ÉS A KÖTELEZŐ KAPU A ZÁRÓ FEJEN KÉT SAJÁT LELETET FOGOTT MEG (`KUKA-477` · `KUKA-478`)

A kapu a záró fejen **PIROS** lett — `FAIL, 4 mért hiba` —, és mind a két oka **a saját javításaim
következménye** volt: nem a termék régi hibája, nem a gép, és nem „ingadozó próba". A `D-VS-3245`
óta épített szabály (*a felkínálás a VÉGIGVIHETŐSÉG állítása*) **új hiba-osztályt is nyitott**: ahol
eddig mindig volt gomb, ott most a felkínálás FELTÉTELE dönt — és a feltételnek **minden
kiszolgálón** és **minden időpillanatban** mérhetőnek kell lennie. A kettő pontosan ezt a két hiányt
mondja ki.

| | a lelet | mi tört el, MÉRVE | mi váltja |
|---|---|---|---|
| **`KUKA-477`** (`D-VS-3258`) | a lap új válasz-mezőket kezdett olvasni (`grantable_roles` az űrlaphoz, `revocation.changed` a nyugtához), a **bemutató csonkja** viszont a RÉGI választ adta | a bemutató lap UGYANAZT az `app.js`-t futtatja, csak a HTTP-határ mögött a csonk áll: a `tour.inviteRevoke` a **13.**, a `tour.reentry` a **3.** lépésén BERAGADT — **mind a két szélességen** (1280 px és 390 px), tehát a bemutató két legfontosabb története nem volt végigvihető | a csonk a MAI szerződést adja: `grantable_roles` · `blocked_roles` · `rights_alterable` · `reinvite_roles`, és a megvonás a mag **teljes** verdiktjét, az **idempotens** ismétléssel (`changed: false`) együtt |
| **`KUKA-478`** (`D-VS-3258`) | a készlet-kapuk a `scopeMeta` két tömbjére zárnak, a **kezdő** alak viszont ÜRES tömböket tartalmazott — ugyanazt, amit egy **mért** üres plafon ad | a segéd „készítsd elő a meghívást" folytatása a lap-váltással EGY pillanatban nyitotta a panelt, a lista válasza pedig csak a rajzolás UTÁN érkezett: egy **friss tulajdonos** — akinek a kiszolgáló két szerepet és négy adatkört ad (`as93`, élőben) — azt a mondatot kapta, hogy **nincs mit felkínálni**. A nem mért állapotból nemleges válasz lett | a `scopeMeta` kimondja, hogy **mértünk-e**, a panel **előbb mér, utána rajzol** (a futó mérést megvárja, másodikat nem indít), és az újrahívás űrlapjának kitalált `['keszlet']` tartaléka is **kivezetve** |

**ÉS HÁROM PRÓBA-OLDALI JAVÍTÁS IS KELLETT — KIMONDVA, MERT A MÉRÉS IS MÉRÉS ALATT ÁLL** (`KUKA-237`
· `KUKA-239`): (a) az `R134-B2` a felfüggesztést a **tárolóban** oldotta fel (fixtúra: HTTP-út nincs
rá), a sor „újrahívható" jelzője viszont az R186 §5 óta a kiszolgáló **mért** verdiktje — a lapnak
tehát **újra be kell kérnie** a listát, és ezt most a **fülváltás** valódi vezérlőjével teszi; (b) az
`R186-T4` a profilmenüből indított kilépés után a lap gombjára kattintott, miközben a **nyitott
lenyíló rátakart** (a Playwright ezt nevezetten ki is írta) — a próba most **becsukja a menüt, ahogy
a felhasználó**; (c) a `proof:demo-walk` két beragadása a csonk hibája volt, nem a bejáróé — a bejáró
**pontosan azt mondta**, ahol megállt (`s13/invite-open` · `s3/members-list`), és ez a §1-ben épített
„nem mondhat teljesítést részleges futásra" szabály **haszna**. **Egyik próba-javítás sem lazít a
mérésen**: a mért VISELKEDÉS ugyanaz maradt.

**AMIT EZ A SZAKASZ A KAPURÓL ÁLLÍT:** a kötelező böngészős kapu **két, élő felhasználói utat elzáró
hibát** fogott meg, amit se a mag-mércék, se a rövid láncok, se a külső review **nem** jeleztek — a
mag és a határ zöld volt mind a kettőnél. **A HATÁR ZÖLDJE NEM A FELÜLET ZÖLDJE** (`KUKA-227`).

**ÖSSZESEN:** a külső review a csomag alatt **KILENC fejen** mért, és **huszonkét P2-t** adott; kettő
már a felmerülés előtt javítva volt, **húsz ebben a körben épült meg** — és ehhez jön **tíz saját
lelet** a javítások megméréséből (köztük **három olyan, ahol a SAJÁT MÉRÉSEM volt a hibás**, és
**kettő, amit a KÖTELEZŐ KAPU fogott meg a záró fejen**).

---

## 7. NYITOTT LELETEK ÉS MÉRÉSI HIÁNYOK — nevezetten

| tétel | állapot |
|---|---|
| **`R112-I3`** újrarajzolási hiba | **NYITOTT.** Két jelölt mechanizmus mérve kizárva; a mechanizmus nem állapítható meg. Feltételezett javítás nincs; a rögzítés megerősítve (5. szakasz) |
| **`r57` · `r59`** (az eredeti külső programok) | **NEVEZETT KÖRNYEZETI KIHAGYÁS, zöld helyettessel — NEM zöld, és nem is „részben zöld" (`KUKA-206`). A lánc `complete_evidence` jelzője `false`.** `r57`: 4/9 — három eset a program pre-basis fixtúra-világán, kettő a programon BELÜLI 15 000 ms-os korláton. `r59`: nincs részletes eredmény. A deklarált helyettesek (`r57a` · `r59a`) ugyanazokat az eseteket mérik, és zöldek |
| **`personal.ownMatters`** lefedési rés | **NYITOTT, nevesített fejlesztési rés** — a `verify:lefedes` `LT` sora szándékosan piros; pótolható **0**, osztályozatlan **0** |
| **a `tour.grant`/`tour.scopeLifecycle` buborék-mondata** | **MÉRT MEGFIGYELÉS, nem javítva.** A lépés deklarált feltárója a tag-TÁBLA, a célt viszont a SOR hozzáférés-gombja tárja fel; a bemutató „nyisd meg a kiemelt gombbal" mondata emiatt pontatlan. A történet **végigvihető** (mérve), a regiszter pedig szándékosan nem nevez per-fiók azonosítót (`KUKA-225`). Más terület: **külön backlog** (R186 §5) |
| **az út-tisztító symlink-korlátja** (`KUKA-474`) | **NEVEZETT, NYITOTT TÉTEL.** A könyvtár-határ ma **lexikális** kanonizáláson dől el (`resolve`), tehát egy repón **belüli**, kifelé mutató **jelképes lánc** ezzel NEM derül ki. A `realpath` fájlrendszer-hozzáférést és nem létező útra kivétel-kezelést kíván — külön tétel, nem ebben a csomagban |
| **a bemutató csonkjának SÉMA-PARITÁSA** (`KUKA-477`) | **NEVEZETT, NYITOTT TÉTEL.** A csonk ma azt adja, amit a lap megkérdez — a kiszolgáló válaszának TELJES sémájához nincs gépi paritás-őr, és az `as90`/`as91` a csonk FORRÁSÁT méri (a modul a böngésző `fetch`-ét cseréli, innen nem hívható meg). A VISELKEDÉSI tanú a kötelező kapu `proof:demo-walk` lánca, ami CSAK a két bemutató-történet útját kattintja végig: egy harmadik úton ugyanez a hiba ma is átmenne |
| **élő AI · PG18 · felhős mentés** | **KÜLÖN NYITOTT TÉTELEK** — ez a csomag nem állít róluk semmit |
| **a külső review HUSZONKÉT P2-je** (KILENC fejen) | **MIND KEZELVE** — kettő már a felmerülés előtt javítva volt (`KUKA-453` · `e614a39`), **húsz ebben a körben épült meg** (`KUKA-454`…`456` · `458`…`464` · `467`…`476`), mindegyikhez ÉLŐ mérés és ELLENPÁR. **A szálak github-oldali lezárását nem végeztem el**, és a válaszolt szál nem elfogadás. **A lelet-szám csökkenése nem bizonyítja a hibák hiányát** |
| **a saját méréseimből jött leletek** (`KUKA-465` · `KUKA-466` · `KUKA-477` · `KUKA-478` · a csonk-sorrend a `468` mérésekor) | **MIND JAVÍTVA ÉS MÉRVE** (`D-VS-3247` · `D-VS-3248` · `D-VS-3250`). A `KUKA-466` a `verify:app-findings-r154` **ingadozásából** jött (hatból egy bukás): hamis „megtelt" 503 egy ÜRES táron, MÉRVE 40-ből 3; javítás után 80-ból 0. **A jele determinisztikus**, mert a két első alakja hamis zöld lett volna (6. szakasz) |
| **a mai fej független elfogadása** | `REVIEW_ALLAPOT` |

**A nyitott review-szálakat nem zártam le**, és nem is zárom: az R186 §5 kimondja, hogy a nyitott
leleteket nem zárjuk le pusztán megválaszolás vagy új blokk miatt. **A válaszolt szál nem elfogadás.**

---

## 8. A BEMUTATÓ ELÉRÉSI ÚTJA — ÉS HOL FUT

**HOL FUT:** az **ügynök felhős tárolójában**, nem az operátor gépén. A `127.0.0.1:3300` cím **csak
ott** érvényes; az operátor böngészőjéből **nem** elérhető. Telepítés nem történt, és nem is kérem.

```bash
# 0) ELŐFELTÉTEL, amit könnyű elvéteni: ebben a környezetben NODE_ENV=production áll, ezért a
#    sima `npm ci` a FEJLESZTŐI függőségeket (köztük a Playwrightot) KIHAGYJA — a böngészős kapu
#    enélkül el sem indul. Ezért:
npm ci --include=dev

# 1) a próba-alkalmazás (SQLite, üzleti adat nélkül, titok nélkül)
DATABASE_URL= VS_DEMO=1 npm run app:dev        # → http://127.0.0.1:3300/

# 2) a kötelező böngészős kapu
npm run verify:browser-gate

# 3) a rövid láncok
npm run verify:kuka && npm run verify:app-findings-r154 && npm run verify:decision-numbers
npm run docs:html && npm run verify:doc-html

# 4) a külső ellenőrző lánc (HOSSZÚ — a mért maximum programonként 21,1 perc)
npm run verify:external-checks
```

**Titok nincs benne:** üres `DATABASE_URL` mellett SQLite-on fut, migráció nem kell, `.env` nem
szükséges. `DATABASE_URL` és bármely kulcs **soha nem kerül chatbe és lapra**.

**A bemutató két útja:** `http://127.0.0.1:3300/demo-index.html` (bemutató-lap) és
`http://127.0.0.1:3300/` (**a VALÓDI felület**).

**AZ ELŐFELTÉTELEK — ÉS EZEK A KÖR SORÁN SZIGORODTAK.** A felkínálás a VÉGIGVIHETŐSÉG állítása,
tehát minden későbbi írás-feltétel ide is tartozik:

| történet | mi kell hozzá |
|---|---|
| **1 · Meghívás visszavonása** | függő meghívás **a levelével** a fejlesztői levél-fogadóban · a címzettnek **fiókja** van **ÉS** a meghívott címét **igazolta** (`KUKA-454`) · az ajánlott szerep a kezelő **plafonján belül** van |
| **2 · Munkatárs visszatérése** | **hatályos** másik tag · **pontosan egy** tárolt címe van (`KUKA-455`), és az **bizonyított** (`KUKA-462`) · nincs rá élő felfüggesztés vagy kitiltás · a tag **mai szerepe** és a történet **adatköre** (`keszlet`) a kezelő **plafonján belül** van (`KUKA-459`) |

Ha bármelyik nem áll, a bemutató **nem felkínált** — és ez SZÁNDÉKOS: inkább ne ajánljuk fel, mint
hogy a VISSZAFORDÍTHATATLAN lépés UTÁN akadjon el.

**AZ OPERÁTORNAK:** ez a csomag **össze nem olvasztott ágon** áll, ezért a `main`-es terminál-blokk
EZT nem mutatja meg. Amit meg tud nyitni: ennek a lapnak az olvasható (HTML) alakja a board
**Dokumentumok** fülén.

---

## 9. FOGYASZTÁS

Ablak: `2026-10-09T13:00:00Z → a jelentés írásáig` · **286 hívás** · fő-szál kontextusmedián
**429 094,5** · max **695 585** · **ügynök-bemenet 0** (0 ügynök) · lefedettség **teljes**.

**A CHATVÁLTÁSI JELZŐ ELÉRVE** (429 094,5 ≥ 400 000, `D-VS-3083`): a futó munkablokk célzott
ellenőrzéssel lezárható, a **következő önálló nagy blokk friss beszélgetésben induljon**.

---

## 10. AMIT EZ A JELENTÉS NEM ÁLLÍT

- **Nem** állítja, hogy a csomag merge-kész: merge, force-push, felhős telepítés, titok-módosítás,
  üzleti adatváltoztatás, V2-/production-módosítás és `CMD`/`PR-VS-300` lezárás **nem történt**.
- **Nem** állítja, hogy a külső lánc 19/19: az `r57` és az `r59` **nevezett környezeti kihagyás**,
  zöld helyettessel — a lánc saját `complete_evidence` jelzője `false`, és az `r59`-nél
  **esetenkénti bizonyíték sincs**.
- **Nem** állítja, hogy a keret-emelés javított bármit: a mért maximum 21,1 perc, a 120 perc tartalék.
- **Nem** állítja, hogy az `R112-I3` le van zárva: a mechanizmus **nincs megmérve**, a tétel nyitott.
- **Nem** állítja, hogy a bejáró mai zöldje minden felkínált útmutató teljes bejárását bizonyítja —
  csak azt, amit a `walkOutcome` mér, és amit az `R166-U6`/`U7` pár ellenpróbával igazol.
- **Nem** állítja, hogy a mai fejet független fél elfogadta (7. szakasz). És **nem** állítja, hogy
  a tizenkét P2 javításával a hibák elfogytak: **a lelet-szám csökkenése nem bizonyítja a hibák
  hiányát** (R186 §5) — három egymás utáni review-kör pontosan ezt mutatta meg, hiszen minden
  kör az előző javítását buktatta meg. A későbbi fejeken a Codex néhány futása **saját oldali
  hibával** (⚠️ Failed) állt le — az NEM lelet és NEM is elfogadás; a záró fejre a review-t
  külön kértem.
- **Nem** állítja, hogy a bemutató minden állapotból végigvihető: a felkínálás feltételei a kör
  során **szigorodtak** (8. szakasz), és ahol nem állnak, ott a bemutató **nem felkínált** —
  szándékosan.
- **Nem** állítja, hogy a `KUKA-464` a FALI ÓRA kérdését egészében megoldotta: a monoton órára
  váltás **nevezett, külön tétel** — a mai javítás a KÁRT zárja el.
- **Nem** PG 18-kompatibilitás, **nem** felhős mentés bizonyítéka, és **nem** épít üzleti
  ERP-funkciót vagy élő AI-szolgáltatót.
