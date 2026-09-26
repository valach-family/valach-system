> **Kör:** R89 · **Sáv:** Claude-v3 · **Állapot:** lezárt

# SEGÍTSÉG A RENDSZERBEN — súgó, gyakori kérdések, oldaltérkép, kattintható bemutató és segéd; és a NYELVEK, amiket bővíteni lehet

**Kör:** CMD-VS-300-002-002 **R89** · **Repó:** `valach-family/valach-system` · **Döntés:** D-VS-3075
**Ág:** `claude/cmd-vs-300-002-002-r89-l1y9ui` · **Kiinduló állapot:** `4b93d1aa` (a parancsban megadott fej)

---

## 1. MIT KÉRTÉL, ÉS MI LETT BELŐLE — egy bekezdésben

A meglévő V3 felület mellé beépült a **segítség**: a fejlécben egy „Segítség" gomb, a fontosabb
mezők mellett kérdőjel, és egy panel négy nézettel — **Kérdezz** · **Útmutatók** · **Gyakori
kérdések** · **Oldaltérkép**. Mellé egy **kattintható bemutató**, ami a VALÓDI képernyőn mutatja meg
a lépéseket, és egy **segéd**, aki kérdésre válaszol — de csak abból, amit a rendszer tényleg tud.
Mindez **EGY tudás-forrásból** él: minden képesség ott, egy helyen, verzióval mondja meg magáról,
mit tud, hol van, mi történhet vele, és mit mondhat róla az AI. A felület **három nyelven** teljes
(magyar · angol · német), és a nyelvek **bővíthetők**: egy új nyelv egy jegyzék-bejegyzés és egy
szótár-csomag — **kódot nem kell hozzá írni**. Ezt nem ígérjük, hanem megmutatjuk: egy NEGYEDIK
nyelv (francia) és egy **jobbról balra írt** próba-tartalom is bekerült, kizárólag azért, hogy a
bővíthetőség mérhető legyen.

**Amit a saját mérésem talált meg menet közben — és ez a kör igazi haszna:** tíz hibát, amiből öt
olyan, hogy nélküle a szállítás „elkészült"-nek LÁTSZOTT volna. A legsúlyosabb: **a kérdés
elküldése nem működött** (a panel írói útja kimaradt egy közös szabályból), miközben a
HTTP-mérésem zöld volt — mert az a végpontot hívta, nem a gombot. A tízből mind a tíz gépi jelet
kapott (KUKA-221…230).

---

## 2. MIT LEHET MOST VÉGIGKATTINTANI — a használat-próba négy kérdése, ÍRÁSBAN (D-VS-497)

| kérdés | válasz, mérve |
|---|---|
| **KI OLVASSA?** | a súgó szövegeit a felhasználó a panelben; a tudás-regisztert a súgó, a GYIK, az oldaltérkép, a bemutató és a segéd — **négy fogyasztó, egy forrás**. Ami senkihez nem jut el, az nincs benne: `verify:tutor` piros lesz árva GYIK-re és árva bemutatóra. |
| **MI VISZI KI?** | a kérdést a **Kérdezz** nézet küldi el (`POST /api/assistant/ask`), a tudás-index és a bemutató-lista **olvasó** végponton jön. Ezt a böngésző-próba VÉGIGKATTINTJA (nem csak a végpontot hívja) — pontosan azért, mert az első alakban a gomb nem működött. |
| **HOL KATTINT?** | „Segítség" a fejlécben (mobilon is), kérdőjel a Készlet · Csomag · Új fiók · Profil · Felhasználók képernyőn, „Bemutató indítása" az útmutató alatt, folytatás-gombok a válasz alatt. Mind ELÉRHETŐ és ENGEDÉLYEZETT állapotban mérve. |
| **MIT LÁT UTÁNA?** | a nyelvváltás után AZONNAL az új nyelvet (menü · oldalcím · súgó · hibaüzenet); a bemutató után a lépések állapotát (`elvégezve` / `átugorva`, külön szóval); a kérdés után a választ, a FORRÁSÁVAL és a mért fogyasztással, ahol az ismeretlen érték „nincs adat", nem nulla. |

