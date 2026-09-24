// tests/e2e/v3app-r79.spec.mjs — AZ R79 KÉT LELETE VALÓDI BÖNGÉSZŐBEN (CMD-VS-300-002-002 R79).
//
// F79-01  A HIÁNYZÓ KONTEXTUS-MEZŐ NEM EGYEZÉS — hibabevitellel mérve, ahogy a külső ellenőrző fél
//         tette: a VALÓDI, sikeres válaszból a szállítási rétegben eltávolítjuk mindkét `served_*`
//         mezőt, a sikeres eredményt meghagyjuk. A lapnak NEM szabad kirajzolnia — és ki kell
//         mondania, miért. (A javítás előtt itt „KIADVA" állt a panelen.)
//
// F79-02  A RÉGI GOMB UGYANABBAN A CÉGBEN MÁS FIÓK NEVÉBEN ÍRT — két lap, KÖZÖS süti, és a MÁSIK
//         lapon belép egy MÁSIK felhasználó UGYANABBA a cégbe. A régi lap gombja nem írhat.
//
// MINDKÉT TILTÁS MELLETT POZITÍV ELLENPÁR (KUKA-051): a szabályos út változatlanul működik.
import { test, expect } from '@playwright/test';
import {
  World, Db, PASSWORD, createWorkspaceUI, switchUI, header, stockUI, inviteUI, openInviteUI, redeemUI,
  loginUI, logoutUI, withResponse, openSwitcher, openStockPage, openMemberPanel, gotoPage,
} from './helpers.mjs';

test('R79/F79-01 — hibabevitel: a kontextus-mezők nélküli SIKERES válasz nem rajzolódik ki', async ({ browser }) => {
  const w = new World(browser, 'r7901');
  try {
    const anna = await w.person('anna');
    const A = await createWorkspaceUI(anna.page, { name: 'A PRO', plan: 'pro' });
    expect(A.bookId).toBeTruthy();            // a létrehozás UTÁN ez már az aktív kör (nincs mire váltani)

    // POZITÍV KONTROLL ELŐSZÖR: a szabályos válasz KIRAJZOLÓDIK (a szigorítás nem tiltja ki a saját felületünket).
    const jo = await stockUI(anna.page);
    expect(jo.body.ok).toBe(true);
    expect(jo.granted).toBe(true);              // R81: a kiadás ténye szerkezeti jel, nem felirat
    expect(typeof jo.body.served_book_id).toBe('string');
    expect(typeof jo.body.served_subject_id).toBe('string');

    // HIBABEVITEL: a VÁLASZBÓL kivesszük a két kontextus-mezőt — minden más marad (siker, adat).
    await anna.page.route('**/api/data/stock**', async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      delete body.served_book_id;
      delete body.served_subject_id;
      await route.fulfill({ response, body: JSON.stringify(body), headers: { ...response.headers(), 'content-type': 'application/json; charset=utf-8' } });
    });
    await anna.page.getByTestId('data-stock-btn').click();
    // A PANEL NEM RAJZOL ADATOT — és a lap KIMONDJA, miért (nem néma képernyő).
    await expect(anna.page.getByTestId('data-stock')).toContainText('Az adatokat nem tudtuk biztonságosan megjeleníteni');
    await expect(anna.page.getByTestId('stock-table')).toHaveCount(0);
    await expect(anna.page.getByTestId('global-notice')).toContainText(/nem tudtuk biztonságosan megjeleníteni/i);
    const panel = (await anna.page.getByTestId('data-stock').textContent()) || '';
    expect(panel).not.toContain('Mennyiség jellege');     // a tábla FEJLÉCE sem születik meg
    expect(panel).not.toContain('qty');

    // A FRISSÍTÉS EGYSZER FUT: a lap nem indít újabb adat-kérést magától (nincs körforgás).
    let utanKeres = 0;
    anna.page.on('request', (r) => { if (r.url().includes('/api/data/stock')) utanKeres += 1; });
    await anna.page.waitForTimeout(700);
    expect(utanKeres).toBe(0);

    // POZITÍV ELLENPÁR A HIBABEVITEL UTÁN: a hibabevitelt levéve ugyanaz a gomb újra kiad.
    await anna.page.unroute('**/api/data/stock**');
    const ujra = await stockUI(anna.page);
    expect(ujra.body.ok).toBe(true);
    expect(ujra.granted).toBe(true);
  } finally {
    await w.close();
  }
});

