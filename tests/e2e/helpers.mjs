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

export async function registerUI(page, email, password = PASSWORD) {
  await page.goto('/');
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill(password);
  const r = await withResponse(page, { path: '/api/register' }, () => page.getByTestId('register-submit').click());
  await expect(page.getByTestId('register-result')).toContainText('megerősítő levelet');
  return { ...r, resultText: await page.getByTestId('register-result').textContent() };
}

/** A levél-fogadó LISTÁJÁBÓL kattint a megerősítő hivatkozásra — a felhasználó útja, nem a végponté. */
export async function verifyFromMailboxUI(page, email) {
  await page.getByTestId('mailbox-refresh').click();
  const li = page.locator('li[data-testid^="mail-"]').filter({ hasText: email }).filter({ hasText: 'Erősítsd meg' }).first();
  await expect(li).toBeVisible();
  const link = li.locator('a[data-testid^="mail-link-"]');
  const href = await link.getAttribute('href');
  await link.click();
  await expect(page.getByTestId('verify-result')).toHaveAttribute('data-ok', 'true');
  const resultText = await page.getByTestId('verify-result').textContent();
  await page.getByTestId('verify-back').click();
  await expect(page.getByTestId('mailbox')).toBeVisible();
  return { href, resultText };
}

export async function loginUI(page, email, password = PASSWORD) {
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  const r = await withResponse(page, { path: '/api/login' }, () => page.getByTestId('login-submit').click());
  if (r.body && r.body.ok) {
    await expect(page.getByTestId('login-result')).toHaveText('Belépve.');
    await expect(page.getByTestId('header-subject')).toContainText(email);
  }
  return { ...r, resultText: await page.getByTestId('login-result').textContent() };
}

export async function logoutUI(page) {
  await withResponse(page, { path: '/api/logout' }, () => page.getByTestId('logout').click());
  await expect(page.getByTestId('header-subject')).toHaveText('nincs bejelentkezve');
}

export async function header(page) {
  return {
    subject: (await page.getByTestId('header-subject').textContent()) || '',
    workspace: (await page.getByTestId('header-workspace').textContent()) || '',
  };
}

export async function createWorkspaceUI(page, { name, plan = 'starter', business = null }) {
  await page.getByTestId('ws-name').fill(name);
  await page.getByTestId('ws-plan').selectOption(plan);
  const box = page.getByTestId('ws-business');
  if (business) {
    if (!(await box.isChecked())) await box.check();
    await page.getByTestId('ws-jurisdiction').selectOption(business.jurisdiction);
    await page.getByTestId('ws-tax-id').fill(business.tax_id);
  } else if (await box.isChecked()) {
    await box.uncheck();
  }
  const r = await withResponse(page, { path: '/api/workspaces' }, () => page.getByTestId('ws-create').click());
  const resultText = await page.getByTestId('ws-create-result').textContent();
  if (r.body && r.body.ok) await expect(page.getByTestId('header-workspace')).toContainText(name);
  return { ...r, resultText, bookId: r.body && r.body.book_id };
}

export async function switchUI(page, bookId) {
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
  await page.getByTestId('plan-select').selectOption(plan);
  const r = await withResponse(page, { path: '/api/workspaces/plan' }, () => page.getByTestId('plan-submit').click());
  return { ...r, resultText: await page.getByTestId('plan-result').textContent() };
}

export async function inviteUI(page, { email, role = 'user', scope = 'keszlet' }) {
  await page.getByTestId('invite-email').fill(email);
  await page.getByTestId('invite-role').selectOption(role);
  await page.getByTestId('invite-scope').selectOption(scope);
  const r = await withResponse(page, { path: '/api/invites' }, () => page.getByTestId('invite-submit').click());
  const resultText = await page.getByTestId('invite-result').textContent();
  let link = null;
  if (r.body && r.body.ok) {
    await page.getByTestId('mailbox-refresh').click();
    const li = page.locator('li[data-testid^="mail-"]').filter({ hasText: email }).filter({ hasText: 'Meghívás' }).first();
    await expect(li).toBeVisible();
    link = await li.locator('a[data-testid^="mail-link-"]').getAttribute('href');
  }
  return { ...r, resultText, token: r.body && r.body.token, link };
}

