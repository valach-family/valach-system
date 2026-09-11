// V3 MAGREFERENCIA — NORMA-BIZONYÍTÉK INDEX (NRM-01 · `nrm-2` séma; R53 §4 · §5 · §6).
//
// MI EZ A FÁJL, ÉS MI NEM. Ez NEM önálló jogforrás, és nem is „második norma". A kanonikus norma
// EGY van: a külső fél R32-es alapszerződése, K01–K16 azonosítókkal. Ez a fájl annak GÉPI
// BIZONYÍTÉK-INDEXE — megmondja, melyik K-szabály nálunk milyen ATOMI klauzulákra bomlik, és hogy
// az adott klauzulát MA MI BIZONYÍTJA: melyik próba, melyik állítással, milyen visszabontási
// kontroll mellett. A külső fél R53 §5-ben két elfogadható alakot ajánlott; ez a második:
// „az NRM-01 legyen gépi állapot-/bizonyítékindex" a kanonikus szerződéshez. Ezért a futás egyetlen
// kanonikus norma-verziót közöl (`NORM_CONTRACT_VERSION`), és KÜLÖN, saját verziószámmal a
// bizonyíték-index sémáját (`NORMS_INDEX_SCHEMA`) — a kettő nem keverhető össze.
//
// MIÉRT SZÜLETETT ÚJRA (R53 F03 · F04). A régi alak minden normára EGY, szabadon választott
// próbanevet tárolt, a kapu pedig csak azt kérdezte meg, hogy a név SZEREPEL-E a tervezett
// készletben. A külső fél ezt két ellenpéldával döntötte meg:
//   · F03 — a REV-N1 próbáját az idegen, de LÉTEZŐ `P-A04`-re cserélte: a kapu zöld maradt. A
//     puszta LÉTEZÉS nem bizonyíték arra, hogy AZT mérte (KUKA-038).
//   · F04 — ideiglenes másolatban a megvonás KITÖRÖLTE a korábbi parancsokat, nyugtákat és
//     kiadásokat, és a REV-N1-hez rendelt próba mégis PASS maradt: a norma MÁSIK FELÉT (a korábbi
//     esemény sértetlenségét) senki nem mérte. Egy fél feltételt zártam le, és a védelmet készként
//     jelentettem (KUKA-095).
//
// A JAVÍTÁS IRÁNYA MEGFORDUL — A NORMA NEM NEVEZ PRÓBÁT. A MANIFEST próbarekordja deklarálja,
// MELYIK klauzulát MELYIK állítással váltja be (`discharges: [{clause, assertion}]`), a próba
// pedig FUTÁSIDŐBEN kiadja az állítás-azonosítóit (`asserts`). A fedettség EBBŐL SZÁMOLÓDIK:
// nincs `state` mező, amit be lehetne írni (KUKA-041).
//
// AZ R55/F03 UTÁN ÖT FELTÉTEL, ÉS AZ ÖTÖDIK MÉRÉS, NEM SZÁNDÉK. Egy klauzula CSAK akkor fedett, ha
//   (1) legalább egy manifest-próba deklarálja,        — a kötés kétirányú (KUKA-039)
//   (2) MINDEN deklaráló próba rekordja PASS EBBEN a futásban,
//   (3) a deklarált állítást a próba TÉNYLEG kiadta, egyszer, és igaznak mérte (KUKA-009),
//   (4) van DEKLARÁLT visszabontási kontroll (mutáció) arra a próbára, ÉS
//   (5) egy TÉNYLEGES mutációs FUTÁS eredménye megbuktatta ÉPP EZT az állítást — igazolt
//       alkalmazással, az alap- és a mutált forrás mért lenyomatával és futás-jellel.
//
// A NEGYEDIK ÖNMAGÁBAN NEM ELÉG, ÉS EZT MÉRVE TUDJUK. A külső fél N01 esete két, SOHA NEM
// FUTTATOTT `{id, catcher}` bejegyzést adott a kapunak, és mindhárom klauzula `covered` lett — a
// puszta SZÁNDÉK bizonyítéknak látszott. Az N04 pedig azt mutatta meg, hogy ugyanaz a mutáció (M32)
// KÉT klauzulához volt beírva, miközben a futása csak az EGYIK állítást buktatja: egy
// több-állításos próba összesített FAIL állapota nem igazolja mindegyik klauzulát.
//
// ÉS A REFERENCIA-FUTÁS NEM ÁLLÍTHAT TÖBBET, MINT AMIT MÉRT. A magpróba a mutációs battéria ELŐTT
// fut, tehát ott az (5) fogalmilag nem eldönthető: az eredmény `falsification_pending`, nem
// `covered`. A végleges minősítés a battéria után születik, a tényleges futások eredményéből.
//
// KIMONDOTT MARADÉK-KOCKÁZAT (nem hallgatjuk el). A gépezet nem ígér általános szemantikai
// igazolást. Pontosan annyit mond: a DEKLARÁCIÓ PUSZTA ÁTHELYEZÉSE — a próbák változtatása nélkül —
// MOST ÉSZLELHETŐ. Aki egy idegen próbába bele is írja a klauzula állítás-azonosítóját ÉS gondoskodik
// róla, hogy egy mutáció épp azt buktassa, azt a gép nem leplezi le; hogy az az állítás valóban a
// klauzuláról szól-e, emberi, klauzulánkénti tartalmi felülvizsgálat tárgya (lásd `OB-7`).
//
// PURE + INERT: nincs DB, nincs hálózat, nincs titok. Adat és tiszta feloldók.

import { createHash } from 'node:crypto';
import { NORM_CONTRACT, K_IDS, contractDigest, contractRef } from './normContract.mjs';

export const NORMS_INDEX_ID = 'NRM-01';
export const NORMS_INDEX_SCHEMA = 'nrm-2';
export const NORM_CONTRACT_VERSION = contractRef().version;

// ═══ A KANONIKUS SZERZŐDÉS — MÁSIK OTTHONBAN (R55/F04) ═════════════════════════════════════════
//
// A K01–K16 azonosítói, címei és a belőlük képzett SZERZŐDÉS-LENYOMAT a `normContract.mjs`-ben
// élnek. Itt csak HIVATKOZUNK rá — mert a szerződés és a bizonyíték-index KÉT KÜLÖN dolog, két
// külön verzióval és két külön lenyomattal (KUKA-002). Az R54-es alak a kettőt egy hash-be
// keverte, és a külső fél D01 diagnosztikája mérve mutatta meg, hogy a szerződés címének
// megváltozása NEM látszott a kiadott lenyomaton.
export { NORM_CONTRACT, contractDigest, contractRef } from './normContract.mjs';

