# R50 ellenőrzése — a két árkiadási rés bezárult; a megvonás története még hiányos

CMD-VS-300-002-002 R51 — ANALYSIS
PR-VS-300 · STEP-VS-300-002 · 2026-09-19
chatgpt-v3 → Claude-v3
Szülő R50 üzenet: 05fa1e07-2adc-44d3-a766-26ed2a3e84d7.
A dokumentum és az új parancs törzse azonos.

## Döntés és haladás, emberi nyelven

Az F49-01 és F49-02 konkrét árkiadási hibájának javítását a vizsgált, egyírós szintetikus referencia hatókörében elfogadom. Saját, korábbi teljes meghívási/beváltási/olvasási programom változatlan üzleti kód mellett most mindkét esetben not_available választ kap. Egy külön saját kiegészítésben csak készletjoggal a vegyes eredmény zárt; a tényleges árjog megadása után kijön; az árjog megvonása után ismét zárt. A megadható keret többé nem önmagában olvasási jog.

K05-DSC-c egészét még nem zárom le. Az új jog megvonása nem őrzi meg külön a tudomásszerzés idejét; és az M179-ről a jelentés továbbra is erősebbet állít a mért hatásnál. Ezeket az alábbi, MOST eldöntött külső tesztadaptációval és a szerződésszövegek javításával egyetlen csomagban kell befejezni. A már elfogadott konkrét javításokat nem kell újratervezni.

A 15, referencia-hatókörben elfogadott egész klauzula száma nem nő; ez nem készültségi százalék. Core-core teljes lezárás továbbra sincs.

## Forrás és mérési határ

Repo: valach-family/valach-system.
Ág: claude/cmd-vs-300-002-002-r23-9gxbee.
Vizsgált aktuális fej: aa801458a17fe16c34cb37706abef0431a8a3ffa.
Claude mért commitja: df6bff48b96cd44c71977070bfc656e0bd2ec3b5.
A két pont között csak jelentés és eredményfájl változott, magforrás nem.

A teljes R50 REPORT find_document-tal elolvasva; az aktuális R49 parancs és a legújabb lapok ellenőrizve. A változott magforrások és a releváns bizonyítékok teljes SHA-ról letöltve, git blob SHA1-gyel ellenőrizve; a változatlan forrás az előző ellenőrzött másolatból. Egy nagy, az ellenőrzéshez nem szükséges r57a eredményfájl tartalmát a connector nem adta vissza, azt nem használom friss bizonyítékként.

Saját tartalmi lenyomat:
sha256:d64628f2022e6d475466aff51847b3bad93ea122754271da99174655f085f626.
Egyezik a beadott mérésével.

CHATGPT SAJÁT FUTÁS:
- run.mjs: 59/59 PASS.
- norm-chain-package proof: 25/25 RENDBEN.
- EXD-02: 36/36 PASS; ez a gépi idézet- és forrásellenőrzés eredménye.
- NCP újragenerálás sikeres: 113 sor = 77 fedett + 26 részleges + 2 nem falszifikált + 8 bizonyíték nélküli.
- M177–M182 hat mutáció külön forrásmásolatokon: mind a nevezett próba állítását buktatja, de az M179 tényleges hatása az alábbi.
- Saját korábbi F49-01/02 program és külön engedélyadás/megvonás ellenpár.
- Saját időbeli megvonás-ellenpélda (F51-01).
- r79 AKTÍV core program: eredeti tesztvilággal 17/18; kizárólag explicit olvasási joggal kiegészített tesztvilággal 18/18.
- r81 AKTÍV core program: eredeti tesztvilággal 5/7; ugyanilyen kiegészítéssel 7/7. A burkoló és összefűző teljes programját nem futtattam újra.

CLAUDE MÉRÉSE / BEADOTT BIZONYÍTÉK, NEM SAJÁT TELJES ÚJRAFUTTATÁS:
179/179 teljes mutáció; 303/303 kuka; 4/4 döntésszám; 11-es söprésből 10 zöld, 1 piros, 653 mp. A teljes külső összesítő forrása df6bff48, clean=true, dirty_files=[]; 15 megfelelő, 2 környezeti kihagyás, 2 eltérő program, complete_evidence=false. A teljes 19-es sort és teljes söprést nem futtattam újra.

## A külső programok kérdése eldöntve — nem kell az operátorra várni

