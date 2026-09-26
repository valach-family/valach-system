// tests/e2e/v3app-r97.spec.mjs — A SZEMÉLY VÁLASZTOTT NYELVE A BÖNGÉSZŐBEN (F95-01, R97).
//
// A LELET (chatgpt-v3, R95 §F95-01): az angolra/németre állított felület az ELSŐ belépést és a
// frissítést túlélte, de KIJELENTKEZÉS + ÚJBÓLI BELÉPÉS után magyarra váltott. A gyökér a
// `setLang` visszatérésén olvasott, NEM LÉTEZŐ `code` mező volt — a személyhez mentés soha nem futott.
//
// MIÉRT NEM FOGTA MEG AZ R93-04. Az a helyzet CSAK az első belépést mérte. A tudatos választás kulcsa
// (`vs3.lang.choice`) addig élt, ezért a HIÁNYZÓ személyes kulcs nem derült ki — a tartalék-ág elfedte
// (KUKA-238). Innentől a próba a TELJES utat járja, és a MECHANIZMUST is megnézi: a személyhez kötött
// tárolási kulcs TÉNYLEGESEN megszületik-e (a tünet mellett a gépezet — KUKA-049).
//
//   R97-01  MINDEN bekapcsolt nyelven: választás → első belépés → frissítés → KIJELENTKEZÉS →
//           ÚJBÓLI BELÉPÉS. Az alanyok a JEGYZÉKBŐL jönnek (`enabledLanguages`), nem kézi listából
//           (KUKA-051), és a böngésző nyelve SZÁNDÉKOSAN MÁS, mint a választott — különben a
//           böngésző alapértelmezése „eltalálná" a helyes eredményt, és a próba magát igazolná.
//   R97-02  KÉT KÜLÖNBÖZŐ EMBER egymás után, EGY böngészőben: a másik ember nem örökli, a sajátját
//           megkapja, és az elsőé sem tűnik el (a másik ember nem írja felül).
import { test, expect } from '@playwright/test';
import { logoutUI, openMailbox, withResponse, openProfile } from './helpers.mjs';
import { enabledLanguages, BASE_LANGUAGE } from '../../v3app/public/i18n/languages.mjs';
import { LANG_STORE_PREFIX, LANG_CHOICE_KEY, langStoreKey } from '../../v3app/public/i18n/langMemory.mjs';

const PASSWORD = 'proba-jelszo-2026';
const ENABLED = enabledLanguages().map((l) => l.code);
// A BÖNGÉSZŐ NYELVE MINDIG MÁS, mint amit a felhasználó választ — a jegyzékből, nem kézzel.
const otherThan = (code) => ENABLED.find((c) => c !== code) || BASE_LANGUAGE;
const localeOf = (code) => ({ hu: 'hu-HU', en: 'en-US', de: 'de-DE' }[code] || `${code}-${code.toUpperCase()}`);

/** A felület nyelvétől FÜGGETLEN regisztráció/megerősítés/belépés — testid-eken, nem szövegen. */
async function registerAnyLang(page, email) {
  await page.locator('[data-auth="register"]').first().click();
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill(PASSWORD);
  await page.getByTestId('register-submit').click();
  await expect(page.getByTestId('register-result')).not.toHaveText('');
}
async function verifyAnyLang(page, email) {
  await openMailbox(page);
  const li = page.locator('li[data-testid^="mail-"]').filter({ hasText: email }).last();
  await expect(li).toBeVisible();
  await li.locator('a[data-testid^="mail-link-"]').click();
  await expect(page.getByTestId('verify-result')).toHaveAttribute('data-ok', 'true');
  await page.getByTestId('verify-back').click();
  await expect(page.getByTestId('login-email')).toBeVisible();
}
async function loginAnyLang(page, email) {
  if (await page.getByTestId('login-email').count() === 0) await page.locator('[data-auth="login"]').first().click();
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(PASSWORD);
  const r = await withResponse(page, { path: '/api/login' }, () => page.getByTestId('login-submit').click());
  await expect(page.getByTestId('header-subject')).toContainText(email);
  return (r.body && r.body.subject_id) || null;
}

/** A BELÉPETT ember nyelv-választója a PROFIL lapján nyílik — a profil-menün át. */
async function gotoProfileLang(page) {
  await openProfile(page);
  await page.getByTestId('profile-menu').getByRole('button').first().click();
  await expect(page.getByTestId('lang-select')).toBeVisible();
}

/** A TÁROLÓ ÁLLAPOTA — a MECHANIZMUS tanúja: melyik kulcson mi áll (üzleti adat nincs benne). */
const langStore = (page) => page.evaluate(([prefix, choiceKey]) => {
  const out = {};
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const k = window.localStorage.key(i);
    if (k === choiceKey || (k && k.startsWith(prefix))) out[k] = window.localStorage.getItem(k);
  }
  return out;
}, [LANG_STORE_PREFIX, LANG_CHOICE_KEY]);

