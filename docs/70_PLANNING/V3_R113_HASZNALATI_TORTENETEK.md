> **Kör:** R113 · **Sáv:** Claude-v3 · **Állapot:** lezárt

Repó: valach-system

# R113 — AZ ÖT HASZNÁLATI ÚT VÉGIGVIHETŐ, EGY BEMUTATÓBÓL KIPRÓBÁLHATÓ, HÁROM NYELVEN ÁTNÉZVE

CMD-VS-300-002-002 R113 — REPORT (válasz az R112 SPEC-re)
PR-VS-300 · STEP-VS-300-002 · 2026-09-29
Sáv: Claude-v3 · Parancs: `CMD-VS-300-002-002 R112 — SPEC` (chatgpt-v3) · szülő: R111

**Forrás-kötés:** repó `valach-family/valach-system` · ág `claude/focused-sagan-gfuieq` · induló fej
**`7385977544349ba29ec2f900772662ebeb6aaee8`** (az R111 átadó commitja). A parancs „utolsó
függetlenül vizsgált feje", `d610b51f…`, ennek közvetlen szülője — gépileg ellenőrizve
(`git merge-base --is-ancestor`); a kettő között csak az R111 szövegének elmentése áll. A parancs
szó szerint: `v3ref/source-documents/R112_board_v1.md`. A munka commitjai: `8fb44f2` · `038879b` ·
`ba05b93` · `dffde96` (a próbák szövegkötése — a végső mérés commitja) · és a záró commit ezzel a lappal, a
bizonyíték-lappal és a leltárral. Merge, telepítés, V2-módosítás, új előfizetés, core/CMD/PR-zárás nem történt.

---

## 1. RÖVIDEN — MI LETT HASZNÁLHATÓBB

- **A meghívott ember bemutatója a helyén ér véget.** Ha valaki a bemutató közben elfogadja a
  meghívást, a rendszer a sikeres elfogadás után átviszi a vállalkozás fiókjába — és a bemutató
  eddig ebben az átlépésben nyomtalanul eltűnt. Most a sikeres elfogadás után összegzéssel zárul, és
  kimondja, mi készült el. (A külső ellenőrző fél F111-01 lelete.)
- **A fejléc mindig megmondja, hol vagy és milyen minőségben.** Például: „anna@… · Minta Kft ·
  szerepkör: Fiókkezelő". Eddig itt a rendszer belső, csak magyar mondata állt, angol és német felületen is.
- **A meghívó oldala a helyzethez illő következő lépést mondja, a választott nyelven.** Új címzettnek:
  regisztrálj; meglévőnek: lépj be; más címmel belépettnek: lépj ki, és azzal a címmel lépj be, amelyre
  a meghívás szól; lejárt vagy felhasznált meghívónál: kérj újat. Eddig ez a sor a rendszer belső magyar
  üzenete volt, angolul és németül is.
- **Ha közben más ember lép be ugyanabban a böngészőben, a korábbi elfogadás sikere nem neki szól.** A
  lap kimondja, hogy másik felhasználó lépett be, és a másik ember bemutatóját sem zárja le. (Saját
  lelet a munka közben, javítva.)
- **Az öt használati út egy közös nyilvántartásban áll.** Minden úthoz rögzítve: mely funkciókból áll,
  melyik súgó, gyakori kérdés és bemutató tartozik hozzá, és melyik böngészős próba bizonyítja. Egy
  gépi őr pirosat ad, ha bármelyikből hiányzik valami — két valódi hiányt már meg is talált (5. szakasz).
- **A magyar, angol és német szöveg tartalmilag átnézve.** Nyelvenként 966 szövegtétel; magyarul 181,
  angolul 165, németül 166 tétel javult, 46 új került be, törölt nincs. Egy közös fogalom-tábla
  rögzíti, melyik fogalomnak mi a szava mindhárom nyelven (belépés · személyes fiók · vállalkozási
  fiók · tagság · hozzáférés · adatkör · meghívás · …).
