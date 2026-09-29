// tests/e2e/v3app-r109-invite.spec.mjs — A MEGHÍVOTT EMBER VÉGIGVEZETÉSE (P109-01, R109).
//
// MIT ZÁR LE. Az `invite.accept` eddig `tour: null` volt, NEVEZETT indokkal (R91/F91-01): a
// képernyője CSAK érvényes meghívó-hivatkozásból nyílik meg, tehát a súgó FŐOLDALÁRÓL indított
// bemutató nem létező célra mutatna. A P109-01 megoldása nem mesterséges meghívó: a bemutató
// `requires_invite`, és a SZERVER csak meghívás-kontextussal kínálja fel.
//
// AMIT EZ A PRÓBA MÉR — és amit KIMONDOTTAN nem:
//   R109-01  a képernyő SAJÁT segítsége: a cím egy szó, a fiók neve alatta, „mi történik az
//            elfogadással", MINDIG meglévő személy-sor, GYIK- és bemutató-indító, súgó-pont
//   R109-02  A KAPU A SZERVERNÉL VAN: meghívás-kontextus NÉLKÜL a bemutató NINCS a listán, vele IGEN
//            (ez az ellenpróba: enélkül a zöld csak azt igazolná, hogy a lista nem üres)
//   R109-03  A BEMUTATÓ NEM FOGAD EL HELYETTÜNK: végigkattintva a „Tovább"-ot a meghívó
//            beváltatlan MARAD (adatbázison mérve), és csak a SAJÁT kattintás + a szerver igazolt
//            sikere zárja le a bemutatót
//   R109-04  ELUTASÍTÁS és ÍRÁS-MENTESSÉG: lejárt meghívó nem kap hamis sikert; a súgó/bemutató
//            megnyitása-bezárása-kihagyása NEM ír tagságot vagy jogot (sorszámlálással mérve)
//   R109-05  HÁROM NYELV: a képernyő szavai a MEGFELELŐ csomagból jönnek (a próba a csomagból
//            olvassa az elvárást, nem beéget feliratot — KUKA-237), és nyers kulcs nem szivárog ki
//   R109-06  KESKENY NÉZET: a képernyő elemei ott is láthatók, vízszintes túlcsordulás nélkül
//
// AMIT NEM MÉR: a bemutató-motor maga (azt a TUR-01 próbái és a v3app-r89-tutor.spec mérik) · a
// levél kézbesítése · a jogosultsági mag döntései (azok a core próbái). A teljes kilenc-túrás
// regressziót ez a lap NEM helyettesíti — a motor nem változott, csak EGY új bemutató került bele.
import { test, expect } from '@playwright/test';
import { World, Db, inviteUI, openInviteUI, redeemUI, createWorkspaceUI, logoutUI } from './helpers.mjs';
import { enabledLanguages } from '../../v3app/public/i18n/languages.mjs';
import { dictFor } from '../../v3app/public/i18n/dict.mjs';

test.describe.configure({ mode: 'serial' });

const TOUR_ID = 'tour.inviteAccept';
const ENABLED = enabledLanguages().map((l) => l.code);
/** Az adószám a próba CÍMKÉJÉBŐL jön, hogy két párhuzamos futás ne ütközzön ugyanazon a számon. */
const taxOf = (tag) => `${tag.replace(/\D/g, '').slice(0, 2).padStart(2, '9')}345678-2-42`;

/** A NYELVET A NÉVTELEN LAPON A VÁLASZTÓVAL állítjuk — ugyanazon az úton, amin a felhasználó. */
async function pickLang(page, code) {
  const sel = page.getByTestId('lang-select-public');
  if (await sel.count()) { await sel.selectOption(code); await page.waitForTimeout(250); }
}

/** A bemutatók listája a SZERVERTŐL — a kapu itt mérhető, nem a felület feltevésén. */
async function tourIdsOf(api, lang = 'hu') {
  const r = await api.get(`/api/assistant/status?lang=${lang}`);
  return ((r.body && r.body.tours) || []).map((t) => t.id);
}

