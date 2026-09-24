// tests/e2e/v3app-r75.spec.mjs — AZ R75 KÉT FELÜLETI LELETE, VALÓDI BÖNGÉSZŐBEN (CMD-VS-300-002-002).
//
// MIÉRT KÜLÖN FÁJL. A `v3app-acceptance.spec.mjs` az R63 §5.3 TIZENNÉGY HELYZETÉT méri, és a
// bizonyíték-lapját helyzetenként írja. Az R75 két lelete nem helyzet, hanem JAVÍTÁS — a saját
// próbáik itt állnak, a helyzet-lap szerkezetének megbontása nélkül.
//
//   F75-01  a lejárt megerősítésnek VAN folytatása — a felhasználó útján végigkattintva
//   F75-02  a kontextusváltás védelme TELJES — késleltetett válaszokkal, valódi versenyben
//
// AZ ÚTVONAL-MINTA VÉGÉN `**` ÁLL (R77 óta): a kontextusfüggő olvasások LEKÉRDEZÉS-mezőt visznek
// (`expected_book_id` · `expected_subject_id`, KTX-02), és a kérdőjeles címet a csupasz minta NEM
// fogja meg — a visszatartás némán elmaradna, a próba pedig „zölden" mérne semmit (KUKA-051).
//
// A KÉSLELTETÉS ITT A MÉRŐESZKÖZ (nem „flaky" próba): a `page.route` a VÁLASZT tartja vissza, amíg
// a felhasználó vált — pontosan azt a versenyt állítja elő, amit a külső ellenőrző fél a saját
// klienspróbájában reprodukált. A tiltás mellett MINDEN esetben ott a POZITÍV ELLENPÁR is
// (KUKA-051: a tiltás üres bizonyíték, ha közben a jó eset is elakadna).
//
// A FEJLESZTŐI ÓRA (`/dev/clock`) MINDIG VISSZAÁLL: a fájl utolsó lépése a kiindulási eltolásra
// állít vissza, mert a futtató EGY szervert használ, és az utánunk következő próba nem örökölhet
// megváltozott időt (KUKA-054: a mérés nem hagyhat maga után mért környezetet).
import { test, expect } from '@playwright/test';
import {
  World, Db, PASSWORD, registerUI, loginUI, logoutUI, header, createWorkspaceUI, switchUI,
  inviteUI, openInviteUI, redeemUI, stockUI, workspaceListUI, withResponse,
} from './helpers.mjs';

const DAY = 24 * 3600 * 1000;

/** A levél-fogadó adott című, adott tárgyú levelének hivatkozása — a felhasználó útján (lista). */
async function mailLink(page, email, subjectPart) {
  await page.getByTestId('mailbox-refresh').click();
  const li = page.locator('li[data-testid^="mail-"]').filter({ hasText: email }).filter({ hasText: subjectPart }).first();
  await expect(li).toBeVisible();
  return li.locator('a[data-testid^="mail-link-"]').getAttribute('href');
}

