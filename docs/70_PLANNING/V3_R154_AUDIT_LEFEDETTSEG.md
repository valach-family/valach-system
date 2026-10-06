# R154 — AUDIT-LEFEDETTSÉGI LISTA (folyamatosan frissül)

**Mi ez.** A CMD-VS-300-002-002 R154 SPEC kérte: *„Vezess tömör, commitolt audit-lefedettségi listát,
benne: terület, konkrét vizsgált út, lelet, bizonyíték, javító SHA, fennmaradó hiány."* Ez az a lista.
A csomag több napig tart, ezért ez a lap NEM záró jelentés: minden körben ide kerül, ami MÉRVE van.

**Kiindulás.** Ág: `claude/r154-audit-fix`, cél-ág (PR base): `claude/ecstatic-fermi-8c23co`.
Induló fej: `e24860f4b6178d23e7f3844bc4e5d653ff5e66f1` (a SPEC-ben visszaolvasott fej).
A `main`-hez mért viszony: a fejlesztési ág **62 commit-tal előrébb, 50-cel hátrébb** van az
`origin/main`-hez képest (`git rev-list --left-right --count origin/main...HEAD`) — a SPEC szerint a
régi `main`-re NEM térünk vissza.

**A VÁLTOZATLAN KÓD ALAPVONALA, mérve a munka ELŐTT** (nem a PR-diff — a SPEC ezt külön kikötötte):
`npm run verify:sweep -- --skip verify:external-checks,verify:v3ref` → 37 verifier, **36 zöld ·
1 piros** (`verify:lefedes`, 20 ÖRÖKÖLT R144-es hiány), 2 lánc NEM FUTOTT — NEM IGAZOLT.
Vagyis: **a teljes söprés zöldje a lenti három leletről SEMMIT nem mondott.**

---

## 1. LEFEDETT TERÜLETEK ÉS A KONKRÉT VIZSGÁLT UTAK

