// tests/e2e/v3app-r166-invite-leave.spec.mjs — A MEGHÍVÓ-KÉPERNYŐ VISSZALÉPÉSE ÉS KILÉPÉSE (R166 §1).
//
// MIÉRT VAN EZ A LAP, ÉS MIÉRT ÉPP MOST. Az R164 jelentés 8/7. tétele a `KUKA-362` és a `KUKA-383`
// KILÉPÉS-ágáról azt mondta ki, hogy böngészőben NEM mérjük — és megnevezte a pontos okot: a
// meghívó-képernyő a TELJES alkalmazás-héjat lecseréli, tehát ott nem rajzolódik ki a profil-menü,
// és vele a kilépés-vezérlő sem. A felületen így NEM VOLT ÚT, amin a meghívó-jegy a címsorban állva
// kilépés érné. A hiányzó mérés feltétele egy TERMÉK-DÖNTÉS volt; az R166 §1 meghozta.
//
// Ez a lap tehát nem egy új funkció „bemutatója": azt a mérést végzi el, ami eddig BEJÁRHATATLAN
// volt, és amit az R164 nevezett maradék résként adott át.
//
//   R166-M1  NÉVTELEN néző: a meghívó lapjáról visszalépés a KEZDŐLAPRA — a jegy a címsorból is
//            eltűnik, a FRISSÍTÉS nem hozza vissza a képernyőt (nincs visszairányítási hurok), és
//            TAGSÁG NEM születik (adatbázisban mérve)
//   R166-M2  BELÉPETT néző: visszalépés a SAJÁT FIÓKBA (a héj jön vissza), a gomb megnevezése a
//            hitelesítési állapothoz igazodik
//   R166-M3  A KILÉPÉS ÁGA — EZ A LÉNYEG (`KUKA-362` · `KUKA-383`): az előző ember a meghívó
//            képernyőjéről LÉP KI, utána MÁS EMBER lép be UGYANABBAN a böngészőben — és nem az
//            előző ember meghívó-képernyőjén landol, nem látja az előző ember címét, és a jegy a
//            frissítés után sem éled újra
//   R166-M4  MINDEN MEGHÍVÓ-ÁLLAPOT kap folytatást: BEVÁLTOTT · VISSZAVONT · LEJÁRT · ISMERETLEN ·
//            MÁS SZEMÉLYNEK címzett — egyik sem zsákutca
//   R166-M5  A FELIRATOK a KÖZÖS nyelvi forrásból jönnek, MINDEN BEKAPCSOLT NYELVEN (a próba a
//            nyelvcsomagból olvas, nem éget be szöveget — KUKA-237)
//
// AMIT EZ A LAP NEM MÉR: a beváltás útját (az R109/R112 lapjai mérik), a jogosultsági mag döntéseit
// (a mag-battéria méri) és a bemutató lépéseit (a `proof:demo-walk` és az R112 lapja).
import { test, expect } from '@playwright/test';
import { World, Db, inviteUI, openInviteUI, redeemUI, createWorkspaceUI, loginUI, logoutUI, withResponse,
  gotoPage, header, openProfile, PASSWORD } from './helpers.mjs';
import { enabledLanguages } from '../../v3app/public/i18n/languages.mjs';
import { dictFor } from '../../v3app/public/i18n/dict.mjs';

test.describe.configure({ mode: 'serial' });

const HU = dictFor('hu');
const ENABLED = enabledLanguages().map((l) => l.code);
const EIGHT_DAYS = 8 * 24 * 3600 * 1000;
const taxOf = (tag) => `${tag.replace(/\D/g, '').slice(0, 2).padStart(2, '8')}345671-2-42`;

/** A VÁRAKOZÓ MEGHÍVÁSOK füle — a valódi úton (Tagok oldal → „Várakozó" alfül). */
async function openInvitesTab(page) {
  await gotoPage(page, 'members');
  await page.locator('.subtabs button', { hasText: HU.STATE.invitePending }).first().click();
  await expect(page.getByTestId('invites-list')).toBeVisible();
}

/** A címsorban áll-e még a meghívó jegye? A `forgetInvite` szerződése szerint NEM (KUKA-383). */
async function inviteInUrl(page) {
  return page.evaluate(() => new URL(window.location.href).searchParams.has('invite'));
}

