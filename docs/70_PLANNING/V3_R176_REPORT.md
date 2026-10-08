# V3 · R176 — JELENTÉS

**Parancs:** `CMD-VS-300-002-002 R176 — DECISION` (chatgpt-v3, az operátor felhatalmazásával) ·
`v3ref/source-documents/R176_board_v1.md` (szó szerint, 6244 karakter)
**Repó:** `valach-system` · **ág:** `claude/cmd-vs-300-002-002-r166-x7rrk4` (a PR ága:
`claude/r154-audit-fix`)
**Dátum:** 2026-10-08

---

## 0. EGY BEKEZDÉSBEN, ÜZLETI NYELVEN

Az R176 két fennmaradó feladatot kért. **Az első elkészült:** a két szereplős történet
(meghívás visszavonása · munkatárs visszatérése) mostantól a **tényleges VS-felületen** megy végig,
valódi HTTP-vel, valódi tárolóval és valódi ki-/belépéssel — asztali nézetben **és 390 px-en**,
a váltás határán **újraindítással** is. A bejárás közben **öt valódi hibát** találtam és javítottam;
kettőt közülük nem a gondolkodásom, hanem a **kötelező kapu mérése** talált meg. **És a jelentés írása közben a külső
ellenőrző korlátja feloldódott:** a review lefutott, **négy P2** jött, és mind a négy javítva —
köztük egy olyan, amit a **saját próbám elrejtett**. **A második feladat
részben teljesült:** a hat ellenőrző programot egyenként lefuttattam a mai fejen — **kettő zöld**
(ebből az egyik korábban piros volt), **négy piros**, és mind a négy piros okát MÉRTEM. A négyből
**háromnál a mi gépünk** a korlát: a program a megengedett véges keretet (30 perc) kimeríti.
**A 19/19 tehát nem állítható** — és ezt nem kerülöm meg.

---

## 1. A MÉRT VERDIKTEK EGY TÁBLÁBAN (a mai fejen)

| mérce | verdikt |
|---|---|
| **KÓD-SHA (amit mértem)** | `9adb8d9` — a kötelező kapu EZEN a fejen zöld |
| **a kötelező böngésző-kapu** | **ZÖLD** — `verify:browser-gate`: **144 teljesült · 0 bukott · 0 ingadozó · 0 kihagyott**, 26 próba-fájl; `proof:demo-walk` 482 s |
| **a két szereplős bejárás a VALÓDI felületen** | **6/6 ZÖLD** — K1 19/19 · **K2 20/20** · K3 19/19 (390 px + újraindítás) · K5 · K6 · **K7** (az átadás három őre) — és a próba a váltás-lépésen **nem** nyitja ki helyettünk a menüt, a fiókváltást pedig a történet SAJÁT lépése végzi |
| **KUKA-regiszter** | **993/993 PASS** (`verify:kuka`) — 422 bejegyzés, **tizenhat** újjal (`KUKA-416`…`KUKA-431`) |
| **R154 battéria** | **325/325 PASS** (`verify:app-findings-r154`) — tizenkét új mércével (as7–as16 · ar11–ar12) |
| **D-VS számozás** | **4/4 PASS** — **tizenhat** új döntés: `D-VS-3210`…`D-VS-3225`; a következő szabad: `D-VS-3226` |
| **próba-alkalmazás önellenőrzés** | **57/57 PASS** (`app:selfcheck`) |
| **a hat külső program** | **2 ZÖLD · 4 PIROS** — a külön verdiktek a 3. szakaszban; a teljes lánc állapota is ott |
| **a review által FEDETT SHA** | **`5390b7c`** — a korlát **FELOLDÓDOTT**, és négy körben összesen **tizennégy P2** jött (`fb231e6`: 4 · `4b930dd`: 2 · `30830ae`: 4 · `5390b7c`: 4); **mind a tizennégy javítva** (lásd a 7.4 pontot). A mai, `9adb8d9` fej — maguk ezek a javítások — **nem fedett** |

---

## 2. R176 §1 — A VALÓDI KÉT SZEREPLŐS BEJÁRÁS (az R166 §2 teljesítése)

### 2.1 Ami elkészült, és mit mér

Új tanú: **`tests/e2e/v3app-r176-ket-szereplo.spec.mjs`** — a két történetet a **valódi** felületen
vezeti végig. Nincs megszemélyesítő kapcsoló (a parancs nem is kért ilyet): a szereplőváltás
**valódi kijelentkezés + a másik ember valódi belépése** ugyanabban a böngészőben.