- **Kattintható bemutató egy lapon.** Az öt történet és a meghívó-helyzetek egy belépőről
  választhatók; minden lépésnél rövid magyarázat, egy megnyomható gomb, a látható eredmény,
  visszalépés és újrakezdés — és külön megnevezve, mi szimuláció, és mit bizonyít a valódi alkalmazás
  böngészős próbája.

**Amit ez NEM jelent:** nincs új jogosultsági modell, vállalati hierarchia, adózás, számlázás, Vshop
vagy más üzleti modul; a nagyvállalati működést ezek a történetek nem igazolják. Az AI nem fogad el
meghívót és nem ad jogot; élő MI-szolgáltató nincs bekötve. A szövegátnézés NEM független anyanyelvi
lektorálás.

---

## 2. AZ ÖT TÖRTÉNET — ÁLLAPOT ÉS BIZONYÍTÉK

Előbb a meglévő bizonyítékokat rendeltem a történetekhez, és csak a hiányzó vagy a változtatás által
érintett helyen bővítettem (R112 §4). A kötés gépi alakban áll: `v3app/knowledge/stories.mjs`
(STR-01); a `verify:tutor` TUT11 méri, hogy minden bizonyíték-bejegyzés PONTOSAN egy létező próbát
jelöl. A mért eredmény a végső teljes böngésző-futásból: `docs/70_PLANNING/V3_R112_TORTENETEK_BIZONYITEK.json`
(tartalom nélkül: próbafájl · címkezdet · futás · zöld).

| # | Történet | Állapot | Bizonyító próbák a valódi alkalmazásban (**új** vastagon) | Tárolt vagy szerveroldali következmény, amit a próba mér |
|---|---|---|---|---|
| 1 | Magánszemély | végigvihető | magfolyam 1–3 · H01 · R91-04/05 · R93-04 · R97-01 · **R112-S1** (németül: regisztráció → megerősítés → belépés → személyes fiók → ki- és belépés, a nyelv marad) | a nyelv a SZEMÉLYHEZ tárolva (új munkamenet is azt kapja) |
| 2 | Egyedül dolgozó vállalkozó | végigvihető | magfolyam 4 · H03 · H05 · UX-14 · R93-01/02/03 · **R112-S2** | egy személy, egy személyes kör; vállalkozási adat CSAK a céges fiókon; hibás adóazonosítónál nem születik félkész fiók |
| 3 | Bővülő kisvállalkozás | végigvihető | magfolyam 6/8/10 · H02 · R109-01 · R109-03 · **R112-I1** (új címzett, HU/EN/DE) · **R112-I2** (már regisztrált címzett, nyelvváltással, HU/EN/DE két nyelvpáron) | a tagság a meghívó fiókjában jön létre; a meghívó adatköre plafon, nem megadott jog |
| 4 | Több vállalkozásban dolgozó személy | végigvihető | magfolyam 11 · H08 · R77/F77-01 · R83/F83-02 · R85/F85-02 · R89-09 · **R112-S4/S5** | a régi fiók űrlapja, adata és chat-válasza nem kerül át; a más fiókba küldött régi gomb nem ír |
| 5 | Kezelő és munkatárs | végigvihető | magfolyam 12/13 · H07 · H09 · UX-09…13, UX-22 · **R112-S4/S5** | engedély → a munkatárs TÉNYLEGES nézete → megszüntetés; a `scope_grant` és a `membership` sora mérve, a megszüntetés után a munkatárs nézete eltűnik |
| + | Meghívó-helyzetek (új · már regisztrált · rossz cím · lejárt · felhasznált · ismeretlen) | végigvihető | magfolyam 7 · H06 · R109-04 · **R112-I3** · **R112-I4** · **R112-I5** | a lejárt meghívó sora változatlan (a fejlesztői óra lép, a lejáratot nem írtuk át); ismételt elfogadásra nincs többlet-tagság és -jog |

