> **Kör:** R137 · **Sáv:** Claude-v3 · **Állapot:** lezárt

# R137 — A történeti hatáskör és az alap eredet-kötése

`CMD-VS-300-002-002 R137 — REPORT` · 2026-10-02 · PR-VS-300 · STEP-VS-300-002
Repó: `valach-family/valach-system` · Végrehajtó: Claude-v3 · Tervező/ellenőrző: chatgpt-v3

**VÉGREHAJTOTT PARANCS:** `CMD-VS-300-002-002 R136 — ANALYSIS` (chatgpt-v3, 2026-10-01T19:34:57Z) —
*„Régi hatáskörtörténet és régi meghívó kizárása az új megadás után is"*.
**EZ A LAP:** `CMD-VS-300-002-002 R137 — REPORT` (a saját kör-számom).

> **A KÖRSZÁM-KEVEREDÉS HELYESBÍTÉSE (az R136 kikötése).** Az R135-ös lapom belseje
> „`R134 — REPORT`"-ot nevezett meg, és ezzel egy lezárt ANALYSIS-kört értelmezett át utólag
> REPORT-tá. Innentől a két szám KÜLÖN áll: a VÉGREHAJTOTT parancs az **R136 — ANALYSIS**, a
> válaszom az **R137 — REPORT**. Az R134 és az R136 ANALYSIS körök azok maradnak, amik voltak.

---

## 1. Közérthető eredmény

A külső ellenőrző fél az R135-ös csomagomat **nem fogadta el**, és KÉT olyan hibát mutatott ki,
amit a saját battériám zöldre írt. Mindkettőt **a mi kódunkon újramértem** — a javítás előtt
reprodukálható pirossal —, megjavítottam, és a teljes történet VÉGÉN is zölden hagytam.

**Mi volt a két hiba, üzleti nyelven:**

1. **A rendszer átírta a múltat.** Ha egy munkatárs új bírálati hatáskört kapott, akkor a „volt-e
   joga tavaly ehhez?" kérdésre a rendszer onnantól **NEM**-et mondott — holott akkor volt joga. Egy
   bírálat vagy egy régi döntés jogszerűségét így nem lehetett volna visszanézni.
2. **Egy visszavont meghívó feléledt.** Ha valaki kilépett és később visszatért a céghez, akkor a
   KILÉPÉSE ELŐTT kiadott, már érvénytelenített meghívói **újra beváltathatóvá** lettek, amint az
   illető az új belépése után kiadott egy új meghívót. Vagyis egy régi hivatkozással idegen ember
   tagságot kaphatott volna.

**Mind a kettő javítva, és mind a kettőre MÉRT előtte/utána tanú áll** (§3–§4). Emellett
**megtaláltam egy saját hibát is**: az első javításom egy MŰKÖDŐ védelmet vakított meg (§5).

---

## 2. Amit VISSZAVONOK az R135-ös elfogadási sorokból

Az R136 kifejezetten ezt kérte: *„A jelentésben az eredeti A132-05/06 történeti és régi
eredet-kizárási állításait helyesbítsd."*

| Állítás | Amit az R135 írt | Amit MÉRVE állíthatok |
|---|---|---|
| **A132-05** (a régi jogalap nem él tovább) | „a régi megadás TÖRTÉNETILEG érvényes marad (új, append-only napló)" | **TÚL ERŐS volt.** A naplót megépítettem, de EGYETLEN OLVASÓ SEM olvasta — a történeti kérdés továbbra is a mai vetületből dőlt el. A napló MEGLÉTE nem bizonyíték a HASZNÁLATÁRA (KUKA-271). |
| **A132-05** (a régi eredet kizárása) | a régi delegált jogalap és a régi kiadott meghívó „nem éled fel" | **RÉSZBEN ÁLLT.** A régi meghívó az ÚJ belépés után valóban zárt — de amint a kiadó az új időszakban ÚJ alapot képzett, a régi token ismét tagságot adott. A kizárás csak a mérés SORRENDJE miatt látszott teljesnek (KUKA-272). |
| **A132-06** (azonos időbélyeg, két ciklus) | a két ciklus tanúja zöld | **ÁLL, de HIÁNYOS volt a hatóköre:** a történeti kérdést egyik ciklus sem tette fel a VÁLTOZÁS UTÁN. A tanú most mindkét helyen áll (§6). |
| **Az R135 §4 „két ÚJ eltérés"** (r83core · r57a) | „KETTŐ ÚJ" a 2026-09-26-i tárolt alapvonalhoz mérve | **EZ NEM REGRESSZIÓ-ÁLLÍTÁS.** Az R136 joggal kötötte ki a szétválasztást: a KÖZVETLEN kiinduló állapot (`df79358a`) könyvelt eredménye MÁR hordozta mind a kettőt. Lásd §7. |

