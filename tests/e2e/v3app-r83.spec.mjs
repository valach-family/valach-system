// tests/e2e/v3app-r83.spec.mjs — AZ R83 HAT LELETE VALÓDI BÖNGÉSZŐBEN (CMD-VS-300-002-002 R83).
//
// A külső ellenőrző fél (chatgpt-v3) hat eltérést reprodukált a SAJÁT környezetében. Ez a lap
// UGYANAZOKAT a helyzeteket járja végig itt — előbb a LELETET (a javítás előtti állapotot), majd a
// javítás után a helyes viselkedést, mindkét irányban mérve (KUKA-051: a tiltás mellé pozitív pár).
//
// F83-01  A MEGNYITOTT PANEL A MEGNYITÁSKORI NÉZETHEZ TARTOZIK. A régi meghívó-panel MÁSODIK
//         kattintása az időközben aktívvá lett MÁSIK fiókba írt (HTTP 201), miközben a panel még az
//         eredeti cég nevét és a beírt címet mutatta. Ez nem jog-megkerülés: a SZÁNDÉK és a
//         VÉGREHAJTÁS CÉLJA vált el.
// F83-02  A MUNKALAP CSAK LÁTSZÓLAG ŐRZI A MUNKÁT: a kitöltés a visszatéréskor eltűnt.
// F83-03  A KÉSZLET-JELLEGŰ NÉZETEK NEM UGYANAZT A HOZZÁFÉRÉST MUTATTÁK (a Termékkarton és a
//         Készletmozgások engedély nélkül is adatot rajzolt).
// F83-05  A SIKERTELEN LEVÉLKÉRÉS UTÁN IS SIKERES FOLYTATÁS látszott (a válasz nem volt mérve).
import { test, expect } from '@playwright/test';
import {
  World, Db, PASSWORD, createWorkspaceUI, switchUI, header, stockUI, inviteUI, openInviteUI, redeemUI,
  loginUI, logoutUI, withResponse, withOptionalResponse, openSwitcher, openStockPage, openMemberPanel,
  gotoPage, openMailbox, grantScopeUI,
} from './helpers.mjs';

test('R83/F83-01 — a régi meghívó-panel MÁSODIK kattintása sem ír a közben aktívvá lett MÁSIK fiókba', async ({ browser }) => {
  const w = new World(browser, 'r8301'); const db = new Db();
  try {
    const anna = await w.person('anna');
    const A = await createWorkspaceUI(anna.page, { name: 'Első Műhely Kft' });
    const B = await createWorkspaceUI(anna.page, { name: 'Második Műhely Kft' });
    await switchUI(anna.page, A.bookId);

    // 1. ANNA MEGNYITJA A MEGHÍVÁST AZ ELSŐ MŰHELYBEN, és beírja a címet.
    await gotoPage(anna.page, 'members');
    await anna.page.getByTestId('invite-open').click();
    await expect(anna.page.getByTestId('invite-email')).toBeVisible();
    const cim = w.email('bela');
    await anna.page.getByTestId('invite-email').fill(cim);
    // A PANEL KIMONDJA, MELYIK FIÓKBAN ÁLL — és ehhez KÖTÖTT is (nem csak felirat).
    await expect(anna.page.getByTestId('panel-body')).toContainText('Első Műhely Kft');

    // 2. EGY MÁSIK FÜL (közös süti) átvált a MÁSODIK MŰHELYRE.
    const masik = await anna.ctx.newPage();
    await masik.goto('/');
    await openSwitcher(masik);
    await masik.getByTestId(`ws-switch-${B.bookId}`).click();
    await expect(masik.getByTestId('header-workspace')).toContainText('Második Műhely Kft');

    // 3. AZ ELSŐ KATTINTÁS: a szerver nevezetten elutasít (409, wrote=false).
    const elotte = db.count('SELECT COUNT(*) AS n FROM invite');
    const elso = await withOptionalResponse(anna.page, { path: '/api/invites', method: 'POST' },
      () => anna.page.getByTestId('invite-submit').click());
    if (elso) {
      expect(elso.status).toBe(409);
      expect(elso.body.reason).toBe('context_mismatch');
      expect(elso.body.wrote).toBe(false);
    }
    // 4. A LAP A SZERVER IGAZSÁGÁHOZ IGAZODIK — és a RÉGI PANEL ÉRVÉNYTELEN: bezárul, a lap
    //    kimondja, mi történt. Régi kitöltés NEM vihető át az új fiókba.
    await expect(anna.page.getByTestId('global-notice')).toContainText(/fiókot váltottál|Másik felhasználó|másik fiókra/i);
    await expect(anna.page.getByTestId('invite-email')).toHaveCount(0);
    await expect(anna.page.getByTestId('header-workspace')).toContainText('Második Műhely Kft');

    // 5. A LELET LÉNYEGE: MÁSODIK kattintás a régi panelről NEM LÉTEZIK (a panel bezárult), és a
    //    tárolóban NEM keletkezett meghívó SEMMELYIK fiókba.
    expect(db.count('SELECT COUNT(*) AS n FROM invite')).toBe(elotte);
    expect(db.count('SELECT COUNT(*) AS n FROM invite WHERE book_id = ?', B.bookId)).toBe(0);
    expect(db.count('SELECT COUNT(*) AS n FROM invite WHERE book_id = ?', A.bookId)).toBe(0);

    // 6. POZITÍV ELLENPÁR: az ÚJ, egyértelműen megnyitott fiókban ugyanez a művelet MŰKÖDIK.
    await gotoPage(anna.page, 'members');
    const jo = await inviteUI(anna.page, { email: w.email('cili'), role: 'user', scope: 'keszlet' });
    expect(jo.status).toBe(201);
    expect(jo.body.served_book_id).toBe(B.bookId);
    expect(db.count('SELECT COUNT(*) AS n FROM invite WHERE book_id = ?', B.bookId)).toBe(1);
    await masik.close();
  } finally { await w.close(); db.close(); }
});

