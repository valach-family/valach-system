// tests/e2e/v3app-r85.spec.mjs — AZ R85 NÉGY LELETE VALÓDI BÖNGÉSZŐBEN (CMD-VS-300-002-002 R85).
//
// A külső ellenőrző fél (chatgpt-v3) az R84-es átadáson NÉGY eltérést reprodukált a SAJÁT
// környezetében. Ez a lap UGYANAZOKAT a helyzeteket járja végig itt — előbb a LELETET (a javítás
// előtti állapotot), majd a javítás után a helyes viselkedést, mindkét irányban mérve (KUKA-051).
//
// F85-01  A VÁLLALKOZÁS-LÉTREHOZÁS MÉG MÁSIK SZEMÉLYHEZ ÍR. A megnyitáskori SZEMÉLY kötése a
//         létrehozásnál hiányzott: a helyi generáció-bélyeg nem szerveroldali személy-ellenőrzés.
// F85-02  AZ ELŐZŐ CÉG VÁRAKOZÓ MEGHÍVÁSA AZ ÚJ CÉG ALATT MARAD (a lista kimaradt a közös ürítésből).
// F85-03  UGYANAZ A CÉG KÉT FELHASZNÁLÓNAK MÁS BEMUTATÓADATOT MUTAT (a néző saját lista-sorrendje
//         döntött, nem a fiókhoz RÖGZÍTETT csomag).
// F85-04  AZ ELVESZETT VÁLASZ NEM BIZONYÍTJA, HOGY A KÉRÉS NEM TELJESÜLT.
import { test, expect } from '@playwright/test';
import {
  World, Db, PASSWORD, createWorkspaceUI, switchUI, inviteUI, openInviteUI, redeemUI,
  loginUI, logoutUI, openSwitcher, gotoPage, grantScopeUI, stockUI, apiOf, registerUI, withOptionalResponse,
} from './helpers.mjs';

