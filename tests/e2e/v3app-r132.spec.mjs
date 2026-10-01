// tests/e2e/v3app-r132.spec.mjs — AZ R132 BÖNGÉSZŐS TANÚJA (A132-09).
//
// AMIT EZ MÉR, ÉS A `findings_r132.mjs` NEM: a VALÓDI DOM-ot. A battéria a szabályt és a bekötését
// méri a HTTP-héjon; ez a lap azt, hogy a kezelő TÉNYLEGESEN meg tudja nyomni a gombot, és hogy a
// képernyő a művelet UTÁN az ÚJ igazságot mutatja (D-VS-497/4. kérdés · KUKA-207: a két tanú együtt).
//
//   R132-B1  1. TÖRTÉNET: függő meghívó → VISSZAVONÁS → a régi hivatkozás zárt → új meghívó →
//            szabályos elfogadás
//   R132-B2  2. TÖRTÉNET: munkatárs jogokkal → a tagság megszüntetése → a régi token zárt →
//            kifejezett ÚJRAHÍVÁS → saját elfogadás → tagság VAN, adatjog NINCS → külön
//            készletjog-megadás → csak a mennyiségi nézet
//   R132-B3  EN/DE: az új felületi út (állapotok · visszavonás · újrahívás) a saját nyelvén
//   R132-B4  KESKENY nézet: a meghívó-lista és az újrahívás szakasza használható
//   R132-B5  A „mégse" NEM ÍR: a megerősítés elvetése után a meghívás FÜGGŐ marad
import { test, expect } from '@playwright/test';
import {
  World, Db, PASSWORD, inviteUI, openInviteUI, redeemUI, createWorkspaceUI, setPlanUI,
  grantScopeUI, revokeUI, stockUI, priceUI, gotoPage, openMemberPanel, openProfile,
  withResponse,
} from './helpers.mjs';
import { dictFor } from '../../v3app/public/i18n/dict.mjs';

test.describe.configure({ mode: 'serial' });
const HU = dictFor('hu');

/**
 * A NYITOTT OLDALSÓ PANEL BEZÁRÁSA a VALÓDI vezérlővel. A panel `<dialog>`: ZÁRT állapotban a
 * bezáró gombja a DOM-ban MARAD, csak nem látszik — egy feltétel nélküli kattintás időtúllépésbe
 * fut. Ezért előbb az ÁLLAPOTÁT kérdezzük meg (a rajzolás és a művelet két külön tény — KUKA-209).
 */
async function closeAnyPanel(page) {
  const panel = page.getByTestId('panel');
  if (!(await panel.count())) return;
  if (!(await panel.evaluate((el) => el.open))) return;
  await page.locator('[data-action="panel-close"]').last().click();
  await expect(panel).not.toHaveJSProperty('open', true);
}

/**
 * NYELVVÁLTÁS A FELHASZNÁLÓ ÚTJÁN: profilmenü → Saját profil → nyelv. A nyitott panelt ELŐBB
 * becsukjuk, különben a próba egy TAKART nyitóra kattintana (ugyanaz a lecke, mint a `gotoPage`-ben).
 */
async function switchLang(page, code) {
  await closeAnyPanel(page);
  await openProfile(page);
  await page.getByTestId('profile-menu-profile').click();
  await page.getByTestId('lang-select').selectOption(code);
  await expect(page.locator('html')).toHaveAttribute('lang', code);
}

/** A MEGHÍVÓ-FÜL megnyitása — a lista a négy állapotot KÜLÖN mutatja (R132 §6). */
async function openInvitesTab(page) {
  await gotoPage(page, 'members');
  await page.getByTestId('members-tab-invites').click();
  await expect(page.getByTestId('invites-list')).toBeVisible();
}

/** Egy meghívó-sor jelölője az e-mail alapján — a TOKEN a felületen SOHA nem látszik (KUKA-006). */
async function inviteRowRef(page, email) {
  const row = page.locator('tr[data-testid^="invite-row-"]').filter({ hasText: email }).first();
  await expect(row).toBeVisible();
  const id = await row.getAttribute('data-testid');
  return id.replace('invite-row-', '');
}

/** A VISSZAVONÁS a felületről, a MEGERŐSÍTÉSSEL együtt (R132 §2). */
async function revokeInviteUI(page, email) {
  await openInvitesTab(page);
  const ref = await inviteRowRef(page, email);
  await page.getByTestId(`invite-revoke-${ref}`).click();
  await expect(page.getByTestId('invite-revoke-confirm')).toBeVisible();
  const r = await withResponse(page, { path: '/api/invites/revoke' }, () => page.getByTestId('invite-revoke-confirm').click());
  await expect(page.getByTestId('members-result')).not.toHaveText('');
  return { ...r, ref, resultText: await page.getByTestId('members-result').textContent() };
}

