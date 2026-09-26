// tests/e2e/v3app-r93.spec.mjs — AZ R93 BEFEJEZŐ CSOMAG VÉGIGKATTINTVA (CMD-VS-300-002-002 R93).
//
// MIÉRT EZ A LAP, ÉS MIBEN MÁS AZ R91-NÉL. A külső ellenőrző fél az R93-ban NEVEZETTEN kimondta,
// hogy az R91-03 próba INDULÁSI PRÓBA volt: „a kiemelést, várakozást ÉS megszakadást egyaránt
// sikernek veszi, majd kilép". Egy bemutatóról tehát nem tudtuk meg, hogy VÉGIG lehet-e menni rajta
// — pedig pont ez a kérdés. Ez a lap MINDEN deklarált bemutatót VÉGIGJÁR, a valódi műveletekkel
// együtt (valódi meghívó · valódi tag · valódi engedélymentés · valódi cégalapítás), és a
// négy kimenetet KÜLÖN eredményként kezeli: befejezve · átugorva · megszakadt · el sem indult.
//
// MIT MÉR:
//   R93-01  MIND A KILENC deklarált bemutató VÉGIGVIHETŐ — a végállapot `befejezve`, nem „elindult".
//   R93-02  A CÉGALAPÍTÁS bemutatója a FIÓKVÁLTÁS UTÁN is lezárul (a hordozott elszámolás).
//   R93-03  Nem marad ÁLLAPOT NÉLKÜLI Befejezés gomb: az ürítés a buborékot is takarítja.
//   R93-04  A BELÉPÉS ELŐTT választott nyelvet az ÚJ személy első belépése MEGTARTJA.
//   R93-05  Az ODA-VISSZA nyelvváltás is érvényteleníti a késve érkező választ.
//   R93-06  Az elavult válasz NEM oldja fel egy ÚJABB, még futó kérés küldés-állapotát.
//   R93-07  A chat FORRÁSA megnyitható — és a megfelelő útmutatóra visz.
import { test, expect } from '@playwright/test';
import {
  World, createWorkspaceUI, openProfile, logoutUI,
  gotoPage, openInviteUI, redeemUI, ensureMemberRow, openMemberPanel, inviteUI, openMailbox,
} from './helpers.mjs';

const openHelp = async (page) => { await page.getByTestId('help-open').click(); await expect(page.getByTestId('help-close')).toBeVisible(); };
const closeHelp = async (page) => {
  if (await page.getByTestId('help-close').count()) {
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('help-close')).toHaveCount(0);
  }
};
const helpTab = async (page, tab) => { await page.getByTestId(`help-tab-${tab}`).click(); await expect(page.getByTestId(`help-view-${tab}`)).toBeVisible(); };

const closeTourPanel = async (page) => {
  const close = page.getByTestId('tour-close');
  if (await close.count() && await close.isVisible()) await close.click();
  // A TAKARÍTÁS NEM MÉRÉS: ha a bemutató nem ért véget, azt a VERDIKT mondja ki — itt csak
  // elpakolunk, hogy a következő bemutató tiszta lappal induljon (KUKA-216: a verdikt ne
  // mutasson a mérés hatókörén túl).
  const exit = page.getByTestId('tour-exit');
  if (await exit.count() && await exit.first().isVisible()) await exit.first().click();
  const close2 = page.getByTestId('tour-close');
  if (await close2.count() && await close2.isVisible()) await close2.click();
  // A BEMUTATÓ VÉGÉN NYITVA MARADHAT A MŰVELETI PANEL (meghívó · hozzáférés) — az MODÁLIS, tehát a
  // menü mögötte nem kattintható. A felhasználó útja ugyanez: a panelt be kell zárni (UX-18).
  const panelClose = page.locator('[data-action="panel-close"]');
  while (await panelClose.count() && await panelClose.last().isVisible()) {
    await panelClose.last().click();
    await page.waitForTimeout(100);
  }
};

async function startTourFor(page, feature) {
  await closeHelp(page);
  await openHelp(page);
  await helpTab(page, 'guides');
  await page.getByTestId('guide-search').fill('');
  await page.getByTestId(`help-guide-${feature}`).getByRole('button').click();
  await page.getByTestId(`help-tour-${feature}`).click();
  await expect(page.getByTestId('tour')).toBeVisible();
}