| # | Terület | Konkrét vizsgált út | Lelet | Bizonyíték | Javító SHA | Fennmaradó hiány |
|---|---|---|---|---|---|---|
| 1 | HTTP-határ · kéréskorlát (NET-02) | `makeRateLimiter` közvetlen mérése: 60 000 és 120 000 kérés EGY címről, 240-es korláttal | **F154-01 — VALÓS**: a sor korlátlanul nőtt (`count=60000`), a költség kvadratikus: 28 987 ms / 225 327 ms | `verify:app-findings-r154` A: a1–a6; a javítás után 105 ms; visszavétel-próba: FAIL (31 550 ms) | *(e csomag 1. commitja)* | elosztott korlát nincs (példányonkénti) — kimondott, nem új |
| 2 | HTTP-határ · statikus út | élő HTTP: `GET /%`, `GET /%zz`, `GET /a%E0%A4%A`, + ellenpárok (`/index.html`, nem létező lap, útvonal-átlépés) | **F154-02 — VALÓS**: mind a három **500 `internal_error`** volt | `verify:app-findings-r154` B: b1–b4; visszavétel-próba: FAIL (3×500) | *(e csomag 1. commitja)* | — |
| 3 | Munkamenet-kezelés | élő HTTP: 10 000 süti nélküli `GET /api/me`, a tár méretének mérése; majd a feloldó közvetlen mérése | **F154-03 — VALÓS**: a tár 10 000 sorra nőtt, lejárat SEMMILYEN nem volt (a süti örök érvényű) | `verify:app-findings-r154` C/1: c1–c6 · C/2: c7–c10 (névtelen elárasztás NEM lépteti ki a belépettet); visszavétel-próba: FAIL (`size: 407` / plafon 40) | *(e csomag 1. commitja)* | a tár példányonkénti és memóriabeli — újraindítás nullázza (kimondott) |
| 4 | Saját mérés-minőség | a KUKA-092 szerinti visszavétel-próba mind a három javításra | **F154-04 — VALÓS (a saját battériámban)**: a bekötés kivételekor a battéria ELAKADT MÉRÉST (kód 2) jelzett FAIL helyett | a javított alak ugyanerre kód 1-et ad; `verify:kuka` KUKA-293 | *(e csomag 1. commitja)* | a visszavétel-próba MAGA nem automatizált — kimondva |
| 5 | Készenlét és életjel (HLT-01 · RDY-01) | `/health` és `/ready` a kapu ELŐTT; a válasz titok-tartalma; a kéréskorlát kihagyása | **nincs lelet** — a két kérdés külön van, a válasz nevezett és titokmentes, az életjel kimaradása a kéréskorlátból indokolt (KUKA-092) | kód-olvasás + a `READINESS_MESSAGES` zárt listája | — | a staging `/ready` 200 / `schema_head 001` KÜLSŐ mérés (chatgpt-v3), itt NEM ismételt |
| 6 | Hozzáférés-kapu (ACC-01) | `accessGateConfig`: telepített környezetben jelszó nélkül MEGÁLL; `sameSecret` állandó idejű; a 401-es fejléc csak ASCII | **nincs lelet** | kód-olvasás; a `PUBLIC_PATHS` zárt (`/health`, `/ready`) | — | — |
| 7 | Proxy-határ (NET-02) | `clientIpOf` / `isHttpsRequest`: az `X-Forwarded-For` CSAK `VS_APP_TRUST_PROXY=1` mellett számít | **nincs lelet** — a bizalom kimondott, nem vak | kód-olvasás | — | — |
| 8 | Bemeneti séma a határon (HTP-01) | `validateRequest` kapu-szerepe állapotváltoztató végponton; a kezelő feloldása saját kulcson (`hasOwnProperty`) | **nincs lelet** ebben a körben | kód-olvasás; a meglévő `verify:app-selfcheck` és a 38-as söprés | — | a séma-motor TARTALMI auditja (mezőnként) még nem történt meg |
| 9 | Egyszeri hatás (OON-01) | `onceOnly*` feloldók: azonosság · hatókör · verseny; a zárt művelet-készlet | **nincs lelet** — a verseny nevezett kimenet, a tároló-jel egy helyen áll (`isUniqueViolation`) | kód-olvasás | — | a készlet MA egyetlen műveletet fed (`member.reinvite`) — lásd a 2. szakasz |

| 10 | Munkaterek közötti elválasztás · nézet-kötés (KTX-01 · KTX-02 · KTX-03) | `contextGate` / `readContextGate` kód-olvasás; a séma kötelezőség-mezői; a felület MINDEN író hívása (`apiInContext` vs `api`) végigkövetve, a cégtér-létrehozás külön | **nincs lelet** — a felület a MEGNYITÁSKORI bélyeggel köt (PNL-01), a cégtér-létrehozás is viszi az alanyt, és a válasz MINDIG kimondja a tényleges kontextust | kód-olvasás + a `v3app/public/app.js` író útjainak felsorolása | — | **megfigyelés** (nem hiba): a `contextGate` kiszámolja a `confirmed: { book, subject }` értéket, de azt SEMMI nem használja — holt érték |
| 11 | Nyelvi feloldó · `Accept-Language` (LANG-01) | `resolveLanguage` és `parseAcceptLanguage` KÖZVETLEN mérése hat fejléccel és három kifejezett választással | **F154-05 — VALÓS**: a `matched` a fejléc-úton HARDKÓDOLT `true`; `fr-FR` → `hu`, és a válasz azt állította, hogy a kért nyelvet adta (ugyanez `explicit: 'fr'`-ként helyesen `false`) | `verify:app-findings-r154` D: d1–d4, d8; visszavétel-próba: 3 FAIL | *(e csomag 4. commitja)* | felhasználói hatás MA nulla: a `matched`-nek nincs fogyasztója — a mező mégis erre a kérdésre való |
| 12 | Nyelvi feloldó · súly-szemantika | ugyanaz a mérés, `q=0` · `q=abc` · `q=5` · `q=1.2.3` fejlécekkel | **F154-06 — VALÓS**: a `q=0` elfogadásként számított — `de;q=0` → `de`, `en;q=0` → `en` (RFC 7231 §5.3.1 szerint a 0 súly = NEM elfogadható) | `verify:app-findings-r154` D: d5–d7; visszavétel-próba: 2 FAIL | *(e csomag 4. commitja)* | a `q=abc` → `q=1` és a tartományon kívüli `q=5` továbbra is megengedő olvasás — kimondott, nem mért optimum |
| 13 | Jogosultsági döntések a magban (részleges) | `v3ref/authz.mjs`: `membershipEffectiveAt` · `evidenceStandingAt` · a zárt szerep-regiszter — kód-olvasás | **nincs lelet** — a három tengely (kor · hatály · megvonás) külön áll, a jövőbeli dátum nem frissesség, az ismeretlen mező nevezetten elakad | a mutációs battéria: **237/237 mutáció elkapva, 0 túlélő** (`verify:v3ref`) | — | `delegation.mjs` · `membershipPeriod.mjs` · `banScope.mjs` MÉG NEM olvasva soronként |

