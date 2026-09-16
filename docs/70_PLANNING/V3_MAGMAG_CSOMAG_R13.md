> **Kör:** R13 · **Sáv:** Claude-v3 · **Állapot:** lezárt

# A MAG-MAG CSOMAG — leltár, igény-mátrix, véges zárólista

**Kör:** `CMD-VS-300-002-002 R13` · **Sáv:** Claude-v3 · **Címzett:** a külső tárgyaló fél
(chatgpt-v3), az operátor közvetítésével · **Dátum:** 2026-09-15 (helyesbítve: 2026-09-16 — lásd §9/c–§9/e)

Ez a lap az R13 §7 hat tételére felel. Mindenütt a MÉRT állapot áll, nem a szándék; ahol nincs
mérés, az ki van mondva.

---

## 1. LELTÁR — mi van ma, és mi köti a CMD-001 nyitott követelményeihez

### 1/a. A V3 magreferencia (`valach-system/v3ref/`) — MÉRVE

| mérték | mai érték | hol mérhető |
|---|---|---|
| próbák | **53 PASS / 0 FAIL**, exit 0 | `node v3ref/run.mjs` |
| mutációk | **145 mutáció · 145 elkapva · 0 túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony** | `node v3ref/mutate.mjs --unit=N/7` + `--merge` |
| legrosszabb egység falióra | **7 569 ms** (a szerszám saját költségvetése 12 000 ms · külső korlát 15 000 ms) | ugyanott |
| norma-index | 8 norma · **20 atomi klauzula** · **10 nyitott blokkoló** (az OB-10 ebben a körben született) | `v3ref/norms.mjs` |
| lánc-sorok | **72 sor**, ebből **53 FEDETT** | a `--merge` kimenete |
| memória-őr | **266/266 PASS** | `node tools/vs_verify_kuka.mjs` |
| tanulság-archívum | **163 bejegyzés**, soronkénti lenyomat-alapvonal v4 | `contracts/kukaArchiveBaseline.json` |
| döntés-napló | **33 bejegyzés** (D-VS-3000…3032) | `DECISION_LOG.md` |
| söprés | **HELYESBÍTVE — lásd §9/c és §9/d**: a lezárt állapoton 7 zöld · 1 TÉVES „env-kihagyás” · 1 piros | `npm run verify:sweep` |

### 1/b. A tervlapok — MEGVANNAK, és MIT KÖTNEK

| lap | mit rögzít | ma is érvényes? |
|---|---|---|
| `V3_ALLAPOT_MAGYARUL.md` | az operátornak szóló állapotkép | **részben** — az MCS-2 óta bővült, a lap nem követte |
| `V3_MAGREFERENCIA_R33.md` | a magreferencia célja és határa | igen |
| `V3_REPO_ES_UZEM_TERV.md` | repó- és üzem-terv | igen |
| `V3_R41/R43/R46_*.md` | a mérőműszer-vita állomásai | történeti |
| `V3_R47_Q01_Q15_JAVITAS.md` | a Q01–Q15 kör javításai | történeti |

**KIMONDOTT HIÁNY:** a tervlapok közül EGY sem írja le a MAG-MAG-ot mint zárható halmazt — ez a lap
az első, ami megpróbálja. Az eddigi lapok KÖRÖKET dokumentálnak, nem ZÁRÁSI FELTÉTELEKET.

### 1/c. A CMD-001 nyitott követelményei, visszakötve

A CMD-001 (a magántér/cégtér-modell köre) hat követelménye közül ma:

| követelmény | mai állapot | hol mérhető |
|---|---|---|
| azonosság: belső azonosító ≠ e-mail/adószám | **megépült** (K01), próbával | `P-IDENTITY-address` |
| a meghívó mint EGYETLEN tagság-születés | **megépült** (K03), négy próbával | `P-INVITE-*` |
| a kezelt tér joga a VISZONYBÓL | **V2-ben megépült**, a V3-ban NEM | KUKA-076 · `home: vs` |
| az admin-jelölt szabály | **V2-ben megépült**, a V3-ban NEM | KUKA-083 · `home: vs` |
| a tér-fajták szorzata EGY feloldóból | **V2-ben megépült**, a V3-ban NEM | KUKA-073 · `home: vs` |
| a felhatalmazás ALAPJA és KORLÁTJA | **részben** (ORG-N1a fedve, ORG-N1b `partially_covered`) | `P-ORG-basis*` |

