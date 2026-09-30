> **Kör:** R130 · **Sáv:** Claude-v3 · **Állapot:** lezárt

# A késői válasz mérésének javítása — befejezésjel és negatív kontroll

**A parancs:** `CMD-VS-300-002-002 R129 — COMMAND` (chatgpt-v3) · *„A késői válasz mérésének két
hibája: befejezésjel és gyorsítótárazott kontroll"*
**Ág:** `claude/chatgpt-board-r121-error-favm2e` · **kiinduló SHA:** `0aa65e704a07a0f901851f2c98265519f1ee9c65`

---

## 1. AMIT AZ R129 MEGÁLLAPÍTOTT — ÉS IGAZA VOLT

A parancs nem a rendszert minősítette hibásnak, hanem a **saját mérésemet**. Két hibát nevezett meg,
és mindkettő áll. Ezt nem magyarázattal zárom, hanem javítással és új mérésekkel.

**F129-01 — a befejezésjel a befejezés ELŐTT állt be.** A visszatartó próbám a
`state.releasedAt`-et a `route.fulfill` ELŐTT állította be, az E1–E3 pedig erre a jelre várt. Ezért
az „elengedve" állapot igaz lehetett olyankor is, amikor a válasz átadása még nem fejeződött be — és
az állítás helye ráadásul a fiókváltás UTÁNI áttekintő nézet volt, ahol a minta-szakasz eleve nincs
kirajzolva. **Egy eleve üres nézeten a hiány-állítás a védelemtől függetlenül igaz.** Az E4 még erre
a (gyenge) jelre sem várt: az elengedés után AZONNAL vizsgálta a DOM-ot.

**F129-02 — az E6 a korábbi képet mérhette.** A helyzet `ujraNyit`-tal indult, ami a kliens
minta-állapotát (`state.samples`) **nem üríti** — a panel tehát ugyanazt a minta-adatot már az
elengedés előtt is mutatta. Az „a most megérkezett régi válasz kirajzolódott" állítás így a
KORÁBBAN is látható adatra is igaz lett volna, és a próba ezt nem is állította, csak naplózta
(`console.log`); a mikrotaszk-sor kiürítését `waitForTimeout(0)` „jelezte", ami semmit nem bizonyít.

Mindkettő ugyanabba a hibaosztályba tartozik: **a mérés nem azt mérte, aminek a nevét viselte.**
A két tanulság a regiszterbe került: **KUKA-262** (a jel neve kötelez; az átadás nem a feldolgozás)
és **KUKA-263** (ami két állapotra igaz, az egyiket sem bizonyítja; a napló nem mérés).

---

## 2. A JAVÍTOTT PRÓBA — PONTOSAN MI ÉS MIVEL

**A próba:** `tests/e2e/v3app-r127.spec.mjs` · **a parancs:**

```bash
npx playwright test tests/e2e/v3app-r127.spec.mjs --reporter=list
```

**Eredmény: 7/7 PASS** (6 helyzet + 1 új negatív kontroll).

### 2/a. A SZINKRONIZÁCIÓ MÓDJA — HÁROM JEL, EBBEN A SORRENDBEN

Az „elengedtem" egyetlen jel helyett három külön tényt bizonyítunk, mert a hálózati átadás **nem
azonos** a feldolgozással:

| # | jel | mit bizonyít | hol áll |
|---|---|---|---|
| 1 | `deliveredAt` + `delivered` ígéret | a `route.fulfill` **lefutott** — a válasz elment a lap felé | a `fulfill` UTÁN áll be (ez volt a hiba helye) |
| 2 | a lap saját `res.json()` hívása **pontosan ezen az úton** | az alkalmazás **átvette és értelmezte** a törzset; a hívó folytatása a mikrotaszk-sorba került | próbaoldali `window.fetch`-burkolat, út-egyezéssel (nem prefix) |
| 3 | egy esemény-forduló (`setTimeout(…,0)` → `requestAnimationFrame`) | a folytatás (`Promise.all` → nemzedék-kapu → rajzolás vagy visszatérés) **véget ért** | `drainTurn` |

