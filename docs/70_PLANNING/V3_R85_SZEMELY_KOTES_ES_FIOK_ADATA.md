> **Kör:** R85 · **Sáv:** Claude-v3 · **Állapot:** lezárt

# A KÖTÉS OTT ÁLL, AHOL AZ ÍRÁS TÖRTÉNIK — az R85 négy leletének lezárása

**Kör:** CMD-VS-300-002-002 **R85** (a külső ellenőrző fél, chatgpt-v3, ANALYSIS lapjára) ·
**Repó:** `valach-system` · **Ág:** `claude/affectionate-dijkstra-76w5e8` ·
**Forrás-commit:** `165cdc27f0bd040b9010dc0e082353775e0a4f14` (tiszta munkafa)

---

## 0. ELŐRE, AHOGY A PARANCS KÉRTE: a munkamenet

Az R85 kimondta: *„ezt az önálló R85 csomagot friss Claude-v3 munkamenetben indítsd… Ha a végrehajtó
nem tud új munkamenetet nyitni, ezt indulás előtt nevezze meg; ne folytasson észrevétlenül a régi
terheléssel."*

**NEVESÍTVE: ÚJ MUNKAMENETET NEM TUDOK NYITNI.** A beszélgetést az operátor nyitja; a végrehajtó
ügynök a futó munkamenetben dolgozik, és nincs eszköze átváltani egy frissre (párhuzamos Claude-
feladatot pedig ez a parancs kifejezetten tilt). Ez a csomag tehát a **`3348238d…` munkamenetben**
futott — ugyanabban, amelyik szeptember 22-én indult. **A terhelés MÉRVE, a csomag ELSŐ mérésekor:**
a fő-szál kontextus mediánja már induláskor **465 019** volt (a jelző 200 ezer), pontosan azért,
mert a régi átirat be van töltve. A záró mérés a 6. szakaszban áll.

Ha az operátor új beszélgetést nyit, ez a csomag ott újra elvégezhető: az induló forrás a board
R85-ös lapja, ez a REPORT és az érintett fájlok — a régi átirat nem bemenet.

## 1. Röviden magyarul

Négy hiba maradt az előző körből, és mind a négy ugyanarról szól: **a gép olyat állított vagy
csinált, amit nem mért.**

- **A legsúlyosabb:** ha valaki félbehagyott egy „új fiók" űrlapot, és közben ugyanabban a
  böngészőben **más ember jelentkezett be**, akkor a régi űrlap beküldése **annak a másik embernek**
  hozott létre fiókot. Nem a jogosultság hiányzott — a gép nem kérdezte meg, KI kezdte el.
- Az egyik cégben kiadott **várakozó meghívás** a másik cégre váltás után is ott maradt a képernyőn.
- **Ugyanaz a cég két felhasználónak más mintaadatot mutatott**, mert a rendszer a nézőből számolta
  ki, melyik mintacsomag jár — nem a cégből.
- Egy **elküldött, de elveszett válaszú** levélkérésre a lap azt írta, „nem sikerült kapcsolatba
  lépni, próbáld újra" — miközben a levél már el is ment.

Mind a négy javítva, mind a négyhez **előbb ellenpróba készült** (öt böngésző-rekesz; négy közülük
**pirosan indult**), és csak utána a javítás.

**Mit lehet kipróbálni:** a csatolt HTML bemutató 18 képernyőn végigvezet — internet, telepítés és
terminál nélkül, kettős kattintásra.

## 2. A négy lelet és a válasz

