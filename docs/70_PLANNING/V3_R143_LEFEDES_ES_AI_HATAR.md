# R143 — A két történet végigvihető, a lefedés mérhető, és az AI-határ rendezve

> **Kör:** R143 · **Sáv:** Claude-v3 · **Állapot:** lezárt

**A parancs:** `CMD-VS-300-002-002 R142 — SPEC` (chatgpt-v3, 2026-10-02T15:50:31Z).
**Repó:** `valach-family/valach-system` · **Ág:** `claude/eager-wright-3hwupf`.

---

## 0. Amit ez a lap NEM állít — elöl, hogy ne kelljen keresni

Az R142 nagy csomag: feltárás → hiány-pótlás → AI-határ → bemutatás. **Ebben a körben a feltárás,
a gépi őr, a három mért hiba javítása és az AI-határ készült el. A tartalmi pótlás nagyobb része
NEM.** A hiány nem néma: a `npm run verify:lefedes` őr MA PIROS, és soronként megmondja, mi maradt —
ez a gépi nyom, nem egy ígéret egy lapon.

**És egy mérés, ami minden AI-állítást keretez:** ebben a konténerben **nincs engedélyezett
szolgáltató** (`npm run kapcsolat:ai` → hiányzik `VS_AI_PROVIDER`, `VS_AI_API_KEY`,
`VS_AI_BASE_URL`). Ezért **élő nyelvértésre vonatkozó állítás egyetlen itteni mérésből sem
következik** (KUKA-089 · KUKA-127). Amit mértünk, az a SAJÁT szerződésünk, helyi szolgáltatói
csonkkal: mit ad át a szerver, mikor hív, mit fogad el, mit utasít el.

---

## 1. A megnyitható bemutató — három indulási lépés

**A bemutató linkje: https://claude.ai/artifact/B2tbELpgWxGiohhuzXzsTY**

A bemutató a SZÁLLÍTOTT valódi felület, mintaadaton (nem képernyőkép és nem külön készített
bemutató-lap). **Három lépés:**

1. nyisd meg a fenti linket;
2. nyomd meg a **„2 · Munkatárs visszatérése"** gombot a felső sávban;
3. kövesd a buborékot — a „Tovább" sosem végzi el helyetted a műveletet.

A két történet (**1 · Meghívás visszavonása** · **2 · Munkatárs visszatérése**) 18-18 lépés, és
mindkettő ÁTÍVEL a szereplőkön: a fiókkezelő visszavon, a meghívott elfogad, a fiókkezelő jogot ad,
a végeredményt megint a meghívott látja. A **☰** melletti ablakot keskenyre húzva (≈390 px) a
történet ugyanúgy végigvihető — ez volt a kör egyik javítása.

**Amit a bemutató háttere KIMONDVA nem ad:** a `demo-adapter.mjs` jelölt csonk, tehát HTTP- vagy
adatbázis-bizonyíték ebből nem következik (KUKA-227).

---

## 2. A lefedési leltár — a népesség a TÉNYLEGES alkalmazásból

Az R142 kikötése: *„A lefedést ne a meglévő tudásjegyzék önellenőrzése jelentse."* Eddig a mérés a
regiszterből indult, és azt kérdezte, van-e minden BEJEGYZÉSHEZ súgó. Ez a kérdés zöld maradhat
akkor is, ha egy VALÓDI oldal soha be sem került a regiszterbe (KUKA-051).

**Mostantól az alapsokaság a FORRÁS** (`v3app/knowledge/coverage.mjs`, LEF-01): a szerver
route-táblája · a nyelvcsomag oldal-listája (amiből a menü ÉS a fülek épülnek) · a felületi
`data-action` műveletek · az űrlapok · a belépés előtti nézetek. Minden népességnek **MÉRT padlója**
van: ha egy kivonatoló minta elromlik, a lefedés „javulni" látszana attól, hogy kevesebbet mértünk
(KUKA-012).

### 2/a. Előtte — utána, fajtánként

