// tests/e2e/v3app-r119-fiok-nelkul.spec.mjs — A FIÓK NÉLKÜLI, MÉG MEG NEM ERŐSÍTETT EMBER ÚTJA (F118-01).
//
// A LELET, amit a külső ellenőrző fél (chatgpt-v3, R118) talált: a belépett, de a címét még meg nem
// erősítő ember a Saját profil helyett FIÓKVÁLASZTÁSI ZSÁKUTCÁT kapott. A `render()` a `!bookId()`
// ágon a `switch (state.page)` ELŐTT tért vissza, ezért a személyhez kötött oldalak (Saját profil ·
// Belépés és biztonság) soha nem rajzolódtak ki, és a bennük lévő „Új megerősítő levél kérése" gomb
// elérhetetlen maradt. A lap ilyenkor nem létező személyes fiók kiválasztására küldött.
//
// AMIT EZ A PRÓBA MÉR:
//   R119-01  a TELJES magyar út: regisztráció → belépés megerősítés NÉLKÜL → a fő tartalom mondata →
//            a Saját profil és a Biztonság TÉNYLEGES tartalma → levélkérés MINDHÁROM belépési ponton
//            (fő tartalom · profilmenü · profiloldal) → a levél a próbaüzenetekben → megerősítés →
//            friss állapotban SAJÁT személyes fiók. Közben a TÁROLÓBAN nem keletkezik idegen fiók,
//            tagság vagy adatkör-engedély.
//   R119-02  EN és DE: a fiók nélküli állapot mondata és a LÁTHATÓ művelet a választott nyelven.
//
// AMIT KIMONDOTTAN NEM JELENT: a `200/ok=true` szerverválasz NEM kézbesítés-bizonyíték (R118
// kikötése). Ezért a mérés a PRÓBAÜZENETEK panelen megjelenő levél, nem a válasz — és a mag
// újraküldési korlátja (`min_gap_ms`) MÉRVE van, nem megkerülve: közvetlenül a regisztráció után
// nem keletkezik új levél, a korlát letelte után igen.
import { test, expect } from '@playwright/test';
import { World, Db, registerUI, loginUI, logoutUI, openMailbox, openProfile, PASSWORD } from './helpers.mjs';
import { dictFor } from '../../v3app/public/i18n/dict.mjs';
import { CHALLENGE_POLICY } from '../../v3ref/account.mjs';

const HU = dictFor('hu');

/** A tároló SZÁMLÁLÓI — ezekhez mérjük, hogy a megerősítetlen út nem hoz létre semmit. */
const snapshot = (db) => ({
  book: db.count('SELECT COUNT(*) AS n FROM book'),
  membership: db.count('SELECT COUNT(*) AS n FROM membership'),
  grant: db.count('SELECT COUNT(*) AS n FROM scope_grant'),
});

/** A SZEMÉLYHEZ KÖTÖTT oldalak a PROFILMENÜBŐL nyílnak: a bal menü a FIÓK oldalait viszi. */
async function openPersonPage(page, which) {
  await openProfile(page);
  await page.getByTestId(`profile-menu-${which}`).click();
}

/**
 * A levél-fogadóban álló, EHHEZ a címhez szóló levelek száma. Az ÚJRAKÉRÉS levelének MÁS a tárgya
 * („Új megerősítő hivatkozás"), mint a regisztrációénak — ezért tárgyra nem szűrünk (KUKA-239
 * osztálya: a szűk minta a szomszéd sort igazolná).
 */
async function mailCount(page, email) {
  await openMailbox(page);
  const n = await page.locator('li[data-testid^="mail-"]').filter({ hasText: email }).count();
  await page.keyboard.press('Escape');
  return n;
}

