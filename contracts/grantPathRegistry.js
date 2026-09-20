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
//   · minden itt deklarált próba TÉNYLEG fut a `v3ref/run.mjs`-ben;
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

/** A BESOROLÁS ZÁRT SZÓTÁRA — ismeretlen szó nem csúszhat át „valaminek" (KUKA-101). */
const CLASSIFICATIONS = Object.freeze({
  product_grant_surface: 'termékbeli jogadási felület — exportált belépési pont, aminek a hívása '
    + 'valódi jogot ad a rendszerben',
  writer_of_another_path: 'egy MÁSIK út írója — exportált, de a termékben CSAK egy nevezett '
    + 'jogadási út hívja; önállóan nem jogadási felület',
  measurement_fixture: 'mérési előkészítő — a jogot azért adja, hogy legyen mit mérni; a termék '
    + 'egyetlen útja sem hívja',
  schema_trigger: 'sémaszintű tükrözés — a tárolóban élő trigger írja, nem alkalmazás-kód',
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
    classification: 'product_grant_surface',
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
    missing: 'az alap DEKLARÁLÁSA nem kötelező: alap nélkül kiadott meghívó ma is létezhet '
      + '(a beváltás ezt `no_declared_basis` néven KIMONDJA, de nem zárja) — OPERÁTORI döntés',
    probes: Object.freeze(['P-ORG-basis-limit', 'P-ORG-basis']),
  }),
  Object.freeze({
    id: 'GP-INVITE-REDEEM',
    classification: 'product_grant_surface',
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
    missing: 'a deklarálatlan meghívó beváltása a RÉGI szabály szerint megy (nevezetten) — ez '
      + 'ugyanaz az OPERÁTORI döntés, ami a kiadásnál',
    probes: Object.freeze(['P-ORG-basis-limit', 'P-INVITE-seal', 'P-INVITE-terms', 'P-INVITE-window']),
  }),
  Object.freeze({
    id: 'GP-ADJUDICATION-AUTHORITY',
    classification: 'product_grant_surface',
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
    missing: 'a `basisId` paraméter ma OPCIONÁLIS (alapértéke `null`): alap nélküli hatáskör-sor ma '
      + 'is születhet, és a régi, alap nélküli sorok a régi szabály szerint mennek '
      + '(`authority_without_recorded_basis`, kimondva) — OPERÁTORI döntés',
    probes: Object.freeze(['P-ORG-adjudication-basis-limit', 'P-ORG-basis', 'P-REV-authority']),
  }),
  Object.freeze({
    id: 'GP-SCOPE-GRANT',
    classification: 'product_grant_surface',
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
    works: 'ez az EGYETLEN út, ahol az alap nem opció, hanem FELTÉTEL; a megvonás nem írja át a '
      + 'megadás sorát, és a köztes tudásállapot sértetlen marad',
    missing: 'a termékben ma NINCS hívója: a jogot a próbák és a külső ellenőrző fél átvett '
      + 'programjai adják meg — az OLVASÓ oldal viszont be van kötve (releaseScope → resultScope). '
      + 'Ez FÉL LÁNC (KUKA-069): a hiányzó darab egy belépési pont, nem egy szabály',
    probes: Object.freeze(['P-DSC-scope-grant-history', 'P-DSC-scope-basis']),
  }),
  Object.freeze({
    id: 'GP-MEMBERSHIP-DIRECT',
    classification: 'writer_of_another_path',
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

/** Hány TERMÉKBELI jogadási felület áll ma — MÉRVE, nem beírva (KUKA-045). */
function productGrantSurfaces() {
  return PATHS.filter((p) => p.classification === 'product_grant_surface').map((p) => p.id);
}

/** A PADLÓ: ennyi útnak MINDIG szerepelnie kell. Csökkenni nem szabad, nőni igen. */
const PATH_FLOOR = 9;

module.exports = { CLASSIFICATIONS, GRANTING_TABLES, PATHS, PATH_FLOOR, productGrantSurfaces };
