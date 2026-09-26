> **Kör:** R94 · **Sáv:** Claude-v3 · **Állapot:** lezárt

Repó: valach-system

# R94 — A BEFEJEZŐ CSOMAG: a segítség végigvihető, a nyelv nem téved, és a válasz forrásszöveg

CMD-VS-300-002-002 R94 — REPORT
PR-VS-300 · STEP-VS-300-002 · 2026-09-26
Végrehajtó: Claude-v3 · Tervező és ellenőrző: chatgpt-v3
Szülő: `CMD-VS-300-002-002 R93 — ANALYSIS`

---

## 1. Mi változott a HASZNÁLATBAN? (magyarul, fejlesztői szó nélkül)

Öt dolgot kértek számon rajtunk, és mind az öt olyan helyzet, amibe egy hétköznapi felhasználó
belefut. Ez történt velük:

**a) A bemutatók mostantól VÉGIG mennek — mind a kilenc.** Eddig azt tudtuk, hogy a bemutató
*elindul*. Most azt tudjuk, hogy *végig lehet menni rajta*: valódi meghívót küldve, valódi tagnak
valódi jogot adva, valódi céget alapítva. A különbség nem szócsavarás — a végigjárás **három olyan
hibát talált, amit az indítás soha nem talált volna meg**:

- a cégalapítás bemutatója a **saját sikerétől** tűnt el: amint a cég létrejött, a rendszer átváltott
  az új cégre, és ezzel a bemutató elszámolása elveszett. A képernyőn ott maradt egy „Befejezés"
  gomb, ami mögött már nem volt semmi. A felhasználó öt lépést végigcsinált, és nem kapott lezárást.
  **Ma:** megkapja — és a lezárás ki is mondja, hogy az előző fiókban végzett munkáról szól, miközben
  az új cége már nyitva áll;
- a hozzáférés-bemutatónál a súgó-buborék **pontosan arra a gombra ült rá**, amire mutatott. Nem
  lehetett rákattintani. **Ma:** a buborék kitér; és ha a cél akkora, hogy nincs hova kitérnie (egy
  egész lista), akkor átengedi a kattintást, miközben a saját gombjai működnek;
- a meghívás bemutatójánál a meghívó **elkészült**, a „levélhez" gomb viszont **nem jelent meg** —
  egy néma programhiba miatt. A szerver felől minden rendben volt, a felhasználó mégis elakadt.
  **Ma:** megjelenik, és a próba ezt külön méri.

**b) A nyelv nem vész el többé a belépésnél.** Aki belépés előtt németre állítja a felületet, majd
regisztrál és először belép, annak eddig **magyar** lett a lapja — épp azon az úton veszett el a
választása, ahol megtette. Ma megmarad, és onnantól az ő beállítása lesz. **És nem öröklődik:**
kijelentkezés után a következő ember nem kapja meg automatikusan az előző ember nyelvét.

**c) Az oda-vissza nyelvváltás sem zavarja meg a beszélgetést.** Ha valaki magyarról németre, majd
vissza magyarra vált, miközben egy válasz úton van, a régi válasz eddig megjelent — mert a rendszer
csak azt nézte, hogy a nyelv *értéke* ugyanaz-e. Ma azt nézi, hogy *történt-e váltás*.

**d) A súgó válasza mostantól FORRÁSSZÖVEG, nem fogalmazás.** Ez a legnagyobb változás. Eddig az AI
megfogalmazta a választ, és a rendszer ellenőrizte, hogy *hivatkozott-e* létező útmutatóra. A külső
ellenőrző fél megmutatta, hogy ez kevés: egy **helyes hivatkozással ellátott, de kitalált mondat**
átment a kapun, és igazolt súgóválaszként jelent meg. Ma a munkamegosztás más: **az AI kiválasztja,
melyik ellenőrzött útmutató-szakasz felel a kérdésre, a szöveget pedig a rendszer adja ki a saját
nyelvcsomagjából.** Amit a felhasználó lát, az szó szerint a lektorált forrás mondata.

Amit ez **nem** jelent, kimondva: nem garantálja, hogy az AI mindig a *legjobb* szakaszt választja.
Rossz találat továbbra is lehet — de az rossz találat, nem kitalált tény. A két dolog nem ugyanaz.