/**
 * A FOLYTATÁS SORA — a MEGNEVEZÉS a hitelesítési állapothoz igazodik, és a KILÉPÉS csak belépve van.
 * A feliratot a NYELVCSOMAGBÓL olvassuk (KUKA-237: a próba se égessen be szöveget).
 */
async function continueRow(page, lang = 'hu') {
  const D = dictFor(lang);
  await expect(page.getByTestId('invite-continue')).toBeVisible();
  const back = page.getByTestId('invite-back');
  await expect(back).toBeVisible();
  await expect(back).toBeEnabled();                       // KUKA-011: az ELÉRHETŐ és ENGEDÉLYEZETT gomb
  await expect(page.getByTestId('invite-leave-note')).toContainText(D.UI.inviteLeaveNote);
  return {
    backText: (await back.textContent()) || '',
    logoutCount: await page.getByTestId('invite-logout').count(),
    expectedBackLoggedIn: D.UI.inviteBackToApp,
    expectedBackAnon: D.UI.inviteBackToStart,
    expectedLogout: D.UI.inviteSignOutSwitch,
  };
}

let world; let db; let anna; let bela; let token; let link;

test.beforeAll(async ({ browser }) => {
  world = new World(browser, 'r166');
  db = new Db();
  // ANNA: fiókkezelő, saját vállalkozással — ő hívja meg Bélát.
  anna = await world.person('anna');
  await createWorkspaceUI(anna.page, { name: 'R166 Kft', business: { jurisdiction: 'HU', tax_id: taxOf('r166') } });
  bela = await world.person('bela');
  const inv = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
  expect(inv.body.ok, 'a meghívó elkészült').toBe(true);
  token = inv.token; link = inv.link;
});

test.afterAll(async () => { if (db) db.close(); if (world) await world.close(); });

test('R166-M1 — NÉVTELEN néző: visszalépés a kezdőlapra, a jegy a címsorból is eltűnik, és tagság NEM születik', async () => {
  const c = await world.context();
  const elott = db.count('SELECT COUNT(*) FROM membership');
  const o = await openInviteUI(c.page, link);
  expect(o.observe.status, 'névtelenül a lap belépésre hív').toBeTruthy();

  const row = await continueRow(c.page);
  expect(row.backText, 'a megnevezés a NÉVTELEN állapothoz igazodik').toContain(row.expectedBackAnon);
  expect(row.logoutCount, 'belépés nélkül NINCS kilépés-gomb (a felirat igaz tartalma — KUKA-050)').toBe(0);

  await c.page.getByTestId('invite-back').click();
  // A VÁLASZ A BELÉPÉSI KÉPERNYŐ — a meghívó lapja eltűnik, nem csak elrejtve marad (KUKA-012).
  await expect(c.page.getByTestId('login-email')).toBeVisible();
  await expect(c.page.getByTestId('section-invite')).toHaveCount(0);
  expect(await inviteInUrl(c.page), 'a jegy a CÍMSORBÓL is elment (KUKA-383)').toBe(false);

  // ÉS NINCS VISSZAIRÁNYÍTÁSI HUROK: a frissítés nem olvassa vissza a jegyet.
  await c.page.reload();
  await expect(c.page.getByTestId('login-email')).toBeVisible();
  await expect(c.page.getByTestId('section-invite')).toHaveCount(0);

  expect(db.count('SELECT COUNT(*) FROM membership'),
    'a VISSZALÉPÉS nem fogad el meghívást és nem módosít tagságot').toBe(elott);
  /**
   * A MÉRÉS A KONKRÉT MEGHÍVÓT NÉZI, NEM A TÁBLA ÖSSZEGÉT — SAJÁT LELET, A TELJES SOR MÉRTE KI.
   *
   * Az első alakom `SELECT COUNT(*) … WHERE redeemed_at IS NOT NULL` → `0`-t állított. Egyedül
   * futtatva ZÖLD volt; a TELJES próbasorban **35**-öt adott, mert a tároló MEGOSZTOTT, és a
   * korábbi lapok beváltott meghívókat hagytak benne. A rendszer helyes volt, a MÉRŐM nem
   * (KUKA-094 a mérőn · KUKA-120: a próba nem mérheti a saját előkészítésének versenyét).
   */
  const sor = db.get('SELECT redeemed_at FROM invite WHERE token = ?', token);
  expect(sor, 'a meghívó sora megtalálható a tárolóban').not.toBe(null);
  expect(sor.redeemed_at, 'és EZ a meghívó beváltatlan maradt — a visszalépés nem fogadja el és nem veszi el').toBe(null);
});