test('R75/F75-01 — LEJÁRT megerősítés: a lap FOLYTATÁST ad, az új hivatkozás működik, a jelszó változatlan', async ({ browser }) => {
  const w = new World(browser, 'r7501'); const db = new Db();
  try {
    const { page, api } = await w.context();
    const email = w.email('hanna');
    await registerUI(page, email, PASSWORD);
    const first = await mailLink(page, email, 'Erősítsd meg');

    // 1. AZ ÓRA 25 ÓRÁVAL ELŐRE — a hivatkozás lejár (a valódi 24 órát nem várjuk ki).
    await api.post('/dev/clock', { advance_ms: 25 * 3600 * 1000 });
    await page.goto(first);
    await expect(page.getByTestId('verify-result')).toHaveAttribute('data-ok', 'false');
    await expect(page.getByTestId('verify-result')).toContainText('challenge_expired');
    // A RÉGI ALAK ITT ÉRT VÉGET: „regisztrálj újra" — ami nem működik (a cím foglalt).
    await expect(page.getByTestId('verify-result')).not.toContainText('regisztrálj újra');
    await expect(page.getByTestId('verify-next')).toContainText('Folytatás');

    // 2. A FOLYTATÁS GOMBJA ott van, ahol keresik, és a lap KIMONDJA, mi történt.
    await page.getByTestId('verify-resend-link').click();
    await expect(page.getByTestId('global-notice')).toContainText('lejárt');
    await expect(page.getByTestId('resend-form')).toBeVisible();

    // 3. ÚJ HIVATKOZÁS KÉRÉSE a felületről — semleges válasz, ÚJ levél.
    await page.getByTestId('resend-email').fill(email);
    const resend = await withResponse(page, { path: '/api/verification/resend' }, () => page.getByTestId('resend-submit').click());
    expect(resend.status).toBe(200);
    await expect(page.getByTestId('resend-result')).toContainText('megerősítésre váró');
    const second = await mailLink(page, email, 'Új megerősítő');
    expect(second).not.toBe(first);

    // 4. A RÉGI hivatkozás NEM éled újra, az ÚJ működik (pozitív ellenpár).
    await page.goto(first);
    await expect(page.getByTestId('verify-result')).toContainText('challenge_expired');
    await page.goto(second);
    await expect(page.getByTestId('verify-result')).toHaveAttribute('data-ok', 'true');
    await page.getByTestId('verify-back').click();

    // 5. AZ EREDETI JELSZÓVAL belép — az újrakérés nem nyúlt a hitelesítőhöz —, és a SZEMÉLYES köre áll.
    const login = await loginUI(page, email, PASSWORD);
    expect(login.body.ok).toBe(true);
    const me = (await api.get('/api/me')).body;
    expect(me.channel_proven).toBe(true);
    expect(me.personal_book_id).toBeTruthy();
    expect(me.workspaces.filter((x) => x.personal).length).toBe(1);
    await expect(page.getByTestId('ws-list')).toContainText('személyes kör');
    // A TÁROLÓBAN: a leváltott és a beváltott kihívás KÜLÖN tény, egyik sem írta át a másikat.
    const rows = db.all("SELECT used_at, superseded_at FROM channel_challenge WHERE value_norm = ? ORDER BY created_at", email);
    expect(rows.length).toBe(2);
    expect(rows[0].used_at).toBeNull();                 // a lejárt: se beváltva, se leváltva
    expect(rows[1].used_at).not.toBeNull();             // az új: beváltva
    // A bizonyított csatornán ÚJABB kérés sem küld levelet, és a válasz ugyanaz marad (semleges).
    const again = await api.post('/api/verification/resend', { email });
    expect(again.status).toBe(200);
    expect(db.count('SELECT COUNT(*) AS n FROM channel_challenge WHERE value_norm = ?', email)).toBe(2);
    await api.post('/dev/clock', { advance_ms: -25 * 3600 * 1000 });   // az óra VISSZAÁLL
  } finally {
    await w.close(); db.close();
  }
});

