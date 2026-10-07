// v3app/knowledge/features.mjs — TUD-01: EGY FUNKCIÓ, EGY VERZIÓZOTT TUDÁSFORRÁS (R89 §3).
//
// MIÉRT EZ AZ ALAK. A terv kikötése: „Funkcióként egy verziózott leírás legyen… A feliratok
// fordítási kulcsokra, a menüpontok és műveletek meglévő azonosítókra hivatkozzanak." Ezért ez a
// fájl GÉPI TÉNYEKET tart (azonosító · modul · verzió · állapot · képernyő · művelet · kapu ·
// kimenetek · AI-szerződés · bizonyíték), a SZAVAKAT pedig NEM: azok a nyelvcsomagokban állnak
// (`v3app/public/i18n/<nyelv>.mjs` → `KB` · `FAQ` · `TOUR`). Így egy fordítás nem tud „fél
// funkciót" leírni, és a mérés (`verify:i18n`) nyelvenként ki tudja mondani, mi hiányzik.
//
// AMIT EZ A FÁJL SOHA NEM TESZ (a terv §6 kikötése): jogosultságot NEM másol és NEM dönt el. Az
// `authority` mező HIVATKOZÁS a szerver meglévő ellenőrzésére (végpont + a mag nevezett okai) —
// hogy a súgó és a segéd MEGMONDHASSA, hol dől el a kérdés, de eldönteni ne próbálja (KUKA-047).
//
// A VERZIÓ JELENTÉSE. A `version` a LEÍRÁS változata, nem a kód verziója. Ha egy funkció leírása
// változik, a verzió NŐ, és minden nyelvcsomag `KB_SOURCE` bejegyzése ehhez mérve lesz „ellenőrzött"
// vagy „ELAVULT" — a fordítás lemaradása így nem néma (R89 §3 utolsó bekezdése · KUKA-050).
//
// AZ ÁLLAPOT NEM DÍSZ. `working` = használható · `demo` = mintaadat, üzleti végrehajtás nélkül ·
// `planned` = még nincs meg · `retired` = kivezetve. A segéd és a súgó a `planned`-et SOHA nem
// tanítja kész szolgáltatásként, a `retired` pedig nem lehet aktív találat (a `replaced_by` viszi
// tovább a felhasználót) — ezt a `verify:tutor` MÉRI, nem a jóindulat.

/**
 * AZ ENGEDÉLYEZETT MŰVELETEK — a segéd és a bemutató CSAK ezeket nyithatja meg (AST-01).
 *
 * MIÉRT ZÁRT LISTA: „A modell válasza és a tudásanyag adat, nem futtatható utasítás. Csak
 * engedélyezett műveletazonosító és érvényes, típusellenőrzött paraméter nyithat folytatást."
 * A `kind` mondja meg, mit tesz: `open_page` egy meglévő menüpontot nyit, `open_panel` egy meglévő
 * szerkesztőt készít elő. ÍRÁS EGYIKBEN SEM történik — a mentést a felhasználó végzi el.
 */
/**
 * A MŰVELETENKÉNT MEGENGEDETT PARAMÉTER-MEZŐK — ZÁRT lista, nem típus-szabály (F91-05).
 *
 * A LELET (a külső ellenőrző fél, chatgpt-v3, R91): `acceptAction({ id:'open.overview',
 * params:['bad'] })` SIKERREL járt, és `{0:'bad'}` paraméter-objektumot adott — a TÖMB kimaradt a
 * nevezett elutasításból, és a „primitív típus, tehát bármi mehet" szabály minden kitalált mezőt
 * átvett. Mostantól a művelet KIMONDJA, mely mezőt fogadja el; ami nincs a listán, az NEVEZETTEN
 * elutasított (`param_unknown`), és a tömb is (`invalid_type`).
 */
export const ACTION_PARAMS = Object.freeze({
  'open.stock': Object.freeze(['focus']),
  'open.members': Object.freeze(['focus', 'tab']),
  'open.profile': Object.freeze(['focus']),
  'prepare.invite': Object.freeze(['focus']),
  'prepare.plan': Object.freeze(['focus']),
  'prepare.business': Object.freeze(['focus']),
});

export const ACTIONS = Object.freeze({
  'open.overview': Object.freeze({ audience: 'signed_in', scope: 'person', kind: 'open_page', page: 'overview', writes: false }),
  'open.stock': Object.freeze({ audience: 'signed_in', scope: 'book', kind: 'open_page', page: 'stock', writes: false }),
  'open.movements': Object.freeze({ audience: 'signed_in', scope: 'book', kind: 'open_page', page: 'movements', writes: false }),
  'open.stockcard': Object.freeze({ audience: 'signed_in', scope: 'book', kind: 'open_page', page: 'stockcard', writes: false }),
  'open.members': Object.freeze({ audience: 'signed_in', scope: 'book', kind: 'open_page', page: 'members', writes: false, requires_role: 'admin' }),
  'open.plan': Object.freeze({ audience: 'signed_in', scope: 'book', kind: 'open_page', page: 'plan', writes: false, requires_role: 'admin' }),
  'open.account': Object.freeze({ audience: 'signed_in', scope: 'book', kind: 'open_page', page: 'account', writes: false, requires_role: 'admin' }),
  'open.profile': Object.freeze({ audience: 'signed_in', scope: 'person', kind: 'open_page', page: 'profile', writes: false }),
  'open.security': Object.freeze({ audience: 'signed_in', scope: 'person', kind: 'open_page', page: 'security', writes: false }),
  'open.new': Object.freeze({ audience: 'signed_in', scope: 'person', kind: 'open_page', page: 'new', writes: false }),
  'open.products': Object.freeze({ audience: 'signed_in', scope: 'book', kind: 'open_page', page: 'products', writes: false }),
  'open.partners': Object.freeze({ audience: 'signed_in', scope: 'book', kind: 'open_page', page: 'partners', writes: false }),
  'open.warehouses': Object.freeze({ audience: 'signed_in', scope: 'book', kind: 'open_page', page: 'warehouses', writes: false }),
  'open.processes': Object.freeze({ audience: 'signed_in', scope: 'book', kind: 'open_page', page: 'processes', writes: false }),
  'open.documents': Object.freeze({ audience: 'signed_in', scope: 'book', kind: 'open_page', page: 'documents', writes: false }),
  'open.outbox': Object.freeze({ audience: 'signed_in', scope: 'person', kind: 'open_page', page: 'outbox', writes: false }),
  'open.personal': Object.freeze({ audience: 'signed_in', scope: 'person', kind: 'open_page', page: 'personal', writes: false }),
  // ELŐKÉSZÍTÉS: a MEGLÉVŐ űrlapot nyitja meg, kitöltve/kijelölve — a beküldés a felhasználóé.
  'prepare.invite': Object.freeze({ audience: 'signed_in', scope: 'book', kind: 'open_panel', page: 'members', panel: 'invite', writes: false, requires_role: 'admin' }),
  'prepare.plan': Object.freeze({ audience: 'signed_in', scope: 'book', kind: 'open_page', page: 'plan', focus: 'plan-select', writes: false, requires_role: 'admin' }),
  'prepare.business': Object.freeze({ audience: 'signed_in', scope: 'person', kind: 'open_page', page: 'new', focus: 'ws-name', writes: false }),
  'open.mailbox': Object.freeze({ audience: 'signed_in', scope: 'person', kind: 'open_panel', page: null, panel: 'mailbox', writes: false }),
});

/** A KIMENET-FAJTÁK — a terv §3 táblájából: a nem sikeres út is érthető legyen. */
/**
 * A HÉJ VEZÉRLŐI — EZEK NEM EGY LAPHOZ TARTOZNAK (R164/3, SAJÁT LELET).
 *
 * MIÉRT KELL KIMONDANI. A lefedési őr azt kérdezi, hogy egy bemutató LÉPÉSE eljutott-e egy adott
 * lapra, és ehhez a lap funkcióinak HORGONYAIT használja. A profil-menü, a kijelentkezés, a
 * fiókválasztó és a súgó-nyitó viszont a HÉJ-ban áll, MINDEN lapon — ha ezeket lap-azonosítónak
 * fogadnánk el, akkor az R164/3-ban megírt ÁTADÁS-lépés (`logout`) egyszerre „bejárná" a biztonsági
 * lapot is, ahol a bemutató soha nem volt. Ugyanaz a hiba-osztály, mint a közös tábla-horgonyé
 * (KUKA-239): a hatókör nélküli bizonyíték a szomszéd sort igazolja.
 *
 * AMIT EZ NEM ÁLLÍT: nem jogosultság és nem menü-lista. Csak azt mondja meg, mely vezérlők NEM
 * azonosítanak lapot — a lap azonosítója a menüpontja (`nav-<lap>`) vagy a saját, kizárólagos horgonya.
 */
/**
 * A SZEMÉLYES TÉR LAPJAI — EGY DEKLARÁLT HELYEN (R164 review, Codex, P2 — `KUKA-390` · `D-VS-3198`).
 *
 * MIÉRT KELL. A személyes körben a menü CSAK ezeket a lapokat tartalmazza; minden más lap ÜZLETI, és
 * oda a személyes térből nincs út. Az elérhetőségi feloldónak ezt tudnia kell, különben olyan
 * bemutatót kínál fel, aminek a célja nincs a lapon (`targetMissing`), vagy egy nem létező lapra
 * próbál navigálni.
 *
 * MIÉRT ITT, ÉS NEM A FELÜLET SZÖVEGEI KÖZÖTT. A menü FELIRATAI a nyelvcsomagokból jönnek, a LAP-LISTA
 * viszont DÖNTÉS — és a döntés a kódon áll, nem a feliraton (KUKA-221). A feloldó szerver-oldalon is
 * fut, ezért nem húzhatja be a böngésző szöveg-moduljait. A két lista szétcsúszását GÉP őrzi:
 * `verify:app-findings-r154` (AH csoport) összeveti ezt a `NAV_PERSONAL` lapjaival.
 */
export const PERSONAL_SCREENS = Object.freeze(['overview', 'personal', 'profile', 'security']);

export const SHELL_ANCHORS = Object.freeze(['profile', 'logout', 'account-switcher', 'help-open',
  'nav-toggle', 'brand', 'demo-mail-open', 'mailbox', 'actor-switch']);

export const OUTCOME_KINDS = Object.freeze(['success', 'empty', 'missing', 'refused', 'error', 'uncertain']);

const F = (o) => Object.freeze(o);

/**
 * A FUNKCIÓK. A hatókör a terv §7 hat folyamatcsoportja — és a leltár a TÉNYLEGES felületből jön
 * (`v3app/public/app.js` oldalai + a `v3app/server.mjs` végpontjai), nem egy kívánság-listából.
 */