test('R166-M2 — BELÉPETT néző: visszalépés a SAJÁT FIÓKBA, a héj visszajön', async () => {
  // Béla belépve nyitja meg a SAJÁT meghívóját — innen a visszalépés a fiókjába visz.
  const o = await openInviteUI(bela.page, link);
  expect(o.observe.status).toBeTruthy();

  const row = await continueRow(bela.page);
  expect(row.backText, 'a megnevezés a BELÉPETT állapothoz igazodik').toContain(row.expectedBackLoggedIn);
  expect(row.logoutCount, 'belépve OTT van a kilépés-gomb — ez az út eddig nem létezett').toBe(1);
  await expect(bela.page.getByTestId('invite-logout')).toContainText(row.expectedLogout);

  await bela.page.getByTestId('invite-back').click();
  // A HÉJ JÖN VISSZA: alkalmazás-nézet, menü — nem a belépési űrlap.
  await expect(bela.page.getByTestId('app')).toBeVisible();
  await expect(bela.page.getByTestId('section-invite')).toHaveCount(0);
  await expect(bela.page.getByTestId('login-email')).toHaveCount(0);
  expect(await inviteInUrl(bela.page), 'a jegy a címsorból elment').toBe(false);
  const h = await header(bela.page);
  expect(h.subject, 'és a SAJÁT nézetében van').toContain(bela.email);

  // A frissítés sem viszi vissza a meghívó-képernyőre.
  await bela.page.reload();
  await expect(bela.page.getByTestId('app')).toBeVisible();
  await expect(bela.page.getByTestId('section-invite')).toHaveCount(0);
});

test('R166-M3 — A KILÉPÉS ÁGA: az előző ember meghívó-képernyőjéről kilépve MÁS EMBER lép be, és nem örökli az állapotot', async () => {
  // EZ A MÉRÉS VOLT EDDIG BEJÁRHATATLAN (R164 jelentés 8/7.): a képernyőn nem volt kilépés-vezérlő.
  const c = await world.context();
  await c.page.goto('/');                                 // a friss kontextus lapja még `about:blank`
  await loginUI(c.page, bela.email, PASSWORD);
  const o = await openInviteUI(c.page, link);
  expect(o.observe.status).toBeTruthy();
  await expect(c.page.getByTestId('invite-logout')).toBeVisible();
  expect(await inviteInUrl(c.page), 'a kilépés ELŐTT a jegy a címsorban áll — ez a KUKA-383 kiindulása').toBe(true);

  // A KILÉPÉS A KÖZÖS ÜRÍTŐN MEGY (ugyanaz a `logout` művelet, mint a profil-menüben).
  await withResponse(c.page, { path: '/api/logout' }, () => c.page.getByTestId('invite-logout').click());
  await expect(c.page.getByTestId('login-email')).toBeVisible();
  await expect(c.page.getByTestId('section-invite'),
    'a kilépés UTÁN nem a meghívó-képernyő marad kint').toHaveCount(0);
  expect(await inviteInUrl(c.page), 'és a jegy a CÍMSORBÓL is elment (KUKA-383 kilépés-ága)').toBe(false);

  // MÁS EMBER lép be UGYANEBBEN a böngészőben — ez a KUKA-362 kára.
  await loginUI(c.page, anna.email, PASSWORD);
  await expect(c.page.getByTestId('app'), 'a MÁSIK ember a HÉJBAN landol, nem az előző ember meghívó-lapján').toBeVisible();
  await expect(c.page.getByTestId('section-invite')).toHaveCount(0);
  const h = await header(c.page);
  expect(h.subject, 'a fejléc a MOSTANI emberé').toContain(anna.email);
  expect(h.subject, 'és NEM az előző emberé').not.toContain(bela.email);

  // ÉS A FRISSÍTÉS SEM ÉLESZTI ÚJRA: a jegy nincs honnan visszaolvasni.
  await c.page.reload();
  await expect(c.page.getByTestId('app')).toBeVisible();
  await expect(c.page.getByTestId('section-invite')).toHaveCount(0);
  expect((await header(c.page)).subject).toContain(anna.email);
});