/** Az ÚJBÓLI MEGHÍVÁS a felületről — a megerősítés KIMONDJA a két fontos tényt (R132 §6). */
async function reinviteUI(page, subjectId, { role = 'user', scope = 'keszlet' } = {}) {
  await openMemberPanel(page, subjectId);
  const gomb = page.getByTestId(`member-reinvite-${subjectId}`);
  await expect(gomb).toBeVisible();
  await gomb.click();
  await expect(page.getByTestId('reinvite-form')).toBeVisible();
  const lead = (await page.getByTestId('panel-body').textContent()) || '';
  await page.getByTestId('reinvite-role').selectOption(role);
  await page.getByTestId('reinvite-scope').selectOption(scope);
  const r = await withResponse(page, { path: '/api/members/reinvite' }, () => page.getByTestId('reinvite-confirm').click());
  await expect(page.getByTestId('members-result')).not.toHaveText('');
  return { ...r, lead, resultText: await page.getByTestId('members-result').textContent() };
}

/** A LEGFRISSEBB meghívó-hivatkozás a próbaüzenetekből — ez a címzett VALÓDI útja. */
async function latestInviteLink(page, email) {
  await gotoPage(page, 'members');
  await openProfile(page);
  await page.getByTestId('demo-mail-open').click();
  await expect(page.getByTestId('mailbox')).toBeVisible();
  const li = page.locator('li[data-testid^="mail-"]').filter({ hasText: email }).filter({ hasText: 'Meghívás' }).first();
  await expect(li).toBeVisible();
  const link = await li.locator('a[data-testid^="mail-link-"]').getAttribute('href');
  await page.locator('[data-action="panel-close"]').last().click();
  return link;
}