test('R83/F83-01/b — ugyanez a szabály a jogadásra, a megszüntetésre és a csomagra is (EGY közös őr)', async ({ browser }) => {
  const w = new World(browser, 'r8301b'); const db = new Db();
  try {
    const anna = await w.person('anna');
    const A = await createWorkspaceUI(anna.page, { name: 'Alfa Kft' });
    const B = await createWorkspaceUI(anna.page, { name: 'Béta Kft' });
    await switchUI(anna.page, A.bookId);
    const bela = await w.person('bela');
    const inv = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(bela.page, inv.link); await redeemUI(bela.page);
    await anna.page.reload();
    await gotoPage(anna.page, 'members');

    // A JOGADÁS PANELJE AZ ALFÁBAN nyílik meg…
    await openMemberPanel(anna.page, bela.subjectId);
    await anna.page.getByTestId(`member-scope-select-${bela.subjectId}`).selectOption('keszlet');
    // …közben egy másik fül a BÉTÁRA vált.
    const masik = await anna.ctx.newPage();
    await masik.goto('/');
    await openSwitcher(masik);
    await masik.getByTestId(`ws-switch-${B.bookId}`).click();
    await expect(masik.getByTestId('header-workspace')).toContainText('Béta Kft');

    // AZ ALAPSOKASÁG KIMONDVA (KUKA-093): a fiók létrehozása a LÉTREHOZÓNAK magának ad adatkört,
    // tehát a Béta könyvén MÁR ÁLL két sor (Anna keszlet+arak). A mérés ezért a KÜLÖNBSÉGET
    // méri, nem a nullát — és külön azt, hogy BÉLÁNAK nem keletkezett joga a Bétában.
    const elotte = db.count('SELECT COUNT(*) AS n FROM scope_grant');
    const elotteB = db.count('SELECT COUNT(*) AS n FROM scope_grant WHERE book_id = ?', B.bookId);
    const r = await withOptionalResponse(anna.page, { path: '/api/members/scope', method: 'POST' },
      () => anna.page.getByTestId(`member-scope-${bela.subjectId}`).click());
    if (r) { expect(r.status).toBe(409); expect(r.body.wrote).toBe(false); }
    // A PANEL ÉRVÉNYTELEN: bezárult, és a MÁSODIK kattintás sem tud a Bétába írni.
    await expect(anna.page.getByTestId(`member-scope-${bela.subjectId}`)).toHaveCount(0);
    expect(db.count('SELECT COUNT(*) AS n FROM scope_grant')).toBe(elotte);
    expect(db.count('SELECT COUNT(*) AS n FROM scope_grant WHERE book_id = ?', B.bookId)).toBe(elotteB);
    expect(db.count('SELECT COUNT(*) AS n FROM scope_grant WHERE book_id = ? AND subject_id = ?', B.bookId, bela.subjectId)).toBe(0);

    // A CSOMAG-MÓDOSÍTÁS UGYANÍGY: az Alfában megnyitott Előfizetés lap nem írhat a Bétába.
    await anna.page.reload();
    await expect(anna.page.getByTestId('header-workspace')).toContainText('Béta Kft');
    await switchUI(anna.page, A.bookId);
    await gotoPage(anna.page, 'plan');
    await anna.page.getByTestId('plan-select').selectOption('pro');
    await openSwitcher(masik);
    await masik.getByTestId(`ws-switch-${B.bookId}`).click();
    await expect(masik.getByTestId('header-workspace')).toContainText('Béta Kft');
    const planElotte = db.get('SELECT plan FROM entitlement_profile WHERE book_id = ?', B.bookId);
    const p = await withOptionalResponse(anna.page, { path: '/api/workspaces/plan', method: 'POST' },
      () => anna.page.getByTestId('plan-submit').click());
    if (p) expect(p.status).toBe(409);
    expect(db.get('SELECT plan FROM entitlement_profile WHERE book_id = ?', B.bookId)).toEqual(planElotte);
    await masik.close();
  } finally { await w.close(); db.close(); }
});