test('R166-M4 — MINDEN meghívó-állapot kap folytatást: beváltott · visszavont · lejárt · ismeretlen · más személynek címzett', async () => {
  const allapotok = [];

  // (1) ISMERETLEN jegy — a lap nem tudhatja, melyik eset áll fenn (KUKA-084), de folytatást AD.
  {
    const c = await world.context();
    await openInviteUI(c.page, 'nincs-ilyen-jegy-r166');
    const row = await continueRow(c.page);
    expect(row.backText).toContain(row.expectedBackAnon);
    await c.page.getByTestId('invite-back').click();
    await expect(c.page.getByTestId('login-email')).toBeVisible();
    expect(await inviteInUrl(c.page)).toBe(false);
    allapotok.push('ismeretlen');
  }

  // (2) MÁS SZEMÉLYNEK címzett — Anna (a meghívó) nyitja meg Béla meghívóját, belépve.
  {
    const o = await openInviteUI(anna.page, link);
    expect(o.observe.status).toBeTruthy();
    const row = await continueRow(anna.page);
    expect(row.backText).toContain(row.expectedBackLoggedIn);
    expect(row.logoutCount, 'és itt a KILÉPÉS is ott van — a meghívás másik címre szólhat').toBe(1);
    await anna.page.getByTestId('invite-back').click();
    await expect(anna.page.getByTestId('app')).toBeVisible();
    expect(await inviteInUrl(anna.page)).toBe(false);
    allapotok.push('mas_szemelynek');
  }

  // (3) VISSZAVONT meghívó — Anna visszavonja, majd a címzett megnyitja a hivatkozást.
  {
    const vissza = await inviteUI(anna.page, { email: world.email('cili'), role: 'user', scope: 'keszlet' });
    expect(vissza.body.ok).toBe(true);
    await openInvitesTab(anna.page);
    const sor = anna.page.locator('tr[data-testid^="invite-row-"]').filter({ hasText: world.email('cili') }).first();
    await expect(sor).toBeVisible();
    const ref = (await sor.getAttribute('data-testid')).replace('invite-row-', '');
    await anna.page.getByTestId(`invite-revoke-${ref}`).click();
    await expect(anna.page.getByTestId('invite-revoke-confirm')).toBeVisible();
    const r = await withResponse(anna.page, { path: '/api/invites/revoke' }, () => anna.page.getByTestId('invite-revoke-confirm').click());
    expect(r.body.ok, 'a visszavonás megtörtént').toBe(true);

    const c = await world.context();
    const o = await openInviteUI(c.page, vissza.link);
    expect(o.observe.status, 'a visszavont meghívó nem beváltható').not.toBe('redeem_as_existing');
    const row = await continueRow(c.page);
    await c.page.getByTestId('invite-back').click();
    await expect(c.page.getByTestId('login-email')).toBeVisible();
    expect(await inviteInUrl(c.page)).toBe(false);
    expect(row.backText).toContain(row.expectedBackAnon);
    allapotok.push('visszavont');
  }

  // (4) LEJÁRT meghívó — a FEJLESZTŐI ÓRÁVAL, és utána visszaállítva (az R112-I4 útja).
  {
    const lejart = await inviteUI(anna.page, { email: world.email('dori'), role: 'user', scope: 'keszlet' });
    expect(lejart.body.ok).toBe(true);
    await anna.api.post('/dev/clock', { advance_ms: EIGHT_DAYS });
    try {
      const c = await world.context();
      const o = await openInviteUI(c.page, lejart.link);
      expect(o.observe.status, 'a lejárt meghívó nem beváltható').not.toBe('redeem_as_existing');
      const row = await continueRow(c.page);
      expect(row.backText).toContain(row.expectedBackAnon);
      await c.page.getByTestId('invite-back').click();
      await expect(c.page.getByTestId('login-email')).toBeVisible();
      expect(await inviteInUrl(c.page), 'a LEJÁRT meghívó sem okoz visszairányítási hurkot').toBe(false);
      await c.page.reload();
      await expect(c.page.getByTestId('login-email')).toBeVisible();
      await expect(c.page.getByTestId('section-invite')).toHaveCount(0);
    } finally {
      await anna.api.post('/dev/clock', { advance_ms: -EIGHT_DAYS });
    }
    expect((await anna.api.get('/dev/clock')).body.offset_ms, 'az óra VISSZAÁLLT').toBe(0);
    allapotok.push('lejart');
  }

  // (5) BEVÁLTOTT meghívó — Béla elfogadja, majd UGYANAZT a hivatkozást újra megnyitja.
  //     Ez volt a jelentés 8/7. tételében megnevezett ZSÁKUTCA: beváltott meghívó + nincs kiút.
  {
    const c = await world.context();
    await c.page.goto('/');
    await loginUI(c.page, bela.email, PASSWORD);
    await openInviteUI(c.page, link);
    const rr = await redeemUI(c.page);
    expect(rr.body.ok, 'a beváltás megtörtént').toBe(true);

    await openInviteUI(c.page, link);                     // UGYANAZ a hivatkozás, MÁSODSZOR
    const row = await continueRow(c.page);
    expect(row.backText).toContain(row.expectedBackLoggedIn);
    expect(row.logoutCount).toBe(1);
    await c.page.getByTestId('invite-back').click();
    await expect(c.page.getByTestId('app'), 'a BEVÁLTOTT meghívó lapja sem zsákutca többé').toBeVisible();
    expect(await inviteInUrl(c.page)).toBe(false);
    allapotok.push('bevaltott');
  }

  expect(allapotok.sort().join(','),
    'MIND az öt meghívó-állapot folytatást kapott').toBe('bevaltott,ismeretlen,lejart,mas_szemelynek,visszavont');
});

