# DECISION LOG — Valach System (V3)

**A számozás a 3000-es blokkból megy.** A V2 (`valach-family/vs`) a 3000 ALATT marad, a V3 a
3000-től — így két repó egyszerre oszthat számot ütközés nélkül, és a `D-VS-…` továbbra is EGY
dolgot jelöl, nem kettőt. Gépi őr: `npm run verify:decision-numbers` (kiírja a következő szabad
számot, és piros lesz, ha valaki a blokkon kívülre lép).

**A határ mérésből jön, nem tippből** (D-VS-3005): az első alak a 700 volt, és a V2 akkor a 670-nél
állt — 29 szabad szám, a git-történetből mért ütemen (433 → 670 huszonkét nap alatt) **egy hét**.
A V2 nem áll le: a Shoprenter-szinkron és a folyamatok alapszintű működése még hátravan, három
cégtér használja a KS kiváltására. A 3000-es határ **2329 szabad számot** hagy neki, ami a mért
leggyorsabb ütemen is 215 nap, a mai ütemen másfél év.

A 3000 előtti döntések a V2 repó `DECISION_LOG.md`-jében élnek. Nem másoljuk át: egy fogalomnak EGY
otthona van (KUKA-018).

---

## D-VS-3036 — AZ R26 ÖT LELETE JAVÍTVA: A BEFOGADÁSI SZABÁLY, AZ ESZKÖZ-SOR ÉS A PR155-FOLYTATÁS

> **Hatály:** V2+V3 — a javítás a V2 repó board-eszközében (`tools/chatops-board/`), a rajta megjelenő
> ADAT a V3 köreié. **A V3 magban egyetlen fájl sem változott; merge, telepítés, migráció nem történt.**

**Dátum:** 2026-09-17 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R27 (az ő **R26 ANALYSIS**
lapjukra, verdikt: `needs_fix`) · **Lap:** `docs/70_PLANNING/V3_R27_R26_OT_LELET_JAVITAS.md`

**1. MIND AZ ÖT LELET REPRODUKÁLVA ÉS JAVÍTVA** — a külső fél futtatható programjával, előtte-utána:
**F26-01** egy R20-as mérés R24-es „kizárólagos" fogyasztásként ⇒ a mérés SAJÁT köre és a kötés köre
egyezzen (`roundsAgree`), különben a kizárólagosság esik el, nem a mérés · **F26-02** a KÖZVETLEN
dokumentum-blokk megkerülte az „ismeretlen adat nem szám" védelmet ⇒ a szabály a VALIDÁTORBAN áll,
mindkét bejáratra, és az ellentmondás LÁTHATÓ hiba · **F26-03** a nem felosztott intervallum a funkció
összegébe olvadt ⇒ HÁROM befogadási rekesz · **F26-04** a sor-átírásból kimaradtak a teszt- és
hibaszámok (a számlálók átírása karakterre azonos HTML-t adott) ⇒ visszakerültek a SORRA, dátummal és
forrással, „—"-lel a hiányra · **F26-05** a csupa szóköz `review` is elfogadás volt ⇒ `namedReview`,
trim után sem üres, mindkét kapun.

**2. A BEFOGADÁS HÁROM REKESZE (`admissionOf`).** Egy futás száma CSAK akkor adódik a funkció igazolt
összegéhez, ha mind a három minősítés megvan (elszámolt számláló · van token-kép · kizárólagosan ehhez
a körhöz rendelt). Egyébként a szám MEGMARAD és látszik — **nem felosztott** (△) vagy **örökölt** (◇)
rekeszben —, de SOHA nem adódik az igazolthoz: hiányzó minősítésből nem következik bizonyítottság.

**3. TOOLING-V3-PROGRESS (a külső fél R26 §1 döntése).** A katalógus három osztálya kimondott:
**170 termék + 1 közös (CORE-SHARED) + 1 eszköz**. A termék-készültség nevezőjébe az eszköz- és a közös
sor nem kerül, az eszköz ráfordítása nem másolódik a CORE-SHARED-be, és a próbák ezt SZABÁLYKÉNT mérik
(osztályonként), nem vak darabszámmal.

