// tests/e2e/helpers.mjs — A BÖNGÉSZŐ-PRÓBÁK KÖZÖS ESZKÖZEI (R64).
//
// HÁROM FAJTA BIZONYÍTÉK, HÁROM FORRÁS — és a helper mindet a saját nevén adja vissza:
//   · BÖNGÉSZŐ: amit a lap MUTATOTT és amit a felhasználó TEHETETT (szövegek, gombok, fejléc);
//   · SZERVER: a HTTP-válasz törzse — vagy a felület kattintása által kiváltott kérésé
//     (`withResponse`: a válasz ELFOGVA, nem újrakérve), vagy a böngésző sütijével küldött
//     közvetlen kérésé (`page.request`, ugyanaz a süti-tárca);
//   · ADATBÁZIS: a tárolt SOR, MÁSODIK kapcsolaton olvasva ugyanarról a fájlról (WAL). A próba
//     a mag ÍRÓIT SOHA nem hívja — ami a tárolóban áll, azt a felület vagy a végpont írta oda.
//
// A jelszavak és címek PÉLDA-adatok (@pelda.hu); valódi levél nem megy ki (a levél-fogadó memóriabeli).
import { expect } from '@playwright/test';
import { openStoreAt } from '../../v3ref/store.mjs';

export const PASSWORD = 'proba-jelszo-2026';
export const ANOTHER_PASSWORD = 'masik-jelszo-2026';

const baseURL = () => process.env.VS_E2E_BASE_URL;

// ── SZERVER: közvetlen kérés a böngésző sütijével ──────────────────────────────────────────────
export function apiOf(page) {
  const shape = async (res) => {
    let body = null;
    try { body = await res.json(); } catch { body = await res.text(); }
    return { status: res.status(), headers: res.headers(), body };
  };
  return {
    get: async (path) => shape(await page.request.get(path)),
    post: async (path, body = {}) => shape(await page.request.post(path, { data: body })),
  };
}

/**
 * Mint a `withResponse`, de MEGENGEDI, hogy a kérés el se induljon: a lap egy közben megváltozott
 * nézetben NEM kérdez (R77/F77-01). Ilyenkor `null`-t ad, és a hívó ezt NEVEZETTEN kezeli.
 */
export async function withOptionalResponse(page, { path, method = 'GET' }, action, timeoutMs = 8000) {
  const waiting = page.waitForResponse(
    (r) => r.request().method() === method && new URL(r.url()).pathname === path,
    { timeout: timeoutMs },
  ).catch(() => null);
  await action();
  const res = await waiting;
  if (!res) return null;
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status(), headers: res.headers(), body };
}

/** A FELÜLET KATTINTÁSA ÁLTAL KIVÁLTOTT VÁLASZ elfogva — a szerver-oldali bizonyíték a felület útjából. */
export async function withResponse(page, { path, method = 'POST' }, action) {
  const waiting = page.waitForResponse((r) => r.request().method() === method && new URL(r.url()).pathname === path);
  await action();
  const res = await waiting;
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status(), headers: res.headers(), body };
}

// ── ADATBÁZIS: második kapcsolat ugyanarra a fájlra ────────────────────────────────────────────
export class Db {
  constructor() { this.store = openStoreAt(process.env.VS_E2E_DB_PATH, { timeoutMs: 5000 }); }
  get(sql, ...p) { return this.store.get(sql, ...p) ?? null; }
  all(sql, ...p) { return this.store.all(sql, ...p); }
  count(sql, ...p) { const r = this.store.get(sql, ...p); return r ? Number(Object.values(r)[0]) : 0; }
  close() { try { this.store.close(); } catch { /* már zárva */ } }
}

// ── BÖNGÉSZŐ: kontextus / személy ──────────────────────────────────────────────────────────────
export class World {
  constructor(browser, tag) { this.browser = browser; this.tag = tag; this.contexts = []; }
  email(name) { return `${this.tag}.${name}@pelda.hu`; }
  async context() {
    const ctx = await this.browser.newContext({ baseURL: baseURL() });
    this.contexts.push(ctx);
    const page = await ctx.newPage();
    return { ctx, page, api: apiOf(page) };
  }
  /** Regisztráció → megerősítés a levél-fogadóból → belépés — MIND a felületen. */
  async person(name, { password = PASSWORD } = {}) {
    const email = this.email(name);
    const c = await this.context();
    await registerUI(c.page, email, password);
    await verifyFromMailboxUI(c.page, email);
    const login = await loginUI(c.page, email, password);
    return { ...c, name, email, password, subjectId: login.body.subject_id };
  }
  /** Ugyanaz az ember MÁSIK böngészőben (új süti-tárca, névtelen munkamenet). */
  async anonymous() { return this.context(); }
  async close() { for (const ctx of this.contexts.splice(0)) { await ctx.close().catch(() => {}); } }
}

