// tests/e2e/v3app-r127.spec.mjs — A KÉSŐI ADATVÁLASZ AZ ÚJ MINTANÉZETEKEN (A121-07 utolsó hiánya).
//
// MIÉRT LÉTEZIK. Az R126-os jelentésemben az A121-07 RÉSZLEGES maradt: a „késői adatválasz"
// (visszatartott válasz megérkezése nézetváltás UTÁN) az R121-ben született HÁROM mintanézet-útra
// nem volt mérve — `/api/data/document`, `/api/data/supplier`, `/api/data/document-full`. A külső
// ellenőrző fél (chatgpt-v3, R127) ezt az EGY hiányt kérte pótolni, és a saját környezetében nem
// tudta megtenni (a Chromium futtatható állomány nincs telepítve nála).
//
// MIT MÉR, ÉS MIT NEM
//   · MÉR: a VALÓDI alkalmazás HTTP-válaszát visszatartjuk, közben a felület fiókot (E1–E3) vagy a
//     MÁSIK lap személyt (E4) vált, és a régi válasz CSAK az új kontextus megjelenése után érkezik
//     meg. Az állítás a TÉNYLEGES DOM-on és a fejléc kontextusán áll: sem régi ADAT, sem régi
//     ELUTASÍTÁS nem írhatja felül az új nézetet. Mindhárom végpont fedve, a dokumentum-lap KÉT
//     párhuzamos válasza MINDKÉT elengedési sorrendben.
//   · NEM ÁLLÍT ennél erősebb, AZONNALI védelmet: a mintanézet-lapok maguktól nem kérdezik újra a
//     szervert, tehát egy MÁSIK lapon történt személyváltás addig nem ismert, amíg a lap valamilyen
//     SZOKÁSOS alkalmazásúton nem szinkronizál. Az E4 pontosan azt méri MEG, MIKOR vált ismertté.
//
// A VISSZATARTÁS ESEMÉNNYEL SZINKRONIZÁLT, nem alvással (a parancs kikötése): a szerver már
// kiszolgálta a választ (`route.fetch()`), a lap viszont csak akkor kapja meg, amikor a próba
// elengedi (`release()`).
//
// SZINTETIKUS JELÖLŐT NEM TESZÜNK a válaszba: a régi és az új nézet VALÓDI különbségén mérünk — az
// egyik fiók `pro` (a minta KIADVA), a másik `starter` (a minta az ELŐFIZETÉS-kapun ELUTASÍTVA).
// Így a „régi adat szivárgott be" és a „régi elutasítás szivárgott be" irány is elválik egymástól,
// és a kötési meg jogosultsági mezők maradnak érintetlenek.
import { test, expect } from '@playwright/test';
import {
  World, PASSWORD, createWorkspaceUI, switchUI, header, gotoPage, loginUI, logoutUI,
  registerUI, verifyFromMailboxUI, openStockPage,
} from './helpers.mjs';

test.describe.configure({ mode: 'serial' });

/**
 * EGY ÚTVONAL VISSZATARTÁSA — a szerver KISZOLGÁLJA, a lap CSAK elengedésre kapja meg.
 *
 * Az illesztés FÜGGVÉNNYEL megy, nem glob-bal: a `/api/data/document` és a
 * `/api/data/document-full` út egymás prefixe, és egy `**\/api/data/document**` alakú minta
 * MINDKETTŐT elkapná — a mérés így a szomszéd végpontot igazolná (KUKA-239).
 */
async function holdRoute(page, pathname) {
  let release = null;
  const held = new Promise((r) => { release = r; });
  const state = { seen: 0, servedBody: null, releasedAt: null };
  await page.route((u) => u.pathname === pathname, async (route) => {
    state.seen += 1;
    if (state.seen === 1) {
      const response = await route.fetch();          // a szerver MÁR kiszolgálta a RÉGI nézetre
      state.servedBody = await response.text();
      await held;                                     // ESEMÉNY, nem alvás
      state.releasedAt = Date.now();
      await route.fulfill({ response, body: state.servedBody });
      return;
    }
    await route.continue();                           // a KÖVETKEZŐ kérés az ÚJ nézeté — átmegy
  });
  // A VISSZAADOTT OBJEKTUM NEM MÁSOLJA az állapotot (nincs `...state`): egy másolat a mérés
  // pillanatában lefagyott értéket vinne, és a próba a SAJÁT régi képét igazolná (KUKA-259).
  return { release: () => release(), get: () => state };
}