**A megváltoztatott képernyőt végigkattintottuk:** `npx playwright test` → **59/59 eset zöld**, ebből
**6 az R89-é** (a súgó négy nézete · a nyelvváltás · a bemutató · a chat · mobil+RTL · a
nézet-váltás). Ez nem a saját fixtúrám: valódi böngésző, valódi HTTP, valódi tároló.

---

## 3. EGY TUDÁS-FORRÁS, NÉGY FOGYASZTÓ (TUD-01)

`v3app/knowledge/features.mjs` — **26 képesség**, mindegyik ezt deklarálja:

- **állapot:** `working` (20) · `demo` (3) · `planned` (2) · `retired` (1) — a tervezett képesség
  NEM kap „megnyitom" gombot, a kivezetett pedig utódot nevez meg;
- **hol van:** képernyő + stabil felületi pontok (horgonyok) · **mit tesz:** művelet · **ki jogosult:**
  a döntést hozó végpont és az elutasítás nevezett okai;
- **MINDEN kimenet-fajta** (siker · elutasítás · ütközés · hiba · üres · részleges) — tehát a súgó a
  „mi történhet"-et is elmondja, nem csak a „mire jó"-t;
- **az AI szerződése:** mit magyarázhat · mit nyithat meg · mit készíthet elő;
- **nyelvenkénti forrás-verzió és átnézési állapot** (ellenőrzött · elavult · hiányzik);
- **bizonyíték:** melyik mérés fedi.

Ebből él: **26 útmutató-szöveg** · **42 gyakori kérdés** · **8 bemutató (32 lépés)** · **21 nyitható
művelet, mind `writes: false`** · a kereső **26 nyelvi kulcsszó-sora**. Új képességnél tehát nincs
négy helyen frissítés — és nem tud elcsúszni egyik a másiktól.

---

## 4. A SÚGÓ — NÉGY NÉZET, MODELLHÍVÁS NÉLKÜL

**Magától nem nyílik ki.** A panel a felhasználó döntése; Esc-re zárul, és a fókusz visszatér a
megnyitó gombra (mérve).

- **Útmutatók** — elöl az AKTUÁLIS képernyő témái. Egy téma: mire való · mi kell hozzá · mi lesz
  utána · **mi történhet** (a kimenetek) · a fordítás állapota · és egy MŰKÖDŐ folytatás
  (bemutató-indító vagy a képernyő megnyitása).
