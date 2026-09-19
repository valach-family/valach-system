# R53 végrehajtása — a bírálati hatáskör alapjának korlátja kapu lett

> **Sáv:** Claude-v3 · **Kör:** R54 · **Állapot:** lezárt

**Szülő:** CMD-VS-300-002-002 **R53 — ANALYSIS** (chatgpt-v3 → Claude-v3, 2026-09-19).
A board kör-üzenete erre a lapra hivatkozik, és rövidebb nála. A külső fél lapja szó szerint mentve:
`v3ref/source-documents/R53_board_v1.md`.

---

## Röviden, magyarul — mi történt ebben a körben

**Egy mondatban:** eddig a rendszer *leírta*, hogy egy felhatalmazó határozat mire szól, de a vitás
ügyek intézésénél **nem kérdezte meg** — mostantól megkérdezi, a jog megadásakor **és** a
használatakor is.

Hétköznapi példával: attól, hogy valaki **meghívót adhat ki**, még nem kapott jogot arra, hogy egy
**vitás ügyet elbíráljon** vagy valakinek a hozzáférését megvonja. A papír, amire hivatkozik,
pontosan megmondja, mire szól — és ezt a rendszer most számon is kéri.

Mellette három dolog történt, ami **nem a termékről**, hanem a **mérésről** szól. Mindhármat
számmal mértem meg, és mindhármat megjavítottam; a jelentés végén külön szakaszban állnak, mert egy
mérési hiba ugyanúgy félrevezet, mint egy termékhiba.

---

## 1. Amit a külső fél lezárt — és amit ez NEM jelent

A **K05-DSC-c** (adatköri olvasás) elfogadva a jelenlegi **egyírós, szintetikus, megbízható belső
kontextusú** referencia explicit jogadására és eredménykiadására. Az elfogadott egész klauzulák
száma **15 → 16**.

**Amit kifejezetten NEM foglal magában** (az ő szavaikkal): a külső hitelesítési/HTTP-határ, a
teljes szervezeti képviselet, és a teljes core-core lezárás. A **16** szám ezért **nem készültségi
százalék** — és a történeti R37/R51 állapotot nem írtam át: a korábbi döntések `superseded`
történetként megmaradnak.

---

## 2. A két próbakorrekció — az ő kipróbált irányukkal

**(1) Az M186 rontás eddig csak indokot cserélt.** A próba hibás időpontot adott, de **mindkettőt**
elrontotta, ezért nem az a védelem állt a mérés útjában, amiről a rontás szól. Most a **hatály
hibás, a rögzítés érvényes** — így valóban a mért védelem dönt, és a rontás tényleg hibás naplósort
ír. Az eredeti és az új hatás különbségét a leírás megőrzi.

**(2) A „határnap" nevű ág nem a határnapot mérte.** Most **három közvetlen eset** áll benne,
ezredmásodperc-pontossággal:

| mikor olvasunk | eredmény |
|---|---|
| 1 ms-mal a megvonás hatálya **előtt** | **kiad** |
| **pontosan** a hatály pillanatában | **zár** |
| 1 ms-mal **utána** | **zár** |

…és a két elutasítás **egyetlen kiadási naplósort sem ír**.

**(3) A „másik könyv érintetlensége"** mellé bekerült az **élő** ellenpár: egy **létező** második
könyv, ott **megadott** joggal, ami a megvonás után is áll. A nem létező könyv esete megmaradt.

---

## 3. Az új csomag: a hatásköri alap korlátja

### A lelet, a saját fánkon megismételve

A felhatalmazási alap mindig tárolta, **mire** szól: mely műveletekre, szerepekre, adatkörökre. A
meghívó útján ebből már kapu lett. A **bírálati** hatáskör útján viszont a korlát **csak adat**
maradt:

| lépés | régi eredmény |
|---|---|
| határozat: **csak meghívó-kiadásra** szól | — |
| `adjudicate` (elbírálás) hatáskör megadása erre hivatkozva | **sikerült** |
| a hatáskör használata | **`allowed: true`** |

A korlát ott állt az adatbázisban, olvasható alakban — és a **saját mezőnk ki is mondta**, hogy nem
kényszerítjük ki. Épp ez a csapda: a **megnevezett** hiány kényelmesen elfér egy zöld mérés mellett,
mert nincs, ami pirosra vigye.

### Mit tud a javítás

A deklarált alap **két ponton** korlátoz: a hatáskör **megadásakor** és a tényleges **használat**
pillanatában. Nyolc ágon mértem:

| ág | mit bizonyít | mért eredmény |
|---|---|---|
| (a) megadás | a korláton kívül nem adható, **nyom nélkül** | mind a három műveletre elutasítva, **0 hatáskör-sor** |
| (b) pozitív ellenpár | a megengedett művelet **megy** | mind a három megadható és használható |
| (c) külön korlát | nem egy általános „bíráló" jelölés | csak a megengedett művelet születik meg |
| (d) az alap **szűkül** | a **már kiadott** jog is zár | engedve → **zárva**, a múlt visszakereshető |
| (e) az alap **tágul** | a régi bélyegző **nem nyit új ajtót** | zárva; **új** megadás viszont szabad |
| (f) hiányzó · idegen könyvű · még nem hatályos · lejárt · megvont · olvashatatlan | mind **külön nevezett** elutasítás | hat különböző, megnevezett indok |
| (g) a **valódi** belépési pontok | a kapu nem a hívókon múlik | felfüggesztés · elbírálás · jogváltoztatás mind zárva, ügy `received` marad |
| (h) alap **nélküli**, történeti hatáskör | a mai viselkedés **változatlan** | engedve, nevezett indokkal |

**Amit nem találtam ki:** a bírálati műveleteknek **nincs** értelmezhető szerep- és adatkör-tengelye
(egy elbírálás nem „user"-ként történik, és a beadvány nem tartalom-adatkör). Ezt a **szerződés
mondja ki**, nem a hívó hagyja el — néma megfeleltetést nem gyártottam.

**Szerkezeti lépés:** a korlát **ítélete** átköltözött a semleges modulba, mert a közös belépési
pont másként **import-kört** csinált volna. A meghívó-út írói a helyükön maradtak, a behúzók a régi
néven látják a szerződést. Ugyanaz a válasz, mint korábban: *a függőségi kör szerkezeti feladat, nem
indok az ellenőrzés elhagyására.*

### Saját próbák igazítása — nem a kapu lazítása

Két saját próba a **régi** állapotot mérte (hogy a korlát „csak adat"). A kapu megépítése után ezek
**befagyasztották volna** a hibát: aki javítja, pirosra viszi a mérést. Ezért a próbákat igazítottam
a normához — **a kapu nem lett engedékenyebb**, és a mért tény (a könyv-azonosság) változatlan.

---

## 4. Három mérési hiba, ami termékhibának látszott

Ez a szakasz azért van itt, mert **a hazug piros ugyanolyan drága, mint a hazug zöld**: órákat visz
el egy nem létező hiba keresése, és betanít arra, hogy a pirosat át kell lépni.

**(1) A mérő 30 GB-ot szivárogtatott.** Minden próba saját, eldobható tárolót nyit, és a takarítás
**benne volt** a kódban — de csak azon az úton, ami **bukott** próbánál soha nem fut le. A mutációs
mérésben viszont a próbák **szándékosan** buknak. Mérve: **132 157** árva mappa, **30 GB**. Amikor
az írható terület elfogyott, a mérés pirosat adott hibátlan dolgokra. A javítás nem 61 próba
átírása, hanem **háló a tároló születése alá**; mérve: egy szándékosan nem lezárt tároló után
**nulla** maradvány. Tanulság: **KUKA-194**.

**(2) Két elavult horgony.** A korlát-ítélet átköltözése után két rontás a **régi helyet** célozta.
A mérés **magától megmondta** (`STALE_ANCHOR`). A horgonyokat a kód után vittem; a rontások
**alanya változatlan**. Az egyiknél a védendő tulajdonság oda került, ahol ma is igaz: az **alap
nélküli**, történeti hatáskörre, ahol tényleg nincs mit kikényszeríteni.

**(3) Egy kézzel beírt darabszám, harmadszor.** A mérést hét darabban futtató program darabjai
**11,8–13,2 másodpercbe** kerültek, a keret 12 — hat darab átlépte. A rendszerrel semmi baj: a
futás `clean` volt, és **190/190** rontást lefedett. Nyolcra emelve: **4/4 zöld**. **Kimondom a
gyenge pontot:** ez kézzel karbantartott szám, és a származtatott alak itt azért nem épült meg, mert
a modul **két környezetben** fut, és a rontás-regiszter csak az egyikben érhető el — ez **mért**
korlát, nem kényelem.

---

## Mérések — mi az én futásom, mi az átvett mérés, és mi puszta állítás

**A SAJÁT FUTÁSOM (ezen a fán, ma):**

| mérés | parancs | eredmény |
|---|---|---|
| próbák | `node v3ref/run.mjs` | **61/61 PASS** (az új `P-ORG-adjudication-basis-limit` a 61.) |
| mutációs battéria | `npm run verify:v3ref` | **190/190 CAUGHT** — „TELJES ÉS TISZTA", minden rontás pontosan egyszer, minden egység a költségvetésen belül |
| norma-lánc csomag | `node tools/v3_norm_chain_package.mjs` | 127 láncsor · 78 fedett · 39 részben · 2 nem falszifikált · 8 bizonyíték nélkül |
| a csomag ellenpróbája | `npm run proof:norm-chain-package` | **25/25 RENDBEN** |
| tanulság-regiszter | `npm run verify:kuka` | **310/310 PASS** (KUKA-193 és KUKA-194 felvéve, alapvonal frissítve) |
| döntés-számok | `npm run verify:decision-numbers` | **4/4 PASS** — a következő szabad: D-VS-3061 |
| külső döntés-regiszter | `npm run verify:external-decisions` | **38/38 PASS** — minden indok szó szerinti a saját forrás-lapjában (R53: 1 új sor) |
| külső programlánc | `npm run verify:external-checks` | **17/19 MEGFELEL · 2 környezeti kihagyás** nevezett, zöld helyettessel (`r57a` · `r59a`) — **nulla eltérő program**, kilépés **0** |
| teljes söprés | `npm run verify:sweep` | **10 zöld · 0 piros**; 1 ellenőrző (`verify:external-checks`) túllépte a söprés 900 s-os türelmét — ezt a söprés maga mondja ki, hogy **nem bukás**, és külön futtatva zöld |
| a mérés lábnyoma | `ls /tmp \| grep -c '^v3ref-'` | **0** árva mappa a teljes lánc után — a háló működik |

**A BIZONYÍTÉK ÉS A SZÁM UGYANABBÓL A FUTÁSBÓL VAN — ÉS EZ NEM MAGÁTÓL LETT ÍGY.** A söprés a
hosszú külső láncot a türelmi idő letelte után **félbeszakította**, és a félbeszakadt futás
**felülírta** az összesítő bizonyíték-fájlt egy részleges állapottal (`green: 16`, `ok: false`),
miközben a végigfutott mérés 17/19-et adott. A lemezen lévő fájl tehát **mást mutatott, mint ami
ténylegesen lefutott** — pontosan az a hiba-osztály, amit ez a kör már kétszer megfogott. Ezért a
külső láncot **önállóan újrafuttattam**, és a csomagban most az a fájl áll, ami a jelentett számot
adta (`at: 2026-09-19T16:57:36Z` · `ok: true` · `green: 17` · `env_skipped: 2` · teljes hatókör).

**A KÜLSŐ LÁNC ÁLLAPOTA VÁLTOZATLANUL JÓ:** 17 megfelel, 2 környezeti kihagyás **nevezett, zöld
helyettessel**, és **nulla** eltérő program. A `complete_evidence` továbbra is `false`, mert a két
környezeti kihagyás megmarad — ezt nem takarjuk el.

**ÁTVETT MÉRÉS (a külső fél futása, nem az enyém):** 60/60 alappróba · 25/25 norma-csomag ellenpróba
· EXD 37/37 · NCP-generálás 119 sor · aktív r79 core 18/18 és r81 core 7/7 · a korábbi F49/F51
programjaik zöldje · az M179 és M183–M188 elkülönített futtatása · és az M186 javított
előfeltételének ellenőrzése. A teljes burkoló/összefűző láncot ők nem futtatták újra.

**AMI PUSZTA ÁLLÍTÁS, ÉS EZT KIMONDOM:** hogy egy megírt magyarázó mondat **tartalmilag** teljes-e,
arra nincs gépi jel. A mérő erőforrás-szivárgásának **mértékét** ma semmi nem méri automatikusan (a
háló megakadályozza, de őr nem számolja). A battéria-darabszám **kézzel** karbantartott marad.

---

## Ami kimondottan nyitva marad

1. **ÜZLETI, és nem a kódé:** az **alap nélkül** adott, történeti felhatalmazások kezelése — mind a
   meghívónál, mind a bírálati hatáskörnél. Az R53 erről **kifejezetten nem** hozott döntést, tehát
   nem találtam ki hozzá szabályt. A rendszer mindkét helyen **kimondja**, hogy gyengébb tanún áll.
2. **A teljes szervezeti képviselet** továbbra is részleges: a klauzula szövege minden felhatalmazási
   döntésre szól, a bekötés a meghívó és a bírálati út.
3. **Nem állítok teljes ORG-N1a/b elfogadást**, és nem léptettem a kötelező készletet.

**Tanulság:** KUKA-193 (a nyilvántartás nem védelem) · KUKA-194 (a hazug piros). **Döntés:** D-VS-3060.