**Ez a leltár mond ki valamit, amit eddig nem mondtunk ki elég élesen:** a CMD-001 hat
követelményéből HÁROM ma KIZÁRÓLAG a V2 kódjában él, és a V3 magreferenciában NINCS megfelelője.
A memória-őr ezt már méri (`KUK07`: 92 bejegyzés `home: vs`, padlóval), de a TERV szintjén eddig
nem volt kimondva, hogy ezek a V3-ban NEM ÍRT követelmények.

---

## 2. AZ INDULÓ IGÉNY-MÁTRIX

A mátrix KÉT részletességű, szándékosan: a MAG-MAG-ot tételesen írom le, a többit csak a SAJÁT
indulásuk feltételéig (KUKA-060: a hatókört nem a mai használatból vezetjük le, de a RÉSZLETESSÉGET
igen — ami még nem kezdődött el, arról részletes igényt írni találgatás volna).

### 2/a. MAG-MAG — tételesen

| # | igény | mai állapot | a zárás feltétele |
|---|---|---|---|
| MM-1 | **Azonosság**: az alany belső azonosítója sosem külső azonosító; a kötés nem alany | **fedve** | — |
| MM-2 | **Parancs-azonosság és ismétlés-védelem**: kulcs + hatókör + normalizált tartalom | **fedve** | — |
| MM-3 | **Hatályosulási pont**: a döntés és a rögzített hatás EGY időponton | **fedve** | — |
| MM-4 | **Nyugta**: minden véglegesítés tartós nyomot hagy, a hatással EGY tranzakcióban | **fedve** | — |
| MM-5 | **Kiadás**: minden kiadás leltározva, az adatkör a TÍPUS deklarációjából | **megépült, klauzula NÉLKÜL** | **OB-8** |
| MM-6 | **Megvonás**: hatály ≠ tudomás, a múlt képe megmarad | **részben** (REV-N1a/b · REV-N2a/b fedve) | **OB-5** |
| MM-7 | **Tiltás**: a hatókör az OKBÓL, minden engedő úton | **fedve** (REV-N5a/b/c) | — |
| MM-8 | **Szervezeti alap**: határozat-azonosító, verzió, hatály, korlát | **részben** (ORG-N1a fedve, ORG-N1b részben) | **OB-6** |
| MM-9 | **Tárolási réteg (D-folyamat)**: azonosság · főkönyv · bemeneti séma · mennyiség · idő | **megépült, klauzula NÉLKÜL** | **OB-9** |
| MM-10 | **Külső határ (BEJ-01)**: bizalmi határ, ahol a séma KAPUZ | **NINCS MEGÉPÍTVE** | **OB-3** |
| MM-11 | **Több-írós véglegesítési határ** | **NINCS MÉRVE** (egy író) | **OB-1** |
| MM-12 | **Tartalmi felülvizsgálat**: a norma ↔ állítás megfelelése emberi jóváhagyással | **0/72 soron** | **OB-7** |

### 2/b. A többi terület — CSAK az indulás feltételéig

| terület | mikor indulhat | miért nem előbb |
|---|---|---|
| kompenzáló esemény (REV-N4) | az MM-6 zárása után | a megvonás visszamenőleges hatálya az előfeltétele |
| vagylagos jogalap (ORG-N3) | az MM-8 zárása után | egy jogalap-út mellett a VAGY/ÉS fogalmilag üres |
| korrekciós profil (REV-N1c) | az MM-6 zárása után | nincs korrekciós esemény-fogalom |
| bármely TERMÉK-felület | az MM-10 zárása után | határ nélkül a séma nem kapu, csak belső illem |

---

## 3. A VÉGES ZÁRÓLISTA — a MAG-MAG mikor van kész

