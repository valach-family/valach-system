# R154 — ÖSSZESÍTŐ REPORT: a meglévő V3 auditja és a Codex-visszajelzések folyamatos javítása

**Parancs:** `CMD-VS-300-002-002 R154 — SPEC` (board) · **sáv:** Claude-v3 · **dátum:** 2026-10-06
**Repó:** `valach-system` · **alap:** `e24860f4` (a SPEC-ben megadott fej) · **ág:** `claude/r154-audit-fix`
**A kiinduló állapot változatlan maradt:** V2 repó, éles üzem, titkok, adat — egyiket sem érintettem.

---

## 1. A LEGRÖVIDEBB VÁLASZ, ÜZLETI NYELVEN

Az auditot a **meglévő, változatlan V3-on** végeztem, nem egy új funkció tervén. Találtam **28 valós
hibát vagy nevesített rést**, ebből **25-öt megjavítottam**, mindegyiket előbb **megmértem** (reprodukció
számokkal), aztán javítottam, aztán **visszavétel-próbával** igazoltam, hogy a próba tényleg fogja a
hibát. Három tétel nevesítetten NYITVA marad, mert a javítása nem audit-javítás, hanem **döntés** — ezeket
a 7. szakasz nevezi meg.

A legfontosabb üzleti tartalom: **a rendszer három olyan ponton volt sérülékeny, ahol a teljes söprés
zöld maradt**, tehát a zöldje ezekről semmit nem mondott.

| mi történt volna a felhasználóval | mérve (a javítás előtt) |
|---|---|
| Egyetlen gépről indított kérés-áradat **megállította volna a kiszolgálást** — miközben a napló azt mutatja, hogy „megfogtuk" | 60 000 kérés egy címről: **29,0 s** tiszta CPU; 120 000 kérés: **225,3 s** (négyszeres kérés → 7,8-szoros idő) |
| Egy hibás webcím **programhibát** adott (500) a nevezett elutasítás helyett | `GET /%`, `GET /%zz`, `GET /a%E0%A4%A` → mind **500** |
| A munkamenetek tára **korlátlanul nőtt**, és a munkamenet-süti **örökké** érvényes volt | 10 000 süti nélküli kérés → **10 000** tárolt munkamenet |
| Egy meghívott embernek **elveszett a folyamatban lévő meghívása**, ha közben forgalom volt | 300 névtelen kérés után a meghívott munkamenete kiesett, a meghívás adata elérhetetlenül a tárolóban maradt |
| Egy **több soros kérdés** a segédnek küldhetetlen volt (az Enter a szövegmezőben) | a végpont **400 `invalid_type`**-ot adott |
| Telt tárnál a **megerősítő levél hivatkozása** nem működött: a felhasználó nem tudta megnyitni a fiókját | `GET /api/verify` → **503** |
| Egy lassú, több gépről jövő kérés-köteg **megkerülte a memória-korlátot** | 10 átfedő kérés, 2-es plafon → a köteg után is **12** tárolt munkamenet |

---

## 2. A JAVÍTÁSI PR ÉS AZ „AUTO-FIX" TÉNYLEGES ÁLLAPOTA

**A PR:** <https://github.com/valach-family/valach-system/pull/1> — nyitva, alap:
`claude/ecstatic-fermi-8c23co` (a SPEC szerinti fejlesztői ág), fej: **`0098ac4`**.

**Az „Auto-fix" pontos állapota, kimondva — ebben nincs semmi, amit az operátornak be kell kapcsolnia:**

| ki mit tesz | tényleges állapot |
|---|---|
| **Codex (külső ellenőrző, GitHub App)** | **MŰKÖDIK, automatikus.** Minden felküldött változatot magától átolvas, és soronkénti leleteket ír a PR-re. Mérve: **öt** teljes kör (`4fe5e02f` · `a0969896` · `624f80d3` · `88bc0d4d` · `8b185f03` · `c1d7dbb5`) |
| **a leletek javítása** | **ÉN végzem** (Claude-v3): reprodukció → javítás → visszavétel-próba → válasz a szálon → a szál lezárása. Nem a Codex „address that feedback" gombja: azt nem használom, mert a javítást mérni kell |
| **az utolsó review-kör SHA-ja** | **`c1d7dbb568c0e077cc436f888ff53a3eb64f665f`** (2026-10-06 13:47 UTC) — ennek mind a négy lelete javítva és a szálon megválaszolva van a `0098ac4` commitban |
| **nyitott review-szál** | **nincs**: mind a 16 szál lezárva (12 korábbi + az ötödik kör 4 lelete) |
| **amit az operátornak tennie kell** | **semmit.** Sem bekapcsolás, sem jogosultság, sem kulcs nem hiányzik ehhez |