| próba | mit visz végig | verdikt |
|---|---|---|
| **R176-K1** | 1. történet: a függő meghívás **visszavonása**, majd **új meghívás** és **elfogadás** — 19 lépés | **19/19**, és a TÁR is igazolja: Béla valóban tag lett, a visszavonás sora megvan |
| **R176-K2** | 2. történet: a munkatárs visszatérése a **tagságtól a készletadatig** — 18 lépés | **18/18**, és a TÁR igazolja: újra tag, a `keszlet` jog kiadva, az `ar` jog **nem** |
| **R176-K3** | ugyanaz **390 px-en**, és a váltás határán **a lap újratöltésével** | **19/19**, az újraindítás MEGTÖRTÉNT, a haladás megmaradt; a tár szerint a tagság létrejött |
| **R176-K5** | ELLENPÁR: **nem deklarált** határon kilépés | a futás elvész, és a meghívó-jegy **nem** kerül a következő emberhez |

A lépéseket a próba **nem** a bemutató helyett nyomja meg: minden lépésnél megvárja a saját
címét, elvégzi a VALÓDI műveletet (visszavonás · levél megnyitása · elfogadás · jogadás), és csak
utána lép tovább — a „Tovább" a felhasználó döntése, az útmutató nem kattint helyettünk
(`KUKA-228`).

### 2.2 Az öt javított lelet — mind MÉRVE