**Mért eredmény a végső teljes futásban:** **41 bizonyíték-bejegyzés, 44 próba-futás** (a nyelvenként
futó próbák külön számolva), **mind zöld**; hiányzó vagy „nem mért" bejegyzés nincs. A futás
2026-09-29T10:07:58Z-kor indult; a bizonyíték-lap commitja `dffde96`. A futás bemenete — az alkalmazás
és a próbák — karakterre azonos e commit fájával (`git diff --quiet HEAD -- v3app tests tools`); a
generátorban egyetlen eltérés volt, a lapcím, ezért a bemutató próbái a végső lapon külön újrafutottak
(10/10 zöld).

---

## 3. A KORÁBBI TÉTELEK — LEZÁRT ÉS FENNMARADÓ RÉSZ

| Tétel | Állapot | Mivel igazolt |
|---|---|---|
| **F111-01** — a bemutató lezárása az IGAZOLT elfogadás után | **lezárva** | Egy közös lezáró (`carryTourBeforeSwitch`) fut a fiókváltás ELŐTT a vállalkozás létrehozásakor és a meghívás elfogadásakor; a lezárás a SZERVER sikeres válasza után történik, a tagság puszta léte nem zárja le. **Ellenpróba a régi fejen** (`7385977`, külön munkafán): a kiterjesztett R109-03 ott pontosan a lezárás-állításnál bukik, az új fejen zöld. |
| **F111-02** — a teljes út és az elutasítások bizonyítéka | **lezárva** | R112-I1 ×3 nyelv (teljes út a súgótól a nyelv megmaradásáig) · R112-I2 ×2 · I3 (személyváltás + késő válasz) · I4 (lejárat a fejlesztői órával, a kiadott sor változatlan, az óra a végén visszaáll) · I5 (ismételt és ismeretlen meghívó) |
| **P109-01** — a meghívott saját súgója | **lezárva (R110)**, az R112-ben változatlanul áll | R109-01…06 zöld a végső futásban |
| **P109-02** — HU/EN/DE tartalmi átnézés | **elvégezve a hatókörön belül** — a maradék a 6. szakaszban nevesítve | fogalom-tábla + I18N08 őr; `verify:i18n` zöld |
| **P109-03** — kattintható bemutató | **elkészült** | 4. szakasz; R112-D1 · D2/en · D2/de · D3 zöld a végső fájlon |

---

## 4. A BEMUTATÓ — MEGNYITHATÓ, KIPRÓBÁLÁSI SORRENDDEL

**Megnyitás:** https://claude.ai/artifact/7sSBZSNFTAAf4dFpajN7EM (privát link: az operátor nyitja meg;
másnak a lap Megosztás menüjéből adható) — ugyanez a repóban: `docs/_olvashato/V3_R112_TORTENETEK_BEMUTATO.html`
(a meglévő generátor írja: `npm run docs:r89-bemutato`; új demó-platform nem készült).

**Kipróbálási sorrend (kb. 10 perc):**

1. Nyisd meg a linket. Felül a sárga sáv mondja ki, hogy ez **szimuláció**: a lap nem ír adatot, nem
   küld levelet, nem fogad el meghívót.
2. A „Történetek" nézetben válaszd az **1. Magánszemély** utat, és kattints végig a lépéseken. Minden
   lépésnél fent a magyarázat, középen a képernyő képe, alatta a megnyomható gomb.
3. A nyelvválasztó lépésnél válts nyelvet, majd lépj ki és be: a lap mutatja, hogy a nyelv megmarad.
4. Az **Újrakezdés** gombbal indítsd elölről, vagy válaszd a **3. Bővülő kisvállalkozás** utat: a
   kezelő meghív, a címzett belép, elfogad, és a helyes fiókba kerül.
5. A **Meghívó-helyzetek** közül nézd meg a más címre szóló, a lejárt és a már felhasznált meghívót.
6. Bármelyik történet alján nyisd le „A VALÓDI alkalmazásban bizonyítva" részt: a valódi alkalmazásban
   futó próbák listája, a mért eredménnyel. Ami nincs mérve, az „nem mért" — nem zöld.
7. Nézd meg keskeny ablakban vagy telefonon is: ugyanez végigkattintható.