test('R166-M6 — a visszalépés a TÁROLT folytatást is elviszi: a belépés NEM visz vissza a meghívóra', async () => {
  /**
   * A KÜLSŐ REVIEW P2-JE (R166, Codex) — a SAJÁT funkcióm felett, és a kár a felhasználót érte.
   *
   * A LELET: az `observeInvite()` a névtelen látogató jegyét a MUNKAMENETHEZ kötve tárolja
   * (`POST /api/invites/pending`), a belépés pedig visszaolvassa (`pending_invite_token`). Az első
   * alakom csak a böngésző állapotát ürítette — tehát aki KIMONDOTTAN elhagyta a meghívót, a
   * belépés után VISSZAKERÜLT rá. A „vissza" nem vitt vissza.
   */
  const c = await world.context();
  const o = await openInviteUI(c.page, link);          // névtelenül: a jegy a munkamenethez TÁROLVA
  expect(o.observe.status).toBeTruthy();

  await c.page.getByTestId('invite-back').click();
  await expect(c.page.getByTestId('login-email')).toBeVisible();
  expect(await inviteInUrl(c.page), 'a jegy a címsorból elment').toBe(false);

  // ÉS MOST A BELÉPÉS — ITT BUKOTT A RÉGI ALAK: a tárolt folytatás visszavitte a meghívóra.
  const r = await loginUI(c.page, bela.email, PASSWORD);
  expect(r.body.ok, 'a belépés sikerült').toBe(true);
  expect(r.body.pending_invite_token ?? null,
    'a belépés válasza NEM hordoz folytatást — a tárolt sort a visszalépés elvitte').toBe(null);
  await expect(c.page.getByTestId('app'), 'a belépő a HÉJBAN landol, nem az elhagyott meghívón').toBeVisible();
  await expect(c.page.getByTestId('section-invite')).toHaveCount(0);

  // ELLENPÁR — A GARANCIA NEM VESZETT EL (KUKA-297): aki NEM lépett vissza, annak a folytatása MEGMARAD.
  const c2 = await world.context();
  await openInviteUI(c2.page, link);
  const r2 = await loginUI(c2.page, bela.email, PASSWORD);
  expect(r2.body.pending_invite_token, 'visszalépés NÉLKÜL a folytatás megmarad — a szűkítés nem vitt el mást').toBeTruthy();
  await expect(c2.page.getByTestId('section-invite'), 'és a meghívó lapja jön vissza').toBeVisible();
});