| 14 | A BEMENETI SÉMA-KAPU (HTP-01) tartalmi auditja | élő HTTP, `POST /api/workspaces` (kapuzó végpont): **14 támadó bemenet** — `__proto__` · `constructor` · nulla bájt · tömb a beágyazott objektum helyén · kitalált mező a beágyazottban · tömb/szám/`null` a `name` helyén · mély beágyazás · 5000 karakteres név · tömb/szöveg/szám/`null` a TÖRZS helyén | **13-ból nincs lelet**: mind nevezett 400-at kapott (`unknown_field` · `invalid_type` · `value_too_long` · `invalid_body`), **nulla írás**, és prototípus-szennyezés nem történt (`({}).polluted === undefined`) | a próba kimenete soronként; a könyv-számot minden eset ELŐTT és UTÁN mértem | — | — |
| 15 | ugyanaz · vezérlő-karakterek | ugyanaz a sorozat, külön a nulla bájttal, MINDKÉT tárolón | **F154-10 — VALÓS, JAVÍTVA**: a `nonempty_string` nem zárta a vezérlő-karaktereket, ezért a kimenet a TÁROLÓTÓL függött — SQLite: **201**, a munkakörnyezet létrejött `A\0B` névvel · PostgreSQL 16.15: **400 `provision_failed`**, nincs írás. A javítás után MINDKÉT tároló ugyanazt a nevezett 400-at adja (`invalid_type` · „vezérlő-karaktert nem tartalmazhat"), írás nélkül | élő HTTP MINDKÉT tárolón, javítás előtt és után; a PostgreSQL-oldali ok közvetlenül is mérve: `22021 invalid byte sequence for encoding "UTF8": 0x00`; `verify:app-findings-r154` F: f1–f4; visszavétel-próba: 3 FAIL (`könyv 1→4`) | *(e csomag 7. commitja)* | a `secret_string` (jelszó) szándékosan érintetlen — `scrypt` lenyomatként tárolódik, ott nincs tároló-eltérés |
| 16 | PostgreSQL-üzem (a SPEC 3. területe, RÉSZBEN) | elkülönített helyi **PostgreSQL 16.15** felállítva (`initdb` + saját port + saját socket); `npm run db:migrate` lefuttatva; az alkalmazás PG mögött indítva és kérésekkel mérve | **nincs lelet** a mért úton: a séma felépült (`001` alkalmazva, 119 ms), a tároló-feloldó `postgres`-t mondott, a regisztráció · megerősítés · belépés · munkakörnyezet-létrehozás végigment | `db:migrate` kimenete; az élő kérés-sorozat válaszai; `SELECT version()` | — | **a verzió NEM a Railway 18-asa, hanem 16.15** — ezt kimondom, mert a SPEC a 18-hoz igazítást kérte; a `proof:pg-*` láncok (tranzakció · zárolás · párhuzamosság · kapcsolatvesztés · helyreállás) ebben a körben MÉG NEM futottak |

| 17 | A munkamenet-tár MÁSODIK külső review-köre | a Codex három újabb P2 lelete `a096989`-en; mindhárom REPRODUKÁLVA, utána javítva | **F154-11 · F154-12 · F154-13 — mind VALÓS**: (11) a védett-lista a TELJES `pending_intent` táblát olvasta minden söprésnél, abba viszont a `POST /api/invites/pending` HITELESÍTÉS NÉLKÜL ír — 400 kérés után a tár 19, a tábla 400 sornál; (12) a belépés ELŐBB szúrt be, aztán törölte a sajátját → telt táron IDEGEN embert léptetett ki; (13) a friss NÉVTELEN sor sérthetetlensége telt táron a BELÉPETT körre tolta a hiányt → egy hitelesítés nélküli látogató kiléptetett egy belépett embert | `verify:app-findings-r154` G: g1–g7; a visszavétel-próba mindháromra PIROS (`sorok 0→120` · a sorrend · `belepett_kileptetve: 1`) | *(e csomag 8. commitja)* | a `pending_intent` LEJÁRAT szerinti takarítása továbbra is nyitott (D-VS-3007) — a tábla most a TÁRRAL EGYÜTT korlátos, de nem időben |
| 18 | A mag mutációs battériája a mag-változás UTÁN | `npm run verify:v3ref` újrafuttatva az ISC-02 változással | **nincs lelet** — `clean: true`, `run_state: complete`, 40 egység, **237 mért / 237 elkapott mutáció / 0 túlélő** | `v3ref/v3ref-mutation-result.json` (commitolva) | — | — |

| 19 | A saját ISC-02 szűkítésem HATÓKÖRE | a Codex lelete `624f80d`-n; élő HTTP a segéd-chat végpontján, több soros · tabulátoros · nulla bájtos · üres kérdéssel, és a NÉV mezővel ellenpárként | **F154-14 — VALÓS, a SAJÁT REGRESSZIÓM**: az ISC-02 tiltását a `nonempty_string`-re tettem, a `question` mező pedig az volt — a felület viszont `<textarea>`-t ad hozzá, ahol az ENTER sortörést tesz. A több soros kérdés **400 `invalid_type`** lett: a felületen FELAJÁNLOTT szerkesztő tett küldhetetlenné egy jogos kérdést | `verify:app-findings-r154` H: h1–h6; a `h3` a PÁROSÍTÁST két fájlból olvassa össze (`<textarea>` ↔ mező-típus); visszavétel-próba: 4 FAIL | *(e csomag 9. commitja)* | — |

### A LEGFONTOSABB TANULSÁG EBBŐL A CSOMAGBÓL

A KUKA-300 nem technikai apróság: **ugyanazt a hibát követtem el, amit ebben a csomagban én magam
vezettem ki.** Az F154-01 (a kéréskorlát mint a támadás erősítője) után hat javítással, ugyanabban a
fájlban, a védett-lista kérdése felvett egy korlátlan költséget. A saját gépi jelem ezt NEM kapta el,
mert a mintája EGY FÜGGVÉNY sorára illeszkedett, nem a hibaosztályra. Ezt a regiszter most kimondja.

Ebből két dolog következik a csomag hátralévő részére: (1) a hibaosztályokat a jelekben is
általánosítani kell, nem csak a tanulság szövegében; (2) a külső review értéke MÉRHETŐ — **hét valós
hibát** talált a saját javításaimban, amelyek mindegyike olyan helyen volt, ahol a saját battériám
zöld maradt.

És van egy harmadik, kellemetlenebb: a **KUKA-303** azt mutatja, hogy egy kockázat MEGNEVEZÉSE nem
védelem. Az ISC-02 javításakor a saját PR-kommentemben kiírtam, hogy a sortörést nem vesszük el
mellékhatásként — és pontosan azt tettem. A megnevezés és az ELLENŐRZÉS két külön munka.

### A MÉRŐESZKÖZ, amivel a leleteket keresem — és a HATÓKÖRE

A három első lelet mindegyike olyan feloldóban volt, amit **egyetlen próba sem hívott meg
közvetlenül**. Ezért ezt MEGMÉRTEM: a `v3app` exportált feloldói közül **117** olyan van, amelynek a
nevét egyetlen próba-fájl (`tests/` · `findings_r*` · `tools/vs_verify*` · `selfcheck`) sem említi.

**Amit ez a szám JELENT:** ennyi feloldót a próba nem tud KÖZVETLENÜL meghívni, tehát a viselkedésüket
bizalomból hisszük (KUKA-207). **Amit NEM jelent:** nem azt, hogy tesztelve sincsenek — sok közülük
ÉLŐ HTTP-n keresztül mérve van, csak nem a nevén. A szám tehát **prioritási sor**, nem hibaszám
(KUKA-216: a verdikt ne mutasson a mérés hatókörén túl). Az F154-05 és az F154-06 ebből a sorból jött.

### A KÜLSŐ-ELLENŐRZÉSI LÁNC PIROSA — A KÉRDÉS ELDÖNTVE, MÉRÉSSEL

A `npm run verify:external-checks` **nem nullával zárt**: 19 programból 14 felel meg, 5 eltér
(`r79 · r59a · r57a · r59 · r57`). A kérdés az volt, hogy ez az ÉN változásom következménye-e.
Nem következtetéssel döntöttem el, hanem megmértem: ugyanazt a láncot lefuttattam az **érintetlen
`e24860f4` alapon**, külön git-munkafában, saját `npm install`-lal.

| | eredmény | eltérő programok |
|---|---|---|
| **érintetlen alap** (`e24860f4`) | 14/19 · kilépés 1 | `r79 · r59a · r57a · r59 · r57` |
| **a mi fejünk** (javításokkal) | 14/19 | `r79 · r59a · r57a · r59 · r57` |

**Programonként is azonos:** ugyanaz a 14 MEGFELEL program mindkét oldalon, és ugyanaz az 5 eltérő,
ugyanazokkal az okokkal (hiányzó temp-fájl: `ENOENT /tmp/r79-*/v3ref/units/unit-2-of-18.json` ·
hiányzó részletes artefaktum · nem értelmezhető kimenet · hiányzó `E02`/`E03` esetek).

**A verdikt tehát: ÖRÖKÖLT, nem regresszió** — és ez most mérés, nem érv. Ami ebből KÖVETKEZIK és
amit nem: nem állítom, hogy az 5 eltérés „rendben van". Azok VALÓDI nyitott hiányok a láncban (a
jellegük futtatási), csak nem ebben a csomagban keletkeztek. A **külső fél (chatgpt-v3) MIND A 12
mag-próbája MEGFELEL** mindkét oldalon.

