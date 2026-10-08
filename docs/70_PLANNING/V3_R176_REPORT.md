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
| **KÓD-SHA (amit mértem)** | `8410051` — a kötelező kapu EZEN a fejen zöld |
| **a kötelező böngésző-kapu** | **ZÖLD** — `verify:browser-gate`: **146 teljesült · 0 bukott · 0 ingadozó · 0 kihagyott**, 26 próba-fájl; `proof:demo-walk` 482 s |
| **a két szereplős bejárás a VALÓDI felületen** | **6/6 ZÖLD** — K1 19/19 · **K2 20/20** · K3 19/19 (390 px + újraindítás) · K5 · K6 · **K7** (az átadás három őre) — és a próba a váltás-lépésen **nem** nyitja ki helyettünk a menüt, a fiókváltást pedig a történet SAJÁT lépése végzi |
| **KUKA-regiszter** | **1022/1022 PASS** (`verify:kuka`) — 430 bejegyzés, **huszonnégy** újjal (`KUKA-416`…`KUKA-439`) |
| **R154 battéria** | **339/339 PASS** (`verify:app-findings-r154`) — **huszonhat** új mércével (as7–as30 · ar11–ar12) |
| **D-VS számozás** | **4/4 PASS** — **huszonnégy** új döntés: `D-VS-3210`…`D-VS-3233`; a következő szabad: `D-VS-3234` |
| **próba-alkalmazás önellenőrzés** | **57/57 PASS** (`app:selfcheck`) |
| **a hat külső program** | **2 ZÖLD · 4 PIROS** — a külön verdiktek a 3. szakaszban; a teljes lánc állapota is ott |
| **a review által FEDETT SHA** | **`cc9c1de`** — a korlát **FELOLDÓDOTT**, és **hét** körben összesen **huszonkét P2** jött (`fb231e6`: 4 · `4b930dd`: 2 · `30830ae`: 4 · `5390b7c`: 4 · `1585079`: 2 · `c5d0b63`: 3 · `cc9c1de`: 3); ezekből **huszonegy javítva**, **huszonkettő** javítással, és **EGY nevezetten nem épült meg** (a 7.5 pont: végigkövetett út + indok, a szál nyitva). A mai, `8410051` fej **nem fedett** |

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

### 2.5 AZ R112-I3 NEVESÍTETT EGYSZERI BUKÁSA — MÁSODSZOR, ÉS MOST ADATTAL

Az `R112-I3` próba a saját megjegyzésében **nevesítve** hordozott egy korábbi, meg nem magyarázott
egyszeri bukást, és éppen azért rögzít bukáskor lap-állapotot, hogy „a következő előfordulás adatot
hozzon, nem újabb találgatást". **A második előfordulás megjött**, a kötelező kapu egyik futásán — és
a rögzítés adott is adatot:

- az `/api/me` válasza szerint a munkamenet **már a másik emberé** volt;
- a látható horgonyok közt ott állt a **meghívó képernyő** (`section-invite` · `invite-redeem`) ÉS a
  héj fejléce az **előző** ember címével;
- `global-notice` **sehol** — tehát a héj fő területe **nem rajzolódott újra**.

**Amit ebből állítok:** a tárolt tény változatlanul helyes volt (a meghívott lett tag, a másik ember
nem), a lezárás sem szállt át — a hiba a **rajzolás elmaradása**. **Amit NEM állítok:** a
mechanizmust. A `refreshMe` saját sorszám-őre (`if (seq !== state.seq) return;`) egy közbeni második
frissítésnél a rajzolás ELŐTT kilép — ez illeszkedik a jelre, de **mérve nincs**, ezért feltételezésként
áll a próba megjegyzésében, nem talált hibaként (`KUKA-050`). A próba ugyanezen a fejen, önmagában és
a teljes fájlban is **ZÖLD** (8/8). A megfigyelést a próba mellé írtam, hogy a harmadik előfordulás a
mechanizmust adja meg.

**És amit ez NEM:** nem „ingadozó próba" címke. A kapu a bukást PIROSNAK számolta, a jelentés is annak
írja, és a tétel NYITOTT marad — nem zártam le azzal, hogy egy újrafuttatás zöld lett.

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
verify:browser-gate   →  RESULT: PASS        (a `8410051` fejen, az utolsó futás)
      test:e2e + proof:core-ux   586 s   ·  146 teljesült · 0 bukott · 0 ingadozó · 0 kihagyott
      proof:demo-walk            482 s   ·  ZÖLD
      26 próba-fájl mind bekerült a mérésbe