// ── R81: HOVA KÖLTÖZTEK A DOLGOK ──────────────────────────────────────────────────────────────
// A számozott próbafelületet KÖZÖS ALKALMAZÁSKERET váltotta (R81 §3). A próbák ÚTJA ezért lett
// hosszabb — a MÉRÉSÜK nem változott. Amit a segédek mostantól kimondanak:
//   · a fiókválasztó és a profilmenü LENYÍLÓ (`<details>`): a bennük lévő gombhoz ELŐBB ki kell
//     nyitni a menüt — ezt a `openSwitcher` / `openProfile` teszi;
//   · a képernyők a BAL MENÜBŐL nyílnak (`nav-<oldal>`), nem egy hosszú lapon állnak egymás alatt;
//   · a tag jogosultságai és a meghívás JOBB OLDALI PANELEN kezelhetők (`member-open-…`,
//     `invite-open`), a megszüntetés pedig MEGERŐSÍTÉST kér (`revoke-confirm`);
//   · a levél-fogadó a „Próbaüzenetek" panelbe került (`demo-mail-open`);
//   · a terv a KÖZÖS űrlapról az Előfizetés oldalra került: a létrehozás UTÁN állítjuk be.
// A kötés-mezők (`expected_book_id` · `expected_subject_id`), a kapuk és a mért végpontok
// ugyanazok maradtak — a próbák állításai tehát ugyanazt mérik, csak más kattintás-úton (UX-15).

/** Lenyitja a fejléc fiókválasztóját (a benne lévő gomb csak nyitva kattintható). */
export async function openSwitcher(page) {
  // MÉRT LELET (saját, R81): a `<details>` NYITOTT állapotában az `open` ATTRIBÚTUM üres szöveg,
  // ami hamis értékű — a korábbi alak ezért a nyitott menüt CSUKTA BE, és a benne lévő gombra
  // „nem látható" hibával futott. A nyitottságot a DOM TULAJDONSÁGÁBÓL kell olvasni (KUKA-121).
  const d = page.getByTestId('account-switcher');
  if (!(await d.evaluate((el) => el.open))) await d.locator('summary').click();
  await expect(d).toHaveJSProperty('open', true);
}
/** Lenyitja a saját profil menüjét. */
export async function openProfile(page) {
  const d = page.getByTestId('profile');
  if (!(await d.evaluate((el) => el.open))) await d.locator('summary').click();
  await expect(d).toHaveJSProperty('open', true);
}
/** A bal menü egy pontjára lép, és megvárja, amíg a lap tényleg azt mutatja. */
export async function gotoPage(page, name) {
  // A NYITOTT LENYÍLÓ TAKARJA A MENÜT: előbb becsukjuk, ahogy a felhasználó is tenné (Esc vagy
  // kattintás a menün kívülre) — különben a próba egy takart gombra kattintana.
  for (const id of ['account-switcher', 'profile']) {
    const d = page.getByTestId(id);
    if (await d.count() && await d.evaluate((el) => el.open)) {
      await d.evaluate((el) => { el.open = false; });
    }
  }
  await page.getByTestId(`nav-${name}`).click();
  await expect(page.getByTestId(`nav-${name}`)).toHaveAttribute('aria-current', 'page');
}
/**
 * Megnyitja a Próbaüzenetek panelt (a bemutató levél-fogadója).
 * A panelek MODÁLISAK: ha épp nyitva van egy (például a meghívó panelje), a fejléc gombja nem
 * kattintható — ezért előbb bezárjuk. A felhasználónak ugyanez az útja: a panel „Mégse"/„×"
 * gombja vagy az Esc (UX-18).
 */
