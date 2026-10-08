// v3app/public/i18n/hu.mjs — A MAGYAR NYELVCSOMAG (SZO-01 · LANG-01, R89 §5).
//
// EZ A LÁNC VÉGE. Minden más nyelv ide esik vissza (`languages.mjs` → `fallbackChainOf`), ezért ez
// az EGYETLEN csomag, aminek TELJESNEK kell lennie: a mérés (`verify:i18n`) minden más nyelvet
// EHHEZ hasonlít, és ami itt nincs, az sehol nincs.
//
// MIÉRT KÖLTÖZÖTT IDE A SZÓTÁR. Az R83-as lelet (KUKA-214) kimondta, hogy a „minden felirat egy
// forrásból" állítás RÉSZLEGES szótárra épült: a `texts.mjs` a menücímeket és az állapot-mondatokat
// tartotta, a gombok, táblafejlécek és bevezető mondatok viszont az `app.js` szövegliterájaiban
// éltek. Egy fordítás ezért elvileg sem készülhetett el. Az R89 ezt zárja: a felület MINDEN látható
// szava kulcsot kapott, és a kulcsok EGY alakban állnak minden nyelvcsomagban.
//
// A CSOPORTOK. `PAGE` (menü- és oldalcím) · `NAV` (menü-csoportok) · `ROLE` · `SCOPE` · `SCOPE_ACC`
// (tárgyeset — a magyar toldalék NEM kódban ragasztódik) · `PLAN` · `REASON` (a szerver gépi okának
// emberi mondata) · `STATE` (állandó állapot-mondat) · `TPL` (paraméteres mondat) · `UI` (a
// képernyők feliratai) · `UNBOUND` (a nézet-kötés nemleges mondatai) · `QUALITY` (a mennyiség
// jellege) · `HELP` · `FAQ` · `KB` (funkció-tudás szövege) · `TOUR` · `CHAT`.
//
// AMI NEM ITT VAN: a szerver válaszainak TARTALMA (azt a mag mondja meg), a jogosultság, és a
// funkciók GÉPI tényei (azok `v3app/knowledge/features.mjs`-ben — ez a fájl csak a SZAVAKAT adja).

export const meta = Object.freeze({ code: 'hu', complete: true, review: 'anyanyelvi forrás' });

export const PAGE = Object.freeze({
  overview: 'Áttekintés',
  processes: 'Folyamatok',
  documents: 'Bizonylatok',
  outbox: 'Kimenő e-mailek',
  stock: 'Készletegyenleg',
  movements: 'Készletmozgások',
  stockcard: 'Termékkarton',
  products: 'Termékek',
  partners: 'Partnerek',
  warehouses: 'Raktárak',
  account: 'Fiók adatai',
  members: 'Felhasználók',
  plan: 'Előfizetés',
  personal: 'Ügyleteim',
  profile: 'Saját profil',
  security: 'Belépés és biztonság',
  new: 'Új fiók hozzáadása',
});

/** A MENÜ CSOPORT-NEVEI — a szerkezet (mely oldal melyik csoportban) a `texts.mjs`-ben áll. */
export const NAV = Object.freeze({
  operations: 'Műveletek',
  reports: 'Kimutatások',
  masterdata: 'Törzsadatok',
  settings: 'Beállítások',
  ownMatters: 'Saját ügyek',
  ownData: 'Saját adatok',
});

export const ROLE = Object.freeze({ user: 'Tag', admin: 'Fiókkezelő' });
export const SCOPE = Object.freeze({ keszlet: 'Készletadatok', arak: 'Árak', dokumentumok: 'Üzleti dokumentumok', beszallitok: 'Beszállítói adatok' });
export const SCOPE_ACC = Object.freeze({ keszlet: 'a készletadatokat', arak: 'az árakat', dokumentumok: 'az üzleti dokumentumokat', beszallitok: 'a beszállítói adatokat' });
export const PLAN = Object.freeze({ starter: 'Alap', pro: 'Bővített' });
export const QUALITY = Object.freeze({ mert: 'Mért', becsult: 'Becsült', ismeretlen: 'Nem ismert' });

export const TPL = Object.freeze({
  // MONDATVÉG (R112): ezek után EGY MÁSIK mondat következik — pont nélkül a kettő összefolyt
  // (a sikerüzenetben: „…fiókhoz: Minta Kft Az adatok…”). Az idézőjel a cégnév saját pontját is elválasztja.
  accountJoined: 'Csatlakoztál ehhez a fiókhoz: „{nev}”.',
  // KI NEVÉBEN JÁRSZ EL (R112): a szerver tényeiből, a csomag szavaival — nyers szerepkód nélkül.
  actingAsPersonal: '{ki} · {fiok}',
  actingAsBusiness: '{ki} · {fiok} · szerepkör: {szerep}',
  actingAsNone: '{ki} · nincs kiválasztott fiók',
  accountLost: 'Megszűnt a hozzáférésed ehhez a fiókhoz: „{nev}”.',
  accountOpened: 'Megnyitva: {nev}',
  accountCreated: 'Hozzáadtad a vállalkozást: {nev}',
  sharedCreated: 'Létrehoztad ezt a közös fiókot: {nev}',
  accountSwitchedElsewhere: 'Egy másik böngészőfülön fiókváltás történt. Most ez a fiók van megnyitva: {nev}',
  scopeOnlyHere: 'Az engedély ehhez a fiókhoz tartozik: {nev}',
  memberCanSee: '{ki} mostantól megtekintheti {mit}.',
  sampleNeeds: 'Ehhez a nézethez ezek a hozzáférések kellenek: {korok}.',
  sampleMissing: 'Hiányzó hozzáférés: {korok}. Ezt a fiók kezelője adja meg.',
  scopeRevoked: 'A hozzáférést visszavontuk: {ki} mostantól nem látja {mit}.',
  // R123/F123-03 — A NYUGTA KIMONDJA, VÁLTOZOTT-E VALAMI. A kétszer megnyomott gomb ugyanazt a
  // végállapotot adja, de a második nyugta NEM mondhatja, hogy most történt valami (KUKA-129).
  scopeGrantUnchanged: '{ki} eddig is megtekinthette {mit} — nem változott semmi.',
  scopeRevokeUnchanged: '{ki} eddig sem látta {mit} — nem változott semmi.',
  memberRevoked: '{ki} hozzáférése megszűnt ehhez a fiókhoz: {nev}',
  memberAccessTitle: '{ki} hozzáférése',
  revokeTitle: 'Megszünteted {ki} hozzáférését?',
  revokeLead: '{ki} tagsága megszűnik ebben a fiókban: {nev}. Ezután nem nyithatja meg a fiók adatait. A személyes fiókja és a korábbi műveletek története megmarad.',
  inviteReady: 'A meghívó elkészült. A próbaüzenetek között megnyithatod. Eddig érvényes: {mikor}',
  planSaved: 'A csomag mentve: {csomag}',
  rowCount: '{n} mintaadat · ezekből nem indul valódi üzleti művelet.',
  // R89 — a súgó, a bemutató és a segéd paraméteres mondatai
  openPage: '{oldal} megnyitása',
  closeTab: '{oldal} lap bezárása',
  itemCount: '{n} tétel',
  rowsAndUnits: '{n} sor · különböző mértékegységű mennyiségeket nem adunk össze.',
  allOf: 'Mind ({n})',
  stateWithCount: '{allapot} ({n})',
  tourStepOf: '{n}. lépés (összesen {osszes})',
  tourStepsLeft: 'Még {n} lépés',
  storySteps: '{n} lépés',
  evidenceGreen: '{zold}/{osszes} ellenőrző próba zöld',
  scopeViewOf: '{mit} megtekintése',
  // D2 (R114/2): a megtekintés MINDIG egy fiókhoz tartozik, és a változó értéke NÉV — a régi,
  // birtokos alak ragozott mondatrészt kért volna a cégnévtől („Minta Kft adatainak…”).
  dataViewingOf: 'Adatok megtekintése — {fiok}',
  langSwitched: 'A felület nyelve: {nyelv}',
  askedInLang: 'A kérdést ezen a nyelven válaszoljuk meg: {nyelv}',
  helpForScreen: 'Ehhez a képernyőhöz: {oldal}',
  chatSourceLine: 'Forrás: {cim} ({verzio})',
  chatHistoryNote: 'A beszélgetésből a legutóbbi {n} kérdést tartjuk meg — a régebbiek kiesnek.',

  // ── R132 — MEGHÍVÓ VISSZAVONÁSA ÉS ÚJBÓLI BELÉPÉS ────────────────────────────────────────
  inviteRevoked: 'A meghívást visszavontuk: {ki} hivatkozása már nem használható.',
  inviteRevokeUnchanged: 'Ezen a meghíváson nem változott semmi: {miert}',
  inviteRevokeConfirmLead: '{ki} meghívását visszavonjuk. A korábbi hivatkozása ezután nem használható. Más jogosultság nem változik, és ez nem szünteti meg senki tagságát.',
  reinviteSent: 'Újbóli meghívást küldtünk: {ki}. A tagság az ő elfogadásával jön létre.',
  reinviteReplayed: 'Ez ugyanaz az ajánlat, amit már kiadtunk {ki} részére — másodikat nem gyártottunk. A tagság az ő elfogadásával jön létre.',
  reinviteConfirmLead: '{ki} új meghívást kap. A tagság csak az ő elfogadásával jön létre. A korábbi adat-hozzáférései nem állnak vissza — azokat külön, újra meg kell adni.',
  memberRemovedAt: 'Eltávolítva: {mikor}',
  reinviteBlocked: '{ki} most nem hívható vissza: {miert}',
});

export const REASON = Object.freeze({
  invalid_credentials: 'Az e-mail-cím vagy a jelszó nem megfelelő.',
  credentials_rejected: 'Az e-mail-cím vagy a jelszó nem megfelelő.',
  login_required: 'A belépésed lejárt. Lépj be újra.',
  channel_not_proven: 'A folytatáshoz erősítsd meg az e-mail-címedet.',
  challenge_expired: 'Ez a megerősítő hivatkozás lejárt. Kérj új megerősítő levelet, és annak a hivatkozását használd.',
  challenge_used: 'Ezt a hivatkozást már felhasználták. Ha a címedet már megerősítetted, egyszerűen lépj be.',
  challenge_superseded: 'Használd a legutóbbi megerősítő levél linkjét.',
  challenge_not_found: 'Ez a megerősítő hivatkozás nem használható. Kérj új megerősítő levelet.',
  channel_already_proven: 'Ez az e-mail-cím már meg van erősítve.',
  resend_rate_limited: 'Túl gyakran kértél új levelet. Várj egy kicsit, és próbáld újra.',
  no_scope_grant: 'Ehhez az adathoz még nincs hozzáférésed. A fiókkezelő tudja engedélyezni.',
  not_available: 'Ehhez az adathoz még nincs hozzáférésed. A fiókkezelő tudja engedélyezni.',
  feature_not_in_plan: 'Ez a funkció nincs benne a fiók jelenlegi csomagjában. A fiókkezelő a Beállításokban válthat olyan csomagra, amely tartalmazza.',
  not_a_member: 'Ennek a fióknak nem vagy tagja. Válassz másik fiókot a fejléc fiókválasztójában, vagy kérj meghívást a fiókkezelőtől.',
  admin_required: 'Ehhez a művelethez fiókkezelői jogosultság kell.',
  role_not_delegable: 'Ezt a szerepkört nem adhatod tovább.',
  scope_not_delegable: 'Ezt az adatkört nem adhatod tovább.',
  authority_not_established: 'Ezt a módosítást nem végezheted el.',
  outside_basis_operations: 'Ez a művelet nincs a felhatalmazásod körében.',
  context_mismatch: 'A módosítást nem mentettük, mert közben másik fiókra váltottál.',
  tax_id_value_required: 'Add meg az adóazonosítót. Csak szóköz vagy kötőjel nem elegendő.',
  invalid_type: 'A megadott érték alakja nem megfelelő.',
  invalid_value: 'A megadott érték nem választható.',
  missing_field: 'Egy kötelező mező hiányzik.',
  unknown_field: 'Az elküldött adatok között nem várt mező volt. Frissítsd az oldalt, és próbáld újra.',
  at_capacity: 'A meghívó-folytatást most nem tudtuk megőrizni, mert a rendszer megtelt. Próbáld meg újra néhány perc múlva, vagy lépj be először, és utána nyisd meg újra a meghívó hivatkozását.',
  session_gone: 'A meghívó-folytatást nem őriztük meg, mert közben kiléptek ebből a munkamenetből (vagy másik fiókra váltottak). Lépj be újra, és nyisd meg ismét a meghívó hivatkozását.',
  invite_expired: 'Ez a meghívás lejárt. Kérj új meghívót attól, aki küldte.',
  invite_already_redeemed: 'Ezt a meghívót már felhasználták.',
  invite_unknown: 'Ehhez a hivatkozáshoz nem tartozik beváltható meghívás.',
  invite_terms_changed: 'A meghívás feltételei időközben megváltoztak. Kérj új meghívót attól, aki meghívott.',
  issuer_right_withdrawn: 'Aki a meghívót kiadta, már nem jogosult rá. Kérj új meghívót a fiók kezelőjétől.',
  invitee_mismatch: 'Ez a meghívás másik e-mail-címre szól. Lépj be azzal a címmel, vagy kérj új meghívást a sajátodra.',
  // A MEGHÍVÁS BEVÁLTÁSÁNAK TOVÁBBI, FELÜLETRŐL ELÉRHETŐ OKAI (R112): eddig a mag magyar szövege állt
  // helyettük — idegen nyelvű felületen is (KUKA-210). A kulcs-feloldás a `dict.mjs` REASON_ALIAS.
  address_ambiguous: 'Ehhez a címhez több belépés is tartozik, ezért a meghívást így nem lehet elfogadni. Kérj segítséget attól, aki meghívott.',
  membership_role_differs: 'Ebben a fiókban már tag vagy, más szerepkörrel. A szerepkör módosításáról a fiókkezelő dönt.',
  membership_reopen_needs_decision: 'Ebben a fiókban korábban megszűnt a tagságod. Az újbóli csatlakozásról a fiókkezelő dönt.',
  workspace_required: 'Válassz fiókot a folytatáshoz.',
  business_identity_already_attached: 'Ehhez az adóazonosítóhoz már tartozik fiók. Ha a vállalkozásod már használja a rendszert, kérj meghívót attól, aki kezeli.',
  creator_channel_unproven: 'A folytatáshoz erősítsd meg az e-mail-címedet.',
  personal_space_exists: 'Ehhez a belépéshez már tartozik személyes fiók.',
  name_required: 'Add meg a vállalkozás nevét.',
  value_required: 'Add meg az adóazonosítót. Csak szóköz vagy kötőjel nem elegendő.',
  namespace_not_in_profile: 'Ehhez az országhoz vagy területhez más fajta azonosítót tartunk nyilván. Ellenőrizd a kiválasztott országot, és az ott használt azonosítót add meg.',
  // A HATÁR (HTP-01) NEVEZETT ELUTASÍTÁSAI — ezek a felületen is emberi mondatot kapnak, különben
  // gépi kód jelenne meg a képernyőn (R89 §5 · KUKA-210).
  value_too_long: 'A megadott érték túl hosszú.',
  value_too_short: 'A megadott érték túl rövid.',
  invalid_body: 'Az elküldött adatokat nem tudtuk feldolgozni. Frissítsd az oldalt, és próbáld újra.',
  invalid_json: 'Az elküldött adatokat nem tudtuk feldolgozni. Frissítsd az oldalt, és próbáld újra.',
  unsupported_schema_version: 'A felület régebbi változatból küldte a kérést. Frissítsd az oldalt.',
  unknown_operation: 'Ilyen műveletet nem ismerünk.',
  profile_required: 'Ehhez a művelethez meg kell adni a nyilvántartás országát vagy területét.',
  endpoint_schema_missing: 'Ezt a kérést nem tudjuk feldolgozni. Frissítsd az oldalt.',
  unknown_endpoint: 'Ez a funkció ebben a környezetben nem elérhető.',
  body_too_large: 'A beküldött adat túl nagy.',
  internal_error: 'Váratlan hiba történt. Az adatokat nem változtattuk meg.',
  network_error: 'Nem sikerült kapcsolatba lépni a rendszerrel. Próbáld újra.',
  invalid_response: 'Az adatokat nem tudtuk biztonságosan megjeleníteni. Frissítsd az oldalt.',
  // R89 — a segéd nevezett nemleges okai
  assistant_unavailable: 'A segéd most nem elérhető. A leírásokban továbbra is kereshetsz.',
  assistant_not_configured: 'A segéd ebben a környezetben nincs beállítva. A leírások és a gyakori kérdések működnek.',
  assistant_question_too_long: 'Ez a kérdés túl hosszú. Fogalmazd rövidebben, vagy keress a leírásokban.',
  assistant_no_knowledge: 'Ehhez még nincs ellenőrzött leírás.',
  assistant_out_of_scope: 'Ez a kérdés nem erről a rendszerről szól, ezért nem válaszolok rá.',
  assistant_rate_limited: 'Most sok kérdés érkezett. Várj egy kicsit, vagy keress a leírásokban.',
  action_not_allowed: 'Ezt a műveletet a segéd nem indíthatja el.',
  action_unknown: 'Ilyen műveletet nem ismerünk.',
  feature_not_working: 'Ez a funkció még nem használható, ezért nem is nyitjuk meg.',
  // ── R132 — MEGHÍVÓ VISSZAVONÁSA ÉS ÚJBÓLI BELÉPÉS ────────────────────────────────────────
  // MINDEN NEMLEGES VÁLASZ VISZI A MŰKÖDŐ FOLYTATÁST (KUKA-201): megmondja, KI tudja elindítani
  // a következő lépést, vagy MELYIK eljárás tartozik hozzá — nem csak azt, hogy „nem".
  invite_revoked: 'Ezt a meghívást visszavonták. Kérj új meghívót a fiók kezelőjétől.',
  invite_ref_ambiguous: 'Ezt a meghívást nem tudtuk egyértelműen azonosítani. Frissítsd az oldalt, és próbáld újra.',
  invite_not_actionable: 'Ez a meghívás most nem használható.',
  membership_not_granted: 'A tagság nem jött létre. A folytatást a fiók kezelője tudja elindítani.',
  reentry_decision_required: 'Ehhez a fiókhoz korábban visszavont tagságod van. Az újbóli belépés külön döntés: kérd a fiók kezelőjét, hogy hívjon meg újra.',
  reentry_offer_period_mismatch: 'Ez az újbóli meghívás egy korábbi helyzetre szólt, és már nem használható. Kérj új meghívót a fiók kezelőjétől.',
  reentry_target_membership_is_open: 'Ennek a munkatársnak most is él a tagsága, ezért újbóli meghívásra nincs szükség.',
  reentry_target_no_membership: 'Ehhez a személyhez nincs korábbi tagság ebben a fiókban, ezért nem hívható vissza. Küldj neki rendes meghívást.',
  reentry_target_membership_without_grant_event: 'Ennek a tagságnak nincs olyan rögzített előzménye, amire az újbóli belépés köthető lenne. Küldj rendes meghívást.',
  reentry_blocked_suspension: 'Ez a tagság fel van függesztve. Előbb a felfüggesztést kell feloldani — az külön eljárás.',
  authority_other_period: 'Ez a hatáskör egy korábbi, már lezárt tagsági időszakhoz tartozott. Új belépés után újra, kifejezetten meg kell adni.',
  operation_identity_conflict: 'Ugyanazzal a művelet-azonosítóval már más tartalmú kérés érkezett. Egy új, tudatos ajánlathoz nyisd meg újra az űrlapot.',
  operation_id_required: 'Ehhez a művelethez azonosító kell, hogy az újraküldés ne gyártson második ajánlatot. Nyisd meg újra az űrlapot.',
  reentry_blocked_ban: 'Erre a személyre tiltás van érvényben. A tiltás feloldása külön eljárás.',
  reentry_blocked_open_review_circle: 'Ehhez a tagsághoz nyitott felülvizsgálat tartozik. Előbb azt kell lezárni.',
  reentry_blocked_retroactive_invalidity: 'Ezt a tagságot visszamenőleges érvénytelenség zárta le. Az ilyen döntés felülvizsgálata külön eljárás, nem újbóli meghívás.',
  reentry_not_after_revocation: 'Az újbóli belépés nem lehet a megszüntetéssel egyidejű. Próbáld újra egy pillanat múlva.',
  reentry_target_has_no_address: 'Ehhez a személyhez nincs rögzített e-mail-cím, amire az új meghívás szólhatna.',
  outside_basis_roles: 'Ezt a szerepkört nem adhatod tovább: a saját felhatalmazásod ennél szűkebb.',
  outside_basis_scopes: 'Ezt az adatkört nem adhatod tovább: a saját felhatalmazásod ennél szűkebb.',
  scope_grant_other_period: 'Ez a hozzáférés egy korábbi, már lezárt tagsági időszakhoz tartozott. Új belépés után újra meg kell adni.',
  delegation_ceiling_resolver_missing: 'A felhatalmazás korlátja most nem ellenőrizhető, ezért a műveletet nem végezzük el.',
  revocation_row_not_created: 'A visszavonást nem sikerült rögzíteni, ezért semmi nem változott. Próbáld újra.',
  reentry_row_not_created: 'Az újbóli meghívást nem sikerült rögzíteni, ezért semmi nem változott. Próbáld újra.',
  generic: 'A művelet most nem fejezhető be.',
});

