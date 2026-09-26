// tests/e2e/v3app-r91.spec.mjs — AZ R91 JAVÍTÁSOK VÉGIGKATTINTVA (CMD-VS-300-002-002 R91).
//
// MIÉRT EZ A LAP. A külső ellenőrző fél (chatgpt-v3, R91) hét leletéből NÉGY csak a böngészőben jött
// ki: a bemutató BEFEJEZÉSE hamis sikert állított, a regisztrációs bemutató azonnal megszakadt, a
// nyelv nem élte túl a frissítést, és az Új beszélgetés után a régi válasz visszakerült. A
// szerződés-mérés és a HTTP-battéria egyiket sem fogta meg — a végigkattintás az EGYETLEN tanú rájuk
// (D-VS-497 negyedik kérdése · KUKA-011).
//
// MIT MÉR:
//   R91-01  A BEFEJEZÉS nem állít hamis sikert: függő feladatnál elakad, és ott a KIMONDOTT kihagyás.
//   R91-02  A KILÉPÉS is ELSZÁMOL: a záró lap három számot ír ki, és MÁS mondattal.
//   R91-03  MIND A KILENC bemutató elindul és a saját képernyőjén kiemel — vagy NEVEZETTEN nem indítható.
//   R91-04  A BELÉPÉS ELŐTTI segítség: a panel négy nézete és a regisztrációs bemutató VÉGIGVIHETŐ.
//   R91-05  A NYELV a belépés előtt is választható, és TÚLÉLI a lapfrissítést.
//   R91-06  A NYELV a SZEMÉLYHEZ tartozik: másik ember belépése nem viszi át az előző beállítását.
//   R91-07  Az ÚJ BESZÉLGETÉS után a késve érkező válasz NEM kerül vissza.
//   R91-08  A beszélgetés VÉGES: hét kérdés után a legutóbbi hat marad, és a lap KIMONDJA.
//   R91-09  A szimulált melléklet EMBERI: nincs nyers azonosító, nincs változónév, a részletek lenyithatók.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  World, createWorkspaceUI, openProfile, setPlanUI, logoutUI, registerUI, verifyFromMailboxUI, loginUI,
} from './helpers.mjs';

const openHelp = async (page) => { await page.getByTestId('help-open').click(); await expect(page.getByTestId('help-close')).toBeVisible(); };
const closeHelp = async (page) => {
  if (await page.getByTestId('help-close').count()) {
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('help-close')).toHaveCount(0);
  }
};
const helpTab = async (page, tab) => { await page.getByTestId(`help-tab-${tab}`).click(); await expect(page.getByTestId(`help-view-${tab}`)).toBeVisible(); };
/** Egy bemutató indítása a súgóból, a funkció útmutatójából. */
async function startTourFor(page, feature, search) {
  await openHelp(page);
  await helpTab(page, 'guides');
  await page.getByTestId('guide-search').fill(search);
  await page.getByTestId(`help-guide-${feature}`).getByRole('button').click();
  await page.getByTestId(`help-tour-${feature}`).click();
  await expect(page.getByTestId('tour')).toBeVisible();
}

