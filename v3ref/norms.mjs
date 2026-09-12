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
import { NORM_CONTRACT, K_IDS, contractDigest, contractRef, sourceDocumentCatalog } from './normContract.mjs';

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
export { NORM_CONTRACT, contractDigest, contractRef, sourceDocumentCatalog } from './normContract.mjs';

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
        // AZ R59 §5.1 SZÖVEGÜTKÖZÉSE ÁTVÉVE, BETŰRE. A régi mondat azt is a hatáskörhöz kötötte,
        // hogy valaki KIFOGÁST KEZDEMÉNYEZZEN — ez pedig szemben állt a saját REV-N3c-nkkel, ami a
        // jelzés útját kifejezetten nyitva tartja a még nem igazolt panaszosnak. Két klauzula
        // ugyanarról a műveletről ellentétesen: a régi mondat a bejelentést és a jogváltoztatást
        // egy fogalomra húzta (KUKA-002 a megvonás-úton, most a NORMA SZÖVEGÉBEN). Az elhatárolást
        // maga a szöveg mondja ki, nem a kommentár — a magyarázó szöveg nem őr (KUKA-004).
        text: 'A jog felfüggesztését vagy megvonását, a kifogás érdemi elbírálását és az abból '
          + 'következő jogváltoztatást csak az adott műveletre ellenőrzött hatáskörű alany végezheti. '
          + 'A jelzés fogadása külön művelet; arra az N3b és N3c irányadó.',
        // MEGÉPÜLVE (R65 §7 · req-2 1. lépés): `adjudication.mjs` (ADJ-01) — a hatáskör MŰVELETENKÉNT
        // áll (`suspend` ⇄ `adjudicate` ⇄ `alter_right`), a `revokeMembership` fail-closed módon
        // `alter_right`-ot kér, és a szűkebb felhatalmazás bizonyítottan NEM ad tágabb hatást.
        gap: null,
      }),
      Object.freeze({
        id: 'REV-N3b',
        covers: Object.freeze(['K05', 'K09']),
        text: 'A kifogás BEJELENTÉSE nem ad hozzáférést a vitatott adatokhoz: a bejelentő attól, '
          + 'hogy állít valamit, nem lesz olvasó.',
        // MEGÉPÜLVE (req-2 2. lépés), és a MENETREND szerint: a `readClaim` olvasás-kapuja a
        // bejelentés-út élesítésével EGYÜTT került be, nem utána (KUKA-085 · KUKA-077).
        gap: null,
      }),
      Object.freeze({
        id: 'REV-N3c',
        covers: Object.freeze(['K05', 'K15']),
        text: 'A BEJELENTÉS ÚTJA NYITVA ÁLL a még nem igazolt panaszosnak is: a jelzés fogadása '
          + 'megengedett, a válasz SEMLEGES (nem árulja el, létezik-e az ügy), és visszaélés-korlát '
          + 'védi. A jelzés nem művelet a jogon.',
        // MEGÉPÜLVE (req-2 1. lépés), a REV-N3a-val EGYÜTT, ahogy ez a gap-szöveg előírta:
        // `submitClaim` — nyitott út, BÁJTRA azonos semleges nyugta (a nem létező könyvre is),
        // beadónkénti visszaélés-korlát, és a jelzés semmilyen jogot nem mozdít.
        gap: null,
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

/**
 * A KÖTELEZŐ BIZONYÍTÉK-KÉSZLET (R57/F01 — az ő E02 esetük).
 *
 * MIÉRT SZÜLETETT. A külső fél a `failed_assertions` listákat üresre cserélte a valóban lefutott
 * mutációk összesítésekor. Az összesítő HELYESEN felismerte a hiányt („0/18 FEDETT · 3 állítás
 * teljesült, de NEM falszifikált"), a CLI mégis sikeres mondattal, 0 kilépési kóddal zárt: a végső
 * `clean` csak a REGISZTER szerkezeti épségét nézte, a bizonyíték hiányát nem. Egy automatizált
 * következő lépés így sikernek veheti azt, amit a részletes napló már hibásnak nevez (KUKA-096
 * fordítottja: ott a kapu némította el a mérést, itt a mérés beszél és a kapu nem hallgat rá).
 *
 * MIÉRT NEM „MIND A 18". A 18 klauzulából ma HÁRMAT vállalunk bizonyítottnak; a többi nyitott, és a
 * nyitottságuk NEVESÍTVE áll. Ha a hiányukat futási hibává tennénk, a kapu minden körben piros
 * volna, és megtanulnánk figyelmen kívül hagyni — a zajos őr rosszabb, mint a hiányzó (KUKA-034).
 * Ezért a készlet EXPLICIT és VERZIÓZOTT: ami benne van, arra bizonyíték KELL; ami nincs, az
 * nyitott, és a lánc kimondja. A készlet bővítése tudatos lépés, nem mellékhatás.
 */
export const REQUIRED_EVIDENCE = Object.freeze({
  version: 'req-2',
  since: 'R65',
  clauses: Object.freeze(['REV-N1a', 'REV-N1b', 'ORG-N2a', 'REV-N3a', 'REV-N3b', 'REV-N3c']),
  why: 'ez a HAT klauzula az, amire bizonyítékot VÁLLALUNK (a mutációs battéria megbuktatja a '
    + 'deklarált állításukat). A többi klauzula nyitott — a hiányuk nem futási hiba, de kimondott.',
  // A BŐVÍTÉS TUDATOS LÉPÉS, nem mellékhatás (KUKA-045). A feltételt az R60 ELŐRE kimondta:
  // „mind a három klauzulának van olyan mutációs bizonyítéka, ami a SAJÁT deklarált állítását
  // buktatja meg" — MÉRVE (R65): REV-N3a és REV-N3c ⇒ M50 · REV-N3b ⇒ M53. Innentől a hiányuk
  // FUTÁSI HIBA, nem nevesített nyitottság: aki visszabontja a hatáskör- vagy az olvasás-kaput,
  // annak PIROS a futása, nem „eggyel kevesebb fedett klauzula".
  promoted_in: 'R65',
  promoted_because: 'a req-2 feltétele MÉRVE teljesült: REV-N3a ⇒ M50 · REV-N3b ⇒ M53 · REV-N3c ⇒ M50',
});

/**
 * A KÖVETKEZŐ KÖTELEZŐ CSOMAG — ELŐRE LESZÖGEZVE (R59 §5.1).
 *
 * MIÉRT ELŐRE. Ha az élethelyzetet és a mérendő tulajdonságot AZUTÁN írjuk le, hogy megépült a kód,
 * akkor a mérce a megépült dologhoz igazodik, és a próba a saját előfeltevését igazolja vissza
 * (KUKA-054). Ezért a REV-N3a/b/c élethelyzete, mérendő tulajdonsága és bizonyítási terve MOST
 * rögzül — mielőtt egyetlen sor kód megszületne hozzá. Aki később mást épít, annak ezt a szöveget
 * kell MEGVÁLTOZTATNIA, láthatóan, nem csendben átértelmeznie.
 *
 * A SORREND IS RÖGZÜL, ÉS NEM TETSZŐLEGES. A saját REV-N3c gap-szövegünk kimondja: a hatáskör-modell
 * és a jelzés-fogadó út KÜLÖN-KÜLÖN félrevezető — hatáskör nélkül a bejelentés jogot mozdítana,
 * bejelentés nélkül a hatáskör elfojtja a jelzést. Ezért az 1. lépés a KETTŐ EGYÜTT. És a 2. lépés
 * (a jelzés nem ad olvasást) a bejelentés-út ÉLESÍTÉSE ELŐTT kell hogy meglegyen: visszavonható
 * ENGEDÉLYT lehet építeni, visszavonható MEGISMERÉST nem (KUKA-085 · KUKA-077: a kockázat-lista
 * nem emlékeztető, hanem MENETREND).
 */
export const NEXT_REQUIRED_EVIDENCE = Object.freeze({
  version: 'req-3',
  committed_in: 'R65',
  clauses: Object.freeze(['REV-N5a', 'REV-N5b', 'REV-N5c']),
  becomes_required_when: 'mind a három klauzulának van olyan mutációs bizonyítéka, ami a SAJÁT '
    + 'deklarált állítását buktatja meg — addig a `req-2` a kötelező készlet, és ezek NYITOTTAK',
  // A SORREND AZ R53 §7-BŐL JÖN, változatlanul: REV-N3 → REV-N5 → REV-N2 → ORG-N1 → ORG-N3 → REV-N4.
  // A REV-N3 az R65-ben lezárult (req-2), tehát a soron következő a REV-N5 — a CÉLZOTT TILTÁS.
  //
  // MIÉRT A REV-N5 A KÖVETKEZŐ, ÉS NEM A REV-N2. A REV-N5c saját gap-szövege kimondja, hogy a
  // klauzula a tiltás-fogalom nélkül MÉRETLEN, tehát KUKA-051 szerint ZÖLDNEK LÁTSZANA — egy
  // méretlen klauzula pedig veszélyesebb, mint egy kimondottan nyitott. A REV-N2 idő-modellje
  // ezen felül a tiltás fajtáira is épít (mikortól, mire), tehát utána jön.
  order: Object.freeze([
    Object.freeze({
      n: 1,
      clauses: Object.freeze(['REV-N5b']),
      what: 'a tiltás FAJTÁI és az ok→hatókör leképezés — a fogalom ELŐBB, a hatás utána',
      situation: 'Két, egymástól FÜGGETLEN cég könyve. (a) Egy munkatárs kilép az egyikből. '
        + '(b) Ugyanannak a munkatársnak a HITELESÍTŐJE kompromittálódik.',
      property: 'ugyanaz a szó („tiltás") KÉT KÜLÖNBÖZŐ hatókört kap, és a hatókört az OK választja '
        + 'ki, nem egy általános szabály: a kilépés a másik könyvet NEM érinti, a kompromittált '
        + 'hitelesítő viszont MINDENHOL tilos, ahol azzal lépnének be',
      proof: 'P-REV-ban-scope: (a) kilépés ⇒ a másik könyv joga érintetlen · (b) kompromittált '
        + 'hitelesítő ⇒ MINDKÉT könyvön tilos · (c) a fajta NEVEZETT, zárt halmazból (ismeretlen '
        + 'fajta NEM „általános tiltás", hanem nem dönthető). Mutáció: a fajta→hatókör leképezés '
        + 'kivétele (minden tiltás mindenhol hat — ez a KILÉPÉS esetét buktatja) · a hitelesítő-ág '
        + 'könyvre szűkítése (ez a KOMPROMITTÁLÁS esetét buktatja).',
    }),
    Object.freeze({
      n: 2,
      clauses: Object.freeze(['REV-N5a']),
      what: 'a tiltás MINDEN alkalmazható engedő úton hat — nem csak azon, amelyiken bevezették',
      situation: 'A magban ma EGYETLEN engedő út van (tagság), ezért a klauzula nem is mérhető. '
        + 'Előfeltétel: legalább KÉT engedő út (tagság ÉS a REV-N3-ban megépült hatáskör-út).',
      property: 'egy alany-szintű tiltás a tagsági ÉS a hatásköri úton EGYSZERRE hat; a tiltás '
        + 'bevezetésének HELYE nem szűkíti a hatását',
      proof: 'P-REV-ban-paths: (a) a tagsági úton bevezetett tiltás a HATÁSKÖRI utat is zárja · '
        + '(b) fordítva ugyanígy · (c) ellenpár: egy KÖNYV-hatókörű tiltás a másik könyv útjait NEM '
        + 'zárja. Mutáció: a tiltás ellenőrzésének kivétele a MÁSODIK útról (a fél őr — KUKA-039).',
    }),
    Object.freeze({
      n: 3,
      clauses: Object.freeze(['REV-N5c']),
      what: 'a tiltás nem érvényteleníti a múltat és nem törli MÁSOK jogát',
      situation: 'A tiltott alany korábbi, szabályos műveletei és a KÖNYV többi jogosultjának joga.',
      property: 'a tiltás után a korábbi parancs, nyugta és kiadás MINDEN mezője változatlan, és a '
        + 'többi jogosult ugyanazt teheti, mint előtte (a REV-N1b tartalmi mércéjével mérve)',
      proof: 'P-REV-ban-past: (a) tartalmi pillanatkép a tiltás előtt és után · (b) ellenpár: a '
        + 'másik jogosult művelete ÁTMEGY. Mutáció: a tiltás TÖRLI a múltat · a tiltás a könyv '
        + 'többi tagját is zárja.',
    }),
    Object.freeze({
      n: 4,
      clauses: Object.freeze(['REV-N5a', 'REV-N5b', 'REV-N5c']),
      what: 'a három klauzula BEEMELÉSE a kötelező készletbe (req-2 → req-3)',
      situation: 'A következő kör futtatója zöldet mond — de csak akkor, ha ezek is állnak.',
      property: 'a `REQUIRED_EVIDENCE.clauses` kilencre nő, és a hiányuk innentől FUTÁSI HIBA',
      proof: 'a bővítés TUDATOS lépés (KUKA-045) — a `version` `req-3`-ra vált, és a futás kiírja, '
        + 'mi került be.',
    }),
  ]),
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
 * A KLAUZULÁNKÉNTI TARTALMI FELÜLVIZSGÁLAT ÁLLAPOTA (R55 §6 · R57/F03 · OB-7).
 *
 * MIÉRT SZIGORODOTT. Az R56-os alak KÉT hashből mondott `current`-et: ha a szerződés- és a
 * klauzula-lenyomat stimmelt, a jóváhagyás érvényesnek számított — ellenőrző, időpont, bizonyíték
 * és maradék hatókör NÉLKÜL. A külső fél E04 esete pontosan ezt tette: egy `{contract_digest,
 * clause_digest}` párra `{"state":"current","by":null,"at":null,"residual":null}` jött vissza.
 * Vagyis a mechanizmus, aminek az OB-7 lezárását kellene hordoznia, üres rekordot is elfogadott —
 * a díszpipa (KUKA-041) alakja a tartalmi jóváhagyáson.
 *
 * A MÁSIK FELE: a jóváhagyás a TESZT és az IMPLEMENTÁCIÓ tartalmához sem kötődött, tehát azok
 * változása nem avultatta volna el. Egy review, amit egy néma kód-átírás túlél, nem review.
 *
 * A MAI SZERZŐDÉS. A rekord KÖTELEZŐ tartalmú, és három kötést hordoz (szerződés · klauzula ·
 * a vizsgált forrás és manifest). Ebből:
 *   · hiányos rekord ⇒ `incomplete` — és megnevezi, MI hiányzik;
 *   · bármelyik kötés elcsúszott ⇒ `stale` — és megnevezi, MELYIK;
 *   · `current` CSAK a teljes, minden kötésben egyező rekordra.
 * Ha a futás nem adja át a forrás/manifest kötést, a `current` nem adható ki: nem tudjuk igazolni,
 * és a nem igazolható jóváhagyás fail-closed (KUKA-020).
 *
 * AMI EZZEL NEM LETT KÉSZ, ÉS KIMONDJUK: a `reviewer.id` egy SZÖVEG. Azt, hogy a felülvizsgáló
 * tényleg független volt-e, ez a mechanizmus nem bizonyítja — csak azt kényszeríti ki, hogy a
 * kérdésre VÁLASZOLNI kelljen, és a válasz a rekordban álljon. A regisztrálás JOGÁNAK ellenőrzése
 * nyitott tétel (a külső fél R57/F03 zárómondata), és az OB-7 tartalmi igazságát továbbra is
 * érdemi, független review mondja ki — nem ez a függvény.
 */
/**
 * A REKORD SÉMA-VERZIÓJA (R59/F03). MIÉRT KELL: a jóváhagyás-rekord szerződés, és a szerződés
 * változik. Verzió nélkül egy RÉGI alakú rekord a MAI szabályok szerint ítéltetne meg — vagy ami
 * rosszabb, a mai szigorítás némán átengedné, mert a régi mezők „történetesen" kitöltöttnek
 * látszanak. A rekordnak KI KELL MONDANIA, melyik szerződést beszéli.
 */
export const CONTENT_REVIEW_RECORD_VERSION = 'content-review-2';

/** Nem üres, tényleges SZÖVEG — a `[]`, a `{}` és a `0` nem szöveg, csak „truthy" (R59/F03). */
const isText = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * SZIGORÚ IDŐBÉLYEG. Nem elég, hogy „van valami": a `'not-a-date'` is truthy. A mérce a
 * VISSZAÍRHATÓSÁG — az érték pontosan az az ISO-8601 UTC alak legyen, amit a saját értelmezése
 * visszaad —, és a JÖVŐ nem elfogadható: egy még meg nem történt szemle nem szemle.
 */
function timestampProblem(v, nowMs) {
  if (!isText(v)) return 'nem szöveg vagy üres';
  const t = Date.parse(v);
  if (Number.isNaN(t)) return `nem értelmezhető időpont: ${v}`;
  if (new Date(t).toISOString() !== v) return `nem kanonikus ISO-8601 UTC alak (várt: ${new Date(t).toISOString()})`;
  if (t > nowMs + 60_000) return `a JÖVŐBEN áll (${v}) — meg nem történt szemle`;
  return null;
}

/**
 * EGY BIZONYÍTÉK-HIVATKOZÁS ALAKJA ÉS FELOLDHATÓSÁGA (R59/F03).
 *
 * MIÉRT NEM ELÉG A SZABAD SZÖVEG. Az R57-es alak bármilyen igaz értéket elfogadott bizonyítéknak
 * („pozitív eset"), tehát a rekord hivatkozhatott olyasmire, ami nem létezik — a jóváhagyás
 * ellenőrizhetetlen maradt (KUKA-066: a kitalált forrás nem hibának látszik, hanem adatnak).
 * A hivatkozás ezért TÍPUSOS, és ahol a futás átadja a katalógust, FEL IS OLDJUK.
 */
/**
 * A PRÓBA↔ÁLLÍTÁS KULCS EGYETLEN OTTHONA (R61 utómunka, D-VS-3014).
 *
 * MIÉRT KELL. Ugyanezt az összetett kulcsot KÉT hely építi: itt az OLVASÓ (a hivatkozás feloldása),
 * a futásban pedig az ÍRÓ (a katalógus halmaza). Amíg a szeparátort mindkét oldal a maga kezével
 * írta, két baj állt fenn: (1) egy fogalomnak KÉT ábrázolása volt, és a kettő némán elcsúszhatott
 * (KUKA-018/024 — a lookup nem hibázik, csak MINDIG „nem ismeri" választ ad); (2) az olvasó oldalon
 * a szeparátor NYERS vezérlő-karakterként állt a forrásban, amitől a fájl BINÁRISSÁ vált: a `grep`
 * nem látta, a diff használhatatlan lett, és bármely szöveg-normalizáló némán eltörte volna a
 * kulcs-egyezést. A `\u0000` menekülő alak ugyanaz a karakter, de LÁTHATÓ és hordozható.
 *
 * A szeparátor azért NUL, mert azonosítóban nem fordulhat elő — így két különböző (próba, állítás)
 * pár soha nem eshet egybe.
 */
export function assertionKey(probe, assertion) {
  return `${probe}\u0000${assertion}`;
}

function evidenceRefProblem(ref, at, catalog) {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref)) return `${at}: a hivatkozás nem objektum`;
  const kind = ref.kind;

  // A KATALÓGUS NEM OPCIONÁLIS (R61/F01) — de a követelmény FAJTÁNKÉNT szól. A régi alak
  // `if (catalog && catalog.assertions && …)` volt: aki NEM adott katalógust, annál a feloldás
  // elmaradt, és egy kitalált próba-névre épülő jóváhagyás `current` lett. Ez BETŰRE ugyanaz a
  // hiba, amit a KUKA-108-ban épp javítottam — a saját új őrömbe írtam bele újra (KUKA-111).
  // A fajtánkénti hatókör pedig azért kell, mert a mindenre kiterjedő követelmény a külső fél
  // JOGOS pozitív ellenpárját is elutasította volna (KUKA-049).
  const needs = (part, name) => (part ? null
    : `${at}: NINCS feloldó-katalógus (${name}) — a hivatkozás nem ellenőrizhető, tehát nem bizonyíték`);

  if (kind === 'probe') {
    const miss = needs(catalog && catalog.assertions instanceof Set, 'próba↔állítás készlet');
    if (miss) return miss;
    if (!isText(ref.probe) || !isText(ref.assertion)) return `${at}: a próba-hivatkozáshoz próba ÉS állítás kell`;
    if (!catalog.assertions.has(assertionKey(ref.probe, ref.assertion))) {
      return `${at}: a manifest nem ismeri ezt a próba↔állítás párt (${ref.probe} / ${ref.assertion})`;
    }
    return null;
  }
  if (kind === 'mutation') {
    const miss = needs(catalog && catalog.mutations instanceof Set, 'mutáció-regiszter');
    if (miss) return miss;
    if (!isText(ref.mutation)) return `${at}: a mutáció-hivatkozásnak nincs azonosítója`;
    if (!catalog.mutations.has(ref.mutation)) {
      return `${at}: a mutáció nincs a regiszterben (${ref.mutation})`;
    }
    return null;
  }
  if (kind === 'document') {
    // A DOKUMENTUM-HIVATKOZÁS IS FELOLDÓDIK (R61/F01, az ő R02 esetük). A régi alak két szabad
    // szöveget kért és SEMMIT nem oldott fel. Mostantól a hivatkozás egy MÉRT artefaktumra mutat,
    // és a rekordba írt lenyomatnak a MAI tartalommal kell egyeznie — enélkül a jóváhagyás olyan
    // dokumentumra hivatkozhatna, ami nem létezik vagy azóta megváltozott.
    const miss = needs(catalog && catalog.documents instanceof Map, 'dokumentum-katalógus');
    if (miss) return miss;
    if (!isText(ref.document)) {
      return `${at}: a dokumentum-hivatkozásnak NEVEZETT artefaktumra kell mutatnia (document) `
        + `— választható: ${[...catalog.documents.keys()].join(' · ') || '(a katalógus üres)'}`;
    }
    if (!isText(ref.note)) return `${at}: a dokumentum-hivatkozás mellől hiányzik, MIT állít (note)`;
    const doc = catalog.documents.get(ref.document);
    if (!doc) {
      return `${at}: a hivatkozott dokumentum NEM LÉTEZIK a rögzített artefaktumok között `
        + `(${ref.document}) — választható: ${[...catalog.documents.keys()].join(' · ') || '(a katalógus üres)'}`;
    }
    if (!isText(ref.digest)) {
      return `${at}: a dokumentum-hivatkozásból hiányzik a LENYOMAT (digest) — a mai mért érték: ${doc.digest}`;
    }
    if (ref.digest !== doc.digest) {
      return `${at}: a hivatkozott dokumentum lenyomata ELCSÚSZOTT (a rekordban ${ref.digest}, `
        + `a mai mért érték ${doc.digest}) — a jóváhagyást újra kell nézni`;
    }
    return null;
  }
  return `${at}: ismeretlen hivatkozás-fajta (${kind === undefined ? 'HIÁNYZIK' : String(kind)}) `
    + '— választható: probe · mutation · document';
}

/**
 * A VÉGREHAJTOTT bizonyíték fajtái. Egy DOKUMENTUM megnevezi, hol áll az állítás — de nem bizonyítja,
 * hogy bármi LEFUTOTT. A külső fél kimondta: „a név létezése továbbra sem igazolja a teszt eredményét
 * vagy tartalmi relevanciáját". Ezért a dokumentum HÁTTÉR-hivatkozás: legalább egy futtatható
 * hivatkozásnak (próba vagy mutáció) is ott kell lennie.
 */
const EXECUTABLE_REF_KINDS = Object.freeze(new Set(['probe', 'mutation']));

/** Nem üres LISTA feloldható hivatkozásokból, legalább egy VÉGREHAJTOTT taggal. */
function evidenceListProblem(v, field, catalog) {
  if (!Array.isArray(v)) return `${field}: nem lista (${v === undefined ? 'HIÁNYZIK' : typeof v})`;
  if (v.length === 0) return `${field}: ÜRES lista — hivatkozás nélkül a jóváhagyás nem ellenőrizhető`;
  for (const [i, ref] of v.entries()) {
    const bad = evidenceRefProblem(ref, `${field}[${i}]`, catalog);
    if (bad) return bad;
  }
  if (!v.some((r) => r && EXECUTABLE_REF_KINDS.has(r.kind))) {
    return `${field}: csak DOKUMENTUM-hivatkozás áll benne — a dokumentum megnevezi, hol az állítás, `
      + 'de nem bizonyítja, hogy bármi lefutott; legalább egy próba- vagy mutáció-hivatkozás kell';
  }
  return null;
}

/**
 * A REKORD SZERZŐDÉSE — MEZŐNKÉNT, TÍPUSSAL (R59/F03).
 *
 * Az R57-es alak `!!mező`-t kérdezett: az ÜRES TÖMB, az ÜRES OBJEKTUM és a `'not-a-date'` mind
 * átment. A külső fél E09 esete pontosan ezekkel jött. A `truthy` nem típus — a hiány és a ROSSZ
 * ALAK két külön válasz (`incomplete` ⇄ `invalid`), mert két külön teendő tartozik hozzájuk.
 */
const CONTENT_REVIEW_FIELDS = Object.freeze([
  Object.freeze({ field: 'record_version', what: 'melyik rekord-szerződést beszéli',
    present: (r) => r.record_version !== undefined,
    problem: (r) => (r.record_version === CONTENT_REVIEW_RECORD_VERSION ? null
      : `record_version: ismeretlen rekord-szerződés (${String(r.record_version)}) — várt: ${CONTENT_REVIEW_RECORD_VERSION}`) }),
  Object.freeze({ field: 'reviewer', what: 'ki vizsgálta (azonosító + szerep + kitől független)',
    present: (r) => r.reviewer !== undefined,
    problem: (r) => {
      const v = r.reviewer;
      if (!v || typeof v !== 'object' || Array.isArray(v)) return 'reviewer: nem objektum';
      for (const k of ['id', 'role', 'independent_of']) {
        if (!isText(v[k])) return `reviewer.${k}: nem üres szöveget vár (${v[k] === undefined ? 'HIÁNYZIK' : (Array.isArray(v[k]) ? 'tömb' : typeof v[k])})`;
      }
      return null;
    } }),
  Object.freeze({ field: 'at', what: 'mikor',
    present: (r) => r.at !== undefined,
    problem: (r, ctx) => { const p = timestampProblem(r.at, ctx.nowMs); return p ? `at: ${p}` : null; } }),
  Object.freeze({ field: 'contract_digest', what: 'melyik szerződés-lenyomatra',
    present: (r) => r.contract_digest !== undefined,
    problem: (r) => (isText(r.contract_digest) ? null : 'contract_digest: nem üres szöveget vár') }),
  Object.freeze({ field: 'clause_digest', what: 'melyik klauzula-lenyomatra',
    present: (r) => r.clause_digest !== undefined,
    problem: (r) => (isText(r.clause_digest) ? null : 'clause_digest: nem üres szöveget vár') }),
  Object.freeze({ field: 'source_digest', what: 'melyik forrás-állapoton',
    present: (r) => r.source_digest !== undefined,
    problem: (r) => (isText(r.source_digest) ? null : 'source_digest: nem üres szöveget vár') }),
  Object.freeze({ field: 'manifest_digest', what: 'melyik teszt-/manifest-állapoton',
    present: (r) => r.manifest_digest !== undefined,
    problem: (r) => (isText(r.manifest_digest) ? null : 'manifest_digest: nem üres szöveget vár') }),
  Object.freeze({ field: 'situation', what: 'milyen élethelyzetre',
    present: (r) => r.situation !== undefined,
    problem: (r) => (isText(r.situation) ? null : 'situation: nem üres szöveget vár') }),
  Object.freeze({ field: 'property', what: 'mi a mérendő tulajdonság',
    present: (r) => r.property !== undefined,
    problem: (r) => (isText(r.property) ? null : 'property: nem üres szöveget vár') }),
  Object.freeze({ field: 'positive_evidence', what: 'pozitív bizonyíték (feloldható hivatkozás)',
    present: (r) => r.positive_evidence !== undefined,
    problem: (r, ctx) => evidenceListProblem(r.positive_evidence, 'positive_evidence', ctx.catalog) }),
  Object.freeze({ field: 'negative_evidence', what: 'negatív (ellenpélda) bizonyíték (feloldható hivatkozás)',
    present: (r) => r.negative_evidence !== undefined,
    problem: (r, ctx) => evidenceListProblem(r.negative_evidence, 'negative_evidence', ctx.catalog) }),
  Object.freeze({ field: 'residual', what: 'mi MARADT KI (maradék hatókör)',
    present: (r) => r.residual !== undefined,
    problem: (r) => (isText(r.residual) ? null : 'residual: nem üres szöveget vár — a „nincs maradék" is MONDAT') }),
]);

/**
 * A HITELESSÉG KÜLÖN TENGELY, ÉS MA NEMLEGES (R59/F03).
 *
 * A külső fél kimondta: a strukturális érvényesség · a forrás-egyezés · a HITELES ELFOGADÁS három
 * KÜLÖN kérdés, és a válaszuk nem folyhat össze egyetlen szóba. A `current` ma csak az első kettőt
 * jelenti. Hogy senki ne olvashassa bele a harmadikat, MINDEN válasz viszi ezt a tengelyt is —
 * a saját maradékunk kimondva, nem elhallgatva (KUKA-085: a megnevezett kockázat nem kezelt
 * kockázat, de a NEM nevezett még rosszabb).
 */
function acceptanceAxis(r) {
  const a = r && r.acceptance;
  if (!a || typeof a !== 'object') {
    return Object.freeze({
      state: 'unauthenticated',
      why: 'a rekord nem hordoz elfogadás-bizonyítékot — a `reviewer.id` ÁLLÍTÁS, nem hitelesítés; '
        + 'a regisztrálás jogának ellenőrzése NYITOTT tétel (R57/F03 zárómondata)',
    });
  }
  return Object.freeze({
    state: 'unverified_claim',
    why: `a rekord elfogadás-módot állít (${isText(a.method) ? a.method : 'megnevezetlen'}), de a `
      + 'magreferenciában NINCS olyan mechanizmus, ami ezt igazolná — az állítás nem bizonyíték (KUKA-038)',
    claimed_method: isText(a.method) ? a.method : null,
  });
}

/**
 * A FELOLDÓ-KATALÓGUS ALAKJA (R61/F01). Null = használható; szöveg = MIÉRT nem.
 *
 * MIÉRT KÜLÖN ÁLLAPOT. A hiányzó katalógus nem a REKORD hibája, hanem a HÍVÁSÉ: a rekord lehet
 * hibátlan, csak épp nem tudjuk ellenőrizni, amit állít. A kettőt nem szabad egy szóra tenni — a
 * `invalid` azt mondja, „javítsd a rekordot", az `unresolved` azt, „add meg a katalógust". Amit
 * SEMMIKÉPP nem jelenthet: `current` (R61/R01 — a hiányzó ellenőrzési kontextus felmentést adott).
 */
export function resolutionCatalogShape(catalog, kindsUsed) {
  if (!catalog || typeof catalog !== 'object') return 'nincs feloldó-katalógus';
  // A KÖVETELMÉNY A TÉNYLEGESEN HASZNÁLT HIVATKOZÁS-FAJTÁKRA SZÓL, nem mindenre.
  //
  // MIÉRT ÍGY. Az első alakom MINDHÁROM részt megkövetelte, és ezzel a külső fél SAJÁT pozitív
  // ellenpárját (P03) vitte pirosra: az ő rekordjuk csak próba- és mutáció-hivatkozást használ,
  // dokumentumot nem, tehát a dokumentum-katalógus hiánya ott semmit nem jelent. Egy őr, ami a
  // KÉRT eredményt jelenti kudarcnak, ugyanolyan haszontalan, mint amelyik mindent átenged
  // (KUKA-049) — a szigorítás hatóköre pontosan akkora legyen, amekkorára az indok igaz (KUKA-048).
  const need = (kindsUsed instanceof Set) ? kindsUsed : new Set(['probe', 'mutation', 'document']);
  if (need.has('probe') && !(catalog.assertions instanceof Set)) {
    return 'a katalógusból hiányzik a próba↔állítás készlet';
  }
  if (need.has('mutation') && !(catalog.mutations instanceof Set)) {
    return 'a katalógusból hiányzik a mutáció-regiszter';
  }
  if (need.has('document') && !(catalog.documents instanceof Map)) {
    return 'a katalógusból hiányzik a dokumentum-katalógus';
  }
  return null;
}

/** MELY hivatkozás-fajtákat használja a rekord — a feloldás követelménye ehhez szabódik. */
function evidenceKindsUsed(r) {
  const out = new Set();
  for (const field of ['positive_evidence', 'negative_evidence']) {
    const v = r && r[field];
    if (!Array.isArray(v)) continue;
    for (const ref of v) if (ref && typeof ref === 'object' && typeof ref.kind === 'string') out.add(ref.kind);
  }
  return out;
}

export function contentReviewState(clause, bindings, catalog) {
  const r = clause && clause.content_review;
  const ctx = { nowMs: Date.now(), catalog: catalog || null };
  const authenticity = acceptanceAxis(r);
  const wrap = (o) => Object.freeze({ ...o, authenticity });

  if (!r || typeof r !== 'object' || Array.isArray(r)) {
    return wrap({ state: 'none', structural: 'none', binding: 'none', why: 'nincs rögzített tartalmi felülvizsgálat' });
  }

  // (0) A FELOLDÁS LEHETŐSÉGE (R61/F01, az ő R01 esetük). Katalógus nélkül a bizonyíték-hivatkozások
  // nem ellenőrizhetők — ilyenkor a válasz NEVEZETT tehetetlenség, nem jóváhagyás. A rekord
  // szerkezetéről ez semmit nem mond, ezért a `structural` „nem mért", nem „érvénytelen".
  const catBad = resolutionCatalogShape(catalog, evidenceKindsUsed(r));
  if (catBad) {
    return wrap({
      state: 'unresolved', structural: 'not_checked', binding: 'not_checked',
      why: `a jóváhagyás bizonyíték-hivatkozásai NEM OLDHATÓK FEL — ${catBad}; a fel nem oldott `
        + 'hivatkozás nem kaphatja ugyanazt a minősítést, mint az ellenőrzött',
      by: (r.reviewer && isText(r.reviewer.id)) ? r.reviewer.id : null,
    });
  }

  // (1) TELJESSÉG. A hiányt NEVESÍTVE mondjuk ki — a néma hiány ugyanaz a hazugság, mint a néma
  // üres lista (KUKA-012), és a felsorolás megmondja, mit kell pótolni (KUKA-064).
  const missing = CONTENT_REVIEW_FIELDS.filter((f) => !f.present(r)).map((f) => ({ field: f.field, what: f.what }));
  if (missing.length) {
    return wrap({
      state: 'incomplete', structural: 'incomplete', binding: 'not_checked',
      why: `a jóváhagyás hiányos — ${missing.map((m) => `${m.field} (${m.what})`).join(' · ')}`,
      missing: Object.freeze(missing.map((m) => Object.freeze(m))),
      by: (r.reviewer && isText(r.reviewer.id)) ? r.reviewer.id : null,
    });
  }

  // (2) ALAK. A mező OTT VAN, de nem az, aminek lennie kellene — ez MÁS baj, mint a hiány, és más a
  // teendő is: a hiányt pótolni kell, a rossz alakot JAVÍTANI (R59/F03, az ő E09 esetük).
  const invalid = CONTENT_REVIEW_FIELDS.map((f) => f.problem(r, ctx)).filter(Boolean);
  if (invalid.length) {
    return wrap({
      state: 'invalid', structural: 'invalid', binding: 'not_checked',
      why: `a jóváhagyás rekordja ROSSZ ALAKÚ — ${invalid.join(' · ')}`,
      invalid: Object.freeze(invalid),
      by: (r.reviewer && isText(r.reviewer.id)) ? r.reviewer.id : null,
    });
  }

  // (3) KÖTÉSEK. Mind a négy tengelyen egyeznie kell; az eltérést NEVEZZÜK MEG, hogy tudni lehessen,
  // mit kell újra megnézni — nem az egészet, csak az érintett bizonyítékot.
  const want = {
    contract_digest: contractDigest(),
    clause_digest: clauseDigest(clause),
    source_digest: bindings && bindings.source_digest,
    manifest_digest: bindings && bindings.manifest_digest,
  };
  if (!isText(want.source_digest) || !isText(want.manifest_digest)) {
    return wrap({
      state: 'stale', structural: 'valid', binding: 'unverifiable',
      why: 'a futás nem adta át a forrás/manifest kötést, ezért a jóváhagyás NEM igazolható '
        + '(a nem igazolható jóváhagyás nem `current`)',
      by: r.reviewer.id,
    });
  }
  const drifted = Object.entries(want)
    .filter(([k, v]) => r[k] !== v)
    .map(([k]) => k);
  if (drifted.length) {
    return wrap({
      state: 'stale', structural: 'valid', binding: 'drifted',
      why: `a jóváhagyás óta elcsúszott: ${drifted.join(' · ')} — az érintett bizonyítékot újra kell nézni`,
      drifted: Object.freeze(drifted),
      by: r.reviewer.id,
    });
  }

  return wrap({
    state: 'current',
    // A HÁROM TENGELY KÜLÖN SZÓVAL. A `current` a STRUKTÚRÁRA és a KÖTÉSRE mond igent — a
    // hitelességre SOHA (azt az `authenticity` mondja meg, és ma az nemleges).
    structural: 'valid',
    binding: 'matches',
    record_version: r.record_version,
    by: r.reviewer.id,
    role: r.reviewer.role,
    independent_of: r.reviewer.independent_of,
    at: r.at,
    situation: r.situation,
    property: r.property,
    residual: r.residual,
  });
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

/** SAJÁT kulcson áll-e — az ÖRÖKÖLT (prototípus-láncbeli) név nem válasz a kérdésre. */
function own(obj, key) {
  return !!obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key);
}

/** Sima, NEM ÜRES leképezés: objektum, nem tömb, és van legalább egy SAJÁT kulcsa. */
function plainMap(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0;
}

/**
 * EGY KÖTELEZŐ SZÖVEG-MEZŐ ÁLLAPOTA — MEGKÜLÖNBÖZTETHETŐ szóval (R59/F01).
 *
 * A külső fél kimondta: „a hiányzó, null, üres és ellentmondó alakok kapjanak megkülönböztethető
 * hibát". Egy közös „hiányzik" mondat épp azt mossa össze, amiből a hívó tanulna: a HIÁNY a csomag
 * hiányossága, a NULL már állítás, az ELLENTMONDÁS pedig hazugság (KUKA-020 a csomag-szinten).
 */
function requiredText(obj, key) {
  if (!own(obj, key)) return { ok: false, why: 'HIÁNYZIK a csomagból' };
  const v = obj[key];
  if (v === null) return { ok: false, why: 'NULL' };
  if (v === undefined) return { ok: false, why: 'undefined' };
  if (typeof v !== 'string') return { ok: false, why: `nem szöveg (${Array.isArray(v) ? 'tömb' : typeof v})` };
  if (!v.trim()) return { ok: false, why: 'ÜRES szöveg' };
  return { ok: true, value: v };
}

/**
 * AZ ELVÁRÁS TELJES SÉMÁJA — a szülő futási környezetéből (R59/F01, az ő E05/E07 esetük).
 *
 * MIÉRT SZÜLETETT. Az R57-es alak a HIÁNYZÓ `expectation`-t elutasította, de az ÜRES `{}` már
 * objektum: onnantól az egyes összehasonlítások FELTÉTELESEK voltak (`if (expectation.base_digest
 * && …)`), tehát a hiányzó elvárt MEZŐ nem elutasítást, hanem FELMENTÉST adott az összehasonlítás
 * alól. A külső fél mind a négy változatot megmérte (base_digest · run_tokens · mutated_digests ·
 * mind a három törölve), és mindegyiknél `covered` lett a klauzula.
 *
 * Innentől a séma EGÉSZE előfeltétel, és a hiány UGYANAZ, mint a hamis érték (KUKA-084 alakja: a
 * védelem nem lehet feltételes ahhoz képest, amit védeni kell).
 *
 * @returns {string|null} null = a séma rendben; szöveg = a NEVEZETT hiány.
 */
export function expectationShape(expectation) {
  if (!expectation || typeof expectation !== 'object' || Array.isArray(expectation)) {
    return 'nincs ELVÁRT érték a szülő futási környezetéből — a csomag nem igazolhatja saját magát';
  }
  const base = requiredText(expectation, 'base_digest');
  if (!base.ok) return `az elvárásból hiányzik a mért ALAP-lenyomat (base_digest: ${base.why})`;
  if (!base.value.startsWith('sha256:')) {
    return `az elvárt alap-lenyomat nem MÉRT lenyomat alakú (sha256:…): ${base.value}`;
  }
  if (!plainMap(expectation.run_tokens)) {
    return 'az elvárásból hiányzik a mutációnkénti FUTÁS-JEL táblázat (run_tokens) — enélkül nem '
      + 'eldönthető, MELYIK futás eredménye érkezett';
  }
  if (!plainMap(expectation.mutated_digests)) {
    return 'az elvárásból hiányzik a mutációnkénti MUTÁLT lenyomat táblázat (mutated_digests) — '
      + 'enélkül nem eldönthető, hogy a szerkesztés tényleg megtörtént-e';
  }
  return null;
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
export function falsificationQualifies(result, { probe, assertion, expectation, mutations, allowedAssertions }) {
  if (!result || typeof result !== 'object') return 'nincs eredmény';

  // (0) AZ ELVÁRÁS TELJES SÉMÁJA — NEM ELÉG, HOGY LÉTEZIK (R59/F01, az ő E05 esetük).
  //
  // Az R57-es alak a HIÁNYZÓ `expectation`-t elutasította, de az ÜRES `{}` már objektum, és az
  // egyes összehasonlítások FELTÉTELESEK voltak (`if (expectation.base_digest && …)`). Ha tehát az
  // elvárt MEZŐ hiányzott, az összehasonlítás egyszerűen elmaradt — a hiányzó elvárás FELMENTÉST
  // adott, nem elutasítást. A külső fél mind a négy változatot megmérte: mind `covered` lett.
  // Innentől a séma EGÉSZE kötelező, és a hiány ugyanaz, mint a hamis érték (KUKA-084 alakja: a
  // védelem nem lehet feltételes ahhoz képest, amit védeni kell).
  const shape = expectationShape(expectation);
  if (shape) return shape;

  // A MEGENGEDETT ÁLLÍTÁS-KÉSZLET IS KÖTELEZŐ A HATÁRON (R59/F01). Korábban `if (allowedAssertions)`
  // volt: aki nem adta át, annak a manifest-ellenőrzés kimaradt — megint a hiány mint felmentés.
  if (!(allowedAssertions instanceof Set)) {
    return 'nincs MEGENGEDETT állítás-készlet a manifestből — a bizonyíték nem köthető deklarált állításhoz';
  }

  if (result.applied !== true) return 'a mutáció alkalmazása nincs igazolva';
  // AZ EREDMÉNY-SÉMA IS TELJES (R59/F01). Ugyanaz a szabály, mint az elvárásnál: a hiányzó mező nem
  // mentesít az összehasonlítás alól — és a hiány FAJTÁJÁT is kimondjuk (hiány ≠ null ≠ üres).
  const gotBase = requiredText(result, 'base_digest');
  if (!gotBase.ok) return `a csomagból hiányzik az ALAP-lenyomat (base_digest: ${gotBase.why})`;
  const gotMutated = requiredText(result, 'mutated_digest');
  if (!gotMutated.ok) return `a csomagból hiányzik a MUTÁLT lenyomat (mutated_digest: ${gotMutated.why})`;
  if (gotBase.value === gotMutated.value) return 'a mutált forrás lenyomata AZONOS az alapéval — a szerkesztés nem történt meg';
  const gotToken = requiredText(result, 'run_token');
  if (!gotToken.ok) return `hiányzik a futás-jel (run_token: ${gotToken.why}) — nem eldönthető, MELYIK futás eredménye`;
  if (result.probe_id !== probe) return `más próbáról szól (${result.probe_id} ≠ ${probe})`;

  // (1) A MUTÁCIÓ LÉTEZZEN A REGISZTERBEN, és a regiszter szerint EZ a próba kapja el. A csomag
  // `probe_id` mezője önmagában csak állítás — az elkapót a mutáció DEFINÍCIÓJA mondja meg.
  const known = Array.isArray(mutations) ? mutations.find((m) => m && m.id === result.mutation_id) : null;
  if (!known) return `a mutáció nincs a regiszterben: ${result.mutation_id}`;
  if (known.catcher !== probe) return `a regiszter szerint a(z) ${result.mutation_id} elkapója ${known.catcher}, nem ${probe}`;

  // (2) AZ ELVÁRT ÉRTÉKEK TÉNYLEGES ÖSSZEHASONLÍTÁSA. Nem a mezők MEGLÉTE számít (azt az R56 már
  // mérte, és a külső fél épp ezt kerülte meg kitöltött, idegen csomaggal), hanem az EGYEZÉS.
  if (gotBase.value !== expectation.base_digest) {
    return `az alap-lenyomat IDEGEN (${gotBase.value} ≠ a mért alapé)`;
  }
  // A FUTÁS-JEL MUTÁCIÓNKÉNT SZÜLETIK, tehát mutációnként is hasonlítjuk: egy MÁSIK mutáció
  // (vagy egy korábbi menet) jele sem megy át. A keresés SAJÁT kulcson megy: egy ÖRÖKÖLT név
  // (`constructor`, `toString`) nem elvárás, hanem a prototípus-lánc zaja (R59/F01).
  const wantToken = own(expectation.run_tokens, result.mutation_id)
    ? expectation.run_tokens[result.mutation_id] : null;
  if (!wantToken || typeof wantToken !== 'string') {
    return `a(z) ${result.mutation_id} mutációhoz nem tartozik MÉRT futás-jel ebben a menetben`;
  }
  if (gotToken.value !== wantToken) {
    return `a futás-jel MÁS futásból való (${gotToken.value} ≠ a(z) ${result.mutation_id} mostani futásáé)`;
  }
  const wantMutated = own(expectation.mutated_digests, result.mutation_id)
    ? expectation.mutated_digests[result.mutation_id] : null;
  if (!wantMutated || typeof wantMutated !== 'string') {
    return `a(z) ${result.mutation_id} mutációra nem született MÉRT lenyomat ebben a futásban`;
  }
  if (gotMutated.value !== wantMutated) {
    return `a mutált forrás lenyomata nem a(z) ${result.mutation_id} mérteké`;
  }

  // (3) A MANIFEST ENGEDJE MEG ezt a próba↔állítás párt. Ha a próba nem deklarálja az állítást,
  // akkor a bizonyíték olyasmiről szól, amit senki nem ígért (KUKA-016 a bizonyíték-kötésen).
  // A készlet MEGLÉTÉT a függvény ELEJE követeli meg — itt már csak a TARTALMA számít (R59/F01).
  if (!allowedAssertions.has(`${probe}\u0000${assertion}`)) {
    return `a manifest szerint a(z) ${probe} próba nem deklarálja ezt az állítást: ${assertion}`;
  }

  // (4) ÖSSZHANG: az ítélet, a próba-állapot és a bukott állítás-lista egy történetet mondjon.
  // Egy „SURVIVED" ítélet vagy egy „PASS" próba-állapot mellé kiadott bukott állítás ELLENTMONDÁS —
  // a csomag ilyenkor nem hiányos, hanem HAZUDIK, és ezt külön kell mondani (KUKA-020).
  //
  // ÉS A KETTŐ KÖTELEZŐ, NEM CSAK „HA VAN" (R59/F01, az ő E06 esetük). A régi alak `if (result.verdict
  // && …)` volt: aki KIHAGYTA az ítéletet vagy a próba-állapotot, annak az ellentmondás-vizsgálat
  // egyszerűen elmaradt — a hiány megint FELMENTÉS lett. A csomag akkor bizonyíték, ha KIMONDJA,
  // hogy elkapta; a hallgatás nem igenlés.
  const verdict = requiredText(result, 'verdict');
  if (!verdict.ok) {
    return `az ítélet (verdict) ${verdict.why} — bizonyítékként csak a KIMONDOTT CAUGHT fogadható el`;
  }
  if (verdict.value !== 'CAUGHT') {
    return `ellentmondó csomag: az ítélet ${verdict.value}, mégis bizonyítékként érkezett`;
  }
  const status = requiredText(result, 'probe_status');
  if (!status.ok) {
    return `a próba állapota (probe_status) ${status.why} — a mutációnak bizonyítottan MEG KELLETT buktatnia`;
  }
  if (status.value !== 'FAIL') {
    return `ellentmondó csomag: a próba állapota ${status.value}, de a mutációnak meg kellett buktatnia`;
  }

  // A BUKOTT ÁLLÍTÁSOK LISTÁJA IS KÖTELEZŐ ÉS TÍPUSOS. A nem-tömb alak korábban némán ÜRES listává
  // vált, és ugyanazt a mondatot kapta, mint a valódi „nem buktatta meg" — két különböző baj egy
  // válaszon (KUKA-002 a hibaüzeneten).
  if (!own(result, 'failed_assertions')) return 'a csomagból HIÁNYZIK a bukott állítások listája (failed_assertions)';
  if (!Array.isArray(result.failed_assertions)) {
    return `a bukott állítások listája nem tömb (${result.failed_assertions === null ? 'NULL' : typeof result.failed_assertions})`;
  }
  if (!result.failed_assertions.includes(assertion)) {
    return `a futás NEM buktatta meg a deklarált állítást (${assertion})`;
  }
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
  // AZ ELVÁRT ÉRTÉKEK A SZÜLŐ FUTÁSI KÖRNYEZETÉBŐL (R57/F02). A csomag nem adhatja meg a saját
  // elvárásait; ha ez hiányzik, a minősítés fail-closed (lásd `falsificationQualifies`).
  const expectation = evidence.expectation && typeof evidence.expectation === 'object'
    ? evidence.expectation : null;
  // A TARTALMI JÓVÁHAGYÁS KÖTÉSEI (R57/F03): melyik FORRÁS- és MANIFEST-állapoton született. Ezeket
  // a futás adja; enélkül a jóváhagyás nem igazolható, tehát nem lehet `current`.
  const reviewBindings = evidence.review_bindings && typeof evidence.review_bindings === 'object'
    ? evidence.review_bindings : null;
  // A MANIFEST szerint MEGENGEDETT próba↔állítás párok — a bizonyíték csak ilyenre hivatkozhat.
  const allowedAssertions = new Set();
  for (const pr of probes || []) {
    for (const d of pr.discharges || []) allowedAssertions.add(`${pr.id}\u0000${d.assertion}`);
  }
  // A JÓVÁHAGYÁS BIZONYÍTÉK-HIVATKOZÁSAINAK FELOLDÓ-KATALÓGUSA (R59/F03). Amire a review hivatkozik,
  // annak LÉTEZNIE kell — kitalált próba- vagy mutáció-névre hivatkozó jóváhagyás nem jóváhagyás
  // (KUKA-066: a kitalált forrás nem hibának látszik, hanem adatnak).
  const reviewCatalog = Object.freeze({
    assertions: allowedAssertions,
    mutations: new Set(mutations.map((m) => m && m.id).filter(Boolean)),
    // A DOKUMENTUM-ÁG IS FELOLDÓDIK (R61/F01): a rögzített artefaktumok MÉRT lenyomatából, hálózat
    // nélkül. A katalógus a fájl-rendszerből épül, nem kézi listából (KUKA-051).
    documents: sourceDocumentCatalog(),
  });
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
        evidence_limit: null, content_review: contentReviewState(clause, null, reviewCatalog),
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
          const qual = (x) => falsificationQualifies(x, { probe: d.probe, assertion: d.assertion, expectation, mutations, allowedAssertions });
          const good = tried.find((x) => qual(x) === null);
          if (!good) {
            result = 'not_falsified';
            const reasons = tried.length
              ? tried.map((x) => `${x.mutation_id}: ${qual(x)}`).join(' · ')
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
        content_review: contentReviewState(clause, reviewBindings, reviewCatalog),
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

  // ── A KÖTELEZŐ BIZONYÍTÉK-KÉSZLET KIÉRTÉKELÉSE (R57/F01) ────────────────────────────────────
  // A mérce FÁZIS-FÜGGŐ, és ezt ki is mondjuk. A referencia-futás a battéria ELŐTT fut, tehát ott
  // a `falsification_pending` a helyes végállapot (R55/F03/1 — ezt a külső fél maga mondta ki);
  // a battéria UTÁN viszont `covered` kell, különben a bizonyíték nem áll meg.
  const stage = mutationResults === null ? 'pending' : 'measured';
  const resultOf = new Map();
  for (const c of chain) {
    const prev = resultOf.get(c.clause_id);
    // Egy klauzulának több sora is lehet; a leggyengébb dönt (ha bármelyik szem szakad, nincs kész).
    const rank = { covered: 3, falsification_pending: 2 };
    if (!prev || (rank[c.result] || 0) < (rank[prev] || 0)) resultOf.set(c.clause_id, c.result);
  }
  const acceptable = stage === 'measured' ? new Set(['covered']) : new Set(['covered', 'falsification_pending']);
  const requiredSatisfied = [];
  const requiredMissing = [];
  for (const id of REQUIRED_EVIDENCE.clauses) {
    const r = resultOf.get(id) || 'nincs ilyen klauzula-sor a láncban';
    if (acceptable.has(r)) requiredSatisfied.push(id);
    else requiredMissing.push({ clause_id: id, result: r });
  }
  if (requiredMissing.length) {
    // NEM integritási hiba: a regiszter nem hazudik magáról, a BIZONYÍTÉK hiányzik (KUKA-020).
    evid.push(`KÖTELEZŐ BIZONYÍTÉK (${REQUIRED_EVIDENCE.version}): ${requiredMissing.length} klauzula nem áll meg — `
      + requiredMissing.map((m) => `${m.clause_id}: ${m.result}`).join(' · '));
  }
  const required = Object.freeze({
    version: REQUIRED_EVIDENCE.version,
    stage,
    expected_state: stage === 'measured' ? 'covered' : 'covered VAGY falsification_pending',
    clauses: REQUIRED_EVIDENCE.clauses,
    satisfied: Object.freeze(requiredSatisfied),
    missing: Object.freeze(requiredMissing.map((m) => Object.freeze(m))),
    ok: requiredMissing.length === 0,
  });

  const problems = [...integrity, ...evid];
  return Object.freeze({
    ok: problems.length === 0,
    integrity_ok: integrity.length === 0,
    legacy_call: false,
    // A FÁZIS KIMONDVA: a referencia-futás nem állíthatja, hogy a falszifikáció is kész.
    falsification_stage: stage,
    // A KÖTELEZŐ KÉSZLET ÁLLAPOTA — ezt nézi a battéria végső kapuja (R57/F01).
    required,
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