export const UNBOUND = Object.freeze({
  login_required: 'A belépésed lejárt. Lépj be újra, és a művelet megismételhető.',
  context_mismatch: 'A módosítást nem mentettük, mert közben ebben a böngészőben másik fiók vagy felhasználó lett aktív.',
  other_context: 'Közben ebben a böngészőben másik fiók vagy felhasználó lett aktív, ezért ezt a választ nem jelenítettük meg. Az oldal frissült.',
  unsafe: 'Az adatokat nem tudtuk biztonságosan megjeleníteni. Frissítsd az oldalt.',
});

export const STATE = Object.freeze({
  uncertainWrite: 'Nem tudjuk biztosan, hogy a kérés teljesült. Nézd meg a Próbaüzeneteket, és csak akkor kérj újat, ha ott nem jelent meg.',
  otherPersonSignedIn: 'Ebben a böngészőben másik felhasználó lépett be. A korábbi kitöltést nem mentettük el. Lépj be a saját adataiddal, és kezdd újra a létrehozást.',
  invitesLoading: 'Meghívások betöltése…',
  demoItem: 'Mintaadat-tétel',
  personalAccount: 'Személyes fiók',
  personalKind: 'A saját ügyeid helye',
  kindBusiness: 'Vállalkozás',
  kindShared: 'Közös fiók',
  kindBusinessLead: 'Cégként dolgozol: megadhatod a nyilvántartás országát és az adóazonosítót.',
  kindSharedLead: 'Közös munkahely adóazonosító nélkül. Adóazonosító utólag nem adható hozzá: ha céges adatokkal dolgoznál, válaszd a Vállalkozás fajtát.',
  inviteScopeQuestion: 'Mely adatokhoz kaphat hozzáférést?',
  inviteScopeHelp: 'A megtekintést a csatlakozás után külön engedélyezed.',
  inviteRoleHelp: 'A fiókkezelő a saját jogosultságain belül kezelheti a hozzáféréseket.',
  invitePending: 'Várakozó meghívások',
  invitePendingEmpty: 'Nincs várakozó meghívás.',
  inviteAsk: 'Szeretnél másokat is meghívni?',
  inviteSkip: 'Most kihagyom',
  revokeSectionLead: 'Ez a teljes tagságot megszünteti ebben a fiókban, nem csak egy adatkört.',
  demoItemLead: 'A mintaadat-tételek jelölve vannak.',
  notGiven: 'Nincs megadva',
  demoNone: 'Ehhez a fiókhoz nem tartozik mintaadat',
  demoNoneLead: 'A próbafelület két cégén látható mintaadat. Ez a fiók üresen indul — a képernyők elrendezése itt is megnézhető.',
  loading: 'Betöltés…',
  empty: 'Még nincs adat',
  noResult: 'Nincs a szűrésnek megfelelő találat.',
  noAccess: 'Nincs hozzáférés',
  loadFailed: 'Nem sikerült betölteni az adatokat.',
  // R87/R88 NEVESÍTETT FÜGGŐ ITT ZÁRUL (R89 §7): a korábbi alak („a készletadatokat nem kérdeztük
  // le") TÁGABB volt a bizonyíthatónál — a válasz elveszhetett akkor is, ha az olvasás lefutott.
  stockLoadFailed: 'A készletadatokat nem sikerült betölteni.',
  stockLoadFailedLead: 'Semmi nem változott a fiókban.',
  saveUncertain: 'Nem tudjuk biztosan, hogy a mentés befejeződött. Ellenőrizd az állapotot, mielőtt újra próbálod.',
  unbound: 'Az adatokat nem tudtuk biztonságosan megjeleníteni. Frissítsd az oldalt.',
  demo: 'Próbafelület · mintaadatok',
  demoMail: 'Próbaüzenet. Valódi e-mailt nem küldtünk.',
  noMembers: 'Még nem hívtál meg másokat.',
  noAccount: 'Nincs megnyitott fiók.',
  planMissingAdmin: 'Ez a funkció nincs benne a fiók jelenlegi csomagjában. A Beállításokban válthatsz olyan csomagra, amely tartalmazza.',
  planMissingMember: 'Ez a funkció nincs benne a fiók csomagjában. A fiókkezelő válthat olyan csomagra, amely tartalmazza.',
  unknownQty: 'Nem ismert',
  noUnit: 'Egység nincs megadva',
  noPrice: 'Nincs megadva',
  noCurrency: 'Pénznem nincs megadva',
});

/** A KÉPERNYŐK FELIRATAI — ide kerül minden szó, ami eddig az `app.js`-be volt égetve (KUKA-214). */
export const UI = Object.freeze({
  // fejléc és keret
  demoBar: 'Próbafelület · mintaadatok',
  demoBarLead: 'Nincs valódi levélküldés, számlázás vagy készletmozgás.',
  demoMailButton: 'Próbaüzenetek',
  navOpen: 'Menü megnyitása',
  navClose: 'Menü bezárása',
  home: 'Kezdőlap',
  activeAccount: 'Aktív fiók',
  profileMenu: 'Saját profil menü',
  noAccountShort: 'nincs fiók',
  notSignedIn: 'nincs belépve',
  // F118-01 — A MEGERŐSÍTETLEN, FIÓK NÉLKÜLI ÁLLAPOT SAJÁT MONDATA. Nincs mit választania: a
  // személyes fiók a MEGERŐSÍTÉSKOR születik meg, ezért nem a fiókválasztóhoz küldjük.
  confirmEmailFirst: 'Erősítsd meg az e-mail-címedet a folytatáshoz.',
  confirmEmailFirstLead: 'A megerősítés után magától megszületik a személyes fiókod, és onnan vállalkozást is hozzáadhatsz.',
  confirmEmailBoxTitle: 'A megerősítő levél',
  confirmEmailBoxLead: 'A levelet a Próbaüzenetek panelen nyithatod meg. Ha nem találod, vagy a hivatkozás lejárt, kérj újat — mindig a legutóbbi levél érvényes.',
  chooseAccount: 'Válassz fiókot',
  groupPersonal: 'Személyes',
  groupShared: 'Vállalkozások és közös fiókok',
  addBusiness: '+ Vállalkozás hozzáadása',
  channelProven: 'E-mail-cím megerősítve',
  channelPending: 'Az e-mail-címed még nincs megerősítve.',
  logout: 'Kijelentkezés',
  openTabs: 'Nyitott lapok',
  mainMenu: 'Főmenü',
  technicalDetails: 'Technikai részletek',
  close: 'Bezárás',
  cancel: 'Mégse',
  refresh: 'Frissítés',
  details: 'Részletek',
  clearFilters: 'Szűrők törlése',
  searchInList: 'Keresés a listában',
  searchInListPlaceholder: 'Keresés a listában…',
  stateFilter: 'Állapot',
  noScript: 'Ehhez a felülethez engedélyezd a JavaScriptet a böngészőben.',
  // fiók nélküli nézet
  chooseAccountLead: 'A folytatáshoz nyiss meg egy fiókot a fejléc fiókválasztójából.',
  chooseAccountBox: 'A fejléc bal oldalán lévő fiókválasztóban megtalálod a személyes fiókodat, a vállalkozásaidat és a közös fiókjaidat.',
  // áttekintés
  overviewLead: 'A napi munka és a következő teendők.',
  overviewPersonalLead: 'Itt találod a saját ügyeidet. Vállalkozást később is hozzáadhatsz.',
  personalReady: 'A fiókod készen áll. A vállalkozásaidat a fejléc fiókválasztójából éred el.',
  alsoBusiness: 'Vállalkozást is kezelsz?',
  alsoBusinessLead: 'Ugyanezzel a belépéssel hozzáadhatod. A személyes fiókod megmarad.',
  afterCreateLead: 'Ha egyedül dolgozol, ezt a lépést nyugodtan kihagyhatod.',
  inviteUser: 'Felhasználó meghívása',
  statProcesses: 'Folyamatban lévő munkák',
  statProducts: 'Megjelenített termékek',
  statRole: 'Szerepköröd',
  nextTasks: 'Következő teendők',
  nextTasksLead: 'A készlet és az árak megtekintését a fiókkezelő felhasználónként engedélyezi; az árakhoz a fiók csomagjának is tartalmaznia kell ezt a funkciót.',
  activeAccountCard: 'Aktív fiók',
  switchAccountLead: 'Másik fiókra a fejléc fiókválasztójával válthatsz.',
  // listák
  demoListLead: 'Mintaadatok a korábbi rendszerből ismert elrendezésben.',
  demoListLeadRows: 'Mintaadatok a V2-ből ismert elrendezésben. A sorra kattintva a részletek is megnyílnak.',
  notBuiltLead: 'Ez a nézet ezen a próbafelületen még nem épült meg.',
  notBuiltTitle: 'Nincs megjeleníthető tartalom',
  notBuiltBox: 'A menüből másik nézetet nyithatsz meg.',
  colProduct: 'Termék',
  colCode: 'Kód',
  colKind: 'Típus',
  colWarehouse: 'Raktár',
  colPartner: 'Partner',
  colContact: 'Kapcsolat',
  colCountry: 'Ország',
  colSamplesHere: 'Itt tartott mintatételek',
  colProcess: 'Folyamat',
  colName: 'Megnevezés',
  colState: 'Állapot',
  colWhen: 'Időpont',
  colDocument: 'Bizonylat',
  colQty: 'Mennyiség',
  colUnit: 'Egység',
  colQtyQuality: 'Mennyiség jellege',
  colUnitPrice: 'Egységár',
  colOperation: 'Művelet',
  colUser: 'Felhasználó',
  colRole: 'Szerepkör',
  colActions: 'Műveletek',
  colInvitedEmail: 'Meghívott cím',
  colInvitedBy: 'Meghívta',
  colValidUntil: 'Érvényesség',
  detailItemsHere: 'Tételek ebben a raktárban',
  detailDemoNote: 'Ez mintaadat-tétel: a rendszer ehhez nem végez üzleti műveletet.',
  // készlet
  stockLead: 'Mennyiségek raktáranként. Az ismeretlen mennyiség nem nulla.',
  stockNoAccessTitle: 'A készletadatokhoz még nincs hozzáférésed',
  stockNoAccessLead: 'A fiókkezelő tudja engedélyezni a megtekintésüket.',
  prices: 'Árak',
  priceNotAllowed: 'Az árak megtekintését a fiókkezelő még nem engedélyezte neked. Kérd meg, hogy engedélyezze.',
  priceMissingNote: 'A hiányzó ár nem 0: ahol nincs megadva, ott „Nincs megadva” áll. Ez más, mint a „Nem ismert”: azt olyan mennyiségnél írjuk ki, amit senki nem mért meg.',
  stockcardLead: 'Egy termék készlete és mozgásai.',
  stockcardStock: 'Készlet',
  movementsLead: 'A készlet mozgásai időrendben.',
  // felhasználók
  membersNoAccessTitle: 'Ehhez a beállításhoz nincs hozzáférésed',
  membersNoAccessLead: 'A fiókkezelő tud segíteni.',
  membersLead: 'Itt kezelheted, ki fér hozzá a fiókhoz és az adatokhoz.',
  inviteUserButton: '+ Felhasználó meghívása',
  inviteEmptyLead: 'Új meghívást a „Felhasználó meghívása” gombbal hozhatsz létre.',
  inviteExpired: 'Lejárt',
  inviteWaiting: 'Elfogadásra vár',
  inviteTokenNote: 'A meghívó hivatkozása csak a levélben szerepel — itt nem jelenítjük meg.',
  canView: 'Megtekintheti',
  // R116: a nem engedélyezett sor korábban KÉTSZER írta ki ugyanazt („Nincs engedélyezve" a
  // mondatban és a jelölőn is) — a mondat mostantól a KÖVETKEZMÉNYT mondja meg.
  cannotView: 'Most nem tudja megtekinteni',
  notAllowed: 'Nincs engedélyezve',
  noAccessBadge: 'Nincs hozzáférés',
  active: 'Aktív',
  revoked: 'Megszüntetve',
  allowed: 'Engedélyezve',
  accessButton: 'Hozzáférés kezelése',
  unknownEmail: 'ismeretlen cím',
  membersFoot: 'A tagság és az adatok megtekintésének engedélye két külön állapot.',
  // panelek
  inviteTitle: 'Felhasználó meghívása',
  inviteLead: 'A meghívott a fiók adataihoz külön engedéllyel fér hozzá.',
  email: 'E-mail-cím',
  password: 'Jelszó',
  role: 'Szerepkör',
  inviteCreate: 'Meghívó létrehozása',
  inviteMailOpen: 'A meghívó levél megnyitása a Próbaüzenetek között',
  memberRevokedNote: 'Ennek a felhasználónak megszűnt a hozzáférése ehhez a fiókhoz, ezért adatkört sem lehet neki engedélyezni.',
  scopeToGrant: 'Engedélyezendő adatkör',
  grantView: 'Megtekintés engedélyezése',
  accountAccess: 'Hozzáférés a fiókhoz',
  revokeBusinessAccess: 'Hozzáférés megszüntetése ebben a fiókban',
  revokeConfirm: 'Hozzáférés megszüntetése',
  someUser: 'A felhasználó',
  mailboxTitle: 'Próbaüzenetek',
  mailboxOff: 'Ebben a környezetben a próbaüzenetek nem érhetők el (a próbafelület levél-fogadója ki van kapcsolva).',
  mailOpen: 'Megnyitás',
  // belépés
  registerTitle: 'Fiók létrehozása',
  loginTitle: 'Belépés',
  registerLead: 'Egy belépéssel a személyes fiókodat és a vállalkozásaid fiókjait is kezelheted.',
  loginLead: 'Lépj be a saját fiókodba.',
  passwordMin: 'Legalább 8 karakter.',
  showPassword: 'Jelszó megjelenítése',
  haveAccount: 'Már van fiókod?',
  noAccountYet: 'Még nincs fiókod?',
  resendAsk: 'Új megerősítő levél kérése',
  resendTitle: 'Új megerősítő levél',
  resendLead: 'Add meg a regisztrációnál használt e-mail-címedet.',
  resendSubmit: 'Levél kérése',
  sampleBadge: 'Mintaadatok',
  sampleDocTitle: 'Bizonylat-minta',
  sampleMixedTitle: 'Vegyes bizonylat-minta',
  sampleSupplierTitle: 'Beszállítói minta',
  sampleLead: 'Ez a szakasz a szerverről kért, jelölt mintaadat — a jogosultságot valódi szerveroldali ellenőrzés dönti el.',
  sampleMixedNote: 'A vegyes bizonylat egyetlen hiányzó hozzáférés esetén is egészben zárva marad.',
  sampleOpen: 'Minta lekérése',
  scopeRevoke: 'Hozzáférés visszavonása',
  scopeGrant: 'Hozzáférés megadása',
  scopeBlocked: 'Ebben a fiókban nem adható meg',
  scopeBlockedLead: 'Ez a fiók a korábbi, kétféle hozzáférést adó indulási szabállyal jött létre, ezért a két újabb hozzáférés itt nem adható meg. Ehhez új fiók kell; a meglévő fiókok változatlanul működnek.',
  resendWaitHint: 'Két levélkérés között várj legalább egy percet. Ha több levelet kaptál, a legutóbbi hivatkozását használd.',
  backToLogin: 'Vissza a belépéshez',
  resendInProgress: 'Levélkérés folyamatban…',
  checkMailTitle: 'Nézd meg a Próbaüzeneteket',
  registerSentLead: 'Ha ezzel a címmel folytatható a regisztráció, a következő lépés levele a Próbaüzenetek között jelenik meg. Nyisd meg a benne lévő hivatkozást.',
  resendSentLead: 'Ha ehhez a címhez megerősítésre váró belépés tartozik, új megerősítő levél jelenik meg a Próbaüzenetek között. Mindig a legutóbbi levél hivatkozását használd.',
  openMailbox: 'Próbaüzenetek megnyitása',
  // meghívó lapja
  inviteOpenTitle: 'Meghívás megnyitása',
  // A CÍM EGY SZÓ, A FIÓK NEVE ALATTA ÁLL (P109-01): így a mondat nem múlik a névelőn, és
  // egyik nyelv sem kényszerül ragozni egy behelyettesített nevet (KUKA-214 osztálya).
  inviteGenericTitle: 'Meghívás',
  inviteWhatHappens: 'Az elfogadással tagja leszel ennek a fióknak. Az adatok megtekintését a fiókkezelő ezután külön engedélyezi.',
  inviteNotSignedIn: 'Még nem vagy belépve.',
  // A FOLYTATÁS SORA — MINDEN meghívó-állapotra (R166 §1). A meghívó lapja eddig ZSÁKUTCA volt:
  // lecseréli a teljes alkalmazás-héjat, tehát profil-menü és kilépés-vezérlő sem rajzolódott ki.
  inviteBackToApp: 'Vissza a fiókomba',
  inviteBackToStart: 'Vissza a kezdőlapra',
  inviteSignOutSwitch: 'Kilépés és belépés más fiókkal',
  inviteLeaveNote: 'A visszalépés nem fogadja el és nem veszi el a meghívást — a hivatkozás később is megnyitható.',
  inviteFaqOpen: 'Gyakori kérdések',
  inviteTourStart: 'Mutasd meg lépésről lépésre',
  inviteAcceptedLead: 'Elfogadtad a meghívást.',
  // FELTÉTELES MONDAT (R112): a más fiókkal belépett néző és az ismeretlen hivatkozás a szerver szerint
  // megkülönböztethetetlen (KUKA-084) — a lap nem állíthatja, melyik eset áll fenn.
  inviteOtherPersonLead: 'Ha a meghívás másik címre szól, jelentkezz ki, és lépj be azzal a címmel, amelyre a meghívás érkezett.',
  // A „KÖVETKEZŐ LÉPÉS" SOR — állapotonként, a nyelvcsomagból (R112 · `inviteText.mjs`).
  inviteNextAccept: 'Ha csatlakoznál, nyomd meg a „Meghívás elfogadása” gombot. Ha nem, nem kell tenned semmit — a meghívás magától lejár.',
  inviteNextRegister: 'A regisztráció után erősítsd meg a címedet a levélben kapott hivatkozással, majd lépj be — a meghívás ide tér vissza.',
  inviteNextLogin: 'Belépés után ez a képernyő újra megnyílik, és elfogadhatod a meghívást.',
  inviteNextUsed: 'Ha te fogadtad el, a fiókot belépés után a fejléc fiókválasztójában találod. Ha nem, kérj új meghívást attól, aki küldte.',
  inviteNextNewInvite: 'Az új meghívás új levélben, új hivatkozással érkezik — ezt a hivatkozást már nem kell megőrizned.',
  inviteRoleLine: 'Szerepkör',
  inviteInvitedByLine: 'Meghívta',
  inviteAddressLine: 'A meghívott cím',
  signedInAs: 'Belépve',
  inviteAcceptButton: 'Meghívás elfogadása',
  inviteContinueLogin: 'Belépés és folytatás',
  inviteHaveAccount: 'Már van fiókom',
  inviteAsExistingLead: 'A meghívás a te címedre szól: elfogadhatod.',
  inviteAsNewLead: 'Ehhez a címhez még nincs belépés: regisztrálj vele, és a meghívás folytatódik.',
  inviteLoginFirstLead: 'Ehhez a címhez már tartozik belépés: lépj be vele, és a meghívás folytatódik.',
  inviteNeedsIdentityLead: 'A folytatáshoz lépj be azzal az e-mail-címmel, amelyre a meghívás érkezett, és erősítsd meg a címet.',
  inviteUnknownLead: 'Ehhez a hivatkozáshoz most nem tartozik beváltható meghívás. Kérj új meghívást attól, aki meghívott.',
  inviteWrongAddress: 'Ha van belépésed a meghívott címhez, lépj be vele; ha nincs, regisztrálj ezzel a címmel.',
  inviteJoinedScopeNote: 'Az adatok megtekintését a fiókkezelő külön engedélyezi.',
  // új fiók
  newLead: 'Ugyanezzel a belépéssel kezelheted. A személyes fiókod megmarad.',
  newKindLegend: 'Milyen fiókot adsz hozzá?',
  businessName: 'Vállalkozás neve',
  sharedName: 'A fiók neve',
  jurisdiction: 'Nyilvántartás országa vagy területe',
  jurisdictionOther: 'Más ország vagy terület…',
  jurisdictionOtherRow: 'Ország vagy terület kódja',
  jurisdictionOtherNote: 'A megadott kódot változatlanul megőrizzük — nem olvasztjuk össze más országokéval.',
  taxIdHu: 'Adószám',
  taxIdOther: 'Adóazonosító',
  businessNote: 'A megadott cégadatokat most nem ellenőrizzük hatósági nyilvántartásban, és a megadásuk nem igazolja más vállalkozás képviseletét.',
  joinExisting: 'Csatlakozás egy meglévő céges fiókhoz',
  joinExistingLead: 'Meglévő céges fiókhoz meghívóval csatlakozhatsz: a fiókkezelő küld meghívót az e-mail-címedre. Az adóazonosító megadása önmagában nem ad hozzáférést más fiókjához.',
  wsNotCreated: 'A fiókot még nem hoztuk létre. Javítsd a megjelölt mezőt.',
  taxIdRequired: 'Add meg az adóazonosítót.',
  // országok — a felület nyelvén, de NEM üzleti döntés (LANG-01: a nyelv nem választ országot)
  countryHU: 'Magyarország',
  countryAT: 'Ausztria',
  countryDE: 'Németország',
  countrySK: 'Szlovákia',
  countryRO: 'Románia',
  // előfizetés
  planLead: 'A csomag a funkciók elérhetőségét szabja meg. Az adatok megtekintésének jogát nem a csomag adja.',
  planCurrent: 'Jelenlegi csomag',
  planAvailableIfGranted: 'Elérhető, ha a fiókkezelő engedélyezte',
  planNotIncluded: 'Nincs a csomagban',
  planField: 'Csomag',
  planSave: 'Csomag mentése',
  planNoPurchase: 'Ezen a próbafelületen nincs vásárlás és nincs díjfizetés.',
  // fiók adatai
  accountLead: 'A fiók törzsadatai.',
  fieldName: 'Név',
  fieldBusinessData: 'Vállalkozási adatok',
  businessGivenNoCheck: 'megadva, hatósági ellenőrzés nélkül',
  businessNotRecorded: 'Nincs rögzítve',
  accountRepresentationNote: 'A név vagy az adóazonosító megadása nem igazolja más vállalkozás képviseletét.',
  // profil és biztonság
  profileLead: 'Ezek az adatok a saját belépésedhez tartoznak, nem a fiókhoz.',
  emailState: 'E-mail-cím állapota',
  confirmed: 'Megerősítve',
  awaitingConfirm: 'Még nincs megerősítve',
  language: 'Nyelv',
  languageLead: 'A felület, a súgó és a segéd ezen a nyelven beszél. Az ország, az adózási rend és a pénznem nem ettől függ.',
  profileEditPending: 'A profil szerkesztése még nem érhető el, ezért nem kínálunk rá gombot.',
  securityLead: 'A belépéshez tartozó adatok és műveletek.',
  signedIn: 'Belépve',
  emailConfirmed: 'E-mail-cím megerősítve',
  yes: 'Igen',
  no: 'Nem',
  actingAs: 'Ki nevében jársz el',
  passwordChangePending: 'A jelszó megváltoztatása még nem érhető el, ezért nem kínálunk rá gombot.',
  // ügyleteim, kimenő
  personalLead: 'A saját ügyeid egy helyen.',
  personalEmptyTitle: 'Még nincs megjeleníthető ügyleted',
  personalEmptyLead: 'A vállalkozásaid ügyeit a fejléc fiókválasztójából éred el.',
  outboxLead: 'Ez mintanézet: itt jelennének meg a fiók kimenő levelei. Levélküldés jelenleg nincs; a rendszer levelei a Próbaüzenetek között látszanak.',
  outboxSampleTitle: 'Ez mintanézet',
  outboxSampleLead: 'A belépési és meghívólevelek a Próbaüzenetek panelen próbálhatók ki. Valódi levelet ez a próbafelület nem küld.',
  // nem mentett munka
  unsavedTitle: 'Vannak nem mentett módosításaid',
  unsavedLead: 'Ha most másik fiókra váltasz, a megkezdett kitöltés elveszik. A fiókok adatai nem keverednek: a beírt szöveget nem visszük át az új fiókba.',
  unsavedKeep: 'Szerkesztés folytatása',
  unsavedDiscard: 'Elvetés és váltás',
  // nézet-váltás értesítései
  otherPersonHere: 'Másik felhasználó lépett be ebben a böngészőben. Az oldal frissült.',
  personalStillUsable: 'A személyes fiókodat továbbra is használhatod.',
  openPersonal: 'Személyes fiók megnyitása',

  // ── R132 — MEGHÍVÓ VISSZAVONÁSA ÉS ÚJBÓLI BELÉPÉS ────────────────────────────────────────
  inviteRevokeAction: 'Meghívás visszavonása',
  inviteRevokeTitle: 'Meghívás visszavonása',
  inviteRevokeConfirm: 'Visszavonom a meghívást',
  inviteAccepted: 'Elfogadva',
  inviteRevokedBadge: 'Visszavonva',
  reinviteAction: 'Újra meghívás',
  reinviteTitle: 'Újbóli meghívás',
  reinviteConfirm: 'Elküldöm az új meghívást',
  reentrySection: 'Újbóli belépés',
});

