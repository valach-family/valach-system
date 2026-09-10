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
// nincs `state` mező, amit be lehetne írni (KUKA-041). Egy klauzula CSAK akkor fedett, ha
//   (1) legalább egy manifest-próba deklarálja,        — a kötés kétirányú (KUKA-039)
//   (2) MINDEN deklaráló próba rekordja PASS EBBEN a futásban,
//   (3) a deklarált állítást a próba TÉNYLEG kiadta, és igaznak mérte, — a pin HÍV (KUKA-009)
//   (4) és van olyan mutáció, ami épp azt a próbát nevezi elkapónak. — a próba is falszifikálható
//
// KIMONDOTT MARADÉK-KOCKÁZAT (nem hallgatjuk el). Ez a gépezet az ÁTKÖTÉST teszi lehetetlenné, a
// TARTALMI MEGFELELÉST nem tudja igazolni: aki a manifestben egy idegen próbához ÍRJA a klauzulát,
// annak a próbába BELE IS KELL ÍRNIA egy azonos azonosítójú állítást — a gép azt már nem tudja
// eldönteni, hogy az az állítás valóban a klauzuláról szól-e. A maradék tehát nem nulla, csak
// sokkal szűkebb: emberi felülvizsgálat tárgya marad (lásd `OB-7`).
//
// PURE + INERT: nincs DB, nincs hálózat, nincs titok. Adat és tiszta feloldók.

import { createHash } from 'node:crypto';

export const NORMS_INDEX_ID = 'NRM-01';
export const NORMS_INDEX_SCHEMA = 'nrm-2';
export const NORM_CONTRACT_VERSION = 'R32/K01-K16';

// ═══ A KANONIKUS SZERZŐDÉS AZONOSÍTÓI ══════════════════════════════════════════════════════════
//
// A SZÖVEG az R32-ben él, a külső félnél — ide a stabil azonosító és a cím kerül, hogy a
// hivatkozás gépileg ellenőrizhető legyen, és hogy a két oldal ne tudjon némán elcsúszni. Kézi
// KÉTIRÁNYÚ másolás nincs: a K-szabály MONDATÁT ez a fájl nem ismétli meg (R53 §5).
export const K_CONTRACT = Object.freeze([
  Object.freeze({ id: 'K01', title: 'Alany, azonosító és kötés' }),
  Object.freeze({ id: 'K02', title: 'Saját indulás és a gazda nélküli állapot' }),
  Object.freeze({ id: 'K03', title: 'Fiók, belépés, meghívás és tagság' }),
  Object.freeze({ id: 'K04', title: 'Engedély, képviselet és frissesség' }),
  Object.freeze({ id: 'K05', title: 'Adatkiadás, összesítés és megfigyelhetőség' }),
  Object.freeze({ id: 'K06', title: 'Esemény, állítás, egyeztetés és elfogadott hatás' }),
  Object.freeze({ id: 'K07', title: 'Parancs, egyszeri hatás és újrapróbálás' }),
  Object.freeze({ id: 'K08', title: 'Üzleti idő, tudásállapot, történet és korrekció' }),
  Object.freeze({ id: 'K09', title: 'Megvonás, másolat, helyreállítás és életciklus' }),
  Object.freeze({ id: 'K10', title: 'Típus, normalizálás és számítási profil' }),
  Object.freeze({ id: 'K11', title: 'Művelettípus-katalógus és teljes moduléletciklus' }),
  Object.freeze({ id: 'K12', title: 'Kiesés, bizonyítékfrissesség és mentésből helyreállítás' }),
  Object.freeze({ id: 'K13', title: 'Import, nyitás és idegen rendszer múltja' }),
  Object.freeze({ id: 'K14', title: 'Felelősség, megállapodás és őrzési feladat' }),
  Object.freeze({ id: 'K15', title: 'Visszaélési és erőforrás-korlátok' }),
  Object.freeze({ id: 'K16', title: 'Hiányosan azonosított fél és fizikai valóság' }),
]);
const K_IDS = new Set(K_CONTRACT.map((k) => k.id));

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
    rule: 'A megvonás vagy utólagos kifogás FORRÁSA is ellenőrzött hatáskört igényel. A bejelentő '
      + 'önmagában nem tud múltat érvényteleníteni, és nem kap hozzáférést a vitatott adatokhoz.',
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
    rule: 'CÉLZOTT TILTÁS (lopott hitelesítő, incidens): az ÚJ használat azonnal tiltott, az '
      + 'érintett időszak és a függőségek felderítendők — de a tiltás nem sújthat FÜGGETLEN '
      + 'könyveket és nem bizonyítja a korábbi műveletek hamisságát.',
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
        text: 'A célzott tiltás FÜGGETLEN könyveket nem sújt, és a korábbi műveletek '
          + 'érvénytelenségét nem bizonyítja.',
        gap: 'A REV-N5a tiltás-fogalma nélkül nincs mit hatókörre szűkíteni. Az ellenpár-mérés '
          + '(a független könyv sértetlen marad) csak akkor futtatható, ha a tiltás létezik — '
          + 'enélkül a klauzula méretlen, tehát KUKA-051 szerint zöldnek LÁTSZANA.',
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
    why: 'A bizonyíték-index az ÁTKÖTÉST teszi lehetetlenné (F03), a TARTALMI megfelelést nem '
      + 'tudja igazolni: aki egy idegen próbába beleírja a klauzula állítás-azonosítóját, azt a '
      + 'gép nem tudja leleplezni. Ezt a maradékot nem hallgatjuk el (KUKA-085: a megnevezett '
      + 'kockázat nem kezelt kockázat — de a NEM nevezett még rosszabb).',
    closes_when: 'Külső, független felülvizsgálat mondja ki klauzulánként, hogy a deklarált állítás '
      + 'valóban azt méri; VAGY a klauzula szövegéből származtatott, gépileg ellenőrizhető alak.',
  }),
]);