export async function openMailbox(page) {
  const panel = page.getByTestId('panel');
  if (await panel.evaluate((d) => d.open).catch(() => false)) {
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('panel-body')).not.toBeVisible();
  }
  await page.getByTestId('demo-mail-open').click();
  await expect(page.getByTestId('mailbox')).toBeVisible();
}

export async function registerUI(page, email, password = PASSWORD) {
  await page.goto('/');
  // A BELÉPÉSI OLDALAK KÜLÖN LAPOK (UX-01): a regisztráció a bejelentkezés lapjáról nyílik.
  await page.locator('[data-auth="register"]').first().click();
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill(password);
  const r = await withResponse(page, { path: '/api/register' }, () => page.getByTestId('register-submit').click());
  // R81 §5/01: a SEMLEGES válasz szövege a tervé — és a semlegesség maga is MÉRVE van: a válasz
  // nem árulhatja el, hogy a megadott címhez tartozik-e már fiók (K03 · KUKA-084).
  await expect(page.getByTestId('register-result')).toContainText('folytatható a regisztráció');
  expect((await page.getByTestId('register-result').textContent()) || '').not.toMatch(/már használ|foglalt|létezik/i);
  return { ...r, resultText: await page.getByTestId('register-result').textContent() };
}

/** A levél-fogadó LISTÁJÁBÓL kattint a megerősítő hivatkozásra — a felhasználó útja, nem a végponté. */
export async function verifyFromMailboxUI(page, email) {
  await openMailbox(page);
  const li = page.locator('li[data-testid^="mail-"]').filter({ hasText: email }).filter({ hasText: 'Erősítsd meg' }).first();
  await expect(li).toBeVisible();
  const link = li.locator('a[data-testid^="mail-link-"]');
  const href = await link.getAttribute('href');
  await link.click();
  await expect(page.getByTestId('verify-result')).toHaveAttribute('data-ok', 'true');
  const resultText = await page.getByTestId('verify-result').textContent();
  // A megerősítő lap ÖNÁLLÓ oldal: innen a „Tovább a bejelentkezéshez" visz vissza a belépésre.
  await page.getByTestId('verify-back').click();
  await expect(page.getByTestId('login-email')).toBeVisible();
  return { href, resultText };
}

export async function loginUI(page, email, password = PASSWORD) {
  // A LAP MAGA RAJZOL: egy frissen megnyitott cím után a belépési kártya nem azonnal áll ott.
  // Megvárjuk, amíg VAGY a bejelentkezés mezője, VAGY a rá vezető hivatkozás megjelenik — így a
  // segéd nem a saját türelmetlenségét méri (KUKA-121).
  await page.waitForSelector('[data-testid="login-email"], [data-auth="login"]');
  if (await page.getByTestId('login-email').count() === 0) {
    // Ha épp a regisztráció (vagy egy másik belépési lap) áll kint, visszalépünk a bejelentkezésre.
    await page.locator('[data-auth="login"]').first().click();
    await expect(page.getByTestId('login-email')).toBeVisible();
  }
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  const r = await withResponse(page, { path: '/api/login' }, () => page.getByTestId('login-submit').click());
  // SIKERES BELÉPÉS UTÁN A BELÉPÉSI ŰRLAP ELTŰNIK (UX-01) — ezért a sikert a FEJLÉC mondja ki,
  // nem egy „Belépve." feliratú üzenet az űrlap alatt.
  const resultText = r.body && r.body.ok
    ? (await expect(page.getByTestId('header-subject')).toContainText(email), `belépve: ${email}`)
    : ((await page.getByTestId('login-result').textContent()) || '');
  // A MEGHÍVÓ LAPJÁN a belépés a MEGHÍVÁSHOZ tér vissza (UX-09), nem a keretbe — a segéd tehát
  // csak akkor várja a keretet, ha nincs folyamatban lévő meghívás.
  if (r.body && r.body.ok) {
    // A belépés UTÁN vagy a keret jön elő, vagy — FÜGGŐ MEGHÍVÁS esetén — a meghívás kártyája.
    await page.waitForSelector('[data-testid="app"]:not([hidden]), [data-testid="section-invite"]');
  }
  return { ...r, resultText };
}

