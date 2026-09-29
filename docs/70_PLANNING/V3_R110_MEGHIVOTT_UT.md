> **Kör:** R110 · **Sáv:** Claude-v3 · **Állapot:** lezárt

Repó: valach-system

# R110 — A MEGHÍVOTT EMBER MOSTANTÓL A SAJÁT KÉPERNYŐJÉRŐL KAP SEGÍTSÉGET

CMD-VS-300-002-002 R110 — REPORT (válasz az R109 SPEC-re)
PR-VS-300 · STEP-VS-300-002 · 2026-09-29
Sáv: Claude-v3 · Parancs: `CMD-VS-300-002-002 R109 — SPEC` (chatgpt-v3)

**Forrás-kötés:** repó `valach-family/valach-system` · ág `claude/focused-sagan-gfuieq` · a parancs
ellenőrzött induló feje **`2ce0872ce8b14898f709608802db84e840c4e4e6`** (karakterre egyezett az
induláskor, idegen munka nem volt az ágon) · **kód-commitok: `36bbd2d` (P109-01) és `KOD_COMMIT_2`
(a böngészős lelet javítása + bizonyíték + lap)** · a parancs szó szerint eltéve:
`v3ref/source-documents/R109_board_v1.md`.

---

## 1. MIT JELENT EZ A HASZNÁLATBAN?

**Eddig a meghívott ember egyedül maradt azon a képernyőn, ahová a levélből megérkezett.** Látta,
hogy meghívták, de nem volt ott semmi, ami elmagyarázta volna, mi történik az elfogadással, melyik
fiókjával kell belépnie, és mit tehet, ha elakad. A súgóban pedig — és ez a kör legkellemetlenebb
lelete — **egyetlen kérdés sem volt a meghívásról annak, akinek szólt.**

**Ami mostantól igaz a meghívó képernyőjén:**

- **Egy kérdőjel a cím mellett** — megnyitja a meghívás elfogadásának súgóját.
- **Egy mondat, ami megmondja, mi történik:** „A meghívás elfogadásával a megadott hozzáférést kapod
  ehhez a fiókhoz."
- **Egy sor, ami mindig ott van:** be vagy-e jelentkezve, és melyik címmel. Mert a **személyes
  belépés és a vállalkozáshoz csatlakozás két külön lépés** — a meghívás nem hoz létre új személyes
  fiókot, és nem ad tulajdonosi jogot.
- **Két gomb a lap alján:** „Gyakori kérdések" és „Végigvezetlek". A végigvezetés négy lépésben
  elmondja, hová hívtak, melyik fiókkal vagy bent, mi a következő lépés, és hogy **az elfogadás a te
  kattintásod** — a bemutató „Tovább" gombja nem fogadja el helyetted.