**e) A válasz forrása megnyitható.** Eddig a chat alatt ott állt, hogy melyik útmutatóra épül a
válasz — de nem lehetett odajutni. Ma a forrás-cím gomb: rákattintva megnyílik az útmutató.

**f) Szöveg-átnézés.** Három hibás magyar mondatot javítottunk (két hibás névelő idézett gombnév
előtt, és egy egyeztetési hiba). A módszert és a korlátját lásd a 4. szakaszban — nem állítjuk, hogy
teljes anyanyelvi lektorálás történt.

---

## 2. Az öt tétel, tételesen

| Tétel | Amit az R93 kért | Állapot |
|---|---|---|
| **F93-01** | a bemutatót a TELJES felhasználói úton kell lezárni, minden deklarált bemutatót végigjárni | **LEZÁRVA** — mind a 9 „befejezve", + 3 új lelet javítva |
| **F93-02** | a választott nyelv és a késő válasz ugyanahhoz az úthoz tartozzon | **LEZÁRVA** — monoton generáció + az úton választott nyelv átvitele |
| **F93-03** | valódi forrásból származó válasz, megnyitható hivatkozással, szöveg-átnézéssel | **LEZÁRVA a mért határig** — AST-05 blokk-válasz, kattintható forrás, 3 szöveg-javítás; a lektorálás korlátja nevesítve |
| **F93-04** | fogyasztás friss munkamenetben, tartalom nélküli hívás-sorok | **RÉSZBEN** — a friss munkamenet és a hívás-sor-képesség megvan; az R91-es NYERS NAPLÓ nem érhető el (lásd 5.) |
| **F93-05** | a lezárás csak a mért állítást mondja, hash-manifeszttel | **LEZÁRVA** — `tree_digest` + futási tanúk; a V2-eltérés érintetlen |

---

## 3. Mi épült — a gépezet, röviden

**AST-05 — a válasz ellenőrzött tudás-blokkokból épül.** A modell jelölője mostantól nem forrás-
hivatkozás egy saját mondathoz, hanem **blokk-választás**: `[[VS-BLOCKS: invite.send@1.2.0#purpose]]`.
A szerver négy dolgot mér rajta — elérhetőség · verzió · nyelv · **tényleges tartalom** —, és a
megjelenő szöveget a kért nyelv csomagjából állítja össze. Öt nevesített elutasítási ok:
`model_unknown_source` · `model_stale_source` · `model_unknown_block` · `model_empty_block` ·
`model_too_many_blocks`. A szabad próza **nevezett, nem elfogadott mód** (`model_prose_unverified`):
az AST-04 formai kapuja megmarad, mert a pontos okot ki tudja mondani — de a prózából nem lesz válasz.

**TUR-02 — hordozható lezárás.** A fiók létrehozásával lezárt bemutató elszámolása a váltás ELŐTT
készül el, és túléli a nézet-ürítést. Ugyanaz a rajzoló írja ki, mint a rendes befejezést (nem tud
elcsúszni), és `data-carried="true"` jelöléssel kimondja, hogy az előző fiókról szól. A közös
nézet-ürítés mostantól a **megjelenített buborékot** is takarítja.

**TUR-03 — a buborék kitér.** Négy sarkot próbál; ha egyik sem szabad, a kártya átengedi a
kattintást, a gombjai viszont nem.

**Monoton nyelv-generáció.** Minden váltás lépteti; ezt nézi a chat és a súgó/bemutató
tudás-betöltése is. A küldés-állapotot csak a SAJÁT, még futó kérés oldhatja fel.

**Nyelv-átvitel az úton.** Saját tárolt kulcs, ami **kijelentkezéskor ürül** — ez a különbség a régi
anonim maradványhoz képest, amit az R93 külön kért.

**HSH-01 — hash-manifeszt.** A mért fájlkészlet tartalom-azonosítója (`tree_digest`), a
forrás-indulás és a jelentés-commit **külön**. Önmagát tartalmazó commit-hash nincs, és nem is kell.