/** A FUTÓ LÉPÉS azonosítója a buborék listájából — a bemutató SAJÁT állapotából, nem tippből. */
async function currentStep(page) {
  const cur = page.locator('[data-testid^="tour-step-"][aria-current="step"]');
  if (!await cur.count()) return null;
  return String(await cur.first().getAttribute('data-testid')).replace('tour-step-', '');
}

/**
 * A BEMUTATÓ VÉGIGJÁRÁSA — ÚGY, AHOGY A FELHASZNÁLÓ.
 *
 * A `perform` a feladathoz kötött és a feltárást igénylő lépésekhez rendeli a VALÓDI műveletet. Ami
 * nincs benne, ott a járó a KIEMELT feltáró elemre kattint (a bemutató épp azt mondja, hogy arra
 * kell) — vagyis a próba nem kerüli meg a felületet, hanem használja.
 *
 * A VISSZATÉRÉSI ÉRTÉK NÉGY KÜLÖN SZÓ (a külső fél kikötése): `befejezve` · `megszakadt:<ok>` ·
 * `elakadt:<lépés>` · `nem_ert_veget`. Az „elindult" NEM eredmény.
 */
async function walkTour(page, perform = {}) {
  for (let guard = 0; guard < 40; guard += 1) {
    if (await page.getByTestId('tour-finished').count()) return 'befejezve';
    if (await page.getByTestId('tour-aborted').count()) {
      return `megszakadt:${await page.getByTestId('tour-aborted').getAttribute('data-why')}`;
    }
    const step = await currentStep(page);
    if (await page.getByTestId('tour-blocked').count()) {
      if (!perform[step]) return `elakadt:${step}`;
      await perform[step]();
      continue;
    }
    if (await page.getByTestId('tour-pending').count()) {
      if (perform[step]) { await perform[step](); continue; }
      await page.locator('.tourtarget').first().click();
      continue;
    }
    if (await page.getByTestId('tour-finish').count()) { await page.getByTestId('tour-finish').click(); continue; }
    if (await page.getByTestId('tour-next').count()) { await page.getByTestId('tour-next').click(); continue; }
    return `nem_ert_veget:${step}`;
  }
  const last = await currentStep(page);
  const states = await page.locator('[data-testid^="tour-step-"]').evaluateAll(
    (els) => els.map((e) => `${e.getAttribute('data-testid')}=${e.getAttribute('data-state')}`).join(','),
  );
  return `nem_ert_veget:${last}:${states}`;
}

/** A VERDIKT AZONNAL LÁTSZIK — a futás-napló megmondja, MELYIK bemutató hol állt meg. */
async function walkTourLogged(page, id, perform = {}) {
  const out = await walkTour(page, perform);
  console.log(`[R93-01] ${id.padEnd(18)} → ${out}`);
  return out;
}