/** A SEGÍTSÉGPANEL KERETE (SEG-01, R89 §4). A témák TARTALMA a `KB`/`FAQ`/`TOUR` csoportban áll. */
export const HELP = Object.freeze({
  open: 'Súgó',
  openAria: 'Súgó megnyitása',
  title: 'Súgó',
  fieldHelpAria: 'Súgó ehhez a mezőhöz',
  close: 'Súgó bezárása',
  tabAsk: 'Kérdezz',
  tabGuides: 'Leírások',
  tabFaq: 'Gyakori kérdések',
  tabSitemap: 'Oldaltérkép',
  searchGuides: 'Keresés a leírásokban',
  searchGuidesPlaceholder: 'Írd be, mit keresel…',
  searchNoHit: 'Erre nincs találat a leírásokban.',
  searchNoHitLead: 'Próbáld más szóval, vagy tedd fel kérdésként a Kérdezz fülön.',
  currentScreenFirst: 'Ehhez a képernyőhöz',
  otherTopics: 'További témák',
  whatFor: 'Mire való',
  prerequisites: 'Mi kell hozzá',
  result: 'Mi lesz az eredménye',
  outcomes: 'Mi történhet',
  outcomeSuccess: 'Sikeres',
  outcomeEmpty: 'Üres',
  outcomeMissing: 'Hiányzó adat',
  outcomeRefused: 'Elutasítva',
  outcomeError: 'Hiba',
  outcomeUncertain: 'Bizonytalan kimenet',
  openScreen: 'Képernyő megnyitása',
  startTour: 'Mutasd meg lépésről lépésre',
  statusWorking: 'Használható',
  statusDemo: 'Mintaadatos',
  statusPlanned: 'Tervezett',
  statusRetired: 'Kivezetett',
  statusDemoNote: 'Ez a lap mintaadatokat mutat; bizonylatot itt nem lehet kiállítani.',
  statusPlannedNote: 'Ez még nem készült el. A súgó azért írja le, hogy tudd, mire számíthatsz.',
  statusRetiredNote: 'Ezt kivezettük. Amit helyette használhatsz, azt a leírás megnevezi.',
  replacedBy: 'Ehelyett ezt használd',
  sourceVersion: 'Forrásváltozat',
  translationChecked: 'A fordítás ellenőrzött',
  translationStale: 'A fordítás a leírás korábbi változatához készült.',
  translationMissing: 'Ehhez a nyelvhez még nincs fordítás — magyarul olvasható.',
  sitemapLead: 'Ezek a menüpontok érhetők el a jelenlegi fiókodban a szerepköröddel. A listát a rendszer a jogosultságaid alapján állította össze.',
  sitemapNotAvailable: 'Ez most nem érhető el neked',
  sitemapWhyRole: 'Fiókkezelői jogosultsághoz kötött.',
  sitemapWhyPersonal: 'A személyes fiókban nem szerepel.',
  sitemapWhyPlan: 'A jelenlegi csomag nem tartalmazza.',
  noTopics: 'Ehhez a képernyőhöz még nincs ellenőrzött leírás.',
  guidesFor: 'Leírások',
  faqLead: 'A leggyakoribb kérdések. MI-szolgáltató nélkül is működik.',
  faqSearchPlaceholder: 'Keresés a kérdések között…',
  backToList: 'Vissza a listához',
});

/** A KATTINTHATÓ BEMUTATÓ KERETE (TUR-01, R89 §4). A lépések szövege a `TOUR` csoportban áll. */
export const TOURUI = Object.freeze({
  title: 'Lépésenkénti útmutató',
  next: 'Tovább',
  back: 'Vissza',
  finish: 'Befejezés',
  exit: 'Útmutató bezárása',
  restart: 'Újraindítás',
  stepList: 'Az útmutató lépései',
  simulationNote: 'Az útmutató nem ment, nem hív meg senkit és nem töröl semmit. Ezeket te végzed el a rendes felületen.',
  targetMissing: 'Ez a lépés most nem folytatható: az útmutatóban megnevezett elem nem látható ezen a képernyőn.',
  targetMissingNext: 'Az útmutatót bezárhatod vagy újraindíthatod. A leírás a Súgó → Leírások fülön továbbra is elolvasható.',
  // FELTÁRÁSRA VÁRÁS: a cél még nem jelent meg (panel · választás), a felhasználó nyitja meg.
  targetPending: 'Ez a lépés még nem érhető el: előbb nyisd meg a kiemelt gombbal. Az útmutató nem nyomja meg helyetted.',
  // ELVÉGZETT lépés, bezárt panel: a mondat nem állíthatja, hogy „még nem érhető el" (KUKA-050).
  targetPendingDone: 'Ezt a lépést elvégezted. A részletei a bezárt panelben vannak — a kiemelt gombbal újra megnyithatod, vagy lépj tovább.',
  actorPending: 'Ez a lépés a másik szereplő nézetében folytatódik: válts át a kiemelt gombbal. Az útmutató nem vált helyetted.',
  actorWrongRole: 'Átváltottál, de nem arra a szereplőre, akit ez a lépés kér. Válts a kiemelt gombbal arra, akinek a nézete most következik.',
  // A ZÁRÁS KÉT MONDATA: a „végére értél" CSAK akkor, ha semmi nem maradt ki (F91-01).
  endedTitle: 'Bezártad az útmutatót',
  endedLead: 'Nem minden lépés lett elvégezve — az alábbi összegzés megmondja, mi maradt ki. Az útmutatót bármikor újraindíthatod.',
  skipStep: 'Kihagyom ezt a lépést',
  notAvailable: 'Ez az útmutató most nem indítható: a képernyője ebben az állapotban nem érhető el. A leírás a Súgó → Leírások fülön továbbra is elolvasható.',
  rightLost: 'Közben megszűnt a jogosultságod ehhez a lépéshez, ezért az útmutató itt megáll.',
  contextChanged: 'Közben másik fiókra vagy felhasználóra váltottál, ezért az útmutató itt megáll. Újraindítható.',
  taskNotDone: 'Ez a lépés a művelet tényleges elvégzéséhez kötött; a gomb megnyomása önmagában még nem siker. Végezd el a műveletet, vagy hagyd ki a lépést a „Kihagyom ezt a lépést” gombbal.',
  skipped: 'Kihagyva',
  done: 'Elvégezve',
  pending: 'Hátravan',
  progressNote: 'Az útmutató haladását csak ehhez a felhasználóhoz és fiókhoz tartjuk nyilván.',
  // A LEZÁRÁS, AMI TÚLÉLTE A FIÓKVÁLTÁST (F93-01): a létrehozás bemutatója a SAJÁT sikerétől
  // veszítette el az elszámolását — a lap átváltott az új cégre, és a buborék mögül eltűnt az
  // állapot. A lezárás most a BIZONYÍTOTT eredményről szól, és kimondja, hol történt.
  carriedLead: 'Ezt az útmutatót a vállalkozás létrehozásával fejezted be. Az összegzés az előző fiókban megtett lépésekről szól — az új fiókod már meg is nyílt.',
  // A MEGHÍVÁS ELFOGADÁSA IS FIÓKOT VÁLT (F111-01): a lezárás itt is túléli a váltást, de MÁS a mondata —
  // nem vállalkozást hoztál létre, hanem csatlakoztál egy meglévő fiókhoz.
  carriedLeadInvite: 'Az útmutatót a meghívás elfogadása zárta le. Az összegzés a meghívó képernyőjén megtett lépésekről szól — a fiók, amelyhez csatlakoztál, már meg is nyílt.',
  // A MŰVELET ZÁRTA LE, NEM A FELHASZNÁLÓ LÉPETT KI: a félbehagyott, de hordozott futás címe.
  carriedEndedTitle: 'Az útmutató véget ért',
  // A MEGHÍVÓ BEMUTATÓJA a belépés felé elhagyva (F111-01, a regisztráción át érkező út).
  inviteSignInFirst: 'A meghívást belépés után tudod elfogadni, ezért az útmutató itt megáll. A meghívás megmarad: belépés után ez a képernyő újra megnyílik (vagy nyisd meg újra a levélben kapott hivatkozást), és az útmutatót onnan újraindíthatod.',
  finishedTitle: 'Az útmutató végére értél',
  finishedLead: 'A leírás a Súgó → Leírások fülön bármikor újra elolvasható.',
});

/**
 * A KATTINTHATÓ PRÓBALAP KERETE (R114/9). A `docs:r89-bemutato` által írt önálló HTML minden
 * felirata INNEN jön — korábban a generátorban és a lejátszóban beégetve állt, magyarul, tehát a
 * lap angolul és németül is magyar kezelőt adott, és a szavai elcsúszhattak a terméktől (KUKA-210).
 * Egy fogalom = egy szó: ami a felületen „próbafelület", az itt sem lehet más.
 */
export const STORYUI = Object.freeze({
  modeStories: 'Használati utak',
  modeHelp: 'Súgó és képernyők',
  // A SZIMULÁCIÓ JELÖLÉSE VÉGIG LÁTHATÓ MARAD (R114/8) — ez a mondat a lap tetején áll.
  simulationBanner: 'Itt mintaadatokkal próbálhatod ki a lépéseket. Nem küldünk meghívót, és nem módosítunk valódi adatokat.',
  startTitle: 'Mit szeretnél kipróbálni?',
  startLead: 'Válassz egy utat. Minden lépésnél te kattintasz, és a lap megmutatja, mit látnál utána a képernyőn.',
  start: 'Indítás',
  back: 'Vissza a választáshoz',
  restart: 'Újrakezdés',
  clickHint: 'Kattints a kiemelt gombra:',
  resultHint: 'Az eredmény — így néz ki a képernyő a művelet után:',
  finishedTitle: 'Végigmentél ezen az úton',
  finishedLead: 'Minden lépésnél te kattintottál, és a lap megmutatta az eredményt.',
  helpForPath: 'Súgó és gyakori kérdések ehhez az úthoz',
  helpTours: 'Lépésenkénti útmutatók',
  // A FEJLESZTŐI RÉSZLET LENYITHATÓ (R114/8): forrással és dátummal, de nem az előtérben.
  checkDetails: 'Ellenőrzési részletek',
  checkDetailsLead: 'Mit mutat és mit nem mutat ez a lap',
  evidenceLead: 'A mért eredmény a valódi alkalmazásban futó böngésző-próbákból származik: valódi kiszolgáló, valódi böngésző, valódi adatbázis-sor. A fenti képernyők ezzel szemben mintaadatos utánzatok.',
  measuredAt: 'Mérve',
  source: 'Forrás',
  notMeasured: 'nem mért',
  evidenceNotMeasured: 'a próbák eredménye nincs mérve',
  viewAs: 'Nézet',
  viewAnon: 'Belépés előtt',
  probeLang: 'próbanyelv',
  noModelCall: 'modellhívás nélkül',
  panelSimNote: 'Ez a panel nem kér szervert és nem hív modellt.',
  techCoverage: 'Nyelvi lefedettség (mért)',
  // F118-02 — A MONDAT NEM ÁLLÍTHAT TÖBBET A BIZONYÍTÉKNÁL. A korábbi alak azt mondta, hogy a
  // termék-nyelvek szövegét EMBER nézi át — a szövegeket MI írta és nézte át. A kulcs- és
  // helyőrző-egyezés a MEGLÉTET méri, nem a tartalmi fordítás-azonosságot (KUKA-216).
  techCoverageNote: 'A kulcsok és helyőrzők ellenőrzése nem nyelvi lektorálás. A szövegeket MI írta és nézte át; független anyanyelvi lektorálás nem történt. A próbanyelvek szándékosan hiányosak.',
  techNoServer: 'Ez a lap nem hív szervert és nem hív modellt.',
  techNoServerNote: 'A nézetet (fiókkezelő, tag, belépés előtt) itt egy legördülő állítja; a valódi rendszerben a kiszolgáló dönti el.',
  techNotProven: 'Amit ez a lap nem bizonyít: a kiszolgáló jogosultsági döntését, az élő MI-választ és a valódi alkalmazás útjait.',
  // F118-02 — a korábbi alak az ÉLŐ MI-válaszra is kész bizonyítékot sugallt, holott az nyitott.
  techNotProvenNote: 'A vizsgált alkalmazásutak és jogosultsági esetek böngészős eredményei a Használati utak végén olvashatók, dátummal és forrással. Élő MI-szolgáltatói mérés még nem készült.',
  techEnabledLang: 'bekapcsolt termék-nyelv',
  techProbeLang: 'próbanyelv, nem kínált',
});

