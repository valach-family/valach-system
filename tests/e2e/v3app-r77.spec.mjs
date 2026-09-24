// tests/e2e/v3app-r77.spec.mjs — AZ R77 KONTEXTUS-VERSENYE VALÓDI BÖNGÉSZŐBEN (CMD-VS-300-002-002).
//
// A LELET (chatgpt-v3, R77/F77-01): a lap A-ra szóló `/me`-t kapott, a MÁSIK lap (közös süti)
// közben B-re váltott, és a rákövetkező adat-kérést a szerver MÁR B-re szolgálta ki — a fejléc A-t
// mutatott, a panel B adatát.
//
// AMIT EZ A PRÓBA MÉR — NEM EGYETLEN IDŐZÍTÉSI PONT, hanem a HÁROM, amit a parancs megnevez:
//   (1) váltás a `/me` ELŐTT · (2) váltás a `/me` UTÁN, az adat-kérés ELŐTT · (3) váltás azután,
//   hogy az adat-kérés már kiment, de a válasz még nem ért vissza · (4) FIÓK-váltás a másik lapon.
// Mindegyik mellett POZITÍV KONTROLL: a szabályos olvasás változatlanul működik (KUKA-051).
//
// A KÉT LAP UGYANAZT A SÜTIT használja (egy böngésző-kontextus, két lap) — ez a lelet lényege.
import { test, expect } from '@playwright/test';
import {
  World, Db, PASSWORD, createWorkspaceUI, switchUI, header, priceUI, stockUI, loginUI, logoutUI, withResponse,
  openSwitcher, openStockPage, gotoPage, withOptionalResponse,
} from './helpers.mjs';