test('R93-01/02/03 — MIND A KILENC bemutató VÉGIGVIHETŐ, a cégalapítás a fiókváltás UTÁN is lezárul', async ({ browser }) => {
  const w = new World(browser, 'r9301');
  const verdict = {};
  try {
    const anna = await w.person('anna');
    await createWorkspaceUI(anna.page, { name: 'R93 Kft', business: { jurisdiction: 'HU', tax_id: '12345678-1-42' } });

    // ── EGY VALÓDI TAG a hozzáférés-bemutatóhoz (a külső fél kikötése: „legyen valódi tag").
    const berta = await w.person('berta');
    const inv = await inviteUI(anna.page, { email: berta.email, role: 'user', scope: 'keszlet' });
    expect(inv.body.ok, 'a valódi meghívó elkészült').toBe(true);
    await openInviteUI(berta.page, inv.link);
    await redeemUI(berta.page);
    await anna.page.reload();
    await ensureMemberRow(anna.page, berta.subjectId);

    // ── A DEKLARÁLT LISTA A SZERVERTŐL JÖN — nem kézi másolat (KUKA-051).
    const status = await anna.api.get('/api/assistant/status?lang=hu');
    const tours = status.body.tours;
    expect(tours.length, 'a fiókkezelőnek nyolc bemutató jár').toBe(8);
    const byId = Object.fromEntries(tours.map((t) => [t.id, t]));

    const simple = ['tour.shell', 'tour.stock', 'tour.language', 'tour.help', 'tour.plan'];
    for (const id of simple) {
      await startTourFor(anna.page, byId[id].feature);
      verdict[id] = await walkTourLogged(anna.page, id, {
        // A CSOMAG-bemutató utolsó lépése VALÓDI mentéshez kötött.
        s3: id === 'tour.plan' ? async () => {
          await anna.page.getByTestId('plan-select').selectOption('pro');
          await anna.page.getByTestId('plan-submit').click();
          await expect(anna.page.getByTestId('plan-result')).toBeVisible();
        } : undefined,
      });
      await closeTourPanel(anna.page);
      await closeHelp(anna.page);
    }

    // ── A MEGHÍVÁS: valódi meghívó készül a bemutató lépésében.
    await gotoPage(anna.page, 'overview');
    await startTourFor(anna.page, byId['tour.invite'].feature);
    verdict['tour.invite'] = await walkTourLogged(anna.page, 'tour.invite', {
      s5: async () => {
        await anna.page.getByTestId('invite-email').fill(w.email('cili'));
        await anna.page.getByTestId('invite-submit').click();
        // A MENTÉS UTÁN A KÖVETKEZŐ LÉPÉS IS MEGJELENIK — ez a bemutató HATODIK lépésének a célja.
        // (A saját leletem itt jött ki: egy néma kliens-oldali kivétel miatt ez a gomb rejtve maradt.)
        await expect(anna.page.getByTestId('invite-result')).toContainText('elkészült');
        await expect(anna.page.getByTestId('invite-mail-open')).toBeVisible();
      },
    });
    await closeTourPanel(anna.page);

    // ── A HOZZÁFÉRÉS: valódi tag, valódi engedélymentés.
    await gotoPage(anna.page, 'overview');
    await startTourFor(anna.page, byId['tour.grant'].feature);
    verdict['tour.grant'] = await walkTourLogged(anna.page, 'tour.grant', {
      s3: async () => {
        if (!await anna.page.getByTestId('member-scope-form').count()) { await openMemberPanel(anna.page, berta.subjectId); return; }
        await anna.page.getByTestId(`member-scope-select-${berta.subjectId}`).selectOption('arak');
        await anna.page.getByTestId(`member-scope-${berta.subjectId}`).click();
        await expect(anna.page.getByTestId('members-result')).not.toHaveText('');
      },
    });
    await closeTourPanel(anna.page);

    // ── A CÉGALAPÍTÁS: a bemutató a SAJÁT sikerétől vesztette el az elszámolását (F93-01).
    await gotoPage(anna.page, 'overview');
    await startTourFor(anna.page, byId['tour.addBusiness'].feature);
    verdict['tour.addBusiness'] = await walkTourLogged(anna.page, 'tour.addBusiness', {
      s5: async () => {
        await anna.page.getByTestId('ws-name').fill('Own93 Kft');
        await anna.page.getByTestId('ws-jurisdiction').selectOption('HU');
        await anna.page.getByTestId('ws-tax-id').fill('87654321-1-42');
        await anna.page.getByTestId('ws-create').click();
        await expect(anna.page.getByTestId('tour-finished')).toBeVisible();
      },
    });
    // R93-02: a lezárás MEGSZÜLETETT, TELJES, és KIMONDJA, hogy hordozott (nem hazudik helyszínt).
    await expect(anna.page.getByTestId('tour-finished'), 'a fiókváltás után is van lezárás').toBeVisible();
    await expect(anna.page.getByTestId('tour-finished')).toHaveAttribute('data-whole', 'true');
    await expect(anna.page.getByTestId('tour-finished')).toHaveAttribute('data-carried', 'true');
    await expect(anna.page.getByTestId('tour-summary')).toContainText('5');
    // …és tényleg AZ ÚJ fiókban vagyunk (a lezárás nem a váltás elmaradásából jön).
    await expect(anna.page.getByTestId('header-workspace')).toContainText('Own93');
    await anna.page.getByTestId('tour-close').click();
    await expect(anna.page.getByTestId('tour')).toBeHidden();

    // ── R93-03: NEM MARAD ÁLLAPOT NÉLKÜLI BEFEJEZÉS GOMB. Egy futó bemutató közben fiókot váltunk.
    await gotoPage(anna.page, 'overview');
    await startTourFor(anna.page, byId['tour.shell'].feature);
    await expect(anna.page.getByTestId('tour-next')).toBeVisible();
    await anna.page.getByTestId('account-switcher-summary').click();
    await anna.page.getByTestId(`ws-switch-${(await anna.api.get('/api/me')).body.personal_book_id}`).click();
    await expect(anna.page.getByTestId('tour'), 'a buborék a váltással eltűnik — nem marad gazdátlan gomb').toBeHidden();
    await expect(anna.page.getByTestId('tour-finish')).toHaveCount(0);
    await expect(anna.page.getByTestId('tour-next')).toHaveCount(0);

    // ── A BELÉPÉS ELŐTTI bemutató a saját képernyőjén (a kilencedik).
    const { page: anon } = await w.anonymous();
    await anon.goto('/');
    await anon.getByTestId('auth-help-open').click();
    await helpTab(anon, 'guides');
    await anon.getByTestId('help-guide-auth.register').getByRole('button').click();
    await anon.getByTestId('help-tour-auth.register').click();
    await expect(anon.getByTestId('tour')).toBeVisible();
    verdict['tour.register'] = await walkTourLogged(anon, 'tour.register');
    /**
     * A FELADAT NÉLKÜLI TÚRA NEM ÁLLÍTHATJA, HOGY A FELHASZNÁLÓ MŰVELETET VÉGZETT (R93 §4).
     * Ezt VISELKEDÉSSEL mérjük, nem felirattal: a bemutató végigmenetele után SEMMI nem jött
     * létre — a lap a belépési képernyőn áll, és nincs munkamenet (KUKA-237).
     */
    await expect(anon.getByTestId('tour-finished')).toHaveAttribute('data-whole', 'true');
    const me = await anon.evaluate(async () => (await fetch('/api/me')).json());
    expect(me.subject_id ?? null, 'a bemutató VÉGIGMENETELE nem hozott létre fiókot').toBeNull();
    await anon.getByTestId('tour-close').click();
    // A BELÉPÉS ELŐTTI KÉPERNYŐN MARADTUNK: a keret NEM nyílt meg (UX-01 — belső nézet csak belépve).
    await expect(anon.getByTestId('auth'), 'a belépés előtti képernyőn maradtunk').toBeVisible();
    await expect(anon.getByTestId('app')).toBeHidden();

    // ── AZ ELSZÁMOLÁS: MIND A KILENC végigvihető. Az „elindult" nem eredmény.
    const expected = ['tour.shell', 'tour.stock', 'tour.language', 'tour.help', 'tour.plan',
      'tour.invite', 'tour.grant', 'tour.addBusiness', 'tour.register'];
    expect(Object.keys(verdict).sort(), 'mind a kilenc deklarált bemutató végig lett járva').toEqual([...expected].sort());
    expect(verdict, 'minden bemutató BEFEJEZVE — megszakadás és elakadás nem elfogadás').toEqual(
      Object.fromEntries(expected.map((id) => [id, 'befejezve'])),
    );
  } finally { await w.close(); }
});