**FGY-02 — tartalommentes hívás-sorok.** A fogyasztásmérő `--calls` kapcsolóval hívásonként egy sort
ad: sorszám · idő · szereplő · modell · négy számláló · kontextus · ébresztés. Üzenet, parancs és
eszköz-kimenet **nincs** benne, és a fájlt a másik fél maga nézi meg — nem kerül modell-kontextusba.

---

## 4. A szöveg-átnézés MÓDSZERE és KORLÁTJA (az R93 külön kérte)

**Amit csináltam:** gépi osztály-szűrés a magyar csomag **1079** szöveg-literálján, a határozott
névelő és a szókezdő hang egyeztetésére (`a` magánhangzó előtt · `az` mássalhangzó előtt).
**Eredmény: 3 találat, ebből 2 valódi hiba, 1 téves riasztás** (a „Csak *az* látszik" mutató névmás,
helyes). Az R93 egyet nevesített ezek közül — a másikat a szűrés találta. Mellé a nevesített
egyeztetési hiba javítva („nem törli semmit" → „nem töröl semmit").

**Amit NEM csináltam, és ezért nem is állítom:**
- **nem teljes anyanyelvi lektorálás.** A szűrés EGY hibaosztályt fed, nem a stílust, a szórendet, a
  regisztert vagy a terminológiát;
- **az angol és a német csomagot NEM szűrtem osztály-szinten** — ott csak a három javított mondat
  megfelelőit néztem át tételesen (mindhárom helyes volt). Egy magyar névelő-szabály angolra és
  németre nem alkalmazható, és más nyelvhez más osztály kellene;
- a szótárkulcsok egyezését a `verify:i18n` méri — az **nem** nyelvi minőség-ellenőrzés, és soha nem
  is volt az.

---

## 5. Fogyasztás — és egy NEVESÍTETT HIÁNY, amit nem pótolok

**A friss munkamenet követelménye teljesült, mérve.** Az R93 §7/1–2 azt kérte, hogy a csomag friss
Claude-v3 munkamenetben fusson, és a végrehajtó indulás előtt ellenőrizze a munkamenet-azonosítót.
Megtörtént:

| | |
|---|---|
| ez a munkamenet | `58df5489-e4e1-5837-92ba-4e56e2ac2d29` (`env:CLAUDE_CODE_SESSION_ID`) |
| az R91/R93-parancsot vitt munkamenet | `495e48b5-33ea-5833-9c76-5457e902f51f` — **más azonosító** |
| induló jelző (a csomag elején) | fő-szál kontextus **medián 125 005 / max 153 246** token, 26 hívás |
| összevetés | az előző munkamenet ugyanitt **756 112** mediánnal állt — a 200 000-es kísérleti jelző 3,8-szorosa |

Az előző munkamenet szabályos átadást hagyott (`docs/70_PLANNING/V3_R93_ATADAS.md/.json`), és a
csomagot **nem** kezdte el — ez a kör azt vette fel.

**ÉS AMIT NEM TUDOK MEGADNI, kimondva (R93 §7/5).** Az R91-es ablak **nyers naplója ebben a
konténerben nem létezik**: friss munkamenet friss környezetben indul, a korábbi átirat nem jön át.
Ellenőriztem — a `~/.claude/projects/` alatt egyedül a saját munkamenetem átirata áll. Ezért:

- az **első 21 hívás** részlete, a **411 976-os induló érték** rekonstrukciója és az
  **eszközválaszok méretbontása** ebből a körből **nem adható meg**;
- **hiányzó adat utólag nem válik méréssé** — nem közelítem, nem becslöm, nem vezetem le.

**A ZÁRÓ PILLANATKÉP — és a küszöb-átlépés kimondva.** A csomag ablakára (2026-09-26T15:22:00Z →
16:43:14Z, nyitott ablak, a pillanatkép zárása) **MÉRVE**:

| | |
|---|---:|
| modellhívás | 260 |
| ügynök (al-ügynök · workflow) | **0** |
| cache-olvasás | 93 070 474 token |
| cache-írás | 554 976 token |
| kimenet | 229 120 token |
| fő-szál kontextus mediánja | **369 287** |
| legnagyobb kontextus | 554 978 |
| 400 ezer feletti hívás | 111 |
| lefedettség | **teljes** (1 átirat, minden modell-válasz usage-dzsal) |

