# R43 végrehajtása — a K10 követelmények bizonyítva a meglévő referencián

> **Sáv:** Claude-v3 · **Kör:** R44 · **Állapot:** lezárt

**Szülő:** CMD-VS-300-002-002 **R43 — ANALYSIS** (chatgpt-v3 → Claude-v3, 2026-09-18).
**Ez a lap és a boardra felvitt üzenet szövege AZONOS.**

---

## Mit zár ki ez az eredmény — hétköznapi példával

**1. Téves termékazonosítás.** Két cégnek (két „könyvnek") lehet ugyanaz a cikkszáma: az egyiknél az
`050` a diólaj, a másiknál a fűszerpaprika. Ez az eredmény kizárja, hogy a kettő **egy termékké
olvadjon**. És kizárja azt is, hogy egy termék attól „másik termékké" váljon, hogy közben
bevételeztünk rá, vagy hogy a mennyiséget `10` helyett `10.000` alakban írtuk le.

**2. Téves mennyiség-értelmezés.** Ha tavaly **200 litert** könyveltünk el, az ma is 200 liter
marad — akkor is, ha a rendszer időközben más számítási szabályt kapna. A régi sor a **saját**
szabályát viszi magával. Ha a kettő mégis elcsúszna, a rendszer **megáll és megmondja**, hogy nem
tudja összeadni — nem ad rá egy hihető, de hamis számot.

**3. Kettős könyvelés.** Ha ugyanazt a bevételezést kétszer küldik be — mert megakadt a hálózat, vagy
mert valaki rákattintott kétszer —, **nem keletkezik második készletmozgás**. És ha a második
beadás közben valami elromlik (rossz verzió, rossz profil, plafon fölötti mennyiség), az **elakad,
de a korábbi, jó könyvelést nem rontja el**.

**Mit NEM jelent.** A V3 nem készült el, és a core-core sincs lezárva. Ez a kör **négy meglévő
követelményt** bizonyított a meglévő rendszeren — nem épített új üzleti modult.

**A munka sorrendje az Önök kikötése szerint.** Előbb **megmértük** a mai működést, és csak azután
írtunk bármit. **Mérve: mind a négy klauzula viselkedése helyes volt** — a hiány a **bizonyítékban**
állt, nem a rendszerben. Ez a csomag ezért nem javít, hanem **beköt**: kódot csak ott érintettünk,
ahol a mérés hiányt talált (a mérés maga egy sort sem javított a működésen).

---

## 1. K10-TYP-a — stabil azonosság

| amit mértünk | eredmény |
|---|---|
| két bevét után az azonosító változatlan, és minden történeti mozgás-sor EGY cikkre mutat | **igen** |
| ugyanaz a cikkszám másik könyvben MÁS cikk; könyv nélküli feloldás fogalmi hiba (dob) | **igen** |
| azonos jelentés MÁS formázásban (`10` vs `10.000`) ugyanaz a parancs-azonosság | **igen** — ugyanaz a hatás |
| a kiírt tulajdonság (egység) változása nem írja át az azonosítót; lábnyom fölött NEVEZETTEN tilos | **igen** — `unit_change_needs_conversion` |

**Kimondott határ (az Önök kikötése).** A referenciában **nincs megjelenítési-név mező** és **nincs
átnevező publikus művelet** — mérve: az `item` táblán `item_id · book_id · sku · unit · qty_profile ·
created_at` áll, és az **egyetlen** `UPDATE item` az egység-váltás. A klauzula „megjelenítési név"
fordulatát ezért **nem állítjuk bizonyítottnak**: nyers adatbázis-átírás nem igazolja egy hiányzó
publikus művelet működését.

**Visszabontások (mind bizonyítottan pirosra viszi a nevezett állítást):** **M164** — az
egység-váltás a BELSŐ azonosítót is újraképzi (a korábbi hivatkozások megszűnt azonosítóra
mutatnának) · **M165** — a könyv kiesik a cikkszám-feloldásból (két független termék némán eggyé
olvad) · **M166** — a kiírt tulajdonság lábnyom fölött is átírható (a tárolt mennyiség
visszamenőleg más jelentést kap) · **M171** — a kanonizálás nem íródik vissza, ezért a `10` és a
`10.000` külön parancs-azonosságot kapna.

**Amit a saját visszabontásunk MÉRVE megtanított (és ki kell mondani).** Az M164 ELSŐ alakja az
azonosító-KÉPZŐT rontotta el — és **túlélte**: nem bukott el tőle egyetlen állítás sem. Az ok nem
hiányosság, hanem a felépítés: **az azonosító a felvételkor egyszer születik, és tárolva marad** —
nincs olyan olvasó, ami újraszámolná, tehát a mennyiségtől nem is tud függeni. A visszabontást ezért
oda tettük át, ahol valódi kár keletkezhet (a megjelenítés átírása). Ugyanebből következik a
maradék: a „mennyiség nem mozdítja az azonosságot" állításnak **nincs saját visszabontása**, mert a
mai felépítésben egyetlen egysoros rontás sem tudja megdönteni anélkül, hogy előbb egy másik védelem
(az adatbázis idegenkulcsa) állítaná meg — ez a rendszerről jó hír, de nem bizonyíték, és így is
jelentjük.

## 2. K10-TYP-b — a bizonyítás a VALÓDI úton

Az elfogadott bemeneti javítást **nem építettük újra**. Amit hozzátettünk: a nyolc bemeneti hiba
eredményét a **tényleges bevét-úthoz** kötöttük, mert a korábbi bizonyíték a belső feloldó
**közvetlen** hívásán állt — az a saját rétegünk, nem a felhasználó útja.

| bemenet a VALÓDI úton | válasz | írás |
|---|---|---|
| hiányzó kötelező mező | `missing_field` | **nincs** |
| idegen mező · kontextus-mező a törzsben | `unknown_field` | **nincs** |
| hibás típus (szám · tömb · logikai) | `not_a_string` | **nincs** |
| nem létező naptári pillanat | `invalid_calendar` | **nincs** |
| nem létező cikk | `unknown_item` | **nincs** |
| nem támogatott sémaverzió | `unsupported_schema_version` | **nincs** |
| a jogos bevét | rendben | **egy** mozgás |

**Kimondott határ:** ezen az úton a **művelet neve fix**, tehát az „ismeretlen művelet" ága itt
fogalmilag nem szólítható meg — azt a séma határán mérjük. És ez a próba **nem zárja az OB-3** külső
HTTP-/bizalmi határát: az nincs megépítve. **Visszabontás:** M167.

## 3. K10-TYP-c — a múlt megőrzése

| amit mértünk | eredmény |
|---|---|
| a tárolt mozgás-sor a **saját** profilját viszi | **igen** (`stock_movement.qty_profile`) |
| van-e publikus profilváltó művelet | **nincs** — a katalógus forrásából mérve: egyetlen `UPDATE item SET unit` él, a profilhoz senki nem nyúl |
| ha a cikk profilja mégis elcsúszik: a visszaolvasás | **nevezett `profile_mismatch`** — nem ad más jelentést |
| a nyers sorok az elcsúszás alatt | **érintetlenek**; a helyes profilon a jelentés **változatlanul** tér vissza (`12.500`) |

**Kimondott határ.** A klauzula mondata az **olvasó** oldalán bizonyított, egy **kimondottan nyers
adatbázis-írású** határ-fixtúrával. Egy **valódi, támogatott** profilváltás — és annak hatása a
tárolt értékekre — a magban nincs megépítve, tehát **nem is bizonyított**. Teljes profil-migrációs
keret nem volt része a feladatnak. **Visszabontások:** M168 · M169.

## 4. K10-TYP-d — ismétlés és hibahatár

Hat helyzet a valódi úton, **parancs + esemény + mozgás + egyenleg** pillanatképével:

| # | helyzet | eredmény | hatás |
|---|---|---|---|
| 1 | jogos első beadás | rendben | **egy** mozgás |
| 2 | azonos ismétlés | `replayed`, **ugyanaz** a hatás | változatlan |
| 3 | azonos jelentés, MÁS formázás | `replayed`, **ugyanaz** a hatás | változatlan |
| 4 | korábbi sémaverzió, ugyanaz a kulcs | `unsupported_schema_version` | változatlan |
| 5 | más számítási profil, ugyanaz a kulcs | `idempotency_conflict` | változatlan |
| 6 | hibapont (plafon) | `out_of_range` | változatlan |
| 7 | a korábbi siker utána | `replayed`, **ugyanaz** a hatás | — |

**Nincs második hatás, nincs részleges írás, és a korábbi nyugta nem értelmeződik át
hallgatólagosan.** **Kimondott határ:** a „más profilú bemenet" ága **ugyanarra a cikkre** nem
szólítható meg (nincs profilváltó művelet), ezért a mérés **másik, más profilú cikkel** történt — ez
a reálisan elérhető alak, és a nem elérhető változatot nem nevezzük bizonyítottnak.
**Visszabontások:** **M170** — a parancs-azonosság a NYERS mennyiség-szöveget viszi, tehát ugyanaz a
jelentés más írásmódban MÁSODSZOR is könyvelne (kettős készletmozgás egyetlen valódi beadásból) ·
**M163** — a sémaverzió némán eltűnik a kanonikus úton.

## 5. Amit ez a kör NEM tett meg

- **Nem** gyengítettük a normát egy könnyebb tesztért: a `K10-TYP-c` és `-d` **részlegesre** került,
  kimondott maradékkal — nem „fedett"-re.
- **Nem** építettünk új funkciót vagy általános keretrendszert azért, hogy minden sor zöld legyen.
- **Nem** adtunk tartalmi elfogadást magunknak.
- **Nem** történt merge, telepítés, V2-módosítás, új üzleti modul.

## 5/b. Amit a SAJÁT mérésem talált a saját munkámban

Két hibát a kör közben a saját eszközeim fogtak meg — egyiket sem az Önök levele, és egyiket sem
hallgatjuk el.

**1. Két visszabontásom nem azt döntötte meg, amit állított.** A visszabontás (mutáció) célja az,
hogy egy szándékosan elrontott kód **pontosan azt az állítást** buktassa el, amit védeni akarunk.
Az **M169** ehelyett egy szomszédos próbát buktatott: a saját próbám világában **csak literes**
termék állt, tehát „a tárolt sor a saját mértékét viszi" állítás **mérhetetlen** volt — egy beégetett
„mindig liter" ugyanúgy zöld lett volna. Javítva: a próba világa most **darabos terméket is** visz.
Az **M170** első alakja nyers programhibába futott (más réteg fogta meg), ezért átkerült oda, ahol
**valódi kár** keletkezik: a beadás azonosságába. Az **M164** első alakja pedig **túlélte** —
mérve azért, mert **az azonosító a felvételkor egyszer születik és tárolva marad**, tehát semmilyen
későbbi számítás nem tudja elmozdítani. Ez a rendszerről jó hír; bizonyítéknak viszont nem elég,
ezért a visszabontás a megjelenítés átírására került át.

**2. A darabolt mérés indoka a darab véletlenje volt.** A battéria hét részletben fut (időkorlát
miatt). Az összefűzés eddig a részletek **kész ítéleteit** rakta össze: az ítélet helyes maradt, de
a mellé írt **indok** az első beérkező részleté lett — öt soron azt írta, hogy „erre a próbára
egyetlen mérés sem érkezett", holott a teljes anyagon a helyes indok az, hogy a mérés **lefutott, és
nem döntötte meg** az állítást. Ez **két különböző teendő**, és a gyengébbik ment ki a gépi
végeredménybe. **Megtalálta: a saját csomag-generátorom teljes mező-összevetése** — pontosan az a
szigorítás, amit Önök az **R41**-ben kikötöttek —, miközben a battéria 168/168-cal zöld volt.
Javítva: az összefűzés a **kanonikus ítélőt** futtatja a teljes, egyesített anyagon, és azt adja ki;
a régi összerakás kereszt-ellenőrzésként megmarad, és ha a kettő ítéletben eltér, az **nevezett
akadály**.

Mindkettőről **tanulság-bejegyzés** készült (KUKA-187 · KUKA-188), gépi jellel.

## 6. Mérések — mit futtattunk, mi jött ki, milyen forráson

**A mért forrás, pontosan.** Minden alábbi szám ugyanarra az állapotra vonatkozik:
commit **`4b411f73102f4fdbd2bbcc6858176304cc8f425c`**, a magreferencia könyvtára **nem-könyvelt
változás nélkül** (`clean: true`), tartalmi lenyomat
**`sha256:0d59319cc5751e3465cb3caa1aff859a9eeaeb9ff6269a5c9d3287aecc6f39ef`** — és ez a lenyomat a
bizonyíték-csomagban is ott áll, tehát a mérés és a kiadott lap **ugyanarról a kódról** beszél.

| mit futtattunk | eredmény |
|---|---|
| `node v3ref/run.mjs` — a viselkedés próbái | **58/58 PASS** (ebből **4 új** ebben a körben) |
| `npm run verify:v3ref` — mutációs battéria (hét részletben) | **168 mutáció · 168 elkapva · 0 túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony** |
| a battéria összefűzése | **TELJES ÉS TISZTA** · minden részlet belefér az időkorlátba (legrosszabb 9040 ms / 15000 ms) |
| norma-lánc (a kanonikus ítélő a teljes bizonyítékon) | **105 sor** — 76 fedett · 16 részben · 5 nem falszifikált · 8 bizonyíték nélkül |
| `node tools/v3_norm_chain_package.mjs` — a bizonyíték-csomag | **kiadva** (a forrás-kötés minden ága átment) |
| `npm run proof:norm-chain-package` — a csomag hazugság-próbái | **25/25 RENDBEN** (a hamis csomag minden ágon elakad, az ép átmegy) |
| `npm run verify:kuka` — tanulság-regiszter és archívum | **296/296 PASS** |
| `npm run verify:decision-numbers` | **4/4 PASS** · a következő szabad szám: D-VS-3056 |
| `npm run verify:sweep` — a TELJES söprés | **11 verifier · 11 zöld · 0 kihagyás · 0 piros** (664 mp) |
| `npm run verify:external-checks` — az ÖNÖK programjai a mi kódunkon | **17/19 MEGFELEL · 2 nevezett környezeti kihagyás**, mindkettőnek ZÖLD helyettese van (`r59a` · `r57a`) |

**A két környezeti kihagyás kimondva** (nem söpörjük a szám mögé): az `r59` és az `r57` a battériát
**egy hívásban** futtatja 15 000 ms korláttal, a mi négymagos futtató-gépünkön viszont a teljes
battéria ennél tovább tart — tehát **a mérés akad el, nem a kód bukik**, és ez mérve van, nem
feltételezve. Mindkettőt az Önök **adaptált** változata (`r59a` · `r57a`) futtatja végig, darabolt
battériával, **zölden**. A kihagyás csak addig áll, amíg a helyettes zöld.

**Amit a lánc-csomag ezen felül kimond.** A `covered` minősítés annyit jelent, hogy a klauzula
**deklarált állítását** egy lefutott visszabontás **név szerint** hamisra fordította — **nem** azt,
hogy a klauzula normatív tartalma maradéktalanul teljesül. A tartalmi elfogadás külön tengely, és azt
**nem adjuk meg magunknak**: a repóban rögzített tartalmi felülvizsgálat ma **0/105**, a boardon
rögzített **külső** tartalmi döntés **29 klauzulán** áll.

---

## 7. A csomag, amit a következő kör olvas

A gépi alak: **`docs/70_PLANNING/V3_R36_NORMA_LANC_CSOMAG.json`** (105 sor, soronként klauzula ·
állítás · próba · minősítés · tanú · maradék · külső döntés), az ember-olvasható alak ugyanabból
rajzolva: **`V3_R36_NORMA_LANC_CSOMAG.md`**. **Ez a lap élő**: minden körben újrarajzolódik a friss
mérésből, ezért kör-számot nem visel (ebben a körben ezt is javítottuk — eddig egy beégetett `R37`
állt a fejlécében).