/** Levélkérés a megnevezett gombbal — VALÓDI kattintás, valódi űrlap, valódi beküldés. */
async function askResend(page, testid, email) {
  await page.getByTestId(testid).click();
  await expect(page.getByTestId('resend-email')).toBeVisible();
  await page.getByTestId('resend-email').fill(email);
  await page.getByTestId('resend-submit').click();
  await expect(page.getByTestId('resend-result')).toContainText('megerősítésre váró belépés');
}

/**
 * Megerősítés a LEGUTÓBBI levélből. Kötelezően a legutóbbiból: minden újrakérés ÉRVÉNYTELENÍTI az
 * előzőt (`challenge_superseded`). A lista legfelül a legfrissebbet hozza.
 */
async function verifyNewest(page, email) {
  await openMailbox(page);
  const li = page.locator('li[data-testid^="mail-"]').filter({ hasText: email }).first();
  await expect(li).toBeVisible();
  await li.locator('a[data-testid^="mail-link-"]').click();
  await expect(page.getByTestId('verify-result')).toHaveAttribute('data-ok', 'true');
  // A „Tovább a bejelentkezéshez" gomb a MEGNYITOTT munkamenetbe visz vissza — ez az ember itt már
  // BE VAN LÉPVE (megerősítetlenül lépett be), ezért a belépési űrlapot nem várjuk el.
  await page.getByTestId('verify-back').click();
}