/** A CHATES SEGÉD (AST-01, R89 §6). */
export const CHAT = Object.freeze({
  title: 'Kérdezz',
  intro: 'Miben segítsek?',
  introLead: 'Az ellenőrzött leírásokból válaszolok, és megmutatom, honnan.',
  placeholder: 'Írd le a kérdésedet…',
  send: 'Kérdés elküldése',
  sending: 'Válasz készül…',
  newConversation: 'Új beszélgetés',
  clearLocal: 'Beszélgetés törlése',
  cleared: 'A beszélgetést töröltük ebből a böngészőből.',
  suggested: 'Javasolt kérdések',
  q1: 'Hogyan hívhatok meg valakit?',
  q2: 'Miért nem látom a készletadatokat?',
  q3: 'Hogyan adok hozzá egy vállalkozást?',
  source: 'Felhasznált leírás',
  // A KÉT LISTA KÜLÖN SZAVA (F91-04): ami ALÁTÁMASZTJA a választ, és ami csak KAPCSOLÓDIK.
  related: 'Kapcsolódó leírások',
  // A KIESETT MODELL-VÁLASZ: a felhasználó azt látja, hogy helyi választ kapott, és MIÉRT.
  modelDiscarded: 'Az MI-szolgáltató válaszát nem fogadtuk el, ezért a helyi leírás-keresés válaszát látod.',
  modelDiscardedWhy: Object.freeze({
    model_no_source: 'A válasz nem jelölte meg, melyik leírásra épül.',
    model_unknown_source: 'A válasz olyan leírásra hivatkozott, amit nem adtunk át neki.',
    model_stale_source: 'A válasz a leírás másik, nem az átadott változatára hivatkozott.',
    model_wrong_language: 'A válasz nem a kért nyelven készült.',
    model_too_long: 'A válasz hosszabb volt a megengedettnél.',
    // AST-05 (F93-03): a válasz ellenőrzött tudás-blokkokból épül — a modell VÁLOGAT, nem fogalmaz.
    model_no_blocks: 'A válasz nem jelölte meg, melyik ellenőrzött leírás-szakaszra épül.',
    model_unknown_block: 'A válasz olyan leírás-szakaszra hivatkozott, ami nem adható ki.',
    model_empty_block: 'A megjelölt leírás-szakasz ezen a nyelven üres.',
    model_too_many_blocks: 'A válasz a megengedettnél több leírás-szakaszt jelölt meg.',
    model_prose_unverified: 'A válasz saját szöveget fogalmazott a forrás mondatai helyett — ezt nem adjuk ki ellenőrzött válaszként.',
  }),
  // AZ ELŐZMÉNY VÉGES, ÉS EZT A LAP KIMONDJA (F91-03).
  historyNote: 'A beszélgetésből a legutóbbi {n} kérdést tartjuk meg — a régebbiek kiesnek.',
  singleTurnNote: 'MI-szolgáltatói kapcsolat nélkül minden kérdésre önállóan válaszolunk: a helyi keresés nem használja az előző kérdéseket.',
  nextSteps: 'Következő lépés',
  openAction: 'Megnyitás',
  prepareAction: 'Előkészítés',
  prepareNote: 'Az űrlapot előkészítem, de a mentést te végzed el.',
  answerFromGuides: 'Ez a válasz a leírásokból származik.',
  noAnswer: 'Ehhez még nincs ellenőrzött leírás.',
  noAnswerLead: 'Nézd meg a Gyakori kérdéseket, vagy keress a leírásokban.',
  offline: 'A segéd most nem elérhető. A leírásokban továbbra is kereshetsz.',
  notConfigured: 'A segéd ebben a környezetben nincs beállítva.',
  notConfiguredLead: 'A helyi keresés, a gyakori kérdések, az oldaltérkép és a lépésenkénti útmutató modellhívás nélkül működik.',
  localOnly: 'Helyi keresés',
  localOnlyNote: 'Ez helyi keresés a leírásokban, nem az MI-szolgáltató válasza.',
  noSecrets: 'Jelszót és megerősítő kódot ne írj ide.',
  tooLong: 'Ez a kérdés túl hosszú.',
  measuredTitle: 'Mérés',
  measuredCalls: 'Modellhívás',
  measuredTokens: 'Token',
  measuredLatency: 'Késleltetés',
  measuredCost: 'Költség',
  measuredUnknown: 'nincs adat',
  instructionIgnored: 'A kérdésben utasításnak látszó rész volt. Azt adatként kezelem, nem hajtom végre.',
  // AST-07 (R142 §6): a válasz két darabja SOHA nincs összemosva — ami ellenőrzött forrásszöveg,
  // és ami a segéd következtetése. A feliratot a nyelvcsomag adja, nem a kód (SZO-01 · KUKA-210).
  groundedFacts: 'Ellenőrzött forrásszöveg',
  modelInference: 'A segéd következtetése — ezt nem forrás támasztja alá',
});

/**
 * A FUNKCIÓK SZÖVEGE (KB) — funkciónként négy mondat és a kimenetek (R89 §3 táblája).
 *
 * A KULCS a `v3app/knowledge/features.mjs` funkció-azonosítója. Ami itt hiányzik, azt a mérés
 * (`verify:i18n` · `verify:tutor`) KIMONDJA — nem esik ki némán.
 */
export const KB = Object.freeze({
  'auth.register': Object.freeze({
    title: 'Fiók létrehozása',
    purpose: 'Belépést készítesz magadnak: egy e-mail-cím és egy jelszó. Ugyanezzel a belépéssel később a vállalkozásaidat is kezelheted.',
    prereq: 'Egy e-mail-cím, amit el tudsz olvasni, és egy legalább 8 karakteres jelszó.',
    result: 'Megerősítő levél készül, amelyet a Próbaüzenetek között nyithatsz meg. A benne lévő hivatkozással megerősíted a címedet, és ekkor jön létre a személyes fiókod.',
    outcomes: Object.freeze({
      success: 'A megerősítő levél elkészült; a Próbaüzenetek között nyithatod meg.',
      refused: 'A megadott adatok alakja nem megfelelő — a képernyő megmondja, melyik mező.',
      uncertain: 'Nem tudjuk biztosan, hogy a kérés teljesült: nézd meg a Próbaüzeneteket, és csak akkor kérj újat, ha ott nem jelent meg.',
      error: 'Nem jutott el a kérés. Semmi nem változott, újra próbálhatod.',
    }),
  }),
  'auth.verify': Object.freeze({
    title: 'E-mail-cím megerősítése',
    purpose: 'A levélben lévő hivatkozás bizonyítja, hogy a cím a tiéd. Enélkül a fiók nem használható.',
    prereq: 'A legutóbbi megerősítő levél. A próbafelületen ezt a Próbaüzenetek panel mutatja.',
    result: 'A cím megerősítve, és megszületik a személyes fiókod.',
    outcomes: Object.freeze({
      success: 'A cím megerősítve — be tudsz lépni.',
      refused: 'A hivatkozás lejárt, már felhasználták, vagy újabb levél váltotta le. Kérj új levelet.',
      error: 'A hivatkozás nem használható. Kérj új megerősítő levelet.',
    }),
  }),
  'auth.login': Object.freeze({
    title: 'Belépés',
    purpose: 'Belépsz a saját fiókodba. Egy belépés, akárhány fiók.',
    prereq: 'Megerősített e-mail-cím és a jelszavad.',
    result: 'A fejlécben megjelenik a neved és a megnyitott fiók.',
    outcomes: Object.freeze({
      success: 'Beléptél. Ha meghívás várt rád, visszakerülsz a meghívás képernyőjére, és ott elfogadhatod.',
      refused: 'Az e-mail-cím vagy a jelszó nem megfelelő. Azt nem mondjuk meg, melyik — ez a fiókok védelme.',
      uncertain: 'Nem tudjuk biztosan, hogy a belépés megtörtént. Frissítsd az oldalt.',
    }),
  }),
  'auth.resend': Object.freeze({
    title: 'Új megerősítő levél kérése',
    purpose: 'Ha a megerősítő levél nem érkezett meg vagy lejárt, újat kérhetsz.',
    prereq: 'A regisztrációnál használt e-mail-cím.',
    result: 'Ha a címhez megerősítésre váró belépés tartozik, új megerősítő levél jelenik meg a Próbaüzenetek között. A legutóbbi levél hivatkozása érvényes.',
    outcomes: Object.freeze({
      success: 'Kész: az új megerősítő levelet a Próbaüzenetek között találod.',
      refused: 'Túl gyakran kértél levelet, vagy a cím már meg van erősítve.',
      uncertain: 'Nem tudjuk biztosan, elkészült-e az új levél. Nézd meg a Próbaüzeneteket, és csak akkor kérj újat, ha ott nem jelent meg.',
      error: 'A kérés nem jutott el. A beírt cím a mezőben marad.',
    }),
  }),
  'auth.logout': Object.freeze({
    title: 'Kijelentkezés',
    purpose: 'Lezárja a belépésedet ebben a böngészőben.',
    prereq: 'Be vagy lépve.',
    result: 'A belépési oldalra kerülsz, és a képernyőkről eltűnik minden fiók-adat.',
    outcomes: Object.freeze({ success: 'Kijelentkeztél. A megkezdett kitöltéseket nem tartjuk meg.' }),
  }),
  'account.personal': Object.freeze({
    title: 'Személyes fiók',
    purpose: 'A saját ügyeid helye. Magától megszületik, amint megerősítetted az e-mail-címedet.',
    prereq: 'Megerősített e-mail-cím.',
    result: 'A fiókválasztóban a személyes fiókod és a vállalkozásaid egy listán állnak.',
    outcomes: Object.freeze({
      success: 'A személyes fiókod nyitva van.',
      empty: 'Még nincs benne ügylet — ez nem hiba, csak üres.',
    }),
  }),
  'account.add_business': Object.freeze({
    title: 'Vállalkozás vagy közös fiók hozzáadása',
    purpose: 'Új munkahelyet nyitsz ugyanezzel a belépéssel. Két fajta van: vállalkozás (adóazonosítóval) és közös fiók (adóazonosító nélkül).',
    prereq: 'Megerősített e-mail-cím és a fiók neve. Vállalkozásnál a nyilvántartás országa vagy területe, és az ott használt adóazonosító: az elvárt alakot a kiválasztott ország adja meg. Az azonosító alakját és egyediségét ellenőrizzük — hatósági nyilvántartásban nem nézzük meg, és a megadása nem igazolja a vállalkozás képviseletét.',
    result: 'A fiók létrejön, te lesz a fiókkezelője, és a fiókválasztóban megjelenik.',
    outcomes: Object.freeze({
      success: 'A fiók létrejött, és megnyitottuk.',
      missing: 'Egy kötelező mező hiányzik — a képernyő a mezőnél mondja meg, mit kell javítani.',
      refused: 'Ehhez az adóazonosítóhoz már tartozik fiók, vagy a megadott érték alakja nem megfelelő. Létrehozás nem történt.',
      uncertain: 'Nem tudjuk biztosan, létrejött-e. Nézd meg a fiókválasztót, mielőtt újra próbálod.',
      error: 'A kérés nem jutott el. A kitöltés megmarad ezen a lapon.',
    }),
  }),
  'account.switch': Object.freeze({
    title: 'Fiókváltás',
    purpose: 'Átváltasz egy másik fiókra a fejléc fiókválasztójából. A fiókok adatai nem keverednek.',
    prereq: 'Legyen tagságod abban a fiókban.',
    result: 'A fejléc, a menü és a lapok az új fiókra állnak, a régi fiók adata azonnal lekerül a képernyőről. A fejléc megmondja, melyik fiókban vagy és milyen szerepkörrel.',
    outcomes: Object.freeze({
      success: 'A másik fiók nyitva van.',
      refused: 'Ehhez a fiókhoz nincs (vagy már nincs) hozzáférésed.',
      uncertain: 'Nem tudjuk biztosan, megtörtént-e a váltás. A fejléc megmutatja, melyik fiók van nyitva.',
    }),
  }),
  'invite.send': Object.freeze({
    title: 'Felhasználó meghívása',
    purpose: 'Meghívót készítesz egy e-mail-címre, hogy valaki csatlakozhasson ehhez a fiókhoz.',
    prereq: 'Fiókkezelői jogosultság ebben a fiókban, és a meghívott e-mail-címe.',
    result: 'A meghívó elkészül és lejárati ideje van. A hivatkozás a levélben megy — a listában nem jelenítjük meg.',
    outcomes: Object.freeze({
      success: 'A meghívó elkészült. A Próbaüzenetek között megnyithatod.',
      refused: 'Nincs hozzá jogosultságod, vagy olyan szerepkört/adatkört adnál, amit nem adhatsz tovább.',
      uncertain: 'Nem tudjuk biztosan, elkészült-e. Nézd meg a Várakozó meghívások fülön.',
      error: 'A kérés nem jutott el. Meghívó nem készült.',
    }),
  }),
  'invite.accept': Object.freeze({
    title: 'Meghívás elfogadása',
    purpose: 'A neked szóló meghívással csatlakozol egy vállalkozási vagy közös fiókhoz. A személyes belépés és a csatlakozás két külön lépés: a meghívás nem hoz létre új személyes fiókot, és nem ad tulajdonosi jogot.',
    prereq: 'Azzal a címmel vagy belépve, amelyre a meghívás szól, és a cím meg van erősítve.',
    result: 'Tagság születik, és megnyílik a fiók. Az adatok megtekintését a fiókkezelő ezután külön engedélyezi.',
    outcomes: Object.freeze({
      success: 'Csatlakoztál. A menüben megjelennek a fiók képernyői.',
      refused: 'A meghívó lejárt, felhasználták, más címre szól, vagy időközben megváltoztak a feltételei. A képernyőről visszalépsz a fiókodba vagy a kezdőlapra, és ki is tudsz lépni, hogy más fiókkal jelentkezz be.',
      uncertain: 'Nem tudjuk biztosan, megtörtént-e a csatlakozás. Nézd meg a fiókválasztót.',
      error: 'Ehhez a hivatkozáshoz most nem tartozik beváltható meghívás.',
    }),
  }),
  'members.list': Object.freeze({
    title: 'Felhasználók és hozzáférések',
    purpose: 'Megmutatja, ki tagja a fióknak, és ki melyik adatkört tekintheti meg. A tagság és a megtekintési engedély két külön állapot.',
    prereq: 'Fiókkezelői jogosultság.',
    result: 'Két fül: a fiók tagjai és a várakozó meghívások.',
    outcomes: Object.freeze({
      success: 'A lista betöltve.',
      empty: 'Még nem hívtál meg másokat.',
      refused: 'Ehhez a beállításhoz nincs hozzáférésed — a fiókkezelő tud segíteni.',
      error: 'Nem sikerült betölteni a listát. Semmi nem változott.',
    }),
  }),
  'members.grant': Object.freeze({
    title: 'Adatkör megtekintésének engedélyezése',
    purpose: 'Engedélyt adsz egy tagnak, hogy megnézhesse a készletadatokat vagy az árakat.',
    prereq: 'Fiókkezelői jogosultság, és a tag hozzáférése legyen aktív.',
    result: 'Az engedély ehhez a fiókhoz tartozik, más fiókra nem terjed ki.',
    outcomes: Object.freeze({
      success: 'Az engedély megadva.',
      refused: 'Ezt az adatkört nem adhatod tovább, vagy nincs hozzá hatásköröd.',
      uncertain: 'Nem tudjuk biztosan, mentve lett-e. A lista megmutatja a mai állapotot.',
    }),
  }),
  'invite.revoke': Object.freeze({
    title: 'Egy kiadott meghívás visszavonása',
    purpose: 'Érvénytelenítesz egy még el nem fogadott meghívást, hogy a kiküldött hivatkozással már ne lehessen belépni.',
    prereq: 'Fiókkezelői jogosultság, és a meghívás legyen még elfogadásra váró.',
    result: 'A régi hivatkozás nem használható többé. Senki tagsága nem szűnik meg, és más hozzáférés nem változik. Ha a meghívást már elfogadták, a visszavonás nem von el tagságot — azt külön művelet szünteti meg.',
    outcomes: Object.freeze({
      success: 'A meghívást visszavontuk.',
      refused: 'Nincs hatásköröd ehhez, vagy ez a meghívás már nem vonható vissza.',
      uncertain: 'Nem tudjuk biztosan, rögzült-e. A lista megmutatja a mai állapotot.',
    }),
  }),
  'members.reinvite': Object.freeze({
    title: 'Eltávolított munkatárs újbóli meghívása',
    purpose: 'Új meghívást adsz ki egy olyan embernek, akinek korábban megszüntették a hozzáférését ebben a fiókban.',
    prereq: 'Fiókkezelői jogosultság, és a munkatársnak legyen lezárt, korábbi tagsága ebben a fiókban.',
    result: 'Új meghívás keletkezik. A tagság csak akkor jön létre, ha az érintett maga elfogadja. A korábbi adat-hozzáférései nem állnak vissza: azokat a belépése után külön, újra meg kell adni. A régi tagsága és a róla szóló előzmények megmaradnak.',
    outcomes: Object.freeze({
      success: 'Az újbóli meghívást elküldtük.',
      refused: 'Nincs hatásköröd ehhez, vagy ez a munkatárs most nem hívható vissza.',
      uncertain: 'Nem tudjuk biztosan, kiment-e. A várakozó meghívások listája megmutatja a mai állapotot.',
    }),
  }),
  'members.scopeRevoke': Object.freeze({
    title: 'Egy hozzáférés visszavonása',
    purpose: 'Elveszed egy tagtól az egyik hozzáférést úgy, hogy a tagsága és a többi hozzáférése megmarad.',
    prereq: 'Fiókkezelői jogosultság, és a tag hozzáférése legyen aktív.',
    result: 'Csak az a hozzáférés szűnik meg. A tag ettől még tagja marad a fióknak, és a többi adatot változatlanul látja.',
    outcomes: Object.freeze({
      success: 'A hozzáférést visszavontuk.',
      refused: 'Nincs hatásköröd ehhez, vagy a tag már nem aktív.',
      uncertain: 'Nem tudjuk biztosan, mentve lett-e. A lista megmutatja a mai állapotot.',
    }),
  }),
  'data.documentSample': Object.freeze({
    title: 'Bizonylat-minta megnyitása',
    purpose: 'Megnézed a jelölt bizonylat-mintát: a fejlécet, és külön a vegyes mintát, amelyben összeg és beszállító is szerepel.',
    prereq: 'Az üzleti dokumentumok hozzáférés; a vegyes mintához az árak és a beszállítói adatok is kellenek.',
    result: 'A fejléc önmagában nem tartalmaz összeget és beszállítót. A vegyes minta egyetlen hiányzó hozzáférés esetén is egészben zárva marad.',
    outcomes: Object.freeze({
      success: 'A minta megjelent.',
      missing: 'Ehhez a nézethez még nincs adat.',
      missing: 'Ehhez a nézethez még nincs adat.',
      refused: 'Hiányzik legalább egy hozzáférés; a képernyő megnevezi, melyik.',
      error: 'A mintát nem sikerült betölteni.',
    }),
  }),
  'data.supplierSample': Object.freeze({
    title: 'Beszállítói minta megnyitása',
    purpose: 'Megnézed a jelölt beszállítói mintát: az azonosítót, a nevet és a kapcsolati adatot.',
    prereq: 'A beszállítói adatok hozzáférés.',
    result: 'Ez a hozzáférés önmagában nem ad árat és nem ad bizonylatot.',
    outcomes: Object.freeze({
      success: 'A minta megjelent.',
      missing: 'Ehhez a nézethez még nincs adat.',
      missing: 'Ehhez a nézethez még nincs adat.',
      refused: 'Nincs beszállítói hozzáférésed; a képernyő megnevezi.',
      error: 'A mintát nem sikerült betölteni.',
    }),
  }),
  'members.revoke': Object.freeze({
    title: 'Hozzáférés megszüntetése',
    purpose: 'Megszünteted valakinek a tagságát ebben a fiókban. Ez a teljes tagságot megszünteti, nem csak egy adatkört.',
    prereq: 'Fiókkezelői jogosultság, és megerősítés a képernyőn.',
    result: 'Az illető tagsága megszűnik ebben a fiókban, ezért nem nyithatja meg a fiók adatait: a következő kattintásánál a képernyője kimondja, hogy a hozzáférése megszűnt. A személyes fiókja és a korábbi műveletek története megmarad.',
    outcomes: Object.freeze({
      success: 'A hozzáférés megszűnt.',
      refused: 'Nincs hozzá hatásköröd.',
      uncertain: 'Nem tudjuk biztosan, megtörtént-e. A lista megmutatja a mai állapotot.',
    }),
  }),
  'plan.change': Object.freeze({
    title: 'Előfizetés (csomag)',
    purpose: 'A csomag a funkciók elérhetőségét szabja meg. Az adatok megtekintésének jogát nem a csomag adja, hanem a fiókkezelő engedélye.',
    prereq: 'Fiókkezelői jogosultság.',
    result: 'A csomag mentve. Ezen a próbafelületen nincs vásárlás és nincs díjfizetés.',
    outcomes: Object.freeze({
      success: 'A csomag mentve.',
      refused: 'Nincs hozzá jogosultságod, vagy a választott érték nem létezik.',
      uncertain: 'Nem tudjuk biztosan, mentve lett-e. A lap megmutatja a jelenlegi csomagot.',
    }),
  }),
  'data.stock': Object.freeze({
    title: 'Készletegyenleg',
    purpose: 'Megmutatja a mennyiségeket raktáranként. Az ismeretlen mennyiség nem nulla, és nem is jelenti, hogy a tétel nem létezik.',
    prereq: 'Tagság a fiókban, és a fiókkezelő engedélye a készletadatokra.',
    result: 'A lista. Ugyanez az engedély dönt a Termékkartonról és a Készletmozgásokról is.',
    outcomes: Object.freeze({
      success: 'A készletadatok betöltve.',
      empty: 'Ehhez a fiókhoz nem tartozik mintaadat. Az elrendezés így is megnézhető.',
      missing: 'Ahol a mennyiség nem ismert, ott ezt írjuk ki — nem nullát. A „Nem ismert” azt jelenti, hogy senki nem mérte meg; a „Nincs megadva” azt, hogy senki nem írta be.',
      refused: 'Ehhez az adathoz még nincs hozzáférésed. A fiókkezelő tudja engedélyezni.',
      error: 'A készletadatokat nem sikerült betölteni. Semmi nem változott a fiókban.',
    }),
  }),
  'data.price': Object.freeze({
    title: 'Árak',
    purpose: 'Az egységárak megtekintése két feltételhez kötött: a csomagnak tartalmaznia kell, és a fiókkezelőnek engedélyeznie kell.',
    prereq: 'Bővített csomag és engedély az árak adatkörre.',
    result: 'Az ár megjelenik. A hiányzó ár nem 0.',
    outcomes: Object.freeze({
      success: 'Az ár betöltve.',
      missing: 'Ahol nincs megadva ár, ott ezt írjuk ki — nem nullát.',
      refused: 'Vagy a csomag nem tartalmazza, vagy nincs rá engedélyed. A képernyő megmondja, melyik.',
      error: 'Nem sikerült betölteni. Semmi nem változott.',
    }),
  }),
  'shell.navigation': Object.freeze({
    title: 'Az alkalmazás kerete',
    purpose: 'Felül a fiókválasztó és a saját profil, balra a menü, középen az éppen végzett feladat. A lapok (fülek) között váltogathatsz.',
    prereq: 'Be vagy lépve, és van megnyitott fiók.',
    result: 'A menüpont neve és az oldal címe mindig ugyanaz, így a menüből ugyanazt a szót keresed, amit az oldal tetején látsz.',
    outcomes: Object.freeze({
      success: 'A keret betöltve.',
      empty: 'Nincs megnyitott fiók — a fiókválasztóban találod a fiókjaidat.',
    }),
  }),
  'shell.profile': Object.freeze({
    title: 'Saját profil és belépés',
    purpose: 'A belépésedhez tartozó adatok: e-mail-cím, annak állapota, és hogy ki nevében jársz el. Ezek nem a fiókhoz tartoznak.',
    prereq: 'Be vagy lépve.',
    result: 'Az adatok megtekinthetők. A profil szerkesztése még nem érhető el.',
    outcomes: Object.freeze({ success: 'Az adatok betöltve.' }),
  }),
  'shell.language': Object.freeze({
    title: 'A felület nyelve',
    purpose: 'Kiválaszthatod, milyen nyelven beszél a felület, a súgó, a gyakori kérdések és a segéd.',
    prereq: 'Nincs előfeltétel.',
    result: 'A választott nyelv azonnal érvényes. Az ország, az adózási rend, az időzóna és a pénznem nem ettől függ.',
    outcomes: Object.freeze({ success: 'A nyelv beállítva.' }),
  }),
  'shell.help': Object.freeze({
    title: 'Súgó',
    purpose: 'Négy nézet egy panelben: Kérdezz · Leírások · Gyakori kérdések · Oldaltérkép. A panelt te nyitod meg, magától nem ugrik fel.',
    prereq: 'Nincs előfeltétel. A súgó, a gyakori kérdések, az oldaltérkép és a lépésenkénti útmutató MI-szolgáltató nélkül működik.',
    result: 'Az adott képernyőhöz tartozó témák kerülnek előre, és a továbblépés valódi képernyőre visz.',
    outcomes: Object.freeze({
      success: 'A panel megnyílt.',
      empty: 'Ehhez a képernyőhöz még nincs ellenőrzött leírás.',
      refused: 'Ehhez a tudásanyaghoz ebben a fiókban nincs hozzáférésed.',
    }),
  }),
  'shell.assistant': Object.freeze({
    title: 'Chates segéd',
    purpose: 'Szabad szöveggel kérdezhetsz. Az ellenőrzött leírásokból válaszol, megmutatja a forrást, és legfeljebb néhány valódi következő lépést ajánl.',
    prereq: 'Be vagy lépve. Az élő MI-válaszhoz engedélyezett MI-szolgáltatói kapcsolat kell; enélkül a helyi keresés működik.',
    result: 'Rövid magyarázat, a felhasznált leírás hivatkozása, és — ha van — megnyitható vagy előkészíthető folytatás. A segéd semmit nem ment és nem módosít.',
    outcomes: Object.freeze({
      success: 'A válasz elkészült, a forrásával együtt.',
      empty: 'Ehhez még nincs ellenőrzött leírás.',
      refused: 'A kérdés nem erről a rendszerről szól, túl hosszú, vagy nincs hozzá jogosultságod.',
      error: 'Az MI-szolgáltató most nem válaszolt. A leírásokban továbbra is kereshetsz.',
      uncertain: 'Nem tudjuk biztosan, elkészült-e a válasz. Kérdezd meg újra.',
    }),
  }),
  'shell.demo_mail': Object.freeze({
    title: 'Próbaüzenetek',
    purpose: 'A próbafelület levél-fogadója: itt nyithatók meg a megerősítő és meghívó levelek. Valódi levelet a rendszer nem küld.',
    prereq: 'A fejlesztői felület be van kapcsolva ebben a környezetben.',
    result: 'A levelek listája, megnyitható hivatkozásokkal.',
    outcomes: Object.freeze({
      success: 'A levelek listája betöltve.',
      empty: 'Még nincs próbaüzenet.',
      refused: 'Ebben a környezetben a próbaüzenetek nem érhetők el.',
    }),
  }),
  'shell.sample_pages': Object.freeze({
    title: 'Mintaoldalak',
    purpose: 'Termékek, Partnerek, Raktárak, Folyamatok, Bizonylatok — a V2-ből ismert elrendezésben, mintaadattal. Üzleti végrehajtás nem tartozik hozzá.',
    prereq: 'Van megnyitott fiók. A mintaadatok a fiókhoz vannak rögzítve.',
    result: 'Kereshető, szűrhető lista, sorra kattintva részletező panellel.',
    outcomes: Object.freeze({
      success: 'A lista betöltve.',
      empty: 'Ehhez a fiókhoz nem tartozik mintaadat.',
    }),
  }),
  'profile.edit': Object.freeze({
    title: 'A profil szerkesztése',
    purpose: 'A saját adatok módosítása. Ez még nem készült el — ezért nincs is rá gomb a képernyőn.',
    prereq: '—',
    result: 'Nincs eredménye: a funkció nem létezik. A súgó azért írja le, hogy tudd, mire számíthatsz.',
    outcomes: Object.freeze({ missing: 'Ez a funkció még nem érhető el. Gombot sem kínálunk rá.' }),
  }),
  'security.password_change': Object.freeze({
    title: 'Jelszó megváltoztatása',
    purpose: 'A belépési jelszó módosítása. Ez még nem készült el — ezért nincs is rá gomb a képernyőn.',
    prereq: '—',
    result: 'Nincs eredménye: a funkció nem létezik.',
    outcomes: Object.freeze({ missing: 'Ez a funkció még nem érhető el. Gombot sem kínálunk rá.' }),
  }),
  'shell.numbered_probe': Object.freeze({
    title: 'A korábbi egyoldalas próbalap (kivezetve)',
    purpose: 'A korábbi, egyetlen hosszú lapon álló számozott próbafelület. Kivezetve: a közös alkalmazáskeret váltotta le.',
    prereq: '—',
    result: 'Nincs: ez a felület nem létezik többé.',
    outcomes: Object.freeze({}),
  }),
  // ── R164/3 — A PÓTOLT LEÍRÁSOK. Mind az öt képernyő MA IS dolgozik; a szöveg KIMONDJA, hogy olvasó
  // nézet, és azt is, mi az, ami ma NEM lehetséges (KUKA-050: a szöveg a valóságot követi).
  'data.warehouses': Object.freeze({
    title: 'Raktárak',
    purpose: 'Megmutatja a raktárakat, és raktáranként azt, hány tétel tartozik hozzájuk. Olvasó nézet: raktárat itt ma nem lehet felvenni, átnevezni vagy megszüntetni.',
    prereq: 'Megnyitott fiók. Külön adat-engedély nem kell hozzá: ez a lap a fiók mintaadatait mutatja.',
    result: 'A raktárak listája. A tételszám azt mondja meg, a fiók mintaadatából hány termék tartozik az adott raktárhoz.',
    outcomes: Object.freeze({
      success: 'A raktárak listája megjelent.',
      empty: 'Ehhez a fiókhoz nem tartozik mintaadat. Az elrendezés így is megnézhető.',
    }),
  }),
  'data.processes': Object.freeze({
    title: 'Folyamatok',
    purpose: 'Megmutatja a folyamatokat: azonosító, megnevezés, állapot és időpont. Állapot szerint szűrhetsz. Olvasó nézet: folyamatot itt ma nem lehet indítani, módosítani vagy lezárni.',
    prereq: 'Megnyitott fiók. Külön adat-engedély nem kell hozzá: ez a lap a fiók mintaadatait mutatja.',
    result: 'A folyamatok listája. A szűrő a megjelenített sorokat szűkíti — a fiókban semmi nem változik tőle.',
    outcomes: Object.freeze({
      success: 'A folyamatok listája megjelent.',
      empty: 'Ehhez a fiókhoz nem tartozik mintaadat. Az elrendezés így is megnézhető.',
    }),
  }),
  'data.stockcard': Object.freeze({
    title: 'Termékkarton',
    purpose: 'Egy termék adatait mutatja egy lapon: megnevezés, azonosító, jelleg, mennyiség és raktár. Ugyanaz az engedély dönt róla, mint a Készletegyenlegről.',
    prereq: 'Tagság a fiókban, és a fiókkezelő engedélye a készletadatokra.',
    result: 'A termék kartonja, és egy gomb, amely a Készletmozgásokra visz. Ahol a mennyiség nem ismert, ott ezt írjuk ki — nem nullát.',
    outcomes: Object.freeze({
      success: 'A termékkarton betöltve.',
      empty: 'Ehhez a fiókhoz nem tartozik mintaadat. Az elrendezés így is megnézhető.',
      missing: 'Ahol a mennyiség nem ismert, ott ezt írjuk ki — nem nullát. A „Nem ismert” azt jelenti, hogy senki nem mérte meg; a „Nincs megadva” azt, hogy senki nem írta be.',
      refused: 'Ehhez az adathoz még nincs hozzáférésed. A fiókkezelő tudja engedélyezni.',
      error: 'A készletadatokat nem sikerült betölteni. Semmi nem változott a fiókban.',
    }),
  }),
  'data.movements': Object.freeze({
    title: 'Készletmozgások',
    purpose: 'Megmutatja a mozgásokat időrendben: mikor, melyik termék, milyen művelet és mennyi. Ugyanaz az engedély dönt róla, mint a Készletegyenlegről. Olvasó nézet: mozgást itt ma nem lehet rögzíteni.',
    prereq: 'Tagság a fiókban, és a fiókkezelő engedélye a készletadatokra.',
    result: 'A mozgások listája időrendben, a sorok számával a lap alján.',
    outcomes: Object.freeze({
      success: 'A mozgások listája megjelent.',
      empty: 'Ehhez a fiókhoz nem tartozik mintaadat. Az elrendezés így is megnézhető.',
      missing: 'Ahol a mennyiség nem ismert, ott ezt írjuk ki — nem nullát.',
      refused: 'Ehhez az adathoz még nincs hozzáférésed. A fiókkezelő tudja engedélyezni.',
      error: 'A készletadatokat nem sikerült betölteni. Semmi nem változott a fiókban.',
    }),
  }),
  'account.settings': Object.freeze({
    title: 'A fiók adatai',
    purpose: 'Megmutatja a megnyitott fiók nevét, a te szerepedet benne, az előfizetést és a megadott vállalkozási adatokat. Olvasó nézet: a vállalkozási adatokat itt ma nem lehet módosítani.',
    prereq: 'Megnyitott fiók.',
    result: 'A fiók lapja. A vállalkozási adatról kimondjuk: megadott adat, nem ellenőrzött — hatóságnál nem igazoltuk.',
    outcomes: Object.freeze({
      success: 'A fiók adatai megjelentek.',
    }),
  }),
  'personal.ownMatters': Object.freeze({
    title: 'Saját ügyek',
    purpose: 'Ide a saját nevedben indított ügyeid kerülnek majd — nem a fiók adatai, hanem a tieid. A képesség még nem létezik: a lap ma megnyílik, és kimondja, hogy üres.',
    prereq: 'Belépés. Fiók nem kell hozzá: ez a lap rólad szól, nem a vállalkozásról.',
    result: 'Ma egy üres állapot, ami megmondja, mi fog ide kerülni. Nem hibajelzés: nincs mit megjeleníteni.',
    outcomes: Object.freeze({
      missing: 'A saját ügyek listája még nem létezik. Ez nem hiba és nem jogosultsági kérdés: a képesség nincs megépítve.',
    }),
  }),
});