for (const code of ENABLED) {
  test(`R166-M5/${code} — a folytatás feliratai a KÖZÖS nyelvi forrásból jönnek (${code})`, async () => {
    const D = dictFor(code);
    const c = await world.context();
    await c.page.goto(`/?invite=${encodeURIComponent(token)}`);
    const sel = c.page.getByTestId('lang-select-public');
    await expect(sel).toBeVisible();
    await sel.selectOption(code);
    await expect(c.page.locator('html')).toHaveAttribute('lang', code);

    // A FELIRAT AZ AKTÍV NYELV CSOMAGJÁBÓL — a próba nem a magyart hasonlítja (KUKA-237 · KUKA-210).
    await expect(c.page.getByTestId('invite-back')).toContainText(D.UI.inviteBackToStart);
    await expect(c.page.getByTestId('invite-leave-note')).toContainText(D.UI.inviteLeaveNote);
    // ÉS A SZÖVEG TÉNYLEG MÁS NYELVŰ, nem a magyar visszaesés (ahol a csomag külön szót ad).
    if (D.UI.inviteBackToStart !== HU.UI.inviteBackToStart) {
      await expect(c.page.getByTestId('invite-back')).not.toContainText(HU.UI.inviteBackToStart);
    }
    await c.page.getByTestId('invite-back').click();
    await expect(c.page.getByTestId('login-email')).toBeVisible();
    expect(await inviteInUrl(c.page)).toBe(false);
  });
}

test('R166-M6 — A VISSZALÉPÉS CSAK IGAZOLT VÁLASZ UTÁN ÜRÍT: 5xx mellett a néző a meghívó képernyőjén MARAD, nevezett mondattal és működő gombbal', async () => {
  /**
   * A KÜLSŐ REVIEW LELETE (chatgpt-codex, P2): a `doInviteLeave` eldobta az `api()` NEMLEGES
   * visszatérését, és a böngésző állapotát mindenképpen ürítette. Hálózati hiba vagy 5xx esetén
   * tehát a lap azt mondta, hogy a felhasználó elhagyta a meghívót, miközben a TÁROLT folytatás a
   * kiszolgálón maradt — és egy későbbi belépés visszavitte rá.
   *
   * EZ A PRÓBA ELVÁGJA a szerver válaszát (`route.fulfill` 500), és azt MÉRI, hogy a lap
   * NEM állít teljesítést: a meghívó-képernyő MARAD, a jegy a címsorban MARAD, a mondat NEVEZETT,
   * és a gomb újra megnyomható. Majd a route feloldása után a visszalépés TÉNYLEGESEN megtörténik.
   */
  const cili = await world.person('cili-m5');
  await cili.page.route('**/api/invites/pending/forget', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, reason: 'server_error' }) });
  });
  const o = await openInviteUI(cili.page, link);
  expect(o.observe.status, 'a meghívó képernyője felállt').toBeTruthy();

  await cili.page.getByTestId('invite-back').click();

  // A LAP NEM ÁLLÍT TELJESÍTÉST: a képernyő marad, és a mondat nevezett.
  await expect(cili.page.getByTestId('section-invite')).toBeVisible();
  await expect(cili.page.getByTestId('invite-not-kept')).toBeVisible();
  const mondat = ((await cili.page.getByTestId('invite-not-kept').textContent()) || '').trim();
  expect(mondat.length > 10, `a nemleges válasz NEVEZETT — mérve: „${mondat.slice(0, 80)}”`).toBe(true);
  expect(await inviteInUrl(cili.page), 'és a jegy a címsorban MARAD (nem ígérünk elhagyást)').toBe(true);
  // A GOMB ÚJRA MEGNYOMHATÓ — a kiút működik (`KUKA-201`).
  await expect(cili.page.getByTestId('invite-back')).toBeVisible();

  // ÉS A ROUTE FELOLDÁSA UTÁN A VISSZALÉPÉS TÉNYLEGESEN MEGTÖRTÉNIK (az ellenpár).
  await cili.page.unroute('**/api/invites/pending/forget');
  await cili.page.getByTestId('invite-back').click();
  // EZ A NÉZŐ BE VAN LÉPVE, tehát a saját héja jön vissza (ugyanaz az út, mint az `M2`-ben).
  await expect(cili.page.getByTestId('app')).toBeVisible();
  await expect(cili.page.getByTestId('section-invite')).toHaveCount(0);
  expect(await inviteInUrl(cili.page), 'a jegy mostantól elment a címsorból is').toBe(false);
});

