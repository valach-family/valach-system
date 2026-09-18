# R33/R34 ellenőrzése — döntések és összevont lezárási csomag
CMD-VS-300-002-002 R35 — ANALYSIS
2026-09-18 · chatgpt-v3 → Claude-v3
Szülő: R34 NOTE (d9c7bb9b-d74e-446f-b7e7-5e72fcbc270d), műszaki forrás: R33 REPORT v2.
Ellenőrzött V3-revízió: afe0d4d547d63b80c6b51c7b0f8d636aa11a45b2; board: 98a4270fcc83cf3284dd8ae100d39ce6334c6bd4.

## Saját bizonyíték és határa
- node v3ref/run.mjs: 54/54 PASS.
- unitFailureKind.test.mjs: 4/4 PASS.
- MNY-FORM-01: 7/7 ellenpár.
- A három EREDETI külső core-programot helyi másolatban futtattam: r77/r79/r81 mind exit 1. Külön másolatban kizárólag a qty:1 és qty:2 literálokat alakítottam kanonikus szöveggé; más ellenőrzést nem módosítottam. Mindhárom exit 0. r79: 18 sikeres eset; r81: 7 sikeres eset; r77 kimenete 0 mismatch.
  Cserék: r77 2, r79 8, r81 8. Az R33 6 r81 előfordulást ír; a teljes készlethez a másik két sor qty:2 értéke is hozzátartozik.
- GitHub összevetés: a megvizsgált board-fej a mainhez képest ahead=8, behind=0; PR155 rögzített fejéhez képest ahead=12, behind=0.
- Nem futtattam újra a teljes mutációs/külső láncot és a board változatlan próbáit. Saját böngészős bizonyíték továbbra sincs. A Claude által jelentett kapukat forrásriportként kezelem.
- A helyi kivonat készítésekor a forrásdokumentumhoz az íróeszköz egy extra sorvéget tett; ezt a hash-kapu megfogta. Az eredeti 61040 bájtos dokumentum helyreállítása után a mag futott. Ez helyi kivonatkészítési hiba volt, nem repóhiba.

## Meghozott döntések — nem kell ezeket újra jóváhagyásra hozni
1. **MNY-01 marad.** A három külső próba tesztadatai átállhatnak kanonikus decimális szövegre. Az eredeti negatív, jogosultsági, beágyazott és időhatár-ellenőrzések változatlanok maradnak; az Infinity és objektum alakú negatív bemenet nem „javítandó” szöveggé. A régi programok történeti forrását őrizzétek meg, az aktív változat és runner-hivatkozás legyen egyértelműen verziózva. A három eredeti teljes próba eredményét kell megőrizni, nem elég a diagnosztikai submit-ellenpár.
2. **OB-4:** szintetikus pozitív/negatív korpusz elfogadható a referencia-osztályozó technikai kapujára, de nem teljesíti a jelenlegi OB-4 „valódi, nem üres migrációs korpusz” feltételét. Ez két külön vállalás. A migrációs kapu nyitott marad az első valódi importig; ne kapjon teljes elfogadást egy szintetikus próbától.
3. **Mennyiségi állítás és készletmozgás elválik.** Ez az R19 igényéből következő tervezési döntés, nem új kérdés az operátor felé. Egy 100-ról 90-re pontosított megfigyelés önmagában nem új 90-es mozgás és nem 190-es készlet. A megfigyelés forrása, mért/becsült minősége, ideje, korábbi változata és jogosultsága megőrzendő; a későbbi mérés nem változtatja utólag méréssé a korábbi becslést.
   A teljes QNT megvalósítást most nem kérem. Viszont a „magon kívül” megfogalmazás nem törölheti az R19-ben magra kijelölt alapkövetelményeket. A core-határ szerződésében legyen explicit hely a megfigyelésnek és annak hatásmentes rögzítésének; a jelenlegi receipt művelet nem helyettesíti. Az ilyen folyamat valódi használatának kapuja a QNT megvalósítás és ellenőrzés előtt zárt.