/** A GYAKORI KÉRDÉSEK — kereshetők, és modellhívás nélkül működnek (R89 §6). */
export const FAQ = Object.freeze({
  'faq.register.neutral': Object.freeze({
    q: 'Miért nem írja ki, hogy a címem már regisztrálva van?',
    a: 'Szándékosan ugyanazt a választ adjuk, akár szabad a cím, akár nem. Így senki nem tudja kipróbálni, hogy egy adott cím használja-e a rendszert. Ha nem jön levél, kérj új megerősítő levelet.',
  }),
  'faq.register.noMail': Object.freeze({
    q: 'Nem jött meg a megerősítő levél. Mit tegyek?',
    a: 'Ebben a rendszerben a levelek nem valódi postafiókba érkeznek: nézd meg a Próbaüzenetek között. Ha ott sincs, kérj újat az „Új megerősítő levél kérése” gombbal. Mindig a legutóbbi levél hivatkozása érvényes.',
  }),
  'faq.verify.expired': Object.freeze({
    q: 'Lejárt a megerősítő linkem.',
    a: 'Kérj új megerősítő levelet a belépési oldalról. A régi hivatkozás ettől érvénytelen lesz — ez így helyes.',
  }),
  'faq.verify.used': Object.freeze({
    q: 'Azt írja, hogy a linket már felhasználták.',
    a: 'Egy megerősítő hivatkozás egyszer használható. Ha már megerősítetted a címet, egyszerűen lépj be.',
  }),
  'faq.logout.language': Object.freeze({
    q: 'Kijelentkezés után megmarad a nyelv, amit beállítottam?',
    a: 'Igen, ebben a böngészőben. A választást a böngésző a te belépésedhez kötve jegyzi meg: újrabelépés után ugyanazon a nyelven folytatod. Ha ugyanebben a böngészőben más lép be, az ő beállítása érvényes, nem a tiéd.',
  }),
  'faq.login.failed': Object.freeze({
    q: 'Nem tudok belépni, de nem írja ki, mi a hiba.',
    a: 'Azt nem mondjuk meg, hogy az e-mail-cím vagy a jelszó a hibás — ez a fiókok védelme. Ellenőrizd mindkettőt, és ha a cím még nincs megerősítve, kérj új megerősítő levelet.',
  }),
  'faq.resend.why': Object.freeze({
    q: 'Miért kérhetek csak ritkán új levelet?',
    a: 'Hogy egy címre ne lehessen sok levelet küldetni. Ha túl gyakran kérnél, a képernyő megmondja, hogy várj egy kicsit.',
  }),
  'faq.account.personalVsBusiness': Object.freeze({
    q: 'Mi a különbség a személyes fiók és a vállalkozás között?',
    a: 'A személyes fiók a sajátod, magától megszületik, és nem szűnhet meg attól, hogy egy vállalkozás megszünteti a hozzáférésedet. A vállalkozás közös munkahely: több tagja lehet, és a fiókkezelő adja az engedélyeket.',
  }),
  // A 4. TÖRTÉNET KÉRDÉSE (R112): több vállalkozásban dolgozva hol és milyen joggal járok el.
  'faq.account.whichAccount': Object.freeze({
    q: 'Honnan tudom, melyik fiókban dolgozom, és mit tehetek ott?',
    a: 'A fejléc fiókválasztója mutatja a nyitott fiókot. A Belépés és biztonság oldalon a „Ki nevében jársz el” sor a szerepkörödet is megnevezi: fiókkezelőként a Beállítások menüt is látod, tagként az adatok megtekintését a fiókkezelő engedélyezi. Fiókváltáskor a félbehagyott kitöltés, a súgó-beszélgetés és a lépésenkénti útmutató nem kerül át a másik fiókba.',
  }),
  'faq.account.unsaved': Object.freeze({
    q: 'Fiókváltásnál megkérdezi, hogy elveszik-e a munkám. Miért?',
    a: 'Mert a fiókok adatai nem keverednek: amit az egyik fiókban elkezdtél beírni, azt nem visszük át a másikba. Vagy folytatod a szerkesztést, vagy elveted és váltasz.',
  }),
  'faq.business.taxId': Object.freeze({
    q: 'Muszáj adószámot megadnom?',
    a: 'Vállalkozásnál igen, mert az azonosítja a céget: előbb a nyilvántartás országát vagy területét választod ki, és az ott használt azonosítót adod meg — az elvárt alakot ez az ország határozza meg. Csak az alakot és az egyediséget ellenőrizzük; hatóságnál nem kérdezzük le. Ha adóazonosító nélkül dolgoznál közösen, válaszd a „Közös fiók” fajtát. A közös fiókhoz utólag nem adható adóazonosító.',
  }),
  'faq.business.alreadyAttached': Object.freeze({
    q: 'Azt írja, hogy ehhez az adóazonosítóhoz már tartozik fiók.',
    a: 'Egy adóazonosítóhoz egy fiók tartozik. Ha a vállalkozásod már használja a rendszert, kérj meghívót attól, aki kezeli. Azt nem mondjuk meg, kié a másik fiók.',
  }),
  'faq.business.shared': Object.freeze({
    q: 'Mi az a közös fiók?',
    a: 'Közös munkahely adóazonosító nélkül. Ugyanúgy meghívhatsz bele másokat. Adóazonosító utólag nem adható hozzá — céges munkához vállalkozási fiókot hozz létre.',
  }),
  'faq.invite.who': Object.freeze({
    q: 'Ki hívhat meg valakit, és melyik fiókba?',
    a: 'A fiók kezelője, és csak abba a fiókba, amelyiket kezeli. Olyan szerepkört vagy adatkört nem adhat tovább, ami neki magának sincs.',
  }),
  'faq.invite.expiry': Object.freeze({
    q: 'Meddig érvényes egy meghívó?',
    a: 'A meghívónak lejárati ideje van, és a képernyő kiírja. Lejárt meghívóval nem lehet csatlakozni — kérj újat attól, aki meghívott.',
  }),
  'faq.invite.link': Object.freeze({
    q: 'Hol találom a meghívó hivatkozását?',
    a: 'A levélben. A várakozó meghívások listájában szándékosan nem jelenítjük meg: a hivatkozás a levél titka. A próbafelületen a Próbaüzenetek panel mutatja.',
  }),
  'faq.invite.accept': Object.freeze({
    q: 'Hogyan fogadok el egy meghívást?',
    a: 'Nyisd meg a meghívó levélben lévő hivatkozást, lépj be azzal a címmel, amelyre a meghívás szól, majd nyomd meg a „Meghívás elfogadása” gombot. Az elfogadás után az adatok megtekintését a fiókkezelő külön engedélyezi.',
  }),
  'faq.invite.wrongAddress': Object.freeze({
    q: 'Azt írja, hogy a meghívó másik címre szól.',
    a: 'A meghívó egy konkrét e-mail-címhez tartozik. Lépj be azzal a címmel, vagy kérj új meghívót a sajátodra.',
  }),
  'faq.invite.personalVsBusiness': Object.freeze({
    q: 'A meghívással új fiókot kapok?',
    a: 'Nem. A saját belépésed és a fiók, amelybe meghívtak, két külön dolog. A meghívás elfogadásával taggá válsz abban a fiókban, a személyes fiókod pedig változatlanul a tiéd marad. Tulajdonosi jogot sem ad: azt kapod, amit a meghívás megnevez.',
  }),
  'faq.members.membershipVsScope': Object.freeze({
    q: 'Csatlakoztam, de nem látom az adatokat. Miért?',
    a: 'A tagság és az adatok megtekintésének engedélye két külön állapot. A csatlakozás után a fiókkezelő külön engedélyezi, mely adatkört nézheted meg.',
  }),
  'faq.members.grant': Object.freeze({
    q: 'Hogyan engedélyezem valakinek a készletadatokat?',
    a: 'Felhasználók → a sor „Hozzáférés kezelése” gombja → válaszd ki az adatkört → „Megtekintés engedélyezése”. Az engedély csak ehhez a fiókhoz tartozik.',
  }),
  'faq.invite.revoke': Object.freeze({
    q: 'Visszavonhatok egy kiküldött meghívást?',
    a: 'Igen. Felhasználók → „Elfogadásra vár” fül → az adott sor „Meghívás visszavonása” gombja. A kiküldött hivatkozás ezután nem használható. Ha a meghívást már elfogadták, a visszavonás nem szünteti meg a tagságot — arra a „Hozzáférés megszüntetése ebben a fiókban” művelet szolgál.',
  }),
  'faq.members.reinvite': Object.freeze({
    q: 'Visszahívhatok egy kollégát, akinek korábban megszüntettem a hozzáférését?',
    a: 'Igen, de ez tudatos, külön döntés. Felhasználók → a listában válaszd ki az eltávolított embert → „Hozzáférés kezelése” → „Újra meghívás”. Ettől még nem lesz tagja: új meghívást kap, és a tagság az ő elfogadásával jön létre. Egy sima új meghívás nem éleszti fel a régi tagságot.',
  }),
  'faq.members.reinviteScopes': Object.freeze({
    q: 'Ha visszahívok valakit, visszakapja a korábbi hozzáféréseit?',
    a: 'Nem. Az újbóli belépés új tagsági időszakot nyit, és abban egyetlen adat-hozzáférés sem áll vissza magától — mindegyiket külön, újra meg kell adni. A korábbi időszak előzményei megmaradnak, csak a mai jogra nem hatnak.',
  }),
  'faq.members.scopeRevoke': Object.freeze({
    q: 'Elvehetem valakitől csak az árakat úgy, hogy a többi megmaradjon?',
    a: 'Igen. Felhasználók → „Hozzáférés kezelése” → az adott sor „Hozzáférés visszavonása” gombja. Csak az az egy hozzáférés szűnik meg; a tagság, a szerep és a többi hozzáférés változatlan marad.',
  }),
  'faq.data.sampleAccess': Object.freeze({
    q: 'Miért nem látom a bizonylat- vagy beszállítói mintát?',
    a: 'Mert ezekhez külön hozzáférés kell, és a készlet-hozzáférés nem foglalja magában. A képernyő megnevezi, melyik hiányzik; ezt a fiók kezelője adja meg. Ezen felül a csomagnak is tartalmaznia kell ezt a nézetet.',
  }),
  'faq.data.mixedDocument': Object.freeze({
    q: 'Miért nem látom a vegyes bizonylatot, ha a fejlécet látom?',
    a: 'Mert a vegyes bizonylatban összeg és beszállítói rész is van, ezekhez pedig az árak és a beszállítói adatok hozzáférés kell. Egyetlen hiányzó hozzáférés az egész bizonylatot zárja: részlegesen nem adjuk ki.',
  }),
  'faq.members.revoke': Object.freeze({
    q: 'Mi történik, ha megszüntetem valakinek a hozzáférését?',
    a: 'Az illető tagsága megszűnik ebben a fiókban, ezért nem nyithatja meg a fiók adatait. A személyes fiókja és a korábbi műveletek története megmarad.',
  }),
  'faq.plan.vsRight': Object.freeze({
    q: 'A csomag adja a jogosultságot?',
    a: 'Nem. A csomag azt szabja meg, mely funkciók érhetők el a fióknak. Hogy egy ember megnézhet-e egy adatkört, azt a fiókkezelő engedélye dönti el. A kettő külön.',
  }),
  'faq.plan.purchase': Object.freeze({
    q: 'Fizetnem kell a csomagváltásért?',
    a: 'Ezen a próbafelületen nincs vásárlás és nincs díjfizetés. A csomag-választás csak a funkciók elérhetőségét állítja.',
  }),
  'faq.stock.noAccess': Object.freeze({
    q: 'Miért nem látom a készletadatokat?',
    a: 'Mert a fiókkezelő még nem engedélyezte neked ezt az adatkört. Ugyanez az engedély dönt a Termékkartonról és a Készletmozgásokról is — ezért mind a három ugyanazt mutatja.',
  }),
  'faq.stock.unknownQty': Object.freeze({
    q: 'Mit jelent az, hogy „Nem ismert” a mennyiség?',
    a: 'Azt, hogy nem tudjuk a mennyiséget. Ez nem nulla, és nem is azt jelenti, hogy a tétel nem létezik. Egy későbbi pontosítás nem készletmozgás, és nem is válik visszamenőleg méréssé.',
  }),
  'faq.stock.loadFailed': Object.freeze({
    q: 'Azt írja, hogy a készletadatokat nem sikerült betölteni.',
    a: 'A lekérés nem ért célt. A fiókban semmi nem változott, ezért a „Frissítés” gombbal bátran újra próbálhatod.',
  }),
  'faq.price.twoGates': Object.freeze({
    q: 'Miért nem látom az árakat, ha a készletet látom?',
    a: 'Az áraknál két feltétel van: a csomagnak tartalmaznia kell a funkciót, és a fiókkezelőnek engedélyeznie kell az árak adatkört. A képernyő megmondja, melyik hiányzik.',
  }),
  'faq.price.missing': Object.freeze({
    q: 'Egy terméknél nincs ár. Az nulla?',
    a: 'Nem. Ahol nincs megadva ár, ott ezt írjuk ki — a hiányzó ár nem 0.',
  }),
  'faq.shell.tabs': Object.freeze({
    q: 'Mire jók a fülek a képernyő tetején?',
    a: 'Ezek a nyitott lapok. Ugyanaz a lap nem nyílik meg kétszer, és fiókváltásnál új lap-készlet indul, hogy ne keveredjenek a fiókok adatai.',
  }),
  'faq.shell.menuMissing': Object.freeze({
    q: 'Eltűnt egy menüpont. Hova lett?',
    a: 'A menü csak azt kínálja, amit használni is tudsz: a Beállítások csoport fiókkezelői jogosultsághoz kötött, és a személyes fiókban egyszerűbb menü áll. Az Oldaltérkép megmutatja, mi érhető el neked.',
  }),
  'faq.profile.edit': Object.freeze({
    q: 'Hol tudom módosítani a saját adataimat?',
    a: 'Ez még nem érhető el, ezért gombot sem kínálunk rá.',
  }),
  'faq.security.password': Object.freeze({
    q: 'Hogyan változtatom meg a jelszavamat?',
    a: 'A jelszó megváltoztatása még nem érhető el, ezért gombot sem kínálunk rá. Új megerősítő levél csak akkor segít, ha a címed még nincs megerősítve — a jelszót nem állítja vissza.',
  }),
  'faq.lang.which': Object.freeze({
    q: 'Milyen nyelveken használható a rendszer?',
    a: 'Magyar, angol és német nyelven — a felület, a hibaüzenetek, a súgó, a gyakori kérdések, az oldaltérkép és a lépésenkénti útmutató is. A nyelvet a Saját profil oldalon állíthatod.',
  }),
  'faq.lang.country': Object.freeze({
    q: 'Ha angolra váltok, változik az adózási rend vagy a pénznem?',
    a: 'Nem. A felület nyelve nem választ országot, adózási rendet, időzónát vagy pénznemet; ezek nem a nyelvtől függnek.',
  }),
  'faq.lang.missing': Object.freeze({
    q: 'Egy szöveg mégis magyarul jelenik meg. Miért?',
    a: 'Mert ahhoz a szöveghez még nincs kész fordítás, és inkább olvashatót mutatunk, mint gépi kulcsot. A hiányt mérjük, és a súgó a témánál ki is írja.',
  }),
  'faq.help.where': Object.freeze({
    q: 'Hol találom a súgót?',
    a: 'A fejlécben a „Súgó” gombbal, vagy egy mező melletti kérdőjellel — az utóbbi mindjárt az adott témát nyitja meg. A panel magától soha nem ugrik fel.',
  }),
  'faq.help.noModel': Object.freeze({
    q: 'A súgó használatáért fizetni kell (MI-költség)?',
    a: 'A súgó, a gyakori kérdések, az oldaltérkép és a lépésenkénti útmutató MI-szolgáltató nélkül működik. MI-szolgáltatót csak akkor hívunk, ha a Kérdezz fülön kérdést küldesz, és van engedélyezett MI-kapcsolat.',
  }),
  'faq.chat.source': Object.freeze({
    q: 'Honnan tudom, hogy a segéd válasza hiteles?',
    a: 'Minden válasz megnevezi, melyik leírásból dolgozott, és annak a forrásváltozatát is. Ha valamihez nincs ellenőrzött leírás, a segéd ezt kimondja, nem talál ki választ.',
  }),
  'faq.chat.limits': Object.freeze({
    q: 'Mit nem tesz meg helyettem a segéd?',
    a: 'Nem ment, nem hív meg senkit, nem ad jogot, nem töröl és nem fizet. Legfeljebb elmagyaráz, megnyit egy képernyőt, vagy előkészít egy űrlapot — a jóváhagyás a tiéd.',
  }),
  'faq.chat.secrets': Object.freeze({
    q: 'Beírhatom a jelszavamat a chatbe?',
    a: 'Nem. Jelszót, megerősítő kódot és belépési titkot soha nem kérünk a chatben, és ne is írj be ilyet. A jelszót a belépési felület intézi.',
  }),
  'faq.chat.offline': Object.freeze({
    q: 'Azt írja, hogy a segéd nem elérhető.',
    a: 'Ilyenkor az MI-szolgáltatói kapcsolat hiányzik vagy nem válaszol. A keresés a leírásokban, a gyakori kérdések, az oldaltérkép és a lépésenkénti útmutató továbbra is működik.',
  }),
  'faq.mail.real': Object.freeze({
    q: 'A rendszer valódi e-mailt küld?',
    a: 'Ezen a próbafelületen nem. A leveleket a Próbaüzenetek panel gyűjti, és ott nyithatók meg. Ez azért fontos, hogy próbálgatás közben senkinek ne menjen ki levél.',
  }),
  'faq.demo.whatIsReal': Object.freeze({
    q: 'Melyik adat valódi, és melyik minta?',
    a: 'A fiókok, a tagságok, a meghívók és az engedélyek valódiak. A termék-, partner-, raktár-, folyamat- és bizonylat-listák mintaadatok: rajtuk üzleti végrehajtás nincs. A képernyők ezt jelölik.',
  }),
  'faq.demo.noFixture': Object.freeze({
    q: 'Az újonnan létrehozott fiókom üres. Elromlott?',
    a: 'Nem. A mintaadat két céghez van rögzítve; az új fiók szándékosan üresen indul. Az elrendezés így is megnézhető.',
  }),
  // ── R164/3 — a pótolt funkciókhoz tartozó gyakori kérdések.
  'faq.warehouses.readOnly': Object.freeze({
    q: 'Hogyan vegyek fel új raktárat?',
    a: 'Ma nem lehet: ez a lap olvasó nézet. A raktár-felvétel még nincs megépítve — nem engedély kérdése, és nem is hiba. Amíg nincs, a lap a fiók mintaadatát mutatja.',
  }),
  'faq.warehouses.itemCount': Object.freeze({
    q: 'Mit jelent a raktár melletti tételszám?',
    a: 'Azt, hogy a fiók mintaadatából hány termék tartozik ehhez a raktárhoz. Nem mennyiség és nem készletérték: darabszámban a termékek száma.',
  }),
  'faq.processes.filter': Object.freeze({
    q: 'Mit tesz az állapot-szűrő a Folyamatoknál?',
    a: 'Csak a megjelenített sorokat szűkíti. A fiókban semmi nem változik tőle, és a szűrés nem küld semmit — a szűrő kiürítésével újra mindent látsz.',
  }),
  'faq.processes.readOnly': Object.freeze({
    q: 'Hogyan indítsak vagy zárjak le egy folyamatot?',
    a: 'Ma nem lehet: ez a lap olvasó nézet. A folyamat indítása és lezárása még nincs megépítve. A lap ezt kimondja, nem úgy tesz, mintha menne.',
  }),
  'faq.stockcard.sameGate': Object.freeze({
    q: 'Miért nem látom a Termékkartont, ha a Készletegyenleget sem látom?',
    a: 'Mert ugyanaz az engedély dönt mind a kettőről, és a Készletmozgásokról is. A fiókkezelő egy helyen adja ki a készletadatokat — onnantól mind a három megnyílik.',
  }),
  'faq.stockcard.whichProduct': Object.freeze({
    q: 'Melyik termék kartonját látom?',
    a: 'A fiók mintaadatának első termékét. A termék-választás még nincs megépítve; a karton elrendezése így is megnézhető.',
  }),
  'faq.movements.sameGate': Object.freeze({
    q: 'Miért nem látom a Készletmozgásokat?',
    a: 'Mert a készletadatokra szóló engedély dönt róla — ugyanaz, mint a Készletegyenlegnél és a Termékkartonnál. A fiókkezelő tudja kiadni.',
  }),
  'faq.movements.readOnly': Object.freeze({
    q: 'Hogyan rögzítsek egy készletmozgást?',
    a: 'Ma nem lehet: ez a lap olvasó nézet. A mozgás-rögzítés még nincs megépítve, ezért a lap nem is kínál rá gombot.',
  }),
  'faq.account.notChecked': Object.freeze({
    q: 'A fiók lapján azt írja, hogy a vállalkozási adat „nem ellenőrzött". Mit jelent ez?',
    a: 'Azt, hogy amit megadtak, azt rögzítettük, de hatóságnál nem igazoltuk. Nem azt jelenti, hogy hibás — azt, hogy nem mi állítjuk a helyességét.',
  }),
  'faq.account.whoChanges': Object.freeze({
    q: 'Hogyan módosítsam a fiók vállalkozási adatait?',
    a: 'Ma nem lehet: ez a lap olvasó nézet. A módosítás még nincs megépítve. A fiók nevét és az előfizetést a fiókkezelő tudja kezelni a saját lapjain.',
  }),
  'faq.personal.whyEmpty': Object.freeze({
    q: 'Miért üres a Saját ügyek lap?',
    a: 'Mert a képesség még nem létezik: nincs olyan adatkör, amit a saját nevedben rögzíthetnél vagy lekérhetnél. Ez nem jogosultsági kérdés és nem hiba — a lap megmondja, mi fog ide kerülni.',
  }),
});

