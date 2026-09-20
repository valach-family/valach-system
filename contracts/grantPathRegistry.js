// V3 MAGREFERENCIA — GPR-01: A JOGADÁSI UTAK NYILVÁNTARTÁSA (R57 §2).
//
// MIÉRT KÓDBAN, ÉS NEM EGY TÁBLÁZATBAN EGY LAPON. A külső ellenőrző fél az R57-ben azt kérte,
// hogy a JELENLEGI magforrás tényleges jogadási útjairól legyen EGYETLEN, forráshelyekkel és
// MEGLÉVŐ próbákkal kötött tábla. Egy kézzel írt lap a következő körben némán elcsúszik attól,
// amit a kód csinál (KUKA-082: amit kézzel írunk egy gépi állományból, azt a gépnek kell
// visszamérnie) — ezért a tábla ITT él, és a `tools/vs_verify_grant_paths.mjs` MINDKÉT IRÁNYBAN
// méri:
//
//   · minden itt deklarált belépési pont TÉNYLEG létezik a megnevezett fájlban;
//   · minden itt deklarált próba-azonosító SZEREPEL a `v3ref/run.mjs` deklarációi között
//     (HELYESBÍTVE, R61: az ellenőrző a DEKLARÁCIÓT keresi a forrásszövegben — a próbákat NEM
//     futtatja le; a futásukat a `npm run verify:v3ref` méri, ez az őr nem);
//   · és — ez a fontosabb — MINDEN olyan modul, ami jogadó táblába ír, SZEREPEL itt, akkor is, ha
//     holnap születik (KUKA-051: a hatókör SZABÁLY, nem lista; KUKA-069: a fél lánc néma).
//
// A BESOROLÁS A TÉNYLEGES HASZNÁLAT SZERINT MEGY, nem a függvény neve szerint — az R57 kifejezett
// kikötése: *„Egy teszt-előkészítő nem válik ettől automatikusan termékbeli jogadási felületté."*
//
// EZ A LAP NEM ÜZLETI DÖNTÉS. Az alap nélküli jogadás kérdésében az R53 óta KIMONDOTTAN nincs
// döntés; a `missing` mezők LEÍRJÁK a mai állapotot, nem változtatják meg (R57 §4).
//
// PURE + INERT: nincs DB, nincs hálózat, nincs titok.

/**
 * A BESOROLÁS ZÁRT SZÓTÁRA — ismeretlen szó nem csúszhat át „valaminek" (KUKA-101).
 *
 * R59/F59-02 SZERINT ÁTNEVEZVE. Az R57-es alak `product_grant_surface`-nek hívta a négy utat, és a
 * „termékbeli" szó MŰKÖDŐ ÉLES vagy FELHASZNÁLÓI felületet sugallt — ilyen a V3-ban ma NINCS. A
 * külső fél ezt kimondta: *„A »termékbeli« szó ne sugalljon működő éles vagy felhasználói
 * felületet."* A mai valóság: ez egy egyírós, szintetikus, megbízható belső kontextusú referencia,
 * tehát a helyes szó BELSŐ REFERENCIA-BELÉPÉSI PONT (KUKA-061: új szó = új fogalom; KUKA-050: a
 * szöveg a valóságot követi).
 *
 * A NÉGY RÉTEG UGYANAZ MINDEN SORRA — a besorolás nem a függvény nevéből, hanem a TÉNYLEGES
 * használatából jön.
 */
const CLASSIFICATIONS = Object.freeze({
  internal_reference_entry_point: 'exportált, megbízható BELSŐ referencia-belépési pont — a hívása '
    + 'valódi jogot ad ebben a referenciában. NEM éles felület és NEM felhasználói felület',
  internal_writer_of_another_path: 'egy MÁSIK út belső írója — exportált, de ma CSAK egy nevezett '
    + 'jogadási út hívja; önállóan nem belépési pont',
  measurement_fixture: 'mérési előkészítő — a jogot azért adja, hogy legyen mit mérni; a referencia '
    + 'egyetlen jogadási útja sem hívja',
  schema_trigger: 'sémaszintű tükrözés — a tárolóban élő trigger írja, nem alkalmazás-kód',
  later_adapter_surface: 'későbbi adapter-/felhasználói felület — ma NEM LÉTEZŐ réteg; a szótárban '
    + 'azért áll, hogy a határt NEVEZNI lehessen, és ne csússzon össze a belső belépési ponttal',
});