Az R50-ben megnevezett három pozitív kontroll valóban azért bukik, mert nincs adatköri olvasási joga a tesztolvasónak. Saját futásban:
- r79/P01-flat-quantity bukik;
- r81/P01-pure-lines és F04-release-time-before bukik;
- az engedélyek hozzáadása után MINDEN eredeti állítás változatlanul teljesül: 18/18 és 7/7.

A szigorítás marad. A hiányzó engedély melletti kiadást nem állítjuk vissza.

**Külső ellenőrzői döntés és engedély:** az aktív r79/r81 core tesztvilág kapjon kimondott készlet- ÉS ár-olvasási jogot a rendszer saját íróján, rögzített alappal. Mindkét adatkör szükséges, hogy az ártiltást vizsgáló negatív ágakat ne pusztán a hiányzó árjog állítsa meg. Az állítások, várt eredmények, negatív esetek, időbeli órák változatlanok maradnak.

A saját kipróbált előkészítés (az importok a programok meglévő source/v3ref elrendezését követik):

```js
import { recordAuthorityBasis } from './source/v3ref/authorityBasis.mjs';
import { grantReadScope } from './source/v3ref/scopeGrant.mjs';

function explicitReadFixture(store) {
  const basis = recordAuthorityBasis({
    store, basisId: 'review-reader', bookId: 'a',
    issuerSubject: 'member', effectiveAt: T, recordedAt: T,
    allowedScopes: ['keszlet', 'arak'],
    evidenceRef: 'synthetic:review-R51',
  });
  assert(basis.ok);
  for (const scope of ['keszlet', 'arak']) {
    assert(grantReadScope({
      store, subjectId: 'member', bookId: 'a', scope,
      basisId: 'review-reader', basisVersion: 1,
      grantedBy: 'member', effectiveAt: T, recordedAt: T,
    }).ok);
  }
}
```

A két aktív program test() előkészítésében közvetlenül a meglévő member tagsági sor létrehozása után explicitReadFixture(store) került. Ez szintetikus belső tesztadat, nem üzleti önfelhatalmazási szabály és nem az író külső hitelesítésének bizonyítéka.

A történeti *.core.mjs forrás maradjon bájtazonos. Az aktív változat adaptációját és eredetét verziózva, R51 forrással jelöld; az activeCoreProgram és az eredmény metaadata már ne állítsa, hogy KIZÁRÓLAG mennyiség-literál tér el. A változás pontosan a fenti teszt-előfeltételre szól. Az új teljes külső futás történjen meg; a régi piros mérést ne nevezd visszamenőleg zöldnek. Ne pusztán minősítsd át vagy hagyd ki az eseteket.

## F51-01 — a megvonásnak nincs külön tudásideje

Hely: scopeGrant.mjs revokeReadScope / readScopeGrantAt; store.mjs scope_grant séma.

A megadásnak effective_at és recorded_at mezője van. A megvonás viszont ugyanabba a sorba ír egy revoked_at értéket; nincs külön rögzítési ideje. Az olvasó kizárólag a megadás recorded_at-ját nézi. Így egy később megtudott, visszamenőleges megvonás a KORÁBBI tudásállapotot is átírja.

Saját minimális reprodukció:
1. B alap és készletjog megadva 2026-03-01T00:00:00.000Z hatállyal és rögzítéssel.
2. readScopeGrantAt(validAt=2026-03-15T00:00:00.000Z, knownAt=2026-03-20T00:00:00.000Z) → granted:true.
3. Később rögzítendő megvonás: at=2026-03-10T00:00:00.000Z, recordedAt=2026-04-01T00:00:00.000Z. A jelenlegi revokeReadScope API a recordedAt paramétert nem kezeli, csak a revoked_at mezőt írja.
4. UGYANAZ a márciusi validAt/knownAt lekérdezés → granted:false, scope_grant_revoked.

Elvárt: a március 20-i tudás szerint a jog még fennállt; az április 1-jei vagy későbbi tudás szerint már látható a március 10-i megvonás. Az aktuális kiadás természetesen az aktuálisan alkalmazható tudás és hatály szerint zárjon. Ez történeti lekérdezési hiba, nem most kimutatott új árkiszivárgás.

Feladat: a jog megadása ÉS megvonása ugyanazzal a két időtengelyes történeti fegyelemmel működjön; használd a meglévő közös megközelítést. Ne töröld a korábbi tényt, ne told a megadás recorded_at-ját a megvonás napjára. Együtt mérendő: később ismert visszamenőleges megvonás; előre ütemezett megvonás; megvonás előtti és utáni tudás/hatály; újraadás; más alany/könyv/adatkör érintetlensége; hibás idő nevezett, írásmentes elutasítása. A megadás–kiadás–leltár–megvonás teljes útját és a kiadási időhatárt is ellenőrizd.

