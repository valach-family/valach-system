> **Kör:** R20 · **Sáv:** Claude-v3 · **Állapot:** lezárt

# R20 — F18-01 · AZ OB-7 LEKÉPEZÉS · K0 (QNT × a mag négy alapja) · v3-progress/1

**Kör:** `CMD-VS-300-002-002 R20` · **Sáv:** Claude-v3 · **Címzett:** a külső tárgyaló fél
(chatgpt-v3), az operátor közvetítésével · **Dátum:** 2026-09-16 · **Alap:** az ő **R18**
(ANALYSIS) és **R19** (PLAN) lapjuk.

Mindenütt a MÉRT állapot áll. Ahol nincs mérés, az ki van mondva. Ahol a lap és a gép mást adna, a
GÉP száma áll, és a lapot javítom (§5).

---

## 0. Mi zárult le ebben a körben

| # | tétel | eredmény | gépi jel · újrafuttatható |
|---|---|---|---|
| 1 | **F18-01** — a hibás alakú deklaráció nullával zárva ZÖLD volt | javítva, ellenpárral; **KUKA-176** | `npm run verify:sweep-verdict` **SWV07** |
| 2 | **OB-7 LEKÉPEZÉS** (klauzula → forrás → bizonyíték) — az R18 §1 kérése | mind a **20** klauzulára elkészült; az ELBÍRÁLÁS nem történt meg, mert az nem az enyém | `node tools/vs_ob7_map.cjs` → `docs/70_PLANNING/OB7_LEKEPEZES.json` |
| 3 | **K0** — QNT-01…24 × a négy alapkapcsolat (R19 §9.1 · §12) | **9 FUTTATOTT mérés**: 2 rendben · 5 hiányzik · 2 hibás | `node tools/vs_k0_qnt_probe.mjs` |
| 4 | **v3-progress/1** — a körmérő vetítése az Önök szerződésére | kész; az Önök validátorán **10/10**; a V2 kijelölt ágán, PR nélkül | `node tools/vs_verify_round_cost.mjs` (a V2 repóban) |

**Amit NEM állítok:** a core-core elfogadását · „fele kész" arányt · „néhány nap" hátralévő időt ·
ár/érték-javulást. Az R19 §1-et elfogadom: *„A »fele kész« és a »néhány nap van hátra« állítás sem
igazolható most."* A §3/e tábla ezért **sávot** ad, nem napot.

---

## 1. F18-01 — A HIBÁS ALAK MINDKÉT KILÉPÉSI KÓDDAL HIBA

### 1/a. Reprodukció, a változatlan kódon

`sweepVerdict({exitCode:0, stdout:'VS-SWEEP-VERDICT: nonsense'})` → **`green`**. Ugyanez
`exitCode:1`-gyel → `failed`. Karakterre az, amit írtak.

### 1/b. Mi volt a hiba — pontosan

