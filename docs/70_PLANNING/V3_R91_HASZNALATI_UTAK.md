> **Kör:** R91 · **Sáv:** Claude-v3 · **Állapot:** lezárt

# A SEGÍTSÉG MOST VÉGIG IS VIHETŐ — hét javítás a használati utakon

**Kör:** CMD-VS-300-002-002 **R91** · **Repó:** `valach-family/valach-system` · **Döntés:** D-VS-3076
**Ág:** `claude/cmd-vs-300-002-002-r89-l1y9ui` · **Vizsgált (induló) fej:** `3b38705`

---

## 1. MI VOLT A BAJ, ÉS MI VAN MOST — köznyelven

Az előző körben megépült a súgó, a gyakori kérdések, az oldaltérkép, a kattintható bemutató és a
segéd. A külső ellenőrző fél végigjárta, és **hét helyen azt találta, hogy a darab megvan, de az ÚT
nem**. Ez a kör ezt a hét utat javította meg. A legfontosabbak, ahogy a felhasználó érzi:

| amit eddig tapasztalt volna | mi van most |
|---|---|
| A bemutató harmadik lépését **nem végezte el**, mégis azt olvasta: *„A bemutató végére értél"* — és az elszámolás 2 elvégzettet, 0 kihagyottat írt egy háromlépéses bemutatón. | A **Befejezés ugyanazt ellenőrzi, mint a Tovább**: függő lépésnél megáll, és felajánlja, hogy **kimondottan kihagyja**. A záró lap három számot ír ki (elvégezve · átugorva · hátravan), és a „végére értél" mondat CSAK akkor áll ott, ha semmi nem maradt ki. |
| A **belépés előtt** a Segítség gomb látszott, de a panel üres maradt. A regisztrációs bemutató belépve azonnal megszakadt. | Belépés előtt a panel **négy nézete működik**, és a **regisztrációs bemutató végigvihető**. Ami csak belépés előtt fut, azt a rendszer kimondja, és nem kínálja fel belépve. |
| Németre állította a felületet, **frissítés után magyar lett**. A megerősítő levél és a hozzá tartozó lap **mindig magyarul** jött. | A nyelvválasztó **belépés előtt is** ott van, a választás **megmarad** — de **személyhez kötve**: másik ember belépése nem viszi át. A levél, a benne lévő hivatkozás és a **szerver által rajzolt megerősítő lap** a kért nyelven szól. |
| **Új beszélgetést** nyitott, és a régi kérdésre késve megjött válasz **visszakerült** az új beszélgetésbe. | Minden válasz a **saját beszélgetéséhez** tartozik: Új beszélgetés, törlés, nyelvváltás vagy fiókváltás után a régi válasz **nem jelenik meg**. A beszélgetés **véges** (a legutóbbi hat kérdés), és a panel ezt **kimondja**. |
| A segéd egy **oda nem tartozó** mondatot adott vissza, és a rendszer **forrás-hivatkozásokat tett alá** — mintha igazolt lenne. | A szolgáltató válaszát a rendszer **ellenőrzi**: meg kell jelölnie, melyik útmutatóra épül, és annak **pontosan a nekünk átadott** változatára. Ha nem teljesíti, **nem az ő válasza jelenik meg**, hanem a helyi keresés válasza — és a lap **megmondja, miért**. |
| A gyakori kérdések között olyan is előkerült, amihez **nem volt hozzáférése**; a melléklet pedig gépi azonosítókat és beállítás-változókat mutatott. | **Egy szabály dönt** arról, mi látható: a tudás, a kérdések, a bemutatók és a gombok ugyanabból. A felület **emberi címeket** mutat, a technikai részletek **lenyitható szakaszba** kerültek. |

**Amit érdemes tudni a határról:** élő AI-szolgáltatóhoz **még mindig nincs csatlakozásunk** ebben a
környezetben. A segéd válasz-kezelését ezért **saját, helyi próba-szolgáltatóval** mértük — pontosan
úgy, ahogy az ellenőrző fél a hibát előállította. Ez **nem** élő AI-eredmény, és a lap ezt mindenhol
kimondja.

---

## 2. A HÉT JAVÍTÁS TÉTELESEN (F91-01…07)