**4. A KIHAGYÁS NEM SIKER.** A böngésző-próba hiányzó Playwright mellett eddig `exit 0`-val „KIHAGYVA"-t
mondott — a kapuban PASS. Most **3-as kilépési kód** („NEM FUTOTT"); a `--allow-skip` kimondottan
vállalható, és a kimenet is kimondja, hogy az nem bizonyíték.

**5. TERMELŐ → DOKUMENTUM → FELÜLET, mérve.** A böngésző-próba (O)–(Q) lépése a VALÓDI láncot járja
végig: `tools/vs_usage_snapshot.mjs` → `v3UsageAdapter` → `v3_progress_append` ÍR egy riport-fájlt → a
fájl szövege dokumentum-sorként → a fül sora a képernyőn (teszt `45/0/0`, hiba `5/0`, és a fogyasztás
NEM igazolt, mert a főágon szállított mérő nem ad elszámolási tanút).

**6. EGY MÉRT MELLÉK-LELET, JAVÍTVA.** A board egység-futtatója nem ismerte a Node teszt-összegzőjét
(`# pass`/`# fail`), ezért a két új próba **35 esete NÉMÁN kimaradt** az összesítésből; a futtató
megtanulta az ötödik alakot (1825 → **1860**).

**7. GÉPI JELEK.** `test:v3progress` 24 · `test:v3usage` 11 · `test:v3progress:mutations` **22/22 rontás
PIROS** · `proof:v3progress-ui` **25/25** · board teljes egység-sor 44/44 fájl · 1860 eset ·
`verify:kuka` **479/479** · `verify:no-undef` PASS.

**8. KUKA-102 · KUKA-103.** A védelem a TERMELŐNÉL állt, nem a SZABÁLYNÁL (két bejárat, a próbám a
sajátomat mérte) · az ÁTÍRÁS némán elvett egy működő oszlopot (a MÍNUSZT is át kell nézni). Mindkettő
tiltó-mintát kapott, és bizonyítottan tüzel: a visszalépéseket visszatéve a `verify:kuka` 477/479.

**9. A PR155 FOLYTATÁSA: DRAFT INTEGRÁCIÓS PR** — valach-family/vs **#160**, a saját ágamról a
`codex/v3-progress-dashboard` cél-ágra, draft, a repó PR-sablonjával, „NOT READY" merge-ajánlással.
Azonos tárgyú PR nem volt nyitva. **A merge, a zárás és a telepítés továbbra sem része a csomagnak.**

**10. AMI NYITVA MARAD — KIMONDVA.** A független elfogadás a chatgpt-v3 dolga (a saját tesztem nem az) ·
a V3 külső ellenőrző lánc piros eredményeinek oka továbbra sem igazolt (külön alap-ellenőrzési kérdés) ·
a V3 kör-eszköz `frmCatalog`-hiánya regisztrált korlát marad · a `verify:registries` /
`verify:vertical-slices` / `verify:screen-texts` NEM futott, mert a VS TERMÉK regisztereit méri, ez a
csomag pedig board-eszközt módosít — ez kihagyás, nem zöld.

---

## D-VS-3035 — A V3 HALADÁS-FÜL BEFEJEZÉSE ÉS AZ R20 GÉPI BLOKK HELYESBÍTÉSE

> **Hatály:** V2+V3 — a fül KÓDJA a V2 repóban lakik (`tools/chatops-board/`), a rajta megjelenő
> ADAT viszont a V3 köreié. **V2 TERMÉK-kód nem változott; merge, telepítés, migráció nem történt.**

**Dátum:** 2026-09-17 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R24 (az ő R23 LETTER-ükre,
azon belül az operátori CMD-VS-200-011-003 R7-re) · **Lap:**
`docs/70_PLANNING/V3_R24_HALADAS_FUL_BEFEJEZES.md`

**1. HÁROM TENGELY EGY OSZLOP HELYETT (KUKA-002).** A megfigyelés `status` mezője a MUNKAFÁZIST és a
BLOKKOLTSÁGOT is hordozta, ezért egy blokkolt sorról nem lehetett megtudni, hol tartott. Mostantól
`phase` (hol tart) · `blocked` (mi állítja meg, MEGNEVEZETT okkal) · `delivery` (megírt · tesztelt ·
külsőleg elfogadott · telepített, mind `true`/`false`/`null`). A két bizonyíték-igényű állapot
bizonyítékot kér: külső elfogadás ⇒ független `review`, telepítés ⇒ `deployment.reference`. **A régi
alak olvasható marad, és nem találunk ki helyette semmit:** egy régi `blocked` sor fázisa `unknown`,
és a képernyő ezt KI IS ÍRJA.

**2. A HÁROM MINŐSÍTÉS KÜLÖN MARAD** (az R23 §4 kikötése): `token_coverage` · `settlement` ·
`attribution`. Nem igazolt elszámolás mellett fogyasztási szám nem állhat a soron; az `unavailable`
és az `unknown` SOHA nem válik nullává; a részösszeg mellett a lefedettség ÉS a forrás-pillanatkép
dátuma is látszik; a fázis-idők és a külön attribuált token-mezők saját mérési bizonyítékot kérnek.

**3. ADAPTER, NEM MÁSODIK MÉRŐ.** `vs-usage/1` → `v3-progress/1` (`v3UsageAdapter.js`), a V2 R5
REPORT + a PR157 rögzített revíziója (`c03603ae`) szemantikájával, a PR158 azonosság-ellenpéldáival.
A két PR nincs mainen: az adapter nem másolja a kódjukat és nem dönt közöttük — a HATÁRON újra
ellenőrzi, amire támaszkodik. A futás-azonosító a MÉRÉSBŐL képződik, ezért ugyanaz a mérés kétszer
átalakítva EGY sor marad (a `vs-usage` és a `v3-progress` eredmény nem adódik össze).

**4. AZ R20 GÉPI BLOKK HELYESBÍTVE, SZÁM NÉLKÜL.** A lap §7/c szövege már az R21 szerinti okot
mondta, a gépi blokk `limitation` mezője viszont még az elveszett fő naplót állította. A helyesbítés
UGYANAZON a run-azonosítón és UGYANAZON a megfigyelési időn áll, minden metrika `null` maradt, és a
`correction` mező kimondja, hogy ez nem új mérés. A §7/b „a lefedettség `partial`" állítása is
javítva: a kör költsége nem részleges, hanem EGYÁLTALÁN NEM MÉRT.

**5. HÁROM SAJÁT LELET.** (a) A PR155 böngésző-globálisa nem a testvérek `ChatOps…` alakját vitte,
ezért a V2 `verify:no-undef` őre **7 találattal PIROS** volt — a PR155 sosem ment át ezen a kapun
(KUKA-016 · KUKA-036). (b) A sor-szintű minősítés az „ismeretlen"-t „részlegessé"/„nem igazolttá"
LÉPTETTE ELŐ: a VALÓDI R20 soron a méretlen kör „Részleges / Nem igazolt"-ként jelent meg — a nem
tudás és a tudjuk-hogy-nem két külön válasz (KUKA-093); megtalálta a saját böngésző-próbám. (c) A
deduplikáció próbája gyenge volt (két azonos ezredmásodpercű átalakítást hasonlított), ezért egy
óra-alapú azonosító is átment volna — megtalálta a rontás-battéria (KUKA-054).

**6. GÉPI JELEK.** `npm run test:v3progress` (18) · `test:v3usage` (10) ·
`test:v3progress:mutations` (**14/14 rontás PIROS**, a kilépési kódon) · `proof:v3progress-ui`
(**20/20**, VALÓDI R20 blokk SZINTETIKUS kiszolgálón) · a board teljes egység-sora 44/44 fájl ·
1825 eset · `verify:kuka` 470/470 · `verify:no-undef` PASS (a kör elején PIROS).

**6/b. A HIBÁS ALAK KUKA-BEJEGYZÉST KAPOTT — KUKA-101** (a V2 aktív memóriájában, három tiltó-mintával;
bizonyítottan tüzel: a régi összevonást visszatéve a `verify:kuka` 473/474-re esik). Tanulság: *az
összevonás soha ne adjon határozottabb választ, mint amit a részei tartalmaznak.*

**6/c. MÉRT, NEM JAVÍTOTT LELET:** a `tools/vs_board_round.mjs` MÁSOLATA ebben a repóban nem fut —
`MODULE_NOT_FOUND`, mert a `tools/chatops-board/src/frmCatalog.js` a V2 repóban lakik (KUKA-031/040
rokona). A kört a V2 példányával tettem fel; a javítás a következő körre marad, mert az R23 kikötötte,
hogy e csomag mellett más munka ne induljon.

**7. AMI NEM TÖRTÉNT MEG — KIMONDVA.** Nincs merge, telepítés és migráció; a PR155 ágára nem írtam
(a munka a saját ágon áll, a PR155 fejére ráépítve); a PR157/158 összefésülése nem az enyém; a fül
SAJÁT ráfordításának nincs katalógus-sora, és egyoldalúan nem nyitok ilyet — nyitott kérdés a
katalógus gazdájának. A böngésző-próba nem éles bizonyíték: szintetikus kiszolgálón fut.

---

## D-VS-3034 — F18-01 JAVÍTVA, AZ OB-7 LEKÉPEZÉS ELKÉSZÜLT, ÉS A K0 MÉRVE

> **Hatály:** V2+V3 — az F18-01, az OB-7 leképezés és a K0 a V3 magja; a **körmérő v3-progress/1
> vetítése** viszont a KÖZÖS szerszámot érinti, ami fizikailag a V2 repóban lakik
> (`tools/vs_round_cost.mjs`), ezért a V2 fejlesztőnek is tudnia kell róla. **V2 TERMÉK-kód nem
> változott; PR nem született.**

**Dátum:** 2026-09-16 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R20 (az ő R18 + R19 lapjukra)

**1. F18-01 — A HIBÁS ALAK CSAK AZ EGYIK ÁGON VOLT HIBA.** A külső fél lelete:
`sweepVerdict({exitCode:0, stdout:'VS-SWEEP-VERDICT: nonsense'})` **ZÖLD** volt, ugyanaz a sor
`exit 1`-gyel piros. A szerződés SZÖVEGE (R17 §3/a) kimondta, hogy a hibás alak `failed` — a KÓD
viszont ezt CSAK a nem-nulla kilépés alá tette (**KUKA-039** fél-őre a saját, egy körrel korábbi
szerződésemen). **A saját pinem sem foghatta meg:** az SWV04 a hibás alakot KIZÁRÓLAG `exit 1`-gyel
mérte — tükröt mért, nem ellenpárt. Javítás: a hibás-alak vizsgálat a SIKERÁG ELŐTT fut, NEVEZETT
indokkal. Gépi jel: **`verify:sweep-verdict` SWV07** — a lelet mindkét kóddal, négy további hibás
alak nullával zárva, HÁROM ellenpár (jelölő nélküli zöld · érvényes kihagyás · türelem-túllépés), és
az ÖTÖDIK VALÓDI gyermek-folyamat. A régi sorrendre bizonyítottan piros: **7 SWV07 állítás + SWV05**.
Tanulság: **KUKA-176**.

**2. OB-7 — A LEKÉPEZÉS ELKÉSZÜLT, AZ ELBÍRÁLÁS NEM (és nem is az enyém).** Az R18 §1 kérte; kész:
`docs/70_PLANNING/OB7_LEKEPEZES.json`, amit a **`tools/vs_ob7_map.cjs`** generál a MAI forrásból.
A hét lépésből ÖT gépi (normaszöveg + lenyomat · pozitív/negatív eset · mutációk · a ténylegesen
megbukó állítás · a lánc-számok), KETTŐ próza, külön állományban (`OB7_PROZA.json`) — hogy látsszon,
mi az enyém (KUKA-082: a kézzel írt kivonat elcsúszik a gépi leltártól). **MÉRVE: 20 klauzula · 72
lánc-sor (53 fedett · 12 részben · 7 bizonyíték nélkül) · 22 próba · 56 falszifikáló mutáció · 0 fel
nem oldott azonosító.** A `content_review` MINDEN soron `null` — azt CSAK a független fél írhatja
(R57/F03). **KIMONDOTT KORLÁT:** a próza-oldalra ebben a körben NEM futott független
kereszt-ellenőrzés.

**3. K0 — A BIZONYTALAN MENNYISÉG ÉS A NÉGY ALAPKAPCSOLAT, FUTTATVA.** Az R19 §9.1 feltétele
(„konkrét támogatási mód ÉS ellenpélda") nem forrás-olvasással teljesíthető, ezért **futtattam**:
`node tools/vs_k0_qnt_probe.mjs` — **9 mérés: 2 rendben · 5 hiányzik · 2 hibás.**
· **A LEGSÚLYOSABB (C2):** a magban EGYETLEN mennyiségi művelet van (`stock.receipt`), és az MOZGÁST
ír — a „pontosabban megmértük ugyanazt" csak új áruként fejezhető ki: **100 + 90 = 190**, holott egy
90 kg-os tétel van. Nem hibás funkció, hanem **hiányzó fogalom: a MEGFIGYELÉS** (QNT-07 · QNT-18).
· **E1:** egy „mérlegjegy" és egy „receptből becsült" bevét sora az azonosítón kívül **BÁJTRA
AZONOS** — a QNT-03 hét eredetéből egy sem tárolható.
· **D1:** a mag KÉT időt tárol, az R19 §5.2 HÁRMAT kér — a MEGFIGYELÉS ideje sehol.
· **B1:** a kiadott eredmény adatköre a TÁRGYAT osztályozza, az EREDETET nem; mért és becsült 100 kg
azonos választ kap.
· **AMIT MEG KELL TARTANI (R19 §9.1):** az azonosság MÁR MA elválik a mennyiségtől (A1 — a cikk-törzs
nem hordoz mennyiséget), az ismétlés-kulcs nem dupláz (C1), és az audit-lánc kötött (`effect_id`).

**4. SAJÁT LELET A SAJÁT MÉRŐMBEN.** A K0 B1 első alakja `Object.keys()`-t hívott a deklarált
eredmény-típusok LISTÁJÁRA, tehát a tömb INDEXEIT mérte típusnak — a mag jogos válasza így „nincs
deklarálva" leletnek látszott volna. **A mérő hibáját nem jelentem a rendszer hibájaként**
(KUKA-094 a mérőn); javítva, a valódi típusok (`stock.issue/1` · `stock.receipt/1`) állnak a mérésben.

**5. HELYESBÍTÉS A SAJÁT KÓDOMBAN: az OB-7 darabszáma.** A `norms.mjs` OB-7 feltétele „MIND a
tizenhat klauzulát" mondott, miközben a regiszter HÚSZAT hordoz és a lánc 72 sort. A kézzel léptetett
szám elcsúszott (**KUKA-045**): a szöveg mostantól nem mond darabszámot, hanem a mérésre mutat.

**6. KÖRNYEZETI VESZTESÉG — KIMONDVA, ÉS EGY SAJÁT OK-HELYESBÍTÉS.** Az OB-7 leképezést KÉTSZER
állítottam elő: az első, 22 ügynökös menet eredménye a **futtatókörnyezet konténerének
újraindulásával elveszett** (a munkaterület és az ügynök-naplók — mérve: 0 alügynök-napló maradt), a
K0 ága és négy ellenőrző ügynök pedig **kvóta-korlátba** ütközött (a munkamenet leírója: a hét napos
keret `rejected`, az extra használat szervezeti szinten letiltva). **A kör KÖLTSÉGÉRE viszont ELŐSZÖR
TÉVES OKOT ÍRTAM:** azt mondtam, a kör-jelölőt hordozó napló is elveszett. Mérve NEM igaz — egyetlen
napló van, egyetlen munkamenet-azonosítóval, 14:21:23-tól folyamatosan, az újrainduláson ÁT. A valódi
ok: a napló a BESZÉLGETÉS-ÖSSZEFOGLALÓ határánál kezdődik, a kört NYITÓ üzenet nincs benne, a jelölő
pedig nyolcszor előfordul, de MIND EMLÍTÉSKÉNT (összefoglaló · eszköz-eredmény) — a mérő ezért nem
nyitott csomagot, és ez a KUKA-134 / R90 §3 szabály HELYES tüzelése, nem hiba. A mai leképezés NEM visszaemlékezés: GENERÁTORBÓL jön, ami a repóban áll — ez erősebb, mint
egy egyszeri ügynök-kimenet. De a **független kereszt-ellenőrzés nem futott le**, és ezt nem írom
elvégzettnek (KUKA-093: a hiányzó mérés nem zöld). Tanulság magamra: **ami csak a munkaterületen áll,
az nincs meg** — a köztes eredmény a repóba való.

**7. v3-progress/1 — A KÖRMÉRŐ VETÍTÉSE (nem párhuzamos mérő).** Az R18 utasítására a meglévő
körmérő két új feloldót kapott (`v3ProgressLimitations` · `toV3Progress`): a 13 metrikából HATOT +
az eltelt időt tud, a többi **null, nem nulla**; a fázis-bontás és az attribúció szerkezeti korlátként
MINDIG a borítékban áll. Gépi jel: **`vs_verify_round_cost` RCC27–RCC31 (31/31)**. **KOMPATIBILITÁSI
PRÓBA az Ő validátorukkal, verbatim** (PR #155 `4ae6a91f`, 171-es katalógus — a sajátommal azonos
halmaz és sorrend): **7/7**. Hely: a V2 kijelölt ága, commit `4677e54e`, **PR nélkül**; a V2
lint-őrök a friss klónon zöldek (`no-undef` 1155 fájl · `tdz` 1142 · `module-symbol-wiring` 9/9 ·
`kuka` 512/512).

**GÉPI VÉGEREDMÉNY.** `node v3ref/run.mjs` **54/54 PASS** · mutációs battéria **149 mutáció · 149
elkapva · 0 túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony**, legrosszabb egység **6588 ms**
(korlát 15 000) · norma-lánc **53/72 fedett**, hiányzó 0 · idegen 0 · `verify:kuka` **271/271** ·
`verify:sweep-verdict` **ZÖLD** · a V2 körmérő pinjei **31/31**.

---

## D-VS-3033 — F16-01 (A SORREND VOLT A SZIVÁRGÁS) ÉS OB-10 LEZÁRVA

> **Hatály:** V2+V3 — az F16-01 és a normaregiszter a V3 magja; a söprés VERDIKT-SZERZŐDÉSE viszont
> KÖZÖS szerszám-kérdés (a V2 söprése ugyanazt az osztályozót viseli), ezért a V2 fejlesztőnek is
> tudnia kell róla. **V2-módosítás NEM történt, és nincs rá engedély.**

**Dátum:** 2026-09-16 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R17 (az ő R16-jukra)

**1. REPRODUKCIÓ ELŐSZÖR.** Az `r16_challenge.mjs` programjukat a VÁLTOZATLAN kódon futtattam:
**6/7**, egyedül az `unauthorized-object-neutral` bukott — karakterre az, amit írtak.

**1/b. ÉS BE IS KÖTÖTTEM — mert a „lefuttattam" nem ugyanaz, mint a „be van kötve" (KUKA-132).** Az
R88 §7-ben pont ezt a hibát találták meg nálam. A programjuk ezért nem maradt a repó gyökerén:
`v3ref/external-checks/r16_chatgpt-v3.core.mjs` (az ő szövegük, KARAKTERRE változatlanul, md5
`22ef819859a563fbba3b7e6f306da4e2` — tesztadaptáció NEM történt) + burkoló + `case-manifest.mjs`
`r16core` bejegyzés a HÉT eset nevével, a forrás-szövegükből olvasva (nem egy lefutásból — KUKA-054).
A futtató mindkét irányban mér: hiányzó · ismeretlen · duplikált · rossz alakú eset. **Melyik kapu
bukna el, ha a fájl holnap eltűnne? `npm run verify:external-checks`.** KIMONDOTT KORLÁT: ez a
KÖTÉST méri, nem azt, hogy egy jövőbeli programot eszembe jut-e bekötni — a programregiszter LISTA,
nem szabály (KUKA-051), és a V3 láncban a darabszámra ma nincs padló.

**2. F16-01 — A SORREND VOLT A SZIVÁRGÁS.** A `submitStockReceipt` a CIKKET a jogosultsági döntés
ELŐTT oldotta fel. A kapu MEGVOLT (a parancs-úton), csak a bevét-út soha nem jutott el odáig. Két
csatorna: a HIBAKÓD különbsége (`unknown_item` ⊥ `item_belongs_to_another_book`) ÉS a RÉSZLET
tartalma (a másik könyv neve + a cikk azonosítója). **A részlet törlése ezért nem lett volna
javítás.**

**A javítás — AUT-01 (`v3ref/accessGate.mjs`):** `authorizeBookAction` a lánc ELSŐ lépése, a
bemeneti séma ELŐTT is (különben a válasz FAJTÁJA is csatorna volna) · `ACCESS_REFUSED` EGY
fagyasztott, egyforma válasz, amit MOSTANTÓL a parancs-út is ad (KUKA-039) · a valódi ok BEFELÉ, az
új `access_refusal` táblába, a tranzakción KÍVÜL (KUKA-026 · KUKA-058), olvasóval együtt
(`recentRefusals` — az írás-csak mező dísz volna, KUKA-069/126). **Ez NEM helyettesíti a tranzakción
belüli újra-kérdezést:** az másik időpontra szól (KUKA-124/1).

**MÉRVE:** négy hívó (tagság nélküli · másik könyv tagja · visszavont jogú · jogos) × három
objektum-osztály (hiányzó · idegen könyvbeli · saját könyvbeli). A kilenc tiltott hívás válasza
**BÁJTRA azonos**, mellékhatás **parancs=0 · nyugta=0 · mozgás=0**, a belső napló **9 sor**, és ott a
két ok MEG IS KÜLÖNBÖZTET. A jogos hívó részletes diagnosztikát kap (KUKA-092/122: a kapu nem fal).
Gépi jel: **`P-AUT-object-neutral`** + **M149–M152**, mind a négy elkapva. Az ő programjuk: **7/7**.

**A kapcsolódó belépési pontok MÉRVE:** 152 exportált függvényből 27 kér hitelesített hívót, és
azok többsége maga a jogosultsági gépezet. A `balanceAt` · `registerItem` · `itemById` · `itemBySku`
· `changeItemUnit` **egyáltalán nem vesz át hívót** — belső segédek, nem védett belépési pontok.
Ezt NEVESÍTETT feltételként mondom ki: amint bármelyikük a külső határon (OB-3) megjelenik, ugyanez
a kapu kell elé.

**3. OB-10 LEZÁRVA — SWV-01.** A söprés mostantól a gyermek GÉPI verdiktjéből dönt
(`tools/lib/vs_sweep_verdict.mjs`): négy állapot (`green` · `env_skipped` · `failed` · `unfinished`),
és a kihagyást a gyermeknek a kimenete UTOLSÓ, önálló sorában, gépi alakban DEKLARÁLNIA kell. Hiba és
kihagyás együtt nem lehet tiszta kihagyás; a hibás alakú deklaráció és az ellentmondás (`exit 0` +
kihagyás) KÜLÖN, nevezett válasz. Gépi jel: **`npm run verify:sweep-verdict`** — SWV01–SWV06, benne
a **VALÓDI ALFOLYAMAT-PRÓBA** négy szintetikus gyermek-ellenőrzővel, és a **POZITÍV ELLENPÁR** (a
szabályosan deklarált kihagyás kihagyás MARAD). A blokkoló nem tűnt el, hanem átköltözött a
`CLOSED_BLOCKERS` listába, és a futtató KIÍRJA (KUKA-012).

**A V2-KOMPATIBILITÁS MÉRVE, NEM MÓDOSÍTVA:** a V2 söprése ugyanezt a részszöveges osztályozót
viseli, és NÉGY V2-verifier (`challenge-inventory` · `doc-order` · `mcp-bridge` · `repo-root`) ma
PRÓZÁBAN mondja ki a kihagyását. A szerződés átvitele ott CSAK akkor szabályos, ha az a négy előbb
megkapja a gépi deklaráció-sort. **V2-t nem módosítottam, üzenetet nem küldtem.**

**4. AMI EBBŐL KÖVETKEZIK, ÉS KIMONDOM: A SÖPRÉS MOSTANTÓL PIROS.** MÉRVE a lezárt állapoton:
**10 verifier, 619 s: 9 zöld · 0 env-kihagyás · 1 PIROS** (`verify:external-checks`), a söprés
**1-es kilépési kóddal** zárt. A régi osztályozó ugyanezt a gyermeket KIHAGYÁSNAK mondta volna, mert
a kimenetében ott áll az „ENV-KIHAGYÁS" szó (az `r57`/`r59` szabályos kihagyása miatt) — pontosan ezt
zárja ki az SWV-01.

**5. ÚJ LELET A KÖR VÉGÉN: A LÁNC VERDIKTJE GÉPTERHELÉSTŐL FÜGG (KUKA-175).** A láncot kétszer
futtattam: üresjáratban **14/19 · 3 eltérés** (`r77` · `r79core` · `r81core`), a söprés gyermekeként
**13/19 · 4 eltérés** (+`r83core`). MÉRVE az ok: az `r83core` burkolója a battériát NÉGYES bontásban
futtatja 15 000 ms-os korláttal, és terhelés alatt az 1/4 + 4/4 egység nem nullával zárt
(`genuine_units.problems`), ezért a négy várt `merge/*` eset helyére két `merge/KORNYEZET-*` sor
került. **Nem a kedvezőbb számot választottam**; a helyes válasz „három tartós + egy terhelésfüggő".
Ezzel a §7/b darabolási javaslat nem szépészeti kérdés: amíg a darabolás nem közös deklarációból megy,
a lánc ezen a két programon nem tud regressziót őrizni.

**6. HELYESBÍTÉS A SAJÁT LAPOMBAN.** Az eltérések valódi eset-hibáit tételesen megmértem: **hét**
valódi eset-hiba, MIND az MNY-01-ből (a próbák `qty: 1`-et adnak JSON-számként, a mag kanonikus
decimális szöveget vár), három programban — nem „öt", ahogy a lapon először írtam. Mellettük **négy**
`merge/KORNYEZET-*` sor, két programban, a darabolásból.

**7. HÁROM ÚJ TANULSÁG.** **KUKA-173** (a sorrend volt a szivárgás — a meglévő kapu a lánc végén állt;
megtalálta a KÜLSŐ FÉL) · **KUKA-174** (az ellenpélda, ami üres halmazon állt: a „visszavont jogú"
ágat hatáskörhöz kötött hívással állítottam elő, a hívás némán nem hatott — megtalálta a SAJÁT
mérésem, a próba első futásán) · **KUKA-175** (a mérés verdiktje a gép TERHELÉSÉTŐL függött, és az
első, kedvezőbb futás önmagában hihetőnek látszott — megtalálta a SAJÁT második futtatásom).

**GÉPI VÉGEREDMÉNY.** `node v3ref/run.mjs` **54/54 PASS** · mutációs battéria **149 mutáció · 149
elkapva · 0 túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony**, legrosszabb egység
**9592 ms** · `verify:kuka` **269/269 PASS** · `verify:sweep-verdict` ZÖLD ·
`verify:unit-admission` ZÖLD · az ő challenge-ük **7/7**.

---

## D-VS-3032 — AZ R10 ÖT LELETE JAVÍTVA, ÉS NÉGY SAJÁT LELET A BEKÖTÉS KÖZBEN

> **Hatály:** V3 — a V3 magreferencia (`v3ref/`) és a V3 memória-őre; a V2 kódját nem érinti.

**Dátum:** 2026-09-15 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R13

Mind az öt lelet REPRODUKÁLVA a VÁLTOZATLAN kódon, utána javítva és falszifikálva.

**1. R10-F01 — nem volt közös, egyszeri és atomikus bevét.** A régi `receiveStock` SAJÁT tranzakciót
nyitott, és egy MÁR véglegesített parancsot kért. Mérve: ugyanaz a hatásazonosító kétszer könyvelt ·
az összeg-elutasítás után a parancs `finalized` maradt a nyugtájával · MÁSIK művelet azonosítójával
is lehetett készletet írni. **Javítás:** `submitStockReceipt` az EGYETLEN belépési pont, a mozgás a
parancs tranzakciójában születik (`submitCommandWithEffect`), a nyers író **nincs exportálva**. A
sorrend a tranzakción belül: parancs-sor → nyugta → hatás; nem a hívási sorrend jó szándéka tartja,
hanem a TÁROLÓ (lásd 6. pont).

**2. R10-F02 — idegen könyv cikke elfogadható volt.** EGY feloldó (`itemForKey`), NEVEZETT válasz
(`item_belongs_to_another_book`), az ÍRÓ és az OLVASÓ oldalán is (KUKA-039).

**3. R10-F03 — az idő és a két plafon.** Új modul: **`instant.mjs`** (IDO-01) — valódi naptár
visszaírásos összehasonlítással (a `2026-02-30` NEM csúszik át némán), KANONIKUS UTC alak, és a két
idő-tengely EGY helyen deklarálva. Az „A" nézet TENGELY-PÁR (rögzítés ÉS hatály). A mennyiség-profil
KÉT plafont visel (`maxPerMovement` ≠ `maxTotal`), és az összeg-kapu a visszadátumozás által érintett
**KÉSŐBBI** állapotot is méri.

**4. R10-F04 — a memória-őr ígérete nem teljesült.** A KUK04 PADLÓKKAL mérte a „nem csonkolt"
állítást; a külső fél megmérte: az ELSŐ sort 238 → 120 karakterre vágva a battéria **244/244 PASS**
maradt. **Javítás:** verziózott, SORONKÉNTI lenyomat-alapvonal
(`contracts/kukaArchiveBaseline.json` + `tools/vs_kuka_baseline.mjs`). A kulcs a sor ELSŐ
CELLÁJÁBÓL jön, nem a szövegből: 157 sorból **128** hivatkozik MÁSIK KUKA-azonosítóra (KUKA-134).
Falszifikálva HÁROM alakon — csonkolás · AZONOS HOSSZÚ töltelék · sor-törlés —, mindhárom nevezetten
piros, az ellenpár zöld. **Kimondott korlát:** ez nem megváltoztathatatlanság, hanem LÁTHATÓSÁG.

**5. R10-F05 — a négy eredmény-adatkör állítás ROSSZ klauzulán ült.** Az R8-ban REV-N5b → ORG-N1b
átkötést csináltam; a külső fél szerint ez nem érdemi megfelelés. **Igaza van, és mérve is:** az
ORG-N1b a FELHATALMAZÁS korlátjáról szól, ezek az állítások a KIADOTT EREDMÉNY besorolásáról — közös
szó, két külön tárgy. A mai regiszter ÖT K05-öt fedő klauzulája közül EGYIK SEM mondja ki a kiadási
osztályozó tényét. **A kötés VISSZAVONVA**; az állítások MODUL-SZERZŐDÉSKÉNT (DSC-01) állnak tovább,
a hiány NEVEZETT: **OB-8**. Klauzulát ide kitalálni nem szabad — a normaregiszter tárgyalt, közös
alap. Mellé **OB-9** (K10: típus · normalizálás · profil). A KUKA-166 ezzel SZŰKÍTVE.
**KIMONDVA:** a lánc-sorok száma **76 → 72**-re csökkent (a négy visszavont kötés miatt), a FEDETT
sorok száma **változatlan (53)** — tehát ez hamis állítás visszavonása, nem fedettség-vesztés.

**6–9. NÉGY SAJÁT LELET, mind a bekötés közben** (KUKA-167…170). (6) A kiadási osztályozó a
mennyiséget `number` levélként deklarálta, az MNY-01 viszont tiltja a JSON-számot — két saját
szerződés mondott ellent, és a söprés zöld volt, mert egyik sem HÍVTA a másikat. (7) A bemeneti séma
az ALAPÉRTELMEZETT profillal kanonizált, holott a profil a CIKKÉ: a darabos cikk `"1000"` értékéből
`"1000.000"` lett, és a főkönyv `precision`-re futott — a mennyiség innentől KÉT SZAKASZ. (8) A séma
kötelezőként kérte a tulajdonost és a raktárat, amit a rendszer NÉMÁN eldobott (a hatókör a
kontextusé) — a mezők kikerültek, a FELOLDOTT hatókör viszont bekerült a parancs AZONOSSÁGÁBA.
(9) A `stock_movement` fejléce ŐRNEK mondta magát, miközben az őr a JS-íróban ült — és a nyers író
kivezetésével eltűnt volna: **négy tárolói őr** lépett a helyére.

**Ráadás, mérve:** megszületett a MÁSODIK mennyiség-profil (`qty-2`, darabos, 0 tizedes) — enélkül a
„profil" fogalma fogalmilag mérhetetlen volt (KUKA-051: az egyelemű lista nem méri a szabályt).

**10. A KÜLSŐ-ELLENŐRZŐ LÁNC PIROS — ÉS EZT NEM TAKAROM EL.** A söprés a `verify:external-checks`-et
env-kihagyásnak jelölte; ezt NEM fogadtam el következtetésként, hanem MEGMÉRTEM (KUKA-089): a lánc
LEFUT. Lefuttatva **öt program mutat eltérést**, KÉT független okból.
**„A" ok — az ÉN szerződés-változtatásom (öt eset):** `r77/F02-…` · `r79core/P01-flat-quantity` ·
`r79core/P07-command-before` · `r81core/core/P01-pure-lines` · `r81core/core/F04-release-time-*`.
Mind ugyanaz: a programjaik a mennyiséget JSON-SZÁMKÉNT adják át, az MNY-01 óta viszont KANONIKUS
DECIMÁLIS SZÖVEG kell. **A programjaikat NEM adaptáltam** (a „tesztadaptáció nem történt" a lánc
egyetlen értelme — KUKA-054), és **nem is verzióztam ki a szerződést**: az MNY-01 indoka a régi
verzióra ugyanúgy igaz, tehát a megengedő verzió egy ISMERTEN HIBÁS viselkedést konzerválna egy
teszt kedvéért. **A döntés ezért a TÁRGYALÁSÉ**, két úttal: az MNY-01 áll és a fixtúráik új verziót
kapnak, VAGY az MNY-01 szűkül és kimondjuk, mely mezőkre nem vonatkozik.
**„B" ok — a mérő időkorlátja, NEM az enyém.** A 4-egységes bontás a külső 15 000 ms fölött fut;
MÉRVE a MAI forráson (145 mutáció: 19 005 · 19 180 · 20 126 · 19 044 ms) **és az R9 ELŐTTIN is**
(134 mutáció: 19 677 · 19 393 ms) — tehát ez a „battéria kinőtte a darabolást" állapot, nem
regresszió. A 7-egységes bontás mindkét forráson befér.

**GÉPI VÉGEREDMÉNY.** `node v3ref/run.mjs` **53 PASS / 0 FAIL**, exit 0 · `verify:kuka`
**262/262 PASS** (a csonkolt archívumon 249/250, NEVEZETT hibával) · mutációs battéria 7 egységben:
**145 mutáció · 145 elkapva · 0 túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony**,
legrosszabb egység **8260 ms** (külső korlát 15 000 ms). Új mutációk: **M138–M148**; az **M37**
újrahorgonyozva, az **M90** lefedettsége visszaállítva a szám-levélre (mérve: e nélkül TÚLÉLT).

**11. HELYESBÍTÉS — a kör jelentése „0 pirosat" mondott egy PIROS söprésre.** A kör riportja
`8 zöld · 1 env-kihagyás · 0 piros` söprést jelentett. A LEZÁRT állapoton újrafuttatva **ez nem
igaz**, két külön okból, és mindkettőt kiírom:

*(a) A „env-kihagyás" TÉVES MINŐSÍTÉS, nem gyengébb állítás.* A fenti 10. pont azt rögzítette, hogy a
söprés kihagyásnak jelölte a külső láncot, „amit én megmértem". Az viszont elmaradt, hogy a kihagyás
MAGA is hibás: a bizonyíték-fájlok időbélyege megmutatta, hogy a `verify:external-checks`
**a söprésen BELÜL LEFUTOTT** — mind a 18 program eredmény-fájlját kiírta, és az összesítőbe
`ok:false` verdiktet rögzített (12 zöld a 18-ból). A söprés osztályozása
(`tools/vs_verify_sweep.mjs`) minden bukott ellenőrzőt kihagyásnak minősít, amelynek KIMENETÉBEN
BÁRHOL szerepel az „ENV-KIHAGYÁS" szó — a lánc SAJÁT, szabályos jelentése pedig jogosan tartalmazza
ezt (két programot ő maga hagy ki). **A verifier saját jelentése nyelte el a saját piros
verdiktjét** (KUKA-009 a söprésen: a jel a SZÖVEGET olvassa, nem a VISELKEDÉST méri). Nevesített
blokkoló: **OB-10**. **NEM javítottam**, mert a szigorításhoz ELLENPÁR kell (egy valóban
környezet-hiányos verifier, ami a szigorítás után is kihagyás marad); ilyen ebben a repóban ma nincs,
a szabály pedig a V2 söprésével KÖZÖS (KUKA-049).

*(b) A söprés PIROSAT is adott, és azt a kör riportja nem tartalmazta.* A `verify:v3ref` a mutációs
battériát még **4 részben** futtatta, és a 2/4 szelet **12 071 ms** lett a saját **12 000 ms**-os
költségvetésével szemben — ugyanaz az állapot, amit a 10/„B" pont a KÜLSŐ korlátra mér, csak a
futásonkénti zajon billegve (az előző söprés ugyanezzel a bontással még zöld volt, ezért mondott a
riport 0 pirosat). **Javítva a szerszám saját előírása szerint:** a bontás **7 részre**
(`package.json` → `v3ref:mutate:units`). Mérve utána: legrosszabb szelet **7569 ms** (a költségvetés
50%-a), `145/145 elkapva`, `RESULT: TELJES ÉS TISZTA`, exit 0. A költségvetést NEM nyújtottam meg.

**A lezárt állapot söprése tehát: 7 zöld · 1 TÉVES „env-kihagyás" (valójában piros lánc) · 1 piros,
amit ez a pont javít.** A boardra NOTE megy, ami az eredeti „0 piros" mondatot visszavonja.

**12. A NEGYEDIK PIROS PROGRAM A LÁNCBAN A MIÉNK VOLT — és a 10. pont nem nevezte meg.** A 10. pont
„öt eset, két okból" eltérést mondott. A lezárt állapoton az összesítő SAJÁT verdikt-listáját
TÉTELESEN felolvasva: **12 zöld · 2 nevezett env-kihagyás (`r57` · `r59`, mindkettőnek ZÖLD és MÁS
ALAKÚ helyettese van) · NÉGY PIROS** — `r77` · `r79core` · `r81core` (ezek a 10/„A" ok, a
mennyiség-szerződés) **és `r79`**, ami a mi SAJÁT önvizsgálati programunk
(`r79_run_contract_restated.mjs`). Ezt a negyediket a 10. pont nem nevezte meg.

*Mi a hiba.* A program U04-es esete a POZITÍV ELLENPÁR („az érintetlen darabolt futás ELFOGADOTT"),
és `--unit=k/4` alakban BEÉGETETT darabolással dolgozott. A battéria 134 → 145 mutációra nőtt, a
négyes bontás egységei átlépték a `mutate.mjs` saját 12 000 ms-os költségvetését — tehát a mi
pozitív ellenpárunk pirosra ment egy ép rendszeren. **Mérve a git-történetből:** a változásom ELŐTTI
commiton `U04.pass: true` (egységek 11 304–11 767 ms), az R13-as commiton `false` (11 807–12 261 ms),
ma `false` (12 058–12 527 ms). **Tehát ez az én munkám következménye, nem örökölt állapot.**

*A javítás.* A darabszámnak EGY deklarált otthona lett (**`v3ref/batteryUnits.mjs`**), a program
onnan veszi (`unitArgs`), és a `package.json` parancs-sorát a GÉP veti össze vele
(`verify:unit-admission` **UAD08**) — enélkül az „egy otthon" csak dísz volna. A SZABÁLY nem az,
hogy „N = 7": a szabály az, hogy minden egység beleférjen a költségvetésébe, és ezt a `mutate.mjs`
nem-nulla kilépése őrzi, nem egy előre beírt szám. **Kimondott határ:** az adaptált külső programok
saját alapértéke (6) marad — az egyenlőség nem követelmény, a BELEFÉRÉS az, és mindkettő mérve zöld.

*Az UAD08 első két alakja is hibás volt, és ezt MÉRVE derítettem ki:* beégetett NEVEZŐ-mintákat
kerestem, és a valódi régi alak (`` `--unit=${k}/4` ``), majd az összefűzött alak
(`"--unit=" + k + "/4"`) is ÁTCSÚSZOTT rajta. A mai alak MEGENGEDŐ szabály: az egység-argumentumnak
EGYETLEN forrása van, ezért a program kódjában a `--unit` szó nem állhat. **Falszifikálva öt
visszacsúszáson, mind piros** (package.json elcsúsztatva · az import kivéve · beégetett darabolás
sablon-alakban · összefűzéssel · beégetett egység-fájlnév); a kontroll zöld.

*És a javításom ELSŐ alakja is hibás volt — az ÉLŐ lánc buktatta ki.* A közös modult a
`v3ref/batteryUnits.mjs` útra tettem, és a program `../batteryUnits.mjs` alakban húzta be. A
külső-ellenőrző futtató viszont a programot EGY IDEIGLENES MAPPÁBA másolja, és csak a `file` +
`companions` fájlokat viszi magával — a fölé nyúló behúzás ott nem oldódik fel. MÉRVE: a program a
MÉRÉS ELŐTT halt meg (`ERR_MODULE_NOT_FOUND`, 57 ms), miközben a `verify:unit-admission` zölden állt
(KUKA-038: a létezés nem bizonyíték arra, hogy FUT; KUKA-130: a közös lakó helyét a LEGSZŰKEBB
másolt fa dönti el). A modul ezért a program MELLÉ került
(`v3ref/external-checks/batteryUnits.mjs`), a `case-manifest.mjs` KÍSÉRŐKÉNT deklarálja, és az
UAD08 ezt a deklarációt is méri. **Élő próba:** `node v3ref/external-checks/run-all.mjs --only r79`
→ **4/4 eset zöld**, kilépés 0.

**Két új tanulság:** **KUKA-171** (a söprés a szöveget olvasta, nem a verdiktet) · **KUKA-172** (a
darabszám három otthonban, és a saját piros programom névtelen maradt — mert az összesítő
verdikt-listáját nem tételesen olvastam; benne a KUKA-130 alakja is). Mellé egy apró, MÉRT javítás a
saját őrömön: a `verify:kuka` KUK03 hibaüzenete minden pozitív jelnél „(undefined)" indokot írt (a
regiszter `why` mezőjét `reason` néven olvasta) — most a valódi indokot írja ki.

---

## D-VS-3031 — A BIZONYÍTÉK A HELYES KLAUZULÁN (R8-F01), ÉS AZ ADAPTÁLT PROGRAM AZONOSSÁGA (R8 §3)

**Dátum:** 2026-09-15 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R8

**1. R8-F01 — NÉGY ÁLLÍTÁS ÁTKÖTVE.** A külső fél leletje megáll: a NEZ-01/T4/OB-4 eredmény-ADATKÖR
követelményéhez tartozó négy állítást a **REV-N5b** klauzulára kötöttem, de annak a szövege a TILTÁS
HATÓKÖRÉRŐL szól (`covers: K09 · K15`). Az eredmény-mezők osztályozása a **K05** alá tartozik, amit a
REV/ORG rész-indexben az **ORG-N1b** fed (`covers: K04 · K05`). Átkötve `A-ORG-N1b-*` névre a
`manifest.mjs`-ben (két próba: `P-REV-result-scope` · `P-REV-result-shape`) és a `run.mjs`-ben; a
REV-N5b **nem veszít állítást** (marad 7, mind a tiltás hatóköréről). Mérve: `node v3ref/run.mjs`
**50/50 PASS**, 76 klauzula-sor változatlan. KUKA-166.

**2. HÁROM KIMONDOTT SZŰKÍTÉS, az ő §1-ük szerint.** (a) A **REV-N5a** nem általános bemeneti
séma-ellenőrzés, hanem minden alkalmazható ENGEDŐ útra kiterjedő célzott tiltás — a BEM-01 önmagában
nem bizonyítja. (b) A **9/11-es bontás** az OB-7-nél a **REV/ORG rész-index** hatóköre, NEM a teljes
első folyamat lefedettségének állítása: a `normContract` külön **K01–K16** szerződést azonosít.
(c) **A K10 („Típus, normalizálás és számítási profil") szabályt a rész-index EGYETLEN klauzulája
sem fedi** — ez NEVEZETT hiány, nem hallgatás; az MCS-2 mennyiség-szerződésével születik meg.
**Amit NEM rögzítek:** a kilenc klauzula tartalmi jóváhagyását az ő nevükben — kimondottan
visszatartották.

**3. R8 §3 — A DARABSZÁM KONFIGURÁLHATÓ FUTTATÁSI PARAMÉTER.** Az ő hozzájárulásukkal a két adaptált
külső program battéria-hívása `VS_BATTERY_UNITS` (alapérték **6**) szerint darabol; **egyetlen eset,
mutáció, elvárás, forráskötés és időkeret-érvényesítés sem változik**. Az eredeti `r57`/`r59` a
repóban marad. A manifeszt `origin` szövege javítva: az „egyetlen karaktert sem írtunk át benne"
mondat innentől **nem állítható** — helyette nevezett `adapted` blokk (mi változott · mi nem · ki
adaptálta).

**4. AZ AZONOSSÁG MÉRT, NEM DEKLARÁLT (EXT-03).** Új feloldó: `programIdentity` — a lenyomat a
TÉNYLEGES fájlból jön (sha256), a manifeszt csak a KAPCSOLATOT deklarálja. Kézzel beírt sha256 az
első szerkesztéskor elavulna és zölden hazudna (KUKA-045 · KUKA-121). A gépi kimenet és a képernyő is
viszi: `program_digest` · `adapted` · `adapted_from` (a hiány `null`, külön válasz — KUKA-124/2).

**5. A SAJÁT ELSŐ ALAKOM HIBÁS VOLT — a kapu rossz helyen állt.** A bájtazonosság-ellenőrzést az
általános `ok`-ba tettem, és a külső fél **R83-as futtató-próbája azonnal kibuktatta**: az a program
MINDEN fájlt ugyanarra a csonkra cserél, tehát ott a bájtazonosság a PRÓBA műterméke — egy hibátlan
`all-green` kontroll állt meg (**16/18**, exit 1). Ez a KUKA-049 (az őr a kért eredményt jelentette
kudarcnak) és a KUKA-124/1 (a tényt ott kell mérni, ahol eldől). A kapu ezért az
`environmentalObstacle` **ötödik feltétele** lett: a felmentés azon áll, hogy a helyettes MÁS ALAKBAN
futtatja ugyanazokat az eseteket — ha a helyettes az eredeti másolata, a zöldje önmagát igazolja
vissza (KUKA-054). **A mérés HIÁNYA sem felmentés**, hanem nevezett elutasítás. Ez a javítás
**erősebb** a réginél: eddig a felmentés semmit nem mondott a helyettes MÁSSÁGÁRÓL.

> **Hatály:** V3 — a V3 magreferencia norma-lánca és a külső-ellenőrző program-regisztere; a V2
> kódját és termékét nem érinti.

---

## D-VS-3030 — RENDSZERKÉP: A MINDIG BETÖLTÖTT LAP, ÉS A MÉRT ÍRÓ-HALMAZ (MCS-1)

**Dátum:** 2026-09-15 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R5

**1. ÚJ LAP: `docs/RENDSZERKEP.md` (5 844 bájt).** Ez az EGYETLEN kötelező olvasmány egy V3-feladat
előtt: mi ez a rendszer · a modulok és mit döntenek el · a három mérő-parancs · a feladathoz kötött
**elővétel-tábla** · a **tíz kritikus szabály** · és hogy hol él a többi tudás (nem olvasmány).
Ha nő, valamit rossz helyre tettünk.

**2. AZ MK-2 KORÁBBI ALAKJÁT VISSZAVONOM.** A „a tanulság-táblát az ügynök nem olvassa; a gép
futtatja" alak azt sugallta, hogy a gépi őr megőrzi a szabály JELENTÉSÉT — magam mondtam ki korábban,
hogy nem így van (a külső fél R4 §4 helyesen kifogásolta). Helyette négy tétel: **MK-2a** rövid,
mindig betöltött kritikus szabályok · **MK-2b** feladathoz kötött KÖTELEZŐ részletes elővétel ·
**MK-2c** a döntési napló és az archívum MEGMARAD (méretcél miatt nem törölhető) · **MK-2d** gépi őr
CSAK a géppel ellenőrizhető tulajdonságokra. **MK-4 bővítve:** a térkép megnevezi a módosítás által
érintett FOGYASZTÓKAT és a KÖZÖS ALAPOKAT is.

**3. MÉRT LELET — a BEM-01 nem akaszkodhat a regiszterre.** Az `entryPoints.mjs`
`WRITER_ENTRY_POINTS` regisztere **5** írót nevez meg (`ENT_FLOOR = 5`), a magban viszont
**19 exportált író függvény** van, ebből **18 termék-író** (a 19. mérési segéd). Ha a bemeneti
séma-ellenőrzés a REGISZTERRE épül, **13 író némán megkerüli**. Ezért a BEM-01 oda kerül, ahol az
írás SZÜLETIK, és a regiszter **mért szabállyá** válik: a söprés hasonlítja a regisztert a forrásban
ténylegesen író exportok halmazához, MINDKÉT irányban (KUKA-051). **A mérés ma egyszeri**
(zárójel-mélységgel hatókört követő pásztázás), söprésbe kötése az MCS-2 része — ezt kimondom.

**4. A KIPRÓBÁLT BETÖLTÉSI CSOMAG (BETOLTES-01) — mérve.** Mintafeladat: *„hol kell a BEM-01-nek
állnia, hogy egyik írás se kerülhesse meg?"*. A csomag: `docs/RENDSZERKEP.md` + amit az elővétel
megnevez (`v3ref/entryPoints.mjs`) = **23 579 bájt**, a teljes háttér-állomány (`CLAUDE.md` 208 342 +
`DECISION_LOG.md` 159 566 + tanulság-regiszter 610 760 + `docs/70_PLANNING/` 81 507 = 1 060 175)
**2,2%-a**. A lap 3. kritikus szabálya („a mérés hatóköre SZABÁLY, nem lista") kényszerítette ki a
§3 mérését — **a csomag nemcsak elég volt, ez találta meg a hiányt.** **Kimondott korlát:** a próbát
ugyanaz az ügynök futtatta, aki a csomagot írta, tehát ELÉGSÉGESSÉGI próba, nem függetlenségi
bizonyíték (KUKA-054).

**5. A TELJES CSOMAG:** `docs/70_PLANNING/V3_MCS1_SZERZODESCSOMAG.md` a V2 repóban (ott él a board- és
dokumentum-lánc). A V2-oldali szám: **D-VS-720**.

---

## D-VS-3029 — A MŰVELET AZONOSSÁGA A BELÉPÉSI PONTÉ (MOP-01) — R92-F01 · F02 + a véges zárólista

**Dátum:** 2026-09-15 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R1 · **KUKA-164 · 165**

**1. A REPRODUKCIÓ ELŐSZÖR.** A külső fél (chatgpt-v3) R92-es programját VÁLTOZATLANUL lefuttattam a
VÁLTOZATLAN forráson: **F01 és F02 egyaránt `ok:true` + `outcome:'granted'` + `role:'user'`** — a két
bejelentett megkerülés pontosan úgy áll, ahogy leírták, és **mindkettő TAGSÁGOT szült**. A javított
forráson **2/2 elakad, tagság nem keletkezik**.

**2. R92-F01 — a hívó átnevezhette az ellenőrzött műveletet.** Az `issueInviteUnderBasis` a hívótól
kapott `operation` értéket mérte, a végrehajtott hatás viszont meghívókiadás maradt; a beváltás
UGYANAZT a hamis nevet olvasta vissza a pecsétből, tehát a közös feloldó két helyen hívása sem zárta
a rést. **MOP-01:** a művelet azonosságát a BELÉPÉSI PONT adja. Eltérő deklarált művelet →
`operation_not_overridable`; a pecsét mindig `invite_issue`; a `redemptionLimitGate` a pecsét
műveletét nem hiszi el → `sealed_operation_mismatch`.

**3. R92-F02 — az adatkör elhagyása kikapcsolta a tengelyt.** A `scope` alapértéke `null` volt, és a
`withinBasis` a null/undefined tengelyt átugrotta: `allowedScopes: []` mellett is átment a kiadás.
Helyette **műveletenkénti, kimondott szerződés** (`OPERATION_LIMIT_CONTRACT` + `requiredAxesFor`): a
kötelező tengely hiányzó értéke `axis_value_required_<tengely>`, az ISMERETLEN művelet fail-closed
(`operation_has_no_limit_contract`). A jogos ellenpárok megmaradtak: alapon belüli kiadás és beváltás
változatlan.

**4. A SAJÁT FALSZIFIKÁCIÓ.** A `P-ORG-basis-limit` próba **hét** állításra bővült — az új kettő az
`…-operation-identity-is-the-entry-point-not-the-caller` és az `…-omitting-an-axis-does-not-disable-it`.
Négy új mutáció (**M134–M137**): a művelet-felülírás visszaengedése · a pecsét műveletének
visszaolvasása · a kötelező tengely átugrása · az ismeretlen művelet fail-open. Mérve:
**50 próba PASS · 134 mutáció · 134 elkapva · 0 túlélte · 0 elavult horgony · norma-lánc 57/76**.

**5. A SAJÁT LELETEM — a burkoló a söprésben halott volt (KUKA-165).** A külső fél programjához írt
burkolóm a repó gyökerét TIPPELTE (`resolve(HERE,'..','..')`), a futtató viszont ideiglenes
homokozóba másol: `ERR_MODULE_NOT_FOUND`, **0/2 eset, 1-es kilépés** — miközben önmagában futtatva
2/2 zöld volt, és a részletes eredményből a `source_commit` futás-kötés is hiányzott. Javítva:
nevezett gyökér-feloldó (`coreRootFor` — a BIZONYÍTÉKOT keresi, nem a layoutot tippeli; ha egyik
jelölt sem áll, NEVEZETT hibával áll meg) + `sourcePinFor`, ami a kötés EREJÉT is kiírja
(`staged_manifest` vagy `git_worktree`). **Megtalálta: a saját söprésem, a kiadás előtt.**

**6. A VÉGES CORE-ZÁRÓLISTA — a hét blokkolóból HÁROM kell az első folyamat előtt.** Kell: **OB-3**
(bemeneti séma-regiszter — a magban ma a KIMENET alakja deklarált, a BEMENETÉ nem), **OB-4** (a
kiadási osztályozó nem üres korpuszon — és az első folyamat MAGA a korpusz), **OB-7** (a tartalmi
norma-megfelelés, de **hatókör-szűkítve** az érintett klauzula-sorokra, és a jóváhagyó a külső fél,
nem az operátor). Nem kell — megnevezett későbbi funkcióhoz tartozik: **OB-1** (több-írós
véglegesítési határ → az első VALÓDI adat előtt), **OB-5** (megvonás visszamenőleges hatálya → több
felhasználó + jogmegvonás; a 16 nyitott klauzula-sorból mind a 16 ide esik), **OB-6** (önálló
szervezeti alap → meghívás/jogadás), **OB-2** (eljárási adósság, nem termék-blokkoló). **Új blokkolót
nem vettem fel.**

**7. A „CORE KÉSZ" ÁLLÍTÁS HATÓKÖRE, KIMONDVA.** Csak a mérésbe bekötött belépési pontokra · **egyetlen**
tároló-adapterre (`node:sqlite`, ideiglenes állományon) · egyetlen író, szintetikus adat. **A később
épülő modulok (készlet · ár · irat) védelmét a referencia próbái NEM igazolják** — a `grant_basis` sor
létezése önmagában nem bizonyítja a későbbi hozzáférés korlátozását (a külső fél R92 §6, elfogadva).

**8. SZAKMAI JAVASLAT a deklarálás kötelezővé tételéről (R92 §6).** Nem hagyom „az operátor döntése"
jelöléssel: (a) védett céges jogot adó művelethez **kötelező** a deklarált, alkalmazható
felhatalmazási alap — a deklarálatlan alap ott **elutasítás**; (b) a régi, alap nélküli
referencia-fixtúrák kompatibilitása **nem termékengedély** (a mai `limit_enforced: false` a
REFERENCIA saját próbáira szól, és ezt a `basisState` ki is mondja); (c) az átmeneti kivétel
kifejezett, lejáratos, nevezett művelet-listás és auditálható; (d) a végfelhasználó SAJÁT
nyilvántartása nem esik ide — a kötelező alap a MÁS könyvére ható műveletekre szól. Ez javaslat a
következő tervezési munkához; termékdöntést az operátor nevében nem rögzítek.

**9. AZ ELSŐ LÁTHATÓ FOLYAMAT — mérve, mi hiányzik.** A magban **NINCS termék, NINCS készlet, NINCS
mennyiség, NINCS raktár, és NINCS képernyő**. A `stock.receipt/1` és `stock.issue/1` ma KIZÁRÓLAG
eredmény-alak deklaráció a `resultScope.mjs`-ben — mögötte sem törzs, sem főkönyv (KUKA-038: a név
kész funkciónak látszik). Négy mini modul kell (KAT-01 cikk-azonosság · KSZ-01 készlet-főkönyv ·
BEM-01 bemeneti séma · NEZ-01 készlet-nézet) plusz BEJ-01 HTTP belépési pont és EGY lap. **A
szerződésüket előbb megtárgyaljuk és challengeljük, kód csak utána.** Két nehezen visszafordítható
alapdöntés most dől el: a **mértékegység a mennyiség JELENTÉSE** (KUKA-021) és az **egyenleg
SZÁMÍTOTT, nem tárolt**.

**10. A SÖPRÉS ÁLLAPOTA — KIMONDVA.** A V3 söprés **PIROS**: `verify:external-checks` → 14/18
MEGFELEL, ELTÉRÉS `r57 · r57a · r59 · r59a`. Az **`r92authz` ELTÉRÉS-ből MEGFELEL lett** (ez a §5
javítása), a maradék négy pedig nem ebből a körből ered: HEAD-en is ott állt az `r59`, `r59a` és
`r57`. Ami elmozdult: az **`r57a`** (a `r57` nevezett HELYETTESE) E02 esete most `ETIMEDOUT`-tal
akadt el (HEAD-en 79 515 ms-nál zöld, most 74 850 ms-nál piros) — és mivel a helyettes is elbukott, a
futtató **jogosan nem adott környezeti kihagyást** (a külső fél R83-F03 szabálya). Ez az őr HELYES
működése; nem lazítjuk (KUKA-091). **Nevezett adósság:** az `r57a` belső 15 000 ms-os korlátjának
feloldása darabolással — nem ebbe a körbe tartozik (a levél kikötése: a futtató-munka ne lépjen a
termékmunka helyébe). A V2 söprés zöld: 291-ből 290, 1 env-kihagyás (`verify:schema`).

**11. A LAP.** A teljes csomag: `docs/70_PLANNING/V3_CORE_ZAROLISTA_ELSO_FOLYAMAT_ES_MUNKAREND.md`
(a V2 repóban, mert a board- és dokumentum-lánc ott él). A V2-oldali szám: **D-VS-719**.

---

## D-VS-3028 — ORG-N1b: A FELHATALMAZÁS NEM LEHET TÁGABB, MINT AZ ALAPJA (R90 §6)

> **Hatály:** V3 — a V3 magreferencia normaterve (req-5, 2. lépés). A V2 kódját nem érinti; a V2
> fejlesztőnek nincs vele dolga.

**Dátum:** 2026-09-15 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-001 R90 · **KUKA-163**

**1. MIÉRT ÉPP EZ.** A külső ellenőrző fél (chatgpt-v3) az R90 §6-ban kimondta: *„Folytasd a meglévő
normaterv következő kötelező core-bizonyítékát; a mérő javítása ne legyen a core teljes munkájának
előfeltétele."* A `REQUIRED_EVIDENCE` req-5 terve ELŐRE leírta, mi a következő lépés (ORG-N1a után a
KORLÁT), tehát a mérce nem a megépült dologhoz igazodott (KUKA-054).

**2. A HELYZET.** A határozat CSAK „user" szerepre és CSAK a készlet-adatkörre hatalmaz fel; a
meghívó kiadója „admin" szerepet és árlista-hozzáférést próbál adni. Eddig a korlát MEZŐI tárolva
voltak, az ítélet-feloldó (`withinBasis`) helyesen felelt — de EGYETLEN kiadó út sem hívta.

**3. A MEGOLDÁS (BLI-01, `v3ref/basisLimit.mjs`).** EGY otthon, amit MINDKÉT oldal hív (KUKA-129):
a KIADÁS (`issueInviteUnderBasis`) és a BEVÁLTÁS (`redemptionLimitGate`). A kiadott korlát a
`invite_basis` pecséten áll (immutábilis, mint a `invite_terms`), a beváltás a KIADÁSKORI alaphoz
mér, és a korlátot ÁTVISZI a tagságadó eseményre (`grant_basis`).

**4. MIÉRT KÜLÖN TÁBLA.** A meghívók egy része NYERS, POZICIONÁLIS `INSERT`-tel születik — a külső
fél MINDEN programjában. Egy új `invite`-oszlop az ő VÁLTOZATLANUL futtatandó ellenpéldáikat törte
volna el (KUKA-122: a kapu nem lehet fal).

**5. AMIT NEM ÁLLÍTOK — az ORG-N1b `partially_covered`, nem `covered`.** A korlát DEKLARÁLÁSÁNAK
kötelezővé tétele SZERVEZETI döntés (ki hatalmaz fel kit, és mi lesz a meglévő, alap nélküli
meghívókkal) — az operátoré, nem a kódé. A deklarálatlan meghívó ezért ma a régi szabály szerint
megy, és a válasz ezt KIMONDJA (`basis_declared: false`). A BÍRÁLATI hatáskör útján a korlát
továbbra is csak adat: a `basisState.limit_enforced` marad hamis, és a `limit_enforced_paths`
felsorolja, hol VAN ma kapu (KUKA-041 · KUKA-050).

**6. GÉPI JEL.** ÚJ próba: `P-ORG-basis-limit`, öt nevezett állítással (a korláton túli kiadás
nevezetten elakad ÉS nyom nélkül · az üres tengely fail-closed · a korláton belüli kiadás
változatlanul megy · a beváltás a korlátot is átviszi · a nyers meghívó sem bújhat ki, és a kiadott
korlát nem törölhető · a deklarálatlan meghívó NEVEZETT, nem néma). Hét új mutáció (**M127–M133**),
mindegyik egy-egy nevezett állítást buktat. Battéria: **130 mutáció · 130 elkapva · 0 túlélte ·
0 elavult horgony** — `TELJES ÉS TISZTA`. Norma-lánc: **57/74 fedett**, az öt ORG-N1b sor
`partially_covered`, mindegyik nevezett mutációval falszifikálva.

---

## D-VS-3027 — AZ ALAP AZONOSSÁGA ÉS A TAGSÁGADÁS ATOMI HATÁRA (R88/F01–F02)

**Dátum:** 2026-09-14 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-001 R88 · **KUKA-131 · 132**

**A reprodukció ELŐSZÖR, a VÁLTOZATLAN kódon.** A külső fél (chatgpt-v3) R88-as mag-programját
változatlanul lefuttattam: **exit 1 · 3 PASS / 2 FAIL** — pontosan a két bejelentett lelet. A
javított kódon **5/5 · exit 0**.

**1. R88/F01 — AZ ALAP AZONOSSÁGA A (basis_id, book_id) PÁR.** A `basisAsOf` CSAK az azonosítóra
keresett, a `grantAdjudicationAuthority` pedig csak az IDŐBELI hatályt mérte: egy „A" könyvre szóló
határozatra hivatkozva **„B" könyvben is ki lehetett adni** az `adjudicate` hatáskört. Ez a KUKA-027
alakja a bizonyíték-térben: egy azonosító csak a SAJÁT terében egyedi. A javítás három részből áll,
és mind a három KELL (KUKA-084: a lezárás nem HELY, hanem CSATORNA):

- a könyv KÖTELEZŐ bemenet, a hiánya SAJÁT, nevezett, fail-closed válasz (`book_id_required`) — nem
  „ha megadják, ellenőrizzük", mert az néma kiskaput hagyna (KUKA-041);
- az IDEGEN könyv KÜLÖN, nevezett válasz (`basis_belongs_to_other_book`), nem „nincs ilyen alap" —
  a befogadónak meg kell tudnia különböztetni a két esetet (KUKA-064 · KUKA-124/2);
- a VERZIÓ-ÁTUGRÁS zárva: ugyanaz az azonosító nem költözhet NÉMÁN másik könyvbe egy új verzióval
  (`basis_id_belongs_to_other_book`) — különben az azonosság a kiadás és az olvasás között csúszna el
  (KUKA-128).

A tiltott kérés **NYOM NÉLKÜL** akad el: se hatáskör-sor, se későbbi engedő válasz. Az ELLENPÁR
mérve: a SAJÁT könyvén minden változatlanul megy (KUKA-049).

**2. R88/F02 — A TAGSÁGADÁS EGY ÍRÁS.** A `grantMembership` előbb az ESEMÉNYT szúrta be, majd a
vetületet; egyediségi bukásnál az esemény BENT MARADT. Egy **sikertelen hívás átírta a történetet**:
a márciusi kérdésre előtte „nincs tagság", utána „van". A hiba a két írás VISZONYÁBAN élt (KUKA-024),
és a saját próbáim mind a SIKERES ágat mérték, ezért zölden álltak.

A javítás a TÁROLÓ közös atomi egysége (`store.atomic` → `atomically`): külső tranzakción kívül
`BEGIN`, azon belül **mentési pont** (SAVEPOINT). Ez azért így van, mert a meghívó-beváltás MÁR
tranzakcióból hív minket — egy külső `BEGIN` a JOGOS utat állította volna meg (**KUKA-122**: a kapu
csak akkor kapu, ha teljesíthető). Az előzetes duplikátum-vizsgálat NEM helyettesíti az atomicitást:
versenyhelyzetben ugyanoda jutnánk.

**3. SAJÁT CÁFOLAT — hat új mutáció, mind elkapva.** `M121` idegen könyv átmegy · `M122` a hiányzó
könyv nem kap saját választ · `M123` a verzió-átugrás kinyílik · `M124` a két írás szétesik ·
`M125` a beágyazott hívó elakad (a javítás a munkát zárná ki) · `M126` az esemény elmarad, csak a
vetület születik. **123 mutáció · 123 elkapva · 0 túlélte** — a lánc `TELJES ÉS TISZTA`, a norma-lánc
**56 → 57/70** fedett sor. A `P-ORG-grant-atomic` ÚJ próba, a `P-ORG-basis` új (e) állítással.

**4. A KÜLSŐ FÉL PROGRAMJAI TÉNYLEG BE VANNAK KÖTVE — helyesbítés (R88 §7/1).** Az R86 §10-ben azt
állítottam, hogy az R85-ös programjuk „be van kötve a külső-ellenőrző könyvtárba". **MÉRVE ez nem
volt igaz**: sem a fájl-fában, sem a program-regiszterben nem szerepelt. Megtalálta: a KÜLSŐ
TÁRGYALÓ FÉL. Most tényleg be van kötve — `r85core` és `r88core` a `case-manifest.mjs`-ben, saját
burkolóval és eset-listával; a `verify:external-checks` **15 → 17 programot** futtat, `RESULT: 15/17
MEGFELEL · 2 ENV-KIHAGYÁS (nevezett, zöld helyettessel)`, exit 0. A tanulság KUKA-132.

**Gépi jel:** `npm run verify:v3ref` (49 próba + 123 mutáció, `TELJES ÉS TISZTA`) ·
`npm run verify:external-checks` (17 program) · `npm run verify:sweep`.

---

## D-VS-3026 — A TAGSÁGADÁS IDEJE, A BIZONYÍTÉK OTTHONA ÉS A FELHATALMAZÁS ALAPJA (R85/F01–F02 + ORG-N1a)

**Dátum:** 2026-09-14 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-001 R86 · **KUKA-159 · 160 · (129 visszatért)**

**A reprodukció ELŐSZÖR, a VÁLTOZATLAN kódon.** A külső fél (chatgpt-v3) `challenge-core-r85.mjs`
programját bájtazonosan lefuttattam: **exit 1 · 2 PASS / 2 FAIL** — pontosan a két bejelentett lelet.
A javított kódon **4/4 · exit 0**.

**F01 — GRT-01: a tagságadás ESEMÉNY, saját két tengellyel.** A `membershipAsOf` a MEGVONÁSRA két
tengelyt alkalmazott (hatály · tudás), a GRANT-ra csak egyet, ezért egy ma rögzített,
visszamenőleges hatályú tagság a TEGNAPI tudás-képet is átírta. A `membership` tábla ALAKJA
változatlan (a külső fél fixtúrája pozicionális `INSERT`-tel ír rá — az első tervem ezt eltörte
volna, ezért elvetettem); mellé `membership_grant` esemény-napló került (`recorded_at` ·
`effective_at`), és a `grantAsOf` ugyanazt a két szűrőt futtatja, mint a megvonás. Esemény hiányában
a sor `granted_at`-je a TARTALÉK, `axis: 'projected_row'` jelöléssel — a gyengébb tanút megnevezzük
(KUKA-127). **Kimondottan NEM** tettünk általános `granted_at <= knownAt` szabályt, és NEM tiltottuk
meg a `validAt > knownAt` kérdéseket (KUKA-092: a tiltás nem megépítés).

**F02 — a bizonyíték az ESEMÉNY saját tartós adata.** Az `evidence_ref` a `review_circle`-ben élt, a
kör viszont CSAK visszamenőleges érvénytelenítésnél születik: a jogváltozások kétharmadán (azonnali
és jövőbeli hatályú megvonás) a kötelező bizonyíték NYOMTALANUL elveszett. Javítva: a
`membership_revocation` esemény kapott `actor_subject_id` + `evidence_ref` oszlopot, a `review_circle`
pedig `revocation_event_id NOT NULL` hivatkozással mutat rá (a saját `evidence_ref` oszlopa megszűnt).
Mindhárom ág UGYANAZT a megőrzési szerződést teljesíti; bizonyíték nélkül nincs jogváltozás.

**ORG-N1a — BAS-01: a felhatalmazás alapja, két idő-tengelyen.** Új `authority_basis` tábla
(`basis_id` + `version` kulccsal): hatály · rögzítési idő · lejárat · visszavonás · korlát-mezők ·
KÖTELEZŐ bizonyíték. Új verzió = új sor, a régit nem írjuk át (REV-N1b). A `basisAsOf` pontosan a
`membershipAsOf` szerkezete; a `grantAdjudicationAuthority` rögzíti, MELYIK verzió alapján adták.
A lejárt · ismeretlen · még nem hatályos alap HÁROM külön nevezett válasz, és a kiadás ZÁR.

**A KLAUZULA MÉGSEM ZÁRULT LE — és ezt a norma-mátrix MONDJA KI (R85 §5).** Az első alakban azt
írtam, hogy „a hiány megszűnt". Ez túlzás volt: a nyilvántartás megépült és EGY útra (hatáskör-adás)
be van kötve, de a MEGHÍVÓ-KIADÁS és a BEVÁLTÁS nem hordozza és nem méri az alapot. A regiszternek
eddig csak KÉT állapota volt (`no_evidence` · `covered`), és egyik sem igaz erre — ezért **harmadik,
nevezett állapotot** kapott: **`partially_covered`**, kötelezően megnevezett két féllel (mi épült meg ·
mi maradt, egyenként min. 40 karakter). **Ez nem kiskapu:** a `partially_covered` SEHOL nem egyenlő a
`covered`-del, tehát az ORG-N1a nem kerülhet a kötelező készletbe — a **req-4 marad**, a **req-5 nem
lép életbe**. Az ORG-N1b megtartja a teljes hiányát, és a `basisState.limit_enforced: false` a
rendszer válaszában is kimondja, hogy a korlát ma ADAT, nem védelem (KUKA-041).

**SAJÁT ELLENPÉLDÁK — és HÁROM saját állítás, ami nem tudott bukni.** 13 új mutáció (M108–M120). Az
M110 · M116 · M117 TÚLÉLTE a próbám első alakját, mert olyan eseteket használtam, amelyeket MINDKÉT
tengely-szűrő kizárt: az egyik szűrő kivétele mérhetetlen maradt. **KUKA-159:** egy állítás csak
akkor falszifikálható, ha PONTOSAN EGY tengely dönti el — két-tengelyes szabálynál a fixtúra vigye
MINDKÉT tükör-esetet (utólag rögzített ⇒ csak a tudás dönt · ismert, de még nem hatályos ⇒ csak a
hatály). Megtalálta: a SAJÁT mutációs battériám.

**A LÁNC-ELTÉRÉS (§2) — visszavonom az R84-es állításomat.** Ők 12/15 + 2 FAIL-t mértek, én 13/15 +
exit 0-t állítottam, a mai friss futás pedig **13/15 MEGFELEL + 2 BIZONYÍTOTT ENV-KIHAGYÁS**-t ad,
más bukó esetekkel. Három futás, három kép: a lánc **gép- és időzítés-függő**, és a mai
diagnosztikánkkal nem eldönthető, kié a „helyes". **KUKA-160.** A gyökér-okot javítottuk: minden
nem-zöld program mellé `child_trace` kerül (állapot · jelzés · spawn-hibakód · mért idő · stderr
utolsó 60 sora · stdout utolsó 20 sora · csonkolás-jelzés) — eddig NÉGY SORRA volt csonkolva a nyom,
ezért az eltérést egyikünk sem tudta megvizsgálni.

**A „KÉT FÜGGETLEN TANÚ" MEGFOGALMAZÁS VISSZAVONVA (§5).** A program hibaszövege és a mi mért időnk
UGYANANNAK az eseménynek a következménye, a `cap_ms`-t ráadásul mi olvastuk ki az ő programjukból —
tehát nem független tanúk. A kód mostantól két külön mezőt visz és ki is írja: `witness_basis` (erős
ág: esetenkénti bizonyíték dönt) · `witness_limit` (gyenge ág: nincs eredmény-fájl, a kihagyást a
ZÖLD HELYETTES tartja, nem a két jel).

**KUKA-129 VISSZATÉRT — KÉTSZER, EGY KÖRÖN BELÜL, a saját javításomban.** A `partially_covered`
bevezetése után előbb az egységek ÖSSZEFŰZÉSE (`result === 'covered'` betűre), majd — a
visszaminősítés kiterjesztése után — a fedezet-SZÁMÍTÁS (`chainBacking`) sem tudott az új állapotról.
Az első alakban a sorok sorsát az EGYSÉGEK SORRENDJE döntötte el, a másodikban mind a négy, valóban
falszifikált sor `not_falsified`-re romlott. **Megtalálta: a SAJÁT MÉRÉSEM, mindkétszer** — a
battéria végig `exit 0` volt. Javítva KÖZÖS feloldókkal: `chainResultRank` + `claimsFalsification`,
amiket mindhárom olvasó HÍV. **Élesebb tanulság:** egy ÚJ ÉRTÉK bevezetése ugyanaz a lánc-kérdés,
mint egy szabály javítása — meg kell keresni MINDEN olvasót, aki a régi értékkészletet betűre
egyezteti.

**Gépi végeredmény:** `v3ref/run.mjs` **48/48 PASS** · mutációs battéria **117/117 elkapva · 0 túlélő ·
0 elavult horgony · TELJES ÉS TISZTA · exit 0** · norma-lánc **54 fedett · 4 részben fedett · 8
nevezett hiány**, kötelező készlet **req-4, hiány nélkül** · a külső lánc **13/15 + 2 env-kihagyás
(zöld helyettessel)**. A kör lapja a V2 repóban: `docs/70_PLANNING/V3_R86_…md` (**D-VS-715**).

---

## D-VS-3025 — A BIZONYÍTÉK-ELFOGADÁS HÁROM RÉSE ÉS A KÉT IDŐ-TENGELY (R83/F01…F03 + REV-N2a/b)

> **Hatály:** V3 — a V3 magreferencia (`v3ref/`) beadvány-kapuja, külső-lánc futtatója és
> norma-modellje. A V2 kódját nem érinti.

- **Dátum:** 2026-09-14 · Sáv: Claude-v3 (PR-VS-300 · STEP-VS-300-002 · CMD-VS-300-002-001 R83/R84)
- **Bemenet:** a külső tárgyaló fél (chatgpt-v3) R83 — ANALYSIS lapja, KÉT futtatható programmal.
- **Reprodukció ELŐSZÖR, a VÁLTOZATLAN kódon** (`594f49f`): összefűzés **1 PASS / 3 FAIL** ·
  futtató **2 PASS / 1 FAIL** — pontosan az általuk közölt eredmény. Tesztadaptáció nem történt.

**F01 — a próba-állapot ZÁRT sémája** (`v3ref/unitAdmission.mjs`). A kapu a `probe_status` mezőből
egyetlen tiltott párost ismert (`CAUGHT` + `PASS`), tehát a mező TÖRLÉSE és `UNKNOWN`-ra állítása
egyaránt teljes zöldet adott a VALÓDI egységeink másolatain. Innentől a mező jelenléte kötelező, az
értéke a `manifest.mjs` zárt szókészletéből való, és a verdikthez ÉS a mutáció szerződés-fajtájához
is illeszkednie kell (`VERDICT_STATUS_RULE` · `probeStatusProblem`). A `runtime_error` szerződésű
mutáció `THREW` állapota JOGOS marad — és ezt POZITÍV ELLENPÁR méri. **KUKA-155.**

**F02 — az elvárt lánc-sorok a RÖGZÍTETT szerződésből** (`v3ref/norms.mjs` → `expectedChainRows`).
A leggyengébb-sor kánon (KUKA-154) csak a JELEN LÉVŐ sorok között működött: minden egységből
kivéve ugyanazt az egy REV-N3a állítás-sort, a lánc 48 sorral is „teljes" maradt. Innentől a
(klauzula · állítás · próba) hármasok halmaza a mai szerződésből jön; a hiányzó sor `row_missing`
néven a leggyengébb rangot viszi, az idegen sor és az EGY egységen belüli ismétlés nevezett akadály,
a TÖBB egységben megjelenő azonos sor viszont a darabolás jogos következménye. **KUKA-156.**

**F03 — a környezeti kihagyás MÉRT kudarc-fajtára** (`v3ref/external-checks/`). A felmentés a
bejelentésen állt (`env_limit` + `superseded_by`), ezért egy VALÓDI assertion-hibát is felmentett.
Innentől a bejelentett akadály-fajta zárt készletből való, és a program TÉNYLEGES kudarcának
ugyanannak kell lennie; időtúllépést KÉT független tanú igazol: a program saját hibaszövege ÉS a
futtató mért ideje (≥ a bejelentett belső korlát). MÉRVE: az `r57` és az `r59` valódi időtúllépése
továbbra is kihagyást kap — a kapu nem fal. **KUKA-157.**

**CORE — REV-N2a/b: a két idő-tengely és a felülvizsgálati kör** (`v3ref/bitemporal.mjs`, BIT-01).
A terv az R71 óta állt (`NEXT_REQUIRED_EVIDENCE.order`), most megépült: `membershipAsOf({validAt,
knownAt})` a naplóból számol, a `recordRetroactiveInvalidity` az ÚJ esemény-fajta (múltbeli hatály +
mai rögzítés, `alter_right` hatáskörrel és KÖTELEZŐ bizonyíték-hivatkozással), a `review_circle` +
`review_circle_member` a nevesített felülvizsgálati kör — SZÁMÍTOTT tagsággal, érintetlen eredeti
történettel és KÜLÖN, `adjudicate` hatáskörhöz kötött lezárással. Két új próba (`P-REV-bitemporal`,
`P-REV-review-circle`), nyolc deklarált állítás, nyolc falszifikáló mutáció (M100–M107).

**A kötelező készlet req-3 → req-4** (11 klauzula). A feltételt az R71 ELŐRE kimondta, és MÉRVE
teljesült: a REV-N2a/b mind a nyolc deklarált állítására van nevezett falszifikáló. A következő
csomag (req-5) az ORG-N1a/b: a felhatalmazás ALAPJA azonosítóval, verzióval, hatállyal és korláttal.

**SAJÁT LELET.** Az M106 (az időablak-szűrő elvétele) TÚLÉLT, mert a fixtúrában a tagság a
helyesbítés hatálya UTÁN kezdődött — az „időablakon kívüli művelet" ellenpárja LÉTRE SEM JÖHETETT.
**KUKA-158.** És a saját F02-pinem első alakja egy MÁR ELDÖNTÖTT tényt mért (KUKA-124/1
ismétlődése), ezért a visszacsúszást nem fogta meg; a mai alak a klauzula ítéletét méri.

**A HÁROM HELYESBÍTÉSÜK ÁTVEZETVE.** (1) A „bájtazonos" állítás visszavonva: a program TESTE
karakterre azonos, a záró sortörés eltérhet (mérhető tény, nem mértük — KUKA-033). (2) A séma, a
bijekció és az ellentmondás-mentesség NEM bizonyítja, hogy a futás megtörtént; az R81-es
megnyugtató mondat („gyakorlatilag a battéria lefuttatása") visszavonva. (3) A `tools/` alatti
futtató pinjének lezárását ez a kör sem igazolja — nyitott marad.

**Mért végállapot:** magreferencia 45/45 · battéria 104/104 elkapva, 0 túlélő · kötelező készlet
11/11 (req-4) · külső lánc 13/15 MEGFELEL + 2 bizonyított környezeti kihagyás (nevezett
helyettessel) · az ő R83-as programjaik 7/7 · legrosszabb egység falióra 6242 ms (a 15 000 ms-os
külső korlát 42%-a).

---

## D-VS-3024 — A BEADVÁNY-KAPU ÉS AZ ADATKIADÁS IDEJE (R81/F01…F04 + a négy helyesbítés)

> **Hatály:** V3 — a V3 magreferencia (`v3ref/`) összefűzése és kiadási útja. A V2 kódját nem érinti.

- **Dátum:** 2026-09-14 · Sáv: Claude-v3 (PR-VS-300 · STEP-VS-300-002 · CMD-VS-300-002-001 R81/R82)
- **Bemenet:** a külső tárgyaló fél (chatgpt-v3) R81 — ANALYSIS lapja, KÉT futtatható programmal.
- **Reprodukció ELŐSZÖR, a VÁLTOZATLAN kódon** (`eb4d83b`): mag **6 PASS / 1 FAIL** · összefűzés
  **4 PASS / 4 FAIL** — pontosan az általuk közölt eredmény. Tesztadaptáció nem történt.

**F01–F03 — MRG-01, az összefűzés beadvány-kapuja** (`v3ref/unitAdmission.mjs`). A régi alak a
beadott egység-fájlok SAJÁT ÖSSZEFOGLALÓIT vette mérésnek. Négy szabály, mind a RÉSZLETES
bizonyítékon: szigorú séma + TÁMOGATOTT szerződés-verzió (a hiány külön válasz, átalakítás nélkül) ·
bijekció a bejelentett azonosítók és a részletes eredmények között, az ÖSSZESÍTŐK ebből · a
bejelentett és a mért adat ELLENTMONDÁSA nevezett akadály · a kötelező készlet, az elvárt állapot és
a szerződés-lenyomat a MAI, rögzített forrásból. Mellé `chainBacking`: a `covered` lánc-sor a
`falsified_by` mutáció részletes eredményére visszavezetve. → **KUKA-151**

**F04 — a kiadás hatályosulási pontja** (`readCommandResult` → `effectuateWith`, `basis:
'membership'`). A tranzakción belül olvasott `at` vezet végig MINDHÁROM fogyasztón: tagság+tiltás ·
az eredmény adatköre · a kiadási leltár sora. Nem új ellenőrzés született, hanem a meglévő időpont
ment végig. → **KUKA-152**

**KÉT SAJÁT LELET ugyanebben a körben.** (1) A mutációs horgony csak LÉTEZETT, nem volt EGYEDI: a
kiadási javítás után az M93 horgonya két helyen állt, és a mutáció némán az elsőre esett
(**KUKA-153**). (2) A kötelező klauzula-készletet KÉT szabály döntötte el — a `checkNorms` a
leggyengébb sor szerint, az összefűzésem a legerősebb szerint —, és a permisszívebb állt a ZÁRÓ
kapunál (**KUKA-154**, a külső fél ADAPTÁLT R59-es programja hozta elő).

**A NÉGY HELYESBÍTÉSÜK átvezetve** (R81 §7): a régi FAIL az `F03-revoke-credential-**other**` volt,
nem a `matching`, és az a hiba TÚLZÁRÁS volt · az ENT-01 öt belépési pontja nem „minden író", hanem
a HATÁSKÖRI/TILTÁSI család · az 1,7 mp az ő R77-es mérésük (R79: 7323 ms) · a 36/47 klauzula-sor nem
„77%-ban kész termék". Mindegyik a kódban álló magyarázatban is javítva, nem csak a lapon.

**AZ ADAPTÁLT R57/R59 ÁTVÉVE, JELÖLT EREDETTEL** (R81 §5): `r57a` és `r59a` KÜLÖN bejegyzés a
lánc-regiszterben, a szerzőség és az eltérés (a battéria darabolt hívása) kimondva; az EREDETI r57/r59
érintetlen marad. Mellé egy szerkezeti következmény: az adaptált változatok UGYANAZT az
eredmény-fájlnevet írják, ezért a futtató a saját eredmény-fájlt a futás ELŐTT félreteszi
(KUKA-127 a saját futtatónkon) — enélkül egy időtúllépésre futó eredeti mellett a szomszédja fájlja
maradna ott, és zöldnek látszana.

**MÉRT VÉGÁLLAPOT.** Magreferencia **43/43 PASS** · battéria **96/96 elkapva**, 0 túlélő · 0 rossz
próba · 0 mérőhiba · 0 elavult horgony · a kötelező készlet **9/9** (a szigorúbb, kánoni szabállyal) ·
a külső fél R81-es két programja **15/15** · `r57a` **9/9** · `r59a` **7/7**.

---

## D-VS-3023 — A RÉSZFA SÉMÁJA, A PARANCSÍRÁS HATÁLYOSULÁSA, A KONTEXTUS-ÁTVITEL ÉS A DARABOLHATÓ FUTÁS (R79/F01…F03 + §6)

> **Hatály:** V3 — a V3 magreferencia (`v3ref/`) kiadás-, hatályosulás- és mérés-modellje. A V2
> kódját nem köti; a V2 fejlesztő átlépheti. A tanulságok (KUKA-145…150) fogalmi szintűek, tehát a
> V2-ben is érdemes rájuk nézni, ha hasonló alak születik.

**A külső tárgyaló fél (chatgpt-v3) HÁROM leletet adott a SAJÁT, egy körrel korábbi (R77-es)
javításainkra, és egy NEGYEDIK kérést a futás szerződésére.** A programjuk VÁLTOZATLANUL futott a
repóban: a javítás ELŐTT **14 PASS / 4 FAIL** (pontosan az általuk közölt reprodukció), a mai
forráson **18 PASS / 0 FAIL**. Tesztadaptáció nem történt — a programjuk szövege érintetlen
(`v3ref/external-checks/r79_chatgpt-v3.core.mjs`, bájtazonosan).

### F01 — A RÉSZFA A FELSŐ MEZŐ CÍMKÉJÉT ÖRÖKÖLTE

Az R77-es DSC-01 típusonként deklarálta a kiadott eredmény adatkörét, de LAPOS mezőnév-listaként. A
`{lines:[{qty, unit_price}]}` eredményben a `lines` SAJÁT címkéje (`keszlet`) fedte az EGÉSZ
részfát, tehát a beágyazott ármező kiment az `arak`-ra TILTOTT olvasónak; a `{qty:{unit_price:…}}`
alak pedig azért ment át, mert a levélen senki nem kérdezte meg, szám-e.

**Javítás (DSC-01 v2):** a deklaráció SÉMA — `leaf(kind, scope)` · `arrayOf(of)` · `objectOf(fields)`
—, és a besorolás a VALIDÁLT alakból gyűlik, MÉLYSÉGBEN. A levél TÍPUSA is deklarált; a be nem
sorolt mező a részfában is NEVEZETT, az ÚTJÁVAL (`lines[0].titok`), és a hatás LÉTRE SEM JÖN. Nincs
globális mezőnév-találgatás: a jelentést az adja, melyik TÍPUS melyik POZÍCIÓJÁN áll a név
(KUKA-002). (KUKA-145)

### F02 — A PARANCSÍRÁS KIMARADT A HATÁLYOSULÁSI PONTBÓL

Az R77-es EFF-01 a HATÁSKÖRI írókat kötötte be; a parancsíró HÁROM külön óraolvasáson maradt (jog ·
`finalized_at` · nyugta). Mérve: a tagság 08:00:01-kor megszűnik, az első olvasás 08:00:00, a többi
08:00:02 — a parancs `finalized` lett 08:00:02-es idővel, amely időpontra a jog-feloldó MÁR tiltja
az eljárót.

**Javítás (EFF-01 v2):** `effectuateWith({store, clock, basis, decide}, effect)` — a hatályosulás
mechanikája KÖZÖS, a jog-feloldó INJEKTÁLT (az `authority.mjs` nem húzhatja be az `authz.mjs`-t:
kör lenne), és a `basis` KIMONDJA, melyik jog-fajta döntött (`authority` | `membership`). Öt
hatásköri út mellett a parancsíró is EGY időponton áll: a `finalized_at` és a nyugta ideje
BÁJTRA azonos. (KUKA-146)

### F03 — A MEGVONÁS NEM VITTE ÁT A HITELES KONTEXTUST

A tagság-megvonás hívta a hatáskör-ellenőrzést, de `credentials`-t nem adott tovább: a
HITELESÍTŐ-alapú tiltás ezen az ÍRÓ úton nem hatott, miközben a másik négy úton zárt.

**Javítás (ENT-01):** a `revokeMembership` fogadja és továbbadja a kontextust; mellé a mérés
hatóköre SZABÁLY lett, nem lista — az `entryPoints.mjs` MINDEN író belépési pontot felsorol
(5 pont × 4 kontextus-tengely × 3 mód = **60 cella**, padlóval), a tengelyeket a tiltás-fajták ZÁRT
halmazából SZÁRMAZTATJUK, és a SZÁNDÉKOSAN semleges út (bejelentés-elbírálás, R67/F02) DEKLARÁLT,
a semlegessége pedig BÁJTRA mérve. (KUKA-147)

### §6 — A FUTÁS SZERZŐDÉSE (RUN-02): DARABOLHATÓ FUTÁS, HÁROM KÜLÖN MEZŐ

A külső fél kérte, hogy a mutációs battéria darabolható legyen, és hogy az időtúllépés NEVEZETT,
NEM TELJES futás legyen, külön mezőkkel — ne a kód hibájának látsszon. **A kérés ebben a körben
KÉNYSZERRÉ is vált:** a három új próbával a teljes battéria faliórája ezen a futtató-gépen (4 vCPU)
**17,1 mp** a legjobb mért alakban (párhuzamosság 4 · 6 · 8 · 16 mind 17–19 mp), a külső korlát
pedig 15 000 ms. A korlátot NEM emeltük meg (az a mérce meghamisítása lenne — KUKA-091 · KUKA-140).

**Megépítve:**
- **`--unit=k/n`** — a mutációk k-adik n-ed része. Az egység MINDEN futásban lefuttatja a TELJES
  alapvonalat és MIND A NYOLC hazugság-ellenpróbát (enélkül az „elkapva" semmit nem jelent), és a
  részeredményét fájlba írja. **Az egység SEMMIT nem állít a battéria egészéről.**
- **`--merge`** — teljes összefoglalót KIZÁRÓLAG ez adhat, és csak ha mind az **öt** feltétel áll:
  (1) minden mutáció PONTOSAN EGYSZER · (2) minden egység UGYANARRA, a MA mért forrás-lenyomatra
  hivatkozik · (3) minden egység `complete` · (4) mindegyikben zöld volt a két kapu · (5) mindegyik
  bizonyítéka a SAJÁT szülői főkönyvéhez KÖTÖTT.
- **HÁROM KÜLÖN MEZŐ:** `run_state` (`complete` | `incomplete`) · `clean` (a KÓDRÓL szól; nem teljes
  futásnál `null`, mert az el nem végzett mérés sem nem zöld, sem nem piros) · `portable` (belefér-e
  EGY hívás a külső korlátba — ez a MÉRÉSRŐL szól, nem a kódról). Kilépési kód: **0** teljes és
  tiszta · **1** teljes, de nem tiszta · **2** NEM teljes.
- Mérve: **három** egységgel a legrosszabb egység **7,0 mp** (a korlát 47%-a). Az első alak KETTŐ
  egységgel készült és önmagában zöld volt (8,5–10,4 mp) — a TELJES söprés párhuzamos terhelése
  alatt viszont az egyik egység **12 141 ms** lett, tehát átlépte a saját költségvetését. NEM a
  költségvetést emeltük, hanem tovább daraboltuk a munkát (KUKA-140).

**A söprés-felület innentől a DARABOLT futás** (`verify:v3ref` → három egység + `--merge`); a régi,
egy-hívásos `v3ref:mutate` megmarad, és ŐSZINTÉN `incomplete`-et mond ezen a
gépen. (KUKA-150)

### KÉT SAJÁT LELET, AMIT EZ A KÖR HOZOTT ELŐ

- **Egy határ, két név** (KUKA-148): a `store.tx` és a `withTransaction` ugyanaz a tranzakció-határ;
  az R77-es alakom a másodikat hívta, és amint a parancsírót is odakötöttem, a határt mérő próba
  ELVESZTETTE a mérési pontját. Nem a kód romlott el, hanem a MÉRÉS. Megtalálta: a saját söprésem.
- **A próba egy korábbi kapu munkáját jelentette sajátjának** (KUKA-149): a `P-CMD-effectuation`
  első alakja óraolvasás-számlálóra épült, holott a parancs-úton a hatályosulási pont ELŐTT még KÉT
  tagsági kapu áll. Megtalálta: a saját falszifikálóm (M93 → WRONG_CATCHER). A mai alak az óra a
  TRANZAKCIÓ HATÁRÁHOZ köti, és MEGMÉRI, hogy a mért pontot elérte-e.

### MÉRT VÉGÁLLAPOT

- `verify:v3ref`: **42/42 próba PASS** · a darabolt battéria (3 egység) **92/92 mutáció elkapva** (0 túlélő ·
  0 rossz próba · 0 mérőhiba · 0 elavult horgony) · **36/47 klauzula-sor FEDETT** · a kötelező
  bizonyíték-készlet **9/9**.
- `verify:external-checks`: **9/11 program MEGFELEL**. A külső fél R79-es programja **18/18**, a
  saját RUN-02 próbánk **4/4**.
- **KIMONDOTT ELTÉRÉS (r59 · r57):** a külső fél R59-es és R57-es programja a battériát EGY hívásban
  futtatja 15 000 ms-os időkorláttal. Ezen a futtató-gépen a teljes battéria 17,1 mp, tehát náluk
  ETIMEDOUT-tal áll meg: **a MÉRÉS akad el, nem a kód bukik**. Az ő programjukat NEM írjuk át (az a
  lánc alapja). Helyette a saját `r79_run_contract_restated.mjs` UGYANAZOKAT az állításokat méri a
  darabolt futáson (U01: hamisított bizonyíték egység-módban · U02: hiányzó egység · U03: idegen
  forrású egység · U04: pozitív ellenpár) — **4/4 zöld**. A kérés az R80-as lapon megy át: a
  battéria-hívást az ő programjukban is a `--unit`/`--merge` alakra érdemes állítani.
- **KIMONDOTT KORLÁT:** az egység-fájl NINCS kriptográfiailag a futásához kötve — kézzel írt
  egység-fájl is beolvadna; a forrás-lenyomat egyezése szűkít, de nem bizonyít. A zárás feltétele
  nevezett: aláírt egység-tanú. Ez a KUKA-121 mintájának folytatása a saját futtatónkon.

---

## D-VS-3022 — A HATÁLYOSULÁS PONTJA, A KIADOTT TARTALOM ADATKÖRE ÉS A SÉRÜLT TÁROLT HATÓKÖR (R77/F01…F03)

> **Hatály:** V3 — a V3 magreferencia (`v3ref/`) hatáskör-, tiltás- és kiadás-modellje. A V2 kódját
> nem köti; a V2 fejlesztő átlépheti. A tanulságok (KUKA-141…144) viszont fogalmi szintűek, tehát a
> V2-ben is érdemes rájuk nézni, ha hasonló alak születik.

**A külső tárgyaló fél (chatgpt-v3) HÁROM leletet adott a SAJÁT, egy körrel korábbi (R75-ös)
javításomon**, futtatható programmal. Reprodukció a VÁLTOZATLAN kódon: az ő `r77` programja
**34 PASS / 5 FAIL** — pontosan az általuk közölt kép. A javított kódon **39 PASS / 0 FAIL**, és
**TESZTADAPTÁCIÓ NEM TÖRTÉNT**: a programjuk szövegéből egyetlen karaktert sem írtunk át, a
behúzási útvonalait sem — a fájl a repóban bájtazonos azzal, ami a lapjukon megérkezett
(`v3ref/external-checks/r77_chatgpt-v3.core.mjs`).

· **F01 — A DÖNTÉS ÉS A RÖGZÍTETT HATÁS KÉT KÜLÖN IDŐPONTON ÁLLT.** Mind a három hatáskör-igényes
író KÉTSZER olvasott órát: egyszer a DÖNTÉSHEZ, egyszer a rögzített hatás időbélyegéhez. Mérve: a
felhatalmazás 08:00:01-kor megszűnik, az első olvasás 08:00:00, a második 08:00:02 — a művelet
SIKERES, és a hatást 08:00:02-es idővel rögzíti. A tárolóban onnantól olyan hatás áll, amit a SAJÁT
könyvünk szerint a rögzítés pillanatában már senki nem volt jogosult létrehozni. Javítás:
**EFF-01 / `effectuate`** (`v3ref/authority.mjs`) — BEBOCSÁTÁS a hívás pillanatában (a mai jog),
**HATÁLYOSULÁS a tranzakción BELÜL, EGYETLEN óraolvasásból**: ugyanaz az időpont hordozza a döntést
ÉS a hatást, a hatás-visszahívás pedig soha nem olvas órát; tiltáskor NULLA mellékhatás.
**A SAJÁT, OSZTÁLY-SZINTŰ ÁTVIZSGÁLÁSOM KÉT TOVÁBBI UTAT TALÁLT** ugyanebben, amit ők nem neveztek
meg: a **megvonás-napló** (`authz.mjs` → `revokeMembership`) és az **elbírálás**
(`adjudication.mjs` → `adjudicateClaim`). Öt út áll ma egy hatályosulási ponton. (KUKA-141)

· **F02 — A TILTÁS EGY CÍMKÉRE HATOTT, NEM AZ ADATRA.** A `{qty, unit_price}` parancs-eredményt az
`arak` adatkörre TILTOTT olvasó `dataScope: 'arak'` kontextussal helyesen nem kapta meg,
`dataScope: 'keszlet'` kontextussal viszont EGÉSZBEN megkapta, az ármezővel együtt: a kimenő
TARTALOMHOZ semmi nem volt kötve, a kérő SAJÁT CÍMKÉJE döntött. Javítás: **DSC-01 /
`resultScope.mjs`** — a parancs TÍPUSA (+verziója) deklarálja, melyik mező melyik adatkörbe esik; a
kiadás a KIADANDÓ TARTALOM adatköreit MÉRI ebből, és mindegyikre KÜLÖN kérdez; a kérés `dataScope`
tengelyét a MÉRT érték írja felül. Vegyes eredmény alapból EGÉSZBEN megtagadva (mezővetítés ma
nincs — **kimondva**, nem elfelejtve); a hiányzó besorolás KÜLÖN, fail-closed válasz: a BEADÁSNÁL
nevezett mondattal (saját bemenet), a KIADÁSNÁL némán, a nem létező eredmény válaszával
(KUKA-084). (KUKA-142)

· **F03 — A SZERKEZETILEG HIBÁS TÁROLT HATÓKÖR „MÁSIK KÖNYVNEK" MINŐSÜLT.** A tárolt művelet-cél
ÜRES könyv-tengelyét (elválasztó, előtte semmi) a feloldó szabályos alaknak vette, a kérés
könyvéhez hasonlította, nem egyezett — és `ban_other_bookId` címen TOVÁBBENGEDTE a kérést: az
érvénytelen tiltás úgy viselkedett, mint egy érvényes, de más könyvre szóló. Javítás: **OPS-01 /
`operationScopeProblem`** — a normalizáló HÁROM választ adhat, nem kettőt („érintett" ·
„bizonyítottan MÁS" · „ez a rekord nem értelmezhető"), és a harmadik a rekord-integritás kapujában
dől el, a hatókör-értékelés ELŐTT (R75/F04 helye). MINDKÉT fogyasztó ugyanazt a feloldót hívja
(`banRecordIntegrity` · `banReaches` — KUKA-039); a hiányzó cél megtartja a saját, pontosabb nevét
(`ban_target_missing`), a két JOGOS alak érintetlen marad (KUKA-049). (KUKA-143)

**A NEGYEDIK LELET A SAJÁT MÉRŐMŰSZEREMBEN VOLT — és a saját battériám találta meg.** A magreferencia
futtatója `--json` módban `process.exit(1)`-gyel zárt, a mutációs battéria viszont `spawnSync`-kel
hívja, tehát a kimenet CSŐRE megy: a `process.exit()` a még ki nem írt bájtokat ELVÁGJA. Amíg a
jelentés elfért egy írás-adagban, semmi nem látszott; a három új próbával a JSON ~141 kB fölé nőtt, és
**76-ból 57 mutáció „értelmezhetetlen JSON" címen MÉRŐHIBÁRA futott** — miközben a próba-futás végig
zöld volt. A mérő-eszköz a SAJÁT NÖVEKEDÉSÉTŐL romlott el. Javítás: `process.exitCode` + természetes
kifutás, korai megálláshoz címkézett blokk. **Jó hír, kimondva:** a csonka kimenet NEM zöldnek
látszott, hanem nevezett MÉRŐHIBÁNAK — a bizonyíték-szerződés (R59/F01) itt tartott. (KUKA-144)

**KÉT PONTOSÍTÁS, AMIT ŐK KÉRTEK — elfogadva.**

1. **A mátrix SOR ≠ EGYEDI BEMENET.** Az R76-os lapom „66 cellát" mondott, ami sort jelent, nem
   egyedi mérési pontot. A mérés most maga írja ki a bontást, nem a szerző kezével számolva
   (KUKA-082): **66 sor · 3 nem értelmezhető · 63 végrehajtott = 51 EGYEDI bemenet + 12 ismétlődő ·
   0 eltérés · lefedetlen fajta: nincs**. Az ismétlődés nem hiba (ugyanaz a bemenet két úton is
   megjelenik), de attól még nem 66 független mérés — ezt a lap innentől kimondja.
2. **A KUKA-139 tanulsága SZŰKÍTVE.** Az eredeti szöveg általánosabbat állított, mint amit a lelet
   igazol: nem minden fixtúrás próba gyanús, hanem az, amelyik a MUTÁLT KÓDSORT nem futtatja le. A
   bejegyzés mostantól ezt mondja, és a nevezett ellenpárt (fixtúra a hatásra + VALÓDI kiadás a
   viselkedésre) is.

**AZ IDŐ-TARTALÉK — a javítás nem a költségvetés megemelése volt.** A három új próbával a battéria
falióra-ideje a saját költségvetés fölé ment (12,3–13,0 s a 12 000 ms-os kereten). A költségvetést
NEM emeltük meg (az a mérce meghamisítása lenne — KUKA-091 · KUKA-140): a próba-tárolók száma
16 → 8, a mátrix-világok ~27 → 7.

**ÉS EZ NEM VOLT ELÉG — A KÖR EGY NYITOTT TÉTELLEL ZÁR.** Háromszor, közvetlen futással mérve:
**11 323 · 12 593 · 12 461 ms** a 12 000 ms-os kereten — kettő a háromból FÖLÖTTE. A battéria ilyenkor
`HIÁNYOS — a falióra a saját költségvetés fölé ment` üzenettel, NEM NULLA kilépéssel áll meg, és ennek
KÉT fogyasztója bukik el vele: a `verify:v3ref` (tehát a V3 söprés), **és a külső fél R59-es
programjának P01 POZITÍV KONTROLLJA** (feltétele `batt.exit === 0`), tehát a `verify:external-checks`
is (`8/9 — ELTÉRÉS: r59`). **A V3 söprés mért állapota: három futás = 1 piros · 2 piros · 0 piros —
tehát NEM megbízhatóan zöld, és nem is írjuk annak.**

**Mérve, hogy ne tippeljünk (KUKA-054):** forrásfa-másolás mutációnként **4 ms** · Node indulás +
modul-betöltés **~70 ms/futás** · EGY próba-futás **410 ms**, ebből **309 ms a 39 próba teste**
(legdrágább: `P-NORM-evidence` 56 ms · `P-INVITE-seal` 33 ms · `P-REV-ban-matrix` 21 ms) ·
párhuzamosság 20/24/32 → 10,9/11,1/11,7 s, tehát a hangolás **nem segít** (a 16 már hangolt, R53).
**Nincs olcsó nyereség:** 86 gyerek-futás × 39 próba — a költség a mérés MÉRETÉBŐL jön, és a mérés a
rendszerrel együtt nőtt (a KUKA-144 testvére: ott a KIMENET, itt a KÖLTSÉG).

**Amit NEM teszünk: nem emeljük a költségvetést** (az a tartalék eltörlése lenne, amiért a kapu
készült — R53), és nem jelentünk zöld söprést. **A következő kör iránya kimondva:** egy mutációhoz ne
kelljen MIND a 39 próbát lefuttatni, csak az, amelyik elkaphatja, plusz minta a „rossz elkapó"
felismerésére — ez viszont a mérés JELENTÉSÉT módosítja, tehát tervezni kell, nem a kör végén
összeütni. **Gépi jel: maga a kapu**, ami helyesen tüzel; a commitolt artefaktum egy ÁTMENT futást
rögzít (11 504 ms) — ez tehát nem a tipikus állapot, és a lap ezt kimondja (KUKA-082).

**MÉRT VÉGÁLLAPOT (ebben a körben, ebben a repóban):** próbák **39/39 PASS** · mutációk
**85/85 ÉSZLELT** (0 túlélő · 0 rossz elkapó · 0 mérőhiba · 0 elavult horgony) · hazugság-próbák
**8/8 védve** · kötelező bizonyíték **9/9** · `verify:kuka` **307/307** · külső programok
**9/9 MEGFELEL** — de CSAK akkor, ha a battéria a keretén belül fut (különben `8/9`, az r59/P01
kontrollal) · **V3 söprés: NEM megbízhatóan zöld**, három futás = 1 piros · 2 piros · 0 piros, az
egyetlen ok a fenti falióra-keret. **V2 söprés: zöld** — 291 verifier, 290 zöld, 1 nevezett
env-kihagyás (`verify:schema`, adatbázis nélkül), 0 piros.

**AMI NYITVA MARAD, KIMONDVA.** A REV-N2a klauzula (a HATÁLY ideje és a TUDOMÁS ideje mint két külön
tengely) továbbra is NYITOTT, bizonyíték nélkül — a hatályosulási pont (EFF-01) ezt **nem** oldja
meg, csak a döntés és a hatás EGYIDEJŰSÉGÉT. Ezért a P-REV-effectuation próba a REV-N3a klauzulához
van kötve, nem a REV-N2a-hoz: egy klauzula nem mondhatja egyszerre, hogy hiányos, és hogy van rá
bizonyítéka. A mezőnkénti kiadás (részleges eredmény-vetítés) sincs megépítve — ma a vegyes eredmény
EGÉSZBEN tagadva.

---

## D-VS-3021 — A KIADÁS IS ENGEDŐ ÚT: a tiltás teljes döntése, a tárolt hatókör és a mátrix (R75/F01…F05)

> **Hatály:** V3 — a V3 magreferencia (`v3ref/`) tiltás-modellje. A V2 kódját nem köti; a V2 fejlesztő
> átlépheti.

**A külső tárgyaló fél ÖT leletet adott a SAJÁT, egy körrel korábbi (R73-as) javításomon**,
futtatható programmal. Reprodukció a VÁLTOZATLAN kódon: az ő `core-r75.mjs` programja **2/7 PASS**
(2 kontroll teljesült, mind az öt lelet piros). A javított kódon **7/7**.

· **F01 — a kiadás harmadik, őrizetlen úttá vált.** A tiltás OLVASÁSA és KIADÁSA egy modulban élt,
ezért az `authority.mjs` nem hívhatta a tiltás-feloldót (kör), és a kiadási út csak a NYERS hatásköri
sort nézte: egy MÁR LETILTOTT bíró sikeresen tiltott. Javítás: a függőség iránya MEGFORDULT
(`store ← banScope ← authority ← ban`), és **AUT-01/`executableRightAt`** adja a TELJES döntést —
művelet · eljáró · óra · TILTÁS · hatásköri sor —, amit MINDEN út hív, a kiadás is. (KUKA-135)

· **F02 — a konstans NEVE könyv-hatókört ígért, a TÁROLT rekord nem hordozta.** Egy csak az A könyvön
jogosult bíró `operation_misuse` tiltása a dolgozót a FÜGGETLEN B könyvben is megfosztotta a
hozzáféréstől. Javítás: `operationScopeRef(bookId, opClass)` — a tárolt cél a KÖNYVET is hordozza, és
a `parseOperationScope` MINDKÉT tengelyt megköveteli. (KUKA-136)

· **F03 — gyengébb szerződésű író.** Az `imposeBan` „alacsony szintű íróként” megkerülte az `issueBan`
hatókör-kapuját; a modul KOMMENTJE állította, hogy belső. A külső fél szava: *„a komment nem
hozzáférésvédelem."* Javítás: `export const imposeBan = issueBan` — egy szerződés. (KUKA-135)

· **F04 — az ismeretlen TÁROLT ok engedélyt adott.** Az ellentmondás-vizsgálat `expectedKind && …`
alakban állt, tehát ismeretlen oknál az EGÉSZ ellenőrzés kimaradt. Javítás: `banRecordIntegrity` —
HÁROM külön, nevezett válasz (`ban_kind_unknown` · `ban_cause_unknown_stored` ·
`ban_cause_kind_contradiction`), mindegyik ZÁR, és a kapu a hatókör-értékelés ELŐTT áll. (KUKA-137)

· **F05 — a kontextus egy hívón elveszett.** A `credentials` a parancs-úton végigment, az ELBÍRÁLÁSI
úton nem (`readClaim` · `adjudicateClaim` · `suspendMembership` · `liftSuspension`). (KUKA-138)

**KÉT HELYESBÍTÉS A SAJÁT R74-ES JELENTÉSEMHEZ — elfogadva.** (1) A C-F04 hibájának IRÁNYA fordítva
állt nálam: nem az volt a baj, hogy a tiltott hitelesítővel átment a parancs, hanem hogy **az
ÉRVÉNYES MÁSIK hitelesítővel is blokkolta a jogos munkát** — fail-closed kapunál a hiányzó bemenet
sosem szivárgás, mindig TÚLZÁRÁS, és ez mást kíván MÉRNI. (2) Az M71-hivatkozás nem bizonyít
íróút-ellenőrzést (M71 a kontextus-összefésülést méri); a hiányzó jelet MEGÉPÍTETTÜK: **M75**.
**És a „mind a hét javítva és mindegyik falszifikálva” mondat csak a pontosan megnevezett
ellenpéldákra használható** — ezt elfogadjuk, a jelentés nyelve ehhez igazodik.

**A KÉTSZER KÉRT MÁTRIX — MÉRVE, nem rajzolva.** `v3ref/banMatrix.mjs`: **7 tiltás-fajta × 3 engedő út
(tagsági · hatásköri · KIADÁS) × érintett/független cél × hiteles kontextus (tiltott értékkel · MÁSIK
jogos értékkel · nem hozza)** = **66 cella**, mindegyik valódi tárolóval és valódi feloldóval mérve, a
VÁRT értéket a cella DEKLARÁLJA. Mérés: **eltérés 0 · lefedetlen fajta nincs** (ZÁR 19 · NYITVA 20 ·
NEM DÖNTHETŐ 24). Az ember-olvasható tábla UGYANEBBŐL a függvényből származik (KUKA-082), a
`P-REV-ban-matrix` próba pedig cellánként állítja — tehát a mátrix maga is falszifikálható (**M78**:
új fajta cella nélkül · **M79**: az olvasó mindent globálisnak ért).

**AMIT A MÁTRIX ELSŐ FUTÁSA TANÍTOTT.** Két cellán „eltérést” mutatott az `operation` fajtánál — és a
KÓD volt a helyes, az ELVÁRÁSOM a hibás: a művelet-tiltásnál az „érintett cél” nem a tiltás
tulajdonsága, hanem a tiltás célja ÉS az adott út SAJÁT művelete közötti VISZONY (KUKA-024). Ha az
elvárást a mért értékre „javítom”, a mátrix önmagát igazolja vissza (KUKA-054); ha a kódot igazítom
az elváráshoz, a tiltás túlnyúlik (KUKA-092). Ezért a művelet NEVEZETT lett, és minden cella KIÍRJA,
mit kérdezett.

**AMIT A SAJÁT SÖPRÉSEM FOGOTT MEG.** A modul-szétválasztás után KILENC mutáció horgonya elavult
(jelentve), egy pedig **TÚLÉLT (M68)** — mert a `P-REV-ban-past` fixtúrára váltott, és a mutáció az
`issueBan` törzsét támadja: a próba onnantól nem futtatta a mutált sort, miközben ZÖLDEN állt. A
próba most MINDKETTŐT viszi: fixtúra a hatásra, VALÓDI kiadás a viselkedésre. (KUKA-139)

**ÉS EGY MÁSODIK SAJÁT LELET — AZ IDŐ-TARTALÉK.** A mátrix első alakja cellánként épített tárolót
(66 világ), és mivel a mutációs battéria a próba-készletet 77-szer futtatja, a falióra **11 260 ms**
lett a saját **12 000 ms**-os költségvetésnél (a KÜLSŐ fél 15 000 ms-os korlátjának 80%-a). Önmagában
zöld — a TELJES söprés párhuzamos terhelése alatt viszont átlépte, és **két egymást követő futáson KÉT
KÜLÖNBÖZŐ verifier** bukott el. A javítás NEM a költségvetés emelése volt (a korlát a külső félé):
olvasó világ plánonként megosztva, ÍRÓ cellának saját — 66 → ~27 világ, **11 260 → 9 888 ms** (66%).
(KUKA-140)

**Gépi jel:** `npm run verify:v3ref` **36/36** (új: `P-REV-ban-matrix`; a `P-REV-ban-paths` három új
ágával és a `P-REV-ban-scope` egy új ágával) · `npm run v3ref:mutate` **76/76 elkapva · 0 túlélő ·
0 elavult horgony**, kötelező bizonyíték **9/9** · `npm run verify:kuka` **290/290** · `npm run verify:external-checks` **8/8 program** (az ő
`core-r75.mjs`-ük bájtazonosan a repóban) · a külső fél
`core-r75.mjs` programja a javított kódon **7/7**.

---

## D-VS-3020 — A TILTÁS TÁRGYA, A HATÁSKÖR FELOLDÁSA ÉS AZ ELLENTMONDÓ REKORD (R73/C-F01…C-F05)

**Dátum:** 2026-09-14 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-001 R73 · **KUKA-131…134**

**A reprodukció ELŐSZÖR, a VÁLTOZATLAN kódon — és a programjuk NEM futott le teljesen.** A külső fél
(chatgpt-v3) `core-r73.mjs` programját bájtazonosan kinyertem és futtattam: **2/7**. Az eredmény oka
MÉRVE, nem feltételezve — a programjukban a C01 kontroll és az F03 ellenpélda EGYSZERRE nem
teljesíthető: mindkét szereplőnek (`judge` · `outsider`) **NULLA** `adjudication_authority` sora van
a fixtúrájukban, tehát ugyanaz a hiányzó hatáskör az egyik ágon elvárt siker, a másikon elvárt
kudarc. Ezért készült egy ADAPTÁLT másolat (`core-r73.adapted.mjs`) KÉT, kimondott változtatással:
(1) a `judge` `alter_right` hatáskört kap mindkét könyvön, (2) a tiltás kiadása `bookId`-t kap.
Az adaptált menet: **7/7**. A két futást KÜLÖN nevezzük meg, ahogy kérték.

**A NÉGY LELET — mind valós, mind javítva:**

· **C-F01 + C-F02** — a tiltás-kérdés tárgyát `{ ...operation, ...credentials }` állította elő, tehát
a hitelesített belépési kontextus FELÜLÍRHATTA a kérés tengelyeit: `bookId: "book_b"`-vel a
`book_a`-ra szóló kérés elkerülte a `book_a`-ra kimondott tiltást. Javítás: `banRequestFor` nevezett
tengely-listákkal (`REQUEST_AXES` a hívótól, `CREDENTIAL_AXES` a kontextusból) — a kontextus többet
is hozhat, de a kérés tárgyát nem mozdíthatja el.

· **C-F03** — az `imposeBan` a hatáskör helyén a hívó `authorityOk === true` szavát nézte: NULLA
hatásköri rekordú `outsider` is tilthatott. A feloldás az `adjudication.mjs`-ben élt, a fordított
import KÖRT csinált volna — a külső fél szavával: *„a függőségi kör szerkezeti feladat, nem indok az
ellenőrzés elhagyására."* Javítás: **AUT-01** (`v3ref/authority.mjs`, `authorityRowAt`) semleges
modulban, amit MINDKÉT oldal importál; a kör megszűnt, másolat nem született.

· **C-F04** — a `credentials` el sem jutott a parancs-úton a jog-feloldóig, tehát a
hitelesítő-hatókörű tiltás a leggyakrabban használt úton nem hatott. Javítás: a kontextus végigmegy
(`submitCommand` · `readCommandResult` · `releaseAllowed` + mind az öt `rightAt` hívás).

· **C-F05** — a tárolt sor OKA és FAJTÁJA ellentmondhatott egymásnak, és a rendszer a fajtát hitte
el. Javítás: `ban_cause_kind_contradiction` — nevezett, ZÁRÓ válasz; a sorrend megtartva, hogy az
ismeretlen fajta pontosabb diagnózisát ne fedje el (KUKA-124).

**AMI A SAJÁT MUNKÁM HIÁNYA VOLT — kimondva.** A C-F01/C-F02 és a C-F05 javítása után a magpróba
zölden állt, de EGYIK fixet sem mérte SAJÁT állítás: a „javítva" ezen a két ponton nem volt
bizonyíték, csak állítás. Ezért a `P-REV-ban-scope` KÉT új ágat kapott — (e) a hamisított
kontextus-könyv, (f) az ellentmondó rekord —, nevezett állításokkal, a manifestben deklarálva, és
mellé KÉT új falszifikáció: **M71** (a régi összefésülés) és **M72** (az ellentmondás-ellenőrzés
kivétele). Mindkettő bizonyítottan PIROS.

**A SZÁMOZÁSRÓL, MÉRVE.** A két repó KUKA-regisztere közös fogalmi névtér, de külön fájl: **89**
azonosító mindkettőben AZONOS tartalommal áll, **NÉGY** viszont (KUKA-090 · 091 · 092 · 121) KÉT
KÜLÖNBÖZŐ leckét nevez meg aszerint, melyik repót olvassa valaki. A múltat nem írjuk át (D-VS-682),
de nem is tetézzük: az R73 bejegyzései MINDKÉT regiszterben szabad számot kaptak (131–134; a V2 ma
130-ig áll). **Gépi jel erre ma NINCS** — kimondva, mert egyik repó sem látja a másikat; a zárás
feltétele nevezett: közös azonosító-tér vagy repó-előtag.

**Gépi jel:** `npm run verify:v3ref` **35/35** (a `P-REV-ban-scope` két új ágával) · `npm run
v3ref:mutate` **69/69 elkapva · 0 túlélő · 0 elavult horgony** · `npm run verify:kuka` 259/259 ·
V3 söprés **8/8**.

---

## D-VS-3019 — A CÉLZOTT TILTÁS: MI SZŰNIK MEG, ÉS MI NEM (REV-N5a/b/c · BAN-01)

- **Dátum:** 2026-09-13 · Sáv: Claude-v3 (PR-VS-300 · STEP-VS-300-002 · CMD-VS-300-002-001 R71) ·
  **forrás:** a KÜLSŐ ELLENŐRZŐ FÉL (chatgpt-v3) R71 — ANALYSIS lapja, §8/1: *„a fő szállítmány a
  REV-N5a/b/c a V3 magban"*.

**A KÉRDÉS.** Eddig a magban a tiltás EGY dolog volt: „ez a személy nem járhat el". A valóságban
viszont a tiltásnak FAJTÁJA van, és a fajtát az OK szabja meg — aki elhagyta a céget, annál a
KÖNYVHÖZ fűződő jog szűnik meg, de nem az azonossága; akinek a jelszava kiszivárgott, annál a
HITELESÍTŐ ADAT, de nem a könyvhöz fűződő joga; akitől egy jogalapot vontak vissza, annál az adott
ADAT-KÖR. Ha mindezt egyetlen „tiltott" jelölő hordozza, akkor vagy túl sokat vesz el, vagy túl
keveset — és mindkettő némán.

**A HÁROM KLAUZULA.**

- **REV-N5a — a tiltás MINDEN engedő úton hat.** A magban KÉT út ad jogot: a TAGSÁG (`rightAt`) és a
  HATÁSKÖR (`adjudicationRightAt`). Ha a tiltás csak az egyiken áll, a másik nyitva marad, és a
  „tiltott" szó hazudik (KUKA-039: a szabály nem állhat egy ág feltételében). A tiltás-kapu ezért
  MINDKÉT feloldóban az ELSŐ kérdés, UGYANAZZAL a nevezett feloldóval (`banEffectiveAt`).
- **REV-N5b — a hatókör az OKBÓL jön, nem a jelölőből.** ZÁRT fajta-lista (hitelesítő adat ·
  munkamenet · személy · jogalap · könyv · művelet · adat-kör), ZÁRT ok-lista, és egy nevezett
  leképezés ok → fajta (`kindForCause`). Az ISMERETLEN ok nem „nincs tiltás", hanem HARMADIK válasz:
  a `banReaches` háromértékű (`decidable: false`) — a gép kimondja, hogy nem tudja eldönteni, és nem
  dönt a nemleges irányba (KUKA-020: a programhiba nem lehet azonos a valódi „nem"-mel).
- **REV-N5c — a tiltás nem törli a MÚLTAT és nem veszi el MÁSOK jogát.** A tiltott személy korábbi
  cselekményei a könyvben maradnak, olvashatók, és a rájuk épült más jogok élnek. A tiltás a JÖVŐRE
  szól; a múlt átírása nem tiltás, hanem történelem-hamisítás (a pecsét-szabály folytatása).

**Mért állapot:** a mag **35/35 PASS**, minden veszélyes mutációt a NEVEZETT állítás fog meg (M65–M70
újak), a lefedettség **11/25 → 17/28** klauzula-sor, 0 falszifikálatlan állítás, a söprés **8/8**.
A kötelező bizonyíték-készlet **req-2 → req-3** (9 klauzula, mind teljesül); a KÖVETKEZŐ vállalt
csomag **req-4: REV-N2a · REV-N2b** — a HATÁLY ideje és a TUDOMÁS ideje szétválasztása, valamint a
nevesített felülvizsgálati kör.

**Egy MÉRÉSI tanulság a saját munkámból.** A `P-REV-ban-past` első alakjában a pillanatképet a tiltás
UTÁN vettem KÉT olvasásra — vagyis a „múlt sértetlen" állítást önmagával hasonlítottam össze
(KUKA-054). A javított alak a pillanatképet az ELSŐ olvasás után, a MÁSODIK előtt veszi. A
tautologikus összehasonlítást ugyanabban a körben találtam meg és vettem ki.

---

## D-VS-3018 — AMIRŐL DÖNTÜNK, AZT LÁTNI KELL: a fél őr MÁSODSZOR, és a korlát hatóköre (R69/C-F01–C-F03)

- **Dátum:** 2026-09-13 · Sáv: Claude-v3 (PR-VS-300 · STEP-VS-300-002 · CMD-VS-300-002-001 R69) ·
  **KUKA-121** · **forrás:** a KÜLSŐ ELLENŐRZŐ FÉL (chatgpt-v3) R69 — ANALYSIS lapja.
- **A reprodukció ELŐSZÖR.** A három programjukat bájtazonosan kinyertem és a VÁLTOZATLAN `6a74339`
  forráson lefuttattam: a mag-próba **2 PASS / 3 FAIL**, karakterre az ő arányuk. Minden leletük valós.

**C-F01 + C-F02 — az olvasás nemet mond, az érdemi döntés mégis lezár.** A `readClaim` helyesen
`claim_content_integrity_failed`-et adott sérült tartalomra; ugyanannak az illetékes elbírálónak az
`adjudicateClaim(decision:'resolve')` hívása mégis `ok:true, state:'resolved'`-ot adott, és átírta az
ügyet. Hiányzó tartalomnál ugyanez. **Helyette CLM-01** (`claimEvidenceAt`): a beadvány állapotát EGY
nevezett feloldó mondja ki, amit MINDKÉT út hív. A SORREND kötött — a hatáskör ELŐBB dől el, mint az
adat állapota: a jogosulatlan hívó válasza az adatállapottól FÜGGETLENÜL a semleges nemleges, különben
a különbség maga árulná el, hogy az ügy létezik (KUKA-084).

**C-F03 — a másodlagos hivatkozás nem vehet el MÁS keretet.** A `claimant_ref` korlát MINDEN csatornán
közösen számolt, tehát a támadó a SAJÁT csatornájáról a sértett szabadon megadható hivatkozásával
elhasználhatta annak keretét — a jóhiszemű fél a saját, független csatornájáról `rate_limited`-et
kapott. A szűkítés mostantól a SZERVER képezte kulcson BELÜL él (`intake_key` ÉS `ref`).

**A KLAUZULÁK PONTOSÍTVA.** A **REV-N3c** szövege kimondja a BIZALMI ELŐFELTÉTELT: a mag a
MEGBÍZHATÓNAK FELTÉTELEZETT adapter-kontextus szerint korlátoz — a kontextus EREDETÉNEK kikényszerítése
a REV-N3d hiánya. A **REV-N3d** zárási feltétele a külső fél HAT pontjával szigorodott. Új: **REV-N3e**
— a sérült beadvány ügye ma SEMMILYEN úton nem zárható le (holtpont); a feloldás (technikai karantén)
KÜLÖN műveleti nevet, okot és auditot igényel, ezért NEM építettük meg, hanem nevezett hiányként áll.

**A MÉRTÉKEGYSÉG, a külső fél §5 kérésére, EGYÜTT:** **11/25 bizonyítéklánc-SOR** · **6/20 EGYEDI
klauzula** fedett. A REV-N3e felvétele 19-ről 20-ra emelte az egyedi készletet. Ez nem a mag
készültségi százaléka.

**Saját lelet a mérésről.** A `P-REV-claim-read` (d) része azt mérte, hogy ugyanaz a hivatkozás NÉGY
KÜLÖNBÖZŐ csatornán is elfogy — vagyis **a saját pinem épp azt a csatornákon átnyúló hatást igazolta
vissza zölden, amit a külső fél fegyverként mutatott meg**. Aki a hibát javította volna, PIROSRA vitte
volna a battériát (KUKA-068). A (d) rész átírva: a korlát a saját csatornán belül él.

**Gépi jel.** `npm run verify:v3ref` — az ÚJ **P-REV-claim-decide** (öt ág) + **M62 · M63 · M64**
visszabontási kontroll, mind bizonyítottan piros. Mérve: **32/32 magpróba · 61/61 mutáció elkapva ·
0 elavult horgony**; a külső fél mag-programja a javított kódon **5/5 PASS**.

---

## D-VS-3017 — A SIKER-JELENTÉS NEM HATÁS: REV-N3 MÁSODIK MENET (R67/F01–F05)

**Dátum:** 2026-09-13 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-001 R68 · **KUKA-120**

**A helyzet.** A külső ellenőrző fél (chatgpt-v3) az R67-ben a VÁLTOZATLAN kódunkon futtatta le a
saját programját: **3 kontroll zöld, 5 elvárt feltétel piros.** A reprodukció a mi gépünkön
karakterre ugyanezt adta. A leletek állnak, egyiket sem vitatjuk.

| # | A lelet | A javítás |
|---|---------|-----------|
| F01 | a `suspendMembership` ÍRÁS NÉLKÜL mondta, hogy felfüggesztve — a `rightAt` továbbra is engedett | **SUS-01** (`v3ref/suspension.mjs`): a tény TÁROLÓDIK (`membership_suspension`), és EGY nevezett feloldó (`suspensionEffectiveAt`) mondja ki, amit az `authz.mjs` OLVAS és az `adjudication.mjs` ÍR. Külön modul, mert a közvetlen behúzás KÖRT csinálna (KUKA-003). Mellé `liftSuspension`: a `suspend` hatáskör másik iránya, nem visszamenőleg, a sor MEGMARAD történetnek |
| F02 | az `adjudicateClaim` a hiányzó ügyre semlegeset, a hatáskör nélküli hívónak a hiba NEVÉT adta — a különbség maga mondta meg, hogy az ügy létezik | mind a NÉGY nemleges ág BÁJTRA azonos `CLAIM_NOT_AVAILABLE` (a `readClaim`-en ez már állt: FÉL ŐR volt — KUKA-039 · KUKA-084) |
| F03 | a beadvány TARTALMA sehol nem tárolódott, csak a lenyomata | `claim_content` tábla; a lenyomat INTEGRITÁS-ellenőrzéssé lép elő, eltérésnél NEVEZETT hiba és NEM adunk vissza szöveget |
| F04 | a befogadás KÉT autocommit-írás volt: a második bukása kvóta-sort hagyott ügy nélkül | EGY tranzakció (`store.tx`) — a befogadás egy tény |
| F05 | a korlát a beadó SZABADON ÁTÍRHATÓ hivatkozásán állt | az ELSŐDLEGES kulcsot a SZERVER képezi (`intakeKeyOf`), a beadó hivatkozása MÁSODIK, szűkebb korlát marad |

**A közös betegség, egy mondatban:** a próbáim a VISSZATÉRÉSI ÉRTÉKET nézték, nem a KÖVETKEZMÉNYT
(KUKA-120). A `suspended:true` mező LÉTEZÉSE nem bizonyítja, hogy a felfüggesztés hatályos.

**Gépi jel.** `npm run verify:v3ref`: ÚJ **P-REV-suspension** próba (nyolc ág, végig a
következményen, ellenpárral) + a bővített **P-REV-claim-read** (F02–F05, saját befogadási
kontextussal részenként — a régi alak a saját előfeltevését igazolta vissza, KUKA-054). Hat új
visszabontási kontroll: **M56–M61**, mind bizonyítottan pirosra viszi a nevezett állítást. Az
elavult **M55** horgonya újrakötve. Mérve: **31/31 próba · 58/58 mutáció elkapva · 0 elavult
horgony · REV-N3a/b/c mind FEDVE**, nevezett falszifikálóval.

**AMI NYITVA MARAD — KIMONDVA (a külső fél §7/4 kérése).** A visszaélés-korlát ma szerver-kulcson
áll, de adapter-szintű beadó-kontextus híján MINDEN beadás EGY nevezett, közös vödörbe esik
(`chan:unattributed`): egyetlen elárasztó a jóhiszemű beadók keretét is elveszi. Ez
**referencia-helyettesítő, nem védelem**, ezért a klauzula KETTÉVÁLT: a bizonyított rész a
**REV-N3c** (nyitott út · semleges nyugta · atomi befogadás · szerver-kulcsos korlát), a hiányzó
rész pedig az ÚJ **REV-N3d**, nevezett hiánnyal és nevezett zárási feltétellel. A hatókört a MÉRCE
szabja meg, nem a kényelem (KUKA-048).

**A külső fél saját programja a javított kódon: 8/8 PASS** (változatlan forrással futtatva).

---

## D-VS-3016 — REV-N3 MEGÉPÜLT: A MŰVELETENKÉNTI HATÁSKÖR ÉS A BEJELENTÉS-ÚT, EGYSZERRE (req-1 → req-2)

- **Dátum:** 2026-09-12 · Sáv: Claude-v3 (PR-VS-300 / STEP-VS-300-002 / CMD-VS-300-002-001, R65)
  · **forrás:** a külső ellenőrző fél (chatgpt-v3) R65 §7 kimondott utasítása: *„A következő
  termékcsomag a már R60-ban vállalt REV-N3 legyen. Ne várjon arra, hogy egy újabb levél ismét
  engedélyezze."* — és §1: *„a magban van működő rész, de az R64 termékoldali normáin nem történt
  érdemi bővülés"*.
- **Gépi jel:** `npm run verify:v3ref` — **30/30 magpróba** (+2: `P-REV-authority`,
  `P-REV-claim-read`) és **52/52 mutáció elkapva** (+6: M50–M55) · `npm run verify:external-checks`
  5/5 · `npm run verify:sweep` 8/8 · `npm run verify:kuka` 223/223.

**AMI MEGÉPÜLT — pontosan az R60-ban ELŐRE leírt terv 1. és 2. lépése, változtatás nélkül.**

1. **ADJ-01 — a hatáskör MŰVELETENKÉNT** (`v3ref/adjudication.mjs` + `adjudication_authority` tábla).
   Három zárt művelet: `suspend` (felfüggesztés) · `adjudicate` (érdemi elbírálás) · `alter_right`
   (jogváltoztatás). A hatáskör NEM a tagságból jön — egy admin tagság nem tesz senkit elbírálóvá —,
   és a szűkebb felhatalmazás NEM ad tágabb hatást: a `suspend` joggal a felfüggesztés megy, a
   megvonás nem. A `revokeMembership` innentől `alter_right` hatáskört kér, FAIL-CLOSED: eljáró alany
   nélkül `actor_missing`, hatáskör nélkül `authority_not_established` — nevezett elutasítással.
   **Ez a saját gap-szövegünk teljesítése:** „a `revokeMembership` ma nem kérdez hatáskört a
   HÍVÓTÓL — tehát bárki »megvonhatna«".
2. **A BEJELENTÉS-ÚT — nyitott, semleges, korlátozott** (`submitClaim` + `claim` / `claim_intake`).
   Bárki beadhat (a még nem igazolt panaszos is), a nyugta BÁJTRA azonos akkor is, ha a hivatkozott
   könyv nem létezik, és beadónkénti visszaélés-korlát védi. A jelzés SEMMILYEN jogot nem mozdít:
   mérve, hogy a bejelentés előtti és utáni tagsági sor azonos, és a bejelentő UTÁNA sem kap
   hatáskört.
3. **A JELZÉS NEM AD OLVASÁST** (`readClaim`, REV-N3b) — és a bejelentés-út ÉLESÍTÉSÉVEL EGYÜTT
   került be, nem utána: visszavonható ENGEDÉLYT lehet építeni, visszavonható MEGISMERÉST nem
   (KUKA-085 · KUKA-077). A nemleges válasz BÁJTRA azonos a nem létező ügyével — se hibakód, se
   mondat nem különböztet (KUKA-084). **Ellenpár:** a HATÁSKÖRÖS elbíráló LÁTJA, és az elbírálás
   önmagában NEM változtat jogot.

**MIÉRT EGYSZERRE.** A saját REV-N3c gap-szövegünk mondta ki: hatáskör nélkül a bejelentés jogot
mozdítana, bejelentés nélkül a hatáskör elfojtja a jelzést — tehát a kettő külön-külön félrevezető.

**A BIZONYÍTÉK.** Két új próba, HÁROM külön állítással (mert egy több-állításos próba összesített
bukása nem igazolja mindegyik klauzulát — R55/F02, KUKA-039), és hat mutáció: M50 a
hatáskör-ellenőrzés kivétele · M51 a művelet-szűkítés kivétele · M52 a jelzés-út hatáskörhöz kötése
(ez a REV-N3c-t buktatja, tehát ELLENPÁR is) · M53 az olvasás-kapu kivétele · M54 a hibakód
megkülönböztetése · M55 a semleges nyugta elárulja, létezik-e a könyv. Mind a hat NÉV SZERINT abból a
tervből jön, amit az R60 ELŐRE leírt. **Mérve: 6/18 klauzula-sor FEDETT (volt: 3).**

**req-1 → req-2.** A bővítés TUDATOS lépés (KUKA-045), és a feltételét az R60 előre kimondta: „mind
a három klauzulának van olyan mutációs bizonyítéka, ami a SAJÁT deklarált állítását buktatja meg".
MÉRVE teljesült (REV-N3a ⇒ M50 · REV-N3b ⇒ M53 · REV-N3c ⇒ M50), tehát a kötelező készlet hatra nőtt,
és a hiányuk innentől FUTÁSI HIBA. A KÖVETKEZŐ csomag (`req-3`) ITT, ELŐRE rögzül: **REV-N5a/b/c** —
a célzott tiltás —, élethelyzettel, mérendő tulajdonsággal és bizonyítási tervvel, mielőtt egyetlen
sor kód megszületne hozzá.

**AMIT NEM TETTEM MEG, ÉS MIÉRT.** A terv 3. lépése a TARTALMI jóváhagyás (content-review-2 rekord)
mind a három klauzulára. Ezt **nem adom ki saját magamnak**: a rekord `reviewer.independent_of`
mezőt kér, és egy olyan felülvizsgálat, amit a megvalósítás szerzője ír a saját munkájáról, épp azt
a függetlenséget hazudná, amiért a mechanizmus létezik (KUKA-050). Az OB-7 ma MIND a 18 klauzulán
nyitott. A rekord tárgya, mérendő tulajdonsága és bizonyíték-hivatkozásai ELŐ VANNAK KÉSZÍTVE (a
próbák és a mutációk azonosítói feloldhatók) — a felülvizsgálatot a független ellenőrző féltől kérem.


---

## D-VS-3015 — A FÁZIS-KÉPESSÉG TANÚJA A V3 OLDALON, és a négy R63-as tanulság a regiszterben

- **Date:** 2026-09-12 · Lane: Claude-v3 (PR-VS-300 / CMD-VS-300-002-001, R63→R64) · **forrás:** a
  külső ellenőrző fél (chatgpt-v3) R63 §5: *„Legyen hitelesen vezetett fázis/képességállapot és géppel
  értékelhető feltétel, ismeretlen állapotra lezárást tiltó eredménnyel. … A fázisváltást a módosító
  agent feladata legyen rögzíteni és az őr feladata ellenőrizni; az operátor ne emlékeztesse rá."*
- **Gépi jel:** `npm run verify:capability-witness` (**ÚJ**, a söprés része — a söprés 7 → 8 verifier).

**A MUNKAMEGOSZTÁS KIMONDVA.** A board mátrixa fázis-KÉPESSÉGEKRE hivatkozik (CAP-01, a V2 repóban),
és a képesség állapota dönti el, hogy egy tétel nem-releváns, mérendő, vagy egyáltalán nem zárható le.
A képességek TANÚJA viszont ITT él: a board szolgáltatás a V3 lemezét nem látja. Ezt nem hallgatjuk el
és nem is állítunk mérést oda, ahol nincs (KUKA-089) — a board regisztere kimondja, HOL mérhető a tanú
(`witness_repo` + `witness_command`), a mérést pedig ez az őr végzi el: minden mérhető képességnél a
tanút, és ha a board regisztere elérhető (`V2_REPO_ROOT`), a RÖGZÍTETT állapotot a MÉRTHEZ hasonlítja.
Az elavult rögzítés PIROS.

**A SAJÁT ŐRÖM AZ ELSŐ FUTÁSÁN A SAJÁT SZABÁLYOM HIBÁJÁT TALÁLTA MEG.** A `v3-ui-slice` tanúja között
szerepelt „bármely HTML-lap", és az őr a `docs/_olvashato/` alatti SZÁRMAZTATOTT doksi-HTML-eket
felületnek nézte: a képességet `present`-nek mérte, tehát egy szabályos állapotot jelentett hibának
(KUKA-049). A javítás iránya nem a mappa-név betiltása volt: **megkérdezzük a gitet, mit tart számon**
(`git ls-files`) — a származtatott kimenet definíció szerint ignorált, tehát a tanú-halmazba be sem
kerül (KUKA-057: megengedő szabály, nem kizáró felsorolás). Ahol a git nem elérhető, a tartalék fa-járás
fut, és a riport KIMONDJA, hogy a mérés ilyenkor gyengébb.

**AMIT GÉPILEG NEM TUDUNK MÉRNI, AZT KIMONDJUK.** A tizenhárom V3-képességből tizenegynek van
fájl-szintű tanúja; kettőnek (`v3-user-capability` · `v3-personal-data-path`) nincs, mert a „használható
képesség" és a „valódi vs. fixtúra személyes adat" között fájl-szinten nincs különbség — ezt az azt
megépítő sáv mondja ki, nem egy minta-illesztés (KUKA-035). A riport ezt NEVEZETT kihagyásként írja ki,
nem hallgatja el.

**A NÉGY R63-AS TANULSÁG** (KUKA-114 · KUKA-115 · KUKA-116 · KUKA-117) ebbe a regiszterbe került —
a regiszter 113 → **117 bejegyzés** —, a `guardHome` plafon pedig 86 → **90**, mert mind a négy jel a
BOARD-hoz tapad, és a V3-nak nincs boardja. A tanulságok tartalma és a hozzájuk tartozó V2-oldali
gépi jelek a V2 repó `DECISION_LOG.md`-jében, **D-VS-686** alatt állnak.

## D-VS-3014 — A FELOLDÁS EXPLICIT ÁLLAPOT · a részletes eredmény a bizonyíték · és a kulcs EGY otthona

- **Date:** 2026-09-12 · Lane: Claude-v3 (PR-VS-300 / STEP-002 / CMD-001, R61) · **forrás:** a KÜLSŐ
  ELLENŐRZŐ FÉL (chatgpt-v3) R61-es programja és lapja, az operátor hozta át

A kör **V2-repóban** végzett munkája (board-profil · figyelő-lefedettség · a `tests_run` kapu) a másik
napló **D-VS-680** bejegyzésében áll. Itt a V3 magreferencia változásai.

### 0. ELŐBB REPRODUKÁLÁS, UTÁNA JAVÍTÁS (KUKA-030)

Az ő programjukat (`r61_chatgpt-v3.mjs`, 4005 bájt, 4 eset) VÁLTOZATLANUL a repóba tettem
(`v3ref/external-checks/`), és lefuttattam, MIELŐTT bármihez nyúltam:

| eset | reprodukált állapot |
|---|---|
| **P03** (pozitív ellenpár) | ✓ zöld — a helyes rekord `current` |
| **R01** | ✗ a katalógus HIÁNYA némán átengedte a kitalált próba-nevet |
| **R02** | ✗ a dokumentum-hivatkozás két szabad szöveg volt, semmit nem oldott fel |
| **R03** | ✗ egyetlen végrehajtható bizonyíték nélkül is `current` lett |

### 1. F01 — a feloldás EXPLICIT állapot (**KUKA-111**)

**A hiba.** `if (catalog && catalog.assertions && …)` — aki nem adott feloldó-katalógust, annál a
feloldás elmaradt. Ez **betűre ugyanaz a hiba-osztály, amit a KUKA-108-ban egy körrel korábban éppen
én zártam le** — csak most a SAJÁT ÚJ ŐRÖMBE írtam bele.

**A javítás első alakja a MÁSIK irányba bukott:** mind a három katalógus-részt feltétel nélkül
megköveteltem, és ezzel az ő JOGOS P03 esetüket vittem pirosra (KUKA-049). A végleges alak:

- `needs(part, name)` — a követelmény a hivatkozás FAJTÁJA szerint szól;
- `resolutionCatalogShape(catalog, kindsUsed)` — csak a ténylegesen HASZNÁLT fajtákra mér;
- `document` hivatkozás: `{document, digest, note}`, a MÉRT artefaktum-katalógushoz oldva
  (`sourceDocumentCatalog()` a `normContract.mjs`-ben — `R32_board_v1.md`, 61040 bájt, visszamért
  lenyomattal; hálózat nélkül);
- `EXECUTABLE_REF_KINDS` — legalább EGY végrehajtható (próba vagy mutáció) hivatkozás kötelező;
- **HATODIK állapot: `unresolved`** — a feloldhatatlanság nem néma zöld, és nem is a hibás alakkal
  (`invalid`) összemosva.

### 2. F02 — a stdout nem bizonyíték

A külső futtató (EXT-01) eddig a folyó kimenetet is elfogadhatta végeredményként. Mostantól **a FÁJL
az ítélet**: `auditEvidenceArtifact()` megköveteli, hogy a részletes eredmény-állomány létezzen,
értelmezhető legyen, hordozza a deklarált kötés-mezőt a staged commithez, és ne mondjon ellent a
stdoutnak — az utóbbi csak diagnosztika és elcsúszás-jelző.

### 3. **KUKA-113** — a nyers vezérlő-karakter a forrásban

A próba↔állítás összetett kulcsot KÉT hely építette, és az olvasó oldalon a szeparátor NYERS NUL
bájtként állt a forrásban. Funkcionálisan minden működött; a `norms.mjs` viszont **bináris fájllá
vált**: a kereső „binary file matches"-t mondott a tartalma helyett, és a saját, KUKA-hivatkozásokat
kereső mérésem sem látott bele. Helyette EGY nevezett kulcs-építő — `assertionKey(probe, assertion)` —,
amit az ÍRÓ (`run.mjs` katalógus) és az OLVASÓ (`norms.mjs` feloldó) egyaránt HÍV, menekülő alakkal.

### Gépi jelek

| jel | eredmény |
|---|---|
| `npm run verify:v3ref` | **28/28 PASS** · minden veszélyes mutáció a nevezett állítással észlelt · `P-NORM-evidence` 28 norma-kapu (n0–n28) |
| `npm run verify:external-checks` | **5/5 program MEGFELEL · 27 eset · hatókör: full** — köztük az ő R61-es programjuk mind a négy esete |
| `npm run verify:kuka` | **217/217 PASS** · 113 tanulság · őr-otthon: 25 `v3` · 86 `vs` (padló 86) · 2 nevezetten jel nélküli |

**Visszacsúszás-próba, mind PIROS:** a nyers vezérlő-karakter visszatérése · a szeparátor kézi
legépelése a katalógus-építőben · a feltételes katalógus-követelmény visszaállítása.

### Tanulságok (a regiszterbe és a CLAUDE.md-be is bekerült)

- **KUKA-111** — a feltételes követelmény nem követelmény; és a tükör-kérdés („ez a szigorítás
  elutasítja-e a HELYES esetet?") ugyanolyan kötelező, ezért kell minden kapuhoz JOGOS POZITÍV eset,
  lehetőleg a másik fél sajátja.
- **KUKA-112** (a jele a V2 repóban fut, lásd D-VS-680) — a sikeres lefutás és a lefutás két külön tény.
- **KUKA-113** — a forrás olvashatósága a helyesség része; az összetett kulcs szeparátora szerződés,
  nem stílus.


## D-VS-3013 — Az R59 négy tétele javítva: a hiány nem felmentés

**Kör:** CMD-VS-300-002-001 R59→R60 · sáv: **Claude-v3** · a külső fél (**chatgpt-v3**) független
ellenőrzése az R58-ra.

**A bemenet MÉRVE, nem rekonstruálva.** Az ő programjukat (`v3ref/external-checks/r59_chatgpt-v3.mjs`,
változatlanul, ahogy a boardon érkezett) a javítások ELŐTT futtattuk le: **P01 ✓ · P02 ✓ · E05 ✗ ·
E06 ✗ · E07 ✗ · E08 ✗ · E09 ✗**. Mind az öt leletet kódon reprodukáltuk, mielőtt bármihez hozzányúltunk
(KUKA-030). A javítás után ugyanaz a program, ugyanazon a gépen: **7/7 MEGFELEL**.

### R59-F01 — a kapu FELTÉTELESEN hasonlított

Az R57-ben behozott „az elvárt érték a szülőtől jön" javítás mezőnként, `if (expectation.base_digest
&& …)` alakban hasonlított. Ha az elvárt MEZŐ hiányzott, az összehasonlítás elmaradt — és mivel az
üres `{}` is objektum, a „van-e elvárás?" őr átengedte. Ugyanez a `verdict` és a `probe_status`
mezőkre. → **KUKA-108**

**Javítás:** `expectationShape` NEVEZETT feloldó ELŐFELTÉTELKÉNT (érvényes `sha256:` alaplenyomat ·
nem üres `run_tokens` és `mutated_digests`), a mutációnkénti keresés SAJÁT kulcson, és a csomag
`verdict`/`probe_status`/`failed_assertions` mezője KÖTELEZŐ és típusos (`requiredText`) — a hiány,
a null, az üres és az ellentmondás MEGKÜLÖNBÖZTETHETŐ hibát kap. A manifest állítás-készlete a kapu
HATÁRÁN kötelező, nem a belsejében feltételes.

### R59-F02 — a futtató a bemenetéből vette a mércét

Az EXT-01 futtató (a MI R58-as átadhatósági válaszunk) azt kérdezte, hogy a kapott esetek zöldek-e —
azt nem, hogy MELYEK jöttek meg. Egyetlen `{id:"T01",pass:true}` sorra „MEGFELEL"; kilenc darab
ugyanolyanra is. → **KUKA-109**

**Javítás:** EXT-02 eset-manifeszt KÜLÖN modulban (`v3ref/external-checks/case-manifest.mjs`), hogy a
mérés HÍVHATÓ legyen, ne forrás-olvasás (KUKA-009). Minden program mellett a várt eset-lista ÉS annak
FORRÁSA (`cases_source` — a külső fél kísérő lapja, illetve a saját körünk jegyzőkönyve; **nem egy
lefutás**, mert az önmagát igazolná vissza). Az `auditCases` mindkét irányt méri: HIÁNYZÓ · ISMERETLEN
· DUPLIKÁLT · ROSSZ ALAKÚ (a `pass` szigorúan logikai) · ELBUKOTT. A `runScope` a hatókört a GÉPI
kimenetbe is beírja (`scope` · `verdict.complete_evidence`) — a `--only` futás soha nem a lánc teljes
bizonyítéka. És a futtató maga is a lemásolt forrás része lett, hogy a másolatban futó futtatót az ő
E08 esetük megmérhesse.

### R59-F03 — a `!!mező` mint típus-ellenőrzés

A KUKA-105 javítása a HIÁNYT zárta le, az ÜRESSÉGET nem: `reviewer:{id:[],role:{}}`, `at:"not-a-date"`,
`situation:[]` — minden „truthy", tehát a rekord teljesnek számított és `current` lett. → **KUKA-110**

**Javítás:** típusos, VERZIÓZOTT rekord (`content-review-2`): mezőnként nem üres szöveg, szigorú
időbélyeg (kanonikus ISO-8601 visszaírhatóság + nem lehet a jövőben), és FELOLDHATÓ bizonyíték-
hivatkozások (`probe`+`assertion` a manifesthez · `mutation` a regiszterhez · `document` hellyel és
állítással). ÖTÖDIK állapot: **`invalid`** — a hiány és a rossz alak két külön válasz, mert két külön
teendő tartozik hozzájuk. **És a HITELESSÉG külön tengely** (`authenticity`), ami minden válaszban ott
áll, ma nemlegesen: a `current` a struktúrára és a kötésre mond igent, az elfogadás hitelességére
soha. A saját `reviewer.id` továbbra is ÁLLÍTÁS — ezt most a válasz maga mondja ki, nem egy komment.

### R59 §5.1 — a REV-N3a szövegütközése

A REV-N3a azt is a hatáskörhöz kötötte, hogy valaki KIFOGÁST KEZDEMÉNYEZZEN — szemben a saját
REV-N3c-nkkel, ami a jelzés útját kifejezetten nyitva tartja a még nem igazolt panaszosnak. Két
klauzula ugyanarról a műveletről, ellentétesen.

**Javítás:** a külső fél javasolt szövege BETŰRE átvéve: *„A jog felfüggesztését vagy megvonását, a
kifogás érdemi elbírálását és az abból következő jogváltoztatást csak az adott műveletre ellenőrzött
hatáskörű alany végezheti. A jelzés fogadása külön művelet; arra az N3b és N3c irányadó."* Az
elhatárolást a SZÖVEG mondja ki, nem a kommentár (KUKA-004). Következmény: az index-lenyomat változott
(`sha256:14bdcf7a…` → `sha256:61ea6a05…`) — ez helyes, és minden rá szóló jóváhagyást elavulttá tenne,
ha volna ilyen (ma nincs).

**A KÖVETKEZŐ KÖTELEZŐ CSOMAG ELŐRE LESZÖGEZVE** (`NEXT_REQUIRED_EVIDENCE`, `req-2`, vállalva R60-ban):
REV-N3a · REV-N3b · REV-N3c, NÉGY lépéses, számozott sorrendben, mindegyikhez MOST leírt élethelyzettel,
mérendő tulajdonsággal és bizonyítási tervvel — mielőtt egyetlen sor kód megszületne hozzá (KUKA-054:
utólag a mérce a megépült dologhoz igazodna). A sorrend nem tetszőleges: az 1. lépés a hatáskör-modell
ÉS a jelzés-fogadó út EGYÜTT (külön-külön mindkettő félrevezető, ahogy a saját gap-szövegünk kimondja),
a 2. pedig az olvasás-tilalom, a bejelentés-út ÉLESÍTÉSE ELŐTT (KUKA-085: visszavonható ENGEDÉLYT lehet
építeni, visszavonható MEGISMERÉST nem). A csomag a futás kimenetén LÁTSZIK, nem csak a kódban áll.

### Gépi jelek

- `npm run verify:v3ref` — `P-NORM-evidence` **26 → 28 ellen-vezérlés**: **n24** (hiányos elvárás mind
  a négy alakban, IDEGEN értékkel a csomagban) · **n25** (hiányzó ítélet / próba-állapot) · **n26**
  (örökölt kulcs · NULL · üres szöveg · nem-tömb bukott-lista) · **n27** (15 alak, köztük az ő E09
  csomagja betűre) · **n28** (a következő csomag létező klauzulákra mutat, 1..4 sorrend, érdemi
  élethelyzet/tulajdonság/terv mindegyiknél). A próba CÍMÉBŐL kikerült a kézzel léptetett „tizenkét"
  szám (KUKA-045) — a mért érték a `detail` sorban áll.
- `node v3ref/external-checks/run-all.mjs` — **4 program · 23 eset · teljes hatókör · MEGFELEL**.
  Az r59 felkerült a nyilvántartásba; a futtató minden programnál kiírja az ELVÁRT eset-listát és
  annak forrását.
- `npm run verify:kuka` — **208/208**, 110 bejegyzés (23 v3-otthonú · 85 v2-otthonú, padló 85 ·
  2 kimondottan jel nélküli).
- `npm run verify:sweep` — **7 verifier · 7 zöld · 0 env-kihagyás**.

### Ami NEM lett kész, és kimondjuk

A 18 klauzulából ma is **3 fedett** (`req-1`), a többi nyitott — ezt a futás névvel sorolja fel. A
tartalmi jóváhagyás mind a 18 klauzulán `none`: a GÉPEZET készen áll (immár típusosan, verziózva,
feloldható hivatkozásokkal), a TARTALOM nincs meg. És a hitelesség tengelye ma `unauthenticated`:
a rendszer nem tudja igazolni, hogy a `reviewer.id` mögött valóban az az ember áll — ezt most már
minden válasz kimondja, ahelyett hogy a `current` szó elnyelné.

---

## D-VS-3012 — Az R57 három lelete javítva: a bizonyíték nem igazolhatja önmagát

**Kör:** CMD-VS-300-002-001 R57→R58 · sáv: **Claude-v3** (az R57-ig `Claude-AUX`) · a külső fél
(**chatgpt-v3**, az R57-ig `ChatGPT`) független ellenőrzése az R56-ra.

**A bemenet MÉRVE, nem rekonstruálva.** Az R57 programja a saját gépünkön **9/9 MEGFELEL**
eredménnyel futott le — de ez a javítások UTÁNI állapot; a leletek a javítás ELŐTT valósak voltak,
és mind a hármat kódon reprodukáltuk. A külső fél öt pecsét-állításunkat (T01–T05) megerősítette, és
négy ponton (E01–E04) MEGCÁFOLT.

### R57-F02 — a kapu az ellenőrzött csomagtól kérdezte meg, mihez mérje

A `falsificationQualifies` a csomag `mutated_digest` mezőjét **ugyanannak a csomagnak** a
`base_digest` mezőjéhez mérte, és a `run_token`-t is a csomagból fogadta el. Egy önmagában
következetes, de KITALÁLT csomag ezért átment. → **KUKA-103**

**Javítás:** az elvárt érték a SZÜLŐ futási környezetéből jön (`expectation.base_digest` ·
`run_tokens[mutation_id]` · `mutated_digests[mutation_id]`), és **hiányában a kapu fail-closed**.
Mellé három független feltétel: a mutáció a REGISZTERBEN van · az állítást a MANIFEST kiadja · a
csomag önmagával nem mond ellent (`verdict` ⇄ `probe_status`).

**Ami ebből következett — és amit külön ki kell mondani:** a szigorítás PIROSRA vitte a saját
`P-NORM-evidence` próbánkat, mert annak szintetikus csomagjai kitalált mutáció-azonosítókkal
dolgoztak. A próbát a VALÓDI szerződéshez kötöttük újra (igazi regiszter-mutációk + egy
`EXPECT` objektum), nem a kaput lazítottuk vissza.

### R57-F01 — a kapu kimondta az eltérést, és NULLÁVAL zárt

A battéria a képernyőn kiírta, mely klauzulák maradtak `not_falsified`, de a kilépési kódja ettől
független volt; és kötelező bizonyíték-KÉSZLET nem is létezett. → **KUKA-104**

**Javítás:** `REQUIRED_EVIDENCE` (`req-1`: REV-N1a · REV-N1b · ORG-N2a), FÁZIS-FÜGGŐ elvárt
állapottal (magpróbán `falsification_pending` elég, battérián `covered` kell), és a `clean`
minősítés feltétele kimondottan tartalmazza a `required.ok`-t — tehát a kilépési kód a kimondott
ítéletet hordozza. A hiányt a futás NÉVVEL sorolja fel (`why[]`).

### R57-F03 — a tartalmi jóváhagyás puszta hashekből

A `content_review` `current`-nek számított, ha a lenyomatok egyeztek: felülvizsgáló, időpont,
bizonyíték és maradék nélkül. → **KUKA-105**

**Javítás:** `CONTENT_REVIEW_REQUIRED` — 11 kötelező mező, és NÉGY állapot: `none` · `incomplete`
(a hiányzó mezők NEVÉVEL) · `stale` (az elcsúszott lenyomatokéval) · `current`.

### Az R32-kötés nevezett hiánya BEZÁRULT

A KUKA-101 kimondott hiánya (`source_document.text_digest: null`) megszűnt: a normaszöveg
bájtazonos másolata a repóban áll (`v3ref/source-documents/R32_board_v1.md`, 61 040 bájt), és a
`text_digest` **mérve** születik a fájl bájtjaiból — betöltéskor az elvárthoz hasonlítva, romlásnál
`NORM_SOURCE_ARTIFACT_MISMATCH`, hiányzó fájlnál `NORM_SOURCE_ARTIFACT_MISSING`. A külső fél
kimondott feltétele volt, hogy ez **ne bemásolt konstans** legyen. A KUKA-101 szövege és a CLAUDE.md
sora ezzel együtt frissült (KUKA-050: a szöveg a valóságot követi).

### ÁTADHATÓSÁG — a programok a repóba, egy paranccsal futtathatóan

Az R57 §7 követelménye. A külső fél az R57-ben SAJÁT rekonstrukciót futtatott, mert a hivatkozott
programokat a megadott commit fájlfájában nem találta — ez a mi mulasztásunk volt (KUKA-079). Ezért:
`v3ref/external-checks/` (a külső fél R57-es programja + a mi két újrafogalmazott programunk,
mindhárom VÁLTOZATLANUL, a szerző megnevezve) + `run-all.mjs`, ami a környezetet maga rakja össze
(`source/` · `source-manifest.json` · `evidence/`), a gépi eredményt a `results/` alá teszi, és
**nem-nulla kóddal zár**, ha bármelyik eset elbukik. Mindkét irány mérve: érintetlen forráson
3/3 program · 16/16 eset · kilépés 0 — szándékosan eltört magpróbán kilépés 1. A bemondott commit
itt is ÁLLÍTÁS: ha a lemásolt forráson nem-könyvelt változás áll, a futtató `+uncommitted` jelöléssel
és a fájlok felsorolásával mondja ki (R45 P01 / KUKA-056).

### Sáv-átnevezés

Operátori parancs: `Claude-AUX → Claude-v3` · `ChatGPT → chatgpt-v3` · a V2 sáv `Claude-DEV →
Claude-v2` · `chatgpt-v2`. A V2 oldalán ez nem átnevezés, hanem REGISZTER lett (LANE-01,
D-VS-675): egy forrás, két testvér-feloldó, generált adatbázis-normalizálás, és a régi nevek
**aliasok** — a külső fél a mi átnevezésünkről nem tud, ezért a régi néven érkező hívást elfogadjuk
és a mai névre fordítjuk (KUKA-081 · KUKA-064).

### Mit nem kapott KUKA-számot, és miért

A kör során három SAJÁT hibám bukott ki, mindhárom egy MÁR MEGLÉVŐ bejegyzés visszatérése, nem új
minta — ezért nem kapnak új számot, de itt ki vannak mondva: (1) a sáv-verifier történet-padlóját
100-ra **tippeltem**, a mérés 18-at adott (KUKA-045); (2) a gépi eredmény kiírásánál egy `resolve`
nevű, nem létező nevet hívtam, amit a szintaxis-ellenőrzés nem lát (KUKA-044); (3) a döntési számot
a kör ELEJÉN mértem szabadnak, a másik sáv közben elvitte — a szám ellenőrzése a **PUSH pillanatában**
érvényes, nem a kör elején (a lecke a V2 sávnak írt levél §6c pontjába került; gépi jele
`verify:decision-numbers` már van, a hiba a HASZNÁLAT idejében volt).

**Mérés a kör végén:** magreferencia **28/28** · mutációs battéria **46/46 észlelt**, 8/8
hazugság-próba, `3/3 kötelező klauzula fedve` · a külső fél programja **9/9** · külső futtató
**3/3 program** · `verify:kuka` **191/191**.

---

## D-VS-3011 — Az R55 hat lelete javítva: a pecsét minden írási úton, és a bizonyíték MÉRÉS

**Kör:** CMD-VS-300-002-001 R55→R56 · sáv: Claude-AUX · a külső fél független ellenőrzése az
R54-re, kilenc érdemi elvárással és egy diagnosztikával.

**A bemenet.** Az R55 programja a saját gépünkön KARAKTERRE reprodukált: **3 teljesült, 6 nem**,
plusz a D01 diagnosztika. Mind a hatot javítottuk. A külső fél elfogadta a G01/G02-t (az R54-es
újrafogalmazott F03) és az F03 mérési hibájának feltárását.

### R55-F01 — a pecsét sorcserével felülírható volt

Az R54-es „append-only" két őrön állt: BEFORE UPDATE és BEFORE DELETE a pecsét-táblán. Két rendes
DML-írás átment rajta, séma- vagy triggerletiltás nélkül:

- **S01** — `INSERT OR REPLACE INTO invite_terms … SELECT … FROM invite`: a REPLACE a régi sort
  TÖRLI és újat ír, a törlés BEFORE DELETE triggerét viszont az SQLite csak bekapcsolt
  `recursive_triggers` mellett futtatja — a kapcsolat alapértéke KI.
- **S02** — `INSERT OR REPLACE INTO invite` ugyanazzal a tokennel, `admin` szereppel.

**Mindkét beváltás sikeres volt, és ADMIN tagságot adott a `user` ajánlatra.** → **KUKA-098**.

**Javítás:** négy őr, mindegyik a BESZÚRÁS oldaláról is zár, tehát pragmától FÜGGETLENÜL —
`invite_terms_no_reseal` · `invite_no_change_sealed` (a KIADOTT mezők nem módosulnak, a
`redeemed_at` igen: az ÉLETCIKLUS külön tengely) · `invite_no_reissue` · `invite_no_delete_sealed`.
Az `openStore` beállítja ÉS visszaolvassa a `recursive_triggers`-t, nevezett hibakóddal áll meg.
A második réteg (beváltás-kori pecsét-összevetés) megmarad, és őrök NÉLKÜLI tárolón külön mérve.

### R55-F02 — a múlt darabszáma megmaradt, a tartalma nem

A Y4 ág `count(*)` értékeket hasonlított. Ha a megvonás ugyanazt a sort MÁS TARTALOMMAL hagyja ott
(`resolved_json` → `{"tampered":true}`), a szám stimmel, az állítás igaz marad, a battéria zöld.
→ **KUKA-099**.

**Javítás:** `auditSnapshot` + `priorRowsSurvive` — a KORÁBBI sorok mindegyike változatlanul,
EGÉSZBEN hasonlítva (így a törlés, a tartalom-átírás és az azonos darabszámú sor-csere egyszerre
fogva), miközben az ÚJ, szabályos audit-bejegyzés hozzáfűzése MEGENGEDETT (pozitív kontroll a
próbában). Három új visszabontási kontroll: **M47** törlés · **M48** tartalom-átírás · **M49**
azonos darabszámú sor-csere.

### R55-F03 — a mutáció NEVE nem a klauzula ellenbizonyítéka

Két lelet egy helyen: **N01** — két, SOHA NEM FUTTATOTT `{id, catcher}` bejegyzés mellett a kapu
mindhárom klauzulát `covered`-nek mondta; **N04** — az M32 KÉT klauzulához volt beírva, de a futása
csak az `A-REV-N1a` állítást buktatja. → **KUKA-100**.

**Javítás:** `falsificationQualifies` — egy mutációs eredmény csak akkor bizonyíték, ha az
alkalmazás igazolt, az alap- és a mutált forrás MÉRT lenyomata megvan és KÜLÖNBÖZIK, van futás-jel,
a NEVEZETT próbáról szól, és a HAMISRA fordult állítások között ott van ÉPP EZ. A referencia-futás
— ami a battéria ELŐTT fut — `falsification_pending` állapotot ad, nem `covered`; a végleges
minősítés a battéria után születik. Az ismétlődő állítás-azonosító integritási hiba (N02), akkor is,
ha a két érték egyforma.

**Mért eredmény:** a REV-N1b visszabontási bizonyítéka ma az **M47**, nem az M32.

### R55-F04 — a szerződés lenyomata nem a szerződésből készült

A `norm_contract.digest` a MI indexünk mezőiből képződött; a K01 címét átírva változatlan maradt
(D01). → **KUKA-101**.

**Javítás:** a kanonikus szerződés saját otthont kapott (`v3ref/normContract.mjs`, NCT-01),
`contractDigest` a SAJÁT bájtjaiból; az index külön `indexDigest`-et kap és hivatkozik a szerződés
verziójára és lenyomatára; `clauseDigest` + `contentReviewState` — a tartalmi jóváhagyás a KONKRÉT
lenyomatokhoz kötődik, és bármelyik változása ELAVULTTÁ teszi (ma mind a 18 klauzula `none`).
**Kimondott hiány:** a K01–K16 teljes szövege a külső félnél él, ezért a `source_document.
text_digest` NULL, nevezett hiánnyal — nem pótoljuk egy hihető hash-sel.

### A saját lelet: a próbához igazított határ

Az R54-ben kiírtam az indokot, amiért az élő sor UPDATE-jét nem tiltom: „elbuktatná a külső fél
saját próbáit". A külső fél ezt VISSZAVONTA, és igaza van. → **KUKA-102**. A szigorúbb határ
bevezetésekor valóban elavult három korábbi eset (R49/C11 · R51/N10 · R53/F01) — mindhárom azért,
mert a veszélyes írás ma már LÉTRE SEM JÖN. Egyiket sem kerültük meg: mindháromhoz átadható
ÚJRAFOGALMAZÁS készült, ellenpárral, és mind a három **megfelel**.

### §7 — a két fogalmi korrekció átvéve a regiszterbe

- **REV-N3** újraszövegezve: a BEJELENTÉS és a JOG MEGVÁLTOZTATÁSA két külön művelet. Új klauzula
  (**REV-N3c**): a bejelentés útja a még nem igazolt panaszosnak is nyitva áll — semleges válasszal
  és visszaélés-korláttal; a jelzés nem művelet a jogon.
- **REV-N5** újraszövegezve: a tiltás HATÓKÖRE az OKÁBÓL származik. A régi mondat feltétel nélkül
  állította, hogy a független könyvet nem érinti — ez kompromittált HITELESÍTŐNÉL téves. Új
  klauzulák: **REV-N5b** (hét nevezett tiltás-fajta, az ok választ) és **REV-N5c** (a könyv és a
  többi jogosult joga nem törlődik).

**Mérés a kör végén:** referencia **28/28 PASS** (két új próba: `P-INVITE-seal`, és a bővített
`P-NORM-evidence` tizenkét támadással) · mutáció **46/46 elkapva**, 0 túlélő, 8/8
hazugság-ellenpróba, falióra 2,8–4,9 mp · az ő programjaik: R49 **29/30**, R51 **13/14**, R53
**3/4**, R55 **8/10** — a hiányzó öt eset MIND az elavult alak (lásd fent), újrafogalmazva **5/5** és
**2/2** · `verify:kuka` **180/180** · söprés **6/6 zöld**.

**Kimondva:** a `3/16` (ma 3/18) arány EBBEN a részindexben értelmezendő — NEM a teljes K01–K16 mag
készültségi aránya. Az alap nincs lezárva; a mini üzleti modulok kapuja zárva marad.

---

## D-VS-3010 — Az R53 négy lelete javítva: a kiadott meghívó pecsétje és a NORMA-BIZONYÍTÉK lánc

**Kör:** CMD-VS-300-002-001 R53→R54 · sáv: Claude-AUX · a külső fél független ellenőrzése az
R52-re, négy célzott ellenpróbával.

**A bemenet.** A mi R49-es harminc esetünk náluk 30/30, az R51-es tizennégy 14/14, a referencia
26/26 PASS, a mutációs futás 43/43. Az ÚJ négyből **egy sem felelt meg** — mind a négyet
reprodukáltuk.

### F01 — a KIADOTT meghívó helyben átírható volt

Az R52-es védelmünk a beváltás KÉT OLVASÁSA KÖZÖTTI változást fogta meg. Ha a sort KORÁBBAN írták
át, mindkét olvasás már az átírt értéket látta: `user` meghívóból **admin tagság** lett. Ez
TOCTOU-védelem volt, nem a kiadott ajánlat változtathatatlansága.

**Javítás:** a kiadáskor `AFTER INSERT` trigger PECSÉTELI a feltételeket egy append-only
`invite_terms` táblába (UPDATE/DELETE trigger tiltja); a beváltás az `authoritativeInvite`
feloldón át a PECSÉTET olvassa, és eltérésnél `invite_terms_changed`. A kapu a CSATORNA-ellenőrzés
UTÁN áll: a pecsét-eltérés a meghívó ténye, azt csak a bizonyított címzett tudhatja meg
(KUKA-083/084).

### F02 — az `inviteTerms` ütköző összefűzése

Két külön feltétel-készlet azonos szöveget adott (`|` és `=` a mezőértékekben). **Javítás:** a
kézi összefűzés helyett a parancsazonosságnál már bevált, zárt, típusos `canonicalize`.

### F03 — a norma „megépült"-nek mondta magát idegen próbára

A régi kapu csak azt kérdezte, hogy a megadott PRÓBANÉV szerepel-e a tervezett készletben. A külső
fél a REV-N1-et az idegen, de létező `P-A04`-re kötötte át: `{"ok":true,"problems":[]}`. **A puszta
LÉTEZÉS nem bizonyíték arra, hogy AZT mérte** → **KUKA-038 VISSZATÉRT**.

**Javítás — a kötés iránya MEGFORDUL.** A norma NEM tárol próbanevet. A MANIFEST próbarekordja
deklarálja, melyik atomi klauzulát melyik ÁLLÍTÁSSAL váltja be (`discharges`), a próba pedig
futásidőben KIADJA az állítás-azonosítóit (`asserts`). Egy klauzula csak akkor fedett, ha
(1) legalább egy manifest-próba deklarálja · (2) MINDEN deklaráló próba rekordja PASS ebben a
futásban · (3) a deklarált állítást a próba tényleg kiadta és igaznak mérte · (4) van mutáció, ami
azt a próbát nevezi elkapónak. A `state` mező MEGSZŰNT: az állapot SZÁMOLÓDIK.

### F04 — a REV-N1 egyik felét senki nem mérte

A külső fél másolatában a megvonás KITÖRÖLTE a korábbi parancsokat, nyugtákat és kiadásokat — a
REV-N1-hez rendelt próba mégis PASS maradt, mert csak azt mérte, hogy megvonás UTÁN nincs ÚJ hatás.
**Egy fél feltételt zártam le, és a védelmet egészként jelentettem** → **KUKA-095 VISSZATÉRT**.

**Javítás:** a REV-N1 HÁROM atomi klauzula (N1a új művelet tiltva · N1b a korábbi esemény megmarad ·
N1c a joghatás külön felülvizsgálatban változhat — ez utóbbi KIMONDOTT hiány, mert más gépezetet
kíván). A `P-CMD-finalize-gate` negyedik ága (Y4) méri, hogy a megvonás után a `command`,
`command_event` és `disclosure` sorok VÁLTOZATLANUL megvannak — ellenpárral, hogy a megvonás hatni
is köteles. Az ő beavatkozásukon a próba bizonyítottan FAIL (`A-REV-N1b` hamis, `A-REV-N1a` igaz).

### A saját két leletünk ebben a körben

**KUKA-096 — a kapu, ami a saját mérését némította el.** A norma-kapu a JSON kiírása ELŐTT lépett ki
2-es kóddal. Az F04 ellenpróbája pontosan ilyen helyzetet állít elő, tehát az ő mérésük nem a bukott
próbát látta volna, hanem egy értelmezhetetlen, JSON nélküli kilépést. Innentől a bizonyíték ELŐBB
megy ki, a kilépési kód UTÁNA dönt; a szerkezeti hazugság (2-es) és a bizonyíték-hiány (1-es) két
külön kijárat.

**KUKA-097 — a kiírt, de nem mért idő-költségvetés.** A 27. próba felvételével a mutációs battéria
15 021 ms-ra nőtt: nálam zöld maradt, az ő harness-ükben IDŐTÚLLÉPÉS lett. A mérés szerint a költség
90%-a a TÁROLÓ FELÉPÍTÉSE volt (20 tárolón 510 ms; `journal_mode=MEMORY` + `synchronous=OFF`
mellett 28 ms) — majdnem a párhuzamosságot hangoltam tovább, mérés nélkül. Ma a falióra ŐRZÖTT: a
saját költségvetés a külső korlát 80%-a, és a `clean` feltétel része. Mért eredmény:
**21 799 ms → 2 012 ms**, változatlan kimenettel.

### §5 · §6 — egyetlen normatív alap és a REV-N1 újraszövegezése

- A futás EGYETLEN kanonikus norma-verziót közöl (`NORM_CONTRACT_VERSION`, a `NORM_VERSION` már nem
  kézzel írt szöveg, hanem ebből származik), mellette KÜLÖN, saját sémaverzióval a bizonyíték-index
  (`NRM-01` · `nrm-2`) és tartalmi lenyomat. Az `NRM-01` a K01–K16 **gépi bizonyíték-indexe** lett:
  minden klauzula megnevezi, melyik K-szabályt indexeli, és a K-szabály MONDATÁT nem ismétli meg.
- A `command.mjs` megcáfolt R50-kommentje **törölve**, a helyén a mai magyarázat áll, kimondva, hogy
  a kódba írt próza sem automatikusan norma.
- A REV-N1 az általuk javasolt szövegre cserélve („…joghatása külön, bizonyítékhoz és alkalmazandó
  profilhoz kötött felülvizsgálatban változhat, új korrekciós eseménnyel").
- A hat `planned` norma sorrendje az ő §7-ük szerint (REV-N3 → REV-N5 → REV-N2 → ORG-N1 → ORG-N3 →
  REV-N4) az `OB-5` lezárási feltételében rögzítve. Operátori döntést nem kértek, nem is kérünk.

### Az ellenpróba, amit MI adunk vissza

Az ő F03 esetük a mai forráson **más okból** zöld: a `probe:` mező, amit a programjuk szövegesen
cserél, MEGSZŰNT (ez volt az ő §4/2 kérésük), tehát a csere no-op, és a `pass` a régi hívási alak
fail-closed viselkedéséből jön. Ezt nem hallgatjuk el: az `f03-restated.mjs` a támadást a MAI
szerződésre fogalmazza újra (a MANIFESTBEN kötjük át a klauzulát az idegen `P-A04`-re) — végponttól
végpontig mérve **2-es kilépés**, és a lelet mindkét irányt megnevezi. Mellette kötelező ellenpár:
érintetlen forráson 0-s kód, a két klauzula fedett.

### Kimondott maradék

Az `OB-7` új blokkoló: a gépezet az ÁTKÖTÉST teszi lehetetlenné, a TARTALMI megfelelést nem tudja
igazolni. Aki egy idegen próbába beleírja a klauzula állítás-azonosítóját, azt a gép nem leplezi le
— a maradék szűkebb lett, de nem nulla, és emberi felülvizsgálat tárgya marad.

**Mérés a kör végén:** referencia **27/27 PASS** · mutáció **43/43 elkapva, 0 túlélő, 0 elavult
horgony, 8/8 hazugság-ellenpróba, falióra 2 012 ms** · az ő programjaik: R49 **30/30**, R51
**14/14**, R53 **4/4** · saját újrafogalmazott F03: **2/2** · `verify:kuka` **160/160**. A három
korlátozott erejű mutáció (M2 · M5 · M38) a futás kimenetén NÉV SZERINT és INDOKKAL látszik — az
elkapás és a bizonyíték ereje két külön tény.

---

## D-VS-3009 — Az R51 tíz lelete javítva; a megvonás és a szervezeti alap a normatív magba

**Kör:** CMD-VS-300-002-001 R51→R52 · sáv: Claude-AUX · a külső fél független ellenőrzése az
R50-re, tizennégy célzott ellenpróbával a JAVÍTÁSAINK VARRATAIN.

**A bemenet.** A ti R49-es harminc esetetek náluk is 30/30. Az ÚJ tizennégyből **négy megfelelt, tíz
nem**. Reprodukáltuk: **10/10, karakterre az ő eredményükkel.**

### A kör legsúlyosabb lelete: a SAJÁT ÁLLÍTÁSOM volt hamis

Az R50 §2.3-ban ezt írtam: *„Ugyanezt a három ágat végigmérve az ISMÉTLÉS és az OLVASÁS MÁR ZÁRVA
VAN — ezt kimondjuk, hogy a lelet ne legyen tágabb, mint amit mértünk."*

**Nem volt zárva.** Az N08/N09 a `store.tx` BELÉPÉSÉNÉL avatkozik be; ott az olvasás visszaadta a
védett `price: 100` tartalmat, az ismétlés a sikeres nyugtát, és mindkettő kiadási sort írt. Az ok:
a saját próbám Y2/Y3 ága a megvonást a HÍVÁS ELŐTT végezte — azt a tranzakción KÍVÜLI ellenőrzés
úgyis elkapja. **Gyengébb esetet mértem, és az erősebb állítást írtam le** — miközben a mondat, amivel
a hatókör-fegyelmemet dicsértem, pontosan ezt a hibát fedte el. → **KUKA-094**.

### A második: az egyik feltételt lezártam, és a védelmet jelentettem késznek

Az R50-es nyugta-könyv védelmét egyetlen mondattal adtam ki („a fajták regisztere ZÁRT"). Négy eset
mutatta meg, mi maradt nyitva MEGENGEDETT fajtanév mellett: árva nyugta nem létező parancsra (N03) ·
második nyugta ugyanarra (N04) · idegen hatásazonosító és lehetetlen állapot (N05) · **nulla soros
beszúrás**, amitől a parancs véglegesült, a válasz sikert mondott, és nyugta sehol nem keletkezett
(N02). → **KUKA-095**.

### A javítások — öt csoport

**J1 · A kiadás engedélyezési pontja a tranzakción BELÜL** (N08 · N09). EGY nevezett feloldó
(`releaseAllowed`), amit MIND A HÁROM kiadó ág hív. A próba mind a három ága UGYANAZT a
tx-belépési beavatkozást kapja, és az olvasó ág a TARTALOM hiányát is méri, nem csak a hibakódot.

**J2 · A meghívó döntése a FRISS sorhoz kötve** (N10 · N11). A feltételek VÁLTOZTATHATATLANOK
(`inviteTerms`, INV-05): ha a döntés és az írás nem ugyanarra a példányra vonatkozik,
`invite_terms_changed` — nem zsákutca, a mondat megmondja, hogy új meghívó kell. A KIMENET a
tranzakción BELÜL számolódik újra; minden írás a friss sorból dolgozik. A régi alak a friss soron
ELLENŐRZÖTT, de a RÉGI példány `admin` szerepét ÍRTA.

**J3 · A nyugta invariánsai kikényszerítve** (N02–N05). SÉMA: idegen kulcs a parancs elsődleges
kulcsára + egyediség a (parancs × esemény) páron. ÍRÓ: csak a véglegesítés tranzakciójából; a
hatásazonosító és az állapot a PARANCS SAJÁT sorához mérve; a beszúrás PONTOSAN egy sort ír.

**J4 · A kiadás nyoma és két fogalmi pontosítás** (N12). Sikeres leltár-írás nélkül a védett
tartalom NEM adható ki (`DISCLOSURE_NOT_LEDGERED`, a tranzakció visszagördül). Mellé a mezőút
TÍPUSOS és ÜTKÖZÉSMENTES lett (`k:` kulcs · `i:` index · `~0`/`~1` védés): az `{"a.b":…}` és az
`{"a":{"b":…}}` többé nem képződik egy útra — ezt nyitott adósságként közöltük, ők megcáfolták,
mert a kár MAGÁBAN A LELTÁRBAN van (incidensnél nem lehetne megmondani, melyik adat jutott ki).

**J5 · A futás azonosítása** (M01). A szülő a VALÓBAN előállított (mutált) forrás-csomagból számolja
az elvárt lenyomatot, és minden gyermeknek EGYEDI futás-jelet oszt ki; eltérés vagy hiány =
MÉRŐHIBA. Két új hazugság-ellenpróba méri (H08 idegen lenyomat · H09 korábbi futás jele).

### Két fogalmi állításunkat ők helyesbítették, és igazuk volt

1. **„a tény SEHOL nem hagyott nyomot"** — TÚL ERŐS. A `command` sor a végleges állapotot MÁR
   rögzítette; az eseménykönyv ettől még hasznos, de KÜLÖN megnevezett szerződésként, nem egy nem
   létező hiány pótlásaként.
2. **A kiadási leltár NEM „KI LÁTOTT" bizonyosság, és NEM csak a kérés előtt is álló adatra
   vonatkozik.** Azt rögzíti, mit ENGEDETT KI a rendszer — a frissen SZÁMOLT, idegen árakat
   felhasználó összesítés is védett adatkiadás. Ha ezt nem mondjuk ki, a következő számolt nézet
   kicsúszik a leltár alól.

### A NORMATÍV MAG — kódban, nem prózában

Új: `v3ref/norms.mjs` (NRM-01). A megvonás protokollja **öt nevezett szabály** (REV-N1…N5), a
megmaradó szervezeti alap **három** (ORG-N1…N3), és **hat nyitott blokkoló** (OB-1…6). A regiszter
nem tud hazudni: `implemented` ⇒ NEVEZETT próba, ami a tervezett készletben SZEREPEL; `planned` ⇒
NEVEZETT hiány, legalább 40 karakter; minden blokkolóhoz INDOK és LEZÁRÁSI FELTÉTEL; padló a
darabszámokon. A futtató KAPUKÉNT futtatja — hamis állapotra 2-es kilépési kód.

**Az őszinte állapot, amit a regiszter kimond:** a nyolc szabályból **kettő** megépült (REV-N1,
ORG-N2), **hat** `planned`. Az ORG-N2 (tiltó alapértelmezés, amíg nincs explicit szervezeti alap)
nem hiányosság, hanem a hiányzó modell helyes kezelése.

### Mérés

| Mérés | Eredmény |
|---|---|
| A külső fél **R51-es tizennégy** esete | **14/14** |
| A külső fél **R49-es változatlan harminc** esete | **30/30** |
| V3 magreferencia próbák | **26/26 PASS** (24 → 26) |
| Mutációs battéria | **43/43 elkapva**, 0 túlélte, 0 mérőhiba, 0 elavult horgony |
| Hazugság-ellenpróbák | **8/8 védett** (6 → 8) |
| Retired-pattern regiszter | **151/151** |
| Teljes söprés | **6 zöld · 0 piros** |

### Kimondott korlátok

1. **A falóra a MI gépünkön mért szám: 11,8 mp** a 15 000 ms-os korlát mellett. A 43 mutációval a
   négyes párhuzamosság 15,1 mp-et adott — a korlát FÖLÖTT —, ezért négyszeres túlfoglalásra
   váltottunk (mérve: 4 mag → 15,1 · 8 → 14,3 · 12 → 12,6 · 16 → 11,1–11,8 mp, változatlan
   eredménnyel). A külső fél a saját gépén 1,7 mp-et mért; LASSABB gépen a korlát közelebb kerülhet.
2. A hat nyitott blokkoló (OB-1…6) a `norms.mjs`-ben áll, nem itt — hogy a következő kör ne a
   naplóból keresse elő.
3. **Az eredet-ellenőrzés korlátja kimondva:** ELAVULT és IDEGEN FORRÁSÚ csomag ellen véd, nem
   rosszindulat ellen. Egy futtató, ami a szülőtől kapott jelet visszaírja, ezen a kapun átmegy —
   ehhez kriptográfiai hitelesítés kellene, amit nem ígérünk.
4. Az N03–N05 belső írófelület-próbák: nem állítjuk, hogy egy távoli felhasználó ma közvetlenül
   hívhatná ezeket. A közös magfelület megbízhatóságát mérik, a rá épülő mini modulok számára.

---

## D-VS-3008 — A külső fél 30 ellenőrző esete: a hiányzó ŐRÖK megépítve, és a NYUGTA-SZERZŐDÉS

**Kör:** CMD-VS-300-002-001 R49→R50 · sáv: Claude-AUX · a külső fél független ellenőrzése az
R47-es javításunkra.

**A bemenet.** A külső fél a saját, VÁLTOZATLAN próbájával visszamérte az R47-et, és 30 ÚJ esetet
adott a javításaink VARRATAIRA. Ebből 19 bukott. Reprodukáltuk: **19/19, karakterre az ő
számaikkal** — vagyis a leletük megállt, nem kellett hozzá értelmezés.

**A kör legfontosabb megállapítása viszont a SAJÁT kezünkből jött.** A javítások átvezetése után a
saját battériánk 17/17 zöldet és 29/29 elkapott mutációt mutatott. Kísérletként **kitöröltük a
frissen beépített ötsoros véglegesítési kaput** — és a saját battériánk VÁLTOZATLANUL zöld maradt;
egyedül a KÜLSŐ próba esett 30/30-ról 28/30-ra. A kör legfontosabb javítását tehát semmi nem
őrizte a mi oldalunkon. A teljesség-vizsgálat ezután kimutatta: **a hét szükséges saját őrből hat
hiányzott.** → **KUKA-092**.

**A második megállapítás a külső féltől jött, és a mi R47-es INDOKUNKAT cáfolta meg.** Az R47-ben
azzal vezettük ki a befogadás kiadás-sorát, hogy a válasz „nem közöl új tényt": az `effect_id` a
hívó saját bemeneteinek lenyomata, a `state` állandó. Ez **téves**. Az `effect_id` valóban
levezethető, de az, hogy a parancs **VÉGLEGESÜLT-E**, nem a hívó bemenete — az a szerver oldalán
keletkezett új tény, és épp ezért hív a hívó egyáltalán. A `disclosure` sor elhagyása helyes volt
(a befogadás nem kiszolgálás), de a **helyére semmit nem tettünk**, ezért a véglegesítés
nyomtalan maradt. → **KUKA-093**.

### Amit a kör megépített

**1. NYUGTA-SZERZŐDÉS (R50).** Két kérdés, két otthon, de egyik sem üres:
* a `disclosure` arra felel, **KI LÁTOTT** olyan tartalmat, ami a kéréstől függetlenül is állt;
* az új `command_event` könyv arra, **MIT KÖTELEZETT EL a szerver** ebben a kérésben.

A nyugta ALAKJÁT egy feloldó adja (`commandReceipt`), amit a befogadás ÉS az ismétlés is hív —
a hívó a válasz alakjából nem tudja megkülönböztetni a két ágat, a `replayed` mondja meg
(KUKA-039). NYOMOT viszont csak ott hagyunk, ahol a szerver tényleg elkötelezett valamit: az
ismétlés semmit nem ír, tehát nyugta-sort sem szül. A sor a **hatással EGY tranzakcióban**
születik — ez a KUKA-026 ellenpárja: a kudarc nyoma nem utazhat a visszagördülő tranzakcióval,
a siker nyugtája viszont kötelezően azzal utazik, különben meg nem történt hatásról adnánk nyugtát.

**2. VÉGLEGESÍTÉSI KAPU A PARANCS-OLDALON.** A feloldás utáni jog-ellenőrzés a tranzakción KÍVÜL
állt, tehát csak azt zárta le, ami a `resolve()` alatt történt. Mérve: ha a megvonás a `store.tx`
HATÁRÁN következik be, a parancs `finalized` lett és a sor megszületett. Ugyanezt a három ágat
végigmérve az ISMÉTLÉS és az OLVASÁS **már zárva volt** (mindkettő `not_available`, nulla
leltár-sorral) — ezt kimondjuk, hogy a lelet ne legyen tágabb, mint amit mértünk.

**3. HAT ÚJ PRÓBA A HIÁNYZÓ ŐRÖK HELYÉRE** (`P-INVITE-finalize-gate` · `P-CMD-finalize-gate` ·
`P-AUTHZ-roles` · `P-CANON-shape` · `P-TIME-calendar` · `P-IDENTITY-address`), plusz a
`P-CMD-receipt` a nyugta-szerződésre. **24/24 PASS.**

**4. NYOLC ÚJ MUTÁCIÓ** (M31–M38), és az M15 ÚJRA-HORGONYOZVA. **37 mutáció · 37 elkapva · 0
túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony.**

### Amit a saját mérésünk talált a saját munkánkban, a kör közben

* **Az M15 TÚLÉLTE** az első futást — nem azért, mert a hiba nincs meg, hanem mert az új parancs-
  oldali kapu KÉTRÉTEGŰVÉ tette a védelmet, és egyetlen szerkesztés nem tudja kinyitni. A mutációt
  átírtuk: MINDKÉT réteget elveszi. Egy próba, ami nem tud pirosra váltani, nem bizonyít semmit.
* **Az `also` kulcs, amit kitaláltam, NEM LÉTEZETT.** Az M15 újra-horgonyzásához egy második
  szerkesztést egy `also` mezőbe írtam — a futtató viszont soha nem olvasta. Ez a **KUKA-016**
  visszatérése (kitalált mezőnév a regiszterben). Nem lett néma: a mutációs szerződés `SURVIVED`
  ítélete PIROS, tehát a saját eszközünk fogta meg. A helyére `edits` tömb került, EGY normalizálón
  át, MINDEN szerkesztés horgonyát külön mérve.
* **Az M31 TÚLÉLTE** — és ez a saját ÚJ próbám lyuka volt. A `P-INVITE-finalize-gate` három ága az
  ÓRÁT és a TAGSÁG-táblát mozgatta, amiket a kapu úgyis frissen olvas; egyik sem mérte, hogy a
  **MEGHÍVÓ SAJÁT SORÁT** is újra kell olvasni. Két új ág került be: a határon VISSZAVONT meghívó
  (elavult olvasással tagság születne — valódi jogsértés) és a határon KÖZBEN FELHASZNÁLT meghívó
  (elavult olvasással a válasz KIVÉTEL lenne a nevezett elutasítás helyett — KUKA-020).
* **A `P-TIME-calendar` első alakja TÚLKÖVETELT:** azonos indokot vártam a 13. hónapra és a
  február 30-ra. A 13. hónap már ALAKILAG sem időpont, a február 30. viszont szabályos alakú, csak
  nem létező nap — a megkülönböztetés TÖBBET mond, nem kevesebbet. A követelmény az én kitalált
  többletem volt, nem a joghatár része; javítva.

### Mérés

| Mérés | Eredmény |
|---|---|
| A külső fél VÁLTOZATLAN próbája (`check.mjs`, 30 eset) | **30/30** |
| V3 magreferencia próbák (`verify:v3ref`) | **24/24 PASS** |
| Mutációs battéria | **37/37 elkapva**, 0 túlélte, 0 mérőhiba, 0 elavult horgony |
| Hazugság-ellenpróbák (a mérő önmagán) | **6/6 védett** |
| KUKA-regiszter (`verify:kuka`) | **142/142** |
| Teljes söprés (`verify:sweep`) | **6 zöld · 0 env-kihagyás · 0 piros** |

### Kimondott korlátok — amit ez a kör NEM zárt le

1. **A falióra a MI gépünkön mért szám.** 37 mutáció, 4 mag: a mag-számhoz kötött párhuzamosság
   12,0 mp-et adott a külső fél 15 000 ms-os korlátja mellett. A plafon rossz volt: egy
   mutáció-futás nem telíti a magot (folyamat-indítás és modul-betöltés dominál), ezért kétszeres
   túlfoglalásra váltottunk — **9,9 mp, változatlan eredménnyel**. Lassabb gépen a korlát közelebb
   kerülhet; a futás ezért KIÍRJA a mért időt és a korlátot.
2. **A több-írós véglegesítési határ nincs megoldva.** A `node:sqlite` `BEGIN IMMEDIATE` egyetlen
   íróval dolgozik. Postgresen sor-zár vagy verzió-őr kell — ez tervezési adósság, nem elintézett
   kérdés.
3. **A megvonás VISSZAMENŐLEGES hatálya** nyitott: ma a megvonás előre hat, a már megszületett
   hatásokat nem érinti. Hogy ez helyes-e, üzleti döntés, nem technikai.
4. **A `releasedFieldPaths` pont-összefűzése kétértelmű**: az `a.b` nevű mező és az `a` alatti `b`
   ugyanazt az utat adja. Ma nem okoz kárt (a leltár nem kulcs), de nevesített adósság.
5. **A szigorúbb kiadási osztályozót NEM mértük vissza a V2 migrációs korpuszán.** A V3-ban NULLA
   `.sql` migráció van, tehát az a mérés ÜRES halmazon futott — semmit nem bizonyít. Ezt kimondjuk,
   nem hallgatjuk el.
6. **Q17 (műtermék-útvonal ütközése)** és a **bemeneti séma-regiszter** nyitott tételek.
7. **A Q09 „maradék önálló szervezeti alapja"** — a külső fél kérdése — nincs megválaszolva.

---

## D-VS-3007 — A tizenöt megnevezett maghiba javítva, a KÜLSŐ FÉL saját próbáján mérve

**Dátum:** 2026-09-10 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R46 → R47
**Rendelte:** az OPERÁTOR („mehet a Q01–Q15") · **A hibalistát adta:** a KÜLSŐ TÁRGYALÓ FÉL (R42 §3/2)

### 1. Mit mérünk, és miért a TI próbátokkal

A javítás bizonyítéka nem a saját próbánk zöldje. A saját próba a saját olvasatunkat igazolja
vissza (KUKA-054) — ezért a külső fél **változatlan** `challenge.mjs`-ét futtattuk a MAI forráson,
a `source/` alá bemásolt `v3ref/*.mjs` + `contracts/*` állománnyal.

| | R42 (`c58f5f6…`) | ma |
|---|---|---|
| tétel | 17 | 17 |
| **PASS** | **0** | **16** |
| FAIL | 17 | 1 (Q17) |
| ERROR | 0 | 0 |

A fixtúrájuk VÁLTOZATLANUL betöltődött, pedig a séma több ponton változott — tehát nem a mi új
alakunkra szabott próbát mértünk.

### 2. A tizenöt tétel — a javítás helye

| # | hol | mi lett belőle |
|---|---|---|
| Q01 | `command.mjs` · `commandScope` | az ismétlésvédelmi kulcs HATÓKÖRÖS: `(book_id, actor, idem_key)` az elsődleges kulcs; hiányos címre KIVÉTEL, nem néma szűkítés |
| Q02 · Q03 | `command.mjs` · `canonicalize`, `commandIdentity` | REKURZÍV kanonizálás minden szinten; az azonosság a típust ÉS a típus-verziót is lefedi |
| Q04 | `command.mjs` · `submitCommand` | a jog ÚJRA megkérdezve a `resolve()` UTÁN, az INSERT ELŐTT |
| Q05 · Q06 | `authz.mjs` · `instantMs`, `evidenceStandingAt` | a bizonyíték HÁROM tengelye külön: kor · HATÁLY (`valid_until` kötelező) · megvonás; ismeretlen mező nem nyelődik el |
| Q07 | `authz.mjs` · `OP_CLASSES` (Map) | az ÖRÖKÖLT név (`toString` · `constructor` · `__proto__`) nem talál profilt ⇒ fail-closed |
| Q08 | `authz.mjs` · `membershipEffectiveAt` | a tagság KÉT vége EGY feloldón — ugyanezt hívja a meghívó-oldal is |
| Q09 · Q10 · Q13 | `invite.mjs` · `inviteGrantAt`, `redeemShapeFor`, `membershipOutcome` | a kibocsátó MAI joga · az idegen alany őre · négy KÜLÖN tagság-kimenet |
| Q11 · Q12 | `invite.mjs` · `redeemInvite`, `store.tx` | a születés VALÓBAN fiókot hoz létre; minden írás EGY tranzakcióban |
| Q14 · Q15 | `store.mjs` séma + `command.mjs` · `disclose` | a kiadási sor saját azonosítót kapott (az időbélyeg nem azonosság); a feloldott TARTALOM kizárólag a leltározott OLVASÓ úton mehet ki |

Állandó jelek: **16 próba · mind PASS** · **27 mutáció · mind a NEVEZETT állításon elkapva** ·
6 állandó hazugság-ellenpróba · mind védett.

### 3. AMIT A SAJÁT TELJESSÉG-KRITIKÁNK TALÁLT — és a külső fél NEM

> **A LEJÁRT MEGHÍVÓ TAGSÁGOT ADOTT, HA AZ IDŐPONTJA ELTOLÁSOS ZÓNÁBAN ÁLLT.**

A régi kód SZÖVEGET hasonlított (`inv.expires_at <= clock.now()`). Mérve, az akkori ÉLŐ forráson:
`expires_at = '2026-09-09T09:00:00+02:00'` valósan **07:00Z**, az óra 08:00Z — tehát **LEJÁRT**;
szövegként viszont `'…T09…' > '…T08…'`, tehát „még nyitva". A beváltás lefutott, `shape: 'birth'`,
és **tagságot adott**.

Ez a saját KUKA-039-ünk („a fél őr"): a bizonyíték-oldalon bevezettük az `instantMs` feloldót, és a
meghívó-oldalra NEM vittük végig — egy körrel azután, hogy a szabályt idéztük. Javítva
(`inviteWindowAt`), állandó próba `P-INVITE-window`, mutáció **M21**.

### 4. A Q14 — ELŐSZÖR TÉVEDTÜNK, ÉS A SAJÁT MÉRÉSÜNK CÁFOLT MEG

Ezt a kört először azzal a mondattal zártuk volna, hogy *„a Q14 azért bukik, mert a külső fél Q14 és
Q15 elvárása ütközik"*. **Ez téves volt.** A cáfolat nem érvelésből jött, hanem abból, hogy a saját
állításunkat próbáltuk megbuktatni: a Q15 állítása `!r.resolved || count > 0`, tehát a BAL ág is
elég — arra nem gondoltunk. Négy alakon lemérve a külső fél KÉT állítását:

| alak | a beadás ad tartalmat? | leltároz? | sorok | Q14 | Q15 |
|---|---|---|---|---|---|
| **A** — az akkori alakunk | igen | igen | 3 | **FAIL** | PASS |
| **B** — nem ad, nem leltároz | nem | nem | 2 | **PASS** | PASS |
| **C** — nem ad, de leltározza az `effect_id`/`state`-et | nem | igen | 3 | **FAIL** | PASS |

Létezik tehát olyan alak, amiben MINDKETTŐ teljesül: az ütközés a MI tervezői döntésünkből eredt.

**A javítás mégsem a „B" lett** — nem a zöldhöz igazítottuk a kódot, hanem megkérdeztük, MIT TUD MEG
a hívó az egyes ágakon:

- **BEFOGADÁS:** az `effect_id` a hívó SAJÁT bemeneteinek lenyomata (`hash(book|actor|idem_key)`),
  a `state` ezen az ágon állandó — a hívó semmi olyat nem tud meg, amit ne ő adott volna. Ami nem
  közöl új tényt, arra leltár-sort írni zaj, nem védelem.
- **ISMÉTLÉS:** a válasz egy MÁR LÉTEZŐ parancs állapotát közli — ÚJ tény, marad leltározva.
- **A FELOLDOTT TARTALOM:** kiszolgálás, tehát KIZÁRÓLAG a leltározott olvasó úton mehet ki.
  A külső fél szavaival: a beadás válasza „ELŐKÉSZÍTVE", nem „KISZOLGÁLVA".

A `command_accept` kiadás-fajta ezért **kivezetve** — a szó is, nem csak a hívás: a `disclose`
ismeretlen fajtaként DOB rá, ha valaki visszatenné (KUKA-052, fail-closed).

**Ettől a tartalomnak EGYETLEN kijárata maradt** (korábban kettő) — tehát a javítás nem csak zöldre
vitte a Q14-et, hanem szigorúbb adatkiadási alakot is adott. Két mutáció őrzi mindkét irányt:
**M16** (a beadás megint kiszolgál, leltár nélkül) és **M27** (az ismétlés nyom nélkül közli egy
létező parancs állapotát) — mindkettő bizonyítottan PIROS.

**A TANULSÁG, amit magunkra nézve rögzítünk:** amikor egy KÜLSŐ próba bukik, és a magyarázatunk az,
hogy *a próba a hibás*, az a létező legönigazolóbb helyzet (KUKA-054 a saját védekezésünkön).
Ilyenkor nem magyarázni kell, hanem a SAJÁT állítást megcáfolni — itt ez történt, és a cáfolat nem
csak a tévedést mutatta meg, hanem egy jobb alakot is.

**Q17 — az egyetlen megmaradt FAIL, valódi és NYITOTT.** Két azonos hívás ugyanazt az útnevet adja.
Szándékosan nem javítva: az operátor a Q01–Q15-öt rendelte meg, és az R46-ban már visszavontuk a
korábbi „Q17 kész" állításunkat. Ez **kockázat, nem ütemezés**: amint a rendszer valódi állományokat
ír, két egyidejű futás felülírhatja egymást. A következő kör bemenete.

### 5. A FELÜLVIZSGÁLATOK MARADÉKAI — mondatonként, gépi őrrel

Az R42 hat próbához adott hatókörös ítéletet, és mindegyikhez **maradékot** írt, ami NÉV SZERINT
sorolta a Q01–Q15 ellenpéldákat. Ha csak annyit írnánk, hogy „javítva", a lap a mai kódról állítana
valótlant (KUKA-050) — a vallomást viszont nem írjuk át, mert az TÖRTÉNELEM (KUKA-062).

Ezért KÜLÖN rekord áll melléjük: `v3ref/reviews.mjs` → **`RESIDUAL_RESOLUTIONS`**. Mért mai állás:

**23 mondat · 15 próbával MÉRVE · 0 „javítva de méretlen" · 8 NYITOTT** — és a nyolc nyitott a
futtató képernyőjén NÉV SZERINT megjelenik (HTTP-réteg · fiókváltási út · belépés ·
csatornabizonyítás · MFA · `pending_intent` lejárat · a szándék-életút · a 24 óra mint
tesztparaméter).

**A lezárás nem lehet szó.** A `checkResolutions` a futtató INDÍTÁSAKOR fut, és négy irányban mér;
bizonyítottan piros mind a háromra, amit kipróbáltunk:

- kitalált mondat (nem szerepel a vallomás maradékában) → *„a mondat SZÓ SZERINT nem szerepel"*
- „mérve", de nem létező próbára → *„a megnevezett próba nincs a szerződésben"*
- néma lezárás, érdemi indok nélkül → *„az indok túl rövid"*

Mindkét irányban mér: amelyik vallomásnak van maradéka, ahhoz KELL bejegyzés (KUKA-039).

### 6. Egy maradék, amit ÚJRA megmértünk — és igazuk volt

Az R42 a P-A14-hez ezt írta: *„a megvonás → képviseleti lekérdezés kombináció külön hiányzik"*.
A tizenöt javítás után újra megnéztük: a kombinációt **semmi nem mérte**. A meglévő ág a BIZONYÍTÉK
megvonását nézte (`revoked: true`) — az MÁSIK tengely.

Pótolva: a `P-AUTHZ-evidence` utolsó ága visszavonja a TAGSÁGOT, majd hibátlan, friss megbízással
kérdez ⇒ `membership_revoked`. Új mutáció (**M26**) megcseréli a két ág sorrendjét, és
bizonyítottan pirosra viszi — mert a képviseleti ág `return`-öl, tehát a sorrend-csere NÉMÁN adna
`allowed: true`-t (KUKA-002: két tengely, és a sorrendjük a szabály).

### 7. Ami NEM történt meg — kimondva

- **A08 konkurencia** (R42 §3/3): valódi párhuzamos kapcsolatokkal. A Q04 determinisztikus
  ellenpróbája NEM helyettesíti.
- **A07 + A15** (§3/4) · **A06 · A05 · A01/A02 · A09 · A10** (§3/5) · **Q17** (4. pont).
- **Bemenet-séma-regiszter** — enélkül a Q02 „ismeretlen mező ELUTASÍTÁSA" fele nem teljesíthető.
  Ma az ismeretlen mező az AZONOSSÁGBA beleszámít (nem tűnik el), de nem tiltott.
- **A „megmaradó független szervezeti alap"** (Q09) nincs modellezve: ma a kibocsátó személyes
  joga az EGYETLEN alap.
- **Visszaállítási próba** ütemezve, az első éles adat ELŐTT; **migráció-ujjlenyomat** védett
  kiadási alapvonalhoz mérve. Mindkettő NEVESÍTETT függő.

### Gépi jelek

- `npm run verify:v3ref` — 16 próba + **27** mutáció + 6 hazugság-ellenpróba
- `npm run verify:sweep` — teljes söprés
- a maradék-őr a futtatóba van kötve (`checkResolutions`), tehát nem külön parancs: hibás
  maradék-tábla mellett a próbafutás **2-es kóddal** áll meg, mielőtt bármit mérne

---

## D-VS-3006 — A mérő ÖT további alakban hazudott, és a kiadási őr átengedte, amit elutasított

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R45 → R46
**Megtalálta: a KÜLSŐ TÁRGYALÓ FÉL** (R45 — ANALYSIS), 19 rögzített ellenpróbával.

### 1. A mérő: a Q18 javítása után ÖT testvér-alak maradt életben

A `71c69bb` forráson mérve, mind reprodukálva — a mérő „10 mutáció · 10 elkapva"-t írt ki és
**0-val zárt**:

| # | Támadás | Miért nyerte meg |
|---|---|---|
| **H02** | a mutáns indulása UTÁN `process.exit(86)`, JSON nélkül | az M5 `runtime_error` szerződése BÁRMILYEN kivételt elfogadott — a teljes futtató hibáját is |
| **H03** | egyetlen próba sem futott, csak `SKIP` rekordok a hat ismert azonosítóhoz | a `status !== 'PASS'` bármit „bukott állításnak" vett |
| **H04** | csak a BUKOTT rekordok a kimenetben | a hiányzó négy rekordot semmi nem nézte |
| **H05** | valódi JSON, de a futtató 86-tal lép ki | értelmezhető JSON mellett a rendellenes folyamat-kilépés elveszett |
| **H06** | idegen infrastruktúra-kivétel a nevezett próbán | a mérő nem nézte, hogy a MEGFELELŐ ÁLLÍTÁS bukott-e el |

**A közös gyökér:** a mérő a VÁRT PRÓBAKÉSZLETET a FUTÁS EREDMÉNYÉBŐL olvasta ki — vagyis
**a mért féltől kérdezte meg, mit kellett volna mérnie** (KUKA-054 a mérő-eszközön). A saját,
egy körrel korábbi Q18-kapunk mind az ötben ZÖLD maradt, mert azt mérte, VAN-E JSON, nem azt,
hogy ÉRVÉNYES-E A MÉRÉS. **KUKA-090.**

### 2. A javítás: előbb érvényes mérés, utána ítélet

1. **A várt készlet KÜLSŐ szerződés** — `v3ref/manifest.mjs`: nevezett próbák + a hozzájuk tartozó
   ÁLLÍTÁS azonosítója. Hiányzó · ismétlődő · ISMERETLEN azonosító egyaránt mérőhiba.
2. **Típusos kimenetek** — `PASS` · `FAIL` (nevezett állítás) · `THREW` (hibakód + fázis) · `SKIP` ·
   `NOT_STARTED`. Bizonyíték CSAK a `FAIL`.
3. **A kilépési kód szerződés** (0 vagy 1), és az eredménnyel való ellentmondása mérőhiba.
4. **A `runtime_error` SZŰKÍTVE** — csak a próbán BELÜLI, ELŐRE megnevezett hibakódú és fázisú
   kivétel. Az M5 szerződése mostantól `ERR_SQLITE_ERROR` · `probe_body`, **mérésből**.
5. **Az elkapáshoz a NEVEZETT ÁLLÍTÁS kell** (`assertion_id`), nem elég, hogy „valami történt".
6. **HAT állandó hazugság-ellenpróba** minden futáskor (Q18 · H03 · H04 · H05 · H06 · H0X), és
   mindegyiknél MINDKÉT szerződés alatt tilos az elkapás.

**Mérve:** 6/6 ellenpróba védett · 10/10 mutáció a NEVEZETT ÁLLÍTÁSSAL elkapva · visszacsúszásra
bizonyítottan piros (az M5 hibakódját átírva → `WRONG_CATCHER`, kilépési kód 1).

### 3. Q16: a javítás eljutott az osztályozóig, a fogyasztójáig nem

Az előző kör az OSZTÁLYOZÓT javította — az azóta helyesen mond `data_change, ok:false`-t a
`TRUNCATE TABLE partner`-re. **De a teljes kiadási őr csak a `contract` csoport elutasítását
nézte**, tehát egy tábla-ürítés mellett **27/27 PASS, exit 0**.

**Ez PONTOSAN a mai `docs:html` lelet osztálya** (D-VS-3004): a darab ép volt, a VISZONY halott
(KUKA-024). A külső fél maga is így nevezte meg. Javítva: **minden megvizsgált migráció MINDEN
elutasítása megállítja a teljes ellenőrzést**, és a mondat megnevezi a fájlt, a besorolást és az
indokot (KUKA-064).

### 4. És a besorolás JELENTÉSE — öt további lelet

| # | Alak | Volt | Lett |
|---|---|---|---|
| **L03** | `ADD CONSTRAINT … CHECK … NOT VALID` | `expand, ok:true` | `restrictive, ok:false` |
| **L04** | `CREATE UNIQUE INDEX` | `expand, ok:true` | `restrictive, ok:false` |
| **L05** | `ADD COLUMN … NOT NULL` | `expand, ok:true` | `restrictive, ok:false` |
| **L06** | vegyes fájl: `DROP` + `UPDATE` | `data_change, ok:true`, a kivezetés ELVESZETT | mindkét kötelem külön, `ok:false` fejléc nélkül |
| **L07** | `-- BESOROLÁS: expand` egy `SELECT 1` fölött | elutasítva, UGYANAZT a fejlécet kérve | `unknown` besorolással átmegy — az ajánlott folytatás MŰKÖDIK |

**A SAJÁT FIXTÚRÁM INDOKLÁSA VOLT HAMIS.** A régi sor azt állította, hogy a `NOT VALID` megszorítás
„a régi írókat nem zárja ki". A PostgreSQL szerint a `NOT VALID` csak a MEGLÉVŐ sorok
végigellenőrzését halasztja el — az ÚJ beszúrást a feltétel MÁR korlátozza. A fixtúra tehát egy
hamis állítást őrzött zölden (**KUKA-068**: a pin védte a hibát).

Az L03–L05 nem TILTOTT: csak nem BIZONYÍTOTTAN ártalmatlan. Saját alakot kaptak (`restrictive`), és
a szerzőnek ki kell mondania, hogyan marad kompatibilis a régi író. Az L06 tanulsága, hogy **a
kötelmek ÖSSZEADÓDNAK, nem versenyeznek**: egy adatváltozási indoklás nem helyettesít kivezetést.

### 5. P01: a bemondott commit nem forrás-azonosság

A külső fél a ténylegesen `71c69bb`-n futó programnak a RÉGI `c58f5f6` commitot adta át
`--source-commit`-ként, és a kimenet ezt „a mai forrásra érvényes"-nek mondta. **A bemondott commit
puszta ÁLLÍTÁS** (KUKA-056 a forráson). Javítva: a futtató KISZÁMOLJA a saját forrás-csomagja
tartalmi lenyomatát (`source_digest`), és a bemondott érték külön, `declared_source_commit` néven
áll. Mellé `run_id` — két futás eredménye ne legyen összekeverhető.

### 6. Amit a külső fél a SAJÁT állításaimból cáfolt meg

- **„az UTC-időpont még nincs"** — HAMIS volt; a rekord `at` mezője már akkor is UTC-ben állt.
- **„Q16, Q17, Q18 kész"** — ebben az általános alakban nem tartható (lásd fent).
- **„a mini modulok a 4. pont után indulhatnak"** — nem: az 5. pont esetei a mag HATÁRÁT érintik.
- **„adatbázis nélkül fut"** — pontatlan: elkülönített SQLite-ot használ.
- **„a PITR-rel a legrosszabb eset másodpercek"** — a szolgáltatás LEÍRT képessége, nem mért
  garancia; vállalássá visszaállítási próbával válik.

Mind az öt átvezetve a lapokon (KUKA-050: a szöveg a valóságot követi).

### 7. Gépi jelek

`npm run verify:v3ref` (6 próba + 6 hazugság-ellenpróba + 10 mutáció) · `verify:release-order`
**35/35** (nyolc új fixtúrával) · `verify:kuka` (90 tanulság, mind otthonnal) · `verify:sweep`
6/6 zöld. **Nyitva marad:** a Q01–Q15 magviselkedés — az a következő kör, most már a helyesbített
mérővel.

## D-VS-3005 — A blokk-határ 700 → 3000: a V2 egy héten belül elfogyott volna

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R45
**Megtalálta: az OPERÁTOR** — *„biztos hogy jó, hogy 700-tól már a v3 van? hova mennek majd a v2-nek
a maradék apró dolgai?"*

### A lelet — mérve, nem tippelve

A D-VS-3000 a V3-nak a **700-as** blokkot adta. A kérdésre elvégzett mérés (a V2 repó git-történetéből,
`DECISION_LOG.md` a `main` egymást követő állapotain):

| dátum | legmagasabb D-VS | Δ | ütem |
|---|---|---|---|
| 2026-08-18 | 433 | — | — |
| 2026-08-22 | 520 | +87 | 21,8 / nap |
| 2026-08-26 | 577 | +57 | 14,3 / nap |
| 2026-08-30 | 607 | +30 | 7,5 / nap |
| 2026-09-03 | 642 | +35 | 8,8 / nap |
| 2026-09-06 | 659 | +17 | 5,7 / nap |
| 2026-09-09 | 670 | +11 | 3,7 / nap |

**237 szám 22 nap alatt (~10,8/nap), a mai ütem 3,7/nap.** A V2-nek a 700-as határig **29** száma
maradt — vagyis a mai, leglassabb ütemen is **kb. egy hét**, az átlagon **három nap**.

És a V2 nem áll le. Az operátor kimondta: a Claude-DEV sávval folytatódik minden, ami nem érinti
erősen a jogosultságot; a folyamatok maradnak, amíg alapszinten működnek; három cégtér használja a
KS kiváltására; a **Shoprenter-szinkron még nem működik**. Tehát nem „pár apró dolog" jön még.

### Miért ez a legrosszabb fajta hiba

A túlcsordulás **NÉMA lett volna**: a V2 kiadja a D-VS-700-at, a V3 is — és a `D-VS-…` onnantól
két különböző döntést jelöl, két repóban, visszamenőleg javíthatatlanul (a szám kódba, KUKA-
bejegyzésekbe, board-körökbe és képernyőkre is beég). Ez a **KUKA-045** alakja a névtéren: a kézzel
léptetett határ nem szabály, hanem tipp a jövőről — és a tévedése nem jelez.

### A javítás

**A V3 blokkja 3000-től.** A meglévő öt bejegyzés átszámozva: D-VS-700…704 → **D-VS-3000…5004**
(11 fájlban, minden hivatkozással együtt — egy napos, öt bejegyzés, ez volt a legolcsóbb pillanat).

**A határ mérésből számolt fedezet:** 3000 − 671 = **2329 szabad szám** a V2-nek, ami a MÉRT
leggyorsabb ütemen (10,8/nap) is 215 nap, a mai ütemen (3,7/nap) másfél év. A V2 ennél hamarabb
nyugdíjba megy — és ha mégsem, a V2 őre 250 szabad szám alatt FIGYELMEZTET, jóval a baj előtt.

### A HATÁR A REPÓÉ, NEM A VERZIÓÉ — az operátor javaslata, egy pontosítással

Operátori kérdés: *„»3000« a v3-ból kiindulva? majd 4000 a v4-től?"* — **a 3000-et átvettem, a
verziónkénti blokkot NEM.** A különbség:

- **A szám a REPÓT jelöli, nem a verziót.** A 3000 ma emlékeztet a V3-ra, és ez kényelmes — de a
  jelentése az, hogy *ezt a blokkot a `valach-system` repó naplója osztja*, **felső határ nélkül**.
- **Miért nem 4000 a V4-től:** mert a V4 UGYANEBBEN a repóban születne. A repó neve szándékosan
  verzió-semleges (D-VS-3000: a verzió git-CÍMKE, nem név), tehát a V3→V4 váltás nem repó-váltás.
  Ha a szám verzió szerint hasadna, EGY repó naplója két blokkra esne, és a számból többé nem
  lehetne megmondani, melyik RENDSZERRŐL beszél — épp az a kétértelműség jönne vissza, amit most
  szüntetünk meg (**KUKA-061**: új név = új fogalom, akkor is, ha nem akartuk).
- **Nem is fogy el:** a blokk felfelé nyitott, tehát a V4 egyszerűen folytatja (3xxx → 4xxx → …)
  ugyanabban a naplóban. Új blokk-határ csak ÚJ REPÓNÁL kell — akkor a következő szabad ezresnél.

**Amit NEM választottunk, és miért:** külön előtag (`D-V3-…`). Az soha nem ütközne, de ugyanabba a
csapdába lép: a VERZIÓT tenné egy állandó azonosítóba.

### Gépi jel — MINDKÉT repóban, és a fogyás LÁTSZIK

- **V3:** `verify:decision-numbers` **DNR03** — minden szám `>= 3000`.
- **V2:** `verify:decision-numbers` **DNR04** (ÚJ) — minden szám `< 3000`. **Eddig NEM volt felső
  határ ezen az oldalon**, tehát a V2 vidáman átlépett volna a V3 blokkjába. Visszacsúszásra mérve:
  egy `D-VS-3001` fejléc a V2 naplójában → `3/4 PASS — 1 FAIL`.
- **És a némaság ellen:** a V2 őre minden futáskor **kiírja a maradék szabad helyet**, és 250 alatt
  FIGYELMEZTET a teendővel. A blokk elfogyása így rendszer-állapot, nem egy `.md`-ben álló mondat
  (KUKA-019) — jóval a baj előtt megszólal, nem akkor, amikor már késő.

## D-VS-3004 — A `docs:html` a repó megnyitása óta NULLA lapot készített, és sikert jelentett

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R44
**Megtalálta:** a saját munkám — az operátornak szánt állapot-lap készítésekor futtattam a parancsot.

### A lelet

A `package.json` `docs:html` sora `--all` kapcsolót adott át; az eszköz a `--mind`-ot ismeri.
A kapcsoló nem egyezett, tehát a cél-lista ÜRES maradt, és a parancs ezt írta ki:

```
0 lap elkészült ide: docs/_olvashato/
```

— **nulla kilépési kóddal**, „Nyisd meg dupla kattintással" zárómondattal. Tehát a repó megnyitása
óta (D-VS-3000) **egyetlen olvasható lap sem készült**, miközben a parancs sikeresnek látszott. És
pont ez az a parancs, ami az operátor EGYETLEN olvasható alakját állítja elő (KUKA-079).

### Miért nem fogta meg a söprés

A `verify:doc-html` DHT06 tétele azt mérte, hogy a `docs:html` sor **hivatkozik-e** az eszközre
(`.includes('vs_doc_html.mjs')`). Ez igaz volt. A **viszonyt** — hogy a leírt parancs tényleg
készít-e lapot — semmi nem mérte (**KUKA-024**: két hibátlan oldal együtt is lehet halott lánc).

### A hiba osztálya: KUKA-036, visszatérve — a saját nyitó csomagomban

Réteg-határon átmenő azonosítót (itt: egy kapcsoló nevét) **emlékezetből** írtam a `package.json`-ba,
ahelyett hogy az eszköztől kérdeztem volna meg. A néma siker pedig **KUKA-012 · KUKA-041**: az üres
eredmény sikerként jelentve. A regiszter KUKA-036 bejegyzése kiegészítve, VISSZATÉRT jelöléssel.

### A javítás — három darab, mind kell

1. **A kapcsoló-lista EGY otthonban, exportálva:** `ALL_FLAGS` a `tools/vs_doc_html.mjs`-ben.
   A `package.json` értékét a pin EHHEZ méri, nem egy második, kézi másolathoz (KUKA-018).
2. **Több írásmód elismerve** (`--mind` · `--all`) — egy be/ki kapcsoló ne EGYETLEN titkos írásmódot
   ismerjen el (**KUKA-014**); a feloldó egy, a nevek többen lehetnek.
3. **A NULLA lap PIROS**, mondattal, ami kiírja a helyes hívást és a kapott kapcsolókat — nem
   zsákutca (**KUKA-064**).

### Gépi jel

`npm run verify:doc-html` **DHT07**: a pin **LEFUTTATJA** a `package.json`-ban álló `docs:html`
parancsot, és lapokat követel (**padló 1**); mellé ellenpróba: ismeretlen kapcsolóval az eszköznek
**1-gyel** kell zárnia. **Visszacsúszásra mérve piros** — a `--minden` alakkal a DHT07 FAIL, a
söprés piros. A pin ma 9/9, a söprés 6/6.

---

## D-VS-3003 — A repó-terv három kérdése lezárva: a PITR BE VAN KAPCSOLVA

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R44
**Forrás:** operátori válasz — *„a pitr engedélyezve van a railway / valach-family projects /
valach-system -ben"*

### A három kérdés (V3_REPO_ES_UZEM_TERV.md §7) — mind megválaszolva

| # | Kérdés | Operátori válasz |
|---|---|---|
| 1 | A repó neve | **`valach-family/valach-system`** — *„ok, valach-system mehet"* |
| 2 | Három környezet (éles · teszt · demo mint cégtér a tesztben) | **rendben** — *„a három környezet is jó"* |
| 3 | Be van-e kapcsolva az időpontra visszaállítás (PITR) | **IGEN**, a `valach-system` projekten |

### Amit a 3. válasz eldönt — és amit NEM

**Eldönti a legrosszabb esetet:** a maximális adatvesztés **másodperc-nagyságrend**, nem az utolsó
mentésig terjedő akár 24 óra. Ez a repó-terv §4-ének első száma, és eddig nyitva állt.

**NEM dönti el a visszaállítás rendjét, és ezt ki kell mondani** (KUKA-050 — a szöveg a valóságot
kövesse, a képesség megléte nem eljárás): a bekapcsolt PITR **nem** teszi a visszaállítást első
eszközzé. A §4 szabálya változatlan: *a rossz kiadást a KÓD visszagörgetése javítja, nem az adatbázis
visszaállítása* — a visszaállítás a mentési pont óta született MINDEN valódi munkát eldobná.
A PITR a végső háló, három nevesített esetre: valódi adat-sérülés · téves tömeges törlés · olyan
romlás, amit célzott javító-esemény nem tud helyrehozni.

**És a képesség megléte nem bizonyíték arra, hogy működik** (KUKA-038). A `backups`/PITR-út egyetlen
érvényes bizonyítéka egy lefuttatott visszaállítás. **Nevesített függő:** az első éles adat előtt
ütemezett visszaállítás-gyakorlat, a V2-ből átemelt eszközzel. Amíg ez nem futott le, a
visszaállítási képességet sehol nem jelentjük késznek.

### Gépi jel

Ezen a körön **nincs új gépi jel, és ez kimondott**: a PITR a Railway szolgáltatás-beállítása, a
repó kódjából nem mérhető. A jel akkor születik meg, amikor az első visszaállítás-gyakorlat lefut —
a kimenete a `var/reports/` alá, a névszabály szerint.

---

## D-VS-3002 — A mérőműszer hazudott: a Q18 reprodukálva és lezárva

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R42 → R43
**Forrás:** a külső tárgyaló fél független ellenőrzése (R42 — ANALYSIS), 17 kiegészítő eset.

### 1. A lelet, ami mindent megelőz

A külső fél a `run.mjs` helyére azonnal 86-tal kilépő programot tett — se JSON, se lefutott próba.
A `mutate.mjs` erre **„10 mutáció · 10 elkapva"**-t írt ki és **0-val zárt**. **Reprodukáltam.**

Egy sor okozta: `catch { failed = ['(a futás összeomlott)']; }` — a JSON-hibát BIZONYÍTÉKNAK
számolta. Mellette a `wrongCatcher` ki volt számolva, de a kilépési feltétel nem használta.

**Ez a KUKA-051/089 a mérő-eszközön** — a lehető legrosszabb helyen: ha a mérő zöldet mond a
semmire, minden rá hivatkozó bizonyíték nem gyengébb, hanem **hamis**. Az R33 „10/10 mutáció
elkapva" állítása ezért nem az volt, aminek jelentettem; visszamenőleg nem hitelesítem.

### 2. A javítás

Öt ítélet (`CAUGHT` · `WRONG_CATCHER` · `SURVIVED` · `HARNESS_ERROR` · `STALE_ANCHOR`), és minden
nem-`CAUGHT` piros. A hiba SOHA nem észlelés. A **megnevezett** próbának kell buknia. Futásidejű
kivétel csak akkor bizonyíték, ha a mutáció szerződése előre kimondja — és a kimenet kiírja, hogy a
bizonyíték ereje korlátozott.

**És a lényeg: két ÁLLANDÓ kapu minden futáskor** — (a) az alapvonal zöld-e, (b) a **Q18-ellenpróba**:
egy szándékosan elrontott futtatót `HARNESS_ERROR`-nak kell minősíteni. A (b) minden futásnál
elvégzi a külső fél támadását a saját kódunkon. Ez az egyetlen dolog, amitől a többi számnak értéke
van.

**Bizonyítva:** a Q18-támadás a javított mérőn → alapvonal-kapu piros, a mutációk **nem futnak**,
kilépési kód 1. Az M6 elkapóját `P-A08`-ra írva → `WRONG_CATCHER`, kilépési kód 1.

### 3. Három további, ugyanebből a pontból

- **`v3ref:evidence` nem létezett**, pedig az R33 rá hivatkozott — nem létező futtatóra hivatkozó
  riport (KUKA-011/038 osztálya). Felvéve.
- **`executed_by: 'Claude-AUX'` beégetve** — a rekord akkor is a mi nevünket vitte, amikor a külső
  fél futtatta a saját gépén: a bizonyíték a végrehajtójáról hazudott (KUKA-056). Most
  `--executed-by=` / env / kimondott `unknown`.
- **A hatókör nélküli `verified_by`** üresen marad; helyette próbánkénti, hatókörös rekordok
  (`v3ref/reviews.mjs`) **`residual` mezővel** és `gate_closed: false`-szal, a forrás-committhoz
  kötve — az elévülés kimondva (KUKA-041 · KUKA-050).

### 4. És három lelet a SAJÁT, EGY KÖRREL KORÁBBI őreimben

Nem a külső fél sorrendjének 2. pontja, hanem **hamis biztonságot állítottak** — ezért nem vártak:

- **Q16:** a kiadási menetrend őre KIZÁRÓ felsorolással dolgozott, ezért a `TRUNCATE`, a
  `DROP legacy_code` (a `COLUMN` szó a Postgresben **opcionális**), az azonnal érvényesített `CHECK`
  és a `DELETE` mind **`expand, ok:true`** választ kapott. Most **megengedő szabály** (KUKA-057):
  `expand` · `contract` · `data_change` · `unknown`, és csak az ismert-biztonságos megy át magától.
  Kimondva a kódban: **az őr előszűrő, nem SQL-értelmező.**
- **SemVer:** `3.1.0-alpha` és `3.1.0` között 0-t adott, és elfogadta a `03.1.0` alakot. Szigorú
  parse + előkiadás-rendezés (semver.org 11.4).
- **`artifactNaming`:** `area:'toString'` → `undefined/…` út (örökölt kulcs), perjeles „verzió" →
  útvonal-részek a névben. Sajátkulcs-ellenőrzés + szigorú verzió-alak.

**Mind a hat új viselkedés FIXTÚRÁVAL őrizve** — hogy ne ismétlődjön a Q16 osztálya: új ág, mérés
nélkül. `verify:release-order` 27/27 · `verify:artifact-naming` 28/28.

### 5. Ami NEM történt meg — kimondva

- **Az R42 §3 2–5. pontja el sem kezdődött** (Q01–Q15 magviselkedés · A08 konkurencia · A07+A15 ·
  a többi core-eset). Szándékosan: a mérő hibás volt, tehát bármilyen „a mutáció megfogja" állítás
  addig értéktelen lett volna.
- **Q17 valódi íróra** (futásazonosító + atomi létrehozás) — ilyen író ma nincs; a helye az elsőnél.
- **A gépi bizonyíték teljes mezőkészlete** részben van meg: UTC-időpont, futásazonosító és tartalmi
  lenyomat még **nincs**.
- **Egyetlen kapu sem billent át.** A G4/G5/G6 nyitva marad.

## D-VS-3001 — A generált fájlok neve és helye: `v3_v3.1.1_20260909_104201_…` a `var/` alatt

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX
**Operátori parancs:** *„Az újra generálódó fileok (script logok, backupok) a következő file néven
legyenek: v3_v3.1.1_20260909_104201_… A könyvtárstuktúra nagyjából már jó volt a v2-ben is, de nézd
át azért, és ezek alapján készüljön minden."*

### 1. A V2 átnézése — három lelet, mérve

| Lelet | Mért adat |
|---|---|
| **Szétszórt otthon** | a generált kimenet **kilenc** helyre ment: `backups/` · `runtime_logs/` · `test_logs/` · `test-results/` · `audit_out/` · `i18n_munka/` · `i18n_atiras/` · `logs/` · `tmp/` — mindegyik külön alkalommal, külön `.gitignore`-sorral (KUKA-018 · KUKA-003) |
| **`undefined/`** | egy elrontott út `undefined` nevű könyvtárat hozott létre — és az **KÖVETETT** a gitben, **3 PNG-vel**. Nem gitignore-olva, tehát a hiba be is került a repóba |
| **40 kézzel gyártott név** | 40 szerszám épít időbélyeges fájlnevet kézzel, legalább **három** különböző alakban (`toISOString().slice(0,19).replace(/[:T]/g,'')` · `.replace(/[-:T]/g,'').slice(0,12)` · `.slice(0,10)`) — egy fogalom, negyven másolat, három nyelvjárás |

Az operátor „nagyjából jó volt" ítélete pontos: a **szerkezet** helyes (a generált kimenet a
forráson kívül, gitignore-olva), a **darabszám** és a **kézi névgyártás** a gyenge pont.

### 2. A döntés

- **A NÉV:** `v3_v3.1.1_20260909_104201_<mit>.<kiterjesztés>` — pontosan az operátor kérése szerint.
  Nevet **soha nem gépelünk**: `artifactPath({ area, kind, ext, version })`
  (`contracts/artifactNaming.js`, REL-01 mintájára nevezett feloldó).
- **A verzió a `package.json`-ból jön**, nem emlékezetből (KUKA-005 · KUKA-033).
- **Az idő a gép HELYI ideje**, nem UTC — a fájlnevet ember olvassa a saját gépén, és a 12:42-kor
  készült mentés ne „10:42"-t mondjon. Felhőben futtatva ez UTC lesz: a fájl a **keletkezés helyének**
  idejét viseli, és ez ki van mondva.
- **A HELY:** minden generált kimenet a **`var/`** alá, öt nevezett területre (`logs` · `backups` ·
  `reports` · `exports` · `tmp`). A `var/` gitignore-olva; egyetlen kivétel a `var/README.md`, hogy a
  szerkezet **látsszon** — különben egy új kör nem tudná, hova írjon (KUKA-011).
- **Kivétel, kimondva:** a `docs/_olvashato/` marad a helyén — a forrása mellett él, és az operátori
  terminál-blokk erre az útra hivatkozik.

### 3. Amit a saját őröm cáfolt meg — a `v3_` előtag indoka

Az első alakban azt írtam a kódba, hogy az előtag azért kell, mert így „a v4 nem kerül a v3.9 és a
v3.10 közé". **A saját mérésem cáfolta meg:**

```
ELŐTAGGAL     → v3_v3.10.0_…   v3_v3.9.0_…   v4_v4.0.0_…
ELŐTAG NÉLKÜL →    v3.10.0_…      v3.9.0_…      v4.0.0_…
```

A `3.10` **mindkét** alakban a `3.9` elé kerül (ábécé-rendben `1` < `9`), és a v4 **mindkét** alakban
a végén áll. **Az előtag tehát nem rendez.** Ami rendez: a fix szélességű **dátum+idő** — egy vonalon
belül az ábécé-rend pontosan idő-rend. A verzió a névben **származás** (melyik kiadás írta — ez kell
a visszaállításhoz, `VERSIONING.md` 5.), nem rendezési kulcs.

Az előtag marad, mert az operátor így kérte és a szemnek segít — de **hamis indoklással nem**
(KUKA-033: a levezetett állítás a méréséig csak javaslat). Az ART06 önpróba most az **ellenpárt** is
méri, tehát a helyes állítás gépi úton áll.

### 4. Gépi jel

`npm run verify:artifact-naming` — **ART01–ART07, 25 ellenőrzés**:

- **ART01** a feloldó **karakterre** az operátor mintáját adja (fixtúrákon, a mai verzióval is)
- **ART02** verzió/megnevezés/terület hiányára **MONDATTAL** áll meg, és a terület-hiba **felsorolja**
  a választhatókat (KUKA-064) — nem néma tartalék-érték (KUKA-020)
- **ART03** a területek zárt halmaza mind a `var/` alatt, mind érdemi magyarázattal; az üzleti adatot
  hordozók **ki vannak mondva**
- **ART04** a `var/` gitignore-olva, a `var/README.md` mégis látszik, és **minden területet felsorol**
  (a lap nem csúszhat el a kódtól — KUKA-018)
- **ART05** egyetlen szerszám sem gyárt kézzel időbélyeges nevet — **bizonyítottan tüzel**: egy
  V2-alakú fájlt bemásolva a próba PIROSRA vált, majd eltávolítva visszazöldül
- **ART06** önpróba a rendezésre **és az ellenpárra** (lásd a 3. pontot)
- **ART07** a név visszafejthető (melyik kiadás írta, mikor), és idegen alakra **nem** ad hamis
  eredményt

### 5. Ami NEM történt meg — kimondva

- **A V2-t nem alakítottam át.** A hatókör-szabály (D-VS-667) érvényben van: ott csak az épül, ami a
  következő hónapokhoz kell. A `undefined/` könyvtár és a 40 kézi névgyártás **a V2-ben marad**;
  jelentve az operátornak, javítás külön döntésre.
- **Nincs még olyan szerszám, ami ténylegesen ír** a `var/` alá — a szabály előbb áll, mint az első
  írója. Ezt az ART05 „a mérés nem üres" padlója és a `var/README.md` mondja ki, nem hallgatja el.

---

## D-VS-3000 — A V3 repó megnyitása: `valach-family/valach-system`

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Operátori jóváhagyás:** *„ok, valach-system mehet,
a három környezet is jó"*

### A döntés

1. **A repó neve verzió-semleges: `valach-family/valach-system`.** A verzió CÍMKE a git-történetben
   (`v3.0.0`, `v3.1.0`, `v4.0.0`), nem repó-név és nem mappa. Nem lesz `vs4`.
2. **A V2 a saját nevén él tovább** (`valach-family/vs`). Nem költöztetjük, nem nevezzük át.
3. **Három környezet egy Railway-projektben:** production · staging · **demo mint CÉGTÉR a
   stagingben** (nem negyedik adatbázis).
4. **A fejlesztői és a teszt-tároló nem a felhőben van** — a magreferencia saját, eldobható
   fájl-tárolón fut, tehát az automata ellenőrzés nem függ a felhőtől.
5. **Kiadási menetrend:** egy `main`, semver címkék, `release/3.x` csak szükség esetén; migráció
   előrefelé, számozva, merge után érinthetetlenül; **bővítés → átállás → szűkítés három külön
   kiadásban**, a bontás soha nem eshet egybe azzal a kiadással, amelyben a kód abbahagyta a
   használatot.
6. **A rossz kiadást a KÓD visszagörgetése javítja, nem adatbázis-visszaállítás.**
7. **A D-VS számozás a V3-ban a 700-as blokkból megy.**

### Miért így — és mi volt a saját hibám

Az előző körben **én a `vs3` nevet ajánlottam. Ez hibás volt**, és az operátor kérdése mutatta meg,
miért: ha a repó neve verziószámot hordoz, a v4-nél `vs4` kellene, és az egész memória-, eszköz- és
board-gépezetet újra át kellene költöztetni — pontosan az a probléma ismétlődne, ami miatt egyáltalán
gondolkodunk.

**A javaslat nem új fogalmat vezetett be, és ezt mérve mondtuk ki**, nem emlékezetből: a V2 repó
`package.json`-ja már ma is `"name": "valach-system"` / `"version": "2.0.0-alpha"` — a termék neve és
a verzió már ott is külön mezőben állt. Csak a GitHub-repó neve (`vs`) csúszott el ettől.

### Mit hozott át a nyitó csomag, és mit NEM

| Átjött | Miért |
|---|---|
| `CLAUDE.md` (aktív memória) + a **89 KUKA-tanulság** | a tanulság nem verzió-függő |
| a lap-eszközök (`vs_doc_html`, `vs_verify_doc_html`) | az operátor nem tud `.md`-t megnyitni (KUKA-079) |
| a board-eszközök (`vs_board_doc`, `vs_board_round`) | hogy a tárgyalás ne szakadjon meg |
| a **magreferencia** (`v3ref/`) + a mutációs próbapad | a V3 mag-szabályai már futnak, adatbázis nélkül |
| a söprés (`verify:sweep`) | az első naptól, akkor is, ha kevés ellenőrzővel indul |

**NEM jött át** a V2 alkalmazás-kódja, sémája, üzleti adata és a 700 alatti döntés-napló.

### A csapda, amit külön kezelni kellett

A 89 tanulság átjött — a hozzájuk tartozó **gépi jelek 85-e viszont a V2 fájljaira mutat**. Nem
létező fájlon a tiltó-minta nem talál semmit, tehát **zöldnek látszana**: a védelem meglévőnek
tűnne, holott nincs (KUKA-051 · KUKA-041). Ezért minden bejegyzésnek **kimondott őr-otthona** van
(`contracts/guardHome.js`: `v3` / `vs` / `none`), a `verify:kuka` a listát **kiírja**, a deklarációt
**mindkét irányban visszaméri** (egy `v3`-nak jelölt bejegyzés cél-fájljának tényleg itt kell lennie;
egy `vs`-nek jelölt jel tényleg nem futtatható itt), és a `vs` szám **padló**: csökkenhet, nőni nem.

Mérve ma: **`v3` 2 · `vs` 85 · `none` 2**.

### Gépi jelek

- `npm run verify:kuka` — **KUK07** az őr-otthon (kimondás + visszamérés + padló)
- `npm run verify:release-order` — **REL01–REL06**; a REL06 fixtúrákon bizonyítja, hogy a
  bontás-szabály tüzel, mert nulla migrációval a REL03 nem mérne semmit
- `npm run verify:decision-numbers` — a 700-as blokk őre
- `npm run verify:doc-html` — a szállítási forma (a címzett meg tudja nyitni)
- `npm run verify:v3ref` — a magreferencia 6 próbája + 10 mutáció

### Ami NEM történt meg — kimondva

- **A repót nem én hoztam létre**: a session GitHub-alkalmazása nem kaphat repó-létrehozási jogot
  (mérve: `POST /user/repos` → 403 „Resource not accessible by integration"). Az üres repót az
  operátor nyitotta meg, a nyitó csomagot ez a döntés kíséri.
- **Nincs alapállás-mentés** (a V2-ben van) — mert még nincs adat. NEVESÍTETT függő: az első éles
  adatbázis megszületésekor kerül a `CLAUDE.md`-be a mester-mentés neve és a visszaolvasás.
- **Nincs migráció**, ezért a bontás-szabály élő adaton nem mért semmit; ezt a REL06 önpróba pótolja,
  és a verifier ki is írja.
- **A PITR (időpontra visszaállítás) állapota nem mérve** — azt az operátor látja a Railway-en, a
  session nem.

## D-VS-3037 — a minősítés nem törlési parancs: a nyers forrás-számláló megmarad (2026-09-17)

**Kör:** `CMD-VS-300-002-002 R28 → R29` · **Sáv:** Claude-v3 · **Lelet:** chatgpt-v3 (F28-01).

A `vs-usage/1 → v3-progress/1` átalakító helyesen ejti `null`-ra az elszámolási metrikákat, ha az
elszámolás frissessége nem igazolt — de a két pillanatkép **mért különbségét** semmi nem őrizte meg:
a lánc-próba pontos bemenetén a forrás `output=1000` értéke a vetületből nyomtalanul eltűnt, és az
R27 jelentés mégis azt állította, hogy „a szám a nem felosztott rekeszben áll".

**Döntés:** a mért különbség nevezett NYERS mezőben marad (`source_counters`) — megnevezett alap,
visszakereshető eredet, pillanatkép-határ, a három minősítés és kimondott korlát
(`usable_as_round_cost: false`). A `metrics`-be soha nem lép be, tehát a funkció igazolt összegéhez
nem adódhat hozzá; a validátor a SZABÁLYNÁL áll, ezért a közvetlen dokumentum-blokk sem kerülheti meg.
Ami valóban nem elérhető, ahhoz nem találunk ki számot. A részletnézet a nyers értéket a korlátjával
együtt írja ki.

**Tanulság:** KUKA-104. **Javítás:** `valach-family/vs@0d606ad` (PR #160, draft).
**Gépi jel:** `test:v3usage` + `test:v3progress` F28-01 · `test:v3progress:mutations` (26 egység-rontás
+ LÁNC-rontás, mind PIROS) · élő: `proof:v3progress-ui` (Q)(Q2)(Q3).

## D-VS-3038 — a két minősítési szint összhangja: a `||` nem öröklés (2026-09-17)

**Kör:** `CMD-VS-300-002-002 R30 → R31` · **Sáv:** Claude-v3 · **Lelet:** chatgpt-v3 (F30-01).

A nyers forrás-mező (D-VS-3037) saját minősítéseit a „nem elérhető" kapu
`(sc.token_coverage || r.token_coverage)` alakban mérte. A `||` a GYERMEKNEK ad elsőbbséget, ezért egy
`complete`-re írt beágyazott minősítés némán elfedte a futás kimondott `unavailable` állítását.

**Döntés:** a `source_counters` ugyanannak a futásnak ugyanazt a forrását minősíti, tehát legfeljebb
HALLGATHAT. Egy öröklési szabály: hallgató gyermek ⇒ a futásét örökli · kimondott gyermek ⇒
megengedett érték ÉS egyezés a futás kimondott értékével, különben nevezett elutasítás · a kapu az
ÉRVÉNYES értéken mér. A régi, `source_counters` nélküli boríték olvasható marad.

**Tanulság:** KUKA-105. **Javítás:** `valach-family/vs@98a4270` (PR #160, draft).
**Gépi jel:** `test:v3progress` F30-01 (hét ellenpár) · `test:v3progress:mutations` (három rontás,
mind PIROS a kilépési kódon).

## D-VS-3039 — a mutációs battéria darabszáma származtatva, nem kézzel (2026-09-18)

**Kör:** `CMD-VS-300-002-002 R32 → R33` · **Sáv:** Claude-v3.

A `v3ref:mutate:units` kézzel beírt hetes darabszámot hordozott. A battéria 149 mutációra nőtt, és a
4 vCPU-s futtatón a 2/7 szelet 12 406 ms-ot kért a 12 000 ms-os saját költségvetés fölött — a
`verify:v3ref` PIROSRA váltott ép tartalom mellett. Utólag mérve a hetes darabolás ÜRES gépen
belefér: a kapu eredménye tehát a gép pillanatnyi terhelésén múlt.

**Döntés:** a darabszám a KÖLTSÉGVETÉSBŐL származik (`--units-auto`): az ajánlott értékről indul, és
ha egy egység nem fér bele, finomabbra oszt — a költségvetés nem tágul, a finomítás nem néma, van
plafonja, és a plafonon a válasz hiányos mérés, nem zöld. A nem-nulla egység OKÁT nevezett feloldó
dönti el (UFK-01, `v3ref/unitFailureKind.mjs`): IDŐ ⇒ finomítható · TARTALOM ⇒ azonnal megáll ·
nincs tanú ⇒ `unknown`.

**Tanulság:** KUKA-177. **Gépi jel:** `node --test v3ref/unitFailureKind.test.mjs` (4 ellenpár) +
`npm run verify:v3ref`.

## D-VS-3040 — a három piros külső lánc oka MÉRVE: elavult elvárás (2026-09-18)

**Kör:** `CMD-VS-300-002-002 R32 → R33` · **Sáv:** Claude-v3 · **Kérés:** az R32 §B2.

Az `r77` · `r79core` · `r81core` hét bukó esetének okát eddig próza mondta ki. Mostantól MÉRÉS:
`npm run proof:mny01-form` (MNY-FORM-01) minden esetet kétszer futtat, és a kettő között egyetlen
dolog különbözik — a mennyiség ALAKJA. Eredmény **7/7**: JSON-szám ⇒ nevezett elutasítás
(`result_shape_type_mismatch`) · kanonikus decimális szöveg ⇒ elfogadva.

**Döntés:** a minősítés **elavult elvárás**, nem termékhiba. A külső fél programjaihoz NEM nyúlunk
(KUKA-054); az orvoslás (`qty: 1` → `qty: '1'` a bukó eseteknél) vagy az MNY-01 szűkítése **az ő
döntésük**. Addig a lánc pirosa áll, és nem takarjuk el.

---

## D-VS-3041 — a hiányzó tanú nem idő-bukás: a harmadik szó („nem tudom") (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **F35-01** lelete a CMD-VS-300-002-002 **R35** lapon.

**A lelet, reprodukálva a saját gépünkön.** Az egy körrel korábban (D-VS-3039 / KUKA-177) épített
`unitFailureKind` feloldó a darabolt mutációs battéria nem-nulla egységeiről mondta meg, MIÉRT
bukott: IDŐ miatt (⇒ finomabbra osztunk) vagy TARTALOM miatt (⇒ azonnal megállunk). A tisztaság-tanút
viszont csak annyiban nézte, hogy hamis-e — így **hiányzó mező, `null`, szöveges `"false"`, `0`, `1`,
`{}` és `[]` mellett mind az IDŐ-ágra esett**. Tehát tanú nélkül a futtató „lassú volt" magyarázatot
adott, és újradarabolt, miközben a gyermek TARTALMILAG is bukhatott — pontosan az a hiba, aminek a
megelőzésére a feloldó született.

**Döntés.** A feloldó három szava elválik, és a hiány a saját nevén áll:
`too_slow` **kizárólag** típushelyes `slice_clean === true` **és** érvényes idő-tanú mellett (véges,
nemnegatív `wall.ms`, pozitív `wall.budget_ms`, tényleges túllépés) · `slice_clean === false` ⇒
`content` (akkor is, ha közben túllépett) · **minden más ⇒ `unknown`**, és az `unknown` nem
mentegetés: megállít.

**Mellé a TANÚ-HATÁR (UFK-02, ugyanebben a munkában, az R35 kifejezett kérésére):** a futtató a
tanút a döntés ELŐTT hitelesíti (`freshUnitWitness`) — az egység azonossága (`k/n`) és a frissessége
(a gyermek indulása utáni időbélyeg) mérve. **Egy elavult egység-fájl nem igazolhatja egy friss,
bukott gyermek újradarabolását.** Ugyanez a szabály a battéria gyermek-hurkában és az `r81` külső
burkolóban is — egy feloldó, két hívó (KUKA-039).

**Gépi jel:** `node --test v3ref/unitFailureKind.test.mjs` (10 eset: hat F35-01 ellenpár · a
tartalmi bukás időtúllépéssel együtt is `content` · négy tanú-frissesség) · `npm run verify:v3ref` a
`--units-auto` úton, **kilépési kódon** mérve. KUKA-178.

**Amit ez NEM old meg, kimondva:** az egység-fájl továbbra sincs kriptográfiailag a futásához kötve
— kézzel írt egység-fájl beolvadna. A forrás-lenyomat egyezése szűkít, de nem bizonyít; az aláírt
egység-tanú NEVESÍTETT függő.

---

## D-VS-3042 — a mennyiség-állítás és a készletmozgás KÉT dolog (a QNT alapdöntés) (2026-09-18)

**Honnan:** operátori/tárgyalói döntés a CMD-VS-300-002-002 **R35** lapon (3. pont).

**A döntés.** Egy korábban 100-ra becsült mennyiség 90-re pontosítása **nem új, 90-es mozgás**, és
**nem 190 készlet**: ugyanannak a tételnek egy ÚJABB MEGFIGYELÉSE. Minden ilyen állítás megőrzi a
megfigyelés FORRÁSÁT, a MINŐSÉGÉT (mért vagy becsült), az IDEJÉT, az ELŐZŐ verziót és a
JOGALAPOT. **Egy későbbi mérés visszamenőleg nem tesz méréssé egy korábbi becslést.**

**A hatókör kimondva.** A teljes QNT (mennyiségi modell, recept, önköltség) **most nem épül**. Amit
viszont az „magon kívül" **nem törölhet**: az R19-ben magra jelölt alap-követelmények. Ezért a
mag-határ szerződésének **kimondott helye van** a megfigyelésnek és a HATÁS NÉLKÜLI rögzítésének — a
mai bevételezés-művelet ezt **nem** helyettesíti. Ilyen folyamat VALÓDI használata **kapuval zárva**
marad a QNT megvalósításáig és ellenőrzéséig (`USE-G3`).

**Gépi jel:** `npm run verify:v3ref` — a `K10-TYP-e` klauzula **NYITOTT**, nevezett hiánnyal (a
MEGFIGYELÉSI idő fogalma nincs a magban), és a `USE_GATES` `USE-G3` sora kimondja a használati
kaput. Tehát a halasztás **nem tűnik el**: a lánc minden futáskor kiírja.

---

## D-VS-3043 — a visszaállítási terv a KIADÁS ALAKJÁHOZ igazodik (board) (2026-09-18)

**Honnan:** a külső ellenőrző fél helyesbítése a CMD-VS-300-002-002 **R35** lapon (5. pont), az
R33-as board-átadó lapunk visszaállítási tervére.

**Amit az R33 tévesen mondott.** A terv `git revert -m 1`-et adott általános visszaállításként. Ez
**csak VALÓDI merge-commitra helyes**: a `-m 1` az első szülőt jelöli meg megtartandó vonalként, és
merge-commit hiányában a parancs hibára fut.

**A javított terv — a kiadás alakja dönt:** valódi merge-commit ⇒ `git revert -m 1 <merge-sha>` ·
**squash** vagy **fast-forward** ⇒ a squash-commit sima `git revert <sha>`-ja, illetve az előző
kiadás újratelepítése; a parancs kiadása előtt **meg kell nézni a HEAD alakját**
(`git log --merges -1` / `git cat-file -p <sha>` szülő-száma), nem emlékezetből.

**A második helyesbítés.** Az R33 „adatvesztés nincs" alakú általános állítást tett. Ez **mérés
nélküli**: a board kiadásának adat-hatását ebben a körben nem mértük. A helyes alak: a visszaállítás
a KÓD-változást fordítja vissza; hogy a menet közben KELETKEZETT adat mit visel el, az **külön,
mérendő kérdés** — és amíg nincs mérve, nem állítjuk (KUKA-033).

**Gépi jel: NINCS — kimondva.** Ez a szöveg a board átadó lapján áll, nem kódban; a védelem a lap
alakjában van (a visszaállítási lépés a kiadás alakját KÉRDEZI, nem feltételezi).

---

## D-VS-3044 — az összesítő olvassa a mérést, ne képezze (a norma-lánc csomag) (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **F37-01** lelete a CMD-VS-300-002-002 **R37** lapon.

**A lelet, reprodukálva.** Az R35-ben szállított csomag-generátor (NCP-01) a sorok minősítését MAGA
képezte, holott a lánc kanonikus ítélője (`checkNorms`) a vetületét már kiírta a mért állományba
(`norm_evidence.chain`). A saját gépünkön mérve: a mutációs eredményfájl helyére
`{"mutation_results":[]}` téve a generátor **kilépés 0-val „88 láncsor · 78 fedett"**-et írt ki —
**nulla mutációs tanú mellett**. A beadott mérés valós bontása ekkor: **60 fedett · 12 részben
fedett · 6 NEM falszifikált · 10 bizonyíték nélkül**. A 78-as szám a jelentésbe és a boardra is
kiment; **helyesbítve**.

**Döntés.** A `result` és a `why` **kizárólag** a mért lánc-vetületből jön; a generátor egyetlen
minősítést sem képez. A **kötés ellenőrzött, nem kiírt** — hét ág, bármelyik bukása nevezett
megállás: szerződés-lenyomat és -verzió · norma-index lenyomat · integritás-jelzés · a sorhalmaz
**mindkét irányban** · a minősítés zárt halmaza · minden „fedett" sor falszifikáló mutációja
**lefutott, CAUGHT, és NÉV SZERINT megnevezi az állítást** · minden próba címe feloldható a
futtatóból. A hiányzó bizonyíték soha nem fordul „fedett"-re.

**Gépi jel:** `npm run proof:norm-chain-package` — NCP-02, **12 eset**: tíz visszalépés bizonyítottan
PIROS a **kilépési kódon**, és két pozitív ellenpár az ép csomagon. KUKA-179.

**Amit ez NEM old meg, kimondva:** a próba CÍME forrás-olvasással oldódik fel a futtatóból. Ha a
`probe(` hívás alakja változik, ez a lépés **nevezetten megáll** — nem ad néma üres címet —, de ez
forrás-olvasás, nem futásidejű regiszter.

---

## D-VS-3045 — a művelet-név saját kulcson oldódik fel, és a sémaverziót a regiszter választja (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **F37-02** lelete a CMD-VS-300-002-002 **R37** lapon.

**A lelet, reprodukálva.** A bemeneti séma-regiszter `OPERATION_SCHEMAS[operation]` alakban keresett.
Ez az **örökölt** tulajdonságokat is megtalálja: `toString`, `constructor` és `__proto__` nevekre a
`!schema` kapu átengedett, és a hívás nyers `TypeError: Cannot convert undefined or null to object`
hibával állt meg — nem nevezett `unknown_operation` elutasítással. Mindhárom név reprodukálva. **Ez
belső referencia-API hiba; külső HTTP-támadhatóságot nem állítunk** (a külső fél sem állított).

**Döntés — két külön dolog.** **(1)** `schemaForOperation` (SOP-01): a név **típusa** is mérce, a
kulcs **saját kulcsként** ellenőrzött; minden nem-művelet névre azonos, nevezett
`unknown_operation`, kivétel és írás nélkül. **(2)** A **sémaverzió tulajdonosa és határa kimondva**
(SVR-01): a verziót a **regiszter** választja, a beadó legfeljebb **megerősít**; eltérő, korábbi vagy
ismeretlen megnevezett verzió **nevezett `unsupported_schema_version`** — hallgatólagos
átértelmezés nincs. **Migrációs keret NEM épült**, és ez határ, nem hiányosság.

**Gépi jel:** `node v3ref/run.mjs` — `P-BEM-input-schema` (j) és (k) ága; mutációk **M153** (tartalékra
esés) · **M154** (a nyers kulcs-olvasás visszatér) · **M158** (a verzió tulajdonosa a beadó lesz) —
mind elkapva, és **név szerint** döntik hamisra a saját állításukat. KUKA-180.

---

## D-VS-3046 — a hiány OKA is állítás: a lehetetlenségi indok mérendő (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) tartalmi döntése a **K10-TYP-c** klauzulán (R37).

**A lelet.** Két klauzula hiány-szövege azzal indokolta a bizonyítás elmaradását, hogy „a magban
**egyetlen** mennyiség-profil él, ezért ellenpélda nem állítható elő". **Mérve hamis:**
`QUANTITY_PROFILES` **két** élő profilt tartalmaz (`qty-1` · `qty-2`), és a saját próbánk mindkettőn
mér.

**Döntés.** A hiány megmarad, az **indok** javítva: „a bizonyítás **lehetséges** — csak nem történt
meg". Minden hiány-szövegben az ok is állítás a rendszerről: vagy mérve van, vagy nem írjuk le.
A „nem tettük meg" és a „nem lehetséges" két külön állítás — a második tévesen leírva a **következő
kört is lebeszéli** a munkáról.

**Gépi jel:** tiltó-minta a két konkrét hamis mondatra (`verify:kuka`). **Amire nincs gépi jel,
kimondva:** hogy egy ÚJ hiány-indok tartalmilag igaz-e — az próza. KUKA-181.

---

## D-VS-3047 — a külső tartalmi döntés KÜLÖN tengely, és nem gépi hitelesítés (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **OB-7** szerinti tartalmi döntései, 29 klauzulán,
a CMD-VS-300-002-002 **R37** lapon.

**A döntés rögzítése.** A 29 klauzula döntése bekerült a repóba (`v3ref/externalDecisions.mjs`,
EXD-01), szó szerinti indokkal: **14 „referenciában elfogadva" · 7 részleges · 7 nyitott · 1 nem
elfogadott egészként**. A hatókör az ő szavukkal: az itt vizsgált **egyírós, szintetikus, megbízható
belső kontextusú** modellben a norma és a **megnevezett** állítások tartalmi megfelelésére szól —
**nem** általános biztonsági tanúsítvány és **nem** teljes rendszerkészültség.

**És amit ez NEM jelent — kimondva, mert ők kötötték ki:** a repó `content_review` rekordjai
**nem** váltak gépileg hitelesítetté; a mechanikus átvezetés nem adhat szélesebb jóváhagyást és nem
gyárthat operátori aláírást. Ezért a csomag **két külön oszlopot** visel (`content_review` =
repó-rekord, mérve **0/92** · `external_decision` = boardon rögzített külső döntés), és a kettőt
sehol nem vonjuk össze (KUKA-105: két minősítési szint összemosása néma elsőbbséget ad az egyiknek).
Forrás- vagy követelményváltozásnál az érintett döntés **újraellenőrzendő**.

**Átvezetett maradékok ugyanebben a körben:** `K05-DSC-c` fedettről **részlegesre** (az engedő ág
bizonyítéka hiányzik — „ezt a különbséget ne zöldítsd át") · `K05-DSC-d` **kiegészítő kötése** két
további, saját nevű állítással (a `P-A08` önmagában a hatályosulási versenyt nem fedi) ·
`ORG-N1a` elavult maradék-szövege javítva (a meghívó-út alapja **megvan**, BLI-01) ·
`K10-TYP-c/d` hamis lehetetlenségi indoka javítva (D-VS-3046).

**Gépi jel:** `npm run docs:norm-chain` — a csomag a külső döntést külön oszlopban és külön táblában
hozza; `verify:kuka` a zárt döntés-szó halmazra.

---

## D-VS-3048 — a csomag megkérdezi, MIN mértek, és a kanonikus ítélőt futtatja újra (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) nyolc ellenpéldája a CMD-VS-300-002-002 **R39** lapon.

**A lelet, mind a nyolc reprodukálva.** Az R37-ben újraírt norma-lánc csomag már a MÉRT vetületet
vette át — de a mérés és a **mai forrás** viszonyát semmi nem ellenőrizte, és a beadott vetületet
sem számolta vissza. Átment: idegen felső `base_digest` · minden mutáción idegen `base_digest` ·
`applied:false` · PASS-ra írt próba-állapot · nem létező tanú (`M999`) a **részleges** sorokon ·
SURVIVED-ra írt szervezeti mutációk · egy részleges sor **címkéjének** „covered"-re írása. **A
legsúlyosabb a nyolcadik:** a KUKA-180 hibás forrás-alakját visszaállítva, a régi mérési fájllal
együtt, az összesítő **változatlanul „70 fedett"**-et írt ki, kilépés 0-val.

**Döntés — két kötés, második szabálykészlet NÉLKÜL.** A külső fél kikötése szó szerint: „a meglévő
kanonikus értékelést és forrás-/manifesztkötést használjátok közösen; ne épüljön második, eltérő
szabályú értékelő." Ezért:

1. **Forrás-kötés.** A mérés `base_digest` mezője a **mai** forrás-lenyomathoz mérve — a számoló
   saját otthonba költözött (`v3ref/bundleDigest.mjs`, BND-01), mert a battéria modulja nem húzható
   be anélkül, hogy le is futna.
2. **A kanonikus ítélő ÚJRAFUTTATVA.** A battéria mostantól elteszi a `checkNorms` **bemenetét** is
   (`norm_inputs`: `records` + `expectation`), nem csak az eredményét; a csomag ugyanazt az ítélőt
   hívja, és a beadott vetületet **soronként** ehhez méri (minősítés + tanú). Bármely eltérés
   nevezett megállás.

**A szabályok MEGVOLTAK.** A `checkNorms` már ellenőrizte az `applied` jelzést, az alap- és mutált
lenyomatot és a futás-jelet — csak a csomag soha nem futtatta le őket (KUKA-102).

**Gépi jel:** `npm run proof:norm-chain-package` — NCP-02 **20 eset**, a kilépési kódon: a külső fél
mind a **nyolc** ellenpéldája PIROS (köztük az ELAVULT KÓD esete, amely a forrás-fájlt is rontja és
visszaállítja), a korábbi tíz változatlanul PIROS, és **két** pozitív ellenpár. KUKA-182.

---

## D-VS-3049 — a diagnosztikai megjelenítés soha nem dobhat (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) lelete az **R39** lapon.

**A lelet.** A nevezett elutasítások `JSON.stringify(ertek)` alakban mutatták meg a kapott értéket
(KUKA-064). A `JSON.stringify` viszont **dob** `BigInt`-re és **körkörös** objektumra — így a hibás
típusú név nyers `TypeError`-t kapott a nevezett `unknown_operation` helyett. Ez a KUKA-180 hibája
egy réteggel beljebb: a kapu már helyesen döntött, de a **mondat**, amivel kimondta volna, elszállt.

**Döntés.** SAFE-01 (`showValue`): közös megjelenítő, ami **mindig** sikerül, és a fajtát is
megmondja (BigInt · Symbol · függvény · körkörös hivatkozás · tömb). Négy hívási hely áll át rá.
**Kimondva: ez a belső JavaScript-hívási határ lelete, nem bizonyított HTTP-sebezhetőség** — a külső
fél sem állított ilyet.

**Gépi jel:** `P-BEM-input-schema` (j) ága nyolc alakon + tiltó-minta a nyers megjelenítésre.
**Amire nincs gépi jel, kimondva:** hogy egy ÚJ diagnosztikai mondat ne hívjon más dobó függvényt.
KUKA-183.

---

## D-VS-3050 — a sémaverzió a KANONIKUS úton is átmegy a határon (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) lelete az **R39** lapon.

**A lelet.** Az R37-ben kimondott SVR-01 határ a `validateInput` **külön** hívásán működött, a
kanonikus bevét-út (`submitStockReceipt`) viszont **nem vett át** `version` argumentumot: a felső
szinten megnevezett verzió **némán eltűnt**, a bevét lefutott, és készlet is mozdult. A jelentés
tehát elutasítást ígért ott, ahol a rendszer eldobott egy argumentumot.

**Döntés.** A `submitStockReceipt` átveszi és **továbbadja** a `version` argumentumot. A határ a
valódi úton mérve, a **hatás visszaolvasásával**: a három érvénytelen verzió nevezett elutasítást
kap és **semmit nem ír** (se parancs, se mozgás); a megnevezett jó verzió és a verziót nem nevező
hívás egyaránt átmegy, a `register` / `request_confirmed` megkülönböztetéssel.

**Kimondva:** ez **nem** migrációs keret és **nem** több élő sémaverzió — a határ marad egyetlen élő
verzió műveletenként.

**Gépi jel:** `P-KSZ-ledger-truth` új állítása
(`A-KSZ-schema-version-is-checked-on-the-canonical-path-without-writing`) + az **M163** mutáció (a
verzió továbbadásának kivétele) — elkapva, és név szerint ezt az állítást döntve. KUKA-184.

---

## D-VS-3051 — a külső döntés SZÓ SZERINT marad, a saját előrehaladás külön mezőben (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) helyesbítése az **R39** lapon.

**A lelet.** Az R37-ben azt írtuk, hogy a 29 külső tartalmi döntés **szó szerinti indokkal** került
be. Két indokba (`K10-TYP-a` · `K10-TYP-b`) viszont belekerült a **mi** megjegyzésünk („R37-ben
javítva/pótolva") — tehát a lap azt állította, hogy a külső fél szó szerint ezt mondta. Nem ezt
mondta.

**Döntés.** A `reason` mező a külső döntés szövege, **változatlanul**; a saját előrehaladás külön
mezőben áll (`our_progress_note`), és az **soha nem módosítja a döntést**. Új elfogadást Claude nem
adhat magának. Ugyanitt javítva a **USE-G4** kézzel beírt „0/88" száma (a lánc már 94 sor): a
darabszám a **mérésből** jön, nem a szövegből (KUKA-045); a **REV-N4b** „EGYETLEN előfeltétel"
mondata szűkítve (a kompenzáló esemény saját jóváhagyási és audit-útját is bizonyítani kell); és a
**K10-TYP-c/d** két maradék kommentjéből törölve a „egyetlen élő profil" hamis indok.

**Gépi jel:** `npm run docs:norm-chain` — a lap és a JSON a két mezőt külön hozza; `verify:kuka` a
zárt döntés-szó halmazra. **Amire nincs gépi jel:** hogy egy ÚJ külső indok szó szerint került-e be.

---

## D-VS-3052 — a teljes kimeneti szerződés EGY helyen, és a sorok a kanonikus eredményből (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **F41-01** lelete a CMD-VS-300-002-002 **R41** lapon.

**A lelet, mind a három reprodukálva.** Az R39-es generátor újraszámolta a láncot, de a beadott
vetületnek csak **két** mezőjét (`result` · `falsified_by`) vetette össze a sajátjával; a többi
jelentéssel bíró mező ellenőrzés nélkül került a kimenetbe. Mérve: kitalált `content_review` ⇒ a
csomag **94 repóbeli jóváhagyást** jelentett a valódi **0** helyett · átírt hiány-szöveg ⇒ bekerült ·
`covers: ['K99']` ⇒ bekerült. Mind kilépés 0.

**Döntés — nem mezőnkénti toldozás (az ő kikötésük).** `ROW_CONTRACT`: a **teljes** kimeneti
szerződés egy helyen, mezőnként megnevezett otthonnal — *kanonikus* (és a beadott vetületnek
egyeznie kell vele) · *helyi regiszter* · *futtató-cím* · *külső regiszter* · *származtatott*. A
sorok a **kanonikus eredményből** épülnek; a beadott vetület csak összevetésre szolgál, és az
összevetés **a szerződés listájából** jön — tehát új mezőre magától kiterjed. Ami nincs a
szerződésben, az nem kerülhet a kimenetbe.

**A negatív bizonyíték is javítva:** a mondat a **minősülő** tanúra (`falsified_by`) és a szerződés
szerinti jelöltekre támaszkodik, nem puszta név-egyezésre.

**Gépi jel:** `npm run proof:norm-chain-package` → **25/25**, a kilépési kódon. A három új
ellenpélda PIROS, és a **hű gyengítés** (egy tanú nem minősül, a lánc ehhez újraszámolva)
helyesen **ZÖLD** marad — az őr, ami ezt is pirosra vinné, a másik irányba hazudna. KUKA-185.

---

## D-VS-3053 — minden forrás-hivatkozás a tényleges forráshoz kötve (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **F41-02** lelete az **R41** lapon.

**A lelet.** Az R39-es forrás-kötés **csak a legfelső** mezőt nézte. Ha a
`norm_inputs.expectation.base_digest` és **minden** `mutation_results[i].base_digest` csupa nullára
van írva, miközben a felső helyes marad, a csomag kilépés 0-val lefut — `source_bound: true`
mellett —, mert az újraszámolás „egyező **idegen**" elvárást és tanúkat lát.

**Döntés.** A kanonikus ítélőnek átadott **elvárás** és **minden** mutációs tanú forrás-hivatkozása
is a mai forrás-lenyomathoz mérve, nevezett megállással (az első eltérő tanú megnevezve).

**Kimondva, az ő szavukkal:** ez **egymásnak ellentmondó mezők felismeréséről** szól; attól egy
helyi JSON **nem** válik kriptográfiailag hiteles futási tanúvá. Az `evidence_limit` ezt továbbra is
kimondja. **Gépi jel:** NCP02-25, a kilépési kódon. KUKA-186.

---

## D-VS-3054 — a „szó szerinti" külső indok MÉRÉS, nem ígéret (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **F41-03** lelete az **R41** lapon.

**A lelet, és amit a saját mérésem hozzátett.** Az R37 óta azt állítottuk, hogy a 29 külső tartalmi
döntés **szó szerinti** indokkal áll a repóban. Ők egy átfogalmazást találtak (`K05-DSC-c` utolsó
mondata); a saját, ugyanebben a körben írt mérésem **még kettőt** (`REV-N3c` — „nem fogadom bele" →
„nem fogadja bele"; `K10-TYP-c` — kiemelt nagybetűk). Tartalmi torzítás egyikben sem volt, de
**idézetként pontatlan**.

**Döntés.** Mind a három visszaállítva szó szerint, és az állítás **mérhetővé** téve: a rögzített
forrás-lap (`v3ref/source-documents/R37_board_v1.md`) bekerült a repóba, és az **EXD-02**
(`npm run verify:external-decisions`) minden tárolt indokot **szó szerint** keres benne,
szóköz-normalizálás mellett — **mindkét irányban**: a forrás-lap minden klauzulájának meg kell lennie
a regiszterben is. A saját megjegyzés az indokba nem keveredhet (tiltó minta).

**Amit ez NEM mér, kimondva:** hogy a tárolt **verdikt** megfelel-e a külső döntés értelmének — az a
szöveg értelmezése, nem az idézet pontossága.

**Ugyanebben a körben javítva:** az **OB-9** maradék-szövegéből törölve a hamis „egyetlen élő
profil" indok (két profil áll), és az **R38 board-lap** frissítve a repóbeli helyesbítéssel
(3. változat) — a történeti eredményt a board verziózása őrzi.

---

## D-VS-3055 — a K10 követelmények bizonyítva a meglévő referencián (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **R43** parancsa — az R41-es összesítő-javítást a
vizsgált referencia-hatókörben **elfogadta és lezárta**, és a *működés* mérését kérte.

**A munka sorrendje az ő kikötésük szerint: előbb MÉRÉS, csak utána kód.** A felmérés eredménye
kimondva: **mind a négy klauzula viselkedése helyes volt** — a hiány a **bizonyítékban** állt, nem a
rendszerben. A csomag ezért nem javít, hanem **beköt**: négy új próba, **13 új állítás**, **hét új
mutáció**, és a `K10-TYP-c` · `-d` `gap`-je **részlegesre** vált, kimondott maradékkal.

**K10-TYP-a — stabil azonosság.** Mérve: a mennyiség változása és a formázás nem mozdítja az
azonosítót; a történeti mozgás-sorok egy cikkre mutatnak; azonos cikkszám másik könyvben más cikk;
a kiírt tulajdonság (egység) változása nulla lábnyomon szabad, lábnyom fölött **nevezetten tilos**.
**Kimondott határ:** a referenciában **nincs megjelenítési-név mező és nincs átnevező művelet** —
a klauzula e fordulatát ezért nem állítjuk bizonyítottnak (nyers fixtúra nem igazol hiányzó
műveletet). Visszabontás: M164 · M165 · M166.

**K10-TYP-b — a valódi úton.** Az elfogadott bemeneti javítást **nem építettük újra**; a nyolc
bemeneti hiba eredményét a **kanonikus bevét-úthoz** kötöttük, mert a korábbi bizonyíték a belső
feloldó közvetlen hívásán állt (KUKA-184). Mind a nyolc nevezetten elakad, **írás nélkül**; a jogos
bevét egy mozgást ír. **Kimondott határ:** ezen az úton a művelet neve fix, és ez **nem zárja az
OB-3** külső határát. Visszabontás: M167.

**K10-TYP-c — a múlt megőrzése.** Mérve: a tárolt sor a **saját** profilját viszi; a magban **nincs
publikus profilváltó művelet** (a katalógus forrásából mérve); elcsúszott profil mellett a
visszaolvasás **nevezett `profile_mismatch`** — nem ad más jelentést ugyanannak a számnak —, a nyers
sorok érintetlenek, és a helyes profilon a jelentés változatlanul tér vissza. **Kimondott maradék:**
ez az **olvasó** oldalát bizonyítja, nyers határ-fixtúrával; valódi, támogatott profilváltás nincs
megépítve, tehát nem is bizonyított. Visszabontás: M168 · M169.

**K10-TYP-d — ismétlés és hibahatár.** Hat helyzet a valódi úton, parancs + esemény + mozgás +
egyenleg pillanatképével: jogos első beadás (egy hatás) · azonos ismétlés · azonos jelentés más
formázásban (a kanonikus alak dönt) · korábbi sémaverzió · más profil · hibapont. **Mindhárom
elutasítás után a pillanatkép változatlan, és a korábbi siker ugyanazt a hatást adja vissza.**
**Kimondott maradék:** a „más profilú bemenet" ága **ugyanarra a cikkre** nem szólítható meg
(nincs profilváltás), a mérés másik cikkel történt. Visszabontás: M170.

**Gépi jel:** `node v3ref/run.mjs` (58 próba) + `npm run verify:v3ref` (167 mutáció) — minden új
állításhoz saját, név szerint döntő visszabontás.

**Egy mérés közbeni saját lelet, kimondva.** Az **M165** első alakja magát az azonosító-képzést
rontotta el — az viszont **nem szerződés szerinti bizonyíték**: a tábla elsődleges kulcsa önállóan
is megfogja, és a próba nyers SQLITE-kivétellel áll meg. A visszalépést át kellett írni arra, ami a
**valódi kár**: a néma összeolvadás a cikkszám-feloldásban. (Ugyanez az osztály, mint az R37-es
M159 — a rendszer két szinten védett, de a bizonyítékot ez nem helyettesíti.)
**A KÖR KÖZBEN A SAJÁT MÉRÉSEM KÉT TOVÁBBI HIBÁT TALÁLT A SAJÁT MUNKÁMBAN — mindkettő kimondva.**

**(1) Két visszabontásom nem az állítást döntötte meg (KUKA-187, negyedszer előjövő osztály).** Az
**M169** (a mozgás-sor a KÉRÉS profilját írja a cikké helyett) nem omlott össze, de a NEVEZETT
próbát sem buktatta el: annak a világában CSAK liter-profilú (`qty-1`) cikk állt, tehát a beégetett
`'qty-1'` megkülönböztethetetlen volt a helyes viselkedéstől — a fixtúra a saját előfeltevésemet
igazolta vissza (KUKA-054). A próba világa mostantól **darabos (`qty-2`) cikket is** visz, és a
sorának `qty-2` profilt kell hordoznia. Az **M170** első alakja a **fagyasztott** bemenet-értékre
írt (nyers `TypeError` — más réteg fogta meg); a valódi kár a **parancs-azonosságban** van, oda
került át. És az **M164** első alakja (só az azonosító-képzőben) **túlélte**: az azonosító a
felvételkor EGYSZER születik és tárolva marad, tehát nincs olyan olvasó, ami újraszámolná — a
visszabontás ezért a megjelenítés-váltásra került, ahol valódi kár keletkezhet. Ebből
következik a **kimondott maradék**: a „mennyiség nem mozdítja az azonosságot" állításnak **nincs
saját visszabontása**, mert a mai felépítésben egyetlen egysoros rontás sem tudja megdönteni
anélkül, hogy előbb az adatbázis idegenkulcsa állítaná meg.

**(2) A darabolt mérés indoka a szelet véletlenje volt (KUKA-188).** A battéria hét szeletben fut,
és az összefűzés eddig a szeletek KÉSZ ítéleteit egyesítette: a verdikt helyes maradt (a rangsor
dönt), a sor **indoka** viszont az első beérkező szeleté lett — öt soron mérve azt írta, hogy
„egyetlen mutációs eredmény sem érkezett erre a próbára", holott a teljes bizonyítékon a helyes
indok az, hogy a mutáció **futott és nem buktatta meg** az állítást. A kettő KÉT KÜLÖN teendő
(KUKA-093), és a gyengébbik ment ki a gépi végeredménybe. **Megtalálta a saját csomag-generátorom
teljes mező-összevetése** (a külső fél R41-es kikötése), miközben a battéria 168/168-cal zöld volt.
Javítva: az összefűzés a **kanonikus ítélőt** (`checkNorms`) futtatja a TELJES, egyesített
bizonyítékon és AZT adja ki; az unió kereszt-ellenőrzés marad, verdikt-eltérésnél nevezett akadály.

**Új visszabontás:** **M171** — a kanonizálás nem íródik vissza a tartalomba, tehát a `10` és a
`10.000` külön parancs-azonosságot kapna (ugyanaz a jelentés másodszor is könyvelne). Ez a garancia
MÁSIK kódhelye, mint az M170 — két külön helyszín, két külön ellenpár.

**Zárszám:** `node v3ref/run.mjs` **58/58 PASS** · `npm run verify:v3ref` **168 mutáció · 168
elkapva · 0 túlélte · 0 rossz próba · 0 mérőhiba** · norma-lánc **105 sor**.

## D-VS-3056 — a teljes tartalmi történet-megőrzés és a hatás-közbeni hibahatár (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **R45** parancsa. Az R44-es csomagot két ponton
cáfolta, mindkettőt **futtatható ellenpéldával**, és mindkettőt a SAJÁT fánkon reprodukáltam.

**F45-01 — a darabszám nem a tartalom.** Az R44-es ismétlés-próbám három tábla DARABSZÁMÁT és egy
egyenleg-szöveget hasonlított, csak a sorozat végén. A külső fél a bevét-út ELUTASÍTÓ ágán átírt egy
korábbi, lezárt esemény időpontját — a battéria mind az 58 próbája ZÖLD maradt. Reprodukálva: a
rontás `changes: 1`-et mért (valóban átírt egy régi sort), az eredmény mégis 58/58 PASS. Ugyanez a
hiány állt a bemeneti próbán, ahol a „nem írt semmit" állítás ÜRES tárolón mért darabszámon állt.
**Javítva:** TELJES tartalmi pillanatkép (a három nevezett tábla MINDEN oszlopa, determinisztikus
rendezésben, a tárolt eredmény-tartalommal), **minden egyes lépés után**; a jogos audit-bejegyzés
KÜLÖN mérce (a kiadás-leltár hozzáfűzhet, a korábbi sorait nem írhatja át); a bemeneti próba
ELŐZMÉNNYEL indul. Visszabontás: **M173** (a külső fél saját ellenpéldája) · **M174**. Tanulság:
**KUKA-189**.

**F45-02 — a ténylegesen elért hibahatár.** Az R44-es „hibapont" (99999999) a bemeneti ellenőrzésen
akad el, tehát a parancs tranzakciójába BE SEM LÉP: érvényes bemeneti ellenpélda, de a részleges
írás visszagörgetéséről semmit nem mond. **Javítva:** a darabos cikk ÖSSZEG-korlátja a MEGLÉVŐ atomi
úton belül üt (a tétel önmagában szabályos), tehát a hiba ott keletkezik, ahol a parancs-sor és a
nyugta MÁR beíródott — új állítás: `A-K10-d-effect-time-failure-leaves-no-partial-write`.
Visszabontás: **M175** (a hatás elutasítása nem görget vissza) · **M176** (az ismétlés-őr elnyeli a
megváltozott tartalmat). Új tranzakciós keretet nem építettünk.

**Három túl erős mutáció-leírás javítva — a MÉRT hatásra.** Az **M170** nem kettős könyvelést okoz,
hanem a formázás-független ismétlést akasztja el (a mozgás-szám 1 marad; a kettős hatást az **M172**
mutatja). Az **M171** ugyanez a másik kódhelyen. Az **M168** a régi, 12.500-as fixtúrán
`total_out_of_range`-et adott — az IDEGEN profil MÁSIK korlátja takarta el a kárt; a próba ezért egy
KIS (7.500) tételt is visz, ahol az átértelmezés egyik korlátba sem ütközik, és ott mérve a
visszaolvasás CSENDBEN **„7500"**-at ad „7.500" helyett.

**A döntés-regiszter mostantól FORRÁS-TUDATOS.** Az R45 a **K10-TYP-b**-t elfogadta — kimondottan
SZŰKEBB hatókörre (a jelenlegi egyírós, szintetikus referencia belső séma- és kanonikus bevétútja;
**nem** az OB-3 külső határa, és nem minden korábbi tárolt adat változatlansága). Az R37-es
történeti sorokat NEM írtuk át: a felülírt döntés `superseded`-ként megmarad, és az őr mindkét
forrás-lapon méri a szó szerinti idézetet (33/33).

**Egy mondat-fegyelem, kimondva.** Az R44-es lapom „egyetlen egysoros rontás sem tudja megdönteni"
alakja általános lehetetlenségi állítás volt — mérésen túli. Helyette a KIPRÓBÁLT alakot és a mai
mérési határt nevezzük meg. A KUKA-187 szövege ennek megfelelően javítva.

**Gépi jel:** `node v3ref/run.mjs` (58 próba) · `npm run verify:v3ref` (173 mutáció) ·
`npm run verify:external-decisions` (33 idézet, két forrás-lapon) · `npm run verify:kuka`.

## D-VS-3057 — az adatkörre szóló olvasási döntés rögzített alapja (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **R47** parancsa. Az R45/R46-os történetmegőrzési
csomagot a megnevezett referencia-hatókörben **elfogadta és lezárta**, és egyetlen új csomagot adott:
a **K05-DSC-c** engedő ága — *„aki jogosult készletet látni, ne kapjon ettől automatikusan árat. A
tiltás hiánya önmagában nem bizonyítja az engedélyt."*

**ELŐBB MÉRÉS (az ő kikötésük).** A kiadási út eddig KÉT tényt kérdezett: tag-e a kérő a KÖNYVBEN, és
van-e rá kimondott TILTÁS az eredmény adatköreire. Adatkörre szóló ENGEDŐ alapot SOHA nem kérdezett.
**Adaton mérve, a teljes meghívó-láncon:** egy olyan tag, akinek a TAGSÁGA `scopes: ['keszlet']`-re
korlátozott határozat alatt született, a vegyes eredményt **áregyütt** megkapta
(`unit_price: 12345`). A korlát ott állt az adatbázisban (`grant_basis.granted_limit`), olvasható
alakban — a kiadási úton egyetlen sor sem olvasta. Tanulság: **KUKA-190**.

**A JAVÍTÁS: EGY KAPU A KIADÁS KÖZÖS HATÁRÁN (RSB-01, `v3ref/releaseScope.mjs`).** Nem találtunk ki
új üzleti szerepkört és nem adtunk hallgatólagos „mindenhez jogot": a MEGLÉVŐ jogalap-láncot kötöttük
be. A sorrend kimondott: **kimondott TILTÁS** (REV-N5b — az engedély mellett is zár) → **a tagságra
átvitt adatkör-korlát** (ORG-N1b: *„a felhatalmazás nem lehet tágabb, mint az alapja"*) → **a
határozat MAI állapota** (ORG-N1a: megvont, lejárt vagy idegen könyvre szóló alap nem nyit). A
plafon a lepecsételt és az élő korlát metszete.

**Mérve, mindkét irányban:** a csak-készlet alapú olvasó a tiszta készlet-eredményt MEGKAPJA, a
vegyeset NEM — sem hamis kérői címkével, sem címke nélkül; a MINDEN érintett adatkörre jogosult
olvasó ugyanazt a vegyes eredményt MEGKAPJA (ellenpár); a kimondott tiltás az engedély mellett is
zár, de nem válik általános zárrá; a megvont és a lejárt határozat nem nyit; a nemleges válasz
BÁJTRA azonos a nem létező hivatkozásáéval; a döntés és a kiadási leltár EGY hatályosulási ponton
áll, és az elutasítás nem ír leltár-sort.

**KÉT NYITOTT ÜZLETI KÉRDÉS — kimondva, nem kitalálva** (az R47 kifejezetten ezt kéri):
1. **Rögzített korlát NÉLKÜLI tagság.** A mag minden mai tagsága ilyen. A kiadás ma a KÖNYV-tagságon
   áll; a kapu ezt `membership_only` néven **kiírja** és gyengébb alapnak jelöli — de hogy egy ilyen
   tag MIT láthat, arra a normákból nem vezethető le válasz.
2. **KÉT ADATKÖR-SZÓTÁR.** A felhatalmazás adatkör-tengelye szabad szöveg (a meglévő világok
   `stock`/`price` szavakat használnak), a tartalom-besorolás viszont zárt halmaz (`keszlet` ·
   `arak`). Az ismeretlen szótárú korlát **ZÁR** (`basis_scope_vocabulary_unknown`) — a két szótár
   megfeleltetése üzleti döntés, gép nem tippelheti meg (KUKA-022 · KUKA-061).

**KÉT SAJÁT LELET A KÖR KÖZBEN.** (1) Az első alakom a hiányzó TAGSÁGRA is zárt — ettől a kapu
MÁSODIK otthona lett ugyanannak a ténynek, és az **M4** mutáció (a könyv-szintű jog teljes
kiiktatása) a nevezett próbáján NÉMÁN zöld maradt: egy meglévő bizonyíték elvesztette az erejét
(KUKA-187 · KUKA-003). Javítva: a tagságot a könyv-kapu dönti el, és az előbb fut. (2) Két horgony
elmozdult alattunk (**M85** · **M96**) és a **KUKA-142** egyik jele is — mindhármat a battéria
`STALE_ANCHOR`-ja, illetve a `verify:kuka` mondta meg; a horgonyok a kódot követték, a mutációk
tárgya változatlan.

**A KÜLSŐ DÖNTÉSEK ÁTVEZETVE, A TÖRTÉNET ÉRINTETLENÜL.** Az R47 lezárása és a pontosított K10-d
indok **saját forrással** került be; az R45-ös és R37-es sorokat nem írtuk át (a felülírt döntés
`superseded`-ként megmarad). A „referenciában elfogadva" klauzulák száma **változatlanul 15** — az
R47 kimondja, hogy ettől nem nő.

**Gépi jel:** `node v3ref/run.mjs` (59 próba) · `npm run verify:v3ref` (185 mutáció, benne M177–M182) ·
`npm run verify:external-decisions` (36 idézet, három forrás-lapon) · `npm run verify:kuka`.

## D-VS-3058 — a ténylegesen megadott olvasási jog (2026-09-19)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **R49** parancsa. Az R48-as csomagot **nem fogadta el**
a K05-DSC-c teljesítéseként, és két esetet mutatott meg, mindkettőt VÁLTOZATLAN üzleti kódon
reprodukálva. Mindkettőt a saját fámon megismételtem a javítás előtt.

**F49-01 — a hiányzó engedélyből tényleges kiadás.** Ahol a taghoz SEMMILYEN adatköri engedély nem
volt rögzítve, a kiadás megtörtént (`membership_only` → `allowed: true`), és a külső válasz semmit
nem mondott erről: rendes sikeres eredményt adott, árral együtt. A gyengébb alap MEGNEVEZÉSE nem
teszi jogszerűvé a kiadást — és a saját próbám egyik ága kifejezetten KÖVETELTE, hogy ez így
maradjon, tehát a zöld teszt a hibát ŐRIZTE.

**F49-02 — a kiadó kerete lett a címzett joga.** A `grant_basis.granted_limit` a HATÁROZAT teljes
korlátját tárolja. Mérve: a `scopes: ['keszlet','arak']` határozat alatt kiadott, **csak készletre**
szóló meghívó címzettje az árat is megkapta — a `scopeReleaseDecision('arak')` `within_basis_scopes`
indokkal engedett. A megadható jog és a ténylegesen megadott jog két külön tény.

**A JAVÍTÁS: SGR-01 — a TÉNYLEGESEN MEGADOTT OLVASÁSI JOG** (`v3ref/scopeGrant.mjs` + `scope_grant`
tábla). Alanyra + könyvre + EGY adatkörre szól; KÉT idő-tengelyen áll (hatály × tudás); KÖTELEZŐ
rögzített alapja van, és a megadás pillanatában is ellenőrzi a plafont (ORG-N1b). A kiadási kapu
innentől ebből dönt: **a plafon csak szűkít, a hiány zár.** A sorrend: kimondott tiltás → a megadott
jog → a határozat mai állapota → a tagságra átvitt korlát.

**Mérve (kiadva → zárva különbségként, nem indok-cserével):** a rögzített engedély HIÁNYA zár (a
tiszta készlet-eredmény sem jön ki) · a TÁG határozat alatt SZŰKEN megadott jog nem tágul · a valóban
MINDKÉT adatkörre megadott jog mellett a vegyes eredmény kijön (ellenpár) · a kimondott tiltás az
engedély mellett is zár, de nem általános zár · a JOG megvonása és az ALAP megvonása/lejárata
egyaránt zár · a nemleges válasz bájtra azonos a nem létező hivatkozásáéval · a leltár egy
hatályosulási ponton áll, és engedély nélküli olvasónak sor sem születik.

**A PRÓBA-VILÁGOK VALÓDI JOGOT KAPTAK, NEM MEGKERÜLŐ KAPCSOLÓT** (az ő kikötésük). Hét próba állt
piroson a szigorítás után; mindegyik világ a rendszer SAJÁT íróján (`grantReadScope`) kapott
adatköri jogot, alappal és két tengellyel. Így a KÖNYV-kapu és az ADATKÖRI kapu állításai külön
mérhetők maradtak — az M4 bizonyítóereje nem indok az engedély nélküli kiadásra.

**MUTÁCIÓ-PONTOSÍTÁS (az ő leletük).** Az M179 leírása erősebb volt a futásnál: az R48-as alakban a
határozat-állapot kihagyása csak az INDOKOT cserélte (`outside_basis_scopes`), a kiadás továbbra is
zárt. Az SGR-01 óta a jog a MEGADÁSBÓL jön, ezért ugyanez a kihagyás VALÓDI kiadást eredményez egy
megvont alapon — és a próba ezt kiadva→zárva különbségként méri. Az M177 horgonya a feltételről a
VISSZATÉRŐ ÉRTÉKRE került: a feltétel kiiktatása nyers kivételbe futott (más réteg védelme, nem az
állítás bukása — KUKA-187).

**KIMONDOTT HATÁROK.** (1) A meghívó `scope` mezője MÉRVE a meghívó-KIADÁS tengelye
(`invite_basis.scope`), nem olvasási jog — ezért a beváltás ma NEM ad adatköri olvasási jogot; hogy a
meghívó hordozzon-e felajánlott olvasási adatköröket, ÜZLETI döntés. (2) Az olvasási jog csak a
tartalom ZÁRT adatkör-szótárának nevére adható (`unknown_data_scope`), az ismeretlen szótárú PLAFON
pedig zár — néma fordítás nincs.

**Tanulság:** KUKA-191. **Gépi jel:** `node v3ref/run.mjs` (59 próba) · `npm run verify:v3ref`
(179 mutáció, benne M177–M182) · `npm run verify:kuka` (a `membership_only` alap tiltó-mintája).
