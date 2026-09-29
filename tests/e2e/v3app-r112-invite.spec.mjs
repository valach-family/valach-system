// tests/e2e/v3app-r112-invite.spec.mjs — A MEGHÍVOTT EMBER TELJES ÚTJA ÉS ELUTASÍTÁSAI (F111-02, R112).
//
// MIÉRT VAN EZ A LAP. A külső ellenőrző fél (chatgpt-v3, R111/F111-02) kimondta: az R110 „a hat
// próba végigmegy … három nyelven" mondata túl tág volt. Az R109-05 csak névtelen képernyő-
// feliratokat nézett, az R109-03 magyar, előre regisztrált, már belépett címzettet használt, a
// lejáratot pedig egyik próba sem mérte. Ez a lap a HIÁNYZÓ részt méri — a meglévő, érvényes
// próbákat (R109-01…06 · a magfolyam 6–10. lépése · H06) nem írja újra.
//
//   R112-I1/<nyelv>  ÚJ címzett, HU/EN/DE: meghívó → saját súgó és bemutató → a regisztráció felé
//                    elhagyott bemutató NEVEZETTEN ér véget (F111-01, a regisztráción át érkező út) →
//                    regisztráció → megerősítés a levélből → belépés → a meghívó lapja visszajön →
//                    bemutató → KIFEJEZETT elfogadás → hordozott, teljes lezárás → HELYES fiók
//                    (adatbázisban) → kijelentkezés/újrabelépés után is ugyanaz a nyelv
//   R112-I2/<nyelv>  MÁR REGISZTRÁLT címzett, EN/DE: a bemutató MAGYARUL indul, közben nyelvet vált
//                    (a lépés-állapot megmarad, a szöveg átvált), elfogad, a lezárás az ÚJ nyelven
//                    szól — a magyar egynyelvű út az R109-03 (F111-01 óta a lezárással együtt)
//   R112-I3          SZEMÉLYVÁLTÁS + KÉSŐ VÁLASZ: az elfogadás válasza azután érkezik meg, hogy
//                    ugyanabban a böngészőben MÁSIK ember lépett be — a lap nem mondja neki, hogy ő
//                    csatlakozott, és a lezárás sem száll át rá
//   R112-I4          LEJÁRT meghívó a FEJLESZTŐI ÓRÁVAL (+8 nap, majd vissza) — a kiadott ajánlat sora
//                    VÁLTOZATLAN marad (az ellenőrzés nem gyengíti a pecsétet), hamis siker nincs, az
//                    erőltetett beváltás elakad, a három nyelv a helyes mondatot adja
//   R112-I5          ISMÉTELT elfogadás (dupla kattintás és utólagos API-hívás) és ISMERETLEN
//                    meghívó: többlet-tagság és többlet-jog nem születik
//
// AMIT NEM MÉR: a jogosultsági mag döntéseit (a mag-battéria méri) · a levél valódi kézbesítését (a
// fejlesztői levél-fogadó a csatorna) · a „megváltozott feltételű" meghívót — a héjban nincs út a
// kiadott ajánlat átírására (a tároló pecsétje tiltja), ezt a mag `invite_terms_changed` próbái
// mérik. A próba a feliratot a NYELVCSOMAGBÓL olvassa, nem égeti be (KUKA-237).
import { test, expect } from '@playwright/test';
import { World, Db, inviteUI, openInviteUI, redeemUI, createWorkspaceUI, logoutUI, withResponse, PASSWORD } from './helpers.mjs';
import { enabledLanguages } from '../../v3app/public/i18n/languages.mjs';
import { dictFor } from '../../v3app/public/i18n/dict.mjs';

test.describe.configure({ mode: 'serial' });

const TOUR_ID = 'tour.inviteAccept';
const ENABLED = enabledLanguages().map((l) => l.code);
const EIGHT_DAYS = 8 * 24 * 3600 * 1000;
const taxOf = (tag) => `${tag.replace(/\D/g, '').slice(0, 2).padStart(2, '8')}345671-2-42`;

/** A NYELV a névtelen lapon a VÁLASZTÓVAL áll be — ugyanazon az úton, amin a felhasználó. */
async function pickPublicLang(page, code) {
  const sel = page.getByTestId('lang-select-public');
  await expect(sel).toBeVisible();
  await sel.selectOption(code);
  await expect(page.locator('html')).toHaveAttribute('lang', code);
}