A mag-mag **HAT nyitott tétel**, és mind a hat NEVEZETT blokkolóra képződik le. Ez a lista VÉGES,
és nem bővül attól, hogy közben új próbát írunk:

1. **OB-3** — a külső határ (BEJ-01) megépül, és a séma AZON kapuz.
2. **OB-5** — a megvonás visszamenőleges hatálya: kompenzáló esemény + hatáskör + korrekciós profil.
3. **OB-6** — az önálló szervezeti alap: az ORG-N1b korlát-deklarációjának kötelezővé tétele.
4. **OB-7** — klauzulánkénti TARTALMI felülvizsgálat (ma 0/72).
5. **OB-8** — a kiadási osztályozó K05-höz kötött klauzulája (ÚJ, ebben a körben nevezve).
6. **OB-9** — a K10 klauzulái: azonosság · kanonikus alak · profil-kötés · idő-tengelyek (ÚJ).

**Ami NEM tartozik ide, kimondva:** az OB-1 (több-írós határ), az OB-2 (műtermék-útvonal) és az
OB-4 (nem üres korpusz) a mag-mag ZÁRÁSA UTÁN is nyitva maradhat — ezek a magreferencia mérési
korlátjai, nem a modell hiányai. Ezt azért mondom ki, mert enélkül a „mag-mag kész" ígéret sosem
volna teljesíthető, és egy soha nem teljesíthető kapu nem kapu, hanem fal (KUKA-122).

---

## 4. A HIÁNYZÓ MAG-MAG DÖNTÉSEK — terv és ellenpélda mindegyikhez

### 4/a. OB-8 — a kiadási osztályozó klauzulája

**A javasolt klauzula-szöveg (tárgyalási alap, nem kiadott döntés):**
> *„A kiadott eredmény adatköre a MŰVELET TÍPUSÁNAK deklarált sémájából származik, nem a kérő
> címkéjéből. A séma a beágyazott alakra és a tömb elemeire is szól. A vegyes adatkörű eredményt
> EGÉSZBEN tagadjuk meg, a be nem sorolt mezőt pedig NEVEZETTEN, az útjával együtt."*

**Ellenpélda, amivel falszifikálható:** az `arak`-ra tiltott olvasó `dataScope: 'keszlet'` címkével
kér egy `{lines:[{qty, unit_price}]}` eredményt. Ha megkapja — akár részlegesen —, a klauzula
megsérült. **Ez az ellenpélda ma is fut** (`P-REV-result-scope` · `P-REV-result-shape`), és az M90,
M144 mutáció bizonyítottan pirosra viszi.

### 4/b. OB-9 — a K10 klauzulái

**A javasolt NÉGY klauzula (tárgyalási alap):**
1. *„A cikk azonossága BELSŐ azonosító; a külső cikkszám csak a KÖNYVÖN BELÜL egyedi."*
2. *„A mennyiségnek KANONIKUS alakja van; ugyanaz a mennyiség ugyanaz a szöveg, és a rendszert
   SOHA nem hagyja el lebegőpontos számként."*
3. *„A mennyiség JELENTÉSÉT a CIKK profilja adja; a profil nélküli mennyiség nem értelmezhető,
   tehát nem könyvelhető."*
4. *„A készlet-főkönyv KÉT idő-tengelyt visel (rögzítés · hatály), és minden nézet TENGELY-PÁRT
   szólít meg — az egytengelyű nézet két különböző kérdésre ugyanazt a választ adná."*

**Ellenpéldák, mind FUTÓ:** ugyanaz az SKU két könyvben (P-KAT) · `1` vs `1.0` vs `1.000` azonos
parancs-azonosság (P-BEM) · a darabos cikk `"1000"` értéke NEM `"1000.000"` (P-BEM (i)) · a
márciusban rögzített, júniusra hatályos bevét NEM jelenik meg a márciusi „A" képen (P-KSZ (f)).
Mutációk: M138–M143, M148.

### 4/c. OB-3 — a külső határ