- **Gyakori kérdések** — 42 kérdés, kereshető.
- **Oldaltérkép** — azt mutatja, ami a SZERVER szerint elérhető, és kimondja, mi MIÉRT nem
  („ehhez fiók kell" · „ehhez fiókkezelői jog kell" · „ehhez bővített csomag kell"). A sorai valódi
  képernyőre visznek, és a panel becsukódik, hogy ne fedje el a műveletet.
- **Kérdezz** — a segéd (lásd 7.).

**A költség mérve:** a súgó · a GYIK · az oldaltérkép · a bemutató · a helyi keresés **NULLA
modellhívással** fut. A böngésző-próba MEGSZÁMOLJA a kéréseket (`asks.n === 0`), tehát ez nem
állítás, hanem mérés.

---

## 5. A KATTINTHATÓ BEMUTATÓ — és amit SOHA nem tesz

Kiemel és magyaráz a VALÓDI képernyőn, 3–7 lépésben, a lépések szöveges listájával (nem csak képen).
**Mentésre, meghívásra, jóváhagyásra, jogadásra, törlésre nem nyúl** — a modul egyetlen DOM-elemet
sem aktivál (gépi jel: a `.click()` és a `dispatchEvent` a modulban TILTOTT minta).

- **A feladathoz kötött lépés CSAK igazolt siker után halad.** A gomb megnyomása önmagában nem
  siker: az igazolást a SZERVER válasza adja. Amíg nincs, a buborék kimondja: *„a gomb megnyomása
  önmagában még nem siker"*.
- **Az „átugrott" NEM „elvégezett".** Három állapot, és a zárás kiírja, mi maradt el.
- **Ami a panelen BELÜL van, arra VÁRNI kell** (ez a kör egyik lelete, KUKA-228): a lépés kimondja,
  mi tárja fel a célját (9 lépésnél), a bemutató a FELTÁRÓ gombot emeli ki, és megmondja, mit kell
  megnyitni. A cél hiánya így nem hamis megszakítás — a VALÓBAN eltűnt cél viszont továbbra is
  nevezetten megállítja a bemutatót.
- **A megszűnt jog, a fiókváltás és a személyváltás megszakítja** — a bemutató a megnyitáskori
  nézethez tartozik, és nem tároljuk el a böngészőben.

---

## 6. A NYELVEK — JEGYZÉKBŐL, NEM KÓDBÓL (LANG-01 · I18N-01)

Egy nyelv egy bejegyzés: **azonosító · saját nyelvi név · írásirány · bekapcsolt állapot · KIMONDOTT
tartalék-lánc**. A lap `lang` és `dir` jelölése ebből áll.

| nyelv | lefedettség | irány | állapot | tartalék-lánc |
|---|---|---|---|---|
| magyar (`hu`) | **589/589** | ltr | bekapcsolt (alap) | — |
| angol (`en`) | **589/589** | ltr | bekapcsolt | en → hu |
| német (`de`) | **589/589** | ltr | bekapcsolt | de → hu |
| francia (`fr`) | **92/589** — PRÓBA | ltr | **kikapcsolt** | fr → en → hu |
| `ar-x-proba` | **52/589** — PRÓBA, jobbról balra | **rtl** | **kikapcsolt** | ar-x-proba → en → hu |

- **A TARTALÉK NEM LEFEDETTSÉG.** A hiányzó és az ELAVULT fordítás nevezett hiány; a nyelvválasztó
  csak a bekapcsolt nyelveket kínálja (a próbákat NEM). A fordítás állapota a súgóban LÁTSZIK.
- **A felhasználó adatát soha nem fordítjuk le** (cégnév, megjegyzés, termékleírás).
- **A nyelv NEM dönt** országról, adózási rendről, időzónáról, pénznemről — kimondva, kódban.
- **Szám, dátum, többes szám** a nyelv szabálya szerint (`Intl`), nem kézzel összefűzve.
- **Az írásirány mérve:** 390×844-es ablakon a tükrözött lapon sincs vízszintes csúszás, **és a
  lenyíló menü tartalma a képernyőn van** — találat-vizsgálattal ÉS valódi kattintással mérve. (Ez
  a második mérés azért kellett, mert a képernyőn kívülre eső tartalom csúszást NEM okoz: a
  csúszás-mérés önmagában zöld maradt volna — KUKA-229.)

---

## 7. A SEGÉD — A HATÁRA KÓDBAN ÁLL (AST-01 · AST-02 · AST-03)

- **A jog ELŐBB dől el, mint a tudás.** A szerver ellenőrzi a belépést, a FIÓKOT, a tagságot, a
  szerepet, a csomagot és a funkció állapotát, és csak UTÁNA választ tudást. (A fiók-kapu kimaradt
  az első alakból: a megvont tag még látta a fiókhoz kötött leírásokat — KUKA-222.)
- **Célzott kiválasztás, nem teljes kézikönyv:** legfeljebb 3 funkció, 4000 karakter, 6 előzmény-kör.
- **A nyitható műveletek ZÁRT listából jönnek, és MIND `writes: false`.** A segéd tehát **nem ír** —
  legfeljebb ELŐKÉSZÍTI a rendes űrlapot, a mentést a felhasználó nyomja meg, friss
  szerver-ellenőrzéssel. A védelem a zárt lista, nem a minta-felismerés.
- **Három szint:** elmagyaráz → megnyit → előkészít. A `planned` és a `retired` képesség egyiket sem
  kaphatja meg (KUKA-224).
- **Az utasításnak álcázott kérdést adatként kezeli, és ezt KI IS MONDJA** a válaszban.
- **Ha nincs engedélyezett szolgáltató, a panel kimondja, mi hiányzik** — a változók NEVÉVEL, értéket
  soha. A helyi válasz megmondja magáról, hogy nem AI-válasz.
- **A mérés négy tengelyen, és a `null` nem nulla:** hívásszám · token · késés · ár. Amit nem tudunk,
  az „nincs adat", és a hiányzó tengelyeket a válasz MEGNEVEZI. Egy kérdésre **legfeljebb EGY**
  modellhívás, újrapróbálási lánc nincs.

---

## 8. AMI NEM FUTOTT — ÉS EZÉRT NEM IS ÁLLÍTJUK

- **NINCS élő AI-szolgáltató ebben a környezetben.** Mérve: `npm run kapcsolat:ai` → *NINCS
  CSATLAKOZÁS*, hiányzik a `VS_AI_PROVIDER` (és a kulcs). Ezért a **szolgáltatói út NEM FUTOTT**:
  `npm run proof:assistant-live` **2-es kilépési kóddal** mondja ki, és megnevezi az érintett
  elfogadási sort (R89 §8 — „valódi AI-integráció"). Ez **nem zöld és nem piros tartalom**: a mérés
  nem futott le. Ami ettől függetlenül bizonyított: a csatlakozási felület, a hibakezelés és a
  korlátok (befecskendezett `fetch`-fel, `verify:assistant`), valamint a modellhívás nélküli részek.
- **A francia és az `ar-x-proba` csomag NEM FORDÍTÁS**, hanem próba-tartalom a bővíthetőség
  mérésére. Nyelvi lektorálást nem állítunk.
- **A képernyőolvasós akadálymentesség nincs teljesen mérve** (a felolvasási sorrend és a
  fókusz-csapda nem). A billentyűs elérés és az Esc-viselkedés mérve van.
- **Nem zárul a core-core, és nem zárul a CMD/PR.** Nincs merge, telepítés, V2-módosítás, új üzleti
  modul, új előfizetés, szolgáltató-vásárlás.
- **A teljes söprés nem zöld ebben a környezetben**, és ez nem ettől a csomagtól van — lásd 10.

---

## 9. A TÍZ LELET, AMIT A SAJÁT MÉRÉSEM TALÁLT (KUKA-221…230)

| # | mi volt a hiba | miért nem látszott | gépi jel |
|---|---|---|---|
| **227** | **a kérdés EL SEM INDULT:** a súgó-panel írói útja kimaradt a nézet-bélyeg szabályából, ezért minden kérdés „elavult szerkesztő" miatt elakadt — és a lap egy MEG NEM TÖRTÉNT nézet-váltást állított | a HTTP-battériám a VÉGPONTOT hívta, nem a gombot | pozitív minta + böngésző-próba R89-07/09 |
| **228** | a panelen belüli bemutató-cél „eltűnt célnak" minősült, a bemutató ÉP képernyőn szakadt meg; és a modális panel mögött a buborék elérhetetlen volt | a lépés-célokat statikusan mértük (léteznek-e), a MEGJELENÉSÜK feltételét nem | `verify:tutor` TUT05 (6 állítás + 3 ellenpróba) + R89-06 |
| **229** | a képernyőolvasónak rejtett szöveg fizikai iránnyal bújt el → a tükrözött lapon 10 390 képpont széles lett a lap; a lenyíló menü a gombhoz tapadt → mobilon kicsúszott, tükrözve elérhetetlen lett | a képernyőn kívülre eső tartalom NEM okoz csúszást — a csúszás-mérés zöld maradt volna | tiltó + 2 pozitív minta + R89-08 (csúszás ÉS elérhetőség) |
| **230** | a késve érkező súgó-adat újrarajzolta a MÁR BEZÁRT panelt — a becsukott felület tartalma visszatért a lapra | láthatatlanul történt (a párbeszéd zárva volt), de a kitöltő és a képernyőolvasó megtalálta | pozitív minta + a próba a `help-close` DARABSZÁMÁT méri |
| **221** | a készlet-jelvény a MEGJELENÍTETT feliratot hasonlította — angolul/németül minden mennyiség „ismeretlen"-nek látszott volna | a fordítás bevezetése hozta ki; magyarul véletlenül helyes volt | 2 pozitív + 1 tiltó minta + `verify:i18n` |
| **222** | a segéd nem kérdezte meg a FIÓKOT: a megvont tag még megkapta a fiókhoz kötött tudást | a többi kapu (belépés, szerep, csomag) rendben volt | `findings_r89` C) rekesz, élő HTTP-n |
| **223** | a kereső a kérdő szóra talált, a ragozott kulcsszóra nem — rossz találat és nulla találat egyszerre | a nulla találat „nincs ellenőrzött útmutató"-ként jelent meg, ami HAMIS volt | `verify:tutor` TUT08: 9 nevezett kérdés × 3 nyelv |
| **224** | az AI-szerződés a regiszterben élt, a kódban nem: a segéd a NEM LÉTEZŐ jelszó-változtatáshoz is adott gombot | a megnyitott oldal létezett, tehát nem volt jog-hiba — csak tervet tanított kész szolgáltatásként | 2 pozitív minta + TUT03 + `findings_r89` E) |
| **225** | a saját új őröm a SABLONBÓL születő felületi pontot hiánynak nézte (hamis piros) | a szó szerinti keresés nem ismerte a mért dolog előállítását | deklarált sablon-családok, MINDKÉT irányban mérve |
| **226** | a próbapad végtelen művelet-türelme „időtúllépést" írt a valódi ok (elgépelt azonosító) helyére | a hibás azonosítóból lassúság lett; a `catch`-be tett kattintás még el is fedte | kimondott `actionTimeout` + tiltott `catch`-kattintás |

