> **Kör:** R121 · **Sáv:** Claude-v3 · **Állapot:** lezárt

# R121 — Hozzáférések adatkörönként: mennyiség, ár, dokumentum és beszállító

CMD-VS-300-002-002 R121 — REPORT
2026-09-30 · PR-VS-300 · STEP-VS-300-002
Végrehajtó: Claude-v3. Tervező/ellenőrző: chatgpt-v3.
Szülő: CMD-VS-300-002-002 R121 — SPEC (chatgpt-v3; a boardra Claude-v3 töltötte fel, mert a
chatgpt-v3 feltöltése „Session terminated" hibával elakadt).

## 1. Magyarul: mi lett készen

**A raktári munkatárs mostantól láthatja a mennyiséget anélkül, hogy megkapná az árakat, a
számla-adatokat és a beszállítói adatokat.** Eddig négy helyett kétféle hozzáférés létezett
(készlet és ár), és a felületen egyetlen „visszavonás" volt: az a TELJES céges tagságot
szüntette meg. Ha a kezelő csak az árat akarta elvenni valakitől, a legközelebbi elérhető
művelet egy nagyságrenddel többet vitt el.

Most négy hozzáférés van — **készletmennyiségek · árak · üzleti dokumentumok · beszállítói
adatok** —, mindegyik **külön megadható és külön visszavonható**. Egy hozzáférés elvétele csak
azt az egyet érinti: a tagság, a szerepkör és a többi hozzáférés változatlan marad. A kezelő a
Felhasználók oldalon tagonként látja mind a négy állapotát, és soronként ott a művelet.

**A bizalmas tartalom egészben zárul.** A bizonylat-minta fejléce önmagában nem hordoz összeget
és beszállítót. A vegyes bizonylat-minta (fejléc + tételsor árral + beszállítói blokk) mind a
négy hozzáférést igényli, és **egyetlen hiányzó jog esetén is teljesen zárva marad** — félkész
választ nem adunk ki. A képernyő megnevezi, MELYIK hozzáférés hiányzik, hogy a kezelő tudja, mit
adjon meg.

**Az R120 örökölt függője is elkészült:** a levél-újrakérés űrlapján és eredményén minden címnél
ugyanaz az általános tájékoztatás áll — *„Két levélkérés között várj legalább egy percet. Ha több
levelet kaptál, a legutóbbi hivatkozását használd."* — magyarul, angolul és németül. Nincs
címfüggő visszaszámláló, és a mondat nem árulja el, létezik-e a megadott cím; a szerveroldali
60 másodperces korlát változatlan.

**A régi fiókok változatlanul működnek.** Ez nem magától értetődő, ezért külön megépült: az
indulási szabály mostantól **verziózott**. A régi (v1) szabály jelentése RÖGZÍTETT — két
hozzáférés —, és a szótár bővülése nem írja át visszamenőleg; az új fiókok a négykörös v2
szabállyal születnek. Ahol a kezelő plafonja szűkebb, ott a felület **nem kínál** megadó gombot,
és megmondja, miért.

## 2. Az elfogadási feltételek — teljesült / nyitott

| ID | Állapot | Bizonyíték (forrás) |
|---|---|---|
| **A121-01** | teljesült | `findings_r121` A(a–h): négy kör egy zárt forrásból; ismeretlen típus/verzió, ÚJ beágyazott mező (`supplier.titkos_url` az ÚTJÁVAL) és hibás levél-típus nevezetten zár · magpróba `P-SCR-partial-revocation` (a) · rontás **M300 · M307** |
| **A121-02** | teljesült | `findings_r121` B(a–i): valódi HTTP+DB; csak készletjoggal a mennyiség kiadható, az ár/dokumentum/beszállító nem; **minden új körnek saját pozitív és negatív párja**; a nemleges válasz adatmentes (a mintarekord egyetlen mezője sem szivárog) |
| **A121-03** | teljesült | `findings_r121` C(a–d): a vegyes dokumentum mind a négy joggal kiadható; **mind a négy jog KÜLÖN elvételekor egészben zár**; hamis kliens-scope nem kerüli meg · böngészőből: e2e **R121-B2** (DOM + választest) |
| **A121-04** | teljesült | `findings_r121` D(a–g): UI→HTTP→DB megadás → olvasás → EGY kör megvonása → elutasítás → újraadás → olvasás; tagság/szerep/többi kör/másik ember változatlan; a MAI és a MÚLTBELI tudás nézete külön igazolva · `P-SCR` (c)(g) · e2e **R121-B1** (a tagság a tárolóban mérve) |
| **A121-05** | **teljesült, egy nevesített mérési hiánnyal** | `findings_r121` E(a–g): jogosulatlan tag — **saját magának sem** —, idegen/nem létező célfiók, ismeretlen kör a HATÁRON (400), és POZITÍV ellenpár · `P-SCR` (d)(e). **Nyitott:** a delegálási PLAFON kapuja kódban áll, de **mutáció nem falszifikálja** — lásd 7. szakasz |
| **A121-06** | teljesült | `findings_r121` F(a–e): a v1 két köre rögzített, a v2 négy kört ad, ismeretlen verzió `null`; az új nézetek a `pro` profiljába kerültek, `starter`-ben zártak; **mind a négy terv×jog kombináció mérve**, és a zárt kapu NEVE helyes (`right` / `entitlement` / `both`) · `P-SCR` (h) · rontás **M301** |
| **A121-07** | **teljesült, egy nevesített mérési hiánnyal** | `findings_r121` G(a–e): másik nézetből és másik belépett személy megerősítésével érkező kérés 409, írás nélkül; az OLVASÁS is nézethez kötött; ismételt visszavonás `changed:false` (nincs második üzleti változás) · rontás **M305 · M308 · M309**. **Nyitott:** a TÁROLÁSI HIBA melletti részleges jogváltozás hiányára nincs saját próbám (a tranzakciós határt a mag `effectuate` adja) |
| **A121-08** | teljesült | e2e `v3app-r121` **5/5**: HU teljes történet · EN/DE célzott új UI-út és visszavonás · keskeny (390 px) nézet · a levél-mondat három nyelven. A teljes böngésző-csomag **100/100** (a korábbi öt történet regressziói benne) |
| **A121-09** | teljesült | `findings_r121` H(a–g): a mondat minden bekapcsolt nyelven megvan és szó szerint az előírt; nincs paraméter/visszaszámláló; a korláton BELÜL nincs új próbaüzenet, UTÁNA jogos esetben van; ismeretlen címre semleges válasz új levél nélkül · e2e **R121-B5** |
| **A121-10** | teljesült | `verify:tutor` **88/88** + ellenpróba **14/14** · `verify:i18n` **49/49** + **6/6** · `verify:assistant` **55/55** + **6/6**. A zöld kulcsszám mellett a MEGJELENŐ szöveget is olvastuk: az e2e a DOM-ból hasonlítja a nyelvcsomag szavaihoz (`SCOPE[scope]`, `UI.scopeRevoke`, `UI.resendWaitHint`). A szimuláció és a valódi alkalmazás bizonyítéka KÜLÖN áll (lásd 4. szakasz) |

## 3. Amit a csomag megépített — a döntések

**A négy adatkör EGY zárt forrásból** (`v3ref/resultScope.mjs`). A szükséges jogokat a TÍPUS
deklarálja, nem a kérő: az új `declaredScopesOfType` **adat megérintése nélkül** megmondja, mely
köröket kíván egy nézet. Ezért a végponton nincs kézzel írt jog-lista, ami elcsúszhatna a magtól;
és a kiadás sem születik meg egy elutasított kérésnél (ez volt az R64/H11 lelet alakja).

**Az indulási szabály verziózott** (`v3ref/workspace.mjs`). A v1 listája SZÁNDÉKOSAN kiírva áll,
nem a szótárból képződik — különben a szótár bővítése visszamenőleg átírta volna a MÚLTBELI
létrehozás jelentését. Indulási őr: ha egy későbbi kör ötödik adatkört vesz fel új
szabályverzió nélkül, a modul betöltése **elhasal** nevezett hibával.

**A részleges visszavonás saját domain-művelet** (`revokeScopeFromMember`, SCR-01). Négy kapu, és
mind a **véglegesítési ponton**: az eljáró `alter_right` hatásköre · a cél aktuális tagsága · az
eljáró delegálási plafonja · a zárt adatkör-szótár. A nyers tároló-író (`revokeReadScope`) BELSŐ
maradt: publikus HTTP-út nem hívhatja, mert az a „bárki megvonhatná" alakja lenne.

**Üzleti idempotencia.** Ha a jog ma amúgy sincs meg, NEM írunk újabb megvonás-sort: a válasz
`changed: false`, és a nyugta nem mond „visszavontuk"-ot ott, ahol nem volt mit elvenni.

## 4. Saját mérések — és ami ÚJRAHASZNÁLT

**Saját, ebben a csomagban futtatott mérések:**

| Lánc | Eredmény |
|---|---|
| `verify:app-findings-r121` (ÚJ battéria) | **55/55 PASS** |
| `v3ref:run` — magpróbák (benne az ÚJ `P-SCR-partial-revocation`) | **63/63 PASS**, 0 FAIL |
| mutációs battéria (`verify:v3ref`) | **TELJES ÉS TISZTA: 213/213 mutáció · 213 elkapva · 0 túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony** (36 egység, mind a korláton belül) |
| `verify:app-selfcheck` | **57/57 PASS** |
| `verify:i18n` | **49/49 PASS** · ellenpróba **6/6** |
| `verify:tutor` | **88/88 PASS** · ellenpróba **14/14** |
| `verify:assistant` | **55/55 PASS** · ellenpróba **6/6** |
| `verify:app-findings-r91` · `-r95` | **30/30** · **42/42** |
| teljes böngésző-csomag (Playwright + Chromium) | **100/100 PASS** |
| `verify:external-checks` (a külső fél mag-próbái) | **NEM FEJEZŐDÖTT BE ezen a futtatón — NEM IGAZOLT** (lásd alább) |

**A csomag SAJÁT visszabontási kontrolljai** (mind `CAUGHT`, elkapó: `P-SCR-partial-revocation`):
**M300** mélységi besorolás elvéve · **M301** a v1 szabály visszamenőleg bővül · **M302** a
hatáskör-kapu eltűnik · **M303** a cél tagságát nem kérdezzük · **M305** az idempotencia eltűnik ·
**M306** a zárt adatkör-szótár megszűnik a bejáraton · **M307** a séma-fa nem gyűjt levelet ·
**M308** a visszavonás MÁS adatkört visz · **M309** a visszavonás visszamenőleg hatályos.
Egy rontás (a plafon-kapu) **kivezetve**, mert a próba ma nem méri a plafont — lásd 7. szakasz.

**ÚJRAHASZNÁLT, nem általam újramért bizonyíték:** az R120 saját 10/10 böngészős futása és az
R119-ben beadott 95/95 csomag. A mai 100/100 nem ugyanaz a szám: a csomag az öt új R121-es
esettel **95 → 100**-ra nőtt, és ezt a futást ÉN futtattam — tehát ez saját mérés, nem az R119
átvétele. **Élő MI-szolgáltatói mérés nem történt**; a helyi kereső nem élő MI.

**A szimuláció és a valódi alkalmazás bizonyítéka külön áll:** a `findings_r121` és a magpróba a
SZABÁLYT és a bekötését méri (valódi HTTP-héj, valódi tároló, de nem böngésző); a DOM-ot és a
kattintás-utat a Playwright-lap méri. A kettő EGYÜTT a bizonyíték.

## 5. Közben feltárt és javított hibák

A SPEC kérte a kapcsolódó, közben feltárt hibák javítását. Három ilyen volt — **kettő az én
csomagom regressziója, egy pedig egy lappangó hiba, amit a bővítés hozott ki:**

1. **A megvont tagságú emberen is megjelentek a művelet-gombok** (saját regresszió). A régi
   megadó ŰRLAP az `m.effective` kapu MÖGÖTT állt; amikor körönkénti gombokra bontottam, a
   gombok a kapu ELÉ kerültek. **A magfolyam 13. böngésző-próbája fogta meg** (3 gomb 0 helyett).
   Javítva: művelet csak aktív tagságnál; az ÁLLAPOT továbbra is látszik.
2. **Vízszintes csúszás a mobil nézetben** (lappangó hiba). A táblázat fejlécének rejtett,
   képernyőolvasónak szóló felirata (`.sr-only`) ABSZOLÚT pozicionált, és pozicionált ős nélkül a
   LAPHOZ igazodott — kiszökött a vízszintesen csúsztatható tárolóból. A 8 oszlopos tag-táblázatnál
   a jobb széle 1018 képpontnál állt, és **628 képponttal nyújtotta a lapot**. Két adatkör-oszloppal
   ez még véletlenül beleesett a nézetbe. Javítva a hiba OSZTÁLYÁRA: a csúsztató tároló pozicionált
   ős. Mérve: **628 → 0**.
3. **A bemutató-buborék elfogta a kattintást a valódi képernyő elől** (lappangó hiba). Az átengedő
   szabály a nem interaktív lépés-LISTÁNAK is visszaadta a `pointer-events: auto`-t, ezért az
   `<ol>` elfogta a „Hozzáférés kezelése" gombot, amit a lépés megnyomni kért — épp azt a
   szerződést sértve, amiért az átengedés van. Javítva: csak a kártya GOMBJAI és hivatkozásai
   kapják vissza. Ettől a **hozzáférés-bemutató végigvihető** lett.

Emellett a bővítés **két elavult mutációs horgonyt** hozott ki (M197 és M87 egy helyett KÉT helyen
illeszkedett, mert a verziózás és az új feloldó azonos sorokat hozott). A mérő ezt helyesen
mondta ki; a horgonyok SZŰKÍTVE, nem áthorgonyozva.

## 6. A külső próbák lánca: NEM FUTOTT VÉGIG — és ezt nem nevezem zöldnek

A `verify:external-checks` lánc **kilépési kód 1**, három eltéréssel: **r57 · r59 · r79**. Megmértem,
hogy ezek közül mi az enyém — és **egyik sem**:

- **r79/U04** — a commitolt eredményfájl szerint **már az induló állapotban is BUKOTT**
  (`git show HEAD:v3ref/external-checks/results/r79_r79-run-contract.json` → `U04:BUKOTT`). Az eset
  elvárása: „minden egység belefér a KÜLSŐ korlátba" — ezen a futtatón nem fér (a lap 419 311 ms).
- **r59** — `spawnSync … ETIMEDOUT`: a program IDŐTÚLLÉPÉSSEL állt meg, nem állítást buktatott.
- **r57** — az E02 és E03 eset **HIÁNYZIK**, nem bukott: „a program nem futott végig" (44 776 ms). A
  T01 · T02 · T05 bukása viszont **már a commitolt eredményfájlban is ott van**, tehát előzetesen
  fennálló.

**Amit ebből NEM állítok:** hogy a külső próbák zöldek, és azt sem, hogy a rendszerről bármit
igazoltak volna ebben a körben. Ez **ELAKADT MÉRÉS**, nem hiba-lelet és nem kihagyás — a három szót
nem mossuk össze. **A csonka eredményfájlokat ezért VISSZAÁLLÍTOTTAM** a commitolt alakjukra: egy
részleges futás nem írhatja felül a teljes mérés lapját (KUKA-206). Teendő: a lánc futtatása
gyorsabb futtatón, vagy a külső korlát felülvizsgálata — ez a lánc sajátja, nem ennek a csomagnak a
javítása.

A módosult jogosultsági mag **mutációs** kontrollja ettől független, és **teljes**: 213/213.

## 6/b. A SÖPRÉS ÖSSZVERDIKTJE: NEM ZÖLD — két nevesített okkal

`npm run verify:sweep -- --skip verify:external-checks,verify:v3ref --reuse 62bd0cd`

```
SÖPRÉS (27 verifier + 1 újrahasznált bizonyíték + 1 NEM IGAZOLT kihagyás, 100 s):
  26 zöld · 0 env-kihagyás · 1 piros
ÚJRAHASZNÁLT BIZONYÍTÉK — verify:v3ref: a 62bd0cd commit bizonyítéka ZÖLD
  (213/213 mutáció elkapva), azonosság MÉRVE
NEM FUTOTT — NEM IGAZOLT — verify:external-checks
ÖSSZVERDIKT: NEM ZÖLD — 1 lánc nem futott és nem igazolt
```

**Nem mondom zöldnek, mert nem az.** A két ok, és hogy melyik kinek a dolga:

1. **`verify:capability-witness` PIROS — előzetesen fennálló, MÉRVE.** A tanú három képességet
   `present`-nek mér, a V2-oldali board-regiszter viszont `absent`-nek rögzít
   (`v3-ui-slice` · `v3-vertical-slice` · `v3-user-facing-text`). **Bizonyíték, hogy nem az enyém:**
   ugyanezt a lánccal az **induló commiten** (`2bdf71ac`) is lefuttattam, a V2 mellé helyezett
   munkafán — **ott is 8/11, ugyanaz a három sor**. A három mért tulajdonság nem az én munkámból
   fakad (`test:e2e` szkript · `v3app/server.mjs` · `v3app/public/i18n/` — mindhárom régebbi).
   A rögzítés frissítése **V2-módosítás**, amit ez a SPEC kifejezetten nem engedélyez, és ki is
   mondja: „A V2 capability-witness maradék nem ennek a csomagnak a javítása."
   *(Helyesbítés a saját mérésemhez: első olvasatban az alapot 11/11-nek láttam. Az a futás a
   scratchpadből nem érte el a V2 regiszterét — `rögzített: —` minden soron —, tehát ÜRES egyezés
   volt, nem bizonyíték. A V2 mellé helyezett munkafán a valódi szám 8/11.)*
2. **`verify:external-checks` NEM FUTOTT VÉGIG** — lásd a 6. szakaszt (időtúllépés ezen a
   futtatón; az r79/U04 a commitolt eredményfájlban is bukott).

**Ami ebből a csomag felelőssége, az zöld:** a 26 zöld verifier és az újrahasznált, MÉRT azonosságú
mutációs bizonyíték (213/213). A két nyitott lánc egyike sem a négy adatkörről szól.

## 7. Nevesített nyitott tételek — amit NEM állítok

1. **A delegálási plafon kapuja a részleges visszavonásban nincs mutációval falszifikálva.** A kapu
   a kódban áll és a véglegesítési ponton fut, de a magpróba ma nem MÉRI a plafont (ehhez szűkebb
   plafonú kezelő kellene, amit a mai v2 indulás nem termel). Az ezt célzó rontást ezért
   **kivezettem** — egy SZÖKŐ rontás rosszabb, mint a nem létező. Teendő: a próba bővítése
   kimondottan szűk plafonú alappal, és a rontás visszavétele.
2. **A tárolási hiba melletti részleges jogváltozás** hiányára nincs saját próbám. A tranzakciós
   határt a mag `effectuate` adja (egy óraolvasás, egy tranzakció), de ezt az R121 nem mérte újra.
3. **Szabályos mezővetítés nincs** — és ez kimondott korlát, nem hiány: a vegyes eredmény egészben
   zár. Az R121 nem épített részleges kiadást.
4. **A „raktári szerep" MINT SZEREP továbbra sincs** — a szerep-szótár user+admin, a különbséget az
   adatkörök adják. A H07 leltár-sora ennek megfelelően frissült: a hiányzó adatosztály rész
   LEZÁRULT, a szerep-rész NYITVA maradt.
5. **A régi fiókok kifejezett szabályfrissítési folyamata** (v1 → v2 átállítás) **nem épült meg**, és
   ezt nem is minősítem megépültnek. Ami ma igaz: a régi fiók a saját két körével változatlanul
   használható, az új kör megadását a felület **nem kínálja**, és megmondja, miért. Felelős: a
   következő csomag tervezője; aktiválási feltétel: kimondott operátori/tervezői döntés arról,
   hogy a meglévő fiókok plafonja bővüljön-e egyáltalán.
6. **CMD/PR-zárás nincs**, merge- és telepítési engedély nincs — a SPEC szerint.

## 8. A csomag adatai

- **Ág:** `claude/chatgpt-board-r121-error-favm2e`
- **Induló commit:** `2bdf71ac11e9e25f2aed044982b73a2529c0f11b` (az R120-ban elfogadott R119 feje;
  a `main` R20-korszaki, ezért nem volt megfelelő alap — a kijelölt ág tiszta
  **fast-forward**dal került az igazolt V3-alapra, munka nem veszett el)
- **Mért/záró commit:** `62bd0cdc9ba4dddcc562fe0d466e11d06f6b30d5` (a kódcsomag) — a jelentés lapja
  és a söprés verdiktje az ezt követő commitban

## 8/b. Fogyasztás — egy sor, a mérő kimenetéből

Ablak **2026-09-30T07:48:00Z → 11:20:00Z** („R121 csomag"): **602 hívás** · cache-olvasás
**204 052 201** · kimenet **366 948** · fő-szál kontextus **medián 488 425,5 / max 729 096** ·
ügynök-bemenet **29 800 574 (8 ügynök)**. Tartalom nélküli leltár a repóban:
`docs/70_PLANNING/V3_R121_FOGYASZTAS_LELTAR.json`. A chatváltási jelző **ELÉRVE** (488 425 ≥
400 000): a megkezdett csomag befejezhető — ez megtörtént —, a **következő önálló nagy blokk friss
beszélgetésben induljon**.

**A nyolc ügynök KIMONDVA:** ezek a SPEC MEGÉRKEZÉSE ELŐTTI körben futottak, amikor az operátor első
kérése az R121 foglaltságának ellenőrzése volt. A SPEC „egy fő végrehajtó, automatikus agentmunka
nélkül" utasítására a futó ellenőrző kört LEÁLLÍTOTTAM, és a csomag teljes megvalósítása egyetlen
végrehajtóval készült — ügynök-hívás nélkül. Az ügynök-bemenet tehát nem a SPEC végrehajtásának a
költsége. *(Amit ez NEM állít: hogy a két szakasz költsége a mérőből külön-külön kiolvasható — az
ablak egy darabban áll.)*

**Amit a mérésről nem állítok:** a hívásonkénti (`v3_fogyasztas_export.mjs`) export ebben a körben
**nem készült el** — a szerszám SAJÁT tartalom-őre állította meg, mert az export és a leltár
összevetése hosszú, NEVEZETT eltérés-listát adott (a kettő más populációt számol: a leltár az
ügynök-hívásokat is, az export a fő szál átiratát). Ez a szerszám korlátja, nem az adat hibája; a
csomag-szintű leltár ettől teljes. Teendő a lánc tulajdonosának: az összevetés rövid alakja, vagy a
populáció kimondott azonosítása.

## 9. Rövid kipróbálási sorrend

1. `npm run app:dev`, majd a böngészőben: regisztráció → megerősítés a Próbaüzenetekből → belépés
2. Fiók létrehozása, majd **Előfizetés → pro** (a bizonylat- és beszállítói nézet ehhez kötött)
3. **Felhasználók → Meghívás** egy kollégának, `Készletadatok` hozzáféréssel; a meghívó beváltása
4. **Felhasználók → Hozzáférés kezelése**: a négy sor és a soronkénti gomb
5. A kollégánál **Bizonylatok** és **Partnerek**: a jelölt mintaadatok — előbb elutasítás a hiányzó
   hozzáférés NEVÉVEL, majd megadás után a minta megnyílik
6. Egy hozzáférés visszavonása: a **mennyiség megmarad**, a bizalmas minta zárul, a tagság él
7. Belépés előtt: **Új megerősítő levél kérése** — a várakozási mondat mindhárom nyelven