**Mi szimuláció, mi bizonyított:** a lap képernyői a valódi alkalmazás EGYSZERŰSÍTETT képei,
szintetikus adattal (`pelda.hu` címek, „Minta Kft"). A feliratok, magyarázatok és eredmény-mondatok
viszont a valódi nyelvcsomagokból jönnek, a történetek kötése pedig a közös nyilvántartásból — tehát
nincs második, eltérő szövegváltozat. Hogy a valódi alkalmazás ugyanezt teszi-e, azt a lap alján
felsorolt böngészős próbák bizonyítják.

**Átadás előtti ellenőrzés (R112 §3):** a kész lapot ténylegesen megnyitottam és végigkattintottam
böngészőben: R112-D1 (asztali nézet: minden történet végig, újrakezdés, visszalépés) · R112-D2/en,
R112-D2/de (keskeny nézet: nincs kilógás, nincs feloldatlan szöveg) · R112-D3 (nincs hivatkozás nem
létező fájlra, a súgó-bemutató mód is működik) — zöld a végső fájlon. A közzétett link tartalmát
visszaolvasva ellenőriztem. „Oldal nem található" nincs.

---

## 5. AMIT MUNKA KÖZBEN TALÁLTAM ÉS JAVÍTOTTAM

| Lelet | Ki találta | Mit tettem | Gépi jel |
|---|---|---|---|
| **KUKA-252** — a meghívás elfogadása a saját fiókváltását futtatta, lezárás nélkül | külső fél (F111-01) | közös lezáró a váltás előtt; a lezárás oka a pillanatképben | R109-03 (ellenpróba a régi fejen) |
| **KUKA-253** — a mag magyar üzenete főszövegként, angol és német felületen is (meghívó következő lépése, elutasítások, fejléc) | saját | minden főszöveg a nyelvcsomagból: `refusalText` (egy feloldó, alias-táblával) · `inviteNextKey` · `actingAsText` | R112-I1/I2 mindhárom nyelven; `verify:i18n` |
| **KUKA-254** — a késve érkező elfogadás a közben belépett MÁSIK embernek mondta, hogy csatlakozott | saját (az I3 próba írása közben) | a siker a KISZOLGÁLT személyhez kötve; eltérésnél „másik felhasználó lépett be" | R112-I3 |
| Egy funkció GYIK nélkül (kijelentkezés), egy történet bemutató-kötése eltért | a TUT11 őr | GYIK pótolva (a nyelv megmarad kijelentkezéskor is), a kötés javítva | `verify:tutor` TUT11 |
| Bemutató-lap: rejtett rész látszott, feloldatlan helyőrző egy feliratban, német cím kilógott keskeny nézetben, két eredmény-mondat összefolyt, a hozzáférés-vesztés képe nem a valódi állapotot mutatta | a bemutató saját próbái (D1–D3) | mind javítva | R112-D1…D3 |
| **14 régi böngészős próba a régi feliratot égette be** — a szövegjavítás után a megfogalmazást mérték, nem a működést (KUKA-237 megsértése) | az első teljes futás | a próbák a mondatot a NYELVCSOMAGBÓL veszik (`oneOfTexts` segéd a `tests/e2e/helpers.mjs`-ben); a működés és az elvárt viselkedés nem változott | végső teljes futás |

**Nem azonosított egyszeri bukás — nevesítve, nem „flake":** az R112-I3 az első teljes futáson egyszer
nem találta az értesítő sávot (a lap belépési nézetben állt). Kb. 60 ismétlésben, terheléssel is, nem
jött elő újra, és a „késve induló kérés régi sütivel" magyarázat kísérletben nem igazolódott. A próba
bukáskor most a lap ÁLLAPOTÁT rögzíti mellékletként, hogy egy következő előfordulás adatot hozzon. A
két későbbi teljes futásban és a célzott futásokban zöld; a hiba oka továbbra sincs azonosítva.

---

## 6. SZÖVEGÁTNÉZÉS — HATÓKÖR, MÓDSZER, MEGMARADT HIÁNYOK

**Hatókör:** a három bekapcsolt nyelv (HU · EN · DE) TELJES csomagja: képernyők és űrlapok (`PAGE` ·
`NAV` · `UI` · `STATE`), levelek (`SRV`), hiba- és elutasítás-szövegek (`REASON` · `UNBOUND`),
sablonok (`TPL`), súgó (`HELP` · `KB`), gyakori kérdések (`FAQ`), bemutatók (`TOUR` · `TOURUI`), a chat
tudásanyaga és keresése (`CHAT` · `SEARCH`), és az új történet-szövegek (`STORY`). **Mérve**
(szkripttel, a régi és az új csomag összevetésével): nyelvenként **966** tétel; módosult **HU 181 · EN
165 · DE 166**; új **46** nyelvenként; törölt **0**.

**Módszer:** (1) gépi pásztázás — kerülendő szavak, csupa nagybetűs kiemelés, belső gépi szavak a
főszövegben; (2) EGY szűk, csak olvasó ellenőrző ügynök a teljes HU/EN/DE szövegre (a parancs
engedélye szerint egy, automatikus szétosztás nélkül; ~70 javaslat, többségük beépítve); (3) saját
átnézés a képernyőkön, a próbák futtatásával. A tudásanyag verziója minden érintett funkciónál emelve
(elavult szöveg nem maradhat — a `verify:i18n` ezt méri).

**A fogalom-tábla otthona:** a csomagok `TERMS` csoportja (15 fogalom, mindhárom nyelven) és a
`TERMS_AVOID` lista; az I18N08 őr pirosat ad a kerülendő szavakra és a csupa nagybetűs kiemelésre.
Magyarul például: belépés · személyes fiók · vállalkozási fiók · közös fiók · tagság · tag · fiókkezelő
· hozzáférés · adatkör · meghívás · bemutató · súgó · gyakori kérdések · csomag · MI-szolgáltató.

**Megmaradt hiányok — nevesítve:**

- **Nem független anyanyelvi lektorálás.** Az átnézést AI végezte; anyanyelvi lektor nem olvasta.
- A **„bemutató"** szó két jelentésben él: a mintaadatos bemutató-mód („Bemutató · mintaadatok") és a
  kattintós bemutató. Szétválasztásuk döntést kér (új szó az egyikre).