/** A BEMUTATÓK LÉPÉS-SZÖVEGE. A kulcs: `<bemutató>.<lépés>` — a lépések a `TOURS` regiszterben. */
export const TOUR = Object.freeze({
  'tour.shell': Object.freeze({
    title: 'Körbevezetés a felületen',
    lead: 'Öt lépés: mi hol van. Semmit nem mentünk el közben.',
    s1: Object.freeze({ title: 'A fiókválasztó', body: 'Itt látod, melyik fiók van megnyitva, és itt tudsz másikra váltani. A személyes fiókod és a vállalkozásaid egy listán állnak.' }),
    s2: Object.freeze({ title: 'A menü', body: 'A bal oldali menü csoportokba rendezi a képernyőket. Csak az látszik, amit használni is tudsz.' }),
    s3: Object.freeze({ title: 'A lapok', body: 'A megnyitott képernyők fülként itt sorakoznak. Ugyanaz a lap nem nyílik meg kétszer.' }),
    s4: Object.freeze({ title: 'A saját profil', body: 'A jobb felső menüben a saját adataid, a nyelv és a kijelentkezés.' }),
    s5: Object.freeze({ title: 'A Súgó', body: 'Innen nyílik a súgó: kérdezhetsz, leírást olvashatsz, kereshetsz a gyakori kérdésekben, vagy megnézheted az oldaltérképet.' }),
  }),
  'tour.invite': Object.freeze({
    title: 'Hogyan hívj meg valakit',
    lead: 'Hat lépés. A meghívót te hozod létre — az útmutató nem kattint helyetted.',
    s1: Object.freeze({ title: 'Nyisd meg a Felhasználókat', body: 'A Beállítások csoportban találod. Ez a menüpont fiókkezelői jogosultsághoz kötött.' }),
    s2: Object.freeze({ title: 'Meghívás indítása', body: 'A „+ Felhasználó meghívása” gomb jobb oldali panelt nyit.' }),
    s3: Object.freeze({ title: 'A meghívott címe', body: 'Ide az ő e-mail-címe kerül. A meghívó ehhez a címhez tartozik, más címmel nem váltható be.' }),
    s4: Object.freeze({ title: 'Mely adatokhoz kaphat hozzáférést', body: 'Ez a szándékod rögzítése. A tényleges megtekintést a csatlakozás után külön engedélyezed.' }),
    s5: Object.freeze({ title: 'A meghívó létrehozása', body: 'Nyomd meg a „Meghívó létrehozása” gombot. Ez a lépés csak akkor halad tovább, ha a meghívó ténylegesen elkészült — a gomb megnyomása önmagában nem siker.' }),
    s6: Object.freeze({ title: 'A levél megnyitása', body: 'A próbafelületen a levél a Próbaüzenetek panelen nyílik meg. Valódi levelet nem küldtünk.' }),
  }),
  'tour.addBusiness': Object.freeze({
    title: 'Vállalkozás hozzáadása',
    lead: 'Öt lépés. A mentést te végzed el.',
    s1: Object.freeze({ title: 'A fiók fajtája', body: 'Vállalkozás (adóazonosítóval) vagy közös fiók (adóazonosító nélkül). A céges adatlap csak a vállalkozásnál jelenik meg.' }),
    s2: Object.freeze({ title: 'A fiók neve', body: 'Ez látszik majd a fiókválasztóban és a képernyők fejlécében.' }),
    s3: Object.freeze({ title: 'A nyilvántartás országa', body: 'Ez azt mondja meg, milyen alakú azonosítót tartunk nyilván. Nem választ adózási rendet és nem ellenőrzi a céget hatósági nyilvántartásban.' }),
    s4: Object.freeze({ title: 'Az adóazonosító', body: 'Ez önbevallott adat: az alakját ellenőrizzük, a valódiságát nem. Megadása nem igazolja más vállalkozás képviseletét.' }),
    s5: Object.freeze({ title: 'A létrehozás', body: 'Nyomd meg az „Új fiók hozzáadása” gombot. Ez a lépés csak tényleges létrehozás után halad tovább.' }),
  }),
  'tour.stock': Object.freeze({
    title: 'A készletadatok megtekintése',
    lead: 'Négy lépés. Csak megnézzük az adatokat, semmit nem mentünk és nem módosítunk.',
    s1: Object.freeze({ title: 'Nyisd meg a Készletegyenleget', body: 'A Riportok csoportban találod.' }),
    s2: Object.freeze({ title: 'A lista', body: 'A mennyiségek raktáranként. Ahol a mennyiség nem ismert, ott ezt írjuk ki — nem nullát.' }),
    s3: Object.freeze({ title: 'Frissítés', body: 'Újra lekérdezi az adatot. Ha nem sikerül, a lap kimondja, és semmi nem változik a fiókban.' }),
    s4: Object.freeze({ title: 'Az árak', body: 'Az árak két feltételhez kötöttek: csomag és engedély. A lap megmondja, melyik hiányzik.' }),
  }),
  'tour.grant': Object.freeze({
    title: 'Hozzáférés adása egy kollégának',
    lead: 'Három lépés. A hozzáférés csak ebben a fiókban érvényes.',
    s1: Object.freeze({ title: 'Nyisd meg a Felhasználókat', body: 'A Beállítások csoportban, fiókkezelői jogosultsággal.' }),
    s2: Object.freeze({ title: 'Válaszd ki a kollégát', body: 'A listában a „Hozzáférés kezelése” gomb nyitja meg az adott ember hozzáférés-lapját.' }),
    s3: Object.freeze({ title: 'Az adatkör engedélyezése', body: 'Válaszd ki az adatkört, és nyomd meg a „Megtekintés engedélyezése” gombot. Ez a lépés csak tényleges mentés után halad tovább.' }),
  }),
  'tour.scopeLifecycle': Object.freeze({
    title: 'Egy hozzáférés megadása és visszavonása',
    lead: 'Négy lépés. A végén a tag mennyiséget továbbra is lát, a bizalmas mintát már nem.',
    s1: Object.freeze({ title: 'Nyisd meg a Felhasználókat', body: 'A Beállítások csoportban, fiókkezelői jogosultsággal.' }),
    s2: Object.freeze({ title: 'Válaszd ki a kollégát', body: 'A listában a „Hozzáférés kezelése” gomb nyitja meg az adott ember hozzáférés-lapját.' }),
    s3: Object.freeze({ title: 'Az üzleti dokumentumok engedélyezése', body: 'Az „Üzleti dokumentumok” sorban nyomd meg a „Hozzáférés megadása” gombot. Ez a lépés csak tényleges mentés után halad tovább.' }),
    s4: Object.freeze({ title: 'És a visszavonás', body: 'Ugyanabban a sorban a „Hozzáférés visszavonása” gomb csak ezt az egy hozzáférést veszi el — a tagság és a többi adat megmarad.' }),
  }),
  'tour.inviteRevoke': Object.freeze({
    title: 'Egy kiadott meghívás visszavonása — és ami utána jön',
    lead: 'Végigviszed mind a két oldalról: visszavonod a meghívást, a címzett nézetében látod, hogy a régi hivatkozás már nem jó, majd új meghívást adsz, amit ő elfogad.',
    s1: Object.freeze({ title: 'Nyisd meg a Felhasználókat', body: 'A Beállítások csoportban, fiókkezelői jogosultsággal.' }),
    s2: Object.freeze({ title: 'Váltsd át az „Elfogadásra vár” fülre', body: 'Itt látszik, melyik meghívás vár elfogadásra, melyiket fogadták el, melyik járt le, és melyiket vonták vissza.' }),
    s3: Object.freeze({ title: 'Keresd meg a függő meghívást', body: 'Béla sora „Elfogadásra vár” állapotban áll. A sor végén van a visszavonás gombja.' }),
    s4: Object.freeze({ title: 'Vond vissza a meghívást', body: 'A sor „Meghívás visszavonása” gombja, majd a megerősítés. Ez a lépés csak tényleges visszavonás után halad tovább.' }),
    s5: Object.freeze({ title: 'Nézd meg a megváltozott állapotot', body: 'A sor most „Visszavonva”, és a művelet oszlopa üres: ugyanazt a meghívást másodszor nem lehet visszavonni.' }),
    s6: Object.freeze({ title: 'Válts át Béla nézetére', body: 'A kiemelt vezérlő a kijelentkezés — ez valódi váltás, nem megszemélyesítés. Nyomd meg, majd Béla lépjen be a saját fiókjával ugyanitt; vagy nyissa meg a meghívót a saját böngészőjében. Az útmutató akkor folytatódik, amikor a kiszolgáló már az ő nézetét adja — a haladásod addig megmarad. Ha panel van nyitva, előbb zárd be.' }),
    s7: Object.freeze({ title: 'Nyisd meg a próbaüzeneteket', body: 'Itt állnak a próbafelület levelei. A korábban kiküldött meghívó is köztük van.' }),
    s8: Object.freeze({ title: 'Nyisd meg a korábbi meghívó hivatkozását', body: 'Ez az a hivatkozás, amit Béla korábban megkapott. Kattints rá: a meghívó képernyője nyílik meg.' }),
    s9: Object.freeze({ title: 'A régi meghívó megnyitva', body: 'A képernyő kimondja: ezt a meghívást visszavonták, ezért nem fogadható el. Elfogadás gomb sincs — a hivatkozás elhalt.' }),
    s10: Object.freeze({ title: 'Válts vissza Anna nézetére', body: 'A fiókkezelőnek új meghívást kell kiadnia — a régi hivatkozás már nem éleszthető fel.' }),
    s10b: Object.freeze({ title: 'Válts át a cég fiókjára', body: 'A belépés után a saját személyes körödben állsz — a Felhasználók képernyő csak a cég fiókjában létezik. A fejléc fiókválasztójában válaszd a céget.' }),
    s11: Object.freeze({ title: 'Nyisd meg újra a Felhasználókat', body: 'A váltás után az áttekintésen állsz. A meghívás a Felhasználók képernyőről indul.' }),
    s12: Object.freeze({ title: 'Nyisd meg a meghívás űrlapját', body: 'A „Felhasználó meghívása” gomb a képernyő tetején.' }),
    s13: Object.freeze({ title: 'Adj ki új meghívást Bélának', body: 'A „Felhasználó meghívása” gomb, majd a cím és az adatkör megadása után az elküldés. Ez a lépés csak tényleges elküldés után halad tovább.' }),
    s14: Object.freeze({ title: 'Válts át újra Béla nézetére', body: 'Most már az új meghívó várja. A tagságot továbbra is az ő elfogadása hozza létre.' }),
    s15: Object.freeze({ title: 'Nyisd meg újra a próbaüzeneteket', body: 'Az új meghívó levele is ide érkezett.' }),
    s16: Object.freeze({ title: 'Nyisd meg az új meghívó hivatkozását', body: 'A legfrissebb levél hivatkozása. Ez már az új meghívásra szól.' }),
    s17: Object.freeze({ title: 'Fogadd el az új meghívást', body: 'Béla saját műveletével. Az útmutató ezt soha nem végzi el helyette.' }),
    s18: Object.freeze({ title: 'Nézd meg az eredményt', body: 'A fiókváltóban ott a cég: Béla mostantól tag. A régi, visszavont meghívó ettől nem éledt fel — ez egy új meghívás eredménye.' }),
  }),
  'tour.reentry': Object.freeze({
    title: 'Munkatárs visszatérése — a tagságtól a készletadatig',
    lead: 'Megszünteted Béla tagságát, majd újra meghívod. A tagság az ő elfogadásával jön létre, de a régi adat-hozzáférései nem állnak vissza: azokat külön kell megadni.',
    s1: Object.freeze({ title: 'Nyisd meg a Felhasználókat', body: 'A Beállítások csoportban, fiókkezelői jogosultsággal.' }),
    s2: Object.freeze({ title: 'Nézd meg Béla mai állapotát', body: 'A listán látszik a tagsága és az is, mely adatkörökhöz fér hozzá. Jegyezd meg: a készletadatokat most látja.' }),
    s3: Object.freeze({ title: 'Szüntesd meg a tagságát', body: 'Nyisd meg a sorát a „Hozzáférés kezelése” gombbal, majd szüntesd meg a hozzáférést. Ez a lépés csak tényleges megszüntetés után halad tovább.' }),
    s4: Object.freeze({ title: 'Küldd el az új meghívást', body: 'Az „Újbóli belépés” szakaszban az „Újra meghívás” gomb. A megerősítés kimondja: a korábbi adat-hozzáférései nem állnak vissza.' }),
    s5: Object.freeze({ title: 'Válts át Béla nézetére', body: 'A kiemelt vezérlő a kijelentkezés — ez valódi váltás, nem megszemélyesítés. Nyomd meg, majd Béla lépjen be a saját fiókjával ugyanitt; vagy nyissa meg a levelét a saját böngészőjében. Az útmutató akkor folytatódik, amikor a kiszolgáló már az ő nézetét adja — a haladásod addig megmarad. Ha panel van nyitva, előbb zárd be.' }),
    s6: Object.freeze({ title: 'Nyisd meg a próbaüzeneteket', body: 'Az újbóli meghívás levele ide érkezett.' }),
    s7: Object.freeze({ title: 'Nyisd meg a meghívó hivatkozását', body: 'A levélben lévő hivatkozás a meghívó képernyőjére visz.' }),
    s8: Object.freeze({ title: 'Fogadd el a meghívást', body: 'Béla saját műveletével. A tagság ettől jön létre — és csak a tagság.' }),
    s9: Object.freeze({ title: 'Válts át a cég fiókjára', body: 'Az elfogadás után Béla a saját személyes körében áll. A fejléc fiókválasztójában válaszd a Minta Műhely Kft.-t — a cég képernyői csak ott érhetők el.' }),
    s10: Object.freeze({ title: 'Nyisd meg a Készletegyenleget', body: 'Béla már tag, tehát a cég képernyői elérhetők neki.' }),
    s11: Object.freeze({ title: 'Tagság van, készletadat nincs', body: 'A képernyő kimondja, hogy nincs hozzáférés. A régi jog nem jött vissza a tagsággal együtt.' }),
    s12: Object.freeze({ title: 'Válts vissza Anna nézetére', body: 'Az adatkört a fiókkezelő adja meg, külön művelettel.' }),
    s13: Object.freeze({ title: 'Nyisd meg újra a Felhasználókat', body: 'A váltás után az áttekintésen állsz. A jogadás a Felhasználók képernyőről megy.' }),
    s14: Object.freeze({ title: 'Add meg a készletadatok jogát', body: 'Béla sorában a „Készletadatok” kör engedélyezése. Ez a lépés csak tényleges megadás után halad tovább.' }),
    s15: Object.freeze({ title: 'Válts át újra Béla nézetére', body: 'Most már látnia kell a készletet — de csak azt, amire jogot kapott.' }),
    s16: Object.freeze({ title: 'Nyisd meg újra a Készletegyenleget', body: 'Ugyanaz a képernyő, mint az előbb — csak most van hozzá jog.' }),
    s17: Object.freeze({ title: 'A mennyiség látszik', body: 'Kérd le a készletet: a képernyő kiírja a mennyiséget. A most megadott jog hatályos.' }),
    s18: Object.freeze({ title: 'Az ár viszont nem', body: 'Az árak külön adatkör, és azt nem adtuk meg. A képernyő kimondja a hiányt — nem üres mezőt mutat.' }),
  }),
  'tour.plan': Object.freeze({
    title: 'A csomag beállítása',
    lead: 'Három lépés. Vásárlás és díjfizetés nincs.',
    s1: Object.freeze({ title: 'Nyisd meg az Előfizetést', body: 'A Beállítások csoportban, fiókkezelői jogosultsággal.' }),
    s2: Object.freeze({ title: 'A csomag kiválasztása', body: 'A csomag a funkciók elérhetőségét szabja meg, nem az emberek jogosultságát.' }),
    s3: Object.freeze({ title: 'A mentés', body: 'Nyomd meg a „Csomag mentése” gombot. Ez a lépés csak tényleges mentés után halad tovább.' }),
  }),
  'tour.register': Object.freeze({
    title: 'Fiók létrehozása',
    lead: 'Három lépés. Jelszót az útmutató nem ír be és nem tárol.',
    s1: Object.freeze({ title: 'Az e-mail-címed', body: 'Olyan címet adj meg, amit el tudsz olvasni: ide megy a megerősítő levél.' }),
    s2: Object.freeze({ title: 'A jelszó', body: 'Legalább 8 karakter. Az útmutató nem tölti ki és nem tárolja el.' }),
    s3: Object.freeze({ title: 'A létrehozás', body: 'A válasz szándékosan semleges: ugyanaz, akár szabad a cím, akár nem. Nyisd meg a levelet a folytatáshoz.' }),
  }),
  'tour.language': Object.freeze({
    title: 'A felület nyelve',
    lead: 'Két lépés.',
    s1: Object.freeze({ title: 'A saját profil', body: 'A jobb felső profilmenüből nyílik a Saját profil oldal.' }),
    s2: Object.freeze({ title: 'A nyelv kiválasztása', body: 'A választás azonnal érvényes a felületre, a súgóra, a gyakori kérdésekre és a segédre. Országot, adózási rendet és pénznemet nem állít.' }),
  }),
  'tour.inviteAccept': Object.freeze({
    title: 'Meghívás elfogadása — végigvezetés',
    lead: 'Négy lépés a meghívó képernyőjén. Elfogadni te fogsz: az útmutató nem kattint helyetted.',
    s1: Object.freeze({ title: 'Hová hívtak', body: 'Itt látod, melyik fiókba hívtak, és milyen szerepkört ajánlanak. Csak azt írjuk ki, amit a meghívás alapján ki lehet adni.' }),
    s2: Object.freeze({ title: 'Melyik fiókkal', body: 'Ez a sor megmutatja, be vagy-e jelentkezve, és melyik címmel. A meghívás egy konkrét címhez tartozik — ha másikkal vagy bent, itt látszik.' }),
    s3: Object.freeze({ title: 'Mi a következő lépés', body: 'Ez a mondat mindig a mostani állapotra szól: belépés, regisztráció, vagy már elfogadhatod. Ha a meghívás lejárt vagy más címre szól, itt írjuk ki, mit tehetsz.' }),
    s4: Object.freeze({ title: 'Az elfogadás a te kattintásod', body: 'A „Meghívás elfogadása” gombot te nyomod meg. Az útmutató csak akkor zárul, ha a rendszer visszaigazolta a csatlakozást — a „Tovább” gomb nem fogadja el a meghívást helyetted. Ha még nem vagy belépve, előbb lépj be vagy regisztrálj: a meghívás megmarad.' }),
  }),
  'tour.help': Object.freeze({
    title: 'A Súgó használata',
    lead: 'Négy lépés. Egyik sem indít modellhívást.',
    s1: Object.freeze({ title: 'A Súgó megnyitása', body: 'A fejléc „Súgó” gombja. A panel magától soha nem nyílik ki.' }),
    s2: Object.freeze({ title: 'Leírások', body: 'Az adott képernyőhöz tartozó témák kerülnek előre. Minden téma megmondja, mire való, mi kell hozzá, és mi lehet a kimenete.' }),
    s3: Object.freeze({ title: 'Gyakori kérdések', body: 'Kereshető kérdés–válasz lista. MI-szolgáltató nélkül működik.' }),
    s4: Object.freeze({ title: 'Oldaltérkép', body: 'Megmutatja, mely menüpontok érhetők el neked ebben a fiókban — a listát a rendszer a jogosultságaid alapján állítja össze.' }),
  }),
  'tour.warehouses': Object.freeze({
    title: 'A Raktárak lap',
    lead: 'Három lépés. Olvasó nézet: semmit nem mentünk el közben.',
    s1: Object.freeze({ title: 'Nyisd meg a Raktárakat', body: 'A Törzsadatok csoportban találod. A lap a fiók mintaadatát mutatja.' }),
    s2: Object.freeze({ title: 'A lista', body: 'Raktár, jelleg, és hány tétel tartozik hozzá. A tételszám a termékek száma, nem mennyiség.' }),
    s3: Object.freeze({ title: 'A kereső', body: 'Szűkítheted a listát. Csak a megjelenített sorokra hat — a fiókban semmi nem változik.' }),
  }),
  'tour.processes': Object.freeze({
    title: 'A Folyamatok lap',
    lead: 'Három lépés. Olvasó nézet: folyamatot itt ma nem lehet indítani vagy lezárni.',
    s1: Object.freeze({ title: 'Nyisd meg a Folyamatokat', body: 'A Műveletek csoportban találod. A lap a fiók mintaadatát mutatja.' }),
    s2: Object.freeze({ title: 'A lista', body: 'Azonosító, megnevezés, állapot és időpont. Az állapot jelvényként látszik.' }),
    s3: Object.freeze({ title: 'A kereső és a szűrő', body: 'Szűkítheted a listát szövegre vagy állapotra. A fiókban semmi nem változik tőle.' }),
  }),
  // ── R166 §3 — A TIZENKÉT PÓTOLT LÉPÉSENKÉNTI ÚTMUTATÓ SZAVAI ────────────────────────────────
  'tour.verify': Object.freeze({
    title: 'A cím megerősítése',
    lead: 'Két lépés. A megerősítő hivatkozást te nyitod meg a levélből — helyetted nem kattintunk.',
    s1: Object.freeze({ title: 'Nyisd meg a Próbaüzeneteket', body: 'A fejlécben találod. Ez a próbafelület levél-fogadója: a rendszer levelei itt jelennek meg, valódi postafiók nélkül.' }),
    s2: Object.freeze({ title: 'A megerősítő levél', body: 'Nyisd meg a legutóbbi levelet, és kattints a benne lévő hivatkozásra. A cím ettől lesz megerősítve; belépni csak utána lehet.' }),
  }),
  'tour.login': Object.freeze({
    title: 'Belépés',
    lead: 'Három lépés. A jelszót te írod be — helyetted nem lépünk be.',
    s1: Object.freeze({ title: 'Az e-mail cím', body: 'Azt a címet add meg, amellyel regisztráltál, és amelyet megerősítettél.' }),
    s2: Object.freeze({ title: 'A jelszó', body: 'A „Jelszó megjelenítése” jelölővel ellenőrizheted, mit írtál be.' }),
    s3: Object.freeze({ title: 'Belépés', body: 'Ha a cím vagy a jelszó nem jó, a rendszer nem mondja meg, melyik — ez védi a fiókokat.' }),
  }),
  'tour.resend': Object.freeze({
    title: 'Új megerősítő levél kérése',
    lead: 'Két lépés. Akkor kell, ha a korábbi levél lejárt, vagy nem találod.',
    s1: Object.freeze({ title: 'Az e-mail cím', body: 'Ugyanazt a címet add meg, amellyel regisztráltál.' }),
    s2: Object.freeze({ title: 'Küldés', body: 'Mindig a legutóbbi levél hivatkozását használd: az új levél érvényteleníti a korábbit.' }),
  }),
  'tour.logout': Object.freeze({
    title: 'Kilépés',
    lead: 'Két lépés. A kilépés a saját eszközödön zárja a munkamenetet.',
    s1: Object.freeze({ title: 'Nyisd meg a profil-menüt', body: 'A fejléc jobb szélén, a címed alatt. Ez a menü minden fiókban ott van — a személyes és a vállalkozási nézetben is.' }),
    s2: Object.freeze({ title: 'Kilépés', body: 'A profil-menüben találod. A kilépés után a böngészőben nem marad a fiókodhoz tartozó adat — a következő belépő nem a te nézetedet látja.' }),
  }),
  'tour.personalAccount': Object.freeze({
    title: 'A személyes fiókod',
    lead: 'Két lépés. Olvasó nézet: semmit nem mentünk el közben.',
    s1: Object.freeze({ title: 'Melyik fiókban vagy', body: 'A fejléc mindig megmutatja, melyik fiók adatát látod. A személyes fiók a belépéssel megvan — nem kell létrehozni.' }),
    s2: Object.freeze({ title: 'A fiókválasztó', body: 'Itt váltasz a személyes fiókod és a vállalkozások között, és itt tudsz újat létrehozni. A tagság és a megtekintési engedély két külön állapot.' }),
  }),
  'tour.documents': Object.freeze({
    title: 'A Bizonylatok lap',
    lead: 'Három lépés. Olvasó nézet: bizonylatot itt ma nem lehet kiállítani.',
    s1: Object.freeze({ title: 'Nyisd meg a Bizonylatokat', body: 'A Műveletek csoportban találod. A lap a fiók mintaadatát mutatja.' }),
    s2: Object.freeze({ title: 'A minta-bizonylat', body: 'A szakasz jelölve van: ez minta, nem a fiók valódi bizonylata.' }),
    s3: Object.freeze({ title: 'A teljes minta', body: 'A részletes alak a sorokat is megnyitja. A valódi bizonylatok megtekintéséhez a fiókkezelő külön engedélyt ad.' }),
  }),
  'tour.partners': Object.freeze({
    title: 'A Partnerek lap',
    lead: 'Két lépés. Olvasó nézet: partnert itt ma nem lehet felvenni.',
    s1: Object.freeze({ title: 'Nyisd meg a Partnereket', body: 'A Törzsadatok csoportban találod. A lap a fiók mintaadatát mutatja.' }),
    s2: Object.freeze({ title: 'A minta-beszállító', body: 'A szakasz jelölve van: ez minta. A valódi partner-adatokhoz a fiókkezelő ad engedélyt.' }),
  }),
  'tour.assistant': Object.freeze({
    title: 'A segéd — Kérdezz',
    lead: 'Négy lépés. A segéd elmagyaráz és eligazít; helyetted nem kattint.',
    s1: Object.freeze({ title: 'Nyisd meg a súgót', body: 'A fejléc súgó-gombja nyitja. A súgó füleken áll, és az egyik a Kérdezz.' }),
    s2: Object.freeze({ title: 'A Kérdezz fül', body: 'Itt a saját szavaiddal kérdezhetsz. A segéd csak arról beszél, amiről tudása van.' }),
    s3: Object.freeze({ title: 'A kérdés', body: 'Több sort is írhatsz: az Enter sortörés, a kérdést a küldés viszi el.' }),
    s4: Object.freeze({ title: 'Küldés', body: 'A válasz csak az átadott tudásra hivatkozhat. Ha nincs rá forrás, a segéd ezt kimondja, és nem talál ki választ.' }),
  }),
  'tour.products': Object.freeze({
    title: 'A Termékek lap',
    lead: 'Három lépés. Olvasó nézet: terméket itt ma nem lehet felvenni.',
    s1: Object.freeze({ title: 'Nyisd meg a Termékeket', body: 'A Törzsadatok csoportban találod. A lap a fiók mintaadatát mutatja.' }),
    s2: Object.freeze({ title: 'A lista', body: 'Megnevezés, azonosító és a hozzá tartozó adatok. A sorok mintaadatok, és jelölve vannak.' }),
    s3: Object.freeze({ title: 'A kereső', body: 'Szűkítheted a listát. Csak a megjelenített sorokra hat — a fiókban semmi nem változik tőle.' }),
  }),
  'tour.stockcard': Object.freeze({
    title: 'A Készletkarton lap',
    lead: 'Két lépés. Engedélyhez kötött nézet: a karton csak akkor rajzol, ha a fiókkezelő kiadta a készletadatokat. Helyetted nem adunk jogot — a jogadás útját a Hozzáférés megadása útmutató vezeti végig.',
    s1: Object.freeze({ title: 'Nyisd meg a Készletkartont', body: 'A Kimutatások csoportban találod.' }),
    s2: Object.freeze({ title: 'A karton', body: 'Egy termék mozgásai időrendben. Ha a készlet-adatkör nincs kiadva, a lap ezt kimondja, és nem mutat sorokat.' }),
  }),
  'tour.movements': Object.freeze({
    title: 'A Mozgások lap',
    lead: 'Két lépés. Ugyanazon a kapun áll, mint a Készletegyenleg: a mozgások csak kiadott készlet-engedéllyel rajzolnak. Helyetted nem adunk jogot.',
    s1: Object.freeze({ title: 'Nyisd meg a Mozgásokat', body: 'A Kimutatások csoportban találod.' }),
    s2: Object.freeze({ title: 'A mozgás-tábla', body: 'Bevét és kiadás időrendben. Engedély nélkül a lap kimondja, hogy nincs mit mutatnia — nem üres táblát ad.' }),
  }),
  'tour.outbox': Object.freeze({
    title: 'A Próbaüzenetek lap',
    lead: 'Három lépés. Ez a próbafelület levél-fogadója: a rendszer leveleit valódi postafiók nélkül lehet megnyitni.',
    s1: Object.freeze({ title: 'Nyisd meg a Próbaüzeneteket', body: 'A Műveletek csoportban találod. A lap kimondja, mire jó ez a nézet.' }),
    s2: Object.freeze({ title: 'A megnyitó gomb', body: 'A fejlécben is ott van, minden lapon. Ez tárja fel a levél-fogadót.' }),
    s3: Object.freeze({ title: 'A levél-fogadó', body: 'A meghívó- és megerősítő levelek itt jelennek meg. A bennük lévő hivatkozást te nyitod meg.' }),
  }),
  'tour.accountSettings': Object.freeze({
    title: 'A fiók adatai',
    lead: 'Három lépés. Olvasó nézet: itt ma nem módosítasz semmit.',
    s1: Object.freeze({ title: 'Nyisd meg a fiók lapját', body: 'A Beállítások csoportban találod. Azt a fiókot mutatja, amelyik most meg van nyitva.' }),
    s2: Object.freeze({ title: 'Mit látsz', body: 'A fiók neve, a te szereped benne, az előfizetés és a megadott vállalkozási adat.' }),
    s3: Object.freeze({ title: 'A kimondott határ', body: 'A vállalkozási adatról kiírjuk: megadott adat, nem ellenőrzött — hatóságnál nem igazoltuk.' }),
  }),
});