/**
 * A JOGADÓ TÁBLÁK. Ez a halmaz dönti el, KI kerül bele a mérésbe — a megvonó táblák
 * (`membership_revocation` · `membership_suspension` · `scope_grant_revocation`) SZÁNDÉKOSAN nem
 * tartoznak ide: azok a jogot ELVESZIK, nem adják, és a saját normáik alatt állnak.
 */
const GRANTING_TABLES = Object.freeze([
  'membership', 'membership_grant', 'invite', 'invite_basis', 'grant_basis',
  'adjudication_authority', 'scope_grant',
]);

const PATHS = Object.freeze([
  Object.freeze({
    id: 'GP-INVITE-ISSUE',
    classification: 'internal_reference_entry_point',
    entry_point: 'v3ref/basisLimit.mjs → issueInviteUnderBasis',
    module: 'v3ref/basisLimit.mjs',
    symbol: 'issueInviteUnderBasis',
    granted_right: 'a meghívóban KIAJÁNLOTT tagsági szerep — még nem tagság, hanem beváltható ajánlat',
    basis_storage: 'invite_basis (basis_id · basis_version · book_id · issued_at · operation · '
      + 'scope · sealed_limit) — a meghívóval EGY tranzakcióban születik',
    grant_gate: 'limitVerdict(... operation=invite_issue ...) a beszúrás ELŐTT; a korláton túli '
      + 'kiadás nyom nélkül elakad, és a művelet-azonosságot a belépési pont adja, nem a hívó',
    use_gate: 'redemptionLimitGate a beváltáskor — a KIADÁSKORI alaphoz mérve',
    norm: 'ORG-N1a · ORG-N1b',
    works: 'az alap azonosítója, verziója és hatálya TÁROLVA van, a korlát KAPU mindkét ponton, és '
      + 'a nyers INSERT-tel írt meghívó sem bújik ki alóla',
    // HELYESBÍTVE (R59/F59-01). Az R57-es szövegem azt állította, hogy „a deklarálatlan meghívó
    // is kiadható" — MÉRVE ez NEM igaz EZEN a függvényen: `basisId: null` mellett a válasz
    // `basis_id_required`, és NULLA sor születik (se meghívó, se pecsét). A külső fél ugyanezt
    // mérte meg. Az alap nélküli meghívó MÁS úton keletkezik, és azt ott kell megnevezni.
    missing: 'EZEN AZ ÚTON SEMMI: az alap KÖTELEZŐ — `basisId: null` mellett a válasz '
      + '`basis_id_required`, és nulla sor születik (mérve). Ami alap nélkül létezhet, az NYERS '
      + '`INSERT INTO invite` írással kerül a tárolóba, MEGKERÜLVE ezt a nevezett kiadó utat — '
      + 'annak a következménye a GP-INVITE-REDEEM soron áll',
    probes: Object.freeze(['P-ORG-basis-limit', 'P-ORG-basis']),
  }),
  Object.freeze({
    id: 'GP-INVITE-REDEEM',
    classification: 'internal_reference_entry_point',
    entry_point: 'v3ref/invite.mjs → redeemInvite',
    module: 'v3ref/invite.mjs',
    // NEM ÍR KÖZVETLENÜL: a tagságot a `grantMembership`, a korlátot a `recordGrantBasis` írja —
    // a jogadás ÁTRUHÁZOTT, és pont ez a védelem (egy helyen születik a tagság). MÉRVE.
    delegates_to: Object.freeze(['grantMembership', 'recordGrantBasis']),
    symbol: 'redeemInvite',
    granted_right: 'a TÉNYLEGES tagság a könyvben (szerep), és az első hitelesítő adat beállítása',
    basis_storage: 'grant_basis (grant_event_id · token · basis_id · basis_version · '
      + 'granted_limit) — a tagságadó eseményhez kötve, `recordGrantBasis`',
    grant_gate: 'hétlépcsős lánc: csatorna → kiadott feltételek → ablak → a kibocsátó MAI joga → '
      + 'redemptionLimitGate → idegen alany → tagsági kimenet',
    use_gate: 'membershipAsOf / rightAt — a tagság a két idő-tengelyen oldódik fel',
    norm: 'ORG-N1a · ORG-N1b · K09 · REV-N1b',
    works: 'a korlát a KIADÁSKORI alaphoz mér, és a beváltás a korlátot is ÁTVISZI a tagságadó '
      + 'eseményre — nem csak a szerepet',
    // HELYESBÍTVE (R59/F59-01): itt áll az alap nélküli eset VALÓDI útja, mérve. Nem a nevezett
    // kiadó függvény engedi — az nem is engedi —, hanem a beváltás fogadja el a pecsét NÉLKÜLI,
    // nyersen vagy történetileg keletkezett meghívót.
    missing: 'a PECSÉT NÉLKÜLI meghívó beváltása ÁTMEGY: a kapu `{ ok: true, basis_declared: '
      + 'false, reason: no_declared_basis }` választ ad (mérve, nyers `INSERT INTO invite` sorra). '
      + 'A hiány tehát NEM néma, de nem is zár. Ez a három alap nélküli eset közül az ELSŐ, és '
      + 'OPERÁTORI döntés, hogy kötelezővé tesszük-e',
    probes: Object.freeze(['P-ORG-basis-limit', 'P-INVITE-seal', 'P-INVITE-terms', 'P-INVITE-window']),
  }),
  Object.freeze({
    id: 'GP-ADJUDICATION-AUTHORITY',
    classification: 'internal_reference_entry_point',
    entry_point: 'v3ref/adjudication.mjs → grantAdjudicationAuthority',
    module: 'v3ref/adjudication.mjs',
    symbol: 'grantAdjudicationAuthority',
    granted_right: 'bírálati hatáskör EGY műveletre (suspend · adjudicate · alter_right) egy könyvben',
    basis_storage: 'adjudication_authority.basis_id + basis_version — a MEGADÁSKOR hatályos verzió',
    grant_gate: 'adjudicationLimitVerdict(mode: grant) a beszúrás ELŐTT; nem hatályos vagy szűkebb '
      + 'alapon NEVEZETTEN és NYOM NÉLKÜL elakad',
    use_gate: 'authority.mjs → authorityRowAt — a felfüggesztés, az elbírálás és a jogváltoztatás '
      + 'KÖZÖS ellenőrzési pontja, `mode: use`, a MEGADÁSKORI verzióhoz mérve',
    norm: 'ORG-N1a · ORG-N1b · REV-N3',
    works: 'a korlát mindkét ponton kapu; a később SZŰKÜLŐ alap a már kiadott hatáskört is zárja, a '
      + 'később TÁGULÓ alap önmagában nem szélesít; a hiányzó megadáskori verzió ZÁR',
    missing: 'a `basisId` paraméter ma OPCIONÁLIS (alapértéke `null`), és MÉRVE: alap nélkül '
      + 'hívva a hatáskör-sor LÉTREJÖN, `basis_id = NULL` értékkel. A régi, alap nélküli sorok a '
      + 'régi szabály szerint mennek (`authority_without_recorded_basis`, kimondva). Ez a három '
      + 'alap nélküli eset közül a MÁSODIK, és OPERÁTORI döntés — a meghívó-beváltástól KÜLÖN '
      + 'kérdés, mert itt a NEVEZETT függvény engedi, ott egy megkerülő írás következménye',
    probes: Object.freeze(['P-ORG-adjudication-basis-limit', 'P-ORG-basis', 'P-REV-authority']),
  }),
  Object.freeze({
    id: 'GP-SCOPE-GRANT',
    classification: 'internal_reference_entry_point',
    entry_point: 'v3ref/scopeGrant.mjs → grantReadScope',
    module: 'v3ref/scopeGrant.mjs',
    symbol: 'grantReadScope',
    granted_right: 'explicit olvasási jog EGY adatkörre (alany × könyv × adatkör)',
    basis_storage: 'scope_grant (basis_id · basis_version · granted_by · effective_at · '
      + 'recorded_at) — az ALAP itt KÖTELEZŐ',
    grant_gate: 'zárt adatkör-szótár + basisAsOf hatályosság + verzió-egyezés + withinBasis; alap '
      + 'nélkül `grant_needs_recorded_basis`',
    use_gate: 'readScopeGrantAt → releaseScope.mjs → scopeReleaseDecision → resultScope.mjs — a '
      + 'megvonás SAJÁT esemény, két tengellyel',
    norm: 'K05-DSC-c · ORG-N1b',
    // HELYESBÍTVE (R61): az „EGYETLEN út, ahol az alap nem opció" TÚL ERŐS volt — a nevezett
    // meghívó-kiadó is KÖVETELI az alapot (`basis_id_required`). A VALÓDI, MÉRT különbség nem a
    // függvény szigora, hanem hogy hol áll a kapu: itt a SÉMA is zár, tehát nyers írással SEM
    // keletkezhet alap nélküli jog — a meghívónál a nyers `INSERT INTO invite` átmegy.
    works: 'az alap itt nem opció, hanem FELTÉTEL — és nem csak a nevezett függvényben: a NYERS '
      + '`INSERT INTO scope_grant` is elakad a sémán (`NOT NULL constraint failed: '
      + 'scope_grant.basis_id`, mérve), tehát alap nélküli adatköri jog EGYÁLTALÁN nem keletkezhet. '
      + 'Ez a MÉRT különbség a meghívó útjához képest, ahol a nyers írás átmegy. A megvonás nem '
      + 'írja át a megadás sorát, és a köztes tudásállapot sértetlen marad',
    // HELYESBÍTVE (R59/F59-01). Az R57-es szövegem ebből „bizonyított technikai hiányt" és
    // „egyetlen következő fejlesztést" vezetett le. A külső fél megcáfolta, és igaza van: a
    // testvér-belépési pontoknak SINCS próbán kívüli hívójuk (`issueInviteUnderBasis` ·
    // `grantAdjudicationAuthority` — utóbbit csak mérési előkészítők hívják), tehát ebből az EGY
    // útra levont következtetés nem következetes (KUKA-054: a minta a mért tulajdonság szerint
    // volt kiválasztva). A hiányzó hívó a REFERENCIA hatókörén KÍVÜL eső réteg kérdése.
    missing: 'EZEN AZ ÚTON A SZABÁLY TELJES: alap kötelező, plafon szűkít, megvonás két tengelyen, '
      + 'az olvasó oldal bekötve (releaseScope → resultScope). Ami nincs: próbán kívüli HÍVÓ — de '
      + 'ez NEM ennek az útnak a sajátja, hanem a REFERENCIA mai hatóköre (a testvér-belépési '
      + 'pontoknak sincs), tehát KÉSŐBBI ADAPTER-/INTEGRÁCIÓS HATÁR (`later_adapter_surface`), '
      + 'nem mai core-hiba. Új burkolót pusztán emiatt tenni elé NEM bizonyított követelmény',
    probes: Object.freeze(['P-DSC-scope-grant-history', 'P-DSC-scope-basis']),
  }),
  Object.freeze({
    id: 'GP-MEMBERSHIP-DIRECT',
    classification: 'internal_writer_of_another_path',
    entry_point: 'v3ref/bitemporal.mjs → grantMembership',
    module: 'v3ref/bitemporal.mjs',
    symbol: 'grantMembership',
    granted_right: 'tagság egy könyvben (esemény + vetület, EGY atomi egységben)',
    basis_storage: 'NINCS saját alap-paramétere — az alapot a HÍVÓ út viszi (`recordGrantBasis`)',
    grant_gate: 'idő- és szerep-ellenőrzés, atomi írás; alap-kapu itt NINCS',
    use_gate: 'membershipAsOf — a két idő-tengely',
    norm: 'REV-N1b · K09',
    works: 'a termékben EGYETLEN hívója van: a `redeemInvite` — tehát a meghívó-lánc kapui elé nem '
      + 'lehet bejutni rajta keresztül; az esemény és a vetület soha nem válik szét',
    missing: 'exportált függvény, tehát egy JÖVŐBELI hívó megkerülhetné a meghívó kapuit. Ma ez '
      + 'nem történik meg — mérve —, de a védelem a hívók számán áll, nem kapun',
    probes: Object.freeze(['P-ORG-grant-atomic', 'P-REV-grant-axis']),
  }),
  Object.freeze({
    id: 'GP-BAN-MATRIX-FIXTURE',
    classification: 'measurement_fixture',
    entry_point: 'v3ref/banMatrix.mjs → banMatrix (a tiltás-mátrix világa)',
    module: 'v3ref/banMatrix.mjs',
    symbol: 'banMatrix',
    granted_right: 'tagság és bírálati hatáskör a MÉRÉS alanyainak',
    basis_storage: 'nincs — a mátrix a tiltás-hatókört méri, nem az alapot',
    grant_gate: 'nincs (fixtúra)',
    use_gate: 'nincs (fixtúra)',
    norm: 'REV-N3 mérése',
    works: 'a mátrix a FELOLDÓKON keresztül méri az engedő utakat',
    missing: 'semmi — ez nem jogadási felület, és nem is annak készült',
    probes: Object.freeze(['P-REV-ban-paths']),
  }),
  Object.freeze({
    id: 'GP-ENTRY-POINTS-FIXTURE',
    classification: 'measurement_fixture',
    entry_point: 'v3ref/entryPoints.mjs → measureEntryPointBinding (kontextus-mátrix)',
    module: 'v3ref/entryPoints.mjs',
    symbol: 'measureEntryPointBinding',
    granted_right: 'tagság és bírálati hatáskör a MÉRÉS alanyainak',
    basis_storage: 'nincs — ez a mátrix a kontextus-átadást méri',
    grant_gate: 'nincs (fixtúra)',
    use_gate: 'nincs (fixtúra)',
    norm: 'REV-N3 mérése (hatásköri/tiltási belépési pontok)',
    works: 'az EXPORTÁLT író belépési pontokat hívja végig valódi kontextussal',
    missing: 'semmi — ez nem jogadási felület',
    probes: Object.freeze(['P-REV-entry-points']),
  }),
  Object.freeze({
    id: 'GP-PROBE-FIXTURES',
    classification: 'measurement_fixture',
    entry_point: 'v3ref/run.mjs és v3ref/mutations.mjs → a próbák és a mutációk kezdeti állapota',
    module: 'v3ref/run.mjs',
    extra_modules: Object.freeze(['v3ref/mutations.mjs']),
    symbol: 'probes',
    granted_right: 'tagság · meghívó · hatáskör · adatköri jog a próbák világában',
    basis_storage: 'esetenként — amit a mért állítás megkövetel',
    grant_gate: 'nincs (fixtúra)',
    use_gate: 'nincs (fixtúra)',
    norm: 'minden norma mérése',
    works: 'a nyers INSERT SZÁNDÉKOS: több próba épp azt méri, hogy a kapu a nyers íráson is hat',
    missing: 'semmi — a teszt-előkészítő nem termékbeli jogadási felület (R57 §2)',
    probes: Object.freeze([]),
  }),
  Object.freeze({
    id: 'GP-SCHEMA-MIRROR',
    classification: 'schema_trigger',
    entry_point: 'v3ref/store.mjs → a séma `invite` ⇄ `invite_terms` tükör-triggerei',
    module: 'v3ref/store.mjs',
    symbol: 'openStore',
    granted_right: 'nem ad jogot — a KIADOTT FELTÉTELEKET rögzíti, hogy utólag ne lehessen átírni',
    basis_storage: 'nem alkalmazható',
    grant_gate: 'nem alkalmazható',
    use_gate: 'authoritativeInvite — a beváltás a pecséthez méri az élő sort',
    norm: 'REV-N1b',
    works: 'a kiadott feltételek 14 DML-alakkal sem írhatók át',
    missing: 'semmi — ez nem alkalmazás-kód, hanem a tároló szabálya',
    probes: Object.freeze(['P-INVITE-terms']),
  }),
]);