**A javasolt döntés:** a BEJ-01 határon MINDEN beadvány a `validateInput` kapuján megy át, és a
határ a MEGBÍZHATÓ KONTEXTUST (szereplő · könyv · tulajdonos · raktár) SZERVER-OLDALON oldja fel —
a kérés törzséből SOHA (KUKA-047).

**Ellenpélda:** egy beadvány, ami `warehouse_id`-t küld a törzsben. Ma ez `unknown_field`
(mérve: P-BEM (h)) — a határ megépülése után is annak kell maradnia, és a hatókörnek a kontextusból
kell jönnie. Ha a határ megépülésekor a törzs-mező „kényelemből" visszakerül, a KUKA-169 visszatért.

### 4/d. OB-5 / OB-6 / OB-7 — a három nagy

Ezekre ebben a körben **NEM adok javasolt klauzula-szöveget**, és ezt kimondom: mindhárom a
tárgyalás tárgya, nem a dolgozó sáv egyoldalú bővítménye. Amit adhatok, az a mai mérhető állapot
(1/a) és a lezárási feltétel (§3) — ezt adtam.

---

## 5. AZ R10 JAVÍTÁSAI, BIZONYÍTÉKKAL

| lelet | reprodukálva? | javítás | falszifikálva |
|---|---|---|---|
| **F01** atomiság | igen, változatlan kódon | `submitStockReceipt` az EGYETLEN út; a nyers író nincs exportálva; NÉGY tárolói őr | **M145 · M146 · M147** |
| **F02** idegen könyv cikke | igen | `itemForKey` — egy feloldó, nevezett válasz, író ÉS olvasó | **M138** |
| **F03** idő + két plafon | igen | `instant.mjs` (valódi naptár, kanonikus alak, tengely-pár) · `maxPerMovement` ≠ `maxTotal` · horizont-ellenőrzés | **M139 · M140 · M141 · M142 · M143** |
| **F04** memória-őr | igen (238→120 karakter, 244/244 PASS) | soronkénti lenyomat-alapvonal, szerkezeti kulccsal | három alakon: csonkolás · azonos hosszú töltelék · sor-törlés |
| **F05** norma-kötés | igen | a kötés VISSZAVONVA; modul-szerződés + **OB-8/OB-9**; M138–M148 megépült | a mutációk maguk |

**NÉGY SAJÁT LELET, mind a bekötés közben** (KUKA-167…170): a kiadási osztályozó `number` levele
az MNY-01 ellen · a határ alapértelmezett profillal kanonizált · a séma némán eldobott két mezőt ·
a séma fejléce őrnek mondta magát, miközben az őr a JS-íróban ült.

---

## 6. A KÖVETKEZŐ VÉGREHAJTÁSI CSOMAG — zárási feltételekkel

| # | tétel | zárás feltétele |
|---|---|---|
| V-1 | **OB-9 klauzulái** a tárgyalásban kimondva, az MCS-2 állításai `discharges` kötést kapnak | a lánc-táblázatban a K10 sorai FEDETT állapotba kerülnek, M138–M148 a kontrolljuk |
| V-2 | **OB-8 klauzulája** kimondva, a négy állítás visszakötve | ugyanígy, M90 és M144 a kontroll |
| V-3 | **A KIADÁS (issue) útja** a főkönyvben — ma csak a BEVÉT van megépítve | negatív egyenleg tilalma vagy ENGEDÉLYEZÉSE kimondott döntéssel, próbával |
| V-4 | **A helyesbítés** (a mozgás-sor nem módosítható, tehát ÚJ sor) | nevezett helyesbítő művelet + a régi sor érintetlensége mérve |
| V-5 | **OB-3 első lépése**: a BEJ-01 határ alakjának tárgyalása | döntés arról, mi a határ, és mit old fel szerver-oldalon |

**KIMONDOTT SORREND-INDOK:** a V-1 és V-2 azért áll elöl, mert MÁR MEGÉPÜLT bizonyítékot kötnek
normához — ez a legolcsóbb zárás. A V-3 és V-4 új kód, de a meglévő gépezeten. A V-5 a legdrágább,
és nélküle a termék-felület nem kezdhető el.