**A 200 000-es kísérleti mediánjelző ÁT VAN LÉPVE** (369 287), és ezt nem szépítem. Amit tettem és
amit nem:
- **a csomagot EGYBEN tartottam** — az R93 §7/1 ezt kérte, és a szétvágás új munkamenetet jelentett
  volna a szállítás közben;
- **egyetlen al-ügynököt sem indítottam** (ügynök-bemenet 0) — az R93 §7/3 tiltása szerint;
- az induló érték **125 005** volt, tehát a növekedés a csomag MUNKÁJÁÉ, nem örökölt teher (az előző
  munkamenet ugyanitt 756 112-nél KEZDTE);
- **a következő csomag friss munkamenetben induljon** — ugyanaz a szabály, ami ezt a kört elindította.

**A záró pillanatképen KÍVÜL eső szakasz kimondva (R93 §7/6):** a fenti számok a mérés pillanatáig
tartanak. Ami UTÁNA történik — a záró commit, a board-feltöltés és a válasz megírása — **nincs
benne**. Költséget és heti-limit-százalékot továbbra sem vezetek le; ismeretlen költség `null`, nem
nulla.

**A tartalommentes hívás-sorok MEGVANNAK ehhez az ablakhoz:** 260 sor, ellenőrizve, hogy a zárt
kulcs-listán kívül egyetlen szöveg-mező sincs bennük (se üzenet, se parancs, se eszköz-kimenet).
Ebből a külső fél maga újraszámolhatja az induló értéket és a növekedést, anélkül hogy a napló
modell-kontextusba kerülne.

Amit helyette megépítettem: a **képesség**. A `--calls` kapcsoló mostantól tartalommentes hívás-sorokat
ír fájlba, és **ez a csomag mérve van vele** — a következő körben ugyanez a kérdés már megválaszolható.
A záró pillanatkép ideje és a kimaradó publikálási szakasz a 7. szakaszban áll.

---

## 6. A bizonyíték — futási tanúkkal, nem fájlnevekkel (R93 §8)

Minden sor: **mit futtattam · mit mér · mi lett az eredmény.** Fájlnév önmagában nem tanú.

| Parancs | Hatókör | Eredmény |
|---|---|---|
| `npm run verify:app-findings-r93` | **ÚJ** — AST-05 blokk-válasz (elfogadás ÉS elutasítás), nyelv a blokk-úton, bemutató-életciklus, megnyitható forrás | **21/21 PASS** |
| `npx playwright test tests/e2e/v3app-r93.spec.mjs` | **ÚJ** — mind a 9 bemutató VÉGIGJÁRVA, nyelvi utak, forrás-megnyitás, „a túra nem állít műveletet" | **4/4 PASS** · a 9 verdikt mind `befejezve` |
| `npx playwright test` (teljes) | a teljes böngésző-csomag, 12 lap | **69/69 PASS** |
| `npm run verify:app-findings-r91` | az R91 hét javítása, élő HTTP + helyi csonk | **30/30 PASS** (a (g) pont az R93 §6 szerint ÁTÍRVA — lásd alább) |
| `npm run verify:kuka` | 235 tanulság gépi jelei, az archívum és az alapvonal | **446/446 PASS** |
| `npm run verify:tutor` | tudás-regiszter és bemutató-szerződés | **78/78 + 10/10 ellenpróba** |
| `npm run verify:assistant` | a segéd szabály-modulja | **54/54 + 6/6 ellenpróba** |
| `npm run verify:i18n` | nyelvcsomag-teljesség és feloldó | **41/41 + 5/5 ellenpróba** |
| `npm run verify:app-selfcheck` | a héj önellenőrzése | **57/57 PASS** |
| `npm run verify:fogyasztas-meres` | a mérő ellenpróbái (+ **ÚJ** FGY-T18 a hívás-sorokra) | **18/18 ZÖLD** |
| `npm run verify:hash-manifeszt` | **ÚJ** — a tartalom-azonosító determinisztikus, és egy bájtra reagál | **6/6 ZÖLD** |
| `npm run verify:decision-numbers` | a D-VS blokk | **4/4 PASS** |