| Népesség | Darab | Nevezett hiány ELŐTTE | Nevezett hiány UTÁNA | Mi történt |
|---|---:|---:|---:|---|
| végpont (route) | 32 | 5 | **5** | nem javítva — a következő blokk |
| oldal (page) | 17 | 10 | **10** | nem javítva — a következő blokk |
| felületi művelet | 42 | 7 | **0** | **javítva** (lásd 2/c) |
| űrlap | 6 | 1 | **0** | **javítva** (lásd 2/c) |
| belépési nézet | 3 | 0 | 0 | — |

A forrásból mért népesség **100 darab**, a tudásjegyzék **31 bejegyzés** — tehát van mihez mérni.

### 2/b. Bemutató-lefedés funkciónként — LÉPÉSEN, nem szövegen

Az R142 kikötése: *„puszta »tour_note kellően hosszú« többé nem teljesítési feltétel. A közös túra
lefedését gépi hivatkozás és tényleges lépés bizonyítsa."*

| Hogyan fedett | Darab | Funkciók |
|---|---:|---|
| **SAJÁT bemutató** | 13 | auth.register · account.add_business · invite.send · invite.accept · members.grant · members.scopeRevoke · invite.revoke · members.reinvite · plan.change · data.stock · shell.navigation · shell.language · shell.help |
| **KÖZÖS bemutató, MÉRT lépéssel** | 9 | auth.verify (inviteRevoke s7,s8,s15,s16) · account.personal (shell s1) · account.switch (shell s1) · members.list (invite s1) · members.revoke (invite s1) · data.price (stock s1,s4) · shell.profile (shell s4) · shell.assistant (shell s5) · shell.demo_mail (inviteRevoke s7,s8,s15,s16) |
| **CSAK indok-szöveg — az R142 óta NEM teljesítés** | 6 | auth.login · auth.resend · auth.logout · data.documentSample · data.supplierSample · shell.sample_pages |

A SPEC kiinduló deklarációja azt írta, hogy „15 working/demo funkciónak nincs saját
túrahivatkozása". A független mérés ezt PONTOSÍTJA: ebből **9 valóban fedett** egy közös bemutató
MÉRT lépésével, és **6 az, ami csak indok-szöveggel áll**.

### 2/c. A TÉNYLEGESEN javított hiányok — és egy hiba a saját szerszámomban

**Az első mérésem 7 művelet-hiányt jelentett. Négy közülük HAMIS volt.** A felületi művelet
azonosítója (`data-action="revoke"`) és a funkció horgonya (`data-testid="member-revoke"`) két külön
névtér; az első illesztési szabályom csak azonosságra és előtagra illesztett, ezért MEGLÉVŐ
kötéseket mondott hiánynak. Egy hamis hiány rosszabb, mint a nem mérés: adatnak látszik, nem hibának
(KUKA-066). A szabály most kötőjellel határolt DARABRA illeszt — `revoke` ↔ `member-revoke` —, és a
hét hiányból **három maradt valódi**, plusz egy negyedik:

| Hiány | Mi volt a baj | Mi történt |
|---|---|---|
| `invite-revoke` | a visszavonó GOMB azonosítója nem szerepelt a funkció horgonyai közt | horgony felvéve: `invite-revoke-confirm` |
| `reinvite` + `reinvite-form` | az újra-meghívás gombja és az űrlapja sem | horgony: `member-reinvite-` · `reinvite-form` · `reinvite-confirm` |
| `scope-grant` | a JOGADÓ gomb nem — csak a tag-sor | horgony: `member-scope-grant-` |
| `scope-revoke` | a MEGVONÓ gomb nem — csak a tag-sor | horgony: `member-scope-revoke-` |

Ez a KUKA-011 alakja a tudáson: a funkció leírása megvolt, de **nem mondta meg, hol kattint** a
felhasználó. A dinamikus azonosítókhoz négy sablon-család került a tutor-őrbe
(`member-scope-grant-` · `member-scope-revoke-` · `member-reinvite-` · `invite-revoke-`).
**Mérve:** `verify:tutor` **92/92 PASS · ellenpróba 14/14**; a művelet- és űrlap-hiány **0**.

### 2/d. Ami NEM készült el — soronként, hogy ne kelljen újra felderíteni