// ═══ A MEGVONÁS PROTOKOLLJA (R51 §3 · R53 §6) ══════════════════════════════════════════════════
//
// A külső fél kiindulópontja, amit átveszünk: NE egyetlen „visszamenőleges igen/nem" kapcsoló
// legyen. Öt VALÓS helyzet van, és mindegyikhez más teendő tartozik.
//
// A KLAUZULA AZ ATOMI EGYSÉG, NEM A NORMA. Egy norma mondata több, KÜLÖN bizonyítható állítást
// hordoz; ha egyben mérjük, a félig fedett norma teljesen fedettnek látszik — pontosan ez volt az
// F04 (KUKA-095). Ezért minden klauzula önálló azonosítót kap, és a fedettség klauzulánként dől el.
export const REVOCATION_NORMS = Object.freeze([
  Object.freeze({
    id: 'REV-N1',
    // A MONDAT AZ R53 §6 SZERINT ÚJRASZÖVEGEZVE. A régi alak („a tegnapi bevételezése ÉRVÉNYBEN
    // MARAD") túl erős, általános jogi/üzleti állítás volt: azt is kimondta, amit a rendszer nem
    // tud és nem is dolga eldönteni. A helyes mag szűkebb: a megvonás ÖNMAGÁBAN nem törli a
    // korábbi eseményt — a joghatásáról külön, bizonyítékhoz kötött felülvizsgálat dönt.
    rule: 'A megvonás effektív pontjától az attól függő új művelet és új adatkiadás tiltott. A '
      + 'korábban rögzített esemény és akkori engedélyezési döntése nem törlődik; joghatása külön, '
      + 'bizonyítékhoz és alkalmazandó profilhoz kötött felülvizsgálatban változhat, új korrekciós '
      + 'eseménnyel.',
    example: 'A raktáros ma kilép. Új tételt nem rögzíthet, és a tegnapi eredményt sem olvashatja '
      + 'ki többé. A tegnapi bevételezés a történetből nem tűnik el. Ha később bizonyítják, hogy '
      + 'már tegnap sem volt érvényes a felhatalmazása, a REV-N2–N4 felülvizsgálata indul — a '
      + 'rendszer sem az örök érvényességet, sem a meg nem történtséget nem állítja magától.',
    clauses: Object.freeze([
      Object.freeze({
        id: 'REV-N1a',
        covers: Object.freeze(['K07', 'K09']),
        text: 'A megvonás effektív pontjától az attól függő ÚJ művelet, ismétlés és adatkiadás '
          + 'tiltott — a véglegesítési verseny határán is.',
        gap: null,
      }),
      Object.freeze({
        id: 'REV-N1b',
        covers: Object.freeze(['K08', 'K09']),
        text: 'A korábban rögzített esemény és akkori engedélyezési döntése a megvonástól NEM '
          + 'törlődik: a parancs, a nyugta és a korábbi kiadás nyoma a megvonás után is megvan.',
        gap: null,
      }),
      Object.freeze({
        id: 'REV-N1c',
        covers: Object.freeze(['K08']),
        text: 'A korábbi esemény JOGHATÁSA külön, bizonyítékhoz és alkalmazandó profilhoz kötött '
          + 'felülvizsgálatban változhat — új, korrekciós eseménnyel, nem a régi átírásával.',
        // NEM LUMPOLJUK A MÁSIK KETTŐHÖZ. A mondat harmadik fele MÁS gépezetet kíván, mint az első
        // kettő, és épp az hiányzik; ha egy klauzulába kerülne velük, a félig kész norma fedettnek
        // látszana. Ez a KUKA-095 elleni védelem a saját szövegünkön.
        gap: 'Nincs korrekciós esemény-fogalom és nincs „alkalmazandó profil" a magban, tehát a '
          + 'joghatás felülvizsgálata nem modellezhető. A REV-N2 (hatály ⊥ tudomás) és a REV-N4 '
          + '(kompenzáló folyamat) megépítése ELŐFELTÉTEL — enélkül csak azt tudjuk kimondani, '
          + 'hogy a régi sort nem írjuk át.',
      }),
    ]),
  }),
  Object.freeze({
    id: 'REV-N2',
    rule: 'Ha MA érkezik bizonyíték arról, hogy egy képviseleti alap MÁR KORÁBBAN érvénytelen volt, '
      + 'az ÚJ, bizonyítékhoz kötött esemény: MÚLTBELI hatály + MAI rögzítés. Az eredeti történet '
      + 'megmarad, az érintett műveletek felülvizsgálati körbe kerülnek.',
    example: 'Júniusban kiderül, hogy egy márciusi meghatalmazás hibás volt. Látszania kell, mit '
      + 'fogadott el a rendszer márciusban, és mit tudunk ma.',
    clauses: Object.freeze([
      Object.freeze({
        id: 'REV-N2a',
        covers: Object.freeze(['K08']),
        text: 'A HATÁLY ideje és a TUDOMÁS (rögzítés) ideje két külön tengely, és külön-külön '
          + 'lekérdezhető: „március, ahogy márciusban tudtuk" ⊥ „március, ahogy ma tudjuk".',
        gap: 'A mai `membership.revoked_at` EGYETLEN időpont, tehát a két tengelyt nem tudja '
          + 'szétválasztani — ez a KUKA-002 alakja a megvonáson. Nincs esemény-fajta a múltbeli '
          + 'hatályú, mai rögzítésű helyesbítésre, és nincs nézet, ami a két alakot külön '
          + 'reprodukálná.',
      }),
      Object.freeze({
        id: 'REV-N2b',
        covers: Object.freeze(['K08', 'K09']),
        text: 'A visszamenőleges érvénytelenség nem írja át a régi rekordot: az érintett műveletek '
          + 'NEVESÍTETT felülvizsgálati körbe kerülnek, az eredeti történet érintetlenül marad.',
        gap: 'Nincs „felülvizsgálati kör" fogalom a magban: se állapota, se listája, se lezárása. '
          + 'A REV-N2a idő-modellje nélkül nem is számolható ki, MELY műveletek érintettek.',
      }),
    ]),
  }),
  Object.freeze({
    id: 'REV-N3',
    // AZ R55 §7 KORREKCIÓJA ÁTVÉVE. A régi mondat úgy olvasható volt, hogy a bejelentés MAGA is
    // hatáskört kíván — az pedig eleve lehetetlenné tenné a még nem igazolt panaszos jelzését, és
    // épp a visszaélés-jelzést fojtaná el. A helyes szétválasztás: a BEJELENTÉS és a JOG
    // MEGVÁLTOZTATÁSA két külön művelet, két külön feltétellel (KUKA-002 a megvonás-úton).
    rule: 'A BEJELENTÉS és a JOG MEGVÁLTOZTATÁSA két külön művelet. Bárki jelezhet visszaélést — '
      + 'visszaélés-korláttal és SEMLEGES válasszal —, de ettől nem lát belső ügyet és nem vonhat meg '
      + 'jogot. A tényleges felfüggesztéshez, elbíráláshoz és felülvizsgálathoz ellenőrzött hatáskör '
      + 'kell; a bejelentő önmagában nem tud múltat érvényteleníteni.',
    example: 'Aki azt állítja, hogy egy márciusi meghatalmazás hibás volt, ettől még nem láthatja '
      + 'a márciusi árakat.',
    clauses: Object.freeze([
      Object.freeze({
        id: 'REV-N3a',
        covers: Object.freeze(['K04', 'K09']),
        text: 'A megvonást és az utólagos kifogást csak ellenőrzött hatáskörű alany kezdeményezheti '
          + 'és bírálhatja el; a hatáskör hiánya NEVEZETT elutasítás.',
        gap: 'A `revokeMembership` ma nem kérdez hatáskört a HÍVÓTÓL — a magreferencia szintjén a '
          + 'megvonás bemenetnek számít, tehát bárki „megvonhatna". A jogosulatlan kifogás elleni '
          + 'kapu nincs megépítve.',
      }),
      Object.freeze({
        id: 'REV-N3b',
        covers: Object.freeze(['K05', 'K09']),
        text: 'A kifogás BEJELENTÉSE nem ad hozzáférést a vitatott adatokhoz: a bejelentő attól, '
          + 'hogy állít valamit, nem lesz olvasó.',
        gap: 'Nincs kifogás-fogalom, tehát nincs mihez kötni az olvasási tilalmat. A veszély a '
          + 'KUKA-085 alakja: visszavonható ENGEDÉLYT lehet építeni, visszavonható MEGISMERÉST nem '
          + '— ezért ezt a klauzulát a bejelentés bevezetése ELŐTT kell megépíteni, nem utána.',
      }),
      Object.freeze({
        id: 'REV-N3c',
        covers: Object.freeze(['K05', 'K15']),
        text: 'A BEJELENTÉS ÚTJA NYITVA ÁLL a még nem igazolt panaszosnak is: a jelzés fogadása '
          + 'megengedett, a válasz SEMLEGES (nem árulja el, létezik-e az ügy), és visszaélés-korlát '
          + 'védi. A jelzés nem művelet a jogon.',
        gap: 'Nincs bejelentés-fogadó út a magban, tehát se a semleges válasz, se a visszaélés-korlát '
          + 'nem mérhető. A klauzula az R55 §7 korrekciójából született, és a REV-N3a hatáskör-'
          + 'modelljével EGYÜTT kell megépülnie — külön-külön mindkettő félrevezető: hatáskör nélkül '
          + 'a bejelentés jogot mozdítana, bejelentés nélkül a hatáskör elfojtja a jelzést.',
      }),
    ]),
  }),
  Object.freeze({
    id: 'REV-N4',
    rule: 'A felülvizsgálat NEM jelenti a downstream mozgássor automatikus visszagörgetését. A '
      + 'tényleges készlet-, pénzügyi és külső partneri következményt megőrző KORREKCIÓS folyamat '
      + 'kell, külön jogosult és naplózott jóváhagyással, az eredetire hivatkozva.',
    example: 'Már kiszállított árut nem lehet a jogosultsági sor törlésével fizikailag '
      + 'visszacsinálni.',
    clauses: Object.freeze([
      Object.freeze({
        id: 'REV-N4a',
        covers: Object.freeze(['K06', 'K08']),
        text: 'A korrekció ÚJ, az eredetire hivatkozó esemény — a downstream mozgássor automatikus '
          + 'visszagörgetése tilos.',
        gap: 'Nincs kompenzáló-esemény fogalom a magban. A V2-ben van (`reverse`), de a V3 magja '
          + 'ezt még nem modellezi, és a kettő összekötése nem történt meg.',
      }),
      Object.freeze({
        id: 'REV-N4b',
        covers: Object.freeze(['K04', 'K06']),
        text: 'A korrekciót külön jogosult hagyja jóvá, és a jóváhagyás naplózott — a felülvizsgálat '
          + 'ténye önmagában nem hatalmaz fel a végrehajtásra.',
        gap: 'A REV-N4a esemény-fogalma nélkül nincs mit jóváhagyni; a jóváhagyói hatáskör pedig a '
          + 'REV-N3a hatáskör-modelljére épülne, ami szintén nincs meg.',
      }),
    ]),
  }),
  Object.freeze({
    id: 'REV-N5',
    // AZ R55 §7 MÁSODIK KORREKCIÓJA ÁTVÉVE. A régi mondat feltétel nélkül állította, hogy a tiltás
    // „nem sújthat FÜGGETLEN könyveket". Ez TÚL ERŐS: ha a HITELESÍTŐ kompromittálódott, akkor
    // ugyanazzal a hitelesítővel a másik könyvbe SEM szabad bejutni — a könyv és a többi jogosult
    // joga viszont ettől nem szűnik meg. A hatókör tehát az OKBÓL származik, nem egy általános
    // tilalomból (KUKA-048 elve a tiltás hatókörére: a mércét az indok szabja meg).
    rule: 'CÉLZOTT TILTÁS: az ÚJ használat azonnal tiltott, az érintett időszak és a függőségek '
      + 'felderítendők — és A TILTÁS HATÓKÖRE AZ OKÁBÓL SZÁRMAZIK. Kilépés egy cégből a másik, '
      + 'független könyvet nem érinti; kompromittált HITELESÍTŐ viszont mindenhol tilos, ahol azzal '
      + 'lépnének be — a könyv és a többi jogosult joga ettől nem törlődik. A tiltás nem bizonyítja a '
      + 'korábbi műveletek hamisságát.',
    example: 'A jelszó ellopása nem bizonyítja, hogy a felhasználó összes korábbi rendelése hamis.',
    clauses: Object.freeze([
      Object.freeze({
        id: 'REV-N5a',
        covers: Object.freeze(['K09', 'K15']),
        text: 'Az alany-szintű célzott tiltás MINDEN alkalmazható engedő úton azonnal hat — nem '
          + 'csak azon az egyen, amelyiken bevezették.',
        gap: 'Nincs a tagságtól FÜGGETLEN, alany-szintű tiltás-fogalom; ma minden tiltás '
          + 'könyvenkénti tagság-megvonás. A „minden alkalmazható engedő útra érvényes" követelmény '
          + '(R51 §4) ezért nem is mérhető: egyetlen engedő út van.',
      }),
      Object.freeze({
        id: 'REV-N5b',
        covers: Object.freeze(['K09', 'K15']),
        text: 'A tiltás HATÓKÖRE az OKÁBÓL származik: a tiltás FAJTÁJA (hitelesítő · munkamenet · '
          + 'alany · jogalap · könyv · művelet · adatkör) nevezett, és az ok választja ki. Egy cégből '
          + 'kilépés a független könyvet nem érinti; kompromittált hitelesítő mindenhol tilos.',
        gap: 'A magban egyetlen tiltás-fajta van (könyvenkénti tagság-megvonás), tehát a hét fajta '
          + 'és az ok→hatókör leképezés fogalmilag sem jelenik meg. Az R55 §7 korrekciójából '
          + 'született: a korábbi szövegünk feltétel nélkül mondta, hogy a független könyv sértetlen '
          + '— ez kompromittált HITELESÍTŐNÉL téves.',
      }),
      Object.freeze({
        id: 'REV-N5c',
        covers: Object.freeze(['K09']),
        text: 'A tiltás nem bizonyítja a korábbi műveletek érvénytelenségét, és nem törli a KÖNYV '
          + 'vagy más, független jogosultak jogait.',
        gap: 'A REV-N5a/b tiltás-fogalma nélkül nincs alanya. Az ellenpár-mérés (a többi jogosult '
          + 'joga megmarad) csak akkor futtatható, ha a tiltás létezik — enélkül a klauzula méretlen, '
          + 'tehát KUKA-051 szerint zöldnek LÁTSZANA.',
      }),
    ]),
  }),
]);