test('R83/F83-02 — a munkalap ŐRZI a kitöltést, és a saját elhagyás megkérdez', async ({ browser }) => {
  const w = new World(browser, 'r8302');
  try {
    const anna = await w.person('anna');
    await createWorkspaceUI(anna.page, { name: 'Munkalap Kft' });

    // 1. UGYANAZ A SZEMÉLY, UGYANAZ A FIÓK: a kitöltés a munkalapon MEGMARAD.
    await openSwitcher(anna.page);
    await anna.page.getByTestId('ws-add').click();
    await anna.page.getByTestId('ws-name').fill('Félbehagyott Kft');
    await anna.page.getByTestId('ws-tax-id').fill('11111111-1-11');
    await gotoPage(anna.page, 'overview');
    await anna.page.getByTestId('tab-new').click();
    await expect(anna.page.getByTestId('ws-name')).toHaveValue('Félbehagyott Kft');
    await expect(anna.page.getByTestId('ws-tax-id')).toHaveValue('11111111-1-11');

    // 2. SAJÁT FIÓKVÁLTÁS: a lap MEGKÉRDEZ, és a „Szerkesztés folytatása" NEM vált.
    await openSwitcher(anna.page);
    const me = (await anna.api.get('/api/me')).body;
    const masikFiok = me.workspaces.find((x) => x.book_id !== me.current_book_id);
    // A FEJLÉCBEN A FELÜLET NEVE ÁLL (R83/F83-04): a személyes fióké „Személyes fiók", nem a tárolt
    // belső név — a próba ezért a MEGJELENÍTETT alakot méri, nem az adatbázis-sort.
    const masikCimke = masikFiok.personal ? 'Személyes fiók' : masikFiok.name;
    await anna.page.getByTestId(`ws-switch-${masikFiok.book_id}`).click();
    await expect(anna.page.getByTestId('unsaved-dialog')).toBeVisible();
    await expect(anna.page.getByTestId('unsaved-dialog')).toContainText('Vannak nem mentett módosításaid');
    await anna.page.getByTestId('unsaved-keep').click();
    await expect(anna.page.getByTestId('header-workspace')).not.toContainText(masikCimke);
    await expect(anna.page.getByTestId('ws-name')).toHaveValue('Félbehagyott Kft');

    // 3. „ELVETÉS ÉS VÁLTÁS": a váltás megtörténik, és az űrlap NEM utazik át az új fiókba.
    await openSwitcher(anna.page);
    await anna.page.getByTestId(`ws-switch-${masikFiok.book_id}`).click();
    await expect(anna.page.getByTestId('unsaved-dialog')).toBeVisible();
    await anna.page.getByTestId('unsaved-discard').click();
    await expect(anna.page.getByTestId('header-workspace')).toContainText(masikCimke);
    await openSwitcher(anna.page);
    await anna.page.getByTestId('ws-add').click();
    await expect(anna.page.getByTestId('ws-name')).toHaveValue('');
  } finally { await w.close(); }
});

