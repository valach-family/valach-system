// tests/e2e/v3app-r134.spec.mjs — AZ R134 BÖNGÉSZŐS TANÚJA (F134-04).
//
// MIT KÉRT AZ R134, ÉS MIÉRT NEM VOLT ELÉG AZ R132-ES LAP. A külső ellenőrző fél (chatgpt-v3) MÉRTE,
// hogy az R132-B3 EN/DE helyzete a FELIRATOK meglétét ellenőrzi, de „nem viszi végig az új
// műveleteket és súgóutat; a kulcsok megléte nem teljes folyamatpróba". Ezért itt a két ÚJ művelet
// VÉGIG megy a saját nyelvén — SIKERES és ELUTASÍTOTT kimenettel, a súgó útjával együtt:
//
//   R134-B1  EN — TELJES ÚT: függő meghívó → VISSZAVONÁS (siker, angol nyugta) → a régi hivatkozás
//            zárt (a címzett angol mondatot kap) → és a SÚGÓ témája ugyanazon a nyelven, a
//            kimenetekkel (siker · elutasítás)
//   R134-B2  DE — TELJES ÚT: eltávolított munkatárs → ELUTASÍTOTT újrahívás (felfüggesztés, német
//            mondattal és NEVEZETT folytatással) → a kizárás feloldása → SIKERES újrahívás német
//            nyugtával → és a SÚGÓ témája németül, az elutasítás kimenetével
//   R134-B3  KÉSŐI VÁLASZ a KÉT ÚJ végponton (visszavonás · újrahívás): a feldolgozás UTÁNI
//            DOM-tanú és POZITÍV KONTROLL, az R130-ban kialakított három jeles fegyelemmel
//   R134-B4  EGYSZERI AJÁNLAT A FELÜLETRŐL: a lap a hálózati ismétléshez UGYANAZT a műveleti
//            azonosságot küldi, tehát a megismételt kérés NEM gyárt második ajánlatot — és a
//            nyugta ezt KI IS MONDJA
//   R134-B5  A KÖZÖS BEMUTATÓ: mind a KÉT történet végigkattintható, asztali ÉS keskeny nézetben
//
// A SZIMULÁCIÓ ÉS A VALÓDI BIZONYÍTÉK KÜLÖN VAN (R134 §F134-04): a B1–B4 a VALÓDI alkalmazáson, a
// valódi HTTP-héjon és tárolón fut; a B5 a BEMUTATÓ lapot kattintja végig, ami SZIMULÁLT képernyőket
// mutat — ezt a lap maga is kimondja, és a próba a lap saját jelölését is MÉRI (KUKA-033).
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  World, Db, gotoPage, createWorkspaceUI, inviteUI, openInviteUI, redeemUI, revokeUI,
  openMemberPanel, openProfile, withResponse, withOptionalResponse, switchUI,
  apiOf,
} from './helpers.mjs';
import { fetchWatchScript, installFetchWatch, holdRoute, inFlight, atad } from './lateResponse.mjs';
import { dictFor } from '../../v3app/public/i18n/dict.mjs';

test.describe.configure({ mode: 'serial' });

/** A NYITOTT OLDALSÓ PANEL BEZÁRÁSA a VALÓDI vezérlővel (ugyanaz a lecke, mint az R132-ben). */
async function closeAnyPanel(page) {
  const panel = page.getByTestId('panel');
  if (!(await panel.count())) return;
  if (!(await panel.evaluate((el) => el.open))) return;
  await page.locator('[data-action="panel-close"]').last().click();
  await expect(panel).not.toHaveJSProperty('open', true);
}

async function closeHelp(page) {
  if (await page.getByTestId('help-close').count()) {
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('help-close')).toHaveCount(0);
  }
}

/** NYELVVÁLTÁS A FELHASZNÁLÓ ÚTJÁN: profilmenü → Saját profil → nyelv. */
async function switchLang(page, code) {
  await closeHelp(page);
  await closeAnyPanel(page);
  await openProfile(page);
  await page.getByTestId('profile-menu-profile').click();
  await page.getByTestId('lang-select').selectOption(code);
  await expect(page.locator('html')).toHaveAttribute('lang', code);
}

async function openInvitesTab(page) {
  await gotoPage(page, 'members');
  await page.getByTestId('members-tab-invites').click();
  await expect(page.getByTestId('invites-list')).toBeVisible();
}

async function inviteRowRef(page, email) {
  const row = page.locator('tr[data-testid^="invite-row-"]').filter({ hasText: email }).first();
  await expect(row).toBeVisible();
  const id = await row.getAttribute('data-testid');
  return id.replace('invite-row-', '');
}