### F91-01 — A bemutatók befejezése és tényleges elérhetősége · **bizonyítva**

- A **Befejezés** ugyanazt az állapotellenőrzést futtatja, mint a Tovább (`finishRun`); függő
  feladatnál NEVEZETTEN elakad, és mellé kerül a **kimondott kihagyás** (`skipStep`). A záró lap
  HÁROM számot ír ki, és a kilépés is elszámol — más mondattal, mint a teljes befejezés.
- A **regisztrációs bemutató** kimondja, hogy csak belépés előtt fut (`requires_anonymous`): belépve
  nem is ajánljuk fel (`notAvailable` mondattal), névtelenül pedig a belépési képernyőre visz, ahol
  a három lépése végigvihető.
- A **belépés előtti súgó** betölt (a korábbi alak belépés nélkül visszatért).
- A **fiók-létrehozás sikerét a kontextus-váltás ELŐTT** tanúsítjuk — különben az a bemutató soha nem
  tudta volna befejezni a saját feladat-lépését.
- **Mind a nyolc** fiókkezelői bemutató elindul és kiemel (vagy nevezetten vár/megszakít) — mérve.
- A nevesített **hozzáférés-kezelés megkapta a saját bemutatóját** (`tour.grant`, 3 lépés, a mentés a
  szerver válaszával igazolva). A **meghívás-elfogadás** NEVEZETT nyitott tétel: a képernyője csak
  érvényes meghívó-hivatkozásból nyílik, ezért súgóból indított bemutató nem létező célra mutatna —
  az indok a regiszterben áll (`tour_note`), mert **a `tour: null` nem teljesítés**.

### F91-02 — A nyelv a teljes úton · **bizonyítva**

- A **szerver által rajzolt** megerősítő lap és **minden próbaüzenet** a nyelvcsomagok új `SRV`
  csoportjából jön; a megerősítő hivatkozás **viszi a nyelvet**, tartalékként a böngésző kérése.
- **Nyelvválasztó belépés előtt** is; a választás **megmarad**, de **személyhez kötve**
  (`vs3.lang.<alany>` · `anon`) — a másik ember beállítása nem szivárog át, és aki még nem
  választott, a böngésző kérését kapja, nem az előző emberét.
- **Az átadási kötelezettség MINDEN BEKAPCSOLT NYELVRE szól** — a „három termék-nyelv" fordulatot
  kivezettük a gyökér-szabályból is.
- A csomag-bekötés lépése NEVEZVE: új nyelvnél a jegyzék bejegyzése **és** a szótár-feloldó `PACKS`
  regisztrációja kell — kód-logikát nem kell módosítani, de ez a két lépés munka.

### F91-03 — Beszélgetés-generáció és valóban véges előzmény · **bizonyítva**

- Beszélgetés-azonosító + kérés-sorszám + a kérés nyelve: mind a négy tengelyen eldobjuk az elavult
  választ (fiókváltás · Új beszélgetés · újabb kérdés · nyelvváltás).
- Az előzmény **véges a kliensen ÉS a szerveren**: a legutóbbi hat forduló megy át, a szerver a
  deklarált korlátra vág, és a válasz **kiírja**, mennyit adott át (`history_turns_sent`).
- Szolgáltató nélkül a panel **kimondja**, hogy minden kérdésre önállóan válaszol (a helyi keresés
  nem használja az előzményt) — nem ígérünk követő-kérdést oda, ahol nincs.
- Nyelvváltás után a **futó bemutató szövege** a mai nyelvre áll; ha az új nyelvű válasz már nem
  tartalmazza azt a bemutatót, nevezetten megszakad.

### F91-04 — A szolgáltatói válasz szerződése · **bizonyítva** (helyi csonkkal)

A modellnek gépi jelölőkkel kell zárnia a válaszát, és a szerver **ellenőrzi az átadott tudáson**:

| eset | a rendszer válasza |
|---|---|
| nincs forrás-jelölés | `model_no_source` → a **helyi** válasz jelenik meg |
| nem átadott útmutatóra hivatkozik | `model_unknown_source` |
| az útmutató MÁS változatára hivatkozik | `model_stale_source` |
| nem a kért nyelvet deklarálja | `model_wrong_language` |
| hosszabb a megengedettnél | `model_too_long` |
| mindent teljesít | **modell-válasz**, IGAZOLT forrással, a jelölők nélkül |

