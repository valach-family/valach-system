// tests/e2e/v3app-r112-stories.spec.mjs — AZ ÖT HASZNÁLATI TÖRTÉNET HIÁNYZÓ RÉSZEI (R112 §1).
//
// A MEGLÉVŐ BIZONYÍTÉKOT NEM MÁSOLJUK ÚJRA (R112 §4: „először rendeld a meglévő bizonyítékokat az öt
// történethez, majd csak a hiányzó vagy érintett helyeken bővíts"). A hozzárendelés a REPORT-ban áll;
// ez a lap azt méri, amit a meglévő próbák NEM mértek, vagy amit ez a csomag MEGVÁLTOZTATOTT:
//
//   R112-S1  MAGÁNSZEMÉLY németül (a magyar út a magfolyam 1–4., az angol az R112-I1/en része):
//            regisztráció → megerősítés → belépés → személyes fiók → ki/be, a nyelv marad; az adatbázisban
//            EGY személy, EGY személyes fiók, és vállalkozási adat nincs
//   R112-S2  EGYEDÜL DOLGOZÓ VÁLLALKOZÓ: vállalkozási fiók a meglévő adóazonosító-kezeléssel → váltás a
//            személyes és a vállalkozási fiók között; NEM születik új személy, a fejléc a szerepkört SZÓVAL
//            mondja (R112 javítás: nyers „szerep: admin" helyett)
//   R112-S4  TÖBB VÁLLALKOZÁS: tag az egyikben, fiókkezelő a másikban — a fejléc minden váltás után a
//            HELYES fiókot és szerepkört mondja, a nyelvcsomag szavaival, és a korábbi fiók adata nem marad
//   R112-S5  KEZELŐ ÉS MUNKATÁRS: tagság → adatkör-engedély (a TÁROLT sorral mérve) → a munkatárs VALÓBAN
//            látja az adatot → a hozzáférés megszüntetése (a tárolt megszüntetéssel mérve) → a munkatárs
//            érthető visszajelzést kap, és a személyes fiókja használható marad
//
// A 3. TÖRTÉNET (bővülő kisvállalkozás) a meghívó-lapokon áll: `v3app-r109-invite.spec.mjs` és
// `v3app-r112-invite.spec.mjs`. A jogosultsági döntéseket (mag) ez a lap NEM módosítja, csak méri.
import { test, expect } from '@playwright/test';
import {
  World, Db, PASSWORD, withResponse, inviteUI, openInviteUI, redeemUI, createWorkspaceUI, switchUI, logoutUI,
  grantScopeUI, revokeUI, stockUI, gotoPage,
} from './helpers.mjs';
import { dictFor, tpl as tplFor } from '../../v3app/public/i18n/dict.mjs';

test.describe.configure({ mode: 'serial' });

const taxOf = (tag, d) => `${tag.replace(/\D/g, '').slice(0, 1).padStart(1, '7')}${d}345672-2-42`;
const HU = dictFor('hu');

async function pickPublicLang(page, code) {
  const sel = page.getByTestId('lang-select-public');
  await expect(sel).toBeVisible();
  await sel.selectOption(code);
  await expect(page.locator('html')).toHaveAttribute('lang', code);
}
async function loginHere(page, email) {
  await page.waitForSelector('[data-testid="login-email"], [data-auth="login"]');
  if (await page.getByTestId('login-email').count() === 0) await page.locator('[data-auth="login"]').first().click();
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(PASSWORD);
  return withResponse(page, { path: '/api/login' }, () => page.getByTestId('login-submit').click());
}
/** A fejléc „ki nevében" sora — a képernyőolvasónak mindig ott van (R81 §3.3), ezért onnan olvassuk. */
const actingAs = async (page) => (await page.getByTestId('header-acting-as').textContent()) || '';