test.describe('R132 — meghívó visszavonása és újbóli belépés', () => {
  let world; let db;
  test.beforeAll(async ({ browser }) => { world = new World(browser, 'r132'); db = new Db(); });
  test.afterAll(async () => { await world.close(); db.close(); });

  test('R132-B1 — függő meghívó → visszavonás → a régi hivatkozás zárt → új meghívó → elfogadás', async () => {
    const anna = await world.person('b1anna');
    const book = await createWorkspaceUI(anna.page, { name: 'R132 B1 Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '62345676-2-42' } });
    const bela = await world.person('b1bela');

    // (1) A KEZELŐ meghív — a sor FÜGGŐ állapotban látszik, és a token NEM kerül a lapra.
    const inv = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    expect(inv.body.ok).toBe(true);
    await openInvitesTab(anna.page);
    const row = anna.page.locator('tr[data-testid^="invite-row-"]').filter({ hasText: bela.email }).first();
    await expect(row.getByTestId('invite-state-pending')).toBeVisible();
    expect(await anna.page.getByTestId('invites-table').textContent()).not.toContain(inv.body.token);

    // (2) A VISSZAVONÁS — és a KÉPERNYŐ az ÚJ igazságot mutatja.
    const rev = await revokeInviteUI(anna.page, bela.email);
    expect(rev.body.ok).toBe(true);
    expect(rev.body.changed).toBe(true);
    await expect(row.getByTestId('invite-state-revoked')).toBeVisible();
    await expect(anna.page.getByTestId(`invite-revoke-${rev.ref}`)).toHaveCount(0);

    // (3) A RÉGI HIVATKOZÁS ZÁRT — a címzett SAJÁT böngészőjében, a megfigyelésen és a beváltáson is.
    const obs = await openInviteUI(bela.page, inv.link);
    expect(obs.observe.status).toBe('not_actionable');
    expect(obs.observe.reason).toBe('invite_revoked');
    expect(obs.redeemVisible).toBe(false);
    // A LAP EMBERI MONDATOT MUTAT, nem gépi kódot (R81 §6 · KUKA-210).
    expect(obs.humanText.trim().length).toBeGreaterThan(0);
    expect(obs.humanText).not.toContain('invite_revoked');
    expect(db.count('SELECT COUNT(*) FROM membership WHERE subject_id = ? AND book_id = ?', bela.subjectId, book.bookId)).toBe(0);

    // (4) ÚJ MEGHÍVÓ → SZABÁLYOS ELFOGADÁS.
    const inv2 = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(bela.page, inv2.link);
    const red = await redeemUI(bela.page);
    expect(red.body.ok).toBe(true);
    await openInvitesTab(anna.page);
    const row2 = anna.page.locator('tr[data-testid^="invite-row-"]').filter({ hasText: bela.email });
    await expect(row2.getByTestId('invite-state-accepted').first()).toBeVisible();
    await expect(row2.getByTestId('invite-state-revoked').first()).toBeVisible();
  });

  test('R132-B2 — a megszüntetés után csak KIFEJEZETT újrahívás nyit utat, és a régi jog NEM tér vissza', async () => {
    const anna = await world.person('b2anna');
    const book = await createWorkspaceUI(anna.page, { name: 'R132 B2 Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '10779298-2-44' } });
    const bela = await world.person('b2bela');

    // (1) MUNKATÁRS JOGOKKAL: belép, és KÉT adatkört kap.
    const inv = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(bela.page, inv.link);
    await redeemUI(bela.page);
    await grantScopeUI(anna.page, bela.subjectId, 'keszlet');
    await grantScopeUI(anna.page, bela.subjectId, 'arak');
    expect((await stockUI(bela.page)).body.ok).toBe(true);
    expect((await priceUI(bela.page)).body.ok).toBe(true);

    // (2) A TAGSÁG MEGSZÜNTETÉSE — a sor ELTÁVOLÍTVA jelzéssel MEGMARAD (visszakereshető).
    const kiv = await revokeUI(anna.page, bela.subjectId);
    expect(kiv.body.ok).toBe(true);
    await gotoPage(anna.page, 'members');
    await expect(anna.page.getByTestId(`member-removed-${bela.subjectId}`)).toBeVisible();

    // (3) A RÉGI TOKEN ZÁRT: a rendes meghívó NEM reaktivál.
    const inv2 = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(bela.page, inv2.link);
    const nem = await redeemUI(bela.page);
    expect(nem.body.ok).toBe(false);
    expect(nem.body.outcome).toBe('revoked_needs_decision');
    expect(nem.resultText).not.toContain('revoked_needs_decision');

    // (4) KIFEJEZETT ÚJRAHÍVÁS — a megerősítés KIMONDJA a két fontos tényt (spec §6).
    const ri = await reinviteUI(anna.page, bela.subjectId, { role: 'user', scope: 'keszlet' });
    expect(ri.body.ok).toBe(true);
    expect(ri.body.requires_acceptance).toBe(true);
    expect(ri.body.restores_previous_scopes).toBe(false);
    expect(ri.lead).toContain(HU.TPL.reinviteConfirmLead.split('{ki}')[1].split('{')[0].trim().slice(0, 24));

    // (5) A CÍMZETT SAJÁT ELFOGADÁSA → TAGSÁG VAN.
    const link = await latestInviteLink(anna.page, bela.email);
    await openInviteUI(bela.page, link);
    const acc = await redeemUI(bela.page);
    expect(acc.body.ok).toBe(true);
    expect(acc.body.outcome).toBe('regranted');

    // (6) DE ADATJOG NINCS — se mennyiség, se ár (a RÉGI jogok NEM éledtek fel).
    expect((await stockUI(bela.page)).body.ok).toBe(false);
    expect((await priceUI(bela.page)).body.ok).toBe(false);

    // (7) A KEZELŐ KÉPERNYŐJE AZ ÚJ IGAZSÁGOT MUTATJA — FRISSÍTÉS UTÁN, és ezt KIMONDJUK.
    //     A címzett egy MÁSIK böngészőben fogadta el; az R131 döntése NÉV SZERINT rögzítette, hogy a
    //     másik lapon történt változást a nyitott nézet NEM észleli azonnal (nincs cross-tab
    //     értesítés — ismert működési korlát, nem biztonsági minősítés). A kezelő tehát azt teszi,
    //     amit egy ember is: újranyitja a listát. A próba ezt MÉRI, nem kerüli meg: a frissítés UTÁN
    //     a sor AKTÍV, és a hozzáférés-megadás gombja MEGJELENIK (D-VS-497/4. kérdés).
    await anna.page.reload();
    await expect(anna.page.getByTestId('header-subject')).toContainText('@');
    await gotoPage(anna.page, 'members');
    await expect(anna.page.getByTestId(`member-removed-${bela.subjectId}`)).toHaveCount(0);

    // ÉS CSAK EZUTÁN a KÜLÖN készletjog-megadás → CSAK a mennyiségi nézet nyílik meg.
    await grantScopeUI(anna.page, bela.subjectId, 'keszlet');
    expect((await stockUI(bela.page)).body.ok).toBe(true);
    expect((await priceUI(bela.page)).body.ok).toBe(false);

    // ÉS A TÖRTÉNET: KÉT tagságadó esemény, EGY megvonás — a múltat nem írtuk át.
    expect(db.count('SELECT COUNT(*) FROM membership_grant WHERE subject_id = ? AND book_id = ?', bela.subjectId, book.bookId)).toBe(2);
    expect(db.count('SELECT COUNT(*) FROM membership_revocation WHERE subject_id = ? AND book_id = ?', bela.subjectId, book.bookId)).toBe(1);
  });

  test('R132-B3 — az új felületi út a saját nyelvén (en · de)', async () => {
    // AMIT EZ MÉR: a FELÜLETI feliratok (állapotok · szakasz · művelet · megerősítő mondat) a saját
    // nyelvükön jelennek meg a VALÓDI DOM-ban. AMIT NEM ITT MÉRÜNK, KIMONDVA: a súgó és a GYIK
    // nyelvi lefedettségét a `verify:i18n` (kulcs-szintű, mindhárom nyelvre) és a `verify:tutor`
    // (képesség ↔ leírás ↔ GYIK kötés) méri, a nyugták/indokok nyelvi meglétét pedig a
    // `findings_r132.mjs` H szakasza — azt itt nem ismételjük meg (KUKA-216: a verdikt ne mutasson
    // a mérés hatókörén túl).
    const anna = await world.person('b3anna');
    await createWorkspaceUI(anna.page, { name: 'R132 B3 Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '12892312-2-41' } });
    const bela = await world.person('b3bela');
    const inv = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(bela.page, inv.link);
    await redeemUI(bela.page);
    await revokeUI(anna.page, bela.subjectId);

    for (const lang of ['en', 'de']) {
      const D = dictFor(lang);
      await switchLang(anna.page, lang);

      // (1) A MEGHÍVÓ-FÜL ÁLLAPOT-SZÖVEGE a saját nyelvén (az elfogadott meghívó sora).
      await openInvitesTab(anna.page);
      await expect(anna.page.getByTestId('invites-table')).toContainText(D.UI.inviteAccepted);

      // (2) AZ ÚJRAHÍVÁS szakasza, műveletének felirata és MEGERŐSÍTŐ mondata a saját nyelvén.
      await closeAnyPanel(anna.page);
      await gotoPage(anna.page, 'members');
      await openMemberPanel(anna.page, bela.subjectId);
      const body = anna.page.getByTestId('panel-body');
      await expect(body).toContainText(D.UI.reentrySection);
      await expect(body).toContainText(D.UI.reinviteAction);
      // A MONDAT ELSŐ ÉRDEMI SZAKASZA — a helyőrző UTÁNI rész, hogy a mérés ne a nevet mérje.
      const mondatReszlet = D.TPL.reinviteConfirmLead.split('{ki}')[1].split('.')[0].trim();
      await expect(body).toContainText(mondatReszlet);
      await closeAnyPanel(anna.page);

      // (3) ÉS A VISSZAVONÁS MŰVELETÉNEK felirata is a saját nyelvén (a FÜGGŐ meghívó sorában).
      //
      // A FÜGGŐ MEGHÍVÓT ITT A HATÁRON ÁT ADJUK KI (`api.post`), nem a felületi segéddel. MIÉRT:
      // az `inviteUI` a kiadás után a PRÓBAÜZENETEK közül keresi ki a levelet, a tárgya szerint —
      // az pedig a felhasználó nyelvén áll („Meghívás" · „Invitation" · „Einladung"). Magyar
      // szövegre illesztve a segéd EN/DE nyelven nem találja meg, és a próba a SAJÁT fixtúrájának
      // nyelv-függésén bukna el, nem a mért tulajdonságon (KUKA-237: a mérés a VISELKEDÉST mérje;
      // KUKA-120). A MÉRT dolog itt a sor FELIRATA, nem a kiadás útja — azt a B1 méri végig.
      const fuggo = await anna.api.post('/api/invites', { email: world.email(`b3${lang}`), role: 'user', scope: 'keszlet' });
      expect(fuggo.body.ok).toBe(true);
      await closeAnyPanel(anna.page);
      await openInvitesTab(anna.page);
      await anna.page.getByTestId('members-tab-members').click();
      await anna.page.getByTestId('members-tab-invites').click();
      const ref = await inviteRowRef(anna.page, world.email(`b3${lang}`));
      await expect(anna.page.getByTestId(`invite-revoke-${ref}`)).toContainText(D.UI.inviteRevokeAction);
    }
    await switchLang(anna.page, 'hu');
  });

  test('R132-B4 — keskeny nézetben is használható', async () => {
    const anna = await world.person('b4anna');
    await createWorkspaceUI(anna.page, { name: 'R132 B4 Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '13181119-2-42' } });
    const bela = await world.person('b4bela');
    const inv = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(bela.page, inv.link);
    await redeemUI(bela.page);
    await revokeUI(anna.page, bela.subjectId);

    await closeAnyPanel(anna.page);
    // A NYITOTT LENYÍLÓKAT BECSUKJUK: a mérés a FELHASZNÁLÓK képernyőjéről szól, nem egy nyitva
    // hagyott fejléc-menüről (ugyanaz a lecke, mint az R121-B4-ben).
    await anna.page.evaluate(() => { for (const d of document.querySelectorAll('details[open]')) d.open = false; });
    await anna.page.setViewportSize({ width: 390, height: 844 });
    // KESKENY NÉZETBEN A BAL MENÜ ÖSSZECSUKÓDIK: a felhasználó a menü-nyitóval jut a laphoz, és a
    // próba is ezt az utat járja — nem egy takart gombra kattint.
    await expect(anna.page.getByTestId('nav-toggle')).toBeVisible();
    await anna.page.getByTestId('nav-toggle').click();
    // A MEGHÍVÓ-LISTA elérhető és olvasható.
    await openInvitesTab(anna.page);
    await expect(anna.page.getByTestId('invites-table')).toBeVisible();
    // NINCS VÍZSZINTES CSÚSZÁS a meghívó-listán (a táblázat nélküli értéket is kiírjuk, hogy egy
    // jövőbeli piros megmondja, hol keresse — KUKA-216).
    const tul = await anna.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const tulTablaNelkul = await anna.page.evaluate(() => {
      const t = document.querySelector('.tablebox');
      if (!t) return null;
      const elozo = t.style.display; t.style.display = 'none';
      const x = document.documentElement.scrollWidth - window.innerWidth;
      t.style.display = elozo;
      return x;
    });
    expect(tul, `túlcsúszás a meghívó-listán (táblázat nélkül: ${tulTablaNelkul})`).toBeLessThanOrEqual(1);
    // ÉS AZ ÚJRAHÍVÁS gombja TÉNYLEGESEN megnyomható keskeny nézetben.
    await anna.page.getByTestId('members-tab-members').click();
    await openMemberPanel(anna.page, bela.subjectId);
    const gomb = anna.page.getByTestId(`member-reinvite-${bela.subjectId}`);
    await expect(gomb).toBeVisible();
    await gomb.click();
    await expect(anna.page.getByTestId('reinvite-form')).toBeVisible();
    await expect(anna.page.getByTestId('reinvite-confirm')).toBeVisible();
    await closeAnyPanel(anna.page);
    await anna.page.setViewportSize({ width: 1280, height: 800 });
  });

  test('R132-B5 — a „mégse" NEM ÍR: a meghívás függő marad', async () => {
    const anna = await world.person('b5anna');
    await createWorkspaceUI(anna.page, { name: 'R132 B5 Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '10208448-2-42' } });
    const bela = await world.person('b5bela');
    await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });

    const elotte = db.count('SELECT COUNT(*) FROM invite_revocation');
    await openInvitesTab(anna.page);
    const ref = await inviteRowRef(anna.page, bela.email);
    await anna.page.getByTestId(`invite-revoke-${ref}`).click();
    await expect(anna.page.getByTestId('invite-revoke-confirm')).toBeVisible();
    // A VISSZALÉPÉS — és UTÁNA semmi nem változott (sem a tárolóban, sem a képernyőn).
    await anna.page.getByTestId('invite-revoke-cancel').click();
    expect(db.count('SELECT COUNT(*) FROM invite_revocation')).toBe(elotte);
    await openInvitesTab(anna.page);
    const row = anna.page.locator('tr[data-testid^="invite-row-"]').filter({ hasText: bela.email }).first();
    await expect(row.getByTestId('invite-state-pending')).toBeVisible();
    await expect(anna.page.getByTestId(`invite-revoke-${ref}`)).toBeVisible();
  });
});
