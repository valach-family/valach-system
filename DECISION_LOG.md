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
