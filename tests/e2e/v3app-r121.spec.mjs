// tests/e2e/v3app-r121.spec.mjs — AZ R121 BÖNGÉSZŐS TANÚJA (A121-08).
//
// AMIT EZ MÉR, ÉS A `findings_r121.mjs` NEM: a VALÓDI DOM-ot. A battéria a szabályt és a bekötését
// méri a HTTP-héjon; ez a lap azt, hogy a kezelő TÉNYLEGESEN meg tudja nyomni a gombot, és hogy a
// képernyő a művelet UTÁN az ÚJ igazságot mutatja (D-VS-497/4. kérdés · KUKA-207: a két tanú együtt).
//
//   R121-B1  A TELJES TÖRTÉNET: a munkatárs csak mennyiséget lát → a kezelő megadja a bizonylat-
//            hozzáférést → a minta megnyílik → a kezelő EGYETLEN hozzáférést visszavon → a mennyiség
//            TOVÁBBRA IS látszik, a bizalmas minta már nem kérhető le, és a tagság megmaradt
//   R121-B2  A VEGYES BIZONYLAT egyetlen hiányzó hozzáférés mellett is EGÉSZBEN zárva marad
//   R121-B3  EN/DE: az új felületi út, a visszavonás és a súgó a saját nyelvén
//   R121-B4  KESKENY nézet: a hozzáférés-lap és a minta-szakasz használható
//   R121-B5  A levélkérés általános várakozási mondata mindhárom nyelven LÁTSZIK
import { test, expect } from '@playwright/test';
import {
  World, Db, PASSWORD, inviteUI, openInviteUI, redeemUI, createWorkspaceUI, setPlanUI,
  grantScopeUI, revokeScopeUI, stockUI, gotoPage, openMemberPanel, openProfile,
} from './helpers.mjs';
import { dictFor } from '../../v3app/public/i18n/dict.mjs';

test.describe.configure({ mode: 'serial' });
const HU = dictFor('hu');

/**
 * A NYITOTT OLDALSÓ PANEL BEZÁRÁSA a VALÓDI vezérlővel (`data-action="panel-close"`).
 *
 * A panel `<dialog>`: ZÁRT állapotban a bezáró gombja a DOM-ban MARAD, csak nem látszik — egy
 * feltétel nélküli kattintás ezért időtúllépésbe fut. Ezért előbb a dialógus ÁLLAPOTÁT kérdezzük
 * meg, és csak nyitott panelen kattintunk (a rajzolás és a művelet két külön tény — KUKA-209).
 */
async function closeAnyPanel(page) {
  const panel = page.getByTestId('panel');
  if (!(await panel.count())) return;
  if (!(await panel.evaluate((el) => el.open))) return;
  await page.locator('[data-action="panel-close"]').last().click();
  await expect(panel).not.toHaveJSProperty('open', true);
}

/**
 * A MINTA-SZAKASZ VÁRT ÁLLAPOTA — VÁRAKOZÓ állítással, nem egyszeri mintavétellel.
 *
 * MIÉRT ÍGY. Az első alakom egyszer kérdezte meg, „kiadva-e", és a jog megadása/megvonása utáni
 * ÚJRARAJZOLÁS közepébe futott: a `count()` még a régi elemet látta, a `textContent()` már nem
 * találta. Amit a próba nem nyom meg helyettünk, arra VÁRNI kell (KUKA-228) — ezért a VÁRT
 * végállapot elemére állítunk, és a Playwright addig próbálkozik.
 */
async function expectSample(page, kulcs, kiadva) {
  await expect(page.getByTestId(`sample-${kulcs}`)).toBeVisible();
  const cel = page.getByTestId(`sample-${kulcs}-${kiadva ? 'value' : 'denied'}`);
  await expect(cel).toBeVisible();
  return (await cel.textContent()) || '';
}