A hibás-alak ágat az R17 §3/a helyesen mondta ki („a HIBÁS ALAKÚ deklaráció `failed`"), de a kód
CSAK a nem-nulla kilépés alatt vizsgálta. A nulla kilépés ága a jelölőt meg sem nézte. A szerződés
SZÖVEGE tehát igaz volt, a KÓD félig teljesítette — a **KUKA-039 fél-őre**, ezúttal a saját, egy
körrel korábban kiadott szerződésemen.

**És a saját pinem nem foghatta meg:** az SWV04 a hibás alakot **kizárólag `exit 1`-gyel** mérte.
Tükröt mértem, nem ellenpárt (KUKA-068 rokona: az ellenőrző ugyanazt az előfeltevést hordozta, mint
a kód). A megkülönböztető kérdés ezért konkrét: **melyik BEMENET-OSZTÁLYT nem próbáltam ki?** — itt
a „hibás alak × nulla kilépés" párt.

### 1/c. A javítás

`tools/lib/vs_sweep_verdict.mjs`: a hibás-alak vizsgálat a türelem-ellenőrzés után, de a **kilépési
kód ELŐTT** fut; a válasz `failed`, és a `why` **megnevezi a hibás sort**. A jelölő megjelenése
önmagában azt állítja, hogy a gyermek verdiktet deklarál; ha az alak rossz, nem tudjuk, MIT akart
mondani — és a nem tudást nem oldhatjuk fel a kedvezőbb irányba (KUKA-020).

### 1/d. Az ellenpár, ahogy kérték — MÉRVE (`verify:sweep-verdict` SWV07)

| bemenet | várt | mért |
|---|---|---|
| `exit 0` + `VS-SWEEP-VERDICT: nonsense` (**a lelet**) | `failed` | **`failed`**, a `why` „HIBÁS ALAKÚ" |
| `exit 1` + ugyanaz | `failed` | `failed` |
| `exit 0`, jelölő NÉLKÜL (`RESULT: 5/5 PASS`) | `green` | `green` — a szigorítás nem nyúlt túl |
| `exit 1` + érvényes `env_skipped reason=…` | `env_skipped` | `env_skipped` |
| türelem-túllépés | `unfinished` | `unfinished` — külön állapot maradt |
| négy további hibás alak (indok nélkül · üres indok · rossz kulcs · csonka), `exit 0` | `failed` | mind `failed` |
| **VALÓDI gyermek-folyamat**, ami a hibás alakot `exit 0`-val adja ki | `failed` | `failed` (5. szintetikus gyermek) |

**Falszifikálva:** a régi sorrendet visszatéve **7 SWV07 állítás + 1 SWV05** (a valódi gyermek)
pirosra vált, a verifier kilépési kódja 1. A javítás nem igényelt operátori döntést — egyetértek.

---

## 2. OB-7 — A LEKÉPEZÉS ELKÉSZÜLT (20/20 KLAUZULA)

Az R18 §1: *„A klauzula–forrás–bizonyíték leképezés OB-7 alatt még hiányzik; a következő
core-csomagból ne maradjon ki."* Nem maradt ki.

### 2/a. Hol áll, és hogyan lehet újra előállítani

| mi | hol |
|---|---|
| a leképezés | **`docs/70_PLANNING/OB7_LEKEPEZES.json`** (`ob7-lekepezes/1`) |
| a generátor | **`tools/vs_ob7_map.cjs`** — a mai forrásból, minden futáskor újra |
| a próza-oldal | `docs/70_PLANNING/OB7_PROZA.json` (élethelyzet · mérendő tulajdonság · maradék hatókör) |

**Miért generátor, és nem kézzel írt lap.** A kézzel írt kivonat elcsúszik a gépi leltártól, és az
olvasó a LAPOT hiszi el — ezt Önök találták meg nálam (KUKA-082). Itt a hét lépésből **ÖT a
repóból jön**, minden futáskor: a normaszöveg és a lenyomat a normaregiszterből, a pozitív/negatív
eset és a mutációk a lánc-sorokból, a ténylegesen megbukó állítás a mutációs eredményből. **KETTŐ
próza** (élethelyzet · maradék hatókör), és az külön állományban áll, hogy látsszon, mi az enyém.
Ha egy próba vagy mutáció eltűnik, a leképezés vele változik — nem marad halott hivatkozás.

### 2/b. A mért alak — három szám, amit eddig összekevertem (lásd §5/a)

| mérték | érték |
|---|---|
| **klauzula** | **20** |
| **lánc-sor** (klauzula × állítás) | **72** — ebből `covered` **53** · `partially_covered` **12** · `no_evidence` **7** |
| a leképezésben feloldott **próba** | 22 |
| **falszifikáló mutáció** (a sorokhoz kötve) | 56 |
| **fel nem oldott azonosító** (kitalált próba/mutáció) | **0** — a generátor erre kilépési kóddal bukna |

### 2/c. Mit ad egy klauzula-sor — az OB-7 hét lépése

Példa (`REV-N1a`, rövidítve):

1. **normaszöveg SZÓ SZERINT + lenyomat** — a regiszterből, nem átfogalmazva;
2. **élethelyzet** — *„A raktáros ma kilép… A nehéz eset nem az, amikor a megvonás egy órája
   megtörtént, hanem amikor pont a véglegesítés közben."*;
3. **mérendő tulajdonság** — *„a jogot a rendszer a VÉGLEGESÍTÉS pillanatában is újra megkérdezi"*;
4. **pozitív/negatív eset** — `A-REV-N1a-dependent-new-op-and-release-blocked` a
   `P-CMD-finalize-gate` próbán, `v3ref/run.mjs:854`;
5. **megváltoztatott kód** — `M32`: *„a PARANCS-oldali véglegesítési kapu eltűnik"*,
   `v3ref/mutations.mjs:261`;
6. **ténylegesen megbukó állítás** — a mutációs eredményből: melyik próba, milyen állapottal, mely
   állítások buktak;
7. **maradék hatókör** — *„a versenyhelyzetet SZINTETIKUSAN állítja elő… nem valódi párhuzamos írás
   — a több-írós véglegesítési határ külön nyitott tétel (OB-1)."*

### 2/d. A HÉT `no_evidence` ÉS A KÉT RÉSZBEN FEDETT KLAUZULA — kimondva

| klauzula | miért nincs bizonyíték |
|---|---|
| **REV-N1c** | nincs korrekciós esemény és nincs „alkalmazandó profil" a magban |
| **REV-N3d** | nincs adapter, ami valódi, szerver-oldali beadó-kontextust adna — a mai közös vödör REFERENCIA-HELYETTESÍTŐ, nem védelem |
| **REV-N3e** | a karantén-művelet szándékosan nincs megépítve (félig megépítve épp a C-F01 kockázata volna) |
| **REV-N4a / N4b** | nincs kompenzáló-esemény fogalom; a V2-ben van, de a V3-hoz nincs kötve — **a V2 megléte nem bizonyíték a V3-ra** |
| **ORG-N3a / N3b** | egyetlen jogalap-út van (tagság), tehát a VAGY/ÉS megkülönböztetésnek nincs alanya |
| **ORG-N1a (5 sor) · ORG-N1b (7 sor)** | `partially_covered` — a nyilvántartás és a meghívó-úti kapu megvan, a klauzula TELJES alakja (minden felhatalmazási útra) nincs |

**A REV-N3c-nél a lánc egy NEM BIZONYÍTOTT ELŐFELTEVÉSRE épül**, és ezt a leképezés kimondja: a
klauzula maga feltételezi, hogy a kulcsot szállító kontextus megbízható (REV-N3d) — az pedig ma
`no_evidence`. Ezt nem takarom el.

### 2/e. Amit a leképezés NEM csinál

**Nem elbírálás.** A `content_review` MINDEN klauzulán `null`, és a generátor nem is tudja beírni.
Az elbírálás a független félé, és az R57/F03 óta csak hitelesített rekord számít. A leképezés azt
mondja meg, **MIT mér a lánc és MIT nem** — nem azt, hogy a klauzula teljesül.

**És egy kimondott korlát a saját munkámra:** a leképezésen belüli próza (élethelyzet, maradék
hatókör) az én értékelésem. Ebben a körben **NEM futott le független kereszt-ellenőrzés** rá (a
tervezett menetet a környezet vitte el — §5/c). A gépi oldal viszont bármikor újrafuttatható, és a
hivatkozásokat a generátor a mai forráshoz köti.

---

## 3. K0 — A BIZONYTALAN MENNYISÉG ÉS A MAG NÉGY ALAPKAPCSOLATA

Az R19 §9.1 K0 kész-feltétele: *„minden érintett alapnak konkrét támogatási módja és ellenpéldája
van."* Ezért nem forrásból következtettem, hanem **futtattam**: a V3 mag adatbázis nélkül fut, tehát
minden állítás alá tehető végrehajtott ellenpélda (KUKA-089). A szerszám a repóban áll, Önök is le
tudják futtatni: **`node tools/vs_k0_qnt_probe.mjs`**.

### 3/a. A kilenc mérés — a TÉNYLEGES kimenettel

| # | alapkapcsolat | kérdés | MÉRT eredmény | ítélet |
|---|---|---|---|---|
| **A1** | azonosság ⊥ mennyiség | létrejön-e a tétel azonossága mennyiség nélkül? | `registerItem` ⇒ `ok`, a tárolt sor: `item_id, book_id, sku, unit, qty_profile, created_at` — **mennyiség-oszlop nincs** | **rendben** |
| **A2** | azonosság ⊥ mennyiség | mit mond a mag ISMERETLEN mennyiségre? | hiányzó ⇒ `not_a_string` · `null` ⇒ `not_a_string` · üres ⇒ `invalid_format` · `"unknown"` ⇒ `invalid_format` · `"0"` ⇒ `must_be_positive` · `"12.5"` ⇒ ELFOGADVA | **hiányzik** |
| **B1** | jogosultság (C03) | hordozza-e a KIADOTT eredmény, hogy mért vagy becsült? | a `stock.issue/1` adatkörei egy MÉRT és egy BECSÜLT 100 kg-ra: `["keszlet"]` — **a két válasz AZONOS** | **hiányzik** |
| **B2** | jogosultság (C03) | véd-e a kapu a SZÁRMAZTATOTT értéken (R19 §8.5)? | a magban nincs művelet, ami több tulajdonos mennyiségéből számítana — a támadási felület **ma nem létezik** | **hiányzik** |
| **C1** | egyszeri végrehajtás (C05) | az ISMÉTELT beküldés duplázza-e a hatást? | első ⇒ `ok` (`replayed:false`) · ismételt ⇒ `ok` (`replayed:true`) · **mozgás-sor: 1** | **rendben** |
| **C2** | egyszeri végrehajtás (C05) | a későbbi, pontosabb mérés új ÁLLÍTÁS-e — vagy új MOZGÁS? | a mag műveletei: `stock.receipt` (egy darab) · a „90" beküldése ⇒ ELFOGADVA, ÚJ MOZGÁSKÉNT · **az egyenleg: 190.000** | **hibás** |
| **D1** | kettős időnézet (C06) | rögzíthető-e mindhárom idő? | tengelyek: `A=[recorded_at+effective_at]`, `B=[effective_at]` · a tárolt sor `recorded_at=14:00`, `effective_at=08:00` — **a 10:00-s MÉRÉS ideje sehol** | **hiányzik** |
| **E1** | audit/verziózás (C07–C08) | megkülönböztethető-e a MÉRT és a BECSÜLT a főkönyvben? | két bevét („mérlegjegy" és „receptből becsült") — a sorok az azonosítón kívül **BÁJTRA AZONOSAK** | **hibás** |
| **E2** | audit/verziózás (C07–C08) | tárolható-e a KÉPLET és a verziója? | a mennyiség-PROFIL verziózott (`qty-1`) és a soron áll; képlet-, recept- vagy modell-hivatkozás oszlop **NINCS** | **hiányzik** |

**Összegzés: 9 mérés · 2 rendben · 5 hiányzik · 2 hibás.**

### 3/b. A legsúlyosabb K0-lelet — és miért nem „bug"

**C2:** a magban EGYETLEN mennyiségi művelet van (`stock.receipt`), és az MOZGÁST ír. Ezért a
„pontosabban megmértük ugyanazt" csak úgy fejezhető ki, mintha ÚJ ÁRU érkezett volna:
**100 + 90 = 190**, holott a valóságban egyetlen, 90 kg-os tétel van.

Ez **nem hibásan megépített funkció**, hanem **hiányzó fogalom**: a MEGFIGYELÉS. A QNT-07 („későbbi
mérés új mennyiségi állítást eredményez; a korábbi megfigyelés nem íródik át") és a QNT-18 („a
becslés változása és a valós anyagveszteség két külön esemény") a mai magban nem fejezhető ki.

**A legkisebb változtatás** (irány, nem terv): a megfigyelés önálló, **nem készletmozgató** művelet
legyen, saját ismétlés-kulccsal; a készlet-hatás pedig KÜLÖN, hivatkozott döntés. Ez pontosan az
R19 §5.3 műveleti listája — és a K0 szintjén annyit kell eldönteni, hogy a mennyiségi ÁLLÍTÁS
elválik-e a MOZGÁSTÓL. Amíg nem, a QNT-család fele fogalmilag mérhetetlen.

### 3/c. Amit a mai mag JÓL csinál — és amit a QNT-munka nem veszíthet el

Az R19 §9.1 kimondott feltétele a „meglevő bizonyíték megtartása". Mérve:

- **A1** — az azonosság MÁR MA elválik a mennyiségtől: a cikk-törzsben nincs mennyiség-oszlop. A
  QNT-01 első harmada tehát nem építendő, hanem **megőrzendő**.
- **C1** — az ismétlés-kulcs működik: a QNT-14 első fele mérve teljesül.
- **E1 jó híre** — az audit-lánc VAN: minden mozgás egy véglegesített parancshoz és nyugtához kötött
  (`effect_id`), árva sor nem születhet. Csak az EREDETRŐL nem tud.
- **A2 jó híre** — nincs néma nulla: minden ismeretlen-alak NEVEZETT elutasítást kap. A baj nem az,
  hogy elfogad valamit, amit nem kéne, hanem hogy az „ismeretlen" **nem mondható ki**.

### 3/d. QNT-01…24 → hol ér a maghoz (a leképezés az R19 §9-ből, a mai állapot MÉRVE ahol mértem)

| QNT | mit követel | mai alap | állapot |
|---|---|---|---|
| **01** | tétel/HU/folyamat ismeretlen tömeg mellett is rögzíthető | KAT-01 | **részben — MÉRVE (A1)**: a tétel igen; HU és folyamat a magban nincs |
| **02** | ismeretlen ⊥ ismert nulla ⊥ nem alkalmazható ⊥ még nem történt | BEM-01 · MNY-01 | **hiányzik — MÉRVE (A2)** |
| **03** | az eredet (mért · számlált · névleges · becsült · származtatott · egyeztetett) megmarad | KSZ-01 | **hiányzik — MÉRVE (E1)** |
| **04** | terv ⊥ létező anyag becslése | — | hiányzik (nincs terv-fogalom) |
| **05** | dimenziónként külön ismert/ismeretlen | KAT-01 (egy egység/cikk) | hiányzik |
| **06** | részleges ismeret bármely ágon | — | hiányzik (nincs folyamat-ág) |
| **07** | későbbi mérés ÚJ állítás, a régi nem íródik át | C05 · C06 | **hibás — MÉRVE (C2 · D1)** |
| **08** | képlet + feltétel + verzió + forrás | C07–C08 | **hiányzik — MÉRVE (E2)** |
| **09** | több megoldás ⇒ tartomány/feltételes/ismeretlen | — | hiányzik |
| **10** | a recept várakozás, nem felülíró bizonyíték | — | hiányzik (nincs recept) |
| **11** | a százalék nevezője kötelező | MNY-01 (profil) | hiányzik |
| **12** | mérleg: határ, időszak, hozzáadás, minta, veszteség | — | hiányzik |
| **13** | szétosztás/összeöntés kapcsolatai ismeretlen arány mellett | — | hiányzik |
| **14** | ismételt/offline/késői mérés nem dupláz | C05 | **részben — MÉRVE (C1)**: az ismétlés nem dupláz; a „késői mérés" a C2 miatt mégis duplázó hatású |
| **15** | ellentmondó mérés nem oldódik fel átlagolással/titkos felülírással | C05 | hiányzik (nincs két állítás ugyanarról) |
| **16** | fizikai ⊥ becsült ⊥ foglalható ⊥ jövőbeli | KSZ-01 | hiányzik |
| **17** | teljes HU továbbadása tömeg nélkül | — | hiányzik (nincs HU) |
| **18** | becslés-változás ⊥ anyagveszteség | C05 | **hibás — MÉRVE (C2)** |
| **19** | a korrekció hatásának előnézete | C03 · C05 | hiányzik |
| **20** | fizikai ⊥ mennyiségi ⊥ pénzügyi lezárás | — | hiányzik |
| **21** | a címke és az AI megőrzi az ismeretlen/becsült jelleget | C03 (DSC-01) | **hiányzik — MÉRVE (B1)** |
| **22** | export célrendszerenként választ, a külső korlát nem hamisít | C03 | hiányzik |
| **23** | a régi V2-adat nem „mért" pusztán mert számszerű | C07–C08 | **hiányzik — MÉRVE (E1 következménye)** |
| **24** | minden számítás megismételhető a korabeli forrásokkal, jogosultsággal | C03 · C06 · C07 | **hiányzik — MÉRVE (B2 · D1)** |

**Kimondott korlát:** ahol „MÉRVE" áll, ott futtatott ellenpélda van; a többi sor **forrásból
levezetett** — azok arról szólnak, hogy a mag adott fogalmat nem ismer, tehát a követelmény alanya
hiányzik. Ez gyengébb bizonyíték, és nem is nevezem másnak (KUKA-033).

### 3/e. §2.6 — a core-core véges táblája, becslési SÁVVAL

Az R19 §2.6 négy kategóriája. **Nap nem szerepel benne** — *„Bizonyítatlan alapra nem adunk újabb
néhány napos ígéretet."*

| tétel | kategória | mai bizonyíték | hátralévő munka | függőség | sáv |
|---|---|---|---|---|---|
| **C01** azonosság, munkamenet | V3-van, bizonyítás hiányos | `subject`/`account`/`membership` + AUT-01 · `P-AUT-object-neutral` | a KÜLSŐ határ (OB-3) hitelesítése | OB-3 | közepes |
| **C02** tér, könyv, tagság | V3-van, bizonyítás hiányos | `book`/`membership` · a kétidős tagság mérve | szervezeti alap teljes alakja | ORG-N1a/b | közepes |
| **C03** jogosultság, adatkiadás | V3-van, bizonyítás hiányos | AUT-01 · DSC-01 · BLI-01 · `P-REV-result-scope` | **eredet-tengely** a kiadott eredményen; származtatott érték kiadása | QNT-03/21 · B1/B2 | nagy |
| **C04** meghívás, delegálás, visszavonás | V3-van, bizonyítás hiányos | `invite` · REV-N1/N3 · ORG-N2a · BLI-01 | a korlát MINDEN felhatalmazási úton (ma csak a meghívón) | ORG-N1b | közepes |
| **C05** egyszeri, atomi végrehajtás | V3-van, bizonyítás hiányos | `command` · KSZ-01 · `P-CMD-*` · **C1 mérve** | **a MEGFIGYELÉS mint önálló művelet** (C2) · több-írós határ | OB-1 · QNT-07/18 | nagy |
| **C06** üzleti idő ⊥ rögzítési idő | V3-van, bizonyítás hiányos | IDO-01 · `bitemporal` · REV-N2a (15 sor) | **HARMADIK idő** (megfigyelés) · üzleti adat kétidős nézete | QNT-07/24 · D1 | közepes |
| **C07** audit, eredet, eseménylánc | V3-van, bizonyítás hiányos | `command_event` · `disclosure` · `review_circle` | **eredet- és modell-hivatkozás** a mennyiségen | QNT-03/08 · E1/E2 | nagy |
| **C08** verziózott szerződés, migráció | **V2-ben van, itt hiányzik** | `normContract` · mennyiség-profil · **0 migráció** | az első migráció és a kiadási lánc élesítése | — | közepes |
| **C09** modulbekapcsolás, képességnyilvántartás | **új V3-igény** | **nincs** (mérve: a magban nincs ilyen modul) | a fogalom megtervezése | C03 · C08 | ismeretlen |
| **C10** mentés, helyreállítás, üzemállapot | **V2-ben van, itt hiányzik** | **nincs** — a repó CLAUDE.md-je is NEVESÍTETT függőként mondja ki | visszaállítási próba, félkész művelet kezelése | első éles adatbázis | ismeretlen |
| **C11** megosztás, adatpublikáció | V3-van, bizonyítás hiányos | DSC-01 (adatkör) + kiadás-nyom | kinek/meddig; a visszavonás nem törli a megismertet | KUKA-085 | közepes |

**Sáv-jelölés:** *kicsi* = a mai fogalmakon belül · *közepes* = új mező/út, meglévő fogalmakra ·
*nagy* = ÚJ FOGALOM a magban · *ismeretlen* = a fogalom sincs eldöntve. Feltételezés: a V3
magreferencia szintjén mérünk, nem termék-szinten.

### 3/f. A korai azonosság és a numerikus készlet elválasztása — az R19 §9 függőségi hibája

Az R19 kimondja: *„S10 és H02 a számszerű készletre támaszkodik… a minimális anyag-/HU-azonosság és
belső folyamatcímke nem várhat a végleges kg-ra."* **Mérve a magban ez az elválasztás MÁR MEGVAN
(A1):** a cikk azonossága mennyiség nélkül születik, a mennyiség külön táblában (mozgás) él.

**Amit ez NEM bizonyít:** a KEZELÉSI EGYSÉG (HU) azonosságát — az a magban nem létezik. Tehát a
QNT-01 teljesüléséhez nem a meglévő elválasztást kell megvédeni, hanem a HU-t kell ugyanilyen,
mennyiségtől független azonosságként megépíteni. Ez K1-es tétel, nem K0-ás.

---

## 4. v3-progress/1 — A KÖRMÉRŐ VETÍTÉSE, NEM PÁRHUZAMOS MÉRŐ

Az R18: *„a meglévő körmérő gépi összesítőjét alakítsd erre a szerződésre. Ne építs párhuzamos
tokenmérőt."*

### 4/a. Mi épült

A meglévő körmérő (`tools/vs_round_cost.mjs`, RCM-01) kapott egy **vetítést** — nem új mérőt:

- **`v3ProgressLimitations(pkg)`** — a mért csomag KORLÁTAIBÓL képzi a `coverage` értéket és a
  `limitation` szöveget, és **mindig** hozzáteszi a két szerkezeti korlátot (fázis-idő null ·
  attribúció null);
- **`toV3Progress(pkg, {runId, item, round, …})`** — a boríték. A 13 metrikából a mérő **hatot** tud
  (`requests` · `input` · `cache_write` · `cache_read` · `output` · `reasoning`), plusz az
  `elapsed_seconds` (első→utolsó kérés — **eltelt idő, nem munkaidő**); a többi **null, nem nulla**.
  A `reasoning > output` viszonyt a feloldó ELUTASÍTJA. A `runId` KÖTELEZŐ és a hívó adja — *„ugyanaz
  a stabil run-id és újabb pillanatkép lecserél"*; ezt a mérő nem találhatja ki a naplóból.

### 4/b. Gépi jel — `node tools/vs_verify_round_cost.mjs` **31/31**

`RCC27` mező-leképezés szintetikus naplón · `RCC28` a nevezett elutasítások + pozitív ellenpár ·
`RCC29` a lefedettség hét ága · `RCC30` a pillanatkép-idő · `RCC31` VALÓDI parancssori futás
`--v3-progress`-szel, és az ellenpár nélküle.

### 4/c. KOMPATIBILITÁSI PRÓBA — az Önök validátorával, verbatim

Az R19 §2.6: *„A meglévő v3-progress/1 szerződés nem bővíthető hallgatólagosan."* Nem bővítettem.
A próba az Önök `tools/chatops-board/src/v3Progress.js` fájljának **változatlan szövegével** ment
(PR #155, `4ae6a91f`), az Önök katalógusával — ami a saját, R12-ből épített listámmal **azonos
halmaz, azonos sorrend (171 tétel)**:

| eset | eredmény |
|---|---|
| `validate(R20 boríték)` | OK |
| `fromDocument` — EGY blokk, `PR-VS-300` | OK |
| `fromDocument` — KÉT blokk | hiba (`Invalid telemetry document scope`) |
| `fromDocument` — más PR | hiba (`Invalid telemetry document scope`) |
| `fromDocument` — nincs blokk | `null` |
| `reasoning > output` | hiba (`Reasoning is an output subset`) |
| `partial` korlát nélkül | hiba (`Partial measurement requires limitation`) |
| negatív metrika | hiba (`Invalid usage counter`) |
| `accepted` független review-hivatkozás NÉLKÜL | hiba (`Acceptance needs independent review reference`) |
| rossz kör-alak (`R20` a teljes azonosító helyett) | hiba (`Invalid run binding`) |

**10/10.** A validátor a `4ae6a91f` commitból, **git-ből kivéve** (md5
`ca8d1cdcedf2c74f9252b63bcd1863c6`), a katalógus ugyanonnan (**171 tétel**) — nem emlékezetből írt
másolat. **Kimondott korlát:** ez a `4ae6a91f` állapotra igaz; ha a validátor változik, újra kell
futtatni. És a próba **nincs a söprésben**: az Önök kódja nem a V3 repó része, és a V2-be az Önök
PR-je viszi be.

### 4/d. Amit a vetítés NEM tud — a borítékban is kimondva

- **Fázis-idők**: null. Az első és utolsó kérésből nem osztok fel — ehhez mért időszakasz kell.
- **Memória-/dokumentáció-token**: null. Bájtból vagy gyorstár-összegből nem vezetem le.
- **Alügynökök**: alapból kívül, a `limitation` a darabszámukat NEVEZI.
- **Modell**: a boríték `model` mezője *„a költségmérésben nem azonosított"* — ez **döntés**, nem
  hiány: modell-azonosító nem kerül repóba írt artefaktumba. Nevezett hiány, nem kitalált érték.
- **Napló- és prompt-tartalom**: semmi nem megy a boardra — a boríték csak összegeket visz.

### 4/e. Hatókör-döntés — miért a V2 repóban, és mi NEM történt

Az R16-ban kimondták: *„ez nem engedély V2 módosítására."* Az R18 viszont kifejezetten utasít a
körmérő átalakítására — az pedig a V2 repóban lakik. A döntésem:

| mit | hogyan |
|---|---|
| hol | a V2 **kijelölt ága** (`claude/happy-feynman-tjwnwo`), commit **`4677e54e`**, feltolva |
| PR | **NINCS** — a merge-döntés az operátoré |
| V2 termék-kód | **nem érintett**; csak a két mérő-eszköz |
| V2 lint-őrök a friss klónon | `verify:no-undef` 1155 fájl · `verify:tdz` 1142 · `verify:module-symbol-wiring` 9/9 · `verify:kuka` 512/512 — **mind zöld** |
| a V2 söprés SWV-átvitele | **továbbra sem történt meg** (R17 §3/c: a négy V2-verifier deklaráció-sora előbb kell) |

---

## 5. HELYESBÍTÉSEK — ÉS EGY KÖRNYEZETI VESZTESÉG, AMIT NEM HALLGATOK EL

### 5/a. Az OB-7 darabszáma a saját kódomban hibás volt

A `norms.mjs` OB-7 lezárási feltétele azt írta: *„ma MIND a tizenhat klauzula `none` állapotú"* —
miközben a regiszter **húszat** hordoz, a lánc pedig **72 sort**. A szám kézzel volt léptetve, és
elcsúszott (KUKA-045). **Javítva:** a szöveg mostantól **nem mond darabszámot**, hanem a mérésre
mutat; a három szám a §2/b táblában áll, és a lánc-táblából jön.

### 5/b. Egy mérési hiba a SAJÁT K0-szerszámomban, az első futáson

A B1 mérés első alakja `Object.keys()`-t hívott a deklarált eredmény-típusok **listájára**, tehát a
tömb INDEXEIT (`0`, `1`) mérte típusnak — és a mag jogos válasza
(`result_scope_type_undeclared`) így **„nincs deklarálva" leletnek látszott volna**. A mérő saját
hibája volt, nem a magé; javítva, és a valódi típusok (`stock.issue/1` · `stock.receipt/1`) állnak
a mérésben. **A saját mérőm hibáját nem jelentem a rendszer hibájaként** (KUKA-094 a mérőn).

### 5/c. KÖRNYEZETI VESZTESÉG — ki kell mondanom, mert a munkamenet érinti

Ebben a körben az OB-7 leképezést **kétszer** állítottam elő. Az első menet 22 ügynökös, párhuzamos
feldolgozás volt (nyolc norma leképezése + nyolc független ellenőrzés + a K0 négy ága + cáfolás), és
**a futtatókörnyezet konténere újraindult**, mielőtt az eredményt a repóba mentettem volna: a
munkaterület és a futás naplója egyaránt elveszett. Ugyanebben a menetben a K0 ága és négy
ellenőrző ügynök **kvóta-korlátba** ütközött, tehát le sem futott.

**Amit ebből jelenteni kell, és amit nem:**

- a mai leképezés **nem** az elveszett menet visszaemlékezése: **újra előállítottam**, és most
  GENERÁTORBÓL jön, ami a repóban áll és bármikor újrafuttatható — ez erősebb, mint egy egyszeri
  ügynök-kimenet lett volna;
- a K0 mérést **magam futtattam le**, kilenc végrehajtott ellenpéldával;
- **a független kereszt-ellenőrzés viszont NEM futott le** sem az OB-7 prózára, sem a K0-ra. Ezt
  nem írom „elvégzettnek" — a hiányzó mérés nem zöld (KUKA-093). A K0 kilenc mérése **egyetlen
  menetből** származik; a cáfoló menetük a következő kör tétele.
- **Tanulság, amit magamra veszek:** ami csak a munkaterületen áll, az nincs meg. A köztes eredményt
  a repóba kell menteni, nem a futtatókörnyezetre bízni — ez a KUKA-132 („a lefuttattam nem ugyanaz,
  mint a be van kötve") tárolási alakja.

### 5/d. Az R18 három kérése, amire NEM cselekedtem — és miért

1. *„Az OB-3/5/6 javaslatot ez a mérési felület nem fogadja el automatikusan."* Elfogadom; azok az
   R17 §5-ben javaslatként állnak, klauzulát nem írtam a regiszterbe.
2. *„a külső lánc régi tesztjeihez az utód- és közös darabolási javaslat marad a következő célzott
   ellenőrzés tárgya."* Ebben a körben nem nyúltam hozzá — a lánc állapota változatlan (§6).
3. A *„core-core továbbra sincs elfogadva"* megállapítás áll; ezt a lap egyetlen pontja sem vitatja.

---

## 6. ZÁRÓTÁBLA — az R17 §6 frissítve

| # | tétel | osztály | ami változott R17 óta |
|---|---|---|---|
| 1–3 | azonosság · parancs · főkönyv · tiltás-hatókör | kész és bizonyított | — |
| 4 | **F16-01** — a jog előbb dönt | kész és bizonyított | — |
| 5 | **OB-10** — verdikt-szerződés | kész és bizonyított | **+SWV07**: a hibás alak MINDKÉT kilépési kóddal hiba (F18-01) |
| 6 | **OB-3** külső határ | most hiányzó alap | — (döntés Önöknél) |
| 7 | **OB-5** megvonás ≠ korrekció | most hiányzó alap | a K0 megerősíti: a REV-N4 hiánya **három** klauzulát blokkol (REV-N1c · N4a · N4b) |
| 8 | **OB-6** + 3 CMD-001 hiány | most hiányzó alap | — |
| 9 | **OB-7** tartalmi felülvizsgálat | **most hiányzó alap — de a LEKÉPEZÉS elkészült** | **0/72 → a leképezés 20/20 klauzulán kész; az ELBÍRÁLÁS 0/72** |
| 10–11 | **OB-8 · OB-9** klauzulák | most hiányzó alap | — |
| 12–14 | **OB-1 · OB-2 · OB-4** | most hiányzó alap | az OB-1-et a K0 A/C2 mérése is érinti (a megfigyelés-művelet és a több-írós határ) |
| 15 | későbbi megnevezett funkciók | későbbi | **+QNT-01…24** (R19): K0 hatásvizsgálat kész, K1–K4 nyitva |
| 16–17 | mérési korlátok (egység-tanú kötése · V2-söprés átvitele) | mérési korlát | változatlan |

---

## 7. GÉPI VÉGEREDMÉNY ÉS RÁFORDÍTÁS

### 7/a. Mérve, a lezárt állapoton

| mérték | érték |
|---|---|
| mag-próbák | **54/54 PASS**, exit 0 |
| mutációs battéria | **149 mutáció · 149 elkapva · 0 túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony**; hiány 0 · duplikátum 0 |
| legrosszabb egység | **6588 ms** (külső korlát 15 000 · mind a 7 egység belefér) |
| norma-lánc | **53/72 klauzula-sor FEDETT** · elvárt 72 · hiányzó 0 · idegen 0 |
| `verify:kuka` | **271/271 PASS** (167 bejegyzés, +KUKA-176) |
| `verify:sweep-verdict` | **ZÖLD** (SWV01–SWV07) |
| `verify:doc-html` | **9/9 PASS** |
| `verify:decision-numbers` | **4/4 PASS** — a következő szabad szám D-VS-3035 |
| OB-7 leképezés | 20 klauzula · 72 lánc-sor · 22 próba · 56 falszifikáló mutáció · **0 fel nem oldott azonosító** |
| K0 mérés | 9 futtatott eset · **2 rendben · 5 hiányzik · 2 hibás** |
| a V2 körmérő pinjei (a feltolt commiten újramérve) | **31/31** |
| a V2 négy lint-őre (ugyanott) | `no-undef` 1155 fájl · `tdz` 1142 · `module-symbol-wiring` 9/9 · `kuka` 512/512 — **mind ZÖLD** |
| **TELJES SÖPRÉS** | **10 verifier, 521 s: 9 zöld · 0 env-kihagyás · 1 PIROS** (`verify:external-checks`) — **kilépés 1** |

**A söprés PIROS, és ez az igazság** (R17 §3/d óta változatlan): a külső ellenőrző lánc az, ami
piros. A lánc mai állapota: **14/19 program MEGFELEL · 2 nevezett env-kihagyás zöld helyettessel ·
3 ELTÉRÉS: `r77` · `r79core` · `r81core`.**

**És egy mérés, ami a KUKA-175-öt erősíti meg:** az R17-ben a söprés gyermekeként NÉGY eltérés jött
(`+r83core`), üresjáratban három. **Ma, ugyanúgy a söprés gyermekeként, HÁROM.** Tehát az `r83core`
eltérése továbbra is **terhelésfüggő**, nem tartós — a helyes válasz továbbra sem egy szám, hanem
„három tartós + egy terhelésfüggő". Amíg a darabolás nem közös deklarációból megy (R17 §7/b), a lánc
ezen a programon nem tud regressziót őrizni.

### 7/b. A ráfordításról — az R18 kikötéseivel

A kör költsége a lap **v3-progress** blokkjában áll, a szerződésük szerinti alakban. Amit a szám
mellé ki kell mondani: **a mérés a kör FUTÁSA KÖZBEN készül**, tehát mozgó célpont (KUKA-134); az
alügynök-naplók összerendelése ismeretlen, ezért a lefedettség `partial`; és a fázis-bontás null,
mert **mért időszakasz nélkül nem osztok fel**.

**Ebben a körben a ráfordítás egy részét egy elveszett munkamenet vitte el** (§5/c) — ezt nem
mosom bele a „fejlesztés" költségébe: a mérő a NYERS fogyasztást méri, és a magyarázat itt áll.

**Nincs igazolt ár/érték-javulás**, és megtakarítást nem állítok.

### 7/c. A KÖR KÖLTSÉGE — MÉRÉSI HIBA, NEM NULLA

**A kör költségét ebben a környezetben NEM tudom megmérni, és ezt kimondom.** A körmérőt lefuttattam
(`node tools/vs_round_cost.mjs --kor "CMD-VS-300-002-002 R20"`), és **NULLA kérést** talált. A mérő
maga nevezi meg, hogy ez mit jelent:

```
FIGYELEM: NULLA kérés — a kör-jelölő nem talált egyetlen turnt sem. Ez MÉRÉSI
hiba, nem nulla költség (KUKA-012: az üres és az elérhetetlen nem ugyanaz).
```

**Az ok mérve:** a futtatókörnyezet konténere a kör közben újraindult (§5/c), és az a napló, amelyik
a kör jelölőjét hordozta, elveszett. A mai napló a jelölést nem tartalmazza, ezért egyetlen kérése
sem számítható ehhez a csomaghoz — *a kapcsolat HIÁNYA nem hozzászámítás* (az Önök R90-M01 szabálya).

**És a mérő HELYESEN viselkedett:** nulla kérésre **megtagadta** a v3-progress boríték kiírását —
nem írt ki egy hihető nullát. Az alábbi blokk ezért **DEKLARÁCIÓ a kör megtörténtéről**, minden
metrikája `null`, a lefedettsége `unknown`, és a korlát megnevezi az okot. A boríték az **Önök
validátorán** ment át (`tools/chatops-board/src/v3Progress.js`, a `4ae6a91f` commitból, git-ből
kivéve — md5 `ca8d1cdcedf2c74f9252b63bcd1863c6`), `validate()` és `fromDocument()` egyaránt.

## V3 mérési adatok

```v3-progress
{
  "schema": "v3-progress/1",
  "items": [
    {
      "id": "CORE-SHARED",
      "at": "2026-09-16T15:38:17.225Z",
      "status": "blocked",
      "source": "CMD-VS-300-002-002 R20 — REPORT. Saját mérés a lezárt állapoton: node v3ref/run.mjs 54/54 PASS; mutációs battéria 149/149 elkapva, 0 túlélte; norma-lánc 53/72 klauzula-sor fedett (12 részben, 7 bizonyíték nélkül). BLOKKOLÓ: a külső ellenőrző lánc PIROS és a core-core nincs elfogadva (chatgpt-v3, R18). Az OB-7 LEKÉPEZÉS elkészült (20/20 klauzula), az ELBÍRÁLÁS 0/72 — azt csak a független fél írhatja.",
      "tests_pass": 54,
      "tests_fail": 0,
      "tests_skipped": 0,
      "mutations_caught": 149,
      "mutations_total": 149,
      "open_defects": null,
      "reopened_defects": null
    }
  ],
  "runs": [
    {
      "id": "claude-v3-CMD-VS-300-002-002-R20",
      "item": "CORE-SHARED",
      "round": "CMD-VS-300-002-002 R20",
      "at": "2026-09-16T15:38:17.225Z",
      "agent": "Claude-v3",
      "model": "a költségmérésben nem azonosított",
      "source": "tools/vs_round_cost.mjs (RCM-01) — a mérő a kör jelölőjére NULLA kérést talált, és ezt MÉRÉSI HIBÁNAK nevezte, nem nulla költségnek; a v3-progress boríték kiírását ezért MEGTAGADTA. Ez a sor ezért DEKLARÁCIÓ a kör megtörténtéről, nem mérés.",
      "coverage": "unknown",
      "limitation": "A KÖR KÖLTSÉGE EBBEN A KÖRNYEZETBEN NEM MÉRHETŐ. A futtatókörnyezet konténere a kör közben újraindult, és az a napló, amelyik a kör jelölőjét hordozta, elveszett; a jelenlegi napló a kör-jelölést nem tartalmazza, ezért egyetlen kérése sem számítható ehhez a csomaghoz (R90-M01: a kapcsolat hiánya nem hozzászámítás). MINDEN metrika null — nem nulla. A fázis-időszakaszok (tervezés/fejlesztés/ellenőrzés/utómunka) mérés hiányában amúgy is null lennének, és a fájlkategóriánkénti tokenattribúció sem mérhető. Az alügynök-naplók összerendelése szintén ismeretlen.",
      "metrics": {
        "requests": null,
        "input": null,
        "cache_write": null,
        "cache_read": null,
        "output": null,
        "reasoning": null,
        "planning_seconds": null,
        "development_seconds": null,
        "verification_seconds": null,
        "rework_seconds": null,
        "elapsed_seconds": null,
        "memory_read_tokens": null,
        "documentation_output_tokens": null
      }
    }
  ]
}
```

---

## 8. AMI KIMARADT — nevesítve

1. **Az OB-7 ELBÍRÁLÁSA** — a leképezés kész, a `content_review` mind a 72 soron `none`. Ez
   szándékos: csak Önök írhatnak ilyen rekordot.
2. **A K0 független cáfolása** — a kilenc mérés egyetlen menetből; a cáfoló menet nem futott (§5/c).
3. **A K1 (mennyiség- és folyamat-szerződés)** — az R19 §9.1 szerint ez a következő szállítmány;
   ebben a körben nem kezdtem el.
4. **A külső lánc három eltérése** — javaslat az R17 §7-ben áll, a döntés Önöké; addig a lánc piros.
5. **A `V3_ALLAPOT_MAGYARUL.md` frissítése** — az MCS-2 óta elavult. Nevesített adósság, második
   köre.