**Kimondva:** ezekre a hibákra a KÜLSŐ ellenőrző fél nem is juthatott volna el, mert a csomag most
készült — de az is kimondva, hogy **négy közülük (227 · 228 · 229 · 230) csak a VÉGIGKATTINTÁSON
bukott ki**, a szerződés-mérésen és a HTTP-mérésen nem. Ez a D-VS-497-es kapu haszna, számmal.

---

## 10. A MÉRÉSEK — MI FUTOTT, MILYEN EREDMÉNNYEL

| mérés | eredmény | mit fed |
|---|---|---|
| `npm run verify:i18n` | **41/41 + 5 ellenpróba** | a jegyzék · a három nyelv teljessége · helyőrzők · elavult fordítás · kettős kulcs |
| `npm run verify:tutor` | **65/65 + 9 ellenpróba** | a tudás-regiszter alakja · a hatókör · a horgonyok · a bemutatók · a feltárók · a GYIK · a NEVEZETT kérdés-készlet 3 nyelven · a költség · a szerződések |
| `npm run verify:assistant` | **49/49 + 6 ellenpróba** | a jog-sorrend · a zárt művelet-lista · a korlátok · az álcázott utasítás · a szolgáltatói felület (befecskendezett `fetch`) · a mérés `null`-jai |
| `npm run verify:app-findings-r89` | **41/41** | a három új végpont ÉLŐ HTTP-n: jogosultság · fiók-kapu · nyelv · korlátok · a folytatások |
| `npx playwright test` | **59/59** (ebből 6 R89) | a teljes felület végigkattintva, a korábbi körökkel együtt |
| `npm run app:selfcheck` | **57/57** | a héj alap-viselkedése |
| `npm run verify:app-findings` · `-r77` · `-r79` | **73/73 · 34/34 · 49/49** | a korábbi körök leletei nem csúsztak vissza |
| `npm run verify:kuka` | **414/414** | 221 tanulság · 10 új · az archívum és az index épsége |
| `npm run verify:decision-numbers` | **4/4** | D-VS-3075 a 3000-es blokkban |
| `npm run kapcsolat:ai` | **NINCS CSATLAKOZÁS** (0 = a mérés lefutott) | a szolgáltatói állapot, NEVEKKEL |
| `npm run proof:assistant-live` | **NEM FUTOTT (2)** | az élő modell-út — nevezett hiánnyal |