---

## 3. F136-01 — Az új hatáskör-megadás nem írja át a múltat (AHI-01)

**A LELET (megtalálta: chatgpt-v3).** Az `authorityRowAt` a MAI vetületből (`adjudication_authority`)
olvasott, aminek a kulcsa alany × könyv × művelet — tehát **EGY sor**. Egy szabályos ÚJ megadás ezt
felülírja (`granted_at`, `period_grant_event_id`), és ezzel a RÉGI időszak BELSEJÉRE adott válasz is
megváltozott.

**ELŐTTE / UTÁNA — ugyanaz a kérdés, változatlan termékkódon:**

| | `ok` | `period_binding` | `current_period` / `reason` |
|---|---|---|---|
| az új megadás **ELŐTT** | `true` | `stamped` | `15` |
| az új megadás **UTÁN** | `false` | — | `authority_not_yet_effective` |

A naplóban ekkor **MINDKÉT** megadás ott állt (15-es és 16-os időszakkal) — a döntés csak nem onnan
jött. Ez a mért alak **karakterre** az, amit az R136 §F136-01 leírt.

**A JAVÍTÁS.** Új, semleges feloldó (`v3ref/authorityHistory.mjs` → `authorityGrantAt`) a NAPLÓBÓL
választja ki a kérdezett időpontra illeszkedő megadást, **KÉT tengelyen**: `granted_at <= validAt`
(HATÁLY) **és** `recorded_at <= knownAt` (TUDÁS). Az `authorityRowAt` ezt hívja. A mai vetület
**gyorsítótár maradt, de nem a múlt egyetlen forrása.**

**A HATÓKÖR GENERÁCIÓNKÉNT KIMONDOTT** (ez a §5-ös saját leletem következménye):

| `source` | mit jelent |
|---|---|
| `projection_live_generation` | a megtalált esemény UGYANAZ a generáció, amit a vetület hordoz ⇒ a **VETÜLET** sora az operatív (a nyers írás és a megvonás LÁTSZIK) |
| `grant_log_superseded_generation` | a megtalált esemény KORÁBBI, felülírt generáció ⇒ a **NAPLÓ** sora az operatív |
| `projection_only_no_log` | napló nélküli, CSAK vetületben álló történeti megadás (R134 ELŐTTI alak) — **KIMONDOTT** kompatibilitási ág, nem néma tartalék |

A napló↔vetület ellentmondása (napló-esemény + hiányzó vetület) **nem engedély**:
`authority_record_diverged`, és ZÁR.

**A KÖTELEZŐ TANÚ, tételesen** (mind a `findings_r134` B szakaszában):

| lépés | mit mér | mért eredmény |
|---|---|---|
| (b2) | régi időszak: a hatáskör végrehajtható | `ok:true` |
| (b4) | köztes megszűnés / új időszak új megadás ELŐTT | `ok:false · authority_other_period` |
| (b5) | a régi időszakra kérdezve MA is fennállt | `ok:true` |
| (b6) | ÚJ, kifejezett megadás után a MAI időszakban működik | `ok:true` |
| **(b5b)** | **…és EZUTÁN IS a régi igen** | `ok:true` · `stamped` (előtte `true` → utána `true`) |
| **(b5c)** | **az ÚJ jog MEGVONÁSA után a MA zár, a MÚLT változatlan** | ma `false · authority_revoked` · régi `true` |
| **(b5d)** | **külön hatály-/tudásidő, azonos időbélyeggel** | megadás előtti tudás `false · authority_not_yet_effective` · azonos időbélyeg `true` |
| **(b5e)** | **NEGATÍV KONTROLL**: a vetület KÉSŐBBI megadást hordoz és MA ismert, a válasz mégis a RÉGI megadást adja | `superseded:true` · `source: grant_log_superseded_generation` · `granted_at` = a RÉGI ≠ a vetületé |
| **(b5f)** | **a történeti kompatibilitási ág célzottan** (napló törölve) | `ok:true` · `axis: projection_only` · `source: projection_only_no_log` |

A **második ciklus** és a három időszak tanúja az E szakaszban áll változatlanul (e1–e5), a (b7f)
pedig a HARMADIK időszakot is végigviszi.

---

## 4. F136-02 — Az új alap nem igazolja újra a régi időszak ajánlatát (AOR-01)

