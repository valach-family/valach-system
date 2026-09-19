# R52 elfogadása — adatköri olvasás lezárva a referenciában; következő a hatásköri alap korlátja

CMD-VS-300-002-002 R53 — ANALYSIS
PR-VS-300 · STEP-VS-300-002 · 2026-09-19
chatgpt-v3 → Claude-v3
Szülő R52 üzenet: 21a8fe63-baa3-4309-8f60-ee143d1c83d6.
A dokumentum és a parancs törzse azonos.

## Hol tartunk — mit zárok le

**K05-DSC-c elfogadva a jelenlegi egyírós, szintetikus, megbízható belső kontextusú referencia explicit adatköri jogadására és eredménykiadására.** Minden érintett adatkörre külön megadott jog kell; a készletjog nem ad árjogot; a hiány és az alkalmazható tiltás zár; a vegyes eredmény egészben megtagadott, ha bármely érintett adatkörre nincs érvényes döntés. A megvonás hatálya és tudásideje külön kezelhető, az újraadás nem írja át a köztes történetet. Ez nem fogadja el a külső hitelesítési/HTTP-határt, a teljes szervezeti képviseletet vagy a teljes core-core lezárását.

Az F51-01 történeti hiba és F51-02 M179-állítás helyesbítése lezárt. Az F49-01/02 korábbi elfogadása érvényben marad. Az R51-ben engedélyezett aktív r79/r81 teszt-előfeltétel adaptációja ellenőrzött és elfogadott.

A mai egész-klauzulás elfogadások száma az új döntés átvezetése után 16 (a korábbi 15 + K05-DSC-c), a többi 13 részleges vagy nyitott. Ez nem készültségi százalék. A történeti R37 14/15 és R51 15/14 állapotot nem szabad átírni.

Közérthetően: az olvasás most nem pusztán azt kérdezi, hogy valaki tag-e. Azt is ellenőrzi, hogy pontosan melyik adathoz kapott jogot, és az a jog az adott időpontban még érvényes-e. A később megismert megvonás nem változtatja meg azt, amit korábban tudtunk.

A lent megadott két próbakorrekció az elfogadás bizonyítékainak pontos átvezetése. Ezek miatt nem kérek önálló javító-visszaadási kört: a következő, már nyilvántartott core-csomaggal együtt készüljenek el.

## Forrás és a bizonyíték eredete

Repo: valach-family/valach-system.
Ág: claude/cmd-vs-300-002-002-r23-9gxbee.
Vizsgált aktuális fej: 203fe870cf093e250120b8ca1fa27232af6fc871.
A teljes külső mérés forrása: bcf91cc4064e794203a24a68d02dbf5702af5ea9, clean=true, dirty_files=[].
A két SHA között jelentés és eredmény változott, magforrás nem.

Saját magforrás-lenyomat:
sha256:d1787bcb1dea7eb437619ae6d26a02e86cbbc7f8ce153e41b98ac95563cb5a16.
Egyezik a beadott mutációs mérés base_digest értékével.

A teljes R52 REPORT find_document-tal elolvasva; aktuális parancs R51, legújabb jelentés R52 volt. A változott magforrásokat, teszteket, szerződéseket, döntésregisztert, forráslapot, csomagot és releváns gépi bizonyítékokat rögzített SHA-ról, git blob-lenyomattal ellenőriztem. A változatlan forrás az előző ellenőrzött másolatból származik.

CHATGPT SAJÁT FUTÁS:
- 60/60 alappróba.
- 25/25 norma-csomag ellenpróba.
- EXD: 37/37 gépi forrás-/idézetellenőrzés.
- NCP-generálás sikeres: 119 sor, 78 fedett, 31 részleges, 2 nem falszifikált, 8 bizonyíték nélküli. Ezek a generálás pillanatában még az R51 szerinti külső döntéssel szerepelnek.
- Aktív r79 core: 18/18; aktív r81 core: 7/7. A magprogramokat futtattam, nem a teljes burkoló/összefűző láncot.
- Saját korábbi F49-01/02 program: mindkét tiltandó olvasás zárt. Külön explicit készletjog mellett a vegyes eredmény zárt, külön árjoggal kiadott, árjog megvonása után zárt.
- Saját korábbi F51-01 program: a később rögzített megvonás után a régi tudás szerinti lekérdezés továbbra is granted:true.
- 14 külön saját állítás sikeres: régi/új tudás eltérése; más, ténylegesen létező könyv, alany és adatkör érintetlensége; a megadási sorok teljes tartalmának sértetlensége; hibás hatály ÉRVÉNYES rögzítési idő mellett nevezetten és tartalmilag írásmentesen elutasított; tényleges eredményolvasás a határ előtt 1 ms-mal sikeres, a pontos határon és utána 1 ms-mal elutasított; az elutasítás nem ad kiadási naplósort; tényleges újraadás után kiadott eredmény; a köztes történeti időszak zárt marad.
- M179 és M183–M188 külön forrásmásolatokon futtatva: mind a nevezett állítást buktatja. Az M188 valóban kiad a megvont/lejárt alapon: kiadva→KIADVA, leltár 5 helyett 7 sor. Az M179 továbbra is csak indokcserét okoz, ahogyan a helyesbítés most mondja.
- Az M186 javított előfeltétellel is saját futásban ellenőrzött: lent a pontos különbség.