1. **A VALÓDI héj nem kínálta fel a történetet.** A szereplő-váltó lépés célja egy szemantikus
   horgony („az a vezérlő, amivel a néző átvált a másik szereplőre"), és a héjban nem volt ilyen
   deklarálva. **Javítva:** a horgony a **MEGLÉVŐ kijelentkezésre** került (a héjban és a
   meghívóképernyőn is) — új kapcsoló nélkül.
2. **A meghívó elfogadása utáni folytatásvesztés.** A visszaállás a lépés-listát az
   **indíthatók** közül kereste — a meghívott viszont nem fiókkezelő, tehát az ő nézetében a
   kiszolgáló nem kínálja fel indításra. **Javítva:** a határ külön listát ad a **folytathatókról**
   (`resumable_tours`), a felület ebből is keres, és a két lista UGYANABBÓL a leképezőből jön.
3. **Hiányzott az utolsó lépés.** Az elfogadás után a meghívott a saját személyes körében áll, a
   cég képernyői csak a cég fiókjában érhetők el. **Javítva:** új `s10b` lépés („Válts át a cég
   fiókjára"), és az elfogadás utáni **nézet-újrakötés** ott fut, ahol a kész állapot már látszik.
4. **`KUKA-416` — a fejléc nyitott takarói túlélték a személy váltását.** A `go()` becsukta a
   három lenyílót, a kilépés és a következő belépés viszont csak az ADATOT ürítette. 390 px-en
   MÉRVE: az `elementFromPoint` a fiókválasztó nyitója közepén `div#profile-menu`-t adott — a
   következő ember **rá sem tudott kattintani** arra, amire az útmutató mutatott; a történet
   11/19-nél megállt egy ÉP felületen. **Javítva:** a zárásnak EGY otthona van
   (`closeHeaderOverlays`), és a **közös nézet-ürítő** hívja. Döntés: `D-VS-3210`.
5. **`KUKA-417` — a vezérlő megvolt, a történet INDULÓ adata nem.** A horgony-javítás után a két
   történet a héjban is felkínálódott — a **kötelező kapu** viszont megmérte, hogy egy mintaadat
   nélküli vállalkozásban a visszavonás a 4. lépésen (nincs függő meghívás), a visszatérés a 2.-on
   (nincs másik tag) megszakad. **Javítva:** a regiszter kimondja az induló adatot
   (`requires_story_data`, zárt készlet), a kiszolgáló a TÁRBÓL méri, a kapu nyilatkozat nélkül
   ZÁRVA — **a FOLYTATÁS viszont nem kéri el** (ami már elindult, annak az induló feltétele már nem
   feltétel). Döntés: `D-VS-3211`.

**A 4. és az 5. leletet nem a tervezésem találta meg, hanem a MÉRÉS** — a 390 px-es bejárás, illetve
a kötelező kapu három pirosa a saját változásom felett. Ezt azért írom le, mert a tanulság is ez:
a kapuszélesítés nyereségét a feltételeivel együtt kell végiggondolni.

### 2.3 Amit VISSZAVONTAM — holt kódot hamis lelettel nem szállítunk

A bemutató-motor „harmadik állapotának" (`navIntentFulfilled`) a sorrendjét először hibának
gondoltam, és át is írtam három döntési ponton. Aztán **megmértem**: a `revealerOf` pontosan akkor
ad `null`-t, amikor az `aria-current="page"` áll — vagyis a két feltétel **kizárja egymást**, és a
sorrend semmit nem változtat. A módosítást **visszaállítottam**, és nem írtam hozzá KUKA-bejegyzést:
egy nem létező hibához nem gyártunk tanulságot (`KUKA-050`).

### 2.4 A próbám saját hiányai — nevesítve

A bejárás első alakjai a **saját tétlenségemet** mérték, nem a rendszert (`KUKA-120`): nem nyomtam
meg minden lépés saját célját; a feladat-lépés után nem nyomtam „Tovább"-ot (a `taskDone` csak
megjelöl, nem léptet); a levelet nem a CÍMZETT nyitotta meg; a postafiók legújabb-elöl
sorrendjét helyre számoltam; a nyitott panel elfogta a héj kattintásait; és a közös `gotoPage`
segéd **nem volt keskeny-nézet-tudatos** (390 px-en a menü a ☰ mögött van, a gomb a lapon ott volt,
de nem látható — a kattintás 15 s után lejárt). Mindegyik javítva, a ☰ nyitása a **segédbe** került,
nem a hívókba.

---

## 3. R176 §2 — A HAT KÜLSŐ ELLENŐRZŐ PROGRAM, KÜLÖN VERDIKTTEL

**Ahogy a parancs kérte:** egyenként, a meglévő `--only`-val, **párhuzamos gépi terhelés nélkül**
(egy program futott egyszerre), **újraindíthatóan** rögzített eredménnyel. A részleges futás
eredménye **külön** kimenetbe ment (`var/external-checks/r176_<program>/`), tehát **nem írta felül**
a teljes mérés lapját (`KUKA-206`), és a futtató minden részleges futásra ki is mondja a hatókört
(`scope: partial — ez NEM a lánc teljes bizonyítéka`). A programok szövegéhez **nem** nyúltam: a
tartalmi követelmények és a mutációs egység 15 000 ms-os korlátja változatlan.

| program | verdikt | futás | a TARTALMI verdikt |
|---|---|---|---|
| **r53** | **ZÖLD — 2/2** | 8 371 ms | `G01` (az R53/F03 támadás egyenértékű alakja) és `G02` (érintetlen ellenpár) egyaránt zöld |
| **r55** | **ZÖLD — 5/5** | 620 842 ms | `C11` · `N10` · `F01` · `N04` · `D01` restated — mind zöld. **Változás:** az okt-7-i tárolt eredményben az `N04-restated` ELBUKOTT; a mai fejen zöld. A különbséget az azóta született javítások adják — melyik javítás pontosan, azt NEM mértem, tehát nem is állítom |
| **r57** | **PIROS — 4/9** | 60 569 ms | zöld: `T03` · `T04` · `E01` · `E04`. **Három eset a program VILÁGÁN bukik:** `T01` · `T02` · `T05` — a program fixtúrája nyers SQL-lel szúr be meghívót és **soha nem ír `invite_basis`-t** (mérve: a program teljes szövegében **0** előfordulás, `issueInvite` hívás sincs), a mai mag viszont a beváltásnál **deklarált felhatalmazási alapot** kér, és `no_declared_basis`-szal **NEVEZETTEN** elutasít. Vagyis a rendszer **szigorúbb**, mint a program elvárása, és a hiányt kimondja — nem némán hibázik. **Két eset környezeti:** `E02` · `E03` → `spawnSync ETIMEDOUT` (a 15 000 ms-os battéria-korlát) |
| **r59** | **PIROS — 0/7** | 19 313 ms | a program a mutációs battérián `spawnSync ETIMEDOUT`-tal **elszállt**, részletes bizonyíték-fájl nélkül. Ez pontosan a deklarált `env_limit` fajtája — tartalmi verdikt tehát nincs, és nem is gyártok hozzá |
| **r57a** (az r57 deklarált helyettese) | **PIROS — 0/9** | **1 800 108 ms** | a **darabolt** battériás változat a megengedett **véges program-keretet (30 perc)** is kimerítette: `ETIMEDOUT`, kilépés `null`, bizonyíték-fájl nincs |
| **r59a** (az r59 deklarált helyettese) | **PIROS — 0/7** | **1 800 108 ms** | ugyanaz: a 30 perces keretet kimerítette, `ETIMEDOUT`, bizonyíték nincs |

### 3.1 AMI EBBŐL KÖVETKEZIK — ÉS AMIT NEM ÁLLÍTOK

- **A 19/19 verdikt NEM születhet meg**, és nem is írom le zöldnek. Két okból, mindkettő mért:
  (1) a `--only` futás a futtató saját szabálya szerint **részleges** (`scope: partial`), tehát
  önmagában soha nem a lánc bizonyítéka; (2) a **környezeti kihagyás** négy feltétele közül kettő
  nem áll: a helyettesnek **ugyanabban a futásban** kell lennie, és **zöldnek** kell lennie — a
  helyettesek (`r57a` · `r59a`) viszont a mai gépen **nem futnak végig** a megengedett kereten belül.
- **Ez tehát ma nem „majdnem zöld", hanem NEVEZETT környezeti akadály**: a 4 vCPU-s futtatón a
  mutációs battéria — a darabolt alakjában is — 30 percnél tovább tart. `KUKA-089`: a „nincs hozzá
  környezetem" MÉRÉS, nem következtetés. A megoldás nem a programok átírása (azt a parancs
  kifejezetten tiltja), hanem erősebb futtató vagy a keret kimondott megemelése — **ez döntési
  kérdés, nem végrehajtási**, ezért nem döntöm el magam.