## F51-02 — az M179 most sem azt bizonyítja, amit a REPORT mond

Saját, elkülönített M179 futás eredménye:
- alap megvonva: kiadva → zárva (outside_basis_scopes);
- alap lejárt: zárva (outside_basis_scopes);
- leltár-sorok: 5, ugyanúgy mint az ép világban.

A próba FAIL, de a reason várt basis_revoked/basis_expired értéke miatt. A magyarázat: state.in_effect ellenőrzésének kihagyása után a basisAsOf nem ad használható live scopes listát; a következő korlátvizsgálat továbbra is zár.

Az R50 REPORT és D-VS-3058 kijelentése, hogy „ugyanez a kihagyás valódi kiadást eredményez”, ezzel cáfolt. Ez az R49-ben már jelzett bizonyítási pont továbbra is nyitott. Az ép rendszer megvonás utáni zárását a pozitív/negatív futás igazolja; a mutációról ettől még nem mondható, hogy adatkiadást okoz.

Feladat: a mért hatást nevezd pontosan. Ha adatkiadási regresszió elleni falszifikációt állítasz, ahhoz ténylegesen kiadást okozó, nevezett ellenpár legyen, ne egy összetett assertion indokhibájából következtess rá. A történeti R50 állítás helyesbítése legyen forrással jelölt; a dokumentumot, döntésnaplót, norma-bizonyítékot és összesítőket együtt rendezd. Nem szükséges mesterségesen duplikált mutáció; szükséges a tényleges hatás és a bizonyítás határának igaz leírása.

## A szerződés és a hiányszövegek ugyanebben a csomagban

releaseScope.mjs fejléc és RSB_CONTRACT.stated_limits még membership_only alapú kiadást állít korláthiánynál; order/sources pedig a régi sorrendet és forrásokat sorolja. Ezek ellentmondanak a most helyesen szigorított kódnak. Vezesd át az SGR-01-et, a tényleges sorrendet és a hiány zárását.

A norms.mjs remaining „EGY, üzleti döntésre váró pont marad” állítása nem teljes: F51-01 és a bizonyítási hiány technikai teendő. Ne az operátori döntésre váró meghívóbővítést nevezd meg egyetlen akadálynak.

A meghívóba olvasási jogok felajánlása jelenleg külön, későbbi üzleti téma; most maradjon a kifejezett jogadás. Nincs szükség új meghívófunkció vagy szerepkör tervezésére ahhoz, hogy ezt a csomagot lezárjuk. Ismeretlen adatkörnév zár; néma stock/price fordítás nincs. Mezővetítés hiánya továbbra is a klauzula saját feltétele, nem új feladat.

## Egy összefüggő végrehajtás és egy REPORT

A következő csomag együtt tartalmazza:
1. a most engedélyezett, már kipróbált aktív külső teszt-előfeltétel adaptációját;
2. a scope-grant megvonás két időtengelyének rendezését és releváns ellenpárjait;
3. az M179 állítás, a szerződés és a hiányszövegek helyesbítését;
4. a végső forráshoz kötött méréseket, teljes külső láncot és teljes söprést, minden fennmaradó kihagyást/pirosat megőrizve.

Ne legyen köztes visszaadás pusztán a fenti tesztadaptáció engedélye miatt: azt ez a kör megadta. A következő REPORT különítse el a saját futást, átvett mérést és dokumentumállítást; az elfogadás független ellenőrzői feladat. A chat tájékoztatásának legalább fele közérthető magyar legyen.

Az R42 és R45/R46 lezárt csomagjai maradnak. Nincs újratervezés, párhuzamos feladat, merge, telepítés, V2-módosítás, új üzleti mini modul vagy HTTP-adapter.
R19 PLAN 24 QNT-követelménye és 36 tervezett esete megmarad: ismeretlen mennyiségű tétel létezhet/feldolgozható; becslés utólag nem válik méréssé; pontosítás nem készletmozgás. Teljes QNT később, core-alapjai nem törölhetők.
R24-től fogyasztás ismeretlen, költség null, nem nulla; V2 ár/érték-javulás nem bizonyított.
Board-integráció PR155/160: külön valach-family/vs repo.
Modellajánlás: claude-opus-5, medium; váltás az operátoré.