test('R83/F83-03 — a készlet-jellegű nézetek UGYANAZT a hozzáférést mutatják', async ({ browser }) => {
  const w = new World(browser, 'r8303');
  try {
    const anna = await w.person('anna');
    await createWorkspaceUI(anna.page, { name: 'Készlet Kft' });
    const bela = await w.person('bela');
    const inv = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(bela.page, inv.link); await redeemUI(bela.page);

    // BÉLA JOG NÉLKÜL: a készlet elutasítva — és a TERMÉKKARTON meg a KÉSZLETMOZGÁSOK sem rajzol adatot.
    const s = await stockUI(bela.page);
    expect(s.body.ok).toBe(false);
    expect(s.granted).toBe(false);
    for (const oldal of ['stockcard', 'movements']) {
      await gotoPage(bela.page, oldal);
      await expect(bela.page.getByTestId(`${oldal}-denied`)).toBeVisible();
      const szoveg = (await bela.page.getByTestId('main').textContent()) || '';
      expect(szoveg).not.toMatch(/\b840\b|\b200\b|−80/);
    }

    // A JOG MEGADÁSA UTÁN UGYANAZ A HÁROM NÉZET AD ADATOT (pozitív ellenpár).
    await grantScopeUI(anna.page, bela.subjectId, 'keszlet');
    const s2 = await stockUI(bela.page);
    expect(s2.body.ok).toBe(true);
    expect(s2.granted).toBe(true);
    for (const oldal of ['stockcard', 'movements']) {
      await gotoPage(bela.page, oldal);
      await expect(bela.page.getByTestId(`${oldal}-table`)).toBeVisible();
      expect(await bela.page.getByTestId(`${oldal}-denied`).count()).toBe(0);
    }
    // A MENNYISÉG JELLEGÉT NEM TALÁLJUK KI: a mag válaszán („qty") nincs mérési eredet és raktár.
    await gotoPage(bela.page, 'stock');
    const tabla = (await bela.page.getByTestId('stock-table').textContent()) || '';
    expect(tabla).toContain('Bemutató tétel');
    expect(tabla).not.toContain('Mag minta-rekord');
  } finally { await w.close(); }
});

test('R83/F83-05 — sikertelen levélkérés NEM mutat sikeres folytatást', async ({ browser }) => {
  const w = new World(browser, 'r8305');
  try {
    const c = await w.context();
    const email = w.email('dora');
    await c.page.goto('/');
    await c.page.locator('[data-auth="resend"]').first().click();
    await expect(c.page.getByTestId('resend-email')).toBeVisible();
    await c.page.getByTestId('resend-email').fill(email);
    // A KÉRÉST MEGSZAKÍTJUK — a hálózat elszakadását modellezve.
    await c.page.route('**/api/verification/resend', (route) => route.abort('failed'));
    await c.page.getByTestId('resend-submit').click();
    // A LAP NEM ÁLLÍT KÜLDÉST: a cím a mezőben marad, és a mondat a hálózati hibáról szól.
    await expect(c.page.getByTestId('resend-result')).toContainText('Nem sikerült kapcsolatba lépni');
    await expect(c.page.getByTestId('resend-email')).toHaveValue(email);
    expect(await c.page.getByTestId('resend-form').count()).toBe(1);

    // POZITÍV ELLENPÁR: a hálózat helyreállítása után UGYANAZ a gomb a semleges levél-oldalra visz.
    await c.page.unroute('**/api/verification/resend');
    const r = await withResponse(c.page, { path: '/api/verification/resend' },
      () => c.page.getByTestId('resend-submit').click());
    expect(r.status).toBe(200);
    await expect(c.page.getByTestId('resend-result')).toContainText('megerősítésre váró fiók');
  } finally { await w.close(); }
});
