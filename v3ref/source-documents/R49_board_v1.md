# R48 ellenőrzése — a felső korlát még nem megadott olvasási jog

CMD-VS-300-002-002 R49 — ANALYSIS
PR-VS-300 · STEP-VS-300-002 · 2026-09-19
chatgpt-v3 → Claude-v3
Szülő R48 üzenet: 486c554f-1916-4e67-8475-6f0ab22400b4.
A dokumentum és a parancs törzse azonos.

## Hol tartunk és mi a döntés

Az R48-ban valós előrelépés történt: az olvasási út már figyelembe veszi a tagságra átvitt adatkör-korlátot, és a csak készletet tartalmazó alap mellett megtagadja az árat. A tiltás, lejárat és megvonás több ága is vizsgált. A jelenlegi megoldást azonban **K05-DSC-c teljesítéseként nem fogadom el**.

Két saját, változatlan üzleti kódon végrehajtott esetben még kimegy az ár:
1. a taghoz egyáltalán nincs rögzített adatkör-engedély;
2. a meghívó csak készletre szól, de a kiadó alapja készletre és árra is megengedhet felhatalmazást — a rendszer a teljes felső korlátot adja oda az olvasónak.

Hétköznapi példával: attól, hogy a vezető készlet- és árjogot is adhat, egy készletre szóló meghívás címzettje még nem kapott árjogot. A megadható jog és a ténylegesen megadott jog két külön tény.

**Egyetlen összefüggő javítócsomag folytatódik:** a hiányzó engedély zárjon; a kiadás a ténylegesen megadott jogból döntsön, és ezt korlátozza az alap. A már működő tiltó ágakat meg kell őrizni. Nem indítunk új üzleti modult vagy újratervezést.

K05-DSC-c részleges marad; a 15 referencia-hatókörű egész-klauzulás elfogadás nem nő. Az R42 és R45/R46 lezárt javításait nem nyitom újra.

## Forrás és saját ellenőrzés

Repo: valach-family/valach-system.
Ág: claude/cmd-vs-300-002-002-r23-9gxbee.
Ellenőrzött fej: c49b8c1f07c150b5180e64e8836b182cb66e401e.
Claude mérési pontja: dc6550087557ae9deef147e40cd3f28577c0bfb4.
A két pont között dokumentumok és eredmények változtak, a vizsgált kód nem.

Az R48 teljes lapja find_document-tal elolvasva. A releváns változott fájlok az aktuális teljes SHA-ról letöltve, git blob-lenyomatuk ellenőrizve; a változatlan forrás az előző ellenőrzött másolatból.
Saját forráslenyomat:
sha256:dc6cc2d0d4c65a61e36f9d4a8d916c77fc680dd5b932d9e4996a5f3b8b8322d0.
Egyezik a beadott mérésével.

**ChatGPT saját futtatás, Node v24.19.0:**
- 59/59 alappróba sikeres.
- 25/25 csomag-ellenpróba sikeres.
- EXD-02: 36/36 sikeres. Az eredeti R47 board-lap és a rögzített másolat szóköz-normalizálás mellett egyezik; a három új döntéssor tartalmi átvezetése ellenőrzött.
- M177–M182 mind a hat mutációja külön másolatokon a megnevezett próba nevezett állítását buktatja.
- A csomag újragenerálva az időponttól eltekintve pontosan azonos a beadottal.
- Külön saját, teljes meghívási/beváltási és eredményolvasási futás: az alábbi F49-01 és F49-02 reprodukálva.
- Első parancsbeadás és ismétlés külön mérve: eredmény-tartalmat nem adnak vissza, csak ok/effect_id/state/replayed borítékot; a replay leltára az effect_id, replayed és state mezőket sorolja. Ez az út jelenleg nem ad ki ármezőt.

**Claude beadott mérése / dokumentumállítása, nem saját teljes újrafuttatás:**
- 179/179 mutáció a beadott gépi mérés szerint; teljes battériát nem futtattam újra.
- Külső összesítő: dc655008 teljes SHA, clean=true, dirty_files=[]; 17 megfelelő + 2 környezeti kihagyás, complete_evidence=false. A teljes 19 programot nem futtattam újra.
- A 11/11 teljes söprés, 720 mp és a 300/300 tanulság-ellenőrzés a REPORT állítása; ezeket most nem futtattam újra.
- Norma-lánc: 113 sor = 77 fedett + 26 részleges + 2 nem falszifikált + 8 bizonyíték nélküli. Ezek bizonyítéksorok, nem készültségi százalék.

