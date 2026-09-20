// tests/e2e/v3app-core-flow.spec.mjs — AZ R63 MAGFOLYAM A VALÓDI BÖNGÉSZŐBEN (R64).
//
// EGY VILÁG, SOROS LÉPÉSEK: regisztráció → megerősítés a levél-fogadóból → belépés → saját magántér
// ÉS céges munkakörnyezet → munkatárs meghívása → a beváltás NÉGY útja (meglévő fiók · ROSSZ fiók ·
// biztonságos folytatás névtelenül · új fiók) → munkakörnyezet-váltás → engedélyezett adat → megvonás.
//
// Minden személy KÜLÖN böngésző-kontextus (saját süti-tárca). Minden lépés HÁROM forrásból mér:
// amit a lap mutatott (böngésző) · amit a szerver válaszolt (a felület kérése elfogva, vagy a
// böngésző sütijével küldött közvetlen kérés) · ami a tárolóban áll (második kapcsolat, csak olvasás).
import { test, expect } from '@playwright/test';
import {
  World, Db, PASSWORD, ANOTHER_PASSWORD, registerUI, verifyFromMailboxUI, loginUI, header, createWorkspaceUI,
  switchUI, setPlanUI, inviteUI, openInviteUI, redeemUI, stockUI, priceUI, grantScopeUI, revokeUI,
  memberRowText, workspaceListUI, sessionCookie, short,
} from './helpers.mjs';

test.describe.configure({ mode: 'serial' });

