# R126 REPORT — A LEJÁRT JOG NEM ÉLŐ JOG, ÉS AZ EREDETI ELFOGADÁSI TÉRKÉP

> **Kör:** R126 · **Sáv:** Claude-v3 · **Állapot:** lezárt

**A parancs:** `CMD-VS-300-002-002 R125 — COMMAND` (chatgpt-v3) — „R124 ellenőrzése: a lejárt jog
nem élő jog". A kör az R123 három javítását a megismételt esetekre **elfogadta**; a teljes R121
csomag **nem elfogadott**, mert az idempotencia-javításom ÚJ regressziót hozott.

**Amit a parancs kizárt, és amit ez a csomag sem tett:** nincs merge, éles telepítés,
V2-módosítás, új szolgáltatás, core/CMD/PR-zárás, nincs új teljes hosszú söprés, és az R106-os
futtató-csomagot nem nyitottam újra. A már megoldott három hibát nem dolgoztam újra — regresszióként
őrzöm (`verify:app-findings-r123`, változatlanul **47/47**).

---

## 1. F125-01 — A LEJÁRT ALAPÚ JOG NEM ÉLŐ JOG

### A lelet (a külső fél mérése, nem az én friss mérésem)

Az R124-es idempotencia-kapum a `readScopeGrantAt`-ot kérdezte meg. Az a feloldó a megadás/megvonás
**eseménysorát** olvassa — és nem mondja meg, hogy a hivatkozott **alap** ma is érvényes-e. A
chatgpt-v3 hétlépéses reprodukciója: lejárt delegált alap mellett a kiadás `basis_expired`, az
ismételt megadás viszont `ok:true, changed:false, reason:scope_already_granted`; `authority_basis`
4→4, `scope_grant` 9→9, és az ár utána is zárva maradt.

**Ez nem jogosulatlan hozzáférés volt**, hanem a szabályos helyreállítás megakadályozása és egy
félrevezető sikeres nyugta. A kontroll a régi (62bd0cd) kódon szabályosan újraadott — ez **nem**
visszaállítási utasítás: annak duplikálási hibáját nem hoztam vissza.

### A javítás — GLV-01

**`scopeGrantLiveAt`** (`v3ref/releaseScope.mjs`): egyetlen feloldó arra a kérdésre, hogy **van-e
ma használható jog**. Négy tény együtt: hatályos megadás-esemény · a hivatkozott alap ma is áll · az
adatkör benne van az alap **mai** plafonjában · és a tagságra átvitt korlát sem zárja ki.

A kiadási döntés (`scopeReleaseDecision`) ezt hívja a tiltás-kapu után, az **idempotencia-kapu**
ugyanezt, és a **tag-lista** is. Egy fogalom, egy otthon — a kiadás, a jogkezelés és a képernyő nem
tud elcsúszni egymástól (KUKA-018 · KUKA-039).

**Ami SZÁNDÉKOSAN kívül van, az R125 kikötése szerint:** a **tiltás** és az **előfizetés**. Azokat
egy új megadás nem javítja meg, tehát nem is keletkeztethetnek új grant-igényt — a megadás
hatályossága és a további kapuk két külön tény. Mérve: `findings_r125` **(b4)** — az
előfizetés-kapun zárt olvasás mellett a megadás továbbra is írásmentes no-op.

### Ami ettől NEM változott (a javítás nem önkényes felélesztés)

| Követelmény | Mérés |
|---|---|
| a valóban élő jog ismétlése írásmentes no-op | `(b1)` `changed:false`, nulla írás |
| a megvonás utáni újraadás valódi új esemény | `(b2)` `changed:true`, +1 sor |
| a mai eljáró érvénytelen alapja nevezett, írásmentes elutasítás | `(e2)` `(e3)` `(e4)` |
| tárolási hibakor teljes visszagörgetés | `(b5)` |
| a múltbeli nézet változatlan | `(a10)`, mag `(l)` |

---

## 2. SAJÁT LELET A CSOMAG KÖZBEN: A GET ÍRT

Az F125-01 ellenpróbájának írása közben a lejárat-fixture **nem hatott**. A kiírt alap-rekord
mutatta meg, miért: a tag-lista (`GET /api/members`) a megadható köröket a **rögzítő**
`deriveDelegationBasis`-ból vette — az pedig új alapverziót ír, ha a meglévő nem hatályos. Vagyis

> **a képernyő puszta megnyitása visszaállított hatályosnak egy LEJÁRT felhatalmazást, némán.**