/** A levél-fogadóból a MEGERŐSÍTŐ hivatkozás — a tárgyat a kért nyelv csomagjából olvassuk. */
async function confirmFromMailbox(page, email, D) {
  await page.getByTestId('demo-mail-open').click();
  await expect(page.getByTestId('mailbox')).toBeVisible();
  const li = page.locator('li[data-testid^="mail-"]').filter({ hasText: email }).filter({ hasText: D.SRV.mailVerifySubject }).first();
  await expect(li, `a megerősítő levél a kért nyelven (${D.SRV.mailVerifySubject})`).toBeVisible();
  await li.locator('a[data-testid^="mail-link-"]').click();
  await expect(page.getByTestId('verify-result')).toHaveAttribute('data-ok', 'true');
  await page.getByTestId('verify-back').click();
  await expect(page.getByTestId('login-email')).toBeVisible();
}

async function loginHere(page, email) {
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(PASSWORD);
  return withResponse(page, { path: '/api/login' }, () => page.getByTestId('login-submit').click());
}

/** A bemutató a meghívó képernyőjéről indul, és a negyedik (feladat-)lépésig halad. */
async function tourToLastStep(page, D) {
  await page.getByTestId('invite-tour').click();
  await expect(page.getByTestId('tour-step-title')).toHaveText(D.TOUR[TOUR_ID].s1.title);
  for (let i = 0; i < 3; i += 1) await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-step-title')).toHaveText(D.TOUR[TOUR_ID].s4.title);
}

/** A TÉNYLEGES lezárás az új fiókban (F111-01): teljes, hordozott, a meghívás mondatával. */
async function expectCarriedClosure(page, D) {
  const fin = page.getByTestId('tour-finished');
  await expect(fin, 'a fiókváltás után is van lezárás').toBeVisible();
  await expect(fin).toHaveAttribute('data-whole', 'true');
  await expect(fin).toHaveAttribute('data-carried', 'true');
  await expect(fin).toHaveAttribute('data-via', 'invite_redeemed');
  await expect(fin).toHaveText(D.TOURUI.finishedTitle);
  await expect(page.getByTestId('tour-finished-lead')).toHaveText(D.TOURUI.carriedLeadInvite);
  await expect(page.getByTestId('tour-summary')).toHaveAttribute('data-done', '4');
  await expect(page.getByTestId('tour-summary')).toHaveAttribute('data-pending', '0');
  await expect(page.getByTestId('tour-restart')).toHaveCount(0);
}