**Egy korrekció, amit kimondok:** a csomag közben egyszer azt írtam, hogy a Codexet be kell kapcsolni —
ez **téves következtetés** volt az első kör késése miatt. A Codex magától fut, az operátornak nincs
dolga vele.

---

## 3. VALÓS HIBÁK ÉS A JAVÍTÁSAIK — TÉTELESEN

Minden sor: mi volt a baj · mivel MÉRTEM · mi váltja · hol van a GÉPI JEL. A részletes indoklás a
döntés-naplóban (`D-VS-3100`…`D-VS-3124`) és a KUKA-regiszterben (`KUKA-290`…`KUKA-315`) áll.

### 3.1 A HTTP-határ és a kiszolgálás (saját leletek, az audit első köre)

| # | a hiba | mérve | gépi jel |
|---|---|---|---|
| F154-01 | a kéréskorlát sora korlátlanul nőtt — a védelem maga lett az üzemzavar | 60 000 kérés **29,0 s** → javítás után **105 ms** (276×) | `app-findings-r154` A: a1–a6 · `KUKA-290` |
| F154-02 | hibás százalék-escape → 500 a nevezett 400 helyett | három hibás út, élő HTTP-n | B: b1–b5 · `KUKA-291` |
| F154-03 | a munkamenet-tár korlátlan volt, a süti örökké érvényes | 10 000 kérés → 10 000 sor | C: c1–c6 · `KUKA-292` |
| F154-04 | a saját próbám a feloldót mérte, a bekötést nem, és kivételkor „elakadást" jelzett hiba helyett | a battéria exit-kódja | `KUKA-293` |
| F154-05 | a nyugta hardkódolt „igaz" volt a tartalék-úton | ugyanarra a kérdésre két válasz | `KUKA-294` |
| F154-06 | a hivatkozott szabványt nem mértük meg: a `q=0` elfogadásként számított | `Accept-Language: hu;q=0` | D: d1–d4 · `KUKA-295` |

### 3.2 A munkamenet-tár — a külső review öt köre

| # | a hiba | mérve | gépi jel |
|---|---|---|---|
| F154-07 (P2) | a lejáratot csak az ÍRÁS útja érvényesítette — az olvasás feltámasztotta a sort | 1 s korlát, 5 s tétlenség: a `get` visszaadta | E: e1–e3 · `KUKA-296` |
| F154-08 (P2) | a kiszorítás a MEGHÍVOTT folytatását vitte el (minden névtelen sort szemétnek vett) | 300 kérés után elérhetetlen DB-sor | E: e6–e9 · `KUKA-297` |
| F154-09 (P2) | a beszúrás a SAJÁT sorát dobta el; a belépés sütije a semmibe mutatott | 37 belépett + 3 névtelen, 40-es plafon | E: e4, e5, e10 · `KUKA-298` |
| F154-10 (P2) | a határ-szerződés kimenete a TÁROLÓTÓL függött (a nulla bájtot a tárolómotor fogta meg, nem a kapu) | SQLite elfogadta, PostgreSQL elutasítja | F · `KUKA-299` |
| F154-11 (P2) | a védett-lista a TELJES táblát beolvasta minden söprésnél — a korlátos tár őrzése korlátlan költséget vett fel | 400 hitelesítés nélküli kérés: tár **19**, tábla **400** | G: g1, g6, g7 · `KUKA-300` |
| F154-12 (P2) | a rotáció előbb foglalt, aztán adott vissza — és közben IDEGEN embert léptetett ki | 4 belépett, 4-es plafon, újra-belépés | G: g5 · `KUKA-301` |
| F154-13 (P2) | a „ne dobd el, amit most hoztál létre" védelem túlnyúlt: egy névtelen látogató kiléptetett egy belépett embert | `maxSessions=4`, 4 belépett + 1 névtelen → `evicted_cap_signed_in: 1` | G: g2–g4 · `KUKA-302` |
| F154-14 (P2) | a saját szűkítésem küldhetetlenné tette a jogos, több soros kérdést | élő HTTP: **400** | H: h1–h6 · `KUKA-303` |
| F154-15 (P2) | a tároló-szabályt két típusra tettem, a harmadik (e-mail) a saját ellenőrzőjét futtatta | `a\0@b.test` → `ok: true` | I: i1–i3 · `KUKA-304` |
| F154-16 (P1) | a kérés lefutott egy olyan munkamenettel, amit a tár már eldobott — és árva adatot hagyott | 30 kérés → 30× 200, **30 árva sor** | I: i7, i8 · `KUKA-305` |
| F154-17 (P2) | harmadszor: telt táron minden kérés rendezte a teljes tárat | 20 000 sor, 100 beszúrás **754 ms → 45 ms** | I: i4–i6 · `KUKA-306` |
| F154-18 (P2) | a visszatöltés célját szöveg-összefűzéssel tettük `DROP DATABASE`-be | a saját eszközünk, PostgreSQL-lel mérve | `KUKA-307` |
| F154-21 (P1) | a munkamenet LÉTEZÉSE feltevés volt: a lassú, darabolt POST árva sort hagyott | `maxSessions=2`: 200-as válasz + **1 árva sor** | J: j1–j5 · `KUKA-308` |
| F154-22 (P2) | az átfogó kapacitás-kapu a megerősítő hivatkozást is elzárta | `GET /api/verify` → **503** | J: j3, j4 · `KUKA-308` |
| **F154-25 (P1)** | **a pin a PLAFONT is felfüggesztette, és az elengedés nem söpört** | 10 ÁTFEDŐ kérés, 2-es plafon: **12 sor** a köteg után (tár szintjén ÉS élő HTTP-n) → **2** | L: l1, l2, l7, l8 · `KUKA-311` |
| **F154-26 (P2)** | **a sikertelen takarítás azonosítói elvesztek** — az árva sor többé nem volt megtalálható | dobó takarítás: várólista **0**, egy azonosító elveszett → most **1**, és leadja | L: l3 · `KUKA-312` |
| **F154-27 (P2)** | **negyedszer a költség-osztály**: a pin elengedése kérésenként a teljes pin-táblát olvasta | 4000 átfedő kérés **593 ms → 6 ms** (≈100×) | L: l4 · `KUKA-313` |
| **F154-28 (P2)** | **a kikeresés és az érintés két külön időben történt** — a hívó egy eldobott sort hitt élőnek | a `touch` nem adott vissza semmit | L: l5, l6 · `KUKA-314` |