ÉS A KAPU EBBEN A KÖRBEN KÉTSZER VOLT PIROS — mindkettő a SAJÁT, 18. javításom mechanikája
(145 → 136/2 bukott, majd 140/1 bukott). A harmadik futás zöld. A részletek a 7.4 pont alatti
táblában; a tanulság ott áll, ahol a kódot nézik.
```

**A kapu PIROSSAL kezdett, és ez a jelentés lényege.** Az első futás **3 bukást** mért — mind a
három a saját horgony-változásom következménye (`R166-MK2` · `R91-03` · `R93-01`). A javítás után a
második futás zöld. A két korábbi lap szövegét is helyre tettem: a kizárás indoka **ma már nem** „a
héjban nincs váltó vezérlő", hanem a történet **induló adata** — és mindkét lap a **MÉRT** tényből
vezeti le az elvárást, nem névsorból. Az ellenpár ugyanabban a próbában áll: nincs függő meghívás →
a visszavonás nem jár; **van** másik tag → az újbóli belépés **jár**.

Célzott regresszió (mért, a mai fejen): `verify:kuka` **1022/1022** · `verify:app-findings-r154`
**339/339** · `app:selfcheck` **57/57** · `verify:i18n` **49/49** · `verify:tutor` **94/94** ·
`verify:assistant` **55/55** · `verify:decision-numbers` **4/4** · `verify:doc-html` **9/9**.

**A LEGUTOLSÓ KÖR KÉT P2-je ELŐTT ÉS UTÁN IS MÉRTEM** (a 15–17. tétel): a három javítás
visszacsúsztatása `as17` · `as19` · `as20`–`as23` **PIROSRA** váltja a battériát, és az élő tanú
(`R166-M7`) is **bukik** — tehát a jelek TÜZELNEK, nem díszek (`KUKA-239`). Az `as18` ellenpár
helyesen ZÖLD marad mindkét állapotban: az ő dolga azt mérni, hogy a szigorítás nem vitt el jó
esetet.

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

### 7.3 A független review — NYOLC BEFEJEZETT KÖR

**A HELYZET A CSOMAG KÖZBEN TÖBBSZÖR MEGVÁLTOZOTT, és a szöveg a valóságot követi** (`KUKA-050`).
Amikor a jelentés első változata elkészült, a külső ellenőrző használati korlátja még állt. A korlát
**feloldódott**, és azóta **öt kör futott le**, összesen **tizenhat P2** lelettel:

| a review köre | a FEDETT fej | P2 | a javítás commitja |
|---|---|---|---|
| 1. | `fb231e6` | 4 | `2f731f6` |
| 2. | `4b930dd` | 2 | `d8203c5` |
| 3. | `30830ae` | 4 | `4ba0064` |
| 4. | `5390b7c` | 4 | `7f11958` · `8050955` |
| 5. | `1585079` | 2 | `23b4497` |
| 6. | `c5d0b63` | 3 | `e2e13df` |
| 7. | `cc9c1de` | 3 | `8410051` — kettő javítva, **egy nevezetten NEM épített** |
| 8. | **`5233afb`** | 2 | **`<a csomag feje>`** (ez a mai fej) |

**A MA érvényes állapot:** a legfrissebb BEFEJEZETT kör a **`5233afb`** fejet fedi, és **két**
további P2-t adott — mindkettő a saját, ebben a körben írt kódom felett, és mindkettő **javítva**.
Az azóta született commitok (a 23–24. javítás és ez a jelentés) **nem fedettek**. A korlát alatt nem kértem újra
átolvasást, keretet nem vásároltam, a korlátot nem kerültem meg (`KUKA-200`: a nem futott nem
„részben").

**MIND A HUSZONNÉGY SZÁLRA KIMENT A VÁLASZ**, mindegyikre a mért ténnyel és a visszacsúszás-próbával
— a nem épített leletnél a végigkövetett úttal és az indokkal.
A szálak GITHUB-OLDALI LEZÁRÁSÁT nem végeztem el: a szál-azonosítókhoz a 120+ review-szálat kellene
végiglapozni, ami aránytalan — a tartalmi válasz a szálakon áll, a lezárást a következő review-kör
amúgy is újraértékeli a mai fejen. Ezt nem hallgatom el, és **a válaszolt szál nem elfogadás**.

### 7.4 A HUSZONNÉGY KÜLSŐ P2 — HUSZONHÁROM LELETRE HUSZONNÉGY JAVÍTÁS, és EGY nevezetten nem épített

**A pontos számtan, mert a kerekítés itt hazugság volna:** **24** P2 lelet jött **nyolc** körben.
**23**-ra született kód, és abból **24** javítás — mert az ötödik kör ELSŐ leletének **két** javítási
helye volt (a kapu ÉS a kilépés átadási határa): a lelet maga nevezte meg mind a kettőt, és két külön
tanulságot ért, mert két külön szabály csúszott el. **EGY** leletre nem építettem kódot: a költséget
mértem a haszonhoz, és az indok a **7.5** pontban áll — nem elhallgatva, nem „kész"-nek könyvelve. Az
alábbi tábla a JAVÍTÁSOKAT számolja.

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

| 15 | a váltás-kapu a fiók-tengelyen CSAK a mozgó felet mérte | `S_bela→S_anna` **és** `B_sajat→B_anna_sajat`: a kapu `true` — tehát a kilépés + MÁS EMBER belépése is „teljesített” | a pár **mindkét** fele egy feltételben; a két tengely nem tükrös, és ez mért tény · `KUKA-432` · `D-VS-3226` |
| 16 | a kilépés MINDEN váltás-lépésen átadott, a **fiók**-tengelyeseken is | a négy fiók-tengelyes lépésen a történet fiókváltást kér; ott kilépve a következő ember megkapta az előző haladását | a kilépés csak a **személy**-tengelyen ad át — és a döntés **MEGHÍVHATÓ** feloldóba került (`handoverBoundaryOk`) · `KUKA-433` · `D-VS-3227` |
| 17 | a **kijelentkezés** eldobta a kiszolgáló válaszát | 5xx mellett a lap kimondta, hogy kiléptünk, és elvette a meghívó **jegyét** (memória ÉS címsor) | a választ MEGMÉRJÜK; nem igazolt kimenetnél semmit nem ürítünk, és a mondat **nem eldönthető**-t mond, nem meghiúsulást · `KUKA-434` · `D-VS-3228` · élő tanú: **`R166-M7`** |

| 18 | a futás újrakötése **maradó állapotból** következtetett okozatiságra (az előző lépés `done`) | a `done` maradó: a feltétel a lépésen állva határozatlan ideig igaz · a legitim eset MÉRVE: `tour.inviteRevoke` `s17` (`invite.redeemed`) | **egyszer használható jegy**, zárt feladat-készletből (`invite.redeemed` · `workspace.created`) · `KUKA-435` · `D-VS-3229` |
| 19 | a történet induló adata **minden** súgó-kérésnél kiszámolódott, tagonkénti lekérdezéssel | a két drága tényt KIZÁRÓLAG demó-jelhez **és** fejlesztői felülethez kötött történet kérdezi (mérve a regiszterből) | a számolás a kapuk mögé került, a tagok kérdése **korai kilépéssel** megy · `KUKA-436` · `D-VS-3230` |
| 20 | a történet előfeltétele **nem** kérdezte a szerep-plafont, a lista már igen | a `D-VS-3225` a GOMBOT kötötte a plafonhoz; a gombra mutató történet felkínálását nem — a feladat sosem teljesülhetett | az induló adat UGYANAZT az írásmentes feloldót kérdezi, egyszer · `KUKA-437` · `D-VS-3231` |

| 21 | a **névtelen** néző üres listáját „nincs ilyen bemutató"-nak vettük | a két szereplő közt ÉPP VAN egy névtelen állapot; ott egy újratöltés **végleg** elvitte az átadást (mérve: 0 folytathatót ad a kiszolgáló névtelenül) | belépés nélkül a kérdés fel sem tehető → a rekesz **marad** · `KUKA-438` · `D-VS-3232` · élő tanú: **`R176-K8`** |
| 22 | a hiányzó munkamenetet „nincs mit törölni"-nek vettük | a belépés **rotálja** az azonosítót, és a szándékot **átviszi** — ÉLŐ HTTP-versenyben mérve: `200 ok: true`, miközben a szándék sora **megvolt** | **409 `session_gone`** — nem állítunk teljesítést, amit nem igazoltunk · `KUKA-439` · `D-VS-3233` · élő tanú: **`as29`–`as30`** |

| 23 | a javításom **jelölője eldobódott**: a sablon `;`-vel zárult, az összefűző sor önálló, előjeles kifejezés lett | aki a **héjban** lépett ki hibára futó kéréssel, **semmit** nem látott; a saját pinem a hívások SZÁMÁT mérte, ami **halott** kód mellett is igaz | az összefűzés a kifejezés része; a jel **nyelvtani**, és az érdemi őr a **viselkedés** · `KUKA-440` · `D-VS-3234` · élő tanú: **`R166-M9`** |
| 24 | a fiók-váltás **célja** bármelyik másik cég lehetett | aki több cégben tag, egy **idegen** céget választva is „teljesített" — és a bemutató ott folytatódott, mert a készlet-célok ott is léteznek | a cél **deriválható**: a futás **kezdő** könyve (`origin_book`), a rekesz átviszi, a kapu ahhoz mér · `KUKA-441` · `D-VS-3235` |

**A 14. mérésének hatóköre KIMONDVA** (`KUKA-216`): a szerep-tengely szűkítésére ma **nincs API-út**,
ezért a szűk plafonú eset **forrás-pin**, az élő ellenpár a TELJES plafon. Ez **nevesített
mérés-hiány**, nem teljesítés.

**ÉS A 7. SZIGORÍTÁSA ELŐHOZOTT EGY SAJÁT HIÁNYT** (`KUKA-427` · `D-VS-3221`): a bemutató-lap
csonkja a belépést a *tagság* fiókjába vitte (kimondott rövidítésként), a valódi kiszolgáló viszont a
*személyes* körbe. Hűségesre állítva kiderült, hogy a `tour.reentry` történetéből **két fiókváltó
lépés hiányzik** (`s12b` · `s15b`) — és a hiányt **két takarás** rejtette: a csonk rövidítése és a
**saját próbám** néma kényelme. Mindhárom javítva; a `reentry` így 18 helyett **20** lépés.

**A 23–24. TANULSÁGA — ÉS A LEGKEMÉNYEBB LECKE A JELEKRŐL.** A 23. a **saját javításom halott kódja**
volt: a `KUKA-434` mondatát a héjba is kirajzolni akartam, és a sor egy pontosvessző miatt **önálló,
eldobott kifejezés** lett. A mondat tehát a meghívó-képernyőn megjelent, a héjban **semmit** nem
mutatott — és a saját mércém **átengedte**, mert a hívások SZÁMÁT mérte (3 hívás, 1 jelölő-hely), ami
**halott kód mellett is igaz**. Ez a `KUKA-207` legélesebb alakja a csomagban: *egy számoló minta nem
tudja megkülönböztetni az élő kódot a holttól.* A jel most nyelvtani ÉS viselkedés-mérés (`R166-M9`).

**ÉS A 24. SZIGORÍTÁSA A SAJÁT MÉRÉSEIMET IS MEGBUKTATTA, KÉT HELYEN** — ezt is kimondom, mert ez
már a negyedik alkalom ebben a körben, hogy egy kapu-szigorítás a saját jeleimen bukott el először: az
`(as13)`/`(as18)` szintetikus futásai és a `proof:demo-walk` `(h1a)` ellenpárja **kezdő könyv nélkül**
épültek, tehát a fail-closed kapu **őket is** bezárta. Mindkettőt a valódi alakra állítottam, és a
cél-feltételre **új** ellenpárok születtek (`as32`–`as33` · `h1i`–`h1j`). A tanulság: *egy kapu
szigorítása a MÉRÉSEKET is érinti — aki ezt nem nézi végig, az a saját jelein bukik el, nem a
terméken.*

A 24. a 15. tétel párja egy réteggel beljebb: a fiókváltásnál nem elég, hogy a könyv **más** — azt is
meg kell kérdezni, **hová**. Aki több cégben tag, egy idegen céget választva is „teljesítette" a
lépést, és a bemutató ott folytatódott, mert a készlet-célok ott is léteznek. **A cél itt
deriválható** (a futás kezdő könyve), ezért megépítettem — ellentétben a **személy**-tengely párjával,
ahol a következő szereplő kilétét semmi nem deklarálja, és ezért nevezetten **nyitva hagytam** (7.5).
A két döntés együtt mutatja a szabályt: *ahol a cél deriválható, a kapu kérje meg; ahol nem, ott
mondjuk ki, hogy nem — és ne tegyünk úgy, mintha a két tengely ugyanaz volna.*

**A 18. JAVÍTÁSOM KÉTSZER ELVITTE A LEGITIM UTAT — ÉS MINDKETTŐT A KÖTELEZŐ KAPU MÉRTE.** Ezt a
jelentés nem kerüli meg, mert ez a csomag legtanulságosabb mérése: egy szigorítás, aminek a *jelentése*
helyes, a *mechanikájában* kétszer volt rossz.

| a hibás alakom | mit mért a kapu | miért volt rossz |
|---|---|---|
| a jegyet a **közös ürítőben** töröltem | `R176-K1` a **19. lépésnél** `contextChanged` | a futás onnan a **rekeszbe adódik át**, és a visszakötés csak a VISSZAÁLLÁS után esedékes — a jegy sosem ért oda |
| a jegyet **„bármi legyen az ítélet"** elhasználtam, amint a nézet elmozdult | `R176-K1` ismét a 19. lépésnél | a visszaállás **még a feladat-lépésen** adja vissza a futást, tehát az ELSŐ rajzolás elvette a jegyet **használat nélkül** |
| elhagytam a **„korábbi lépés `done`"** feltételt, mert a jegyet elégnek hittem | `R176-K2` a **10. lépésnél**, 9/20-nál ragadva | a visszakötés így **már a feladat-lépésen** megtörtént, a futás nézete előre átvette az ÚJ fiókot, és a KÖVETKEZŐ, deklarált **fiókváltó** lépés sosem teljesült |

Mostantól a jegy a **rekeszben utazik** (`rebind_once`), a visszaállás a **zárt készleten átszűrve**
veszi elő, a közös ürítő csak **átadás nélkül** törli, a jegy a **valódi** visszakötésnél fogy el, és
a feltétel **két részű**: az előző lépés teljesítette **ÉPPEN AZT** a feladatot, amire a jegy szól.
A jegy tehát nem **pótolja** a régi feltételt, hanem **pontosítja** — ezt a különbséget a harmadik
mérés tanította meg.

**És ami ebből a legfontosabb:** egy forrás-pin mind a **három** hibás alakot **zöldnek** látta volna
— a jel ott volt, a kód „helyesnek nézett ki", és a hiba a VISELKEDÉSBEN állt. A böngésző mérte meg,
háromszor. Ugyanez a lecke (`KUKA-207`), és ezúttal a saját mechanikámon.

**A 18–20. TANULSÁGA — ÉS AMIT A 18.-RÓL NEM ÁLLÍTOK.** A 18. a `KUKA-420`→`424` lecke HARMADIK
előjövése: *a feltétel az ÁTMENETRE szól, nem az ÁLLAPOTRA*. Egy `done` jelölés arról szól, hogy
MEGTÖRTÉNT, nem arról, hogy MOST történt. **A kárt viszont felhasználói úton NEM tudtam
előállítani**, és ezt kimondom: minden végigkövetett úton, ahol a nézet a bemutatótól függetlenül
változik, a `refreshMe` ELŐBB fut, és `resetViewCaches()`-szel LEZÁRJA a futást — tehát nincs mit
rosszul újrakötni. A szabály ettől nem lesz helyes, és a szigorítás **mérten semmit nem vesz el**: a
legitim esetet (a 19 lépéses történet 18. lépése, `invite.redeemed`) a zárt készlet tartalmazza, és a
kapu zöld maradt. Ez ugyanaz a fegyelem, amivel a bemutató-motor „harmadik állapotát" **visszavontam**
— csak itt a javítás szigorítás, nem új kód, tehát megtartom; hamis lelettel viszont nem adom el.

A 20. a **negyedik** `KUKA-418`: a `D-VS-3225`-ben a visszavonás-GOMBOT kötöttem a delegált
plafonhoz, a gombra MUTATÓ történet felkínálását nem — a saját javításom hozta létre a hiányt. A 19.
pedig arra emlékeztet, hogy **a kapu helyessége és a kapu KÖLTSÉGE két külön kérdés**, és a második
is a mi dolgunk: amit senki nem tud felhasználni, azt nem számoljuk ki, és ha egy tény soronkénti
lekérdezés, a kérdést a LÉTEZÉSRE kell feltenni, nem a darabszámra.

**A 15–17. TANULSÁGA — KÉT SZINTEN.** (a) A `KUKA-423`-as szigorításom a *mozgó* felet helyre
tette, a *nem mozgót* nem: a fiók-tengelyen elég volt, hogy a könyv más lett — és egy MÁSIK ember
belépése a könyvet is megváltoztatja. A kapu tehát a kilépés + idegen belépés átmenetet is
elfogadta, a futás a ROSSZ emberhez kötődött át. **És az ellenpárjaim ezt nem fogták meg**, mert
mindig CSAK AZ EGYIK felet mozgatták — a valódi úton viszont MINDKETTŐ együtt mozdul. (b) A
kijelentkezés ugyanabba a hibába futott, amit a `KUKA-422`-ben már javítottam — **egy függvénnyel
odébb**. Egy közös, VISSZAFORDÍTHATATLAN ürítőt több út hív; ha csak az egyik vár igazolt válaszra,
a javítás a kettő közül egy ajtót zár be. A hatókört a hiba-osztály adja, nem a lelet sorszáma
(`KUKA-418`) — ez a csomagban **harmadszor** jött elő, és ezúttal nem a külső fél nevezte meg
helyettem a párt: a lelet maga írta le, hogy „a logout út ugyanazt a közös ürítőt hívja".

**Az 5.–10., a 15.–17., a 18.–20. és a 21.–24. mind a SAJÁT, ebben a körben írt kódom felett jött** — az 5. éppen a `D-VS-3211`-es
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

### 7.5 AMIT NEVEZETTEN NEM ÉPÍTETTEM MEG — a hetedik kör HARMADIK lelete, és miért

A hetedik review-kör harmadik lelete valós utat ír le, és **nem vitatom**: a **személy-váltó** lépésen
a kapu BÁRMELY másik belépett embert elfogadja, pedig a két átívelő történet a **megnevezett**
résztvevőt kéri (a meghívottat, illetve a visszavont tagot). Ha ugyanabban a fülben egy **harmadik**
fiókkal lépnek be, a visszaállás elhasználja az átadást, az `actor.switched` elvégzettnek
könyvelődik, a futás ahhoz a fiókhoz kötődik, és később a meghívás-feladatnál elakad — a **szánt**
résztvevő pedig már nem tudja folytatni.

**AMIT VÉGIGKÖVETTEM.** A javítás ahhoz kötött, hogy a rendszer **tudja**, ki a következő szereplő.
Ma ezt semmi nem deklarálja: a lépés nem mondja ki, a kiszolgáló nem adja át, az átadás-rekesz nem
hordozza. A megvalósítás tehát **négy réteget** érint (lépés-deklaráció → kiszolgálói feloldás →
HTTP-határ → rekesz + kapu), és minden réteg fail-closed: egy át nem vitt mező a böngészőben
`undefined`, és a kapu a **saját történetünket** állítaná meg (ez a `KUKA-394` mért leckéje, és ebben
a körben **háromszor** meg is történt — lásd a 7.4 alatti táblát).

**AMIT MEGELŐZNE.** Egy demó-környezetre korlátozott bemutató megszakadását (`requires_demo` +
`requires_dev_mailbox`, éles üzemben nem is felkínált), amit a néző újraindítással feloldhat.
Adatvesztés nincs, jogosultsági szivárgás nincs: a lépések `role` őre és a kiszolgáló
jogosultság-ellenőrzése **érintetlen**, és a `rightLost` változatlanul működik.

**EZÉRT:** ebben a blokkban **nem építem meg**, és nem is írom be hamis zöldnek. Nevesítetten átadom
a következő blokk **döntési kérdései** közé (10. szakasz, 5. tétel). A szál a válasszal — a
végigkövetett úttal és ezzel az indokkal — nyitva marad: a döntés az operátoré, nem a végrehajtóé.
**Ha azt mondja, épüljön meg, megépítem.**

---

## 8. AMIT EZ A JELENTÉS NEM ÁLLÍT

- **Nem** állítja, hogy a külső-ellenőrző lánc 19/19 zöld. **Négy program PIROS**, és a részleges
  futás a futtató saját jelölése szerint sem a lánc bizonyítéka.
- **Nem** állítja, hogy a két piros helyettes (`r57a` · `r59a`) tartalmilag hibás: **nem futottak
  végig**, tehát tartalmi verdiktjük NINCS. A „nem futott" nem „részben".
- **Nem** állítja, hogy a mai fejet független fél elfogadta: a legfrissebb BEFEJEZETT review az
  `1585079`-et fedi, a mai fej (`23b4497`) maguk a javítások, és a hatodik kör (`c5d0b63`) a jelentés
  írásakor **fut** — annak verdiktje NINCS. **A válaszolt szál nem elfogadás**, és a szálak
  github-oldali lezárását sem végeztem el (kimondva a 7.3-ban).
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

**ZÁRÓ MÉRÉS A CSOMAG VÉGÉN** (`2026-10-08T05:57:32Z` → `19:35:00Z`): **834 hívás** · fő-szál
kontextusmedián **436 345** · max **782 772** · 400 ezer fölött **457 hívás** · **ügynök-bemenet 0
(nulla al-ügynök)** · cache-olvasás **371 302 119** · kimenet **850 774** · lefedettség **teljes**
(1 átirat, 1886 hívás, minden modell-válasz usage-dzsal). **A SÁV: VÁLTÁS** (436 345 ≥ 400 000) — a
`D-VS-3083` szerint a FUTÓ munkablokk célzott ellenőrzéssel **lezárható**, és a KÖVETKEZŐ önálló nagy
blokk **friss beszélgetésben** induljon. A lezárás címén nem indítottam új feltárást, új funkciót
vagy opcionális teljes söprést: a két utolsó P2 javítása, a jelei és az **érintett kötelező kapu**
tartozott bele, semmi más.

**A MEDIÁN NEM MONOTON** (541 361 → 458 460 → 419 391 → **436 345**), és ebből nem vonok le
megtakarítási állítást sem így, sem úgy: a célzott javítások rövidebb hívásai lenyomják, a hosszabb
mérés-futások felnyomják. Ami **egyirányú**: a **400 ezer fölötti hívások száma** (380 → 384 → 408 →
**457**), és a sáv is változatlanul **VÁLTÁS**. A fő szál ébresztései: **user 2×** → 152 hívás ·
**tömörítés 2×** → 220 hívás · **értesítés 7×** → 462 hívás (a tömörítéssel folytatott beszélgetés az
`R114` szerint NEM friss beszélgetés — ezt nem is állítom annak).

**ÉS AMIT EBBŐL KIMONDOK, MERT MÉRHETŐ:** a csomag utolsó szakaszát a review-körök hajtják, nem a
feladat. Hét kör jött, mindegyik a saját javításaim felett, és mindegyik valós hibát talált. Ez a
mérés nem a kör hibája — de azt jelenti, hogy a következő blokk kezdete **nem technikai kérdés**:
az operátor döntése, hogy ezen a fejen folytassuk-e a review-ciklust, vagy a 10. szakasz döntési
kérdéseivel induljunk.

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
2. **A független review a mai fejre.** A legfrissebb BEFEJEZETT kör az `1585079`-et fedi; a mai fej
   (`23b4497`) a 11–17. javítás, és egy hatodik kör a `c5d0b63`-on még fut. A mai fej átolvasása
   tehát **nyitott tétel** — és mivel a mérő sávja **VÁLTÁS**, ez a következő, önálló blokk dolga
   (`D-VS-3083`), nem ennek a lezárásnak a része.
3. **A `KUKA-431`/`437` nevesített mérés-hiánya.** A szűk **szerep**-plafonra nincs élő fixtúránk,
   mert a szerep-tengely szűkítésére ma nincs API-út. Ez is döntés: vagy épül hozzá fejlesztői út,
   vagy a forrás-pin marad, kimondva.
4. **Az `R112-I3` mechanizmusa.** A nevesített egyszeri bukás másodszor jött elő, és a rögzítés
   adatot adott (a lap nem rajzolt újra) — a mechanizmus viszont **mérve nincs**. A harmadik
   előfordulásnak kell megadnia; a tétel addig NYITOTT.
5. **A szánt résztvevő kötése a személy-váltó lépésen** (a 7.5 pont). Négy réteget érintő, fail-closed
   szigorítás, ami egy demó-környezetre korlátozott megszakadást előzne meg. **Nem építettem meg**, a
   végigkövetett út és az indok a 7.5-ben és a review-szálon áll. Döntési kérdés.

**A csomag korlátai megtartva:** nincs merge, nincs force-push, nincs felhős telepítés, nincs
titok-módosítás, nincs valódi üzleti adatváltoztatás, nincs V2-/production-módosítás, nincs új
fizetős keret, és nincs CMD/PR-VS-300 lezárás.