| Lelet | Mi volt | Mi lett | Bizonyíték |
|---|---|---|---|
| **F85-01** (blokkoló) | a félbehagyott vállalkozás-űrlap HTTP 201-gyel a közben belépett MÁSIK embernek hozott létre fiókot; a kliens-oldali nézet-bélyeg a másik fül belépését nem érzékeli | a létrehozás is viszi a **megnyitáskori alanyt**, és a **szerver ÍRÁS ELŐTT** veti össze a munkamenet alanyával — nevezett, írás-mentes 409; célkönyvet nem követelünk nem létező könyvhöz; a régi szerkesztő érvénytelen, és a lap kimondja a folytatást | `tests/e2e/v3app-r85.spec.mjs` F85-01 |
| **F85-02** | az előző cég várakozó meghívása az új cég fejléce alatt maradt (a lista kimaradt a közös ürítésből) | **EGY közös ürítő** (`resetViewCaches`), amit a saját váltás ÉS a külső okból jött nézet-változás is hív; a betöltést a lap KIMONDJA („Meghívások betöltése…") | `…r85.spec.mjs` F85-02 · UX-05 |
| **F85-03** | ugyanaz a cég Annának „Szenzormodul 120 db"-ot, Bélának „Rögzítőelem M8 840 db"-ot mutatott — a néző saját fiók-listájának sorrendje döntött | a hozzárendelés a fiók **LÉTREHOZÁSAKOR** születik, a **tárolóban áll** (`app_demo_fixture`), és a nézethez kötött **szerver-válasz** adja vissza; a felület nem számol | `…r85.spec.mjs` F85-03 · UX-20 |
| **F85-04** | egy VÉGREHAJTOTT, de elveszett válaszú írásra a lap biztos hálózati kudarcot állított, és újrapróbálásra biztatott | a kimenet a kérés **fajtájához** kötött: ÍRÓ kérés elveszett válasza **NEM ELDÖNTHETŐ**, OLVASÓ kérésé eldönthető hiány (olvasás semmit nem változtat) | `…r85.spec.mjs` F85-04 és F85-04/b |

### Az öt kimenet, öt külön mérésben (F85-04/b)

1. **megszakított kérés** → „Nem tudjuk biztosan, hogy a kérés teljesült…" ·
2. **végrehajtás utáni elveszett válasz** → ugyanaz a mondat (a böngésző a kettőt nem tudja
   megkülönböztetni — ezt a lelet bizonyította) ·
3. **hibás választest** → ugyanaz ·
4. **nevezett elutasítás** → a szerver OKA („Túl gyakran kértél új levelet…"), nem bizonytalanság ·
5. **siker** → a semleges levél-oldal, CSAK itt ·
6. **és az olvasó ág:** egy el sem jutott készlet-lekérés „Nem sikerült kapcsolatba lépni… Semmi nem
   változott." — mert ott a hiány TÉNYLEG eldönthető.

**Kimondva a próbáról:** a (4) eset válasza beadott (`route.fulfill`), mert ez a végpont
SZÁNDÉKOSAN semleges — mindig `ok: true`-t ad, hogy ne áruljon el semmit a cím létezéséről
(KUKA-084). Nevezett elutasítás innen fogalmilag nem jöhet; a KLIENS ágát mérjük, a végpont saját
semlegességét a `verify:app-findings` battéria.

## 3. Az R81 huszonkét feltételének állapota

**20 bizonyítva · 2 részben bizonyítva · 0 nem futott** (`docs/70_PLANNING/V3_R81_UX_ELFOGADAS.json`).

A három érintett ítélet mérése **bővült**, nem a követelmény szűkült:

- **UX-05** — a nézethez kötött LISTÁK sem utaznak át: az egyik cégben kiadott várakozó meghívás a
  másik cég fejléce alatt TÍZ mintavételen át egyszer sem jelent meg.
- **UX-15** — a bizonyíték kimondja, hogy a **létrehozás** útjának szerveroldali személy-kötését a
  `v3app-r85.spec.mjs` F85-01 rekesze méri, és **nem állítja** azt, amit ez a rekesz nem mér: ott a
  lap a korábbi 409 után már igazodott a szerverhez, tehát a létrehozás joggal sikerülne.
- **UX-20** — ugyanaz a fiók MINDKÉT nézőnek ugyanazt a mintacsomagot adja (a `demo_fixture` a
  szerver válaszából jön és a fiókhoz tartozik), és a lap nem állít olyan kudarcot, amit nem mért.

Az **UX-18** (billentyűs bejárás) és az **UX-21** (átadás) továbbra is `reszben_bizonyitva`, a nem
mért al-esetek nevesítve — a külső fél ezt az elkülönítést helyesnek minősítette, és erre a csomagra
nem kért képernyőolvasó- vagy teljes mobilbillentyűzet-munkát.

## 4. Saját futások és a nem futott láncok

**SAJÁT FUTÁS, ezen a fejen:**

| Parancs | Eredmény |
|---|---|
| `npx playwright test` (a teljes böngészőcsomag) | **53/53 PASS** |
| `npm run app:selfcheck` | 57/57 PASS |
| `npm run verify:app-findings` (R75) | 73/73 PASS |
| `npm run verify:app-findings-r77` (R77) | 34/34 PASS |
| `npm run verify:app-findings-r79` (R79) | 49/49 PASS |
| `npm run verify:kuka` | 392/392 PASS |
| `npm run verify:doc-html` · `verify:artifact-naming` · `verify:decision-numbers` | 9/9 · 28/28 · 4/4 PASS |
| `node tools/v3_kiprobalas_kepek.mjs` (+ tömör alak) | 18 képernyő, önhordóság OK |

**ÚJRAHASZNÁLT BIZONYÍTÉK: NINCS.** `--reuse` feloldót nem használtunk.

**NEM FUTOTT, KIMONDVA:** a teljes `npm run verify:sweep`, benne a `verify:external-checks` és a
`verify:v3ref` több-tízperces lánca. A söprés eredménye ehhez a fejhez **NEM IGAZOLT**, nem zöld. A
mag (`v3ref/`) ebben a körben **egyetlen fájllal sem változott**. A V2-ben tárolt képesség-regiszter
két elavult sora (`v3-ui-slice` · `v3-vertical-slice`) **külön, nyitott eltérés** marad — nem V2-
módosítási engedély, és pirosból nem lesz zöld szöveges indoklással.

## 5. A szállított melléklet

| Fájl | Méret | SHA-256 |
|---|---|---|
| `v3_v3.0.0-alpha_20260925_084521_v3app_bemutato.html` (felhasználói, PNG) | 2,06 MB | `66257230206b2a1685705f0fe8b45e78e06d1e4bbd6fadeb7d60d516e3072b42` |
| `v3_v3.0.0-alpha_20260925_084521_v3app_muszaki.html` (műszaki melléklet) | 9,4 kB | `3e6e8b694b7ecc6f4bc27d2aca5eec4a20be8b285ab89baea1a084ed4ac53664` |
| `v3_v3.0.0-alpha_20260925_084603_v3app_bemutato_tomor.html` (tömör, JPEG) | 691 kB | `49cc51bc0026c0027c68d5663bffaf4f6430d6a84788415f1d14016f942b98b3` |
| `v3_v3.0.0-alpha_20260925_084603_v3app_muszaki_tomor.html` | 9,4 kB | `c2c7692bc566aa31c0346d7473b14671fcb7f31e6d36ad9b7b5fa6422f2ee6f8` |

Mind a négy a `165cdc2` commiton, **tiszta munkafán** készült. Az önhordóság **mérve**: 18 kép, mind
beágyazott `data:`-URI · külső szkript, stíluslap és betöltendő `http(s)://` erőforrás: **NINCS**.

**A KÉZBESÍTÉSRŐL, kimondva:** a fájlokat a beszélgetésbe csatolva adom át (nem csak a nevüket és a
hashüket) — a külső fél R85-ös kifogása épp az volt, hogy a névből és a hashből nem tudta megnyitni.
Ha a csatolmány mégsem jut el hozzá, az **hozzáférési hiány**, nem bizonyíték a fájl nemlétére; a
lenyomat és a forrás-commit ilyenkor is visszakereshetővé teszi.

## 6. Fogyasztás

Az R85 csomag ablaka **2026-09-25T07:29:39Z → 08:46:41Z**, mérve:
**82 hívás · cache-olvasás 42 626 376 · kimenet 79 649 · ügynök-bemenet 0 (0 ügynök)** ·
lefedettség **teljes**. Tartalom nélküli leltár: `docs/70_PLANNING/V3_R85_FOGYASZTAS_LELTAR.json`.

**Átlépett kísérleti jelző, kimondva:** a fő-szál kontextus **mediánja 524 763** (a jelző 200 ezer),
maximum 576 341; mind a 82 hívás 400 ezer fölött. **Ennek FŐ OKA a 0. szakaszban megnevezett tény:**
a csomag a régi munkamenetben futott, ahol a korábbi körök átirata a kontextus része — a medián már
az ELSŐ méréskor 465 019 volt, mielőtt egyetlen sort írtam volna. **Amit ezen belül szűkítettem:**
nulla ügynök és workflow; terminálra csak összegzés és a hibás sor (a teljes napló fájlba); a teljes
böngészőcsomag **egyszer** futott, a köztes körök célzott rekeszekre szűkítve; a board-lapból csak a
szükséges szakaszt olvastam.

**Amit nem állítok:** hogy ez kontrollált megtakarítás vagy ár/érték-javulás. Különböző csomagok
mért exportjai állnak egymás mellett; a valódi költség és a heti limitre gyakorolt hatás ezekből nem
számítható — az ismeretlen költség `null`, nem nulla.

## 7. Amit ez a kör NEM állít

- **Nem mondja ki a core-core teljes lezárását.** A 16 elfogadott / 13 részleges mag-klauzula **nem
  készültségi százalék**. Az R19 24 QNT-követelménye és 36 tervezett esete **megmarad**: ismeretlen
  mennyiség mellett is létezhet és feldolgozható a tétel · a későbbi mérés nem írja át a becslés
  múltját · a pontosítás önmagában nem készletmozgás.
- **Nem állítja, hogy minden felirat a közös szótárból jön.** Az ebben a körben érintett új szövegek
  onnan jönnek; a maradék dokumentált tartozás, és nem indít újratervezést.
- **Nem állítja, hogy a felület billentyűvel teljesen akadálymentes** (UX-18 részleges), és nem
  állítja, hogy a melléklet meg is érkezett (UX-21 részleges).
- **Nem állít zöld söprést**, és nem minősíti zöldnek a nem futott hosszú láncokat.
- **Nem üzemi rendszer:** nincs telepítés, migráció, valódi levélküldés, számlázás és üzleti modul. A
  bemutató sorai szintetikusak, jelölve.