### 3.3 Saját leletek a javítás közben — ezeket a saját próbáim kapták el

| # | a hiba | hol derült ki |
|---|---|---|
| F154-19 | a böngésző-battéria KÍVÜL van a söprésen (`test:e2e` és `proof:core-ux` nem `verify:*`) | ezért maradt észrevétlen három piros elfogadási próba — **nyitva, döntés kell** |
| F154-20 | a bemutató-battéria három piros pontja (`R89-06` · `R91-03` · `R93`) — **ÖRÖKÖLT**, nem ez a PR okozta | az `R91-03` oka MÉRVE: 9 vs. 11 bemutató, a különbség `tour.inviteRevoke` + `tour.reentry`, mindkettő `requires_demo: true` — **nyitva, mert a 11→9 átírás a próba gyengítése lenne** |
| F154-23 | a SAJÁT visszavétel-próbám hiányos volt, és ebből azt hittem, hogy a próbám rossz | a pin KÉT ponton hat; a forrásnál hatástalanítva azonnal 3 piros · `KUKA-309` |
| F154-24 | a fogyasztás-export beégetett projekt-utat használt — és ezzel az ÁTADÁSI leltárt blokkolta | a mérő 315 hívást olvasott be ugyanabból az átiratból, amire az export elhasalt · `KUKA-310` |
| (az F154-25 javításának első alakja) | a védettséget nem kérdezte meg, és egy ÉLŐ munkamenet meghívó-folytatását vitte el | a saját `g7` ellenpárom buktatta el, **commit előtt** · `KUKA-315` |

---

## 4. LEFEDETT ÉS KIMARADT TERÜLETEK

A tételes, 30 soros lista a `docs/70_PLANNING/V3_R154_AUDIT_LEFEDETTSEG.md` lapon áll. Összefoglalva:

**LEFEDVE (mérve, nem átolvasva):** a HTTP-határ bemenet-ellenőrzése · a kéréskorlát · a hibás útvonalak ·
a munkamenet-tár teljes életciklusa (lejárat · plafon · kiszorítási osztályok · rotáció · védettség ·
árva-takarítás · egyidejűség) · a nyelvválasztás `Accept-Language` feloldója · a segéd-chat bemeneti
szerződése · a tároló-hordozhatóság (SQLite ↔ PostgreSQL) a négy szöveges típusra · a tartós adatút
mentés-visszatöltése VALÓDI PostgreSQL-en · a felület 119 böngésző-próbája.

**KIMARADT, KIMONDVA (nincs rá állításom):**