export async function logoutUI(page) {
  await openProfile(page);
  await withResponse(page, { path: '/api/logout' }, () => page.getByTestId('logout').click());
  /**
   * A KILÉPÉS MÉRÉSE NYELV-FÜGGETLEN (R91 saját lelet a PRÓBÁN, nem a terméken).
   *
   * A korábbi alak a MAGYAR mondatot hasonlította (`'nincs bejelentkezve'`), ezért a NÉMETRE állított
   * felületen a kilépés „nem történt meg"-nek látszott — a próba a saját beégetett szövegén bukott
   * el, nem a rendszeren (KUKA-210 a próbapadon: a felirat egy forrásból jön, és a mérés a
   * VISELKEDÉST mérje, ne a szöveget). Amit mérünk: van belépési űrlap, és a fejléc már NEM az
   * e-mail címet mutatja.
   */
  await expect(page.getByTestId('login-email')).toBeVisible();
  await expect(page.getByTestId('header-subject')).not.toContainText('@');
}

export async function header(page) {
  return {
    subject: (await page.getByTestId('header-subject').textContent()) || '',
    workspace: (await page.getByTestId('header-workspace').textContent()) || '',
  };
}

/**
 * VÁLLALKOZÁS HOZZÁADÁSA. A terv (`plan`) KIKERÜLT a létrehozó űrlapról: az új fiók az
 * alapcsomaggal születik, a csomagot utána az Előfizetés oldalon lehet állítani (R81 §3.5). A
 * segéd ezt az ÚJ utat járja végig, hogy a próbák állításai (mit ír a szerver, mi lesz a fejléc)
 * változatlanok maradhassanak.
 */
export async function createWorkspaceUI(page, { name, plan = 'starter', business = null }) {
  await openSwitcher(page);
  await page.getByTestId('ws-add').click();
  await expect(page.getByTestId('ws-name')).toBeVisible();
  await page.getByTestId('ws-name').fill(name);
  // A FIÓK FAJTÁJA VÁLASZTÁS (R83/F83-04): „Vállalkozás" vagy „Közös fiók" — a céges adatlap CSAK
  // az elsőnél látszik, ezért a segéd is a választással kezd, ahogy a felhasználó.
  if (business) {
    await page.getByTestId('ws-kind-business').check();
    await expect(page.getByTestId('ws-tax-id')).toBeVisible();
    const ismert = ['HU', 'AT', 'DE', 'SK', 'RO'];
    if (ismert.includes(business.jurisdiction)) {
      await page.getByTestId('ws-jurisdiction').selectOption(business.jurisdiction);
    } else {
      await page.getByTestId('ws-jurisdiction').selectOption('__egyeb__');
      await page.getByTestId('ws-jurisdiction-other').fill(business.jurisdiction);
    }
    await page.getByTestId('ws-tax-id').fill(business.tax_id);
  } else {
    await page.getByTestId('ws-kind-shared').check();
    await expect(page.getByTestId('ws-tax-id')).toBeHidden();
  }
  const r = await withResponse(page, { path: '/api/workspaces' }, () => page.getByTestId('ws-create').click());
  // SIKERNÉL A LAP TOVÁBBLÉP (az űrlap eltűnik), ezért a visszajelzést a KÖVETKEZMÉNY hordozza:
  // az áttekintés értesítő sora és a létrehozás-utáni kártya. KUDARCNÁL az űrlap kint marad, és a
  // hiba A MEZŐNÉL áll — a segéd ezért ágazik, nem egy eltűnő elemre vár (KUKA-121).
  let resultText = '';
  let taxError = '';
  if (r.body && r.body.ok) {
    await expect(page.getByTestId('header-workspace')).toContainText(name);
    await expect(page.getByTestId('global-notice')).toBeVisible();
    resultText = (await page.getByTestId('global-notice').textContent()) || '';
    if (plan !== 'starter') await setPlanUI(page, plan);
  } else {
    await expect(page.getByTestId('ws-create-result')).toBeVisible();
    resultText = (await page.getByTestId('ws-create-result').textContent()) || '';
    taxError = (await page.getByTestId('ws-tax-error').count())
      ? ((await page.getByTestId('ws-tax-error').textContent()) || '') : '';
  }
  return { ...r, resultText, taxError, bookId: r.body && r.body.book_id };
}