test.describe('R112 — az öt használati történet hiányzó részei', () => {
  let db; let w;

  test.beforeAll(async ({ browser }) => {
    db = new Db();
    w = new World(browser, `r112s-${Date.now().toString(36)}`);
  });
  test.afterAll(async () => { if (w) await w.close(); if (db) db.close(); });

  test('R112-S1 — MAGÁNSZEMÉLY németül: regisztráció → megerősítés → belépés → személyes fiók → ki/be, nyelv marad', async () => {
    const D = dictFor('de');
    const email = w.email('privat');
    const c = await w.anonymous();
    await c.page.goto('/');
    await pickPublicLang(c.page, 'de');
    await c.page.locator('[data-auth="register"]').first().click();
    await c.page.getByTestId('register-email').fill(email);
    await c.page.getByTestId('register-password').fill(PASSWORD);
    const reg = await withResponse(c.page, { path: '/api/register' }, () => c.page.getByTestId('register-submit').click());
    expect(reg.body.ok).toBe(true);
    await expect(c.page.getByTestId('register-result')).toHaveText(D.UI.registerSentLead);

    // A MEGERŐSÍTŐ LEVÉL a választott nyelven megy ki, és a hivatkozása működik.
    await c.page.getByTestId('demo-mail-open').click();
    const li = c.page.locator('li[data-testid^="mail-"]').filter({ hasText: email }).filter({ hasText: D.SRV.mailVerifySubject }).first();
    await expect(li).toBeVisible();
    await li.locator('a[data-testid^="mail-link-"]').click();
    await expect(c.page.getByTestId('verify-result')).toHaveAttribute('data-ok', 'true');
    await c.page.getByTestId('verify-back').click();

    const login = await loginHere(c.page, email);
    expect(login.body.ok).toBe(true);
    await expect(c.page.getByTestId('app')).toBeVisible();
    await expect(c.page.locator('html')).toHaveAttribute('lang', 'de');
    // A SZEMÉLYES FIÓK nyílik meg, a fejléc a nyelvcsomag szavaival mondja, ki nevében jár el.
    await expect(c.page.getByTestId('header-workspace')).toHaveText(D.STATE.personalAccount);
    expect(await actingAs(c.page)).toBe(tplFor('actingAsPersonal', { ki: email, fiok: D.STATE.personalAccount }, 'de'));
    await expect(c.page.getByTestId('nav-personal')).toBeVisible();
    await expect(c.page.getByTestId('nav-members')).toHaveCount(0);

    // A TÁROLT TÉNY: EGY személy EGY címmel, EGY személyes fiók, vállalkozási adat NINCS.
    const subjectId = login.body.subject_id;
    expect(db.count('SELECT COUNT(DISTINCT subject_id) AS n FROM external_id WHERE value_norm = ?', email.toLowerCase())).toBe(1);
    expect(db.count('SELECT COUNT(*) AS n FROM personal_space WHERE subject_id = ?', subjectId)).toBe(1);
    expect(db.count(`SELECT COUNT(*) AS n FROM business_identity bi JOIN membership m ON m.book_id = bi.book_id
      WHERE m.subject_id = ?`, subjectId)).toBe(0);

    // KIJELENTKEZÉS ÉS ÚJRABELÉPÉS: a nyelv a személyé, megmarad.
    await logoutUI(c.page);
    const again = await loginHere(c.page, email);
    expect(again.body.ok).toBe(true);
    await expect(c.page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(c.page.getByTestId('header-workspace')).toHaveText(D.STATE.personalAccount);
    await c.ctx.close();
  });

  test('R112-S2 — EGYÉNI VÁLLALKOZÓ: vállalkozási fiók → váltás személyes és vállalkozási között, új személy nélkül', async () => {
    const feri = await w.person('feri');
    const personal = (await feri.api.get('/api/me')).body.personal_book_id;
    expect(personal).toBeTruthy();
    const biz = await createWorkspaceUI(feri.page, { name: 'Feri Egyéni', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag, 1) } });
    expect(biz.body.ok).toBe(true);

    // A FEJLÉC a vállalkozási fiókot és a szerepkört SZÓVAL mondja — nyers kód nélkül.
    await expect(feri.page.getByTestId('header-workspace')).toHaveText('Feri Egyéni');
    expect(await actingAs(feri.page)).toBe(tplFor('actingAsBusiness', { ki: feri.email, fiok: 'Feri Egyéni', szerep: HU.ROLE.admin }, 'hu'));
    expect(await actingAs(feri.page)).not.toMatch(/szerep: admin/);

    // VÁLTÁS a személyes fiókra, majd vissza — a menü és a fejléc a fiókot követi.
    await switchUI(feri.page, personal);
    await expect(feri.page.getByTestId('header-workspace')).toHaveText(HU.STATE.personalAccount);
    expect(await actingAs(feri.page)).toBe(tplFor('actingAsPersonal', { ki: feri.email, fiok: HU.STATE.personalAccount }, 'hu'));
    await expect(feri.page.getByTestId('nav-members')).toHaveCount(0);
    await switchUI(feri.page, biz.bookId);
    await expect(feri.page.getByTestId('header-workspace')).toHaveText('Feri Egyéni');
    await expect(feri.page.getByTestId('nav-members')).toBeVisible();

    // A TÁROLT TÉNY: UGYANAZ a személy, a személyes fiók változatlan, a vállalkozás a céges
    // azonosítóval kötött, és ő a fiókkezelője — NEM született második személyes identitás.
    expect(db.count('SELECT COUNT(DISTINCT subject_id) AS n FROM external_id WHERE value_norm = ?', feri.email.toLowerCase())).toBe(1);
    expect(db.get('SELECT book_id FROM personal_space WHERE subject_id = ?', feri.subjectId).book_id).toBe(personal);
    expect(db.get('SELECT jurisdiction FROM business_identity WHERE book_id = ?', biz.bookId).jurisdiction).toBe('HU');
    const m = db.get('SELECT role, revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', feri.subjectId, biz.bookId);
    expect(m.role).toBe('admin');
    expect(m.revoked_at).toBeNull();
  });

  test('R112-S4/S5 — TÖBB VÁLLALKOZÁS és KEZELŐ–MUNKATÁRS: váltás, adatkör-engedély, megszüntetés — tárolt következménnyel', async () => {
    const anna = await w.person('anna');
    const gabi = await w.person('gabi');
    const cegA = await createWorkspaceUI(anna.page, { name: 'Anna Kft', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag, 2) } });
    expect(cegA.body.ok).toBe(true);
    const cegC = await createWorkspaceUI(gabi.page, { name: 'Gabi Bt', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag, 3) } });
    expect(cegC.body.ok).toBe(true);

    // TAGSÁG: Anna meghívja Gabit, Gabi a saját kattintásával fogad el.
    const inv = await inviteUI(anna.page, { email: gabi.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(gabi.page, inv.link);
    const r = await redeemUI(gabi.page);
    expect(r.body.ok).toBe(true);

    // S4 — A FEJLÉC minden váltás után a HELYES fiókot és szerepkört mondja.
    await expect(gabi.page.getByTestId('header-workspace')).toHaveText('Anna Kft');
    expect(await actingAs(gabi.page)).toBe(tplFor('actingAsBusiness', { ki: gabi.email, fiok: 'Anna Kft', szerep: HU.ROLE.user }, 'hu'));
    // A tag nem lát fiókkezelői menüt.
    await expect(gabi.page.getByTestId('nav-members')).toHaveCount(0);
    // ADATKÖR MÉG NINCS: a készlet nevezetten zárt, és a mondat megmondja, ki engedélyezheti.
    const elotte = await stockUI(gabi.page);
    expect(elotte.granted).toBe(false);
    expect(elotte.text).toContain(HU.REASON.no_scope_grant.split('.')[0]);

    await switchUI(gabi.page, cegC.bookId);
    await expect(gabi.page.getByTestId('header-workspace')).toHaveText('Gabi Bt');
    expect(await actingAs(gabi.page)).toBe(tplFor('actingAsBusiness', { ki: gabi.email, fiok: 'Gabi Bt', szerep: HU.ROLE.admin }, 'hu'));
    await expect(gabi.page.getByTestId('nav-members')).toBeVisible();
    // A KORÁBBI FIÓK ADATA NEM MARAD: a saját cégében a készlet-lap a saját állapotát mutatja.
    await gotoPage(gabi.page, 'overview');
    await expect(gabi.page.getByTestId('main')).not.toContainText('Anna Kft');

    // S5 — ANNA ADATKÖRT AD: a tárolt sorral mérve, nem a felirattal.
    await switchUI(gabi.page, cegA.bookId);
    const grant = await grantScopeUI(anna.page, gabi.subjectId, 'keszlet');
    expect(grant.body.ok).toBe(true);
    expect(db.count('SELECT COUNT(*) AS n FROM scope_grant WHERE subject_id = ? AND book_id = ? AND scope = ?', gabi.subjectId, cegA.bookId, 'keszlet')).toBe(1);
    expect(db.count('SELECT COUNT(*) AS n FROM scope_grant_revocation WHERE subject_id = ? AND book_id = ?', gabi.subjectId, cegA.bookId)).toBe(0);
    // A MUNKATÁRS VALÓBAN LÁTJA: a szerver kiadja, a felület kirajzolja.
    const utana = await stockUI(gabi.page);
    expect(utana.body && utana.body.ok).toBe(true);
    expect(utana.granted).toBe(true);

    // MEGSZÜNTETÉS: a tárolt megszüntetéssel mérve, és Anna érthető visszajelzést kap.
    const rev = await revokeUI(anna.page, gabi.subjectId);
    expect(rev.body.ok).toBe(true);
    expect(rev.resultText).toBe(tplFor('memberRevoked', { ki: gabi.email, nev: 'Anna Kft' }, 'hu'));
    expect(db.get('SELECT revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', gabi.subjectId, cegA.bookId).revoked_at).not.toBeNull();
    expect(db.count('SELECT COUNT(*) AS n FROM membership_revocation WHERE subject_id = ? AND book_id = ?', gabi.subjectId, cegA.bookId)).toBe(1);

    // GABI KÖVETKEZŐ KÉRÉSE már elutasított, és a lap KIMONDJA, mi történt — a személyes fiókja
    // és a saját cége megmarad.
    const zart = await gabi.api.get(`/api/data/stock?expected_book_id=${encodeURIComponent(cegA.bookId)}&expected_subject_id=${encodeURIComponent(gabi.subjectId)}`);
    expect(zart.body.ok).toBe(false);
    // A NYITVA HAGYOTT LAPON a következő kattintás (a készlet frissítése) derít fényt rá: a lap nem
    // mutat régi adatot, hanem KIMONDJA, hogy a hozzáférés megszűnt, és a személyes fiókot kínálja.
    const lost = await stockUI(gabi.page);
    expect(lost.granted).toBe(false);
    const notice = gabi.page.getByTestId('global-notice');
    await expect(notice).toContainText(tplFor('accountLost', { nev: 'Anna Kft' }, 'hu'));
    await expect(notice).toContainText(HU.UI.personalStillUsable);
    const me = (await gabi.api.get('/api/me')).body;
    expect(me.workspaces.map((x) => x.book_id)).not.toContain(cegA.bookId);
    expect(me.workspaces.map((x) => x.book_id)).toContain(cegC.bookId);
    expect(me.workspaces.some((x) => x.personal === true)).toBe(true);
  });
});