A választ **alátámasztó** forrás (`sources`) és a csak **kapcsolódó** útmutató (`related`) két külön
lista — a régi alak a kettőt összemosta. A kért nyelv **kifejezetten** átmegy a szolgáltatónak.

### F91-05 — Egy közös elérhetőségi szerződés · **bizonyítva**

`availabilityOf` — **egy feloldó, négy fogyasztó** (tudás · gyakori kérdések · bemutató · művelet),
két kimondott tengellyel: `audience` (`public` / `signed_in`) és `scope` (`person` / `book`). Mérve:
névtelenül **7** funkció tudása látható és **0** nyitható művelet; fiók nélkül 17 látható és a
fiókhoz kötött kérdések már nem is kereshetők (27 kereshető a 42-ből); fiókkezelőként 25 és 42.
A művelet-paraméterek **zárt mező-listát** követnek: a tömb és minden kitalált mezőnév nevezetten
elakad.

### F91-06 — Emberi felület és melléklet · **bizonyítva**

Egy rövid jelzés („Bemutató — mintaadatokkal”), a mérési részletek lenyitható technikai szakaszban, a
készlet-oldalon a **saját** műveletei (nem meghívási/csomag-vezérlő), emberi forrás-címek nyers
azonosító helyett, és a szolgáltatói változónevek az üzemeltetői részbe kerültek. A melléklet a
„Belépés előtt” nézetet is tudja, tehát a nyilvános szabály **megmutatható**. A nyelvi lektorálás
módja megnevezve: a kulcsok megléte **nem** lektorálás.

### F91-07 — Forráskötés, fogyasztás, állítások · **bizonyítva**

A gépi leltár (`docs/70_PLANNING/V3_R91_ELFOGADAS.json`) mostantól **három forrás-fejet** nevez meg
(induló · MÉRT kód · záró jelentés), és kimondja, hogy a mérések a **munkafán** futottak (a fej +
a változott fájlok száma). Négy állapot van, nem kettő: **bizonyítva · részben · hibás · nem futott**.
A söprés három tétele **külön** állapot (lásd 7. szakasz).

---

## 3. AMIT A SAJÁT MÉRÉSEM TALÁLT MENET KÖZBEN (3 lelet)

| # | mi volt | hogyan jött ki |
|---|---|---|
| **KUKA-238** | A nyelv-feloldót **kitalált mezőnévvel** hívtam (`accept` a szerződés szerinti `acceptLanguage` helyett), ezért a böngésző nyelvi kérése **némán** alapnyelvre esett — a szerveren ÉS a lapon egyszerre. | a feloldó kimenetének kiíratása, még a próba előtt |
| **KUKA-239** | A saját új mérésem a **fájl bármely sorára** illesztett, és zöldet adott, miközben a mért függvény még nem szűrt — a találat egy **másik** függvényből jött. | a zöld eredmény átolvasása |
| **KUKA-237** | A közös böngésző-segéd **beégetett magyar mondaton** hasonlított, ezért a németre állított felületen a kilépés „nem történt meg”-nek látszott. | a személyváltásos nyelvi próba első futása |

Mind a három gépi jelet kapott. A tanulság közös: **a tartalék-ággal rendelkező feloldó, a hatókör
nélküli minta és a beégetett felirat mind ugyanúgy hibázik — csendben.**

---

## 4. A MÉRÉSEK — MI FUTOTT, MILYEN EREDMÉNNYEL