test('R119-01 — fiók nélkül, megerősítés nélkül: működő oldal és működő levélkérés, magyarul', async ({ browser }) => {
  const w = new World(browser, 'r11901');
  const db = new Db();
  let clockMoved = 0;
  let c = null;
  try {
    c = await w.context();
    const email = w.email('dora');
    const elotte = snapshot(db);

    // 1. REGISZTRÁCIÓ — a megerősítő hivatkozást NEM nyitjuk meg.
    await registerUI(c.page, email);
    // 2. BELÉPÉS a regisztrált jelszóval: sikeres, de a cím még nincs megerősítve.
    const login = await loginUI(c.page, email, PASSWORD);
    expect(login.body.ok, 'a belépés megerősítés nélkül is sikeres').toBe(true);
    const me = await c.api.get('/api/me');
    expect(me.body.channel_proven, 'a csatorna még nem bizonyított').toBe(false);
    expect(me.body.workspaces, 'még nincs egyetlen fiókja sem').toEqual([]);
    expect(me.body.current_book_id, 'nincs megnyitott fiók').toBe(null);
    expect(me.body.personal_book_id, 'személyes fiók még nem született').toBe(null);

    // 3. A FŐ TARTALOM MONDATA — nem fiókválasztás, hanem a megerősítés kérése (F118-01).
    const main = c.page.getByTestId('main');
    await expect(main).toContainText(HU.UI.confirmEmailFirst);
    await expect(main, 'nem küldi nem létező személyes fiók kiválasztására').not.toContainText(HU.UI.chooseAccountLead);
    await expect(c.page.getByTestId('no-account-resend')).toBeVisible();
    await expect(c.page.getByTestId('no-account-profile')).toBeVisible();

    // 4. A SAJÁT PROFIL TÉNYLEGES TARTALMA — a fő tartalomból nyitva (ez volt a zsákutca).
    await c.page.getByTestId('no-account-profile').click();
    await expect(main).toContainText(HU.PAGE.profile);
    await expect(main).toContainText(email);
    await expect(c.page.getByTestId('personal-space-note')).toHaveText(HU.UI.awaitingConfirm);
    await expect(c.page.getByTestId('lang-row')).toBeVisible();
    await expect(c.page.getByTestId('profile-resend'), 'a profiloldali levélkérő gomb LÁTSZIK').toBeVisible();
    await expect(main, 'a profil-oldal nem a fiókválasztóra küld').not.toContainText(HU.UI.chooseAccountLead);

    // 5. A BIZTONSÁG OLDAL TÉNYLEGES TARTALMA — ugyanez a sorrend vonatkozott rá.
    await openPersonPage(c.page, 'security');
    await expect(main).toContainText(HU.PAGE.security);
    await expect(c.page.getByTestId('security-acting-as')).toContainText(email);
    await expect(main, 'a „nincs kiválasztott fiók" TÉNY, nem zsákutca').toContainText('nincs kiválasztott fiók');
    await expect(c.page.getByTestId('security-resend')).toBeVisible();

    // 6. A MAG ÚJRAKÜLDÉSI KORLÁTJA MÉRVE, NEM MEGKERÜLVE. Közvetlenül a regisztráció után a
    //    `min_gap_ms` miatt nem keletkezik új levél — a válasz akkor is semleges (K03), ezért a
    //    LEVELET mérjük, nem a választ. Ezt a korlátot nem lazítjuk (R118: a felületi hibát nem
    //    kerüljük meg jogosultsággal vagy automatikus megerősítéssel).
    const regUtan = await mailCount(c.page, email);
    expect(regUtan, 'a regisztráció levele ott áll').toBe(1);
    await openPersonPage(c.page, 'security');
    await askResend(c.page, 'security-resend', email);
    expect(await mailCount(c.page, email), 'a korláton belül NEM keletkezik új levél').toBe(regUtan);

    // 7. …A KORLÁT LETELTE UTÁN VISZONT IGEN — és mind a HÁROM belépési pont ugyanazt teszi.
    const step = async (testid, honnan) => {
      await c.api.post('/dev/clock', { advance_ms: CHALLENGE_POLICY.min_gap_ms + 1000 });
      clockMoved += CHALLENGE_POLICY.min_gap_ms + 1000;
      const volt = await mailCount(c.page, email);
      await askResend(c.page, testid, email);
      expect(await mailCount(c.page, email), `új levél a(z) „${honnan}" gombról`).toBe(volt + 1);
    };
    await openPersonPage(c.page, 'profile');
    await step('profile-resend', 'profiloldal');
    await openProfile(c.page);
    await expect(c.page.getByTestId('profile-menu-channel')).toHaveText(HU.UI.channelPending);
    await step('profile-menu-resend', 'profilmenü');
    await c.page.goto('/');
    await expect(c.page.getByTestId('no-account-resend')).toBeVisible();
    await step('no-account-resend', 'fő tartalom');

    // 8. A MEGERŐSÍTETLEN ÚT NEM HOZ LÉTRE SEMMIT — a tároló számlálói változatlanok.
    expect(snapshot(db), 'idegen fiók, tagság vagy adatkör-engedély nem keletkezett').toEqual(elotte);

    // 9. MEGERŐSÍTÉS a legutóbbi levélből, majd ÚJBÓLI belépés: megszületik a SAJÁT személyes fiók.
    await verifyNewest(c.page, email);
    // FRISS ÁLLAPOT: kilépés és újbóli belépés — a személyes fiók a MEGERŐSÍTÉSKOR született meg,
    // és az új munkamenet is azt kapja (nem a lap gyorsítótárából).
    await logoutUI(c.page);
    await loginUI(c.page, email, PASSWORD);
    const utana = await c.api.get('/api/me');
    expect(utana.body.channel_proven).toBe(true);
    expect(utana.body.personal_book_id, 'a személyes fiók a MEGERŐSÍTÉSKOR született meg').toBeTruthy();
    expect(utana.body.current_book_id).toBe(utana.body.personal_book_id);
    expect(utana.body.workspaces.length, 'PONTOSAN egy fiók: a sajátja').toBe(1);
    expect(utana.body.workspaces[0].personal, 'és az a személyes köre').toBe(true);
    const zaro = snapshot(db);
    expect(zaro.book, 'pontosan egy új könyv').toBe(elotte.book + 1);
    // A MEGERŐSÍTÉS EGYETLEN TAGSÁGOT AD: a SAJÁT személyes körében. Idegen fiókba nem került be.
    expect(zaro.membership, 'pontosan egy új tagság').toBe(elotte.membership + 1);
    const sajat = db.all('SELECT book_id, role FROM membership WHERE subject_id = ?', me.body.subject_id);
    expect(sajat.length, 'egyetlen tagsága van').toBe(1);
    expect(sajat[0].book_id, 'és az a SAJÁT személyes köre').toBe(utana.body.personal_book_id);
    // ADATKÖR-ENGEDÉLY: a személyes kör születésekor a SAJÁT köréhez kap engedélyt — IDEGEN
    // fiókhoz vagy idegen személyhez EGYETLEN sor sem keletkezett (ez a lelet lényege).
    const idegen = db.count(
      'SELECT COUNT(*) AS n FROM scope_grant WHERE subject_id = ? AND book_id <> ?',
      me.body.subject_id, utana.body.personal_book_id);
    expect(idegen, 'idegen fiókra szóló engedély nem keletkezett').toBe(0);
    const sajatEngedely = db.count(
      'SELECT COUNT(*) AS n FROM scope_grant WHERE subject_id = ? AND book_id = ?',
      me.body.subject_id, utana.body.personal_book_id);
    expect(zaro.grant, 'minden új engedély a SAJÁT köréhez tartozik').toBe(elotte.grant + sajatEngedely);
    // …és a megerősített állapotban már nem a megerősítés kérése áll, és nincs levélkérő gomb.
    await expect(c.page.getByTestId('main')).not.toContainText(HU.UI.confirmEmailFirst);
    await openProfile(c.page);
    expect(await c.page.getByTestId('profile-menu-resend').count(), 'megerősítve nincs levélkérő gomb').toBe(0);
  } finally {
    // A FEJLESZTŐI ÓRA VISSZAÁLL — a következő próba nem örököl elcsúszott időt (R112-I4 elve).
    if (c && clockMoved) {
      await c.api.post('/dev/clock', { advance_ms: -clockMoved }).catch(() => {});
      const ora = await c.api.get('/dev/clock').catch(() => null);
      if (ora && ora.body) expect(ora.body.offset_ms, 'az óra visszaállt').toBe(0);
    }
    db.close(); await w.close();
  }
});

