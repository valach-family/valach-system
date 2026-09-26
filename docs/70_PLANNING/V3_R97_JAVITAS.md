> **Kör:** R97 · **Sáv:** Claude-v3 · **Állapot:** lezárt

Repó: valach-system

# R97 — A KÉT NYITOTT HIBA JAVÍTVA: a személy nyelve megmarad, a lejárt ellenőrzés nem terheli a gépet

CMD-VS-300-002-002 R97 — REPORT (válasz az R95-re)
PR-VS-300 · STEP-VS-300-002 · 2026-09-26
Sáv: Claude-v3 · Parancs: `CMD-VS-300-002-002 R95 — ANALYSIS` (chatgpt-v3) · Átadás: R96

---

## 0. MI TÖRTÉNT, EMBERI NYELVEN

Két konkrét hibát kellett megjavítani. **Mind a kettő megvan, és mind a kettőt MÉRÉS igazolja** —
nem az, hogy „átolvastam".

**1) Aki angolra vagy németre állította a felületet, annak kijelentkezés után magyar lett a képernyő.**
Most már nem: a választott nyelv a SZEMÉLYHEZ tartozik, és az újbóli belépés után is az ő nyelve jön
vissza. Végigmérve mind a három bekapcsolt nyelven, VALÓDI böngészőben, a teljes úton: nyelvválasztás
→ regisztráció → megerősítő levél → belépés → frissítés → **kijelentkezés → újbóli belépés**. És egy
böngészőben **két különböző ember** is helyesen működik: a második nem kapja meg az első nyelvét, az
első pedig visszatéréskor nem veszíti el a sajátját.

**2) Ha egy hosszú ellenőrzés lejárt, a már elindított háttérfolyamatai tovább futottak** — a gép
terhelve maradt, miközben a következő ellenőrzés már mért (tehát a MÉRÉS is romlott, nem csak a gép).
Most a futtató a SAJÁT folyamatfáját zárja le: szabályos leállítás → véges türelmi idő → ha kell,
kényszerleállítás → és **igazolja**, hogy nem maradt élő folyamat, MIELŐTT a következő ellenőrzés
indul. Ha mégis maradna, azt a jelentés KIÍRJA — nem hallgat róla.

**Egy dolgot külön ki kell mondani, mert ez volt a kör legtanulságosabb része.** Az 1) hiba egy elírás
volt (egy nem létező mezőnév), de a javítása NEM „elírás-javítás" lett: az elírás **két programágat
tartott halva**, és amikor az egyik feléledt, egy KORÁBBAN ELFOGADOTT szabályt sértett meg (a
következő ember örökölte volna az előző nyelvét). Ezt a saját böngésző-próbám fogta meg, még a
szállítás előtt. Tanulság a jövőre: egy halott ág feléledése **új viselkedés**, amit végig kell mérni.

**Ami NEM készült el, és miért:** a teljes rendszer-zöld továbbra sem állítható. A két több-tízperces
ellenőrzési lánc ebben a körben NEM futott (a parancs kimondottan szűkítette a futtatást) — ezt
NEVESÍTETT hiányként írom, nem zöldként. Egy régi, már korábban is ismert piros (`verify:capability-
witness`) megmaradt: annak a javítása a V2 repóban lenne, amit a parancs kizár.

---

## 1. F95-01 — A SZEMÉLY VÁLASZTOTT NYELVE ✔ JAVÍTVA

### A gyökér, a forráson

A `setLang` **nyelvkód-sztringet** ad vissza (`v3app/public/i18n/dict.mjs` 82). Az R94-es kód viszont
HÁROM helyen egy nem létező `got.code` mezőt vizsgált rajta (`app.js` 459 · 462 · 1890): két ág (a
személyhez mentés) **soha nem futott le**, a harmadikat a tartalék-ága (`: wanted`) mentette meg,
VÉLETLENÜL. Ezért a kijelentkezéskor ÜRÜLŐ választás-kulcs eltűnése után nem volt mire visszaesni.

### A javítás — EGY szabály, EGY bejárat, MÉRT kimenet