/**
 * A FORDÍTÁS ÁLLAPOTA FUNKCIÓNKÉNT (R89 §3: „Nyelvenként a forrásverzió és ellenőrzési állapot").
 * A magyar a forrás, ezért itt minden bejegyzés a funkció MAI verzióját viszi, `review: 'source'`.
 * A mérés (`verify:i18n`) ezt a `features.mjs` `version` mezőjéhez hasonlítja: eltérésnél ELAVULT.
 */
// AZ ÖT HASZNÁLATI ÚT (R112 · STR-01 · `v3app/knowledge/stories.mjs`): a történet címe és rövid bevezetője.
// A lépések magyarázata a MEGLÉVŐ bemutató- és súgószövegekből jön — itt nincs második, azonos tartalmú változat.
export const STORY = Object.freeze({
  // A KÁRTYA NEVE ÉS KÉT MONDATA (R114/6 · R114/7): a név azt mondja meg, MIT próbálsz ki, a két
  // mondat a CSELEKVÉST és az EREDMÉNYT. Fejlesztői megfogalmazás ide nem kerül (R114/8) — a mérés
  // és a forrás az „Ellenőrzési részletek" lenyíló alatt áll.
  'story.private': Object.freeze({
    title: 'Személyes fiók',
    lead: 'Regisztrálj, erősítsd meg a címedet, és lépj be. A személyes fiókod megnyílik, és a választott nyelv a következő belépésnél is megmarad.',
  }),
  'story.solo': Object.freeze({
    title: 'Vállalkozás hozzáadása',
    lead: 'Add hozzá a vállalkozásodat a meglévő belépéseddel. Utána egy kattintással válthatsz a személyes és a vállalkozási fiókod között.',
  }),
  'story.growing': Object.freeze({
    title: 'Munkatárs meghívása',
    lead: 'Hívd meg a munkatársadat. Megnézheted, hogyan fogadja el a meghívást, és jut el a vállalkozás fiókjába.',
  }),
  'story.multi': Object.freeze({
    title: 'Váltás a fiókok között',
    lead: 'Válts az egyik vállalkozásból a másikba. Látod, hogy a fejléc mindig megmondja, melyik fiókban vagy, és hogy a fiókok adatai nem keverednek.',
  }),
  'story.team': Object.freeze({
    title: 'Hozzáférések kezelése',
    lead: 'Engedélyezd egy munkatársnak a készletadatok megtekintését, majd vond vissza. Látod, mit lát ő a két állapotban.',
  }),
  'story.invites': Object.freeze({
    title: 'Probléma a meghívóval',
    lead: 'Nyisd meg ugyanazt a meghívó-képernyőt öt helyzetben. Látod, mit mond a lap, és mi a következő lépés, ha a meghívó lejárt vagy már felhasznált.',
  }),
});