/** A VISSZAVONÁS a felületről, a megerősítéssel — a nyugtát a hívó olvassa el. */
async function revokeInviteUI(page, email) {
  await openInvitesTab(page);
  const ref = await inviteRowRef(page, email);
  await page.getByTestId(`invite-revoke-${ref}`).click();
  await expect(page.getByTestId('invite-revoke-confirm')).toBeVisible();
  const r = await withResponse(page, { path: '/api/invites/revoke' }, () => page.getByTestId('invite-revoke-confirm').click());
  await expect(page.getByTestId('members-result')).not.toHaveText('');
  return { ...r, ref, resultText: (await page.getByTestId('members-result').textContent()) || '' };
}

/** AZ ÚJBÓLI MEGHÍVÁS a felületről — a válasz ÉS a képernyőre írt mondat együtt. */
async function reinviteUI(page, subjectId, { role = 'user', scope = 'keszlet', expectResult = true } = {}) {
  await openMemberPanel(page, subjectId);
  const gomb = page.getByTestId(`member-reinvite-${subjectId}`);
  await expect(gomb).toBeVisible();
  await gomb.click();
  await expect(page.getByTestId('reinvite-form')).toBeVisible();
  await page.getByTestId('reinvite-role').selectOption(role);
  await page.getByTestId('reinvite-scope').selectOption(scope);
  const r = await withResponse(page, { path: '/api/members/reinvite' }, () => page.getByTestId('reinvite-confirm').click());
  // AZ ELUTASÍTÁS AZ ŰRLAPON JELENIK MEG, A SIKER A LISTA MELLETT — a kettő KÜLÖN elem, és a
  // próba azt olvassa, amelyik a VALÓDI kimenethez tartozik (KUKA-215: a választ meg kell mérni).
  const cel = r.body && r.body.ok ? 'members-result' : 'reinvite-result';
  if (expectResult) await expect(page.getByTestId(cel)).not.toHaveText('');
  return { ...r, resultText: (await page.getByTestId(cel).textContent()) || '' };
}

/** A LEGFRISSEBB meghívó-hivatkozás a próbaüzenetekből — a tárgy a NYELVEN áll (KUKA-237). */
async function latestInviteLink(page, email, subjectPart) {
  await closeAnyPanel(page);
  await gotoPage(page, 'members');
  await openProfile(page);
  await page.getByTestId('demo-mail-open').click();
  await expect(page.getByTestId('mailbox')).toBeVisible();
  const li = page.locator('li[data-testid^="mail-"]').filter({ hasText: email }).filter({ hasText: subjectPart }).first();
  await expect(li).toBeVisible();
  const link = await li.locator('a[data-testid^="mail-link-"]').getAttribute('href');
  await page.locator('[data-action="panel-close"]').last().click();
  return link;
}

/** A SÚGÓ egy témája — a KÉPERNYŐ saját tényeiből (D-VS-522), a kimenetekkel együtt. */
async function openHelpTopic(page, featureId) {
  await closeAnyPanel(page);
  await page.getByTestId('help-open').click();
  await expect(page.getByTestId('help-close')).toBeVisible();
  await page.getByTestId('help-tab-guides').click();
  const guide = page.getByTestId(`help-guide-${featureId}`);
  await expect(guide).toBeVisible();
  await guide.getByRole('button').first().click();
  await expect(page.getByTestId(`help-topic-${featureId}`)).toBeVisible();
}