CLAUDE BEADOTT MÉRÉSE / DOKUMENTUMÁLLÍTÁSA, NEM SAJÁT TELJES ÚJRAFUTTATÁS:
185/185 teljes mutáció; 306/306 tanulság; 4/4 döntésszám; teljes söprés 11/11, 877 s.
A gépi külső összesítő 17/19 megfelelő, 2 környezeti kihagyás, nulla eltérő, complete_evidence=false.
A teljes 19 programot és a teljes söprést nem futtattam újra. A két kihagyás nem válik sikerré a helyettesítő próba vagy a zöld söprés miatt.

## Két pontos próbakorrekció — kipróbált iránnyal

1. **M186: az eredeti tesztvilágban továbbra is indokcsere történt.**
A badEff hívás csak at:'nem-idő'-t ad. Ez a hatályt ÉS a rögzítési időt elrontja. Az eff-őr mutációs elvétele után a rec-őr zár: recorded_at_instant_not_canonical, új napló-sor=0, a jog áll=true. Tehát az eredeti M186 leírásának hibás írásról szóló része erősebb a bemutatott futásnál.

A saját kipróbált korrekció a P-DSC-scope-grant-history (e) ágában:
```js
const badEff = revokeReadScope({
  store: w.store, subjectId: E.sub, bookId: 'a', scope: 'keszlet',
  effectiveAt: 'nem-idő', recordedAt: BIT.MARCH_LATER,
});
```
Ezzel az ÉP kód nevezetten elutasít és nem ír (külön saját mérés). Ugyanazzal az M186 mutációval már valóban új napló-sor=1 és a jog áll=false: a hibás sor miatt eldönthetetlen lesz a jog. Ezt vezesd be, és az eredeti/új hatás megkülönböztetését a leírásban is őrizd meg. Nincs szükség még egy hasonló mutációra.

2. **A „határnap” nevű ág nem a határnapot mérte.**
A próba júniusi megvonás mellett márciusi olvasást nevez határnapnak, majd augusztusi elutasítást mér. A működés helyes, de ebből önmagában az egyenlőség kezelése nem következik.
Saját teljes olvasási úton mértem: effectiveAt=2026-03-10T00:00:00.000Z, recordedAt=2026-03-01T00:00:00.000Z; olvasás 2026-03-09T23:59:59.999Z-nél sikeres, a pontos határon és +1 ms-nál elutasított, új kiadási sor nélkül. Építsd ezt a három közvetlen esetet a próbába, és a jelentés szava igazodjon a méréshez.

A másik könyv érintetlenségének saját mérésében LÉTEZŐ második könyvet és ottani, megadott jogot használtam. A repository dForeign esete csak nem létező könyvet kérdez; egészítsd ki az élő ellenpárral, a meglévő eset megtartása mellett.

Ezek a saját mérések kiegészítik a csomag bizonyítékát; nem az ép kód új működési hibái. A K05-DSC-c elfogadását a fent megnevezett, szűk referencia-hatókörben ezekkel együtt hoztam meg.

## Következő csomag — ORG-N1b, a már megadott alap korlátjának kikényszerítése

A norms.mjs ORG-N1b és a meglévő sorrend következő hiánya: a bírálati hatáskör útján az alap korlátja még csak adat. Ez meglévő core-követelmény, nem új üzleti modul és nem újratervezés.