test('R91-01/02 — a Befejezés nem állít hamis sikert, a kihagyás KIMONDOTT, a kilépés ELSZÁMOL', async ({ browser }) => {
  const w = new World(browser, 'r9101');
  try {
    const anna = await w.person('anna');
    await createWorkspaceUI(anna.page, { name: 'R91 Kft', business: { jurisdiction: 'HU', tax_id: '12345678-1-42' } });

    // A CSOMAG-BEMUTATÓ: három lépés, a harmadik `plan.saved` feladathoz kötött.
    await startTourFor(anna.page, 'plan.change', 'csomag');
    await anna.page.getByTestId('tour-next').click();          // s1 → s2 (plan-select)
    await anna.page.getByTestId('tour-next').click();          // s2 → s3 (plan-submit, FELADAT)
    await expect(anna.page.getByTestId('tour-progress')).toContainText('3/3');
    // ── A LELET: a Befejezés MENTÉS NÉLKÜL „a bemutató végére értél"-t írt, 2 elvégezve / 0 kihagyva.
    await anna.page.getByTestId('tour-finish').click();
    await expect(anna.page.getByTestId('tour-blocked')).toBeVisible();
    await expect(anna.page.getByTestId('tour-blocked')).toContainText('önmagában még nem siker');
    await expect(anna.page.getByTestId('tour-finished')).toHaveCount(0);   // NINCS záró lap
    // ── ÉS OTT A KIMONDOTT KIHAGYÁS: a felhasználó nincs bezárva, de az elszámolás igazat mond.
    await expect(anna.page.getByTestId('tour-skip')).toBeVisible();
    await anna.page.getByTestId('tour-skip').click();
    await expect(anna.page.getByTestId('tour-finished')).toBeVisible();
    await expect(anna.page.getByTestId('tour-finished')).toHaveAttribute('data-whole', 'false');
    await expect(anna.page.getByTestId('tour-summary')).toContainText('2');   // 2 elvégezve
    await expect(anna.page.getByTestId('tour-summary')).toContainText('1');   // 1 átugorva
    await anna.page.getByTestId('tour-close').click();
    await expect(anna.page.getByTestId('tour')).toBeHidden();

    // ── A VALÓDI MENTÉS UTÁN a bemutató TELJES befejezést ad (a tanú a szerver válasza).
    await startTourFor(anna.page, 'plan.change', 'csomag');
    await anna.page.getByTestId('tour-next').click();
    await anna.page.getByTestId('tour-next').click();
    await setPlanUI(anna.page, 'pro');
    await expect(anna.page.getByTestId('tour-step-s3')).toHaveAttribute('data-state', 'done');
    await anna.page.getByTestId('tour-finish').click();
    await expect(anna.page.getByTestId('tour-finished')).toHaveAttribute('data-whole', 'true');
    await expect(anna.page.getByTestId('tour-summary')).toContainText('3');
  } finally { await w.close(); }
});

test('R91-03 — MIND A KILENC bemutató elindul a saját képernyőjén, vagy NEVEZETTEN nem indítható', async ({ browser }) => {
  const w = new World(browser, 'r9103');
  try {
    const anna = await w.person('anna');
    await createWorkspaceUI(anna.page, { name: 'Bemutató Kft', business: { jurisdiction: 'HU', tax_id: '12345678-1-42' } });
    const status = await anna.api.get('/api/assistant/status?lang=hu');
    const tours = status.body.tours.map((t) => t.id);
    // A KILENC DEKLARÁLT BEMUTATÓBÓL a fiókkezelőnek NYOLC jár (a regisztrációs CSAK belépés előtt).
    expect(tours.length).toBe(8);
    expect(tours).not.toContain('tour.register');
    const byFeature = Object.fromEntries(status.body.tours.map((t) => [t.id, t.feature]));
    for (const id of tours) {
      // A SÚGÓBÓL INDÍTJUK, ahogy a felhasználó: a funkció útmutatójából.
      await closeHelp(anna.page);
      await openHelp(anna.page);
      await helpTab(anna.page, 'guides');
      await anna.page.getByTestId('guide-search').fill('');
      await anna.page.getByTestId(`help-guide-${byFeature[id]}`).getByRole('button').click();
      await anna.page.getByTestId(`help-tour-${byFeature[id]}`).click();
      await expect(anna.page.getByTestId('tour'), `${id}: a buborék megjelenik`).toBeVisible();
      // A BEMUTATÓ vagy KIEMEL (van célja a lapon), vagy NEVEZETTEN vár/megszakít — de SOHA nem
      // mutogat a semmibe és soha nem hallgat el.
      const highlighted = await anna.page.locator('.tourtarget').count();
      const pending = await anna.page.getByTestId('tour-pending').count();
      const aborted = await anna.page.getByTestId('tour-aborted').count();
      expect(highlighted + pending + aborted, `${id}: kiemel VAGY nevezetten vár/megszakít`).toBeGreaterThan(0);
      if (aborted) await expect(anna.page.getByTestId('tour-aborted')).toHaveAttribute('data-why', /targetMissing|rightLost|contextChanged|notAvailable/);
      await anna.page.getByTestId('tour-exit').click();
      if (await anna.page.getByTestId('tour-close').count()) await anna.page.getByTestId('tour-close').click();
    }
  } finally { await w.close(); }
});