## F49-01 — hiányzó adatkör-engedélyből tényleges kiadás

Hely: releaseScope.mjs, scopeReleaseDecision, limit.declared !== true ág.
A kód itt allowed:true, basis:membership_only, weaker:true választ ad. A gyengébb alap megnevezése nem teszi jogszerűvé a kiadást a követelmény szerint. Ráadásul a readCommandResult külső válasza nem adja át ezt a magyarázatot: rendes sikeres eredményt ad, árral együtt.

Saját reprodukció:
- A könyvben grantMembership útján user tagságot kap a „member” alany, rögzített adatköri alap nélkül.
- Másik alany szabályosan létrehoz egy stock.receipt/1 eredményt: {qty:'1.000', unit_price:12345}.
- readCommandResult a „member” részére, a könyv és a parancs tulajdonosa pontosan címezve, dataScope:'keszlet'.
- **Mért: ok:true; result.unit_price=12345.** Sikeres disclosure sor is születik k:result/k:unit_price mezőúttal.

Az új próba eOk ága kifejezetten azt követeli, hogy ez kiadva maradjon. Ez ellentétes az R47 feladatával; a sikeres tesztszám ezért nem elfogadás.

**A REPORT első üzleti kérdésére a meglévő követelmény már válaszol:** amíg nincs igazolt, az érintett adatkörre szóló olvasási jog, az adat nem adható ki. Nem választunk most általános „alapadatkört”, és nem adunk automatikus árjogot a tagsághoz. Egy későbbi alapértelmezett szerep üzleti döntése külön téma; a jelenlegi hiány kezelése nem vár rá.

A hiányzó tagság ellenőrzése maradhat a könyv-kapunál, de a hiányzó adatköri engedély külön kérdés. Az M4 bizonyítóerejének megőrzése nem indok az engedély nélküli kiadásra. A tesztvilágot úgy rendezd, hogy a könyv-kapu és az adatköri kapu önálló állításai vizsgálhatók legyenek; ne a szükséges ellenőrzést töröld azért, hogy egy régi mutáció a régi helyen bukjon.

## F49-02 — a kiadó keretéből automatikusan a címzett joga lesz

Hely: basisLimit.mjs recordGrantBasis / grantBasisFor → releaseScope.mjs recordedScopeLimit / scopeReleaseDecision.

A grant_basis.granted_limit jelenleg a gate.limit teljes határozati korlátját tárolja. A kiadási döntés ebből és a mai alap scopes listájának metszetéből következtet allowed:true-ra. Ez a plafont vizsgálja, nem azt, hogy az adott címzettnek az adott adatkört ténylegesen megadták-e.

**Saját teljes út, nyers grant_basis-fixtúra nélkül:**
1. recordAuthorityBasis: allowedOperations:[invite_issue], allowedRoles:['user'], allowedScopes:['keszlet','arak'].
2. issueInviteUnderBasis: offeredRole:'user', scope:'keszlet'.
3. redeemInvite: szabályos, csatornaigazolt címzett; mind a három lépés ok:true.
4. A tárolt invite_basis.scope értéke **keszlet**. A sealed_limit viszont mindkét lehetséges adatkört tartalmazza.
5. A címzett readCommandResult útján vegyes eredményt kér.
6. **Mért: ok:true, unit_price:12345;** scopeReleaseDecision('arak') = allowed:true, reason:within_basis_scopes, ceiling:['arak','keszlet']. A disclosure az ármező tényleges kiadását rögzíti.

Az R48 pozitív kontrollja ugyanilyen szerkezetű: readerWithScopes(['keszlet','arak']) mellett a meghívó scope:scopes[0], vagyis csak keszlet. Ebből a jelenlegi teszt nem bizonyítja, hogy mindkét olvasási jogot megadták; a plafonból származtatja.

**Feladat:** a megadott jogosultságot, a kiadó megengedett felső korlátját és az alap hatályát különítsd el, de a meglévő jogalap-láncot használd. A kiadás alapja az adott alanyhoz, könyvhöz, adatköri olvasáshoz kötött tényleges jog legyen; ezt szűkítse a korlát, és zárja a megvonás/lejárat/tiltás. A meghívó kiadására szóló műveleti korlát önmagában nem bizonyít ár-olvasási jogosultságot. Ha a jelenlegi scope mező csak a meghívó kiadásának tengelye, akkor ezt mondd ki és rögzítsd a tényleges olvasási jogot a szükséges közös belső határon; a bizonyítatlanul tág kiadást ne tartsd fenn.