**5 végpont**, amire egyetlen funkció-leírás sem hivatkozik: `GET /api/invites/waiting` ·
`GET /api/invites/observe` · `POST /api/invites/pending` · `GET /api/data/document-full` ·
`GET /api/assistant/status`.

**10 oldal.** Hatnak **nincs funkció-leírása, GYIK-je és bemutatója sem**: `processes` (Folyamatok) ·
`movements` (Készletmozgások) · `stockcard` (Termékkarton) · `warehouses` (Raktárak) · `account`
(Fiók adatai) · `personal` (Ügyleteim). További négynek csak **bemutatója** nincs: `documents` ·
`products` · `partners` · `security`.

**MÉRT TÉNY a hat oldal valódi természetéről** (hogy a következő kör ne emlékezetből írjon leírást):
`movements` és `stockcard` VALÓDI készlet-oldal, ugyanazon készlet-kapu mögött, mint a
`stock` (horgony: `movements-table` · `stockcard-table`) · `processes` és `warehouses` MINTA-lista
oldal fixtúrából, kereséssel és részletező panellel (a `processes`-en állapot-szűrő is, a MEGLÉVŐ
sorokból) · `account` valódi fiók-oldal (`section-account` · `representation-note`) · `personal`
KIMONDOTTAN üres oldal („Még nincs megjeleníthető ügyleted").

---

## 3. V2 → V3: átvett tanulság → konkrét implementáció

A SPEC kötelezően használandó V2-forrásokat nevezett meg. Ezek **olvasott referenciák**; V2-t nem
módosítottunk. A kör azt vette át, aminek a mai munkához TÉNYLEGES következménye volt:

| V2-forrás / tanulság | Mi lett belőle itt |
|---|---|
| `VS_AI_PROVIDER_AND_SYSTEM_MAP_CONTRACT.md` (D-VS-038): cserélhető provider, a VS az igazság forrása | Változatlanul áll (AST-02): a `providerStatus` NEVEKET és TÉNYEKET ad, értéket soha; a megjelenő mondatot a szerver állítja össze a saját nyelvcsomagjából |
| `VS_CONTEXTUAL_CANDIDATE_GROUNDING_CONTRACT.md` (D-VS-063): kontextusfüggő jelölt, nincs globális „dió=X" | **Elvként átvéve, kódként NEM ebben a körben** (lásd 5. szakasz) — a csomag a kapu-megnyitásig és a korlátos indexig jutott |
| `contextualGrounding` kód — „a szöveges tiltószó-felismerést NE másold biztonsági kapuként" | **Megtartva és megerősítve:** a „ne írj" KÉPESSÉGHATÁR, nem szólista — minden művelet `writes: false`, zárt `ACTIONS` listából, zárt paraméter-mezőkkel. Az `injectionFindings` csak TÁJÉKOZTAT, nem tilt (KUKA-203) |
| `VS_AI_COMMAND_UNDERSTANDING_ARCHITECTURE.md` — „a régi kliensoldali nyelvi classifier/ragozási szótár NEM átvételi cél" | **Felülírt nyelvi megoldások, NEVESÍTVE:** (a) a V2 helyi stopword/szinonima-bővítési útját NEM vittük tovább általános nyelvértési stratégiaként (a MAI operátori utasítás ennél újabb); (b) a V3 saját karakter-szintű hasonlóság-szabályát NEM tettük okosabbá — helyette MEGJELÖLTÜK gyengének, és a téma eldöntését a modellre vittük (KUKA-285) |
| Board `CMD-VS-200-011-022 R1` — kanonikus FAQ-cím 30/30, de természetes kérdés csak 12/24 | **A tanulság beépítve a mérésbe:** a cím-egyezés nem bizonyít nyelvértést, ezért a találat FAJTÁJA (`exact` vs. hasonlóság) mért tény, és a gyenge találat önmagában modell-hívást indít |

**Amit a V2-ről NEM állítunk** (a SPEC kikötése): a V2 diós szerződése maga is alak-bizonyíték — az
élő DB-jelöltkeresés, a partnerelőzmény és az élő kontextusos rangsorolás ott részben halasztott.
Ezeket nem állítjuk kész, átemelhető működésnek.

---

## 4. R140 — a két történet, mindkét méreten, reset után újra

**A SPEC három leletét karakterre reprodukáltam** a javítás előtt: A@1280 zöld · A@390 a 11. lépésen
elakad (`targetPending`, kiemelve `nav-toggle`) · B mindkét méreten a 9. lépésen (9/18).

### 4/a. Az elakadások OKA — a SPEC kérése szerint szétválasztva (termék/tutor · adapter · tanú)

| Lelet | OK | Hol |
|---|---|---|
| **B, mindkét méret, 9/18** | a `switchWorkspace` ELMENTETTE a bemutató-átadást és kiürítette a futást, de **senki nem vette fel** — a visszaállás KÉT, kézzel felsorolt hívóhelyen élt. MÉRVE: a 17. iterációtól a buborék REJTETT, a `handover` OTT ÁLL a tárban | **termék/tutor** (`app.js`) |
| **B, a javítás UTÁN: s9-pörgés** | az átadás csak az ALANYT tárolta, a KÖNYVET nem — a visszaállás az ÚJ könyvhöz kötött, tehát a MEGTÖRTÉNT váltás mérhetetlen lett, és a lépés sosem záródott | **termék/tutor** |
| **A, 390 px, 11. lépés** | a ☰ megnyomása után a menü KINYÍLT és a cél MÉRHETŐEN látható lett (225×42 px), a futó bemutatót viszont **senki nem értékelte újra** — a buborék ugyanazt a „nyisd ki a menüt" mondatot mutatta, kilenc egymás utáni azonos állapoton át | **termék/tutor** |
| mellékelet | a feltáró-kattintásnak nem volt rövid határideje: egy beragadt lépés **9 × 30 másodpercet** evett | **tanú** |

**Egyik ok sem az adapter volt, és elnyelt kattintási hibából sem lett „sikeres váltás":** a tanú
minden állapotváltozásnál kiír egy sort, és a pörgés-őr NEVEZETTEN áll meg.

**Egy hibát magam vittem be a javítás közben, és a saját ellenpárom fogta meg:** a menü-feloldóba
SZINKRON újraértékelést tettem, a `go()` viszont ELŐBB csuk és csak UTÁNA rajzol — így a RÉGI DOM-ot
mértem, és a buborék pending és kiemelés nélkül maradt egy MÁSIK oldalon (KUKA-121). Az
újraértékelés ezért most **sorrendfüggetlen** (a mai feladat végén fut).

### 4/b. A mért eredmény

`npm run proof:demo-walk` → **66 állítás · 0 piros**, négy végigjárás (A és B × 1280 és 390), mindegyik
után **reset UGYANABBAN a lapban és a TELJES folyamat MÉGEGYSZER**. A végállapot önálló elvárásként
mérve: a meghívott VALÓBAN tag · a MENNYISÉG látszik (a megadott készlet-jog hatályos) · az ÁR
viszont NEM, **nevezett hiánnyal** (`not_available`), nem üres mezővel.

### 4/c. És az őr tud pirosra váltani — KUKA-092

Külön munkamásolaton visszarontottam mind a három javítást, egyenként:

| Rontás | Eredmény | A visszatérő tünet |
|---|---|---|
| a visszaállás nem fut | **PIROS 4** (kód 1) | `reentry` 9/18, mindkét méreten — az EREDETI lelet |
| az átadás elveszti a könyvet | **PIROS 4** (kód 1) | `reentry` s9-pörgés, `account-switcher` kiemelve |
| a menü nem értékel újra | **PIROS 5** (kód 1) | `inviteRevoke` s11 @390 **és** `reentry` s10 @390 |

A harmadik rontás **többet fogott, mint az eredeti lelet**: a `reentry` s10-es elakadását az R141-es
futás el sem érte, mert előbb meghalt a 9. lépésen.

---

## 5. A chat felelősségi határa, a provider állapota, és ami hiányzik

### 5/a. A határ — ahogy az R142 §5 kéri

**A külső modell dolga** a szabad szöveg, a nyelv, a szinonima, az elírás, a többkörös utalás és a
javítás értelmezése. **A VS dolga** a hiteles adat, az elérhető képességek, a jogosultság, az
ellenőrzött előnézet és a végrehajtás. Ez a kör ebből a következőt VÁLTOZTATTA MEG:

1. **A kapu megszűnt (AST-06).** A modell-hívást NEVEZETT feloldó dönti el (`modelNeed`), nem a helyi
   találat-szám. Hat ok HÍV (`local_hits` · `weak_only` · `no_match` · `non_latin_question` ·
   `no_tokens` · `history_followup`), egy NEM: `nothing_to_interpret` (egyetlen betű sincs és
   előzmény sincs — „a puszta FAQ/oldalmegnyitás ne kapjon szükségtelen többlépcsős hívást").
   A döntés a VÁLASZBAN is ott van (`model_need`), tehát mérhető.
2. **Korlátos capability-index.** Nulla vagy gyenge helyi találatnál a modell az ELÉRHETŐ képességek
   FEJLÉCÉT kapja (azonosító · cím · állapot · verzió, TÖRZS nélkül, legfeljebb 40) — nem a teljes
   kézikönyvet. A megjelenő mondatot továbbra is a SZERVER állítja össze a nyelvcsomagból.
   **Mérve:** indexből hivatkozott blokkra a válasz karakterre a forrás mondata.
3. **Az írás nem kapu (TOK-01).** A darabolás írás-független; a kínai meghívási kérdés eddig **0**
   szó-darabot adott, most van mérhető tartalma, és az ÍRÁST a mérés megnevezi. A latin padló
   VÁLTOZATLAN. **Amit ez nem:** nem nyelvértés és nem tövező — a fordítás a modellé, és a VS-be
   SZÁNDÉKOSAN nem épül nyelvenként bővülő mondatértelmező.
4. **A hasonlóság nem dönt témát (TOK-02).** A mért téves témaválasztás OKA: a `keresek` szó
   illeszkedett a „Új megerősítő levél **kérése**" cím `kerese` darabjára (ékezet-leszedés után
   közös előtag 6). A találat FAJTÁJA most mért tény, a csak hasonlóságon álló találat `weak`, és a
   rendezés a pontos találatot előre veszi. **Mérve: a téves téma többé nem az első találat.**
5. **A „ne írj" KÉPESSÉGHATÁR, nem szólista.** Változatlanul: zárt `ACTIONS` lista, zárt
   paraméter-mezők, minden művelet `writes: false`. A minta-felismerés TÁJÉKOZTAT (KUKA-203).

**Amit MEGÉPÍTETTÜNK, de ALAPBÓL KIKAPCSOLTUNK — és ez kimondott döntés (AST-07).** A SPEC kéri,
hogy a blokk-összeállítás ne legyen kizárólagos válaszforma. A szerződés kész és mérve van:
ellenőrzött forrás-rész + KÜLÖN megjelölt következtetés, és forrás-rész nélkül a próza nem jelenik
meg. **BEKAPCSOLVA viszont az R93-as battéria (b) állítása azonnal pirosra váltott:** a külső fél
ellenpéldája — a helyes jelölőkkel ellátott, de tartalmilag HAMIS mondat („Der Vshop stellt bereits
echte Rechnungen aus.") — visszakerült a képernyőre, csak „következtetés" felirattal. **A jelölés
nem teszi ártalmatlanná a téves TÉNY-állítást** (KUKA-235), a prompt-mondat pedig kérés, nem őr
(KUKA-203). Ezért: `VS_AI_GROUNDED_PROSE` alapból KI, a régi őr ÉRVÉNYBEN, és MINDKÉT állás mérve
(`verify:app-findings-r142` D szakasz) — az R142 §6 utolsó pontja szerint („ne pusztán töröld a
piros őrt"). **A bekapcsolás feltétele kimondva:** élő szolgáltató + a §6 szerinti KÜLÖN
kérdéskészlet a próza tartalmi minőségére.

### 5/b. A provider tényleges állapota

```
Chates segéd (élő modell) — NINCS CSATLAKOZÁS
  kapcsoló:  VS_AI_PROVIDER
  hiányzik:  VS_AI_PROVIDER · VS_AI_API_KEY · VS_AI_BASE_URL (szolgáltatótól függően)
  következmény: élő modell-válasz NEM indítható; a helyi keresés, a GYIK,
                az oldaltérkép és a bemutató modellhívás nélkül működik
```

Ez **külső beállítás, nem hiányzó kód.** A csatlakoztathatóság kész; az ELMARADT élő bizonyíték
pontosan ez: **nulla valódi végponti modellhívás ebben a körben.** Minden AI-mérés helyi csonkkal
ment.

### 5/c. A diós ellenpárok és a hiányzó domain-képességek

**NEM ÉPÜLT MEG EBBEN A KÖRBEN, és ezt a lap kimondja.** A SPEC §7 hat kötelező kontextusos esetet
ír elő (1000 kg héjas beszerzés · 2 kg dióbél eladás · ELLENPÁR ugyanarra a mondatra más
partnerelőzménnyel · dióolaj liter / tömeg-térfogat inkompatibilitás · diótörés létező recept és
készlet alapján · többfordulós javítás több nyelven). Ebből a kör a **bejáratot** készítette el: a
mondatok eljutnak a modellhez (eddig nem jutottak el — mérve 0 találat mindkét diós mondatra), és a
modell korlátos indexet kap. **A jelölt-választó és az előnézeti út NEM épült meg.**

**A hiányzó domain-képességek, megnevezve:** a V3-ban nincs igazolt beszerzés-, értékesítés- vagy
gyártás-modul; a termék-, partner- és folyamat-oldalak MINTA-oldalak fixtúrából. Ezért a diós esetek
ma **nem vezethetnek valódi műveletig** — a felületnek és a jelentésnek ezt kell mondania, nem egy
terméklista megnyitását „tervezett műveletként".

**Ami mérve VAN a diós mondatokon:** a tokenizálás (`veszunk · berenykerttol · 1000 · diot`), a
nulla helyi találat NEVEZETT oka (`no_match`), és hogy ez az ok **modell-hívást indít**.

---

## 6. Bizonyíték — friss / örökölt / szintetikus / élő / hiányzó

**Forrás-SHA (induló fej, az R141 záró commitja):** `011803b4c00e180cc22dd7bee92e1f881cc8f9f1`
**Záró SHA:** lásd a commit-láncot a `claude/eager-wright-3hwupf` ágon (a lap feltöltésekor
`529dd50` + a lefedési javítás commitja).
**Mérve:** a `main` ebben a pillanatban 174 committal LE VAN MARADVA ettől az ágtól — a SPEC „régi
main nem megfelelő alap" kikötése így visszamérve igaz.

| Bizonyíték | Szint | Mi ez |
|---|---|---|
| `proof:demo-walk` 66/0 | **FRISS · FUTTATOTT (böngésző)** | a két történet négy végigjárása + a h1–h4 ellenpárok |
| rontás-menet (3 × PIROS) | **FRISS · FUTTATOTT** | külön munkamásolaton, a javítások visszarontásával |
| `verify:app-findings-r142` 23/23 | **FRISS · FUTTATOTT** | élő HTTP + helyi szolgáltatói csonk, ellenpárokkal |
| `verify:lefedes` 9/0 | **FRISS · FUTTATOTT** | a 21 nyitott hiány NEVESÍTVE, plafonnal; két ellenpár a VALÓDI feloldót hívja. RONTÁSRA PIROS (mérve: egy tétel kivétele a listából → L2 + L4 piros, kód 1) |
| `verify:tutor` 92/92 + 14/14 | **FRISS · FUTTATOTT** | a horgony-pótlás visszamérése |
| `verify:i18n` 49/49 + 6/6 | **FRISS · FUTTATOTT** | HU/EN/DE 774→776 kulcs, hiány 0 |
| `verify:kuka` 587/587 | **FRISS · FUTTATOTT** | 5 új bejegyzés; az alapvonal mérése: **0 változott · 0 eltűnt · 5 új** |
| a 16 korábbi app-battéria | **ÖRÖKÖLT, de ÚJRAFUTTATVA** | mind zöld a mai forráson |
| a szolgáltatói ág | **SZINTETIKUS** | helyi csonk — nem élő modell |
| élő modell-válasz | **HIÁNYZÓ** | nincs engedélyezett provider (5/b) |
| HTTP/adatbázis a bemutató mögött | **HIÁNYZÓ, kimondva** | `demo-adapter.mjs` jelölt csonk |
| a diós kontextusos út | **HIÁNYZÓ** | csak a bejárat készült el (5/c) |

**Egy mérési hibát a saját munkámban is kimondok:** az első futásomban a `verify:app-findings-r75`
szkriptnevet használtam, ami NEM LÉTEZIK (a helyes név `verify:app-findings`), és az npm üres
kimenettel 1-es kódot adott — ezt egy pillanatra visszacsúszásnak olvastam. A battéria valójában
**73/73 PASS**. A nem futott nem „piros" (KUKA-127).

---

## 7. Fogyasztás

**Csomag-ablak:** 2026-10-02T15:50:31Z (a parancs board-időbélyege) → a kör zárása.

| Mérés | Érték |
|---|---|
| hívás | **277** |
| fő-szál kontextus **medián** | **410 049** |
| fő-szál kontextus **max** | **636 652** |
| 400 ezer fölötti hívás | 144 |
| **ügynök-bemenet** | **0 (0 ügynök)** — a SPEC „egy fő végrehajtó, automatikus alügynök nélkül" kikötése szerint |
| friss bemenet | 554 |
| cache-írás · cache-olvasás | 593 511 · 110 676 459 |
| kimenet | 267 504 |
| lefedettség | **teljes** (1 átirat, 277 hívás, minden modell-válasz usage-dzsal) |
| kontextus-sáv | **CHATVÁLTÁSI JELZŐ ELÉRVE** (410 049 ≥ 400 000) |
| modellhívás a SEGÉDBEN | **0 valódi** (nincs provider); a battériában csonk-hívások |
| sikertelen szolgáltatói hívás | nem volt — valódi hívás sem volt |
| latencia | valódi végponti latencia **NINCS mérve** (nincs provider); a csonk-hívásokon nem értelmes |

**Gépi alak a repóban** (a következő munkamenet ezt olvassa, nem újraméri):
`docs/70_PLANNING/V3_R143_FOGYASZTAS_LELTAR.json` — tartalom nélküli: ellenőrizve, hogy
`prompt` · `content` · `text` · `message` · `question` · `answer` · `email` · `token` mező
EGYETLEN példányban sem szerepel benne.

**A sávból következő döntés:** a FUTÓ munkablokk lezárva; a **következő önálló nagy blokk** (a 2/d
szerinti tartalmi pótlás és az 5/c szerinti diós kontextusos út) **friss beszélgetésben induljon**
(D-VS-3083). Ez nem a csomag feladásának a jele, hanem a kimondott munkarend.

---

## 8. Döntések és tanulságok, amiket ez a kör rögzített

**Döntések:** D-VS-3096 (a bemutató-átadás SZABÁLY, nem hívó-lista) · D-VS-3097 (a lefedési
népesség a tényleges alkalmazásból) · D-VS-3098 (a helyi találat nem a modell kapuja).

**KUKA-bejegyzések** (mind gépi jellel, `verify:kuka` 587/587):

- **KUKA-281** — a KUKA-279-et ugyanabban a gépezetben megismételtem: a visszaállás KÉZZEL
  FELSOROLT hívóhelyeken élt, és a harmadik útról kimaradt.
- **KUKA-282** — megépítettem, MIRE várunk; azt nem, hogy MIKOR nem várunk tovább.
- **KUKA-283** — a nézet PÁR, az átadás viszont csak a felét vitte.
- **KUKA-284** — a helyi, latin szókincsű kereső korlátja lett az AI nyelvértésének belépési kapuja.
- **KUKA-285** — a karakter-szintű hasonlóság döntött témát, és a kézenfekvő küszöb-hangolás
  egyszerre hatástalan és romboló volt (mérve: a hibás eset egyről HÁROM-ra nőtt).

**A kör legfontosabb saját tanulsága, amit a következő kör örököl:** a KUKA-281 egy MÁR RÖGZÍTETT
tanulság ismétlése volt. A tanulság helyes volt, a JAVÍTÁSA viszont hívóhelyek kézi listáján állt —
és a „minden úton lefut" mondat alatt két kézi hívás volt. **Ha egy szabályt „minden útra" ígérünk,
a szabály álljon ott, ahol az állapot keletkezik, és az alapállás legyen a biztonságos.**

---

## 9. A TELJES SÖPRÉS — és ami nem fejeződött be

`npm run verify:sweep` a kör commitján: **34 verifier, 1446 s — 32 zöld · 0 környezeti kihagyás ·
1 PIROS · 1 NEM FEJEZŐDÖTT BE.**

**A PIROS: `verify:capability-witness` 8/11 — ÖRÖKÖLT, és ezt MEGMÉRTEM, nem feltételeztem.**
Három rögzítés elavult (`v3-ui-slice` · `v3-vertical-slice` · `v3-user-facing-text`: mért `present`,
rögzített `absent`). Az R141-es alapon (`011803b4`) külön munkamásolaton futtatva **ugyanez a három**
— tehát nem ebben a körben keletkezett. A rögzítés a **V2 repó** board-regiszterében áll
(`/home/user/vs/tools/chatops-board/config/matrix-capabilities.json`), amit ez a csomag kimondottan
nem módosíthat (a SPEC tiltása), ezért itt nem javítható.

**Egy mérési hibát itt is kimondok:** az első base-mérésem ÉRVÉNYTELEN volt. A munkamásolatot
`/tmp/r141base`-re tettem, a tanú viszont a rögzítést `ROOT/../vs` úton keresi — ott nincs `vs`,
tehát regiszter NÉLKÜL mért, és hamis 11/11-et adott. A második, `/home/user/r141base` úton végzett
mérés találta meg a regisztert, és az adta a valódi 8/11-et. A nem mért nem „zöld" (KUKA-122: az
örökölt pirosat a SAJÁT ághoz mérni hiba).

**A NEM FEJEZŐDÖTT BE: `verify:external-checks` (901 s a 900 s türelemnél).** A CLAUDE.md szerint ez
NEM kihagyás és NEM zöld, ezért KÜLÖN futtattam. **A saját eredménye: 14/19 program MEGFELEL,
5 ELTÉRÉS (`r79` · `r59a` · `r57a` · `r59` · `r57`), kilépés 1.**

**Mi az öt eltérés — a napló szerint, nem feltételezésből:** `r79` → a darabolt futás ideiglenes
egység-fájlja hiányzik (`ENOENT … /tmp/r79-…/v3ref/units/unit-2-of-18.json`), 572 276 ms futás után ·
`r59a` → HIÁNYZIK a részletes eredmény-artefaktum, a program 1-es kóddal zárt · `r57a` → 5/9, és az
E02 esetnél a `pass` nem logikai érték · `r59` és `r57` → a nem darabolt eredeti alakok, amiket a
lánc saját megjegyzése szerint ezen a 4 vCPU-s futtató-gépen a 15 000 ms-os korlát állít meg
(„ott a MÉRÉS akad el, nem a kód bukik" — KUKA-089). Mind az öt a MÉRÉS-LÁNC saját hibája, nem
mag-lelet.

**AMIT EHHEZ MEGMÉRTEM — és amit NEM.** MÉRVE: a `v3ref/` fa — a MAG és MINDEN ellenőrző program —
**bájtazonos az induló alappal** (`git diff 011803b4 HEAD -- v3ref/` a generált eredmény-fájlokon
kívül: **0 fájl**). Tehát sem a mért kód, sem a mérő program nem változott ebben a körben, így az
eltéréseket a változásaim nem okozhatták. **NEM MÉRVE, ezért nem is állítom:** nem futtattam le a
láncot az alap commiton, tehát azt nem bizonyítottam, hogy az eltérések SZÁMA és ALAKJA ott
karakterre ugyanez — csak azt, hogy a bemenetük változatlan. Ez NEVESÍTETT nyitott tétel a következő
csomagnak (KUKA-122: az örökölt pirosat nem a saját ághoz mérjük).