| mérés | eredmény | mit fed |
|---|---|---|
| `npm run verify:app-findings-r91` | **30/30** | az R91 javítások ÉLŐ HTTP-n: elérhetőség · nyelvi út · bemutató-indok · a válasz-szerződés hat esete · véges előzmény · művelet-paraméter |
| `npx playwright test` | **65/65** (ebből 6 az R91-é) | a hét út végigkattintva, a korábbi körökkel együtt |
| `npm run verify:tutor` | **78/78 + 10 ellenpróba** | a tudás-regiszter · a bemutató-szerződés · **TUT11**: a közös elérhetőség mindkét irányban |
| `npm run verify:assistant` | **54/54 + 6** | a jog-sorrend · a zárt lista · a paraméter-szerződés · a válasz-ellenőrzés |
| `npm run verify:i18n` | **41/41 + 5** | a jegyzék · a három termék-nyelv · az új `SRV` csoport |
| `npm run verify:kuka` | **436/436** | 239 tanulság · 9 új · az archívum épsége |
| `npm run app:selfcheck` · `r75` · `r77` · `r79` · `r89` | **57 · 73 · 34 · 49 · 41** | a korábbi körök leletei nem csúsztak vissza |
| `npm run kapcsolat:ai` | **NINCS CSATLAKOZÁS** (a mérés lefutott) | a szolgáltatói állapot, NEVEKKEL |
| `npm run proof:assistant-live` | **NEM FUTOTT (2)** | az élő modell-út — nevezett hiánnyal |

---

## 5. AMIT NEM ÁLLÍTUNK

- **Nincs élő AI-mérés.** A válasz-szerződést helyi csonkkal mértük. Ez nem élő AI-eredmény.
- A `VS-LANG` jelölő a modell **saját deklarációja**: nyelv-felismerés nem történik, tehát egy
  hamisan deklaráló válasz tartalmi nyelvhelyességét ez a kapu nem méri.
- A forrás-ellenőrzés azt méri, hogy a hivatkozott útmutató **létezik és át volt adva** — nem azt,
  hogy a mondat logikailag következik belőle. **Érvényes azonosító önmagában sem tartalmi bizonyíték.**
- A francia és a jobbról-balra írt csomag **próba**, nem lektorált fordítás.
- A képernyőolvasós akadálymentesség (felolvasási sorrend, fókusz-csapda) **nincs mérve**.
- **A 21 „bizonyítva” sor nem 21 függetlenül elfogadott eredmény** — a független elfogadás a külső
  ellenőrző fél dolga.
- Nem zárul a core-core, nem zárul a CMD/PR, nincs merge, telepítés, V2-módosítás.

---

## 6. A V2 FELÉ MENŐ IGÉNY — NEVESÍTVE, ELVÉGEZVE NEM

A `verify:capability-witness` **hibás** állapotban van. **Mérve a csomag zárásakor: 8/11 egyezik ·
HÁROM elavult rögzítés · 2 gépileg nem mérhető** (kilépési kód 1). A három sor a **V2** repó
`tools/chatops-board/config/matrix-capabilities.json` fájljában áll, mindhárom „mért: present ·
rögzített: absent":

| tanú | mit mér |
|---|---|
| `v3-ui-slice` | böngésző-próba konfiguráció VAGY `test:e2e` szkript VAGY betölthető lap |
| `v3-vertical-slice` | HTTP-kiszolgáló a függőségek között VAGY útvonal-definíció a forrásban |
| `v3-user-facing-text` | i18n-szótár állomány |

**Önkorrekció:** az R89-es jelentésem KETTŐT írt — azt a számot a csomag ELŐTTI alapmérésből vettem, és
a harmadik (`v3-user-facing-text`) éppen az R89-ben született nyelvcsomagok miatt lett `present`. A
jelentésnek a mai mérést kell mondania, nem a korábbi állapotot (KUKA-050).

**Ez a csomag a V2-t nem módosítja** (a parancs kizárja), ezért az igény itt áll kimondva, és a
javítás a V2 sávjára vár.

---

## 7. A SÖPRÉS — HÁROM KÜLÖN ÁLLAPOT

| lánc | állapot | mit jelent |
|---|---|---|
| `verify:capability-witness` | **HIBÁS** | mért eltérés: **HÁROM** elavult tanú-rögzítés a V2 regiszterében (8/11 egyezik; lásd 6.) |
| `verify:v3ref` | **NEM FUTOTT** | a mutációs battéria nem fér a saját egység-költségvetésébe ezen a gépen — hiányos MÉRÉS, nem piros tartalom; a `v3ref/` egyetlen fájlja sem változott |
| `verify:external-checks` | **NEM FUTOTT** | a lánc a söprés 900 s-os türelmén belül nem fejeződött be |

Ez a három **nem ugyanaz az állapot**, és egyik sem „zöld”. A csomag saját verifierjei zöldek (4.).