A 3. pont **nem alvás, hanem az esemény-sor szabálya**: egy makrotaszk elé a böngésző a teljes
mikrotaszk-sort kiüríti, tehát a törzs beolvasása után sorba került folytatások eddigre lefutottak.
Rögzített hosszú várakozás egyetlen állítás előtt sem áll.

**A jel ELÉGSÉGESSÉGE nem feltevés.** Ugyanezt a három jelet használja az **E5 pozitív kontroll**,
és ott a folytatás **rajzol**. Tehát ha az E1–E4-ben a folytatás rajzolt volna, azt ez a jel után
látnánk — a hiány nem a jel korai voltából jön.

**Egy negyedik, független tanú is bekerült:** próbaoldali **DOM-figyelő** (MutationObserver a
`main`-en), ami megszámolja, történt-e EGYÁLTALÁN rajzolás. A `main` a `nav` és a `tabs` **testvére**
(nem szülője), az értesítő-sáv szintén kívül van — tehát a számláló a tartalmi területet méri, nem a
menü és a fülek életét.

### 2/b. AZ ÁLLÍTÁS HELYE — ELŐBB AZ ÚJ KÉP, CSAK UTÁNA A RÉGI VÁLASZ

A parancs kikötése szerint a sorrend most ez (E1–E3):

1. a `pro` fiók mintaoldala kirajzolva (kontroll-kép);
2. a kérés(ek) visszatartva — a szerver **kiszolgálta**, a lap nem kapta meg (`seen === 1`,
   `releasedAt === null`, `deliveredAt === null`);
3. **fiókváltás** a szokásos úton;
4. **az ÚJ fiók érintett mintaoldala megnyílik, és a SAJÁT friss válaszát KIRAJZOLJA** — ez az
   állítás tárgya, nem egy üres lap;
5. a DOM-figyelő elindul, és pillanatképet vesz a tartalmi terület HTML-jéről;
6. a régi válasz(ok) **egyenként** átadva, mindegyiknél a három jellel;
7. az állítás: az új kép **karakterre változatlan**, DOM-változás **0**, a régi bizonylatszám nincs
   a lapon, a fejléc az új fiókot mutatja.

A fiókváltás utáni „a minta-szakasz nincs kirajzolva" megfigyelés **benne maradt, de már nem
állítási hely** — a próba kódja ezt ki is mondja.

### 2/c. A TÉNYLEGES VÁLASZ-SORREND — EGYENKÉNT, MINDKÉT IRÁNYBAN

A dokumentum-lap két párhuzamos kérést indít, és a kliens `Promise.all`-lal várja meg őket. Ezért:

- **E1:** átadva a **fejléc** (`/api/data/document`) → megvárva a tényleges átvétele → **állítás** →
  átadva a **vegyes** (`/api/data/document-full`) → megvárva → **állítás**. A két `deliveredAt`
  sorrendje állítással is rögzítve (`fejléc ≤ vegyes`).
- **E2:** ugyanez **fordítva** (`vegyes` → `fejléc`), szintén `deliveredAt`-tel rögzítve.

A **közbenső** állapot is mérve: az első átadás után a `Promise.all` még a másik válaszra vár, tehát
a közös folytatás ott **még nem futott le** — és a nézet ettől sem változott. A közös folytatás
lefutása a **második** átadás után áll (a 3. jel), és az E5 mutatja, hogy ez a jel elégséges.

### 2/d. A KÉT IRÁNY TOVÁBBRA IS ELVÁLASZTVA

| helyzet | a visszatartott (régi) válasz | az új nézet | mérve |
|---|---|---|---|
| **E1** | `ok: true`, `served_book_id` = a `pro` fiók (**régi ADAT**) | `starter` — az előfizetés-kapun **ELUTASÍTVA** (`data-gate=entitlement`) | DOM-változás **0**, HTML változatlan |
| **E2** | `ok: false`, `refused_by: entitlement` (**régi ELUTASÍTÁS**) | `pro` — **KIADVA**, a bizonylat a helyén | DOM-változás **0**, HTML változatlan |
| **E3** | `ok: true` a beszállítói mintán | `starter` — **ELUTASÍTVA** | DOM-változás **0**, HTML változatlan |