// ═══ AZ ÖNELLENŐRZÉS — KAPU, NEM FELIRAT ═══════════════════════════════════════════════════════

export const NORM_FLOORS = Object.freeze({
  revocation: 5, orgBasis: 3, blockers: 7, clauses: 16, kClauses: 16,
});

/** A KANONIKUS TARTALMI LENYOMAT (R53 §4/5 · §5). Csak a NORMA tartalmából — a bizonyíték nem. */
export function normsDigest() {
  const bytes = JSON.stringify(ALL_NORMS.map((n) => ({
    id: n.id,
    rule: n.rule,
    clauses: n.clauses.map((c) => ({ id: c.id, covers: [...c.covers], text: c.text })),
  })));
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
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
        assertion_id: null, probe_id: null, mutation_ids: [], result: 'no_evidence',
        why: clause.gap || null,
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
        }
      }

      if (result !== 'covered') allOk = false;
      chain.push(Object.freeze({
        norm_id: norm.id, clause_id: clauseId, covers: [...clause.covers],
        assertion_id: d.assertion, probe_id: d.probe, mutation_ids: muts, result, why,
      }));
    }
    if (allOk) coveredClauses.add(clauseId);
  }

  // (4) A PRÓBA IS BESZÉLJEN: kiadott állítás-azonosító, amit egyetlen manifest-bejegyzés sem
  // deklarál — a másik irány (KUKA-039). Ilyenkor valaki írt egy állítást, és elfelejtette bekötni.
  for (const rec of records) {
    const p = probes.find((x) => x.id === rec.probe_id);
    const declared = new Set((p ? p.discharges || [] : []).map((d) => d.assertion));
    for (const a of Array.isArray(rec.assertions) ? rec.assertions : []) {
      if (!declared.has(a.id)) {
        integrity.push(`PRÓBA/${rec.probe_id}: kiadott egy állítás-azonosítót, amit a manifest nem `
          + `deklarál: ${a.id} — a bizonyíték-kötés fél maradt (KUKA-039)`);
      }
    }
  }

  // (5) PADLÓK — a néma zsugorodás is piros (KUKA-045).
  if (REVOCATION_NORMS.length < NORM_FLOORS.revocation) integrity.push(`a megvonás-normák száma a padló alá esett (${REVOCATION_NORMS.length} < ${NORM_FLOORS.revocation})`);
  if (ORG_BASIS_NORMS.length < NORM_FLOORS.orgBasis) integrity.push(`a szervezeti-alap normák száma a padló alá esett (${ORG_BASIS_NORMS.length} < ${NORM_FLOORS.orgBasis})`);
  if (OPEN_BLOCKERS.length < NORM_FLOORS.blockers) integrity.push(`a nyitott blokkolók száma a padló alá esett (${OPEN_BLOCKERS.length} < ${NORM_FLOORS.blockers})`);
  if (clauseIds.size < NORM_FLOORS.clauses) integrity.push(`az atomi klauzulák száma a padló alá esett (${clauseIds.size} < ${NORM_FLOORS.clauses})`);
  if (K_CONTRACT.length < NORM_FLOORS.kClauses) integrity.push(`a kanonikus szerződés szabályainak száma a padló alá esett (${K_CONTRACT.length} < ${NORM_FLOORS.kClauses})`);

  for (const b of OPEN_BLOCKERS) {
    const at = `BLOKKOLÓ/${b.id || '(nincs azonosító)'}`;
    if (!b.title) integrity.push(`${at}: hiányzó cím`);
    if (!b.why || b.why.length < 40) integrity.push(`${at}: az INDOK hiányzik vagy túl rövid`);
    if (!b.closes_when || b.closes_when.length < 20) integrity.push(`${at}: nincs LEZÁRÁSI FELTÉTEL`);
  }

  // (6) AZ ÁLLAPOT SZÁMOLÓDIK, NEM DEKLARÁLÓDIK (R53 §4/3).
  const norms = ALL_NORMS.map((n) => {
    const ids = (n.clauses || []).map((c) => c.id);
    const cov = ids.filter((id) => coveredClauses.has(id));
    return Object.freeze({
      id: n.id,
      clauses_total: ids.length,
      clauses_covered: cov.length,
      covered_clause_ids: Object.freeze(cov),
      state: cov.length === 0 ? 'planned' : (cov.length === ids.length ? 'implemented' : 'partial'),
    });
  });

  const problems = [...integrity, ...evid];
  return Object.freeze({
    ok: problems.length === 0,
    integrity_ok: integrity.length === 0,
    legacy_call: false,
    problems,
    integrity_problems: integrity,
    evidence_problems: evid,
    chain: Object.freeze(chain),
    norms: Object.freeze(norms),
    digest: normsDigest(),
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