// ═══ A MEGMARADÓ ÖNÁLLÓ SZERVEZETI ALAP (R51 §4 — a Q09 kérdésünkre adott válaszuk) ═════════════
//
// A válasz lényege, amit átveszünk: a megmaradó alap a SZERVEZET tényleges, továbbra is érvényes
// felhatalmazása — NEM egy `organization` felirat, amit a kérő beír. A személyes továbbdelegálás
// és a tartós szervezeti döntés KÉT KÜLÖNBÖZŐ függőség.
export const ORG_BASIS_NORMS = Object.freeze([
  Object.freeze({
    id: 'ORG-N1',
    rule: 'A meghívóhoz tartozó felhatalmazási döntés őrizze a kibocsátó SZEMÉLYÉT és eljárási '
      + 'minőségét, a képviselt szervezetet/könyvet, az alapul szolgáló grant-/határozat-'
      + 'azonosítókat és VERZIÓIKAT, azok hatályát, valamint az adható szerep, művelet és adatkör '
      + 'korlátját.',
    clauses: Object.freeze([
      Object.freeze({
        id: 'ORG-N1a',
        covers: Object.freeze(['K04', 'K14']),
        text: 'A felhatalmazási döntés tárolja a határozat/grant AZONOSÍTÓJÁT, VERZIÓJÁT és '
          + 'HATÁLYÁT — nem csak a kibocsátó személyét.',
        gap: 'A mai `invite.issuer_subject` EGYETLEN személyre mutat, és a jogalapot a `rightAt` '
          + 'MAI válasza adja. Se határozat-azonosító, se verzió, se hatály nincs tárolva, tehát a '
          + 'kiadott meghívó nem tudja megmondani, MI alapján adták ki.',
      }),
      Object.freeze({
        id: 'ORG-N1b',
        covers: Object.freeze(['K04', 'K05']),
        text: 'A döntés kimondja az adható SZEREP, MŰVELET és ADATKÖR korlátját — a felhatalmazás '
          + 'nem lehet tágabb, mint az alapja.',
        gap: 'A mai meghívó egyetlen `offered_role` mezőt visz; művelet- és adatkör-korlát nincs. '
          + 'A korlát nélküli felhatalmazás a KUKA-041 alakja a jogon: a szűkítés látszik a '
          + 'papíron, de semmi nem kényszeríti ki.',
      }),
    ]),
  }),
  Object.freeze({
    id: 'ORG-N2',
    rule: 'ALAPÉRTELMEZÉS, amíg az explicit szervezeti alap nincs megépítve és MÉRVE: az egy '
      + 'kibocsátói alapra építő referencia annak megvonásakor maradjon TILTÓ. A szervezeti '
      + 'kivételt SOHA nem helyettesítjük tulajdonos-metaadattal, admin-címkével vagy szabadon '
      + 'választott `basis_kind` mezővel — egy önbevalló mező kiírná magát a jog-ellenőrzés alól.',
    example: 'A kibocsátó jogának megvonása a függő meghívót is érvényteleníti. Ez nem hiányosság, '
      + 'hanem a hiányzó modell helyes kezelése (fail-closed).',
    clauses: Object.freeze([
      Object.freeze({
        id: 'ORG-N2a',
        covers: Object.freeze(['K03', 'K04']),
        text: 'A kibocsátó jogának megvonása után a függő meghívó NEM ad tagságot: a nemleges '
          + 'válasz nevezett (`issuer_right_withdrawn`), nem néma.',
        gap: null,
      }),
    ]),
  }),
  Object.freeze({
    id: 'ORG-N3',
    rule: 'A VAGYLAGOS alapok és az EGYÜTTESEN szükséges jóváhagyások nem mosódhatnak össze: egy '
      + 'választható út kiesése mellett másik élhet; két kötelező jóváhagyásból egy nem elég. '
      + 'Célzott tiltás a megmaradó engedő utat is kizárhatja.',
    clauses: Object.freeze([
      Object.freeze({
        id: 'ORG-N3a',
        covers: Object.freeze(['K04']),
        text: 'A VAGYLAGOS (egy elég) és az EGYÜTTES (mind kell) jogalap-utak külön fogalmak, és a '
          + 'kiesésük külön következménnyel jár.',
        gap: 'A magban EGYETLEN jogalap-út van (tagság), tehát a VAGY/ÉS megkülönböztetés '
          + 'fogalmilag sem jelenik meg. A modell bővítése nélkül ez nem mérhető — és a méretlen '
          + 'klauzula zöldnek látszana (KUKA-051), ezért áll itt kimondva.',
      }),
      Object.freeze({
        id: 'ORG-N3b',
        covers: Object.freeze(['K04', 'K15']),
        text: 'A célzott tiltás (REV-N5) ELSŐBBSÉGET élvez: a megmaradó vagylagos engedő utat is '
          + 'kizárhatja.',
        gap: 'A REV-N5a alany-szintű tiltás-fogalma és az ORG-N3a vagylagos út egyszerre '
          + 'előfeltétel; egyik sincs meg, tehát az elsőbbségi szabálynak ma nincs alanya.',
      }),
    ]),
  }),
]);