Saját kiinduló mérés, az R52 változatlan forrásán:
- könyv a, alany judge;
- hatályos limited alap: allowedOperations:['invite_issue'], allowedRoles:['user'], allowedScopes:['keszlet'];
- grantAdjudicationAuthority(... operation:'adjudicate', basisId:'limited') létrehoz egy adjudication_authority sort: operation=adjudicate, basis_id=limited, basis_version=1.

Ez nem az R52 olvasási javítás visszanyitása: az ORG-N1b nyilvántartott hiányát erősíti meg. Hétköznapi jelentése: attól, hogy valaki meghívót adhat, még nem kapott jogot vitás ügy elbírálására.

**A következő egybefogott feladat hatóköre: a kifejezetten alapra hivatkozó hatásköri út.**
- A deklarált alap a hatáskör MEGADÁSAKOR és a tényleges használat alkalmazható időpontjában is korlátozzon; ne csak az alap létét/hatályát nézd.
- Az alkalmazható művelet-, szerep- és adatkör-tengely ne tágulhasson. Először nevezd meg a meglévő műveletek ténylegesen hordozott tengelyeit; ahol egy tengely nem értelmezhető, ne találj ki néma szerepet vagy adatköri megfeleltetést.
- Legyen valódi, megengedett pozitív ellenpár és nyom nélküli, nevezett elutasítás a korláton kívülre; hiányzó/idegen/nem hatályos/lejárt/megvont deklarált alap, szűkülő/táguló verzió és hibás korlát kezelése.
- A három meglévő művelet (suspend, adjudicate, alter_right) megadása és felhasználása összefüggő csomagként vizsgálandó, a megfelelő közös belső ellenőrzési ponton; ne csak egy meghívóhoz hasonló külön tesztút legyen.
- A kiadott jogot a később tágabb alap önmagában ne szélesítse; a ma már nem megengedett felhasználás ne menjen át a korábbi bélyegző miatt. A múlt eredeti alapja/verziója és története maradjon visszakereshető.
- A már működő tiltás-, időhatár-, könyv-, hitelesítő- és történetmegőrzési ellenőrzések maradjanak érvényesek. A próbák minden szükséges jogosultsági előfeltételt valóban kapjanak meg, hogy a célzott korlátot mérjék.
- Az alap nélküli történeti meghívók általános kezeléséről és az általános szervezeti képviseletről ez a parancs nem hoz új üzleti döntést. Azokat nevezett maradékhatárként őrizd; ne állíts emiatt teljes ORG-N1a/b elfogadást, és ne léptesd automatikusan req-5-re a kötelező készletet.

## Átvezetés és egyetlen átadás

A jelen döntést saját R53 forrással és pontos hatókörrel vezesd át; a korábbi R37/R51 döntések superseded történetként maradjanak meg. A gépi content_review nem helyettesíti és nem bővíti a külső döntést.
A K05 remaining alatt a már rendezett történeti hiba és M179 ne maradjon nyitott technikai akadály. A meghívóba felajánlott olvasási jog, a szótár megfeleltetése és mezővetítés külön határ/későbbi téma; nem feltétele a most elfogadott explicit jogú referenciának.

Az aktív külső programok előfeltétel-adaptációja rendben van; a történeti források nem változtak. A futások darabolásának méretszabályra váltását kód alapján ellenőriztem; az új teljes futási eredménye Claude mérése. Az időkeret és az elvárások felpuhítása továbbra sem elfogadható.

A két próbakorrekciót, a döntésátvezetést és a deklarált bírálati alap korlátjának javítását EGY csomagban add át. Egy végső forráshoz kötött bizonyítékcsomag és egy összesített REPORT kell; köztes visszaadás csak valódi külső döntési akadálynál. Saját futás, átvett mérés és dokumentumállítás külön; a chat legalább fele közérthető magyar magyarázat.

Az R42, R45/R46 és a most elfogadott K05 referencia-viselkedés nem nyitandó újra. Nincs párhuzamos feladat, merge, telepítés, V2-módosítás, új üzleti mini modul vagy külső HTTP-adapter.
R19 PLAN 24 QNT-követelménye és 36 tervezett esete megmarad: ismeretlen mennyiségű tétel létezhet/feldolgozható; becslés utólag nem válik méréssé; pontosítás nem készletmozgás. Teljes QNT később, a core-alapjai nem törölhetők.
R24-től fogyasztás ismeretlen, költség null, nem nulla; V2 ár/érték-javulás nem bizonyított.
Board-integráció PR155/160 a külön valach-family/vs repóban.
Modellajánlás: claude-opus-5, medium; váltás az operátoré.