---

## 8. A FOGYASZTÁS — AZ AKTUÁLIS ABLAKBÓL, NEM ÁTVETT MAGYARÁZATTAL

**Az ablak:** az R91 board-parancs időbélyegétől (`2026-09-26T11:03:06Z`) a csomag zárásáig.

| mit | mennyi |
|---|---|
| **induló teher az ablak elején** | a fő-szál kontextus mediánja **411 976** token már a 21. hívásnál — az R89 csomagból ÖRÖKÖLT teher, ugyanabban a munkamenetben (a leltár a záró pillanatképet is tartalmazza) |
| hívás az ablakban | **209** |
| cache-olvasás az ablakban | **114 648 636** |
| kimenet az ablakban | **202 609** |
| ügynök | **0** (a parancs kizárta a párhuzamos végrehajtót) |
| fő-szál kontextus | medián **547 260** · max **712 774** · 400 ezer fölött **205** hívás |

**A növekedés oka az AKTUÁLIS naplóból, nem az R73-ból átvéve:** a munkamenet **07:44:43Z-kor**
indult (az R89 csomaggal), és az R91 ablak **11:03-kor** nyílt — vagyis a kontextus induláskor már
~412 ezer token volt. Az ablakon belüli növekedés (412 → 547 ezer medián) forrásai mérve: **209 hívás**
saját kimenete (202 609 token) és az eszköz-válaszok. **Beavatkozási pontok, amiket alkalmaztam:**
célzott olvasás (`sed -n` / `grep` egész fájlok helyett), a nagy naplók fájlba írása (a terminálra
csak összegző és hibás sor), és a nagy fájlok EGY eszközzel írása. **Amit nem tettem meg:** nem
bontottam két funkcionális körre — a parancs ezt kifejezetten kizárta.

**Az előző kör `--from` értékének tisztázása (a reviewer kérdése):** a munkamenet MÉRT kezdete
`2026-09-26T07:44:43Z`, az R89 board-parancs `06:56:43Z` — a session tehát a parancs UTÁN indult. Az
általam megadott `05:30Z` mindkettőnél korábbi, vagyis **tágabb** ablak volt, nem eltolt: nem
szűkíthette az összeget. A mostani leltár a **board-időbélyeget** használja.

A tartalom nélküli gépi leltár: `docs/70_PLANNING/V3_R91_FOGYASZTAS_LELTAR.json`.

---

## 9. FÁJLOK

**Új:** `v3app/findings_r91.mjs` (élő battéria + helyi szolgáltatói csonk) ·
`tests/e2e/v3app-r91.spec.mjs` (6 böngésző-eset) · `tools/v3_r91_elfogadas.mjs` ·
`docs/70_PLANNING/V3_R91_ELFOGADAS.json` · `docs/70_PLANNING/V3_R91_FOGYASZTAS_LELTAR.json` (+ ez a lap).

**Módosult:** `v3app/knowledge/features.mjs` (`audience` · `ACTION_PARAMS` · `tour_note` ·
`tour.grant`) · `v3app/assistant/policy.mjs` (`availabilityOf` · `searchableFaqIds` ·
`verifyModelAnswer` · a kereső közös-előtag szabálya) · `v3app/assistant/provider.mjs` (előzmény és
kért nyelv) · `v3app/server.mjs` (`SRV` szövegek · nyelv-egyeztetés · a válasz ellenőrzése) ·
`v3app/httpSchema.mjs` · `v3app/public/{app.js,tour.mjs,chat.mjs,help.mjs,style.css}` ·
`v3app/public/i18n/{hu,en,de}.mjs` + `dict.mjs` + `texts.mjs` · `tools/v3_r89_bemutato.mjs` ·
`tests/e2e/helpers.mjs` · `tests/e2e/v3app-r89-tutor.spec.mjs` · `v3app/findings_r89.mjs` ·
`tools/{vs_verify_tutor,vs_verify_assistant}.mjs` · `contracts/{retiredPatternRegistry,guardHome}.js` ·
`docs/KUKA_ARCHIVUM.md` · `DECISION_LOG.md` · `CLAUDE.md` · `package.json`.

**A magreferencia (`v3ref/`) egyetlen fájlja sem változott.**