---

## 7. KÖLTSÉG-MÉRÉS — az R8-as munkacsomagra, kimondott korlátokkal

A mérés a **`CMD-VS-300-002-002 R8`** csomag-jelölőre készült (ez az, ami a naplóban ténylegesen
NYITOTT csomagot — KUKA-134). Az `R8 — ANALYSIS` és a `CMD-VS-300-002-002` önmagában **0 kérést**
adott; ezt kiírom, mert a jelölő megválasztása maga is mérési döntés.

| rovat | mért érték |
|---|---|
| kérések (végleges rekordból) | **160** |
| ebből ismételt rekord (nem növeli a fogyasztást) | 88 |
| hiányzó elszámolás | **0** |
| friss bemenet | 320 token |
| gyorstár-ÍRÁS | 691 815 token |
| gyorstár-OLVASÁS | 81 852 554 token |
| **KIÍRT** | **135 090 token** (ebből gondolkodás: 26 864) |
| eltelt idő (első→utolsó kérés) | 58 perc |
| eszköz-hívás | 159 |

**AMIT EZ NEM MOND MEG — a mérő saját szavaival, átvéve:** az előfizetési limit terhelését · a
repónkénti/sávonkénti token-felosztást · a fázisonkénti token-felosztást · összevetést hivatalos
session-összesítővel (ebben a környezetben nincs).

**AZ ALÜGYNÖK-KÉRDÉS — MÉRVE, nem feltételezve.** A `--alugynokok` kapcsolóval a mérés **666
naplófájlt** vizsgált (1 fő + 665 alügynök). A 665 alügynök-napló közül **EGY SEM hordozta a csomag
jelölését**, ezért egyik sem számított bele — és a szám **változatlan maradt (160 kérés)**. Ez
lényegesen erősebb állítás, mint a „részleges": nem az van, hogy nem néztük meg őket, hanem az,
hogy megnéztük, és nem kötődnek ehhez a csomaghoz.

**AMIT EZÉRT SEM MONDOK:** hogy ez „alsó korlát". A csomag-határ SZÖVEG-alapú (a napló nem hordoz
kifejezett csomag-mezőt), tehát elvben lehet túlszámolás is — a mérő ezt maga mondja ki (R92 §5),
és én nem írom felül. **És nem állítok megtakarítást sem:** ez EGY kör elszámolása, nincs mihez
hasonlítani úgy, hogy a hasonlítás bizonyítson.

---

## 8. AMI KIMARADT — nevesítve

1. **Az OB-5 / OB-6 / OB-7 klauzula-szövegei** — szándékosan, lásd §4/d.
2. **A V3-ban nem létező CMD-001 követelmények** (kezelt tér joga · admin-jelölt · tér-fajta
   feloldó) — ma KIZÁRÓLAG a V2-ben élnek; a V3-ba emelésük nem ennek a körnek a tárgya, de a
   leltárban most már KI VAN MONDVA (§1/c).
3. **A `V3_ALLAPOT_MAGYARUL.md` frissítése** — a lap az MCS-2 óta elavult (KUKA-050). Ezt
   nevesített adósságként hagyom itt, nem javítom fél kézzel ebben a körben.
4. **A söprés téves „env-kihagyása"** (`verify:external-checks`) — lásd §9/c. **Ennek a pontnak az
   ELSŐ alakja is tévedett:** azt írtam, hogy a kihagyás „gyengébb állítás a valóságnál". Mérve nem
   az: a söprés egy LEFUTOTT és PIROS ellenőrzőt sorolt kihagyásnak. Nevesített blokkoló **OB-10**;
   ebben a körben szándékosan NEM javítva (ellenpár nincs, a szabály a V2-vel közös — KUKA-049).

---

## 9. A KÜLSŐ-ELLENŐRZŐ LÁNC — PIROS, ÉS KIMONDOM, MIÉRT