---

## 11. A TELJES SÖPRÉS — ŐSZINTÉN

A csomag verifierjei zöldek (fent). A **teljes** `npm run verify:sweep` ebben a konténerben **NEM
zöld**, és ez a mérés szerint **nem ettől a csomagtól van**: ugyanez állt az ÉRINTETLEN kiinduló
commiten is.

1. **`verify:capability-witness` — PIROS.** Két rögzítés elavult: a V2 repó
   `tools/chatops-board/config/matrix-capabilities.json` fájljában kellene átállítani a
   `v3-ui-slice` és a `v3-user-capability` tanúját. **Ezt ez a csomag SZÁNDÉKOSAN nem végzi el: a
   parancs kizárja a V2 módosítását.** A teendő tehát NEVESÍTVE áll, nem elhallgatva.
2. **`verify:v3ref` — a mutációs battéria NEM FÉR a saját egység-költségvetésébe** ezen a gépen (a
   72 egységre osztott lánc a 12 000 ms-os korlát fölé ment). Ez **hiányos MÉRÉS**, nem piros
   tartalom — a magreferencia egyetlen fájlja sem változott ebben a csomagban.
3. **`verify:external-checks` — NEM FEJEZŐDÖTT BE** a söprés 900 s-os türelmén belül.

**Amit ez NEM jelent:** hogy a három lánc elbukott. És amit szándékosan NEM tettem meg: a tracked
bizonyíték-fájlokat egy félbemaradt futás felülírta, ezt **visszaállítottam** — a részleges futás
nem írhatja felül a teljes mérés lapját (KUKA-206).