| darab | mit tesz |
|---|---|
| `v3app/public/i18n/langMemory.mjs` (**új**, LNG-02) | a döntés EGY tiszta feloldóban: `decideLang` → `code` + **`source`** (`choice` · `url` · `stored` · `carried` · `accept_language` · `default`) + `persist_for_person` · `persist_choice` |
| `v3app/public/app.js` | **EGY** bejárat érvényesít (`useLang`), tehát **pontosan egy** `setLang(` hívás van, mező-olvasás nélkül; a kulcsot a feloldótól kéri (`langStoreKey`) |
| `v3app/public/texts.mjs` | a nyelv-emlékezet is a KÖZÖS szöveg-bejáraton jön — nincs két ajtó ugyanahhoz |

A `source` azért van, mert a KUKA-238 pontosan erről szól: egy tartalék-ágas feloldó **elrejti** a
hibás hívást. Ha a döntés megmondja, HONNAN jött a nyelv, akkor a néma alapnyelvre esés nem
téveszthető össze egy valódi választással — és a próba ezt HÍVJA, nem utánozza.

### A MÁSODLAGOS LELET — a saját böngésző-próbám fogta meg

A mezőnév javításával a lap CÍMÉBŐL (`?lang=`) jövő ág **feléledt**, és a NÉVTELEN tárolási maradványt
(`vs3.lang.anon`) tudatos választássá mosta: egy második ember, aki ugyanabban a böngészőben
regisztrált, **örökölte volna az első nyelvét** — ez az R93-04 utolsó állításának a megsértése, amit a
külső fél kikötése kimondottan tilt („a régi anonim tárolási maradvány NEM ilyen választás"). Ezért a
hordozó választás-kulcsot mostantól **kizárólag valódi átállítás** írja; a cím ága a nyelvet
megjeleníti és BELÉPETT emberhez elteszi, de hordozót nem gyárt.

### A bizonyíték — parancs, eredmény, forrás

| mérés | parancs | eredmény |
|---|---|---|
| a szabály és a bekötése | `npm run verify:app-findings-r95` | **42/42 PASS** |
| VALÓDI böngésző, teljes út | `npx playwright test tests/e2e/v3app-r97.spec.mjs` | **2/2 PASS** (9,0 s) |
| a korábbi nyelv-esetek (nem rontottam el) | `npx playwright test tests/e2e/v3app-r93.spec.mjs tests/e2e/v3app-r91.spec.mjs` | **10/10 PASS** |
| a HTTP-héj szerződései | `npm run verify:app-selfcheck` | **57/57 PASS** |

A böngésző-próba két helyzete:

- **R97-01** — mind a három bekapcsolt nyelv (`hu` · `en` · `de`), és a böngésző nyelve SZÁNDÉKOSAN
  MÁS, mint a választott (különben a böngésző alapértelmezése „eltalálná" a helyes eredményt):
  `hu (böngésző: en-US)` · `en (böngésző: hu-HU)` · `de (böngésző: hu-HU)` — mindháromnál az ELSŐ
  belépés, a FRISSÍTÉS és az ÚJBÓLI BELÉPÉS is a választott nyelvet adta. A próba a MECHANIZMUST is
  megnézi: a személyhez kötött tárolási kulcs (`vs3.lang.<alany>`) tényleg megszületik-e.
- **R97-02** — két ember EGY böngészőben: `Anna(en)` · `Béla(de)`, a böngésző magyart kér. Béla nem
  örökölte Anna nyelvét, a sajátját megkapta, Anna visszatérésekor az övé is megvolt — a tárolóban
  **két külön kulcs, két igazság**.

**A próba alanyai a JEGYZÉKBŐL jönnek** (`enabledLanguages()`), nem kézi listából, és PADLÓ védi a néma
zsugorodást (KUKA-045 · 051): egy új nyelv bekapcsolása INGYEN bekerül a mérésbe, kód-változás nélkül.

**ROMLÁS-ELLENPRÓBA (KUKA-092 · 127).** A battéria ugyanazt az utat végigjárja a HIBÁS (R94-es)
mentési szabállyal is, és ott **minden nem-alapnyelvnél elbukik** az újbóli belépésnél
(`en→hu` · `de→hu`), miközben az ELSŐ belépést a rontás NEM rontja el — vagyis a próba pontosan azt a
hibát fogja meg, ami volt, és megmutatja, miért nem fogta meg az R93-04.

---

## 2. F95-02 — A LEJÁRT ELLENŐRZÉS NE TERHELJE TOVÁBB A GÉPET ✔ JAVÍTVA

### A javítás

`tools/lib/vs_child_runner.mjs` (**új**, CHR-01): a gyermek **saját folyamatcsoportban** indul
(`detached`), és a leállítás a CSOPORTRA megy — nem a közvetlen gyermekre. Időtúllépésnél: szabályos
jel → **véges** türelmi idő (5 s) → kényszerleállítás → **igazolt üresség**. A takarítás **sikernél,
hibánál ÉS megszakításnál** ugyanaz az út, a jel-küldés **EGY ponton** megy át, és KIZÁRÓLAG a maga
indította, **nyilvántartott** csoportokra — idegen azonosítóra a modul kivételt dob. **Gépszintű
`pkill`, küszöb-emelés és állítás-gyengítés nincs.** Nem támogatott platformon (win32) **NEVEZETT
korlát** áll a hallgatás helyett.

`tools/vs_verify_sweep.mjs`: az `execSync` kivezetve, a söprés ezt a futtatót hívja; a **maradvány**
NEVEZETT tény a jelentésben, és az összverdikt akkor nem zöld.

### A bizonyíték — `npm run verify:child-runner`, **26/26 PASS**

| eset | mit mér | eredmény |
|---|---|---|
| CR01 | normál siker (kimenet · kilépés 0 · a fa üres) | PASS |
| CR02 | **hibás kilépés**: a kód (3) megmarad, a hibacsatorna is | PASS |
| CR03 | **makacs gyermek ÉS unoka** (héj → node → node, SIGTERM-et elnyelve): a lezárás igazolt, `kenyszerrel` | PASS — a két NEVEZETT PID-en mérve, egyik sem él |
| CR04 | **nincs további életjel, nincs átfedés**: a lejárt fa életjel-fájlja NEM nőtt a következő ellenőrzés alatt (35 → 35 bájt) | PASS |
| CR05 | **ELLENPRÓBA**: a RÉGI mechanizmus (`execSync` + `timeout`) ugyanitt MÉRHETŐEN szivárog — a fa él, az életjel nő (35 → 45) | PASS |
| CR06 | **megszakítás** (SIGINT): nem marad élő folyamat, nincs további életjel, és a jel nem nyelődik el (kilépés 130) | PASS |
| CR07 | **hatókör**: idegen csoportra kivétel · nincs héj-hívás/killall · EGY jel-küldő pont + EGY állapot-kérdező | PASS |
| CR08 | **bekötés**: a söprés tényleg ezt hívja, `execSync` nincs benne, a maradványt kiírja | PASS |

**A CR05 a mérés harmadik szava** (KUKA-127): a zöld csak akkor jelent VÉDELMET, ha a régi alak
ugyanezen a helyzeten elbukik. Ha egy platformon a régi alak sem szivárogna, a válasz „**nincs
alkalmazható eset**", nem zöld (KUKA-093).

**Kimondva, mit NEM bizonyít:** a szintetikus próba a MECHANIZMUST méri, nem az eredeti 15 perces
söprés-futást. A processzor-terhelés és a modell-fogyasztás **külön mérték**: a beragadt futás pontos
token- vagy heti limit-költsége **nincs megmérve**.

---

## 3. F95-03 — MUNKAMENET-HATÁR ÉS FOGYASZTÁS

A bizonyíték-mentést az R95/R96 kör elvégezte (`V3_R95_FOGYASZTAS_LELTAR.json` — 325 tartalommentes
hívás-sor, három ablakra bontva). **Ez a kör a FRISS munkamenet**, ahogy az R95 §F95-03/3 előírta: a
javítás itt indult, rövid, forrás-kötött átadással, a teljes múlt visszaolvasása nélkül.

**A 200 ezres mediánjelző ÁTLÉPVE, és ezt nem hallgatom el.** Mérve munka közben
(`npm run meres:fogyasztas -- --session auto --from <a csomag kezdete> --quick`), 82 hívásnál:
**fő-szál kontextus medián 235 329,5 / max 348 286**, ügynök 0. A szabály szerinti válasz: azonnali
**checkpoint** (a kész javítás commitolva és feltolva: `e72e4b6`), majd **szűkítés** — innentől
célzott, kis kimenetű műveletek, új hosszú lánc és új nagy olvasás nélkül. Párhuzamos végrehajtó,
workflow és ügynök **nem indult** ebben a körben (0 ügynök — mérve).

**A ZÁRÓ MÉRÉS** (`--session 9a15ba99… --from 2026-09-26T19:05:00Z --to 19:56:00Z --calls`):

| mit | mennyi |
|---|---|
| hívás az ablakban | **100** (1 átirat, lefedettség: **teljes**) |
| fő-szál kontextus | **medián 254 809,5 · max 386 245** · 400 ezer fölött **0** hívás |
| friss bemenet · cache-írás · cache-olvasás · kimenet | 200 · 346 716 · 24 992 698 · 149 147 |
| ügynök | **0** (ügynök-bemenet 0) |

A tartalommentes leltár: **`docs/70_PLANNING/V3_R97_FOGYASZTAS_LELTAR.json`** — 100 hívás-sor, zárt
kulcs-listán (`n · ts · kind · agent · model · input · cache_write · cache_read · output · context ·
trigger · incomplete`), tehát üzenet, parancs, eszköz-kimenet és fájlnév **nincs** benne. Fájlonkénti
hash-manifeszt: **`docs/70_PLANNING/V3_R97_HASH_MANIFESZT.json`** (200 fájl · 11 114 510 bájt ·
`tree_digest` `30813d72c235cde19b88fce769150655a656d58e53a4f11ca6592ff0ba021885`).

**Ismeretlen költség `null`, nem nulla**, és a publikálási farok (ez a commit és a feltöltés) külön
jelölt hiány — mérésként nem számolom hozzá. A küszöb-átlépés a kör **elején** történt (a 82. hívásnál
mérve), tehát a checkpoint és a szűkítés a csomag nagyobbik felére érvényesült; **az „egyben tartás"
nem felmentés a korlát alól**, ezért a következő csomag FRISS munkamenetben indul.

---

## 4. A SÖPRÉS ÉS AMI NEM FUTOTT — NEVESÍTVE

`npm run verify:sweep -- --skip verify:external-checks,verify:v3ref`

- **25 verifier futott**, ebből **24 zöld**.
- **NEM FUTOTT — NEM IGAZOLT (2 lánc):** `verify:external-checks` · `verify:v3ref`. Az R95 kimondottan
  szűkítette a futtatást („a teljes hosszú sweep ismétlése nem automatikus lezárási feltétel"), ezért
  ezeket NEM indítottam el. **Tárgyi indok:** ennek a csomagnak a változásai a felületet
  (`v3app/public`), a szerszámokat (`tools/`), a regisztereket (`contracts/`) és a próbákat érintik — a
  magreferencia (`v3ref/`) **egyetlen fájlja sem változott**. Az összverdikt ettől **NEM zöld**, és ez
  a helyes alak: a nem futott nem „részben" (KUKA-206 · KUKA-200).
- **PIROS, ÖRÖKÖLT, NEVESÍTETT: `verify:capability-witness`** — három rögzítés ELAVULT a V2 board
  regiszterében (`v3-ui-slice` · `v3-vertical-slice` · `v3-user-facing-text`, mind „mért: present ·
  rögzített: absent"). Ezt már az R91 lelet is nevesítette; a javítás a **V2 repó**
  `tools/chatops-board/config/matrix-capabilities.json` három sorának `present`-re állítása lenne, amit
  a parancs (V2-módosítás nélkül) **kizár**. **MÉRVE, nem feltételezve:** az átadási fejen
  (`e7930953`) ez a verifier ZÖLD-nek látszott, mert ott a V2 regiszter nem volt elérhető („rögzített:
  —" = nincs mihez mérni); ahol elérhető, ott piros. A piros tehát **nem ennek a körnek a műve**, de
  nem is „elfogadott zöld" (KUKA-122).

### Két IDEGEN őrt is hozzá kellett igazítani — kimondva

1. **`verify:i18n` I18N01** a nyelvcsomag-mappa MINDEN `.mjs`-ét csomagnak vette két kivett néven
   kívül, ezért az új LNG-02 modul „holt nyelvcsomagként" jelent meg — az őr egy SZABÁLYOS állapotot
   mondott hibának (KUKA-049), és a kizáró felsorolás a következő modulról sem tudott volna
   (KUKA-057). Javítva: a csomag-ságot a fájl SAJÁT deklarációja mondja meg (`export const meta … code:`),
   és a mérés a kihagyott segéd-modulokat is NEVESÍTI (KUKA-091).
2. **`verify:sweep-reuse` SRU10** harmadik állítása a söprés kilépési sorának SZÓRENDJÉT mérte, ezért
   pirosat adott, amikor a feltétel egy ÚJ, szabályos taggal (a folyamat-maradvánnyal) bővült. Javítva:
   a pin azt méri, hogy a NEM IGAZOLT kihagyás BENNE VAN a kilépési feltételben — a tagok sorrendje nem
   szabály (KUKA-009).
3. **Két KUKA-jel OTTHONT VÁLTOTT:** a KUKA-238 és a KUKA-234 pozitív mintája a lapon mérte a feloldó
   hívását és a tárolási kulcs alakját; mindkettő a LNG-02 modulba költözött, ezért a jel is oda került
   — egy nem létező helyen mért minta zöldnek LÁTSZANA (KUKA-051). A tanulságok érvényben, a jelük a
   MAI helyén mér.

---

## 5. KÖNYVELÉS

- **KUKA-245** — a sztringen olvasott `.code` mező két ágat tartott halva, és az egyik feléledése egy
  MÁSIK szabályt sértett meg (regiszter · guardHome `v3` · archívum-sor · alapvonal).
- **KUKA-246** — a lejárt ellenőrzés unokái tovább futottak (ugyanaz a négy hely).
- **D-VS-3078** (LNG-02) és **D-VS-3079** (CHR-01) a `DECISION_LOG.md`-ben; a szám a
  `verify:decision-numbers`-ből jött, nem emlékezetből.
- `npm run verify:kuka`: **456/456 PASS** (a két új jel ITT fut, a `vs`-padló nem nőtt).

---

## 6. HASZNÁLAT-PRÓBA (D-VS-497) — ÍRÁSBAN

1. **KI OLVASSA?** A `vs3.lang.<alany>` kulcsot a lap olvassa minden betöltésnél és minden
   személyváltásnál (`restoreLang`); a `source` mezőt a próbák olvassák. Új mentett érték, aminek nincs
   olvasója, nem keletkezett.
2. **MI VISZI KI?** A nyelvet a `useLang` viszi a képernyőre (`applyLanguage` + `render`), a mentést a
   döntés `persist_*` mezője viszi a tárolóba. A futtató oldalán: a maradványt a söprés jelentése viszi
   ki az emberhez, nem néma napló.
3. **HOL KATTINT?** Névtelenül a belépő kártya nyelvválasztóján (`lang-select-public`), belépve a
   **Profil** lapon (`lang-select`) — a böngésző-próba MINDKETTŐT a felhasználó útján használja (a
   profil-menün át nyitva, nem végpontról).
4. **MIT LÁT UTÁNA?** A művelet után a lap `lang`/`dir` attribútuma és MINDEN felirat az új nyelven
   áll (egyetlen újrarajzolás), a tudás-index és a segéd-állapot ürül, tehát nem marad elavult tartalom.

---

## 7. AMI VÁLTOZATLANUL NYITOTT — nem rejtett pluszfeladat

élő AI-mérés · a modell kiválasztási minőségének mérése · **teljes háromnyelvű lektorálás
(RÉSZLEGES ÁTNÉZÉS marad)** · a meghívó-elfogadás saját képernyőjének súgója/túrája · a
V2-képesség-katalógus három hiánya (**hiány**, nem elfogadott piros) · a külső lánc három eltérése
(`r79` · `r59a` · `r59`) — az `r79` időzítési magyarázata NEM bizonyítja minden sikertelen eset gyökerét ·
a két hosszú lánc ebben a körben NEM futott (fent nevesítve).

Teljes rendszer-zöld nem állítható; a 16 elfogadott / 13 részleges klauzula NEM készültségi százalék;
teljes core-core lezárás nincs. **Ismeretlen költség `null`, nem nulla.** V2-re átadható ár/érték-javulást
ez a kör nem bizonyít, és V2-módosítás, merge, telepítés, migráció, új előfizetés, üzleti Mini modul,
párhuzamos végrehajtó, ultracode vagy modellváltás nem történt.