| terület | miért maradt ki |
|---|---|
| **üzleti folyamatok** (készlet, árak, bizonylatok írása) | a próba-alkalmazásban **nincs üzleti író út** — minden ilyen végpont `GET`. Nem azért nem mértem, mert kihagytam: nincs mit mérni |
| **a jogosultság mélyebb döntései** (`delegation.mjs` · `membershipPeriod.mjs` · `banScope.mjs`) | a mag mutációs battériája zöld rajtuk (237/237), de ÖNÁLLÓ audit-mérést nem végeztem |
| **élő AI-szolgáltató** | ebben a környezetben nincs szolgáltató: a mérés **EL NEM VÉGZETT**, nem „rendben" |
| **felhős mentés/visszatöltés és a belső tesztfiók** | a SPEC kizárja a felhős műveletet ebben az auditban |
| **teljes HU/EN/DE végigjárás a segéddel és a súgóval** | a nyelvi és tutor-verifierek zöldek (49/49 · 92/92), de ember-szemű végigjárás nem történt |

---

## 5. A PRÓBÁK KÖRNYEZETE

| mi | mivel |
|---|---|
| futtató | Node **22.22.0**, ESM, `node:sqlite` (kísérleti) |
| tartós tároló | **VALÓDI PostgreSQL 16.15**, elszigetelt helyi példány (`postgres` felhasználó, 55432-es port, külön adatkönyvtár) — nem a Railway, nem éles adat |
| böngésző | Chromium (előre telepített), Playwright, **119 zöld / 3 örökölt piros** |
| battériák | `verify:app-findings-r154` **86/86** · `verify:kuka` **657/657** · `verify:v3ref` **237/237 mutáció** (0 túlélő) · `verify:assistant` 55/55 · `verify:i18n` 49/49 · `verify:tutor` 92/92 · `verify:decision-numbers` 4/4 |
| söprés | **37 zöld + 1 ÖRÖKÖLT piros** (`verify:external-checks`) — az örököltséget MÉRÉSSEL döntöttem el: külön munkafában, a SPEC szerinti `e24860f4` alapon, saját telepítéssel ugyanaz a **14/19** és ugyanaz az öt eltérő program. Tehát nem ez a PR okozta |
| adat | kizárólag szintetikus próbaadat. Üzleti adat, törzs, ár, bolti válasz nem került sem a repóba, sem a boardra |

---

## 6. KIPRÓBÁLHATÓ, VALÓDI UX-BEMUTATÓ

Az operátornak nem kell repót futtatnia (KUKA-079). A bemutató **egyetlen önálló HTML**, ami hálózat
nélkül megnyílik, és a VALÓDI felületet futtatja: minden mondat a tényleges nyelvcsomagokból és a
tényleges funkció-regiszterből jön — a bemutató nem tud „szebb" lenni, mint a termék.

* **Hol van:** a válaszban adott artifact-link (a `tools/v3_r89_bemutato.mjs` kimenete, a mostani ág
  kódjából generálva).
* **Amit NEM bizonyít, és a lap maga is kimondja minden nézet alján:** ez **SZIMULÁCIÓ** — a
  jogosultságot legördülő állítja, nem a szerver; **AI-hívás nincs**; a feladathoz kötött lépést a
  bemutató „igazolja", nem a valódi művelet. Szerveres jogosultságot és élő AI-t ebből nem vezetünk le:
  azokra a futási bizonyíték a battériák és a 119 böngésző-próba.
* **Élő kipróbálás (valódi szerverrel)** ebben a csomagban NEM történt és nem is történhetett: a SPEC
  kizárja a felhős műveletet, a staging pedig a SPEC szerint `e24860f4`-re rögzített. Ez a javítások
  összeolvasztása utáni külön lépés.

---

## 7. FENNMARADÓ HIÁNYOK ÉS A HÁROM DÖNTÉSI KÉRÉS

**(1) A GYÖKÉR-OK — és a javaslat, amit nem hajtok végre magamtól.** A **28 leletből 19 ugyanabban a
munkamenet-tárban** volt, öt review-kör alatt, és az ötödik kör mind a négy lelete az előző kör
javításának (a pin) ára. **A foltozás itt már nem konvergál.** Az ok megnevezve: **minden süti nélküli
kérésre munkamenet születik**, akkor is, ha soha nem lesz rá szükség — ebből jön a plafon, a kiszorítási
sorrend, a védettség és az egyidejűség összes interakciója. Ha a munkamenet csak akkor kerülne a tárba,
amikor valami TÉNYLEGESEN hozzá kötődik (belépés vagy munkamenethez kötött írás), a plafon gyakorlatilag
soha nem szorítana, és ezek a helyzetek **elő sem állnának**. Ez viszont a kérés-ciklus és minden
munkamenet-író kezelő átalakítása: **terv, nem audit-javítás.** Döntést kérek (operátor / chatgpt-v3).