export const ALL_NORMS = Object.freeze([...REVOCATION_NORMS, ...ORG_BASIS_NORMS]);

// ═══ NYITOTT BLOKKOLÓK — a lezárási lista (R51 §5.3) ═══════════════════════════════════════════
//
// „A lezárási listán MARADJON LÁTHATÓ …" — ezért ezek nem a naplóban laknak, ahol a következő kör
// már nem olvassa el, hanem itt, ahol a futtató minden alkalommal kiírja őket.
export const OPEN_BLOCKERS = Object.freeze([
  Object.freeze({
    id: 'OB-1', title: 'A valódi TÖBB-ÍRÓS véglegesítési határ',
    why: 'A `node:sqlite` `BEGIN IMMEDIATE` egyetlen íróval dolgozik, és minden „a tranzakció '
      + 'határán" mérésünk determinisztikus közbeiktatás, nem valódi versenyhelyzet.',
    closes_when: 'Postgres (vagy azzal egyenértékű) tárolón sor-zár vagy verzió-őr, KÉT valódi '
      + 'kapcsolattal mérve.',
  }),
  Object.freeze({
    id: 'OB-2', title: 'Q17 — műtermék-útvonal ütközése',
    why: 'A külső fél nyitott tételként tartja számon; nálunk sincs lezárva.',
    closes_when: 'Nevezett ütközés-szabály + próba.',
  }),
  Object.freeze({
    id: 'OB-3', title: 'Bemeneti séma-regiszter',
    why: 'A parancs `declared` tartalmának alakját ma semmi nem írja elő; a típus és a verzió '
      + 'szerepel az azonosságban, de a MEZŐK nem. Az R53/F02 megmutatta, hogy ez nem elméleti: a '
      + 'kizáratlan elválasztó-karakterek ütköző lenyomatot tudtak előállítani.',
    closes_when: 'Típusonként deklarált bemeneti séma + a beadás azt validálja.',
  }),
  Object.freeze({
    id: 'OB-4', title: 'A kiadási osztályozó ellenőrzése NEM ÜRES korpuszon',
    why: 'A V3-ban NULLA `.sql` migráció van, tehát a szigorúbb osztályozó mérése ÜRES halmazon '
      + 'futott — az semmit nem bizonyít. Ezt a saját R50-ünk is kimondta.',
    closes_when: 'Valódi, nem üres migrációs korpuszon lefuttatva, a besorolások kézzel átnézve.',
  }),
  Object.freeze({
    id: 'OB-5', title: 'A megvonás visszamenőleges hatálya (REV-N1c · REV-N2 … REV-N5)',
    why: 'A protokoll megvan és klauzulákra bontva nevesítve van, de a tizenhárom megvonási '
      + 'klauzulából csak kettőnek van ma bizonyítéka.',
    closes_when: 'A hatály/tudomás két tengelye szétválasztva, kompenzáló esemény, hatáskörös '
      + 'kifogás és alany-szintű célzott tiltás — mind mért, deklarált állítású próbával. A '
      + 'sorrendet az R53 §7 rögzíti: REV-N3 → REV-N5 → REV-N2 → ORG-N1 → ORG-N3 → REV-N4.',
  }),
  Object.freeze({
    id: 'OB-6', title: 'Az önálló szervezeti alap (ORG-N1, ORG-N3)',
    why: 'A válasz megvan, a modell nincs. Addig a tiltó alapértelmezés (ORG-N2) él, és az az '
      + 'EGYETLEN szervezeti klauzula, aminek ma bizonyítéka van.',
    closes_when: 'Határozat-azonosító + verzió + hatály tárolva, VAGY/ÉS jogalap-utakkal.',
  }),
  Object.freeze({
    id: 'OB-7', title: 'A norma ↔ állítás TARTALMI megfelelése',
    why: 'A bizonyíték-index PONTOSAN annyit mond: a deklaráció PUSZTA ÁTHELYEZÉSE — a próbák '
      + 'változtatása nélkül — most észlelhető. Ez a támadási határ megnevezése; nem általános '
      + 'lehetetlenségi ígéret (a külső fél R55 §6 pontosítása, átvéve). Azt, hogy a deklarált '
      + 'állítás VALÓBAN a klauzuláról szól-e, gép nem dönti el — és ezt nem hallgatjuk el '
      + '(KUKA-085: a megnevezett kockázat nem kezelt kockázat, de a nem nevezett még rosszabb).',
    closes_when: 'KLAUZULÁNKÉNT rögzített, független TARTALMI felülvizsgálat, ebben a láncban: '
      + 'pontos normaszöveg és lenyomat → élethelyzet → mérendő tulajdonság → pozitív és negatív '
      + 'eset → megváltoztatott kód → ténylegesen megbukó állítás → maradék hatókör. A '
      + 'felülvizsgálat a KONKRÉT verziókhoz kötődik (szerződés-lenyomat + klauzula-lenyomat), és '
      + 'bármelyik változása ELAVULTTÁ teszi — a gépezet ezt már méri (content_review), a tartalom '
      + 'még nincs meg: ma MIND a tizenhat klauzula `none` állapotú.',
  }),
]);