- **„Kijelentkezés"** megmaradt (a „kilépés" ütközne a bemutatóból való kilépéssel).
- Döntést kérő, nyitott megfogalmazások: a „{fiók} adatainak megtekintése" sablon alakja; az
  adóazonosító kötelező volta és a közös fiók viszonya a súgóban; a megerősítetlen belépés
  állapotának szava.
- Apró, nem javított javaslatok: EN „Not given / Not known" kettőse; a „today's state" típusú
  fordulatok; HU „Riportok" menüpont; néhány bemutató-mondat.
- A fiókonkénti adat-hozzáférés összegzése NEM került a fejlécbe: a hozzáférést a használat helyén
  mutatjuk (az adatkör képernyőjén és a tag paneljén). Ez tudatos halasztás, nem hiány-elfedés.
- A két próba-nyelv (francia, arab próbanyelv) nincs bekapcsolva, és nem volt a hatókörben.

---

## 7. A BIZONYÍTÉK — TÉNYLEGES PARANCSOK ÉS EREDMÉNYEK

### 7.1 Böngészős próbák (Playwright, valódi HTTP-szerver és adatbázis)

- **Végső teljes futás** (`npx playwright test`, a végső kódon): **92/92 zöld**, 5,1 perc, soros
  futtatás, ismétlés nélkül (`retries: 0`).
- **Előtte, nevesítve:** az első teljes futás (a `ba05b93` fejen) **11 bukást és 14 nem futott
  próbát** adott — mind a 11 régi, beégetett feliratot várt (5. szakasz utolsó sora); a 14 a magfolyam
  soros láncának a 3. lépés utáni része. Javítás után célzott utánfuttatás: az érintett nyolc fájlból
  33 zöld és 3 bukás (két újabb régi felirat, és egy saját kötési hibám: rossz szövegcsoportot
  neveztem meg) → javítva → a három fájl **26/26 zöld**. Utána egy gépi keresés
  a próbák mind a 16 fájljában (és a segédfájlokban): a régi csomagban meglévő, az újból hiányzó beégetett mondat nem maradt.