test.describe('R63 magfolyam a böngészőben — Anna · Béla · Cili · Dani · Erik', () => {
  let world; let db;
  let anna; let bela; let cili; let dani; let erik;
  let personalBook; let companyBook;
  let belaInvite; let ciliInvite; let daniInvite;

  test.beforeAll(async ({ browser }) => { world = new World(browser, 'mag'); db = new Db(); });
  test.afterAll(async () => { await world.close(); db.close(); });

  test('1. Anna regisztrál — a válasz SEMLEGES, a levél a fejlesztői levél-fogadóban áll', async () => {
    anna = await world.context();
    anna.email = world.email('anna');
    const r = await registerUI(anna.page, anna.email, PASSWORD);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true, message: 'Ha a cím szabad, megerősítő levelet küldtünk.' });
    // BÖNGÉSZŐ: a regisztrációs űrlap CSAK e-mailt és jelszót kér — céges adatot nem.
    const fields = await anna.page.locator('[data-testid="register-form"] input').evaluateAll((els) => els.map((e) => e.getAttribute('name')));
    expect(fields).toEqual(['email', 'password']);
    await expect(anna.page.getByTestId('section-mailbox')).toContainText('FEJLESZTŐI LEVÉL-FOGADÓ — nem küld külső személynek');
    const mailsBefore = (await anna.api.get('/dev/mailbox')).body.mails.length;
    // Ugyanaz a cím MÁS jelszóval újra → bájtra azonos semleges válasz, ÚJ levél nélkül (anti-enumeráció).
    const again = await anna.api.post('/api/register', { email: anna.email, password: ANOTHER_PASSWORD });
    expect(JSON.stringify(again.body)).toBe(JSON.stringify(r.body));
    expect((await anna.api.get('/dev/mailbox')).body.mails.length).toBe(mailsBefore);
    // ADATBÁZIS: a jelszó NYERSEN nem áll a tárolóban.
    const acc = db.get('SELECT a.credential FROM account a JOIN external_id x ON x.subject_id = a.subject_id WHERE x.value_norm = ?', anna.email);
    expect(acc && typeof acc.credential === 'string' && acc.credential.length > 20).toBeTruthy();
    expect(acc.credential.includes(PASSWORD)).toBe(false);
  });

  test('2. Anna a levél-fogadó hivatkozására kattint — megerősítve; másodszor a hivatkozás már halott', async () => {
    const v = await verifyFromMailboxUI(anna.page, anna.email);
    expect(v.resultText).toContain('bizonyítva');
    expect(db.count('SELECT COUNT(*) AS n FROM channel_proof WHERE value_norm = ?', anna.email)).toBe(1);
    const again = await anna.page.goto(v.href);
    expect(again.status()).toBe(400);
    await expect(anna.page.getByTestId('verify-result')).toHaveAttribute('data-ok', 'false');
    await expect(anna.page.getByTestId('verify-result')).toContainText('challenge_already_used');
    await anna.page.getByTestId('verify-back').click();
  });

  test('3. Anna belép — rossz jelszó nevezetten elutasítva; jó jelszóval a munkamenet ROTÁL, a fejléc őt mutatja', async () => {
    const bad = await loginUI(anna.page, anna.email, 'rossz-jelszo-00');
    expect(bad.status).toBe(401);
    expect(bad.body.reason).toBe('credentials_rejected');
    await expect(anna.page.getByTestId('login-result')).toContainText('credentials_rejected');
    const before = await sessionCookie(anna.ctx);
    const ok = await loginUI(anna.page, anna.email, PASSWORD);
    expect(ok.body.ok).toBe(true);
    anna.subjectId = ok.body.subject_id;
    expect(await sessionCookie(anna.ctx)).not.toBe(before);
    await expect(anna.page.getByTestId('channel-proven')).toHaveText('igen');
    await expect(anna.page.getByTestId('section-workspace')).toBeVisible();
    await expect(anna.page.getByTestId('ws-list')).toContainText('még nincs munkakörnyezeted');
  });

  test('4. Anna SAJÁT magánteret (adószám nélkül) és CÉGES munkakörnyezetet (HU adószám) indít', async () => {
    const p = await createWorkspaceUI(anna.page, { name: 'Anna magántere', plan: 'starter' });
    expect(p.status).toBe(201);
    expect(p.body.business).toBeNull();
    expect(p.resultText).not.toContain('vállalkozási minőség');
    personalBook = p.bookId;
    const c = await createWorkspaceUI(anna.page, { name: 'Családi Kft', plan: 'starter', business: { jurisdiction: 'HU', tax_id: '12345678-2-42' } });
    expect(c.status).toBe(201);
    expect(c.body.business.ok).toBe(true);
    expect(c.body.business.verification).toBe('none_available');
    expect(c.resultText).toContain('önbevallott, igazolás: none_available');
    companyBook = c.bookId;
    const h = await header(anna.page);
    expect(h.workspace).toBe('Családi Kft · admin · starter');
    const list = await workspaceListUI(anna.page);
    expect(list.map((x) => x.testid).sort()).toEqual([`ws-item-${personalBook}`, `ws-item-${companyBook}`].sort());
    // ADATBÁZIS: vállalkozási minőség CSAK a céges könyvön; a személy alanya változatlanul 'person'.
    expect(db.count('SELECT COUNT(*) AS n FROM business_identity WHERE book_id = ?', personalBook)).toBe(0);
    expect(db.count('SELECT COUNT(*) AS n FROM business_identity WHERE book_id = ?', companyBook)).toBe(1);
    expect(db.get('SELECT kind FROM subject WHERE id = ?', anna.subjectId).kind).toBe('person');
    expect(db.get('SELECT kind FROM subject WHERE id = ?', `ent_${companyBook}`).kind).toBe('legal_entity');
    expect(db.get('SELECT rule_version FROM workspace_bootstrap WHERE book_id = ?', companyBook).rule_version).toBe('v1');
  });

  test('5. Béla és Cili már regisztrált, megerősített, belépett fiók (saját böngészőben)', async () => {
    bela = await world.person('bela');
    cili = await world.person('cili');
    expect(bela.subjectId).toMatch(/^sub_/);
    expect(cili.subjectId).toMatch(/^sub_/);
    expect(db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id IN (?, ?)', bela.subjectId, cili.subjectId)).toBe(0);
  });

  test('6. Anna meghívja Bélát (user · keszlet) — a meghívó PLAFONNAL születik, a levél a fogadóban', async () => {
    belaInvite = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    expect(belaInvite.status).toBe(201);
    expect(belaInvite.body.ceiling.roles).toEqual(expect.arrayContaining(['user']));
    expect(belaInvite.resultText).toContain('plafon');
    expect(belaInvite.link).toContain(`/?invite=${belaInvite.token}`);
    // ADATBÁZIS: meghívó + pecsételt feltételek + kiadott korlát — mind egy alap alatt.
    expect(db.get('SELECT offered_role FROM invite WHERE token = ?', belaInvite.token).offered_role).toBe('user');
    expect(db.count('SELECT COUNT(*) AS n FROM invite_terms WHERE token = ?', belaInvite.token)).toBe(1);
    const ib = db.get('SELECT basis_id, scope FROM invite_basis WHERE token = ?', belaInvite.token);
    expect(ib.basis_id).toBe(`deleg:${companyBook}:${anna.subjectId}`);
    expect(ib.scope).toBe('keszlet');
    const basis = db.get('SELECT evidence_ref FROM authority_basis WHERE basis_id = ? AND book_id = ?', ib.basis_id, companyBook);
    expect(basis.evidence_ref).toContain(`delegated-from:startup-rule:${companyBook}`);
  });

  test('7. ROSSZ FIÓK: Cili belépve megnyitja Béla meghívóját — semleges válasz, nincs gomb, tagság nem születik', async () => {
    const o = await openInviteUI(cili.page, belaInvite.link);
    expect(o.observe.status).toBe('needs_invitee_identity');
    expect(o.observe.switch_account_offered).toBe(false);
    expect(o.observe.account_exists).toBeNull();
    expect(o.next).toContain('nem a meghívás címzettje');
    expect(o.redeemVisible).toBe(false);
    const forced = await cili.api.post('/api/invites/redeem', { token: belaInvite.token });
    expect(forced.status).toBe(403);
    expect(forced.body.error).toBe('invitee_identity_required');
    expect(db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ?', cili.subjectId, companyBook)).toBe(0);
    expect(db.get('SELECT redeemed_at FROM invite WHERE token = ?', belaInvite.token).redeemed_at).toBeNull();
    await cili.page.goto('/');
  });

  test('8. MEGLÉVŐ FIÓK: Béla belépve megnyitja a hivatkozást → redeem_as_existing → beváltás → tagság (adat NÉLKÜL)', async () => {
    const o = await openInviteUI(bela.page, belaInvite.link);
    expect(o.observe.status).toBe('redeem_as_existing');
    expect(o.observe.account_exists).toBe(true);
    expect(o.observe.continue_as.hint).toBe('m***@pelda.hu');
    expect(o.redeemVisible).toBe(true);
    const r = await redeemUI(bela.page);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, shape: 'membership_only', outcome: 'granted', book_id: companyBook, read_scope_granted: null });
    expect(r.notice).toContain('Az olvasási jogot az admin adja meg külön lépésben');
    await expect(bela.page.getByTestId('header-workspace')).toHaveText('Családi Kft · user · starter');
    const m = db.get('SELECT role, revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', bela.subjectId, companyBook);
    expect(m).toEqual({ role: 'user', revoked_at: null });
    expect(db.get('SELECT redeemed_at FROM invite WHERE token = ?', belaInvite.token).redeemed_at).not.toBeNull();
    expect(db.count('SELECT COUNT(*) AS n FROM scope_grant WHERE subject_id = ? AND book_id = ?', bela.subjectId, companyBook)).toBe(0);
    // Ugyanaz a meghívó másodszor → nevezett elutasítás, a tagság-sor nem duplázódik.
    const again = await bela.api.post('/api/invites/redeem', { token: belaInvite.token });
    expect(again.status).toBe(403);
    expect(again.body.reason).toBe('invite_already_redeemed');
  });

  test('9. BIZTONSÁGOS FOLYTATÁS: Cili NÉVTELENÜL nyitja a saját (admin) meghívóját → függő szándék → belép → a meghívás folytatódik', async () => {
    ciliInvite = await inviteUI(anna.page, { email: cili.email, role: 'admin', scope: 'keszlet' });
    expect(ciliInvite.status).toBe(201);
    const anon = await world.anonymous();
    const o = await openInviteUI(anon.page, ciliInvite.link);
    expect(o.observe.status).toBe('needs_invitee_identity');
    expect(o.next).toContain('Belépés után ide visszatérünk');
    expect(o.redeemVisible).toBe(false);
    // ADATBÁZIS: a szándék a SZERVEREN áll, a névtelen munkamenethez kötve.
    expect(db.count('SELECT COUNT(*) AS n FROM pending_intent WHERE invite_token = ?', ciliInvite.token)).toBeGreaterThanOrEqual(1);
    // A hivatkozás NÉLKÜL nyitott lapon lép be — a folytatást a szerver hozza vissza, nem az URL.
    await anon.page.goto('/');
    await expect(anon.page.getByTestId('section-invite')).toBeHidden();
    const login = await loginUI(anon.page, cili.email, PASSWORD);
    expect(login.body.pending_invite_token).toBe(ciliInvite.token);
    await expect(anon.page.getByTestId('section-invite')).toBeVisible();
    await expect(anon.page.getByTestId('invite-observe')).toContainText('redeem_as_existing');
    await expect(anon.page.getByTestId('invite-redeem')).toBeVisible();
    const r = await redeemUI(anon.page);
    expect(r.body).toMatchObject({ ok: true, shape: 'membership_only', outcome: 'granted', book_id: companyBook });
    await expect(anon.page.getByTestId('header-workspace')).toHaveText('Családi Kft · admin · starter');
    expect(db.get('SELECT role FROM membership WHERE subject_id = ? AND book_id = ?', cili.subjectId, companyBook).role).toBe('admin');
    expect(db.count('SELECT COUNT(*) AS n FROM pending_intent WHERE invite_token = ?', ciliInvite.token)).toBe(0);
    cili.adminPage = anon.page; cili.adminApi = anon.api;
  });

  test('10. ÚJ FIÓK: Dani a meghívóból regisztrál → megerősít → belép → beváltja', async () => {
    daniInvite = await inviteUI(anna.page, { email: world.email('dani'), role: 'user', scope: 'keszlet' });
    expect(daniInvite.status).toBe(201);
    dani = await world.anonymous();
    dani.email = world.email('dani');
    const o = await openInviteUI(dani.page, daniInvite.link);
    expect(o.observe.status).toBe('needs_invitee_identity');
    expect(o.next).toContain('regisztrálj azzal a címmel');
    await dani.page.getByTestId('register-email').fill(dani.email);
    await dani.page.getByTestId('register-password').fill(PASSWORD);
    await dani.page.getByTestId('register-submit').click();
    await expect(dani.page.getByTestId('register-result')).toContainText('megerősítő levelet');
    await verifyFromMailboxUI(dani.page, dani.email);
    const login = await loginUI(dani.page, dani.email, PASSWORD);
    dani.subjectId = login.body.subject_id;
    expect(login.body.pending_invite_token).toBe(daniInvite.token);
    await expect(dani.page.getByTestId('invite-observe')).toContainText('redeem_as_existing');
    const r = await redeemUI(dani.page);
    expect(r.body).toMatchObject({ ok: true, shape: 'membership_only', outcome: 'granted', book_id: companyBook });
    expect(db.get('SELECT role FROM membership WHERE subject_id = ? AND book_id = ?', dani.subjectId, companyBook).role).toBe('user');
    expect(db.get('SELECT kind FROM subject WHERE id = ?', dani.subjectId).kind).toBe('person');
  });

  test('11. MUNKAKÖRNYEZET-VÁLTÁS: a fejléc a helyes nevet/szerepet mutatja, az adat-terület ÜRÜL a lekérés előtt, a cégek nem keverednek', async () => {
    const plan = await setPlanUI(anna.page, 'pro');
    expect(plan.body).toMatchObject({ ok: true, plan: 'pro' });
    await expect(anna.page.getByTestId('header-workspace')).toHaveText('Családi Kft · admin · pro');
    const priceK = await priceUI(anna.page);
    expect(priceK.body.ok).toBe(true);
    expect(priceK.text).toContain('KIADVA');
    // A váltás kérését LASSÍTJUK, hogy közben mérhető legyen: a panel MÁR ÜRES, mielőtt új adat jönne.
    await anna.page.route('**/api/session/workspace', async (route) => { await new Promise((r) => setTimeout(r, 500)); await route.continue(); });
    await anna.page.getByTestId(`ws-switch-${personalBook}`).click();
    await expect(anna.page.getByTestId('data-price')).toHaveText('—');
    await expect(anna.page.getByTestId('data-stock')).toHaveText('—');
    await expect(anna.page.getByTestId('global-notice')).toContainText('Munkakörnyezet: Anna magántere (admin)');
    await anna.page.unroute('**/api/session/workspace');
    await expect(anna.page.getByTestId('header-workspace')).toHaveText('Anna magántere · admin · starter');
    const me = (await anna.api.get('/api/me')).body;
    expect(me.current_book_id).toBe(personalBook);
    const priceP = await priceUI(anna.page);
    expect(priceP.body).toMatchObject({ ok: false, refused_by: 'entitlement', entitlement_reason: 'feature_not_in_plan' });
    expect(priceP.text).toContain('előfizetés-kapu: feature_not_in_plan (terv: starter)');
    // Idegen könyv-paraméter a magánteres munkamenetben: FIGYELMEN KÍVÜL, a pro-könyv ára NEM jön ki.
    const forced = await anna.api.get(`/api/data/price?book_id=${companyBook}`);
    expect(forced.body).toMatchObject({ ok: false, param_ignored: true, ignored_params: ['book_id'], refused_by: 'entitlement' });
    const back = await switchUI(anna.page, companyBook);
    expect(back.body).toMatchObject({ ok: true, role: 'admin', name: 'Családi Kft' });
    await expect(anna.page.getByTestId('header-workspace')).toHaveText('Családi Kft · admin · pro');
    expect((await priceUI(anna.page)).body.result.unit_price).toBe(3490);
  });

  test('12. ENGEDÉLYEZETT ADAT: Béla készlet-nézete az adatkör-adás ELŐTT elutasítva, UTÁNA kiadva; az ár nem következik belőle', async () => {
    const before = await stockUI(bela.page);
    expect(before.body).toMatchObject({ ok: false, refused_by: 'right', reason: 'not_available' });
    expect(before.text).toContain('ELUTASÍTVA — melyik kapu: right');
    const g = await grantScopeUI(anna.page, bela.subjectId, 'keszlet');
    expect(g.body).toMatchObject({ ok: true, scope: 'keszlet' });
    expect(g.resultText).toContain('Adatkör megadva: keszlet');
    await expect(anna.page.getByTestId(`member-${bela.subjectId}`)).toContainText('keszlet: van');
    const row = db.get('SELECT scope, granted_by FROM scope_grant WHERE subject_id = ? AND book_id = ?', bela.subjectId, companyBook);
    expect(row).toEqual({ scope: 'keszlet', granted_by: anna.subjectId });
    const after = await stockUI(bela.page);
    expect(after.body).toMatchObject({ ok: true, refused_by: null, result: { qty: '12' } });
    expect(after.text).toContain('KIADVA');
    expect(Object.keys(after.body.result)).toEqual(['qty']);
    const price = await priceUI(bela.page);
    expect(price.body).toMatchObject({ ok: false, refused_by: 'right', right_reason: 'not_available', entitlement_reason: 'feature_entitled' });
  });

  test('13. MEGVONÁS: az ÚJ kérésen már hatályos — adat és váltás elutasítva; a megvont admin FÜGGŐ meghívója nem váltható be', async () => {
    const v = await revokeUI(anna.page, bela.subjectId);
    expect(v.body).toMatchObject({ ok: true, reason: 'revocation_recorded' });
    expect(v.body.revocation.changed).toBe(true);
    // A lista a válasz UTÁN töltődik újra (KUKA-046): a próba az ÚJ igazságot várja meg, nem a régi sort olvassa.
    await expect(anna.page.getByTestId(`member-${bela.subjectId}`)).toContainText('NEM hatályos (membership_revoked)');
    await expect(anna.page.getByTestId(`member-revoke-${bela.subjectId}`)).toBeDisabled();
    const stock = await stockUI(bela.page);
    expect(stock.body).toMatchObject({ ok: false, refused_by: 'right', reason: 'not_a_member', detail: 'membership_revoked' });
    const me = (await bela.api.get('/api/me')).body;
    expect(me.current_book_id).toBeNull();
    expect(me.workspaces.map((w) => w.book_id)).not.toContain(companyBook);
    const sw = await bela.api.post('/api/session/workspace', { book_id: companyBook });
    expect(sw.status).toBe(403);
    expect(sw.body).toMatchObject({ reason: 'not_a_member', detail: 'membership_revoked' });
    await bela.page.reload();
    await expect(bela.page.getByTestId('header-workspace')).toHaveText('nincs munkakörnyezet');
    expect(db.count('SELECT COUNT(*) AS n FROM membership_revocation WHERE subject_id = ? AND book_id = ?', bela.subjectId, companyBook)).toBe(1);

    // A megvont ADMIN függő meghívója: Cili (admin) meghívja Eriket, majd Anna megvonja Cilit.
    const erikInvite = await inviteUI(cili.adminPage, { email: world.email('erik'), role: 'user', scope: 'keszlet' });
    expect(erikInvite.status).toBe(201);
    expect(erikInvite.body.basis_id).toBe(`deleg:${companyBook}:${cili.subjectId}`);
    const vc = await revokeUI(anna.page, cili.subjectId);
    expect(vc.body.delegation).toMatchObject({ ok: true, reason: 'basis_revoked' });
    expect(db.get('SELECT revoked_at FROM authority_basis WHERE basis_id = ? AND book_id = ?', `deleg:${companyBook}:${cili.subjectId}`, companyBook).revoked_at).not.toBeNull();
    erik = await world.person('erik');
    const o = await openInviteUI(erik.page, erikInvite.link);
    expect(o.redeemVisible).toBe(true);           // a megfigyelés a csatornát és az ablakot méri — a kiadó jogát a BEVÁLTÁS
    const r = await redeemUI(erik.page);
    expect(r.status).toBe(403);
    expect(r.body).toMatchObject({ ok: false, error: 'invite_not_actionable', reason: 'issuer_right_withdrawn' });
    expect(r.resultText).toContain('issuer_right_withdrawn');
    expect(db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ?', erik.subjectId, companyBook)).toBe(0);
    expect(db.get('SELECT redeemed_at FROM invite WHERE token = ?', erikInvite.token).redeemed_at).toBeNull();
    // Független jog nem szűnik meg: Dani (Anna hívta) továbbra is tag, Anna továbbra is admin.
    expect(db.get('SELECT revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', dani.subjectId, companyBook).revoked_at).toBeNull();
    await expect(anna.page.getByTestId('header-workspace')).toHaveText('Családi Kft · admin · pro');
    expect(short(erikInvite.token)).toMatch(/…$/);
  });
});
