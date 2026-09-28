> **Kör:** R104 · **Sáv:** Claude-v3 · **Állapot:** lezárt

Repó: valach-system

# R104 — MEGSZAKÍTÁSKOR MÁR ÚJ MUNKA SEM INDUL: a leállítás két kötelme közül a második is megépült

CMD-VS-300-002-002 R104 — REPORT (válasz az R101 §F101-01-re, az R103 GUIDE munkarendje szerint)
PR-VS-300 · STEP-VS-300-002 · 2026-09-28
Sáv: Claude-v3 · Parancs: `CMD-VS-300-002-002 R101 — ANALYSIS` (chatgpt-v3) · Munkarend: `R103 — GUIDE`

**Forrás-kötés:** repó `valach-family/valach-system` · kiinduló, ellenőrzött fej
`53d7b1bf4d372f63a694e231c523f8559a451996` (az R102 átadás) · **kód-commit: `c339a0fde9cdc2fd032237bce96bdb974ab35a7a`** ·
ág: a munkamenet kijelölt ága, `claude/amazing-mccarthy-a8okzn`, a fenti commit LESZÁRMAZOTTJAKÉNT
(a környezet ezt az ágat hozta létre; az R103 ezt az esetet nevesíti — nem a régi alapértelmezett ágról indultunk).

**Friss munkamenet, mérve:** `session_01AYXqVtS5gCghJ1gw2dSmHP` — eltér az R103-ban nevezett előzőtől
(`32f4f8b5-01de-5bd4-a530-499ccd2cdfa5`).

---

## 1. MIT JELENT EZ A HASZNÁLATBAN?

**A leállítás eddig félkész volt: a rendszer leállította azt, ami FUTOTT, de nem tiltotta meg, hogy
KÖZBEN újat kezdjen.**

Ha valaki megszakította a fejlesztői ellenőrző-sorozatot (Ctrl-C, vagy a gép leállító jele), a
rendszer rendben lezárta az éppen futó ellenőrzést — és utána **elindította a következőt**. Nem
azért, mert valaki így akarta, hanem mert az „éppen futó lezárult, tisztán" választ a sorozat
folytatási engedélynek olvasta. A megszakítás sehol nem volt **kimondott állapot**: a leállítás
puszta ténye nem tiltás, ha senki nem kérdezi meg.

**Mit jelent ez gyakorlatban?** Aki leállította a mérést, annak a gépén még elindult egy újabb
ellenőrzés, ami ezután vagy egy késleltetett kilépés, vagy egy végső védőháló állított le. A második
munka tehát nem futott végig — de **el is indult**, és ez nem ugyanaz, mint hogy „el sem indult".
A jelentés pedig nem mondta meg, mi maradt ki és miért.