export async function switchUI(page, bookId) {
  await openSwitcher(page);
  // A VÁLTÁS UTÁN A LAP MÉG FRISSÍTI A FEJLÉCET (`/api/me`) — és a segéd ezt MEGVÁRJA. MÉRT LELET
  // (R77): a visszatartott `/me`-vel dolgozó versenypróbák véletlenszerűen ezt a HÁTTÉRBEN FUTÓ
  // frissítést fogták el a próba saját kérése helyett, ezért a csomag hol zöld, hol piros volt.
  // Egy próba nem versenyezhet a saját előkészítésével (KUKA-120: a kivágott próbapad a SAJÁT
  // versenyhelyzetét mérte).
  const meDone = page.waitForResponse((r) => r.request().method() === 'GET' && new URL(r.url()).pathname === '/api/me');
  const r = await withResponse(page, { path: '/api/session/workspace' }, () => page.getByTestId(`ws-switch-${bookId}`).click());
  await expect(page.getByTestId('global-notice')).toBeVisible();
  await meDone;
  return { ...r, notice: await page.getByTestId('global-notice').textContent() };
}

export async function setPlanUI(page, plan) {
  await gotoPage(page, 'plan');
  await page.getByTestId('plan-select').selectOption(plan);
  const r = await withResponse(page, { path: '/api/workspaces/plan' }, () => page.getByTestId('plan-submit').click());
  return { ...r, resultText: await page.getByTestId('plan-result').textContent() };
}

export async function inviteUI(page, { email, role = 'user', scope = 'keszlet' }) {
  await gotoPage(page, 'members');
  await page.getByTestId('invite-open').click();
  await expect(page.getByTestId('invite-email')).toBeVisible();
  await page.getByTestId('invite-email').fill(email);
  await page.getByTestId('invite-role').selectOption(role);
  await page.getByTestId('invite-scope').selectOption(scope);
  const r = await withResponse(page, { path: '/api/invites' }, () => page.getByTestId('invite-submit').click());
  const resultText = (await page.getByTestId('invite-result').textContent()) || '';
  let link = null;
  if (r.body && r.body.ok) {
    // A TERV SZERINTI KÖZVETLEN ÚT (R81 §8): a meghívó elkészülte után EGY gomb visz a levélhez.
    await page.getByTestId('invite-mail-open').click();
    await expect(page.getByTestId('mailbox')).toBeVisible();
    const li = page.locator('li[data-testid^="mail-"]').filter({ hasText: email }).filter({ hasText: 'Meghívás' }).first();
    await expect(li).toBeVisible();
    link = await li.locator('a[data-testid^="mail-link-"]').getAttribute('href');
    await page.locator('[data-action="panel-close"]').last().click();
    await expect(page.getByTestId('panel-body')).not.toBeVisible();
  }
  return { ...r, resultText, token: r.body && r.body.token, link };
}

/** A meghívó hivatkozás megnyitása — a lap a megfigyelés válaszát és a KÖVETKEZŐ lépést írja ki. */
export async function openInviteUI(page, tokenOrLink) {
  const url = tokenOrLink.startsWith('http') ? tokenOrLink : `/?invite=${tokenOrLink}`;
  await page.goto(url);
  // A LAP EMBERI MONDATOT MUTAT (R81 §6): a gépi válasz a „Technikai részletek" alatt marad meg —
  // a próba ezért ONNAN olvassa a JSON-t, a felhasználónak szánt mondatot pedig külön méri.
  const human = page.getByTestId('invite-observe');
  await expect(human).not.toHaveText('');
  const observe = JSON.parse((await page.getByTestId('invite-observe-json').textContent()) || '{}');
  return {
    observe,
    humanText: (await human.textContent()) || '',
    next: (await page.getByTestId('invite-next').textContent()) || '',
    redeemVisible: (await page.getByTestId('invite-redeem').count()) > 0
      && await page.getByTestId('invite-redeem').isVisible(),
  };
}