test('R79/F79-02 — a régi lap gombja NEM ír a közben belépett MÁSIK fiók nevében (azonos cég)', async ({ browser }) => {
  const w = new World(browser, 'r7902'); const db = new Db();
  try {
    const anna = await w.person('anna');
    const C = await createWorkspaceUI(anna.page, { name: 'C KOZOS', plan: 'pro' });
    const bela = await w.person('bela');
    const cili = await w.person('cili');
    // Béla ADMIN (hogy a cégen belüli fiókváltás VALÓDI legyen), Cili USER (rajta mérünk).
    const invB = await inviteUI(anna.page, { email: bela.email, role: 'admin', scope: 'keszlet' });
    await openInviteUI(bela.page, invB.link); await redeemUI(bela.page);
    const invC = await inviteUI(anna.page, { email: cili.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(cili.page, invC.link); await redeemUI(cili.page);
    await anna.page.reload();
    await expect(anna.page.getByTestId('header-workspace')).toContainText('C KOZOS');
    await gotoPage(anna.page, 'members');            // R81: a taglista a Beállítások menüpontja
    await expect(anna.page.getByTestId(`member-${cili.subjectId}`)).toBeVisible();
    expect((await header(anna.page)).subject).toContain(anna.email);

    // A MÁSIK LAP (KÖZÖS SÜTI): kilép, BÉLÁVAL belép, és UGYANEZT a céget választja.
    const masik = await anna.ctx.newPage();
    await masik.goto('/');
    await logoutUI(masik);
    await loginUI(masik, bela.email, PASSWORD);
    await switchUI(masik, C.bookId);
    await expect(masik.getByTestId('header-workspace')).toContainText('C KOZOS');

    // A RÉGI LAP GOMBJA: Anna nézetében született, de a munkamenet MÁR Béláé.
    const elotte = db.count('SELECT COUNT(*) AS n FROM scope_grant WHERE book_id = ? AND subject_id = ?', C.bookId, cili.subjectId);
    // R81: a jogosultság a tag JOBB OLDALI PANELJÉN kezelhető — a panelt a RÉGI (Anna-beli)
    // nézetben nyitjuk meg, tehát a gomb ugyanúgy „ottfelejtett gomb" marad, mint a leletben.
    await openMemberPanel(anna.page, cili.subjectId);
    await anna.page.getByTestId(`member-scope-select-${cili.subjectId}`).selectOption('arak');
    const forced = await withResponse(anna.page, { path: '/api/members/scope' },
      () => anna.page.getByTestId(`member-scope-${cili.subjectId}`).click());
    expect(forced.status).toBe(409);
    expect(forced.body.reason).toBe('context_mismatch');
    expect(forced.body.expected_subject_id).toBe(anna.subjectId);
    expect(forced.body.served_subject_id).toBe(bela.subjectId);
    expect(forced.body.wrote).toBe(false);
    // A TÁROLÓ A DÖNTŐ TANÚ: adatkör-adás NEM született.
    expect(db.count('SELECT COUNT(*) AS n FROM scope_grant WHERE book_id = ? AND subject_id = ?', C.bookId, cili.subjectId)).toBe(elotte);
    // A KÉPERNYŐ KIMONDJA, MI TÖRTÉNT, és a fejléc a VALÓDI állapotra frissül.
    await expect(anna.page.getByTestId('global-notice')).toContainText(/másik fiókra|Másik felhasználó jelentkezett be/i);
    await expect(anna.page.getByTestId('header-subject')).toContainText(bela.email);
    expect((await anna.page.getByTestId('members-result').count()) === 0
      || !((await anna.page.getByTestId('members-result').textContent()) || '').includes('mostantól megtekintheti')).toBe(true);

    // POZITÍV ELLENPÁR: a MAI nézetben (Béla, ugyanaz a cég) ugyanaz a művelet MŰKÖDIK.
    await anna.page.reload();
    await gotoPage(anna.page, 'members');
    await openMemberPanel(anna.page, cili.subjectId);
    await anna.page.getByTestId(`member-scope-select-${cili.subjectId}`).selectOption('arak');
    const jo = await withResponse(anna.page, { path: '/api/members/scope' },
      () => anna.page.getByTestId(`member-scope-${cili.subjectId}`).click());
    expect(jo.status).toBe(200);
    expect(jo.body.ok).toBe(true);
    expect(jo.body.served_subject_id).toBe(bela.subjectId);
    await expect(anna.page.getByTestId('members-result')).toContainText('mostantól megtekintheti az árakat');
    expect(db.count('SELECT COUNT(*) AS n FROM scope_grant WHERE book_id = ? AND subject_id = ? AND scope = ?', C.bookId, cili.subjectId, 'arak')).toBe(1);
  } finally {
    await w.close(); db.close();
  }
});