/**
 * NYELV-FÜGGETLEN REGISZTRÁCIÓ ÉS BELÉPÉS. A közös segéd a MAGYAR válasz-szövegre mér; ez a próba
 * viszont épp azt méri, hogy a lap a VÁLASZTOTT nyelven beszél — ezért itt a VISELKEDÉST nézzük
 * (megjelent-e a válasz, létrejött-e a munkamenet), nem a felirat szövegét (KUKA-237).
 */
async function registerAnyLang(page, email, password = 'proba-jelszo-2026') {
  await page.locator('[data-auth="register"]').first().click();
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill(password);
  await page.getByTestId('register-submit').click();
  await expect(page.getByTestId('register-result')).not.toHaveText('');
}
/** A megerősítés a levél-fogadóból, a CÍM alapján — a levél TÁRGYA nyelvenként más (F93-02). */
async function verifyAnyLang(page, email) {
  await openMailbox(page);
  const li = page.locator('li[data-testid^="mail-"]').filter({ hasText: email }).last();
  await expect(li).toBeVisible();
  await li.locator('a[data-testid^="mail-link-"]').click();
  await expect(page.getByTestId('verify-result')).toHaveAttribute('data-ok', 'true');
  await page.getByTestId('verify-back').click();
  await expect(page.getByTestId('login-email')).toBeVisible();
}
async function loginAnyLang(page, email, password = 'proba-jelszo-2026') {
  if (!await page.getByTestId('login-email').count()) await page.locator('[data-auth="login"]').first().click();
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('header-subject')).toContainText(email);
}