test('R91-04/05 — belépés ELŐTT: négy nézet, nyelvválasztó, végigvihető regisztrációs bemutató, és a nyelv TÚLÉLI a frissítést', async ({ browser }) => {
  const w = new World(browser, 'r9104');
  try {
    const { page } = await w.anonymous();
    await page.goto('/');
    // ── A NYELVVÁLASZTÓ A BELÉPÉS ELŐTT IS OTT VAN (a lelet: nem volt).
    await expect(page.getByTestId('lang-select-public')).toBeVisible();
    // ── A SEGÍTSÉG BELÉPÉS ELŐTT IS MŰKÖDIK, és a NYILVÁNOS tudást adja.
    await page.getByTestId('auth-help-open').click();
    await expect(page.getByTestId('help-close')).toBeVisible();
    for (const tab of ['ask', 'guides', 'faq', 'sitemap']) await expect(page.getByTestId(`help-tab-${tab}`)).toBeVisible();
    await helpTab(page, 'guides');
    await expect(page.getByTestId('help-guide-auth.register')).toBeVisible();
    // A FIÓKHOZ KÖTÖTT ÚTMUTATÓ NEM jelenik meg belépés előtt.
    await expect(page.getByTestId('help-guide-invite.send')).toHaveCount(0);
    // ── A REGISZTRÁCIÓS BEMUTATÓ VÉGIGVIHETŐ (a lelet: azonnal targetMissing).
    await page.getByTestId('help-guide-auth.register').getByRole('button').click();
    await page.getByTestId('help-tour-auth.register').click();
    await expect(page.getByTestId('tour')).toBeVisible();
    await expect(page.getByTestId('tour-aborted')).toHaveCount(0);
    await expect(page.locator('.tourtarget')).toHaveCount(1);
    await page.getByTestId('tour-next').click();
    await page.getByTestId('tour-next').click();
    await expect(page.getByTestId('tour-progress')).toContainText('3/3');
    await page.getByTestId('tour-finish').click();
    await expect(page.getByTestId('tour-finished')).toHaveAttribute('data-whole', 'true');
    await page.getByTestId('tour-close').click();

    // ── A NYELV TÚLÉLI A LAPFRISSÍTÉST (a lelet: de → hu).
    await page.getByTestId('lang-select-public').selectOption('de');
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('de');
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('de');
    await expect(page.getByTestId('lang-select-public')).toHaveValue('de');
  } finally { await w.close(); }
});

test('R91-06 — a nyelv a SZEMÉLYHEZ tartozik: a másik ember belépése nem viszi át az előző beállítását', async ({ browser }) => {
  const w = new World(browser, 'r9106');
  try {
    const anna = await w.person('anna');
    await createWorkspaceUI(anna.page, { name: 'Nyelv Kft', business: { jurisdiction: 'HU', tax_id: '12345678-1-42' } });
    // ANNA németre állítja a felületet a profilján.
    await openProfile(anna.page);
    await anna.page.getByTestId('profile-menu').getByRole('button').first().click();
    await anna.page.getByTestId('lang-select').selectOption('de');
    expect(await anna.page.evaluate(() => document.documentElement.lang)).toBe('de');
    // UGYANEBBEN A BÖNGÉSZŐBEN (ugyanaz a tárca!) másik ember lép be: az ŐVÉ a nyelv, nem Annáé.
    await logoutUI(anna.page);
    const belaMail = w.email('bela');
    await registerUI(anna.page, belaMail, anna.password);
    await verifyFromMailboxUI(anna.page, belaMail);
    await loginUI(anna.page, belaMail, anna.password);
    // Bélának NINCS tárolt választása → a böngésző kérése dönt; Anna németje NEM öröklődik át.
    const belaLang = await anna.page.evaluate(() => document.documentElement.lang);
    expect(belaLang, 'a másik ember nem kapja meg Anna nyelvét').not.toBe('de');
    // ÉS ANNA választása MEGMARADT a saját belépésekor (személyhez kötött tárolás).
    await logoutUI(anna.page);
    await loginUI(anna.page, anna.email, anna.password);
    expect(await anna.page.evaluate(() => document.documentElement.lang)).toBe('de');
  } finally { await w.close(); }
});