test('R85/F85-01 — a félbehagyott vállalkozás-űrlap NEM hoz létre fiókot a közben belépett MÁSIK személynek', async ({ browser }) => {
  const w = new World(browser, 'r8501'); const db = new Db();
  try {
    const anna = await w.person('anna');
    const bela = await w.person('bela');           // saját böngészőjében regisztrál + megerősít

    // 1. ANNA MEGNYITJA AZ ÚJ FIÓK ŰRLAPJÁT, és kitölti — de még nem küldi be.
    await openSwitcher(anna.page);
    await anna.page.getByTestId('ws-add').click();
    await expect(anna.page.getByTestId('ws-name')).toBeVisible();
    await anna.page.getByTestId('ws-name').fill('Anna félbehagyott vállalkozása');
    await anna.page.getByTestId('ws-kind-shared').check();

    // 2. UGYANEBBEN A BÖNGÉSZŐBEN (közös süti) BÉLA LÉP BE egy másik fülön.
    const masik = await anna.ctx.newPage();
    await masik.goto('/');
    await logoutUI(masik);                         // ugyanaz a süti: a kilépés Anna munkamenetét zárja
    await loginUI(masik, bela.email, PASSWORD);
    await expect(masik.getByTestId('header-subject')).toContainText(bela.email);

    const elotte = {
      book: db.count('SELECT COUNT(*) AS n FROM book'),
      membership: db.count('SELECT COUNT(*) AS n FROM membership'),
      grant: db.count('SELECT COUNT(*) AS n FROM scope_grant'),
      basis: db.count('SELECT COUNT(*) AS n FROM authority_basis'),
      belaBooks: db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ?', bela.subjectId),
    };

    // 3. ANNA RÉGI ŰRLAPJA BEKÜLD. A szervernek ÍRÁS ELŐTT kell elutasítania: a megnyitáskori
    //    SZEMÉLY nem az, aki most be van jelentkezve ebben a böngészőben.
    const elso = await withOptionalResponse(anna.page, { path: '/api/workspaces', method: 'POST' },
      () => anna.page.getByTestId('ws-create').click());
    if (elso) {
      expect(elso.status).toBe(409);
      expect(elso.body.reason).toBe('context_mismatch');
      expect(elso.body.wrote).toBe(false);
    }

    // 4. A LAP KIMONDJA, MI TÖRTÉNT, és a régi szerkesztő érvénytelen (a kitöltés nem marad ott).
    await expect(anna.page.getByTestId('global-notice')).toContainText(/Másik felhasználó jelentkezett be/i);
    await expect(anna.page.getByTestId('ws-name')).toHaveCount(0);

    // 5. A TÁROLÓ VÁLTOZATLAN — sem könyv, sem tagság, sem jog, sem felhatalmazás nem született,
    //    és BÉLÁHOZ különösen nem.
    expect(db.count('SELECT COUNT(*) AS n FROM book')).toBe(elotte.book);
    expect(db.count('SELECT COUNT(*) AS n FROM membership')).toBe(elotte.membership);
    expect(db.count('SELECT COUNT(*) AS n FROM scope_grant')).toBe(elotte.grant);
    expect(db.count('SELECT COUNT(*) AS n FROM authority_basis')).toBe(elotte.basis);
    expect(db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ?', bela.subjectId)).toBe(elotte.belaBooks);
    expect(db.count("SELECT COUNT(*) AS n FROM book WHERE name LIKE 'Anna félbehagyott%'")).toBe(0);

    // 6. POZITÍV ELLENPÁR: a HELYES személy alatt, frissen megnyitott űrlapon a létrehozás MŰKÖDIK.
    await masik.close();
    const annaUjra = await w.context();
    await annaUjra.page.goto('/');
    await loginUI(annaUjra.page, anna.email, PASSWORD);
    const jo = await createWorkspaceUI(annaUjra.page, { name: 'Anna valódi vállalkozása' });
    expect(jo.status).toBe(201);
    expect(db.count("SELECT COUNT(*) AS n FROM book WHERE name = 'Anna valódi vállalkozása'")).toBe(1);
  } finally { await w.close(); db.close(); }
});

test('R85/F85-02 — az ELŐZŐ cég várakozó meghívása NEM marad az új cég alatt', async ({ browser }) => {
  const w = new World(browser, 'r8502');
  try {
    const anna = await w.person('anna');
    const A = await createWorkspaceUI(anna.page, { name: 'Első Műhely Kft' });
    const B = await createWorkspaceUI(anna.page, { name: 'Második Műhely Kft' });
    await switchUI(anna.page, A.bookId);

    // 1. AZ ELSŐ MŰHELYBEN VAN EGY VÁRAKOZÓ MEGHÍVÁS — és a Meghívások fülön látszik.
    const cim = 'csak-elso-ceg@example.test';
    await inviteUI(anna.page, { email: cim, role: 'user', scope: 'keszlet' });
    await gotoPage(anna.page, 'members');
    await anna.page.getByTestId('members-tab-invites').click();
    await expect(anna.page.getByTestId('invites-table')).toContainText(cim);

    // 2. ÁTVÁLTUNK A MÁSODIK MŰHELYRE, és az ÚJ lista válaszát KÉSLELTETJÜK.
    //    (Tudatos próba-feltétel: nem valódi hálózati hibát állítunk, hanem lassú választ.)
    await anna.page.route('**/api/invites/waiting**', async (route) => {
      await new Promise((r) => setTimeout(r, 2500));
      await route.continue();
    });
    await switchUI(anna.page, B.bookId);
    await gotoPage(anna.page, 'members');
    await expect(anna.page.getByTestId('header-workspace')).toContainText('Második Műhely Kft');
    await anna.page.getByTestId('members-tab-invites').click();

    // 3. A LELET: a MÁSODIK Műhely fejléce alatt SOHA, EGYETLEN pillanatban sem állhat az ELSŐ cég
    //    címzettje. A késleltetett válasz alatt VÉGIG mintát veszünk, nem csak egyszer nézünk rá.
    let latottRegiSor = false;
    let latottBetoltest = false;
    for (let i = 0; i < 16; i += 1) {
      const t = (await anna.page.getByTestId('main').textContent()) || '';
      if (t.includes(cim)) latottRegiSor = true;
      if (/Meghívások betöltése/i.test(t)) latottBetoltest = true;
      await anna.page.waitForTimeout(120);
    }
    expect(latottRegiSor).toBe(false);
    expect(latottBetoltest).toBe(true);

    // 4. POZITÍV ELLENPÁR: a válasz megérkezése után a MÁSODIK cég SAJÁT (üres) listája látszik.
    await anna.page.unroute('**/api/invites/waiting**');
    await anna.page.getByTestId('members-tab-members').click();
    await anna.page.getByTestId('members-tab-invites').click();
    await expect(anna.page.getByTestId('section-invites')).toContainText(/Nincs várakozó meghívás/i, { timeout: 20000 });
    expect((await anna.page.getByTestId('main').textContent()) || '').not.toContain(cim);
  } finally { await w.close(); }
});

test('R85/F85-03 — UGYANAZ a cég MINDKÉT felhasználónak ugyanazt a bemutatóadatot mutatja', async ({ browser }) => {
  const w = new World(browser, 'r8503');
  try {
    const anna = await w.person('anna');
    await createWorkspaceUI(anna.page, { name: 'Első Műhely Kft' });
    const B = await createWorkspaceUI(anna.page, { name: 'Második Műhely Kft' });
    // A MÁSODIK Műhely ANNÁNAK a második közös fiókja — BÉLÁNAK az ELSŐ lesz.
    const bela = await w.person('bela');
    const inv = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(bela.page, inv.link); await redeemUI(bela.page);
    await grantScopeUI(anna.page, bela.subjectId, 'keszlet');

    await switchUI(anna.page, B.bookId);
    const annaKeszlet = await stockUI(anna.page);
    expect(annaKeszlet.body.ok).toBe(true);
    const annaTabla = (await anna.page.getByTestId('stock-table').textContent()) || '';

    await bela.page.reload();
    await switchUI(bela.page, B.bookId);
    const belaKeszlet = await stockUI(bela.page);
    expect(belaKeszlet.body.ok).toBe(true);
    const belaTabla = (await bela.page.getByTestId('stock-table').textContent()) || '';

    // A LELET: Anna „Szenzormodul 120 db"-ot látott, Béla „Rögzítőelem M8 840 db"-ot — UGYANAZON
    // a fiókon. A mintacsomagot a FIÓKHOZ kell rögzíteni, nem a néző saját lista-sorrendjéhez.
    const termek = (t) => (/Szenzormodul/.test(t) ? 'B-csomag' : (/Rögzítőelem M8/.test(t) ? 'A-csomag' : 'ismeretlen'));
    expect(termek(belaTabla)).toBe(termek(annaTabla));
    expect(termek(annaTabla)).not.toBe('ismeretlen');

    // POZITÍV ELLENPÁR: a KÉT bemutató cég EGYMÁSTÓL eltérő csomagot kap (a váltás látható változás).
    const me = (await anna.api.get('/api/me')).body;
    const elso = me.workspaces.find((x) => x.name === 'Első Műhely Kft');
    await switchUI(anna.page, elso.book_id);
    await stockUI(anna.page);
    const elsoTabla = (await anna.page.getByTestId('stock-table').textContent()) || '';
    expect(termek(elsoTabla)).not.toBe(termek(annaTabla));
  } finally { await w.close(); }
});

test('R85/F85-04 — a VÉGREHAJTOTT, de elveszett válaszú levélkérésre a lap NEM állít hálózati kudarcot', async ({ browser }) => {
  const w = new World(browser, 'r8504');
  try {
    const c = await w.context();
    const api = apiOf(c.page);
    const email = w.email('dora');
    await registerUI(c.page, email);                       // megerősítésre VÁRÓ fiók
    await api.post('/dev/clock', { advance_ms: 120000 });  // az újrakérési korlát ne fedje el az ágat

    const elotte = ((await api.get('/dev/mailbox')).body.mails || []).length;

    await c.page.goto('/');
    await c.page.locator('[data-auth="resend"]').first().click();
    await expect(c.page.getByTestId('resend-email')).toBeVisible();
    await c.page.getByTestId('resend-email').fill(email);

    // A KÉRÉST TÉNYLEGESEN VÉGREHAJTJUK a szerveren, és CSAK a böngésző felé menő választ dobjuk el.
    await c.page.route('**/api/verification/resend', async (route) => {
      const res = await route.fetch();
      expect(res.status()).toBe(200);
      await route.abort('failed');
    });
    await c.page.getByTestId('resend-submit').click();

    // A LELET: a lap „Nem sikerült kapcsolatba lépni… Próbáld újra" szöveget írt — miközben a
    // kérés VÉGREHAJTÓDOTT. A böngésző kivétele NEM bizonyítja az írás elmaradását.
    await expect(c.page.getByTestId('resend-result')).toContainText('Nem tudjuk biztosan');
    expect((await c.page.getByTestId('resend-result').textContent()) || '').not.toContain('Nem sikerült kapcsolatba lépni');
    await expect(c.page.getByTestId('resend-email')).toHaveValue(email);       // a cím megmarad
    // A SZERVER OLDALÁN A LEVÉL TÉNYLEG MEGSZÜLETETT — ezt méri, hogy a lap állítása hamis lett volna.
    expect(((await api.get('/dev/mailbox')).body.mails || []).length).toBe(elotte + 1);

    // POZITÍV ELLENPÁR: a válasz átengedése után UGYANAZ a gomb a semleges levél-oldalra visz.
    await c.page.unroute('**/api/verification/resend');
    await api.post('/dev/clock', { advance_ms: 120000 });
    await c.page.getByTestId('resend-submit').click();
    await expect(c.page.getByTestId('resend-result')).toContainText('megerősítésre váró fiók');
  } finally { await w.close(); }
});

test('R85/F85-04/b — a kérés ÖT kimenete KÜLÖN mondat, és egyik sem állít többet a mértnél', async ({ browser }) => {
  const w = new World(browser, 'r8504b');
  try {
    const c = await w.context();
    const api = apiOf(c.page);
    const email = w.email('eszter');
    await registerUI(c.page, email);
    const nyitLevelKero = async () => {
      await c.page.goto('/');
      await c.page.locator('[data-auth="resend"]').first().click();
      await expect(c.page.getByTestId('resend-email')).toBeVisible();
      await c.page.getByTestId('resend-email').fill(email);
    };
    const eredmeny = async () => (await c.page.getByTestId('resend-result').textContent()) || '';

    // (1) MEGSZAKÍTOTT KÉRÉS — a böngésző nem tudja, eljutott-e: NEM ELDÖNTHETŐ.
    await api.post('/dev/clock', { advance_ms: 120000 });
    await nyitLevelKero();
    await c.page.route('**/api/verification/resend', (route) => route.abort('failed'));
    await c.page.getByTestId('resend-submit').click();
    await expect(c.page.getByTestId('resend-result')).toContainText('Nem tudjuk biztosan');
    expect(await eredmeny()).not.toContain('Nem sikerült kapcsolatba lépni');
    await c.page.unroute('**/api/verification/resend');

    // (2) VÉGREHAJTÁS UTÁN ELVESZETT VÁLASZ — ugyanaz a mondat, mert a böngésző ezt sem tudja.
    await api.post('/dev/clock', { advance_ms: 120000 });
    await nyitLevelKero();
    await c.page.route('**/api/verification/resend', async (route) => { await route.fetch(); await route.abort('failed'); });
    await c.page.getByTestId('resend-submit').click();
    await expect(c.page.getByTestId('resend-result')).toContainText('Nem tudjuk biztosan');
    await c.page.unroute('**/api/verification/resend');

    // (3) HIBÁS VÁLASZTEST — a szerver válaszolt, de nem értelmezhetően: szintén NEM ELDÖNTHETŐ.
    await api.post('/dev/clock', { advance_ms: 120000 });
    await nyitLevelKero();
    await c.page.route('**/api/verification/resend', (route) => route.fulfill({ status: 200, body: 'nem-json' }));
    await c.page.getByTestId('resend-submit').click();
    await expect(c.page.getByTestId('resend-result')).toContainText('Nem tudjuk biztosan');
    await c.page.unroute('**/api/verification/resend');

    // (4) NEVEZETT ELUTASÍTÁS — a szerver mondta ki, tehát a lap az OKÁT írja ki, nem bizonytalanságot.
    //
    // KIMONDVA, MIÉRT INJEKTÁLT A VÁLASZ: ez a végpont SZÁNDÉKOSAN semleges — MINDIG `ok: true`-t ad,
    // hogy ne áruljon el semmit a cím létezéséről (KUKA-084). Nevezett elutasítás tehát innen
    // fogalmilag nem jöhet; a KLIENS ágát ezért beadott válasszal mérjük. A végpont SAJÁT
    // semlegességét a `verify:app-findings` (R75) battéria méri, nem ez a sor.
    await api.post('/dev/clock', { advance_ms: 120000 });
    await nyitLevelKero();
    await c.page.route('**/api/verification/resend', (route) => route.fulfill({
      status: 429, contentType: 'application/json',
      body: JSON.stringify({ ok: false, reason: 'resend_rate_limited' }),
    }));
    await c.page.getByTestId('resend-submit').click();
    await expect(c.page.getByTestId('resend-result')).toContainText('Túl gyakran');
    expect(await eredmeny()).not.toContain('Nem tudjuk biztosan');
    await c.page.unroute('**/api/verification/resend');

    // (5) SIKER — a semleges levél-oldal CSAK itt születik.
    await api.post('/dev/clock', { advance_ms: 120000 });
    await nyitLevelKero();
    await c.page.getByTestId('resend-submit').click();
    await expect(c.page.getByTestId('resend-result')).toContainText('megerősítésre váró fiók');

    // (6) OLVASÁS, AMI EL SEM JUT: ott a hiány ELDÖNTHETŐ — semmit nem változtattunk.
    const anna = await w.person('anna');
    await createWorkspaceUI(anna.page, { name: 'Hálózat Kft' });
    await gotoPage(anna.page, 'stock');
    await anna.page.route('**/api/data/stock**', (route) => route.abort('failed'));
    await anna.page.getByTestId('data-stock-btn').click();
    await expect(anna.page.getByTestId('stock-network')).toBeVisible();
    // A MONDAT AZ R89-BEN SZŰKÜLT (az R87/R88 nevesített függője): korábban „Nem sikerült
    // kapcsolatba lépni…" és „a készletadatokat nem kérdeztük le" állt itt. Mindkettő TÁGABB volt a
    // bizonyíthatónál: a válasz elveszhetett akkor is, ha az olvasás lefutott. A mai alak azt állítja,
    // ami MÉRT — a betöltés nem sikerült —, és hozzáteszi, hogy a fiókban semmi nem változott.
    // A PRÓBA ÁLLÍTÁSA UGYANAZ MARADT: az OLVASÁS eldönthető hiány, tehát a lap kimondhatja (szemben
    // az ÍRÁS bizonytalan kimenetével, amit az (1)–(3) pont mér).
    await expect(anna.page.getByTestId('stock-network')).toContainText('A készletadatokat nem sikerült betölteni');
    await expect(anna.page.getByTestId('stock-network')).toContainText('Semmi nem változott');
    expect(await anna.page.getByTestId('stock-network').textContent()).not.toContain('Nem tudjuk biztosan');
    await anna.page.unroute('**/api/data/stock**');
  } finally { await w.close(); }
});