// A FOGALMAK SZAVAI (R112 · P109-02) — a feladathoz kötött terminológiai megfeleltetés a szavak OTTHONÁBAN.
// Egy fogalom = egy szó a képernyőn, a levélben, a súgóban, a gyakori kérdésekben és a bemutatóban. A három
// nyelv ugyanazokat a fogalom-kulcsokat viszi (I18N07 méri); új nyelv ugyanezt a táblát tölti ki.
export const TERMS = Object.freeze({
  signIn: 'belépés',
  personalAccount: 'személyes fiók',
  businessAccount: 'vállalkozási fiók',
  sharedAccount: 'közös fiók',
  membership: 'tagság',
  member: 'tag',
  accountManager: 'fiókkezelő',
  access: 'hozzáférés',
  dataArea: 'adatkör',
  invitation: 'meghívás',
  guidedTour: 'lépésenkénti útmutató',
  helpTopic: 'leírás',
  sandbox: 'próbafelület',
  help: 'súgó',
  faq: 'gyakori kérdések',
  plan: 'csomag',
  aiService: 'MI-szolgáltató',
});
/** KERÜLENDŐ a felhasználói szövegben — az I18N07 őr PIROS, ha előfordul (a technikai részletek kivételek). */
export const TERMS_AVOID = Object.freeze([
  Object.freeze({ re: '\\b(tenant|scope|payload|endpoint|fixture|provider)\\b', why: 'belső gépi szó a fő szövegben' }),
  Object.freeze({ re: '\\b(cégtér|munkatér|munkakörnyezet)', why: 'a V2 szava — a V3 felületén: fiók' }),
  Object.freeze({ re: 'elszámolás', why: 'az útmutató összegzése nem elszámolás (számlázást sugall)' }),
  // D1 (R114/1): a „bemutató” KÉT dolgot jelentett — a mintaadatos környezetet és a vezetett segítséget.
  // Mostantól: PRÓBAFELÜLET · mintaadatok, illetve LÉPÉSENKÉNTI ÚTMUTATÓ. A régi szó visszacsúszása piros.
  Object.freeze({ re: 'bemutató', why: 'a mintaadatos környezet: próbafelület · a vezetett segítség: lépésenkénti útmutató' }),
  Object.freeze({ re: 'szolgáltatói csatlakozás', why: 'a csatlakozás a fiókhoz csatlakozás szava — az MI-hez: kapcsolat' }),
]);

export const KB_SOURCE = Object.freeze({
  'auth.register': Object.freeze({ source_version: '1.2.0', review: 'source' }),
  'auth.verify': Object.freeze({ source_version: '1.1.0', review: 'source' }),
  'auth.login': Object.freeze({ source_version: '1.2.0', review: 'source' }),
  'auth.resend': Object.freeze({ source_version: '1.2.0', review: 'source' }),
  'auth.logout': Object.freeze({ source_version: '1.1.0', review: 'source' }),
  'account.personal': Object.freeze({ source_version: '1.1.0', review: 'source' }),
  'account.add_business': Object.freeze({ source_version: '1.2.0', review: 'source' }),
  'account.switch': Object.freeze({ source_version: '1.2.0', review: 'source' }),
  'invite.send': Object.freeze({ source_version: '1.2.0', review: 'source' }),
  'invite.accept': Object.freeze({ source_version: '1.3.0', review: 'source' }),
  'members.list': Object.freeze({ source_version: '1.2.0', review: 'source' }),
  'members.grant': Object.freeze({ source_version: '1.2.0', review: 'source' }),
  'invite.revoke': Object.freeze({ source_version: '1.0.0', review: 'source' }),
  'members.reinvite': Object.freeze({ source_version: '1.0.0', review: 'source' }),
  'members.scopeRevoke': Object.freeze({ source_version: '1.0.0', review: 'source' }),
  'data.documentSample': Object.freeze({ source_version: '1.0.0', review: 'source' }),
  'data.supplierSample': Object.freeze({ source_version: '1.0.0', review: 'source' }),
  'members.revoke': Object.freeze({ source_version: '1.2.0', review: 'source' }),
  'plan.change': Object.freeze({ source_version: '1.1.0', review: 'source' }),
  'data.stock': Object.freeze({ source_version: '1.2.0', review: 'source' }),
  'data.price': Object.freeze({ source_version: '1.2.0', review: 'source' }),
  'shell.navigation': Object.freeze({ source_version: '1.3.0', review: 'source' }),
  'shell.profile': Object.freeze({ source_version: '1.1.0', review: 'source' }),
  'shell.language': Object.freeze({ source_version: '1.0.0', review: 'source' }),
  'shell.help': Object.freeze({ source_version: '1.1.0', review: 'source' }),
  'shell.assistant': Object.freeze({ source_version: '1.1.0', review: 'source' }),
  'shell.demo_mail': Object.freeze({ source_version: '1.0.0', review: 'source' }),
  'shell.sample_pages': Object.freeze({ source_version: '1.2.0', review: 'source' }),
  'profile.edit': Object.freeze({ source_version: '1.0.0', review: 'source' }),
  'security.password_change': Object.freeze({ source_version: '1.0.0', review: 'source' }),
  'shell.numbered_probe': Object.freeze({ source_version: '1.1.0', review: 'source' }),
  'data.warehouses': Object.freeze({ source_version: '1.0.0', review: 'source' }),
  'data.processes': Object.freeze({ source_version: '1.0.0', review: 'source' }),
  'data.stockcard': Object.freeze({ source_version: '1.0.0', review: 'source' }),
  'data.movements': Object.freeze({ source_version: '1.0.0', review: 'source' }),
  'account.settings': Object.freeze({ source_version: '1.0.0', review: 'source' }),
  'personal.ownMatters': Object.freeze({ source_version: '1.0.0', review: 'source' }),
});

/**
 * A KERESÉS KULCSSZAVAI FUNKCIÓNKÉNT (R89 §6: „Keresés az útmutatókban").
 *
 * MIÉRT KELL, ÉS MIÉRT A NYELVCSOMAGBAN. A magyar RAGOZÓ nyelv: a „hogyan hívhatok meg valakit?"
 * kérdés egyetlen szava sem egyezik szó szerint a „Felhasználó meghívása" címmel. Egy gépi tövező
 * nélkül a puszta szó-egyezés a HELYES találatot kihagyja, és a rosszat behozza — ezt a saját első
 * mérésem meg is tette (a „jelszó megváltoztatása" került elő a meghívás kérdésére). A kulcsszó
 * NYELVI tartalom, tehát a nyelvcsomagban él, nem a gépi regiszterben (TUD-01 nem szavakat tart).
 *
 * AMIT EZ NEM: nem szemantikus kereső és nem modell. Kimondva: szó-halmaz egyezés, a `verify:tutor`
 * pedig azt méri, hogy MINDEN funkciónak és MINDEN bekapcsolt nyelvnek van kulcsszó-sora.
 */
export const SEARCH = Object.freeze({
  'auth.register': 'regisztráció regisztrálás fiók létrehozása új fiók feliratkozás jelszó e-mail cím megadása',
  'auth.verify': 'megerősítés megerősítő link levél e-mail hitelesítés aktiválás lejárt link',
  'auth.login': 'bejelentkezés belépés beléptetés jelszó nem működik nem tudok belépni',
  'auth.resend': 'új levél újraküldés megerősítő levél kérése nem jött meg a levél',
  'auth.logout': 'kijelentkezés kilépés kiléptetés',
  'account.personal': 'személyes fiók saját fiók magánfiók ügyleteim',
  'account.add_business': 'vállalkozás hozzáadása cég létrehozása új cég közös fiók adószám adóazonosító céges fiók',
  'account.switch': 'fiókváltás váltás másik fiók fiókválasztó átváltás cégváltás',
  'invite.send': 'meghívás meghívó meghívni valakit kollégát felhasználót hívni invitálás csatlakozás kérése küldése',
  'invite.accept': 'meghívás elfogadása csatlakozás meghívóval beváltás elfogadom a meghívást lejárt meghívó meghívóm érvénytelen hivatkozás rossz címre szól',
  'members.list': 'felhasználók tagok kik látják hozzáférések listája tagság',
  'members.grant': 'engedélyezés jogosultság adása adatkör megtekintés engedélye hozzáférés adása',
  'invite.revoke': 'meghívás visszavonása meghívó visszavonás kiküldött link érvénytelenítés elfogadásra vár visszavont meghívó',
  'members.reinvite': 'újra meghívás visszahívás eltávolított munkatárs újbóli belépés visszavétel újrafelvétel',
  'members.scopeRevoke': 'hozzáférés visszavonása adatkör elvétele csak az árakat részleges visszavonás',
  'data.documentSample': 'bizonylat minta dokumentum fejléc vegyes bizonylat összeg',
  'data.supplierSample': 'beszállító minta partner kapcsolati adat',
  'members.revoke': 'megszüntetés visszavonás kizárás hozzáférés elvétele eltávolítás',
  'plan.change': 'előfizetés csomag csomagváltás díj vásárlás alap bővített',
  'data.stock': 'készlet készletegyenleg mennyiség raktár nem látom a készletet termékkarton mozgások',
  'data.price': 'ár árak egységár nem látom az árakat árlista',
  'shell.navigation': 'menü keret fülek munkalapok navigáció hol találom eltűnt a menüpont',
  'shell.profile': 'profil saját adatok e-mail állapota ki nevében járok el',
  'shell.language': 'nyelv nyelvváltás magyar angol német fordítás felület nyelve',
  'shell.help': 'súgó segítség útmutató gyakori kérdések oldaltérkép hol kérdezhetek',
  'shell.assistant': 'chat segéd asszisztens kérdezés mesterséges intelligencia ai válasz',
  'shell.demo_mail': 'próbaüzenetek levelek levél-fogadó postafiók próbafelület bemutató levél',
  'shell.sample_pages': 'termékek partnerek raktárak folyamatok bizonylatok mintaadat lista',
  'profile.edit': 'profil szerkesztése saját adatok módosítása átírás',
  'security.password_change': 'jelszó megváltoztatása jelszócsere új jelszó',
  'shell.numbered_probe': 'régi felület számozott próbafelület kivezetve',
  'data.warehouses': 'raktár raktárak raktárlista telephely raktárfelvétel tételszám',
  'data.processes': 'folyamat folyamatok állapot beérkezés lezárva folyamatban állapotszűrő folyamatindítás',
  'data.stockcard': 'termékkarton karton termékadatlap mennyiség raktár készletkarton',
  'data.movements': 'készletmozgás készletmozgások mozgáslista időrend mozgásrögzítés bevét kivét',
  'account.settings': 'fiókadatok fiókbeállítások szerep előfizetés adószám adóazonosító vállalkozási adat',
  'personal.ownMatters': 'saját ügyek ügyeim személyes ügyek üres lap',
});

/**
 * A SZERVER ÁLTAL RAJZOLT LAPOK ÉS A PRÓBAÜZENETEK SZÖVEGE (F91-02).
 *
 * A LELET (a külső ellenőrző fél, chatgpt-v3, R91): a megerősítő oldal `lang="hu"` jelöléssel és
 * MAGYAR mondatokkal készült a `server.mjs`-ben, és a megerősítő/meghívó próbaüzenetek szövege is a
 * szerverben maradt — ezek tehát KÍVÜL estek az „589 kulcs mindhárom nyelven" mérésen. A teljes
 * használati út (regisztráció → megerősítés → alkalmazás → meghívó) nem lehet félig fordított: a
 * szerver-oldali szöveg ugyanebből a szótárból jön, ugyanazzal a visszaesési lánccal (SZO-01).
 */
export const SRV = Object.freeze({
  verifyTitleOk: 'Az e-mail-címed megerősítve',
  verifyTitleBad: 'Ez a megerősítő hivatkozás már nem érvényes',
  verifyPageTitle: 'E-mail-cím megerősítése — VS',
  verifyOkLead: 'A(z) {cim} cím megerősítve. Mostantól be tudsz lépni.',
  verifyOkLeadPersonal: 'A(z) {cim} cím megerősítve. Mostantól be tudsz lépni, és a személyes fiókod („{nev}”) is készen áll.',
  verifyBadLead: '{indok} Kérj új megerősítő levelet a címedre — a jelszavad nem változik, és új fiókot sem kell létrehoznod.',
  verifyBack: 'Tovább a belépéshez',
  verifyBackShort: 'Vissza a belépéshez',
  verifyResend: 'Új megerősítő levél kérése',
  verifyTech: 'Technikai részletek',
  // A NÉGY OK MONDATA — a kulcs a MAG hibakódja, hogy a megfeleltetés ne kézi táblán álljon.
  reason_challenge_expired: 'A hivatkozás 24 óráig élt, és ez az idő letelt.',
  reason_challenge_already_used: 'Ezt a hivatkozást már felhasználták. Ha te voltál, egyszerűen lépj be.',
  reason_challenge_superseded: 'Ehhez a címhez újabb megerősítő levelet kértek, ezért ez a hivatkozás már nem érvényes. A legutóbbi levélben lévő hivatkozás működik.',
  reason_challenge_unknown: 'Ez a hivatkozás nem használható — lehet, hogy hiányosan másolódott ki a levélből.',
  mailVerifySubject: 'Erősítsd meg az e-mail-címedet',
  mailVerifyBody: 'Kattints a hivatkozásra, hogy bizonyítsd: ez a cím a tiéd. A hivatkozás {ora} óráig érvényes. Ha lejár, a belépési képernyőn kérhetsz újat.',
  mailResendSubject: 'Új megerősítő hivatkozás',
  mailResendBody: 'Új hivatkozást kértél a cím megerősítéséhez. A korábbi hivatkozás ettől érvénytelen, ez a hivatkozás 24 óráig érvényes. A jelszavad nem változott.',
  mailInviteSubject: 'Meghívás: {fiok}',
  mailInviteBody: 'Meghívást kaptál ebbe a fiókba: {fiok}. Nyisd meg a hivatkozást: ott látod, mit ad a meghívás, és ott fogadhatod el. Ha még nincs belépésed, a megnyitás után regisztrálhatsz.',
});