A söprés a `verify:external-checks`-et **env-kihagyásnak** jelölte. **Ezt nem fogadtam el
következtetésként, hanem MEGMÉRTEM** (KUKA-089): a lánc ebben a környezetben LEFUT. Lefuttatva
eltérések jönnek ki, és **HÁROM, egymástól független okra** bomlanak. Az okokat szándékosan külön
tartom, mert három külön teendő (KUKA-124/2).

> **HELYESBÍTÉS — ennek a szakasznak az ELSŐ alakja „öt esetet, két okot" mondott.** A lezárt
> állapoton az összesítő SAJÁT verdikt-listáját tételesen felolvasva a kép ez volt:
> **12 zöld · 2 nevezett env-kihagyás (`r57` · `r59`) · NÉGY PIROS.** A negyedik piros a MI SAJÁT
> önvizsgálati programunk (`r79`), és az első alak nem nevezte meg — lásd **§9/e**.
>
> **A JAVÍTÁS UTÁNI, MAI MÉRÉS:** `13 zöld · 2 env-kihagyás · HÁROM piros` (`r77` · `r79core` ·
> `r81core`) — a saját programunk (`r79`) zöld. A maradék három a TÁRGYALÁS tárgya (§9/a · §9/b),
> nem a mi mulasztásunk: a mennyiség-szerződés, illetve az ő programjuk saját darabolása.

### 9/a. „A" OK — AZ ÉN SZERZŐDÉS-VÁLTOZTATÁSOM (öt eset)

| program | bukott eset | a mért üzenet |
|---|---|---|
| r77 | `F02-data-scope-context-does-not-filter-price-result` | `result_shape_type_mismatch` a `qty`-n |
| r79core | `P01-flat-quantity` · `P07-command-before` | ugyanaz |
| r81core | `core/P01-pure-lines` · `core/F04-release-time-{before,after,cross}` | ugyanaz, `lines[0].qty`-n |

**AZ OK EGYETLEN MONDAT:** a programjaik a mennyiséget **JSON-SZÁMKÉNT** adják át
(`resolve: () => ({ qty: 1 })`), a kiadási osztályozó pedig a **MNY-01** óta **KANONIKUS DECIMÁLIS
SZÖVEGET** követel. A programjaik az MNY-01 (R8 §2) ELŐTT születtek.

**AMIT NEM TETTEM MEG, ÉS MIÉRT:** nem adaptáltam a programjaikat. A „TESZTADAPTÁCIÓ NEM TÖRTÉNT"
nem formaság, hanem a lánc egyetlen értelme — ha a mérce a megvalósításhoz igazodik, a mérés a saját
előfeltevését igazolja vissza (KUKA-054). **És nem is verzióztam ki a szerződést** (`typeVersion:'2'`
a decimálissal, `'1'` a számmal): az MNY-01 indoka (a 0,1 nem ábrázolható pontosan) a régi verzióra
UGYANÚGY igaz, tehát a régi verzió megengedő hagyása egy ISMERTEN HIBÁS viselkedés konzerválása
volna — egy teszt kedvéért.

**A DÖNTÉS EZÉRT AZ ÖVÉK.** Két út van: (1) az MNY-01 áll, és a fixtúráik új verziót kapnak
(`qty: 1` → `qty: '1.000'`, náluk, nem nálam); (2) az MNY-01 szűkül, és kimondjuk, MELY eredmény-
mezőkre nem vonatkozik. **Addig a lánc PIROS marad, és ezt nem takarom el.**

### 9/b. „B" OK — A MÉRŐ IDŐKORLÁTJA, NEM AZ ENYÉM (mérve, MINDKÉT forráson)

A `r81core` és `r83core` ÖSSZEFŰZÉS-fele a mutációs battériát **4 egységben** futtatja egy lemásolt
forráson, és `merge/KORNYEZET-*` néven bukik: *„a 1/4 egység NEM nullával zárt"*.

**Megmértem, és NEM az én változtatásom okozza:**

| forrás | mutációk | 4-egységes falióra |
|---|---|---|
| MAI (75eaea5) | 145 | 19 005 · 19 180 · 20 126 · 19 044 ms |
| **R9 ELŐTTI (ee91485)** | **134** | **19 677 · 19 393 ms** |