test('R75/F75-02 — KONTEXTUSVÁLTÁS: a régi cég válasza és gombja nem ér át az új nézetbe', async ({ browser }) => {
  const w = new World(browser, 'r7502'); const db = new Db();
  try {
    const anna = await w.person('anna');
    const A = await createWorkspaceUI(anna.page, { name: 'Alfa Kft' });
    const B = await createWorkspaceUI(anna.page, { name: 'Béta Kft' });
    const bela = await w.person('bela');
    const cili = await w.person('cili');
    // Béla az ALFA tagja, Cili a BÉTA tagja — a két taglista TARTALMILAG különbözik.
    await switchUI(anna.page, A.bookId);
    const invB = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(bela.page, invB.link); await redeemUI(bela.page);
    await switchUI(anna.page, B.bookId);
    const invC = await inviteUI(anna.page, { email: cili.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(cili.page, invC.link); await redeemUI(cili.page);

    // ── (1) A KÉSVE ÉRKEZŐ TAGLISTA NEM KERÜL AZ ÚJ NÉZETBE ────────────────────────────────
    await switchUI(anna.page, A.bookId);
    await expect(anna.page.getByTestId(`member-${bela.subjectId}`)).toBeVisible();
    // CSAK AZ ELSŐ taglista-kérést tartjuk vissza (az ALFÁÉT); a váltás utáni kérés szabadon fut —
    // különben nem versenyt mérnénk, hanem egy megbénított lapot.
    let releaseFirst = null;
    const firstHeld = new Promise((r) => { releaseFirst = r; });
    let seen = 0;
    await anna.page.route('**/api/members**', async (route) => {
      seen += 1;
      if (seen === 1) await firstHeld;
      await route.continue();
    });
    await anna.page.reload();                       // ez indítja az ALFA taglistájának kérését
    await expect(anna.page.getByTestId('header-workspace')).toContainText('Alfa Kft');
    await anna.page.getByTestId(`ws-switch-${B.bookId}`).click();
    await expect(anna.page.getByTestId('header-workspace')).toContainText('Béta Kft');
    // POZITÍV ELLENPÁR ELŐSZÖR: a BÉTA saját tagja megjelenik (a lista nem „üres biztonság").
    await expect(anna.page.getByTestId(`member-${cili.subjectId}`)).toBeVisible();
    releaseFirst();                                  // MOST érkezik meg az ALFA régi válasza
    await anna.page.waitForTimeout(300);
    // A RÉGI cég tagja SEHOL — sem a listában, sem rejtve: a válasz eldobva (KTX-01).
    await expect(anna.page.getByTestId(`member-${bela.subjectId}`)).toHaveCount(0);
    await expect(anna.page.getByTestId(`member-${cili.subjectId}`)).toBeVisible();
    await expect(anna.page.getByTestId('header-workspace')).toContainText('Béta Kft');

    // ── (2) A RÉGI GOMB NEM ÍR AZ ÚJ CÉG NEVÉBEN ──────────────────────────────────────────
    // A taglista az ALFÁN áll; a MÁSIK LAP (ugyanaz a munkamenet!) átvált a BÉTÁRA. A gomb ezután
    // is ott van a régi képernyőn — a szervernek kell megfognia (a kliens jelzése nem jog).
    await switchUI(anna.page, A.bookId);
    await expect(anna.page.getByTestId(`member-${bela.subjectId}`)).toBeVisible();
    const second = await anna.ctx.newPage();                 // MÁSODIK LAP, közös süti-tárca
    await second.goto('/');
    await second.getByTestId(`ws-switch-${B.bookId}`).click();
    await expect(second.getByTestId('header-workspace')).toContainText('Béta Kft');
    const before = db.count('SELECT COUNT(*) AS n FROM membership_revocation WHERE subject_id = ? AND book_id = ?', bela.subjectId, A.bookId);
    const forced = await withResponse(anna.page, { path: '/api/members/revoke' },
      () => anna.page.getByTestId(`member-revoke-${bela.subjectId}`).click());
    expect(forced.status).toBe(409);
    expect(forced.body.reason).toBe('context_mismatch');
    expect(forced.body.expected_book_id).toBe(A.bookId);
    expect(forced.body.current_book_id).toBe(B.bookId);
    // A TÁROLÓ A DÖNTŐ BIZONYÍTÉK: megvonás-esemény NEM született, Béla tagsága él.
    expect(db.count('SELECT COUNT(*) AS n FROM membership_revocation WHERE subject_id = ? AND book_id = ?', bela.subjectId, A.bookId)).toBe(before);
    expect(db.get('SELECT revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', bela.subjectId, A.bookId).revoked_at).toBeNull();
    // A MAGYARÁZAT A GLOBÁLIS SÁVBAN ÁLL — a panel-ürítés (kontextus-váltás) nem törli, tehát a
    // felhasználó nem néma képernyőt kap (KUKA-012; a saját böngésző-próbám lelete a javítás közben).
    // A MONDAT R79 ÓTA KÉT OKOT NEVEZ MEG (munkakörnyezet VAGY belépett fiók) — a kontextus-eltérés
    // ugyanis azonos cégen belüli FIÓK-váltásból is jöhet (R79/F79-02). A próba állítása ugyanaz
    // marad: a magyarázat a globális sávban ÁLL, nem tűnik el a panel-ürítéssel.
    await expect(anna.page.getByTestId('global-notice')).toContainText(/munkakörnyezet|belépett fiók/);

    // POZITÍV ELLENPÁR: a HELYES körben ugyanez a gomb dolgozik.
    await anna.page.reload();
    await expect(anna.page.getByTestId('header-workspace')).toContainText('Béta Kft');
    const okRevoke = await withResponse(anna.page, { path: '/api/members/revoke' },
      () => anna.page.getByTestId(`member-revoke-${cili.subjectId}`).click());
    expect(okRevoke.status).toBe(200);
    expect(okRevoke.body.ok).toBe(true);
    expect(db.count('SELECT COUNT(*) AS n FROM membership_revocation WHERE subject_id = ? AND book_id = ?', cili.subjectId, B.bookId)).toBe(1);
    await second.close();

    // ── (3) A KÉSVE ÉRKEZŐ ADAT-VÁLASZ SEM ÍR AZ ÚJ NÉZETBE ───────────────────────────────
    await switchUI(anna.page, A.bookId);
    const st = await stockUI(anna.page);
    expect(st.body.ok).toBe(true);
    let releaseData = null;
    const dataHeld = new Promise((r) => { releaseData = r; });
    let dataSeen = 0;
    await anna.page.route('**/api/data/stock**', async (route) => {
      dataSeen += 1;
      if (dataSeen === 1) await dataHeld;
      await route.continue();
    });
    await anna.page.getByTestId('data-stock-btn').click();
    await expect(anna.page.getByTestId('data-stock')).toHaveText('…');
    await anna.page.getByTestId(`ws-switch-${B.bookId}`).click();
    await expect(anna.page.getByTestId('header-workspace')).toContainText('Béta Kft');
    releaseData();
    await anna.page.waitForTimeout(300);
    // A váltás ÜRÍTETT, és a késve érkező válasz nem rajzolódik vissza.
    await expect(anna.page.getByTestId('data-stock')).toHaveText('—');

    // ── (4) KILÉPÉS UTÁN a késve érkező válasz sem kerül a DOM-ba ─────────────────────────
    // KIMONDVA, MIT NEM ÁLLÍTUNK: a rejtett szakaszban maradt szöveg ÖNMAGÁBAN nem „látható
    // adatkiadás" és nem szerveroldali jogosultság-megkerülés (a külső fél kikötése). Amit mérünk:
    // a kilépés után a panel ÜRES marad, tehát nincs mit visszaírni.
    let releaseLogout = null;
    const logoutHeld = new Promise((r) => { releaseLogout = r; });
    let logoutSeen = 0;
    await anna.page.unroute('**/api/data/stock**');
    await anna.page.route('**/api/data/stock**', async (route) => {
      logoutSeen += 1;
      if (logoutSeen === 1) await logoutHeld;
      await route.continue();
    });
    await switchUI(anna.page, A.bookId);
    await anna.page.getByTestId('data-stock-btn').click();
    await expect(anna.page.getByTestId('data-stock')).toHaveText('…');
    await logoutUI(anna.page);
    releaseLogout();
    await anna.page.waitForTimeout(300);
    await expect(anna.page.getByTestId('data-stock')).toHaveText('—');
    expect((await header(anna.page)).subject).toBe('nincs bejelentkezve');
  } finally {
    await w.close(); db.close();
  }
});

test('R75 — a fejlesztői óra a futás végén a KIINDULÁSI állapotban marad', async ({ browser }) => {
  const w = new World(browser, 'r7503');
  try {
    const { api } = await w.context();
    const clock = (await api.get('/dev/clock')).body;
    // A lejárati próbák MINDEGYIKE visszaállította az eltolást — ha valamelyik elfelejtené, ez a
    // sor pirosra vált, és nem egy KÉSŐBBI, látszólag független próba bukik el helyette (KUKA-054).
    expect(clock.offset_ms).toBe(0);
    expect(Math.abs(Date.parse(clock.now) - Date.parse(clock.real_now))).toBeLessThan(2000);
  } finally {
    await w.close();
  }
});