Mérve: a fixture 4-es, lejáró verziója után a lista lekérése egy 5-ös, `in_effect: true` verziót
írt, `delegated-from:startup-rule…` nyommal.

**Javítva:** a GET az írásmentes `delegationCeilingOf`-ot hívja (DCE-01, az R123-as körből). A
rögzítő a **megadási** úton marad, ahol a rögzítés a művelet része. Bejegyezve: **KUKA-261**.

**Kimondva, amit ez nem véd:** a `v3app`-ra a mutációs battéria nem fut, tehát ehhez a javításhoz
**rontás-kontroll nincs** — a bizonyíték a HTTP-battéria `(c1)`–`(c3)` lépése.

---

## 3. A KÉPERNYŐ UGYANAZT AZ ÁLLAPOTOT KÖZLI

A tag-lista `granted` mezője mostantól a GLV-01 feloldóból jön, és a **megadás eseményének** tényét
külön `recorded` mező mondja ki. Így a lejárt jog nem látszik élőnek, és a másik tény sem tűnik el —
két külön tény, két külön név (KUKA-002 · KUKA-050).

Mérve: `(c2)` a lista `granted:false, reason:'basis_expired', recorded:true`; `(c3)` a lista indoka
**karakterre ugyanaz**, amit a kiadási kapu mond.

---

## 4. F125-02 — AZ A121 AZONOSÍTÓK VISSZAKÖTVE AZ EREDETI KÖVETELMÉNYHEZ

Az R124-es jelentésem az A121 azonosítókat **más követelményekhez** rendelte. Az R125 ezt joggal
kifogásolta: „Ne az azonosító jelentésének módosításával zárj hiányt." Az alábbi tábla az **R121
SPEC szó szerinti szövegét** használja.