### Egyéb megfigyelés, ami nem hiba, de rögzítendő

A repó **nyilvános** (`visibility: public`, mérve a GitHub API-ból). Ezért a CLAUDE.md szabálya, hogy
üzleti adat (törzs, árak, bolti válaszok) nem kerül a repóba, nem rendszeretet, hanem **kemény
biztonsági határ**. Ebben a csomagban üzleti adat nem került be.

---

## 2. MÉG NEM VIZSGÁLT TERÜLETEK (a SPEC listája szerint) — KIMONDOTT HIÁNY

A SPEC hat területet nevez meg. Ami a fenti táblában nem szerepel, az **EL NEM VÉGZETT mérés** —
nem „rendben":

1. **Identitás, belépés, munkatér, tagság, meghívás, delegálás, jogosultságok, munkaterek közötti
   elválasztás** — a HTTP-határ formai oldalát mértem, a JOGOSULTSÁGI döntéseket (mag:
   `authz.mjs` · `delegation.mjs` · `membershipPeriod.mjs`) nem.
2. **Készlet és üzleti folyamatok, nyugták, idempotencia, audit, export** — MÉRT TÉNY, hogy a v3app
   32 végpontja között üzleti ÍRÓ út nincs: a készlet/ár/bizonylat végpontok mind `GET`, a
   `processes · documents · movements · stockcard · products · partners · warehouses` lapok a
   lefedési regiszterben DEKLARÁLTAK, de a felületen nem létezők. Ez a 20 örökölt hiány gerince.