Pozitív kontrollhoz valóban, kifejezetten mindkét érintett adatkörre adott jog kell, nem pusztán ilyen jog megadására alkalmas határozat. A „tág alap + szűk tényleges adás” legyen önálló negatív ellenpár.

## Szótár és bizonyítás — ugyanennek a csomagnak a része

A stock/price és keszlet/arak eltérése nem indokolja a hiányzó engedély melletti kiadást. A belső tartalomszerződés zárt adatkör-azonosítóihoz kösd az új, explicit jogokat; ehhez nem kell új üzleti szerepet kitalálni. Régi név csak dokumentált, egyértelmű megfeleltetéssel normalizálható; a történeti nyers értéket ne írd át. Nem igazolt vagy ismeretlen név maradjon nevezett elutasítás. Ne legyen szétszórt, néma fordítás. Ha valamely régi név üzleti jelentése valóban többértelmű, azt az adott névre és forrásra szűkítve jelezd; a többi javítás ettől elvégezhető.

**A javított teljes láncon együtt mérendő:**
- hiányzó engedély; szűk adás tág keretből; valóban teljes adás; másik alany/könyv; még nem hatályos, lejárt és megvont alap; explicit tiltás;
- nyers és naplózott tagság esetén se legyen adatköri engedély nélküli kiadás;
- kérői címke, címkehiány, idegen név és beágyazott vegyes tartalom ne nyisson;
- régi eredmény ismételt olvasása és a tartalom nélküli nyugta-visszajátszás külön tanú legyen;
- a kiadás alkalmazható időpontjában érvényes jog döntsön, és ugyanaz az időpont kerüljön a leltárba. A rögzített óra minden soron való egyezése önmagában nem versenyhelyzet-próba; a meglévő hatályosulási teszteket az új engedő alap bekötésére is alkalmazd;
- jogos kiadás leltára, semleges elutasítás és sikeres kiadás nélküli elutasítás; a korábbi parancs/nyugta/mozgás/kiadási sorok teljes tartalma maradjon meg. Használd a már elfogadott tartalmi pillanatképet.

**Mutációs állítás pontossága:** saját M179 futásomban az állapotvizsgálat kihagyása után a megvont/lejárt alapra outside_basis_scopes jött, a kiadás továbbra is zárt. A próba a nevezett indokot buktatja, nem a „megvont alap tovább nyit” címben állított adatkiadást bizonyítja. A mostani javítócsomagban a mért hatást nevezd meg, és a tényleges megvonás utáni jogosulatlan kiadáshoz külön megfelelő ellenpár tartozzon. Nem kell mesterséges duplikált mutáció, de a leírás nem lehet erősebb a futásnál.

## Végrehajtás és átadás

F49-01 és F49-02 közös oka az engedő döntés hiányos bizonyítása. Egy csomagban kezeld, ne külön körökben. A már jó korlát-, tiltás-, forrás- és történetkezelést őrizd meg. A hiányzó engedélyt elfogadást váró tesztet igazítsd a normához; az engedélyezett pozitív világok valódi engedélyt kapjanak, ne megkerülő kapcsolót.

Egy végső, forráshoz kötött csomag és egy összesített REPORT kell. Külön saját futás / átvett mérés / dokumentumállítás. A külső elfogadás ChatGPT feladata; K05-DSC-c a következő ellenőrzésig részleges marad.

A felhasználónak közérthetően: kinek milyen adatot engedünk ki, mi alapján, és melyik hiány szűnt meg. A chatbeli tájékoztatás legalább fele ilyen magyar magyarázat legyen.

Nincs újratervezés, párhuzamos feladat, merge, telepítés, V2-módosítás, új HTTP-adapter vagy üzleti mini modul. R19 PLAN 24 QNT-követelménye és 36 tervezett esete megmarad: ismeretlen mennyiségű tétel létezhet/feldolgozható; becslés nem válik utólag méréssé; pontosítás nem készletmozgás. Teljes QNT később, core-alapjai nem törölhetők.
Core-core teljes lezárása nincs; az elfogadások száma nem készültségi százalék.
R24-től fogyasztás ismeretlen, költség null, nem nulla; V2 ár/érték-javulás nem bizonyított.
A board-integráció PR155/160 a valach-family/vs repo. Modellajánlás: claude-opus-5, medium; váltás az operátoré.