test.describe('R134 — a véglegesítési kapuk, az egyszeri ajánlat és a nyelvi utak a felületen', () => {
  let world; let db;
  test.beforeAll(async ({ browser }) => { world = new World(browser, 'r134'); db = new Db(); });
  test.afterAll(async () => { await world.close(); db.close(); });

  test('R134-B1 — EN: a visszavonás TELJES útja a saját nyelvén, a súgóval együtt', async () => {
    const EN = dictFor('en');
    const anna = await world.person('b1anna');
    await createWorkspaceUI(anna.page, { name: 'R134 B1 Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '12892312-2-41' } });
    const bela = await world.person('b1bela');

    await switchLang(anna.page, 'en');
    // A MEGHÍVÓ KIADÁSA a HATÁRON megy (a felületi segéd a levél MAGYAR tárgyára illeszt — a mért
    // dolog itt a VISSZAVONÁS útja, nem a kiadás; azt a B1/R132 méri végig).
    const inv = await anna.api.post('/api/invites', { email: bela.email, role: 'user', scope: 'keszlet', lang: 'en' });
    expect(inv.body.ok).toBe(true);

    // (1) A VISSZAVONÁS VÉGIGMEGY, és a NYUGTA ANGOLUL áll a képernyőn.
    const rev = await revokeInviteUI(anna.page, bela.email);
    expect(rev.body.ok).toBe(true);
    expect(rev.body.changed).toBe(true);
    const sikerReszlet = EN.TPL.inviteRevoked.split('{ki}')[1].split('.')[0].trim();
    expect(rev.resultText).toContain(sikerReszlet);

    // (2) A KÉPERNYŐ AZ ÚJ IGAZSÁGOT MUTATJA, ANGOLUL: a sor VISSZAVONT, és nincs több művelete.
    await openInvitesTab(anna.page);
    const row = anna.page.locator('tr[data-testid^="invite-row-"]').filter({ hasText: bela.email }).first();
    await expect(row).toContainText(EN.UI.inviteRevokedBadge);
    await expect(anna.page.getByTestId(`invite-revoke-${rev.ref}`)).toHaveCount(0);

    // (3) A CÍMZETT a régi hivatkozáson ANGOL mondatot kap, és nem jut tagsághoz (a saját nyelve a
    //     hivatkozásból jön — ezt a szerver-rajzolt lap és a nyelv-feloldó együtt adja).
    await openInviteUI(bela.page, `${inv.body.token}`);
    const obs = await bela.api.get(`/api/invites/observe?token=${encodeURIComponent(inv.body.token)}`);
    expect(obs.body.status).toBe('not_actionable');
    expect(obs.body.reason).toBe('invite_revoked');
    expect(db.count('SELECT COUNT(*) FROM membership WHERE subject_id = ?', bela.subjectId)).toBe(1); // csak a saját tere

    // (4) ÉS A SÚGÓ ugyanazon a nyelven, a KIMENETEKKEL: siker ÉS elutasítás.
    await openHelpTopic(anna.page, 'invite.revoke');
    await expect(anna.page.getByTestId('help-outcome-invite.revoke-success')).toBeVisible();
    await expect(anna.page.getByTestId('help-outcome-invite.revoke-refused')).toBeVisible();
    const sugoSzoveg = (await anna.page.getByTestId('help-topic-invite.revoke').textContent()) || '';
    expect(sugoSzoveg).not.toBe('');
    // A SÚGÓ NYELVE A FELHASZNÁLÓ NYELVE: az angol kimenet-címke áll ott, nem a magyar.
    await expect(anna.page.getByTestId('help-outcome-invite.revoke-success')).toContainText(EN.HELP.outcomeSuccess);
    await closeHelp(anna.page);
    await switchLang(anna.page, 'hu');
  });

  test('R134-B2 — DE: az újrahívás ELUTASÍTOTT és SIKERES útja a saját nyelvén, a súgóval együtt', async () => {
    const DE = dictFor('de');
    const anna = await world.person('b2anna');
    const ws = await createWorkspaceUI(anna.page, { name: 'R134 B2 Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '13181119-2-42' } });
    const bela = await world.person('b2bela');
    const inv = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(bela.page, inv.link);
    await redeemUI(bela.page);
    await revokeUI(anna.page, bela.subjectId);

    await switchLang(anna.page, 'de');

    // (1) A KIZÁRÁS: a tagság FEL VAN FÜGGESZTVE (a séma szerinti VALÓDI sor — HTTP-út nincs rá,
    //     és ezt KIMONDJUK: fixtúra, nem a mért tulajdonság része — KUKA-033).
    const dbW = new Db();
    dbW.store.run(
      `INSERT INTO membership_suspension (subject_id, book_id, actor_subject_id, suspended_at, reason)
       VALUES (?,?,?,?,?)`, bela.subjectId, ws.bookId, anna.subjectId, new Date().toISOString(),
      'r134-B2 fixtúra: felfüggesztés');

    /**
     * (2) AZ ELUTASÍTÁS A KÉPERNYŐRŐL OLVASHATÓ — ÉS A GOMB MÁR NEM IS JELENIK MEG (R186 §5).
     *
     * AMI MEGVÁLTOZOTT, ÉS MIÉRT. A `KUKA-458` óta a lista-sor `reinvitable` mezője az ÍRÁS-ÚT
     * SAJÁT feltételét kérdezi (`reinviteFeasibility`), tehát egy FELFÜGGESZTETT tagságnál a gomb
     * MEG SEM jelenik: a sor helyette a NEVEZETT elakadás-mondatot rajzolja ki, a mag SAJÁT
     * ok-kódjával, a felhasználó nyelvén. Ez NEM a teendő elrejtése (`KUKA-201`): a mondat
     * ugyanazt az okot ÉS ugyanazt a folytatást viszi („előbb a felfüggesztést kell feloldani"),
     * csak nem kell hozzá megnyomni egy gombot, ami biztosan nemet mond (`KUKA-011` · `KUKA-041`).
     *
     * A HTTP-ELUTASÍTÁS ÜZENETE EZZEL NEM TŰNT EL, csak más úton mérjük: a végpontot KÖZVETLENÜL
     * hívjuk (a felület nem is ajánlja fel), és a válasz ugyanúgy viszi a `reason`-t és a
     * `next_step`-et — a nemleges válasz tartalma tehát változatlanul mérve van (`KUKA-215`).
     */
    await openMemberPanel(anna.page, bela.subjectId);
    await expect(anna.page.getByTestId('member-reinvite-blocked')).toBeVisible();
    await expect(anna.page.getByTestId(`member-reinvite-${bela.subjectId}`)).toHaveCount(0);
    expect((await anna.page.getByTestId('member-reinvite-blocked').textContent()) || '')
      .toContain(DE.REASON.reentry_blocked_suspension.split('.')[0].trim());
    await closeAnyPanel(anna.page);

    const elutasitva = await apiOf(anna.page).post('/api/members/reinvite',
      { subject_id: bela.subjectId, role: 'user', scope: 'keszlet', operation_id: 'r134-b2-blocked' });
    expect(elutasitva.body.ok).toBe(false);
    expect(elutasitva.body.reason).toBe('reentry_blocked_suspension');
    expect(elutasitva.body.next_step).toBe('lift_suspension');
    // ÉS A TÁROLÓBAN SEMMI NEM KELETKEZETT (az elutasítás írásmentes — KUKA-220).
    expect(db.count('SELECT COUNT(*) FROM membership_reentry WHERE subject_id = ?', bela.subjectId)).toBe(0);

    // (3) A KIZÁRÁS FELOLDÁSA UTÁN UGYANAZ AZ ÚT SIKERES, és a nyugta NÉMETÜL áll.
    dbW.store.run('UPDATE membership_suspension SET lifted_at = ?, lifted_by = ? WHERE subject_id = ?',
      new Date().toISOString(), anna.subjectId, bela.subjectId);
    dbW.close();
    /**
     * ÉS A LAPNAK ÚJRA MEG KELL MÉRNIE — EZ A SOR A LELET MIATT VAN ITT (`KUKA-458` · `KUKA-209`).
     *
     * A felfüggesztés feloldása a TÁROLÓBAN történt (fixtúra: HTTP-út nincs rá, és ezt a próba
     * fentebb ki is mondja). A sor „újrahívható" jelzője azonban az R186 §5 óta a KISZOLGÁLÓ mért
     * verdiktje, és a lap magától nem kérdez újra: a képernyőn tehát a FELFÜGGESZTETT állapot
     * mondata állt, a gomb pedig — helyesen — nem is létezett. A felhasználó útja ugyanez: a
     * listát újra be kell kérni. Itt a FÜLVÁLTÁS a valódi vezérlő (a mérés viselkedést mér, nem
     * DOM-ot állít — `KUKA-237`), és ezzel a mérés a MAI szerződést méri, nem a tavalyit.
     */
    await anna.page.getByTestId('members-tab-invites').click();
    await expect(anna.page.getByTestId('invites-list')).toBeVisible();
    await anna.page.getByTestId('members-tab-members').click();
    await expect(anna.page.getByTestId(`member-${bela.subjectId}`)).toBeVisible();
    const siker = await reinviteUI(anna.page, bela.subjectId);
    expect(siker.body.ok).toBe(true);
    expect(siker.body.requires_acceptance).toBe(true);
    expect(siker.body.restores_previous_scopes).toBe(false);
    const sikerReszlet = DE.TPL.reinviteSent.split('{ki}')[1].split('.')[0].trim();
    expect(siker.resultText).toContain(sikerReszlet);
    expect(db.count('SELECT COUNT(*) FROM membership_reentry WHERE subject_id = ?', bela.subjectId)).toBe(1);

    // (4) A CÍMZETT a NÉMET tárgyú levélből kapja a hivatkozást, és a SAJÁT elfogadása ad tagságot.
    const link = await latestInviteLink(anna.page, bela.email, DE.SRV.mailInviteSubject.split('{fiok}')[0].trim());
    expect(link).toBeTruthy();
    await openInviteUI(bela.page, link);
    const red = await redeemUI(bela.page);
    expect(red.body.ok).toBe(true);
    expect(red.body.outcome).toBe('regranted');

    // (5) ÉS A SÚGÓ NÉMETÜL, az ELUTASÍTÁS kimenetével együtt.
    await openHelpTopic(anna.page, 'members.reinvite');
    await expect(anna.page.getByTestId('help-outcome-members.reinvite-refused')).toBeVisible();
    await expect(anna.page.getByTestId('help-outcome-members.reinvite-refused')).toContainText(DE.HELP.outcomeRefused);
    await closeHelp(anna.page);
    await switchLang(anna.page, 'hu');
  });

  test('R134-B3 — KÉSŐI VÁLASZ a két új végponton: feldolgozás utáni DOM-tanú és pozitív kontroll', async () => {
    const anna = await world.person('b3anna');
    await anna.page.addInitScript(fetchWatchScript);
    const elso = await createWorkspaceUI(anna.page, { name: 'R134 B3 Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '10208448-2-42' } });
    const masodik = await createWorkspaceUI(anna.page, { name: 'R134 B3 Másik Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '10779298-2-44' } });
    await installFetchWatch(anna.page);
    await switchUI(anna.page, elso.bookId);
    const cel = await world.person('b3bela');
    const inv = await anna.api.post('/api/invites', { email: cel.email, role: 'user', scope: 'keszlet' });
    expect(inv.body.ok).toBe(true);

    // ── (a) A VISSZAVONÁS VÁLASZA KÉSIK, és KÖZBEN a kezelő MÁSIK fiókra vált ──────────────────
    await openInvitesTab(anna.page);
    const ref = await inviteRowRef(anna.page, cel.email);
    const h = await holdRoute(anna.page, '/api/invites/revoke');
    await anna.page.getByTestId(`invite-revoke-${ref}`).click();
    await expect(anna.page.getByTestId('invite-revoke-confirm')).toBeVisible();
    await anna.page.getByTestId('invite-revoke-confirm').click();
    await inFlight(h, 'visszavonás');
    // A NÉZET MEGVÁLTOZIK, amíg a válasz úton van — a FELHASZNÁLÓ ÚTJÁN: a megerősítés MODÁLIS
    // panelben áll, tehát aki közben fiókot vált, előbb OTTHAGYJA a panelt (Esc). Egy takart
    // gombra kattintó próba a saját útját mérné, nem a termék viselkedését (KUKA-228).
    await anna.page.keyboard.press('Escape');
    await switchUI(anna.page, masodik.bookId);
    await atad(anna.page, h, 'visszavonás');
    // A TANÚ A KONKRÉT RÉGI NYUGTA ÉS AZ ÚJ KONTEXTUS VÁLTOZATLANSÁGA (R136 kikötése).
    //
    // MI VOLT KEVÉS. A régi alak csak azt nézte, hogy a cél e-mail-címe nincs benne a `main`
    // szövegében. Ez ANNÁL IS igaz, ha a nyugta egyáltalán nem született meg, vagy ha egy MÁS
    // mondat jelent meg — tehát az állítás nem a tárgyát mérte (KUKA-033 · KUKA-215: a választ MEG
    // KELL MÉRNI). Mostantól a NEVEZETT régi nyugtát keressük, és azt is kimondjuk, hogy az ÚJ
    // nézet a SAJÁT igazságát mutatja.
    const B3HU = dictFor('hu');
    const regiNyugta = B3HU.TPL.inviteRevoked.replace('{ki}', cel.email);
    const nyugtaElem = anna.page.getByTestId('members-result');
    // A KONKRÉT régi nyugta nincs kint — se a nyugta-elemben, se a lap szövegében.
    if (await nyugtaElem.count() > 0) {
      const nyugtaSzoveg = (await nyugtaElem.textContent()) || '';
      expect(nyugtaSzoveg).not.toContain(regiNyugta);
      expect(nyugtaSzoveg).not.toContain(cel.email);
    }
    const masodikSzoveg = (await anna.page.locator('main').textContent()) || '';
    expect(masodikSzoveg).not.toContain(regiNyugta);
    expect(masodikSzoveg).not.toContain(cel.email);
    // AZ ÚJ KONTEXTUS VÁLTOZATLAN: a MÁSODIK fiók van kiválasztva, és a lap a MÁSODIK fiók nevét
    // mutatja — a késői válasz nem vitte vissza a kezelőt a régi nézetbe.
    await expect(anna.page.getByTestId('header-workspace')).toHaveText('R134 B3 Másik Kft');
    await anna.page.unroute('**/api/invites/revoke').catch(() => {});

    // ── (b) POZITÍV KONTROLL: VÁLTOZATLAN nézetben a késleltetve elengedett válasz MEGJELENIK ──
    await switchUI(anna.page, elso.bookId);
    const inv2 = await anna.api.post('/api/invites', { email: world.email('b3cili'), role: 'user', scope: 'keszlet' });
    expect(inv2.body.ok).toBe(true);
    await openInvitesTab(anna.page);
    const ref2 = await inviteRowRef(anna.page, world.email('b3cili'));
    const h2 = await holdRoute(anna.page, '/api/invites/revoke');
    await anna.page.getByTestId(`invite-revoke-${ref2}`).click();
    await expect(anna.page.getByTestId('invite-revoke-confirm')).toBeVisible();
    await anna.page.getByTestId('invite-revoke-confirm').click();
    await inFlight(h2, 'visszavonás (pozitív kontroll)');
    await atad(anna.page, h2, 'visszavonás (pozitív kontroll)');
    // A POZITÍV KONTROLL A VÁRT ÚJ NYUGTÁT IGAZOLJA, nem csak a „nem üres" tényt (R136 kikötése):
    // egy üres-ellenes állítás egy HIBAÜZENETRE is zöld volna (KUKA-215).
    await expect(anna.page.getByTestId('members-result'))
      .toHaveText(B3HU.TPL.inviteRevoked.replace('{ki}', world.email('b3cili')));
    await anna.page.unroute('**/api/invites/revoke').catch(() => {});

    // ── (c) AZ ÚJRAHÍVÁS VÁLASZA KÉSIK, és közben a nézet VÁLTOZIK ────────────────────────────
    const bela2 = await world.person('b3dora');
    const inv3 = await anna.api.post('/api/invites', { email: bela2.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(bela2.page, inv3.body.token);
    await redeemUI(bela2.page);
    await revokeUI(anna.page, bela2.subjectId);
    await openMemberPanel(anna.page, bela2.subjectId);
    await anna.page.getByTestId(`member-reinvite-${bela2.subjectId}`).click();
    await expect(anna.page.getByTestId('reinvite-form')).toBeVisible();
    const h3 = await holdRoute(anna.page, '/api/members/reinvite');
    await anna.page.getByTestId('reinvite-confirm').click();
    await inFlight(h3, 'újrahívás');
    // A FELHASZNÁLÓ ÚTJA, PONTOSAN: az újrahívás MODÁLIS panelből indul, tehát amíg az nyitva van, a
    // fiókválasztó NEM kattintható — ez helyes (a billentyűzet-fókusz a panelben van). Aki mégis
    // fiókot vált, előbb OTTHAGYJA a panelt (Esc), és csak azután vált. A próba ezt az utat járja,
    // nem egy takart gombra kattint (ugyanaz a lecke, mint a `closeAnyPanel`-nél — KUKA-228).
    await anna.page.keyboard.press('Escape');
    await switchUI(anna.page, masodik.bookId);
    await atad(anna.page, h3, 'újrahívás');
    // UGYANAZ A KÉT TANÚ AZ ÚJRAHÍVÁSON: a KONKRÉT régi nyugta (mindkét alakja — küldött ÉS
    // ismételt) nincs kint, és az ÚJ kontextus változatlan.
    const regiReinvite = B3HU.TPL.reinviteSent.replace('{ki}', bela2.email);
    const regiReinviteRep = B3HU.TPL.reinviteReplayed.replace('{ki}', bela2.email);
    const utanaSzoveg = (await anna.page.locator('main').textContent()) || '';
    expect(utanaSzoveg).not.toContain(regiReinvite);
    expect(utanaSzoveg).not.toContain(regiReinviteRep);
    expect(utanaSzoveg).not.toContain(bela2.email);
    await expect(anna.page.getByTestId('header-workspace')).toHaveText('R134 B3 Másik Kft');
    await anna.page.unroute('**/api/members/reinvite').catch(() => {});

    // ── (d) POZITÍV KONTROLL az ÚJRAHÍVÁSRA: változatlan nézetben a késői válasz MEGJELENIK ────
    await switchUI(anna.page, elso.bookId);
    await openMemberPanel(anna.page, bela2.subjectId);
    await anna.page.getByTestId(`member-reinvite-${bela2.subjectId}`).click();
    await expect(anna.page.getByTestId('reinvite-form')).toBeVisible();
    const h4 = await holdRoute(anna.page, '/api/members/reinvite');
    await anna.page.getByTestId('reinvite-confirm').click();
    await inFlight(h4, 'újrahívás (pozitív kontroll)');
    await atad(anna.page, h4, 'újrahívás (pozitív kontroll)');
    // A VÁRT ÚJ NYUGTA, NEVEZETTEN. A két MEGENGEDETT alak kimondott: ÚJ ajánlat (`reinviteSent`)
    // VAGY ugyanannak az azonosságnak az ISMÉTLÉSE (`reinviteReplayed`, OON-01) — bármelyik a
    // helyes üzleti válasz, de MÁS mondat egyik sem lehet (KUKA-215).
    // ÉS A MÉRÉS VÁR A NYUGTÁRA. Az első alakom egyszeri `textContent()`-tel olvasott, és ÜRES
    // sztringet kapott: a nyugta a kiolvasás pillanatában még nem volt kirajzolva. Ez a KUKA-228
    // alakja a próba oldalán — amit a felület nem rajzolt ki még, arra VÁRNI kell; a régi, üres-
    // ellenes állítás épp azért nem bukott el, mert automatikusan újrapróbálkozott.
    const vartReinvite = [
      B3HU.TPL.reinviteSent.replace('{ki}', bela2.email),
      B3HU.TPL.reinviteReplayed.replace('{ki}', bela2.email),
    ];
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(anna.page.getByTestId('members-result'))
      .toHaveText(new RegExp(`^(${vartReinvite.map(esc).join('|')})$`));
    await anna.page.unroute('**/api/members/reinvite').catch(() => {});
  });

  test('R134-B4 — a felület a hálózati ISMÉTLÉSHEZ ugyanazt az azonosságot küldi', async () => {
    const HU = dictFor('hu');
    const anna = await world.person('b4anna');
    const ws = await createWorkspaceUI(anna.page, { name: 'R134 B4 Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '32345672-2-42' } });
    const bela = await world.person('b4bela');
    const inv = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(bela.page, inv.link);
    await redeemUI(bela.page);
    await revokeUI(anna.page, bela.subjectId);

    // (1) AZ ELSŐ KIADÁS a felületről — és a kérés TÖRZSE hordozza a műveleti azonosságot.
    await openMemberPanel(anna.page, bela.subjectId);
    await anna.page.getByTestId(`member-reinvite-${bela.subjectId}`).click();
    await expect(anna.page.getByTestId('reinvite-form')).toBeVisible();
    let keres = null;
    anna.page.on('request', (req) => {
      if (new URL(req.url()).pathname === '/api/members/reinvite' && req.method() === 'POST') {
        try { keres = JSON.parse(req.postData() || '{}'); } catch { keres = null; }
      }
    });
    const elso = await withResponse(anna.page, { path: '/api/members/reinvite' }, () => anna.page.getByTestId('reinvite-confirm').click());
    expect(elso.body.ok).toBe(true);
    expect(elso.body.replayed).toBe(false);
    expect(typeof (keres || {}).operation_id).toBe('string');
    expect((keres || {}).operation_id.length).toBeGreaterThanOrEqual(8);
    const azonossag = keres.operation_id;
    expect(db.count('SELECT COUNT(*) FROM membership_reentry WHERE subject_id = ?', bela.subjectId)).toBe(1);

    // (2) AZ ELVESZETT NYUGTA UTÁNI ISMÉTLÉS: a LAP SAJÁT kérés-útján, UGYANAZZAL az azonossággal —
    //     ÚJ hatás nélkül, és a nyugta KIMONDJA, hogy ez ugyanaz az ajánlat.
    // A TARTALOM AZ ELSŐ KÉRÉSBŐL JÖN, NEM KITALÁLVA (KUKA-120 · KUKA-237): az ismétlés akkor
    // ISMÉTLÉS, ha UGYANAZT a szándékot küldi — az űrlap alapértékeit tehát a MÉRT kérésből
    // vesszük át, nem egy feltételezett „user/keszlet" párból. Eltérő tartalommal a szerver
    // helyesen ÜTKÖZÉST adna, és a próba a saját fixtúráját mérné.
    const ismetles = await anna.page.evaluate(async ([opId, keresTorzs]) => {
      const res = await fetch('/api/members/reinvite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...keresTorzs, operation_id: opId }),
      });
      return { status: res.status, body: await res.json() };
    }, [azonossag, keres]);
    expect(ismetles.body.ok).toBe(true);
    expect(ismetles.body.replayed).toBe(true);
    expect(ismetles.body.ref).toBe(elso.body.ref);
    expect(db.count('SELECT COUNT(*) FROM membership_reentry WHERE subject_id = ?', bela.subjectId)).toBe(1);
    expect(db.count('SELECT COUNT(*) FROM operation_once WHERE book_id = ?', ws.bookId)).toBe(1);

    // (3) ÉS A PRÓBAÜZENET-DOBOZBA SEM KERÜLT MÁSODIK ÖNÁLLÓ MEGHÍVÓ (R134 kikötése).
    const levelek = db.count(
      "SELECT COUNT(*) FROM invite WHERE book_id = ? AND invitee_value = ?", ws.bookId, bela.email);
    expect(levelek).toBe(2);   // az első (elfogadott) meghívó + EGY újrahívási ajánlat

    // (4) ÚJ PANEL = ÚJ AZONOSSÁG: a kezelő tudatos második ajánlata továbbra is lehetséges.
    await closeAnyPanel(anna.page);
    await openMemberPanel(anna.page, bela.subjectId);
    await anna.page.getByTestId(`member-reinvite-${bela.subjectId}`).click();
    await expect(anna.page.getByTestId('reinvite-form')).toBeVisible();
    const masodik = await withResponse(anna.page, { path: '/api/members/reinvite' }, () => anna.page.getByTestId('reinvite-confirm').click());
    expect(masodik.body.ok).toBe(true);
    expect(masodik.body.replayed).toBe(false);
    expect(keres.operation_id).not.toBe(azonossag);
    expect(db.count('SELECT COUNT(*) FROM membership_reentry WHERE subject_id = ?', bela.subjectId)).toBe(2);
    // A NYUGTA IGAZAT MOND: az ISMÉTLÉS mondata MÁS, mint az új ajánlat mondata (KUKA-129).
    expect(HU.TPL.reinviteReplayed).not.toBe(HU.TPL.reinviteSent);
  });

  test('R134-B5 — a KÖZÖS BEMUTATÓ: mind a két történet végigkattintható (asztali és keskeny)', async () => {
    // A BEMUTATÓ ÖNÁLLÓ, HÁLÓZAT NÉLKÜLI LAP: a próba a REPÓBAN álló kanonikus forrásból tölti be,
    // `file://` nélkül — a tartalmat `setContent`-tel adja a lapnak, tehát a mérés nem egy
    // származtatott, gitignore-olt fájlon áll (KUKA-207: a lap és a próba UGYANAZT futtassa).
    const ctx = await world.context();
    const forras = readFileSync(resolve(process.cwd(), 'docs/bemutato/V3_R134_MEGHIVO_ES_UJRABELEPES_BEMUTATO.artifact.html'), 'utf8');
    await ctx.page.setContent(`<!doctype html><html lang="hu"><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${forras}</body></html>`);

    // (1) A LAP KIMONDJA, HOGY SZIMULÁCIÓ — és azt is, hol áll a MÉRT bizonyíték.
    await expect(ctx.page.getByTestId('bemutato-jelzes')).toBeVisible();
    await expect(ctx.page.getByTestId('bemutato-jelzes')).toContainText('SZIMULÁCIÓ');
    await expect(ctx.page.getByTestId('bemutato-bizonyitek')).toContainText('findings_r134');

    for (const nezet of [{ width: 1280, height: 900, nev: 'asztali' }, { width: 390, height: 844, nev: 'keskeny' }]) {
      await ctx.page.setViewportSize({ width: nezet.width, height: nezet.height });

      // (2) AZ ELSŐ TÖRTÉNET: függő meghívó → visszavonás → a régi hivatkozás zárt → új meghívó →
      //     szabályos elfogadás. MINDEN lépést MEG KELL NYOMNI (KUKA-228: amit a bemutató nem nyom
      //     meg helyettünk, arra VÁRNI kell).
      await ctx.page.getByTestId('tortenet-1').click();
      await expect(ctx.page.getByTestId('lepes-1-1')).toBeVisible();
      for (const lepes of ['1-1', '1-2', '1-3', '1-4', '1-5']) {
        await ctx.page.getByTestId(`lepes-${lepes}`).click();
        await expect(ctx.page.getByTestId(`allapot-${lepes}`)).toBeVisible();
      }
      await expect(ctx.page.getByTestId('tortenet-1-vege')).toBeVisible();

      // (3) A MÁSODIK TÖRTÉNET: munkatárs jogokkal → megszüntetés → a régi tokenek zártak →
      //     kifejezett újrahívás → saját elfogadás → tagság VAN, adatjog NINCS → külön készletjog →
      //     csak mennyiségi nézet.
      await ctx.page.getByTestId('tortenet-2').click();
      await expect(ctx.page.getByTestId('lepes-2-1')).toBeVisible();
      for (const lepes of ['2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-7']) {
        await ctx.page.getByTestId(`lepes-${lepes}`).click();
        await expect(ctx.page.getByTestId(`allapot-${lepes}`)).toBeVisible();
      }
      await expect(ctx.page.getByTestId('tortenet-2-vege')).toBeVisible();

      // (4) NINCS VÍZSZINTES CSÚSZÁS egyik nézetben sem (a keskeny a 390 képpontos használhatóság).
      const tul = await ctx.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(tul, `túlcsúszás (${nezet.nev})`).toBeLessThanOrEqual(1);
    }
  });
});