**A LELET (megtalálta: chatgpt-v3).** A `delegationBasisId` az alapot **alany × könyv** azonosságon
képzi (`deleg:<könyv>:<alany>`), tehát egy megszűnt és ÚJRA megszerzett tagság **ugyanazt az
azonosítót képzi újra**. A beváltási kapu KÉT mérése együtt sem zárta: a kiadáskori mérés a pecsételt
RÉGI verziót találja meg és elfogadja, a mai mérés pedig csak azt kérdezi, hogy az AZONOSÍTÓ ma
hatályos-e — és az igen volt, egy MÁS eredetű generáció miatt.

**ELŐTTE / UTÁNA — ugyanaz a régi token:**

| | válasz | tároló-hatás |
|---|---|---|
| **ELŐTTE** (a javítás nélkül, (b9) után) | `ok:true · shape:membership_only · outcome:granted` | `membership` 15→16 · `membership_grant` 19→20 · `grant_basis` 10→11 |
| **UTÁNA** | `ok:false · basis_origin_changed` | **nulla új sor** |

**A JAVÍTÁS: EREDET-KÖTÉS, nem verzió-egyenlőség.** Az `authority_basis` generáció mostantól
hordozza, MELYIK tagsági időszakból származik (`origin_grant_event_id`); a képző
(`deriveDelegationBasis`) adja a `parent.grant_event_id`-ből — a hívó nem állíthatja be.

**Miért nem a verzió a mérce (kimondva):** a beváltási kapu a verziót szándékosan a KIADÁS idejére
méri, mert az R64 (H06/H07) kimondta, hogy az alap későbbi, **jogos bővítése** ne zárja a már kiadott
meghívót. A verzió MAI egyenlőségének követelése tehát **falat csinálna a kapuból** (KUKA-122). A
megkülönböztető tény az **EREDET**: ugyanazon az időszakon belüli újra-rögzítés (bővítés) átmegy,
az időszak-határon átnyúló ÚJRA-KÉPZÉS zár. **Dátum-heurisztika nincs**, és a tesztcímzettet sem
tiltottuk le.

**RÉGI ESEMÉNYT/PECSÉTET NEM ÍRTUNK ÁT** (az R136 kikötése): az eredetet a **pecsételt verzió MÁR
LÉTEZŐ sorából** olvassuk ki (`basisOriginOfVersion`), nem a pecsétből.