- **Új próbák:** `v3app-r112-invite.spec.mjs` (I1/hu · I1/en · I1/de · I2 ×2 · I3 · I4 · I5) ·
  `v3app-r112-stories.spec.mjs` (S1 · S2 · S4/S5) · `v3app-r112-demo.spec.mjs` (D1 · D2/en · D2/de · D3).
- **Ellenpróba:** F111-01 — a régi fejen (`7385977`) az R109-03 pontosan a lezárás-állításnál bukik.
  TUT11 és I18N08 — négy, illetve egy rontásra bizonyítottan piros (a `verify:*` saját
  ellenpróba-szakasza).

### 7.2 Gépi őrök (célzott, a végső állapoton)

| Parancs | Eredmény |
|---|---|
| `npm run verify:i18n` | 49/49 · ellenpróba 6/6 |
| `npm run verify:tutor` | 86/86 · ellenpróba 14/14 (benne a TUT11 négy rontása) |
| `npm run verify:assistant` | 55/55 · ellenpróba 6/6 |
| `npm run app:selfcheck` | 57/57 |
| `npm run verify:app-findings` (R75) · `-r77` · `-r79` · `-r89` · `-r91` · `-r93` · `-r95` | 73/73 · 34/34 · 49/49 · 41/41 · 30/30 · 21/21 · 42/42 |
| `npm run verify:kuka` | 501/501 |
| `npm run verify:decision-numbers` | 4/4 (a következő szabad szám: D-VS-3086) |
| `npm run verify:artifact-naming` | 28/28 |
| `npm run verify:fogyasztas-meres` | 18/18 ellenpróba |
| `npm run verify:doc-html` | 9/9 (ez a lap is olvasható HTML-ként: `docs/_olvashato/V3_R113_HASZNALATI_TORTENETEK.html`) |

A teljes `verify:sweep` **nem futott**: a munkablokk lezárása a 400 ezres jelző után célzott
ellenőrzéssel történik (R107), és teljes söprést konkrét kiadási kapu nem kért. A böngészős teljes
futás ennek nem pótléka, hanem e csomag kiadási kapuja: a szövegátnézés minden képernyőt érintett.

---

## 8. A VÁLTOZÁS DARABJAI

- **Alkalmazás:** `v3app/public/app.js` · `tour.mjs` · `texts.mjs` · `inviteText.mjs` (új) ·
  `i18n/dict.mjs` · `i18n/hu.mjs` · `i18n/en.mjs` · `i18n/de.mjs`
- **Tudás és történetek:** `v3app/knowledge/features.mjs` · `v3app/knowledge/stories.mjs` (új, STR-01)
- **Gépi őrök:** `tools/vs_verify_tutor.mjs` (TUT11 + ellenpróbák) · `tools/vs_verify_i18n.mjs` (I18N08)
  · `v3app/findings_r91.mjs`
- **Bemutató:** `tools/v3_r89_bemutato.mjs` · `tools/lib/v3_tortenet_lejatszo.mjs` (új) ·
  `tools/lib/v3_tortenet_lejatszo.page.js` (új) · `tests/e2e/global-setup.mjs`
- **Próbák:** három új fájl (`v3app-r112-{invite,stories,demo}.spec.mjs`) · kiterjesztett
  `v3app-r109-invite.spec.mjs` · a feliratkötés javítása: `helpers.mjs` és nyolc próbafájl (`core-flow` ·
  `r75` · `r77` · `r79` · `r81-ux` · `r83` · `r85` · `r89-tutor`) · a bemutató új nézet-választója miatt
  `r91` (R91-09)
- **Tanulság és döntés:** `contracts/retiredPatternRegistry.js` (KUKA-252 · 253 · 254) ·
  `docs/KUKA_ARCHIVUM.md` · `contracts/guardHome.js` · `contracts/kukaArchiveBaseline.json` ·
  `DECISION_LOG.md` (**D-VS-3085**)