**Ami mostantól igaz:** a megszakítás pillanatától új ellenőrzés nem indul. Sem a sorozat nem hívja
meg a következő feladatot, sem maga a futtató nem indít új folyamatot — akkor sem, ha valaki
közvetlenül kéri tőle. Ami nem futott le, az **megnevezve** látszik („nem indult — MEGSZAKÍTÁS…"),
a megszakítás oka és a jel is, és a kilépés nem siker.

**Amit ez a kör NEM hozott:** ez nem új felhasználói képesség. A fejlesztői ellenőrzések
megbízhatóságát javítja — azt, hogy a mérés arról szóljon, amiről szólni akar. A termék felülete és a
magja ebben a körben nem változott.

---

## 2. A LELET, ÉS HOGY KI MIT MÉRT — KÜLÖN

### 2.1 A külső ellenőrző fél mérése (chatgpt-v3, R101 §F101-01)

Valódi SIGTERM-jelet használó, elkülönített próbában **háromszor reprodukálta**, hogy a megszakítás
alatt a **második visszahívás** lefut: a `runSequence` meghívta a következő feladatot. A lap
kimondottan NEM állította, hogy a második program elindult vagy üzleti műveletet végzett volna.

### 2.2 A saját mérésem ebben a körben

**Először reprodukáltam a hibát a javítás előtt**, az R101 által megadott maggal. Két dolgot mértem,
és a második TÖBB, mint amit az R101 állított:

| mit | eredmény a JAVÍTÁS ELŐTT |
|---|---|
| a második **visszahívás** lefut-e | **3/3 igen** (SIGTERM) |
| a második **gyermek** (új folyamat) elindul-e | **3/3 igen** |

**Egy fontos, mért részlet, amit ki kell mondani:** ugyanaz a kód **héj-indítással nem** vitte át a
második feladatot, **`exec`-kel viszont 3/3 alkalommal** igen. A hiba tehát **időzítéstől függött**,
vagyis némán jelent meg és tűnt el — ez önmagában is indok arra, hogy a védelem ne a versenyen, hanem
kimondott kapun álljon.

### 2.3 Amit a dokumentumok állítanak, és amit a mérés — nem ugyanaz

Az R103 GUIDE fogyasztási számait (66 hívás, 13 446 280 cache-olvasás, 208 389,5 medián) **nem
mértem újra**: azok a külső fél újraszámolásai a beadott sorlistából. Az R102 78 hívásos
kezdőállapota továbbra is jelentésből származó adat. Ebből a körből **nem következik** megtakarítás,
heti keretarány vagy V2-re átadható ár/érték-javulás; az ismeretlen költség **null, nem nulla**.

---

## 3. MI ÉPÜLT MEG — a négy kimondott szabály (D-VS-3081)

1. **A MEGSZAKÍTÁS KÖZÖS, NEVEZETT ÁLLAPOT** — új modul: **SHD-01**
   (`tools/lib/vs_shutdown_state.mjs`). A futtató és a sorozat **ugyanazt** kérdezi, nem két,
   egymástól független kapcsolót (az R101 kikötése). A jelkezelő **első, szinkron** lépése az állapot
   beállítása, **mielőtt** az aszinkron takarítás egyetlen sort is futna.
2. **A KAPU OTT ÁLL, AHOL AZ ÚJ MUNKA ELINDUL** — a futtatóban a folyamat-indítás **előtt**, a
   sorozatban minden tétel **előtt**. A kérdés és az indítás között **nincs várakozás**: a jelkezelő
   az eseményhurokban fut, tehát ezt a szinkron sorozatot nem tudja kettévágni. A rés bezárása ezen
   áll, **nem időzítésen** — és ezt a próba külön méri.
3. **A TILTÁS SAJÁT SZÓVAL TÖRTÉNIK** — nem hamis maradvánnyal és nem a tiszta takarítás
   letagadásával (az R101/2 kikötése). A futtató válasza `started:false` + nevezett ok +
   `nem_indult` verdikt; a sorozat megállásának fajtája `megszakitas` (nem `takaritas`), és a
   kimaradó tételek **a jellel együtt** megnevezve maradnak. A kilépés 128 + jelszám — **a SIGHUP
   mostantól 129, nem 143**: a modul saját, kimondott szabálya eddig ezen az ágon nem volt igaz.
4. **A VÉDELEMNEK MEG KELL TUDNI SZÓLALNI** — csoportonként **egy** lezárási menet fut (a normál és a
   megszakítási út ugyanazt az ígéretet várja meg; versengő második takarítás nincs, és a leállításkor
   felvett lista mögé új csoport nem kerül), és a kilépés **egy eseményhurok-fordulót vár**, hogy a
   folyamatban lévő hívások visszatekeredjenek, és a meg nem indult tételek bekerüljenek a jelentésbe.

**A negyedik pont nem díszítés, hanem a mérés feltétele — és ezt a saját első alakom tanította meg.**
Az első javításom után a próba zöld volt, de **rossz okból**: a folyamat előbb lépett ki, mint hogy a
sorozat egyáltalán eljutott volna a döntési pontig. A zöld tehát a **versenyt** igazolta, nem a kaput
(KUKA-120 · KUKA-127). A kilépés egy fordulónyi várakozásával a sorrend meghatározottá vált: a
sorozat **eljut** a döntésig, a lezárás állapota ott **`igazolt`** (tiszta takarítás) — és mégsem
indul új feladat, mert a megszakítás-kapu megállítja. Így a mérés valóban a védelemről szól.

---

## 4. A BIZONYÍTÉK — és ami az ELLENPRÓBÁVAL áll vagy bukik

`npm run verify:child-runner` → **61/61 PASS**, nevezett kihagyás nélkül (a korábbi CR05-kihagyás
ezen a gépen nem állt elő: a régi mechanizmus **mérhetően** életben hagyta a fát).

**CR14 — az R101 elfogadási próbája, valódi jellel.** Négy menet (2× SIGTERM, 2× SIGINT), valódi
`runSequence` + `runGuarded`, külön folyamatban:

| mit mér | eredmény |
|---|---|
| az első gyermek elindult (nem üres alapsokaság) | 4/4 igen |
| a második **visszahívás** lefut | **0/4** |
| a második **gyermek** elindul | **0/4** |
| az első feladat lezárása a megállás pillanatában | **`igazolt`** — tehát a megállás NEM hamis maradvány |
| a megállás fajtája | `megszakitas`, a jellel együtt |
| a kimaradt tétel | megnevezve (`nem indult — MEGSZAKÍTÁS…`) |
| kilépés | SIGTERM→143 · SIGINT→130, 484–504 ms |

**CR15 — a futtató saját határa és a KÉT ELLENPRÓBA.** A zöld csak akkor jelent védelmet, ha a kapu
kivételére mérhetően elbukik (KUKA-127). A kapukat jelölők határolják a forrásban; ha a jelölő
hiányzik, az ellenpróba **„nincs alkalmazható eset"**, nem zöld (KUKA-093).

| ellenpróba | eredmény |
|---|---|
| a **sorozat-kapu** kivéve | a második visszahívás **2/2 lefut** → a CR14 a védelmet méri |
| az **indítási kapu** kivéve | a leállítás alatt **1/1 ÚJ GYERMEK indul**, nevezett folyamatcsoport-azonosítóval |
| a kapukkal | közvetlen hívás a leállítás alatt: `started:false`, `nem_indult`, folyamat nem születik |

Mellé a CR15 **szabályként** méri (nem szövegként), hogy a kapu és az indítás közé nem kerülhetett
várakozás, és külön folyamatban méri a közös állapot szerződését (első jel állít, ismételt jel csak
kényszert kér; a kilépési kódok 130 · 143 · 129).

**A többi érintett kötelező őr:** `verify:sweep-reuse` **43/43** · `verify:kuka` **470/470**
(KUKA-248 a regiszterben, az archívum táblájában és az őr-otthonban) · `verify:sweep-verdict` zöld ·
`verify:artifact-naming` **28/28** · `verify:hash-manifeszt` **7/7** · `verify:external-decisions`
**44/44** · `verify:release-order` **37/37** · `verify:decision-numbers` **4/4** ·
`verify:doc-html` zöld.

---

## 5. AMIT NEM MÉRTÜNK — kimondva, nem elhallgatva

- **A teljes hosszú söprés NEM futott.** Az R101 és az R103 kimondottan nem kéri
  („célzott child-runner és sweep-reuse regresszió elegendő, plusz az érintett kötelező őrök"), ezért
  a `verify:external-checks` és a `verify:v3ref` **nem futott le ebben a körben** — ez **nem
  kihagyás-bizonyíték és nem zöld**, hanem nevezett hiány. A termék UX-próbáit sem futtattam újra.
- **A Windows-ág továbbra sem mérve** (nevezett platform-korlát): a POSIX folyamatcsoport-jel ott nem
  alkalmazható, és ezt a futtató szerződése változatlanul kimondja.
- **A futtatóra küldött SIGKILL, az operációs rendszer kiesése és a saját csoportjából önállóan
  kilépő leszármazott** továbbra sem garantált — a `CHILD_RUNNER_CONTRACT.not_guaranteed` változatlan.
- **A kilépés egy fordulónyi várakozása nem tetszőlegesen sok munkát enged visszatekeredni:** egy
  eseményhurok-forduló véges és rövid. Azt garantálja, hogy a megszakítás-kapu megszólalhat, és a
  kimaradt tételek a jelentésbe kerüljenek — azt **nem**, hogy egy tetszőlegesen hosszú jelentés
  minden sora kiíródjon, mielőtt a folyamat kilép.
- **Nincs merge, telepítés, V2-módosítás, új üzleti modul, core-core lezárás.** A 16/13 nem százalék.
  Az R19 QNT 24 követelménye és 36 esete megmarad. A korábban elfogadott nyelvmegőrzés nem nyílik újra.

---

## 6. A VÁLTOZÁS DARABJAI

| fájl | mi történt |
|---|---|
| `tools/lib/vs_shutdown_state.mjs` | **ÚJ** — SHD-01, a közös megszakítási állapot |
| `tools/lib/vs_child_runner.mjs` | indítási kapu az indítás előtt · csoportonként egy lezárás · a jelkezelő első lépése az állapot · kilépés egy forduló után · SIGHUP 129 |
| `tools/lib/vs_sweep_sequence.mjs` | megszakítás-kapu minden tétel előtt · a megállás két fajtája · `nem_indult` állapot |
| `tools/vs_verify_sweep.mjs` | a két megállási ok külön mondata · üres „előző tétel" is kiállja · megszakításkor a jel kódjával zár |
| `tools/vs_verify_child_runner.mjs` | **CR14 · CR15** (+ a CR10 feliratának igazítása a valósághoz) |
| `contracts/retiredPatternRegistry.js` · `docs/KUKA_ARCHIVUM.md` · `contracts/guardHome.js` · `contracts/kukaArchiveBaseline.json` | **KUKA-248** |
| `DECISION_LOG.md` | **D-VS-3081** |

---

## 6/b. FOGYASZTÁS — EGY SOR

Ablak „R104 F101-01" (2026-09-28T19:04:10.953Z → 19:48:41Z), munkamenet
`dd1b2336-b85f-5955-aaec-140d1596626a`, lefedettség **teljes**: **80 hívás · 0 ügynök · cache-olvasás
16 706 330 · kimenet 111 749**; fő-szál kontextus **medián 223 951,5 · max 316 992**. **A 200 ezres
kísérleti jelző ÁTLÉPVE** — ezért ez a kör itt zárul: minimális lezárás (leltár + lap + kör), új
munka nem indul, a folytatás új munkamenetben. Gépi alak (tartalom nélkül):
`docs/70_PLANNING/V3_R104_FOGYASZTAS_LELTAR.json`. **Ebből költség, heti keretarány vagy megtakarítás
NEM számítható** — az ismeretlen költség null, nem nulla.

---

## 7. MI MARADT NYITVA

- **A teljes söprés és a termék-UX újrafuttatása** — nevesítve nem futott (5. szakasz). Ha a következő
  kör tárgya a kiadás, ezek ott futnak le.
- **F101-01 lezárása a külső ellenőrző fél mérésén múlik**: a fenti eredmények a SAJÁT futtatásaim.
  A lap a reprodukcióhoz mindent megnevez (commit, próba-azonosítók, ellenpróba-jelölők).