- **A cím egy szó** („Meghívás"), a vállalkozás neve alatta, önálló sorban. Korábban egy mondatba
  volt beszőve („Meghívás ebbe a fiókba: X"), ami három nyelven három nyelvtani csapda.
- **A hibák megmondják a következő lépést:** „Ez a meghívás lejárt. Kérj új meghívót attól, aki
  küldte." · „Ez a meghívás másik e-mail-címre szól. Jelentkezz be azzal a címmel, vagy kérj új
  meghívót a sajátodra."
- **A siker kimondja, mit tettél:** „Elfogadtad a meghívást." — és a fiók azonnal meg is nyílik.

Mindez **magyarul, angolul és németül**, és a német a magyarhoz illő tegező hangot használja, ahogy a
csomag eddig is.

**Amit ez a kör NEM hozott** (és ez nem rejtett hiány, hanem kimondott döntés): a teljes felület és
tutor nyelvi átnézése (P109-02) és a kipróbálható bemutató (P109-03 bemutató-fele) **nem készült el**
— a miért az 5. szakaszban áll, számmal.

---

## 2. A LELET, AMIT A BÖNGÉSZŐS PRÓBA TALÁLT — a saját munkámban

A P109-01 kódja készen volt, a gépi őrök mind zöldek (`verify:i18n` 42/42 · `verify:tutor` 78/78 ·
`verify:assistant` 54/54 · `app:selfcheck` 57/57). **Aztán végigkattintottam a képernyőt**, és a
GYIK-gomb megnyitotta a panelt — **25 kérdéssel, amelyek közül egy sem szólt a meghívásról.**

**A gyökér:** a közös elérhetőségi feloldó a SZEMÉLYES térben elrejtette a `group` = `invite`
**egész csoportját**. A tiltás célja helyes volt (a személyes fiókodban nincs értelme mást meghívni,
tagokat kezelni, előfizetést váltani) — de a megfogalmazása egy **technikai csoport-név**, és
ugyanabban a csoportban lakik a **címzett saját útja** is. A meghívott ember pedig MINDIG a személyes
teréből indul: abban a vállalkozásban, amelybe hívták, még nincs tagsága.

**Miért nem fogta meg egyetlen őr sem:** mert a hiányzó súgó nem hibaüzenet, hanem **üresség**. A
kérdés egyszerűen nem volt ott — úgy, mintha nem is létezne ilyen kérdés. Ez a **KUKA-251**, és a
tanulsága rövid: *akinek a segítség szól, annak kell látnia*; a jogosultsági tiltást soha nem a
technikai csoport-nevére fogalmazzuk meg.

**A javítás:** a kivétel NEVEZETT és a funkción áll (`personal_space_ok: true`, indoklással), nem egy
újabb névsor a feloldóban. A kezelői oldal tiltása változatlan — és a gépi jel a kettőt **egy
állításban** méri, hogy a következő kör ne az egyiket „javítsa" a másikkal.

---

## 3. MI ÉPÜLT MEG — P109-01 (D-VS-3084)

**A NEVEZETT NYITOTT TÉTEL LEZÁRVA.** Az `invite.accept` eddig `tour: null` volt, kimondott indokkal
(R91/F91-01): a képernyője CSAK érvényes meghívó-hivatkozásból nyílik meg, tehát a súgó
**főoldaláról** indított bemutató nem létező célra mutatna. A megoldás **nem** mesterséges meghívó és
**nem** védett adat feltárása:

| a kötés | hogyan |
|---|---|
| a bemutató **`requires_invite`** | a SZERVER csak akkor kínálja fel, ha a munkamenetnek VAN meghívás-kontextusa (`resumeIntent` a `pending_intent` soron) — a tényt a mag mondja meg, nem a böngésző feltevése, és a meghívás TARTALMÁBÓL semmi nem szivárog ki vele |
| a bemutató a **képernyőn marad** | nem visz belső oldalra: ott jár, ahol a célja van |
| a négy lépés **mindig meglévő** pontokra áll | `invite-observe` · `invite-identity` · `invite-next` · `invite-actions`. A beváltó GOMB állapot-függő (csak a bejelentkezett, egyező címzettnek létezik), abból hamis megszakítás lenne (KUKA-228 · KUKA-232) |
| az utolsó lépés feladata **`invite.redeemed`** | a jelzés a szerver IGAZOLT `ok` válasza UTÁN megy ki, a képernyő elhagyása ELŐTT — a „Tovább"/„Befejezés" nem fogad el meghívást (KUKA-231), és egy elutasított beváltás nem zárja le sikeresen a bemutatót (KUKA-163) |
| a súgó, a GYIK és a bemutató **meglévő műveletekkel** indul | `help-topic` · `faq-open` · `tour-start` — új út nem született (KUKA-003) |

---

## 4. A BIZONYÍTÉK — tényleges parancsok és eredmények

### 4.1 Böngészős próba (új lap: `tests/e2e/v3app-r109-invite.spec.mjs`)

`npx playwright test tests/e2e/v3app-r109-invite.spec.mjs` → **6/6 PASS**

| próba | mit mér |
|---|---|
| **R109-01** | a képernyő saját segítsége: a cím egy szó, a fiók neve alatta, a „mi történik" mondat, a személy-sora a bejelentkezett címmel, a súgó-pont, és a GYIK-gomb TÉNYLEGESEN megnyitja a panelt a meghívás-elfogadás kérdésén |
| **R109-02** | **ELLENPRÓBA a szerver-oldali kapura:** UGYANAZ a böngésző meghívás-kontextus NÉLKÜL → a bemutató NINCS a listán; a meghívóval megnyitva → OTT VAN. A különbség kizárólag a kontextus |
| **R109-03** | a bemutatót végigkattintva a „Tovább"-bal a meghívó **beváltatlan marad** (adatbázison: `redeemed_at` NULL, tagság 0) — majd a SAJÁT kattintás után tagság VAN, `revoked_at` NULL, és a siker szava kimondja: „Elfogadtad a meghívást." |
| **R109-04** | KÉT VALÓDI elutasítási állapot (már felhasznált meghívó · eltérő címzett): nincs beváltó gomb, nincs hamis siker; a súgó megnyitása-bezárása és a bemutató indítása-kihagyása **NEM ír** (tagság-sorszám és `redeemed_at` változatlan) |
| **R109-05** | mind a három nyelven a HELYES csomagból jön a cím, a „mi történik" mondat, a „még nem vagy bejelentkezve" sor és a két gomb felirata — az elvárást a próba a nyelvcsomagból olvassa, nem beégetett feliratból (KUKA-237); nyers gépi kulcs nem szivárog a képernyőre |
| **R109-06** | keskeny nézetben (390×844) minden elem látható, és vízszintes túlcsordulás nincs |

**A LEJÁRATOT NEM HAMISÍTOTTAM, és ezt ki kell mondani:** az első alakban az adatbázisban akartam a
meghívó lejáratát a múltba állítani — a **mag helyesen megtiltotta** („a kiadott ajánlat nem írható
át: visszavonás + új meghívó kell"). Ezért a próba két valódi elutasítási állapotot jár be, amit a
parancs is nevesít.

### 4.2 Teljes böngésző-regresszió (a közös bemutató-motort érintettem)

`npx playwright test` → **77 próba, MIND ZÖLD**, benne az **R91-03** („mind a kilenc bemutató elindul
a saját képernyőjén, vagy nevezetten nem indítható") — most a tizedikkel együtt.

**Három piros KÖZBEN előjött, és egyik sem a változásomból:** mindhárom a saját
**bizonyíték-fájlját** nem tudta kiírni, mert két SZÁRMAZTATOTT dolog hiányzott a friss klónban — a
`var/reports/` könyvtár és a `docs/_olvashato/V3_R89_SZIMULALT_BEMUTATO.html` lap. A könyvtár
létrehozása és a `npm run docs:r89-bemutato` után **mind a három zöld**. Ez pontosan az a hiba-osztály,
amit a parancs P109-03-ban kifogásol („ne újabb »page not found« legyen az átadás") — ezért
NEVESÍTVE áll itt: **a böngésző-próba futtatásának előfeltétele a `var/reports/` és a származtatott
bemutató-lap megléte.**

### 4.3 Gépi őrök (célzott, ahogy az R107 kéri)

`verify:assistant` **55/55** (az új AST02-vel) · `verify:tutor` **78/78** · `verify:i18n` **42/42** ·
`verify:kuka` **487/487** (KUKA-251 a regiszterben, az archívumban és az őr-otthonban; alapvonal 53,
`0 változott · 0 eltűnt · 1 új`) · `verify:decision-numbers` **4/4** · `app:selfcheck` **57/57**.
**Teljes söprés NEM futott** — az R107 a célzott próbát teszi alapértelmezetté, és a 400 ezres jelzőnél
kimondottan tiltja az „opcionális teljes tesztsöprést a lezárás címén".

---

## 5. AMI NEM KÉSZÜLT EL — nevesítve, nem „részben kész"

**A parancs három részt kért; egy készült el.** A miért egyetlen szám: a **400 ezres chatváltási
jelző** (D-VS-3083 · R107) a P109-01 lezárása közben megszólalt, és a szabály kimondja, hogy ilyenkor
a **megkezdett** blokkot zárjuk le célzott ellenőrzéssel — új nagy munkát nem kezdünk, és a lezárás
címén nincs új feltárás vagy új funkció.

| tétel | állapot | mi hiányzik pontosan |
|---|---|---|
| **P109-01** — meghívott út | **KÉSZ**, böngészős bizonyítékkal | — |
| **P109-02** — a teljes felület és tutor HU/EN/DE nyelvi átnézése | **NEM KEZDŐDÖTT EL** | az aktuális v3app felhasználói képernyőinek, üres/hiba/sikerállapotainak, űrlapjainak, leveleinek és tutoranyagának tartalmi átnézése; a feladathoz kötött terminológiai megfeleltetés a meglévő otthonában. Ami a meghívó-úton útba esett, az MEGVAN (lásd 1. szakasz), a többi nem |
| **P109-03** — bemutató | **A PRÓBÁK KÉSZEK, A BEMUTATÓ NEM** | a változott forrásból megnyitható, kipróbálható bemutató (új meghívott · már regisztrált ember · hibás/lejárt meghívó) |

**Amit szintén nem állítok:** az AI által végzett nyelvi átnézés **nem** független anyanyelvi
lektorálás. A német és angol szövegeket én írtam, a meglévő csomagok hangjához igazítva — ez
fordítás-javaslat, nem lektorálás.

**Változatlanul nyitott, nem ennek a körnek a műve:** `verify:capability-witness` három elavult
rögzítése a V2 board-regiszterében (R106-ban mérve, örökölt) · `verify:external-checks` a söprés
türelmén túl fut · a core-core és az UX teljes lezárása.

---

## 6. A VÁLTOZÁS DARABJAI

| fájl | mi történt |
|---|---|
| `v3app/knowledge/features.mjs` | `tour.inviteAccept` (a 10. bemutató) · az `invite.accept` horgonyai, GYIK-listája, `tour` mezője · a **nevezett személyes-tér kivétel** (`personal_space_ok`) |
| `v3app/assistant/policy.mjs` | `requires_invite` kapu a bemutató-felkínálásban · a személyes-tér tiltás kivétel-kezelése |
| `v3app/server.mjs` | `invite_context` a kérdező kontextusában (a magból) · a `requires_invite` átadása a lapnak |
| `v3app/public/app.js` | a meghívó-képernyő újra: cím · fiók-név · „mi történik" · személy-sor · gombsor-horgony · GYIK- és bemutató-indító · a feladat-jelzés igazolt siker után · a bemutató a képernyőn marad |
| `v3app/public/i18n/{hu,en,de}.mjs` | hat új felirat · a lejárat és az eltérő címzett szövege a következő lépéssel · a tudásblokk frissítve · `KB_SOURCE` 1.1.0 → 1.2.0 · a bemutató négy lépése · `faq.invite.personalVsBusiness` · a holtta vált `inviteFor` kulcs törölve |
| `tools/vs_verify_assistant.mjs` | **AST02**: a személyes térben az `invite.accept` LÁTHATÓ, a kezelői oldal NEM — egy állításban |
| `tests/e2e/v3app-r109-invite.spec.mjs` | **ÚJ** — a hat böngészős próba |
| `contracts/retiredPatternRegistry.js` · `docs/KUKA_ARCHIVUM.md` · `contracts/guardHome.js` · `contracts/kukaArchiveBaseline.json` | **KUKA-251** |
| `DECISION_LOG.md` | **D-VS-3084** |
| `docs/70_PLANNING/V3_R75_ELFOGADAS_HELYZETEK.json` · `V3_R81_UX_ELFOGADAS.json` | a TELJES, nem részleges böngésző-futás friss bizonyítéka (a siker új szövege meg is jelenik bennük) |

---

## 7. KIPRÓBÁLÁSI ÚT

A blokk eredménye **fejlesztői böngésző-próbán** mérhető, nem telepítésen (telepítés nem
engedélyezett). A `main` ág erre nem alkalmas: a munka az ágon áll.

```bash
cd "/Users/valachzsolt/Documents/CREATOR/DESIGN + WEB/vfamily/00_Admin/valach-system"
git fetch origin
git checkout claude/focused-sagan-gfuieq
git pull origin claude/focused-sagan-gfuieq
npm install --include=dev          # a NODE_ENV=production miatt a --include=dev KELL
mkdir -p var/reports               # a próbák ide írják a bizonyítékukat
npm run docs:r89-bemutato          # a származtatott bemutató-lap (az R91-09 ezt olvassa)
npx playwright test tests/e2e/v3app-r109-invite.spec.mjs
```

A hat próba végigmegy a meghívott ember útján, három nyelven. Kipróbálható **bemutató** ebben a
körben nem készült (5. szakasz).

---

## 8. FOGYASZTÁS

Ablak „R109 P109-01" (2026-09-29T05:30:00Z → 06:22:31Z), munkamenet
`217706c3-ecc2-5f7b-af35-558854c7df95`, lefedettség **teljes**: **110 hívás · 0 ügynök ·
cache-olvasás 72 747 054 · kimenet 94 482**. **Kumulatív chat-jelző KÜLÖN** (a parancs kérése): a
teljes beszélgetés **319 hívás**, fő-szál kontextusmedián **452 703**, maximum **735 958** — tehát a
**400 ezres jelző elérve**, a blokk itt zárul, a következő önálló nagy munkablokk friss
beszélgetésben induljon.

Gépi alak, tartalom nélkül: `docs/70_PLANNING/V3_R110_FOGYASZTAS_LELTAR.json` +
`V3_R110_FOGYASZTAS_HIVASSOR.json` (110 sor: sorszám · idő · szereplő · modell · négy számláló ·
kontextus · ébresztés — üzenet és eszköz-kimenet NEM). **A végső pillanatkép és a publikálási farok
külön:** ez a mérés a lap megírása ELŐTT zárult; a commit, a board-feltöltés és a válasz hívásai már
nincsenek benne.

**Ebből költség, heti keretarány vagy megtakarítás NEM számítható** — az ismeretlen költség null, nem
nulla.

---

## 9. MI A KÖVETKEZŐ

A P109-02 (nyelvi átnézés) és a P109-03 bemutatója **friss beszélgetésben** induljon, az R107
munkarendje szerint. Az átadáshoz minden megvan: a parancs szó szerint eltéve
(`v3ref/source-documents/R109_board_v1.md`), a kód commitolva és feltolva, ez a lap a boardon, a
fogyasztás-leltár és a hívássor a repóban.