export const FEATURES = Object.freeze([
  F({
    id: 'auth.register', module: 'auth', version: '1.2.0', status: 'working',
    group: 'auth', scope: 'person', audience: 'public', screen: null, action: null, entry: 'register-form',
    anchors: F(['register-email', 'register-password', 'register-submit']),
    authority: F({ endpoint: 'POST /api/register', decided_by: 'v3ref/account.mjs',
      reasons: F(['invalid_type', 'missing_field', 'invalid_value']) }),
    outcomes: F(['success', 'refused', 'uncertain', 'error']),
    ai: F({ explain: true, open: true, prepare: false,
      note: 'jelszót és belépési titkot a segéd nem kér és nem tölt ki — azt a belépési felület intézi' }),
    faq: F(['faq.register.neutral', 'faq.register.noMail']),
    tour: 'tour.register',
    evidence: F(['v3app/selfcheck.mjs', 'tests/e2e/v3app-core-flow.spec.mjs']),
  }),
  F({
    id: 'auth.verify', module: 'auth', version: '1.1.0', status: 'working',
    group: 'auth', scope: 'person', audience: 'public', screen: null, action: 'open.mailbox', entry: 'demo-mail-open',
    anchors: F(['demo-mail-open', 'mailbox']),
    authority: F({ endpoint: 'GET /api/verify', decided_by: 'v3ref/account.mjs (CHR-01)',
      reasons: F(['challenge_expired', 'challenge_used', 'challenge_superseded', 'challenge_not_found']) }),
    outcomes: F(['success', 'refused', 'error']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F(['faq.verify.expired', 'faq.verify.used']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'a megerősítés EGY hivatkozás a levélből: nincs több lépése, amit végig lehetne vezetni — a levél útját a bemutató levél-fogadó (`shell.demo_mail`) mutatja meg',
    evidence: F(['v3app/selfcheck.mjs', 'v3app/findings_r75.mjs']),
  }),
  F({
    id: 'auth.login', module: 'auth', version: '1.2.0', status: 'working',
    group: 'auth', scope: 'person', audience: 'public', screen: null, action: null, entry: 'login-form',
    anchors: F(['login-email', 'login-password', 'login-submit']),
    authority: F({ endpoint: 'POST /api/login', decided_by: 'v3ref/account.mjs',
      reasons: F(['invalid_credentials', 'credentials_rejected']) }),
    outcomes: F(['success', 'refused', 'uncertain']),
    ai: F({ explain: true, open: false, prepare: false,
      note: 'a belépést a segéd nem végzi el és nem készíti elő: jelszó nem kerül a beszélgetésbe' }),
    faq: F(['faq.login.failed']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'egy űrlap két mezővel; a regisztrációs bemutató utolsó lépése ide vezet',
    evidence: F(['v3app/selfcheck.mjs', 'tests/e2e/v3app-core-flow.spec.mjs']),
  }),
  F({
    id: 'auth.resend', module: 'auth', version: '1.2.0', status: 'working',
    group: 'auth', scope: 'person', audience: 'public', screen: null, action: null, entry: 'resend-form',
    anchors: F(['resend-email', 'resend-submit']),
    authority: F({ endpoint: 'POST /api/verification/resend', decided_by: 'v3ref/account.mjs',
      reasons: F(['resend_rate_limited', 'channel_already_proven']) }),
    outcomes: F(['success', 'refused', 'uncertain', 'error']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F(['faq.resend.why']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'egyetlen gomb a belépési képernyőn',
    evidence: F(['v3app/findings_r77.mjs']),
  }),
  F({
    id: 'auth.logout', module: 'auth', version: '1.1.0', status: 'working',
    // R144/F144-01: a funkció KIMONDJA, mely felületi műveletek tartoznak hozzá — a
    // lefedés ebből mér, nem kötőjeles részszó-egyezésből (az összekeverte a külön műveleteket).
    ui_actions: F(['logout']),
    group: 'auth', scope: 'person', audience: 'signed_in', screen: 'security', action: 'open.security', entry: 'logout',
    anchors: F(['logout']),
    authority: F({ endpoint: 'POST /api/logout', decided_by: 'v3app/server.mjs (munkamenet)', reasons: F([]) }),
    outcomes: F(['success']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    // R112 (1. történet): a kijelentkezés és az újrabelépés utáni nyelv kérdése — a TUT11 őr mérte hiánynak.
    faq: F(['faq.logout.language']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'egyetlen gomb a Belépés és biztonság oldalon',
    evidence: F(['v3app/selfcheck.mjs', 'tests/e2e/v3app-r97.spec.mjs', 'tests/e2e/v3app-r112-stories.spec.mjs']),
  }),
  F({
    id: 'account.personal', module: 'account', version: '1.1.0', status: 'working',
    group: 'account', scope: 'person', audience: 'signed_in', screen: 'overview', action: 'open.overview', entry: 'account-switcher',
    anchors: F(['account-switcher', 'header-workspace']),
    authority: F({ endpoint: 'GET /api/me', decided_by: 'v3ref/workspace.mjs (SZK-01)', reasons: F(['login_required']) }),
    outcomes: F(['success', 'empty']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F(['faq.account.personalVsBusiness']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'nem művelet, hanem ÁLLAPOT: a személyes fiók a belépéssel megvan',
    evidence: F(['v3app/selfcheck.mjs', 'tests/e2e/v3app-r85.spec.mjs']),
  }),
  F({
    id: 'account.add_business', module: 'account', version: '1.2.0', status: 'working',
    // R144/F144-01: a funkció KIMONDJA, mely felületi műveletek tartoznak hozzá — a
    // lefedés ebből mér, nem kötőjeles részszó-egyezésből (az összekeverte a külön műveleteket).
    ui_actions: F(['dismiss-after-create']),
    group: 'account', scope: 'person', audience: 'signed_in', screen: 'new', action: 'prepare.business', entry: 'ws-form',
    anchors: F(['nav-new', 'ws-kind-business', 'ws-name', 'ws-tax-id', 'ws-create']),
    authority: F({ endpoint: 'POST /api/workspaces', decided_by: 'v3ref/workspace.mjs + externalId.mjs (REP-01)',
      reasons: F(['name_required', 'tax_id_value_required', 'business_identity_already_attached',
        'creator_channel_unproven', 'namespace_not_in_profile', 'context_mismatch']) }),
    outcomes: F(['success', 'missing', 'refused', 'uncertain', 'error']),
    ai: F({ explain: true, open: true, prepare: true,
      note: 'az űrlapot előkészíti (fajta + név mező), a mentést a felhasználó végzi el a rendes űrlapon' }),
    faq: F(['faq.business.taxId', 'faq.business.alreadyAttached', 'faq.business.shared']),
    tour: 'tour.addBusiness',
    evidence: F(['v3app/findings_r77.mjs', 'tests/e2e/v3app-r85.spec.mjs']),
  }),
  F({
    id: 'account.switch', module: 'account', version: '1.2.0', status: 'working',
    // R144/F144-01: a MUNKAFELÜLET kimondva (nem menü, nem megnyitó) és a KÖZÖS bemutató
    // EXPLICIT kötése. Indok: a reentry 9. lépése TÉNYLEGESEN elvégzi a fiókváltást (task: actor.switched) — ez a funkció művelete
    surface: 'account-switcher',
    shared_tour: F({ tour: 'tour.reentry', steps: F(['s9']) }),
    // R144/F144-01: a funkció KIMONDJA, mely felületi műveletek tartoznak hozzá — a
    // lefedés ebből mér, nem kötőjeles részszó-egyezésből (az összekeverte a külön műveleteket).
    ui_actions: F(['unsaved-keep', 'unsaved-discard']),
    group: 'account', scope: 'person', audience: 'signed_in', screen: null, action: null, entry: 'account-switcher',
    anchors: F(['account-switcher', 'ws-list']),
    authority: F({ endpoint: 'POST /api/session/workspace', decided_by: 'v3ref/bitemporal.mjs (membershipAsOf)',
      reasons: F(['not_a_member', 'workspace_required']) }),
    outcomes: F(['success', 'refused', 'uncertain']),
    ai: F({ explain: true, open: false, prepare: false,
      note: 'fiókváltást a segéd nem indít el: a nyitott szerkesztőd elveszhetne — a váltást te végzed el' }),
    // R112 (4. történet): „mindig világos, melyik fiókban dolgozik és ott mire jogosult" — a fejléc
    // „ki nevében" sora a szerepkört a nyelvcsomag szavával mondja, és erre külön kérdés felel.
    faq: F(['faq.account.whichAccount', 'faq.account.unsaved']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'egyetlen lenyíló a fejlécben — a héj-bemutató (`tour.shell`) első lépése ezt mutatja meg',
    evidence: F(['tests/e2e/v3app-r81-ux.spec.mjs', 'v3app/findings_r79.mjs', 'tests/e2e/v3app-r112-stories.spec.mjs']),
  }),
  F({
    id: 'invite.send', module: 'delegation', version: '1.2.0', status: 'working',
    // R144/F144-01: a funkció KIMONDJA, mely felületi műveletek tartoznak hozzá — a
    // lefedés ebből mér, nem kötőjeles részszó-egyezésből (az összekeverte a külön műveleteket).
    ui_actions: F(['invite-open', 'invite-from-create']),
    group: 'invite', scope: 'book', audience: 'signed_in', screen: 'members', action: 'prepare.invite', entry: 'invite-form',
    anchors: F(['nav-members', 'invite-open', 'invite-email', 'invite-role', 'invite-scope', 'invite-submit']),
    authority: F({ endpoint: 'POST /api/invites', decided_by: 'v3ref/delegation.mjs + authz.mjs',
      reasons: F(['admin_required', 'role_not_delegable', 'scope_not_delegable', 'authority_not_established', 'context_mismatch']) }),
    outcomes: F(['success', 'refused', 'uncertain', 'error']),
    ai: F({ explain: true, open: true, prepare: true,
      note: 'a meghívó űrlapját előkészíti; a címzettet és a küldést a felhasználó hagyja jóvá' }),
    faq: F(['faq.invite.who', 'faq.invite.expiry', 'faq.invite.link']),
    tour: 'tour.invite',
    evidence: F(['tests/e2e/v3app-acceptance.spec.mjs', 'v3app/selfcheck.mjs']),
  }),
  F({
    id: 'invite.accept', module: 'invite', version: '1.3.0', status: 'working',
    // R144: a funkciót kiszolgáló TÁMOGATÓ OLVASÁSOK. Az `authority.endpoint` EGY végpontot
    // nevez meg (ahol a jog dől el); a felület viszont többet is hív — és a lefedési mérés joggal
    // mondta, hogy ezekről a tudás nem beszél. A kötés a HÍVÓ forrásából ellenőrizve.
    reads: F(['GET /api/invites/observe', 'POST /api/invites/pending']),
    // R144/F144-01: a funkció KIMONDJA, mely felületi műveletek tartoznak hozzá — a
    // lefedés ebből mér, nem kötőjeles részszó-egyezésből (az összekeverte a külön műveleteket).
    ui_actions: F(['redeem']),
    group: 'invite', scope: 'person', audience: 'public', screen: null, action: null, entry: 'section-invite',
    // A SZEMÉLYES TÉRBEN IS ÉRTELMES — és ez nem kényelmi kivétel, hanem a funkció LÉNYEGE (P109-01):
    // a meghívott ember MINDIG a személyes teréből indul, hiszen abban a vállalkozásban még nincs
    // tagsága. A csoport-szintű személyes-tér tiltás a KEZELŐI oldalt rejti el (mást meghívni ·
    // tagok · előfizetés); ez a funkció a MEGHÍVOTT sajátja, ezért kimondottan kivételt kap.
    personal_space_ok: true,
    // A HORGONYOK a meghívó-képernyő MINDIG MEGLÉVŐ pontjai (P109-01). A `invite-redeem` gomb
    // állapot-függő (csak a bejelentkezett, egyező címzettnek létezik), ezért a bemutató a
    // GOMBSORRA (`invite-actions`) áll, ami minden állapotban ott van — a hiányzó cél így nem
    // hamis megszakítás (KUKA-228 · KUKA-232).
    anchors: F(['invite-observe', 'invite-identity', 'invite-actions', 'invite-next', 'invite-redeem']),
    authority: F({ endpoint: 'POST /api/invites/redeem', decided_by: 'v3ref/invite.mjs',
      reasons: F(['invite_expired', 'invite_already_redeemed', 'invite_unknown', 'invite_terms_changed',
        'issuer_right_withdrawn', 'invitee_mismatch', 'channel_not_proven']) }),
    outcomes: F(['success', 'refused', 'uncertain', 'error']),
    ai: F({ explain: true, open: false, prepare: false,
      note: 'a meghívás elfogadása a felhasználó saját döntése — a segéd elmagyarázza, de nem kattintja meg' }),
    faq: F(['faq.invite.accept', 'faq.invite.wrongAddress', 'faq.invite.personalVsBusiness']),
    // A NEVEZETT NYITOTT TÉTEL LEZÁRVA (P109-01, R109): a bemutató megépült, és a korábbi indok is
    // megoldódott. A régi `tour: null` azért állt itt, mert a képernyő CSAK érvényes meghívó-
    // hivatkozásból nyílik meg, tehát a SÚGÓ FŐOLDALÁRÓL indított bemutató nem létező célra mutatna.
    // A megoldás NEM mesterséges meghívó: a bemutató `requires_invite`, vagyis a szerver CSAK akkor
    // kínálja fel, ha a munkamenetnek VAN meghívás-kontextusa (`resumeIntent`) — és a felület a
    // meghívó-képernyőről indítja. Így a cél mindig létezik, és védett adatot sem tárunk fel.
    tour: 'tour.inviteAccept',
    evidence: F(['tests/e2e/v3app-acceptance.spec.mjs', 'tests/e2e/v3app-r109-invite.spec.mjs']),
  }),
  F({
    id: 'members.list', module: 'delegation', version: '1.2.0', status: 'working',
    // R144/F144-01: a MUNKAFELÜLET kimondva (nem menü, nem megnyitó) és a KÖZÖS bemutató
    // EXPLICIT kötése. Indok: a reentry 2. lépése a TAG-LISTÁT nyitja meg, ami maga a funkció (olvasó képesség: a megtekintés a használat)
    surface: 'members-list',
    shared_tour: F({ tour: 'tour.reentry', steps: F(['s2']) }),
    // R144/F144-01: a funkció KIMONDJA, mely felületi műveletek tartoznak hozzá — a
    // lefedés ebből mér, nem kötőjeles részszó-egyezésből (az összekeverte a külön műveleteket).
    ui_actions: F(['member-open', 'members-tab']),
    group: 'members', scope: 'book', audience: 'signed_in', screen: 'members', action: 'open.members', entry: 'members-list',
    anchors: F(['nav-members', 'members-tab-members', 'members-tab-invites']),
    authority: F({ endpoint: 'GET /api/members', decided_by: 'v3ref/authz.mjs + bitemporal.mjs',
      reasons: F(['admin_required', 'not_a_member', 'login_required']) }),
    outcomes: F(['success', 'empty', 'refused', 'error']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F(['faq.members.membershipVsScope']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'a tag-lista a hozzáférés-bemutató (`tour.grant`) második lépése',
    evidence: F(['tests/e2e/v3app-acceptance.spec.mjs']),
  }),
  F({
    id: 'members.grant', module: 'delegation', version: '1.2.0', status: 'working',
    // R144/F144-01: a funkció KIMONDJA, mely felületi műveletek tartoznak hozzá — a
    // lefedés ebből mér, nem kötőjeles részszó-egyezésből (az összekeverte a külön műveleteket).
    ui_actions: F(['scope-grant']),
    group: 'members', scope: 'book', audience: 'signed_in', screen: 'members', action: 'open.members', entry: 'member-scope-row-keszlet',
    // R142/LEF-01: a JOGADÓ gomb is horgony — eddig csak a sor szerepelt.
    anchors: F(['nav-members', 'members-list', 'member-scope-row-keszlet', 'member-scope-grant-']),
    authority: F({ endpoint: 'POST /api/members/scope', decided_by: 'v3ref/delegation.mjs + scopeGrant.mjs',
      reasons: F(['admin_required', 'scope_not_delegable', 'authority_not_established', 'context_mismatch']) }),
    outcomes: F(['success', 'refused', 'uncertain']),
    ai: F({ explain: true, open: true, prepare: false,
      note: 'jogadást a segéd nem készít elő: a címzett és az adatkör párosítását a fiókkezelő maga választja ki' }),
    faq: F(['faq.members.grant']),
    tour: 'tour.grant',
    evidence: F(['tests/e2e/v3app-acceptance.spec.mjs', 'v3app/selfcheck.mjs']),
  }),
  F({
    // R121 §2 — A RÉSZLEGES VISSZAVONÁS. Külön képesség a teljes tagság megszüntetésétől: más a
    // szándék, más a következmény, és a felhasználónak is két külön dolgot jelent (KUKA-002).
    id: 'members.scopeRevoke', module: 'delegation', version: '1.0.0', status: 'working',
    // R144/F144-01: a funkció KIMONDJA, mely felületi műveletek tartoznak hozzá — a
    // lefedés ebből mér, nem kötőjeles részszó-egyezésből (az összekeverte a külön műveleteket).
    ui_actions: F(['scope-revoke']),
    group: 'members', scope: 'book', audience: 'signed_in', screen: 'members', action: 'open.members',
    entry: 'member-scope-row-arak',
    // R142/LEF-01: a MEGVONÓ gomb is horgony — eddig csak a sor szerepelt.
    anchors: F(['nav-members', 'members-list', 'member-scope-row-arak', 'member-scope-revoke-']),
    authority: F({ endpoint: 'POST /api/members/scope/revoke', decided_by: 'v3ref/delegation.mjs (SCR-01) + scopeGrant.mjs',
      reasons: F(['admin_required', 'authority_not_established', 'target_not_a_member', 'outside_basis_scopes', 'context_mismatch']) }),
    outcomes: F(['success', 'refused', 'uncertain']),
    ai: F({ explain: true, open: true, prepare: false,
      note: 'a visszavonást a segéd nem indítja el és nem készíti elő: jogot soha nem ad és nem vesz el' }),
    faq: F(['faq.members.scopeRevoke']),
    tour: 'tour.scopeLifecycle',
    evidence: F(['v3app/findings_r121.mjs', 'tests/e2e/v3app-r121.spec.mjs']),
  }),
  F({
    // R132 §2 — EGY FÜGGŐ MEGHÍVÁS VISSZAVONÁSA. A HARMADIK, külön megnevezett művelet a tagság
    // megszüntetése és az egy adatkör visszavonása MELLETT: három szándék, három gomb (KUKA-002).
    id: 'invite.revoke', module: 'invite', version: '1.0.0', status: 'working',
    // R144: a funkciót kiszolgáló TÁMOGATÓ OLVASÁSOK. Az `authority.endpoint` EGY végpontot
    // nevez meg (ahol a jog dől el); a felület viszont többet is hív — és a lefedési mérés joggal
    // mondta, hogy ezekről a tudás nem beszél. A kötés a HÍVÓ forrásából ellenőrizve.
    reads: F(['GET /api/invites/waiting']),
    // R144/F144-01: a funkció KIMONDJA, mely felületi műveletek tartoznak hozzá — a
    // lefedés ebből mér, nem kötőjeles részszó-egyezésből (az összekeverte a külön műveleteket).
    ui_actions: F(['invite-revoke', 'invite-revoke-start']),
    group: 'members', scope: 'book', audience: 'signed_in', screen: 'members', action: 'open.members',
    entry: 'members-tab-invites',
    // A MŰVELETET VÉGZŐ GOMB IS HORGONY (R142/LEF-01 lelete, KUKA-011 „hol kattint?"): a
    // lefedési mérés megmondta, hogy a `invite-revoke` műveletről a tudás nem beszélt.
    anchors: F(['nav-members', 'members-tab-invites', 'invites-list', 'invites-table', 'invite-revoke-confirm']),
    authority: F({ endpoint: 'POST /api/invites/revoke', decided_by: 'v3ref/invite.mjs (INVR-01) + authority.mjs',
      reasons: F(['admin_required', 'authority_not_established', 'invite_unknown', 'invite_ref_ambiguous',
        'invite_already_redeemed', 'invite_expired', 'outside_basis_roles', 'context_mismatch']) }),
    outcomes: F(['success', 'refused', 'uncertain']),
    ai: F({ explain: true, open: true, prepare: false,
      note: 'a visszavonást a segéd nem indítja el és nem készíti elő: jogot soha nem ad és nem vesz el' }),
    faq: F(['faq.invite.revoke']),
    tour: 'tour.inviteRevoke',
    evidence: F(['v3app/findings_r132.mjs', 'v3app/findings_r134.mjs',
      'tests/e2e/v3app-r132.spec.mjs', 'tests/e2e/v3app-r134.spec.mjs']),
  }),
  F({
    // R132 §3 — ÚJBÓLI MEGHÍVÁS EGY ELTÁVOLÍTOTT MUNKATÁRSNAK. A művelet AJÁNLATOT ad, nem tagságot;
    // a tagságot a címzett SAJÁT elfogadása hozza létre, és a régi adat-hozzáférések NEM állnak vissza.
    id: 'members.reinvite', module: 'delegation', version: '1.0.0', status: 'working',
    // R144/F144-01: a funkció KIMONDJA, mely felületi műveletek tartoznak hozzá — a
    // lefedés ebből mér, nem kötőjeles részszó-egyezésből (az összekeverte a külön műveleteket).
    ui_actions: F(['reinvite', 'reinvite-start']),
    group: 'members', scope: 'book', audience: 'signed_in', screen: 'members', action: 'open.members',
    entry: 'members-list',
    // R142/LEF-01: az újra-meghívás GOMBJA és a megerősítő űrlap is horgony.
    anchors: F(['nav-members', 'members-list', 'member-reinvite-', 'reinvite-form', 'reinvite-confirm']),
    authority: F({ endpoint: 'POST /api/members/reinvite', decided_by: 'v3ref/delegation.mjs (RNV-01) + bitemporal.mjs',
      reasons: F(['admin_required', 'authority_not_established', 'reentry_target_membership_is_open',
        'reentry_target_no_membership', 'reentry_blocked_suspension', 'reentry_blocked_ban',
        'reentry_blocked_open_review_circle', 'reentry_blocked_retroactive_invalidity',
        'reentry_not_after_revocation', 'reentry_target_has_no_address', 'outside_basis_roles',
        'outside_basis_scopes', 'context_mismatch',
        // R134/F134-03 — AZ EGYSZERI HATÁS KÉT ÚJ NEVEZETT KIMENETE (OON-01). Az ismétlés NEM hiba:
        // ugyanazt az ajánlatot adja vissza; az ELTÉRŐ tartalom viszont nevezett ütközés, és az
        // azonosság HIÁNYA nevezett elutasítás — a felhasználónak mindkettőről mondatot kell látnia.
        'operation_identity_conflict', 'operation_id_required']) }),
    outcomes: F(['success', 'refused', 'uncertain']),
    ai: F({ explain: true, open: true, prepare: false,
      note: 'a segéd elmagyarázza és megnyitja a képernyőt, de újbóli meghívást nem ad ki és meghívást nem fogad el a felhasználó helyett' }),
    faq: F(['faq.members.reinvite', 'faq.members.reinviteScopes']),
    tour: 'tour.reentry',
    evidence: F(['v3app/findings_r132.mjs', 'v3app/findings_r134.mjs',
      'tests/e2e/v3app-r132.spec.mjs', 'tests/e2e/v3app-r134.spec.mjs']),
  }),
  F({
    // R121 §1/§4 — A BIZONYLAT-MINTÁK. A fejléc TISZTA, a vegyes minta mind a négy kört igényli.
    id: 'data.documentSample', module: 'data', version: '1.0.0', status: 'working',
    // R144: a funkciót kiszolgáló TÁMOGATÓ OLVASÁSOK. Az `authority.endpoint` EGY végpontot
    // nevez meg (ahol a jog dől el); a felület viszont többet is hív — és a lefedési mérés joggal
    // mondta, hogy ezekről a tudás nem beszél. A kötés a HÍVÓ forrásából ellenőrizve.
    reads: F(['GET /api/data/document-full']),
    group: 'plan', scope: 'book', audience: 'signed_in', screen: 'documents', action: 'open.documents',
    entry: 'sample-document',
    anchors: F(['nav-documents', 'sample-document', 'sample-document-full']),
    authority: F({ endpoint: 'GET /api/data/document', decided_by: 'v3ref/resultScope.mjs (declaredScopesOfType) + entitlement.mjs',
      reasons: F(['no_scope_grant', 'not_available', 'feature_not_in_plan', 'context_mismatch', 'network_error']) }),
    outcomes: F(['success', 'missing', 'refused', 'error']),
    ai: F({ explain: true, open: true, prepare: false,
      note: 'a minta tartalmát a segéd nem továbbítja szolgáltatónak — csak a képernyő nyitható meg vele' }),
    faq: F(['faq.data.sampleAccess', 'faq.data.mixedDocument']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'a minta megnyitása EGY lap megnyitása: a végigvezetendő lépések a HOZZÁFÉRÉS oldalán vannak, ezért a `tour.scopeLifecycle` vezeti végig a megadást és a visszavonást — ez a lap annak a következményét mutatja',
    evidence: F(['v3app/findings_r121.mjs', 'tests/e2e/v3app-r121.spec.mjs']),
  }),
  F({
    id: 'data.supplierSample', module: 'data', version: '1.0.0', status: 'working',
    group: 'plan', scope: 'book', audience: 'signed_in', screen: 'partners', action: 'open.partners',
    entry: 'sample-supplier',
    anchors: F(['nav-partners', 'sample-supplier']),
    authority: F({ endpoint: 'GET /api/data/supplier', decided_by: 'v3ref/resultScope.mjs (declaredScopesOfType) + entitlement.mjs',
      reasons: F(['no_scope_grant', 'not_available', 'feature_not_in_plan', 'context_mismatch', 'network_error']) }),
    outcomes: F(['success', 'missing', 'refused', 'error']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F(['faq.data.sampleAccess']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'egyetlen jelölt minta-szakasz egy meglévő lapon: nincs több lépése; a hozzáférés útját a `tour.scopeLifecycle` vezeti végig',
    evidence: F(['v3app/findings_r121.mjs', 'tests/e2e/v3app-r121.spec.mjs']),
  }),
  F({
    id: 'members.revoke', module: 'delegation', version: '1.2.0', status: 'working',
    // R144/F144-01: a MUNKAFELÜLET kimondva (nem menü, nem megnyitó) és a KÖZÖS bemutató
    // EXPLICIT kötése. Indok: a reentry 3. lépése TÉNYLEGESEN megszünteti a tagságot (task: member.revoked) — a SPEC által nevesített valódi lépés
    surface: 'member-revoke',
    shared_tour: F({ tour: 'tour.reentry', steps: F(['s3']) }),
    // R144/F144-01: a funkció KIMONDJA, mely felületi műveletek tartoznak hozzá — a
    // lefedés ebből mér, nem kötőjeles részszó-egyezésből (az összekeverte a külön műveleteket).
    ui_actions: F(['revoke', 'revoke-start']),
    group: 'members', scope: 'book', audience: 'signed_in', screen: 'members', action: 'open.members', entry: 'member-revoke',
    anchors: F(['nav-members', 'members-list']),
    authority: F({ endpoint: 'POST /api/members/revoke', decided_by: 'v3ref/authz.mjs (revokeMembership)',
      reasons: F(['admin_required', 'authority_not_established', 'context_mismatch']) }),
    outcomes: F(['success', 'refused', 'uncertain']),
    ai: F({ explain: true, open: true, prepare: false,
      note: 'megszüntetést a segéd nem indít el és nem készít elő — visszafordíthatatlan következménye van' }),
    faq: F(['faq.members.revoke']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'NEVEZETT DÖNTÉS: a megszüntetés következménye azonnal érezhető a másik emberen, ezért nem építünk rá végigkattintható bemutatót — a végigvitel próba-megvonásra bátorítana. A képernyő saját szövege és a megerősítő kérdés vezeti a műveletet',
    evidence: F(['tests/e2e/v3app-acceptance.spec.mjs', 'tests/e2e/v3app-r112-stories.spec.mjs']),
  }),
  F({
    id: 'plan.change', module: 'entitlement', version: '1.1.0', status: 'working',
    group: 'plan', scope: 'book', audience: 'signed_in', screen: 'plan', action: 'prepare.plan', entry: 'plan-form',
    anchors: F(['nav-plan', 'plan-select', 'plan-submit']),
    authority: F({ endpoint: 'POST /api/workspaces/plan', decided_by: 'v3ref/entitlement.mjs',
      reasons: F(['admin_required', 'invalid_value', 'context_mismatch']) }),
    outcomes: F(['success', 'refused', 'uncertain']),
    ai: F({ explain: true, open: true, prepare: true,
      note: 'a csomag-választót előkészíti; a mentést a fiókkezelő hagyja jóvá' }),
    faq: F(['faq.plan.vsRight', 'faq.plan.purchase']),
    tour: 'tour.plan',
    evidence: F(['v3app/selfcheck.mjs']),
  }),
  F({
    id: 'data.stock', module: 'data', version: '1.2.0', status: 'working',
    // R144/F144-01: a funkció KIMONDJA, mely felületi műveletek tartoznak hozzá — a
    // lefedés ebből mér, nem kötőjeles részszó-egyezésből (az összekeverte a külön műveleteket).
    ui_actions: F(['reload-stock']),
    group: 'plan', scope: 'book', audience: 'signed_in', screen: 'stock', action: 'open.stock', entry: 'data-stock',
    anchors: F(['nav-stock', 'data-stock-btn', 'data-stock']),
    authority: F({ endpoint: 'GET /api/data/stock', decided_by: 'v3ref/authz.mjs + resultScope.mjs (STK-01)',
      reasons: F(['no_scope_grant', 'not_available', 'not_a_member', 'context_mismatch', 'network_error']) }),
    outcomes: F(['success', 'empty', 'missing', 'refused', 'error']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F(['faq.stock.noAccess', 'faq.stock.unknownQty', 'faq.stock.loadFailed']),
    tour: 'tour.stock',
    evidence: F(['v3app/selfcheck.mjs', 'tests/e2e/v3app-r85.spec.mjs']),
  }),
  F({
    id: 'data.price', module: 'data', version: '1.2.0', status: 'working',
    // R144/F144-01: a MUNKAFELÜLET kimondva (nem menü, nem megnyitó) és a KÖZÖS bemutató
    // EXPLICIT kötése. Indok: a készlet-bemutató 4. lépése az ÁR-panelt nyitja meg, ami maga a funkció munkafelülete
    surface: 'data-price',
    shared_tour: F({ tour: 'tour.stock', steps: F(['s4']) }),
    // R144/F144-01: a funkció KIMONDJA, mely felületi műveletek tartoznak hozzá — a
    // lefedés ebből mér, nem kötőjeles részszó-egyezésből (az összekeverte a külön műveleteket).
    ui_actions: F(['reload-price']),
    group: 'plan', scope: 'book', audience: 'signed_in', screen: 'stock', action: 'open.stock', entry: 'data-price',
    anchors: F(['nav-stock', 'data-price-btn', 'data-price']),
    authority: F({ endpoint: 'GET /api/data/price', decided_by: 'v3ref/entitlement.mjs (twoGateVerdict) + authz.mjs',
      reasons: F(['feature_not_in_plan', 'no_scope_grant', 'not_available', 'context_mismatch']) }),
    outcomes: F(['success', 'missing', 'refused', 'error']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F(['faq.price.twoGates', 'faq.price.missing']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'ugyanaz a képernyő, mint a készlet: a készlet-bemutató (`tour.stock`) negyedik lépése az ár-panelt mutatja',
    evidence: F(['v3app/selfcheck.mjs']),
  }),
  F({
    id: 'shell.navigation', module: 'shell', version: '1.3.0', status: 'working',
    group: 'shell', scope: 'person', audience: 'signed_in', screen: 'overview', action: 'open.overview', entry: 'nav',
    anchors: F(['nav', 'tabs', 'account-switcher', 'profile']),
    authority: F({ endpoint: 'GET /api/me', decided_by: 'v3app/server.mjs (munkamenet) + v3ref/authz.mjs',
      reasons: F(['login_required', 'workspace_required']) }),
    outcomes: F(['success', 'empty']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F(['faq.shell.tabs', 'faq.shell.menuMissing']),
    tour: 'tour.shell',
    evidence: F(['tests/e2e/v3app-r81-ux.spec.mjs']),
  }),
  F({
    id: 'shell.profile', module: 'shell', version: '1.1.0', status: 'working',
    group: 'shell', scope: 'person', audience: 'signed_in', screen: 'profile', action: 'open.profile', entry: 'section-account',
    anchors: F(['profile', 'personal-space-note']),
    authority: F({ endpoint: 'GET /api/me', decided_by: 'v3app/server.mjs (munkamenet)', reasons: F(['login_required']) }),
    outcomes: F(['success']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F(['faq.profile.edit']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'a profil-oldalt a nyelv-bemutató (`tour.language`) első lépése nyitja meg',
    evidence: F(['tests/e2e/v3app-r81-ux.spec.mjs']),
  }),
  F({
    id: 'shell.language', module: 'shell', version: '1.0.0', status: 'working',
    group: 'shell', scope: 'person', audience: 'public', screen: 'profile', action: 'open.profile', entry: 'lang-select',
    anchors: F(['profile', 'lang-select']),
    authority: F({ endpoint: 'GET /api/me', decided_by: 'v3app/public/i18n/languages.mjs (LANG-01)', reasons: F([]) }),
    outcomes: F(['success']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F(['faq.lang.which', 'faq.lang.country', 'faq.lang.missing']),
    tour: 'tour.language',
    evidence: F(['tools/vs_verify_i18n.mjs', 'tests/e2e/v3app-r89-tutor.spec.mjs']),
  }),
  F({
    id: 'shell.help', module: 'shell', version: '1.1.0', status: 'working',
    // R144/F144-01: a funkció KIMONDJA, mely felületi műveletek tartoznak hozzá — a
    // lefedés ebből mér, nem kötőjeles részszó-egyezésből (az összekeverte a külön műveleteket).
    ui_actions: F(['help-open', 'help-close', 'help-view', 'help-topic', 'help-go', 'faq-open', 'tour-start', 'tour-next', 'tour-back', 'tour-exit', 'tour-finish', 'tour-restart', 'tour-skip']),
    group: 'shell', scope: 'person', audience: 'public', screen: null, action: null, entry: 'help-open',
    anchors: F(['help-open', 'help-panel', 'help-tab-ask', 'help-tab-guides', 'help-tab-faq', 'help-tab-sitemap']),
    authority: F({ endpoint: 'GET /api/assistant/knowledge', decided_by: 'v3app/assistant/policy.mjs (AST-01)',
      reasons: F(['login_required', 'not_a_member', 'context_mismatch']) }),
    outcomes: F(['success', 'empty', 'refused']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F(['faq.help.where', 'faq.help.noModel']),
    tour: 'tour.help',
    evidence: F(['tools/vs_verify_tutor.mjs', 'tests/e2e/v3app-r89-tutor.spec.mjs']),
  }),
  F({
    id: 'shell.assistant', module: 'assistant', version: '1.1.0', status: 'demo',
    // R144: a funkciót kiszolgáló TÁMOGATÓ OLVASÁSOK. Az `authority.endpoint` EGY végpontot
    // nevez meg (ahol a jog dől el); a felület viszont többet is hív — és a lefedési mérés joggal
    // mondta, hogy ezekről a tudás nem beszél. A kötés a HÍVÓ forrásából ellenőrizve.
    reads: F(['GET /api/assistant/status']),
    // R144/F144-01: a funkció KIMONDJA, mely felületi műveletek tartoznak hozzá — a
    // lefedés ebből mér, nem kötőjeles részszó-egyezésből (az összekeverte a külön műveleteket).
    ui_actions: F(['chat-new', 'chat-clear', 'chat-suggest', 'chat-do']),
    group: 'shell', scope: 'person', audience: 'signed_in', screen: null, action: null, entry: 'chat-form',
    anchors: F(['help-open', 'help-tab-ask', 'chat-input', 'chat-send']),
    authority: F({ endpoint: 'POST /api/assistant/ask', decided_by: 'v3app/assistant/policy.mjs (AST-01)',
      reasons: F(['login_required', 'not_a_member', 'assistant_not_configured', 'assistant_unavailable',
        'assistant_question_too_long', 'assistant_rate_limited', 'context_mismatch']) }),
    outcomes: F(['success', 'empty', 'refused', 'error', 'uncertain']),
    ai: F({ explain: true, open: true, prepare: true,
      note: 'ez maga a segéd: a helyi keresés modellhívás nélkül működik, az élő modell-válasz '
        + 'engedélyezett szolgáltatói csatlakozáshoz kötött — enélkül NEVEZETTEN nem elérhető' }),
    faq: F(['faq.chat.source', 'faq.chat.limits', 'faq.chat.secrets', 'faq.chat.offline']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'a segéd MAGA a súgó Kérdezz nézete — a súgó-bemutató (`tour.help`) végigvezet rajta',
    evidence: F(['tools/vs_verify_assistant.mjs', 'tools/v3_ai_kapcsolat_allapot.mjs']),
  }),
  F({
    id: 'shell.demo_mail', module: 'shell', version: '1.0.0', status: 'demo',
    // R144/F144-01: a MUNKAFELÜLET kimondva (nem menü, nem megnyitó) és a KÖZÖS bemutató
    // EXPLICIT kötése. Indok: a levél-fogadó ABLAKA maga a funkció — itt a levélablak NEM megnyitó, hanem a munkafelület (szemben az auth.verify-vel, aminek a munkafelülete a levélben lévő HIVATKOZÁS)
    surface: 'mailbox',
    shared_tour: F({ tour: 'tour.inviteRevoke', steps: F(['s8']) }),
    // R144/F144-01: a funkció KIMONDJA, mely felületi műveletek tartoznak hozzá — a
    // lefedés ebből mér, nem kötőjeles részszó-egyezésből (az összekeverte a külön műveleteket).
    ui_actions: F(['mail-open', 'mail-refresh']),
    group: 'shell', scope: 'person', audience: 'signed_in', screen: 'outbox', action: 'open.mailbox', entry: 'demo-mail-open',
    anchors: F(['demo-mail-open', 'mailbox']),
    authority: F({ endpoint: 'GET /dev/mailbox', decided_by: 'v3app/server.mjs (devSurface kapcsoló)',
      reasons: F(['unknown_endpoint']) }),
    outcomes: F(['success', 'empty', 'refused']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F(['faq.mail.real']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'a bemutató levél-fogadó a meghívás-bemutató (`tour.invite`) utolsó lépése',
    evidence: F(['v3app/selfcheck.mjs']),
  }),
  F({
    id: 'shell.sample_pages', module: 'shell', version: '1.2.0', status: 'demo',
    // R144/F144-01: a funkció KIMONDJA, mely felületi műveletek tartoznak hozzá — a
    // lefedés ebből mér, nem kötőjeles részszó-egyezésből (az összekeverte a külön műveleteket).
    ui_actions: F(['clear-search', 'row-open']),
    group: 'shell', scope: 'book', audience: 'signed_in', screen: 'products', action: 'open.products', entry: 'list-rows',
    anchors: F(['nav-products', 'list-search', 'list-rows']),
    authority: F({ endpoint: 'GET /api/me', decided_by: 'v3app/public/demoData.mjs (DEM-01/DEM-02)',
      reasons: F(['workspace_required']) }),
    outcomes: F(['success', 'empty']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F(['faq.demo.whatIsReal', 'faq.demo.noFixture']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'mintaadat-nézet: nincs benne művelet, amit végig lehetne vinni',
    evidence: F(['tests/e2e/v3app-r85.spec.mjs']),
  }),
  F({
    id: 'profile.edit', module: 'shell', version: '1.0.0', status: 'planned',
    group: 'shell', scope: 'person', audience: 'signed_in', screen: 'profile', action: 'open.profile', entry: null,
    anchors: F([]),
    authority: F({ endpoint: null, decided_by: null, reasons: F([]) }),
    outcomes: F(['missing']),
    ai: F({ explain: true, open: false, prepare: false,
      note: 'nincs AI-művelet: a funkció még nem létezik, tervet nem tanítunk kész szolgáltatásként' }),
    faq: F(['faq.profile.edit']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'TERVEZETT képesség: nincs mit végigkattintani — a bemutató tervet tanítana kész szolgáltatásként (KUKA-224)',
    evidence: F(['v3app/public/app.js (profilePage — nincs gomb, és a lap ezt kimondja)']),
  }),
  F({
    id: 'security.password_change', module: 'shell', version: '1.0.0', status: 'planned',
    group: 'auth', scope: 'person', audience: 'signed_in', screen: 'security', action: 'open.security', entry: null,
    anchors: F([]),
    authority: F({ endpoint: null, decided_by: null, reasons: F([]) }),
    outcomes: F(['missing']),
    ai: F({ explain: true, open: false, prepare: false,
      note: 'nincs AI-művelet: jelszó-műveletet a segéd soha nem végez el' }),
    faq: F(['faq.security.password']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'TERVEZETT képesség: nincs mit végigkattintani — a bemutató tervet tanítana kész szolgáltatásként (KUKA-224)',
    evidence: F(['v3app/public/app.js (securityPage — nincs gomb, és a lap ezt kimondja)']),
  }),
  // KIVEZETETT — és ez NEM elméleti eset: az R81 váltotta le a számozott próbafelületet. A súgó
  // nem hagyhatja aktív találatként (a `verify:tutor` ezt MÉRI), de a `replaced_by` továbbvezet.
  F({
    id: 'shell.numbered_probe', module: 'shell', version: '1.1.0', status: 'retired',
    group: 'shell', scope: 'person', audience: 'signed_in', screen: null, action: null, entry: null,
    anchors: F([]),
    replaced_by: 'shell.navigation',
    authority: F({ endpoint: null, decided_by: null, reasons: F([]) }),
    outcomes: F([]),
    ai: F({ explain: false, open: false, prepare: false,
      note: 'nincs AI-művelet: kivezetett felület, a segéd a helyette élő funkcióra visz' }),
    faq: F([]),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'KIVEZETETT képesség: az utódja a `shell.sample_pages`',
    evidence: F(['docs/70_PLANNING/V3_R81_FELULET_KOZOS_KERET.md']),
  }),
  // ════════════════════════════════════════════════════════════════════════════════════════════
  // R164/3 — A PÓTOLHATÓ LEFEDÉSI RÉSEK: LÉTEZŐ, MA IS DOLGOZÓ KÉPERNYŐK LEÍRÁS NÉLKÜL
  //
  // AZ R164/3 KIKÖTÉSE: *„ahol létező felülethez/funkcióhoz tartozik hiányzó HU/EN/DE
  // leírás/GYIK/súgó/segéd/tutor/demo, ott pótolj; ahol a mögöttes üzleti képesség még nem létezik,
  // az maradjon nevesített fejlesztési rés."*
  //
  // EZ A HAT BEJEGYZÉS A KETTÉOSZTÁS EREDMÉNYE. Öt képernyő MA IS dolgozik (listát rajzol valódi
  // oszlopokkal, szűrővel, a jogosultsági kapun át) — csak a LEÍRÁSA hiányzott, és ezt pótoljuk.
  // A hatodik (`personal.ownMatters`) TERVEZETT: a lap létezik és megnyílik, de a mögötte álló üzleti
  // képesség nem — ezért `status: 'planned'`, és a hiány a `missing_capability` mezőben NEVESÍTVE áll.
  //
  // AMIT EZEK A LEÍRÁSOK NEM ÁLLÍTANAK (KUKA-050 · KUKA-224): egyik sem ígér ÍRÁST. Mindegyik
  // kimondja, hogy olvasó nézet, és azt is, mi az, ami MA nem lehetséges — a terv nem tanítható kész
  // szolgáltatásként.
  // ════════════════════════════════════════════════════════════════════════════════════════════
  F({
    id: 'data.warehouses', module: 'data', version: '1.0.0', status: 'working',
    surface: 'list-rows',
    ui_actions: F(['clear-search', 'row-open']),
    group: 'shell', scope: 'book', audience: 'signed_in', screen: 'warehouses', action: 'open.warehouses', entry: 'list-rows',
    anchors: F(['nav-warehouses', 'list-search', 'list-rows']),
    authority: F({ endpoint: 'GET /api/me', decided_by: 'v3app/public/demoData.mjs (DEM-01/DEM-02)',
      reasons: F(['workspace_required']) }),
    outcomes: F(['success', 'empty']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F(['faq.warehouses.readOnly', 'faq.warehouses.itemCount']),
    tour: 'tour.warehouses',
    evidence: F(['v3app/public/app.js (ROW_DEF.warehouses)', 'tests/e2e/v3app-r85.spec.mjs']),
  }),
  F({
    id: 'data.processes', module: 'data', version: '1.0.0', status: 'working',
    surface: 'list-rows',
    // A `process-state` HORGONY, nem művelet: `data-testid`, nem `data-action` (az L10 ellenőrzés
    // mérte meg — a két fogalmat nem mossuk össze).
    ui_actions: F(['clear-search', 'row-open']),
    group: 'shell', scope: 'book', audience: 'signed_in', screen: 'processes', action: 'open.processes', entry: 'list-rows',
    anchors: F(['nav-processes', 'list-search', 'list-rows', 'process-state']),
    authority: F({ endpoint: 'GET /api/me', decided_by: 'v3app/public/demoData.mjs (DEM-01/DEM-02)',
      reasons: F(['workspace_required']) }),
    outcomes: F(['success', 'empty']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F(['faq.processes.filter', 'faq.processes.readOnly']),
    tour: 'tour.processes',
    evidence: F(['v3app/public/app.js (ROW_DEF.processes + processState szűrő)', 'tests/e2e/v3app-r85.spec.mjs']),
  }),
  F({
    id: 'data.stockcard', module: 'data', version: '1.0.0', status: 'working',
    surface: 'stockcard-table',
    group: 'plan', scope: 'book', audience: 'signed_in', screen: 'stockcard', action: 'open.stockcard', entry: 'stockcard-table',
    anchors: F(['nav-stockcard', 'stockcard-table']),
    authority: F({ endpoint: 'GET /api/data/stock', decided_by: 'v3ref/authz.mjs + resultScope.mjs (STK-01)',
      reasons: F(['no_scope_grant', 'not_available', 'not_a_member', 'context_mismatch', 'network_error']) }),
    outcomes: F(['success', 'empty', 'missing', 'refused', 'error']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F(['faq.stockcard.sameGate', 'faq.stockcard.whichProduct']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'ENGEDÉLYHEZ KÖTÖTT nézet: a karton csak akkor rajzol, ha a fiókkezelő kiadta a készletadatokat — a jogadást a `tour.grant` mutatja meg, a megnyíló nézetet a `tour.stock`. Egy saját bemutató vagy a jog nélkül állna meg (KUKA-232), vagy jogot adna a felhasználó helyett (KUKA-231)',
    evidence: F(['v3app/public/app.js (stockCardPage — stockGate)', 'tests/e2e/v3app-r85.spec.mjs']),
  }),
  F({
    id: 'data.movements', module: 'data', version: '1.0.0', status: 'working',
    surface: 'movements-table',
    group: 'plan', scope: 'book', audience: 'signed_in', screen: 'movements', action: 'open.movements', entry: 'movements-table',
    anchors: F(['nav-movements', 'movements-table']),
    authority: F({ endpoint: 'GET /api/data/stock', decided_by: 'v3ref/authz.mjs + resultScope.mjs (STK-01)',
      reasons: F(['no_scope_grant', 'not_available', 'not_a_member', 'context_mismatch', 'network_error']) }),
    outcomes: F(['success', 'empty', 'missing', 'refused', 'error']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F(['faq.movements.sameGate', 'faq.movements.readOnly']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'UGYANAZON a kapun áll, mint a Készletegyenleg: a mozgások csak kiadott készlet-engedéllyel rajzolnak — a jogadást a `tour.grant` mutatja, a nézetet a `tour.stock`; a `tour.reentry` 16–18. lépése pedig végig is viszi a visszatérő munkatárs útján',
    evidence: F(['v3app/public/app.js (movementsPage — stockGate)', 'tests/e2e/v3app-r85.spec.mjs']),
  }),
  F({
    id: 'account.settings', module: 'account', version: '1.0.0', status: 'working',
    surface: 'section-account',
    group: 'account', scope: 'book', audience: 'signed_in', screen: 'account', action: 'open.account', entry: 'section-account',
    anchors: F(['nav-account', 'section-account', 'representation-note']),
    authority: F({ endpoint: 'GET /api/me', decided_by: 'v3app/server.mjs (/api/me) + v3ref/authz.mjs',
      reasons: F(['workspace_required']) }),
    outcomes: F(['success']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F(['faq.account.notChecked', 'faq.account.whoChanges']),
    tour: 'tour.accountSettings',
    evidence: F(['v3app/public/app.js (accountPage)', 'tests/e2e/v3app-r81-ux.spec.mjs']),
  }),
  F({
    id: 'personal.ownMatters', module: 'shell', version: '1.0.0', status: 'planned',
    group: 'shell', scope: 'person', audience: 'signed_in', screen: 'personal', action: 'open.personal', entry: null,
    anchors: F([]),
    authority: F({ endpoint: null, decided_by: null, reasons: F([]) }),
    outcomes: F(['missing']),
    ai: F({ explain: true, open: false, prepare: false,
      note: 'nincs AI-művelet: a képesség még nem létezik, tervet nem tanítunk kész szolgáltatásként' }),
    faq: F(['faq.personal.whyEmpty']),
    // A NEVESÍTETT FEJLESZTÉSI RÉS (R164/3). A `missing_capability` nem próza: a lefedési őr
    // osztályozása EBBŐL dönti el, hogy a hiány „fejlesztési rés"-e, vagy osztályozatlan piros.
    missing_capability: 'a SAJÁT ÜGYEK listája még nem létezik: nincs olyan adatkör, amit a belépett ember a saját nevében rögzíthetne vagy lekérhetne (sem ügy, sem kérés, sem bizonylat) — a lap ma megnyílik, és KIMONDJA, hogy üres',
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'TERVEZETT képesség: a lap üres állapotot mutat, nincs mit végigkattintani — a bemutató tervet tanítana kész szolgáltatásként (KUKA-224)',
    evidence: F(['v3app/public/app.js (case \'personal\' — emptyBox, és a lap ezt kimondja)']),
  }),
]);

/** A BEMUTATÓK — lépések stabil felületi pontokra. A szöveg a nyelvcsomag `TOUR` csoportjában áll. */
/**
 * A BEMUTATÓK. MINDEGYIK KIMONDJA, KINEK ÉRHETŐ EL (`audience`), és a regisztrációs bemutató azt is,
 * hogy CSAK BELÉPÉS ELŐTT fut (`requires_anonymous`) — a célja a belépési képernyőn van, tehát
 * belépve nem „eltűnt cél", hanem NEM AJÁNLOTT bemutató (F91-01, a külső fél lelete: belépve
 * azonnal `targetMissing`-gel szakadt meg).
 */
export const TOURS = Object.freeze({
  'tour.shell': Object.freeze({
    id: 'tour.shell', version: '1.0.0', audience: 'signed_in', feature: 'shell.navigation', page: 'overview',
    steps: Object.freeze([
      Object.freeze({ id: 's1', target: 'account-switcher', task: null }),
      Object.freeze({ id: 's2', target: 'nav', task: null }),
      Object.freeze({ id: 's3', target: 'tabs', task: null }),
      Object.freeze({ id: 's4', target: 'profile', task: null }),
      Object.freeze({ id: 's5', target: 'help-open', task: null }),
    ]),
  }),
  'tour.invite': Object.freeze({
    id: 'tour.invite', version: '1.0.0', audience: 'signed_in', feature: 'invite.send', page: 'members', requires_role: 'admin',
    steps: Object.freeze([
      Object.freeze({ id: 's1', target: 'nav-members', task: null }),
      Object.freeze({ id: 's2', target: 'invite-open', task: null }),
      // A PANELEN BELÜLI CÉLOK: a mező CSAK a panel megnyitása után létezik, ezért a lépés
      // KIMONDJA, mi tárja fel (`appears_after`). A bemutató NEM nyitja meg helyettünk, hanem
      // a feltáró gombot kiemeli és megvárja — a hiányzó cél így nem hamis megszakítás (KUKA-228).
      Object.freeze({ id: 's3', target: 'invite-email', task: null, appears_after: 'invite-open' }),
      Object.freeze({ id: 's4', target: 'invite-scope', task: null, appears_after: 'invite-open' }),
      // A FELADATHOZ KÖTÖTT LÉPÉS: csak IGAZOLT siker után halad tovább (R89 §4).
      Object.freeze({ id: 's5', target: 'invite-submit', task: 'invite.created', appears_after: 'invite-open' }),
      Object.freeze({ id: 's6', target: 'invite-mail-open', task: null, appears_after: 'invite-submit' }),
    ]),
  }),
  'tour.addBusiness': Object.freeze({
    id: 'tour.addBusiness', version: '1.0.0', audience: 'signed_in', feature: 'account.add_business', page: 'new',
    steps: Object.freeze([
      Object.freeze({ id: 's1', target: 'ws-kind-business', task: null }),
      Object.freeze({ id: 's2', target: 'ws-name', task: null }),
      // A KÉT CÉGES MEZŐ CSAK a „Vállalkozás" választása után jelenik meg.
      Object.freeze({ id: 's3', target: 'ws-jurisdiction', task: null, appears_after: 'ws-kind-business' }),
      Object.freeze({ id: 's4', target: 'ws-tax-id', task: null, appears_after: 'ws-kind-business' }),
      Object.freeze({ id: 's5', target: 'ws-create', task: 'workspace.created' }),
    ]),
  }),
  'tour.stock': Object.freeze({
    id: 'tour.stock', version: '1.0.0', audience: 'signed_in', feature: 'data.stock', page: 'stock',
    steps: Object.freeze([
      Object.freeze({ id: 's1', target: 'nav-stock', task: null }),
      Object.freeze({ id: 's2', target: 'data-stock', task: null }),
      Object.freeze({ id: 's3', target: 'data-stock-btn', task: null }),
      Object.freeze({ id: 's4', target: 'data-price', task: null }),
    ]),
  }),
  // A HOZZÁFÉRÉSEK KEZELÉSE — a külső ellenőrző fél NEVESÍTETTE (R91/F91-01). Stabil horgonyokra
  // épül: a menüpont, a tag-lista és a hozzáférés-űrlap; a személy-szintű azonosító (`member-open-…`)
  // SZÁNDÉKOSAN nem lépés-cél, mert az minden fióknál más (KUKA-225 alakja a bemutatón).
  'tour.grant': Object.freeze({
    id: 'tour.grant', version: '1.0.0', audience: 'signed_in', feature: 'members.grant', page: 'members', requires_role: 'admin',
    steps: Object.freeze([
      Object.freeze({ id: 's1', target: 'nav-members', task: null }),
      Object.freeze({ id: 's2', target: 'members-list', task: null }),
      Object.freeze({ id: 's3', target: 'member-scope-row-keszlet', task: 'grant.saved', appears_after: 'members-list' }),
    ]),
  }),
  // R121 — A HOZZÁFÉRÉS ÉLETCIKLUSA: megadás ÉS visszavonás, tényleges mentéshez kötve (TUR-01).
  'tour.scopeLifecycle': Object.freeze({
    id: 'tour.scopeLifecycle', version: '1.0.0', audience: 'signed_in', feature: 'members.scopeRevoke',
    page: 'members', requires_role: 'admin',
    steps: Object.freeze([
      Object.freeze({ id: 's1', target: 'nav-members', task: null }),
      Object.freeze({ id: 's2', target: 'members-list', task: null }),
      Object.freeze({ id: 's3', target: 'member-scope-row-dokumentumok', task: 'grant.saved', appears_after: 'members-list' }),
      Object.freeze({ id: 's4', target: 'member-scope-row-dokumentumok', task: 'scope.revoked', appears_after: 'members-list' }),
    ]),
  }),
  // R132 §6/1. TÖRTÉNET — FÜGGŐ MEGHÍVÁS → VISSZAVONÁS. A lépés-célok STABIL horgonyok: a
  // sor-szintű gomb azonosítója a meghívó rövid jelölőjét viseli, az pedig minden fióknál más
  // (ugyanaz az indok, amiért a `member-open-…` sem lépés-cél — KUKA-225 alakja az útmutatón).
  'tour.inviteRevoke': Object.freeze({
    id: 'tour.inviteRevoke', version: '2.0.0', audience: 'signed_in', feature: 'invite.revoke',
    page: 'members', requires_role: 'admin',
    // A TELJES TÖRTÉNET ÁTÍVEL A SZEREPLŐKÖN (R140 — ACT-01), ÉS EZÉRT BEMUTATÓ-KÖTÖTT.
    //
    // A visszavonás TANULSÁGA nem a visszavonásnál van, hanem ott, hogy a CÍMZETT hivatkozása
    // tényleg elhal, és hogy utána ÚJ meghívás kell. Ezt egy ember a saját gépén nem tudja
    // végigjárni: KÉT élő munkamenet kell hozzá. Éles üzemben a meghívott a SAJÁT eszközén lép be,
    // tehát „váltás a másik nézetére" vezérlő nincs és nem is lenne értelme — ezért a bemutató
    // `requires_demo`, és éles üzemben NEM kínáljuk fel. Nem azért, mert elrejtjük: azért, mert
    // amit nem lehet végigvinni, azt nem szabad felkínálni (KUKA-041 · F91-01). A funkció leírása,
    // súgója és GYIK-je éles üzemben is a helyén marad.
    requires_demo: true,
    steps: Object.freeze([
      Object.freeze({ id: 's1', target: 'nav-members', task: null, role: 'admin' }),
      Object.freeze({ id: 's2', target: 'members-tab-invites', task: null, role: 'admin' }),
      Object.freeze({ id: 's3', target: 'invites-table', task: null, appears_after: 'members-tab-invites', role: 'admin' }),
      Object.freeze({ id: 's4', target: 'invites-table', task: 'invite.revoked', appears_after: 'members-tab-invites', role: 'admin' }),
      Object.freeze({ id: 's5', target: 'invites-table', task: null, appears_after: 'members-tab-invites', role: 'admin' }),
      Object.freeze({ id: 's6', target: 'actor-switch', task: 'actor.switched', switch_actor: true }),
      Object.freeze({ id: 's7', target: 'demo-mail-open', task: null }),
      Object.freeze({ id: 's8', target: 'mailbox', task: null, appears_after: 'demo-mail-open' }),
      Object.freeze({ id: 's9', target: 'invite-observe', task: null, appears_after: 'mailbox' }),
      Object.freeze({ id: 's10', target: 'actor-switch', task: 'actor.switched', role: 'admin', switch_actor: true }),
      Object.freeze({ id: 's11', target: 'nav-members', task: null, role: 'admin' }),
      Object.freeze({ id: 's12', target: 'invite-open', task: null, role: 'admin' }),
      Object.freeze({ id: 's13', target: 'invite-submit', task: 'invite.created', appears_after: 'invite-open', role: 'admin' }),
      Object.freeze({ id: 's14', target: 'actor-switch', task: 'actor.switched', switch_actor: true }),
      Object.freeze({ id: 's15', target: 'demo-mail-open', task: null }),
      Object.freeze({ id: 's16', target: 'mailbox', task: null, appears_after: 'demo-mail-open' }),
      Object.freeze({ id: 's17', target: 'invite-actions', task: 'invite.redeemed', appears_after: 'mailbox' }),
      Object.freeze({ id: 's18', target: 'account-switcher', task: null }),
    ]),
  }),
  // ════════════════════════════════════════════════════════════════════════════════════════════
  // R164/3 — A VALÓDI, ALKALMAZÁSON BELÜLI ÁTADÁS: MEGÉPÍTVE, MÉRVE, ÉS NEVEZETTEN VISSZAÁLLÍTVA
  //
  // A MEGÁLLÁS, AMIT EZ LEZÁR (az R158 jelentés 7/1. nyitott tétele, SAJÁT nevesítés): *„A két
  // szereplős történet az alkalmazás-héjban nem végigvihető. Ahhoz DEKLARÁLT váltás-vezérlő kellene
  // (a kijelentkezés ma lenyitható menüben áll, tehát a lépésnek saját feltáró-mezőre volna
  // szüksége), és a váltás VALÓDI ki- és belépés a másik emberrel."* Az R164/3 ezt kifejezetten
  // engedélyezte: *„a túra tárja fel a szükséges menüt és adjon végrehajtható átadást … ne építs
  // jogosultságot megkerülő szereplőváltást."*
  //
  // AMIT MEGÉPÍTETTEM ÉS MEGMÉRTEM. A hat váltás-lépés célját a VALÓDI kijelentkezésre állítottam
  // (`target: 'logout'`, `appears_after: 'profile'` — a bemutató kiemeli a profil-menüt, megvárja,
  // hogy a felhasználó megnyissa, és nem kattint helyette), és beírtam a belépés utáni FIÓKVÁLTÁS
  // lépéseit is, mert a valódi kiszolgáló a SZEMÉLYES körbe léptet be. A végigjárás ezen az úton
  // 19-ből 18 lépést ért el az asztali szélességen — tehát az út járható, de NEM teljes.
  //
  // AMIÉRT MÉGIS A BEMUTATÓ-VEZÉRLŐ ÁLL ITT MA. A bemutató-lap rövidítő gombja nem csak kilép és
  // belép: a végén ÚJRATÖLTI a lapot tiszta címre — és az átadás ezen az újratöltésen megy át
  // (`pagehide` → `saveTourHandover`, induláskor `resumeTourAfterSwitch`). Az alkalmazáson belüli,
  // ÚJRATÖLTÉS NÉLKÜLI átadás más út, és azon MÉRTEN két állapot-szivárgás állt (mindkettőt
  // JAVÍTOTTAM: a kilépés nem a közös ürítőn ment át, és az előző ember meghívó-jegyét nem törölte),
  // a harmadik — a futás elvesztése a meghívás ELFOGADÁSA után — ebben a csomagban nem záródott le.
  //
  // A DÖNTÉS: egy KÖTELEZŐ kiadási kaput (`verify:browser-gate` → `proof:demo-walk`) nem hagyunk
  // pirosan egy félig megépített képességért (KUKA-091: a javítás iránya nem az őr lazítása). A
  // lépések ezért a mai, végigvihető útra állnak vissza, a maradék munka pedig NEVESÍTVE megy
  // tovább a jelentésben — mért tünettel, nem érzéssel (R158 7/1. tétel marad nyitva).
  // ════════════════════════════════════════════════════════════════════════════════════════════

  // R132 §6/2. TÖRTÉNET — ELTÁVOLÍTOTT MUNKATÁRS → ÚJBÓLI MEGHÍVÁS. A lezárás TÉNYLEGES sikerhez
  // kötött (`reinvite.sent`): a „Tovább" gomb nem küld meghívást a felhasználó helyett (KUKA-231).
  'tour.reentry': Object.freeze({
    id: 'tour.reentry', version: '2.0.0', audience: 'signed_in', feature: 'members.reinvite',
    page: 'members', requires_role: 'admin',
    // UGYANAZ AZ OK, MINT AZ „A" TÖRTÉNETNÉL (R140 — ACT-01): a visszatérés tanulsága a VÉGÉN van
    // (tagság igen, adat nem; és a külön jogadás UTÁN mennyiség igen, ár nem), és ehhez két élő
    // munkamenet kell. Éles üzemben nem kínáljuk fel, mert nem volna végigvihető.
    requires_demo: true,
    steps: Object.freeze([
      Object.freeze({ id: 's1', target: 'nav-members', task: null, role: 'admin' }),
      Object.freeze({ id: 's2', target: 'members-list', task: null, role: 'admin' }),
      Object.freeze({ id: 's3', target: 'member-revoke', task: 'member.revoked', appears_after: 'members-list', role: 'admin' }),
      Object.freeze({ id: 's4', target: 'reinvite-form', task: 'reinvite.sent', appears_after: 'members-list', role: 'admin' }),
      Object.freeze({ id: 's5', target: 'actor-switch', task: 'actor.switched', switch_actor: true }),
      Object.freeze({ id: 's6', target: 'demo-mail-open', task: null }),
      Object.freeze({ id: 's7', target: 'mailbox', task: null, appears_after: 'demo-mail-open' }),
      Object.freeze({ id: 's8', target: 'invite-actions', task: 'invite.redeemed', appears_after: 'mailbox' }),
      Object.freeze({ id: 's9', target: 'account-switcher', task: 'actor.switched', switch_actor: true }),
      Object.freeze({ id: 's10', target: 'nav-stock', task: null }),
      Object.freeze({ id: 's11', target: 'data-stock', task: null }),
      Object.freeze({ id: 's12', target: 'actor-switch', task: 'actor.switched', role: 'admin', switch_actor: true }),
      Object.freeze({ id: 's13', target: 'nav-members', task: null, role: 'admin' }),
      Object.freeze({ id: 's14', target: 'member-scope-row-keszlet', task: 'grant.saved', appears_after: 'members-list', role: 'admin' }),
      Object.freeze({ id: 's15', target: 'actor-switch', task: 'actor.switched', switch_actor: true }),
      Object.freeze({ id: 's16', target: 'nav-stock', task: null }),
      Object.freeze({ id: 's17', target: 'data-stock-btn', task: null }),
      Object.freeze({ id: 's18', target: 'data-price', task: null }),
    ]),
  }),
  'tour.plan': Object.freeze({
    id: 'tour.plan', version: '1.0.0', audience: 'signed_in', feature: 'plan.change', page: 'plan', requires_role: 'admin',
    steps: Object.freeze([
      Object.freeze({ id: 's1', target: 'nav-plan', task: null }),
      Object.freeze({ id: 's2', target: 'plan-select', task: null }),
      Object.freeze({ id: 's3', target: 'plan-submit', task: 'plan.saved' }),
    ]),
  }),
  'tour.register': Object.freeze({
    id: 'tour.register', version: '1.0.0', audience: 'public', requires_anonymous: true, feature: 'auth.register', page: null,
    steps: Object.freeze([
      Object.freeze({ id: 's1', target: 'register-email', task: null }),
      Object.freeze({ id: 's2', target: 'register-password', task: null }),
      Object.freeze({ id: 's3', target: 'register-submit', task: null }),
    ]),
  }),
  'tour.language': Object.freeze({
    id: 'tour.language', version: '1.0.0', audience: 'signed_in', feature: 'shell.language', page: 'profile',
    steps: Object.freeze([
      Object.freeze({ id: 's1', target: 'profile', task: null }),
      Object.freeze({ id: 's2', target: 'lang-select', task: null }),
    ]),
  }),
  // A MEGHÍVÁS ELFOGADÁSA — a KÉPERNYŐRŐL indítva (P109-01, R109). Három kötés miatt más, mint a többi:
  //   (1) `requires_invite`: a szerver CSAK meghívás-kontextussal kínálja fel (`resumeIntent`), tehát a
  //       súgó főoldaláról nem indítható olyan bemutató, aminek nincs hova mutatnia (R91/F91-01 indoka);
  //   (2) `audience: 'public'`: a meghívott ember még nem biztos, hogy be van jelentkezve;
  //   (3) az UTOLSÓ lépés a GOMBSORRA áll, és a feladata `invite.redeemed` — tehát a bemutató MEGVÁRJA
  //       a felhasználó SAJÁT kattintását és a szerver IGAZOLT sikerét. A „Tovább"/„Befejezés" gomb
  //       NEM fogadja el a meghívást (KUKA-231 · a P109-01 kikötése).
  'tour.inviteAccept': Object.freeze({
    id: 'tour.inviteAccept', version: '1.0.0', audience: 'public', requires_invite: true,
    feature: 'invite.accept', page: null,
    steps: Object.freeze([
      Object.freeze({ id: 's1', target: 'invite-observe', task: null }),
      Object.freeze({ id: 's2', target: 'invite-identity', task: null }),
      Object.freeze({ id: 's3', target: 'invite-next', task: null }),
      Object.freeze({ id: 's4', target: 'invite-actions', task: 'invite.redeemed' }),
    ]),
  }),
  'tour.help': Object.freeze({
    id: 'tour.help', version: '1.0.0', audience: 'public', feature: 'shell.help', page: null,
    steps: Object.freeze([
      Object.freeze({ id: 's1', target: 'help-open', task: null }),
      // A HÁROM FÜL CSAK a panel megnyitása után létezik (a `help-open` tárja fel).
      Object.freeze({ id: 's2', target: 'help-tab-guides', task: null, appears_after: 'help-open' }),
      Object.freeze({ id: 's3', target: 'help-tab-faq', task: null, appears_after: 'help-open' }),
      Object.freeze({ id: 's4', target: 'help-tab-sitemap', task: null, appears_after: 'help-open' }),
    ]),
  }),
  // ── R164/3 — A PÓTOLT BEMUTATÓK. Mind a HÁROM olyan lapra épül, ami ENGEDÉLY NÉLKÜL is megnyílik
  // (a fiók bemutató-adatát rajzolja, illetve a fiók saját adatait), ezért éles üzemben is
  // végigvihető — nem `requires_demo`. Feladat-lépés egyikben sem kell: a nézetek OLVASÓK, és a
  // bemutató nem kattint a felhasználó helyett (KUKA-231).
  'tour.warehouses': Object.freeze({
    id: 'tour.warehouses', version: '1.0.0', audience: 'signed_in', feature: 'data.warehouses', page: 'warehouses',
    steps: Object.freeze([
      Object.freeze({ id: 's1', target: 'nav-warehouses', task: null }),
      Object.freeze({ id: 's2', target: 'list-rows', task: null }),
      Object.freeze({ id: 's3', target: 'list-search', task: null }),
    ]),
  }),
  'tour.processes': Object.freeze({
    id: 'tour.processes', version: '1.0.0', audience: 'signed_in', feature: 'data.processes', page: 'processes',
    steps: Object.freeze([
      Object.freeze({ id: 's1', target: 'nav-processes', task: null }),
      Object.freeze({ id: 's2', target: 'list-rows', task: null }),
      Object.freeze({ id: 's3', target: 'list-search', task: null }),
    ]),
  }),
  'tour.accountSettings': Object.freeze({
    id: 'tour.accountSettings', version: '1.0.0', audience: 'signed_in', feature: 'account.settings', page: 'account',
    steps: Object.freeze([
      Object.freeze({ id: 's1', target: 'nav-account', task: null }),
      Object.freeze({ id: 's2', target: 'section-account', task: null }),
      Object.freeze({ id: 's3', target: 'representation-note', task: null }),
    ]),
  }),
});

/**
 * A SZEREPLŐ-VÁLTÓ LÉPÉSEK — A DEFINÍCIÓBÓL, NEM KÉZI LISTÁBÓL (R164/3 · KUKA-045).
 *
 * MIÉRT VAN EZ. Két bemutató ÁTÍVEL a szereplőkön: a felkínálásuk NEM attól függ, hogy a kiszolgáló
 * bemutató-környezetben áll (`requires_demo` — az ADAT feltétele), hanem attól, hogy a BETÖLTÖTT
 * FELÜLET ad-e „váltás a másik nézetére" vezérlőt (a VEZÉRLŐ feltétele). A kettő nem ugyanaz: az
 * alkalmazás-héj bemutató-környezetben is a VALÓDI héj, amiben ilyen vezérlő nincs. Ezért a kapu a
 * lépés SAJÁT `switch_actor` jelét olvassa, és a lépés `target`-jét kéri a felülettől — kézzel írt
 * bemutató-azonosító-lista nincs, tehát egy ÚJ szereplő-váltó bemutató sem maradhat ki a kapuból.
 */
export function actorSwitchSteps(tour) {
  const steps = tour && Array.isArray(tour.steps) ? tour.steps : [];
  return steps.filter((s) => s && s.switch_actor === true);
}

export const TUD_CONTRACT = Object.freeze({
  id: 'TUD-01',
  owns: 'funkciónként a GÉPI tények: azonosító · modul · verzió · állapot · képernyő · művelet · '
    + 'kapu-hivatkozás · kimenet-fajták · AI-szerződés · bizonyíték',
  does_not_own: 'a szavak (nyelvcsomag) · a jogosultság (a mag dönti el) · a felület rajzolása',
  action_allowlist: 'ACTIONS — a segéd és a bemutató CSAK innen nyithat folytatást, és egyik sem ír',
  status_rule: 'planned nem tanítható kész szolgáltatásként · retired nem lehet aktív találat (replaced_by visz tovább)',
  scope_rule: "a `scope` mondja meg, MIHEZ tartozik a funkció: 'person' a belépéshez, 'book' egy FIÓKHOZ. "
    + 'A fiókhoz kötött funkció tudása csak HATÁLYOS tagság mellett adható ki — ezt a saját R89-es '
    + 'HTTP-mérésem kényszerítette ki: a MEGVONT tag még megkapta a készlet- és tagság-tudást, mert a '
    + 'kiválasztó csak a szerepet és a személyes jelleget nézte, a FIÓK meglétét nem (KUKA-047).',
  version_rule: 'a `version` a LEÍRÁS változata; a nyelvcsomag KB_SOURCE ehhez mérve ellenőrzött vagy ELAVULT',
});