test('R166-M7 — A KILÉPÉS CSAK IGAZOLT VÁLASZ UTÁN ÜRÍT: 5xx mellett a néző a meghívó képernyőjén MARAD, és a MEGHÍVÓ JEGYE sem megy el', async () => {
  /**
   * A KÜLSŐ REVIEW P2-JE (R176, chatgpt-codex) — a SAJÁT javításom SZOMSZÉDJÁN, és pontosan a
   * `KUKA-422` hiba-osztálya egy függvénnyel odébb (`KUKA-418`: a hatókört a hiba-osztály adja).
   *
   * A LELET: a `doLogout` eldobta az `api()` visszatérését. Az `api()` NEM dob kivételt — hálózati
   * hibára, 5xx-re és értelmezhetetlen válaszra is objektummal tér vissza —, tehát a függvény a
   * kimenet ISMERETE NÉLKÜL ürített: a közös ürítőn átment, ELVETTE a meghívó jegyét (memória ÉS
   * címsor), és kirajzolta a belépő lapot. Vagyis KIMONDTA, hogy kiléptünk, miközben a kiszolgáló
   * munkamenete élhet tovább — a meghívó képernyőjén pedig a jegy az EGYETLEN azonnali út vissza a
   * meghíváshoz, és azt egy MÚLÓ hiba visszafordíthatatlanul elvitte.
   *
   * EZ A PRÓBA ELVÁGJA a kijelentkezés válaszát (`route.fulfill` 500), és azt MÉRI, hogy a lap NEM
   * állít teljesítést: a meghívó-képernyő MARAD, a JEGY a címsorban MARAD, a mondat NEVEZETT, és a
   * gomb újra megnyomható. A route feloldása után a kilépés TÉNYLEGESEN megtörténik (az ellenpár) —
   * a szigorítás tehát nem vitt el működő utat (`KUKA-201`).
   */
  const dori = await world.person('dori-m7');
  await dori.page.route('**/api/logout', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, reason: 'server_error' }) });
  });
  const o = await openInviteUI(dori.page, link);
  expect(o.observe.status, 'a meghívó képernyője felállt a BELÉPETT néző alatt').toBeTruthy();
  await expect(dori.page.getByTestId('invite-logout')).toBeVisible();

  await dori.page.getByTestId('invite-logout').click();

  // A LAP NEM ÁLLÍT TELJESÍTÉST: a képernyő marad, a mondat nevezett, a JEGY megmarad.
  await expect(dori.page.getByTestId('section-invite')).toBeVisible();
  await expect(dori.page.getByTestId('signout-not-done')).toBeVisible();
  const mondat = ((await dori.page.getByTestId('signout-not-done').textContent()) || '').trim();
  expect(mondat, 'a mondat a NYELVCSOMAGBÓL jön, nem a próbából (KUKA-237)').toBe(HU.UI.signOutUncertain);
  expect(await inviteInUrl(dori.page), 'a meghívó JEGYE a címsorban MARAD — egy múló hiba nem veheti el').toBe(true);
  // ÉS A LAP NEM MONDJA, HOGY NINCS BELÉPVE: a belépő űrlap NEM jelenik meg.
  await expect(dori.page.getByTestId('login-email')).toHaveCount(0);
  await expect(dori.page.getByTestId('invite-logout'), 'a kiút működik: a gomb újra megnyomható').toBeVisible();

  // ELLENPÁR — A ROUTE FELOLDÁSA UTÁN A KILÉPÉS TÉNYLEGESEN MEGTÖRTÉNIK.
  await dori.page.unroute('**/api/logout');
  await dori.page.getByTestId('invite-logout').click();
  await expect(dori.page.getByTestId('login-email')).toBeVisible();
  await expect(dori.page.getByTestId('section-invite')).toHaveCount(0);
  expect(await inviteInUrl(dori.page), 'és MOST a jegy is elment a címsorból').toBe(false);
  // A MONDAT IS ELTŰNT: a sikeres kilépés a közös ürítőn át viszi el (KUKA-218).
  await expect(dori.page.getByTestId('signout-not-done')).toHaveCount(0);
});