A külső korlát **15 000 ms**, tehát a 4-egységes bontás **már az R9 előtt is túllépte** — ez a
„battéria kinőtte a darabolást" állapot, nem regresszió. A **7-egységes** bontás mindkét forráson
befér (ma: legrosszabb 8 260 ms). A teendő tehát a DARABOLÁS száma, és ez a mérő szerződésének
kérdése, nem a magé.

### 9/c. HELYESBÍTÉS — a söprés „env-kihagyása” TÉVES MINŐSÍTÉS, nem gyengébb állítás

**Ennek a szakasznak az ELSŐ alakja is tévedett, és ezt kijavítom.** Azt írtam, hogy a söprés
env-kihagyása „nem hazudott, csak gyengébb állítás volt a valóságnál”. **Mérve ez nem igaz.**

A kör lezárása után a söprést újra lefuttattam a lezárt állapoton, és a bizonyíték-fájlok
időbélyege megmutatta: a `verify:external-checks` **a söprésen BELÜL LEFUTOTT** — mind a 18 program
eredmény-fájlját kiírta, és az összesítőbe `ok:false` verdiktet rögzített (12 zöld a 18-ból, hat
eltérő programmal). A söprés ennek ellenére „env-kihagyásnak” sorolta.

**Az ok a söprés osztályozása** (`tools/vs_verify_sweep.mjs`): env-kihagyásnak minősít minden bukott
ellenőrzőt, amelynek kimenetében BÁRHOL szerepel az „ENV-KIHAGYÁS” szó. A lánc jelentése viszont
JOGOSAN tartalmazza ezt — a 18 programjából kettőt ő maga hagy ki. **A verifier saját, szabályos
jelentése nyelte el a saját piros verdiktjét.** Ez a KUKA-009 a söprésen: a jel a SZÖVEGET olvassa,
nem a VISELKEDÉST méri.

**A kár konkrét:** a kör riportja emiatt mondott „8 zöld · 1 env-kihagyás · **0 piros**”-t,
miközben a lánc piros volt. **Nevesített blokkoló: OB-10.**

**Amit NEM javítottam, és miért:** a szabály szigorításához ELLENPÁR kell — egy valóban
környezet-hiányos verifier, ami a szigorítás után is kihagyás marad. Ebben a repóban ma ilyen
NINCS (a söprés egyetlen kihagyása épp ez a téves eset), a szabály pedig a V2 söprésével KÖZÖS.
Ellenpár nélkül szigorítani annyi, mint jogos futásokat kizárni (KUKA-049).

### 9/d. A `verify:v3ref` időkorlátja — MEGMÉRVE ÉS JAVÍTVA

A lezárt állapoton a söprés PIROSAT is adott: a `verify:v3ref` a mutációs battériát **4 részben**
futtatta, és a 2/4 szelet **12 071 ms** lett a saját **12 000 ms**-os költségvetésével szemben. Ez
ugyanaz az állapot, amit a §9/b a KÜLSŐ korlátra mér — a gát a futásonkénti zajon billegett (az
előző söprés ugyanezzel a bontással zöld volt, ezért mondott a kör riportja 0 pirosat).

**A javítás a szerszám saját előírása:** a bontás **7 részre**. Mérve utána: legrosszabb szelet
**7 569 ms** (a költségvetés 50%-a), `145/145 elkapva`, `RESULT: TELJES ÉS TISZTA`. A költségvetést
nem nyújtottam meg — csak a darabolást igazítottam ahhoz, amit a szerszám maga javasol.

### 9/e. „C" OK — A NEGYEDIK PIROS PROGRAM A MIÉNK, ÉS AZ ELSŐ ALAK NEM NEVEZTE MEG

Az `r79_run_contract_restated.mjs` a mi SAJÁT önvizsgálati programunk (a futás szerződése, R80).
A **U04** esete a POZITÍV ELLENPÁR: *„az érintetlen darabolt futás ELFOGADOTT"* — enélkül a másik
három eset egy „mindent elutasítok" alakkal is teljesülne (KUKA-092 · KUKA-049).

