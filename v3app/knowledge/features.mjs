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
export const OUTCOME_KINDS = Object.freeze(['success', 'empty', 'missing', 'refused', 'error', 'uncertain']);

const F = (o) => Object.freeze(o);

/**
 * A FUNKCIÓK. A hatókör a terv §7 hat folyamatcsoportja — és a leltár a TÉNYLEGES felületből jön
 * (`v3app/public/app.js` oldalai + a `v3app/server.mjs` végpontjai), nem egy kívánság-listából.
 */
export const FEATURES = Object.freeze([
  F({
    id: 'auth.register', module: 'auth', version: '1.1.0', status: 'working',
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
    id: 'auth.login', module: 'auth', version: '1.1.0', status: 'working',
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
    id: 'auth.resend', module: 'auth', version: '1.1.0', status: 'working',
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
    id: 'auth.logout', module: 'auth', version: '1.0.0', status: 'working',
    group: 'auth', scope: 'person', audience: 'signed_in', screen: 'security', action: 'open.security', entry: 'logout',
    anchors: F(['logout']),
    authority: F({ endpoint: 'POST /api/logout', decided_by: 'v3app/server.mjs (munkamenet)', reasons: F([]) }),
    outcomes: F(['success']),
    ai: F({ explain: true, open: true, prepare: false, note: null }),
    faq: F([]),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'egyetlen gomb a Belépés és biztonság oldalon',
    evidence: F(['v3app/selfcheck.mjs']),
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
    id: 'account.switch', module: 'account', version: '1.1.0', status: 'working',
    group: 'account', scope: 'person', audience: 'signed_in', screen: null, action: null, entry: 'account-switcher',
    anchors: F(['account-switcher', 'ws-list']),
    authority: F({ endpoint: 'POST /api/session/workspace', decided_by: 'v3ref/bitemporal.mjs (membershipAsOf)',
      reasons: F(['not_a_member', 'workspace_required']) }),
    outcomes: F(['success', 'refused', 'uncertain']),
    ai: F({ explain: true, open: false, prepare: false,
      note: 'fiókváltást a segéd nem indít el: a nyitott szerkesztőd elveszhetne — a váltást te végzed el' }),
    faq: F(['faq.account.unsaved']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'egyetlen lenyíló a fejlécben — a héj-bemutató (`tour.shell`) első lépése ezt mutatja meg',
    evidence: F(['tests/e2e/v3app-r81-ux.spec.mjs', 'v3app/findings_r79.mjs']),
  }),
  F({
    id: 'invite.send', module: 'delegation', version: '1.2.0', status: 'working',
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
    id: 'invite.accept', module: 'invite', version: '1.1.0', status: 'working',
    group: 'invite', scope: 'person', audience: 'public', screen: null, action: null, entry: 'section-invite',
    anchors: F(['invite-observe', 'invite-redeem']),
    authority: F({ endpoint: 'POST /api/invites/redeem', decided_by: 'v3ref/invite.mjs',
      reasons: F(['invite_expired', 'invite_already_redeemed', 'invite_unknown', 'invite_terms_changed',
        'issuer_right_withdrawn', 'invitee_mismatch', 'channel_not_proven']) }),
    outcomes: F(['success', 'refused', 'uncertain', 'error']),
    ai: F({ explain: true, open: false, prepare: false,
      note: 'a meghívás elfogadása a felhasználó saját döntése — a segéd elmagyarázza, de nem kattintja meg' }),
    faq: F(['faq.invite.accept', 'faq.invite.wrongAddress']),
    tour: null,
    // A `tour: null` NEM teljesítés: a hiány INDOKA itt áll (R91/F91-01).
    tour_note: 'NEVEZETT NYITOTT TÉTEL (R91/F91-01): a képernyője CSAK érvényes meghívó-hivatkozásból (levélből) nyílik meg, ezért egy súgóból indított bemutató nem létező célra mutatna. A használati utat a meghívás-bemutató utolsó lépése (a levél megnyitása) és a meghívó lapjának saját szövege vezeti; önálló bemutató akkor épül, ha a meghívó-képernyő a súgóból is elérhetővé válik',
    evidence: F(['tests/e2e/v3app-acceptance.spec.mjs']),
  }),
  F({
    id: 'members.list', module: 'delegation', version: '1.1.0', status: 'working',
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
    id: 'members.grant', module: 'delegation', version: '1.1.0', status: 'working',
    group: 'members', scope: 'book', audience: 'signed_in', screen: 'members', action: 'open.members', entry: 'member-scope-form',
    anchors: F(['nav-members', 'members-list']),
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
    id: 'members.revoke', module: 'delegation', version: '1.1.0', status: 'working',
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
    evidence: F(['tests/e2e/v3app-acceptance.spec.mjs']),
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
    id: 'data.price', module: 'data', version: '1.1.0', status: 'working',
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
    id: 'shell.navigation', module: 'shell', version: '1.2.0', status: 'working',
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
    id: 'shell.help', module: 'shell', version: '1.0.0', status: 'working',
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
    id: 'shell.assistant', module: 'assistant', version: '1.0.0', status: 'demo',
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
    id: 'shell.sample_pages', module: 'shell', version: '1.1.0', status: 'demo',
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
    id: 'shell.numbered_probe', module: 'shell', version: '1.0.0', status: 'retired',
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
      Object.freeze({ id: 's3', target: 'member-scope-form', task: 'grant.saved', appears_after: 'members-list' }),
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
});

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