/**
 * —— AMIÉRT ITT NINCS `R166-M8` (R176, külső review P2 · `KUKA-439`) ——
 *
 * A LELET ÉLŐ TANÚJA NEM EBBEN A LAPBAN ÁLL, és ezt kimondom. A hiba feltétele az, hogy a
 * `POST /api/invites/pending/forget` ÚGY érkezzen, hogy a munkamenete a KISZOLGÁLÁS KÖZBEN szűnik
 * meg (a belépés rotálja az azonosítót, és a függő szándékot átviszi a friss sorra).
 *
 * MEGÍRTAM EGY BÖNGÉSZŐS PRÓBÁT, és a MÉRÉS megmutatta, hogy NEM állítja elő a feltételt: egy
 * elmentett, majd visszatett „régi" süti mellett a kiszolgáló nem „eltűnt munkamenetet" lát, hanem
 * ÚJ, érvényes névtelen munkamenetet nyit — tehát a `sessions.has(…)` IGAZ, és a lelet ága el sem
 * érődik. A próbát ezért NEM hagytam itt álló „zöld" próbának: egy olyan állítás, ami nem azt méri,
 * amit a neve mond, rosszabb a semminél (`KUKA-207` · `KUKA-239`).
 *
 * AZ ÉLŐ TANÚ: `npm run verify:app-findings-r154` → `(as29)` és `(as30)`. Ott a versenyt VALÓDI
 * HTTP-szinten állítjuk elő (lassú, darabolt törzs + közbeni belépés UGYANAZZAL a sütivel), és a
 * mérés kimondja mind a kettőt: a válasz **409 `session_gone`**, és a szándék sora VÁLTOZATLANUL
 * MEGVAN (tehát a korábbi `ok: true` hamis állítás volt). A LAP oldalát az `R166-M6` méri: nemleges
 * válasznál a meghívó-képernyő marad, a mondat nevezett, és a jegy a címsorban marad.
 */

test('R166-M9 — A NEM IGAZOLT KILÉPÉS MONDATA A HÉJBAN IS MEGJELENIK (nem csak a meghívó képernyőjén)', async () => {
  /**
   * A KÜLSŐ REVIEW P2-JE (R176, chatgpt-codex) — a SAJÁT `KUKA-434`-es javításom RAJZOLÓ felén.
   *
   * A LELET: a héj értesítő-sorát így fűztem össze:
   *     const noticeHtml = `…</p>`;
   *       + signOutNotDoneHtml();
   * A sablon-szöveg PONTOSVESSZŐVEL zárult, tehát a második sor egy ÖNÁLLÓ, előjeles
   * kifejezés-utasítás lett — a generált jelölő ELDOBÓDOTT. Aki a héjban (fejléc vagy Belépés és
   * biztonság) lépett ki, és a kérés hibára futott, SEMMIT nem látott: a lap belépve maradt, mondat
   * nélkül. A meghívó-képernyő ága működött, és az `R166-M7` ÉPPEN azt mérte — ezért maradt rejtve.
   *
   * ÉS A SAJÁT PINEM IS ÁTENGEDTE: az `(as24)` a hívások SZÁMÁT mérte (3 hívás, 1 jelölő-hely), ami
   * HALOTT kód mellett is igaz. Egy számoló minta nem tudja megkülönböztetni az élő kódot a
   * holttól (`KUKA-239` · `KUKA-207`) — ezért ez a próba a VISELKEDÉST méri: a mondat MEGJELENIK-e.
   */
  const emi = await world.person('emi-m9');
  await createWorkspaceUI(emi.page, { name: 'R166 Hej Kilepes Kft', business: { jurisdiction: 'HU', tax_id: '72345671-2-42' } });
  await gotoPage(emi.page, 'overview');
  await expect(emi.page.getByTestId('app'), 'a néző a HÉJBAN áll, nem a meghívó képernyőjén').toBeVisible();
  await expect(emi.page.getByTestId('section-invite')).toHaveCount(0);

  await emi.page.route('**/api/logout', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, reason: 'server_error' }) });
  });
  await openProfile(emi.page);
  await emi.page.getByTestId('logout').click();

  // A MONDAT A HÉJBAN IS MEGJELENIK, és a NYELVCSOMAGBÓL jön (KUKA-237).
  await expect(emi.page.getByTestId('signout-not-done')).toBeVisible();
  expect(((await emi.page.getByTestId('signout-not-done').textContent()) || '').trim())
    .toBe(HU.UI.signOutUncertain);
  // ÉS A LAP NEM ÁLLÍT KILÉPÉST: a héj marad, a belépő űrlap nem jelenik meg.
  await expect(emi.page.getByTestId('app')).toBeVisible();
  await expect(emi.page.getByTestId('login-email')).toHaveCount(0);

  // ELLENPÁR: a route feloldása után a kilépés TÉNYLEGESEN megtörténik, és a mondat eltűnik.
  await emi.page.unroute('**/api/logout');
  await logoutUI(emi.page);
  await expect(emi.page.getByTestId('login-email')).toBeVisible();
  await expect(emi.page.getByTestId('signout-not-done')).toHaveCount(0);
});