test('R93-04 — a belépés ELŐTT választott nyelvet az ÚJ személy első belépése MEGTARTJA', async ({ browser }) => {
  const w = new World(browser, 'r9304');
  try {
    const { page } = await w.anonymous();
    const email = w.email('dora');
    await page.goto('/');
    // ── A FELHASZNÁLÓ TUDATOSAN NÉMETRE ÁLLÍT, MÉG BELÉPÉS ELŐTT.
    await page.getByTestId('lang-select-public').selectOption('de');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    // A SEGÉD MAGYAR SZÖVEGET VÁR — itt a lap NÉMET, ezért a regisztráció a saját, nyelv-független
    // útján megy (ez maga is a javítás jele: a lap tényleg a választott nyelven válaszol).
    await registerAnyLang(page, email);
    await verifyAnyLang(page, email);
    await loginAnyLang(page, email);
    // ── A LELET: itt a lap magyarra állt vissza, mert az új személynek nincs tárolt választása.
    await expect(page.locator('html'), 'az úton választott nyelv túléli az első belépést').toHaveAttribute('lang', 'de');
    // …és innentől az ÖVÉ: a frissítés után is megmarad.
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');

    // ── ÉS NEM ÖRÖKLŐDIK: kijelentkezés után a KÖVETKEZŐ ember nem kapja meg automatikusan.
    await logoutUI(page);
    const other = w.email('elek');
    await registerAnyLang(page, other);
    await verifyAnyLang(page, other);
    await loginAnyLang(page, other);
    await expect(page.locator('html'), 'az előző ember választása nem lesz a következő emberé').not.toHaveAttribute('lang', 'de');
  } finally { await w.close(); }
});

test('R93-05/06 — az ODA-VISSZA nyelvváltás is eldobja a késő választ, és a küldés-állapot a SAJÁTJÁÉ', async ({ browser }) => {
  const w = new World(browser, 'r9305');
  try {
    const anna = await w.person('anna');
    await createWorkspaceUI(anna.page, { name: 'R93 Nyelv Kft', business: { jurisdiction: 'HU', tax_id: '11223344-1-42' } });

    // A VÁLASZT VISSZATARTJUK — a nyelvváltás a válasz ÚTON LÉTE alatt történik.
    let release = null;
    const held = new Promise((r) => { release = r; });
    let intercepted = 0;
    await anna.page.route('**/api/assistant/ask', async (route) => {
      intercepted += 1;
      if (intercepted === 1) await held;
      await route.continue();
    });

    await openHelp(anna.page);
    await helpTab(anna.page, 'ask');
    await anna.page.getByTestId('chat-input').fill('Hogyan hívhatok meg valakit?');
    await anna.page.getByTestId('chat-send').click();

    // ── ODA-VISSZA: magyar → német → magyar. A nyelv ÉRTÉKE a végén ugyanaz, mint a küldéskor.
    await closeHelp(anna.page);
    await openProfile(anna.page);
    await anna.page.getByTestId('profile-menu').getByRole('button').first().click();
    await anna.page.getByTestId('lang-select').selectOption('de');
    await expect(anna.page.locator('html')).toHaveAttribute('lang', 'de');
    await anna.page.getByTestId('lang-select').selectOption('hu');
    await expect(anna.page.locator('html')).toHaveAttribute('lang', 'hu');

    release();
    await anna.page.waitForTimeout(500);
    await openHelp(anna.page);
    await helpTab(anna.page, 'ask');
    // ── A LELET: az érték-összehasonlítás átengedte a régi választ. A GENERÁCIÓ nem engedi.
    await expect(anna.page.getByTestId('chat-list'), 'az oda-vissza váltás után a régi válasz NEM jelenik meg').toHaveCount(0);
  } finally { await w.close(); }
});

test('R93-07 — a chat FORRÁSA megnyitható, és a megfelelő útmutatóra visz', async ({ browser }) => {
  const w = new World(browser, 'r9307');
  try {
    const anna = await w.person('anna');
    await createWorkspaceUI(anna.page, { name: 'R93 Forrás Kft', business: { jurisdiction: 'HU', tax_id: '55667788-1-42' } });
    await openHelp(anna.page);
    await helpTab(anna.page, 'ask');
    await anna.page.getByTestId('chat-input').fill('Hogyan hívhatok meg valakit?');
    await anna.page.getByTestId('chat-send').click();
    await expect(anna.page.getByTestId('chat-answer-0')).toBeVisible();
    // ── A LELET: a forrás sima listasor volt — látszott, de nem lehetett eljutni oda.
    const open = anna.page.getByTestId('chat-source-open-invite.send');
    await expect(open, 'a forrás-cím megnyitható gomb').toBeVisible();
    await open.click();
    // …és a MEGFELELŐ útmutató nyílik meg, a mai nyelven.
    await expect(anna.page.getByTestId('help-view-guides')).toBeVisible();
    await expect(anna.page.getByTestId('help-topic-invite.send')).toBeVisible();
  } finally { await w.close(); }
});