3. **PostgreSQL tranzakciók, zárolás, párhuzamosság, kapcsolatvesztés, helyreállás, migráció** — a
   repóban kész próba-eszközök állnak (`proof:pg-*`), ebben a körben NEM futtattam; helyi,
   elkülönített PostgreSQL 18 még nem állt fel.
4. **Valódi asztali/mobil UX, hibák és üres állapotok, billentyűzetes használat** — nem mértem.
5. **Minden funkció HU/EN/DE i18n-je, AI-asszisztens, chat, FAQ, help, oldaltérkép, AI tutor** — nem
   mértem (a `verify:i18n` és a `verify:tutor` a söprésben zöld, de az a MEGLÉVŐ kötésekre igaz).
6. **Tényleges kattintásokra reagáló bemutatók** — nem mértem. A lefedési őr szerint 28 bemutató-lépés
   közül **18 MÉRT lépéssel fedett**, 10 csak indok-szöveggel.

**Élő AI:** ebben a konténerben nincs engedélyezett szolgáltató. A nyelvértés tehát **EL NEM VÉGZETT
mérés** — a helyi csonk csak a szerződés működését igazolja (KUKA-089 · KUKA-127).

**Felhős üzem:** a staging `/ready` 200 és a 001 migráció lefutása KÜLSŐ mérés (chatgpt-v3, R153/R154).
A belső tesztfiók, a felhős mentés-visszatöltés és az élő AI **nincs igazolva** — ebben a csomagban
felhős deployt, secret-módosítást és adatváltoztatást nem végzünk.