/**
 * GP06 — A JOGADÓ SQL-ÍRÁS-HELYEK MODULONKÉNTI DARABSZÁMA (R59/F59-02, (3) ellenpélda).
 *
 * MIÉRT KELL. A GP04 MODUL-szinten mér: ha egy MÁR FELSOROLT modulba kerül egy ÚJ jogadó út, a
 * modul neve változatlanul szerepel a táblában, tehát az őr némán átengedi. A külső fél ezt
 * ellenpéldával mérte meg (új `freshUnregisteredWriter` a `scopeGrant.mjs`-ben ⇒ 9/9 PASS), és a
 * saját fánkon reprodukáltam.
 *
 * MIÉRT ÍGY, ÉS MIÉRT NEM TÖBBET. Függvény-szintű teljességhez hívási lánc-elemző kellene; azt az
 * R59 kifejezetten NEM kéri. Az arányos válasz: az írás-helyek SZÁMA deklarált, tehát egy új
 * jogadó írás a számot megemeli ⇒ PIROS. Ez nem bizonyítja, hogy a DEKLARÁLT szám a helyes
 * besoroláshoz tartozik — csak azt, hogy NÉMÁN nem lehet újat bevinni.
 *
 * A KÉZZEL LÉPTETETT SZÁM CSAPDÁJA (KUKA-045) ELLEN: a mérési előkészítők (`run.mjs` ·
 * `mutations.mjs`) NEM kapnak rögzített számot. Ott minden új próba jogosan ír fixtúra-sort, és egy
 * pinelt darabszám pontosan azt tanítaná be, hogy a javítás = a szám átírása. Ezeknél a
 * deklaráció maga mondja ki, hogy VÁLTOZÓ, és MIÉRT.
 */