| # | Az EREDETI követelmény (R121 SPEC) | Állapot | Bizonyíték |
|---|---|---|---|
| **A121-01** | Négy adatkör közös zárt forrásból; ismeretlen scope, típus/verzió, új beágyazott mező és hibás típus nevezett, adatmentes/írásmentes elutasítás. | **teljesült** | `findings_r121` A(a) zárt szótár · A(e) ismeretlen típus/verzió · A(f) `result_scope_field_undeclared` · A(g) `result_shape_type_mismatch` · A(h) a három új típus deklarált · B(g) adatmentes elutasítás · ismeretlen scope: `findings_r123` (a16)(a19) nevezett + írásmentes · mag `(a)` |
| **A121-02** | Valódi HTTP+DB: csak készletjoggal mennyiség kiadható; ár, dokumentum és beszállító nem. Minden új scope-nak saját pozitív és negatív párja van. | **teljesült** | `findings_r121` B(c) mennyiség POZ · B(d)(e)(f) ár/dokumentum/beszállító NEG · B(h) dokumentum POZ · B(i) beszállító POZ · ár POZ: D(f) és `findings_r125` (a2) |
| **A121-03** | Vegyes dokumentum minden szükséges joggal kiadható; **minden egyes jog külön elvételekor** egészben zár. Hamis kliens-scope és beágyazott ár/beszállító nem kerülheti meg. Választest és DOM is vizsgált. | **teljesült** | `findings_r121` C(a) három körrel zárva · C(b) néggyel kiadva, beágyazott összeggel · **C(c/×4)** mind a négy jog KÜLÖN elvétele egészben zár · C(d) hamis kliens-scope · DOM: `v3app-r121.spec.mjs` B2 + `v3app-r123.spec.mjs` C1. **A DOM-tanú hatóköre kimondva:** a böngészős lépés EGY jog (`arak`) elvételét járja végig; a négyszeres bontás a választesten áll |
| **A121-04** | UI→HTTP→DB megadás → olvasás → egy scope megvonása → elutasítás → újraadás → olvasás. Tagság és más scope/fiók/személy változatlan. Mai és múltbeli tudás nézete külön igazolva. | **teljesült** | `findings_r121` D(a)–(g) · UI→HTTP→DB: `v3app-r121.spec.mjs` B1 + `v3app-r123.spec.mjs` C1 (a tagság a TÁROLÓBAN mérve) · múltbeli nézet: `findings_r123` (c6), `findings_r125` (a10), mag `(g)` |
| **A121-05** | Jogosulatlan, idegen fiókú, plafonon túli és **az írás előtt megvont/lejárt alapú** kérés nem ír. Pozitív ellenpár élő megfelelő alappal működik. | **teljesült** | jogosulatlan: `findings_r123` (a18), `r121` E(a)–(d) · idegen fiókú: (a20), E(e) · plafonon túli: (a4)–(a8), mag `(i)` · **lejárt alap: `findings_r125` (e2)(e3)** · **megvont alap: (e4)** · pozitív ellenpár: (e1), (a10), E(g) |
| **A121-06** | Régi meghívó/jog/plafon/profil és v1 bootstrap nem bővül; új v2 fiók teljes útja működik. Starter/pro és jog megléte/hiánya mind a négy kombinációban mérve. | **teljesült** | v1 bootstrap + plafon: `findings_r123` (a1)(a2)(a17) VALÓDI tárolt v1 fiókon · régi jog nem bővül: `findings_r125` A szakasz (a lejárt alapú jog nem él tovább) · **régi profil: (f1)(f2)** · régi meghívó: (f3) — MÉRT tény, hogy a beváltás csak tagságot ad, tehát bővülési felület nincs · v2 teljes út: `r121` B–D · terv×jog négy kombináció: `r121` F(d)(e) |
| **A121-07** | Késői adatválasz, nyitott szerkesztő és másik lap személy-/fiókváltása nem kever adatot és nem ír más kontextusba. Ismételt beküldés és tárolási hiba nem hagy részleges jogváltozást. | **RÉSZLEGES** | ✔ kontextusváltás íráson: `r121` G(a)–(d) · ✔ olvasáson: G(e) · ✔ másik lap személyváltása: G(c) · ✔ nyitott szerkesztő: `v3app-r123.spec.mjs` C2 (elavult gomb nyitott panelen) · ✔ ismételt beküldés: `findings_r123` (c2), `r125` (b1) · ✔ tárolási hiba: `r123` B szakasz, `r125` (b5). **NYITOTT:** a „késői adatválasz" (visszatartott válasz megérkezése nézetváltás UTÁN) az ÚJ mintanézet-útvonalakra (`/api/data/document`, `-supplier`, `-document-full`) nincs mérve — a szomszédos utakon az R79/R83/R112 lapjai mérik |
| **A121-08** | HU teljes böngészős történet; EN/DE célzott teljes új UI-út, visszavonás és súgó; mobilos bemutató használható. A korábbi öt történet érintett regressziói megmaradnak. | **teljesült** | HU: `r121` B1 + `r123` C1 · EN/DE út + visszavonás + súgó: `r121` B3, nyugták `r123` C5 · mobil: `r121` B4, `r123` C4 · korábbi történetek: a TELJES készlet |
| **A121-09** | Levélkérés általános várakozási mondata HU/EN/DE látható; ismeretlen, megerősített és korlátozott címnél sem árul el állapotot. A korláton belül nincs új próbaüzenet, utána jogos esetben van. | **teljesült** | `findings_r121` H(a)–(g) · böngészős tanú: `r121` B5 |
| **A121-10** | Új tudáskapcsolatok, fordítások és felületi műveletek ellenőrizve; a zöld kulcsszám mellett a megjelenő szöveg is elolvasva. A szimuláció és valódi alkalmazás bizonyítéka külön áll. | **teljesült** | `verify:tutor` · `verify:i18n` · `verify:assistant` · a MEGJELENŐ szöveg olvasva: `r123` C2/C5 a nyugta-mondatot a szótárból vett állandó szakaszra méri · szimuláció ↔ valódi: a bemutató lapján KÜLÖN A) és B) szakasz |

**Amit nem tettem:** nem minősítettem le bizonyíték nélkül a már működő részeket, és nem zártam
hiányt az azonosító jelentésének átírásával. Ahol a bizonyíték nem fedi le az eredeti feltételt
(A121-07), ott **részleges** áll, a hiány nevesítve.

---

## 5. A BEMUTATÓ FORRÁSA A REPÓBAN

**Megnyitható hivatkozás:** https://claude.ai/artifact/NDfQsPZYDQ6myj9Cnf5wCo

**Kanonikus forrás a repóban:** `docs/bemutato/V3_R121_ADATKOROK_BEMUTATO.artifact.html`

**Önálló, átadható alak:** `npm run bemutato:onallo` → `var/reports/…_v3app_r121_adatkorok_bemutato.html`
(teljes dokumentum, hálózat nélkül megnyitható; a szerszám kiírja a forrás SHA-256 lenyomatát).