/** A minta-szakasz VÁRT állapota — várakozó állítással (KUKA-228). */
async function expectSample(page, kulcs, kiadva) {
  await expect(page.getByTestId(`sample-${kulcs}`)).toBeVisible();
  const cel = page.getByTestId(`sample-${kulcs}-${kiadva ? 'value' : 'denied'}`);
  await expect(cel).toBeVisible();
  return (await cel.textContent()) || '';
}

/**
 * A minta-szakasz ÜRES (betöltés) állapota — csak ott állítható, ahol az állapot TÉNYLEGESEN üres.
 *
 * MÉRT TÉNY, amiért ez nem használható mindenhol: a lap ELHAGYÁSA és újbóli megnyitása UGYANAZON a
 * kontextuson NEM üríti a mintákat (`state.samples` megmarad) — a panel a korábbi, UGYANARRA a
 * nézetre szóló adatot mutatja, amíg az új válasz meg nem jön. Ez helyes (nem idegen adat), de azt
 * jelenti, hogy az „üres panel" NEM bizonyítja a kérés folyamatban létét. A folyamatban létet a
 * VISSZATARTÁS állapota bizonyítja (`seen === 1` és `releasedAt === null`) — lásd `inFlight`.
 */
async function expectLoading(page, kulcs) {
  await expect(page.getByTestId(`sample-${kulcs}`)).toBeVisible();
  await expect(page.getByTestId(`sample-${kulcs}-value`)).toHaveCount(0);
  await expect(page.getByTestId(`sample-${kulcs}-denied`)).toHaveCount(0);
}

/**
 * A KÉRÉS KIMENT, A SZERVER KISZOLGÁLTA, ÉS A VÁLASZ MÉG VISSZA VAN TARTVA — ez a „folyamatban"
 * bizonyítéka. VÁRAKOZÓ állítás: a navigáció visszatérése után a route-kezelő még a `route.fetch()`
 * belsejében lehet, tehát egyszeri mintavétel a saját versenyhelyzetét mérné (KUKA-228 · KUKA-120).
 */
async function inFlight(h, nev) {
  await expect.poll(() => h.get().servedBody !== null,
    { message: `${nev}: a szerver kiszolgálta a visszatartott kérést`, timeout: 10000 }).toBe(true);
  expect(h.get().seen, `${nev}: pontosan egy kérés ment ki`).toBe(1);
  expect(h.get().releasedAt, `${nev}: a válasz még VISSZA VAN TARTVA`).toBeNull();
}

/** A dokumentum-lap újbóli megnyitása — a mintákat EZ kérdezi le újra (a rajzolás nem kérdez). */
async function ujraNyit(page, cel) {
  await gotoPage(page, cel === 'documents' ? 'partners' : 'documents');
  await gotoPage(page, cel);
}