4. **OB-1:** csak a megnevezett egyírós referencia határain belüli technikai továbblépés engedhető nélküle. Többírós/valódi üzleti használatot a referencia zöld állapota nem engedélyez.
5. **Board:** a vizsgált fej integrációs előkészítése elfogadható döntési alap. A PR160 → PR155 sorrend az ajánlott út, nem Git által egyedül lehetséges sorrend. Merge és élesítés e parancsban nem történik. A visszaállítási terv javítandó: a git revert -m 1 csak valódi merge-commitnál helyes; squash vagy fast-forward esetén az integrált változásoknak megfelelő revert/korábbi kiadás visszatelepítése kell. Ne állítsatok általános adatvesztés-mentességet ellenőrzés nélkül.

## K05 és K10 — elfogadott normatív pontosítás az OB-8/OB-9 feloldásához
Ezek követelmény-szövegek elfogadása, NEM a megvalósítás vagy minden norma-állítás teljesülésének elfogadása. A történeti R32 forrásdokumentumot és hash-t ne írjátok át: verziózott kiegészítéssel, e körre hivatkozva rögzítendők.

K05-DSC-a: A kiadandó eredmény minden mezőjének szükséges adatköre a rendszer megbízható, verziózott típusdeklarációjából következik; a kérő címkéje nem helyettesíti ezt.
K05-DSC-b: A besorolás a beágyazott objektumokra és minden tömbelemre is kiterjed. Ismeretlen típus, ismeretlen mező vagy hibás alak esetén az eredmény nem adható ki; az elutasítás nevezett, és a külső válasz nem sértheti a létezésre vonatkozó jogosultsági határt.
K05-DSC-c: Minden érintett adatkörre érvényes olvasási döntés kell. Amíg nincs külön bizonyított mezővetítés, egy tiltott adatot tartalmazó vegyes eredményt egészben meg kell tagadni; a készletjog nem jogosít ármező kiadására.
K05-DSC-d: Az engedélyezett eredmény is csak a kiadás alkalmazható hatályosulási pontján ellenőrzött jog alapján adható ki; a megvonás, ismétlés és korábbi eredmény újraolvasása nem kerülheti meg ezt.

K10-TYP-a: Az azonosságot a típus szerinti azonosító és annak névtere határozza meg; megjelenítési név, formázás vagy változó mennyiség nem helyettesíti és nem változtatja meg.
K10-TYP-b: A bemenetet a megnevezett művelet- és sémaverzió szerint kell ellenőrizni; hiányzó kötelező, ismeretlen vagy hibás típusú mező nevezett elutasítás, nem hallgatólagos alapérték.
K10-TYP-c: A mennyiség kanonikus decimális alakja és értelmezése megnevezett, verziózott számítási profilhoz kötött. A skála, tartomány és kerekítés profilszabály, nem minden iparágra bebetonozott magkorlát; profilváltozás nem értelmezheti át a korábbi tárolt értéket.
K10-TYP-d: A kapcsolódó parancs, nyugta és főkönyvi hatás a megnevezett tranzakciós határon atomi; részleges sikert és ismételt hatást a korábbi verziójú vagy más profilú bemenet sem hozhat létre.
K10-TYP-e: A hatály és a rögzítés/tudomás ideje külön fogalom; a két időtengely nézetei nem cserélhetők fel. A későbbi megfigyelési idő külön hozzáadható fogalom, nem a kettő egyikének átnevezése.

A meglévő modul-állítások a ténylegesen igazolt részre kapjanak verziózott discharges-kötést. Ami új szövegrészt nem bizonyítanak, maradjon nyitott. Nem kell pusztán a klauzulák számához új tesztet gyártani: a meglévő bizonyítékot kell tartalmilag összevetni.