**A feladat nélküli túra nem állít műveletet — VISELKEDÉSSEL mérve (R93 §4).** A regisztrációs
bemutató végigjárása után a próba lekérdezi a munkamenetet: `subject_id` **null**, a keret rejtve,
a belépés előtti képernyő látszik. Tehát a bemutató nem állítja, hogy a felhasználó regisztrált —
és ezt nem a felirat szövegéből következtetjük (KUKA-237).

**Az R91 (g) pont átírása — kimondva, nem csendben.** Az R91-es battéria (g) sora azt mérte, hogy a
formai szerződést teljesítő PRÓZA modell-válasszá válik. Az R93 §6 ezt kivezette. A sort ezért
**nem zöldre javítottam, hanem a MEGVÁLTOZOTT szerződésre állítottam**: ma azt méri, hogy a formailag
szabályos próza is nevezetten kiesik (`model_prose_unverified`), és a mondata nem jelenik meg. Az
ELFOGADOTT út mérése az új R93-as battériában áll. A többi 29 állítás változatlan.

**Amit NEM mértem, és ezért nem állítok:**
- **élő AI-hívás nincs.** A szolgáltatói ág helyi csonkkal mérve — ez a SAJÁT szerződésünket
  bizonyítja (mit fogad el és mit utasít el a szerver), nem azt, hogy egy valódi modell jól válogat.
  A helyi csonk **nem élő AI-bizonyíték**, és soha nem is neveztük annak;
- **a V2 `capability-witness` három eltérése érintetlen.** Az R93 §8 kimondta: „Ne csak a zöld jelért
  állítsátok át a katalógust." Nem néztem újra, nem módosítottam V2-t, és **nem** állítottam át a
  katalógust a zöld jelért. A söprésben ez `8/11 egyezik — 3 ELAVULT RÖGZÍTÉS` alakban látszik.

---

## 6/b. A TELJES SÖPRÉS — és a három sor, ami NEM zöld

`npm run verify:sweep` · **25 verifier · 1025 s · 22 ZÖLD · 0 env-kihagyás · 1 NEM FEJEZŐDÖTT BE ·
2 PIROS.** A három nem-zöld sort NEM mossuk össze, mert három KÜLÖN állapot (R93 §8):

**1) `verify:external-checks` — a söprésben NEM FEJEZŐDÖTT BE, KÜLÖN FUTTATVA VÉGIGMENT.** A
söprés 900 s-os türelme kevés volt; tiszta gépen a lánc **65 perc alatt teljes** lett
(`scope: full`, „MINDEN nyilvántartott program lefutott"). Az eredménye:

> **15/19 program MEGFELEL · 1 ENV-KIHAGYÁS (nevezett helyettessel: `r57` → `r57a`, zöld) ·
> ELTÉRÉS: `r79` · `r59a` · `r59`.**

**Ez ELTÉR a könyvelt előző futástól** (2026-09-23: `ok: true`, 17 zöld, 2 env-kihagyás), és ezt
nem hallgatom el. **Az OKOT megmértem, és a szám egyértelmű** — az `r79/U04` eset gépi eredménye:

| | |
|---|---:|
| külső korlát (`cap_ms`) | 15 000 ms |
| a 18 szelet falióra-ideje | 11 696 – 13 512 ms — **mind a külső korlát ALATT** |
| a `mutate.mjs` BELSŐ szelet-költségvetése | 12 000 ms |
| 12 000 ms fölé ment | 12 szelet a 18-ból |
| `run_state` · `clean` | `complete` · `true` |
| lefedettség | **204/204 · hiány 0 · duplikátum 0** |

Vagyis a **tartalom teljes és tiszta** — a szeletek a KÜLSŐ korlátot tartották —, de a `mutate.mjs`
saját, BELSŐ 12 000 ms-os költségvetését ez a futtató-gép nem bírja, ezért a szeletek `exit 1`-gyel
zárnak, és az eset ettől bukik. Ugyanez az `r59a/P01`-nél (462 s) és az `r59`-nél (a dokumentált
`spawnSync … ETIMEDOUT` alak, amire a testvér-programnál MÁR ÁLL bejelentett env-kihagyás).

**AMIT EBBŐL ÁLLÍTOK:** a három eltérés a futtató-gép sebességéhez kötött, és a mért tartalom
(204/204, tiszta) ezt alátámasztja. **AMIT NEM:** hogy a lánc „valójában zöld". A verdikt
`ok: false`, és úgy is marad a könyvelt bizonyítékban — a frissebb, TELJES futást tettem be a
régi, zöldebb helyére, mert a mérést nem a kedvezőbb eredmény szerint választjuk ki (KUKA-033).
A teendő a szerszám oldalán van: a költségvetést nem tágítjuk, a gép vagy a darabolás felülvizsgálandó.

**2) `verify:capability-witness` — PIROS, KIMONDOTTAN ÉRINTETLENÜL HAGYVA.** `8/11 egyezik —
3 ELAVULT RÖGZÍTÉS · 2 gépileg nem mérhető`. Az R93 §8 kikötése szó szerint: *„Ne csak a zöld jelért
állítsátok át a katalógust."* Nem néztem újra, nem módosítottam a V2-t, és **nem állítottam át a
katalógust**. Ez a piros tehát a KÉRT állapot, nem mulasztás.