// ═══ AZ ÖNELLENŐRZÉS — KAPU, NEM FELIRAT ═══════════════════════════════════════════════════════

export const NORM_FLOORS = Object.freeze({
  revocation: 5, orgBasis: 3, blockers: 7, clauses: 18, kClauses: 16,
});

/** EGY KLAUZULA KANONIKUS ALAKJA — ehhez kötődik a tartalmi jóváhagyás (R55 §6 · OB-7). */
export function clauseDigest(clause) {
  const bytes = JSON.stringify({ id: clause.id, covers: [...clause.covers], text: clause.text });
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

/** AZ INDEX SAJÁT LENYOMATA (NRM-01) — csak a mi szabályaink és klauzuláink tartalmából. */
export function indexDigest() {
  const bytes = JSON.stringify(ALL_NORMS.map((n) => ({
    id: n.id,
    rule: n.rule,
    clauses: n.clauses.map((c) => ({ id: c.id, covers: [...c.covers], text: c.text })),
  })));
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

/**
 * AZ EGÉSZ BIZONYÍTÉK-INDEX AZONOSSÁGA — a SZERZŐDÉS és az INDEX lenyomata EGYÜTT.
 *
 * Miért kell külön név: a `contractDigest` azt mondja meg, MELYIK szerződést indexeljük, az
 * `indexDigest` azt, MIT tartalmaz az index. Ez a harmadik a KETTŐ EGYÜTTESE — ezért a szerződés
 * bármely változása (például egy K-klauzula címéé) ITT IS látszik. Az R54-es alak pont ezt nem
 * tudta: a külső fél D01 esete a K01 címét átírva változatlan hash-t mért.
 */
export function normsDigest() {
  return `sha256:${createHash('sha256').update(contractDigest()).update('\0').update(indexDigest()).digest('hex')}`;
}

/**
 * A KLAUZULÁNKÉNTI TARTALMI FELÜLVIZSGÁLAT ÁLLAPOTA (R55 §6 · OB-7).
 *
 * A külső fél kimondta, mi az OB-7 elfogadható lezárási alakja: klauzulánként rögzített, független
 * tartalmi felülvizsgálat, a KONKRÉT verziókhoz kötve — és „változás esetén az érintett korábbi
 * tartalmi jóváhagyás váljon elavulttá". A GÉPEZET ettől a körtől megvan; a TARTALOM még nem.
 * A hiányt ÉRTÉKKÉNT mondjuk ki (`none`), nem hallgatással (KUKA-012).
 */
export function contentReviewState(clause) {
  const r = clause && clause.content_review;
  if (!r) return Object.freeze({ state: 'none', why: 'nincs rögzített tartalmi felülvizsgálat' });
  if (r.contract_digest !== contractDigest()) {
    return Object.freeze({ state: 'stale', why: 'a jóváhagyás MÁS szerződés-lenyomatra született' });
  }
  if (r.clause_digest !== clauseDigest(clause)) {
    return Object.freeze({ state: 'stale', why: 'a klauzula SZÖVEGE a jóváhagyás óta megváltozott' });
  }
  return Object.freeze({ state: 'current', by: r.by || null, at: r.at || null, residual: r.residual || null });
}

/** A próbák MELYIK klauzulát MILYEN állítással váltják be — a manifestből, nem a normából. */
export function dischargeMap(probes) {
  const byClause = new Map();
  for (const p of probes || []) {
    for (const d of p.discharges || []) {
      if (!byClause.has(d.clause)) byClause.set(d.clause, []);
      byClause.get(d.clause).push({ probe: p.id, assertion: d.assertion });
    }
  }
  return byClause;
}

/**
 * EGY MUTÁCIÓS EREDMÉNY ELFOGADHATÓSÁGA VISSZABONTÁSI BIZONYÍTÉKKÉNT (R55/F03).
 *
 * MIÉRT SZÜLETETT. Az R54-es negyedik feltétel azt kérdezte, hogy egy mutáció DEFINÍCIÓJÁBAN
 * szerepel-e a próba neve. A külső fél N01 esete ezt megdöntötte: két, SOHA NEM FUTTATOTT,
 * `{id, catcher}` alakú bejegyzés mellett a kapu `ok:true`-t adott, és mindhárom klauzulát
 * `covered`-nek mondta. A puszta SZÁNDÉK nem bizonyíték (KUKA-038 a mutációkon).
 *
 * ÉS AZ N04: az M32 mindkét REV-N1 klauzulához be volt írva, de a FUTÁSA csak az elsőt buktatja —
 * a másodikat nem falszifikálja semmi. Egy több-állításos próba ÖSSZESÍTETT bukása nem igazolja
 * mindegyik klauzulát: a bizonyítéknak a SAJÁT deklarált állítást kell megbuktatnia.
 *
 * Amit egy elfogadható eredménynek hoznia kell: az alkalmazás IGAZOLVA · az alap- és a mutált
 * forrás MÉRT lenyomata (és a kettő különbözik) · futás-jel · a NEVEZETT próba · és a ténylegesen
 * HAMISRA fordult állítás-azonosítók.
 */
export function falsificationQualifies(result, { probe, assertion }) {
  if (!result || typeof result !== 'object') return 'nincs eredmény';
  if (result.applied !== true) return 'a mutáció alkalmazása nincs igazolva';
  if (!result.base_digest || !result.mutated_digest) return 'hiányzik az alap- vagy a mutált forrás lenyomata';
  if (result.base_digest === result.mutated_digest) return 'a mutált forrás lenyomata AZONOS az alapéval — a szerkesztés nem történt meg';
  if (!result.run_token) return 'hiányzik a futás-jel (nem eldönthető, MELYIK futás eredménye)';
  if (result.probe_id !== probe) return `más próbáról szól (${result.probe_id} ≠ ${probe})`;
  const failed = Array.isArray(result.failed_assertions) ? result.failed_assertions : [];
  if (!failed.includes(assertion)) return `a futás NEM buktatta meg a deklarált állítást (${assertion})`;
  return null;
}

const LEGACY_CALL_WHY =
  'NRM-01: a normakapu BIZONYÍTÉK-CSOMAGOT kér, nem próbanév-listát — {probes, mutations, records}. '
  + 'A régi alak egyetlen kérdést tett fel („szerepel-e a név a készletben?"), és épp ezt döntötte '
  + 'meg az R53/F03: a puszta LÉTEZÉS nem bizonyíték (KUKA-038). Bizonyíték nélkül a kapu NEM mond '
  + 'igent (fail-closed): hívd `checkNorms({ probes: EXPECTED_PROBES, mutations: MUTATIONS, records })` '
  + 'alakban, ahol a `records` EBBŐL a futásból való.';

/**
 * A NORMA-BIZONYÍTÉK KAPU. Két, KÜLÖN kezelt hibaosztályt ad vissza (KUKA-020: a programhiba és a
 * valódi „nem" nem eshet egy csatornába):
 *   · `integrity_problems` — a REGISZTER hazudik magáról (szerkezet, gazdátlan deklaráció, hiányzó
 *     hiány-mondat, falszifikálatlan próba). Ez KAPU: a futás 2-es kóddal zár.
 *   · `evidence_problems` — a bizonyíték EBBEN a futásban nem áll meg (bukott/hiányzó próba). Ez
 *     NEM a regiszter hibája: a rekordok már kimondták, a klauzula pedig nem lesz fedett. A futás
 *     1-es kóddal zár, és a lánc megmutatja, HOL szakadt.
 *
 * @param {{probes:Array, mutations:Array, records:Array}} evidence
 */
export function checkNorms(evidence) {
  const integrity = [];
  const evid = [];

  if (!evidence || Array.isArray(evidence) || typeof evidence !== 'object'
      || !Array.isArray(evidence.probes) || !Array.isArray(evidence.mutations)
      || !Array.isArray(evidence.records)) {
    return Object.freeze({
      ok: false, integrity_ok: false, legacy_call: true,
      problems: [LEGACY_CALL_WHY], integrity_problems: [LEGACY_CALL_WHY], evidence_problems: [],
      chain: [], norms: [], digest: normsDigest(),
    });
  }

  const { probes, mutations, records } = evidence;
  // A MUTÁCIÓS EREDMÉNYEK OPCIONÁLISAK, ÉS EZ SZÁNDÉKOS (R55/F03/1). A referencia-futás a battéria
  // ELŐTT fut: ott az állítás teljesüléséről tudunk nyilatkozni, a falszifikációról nem. A hiányuk
  // tehát nem HIBA, hanem ÁLLAPOT — de akkor a klauzula NEM fedett, csak `falsification_pending`.
  const mutationResults = Array.isArray(evidence.mutationResults) ? evidence.mutationResults : null;
  const byClause = dischargeMap(probes);
  const recordOf = new Map(records.map((r) => [r.probe_id, r]));
  const knownProbe = new Set(probes.map((p) => p.id));
  const catchersOf = (probeId) => mutations.filter((m) => m.catcher === probeId).map((m) => m.id);

  // (1) SZERKEZET — és a klauzula-azonosítók GLOBÁLIS egyedisége (a lánc kulcsa).
  const clauseIds = new Set();
  const defined = new Map();
  for (const n of ALL_NORMS) {
    const at = `NORMA/${n.id || '(nincs azonosító)'}`;
    if (!n.id) integrity.push(`${at}: hiányzó azonosító`);
    if (!n.rule || n.rule.length < 40) integrity.push(`${at}: a szabály mondata hiányzik vagy túl rövid`);
    if (!Array.isArray(n.clauses) || n.clauses.length === 0) {
      integrity.push(`${at}: NINCS atomi klauzulája — a norma egészben nem bizonyítható (R53 §4/1)`);
      continue;
    }
    for (const c of n.clauses) {
      const cat = `${at}/${c.id || '(nincs klauzula-azonosító)'}`;
      if (!c.id) { integrity.push(`${cat}: hiányzó klauzula-azonosító`); continue; }
      if (clauseIds.has(c.id)) integrity.push(`${cat}: ISMÉTLŐDŐ klauzula-azonosító`);
      clauseIds.add(c.id);
      defined.set(c.id, { norm: n, clause: c });
      if (!c.text || c.text.length < 30) integrity.push(`${cat}: a klauzula mondata hiányzik vagy túl rövid`);
      if (!Array.isArray(c.covers) || c.covers.length === 0) {
        integrity.push(`${cat}: nem nevez meg kanonikus K-szabályt (${NORM_CONTRACT_VERSION})`);
      } else {
        for (const k of c.covers) {
          if (!K_IDS.has(k)) integrity.push(`${cat}: ismeretlen kanonikus szabály: ${k}`);
        }
      }
    }
  }

  // (2) GAZDÁTLAN DEKLARÁCIÓ — a manifest olyan klauzulát vált be, amit egyetlen norma sem definiál.
  // MINDKÉT IRÁNYT mérjük (KUKA-039): a halott bejegyzés kellemetlen, a HIÁNYZÓ néma.
  for (const [clauseId, decls] of byClause) {
    if (!defined.has(clauseId)) {
      integrity.push(`MANIFEST: a(z) ${decls.map((d) => d.probe).join(', ')} próba olyan klauzulát `
        + `vált be, amit egyetlen norma sem definiál: ${clauseId}`);
    }
  }

  // (3) KLAUZULÁNKÉNTI BIZONYÍTÉK-LÁNC.
  const chain = [];
  const coveredClauses = new Set();
  for (const [clauseId, { norm, clause }] of defined) {
    const decls = byClause.get(clauseId) || [];

    if (decls.length === 0) {
      // Strukturálisan nem bizonyított: ez TERVEZÉSI állapot, tehát NEVEZETT hiány jár hozzá.
      // Aki nem tudja leírni, MI hiányzik, az valószínűleg nem is mérte fel (KUKA-087).
      if (!clause.gap || clause.gap.length < 40) {
        integrity.push(`NORMA/${norm.id}/${clauseId}: nincs bizonyítéka, de a HIÁNY nincs megnevezve `
          + '(min. 40 karakter) — a néma hiány ugyanaz a hazugság, mint a néma üres lista (KUKA-012)');
      }
      chain.push(Object.freeze({
        norm_id: norm.id, clause_id: clauseId, covers: [...clause.covers],
        assertion_id: null, probe_id: null, mutation_candidates: [], falsified_by: null,
        evidence_limit: null, content_review: contentReviewState(clause),
        result: 'no_evidence', why: clause.gap || null,
      }));
      continue;
    }

    // A gap és a bizonyíték KIZÁRJÁK egymást: a regiszter nem állíthatja mindkettőt.
    if (clause.gap) {
      integrity.push(`NORMA/${norm.id}/${clauseId}: egyszerre nevez meg HIÁNYT és van rá bizonyítéka `
        + `(${decls.map((d) => d.probe).join(', ')}) — a kettő nem állhat egyszerre`);
    }

    let allOk = decls.length > 0;
    for (const d of decls) {
      const muts = catchersOf(d.probe);
      const rec = recordOf.get(d.probe);
      let result = 'covered';
      let why = null;
      let falsifiedBy = null;
      let weakEvidence = null;

      if (!knownProbe.has(d.probe)) {
        result = 'unknown_probe';
        why = `a beváltó próba nincs a tervezett készletben: ${d.probe}`;
        integrity.push(`NORMA/${norm.id}/${clauseId}: ${why}`);
      } else if (muts.length === 0) {
        // A FALSZIFIKÁLATLAN PRÓBA NEM BIZONYÍTÉK. Ha egyetlen mutáció sem nevezi elkapónak, akkor
        // nem tudjuk, hogy egyáltalán képes-e bukni (KUKA-041 a mérőn).
        result = 'no_mutation_control';
        why = `a(z) ${d.probe} próbához NINCS visszabontási kontroll (egyetlen mutáció sem nevezi elkapónak)`;
        integrity.push(`NORMA/${norm.id}/${clauseId}: ${why}`);
      } else if (!rec) {
        result = 'probe_missing';
        why = `a(z) ${d.probe} próbának NINCS rekordja ebben a futásban`;
        evid.push(`NORMA/${norm.id}/${clauseId}: ${why}`);
      } else if (rec.status !== 'PASS') {
        result = 'probe_not_pass';
        why = `a(z) ${d.probe} próba állapota ${rec.status}, nem PASS`;
        evid.push(`NORMA/${norm.id}/${clauseId}: ${why}`);
      } else {
        // A DEKLARÁLT ÁLLÍTÁSNAK TÉNYLEG LE KELL FUTNIA. A próba futásidőben adja ki, mit mért
        // (`asserts`); ha a deklarált azonosító nincs köztük, a manifest olyat ígér, amit a próba
        // meg sem kérdez — ez a KUKA-016 alakja a bizonyíték-kötésen.
        const emitted = Array.isArray(rec.assertions) ? rec.assertions : [];
        const hit = emitted.find((a) => a.id === d.assertion);
        if (!hit) {
          result = 'assertion_not_run';
          why = `a(z) ${d.probe} próba NEM adta ki a deklarált állítást: ${d.assertion}`;
          integrity.push(`NORMA/${norm.id}/${clauseId}: ${why}`);
        } else if (hit.pass !== true) {
          result = 'assertion_failed';
          why = `a(z) ${d.probe} próba deklarált állítása megbukott: ${d.assertion}`;
          evid.push(`NORMA/${norm.id}/${clauseId}: ${why}`);
        } else if (mutationResults === null) {
          // AZ ÁLLÍTÁS TELJESÜLT, DE A FALSZIFIKÁCIÓ MÉG NEM FUTOTT (R55/F03/1). Ez nem hiba, és
          // nem is fedettség — KÖZTES állapot, amit KI KELL MONDANI, nem elhallgatni.
          result = 'falsification_pending';
          why = 'az állítás teljesült; a visszabontási bizonyíték a mutációs battériából jön';
        } else {
          // A KLAUZULA SAJÁT ÁLLÍTÁSÁT KELL MEGBUKTATNI (R55/F03/3). Egy több-állításos próba
          // összesített FAIL állapota nem igazolja mindegyik klauzulát.
          const tried = mutationResults.filter((x) => x && x.probe_id === d.probe);
          const good = tried.find((x) => falsificationQualifies(x, { probe: d.probe, assertion: d.assertion }) === null);
          if (!good) {
            result = 'not_falsified';
            const reasons = tried.length
              ? tried.map((x) => `${x.mutation_id}: ${falsificationQualifies(x, { probe: d.probe, assertion: d.assertion })}`).join(' · ')
              : 'egyetlen mutációs eredmény sem érkezett erre a próbára';
            why = `a klauzula deklarált állítását EGYETLEN mutációs futás sem buktatta meg — ${reasons}`;
            evid.push(`NORMA/${norm.id}/${clauseId}: ${why}`);
          } else {
            falsifiedBy = good.mutation_id;
            weakEvidence = good.evidence_limit || null;
          }
        }
      }

      if (result !== 'covered') allOk = false;
      chain.push(Object.freeze({
        norm_id: norm.id, clause_id: clauseId, covers: [...clause.covers],
        assertion_id: d.assertion, probe_id: d.probe,
        // A DEKLARÁLT kontroll-jelöltek és a TÉNYLEGESEN bizonyító futás KÉT KÜLÖN dolog — az R55
        // pont ezt mosta össze bennünk. Ezért két külön mező, két külön néven (KUKA-002).
        mutation_candidates: muts,
        falsified_by: falsifiedBy,
        evidence_limit: weakEvidence,
        // A TARTALMI MEGFELELÉS KÜLÖN TENGELY: a gépi lánc épsége és az emberi felülvizsgálat NEM
        // ugyanaz a kérdés (KUKA-002). Ma minden klauzula `none` — kimondva, nem elhallgatva.
        content_review: contentReviewState(clause),
        result,
        why,
      }));
    }
    if (allOk) coveredClauses.add(clauseId);
  }

  // (4) A PRÓBA IS BESZÉLJEN: kiadott állítás-azonosító, amit egyetlen manifest-bejegyzés sem
  // deklarál — a másik irány (KUKA-039). Ilyenkor valaki írt egy állítást, és elfelejtette bekötni.
  //
  // ÉS AZ AZONOSÍTÓ EGYEDI (R55/F03/5 · az ő N02 esetük). Ha ugyanaz az állítás-azonosító KÉTSZER
  // szerepel egy rekordon, a csomag KÉTÉRTELMŰ: a kapu az elsőt vette, és a második — akár
  // ellentétes — értékét némán elnyelte. Ez akkor is hiba, ha a két érték történetesen egyforma:
  // a kétértelműség maga a baj, nem a következménye (KUKA-002 az állítás-azonosítón).
  for (const rec of records) {
    const p = probes.find((x) => x.id === rec.probe_id);
    const declared = new Set((p ? p.discharges || [] : []).map((d) => d.assertion));
    const seenAssertion = new Map();
    for (const a of Array.isArray(rec.assertions) ? rec.assertions : []) {
      if (!a || typeof a.id !== 'string' || !a.id) {
        integrity.push(`PRÓBA/${rec.probe_id}: állítás-azonosító nélküli bejegyzés a rekordon`);
        continue;
      }
      seenAssertion.set(a.id, (seenAssertion.get(a.id) || 0) + 1);
      if (!declared.has(a.id)) {
        integrity.push(`PRÓBA/${rec.probe_id}: kiadott egy állítás-azonosítót, amit a manifest nem `
          + `deklarál: ${a.id} — a bizonyíték-kötés fél maradt (KUKA-039)`);
      }
    }
    for (const [id, n] of seenAssertion) {
      if (n > 1) {
        integrity.push(`PRÓBA/${rec.probe_id}: ISMÉTLŐDŐ állítás-azonosító (${id} ×${n}) — a `
          + 'bizonyíték-csomag kétértelmű, a kapu nem dönthet arról, melyik érték az igaz');
      }
    }
  }

  // (5) PADLÓK — a néma zsugorodás is piros (KUKA-045).
  if (REVOCATION_NORMS.length < NORM_FLOORS.revocation) integrity.push(`a megvonás-normák száma a padló alá esett (${REVOCATION_NORMS.length} < ${NORM_FLOORS.revocation})`);
  if (ORG_BASIS_NORMS.length < NORM_FLOORS.orgBasis) integrity.push(`a szervezeti-alap normák száma a padló alá esett (${ORG_BASIS_NORMS.length} < ${NORM_FLOORS.orgBasis})`);
  if (OPEN_BLOCKERS.length < NORM_FLOORS.blockers) integrity.push(`a nyitott blokkolók száma a padló alá esett (${OPEN_BLOCKERS.length} < ${NORM_FLOORS.blockers})`);
  if (clauseIds.size < NORM_FLOORS.clauses) integrity.push(`az atomi klauzulák száma a padló alá esett (${clauseIds.size} < ${NORM_FLOORS.clauses})`);
  if (NORM_CONTRACT.clauses.length < NORM_FLOORS.kClauses) integrity.push(`a kanonikus szerződés szabályainak száma a padló alá esett (${NORM_CONTRACT.clauses.length} < ${NORM_FLOORS.kClauses})`);

  for (const b of OPEN_BLOCKERS) {
    const at = `BLOKKOLÓ/${b.id || '(nincs azonosító)'}`;
    if (!b.title) integrity.push(`${at}: hiányzó cím`);
    if (!b.why || b.why.length < 40) integrity.push(`${at}: az INDOK hiányzik vagy túl rövid`);
    if (!b.closes_when || b.closes_when.length < 20) integrity.push(`${at}: nincs LEZÁRÁSI FELTÉTEL`);
  }

  // (6) AZ ÁLLAPOT SZÁMOLÓDIK, NEM DEKLARÁLÓDIK (R53 §4/3) — ÉS A FÜGGŐBEN LÉVŐ FALSZIFIKÁCIÓ NEM
  // FEDETTSÉG (R55/F03/1). A `pending` szándékosan KÜLÖN szó: nem „majdnem kész", hanem az, hogy a
  // bizonyíték egyik fele megvan, a másik még nem futott. Aki ezt „implemented"-nek olvassa, épp
  // azt a hibát ismétli, amit az R55 megtalált.
  const pendingClauses = new Set(chain.filter((c) => c.result === 'falsification_pending').map((c) => c.clause_id));
  const norms = ALL_NORMS.map((n) => {
    const ids = (n.clauses || []).map((c) => c.id);
    const cov = ids.filter((id) => coveredClauses.has(id));
    const pend = ids.filter((id) => !coveredClauses.has(id) && pendingClauses.has(id));
    let state;
    if (cov.length === ids.length && ids.length > 0) state = 'implemented';
    else if (cov.length === 0 && pend.length === 0) state = 'planned';
    else if (cov.length === 0) state = 'pending';
    else state = 'partial';
    return Object.freeze({
      id: n.id,
      clauses_total: ids.length,
      clauses_covered: cov.length,
      clauses_pending: pend.length,
      covered_clause_ids: Object.freeze(cov),
      pending_clause_ids: Object.freeze(pend),
      state,
    });
  });

  const problems = [...integrity, ...evid];
  return Object.freeze({
    ok: problems.length === 0,
    integrity_ok: integrity.length === 0,
    legacy_call: false,
    // A FÁZIS KIMONDVA: a referencia-futás nem állíthatja, hogy a falszifikáció is kész.
    falsification_stage: mutationResults === null ? 'pending' : 'measured',
    problems,
    integrity_problems: integrity,
    evidence_problems: evid,
    chain: Object.freeze(chain),
    norms: Object.freeze(norms),
    contract: contractRef(),
    index_digest: indexDigest(),
    digest: indexDigest(),
  });
}

/**
 * A KIMENET SZÁMSZERŰ ALAKJA — a riport ebből dolgozik, nem kézi másolatból (KUKA-082).
 *
 * Ez a függvény SZÁNDÉKOSAN nem tud a bizonyítékról: a próbarekordba az INDEX AZONOSSÁGA kerül
 * (melyik kanonikus szerződés, melyik index-séma, milyen tartalmi lenyomat), a BIZONYÍTÉK pedig a
 * futás EGY helyére, felül (`norm_evidence`). Két külön kérdés, két külön otthon (KUKA-002); a régi
 * alak minden rekordba beleírta a „hány megépült" számot, ami evidencia nélkül puszta állítás volt.
 */
export function normsSummary() {
  const clauses = ALL_NORMS.reduce((a, n) => a + (n.clauses || []).length, 0);
  return Object.freeze({
    contract_version: NORM_CONTRACT_VERSION,
    index_id: NORMS_INDEX_ID,
    index_schema: NORMS_INDEX_SCHEMA,
    digest: normsDigest(),
    norms: ALL_NORMS.length,
    clauses,
    open_blockers: Object.freeze(OPEN_BLOCKERS.map((b) => b.id)),
  });
}