export async function redeemUI(page) {
  const r = await withResponse(page, { path: '/api/invites/redeem' }, () => page.getByTestId('invite-redeem').click());
  // SIKERES beváltás után a lap ÁTVISZ a fiókba (a munka kész), és a KÖVETKEZMÉNYT mondja ki:
  // csatlakoztál, az adatok megtekintését viszont a fiókkezelő külön engedélyezi (R81 §5/12).
  // KUDARCNÁL a meghívó lapja marad kint, a nevezett okkal.
  if (r.body && r.body.ok) {
    await expect(page.getByTestId('app')).toBeVisible();
    await expect(page.getByTestId('global-notice')).toBeVisible();
    return { ...r, resultText: (await page.getByTestId('global-notice').textContent()) || '',
      notice: (await page.getByTestId('global-notice').textContent()) || '' };
  }
  const out = page.getByTestId('invite-redeem-result');
  await expect(out).not.toHaveText('');
  return { ...r, resultText: (await out.textContent()) || '', notice: '' };
}

/**
 * A Készletegyenleg oldal megnyitása — a készlet és az ár EGY képernyőn él (R81 §3.4).
 * A lap a nézet ELSŐ megnyitásakor magától egyszer lekérdez; a segéd ezt MEGVÁRJA, hogy a próba
 * saját kérése ne versenyezzen a nézet saját betöltésével (KUKA-120: a próba nem mérheti a saját
 * előkészítésének versenyét).
 */
export async function openStockPage(page) {
  if (await page.getByTestId('data-stock-btn').count() === 0) {
    if (await page.getByTestId('nav-stock').count() === 0) {
      throw new Error('a Készletegyenleg képernyő nem elérhető: nincs megnyitott fiók ezen a lapon');
    }
    await gotoPage(page, 'stock');
  }
  await expect(page.getByTestId('data-stock-btn')).toBeVisible();
  // A NÉZET MEGNYITÁSA ELINDÍTJA AZ ELSŐ LEKÉRÉST — megvárjuk, de NEM követeljük meg: egyes
  // próbák szándékosan VISSZATARTJÁK ezt a választ, és ott a beragadás maga a mérés tárgya.
  await expect(page.getByTestId('data-stock')).not.toHaveText('Betöltés…', { timeout: 3000 }).catch(() => {});
  await expect(page.getByTestId('data-price')).not.toHaveText('Betöltés…', { timeout: 3000 }).catch(() => {});
}

/**
 * A KIADÁS TÉNYE SZERKEZETI JEL, NEM FELIRAT (R81 · KUKA-207). A régi felületen a próba a
 * „KIADVA" szóra mért — egy szövegjavítás ezt némán elmozdította volna. Mostantól:
 *   · `granted` = megjelent-e a kiadott adat (készlet-tábla / ár-érték),
 *   · `gate`    = MELYIK kapu zárt (a szerver `refused_by` mezője, a lapra kiírva),
 *   · `text`    = amit a felhasználó ténylegesen lát (a mondatokra továbbra is lehet mérni).
 */
export async function stockUI(page) {
  await openStockPage(page);
  const r = await withOptionalResponse(page, { path: '/api/data/stock' }, () => page.getByTestId('data-stock-btn').click())
    ?? { status: null, headers: {}, body: null };
  const box = page.getByTestId('data-stock');
  if (r.status === null || await box.count() === 0) return { ...r, ...(await viewGone(page)) };
  await expect(box).not.toHaveText('Betöltés…');
  const denied = page.getByTestId('stock-denied');
  return {
    ...r,
    text: (await box.textContent()) || '',
    granted: (await page.getByTestId('stock-table').count()) > 0,
    gate: (await denied.count()) ? await denied.getAttribute('data-gate') : null,
    viewGone: false,
  };
}

/** A nézet megszűnt a válasz közben (a szerver szerint már nincs hozzáférés) — ez MÉRT eredmény. */
async function viewGone(page) {
  const n = page.getByTestId('global-notice');
  return {
    text: (await n.count()) ? ((await n.textContent()) || '') : '',
    granted: false, gate: null, viewGone: true,
  };
}

export async function priceUI(page) {
  await openStockPage(page);
  const r = await withOptionalResponse(page, { path: '/api/data/price' }, () => page.getByTestId('data-price-btn').click())
    ?? { status: null, headers: {}, body: null };
  const box = page.getByTestId('data-price');
  if (r.status === null || await box.count() === 0) return { ...r, ...(await viewGone(page)) };
  await expect(box).not.toHaveText('Betöltés…');
  const denied = page.getByTestId('price-denied');
  return {
    ...r,
    text: (await box.textContent()) || '',
    granted: (await page.getByTestId('price-value').count()) > 0,
    gate: (await denied.count()) ? await denied.getAttribute('data-gate') : null,
    viewGone: false,
  };
}