test('R91-07/08 — az Új beszélgetés után a késő válasz NEM tér vissza, és a beszélgetés VÉGES', async ({ browser }) => {
  const w = new World(browser, 'r9107');
  try {
    const anna = await w.person('anna');
    await createWorkspaceUI(anna.page, { name: 'Chat Kft', business: { jurisdiction: 'HU', tax_id: '12345678-1-42' } });
    await openHelp(anna.page);
    await helpTab(anna.page, 'ask');

    // ── A VÁLASZT VISSZATARTJUK, közben ÚJ BESZÉLGETÉST nyitunk (a külső fél reprodukciója).
    let release = null;
    await anna.page.route('**/api/assistant/ask', async (route) => {
      if (release) { await route.continue(); return; }
      release = route;                        // az ELSŐ kérdés válaszát visszatartjuk
    });
    await anna.page.getByTestId('chat-input').fill('Hogyan hívhatok meg valakit?');
    await anna.page.getByTestId('chat-send').click();
    await expect(anna.page.getByTestId('chat-send')).toBeDisabled();
    await anna.page.getByTestId('chat-new').click();
    await expect(anna.page.getByTestId('chat-list')).toHaveCount(0);
    await release.continue();                 // a KÉSŐ válasz megérkezik
    await anna.page.waitForTimeout(600);
    await expect(anna.page.getByTestId('chat-list'), 'a régi válasz NEM kerül vissza').toHaveCount(0);
    await anna.page.unroute('**/api/assistant/ask');

    // ── HÉT KÉRDÉS: a legutóbbi HAT marad, és a lap KIMONDJA a korlátot.
    for (let i = 1; i <= 7; i += 1) {
      await anna.page.getByTestId('chat-input').fill(`Hogyan hívhatok meg valakit? (${i})`);
      await anna.page.getByTestId('chat-send').click();
      await expect(anna.page.getByTestId(`chat-answer-${Math.min(i, 6) - 1}`)).toBeVisible();
    }
    const turns = await anna.page.locator('[data-testid^="chat-turn-"]').count();
    expect(turns).toBe(6);
    await expect(anna.page.getByTestId('chat-history-note')).toContainText('6');
    // A LEGRÉGEBBI kérdés kiesett, a LEGUTÓBBI ott van.
    await expect(anna.page.getByTestId('chat-question-5')).toContainText('(7)');
    await expect(anna.page.getByTestId('chat-list')).not.toContainText('(1)');
  } finally { await w.close(); }
});

test('R91-09 — a szimulált melléklet EMBERI: nincs nyers azonosító, nincs változónév, a részletek lenyithatók', async ({ browser }) => {
  const file = resolve(process.cwd(), 'docs/_olvashato/V3_R89_SZIMULALT_BEMUTATO.html');
  const html = readFileSync(file, 'utf8');
  expect(html.length).toBeGreaterThan(1000);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    await page.goto(`file://${file}`);
    // EGY rövid jelzés a fejben — nem ismételt nagy szimulációs szövegek.
    await expect(page.locator('.simbar')).toHaveText('Bemutató — mintaadatokkal');
    // A MÉRÉSI RÉSZLETEK LENYITHATÓ szakaszban állnak, és a lektorálás módja KIMONDVA.
    await expect(page.locator('#techbox')).toBeVisible();
    expect(await page.locator('#techbox').evaluate((el) => el.open)).toBe(false);
    await page.locator('#techbox summary').click();
    await expect(page.locator('#tech')).toContainText('kulcs');
    await expect(page.locator('#tech')).toContainText('NEM nyelvi lektorálás');
    // A LÁTHATÓ SZÖVEGBEN nincs nyers azonosító és nincs környezeti változónév (F91-06).
    const visible = await page.evaluate(() => document.body.innerText);
    expect(visible).not.toMatch(/\b(faq|shell|invite|auth|members|plan|account|security|data)\.[a-z_]+\b/);
    expect(visible).not.toMatch(/VS_[A-Z_]+/);
    // A KÉSZLET-OLDALON a SAJÁT műveletei állnak — nem meghívási vagy csomag-vezérlő (F91-06).
    await page.locator('[data-testid="nav-stock"]').click();
    const acts = await page.locator('#pageacts').innerText();
    expect(acts).not.toMatch(/Meghívás|Csomag/);
    // A SÚGÓ témái EMBERI címmel nyílnak meg.
    await page.locator('#help').click();
    await expect(page.locator('.panel')).toBeVisible();
    const panel = await page.locator('.panel').innerText();
    expect(panel).not.toMatch(/\b(faq|shell|invite)\.[a-z_]+\b/);
  } finally { await ctx.close(); }
});