**UGYANAZ A KAPU MINDKÉT ÚTON** (az R136 kikötése a „további jogosultságok feléledésére"): a
beváltási úton (`redemptionLimitGate`) **és** a bírálati úton (`adjudicationLimitVerdict`) is —
egy szabály, két belépési pont (KUKA-039).

**A KÖTELEZŐ TANÚ, tételesen:**

| lépés | mit mér | mért eredmény |
|---|---|---|
| (b7) | a régi token zár KÖZVETLENÜL az új belépés után | `ok:false` · nulla sor |
| **(b7b)** | **…és az ÚJ alap / ÚJ meghívó MŰKÖDÉSE UTÁN is** | `ok:false · basis_origin_changed` · nulla sor |
| **(b7c)** | **a token NEM fogyott el, és nincs MÁS jog sem** | az ok VÁLTOZATLAN (nem „már beváltva") · `redeemed_at: null` · adatkörjog `false` · nulla sor |
| (b9) | **POZITÍV ELLENPÁR**: az ÚJ időszakból kiadott valódi ajánlat MŰKÖDIK | `ok:true` · a tagság élő |
| **(b7d)** | **ELŐFELTÉTEL + hatókör kimondva**: a delegálási alap a BÍRÁLATI úton fogalmilag sem használható | `outside_basis_operations` · az eredetek: `v1=15 · v2=16` |
| **(b7e)** | **a RÉGI generáció alatt adott MÁS jog sem éled fel** az ÚJ, más eredetű generációtól | `ok:false · basis_origin_changed` |
| **(b7e2)** | **POZITÍV ELLENPÁR ugyanazon a kapun**: a MAI generáció alatt adott ugyanaz a jog végrehajtható | `ok:true` |
| **(b7f)** | **MÁSODIK CIKLUS**: a 2. időszakból kiadott ajánlat a 3. időszakban sem éled fel, az ÚJ pedig működik | időszakok `15 → 16 → 23` · új `ok:true` · régi `ok:false · basis_origin_changed` · nulla sor |

**EGY HATÓKÖR-ÁLLÍTÁS, AMIT KIMONDOK, nem mosok össze:** a bírálati úton az eredet-kapu
**ELŐVIGYÁZATOSSÁG**, nem ma elérhető élő hiba. Mérve: a delegálási alap korlátja kizárólag
`invite_issue`, tehát `adjudicate`-et engedő, EREDETHEZ KÖTÖTT alap a mai termékben nem keletkezik —
a (b7e)/(b7e2) tanút ezért a termék SAJÁT alap-íróján (`recordAuthorityBasis`) állított fixtúra
viszi, és ezt a lépés fejléce megmondja (KUKA-033 · KUKA-216).

---

## 5. A SAJÁT leletem — a javításom megvakított egy működő őrt (KUKA-273)

**Ezt nem a külső fél találta meg, hanem a saját söprésem, és ki kell mondanom.** Az F136-01
javításának ELSŐ alakja az `authorityRowAt`-ot **MINDIG** a naplóból szolgálta ki, és a mai vetületet
teljesen kihagyta. A cél-lelet ezzel zöld lett — de a mag SAJÁT próbája, a
`P-ORG-adjudication-basis-limit`, **PIROSRA váltott**: az NYERS
`UPDATE adjudication_authority SET basis_version = NULL | 999 | 'nem-szam'` írásokkal ellenőrzi, hogy
a HASZNÁLATI kapu a megcsonkított alap-hivatkozást elutasítja. A napló ezeket a nyers írásokat nem
látja, tehát a kapu **némán átengedte volna mindhárom alakot.**

**Ez a KUKA-013 ismétlődése a javítás oldalán** („az őr, ami csak az egyik írót ismeri, nem őr") — én
egy MŰKÖDŐ őrt vakítottam meg azzal, hogy a döntés forrását egyetlen íróra szűkítettem. A két
követelmény nem ütközik; én mostam össze őket azzal, hogy egy forrást VÁLASZTOTTAM a kettő helyett.
**És a cél-lelet zöldje ELFEDTE a szomszéd-regressziót** — pontosan ezért nem elég a cél-verifier
(D-VS-406 · KUKA-200).

A javítás a §3-ban álló, generációnkénti hatókör. **Három KUKA-bejegyzés született** (regiszter +
archívum-tábla + őr-otthon, mind gépi jellel): **KUKA-271** (a nem olvasott napló) · **KUKA-272** (az
időszak nélküli alap-azonosság) · **KUKA-273** (ez a saját lelet). Döntés: **D-VS-3092**.

---

## 6. A mérés SORRENDJE is állítás — a két tanú mindkét helyen áll

Az R136 pontosan megnevezte a mérési hibát: a (b5) a (b6) ELŐTT futott, a (b7)/(b8) pedig a (b9)
ELŐTT — tehát egyik sem mérte a VÁLTOZÁS HATÁSÁT. **A teljes mérés most MINDKÉT helyen áll:** az
eredeti lépések változatlanok, és utánuk ott a változás utáni tanú is.

**A FELÜLETI (késői-válasz) TANÚ MEGERŐSÍTVE** (R134-B3, az R136 kikötése szerint; önálló új
UI-projekt nem indult, az R131 észlelési határa változatlan):

- **a negatív állítás** eddig csak a régi cím hiányát nézte a `main` szövegében — ez ANNÁL IS igaz,
  ha a nyugta egyáltalán nem született meg. Mostantól a tanú a **KONKRÉT régi nyugta**
  (`inviteRevoked` / `reinviteSent` / `reinviteReplayed`, a cél e-mail-címére feloldva) **és az ÚJ
  kontextus VÁLTOZATLANSÁGA** (a fejléc a MÁSODIK fiókot mutatja);
- **a pozitív kontroll** eddig csak „nem üres" volt — ami egy HIBAÜZENETRE is zöld. Mostantól a
  **VÁRT nyugtát** igazolja; az újrahíváson a két MEGENGEDETT alak (új ajánlat VAGY `reinviteReplayed`
  ismétlés, OON-01) **kimondott**, és más mondat nem fogadható el.
- **ÉS A MEGERŐSÍTÉST FALSZIFIKÁLTAM, nem állítottam.** Két célzott rontás, mindkettő **PIROS**:
  (a) a pozitív nyugta várt címzettjét elírva a próba elbukott; (b) a negatív állítást megfordítva
  („a régi nyugta legyen kint") a próba elbukott. A rontások visszavonva, `git diff`-fel
  visszaellenőrizve, maradvány nincs (KUKA-126).
- **Egy SAJÁT próba-hiba is kiderült itt:** az első alakom egyszeri `textContent()`-tel olvasott, és
  ÜRES sztringet kapott, mert a nyugta még nem volt kirajzolva — a régi, üres-ellenes állítás épp
  azért nem bukott el, mert automatikusan újrapróbálkozott. A mérés most VÁR a nyugtára (KUKA-228).

---

## 7. Mérések — FRISS, ÖRÖKÖLT és KIHAGYOTT, szétválasztva

**FRISS (ezen a csomagon, a záró forráson):**

| mérés | eredmény |
|---|---|
| `findings_r134` (a cél-battéria) | **57/57 PASS** — az R135-ös 46-ról **+11 új tanúval**; a két reprodukció a javítás ELŐTT **PIROS** volt |
| `findings_r132` | **64/64 PASS** |
| mag-battéria (`node v3ref/run.mjs`) | **66/66 PASS** (benne a `P-ORG-adjudication-basis-limit`, ami a §5-ös leletet MÉRTE) |
| `verify:kuka` | **553/553 PASS** (KUK01 · KUK02 · KUK03 · KUK04 · KUK05 · KUK06 · KUK07) |
| Playwright `v3app-r134.spec.mjs` | **5/5 PASS**, a két falszifikációval együtt |
| `findings_r121 · r123 · r125` | 55/55 · 47/47 · 29/29 |
| `findings_r75 · r77 · r79 · r89 · r91 · r93 · r95` | 73/73 · 34/34 · 49/49 · 41/41 · 30/30 · 21/21 · 42/42 |
| `app:selfcheck` | **57/57 PASS** |
| bemutató-generálás (`npm run bemutato:onallo`) | lefut; a kimenet **két futáson azonos** (`d81fd94c…`) |

**A MUTÁCIÓS BATTÉRIA — és egy SAJÁT lelet, amit ő talált meg.** A horgonyok a módosított
`v3ref/authority.mjs` és `authorityBasis.mjs` fájlokra mutatnak, ezért a battériát le KELLETT
futtatni (lásd alább, miért nevezett kockázat). Három dolgot mért:

1. **ELAVULT HORGONY** — az `M51` a `authority.mjs`-beli hatáskör-lekérdezésre horgonyzott, ami az
   `authorityHistory.mjs`-be költözött. **Áthorgonyozva** (a mutáció SZÁNDÉKA változatlan); elavult
   horgonyt nem hagyunk, mert az „nem mértünk ott" állapot, nem zöld (KUKA-200).
2. **NÉGY ÚJ RONTÁS a most épült kapukra** (KUKA-009): `M332` (a művelet-szűkítés kivétele a
   naplóból) · `M333` (a TUDÁS tengelyének kivétele) · `M334` (az ÉLŐ generáció vetületének
   kivétele — a KUKA-273 visszacsúszása) · `M335` (az EREDET-KAPU kivétele a beváltáson — az
   F136-02 visszacsúszása). Az `M334` fogó próbáját **MÉRTEM, nem tippeltem**: az első alakom
   `WRONG_CATCHER`-t kapott.
3. **AZ `M333` TÚLÉLTE — és ez VALÓDI fedezet-hiány volt.** A tudás-tengely szűrőjének
   (`recorded_at <= knownAt`) kivételét **egyetlen mag-próba sem buktatta meg**: a `knownAt`
   elhagyása a mai viselkedés, tehát a tengelyt KIFEJEZETTEN szét kell vinni ahhoz, hogy a rontás
   megbukjon — és ezt eddig csak a HTTP-battéria (b5d) tette, a mag nem. **A `P-ORG-reentry-gates`
   mag-próba ezért megerősítve:** megkapta a történeti kérdést az ÚJ megadás UTÁN is (ott
   UGYANAZ a sorrend-hiba állt, amit a külső fél a testvér-battérián talált meg), és megkapta a
   tudás-horizont két állítását. **A mag-battéria ezzel is 66/66.**

**A TELJES HOSSZÚ SÖPRÉS NEM FUTOTT, és ez KIMONDOTT döntés, nem feledékenység.** Az R136 így
kötötte ki: *„Célzott domain/HTTP/történeti/érintett UI kontrollok elegendők… Teljes hosszú söprést
csak tényleges helyi kapu vagy konkrét keresztmetszeti kockázat indokoljon."* Egy keresztmetszeti
kockázatot viszont MEGNEVEZTEM és le is mértem: a mutációs battéria horgonyai a módosított
`v3ref/authority.mjs` és `v3ref/authorityBasis.mjs` fájlokra mutatnak, és egy elavult horgony „nem
mértünk ott" állapot, nem zöld (KUKA-200).

**A TÖBBI RÖVID ŐR:** `verify:unit-admission` · `verify:decision-numbers` · `verify:i18n` ·
`verify:tutor` · `verify:doc-html` · `verify:artifact-naming` · `verify:assistant` ·
`verify:child-runner` · `verify:external-decisions` · `verify:fogyasztas-meres` ·
`verify:hash-manifeszt` · `verify:grant-paths` · `verify:release-order` · `verify:sweep-reuse` ·
`verify:sweep-verdict` — **mind ZÖLD**.

**EGY PIROS, ÖRÖKÖLT — ÉS MÉRVE, NEM FELTÉTELEZVE:** `verify:capability-witness`
**8/11 egyezik — 3 ELAVULT RÖGZÍTÉS** (`v3-ui-slice` · `v3-vertical-slice` ·
`v3-user-facing-text`: mért `present`, rögzített `absent`) · 2 gépileg nem mérhető (kimondva). A
rögzített oldal a **V2 repóban** él (`../vs/tools/chatops-board/config/matrix-capabilities.json`),
tehát a javítása V2-módosítás volna — amit a SPEC kizár.
**A VISZONYÍTÁST LEMÉRTEM:** a `df79358a` commitot külön munkafában kijelentkeztetve, a V2 repóval
ELÉRHETŐ helyen, a kimenet **karakterre ugyanez** (8/11, ugyanaz a három sor) — tehát **örökölt, nem
ennek a csomagnak a műve**. *(Közben egy MÉRÉSI csapdába is beléptem: az első munkafát olyan útra
tettem, ahonnan a `../vs` NEM látszik, és ott a verifier zöldet adott — mert a három tételt
„gépileg nem mérhetőnek" sorolta. Egy zöld, ami a mérés HATÓKÖRÉNEK szűküléséből jön, nem zöld
(KUKA-216); ezért kellett a sibling-munkafa.)*

**ÖRÖKÖLT — a KÖZVETLEN kiinduló állapothoz mérve (az R136 kikötése):** a `df79358a` commitban
KÖNYVELT `external-checks-result.json` (mérve 2026-10-01T18:26:28Z) verdiktje
`{ok:false, green:13, of:19}`, és **MÁR HORDOZTA** az alábbi hat eltérést: `r83core`
(`spawnSync ETIMEDOUT`) · `r57a` (`E02, E03`) · `r79` (`U04, U01, U03`) · `r59a` · `r59` · `r57`.

**Ez azt jelenti, hogy a `r83core` és a `r57a` eltérése NEM ennek a csomagnak a regressziója.** Az
R135-ös jelentésem ezt a kettőt „ÚJ"-nak nevezte egy 2026-09-26-i tárolt alapvonalhoz mérve; az R136
joggal mondta ki, hogy ez nem bizonyítja, hogy abban a csomagban keletkeztek. A két viszonyítási
pontot innentől szétválasztom, és a KÖZVETLEN kiinduló állapot az irányadó.

**A KÜLSŐ ADAPTÁCIÓ ELKÜLÖNÍTETT EREDMÉNYE:** lásd §8.

---

## 8. A külső tanúk (r57a · r83core) — a kapott adaptációs hozzájárulás

**A HOZZÁJÁRULÁS HATÁRA, ahogy az R136 kimondta:** falióra alapján mért/adaptív szeletelés — az
eredeti esetek, állítások, mutációk és a teljes lefedettség változtatása **nélkül**. *Nem* engedély
a kritériumok enyhítésére, esetek kihagyására, hibák zöldre írására vagy korlátlan ismételt teljes
söprésre. Ezt a határt tartom.

### 8.1 Amit MÉRTEM — az ok, nem a tünet

**r57a (`r57_chatgpt-v3.adapted.mjs`), a csomag ELEJÉN, az adaptáció ELŐTT, ezen a futtatón:**

- 9 esetből **7 zöld**, és **E02 · E03 ELBUKOTT**;
- az ok a rekordban, szó szerint: `Error: spawnSync /opt/node22/bin/node ETIMEDOUT` ·
  `at runBatteryUnits (…/r57_chatgpt-v3.adapted.mjs:67:13)`;
- futásidő: **180 s** · `RESULT: 0/1 program MEGFELEL — ELTÉRÉS: r57a · RÉSZLEGES FUTÁS`.

**A MECHANIZMUS, és ez a lényeg:** a darabszám a **MUTÁCIÓK SZÁMÁBÓL** képződik
(`max(6, ceil(233/24))`), a korlát viszont **FALIÓRA** (15 000 ms/egység). A két mérce nem ugyanaz:
ezen a futtatón egy 1/10 szelet a korlát fölé esik, tehát a program a MÉRÉS ELŐTT hal meg — a
termékről semmit nem mond. **Ez „ELAKADT MÉRÉS", nem termékhiba és nem is megfelelés.**

**ÉS EZ EGY SAJÁT, R135-ÖS ÁLLÍTÁS HELYESBÍTÉSE:** azt írtam, hogy *„a hívó a battéria
növekedésével magától finomodik"*. **MÉRVE NEM ÁLL:** mutáció-számra finomodik, faliórára nem.

### 8.2 Az adaptáció MEGÉPÜLT, MÉRVE ROSSZABB LETT, és KIVEZETTEM (KUKA-274)

**Megépítettem**, pontosan a kapott határok között: időtúllépésen finomabbra osztunk (`n *= 2`),
legfeljebb 4 próbálkozás; az egy egységre jutó korlát **MARAD 15 000 ms**, a lefedettség
változatlan, és a plafonon a hiba továbbdobódik.

**Aztán megmértem — és ez a lényeg:**

| | futásidő | eredmény | részletes artefaktum |
|---|---|---|---|
| **adaptáció ELŐTT** | **180 s** | 9-ből **7 zöld**, E02 · E03 a per-egység korláton | **MEGSZÜLETETT** |
| **adaptáció UTÁN** | **600 s** | a futtató **PROGRAM-SZINTŰ** korlátján (`run-all.mjs`, 600 000 ms); „a kimenet nem értelmezhető eset-listaként" | **NINCS** |

**A javításom elvitte azt a részeredményt is, ami addig megvolt.** Ezért **KIVEZETTEM**: a program a
mért kiinduló alakjában áll — `sha256:7f54483d35b8023d1b0d408d88c3240f69607436e82c2eb538c470a00d227723`,
**bájtra azonos a `df79358a`-val**.

**AZ OK, kimondva.** Itt **nem egy szelet** lép túl, hanem a battéria **teljes költsége × ahány eset
meghívja** — és az újraindításos finomítás ezt még **meg is többszörözi**. A finomítás a per-egység
túllépést gyógyítja; a teljes költséget nem. **A hozzájárulás a szeletelés IRÁNYÁRA szólt; én ezt
elfogadásnak vettem arra is, hogy a szeletelés MEGOLDJA a problémát — a kettő két külön állítás.**

**EGY SZÁMOT ITT HELYESBÍTEK A SAJÁT MENET KÖZBENI ÉRVELÉSEMBEN IS.** Közben azt gondoltam, a
battéria teljes költsége önmagában ~550 s. **Terhelés nélkül megmérve: 113 s** (233 mutáció,
`--units-auto`). Tehát nem a battéria „drága" — a 600 s-ot az **újraindítás-halmozás** és a
többszöri hívás adta. A korábbi ~550 s-os becslésem egy **terhelés alatti** részfutásból
extrapolált, és ezért rossz volt.

**AMI NYITOTT MARAD, NEVEZETTEN:** a battéria teljes költsége vs. a **FUTTATÓNK** per-program
türelme (600 000 ms). Ez a **mi harness-paraméterünk, nem a külső fél kritériuma** — a megemelése
külön döntés, amit ez a kör **nem hoz meg**. Az R136 kikötötte, hogy ez a mérési rész a két
termékhiba javítását ne akassza meg: nem is akasztotta.

**A VISSZAKÖVETHETŐSÉG (az R136 kérése), a kivezetéssel együtt:**

- **eredeti** (`r57_chatgpt-v3.mjs`, ÉRINTETLEN): `5ce2ad7bafd1ca0154a580c1673259586b75e086efb53d130ada1336b6b490e5`
- **adaptált, MA érvényes** (`r57_chatgpt-v3.adapted.mjs`): `7f54483d35b8023d1b0d408d88c3240f69607436e82c2eb538c470a00d227723` (= `df79358a`)
- **a kivezetett próbálkozás** lenyomata: `798f89cb0f8cbb7aa4dae8a6e3d165fd892f160f6be6d593c4dc0c09410d3dbc`
- a bővítés, a MÉRT oka és a nyitott maradék a `case-manifest.mjs` `r57a` →
  **`retired_adaptation`** blokkjában áll (`what` · `granted_by` · `measured` · `why_retired` ·
  `open_named`), gépi jellel — tehát nem csak ebben a jelentésben.

### 8.3 r83core — a mért ok MÁS, és ezért nem ugyanaz a javítás

Az `r83core` **már ma is falióra szerint finomít** (`UNITS *= 2` időtúllépésen) — tehát a kapott
hozzájárulás itt nem hiányzó képességet pótolna. A MÉRT ok más: a per-egység spawn-korlát
**300 000 ms**, tehát egy lassú szelet **300 s-ot éget el**, mielőtt a meglévő finomítás egyáltalán
észreveszi; `UNITS_START` = 18, a futtató per-program türelme pedig 600 000 ms.

**Ezért itt NEM építettem bővítést.** A KUKA-274-es tanulság közvetlenül ide is szól: ugyanaz a
program-szintű türelem a kötő korlát, és azt egy szeletelési változás nem oldja meg. Az `r83core`
eltérése a **KÖZVETLEN kiinduló állapot örökölt** eltérése (`df79358a`: `spawnSync ETIMEDOUT`), és
**ebben a csomagban nem változott**. A hiányos futás **HIÁNYOS marad** — nem írom zöldre, és nem is
magyarázom el.

## 9. A megnyitható bemutató — a link KÖZVETLENÜL itt

**https://claude.ai/artifact/TXyfhHTQrHopg771pSW3sV**

Forrás a repóban: `docs/bemutato/V3_R134_MEGHIVO_ES_UJRABELEPES_BEMUTATO.artifact.html` ·
generálás: `npm run bemutato:onallo`.

**A LENYOMATOK, MÉRVE (és egy eltérés, amit NEM magyarázok el):**

- a forrás-fájl sha256: `eeb082ca328828992f68777395afd6405c5013d50b41b199e05663c13690d4a9` — és ez a
  fájl **bájtra azonos** a `df79358a` (R135 zárása) állapotával, tehát ez a csomag nem nyúlt hozzá;
- a generált önálló HTML sha256: `d81fd94cfd9a7eaff43231c4a93e73b043f734068d0667d7d4ba7d1a0f4bf435`,
  **két egymás utáni futáson azonos** (csak a fájlNÉV hordoz időbélyeget);
- **az R136-ban közölt `0896496db…` forrás-SHA-256-ot NEM reprodukáltam** — se a forrásra, se a
  kimenetre. Nem tudom, milyen alakon mérték, és nem találok ki rá magyarázatot: ez **nevezett nyitott
  eltérés**, nem elhallgatott különbség. A közzétett CÍM viszont karakterre egyezik.

**A bemutató SZIMULÁCIÓ** — a mért HTTP- és tároló-bizonyíték a `findings_r134` battériában áll (§3–§4).

---

## 10. Határok és állapot

**Nincs** merge, éles telepítés, V2-módosítás, külső címzettnek levél, fizetős szolgáltatás, és
**nincs** core-/CMD-/PR-zárás. A **req-5** kötelezővé emelése továbbra is külön, független döntés, és
NEM lépett életbe. Újabb munkát nem állítottam vissza: a csomag a `df79358a`-ból indul, ami 161
commit-tal előrébb volt, mint a kijelölt ág induló feje (a `main`) — az ág **gyors-előretolással**
(`--ff-only`) került a helyes leszármazásra, tehát egyetlen commit sem esett el.

**Egy végrehajtó, automatikus ügynök-munka nélkül** (ügynök-bemenet: **0**, 0 ügynök — mérve).

**Ág:** `claude/cmd-vs-300-002-002-r136-7hjq1z` · **induló fej:**
`df79358a729583e089e99ee29a3b67ebafca7098`

---

## 11. Fogyasztás

**A csomag ablaka** (a parancs board-időbélyegétől, `2026-10-01T19:34:57Z`, a zárásig), mérve
`npm run meres:fogyasztas -- --session auto --from … --quick`:

- munkamenet `312ad18b` (`env:CLAUDE_CODE_SESSION_ID`) · **hívás: 150**
- fő-szál kontextus **medián 266 924** / max 375 226
- **ügynök-bemenet: 0** (0 ügynök)
- cache-olvasás 38 672 016 [teljes összeg] · **lefedettség: teljes**
- **kontextus-sáv: normál folytatás** (266 924 < 300 000) — tehát **chatváltás nem szükséges**, és
  ezt nem is kérem

**Kumulatív KÜLÖN:** ez a beszélgetés EGYETLEN csomagot szolgált ki, tehát a kumulatív munkamenet
ugyanezt a halmazt fedi — a különbség **nulla**, és ezt kimondom, nem elhallgatom.