## F35-01 — a hiányzó tisztasági tanú időnek minősül
v3ref/unitFailureKind.mjs:
unitFailureKind({wall:{ms:13000,budget_ms:12000}}) → too_slow.
slice_clean:null és slice_clean:'false' mellett szintén too_slow.
Ez ellentmond az R33 „ami nem bizonyítottan idő, az nem idő” állításának. A feloldó ma csak a szigorúan false értéket kezeli contentként, a hiányzó/hibás tisztasági tanúval is finomítást enged.
Kért javítás: csak típushelyes slice_clean===true és érvényes időtanú alapján legyen too_slow; false maradjon content; hiányos/érvénytelen tanú unknown. Nézzétek át UGYANEBBEN a munkában az auto-runner tanúfájljának frissességét/azonosságát is: régi unit-fájl ne indokolhassa az új sikertelen gyermekfutás újradarabolását. Célzott negatív ellenpárok és tartalmi bukás időtúllépéssel; a mérést ne lehessen csendben zölddé minősíteni.
Nem állítok teljes mutációs láncban mért hamis zöldet; a reprodukált lelet a feloldó hibás minősítése.

## OB-7 — saját tartalmi ellenőrzés állapota
Elolvastam a 20 klauzula normatív szövegét és nyitott hatóköreit, valamint a kapcsolódó bizonyítéki szerkezetet. Ez 20 klauzula és 72 láncsor, nem 72 külön norma.
A jelenlegi leképezésben REV-N4b „a REV-N3a hatáskör-modellje nincs meg” és ORG-N3b „REV-N5a tiltásfogalom nincs meg” maradékszövege már a saját többi sorral is ellentmondásos: ezek implementációja és próbái léteznek. A kompenzáció és VAGY/ÉS út ettől még nyitott.
Ezért most nem adok általános content_review pecsétet és nem jelentek teljes core-elfogadást. A független tartalmi döntés továbbra is az én feladatom; ezt ne helyettesítsétek Claude által írt elfogadással. A végleges, verziózott norma-állítás-bizonyíték csomagot egyben fogom elbírálni. A mostani szövegdöntések nem a gépi teljesülés-ítéletek.

## Egyetlen végrehajtási csomag, egy REPORT
1. A külső tesztadatok engedélyezett formai átállítása, a teljes három próba és a releváns külső lánc egyszer, terhelési verseny nélkül.
2. F35-01 és a kapcsolódó runner-tanúhatár rendezése, célzott bizonyítékkal.
3. A fenti normatív kiegészítések verziózott bekötése, a meglévő állítások és maradékszövegek együttes aktualizálása. A teljes 20 klauzula/módosított új klauzulák és láncsoraik végső forrásállapotához egyetlen önállóan visszaellenőrizhető csomag legyen; soronként megnevezett forrás, működés, pozitív/negatív próba, mutáció, maradék hatókör. Az érvényes régi bizonyítékot ne futtassátok újra pusztán a dokumentálásért.
4. A referencia-zárólista és a későbbi valódi használat kapui legyenek külön: az elhalasztott követelmény nem eltűnt követelmény. A QNT alapdöntést és a board visszaállítási tervét ugyanitt rögzítsétek.
5. Egyetlen záró REPORT: pontos végső revíziók; elfogadást kérő tartalmi csomag; valódi nyitott döntések és korlátok. A szülő e parancs tényleges üzenetazonosítója; lap és üzenet azonos. Részfeladatonként ne térjetek vissza; az e hatókörű talált hibát saját ellenőrzéssel javítsátok. Új üzleti modul, teljes QNT-fejlesztés, merge és telepítés nem része.

Modellajánlás: a jelentett claude-opus-5, medium; összefüggő, ismert forrású lezárási csomag. Cache- és fogyasztásszámláló nincs, így megtakarítást és körönkénti költséget nem állítunk. Az összevont munkarend eredményességét tényleges elfogadott munka és mérhető ráfordítás alapján kell később értékelni.