test.describe('R109 — a meghívott ember végigvezetése', () => {
  let db; let w; let anna; let biz;

  test.beforeAll(async ({ browser }) => {
    db = new Db();
    w = new World(browser, `r109-${Date.now().toString(36)}`);
    anna = await w.person('anna');
    biz = await createWorkspaceUI(anna.page, { name: 'R109 Kft', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag) } });
  });

  test.afterAll(async () => { if (w) await w.close(); if (db) db.close(); });

  test('R109-01 — a meghívó képernyőjén ott van a saját segítség', async () => {
    const D = dictFor('hu');
    const inv = await inviteUI(anna.page, { email: w.email('bea'), role: 'user', scope: 'keszlet' });
    expect(inv.token).toBeTruthy();

    // A CÍMZETT a saját böngészőjében nyitja meg a levélből kapott hivatkozást.
    const bea = await w.person('bea');
    const o = await openInviteUI(bea.page, inv.link);
    expect(o.observe.status).toBe('redeem_as_existing');

    // A CÍM EGY SZÓ, a fiók neve ALATTA áll (a névelő-csapda megszűnt).
    await expect(bea.page.getByTestId('section-invite').locator('h1')).toHaveText(D.UI.inviteGenericTitle);
    await expect(bea.page.getByTestId('invite-account-name')).toContainText('R109 Kft');
    // MI TÖRTÉNIK AZ ELFOGADÁSSAL — a képernyő maga megmondja.
    await expect(bea.page.getByTestId('invite-what-happens')).toHaveText(D.UI.inviteWhatHappens);
    // A SZEMÉLY SORA: melyik fiókkal van bent (a személyes belépés és a csatlakozás két lépés).
    await expect(bea.page.getByTestId('invite-identity')).toContainText(bea.email);
    // A HÁROM SEGÍTSÉG-ÚT MIND ELÉRHETŐ INNEN.
    await expect(bea.page.getByTestId('helpdot-invite.accept')).toBeVisible();
    await expect(bea.page.getByTestId('invite-faq')).toBeVisible();
    await expect(bea.page.getByTestId('invite-tour')).toBeVisible();
    // ÉS A GYIK TÉNYLEGESEN MEGNYÍLIK a meghívásról szóló kérdésen.
    await bea.page.getByTestId('invite-faq').click();
    await expect(bea.page.getByTestId('help-faq')).toBeVisible();
    await expect(bea.page.getByTestId('help-faq')).toContainText(D.FAQ['faq.invite.accept'].q);
    await bea.page.getByTestId('help-close').click();
    w.bea = bea; w.inv = inv;
  });

  test('R109-02 — ELLENPRÓBA: a bemutatót a szerver CSAK meghívás-kontextussal kínálja fel', async () => {
    // (a) NÉVTELEN lap, meghívó NÉLKÜL: a bemutató NINCS a listán — a súgó főoldala nem kínál
    //     olyan bemutatót, aminek nincs hova mutatnia (ez volt az eredeti `tour: null` indoka).
    const anon = await w.anonymous();
    await anon.page.goto('/');
    const nelkul = await tourIdsOf(anon.api);
    expect(nelkul).not.toContain(TOUR_ID);

    // (b) UGYANAZ a böngésző, MEGHÍVÓVAL megnyitva: most már ott van. A különbség KIZÁRÓLAG a
    //     meghívás-kontextus — tehát a kapu tényleg a kontextuson áll, nem a szerepkörön.
    await anon.page.goto(`/?invite=${w.inv.token}`);
    await expect(anon.page.getByTestId('section-invite')).toBeVisible();
    const vele = await tourIdsOf(anon.api);
    expect(vele).toContain(TOUR_ID);
    await anon.ctx.close();
  });

  test('R109-03 — a bemutató NEM fogad el helyettünk: csak a saját kattintás vált be', async () => {
    const bea = w.bea; const inv = w.inv;
    const D = dictFor('hu');
    await openInviteUI(bea.page, inv.link);

    // A BEMUTATÓ A KÉPERNYŐRŐL INDUL, és a meghívó lapján marad (nem visz belső oldalra).
    await bea.page.getByTestId('invite-tour').click();
    await expect(bea.page.getByTestId('tour-steps')).toBeVisible();
    await expect(bea.page.getByTestId('section-invite')).toBeVisible();
    await expect(bea.page.getByTestId('tour-step-title')).toHaveText(D.TOUR[TOUR_ID].s1.title);

    // VÉGIGKATTINTJUK A „TOVÁBB"-OT — az UTOLSÓ lépésig. A bemutató itt MEGVÁR: a feladata a
    // szerver igazolt sikere, nem egy gombnyomás (KUKA-231).
    for (let i = 0; i < 3; i += 1) await bea.page.getByTestId('tour-next').click();
    await expect(bea.page.getByTestId('tour-step-title')).toHaveText(D.TOUR[TOUR_ID].s4.title);
    // A MÉRÉS: a meghívó ITT MÉG beváltatlan, és tagság sem született.
    expect(db.get('SELECT redeemed_at FROM invite WHERE token = ?', inv.token).redeemed_at).toBeNull();
    expect(db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ?', bea.subjectId, biz.bookId)).toBe(0);
    // A „Tovább" az utolsó lépésen sem fogad el: a bemutató NEM zárul le magától.
    const next = bea.page.getByTestId('tour-next');
    if (await next.count()) await next.click();
    expect(db.get('SELECT redeemed_at FROM invite WHERE token = ?', inv.token).redeemed_at).toBeNull();

    // ÉS MOST A SAJÁT KATTINTÁS. A szerver igazolt sikere után: tagság VAN, és a bemutató lezárul.
    const r = await redeemUI(bea.page);
    expect(r.body.ok).toBe(true);
    expect(db.get('SELECT redeemed_at FROM invite WHERE token = ?', inv.token).redeemed_at).not.toBeNull();
    const mem = db.get('SELECT role, revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', bea.subjectId, biz.bookId);
    expect(mem).not.toBeNull();
    expect(mem.revoked_at).toBeNull();
    // A SIKER SZAVA KIMONDJA, MIT TETTÉL (a `notice` a lezárás után is kint van).
    expect(r.notice).toContain(D.UI.inviteAcceptedLead);
  });

  test('R109-04 — elutasítás és ÍRÁS-MENTESSÉG: a segítség nem ír tagságot', async () => {
    // A LEJÁRATOT NEM HAMISÍTJUK: a mag KIMONDOTTAN tiltja a kiadott ajánlat átírását („visszavonás
    // + új meghívó kell"), és ez helyes — ezért a próba KÉT VALÓDI elutasítási állapotot jár be,
    // amit a P109-03 is nevesít: a MÁR FELHASZNÁLT meghívó és az ELTÉRŐ CÍMZETT.
    const cecil = await w.person('cecil');
    const memElotte = db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ?', cecil.subjectId);
    const beaRedeemed = db.get('SELECT redeemed_at FROM invite WHERE token = ?', w.inv.token).redeemed_at;
    expect(beaRedeemed).not.toBeNull();

    // (a) MÁR FELHASZNÁLT meghívó: nincs beváltó gomb, a lap mond valamit, és NEM ír.
    const mar = await openInviteUI(cecil.page, w.inv.link);
    expect(mar.redeemVisible).toBe(false);
    expect(`${mar.humanText}${mar.next}`.trim().length).toBeGreaterThan(0);

    // (b) MÁS CÍMZETTNEK szóló, ÉRVÉNYES meghívó: ugyanez — hamis siker nincs.
    const masnak = await inviteUI(anna.page, { email: w.email('dora'), role: 'user', scope: 'keszlet' });
    const mis = await openInviteUI(cecil.page, masnak.link);
    expect(mis.redeemVisible).toBe(false);
    expect(`${mis.humanText}${mis.next}`.trim().length).toBeGreaterThan(0);

    // A SEGÍTSÉG MEGNYITÁSA · BEZÁRÁSA · A BEMUTATÓ INDÍTÁSA-KIHAGYÁSA — egyik sem ír.
    await cecil.page.getByTestId('invite-faq').click();
    await expect(cecil.page.getByTestId('help-faq')).toBeVisible();
    await cecil.page.getByTestId('help-close').click();
    await cecil.page.getByTestId('invite-tour').click();
    await expect(cecil.page.getByTestId('tour-steps')).toBeVisible();
    for (const id of ['tour-skip', 'tour-next', 'tour-exit', 'tour-close']) {
      const b = cecil.page.getByTestId(id);
      if (await b.count() && await b.isVisible()) { await b.click(); break; }
    }
    // A MÉRÉS: sem tagság, sem beváltás nem született a segítség használatától.
    expect(db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ?', cecil.subjectId)).toBe(memElotte);
    expect(db.get('SELECT redeemed_at FROM invite WHERE token = ?', masnak.token).redeemed_at).toBeNull();
    expect(db.get('SELECT redeemed_at FROM invite WHERE token = ?', w.inv.token).redeemed_at).toBe(beaRedeemed);
  });

  test('R109-05 — a képernyő szavai MIND A HÁROM nyelven a helyes csomagból jönnek', async () => {
    const inv = await inviteUI(anna.page, { email: w.email('dora'), role: 'user', scope: 'keszlet' });
    for (const code of ENABLED) {
      const D = dictFor(code);
      const c = await w.anonymous();
      await c.page.goto('/');
      await pickLang(c.page, code);
      await c.page.goto(`/?invite=${inv.token}`);
      await expect(c.page.getByTestId('section-invite')).toBeVisible();
      await expect(c.page.getByTestId('section-invite').locator('h1')).toHaveText(D.UI.inviteGenericTitle);
      await expect(c.page.getByTestId('invite-what-happens')).toHaveText(D.UI.inviteWhatHappens);
      // NÉVTELENÜL: a személy-sora KIMONDJA, hogy még nincs belépés (nem üres, nem félmondat).
      await expect(c.page.getByTestId('invite-identity')).toContainText(D.UI.inviteNotSignedIn);
      await expect(c.page.getByTestId('invite-faq')).toHaveText(D.UI.inviteFaqOpen);
      await expect(c.page.getByTestId('invite-tour')).toHaveText(D.UI.inviteTourStart);
      // NYERS KULCS NEM SZIVÁROG KI: a képernyőn nincs `valami.masik` alakú gépi azonosító.
      const txt = (await c.page.getByTestId('section-invite').innerText()) || '';
      const nyers = txt.split('\n').filter((l) => /^[a-z][a-zA-Z]*\.[a-z][a-zA-Z.]*$/.test(l.trim()));
      expect(nyers, `nyers kulcs a képernyőn (${code})`).toEqual([]);
      await c.ctx.close();
    }
  });

  test('R109-06 — keskeny nézetben is használható', async () => {
    const inv = await inviteUI(anna.page, { email: w.email('elek'), role: 'user', scope: 'keszlet' });
    const c = await w.anonymous();
    await c.page.setViewportSize({ width: 390, height: 844 });
    await c.page.goto(`/?invite=${inv.token}`);
    await expect(c.page.getByTestId('section-invite')).toBeVisible();
    for (const id of ['invite-observe', 'invite-what-happens', 'invite-identity', 'invite-actions', 'invite-next', 'invite-faq', 'invite-tour']) {
      await expect(c.page.getByTestId(id), `keskeny nézet: ${id}`).toBeVisible();
    }
    // VÍZSZINTES TÚLCSORDULÁS NINCS: a lap nem lóg ki a látótérből.
    const tul = await c.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(tul, 'vízszintes túlcsordulás keskeny nézetben').toBeLessThanOrEqual(1);
    await c.ctx.close();
  });
});