for (const code of ['en', 'de']) {
  test(`R119-02/${code} — a fiók nélküli állapot mondata és a látható művelet a választott nyelven`, async ({ browser }) => {
    const w = new World(browser, `r11902${code}`);
    const D = dictFor(code);
    try {
      const c = await w.context();
      const email = w.email('eva');
      await c.page.goto('/');
      // A NYELVET A NÉVTELEN LAPON választjuk — ugyanazon az úton, amin a felhasználó.
      const sel = c.page.getByTestId('lang-select-public');
      await expect(sel).toBeVisible();
      await sel.selectOption(code);
      await expect(c.page.locator('html')).toHaveAttribute('lang', code);
      await registerUI(c.page, email);
      await loginUI(c.page, email, PASSWORD);
      const main = c.page.getByTestId('main');
      await expect(c.page.locator('html')).toHaveAttribute('lang', code);
      await expect(main, 'a mondat a VÁLASZTOTT nyelven áll').toContainText(D.UI.confirmEmailFirst);
      await expect(main).toContainText(D.UI.confirmEmailBoxLead);
      // A LÁTHATÓ MŰVELET is a nyelvcsomagból, és tényleg megnyomható.
      const gomb = c.page.getByTestId('no-account-resend');
      await expect(gomb).toHaveText(D.UI.resendAsk);
      await gomb.click();
      await expect(c.page.getByTestId('resend-email')).toBeVisible();
      // …és a személyhez kötött oldal is megnyílik ezen a nyelven, működő gombbal.
      await c.page.goto('/');
      await c.page.getByTestId('no-account-profile').click();
      await expect(main).toContainText(D.PAGE.profile);
      await expect(c.page.getByTestId('profile-resend')).toHaveText(D.UI.resendAsk);
    } finally { await w.close(); }
  });
}