**(2) A BÖNGÉSZŐ-PRÓBÁK A SÖPRÉSBEN.** A `test:e2e` és a `proof:core-ux` nem `verify:*`, ezért az
operátor söprése NEM futtatja őket — emiatt maradt észrevétlen három piros elfogadási próba. A söprésbe
emelés 5+ perccel nyújtja a futást: **kiadási-kapu döntés**, nem egyoldalúan hozom meg.

**(3) A HÁROM PIROS BEMUTATÓ-PRÓBA** (`R89-06` · `R91-03` · `R93`) — **örökölt**, és az `R91-03` oka
behatárolva (9 vs. 11 bemutató; a különbség `tour.inviteRevoke` + `tour.reentry`, mindkettő
`requires_demo: true`). A 11→9 átírást **elutasítom**: az a próba gyengítése lenne. A helyes javítás a
demó-kapcsoló bekötése a próba-keretbe — a következő blokk munkája.

**Korábbról örökölt, nevesített függő, amit ez a PR nem zár le:** a `pending_intent` sorok **lejárat**
szerinti takarítása (`D-VS-3007`). A tábla most a tárral EGYÜTT korlátos, de **időben nem**.

---

## 8. FOGYASZTÁS — MÉRVE, NEM BECSÜLVE

Eszköz: `tools/v3_fogyasztas_meres.mjs` (FGY-01/3). Ablak: a csomag board-időbélyegétől a jelentés
írásáig. **A nyitott ablak záró pillanatképe:** `2026-10-06T14:14:22Z` — az ez utáni hívások (ennek a
lapnak az írása, a HTML-előállítás, a board-feltöltés) a következő mérésben jelennek meg.

| mit | mérve |
|---|---|
| ablak | `2026-10-06T10:30:15.916Z → 2026-10-06T14:14:22Z` |
| modellhívás | **412** (lefedettség: teljes — 1 átirat, minden válasz usage-dzsal) |
| cache-olvasás · kimenet | 153 631 644 · 526 941 |
| **ügynök-bemenet** | **0 (0 ügynök)** — ebben a csomagban al-ügynököt és workflow-t nem indítottam |
| fő szál kontextus | **medián 317 901** · max **783 400** · 400 ezer fölött **175** hívás |
| a mérő sáv-verdiktje MOST | **FIGYELMEZTETÉS** (a 300–400 ezres sávban): megállni nem kell |

**És amit ehhez kimondok, mert a szám menet közben változott:** a csomag csúcsán a kumulatív medián
**428 946** volt, tehát a mérő a **VÁLTÁSI** jelzőt adta — ezért kezdtem a zárást. A medián azóta
**317 901**-re ESETT, mert a beszélgetés **tömörítve folytatódott**, és a tömörítés utáni 92 hívás
alacsonyabb kontextussal futott. A tömörítéssel folytatott beszélgetés **nem friss beszélgetés** (R114),
ezért a javaslat áll: a **következő önálló nagy blokk** induljon friss beszélgetésben. Ez a jelző
kísérleti, nem szolgáltatói limit, és megtakarítási ígéretet nem hordoz.

A tartalom nélküli hívás-leltár (412 sor, csak számlálók — üzenet, parancs és eszköz-kimenet NEM):
`docs/70_PLANNING/V3_R154_FOGYASZTAS_LELTAR.json`.

---

## 9. AMIT EZ A REPORT NEM ÁLLÍT

* **Nem** állítja, hogy a V3 kész vagy kiadható: a 4. szakasz öt kimaradt területe kimondott hiány.
* **Nem** állítja, hogy a munkamenet-tár most hibátlan — azt állítja, hogy **28 nevesített hibája
  javítva van, és mindegyikre van gépi jel**. A gyökér-ok átalakítása nélkül a terület továbbra is a
  legvalószínűbb lelet-forrás.
* **Nem** állít semmit üzleti folyamatról, élő AI-ról és felhős üzemről: ezek mérése el nem végzett
  (KUKA-216 — a verdikt nem mutathat a mérés hatókörén túl).
* **Nem** zárja le a `CMD/PR-VS-300`-at: a SPEC ezt kifejezetten tiltja, és a zárási mátrix ebből a
  repóból technikailag sem elérhető (a katalógus a V2 repóban él, az eszköz ezt nevezett hibával mondja ki).
* A söprés **1 piros** lánca (`verify:external-checks`) **örökölt** — ezt méréssel döntöttem el, nem
  feltételezéssel —, de **piros**, és így is marad, amíg valaki nem javítja.