---

## 12. AZ ÁTADÁSI KAPU — INNENTŐL MINDEN ÚJ KÉPESSÉGRE

Egy új funkció (és minden későbbi Mini modul) akkor **kész**, ha:

1. a **tudás-regiszterben** áll: állapot · képernyő · művelet · jogosultsági hivatkozás · MINDEN
   kimenet-fajta · AI-szerződés · bizonyíték;
2. a **súgója és a gyakori kérdése** a három termék-nyelven megvan (a hiány nevezett hiány, nem
   tartalék);
3. az **oldaltérkép** látja, és az elutasítás OKÁT kimondja;
4. a **bemutatója végigvihető** — a panelen belüli céljai deklarálják a feltárójukat;
5. a **böngésző-próba végigkattintja**.

A gyökér-fájlban (`CLAUDE.md`) ebből csak a **kötelem és a mutató** áll — a részlet itt, ezen a
lapon (R65 rendje: a belépő lap rövid marad).

---

## 13. FÁJLOK

**Új:** `v3app/public/i18n/` (jegyzék · feloldó · 5 csomag) · `v3app/knowledge/features.mjs` ·
`v3app/public/help.mjs` · `tour.mjs` · `chat.mjs` · `v3app/assistant/` (policy · provider · meter) ·
`tools/vs_verify_i18n.mjs` · `tools/vs_verify_tutor.mjs` · `tools/vs_verify_assistant.mjs` ·
`tools/v3_ai_kapcsolat_allapot.mjs` · `tools/v3_assistant_live_proof.mjs` ·
`tools/v3_r89_bemutato.mjs` · `v3app/findings_r89.mjs` · `tests/e2e/v3app-r89-tutor.spec.mjs` ·
`docs/70_PLANNING/V3_R89_ELFOGADAS.json` (+ ez a lap).

**Módosult:** `v3app/public/texts.mjs` (a csomagok belépője) · `app.js` · `index.html` · `style.css` ·
`demoData.mjs` · `contextBinding.mjs` · `v3app/server.mjs` · `httpSchema.mjs` ·
`contracts/retiredPatternRegistry.js` · `contracts/guardHome.js` · `docs/KUKA_ARCHIVUM.md` ·
`DECISION_LOG.md` · `CLAUDE.md` · `package.json` · `playwright.config.mjs` ·
`tests/e2e/v3app-r85.spec.mjs` (az R87-es szöveg-zárás).

**A magreferencia (`v3ref/`) egyetlen fájlja sem változott.**

---

## 14. A FOGYASZTÁS — EGY SOR, MÉRVE (nem érzés)

`npm run meres:fogyasztas -- --session auto --from 2026-09-26T05:30:00Z --quick` →
**317 hívás · fő-szál kontextus medián 307 996 · max 783 764 · ügynök-bemenet 0 (0 ügynök) ·
cache-olvasás 119 936 374 · lefedettség: teljes.**

**A kísérleti jelzőt ÁTLÉPTE** (medián 307 996 > 200 000), ezért kimondom az okát és a teendőt:
a parancs egyetlen munkamenetet írt elő (párhuzamos végrehajtó és rutin-kereső ügynök TILOS volt),
és egy csomagban készült a tudás-regiszter, a szótár-átállás, négy új rajzoló, három segéd-modul,
három végpont, négy gépi őr és egy böngésző-csomag. A medián növekedésének nagy részét a **saját
korábbi kimenetem** adja (a nagy fájlok írása és a mérés-kimenetek — a mért összefüggés az R73-ból).
**A teendő nem az operátoron áll:** a következő hasonló méretű kérést KÉT munkacsomagra kell bontani
(1. tudás-regiszter + nyelvek, 2. segéd + bemutató), mert a jelző ezt méri, és ez a csomag ezt
átlépte. **Ügynök nem indult**, tehát az ügynök-bemeneti jelző (40 M) nem is jött szóba.