test.describe('R112 — a meghívott ember teljes útja és elutasításai (F111-02)', () => {
  let db; let w; let anna; let biz;

  test.beforeAll(async ({ browser }) => {
    db = new Db();
    w = new World(browser, `r112i-${Date.now().toString(36)}`);
    anna = await w.person('anna');
    biz = await createWorkspaceUI(anna.page, { name: 'R112 Kft', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag) } });
    expect(biz.body.ok).toBe(true);
  });

  test.afterAll(async () => { if (w) await w.close(); if (db) db.close(); });

  for (const code of ENABLED) {
    test(`R112-I1/${code} — ÚJ címzett: súgó → regisztráció → megerősítés → belépés → elfogadás → lezárás → helyes fiók → nyelv marad`, async () => {
      const D = dictFor(code);
      const email = w.email(`uj-${code}`);
      const inv = await inviteUI(anna.page, { email, role: 'user', scope: 'keszlet' });
      expect(inv.body.ok).toBe(true);

      // A CÍMZETT saját, névtelen böngészőben nyitja meg a levél hivatkozását. A levél és a hivatkozás
      // a MEGHÍVÓ nyelvén szól (F91-02) — a címzett a lapon állítja át a sajátjára.
      const c = await w.anonymous();
      const o = await openInviteUI(c.page, inv.link);
      // NÉVTELENÜL a válasz SEMLEGES: a lap nem árulja el, tartozik-e már belépés a címhez (KUKA-084).
      expect(o.observe.status).toBe('needs_invitee_identity');
      await pickPublicLang(c.page, code);
      await expect(c.page.locator('html')).toHaveAttribute('lang', code);
      await expect(c.page.getByTestId('section-invite').locator('h1')).toHaveText(D.UI.inviteGenericTitle);
      await expect(c.page.getByTestId('invite-identity')).toContainText(D.UI.inviteNotSignedIn);
      // A „KÖVETKEZŐ LÉPÉS" SOR A KÉRT NYELVEN szól, nem a mag magyar diagnosztikájával (R112 · KUKA-210).
      await expect(c.page.getByTestId('invite-next')).toHaveAttribute('data-next', 'inviteWrongAddress');
      await expect(c.page.getByTestId('invite-next')).toHaveText(D.UI.inviteWrongAddress);

      // SAJÁT SÚGÓ: a GYIK a meghívás kérdésén nyílik, a kért nyelven.
      await c.page.getByTestId('invite-faq').click();
      await expect(c.page.getByTestId('help-faq')).toContainText(D.FAQ['faq.invite.accept'].q);
      await c.page.getByTestId('help-close').click();

      // BEMUTATÓ belépés ELŐTT: végigmegy a negyedik lépésig, ahol MEGÁLL — elfogadni csak belépve lehet.
      await tourToLastStep(c.page, D);
      await c.page.getByTestId('tour-finish').click();
      await expect(c.page.getByTestId('tour-blocked')).toHaveText(D.TOURUI.taskNotDone);

      // A REGISZTRÁCIÓ FELÉ ELHAGYOTT BEMUTATÓ NEVEZETTEN ÉR VÉGET (F111-01): nem mutogat a semmibe,
      // és megmondja a folytatást — belépés után a meghívó lapja visszajön.
      await c.page.getByTestId('invite-actions').locator('[data-auth="register"]').click();
      await expect(c.page.getByTestId('register-email')).toBeVisible();
      await expect(c.page.getByTestId('tour-aborted')).toHaveAttribute('data-why', 'inviteSignInFirst');
      await expect(c.page.getByTestId('tour-aborted')).toHaveText(D.TOURUI.inviteSignInFirst);
      await c.page.getByTestId('tour-close').click();
      await expect(c.page.getByTestId('tour')).toBeHidden();

      // A SEGÍTSÉG NEM ÍRT: sem tagság, sem beváltás.
      expect(db.get('SELECT redeemed_at FROM invite WHERE token = ?', inv.token).redeemed_at).toBeNull();

      // REGISZTRÁCIÓ ugyanebben a böngészőben, ugyanazon a nyelven.
      await c.page.getByTestId('register-email').fill(email);
      await c.page.getByTestId('register-password').fill(PASSWORD);
      const reg = await withResponse(c.page, { path: '/api/register' }, () => c.page.getByTestId('register-submit').click());
      expect(reg.body.ok).toBe(true);
      await expect(c.page.getByTestId('register-result')).toHaveText(D.UI.registerSentLead);
      await confirmFromMailbox(c.page, email, D);

      // BELÉPÉS: a függő meghívás a szerveren állt, a lap a MEGHÍVÓHOZ tér vissza — a nyelv MARAD.
      const li = await loginHere(c.page, email);
      expect(li.body.ok).toBe(true);
      await expect(c.page.getByTestId('section-invite')).toBeVisible();
      await expect(c.page.locator('html')).toHaveAttribute('lang', code);
      await expect(c.page.getByTestId('invite-identity')).toContainText(email);
      await expect(c.page.getByTestId('invite-redeem')).toHaveText(D.UI.inviteAcceptButton);
      await expect(c.page.getByTestId('invite-next')).toHaveText(D.UI.inviteNextAccept);
      const subjectId = li.body.subject_id;
      // A SZEMÉLYES FIÓK MEGVAN (a belépés nem a vállalkozásba visz), tagság még NINCS.
      expect(db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ?', subjectId, biz.bookId)).toBe(0);

      // A BEMUTATÓ ÚJRA INDÍTHATÓ INNEN, és a KIFEJEZETT elfogadás zárja le.
      await tourToLastStep(c.page, D);
      const r = await redeemUI(c.page);
      expect(r.body.ok).toBe(true);
      expect(r.body.subject_id).toBe(subjectId);
      expect(r.body.book_id).toBe(biz.bookId);
      await expectCarriedClosure(c.page, D);
      await expect(c.page.getByTestId('global-notice')).toContainText(D.UI.inviteAcceptedLead);
      await expect(c.page.getByTestId('global-notice')).toContainText('R112 Kft');

      // A TÁROLT KÖVETKEZMÉNY: EGY tagság, a meghívó szerepével, élő; a meghívó beváltva; a nézet a cég.
      const mem = db.all('SELECT role, revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', subjectId, biz.bookId);
      expect(mem).toHaveLength(1);
      expect(mem[0].role).toBe('user');
      expect(mem[0].revoked_at).toBeNull();
      expect(db.get('SELECT redeemed_at FROM invite WHERE token = ?', inv.token).redeemed_at).not.toBeNull();
      expect((await c.api.get('/api/me')).body.current_book_id).toBe(biz.bookId);
      await c.page.getByTestId('tour-close').click();

      // KIJELENTKEZÉS ÉS ÚJRABELÉPÉS: a nyelv a SZEMÉLYÉ, megmarad.
      await logoutUI(c.page);
      await expect(c.page.locator('html')).toHaveAttribute('lang', code);
      const again = await loginHere(c.page, email);
      expect(again.body.ok).toBe(true);
      await expect(c.page.getByTestId('app')).toBeVisible();
      await expect(c.page.locator('html')).toHaveAttribute('lang', code);
      await c.ctx.close();
    });
  }

  for (const code of ENABLED.filter((l) => l !== 'hu')) {
    test(`R112-I2/${code} — MÁR REGISZTRÁLT címzett: a bemutató közben nyelvet vált, a lezárás az új nyelven szól`, async () => {
      const HU = dictFor('hu');
      const D = dictFor(code);
      const bea = await w.person(`reg-${code}`);
      const inv = await inviteUI(anna.page, { email: bea.email, role: 'user', scope: 'keszlet' });
      await openInviteUI(bea.page, inv.link);
      await bea.page.getByTestId('invite-tour').click();
      await expect(bea.page.getByTestId('tour-step-title')).toHaveText(HU.TOUR[TOUR_ID].s1.title);
      await bea.page.getByTestId('tour-next').click();
      await expect(bea.page.getByTestId('tour-step-title')).toHaveText(HU.TOUR[TOUR_ID].s2.title);

      // NYELVVÁLTÁS FUTÓ BEMUTATÓ KÖZBEN: a szöveg átvált, az elvégzett lépés elvégzett marad.
      await pickPublicLang(bea.page, code);
      await expect(bea.page.getByTestId('tour-step-title')).toHaveText(D.TOUR[TOUR_ID].s2.title);
      await expect(bea.page.getByTestId('tour-step-s1')).toHaveAttribute('data-state', 'done');
      await expect(bea.page.getByTestId('section-invite').locator('h1')).toHaveText(D.UI.inviteGenericTitle);
      for (let i = 0; i < 2; i += 1) await bea.page.getByTestId('tour-next').click();
      await expect(bea.page.getByTestId('tour-step-title')).toHaveText(D.TOUR[TOUR_ID].s4.title);

      const r = await redeemUI(bea.page);
      expect(r.body.ok).toBe(true);
      await expectCarriedClosure(bea.page, D);
      await expect(bea.page.getByTestId('global-notice')).toContainText(D.UI.inviteAcceptedLead);
      const mem = db.all('SELECT role, revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', bea.subjectId, biz.bookId);
      expect(mem).toHaveLength(1);
      expect(mem[0].revoked_at).toBeNull();
      await bea.page.getByTestId('tour-close').click();

      // A VÁLTOTT NYELV A SZEMÉLYÉ LETT: kijelentkezés és újrabelépés után is az marad.
      await logoutUI(bea.page);
      const again = await loginHere(bea.page, bea.email);
      expect(again.body.ok).toBe(true);
      await expect(bea.page.locator('html')).toHaveAttribute('lang', code);
    });
  }

  test('R112-I3 — SZEMÉLYVÁLTÁS + KÉSŐ VÁLASZ: a másik ember nem kapja meg az elfogadás sikerét és lezárását', async () => {
    const D = dictFor('hu');
    const carl = await w.person('carl');
    const dora = await w.person('dora');
    const inv = await inviteUI(anna.page, { email: carl.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(carl.page, inv.link);
    await tourToLastStep(carl.page, D);

    // AZ ELFOGADÁS VÁLASZÁT VISSZATARTJUK: a szerver MÁR feldolgozta (Carl csatlakozott), a lap még nem tudja.
    let release; const gate = new Promise((res) => { release = res; });
    let served = null;
    await carl.page.route('**/api/invites/redeem', async (route) => {
      const resp = await route.fetch();
      served = await resp.json();
      await gate;
      await route.fulfill({ response: resp });
    });
    const answered = carl.page.waitForResponse((res) => new URL(res.url()).pathname === '/api/invites/redeem');
    await carl.page.getByTestId('invite-redeem').click();
    await expect.poll(() => served && served.ok).toBe(true);

    // KÖZBEN UGYANEBBEN A BÖNGÉSZŐBEN Dóra lép be egy másik lapon (Carl munkamenete lecserélődik).
    const p2 = await carl.ctx.newPage();
    await p2.goto('/');
    await logoutUI(p2);
    const li = await loginHere(p2, dora.email);
    expect(li.body.ok).toBe(true);

    // A KÉSŐ VÁLASZ MEGÉRKEZIK Carl régi lapjára.
    release();
    await answered;
    await carl.page.unroute('**/api/invites/redeem');
    const notice = carl.page.getByTestId('global-notice');
    /**
     * NEM AZONOSÍTOTT EGYSZERI BUKÁS (R112, nevesítve a jelentésben): az első teljes futáson ez a
     * sor 10 s-ig NEM találta az értesítő sávot — a lap tehát belépési nézetben állt. Kb. 60
     * ismétlésben (terheléssel is) nem jött elő újra, és a „késve induló kérés régi sütivel"
     * magyarázat kísérletben NEM igazolódott. Ezért a próba bukáskor a lap ÁLLAPOTÁT rögzíti — a
     * következő előfordulás adatot hoz, nem újabb találgatást (KUKA-121: a türelem nem mérce).
     */
    try { await expect(notice).toBeVisible(); } catch (e) {
      const visible = await carl.page.evaluate(() => [...document.querySelectorAll('[data-testid]')]
        .filter((x) => x.offsetParent !== null).map((x) => x.getAttribute('data-testid')).slice(0, 40));
      const me = (await carl.api.get('/api/me')).body;
      await test.info().attach('r112-i3-allapot', { contentType: 'application/json',
        body: JSON.stringify({ visible, me_subject: me.subject_id ?? null, dora: dora.subjectId, carl: carl.subjectId }) });
      throw e;
    }
    await expect(notice, 'a másik ember nem kapja meg Carl sikerét').not.toContainText(D.UI.inviteAcceptedLead);
    await expect(notice).toContainText(D.UI.otherPersonHere);
    await expect(carl.page.getByTestId('header-subject')).toContainText(dora.email);
    // CARL LEZÁRÁSA NEM SZÁLL ÁT DÓRÁRA (F93-01 szabálya ezen az úton is).
    await expect(carl.page.getByTestId('tour-finished')).toHaveCount(0);

    // A TÁROLT TÉNY: Carl csatlakozott (a szerver ezt tette), Dóra NEM lett tag.
    expect(db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ? AND revoked_at IS NULL', carl.subjectId, biz.bookId)).toBe(1);
    expect(db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ?', dora.subjectId, biz.bookId)).toBe(0);
    await p2.close();
  });

  test('R112-I4 — LEJÁRT meghívó a fejlesztői órával: hamis siker nincs, az ajánlat sora változatlan', async () => {
    const inv = await inviteUI(anna.page, { email: w.email('lejart'), role: 'user', scope: 'keszlet' });
    expect(inv.body.ok).toBe(true);
    const elotte = db.get('SELECT * FROM invite WHERE token = ?', inv.token);
    await anna.api.post('/dev/clock', { advance_ms: EIGHT_DAYS });
    try {
      // A címzett a LEJÁRAT UTÁN regisztrál és lép be (az ő órája már +8 nap).
      const lejart = await w.person('lejart');
      const o = await openInviteUI(lejart.page, inv.link);
      expect(o.redeemVisible, 'lejárt meghívón nincs elfogadó gomb').toBe(false);
      for (const code of ENABLED) {
        const D = dictFor(code);
        await pickPublicLang(lejart.page, code);
        await expect(lejart.page.getByTestId('invite-observe')).toHaveText(D.REASON.invite_expired);
        await expect(lejart.page.getByTestId('invite-next')).toHaveText(D.UI.inviteNextNewInvite);
        // A SAJÁT SEGÍTSÉG itt is ott van — a zsákutcából is van folytatás.
        await expect(lejart.page.getByTestId('invite-faq')).toBeVisible();
      }
      // A BEMUTATÓ végigjárása és a kihagyás SEM fogad el.
      const D = dictFor(ENABLED[ENABLED.length - 1]);
      await tourToLastStep(lejart.page, D);
      await lejart.page.getByTestId('tour-finish').click();
      await lejart.page.getByTestId('tour-skip').click();
      // AZ ERŐLTETETT BEVÁLTÁS a szervernél akad el (a felület megkerülésével is).
      const forced = await lejart.api.post('/api/invites/redeem', { token: inv.token });
      expect(forced.body.ok).toBe(false);
      expect(db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ?', lejart.subjectId, biz.bookId)).toBe(0);
    } finally {
      await anna.api.post('/dev/clock', { advance_ms: -EIGHT_DAYS });   // az óra VISSZAÁLL
    }
    // A KIADOTT AJÁNLAT SORA KARAKTERRE UGYANAZ — a próba nem írta át a lejáratot, és nem váltotta be.
    expect(db.get('SELECT * FROM invite WHERE token = ?', inv.token)).toEqual(elotte);
    expect((await anna.api.get('/dev/clock')).body.offset_ms).toBe(0);
  });

  test('R112-I5 — ISMÉTELT elfogadás és ISMERETLEN meghívó: többlet-tagság és -jog nincs', async () => {
    const D = dictFor('hu');
    const erik = await w.person('erik');
    const inv = await inviteUI(anna.page, { email: erik.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(erik.page, inv.link);
    const scopesElotte = db.count('SELECT COUNT(*) AS n FROM scope_grant WHERE subject_id = ? AND book_id = ?', erik.subjectId, biz.bookId);

    // DUPLA KATTINTÁS: két kérés indul, a szerver egyet teljesít.
    const answers = [];
    erik.page.on('response', async (res) => {
      if (new URL(res.url()).pathname === '/api/invites/redeem') answers.push(await res.json());
    });
    await erik.page.evaluate(() => { const b = document.querySelector('[data-testid="invite-redeem"]'); b.click(); b.click(); });
    await expect.poll(() => answers.length).toBe(2);
    expect(answers.filter((a) => a.ok === true)).toHaveLength(1);
    // A MEGHÍVÓ ADATKÖRE PLAFON, NEM JOG (R63 · K05-DSC-c): a beváltás olvasási jogot NEM ír.
    expect(answers.find((a) => a.ok === true).read_scope_granted ?? null).toBeNull();
    await expect(erik.page.getByTestId('global-notice')).toContainText(D.UI.inviteAcceptedLead);

    // UTÓLAGOS ÚJRAHÍVÁS UGYANAZZAL A MEGHÍVÓVAL: elakad.
    const ujra = await erik.api.post('/api/invites/redeem', { token: inv.token });
    expect(ujra.body.ok).toBe(false);
    // A TÁROLT KÖVETKEZMÉNY: EGY tagság, és a meghívótól több adatkör nem lett.
    expect(db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ?', erik.subjectId, biz.bookId)).toBe(1);
    expect(db.count('SELECT COUNT(*) AS n FROM membership_grant WHERE subject_id = ? AND book_id = ?', erik.subjectId, biz.bookId)).toBe(1);
    expect(db.count('SELECT COUNT(*) AS n FROM scope_grant WHERE subject_id = ? AND book_id = ?', erik.subjectId, biz.bookId)).toBe(scopesElotte);

    // ISMERETLEN meghívó: nincs elfogadó gomb, van emberi mondat, és a segítség elérhető.
    const u = await openInviteUI(erik.page, `/?invite=${'0'.repeat(32)}`);
    expect(u.redeemVisible).toBe(false);
    expect(`${u.humanText}${u.next}`.trim().length).toBeGreaterThan(0);
    await expect(erik.page.getByTestId('invite-faq')).toBeVisible();
  });
});