const GRANT_WRITE_SITES = Object.freeze({
  'v3ref/adjudication.mjs': 1,
  'v3ref/banMatrix.mjs': 1,
  'v3ref/basisLimit.mjs': 3,
  'v3ref/bitemporal.mjs': 2,
  'v3ref/entryPoints.mjs': 1,
  'v3ref/scopeGrant.mjs': 1,
  'v3ref/store.mjs': 2,
  // VÁLTOZÓ — mérési előkészítő: minden új próba jogosan ír fixtúra-sort (lásd fent, KUKA-045).
  'v3ref/run.mjs': 'variable',
  'v3ref/mutations.mjs': 'variable',
});

/** Hány BELSŐ REFERENCIA-BELÉPÉSI PONT áll ma — MÉRVE, nem beírva (KUKA-045). */
function referenceEntryPoints() {
  return PATHS.filter((p) => p.classification === 'internal_reference_entry_point').map((p) => p.id);
}

/** A PADLÓ: ennyi útnak MINDIG szerepelnie kell. Csökkenni nem szabad, nőni igen. */
const PATH_FLOOR = 9;

module.exports = {
  CLASSIFICATIONS, GRANTING_TABLES, GRANT_WRITE_SITES, PATHS, PATH_FLOOR, referenceEntryPoints,
};