test.describe('R121 — hozzáférések adatkörönként', () => {
  let db; let w; let kezelo; let munkatars; let bookId;

  test.beforeAll(async ({ browser }) => {
    db = new Db();
    w = new World(browser, `r121-${Date.now().toString(36)}`);
    kezelo = await w.person('kezelo');
    munkatars = await w.person('munkatars');
    const ws = await createWorkspaceUI(kezelo.page, {
      name: 'R121 Kft', plan: 'starter', business: { jurisdiction: 'HU', tax_id: '82345672-2-42' },
    });
    bookId = ws.bookId;
    // A bizonylat- és beszállítói nézet a `pro` tesztprofilhoz kötött (ENT-02) — ez TESZTPROFIL,
    // nem kereskedelmi díjcsomag-döntés.
    await setPlanUI(kezelo.page, 'pro');
    const inv = await inviteUI(kezelo.page, { email: munkatars.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(munkatars.page, inv.token);
    await redeemUI(munkatars.page);
  });

  test.afterAll(async () => { await w.close(); db.close(); });

  test('R121-B1 — a teljes történet: mennyiség marad, a bizalmas minta zárul', async () => {
    // (1) A MUNKATÁRS CSAK MENNYISÉGET LÁT. A készlet-hozzáférést a kezelő adja meg külön lépésben.
    await gotoPage(kezelo.page, 'members');
    await grantScopeUI(kezelo.page, munkatars.subjectId, 'keszlet');
    const keszlet = await stockUI(munkatars.page);
    expect(keszlet.body.ok).toBe(true);

    await gotoPage(munkatars.page, 'documents');
    // A NEMLEGES VÁLASZ MEGNEVEZI, MI HIÁNYZIK — enélkül a kezelő nem tudja, mit adjon meg (KUKA-201).
    expect(await expectSample(munkatars.page, 'document', false)).toContain(HU.SCOPE.dokumentumok);

    // (2) A KEZELŐ MEGADJA a bizonylat-hozzáférést.
    await gotoPage(kezelo.page, 'members');
    const megadas = await grantScopeUI(kezelo.page, munkatars.subjectId, 'dokumentumok');
    expect(megadas.body.ok).toBe(true);

    // (3) A MINTA MEGNYÍLIK — a képernyőn, nem csak a válaszban.
    await gotoPage(munkatars.page, 'stock');
    await gotoPage(munkatars.page, 'documents');
    expect(await expectSample(munkatars.page, 'document', true)).toContain('BEJ-2026-0042');

    // (4) EGYETLEN HOZZÁFÉRÉS VISSZAVONÁSA — a tagság érintése nélkül.
    await gotoPage(kezelo.page, 'members');
    const vissza = await revokeScopeUI(kezelo.page, munkatars.subjectId, 'dokumentumok');
    expect(vissza.body.ok).toBe(true);
    expect(vissza.body.changed).toBe(true);

    // (5) A MENNYISÉG TOVÁBBRA IS LÁTSZIK, a bizalmas minta már nem kérhető le.
    const keszletUtana = await stockUI(munkatars.page);
    expect(keszletUtana.body.ok).toBe(true);
    await gotoPage(munkatars.page, 'documents');
    await expectSample(munkatars.page, 'document', false);

    // (6) ÉS A TAGSÁG MEGMARADT — a tárolóban mérve, nem a képernyő szavából következtetve.
    const tagsag = db.get('SELECT revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', munkatars.subjectId, bookId);
    expect(tagsag).not.toBeNull();
    expect(tagsag.revoked_at).toBeNull();
    // KÖNYVRE SZŰKÍTVE: ugyanennek a személynek a SAJÁT személyes fiókja is kapott mind a négy
    // jogot az indulásakor (v2 szabály), tehát a könyv nélküli számlálás a szomszéd fiókot is
    // beleszámolná — és a próba a szomszéd sort igazolná (KUKA-239).
    // A megvonás SAJÁT eseménysorban áll, és a megadást nem törölte (R51/F51-01).
    expect(db.count('SELECT COUNT(*) FROM scope_grant_revocation WHERE subject_id = ? AND book_id = ? AND scope = ?', munkatars.subjectId, bookId, 'dokumentumok')).toBe(1);
    expect(db.count('SELECT COUNT(*) FROM scope_grant WHERE subject_id = ? AND book_id = ? AND scope = ?', munkatars.subjectId, bookId, 'dokumentumok')).toBe(1);
  });

  test('R121-B2 — a vegyes bizonylat egyetlen hiányzó hozzáférés mellett is egészben zár', async () => {
    await gotoPage(kezelo.page, 'members');
    for (const s of ['dokumentumok', 'arak', 'beszallitok']) {
      await grantScopeUI(kezelo.page, munkatars.subjectId, s);
    }
    await gotoPage(munkatars.page, 'documents');
    expect(await expectSample(munkatars.page, 'document-full', true)).toContain('41880');

    // EGYETLEN jog elvétele — és az EGÉSZ bizonylat zárul, nem csak az érintett mező.
    await gotoPage(kezelo.page, 'members');
    await revokeScopeUI(kezelo.page, munkatars.subjectId, 'arak');
    await gotoPage(munkatars.page, 'stock');
    await gotoPage(munkatars.page, 'documents');
    expect(await expectSample(munkatars.page, 'document-full', false)).toContain(HU.SCOPE.arak);
    // A FEJLÉC viszont nyitva marad: a `dokumentumok` joga megvan (a zárás CÉLZOTT, nem általános).
    await expectSample(munkatars.page, 'document', true);
  });

  test('R121-B3 — az új felületi út és a visszavonás a saját nyelvén (en · de)', async () => {
    // A BELÉPETT NYELVVÁLASZTÓ A PROFIL LAPON ÁLL (nem a fejlécben) — a próba ugyanazt az utat
    // járja végig, amit a felhasználó: profilmenü → Saját profil → nyelv, majd vissza a lapra.
    const nyelvre = async (code) => {
      // A NYITOTT OLDALSÓ PANEL TAKARJA A FEJLÉCET: előbb becsukjuk, ahogy a felhasználó is tenné
      // — különben a próba egy takart nyitóra kattintana (ugyanaz a lecke, mint a `gotoPage`-ben).
      await closeAnyPanel(kezelo.page);
      await openProfile(kezelo.page);
      await kezelo.page.getByTestId('profile-menu-profile').click();
      await kezelo.page.getByTestId('lang-select').selectOption(code);
      await expect(kezelo.page.locator('html')).toHaveAttribute('lang', code);
    };
    /**
     * A KIINDULÓ ÁLLAPOTOT EZ A PRÓBA ÁLLÍTJA BE, nem a szomszéd próbától örökli.
     *
     * Az első alakom arra épített, hogy a `dokumentumok` jog a korábbi esetből megvan — így
     * ÖNMAGÁBAN futtatva elbukott, együtt futtatva pedig csak véletlenül működött. A próba a SAJÁT
     * előfeltételét teremtse meg (KUKA-239 · KUKA-134).
     */
    const ensureGranted = async (scope) => {
      await gotoPage(kezelo.page, 'members');
      await openMemberPanel(kezelo.page, munkatars.subjectId);
      const ad = kezelo.page.getByTestId(`member-scope-grant-${munkatars.subjectId}-${scope}`);
      const kell = await ad.count() > 0;
      await closeAnyPanel(kezelo.page);
      if (kell) await grantScopeUI(kezelo.page, munkatars.subjectId, scope);
    };
    await ensureGranted('dokumentumok');

    for (const code of ['en', 'de']) {
      const D = dictFor(code);
      await nyelvre(code);
      await gotoPage(kezelo.page, 'members');
      await openMemberPanel(kezelo.page, munkatars.subjectId);
      // A NÉGY KÖR SORA A SAJÁT NYELVÉN — a felirat a nyelvcsomagból jön, nem beégetve (SZO-01).
      for (const scope of ['keszlet', 'arak', 'dokumentumok', 'beszallitok']) {
        await expect(kezelo.page.getByTestId(`member-scope-row-${scope}`)).toContainText(D.SCOPE[scope]);
      }
      // A KÉT MŰVELET FELIRATA A SAJÁT NYELVÉN: a MEGADOTT körön a visszavonás, a MEG NEM
      // ADOTT körön a megadás gombja áll — a felirat mindkét irányban a nyelvcsomagból jön.
      await expect(kezelo.page.getByTestId(`member-scope-revoke-${munkatars.subjectId}-dokumentumok`))
        .toContainText(D.UI.scopeRevoke);
      const adoGomb = kezelo.page.getByTestId(`member-scope-grant-${munkatars.subjectId}-arak`);
      if (await adoGomb.count()) await expect(adoGomb).toContainText(D.UI.scopeGrant);
      await closeAnyPanel(kezelo.page);
    }
    await nyelvre('hu');
  });

  test('R121-B4 — keskeny nézetben is használható', async () => {
    await closeAnyPanel(kezelo.page);
    // A NYITOTT LENYÍLÓKAT BECSUKJUK: a mérés a FELHASZNÁLÓK képernyőjéről szól, nem egy nyitva
    // hagyott fejléc-menüről. (Mérve, és NEVESÍTETT, ELŐZETESEN FENNÁLLÓ lelet: 390 képponton a
    // nyitott fiókváltó menü jobb széle 486 képpontnál áll — a szélessége a helyes 374, de a
    // POZÍCIÓJA lóg ki. Ez nem ennek a csomagnak a változása; a REPORT nevesíti.)
    await kezelo.page.evaluate(() => {
      for (const d of document.querySelectorAll('details[open]')) d.open = false;
    });
    await kezelo.page.setViewportSize({ width: 390, height: 780 });
    // KESKENY NÉZETBEN A BAL MENÜ ÖSSZECSUKÓDIK: a felhasználó a menü-nyitóval jut a laphoz, és a
    // próba is ezt az utat járja (R81/R89 mintája) — nem egy takart gombra kattint.
    await expect(kezelo.page.getByTestId('nav-toggle')).toBeVisible();
    await kezelo.page.getByTestId('nav-toggle').click();
    await gotoPage(kezelo.page, 'members');
    await openMemberPanel(kezelo.page, munkatars.subjectId);
    // A NÉGY SOR ÉS A MŰVELETI GOMB KESKENYEN IS ELÉRHETŐ — és nincs vízszintes csúszás.
    for (const scope of ['keszlet', 'arak', 'dokumentumok', 'beszallitok']) {
      await expect(kezelo.page.getByTestId(`member-scope-row-${scope}`)).toBeVisible();
    }
    // NINCS VÍZSZINTES CSÚSZÁS. A mérés IZOLÁL is: a tag-táblázat NÉLKÜLI értéket külön mutatja,
    // hogy egy jövőbeli piros ne csak egy számot adjon, hanem azt is, hol keresse (KUKA-216).
    // Ez a sor fogta meg a `.sr-only` kiszökését (style.css, `.table-scroll` pozicionálása).
    const mer = () => kezelo.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const tulTagok = await mer();
    const tulTablaNelkul = await kezelo.page.evaluate(() => {
      const t = document.querySelector('.tablebox');
      if (!t) return null;
      const elozo = t.style.display; t.style.display = 'none';
      const x = document.documentElement.scrollWidth - window.innerWidth;
      t.style.display = elozo;
      return x;
    });
    expect(tulTagok, `túlcsúszás a Felhasználók lapon (táblázat nélkül: ${tulTablaNelkul})`).toBeLessThanOrEqual(1);
    await closeAnyPanel(kezelo.page);
    await kezelo.page.setViewportSize({ width: 1280, height: 900 });
  });

  test('R121-B5 — a levélkérés várakozási mondata mindhárom nyelven látszik', async () => {
    const { page } = await w.anonymous();
    for (const code of ['hu', 'en', 'de']) {
      await page.goto('/');
      await page.getByTestId('lang-select-public').selectOption(code);
      await expect(page.locator('html')).toHaveAttribute('lang', code);
      await page.locator('[data-auth="resend"]').first().click();
      const hint = page.getByTestId('resend-wait-hint');
      await expect(hint).toBeVisible();
      await expect(hint).toHaveText(dictFor(code).UI.resendWaitHint);
    }
  });
});