### 3.2 A TELJES LÁNC ÁLLAPOTA — MIND A 19 PROGRAM MÉRVE EZEN A FEJEN

Hogy a lánc állapota ne egy **elavult** fájlból jöjjön (a tárolt összesítő okt. 7-i, és még a
**600 s**-os program-keretből származik), a maradék 13 programot is lefuttattam — egyenként,
ugyanazon a fejen. **Az eredmény: 12 ZÖLD · 7 PIROS.**

| állapot | programok |
|---|---|
| **ZÖLD (12)** | `r16core` · `r92authz` · `r88core` · `r85core` · `r77` · `r75` · `r69` · `r67` · `r61` · `r79core` · **`r53`** · **`r55`** |
| **PIROS (7)** | `r57` (4/9 — három eset a program régebbi világán, kettő gép-korlát) · `r59` · `r57a` · `r59a` · `r79` · `r81core` · `r83core` |

**A hét pirosból hatnak UGYANAZ a mért oka:** `spawnSync ETIMEDOUT` — öt esetben a **30 perces
program-keret** merül ki (`r57a` 1 800 108 ms · `r59a` 1 800 108 ms · `r79` 1 800 116 ms ·
`r81core` 1 800 114 ms · `r83core` 1 800 105 ms), az `r59`-nél pedig a programon BELÜLI 15 000 ms-os
battéria-korlát öl előbb (19 313 ms). Részletes bizonyíték-fájl egyiknél sem születik, tehát
**tartalmi verdiktjük nincs** — és nem is gyártok hozzá.

**A tárolt okt-7-i összesítőhöz képest egy programmal több a zöld** (`r55`: akkor `N04-restated`
piros, most 5/5). A három korábban 600 s-nál elakadt program (`r79` · `r81core` · `r83core`) a
megemelt, 30 perces kereten sem fut végig — tehát a keret megemelése **nem** oldotta meg őket.

**Amit ez a lánc-állapot NEM jelent:** nem a futtató összesített verdiktje (azt a futtató csak
TELJES futásra adja ki, és minden részleges futásra ki is írja, hogy `scope: partial`). A
19 programos **összesített** verdikt tehát ebben a körben **nem született meg**, és a mai gépen a hat
ETIMEDOUT miatt nem is születhet meg zöldként.

- **A „nem futott" nem „részben", és nem zöld** (`KUKA-200` · `KUKA-206`). A négy piros program
  verdiktje PIROS, és a két zöld (r53 · r55) verdiktje csak a SAJÁT hatókörére érvényes.

---

## 4. A KÖTELEZŐ KAPU ÉS A CÉLZOTT REGRESSZIÓ

A munka közben **célzottan** ellenőriztem (nem teljes söpréssel), a végén pedig lefuttattam az
**érintett kötelező kaput** a mai fejen:

```
verify:browser-gate   →  RESULT: PASS
      test:e2e + proof:core-ux   565 s   ·  141 teljesült · 0 bukott · 0 ingadozó · 0 kihagyott
      proof:demo-walk            444 s   ·  ZÖLD
      26 próba-fájl mind bekerült a mérésbe
```

**A kapu PIROSSAL kezdett, és ez a jelentés lényege.** Az első futás **3 bukást** mért — mind a
három a saját horgony-változásom következménye (`R166-MK2` · `R91-03` · `R93-01`). A javítás után a
második futás zöld. A két korábbi lap szövegét is helyre tettem: a kizárás indoka **ma már nem** „a
héjban nincs váltó vezérlő", hanem a történet **induló adata** — és mindkét lap a **MÉRT** tényből
vezeti le az elvárást, nem névsorból. Az ellenpár ugyanabban a próbában áll: nincs függő meghívás →
a visszavonás nem jár; **van** másik tag → az újbóli belépés **jár**.

Célzott regresszió (mért, a mai fejen): `verify:kuka` **942/942** · `verify:app-findings-r154`
**317/317** · `app:selfcheck` **57/57** · `verify:decision-numbers` **4/4** · a két szereplős
bejárás **4/4** · `r91` + `r93` + `r166-minta-kapu` **13/13**.

---

## 5. AZ R175 KÉT NEVESÍTETT ELLENTMONDÁSA — JAVÍTVA

A parancs két ellentmondást nevezett meg az előző jelentésben. Mindkettő valós volt:

1. **§6.1 — „friss beszélgetés" követelmény.** Az R175 §6.1 azt írta, hogy az R166 §2 „önálló nagy
   blokk, és a `D-VS-3083` sávja szerint **friss beszélgetésbe tartozik**". **Ezt az R176 döntése
   felülírta:** a befejező csomag KIMONDOTTAN ebben a munkamenetben fut tovább, a FIGYELMEZTETÉS
   sáv tudatában. A mai állapot: a feladat **elkészült**, tehát a §6.1 „EL SEM KEZDTEM" mondata is
   túl van haladva.
2. **§8 — a review-fej.** A §8 a `3fea359`-et nevezte review-fejnek, miközben ugyanannak a
   jelentésnek az §1 táblája már a `6110c87`-et mondta. **A helyes érték: `6110c87`** — ez a
   legutóbbi átolvasás feje. Az azóta született munka (a javítások és a mai kör) **nem fedett**.

Mindkettőt **az R175 lapján is** kijavítottam (látható javítás-jelöléssel, nem néma átírással), és
a lapot a saját körére újra feltöltöttem — így a boardon sem marad élő hamis mondat (`KUKA-050`).

---

## 6. A KIPRÓBÁLHATÓ BEMUTATÓ — HOL FUT, MIVEL INDUL, MI AZ ELŐFELTÉTELE

**Nem a Railway staging.** A parancs ezt kifejezetten kizárta, és telepítést sem engedélyezett —
nem is telepítettem. A bemutató a **saját gépen** fut, egy paranccsal:

```bash
cd "/Users/valachzsolt/Documents/CREATOR/DESIGN + WEB/vfamily/00_Admin/valach-system"
git fetch origin
git checkout claude/r154-audit-fix
git pull origin claude/r154-audit-fix
DATABASE_URL= VS_DEMO=1 npm run app:dev
```

**Miért van ott a `DATABASE_URL=`** — MÉRVE, nem feltevésből: ha a `.env`-ben áll adatbázis-cím és
a PostgreSQL nem fut, a szerver `ECONNREFUSED`-del **el sem indul**. Az üres érték SQLite-ra állítja,
és akkor **migráció sem kell**. Ha az operátor a saját PostgreSQL-jén akarja próbálni, akkor a
`DATABASE_URL=` helyett a saját címe megy, és ELŐBB a migráció fut (`npm run db:migrate`).

**Mért tény a fenti úton** (ebben a környezetben, ugyanezzel a paranccsal): `/` → **HTTP 200** ·
`/demo-index.html` → **HTTP 200** (és a lapon ott a két történet gombja: `demo-story-invite-revoke`
· `demo-story-reentry`) · `/dev/mailbox` → **HTTP 200**.

Ezután a böngészőben **két út** van, és a kettő MÁST bizonyít:

| az út | mit mutat | előfeltétel |
|---|---|---|
| `http://127.0.0.1:3300/demo-index.html` | a **bemutató lapja**: a két történet egy kattintással indul, a szereplőváltást a lap vezényli | `VS_DEMO=1`. A lap a **szimulált adapteren** megy — a parancs szerint ennek a zöldje NEM a valódi felület bizonyítéka |
| `http://127.0.0.1:3300/` | a **VALÓDI felület**: belépsz, és a Súgó útmutatójából indítod a két történetet — a váltás valódi kijelentkezés és a másik ember valódi belépése | `VS_DEMO=1`; a **visszavonás** történetéhez egy **függő meghívás**, a **visszatérés** történetéhez egy **másik tag** kell a cégben (ezt a kiszolgáló méri, és e nélkül nevezetten nem kínálja fel) |

**Üres `DATABASE_URL` mellett** a rendszer SQLite-on fut, és migráció nem kell. A levelek a
**Próbaüzenetek** panelen érkeznek (`/dev/mailbox`), tehát a meghívó hivatkozása kattintható.

**És ami ennél erősebb bizonyíték:** a fenti VALÓDI utat nem kézzel kell végigkattintani ahhoz, hogy
igazolt legyen — a `R176-K1/K2/K3` próba **pontosan ezt** járja végig, és a kötelező kapu része.

---

## 7. AMI NYITVA MARADT — ÁTADVA, NEM ELHALLGATVA

### 7.1 A négy piros ellenőrző program — NEVEZETT környezeti akadály

A 3. szakasz táblája mondja ki soronként. A rövid összegzés: a `r57` **tartalmi** maradéka három
eset, ami a program **saját, régebbi világán** bukik (nincs deklarált felhatalmazási alap), a többi
piros pedig **gép-korlát**: a mutációs battéria a darabolt alakjában sem fér a megengedett 30 perces
program-keretbe. **Döntési kérdés**, nem végrehajtási: erősebb futtató, vagy a keret kimondott
megemelése. A programok átírását a parancs tiltja, és nem is írtam át őket.