test('R97-01 — MINDEN bekapcsolt nyelv túléli a KIJELENTKEZÉST és az ÚJBÓLI BELÉPÉST', async ({ browser }) => {
  // A PADLÓ: ha a jegyzék néma zsugorodás miatt egy nyelvre esne, a próba ezt KIMONDJA (KUKA-045).
  expect(ENABLED.length, 'a bekapcsolt nyelvek száma (a jegyzékből)').toBeGreaterThanOrEqual(3);
  for (const code of ENABLED) {
    const browserLang = otherThan(code);
    const ctx = await browser.newContext({ baseURL: process.env.VS_E2E_BASE_URL, locale: localeOf(browserLang) });
    const page = await ctx.newPage();
    const email = `r9701.${code}.${Date.now().toString(36)}@pelda.hu`;
    try {
      await page.goto('/');
      // ── A FELHASZNÁLÓ TUDATOSAN VÁLASZT, MÉG BELÉPÉS ELŐTT (a böngészője MÁST kér).
      await page.getByTestId('lang-select-public').selectOption(code);
      await expect(page.locator('html')).toHaveAttribute('lang', code);
      await registerAnyLang(page, email);
      await verifyAnyLang(page, email);
      const subject = await loginAnyLang(page, email);
      // ── (1) ELSŐ BELÉPÉS — az R93-04 garanciája, MEGŐRIZVE.
      await expect(page.locator('html'), `${code}: az úton választott nyelv túléli az ELSŐ belépést`).toHaveAttribute('lang', code);
      // ── (2) A MECHANIZMUS: a SZEMÉLYHEZ kötött kulcs tényleg megszületett (ez hiányzott).
      const store = await langStore(page);
      expect(store[langStoreKey(subject)], `${code}: a személyes kulcs (${langStoreKey(subject)}) értéke`).toBe(code);
      // ── (3) FRISSÍTÉS.
      await page.reload();
      await expect(page.locator('html'), `${code}: a frissítés megtartja`).toHaveAttribute('lang', code);
      // ── (4) KIJELENTKEZÉS — az úthoz kötött választás ÜRÜL (a következő ember nem örökli).
      await logoutUI(page);
      const afterLogout = await langStore(page);
      expect(afterLogout[LANG_CHOICE_KEY], `${code}: a választás-kulcs kijelentkezéskor ürül`).toBeUndefined();
      // ── (5) ÚJBÓLI BELÉPÉS — ITT VÁLTOTT MAGYARRA A MÉRT HIBA.
      await loginAnyLang(page, email);
      await expect(page.locator('html'), `${code}: az ÚJBÓLI BELÉPÉS a SAJÁT választott nyelvét adja`).toHaveAttribute('lang', code);
      console.log(`[R97-01] ${code} (böngésző: ${localeOf(browserLang)}) → első belépés · frissítés · újbóli belépés MIND ${code}`);
    } finally { await ctx.close(); }
  }
});

test('R97-02 — KÉT EMBER egymás után EGY böngészőben: senki nem örökli és senki nem veszíti el', async ({ browser }) => {
  const nonBase = ENABLED.filter((c) => c !== BASE_LANGUAGE);
  expect(nonBase.length, 'legalább két nem-alapnyelv kell a két emberhez').toBeGreaterThanOrEqual(2);
  const [langA, langB] = nonBase;
  // A BÖNGÉSZŐ AZ ALAPNYELVET KÉRI — így mindkét ember választása MÉRHETŐEN különbözik attól.
  const ctx = await browser.newContext({ baseURL: process.env.VS_E2E_BASE_URL, locale: localeOf(BASE_LANGUAGE) });
  const page = await ctx.newPage();
  const stamp = Date.now().toString(36);
  const anna = `r9702.anna.${stamp}@pelda.hu`;
  const bela = `r9702.bela.${stamp}@pelda.hu`;
  try {
    // ── ANNA: tudatosan A nyelv, majd kilép.
    await page.goto('/');
    await page.getByTestId('lang-select-public').selectOption(langA);
    await registerAnyLang(page, anna);
    await verifyAnyLang(page, anna);
    const annaId = await loginAnyLang(page, anna);
    await expect(page.locator('html')).toHaveAttribute('lang', langA);
    await logoutUI(page);

    // ── BÉLA: ugyanaz a böngésző. NEM örökli Anna nyelvét — a SAJÁT böngésző-kérését kapja.
    await registerAnyLang(page, bela);
    await verifyAnyLang(page, bela);
    const belaId = await loginAnyLang(page, bela);
    await expect(page.locator('html'), 'Béla nem örökli Anna választását').toHaveAttribute('lang', BASE_LANGUAGE);
    // …és amikor Béla MAGA választ, az az ÖVÉ lesz. A BELÉPETT ember választója a PROFIL lapján áll
    // (a névtelené a belépő kártyán) — a felhasználó útján megyünk, nem a végponton (KUKA-011).
    await gotoProfileLang(page);
    await page.getByTestId('lang-select').selectOption(langB);
    await expect(page.locator('html')).toHaveAttribute('lang', langB);
    await logoutUI(page);

    // ── ANNA VISSZATÉR: a sajátját kapja — Béla választása nem írta felül.
    await loginAnyLang(page, anna);
    await expect(page.locator('html'), 'Anna visszatérése a SAJÁT nyelvét adja').toHaveAttribute('lang', langA);
    await logoutUI(page);

    // ── BÉLA VISSZATÉR: ő is a sajátját.
    await loginAnyLang(page, bela);
    await expect(page.locator('html'), 'Béla visszatérése a SAJÁT nyelvét adja').toHaveAttribute('lang', langB);

    // ── A TÁROLÓ KÉT KÜLÖN KULCSOT VISZ — a két ember nem EGY rekeszben él (a mechanizmus tanúja).
    const store = await langStore(page);
    expect(store[langStoreKey(annaId)], 'Anna kulcsa').toBe(langA);
    expect(store[langStoreKey(belaId)], 'Béla kulcsa').toBe(langB);
    console.log(`[R97-02] Anna(${langA}) · Béla(${langB}) · böngésző: ${localeOf(BASE_LANGUAGE)} — két kulcs, két igazság`);
  } finally { await ctx.close(); }
});