/**
 * A TAG-LISTA PILLANATKÉP: az admin lapja a saját utolsó rajzolása óta nem tud a MÁSIK böngészőben
 * beváltott tagságról (a lap nem kap értesítést). A felhasználó ilyenkor újratölti a lapot — a helper
 * ugyanezt teszi, és CSAK akkor, ha a sor tényleg hiányzik (a core-folyam útját nem változtatja).
 */
export async function ensureMemberRow(page, subjectId) {
  if (await page.getByTestId('nav-members').count() > 0
    && await page.getByTestId('members-list').count() === 0) await gotoPage(page, 'members');
  if (await page.getByTestId(`member-${subjectId}`).count() === 0) {
    await page.reload();
    // NYELV-FÜGGETLEN ÁLLÍTÁS (KUKA-237): a frissítés után a fejléc az e-mail címet mutatja — ez a
    // belépettség TÉNYE, nem egy magyar mondat.
    await expect(page.getByTestId('header-subject')).toContainText('@');
    await gotoPage(page, 'members');
  }
  await expect(page.getByTestId(`member-${subjectId}`)).toBeVisible();
}

/** A tag JOBB OLDALI PANELJE: itt áll a két adatkör állapota és a két művelet (R81 §3.6). */
export async function openMemberPanel(page, subjectId) {
  await ensureMemberRow(page, subjectId);
  await page.getByTestId(`member-open-${subjectId}`).click();
  await expect(page.getByTestId('panel-body')).toBeVisible();
}

export async function grantScopeUI(page, subjectId, scope) {
  await openMemberPanel(page, subjectId);
  await expect(page.getByTestId(`member-scope-select-${subjectId}`)).toBeVisible();
  await page.getByTestId(`member-scope-select-${subjectId}`).selectOption(scope);
  const r = await withResponse(page, { path: '/api/members/scope' }, () => page.getByTestId(`member-scope-${subjectId}`).click());
  await expect(page.getByTestId('members-result')).not.toHaveText('');
  return { ...r, resultText: await page.getByTestId('members-result').textContent() };
}

/**
 * A CÉGES HOZZÁFÉRÉS MEGSZÜNTETÉSE MEGERŐSÍTÉST KÉR (R81 §3.6). A megerősítés a FELHASZNÁLÓT
 * kérdezi meg — jogot NEM ad és nem választ kontextust: azt továbbra is a munkamenet és a
 * szerver kapuja dönti el (KTX-01/03, R79/F79-02 — a megerősítő mező csak SZŰKÍT).
 */
export async function revokeUI(page, subjectId) {
  await openMemberPanel(page, subjectId);
  await expect(page.getByTestId(`member-revoke-${subjectId}`)).toBeVisible();
  await page.getByTestId(`member-revoke-${subjectId}`).click();
  await expect(page.getByTestId('revoke-confirm')).toBeVisible();
  const r = await withResponse(page, { path: '/api/members/revoke' }, () => page.getByTestId('revoke-confirm').click());
  await expect(page.getByTestId('members-result')).not.toHaveText('');
  return { ...r, resultText: await page.getByTestId('members-result').textContent() };
}

export async function memberRowText(page, subjectId) {
  await ensureMemberRow(page, subjectId);
  return (await page.getByTestId(`member-${subjectId}`).textContent()) || '';
}

/** A munkakörnyezet-választó listájának TÉTELEI (book_id-k), ahogy a lap mutatja. */
export async function workspaceListUI(page) {
  await openSwitcher(page);
  const items = page.locator('li[data-testid^="ws-item-"]');
  const n = await items.count();
  const out = [];
  for (let i = 0; i < n; i++) out.push({ text: (await items.nth(i).textContent()) || '', testid: await items.nth(i).getAttribute('data-testid') });
  return out;
}

export async function sessionCookie(ctx) {
  const c = (await ctx.cookies()).find((x) => x.name === 'vs_session');
  return c ? c.value : null;
}

/** Rövidítés az idézéshez — a bizonyíték-sor ne hordozzon teljes tokent. */
export const short = (s) => (typeof s === 'string' && s.length > 12 ? `${s.slice(0, 8)}…` : String(s));
export const j = (o) => JSON.stringify(o);