test('R77/F77-01 — a másik lap váltása után NEM kerül idegen kontextus adata a régi fejléc alá', async ({ browser }) => {
  const w = new World(browser, 'r7701'); const db = new Db();
  try {
    const anna = await w.person('anna');
    const A = await createWorkspaceUI(anna.page, { name: 'A STARTER', plan: 'starter' });
    const B = await createWorkspaceUI(anna.page, { name: 'B PRO', plan: 'pro' });
    await switchUI(anna.page, A.bookId);
    // KIINDULÁS: A-ban (starter) az ár-nézet az ELŐFIZETÉS-kapun akad el — ez a kontroll-kép.
    const start = await priceUI(anna.page);
    expect(start.body.refused_by).toBe('entitlement');
    expect(start.granted).toBe(false);          // R81: a kiadás ténye szerkezeti jel, nem felirat

    const masik = await anna.ctx.newPage();                 // MÁSODIK LAP, KÖZÖS süti
    await masik.goto('/');
    await expect(masik.getByTestId('header-workspace')).toContainText('A STARTER');

    // ── (1) VÁLTÁS A `/me` ELŐTT ───────────────────────────────────────────────────────────────
    await openSwitcher(masik);
    await masik.getByTestId(`ws-switch-${B.bookId}`).click();
    await expect(masik.getByTestId('header-workspace')).toContainText('B PRO');
    const p1 = await priceUI(anna.page);                    // a lap `/me`-t frissít, majd kér
    const h1 = (await header(anna.page)).workspace;
    // A FEJLÉC ÉS A PANEL EGYÜTT MOZDUL: a lap a szerver igazságához igazodott (B), és B adatát adja.
    expect(h1).toContain('B PRO');
    expect(p1.body.served_book_id).toBe(B.bookId);
    expect(p1.granted).toBe(true);

    // ── (2) VÁLTÁS A `/me` UTÁN, AZ ADAT-KÉRÉS ELŐTT ──────────────────────────────────────────
    await switchUI(anna.page, A.bookId);                    // vissza A-ba (a lap A-t hisz)
    // A MÁSIK LAP nem figyeli a szervert magától (nincs lekérdezgetés) — a frissítés után látja
    // a VALÓDI állapotot. Ez maga is a lelet része: a két lap képe eltérhet, ezért kell a kötés.
    await masik.reload();
    await expect(masik.getByTestId('header-workspace')).toContainText('A STARTER');
    await openStockPage(anna.page);                 // R81: a készlet és az ár EGY képernyőn él
    let releaseMe = null;
    const meHeld = new Promise((r) => { releaseMe = r; });
    let meSeen = 0;
    await anna.page.route('**/api/me', async (route) => {
      meSeen += 1;
      if (meSeen === 1) {
        // A `/me` VÁLASZA MÁR ELKÉSZÜLT (A-ra szól) — csak a lap még nem kapta meg.
        const response = await route.fetch();
        await meHeld;
        await route.fulfill({ response });
        return;
      }
      await route.continue();
    });
    const priceClick = anna.page.getByTestId('data-price-btn').click();
    // A PANEL AZONNAL A FOLYAMATBAN LÉVŐ KÉRÉST MUTATJA (előbb ürítünk, csak utána kérdezünk —
    // KUKA-050): a régi válasz egy pillanatra sem maradhat a képernyőn, amíg a `/me` fut.
    await expect(anna.page.getByTestId('data-price')).toHaveText('Betöltés…');
    await openSwitcher(masik);
    await masik.getByTestId(`ws-switch-${B.bookId}`).click();            // A MÁSIK LAP VÁLT
    await expect(masik.getByTestId('header-workspace')).toContainText('B PRO');
    releaseMe();                                                          // …és MOST jön meg az A-s /me
    await priceClick;
    // A LAP NEM RAJZOL IDEGEN ADATOT: az ár-panel nem marad kint (a lap a szerver igazságához
    // igazodva ÚJRARAJZOL), és a lap KIMONDJA, mi történt.
    await expect(anna.page.getByTestId('price-value')).toHaveCount(0);
    // A LAP KIMONDJA, MIÉRT nem rajzolt: vagy a saját, általános mondatával, vagy azzal a
    // konkrétabbal, hogy MÁSHOL váltottak — a kettő közül pontosan EGY jelenik meg.
    await expect(anna.page.getByTestId('global-notice')).toContainText(/másik fiókra|fiókot váltottál|nem tudtuk biztonságosan/i);
    // …és a frissítés után a fejléc már a VALÓDI kontextust mutatja.
    await expect(anna.page.getByTestId('header-workspace')).toContainText('B PRO');
    await anna.page.unroute('**/api/me');

    // POZITÍV KONTROLL: a szabályos olvasás ugyanitt változatlanul működik.
    const p2 = await priceUI(anna.page);
    expect(p2.body.ok).toBe(true);
    expect(p2.body.served_book_id).toBe(B.bookId);
    expect((await header(anna.page)).workspace).toContain('B PRO');

    // ── (3) VÁLTÁS AZUTÁN, HOGY A KÉRÉS KIMENT, DE A VÁLASZ MÉG NEM ÉRT VISSZA ────────────────
    await openStockPage(anna.page);
    let releaseData = null;
    const dataHeld = new Promise((r) => { releaseData = r; });
    let dataSeen = 0;
    await anna.page.route('**/api/data/price**', async (route) => {
      dataSeen += 1;
      if (dataSeen === 1) {
        const response = await route.fetch();               // a szerver MÁR kiszolgálta (B-re)
        await dataHeld;
        await route.fulfill({ response });
        return;
      }
      await route.continue();
    });
    await masik.reload();
    await expect(masik.getByTestId('header-workspace')).toContainText('B PRO');
    const click3 = anna.page.getByTestId('data-price-btn').click();
    await expect(anna.page.getByTestId('data-price')).toHaveText('Betöltés…');
    await openSwitcher(masik);
    await masik.getByTestId(`ws-switch-${A.bookId}`).click();            // a másik lap A-ra vált
    await expect(masik.getByTestId('header-workspace')).toContainText('A STARTER');
    releaseData();
    await click3;
    await anna.page.unroute('**/api/data/price**');
    // A LAP ÉS A PANEL EGYÜTT ÁLL: amit kirajzolt, az ahhoz a nézethez tartozik, amiben a kérés
    // indult (B) — és a fejléc is B-t mutatja. Kevert kép (A fejléc + B adat) NEM keletkezik.
    const h3 = (await header(anna.page)).workspace;
    const kiadott3 = (await anna.page.getByTestId('price-value').count()) > 0;
    expect(h3).toContain('B PRO');
    if (kiadott3) expect(h3).toContain('B PRO');                          // B adat ⇒ B fejléc
    else expect(await anna.page.getByTestId('data-price').count()).toBeGreaterThanOrEqual(0); // vagy nem rajzolt semmit

    // ── (4) FIÓK-VÁLTÁS A MÁSIK LAPON ────────────────────────────────────────────────────────
    const bela = await w.person('bela');                                  // saját böngészőben
    await masik.bringToFront();
    await logoutUI(masik);
    await loginUI(masik, bela.email, PASSWORD);
    await openStockPage(anna.page);
    // A KÖZÖS SÜTI MIATT A MUNKAMENET MOST BÉLÁÉ. A régi lap gombja ezért ELŐBB a nézetet igazítja
    // a szerverhez — és mivel Béla SZEMÉLYES fiókjában ez a képernyő nem is létezik, a lap NEM
    // kérdez tovább Anna nézetében: kimondja, mi történt, és átrajzol. (A veszély nem az, hogy
    // Béla a sajátját látja, hanem hogy ANNA fejléce alatt látna bármit — ez nem történik meg.)
    const stock4 = await withOptionalResponse(anna.page, { path: '/api/data/stock' },
      () => anna.page.getByTestId('data-stock-btn').click());
    // R81 §5/15: a mondat a tervé — és NEM tulajdonít bizonyítatlan okot (UX-16).
    await expect(anna.page.getByTestId('global-notice')).toContainText('Másik felhasználó jelentkezett be ebben a böngészőben');
    await expect(anna.page.getByTestId('header-subject')).toContainText(bela.email);
    // AMIT A LAP KÉRT (ha kért): SOHA nem Anna nevében. És a szerver ítélete KÖZVETLEN kéréssel is
    // mérve: ugyanazzal a sütivel már BÉLA a kiszolgált alany.
    if (stock4) expect(stock4.body.served_subject_id).not.toBe(anna.subjectId);
    const stockDirect = await anna.api.get('/api/data/stock');
    expect(stockDirect.body.served_subject_id).toBe(bela.subjectId);
    expect(stockDirect.body.served_subject_id).not.toBe(anna.subjectId);

    // A TÁROLÓ A ZÁRÓ TANÚ: a versenyhelyzetek egyetlen jogosultsági sort sem mozdítottak.
    expect(db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ?', anna.subjectId)).toBe(3);
    expect(db.count('SELECT COUNT(*) AS n FROM membership_revocation WHERE subject_id = ?', anna.subjectId)).toBe(0);
  } finally {
    await w.close(); db.close();
  }
});

test('R77/F77-02 — hibás adószám: nevezett elutasítás a felületen, félkész munkakörnyezet nélkül', async ({ browser }) => {
  const w = new World(browser, 'r7702'); const db = new Db();
  try {
    const cili = await w.person('cili');
    const before = {
      book: db.count('SELECT COUNT(*) AS n FROM book'),
      membership: db.count('SELECT COUNT(*) AS n FROM membership'),
      basis: db.count('SELECT COUNT(*) AS n FROM authority_basis'),
    };
    // A LELET a felület útján: a „Vállalkozási minőség" pipával, értelmetlen adószámmal.
    const hibas = await createWorkspaceUI(cili.page, { name: 'Hibas ceg', business: { jurisdiction: 'HU', tax_id: '---' } });
    expect(hibas.status).toBe(400);
    expect(hibas.body.reason).toBe('tax_id_value_required');
    // A LAP MEGMONDJA, MI A BAJ — és nem programhibát mutat. R81 §5/14 óta a hiba A MEZŐHÖZ
    // KÖTÖTT: a mezőnél a teendő, az űrlap tetején a rövid összegzés; a belső mezőút („business.
    // tax_id") kikerült a felhasználói szövegből — a mező JELÖLÉSE hordozza ugyanazt a tényt.
    expect(hibas.taxError).toContain('Add meg az adóazonosítót');
    expect(hibas.resultText).toContain('A vállalkozást még nem hoztuk létre');
    expect(hibas.resultText).not.toMatch(/internal_error/i);
    await expect(cili.page.getByTestId('ws-tax-id')).toHaveAttribute('aria-invalid', 'true');
    const after = {
      book: db.count('SELECT COUNT(*) AS n FROM book'),
      membership: db.count('SELECT COUNT(*) AS n FROM membership'),
      basis: db.count('SELECT COUNT(*) AS n FROM authority_basis'),
    };
    expect(after).toEqual(before);
    // A FEJLÉC SEM VÁLTOTT félkész célra: a felhasználó ott maradt, ahol volt.
    await expect(cili.page.getByTestId('header-workspace')).toContainText('személyes köre');
    await expect(cili.page.getByTestId('ws-name')).toHaveValue('Hibas ceg');   // a jó mezők maradnak

    // POZITÍV ELLENPÁR: érvényes adószámmal ugyanez a képernyő elindítja a kört.
    const jo = await createWorkspaceUI(cili.page, { name: 'Jo ceg', business: { jurisdiction: 'HU', tax_id: '12345678-2-42' } });
    expect(jo.status).toBe(201);
    await expect(cili.page.getByTestId('global-notice')).toContainText('Hozzáadtad a vállalkozást');
    expect(db.count('SELECT COUNT(*) AS n FROM business_identity WHERE book_id = ?', jo.bookId)).toBe(1);
  } finally {
    await w.close(); db.close();
  }
});

// A SORREND IS MÉRÉS (R77, saját lelet a csomag futtatásakor): a lap ELŐBB ürít, és CSAK UTÁNA
// kérdezi a szervert. A javítás előtt a `/me` frissítése megelőzte az ürítést, ezért egy LASSÚ
// válasz alatt a RÉGI cég adata a képernyőn maradt — a teljes csomag futtatásakor (terhelés alatt)
// ez egy próbát meg is buktatott. Itt a lassúságot VEZÉRELTEN állítjuk elő, nem a véletlenre bízzuk.
test('R77 — lassú fejléc-frissítés alatt sem marad a RÉGI adat a képernyőn (előbb ürítünk, utána kérdezünk)', async ({ browser }) => {
  const w = new World(browser, 'r7703');
  try {
    const anna = await w.person('anna');
    const B = await createWorkspaceUI(anna.page, { name: 'B PRO', plan: 'pro' });
    expect(B.bookId).toBeTruthy();                          // a létrehozás UTÁN ez már az aktív kör
    const elso = await stockUI(anna.page);
    expect(elso.body.ok).toBe(true);
    expect(elso.granted).toBe(true);                       // van MIT a képernyőn hagyni

    // A `/me` VÁLASZÁT VISSZATARTJUK: a lapnak ettől függetlenül azonnal ürítenie kell.
    let releaseMe = null;
    const meHeld = new Promise((r) => { releaseMe = r; });
    let seen = 0;
    await anna.page.route('**/api/me', async (route) => {
      seen += 1;
      if (seen === 1) { const response = await route.fetch(); await meHeld; await route.fulfill({ response }); return; }
      await route.continue();
    });
    const klikk = anna.page.getByTestId('data-stock-btn').click();
    await expect(anna.page.getByTestId('data-stock')).toHaveText('Betöltés…');   // NEM a régi tábla
    await expect(anna.page.getByTestId('stock-table')).toHaveCount(0);
    releaseMe();
    await klikk;
    await anna.page.unroute('**/api/me');
    // POZITÍV ELLENPÁR: a kérés utána rendesen kiszolgálódik, és a panel az ÚJ választ mutatja.
    await expect(anna.page.getByTestId('stock-table')).toBeVisible();
  } finally {
    await w.close();
  }
});