---

## 3. A PRÓBÁK KÖRNYEZETE

- Node `v22.22.0`, Linux konténer; tároló: **SQLite** (`node:sqlite`, experimental figyelmeztetéssel).
- PostgreSQL: **nem futott** ebben a körben — a `proof:pg-*` láncok eredménye ebből NEM következik.
- Böngésző-próbák (`test:e2e`, Playwright): **nem futottak** ebben a körben.
- Söprés a javítások után: `npm run verify:sweep -- --skip verify:external-checks,verify:v3ref` →
  **38 verifier, 37 zöld, 1 piros** (`verify:lefedes`, ugyanaz a 20 ÖRÖKÖLT hiány — új nem keletkezett).
  A két kihagyott lánc a söprés szabálya szerint **„NEM FUTOTT — NEM IGAZOLT"**, tehát az
  **összverdikt NEM ZÖLD**; ezért külön futtattam őket:
  - `npm run verify:v3ref` → **LEFUTOTT, `clean: true`**, `run_state: complete`, 40 egység,
    **237 mért / 237 elkapott mutáció / 0 túlélő**, 375 s. A bizonyíték-fájl commitolva
    (`v3ref/v3ref-mutation-result.json`, `base_digest: sha256:925dcd8e…`).
  - `npm run verify:external-checks` → **futása folyamatban**, az eredménye a záró REPORT-ba kerül.
    Amíg nem végzett, a bizonyíték-fájljait NEM commitolom: egy félbe-ért futás állapota nem
    bizonyíték (KUKA-206).
- A lelet-battéria a csomag végén: `npm run verify:app-findings-r154` → **31/31 PASS**, és mind az
  **öt** javításra lefutott a visszavétel-próba (KUKA-092): a javítás kivételével a battéria PIROS.