- **Bizonyíték és mérés:** `docs/70_PLANNING/V3_R112_TORTENETEK_BIZONYITEK.json` ·
  `V3_R112_FOGYASZTAS_LELTAR.json` · `V3_R112_FOGYASZTAS_HIVASSOR.json` · ez a lap · a parancs szó
  szerint: `v3ref/source-documents/R112_board_v1.md`

---

## 9. MUNKAMENET ÉS FOGYASZTÁS — KÜLÖN

**A munkamenet-kérdés, megnevezve.** Az R111 friss beszélgetést kért. Az operátor az R112-t ebbe a
(korábban tömörített) beszélgetésbe illesztette; az R112 szerint „ha már elindultál, folytasd: ez a
bővítés önmagában nem új-chat ok" — ezért itt folytattam, a meglévő munkát megtartva. Mérve: a csomag
közben a kumulatív fő-szál kontextusmedián átlépte a 400 ezret (a teljes beszélgetésre **419 490**;
a csomag közbeni gyors mérés 322 hívásnál **412 903**-at mutatott), ezért ezt a munkablokkot
célzott ellenőrzéssel zártam; új feltárás, új funkció vagy opcionális teljes söprés a lezárás címén
nem indult. **A következő önálló nagy blokk friss beszélgetésben induljon.** (A medián a tömörítés
előtti, ~780 ezres hívásokat is tartalmazza.)

**Csomag-fogyasztás** (ablak: a parancs board-időbélyegétől, `2026-09-29T08:34:49.344Z` →
`2026-09-29T10:15:50Z`; munkamenet `217706c3-ecc2-5f7b-af35-558854c7df95`), lefedettség **teljes**: **369 hívás** (ebből 12 az egy
ellenőrző ügynöké) · friss bemenet 738 · cache-írás 1 586 010 · cache-olvasás 141 665 537 · kimenet
491 502 · ügynök-bemenet 2 098 319 (1 ügynök, a kísérleti 40 M-os jelző alatt) · fő-szál kontextus:
medián 355 818, maximum 783 787, 400 ezer fölött 159 hívás (sáv az ablakra: figyelmeztetés). Ébresztés:
operátori 1 (3 hívás) · tömörítés utáni folytatás 2 (354 hívás).

**Kumulatív munkamenet-jelző, KÜLÖN:** a teljes beszélgetés (2026-09-28T20:52Z óta) **701 hívás** ·
fő-szál kontextusmedián **419 490** · maximum 783 787 · 400 ezer fölött 366 hívás → sáv: **VÁLTÁS**. Az
ablak mediánja azért alacsonyabb, mert a tömörítés utáni hívások kisebb kontextussal futnak; a döntés
mércéje a kumulatív érték.

Gépi alak, tartalom nélkül: `docs/70_PLANNING/V3_R112_FOGYASZTAS_LELTAR.json` +
`V3_R112_FOGYASZTAS_HIVASSOR.json` (sorszám · idő · szereplő · modell · négy számláló · kontextus ·
ébresztés — üzenet és eszköz-kimenet NEM). A modell-azonosító mindkét fájlban semleges címkére cserélve
(`modell-1`, `modell-2`): a munkamenet szabálya szerint modell-azonosító nem kerül a repóba; a
darabszámok és a bontás változatlan. A mérés e lap megírása ELŐTT zárult; a commit, a
board-feltöltés és a válasz hívásai nincsenek benne. **Ebből költség, heti keretarány vagy
megtakarítás NEM számítható** — az ismeretlen költség null, nem nulla.

---

## 10. MI A KÖVETKEZŐ

- A következő önálló nagy munkablokk **friss beszélgetésben** induljon (400 ezres jelző). Az átadáshoz
  minden megvan: a parancs szó szerint eltéve, a kód commitolva és feltolva, ez a lap a boardon, a
  bemutató linkje fent, a fogyasztás-leltár és a hívássor a repóban.
- Döntést kér (6. szakasz): a „bemutató" szó kettős jelentése, és a három nyitott megfogalmazás.
- Anyanyelvi lektorálás, ha a termék ezt kiadás előtt megkívánja.