### 7.2 A lefedési őr — a PIROS marad, és ez a helyes

Mérve a mai fejen (`meres:lefedes`): **pótolható 0 · osztályozatlan 0 · `capability_missing` 1** —
ez utóbbi a `page:personal` lap, a nevesített **`personal.ownMatters`** fejlesztési hiány („a SAJÁT
ÜGYEK listája még nem létezik"). Az `LT` őr ezért **PIROS** (17 zöld · 1 piros, padló-sértés 0), és
**nem** írtam át zöldre: az őr célja a NULLA hiány, a maradék egy pedig **nem pótolható** próbával,
csak funkcióval. A padló (`floor_breaks`) **üres** — visszacsúszás nincs.

### 7.3 A független review — KÜLÖN BLOKK, ahogy a parancs kérte

**A HELYZET A JELENTÉS ÍRÁSA KÖZBEN MEGVÁLTOZOTT, és ezt kimondom.** Amikor a jelentés első
változata elkészült, a külső ellenőrző használati korlátja még állt, és ez a blokk azt írta, hogy a
mai fejet senki nem olvasta át. **Néhány órával később a korlát feloldódott**, a review lefutott az
`fb231e6` fejre, és **négy P2 leletet** adott. Mind a négy valós volt; mind a négy javítva — a
részletek a 7.4 pontban.

**A MA érvényes állapot:** a review által fedett fej az **`fb231e6`**; a mai fej (`2f731f6`) maguk
ezek a javítások, tehát **nem fedett**. A korlát alatt nem kértem újra átolvasást, keretet nem
vásároltam, a korlátot nem kerültem meg (`KUKA-200`: a nem futott nem „részben").

**A négy szálra a válasz kiment**, mindegyikre a mért ténnyel és a visszacsúszás-próbával. A szálak
GITHUB-OLDALI LEZÁRÁSÁT nem végeztem el: a szál-azonosítókhoz a 112 review-szálat kellene
végiglapozni, ami aránytalan — a tartalmi válasz a szálakon áll, a lezárást a következő review-kör
amúgy is újraértékeli a mai fejen. Ezt nem hallgatom el.

### 7.4 A TIZENNÉGY ÚJ KÜLSŐ P2 — mind MÉRVE és javítva

| # | a lelet | a mért tény | a javítás |
|---|---|---|---|
| 1 | a `sessionId`-mérce 50 sornál megállt, az exportáló minden sort feldolgoz | 60 tiszta sor + egy idegen a végén: a régi alak ÁTENGEDTE | a mérce MINDEN sort megnéz; a jel **viselkedés** (`ar11` · `ar12`) · `KUKA-418` · `D-VS-3212` |
| 2 | a két átívelő történet levél-fogadó lépést is tartalmaz, de csak `requires_demo`-t deklarált | telepített demóban a `/dev/mailbox` 404, a történet megszakadna | `requires_dev_mailbox: true` mindkettőn; a deklarált készlet négy tagú (`al4`) · a `KUKA-417` **visszatért** |
| 3 | a szereplő-váltó horgony a CSUKOTT profilmenüben áll, feltárási út nélkül | a rejtett gombon: `rects=1 · box=258×42 · visibility=visible`, de `checkVisibility()=false` | a láthatóságot a **böngésző** dönti el; a csukott lenyíló nyitója **feltáró**; a mondat előbb feltárást kér · `KUKA-419` · `D-VS-3213` |
| 4 | az átadás a történet elején is megszületett, a `K5` csak egy-szereplős ágat mért | közönséges kilépés 2/19-nél: a következő ember visszakapta a haladást | a határ az **első** váltás-lépés; új ellenpár: **`R176-K6`** · `KUKA-420` · `D-VS-3214` |

| 5 | az induló adat tagság-tényét **nyers** sor-feltétellel számoltam, a lap a kanonikus feloldóval | hatályos taggal felkínálódik; **megszüntetett** tagság mellett a régi alak is felkínálta volna | `membershipAsOf` — ugyanaz a döntés, amit a lap kérdez; élő mérés (`as11`) · `KUKA-421` · `D-VS-3215` |
| 6 | a meghívó-visszalépés **eldobta** a kiszolgáló válaszát, és mindenképpen ürített | 5xx mellett a lap teljesítést állított, a tárolt folytatás a kiszolgálón maradt | a három kimenet külön mondat, ürítés **csak** igazolt `ok` után; élő tanú (`R166-M6`) · `KUKA-422` · `D-VS-3216` |

| 7 | a váltás-kapu `(subject \|\| book)` alakja MINDEN nézet-változást minden váltásnak elfogadott | mérve mind a négy kombinációra: egy SZEMÉLY-váltó lépésen a fiókváltás is „teljesített" | a tengelyt a LÉPÉS deklarálja (`switch_axis`, zárt készlet), fail-closed, és a HATÁR átadja · `KUKA-423` · `D-VS-3217` |
| 8 | az átadás a futás HELYZETÉT kérdezte, nem az ÁTMENETET | a levél-fogadó lépésén kilépve a következő ember megkapta az előző haladását | kilépésnél CSAK a váltás-lépés jogosít; élő tanú: `K7` 1. őre · `KUKA-424` · `D-VS-3218` |
| 9 | a rekesz nem hordozta a bemutató VERZIÓJÁT | index szerinti visszaírás más verzióra kész-nek jelölhet meg nem történt feladatot | a verzió a rekeszbe, és a visszaállás összeveti; élő tanú: `K7` 2. őre · `KUKA-425` · `D-VS-3219` |
| 10 | a visszaállás ELŐBB ürítette a rekeszt, és csak utána kérdezte a kiszolgálót | 503 mellett a haladás VÉGLEG elment volna | belenéz → a választ MÉRI → csak siker után ürít; élő tanú: `K7` 3. őre · `KUKA-426` · `D-VS-3220` |

| 11 | a visszaállás megkapta a FOLYTATHATÓ listát, az **átszövegezés** nem | egy átadott futás nyelvváltáskor `notAvailable`-lel elveszett | egy feloldó (`tourDefOf`), két fogyasztó · `KUKA-428` · `D-VS-3222` |
| 12 | az induló adatból kimaradt a meghívó **LEVELE** | újraindítás után a sor megvan, a fogadó üres — a történet az `invite-observe`-on megszakadt | a tény a levelet is megkívánja; a mérés a helyzetet ELŐÁLLÍTJA (`as15`) · `KUKA-429` · `D-VS-3223` |
| 13 | a személyes fiók útmutatója olyannak is szólt, akinek **nincs** személyes köre | meg nem erősített címnél nincs mit választani, az útmutató mégis azt állítja, hogy létezik | az útmutató kimondja az induló adatát (`own_personal_book`), a kiszolgáló a tárból méri · `KUKA-430` · `D-VS-3224` |
| 14 | a `revocable` jelző a **szerep-plafont** nem kérdezte | szűkebb plafonú delegált kezelő `admin` ajánlatra is gombot kapott, amit a kiszolgáló elutasít | a jelző UGYANAZT az írásmentes feloldót kérdezi, amit az írás-út · `KUKA-431` · `D-VS-3225` |

**A 14. mérésének hatóköre KIMONDVA** (`KUKA-216`): a szerep-tengely szűkítésére ma **nincs API-út**,
ezért a szűk plafonú eset **forrás-pin**, az élő ellenpár a TELJES plafon. Ez **nevesített
mérés-hiány**, nem teljesítés.

**ÉS A 7. SZIGORÍTÁSA ELŐHOZOTT EGY SAJÁT HIÁNYT** (`KUKA-427` · `D-VS-3221`): a bemutató-lap
csonkja a belépést a *tagság* fiókjába vitte (kimondott rövidítésként), a valódi kiszolgáló viszont a
*személyes* körbe. Hűségesre állítva kiderült, hogy a `tour.reentry` történetéből **két fiókváltó
lépés hiányzik** (`s12b` · `s15b`) — és a hiányt **két takarás** rejtette: a csonk rövidítése és a
**saját próbám** néma kényelme. Mindhárom javítva; a `reentry` így 18 helyett **20** lépés.

**Az 5.–10. mind a SAJÁT, ebben a körben írt kódom felett jött** — az 5. éppen a `D-VS-3211`-es
kapum tényét számolta máshogy, mint a lap, a 6. pedig egy olyan függvényben, amelynek a **saját
megjegyzése** már leírta a helyes viselkedést. A megjegyzés nem őr.

**A harmadik a legfontosabb, és két okból:** (a) a gyökér nem a hiányzó deklaráció volt, hanem a
projekt EGYETLEN láthatóság-szavának heurisztikája — egy csukott lenyíló tartalma megtartja a
layout-keretét, tehát a bemutató egy **láthatatlan** gombra küldte a nézőt; (b) a hibát **a saját
próbám elrejtette**, mert maga nyitotta ki a menüt. A próba mostantól a váltás-lépésen soha nem
nyitja ki a lenyílót, és a horgonyt szemantikusan keresi — így a `K1/K2/K3` a feltárás tényét is
méri.

**Tehát:** ha ezen a csomagon már csak a független review hiányzik, akkor a hiány a mai fej
átolvasása — minden más mért verdikt a jelentésben áll.

---

## 8. AMIT EZ A JELENTÉS NEM ÁLLÍT

- **Nem** állítja, hogy a külső-ellenőrző lánc 19/19 zöld. **Négy program PIROS**, és a részleges
  futás a futtató saját jelölése szerint sem a lánc bizonyítéka.
- **Nem** állítja, hogy a két piros helyettes (`r57a` · `r59a`) tartalmilag hibás: **nem futottak
  végig**, tehát tartalmi verdiktjük NINCS. A „nem futott" nem „részben".
- **Nem** állítja, hogy a mai fejet független fél elfogadta: a review az `fb231e6`-ot fedi, a mai
  fej (`2f731f6`) maguk a javítások. **A válaszolt szál nem elfogadás**, és a szálak github-oldali
  lezárását sem végeztem el (kimondva a 7.3-ban).
- **Nem** állítja, hogy a csomag merge-kész, és **nem** végez merge-öt, force-push-t, felhős
  telepítést, titok-módosítást vagy CMD/PR-lezárást — a parancs korlátai változatlanul állnak.
- **Nem** állítja, hogy a bemutató-lap (`demo-index.html`) zöldje a valódi felület bizonyítéka: a
  lap **szimulált adapteren** megy, és a valódi felület bizonyítéka a `R176-K1/K2/K3`.
- **Nem** állítja, hogy a lefedési őr zöld: az `LT` **PIROS**, a maradék egy hiány nevesítve áll.
- **Nem** állítja, hogy a PostgreSQL-mérések a Railway üzemére vagy a 18-as verzióra érvényesek.
- **Nem** szolgáltatói limit és nem megtakarítási ígéret a fogyasztás-szám.

---

## 9. A FOGYASZTÁS — MÉRVE, EGY SORBAN

A csomag ablaka a parancs **board-időbélyegétől** indul (`2026-10-08T05:57:32Z`, mérve a board
API-ból, nem tippből) a jelentés írásáig (`12:26:38Z`): **349 hívás** · fő-szál kontextusmedián
**356 605** · max **782 772** · 400 ezer fölött **152 hívás** · **ügynök-bemenet 0 (nulla
al-ügynök)** · cache-olvasás **149 858 549** · kimenet **318 151** · lefedettség **teljes**
(1 átirat, minden modell-válasz usage-dzsal).

**ZÁRÓ MÉRÉS A CSOMAG VÉGÉN** (`2026-10-08T05:57:32Z` → `16:34:47Z`): **595 hívás** · fő-szál
kontextusmedián **541 361** · max **782 772** · 400 ezer fölött **380 hívás** · **ügynök-bemenet 0** ·
lefedettség **teljes**. **A SÁV: VÁLTÁS** (541 361 ≥ 400 000) — a `D-VS-3083` szerint a FUTÓ
munkablokk célzott ellenőrzéssel **lezárható**, és a KÖVETKEZŐ önálló nagy blokk **friss
beszélgetésben** induljon. A lezárás címén nem indítottam új feltárást, új funkciót vagy opcionális
teljes söprést — a kötelező kapu zöld, minden commit feltolva.

**A csomag közbeni pillanatkép (a jelentés első változatakor): FIGYELMEZTETÉS** (356 605 a 300 000–400 000 sávban) — a `D-VS-3083` szerint **megállni nem
kell, új beszélgetést nem kérünk**; a munkablokk határán rövid állapotmérés jár, és ez a jelentés az.
A fő szál ébresztései: **user 2×** → 152 hívás, **tömörítés 1×** → 197 hívás (a tömörítéssel
folytatott beszélgetés a `R114` szerint NEM friss beszélgetés — ezt nem is állítom annak).

**Amit ez a szám NEM:** nem szolgáltatói limit, nem kimért optimum, nem megtakarítási ígéret.

---

## 10. A KÖVETKEZŐ LÉPÉS — DÖNTÉSI KÉRDÉS, NEM VÉGREHAJTÁSI

Két dolog maradt, és egyik sem a végrehajtón áll:

1. **A hat ETIMEDOUT program.** A mutációs battéria a darabolt alakjában sem fér a megengedett
   30 perces program-keretbe a 4 vCPU-s futtatón. Három út van, és mind **döntés**: (a) erősebb
   futtató; (b) a program-keret kimondott megemelése (és akkor mennyire); (c) a mai állapot
   elfogadása azzal, hogy ezeknek a programoknak **nincs** verdiktje. A programok átírása nem út —
   a parancs tiltja, és a rekonstrukció a saját előfeltevésünket igazolná vissza (`KUKA-054`).
2. **A független review a mai fejre.** A külső ellenőrző használati korlátja mért tény; a korlát
   alatt nem kérek újra átolvasást, és keretet nem vásárolok. Amikor a korlát felszabadul, a
   `fb231e6` fej átolvasása az első teendő.

**A csomag korlátai megtartva:** nincs merge, nincs force-push, nincs felhős telepítés, nincs
titok-módosítás, nincs valódi üzleti adatváltoztatás, nincs V2-/production-módosítás, nincs új
fizetős keret, és nincs CMD/PR-VS-300 lezárás.
