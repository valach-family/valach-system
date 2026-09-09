'use strict';

// Valach System (VS) v2 — KUKA: KIVEZETETT MEGOLDÁSOK REGISZTERE (RPR-01, D-VS-286).
//
// OPERÁTORI KÉRÉS (2026-07-30): „a rossz kódokat ilyenkor mindig törlitek?!?!?! legyen valahova
// memóriába mentve, hogy a hibás, soha többé nem használt kódok KUKA legyen!"
//
// IGAZA VAN. Eddig a rossz megoldás sorsa ez volt: a kód eltűnt a diffben, az OK bekerült a
// DECISION_LOG-ba — és ennyi. Ez KÉT dolgot nem old meg:
//   1. egy KÉSŐBBI session (ember vagy ügynök) nem tudja, hogy egy „kézenfekvő" ötletet MÁR
//      kipróbáltunk és elbukott — újra megépíti;
//   2. a naplóbejegyzés PASSZÍV: senki nem futtatja, tehát a visszacsúszást semmi nem fogja meg.
//
// EZ A REGISZTER AKTÍV. Minden bejegyzés hordoz gépi JELEKET (`forbidden` = ennek NEM szabad
// megjelennie, `positive` = ennek OTT kell lennie), amiket a `npm run verify:kuka` minden körben
// lefuttat. Ha valaki visszahozza a kivezetett megoldást, a söprés PIROSRA VÁLT — nem kell észrevenni.
//
// PURE + INERT: nincs DB, nincs Express, nincs hálózat, nincs titok. Csak adat.
//
// HOL ÉL A MEMÓRIA (D-VS-287, operátori kérdésre: „még ennyi foglalt memóriád sincs?"): az ügynöknek
// NINCS session-ök közti memóriája. Két hely számít, és csak kettő:
//   1. `CLAUDE.md` — ezt a rendszer MINDEN körben automatikusan betölti (ott a terminál-blokk + a
//      KUKA-tanulságok egy-egy sorban + az állandók);
//   2. EZ A FÁJL + a verifier — a GÉP futtatja, nem a jóindulat.
// Külön .md, amit senki nem nyit meg, NEM memória — a korábbi KUKA.md és OPERATOR_STANDING_RULES.md
// ezért lett a CLAUDE.md-be összevonva és megszüntetve.
//
// ÚJ BEJEGYZÉS AKKOR KELL, ha egy megoldást azért vezetünk ki, mert HIBÁS VOLT (nem azért, mert
// egyszerűen továbbfejlődött). A mező-kitöltés kötelező része: mi volt · miért rossz · mi váltja ·
// ki találta meg. Ha nincs rá gépi jel, azt KI KELL MONDANI (`guard_note`), nem elhallgatni.

const CONTRACT_ID = 'RPR-01';

const RETIRED_PATTERNS = Object.freeze([
  Object.freeze({
    id: 'KUKA-090',
    date: '2026-09-09',
    title: 'A MÉRŐ A MÉRT FÉLTŐL KÉRDEZTE MEG, MIT KELLETT VOLNA MÉRNIE — öt további hazugság-alak',
    what: 'A Q18 (KUKA-089 / D-VS-3002) javítása után a mutációs eszköz MÉG MINDIG „10 mutáció · 10 '
      + 'elkapva"-t írt ki és 0-val zárt ÖT másik támadásra, mind reprodukálva: (H02) a mutáns '
      + 'indulása után `process.exit(86)`, JSON nélkül — az M5 `runtime_error` szerződése a TELJES '
      + 'FUTTATÓ hibáját is elkapásnak vette; (H03) a mutánsok egyetlen próbát sem futtattak, csak '
      + '`SKIP` rekordot adtak a hat ismert azonosítóhoz — a `status !== \'PASS\'` bármit bukásnak '
      + 'fogadott el; (H04) csak a BUKOTT rekordok kerültek a kimenetbe — a hiányzó négy rekordot '
      + 'semmi nem vette észre; (H05) valódi JSON, de a futtató 86-tal lépett ki — az értelmezhető '
      + 'JSON mellett a rendellenes folyamat-kilépés elveszett; (H06) a rekordokat idegen '
      + 'infrastruktúra-kivételre cserélve — a mérő nem nézte, hogy a MEGFELELŐ ÁLLÍTÁS bukott-e el.',
    why_wrong: 'a közös gyökér: a mérő a VÁRT PRÓBAKÉSZLETET a FUTÁS EREDMÉNYÉBŐL olvasta ki. Ez '
      + 'körkörös (KUKA-054 a mérő-eszközön): a mutáns által visszaadott rövidebb vagy hamis lista '
      + 'AUTOMATIKUSAN új „teljes készletté" vált, tehát a mért fél mondta meg, mit kellett volna '
      + 'mérni. Mellette a `status !== \'PASS\'` EGYETLEN megkülönböztetést ismert, ezért a `SKIP`, '
      + 'a kihagyás és az idegen kivétel is „bukott állításnak" számított — pedig egyik sem az.',
    replaced_by: 'ELŐBB ÉRVÉNYES MÉRÉS, UTÁNA ÍTÉLET. (1) A várt készlet KÜLSŐ szerződés '
      + '(`v3ref/manifest.mjs`), a futás eredményétől függetlenül — hiányzó, ismétlődő és ISMERETLEN '
      + 'azonosító egyaránt mérőhiba. (2) TÍPUSOS kimenetek: `PASS` · `FAIL` (nevezett állítás) · '
      + '`THREW` (hibakód + fázis) · `SKIP` · `NOT_STARTED`; bizonyíték CSAK a `FAIL`. (3) A '
      + 'kilépési kód szerződés (0 vagy 1), és ellentmondása az eredménnyel mérőhiba. (4) A '
      + '`runtime_error` SZŰKÍTVE: csak a próbán BELÜLI, ELŐRE megnevezett hibakódú és fázisú kivétel '
      + '— a teljes futtató hibája SOHA. (5) Az elkapáshoz a NEVEZETT próba NEVEZETT állítása '
      + 'kell (`assertion_id`), nem elég, hogy „valami történt" azon a próbán.',
    decision: 'D-VS-3006',
    found_by: 'a KÜLSŐ TÁRGYALÓ FÉL (R45 H02–H06), 19 rögzített ellenpróbával, pozitív kontrollokkal. '
      + 'A saját, egy körrel korábban írt Q18-kapunk mind az ötben ZÖLD maradt — mert azt mérte, '
      + 'HOGY VAN-E JSON, nem azt, hogy ÉRVÉNYES-E A MÉRÉS.',
    lesson: 'A MÉRŐ SOHA NE A MÉRT FÉLTŐL KÉRDEZZE MEG, MIT KELLETT VOLNA MÉRNIE. A várt készlet, '
      + 'a várt állapotok és az elkapás oka mind KÜLSŐ, előre rögzített szerződés — különben a '
      + 'megtámadott futás a saját hazugságát teszi mércévé. És: egy javítás nem attól kész, hogy a '
      + 'megnevezett alak eltűnt, hanem attól, hogy a HIBA-OSZTÁLY minden alakjára van ellenpróba — '
      + 'a Q18 javítása után öt testvér-alak maradt életben (KUKA-084 „a szivárgás átköltözött" '
      + 'elve a mérőn). Az ellenpróbák ezért ÁLLANDÓ kapuk, nem egyszeri bizonyítás.',
    guard_note: 'gépi jel: `npm run verify:v3ref` — a mutációs eszköz MINDEN futáskor lefuttatja a '
      + 'HAT hazugság-ellenpróbát (Q18 · H03 · H04 · H05 · H06 · H0X) a SAJÁT kódunkon, és mindegyiknél '
      + 'megköveteli, hogy se `probe_fail`, se `runtime_error` szerződés alatt NE legyen elkapás. '
      + 'Bizonyítottan piros a visszacsúszásra: az M5 hibakódját `MAS_HIBAKOD`-ra írva a verdikt '
      + 'WRONG_CATCHER, kilépési kód 1.',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['v3ref/manifest.mjs'], pattern: 'export function checkResultSet',
        reason: 'a várt készlet KÜLSŐ szerződés, és a mérő ezt HÍVJA (KUKA-009)' }),
      Object.freeze({ paths: ['v3ref/mutate.mjs'], pattern: 'ALLOWED_EXIT_CODES',
        reason: 'a rendellenes kilépési kód mérőhiba, akkor is, ha van értelmezhető JSON (H05)' }),
      Object.freeze({ paths: ['v3ref/mutate.mjs'], pattern: 'const ATTACKS = \\[',
        reason: 'a hat hazugság-ellenpróba ÁLLANDÓ kapu, nem kapcsolóra futó egyszeri bizonyítás' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-089',
    date: '2026-09-09',
    title: 'A HIÁNYZÓ ÉLES ERŐFORRÁS MINT A PRÓBA ELMARADÁSÁNAK INDOKA — a próbához nem AZ erőforrás kell, hanem EGY erőforrás',
    what: 'Az R31-es körben kimondtam, hogy „ebben a környezetben NINCS adatbázis-elérés, ezért élő '
      + 'próba NEM futott", és ezt env-kihagyásként, zöld söprés mellett jelentettem. A külső fél '
      + 'ezt nem fogadta el (R32 §4): „A hiányzó éles adatbázis-hozzáférés nem indokolja önmagában '
      + 'az elkülönített V3 tesztkörnyezet elmaradását; a tényleges futtatási képességet külön fel '
      + 'kell mérni." MÉRVE, a következő percben: a `node:sqlite` (Node 22 beépített) ELÉRHETŐ — '
      + 'tehát elkülönített tároló, valódi séma és valódi kérés→jog→véglegesítés lánc végig futtatható. '
      + 'Ugyanabban a körben megépült és lefutott a V3 magreferencia hat próbája.',
    why_wrong: 'A próba KÖVETELMÉNYE szűkebb volt, mint amit feltételeztem: a jogosultsági és '
      + 'véglegesítési szabályokhoz TÁROLÓ kell, nem az ÉLES tároló. Az „élő adatbázis hiánya" egy '
      + 'MÁSIK kérdésre felel (a V2 adatán mérünk-e), mint amit a kapu kérdez (fut-e a szabály '
      + 'egyáltalán). Az env-kihagyás ráadásul ZÖLDNEK látszik a söprésben, tehát a hiány nem is '
      + 'jelent meg hiányként (KUKA-051 a mérés hatókörére, KUKA-040 a környezet hibáztatására).',
    replaced_by: 'Mielőtt egy mérést környezeti okból elmaradtnak jelentek, ki kell mondanom a '
      + 'PONTOS technikai blokkot, és meg kell néznem, hogy a mérés valódi követelménye nem szűkebb-e. '
      + 'Ha van gyengébb, de elegendő erőforrás, azon kell futtatni. Ami tényleg nem megy, ahhoz '
      + 'ÁTADHATÓ futtatási csomag jár, nem zöld env-kihagyás.',
    decision: 'D-VS-669',
    found_by: 'a KÜLSŐ TÁRGYALÓ FÉL (R32 §4) — a saját söprésem zölden mutatta a hiányt.',
    lesson: 'A „nincs hozzá környezetem" állítás MÉRÉS, nem következtetés. Két kérdés kötelező: mi a '
      + 'PONTOS technikai blokk, és mi a mérés VALÓDI követelménye? A kettő gyakran nem ugyanaz, és a '
      + 'különbségben ott a futtatható próba.',
    guard_note: 'A jel a `npm run verify:v3ref` LÉTEZÉSE és zöldje: a V3 magreferencia adatbázis-elérés '
      + 'NÉLKÜL, elkülönített tárolón fut, tehát a régi indok gépi úton megcáfolva áll. Ez nem tiltó-minta '
      + '— egy futó próba erősebb annál.',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['v3ref/store.mjs'], pattern: "from 'node:sqlite'",
        reason: 'az elkülönített tároló adatbázis-elérés nélkül is áll' }),
      Object.freeze({ paths: ['v3ref/run.mjs'], pattern: 'NEM a V2 adatbázisa',
        reason: 'a próba kimondja, hogy nem éles adaton fut' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-088',
    date: '2026-09-09',
    title: 'A DETERMINIZMUS BEFAGYASZTOTT EGY JOGOSULTSÁGI ELLENŐRZÉST — az ismétlésvédelem a HATÁST rögzíti, nem a VÁLASZT',
    what: 'Az R31-es C08 ellenpéldámban azt javasoltam, hogy az ismétlésvédelmi kulccsal érkező '
      + 'újrapróbálásnál „az eltárolt EREDMÉNYT szó szerint visszajátsszuk, ne újraszámoljuk" — azért, '
      + 'hogy az ismétlés ne könyvelje a tegnapi rendelést a mai áron. A külső fél megcáfolta (R32 K07): '
      + '„A régi HTTP-válasz feltétlen, szó szerinti visszajátszása HIBÁS: visszavont olvasójognál ismét '
      + 'adatot szivárogtatna." Igazuk van: a determinizmus kedvéért a válaszba fagyasztottam volna a '
      + 'jogosultsági döntést is.',
    why_wrong: 'Két külön tengelyt vontam egy tárgyra (KUKA-002 alakja a válaszon): a HATÁS '
      + 'változatlansága helyes követelmény, a VÁLASZ változatlansága viszont azt jelenti, hogy a '
      + 'kiadás pillanatában érvényes jogot nem kérdezzük meg újra. Ráadásul a javaslatom egy '
      + 'BIZTONSÁGI visszalépést csomagolt egy helyességi javítás mellé — a legrosszabb fajta, mert '
      + 'a jó szándék elrejti.',
    replaced_by: 'A helyes alak: a HATÁS egyszer születik és változatlan (a feloldott bemenet rögzül), '
      + 'a VÁLASZ viszont MINDIG a mai jogon megy át, és a nemleges válasz azonos a nem létező '
      + 'parancséval (KUKA-084). A V3 magreferenciában ez a `submitCommand` / `readCommandResult` '
      + 'KETTÉVÁLASZTÁSA, és a P-A08 próba méri.',
    decision: 'D-VS-669',
    found_by: 'a KÜLSŐ TÁRGYALÓ FÉL (R32 §1.2, C08) — a saját ellenpéldám javításaként.',
    lesson: 'Amikor valamit a HELYESSÉG kedvéért determinisztikussá, gyorsítótárazottá vagy '
      + 'visszajátszhatóvá teszek, kötelező megkérdezni: MELYIK ELLENŐRZÉST fagyasztottam be vele '
      + 'együtt? A gyorsítótár, az ismétlésvédelem és a visszajátszás mind ugyanezt a kockázatot '
      + 'hordozza — a mentett válasz a mentés pillanatának jogát viszi magával.',
    guard_note: 'A jel a `npm run verify:v3ref` **M4** mutációja: a mai jog-ellenőrzés kivétele a '
      + 'kiadásból bizonyítottan PIROSRA viszi a P-A08 próbát. Tiltó-minta nincs — a V2 kódját az '
      + 'R28 hatóköre szerint nem szereljük.',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['v3ref/command.mjs'], pattern: 'Hatás visszajátszása és válasz kiadása KÜLÖN',
        reason: 'a két tengely a kódban is kettéválasztva áll' }),
      Object.freeze({ paths: ['v3ref/mutate.mjs'], pattern: 'kihagyja a MAI jog ellenőrzését',
        reason: 'a mutáció bizonyítja, hogy a próba elkapja a visszalépést' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-087',
    date: '2026-09-08',
    title: 'A VISSZAVEZETÉS SORREND SZERINT, NEM TÁRGY SZERINT — hét lencsét rossz szabályhoz kötöttem, mind hihetően',
    what: 'A külső fél K01–K12 alapszerződését visszavezettem az eddigi 225 azonosítóra. A visszavezetést '
      + 'lencse-szinten írtam, és HÉT lencsénél (B2 · B3 · B4 · B5 · X4 · K1 · K2) a lencse SORSZÁMÁBÓL '
      + 'dolgoztam, nem a CÍMÉBŐL: a B4 („gazdátlan tér és helyreállítás") a végrehajtás-szabályhoz került, '
      + 'a B5 („kiszerelés ⊥ gyűjtőegység; a lehetetlen anyagmérleg") az azonosság-szabályhoz, az X4 '
      + '(„párhuzamos visszavonás: verseny, sor, gyorsítótár, KIADOTT LETÖLTÉS") a történelem-szabályhoz. '
      + 'Mind a hét hihető volt, és mind a hét 5-5 tételt (összesen 35 leletet) sorolt volna a ROSSZ '
      + 'szabály alá — „fedve" jelöléssel.',
    why_wrong: 'A visszavezetés célja pont az, hogy a lezárási kapu meg tudja mondani, mi van fedve és mi '
      + 'nincs. Egy rossz szabályhoz kötött lelet NEM látszik hibának: „fedve" áll mellette, tehát a kapu '
      + 'zöldet mond arról, amit senki nem vizsgált meg (KUKA-041 a megfeleltetésen: a díszpipa sikert '
      + 'jelent arról, ami meg sem történt). A sorszám-alapú párosítás azért csúszik el észrevétlenül, mert '
      + 'a lencse-számok és a szabály-számok EGYSZERRE nőnek, tehát a hibás pár is „rendezettnek" látszik.',
    replaced_by: 'A megfeleltetés a lencse CÍMÉBŐL dolgozzon, és a címet a FORRÁS-leltárból kell kiolvasni, '
      + 'nem emlékezetből (KUKA-036 a megfeleltetés terében). A gépi jel nem közvetlenül ezt fogta meg: a '
      + 'KSZ03 azt mérte, hogy az INDOK elég hosszú-e ahhoz, hogy indok legyen — és épp a hét rossz párnál '
      + 'volt rövid, mert tartalom nélküli párosításhoz nem lehet indokot írni. Ez a második tanulság: '
      + 'ahol nincs jó jel a hibára, ott a HIÁNYZÓ INDOKLÁS jó helyettesítő — aki nem tudja leírni, MIÉRT '
      + 'tartozik ide, az valószínűleg nem is oda tartozik.',
    decision: 'D-VS-668',
    found_by: 'a SAJÁT, ugyanabban a körben írt gépi őr (KSZ03) — közvetve, az indoklás rövidségén; '
      + 'a hét rossz párosítás egyike sem volt szemre feltűnő.',
    lesson: 'Ahol egy MEGFELELTETÉST írok két számozott halmaz között, a párosítás a TARTALOMBÓL jöjjön, '
      + 'nem a sorrendből — és a párosítás mellé KÖTELEZŐ indoklás, mert az indoklás hiánya a hibás pár '
      + 'egyetlen látható nyoma. A hihetőség itt nem enyhítő körülmény, hanem maga a veszély: a rossz pár '
      + 'ugyanúgy „fedve"-t ír ki, mint a jó.',
    guard_note: 'A jel a `npm run verify:k-contract` KSZ03 tétele (minden lencse: K-szabály VAGY nevesített '
      + 'hiány, ÉS az indok hossza legalább 40 karakter). Ez nem a rossz PÁROSÍTÁST méri közvetlenül — azt '
      + 'gépi úton nem tudjuk —, hanem az indoklás hiányát, ami a mérés szerint a hibás párok mind a hét '
      + 'esetében jelen volt. Ezt kimondjuk, nem állítjuk erősebbnek, mint amilyen.',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_verify_k_contract.mjs'],
        pattern: 'az indok túl rövid ahhoz, hogy indok legyen',
        reason: 'a hiányzó indoklás a hibás megfeleltetés egyetlen látható nyoma' }),
      Object.freeze({ paths: ['tools/vs_verify_k_contract.mjs'],
        pattern: 'a visszavezetés nem hivatkozik nem létező lencsére',
        reason: 'a megfeleltetés csak ÉLŐ forrás-lencsére mutathat (KUKA-066)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-086',
    date: '2026-09-08',
    title: 'A MEGHÍVÓ, AMI ÁTÍRTA EGY MÁSIK EMBER JELSZAVÁT — V3 TERVEZÉSI BEMENET, a V2-ben SZÁNDÉKOSAN nem javítva',
    what: 'A V2 `acceptInvite` a meghívó e-mail címe alapján ÚJRAHASZNÁLJA a meglévő `user_account` sort, '
      + 'és a hitelesítő adatot `ON CONFLICT (user_id) DO UPDATE`-tel FELÜLÍRJA (a zárolást és a függő '
      + 'jelszó-visszaállítást is törölve). Az elfogadó út nincs munkamenethez kötve, a `sendInvite` '
      + 'pedig a VÁLASZBAN visszaadja a beváltható hivatkozást a kibocsátónak. Elvi következmény: egy '
      + 'cégtér adminja meghívhat egy MÁS ember címét, maga beválthatja, és átveheti annak GLOBÁLIS '
      + 'fiókját. (A külső tárgyaló fél lelete, R26 §2 — kódon igazolva.)',
    why_wrong: 'A meghívó elfogadása KÉT különböző dolgot jelent aszerint, hogy a cél LÉTEZIK-e már: a '
      + 'SZEMÉLY SZÜLETÉSE (nincs fiókja — a jelszó-állítás maga az aktus) és a TAGSÁG-ADÁS (már '
      + 'létezik — a jelszavához semmi köze). A kettő egy ágon állt. Azért láthatatlan, mert a HELYES '
      + 'esetben ugyanaz a kód fut; a hibás alak csak akkor jelenik meg, ha valaki kipróbálja.',
    replaced_by: 'A V3 azonosság-modelljében: nevezett alak-feloldó, ami a hitelesítő adat MEGLÉTÉBŐL '
      + 'dönt (születés / csak tagság / belépésre küld). A V2-ben SZÁNDÉKOSAN NEM javítjuk — D-VS-667: '
      + 'a V2-t csak a család használja, a jogosultsági kockázat ott nem valós, a javítás viszont MÉRTEN '
      + 'eltörte volna a valódi használatukat (egy ember, több cégtér: a saját címére szóló meghívót '
      + 'kézzel váltja be, munkamenet nélkül — az új ág ezt elutasította volna).',
    decision: 'D-VS-667',
    found_by: 'a KÜLSŐ TÁRGYALÓ FÉL (R26 §2) a `main` egy rögzített commitján; mind az öt részállítását '
      + 'kódon igazoltuk. A javítás VISSZAVONÁSÁT az OPERÁTOR rendelte el, hatókör-okból.',
    lesson: 'KÉT tanulság. (1) Ahol egy művelet KÉT különböző dolgot jelenthet aszerint, hogy a cél '
      + 'LÉTEZIK-e már, ott a két alakot NEVEZETT feloldóval kell szétválasztani — a helyes esetben '
      + 'ugyanaz a kód fut, ezért a söprés zöld marad. (2) A HATÓKÖR IS MÉRCE: egy valós hiba javítása '
      + 'is lehet rossz munka, ha a rendszernek abban a szakaszában a kockázat nem valós, a javítás '
      + 'viszont eltöri a tényleges használatot. A javítás előtt meg kell kérdezni: KI HASZNÁLJA MA, és '
      + 'mit tör el nála a javítás?',
    guard_note: 'A V2-ben NINCS gépi jel — kimondottan, mert a kód szándékosan a régi alakon marad (D-VS-667). '
      + 'A jel a V3 azonosság-modelljével együtt születik meg; addig ez a bejegyzés a TERVEZÉSI BEMENET, '
      + 'és a leletet a V3 szenárió-leltár viszi tovább (R26 E01–E26 mellett).',
    forbidden: Object.freeze([]),
    positive: Object.freeze([]),
  }),
  Object.freeze({
    id: 'KUKA-085',
    date: '2026-09-08',
    title: 'A VISSZAVONHATÓ ENGEDÉLY ÉS A VISSZAVONHATÓ MEGISMERÉS — a megnevezett kárt a saját ajánlásomban engedtem át',
    what: 'Az X1-6 leletre (ön-meghívással átvehető egy idegen cég kezelt tere) HÁROM utat adtam az '
      + 'operátornak, és a „B utat" ajánlottam: az elfogadás BEENGED, de nem foglalja el a gazda-helyet. '
      + 'Ugyanabban a lapban le is írtam a maradék kockázatát — „az idegen addig belelát a térbe; '
      + 'visszavonható, de megtörtént" —, majd a következő bekezdésben azzal ajánlottam mégis, hogy ez '
      + '„helyrehozható". Kódon mérve: a „beengedés" egyetlen létező alakja a TAGSÁG, és a tagságból '
      + 'cégtér-váltás lesz (sessionContext), tehát a betolakodó a célcég TELJES könyvét megkapta volna '
      + '— mennyiségek, tételszámok, esetleg árak —, véglegesen, mert az olvasást nem lehet visszavonni.',
    why_wrong: 'A „visszavonható" jelzőt a KÁRRA alkalmaztam, holott csak az ENGEDÉLYRE igaz. '
      + 'Visszavonható engedélyt lehet építeni, visszavonható MEGISMERÉST nem: a kikapcsolt hozzáférés '
      + 'nem tünteti el a már elolvasott adatot. A mélyebb hiba a megnevezésé: a maradék-kockázatot '
      + 'kiírtam, és ettől kezeltnek éreztem — a megnevezés éppen azt az illúziót keltette, hogy '
      + 'megvizsgáltam. Egy kockázat nem attól kezelt, hogy szerepel a lapon.',
    replaced_by: 'A B\u2032 alak (a külső fél R24 §10.1): a BEJÁRAT is hatókörös — a partner-felvétel és a '
      + 'meghívó-elfogadás nem adhat általános olvasást egy idegen térben, csak a kiadó AKTUÁLIS, '
      + 'továbbadható hatásköréből eredő KONKRÉT ügy-nézetet. Mért jó hír hozzá: a mai viszony-jog '
      + '(`mayActOnDormantSpace`) ma is SZŰK — három műveletet kapuz (meghívó · kereszt-átadás · '
      + 'partner-átkötés) és olvasást nem ad —, tehát nincs meglévő széles jogot visszabontani; a feladat '
      + 'az, hogy ilyen NE keletkezzen.',
    decision: 'D-VS-665',
    found_by: 'a KÜLSŐ TÁRGYALÓ FÉL (R24 §0 és §10.1: „A »beengedjük az idegent, majd a gazda később '
      + 'kikapcsolja« megoldást nem fogadom el. A már elolvasott árakat nem lehet visszavenni." · '
      + '„Visszavonható engedélyt lehet építeni; visszavonható megismerést nem.") — a SAJÁT, leírt '
      + 'maradék-kockázatomon. A söprés végig zöld volt: a B út nem kód, hanem AJÁNLÁS volt, tehát '
      + 'semmilyen pin nem mérte.',
    lesson: 'Ahol a kár MEGISMERÉS, ott a „később visszavonható" nem enyhítő körülmény, hanem tárgytalan. '
      + 'Minden ajánlásnál, ahol maradék-kockázatot nevezek meg, ki kell mondani, hogy az VISSZAFORDÍTHATÓ-e '
      + '— és ha nem, az ajánlás nem állhat meg rajta. A megnevezett kockázat nem kezelt kockázat.',
    guard: 'npm run verify:glossary GLO11 — a viszony-jog (`mayActOnDormantSpace`) hívási helyeinek '
      + 'NEVESÍTETT engedély-listája, padlóval: új hívó (különösen OLVASÓ úton) PIROS, mert onnantól egy '
      + 'idegen cég könyve nyílna meg puszta partner-felvétellel.',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_verify_glossary.mjs'], pattern: 'MANAGER_RIGHT_CALLSITES',
        reason: 'a kezelői jog hívási helyeit nevesített lista őrzi — az olvasásra terjedés PIROS (KUKA-085)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-084',
    date: '2026-09-08',
    title: 'A SZIVÁRGÁS NEM SZŰNT MEG, HANEM ÁTKÖLTÖZÖTT — a kijárat-listám a helyeket sorolta, nem a csatornákat',
    what: 'A KUKA-083 javításában a kaput ÁTTETTEM a meghívó kiadásáról az ELFOGADÁSRA, és „mindhárom '
      + 'kijáratán lezárva" jelentéssel készre írtam. Csakhogy az új kapu maga is KIMONDTA a védett tényt: '
      + 'az elfogadás `admin_seat_taken` hibakódja megmondta, hogy a cégtérnek MÁR VAN adminja. És az '
      + 'elfogadó nem szükségképpen a címzett: a próbálgató a SAJÁT címére kéri a meghívót, elfogadja, és '
      + 'a hibakódból pontosan azt tudja meg, amit a 409-es kiadás-válasz mondott volna. A védett bit tehát '
      + 'nem szűnt meg, hanem egy MÁSIK csatornára költözött, a saját javításommal együtt.',
    why_wrong: 'A hibám a KIJÁRAT szó értelmezésében volt: három HELYET soroltam fel, ahol a védett ÉRTÉK '
      + '(az e-mail cím) megjelenhet, és azt hittem, ezzel a listával kész vagyok. A védett tény viszont '
      + 'nem érték, hanem BIT — és minden csatorna kiadja, amelynek MEGFIGYELHETŐ VISELKEDÉSE függ tőle: '
      + 'a státuszkód, a hibakód szótára, a mondat MEGLÉTE, a válaszidő. Ezt a saját lapunk Ö-5 tétele '
      + 'szó szerint kimondta („azonos szöveg, státuszkód, válaszidő, és azonos a MONDAT MEGLÉTE is") — '
      + 'a saját szabályomat nem alkalmaztam a saját javításomra.',
    replaced_by: 'Az elfogadás válasza NEM ismeri el a védett tényt: `invite_not_activatable` + egy mondat, '
      + 'ami nem indokol, de nem is zsákutca („fordulj ahhoz, akitől kaptad" — KUKA-064). A VALÓDI ok '
      + 'BEFELÉ szól: tartós napló-sor (`admin_seat_taken`), a POOL-on írva, tehát a visszagörgetett '
      + 'tranzakción KÍVÜL (KUKA-026) — az üzemeltető látja, a próbálgató nem. Az anti-enumeráció a '
      + 'TÁMADÓ elől rejt, nem az üzemeltető elől (KUKA-058).',
    decision: 'D-VS-663',
    found_by: 'a KÜLSŐ TÁRGYALÓ FÉL (R21 §11, T12 tesztszerződés: „Meghívás és elfogadás EGYÜTTESEN sem '
      + 'árulja el idegen cégtér adminállapotát puszta e-mail-birtoklás alapján"). A saját söprésem és a '
      + 'saját frissen írt pinem (GLO09) zölden állt, mert azt mérte, hogy a kapu az ELFOGADÁSNÁL van — '
      + 'nem azt, hogy MIT MOND. A mérce az áthelyezést igazolta, a következményét nem.',
    lesson: 'Létezés-szivárgás lezárásakor a kijáratok nem azok a HELYEK, ahol a védett érték megjelenik, '
      + 'hanem minden CSATORNA, amelynek megfigyelhető viselkedése a védett tény szerint különbözik — '
      + 'státuszkód, hibakód-szótár, egy mondat megléte, futásidő. És a kapu ÁTHELYEZÉSE nem lezárás: az '
      + 'új helyen ugyanazt a kérdést fel kell tenni újra („ki áll a válasz előtt, és mit tud meg?"), '
      + 'különben a javítás a hibát költözteti. A „KÉSZ" jelentést a csatorna-lista teljességéhez kell '
      + 'kötni, nem a javított helyek darabszámához.',
    guard: 'npm run verify:glossary GLO09 (az elfogadás válasza `invite_not_activatable`, az `admin_seat_taken` '
      + 'kifelé TILOS, a valódi ok tartós naplóban, a poolon írva) + GLO10 + proof:personal-space-db-live (o3). '
      + 'A visszacsúszásra bizonyítottan piros.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/security/authFoundationService.js'], pattern: "error: 'admin_seat_taken'",
        reason: 'a védett tény hibakódként sem mehet ki — az elfogadó lehet maga a próbálgató (KUKA-084)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/security/authFoundationService.js'],
        pattern: 'recordDurableAuditVia\\(null, \\{',
        reason: 'a kudarc VALÓDI oka befelé, tartós naplóban, a visszagörgetett tranzakción kívül (KUKA-084 · KUKA-026 · KUKA-058)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-083',
    date: '2026-09-07',
    title: 'A KAPU, AMI A KÉRDEZŐNEK FELELT — a helyes szabály rossz helyen állt, és maga az elutasítás lett a szivárgás',
    what: 'A D-VS-642/8 szabálya („egy cégtérnek egy admin-jelöltje van") a MEGHÍVÓ KIADÁSÁNÁL állt: ha a '
      + 'kérő olyan címre indított admin-meghívót egy kezelt cégtérbe, ahol már volt jelölt, a válasz '
      + '409-cel elutasított, és a törzsében VISSZAADTA a már kijelölt admin E-MAIL CÍMÉT és az állapotát '
      + '(elfogadta / meghívó él). Ugyanez a nyers jelölt ment ki két másik kijáraton is: a partner-ÁTKÖTÉS '
      + 'válaszában és a partner-KÁRTYA payloadjában. Mivel az adószám NYILVÁNOS és korlátlanul '
      + 'próbálgatható, egy értékesítő húsz nyilvános adószámmal tíz perc alatt kilistázhatta, mely '
      + 'célcégek vannak MÁR benne valaki más rendszerében — havonta ismételve pedig azt is, MIKOR kezd '
      + 'egy versenytárs új céggel dolgozni.',
    why_wrong: 'A szabály HELYES volt, a HELYE nem. A kiadásnál a kérdező áll ott, akinek semmilyen alapja '
      + 'nincs az idegen tér tényeire; az elfogadásnál a CÍMZETT áll ott, aki a postafiókot birtokolja — '
      + 'neki megmondani nem szivárgás, hanem a helyes válasz (KUKA-064: a nemleges válasz ne legyen '
      + 'zsákutca). A hiba alakja általános: AHOL EGY ELUTASÍTÁS INDOKA IDEGEN TÉNY, OTT MAGA AZ ELUTASÍTÁS '
      + 'A SZIVÁRGÁS — és a különbség nem tüntethető el a szöveg finomításával, mert a 200/409 különbség '
      + 'maga hordozza a bitet. A három kijárat pedig a KUKA-039: a szabály egy ág feltételében állt, a '
      + 'testvér-utak (átkötés, kártya) nem tudtak róla.',
    replaced_by: 'A KAPU ÁTKÖLTÖZÖTT AZ ELFOGADÁSRA (AUF-02): a meghívó kiadása minden ágon UGYANAZT a '
      + 'választ adja, a második cím pedig az elfogadásnál áll meg (`admin_seat_taken`), ahol a címzett '
      + 'birtokolja a postafiókot. Mellé EGY nevezett szivárgás-őr (ABS-02, `adminCandidateForViewer`): a '
      + 'mérce nem „mennyit mutassunk", hanem TUDJA-E MÁR A NÉZŐ — a saját partner-rekordjában álló cím '
      + 'visszaadható, minden más cím idegen tény, és akkor sem megy ki, ha csak a LÉTEZÉST mondanánk ki. '
      + 'Mind a három kijárat ezt hívja.',
    decision: 'D-VS-662',
    found_by: 'a KÜLSŐ TÁRGYALÓ FÉL szabálya (R17 §4.1: „A belső indoklás nem szivároghat ki idegennek MÁS '
      + 'TÉR LÉTEZÉSÉRŐL"), a mi R19-es ellenpélda-menetünkön keresztül (X1-4) — a hibát a SAJÁT KÓDUNKBAN '
      + 'mértem meg (src/routes/users.routes.js → admin_candidate a 409-es válasz törzsében). A söprés '
      + 'végig zölden állt, mert a pinek a RÉGI viselkedést egyeztették betűre (KUKA-009 fordítottja: a '
      + 'pin nem elmulasztotta a hibát, hanem VÉDTE).',
    lesson: 'Ahol egy elutasítás INDOKA idegen tény, ott az elutasítás maga a szivárgás — a kaput oda kell '
      + 'tenni, ahol a CÍMZETT áll, nem oda, ahol a kérdező. Új kapunál a kérdés nem az, hogy jó-e a '
      + 'szabály, hanem hogy KI ÁLL a válasz előtt, és mit tud meg belőle az, akinek semmilyen alapja '
      + 'nincs rá. És egy szabály-változásnál a régi viselkedést egyeztető pint ÚJRA KELL ÍRNI, nem '
      + 'megkerülni: különben a zöld battéria a hibát őrzi.',
    guard: 'npm run verify:glossary GLO09 (a kapu az elfogadásnál áll; a régi, szivárgó ág nem élhet újra) '
      + '+ GLO10 (a szivárgás-őrt a pin HÍVJA: idegen cím sehol nem megy ki, mind a három kijárat mérve) '
      + '+ proof:personal-space-db-live (o3) élőben. Mindkét pin a visszacsúszásra BIZONYÍTOTTAN piros.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/routes/'], pattern: "error: 'admin_already_designated'",
        reason: 'a kapu az ELFOGADÁSNÁL áll (AUF-02) — a kiadás nem árulhat el idegen tényt (KUKA-083)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/services/accountBootstrapService.js'],
        pattern: 'function adminCandidateForViewer',
        reason: 'EGY feloldó dönti el, mi léphet át a bérlő-határon (KUKA-083 · KUKA-039)' }),
      Object.freeze({ paths: ['src/security/authFoundationService.js'],
        pattern: "error: 'invite_not_activatable'",
        reason: 'a kapu az elfogadásnál áll, DE a válasza sem árul el idegen tényt — az elfogadó lehet maga a kérdező (KUKA-083 · D-VS-663)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-082',
    date: '2026-09-07',
    title: 'A KÉZZEL ÍRT LAP ELCSÚSZOTT A GÉPI LELTÁRTÓL — és a KÜLSŐ FÉL mérte meg, nem mi',
    what: 'A V3 challenge két alakban ment ki: gépi leltár (V3_JOGOSULTSAG_SZENARIO_LELTAR.json, 89 lelet) '
      + 'és ember-olvasható lap (V3_CHALLENGE_…md). A lapot KÉZZEL írtam a leltárból készült kivonatokból, '
      + 'és három ponton elcsúszott: az L8-3 a lapon „fogalmi hiba", a leltárban „kidolgozatlan szabály"; '
      + 'hét leletnél (L11-2…L11-8) egyáltalán HIÁNYZOTT a teszt_szenario mező, miközben a lap fejléce '
      + '„82 teszt-szenáriót" hirdetett; és a „82" szám mellől lemaradt, hogy ezek LEÍRÁSOK, nem lefutott '
      + 'tesztek (ez a mondat csak a JSON _meta mezőjében állt). Ugyanebben a lapban két TARTALMI hiba is '
      + 'ment ki: a DAC7-küszöböt a KIZÁRT eladóra VAGY-kapcsolattal írtam le (helyesen: jelentésköteles '
      + '≥30 ügylet VAGY >2000 EUR — tehát kizárt az, akinél <30 ÉS ≤2000), és a 178/2002/EK 18. cikkéből '
      + 'MEGFELELÉSI KÉNYSZERT vezettem le a közös adag mérlegének átadására, amit a rendelet nem mond ki.',
    why_wrong: 'Ez a KUKA-018/079 alakja a SAJÁT munkatermékünkön: ahol egy fogalomnak két ábrázolása van, '
      + 'és az egyiket kézzel írjuk, a kettő elcsúszik — némán. Az olvasó a LAPOT hiszi el, a következő kör '
      + 'a JSON-t dolgozza fel, tehát a csúszás két külön igazságot szül. A mennyiségi állítás („82 '
      + 'teszt-szenárió") ráadásul FUTÓ TESZTNEK olvasható, miközben a futtató meg sincs építve — a KUKA-015 '
      + 'alakja a saját riportunkon: amit a lap állít, azt teljesíteni kell. A DAC7-hiba a levezetés '
      + 'iránya (a küszöb tükörképe nem a küszöb tagadása), a 178/2002/EK pedig a KUKA-010 jogforrás-alakja: '
      + 'egy jogszabály azt bizonyítja, ami BENNE áll, nem azt, amit ráépítek — a vegyes adagnál a '
      + 'kimenet-tulajdonos közvetlen beszállítója a FELDOLGOZÓ, tehát a visszahívási lánc rajta fut, és '
      + 'a rendelet nem ad automatikus jogot a többi beszállító adataihoz. A mérés-oldali ok a legsúlyosabb: '
      + 'a saját láncunk (12 lencse + cáfoló + skála-próba) egyik ellenőrzője sem mérte a LAP és a LELTÁR '
      + 'VISZONYÁT (KUKA-024) — a két oldal külön-külön ép volt.',
    replaced_by: 'A VISZONYT MÉRJÜK, nem az oldalakat: `npm run verify:challenge-inventory` (CHL-01) — '
      + 'CHL01 a leltár épsége · CHL02 minden lelethez tartozik NEM ÜRES teszt-szenárió (padló) · CHL03 a '
      + 'lap besorolás-tábláinak MINDEN azonosítója ugyanazt a besorolást viszi, mint a leltár, egyetlen '
      + 'nevezett szótáron át (a lap magyar szava ↔ a leltár gépi kulcsa) · CHL04 a lap a leletek '
      + 'többségét nevesíti, padlóval, az ELVETETT azonosítókat is ismerve (KUKA-049: a saját őr ne '
      + 'jelentse hibának a kért eredményt) · CHL05 a lap kimondja, hogy a szenáriók leírások. A lap '
      + 'három tartalmi hibája javítva, a 178/2002/EK-állítás mellé KORREKCIÓ-blokk került, ami kimondja, '
      + 'mit vontunk vissza és miért.',
    decision: 'D-VS-660',
    found_by: 'a KÜLSŐ TÁRGYALÓ FÉL (ChatGPT), 2026-09-07, a CMD-VS-300-002-001 R17 — PLAN lapon: „A JSON '
      + '4 fogalmi hibát tartalmaz; a Markdown az L8-3-at is fogalmi hibaként jelöli… Az L11-2–L11-8 '
      + 'rekordokból hiányzik a teszt_szenario mező… Ezek leírások, nem 82 futó vagy sikeresen lefutott '
      + 'teszt." A DAC7- és a 178/2002/EK-korrekció szintén tőle. AZ ÚJ ŐR ELSŐ FUTÁSA KÉT TOVÁBBI '
      + 'CSÚSZÁST TALÁLT, amit ő sem vett észre: az L7-6 (lap „kidolgozatlan szabály" ↔ leltár '
      + '„elfogadható kompromisszum") és az L11-8 (lap „kidolgozatlan szabály" ↔ leltár „implementációs '
      + 'kérdés") — tehát a kézi csúszás nem három, hanem ÖT ponton állt.',
    lesson: 'Amit KÉZZEL írunk egy gépi állományból, azt a GÉPNEK kell visszamérnie — különben a szállított '
      + 'lap és a következő kör bemenete két külön igazság lesz. És minden mennyiségi állítás mellé oda kell '
      + 'írni, MIT jelent: a „82 szenárió" leírás, nem futó teszt. Jogforrásból csak azt szabad levezetni, '
      + 'ami benne áll (KUKA-010); egy küszöb tagadása nem a küszöb tükörképe.',
    guard: 'npm run verify:challenge-inventory (CHL01–CHL05) — a valódi csúszáson BIZONYÍTOTTAN piros volt '
      + '(3/5 PASS az első futáson, két olyan ütközéssel, amit a külső fél sem talált meg).',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_verify_challenge_inventory.mjs'],
        pattern: 'BESOROLAS_SZAVAK',
        reason: 'EGY szótár köti a lap magyar szavát a leltár gépi kulcsához (KUKA-082 · KUKA-061)' }),
      Object.freeze({ paths: ['tools/vs_verify_challenge_inventory.mjs'],
        pattern: 'elvetett_leletek',
        reason: 'az őr ismeri az elvetett leleteket is — a kért eredményt nem jelenti hibának (KUKA-082 · KUKA-049)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-081',
    date: '2026-09-06',
    title: 'A KÜLSŐ FÉL KÉRÉSE MINT A SAJÁT JOGOSULTSÁGUNK PLAFONJA — az OAuth írás-hatókör',
    what: 'A board MCP-hídja a csatlakozó kliens `scope` kérését szó szerint teljesítette: a ChatGPT '
      + 'connectora `chatops:read`-et kért, tehát a kiadott token soha nem tartalmazott írás-jogot, és a '
      + 'dokumentum-feltöltés (`create_document`) az ELSŐ éles kísérletre elutasításba futott — „OAuth '
      + 'token lacks required scope: chatops:write". Közben a jóváhagyó lap AZT ÁLLÍTOTTA, hogy „a '
      + 'ChatGPT Work olvasási és írási hozzáférést kér", és a jóváhagyás után az operátor joggal hitte, '
      + 'hogy írást adott. Az elutasítás pedig egy puszta hibakód volt: sem azt nem mondta meg, MIT tart '
      + 'a token, sem azt, hol a kapcsoló.',
    why_wrong: 'A board erőforrás-gazdája az OPERÁTOR, nem a csatlakozó kliens: a jóváhagyó lapra csak a '
      + 'csatlakozási kóddal lehet eljutni, tehát a döntés helye ott van. Ha a KÜLSŐ fél kérése a plafon, '
      + 'akkor egy tőlünk független rendszer alapértelmezése dönti el, mit tud a saját boardunk — és ha az '
      + 'a rendszer szűkebbet kér, a funkció NÉMÁN halott (a jóváhagyó lap ettől még sikert mutat). Ez a '
      + 'KUKA-015 alakja a jogosultságon: amit a képernyő állít, azt a gépnek teljesítenie kell. '
      + 'A mérés-oldali ok súlyosabb: a saját integrációs próbám `scope: "chatops:read chatops:write"`-tal '
      + 'ment, tehát a SAJÁT előfeltevésemet igazolta vissza (KUKA-054), a valódi read-only kliens ága '
      + 'sosem futott — ráadásul a próba a repó söprésén KÍVÜL állt, így egy másik állítása („10 eszköz", '
      + 'miközben 14 volt kint) egy napig pirosan állt anélkül, hogy bárki tudott volna róla (KUKA-051).',
    replaced_by: 'A GRANTOT A GAZDA ADJA, egyetlen nevezett feloldóból (`resolveGrantedScopes`, '
      + 'tools/chatops-board/src/mcpBridge.mjs): a kliens kérése JAVASLAT (`asked`), a jóváhagyó lap '
      + 'írás-pipája dönt (`granted`), a különbség pedig nevesítve látszik (`widened` / `withheld`). '
      + 'A lap KIMONDJA, mit kért a kapcsolat és mit ad a board; a jóváhagyás a döntést a KÖNYVELÉSIG '
      + 'viszi (`approveRequest(id, granted)` → `SET … scopes = $3::jsonb`), tehát a token-csere azt adja '
      + 'ki, amit az operátor engedett (RFC 6749 §3.3 — a token-válasz `scope` mezője kimondja). '
      + 'Hatókör-lista nélkül hívott jóváhagyás NEM ad némán mindent, hanem nevezett hibával áll meg. '
      + 'Az elutasítás mostantól mondat: melyik eszköz · mi kellett · MIT tart a token · mi a teendő.',
    decision: 'D-VS-658',
    found_by: 'az OPERÁTOR, 2026-09-06, a külső fél első éles feltöltési kísérletéből: „A feltöltést '
      + 'viszont a kapcsolat elutasította: OAuth token lacks required scope: chatops:write … Attól, hogy '
      + 'mind a 14 eszköz látható, a feltöltés még nincs engedélyezve."',
    lesson: 'AHOL EGY KÜLSŐ FÉL KÉRÉSE DÖNT EGY NÁLUNK LÉVŐ JOGRÓL, OTT NEM A KÉRÉS A SZABÁLY, HANEM A '
      + 'GAZDA DÖNTÉSE — és a döntést a képernyőnek ki kell mondania, a gépnek pedig teljesítenie. Két '
      + 'kérdés minden ilyen kapunál: KI a gazda (hol van a hely, ahova csak ő jut el)? · mi történik, ha '
      + 'a külső fél KEVESEBBET kér, mint amennyi a munkához kell? Ha a válasz „néma elutasítás valamikor '
      + 'később", akkor a kapu rossz helyen van. És a próbában KELL egy ág, ahol a külső fél a SZŰKEBB '
      + 'kérést küldi: a bőkezű fixtúra a saját olvasatunkat igazolja vissza.',
    guard_note: 'gépi jel: `npm run verify:mcp-bridge` (ÚJ, a söprés része) — MCP01 a hatókör-térkép '
      + '(minden POST eszköz írás-hatókört követel, mindkét irányban) · MCP02 a GRANT LÁNCA: a feloldót '
      + 'HÍVJA (read-only kérés + gazdai igen ⇒ írás; pipa nélkül nincs írás; olvasás mindig jár), és a '
      + 'forrásban méri, hogy a döntés a könyvelésig eljut · MCP03 az elutasítás mondata · MCP04 a '
      + '/health hatókör-listája a modulból · MCP05 a két board-próba TÉNYLEG lefut. A teljes OAuth-lánc '
      + '(`src/mcpBridge.integration.test.mjs`) mostantól read-only klienssel ÉS visszatartott írással is '
      + 'végigmegy, valódi tools/call-ig; a régi (kliens dönt) alakon mindkét pin bizonyítottan piros. '
      + 'Az eszköz-darabszám ezentúl PADLÓ + a TOOL_CONFIG-hoz mért teljes lista (KUKA-045).',
    forbidden: Object.freeze([
      Object.freeze({
        paths: ['tools/chatops-board/src/mcpBridge.mjs'],
        pattern: 'approveRequest\\(requestId\\)',
        reason: 'a jóváhagyás a GAZDA hatóköreivel könyvel, nem a kliens kérésével (KUKA-081)',
      }),
      Object.freeze({
        paths: ['tools/chatops-board/src/mcpBridge.mjs'],
        pattern: 'olvasási és írási hozzáférést kér',
        reason: 'a jóváhagyó lap nem állíthat olyat, amit nem tud teljesíteni (KUKA-081 · KUKA-015)',
      }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/chatops-board/src/mcpBridge.mjs'],
        pattern: 'resolveGrantedScopes',
        reason: 'EGY nevezett feloldó dönt a hatókörről, a lap és a jóváhagyás is azt hívja (KUKA-081)' }),
      Object.freeze({ paths: ['tools/chatops-board/src/mcpBridge.mjs'],
        pattern: 'missingScopeMessage',
        reason: 'a hiányzó hatókör MONDATOT és teendőt visz, nem puszta hibakódot (KUKA-081 · KUKA-064)' }),
      Object.freeze({ paths: ['tools/chatops-board/src/mcpBridge.integration.test.mjs'],
        pattern: "scope: 'chatops:read', allowWrite: true",
        reason: 'a próbában ott a READ-ONLY kliens ága — a bőkezű fixtúra önmagát igazolná (KUKA-081 · KUKA-054)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-078',
    date: '2026-09-05',
    title: 'A LÁTHATATLAN FÉL HATÓKÖR — a panel mást kérdezett, mint amit a kijelölés szűkített',
    what: 'A riport-panel a FORDULÓNAPOT és a CÉGET kérdezte meg, miközben a lap hatókörének másik fele '
      + '(a termék- és a raktár-halmaz) a rács KIJELÖLÉSÉBŐL ment ki, láthatatlanul. A kijelölés egy '
      + 'dimenziója — a TÉTEL (lot) — ráadásul sehol nem számított: a lap a kijelölt tételek termékeire '
      + 'készült, nem a tételeire. Kijelölés nélkül pedig a gomb egyszerűen elutasított.',
    why_wrong: 'Az operátor pontosan fogalmazott: „ellentmondás van a kijelölt sorok és a riport között … '
      + 'akkor mi értelme van kijelölni a sorokat a riporthoz?" A felhasználó nem tudta megmondani, mire '
      + 'fut a lap: a képernyőn két szűrő állt, a valóságban négy hatott, és a kettő ellent is mondhatott '
      + 'egymásnak (a panel „minden cég", a kijelölés egyetlen tulajdonos pozíciói). A néma szűkítés nem '
      + 'kényelem, hanem ÁLLÍTÁS a nyomtatványról — amit a felhasználó nem tud ellenőrizni. És az üres '
      + 'kijelölés nem hiba: „az összesre nem csinál riportot" — a teljes listára kérni a lapot értelmes.',
    replaced_by: 'EGY HELY A HATÓKÖRNEK: a panel. A kijelölés a TERMÉK-halmazt adja, és a panel KIÍRJA, '
      + 'hány sorra fut (kijelölés nélkül: „a teljes listára"). A RAKTÁR és a CÉG látható, keresős, '
      + 'több-értékű választó — amit a bejárat-rács kijelölése ELŐTÖLT (a raktár-oldalról a kipipált '
      + 'raktárak). A fordulónap marad a rácsé (D-VS-646). Amit a hátsó út nem tud teljesíteni, azt a '
      + 'panel nem is kínálja (az F-221/7-en nincs raktár-választó).',
    decision: 'D-VS-647',
    found_by: 'az OPERÁTOR, 2026-09-05 — az első éles használatból',
    lesson: 'HA EGY MŰVELET HATÓKÖRE TÖBB FORRÁSBÓL ÁLL, A FELÜLETNEK MINDET MEG KELL MUTATNIA — egy '
      + 'helyen. Két kérdés minden ilyen panelnál: MI SZŰKÍT, és LÁTJA-E a felhasználó? A láthatatlan '
      + 'forrás a néma üres lista rokona (KUKA-012), csak rosszabb: itt nem hiányzik semmi, hanem TÖBB '
      + 'történik, mint amit a képernyő mond. És amit a kijelölés HORDOZ, de a gép nem használ (itt a '
      + 'tétel-szint), azt vagy használni kell, vagy KIMONDANI — a néma eldobás ugyanaz a hazugság. '
      + 'Az üres kijelölés pedig hatókör, nem hiba (KUKA-064: a zsákutcás elutasítás).',
    guard_note: 'gépi jel: `npm run verify:product-reports` **PR12** — a pin RENDERELI a panelt (nem a '
      + 'forrását olvassa): két választó · keresős · jelölő-négyzetes · „+ Új" sor · a rácsról ELŐTÖLTVE; '
      + 'mellette PR10/PR11 a hatókör-forrásokra (a raktár NEM a kijelölésből szűkít). Kilenc '
      + 'visszacsúszás-próba bizonyítottan piros; élő: `tests/e2e/stock-balance-report-scope.spec.js`.',
    forbidden: Object.freeze([
      Object.freeze({
        paths: ['public/js/product-reports.mjs'],
        pattern: "balance: Object\\.freeze\\(\\{ product_ids: 'product_id', warehouse_ids:",
        reason: 'a raktár-hatókör nem szivároghat vissza a kijelölésbe a látható választó mellé (KUKA-078)',
      }),
      Object.freeze({
        paths: ['public/js/surface-report.mjs'],
        pattern: 'report_no_selection',
        reason: 'az üres kijelölés hatókör, nem elutasítás (KUKA-078)',
      }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['public/js/product-reports.mjs'],
        pattern: 'multiple: true',
        reason: 'a hatókör-választók TÖBB-ÉRTÉKŰEK, láthatóan (KUKA-078)' }),
      Object.freeze({ paths: ['public/js/product-reports.mjs'],
        pattern: 'scopePrefillOf',
        reason: 'a bejárat-rács kijelölése ELŐTÖLTI a választót, nem külön szűrő (KUKA-078)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-080',
    date: '2026-09-05',
    title: 'A KÉT VEZÉRLŐ, AMI MÁST MONDOTT UGYANARRÓL — hatókör-választó MELLETT megmaradt előtöltés',
    what: 'A riport-panel a D-VS-650-ben megkapta az export SOR-HATÓKÖR választóját (Összes · Szűrt · '
      + 'Kijelölt), miközben a D-VS-647-es RAKTÁR-előtöltés (a bejárat-rács kijelöléséből) változatlanul '
      + 'ott maradt mellette. Az operátor a Raktárak oldalon két raktárat jelölt ki, majd „Összes sor" '
      + 'hatókört választott — és a legördülőben BENT MARADT a két raktár, tehát a lap továbbra is arra a '
      + 'kettőre készült volna. Ugyanez a termékenkénti lapokra is állt: más hatókörön is a KIJELÖLÉSBŐL '
      + 'készültek. Mellette a hátsó oldalon a „Szűrt sorok" a RAKTÁR-tengelyt némán elvesztette (a '
      + 'Raktárak oldalon semmit sem szűkített), a panel CÍME pedig kivétel nélkül „a kijelölt …-ra" '
      + 'mondatot vitte.',
    why_wrong: 'Egy TÉNY (mely raktárakra szól a lap) KÉT vezérlőn élt, és a kettő ellentmondott egymásnak '
      + '— a KUKA-002 fordítottja: nem két dolog ült egy oszlopon, hanem egy dolog ült két helyen. Ilyenkor '
      + 'a felhasználó azt hiszi, amit OLVAS, a gép meg azt csinálja, ami a MÁSIK vezérlőn áll: néma, de '
      + 'ellentétes szűkítés (KUKA-078 rokona). Az ok a MENETRENDBEN volt: új vezérlőt tettem a régi mellé '
      + 'anélkül, hogy megkérdeztem volna, mi mást mond ugyanarról a tényről.',
    replaced_by: 'A választó a HATÓKÖRT TÜKRÖZI, egyetlen nevezett feloldóból (`scopeAxisState`, '
      + 'public/js/product-reports.mjs): ahol a bejárat-rács MAGA hordozza a raktárt (Raktárak · '
      + 'Készletegyenleg · Készletmozgás — pontosan azok, amelyeknek előtöltésük van), ott kijelölt '
      + 'hatókörön a kijelölés raktárai állnak benne, „összes"-en ÜRES, „szűrt"-ön üres ÉS ZÁRT, mert a '
      + 'raktárakat a szűrt sorok adják (a panel ezt ki is mondja). Ahol a rács nem hordozza (Termékek), '
      + 'ott a választó FÜGGETLEN szűrő marad. A hátsó feloldó (RSC-01) mostantól a raktár-tengelyt is '
      + 'visszaadja, a route a FELOLDOTT listát adja tovább, a termékenkénti lap pedig NEVEZETT hibával '
      + 'áll meg, ha nem a kijelölt hatókör van kiválasztva.',
    decision: 'D-VS-652',
    found_by: 'az OPERÁTOR, 2026-09-05: „az első lépésnél már bukott … a drop-down-ban a két raktár ki '
      + 'volt jelölve (ezt lehet, hogy a kijelölt sorok radió button kiválasztási esetbe kell berakni) … '
      + 'át kell nézni mind a raktárak riportot, mind a termékek riportot, mind a riport fülekbeni '
      + 'riportokat, hogy ne legyen ellentmondás!"',
    lesson: 'ÚJ VEZÉRLŐ MELLÉ MINDIG KÉRDEZD MEG, MI MÁS MOND UGYANARRÓL A TÉNYRŐL. Ha egy adatot két '
      + 'helyről is meg lehet adni, akkor vagy EGY vezérlő marad, vagy a másik TÜKRÖZI az elsőt — és a '
      + 'tükrözés nevezett feloldóban él, amit a pin hívni tud. Ahol egy vezérlő értékét nem a felhasználó '
      + 'adja, ott a képernyő MONDJA KI, honnan jön (a zárt, néma mező ugyanaz a hazugság, mint a néma '
      + 'szűkítés). És ha egy hatókör-fogalom születik, minden TENGELYÉT végig kell vinni a láncon: '
      + 'félig bevezetve az elveszett tengely némán a régi vezérlőn marad.',
    guard_note: 'gépi jel: `npm run verify:product-reports` **PR15** (a pin HÍVJA a feloldót MINDEN '
      + 'bejáraton, RENDERELI a panelt és végigkattintja az operátor útját — kijelölt → összes → szűrt → '
      + 'vissza —, méri a kimenő kérést, a hátsó térkép minden mezőjét a VALÓDI projekcióhoz, és hogy a '
      + 'cím nem állítja a kijelölést) + **PR16** (a maradék öt riport-képernyő: minden lapnak van '
      + 'bejárata, és mindegyik azt hívja, amit a regiszterében ígér). Kilenc visszacsúszás-próba, mind '
      + 'bizonyítottan piros. Élő: tests/e2e/stock-balance-report-scope.spec.js — a Raktárak oldali '
      + 'kattintás-sor végig, a kimenő kéréssel együtt.',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['public/js/product-reports.mjs'],
        pattern: 'export function scopeAxisState',
        reason: 'a választó a hatókört TÜKRÖZI, egy nevezett feloldóból (KUKA-080)' }),
      Object.freeze({ paths: ['public/js/product-reports.mjs'],
        pattern: "rb\\.addEventListener\\('change', applyScopeAxes\\)",
        reason: 'a hatókör-váltás AZONNAL tükröződik a vezérlőn (KUKA-080)' }),
      Object.freeze({ paths: ['src/services/reportScopeService.js'],
        pattern: 'warehouse_ids',
        reason: 'a szűrt hatókör a RAKTÁR-tengelyt is viszi (nem vész el némán — KUKA-080)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-079',
    date: '2026-09-05',
    title: 'A SZÁLLÍTMÁNY, AMIT A CÍMZETT NEM TUD MEGNYITNI — `.md` az operátornak',
    what: 'Az operátornak szánt tervek, levelek és specifikációk KIZÁRÓLAG markdown fájlként készültek '
      + '(50 lap a docs/70_PLANNING alatt), és a körök végén „leszállítva" jelentettem őket. Az operátor '
      + 'nem tud .md-t megnyitni, és ezt többször kimondta — tehát a V3 H0 spec két teljes körén át '
      + 'olyasmiről kapott beszámolót, amit ő maga egyszer sem látott.',
    why_wrong: 'A forma a SZÁLLÍTÁS része, nem külsőség: amit a címzett nem tud megnyitni, azt nem adtuk '
      + 'át. Ez a KUKA-011 („amit nem jelenítünk meg, az nincs") a saját munkatermékünkre fordítva, és a '
      + 'HASZNÁLAT-PRÓBA harmadik kérdése („HOL KATTINT?") a dokumentumra alkalmazva: MIBEN nyitja meg? '
      + 'Ráadásul ha valaki TÖBBSZÖR mond ki egy igényt, az nem ízlés-kérdés, hanem teljesítetlen '
      + 'követelmény — és a saját jóindulatom nem mechanizmus.',
    replaced_by: 'KÉT út, mindkettő kötelező, és egyik sem helyettesíti a másikat: (1) a válaszban '
      + 'ARTIFACT-LINK, amit az operátor a beszélgetésben megnyit; (2) a repóban `npm run docs:html` '
      + '(`tools/vs_doc_html.mjs`, DHT-01) → `docs/_olvashato/*.html` — önálló lapok, külső betöltés '
      + 'nélkül, offline is. A HTML mindig a FORRÁS .md-ből SZÁRMAZTATOTT (a kimenet gitignore-ban), '
      + 'mert két kézzel karbantartott változat egy fogalomról elcsúszik (KUKA-018).',
    decision: 'D-VS-648',
    found_by: 'az OPERÁTOR, 2026-09-05: „nem nagyon vágom, hogy éppen mit csináltál. mint mondtam már '
      + 'sokszor, .md-ket nem tudok megnyitni … akkor kellene egy html verzió is mindig, ami rám is '
      + 'vonatkozik."',
    lesson: 'A FORMA A SZÁLLÍTÁS RÉSZE. Minden munkatermék mellé kimondott kérdés: KI a címzett, és '
      + 'MIBEN nyitja meg? A gép-olvasható és az ember-olvasható alak KÉT dolog, de EGY forrásból kell '
      + 'származniuk. És a megismételt operátori mondat követelmény, nem preferencia — a teljesítését '
      + 'gépi jelre kell bízni, nem a következő kör figyelmére.',
    guard_note: 'gépi jel: `npm run verify:doc-html` — DHT01 a feloldót HÍVJA valódi lapon · DHT02 '
      + 'minden markdown-alakot mér fixtúrán · DHT03 a NYERS jelölés maradását méri MINDEN operátor-lapon '
      + '(ez a pin az első futásán két élő lapon talált maradékot, a renderelő javítva) · DHT04 a lap '
      + 'önálló (offline nyílik) · DHT05 a kimenet származtatott + az eszköz hordozható (KUKA-031). '
      + 'Amit a gép NEM tud mérni: hogy az artifact-linket tényleg elküldtem-e — ez a CLAUDE.md §4 '
      + 'szabályán áll, és ezt kimondom.',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_doc_html.mjs'],
        pattern: 'export function renderDocToHtml',
        reason: 'a forrás→HTML fordítás EGY nevezett feloldóban, amit a pin hívhat (KUKA-079)' }),
      Object.freeze({ paths: ['CLAUDE.md'],
        pattern: 'MINDEN NEKI SZÁNT LAPBÓL HTML IS KELL',
        reason: 'az operátor-szabály az AKTÍV MEMÓRIÁBAN áll, nem külön .md-ben (KUKA-079)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-077',
    date: '2026-09-05',
    title: 'AZ EGÉSZ SÁV ELREJTÉSE EGYETLEN ÁLLAPOT MIATT',
    what: 'A lista-képernyők akció-sora (kijelölés · keresés · export · lapozó · RIPORT) TELJES EGÉSZÉBEN '
      + 'eltűnt, amíg a rácson fordulónap-szűrő állt (`if (isQueryCapable(surface) && '
      + '!hasActiveServerFilters(...))`). Az indok igaz volt: a lekérdező vezérlők KILÉPTETNÉNEK a '
      + 'fordulónapi nézetből. De a tiltás a BEFOGADÓ SÁVRA szólt, nem az érintett vezérlőkre.',
    why_wrong: 'A Készletegyenlegen a fordulónap épp az az állapot, amiben a riport a legtöbbet ér — az '
      + 'operátor a fordulónapi készlet lapját akarja épp arról a napról. A sáv elrejtésével viszont a '
      + 'RIPORT gomb és a KIJELÖLÉS is eltűnt, tehát a lap pont abban az állapotban volt elindíthatatlan, '
      + 'amelyikre való; ráadásul NÉMÁN — a képernyő nem mondta meg, miért tűnt el. Az operátor kérdése '
      + 'ezt tette láthatóvá: „hogyan működjön, hogy ugyanerre a fordulónapi dátum kiválasztós oldalra '
      + 'kerüljünk?" — a válasz addig az volt, hogy sehogy.',
    replaced_by: 'A sáv MINDIG kimegy a lekérdező-képes felületen; fordulónapi nézetben csak azok a '
      + 'vezérlők maradnak el, amelyek tényleg kiléptetnének (keresés · export · lapozó · tömeges · '
      + 'oszlop-fixálás) — a hívó egyszerűen NEM köti be őket, és a modul saját szabálya szerint ami '
      + 'nincs bekötve, az meg sem jelenik (KUKA-041). A szűkítést a sor KIMONDJA (`note`), a Riport '
      + 'pedig a rács napjával dolgozik.',
    decision: 'D-VS-646',
    found_by: 'a D-VS-637-es riport-átvilágítás SAJÁT kockázat-listája nevesítette (S6: „az as_of kapu '
      + 'nélkül az S2 HALOTT a Készletegyenlegen … a fordulónapi kivezetés ELŐTT kell szállítani") — a '
      + 'kivezetés (D-VS-645) mégis előbb ment ki, és az OPERÁTOR kérdése hozta elő, 2026-09-05.',
    lesson: 'AZ ÁLLAPOT-ALAPÚ TILTÁS A VEZÉRLŐRE SZÓLJON, NE A BEFOGADÓ SÁVRA. Ha egy állapotban a sáv '
      + 'tartalmának CSAK EGY RÉSZE érvénytelen, a sáv elrejtése együtt viszi azt is, ami érvényes — és '
      + 'a felhasználó nem a tiltást látja, hanem a HIÁNYT (KUKA-011: amit nem jelenítünk meg, az nincs; '
      + 'KUKA-012: a néma különbség hazugság). A kérdés minden ilyen kapunál: MI az, ami ebben az '
      + 'állapotban tényleg nem működhet — és mi az, ami pont ilyenkor kell a legjobban? És a második '
      + 'tanulság a SORRENDRŐL szól: ha a saját felderítésem kockázat-listája kimondja, hogy a bejáratot a '
      + 'kivezetés ELŐTT kell megépíteni, akkor a lista nem emlékeztető, hanem MENETREND — az „úgyis jön a '
      + 'következő körben" itt két napig tartó zsákutcát jelentett a felhasználónak.',
    guard_note: 'gépi jel: `npm run verify:product-reports` **PR11** (d) — a pin RENDERELI az akció-sort '
      + 'fordulónapi és sima alakban: fordulónapon Riport + kijelölés VAN, keresés/export NINCS, és a '
      + 'szűkítés MONDATA kint áll; sima nézetben mind a három megvan. A régi alakon (feltétel nélkül '
      + 'kirajzolt kereső/export) bizonyítottan PIROS; élő: `tests/e2e/stock-balance-report-scope.spec.js`.',
    forbidden: Object.freeze([
      Object.freeze({
        paths: ['public/js/app.mjs'],
        pattern: 'isQueryCapable\\(surface\\) && !hasActiveServerFilters\\(state\\.serverFilters, surface\\.id\\)\\)[\\s\\S]{0,200}renderSurfaceTableActions',
        reason: 'a fordulónapi nézet nem rejtheti el az EGÉSZ akció-sort (KUKA-077)',
      }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['public/js/surface-table-actions.mjs'],
        pattern: "if \\(typeof options\\.onExport === 'function'\\) \\{",
        reason: 'ami nincs bekötve, az meg sem jelenik — vezérlőnként, nem sávonként (KUKA-077)' }),
      Object.freeze({ paths: ['public/js/surface-table-actions.mjs'],
        pattern: 'if \\(options\\.note\\) bar\\.appendChild',
        reason: 'a szűkítést a sor KIMONDJA (KUKA-077)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-076',
    date: '2026-09-02',
    title: 'A TEREMTŐBŐL LEVEZETETT JOG — „az én kezelt terem"',
    what: 'HAT őr a `created_by_tenant_id` oszlopból vezetett le jogot: a kezelt térbe meghívót csak a '
      + 'teremtő küldhetett (invite-managed), alap-raktárt csak ő pótolhatott, a kötés-tanúk közt '
      + '„saját kezelt terem" állt, az átvételt a teremtő cégtér is billenthette, a kereszt-kapu '
      + 'on_behalf-ja csak a teremtőnek nyílt, és a D-VS-641-es promóció is a teremtőt kérdezte.',
    why_wrong: 'Az operátor kimondta (D-VS-642, 1. pont): „nem úgy kell gondolni a kezelt térre, mint ami '
      + 'egy adott tenant által kezelt … nem tartozik az senkihez." A teremtő-jog két kárt okozott: (1) a '
      + 'MÁSODIK cég, aki ugyanazt a partnert (ugyanazzal az adószámmal/e-maillel) kötötte a térre, nem '
      + 'tehetett rajta semmit — pedig ugyanolyan viszonya van vele, mint az elsőnek; (2) a teremtő olyat '
      + 'is tehetett, amit senkinek nem szabad: cégtérként élővé billenthette a teret, felhasználó nélkül. '
      + 'A jog forrása egy KÖNYVELÉSI oszlop volt (ki írta a sort), nem egy üzleti tény.',
    replaced_by: 'EGY jog-feloldó (`mayActOnDormantSpace`): a tér ALVÓ, és a kérő cégtérnek VAN rá kötött '
      + 'partnere — ez a VISZONY. Élővé billenteni CSAK tagsággal lehet (egy ember, aki elfogadta a '
      + 'meghívót). Alvó magántérre a kötés-tanú az E-MAIL (a tér azonosítója), ahogy cégtérre az '
      + 'adószám. A `created_by_tenant_id` marad TÖRTÉNELEMNEK (ki nyitotta) — jog nem jár vele.',
    decision: 'D-VS-642',
    found_by: 'az OPERÁTOR, 2026-09-02 — „ennyi. nem tartozik az senkihez."',
    lesson: 'A JOG NEM ABBÓL JÖN, KI ÍRTA A SORT, HANEM A VISZONYBÓL. Ha egy őr egy könyvelési oszlopot '
      + 'kérdez („ki teremtette?"), meg kell kérdezni, MILYEN ÜZLETI TÉNYT helyettesít — és azt a tényt kell '
      + 'mérni (itt: van-e partnere, ami erre a térre mutat). A KUKA-062 párja: ott a mai felhasználók '
      + 'viszonyaiból, itt a teremtés tényéből származott jog — mindkettő a JELEN lenyomata, nem szabály. '
      + 'És ahol egy jog több őrben él, EGY feloldó legyen (KUKA-039): a hatból öt egyformán rossz volt.',
    guard_note: 'gépi jel: `npm run verify:glossary` **GLO09** — a teremtő-oszlop összehasonlítása kód-sorban '
      + 'SEHOL (szervizek · meghívó-út · kereszt-kapu; a séma-tűrő ág nevesítve kivéve), az EGY feloldó '
      + 'HÍVVA három helyen, az átvétel csak tagsággal — a visszacsúszásra bizonyítottan PIROS; élő: '
      + '`proof:personal-space-db-live` **(o4)** + `proof:managed-space-takeover-db-live` (c)(e).',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/services/accountBootstrapService.js'],
        pattern: 'async function mayActOnDormantSpace',
        reason: 'a kezelt tér joga EGY feloldóból, a VISZONYBÓL (KUKA-076)' }),
      Object.freeze({ paths: ['src/services/accountBootstrapService.js'],
        pattern: 'dormant_belongs_to_nobody: true',
        reason: 'a szerződés kimondja: a kezelt tér senkié (KUKA-076)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-075',
    date: '2026-09-02',
    title: 'A TÉR ÁTMINŐSÍTÉSE A SZEMÉLY ELŐLÉPTETÉSE HELYETT',
    what: 'A D-VS-641-es „előrelépés" a magánszemély partner kezelt MAGÁNTERÉT írta át kezelt CÉGTÉRRÉ '
      + '(`UPDATE tenant SET kind = \'company\'`), amikor a partner adószámot kapott — ugyanazon a soron, '
      + '„hogy ne szülessen második tér". Kiadva, pinelve, élő próbával — ugyanazon a napon.',
    why_wrong: 'A modell (D-VS-639 zárókő) szerint a FELHASZNÁLÓ = egy e-mail + egy magántér, a cégtér pedig '
      + 'TAGSÁG. Az e-mail a SZEMÉLY terét azonosítja, az adószám a CÉGÉT — két különböző dolog. A tér '
      + 'átírása a személy magánterét tette volna cégtérré: elvette volna tőle a saját terét, és a cég '
      + 'terét egy személy e-mailjéhez láncolta. Az operátor pontosítása (D-VS-642, 4/7. pont) egyértelmű: '
      + '„az adószámra csinál cégteret, és az email cím marad magántér, annyi, hogy user jogosultságot '
      + 'kaphat." A „nem gyárt másodikat" szabály a CÉGTEREKRE szól (egy adószám = egy cégtér), nem arra, '
      + 'hogy a személy és a cég egy térben lakjon.',
    replaced_by: 'ÁTKÖTÉS (SPK-02 új alakja, `partnerLinkTransition` + `rebindPartnerToCompanySpace`): a '
      + 'magántér sorához NEM nyúlunk; a PARTNER KÖTÉSE lép át a személy teréről a cég terére — az adószám '
      + 'meglévő cégterére, ha van, különben újra (ABS-01 csomag) —, és a személy (az e-mail) annak a '
      + 'cégtérnek az ADMIN-JELÖLTJE lesz (meghívót ember indít). Az ÉLŐ magántér ugyanígy: hozzá sem '
      + 'nyúlunk, mert nem a cég tere.',
    decision: 'D-VS-642',
    found_by: 'az OPERÁTOR, 2026-09-02 — a 4. és 7. pontban, ugyanaznap, a kiadás után.',
    lesson: 'AMIKOR EGY SZABÁLY „X-BŐL Y LESZ" ALAKÚ, MEG KELL KÉRDEZNI, MI AZ ALANY: a TÉR vagy a SZEMÉLY? '
      + 'A D-VS-638/8 mondata („kezelt magántér + adószám ⇒ kezelt cégtér") a TÉRRE olvasható, de a '
      + 'zárókő (D-VS-639) mellé téve csak a SZEMÉLYRE lehetett igaz — a két kánon együtt már kimondta a '
      + 'választ, én az egyikből olvastam. Ha egy új szabály egy KORÁBBI kánon-mondattal ütközni látszik, '
      + 'az ütközés a jel, nem a zaj (a KUKA-061 rokona: két név, két fogalom — itt egy mondat, két '
      + 'alany). És a saját élő próbám itt is a saját olvasatomat igazolta vissza (KUKA-033/054).',
    guard_note: 'gépi jel: `npm run verify:glossary` **GLO08** — `spacePromotion` nem létezik, `UPDATE tenant '
      + 'SET kind` sehol, az átkötés a MEGLÉVŐ cégtérre köt vagy ABS-01-gyel teremt, kudarcnál visszaköt '
      + '(a régi alakra bizonyítottan PIROS); élő: `proof:personal-space-db-live` **(o1)(o2)** — a magántér '
      + 'sora ÉRINTETLEN, a cégtér új, egy adószám = egy cégtér.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/services/accountBootstrapService.js', 'src/masterData/spaceKind.js'],
        pattern: "UPDATE tenant SET kind = 'company'",
        reason: 'a magántér SOHA nem minősül át cégtérré — a személy lép elő, nem a tere (KUKA-075)' }),
      Object.freeze({ paths: ['src/masterData/spaceKind.js'],
        pattern: 'function spacePromotion',
        reason: 'a tér-átminősítő szabály kivezetve — a helyes alak a partnerLinkTransition (KUKA-075)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/masterData/spaceKind.js'],
        pattern: 'function partnerLinkTransition',
        reason: 'az átkötés szabálya EGY otthonban (SPK-02, KUKA-075)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-074',
    date: '2026-09-02',
    title: 'AZ IDEMPOTENCIA-ŐR, AMI EGY MEGVÁLTOZOTT TÉNYT NYELT EL',
    what: 'A tér-kötő felosztó (`autoLinkPartner`) első kérdése az volt, hogy „van-e már tere?", és '
      + 'ha volt, `already_linked`-kel megállt. Ez helyes idempotencia UGYANARRA a kérésre — de a '
      + 'kérés nem ugyanaz volt: a magánszemély partner e-maillel KEZELT MAGÁNTERET kapott, majd '
      + 'KÉSŐBB ADÓSZÁMOT is. Az őr ezt is elnyelte, ezért a tér örökre magántér maradt.',
    why_wrong: 'HÁROM néma következménye volt, mind élő próbapadon mérve: (1) a gazdája ÁTVÉTELKOR a '
      + 'szűkített magántér-SZINTET kapta volna — készletnyilvántartó nélkül, adószámos vállalkozásként; '
      + '(2) az adószám sosem került a tér `tenant_config`-jába, ezért az ALK-01 tanú soha nem talált rá; '
      + '(3) emiatt MINDEN MÁSIK cég, aki ugyanezt a céget felvette, SAJÁT új kezelt cégteret nyitott '
      + 'neki — vagyis a duplikátum nem a saját törzsben, hanem a cégek KÖZÖTT keletkezett, ott, ahol '
      + 'senki nem nézi. Az operátor kimondott szabálya („a rendszer nem gyárt másodikat") így némán '
      + 'sérült, miközben a saját törzsben minden rendben látszott.',
    replaced_by: 'A felosztó első kérdése immár: „van tere? akkor nem KÖTÉS a dolgom, hanem az, hogy HELYES-E '
      + 'még a kötés" — ÁTKÖTÉS (SPK-02, `partnerLinkTransition` + `rebindPartnerToCompanySpace`, D-VS-642): '
      + 'a partner a személy teréről a cég terére lép át, a magántér marad. (Az első javítás — a tér '
      + 'átminősítése — maga is hibás volt: KUKA-075. A lecke itt változatlan: a néma already_linked volt a baj.)',
    decision: 'D-VS-641',
    found_by: 'CLAUDE-AUX, az operátor 10 pontos tér-modelljéből (D-VS-638/8) kiindulva — a szabály '
      + 'ki volt mondva, a kód nem teljesítette; a három következményt élő adatbázison mértem.',
    lesson: 'AZ IDEMPOTENCIA-ŐR CSAK AZ AZONOS KÉRÉST NYELHETI EL, A MEGVÁLTOZOTT TÉNYT NEM. A '
      + '„már megvan" válasz egy MÁSIK kérdésre felel („létezik?"), mint amit a hívó tett fel („helyes-e '
      + 'még?"). Ahol egy őr korai `return`-nel áll meg, meg kell kérdezni: mi az, ami KÖZBEN '
      + 'megváltozhatott, és amitől a meglévő állapot HELYTELENNÉ vált? És a kár nem mindig ott '
      + 'keletkezik, ahol a kód áll: itt a saját törzsben minden rendben látszott, a duplikátum a cégek '
      + 'KÖZÖTT nőtt (KUKA-053 tükre — ott a közös forrás, itt a szétosztott cél felől).',
    guard_note: 'gépi jel: `npm run verify:glossary` **GLO08** (a felosztó meglévő kötésnél az ÁTKÖTÉST futtatja, '
      + 'nem néma already_linked-et — a visszacsúszásra bizonyítottan PIROS) + `proof:personal-space-db-live` '
      + '**(o1)(o2)** élő Postgresen: az átkötés és a cégek közötti duplikátum zárása.',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/services/accountBootstrapService.js'],
        pattern: 'rebindPartnerToCompanySpace\\(q, tenantId, partnerId',
        reason: 'a már meglévő térnél az ÁTKÖTÉS fut, nem néma megállás (KUKA-074; az alakja D-VS-642)' }),
      Object.freeze({ paths: ['src/masterData/spaceKind.js'],
        pattern: 'function partnerLinkTransition',
        reason: 'a kötés-átmenet szabálya EGY otthonban, tiszta függvényként (SPK-02, KUKA-074/075)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-073',
    date: '2026-09-02',
    title: 'A HELYETTESÍTŐBŐL FELELŐ OSZLOP — a „tér" oszlop nem a teret olvasta',
    what: 'A Partnerek lista TÉR-oszlopa (D-VS-597) három ágból állt, és az ELSŐ a partner JELÖLŐJÉT '
      + 'kérdezte: `CASE WHEN COALESCE(partner.is_private_person, FALSE) THEN \'maganter\'`. Vagyis '
      + 'MINDEN magánszemély „magántér"-t kapott — akkor is, ha soha nem született tere; és mert az ág '
      + 'ELÖL állt, a magánszemélyek ALVÓ (kezelt) tere is „magántér"-nek látszott, holott a kettő nem '
      + 'ugyanaz. Az operátor épp ezt az oszlopot jelölte ki arra, hogy megmutassa, „kinek van csak '
      + 'kezelt tere" (D-VS-638/5) — a döntéséhez tehát pont ez a cella hazudott volna.',
    why_wrong: 'A HELYETTESÍTŐ VÁLASZ NEM LÁTSZIK ROSSZ VÁLASZNAK. A `is_private_person` egy ÍTÉLET '
      + 'a partnerről; a tér egy LÉTEZŐ dolog a `tenant` táblában. A kettő korrelál (a magánszemély '
      + 'előbb-utóbb magánteret kap), ezért a hamis érték hihető marad — nincs 500-as hiba, nincs üres '
      + 'cella, csak egy szó, ami nem arról a tényről szól, amit az oszlop NEVE ígér. A KUKA-066 rokona, '
      + 'de nem ugyanaz: ott a forrás NEM LÉTEZETT (és kötőjel lett belőle), itt a forrás létezik, csak '
      + 'MÁSRÓL beszél — és épp ezért nehezebb észrevenni.',
    replaced_by: 'A tér-oszlop a LÉTEZŐ TÉRBŐL vezet le (`partner.linked_tenant_id` → `tenant`), és a '
      + 'négy fajtát EGY feloldó adja (SPK-01, `src/masterData/spaceKind.js`): a `spaceKindOf` a '
      + 'JS-oldalon, a `spaceKindSql` UGYANABBÓL a táblából GENERÁLJA a CASE-t — a két ábrázolás nem tud '
      + 'elcsúszni. Ahol nincs kötés, a válasz `nincs` (ÉRTÉK, nem üresség — KUKA-012).',
    decision: 'D-VS-640',
    found_by: 'CLAUDE-AUX, a kezelt magántér építése közben — az operátor 10 pontos tér-modellje '
      + '(D-VS-638) tette a kérdést megválaszolhatóvá: ha NÉGY tér-fajta van, akkor egy háromágú, '
      + 'jelölőből induló CASE nem mondhatja meg, melyik.',
    lesson: 'A LEVEZETETT OSZLOP TELJESÍTSE A SAJÁT NEVÉT: ha a neve TÉR, a teret olvassa, ne egy '
      + 'helyettesítőt, ami „általában együtt jár vele". Minden levezetésnél ki kell mondani, MELYIK '
      + 'TÁBLÁBAN áll a tény, amiről az oszlop beszél — és ha nem abban, amiből olvasunk, akkor az '
      + 'oszlop nem hibás, hanem HAZUDIK, ami rosszabb (KUKA-066 párja: ott a hiány látszott adatnak, '
      + 'itt a helyettesítő látszik ténynek). És ahol egy fogalomnak több állapota van, a levezetés '
      + 'AGÁK SORRENDJE önmagában elnyelhet egy egész állapotot: az `is_private_person` ág elöl állva '
      + 'eltakarta az „alvó" ágat, tehát a kezelt magántér a képernyőn SOHA nem létezett.',
    guard_note: 'gépi jel: `npm run verify:glossary` **GLO05** — a pin a masterReadService TÉNYLEGES '
      + 'kifejezését KARAKTERRE ahhoz méri, amit a feloldó ad (a viszony, nem a szöveg: KUKA-024), és '
      + 'a régi, jelölőből induló ágra bizonyítottan PIROS; **GLO06** a kézi `kind`/`account_state` '
      + 'összehasonlítást tiltja a szervizekben/route-okban (a padlóval együtt).',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/services/masterReadService.js'],
        pattern: "is_private_person, FALSE\\) THEN 'maganter'",
        reason: 'a tér-oszlop a LÉTEZŐ térből vezet le, nem a partner jelölőjéből (KUKA-073)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/services/masterReadService.js'],
        pattern: 'spaceKindSql\\(',
        reason: 'a tér-oszlop SQL-alakja a SPK-01 táblájából GENERÁLÓDIK (KUKA-073)' }),
      Object.freeze({ paths: ['src/masterData/spaceKind.js'],
        pattern: 'function spaceKindOf',
        reason: 'a négy tér-fajta EGY otthona (SPK-01, KUKA-073)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-072',
    date: '2026-09-02',
    title: 'AZ OPERÁTOR MINT FUTÁR — két eszköz, terv-módban, és köztük egy chat-üzenet',
    what: 'A számlázz.hu-átvételre KÉT eszközt szállítottam (`vs_import_szamlazz_partners.mjs` = '
      + 'kiegészítés + felvétel · `vs_partner_tenant_audit.mjs` = hovatartozás-szemle). Mindkettő '
      + 'TERV-módban indult, a kimenetét a KÉPERNYŐRE írta, és a folytatáshoz az operátornak kellett '
      + 'elolvasnia, majd chatben visszaüzennie, hogy mi állt benne — cégterenként külön futtatással, '
      + 'kétszer (terv, majd apply). Ez cégterenként 4, összesen 12 parancs, közte négy emberi döntéssel.',
    why_wrong: 'A DRY-RUN FEGYELEM HELYES, DE A KÖR-FUTTATÁS NEM AZ. A terv attól terv, hogy nem ír — nem '
      + 'attól, hogy egy EMBER olvassa fel nekem. Amikor a részletek a képernyőre mennek, a döntéshez '
      + 'vissza kell másolni őket, és az operátorból FUTÁR lesz két program között: ő szállítja az adatot '
      + 'a saját gépéről a fejlesztőnek, majd a választ vissza. Ez lassú, hibázik (részlet vész el), és a '
      + 'munka NEM KÉSZ — csak úgy néz ki. A CLAUDE.md 3/b „HOL KATTINT?" kérdésének a párja hiányzott: '
      + 'HÁNYSZOR kell kattintania, és MIT KELL KÖZBEN CSINÁLNIA?',
    replaced_by: 'EGY futtató (`tools/vs_partner_rendrakas.mjs`), EGY paranccsal, ami a teljes rendrakást '
      + 'elvégzi (kiegészítés + felvétel + hovatartozás + visszaaktiválás) MINDEN cégtérre egyszerre; a '
      + 'RÉSZLETEK FÁJLBA mennek (riport .md + tételes .csv, terv-módban is), a képernyőre csak a rövid '
      + 'összegzés; a döntés SZABÁLY (a tiszta `partnerTenantPlan.buildPartnerPlan`), nem kérdés — ahol a '
      + 'gép nem tud dönteni, a riport NEVESÍTI és a futás megy tovább; és EGY visszaút van, egy paranccsal.',
    decision: 'D-VS-637',
    found_by: 'az OPERÁTOR, 2026-09-02 — „ez alapján egy végleges scriptet tudsz csinálni, és nem kell oda '
      + 'vissza üzengetni, hogy mit ír ki az újabb és újabb program!"',
    lesson: 'A TERV NEM ÜZENET, HANEM FÁJL. Szállított eszköznél a kérdés nem csak az, hogy HELYESEN '
      + 'dolgozik-e, hanem hogy BEFEJEZI-E a munkát: hány parancs kell hozzá, kell-e közben ember, és hova '
      + 'kerülnek a részletek. Ha a folytatáshoz a kimenetet vissza kell olvasni a fejlesztőnek, akkor az '
      + 'eszköz nincs kész (a KUKA-064 „zsákutcás elutasítás" testvére: ott a hiba-üzenet, itt a SIKERES '
      + 'kimenet állította meg az operátort). És ha egy feladatra két eszköz kell, amik ugyanazon az adaton '
      + 'dolgoznak, az nem két eszköz — az egy eszköz, kettévágva (KUKA-003).',
    guard_note: 'gépi jel: `npm run verify:partner-field-map` **PFM06** — méri, hogy a két korábbi eszköz '
      + 'NEM éledt újra, hogy EGY parancs végzi a teljes rendrakást, hogy a riport TERV-módban is FÁJLBA '
      + 'készül, és hogy a futtatóban nincs második szabály-készlet (a döntés a tiszta terv-függvényé); '
      + '**PFM07** a három szabályt magát HÍVJA (fixtúrán), nem a szövegét olvassa.',
    forbidden: Object.freeze([
      // A jel maga a FÁJL: ha a kettévágott eszköz visszakerül, ez a minta talál rá; amíg nincs ilyen
      // fájl, nincs mit mérni (a hiányzó út üres halmazt ad, nem hibát).
      Object.freeze({ paths: ['tools/vs_import_szamlazz_partners.mjs', 'tools/vs_partner_tenant_audit.mjs'],
        pattern: '#!/usr/bin/env node',
        reason: 'a kettévágott eszközök nem éledhetnek újra — EGY rendrakás van (KUKA-072)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_partner_rendrakas.mjs'],
        pattern: 'buildActionsCsv',
        reason: 'a részletek FÁJLBA mennek, nem a képernyőre (KUKA-072)' }),
      Object.freeze({ paths: ['tools/vs_partner_rendrakas.mjs'],
        pattern: 'plan.buildPartnerPlan\\(',
        reason: 'a döntés a TISZTA terv-függvényé — a futtatóban nincs második szabály-készlet (KUKA-072)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-071',
    date: '2026-09-01',
    title: 'A KÜLSŐ RAKTÁR MINT A MÁS ÁRUJÁNAK HELYE — a tér nélküli tulajdonos és a magántér a gazda „partner-oldali" raktárán',
    what: 'A KÜLSŐ (external) raktár a 956-os mintában a B-terv TÜKÖR-helye: a beszerzés/értékesítés '
      + 'partner-oldali sorának raktára, amin mozgás soha nem születik (ábrázolás, nem hely). Erre a '
      + 'fogalomra két TOVÁBBI szerep épült: (B) a TÉR NÉLKÜLI tulajdonos áruja a gazda külső raktárán '
      + 'állt (D-VS-398/8 D4 „fiók-nélküli címzett", majd D-VS-620 #4b kínálat), és (C) a MAGÁNTÉR '
      + 'EGYETLEN raktára a külső lett (D-VS-617 #98 + 987-es migráció: KULSO = alap-raktár). A '
      + 'folyamat-űrlapon ezért a saját cég is választhatta a külsőt bemeneten és kimeneten, a '
      + 'magánszemély tere pedig egy „nem a miénk" fajtájú raktárral született.',
    why_wrong: 'A HELY A TULAJDONOSÉ, NEM A GAZDÁÉ. A tulajdonos-könyv modell (D-VS-620) szerint minden '
      + 'sor a TULAJDONOS könyvét mozgatja — akkor az áru helye is a tulajdonos terében van, nem a gazda '
      + 'egy „partner-oldali" rekeszében. A külső raktár a GAZDA viszonya („nem az enyém"), nem az áru '
      + 'helye; így EGY fogalom három szerepet hordozott (KUKA-002/003 a raktár-fajtán), és a tér '
      + 'nélküli tulajdonos ELFOGADOTT ÁLLAPOT lett, holott tér nélkül nincs kinek a könyvét vezetni. A '
      + 'magántérnél fordítva: kapott teret, de a tere „külső" raktárral született — a saját fogalmunk '
      + 'szerint sem volt hol állnia az árujának. Mindkét alakot a MAI ADATBÓL vezettem le („van, akinek '
      + 'nincs tere" · „a magánszemélynek úgysem kell raktár"), nem a szabályból (KUKA-060 a HELYRE).',
    replaced_by: 'MINDEN TÉRNEK LEGALÁBB EGY HELYE VAN (D-VS-632): minden tér SAJÁT alap-raktárral '
      + 'születik (a magántér is: FO/own — a 989-es migráció a meglévőket pótolja, készletet nem mozgat); '
      + 'akinek nincs tere, annak LEGKÉSŐBB a folyamat mentésekor születik meg (ensureOwnerSpacesForLines '
      + 'mind a három sor-író úton); a KÜLSŐ raktár nem sor-raktár ott, ahol a tulajdonosnak LEHET tere '
      + '(validateLineWarehouses → line_warehouse_external, és a kliens választói sem kínálják); az '
      + 'alap-raktár védett (nem inaktiválható, a kódja zárt, a mutatója nem üríthető és külsőre nem '
      + 'állítható). Az (A) szerep — a B-terv tükör-helye — a DEV sáv MAG-varrata: levél ment '
      + '(docs/20_STATE/LEVEL_AUX_KULSO_KIVEZETES_2026-09-01.md), nem patch.',
    narrowed_by: 'D-VS-637 — SZŰKÍTVE, NEM VISSZAVONVA (operátori parancs 2026-09-02): „mivel nagyon sok '
      + 'nem adószámoshoz nem lesz soha email cím … ha egyik sincs, akkor külső-raktár használat (ez a '
      + 'feltöltjük a terméket az űrbe)". A D-VS-632-es alak azon a néma előfeltevésen állt, hogy MINDEN '
      + 'tulajdonosnak LEHET tere — a tanú (adószám vagy e-mail) csak formalitás, amit be lehet kérni. Az '
      + 'operátor VALÓDI partner-listája ezt megbuktatta: tömegével áll ott sor, amihez soha nem lesz '
      + 'egyik sem, és a „tanú nélkül a mentés NÉVVEL áll meg" szabály ezeket a folyamatokat egyszerűen '
      + 'nem engedte volna elmenteni. Ezért a tér-születés előfeltételhez kötött lett '
      + '(partnerSpaceShape, PSS-01): adószám ⇒ kezelt cégtér + saját alap-raktár · e-mail ⇒ magántér + '
      + 'saját alap-raktár · EGYIK SEM ⇒ nincs tér, és a sor a KÜLSŐ raktárba megy. A KUKA-071 tilalma '
      + 'ÉRVÉNYBEN MARAD mindenütt, ahol a tulajdonosnak lehet tere — a külső raktár NEM alapállapot és '
      + 'NEM tartalék: kizárólag ott áll, ahol a tér megszületésének nincs előfeltétele, és ott is '
      + 'KIMONDVA (a képernyő megnevezi, mit kell pótolni). Amit a KUKA-071 tiltott — a NÉMA kitérés a '
      + 'gazda rekeszébe, holott lett volna hova tenni —, az továbbra is tilos.',
    decision: 'D-VS-632',
    found_by: 'az OPERÁTOR, 2026-09-01 — „a külső raktár dolognak nagyon nem vagyok híve … mindenkinek '
      + 'legyen LEGALÁBB EGY helye, amihez a termékmozgásokat kötni lehet … akinek pedig nincs tere, '
      + 'annak pedig szülessen meg legkésőbb a folyamat mentéssel", és a magántérre: „itt miért nem '
      + 'alap-raktár?"',
    lesson: 'AMI VALAKIÉ, AZ AZ Ő TERÉBEN ÁLL — egy másik szereplő „külső" rekesze nem hely, hanem '
      + 'viszony. Ha egy fogalom (külső raktár) egyszerre ábrázolás (tükör-sor), tárhely (más áruja) és '
      + 'alapállapot (magántér), akkor nem egy fogalom (KUKA-002/003). És a hiányzó előfeltételt (nincs '
      + 'tere) nem MEGKERÜLNI kell, hanem PÓTOLNI a legkésőbbi pontig — a mentés pillanatában, névvel; a '
      + 'megkerülés (a gazda rekesze) némán elfogadott állapottá teszi a hiányt (KUKA-012 a modellben). '
      + 'A D-VS-637-os SZŰKÍTÉS MÁSODIK TANULSÁGA: a javításom maga is a MAI ADATBÓL vezetett le egy '
      + 'előfeltevést — hogy a tanú mindig BEKÉRHETŐ —, és ezzel egy KAPUT épített oda, ahol '
      + 'KÖVETKEZMÉNYNEK kellett volna állnia (KUKA-060 a saját javításomra fordítva). Ha egy szabály '
      + 'megtagadja a valóság RÖGZÍTÉSÉT, akkor nem a valóság rossz. A helyes alak: a hiány NE zárjon, '
      + 'hanem NEVEZETT következménye legyen — és a képernyő mondja meg, mit kell pótolni, hogy a '
      + 'következmény megszűnjön.',
    guard_note: 'gépi jel: `npm run verify:process-editor` **PED18** (a sor-raktár őr HÍVVA: külső raktár '
      + 'készlet-soron piros, tükör-soron nem · a tér-születés mind a 3 író-úton · az alap-raktár zár '
      + 'HÍVVA · a tanú-szabály HÍVVA) + **PED11** (a magántér FO/own-nal születik, 989) + KUKA-071 '
      + 'tiltó-minták; ÉLŐ mérés: `node tools/vs_kulso_footprint.mjs` — a három szerep lábnyoma külön, '
      + 'az operátor adatán.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/services/processPartyService.js'],
        pattern: "OR w.warehouse_kind = 'external'",
        reason: 'a külső raktár nem lehet a tulajdonos ENGEDETT sor-raktára (KUKA-071)' }),
      Object.freeze({ paths: ['src/services/processPartyService.js', 'public/js/process-create-sides.mjs'],
        pattern: "role: 'kulso'",
        reason: 'a kínálatban nincs „külső raktár" szerep — a tér helye az alap-raktára (KUKA-071)' }),
      Object.freeze({ paths: ['config/registries/i18n.json'],
        pattern: 'process.side.kulsoWh',
        reason: 'a képernyő nem kínál külső raktárat a tulajdonos teréből (KUKA-071)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/services/processPartyService.js'],
        pattern: "AND w.warehouse_kind <> 'external'",
        reason: 'az idegen-raktár feloldó a külsőt kizárja (KUKA-071)' }),
      Object.freeze({ paths: ['src/services/processService.js'],
        pattern: 'line_warehouse_external',
        reason: 'a szerver-őr: külső raktár készlet-soron NÉVVEL bukik (KUKA-071)' }),
      Object.freeze({ paths: ['src/services/accountBootstrapService.js'],
        pattern: "'FO', 'Fő raktár', 'own',\\s*'magántér alap-raktára",
        reason: 'a magántér SAJÁT alap-raktárral születik (KUKA-071)' }),
      Object.freeze({ paths: ['src/services/warehouseWriteService.js'],
        pattern: 'default_warehouse_code_locked',
        reason: 'az alap-raktár védett (KUKA-071)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-070',
    date: '2026-09-01',
    title: 'A SÉMA KÉNYSZERE, AMIT A VALIDÁTOR NEM TÜKRÖZÖTT — és a „nincs adatbázis-kapcsolat", ami hazudott',
    what: 'A vevőcsoport-törzs validátora a KÓDOT opcionálisként kezelte (`trimOrNull` → NULL), a '
      + '049-es migráció viszont `code TEXT NOT NULL`-ként hozta létre a táblát. Az operátor első éles '
      + 'felvétele („B2B - magvak, olajak", kód nélkül) ezért 23502-re futott — és mivel a `qerr` minden '
      + 'ismeretlen hibakódot `available:false`-ra fordított, a KÉPERNYŐ ezt írta ki: „Az írás jelenleg '
      + 'nem elérhető (nincs adatbázis-kapcsolat)." Működő adatbázis mellett, egy hiányzó kötelező mezőre.',
    why_wrong: 'KÉT HIBA EGYMÁS HEGYÉN. (1) A séma KÉNYSZERE ugyanúgy szerződés, mint az oszlop NEVE: a '
      + 'KUKA-005 („oszlopnevet soha ne emlékezetből") csak a nevekre szólt, pedig a NOT NULL, a CHECK és '
      + 'az egyediség ugyanúgy elbuktatja az írást — és a validátor épp azért van, hogy ezt ELŐBB mondja '
      + 'ki, mint a DB. (2) Az „elérhetetlen" és a „rossz adat" KÉT KÜLÖNBÖZŐ VÁLASZ; egy csatornára '
      + 'terelve a felhasználó a rendszert hibáztatja a saját adata helyett, és a valódi ok sehol nem '
      + 'látszik (KUKA-020 az `available` csatornán, KUKA-028/042 a hiba-fordításon).',
    replaced_by: 'A KÓD a NÉVBŐL képződik, ékezet nélkül (a partner-szerep törzs mintája, KUKA-003) — az '
      + 'operátornak nem kell kódot kitalálnia, és a séma kényszere teljesül. Ahol a névből sem lesz kód, '
      + 'a validátor mondja ki (`required`), nem a DB. A `qerr` pedig megkülönbözteti a kettőt: a '
      + 'kényszer-sértés (23502/23503/23514) `available:true` + `validation` a MEZŐ nevével — az '
      + 'adatbázis ELÉRHETŐ, csak az adat rossz. És a képernyő átveszi a szerver INDOKÁT: az általános '
      + 'mondat mellé odakerül, amit a szerver megnevezett.',
    decision: 'D-VS-628',
    found_by: 'az OPERÁTOR, 2026-09-01 — a Vevőcsoportok fülön, az első éles felvételkor (a söprés és a '
      + 'saját élő próbám végig zöld volt: én KÓDDAL vettem fel a csoportot, ő kód nélkül).',
    lesson: 'A SÉMA KÉNYSZERE IS SZERZŐDÉS — nem csak a nevét kell kiolvasni, a NOT NULL / CHECK / '
      + 'egyediség kikötéseit is, és a validátornak TÜKRÖZNIE kell őket. Ahol egy mező a sémában '
      + 'kötelező, ott a felületnek vagy KÉRNIE kell, vagy KÉPEZNIE — a hiányt nem szabad a DB-vel '
      + 'kimondatni. És: a saját próbám itt is önmagát igazolta (KUKA-033/054) — én kóddal vettem fel a '
      + 'rekordot, mert tudtam, hogy van olyan mező; az operátor azt hagyta üresen, ami a képernyőn nem '
      + 'volt csillagos. AMIT A KÉPERNYŐ NEM KÖVETEL, AZT ÜRESEN FOGJÁK HAGYNI.',
    guard_note: 'gépi jel: `npm run verify:editor-layout` **EDL11** — minden írható felület minden '
      + 'NOT NULL szöveges oszlopára megköveteli, hogy a validátor kimondja (kötelező mező) VAGY '
      + 'képezze (kód-származtatás); a migrációkból mérve, padlóval. Mellé a KUKA-070 tiltó-minta: '
      + 'kényszer-sértés nem térhet vissza `available:false`-ként.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/services/customerGroupService.js'],
        pattern: "const code = trimOrNull\\(src\\.code\\);",
        reason: 'a kód a sémában NOT NULL — opcionálisként kezelve 23502-re fut (KUKA-070)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/services/customerGroupService.js'],
        pattern: 'function normalizeGroupCode',
        reason: 'a kód a NÉVBŐL képződik — a séma kényszere a validátorban teljesül (KUKA-070)' }),
      Object.freeze({ paths: ['src/services/customerGroupService.js'],
        pattern: "err\\.code === '23502'",
        reason: 'a kényszer-sértés NEVEZETT validációs hiba, nem „nem elérhető" (KUKA-070)' }),
      Object.freeze({ paths: ['public/js/editorpanel.mjs'],
        pattern: 'message\\.reason',
        reason: 'a szerver INDOKA eljut a képernyőre — a fordítás nem cseréli le (KUKA-070)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-069',
    date: '2026-08-31',
    title: 'A MEZŐ, AMIT MINDENKI OLVAS ÉS SENKI NEM ÍR — a vevőcsoport a partneren',
    what: 'A `partner.customer_group_id` oszlop a 049-es migráció óta áll, és az ÁR-FELOLDÓ OLVASSA '
      + '(priceResolver: partner → csoport, majd a `customer_group` hatókörű árlisták szűrése). ÍRNI '
      + 'viszont SEMMI nem írta: nem volt szerkesztő-mező, nem volt a partner-validátor engedély-listáján '
      + '(tehát a tömeges szerkesztésben sem), és a listán oszlopként sem szerepelt. A `customer_group` '
      + 'hatókörű árlista ezért a megépítése óta HALOTT volt — egyetlen partnerre sem tudott érvényesülni. '
      + 'Az előző körben (D-VS-623) épp ilyen árlistát hoztam létre és adtam ki készként.',
    why_wrong: 'A HASZNÁLAT-PRÓBA (CLAUDE.md 3/b) két kérdése közül az egyiket feltettem, a másikat nem. '
      + '„KI OLVASSA?" — megvolt: az ár-feloldó. „KI ÍRJA?" — ezt elmulasztottam. Egy mező, amit olvasnak '
      + 'de nem írnak, sosem hibázik: nincs 500-as, nincs piros pin, csak egy örökké üres oszlop, amiből '
      + 'a feloldó örökké „nincs csoportja"-t olvas (KUKA-012 az ADATMODELLBEN). A vevőcsoport-törzs '
      + 'megépítésekor (D-VS-623) sem tettem fel a kérdést, hogy MI KÖTI a csoportot a partnerhez — a '
      + 'törzs kész lett, a kötés nem, és a lánc így fél maradt (KUKA-025 tükre BEFELÉ).',
    replaced_by: 'A vevőcsoport a partner ÍRHATÓ mezője lett: validátor + INSERT + UPDATE + a tömeges '
      + 'szerkesztés engedély-listája (ami ebből származik), a RÉSZLET-projekció hozza (különben egy '
      + 'változtatás nélküli mentés kitörölné — KUKA-043), a rácson NÉVVEL látszik, a szerkesztőn pedig a '
      + 'KAPCSOLATOK blokk sora — ugyanazon a közös keresős választón, amin a termék kategóriái.',
    decision: 'D-VS-625',
    found_by: 'az OPERÁTOR, 2026-08-31 — „ugyanúgy kellene működnie a partnerek szerkesztőn a '
      + 'vevőcsoport kapcsolatnak, mint a termékek oldalon mondjuk a termék kategóriák kapcsolatnak" '
      + '(a 280-as söprés végig zöld volt: olvasó-oldalon minden ép, csak író nem volt).',
    lesson: 'MINDEN OLVASOTT MEZŐRE MEG KELL KÉRDEZNI, HOGY KI ÍRJA — és fordítva. A használat-próba '
      + 'két kérdése egy PÁR: „ki olvassa?" (KUKA-015) és „ki írja?"; ha csak az egyikre van válasz, a '
      + 'lánc fél, és a fél lánc NÉMA — nem hibázik, csak örökké ugyanazt az üres választ adja. Új '
      + 'TÖRZS építésekor (itt: vevőcsoport) a kérdés nem áll meg a törzsnél: mi KÖTI a rekordjaihoz? '
      + 'Az élő bizonyíték nem a pin, hanem a végigvitt LÁNC: partnerre kötni, majd árat kérni rá.',
    guard_note: 'gépi jel: `npm run verify:assignment-panel` **ASN18** — a lánc minden szeme mérve '
      + '(validátor HÍVVA · INSERT/UPDATE · részlet-projekció · rács-oszlop · kapcsolat-blokk sora · '
      + 'nem születik második író), és a `verify:sql-param-arity` őrzi a bővített UPDATE helyőrzőit. '
      + 'ÉLŐ bizonyíték: a partnerre kötött csoport után a `/master/price-resolve` a `customer_group` '
      + 'árat adja vissza — a lánc a javítás előtt SOHA nem futott le.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/commerce/priceResolver.js'],
        pattern: 'FROM partner WHERE id = \\$1 AND tenant_id = \\$2',
        reason: 'az ár-feloldó a KAPCSOLÓ-TÁBLÁT olvassa, nem a kivezetett egy-értékű oszlopot (KUKA-069)' }),
    ]),
    positive: Object.freeze([
      // D-VS-629: a kötés TÖBB-értékű lett, ezért az ÍRÓ a kapcsoló-tábla szervize. A tanulság
      // változatlan („ki írja?"), csak a jel mutat az új otthonra — a kivezetett oszlopra mutató
      // pozitív jel megőrzése épp a régi alakot konzerválná (KUKA-057 fordítottja).
      Object.freeze({ paths: ['src/services/customerGroupService.js'],
        pattern: 'async function linkPartnerCustomerGroup',
        reason: 'a partner→vevőcsoport kötésnek VAN írója (a kapcsoló-tábla szervize) — KUKA-069' }),
      Object.freeze({ paths: ['src/services/masterReadService.js'],
        pattern: "link: 'partner_customer_group_link'",
        reason: 'az olvasó ugyanabból a kánonból dolgozik, amibe az író ír (KUKA-069)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-068',
    date: '2026-08-31',
    title: 'A PIN, AMI A SAJÁT KITALÁLT NYELVJÁRÁSÁT MÉRTE — a szöveges felsorolás egy tömböt váró renderelőnek',
    what: 'Az árlista-szerkesztő hatókör- és ár-mód mezőjének `options`-ét SZÖVEGKÉNT írtam a felület-'
      + 'regiszterbe (`"base,channel,customer_group,partner,promo"`), miközben a rendszer MIND A 4 másik '
      + 'statikus választója TÖMBÖT használ, és a mező-renderelő is csak tömböt fogad '
      + '(`Array.isArray(f.options) && f.options.length ? … : dynamicOptions`). `options_api` nem lévén, '
      + 'a tartalék üres volt: a KÉT LEGÖRDÜLŐ A MEGÍRÁSA ÓTA ÜRESEN NYÍLT. Az operátor ezt látta: '
      + '„az árlista szerkesztőben a fajta … és a mód egy nem létező dolog."',
    why_wrong: 'A HIBÁT A SAJÁT PINEM ŐRIZTE. Az EDL07 ellenőrző ugyanazt a kitalált nyelvjárást '
      + 'beszélte, amiben a deklarációt írtam — `String(field.options || "").split(",")` —, ezért a '
      + 'szöveges alakot ZÖLDEN igazolta vissza, sőt: aki tömbre javította volna, PIROSRA vitte volna a '
      + 'battériát (a KUKA-057 fordítottja: a pin nem csak elmulasztja a hibát, hanem VÉDI). A mérés '
      + 'ezzel körkörös lett — a saját előfeltevésemet mérte, nem a valóságot (KUKA-054 a piNEN), és '
      + 'az alakot nem a TESTVÉREKTŐL vettem, hanem emlékezetből (KUKA-016). A tünet pedig nem hibának '
      + 'látszott, hanem üres listának: „még nincs mit választani" (KUKA-066 a VEZÉRLŐN).',
    replaced_by: 'Az `options` MINDENHOL tömb; és a pin nem a deklarációt olvassa, hanem MEGHÍVJA '
      + 'ugyanazt a mező-renderelőt, amit a szerkesztő használ, majd MEGSZÁMOLJA a ténylegesen kirajzolt '
      + 'sorokat. A szabály MINDEN felületre áll (nem az árlistára), padlóval; és minden felkínált szónak '
      + 'meg kell lennie a neve HÁROM nyelven, különben a nyers gépi jel jelenne meg a képernyőn.',
    decision: 'D-VS-623',
    found_by: 'az OPERÁTOR, 2026-08-31 — „az árlista szerkesztőben a fajta, a vevőcsoport és a mód egy '
      + 'nem létező dolog" (a 280-as söprés és az EDL07 pin végig zöld volt).',
    lesson: 'A PIN NE A SAJÁT NYELVJÁRÁSÁT MÉRJE, HANEM A FOGYASZTÓÉT. Ha egy deklarációt én írok és a '
      + 'hozzá tartozó ellenőrzőt is én, akkor a kettő ugyanazt a tévedést hordozhatja — a mérés zöld '
      + 'lesz, a képernyő halott. Ezért regiszter-bejegyzésnél két kérdés: (1) milyen ALAKOT olvas az, '
      + 'aki ezt HASZNÁLJA (nem: milyen alakot írtam)? — az alakot a TESTVÉREKTŐL kell venni, nem '
      + 'emlékezetből; (2) a pin ugyanazt a fogyasztót HÍVJA-e, amit a felhasználó lát? Ahol egy '
      + 'vezérlő tartalma adatból jön, ott nem a deklaráció meglétét, hanem a KIRAJZOLT SOROK SZÁMÁT '
      + 'kell mérni — az üres legördülő ugyanaz a néma hazugság, mint az üres lista (KUKA-012).',
    guard_note: 'gépi jel: `npm run verify:editor-layout` **EDL08** — a pin RENDERELI a mezőt és számolja '
      + 'a kirajzolt sorokat, minden felületen, padlóval + 3 nyelven mért felirat; a régi (szöveges) '
      + 'alakon BIZONYÍTOTTAN PIROS (mérve: 3 bukó ellenőrzés). Mellé EDL09 (a hivatkozás-mező „+ Új" '
      + 'gombja ÉLŐ, ÍRHATÓ felületre megy) és a KUKA-068 tiltó-minta a verify:kuka-ban.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['tools/vs_verify_editor_layout.mjs'],
        pattern: "String\\(field\\.options \\|\\| ''\\)\\.split",
        reason: 'a pin a renderelő nyelvén olvassa az options-t (tömb) — a szöveges olvasás a hibát ŐRIZNÉ (KUKA-068)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_verify_editor_layout.mjs'],
        pattern: 'renderEditorFieldControl',
        reason: 'a pin MEGHÍVJA a mező-renderelőt és a kirajzolt sorokat számolja (KUKA-068)' }),
      Object.freeze({ paths: ['public/js/editor-fields.mjs'],
        pattern: 'Array\\.isArray\\(f\\.options\\)',
        reason: 'a renderelő szerződése: statikus választó CSAK tömbből épül — ezt méri a pin (KUKA-068)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-067',
    date: '2026-08-31',
    title: 'AZ ELŐJEL KÉTSZER — a mérő a doktrína előjelét a MÁR ELŐJELES mennyiségre tette rá',
    what: 'A lánc-mérő (vs_process_chain_report) a lot élő egyenlegét úgy számolta, hogy a mozgás-'
      + 'mennyiségekre MÉG EGYSZER rátette a doktrína előjelét (kiadásnál kivonta). A főkönyv viszont '
      + 'a mennyiséget MÁR ELŐJELESEN tárolja (LI-04: „quantity sign follows movement_type direction" '
      + '— kiadás −400, bevét +30000), így a kiadás −(−400) = +400-ként könyvelődött a mérésben: az '
      + 'operátor első éles futásán a VSNE-004 lotra 35 000 ml állt 25 000 helyett, a VSNE-005-re 620 kg '
      + 'a valódi NULLA helyett.',
    why_wrong: 'A SAJÁT FIXTÚRÁM ELŐJEL NÉLKÜLI MENNYISÉGGEL ÉPÜLT — kézzel szúrt sorokkal, pozitív '
      + 'kiadás-mennyiséggel —, tehát a próbám a saját előfeltevésemet igazolta vissza, és zölden '
      + 'engedte ki a hibát (a CLAUDE.md 3/b szabálya betűre: „A SAJÁT PÉLDÁM NEM BIZONYÍTÉK", a '
      + 'KUKA-033/054 mérő-szerszám alakja). A tárolási konvenciót nem OLVASTAM, hanem FELTETTEM — '
      + 'pedig az LI-04 invariáns kimondja, és a motor betartja.',
    replaced_by: 'Az egyenleg a mozgás-mennyiségek NYERS ÖSSZEGE (a főkönyv a maga előjelével beszél); '
      + 'a doktrína-feloldó (directionOf) CSAK osztályozásra marad (melyik lot bemenő/kimenő ágon '
      + 'mozdult). A kijelzés sem duplázza a jelet: a szám maga hordozza az irányt.',
    decision: 'D-VS-620',
    found_by: 'CLAUDE-AUX, 2026-08-31 — az OPERÁTOR első éles futásának kimenetéből (a 3 valódi '
      + 'bizonylat számai buktatták le; a fixtúra-próba és a söprés végig zöld volt).',
    lesson: 'TÁROLÁSI KONVENCIÓT SOHA NE FELTÉTELEZZ — OLVASD KI (itt: LI-04 a ledgerInvariantRegistry-'
      + 'ben), és a mérő-szerszám fixtúrája a RENDSZER VALÓDI ÍRÓJÁNAK alakját vegye fel, ne az '
      + 'enyémet: kézzel szúrt fixtúránál az első kérdés, hogy a MOTOR hogyan írná ugyanezt a sort. '
      + 'Ahol egy érték előjelesen tárolt, ott a „irány szerinti" újra-előjelezés kétszeres könyvelés '
      + '— a hiba pont azokon a sorokon él, amiket mérni akartunk (KUKA-029 rokona: minden olvasó '
      + 'UGYANAZT az alakot olvassa, amit az író írt).',
    guard_note: 'gépi jel: `npm run verify:product-cleanup` **PFP09** — a lánc-mérőben az egyenleg '
      + 'NYERS összeg (tiltott az irány-szerinti újra-előjelezés a quantity-n), a directionOf csak '
      + 'osztályoz; + KUKA-067 tiltó-minta a verify:kuka-ban.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['tools/vs_process_chain_report.mjs'],
        pattern: "ledger -= a\\.quantity",
        reason: 'a mozgás-mennyiség MÁR előjeles (LI-04) — az irány szerinti kivonás kétszeres előjelezés (KUKA-067)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_process_chain_report.mjs'],
        pattern: 'ledger \\+= a\\.quantity',
        reason: 'az egyenleg a főkönyv nyers összege — a szám a saját előjelével beszél (KUKA-067)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-066',
    date: '2026-08-31',
    title: 'A KITALÁLT FORRÁS, AMI ÜRESNEK LÁTSZOTT — a hamis kötőjel a cellában',
    what: 'A hozzárendelő panel BIRTOKOLT fajtája (recept · göngyöleg-szint) a cellában egy termék-'
      + 'oszlopból akarta megmutatni, hány kapcsolat van: `row_field: "recipe_count"`. Ilyen oszlop a '
      + 'termék-projekcióban SOHA nem létezett (mérve: a név az EGÉSZ repóban csak a regiszterben állt), '
      + 'ezért az érték mindig `undefined` lett, és a cella a tartalék kötőjelet írta ki. Az operátor '
      + 'képernyőjén 94 termék sorában állt „—", miközben receptből és göngyölegből egy csomó van: '
      + '„hiába van ott egy táblázat, nem csinál semmit!! … ezek hamisak".',
    why_wrong: 'A HAMIS ÜRES ADATNAK LÁTSZIK, NEM HIBÁNAK. Egy 500-as hiba feltűnik; egy kötőjel nem — '
      + 'úgy néz ki, mint egy őszinte „nincs kapcsolat", ezért a képernyő HAZUDOTT anélkül, hogy '
      + 'bármi pirosra váltott volna (KUKA-012 a CELLÁBAN). A gyökér a KUKA-005 regiszter-alakja: '
      + 'mezőnevet emlékezetből írtam, és mivel a regiszter-bejegyzés alakilag hibátlan volt, a modell '
      + 'hűségesen olvasta, a rács hűségesen kirajzolta — a lánc minden darabja „működött" (KUKA-038).',
    replaced_by: 'A SZÁM FORRÁSA DEKLARÁLT ÉS LÉTEZŐ: `count_entity` a birtokos SAJÁT lekérdező-'
      + 'entitására mutat (`recipes` · `packaging-levels` · `price-list-items`), aminek a projekciója '
      + 'hozza a `product_id`-t; a panel EGY kérésben elhozza és a KÖZÖS `ownedCountsByRecord` '
      + 'feloldóval termékenként megszámolja. A cellában SZÁM áll (a nulla is szám), és a szám '
      + 'KATTINTHATÓ: a termék saját szerkesztője nyílik meg annál a szakasznál, ahol az a kapcsolat '
      + 'születik (`editor_section` + `data-editor-section` horgony minden szakaszon). Az árlista-sáv '
      + 'ugyanígy bekerült harmadikként — addig SEHOL nem látszott termék-oldalról.',
    decision: 'D-VS-616',
    found_by: 'AZ OPERÁTOR, 2026-08-31, az első használatkor — a kiadás előtti végigkattintásom a '
      + 'panel MŰKÖDÉSÉT nézte (megnyílik-e, jó vezérlő van-e), a birtokolt oszlop TARTALMÁT nem: az '
      + 'üresen is „rendben lévőnek" látszott.',
    lesson: 'AMI EGY REGISZTER-BEJEGYZÉSBEN FORRÁSRA HIVATKOZIK, ANNAK A FORRÁSNAK A LÉTEZÉSÉT MÉRNI '
      + 'KELL. A bejegyzés alaki épsége semmit nem mond arról, hogy a hivatkozott oszlop/entitás létezik-e; '
      + 'ha nem, a felület nem hibázik, hanem ÜRESET mutat — és az üres adat a legrosszabb hazugság, mert '
      + 'információnak látszik. Két kötelező kérdés minden ilyen bejegyzésnél: LÉTEZIK-E, amire mutat? · '
      + 'és mit lát a felhasználó, ha NEM létezik? Ha a válasz „kötőjelet", akkor a tartalék-érték maga a '
      + 'hiba. És a végigkattintásnál nem elég, hogy a képernyő megnyílik: a KIÍRT ÉRTÉKET is a valósághoz '
      + 'kell mérni (KUKA-033 a megjelenített adatra).',
    guard_note: 'gépi jel: `npm run verify:assignment-panel` **ASN13** — a pin a deklarált `count_entity`-t '
      + 'az ÉLŐ lekérdező-spec listájához méri, és megköveteli, hogy a projekció hozza a `product_id`-t; '
      + 'a `editor_section` horgonyt a szakasz-diszpécserhez méri (mindkét irány); a számolót HÍVJA. '
      + 'Kitalált forrás-névre bizonyítottan PIROS (visszaállítva mérve). Mellé böngésző-próba '
      + '(`tests/e2e/assignment-panel.spec.js` ASN-03): minden cella SZÁM, a mért kapcsolat-szám a helyén '
      + 'áll, és a számra kattintva a helyes termék szerkesztője nyílik meg a recept-szakasznál.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['config/registries/ui_surfaces.json'],
        pattern: '"row_field": "(recipe_count|packaging_level_count)"',
        reason: 'a birtokolt kapcsolat száma nem egy kitalált termék-oszlopból jön, hanem a birtokos entitásáról (KUKA-066)' }),
      Object.freeze({ paths: ['public/js/assignment-panel.mjs'],
        pattern: "has \\? String\\(has\\) : '—'",
        reason: 'a hiányzó érték helyén nem állhat kötőjel: az üresnek látszó cella hazugság (KUKA-066)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['public/js/assignment-model.mjs'],
        pattern: 'export function ownedCountsByRecord',
        reason: 'a számolás EGY nevezett feloldóban él, amit a panel és a pin is hív (KUKA-066)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-065',
    date: '2026-08-31',
    title: 'A DEKLARÁCIÓ, AMI ALULMARADT — a kimondott szabály, amit a KÖRNYEZETE hatálytalanított',
    what: 'A kilenc operátori pontosítás első alakja HÁROM ponton pontosan azt NEM csinálta, amit a '
      + 'forrásában kimondott. (1) A panel mérete: `.vs-assign-dialog { width: 98vw; height: 92vh }` ott '
      + 'állt a stíluslapban, de az ÁLTALÁNOS párbeszéd-méret (`.vs-export-dialog { width: 36rem }`) '
      + 'AZONOS fajsúllyal, LEJJEBB áll ugyanabban a fájlban — a kaszkádban a későbbi nyer, tehát a '
      + 'panel 576 px-en nyílt, változatlanul „nem fért ki". (2) Az oszlop-fejléc jelölője: a billentés '
      + 'újrarajzolja a rácsot, a fejléc-jelölő viszont MINDIG üresen született — a sorok alatta be '
      + 'voltak jelölve, a pipa mégis visszaugrott. (3) A több-értékű legördülő: a `toggle()` teljes '
      + 'lista-újrarajzolást hívott, ezzel a kattintott sort kicserélte a DOM-ban; a kívül-kattintás '
      + 'őre `pop.contains(e.target)`-ból dönt, ami egy kicserélt csomópontra HAMIS — a legördülő az '
      + 'ELSŐ pipa után becsukódott, vagyis pontosan az a hiba maradt, amit javítani kellett volna.',
    why_wrong: 'MIND A HÁROM DARAB ÉP VOLT KÜLÖN-KÜLÖN, és a forrás-olvasó pin mindhármat zöldnek '
      + 'látta: a 98vw ott volt, a fejléc-jelölő ott volt, a `toggle()` ott volt. A hiba a darab és a '
      + 'KÖRNYEZETE viszonyában élt — a kaszkádban, az újrarajzolás utáni állapotban, az esemény-'
      + 'sorrendben (KUKA-024 három új terepen; KUKA-038: a létezés nem bizonyíték arra, hogy FUT). '
      + 'A pin, ami a deklaráció LÉTÉT méri, ilyenkor nem véd: a hibát ŐRZI.',
    replaced_by: 'A DEKLARÁCIÓ MELLÉ A GYŐZELEM MÉRÉSE. (1) A stílus a `.vs-export-dialog'
      + '.vs-assign-dialog` ÖSSZETETT szelektorra megy — magasabb fajsúly, tehát a fájl átrendezése sem '
      + 'viheti vissza; a pin pedig a KASZKÁD GYŐZTESÉT számolja ki (fajsúly, majd sorrend), nem a '
      + 'szöveget keresi. (2) A fejléc-jelölő ÁLLAPOTOT kap (`headerChecked`/`headerIndeterminate`), '
      + 'amit a panel a cellákkal KÖZÖS `cellState` feloldóból számol (KUKA-039), a rács pedig felveszi. '
      + '(3) A `toggle()` CSAK az érintett sor jelölőjét írja át (`rowChecks`), a listát nem rajzolja '
      + 'újra — a kattintott csomópont a DOM-ban marad, a legördülő nyitva marad.',
    decision: 'D-VS-615',
    found_by: 'CLAUDE-DEV, 2026-08-31 — a kiadás ELŐTTI végigkattintással (CLAUDE.md 3/b: „A '
      + 'MEGVÁLTOZTATOTT KÉPERNYŐT VÉGIG KELL KATTINTANI"). A 278-as söprés mindhárom hibán ZÖLD volt; '
      + 'nélküle mind a három az operátorhoz került volna, és a (3) épp az ő panaszát hagyta volna '
      + 'változatlanul.',
    lesson: 'HA EGY DEKLARÁCIÓ HATÁSA A KÖRNYEZETÉTŐL FÜGG (kaszkád · újrarajzolás · esemény-sorrend), '
      + 'AKKOR A DEKLARÁCIÓ MEGLÉTE NEM MÉRÉS. Három konkrét kérdés minden ilyen munkánál: MELYIK '
      + 'szabály nyer? · MIT MUTAT A VEZÉRLŐ AZ ÚJRARAJZOLÁS UTÁN? · MI TÖRTÉNIK A KATTINTOTT ELEMMEL, '
      + 'amíg az esemény még buborékol? És a végigkattintás nem formalitás: ez a három hiba pontosan '
      + 'akkora volt, hogy zöld battéria mellett is kiadható lett volna.',
    guard_note: 'gépi jel: `npm run verify:assignment-panel` **ASN11/2** (a pin KISZÁMOLJA a kaszkád '
      + 'győztesét — a régi, egy-osztályos alakon bizonyítottan PIROS) + **ASN12** (a fejléc-állapot '
      + 'végigmegy a panelről a rácsig · a cella és a fejléc UGYANAZT a feloldót hívja · a billentés '
      + 'nem rajzolja újra a listát, a kívül-kattintás őrével együtt mérve) + a böngésző-próbák '
      + '(`tests/e2e/assignment-panel.spec.js` ASN-02: panel-méret · oszlop-fejléc jelölő · a nyitva '
      + 'maradó legördülő — mind a három a HIBÁS kódon bukott, ezért került ide).',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['public/js/reference-combobox.mjs'],
        pattern: 'renderTrigger\\(\\); renderList\\(\\); opts\\.onSelect',
        reason: 'a több-értékű billentés nem rajzolhatja újra a listát — a kattintott csomópont kikerül a DOM-ból, és a legördülő becsukódik (KUKA-065)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['public/styles/listgrid.css'],
        pattern: '\\.vs-export-dialog\\.vs-assign-dialog',
        reason: 'a panel-méret ÖSSZETETT szelektoron nyer, sorrendtől függetlenül (KUKA-065)' }),
      Object.freeze({ paths: ['public/js/listgrid.mjs'],
        pattern: 'hcb\\.checked = xc\\.headerChecked === true',
        reason: 'a fejléc-jelölő az újrarajzolás után a SAJÁT oszlopa állapotát mutatja (KUKA-065)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-064',
    date: '2026-08-31',
    title: 'A ZSÁKUTCÁS ELUTASÍTÁS — „Nincs ilyen cégtér", és semmi több',
    what: 'Az előző körben szállított termék-lábnyom szerszám az operátor ELSŐ éles futtatásán ennyit '
      + 'mondott: „Nincs ilyen cégtér: vsne" — és megállt. A kód valójában `valach-sandorne`; a `vsne` '
      + 'a TÉTELSZÁM-ELŐTAG, nem a cégtér kódja (a `VSNE-…` alak az alapállás-mentés óta a lot-kódokon '
      + 'él, tehát az operátor teljesen ésszerűen írta be). Ugyanez a zsákutca állt a törlőben, a '
      + 'sor-kivevőben, és a sor-kivevőben ráadásul kétszer még: a nem létező ALÁÍRÓRA és a nem '
      + 'létező BIZONYLATSZÁMRA is puszta „nincs ilyen" jött.',
    why_wrong: 'A NEMLEGES VÁLASZ NEM MONDTA MEG, MIT ÍRJON HELYETTE. Az operátornak a rendszerben '
      + 'négy cégtér él; a helyes kód egyetlen sor lett volna a képernyőn. Így viszont a szerszám '
      + 'használhatatlan volt addig, amíg valaki (én) meg nem mondta a kódot — egy kör oda-vissza, '
      + 'semmiért. Ez a KUKA-012 családja („az üres lista és az elérhetetlen nem ugyanaz, és egyik sem '
      + 'lehet néma") az ELUTASÍTÁSRA fordítva, és a KUKA-011 párja: ami nincs megjelenítve, az nincs — '
      + 'a létező cégterek listája ott volt az adatbázisban, csak nem írtuk ki.',
    replaced_by: 'EGY NEVEZETT FELOLDÓ minden szállított eszköznek: `tools/lib/vs_tool_tenant.mjs` → '
      + '`resolveTenant(db, code)`. Találatnál a cégteret adja; hiánynál KÉSZ, kiírható MONDATOT: '
      + 'felsorolja az ÖSSZES élő cégteret (a demót megjelölve, mert az elhallgatása félrevezetőbb '
      + 'volna), és ha van EGYETLEN közeli jelölt — a KÓDRA vagy a cég NEVÉRE mérve, ékezet-független '
      + 'alakon —, azt „Erre gondoltál?" sorként kiemeli. Két egyforma jelöltnél NEM tippel (KUKA-027). '
      + 'Ugyanez a fegyelem áll a sor-kivevő másik két bejáratán: a hiányzó aláírónál a cégtér '
      + 'felhasználóit, a hibás bizonylatszámnál a hasonló számú bizonylatokat sorolja fel.',
    decision: 'D-VS-611',
    found_by: 'AZ OPERÁTOR, 2026-08-31, az első éles futtatással — a szerszám a saját válaszával '
      + 'állította meg.',
    lesson: 'AMIKOR EGY ESZKÖZ NEVET KÉR ÉS NEM TALÁLJA, A LÉTEZŐ NEVEKET KELL FELSOROLNIA. A „nincs '
      + 'ilyen X" önmagában nem válasz, hanem zsákutca: a felhasználó pontosan ott áll meg, ahol '
      + 'elindult, és a folytatáshoz KÜLSŐ segítség kell. A szabály általános: minden nevet/kódot kérő '
      + 'bejáraton (cégtér · felhasználó · bizonylat · termék · raktár) a nemleges válasz vigye magával '
      + 'a VÁLASZTHATÓ halmazt vagy a legközelebbi jelöltet. És a „hasonló" mérése a felhasználó '
      + 'nyelvén menjen: ő a cég NEVÉT ismeri, nem a kódját, és ékezettel írja. '
      + '· A KIVEZETÉS ALAKJA (2026-09-05, D-VS-645): ugyanez áll arra is, amikor MI VESSZÜK EL az utat. '
      + 'MÉRVE a böngészőben: egy KEDVENC, ami már nem létező képernyőre mutat, ott marad a menüben, '
      + 'kattintható, és a kattintásra TELJESEN ÜRES lap nyílik — se üzenet, se hiba '
      + '(`app.mjs`: `if (!s) { content.innerHTML = \'\'; return; }`). A zsákutcás KÉRDÉS és a zsákutcás '
      + 'ELVÉTEL ugyanaz a hiba, mint a zsákutcás elutasítás: a felhasználó ott áll meg, ahol elindult. '
      + 'Ezért minden kivezetésnél KÖTELEZŐ: (a) a régi azonosító NEVESÍTETT térképre kerül a HELYÉVEL '
      + 'együtt (`retired-surfaces.mjs`), (b) a képernyő MONDATOT ad és GOMBOT a célhoz, (c) a nem '
      + 'nevesített ismeretlen sem néma — általános mondat áll ott. A menü-levél törlése ÖNMAGÁBAN nem '
      + 'kivezetés, csak eltüntetés.',
    guard_note: 'A KIVEZETÉS-ALAK gépi jele (D-VS-645): `npm run verify:inspection-reports` **IR02** — a '
      + 'kivezetett felület NINCS a regiszterben, de VAN kimondott helye ÉLŐ céllal; és a menü-levél '
      + 'szabálya MINDKÉT irányban mérve (minden élő felületnek van levele, a kivezetettnek nincs). '
      + 'Böngésző-próba: `tests/e2e/retired-report-screens.spec.js` — mentett kedvenccel, a KIÍRT '
      + 'mondatot és a kiút-gomb célját mérve; a régi alakon bizonyítottan piros. '
      + '· gépi jel: `npm run verify:product-cleanup` **PFP07** (a feloldó HÍVVA minden ágon — '
      + 'talált · elgépelt kód · a cég NEVE ékezettel · üres bemenet; a felsorolás tartalmazza a demót '
      + 'megjelölve; és mind a három szerszám a KÖZÖS feloldón kérdez, saját „nincs ilyen cégtér" '
      + 'mondat nélkül; plusz a sor-kivevő két másik bejárata). **MÉRT ADÓSSÁG, kimondva:** a repóban '
      + '**56 további eszköz** oldja fel a cégteret saját `FROM tenant WHERE code = $1` lekérdezéssel, '
      + 'felsorolás nélkül (mérve 2026-08-31). A visszamenőleges átállításuk NEM történt meg ebben a '
      + 'körben — ezért osztály-szintű őr sem áll rá, csak ez a három eszköz van pinelve. A hiány '
      + 'kimondva, nem elhallgatva.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['tools/vs_product_footprint_report.mjs', 'tools/vs_product_delete.mjs', 'tools/vs_process_line_remove.mjs'],
        pattern: 'Nincs ilyen cégtér',
        reason: 'a nemleges válasz sorolja fel a létezőket — a puszta „nincs ilyen" zsákutca (KUKA-064)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/lib/vs_tool_tenant.mjs'],
        pattern: 'A rendszerben ezek a cégterek élnek',
        reason: 'az elutasítás VIGYE magával a választható halmazt (KUKA-064)' }),
      Object.freeze({ paths: ['tools/lib/vs_tool_tenant.mjs'],
        pattern: 'Erre gondoltál\\?',
        reason: 'egyetlen közeli jelöltnél a feloldó KIEMELI — kettőnél nem tippel (KUKA-064)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-063',
    date: '2026-08-31',
    title: 'A FÉL ŐR A SOR-TÖRLÉSEN — a nulla mozgás „már kompenzálva"-ként elutasítva',
    what: 'A `removePostedLine` a törlendő sor mögötti készlet-mozgások ÖSSZEGÉT nézte, és ha az '
      + 'nulla volt, `process_line_net_zero` hibakóddal állt meg, „line already fully compensated" '
      + 'mondattal. A nem-készlet szerepek (szolgáltatás · díj · info · minőség) viszont SOHA nem '
      + 'mozgatnak készletet — az összegük fogalmilag nulla. Ezért ezekre a sorokra a funkció a '
      + 'megépítése óta (PR-VS-042) HALOTT volt, a képernyőn pedig gomb sem volt hozzá '
      + '(`line_role === \'stock\'` a rács törlés-jelölésén).',
    why_wrong: 'A PROGRAMOZÓI VAKFOLT UGYANAZT A „NEM"-ET ADTA, mint a valódi nemleges válasz '
      + '(KUKA-020): a „már teljesen kompenzálva" egy KÉSZLET-sorra igaz állítás, egy '
      + 'szolgáltatás-sorra viszont hazugság — az sosem volt kompenzálva, mert sosem mozgatott '
      + 'semmit. A módosítás-út mindkét alakot ismerte (`modifyPosted` a készlet-sorra, '
      + '`modifyNonStockLine` a többire), a TÖRLÉS-út csak az egyiket: fél őr (KUKA-039). Az '
      + 'operátor konkrét kérése ezen akadt el — egy szolgáltatás-terméket nem lehetett kivezetni, '
      + 'mert a rá hivatkozó szolgáltatás-sort nem lehetett kivenni a bizonylatból.',
    replaced_by: 'NEVEZETT ALAK-FELOLDÓ: `processService.lineRemovalShape(line, movementCount)` → '
      + '`stock_affecting` | `metadata` | `engine_owned`. A készlet-sor a régi (kompenzáló mozgásos, '
      + 'visszajátszás-őrös) úton megy; a nem-készlet sor mozgás nélkül, MÓDOSÍTÁS-ESEMÉNNYEL — a sor '
      + 'megszűnik, a nyoma a könyvben marad a TELJES azonossággal (szám · szerep · termék-kód és '
      + '-név · mennyiség · egységár · megjegyzés), és az esemény a sor-hivatkozás NÉLKÜL áll, mert a '
      + 'törölt sorra mutató kulcs lógna. A partner-oldali TÜKÖR-sor `engine_owned`: azt a motor '
      + 'könyveli, ember nem veszi ki. A maradék sor-készlet MINDKÉT ágon újra-validálódik a '
      + 'bizonylat-fajta szabályán. És ha egy nem-készlet soron MÉGIS ül mozgás, a készlet-út megy — '
      + 'a VALÓSÁG dönt, nem a címke.',
    decision: 'D-VS-609',
    found_by: 'AZ OPERÁTOR, 2026-08-31, a termék-törzsét nézve: „zavaró, hogy szolgáltatásai vannak, '
      + 'pedig nem szolgáltat … ha az ötödiket is törölni lehetne úgy, hogy abból az egy '
      + 'szétszerelésből, amibe tartozik, abból az az egy szolgáltatás sor törlődne, akkor nagyon '
      + 'szép tiszta lenne" — a kérés futott bele a halott ágba.',
    lesson: 'AHOL EGY MŰVELETNEK KÉT ALAKJA VAN, A MÁSODIKAT NEM ELÉG „NEM TÁMOGATOTT"-KÉNT '
      + 'ELUTASÍTANI — meg kell nézni, hogy az elutasítás MONDATA igaz-e rá. Itt a mondat egy MÁSIK '
      + 'alak igazságát mondta ki, ezért a hiba nem is látszott hibának. Új ág építésekor a kérdés: '
      + 'melyik szerep/fajta esik a mérésem VAKFOLTJÁBA, és mit fog KAPNI válaszul? És ha egy '
      + 'testvér-út (itt: a módosítás) már ismeri mindkét alakot, akkor az az alak LÉTEZIK — a '
      + 'hiányát nem szabad a felhasználóra hárítani (KUKA-039).',
    guard_note: 'gépi jel: `npm run verify:product-cleanup` **PFP05** (az alak-feloldó HÍVVA mind a '
      + 'kilenc ágon — készlet · szolgáltatás · díj · info · minőség · tükör · „nem-készlet, de '
      + 'mozgott" · szerep nélkül; a metaadat-ág mozgás NÉLKÜL, sor-hivatkozás NÉLKÜL, TELJES '
      + 'azonossággal; a régi hazug mondat CSAK a készlet-ágon állhat; és a stratégia-validáció '
      + 'MEGELŐZI a metaadat-ágat) + `npm run proof:product-cleanup-db-live` **(e)/(f)** lépés '
      + '(valódi Postgres, valódi könyvelt bizonylat: a szolgáltatás-sor kivétele után a mozgás-szám '
      + 'VÁLTOZATLAN, a sor eltűnt, az esemény áll — a tükör-sor pedig nevesítve elutasítva).',
    forbidden: Object.freeze([
      // A tiltás a TÖRLÉS-ÚT alakját jelöli, nem a mondatot általában: a `permission: g.decision` zárás
      // csak ott áll (a `buildLinePlan` tiszta függvény, és ott a mondat IGAZ — oda CSAK készlet-sor
      // jut, `stockLinesAll` szűrővel). Az első alakom ezt a helyes kódot buktatta volna meg
      // (KUKA-057 fordítottja: az őr, ami a jó megoldást tiltja).
      Object.freeze({ paths: ['src/services/processService.js'],
        pattern: "if \\(net === 0\\) return \\{ ok: false, status: 409, error: 'process_line_net_zero', reason: 'line already fully compensated', permission",
        reason: 'a törlés-úton a nulla mozgás nem jelenti, hogy a sor kompenzálva volt — előbb az ALAK-feloldó dönt (KUKA-063)' }),
      Object.freeze({ paths: ['public/js/process-lines-grid.mjs'],
        pattern: "l\\.line_role === 'stock' \\? \\(\\(rowEl, btn\\)",
        reason: 'a sor-törlés jelölése nem szűkíthető a készlet-sorra — a tükör-sor a kivétel (KUKA-063)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/services/processService.js'],
        pattern: 'function lineRemovalShape\\(',
        reason: 'a sor-törlés alakja EGY nevezett feloldón dől el, minden ág azt hívja (KUKA-063)' }),
      Object.freeze({ paths: ['src/services/processService.js'],
        pattern: "counterparty_line_engine_owned",
        reason: 'a partner-oldali tükör-sor a motoré — a visszautasítás NEVESÍTVE áll (KUKA-063)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-062',
    date: '2026-08-30',
    title: 'A JOG A SAJÁT CÉG-CSALÁDBÓL LEVEZETVE — a kettős TAGSÁG mint kapcsolás-kapu',
    what: 'A D-VS-604 (Válassz-sor) és a D-VS-605 (árnyék-összevonás) a kapcsolás és az összevonás '
      + 'jogát KETTŐS TAGSÁGRA tette: „mindkét cégtér tagsága kell". A képernyőn ott állt a '
      + '`both_membership` mező, a szolgáltatás `both_memberships_required` néven utasított el, az '
      + 'összevonás `missing_memberships` néven sorolta a hiányt, a szótár pedig azt mondta, hogy '
      + '„hiányzik a tagságod ezeknél a cégeknél". A pinek (SMT09, SMG03) ezt a szabályt FAGYASZTOTTÁK '
      + 'BE, és a db-live proof is ezt igazolta vissza — mert a fixtúrában is egy ember volt mindkét '
      + 'cég tagja.',
    why_wrong: 'A tagság csak a SAJÁT cég-családon belül teljesül. A rendszer FŐ esete viszont két '
      + 'FÜGGETLEN cég (a bérmunkát rendelő és a bérmunkát végző), ahol SOHA senkinek nem lesz mindkettőben '
      + 'tagsága — ott a funkció a kiadásától kezdve HALOTT volt. És nem csak ez a képernyő: a '
      + 'fajta-azonosság a kereszt-cég megrendelés ELFOGADÁSÁNAK kapuja (CTR-01 sorai a shadow-ra '
      + 'hivatkoznak), tehát a tagság-kapu az EGÉSZ bérmunka-láncot elzárta idegen cégek között. A '
      + 'saját varratunk (SID-01) ugyanezt a kérdést MÁR HELYESEN oldotta meg — élő folyamat-'
      + 'részességből —, tehát a jó alak ott volt a szomszéd fájlban (KUKA-039: a testvér-ágat végig '
      + 'kell nézni). Ez a KUKA-060 ISMÉTLÉSE: a szabályt a MAI bérlők profiljából vezettem le, nem a '
      + 'rendszer definíciójából.',
    replaced_by: 'EGY NEVEZETT JOG-FELOLDÓ: `shadowVisibility.mayBindWith(me, other, { memberships, '
      + 'businessTenantIds })` → `{ ok, basis: \'membership\' | \'business\' | null }`. A jog-alap KÉT '
      + 'forrásból jöhet: (1) TAGSÁG — a saját cégeim közti kényelmi többlet, ügy nélkül is; (2) ÉLŐ '
      + 'KÖZÖS ÜGY — közös bizonylat-részesség (process_party), megrendelés-boríték '
      + '(cross_tenant_request) vagy megosztás (tenant_share), mindkét irányban, a visszavontat '
      + 'kihagyva (`shadowProductService.businessTenantIdsOf`). Minden ág EZT hívja: a látható kör '
      + 'számítása (3 hely), a Válassz-sor, a döntés és az összevonás. A nevek is igazat mondanak: '
      + '`can_bind` · `bind_basis` · `no_bind_basis` · `missing_bind_basis` · `bindGap`.',
    decision: 'D-VS-607',
    found_by: 'AZ OPERÁTOR, 2026-08-30, olvasás közben, a kör közepén: „végig se olvastam, mi van ha '
      + 'nincs mind a kettőben tagságunk, ha vsné a valachland-től tök független!?!?!?!" — egyetlen '
      + 'mondat, ami két kiadott szeletet buktatott meg.',
    lesson: 'A JOGOSULTSÁGI SZABÁLYT SOHA NE A MAI FELHASZNÁLÓK VISZONYAIBÓL VEZESD LE (a KUKA-060 '
      + 'alakja a jogra). Ha egy szabály csak azért teljesül, mert ma egy ember birtokolja az összes '
      + 'céget, akkor nem szabály, hanem a jelen lenyomata — és a következő előfizetőnél NÉMÁN zár. '
      + 'Új kapunál a kérdés nem az, hogy „ki fér hozzá ma", hanem hogy MI TESZI JOGOSSÁ: a jog-alapot '
      + 'NEVEZNI kell (basis), nem csak igennel-nemmel felelni — enélkül a képernyő nem tudja '
      + 'megmondani, MIÉRT nem lehet. És a fixtúra, amiben mindkét tagság megvan, a saját '
      + 'előfeltevését igazolja vissza (KUKA-054): a próbában KELL egy olyan pár, ahol tagság SEHOL '
      + 'nincs.',
    guard_note: 'gépi jel: `npm run verify:shadow-match` **SMT09** (a `mayBindWith` feloldót HÍVJA mind '
      + 'az öt ágon: saját cég · tagság · élő közös ügy tagság nélkül · egyik sem · üres bemenet — és '
      + 'méri, hogy az ALAP is megjön; mellette az ügy-partner feloldó mindhárom otthonát és mindkét '
      + 'irányát) · `npm run verify:shadow-merge` **SMG03** (a `bindGap` minden ágon) · '
      + '`npm run verify:scope-hygiene` **SCH01/SCH05** (a kör második forrása + MINDEN kör-számítás '
      + 'viszi az ügy-partnereket — a fél őr nem őr) · és az ÉLŐ lánc: '
      + '`node tools/vs_shadow_match_db_live_proof.mjs` (j) lépés + '
      + '`node tools/vs_shadow_merge_db_live_proof.mjs` (b2) lépés — KÉT FÜGGETLEN cég, tagság sehol: '
      + 'a közös bizonylat ELŐTT visszatartás és `no_bind_basis`, UTÁNA ugyanaz az ember köt.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/services/'],
        pattern: 'both_memberships_required',
        reason: 'a kapcsolás joga nem kettős TAGSÁG — saját oldal + tagság VAGY élő közös ügy (KUKA-062)' }),
      Object.freeze({ paths: ['src/services/shadowMergeService.js'],
        pattern: "error: 'memberships_required'",
        reason: 'az összevonás joga sem kettős TAGSÁG — a hiány neve `no_bind_basis` (KUKA-062)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/services/shadowMatchService.js'],
        pattern: 'visibility\\.mayBindWith\\(me\\.id, other\\.tenant_id',
        reason: 'a döntés a KÖZÖS jog-feloldón áll (nem saját tagság-vizsgálaton) — KUKA-062' }),
      Object.freeze({ paths: ['src/services/shadowMergeService.js'],
        pattern: 'vis\\.mayBindWith\\(me, other',
        reason: 'az összevonás UGYANAZT a feloldót hívja (egy szabály, egy otthon) — KUKA-062' }),
      Object.freeze({ paths: ['src/services/shadowProductService.js'],
        pattern: 'async function businessTenantIdsOf',
        reason: 'az ÉLŐ KÖZÖS ÜGY partner-köre nevezett feloldó, egy otthonban — KUKA-062' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-061',
    date: '2026-08-27',
    title: 'AZ ÚJ NÉV, AMI MÁSODIK FOGALMAT SZÜLT — a „kártya" az árnyék-termék mellé',
    what: 'A közös termék-katalógus tervezésekor elkezdtem „termék-KÁRTYÁNAK" hívni a cégek fölötti '
      + 'termék-azonosságot. A §16.2 még helyesen mondta ki, hogy „a kártya NEM új fogalom: a mai '
      + 'árnyék-termék nő ki kártyává" — de a következő körökben már úgy írtam róluk, mintha KÉT '
      + 'szint volna: „külön kártya, közös fajta", „a vevő fajtára is kereshet". A füzet 56 helyen '
      + 'használta a „kártya" szót önálló fogalomként, és épült rá egy KÉTSZINTŰ modell (kártya = '
      + 'kereskedelmi termék, fajta = fölötte álló csoport), aminek a rendszerben SEMMI nem felel meg.',
    why_wrong: 'MÉRVE: a migráció-állományban nincs és soha nem volt „kártya" (product_card / '
      + 'catalog_item / master_product) tábla — csak a `shadow_product`. Az árnyék ráadásul MÁR MA IS '
      + 'a konkrét kiszerelés szintjén él (a 954-es oszlop-megjegyzése szerint a neve „homoktövis velő '
      + '2 l"), tehát pontosan az, aminek a „kártyát" szántam. Egy fogalomnak két nevet adtam, és a két '
      + 'név külön életre kelt: a KUKA-003 („ha két »különböző« dolog kódja azonos, akkor nem két '
      + 'dolog") és a KUKA-018 („ahol egy fogalomnak két ábrázolása van, a kérdés, melyiket olvassa a '
      + 'renderelő") együtt. A kétszintűség forrása egy KÉTÉRTELMŰ SZÓ volt: az árnyék oszlop-'
      + 'megjegyzése „fajta-névnek" hívja a mezőt, miközben a példája kiszerelés-szintű — ebből a '
      + 'résből építettem egy nem létező fölöttes szintet.',
    replaced_by: 'EGY REKORD, EGY NÉV: az ÁRNYÉK-TERMÉK mondja ki, hogy „ez a két (vagy több) cégnél '
      + 'UGYANAZ A TERMÉK" — konkrét kiszerelés szintjén, nem „hasonló fajta" értelemben. Ez hordozza '
      + 'a márka-hivatkozást, a kategóriát, a paramétereket és a képet (a láthatóság már ma rajta van), '
      + 'és ez alá állnak be az ajánlatok. Más kiszerelés = MÁSIK árnyék-termék, és a kettő egymásra '
      + 'MUTAT — fölöttes „fajta"-rekord nincs; aki a fajta nevére keres, azt a KERESÉS szolgálja ki. '
      + 'A vásárló egyik belső szót sem látja: ő egy termék-oldalt lát.',
    decision: 'D-VS-586',
    found_by: 'AZ OPERÁTOR, 2026-08-27, olvasás közben: „elvi alaphiba szerintem megint, eddig a '
      + 'pontig többször belefutottam, és nem értem a különbséget az árnyék termék, és a kártya között '
      + '… az árnyékot nem arra használjuk, hogy azt mondjuk, mindkettő hasonló »fajta« termék … hanem '
      + 'gyakorlatban ugyanaz a termék, csak ha van márkájuk, akkor más márka alatt. mire van a kártya?" '
      + '— és a saját definíciója pontosabb volt, mint az enyém.',
    lesson: 'ÚJ SZÓ = ÚJ FOGALOM, akkor is, ha nem akartuk. Ha egy meglévő dolognak új nevet adok '
      + '„mert az olvasónak érthetőbb", a két név előbb-utóbb KÜLÖN ÉLETRE KEL, és épül rájuk egy '
      + 'szerkezet, aminek a valóságban semmi nem felel meg. A helyes alak: EGY fogalom, EGY név, '
      + 'mindenhol — és ha a felhasználónak más szó kell, az KÉPERNYŐ-FELIRAT, nem második fogalom. '
      + 'És ha egy meglévő mező NEVE kétértelmű (itt: „fajta-név" egy kiszerelés-szintű mezőn), azt '
      + 'javítani kell, mert a kétértelműségre előbb-utóbb valaki modellt épít.',
    guard_note: 'GÉPI JEL EGYELŐRE NINCS — és ezt ki kell mondani. A hiba TERV-szövegben élt, nem '
      + 'kódban. Addig tiltó-minta a terv-szövegekre: a kétszintű „külön kártya, közös fajta" alak nem '
      + 'születhet újra. Amint a bővített árnyék kódba kerül, a gépi jel az lesz, hogy a márka, a '
      + 'kategória és a paraméter EGYETLEN rekordon (a shadow_product-on) él, és nincs mellette '
      + 'második, azonos szerepű tábla (a KUKA-028 név-egyezés keresése minden új táblára kötelező).',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['docs/70_PLANNING/'],
        pattern: 'külön kártya, közös fajta',
        reason: 'nincs fölöttes „fajta"-rekord — más kiszerelés = másik árnyék-termék (KUKA-061)' }),
      Object.freeze({ paths: ['docs/70_PLANNING/'],
        pattern: 'a mai árnyék-termék nő ki kártyává',
        reason: 'nincs „kártya" mint második fogalom — az árnyék-termék MAGA az (KUKA-061)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['docs/70_PLANNING/ARNYEK_TERMEK_DESIGN.md'],
        pattern: 'EGY REKORD, EGY NÉV',
        reason: 'a terv kimondja: az árnyék-termék és a „kártya" ugyanaz (KUKA-061)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-060',
    date: '2026-08-27',
    title: 'A RENDSZER HATÓKÖRE A MAI BÉRLŐK IPARÁGÁBÓL LEVEZETVE',
    what: 'A közös termék-katalógus tervében (D-VS-579) az ÉLELMISZERT tettem meg alap-esetnek és a '
      + 'kézműves terméket a zászlóshajó-példának, mert a mai öt bérlő ilyen: „Ez a VS profilja!" — '
      + 'írtam az Open Food Facts mellé. A műszaki cikk így KIVÉTEL lett a tervben, a paraméter-'
      + 'összehasonlítás pedig „ott úgysem megy" minősítést kapott — miközben a VS ÁLTALÁNOS rendszer, '
      + 'és a következő előfizető lehet két fémipari vagy két elektronikai kereskedelmi cég.',
    why_wrong: 'a mai felhasználók iparága a JELEN, nem a DEFINÍCIÓ. Ha a rendszert belőle vezetem le, '
      + 'a következő iparág nem fér bele, és ezt SEMMI nem jelzi: a terv „működik" — csak épp arra a '
      + 'három cégre. Ez a KUKA-001 alakja befelé (ott külső rendszer fogalmából vezettem le VS-'
      + 'entitást, itt a saját bérlők profiljából a rendszer hatókörét), és a KUKA-051 alakja a '
      + 'hatókörre: a hatókör nem LISTA (élelmiszer + kézműves), hanem SZABÁLY. Ráadásul a levezetés '
      + 'MÉRÉS NÉLKÜL kimondott korlátot szült („a külső csatorna nincs, és egyhamar nem is lesz"), '
      + 'holott iparáganként INGYENES csatorna létezik (ETIM 5600+ osztály Open Data Commons licenc '
      + 'alatt; Open Icecat; Open Food Facts) — csak nincs BEKÖTVE (KUKA-010: a nemleges lelet a '
      + 'leggyengébb bizonyíték).',
    replaced_by: 'FORRÁS-REGISZTER + EGY FELOLDÓ: a termék-fajta legfeljebb azt dönti el, MELYIK külső '
      + 'csatorna ad adatot (Open Icecat · ETIM/BMEcat · eCl@ss · Open Food Facts · GS1 · a VS saját '
      + 'tényei · semmi) — a folyamatokat, a képernyőket és a feloldókat NEM érinti. A FORRÁS-réteg '
      + 'feedere termékenként más, a réteg ugyanaz, és a felhasználó SOHA nem választ forrást. Ami '
      + 'iparágfüggő, az a LEFEDETTSÉG, és az MÉRENDŐ szegmensenként, nem levezetendő.',
    decision: 'D-VS-580',
    found_by: 'AZ OPERÁTOR, 2026-08-27: „a VS-ben nem kimondott élelmiszert akarunk feldolgozni, vagy '
      + 'árulni. ez megint beskatulyázás, ami ebből a három tenant-ból jött. a rendszernek működnie '
      + 'kell minden fajta termékre… ki mondja meg a Kulcs-Softnak, hogy csak élelmiszer-feldolgozásra '
      + 'lehet használni?!" — és ő mondta ki a helyes architektúrát is: a külső katalógus-adatot és a '
      + 'VS-ben született adatot ÖSSZE KELL MOSNI úgy, hogy a felhasználó ne érzékeljen belőle semmit.',
    lesson: 'A RENDSZER HATÓKÖRÉT SOHA NE A MAI FELHASZNÁLÓKBÓL VEZESD LE — a bérlők profilja a jelen, '
      + 'nem a definíció. Ha egy terv egy iparágat alap-esetnek, a többit kivételnek kezeli, akkor nem '
      + 'általános rendszert tervez, hanem egy vertikumot, és a következő előfizető NÉMÁN nem fér bele. '
      + 'A helyes alak: a fajta legfeljebb a FORRÁST választja, a gépezetet nem. És mielőtt bármilyen '
      + 'korlátot kimondasz („ilyen csatorna nincs"), MÉRD MEG — itt ingyenes, nyílt szabvány létezett '
      + 'pontosan arra az iparágra, amit kivételnek minősítettem.',
    guard_note: 'GÉPI JEL EGYELŐRE NINCS — és ezt ki kell mondani. A hiba TERV-szövegben élt, nem '
      + 'kódban, ezért a mai őrök egyike sem foghatta meg. Amint a forrás-regiszter kódba kerül, a '
      + 'gépi jel az lesz, hogy a regiszter EGY nevezett feloldón át szolgál ki minden termék-fajtát '
      + '(KUKA-039 mintája), és hogy egyetlen olvasó sem ágazik el iparág szerint. Addig a tiltó-minta '
      + 'a terv-szövegekre áll: a rendszer profilját kimondó mondat nem születhet újra.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['docs/70_PLANNING/'],
        pattern: 'a VS élelmiszer-profilj',
        reason: 'a VS nem élelmiszer-rendszer — a hatókör SZABÁLY, nem a mai bérlők iparága (KUKA-060)' }),
      Object.freeze({ paths: ['docs/70_PLANNING/'],
        pattern: 'Ez a VS profilja',
        reason: 'a mai bérlők iparága a JELEN, nem a DEFINÍCIÓ (KUKA-060)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['docs/70_PLANNING/KOZOS_KATALOGUS_FELDERITES_LELTAR.md'],
        pattern: 'A FORRÁS-REGISZTER',
        reason: 'a termék-fajta legfeljebb a FORRÁST választja — a gépezetet nem' }),
      Object.freeze({ paths: ['docs/70_PLANNING/ARNYEK_TERMEK_DESIGN.md'],
        pattern: 'A RENDSZER NEM ÉLELMISZER-RENDSZER',
        reason: 'a kimondott mérce: minden termék-fajtára működik (KUKA-060)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-059',
    date: '2026-08-26',
    title: 'A CÉG-SZŰRT SZERVIZ EGYETLEN SZŰRETLEN LEKÉRDEZÉSE — és a mezőnév, ami két dolgot jelentett',
    what: 'KÉT LELET, EGY CSALÁD. (1) RF-013: a Fajta-azonosság szerviz MINDEN függvénye tenant-szűrt '
      + 'volt — egy kivétellel: a `listShadows` tag-lekérdezésén SEMMILYEN cég-feltétel nem állt, így '
      + 'minden cég termék-KÓDJA és -NEVE kiment minden bérlőnek, aki megnyitotta a képernyőt (az írás-'
      + 'oldal ugyanígy: idegen árnyékra kötéssel be lehetett látni egy körbe). (2) RF-014: HÁROM '
      + '`ctxOf` élt a repóban; a `tenantId` nevű mező a kanonikusban a cég AZONOSÍTÓJÁT, két '
      + 'szervizben viszont a KÓDJÁT hordozta — nyolc hívóhely szándékosan a kódot tette bele.',
    why_wrong: 'a szűretlen lekérdezést épp a KÖRNYEZETE rejtette el: a fájl „úgy néz ki, mint egy '
      + 'rendes, cég-szűrt szerviz", ezért sem a szem, sem a forrás-olvasó őr nem akadt fenn rajta — a '
      + 'hiba nem egy hiányzó darab volt, hanem EGY KIVÉTEL egy egyébként ép mintában. A név-ütközést '
      + 'pedig annak idején ÁLNÉVVEL kerülték meg (`shareCtxOf` ugyanabban a fájlban), ami nem javítás, '
      + 'hanem konzerválás: a két jelentés némán élt egymás mellett, és a nap, amikor valaki a '
      + 'kanonikus környezetet adja át a levél-szerviznek, néma `tenant_not_found` lett volna '
      + '(KUKA-002 + KUKA-018).',
    replaced_by: 'NEVEZETT LÁTHATÓSÁGI FELOLDÓ (`shadowVisibility`, SHV-01): a látható cégek köre az, '
      + 'AMELYIKEKNEK A BELÉPETT EMBER TAGJA — nem beállítás, nem cégkód-minta, hanem a rendszer saját '
      + 'igazsága (KUKA-056). Munkamenet nélkül a kör a kérés cégére szűkül (fail-closed). A '
      + 'visszatartás SZÁMKÉNT látszik, és a képernyő kimondja a szabályt. Az olvasás ÉS az írás is a '
      + 'közös feloldót hívja. A `tenantId` mező pedig a saját nevén (`tenantCode`) viszi a kódot, '
      + 'tartalék-olvasás NÉLKÜL, és a repóban egyetlen `ctxOf` maradt.',
    decision: 'D-VS-575',
    found_by: 'Claude-AUX az átvilágításban (RF-013/RF-014); a HATÓKÖRÉT és a diagnózis hibáját a '
      + 'Claude-DEV mérte meg 2026-08-26-án — az RF-014 leírása szerint a ctx „Promise lett volna", '
      + 'valójában két árnyékoló feloldó élt. A javítás első alakját a SAJÁT élő próbája buktatta meg: '
      + 'a tag-sorok már szűrve voltak, de az árnyék fejléce még kiírta a gazda cég nevét.',
    lesson: 'EGY CÉG-SZŰRT SZERVIZBEN A SZŰRETLEN LEKÉRDEZÉS LÁTHATATLAN — a minta épsége elrejti a '
      + 'kivételt, ezért a hatókört FÜGGVÉNYENKÉNT kell megkérdezni, nem fájlonként. És a lelet SZÖVEGE '
      + 'sem bizonyíték: mérni kell, mielőtt javítunk (itt a diagnózis téves volt, a baj valódi). '
      + 'Végül: ha egy NÉV már foglalt, az álnév nem megoldás, hanem a hiba konzerválása.',
    guard_note: 'gépi jel: `npm run verify:scope-hygiene` (SCH01–SCH08 a láthatósági feloldókat HÍVJA '
      + 'fixtúrán, minden ágon; SCH09 pontosan egy `ctxOf` definíció; SCH10 sehol nem megy kód egy '
      + '`tenantId` nevű mezőbe; SCH13 minden hívás await-tel; SCH14 padló) + '
      + '`npm run proof:scope-hygiene-db-live` (KÉT valódi cég egy valódi adatbázisban, közös '
      + 'árnyékon: az egyik nem látja a másik termék-kódját, nevét, cég-nevét — de a visszatartás '
      + 'számként megjelenik, és aki mindkettőnek tagja, mindkettőt látja).',
    forbidden: Object.freeze([
      // A TILTÁS A VISSZACSÚSZÁS ALAKJÁT jelölje, ne a SQL-mondatot: a lekérdezés szövege önmagában
      // helyes és megmarad — a hiba az volt, hogy az EREDMÉNYE szűretlenül került a válaszba. Az első
      // alakom a mai, JAVÍTOTT mondatot találta el (KUKA-009 fordítottja: az őr a helyes kódot buktatta).
      Object.freeze({ paths: ['src/services/shadowProductService.js'],
        pattern: 'members: byShadow\\.get\\(',
        reason: 'a tag-sorok NEM mehetnek ki szűretlenül — a maskMembers feloldón kell átfolyniuk (KUKA-059)' }),
    ]),
    positive: Object.freeze([
      // D-VS-607: a kör MÁSODIK forrást kapott (élő közös ügy), mert két FÜGGETLEN cégnél tagság
      // soha nincs — a horgony ezért a bővített alakot rögzíti, nem a régi, szűk mondatot.
      Object.freeze({ paths: ['src/services/shadowVisibility.js'],
        pattern: "scope_source: 'membership\\+business'",
        reason: 'a látható kör a TAGSÁGBÓL és az ÉLŐ KÖZÖS ÜGYBŐL jön — nem beállításból, nem cégkód-mintából' }),
      Object.freeze({ paths: ['src/services/shadowVisibility.js'],
        pattern: 'function mayBindWith\\(',
        reason: 'a kötés-jog EGY nevezett feloldón dől el (minden ág azt hívja, a pin is — KUKA-039)' }),
      Object.freeze({ paths: ['src/services/shadowProductService.js'],
        pattern: 'visibility\\.maskMembers\\(',
        reason: 'a lista a KÖZÖS feloldón szűr (a pin ugyanazt hívja)' }),
      Object.freeze({ paths: ['src/email/emailService.js'],
        pattern: 'function ctxTenantCode\\(ctx\\) \\{ return ctx && ctx\\.tenantCode',
        reason: 'a tenant KÓDJA a saját nevén érkezik — egy név, egy jelentés' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-058',
    date: '2026-08-26',
    title: 'A HÍVÓ, AKI NEM ADTA MEG, AMIT A SZOLGÁLTATÁS KÉRT — néma jelszó-visszaállítás',
    what: 'A D-VS-558-ban megépült `requestPasswordReset` HÁROM dolgot kér: `email`, `tenant_id` és '
      + '`reset_base_url`. A route CSAK az e-mailt adta át. A szolgáltatás ezért MINDEN kérésre '
      + 'validációs hibát adott, a route `catch`-e ezt elnyelte, és a válasz — kifelé jogosan egyforma '
      + '(anti-enumeráció) — mindig azt mondta, hogy „elküldtük a levelet". Az elfelejtett jelszó '
      + 'funkció a kiadásától kezdve EGYETLEN levelet sem küldött ki, se a naplóba, se a képernyőre nem '
      + 'került egy szó sem róla.',
    why_wrong: 'a lánc MINDEN DARABJA ÉP VOLT — sablon · levél-sor · szolgáltatás · route · képernyő —, '
      + 'ezért minden forrás-olvasó őr zöldet mutatott (KUKA-038: a létezés nem bizonyíték). A hiba a '
      + 'HÍVÁS és a HÍVOTT VISZONYÁBAN élt (KUKA-024), és pont ott vált láthatatlanná, ahol a rendszer '
      + 'szándékosan hallgat: az anti-enumeráció kifelé egyforma választ ír elő, a mindent elnyelő '
      + '`catch` pedig BEFELÉ is elnémította (KUKA-020) — így a néma kudarcot a képernyő sikernek adta '
      + 'el (KUKA-012). Az anti-enumeráció a TÁMADÓ elől rejt, nem az ÜZEMELTETŐ elől.',
    replaced_by: 'NEVEZETT feloldó a route-ban (`requestPasswordResetFor`), ami a hiányzó bemeneteket '
      + 'maga szerzi meg — a cég a felhasználó ELSŐ aktív tagságából, a cím a `publicBaseUrl`-ből —, és '
      + 'minden kudarc-ágra SAJÁT NEVET ad (`user_not_found` · `no_membership` · '
      + '`public_base_url_missing` · `request_failed`). Kifelé a válasz TOVÁBBRA IS egyforma; befelé a '
      + 'valódi ok naplóba kerül (az e-mail cím nélkül — az is adat). A levél a meghívó útján megy: '
      + 'levél-sor → levél-tervező → háttér-munkás → SMTP.',
    decision: 'D-VS-573',
    found_by: 'Claude-DEV — az operátor parancsára („elfelejtett jelszó, jelszó módosítás, mehet a '
      + 'kétfaktor") indult MÉRÉSKOR bukott ki, nem tervezéskor: a lánc végigfuttatása valódi '
      + 'adatbázison és valódi SMTP-n azonnal megmutatta, hogy egyetlen levél sem indul el.',
    lesson: 'AHOL A VÁLASZ SZÁNDÉKOSAN EGYFORMA, OTT A NAPLÓNAK KELL BESZÉLNIE — a kifelé titkolt '
      + 'különbség nem jelenti, hogy befelé is titkolni kell; enélkül a funkció halála nem hagy nyomot '
      + 'sehol. És: ha egy szolgáltatás több bemenetet kér, mint amennyit a hívó tud, a hiányzó '
      + 'bemenetet a HÍVÓ oldalán, NEVEZETT feloldóban kell megszerezni — nem a `catch`-ben elnyelni. A '
      + 'forrás-olvasó pin ezt soha nem látja meg: az ilyen láncot ÉLŐBEN kell végigvinni.',
    guard_note: 'gépi jel: `npm run verify:account-selfservice` ASS02 (a route HÍVJA a feloldót, a '
      + 'feloldó MIND A HÁROM bemenetet átadja, és minden kudarc-ág NEVET kap) + '
      + '`npm run proof:account-selfservice-db-live` (A) ág — valódi Postgres + valódi SMTP: a levél '
      + 'megérkezik, a benne lévő hivatkozásból tényleg új jelszó lesz, és cím/tagság hiányában a '
      + 'rendszer MEGNEVEZI az okot.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/routes/auth.routes.js'],
        pattern: 'auth\\.requestPasswordReset\\(\\{ email \\}\\)',
        reason: 'a szolgáltatás tenant_id-t és reset_base_url-t is kér — enélkül minden kérés némán bukik (KUKA-058)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/routes/auth.routes.js'],
        pattern: 'async function requestPasswordResetFor\\(req, email\\)',
        reason: 'a hiányzó bemeneteket NEVEZETT feloldó szerzi meg, amit a pin is hívhat' }),
      Object.freeze({ paths: ['src/routes/auth.routes.js'],
        pattern: 'jelszó-visszaállító levél NEM indult el',
        reason: 'a kudarc BEFELÉ nevesítve marad, miközben kifelé a válasz egyforma' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-057',
    date: '2026-08-25',
    title: 'A KIZÁRÓ LISTA, AMIT A PIN BEFAGYASZTOTT — üzleti adat a böngésző lemezén, zöld battéria mellett',
    what: 'A PWA service worker (D-VS-240) KIZÁRÓ listával védte az üzleti adatot: `NEVER_CACHE = '
      + "['/system','/master','/process','/stock','/media','/ai','/dev']` — minden MÁS same-origin GET "
      + 'válasza a böngésző lemezére került. Mérve az ÉLŐ Express-fán: a rendszernek 25 API-előtagja és '
      + '416 útvonala van, ebből a lista 5-öt fedett — 20 előtag átment, közte a bizonylatok '
      + '(/processes), az értékesítés (/sales-orders), a tételek (/lots), a riportok (/reports), a '
      + 'fiók-utak (/user, /auth) és a MINDEN-CÉGES üzemeltetői út (/ops). A `/process` és a `/dev` '
      + 'bejegyzés ráadásul EGYETLEN élő mountnak sem felelt meg (a folyamat-út neve `/processes`). '
      + 'Böngészőben is mérve: a régi kódon a /health válasza tényleg bekerült a `vs-shell-v1` cache-be.',
    why_wrong: 'a védelem KÉZZEL VEZETETT FELSOROLÁS volt, tehát minden új mount némán kimaradt belőle — '
      + 'a nem fedett út nem „ismeretlen állapotú", hanem ZÖLDNEK LÁTSZOTT (KUKA-045/051). A pin pedig '
      + 'nem a viselkedést mérte, hanem a lista SZÖVEGÉT betűre egyeztette, ezért nem csak elmulasztotta '
      + 'a hibát: BE IS FAGYASZTOTTA — aki javította volna a listát, PIROSRA vitte volna a battériát '
      + '(KUKA-009 fordítottja: az őr a hibát védte). Következmény: üzleti adat (más cégé is) titkosítás '
      + 'nélkül a böngésző lemezén, kilépés és cégváltás után is, offline pedig ELAVULT lista jöhetett '
      + 'volna vissza — pont az, amit a fájl fejléce „strukturálisan lehetetlen"-nek mondott (KUKA-050).',
    replaced_by: 'MEGENGEDŐ szabály a kizáró lista helyett: `isShellAsset(pathname)` — csak a BUROK-LAP '
      + "(`/`, `/index.html`) és a statikus fájl-kiterjesztések (css/mjs/js/wasm/webmanifest/kép/betű) "
      + 'kerülhetnek cache-be, MINDEN MÁS élő. A cache neve `vs-shell-v2`, tehát az aktiválás a v1-be már '
      + 'beírt üzleti adatot ki is TAKARÍTJA a meglévő böngészőkből (KUKA-052). A cache kulcsa a '
      + 'lekérdező rész nélküli útvonal (`cacheKey`), így a redeploy ?v= jelölője nem hasítja szét a '
      + 'bejegyzéseket — mellékesen ez javítja az offline-tartalékot is, ami az eddigi kulcsolással '
      + 'minden újraindítás után elvétett.',
    decision: 'D-VS-569',
    found_by: 'Claude-Dev (Fable 5) — a 2026-08-21-i G-AUTH/tenant-izoláció felderítés (RF-019); a '
      + 'HATÓKÖRÉT (25-ből 20 előtag, 416 út) és a pin-befagyasztást a Claude-AUX mérte meg 2026-08-25-én.',
    lesson: 'AMIT VÉDÜNK, AZT MEGENGEDŐ SZABÁLLYAL VÉDJÜK, NEM KIZÁRÓ FELSOROLÁSSAL — a felsorolás a '
      + 'rendszer következő darabjáról nem tud, és a hiánya NÉMA. És a pin soha ne a védelem SZÖVEGÉT '
      + 'egyeztesse: HÍVJA a döntést (itt: `isShellAsset`), és a VISZONYT mérje az élő valósághoz (élő '
      + 'útvonal-lista ↔ cache-döntés), MINDKÉT irányban — különben a zöld battéria nem a védelmet '
      + 'igazolja, hanem a hibát őrzi.',
    guard_note: 'gépi jel: `npm run verify:scan-core` BSC10d–g — a pin a SW feloldóját HÍVJA (vm-ben), az '
      + 'alanyokat az ÉLŐ Express-fából veszi (416 út, padlóval), és mindkét irányt méri: egyetlen '
      + 'API-út sem cache-elhető, MINDEN burok-fájl felismert. Böngésző-próba: '
      + 'tests/e2e/service-worker-cache.spec.js — a valódi Cache Storage tartalmát olvassa (a régi kódon '
      + 'bizonyítottan piros: a /health válasza megjelent a cache-ben).',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['public/sw.js'],
        pattern: 'const NEVER_CACHE',
        reason: 'az üzleti adatot kizáró felsorolás nem védi — megengedő szabály kell (KUKA-057)' }),
      Object.freeze({ paths: ['tools/vs_verify_scan_core.mjs'],
        pattern: "NEVER_CACHE = \\\\\\['",
        reason: 'a pin nem egyeztetheti betűre a védelem szövegét — hívnia kell a döntést (KUKA-057)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['public/sw.js'],
        pattern: 'function isShellAsset\\(pathname\\)',
        reason: 'a cache-döntés NEVEZETT feloldóban áll, amit a pin és a böngésző-próba is hívhat' }),
      Object.freeze({ paths: ['public/sw.js'],
        pattern: "const CACHE = 'vs-shell-v2'",
        reason: 'a verzió-lépés kitakarítja a régi cache-be már beírt üzleti adatot' }),
      Object.freeze({ paths: ['tools/vs_verify_scan_core.mjs'],
        pattern: 'BSC10e egyetlen ÉLŐ API-útvonal SEM kerül gyorsítótárba',
        reason: 'a pin a VISZONYT méri: élő útvonal-lista ↔ a SW saját döntése' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-055',
    date: '2026-08-25',
    title: 'A KÖZÖS GÉPEZET MELLÉ ÉPÍTETT KISTESTVÉR — saját szűrő-sáv + kereső + lapozó a közös rács fölött',
    what: 'Az őrjárat közös hiba-listája (D-VS-559) a KÖZÖS rácsot (listgrid) használta, de köré SAJÁT '
      + 'vezérlők épültek: kézi mérés/állapot-legördülő, saját kereső-mező, saját lapozó, saját plafon-'
      + 'felirat — és a lista KÜLÖN menüpontként, külön képernyőn élt. Az operátor első ránézésre kimondta: '
      + '„ez így még messze nem az, mint amire én gondoltam … egy oldal … a tételek egy 100%-ban olyan '
      + 'lista táblázat, mint ami a termékek, partnere stb oldalon van. css-ben mindenben" — vagyis az '
      + 'oszlop-kártyák, a rendezés/csoportosítás sor és a kijelölő + kereső + lapozó + exportáló blokk '
      + 'is a KÖZÖS gépezetből kell.',
    why_wrong: 'a rács közössége nem elég: a KÖRÜLÖTTE álló vezérlő-készlet külön másolatként épült — a '
      + 'közös gépezet kistestvére (a KUKA-003 osztálya felület-szinten). A kistestvér mindig kevesebbet '
      + 'tud (nincs oszlop-kártya, nincs csoportosítás, nincs export, nincs mentett nézet), másképp néz '
      + 'ki, és külön kell karbantartani. RÁADÁSUL a lecke MÁR MEG VOLT ÍRVA: a beállítás-fülek első '
      + 'alakja (D-VS-484) pontosan ugyanígy bukott el („a rendezés + csoportosítás sor / a kijelölő + '
      + 'kereső + lapozó + exportáló nincs ott"), és a javítása — a teljes közös eszköztár beágyazva — '
      + 'készen állt a settings-surface-tab modulban. Nem alkalmaztam a meglévő mintát.',
    replaced_by: 'EGY oldal: az Őrjárat rács alatt UGYANOTT a közös tétel-lista, a settings-surface-tab '
      + 'beágyazó gépezetén (oszlop-kártyák · rendezés · kijelölő-kereső-lapozó-export · közös rács), az '
      + 'adat pedig a KÖZÖS lekérdező úton (/master/query/patrol-items — a futás tétel-pillanatképe, '
      + 'migration_973). A fejléc-kattintás a lista OSZLOP-SZŰRŐJÉT állítja (setFilters), nem külön '
      + 'képernyőre visz. A saját sáv/lapozó/plafon kulcsostól-CSS-estől kivezetve.',
    decision: 'D-VS-561',
    found_by: 'az operátor, az első képernyő-ránézésre (2026-08-25): „menjünk sorba, mert ez így még '
      + 'messze nem az, mint amire én gondoltam. az őrjárat és az őrjárat tételeket ne bontsuk ketté!!"',
    lesson: 'HA EGY KÉPERNYŐ LISTÁT MUTAT, A LISTA A TELJES KÖZÖS GÉPEZET — nem a közös rács egy kézi '
      + 'kerettel. Beágyazott listához a D-VS-484 fül-mintája (settings-surface-tab) a kötelező út; új '
      + 'vezérlő-sáv írása a rács köré a kivezetett minta. És ha egy leckét egyszer már megtanultunk '
      + '(D-VS-484), az új felületen ELŐBB azt kell megkeresni, nem újra elbukni ugyanazt (a KUKA-039 '
      + '„testvér-ág" elve a felület-mintákra).',
    guard_note: 'gépi jel: `npm run verify:patrol` PTR15 — a tétel-modul a settings-surface-tab-ot hívja, '
      + 'saját rácsot/sávot nem épít (tiltó-minta a vs-patrol-itemsbar-ra), a felület nav_hidden lista, '
      + 'az inline sor-gomb lánca pedig a VALÓDI feloldóval van összeszerelve és rajzoltatva.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['public/js/patrol-items.mjs'],
        pattern: 'vs-patrol-itemsbar',
        reason: 'a közös gépezet melletti saját szűrő-sáv a kivezetett kistestvér (KUKA-055)' }),
      Object.freeze({ paths: ['public/js/patrol-items.mjs'],
        pattern: "from './listgrid.mjs'",
        reason: 'a tétel-modul nem rajzol saját rácsot — a beágyazó fül-gépezet rajzol (KUKA-055)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['public/js/patrol-items.mjs'],
        pattern: "renderSettingsSurfaceTab\\(host, 'admin\\.patrol\\.items'",
        reason: 'a beágyazott lista a D-VS-484 fül-mintáján áll — a közös gépezet teljes eszköztárával' }),
      Object.freeze({ paths: ['public/js/patrol-items.mjs'],
        pattern: 'AZ ELSŐ ALAK TANULSÁGA \\(KUKA-055\\)',
        reason: 'a csapda ki van mondva ott, ahol a következő kör visszaírná' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-054',
    date: '2026-08-24',
    title: 'A KÖRKÖRÖS MÉRÉS — a mintát az a tulajdonság választotta ki, amit mérni akartunk',
    what: 'Az operátor megkérdezte, MIÉRT hiányzik 92 cég a valach-land törzséből. A válaszra mérés '
      + 'készült (`--why`): a KS 53 oszlopát összeveti a MEGLÉVŐK és a HIÁNYZÓK sorain, és kiírja, ami '
      + 'elválik. Az első éles futás azt adta, hogy a meglévők **86%-a SZÁLLÍTÓ**, a hiányzók 80%-a vevő '
      + '— ami a valóság FORDÍTOTTJA (a valach-land törzse túlnyomórészt vevőkből áll). Az ok: a mérés '
      + 'alanya a `toUpdate` lista volt, amiben CSAK az áll, akinél tennivaló vagy ELTÉRÉS van — a '
      + 'típus-eltérés pedig pontosan azt jelenti, hogy a KS szállítónak mondja. A 118 egyeztetett '
      + 'partnerből így 36 lett a „meglévők" mintája, és épp az a 36, amelyiket a mért tulajdonság '
      + 'választotta ki.',
    why_wrong: 'a minta nem független a mért tulajdonságtól, tehát a mérés a SAJÁT KIVÁLASZTÁSÁT '
      + 'igazolta vissza — magabiztos, számokkal alátámasztott, és fordítva igaz állítás. Ez rosszabb a '
      + 'hiányzó mérésnél: a puszta tipp legalább tippnek látszik, egy százalékos tábla viszont '
      + 'bizonyítéknak. És épp arra a kérdésre adott hamis választ, amit az operátor azért tett fel, '
      + 'mert a saját levezetésemben (KUKA-033) nem akart megbízni.',
    replaced_by: 'a mérés alanya MINDEN egyeztetett terv (`matched`), a „van tennivaló" szűkítés nélkül. '
      + 'A `matched` a találati ágon, FELTÉTEL NÉLKÜL töltődik, és a `--why` ezt olvassa — a szűkített '
      + 'lista (`toUpdate`) csak a MUNKA felsorolására való, mérés alanyának soha.',
    decision: 'D-VS-548',
    found_by: 'a mérés SAJÁT éles kimenete az operátor gépén: a „meglévőknél 86% szállító" sor '
      + 'szembement azzal, amit ugyanaz a lap három sorral feljebb mutatott (a törzs vevő-túlsúlya).',
    lesson: 'MINDEN MÉRÉS ELŐTT KI KELL MONDANI, MI VÁLASZTOTTA KI A MINTÁT. Ha a kiválasztás '
      + 'szempontja bármilyen módon összefügg a mért tulajdonsággal, az eredmény önmagát igazolja: a '
      + 'két csoport különbsége nem lelet, hanem a szűrő lenyomata. Gyanújel, ha egy mérés a szemmel '
      + 'látható valóság FORDÍTOTTJÁT adja — olyankor ELŐSZÖR a mintát nézzük meg, ne a magyarázatot '
      + 'keressük hozzá. (A KUKA-049 „a jel a mechanizmust mérje" elve a MINTAVÉTELRE alkalmazva.)',
    guard_note: 'gépi jel: `npm run verify:partner-import` PIM15 — a pin méri, hogy az alany a `matched` '
      + 'és NEM a `toUpdate`, hogy a `matched` feltétel nélkül töltődik, és HÍVJA a `columnSeparation`-t '
      + 'egy olyan párral, ahol a szűkített minta épp a hamis leletet adná (90% ↔ 0%).',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['tools/vs_import_partners.mjs'],
        pattern: 'const inRows = toUpdate\\.',
        reason: 'a mérés alanya nem lehet a mért tulajdonság szerint szűrt lista (KUKA-054)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_import_partners.mjs'],
        pattern: 'p\\.match = match; p\\.how = how; matched\\.push\\(p\\);',
        reason: 'a mérés alanya feltétel nélkül gyűlik — nem a munka-lista mellékterméke' }),
      Object.freeze({ paths: ['tools/vs_import_partners.mjs'],
        pattern: 'A KÖRKÖRÖS MÉRÉS CSAPDÁJA',
        reason: 'a csapda ki van mondva ott, ahol a következő kör visszaírná' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-053',
    date: '2026-08-24',
    title: 'A KÖZÖS FORRÁS EGY CÉG LISTÁJAKÉNT OLVASVA — „itt nincs meg" ⇒ „új partner"',
    what: 'A KS ügyfél-átvétel a cél-cég partnereivel egyeztet (KS-kód → adószám → név), és amire ott '
      + 'nincs találat, azt ÚJ partnernek mondja. A KS viszont EGY rendszer volt: a 218 soros ügyfél-lista '
      + 'a CSALÁD MINDEN cégének partnerét hordozza (valach-land · valach-sandorne · sipi-es-tarsa, sőt a '
      + 'hajtás/lánc-kereskedelem ügyfelei is), a VS pedig CÉGENKÉNT külön törzset vezet. Az operátor első '
      + 'teljes tervfutásán ezért 92 „ÚJ PARTNER" jött ki a valach-land alá — köztük nyolc olyan, amelyik a '
      + 'sipi-es-tarsa törzsében MÁR OTT VOLT (HFI Kft. · Chili Produkt · VIM-PER · Répási Tiborné · Répási '
      + 'Balázs · Nagyasszonyunk Katolikus Óvoda · Salai Ferenc · Tóth Endre Mátyás), és maga a „Sipi és '
      + 'Társa Kft." is. Egy `--apply` ezekből DUPLIKÁTUMOT csinált volna a rossz cég alatt.',
    why_wrong: 'a hiány nem bizonyíték a nemlétezésre (KUKA-010 alakja a törzs-térben). Az egyeztetés '
      + 'hatóköre a CÉL-cég volt, a forrásé viszont a CSALÁD — két különböző hatókör, és a szűkebbik '
      + 'hiányából a tágabbra következtetni érvénytelen lépés. A gép ráadásul némán DÖNTÖTT egy olyan '
      + 'kérdésben (melyik céghez tartozik ez az ügyfél?), amire csak az operátor tud válaszolni.',
    replaced_by: 'MÁSODIK, FÜGGETLEN TANÚ a felvétel előtt: a többi cég törzse (`foundElsewhere` — '
      + 'adószám az erős, név a gyenge tanú, és a gyengeséget a felsorolás KIMONDJA). Aki máshol már '
      + 'megvan, alapból NEM jön létre, hanem NEVESÍTETT listára kerül azzal, hogy HOL van meg és milyen '
      + 'tanúval; a felvételt az operátor mondhatja ki (`--cross-tenant`), mert van jogos eset — egy cég '
      + 'két tenant partnere is lehet. Gép ilyet nem dönt el (KUKA-027 tükre a törzs-átvételben).',
    decision: 'D-VS-542',
    found_by: 'az OPERÁTOR, a terv-futás visszaolvasásából (2026-08-24): „szerintem az új partnerek azok '
      + 'nem új partnerek. csak a KS-ben még egy helyen volt a valach land, a vsné, a sipi és még a láncos '
      + 'dolgok is. gondolom azok a partnerek maradtam a vs valach-land tenantos részében, akik azokban a '
      + 'folyamatokban érintettek, amelyek a valach-land tenant alatt vannak."',
    lesson: 'HA A FORRÁS KÖZÖS, A CÉL VISZONT SZÉTOSZTOTT, AKKOR A „NINCS ITT" NEM JELENTI, HOGY „NINCS". '
      + 'Minden átvevő eszköznél ki kell mondani, MI A FORRÁS HATÓKÖRE és mi a CÉLÉ — ha a kettő nem '
      + 'ugyanaz, a különbség NEM lehet néma következtetés. És ahol a gép a hatókör-kérdésre nem tud '
      + 'felelni (melyik céghez tartozik ez a sor?), ott nem dönt: nevesített listára teszi, és az '
      + 'operátor mondja ki — a duplikátum drágább, mint a kimaradt sor.',
    guard_note: 'gépi jel: `npm run verify:partner-import` PIM11 — a pin méri, hogy a betöltő a MÁSIK cég '
      + 'törzsét is megkérdezi (`tenant_id <> $1`), hogy a találat alapból VISSZATART (nem hoz létre), és '
      + 'hogy a képernyő megnevezi, HOL van már meg és MILYEN tanúval. Próbapadon két cégen végigmérve: '
      + 'adószámos és csak-neves egyezés visszatartva, a valóban új felvéve, `--cross-tenant` kinyitja.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['tools/vs_import_partners.mjs'],
        pattern: 'if \\(!match\\) \\{\\s*\\n\\s*p\\.newCode = proposeCode',
        reason: 'egyezés hiányából nem lehet közvetlenül felvételre ugrani — előbb a többi cég törzse (KUKA-053)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_import_partners.mjs'],
        pattern: 'const foundElsewhere',
        reason: 'a második tanú NEVEZETT feloldó — hívható és mérhető (KUKA-009)' }),
      Object.freeze({ paths: ['tools/vs_import_partners.mjs'],
        pattern: 'MÁS CÉGNÉL MÁR MEGVAN',
        reason: 'a visszatartás a KÉPERNYŐN áll, névvel és hellyel — nincs néma kihagyás (KUKA-012)' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-001',
    date: '2026-07-30',
    title: 'A blog a BOLT fogalmából levezetve (api_connection_mapping)',
    what: 'A „blog" (tartalom-gyűjtő) nem saját törzs volt, hanem az api_connection_mapping tábla '
      + "'content_list' fajtájú sora — vagyis a bolt-kapcsolat egy megfeleltetése.",
    why_wrong: 'A tartalom LÉTEZÉSE függött egy külső kapcsolattól: API kapcsolat nélkül nem lehetett '
      + 'blogot vagy bejegyzést létrehozni. Sima weboldalra vagy saját vshop-ra szánt tartalom így '
      + 'egyáltalán nem volt felvehető. A VS minden más törzse (termék, partner, raktár) fordítva '
      + 'működik: a rekord a VS-ben él, a csatorna csak CÉL.',
    replaced_by: 'content_list VS-törzs (migration_930) + content_list_channel OPCIONÁLIS kötés.',
    decision: 'D-VS-285',
    found_by: 'operátor (éles felület-teszt)',
    lesson: 'Ha egy VS-entitást KÜLSŐ rendszer fogalmából vezetek le, a külső rendszer hiánya letiltja a '
      + 'saját munkánkat. Sorrend mindig: VS-törzs előbb, megfeleltetés utána.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/content/contentListService.js'], pattern: '(FROM|INTO|JOIN|UPDATE)\\s+api_connection',
        reason: 'a blog-törzs nem nyúlhat a kapcsolat-táblákhoz' }),
      Object.freeze({ paths: ['src/content/contentReadService.js'], pattern: "mapping_kind\\s*=\\s*'content_list'",
        reason: 'a blogok többé nem a megfeleltetésekből olvasódnak' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/content/contentReadService.js'], pattern: 'FROM content_list l',
        reason: 'a blogok a VS-törzsből jönnek' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-002',
    date: '2026-07-29',
    title: 'A sor SZEREPE az IRÁNY oszlopon (direction = charge/service/info)',
    what: "A process_line.direction ugyanazokat az értékeket vehette fel, mint a szerep: 'service', "
      + "'charge', 'info' — miközben a szerep MÁR külön oszlopban élt (line_role).",
    why_wrong: 'Egy ráfordítás-sorról nem lehetett megmondani, hogy TERMELT vagy FOGYASZTOTT dologról '
      + 'van szó. A felszabaduló raklap (csomagolóanyag, de KIMENET) és a visszanyert hő (ráfordítás, '
      + 'de KIMENET) egyszerűen kimondhatatlan volt. Az érték-modell első szabálya sérült: az irány '
      + 'EXPLICIT, sosem következtetett.',
    replaced_by: "direction ∈ ('input','output') mindenütt, egy szótárból; a fajta a line_role-on (929).",
    decision: 'D-VS-268',
    found_by: 'Claude-VS-Aux (motor-őr lelet) + operátori ellenpéldák',
    lesson: 'Két független dolgot soha ne engedjünk ugyanarra az oszlopra. Ha már van külön oszlop a '
      + 'szerepnek, az irány-oszlopot vissza kell szűkíteni — különben a régi értékek visszaszivárognak.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/'], pattern: "direction:\\s*['\"](service|charge|info)['\"]",
        reason: 'szerep-érték iránynak írva' }),
      // 2026-08-01 (D-VS-327, aux-lelet): az OSZTÁLY-jel — kombináció-érték ('both') DB-be írása.
      // A 'both' drót-címkének legitim (syncDirection fordítja) — de alapértékként a DB-be írni tilos.
      Object.freeze({ paths: ['src/content/', 'src/sync/'], pattern: "COALESCE\\(\\$\\d+,\\s*'both'\\)",
        reason: 'kombináció-irány DB-alapértékként — az irány KÉT tény (push_enabled · pull_enabled)' }),
      Object.freeze({ paths: ['src/process/processLineModel.js'], pattern: "LINE_DIRECTIONS = Object\\.freeze\\(\\[[^\\]]*'(service|charge|info)'",
        reason: 'a felhígított IRÁNY-szótár (a LINE_ROLES-ban ugyanezek az értékek LEGITIMEK — a szerep tengelyén)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/process/processLineModel.js'], pattern: "LINE_DIRECTIONS = Object\\.freeze\\(\\['input', 'output'\\]\\)",
        reason: 'a szűkített szótár' }),
      Object.freeze({ paths: ['src/content/syncDirection.js'], pattern: 'two_independent_facts',
        reason: 'a kotes iranya KET teny — a fordito egy helyen el (D-VS-327)' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-003',
    date: '2026-07-29',
    title: 'Három külön átalakító stratégia (production · disassembly · processing)',
    what: 'A folyamat-motorban három átalakító típus-stratégia élt egymás mellett — mezőről mezőre '
      + 'AZONOS tartalommal (csak a hibaüzenet előtagja tért el).',
    why_wrong: 'Nulla megkülönböztető erő, háromszoros karbantartás: minden motor-változtatást három '
      + 'helyen kellett átvezetni, és a három könnyen elcsúszhatott egymástól. A megkülönböztetés amúgy '
      + 'is MEGJELENÍTÉS-szintű (a sor-alakból derivált címke), nem tárolt típus.',
    replaced_by: "EGY aktív típus: 'processing'. A production/disassembly fagyasztott ALIAS — a régi "
      + 'sorok renderelnek/módosíthatók/fordíthatók, de ÚJ folyamat nem indul rajtuk (kapu: createDraft).',
    decision: 'D-VS-268',
    found_by: 'Claude-VS-Aux (motor-őr lelet)',
    lesson: 'Ha két „különböző" dolog kódja mezőről mezőre azonos, akkor nem két dolog. A különbség '
      + 'helye a megjelenítés, nem a típus-vokabulárium.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/masterData/productRecipeResolver.js'], pattern: "production: 'production'",
        reason: 'a recept-híd újra külön folyamat-típust indítana' }),
      Object.freeze({ paths: ['public/js/process-create.mjs'], pattern: "gyartas: 'production'",
        reason: 'a UI-belépő újra külön típust indítana' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/services/processService.js'], pattern: 'process_type_deprecated',
        reason: 'a születési kapu' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-004',
    date: '2026-07-30',
    title: 'Doktrína-magyarázat mint „őr" a felhasználói felületen',
    what: 'A „másik oldal" blokk alá egy jegyzet került: „a főkönyv egy-oldalú, ez nem könyvelt adat" — '
      + 'ez volt hivatott jelezni, hogy a nézet szintetikus.',
    why_wrong: 'A felhasználónak a belső doktrínáról nem kell tudnia, és a szöveg NEM őr: senki nem '
      + 'futtatja, semmit nem akadályoz meg. A valódi garancia (a blokk nem ír) a szerveren van — a '
      + 'jegyzet csak zajt adott a képernyőn, cserébe azt a hamis érzetet keltve, hogy „meg van oldva".',
    replaced_by: 'A felület ugyanazt a Bemenő/Kimenő sor-képet adja, mint bármely folyamat; a nem-'
      + 'könyveltség őre a szerveren + verifierben él.',
    decision: 'D-VS-269',
    found_by: 'operátor',
    lesson: 'A magyarázó szöveg nem őr. Az őrt kódban kell tartani — a felület maradjon egyszerű.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['public/js/process-other-side.mjs'], pattern: 'otherSideNote',
        reason: 'a doktrína-jegyzet visszakerült a képernyőre' }),
    ]),
    positive: Object.freeze([]),
  }),

  Object.freeze({
    id: 'KUKA-005',
    date: '2026-07-28',
    title: 'stock_balance.current_qty — nem létező oszlopra írt lekérdezés',
    what: 'A család-építő eszköz a készlet-egyenleget `b.current_qty` néven kérdezte a stock_balance '
      + 'táblától, ahol az oszlop neve `quantity` (migration_006).',
    why_wrong: 'Emlékezetből írt oszlopnév séma-ellenőrzés nélkül. Élesben bukott el (teljes rollback), '
      + 'operátori időt vitt el — a séma a repóban van, meg lehetett volna nézni.',
    replaced_by: '`b.quantity` + az az elv, hogy DB-oszlopnevet mindig a migrációból igazolunk.',
    decision: 'D-VS-266 (család-kör)',
    found_by: 'operátor (éles dry-run)',
    lesson: 'Oszlopnevet soha ne emlékezetből. A séma nyitva van — a találgatás az operátor idejét viszi.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['tools/', 'src/'], pattern: '\\bb\\.current_qty\\b',
        reason: 'a stock_balance oszlopa quantity, nem current_qty (a lot.current_qty MÁS, az létezik)' }),
    ]),
    positive: Object.freeze([]),
  }),

  Object.freeze({
    id: 'KUKA-006',
    date: '2026-07-29',
    title: 'Szerver-titok NEVE a kliens-kódban (segéd-szövegként)',
    what: 'Az API-kapcsolat panel kulcs-mezőjének placeholder-szövege konkrét szerver-változó NEVET '
      + 'tartalmazott példaként.',
    why_wrong: 'A kliensbe szállított kód a titok-leltár NEVEIT szivárogtatta — a CSG kliens-kitettség-'
      + 'őre jogosan fogta. A név önmagában nem titok, de támadási felületet ad (mit érdemes keresni).',
    replaced_by: 'Általános segéd-szöveg („a szerver-változó NEVE, NAGYBETŰS_ALAK"); a valódi neveket '
      + 'csak a szerver ismeri.',
    decision: 'D-VS-267 (T3/2 kör)',
    found_by: 'a saját CSG-őr (söprés)',
    lesson: 'Példa-szövegbe soha ne kerüljön valódi szerver-változó név. Az őr azért van, hogy fogja.',
    guard_note: 'A gépi őr NEM itt van, hanem a CSG kliens-kitettség-ellenőrzésében '
      + '(npm run verify:config-secret-governance) — ez a bejegyzés oda mutat.',
    forbidden: Object.freeze([]),
    positive: Object.freeze([]),
  }),

  Object.freeze({
    id: 'KUKA-007',
    date: '2026-07-30',
    title: '`cd ~/vs` — az operátor környezetének TIPPELÉSE',
    what: 'A terminál-blokkok „cd ~/vs" sorral kezdődtek, holtott az operátor repója '
      + '/Users/valachzsolt/Documents/CREATOR/DESIGN + WEB/vfamily/00_Admin/vs alatt van — szóközzel és '
      + '+ jellel a névben, tehát IDÉZŐJEL nélkül a cd sor el is hasal.',
    why_wrong: 'Az operátor legalább 50-szer leírta a valódi utat, és a blokk mégis egy kitalált rövidítést '
      + 'tartalmazott. Egy nem működő első sor az EGÉSZ blokkot használhatatlanná teszi — és a hibát az '
      + 'operátornak kell észrevennie, ami pontosan az ő idejét viszi el.',
    replaced_by: 'A KANONIKUS, idézőjeles út a CLAUDE.md-ben (auto-betöltött memória) + ez a gépi őr.',
    decision: 'D-VS-287',
    found_by: 'operátor („kapásból már nem emlékszel arra, hogy legalább 50x leírtam már")',
    lesson: 'Az operátor környezetét (út, gép, verzió) SOHA nem tippelem — amit megadott, az az igazság, '
      + 'és a memóriába kell kerülnie, nem a fejembe.',
    forbidden: Object.freeze([
      // SOR-KEZDETHEZ kötve: a KUKA-táblázat SORÁBAN idézve szerepel a rossz minta (az a leírás, nem
      // használat) — csak egy VALÓDI parancs-sor a találat. (Ezt is a verifier fogta meg saját magán.)
      // A V3 REPÓBAN ÚJRA CÉLOZVA (D-VS-3000), és ez KIMONDVA, nem csendben: a V2-beli alak egyetlen
      // literált tiltott (`cd ~/vs`), a mai alak MINDEN tippelt rövidítést (`cd ~/…`) — megengedő
      // szabály kizáró felsorolás helyett (KUKA-057). A tanulság változatlan: az operátor útja
      // adott és idézőjeles, a környezetét nem tippeljük.
      Object.freeze({ paths: ['CLAUDE.md'], pattern: '^cd ~/', flags: 'm',
        reason: 'a kanonikus blokkban tippelt, rövidített út (az operátor útja szóközös, idézőjellel)' }),
    ]),
    positive: Object.freeze([
      // A pozitív jel a MAI repó útjára mutat — ugyanaz a követelmény (szóköz + `+` + idézőjel),
      // csak az utolsó szegmens más, mert a repó neve más. A jel NEM lett gyengébb.
      Object.freeze({ paths: ['CLAUDE.md'], pattern: 'DESIGN \\+ WEB/vfamily/00_Admin/valach-system',
        reason: 'a VALÓDI út, idézőjelben' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-008',
    date: '2026-07-30',
    title: 'A saját cég KÉSZLET-TULAJDONOSKÉNT (owner_partner_id → internal partner)',
    what: 'A készlet-tulajdonos oszlopban néhány soron a saját cég partner-rekordja (partner_type='
      + "'internal') állt, miközben a D-VS-220 konvenció szerint a saját készlet tulajdonosa ÜRES "
      + '(owner_partner_id = NULL). A KS-betöltő a KS-export tulajdonos-oszlopát hűségesen leképezte '
      + 'partnerre — a saját cég nevénél is.',
    why_wrong: 'UGYANANNAK a dolognak KÉT ÁBRÁZOLÁSA keletkezett: „üres tulajdonos" és „saját cég '
      + 'partnerként". A készlet-pozíció ettől kettéesik: ha a bevét az egyik fiókba, a kiadás a '
      + 'másikból ment, az egyik oldal MÍNUSZBA fordul, miközben egyetlen kiló sem hiányzik. A '
      + 'készletlista így HAMISAT mutat, és az operátor jogosan kérdezi, miért nem egyezik a KS-sel.',
    replaced_by: 'A D-VS-220 EGYETLEN konvenciója (owner_partner_id = NULL = saját) + `tools/'
      + 'vs_fix_self_owner.mjs`: katalógus-vezérelt őr ÉS javító, ami a saját céget minden '
      + 'tulajdonos-oszlopból üresre állítja, mennyiség-őrrel és visszaállítással.',
    decision: 'D-VS-220 (a konvenció) · a javító a 2026-07-30-i KS-múlt-kör',
    found_by: 'operátor („Ne legyen már kétféle valachland!!! … Ezt a mi magunkat nem dobtuk még ki?")',
    lesson: 'A FELÜLETI TILTÁS NEM ŐR. Hiába nem választható valami az űrlapon: az importer, a script '
      + 'és a migráció nem a felületen keresztül ír. Ha egy fogalomnak EGY ábrázolása van, azt az '
      + 'ÍRÁS-úton és gépi ellenőrzéssel kell kikényszeríteni — különben az adatban megkettőződik.',
    guard_note: 'A teljes őr ÉLŐ DB-t igényel (a séma-mintázat nem árulja el, mi van az adatban): '
      + '`node tools/vs_fix_self_owner.mjs` szabálysértő sor nélkül fut le tisztán. A forrás-oldali '
      + 'jelek csak azt kötik ki, hogy maga a javító a helyes konvenciót képviselje. '
      + '2026-08-19 (D-VS-454/455) VISSZATÉRÉS OLVASÓ-OLDALON: a tenant cégét ki lehetett választani '
      + 'tulajdonos-szűrőnek, és onnantól minden riport üres lett (20 F-221/7 egyszerre), mert a szűrő '
      + 'olyan azonosítót keresett, ami a saját sorokon soha nem áll. A JAVÍTÁS NEM a választó szűkítése '
      + '(az operátor kimondta: a legördülő cégeket soroljon fel, a tenant cégével együtt) — hanem a '
      + 'FORDÍTÁS: a cég azonosítója szűrőként üres tulajdonosra fordul (ownerScopeFor). Gépi jel: '
      + '`npm run verify:owner-scope` (OWN03 a választót HÍVJA, OWN04 a fordítást méri).',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_fix_self_owner.mjs'], pattern: "partner_type = 'internal'",
        reason: 'a javító a saját céget a partner-típusból ismeri fel (D-VS-220), nem névből' }),
      Object.freeze({ paths: ['tools/vs_fix_self_owner.mjs'], pattern: 'owner_partner_id = NULL',
        reason: 'az EGYETLEN helyes ábrázolás: a saját készlet tulajdonosa üres' }),
      // D-VS-454: az OLVASÓ oldal is kap jelet — a tulajdonos-választó nem kínálhatja a saját céget,
      // és a hatókör-szótár a „saját" kérdést IS NULL-ra fordítja (nem azonosítóra).
      Object.freeze({ paths: ['public/js/owner-select.mjs'], pattern: 'is_self === true',
        reason: 'a tenant cégét NÉVVEL, elöl kell listázni — a tárolási üresség a gép dolga, nem a felhasználóé' }),
      Object.freeze({ paths: ['src/services/ownerScope.js'], pattern: 'IS NULL',
        reason: 'a „saját készlet" kérdés IS NULL-ra fordul — egy helyen, minden olvasónak' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-009',
    date: '2026-07-31',
    title: 'Az ŐR SZÖVEGÉT olvasó pin (a rendezés benne volt, de az író máshol ment)',
    what: 'A lot-kód újraszinkronban az ELŐTAG-VÉDELEM így nézett ki: `plan.sort((a,b) => '
      + 'b.lot_code.length - a.lot_code.length)` — majd az író ciklus egy MÁSIK, cégre/termékre '
      + 'rendezett MÁSOLATON ment végig (`plan.slice().sort(...)`). A rendezés tehát lefutott, de '
      + 'a hatása eldobódott. A verifier pedig pontosan ennek a sornak a SZÖVEGÉT kereste, és '
      + 'zöldet adott rá.',
    why_wrong: 'A csere `strpos`/`replace` alapú, ezért ha az egyik kód a másik ELŐTAGJA '
      + '(`VS-046-20251208-0` ⊂ `VS-046-20251208-01`), a rövidebbet előbb cserélve a hosszabbat '
      + 'tartalmazó sorok is elcsorbulnak. A védelem éppen ezért volt ott — csak nem hatott. '
      + 'Súlyosabb, hogy a PIN ezt HITELESÍTETTE: a zöld battéria azt állította, hogy védve '
      + 'vagyunk, miközben nem voltunk.',
    replaced_by: '`src/lotcode/lotCodeSweep.js` → `sortForRewrite(plan)`: EGY rendezés, amin az '
      + 'ÍRÁS halad; a KIÍRÁS sorrendje ettől külön, olvasható rendben megy. A pin pedig HÍVJA a '
      + 'függvényt egy előtag-párral, és a kijövő sorrendet méri.',
    decision: 'a 2026-07-31-i lot-előtag kör (a harmadik hívó írásakor derült ki)',
    found_by: 'ügynök — a próbapadi bizonyítás közben (a felszínen a futás helyesnek látszott)',
    lesson: 'A PIN NE A SZÖVEGET OLVASSA, HANEM A VISELKEDÉST MÉRJE. Egy őr jelenléte nem azonos '
      + 'azzal, hogy hat: ha a védett műveletet máshol végezzük, az őr csak dísz. Ahol a logika '
      + 'kiemelhető függvénybe, ott a verifier HÍVJA — a szöveg-egyezés csak ott elég, ahol nincs '
      + 'mit meghívni. (KUKA-004 rokona: ott a magyarázó szöveg nem volt őr, itt a hatástalan kód '
      + 'nem volt őr.)',
    guard_note: '`npm run verify:lot-code-sweep` LCS06: meghívja a `sortForRewrite`-ot egy '
      + 'előtag-párral, és megköveteli, hogy a HOSSZABB kód jöjjön előbb. A hívók oldalán a '
      + 'lot-code-resync/lot-reprefix verifier azt köti ki, hogy a rendezésnek NEVE legyen '
      + '(`const toWrite = sweep.sortForRewrite(...)`), hogy az ÍRÓ CIKLUS AZT a nevet fogyassza '
      + '(`for (const p of toWrite)`), és hogy a kettő KÖZÖTT senki ne rendezze át — mert pontosan '
      + 'ez a rés nyelte el egyszer a védelmet.',
    forbidden: Object.freeze([
      Object.freeze({
        paths: ['tools/vs_resync_lot_codes.mjs', 'tools/vs_reprefix_lot_codes.mjs'],
        // A ciklus NE közvetlenül egy átrendezett másolaton menjen: a rendezésnek NEVE legyen, hogy
        // látszódjon, kiíráshoz vagy íráshoz szól. Pontosan ez a névtelenség rejtette el a hibát.
        pattern: 'for \\(const \\w+ of \\w+\\.slice\\(\\)\\.sort',
        reason: 'névtelen, átrendezett másolaton futó ciklus — ez dobta el az előtag-védelmet; '
          + 'a rendezés kapjon nevet (forDisplay / sortForRewrite)',
      }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/lotcode/lotCodeSweep.js'], pattern: 'function sortForRewrite',
        reason: 'EGY rendezés, amin az írás halad — és amit a verifier meghívhat' }),
      Object.freeze({ paths: ['tools/vs_resync_lot_codes.mjs', 'tools/vs_reprefix_lot_codes.mjs'],
        // A LÉNYEG: az író ciklus a KÖZÖS rendezésen halad. Hogy a terv szűrve megy-e bele (pl. az
        // akadályos sorok kihagyása), az a hívó dolga — a védelem attól még hat.
        pattern: 'const toWrite = sweep\\.sortForRewrite\\(',
        reason: 'a védett rendezésnek NEVE van — a névtelenség rejtette el a hibát' }),
      Object.freeze({ paths: ['tools/vs_resync_lot_codes.mjs', 'tools/vs_reprefix_lot_codes.mjs'],
        // A név önmagában kevés: a ciklusnak AZT a nevet kell fogyasztania. A kettő közötti
        // átrendezés hiányát a két eszköz saját verifiere méri (LCR04 / LRP05).
        pattern: 'for \\(const p of toWrite\\)',
        reason: 'az ÍRÁS bizonyíthatóan a védett, NEVESÍTETT sorrenden halad' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-010',
    date: '2026-07-31',
    title: 'Gyűjtemény-szintű 404 → „a fogalom nem létezik" (és a ráépített kulcsszó-összeolvasztás)',
    what: 'Az ELSŐ éles próba a `/cmsContentTags` és `/tags` GYŰJTEMÉNYRE 404-et kapott, én pedig ebből '
      + 'azt a következtetést írtam a kódba és a felületre, hogy „a Shoprenterben NINCS tartalom-címke '
      + 'erőforrás". Erre épült a leképezés: a VS-címkék a bejegyzés `metaKeywords` mezőjébe olvadtak '
      + 'be (`tagsToKeywords`), és a felület is ezt hirdette ki az operátornak.',
    why_wrong: 'A MÁSODIK futás — ugyanaz a próba, csak `full=1`-gyel, tehát MEZŐNEVEKKEL — megmutatta, '
      + 'hogy a bejegyzés-aggregátum (`cmsContentExtend`) mezői között OTT VAN a `cmsContentTags`, '
      + 'pontosan úgy, ahogy a `cmsContentDescriptions` is. A címke tehát LÉTEZIK, csak AL-ERŐFORRÁSKÉNT. '
      + 'A hiba a KÖVETKEZTETÉSBEN volt, nem a mérésben: egy gyűjtemény-végpont 404-e csak annyit mond, '
      + 'hogy ÚGY nem kérdezhető — a fogalom hiányát NEM bizonyítja. A tévedés ára kettős volt: egy '
      + 'kényszer-leképezés (a címke kulcsszóvá lapítva, két különböző fogalom EGY mezőn — KUKA-002 '
      + 'rokona), és egy HAMIS KORLÁT kimondva az operátornak, ami üzleti döntést befolyásolhat.',
    replaced_by: 'A próba BELENÉZ az aggregátumokba (`shapeOf` → `nested`) és KÖVETI a hivatkozást, ha '
      + 'a bolt nem bontotta ki; a modellben DEKLARÁLT kötés áll (`SHOP_TAG_BINDING`), ami igazolatlan '
      + 'állapotban blokkolót adna (`tagPushReadiness`) tippelés helyett. A kör a HARMADIK futással '
      + 'lezárult (D-VS-295): a belső mezők `tag` + `language` — ágyazott, nyelves érték-lista, ezért '
      + 'adott a gyűjtemény-végpont 404-et. A tévedés útja: 404 → „nincs" (rossz) → aggregátum → követés.',
    decision: 'D-VS-293 (a D-VS-292 helyesbítése) · lezárva: D-VS-295',
    found_by: 'operátor — a második éles próba-futás mezőnevei (a szűk első kérdés az én hibám volt)',
    lesson: 'A NEMLEGES LELET A LEGGYENGÉBB BIZONYÍTÉK. Egy 404 azt mondja meg, hogy ÍGY nem érhető el '
      + 'valami — nem azt, hogy nincs. Mielőtt „a másik rendszer nem tudja" mondattal korlátot mondok ki '
      + '(főleg az operátornak), meg kell nézni a SZOMSZÉDOS ábrázolásokat is: al-erőforrás, aggregátum-'
      + 'mező, más néven futó rokon. És ha egy leképezés azért születik, mert „nincs jobb", az gyanús: '
      + 'itt a kényszer-megoldás maga volt a jel, hogy a lelet hiányos.',
    guard_note: 'A belső mező-név IGAZOLÁSA élő boltot igényel (a séma nem áll rendelkezésre gépileg): '
      + 'a próba `nested` oszlopa mutatja meg. A forrás-oldali jelek azt kötik ki, hogy a téves állítás '
      + 'ne éledjen újra, és hogy a próba tényleg belenézzen az aggregátumba.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/', 'public/js/', 'config/registries/i18n.json'],
        pattern: 'NINCS (külön )?tartalom-címke',
        reason: 'a téves korlát-állítás (a bolt ismeri a fogalmat, csak al-erőforrásként)' }),
      Object.freeze({ paths: ['src/', 'public/js/'], pattern: 'tagsToKeywords',
        reason: 'a kényszer-leképezés: címke a kulcsszó-mezőbe olvasztva (két fogalom egy mezőn)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/sync/shoprenterProbeService.js'], pattern: 'nested\\[k\\] = Object\\.keys',
        reason: 'a próba az AGGREGÁTUM al-gyűjteményeibe is belenéz — ettől derül ki a fogalom léte' }),
      Object.freeze({ paths: ['src/content/contentModel.js'], pattern: "aggregate_field: SHOP_TAG_AGGREGATE_FIELD",
        reason: 'a bolti címke DEKLARÁLT kötésként áll a modellben, igazolás-jelzővel' }),
      Object.freeze({ paths: ['src/sync/shoprenterContentPushService.js'], pattern: 'tagPushReadiness',
        reason: 'igazolatlan mező-névnél a kiküldés-terv blokkolót ad, nem tippel' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-011',
    date: '2026-07-31',
    title: 'Teszt-utasítás olyan felületre, ami nem létezik (a lelet a szerveren rekedt)',
    what: 'A próba-szolgáltatás megtanulta kiadni az al-gyűjtemények belső mező-neveit, és az operátort '
      + 'elküldtem, hogy „a bejegyzés sorában az AL-GYŰJTEMÉNYEK oszlop kiírja a neveket". Az az oszlop '
      + 'NEM LÉTEZETT: a próba-tábla négy oszlopos maradt, a `nested` a válaszban ült, láthatatlanul.',
    why_wrong: 'Az operátor deployolt, futtatott, és azt látta, amit előtte — „én nem látom a különbséget". '
      + 'Egy ÉLES kör veszett el a semmiért, ráadásul olyan bizalmi kérdésben (mit tud a bolt), ahol épp '
      + 'előtte kellett tévedést helyesbíteni. A hiba nem a szolgáltatásban volt, hanem a LÁNC VÉGÉN: a '
      + 'szeletet a szerveren befejezettnek tekintettem, holott a felhasználóig nem ért el.',
    replaced_by: 'Az oszlop megépítve (a követett al-erőforrás mezőivel együtt) + pin, ami a MEGJELENÍTÉST '
      + 'köti ki: a felület olvassa a `row.nested`-et és a `row.sub`-ot, és van rá szótár-kulcs.',
    decision: 'D-VS-294',
    found_by: 'operátor („én nem látom a különbséget" — az éles próba-kimenettel együtt)',
    lesson: 'AMIT NEM JELENÍTÜNK MEG, AZ NINCS. Mielőtt az operátort odaküldöm valamihez, a láncot végig '
      + 'kell járni: szolgáltatás → útvonal → FELÜLET → szótár. Egy szerver-válasz mezője nem eredmény; az '
      + 'eredmény az, amit a képernyőn LÁT. A teszt-utasítás ígéret — csak arra szabad hivatkozni benne, '
      + 'ami tényleg ki van építve. ÉS A MEGTALÁLANDÓ FUNKCIÓ FÉL FUNKCIÓ (2026-08-24): a hiány-lelet 5 '
      + 'példát mutatott 65 javítandó mellett, a „teljes lista" pedig egy GOMB volt egy ÖSSZECSUKOTT '
      + 'szakaszon belül — az operátor nem találta meg, és joggal mondta, hogy „ez így használhatatlan". '
      + 'Ha egy listából DOLGOZNI kell, a teljes lista magától jöjjön: nyitva, betöltve, kivihető. A „van '
      + 'rá gomb" nem válasz a „hogyan javítsuk?" kérdésre — a kattintás mögé rejtett funkció ugyanaz a '
      + 'hiba eggyel arrébb tolva.',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['public/js/patrol-board.mjs'], pattern: 's\\.open = true;',
        reason: 'a tétel-lista NYITVA nyílik — nincs mit megtalálni (KUKA-011)' }),
      Object.freeze({ paths: ['public/js/patrol-board.mjs'], pattern: 'system\\.patrol\\.copyList',
        reason: 'a listából dolgozni kell, tehát kivihetőnek kell lennie' }),
      Object.freeze({ paths: ['public/js/settings-api-connections.mjs'], pattern: 'probe\\.col\\.nested',
        reason: 'az al-gyűjtemény oszlop TÉNYLEG ott van a próba-táblán' }),
      Object.freeze({ paths: ['public/js/settings-api-connections.mjs'], pattern: 'row\\.sub',
        reason: 'a KÖVETETT al-erőforrás mezői is megjelennek, nem csak a kibontottak' }),
      Object.freeze({ paths: ['config/registries/i18n.json'], pattern: 'settings\\.apiConn\\.probe\\.col\\.nested',
        reason: 'az oszlopnak van szótár-kulcsa (a lánc vége is kész)' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-012',
    date: '2026-07-31',
    title: 'A NÉMA ÜRES LISTA — a hiba, ami ténynek látszik',
    what: 'A shell a legacy olvasó-utak válaszából CSAK az `items` mezot nezte, a tartalom-vilag '
      + 'olvasoi viszont `rows` neven adjak a teteleket. A Blogok/Bejegyzesek/Cimkek oldal ezert azt '
      + 'irta ki, hogy „meg nincs felveve", miközben a rekord LETEZETT a tablaban.',
    why_wrong: 'Az üres kepernyo TENYNEK latszik („nincs adat"), nem hibanak — ezert senki nem keresi '
      + 'a hibat ott, ahol van. Az operator tobb koron at azt jelentette, hogy „a mentes nem megy", es '
      + 'en is a MENTES lancat olvastam vegig (gomb → panel → engedely → utvonal → szolgaltatas → tabla), '
      + 'ami vegig ep volt. A mentes SOHA nem bukott el: a LISTA nem latta. Ket kor veszett el ra, es '
      + 'kozben olyan szeletet is epitettem, ami ezt megkerulte ahelyett, hogy megjavitotta volna.',
    replaced_by: '`panel-io.js` → `listItemsOf(body)`: a lista-valasz alakjat (items | rows) EGYETLEN '
      + 'hely ismeri; a shell ES a kozos legordulo-lehivo ezt hivja, sajat masolat nelkul.',
    decision: 'D-VS-298',
    found_by: 'operator — a parosito kepernyorol felvett blog bizonyitotta, hogy az IRAS mukodik, '
      + 'mikozben a lista tovabbra is üres maradt',
    lesson: 'AZ ÜRES LISTA ES AZ ELERHETETLEN NEM UGYANAZ, es egyik sem lehet nema. Ha egy kepernyo azt '
      + 'allitja, hogy „nincs adat", azt bizonyitani kell tudni — kulonben a hiba tenynek maszkirozza '
      + 'magat. Amikor az operator azt mondja „nem menti el", az ELSO kerdes ne az iras-lanc legyen, '
      + 'hanem az, hogy az adat LETREJOTT-E; ha igen, a hiba az OLVASAS oldalan van.',
    forbidden: Object.freeze([
      // 2026-08-01 (D-VS-330): a minta VISSZATÉRT az új behúzó-kódban (body.items kézi olvasása — a
      // bolt másik borítékjánál néma üres). A boríték-olvasó EGY: externalListService.itemsOf.
      Object.freeze({ paths: ['src/sync/contentPullRunnerService.js'], pattern: '\\.body\\.items',
        reason: 'bolti boríték kézi olvasása — a közös itemsOf a boríték egyetlen ismerője' }),
      Object.freeze({ paths: ['public/js/app.mjs', 'public/js/reference-combobox.mjs'],
        pattern: 'Array\\.isArray\\(\\w+\\.rows\\)',
        reason: 'a lista-alak ismerete visszaszivargott a fogyasztoba (egy helyen elhet: panel-io)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['public/js/panel-io.mjs'], pattern: 'export function listItemsOf',
        reason: 'a lista-valasz alakjat EGY hely ismeri' }),
      Object.freeze({ paths: ['public/js/app.mjs', 'public/js/reference-combobox.mjs'],
        pattern: "import \\{ listItemsOf \\} from '\\./panel-io\\.mjs'",
        reason: 'mindket fogyaszto a KOZOS fuggvenyt hasznalja' }),
      // 2026-07-31 VISSZAESÉS ugyanerre a tanulságra, MÁS helyen: a partner-importer 218 sort olvasott
      // be és „0 külön cég"-et írt ki INDOKLÁS NÉLKÜL (a forrás kódolása/elválasztója tért el). Az
      // operátor pontosan azt látta, amit a blog-listánál: üres eredményt, ami ténynek látszik.
      // A tanulság tehát nem csak FELÜLETRE szól — a parancssori eszközre ugyanúgy.
      Object.freeze({ paths: ['tools/vs_import_partners.mjs'], pattern: 'amit vártam:',
        reason: 'az értelmezhetetlen forrás nem néma nulla: megnevezi, mit VÁRT és mit TALÁLT' }),
      Object.freeze({ paths: ['tools/vs_import_partners.mjs'], pattern: 'EGYETLEN céget sem tudtam kiolvasni',
        reason: 'az üres eredménynek KÜLÖN ága van, indoklással — nem csendben 0' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-013',
    date: '2026-07-31',
    title: 'A kivezetett abrazolas visszajott egy UJ IRON (az or csak az OLVASAST nezte)',
    what: 'A KUKA-001 azt vezette ki, hogy a blog fogalma az api_connection_mapping tablaban lakjon — '
      + 'a gepi jel viszont csak azt tiltotta, hogy a tartalom-OLVASO onnan olvasson. A D-VS-296-ban '
      + 'a parosito kepernyonek adtam egy content_list fajtat, ami ISMET ODA IRT. Igy ugyanaz a teny '
      + '(melyik VS-blog melyik bolti gyujtore megy) KET helyen elt: api_connection_mapping ES '
      + 'content_list_channel — es a ketto nem latta egymast.',
    why_wrong: 'Az operator a parosito kepernyon beallitotta a kotest, a bejegyzes viszont tovabbra is '
      + 'azt irta, hogy „ezek a blogok meg nincsenek csatornahoz kotve". Ket egymasnak ellentmondo '
      + 'kepernyo: az egyik szerint kesz, a masik szerint nincs. Ez rosszabb, mint ha egyik sem menne — '
      + 'mert az operator nem tudja, melyiknek higgyen, es a hibat magaban keresi.',
    replaced_by: 'A blog ↔ csatorna kotesnek EGY otthona van: `content_list_channel`. A parosito mento '
      + 'a kulso-lista regiszter `store` leirojabol dont, hova irjon; a migration_935 attolti es KIURITI '
      + 'a regi helyet. A kapcsolat CSATORNA-mezot kapott (+ helyben felveheto csatorna), mert csatorna '
      + 'nelkul a kotesnek nincs hova mutatnia.',
    decision: 'D-VS-300 (a KUKA-001 kiegeszitese)',
    found_by: 'operator — a ket kepernyo ellentmondasat egymas melle tette',
    lesson: 'A KIVEZETETT ABRAZOLAS NEM CSAK AZON AZ UTON JOHET VISSZA, AMIT AKKOR BETEMETTUNK. Ha egy '
      + 'or csak az olvasast meri, egy uj IRO ugyanoda visszateheti az adatot — es ket igazsag szuletik. '
      + 'Uj iro-utat nyitva mindig meg kell kerdezni: HOL az adott teny KANONIKUS otthona? Ha a valasz nem '
      + 'egyertelmu, az mar a hiba maga.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/settings/apiConnectionService.js', 'src/sync/externalListService.js'],
        pattern: "mapping_kind[^\\n]*'content_list'",
        reason: 'a blog-kotes ismet az altalanos megfeleltetes-tablaba kerulne (KUKA-001 visszaeledese)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/sync/externalListRegistry.js'], pattern: "table: 'content_list_channel'",
        reason: 'a kanonikus otthon KIMONDVA, adatkent' }),
      Object.freeze({ paths: ['src/settings/apiConnectionService.js'], pattern: 'function saveContentListBinding',
        reason: 'a mentes a kanonikus helyre megy' }),
      Object.freeze({ paths: ['migrations/migration_935_content_list_binding_single_home.sql'],
        pattern: "DELETE FROM api_connection_mapping WHERE mapping_kind = 'content_list'",
        reason: 'a regi hely kiurul — nem marad ket igazsag' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-014',
    date: '2026-07-31',
    title: 'A kapcsolo, ami CSAK egyetlen irasmodot fogadott el (SHOPRENTER_LIVE_WRITE === 1)',
    what: 'Az eles-iras kapuja kizarolag az `1` erteket ismerte el bekapcsolasnak. Az operator a '
      + 'Railway-en `on`-t allitott be (amit EN irtam neki az utmutatoban), a rendszer pedig azt '
      + 'valaszolta, hogy „SHOPRENTER_LIVE_WRITE env-kapcsolo nincs beallitva".',
    why_wrong: 'A kepernyo azt allitotta, hogy a beallitas HIANYZIK, holott ott volt — az operator a '
      + 'sajat munkajat kezdte kerdojelezni, es a bizonyitekot (a Railway valtozo-listat) kellett '
      + 'bemasolnia, hogy kiderujon: a kod ertelmezese szuk. Ket hiba egy tenyen: a szigoru olvasas ES '
      + 'az en utmutatom, ami mas irasmodot javasolt. Ugyanaz a csalad, mint a nema ures lista: a '
      + 'rendszer HAMISAT allitott a vilag allapotarol.',
    replaced_by: '`src/config/envFlag.js` → `envFlag()` + `flagState()`: EGY olvaso minden env-kapcsolora, '
      + 'ami a szokasos igenleseket erti (1 / on / true / yes / igen / enabled / be), ISMERETLEN erteknel '
      + 'ZARVA marad, es a hibauzenet MEGMONDJA, mit latott es mit fogad el.',
    decision: 'D-VS-314',
    found_by: 'operator — bemasolta a Railway valtozo-listajat, amiben ott allt: SHOPRENTER_LIVE_WRITE = on',
    lesson: 'EGY BE/KI KAPCSOLO NE EGYETLEN TITKOS IRASMODOT ISMERJEN EL. Aki `on`-t, `true`-t vagy '
      + '`igen`-t ir, ugyanazt akarja. A szigor itt nem biztonsag: a kapu attol meg alapbol zarva van es '
      + 'ismeretlen erteknel zarva marad — de a rendszer nem allithatja, hogy „nincs beallitva", amikor '
      + 'be van. Es amit az operatornak irok utmutatoban, azt a kodnak ERTENIE kell.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/'], pattern: "process\\.env\\.[A-Z_]+ === '(1|true|on|yes)'",
        reason: 'egyetlen irasmodra szukitett env-kapcsolo — a kozos envFlag olvasot kell hasznalni' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/config/envFlag.js'], pattern: 'const ACCEPTED_TRUE',
        reason: 'a szokasos igenlesek EGY helyen, adatkent' }),
      Object.freeze({ paths: ['src/sync/shoprenterWriteClient.js', 'src/jobs/jobsWorker.js', 'src/email/emailService.js'],
        pattern: 'envFlag\\(', reason: 'minden kapcsolo a KOZOS olvason megy' }),
      Object.freeze({ paths: ['src/config/envFlag.js'], pattern: 'nem értelmezzük bekapcsolásként',
        reason: 'a hibauzenet megmondja, mit latott es mit fogad el' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-015',
    date: '2026-08-01',
    title: 'A BEALLITAS, AMINEK NINCS FOGYASZTOJA (automata szinkron perc) — es a GEPI AZONOSITO mint felirat',
    what: 'Ket rokon lelet egy korben. (1) A kapcsolat-szerkeszton ott allt az „automata szinkron (perc)" '
      + 'mezo: az operator beirta, a rendszer elmentette — de a percet SENKI nem olvasta (nincs idozito-'
      + 'futtato, a jobs-futtatonak egyetlen domain-feladata van). A szinkron-doboz iranyvalasztojaban '
      + 'ugyanigy ott allt a „Csak be" es az „Oda-vissza", holott a befele iranynak ma csak TERVEZOJE van. '
      + '(2) A felirat helyen GEPI AZONOSITO allt: bolti base64 (`Y21zQ29udGVudExpc3Q…`) es VS-oldali UUID.',
    why_wrong: 'Mindketto ugyanaz a hiba: a KEPERNYO TOBBET ALLIT A VILAGROL, mint amennyit a gep teljesit. '
      + 'Az operator abbol indult ki, hogy „2 perces sync van bekotve" — es varta a hatast, ami sosem jott. '
      + 'Egy beallitas, aminek nincs FOGYASZTOJA, nem beallitas, csak igeret; egy azonosito, amit senki nem '
      + 'tud elolvasni, nem felirat, csak zaj. Ez a KUKA-011 ikertestvere (ott teszt-utasitast adtam nem '
      + 'letezo feluletre; itt egy MEZO igert nem letezo mukodest).',
    replaced_by: '`src/sync/syncCapabilityRegistry.js` (SCR-01): EGY helyen mondjuk ki, mi FUT ma es mi nem — '
      + 'a kepernyok innen veszik a mondatot (kapcsolat-szerkeszto: az idozito allapota; szinkron-doboz: az '
      + 'irany-megjegyzes). Es `public/js/ext-name.mjs` (EXN-01): a lathato felirat NEV, a gepi azonosito '
      + 'legfeljebb rasugas; ha nincs nev, azt KIMONDJUK, nem az azonositot irjuk ki helyette.',
    decision: 'D-VS-317 (+ D-VS-316 a nevekre)',
    found_by: 'operator — „elmeletileg 2 perces sync van bekotve… akkor legkesobb ket perc mulva valtozik az '
      + 'SH-ban?" · „oda-vissza szink mukodik?" · „fogjuk az emberileg nem ertelmezheto azonositokat, es '
      + 'blog nevet, bejegyzes nevet stb hasznaljunk helyettuk!"',
    lesson: 'AMI A KEPERNYON ALL, AZT A GEPNEK TELJESITENIE KELL. Uj beallitas-mezo nyitasakor a kerdes: KI '
      + 'OLVASSA? Ha senki, akkor vagy nem tesszuk ki, vagy a kepernyo KIMONDJA, hogy ma meg nem fut — es ezt '
      + 'a mondatot regiszterbol vesszuk, hogy az igazsag egy helyen billenjen at. Ugyanez all a feliratra: a '
      + 'nev a felirat, az azonosito legfeljebb rasugas. '
      + '2026-08-23 (D-VS-530) — ELESEBB ALAK: a NEMA ALAPERTEK a fogyaszto-hianyt ALCAZZA. A cegenkenti '
      + 'nyelv-beallitas evek ota mentheto volt, es SENKI nem olvasta; a levelekben minden hivo kulon '
      + 'irta be a magyart, a level-szolgaltatas validacioja pedig a hianyzo nyelvet is NEMAN magyarra '
      + 'allitotta — igy a mezo ugy nezett ki, mintha hasznalnank. Ahol egy ertek HIANYOZHAT, ott a '
      + 'hianynak azt kell jelentenie, hogy NEM MONDTAK, nem azt, hogy egy konkret ertek; a valodi '
      + 'alapertek pedig EGY helyen dol el (a kozos iroban), nem hivonkent. Es fordítva is all: amit a '
      + 'gep csinal, arrol a kepernyo beszeljen (a beallitas-sor mondja ki, mire hat).',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['public/js/sync-block.mjs', 'public/js/settings-api-connections.mjs', 'public/js/marketing-content-detail.mjs'],
        pattern: '\\$\\{[a-z0-9_.]*(label|name)\\}\\s*\\(\\$\\{[a-z0-9_.]*(external_key|external_ref|internal_ref)\\}\\)',
        reason: 'gepi azonosito a nev mellett foszovegben — a felirat NEV, az azonosito rasugas' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/sync/syncCapabilityRegistry.js'], pattern: 'setting_field',
        reason: 'a fogyaszto nelkuli beallitas-mezo NEVESITVE van, es a kepernyo ezt mondja ki' }),
      // 2026-08-01 (D-VS-320): a kepernyo kibontva olvassa (sch.hu_state) — a jel az ALAKOT koveti,
      // a kikotes valtozatlan: a mondat a regiszterbol jon.
      Object.freeze({ paths: ['public/js/settings-api-connections.mjs'], pattern: 'sch\\.hu_state',
        reason: 'a kepernyo a REGISZTERBOL beszel, nem kezzel irt mondatbol' }),
      Object.freeze({ paths: ['public/js/ext-name.mjs'], pattern: 'visible_text_is_the_name',
        reason: 'a felirat-szabaly EGY helyen el' }),
      Object.freeze({ paths: ['src/email/emailService.js'], pattern: 'tenantDefaultLang',
        reason: 'a cegenkenti nyelv-beallitasnak VAN olvasoja: a levél nyelve onnan jon (D-VS-530)' }),
      Object.freeze({ paths: ['src/email/emailService.js'], pattern: "input\\.lang\\.trim\\(\\) : null",
        reason: 'a hianyzo nyelv NEM nema magyar: a hiany azt jelenti, hogy a hivo nem mondott nyelvet' }),
      Object.freeze({ paths: ['public/js/system-settings.mjs'], pattern: "settings\\.hint\\.",
        reason: 'a beallitas-sor MEGMONDJA, mire hat — a gep munkajarol a kepernyo beszel' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-016',
    date: '2026-08-01',
    title: 'A KITALÁLT MEZŐNÉV a regiszterben — a bejegyzés ott van, a funkció mégis hiányzik',
    what: 'A partner-felület oszlop-listájába `{ key: "partner_roles", ... }` került, miközben a '
      + 'regiszter oszlop-bejegyzései a kulcsot `field` néven hordozzák (`{ field: "code", ... }`). '
      + 'A bejegyzés SZINTAKTIKAILAG érvényes JSON volt, a battéria végig zöld, a kód kiadva és '
      + 'kitelepítve — a Szerepek oszlop mégsem jelent meg a rácson.',
    why_wrong: 'A rács az alaktalan bejegyzést NÉMÁN átlépte: se hiba, se üres oszlop, semmi. Kívülről '
      + 'megkülönböztethetetlen attól, mintha ki sem lett volna adva a kód — az operátor jogosan hitte, '
      + 'hogy a deploy nem futott le, és ezt is mértük végig, mielőtt a valódi okhoz értünk. A pinjeim a '
      + 'HÁTSÓ specet mérték (allowlist, SQL, szűrő-mód), a FELÜLETI bejegyzés ALAKJÁT egyik sem — '
      + 'pedig a kettő közül a felületi az, amit a felhasználó lát.',
    replaced_by: 'A bejegyzés a testvéreivel azonos alakra javítva (`field`), és a verify:multi-field '
      + 'MUL07 pin-csoportja MINDEN felület MINDEN oszlop-bejegyzését végigméri (148 bejegyzés, 34 '
      + 'felület): ha egynek sincs ép mezőneve, piros.',
    decision: 'a 2026-08-01-i partner-szerep kör',
    found_by: 'operátor — „semmi ilyent nem látok" az éles felületen, a kód kitelepítése UTÁN',
    lesson: 'EGY KITALÁLT MEZŐNÉV NÉMÁN ELNYELI A FUNKCIÓT. Ahol a regiszter egy alakot használ, ott az '
      + 'ÚJ bejegyzésnek a TESTVÉREITŐL kell átvennie az alakot — nem az emlékezetből. És amíg a pin '
      + 'csak a hátsó réteget méri, addig a felület hiánya zöld battéria mellett is előfordulhat: a '
      + 'lánc végét (amit a felhasználó lát) ugyanúgy mérni kell, mint az elejét. (KUKA-011 rokona: ott '
      + 'a felület nem volt megépítve, itt megépült, de alaktalanul.)',
    guard_note: '`npm run verify:multi-field` MUL07: minden felület minden oszlop-bejegyzésének kell '
      + 'hogy legyen `field` mezője; és a partner-felületen a Szerepek oszlop ép alakban ott van.',
    forbidden: Object.freeze([
      // SZŰKÍTVE a valódi esetre: a SZŰRŐ- és CSOPORT-bejegyzések jogosan `key`-t használnak — csak az
      // OSZLOP-bejegyzés `field`. A kettőt a `label_key` (kígyós) különbözteti meg a `labelKey`-től.
      // (Az első, tágabb mintám a legitim szűrő-bejegyzést is tiltotta volna — a pin maga is elbukott.)
      Object.freeze({ paths: ['config/registries/ui_surfaces.json'],
        pattern: '"key":\\s*"[^"]+",\\s*"label_key"',
        reason: 'oszlop-bejegyzés `key` kulccsal — a rács ezt NÉMÁN átlépi; az oszlopé `field`' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['config/registries/ui_surfaces.json'], pattern: '"field": "partner_roles"',
        reason: 'a Szerepek oszlop a testvéreivel AZONOS alakon áll' }),
      // A minta SZÁNDÉKOSAN a lényegi részlet, nem a teljes mondat: a KUKA-018 körben a pin szövege
      // „MINDEN ÉLŐ felületi oszlop…"-ra bővült (az élő listát méri), és egy túl szoros minta ettől
      // bukott volna — pedig a mért TÉNY ugyanaz maradt.
      Object.freeze({ paths: ['tools/vs_verify_multi_field.mjs'], pattern: 'felületi oszlop mezőneve ép',
        reason: 'a felületi bejegyzés alakját GÉP méri, minden felületen' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-017',
    date: '2026-08-01',
    title: 'A KIKULDOTT rekord szerkesztes-tilalma (content_locked a published-re + negy rejtett szerkeszto-blokk)',
    what: 'A kikuldott (published) bejegyzesre a tarolo elutasitott minden uj verziot („elobb vissza '
      + 'review-ba"), a reszletezo pedig NEGY szerkeszto-blokkot (szoveg, cimkek, blogok, cel-csatornak) '
      + 'egyszeruen ELREJTETT. Az operator a sajat blog-bejegyzeset nem tudta szerkeszteni.',
    why_wrong: 'A bejegyzes VS-REKORD — a szinkron RAADAS, nem bortonor („bejegyzes, blog, termek, '
      + 'partner, raktar… mind a vs resze. az kulon plussz, hogy lehet szinkronizalni SH fele!"). A '
      + '„vissza review-ba" kattintas KONYVELES volt, nem dontes — es a konyvelest a rendszernek kell '
      + 'vegeznie (D-VS-313 elve). Radasul a tiltas hazudott is: a gomb ott volt, csak nem tortent semmi.',
    replaced_by: 'Szerkesztes MINDIG szabad (archivalt kivetel — az kimondott lezaras): kikuldott tetelre '
      + 'erkezo uj verzio MAGATOL leptet vissza Atnezes ala (a meglevo published→in_review atmeneten), a '
      + 'boltban a kikuldott valtozat marad az ujra-jovahagyasig; a kepernyo ezt ki is mondja. A negy '
      + 'szerkeszto-blokk kikuldott allapotban is latszik.',
    decision: 'D-VS-321',
    found_by: 'operator — „nem lehet szerkeszteni!… meg ha a szerkesztes gombra nyomok, akkor sem!!! de '
      + 'miert, ez egy blog bejegyzes!!!"',
    lesson: 'A VS-REKORD SZERKESZTHETOSEGE ALAPJOG — az allapot-visszaleptetes a RENDSZER dolga, nem az '
      + 'operatore. Egy munkafolyamat-allapot SOHA ne tegyen irhatatlanna egy rekordot; ha az allapotgep '
      + 'ismer visszautat, a szerkesztes maga jarja vegig, nem az ember. Zarva csak a kimondott lezaras '
      + '(archiv) lehet, es az is indokkal.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['public/js/marketing-content-detail.mjs'],
        pattern: "item\\.status !== 'published' && item\\.status !== 'archived'",
        reason: 'a szerkeszto-blokkot a published allapot nem rejtheti el — csak az archivalt' }),
      Object.freeze({ paths: ['src/content/contentStoreService.js'],
        pattern: "=== 'published' \\|\\| head\\.rows\\[0\\]\\.status === 'archived'",
        reason: 'a published nem zarhatja az uj verziot — a rendszer leptet vissza' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/content/contentStoreService.js'], pattern: "canTransition\\('published', 'in_review'\\)",
        reason: 'a visszaleptetes a rendszer konyvelese, az allapotgep meglevo atmeneten' }),
      Object.freeze({ paths: ['public/js/marketing-content-detail.mjs'], pattern: 'visszalép Átnézés alá',
        reason: 'a kepernyo kimondja, mi tortenik mentesnel — nem meglepetes' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-018',
    date: '2026-08-01',
    title: 'AZ ÉP BEJEGYZÉS A HALOTT LISTÁBAN — ugyanaz a képernyő, másodszor, megint zöld battériával',
    what: 'A KUKA-016 javítása után a Szerepek oszlop TOVÁBBRA SEM jelent meg. A bejegyzés ekkor már '
      + 'alakra hibátlan volt (`field` + `label_key`), csak épp a HALOTT listába került: a '
      + 'felület-regiszterben KÉT oszlop-lista él egymás mellett — a régi `columns` (field/label_key) és '
      + 'a `surface_spec.columns` (key/labelKey). Ahol van `surface_spec` — a partner-felületen van —, ott '
      + 'a shell KIZÁRÓLAG azt olvassa, a régi lista néma díszlet.',
    why_wrong: 'UGYANAZ a képernyő bukott el kétszer, és a battéria MINDKÉTSZER zöld volt. Az operátor '
      + 'közben végigcsinálta a teljes pull → migrate → verify → Railway-újraindítás kört — feleslegesen, '
      + 'mert a hiba a regiszterben ült. A KUKA-016-ra írt MUL07 pin épp azt a listát szemlézte, amelyik '
      + 'NEM játszik: 148 bejegyzést mért ép alakúnak, miközben a rács egy másik tömbből dolgozott. Egy '
      + 'pin, ami a rossz tömböt méri, ROSSZABB a hiányzó pinnél: hamis biztonságot ad.',
    replaced_by: 'A bejegyzés a `surface_spec.columns` listába került (key/labelKey/type:multi/'
      + 'defaultVisible), és a MUL07 pin már nem JSON-t szemlézget: BEHÍVJA a shell saját normalizálóját '
      + '(surface-registry.mjs → setSurfaces + getSurfaceColumns), és abban keresi az oszlopot. Mellé egy '
      + 'árva-őr: ha egy mezőre szűrni/rendezni lehet, de oszlopként nem létezik, az piros.',
    decision: 'a 2026-08-01-i partner-szerep kör (KUKA-016 folytatása)',
    found_by: 'operátor — a képernyő-kiírás egy IGAZOLTAN helyes kitelepítés után (a /health commit + '
      + 'regiszter-ujjlenyomat karakterre egyezett a helyivel, ezért a deploy mint ok kiesett)',
    lesson: 'AHOL EGY FOGALOMNAK KÉT ÁBRÁZOLÁSA VAN, OTT AZ „ÉP ALAK" NEM ELÉG — a kérdés az, MELYIKET '
      + 'OLVASSA A RENDERELŐ. Új regiszter-bejegyzés előtt ezt kell megkeresni, nem a testvér-alakot '
      + 'lemásolni (a KUKA-016 tanulsága igaz, de nem elegendő). És a pin ne a fájlt olvassa, hanem HÍVJA '
      + 'ugyanazt a feloldót, amit a felület használ — különben a pin egy másik valóságot mér, mint amit '
      + 'a felhasználó lát. (KUKA-009 kiterjesztése: nem elég viselkedést mérni, a HELYES réteg '
      + 'viselkedését kell mérni.)',
    guard_note: '`npm run verify:multi-field` MUL07: a pin injektálja a regisztert a shell normalizálójába '
      + '(getSurfaceColumns) és abban követeli meg a Szerepek oszlopot — ha a bejegyzés a halott listába '
      + 'kerül vissza, piros. Bizonyítva: az oszlop kivételekor 3 pin bukik, a hibaüzenet pontosan azt a '
      + 'hat oszlopot sorolja fel, amit az operátor a képernyőn látott.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['tools/vs_verify_multi_field.mjs'],
        pattern: "SURF\\['admin\\.partners\\.list'\\]\\.columns",
        reason: 'a pin a RÉGI (halott) oszlop-listát méri — a rács a surface_spec.columns-ból dolgozik' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_verify_multi_field.mjs'], pattern: 'getSurfaceColumns',
        reason: 'a pin a shell SAJÁT feloldóját hívja, nem újraértelmezi a regisztert' }),
      Object.freeze({ paths: ['tools/vs_verify_multi_field.mjs'],
        pattern: 'nincs olyan mező, amire szűrni/rendezni lehet, de oszlopként nem létezik',
        reason: 'árva-őr: a hátsó képesség és a felületi oszlop együtt jár, vagy sehogy (KUKA-011 lánc)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-019',
    date: '2026-08-01',
    title: 'A SÉMA-FRISSÍTÉS MINT RIPORT-MONDAT — a 939-es migráció hat körön át függött, a képernyő hallgatott',
    what: 'A 939-es migráció (a verzió-eredet szótára bővül: external) a repóban élt, a riportok pedig '
      + 'hat körön át azt írták: „migráció nem kell" — mert ÚJ tényleg nem kellett. Közben az éles '
      + 'adatbázison a 939 SOSEM futott le, és a letöltés minden köre a 23514-es őr-hibára futott '
      + '(new row violates check constraint … origin_check). A séma-elmaradás EGYETLEN helyen élt: a '
      + 'riport szövegében („futtasd a terminál-blokkot") — azt pedig se gép nem méri, se kör nem őrzi.',
    why_wrong: 'A terminál-blokk lefuttatása OPERÁTORI lépés, amit semmi nem ellenőriz: ha kimarad vagy '
      + 'elakad, a rendszer következő köre pontosan úgy néz ki, mintha a kód volna hibás. Három teljes '
      + 'diagnosztika-kör (napló-olvasás, build-bélyeg, export-javítás) épült arra a NÉMA előfeltevésre, '
      + 'hogy a séma a kóddal együtt jár. A magyarázó/utasító szöveg nem őr (KUKA-004) — és a '
      + 'schema_version könyvelése önmagában szintén nem bizonyíték a séma tényleges alakjára.',
    replaced_by: 'SST-01 (src/sync/schemaStateService.js): a képernyő MÉRI a sémát — (1) FÜGGŐ migráció: '
      + 'a fájl-verziók és a schema_version különbsége (a futtatóval azonos felfedezésen); (2) ELMARADT '
      + 'HATÁS: kód-követelmény próbák (regiszter-sor: a 939-hez a CHECK definíciója tartalmazza az '
      + 'external-t). A kapcsolat-képernyő a build-bélyeg mellett mondja ki: „elmaradt migráció: 939 — '
      + 'futtasd a terminál-blokkot", vagy „Adatbázis-séma: rendben". Kérésenként mér: migráció után '
      + 'újranyitásra zöld, redeploy nélkül.',
    decision: 'D-VS-337',
    found_by: 'operátor — a Szinkron napló beillesztett sorai (a D-VS-334-es nevesített hiba-ok tette '
      + 'láthatóvá: 23514 … origin_check), miután a build-bélyeg a friss kódot igazolta',
    lesson: 'A SÉMA-ELMARADÁS RENDSZER-ÁLLAPOT, NEM UTASÍTÁS-SZÖVEG. Amit az operátornak kell lefuttatnia, '
      + 'annak az ELMARADÁSÁT a képernyőnek kell kimondania — különben minden kör a „friss-e a kód?" '
      + 'találgatásba fut vissza (a D-VS-335 build-bélyeg leckéje, egy réteggel lejjebb: melyik SÉMA fut). '
      + 'És a könyvelés (schema_version) nem séma-tény: ahol a kód egy séma-alakra épül, ott PRÓBA mérje '
      + 'a sémát magát, ne a naplót.',
    guard_note: '`npm run verify:content-layer` CL49: a pin HÍVJA a diffPending-et (viselkedés), méri a '
      + 'katalógus → képernyő láncot (schema_state a válaszban, a felület kiírja), és megköveteli, hogy a '
      + 'REQUIREMENTS-ben éljen a 939-es external-próba. + `npm run verify:sql-columns` SQC06 '
      + '(D-VS-527): a NÉMÁN LE NEM FUTÓ migráció — a futtató csak a `-- db:migrate: incremental` '
      + 'jelölést hordozó fájlokat fedezi fel, jelölés nélkül a séma-frissítés elmarad, és az író '
      + 'élesben „nincs ilyen oszlop"-ra fut. A kivétel NEM néma: az alapzat (001–009) és három '
      + 'kimondottan még nem aktív fájl NEVESÍTVE áll, indokkal, mindkét irányban őrizve.',
    forbidden: Object.freeze([]),   // nincs tiltott minta — a hiba a HIÁNY volt; a pozitív jelek őrzik
    positive: Object.freeze([
      Object.freeze({ paths: ['src/sync/schemaStateService.js'], pattern: 'diffPending',
        reason: 'a függő migráció GÉPI különbség (fájl-verziók vs schema_version), nem riport-emlékezet' }),
      Object.freeze({ paths: ['src/sync/schemaStateService.js'], pattern: "migration: '939'",
        reason: 'a kód-követelmény próba: a séma TÉNYÉT mérjük, nem a schema_version könyvelését' }),
      Object.freeze({ paths: ['src/routes/apiConnection.routes.js'], pattern: 'schema_state',
        reason: 'a séma-állapot a katalógus-válasz része — a képernyő innen beszél' }),
      Object.freeze({ paths: ['public/js/settings-api-connections.mjs'], pattern: 'elmaradt migráció',
        reason: 'a képernyő KIMONDJA az elmaradást és a teendőt — nem a riport szövege hordozza' }),
      Object.freeze({ paths: ['tools/vs_verify_sql_columns.mjs'], pattern: 'NOT_YET_ACTIVE',
        reason: 'a jelöletlen (tehát némán le nem futó) migráció piros — a kivétel nevesítve, indokkal (D-VS-527)' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-020',
    date: '2026-08-02',
    title: 'A MINDENT ELNYELŐ CATCH a közös feloldó körül — a programhiba néma funkció-hiánnyá vált',
    what: 'A #14-es funkció (saját-magunktól beszerzés kimondása) meghívta a közös saját-partner '
      + 'feloldót, DE a fájl soha nem húzta be (require lemaradt). A hívás ReferenceError-ral halt — '
      + 'csakhogy egy `try { … } catch (e) { selfPurchase = false; }` ült rajta, ami a programhibát '
      + 'pontosan ugyanarra a „nem, ez nem mi vagyunk"-ra fordította, mint egy valódi nemleges választ. '
      + 'A funkció kiadva, PIN-elve, jelentve lett — és egyetlen egyszer sem futott le.',
    why_wrong: 'Két hiba egymást takarta. (1) A „hívom, de nincs behúzva" a szintaxis-ellenőrzésen '
      + 'ÁTMEGY: csak futásidőben derül ki — ha pedig catch alatt van, ott sem. (2) A mindent elnyelő '
      + 'catch összemossa a „megkérdeztük, és nem" választ a „meg sem tudtuk kérdezni" állapottal — ez '
      + 'a KUKA-012 alakja egy réteggel lejjebb. A pinjeim a válasz-mező ALAKJÁT és a hívás SZÖVEGÉT '
      + 'mérték, nem azt, hogy a lánc végig fut-e (KUKA-009).',
    replaced_by: 'A behúzás pótolva; a blanket catch ELTÁVOLÍTVA — a séma-eltérést maga a feloldó kezeli '
      + '(oszlop-őr + tartalék), tehát ott nincs mit elnyelni; ami mégis eldobódna, az valódi hiba, és a '
      + 'getProcess külső ága NÉVVEL adja vissza. Mellé egy ÁLTALÁNOS őr született: a szimbólum-verifier '
      + 'minden src-modul VALÓDI exportjait betölti, és minden forrásfájlban megnézi, hív-e olyan nevet, '
      + 'ami nála nincs kötve — vagyis az egész osztály fennakad, nem csak ez az egy eset.',
    // 2026-08-02 dev-átszámozás: az aux e döntést D-VS-339-ként hivatkozta, de az a szám a főkönyvben
    // már a dev termék-párosításáé volt (a dev merge ért be előbb — a szabály szerint a később érkező
    // számoz át; a commit-üzenet nem javítható, a hivatkozás igen). A szerep-bekötés döntés-száma: 341.
    decision: 'D-VS-341',
    found_by: 'Claude-Aux (saját kód, egy nappal a kiadás után) — a szerep-felajánlás bekötése közben, '
      + 'a szomszédos sorok olvasásakor',
    lesson: 'A MINDENT ELNYELŐ CATCH A PROGRAMHIBÁT NÉMA FUNKCIÓ-HIÁNNYÁ ALAKÍTJA. Ahol egy közös '
      + 'feloldót hívunk, ott a „nem" és a „nem tudtam megkérdezni" NEM ugyanaz — a catch vagy szűk '
      + '(nevezett, várt hibára), vagy nincs. És: a modul-határon átnyúló hívást a GÉP ellenőrizze, mert '
      + 'a szem átsiklik rajta, a szintaxis-ellenőrzés pedig nem látja.',
    guard_note: '`npm run verify:module-symbol-wiring` (MSW01–04): MSW03 a teljes src-fát méri (egyetlen '
      + 'be nem húzott, más modulból exportált hívás sem maradhat), MSW04 pedig kimondottan tiltja, hogy '
      + 'a saját-partner feloldás visszakerüljön elnyelő catch mögé.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/services/processService.js'],
        pattern: 'catch \\(e\\) \\{ selfPurchase = false; \\}',
        reason: 'a programhiba nem lehet ugyanaz a válasz, mint a valódi nemleges felelet' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/services/processService.js'], pattern: "require\\('\\./selfPartnerService'\\)",
        reason: 'a közös feloldó BE VAN HÚZVA — enélkül a hívás futásidőben eldobna' }),
      Object.freeze({ paths: ['tools/vs_verify_module_symbol_wiring.mjs'], pattern: 'exportedBy',
        reason: 'az őr a VALÓDI exportokat tölti be, nem szövegből találgat (KUKA-009)' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-021',
    date: '2026-08-02',
    title: 'A MÉRTÉKEGYSÉG MINT CÍMKE — az egység átírása átszámolás nélkül',
    what: 'A #16-os egység-elírás listát átnevezés-feladatnak vettem: a szerszám a `product.base_unit_id` '
      + 'oszlopot írta át a termék NEVE alapján, a mennyiségekhez nem nyúlva. A dry-run négy '
      + 'SZOLGÁLTATÁST is átsorolt volna („Homoktövis velő pasztőrözés+töltés 3 l" — literről darabra), '
      + 'és minden literes velő-tételt darabra írt volna. '
      + '· 2026-09-02: VISSZATÉRT OLVASÓ-OLDALON (D-VS-637, a riport-átvilágításból) — a KÖZÖS RÁCS '
      + 'mozgás-vetítése (`masterReadService` stockmovement: `unit: u.code`) és a Biokontroll F-221/7 '
      + 'hatósági készletnyilvántartó mozgás-sorai (`biokontrollReportService`: `u.code AS unit`) a MAI '
      + 'törzs-egységet írták ki a főkönyvi sor SAJÁT egysége helyett. Adaton mérve: egy 2026-07-15-i, '
      + '571 LITER-ként könyvelt bevét „571 kg"-ként jelent meg mindkét helyen, mert a termék '
      + 'törzs-egysége ma kg. A javítás UTÁN mindkettő 571 l-t ír. A szomszéd főkönyvi olvasó '
      + '(`stockMovementReadService`) VÉGIG helyes volt, és a fejlécében ki is mondta a szabályt — '
      + 'ezért a hiba csak akkor bukott ki, amikor a két utat EGYMÁS MELLÉ tettük.',
    why_wrong: 'A mennyiségek a RÉGI egységben vannak KÖNYVELVE. Az operátor szavaival: „minden '
      + 'mennyiség literre volt számítva. ha … homoktövis velő készült mondjuk 200 liter, akkor az 200 '
      + 'liter 2 literes (tehát 100 db) megtöltésére volt elég, illetve a szolgáltatás is 200 liter '
      + 'pasztőrözésére volt meghatározva, nem 100 darabéra (ez számít az áraknál is)". Az egység '
      + 'átírása tehát NEM címke-csere: ugyanaz a 200-as szám onnantól mást ÁLLÍT (200 db 100 helyett), '
      + 'és az egységár mértéke is fordul (Ft/liter ≠ Ft/darab). Szolgáltatásnál még rosszabb: ott az '
      + 'egység az ÁRALAP, nem a csomagolás. A hiba NÉMA lett volna: a szám nem változik, csak a '
      + 'jelentése — se őr, se szemrevételezés nem fogja meg utólag.',
    replaced_by: 'DIMENZIÓ-SZABÁLY a szerszámban: ha a régi és az új egység NAV-kategóriája eltér '
      + '(LITER ⇄ DARAB ⇄ KILOGRAMM), az ÁTVÁLTÁS — a szerszám SOHA nem írja, hanem kilistázza a '
      + 'kiszereléssel (a névből: 2 l/db) és a lábnyommal (mozgás · folyamat-sor · készlet-pozíció). '
      + 'Szolgáltatás (product_type/kind = service) teljesen kimarad. EGY kivétel, az operátor saját '
      + 'megfigyeléséből: ha a terméknek NINCS mozgása, NINCS folyamat-sora és NINCS készlet-pozíciója, '
      + 'akkor egyetlen szám jelentése sem változik — ott a dimenzió-váltás is puszta címke-javítás. '
      + 'A LÁBNYOM dönt, nem a név.',
    decision: 'D-VS-340',
    found_by: 'operátor — a dry-run listáján vette észre, hogy szolgáltatások is szerepelnek benne, '
      + 'és leírta a KS-korszak liter-alapú számítását',
    lesson: 'AZ EGYSÉG NEM CÍMKE, HANEM A SZÁM JELENTÉSE. Mértékegységet átírni csak a mennyiségekkel '
      + 'EGYÜTT szabad — vagy sehogy. Ahol dimenzió változik, ott a törzsnek, a készletnek, a '
      + 'folyamat-soroknak és az egységáraknak egyszerre kell mozdulnia (az pedig a főkönyv dolga, nem '
      + 'egy törzs-javító szerszámé). És: mielőtt egy szerszám tömegesen ír, meg kell kérdezni, MIT '
      + 'JELENTENEK a számok, amikhez nem nyúl. '
      + '· AZ OLVASÓ-OLDALI ALAK (2026-09-02): a szabály nem áll meg az ÍRÁSNÁL. Ha egy vetítés a MAI '
      + 'törzs-egységet teszi egy MÚLTBELI mozgás mellé, azzal visszamenőleg más MENNYISÉGET állít — '
      + 'írás nélkül, némán. A megkülönböztető nem a fájl, hanem hogy MIT vetít a sor: MOZGÁS-sornál a '
      + 'sor saját egysége az igazság (a törzs csak tartalék az egység nélküli, régi sorokra), '
      + 'POZÍCIÓ-sornál (készlet-egyenleg, tétel-készlet) a mai törzs-egység a helyes — ez NEVESÍTETT '
      + 'ellenpár, és mérni is kell, nehogy a szabály átcsússzon tiltásba (KUKA-048).',
    guard_note: '`npm run verify:stock-views` **SVW21** (5 pin, D-VS-637): a pin HÍVJA a vetítés-feloldót (a közös rács mozgás-egysége), méri a projekció-építőt (rendezés/szűrés/export ugyanazt kapja), az ELLENPÁRT (pozíció-vetítés a mai törzsön marad), rendszer-szintű szemlét fut padlóval — a dinamikus FROM-ú lekérdezéseket KIMONDVA hagyja ki és külön méri a párosításukat. Mindhárom visszacsúszásra bizonyítottan PIROS. · `npm run verify:product-unit-fix` PUN06 (9 pin): méri a dimenzió-összehasonlítást, az '
      + 'ÁTVÁLTÁS-kosarat, a kiszerelés-olvasót, a lábnyom-kivételt és a szolgáltatás-kihagyást — és azt '
      + 'is, hogy a kihagyás LÁTSZIK a jelentésben (nem néma).',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['tools/vs_fix_product_unit.mjs'],
        pattern: 'UPDATE\\s+stock_movement', flags: 'i',
        reason: 'a főkönyvet nem írja át törzs-javító szerszám' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_fix_product_unit.mjs'], pattern: 'r\\.unit_nav !== newNav',
        reason: 'a dimenzió-váltás gépi felismerése — enélkül a némán elforduló jelentés visszajön' }),
      Object.freeze({ paths: ['tools/vs_fix_product_unit.mjs'], pattern: 'if \\(r\\.is_service\\)',
        reason: 'a szolgáltatás egysége az ÁRALAP — a csomagolás mérete nem írhatja felül' }),
      Object.freeze({ paths: ['tools/vs_fix_product_unit.mjs'], pattern: 'const footprint =',
        reason: 'a LÁBNYOM dönt: ahol semmi nincs könyvelve, ott nincs mit átváltani' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-022',
    date: '2026-08-03',
    title: 'A VALIDÁLATLAN KORREKCIÓ AZ IMPORT BELSEJÉBEN — a betöltő nem a forrást hozta, hanem a hitünket',
    what: 'A KS→VS bundle-építőmben egy NÉV-ALAPÚ egység-felülíró futott (`unit_override`), ami a '
      + 'KS-mester igaz `Mee.` értékét eldobta, ha a termék NEVE illeszkedett egy mintára. A minta maga '
      + 'a #16-os operátori „egység-elírás" lista volt — egy JAVÍTANI VALÓ kívánság-lista, amit még '
      + 'senki nem ellenőrzött, és ami egy héttel korábban az IMPORT TRANSZFORMÁCIÓJÁBA került. '
      + 'Következmény: három terméken (016 · 018 · 029 + a bérmunka-párjaik) a KS literes igazsága '
      + 'DARAB-ra íródott, és mivel a felülírás a kanonikus metába ment vissza, a hamis egység a '
      + 'mozgás- és folyamat-sorok pillanatképeibe is BEÉGETT — nem csak a törzsre.',
    why_wrong: 'Az importnak EGY dolga van: a forrás igazságát behozni. Ha korrekciót épít magába, '
      + 'akkor (a) a forrás-igazság végleg elvész — nincs mihez visszatérni; (b) a hiba minden '
      + 'származtatott sorba továbbfolyik; (c) a korrekció visszafordíthatatlan, mert nincs külön '
      + 'lépés, amit vissza lehetne vonni. Ráadásul a szabály a NÉVRE épült, a név pedig nem bizonyíték: '
      + 'ugyanabban a tenantban a `Homoktövis velő 2 l` LITERES (saját/bérmunka vonal), a '
      + '`Homoktövis velő 2 l (Tövi)` viszont DARABOS — a nevük gyakorlatilag azonos. A szabály épp '
      + 'azért fogta egybe őket, mert csak a nevet nézte. Külön csapda: ahol a forrásban HIÁNYZOTT az '
      + 'érték, ott a hiány kapott nevet (`EGYSEG` placeholder), és a név ránézésre értelmesnek látszott, '
      + 'ezért 48 mozgás-soron át senki nem kérdezett rá.',
    replaced_by: 'KÉT LÉPÉS, SOHA EGY: (1) az import a forrás értékét hozza, felülírás nélkül — ami '
      + 'hiányzik, az maradjon ÜRESEN vagy kapjon kimondottan hibának látszó jelölést, ne emberi szót; '
      + '(2) a korrekció külön, futtatható, DRY-RUN alapértelmezésű, mentő táblás és visszafordítható '
      + 'szerszám (a `vs_fix_product_unit.mjs` mintája). A besorolást pedig nem a NÉV dönti el, hanem '
      + 'a forrás két független tanúja: a termék-mester egység-oszlopa ÉS a recept-arány (ha a '
      + 'kiszerelésnyi anyag ad egy kimenetet, a kimenet darab; ha 1 liter ad egyet, a kimenet liter).',
    decision: 'D-VS-346',
    found_by: 'operátor (a hipotézis: „a TÖVI termékek db-ok voltak … így minden, ami liter volt, '
      + 'közösítve lett a db-osokkal") — a gyökér-okot erre a nyomra követtem vissza a saját '
      + 'bundle-építőmben; a KS-export két tanúja igazolta',
    lesson: 'AZ IMPORT A FORRÁS IGAZSÁGÁT HOZZA, NEM A HITÜNKET. Korrekciós listát soha ne építs a '
      + 'betöltő transzformációjába: ott visszafordíthatatlan, láthatatlan, és elfedi a forrást. És '
      + 'ahol két rekord NEVE azonos, de a jelentése különbözik, a név nem bizonyíték — kell egy '
      + 'második, független tanú az adatból.',
    guard_note: '`npm run verify:product-unit-fix` PUN07: a szabálytábla KIMONDJA, hogy import után '
      + 'futó korrekció, és a KS-betöltő lánc egyetlen darabja sem hívhatja (ha valaki behúzná, piros).',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['tools/vs_ks_load_full.mjs', 'src/services/ksImportService.js'],
        pattern: 'productUnitFixRules',
        reason: 'a korrekciós szabálytábla NEM kerülhet a betöltő útjába — az import a forrást hozza' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/masterData/productUnitFixRules.js'], pattern: 'IMPORT UTÁN',
        reason: 'a szabálytábla maga mondja ki, hogy külön, visszafordítható lépés — nem import-transzformáció' }),
      Object.freeze({ paths: ['tools/vs_fix_product_unit.mjs'], pattern: 'product_unit_fix_backup',
        reason: 'a korrekció visszafordítható (mentő tábla) — szemben az importba égetettel' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-023',
    date: '2026-08-03',
    title: 'A BEOLVASZTÁS A RECEPTET IS ÁTVETTE — a származtatott sor némán fel-/leszorzódott',
    what: 'A KS→VS betöltésnél a `_` előtagú BÉRMUNKA-termékek beolvadtak a kódos ikerpárjukba. A '
      + 'beolvasztás az AZONOSSÁGON túl a RECEPTET is átvette: a szolgáltatás-sorokat a betöltő a CÉL '
      + 'termék receptjéből számolta. Ahol a két recept aránya eltért, a szolgáltatás némán elmozdult — '
      + 'három bizonylatról NYOM NÉLKÜL ELTŰNT (6710 liter pasztőrözés, `_Homoktövis velő 210 l`, mert '
      + 'a kódos ikerpár receptjében nincs szolgáltatás), egyen pedig HÁROMSZOROSÁRA nőtt (9 l a valós '
      + '3 helyett, mert a cél-termék receptje 3:1).',
    why_wrong: 'A készlet-sorok épek maradtak, mert azok a KS MOZGÁS-listájából jöttek — a '
      + 'szolgáltatásnak viszont nincs készlet-mozgása, ezért a betöltő a RECEPTBŐL származtatta. Így a '
      + 'forrás-bizonylat egy adata (a szolgáltatás mennyisége) egy MÁSIK termék törzs-adatából '
      + 'keletkezett. A hiba láthatatlan: minden bizonylat ÖNMAGÁBAN konzisztensnek látszik, és a '
      + 'készlet-egyenlegek is stimmelnek — csak a forrással összevetve derül ki. A pénz viszont '
      + 'ezen múlik: a szolgáltatás literre árazott.',
    replaced_by: 'A származtatott sor is a FORRÁS-BIZONYLATBÓL jöjjön, ne a cél-termék receptjéből; '
      + 'ahol a forrás nem mondja meg, ott a betöltő JELENTSE a hiányt, ne pótolja törzs-adatból. '
      + 'Gépi jel: `npm run audit:ks-service` (vs_ks_service_reconcile.mjs) — a KS-recept szerinti '
      + 'szolgáltatás-mennyiséget veti össze a betöltő-csomagban lévővel, bizonylatonként; és KIMONDJA '
      + 'azt is, hány bizonylatra nem vonatkozik a mérés (KUKA-012).',
    decision: 'D-VS-347',
    found_by: 'operátor — „nehogy kiderüljön, hogy ahol több gyártás van, ott is ilyen káosz '
      + 'keletkezett!" (az egyetlen ismert esetből követelte a rendszerszintű próbát — és jogosan: '
      + 'egy helyett négy bizonylat lett)',
    lesson: 'BEOLVASZTÁSKOR CSAK AZ AZONOSSÁG JÖN ÁT, A TÖRZS-ADAT NEM. Ha két rekordot egyesítünk, a '
      + 'RÁJUK ÉPÜLŐ származtatott sorokat továbbra is a forrás-bizonylatból kell számolni — különben a '
      + 'cél törzs-adata visszamenőleg átírja a történelmet, méghozzá némán. És: egyetlen eset soha nem '
      + 'zárja le a hiba-osztályt — a rendszerszintű próbát akkor is le kell futtatni, ha az első '
      + 'példány magyarázatot kapott.',
    guard_note: '`npm run audit:ks-service -- --ks <export> --bundle <csomag>` — READ-ONLY, út nélkül '
      + 'őszinte N/A (a KS-export üzleti adat, a repón kívül él, ezért a battériában nem futtatható). '
      + 'A `verify:kuka` a szerszám LÉTÉT és a nem-író mivoltát őrzi.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['tools/vs_ks_service_reconcile.mjs'],
        pattern: 'UPDATE |INSERT |DELETE ', flags: 'i',
        reason: 'az egyeztető MÉR, nem javít — a könyvelt sor írása motor-varrat, levéllel megy' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_ks_service_reconcile.mjs'], pattern: 'HIÁNYZÓ szolgáltatás-sor',
        reason: 'a hiányzó sor NEVET kap — a néma eltűnés volt maga a hiba' }),
      Object.freeze({ paths: ['tools/vs_ks_service_reconcile.mjs'], pattern: 'NEM MÉRT: \\$\\{notLoaded\\}',
        reason: 'a mérésből kimaradó bizonylatokat kimondja (a „0 eltérés" ne állítson többet a mértnél)' }),
      Object.freeze({ paths: ['tools/vs_ks_service_reconcile.mjs'], pattern: 'FELÜLÍRT PISZKOZAT',
        reason: 'a kimaradás OKÁT is megmondja (KS-állapot), nem csak a darabszámot — különben riasztásnak látszik' }),
      Object.freeze({ paths: ['tools/vs_ks_service_reconcile.mjs'], pattern: 'a BETÖLTÉS PILLANATÁT méri',
        reason: 'kimondja, hogy a BEMENETRŐL ítél, nem a mai adatbázisról (a javítás után is látszik itt a régi hiba)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-024',
    date: '2026-08-10',
    title: 'A MONDAT ÉP VOLT, A LISTA NEM — helyőrző↔paraméter eltérés a foglalás-lezáróban',
    what: 'A `stockReservationService.settleForProcess` UPDATE-je HÁROM helyőrzőt tartalmaz '
      + '(`$1..$3`), de NÉGY paramétert kapott: a negyedik (`LIVE_STATUSES`) a KÖZVETLENÜL FÖLÖTTE '
      + 'álló lekérdezésé, ahol `$4`-ként jogos — másolás-maradék. A Postgres az ilyet a BIND '
      + 'fázisban dobja el, a sorok vizsgálata ELŐTT („bind message supplies 4 parameters, but '
      + 'prepared statement requires 3"), tehát a hívás ÜRES adatbázison is mindig elhalt. A '
      + '`settleForProcess`-t a folyamat-motor `post` · `unconfirm` · `cancel` ága hívja: ez a három '
      + 'átmenet 2026-07-30 (7c977c8) óta EGYSZER SEM futott le.',
    why_wrong: 'A hiba nem a mondatban állt, hanem a mondat és a hozzá adott lista VISZONYÁBAN — és '
      + 'pontosan ezt nem mérte semmi. A meglévő RSV-pinek a forrás SZÖVEGÉT olvasták '
      + '(`released_at = CASE WHEN $3 = \'released\'`), az pedig ép volt, ezért a battéria végig zöld '
      + 'maradt egy halott motor fölött. A `catch`-be futó 500-as válasz ráadásul ugyanúgy néz ki, '
      + 'mint egy üzleti elutasítás (KUKA-020 rokona).',
    replaced_by: 'A hívás a saját alakjához igazítva (3 helyőrző → 3 paraméter), és fölé egy GÉPI őr, '
      + 'ami nem szöveget keres, hanem a KÉT OLDALT veti össze: `npm run verify:sql-param-arity` '
      + 'minden `.query(sql, [params])` hívásnál kiszámolja a legnagyobb `$N`-t és a tömb hosszát. '
      + 'Amit nem tud statikusan kiolvasni, azt nem ítéli meg — de MEGSZÁMOLJA, és a mérhető hívások '
      + 'számára külön padló van (KUKA-012: a néma zsugorodás is hiba).',
    decision: 'D-VS-351',
    found_by: 'ügynök — az egység-váltás (B-lépés) próbapadi könyvelése bukott el rajta; a hibaüzenet '
      + 'a `post`-ból jött, a forrása négy réteggel lejjebb volt',
    lesson: 'AHOL EGY HÍVÁSNAK KÉT OLDALA VAN, OTT A VISZONYT KELL MÉRNI, NEM AZ OLDALAKAT. Egy '
      + 'önmagában hibátlan SQL-mondat és egy önmagában hibátlan paraméter-lista együtt is lehet '
      + 'halott kód. A szöveg-egyezésre épülő pin ilyet SOHA nem lát — az csak azt hitelesíti, hogy a '
      + 'betűk a helyükön vannak. És: egy motor-mag átmenet elhalását nem szabad a felhasználói '
      + 'hibaüzenetre bízni, mert az ugyanúgy „nem sikerült"-nek látszik, mint egy jogos elutasítás.',
    guard_note: '`npm run verify:sql-param-arity` — READ-ONLY + offline, a repó teljes `src/**` és '
      + '`tools/**` fáján fut. SPA02 külön visszakérdezi a konkrét leletet (a foglalás-lezáró fájlját), '
      + 'SPA01 pedig a mérés épségét őrzi: ha az olvasó elromlik és a mérhető hívások száma összeomlik, '
      + 'PIROS lesz — nem csendes zöld.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/services/stockReservationService.js'],
        pattern: "toStatus, lotAllocation\\.LIVE_STATUSES\\],\\s*\\n\\s*\\);\\s*\\n\\s*return \\{ ok: true, settled",
        reason: 'a foglalás-lezáró UPDATE-je három helyőrzős — negyedik paramétert nem kaphat' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_verify_sql_param_arity.mjs'], pattern: 'maxPlaceholder',
        reason: 'az őr a helyőrzőt SZÁMOLJA, nem a mondatot olvassa' }),
      Object.freeze({ paths: ['tools/vs_verify_sql_param_arity.mjs'], pattern: 'legalább 1200 statikusan olvasható',
        reason: 'a mérés összeomlása pirosat ad — a néma zsugorodás nem mehet zöldben' }),
      Object.freeze({ paths: ['tools/vs_verify_sql_param_arity.mjs'], pattern: 'holeIsPlaceholderFree',
        reason: 'amit nem tud biztosan kiolvasni, azt kihagyja — a hamis riasztás is rontja a mérést' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-025',
    date: '2026-08-11',
    title: 'A PIPA, AMELYNEK NEM VOLT ÚTJA — címke-pipa a szinkronizált bejegyzésen, kiküldő-kapocs nélkül',
    what: 'A bejegyzés-részletezőn a címke pipálható és menthető volt, de a mentett pipát SEMMI nem '
      + 'vitte a boltba: (1) a kiküldő-hívó (CPO-01) a bejegyzést az olvasó item-sorából adta át, a '
      + 'címkék pedig az olvasó KÜLÖN tags-mezőjében jönnek — a modell KÉSZ címke-varrata (D-VS-295: '
      + 'cmsContentTags bizonyított alakkal, pinnel!) így mindig ÜRES listát kapott; (2) a pipa-mentés '
      + 'nem billentett semmit, amit bármely kiküldő-út figyel: a behúzott bejegyzés published, azt az '
      + 'automata nem válogatja (approved-ot néz), a Kiküldés gomb terve pedig blokkolja — az operátor '
      + 'kérdése („mire kell kattintani, hogy felmenjen az SH-ba?") gépi válasza a SEMMIRE volt. '
      + 'Ráadásul három külön „mentése" gomb kattintatott ott, ahol a pipa maga a döntés.',
    why_wrong: 'KÉT ép oldal, halott viszony (a KUKA-024 alakja a vezetékezésben): a modell-pin a '
      + 'varrat VISELKEDÉSÉT mérte, de senki nem mérte, hogy a HÍVÓ megeteti-e — a battéria zölden '
      + 'állt egy olyan lánc fölött, amiben a címke sosem indult el. És ami a képernyőn pipálható, '
      + 'annak a rendszer többi automatájáig KIMONDOTT út kell (a KUKA-015 rokona kifelé): a mentés, '
      + 'ami csak egy kapcsoló-táblát ír, a felhasználó szemében „elküldtem", a gép szemében semmi.',
    replaced_by: 'D-VS-353: a hívó címkéstül adja át a bejegyzést (item = {…detail.item, tags: '
      + 'detail.tags}); a pipa-mentés után EGY írón (CST-01 reopenAfterMetadataChange) újranyílik a '
      + 'kiküldés útja — a változás-óra billen (updated_at, az automata ebből lát), kiküldött tételt a '
      + 'rendszer léptet vissza és jóváhagyási joggal ugyanabban a mozdulatban vissza is hagy jóvá '
      + '(D-VS-323 vonala: a kattintás közös, a kapu nem). A három külön mentés-gomb kivezetve: a pipa '
      + 'magától mentődik, és a képernyő a szerver válaszából mondja ki, mi viszi el a változást.',
    decision: 'D-VS-353',
    found_by: 'operátor — „ha egy címkét becheckolok egy — szinkronizált — bejegyzésen belül, akkor '
      + 'mire kell ahhoz kattintani, hogy felmenjen az SH-ba a VS-ből? ha semmire, akkor mégegyszer, '
      + 'minek ennyi gomb?" (2026-08-11)',
    lesson: 'A VARRAT KÉSZENLÉTE NEM A LÁNC KÉSZENLÉTE — a pin, ami csak a fogadó oldalt méri, nem '
      + 'látja, hogy a hívó üresen eteti (a viszonyt kell mérni, nem az oldalakat — KUKA-024 a '
      + 'vezetékezésben). És minden felületi írás mellé ki kell mondani, MI VISZI EL a változást a '
      + 'rendszer többi részéig: új pipa/mező felvitelekor a kérdés nem csak „KI OLVASSA?" (KUKA-015), '
      + 'hanem „MI VISZI KI?" is. Ahol pedig a pipa maga a döntés, ott a külön mentés-gomb könyvelés — '
      + 'azt a gép végzi, nem az operátor.',
    guard_note: 'CL56 a tartalom-verifierben: a hívó→varrat viszony (detail.tags → item.tags → '
      + 'cmsContentTags a payloadban, VISELKEDÉSSEL mérve), az újranyitó író viselkedése (változás-óra '
      + '+ published visszaléptetés próba-klienssel), mindhárom pipa-út bekötése, a gombok kivezetése, '
      + 'és hogy pipa-mentés nem rajzolja újra a képernyőt (a szerkesztő nem mentett szövege védett).',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/sync/contentPushOrchestrator.js'],
        pattern: 'planPush\\(\\{ item: detail\\.item',
        reason: 'a terv a címkéstül összerakott item-et kapja — a detail.item önmagában címke nélküli' }),
      Object.freeze({ paths: ['public/js/marketing-content-detail.mjs'],
        pattern: 'Címkék mentése|Blogok mentése|Célok mentése',
        reason: 'a pipa maga a döntés — a külön mentés-gomb könyvelés volt, kivezetve (D-VS-353)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/sync/contentPushOrchestrator.js'], pattern: 'tags: detail\\.tags',
        reason: 'a hívó megeteti a varratot — a címke a kiküldött bejegyzésen utazik' }),
      Object.freeze({ paths: ['src/content/contentStoreService.js'], pattern: 'reopenAfterMetadataChangeVia',
        reason: 'a pipa-mentés útja EGY írón nyílik újra (változás-óra + gépi visszaléptetés)' }),
      Object.freeze({ paths: ['src/routes/marketing.routes.js'], pattern: 'reopenPushAfterChange',
        reason: 'mindhárom pipa-út (címke · blog · cél) bekötve az újranyitóra' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-026',
    date: '2026-08-11',
    title: 'A KUDARC KÖNYVELÉSE A SIKER TRANZAKCIÓJÁBAN — „⛔ VMSH1: 400", és nyoma sem maradt',
    what: 'Az első éles címkés kiküldésre a bolt 400-at adott, és a képernyő CSAK A SZÁMOT mondta — '
      + 'pedig az író-kliens a bolt hiba-testét (a saját mondatát) végig visszaadta, csak a könyvelés '
      + 'dobta el (last_error = „400"). A nagyobb baj: a kiküldő a kudarc könyvelését (cél-sor '
      + 'hibaszövege + napló-sor) UGYANABBAN a tranzakcióban írta, amit az orchestrátor üzleti '
      + 'kudarcnál visszagörgetett — a hibának a pillanat-üzeneten kívül SEMMI nyoma nem maradt: a '
      + 'naplóban nincs sor, a cél-soron nincs ⛔, és több-csatornás részleges sikernél a MÁR LÉTREJÖTT '
      + 'bolti bejegyzés azonosítója is elveszett volna (a következő kiküldés duplikátumot szülne).',
    why_wrong: 'A kudarc könyvelése nem utazhat abban a tranzakcióban, amit maga a kudarc görget '
      + 'vissza — ez a KUKA-012 némaság-család tranzakciós alakja: a rendszer tudta az okot, és a '
      + 'visszagörgetés elfelejtette. A szám (400) önmagában nem ok: a bolt megmondta a magáét, a mi '
      + 'dolgunk kiírni és megőrizni.',
    replaced_by: 'D-VS-354: (1) shopErrText — a bolt hiba-testéből a MONDAT kijön (kulcs-névvel), és a '
      + 'cél-sor + napló + képernyő ezt hordozza; (2) az orchestrátor üzleti kudarcnál COMMIT-ol '
      + '(rollback csak a semmit-nem-írt elő-blokknál és a váratlan hibánál); (3) a kiküldés naplója a '
      + 'KÖZÖS írón (SRL-01) megy, tranzakción KÍVÜL, csatornánkénti neves jegyzettel; (4) hiba-'
      + 'elkülönítő: 4xx-es CÍMKÉS csomagnál egy ismétlés címke nélkül — a bolt maga választja szét a '
      + 'két gyanút, és mindkét kimenet névvel könyvelődik.',
    decision: 'D-VS-354',
    found_by: 'operátor — az első éles címkés kiküldés: „A kiküldés elakadt: ⛔ VMSH1: 400" (2026-08-11); '
      + 'a naplóban és a cél-soron az ügynök találta meg a nyom-nélküliséget',
    lesson: 'A KUDARC KÖNYVELÉSE NEM UTAZHAT A VISSZAGÖRGETETT TRANZAKCIÓBAN. Ahol egy írás-lánc '
      + 'hibázhat, ott a hiba nyomának (ok-szöveg, napló-sor, részleges sikerek azonosítói) a '
      + 'tranzakció SORSÁTÓL FÜGGETLENÜL meg kell maradnia — különben a rendszer a legfontosabb '
      + 'pillanatban némul el. És a külső rendszer hibájából a MONDATOT kell megőrizni, nem a számot: '
      + 'a szám csak annyit mond, hogy baj van; a mondat azt, hogy MI.',
    guard_note: 'CL57 a tartalom-verifierben: shopErrText VISELKEDÉSSEL (message/errors/mezőnkénti '
      + 'kulcsok), last_error a bolt mondatából, hiba-elkülönítő jelen, napló a közös írón tranzakción '
      + 'kívül, orchestrátor-rollback csak elő-blokknál, a felület a siker melletti megjegyzést is mutatja.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/sync/contentPushOrchestrator.js'],
        pattern: "if \\(out\\.ok === false\\) \\{ await client\\.query\\('ROLLBACK'",
        reason: 'üzleti kudarcnál a könyvelésnek meg kell maradnia — feltétlen rollback nem jöhet vissza' }),
      Object.freeze({ paths: ['src/sync/shoprenterContentPushService.js'],
        pattern: "String\\(res\\.error \\|\\| res\\.status \\|\\| 'ismeretlen hiba'\\)",
        reason: 'a cél-sor hibaszövege a bolt MONDATÁT hordozza, nem a puszta számot' }),
      Object.freeze({ paths: ['src/sync/shoprenterContentPushService.js'],
        pattern: 'INSERT INTO shoprenter_sync_run',
        reason: 'a kiküldés naplója a közös írón (SRL-01) megy, tranzakción kívül — saját INSERT nincs' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/sync/shoprenterContentPushService.js'], pattern: 'function shopErrText',
        reason: 'a bolt mondata kinyerhető és könyvelhető — a szám önmagában nem ok' }),
      Object.freeze({ paths: ['src/sync/contentPushOrchestrator.js'], pattern: "out\\.error === 'content_push_blocked'\\) \\{ await client\\.query\\('ROLLBACK'",
        reason: 'rollback csak ott, ahol még semmi nem íródott — a kudarc könyvelése túléli' }),
      Object.freeze({ paths: ['src/sync/shoprenterContentPushService.js'], pattern: 'syncRunLog\\.logRun',
        reason: 'a futás-napló a közös írón, a tranzakció sorsától függetlenül' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-027',
    date: '2026-08-12',
    title: 'A VAK KÓD-PÁR A KÖZÖS BOLTON — bolt 050 (VL diólaj) ⇔ sipi 050 (fűszerpaprika)',
    what: 'A kód-alapú termék-párosítás (D-VS-339) a bolt SKU-ját és a VS termék-kódját EGYETLEN '
      + 'tanúként kezelte: ha a két szám egyezett, a pár létrejött. Saját bolton ez elég is volt. '
      + 'A több-tenantos próbán (egy KÖZÖS bolt, három tenant-kapcsolat) viszont a bolt 050-es SKU-ja '
      + '(a VL „BIO Dió olaj 200 l" cikke) a sipi tenant SAJÁT 050-es kódjával („I. o. erős '
      + 'fűszerpaprika őrlemény 30 kg zsák") állt volna párba — két KÜLÖNBÖZŐ termék, csak a számuk '
      + 'közös. A pár mentése után a rendelés-import a sipi paprikájára oldotta volna fel a VL '
      + 'diólaj-rendeléseit.',
    why_wrong: 'Közös csatornán az azonosító csak a SAJÁT tenant terében egyedi — két tenant '
      + 'kód-tere átfedhet, ezért a kód-egyezés ott EGYEDÜL nem bizonyíték. Ez a KUKA-022 tükör-alakja: '
      + 'ott a NÉV nem volt bizonyíték és kellett mellé a második tanú; itt a KÓD nem az, és ugyanúgy '
      + 'kell mellé a második, független tanú.',
    replaced_by: 'D-VS-372: KÉT-TANÚ szabály — a kód-egyezés mellé NÉV-ROKONSÁG is kell '
      + '(nameAffinity ≥ küszöb); ha a második tanú hallgat, a pár NEM jön létre, hanem nevesített '
      + 'kód-ütközés listára kerül, ahol az OPERÁTOR dönt egy kattintással (kézi párosítás, naplózva). '
      + 'A név továbbra sem párosít egyedül (KUKA-022) — a két tanú együtt kell.',
    decision: 'D-VS-372',
    found_by: 'operátor — a sipi-kapcsolat próbáján: „a harmadik butaság: bolt: BIO Dió olaj 200 l '
      + '(SKU: 050) ⇔ VS: 050 — I. o. erős fűszerpaprika őrlemény 30 kg zsák" (2026-08-12)',
    lesson: 'KÖZÖS CSATORNÁN MINDEN AZONOSÍTÓ CSAK A SAJÁT TERÉBEN EGYEDI. Ahol több tenant ír egy '
      + 'külső rendszerbe, ott az egy-kulcsos megfeleltetés előbb-utóbb idegen rekordot köt össze — '
      + 'a párosításhoz KÉT független tanú kell, és ahol a tanú hallgat, ott ember dönt, gép nem.',
    guard_note: 'CL67 a tartalom-verifierben: az ÉLŐ hamis párt (050↔050) VISELKEDÉSSEL játssza vissza '
      + 'a valódi tervezőn — ütközés-listára kell mennie, párba nem; a rokon-nevű kód-egyezésnek '
      + 'párosodnia kell; a kézi párosítás lánca (javaslat-sor azonosítóval → gomb → útvonal → napló) áll.',
    positive: Object.freeze([
      Object.freeze({ paths: ['src/sync/productPairingService.js'], pattern: 'NAME_WITNESS_MIN',
        reason: 'a második tanú (név-rokonság) küszöbbel, nevesítve él a tervezőben' }),
      Object.freeze({ paths: ['src/sync/productPairingService.js'], pattern: 'code_conflicts',
        reason: 'a tanú nélküli kód-egyezés NEVESÍTETT ütközés-listára megy, nem párba' }),
      Object.freeze({ paths: ['src/sync/productPairingService.js'], pattern: 'function applyManualPairs',
        reason: 'az operátori döntésnek van gépi útja (kézi párosítás, naplózva)' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-028',
    date: '2026-08-14',
    title: 'A MÁSODIK TEREMTŐ — CREATE TABLE IF NOT EXISTS egy MÁS ALAKÚ, élő táblára (949 vs 015)',
    what: 'A termékkép-letöltő (949) saját product_media táblát DEKLARÁLT (media_id → content_media, '
      + 'sort_order oszloppal) — miközben a VS-ben már JÚLIUS ÓTA élt egy TELJES média-alapzat '
      + '(migration_015: media_asset + product_media, media_id → media_asset, display_order oszloppal, '
      + 'feltöltő-szervizzel és szerkesztő-szekcióval). A CREATE TABLE IF NOT EXISTS a meglévő táblán '
      + 'NÉMÁN átlépett, a 949-es alak sosem jött létre — az író viszont a 949-es alakra írt: élesben '
      + '42703 (column sort_order does not exist), miközben a séma-képernyő „rendben"-t mondott '
      + '(a schema_version szerint a 949 alkalmazva volt — csak épp a fele no-op lett). Ráadásul a '
      + 'hibakezelő a valódi Postgres-mondatot egy FELTÉTELEZETT diagnózisra cserélte („949 nincs '
      + 'lefuttatva"), ami hamis nyomra vitt egy teljes kört.',
    why_wrong: 'Séma-teremtés előtt nem kerestem rá, létezik-e már ilyen nevű tábla a migráció-'
      + 'állományban (KUKA-005 séma-fegyelmének teremtő-oldali párja) — és ezzel a kép fogalmának KÉT '
      + 'otthona lett (media_asset a 015-ből · content_media a 943-ból), pontosan a KUKA-018 kettős-'
      + 'ábrázolás csapdája. Az IF NOT EXISTS idempotencia-eszköz, nem ütközés-feloldó: MÁS alakú élő '
      + 'táblán néma hazugsággá válik.',
    replaced_by: 'D-VS-381: a termékkép a KANONIKUS 015-ös alapzatra költözött — eszköz a '
      + 'mediaService.upload-dal, kötés a confirmAttach-csal (role + display_order), bolti út-dedup a '
      + 'media_asset.external_path-on (952); a bájt-tár Railway-biztos DB-meghajtót kapott '
      + '(storageAdapter „db" ág + media_blob — a 943 tanulsága immár az alapzaton). A content_media '
      + 'a BLOG deklarált otthona marad; egyesítés csak kimondott döntéssel. A séma-gyanús hibák '
      + 'mostantól a VALÓDI kódot+mondatot hordozzák.',
    decision: 'D-VS-381',
    found_by: 'operátor — az éles kép-letöltés kudarca; a valódi okot a javított hibaüzenet mondta ki '
      + '(42703: column sort_order of relation product_media does not exist, 2026-08-14)',
    lesson: 'ÚJ TÁBLA TEREMTÉSE ELŐTT KÖTELEZŐ A NÉV-EGYEZÉS KERESÉS a teljes migráció-állományban — '
      + 'az IF NOT EXISTS más alakú élő táblán néma no-op, és a schema_version könyvelése ettől még '
      + '„rendben"-t mutat (a KUKA-019 rokona: a könyvelés nem séma-bizonyíték). És a hiba-fordítás '
      + 'SOHA ne cserélje le a forrás-rendszer mondatát a saját feltételezésére.',
    guard_note: 'CL71/2 a tartalom-verifierben: a képletöltő a mediaService-en ír (grep), közvetlen '
      + 'INSERT a product_media/media_asset táblákba a sync-rétegből TILTOTT, a 952 tényei mérve.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/sync'],
        pattern: 'INSERT INTO product_media',
        reason: 'a termék↔kép kötést csak a kanonikus média-író (confirmAttach) hozhatja létre' }),
      Object.freeze({ paths: ['src/sync'],
        pattern: 'INSERT INTO media_asset',
        reason: 'média-eszközt csak a mediaService.upload teremthet (content-addressed kulcs, allowlist)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/sync/productContentPullService.js'], pattern: 'mediaService\\.upload\\(',
        reason: 'a kép a kanonikus feltöltőn megy be' }),
      Object.freeze({ paths: ['src/sync/productContentPullService.js'], pattern: 'mediaService\\.confirmAttach\\(',
        reason: 'a kötés a kanonikus kapcsolón jön létre' }),
      Object.freeze({ paths: ['migrations/migration_952_media_db_store.sql'], pattern: 'CREATE TABLE IF NOT EXISTS media_blob',
        reason: 'a média-alapzat DB bájt-tára (Railway-biztos) létezik' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-029',
    date: '2026-08-15',
    title: 'A SZÁMLÁLÓ A NYERS ALAKOT NÉZTE — a GTIN „következő szabad szám" MAX-keresése a tárolt szövegen futott, míg az érvényesítő a gyógyított (számjegy-csak) alakot olvasta',
    what: 'A GTIN-kiosztó felhasználás-számlálója (prefixRowsWithUsage) char_length=13 + prefix-regex '
      + 'feltétellel a NYERS barcode_gtin szövegen keresett. A KS-korszakból jött vonalkódok tagolt '
      + 'alakban is állhatnak a mezőben (szóköz/kötőjel/láthatatlan határoló), így a számláló NULLA '
      + 'kiadott számot talált, és a VL karton-terv a tartomány ELEJÉRŐL (…140001, 000-s sorszám) '
      + 'ajánlott — miközben a …016/…104 sorszámú vonalkódok bizonyítottan éltek (a vsné gépi 14-esei '
      + 'éppen belőlük származtak). A JS-oldal (gs1.normalizeDigits) ugyanezeket az értékeket '
      + 'meggyógyítva érvényesnek látta — a két réteg MÁS valóságot olvasott ugyanarról a fogalomról.',
    why_wrong: 'Ugyanannak a fogalomnak (vonalkód) két olvasási alakja élt: az érvényesítő/származtató '
      + 'a gyógyított, a számláló a nyers alakot nézte (a KUKA-018 kettős-ábrázolás rokona, adat-alak '
      + 'kiadásban). És a nemleges lelet gyanú nélkül ment tovább (KUKA-010): a „senki nem használ '
      + 'semmit" válasz egy bizonyítottan használt tartományra épp a legerősebb hibajel lett volna.',
    replaced_by: 'D-VS-386/3: a MAX-keresés ÉS az ütközés-őr is a SZÁMJEGY-CSAK alakon fut '
      + '(regexp_replace a scanben) — a számláló és az érvényesítő ugyanazt az alakot látja. A terv-kapu '
      + '(operátori szem az éles beírás előtt) fogta meg, mielőtt egyetlen szám kiment volna.',
    decision: 'D-VS-386',
    found_by: 'operátor — a VL GTIN-terv 000-tól induló számsora („ez megint butaság"), 2026-08-15',
    lesson: 'AHOL EGY ÉRTÉKNEK TÁROLT ÉS GYÓGYÍTOTT ALAKJA IS ÉL, MINDEN OLVASÓ A GYÓGYÍTOTT ALAKOT '
      + 'NÉZZE — a kereső/számláló SQL ugyanazt a normalizálást futtassa, amit a validátor a kódban; '
      + 'és ha egy számláló NULLÁT mond egy bizonyítottan használt tartományra, az nem kiindulási '
      + 'állapot, hanem hibajel, aminek utána kell menni.',
    guard_note: 'CL76 lánc-pin: a felhasználás-scan regexp_replace-normalizált alakon, tenant-szűrés '
      + 'nélkül fut; a nyers char_length(barcode_gtin) minta a generátor-szervizben TILTOTT.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/services/gs1PrefixWriteService.js'],
        pattern: 'char_length\\(barcode_gtin\\)',
        reason: 'a számláló nem olvashat nyers alakot — számjegy-csak normalizálás kötelező (KUKA-029)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/services/gs1PrefixWriteService.js'], pattern: "regexp_replace\\(barcode_gtin, '\\[\\^0-9\\]', '', 'g'\\)",
        reason: 'a MAX-keresés és az ütközés-őr a gyógyított (számjegy-csak) alakon fut' }),
      Object.freeze({ paths: ['src/services/gs1PrefixWriteService.js'], pattern: "regexp_replace\\(gtin, '\\[\\^0-9\\]', '', 'g'\\)",
        reason: 'a szint-GTIN ág is a gyógyított alakon fut' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-030',
    date: '2026-08-15',
    title: 'A NÉMÁN ÁTTIPIZÁLT PARAMÉTER — SUBSTRING(x FROM $1 FOR $2) kötött paraméterrel a MINTA-illesztő változatra oldódott fel, és NULL-t adott hiba nélkül',
    what: 'A GTIN-számláló sorszám-kivágása SUBSTRING(mező FROM $1 FOR $2) alakban futott. A pg-driver '
      + 'a paramétereket típus nélkül köti, a Postgres pedig a tipizálatlan hívást a HÁROM-SZÖVEGES '
      + '(minta+escape) substring-változatra oldotta fel: az eredmény MINDEN sorra néma NULL — se '
      + 'hibakód, se üzenet. Ezért a számláló nulla kiadott számot látott, és a karton-terv a tartomány '
      + 'elejéről (…140001) ajánlott — olyan számokat, amik LÁTHATÓAN termékeken ültek. A hiba az '
      + 'ELSŐ (D-VS-200-as) kiadás óta élt a kanonikus szervizben: a termék-szerkesztő „következő '
      + 'EAN" javaslata is emiatt volt néma/hibás. Két kör (alak-elmélet: /2 tenant-szűkítés, /3 '
      + 'nyers-vs-gyógyított) ELMÉLETRE javított — a valódi mechanizmust a HELYI PRÓBAPAD mutatta meg '
      + '(scratch Postgres + a pontos SQL a repó pg-driverén át: literállal „000", paraméterrel NULL).',
    why_wrong: 'Tipizálatlan paraméter túlterhelt SQL-függvényben MÁSIK JELENTÉST kaphat — és a rossz '
      + 'feloldás nem hibát dob, hanem néma NULL-t (a KUKA-020 mindent-elnyelő-catch családja, '
      + 'SQL-alakban; a KUKA-024 rokona: a mondat és a kötés VISZONYA volt hibás, nem az oldalak). '
      + 'És két javító-kör ment el úgy, hogy a hibát nem REPRODUKÁLTUK gépen — az elmélet-alapú '
      + 'javítás kétszer mellélőtt, miközben egyetlen próbapad-futás azonnal a gyökeret mutatta.',
    replaced_by: 'D-VS-386/5: SUBSTRING(g FROM $1::int FOR $2::int) — explicit típus-kényszer; '
      + 'próbapadon bizonyítva (maxref=104 a vegyes: tiszta+tagolt fixtúrán). A javító-szerszám '
      + '(vs_barcode_digits_repair) számláló-PRÓBÁT nyomtat a kanonikus szervizzel — deploy-független '
      + 'bizonyíték az operátor gépén.',
    decision: 'D-VS-386',
    found_by: 'dev-sáv, helyi próbapadon (scratch Postgres) — az operátor harmadik „butaság"-jelzése '
      + 'után („deployment successful… még mindig nem jó!!"), 2026-08-15',
    lesson: 'SQL-FÜGGVÉNY PARAMÉTERÉT TÍPUSSAL KELL KÖTNI, ahol a függvény túlterhelt (::int a '
      + 'SUBSTRING FROM/FOR alaknál) — a néma NULL ugyanolyan hazugság, mint a néma catch. És VISSZATÉRŐ '
      + 'hibánál a javítás előtt REPRODUKÁLNI kell gépen (próbapad), nem elméletet cserélni: a második '
      + '„még mindig rossz" jelzés után az elmélet-alapú kör tilos.',
    guard_note: 'CL76 lánc-pin: a ::int-kényszeres alak kötelező + a kényszer nélküli SUBSTRING( FROM '
      + '$N FOR $N ) minta tiltott a generátor-szervizben.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src'],
        pattern: 'FROM \\$\\d+ FOR \\$\\d+\\)',
        reason: 'SUBSTRING kötött paraméterrel csak ::int típus-kényszerrel — enélkül a Postgres némán a minta-változatot futtatja (KUKA-030)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/services/gs1PrefixWriteService.js'], pattern: 'SUBSTRING\\(g FROM \\$1::int FOR \\$2::int\\)',
        reason: 'a sorszám-kivágás típus-kényszeres alakon fut' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-031',
    date: '2026-08-17',
    title: 'A BEÉGETETT GÉP-ÚT A SZÁLLÍTOTT ESZKÖZBEN — require(\'/home/user/vs/…\') az operátor gépén nem létezik',
    what: 'A bizonylatszám-pótló (fix:doc-series) első éles futtatása MODULE_NOT_FOUND-dal halt el: az '
      + 'eszköz a fejlesztő-környezet abszolút útján (/home/user/vs/src/db) kereste a db-modult, ami az '
      + 'operátor gépén (…/DESIGN + WEB/vfamily/00_Admin/vs) nem létezik. A söprés végig zöld volt: a '
      + 'verifier-ek ugyanabban a környezetben futnak, ahol az út történetesen él. A repó-átfésülés két '
      + 'RÉGEBBI eszközben (label/scan böngésző-proof) UGYANEZT a mintát találta.',
    why_wrong: 'a fejlesztő-környezet ténye (hol lakik a repó) az eszköz kódjába égett — a KUKA-007 '
      + '(„az operátor környezetét nem tippelem") kód-alakja: minden gépen mást jelent, és pont ott '
      + 'törik, ahol az operátor futtatja. A hordozható horgony (import.meta.url) végig rendelkezésre állt.',
    replaced_by: 'mindhárom eszköz a SAJÁT fájljához képest oldja fel az utat: '
      + "resolve(dirname(fileURLToPath(import.meta.url)), '..') + join(ROOT, …) — géptől független.",
    decision: 'D-VS-409/2',
    found_by: 'az operátor, az ELSŐ éles futtatáson (npm run fix:doc-series → MODULE_NOT_FOUND), 2026-08-17',
    lesson: 'SZÁLLÍTOTT KÓDBA ABSZOLÚT KÖRNYEZET-ÚT SOHA — az eszköz útja önmagához képest oldódik fel. '
      + 'És az „operátor-futtatható" eszköz próbája nem a saját környezetben zöld futás: a hordozhatóság '
      + 'gépi jel nélkül nem tény (a zöld söprés itt semmit nem bizonyított).',
    guard_note: 'a tiltó minta escape-elt alakban áll, hogy önmagára ne illjen; a pozitív pin a javított '
      + 'pótló horgonyát méri.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['tools', 'src', 'public'],
        pattern: '\\/home\\/user\\/',
        reason: 'beégetett fejlesztő-környezeti abszolút út szállított kódban — az operátor gépén nem létezik (KUKA-031)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_fix_doc_series.mjs'], pattern: 'fileURLToPath\\(import\\.meta\\.url\\)',
        reason: 'a pótló a saját fájljához képest oldja fel a repó-gyökeret' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-032',
    date: '2026-08-17',
    title: 'A HALOTT MOUNT-ÚT — a kliens /system/shares-t hívott, a route a /master előtag alatt élt',
    what: 'A Megosztások képernyő MINDEN útvonala (lista · megosztás · visszavonás) a kiadás (D-VS-397) '
      + 'óta 404-re futott: a route-blokk a master.routes-ban állt, amit az app a /master előtag alá '
      + 'szerel — a valódi cím /master/system/shares lett, a kliens pedig /system/shares-t hívott. A '
      + 'battéria végig zöld volt: a pin a FORRÁS szövegét mérte (route-definíció + kliens-hívás külön-'
      + 'külön ép), a mount × útvonal VISZONYÁT senki. A hibát a D-VS-413-es árnyék-kör élő app-próbája '
      + 'fogta meg, nem teszt és nem operátor.',
    why_wrong: 'a route-definíció önmagában nem cím — a cím a mount-előtag ÉS az útvonal együtt. Két '
      + 'külön-külön ép oldal (KUKA-024 viszony-elve a route-térben) holt utat adott; a képernyő pedig '
      + 'általános hibát mutatott volna (a 404 a hálózati-hiba ágra esik — KUKA-012 némaság).',
    replaced_by: 'a shares-blokk a system.routes-ba költözött (a /system mount alá — a kliens-utak '
      + 'változatlanul helyesek), és ÚJ gépi jel őrzi az osztályt: verify:route-resolution — az ÉLŐ '
      + 'expressz app-on kéri a kliens-hívta utakat, a 404/501 bukás.',
    decision: 'D-VS-413',
    found_by: 'Claude-VS-Dev, az árnyék-felület élő útvonal-próbáján (2026-08-17) — kiadás előtti gépi lelet',
    lesson: 'ÚJ ROUTE A KLIENSNEK = a TELJES CÍMET kell mérni (mount + útvonal), nem a definíció '
      + 'szövegét — és a mérendő út-listát sem az emlékezet tartja: a próba MAGA takarítja be a '
      + 'felület-kódból (D-VS-416: literál + template + összefűzés értelmező; ige-lyuk családok '
      + 'kimondott ige-készlettel; kihagyás csak nevesítve). A forrás-pin a viszonyt nem látja; '
      + 'az élő app-próba igen.',
    guard_note: 'tiltó minta nincs (a mount-előtag legális eszköz) — az őr a POZITÍV oldal: az '
      + 'automata betakarítós feloldás-próba léte (DB-kiürítéssel: az írás-metódusú próbák élő '
      + 'adatot sose érnek) + a shares-utak a system.routes-ban.',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_verify_route_resolution.mjs'], pattern: 'function harvest\\(',
        reason: 'a kliens-hívott utak AUTOMATA betakarítása az élő app-próbában — a 404/501 bukás (D-VS-416)' }),
      Object.freeze({ paths: ['tools/vs_verify_route_resolution.mjs'], pattern: "process\\.env\\.DATABASE_URL = ''",
        reason: 'a próba DB-telen fut — az írás-metódusú próbák élő adatot sohasem érhetnek' }),
      Object.freeze({ paths: ['src/routes/system.routes.js'], pattern: "router\\.get\\('\\/shares'",
        reason: 'a shares-blokk a /system mount alatt él — a kliens-út (/system/shares) a teljes címen helyes' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-033',
    date: '2026-08-18',
    title: 'A MÉRETLENÜL BIZTOSNAK KIADOTT SZABÁLY — „család-gyerek ⇒ Késztermékek" 36%-on',
    what: 'A kategória-betöltő első kiadásában a „Kiszerelés szerint" tengelyt a CSALÁDFÁBÓL vezettem '
      + 'le (család-gyerek ⇒ Késztermékek · göngyöleg-szint ⇒ Gyűjtős · egyik sem ⇒ Alapanyag), és a '
      + 'forrást `biztos: true`-ként adtam ki. A szerszám SAJÁT mérése buktatta meg az operátor első '
      + 'éles futásán: a KS-adaton 12/33 egyezés (36%) — 21 terméken (velő 5/10/20 l · dió olaj '
      + '200 l · lenmag 25 kg · liszt 10 kg …) a KS ALAPANYAGOT mond, a szabály KÉSZTERMÉKET. Ahol a '
      + 'KS hallgat (199 termék), ez némán rossz adatot írt volna, bizonyítékként jelölve.',
    why_wrong: 'a családfa a KISZERELÉST írja le, nem a SZEREPET. Az operátor mondata adja a valódi '
      + 'tényt: „van áruk, de alapanyagként használjuk" — a 20 literes velő kiszerelt, mégis alapanyag, '
      + 'mert MI dolgozzuk fel. A gépi hiba nem a szabály létezése volt, hanem hogy MÉRÉS ELŐTT '
      + 'bizonyítéknak jelöltem (a mérés ugyanabban a kiadásban készült el — a sorrend fordítva helyes).',
    replaced_by: 'a HASZNÁLAT-szabály (packagingNodeByUse): göngyöleg-szint ⇒ Gyűjtős (ez szerkezeti '
      + 'tény, BIZTOS) · feldolgozásba megy ⇒ Alapanyag (JAVASLAT) · egyébként ⇒ Késztermékek '
      + '(JAVASLAT). Ugyanaz a mozgás-tanú, amit az ár-térkép „útja" oszlopa használ. A betöltő MINDKÉT '
      + 'szabályt kiírja a KS-adaton mérve, hogy a javulás LÁTSZÓDJON.',
    decision: 'D-VS-428',
    found_by: 'az operátor első éles PRÓBA-futásán (2026-08-18) — a szerszám saját második-tanú mérése mutatta meg',
    lesson: 'LEVEZETETT SZABÁLYT SOHA NE JELÖLJ BIZONYÍTÉKNAK, amíg a mérése le nem futott. A `biztos` '
      + 'jelölés ígéret: azt mondja, a gép a helyedben dönthet. Ha a szabály még nincs megmérve, a '
      + 'helyes alak a JAVASLAT (jelölve), és a mérés eredménye emeli bizonyítékká — nem a szerző '
      + 'meggyőződése. A KUKA-022 („a név nem bizonyíték") párja a levezetett szabályokra.',
    guard_note: 'tiltó minta: a kivezetett packagingNodeByStructure név nem térhet vissza; pozitív '
      + 'oldal: a HASZNÁLAT-szabály léte, a `biztos: false` a javaslat-ágakon, és a betöltő kettős mérése.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/masterData/categoryAxisModel.js', 'tools/vs_category_load.mjs'],
        pattern: 'packagingNodeByStructure',
        reason: 'a családfából levezetett kiszerelés-szabály kivezetve (36%-on bukott) — a HASZNÁLAT dönt' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/masterData/categoryAxisModel.js'], pattern: 'function packagingNodeByUse',
        reason: 'a helyére lépő HASZNÁLAT-szabály (feldolgozásba megy ⇒ alapanyag)' }),
      Object.freeze({ paths: ['src/masterData/categoryAxisModel.js'], pattern: "reason: 'feldolgozásba megy \\(mi dolgozzuk fel\\)', biztos: false",
        reason: 'a levezetett ág JAVASLAT marad, amíg a mérés bizonyítékká nem emeli' }),
      Object.freeze({ paths: ['tools/vs_category_load.mjs'], pattern: 'csaladfaEgyezik',
        reason: 'a betöltő a KIVEZETETT szabályt is kiírja viszonyításul — a javulás mérhető' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-034',
    date: '2026-08-19',
    title: 'A VÁLTOZÓ A SAJÁT FÜGGVÉNYÉN BELÜL A LÉTREJÖTTE ELŐTT — zöld söprés, halott út',
    what: 'A kategória-feltöltés lelet-számai (`readCounts`) egy `pushOptMissing` nevű változóra '
      + 'hivatkoztak, amit tíz sorral LEJJEBB hozott létre a kód. A JavaScript ilyenkor minden egyes '
      + 'futáskor ReferenceError-t dob — vagyis a TELJES feltöltés-út (terv ÉS éles) halott volt a '
      + 'kiadás pillanatától. Az operátor ELSŐ kattintására 500-as hibával állt meg, miközben a söprés '
      + '223 ellenőrzőből 222 zöldet mutatott.',
    why_wrong: 'ez nem „elírás", hanem MÉRETLEN VISZONY: a hivatkozás és a deklaráció SORRENDJE. A '
      + 'két oldal külön-külön hibátlan (a lelet-lista ép, a lekérdezés ép) — a KUKA-024 alakja a '
      + 'változó-térben. Egyetlen pin sem HÍVTA a futtatót (adatbázist kér), a forrás-olvasó pinek '
      + 'pedig soha nem néznek sorrendet. A beépített `no-use-before-define` szabály be sem volt '
      + 'kapcsolva, mert az ÁRTALMATLAN esetet (függvényből egy lentebbi modul-szintű konstansra — a '
      + 'rendszerben 11 ilyen él, mind helyes) ugyanúgy jelenti: a zajos őr nem őr.',
    replaced_by: 'SAJÁT ESLint-szabály (tools/eslint-rules/no-tdz-same-scope.js), ami KIZÁRÓLAG a '
      + 'biztos futási hibát jelenti: a hivatkozás és a deklaráció UGYANABBAN a függvény-hatókörben '
      + 'áll, és a hivatkozás előbb. A hatókör-elemzést az ESLint végzi — nem szöveg-illesztés.',
    decision: 'D-VS-433/3',
    found_by: 'az operátor első éles kattintása a szinkron tábla „Teszt (feltöltés)" gombján (2026-08-19)',
    lesson: 'HA EGY ÚT MÖGÖTT NINCS OLYAN PIN, AMI VÉGIG IS FUTTATJA, akkor a zöld battéria csak azt '
      + 'jelenti, hogy a DARABOK épek — az összeszerelésről semmit nem mond. Ahol a futtató '
      + 'adatbázist kér (és ezért nem hívható a söprésben), ott a nyelvi szintű őrt kell bekapcsolni: '
      + 'olyat, ami a VISZONYT méri, és CSAK a biztos hibát jelenti (a zajos őrt előbb-utóbb '
      + 'kikapcsolnánk, az pedig rosszabb, mintha nem lenne).',
    guard_note: 'gépi jel: `npm run verify:tdz` (a söprés része) — 898 fájlon fut; a szabály a '
      + 'valódi hibán bizonyítottan pirosat ad, az ártalmatlan alakra nem.',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['eslint.config.js'], pattern: "vs/no-tdz-same-scope': 'error'",
        reason: 'a szabály ÉLESEN be van kapcsolva, nem csak létezik' }),
      Object.freeze({ paths: ['tools/eslint-rules/no-tdz-same-scope.js'], pattern: 'ref.from.variableScope !== variable.scope.variableScope',
        reason: 'a szűkítés, amitől a szabály zaj helyett őr: CSAK az azonos függvény-hatókör számít' }),
      Object.freeze({ paths: ['tools/vs_verify_tdz.mjs'], pattern: 'const FLOOR = 300',
        reason: 'a betakarított fájlok PADLÓJA — a néma zsugorodás is piros (a mérő önmérése)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-035',
    date: '2026-08-19',
    title: 'AZ ÖKO-STÁTUSZ A FAJTA NEVÉBŐL — a névből olvasott tény, „automatikus"-nak eladva',
    what: 'A tanúsítvány öko-státusza (ökológiai / átállási / szokványos) nem kimondott mező volt, hanem '
      + 'a FAJTA NEVÉBŐL származott egy minta-illesztéssel (öko/bio/organic/demeter/naturland/krav → '
      + 'ökológiai). A bemeneti `organic_status` IGNORÁLVA volt, a szerkesztő-űrlapon pedig egy '
      + 'magyarázó mondat állt: „Az öko-státusz a fajta nevéből származik automatikusan (nem kézi mező)." '
      + 'Így a „Bio Suisse" öko lett, az „OK biobased" nem, egy szokatlanul nevezett ÖKO tanúsítvány '
      + 'pedig némán szokványos maradt — és a termék öko-státusza (ami ebből öröklődik) vele együtt.',
    why_wrong: 'a NÉV nem bizonyíték (KUKA-022) — itt a levezetett szabály egy JOGI tény helyére állt. '
      + 'A tanúsítvány státusza okirat-tény: a papíron ott áll. Levezetni belőle egy szó-listával '
      + 'annyi, mint a mérést a szerző meggyőződésével helyettesíteni (KUKA-033). Súlyosbító, hogy a '
      + 'felület ezt „automatikus"-ként adta el: az operátor nem tudta se ellenőrizni, se javítani — '
      + 'a magyarázó szöveg nem őr (KUKA-004), és itt még a hibát is elfedte.',
    replaced_by: 'KIMONDOTT mező: a tanúsítvány-űrlapon választó (ökológiai / átállási / szokványos), '
      + 'a szerviz allowlistázza (rossz érték = őszinte hiba, nem néma alapértelmezés), az UPDATE a '
      + 'saját paraméteréből írja. A termék öko-státusza a KÖTÖTT tanúsítványból jön (resolveStatus) — '
      + 'a fajta neve legfeljebb JAVASLAT, és csak akkor szólal meg, ha a hívó egyáltalán nem küld '
      + 'státuszt (régi importer/eszköz).',
    decision: 'D-VS-440',
    found_by: 'az operátor (2026-08-19): „ne csak szöveget töröljünk, hanem a backend se így működjön"',
    lesson: 'AMIT EGY OKIRAT KIMOND, AZT NE VEZESD LE — kérdezd meg. Ahol egy tény külső dokumentumban '
      + 'áll (tanúsítvány, engedély, szerződés), ott a rendszer dolga a RÖGZÍTÉS, nem a kitalálás; a '
      + 'levezetés legfeljebb javaslat lehet, amit az operátor felülír. És ha egy képernyő azt állítja '
      + 'valamiről, hogy „automatikus", az ígéret — a gépnek teljesítenie kell (KUKA-015).',
    guard_note: 'gépi jel: `npm run verify:certification` CRT03 (a kimondott érték GYŐZ a fajta-név '
      + 'fölött mindkét irányban; allowlistán kívüli érték hiba; az UPDATE a saját paraméteréből ír) + '
      + '`npm run verify:bound-tabs` BT05 (a cert-űrlapon VAN választó, és a payload viszi is).',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/services/certificationService.js'], pattern: 'function resolveOrganicInput\\(src, certType\\)',
        reason: 'a státusz KIMONDOTT bemenet, saját feloldóval — nem a fajta-név mellékhatása' }),
      Object.freeze({ paths: ['src/services/certificationService.js'], pattern: 'organic_status = COALESCE\\(\\$6, organic_status\\)',
        reason: 'az UPDATE a státuszt a SAJÁT paraméteréből írja (a cert_type-hoz kötött CASE kivezetve)' }),
      Object.freeze({ paths: ['config/registries/ui_surfaces.json'], pattern: '"field": "organic_status",\\s*\\n\\s*"label_key": "master.certifications.form.organicStatus",\\s*\\n\\s*"type": "select"',
        reason: 'a KÜLDŐ oldal: a KÖZÖS szerkesztő deklarált választója viszi ki a státuszt (D-VS-444 óta ott él)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-036',
    date: '2026-08-19',
    title: 'A KÉZZEL GÉPELT AZONOSÍTÓ-LISTA A RÉTEG-HATÁRON — a gomb, ami meg sem jelent',
    what: 'A tömeges szerkesztés célpontjait két helyen soroltuk fel: a szolgáltatásban és a kliensben. '
      + 'Mindkettő a BELSŐ, egyes számú entitás-kulcsot használta (`product`, `warehouse`), a shell '
      + 'viszont mindenhol az ÚTVONAL-NEVET adja át (`products` — ugyanaz, ami a `/master/query/products` '
      + 'címben áll). Így a gomb megjelenítésének feltétele SOHA nem teljesült: a „Tömeges szerkesztés" '
      + 'gomb a kiadás pillanatától láthatatlan volt, és ha valahogy mégis megjelent volna, a hívása '
      + '404-re futott volna. A funkció készen állt, mért volt, 64 ellenőrzővel — és egyszer sem futott.',
    why_wrong: 'két hibátlan oldal, két KÜLÖNBÖZŐ nyelv — a KUKA-024 osztálya a szótárak terében. '
      + 'A pin is átengedte, mert MINDKÉT oldalt a SAJÁT szótárával mérte (a kliens-őrt `product`-tal '
      + 'hívta, a szolgáltatást is): a két oldal külön-külön hibátlan volt, a viszonyukat senki nem nézte. '
      + 'A gyökér-ok pedig az, hogy egy réteg-határon átmenő azonosító-listát KÉZZEL gépeltünk le, '
      + 'ahelyett hogy a meglévő szótártól kérdeztük volna meg.',
    replaced_by: 'a szolgáltatás a célpont-kulcsokat a LEKÉRDEZŐ-SPEC útvonal-nevéből veszi '
      + '(`pathOf(specKey) => getSpec(specKey).path`), tehát elgépelni sem lehet; a kliens listája '
      + 'ugyanezen a nyelven áll, és a pin a KÉT LISTA EGYEZÉSÉT méri, plusz azt, hogy amit a shell '
      + 'ténylegesen átad (a felület-regiszter `query.entity`-je), azt a szolgáltatás érti-e.',
    decision: 'D-VS-445/2',
    found_by: 'az operátor (2026-08-19): „nem látom a »Tömeges szerkesztés (N)« gombot"',
    lesson: 'RÉTEG-HATÁRON ÁTMENŐ AZONOSÍTÓT SOHA NE GÉPELJ LE — kérdezd meg attól, aki már tudja. '
      + 'Ahol egy név két rétegben él, ott nem elég mindkét oldalt megmérni: a pin a KETTŐ EGYEZÉSÉT '
      + 'mérje, és lehetőleg azzal az értékkel, amit a HÍVÓ ténylegesen átad — különben a mérés a saját '
      + 'előfeltevését igazolja vissza, nem a valóságot. '
      + 'VISSZATÉRT (2026-09-09, D-VS-3004) — A SAJÁT NYITÓ CSOMAGOMBAN: a V3 `package.json` `docs:html` '
      + 'sora `--all`-t kapott, miközben az eszköz `--mind`-ot ismer. Ugyanaz az osztály: a kapcsoló nevét '
      + 'EMLÉKEZETBŐL írtam a package.json-ba, ahelyett hogy az eszköztől kérdeztem volna meg. Következmény: '
      + 'a `npm run docs:html` a repó megnyitása óta NULLA lapot készített — és „6 lap … elkészült" helyett '
      + '„0 lap elkészült" mondattal, NULLA kilépési kóddal zárt, tehát SIKERNEK látszott (KUKA-012 · '
      + 'KUKA-041). Épp azt a parancsot, ami az operátor egyetlen olvasható alakját állítja elő (KUKA-079). '
      + 'A pin zöld volt, mert azt mérte, hogy a `docs:html` sor HIVATKOZIK-e az eszközre — a VISZONYT nem '
      + '(KUKA-024). Két javítás, mindkettő kell: a kapcsoló-lista az eszköz EXPORTÁLT `ALL_FLAGS`-e '
      + '(a package.json ehhez mérve, nem egy második kézi másolathoz), és több írásmódot is elismer '
      + '(KUKA-014); a NULLA lap pedig PIROS, mondattal, ami kiírja a helyes hívást (KUKA-064).',
    guard_note: 'gépi jel: `npm run verify:bulk-edit` BE01 (a kulcsok a lekérdező-spec útvonal-nevei; a '
      + 'belső, egyes számú alak NEM célpont) + BE06 (a kliens és a szerver listája szó szerint azonos, '
      + 'és a szerkeszthető felületek `query.entity`-je tényleg célpont). A pin bizonyítottan pirosat ad '
      + 'a régi alakra (visszaállítva 2 FAIL). '
      + 'A VISSZATÉRÉS jele a V3-ban: `npm run verify:doc-html` DHT07 — a pin LEFUTTATJA a package.json-ban '
      + 'álló `docs:html` parancsot és lapokat követel (padló 1), plusz ellenpróbaként megköveteli, hogy '
      + 'ismeretlen kapcsolóval az eszköz 1-gyel zárjon. Mérve: a régi alakon (`--minden`) a DHT07 piros.',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/services/bulkEditService.js'], pattern: 'const pathOf = \\(specKey\\) => getSpec\\(specKey\\)\\.path;',
        reason: 'a célpont-kulcs a meglévő szótárból jön, nem kézi gépelésből' }),
      Object.freeze({ paths: ['public/js/bulk-edit.mjs'], pattern: "BULK_ENTITIES = Object\\.freeze\\(\\['products'",
        reason: 'a kliens ugyanazt a nyelvet beszéli, amit a shell átad (útvonal-név)' }),
      Object.freeze({ paths: ['tools/vs_verify_bulk_edit.mjs'], pattern: 'a kliens és a szerver célpont-listája SZÓ SZERINT azonos',
        reason: 'a pin a KÉT LISTA VISZONYÁT méri, nem a darabjait' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-037',
    date: '2026-08-19',
    title: 'A CSALÁD A VÁLTOZAT OSZLOPÁN — a szülő-mező csak „bolti változat" fajtán állhatott',
    what: 'A `checkCommerceConsistency` kimondta: `kind !== \'variant\' && hasParent → only_for_variant`, '
      + 'vagyis szülője CSAK bolti VÁLTOZAT fajtájú terméknek lehetett. A VS-ben viszont a '
      + '`parent_product_id` a CSALÁD kötése (szülő ⇄ kiszerelés-gyerek), a `product_kind` pedig a '
      + 'bolti változat (méret/szín kombináció) fogalma. Emiatt MINDEN család-gyerek írásra ZÁRT volt: '
      + 'az operátor első éles tömeges szerkesztésén 57 termékből 29 elakadt, és ugyanez a 29 egyesével '
      + 'megnyitva sem lett volna menthető — a hiba neve mindössze annyi volt, hogy „validation".',
    why_wrong: 'két független tény ült egy oszlopon (KUKA-002): a CSALÁD-tagság és a VÁLTOZAT-fajta. '
      + 'Hogy a szülő-mező családot jelent, azt NÉGY független olvasó bizonyítja, és egyik sem néz a '
      + 'fajtára: a `productfamily` nézet (family_role/child_count/family_head), a kategória-tengely '
      + '(„nincs szülője — ömlesztett"), a tartalom-szolgáltatás szülő→gyerek lánca és a GTIN '
      + 'karton-szintek. A szabályra EGYETLEN pin sem mutatott, ezért a zárás a kiadás óta néma volt.',
    replaced_by: 'a szülő-mezőn NINCS fajta-feltétel — a család a fajtától független tény. A valódi '
      + 'változat-szabályok maradnak: VÁLTOZATNAK KELL szülő (`required_for_variant`), és '
      + 'változat-JELLEMZŐT (`variant_attributes`) csak változat hordhat.',
    decision: 'D-VS-448',
    found_by: 'a VS-Aux sáv (2026-08-19) — az első éles tömeges szerkesztés 29 elakadt rekordjából '
      + 'visszafejtve, eldobható Postgresen reprodukálva, és LEVÉLBEN átadva a dev-sávnak (nem patchként, '
      + 'mert a termék-modell jelentése a dev-sáv fennhatósága)',
    lesson: 'AHOL EGY MEZŐ JELENTÉSÉT AZ OLVASÓI ADJÁK, OTT AZ ÍRÁS-ŐRT IS AHHOZ KELL SZABNI — ha egy '
      + 'validátor szűkebb fogalmat véd, mint amit a rendszer olvasói használnak, akkor nem véd, hanem '
      + 'ZÁR, és a zárás némán `validation` néven jelenik meg. Új kereszt-mező szabály előtt a kérdés: '
      + 'KI OLVASSA EZT A MEZŐT, ÉS MINEK ÉRTI? (a KUKA-015 „ki olvassa?" alkalmazása írás-őrökre.)',
    guard_note: 'gépi jel: `npm run verify:product-model-reference-predicate` PMR11 — a pin HÍVJA a '
      + 'feloldót mind a négy ágon (család-gyerek menthető · család-fej alatti gyerek menthető · '
      + 'változat szülő nélkül továbbra is hibás · változat-jellemző sima terméken továbbra is hibás), '
      + 'plusz tiltó-minta a visszacsúszásra.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/masterData/productModelRegistry.js'],
        pattern: "errors\\.parent_product_id = 'only_for_variant'",
        reason: 'a szülő-mező CSALÁDOT jelent — fajta-feltétel nem ülhet rajta (KUKA-037)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/masterData/productModelRegistry.js'],
        pattern: "kind === 'variant' && !hasParent",
        reason: 'a VALÓDI változat-szabály megmarad: változatnak kell szülő' }),
      Object.freeze({ paths: ['src/masterData/productModelRegistry.js'],
        pattern: 'parent_means_family_not_variant: true',
        reason: 'a szerződés kimondja, hogy a szülő-mező családot jelent — nem emlékezetből él' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-038',
    date: '2026-08-19',
    title: 'A LÉTEZÉS MINT BIZONYÍTÉK — „a futtató megvan, tehát él"',
    what: 'A szinkron-tábla 11 piros cellájából kettőnél azt találtam, hogy a futtató LÉTEZIK és a route '
      + 'is megvan, ezért a képesség-regiszterben „él"-re állítottam őket, és a képernyőn kattinthatóvá '
      + 'tettem (D-VS-459). A termék-adat letöltésnél ez igaz volt. A KÉP-FELTÖLTÉSNÉL nem: az operátor '
      + 'első kattintására 500 jött („Unexpected error"), mert a SELECT a `media_asset`-től `mime_type`-ot '
      + 'és `original_name`-et kért — a valódi nevük `mime` és `original_filename`. Az út a MEGÍRÁSA ÓTA '
      + 'halott volt; a „terv" státusz ezért volt igaz a maga módján: soha senki nem futtatta le.',
    why_wrong: 'a LÉTEZÉS nem FUTÁS. A KUKA-033 („levezetett szabályt ne jelölj bizonyítéknak, amíg a '
      + 'mérése le nem futott") itt SAJÁT ÁLLÍTÁSRA fordult: megmértem, hogy a kód ott van és a route '
      + 'feloldódik, majd ebből LEVEZETTEM, hogy működik — mérés nélkül. A KUKA-034 ugyanezt mondja a '
      + 'darabokról: az összeszerelésről a darabok épsége semmit nem mond. Ráadásul a gyökér-hiba maga '
      + 'a KUKA-005 volt (oszlopnév emlékezetből), ami eddig egyetlen konkrét tiltó-mintán állt.',
    replaced_by: 'a hibás oszlopnevek javítva (mind a három kép-kör: fő kép · galéria · dokumentum). '
      + 'És a szabály gépi alakot kapott: `verify:sql-columns` a MIGRÁCIÓ-ÁLLOMÁNYBÓL építi a séma-térképet, '
      + 'és a forrás minden mérhető `alias.oszlop` hivatkozását ellenőrzi — 975 hivatkozás, nulla téves '
      + 'riasztás. Ha egy út „él"-re vált, az állításnak vagy éles futás, vagy gépi ellenőrzés a fedezete.',
    decision: 'D-VS-460',
    found_by: 'az operátor (2026-08-19): az első kattintás a frissen élővé tett kép-feltöltésen 500-at adott',
    lesson: 'A FUTTATÓ LÉTEZÉSE NEM BIZONYÍTÉK ARRA, HOGY FUT. „Megvan a kód és a route" csak annyit '
      + 'mond, hogy ELINDULHAT — hogy VÉGIG is megy, azt vagy egy éles futás mondja meg, vagy egy gépi '
      + 'ellenőrzés, ami a benne lévő HIVATKOZÁSOKAT (oszlop, mező, kulcs) a valósághoz méri. Amíg egy '
      + 'utat SOHA nem futtattak, a „terv" státusz nem hazugság, hanem óvatosság — a felülírásához '
      + 'bizonyíték kell, nem következtetés.',
    guard_note: 'gépi jel: `npm run verify:sql-columns` (SQC-01) — a séma a migrációkból, a hivatkozások '
      + 'a forrásból; a mérhető hivatkozások számának PADLÓJA is áll, hogy a néma zsugorodás is piros '
      + 'legyen. A harapását bizonyítottuk: a `mime_type` visszatételére azonnal pirosra váltott.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/sync/productContentUploadService.js'],
        pattern: 'ma\\.mime_type(?! AS)', reason: 'a media_asset oszlopa `mime`, nem `mime_type` (KUKA-005)' }),
      Object.freeze({ paths: ['src/sync/productContentUploadService.js'],
        pattern: 'ma\\.original_name(?! AS)', reason: 'a media_asset oszlopa `original_filename` (KUKA-005)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_verify_sql_columns.mjs'],
        pattern: 'const schema = new Map\\(\\);',
        reason: 'a séma-térkép a MIGRÁCIÓKBÓL épül — nem emlékezetből' }),
      Object.freeze({ paths: ['tools/vs_verify_sql_columns.mjs'],
        pattern: 'const MEASURED_FLOOR',
        reason: 'a mérhető hivatkozások padlója: a néma elnémulás is piros' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-046',
    date: '2026-08-21',
    title: 'A KÉSLELTETETT MUNKA, AMI TÚLÉLI A KÉPERNYŐ-VÁLTÁST — két helyes hívás rossz sorrendben',
    what: 'A beállítás-fülek rácsa gépelés közben 300 ms-os késleltetéssel tölt újra. Ha az operátor '
      + 'gépel, majd RÖGTÖN rákattint egy sorra, a sor panelje kirajzolódik — és a függőben lévő '
      + '`load()` a háta mögött VISSZAHÚZZA fölé a listát: a megnyitott szerkesztő nyomtalanul eltűnik, '
      + 'a képernyő magától „visszaugrik". Mellette ugyanezen a fülön egy második lelet: a fókusz-'
      + 'visszaállítás egy SEHOL NEM LÉTEZŐ osztály-nevet keresett (`vs-settings-search` a közös '
      + '`vs-query-search` helyett), ezért gépelés közben minden újratöltés elvette a kurzort. '
      + '2026-08-21 — UGYANEZ AZ OSZTÁLY, SÚLYOSABB ALAKBAN: a Rendszerbeállítás tanúsítvány-fülének '
      + 'betöltője (`loadTypes`) a hálózati válasz UTÁN írt a befogadó elemre. Ha az operátor megnyitotta '
      + 'a Rendszerbeállítást, majd AZONNAL elkattintott, a válasz megérkezéséig a shell már kicserélte a '
      + 'törzset — a keresés `null`-t adott, és a `null.innerHTML` NEM néma: uncaught TypeError, ami az '
      + 'egész shell-t elszállította. A böngésző-próba a KIADÁS ÓTA jelezte, de „ismerten piros" volt.',
    why_wrong: 'egyik hívás sem hibás ÖNMAGÁBAN — a kereső-újratöltés helyes, a panel-nyitás helyes; a '
      + 'SORRENDJÜK a hiba (a KUKA-024 viszony-elve az IDŐ tengelyén). Ezért a szerver-oldali próbák '
      + 'egyike sem látja: mindkét kérés 200-zal tér vissza, az adat végig helyes. Csak a képernyő tudja '
      + 'megmutatni, és csak akkor, ha a próba az operátor VALÓDI ritmusát követi (gépel, majd azonnal '
      + 'kattint) — nem a kényelmes, kivárásokkal tagolt forgatókönyvet.',
    replaced_by: 'a panel-átvétel LEÁLLÍTJA a függőben lévő újratöltést (`takeOverBody()` — clearTimeout), '
      + 'és MINDKÉT átvevő út hívja (sor-kattintás + felvevő gomb), nem csak az egyik (KUKA-039). A '
      + 'kereső-osztályt pedig a KÖZÖS eszköz-sáv forrásából takarítjuk be, nem gépeljük le (KUKA-036).',
    decision: 'D-VS-502',
    found_by: 'a D-VS-502 kör BÖNGÉSZŐ-PRÓBÁJA (Playwright): a szerkesztő megnyílt, majd a próba szeme '
      + 'láttára eltűnt — a hálózati napló mutatta meg, hogy a lista-lekérdezés a szerkesztő UTÁN futott',
    lesson: 'A KÉSLELTETETT MUNKA A KÉPERNYŐ-VÁLTÁSSAL EGYÜTT ÁLLJON LE. Ahol időzítő, lekérés vagy '
      + 'animáció ír egy felület-területre, ott az a terület ÁTVEHETŐ: az átvevőnek le kell állítania a '
      + 'függőben lévő írókat, különben a régi kép a friss fölé rajzol. És általánosabban: a szerver-'
      + 'oldali zöld nem elég ott, ahol a hiba a SORRENDBEN van — ilyet csak a végigkattintott képernyő '
      + 'mutat meg (D-VS-497 kapuja), és csak ha a próba nem tagolja szét mesterséges kivárásokkal.',
    guard_note: 'gépi jel: `npm run verify:settings-surface-tabs` **SST10** — a fül a KÖZÖS eszköz-sáv '
      + 'kereső-osztályát keresi (a nevet a forrásából betakarítva), a kivezetett név nem tér vissza a '
      + 'kódba, és a panel-átvétel MINDKÉT úton leállítja a késleltetett újratöltést. Mellé a '
      + 'böngésző-próba: `tests/e2e/settings-email-templates.spec.js` (a kattintás a késleltetésen BELÜL '
      + 'történik, majd a próba KIVÁRJA a késleltetést — a szerkesztőnek a helyén kell maradnia). A '
      + 'null-írás alakjára: `tests/e2e/i18n-ui-coverage.spec.js` (a nyelv-váltó séta közben fület vált, '
      + 'és MINDEN uncaught hibát pirosnak vesz) + a lenti tiltó-minta.',
    forbidden: Object.freeze([
      // A KIVEZETETT ALAK: a lekérdezett elemre KÖZVETLENÜL írunk, null-őr nélkül. A `wireCertifications`
      // pontosan így szállt el. A helyére NEVEZETT feloldó lépett (`liveTarget` / `putInto`).
      Object.freeze({ paths: ['public/js/system-settings.mjs'],
        pattern: "\\$\\('vs-[a-z0-9-]+'\\)\\s*\\.\\s*(innerHTML|textContent|value|checked)\\s*=",
        flags: 'i',
        reason: 'őrizetlen írás egy lekérdezett elemre — a képernyő-váltás után `null`' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['public/js/settings-surface-tab.mjs'],
        pattern: 'takeOverBody',
        reason: 'a panel-átvétel leállítja a függőben lévő kereső-újratöltést' }),
      Object.freeze({ paths: ['tools/vs_verify_settings_surface_tabs.mjs'],
        pattern: 'SST10',
        reason: 'a sorrend-hiba gépi jele: a kereső-osztály viszonya + az átvétel mindkét úton' }),
      Object.freeze({ paths: ['public/js/system-settings.mjs'],
        pattern: 'export function liveTarget',
        reason: 'a NEVEZETT feloldó: élő elem vagy null — a késleltetett író sosem ír vak helyre' }),
      Object.freeze({ paths: ['public/js/system-settings.mjs'],
        pattern: 'export function putInto',
        reason: 'az EGYETLEN író: nincs cél → csendben kilép és hamissal tér vissza' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-045',
    date: '2026-08-21',
    title: 'A KÉZZEL LÉPTETETT DARABSZÁM MINT PIN — a felirat, ami mást mond, mint amit mér',
    what: 'Két őr is kézzel karbantartott VÁRT DARABSZÁMOT mért. (1) A séma-ellenőrző: „a sorozat-tábla '
      + '18 sort tartalmaz (13 seed + 025 + 901 + 918 + 941)" — minden új seed-migráció után emberi kézzel '
      + 'kellett léptetni, és a magyarázó zárójel egy hosszú, senki által nem ellenőrzött történet volt. '
      + '(2) A felület-leltár: a felirat „exactly 11 editable surfaces"-t mondott, miközben a kód 14-et mért — '
      + 'a szám háromszor lépett, a felirat egyszer sem. A 967-es séma-bővítéskor az (1) PIROSRA váltott '
      + 'volna az OPERÁTOR gépén, egy teljesen szabályos változás miatt.',
    why_wrong: 'a darabszám nem a SZABÁLY, csak a szabály egy pillanatnyi lenyomata. Aki a pint javítja, '
      + 'nem gondolkodik: átírja a számot — így az őr betanít a saját megkerülésére. És a mellé írt felirat '
      + 'előbb-utóbb elcsúszik a mért értéktől, ami ugyanaz a hazugság, mint a néma üres lista (KUKA-012): '
      + 'a képernyőn (itt: a söprés kimenetén) más áll, mint ami igaz.',
    replaced_by: 'a VISZONY mérése: a séma-ellenőrző mostantól azt kérdezi, hogy MINDEN ISMERT FAJTÁNAK '
      + 'van-e sora (a fajta-listát a rendszertől kérve — knownKeys, KUKA-036), mellé PADLÓVAL a sorok '
      + 'számán, hogy a néma zsugorodás is piros legyen. Ahol tényleg szám kell, ott a felirat a MÉRT '
      + 'számot mondja, a névsort pedig az adat tartja — nem a felirat.',
    decision: 'D-VS-500',
    found_by: 'a D-VS-500 kör: a 967-es migráció (minden ismert fajtának sor) 18-ról 22-re vitte a sorok '
      + 'számát, és a séma-pin ettől pirosra váltott volna az operátor gépén — miközben a séma helyes volt',
    lesson: 'PIN NE VÁRT DARABSZÁMOT MÉRJEN, HA A SZABÁLY MEGFOGALMAZHATÓ. A kérdés nem az, hogy „hány van", '
      + 'hanem hogy „megvan-e mind, aminek meg kell lennie" — az előbbit minden szabályos változás megbuktatja, '
      + 'az utóbbit csak a valódi hiány. Ahol mégis szám kell (padló a néma zsugorodás ellen), ott PADLÓ '
      + 'legyen, ne egyenlőség, és a felirat a MÉRT értéket írja ki, ne egy kézzel karbantartott történetet.',
    guard_note: 'gépi jel: `npm run verify:schema` (ÉLŐ mód) — „minden ismert fajtának van sora" + padló; '
      + 'és `npm run verify:document-number-prefix` **DNP06**, ami a MIGRÁCIÓ fajta-listáját a rendszer '
      + 'kulcsaihoz méri, tehát új fajtánál a séma-hiány magától pirosodik.',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_verify_schema.mjs'],
        pattern: 'covers ALL',
        reason: 'a sorozat-pin a SZABÁLYT méri (minden ismert fajtának van sora), nem egy kézzel léptetett darabszámot' }),
      Object.freeze({ paths: ['tools/vs_verify_document_number_prefix.mjs'],
        pattern: 'DNP06',
        reason: 'a migráció fajta-listája ↔ a rendszer kulcsai: SQL és kód viszonya, nem darabszám' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-044',
    date: '2026-08-21',
    title: 'A NÉV, AMI SOSEM JÖTT LÉTRE — a route, ami a megírása óta halott',
    what: 'A termék-feltöltés route-ja (`POST /system/api-connections/:id/product-push`) egy `b` nevű '
      + 'változóra hivatkozott, ami sehol nem jött létre: a D-VS-461-es `only` (kiválasztott termékek) '
      + 'bevezetésekor a kérés-törzs neve lemaradt a fölötte álló testvér-route-ból másolt sorban. Az út a '
      + 'bevezetése óta ReferenceError-ral halt el, tehát a felület HÁROM gombja — próba · pilot · tömeges — '
      + 'egyszer sem futott le. Ugyanez a minta a fejlesztés közben is előjött: egy ÁTNEVEZETT feloldó '
      + '(`applyExternalMapGuard`) hívása maradt bent két ágon, és csak az ÉLŐ próba ötödik lépésénél dőlt ki.',
    why_wrong: 'a `node --check` és a szintaxis-ellenőrzés ZÖLD marad — a nem létező név futásidőben dől el, '
      + 'és csak azon az ágon, amelyik tényleg lefut. A TDZ-őr (D-VS-433/3) kifejezetten KIKAPCSOLJA a '
      + '`no-undef` szabályt (ő a „létrejötte ELŐTT” alakot méri), a modul-szimbólum-őr pedig a modul-HATÁRON '
      + 'átnyúló hívást — a saját fájlon belüli nem létező név KETTŐJÜK KÖZÖTT csúszott át. A KUKA-034 '
      + 'rokona: ott a sorrend volt rossz, itt a név nincs is; mindkettő ZÖLD BATTÉRIA mellett élt.',
    replaced_by: 'a hiányzó deklaráció visszakerült (`const b = req.body || {}`), és a hiba-OSZTÁLYT '
      + 'mostantól a GÉP méri: az ESLint hatókör-elemzője fut a teljes forrás-fán, csoportonként a VALÓS '
      + 'környezet globálisaival (szerver = node · böngésző-kód = DOM · ChatOps-tábla = a saját script-tag '
      + 'globálisai, a forrásokból BETAKARÍTVA, nem legépelve — KUKA-036).',
    decision: 'D-VS-499',
    found_by: 'a D-VS-499 kör: a saját szervizemben ugyanez a hiba dőlt ki az élő próbán, és az abból '
      + 'született mérés találta meg az ÉLES példányt a termék-feltöltés útján',
    lesson: 'A SZINTAXIS ÉPSÉGE NEM BIZONYÍTÉK ARRA, HOGY A NEVEK LÉTEZNEK (a KUKA-038 „a létezés nem '
      + 'bizonyíték” alakja az azonosítók terében). Átnevezés vagy másolás után a kérdés nem az, hogy '
      + 'lefordul-e, hanem hogy MINDEN NÉVNEK VAN-E GAZDÁJA — és ezt nem a szem dönti el, hanem a hatókör-'
      + 'elemző. Ahol egy őr zajos lenne, ott a környezetét kell pontosan leírni, nem a szabályt kikapcsolni: '
      + 'a zajos őrt előbb-utóbb kikapcsolnánk, az pedig rosszabb, mintha nem lenne.',
    guard_note: 'gépi jel: `npm run verify:no-undef` — ESLint `no-undef` a teljes forrás-fán (959 fájl), '
      + 'csoportonkénti padlóval, hogy a néma zsugorodás is piros legyen. A harapása bizonyított: '
      + 'bevezetéskor azonnal kibukott a termék-feltöltés halott route-ja.',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_verify_no_undef.mjs'],
        pattern: "'no-undef': 'error'",
        reason: 'a nem létező név gépi jele — a hatókör-elemző, nem a szem' }),
      Object.freeze({ paths: ['tools/vs_verify_no_undef.mjs'],
        pattern: 'harvestChatOpsGlobals',
        reason: 'a script-tag globálisok a FORRÁSBÓL jönnek, nem legépelt listából (KUKA-036)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-043',
    date: '2026-08-20',
    title: 'A SZERKESZTŐ A SORBÓL TÖLT, AZ ÍRÓ FELTÉTEL NÉLKÜL ÍR — a néma mező-törlés',
    what: 'A beállítás-fülbe ágyazott rácson a szerkesztő A SOR mezőiből tölti fel magát (a nagy felülettel '
      + 'ellentétben ott nincs külön részletező-lekérés). A lekérdező út viszont CSAK azt projektálja, amit a '
      + 'képernyő mutat. Ahol egy szerkesztő-mező nem volt megjelenített oszlop, ott üresen indult — és mivel '
      + 'az írók a legtöbb mezőt FELTÉTEL NÉLKÜL írják, egy változtatás nélküli „Mentés" NÉMÁN kitörölte az '
      + 'adatot. Mérve, élesben: a projekt PARTNER-kötése eltűnt; a kategória SZÜLŐJE a gyökérre ugrott volna; '
      + 'a tanúsítvány SAJÁT AZONOSÍTÓJA és MEGJEGYZÉSE kiürült volna.',
    why_wrong: 'a betöltés és az írás KÉT KÜLÖN JÖVŐT ígért (a KUKA-024 alakja a rekord-életútban): a képernyő '
      + 'azt mutatta, hogy „ez a rekord", a mentés viszont egy CSONKÍTOTT rekordot írt vissza. A hiba a '
      + 'legrosszabb fajtából való: nem hibaüzenettel jön, hanem csenddel, és csak később derül ki, hogy '
      + 'hiányzik valami. A söprés nem látta, mert mindkét oldal külön-külön hibátlan volt.',
    replaced_by: 'a hiányzó mezők bekerültek a SZERVER-PROJEKCIÓBA — a KÉPERNYŐRE nem: a felület-leírás '
      + 'oszlopai közt nincsenek, tehát se fejléc, se oszlop-választó nem kínálja őket (az azonosító nem '
      + 'felirat — KUKA-015). Ahol a fogalomnak van emberi alakja, a rács azt mutatja (partner NEVE, szülő '
      + 'NEVE), és az azonosító csak a szerkesztő tölteléke.',
    decision: 'D-VS-496',
    found_by: 'a D-VS-496 kör ÉLŐ próbája (eldobható Postgres): a projekt partner-kötése eltűnt egy '
      + 'változtatás nélküli mentéstől — majd az ebből született pin (SST09) még két, RÉGEBBI esetet talált',
    lesson: 'AHOL A SZERKESZTŐ A LISTA SORÁBÓL TÖLT, OTT A SORNAK MINDEN SZERKESZTHETŐ MEZŐT HOZNIA KELL. '
      + 'A projekció nem a képernyő tükre: a képernyő azt mutatja, ami OLVASNI jó, a projekciónak azt is '
      + 'hoznia kell, ami ÍRÁSKOR kell. Két általános tanulság mellé: (1) ahol egy író feltétel nélkül ír egy '
      + 'mezőt, ott a hiányzó bemenet TÖRLÉS — ezt a szerviznek vagy a hívónak ki kell mondania; (2) egy ilyen '
      + 'osztályt sosem egyetlen példány zár le: az első lelet után a GÉPPEL kell végigmérni a testvéreket.',
    guard_note: 'gépi jel: `npm run verify:settings-surface-tabs` **SST09** — minden beágyazott ÍRHATÓ fülön '
      + 'végigméri, hogy a szerkesztő-mezők mind benne vannak-e a szerver-projekcióban (a spec-oszlopok ∩ az '
      + 'entitás allowlistje), padlóval a mért fülek számán. A harapása bizonyított: bevezetéskor azonnal '
      + 'kibukott a kategória-szülő és a tanúsítvány két mezője.',
    forbidden: Object.freeze([]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_verify_settings_surface_tabs.mjs'],
        pattern: 'szerkeszthető, de a sor nem hozza',
        reason: 'a néma mező-törlés gépi jele (SST09)' }),
      Object.freeze({ paths: ['src/query/queryEntitySpec.js'],
        pattern: 'REJTETT PROJEKCIÓ-OSZLOP',
        reason: 'a sor hozza, a képernyő nem mutatja — nevesítve, nem véletlenül' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-042',
    date: '2026-08-20',
    title: 'AZ ÉRTÉKADÁS-LISTA, AMI KÉTSZER ÍRT UGYANARRA AZ OSZLOPRA',
    what: 'Az API-kapcsolat mentése a szinkron-pipákat a bolt-sorra vezeti át, és a SET-listát KAPCSOLÓNKÉNT '
      + 'építette (`${tg.store_flag} = $n` minden pipára). A D-VS-429/2 óta viszont KÉT pipa mutat ugyanarra az '
      + 'oszlopra — a „Termék feltöltés" és a „Termék-kategória feltöltés" ugyanazt a bolti kaput nyitja '
      + '(`product_export_enabled`, mindkét feltöltő azt olvassa). Az UPDATE ezért ugyanazt az oszlopot KÉTSZER '
      + 'kapta, a Postgres pedig eldobta (42601: „multiple assignments to same column"). Következmény: MINDEN '
      + 'kapcsolat-mentés 500-zal végződött — miközben a sor előtte már létrejött (nincs tranzakció), tehát a '
      + 'képernyő azt mondta, nem sikerült, az adat mégis ott volt. A `catch` ráadásul a forrás mondatát egy '
      + 'puszta `save_failed` címkére cserélte, így a diagnózis is elveszett.',
    why_wrong: 'a KUKA-024 alakja az ÉRTÉKADÁS terében: a mondat és a lista külön-külön hibátlan volt (a szótár '
      + 'ép, az SQL-sablon ép), a VISZONYUK nem — egy több-az-egyhez leképezésből egy-az-egyhez listát építeni '
      + 'némán duplikál. A hibát a zöld söprés nem látta, mert a pin a forrás SZÖVEGÉT nézte; és a KUKA-028 '
      + 'tanulsága is sérült: a hiba-fordítás lecserélte a forrás mondatát, ezért hónapokig nem derült ki, MI '
      + 'a baj. A részleges írás (sor létrejön, válasz 500) a KUKA-026 család rokona.',
    replaced_by: 'nevezett, exportált építő (`buildStoreToggleUpdate`), ami OSZLOPONKÉNT csoportosít, és a közös '
      + 'kaput VAGY-olja: a kapu nyitva, ha bármelyik hozzá tartozó pipa be van kapcsolva. A mentés `catch`-e '
      + 'pedig továbbadja az adatbázis mondatát (hibakód + üzenet, érték nélkül), hogy a képernyő ne címkét, '
      + 'hanem OKOT mondjon.',
    decision: 'D-VS-493',
    found_by: 'a D-VS-493 kör ÉLŐ próbája (eldobható Postgres): a rács-próba mentés-lépése 500-at kapott, '
      + 'miközben a sor létrejött — a söprés végig zöld volt',
    lesson: 'AHOL EGY LEKÉPEZÉS TÖBB-AZ-EGYHEZ, OTT AZ ÉRTÉKADÁS-LISTÁT OSZLOPONKÉNT KELL ÉPÍTENI, nem a '
      + 'forrás-elemenként — és a szabályt nevezett feloldóba, hogy a pin HÍVHASSA (KUKA-009). Két általános '
      + 'tanulság mellé: (1) ha egy művelet több lépésből áll és nincs tranzakcióban, a kudarc-üzenet nem '
      + 'mondhatja, hogy „nem sikerült", amikor a fele megtörtént; (2) a hiba-fordítás soha ne cserélje le a '
      + 'forrás mondatát (KUKA-028) — a címke elrejti az okot.',
    guard_note: 'gépi jel: `npm run verify:sync-controls` SCT07 — a pin HÍVJA az építőt: nincs kétszer '
      + 'értékadott oszlop · a szótár minden bolt-oszlopa szerepel · a helyőrző-számozás pontosan az '
      + 'érték-listára mutat (arity, KUKA-024) · a közös kapu VAGY-olva nyílik és pipa nélkül zárva marad. '
      + 'A harapás bizonyítva: a RÉGI (kapcsolónkénti) alakon a duplikátum-ellenőrzés pirosat ad.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/settings/apiConnectionService.js'],
        pattern: "sets\\.push\\(`\\$\\{tg\\.store_flag\\}",
        reason: 'kapcsolónkénti SET-lista több-az-egyhez leképezésen — némán duplikálja az oszlopot (SCT07)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/settings/apiConnectionService.js'],
        pattern: 'function buildStoreToggleUpdate',
        reason: 'nevezett építő, amit a pin HÍVNI tud (KUKA-009)' }),
      Object.freeze({ paths: ['tools/vs_verify_sync_controls.mjs'],
        pattern: 'nincs kétszer értékadott oszlop',
        reason: 'a duplikátum-ellenőrzés gépi jele' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-051',
    date: '2026-08-23',
    title: 'A MÉRÉS, AMI NEM NŐTT EGYÜTT A KÉPERNYŐVEL — kézzel felsorolt próba-alanyok',
    what: 'A képernyő-súgó böngésző-próbája (D-VS-522) KÉT képernyőt kattintott végig, névvel beírva '
      + '(Termékek, Raktárak), a forrás-oldali őr pedig a felület-regiszternek is csak EGY szeletét '
      + 'nézte. Az operátor kérdésére („ha új oldal, fül, blokk, mező, lista készül, azok is bekerülnek '
      + 'az állandó ellenőrzésbe?") a mérés ÖT lyukat adott, mind élő: (1) a regiszterben KÉT '
      + 'oszlop-ábrázolás él, és a súgó csak az egyiket olvasta — ÖT lista-képernyőnek (EPR jelentés · '
      + 'EPR átnézés · Hulladék-nyilvántartás · EPR bevallások · Kimenő levelek) nem volt oszlop-súgója; '
      + '(2) a szakasz-jelzőket csak a HALOTT irányban őriztük, ezért az EPR bevallás szakasza némán '
      + 'kimaradt; (3) az adatlap 135 MEZŐJÉT semmi nem mérte — a `field.is_active` három képernyőn '
      + 'hiányzott a szótárból; (4) a MŰVELETEK menü kézzel épített fája nem hordozta a felület '
      + 'azonosítóját, tehát a Riport-ág 14 képernyőjét semmilyen mérés nem tudta megszólítani; (5) a '
      + 'súgó-GOMB csak a generikus lista fejlécén állt — tizenegy saját elrendezésű képernyőn (köztük a '
      + 'Rendszerbeállítások) a súgó tartalma elkészült, de nem volt hova kattintani. A regiszter-vezérelt '
      + 'próba ELSŐ menetén rögtön ki is bukott egy halott képernyő: a Fajta-azonosság a megépítése óta '
      + '(D-VS-413) „t is not a function" hibával halt el, mert a renderelője a MÁSODIK helyen várta a '
      + 'függőségeit, a diszpécser viszont a NEGYEDIKEN adja.',
    why_wrong: 'a kézzel felsorolt próba-alany a felsoroláskori rendszert méri, nem a mait: minden új '
      + 'képernyő, fül, blokk és mező AUTOMATIKUSAN kimarad belőle, és a battéria pont attól marad zöld, '
      + 'hogy nem néz oda (a KUKA-045 „kézzel léptetett szám" elve a MÉRÉS HATÓKÖRÉRE). Ezért a '
      + 'legveszélyesebb az a lyuk, amiről a mérés maga hallgat: a nem mért képernyő nem „ismeretlen '
      + 'állapotú", hanem ZÖLDNEK LÁTSZIK.',
    replaced_by: 'a mérés hatóköre mostantól a FELÜLET-REGISZTER bejárása, nem lista: az őr minden élő '
      + 'képernyőt, oszlopot, adatlap-mezőt, szakaszt és beállítás-fület végigmér három nyelven, a '
      + 'böngésző-próba pedig MINDEN képernyő súgóját megnyitja, szintén három nyelven — a lista a '
      + 'regiszterből jön, tehát egy új képernyő magától bekerül. Ahol a bejárat kézzel épített fa marad '
      + '(MŰVELETEK menü), ott az őr a fát HÍVJA és a regiszterhez méri, tehát bejárat nélküli képernyő '
      + 'nem születhet. A súgó-gomb a saját elrendezésű képernyőkre is felkerült.',
    decision: 'D-VS-524',
    found_by: 'az operátor (2026-08-23): „A böngésző próba fix, vagy ha új oldal, fül, blokk, mező, '
      + 'lista stb készül, akkor azok is bekerülnek az állandó ellenőrzésbe? Illetve ha valami nem új, '
      + 'csak változik, akkor azt a tesztet változtatja?"',
    lesson: 'A MÉRÉS HATÓKÖRE NEM LISTA, HANEM SZABÁLY. Ha egy próba név szerint sorolja fel az alanyait, '
      + 'akkor a rendszer következő darabja már nincs benne — és ezt semmi nem jelzi. A helyes alak: a '
      + 'próba ugyanabból a regiszterből veszi az alanyait, amiből a KÉPERNYŐ épül, padlóval a néma '
      + 'zsugorodás ellen (KUKA-012). Amit pedig egy kézzel épített darab tart (menü-fa, szakasz-térkép), '
      + 'ott az őr MINDKÉT IRÁNYT mérje (KUKA-039) — a halott bejegyzés kellemetlen, a hiányzó bejegyzés '
      + 'viszont NÉMA. És: egy változó (nem új) képernyőnél a próbát NEM kell átírni, ha a származtatott '
      + 'igazságot méri és nem a lemásolt szövegét — ez a különbség aközött, hogy a mérés karbantartást '
      + 'kér vagy magától követ. '
      + 'VISSZATÉRT A SAJÁT PINEMBEN (2026-09-06, D-VS-654): az olvashatóság-őr (DHT03) a lapokat NÉV-ELŐTAG '
      + 'szerint válogatta (`LEVEL_`/`V3_`), és épp a külső félnek írt board-útmutató maradt ki belőle — abban '
      + 'ment volna ki nyers jelölés. A hatókör most SZABÁLY: a `docs/70_PLANNING/` MINDEN lapja, padlóval. '
      + 'És ugyanabban a körben a jel PONTOSSÁGA is javult (KUKA-049): a `**` GLOB is lehet (`src/**/*.js`), '
      + 'amit HELYES változatlanul kiírni — a téves riasztás előbb-utóbb kikapcsoltatja az őrt, ezért a '
      + 'megkülönböztető a SZOMSZÉD (`/` vagy `*`), és a kód-részletek tartalma nem is jelölés.',
    guard_note: 'gépi jel: `npm run verify:screen-texts` — SCT06 a súgó és a KÉPERNYŐ oszlop-olvasójának '
      + 'VISZONYÁT méri felületenként (két modul-rendszer, egy szabály — a szerver nem hívhatja a kliens '
      + 'ES-modulját a Node-20-as padló miatt, ezért a gép méri az egyezést, KUKA-024/036); SCT07 a '
      + 'szakasz-jelzőket MINDKÉT irányban; SCT08 a 135 adatlap-mező feliratát három nyelven, padlóval; '
      + 'SCT09 a 19 beállítás-fület; SCT10 azt, hogy minden regisztrált képernyőnek van BEJÁRATA a '
      + 'menüben (a MŰVELETEK fát HÍVJA, nem olvassa). Böngésző-oldalon '
      + '`tests/e2e/screen-help.spec.js`: 35 képernyő × 3 nyelv, a lista a regiszterből, padlóval — ez '
      + 'találta meg a halott Fajta-azonosság képernyőt. MÁSODIK KÖR (D-VS-526): ugyanez a hatókör-hiba '
      + 'élt a FELIRAT-SZIVÁRGÁS próbájában is — a felismerés általános volt (a „rossz" halmazt a szótár '
      + 'adja), de a szkennelő KÉT képernyőt látott; `tests/e2e/i18n-ui-coverage.spec.js` mostantól '
      + 'szintén a regisztert járja be (35 képernyő × EN/DE, padlóval), és rögtön talált egy teljesen '
      + 'magyarul maradt képernyőt (Őrjárat) + két magyar gombot a folyamat/bizonylat listán.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['tests/e2e/screen-help.spec.js'],
        pattern: "const LIVE = \\[",
        reason: 'a próba alanyai nem állhatnak kézzel gépelt tömbben — a regiszterből kell jönniük (KUKA-051)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tests/e2e/screen-help.spec.js'],
        pattern: "require\\('\\.\\./\\.\\./config/registries/ui_surfaces\\.json'\\)",
        reason: 'a böngésző-próba a FELÜLET-REGISZTERBŐL veszi az alanyait — új képernyő magától bekerül' }),
      Object.freeze({ paths: ['tests/e2e/screen-help.spec.js'],
        pattern: 'LIVE_FLOOR',
        reason: 'padló a néma zsugorodás ellen (KUKA-012), nem várt darabszám (KUKA-045)' }),
      Object.freeze({ paths: ['tests/e2e/i18n-ui-coverage.spec.js'],
        pattern: "require\\('\\.\\./\\.\\./config/registries/ui_surfaces\\.json'\\)",
        reason: 'a felirat-szivárgás próbája is a regisztert járja be — nem két képernyőt lát (D-VS-526)' }),
      Object.freeze({ paths: ['tests/e2e/i18n-ui-coverage.spec.js'],
        pattern: 'LIVE_FLOOR',
        reason: 'padló: a bejárt képernyők száma nem eshet a mért kör alá (KUKA-012)' }),
      Object.freeze({ paths: ['tools/vs_verify_screen_texts.mjs'],
        pattern: 'operationsFlyout',
        reason: 'a kézzel épített menü-fát HÍVJA és a regiszterhez méri — bejárat nélküli képernyő nem születhet (KUKA-011)' }),
      Object.freeze({ paths: ['tools/vs_verify_screen_texts.mjs'],
        pattern: 'getSurfaceColumns',
        reason: 'a súgó és a képernyő oszlop-olvasójának VISZONYA mérve, nem a két oldal külön-külön (KUKA-024)' }),
      Object.freeze({ paths: ['public/js/surface-help.mjs'],
        pattern: 'export function mountSurfaceHelp',
        reason: 'a súgó-gomb a saját elrendezésű képernyőkön is — a tartalom megléte nem bejárat (KUKA-011)' }),
      Object.freeze({ paths: ['public/js/app.mjs'],
        pattern: 'mountSurfaceHelp\\(content, s,',
        reason: 'a shell KI IS TESZI a gombot a saját elrendezésű képernyőkre (a hívó→varrat viszony, KUKA-025)' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-050',
    date: '2026-08-22',
    title: 'A SZÖVEG, AMI A MÚLTAT ÁLLÍTOTTA — a leíró szöveg nem követte a rendszer fejlődését',
    what: 'A Termékek oktató szövege azt állította, hogy a képernyő „egyelőre csak olvasható", és hogy '
      + '„a készlet, az árazás, a kategóriák és a recept nem szerepel rajta" — miközben a felület ÍRHATÓ '
      + '(37 szerkeszthető mező), és az adatlapon hat szakasz él (képek · receptek · csomagolási szintek '
      + '· tanúsítványok · bolti tartalom · árak), mellette tömeges szerkesztés és riport-gomb. UGYANEZT '
      + 'állította a SÚGÓ is (a kérdőjel gombra nyíló panel) a termék-, a partner- és a mértékegység-'
      + 'listáról — az viszont a MÁSIK szótárban él (`src/i18n/dictionary.js` `help:` névtér), ezért az '
      + 'első audit nem is látta: a javítás után is tovább hazudott. Az audit '
      + 'további öt leíró szövegben talált valótlan állítást: a partner- és raktár-útmutató „csak nézni '
      + 'lehet"-et mondott az író szerkesztőkről, a kategória-szöveg „következő lépésben érkezik"-et a '
      + 'MEGÉPÜLT szerkesztőről és hozzárendelésről, a termékkarton „az érték nem látszik"-ot a D-VS-405 '
      + 'óta kint lévő forint-értékről, a Rendszerbeállítások leírása pedig 3 fület sorolt fel a 18-ból '
      + 'teljes listaként.',
    why_wrong: 'a leíró szöveg ÁLLÍTÁS a rendszerről, és az állítás elévül: a szöveg a képernyő '
      + 'MEGÍRÁSAKORI állapotát rögzítette, a rendszer továbbfejlődött, és senki nem mérte a kettőt '
      + 'egymáshoz. A nyelvi átfésülés (D-VS-509/516) ezen nem segít — az a MONDATOT javítja, nem a '
      + 'TARTALMÁT. A „később jön" típusú ígéret a legrosszabb: pontosan akkor válik hazugsággá, amikor '
      + 'a munka elkészül — vagyis a siker rontja el.',
    replaced_by: 'a hat szöveg a MAI állapotot mondja (mindhárom nyelven, egyben javítva); a jövőt a '
      + 'szöveg-valóság őr tartja: ÍRHATÓ felület leírása nem mondhatja a képernyőt csak olvashatónak '
      + '(TXR01), függő ígéret csak NEVESÍTVE élhet — indokkal, dátummal, és azzal, minek a megérkezése '
      + 'vezeti ki (TXR02/04) —, a kijavított valótlanság pedig kulcsonkénti tiltó-mintával nem térhet '
      + 'vissza (TXR03). Az operátor kimondott szabálya az ÁLLANDÓK közé került: szöveg csak úgy '
      + 'születhet vagy módosulhat, ha a tartalma a valóságot követi; rendszer-változásnál a szövegeket '
      + 'is át kell nézni.',
    decision: 'D-VS-519',
    found_by: 'az operátor (2026-08-22): „mi az hogy a termékek oldalon csak olvasható, hisz a sorok '
      + 'szerkeszthetőek… ezen felül mi az, hogy a kategóriák nem szerepel rajta, amikor igen. … lehet, '
      + 'hogy az összes butaságot ír!!!!"',
    lesson: 'A LEÍRÓ SZÖVEG ÁLLÍTÁS, ÉS AZ ÁLLÍTÁS ELÉVÜL. Új vagy módosuló szövegnél a kérdés nem csak '
      + 'az, hogy szép-e a mondat, hanem hogy IGAZ-E — a valósághoz kell mérni, nem a szerző emlékéhez '
      + '(a KUKA-033 „méretlen szabály" elve a képernyő-szövegekre). És fordítva: amikor a RENDSZER '
      + 'változik, a rá hivatkozó szövegek is munkalistára kerülnek — a „kész a funkció" addig nem kész, '
      + 'amíg a róla szóló szöveg az ellenkezőjét állítja (KUKA-015 rokona: ami a képernyőn áll, az '
      + 'ígéret). A függő ígéret pedig csak nevesítve élhet, mert a névtelen ígéretet senki nem vezeti ki.',
    guard_note: 'gépi jel: `npm run verify:text-reality` — TXR01 az írható felület ↔ „csak olvasható" '
      + 'ütközést a REGISZTERBŐL méri (writable × szöveg-minta, mindhárom nyelven), MINDKÉT szótáron: az '
      + 'oktató szövegeken ÉS a súgó-témák törzsén (a téma `related_surface` mezője adja a felületet); '
      + 'TXR02/04 a függő ígéretek nevesített listáját (új ígéret névtelenül = piros; beérett ígéret bent '
      + 'maradt bejegyzése = piros); TXR03 a kilenc kijavított kulcs kulcsonkénti tiltó-mintája. A minta '
      + 'HÍVVA bizonyít (a régi hazug mondatokra tüzel, a rekord-állapot igaz mondatára nem — KUKA-009); '
      + 'a harapás élőben is mérve: egy visszaírt súgó-szövegre HÁROM jel váltott pirosra. A tétel a '
      + 'BOARD mátrixában KAPUS (`frm_verify_text_reality` a `pr_close_product` szabályban) — az operátori '
      + 'parancs szerint enélkül a kör nem zárható.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['config/registries/i18n.json'],
        pattern: 'egyelőre csak olvasható',
        reason: 'a képernyő-állapotról szóló időzített állítás a rendszer fejlődésekor némán hazugsággá válik (KUKA-050)' }),
      // RF-017 (2026-08-25): ugyanez a csapda a FEJLESZTŐI szövegeken — a napló leírása azt állította,
      // hogy nincs audit-tábla, miközben a tábla élt és a rendszer írt bele. A jegyzőkönyvek
      // (DECISION_LOG, test_logs, felderítés-leltárak) SZÁNDÉKOSAN nincsenek a listán: azok egy múltbeli
      // állapotot rögzítenek, és nem szabad őket „frissíteni".
      Object.freeze({ paths: ['src/services/auditService.js', 'src/security/auditCorrelationRegistry.js'],
        pattern: 'no audit table exists',
        reason: 'az audit-tábla ÉL (migration_010) és a szolgáltatás ír bele — az ellenkezője elévült állítás (KUKA-050)' }),
      Object.freeze({ paths: ['docs/40_PROTOCOL/VS_AUDIT_AND_CORRELATION.md'],
        pattern: 'durable audit persistence is DEFERRED\\*\\* — no audit table exists',
        reason: 'a napló-fejezet a MAI állapotot mondja: két tároló él, az egyik durable (KUKA-050)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_verify_text_reality.mjs'],
        pattern: 'export const PENDING_ALLOW',
        reason: 'függő ígéret csak nevesítve — indokkal, dátummal, kivezetési feltétellel' }),
      Object.freeze({ paths: ['tools/vs_verify_text_reality.mjs'],
        pattern: "hit\\.s\\.writable !== true",
        reason: 'az állítást a FELÜLET-REGISZTER `writable` tényéhez méri, nem egy második kézzel írt listához (KUKA-018)' }),
      Object.freeze({ paths: ['tools/vs_verify_text_reality.mjs'],
        pattern: "kind: 'help'",
        reason: 'a SÚGÓ szövegei is a mérésben vannak — a magyarázatnak két otthona van, mindkettőt nézni kell' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-049',
    date: '2026-08-22',
    title: 'AZ ŐR, AMI A KÉRT EREDMÉNYT JELENTETTE KUDARCNAK — tünetet mért, nem mechanizmust',
    what: 'A szótár-visszatöltés „szétesett-e a fájl?" őre két jelet adott: ELCSÚSZÁS (egy kulcs új '
      + 'értéke egy MÁSIK kulcs régi értéke) és ÖSSZEOMLÁS (több kulcs kapta ugyanazt az új értéket). '
      + 'Az ELSŐ ÉLES visszatöltésen mindkettő pirosra ment — 43 „elcsúszás" és 3 „összeomlás" —, és '
      + 'MIND A NEGYVENHAT az EGYSÉGESÍTÉS volt, amit az utasítás kifejezetten KÉR: „ugyanaz a fogalom '
      + 'mindenütt ugyanazzal a szóval" („Státusz" → „Állapot", „Megnevezés" → „Név"…). A visszatöltés '
      + 'megállt egy hibátlan javításon. · 2026-08-24, MÁSIK ALAK — A TARTALÉK MÉRCE FELVETTE A PONTOS '
      + 'TANÚ NEVÉT: a partner-átvilágító a naplóból dolgozik („szerkesztették"), de a napló egyetlen '
      + 'partner-szerkesztést sem rögzít, ezért a MÓDOSÍTÁS-IDŐRE váltott — a felsorolás szava viszont '
      + 'maradt „a kár-ablakban SZERKESZTETTÉK". A tág ablakos futáson így 151 „érintett" partner jött '
      + 'ki, közülük 112 gyanúsítottként, holott a soraik cégenként EGYETLEN PERCBEN mozdultak (08:17 és '
      + '08:20) — vagyis a KS ügyfél-átvétel írta őket, nem ember; és mind a hiba SZÜLETÉSE ELŐTT.',
    why_wrong: 'az őr a TÜNETET mérte (az érték egybeesik valahol máshol), nem a MECHANIZMUST. Az '
      + 'egybeesés viszont az egységesítés SZÜKSÉGSZERŰ következménye — vagyis a jel pontosan akkor '
      + 'szólalt meg, amikor a munka jól sikerült. Egy ilyen őr rosszabb, mint a hiánya: az első pár '
      + 'kör után megtanuljuk átlépni (`--force`), és onnantól a VALÓDI elcsúszást sem fogja meg.',
    replaced_by: 'a SZOMSZÉDOSSÁG a megkülönböztető. A valódi elcsúszás gépi jellemzője, hogy a sorok a '
      + 'KÖZVETLEN szomszédjuk (±3 sor) értékét kapják, EGYMÁS UTÁN — egy kimaradt sor után minden '
      + 'következő eggyel arrébb csúszik. Az egységesítés forrásai szétszórtan állnak (mérve: 12–2100 '
      + 'sor távolságra). Az őr ezért a MINTÁT nézi: két egymás melletti gyanús sor már piros, a magányos '
      + 'találat sárga, a szétszórt egyezés pedig TUDNIVALÓ („ennyi fogalom olvadt össze"), nem hiba.',
    decision: 'D-VS-517',
    found_by: 'a saját őr — de rosszul: az operátor javított fájlját utasította vissza, és a leletet '
      + 'kézzel kellett szétválasztani (43 sor egyenkénti visszamérésével), hogy kiderüljön: kár nincs.',
    lesson: 'A JEL A MECHANIZMUST MÉRJE, NE A TÜNETET. Új őrnél ki kell mondani, mi a MEGKÜLÖNBÖZTETŐ a '
      + 'hiba és a KÉRT eredmény között — ha erre nincs válasz, az őr még nincs kész. Az „X egybeesik '
      + 'Y-nal" alakú jelek különösen gyanúsak: az egybeesés sokszor épp a jó munka nyoma. És ha egy őr '
      + 'megállít egy hibátlan menetet, azt NEM megkerülni kell (`--force`), hanem az őrt javítani — '
      + 'különben megtanuljuk átlépni, és a valódi hibát sem fogja meg (a KUKA-004 fordítottja: nem a '
      + 'magyarázat gyenge, hanem a mérés rossz kérdést tesz fel). ÉS A TARTALÉK MÉRCE NEM VEHETI FEL A '
      + 'PONTOS TANÚ NEVÉT: pontos tanúról (napló = „szerkesztették") gyengébb jelzőre (módosítás-idő = '
      + '„mozdult a sora") váltani szabad, de akkor a KÉPERNYŐ SZAVÁNAK is gyengülnie kell, különben a '
      + 'jelentés többet állít, mint amit mért. Ahol a tág mérce idegen mechanizmust is behoz (gépi '
      + 'betöltés), azt NEVEZZÜK MEG — a betöltés gépi jegye a cégenként EGYETLEN PERCBE eső sok sor.',
    guard_note: 'gépi jel: `npm run verify:i18n-roundtrip` IRT07 — a pin HÍVJA a `checkBatch`-et egy '
      + 'SZOMSZÉD-mintás (elcsúszott) és egy SZÉTSZÓRT (egységesített) állománnyal, és megköveteli, hogy '
      + 'az elsőre pirosat, a másodikra ne adjon. Mellé IRT12 (D-VS-517 másik fele): a kódbeli magyar '
      + 'tartalék és a szótár-érték nem csúszhat szét — a visszatöltés maga igazítja, a pin méri. '
      + 'A 2026-08-24-i alakra: `npm run verify:partner-import` PIM09 — a pin HÍVJA a `writeBatches` és '
      + '`movedAfter` feloldókat (a betöltés-perc felismerése, a kézi mentés meg NEM az, a cég-határ, és '
      + 'a hiba születése mint mérce), és megköveteli, hogy a képernyő a döntő számot ÉS a gépi betöltést '
      + 'kimondja, a tartalék mércén pedig gyengébb szóval soroljon.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['tools/lib/vs_i18n_roundtrip.mjs'],
        pattern: 'sor egy MÁSIK kulcs eredeti szövegét kapta — a fájl elcsúszott',
        reason: 'a puszta érték-egybeesés nem elcsúszás-bizonyíték (KUKA-049)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/lib/vs_i18n_roundtrip.mjs'],
        pattern: 'const SHIFT_CONSECUTIVE',
        reason: 'az elcsúszást az EGYMÁS UTÁNI minta bizonyítja, nem a darabszám' }),
      Object.freeze({ paths: ['tools/lib/vs_i18n_roundtrip.mjs'],
        pattern: "push\\('info', 'term_unified'",
        reason: 'az egységesítés TUDNIVALÓ, nem hiba — de kimondva (KUKA-015)' }),
      Object.freeze({ paths: ['tools/lib/vs_i18n_fallbacks.mjs'],
        pattern: 'export function syncFallbacks',
        reason: 'a kódbeli tartalék EGY művelettel mozog a szótárral (KUKA-018)' }),
      Object.freeze({ paths: ['tests/e2e/helpers/reference.js'],
        pattern: 'function huOf\\(key\\)',
        reason: 'a böngésző-próba a KULCSOT nevezi meg, a szót a szótár adja (KUKA-009 a próbákban)' }),
      Object.freeze({ paths: ['tools/vs_partner_email_audit.mjs'],
        pattern: 'export function writeBatches',
        reason: 'a gépi betöltést NEVEZZÜK MEG, nem hagyjuk kézi szerkesztésnek látszani (KUKA-049)' }),
      Object.freeze({ paths: ['tools/vs_partner_email_audit.mjs'],
        pattern: "\\? 'szerkesztették' : 'mozdult a sora",
        reason: 'a tartalék mérce gyengébb SZÓVAL sorol — a jelentés nem állíthat többet, mint amit mért' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-048',
    date: '2026-08-21',
    title: 'A FÁJLRA ADOTT KIVÉTEL — egy jogos engedmény elnyelte a fájl összes többi feliratát',
    what: 'A kézzel írt feliratok plafonja (D-VS-510) NULLÁRA állt, és mellé négy NEVESÍTETT '
      + 'fájl-kivétel került „hatósági nyomtatvány" címen: biokontroll-report · inspection-reports · '
      + 'lot-trace-print · ai-inspector. A mérce viszont nem a nyomtatvány-jelleg, hanem az, hogy KI '
      + 'ÍRJA ELŐ AZ ALAKOT — és ezt csak a Biokontroll-ŰRLAPOKRÓL lehet elmondani. Így négy SAJÁT '
      + 'dokumentumunk (gyártási napló · raktármozgási jegyzék · fordulónapi készlet · nyomonkövetési '
      + 'lap) magyarul maradt angol/német nyelven is, a Biokontroll-modul KÉPERNYŐJE (Riport/Nyomtatás '
      + 'gomb, hintek, visszajelzések) pedig szintén — miközben a battéria végig zöld volt, mert a '
      + 'kivétel épp azt takarta el, amit mérni kellett volna.',
    why_wrong: 'a kivétel HATÓKÖRÉT nem a fájl-határ dönti el, hanem a MÉRCE, ami a kivételt indokolja. '
      + 'Egy fájlra adott engedmény mindent elnyel, ami történetesen ugyanabban a fájlban él — itt két '
      + 'ellentétes szabályú dolog: az ELŐÍRT ALAKÚ űrlap (magyar kötelező) és a körülötte lévő SAJÁT '
      + 'képernyő (fordítandó). A „nyomtatvány" szó ráadásul kategória-tévedés volt: a nyomtathatóság '
      + 'formátum, nem jogi kötelem — attól, hogy egy lapot kinyomtatunk, még a miénk marad.',
    replaced_by: 'a kivétel SZAKASZRA szól, két forrás-horgony között (`EXEMPT_REGIONS`: az űrlap-építők '
      + 'tartománya a biokontroll-modulban), a teljes fájl-kivétel pedig egyedül a fejlesztői '
      + 'diagnosztika-lapon maradt. A saját dokumentumaink NEVESÍTETT nyelv-függő listára kerültek '
      + '(`LANGUAGE_BOUND_DOCS`), és a nyelv EGY helyről oldódik fel (`currentLang()` a shell által '
      + 'beírt `<html lang>`-ből — KUKA-018). Előre mutató szabály (operátori döntés): új riport/dokumentum '
      + 'sablonnál a fix szövegek AZONNAL a szótárba mennek — ezt a NULLA plafon tartja be.',
    decision: 'D-VS-512',
    found_by: 'az operátor (2026-08-21): „A Biokontrollsok legyenek magyarok, mert magyar dokumentumok, '
      + 'viszont a: gyártási napló, a raktármozgási jegyzék és a nyomonkövetési lap — általános '
      + 'dokumentumok. Nyelváltoztatással az adott nyelven legyenek."',
    lesson: 'A KIVÉTEL HATÓKÖRÉT A MÉRCE DÖNTI EL, NEM A FÁJL. Minden engedménynél ki kell mondani, MI '
      + 'a szabály, ami alól kivételt adunk — és a kivételt PONTOSAN akkora darabra kell szabni, amekkorára '
      + 'az az indok igaz. Ha egy fájlban két ellentétes szabályú dolog él, a fájl-szintű engedmény az '
      + 'egyiket némán elnyeli, és a zöld battéria erről semmit nem mond (KUKA-015 „néma engedmény nincs" '
      + 'elve a kivétel HATÓKÖRÉRE alkalmazva). És: a nyomtathatóság FORMÁTUM, nem jogi kötelem — a lap '
      + 'nyelvét az dönti el, ki írja elő az alakját.',
    guard_note: 'gépi jel: `npm run verify:hardcoded-labels` — HCL02 a szakasz-kivétel horgonyait méri '
      + '(ha egy átnevezés elviszi őket, a tartomány feloldhatatlan → PIROS, nem néma no-op); HCL04 '
      + 'minden saját dokumentumon méri, hogy a szótárból dolgozik ÉS a lap `lang` jelölése vált; HCL05 '
      + 'az ELLENPÁRT: az űrlap-építő szakaszban nincs szótár-hívás és marad a `lang="hu"`, a képernyő-'
      + 'félen viszont VAN fordítás. Mellé BÖNGÉSZŐ-PRÓBA (`tests/e2e/report-document-language.spec.js`): '
      + 'a raktármozgási jegyzék EN nyelven angolul készül, a Biokontroll-űrlap EN módban is magyar marad.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['public/js/inspection-reports.mjs', 'public/js/lot-trace-print.mjs', 'public/js/product-reports.mjs', 'public/js/price-tag-print.mjs', 'public/js/export-document.mjs'],
        pattern: 'lang="hu"',
        reason: 'a SAJÁT dokumentumaink nyelv-jelölése a felhasználó nyelvét követi (KUKA-048)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/vs_verify_hardcoded_labels.mjs'],
        pattern: 'export const EXEMPT_REGIONS',
        reason: 'a kivétel SZAKASZRA szól, nem az egész fájlra' }),
      Object.freeze({ paths: ['tools/vs_verify_hardcoded_labels.mjs'],
        pattern: 'export function exemptRangeFor',
        reason: 'a tartomány a forrás HORGONYAIBÓL oldódik fel, nem kézzel írt sorszámokból (KUKA-045)' }),
      Object.freeze({ paths: ['public/js/i18n-runtime.mjs'],
        pattern: 'export function currentLang',
        reason: 'a nyelvnek EGY otthona van: a shell által beírt `<html lang>` (KUKA-018)' }),
      Object.freeze({ paths: ['public/js/biokontroll-report.mjs'],
        pattern: 'lang="hu"',
        reason: 'az ELŐÍRT ALAKÚ űrlap magyar marad — az ellenpár is mérve' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-047',
    date: '2026-08-21',
    title: 'A KERESZT-TENANT KÉPERNYŐ A FIÓKBAN — üzemeltetői nézet a bérlő menüjében',
    what: 'A tenant-őrjárat első alakja egy MINDEN CÉGET mutató rácsot tett a bérlői alkalmazás '
      + '„Rendszer" menüjébe. A `/system/patrol/state` a kérés tenantját FIGYELMEN KÍVÜL hagyta, és '
      + 'minden cég minden mérését visszaadta; a `/run` és a küszöb-írás a kérés TÖRZSÉBŐL vette a '
      + 'cég-kódot. Vagyis bármelyik előfizető láthatta volna a többi cég készlet-, bizonylat- és '
      + 'törzs-állapotát, és írhatta volna a küszöbeiket.',
    why_wrong: 'a HATÓKÖRT nem a képernyő tartalma dönti el, hanem az, HOL ÉL. Egy üzemeltetői '
      + 'áttekintőnek a bérlői fiókon KÍVÜL a helye (a ChatOps board mintája). A hiba forrása egy '
      + 'kimondatlan előfeltevés volt: „ezt úgyis csak én nyitom meg" — a szoftverben viszont nem az '
      + 'számít, ki szokta megnyitni, hanem ki TUDJA megnyitni. Ráadásul a többi útvonal régóta a '
      + 'szerver-hitelesség szabályát követi („ctx a kérés-környezetből, SOHA a törzsből"), és ezt a '
      + 'meglévő mintát hagytam figyelmen kívül.',
    replaced_by: 'a fiókos útvonalak a KÉRÉS tenantjából indulnak (`ownTenant(req)` → `ctxOf`), cég '
      + 'nélkül elutasítanak, és a törzsből érkező cég-kód SEHOL nem használt; a szolgáltatásban a '
      + 'két nézet szétvált (`stateForTenant` a fiókban · `state()` az üzemeltetői áttekintőnek, ami '
      + 'a fiókon kívül él). A közös sor-építő (`stateRows`) egy otthon marad, hogy ne legyen két igazság.',
    decision: 'D-VS-505',
    found_by: 'az operátor (2026-08-21): „ezt nem gondoltad át ugye, hogy kiraksz a rendszer magjába '
      + 'egy olyat, amit az összes tenant lát az összes tenantról?!"',
    lesson: 'ÚJ KÉPERNYŐNÉL AZ ELSŐ KÉRDÉS NEM AZ, HOGY MIT MUTAT, HANEM HOGY KI LÁTHATJA. Ha egy '
      + 'nézet TÖBB bérlő adatát fogja össze, akkor a bérlői alkalmazásban NINCS helye — akkor sem, '
      + 'ha ma csak egy ember nyitja meg. És minden új útvonalnál ki kell mondani, honnan jön a '
      + 'hatókör: a kérés-környezetből (helyes) vagy a kérés törzséből (soha).',
    guard_note: 'gépi jel: `npm run verify:patrol` PTR08 — a fiókos útvonal nem hívhatja a '
      + 'minden-céges nézetet, minden futtatás a saját cég kódját viszi, a törzs cég-kódja sehol nem '
      + 'használt, a küszöb-írás a saját cégre megy, és a képernyő sem tud más cégről. A harapás HÁROM '
      + 'irányban bizonyítva; élő szerveren KÉT céggel is végigmérve (mindkettő csak a sajátját látja, '
      + 'a törzsben kért idegen cég hatástalan).',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/routes/patrol.routes.js'],
        pattern: 'patrol\\.state\\(\\)',
        reason: 'a minden-céges nézet a BÉRLŐI útvonalon — ez a kereszt-tenant szivárgás maga' }),
      Object.freeze({ paths: ['src/routes/patrol.routes.js'],
        pattern: 'b\\.tenant_code',
        reason: 'a hatókör SOHA nem jöhet a kérés törzséből (szerver-hitelesség)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/routes/patrol.routes.js'],
        pattern: 'async function ownTenant\\(req\\)',
        reason: 'a hatókör EGY helyen, a kérés-környezetből oldódik fel' }),
      Object.freeze({ paths: ['src/patrol/patrolService.js'],
        pattern: 'account_view_is_own_tenant_only: true',
        reason: 'a szerződés kimondja: a fiókban a cég csak a sajátját látja' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-041',
    date: '2026-08-20',
    title: 'A DÍSZ-VEZÉRLŐ — pipa és „ÉLESBEN" gomb, amit senki nem olvas',
    what: 'A szinkron-tábla 19 kapcsolójából HATNAK van valódi olvasója; a többi 13 elmentődik, és '
      + 'SEMMIT nem billent — miközben a képernyőn ugyanúgy néz ki, mint a működő. Ráadásul a Termék · '
      + 'Letöltés soron egy „Futtatás (letöltés)" gomb állt, ami megkérdezte, hogy „Biztosan lefuttatod '
      + 'ÉLESBEN?", majd `apply: false`-szal PRÓBÁT futtatott, és SIKERT jelentett. Az operátor a saját '
      + 'szavaival mondta ki a bajt: „ha én végzek a sync-el egy ilyen 80%-ban kézi vezérlésű valamivel, '
      + 'akkor majd a tenant-ok fognak szólni, hogy ez se működik, ez se működik…!"',
    why_wrong: 'a KUKA-015 („ami a képernyőn áll, azt a gépnek teljesítenie kell") EGY mezőre volt '
      + 'kimondva, és eddig EGYESÉVEL, kézzel ellenőriztük. Egy 21 cellás rácson ez nem tartható: nem az '
      + 'a kérdés, hogy EZ a pipa működik-e, hanem hogy HÁNY nem — és arra addig nem volt válasz, amíg '
      + 'valaki meg nem mérte. A hazug ÉLES gomb ennél is rosszabb: nem hallgat, hanem SIKERT jelent '
      + 'olyasmiről, ami meg sem történt (a KUKA-012 némaság-családjának gomb-alakja).',
    replaced_by: 'a kapu-tudás EGY térképbe került (`apiConnectionModel.TOGGLE_GATES`): minden kapcsolóra '
      + 'ki van mondva, kapuz-e MA, és mit. A cella ezt KIVISZI a képernyőre (`toggle_gate` + tooltip), '
      + 'a nem-kapuzó pipa láthatóan más — de MEGMARAD, mert előre-beállítás a jövendő automata-futtatónak. '
      + 'A hazug éles gomb helyére `live_via_select` lépett: ahol a futtató választást kér, ott a cella '
      + 'nem gyárt éles gombot, hanem MEGMONDJA, hol a valódi út.',
    decision: 'D-VS-480',
    found_by: 'az operátor (2026-08-20): „mi értelme van, ha nem működik … majd a tenant-ok fognak szólni"',
    lesson: 'EGY FELÜLETEN NEM ELÉG CELLÁNKÉNT KÉRDEZNI, HOGY „ki olvassa?" — a rácsra RÁCS-SZINTŰ '
      + 'mérés kell. Ahol sok egyforma vezérlő áll egymás mellett, ott a felhasználó abból indul ki, '
      + 'hogy MIND ugyanúgy működik; egyetlen díszgomb az egész felület hitelét viszi. És: ÉLES gomb, '
      + 'ami nem ír, nem „ártalmatlan" — sikert jelent arról, ami nem történt meg.',
    guard_note: 'gépi jel: `npm run verify:sync-controls` (SCT-01) — SCT02 a DEKLARÁCIÓT méri a forrás '
      + 'valóságához (mindkét irányban: a hamis „kapuz" és a hamis „nem kapuz" is piros), SCT03 padlót '
      + 'tart a működő kapuk számán, SCT04 kiszűri a no-op éles gombot, SCT05 a képernyőt méri. '
      + 'A harapás HÁROM irányban bizonyítva.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/sync/syncEntityRegistry.js'],
        pattern: "live: \\{ apply: false \\}",
        reason: 'ÉLES kérés-törzs, ami nem ír — a gomb sikert jelentene a semmiről (SCT04)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/settings/apiConnectionModel.js'],
        pattern: 'const TOGGLE_GATES = Object\\.freeze\\(\\{',
        reason: 'a kapu-tudás EGY térképben — egy helyen billen (KUKA-018)' }),
      Object.freeze({ paths: ['tools/vs_verify_sync_controls.mjs'],
        pattern: 'const GATE_FLOOR',
        reason: 'a működő kapuk padlója: a néma visszaesés is piros' }),
      Object.freeze({ paths: ['public/js/settings-api-connections.mjs'],
        pattern: 'vs-cell-nogate',
        reason: 'a nem-kapuzó pipa LÁTSZIK — nem hallgatunk róla (KUKA-015)' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-039',
    date: '2026-08-20',
    title: 'A FÉL ŐR — a kivétel, ami csak az egyik ágon állt',
    what: 'A családi közösítő két külön ágon emeli a szöveget a szülőre: „egy-gyerekes" (a családnak '
      + 'EGY kiszerelése van) és „egyetlen tanú" (több kiszerelés, de csak egyen van szöveg). A D-VS-382/9-es '
      + 'kivétel — méret-említéses érték, SEO-cím és kiszerelés-felirat NEM megy a szülőre, mert a jövendő '
      + 'testvér hibásan örökölné (élő lelet: a „Homoktövis magolaj 1 l" cím a 004 szülőn) — CSAK az '
      + '„egyetlen tanú" ág feltételébe került bele, az egy-gyerekes ágba nem. Mérve: egy-gyerekes családnál '
      + 'a méretes SEO-cím és a „liter" kiszerelés-felirat MA felment volna a szülőre.',
    why_wrong: 'az egy-gyerekes család PONT az, amelyik holnap testvért kap — a kivétel ott a legfontosabb, '
      + 'és ott hiányzott. A hiba oka szerkezeti: a kivétel egy hosszú `else if` FELTÉTELÉBE volt beírva, nem '
      + 'függvénybe emelve, ezért a másik ág nem tudott róla (KUKA-003 tükör-alakja: ha egy szabály két helyen '
      + 'kell, de csak egy helyen áll, akkor nem szabály, hanem véletlen). A KUKA-013 rokona is: ott egy ÚJ ÍRÓ '
      + 'tette vissza a kivezetett adatot, itt egy MÁSIK ÁG kerülte meg az őrt.',
    replaced_by: 'a kivétel önálló, exportált, tiszta feloldó (`hoistBlocked(field, value)`), és MINDKÉT ág '
      + 'ezt hívja. A visszatartott mezők külön számot kapnak (`size_bound`), és a képernyő ki is mondja őket — '
      + 'a néma különbözet ugyanolyan hazugság, mint a néma üres lista (KUKA-012). '
      + 'D-VS-471-nél a feloldó a KÖZÖS otthonába költözött (`src/masterData/familyContentResolver.js`), '
      + 'mert a LETÖLTŐ is ugyanezt a szabályt kell használja — a tanulság változatlan, a jelek követték.',
    decision: 'D-VS-469',
    found_by: 'az operátor kérdése (2026-08-20): „ha van szülő, de csak egy gyerek van, akkor nem érdemes '
      + 'már most minden olyan adatot a szülőre rakni? … ha létrehozok egy gyereket, de még nincs adata, '
      + 'akkor »különböző« lesz a két gyerek adata, tehát megint nem megy semmi szülőre. Vagy rosszul látom?"',
    lesson: 'AHOL EGY DÖNTÉSNEK TÖBB ÁGA VAN, A KIVÉTEL NEM ÁLLHAT EGY ÁG FELTÉTELÉBEN. A kivétel önálló, '
      + 'NEVEZETT feloldó legyen, amit minden ág HÍV — és a pin is ezt hívja, MINDEN ágon végigfuttatva '
      + '(KUKA-009). Ha egy szabályt egy `if` feltételébe írok bele, azt a testvér-ág soha nem fogja megtudni. '
      + 'ÉS AZ „ÁG" LEHET MÁSIK ESZKÖZ IS (2026-08-24): az operátor a KS-export MAPPÁJÁT adta meg — előbb az '
      + 'ÁTVILÁGÍTÓNAK, ahol megjavítottam, majd az ÁTVÉTELNEK, ami ugyanazzal a nyers „EISDIR" mondattal állt '
      + 'meg, mert a mappa-felismerés csak az egyik eszközbe került be. Használati kudarc javításakor a kérdés '
      + 'nem az, hogy „hol jelentette", hanem hogy KI MÁS FOGADJA UGYANAZT A BEMENETET — a javítás a KÖZÖS '
      + 'otthonba megy (itt a `resolveKsPath` a KS-olvasóba), a testvér-eszközöket pedig végig kell nézni, '
      + 'mert az operátor a következő szerszámon ugyanabba a falba fut bele. '
      + 'VISSZATÉRT (2026-09-06, D-VS-654): a markdown-fordítóban a sortörésen átnyúló félkövéret az '
      + 'IDÉZET ágán javítottam, a testvér-ágon (LISTA-tétel) nem — a külső félnek szánt board-útmutató '
      + 'két tételében nyers `**` ment volna ki. A javítás mindkét ágon UGYANAZ a szabály: a blokk sorait '
      + 'előbb bekezdéssé fűzzük, és csak utána oldunk jelölést. Megtalálta: a saját ÉLŐ próbám (a boardra '
      + 'feltöltött lap HTML-je) — a forrás-olvasó pin nem látta.',
    guard_note: 'gépi jel: `verify:content-layer` CL75/4 — a pin HÍVJA a `hoistBlocked`-ot, és MINDKÉT ágat '
      + 'végigfuttatja (egy gyerekkel és két gyerekkel is), plusz méri, hogy az ÁLTALÁNOS szöveg továbbra is '
      + 'felmegy (a kivétel nem zárhat be mindent — KUKA-037). A harapását bizonyítottuk: az egy-gyerekes ág '
      + 'kivétel-hívásának törlésére azonnal pirosra váltott. Mellé `verify:sql-columns` SQC05: a behelyettesített '
      + 'mezőnevek (SHARED_FIELDS · CLEAN_FIELDS) és az ON CONFLICT célja is séma-tényként mérve. '
      + 'A 2026-09-06-i visszatérésre: `npm run verify:doc-html` DHT02 — a fixtúra MINDKÉT tördelt alakot '
      + 'viszi (lista-tétel ÉS idézet), tehát a fél javítás piros.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/sync/productContentCleanupService.js', 'src/sync/productContentPullService.js'],
        pattern: "field !== 'packaging_unit'\\s*\\n?\\s*&& field !== 'seo_title'",
        reason: 'a kivétel nem élhet egy ÁG FELTÉTELÉBEN — nevezett feloldó kell, amit minden ág hív' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/masterData/familyContentResolver.js'],
        pattern: 'function hoistBlock\\(field, value, ownName\\)',
        reason: 'a kivétel ÖNÁLLÓ, nevezett feloldó — hívható, mérhető, és INDOKOL (D-VS-477)' }),
      Object.freeze({ paths: ['src/masterData/familyContentResolver.js'],
        pattern: 'const blk = hoistBlock\\(field, present\\[0\\]\\.v,',
        reason: 'a fel-emelés MINDEN ága ugyanazon a kivételen megy át (ez volt a rés)' }),
      Object.freeze({ paths: ['src/sync/productContentCleanupService.js', 'src/sync/productContentPullService.js'],
        pattern: 'fam\\.planHoist\\(',
        reason: 'a rendrakás ÉS a letöltő ugyanazt a feloldót hívja — egy fogalom, egy otthon' }),
      Object.freeze({ paths: ['public/js/settings-api-connections.mjs'],
        pattern: 'cc\\.size_bound',
        reason: 'a visszatartott mezőket a KÉPERNYŐ kimondja — nincs néma különbözet' }),
      Object.freeze({ paths: ['tools/lib/vs_ks_partner_source.mjs'],
        pattern: 'export function resolveKsPath',
        reason: 'a mappa-felismerés a KÖZÖS otthonban áll, nem az egyik eszközben (KUKA-039 az eszközök terében)' }),
      Object.freeze({ paths: ['tools/vs_import_partners.mjs', 'tools/vs_partner_email_audit.mjs'],
        pattern: 'resolveKsPath',
        reason: 'MINDKÉT eszköz ugyanazt hívja — az operátor ugyanazt a bemenetet adja mindkettőnek' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-040',
    date: '2026-08-20',
    title: 'A SZÁLLÍTOTT ESZKÖZ, AMI NEM TALÁLTA A KÖRNYEZETET — és a hiányt az operátor GÉPÉRE fogta',
    what: 'A KS munka/projekt visszatöltő ELSŐ éles próbafutása az operátor gépén a KS-oldalt hibátlanul '
      + 'végigmérte (1542 bizonylat-sor · 1200 bizonylat · 62 elnevezés · 72 projekt · 40 törölt munka), '
      + 'majd megállt: „nincs DATABASE_URL beállítva (ez a gép nem éri el az adatbázist)" — miközben a '
      + 'DATABASE_URL ott van a repó `.env` fájljában, és minden más eszköz eléri vele az adatbázist. Az '
      + 'eszköz ugyanis nem olvasta be a `.env`-et: ezt a repó 88 másik eszköze BEMÁSOLT kód-blokként '
      + 'hordozza, a 89. egyszerűen kimaradt. A söprés végig zöld volt, mert a fejlesztő-környezetben a '
      + 'DATABASE_URL amúgy sincs beállítva — ott a hiány NORMÁLIS, tehát semmit nem jelzett.',
    why_wrong: 'két hiba egyszerre. (1) A környezet-betöltés MÁSOLATBAN élt: amit másolni kell, azt egy új '
      + 'fájl némán kihagyhatja (KUKA-003). (2) Az üzenet a kudarcot a GÉPRE fogta („az operátor gépén kell '
      + 'futtatni") — pont ott, ahol futott: a diagnózis a valódi ok helyett egy feltételezést mondott '
      + '(KUKA-028 rokona), és ezzel az operátort küldte volna oda, ahol már állt.',
    replaced_by: 'egy nevezett, közös betöltő (`tools/lib/vs_tool_env.mjs` → `loadRepoEnv(ROOT)`): a repó '
      + '`.env`-jét olvassa, MEGLÉVŐ környezeti változót soha nem ír felül (élesen a Railway env az '
      + 'erősebb), és ÉRTÉKET nem ad vissza, csak tényt (van-e, honnan). Mellé a `noDatabaseReason()`: a '
      + 'mondat megnevezi, MIT keresett és HOL — gépre sosem keni. A visszatöltő és az átcímkéző eszköz '
      + 'ezt hívja; a nem teljesült `--apply` már hibával lép ki, nem néma nullával (KUKA-012).',
    decision: 'D-VS-478',
    found_by: 'az operátor, az ELSŐ éles próbafutáson (2026-08-20) — beillesztette a kimenetet, amelyben a '
      + 'KS-oldal hibátlan, az adatbázis-fázis viszont el sem indult',
    lesson: 'A SZÁLLÍTOTT ESZKÖZ NEM CSAK AZ ÚTJÁT (KUKA-031), A KÖRNYEZETÉT SEM TIPPELHETI MEG — és a '
      + 'környezet-betöltés nem élhet 88 másolatban, mert a 89. kimarad. Ami minden eszköznek kell, annak '
      + 'EGY nevezett otthona legyen. És a kudarcot ott kell megnevezni, ahol TÖRTÉNT: ha egy üzenet a '
      + 'környezetet hibáztatja, előbb bizonyítsuk be, hogy a környezet a hibás — különben a diagnózis a '
      + 'saját mulasztásunkat álcázza. A zöld söprés itt semmit nem ért: a fejlesztő-gépen a hiányzó '
      + 'adatbázis-elérés normális állapot (KUKA-031 tanulsága a hordozhatóságról, most a környezetre).',
    guard_note: 'gépi jel: `verify:ks-work-project-backfill` KWB08 — a pin HÍVJA a betöltőt eldobható '
      + 'ideiglenes mappán (betölt · nem ír felül · őszintén jelent · értéket nem szivárogtat), és a cél-'
      + 'eszköz betöltésekor MÉRI, hogy a hívás tényleg lefutott a repó gyökerére (nem a forrás szövegét '
      + 'olvassa — KUKA-009/KUKA-024). Mellé SZÁRMAZTATOTT osztály-szemle: minden `tools/*.mjs`, ami '
      + 'adatbázist hív ÉS --apply/--confirm kapuja van, betölti a környezetet (padlóval a néma '
      + 'zsugorodás ellen). A harapását bizonyítottuk: a vezetékezés törlésére három pin váltott pirosra.',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['tools/vs_ks_work_project_backfill.mjs', 'tools/vs_relabel_transform_types.mjs'],
        pattern: 'operátor gépén kell futtatni',
        reason: 'a hiányzó környezetet nem lehet a gépre fogni — ott fut, ahol az operátor futtatja (KUKA-040)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['tools/lib/vs_tool_env.mjs'],
        pattern: 'export function loadRepoEnv',
        reason: 'a környezet-betöltésnek EGY nevezett otthona van (nem 89 másolat)' }),
      Object.freeze({ paths: ['tools/lib/vs_tool_env.mjs'],
        pattern: 'process\\.env\\[k\\] === undefined',
        reason: 'meglévő környezeti változót soha nem ír felül — élesen a valódi env az erősebb' }),
      Object.freeze({ paths: ['tools/vs_ks_work_project_backfill.mjs'],
        pattern: 'loadRepoEnv\\(ROOT\\)',
        reason: 'a visszatöltő a saját gyökerére hívja a betöltőt (KUKA-031 horgonyával)' }),
    ]),
  }),
  Object.freeze({
    id: 'KUKA-052',
    date: '2026-08-24',
    title: 'AZ ŐR, AMI HALOTT ROVATOT MÉRT — a lot_qty_mismatch a vestigiális oszlopot nézte',
    what: 'Az őrjárat „Tétel-mennyiség eltérés" mérése (lot_qty_mismatch) a lot.current_qty rovatot '
      + 'hasonlította az élő készlethez — azt a rovatot, amit a motor a CMD-VS-055-007-009 döntés óta '
      + 'SOHA nem ír (vestigiális: minden élő tételen 0 áll), és amit a képernyők már nem is olvasnak '
      + '(a valós érték a főkönyvből származik). Így a mérés 49 „hibát" mutatott a három valódi cégnél '
      + '34 órán át, óránként riasztva — miközben a mélyvizsgálat mind a 49 tételnél igazolta: a készlet '
      + 'PONTOSAN egyezik a főkönyvvel. Az operátor jogos kérdése buktatta ki („nem tiszta a hiba, nincs '
      + 'se ajánlás, se javítás"), és a levél-lánc is erre a hamis leletre írt volna ügyfél-levelet.',
    why_wrong: 'egy őr csak akkor őr, ha az ÉLŐ igazságot méri: a halott ábrázolást mérő őr nem hibát '
      + 'jelez, hanem a rendszer múltja és jelene közti — üzemszerűen NÖVEKVŐ — távolságot, tehát minden '
      + 'nappal több hamis riasztást ad, és elfedi, hogy a valódi sértetlenség-őr (ledger_mismatch: '
      + 'készlet ↔ főkönyv pozíciónként, KRITIKUS fokozaton) végig zölden állt. A KUKA-018 kérdése '
      + '(„MELYIKET OLVASSA A RENDERELŐ?") a mérőkre is áll: a mérő azt mérje, amit a rendszer OLVAS.',
    replaced_by: 'a lot_qty_mismatch mérés KIVEZETVE a patrol-regiszterből (az élő őr a ledger_mismatch, '
      + 'amely finomabb szemcsén — pozíciónként — méri ugyanazt a sértetlenséget); a rovat egyszeri '
      + 'kiegyenlítést kapott a főkönyvből (tools/vs_lot_rovat_kiegyenlites.mjs — a megmaradt olvasója, '
      + 'a visszafordítás-előnézet, ne hazudjon); a rovat VÉGLEGES sorsa (kivezetés vagy származtatás) '
      + 'NEVESÍTETT külön munka-darab a boardon.',
    decision: 'D-VS-538',
    found_by: 'az operátor (2026-08-24): „ez alapján nekem nem tiszta a hiba, nem tiszta, hogy mit '
      + 'kellene tenni. nincs se ajánlás, se javítás…" — a kérdésére épült mélyvizsgálat-szerszám mérése '
      + 'emelte bizonyítékká (49/49 tétel: készlet==főkönyv).',
    lesson: 'AZ ŐR AZT MÉRJE, AMIT A RENDSZER OLVAS. Vestigiális (motor által nem írt, képernyők által '
      + 'nem olvasott) ábrázolásra őrt állítani hamis riasztás-gyár: a lelet nő az idővel, és a bizalmat '
      + 'viszi el a valódi őrökről. Kivezetéskor a rá épült ESETEK nem záródnak maguktól (a hiányzó '
      + 'mérés nem gyógyulás — KUKA-012), ezért azokat kimondott megjegyzéssel, kézzel kell lezárni. '
      + 'És a lelet mellé mindig AJÁNLÁS kell — a puszta hibaszám az operátornak nem cselekvés.',
    guard_note: 'gépi jel: tiltó-minta ebben a bejegyzésben (a patrol-regiszterbe nem kerülhet vissza '
      + 'current_qty-t olvasó mérés) + `npm run verify:patrol` PTR01 (a mérés-lista teljessége padlóval).',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/patrol/patrolRegistry.js'], pattern: 'current_qty',
        reason: 'a patrol nem mérhet vestigiális rovatot — az élő igazság a stock_balance/stock_movement (KUKA-052)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/patrol/patrolRegistry.js'], pattern: "key: 'ledger_mismatch'",
        reason: 'az élő sértetlenség-őr (készlet ↔ főkönyv pozíciónként) a helyén áll' }),
    ]),
  }),

  Object.freeze({
    id: 'KUKA-056',
    date: '2026-08-25',
    title: 'A SZÖVEGBŐL GYÁRTOTT SZEMÉLY — `<userCode>@vs.local` mint aláíró, és a „fejlesztő" mint CÉG',
    what: 'Az elszámoltathatóságot igénylő írások (folyamat-létrehozás, módosítás-esemény, foglalás) '
      + 'aláíróját a `withUserId` egy SZÖVEGBŐL gyártotta: a fejlesztői azonosság `userCode` mezőjéhez '
      + 'hozzáfűzte a `@vs.local` végződést, és az így kapott e-mail címre keresett `user_account` sort. '
      + 'A sort a cég-seedek hozták létre „Demo Operátor" néven — vagyis MINDEN fejlesztői környezetben '
      + 'született adat egy nem létező emberre volt könyvelve. Mellette a „fejlesztő" fogalma sehol nem '
      + 'létezett SZEMÉLY-szinten: a rendszerben csak a `admin` SZEREP élt, és a fejlesztést a '
      + 'CÉGEKKEL (valach-land · sipi-es-tarsa · vsne) lehetett volna azonosítani — ezt az operátor '
      + 'pontosította ki, mielőtt kódba került volna.',
    why_wrong: 'KÉT KÜLÖN TENGELY ült egy ábrázoláson (KUKA-002): „KI csinálta" (személy, felelősség) és '
      + '„MELYIK CÉGBEN" (hatókör). A szövegből képzett aláíró egyiket sem hordozta hitelesen: a napló '
      + 'nevet mondott, de nem embert. És mert a D-VS-558 óta VAN valódi bejelentkezés, a híd egy KÉSZ '
      + 'varratot kerülte meg (KUKA-025): a munkamenet vitte a valódi felhasználó-azonosítót, a lánc '
      + 'mégis a kitalált címre keresett. Élesben ez a legrosszabb: a `NODE_ENV=staging` miatt a '
      + 'spoofolható fejlesztői azonosság az ÉLES rendszeren is elfogadott volt.',
    replaced_by: 'A SZEMÉLY A MUNKAMENETBŐL jön (`ctxOf` átviszi a session `userId`-t; a `withUserId` '
      + 'először azt nézi). A híd MÁSODLAGOS, MEGSZÓLAL magáról (`userIdSource: \'dev-bridge\'`), és '
      + 'ÉLES telepítésen egyáltalán nem él. A „fejlesztő" SZEMÉLY-szintű, nevezett feloldót kapott '
      + '(`src/security/systemDeveloper.js`, SDV-01 — `VS_DEVELOPER_EMAILS`), ami cégkódra nem tud '
      + 'igent mondani; a cégekhez a felhasználó TAGSÁGAI adnak hozzáférést (egy személy — több cég, '
      + 'a `vs_user_create.mjs` egy hívásból).',
    decision: 'D-VS-562',
    found_by: 'az operátor (2026-08-25): „nem a valach-land tenant a fejlesztő, nem a vsné vagy a sipi. '
      + 'ÉN (operátor) vagyok a fejlesztő. annyi, hogy hozzáférésem van ezekhez a tenant-okhoz, és '
      + 'azokon tesztelni tudom a programot!" — a pontosítás a fogalmat javította ki, MIELŐTT rossz '
      + 'kód épült volna rá.',
    lesson: 'AZ ALÁÍRÓ EGY EMBER, NEM EGY SZÖVEG — és a SZEMÉLY nem a CÉG. Ahol egy művelet '
      + 'elszámoltathatóságot kér, ott a személyt a hitelesítés adja; ha nincs, a rendszer mondja ki, '
      + 'hogy nincs (nevesített forrás-jelölés), és élesben inkább utasítson el, mint hogy kitalált '
      + 'emberre könyveljen. Jelölést (fejlesztő · üzemeltető · tulajdonos) SOHA ne vezess le cégkódból: '
      + 'a hozzáférés TAGSÁG, a jelölés a SZEMÉLY tulajdonsága — a kettő külön nő.',
    guard_note: 'gépi jel: `npm run verify:developer-identity` (30 ellenőrzés — a feloldókat HÍVJA: '
      + 'cégkód sosem fejlesztő · munkamenet mellett a híd nem fut · élesben nincs híd és nincs '
      + 'spoofolható azonosság) + az alábbi tiltó-minta (a szövegből képzett aláíró nem terjedhet '
      + 'szét a szolgáltatás- és middleware-rétegbe).',
    forbidden: Object.freeze([
      Object.freeze({ paths: ['src/services', 'src/security', 'src/middleware', 'src/process', 'src/stock'],
        pattern: '@vs\\.local',
        reason: 'aláírót SZÖVEGBŐL gyártani tilos — a személy a munkamenetből jön (KUKA-056)' }),
      Object.freeze({ paths: ['src/security/systemDeveloper.js'], pattern: 'tenantCode|tenant_id',
        reason: 'a fejlesztő-jelölés SOHA nem vezethető le cégből (KUKA-056)' }),
    ]),
    positive: Object.freeze([
      Object.freeze({ paths: ['src/routes/serviceContext.js'], pattern: "userIdSource: 'dev-bridge'",
        reason: 'a híd megszólal magáról — a napló nem állítja valakiről, hogy ő írt alá' }),
      Object.freeze({ paths: ['src/security/systemDeveloper.js'], pattern: 'never_derived_from_tenant',
        reason: 'a személy-szintű fejlesztő-fogalom a helyén áll' }),
    ]),
  }),

]);

const RETIRED_PATTERN_CONTRACT = Object.freeze({
  contract_id: CONTRACT_ID,
  pure: true,
  db_backed: false,
  entry_count: RETIRED_PATTERNS.length,
  ids: Object.freeze(RETIRED_PATTERNS.map((e) => e.id)),
  machine_checked: true,          // a verify:kuka minden bejegyzés jeleit lefuttatja
  purpose: 'a KIVEZETETT, hibásnak bizonyult megoldások aktív memóriája — hogy ne épüljenek újra',
  required_fields: Object.freeze(['id', 'date', 'title', 'what', 'why_wrong', 'replaced_by', 'decision', 'found_by', 'lesson']),
});

function byId(id) { return RETIRED_PATTERNS.find((e) => e.id === id) || null; }

module.exports = { CONTRACT_ID, RETIRED_PATTERNS, RETIRED_PATTERN_CONTRACT, byId };