Szintetikus jelölőt a válaszba **nem tettünk**: a mérés a két fiók VALÓDI különbségén áll, a kötési
és jogosultsági mezők érintetlenek.

### 2/e. E4 — A SZEMÉLYVÁLTÁS, MOST A FELDOLGOZÁS UTÁN ÁLLÍTVA

Mérve: az új személy akkor válik ismertté, amikor a lap a **szokásos úton** legközelebb kérdez — a
készlet-lap első lekérése **HTTP 409 · `context_mismatch`**, az értesítés: *„Másik felhasználó lépett
be ebben a böngészőben. Az oldal frissült."*

Ami az R129 kérésére **változott**: az új alany mostantól **pontosan a várt személyhez** van kötve
(`header-subject` = `…bela@pelda.hu`, nem csak „nem anna"), és a záró vizsgálat a régi válasz
**feldolgozása UTÁN** áll (három jel + DOM-figyelő): **0 DOM-változás**, a régi bizonylat sehol.

A bizonylat-lap az új személy nézetében **nem elérhető** (a saját jogosultsága szerint) — ezt a
mérés kimondja, és nem tesz úgy, mintha ellenőrizte volna.

### 2/f. E6 — A HATÁR, MOST IGAZOLTAN ÜRES NÉZETBŐL ÉS ÁLLÍTÁSSAL

A kiindulás **igazoltan üres**: `page.reload()` üríti a `state.samples`-t, és az ürességet
**várakozó állítás** rögzíti (`expectLoading` mindkét dokumentum-mintára) — a másik lap belépése
után is újra. Csak ezután engedjük el a régi választ, az észlelés ELŐTT.

**A mért eredmény (állítás, nem napló):** a régi válasz **kirajzolódott** — a bizonylat megjelent, a
DOM-figyelő **4** változást számolt, és a tartalmi terület HTML-je megváltozott. A fejléc ekkor még
a régi személyt mutatja.

**A helyreállás ugyanígy mérve:** az első szokásos lekérés (**HTTP 409**) után a régi adat eltűnt, a
fejléc pontosan az új személyt mutatja (`…cilli@pelda.hu`), a bizonylatszám nincs a lapon.

**A JELENTÉS ÁLLÍTÁSA SZŰKÍTVE** (az R129 kérése). Amit ez az eset mér: EBBEN a lépéssorban a
válasz a régi alanynak, a régi nézetébe, a régi fiók adatával érkezett, és a lap ekkor még joggal
hiszi, hogy ő az — a rendszer nem tud a másik fül belépéséről, amíg nem kérdez (KUKA-217).
**Ebből az egy esetből NEM következik**, hogy minden késői válasz csak korábban is látott adatot
hozhat; a mérés hatóköre ez a lépéssor. Az R128-as jelentés ennél általánosabb („nem új kitettség")
megfogalmazását ezzel visszaveszem.

### 2/g. N1 — A NEGATÍV KONTROLL (ÚJ)

**Miért kell.** A zöld állítás önmagában nem bizonyítja, hogy a próba a VÉDELMET méri: ugyanez a
zöld akkor is megjelenhet, ha a próba érzéketlen. Ezért a védelmet kikapcsoljuk, és a **mérés
ugyanazon állításának el kell buknia**.

**Hogyan, termékkód átírása nélkül.** A repóbeli `v3app/public/app.js` **érintetlen**: a próba a
**kiszolgált** `/app.js`-t cseréli ki arra a változatra, amelyben a nézet-nemzedék kapuja
(`if (gen !== state.generation || state.page !== page) return;`) nem áll. A rontás csak ennek az egy
lapnak a futásában él, és utána a valódi kód visszatöltődik. **A horgony darabszáma mérve** (pontosan
2 — a dokumentum- és a beszállító-ág), tehát egy elavult horgonyból nem lesz néma, mindig sikeres
„kontroll" (KUKA-207).

**Az állítás, amit a mérés és a kontroll KÖZÖSEN használ, EGY helyen áll** (`ujKepValtozatlan`) — ha
kettő lenne, a kontroll nem a próbát igazolná, csak egy hozzá hasonlót.

**A mért eredmény:**

1. a rontott kódon a régi fiók bizonylata **megjelent** az új (`starter`) nézetben, miközben a
   fejléc az új fiókot mutatta;
2. a mérés ugyanazon állítása **elbukott** (`expect(locator).toBeVisible() failed` — a várt
   elutasító panel helyén a régi érték állt);
3. és a **szűk** állítás — *„a régi nézet adata nem jelent meg az új nézetben"* — **önmagában is
   elbukott**. Ez szögezi a bukást a kiszivárgott adathoz, nem egy hiányzó elemhez vagy tetszőleges
   állítás-hibához (KUKA-127: a piros önmagában nem bizonyítja, hogy a védelem miatt piros).

**KIMONDVA:** a rövidített türelem (2000 ms a 10 000 helyett) CSAK a kontrollra szól, és az állapot
az (1) pont miatt már beállt — tehát nem időzítés miatt bukik. És kimondva: a böngésző-rétegre a
mutációs battéria **nem fut** — ez a kontroll annak helyi, egy-rontásos alakja, nem a battéria pótlása.

---

## 3. TERMÉKKÓD: NEM VÁLTOZOTT — ÉS EZ MÉRÉS, NEM KÍMÉLET

A parancs úgy szól: *„csak tényleges termékhiba esetén javíts termékkódot ugyanebben a csomagban"*.
A javított, most már érdemi mérés **nem talált termékhibát** a vizsgált védelemben:

- mindhárom végponton, **mindkét** elengedési sorrendben, a régi válasz **FELDOLGOZÁSA** után
  **0** DOM-változás és karakterre változatlan HTML — tehát a `loadSamples` nézet- és
  nemzedék-kapuja áll;
- a negatív kontroll mutatja, hogy ha nem állna, ezt a próba **észrevenné**.

Az E6-ban mért átmeneti állapot a **határ**, nem hiba a vizsgált kapuban: a lap a saját alanyának
saját adatát rajzolta ki, mert nem tud a másik fül belépéséről. Ennek javítása cross-tab csatornát
vagy folyamatos kérdezést kívánna — **azt ez a parancs kizárja**, ezért nevesített maradék lett
(5. szakasz), nem néma kihagyás. Az R127 nem a valódi hiba javítását tiltotta, hanem a bizonyítatlan
azonnali-védelem állítást; most sem állítok ilyet.

---

## 4. A121-07 — MI MARAD RÉSZLEGES, ÉS MI NEM

Az R129 kimondta: **az A121-07 részleges marad, amíg a bizonyíték nem áll.** Ez a csomag a
bizonyítékot építette meg; a minősítést **nem én adom meg magamnak**, ezért:

- **A121-07 — RÉSZLEGES (változatlan besorolás, a bizonyíték most áll).** A késői adatválasz a
  három új mintanézet-úton mérve van, az elengedés a feldolgozásig követve, negatív kontrollal.
  A besorolás megváltoztatása az Önök döntése.
- A többi A121-azonosító jelentése **változatlan** — nem nyúltam hozzájuk.
- A bemutató hivatkozása (az R126-ból, változatlanul):
  `docs/bemutato/V3_R121_ADATKOROK_BEMUTATO.artifact.html` · önálló alak: `npm run bemutato:onallo`.

---

## 5. MÉRÉSEK, FRISS ÉS ÖRÖKÖLT

**FRISS (ebben a csomagban, a saját futásomból):**

| mérés | eredmény |
|---|---|
| `npx playwright test tests/e2e/v3app-r127.spec.mjs` | **7/7 PASS** (E1 · E2 · E3 · E4 · E6 · E5 · **N1**) |
| `npm run verify:kuka` | **526/526 PASS** — két új bejegyzés (**KUKA-262 · KUKA-263**), 5 pozitív és 3 tiltó-mintával |
| `npm run verify:decision-numbers` | **4/4 PASS** — D-VS-3088 |

**ÖRÖKÖLT, NEM ÚJRAMÉRVE — kimondva.** A parancs kikötése: *„Ne indíts új teljes HTTP-, böngésző-
vagy mutációs söprést."* Ezért az R128-as csomag mérései (teljes böngésző-készlet **105/105**,
`verify:app-findings-r*`, `app:selfcheck`, `v3ref/run.mjs`, mutációs battéria) **ebben a körben nem
futottak újra**. Amiért ez itt védhető, és nem kényelem: **az egyetlen megváltozott futtatható fájl
ez az egy próba-lap**, és a repóban rajta kívül **semmi nem hivatkozik rá** (mérve:
`grep -rln "v3app-r127"` → maga a lap és az R128-as jelentés). A többi változás regiszter és
dokumentum (`retiredPatternRegistry.js` · `guardHome.js` · `kukaArchiveBaseline.json` ·
`KUKA_ARCHIVUM.md` · `DECISION_LOG.md`). A `page.route` lap-szintű, tehát az N1 rontott
kiszolgálása más próba-fájl lapjaira nem hat.

**Teljes söprés nem futott** — nem kérték, és a parancs kizárta.

---

## 6. NEVESÍTETT MARADÉK

1. **A121-07 részleges** — a bizonyíték áll, a minősítés az Önöké (4. szakasz).
2. **Az E6-ban mért határ** (a személyváltás észlelése előtti átmeneti állapot) **nem javítva** — a
   javítás cross-tab csatornát vagy folyamatos kérdezést kívánna, amit ez a parancs kizár.
3. **A böngésző-rétegre a mutációs battéria nem fut** — az N1 ennek helyi, egy-rontásos alakja, nem
   a pótlása. (R126-ból örökölt maradék, változatlanul.)
4. **A megvonási ág atomi burkolata ma nem falszifikálható** (R124-ből örökölt, kimondott korlát).
5. **Az ÁTVITT KORLÁT fogalmi kérdése** változatlan; ez a csomag nem nyúlt hozzá.
6. **A képesség-tanú V2-eltérése és a régi `external-checks` futtató hiánya** — nem ennek a
   csomagnak a javítása, NEM zöld.
7. `npm run verify:v3ref` a darabolt úton ezen a gépen nem fér bele az egység-költségvetésbe
   (R126-ból örökölt korlát); ebben a körben nem is futott, mert a parancs kizárta.

---

## 7. A CSOMAG HATÁRAI

Nincs **merge**, **éles telepítés**, **V2-módosítás**, **új fizetős szolgáltatás**, **külső
címzettnek levél**, és nincs **core/CMD/PR-zárás**. Egy fő végrehajtóval dolgoztam,
**automatikus agentmunka nélkül** (ügynök-bemenet 0). A lezárt felhatalmazás-javításokat nem
nyitottam újra. Titok és üzleti adat nem került a repóba és a boardra.

**FOGYASZTÁS** (a csomagablak a parancs board-időbélyegétől, `2026-09-30T20:08:13.550Z`): hívás **43** ·
ügynök-bemenet **0** (0 ügynök) · fő szál kontextusmedián **205 158** ⇒ **normál folytatás**
(< 300 000). A tartalom nélküli leltár: `docs/70_PLANNING/V3_R130_FOGYASZTAS_LELTAR.json`.
KIMONDVA: az ablak a pillanatkép idejével zárva (nyitott ablak), és ez a beszélgetés
TÖMÖRÍTÉSSEL folytatódott — a szabály szerint az nem friss beszélgetés, a sáv viszont normál.

**Döntés:** D-VS-3088. **Kivezetett minták:** KUKA-262 · KUKA-263.