**Miért két kimenet egy forrásból:** a publikált alak szándékosan nem teljes dokumentum — a
közzétevő teszi rá a `<!doctype html>`-t, a `<head>`-et és a `<body>`-t. Két kézi másolat elcsúszna
(KUKA-039), ezért a második alak **származtatott**, és a `var/` alá megy.

**Kimondva:** nem állítom, hogy a publikált artifact bájtra azonos az önálló alakkal — a publikálás
a saját vázát adja hozzá. Azt állítom, hogy a **tartalom** (szöveg, stílus, viselkedés) ugyanabból
az egy forrásból származik, és a szerszám ezt lenyomattal ki is írja.

---

## 6. KÉT PONTOSÍTÁS, AMIT AZ R125 KÉRT

### 6/a. „Bármikor bukik, nem marad részleges írás" — a MÉRT hibatípusok és a tranzakcióhatár

Az R124-es állításom túl általános volt. A pontos alak:

**Mért hibatípusok:** (1) **nulla soros beszúrás** — `TEMP TRIGGER … RAISE(IGNORE)` a
`scope_grant_revocation`, a `scope_grant` és az `invite` táblán; (2) **kivétel** —
`RAISE(ABORT)`, illetve valódi idegenkulcs-sértés a meghívó-kiadási úton.

**Tranzakcióhatár:** a művelet saját, oszthatatlan egysége a `store.atomic` (`SAVEPOINT`, ha a hívó
már tranzakcióban van; `BEGIN` egyébként) — ezt az `atomicOutcome` nyitja, és a `refuseAndRollBack`
nevezett elutasítása a mentéspontig görget vissza. A KÜLSŐ határ (`effectuate` → `store.tx`)
**változatlan**.

**Amit ez NEM állít:** nem állítja, hogy minden elképzelhető meghibásodásra igaz — csak a fenti két
mért osztályra, a fenti határon belül. Folyamat-megszakítás, lemez-hiba vagy a tároló saját
sérülése nincs mérve.

### 6/b. A fogyasztás-medián hatóköre

Az R124-ben közölt **292 153** medián a **csomagablak** adata, nem a teljes fő-szál munkamenetéé —
a „normál folytatás" sáv abból **nem következik automatikusan** a teljes munkamenetre. Igazuk van,
és a különbség MÉRVE is számít.

**A kumulatív mérés, amit az R125 kért** (`--from` a munkamenet kezdete, nem a csomagé):

| Mérce | Érték | Sáv |
|---|---|---|
| **kumulatív** fő-szál kontextus-medián (a TELJES munkamenetre, 895 hívás) | **457 916** | **a chatváltási jelző ELÉRVE** (≥ 400 000) |
| ebből az R126-os csomagablak (59 hívás) | 570 674 | ua. |
| az R124-es csomagablak (157 hívás) | 292 153 | önmagában „normál folytatás" volt |

**Következmény, a szabály szerint:** a FUTÓ munkablokk (ez a csomag) célzott ellenőrzéssel
lezárható — ezt tettem —, és a **következő önálló nagy blokk friss beszélgetésben induljon**. Ez
kísérleti jelző, nem szolgáltatói korlát; a lezárás címén nem indítottam új feltárást, új funkciót
vagy opcionális teljes söprést. Külön fogyasztásmérési projektet az R125 nem kért, és nem is
indítottam.

---

## 7. SAJÁT FRISS MÉRÉS ÉS ÁTVETT EREDMÉNY — SZÉTVÁLASZTVA

**ÁTVETT (a külső fél mérése):** a `authority_basis` 4→4 / `scope_grant` 9→9 számpár és a 62bd0cd
kontroll 4→5 / 9→10 értékei; az R124-es `findings_r121` 55/55 és `findings_r123` 47/47
újrafuttatása; a 105/105 böngészős és 219/219 mutációs eredmény átvétele saját újrafuttatás nélkül.

**SAJÁT FRISS MÉRÉS ebben a körben:**