/** A meghívó hivatkozás megnyitása — a lap a megfigyelés válaszát és a KÖVETKEZŐ lépést írja ki. */
export async function openInviteUI(page, tokenOrLink) {
  const url = tokenOrLink.startsWith('http') ? tokenOrLink : `/?invite=${tokenOrLink}`;
  await page.goto(url);
  const pre = page.getByTestId('invite-observe');
  await expect(pre).toContainText('"status"');
  const observe = JSON.parse((await pre.textContent()) || '{}');
  return {
    observe,
    next: (await page.getByTestId('invite-next').textContent()) || '',
    redeemVisible: await page.getByTestId('invite-redeem').isVisible(),
  };
}

export async function redeemUI(page) {
  const r = await withResponse(page, { path: '/api/invites/redeem' }, () => page.getByTestId('invite-redeem').click());
  // SIKERES beváltás után a lap az EGÉSZ meghívó-szakaszt elrejti (a munka kész) — a válasz szövege
  // attól még ott áll; a láthatóság ezért nem mérce, a szöveg megléte az.
  const out = page.getByTestId('invite-redeem-result');
  await expect(out).toContainText('"ok"');
  return { ...r, resultText: await out.textContent(), notice: await page.getByTestId('global-notice').textContent() };
}

export async function stockUI(page) {
  const r = await withResponse(page, { path: '/api/data/stock', method: 'GET' }, () => page.getByTestId('data-stock-btn').click());
  const pre = page.getByTestId('data-stock');
  await expect(pre).not.toHaveText('…');
  return { ...r, text: (await pre.textContent()) || '' };
}

export async function priceUI(page) {
  const r = await withResponse(page, { path: '/api/data/price', method: 'GET' }, () => page.getByTestId('data-price-btn').click());
  const pre = page.getByTestId('data-price');
  await expect(pre).not.toHaveText('…');
  return { ...r, text: (await pre.textContent()) || '' };
}

/**
 * A TAG-LISTA PILLANATKÉP: az admin lapja a saját utolsó rajzolása óta nem tud a MÁSIK böngészőben
 * beváltott tagságról (a lap nem kap értesítést). A felhasználó ilyenkor újratölti a lapot — a helper
 * ugyanezt teszi, és CSAK akkor, ha a sor tényleg hiányzik (a core-folyam útját nem változtatja).
 */
export async function ensureMemberRow(page, subjectId) {
  if (await page.getByTestId(`member-${subjectId}`).count() === 0) {
    await page.reload();
    await expect(page.getByTestId('header-subject')).not.toHaveText('nincs bejelentkezve');
  }
  await expect(page.getByTestId(`member-${subjectId}`)).toBeVisible();
}

export async function grantScopeUI(page, subjectId, scope) {
  await ensureMemberRow(page, subjectId);
  await expect(page.getByTestId(`member-scope-select-${subjectId}`)).toBeVisible();
  await page.getByTestId(`member-scope-select-${subjectId}`).selectOption(scope);
  const r = await withResponse(page, { path: '/api/members/scope' }, () => page.getByTestId(`member-scope-${subjectId}`).click());
  await expect(page.getByTestId('members-result')).not.toHaveText('');
  return { ...r, resultText: await page.getByTestId('members-result').textContent() };
}

export async function revokeUI(page, subjectId) {
  await ensureMemberRow(page, subjectId);
  await expect(page.getByTestId(`member-revoke-${subjectId}`)).toBeVisible();
  const r = await withResponse(page, { path: '/api/members/revoke' }, () => page.getByTestId(`member-revoke-${subjectId}`).click());
  await expect(page.getByTestId('members-result')).not.toHaveText('');
  return { ...r, resultText: await page.getByTestId('members-result').textContent() };
}

export async function memberRowText(page, subjectId) {
  const li = page.getByTestId(`member-${subjectId}`);
  await expect(li).toBeVisible();
  return (await li.textContent()) || '';
}

/** A munkakörnyezet-választó listájának TÉTELEI (book_id-k), ahogy a lap mutatja. */
export async function workspaceListUI(page) {
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