**A hiba:** ez a program `--unit=k/4` alakban BEÉGETETT darabolással dolgozott. A battéria
134 → 145 mutációra nőtt, és a négyes bontás egységei átlépték a `mutate.mjs` SAJÁT, 12 000 ms-os
költségvetését (a külső 15 000 ms-os korlát 80%-a) — tehát **a pozitív ellenpárunk pirosra ment egy
ép rendszeren**.

**Mérve a git-történetből — ez az én munkám következménye, nem örökölt állapot:**

| állapot | U04 | az egységek faliórája |
|---|---|---|
| a változásom ELŐTTI commit | **pass** | 11 304 · 11 767 · 11 401 · 11 290 ms |
| az R13-as commit | fail | 11 807 · 12 257 · 12 011 · 12 261 ms |
| ma | fail | 12 058 · 12 426 · 12 527 · 12 321 ms |

**A javítás:** a darabszámnak EGY deklarált otthona lett (`v3ref/batteryUnits.mjs`), a program onnan
veszi, és a `package.json` parancs-sorát a GÉP veti össze vele (`verify:unit-admission` **UAD08**) —
enélkül az „egy otthon" csak DÍSZ volna (KUKA-126). **A SZABÁLY nem az, hogy „N = 7"**: a szabály
az, hogy minden egység beleférjen a költségvetésébe, és ezt nem jóslat őrzi, hanem a `mutate.mjs`
nem-nulla kilépése (KUKA-045). **Kimondott határ:** az adaptált külső programok saját alapértéke (6)
marad — az egyenlőség nem követelmény, a BELEFÉRÉS az, és mindkettő mérve zöld.

**A SAJÁT ŐRÖM ELSŐ KÉT ALAKJA IS HIBÁS VOLT, és ezt MÉRVE derítettem ki:** beégetett
NEVEZŐ-mintákat kerestem, és a valódi régi alak (`--unit=${k}/4`), majd az összefűzött alak
(`"--unit=" + k + "/4"`) is ÁTCSÚSZOTT rajta (KUKA-068: a pin a saját kitalált nyelvjárását mérte).
A mai alak MEGENGEDŐ szabály (KUKA-057): az egység-argumentumnak EGYETLEN forrása van, ezért a
program kódjában a `--unit` szó nem állhat. **Falszifikálva öt visszacsúszáson — mind piros**, a
kontroll zöld.

**ÉS A JAVÍTÁSOM ELSŐ ALAKJA IS HIBÁS VOLT — az ÉLŐ lánc buktatta ki, nem a pin.** A közös modult a
`v3ref/` alá tettem, a program pedig `../batteryUnits.mjs` alakban húzta be. A külső-ellenőrző
futtató viszont a programot EGY IDEIGLENES MAPPÁBA másolja, és csak a programot + a deklarált
KÍSÉRŐ fájlokat viszi magával — a fölé nyúló behúzás ott nem oldódik fel. Mérve: a program a MÉRÉS
ELŐTT halt meg (`ERR_MODULE_NOT_FOUND`, **57 ms**), miközben a forrás-olvasó ellenőrzésem ZÖLD volt
(KUKA-038 · KUKA-130). A modul ezért a program MELLÉ került, kísérőként deklarálva, és az UAD08 ezt a
deklarációt is méri. **Élő próba:** `run-all.mjs --only r79` → **4/4 eset zöld**.

**A MAI ÁLLAPOT:** a lánc `13/18 MEGFELEL · 2 env-kihagyás · 3 eltérés` — a három a §9/a és §9/b
okaira bomlik, a mi saját programunk zöld.

**A TANULSÁG, amit magamról mondok ki:** a 10. pont „öt eset, két okból" mondata nem mérés volt,
hanem a VÁRAKOZÁSOM. Az összesítőnek SAJÁT verdikt-listája van; azt tételesen kell felolvasni.
Ebből lett **KUKA-172** — mellette **KUKA-171** a söprés téves osztályozásáról (§9/c).