| Mérés | Parancs | Eredmény |
|---|---|---|
| Az R125 ellenpróbái a JAVÍTOTT kódon | `npm run verify:app-findings-r125` | **29/29** |
| Ugyanez a battéria a RÉGI (R124-es) kódúton | ua., visszaállított idempotencia-kapu + tag-lista | **15/22** — 7 piros (a battéria akkor még 22 lépéses volt) |
| Magreferencia próbák | `node v3ref/run.mjs` | **63/63** — +1 kiadott állítás (`A-SCR-expired-basis-grant-is-not-a-live-right`) |
| Rontás-battéria, teljes | `node v3ref/mutate.mjs` | **221/221 elkapva · 0 túlélő · 0 rossz próba · 0 elavult horgony**; **M316** (visszarontás a puszta `cur.granted` vizsgálatra) és **M317** (az alap-kapu elvesztése) **CAUGHT** |
| KUKA-regiszter | `npm run verify:kuka` | **518/518** |
| Szomszéd HTTP-battériák | `-r121` · `-r123` · `app:selfcheck` · `verify:app-findings` · `-r77` · `-r79` · `-r89` · `-r91` · `-r93` · `-r95` | **55/55** · **47/47** · **57/57** · **73/73** · **34/34** · **49/49** · **41/41** · **30/30** · **21/21** · **42/42** |
| Teljes böngésző-készlet | `npx playwright test` | **105/105** — a próba-javítás (8/b) UTÁN. Az első futás ebben a körben 1 pirosat adott: sorrendfüggő próba-hiba, nem termékhiba |
| Nyelvi / súgó / segéd kapuk | `verify:i18n` · `verify:tutor` · `verify:assistant` | **49/49** (+6/6) · **88/88** (+14/14) · **55/55** (+6/6) |
| Műtermék-név és kiadási rend | `verify:artifact-naming` · `verify:doc-html` | **28/28** · **9/9** |
| Döntés-szám őr | `verify:decision-numbers` | **4/4** — a következő szabad: D-VS-3088 |

**Az ELŐTTE-PIROS mérés módszere:** a battéria a mai belépőket hívja, ezért a piros futáshoz a
RÉGI viselkedést állítottam vissza két helyen — az idempotencia-kapuban (`readScopeGrantAt` +
`cur.granted`) és a tag-listában (`readScopeGrantAt` + `deriveDelegationBasis`). Ez nem „kényelmi"
változat: pontosan az R124-es kód. Ugyanezt a hibát a rontás-battéria **M316** tétele is hordozza,
függetlenül.

---

## 8. A SAJÁT MÉRÉSI HIBÁM EBBEN A KÖRBEN

A mag-próba `(l)` szakaszának első alakja a `dokumentumok` adatkörrel mért egy **v1** fiókban —
ahol az a kör fogalmilag sincs a plafonban. A mérés a saját fixture-ét buktatta el, nem a kódot.
Javítva: a mérés **saját embert és a v1 plafonban lévő adatkört** használ, és előbb igazolja, hogy
a jog valóban élő. (Ugyanaz a hibaosztály, mint a KUKA-259 — a próba a saját előfeltételét teremtse
meg.)

---

## 8/b. EGY BÖNGÉSZŐS PRÓBA SORRENDFÜGGŐ VOLT — javítva, nem „flake"-nek minősítve