**3) `verify:v3ref` — PIROS, de a MÉRÉS hiánya, nem tartalmi bukás — és megmértem, MIÉRT.**
A mutációs battéria a saját, egységenkénti idő-költségvetésébe (12 000 ms) nem fért bele, négy
egyre finomabb darabolás (9 → 18 → 36 → 72 egység) után sem. A szerszám maga mondja ki:
*„EZ NEM ZÖLD ÉS NEM PIROS TARTALOM: a MÉRÉS hiányos — a futtató-gép lassabb, mint amire a
darabolás méretezve van."*

**AZ OKOT MEGMÉRTEM, nem feltételeztem.** A söprés a 900 s-os türelemnél ELENGEDTE az
`external-checks` láncot, de az **nem állt le**: a folyamatfa tovább futott, és a `verify:v3ref`
mérése MELLETTE indult. A mért terhelés ekkor **10,85 volt négy magon** — vagyis a battéria a
saját idő-költségvetését egy két-három szorosan túlterhelt gépen próbálta tartani. Ez a KUKA-194
osztálya: a néma erőforrás-szivárgás hazuggá teszi a mérést. Az árva folyamatfa leállítása után a
terhelés **3,40**-re esett, és a láncot ÚJRA futtattam — az eredménye a következő pontban.

**A KÜLÖN FUTÁS EREDMÉNYE — ez a valódi mérés.** Az árva folyamatfa elmúltával (terhelés 3,40 →
0,62) a láncot újrafuttattam:

> `npm run verify:v3ref` → **RESULT: TELJES ÉS TISZTA — minden mutáció pontosan egyszer, minden
> egység belefér a korlátba.** · **204 mutáció · 204 elkapva · 0 túlélte · 0 rossz próba · 0
> mérőhiba · 0 elavult horgony** · lefedettség 204/204, hiány 0, duplikátum 0.

Tehát a söprésben látott piros **mérési** hiba volt, és a külön futás **megcáfolta** — nem
magyarázattal, hanem újramérve.

**AMIT EBBŐL NEM VEZETEK LE:** hogy a mag rendben van. A `v3ref/` **egyetlen fájlja sem változott**
ebben a körben — ez TÉNY, de az R93 §8 pont ezt tiltja meg bizonyítékként: *„A mag változatlansága
önmagában nem zöld újrafutás."* Amit a változatlanság ad, az annyi: a csomag nem érintette a mért
területet. A zöld újrafutást a külön mérés adja, nem ez.

---

## 7. A forrás-kötés: három KÜLÖN szám (R93 §8)

Az R93 kifogása jogos volt: a „36 változott fájl" nem azonosítja a mért bájtokat. Ezért három
külön dolog áll itt, és a harmadik szándékosan a végén:

| | |
|---|---|
| **forrás-indulás** | `43db6ba966de0b391bc19ee0037942837af79156` (az R93 átadó commitja; a parancs által vizsgált fej `ce38f823…` ennek a szülője) |
| **ág** | `claude/serene-bardeen-g7zzmv` |
| **a mért fájlkészlet tartalom-azonosítója** | lásd `var/reports/…_hash_manifeszt.json` → `tree_digest` (a `npm run hash:manifeszt` írja ki) |
| **a jelentést hordozó commit** | a lap feltöltése utáni commit — **ez a szám nem állhat a manifesztben**, mert a manifeszt a commit tartalma. A kettő együtt zárja a láncot. |

**Egy kikötés, ami NEM az enyém (R93 §7/1).** „A friss indulás követelménye a Board-parancsban is
szerepeljen, ne csak az operátori válaszban." A board-parancsot a chatgpt-v3 írja — ez a sor tehát
az ő oldalán teljesíthető. Amit én tudtam tenni, megtettem: az előző munkamenet INDULÁS ELŐTT
jelezte a korlátot és átadást hagyott, ez a kör pedig a munkamenet-azonosítót mérve igazolta.

A manifeszt hatóköre kimondott: `v3app` · `v3ref` · `contracts` · `tools` · `tests` · `migrations` +
`package.json` · `playwright.config.mjs`. Kimarad: `var/` (generált) · `node_modules/` · `.git` ·
`docs/_olvashato/` (származtatott). A `docs/` **nincs** a hatókörben — ezért ez a lap maga nem
változtatja meg a `tree_digest`-et, és a lánc zárható.

**A záró fogyasztási pillanatkép** a lap végén álló mérésből jön; ami UTÁNA történik (a commit, a
feltöltés és a válasz megírása), az **nincs benne** — ezt kimondjuk, nem hallgatjuk el.

---

## 8. Ami NYITVA marad — nevesítve, nem elrejtve

1. **Élő AI-mérés nincs.** A blokk-válasz útja valódi szolgáltatóval nem futott. Ez **külső hiány**
   (nincs engedélyezett szolgáltató), és helyi csonk nem pótolja. Mérés: `npm run kapcsolat:ai`.
2. **Az AI VÁLOGATÁSÁNAK minősége nincs mérve.** Az AST-05 azt garantálja, hogy a megjelenő mondat
   ellenőrzött forrásszöveg. Azt nem, hogy a legjobb szakasz jött. Ehhez élő modell és egy
   találati-minőség mérce kellene — ez a következő kör tétele lehet.
3. **A HU/EN/DE lektorálás nem teljes** (lásd 4.): egy hibaosztály van gépileg szűrve, magyarul.
4. **Az R91-es nyers napló nem elérhető** (lásd 5.) — a kért rekonstrukció ebből a körből nem adható.
5. **A meghívó elfogadásának képernyőjéről induló segítség** — az R93 §4 kérte, hogy ez maradjon
   nevesített részleges tételként, amíg az érvényes meghívó SAJÁT képernyőjéről nem használható.
   Ebben a körben nem épült meg: a kilenc végigjárt bemutató között nincs `tour.invite_accept`, és a
   `invite.accept` funkció `tour_note`-tal deklarálja a hiányt. **Marad nevesített részleges.**
6. **A V2 capability-witness három eltérése** (lásd 6.) — érintetlenül hagyva, az R93 kikötése szerint.

---

## 9. Hatókör — mit NEM tettem

Nincs újratervezés, nincs merge, nincs telepítés, nincs V2-módosítás, nincs új előfizetés, nincs új
üzleti Mini modul, nincs core-core/CMD/PR-zárás, nincs új szolgáltató-vásárlás és nincs második
drága modell-bíró. A magreferencia (`v3ref/`) **egyetlen fájlja sem változott**. A 16 elfogadott és
13 részleges/nyitott klauzula **nem készültségi százalék**, és az R19 24 QNT-követelménye változatlan.

**Döntés:** D-VS-3077. **Új tanulságok:** KUKA-240 · 241 · 242 · 243 · 244 (mind a regiszterben, az
archívumban és az őr-otthonban; mind `v3` otthonnal, tehát a jelük ITT fut).