test.describe('R127 — késői adatválasz az új mintanézeteken', () => {
  let w; let anna; let PRO; let STARTER;

  test.beforeAll(async ({ browser }) => {
    w = new World(browser, `r127-${Date.now().toString(36)}`);
    anna = await w.person('anna');
    PRO = await createWorkspaceUI(anna.page, {
      name: 'R127 PRO', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '32345672-2-42' } });
    STARTER = await createWorkspaceUI(anna.page, {
      name: 'R127 STARTER', plan: 'starter', business: { jurisdiction: 'HU', tax_id: '22345674-2-42' } });
  });

  test.afterAll(async () => { await w.close(); });

  test('R127-E1 — a régi KIADOTT válasz nem írja felül az új ELUTASÍTOTT nézetet (fejléc → vegyes sorrend)', async () => {
    const page = anna.page;
    await switchUI(page, PRO.bookId);
    await gotoPage(page, 'documents');
    // KONTROLL-KÉP: a `pro` fiókban mindkét minta KIADVA.
    const elotte = await expectSample(page, 'document', true);
    expect(elotte).toContain('BEJ-2026-0042');
    await expectSample(page, 'document-full', true);

    // A KÉT PÁRHUZAMOS KÉRÉST VISSZATARTJUK, és újra megnyitjuk a lapot.
    const hDoc = await holdRoute(page, '/api/data/document');
    const hFull = await holdRoute(page, '/api/data/document-full');
    await ujraNyit(page, 'documents');
    await inFlight(hDoc, 'fejléc');
    await inFlight(hFull, 'vegyes');
    // A VISSZATARTOTT VÁLASZ A RÉGI NÉZETRE SZÓL, és KIADOTT — ezt a szerver törzse mondja.
    expect(JSON.parse(hDoc.get().servedBody).ok).toBe(true);
    expect(JSON.parse(hDoc.get().servedBody).served_book_id).toBe(PRO.bookId);

    // FIÓKVÁLTÁS a szokásos úton, MIELŐTT a régi válasz megérkezne.
    //
    // MÉRT TÉNY, amit itt ki kell mondani: a váltás SZÁNDÉKOSAN az áttekintésre visz és ÜRÍT
    // (`switchWorkspace` → `newContext` + `resetViewCaches`, majd `state.page = 'overview'`) —
    // „előbb ürít, aztán kér". Ezért a régi válasz olyan nézetbe érkezik, ahol a minta-szakasz
    // nincs is kirajzolva; a védelem tehát KÉT ténnyel áll: a nézet-nemzedék LÉPETT, és a lap MÁS.
    await switchUI(page, STARTER.bookId);
    await expect(page.getByTestId('header-workspace')).toContainText('R127 STARTER');
    await expect(page.getByTestId('sample-document')).toHaveCount(0);

    // ELENGEDÉS: ELŐBB a fejléc, UTÁNA a vegyes (az egyik sorrend).
    hDoc.release();
    hFull.release();
    await expect.poll(() => hDoc.get().releasedAt !== null && hFull.get().releasedAt !== null,
      { message: 'mindkét visszatartott válasz elengedve', timeout: 10000 }).toBe(true);

    // (1) A RÉGI VÁLASZ NEM RAJZOL: se minta-szakasz, se a régi bizonylatszám nem jelenik meg.
    await expect(page.getByTestId('sample-document')).toHaveCount(0);
    await expect(page.getByTestId('sample-document-full')).toHaveCount(0);
    expect((await page.locator('main').textContent()) || '').not.toContain('BEJ-2026-0042');
    expect((await header(page)).workspace).toContain('R127 STARTER');

    // (2) ÉS AZ ÚJ NÉZET A SAJÁT IGAZSÁGÁT MUTATJA: a `starter` fiókban a bizonylat-nézet az
    //     ELŐFIZETÉS-kapun zár — a régi KIADOTT adat nem írta felül.
    await gotoPage(page, 'documents');
    const uj = await expectSample(page, 'document', false);
    expect(await page.getByTestId('sample-document-denied').getAttribute('data-gate')).toBe('entitlement');
    await expectSample(page, 'document-full', false);
    expect(uj).not.toContain('BEJ-2026-0042');
    await expect(page.getByTestId('sample-document-value')).toHaveCount(0);
    await expect(page.getByTestId('sample-document-full-value')).toHaveCount(0);
    expect((await page.locator('main').textContent()) || '').not.toContain('BEJ-2026-0042');
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    console.log('[R127-E1] visszatartott KIADOTT válasz elengedve fiókváltás után → az új nézet ELUTASÍTOTT maradt');
  });

  test('R127-E2 — a régi ELUTASÍTÁS nem írja felül az új KIADOTT nézetet (vegyes → fejléc sorrend)', async () => {
    const page = anna.page;
    await switchUI(page, STARTER.bookId);
    await gotoPage(page, 'documents');
    await expectSample(page, 'document', false);

    const hDoc = await holdRoute(page, '/api/data/document');
    const hFull = await holdRoute(page, '/api/data/document-full');
    await ujraNyit(page, 'documents');
    await inFlight(hDoc, 'fejléc');
    await inFlight(hFull, 'vegyes');
    // A VISSZATARTOTT VÁLASZ MOST ELUTASÍTÁS — a másik irány.
    expect(JSON.parse(hDoc.get().servedBody).ok).toBe(false);
    expect(JSON.parse(hDoc.get().servedBody).refused_by).toBe('entitlement');

    await switchUI(page, PRO.bookId);
    await expect(page.getByTestId('header-workspace')).toContainText('R127 PRO');
    await expect(page.getByTestId('sample-document')).toHaveCount(0);

    // ELENGEDÉS FORDÍTOTT SORRENDBEN: ELŐBB a vegyes, UTÁNA a fejléc (a parancs kikötése).
    hFull.release();
    hDoc.release();
    await expect.poll(() => hDoc.get().releasedAt !== null && hFull.get().releasedAt !== null,
      { message: 'mindkét visszatartott válasz elengedve', timeout: 10000 }).toBe(true);
    await expect(page.getByTestId('sample-document')).toHaveCount(0);

    // AZ ÚJ NÉZET A SAJÁT IGAZSÁGÁT MUTATJA: a `pro` fiókban KIADVA — a régi ELUTASÍTÁS nem
    // írta felül, és nem is „ragadt be" elutasításként.
    await gotoPage(page, 'documents');
    const uj = await expectSample(page, 'document', true);
    expect(uj).toContain('BEJ-2026-0042');
    await expectSample(page, 'document-full', true);
    await expect(page.getByTestId('sample-document-denied')).toHaveCount(0);
    await expect(page.getByTestId('sample-document-full-denied')).toHaveCount(0);
    expect((await header(page)).workspace).toContain('R127 PRO');
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    console.log('[R127-E2] visszatartott ELUTASÍTÁS elengedve fiókváltás után → az új nézet KIADOTT maradt');
  });

  test('R127-E3 — ugyanez a beszállítói mintán (/api/data/supplier)', async () => {
    const page = anna.page;
    await switchUI(page, PRO.bookId);
    await gotoPage(page, 'partners');
    await expectSample(page, 'supplier', true);

    const hSupp = await holdRoute(page, '/api/data/supplier');
    await ujraNyit(page, 'partners');
    await inFlight(hSupp, 'beszállító');
    expect(JSON.parse(hSupp.get().servedBody).ok).toBe(true);

    await switchUI(page, STARTER.bookId);
    await expect(page.getByTestId('header-workspace')).toContainText('R127 STARTER');
    await expect(page.getByTestId('sample-supplier')).toHaveCount(0);
    hSupp.release();
    await expect.poll(() => hSupp.get().releasedAt !== null,
      { message: 'a visszatartott válasz elengedve', timeout: 10000 }).toBe(true);
    await expect(page.getByTestId('sample-supplier')).toHaveCount(0);

    await gotoPage(page, 'partners');
    await expectSample(page, 'supplier', false);
    await expect(page.getByTestId('sample-supplier-value')).toHaveCount(0);
    expect((await header(page)).workspace).toContain('R127 STARTER');
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    console.log('[R127-E3] a beszállítói minta késői válasza sem írta felül az új nézetet');
  });

  test('R127-E4 — SZEMÉLYVÁLTÁS a másik lapon: mikor vált ismertté az új személy', async () => {
    const page = anna.page;
    await switchUI(page, PRO.bookId);
    await gotoPage(page, 'documents');
    await expectSample(page, 'document', true);

    const hDoc = await holdRoute(page, '/api/data/document');
    await ujraNyit(page, 'documents');
    await inFlight(hDoc, 'fejléc');
    expect(JSON.parse(hDoc.get().servedBody).ok).toBe(true);

    // MÁSIK LAP, UGYANAZ A BÖNGÉSZŐ-KONTEXTUS (közös süti): ÚJ SZEMÉLY lép be.
    const masik = await anna.ctx.newPage();
    await masik.goto('/');
    await logoutUI(masik);
    const belaEmail = `${w.tag}.bela@pelda.hu`;
    await registerUI(masik, belaEmail);
    await verifyFromMailboxUI(masik, belaEmail);
    await loginUI(masik, belaEmail, PASSWORD);

    // MÉRÉS: A LAP MÉG NEM TUDJA. A mintanézet-lapok maguktól nem kérdezik újra a szervert —
    // ez MÉRT tény, nem hiányosság-vallomás: az azonnali tudás CSAK cross-tab csatornával vagy
    // folyamatos kérdezéssel lenne meg, és a parancs kifejezetten tiltja az ennél erősebb állítást.
    const fejlecElotte = (await header(page)).subject;
    expect(fejlecElotte, 'a lap MÉG anna nézetét mutatja').toContain('anna');

    // A SZOKÁSOS ALKALMAZÁSÚT, AMIN A LAP ÉSZLELI — ÉS EZ A MÉRÉS TÁRGYA.
    //
    // MÉRT TÉNY: a felhasználó a készlet-lapra lép. A lap első lekérése a MEGNYITÁSKORI (régi)
    // alanyt viszi a kérés törzsében, a szerver pedig a KONTEXTUS-KAPUN utasítja el (HTTP 409,
    // `context_mismatch`) — a lap EBBŐL tudja meg, hogy más ember van bent. Tehát nem egy külön
    // „figyelő" jelez, hanem az első olyan kérés, amit a lap magától elindít.
    const ctxValasz = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/data/stock', { timeout: 15000 }).catch(() => null);
    await page.getByTestId('nav-stock').click();
    const eszleles = await ctxValasz;
    const eszlelesStatus = eszleles ? eszleles.status() : null;
    let eszlelesIndok = null;
    try { eszlelesIndok = eszleles ? (await eszleles.json()).reason ?? null : null; } catch { eszlelesIndok = null; }
    await expect(page.getByTestId('header-subject')).not.toContainText('anna');
    await expect(page.getByTestId('global-notice')).toBeVisible();
    const ertesites = (await page.getByTestId('global-notice').textContent()) || '';
    const fejlecUtana = (await header(page)).subject;
    expect(eszlelesStatus, 'a kontextus-kapu utasította el a régi alanyú kérést').toBe(409);
    expect(eszlelesIndok).toBe('context_mismatch');
    console.log(`[R127-E4] az új személy ITT vált ismertté: a készlet-lap első lekérése HTTP ${eszlelesStatus} `
      + `(${eszlelesIndok}) · értesítés: „${ertesites.trim()}" · fejléc: ${fejlecUtana.trim()}`);
    console.log('[R127-E4] AMIT EZ NEM ÁLLÍT: azonnali, kérés nélküli védelmet. A mintanézet-lapok maguktól '
      + 'nem kérdezik újra a szervert; az új személy akkor válik ismertté, amikor a lap a szokásos '
      + 'úton legközelebb kérdez.');

    // ÉS CSAK EZUTÁN érkezik meg a RÉGI válasz.
    hDoc.release();

    // A RÉGI SZEMÉLY ADATA SEHOL — sem ezen a lapon, sem a bizonylat-lapon, ha az új személynek
    // egyáltalán elérhető. A FELTÉTEL NEM KIBÚVÓ: az új személy nézetében a bizonylat-lap léte a
    // SAJÁT jogosultságától függ, és a próba nem tehet úgy, mintha ez adott lenne (KUKA-041).
    expect((await page.locator('main').textContent()) || '').not.toContain('BEJ-2026-0042');
    await expect(page.getByTestId('sample-document-value')).toHaveCount(0);
    const vanBizonylatLap = await page.getByTestId('nav-documents').count() > 0;
    if (vanBizonylatLap) {
      await gotoPage(page, 'documents');
      await expect(page.getByTestId('sample-document-value')).toHaveCount(0);
      expect((await page.locator('main').textContent()) || '').not.toContain('BEJ-2026-0042');
    }
    console.log(`[R127-E4] a bizonylat-lap az ÚJ személy nézetében ${vanBizonylatLap ? 'elérhető — ott is ellenőrizve' : 'NEM elérhető (a saját jogosultsága szerint) — a mérés ezt kimondja'}`);
    expect((await header(page)).subject).not.toContain('anna');
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await masik.close();
    // A KÖVETKEZŐ PRÓBÁHOZ visszaadjuk a lapot Annának.
    await logoutUI(page);
    await loginUI(page, anna.email, PASSWORD);
  });

  test('R127-E6 — a HATÁR MEGMÉRVE: mi történik, ha a régi válasz az ÉSZLELÉS ELŐTT érkezik', async () => {
    const page = anna.page;
    await switchUI(page, PRO.bookId);
    await gotoPage(page, 'documents');
    await expectSample(page, 'document', true);

    const hDoc = await holdRoute(page, '/api/data/document');
    await ujraNyit(page, 'documents');
    await inFlight(hDoc, 'fejléc');

    // MÁSIK LAP: ÚJ SZEMÉLY lép be — a lap NEM tud róla.
    const masik = await anna.ctx.newPage();
    await masik.goto('/');
    await logoutUI(masik);
    const cilliEmail = `${w.tag}.cilli@pelda.hu`;
    await registerUI(masik, cilliEmail);
    await verifyFromMailboxUI(masik, cilliEmail);
    await loginUI(masik, cilliEmail, PASSWORD);

    // ÉS MOST ELENGEDJÜK — MÉG AZELŐTT, hogy a lap bármit kérdezett volna.
    hDoc.release();
    await expect.poll(() => hDoc.get().releasedAt !== null, { timeout: 10000 }).toBe(true);
    await page.waitForTimeout(0);   // csak a mikrotaszk-sor kiürítése; NEM időzített várakozás

    // MÉRÉS, NEM ÍTÉLET: kirajzolódott-e a RÉGI válasz ebben az ÁTMENETI állapotban?
    const megjelent = await page.getByTestId('sample-document-value').count() > 0;
    const fejlec = (await header(page)).subject;
    console.log(`[R127-E6] a régi válasz az ÉSZLELÉS ELŐTT érkezett · kirajzolódott: ${megjelent} · `
      + `a lap fejléce ekkor még: ${fejlec.trim()}`);

    // AMIT EZ JELENT, KIMONDVA. A válasz a RÉGI alanynak, a RÉGI nézetébe, a RÉGI fiók adatával
    // érkezett — a lap ekkor MÉG joggal hiszi, hogy ő az. Ez NEM idegen adat idegen nézetben: a
    // rendszer nem tud a másik fül belépéséről, amíg nem kérdez. Erősebb, AZONNALI védelem csak
    // cross-tab csatornával vagy folyamatos kérdezéssel lenne — az R127 kifejezetten tiltja, hogy
    // ennél erősebbet állítsunk. A védelem KÖVETKEZŐ pontja a szokásos alkalmazásút (E4).
    expect(fejlec).toContain('anna');

    // ÉS A HELYREÁLLÁS MÉRVE: az első szokásos lekérés után a régi adat ELTŰNIK.
    const ctxValasz = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/data/stock', { timeout: 15000 }).catch(() => null);
    await page.getByTestId('nav-stock').click();
    const eszleles = await ctxValasz;
    await expect(page.getByTestId('header-subject')).not.toContainText('anna');
    await expect(page.getByTestId('sample-document-value')).toHaveCount(0);
    expect((await page.locator('main').textContent()) || '').not.toContain('BEJ-2026-0042');
    console.log(`[R127-E6] helyreállás: az első szokásos lekérés (HTTP ${eszleles ? eszleles.status() : '—'}) után `
      + 'a régi adat eltűnt, és a fejléc az ÚJ személyt mutatja');

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await masik.close();
    await logoutUI(page);
    await loginUI(page, anna.email, PASSWORD);
  });

  test('R127-E5 — POZITÍV KONTROLL: változatlan kontextusban a késleltetve elengedett válasz MEGJELENIK', async () => {
    const page = anna.page;
    await switchUI(page, PRO.bookId);
    await gotoPage(page, 'documents');

    const hDoc = await holdRoute(page, '/api/data/document');
    const hFull = await holdRoute(page, '/api/data/document-full');
    const hSupp = await holdRoute(page, '/api/data/supplier');
    // AZ OLDAL ÚJRATÖLTÉSE (szokásos felhasználói művelet) ÜRESRE állítja a minta-állapotot, tehát
    // az „üres panel" itt VALÓBAN a folyamatban lévő kérést jelenti — és a kontextus VÁLTOZATLAN.
    await page.reload();
    await expect(page.getByTestId('header-workspace')).toContainText('R127 PRO');
    await gotoPage(page, 'documents');
    await inFlight(hDoc, 'fejléc');
    await inFlight(hFull, 'vegyes');
    await expectLoading(page, 'document');
    await expectLoading(page, 'document-full');

    // SEMMI NEM VÁLTOZIK: se fiók, se személy. A késleltetés UTÁN a jogosult válasz MEGJELENIK —
    // tehát az E1–E4 üressége NEM hibás fixture-ből vagy el sem engedett kérésből jön (KUKA-051).
    hDoc.release();
    hFull.release();
    const kiadva = await expectSample(page, 'document', true);
    expect(kiadva).toContain('BEJ-2026-0042');
    await expectSample(page, 'document-full', true);

    // ÉS A BESZÁLLÍTÓI ÚT IS: a partnerek lapon, ugyanígy késleltetve.
    await gotoPage(page, 'partners');
    await inFlight(hSupp, 'beszállító');
    await expectLoading(page, 'supplier');
    hSupp.release();
    await expectSample(page, 'supplier', true);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    console.log('[R127-E5] pozitív kontroll: mindhárom végpont késleltetve elengedett válasza MEGJELENT');
  });
});