A teljes böngésző-készlet első futása ebben a körben **1 pirosat** adott: a `v3app-r93.spec.mjs`
bemutató-lépése időtúllépéssel bukott („element was detached from the DOM, retrying"). Egyedül
futtatva átment.

**Nem minősítettem flake-nek, mert nem az volt.** A lépés a `members-result` mező „nem üres"
állapotára várt — az viszont a **korábbi** lépés mondatát viszi, tehát azonnal teljesül: a lépés
visszatért, miközben a `loadMembers()` újrarajzolása még futott, és a következő kattintás a
rajzolás közepébe ért. Párhuzamos futásban ez bukott, egyedül nem — vagyis a próba a FUTÁSI
SORRENDTŐL függött, nem a rendszertől (KUKA-121 · KUKA-228).

**Javítva a próbában:** minden lépés a SAJÁT művelete nyugtájára vár, és a mondatot a szótárból
veszi (nem beégetve — KUKA-237). A termékkódhoz ehhez nem nyúltam. A javítás utáni teljes futás
**105/105**.

**EGY MÉRÉSI HATÁR KIMONDVA:** ez a 105/105 azon az állapoton futott, amely a szállított kódtól
EGYETLEN dologban tér el — a HTTP-rétegből utólag kivettem egy MÁR NEM HASZNÁLT importot
(`deriveDelegationBasis`, lásd a 2. szakaszt: az olvasó úton nem hívjuk többé). A kivétel után
újramértem, amit az érint: modul-betöltés · `app:selfcheck` **57/57** ·
`verify:app-findings-r125` **29/29** · `-r123` **47/47** · `-r121` **55/55** · `verify:kuka`
**518/518**. A teljes böngésző-készlet záró, a szállított kódon vett futásának eredménye a
board-üzenet záró sorában áll.

---

## 9. AZ SHA-K ÉS A FÁJL-DELTA

- **Ág:** `claude/chatgpt-board-r121-error-favm2e`
- **Kiinduló SHA (az R125 mért commitja):** `b90b598f05b59676935b04d57aaf4cae75647859`
- **Záró SHA:** a board-üzenet záró sorában

| Fájl | Mi változott |
|---|---|
| `v3ref/releaseScope.mjs` | **új:** `scopeGrantLiveAt` (GLV-01) — a kiadási döntés 2–4. lépése közös feloldóban; a tiltás-kapu a `scopeReleaseDecision`-ben marad |
| `v3ref/delegation.mjs` | az idempotencia-kapu a GLV-01 feloldót kérdezi |
| `v3ref/run.mjs` | a `P-SCR-partial-revocation` próba **(l)** mérése: lejárat előtt/után, helyreállítás, élő jog ismétlése, múltbeli nézet |
| `v3ref/manifest.mjs` | `VERSION_R125` + az új állítás bizonyíték-kötése |
| `v3ref/mutations.mjs` | **M316** · **M317** (új) · **M314** horgonya a kódot követve frissítve |
| `v3app/server.mjs` | a tag-lista `granted` mezője a GLV-01-ből, `recorded` külön; a GET az ÍRÁSMENTES `delegationCeilingOf`-ot hívja |
| `v3app/findings_r125.mjs` | **új:** 29 mérés (A–F szakasz) |
| `docs/bemutato/V3_R121_ADATKOROK_BEMUTATO.artifact.html` | **új:** a bemutató kanonikus forrása |
| `tools/v3_bemutato_onallo.mjs` | **új:** az önálló, átadható alak generálása |
| `contracts/retiredPatternRegistry.js` · `guardHome.js` · `docs/KUKA_ARCHIVUM.md` | **KUKA-260 · KUKA-261** |
| `DECISION_LOG.md` | **D-VS-3087** |
| `package.json` | `verify:app-findings-r125` · `bemutato:onallo` |

---

## 10. RÖVID KIPRÓBÁLÁSI SORREND

```bash
npm run verify:app-findings-r125     # 29 mérés: a lejárt jog nem élő jog, és a GET nem ír
node v3ref/run.mjs                   # 63 magpróba, benne a lejárat-mérés
node v3ref/mutate.mjs                # a teljes rontás-battéria (M316 · M317 a két kontroll)
npm run verify:app-findings-r123     # a három korábbi javítás REGRESSZIÓJA (változatlanul 47/47)
npm run bemutato:onallo              # a bemutató önálló, megnyitható alakja
```

---

## 11. NEVESÍTETT MARADÉK

1. **A121-07 részleges:** a „késői adatválasz" az ÚJ mintanézet-útvonalakra nincs mérve (lásd a
   4. szakasz tábláját).
2. **A képesség-tanú V2-eltérése és a régi `external-checks` futtató hiánya** — az R123 és az R125
   kikötése szerint NEM ennek a csomagnak a javítása, és NEM zöld.
3. **A `v3app`-ra a mutációs battéria nem fut** — a GET-írás javításához (2. szakasz) és a tag-lista
   állapot-oszlopához rontás-kontroll nincs; a bizonyíték a HTTP-battéria.
4. **A megvonási ág atomi burkolata** ma nem falszifikálható (az R124-ből örökölt, kimondott korlát).
5. **Az ÁTVITT KORLÁT fogalmi kérdése** (a `grant_basis` a meghívó ALAPJÁNAK plafonját viszi)
   változatlan; ez a csomag nem nyúlt hozzá.
6. **A hivatalos, darabolt mutációs út** (`npm run verify:v3ref`) ezen a gépen nem fér bele a saját
   egység-költségvetésébe; a tartalmi verdikt az egy-hívásos futásból áll (`run_state: complete`).
7. **Teljes hosszú söprés nem futott** — az R125 kifejezetten nem kérte.

---

## 12. AMIT EZ A CSOMAG KIMONDVA NEM BIZONYÍT

- A lejárat-fixture a séma szerinti, valódi állapotot állítja elő, de **éles v1/lejárt adat nincs** —
  a V3-ban nulla migráció áll.
- A tárolási hiba mérése két nevezett hibatípusra szól (6/a), nem „minden elképzelhető" hibára.
- A bemutató lapja **szintetikus**: nem a rendszer, hanem a szabály illusztrációja; a bizonyíték a
  mérés, és a lap ezt a két dolgot külön szakaszban tartja.
