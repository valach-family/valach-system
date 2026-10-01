// tests/e2e/v3app-r127.spec.mjs — A KÉSŐI ADATVÁLASZ AZ ÚJ MINTANÉZETEKEN (A121-07 utolsó hiánya).
//
// MIÉRT LÉTEZIK. Az R126-os jelentésemben az A121-07 RÉSZLEGES maradt: a „késői adatválasz"
// (visszatartott válasz megérkezése nézetváltás UTÁN) az R121-ben született HÁROM mintanézet-útra
// nem volt mérve — `/api/data/document`, `/api/data/supplier`, `/api/data/document-full`.
//
// AZ R129-BEN JAVÍTOTT KÉT MÉRÉSI HIBA (a külső ellenőrző fél lelete, és igaza volt):
//
//   (1) A BEFEJEZÉSJEL HAMIS VOLT. Az első alak a `releasedAt`-et a `route.fulfill` ELŐTT állította
//       be, tehát a rá várakozó állítások az átadás befejezése előtt is átmentek — és utána egy
//       ELEVE ÜRES áttekintési nézeten állítottak hiányt (az E4 még erre sem várt). Mostantól
//       HÁROM külön jel áll, ebben a sorrendben: `deliveredAt` (a `fulfill` UTÁN) · az ALKALMAZÁS
//       saját `res.json()` hívása erre az ÚTRA (a hálózati átadás NEM azonos a feldolgozással) ·
//       majd egy makrotaszk-forduló, ami az esemény-sor szabálya szerint kiüríti a törzs-beolvasás
//       után sorba került mikrotaszkokat (`Promise.all` → a nemzedék-kapu). Az állítás EZUTÁN áll.
//       A jel ELÉGSÉGESSÉGE nem feltevés: ugyanez a jel-sorozat az E5-ös POZITÍV KONTROLLBAN
//       KIRAJZOLÁST eredményez — tehát ha a folytatás rajzolna, ez a jel után látnánk (KUKA-051).
//
//   (2) AZ E6 A KORÁBBI KÉPET MÉRHETTE. A lap újbóli megnyitása (`ujraNyit`) NEM üríti a
//       minta-állapotot, ezért a „most rajzolódott ki" állítás a KORÁBBAN is látható adatra is
//       igaz lett volna — és a próba ezt csak NAPLÓZTA, nem állította. Mostantól az E6 IGAZOLTAN
//       ÜRES nézetből indul (`page.reload()` ÜRÍTI a `state.samples`-t), az „üres" állapot
//       várakozó állítással áll, a megjelenés KONKRÉT állítás, és a rajzolás TÉNYÉT egy
//       DOM-figyelő (MutationObserver) is méri — így a „most érkezett" és a „már korábban látható"
//       nem mosható össze. A válaszba SZINTETIKUS JELÖLŐT így sem teszünk: a kötési és
//       jogosultsági mezők maradnak érintetlenek.
//
// MIT MÉR, ÉS MIT NEM
//   · MÉR: a VALÓDI alkalmazás HTTP-válaszát visszatartjuk; a felület fiókot (E1–E3) vagy a MÁSIK
//     lap személyt (E4) vált, az ÚJ nézet a SAJÁT friss válaszát KIRAJZOLJA, és a régi válasz CSAK
//     EZUTÁN érkezik meg. Az állítás a TÉNYLEGES DOM-on, a fejléc kontextusán és a minta-szakasz
//     karakterre vett HTML-jén áll. Mindhárom végpont fedve, a dokumentum-lap KÉT párhuzamos
//     válasza EGYENKÉNT átadva, MINDKÉT sorrendben.
//   · NEM ÁLLÍT ennél erősebb, AZONNALI védelmet: a mintanézet-lapok maguktól nem kérdezik újra a
//     szervert, tehát egy MÁSIK lapon történt személyváltás addig nem ismert, amíg a lap valamilyen
//     SZOKÁSOS alkalmazásúton nem szinkronizál. Az E4 azt méri MEG, MIKOR vált ismertté; az E6 az
//     észlelés ELŐTTI átmeneti állapotot méri meg — és a mért állítás CSAK erre az esetre szól.
//
// A VISSZATARTÁS ESEMÉNNYEL SZINKRONIZÁLT, nem alvással (a parancs kikötése): a szerver már
// kiszolgálta a választ (`route.fetch()`), a lap viszont csak akkor kapja meg, amikor a próba
// elengedi. Időzített várakozás egyetlen állítás előtt sem áll.
//
// SZINTETIKUS JELÖLŐT NEM TESZÜNK a válaszba: a régi és az új nézet VALÓDI különbségén mérünk — az
// egyik fiók `pro` (a minta KIADVA), a másik `starter` (a minta az ELŐFIZETÉS-kapun ELUTASÍTVA).
// Így a „régi adat szivárgott be" és a „régi elutasítás szivárgott be" irány is elválik egymástól.
//
// TERMÉKKÓDOT EZ A CSOMAG NEM ALAKÍT ÁT mérési jel kedvéért: minden megfigyelés PRÓBAOLDALI (a lap
// `window.fetch`-ének burkolása, DOM-figyelő, útvonal-visszatartás).
import { test, expect } from '@playwright/test';
import {
  World, PASSWORD, createWorkspaceUI, switchUI, header, gotoPage, loginUI, logoutUI,
  registerUI, verifyFromMailboxUI,
} from './helpers.mjs';

test.describe.configure({ mode: 'serial' });

const BIZONYLAT = 'BEJ-2026-0042';   // a `pro` fiók mintájának VALÓDI bizonylatszáma

// A KÉSŐI VÁLASZ MÉRÉSÉNEK FEGYELME KÖZÖS OTTHONBAN ÁLL (R134): a hat segéd — a próbaoldali
// törzs-megfigyelő, az esemény-forduló, az útvonal visszatartása és a HÁROM jeles átadás — a
// `lateResponse.mjs`-ben lakik, és onnan hívja az R127-es lap ÉS az R134-es lap is. A leletek
// (F129-01: a befejezésjel a `fulfill` UTÁN; a feldolgozás tanúja a lap saját törzs-olvasása)
// ott, a modul fejlécében és a függvények mellett állnak — nem másoltuk le őket ide (KUKA-003).
import {
  fetchWatchScript, installFetchWatch, bodyReads, drainTurn, holdRoute, inFlight, atad,
} from './lateResponse.mjs';

/** A minta-szakasz VÁRT állapota — várakozó állítással (KUKA-228). */
async function expectSample(page, kulcs, kiadva, timeout = undefined) {
  const opts = timeout ? { timeout } : {};
  await expect(page.getByTestId(`sample-${kulcs}`)).toBeVisible(opts);
  const cel = page.getByTestId(`sample-${kulcs}-${kiadva ? 'value' : 'denied'}`);
  await expect(cel).toBeVisible(opts);
  return (await cel.textContent()) || '';
}

/**
 * A minta-szakasz ÜRES (betöltés) állapota — csak ott állítható, ahol az állapot TÉNYLEGESEN üres.
 *
 * MÉRT TÉNY, amiért ez nem használható mindenhol: a lap ELHAGYÁSA és újbóli megnyitása UGYANAZON a
 * kontextuson NEM üríti a mintákat (`state.samples` megmarad) — a panel a korábbi, UGYANARRA a
 * nézetre szóló adatot mutatja, amíg az új válasz meg nem jön. Ez helyes (nem idegen adat), de azt
 * jelenti, hogy az „üres panel" NEM bizonyítja a kérés folyamatban létét, és a „most rajzolódott
 * ki" állítást sem — ez volt az R129/F129-02 lelete. ÜRÍT viszont az OLDAL ÚJRATÖLTÉSE, ezért az
 * E5 és az E6 onnan indul.
 */
async function expectLoading(page, kulcs) {
  await expect(page.getByTestId(`sample-${kulcs}`)).toBeVisible();
  await expect(page.getByTestId(`sample-${kulcs}-value`)).toHaveCount(0);
  await expect(page.getByTestId(`sample-${kulcs}-denied`)).toHaveCount(0);
}

/** DOM-FIGYELŐ a tartalmi területre: történt-e EGYÁLTALÁN rajzolás az elengedés után. */
async function watchMain(page) {
  await page.evaluate(() => {
    const t = document.querySelector('main');
    if (window.__r129obs) window.__r129obs.disconnect();
    window.__r129mut = { n: 0, html: t ? t.innerHTML : null };
    window.__r129obs = new MutationObserver((recs) => { window.__r129mut.n += recs.length; });
    window.__r129obs.observe(t, {
      childList: true, subtree: true, characterData: true, attributes: true });
  });
}

async function mainState(page) {
  return page.evaluate(() => {
    const t = document.querySelector('main');
    return { n: window.__r129mut.n, same: t && t.innerHTML === window.__r129mut.html };
  });
}

/**
 * AZ ÚJ KÉP VÁLTOZATLAN — EGY állítás, KÉT használó.
 *
 * Ugyanezt futtatja a mérés (E1–E3) ÉS a NEGATÍV KONTROLL (N1). Ha a kettő két külön állítást
 * használna, a kontroll nem a próbát igazolná, csak egy hozzá hasonlót (KUKA-207 · KUKA-239).
 */
async function ujKepValtozatlan(page, { kulcsok, kiadva, fiokNev, kapu = null, tiltott = null,
  timeout = undefined }) {
  for (const k of kulcsok) {
    await expectSample(page, k, kiadva, timeout);
    await expect(page.getByTestId(`sample-${k}-${kiadva ? 'denied' : 'value'}`))
      .toHaveCount(0, timeout ? { timeout } : {});
  }
  if (kapu) {
    expect(await page.getByTestId(`sample-${kulcsok[0]}-denied`).getAttribute('data-gate')).toBe(kapu);
  }
  const fo = (await page.locator('main').textContent()) || '';
  if (tiltott) expect(fo, 'a RÉGI nézet adata nem jelent meg az ÚJ nézetben').not.toContain(tiltott);
  expect((await header(page)).workspace).toContain(fiokNev);
  const m = await mainState(page);
  expect(m.same, 'a mintanézet HTML-je karakterre változatlan a régi válasz FELDOLGOZÁSA után').toBe(true);
  expect(m.n, 'a régi válasz feldolgozása egyetlen DOM-változást sem okozott').toBe(0);
  return m;
}

/** A lap újbóli megnyitása — a mintákat EZ kérdezi le újra (a rajzolás nem kérdez). */
async function ujraNyit(page, cel) {
  await gotoPage(page, cel === 'documents' ? 'partners' : 'documents');
  await gotoPage(page, cel);
}

test.describe('R127 — késői adatválasz az új mintanézeteken', () => {
  let w; let anna; let PRO; let STARTER;

  test.beforeAll(async ({ browser }) => {
    w = new World(browser, `r127-${Date.now().toString(36)}`);
    anna = await w.person('anna');
    // A MEGFIGYELŐ AZ ÚJRATÖLTÉSEKET IS ÁTÉLI: az induló szkript minden navigációra újra lefut, a
    // már betöltött lapra pedig a próba `installFetchWatch`-csal teszi fel (a burkolat idempotens).
    await anna.page.addInitScript(fetchWatchScript);
    PRO = await createWorkspaceUI(anna.page, {
      name: 'R127 PRO', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '32345672-2-42' } });
    STARTER = await createWorkspaceUI(anna.page, {
      name: 'R127 STARTER', plan: 'starter', business: { jurisdiction: 'HU', tax_id: '22345674-2-42' } });
  });

  test.afterAll(async () => { await w.close(); });

  test('R127-E1 — a régi KIADOTT válasz nem írja felül az új ELUTASÍTOTT nézetet (fejléc → vegyes sorrend)', async () => {
    const page = anna.page;
    await installFetchWatch(page);
    await switchUI(page, PRO.bookId);
    await gotoPage(page, 'documents');
    // KONTROLL-KÉP: a `pro` fiókban mindkét minta KIADVA.
    const elotte = await expectSample(page, 'document', true);
    expect(elotte).toContain(BIZONYLAT);
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
    await switchUI(page, STARTER.bookId);
    await expect(page.getByTestId('header-workspace')).toContainText('R127 STARTER');
    // MÉRT TÉNY: a váltás az áttekintésre visz és ÜRÍT (`newContext` + `resetViewCaches`), tehát a
    // minta-szakasz itt nincs is kirajzolva. EZ AZONBAN NEM ÁLLÍTÁSI HELY (F129-01): egy eleve
    // üres nézeten a hiány önmagától igaz. Csak megfigyelés, a mérés utána jön.
    await expect(page.getByTestId('sample-document')).toHaveCount(0);

    // AZ ÚJ FIÓK ÉRINTETT MINTAOLDALA ELŐBB NYÍLIK MEG, ÉS A SAJÁT FRISS VÁLASZÁT KIRAJZOLJA —
    // a régi válasz CSAK EZUTÁN érkezhet meg. Így az állítás egy TÉNYLEGESEN kirajzolt új képre
    // szól, nem egy üres lapra (ez az R129/F129-01 kifejezett kikötése).
    await gotoPage(page, 'documents');
    const ujKep = await expectSample(page, 'document', false);
    expect(await page.getByTestId('sample-document-denied').getAttribute('data-gate')).toBe('entitlement');
    await expectSample(page, 'document-full', false);
    expect(ujKep).not.toContain(BIZONYLAT);
    await watchMain(page);

    // ELENGEDÉS EGYENKÉNT: ELŐBB a fejléc, és a TÉNYLEGES átvételét megvárjuk (F129-01).
    await atad(page, hDoc, 'fejléc');
    // A KÖZBENSŐ ÁLLAPOT IS MÉRVE: a `Promise.all` még a másik válaszra vár, tehát a közös
    // folytatás itt MÉG NEM futott le — és a nézet ettől sem változott.
    await ujKepValtozatlan(page, { kulcsok: ['document', 'document-full'], kiadva: false,
      fiokNev: 'R127 STARTER', kapu: 'entitlement', tiltott: BIZONYLAT });

    // UTÁNA a vegyes — a MÁSODIK átvétel után futott le a `Promise.all` KÖZÖS folytatása.
    await atad(page, hFull, 'vegyes');
    const m = await ujKepValtozatlan(page, { kulcsok: ['document', 'document-full'], kiadva: false,
      fiokNev: 'R127 STARTER', kapu: 'entitlement', tiltott: BIZONYLAT });
    expect(hDoc.get().deliveredAt).toBeLessThanOrEqual(hFull.get().deliveredAt);

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    console.log(`[R127-E1] a KIADOTT régi válasz mindkét törzse FELDOLGOZVA (fejléc → vegyes) a `
      + `kirajzolt ELUTASÍTOTT új képen · DOM-változás: ${m.n} · a HTML változatlan: ${m.same}`);
  });

  test('R127-E2 — a régi ELUTASÍTÁS nem írja felül az új KIADOTT nézetet (vegyes → fejléc sorrend)', async () => {
    const page = anna.page;
    await installFetchWatch(page);
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

    // AZ ÚJ FIÓK SAJÁT FRISS VÁLASZA ELŐBB KIRAJZOLÓDIK.
    await gotoPage(page, 'documents');
    const ujKep = await expectSample(page, 'document', true);
    expect(ujKep).toContain(BIZONYLAT);
    await expectSample(page, 'document-full', true);
    await watchMain(page);

    // ELENGEDÉS FORDÍTOTT SORRENDBEN: ELŐBB a vegyes, UTÁNA a fejléc (a parancs kikötése) —
    // mindkettő a TÉNYLEGES átvétel megvárásával.
    await atad(page, hFull, 'vegyes');
    await ujKepValtozatlan(page, { kulcsok: ['document', 'document-full'], kiadva: true,
      fiokNev: 'R127 PRO' });
    await atad(page, hDoc, 'fejléc');
    const m = await ujKepValtozatlan(page, { kulcsok: ['document', 'document-full'], kiadva: true,
      fiokNev: 'R127 PRO' });
    expect(hFull.get().deliveredAt).toBeLessThanOrEqual(hDoc.get().deliveredAt);
    // ÉS A RÉGI ELUTASÍTÁS SEM „RAGADT BE": a kiadott érték a helyén maradt.
    expect(await expectSample(page, 'document', true)).toContain(BIZONYLAT);

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    console.log(`[R127-E2] az ELUTASÍTOTT régi válasz mindkét törzse FELDOLGOZVA (vegyes → fejléc) a `
      + `kirajzolt KIADOTT új képen · DOM-változás: ${m.n} · a HTML változatlan: ${m.same}`);
  });

  test('R127-E3 — ugyanez a beszállítói mintán (/api/data/supplier)', async () => {
    const page = anna.page;
    await installFetchWatch(page);
    await switchUI(page, PRO.bookId);
    await gotoPage(page, 'partners');
    await expectSample(page, 'supplier', true);

    const hSupp = await holdRoute(page, '/api/data/supplier');
    await ujraNyit(page, 'partners');
    await inFlight(hSupp, 'beszállító');
    expect(JSON.parse(hSupp.get().servedBody).ok).toBe(true);
    expect(JSON.parse(hSupp.get().servedBody).served_book_id).toBe(PRO.bookId);

    await switchUI(page, STARTER.bookId);
    await expect(page.getByTestId('header-workspace')).toContainText('R127 STARTER');

    // AZ ÚJ FIÓK SAJÁT FRISS VÁLASZA ELŐBB KIRAJZOLÓDIK.
    await gotoPage(page, 'partners');
    await expectSample(page, 'supplier', false);
    await watchMain(page);

    await atad(page, hSupp, 'beszállító');
    const m = await ujKepValtozatlan(page, { kulcsok: ['supplier'], kiadva: false,
      fiokNev: 'R127 STARTER', kapu: 'entitlement' });

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    console.log(`[R127-E3] a beszállítói minta késői válasza FELDOLGOZVA a kirajzolt új képen · `
      + `DOM-változás: ${m.n} · a HTML változatlan: ${m.same}`);
  });

  test('R127-E4 — SZEMÉLYVÁLTÁS a másik lapon: mikor vált ismertté az új személy', async () => {
    const page = anna.page;
    await installFetchWatch(page);
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
    // `context_mismatch`) — a lap EBBŐL tudja meg, hogy más ember van bent.
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
    // AZ ÚJ ALANY PONTOSAN A VÁRT SZEMÉLY (F129-01): nem elég, hogy „nem anna".
    await expect(page.getByTestId('header-subject')).toHaveText(belaEmail);
    expect(eszlelesStatus, 'a kontextus-kapu utasította el a régi alanyú kérést').toBe(409);
    expect(eszlelesIndok).toBe('context_mismatch');
    console.log(`[R127-E4] az új személy ITT vált ismertté: a készlet-lap első lekérése HTTP ${eszlelesStatus} `
      + `(${eszlelesIndok}) · értesítés: „${ertesites.trim()}" · fejléc: ${belaEmail}`);
    console.log('[R127-E4] AMIT EZ NEM ÁLLÍT: azonnali, kérés nélküli védelmet. A mintanézet-lapok maguktól '
      + 'nem kérdezik újra a szervert; az új személy akkor válik ismertté, amikor a lap a szokásos '
      + 'úton legközelebb kérdez.');

    // ÉS CSAK EZUTÁN érkezik meg a RÉGI válasz — a TÉNYLEGES átvételét MEGVÁRJUK (F129-01: az első
    // alak itt semmit nem várt meg, hanem az elengedés után azonnal vizsgálta a DOM-ot).
    await watchMain(page);
    await atad(page, hDoc, 'fejléc');

    // A RÉGI SZEMÉLY ADATA SEHOL — sem ezen a lapon, sem a bizonylat-lapon, ha az új személynek
    // egyáltalán elérhető. A FELTÉTEL NEM KIBÚVÓ: az új személy nézetében a bizonylat-lap léte a
    // SAJÁT jogosultságától függ, és a próba nem tehet úgy, mintha ez adott lenne (KUKA-041).
    const m = await mainState(page);
    expect(m.same, 'a régi válasz feldolgozása után a tartalmi terület HTML-je változatlan').toBe(true);
    expect(m.n, 'a régi válasz feldolgozása egyetlen DOM-változást sem okozott').toBe(0);
    expect((await page.locator('main').textContent()) || '').not.toContain(BIZONYLAT);
    await expect(page.getByTestId('sample-document-value')).toHaveCount(0);
    await expect(page.getByTestId('header-subject')).toHaveText(belaEmail);
    const vanBizonylatLap = await page.getByTestId('nav-documents').count() > 0;
    if (vanBizonylatLap) {
      await gotoPage(page, 'documents');
      await expect(page.getByTestId('sample-document-value')).toHaveCount(0);
      expect((await page.locator('main').textContent()) || '').not.toContain(BIZONYLAT);
    }
    console.log(`[R127-E4] a régi válasz FELDOLGOZVA az észlelés UTÁN · DOM-változás: ${m.n} · `
      + `a bizonylat-lap az ÚJ személy nézetében ${vanBizonylatLap ? 'elérhető — ott is ellenőrizve' : 'NEM elérhető (a saját jogosultsága szerint) — a mérés ezt kimondja'}`);

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await masik.close();
    // A KÖVETKEZŐ PRÓBÁHOZ visszaadjuk a lapot Annának.
    await logoutUI(page);
    await loginUI(page, anna.email, PASSWORD);
  });

  test('R127-E6 — a HATÁR MEGMÉRVE: mi történik, ha a régi válasz az ÉSZLELÉS ELŐTT érkezik', async () => {
    const page = anna.page;
    await installFetchWatch(page);
    await switchUI(page, PRO.bookId);

    const hDoc = await holdRoute(page, '/api/data/document');
    // IGAZOLTAN ÜRES KIINDULÁS (F129-02). Az OLDAL ÚJRATÖLTÉSE üríti a minta-állapotot, tehát az
    // „üres panel" itt VALÓBAN a folyamatban lévő kérést jelenti. Az R127-es alak `ujraNyit`-tal
    // indult, ami NEM ürít — ott a „most rajzolódott ki" a KORÁBBAN is látható adatra is igaz
    // lehetett, ezért az állítás nem állt.
    await page.reload();
    await installFetchWatch(page);
    await expect(page.getByTestId('header-workspace')).toContainText('R127 PRO');
    await gotoPage(page, 'documents');
    await inFlight(hDoc, 'fejléc');
    await expectLoading(page, 'document');           // MOST bizonyító: az állapot igazoltan üres
    await expectLoading(page, 'document-full');

    // MÁSIK LAP: ÚJ SZEMÉLY lép be — a lap NEM tud róla.
    const masik = await anna.ctx.newPage();
    await masik.goto('/');
    await logoutUI(masik);
    const cilliEmail = `${w.tag}.cilli@pelda.hu`;
    await registerUI(masik, cilliEmail);
    await verifyFromMailboxUI(masik, cilliEmail);
    await loginUI(masik, cilliEmail, PASSWORD);
    // A KIINDULÁS MÉG MINDIG ÜRES — a másik lap belépése ezen a lapon nem rajzolt.
    await expectLoading(page, 'document');
    await watchMain(page);

    // ÉS MOST ELENGEDJÜK — MÉG AZELŐTT, hogy a lap bármit kérdezett volna.
    await atad(page, hDoc, 'fejléc');

    // KONKRÉT ÁLLÍTÁS, NEM NAPLÓ (F129-02): a MOST megérkezett válasz KIRAJZOLÓDOTT.
    const ertek = await expectSample(page, 'document', true);
    expect(ertek).toContain(BIZONYLAT);
    const m = await mainState(page);
    expect(m.n, 'a rajzolás MOST történt (a nézet előtte igazoltan üres volt)').toBeGreaterThan(0);
    expect(m.same, 'a tartalmi terület MEGVÁLTOZOTT — tehát a megjelent adat most érkezett').toBe(false);
    const fejlec = (await header(page)).subject;
    expect(fejlec, 'a lap fejléce ekkor MÉG a régi személyt mutatja').toContain('anna');
    console.log(`[R127-E6] MÉRVE: a régi válasz az ÉSZLELÉS ELŐTT érkezett, és IGAZOLTAN ÜRES nézetbe `
      + `KIRAJZOLÓDOTT (DOM-változás: ${m.n}) · a lap fejléce ekkor: ${fejlec.trim()}`);

    // AMIT EZ JELENT, ÉS AMIT NEM — CSAK ERRE AZ ESETRE. A válasz a RÉGI alanynak, a RÉGI
    // nézetébe, a RÉGI fiók adatával érkezett, és a lap ekkor MÉG joggal hiszi, hogy ő az: a
    // rendszer nem tud a másik fül belépéséről, amíg nem kérdez (KUKA-217). EBBŐL AZ EGY ESETBŐL
    // NEM következik, hogy minden késői válasz csak korábban is látott adatot hozhat — a mérés
    // hatóköre ez a lépéssor. Erősebb, AZONNALI védelem cross-tab csatornával vagy folyamatos
    // kérdezéssel lenne; ez a csomag ilyet nem épít, és az R127 sem ezt tiltotta, hanem a
    // bizonyítatlan azonnali-védelem állítást. A védelem KÖVETKEZŐ pontja a szokásos út (E4).
    // ÉS A HELYREÁLLÁS UGYANÍGY MÉRVE — konkrét állításokkal.
    const ctxValasz = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/data/stock', { timeout: 15000 }).catch(() => null);
    await page.getByTestId('nav-stock').click();
    const eszleles = await ctxValasz;
    await expect(page.getByTestId('header-subject')).not.toContainText('anna');
    await expect(page.getByTestId('header-subject')).toHaveText(cilliEmail);
    await expect(page.getByTestId('sample-document-value')).toHaveCount(0);
    expect((await page.locator('main').textContent()) || '').not.toContain(BIZONYLAT);
    expect(eszleles ? eszleles.status() : null, 'a kontextus-kapu itt is elutasította a régi alanyt').toBe(409);
    console.log(`[R127-E6] helyreállás MÉRVE: az első szokásos lekérés (HTTP ${eszleles ? eszleles.status() : '—'}) `
      + 'után a régi adat ELTŰNT, és a fejléc az ÚJ személyt mutatja');

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await masik.close();
    await logoutUI(page);
    await loginUI(page, anna.email, PASSWORD);
  });

  test('R127-E5 — POZITÍV KONTROLL: változatlan kontextusban a késleltetve elengedett válasz MEGJELENIK', async () => {
    const page = anna.page;
    await installFetchWatch(page);
    await switchUI(page, PRO.bookId);
    await gotoPage(page, 'documents');

    const hDoc = await holdRoute(page, '/api/data/document');
    const hFull = await holdRoute(page, '/api/data/document-full');
    const hSupp = await holdRoute(page, '/api/data/supplier');
    // AZ OLDAL ÚJRATÖLTÉSE (szokásos felhasználói művelet) ÜRESRE állítja a minta-állapotot, tehát
    // az „üres panel" itt VALÓBAN a folyamatban lévő kérést jelenti — és a kontextus VÁLTOZATLAN.
    await page.reload();
    await installFetchWatch(page);
    await expect(page.getByTestId('header-workspace')).toContainText('R127 PRO');
    await gotoPage(page, 'documents');
    await inFlight(hDoc, 'fejléc');
    await inFlight(hFull, 'vegyes');
    await expectLoading(page, 'document');
    await expectLoading(page, 'document-full');

    // SEMMI NEM VÁLTOZIK: se fiók, se személy. A késleltetés UTÁN a jogosult válasz MEGJELENIK —
    // tehát az E1–E4 üressége NEM hibás fixture-ből vagy el sem engedett kérésből jön (KUKA-051).
    //
    // ÉS EZ EGYSZERRE A BEFEJEZÉSJEL ELÉGSÉGESSÉGÉNEK BIZONYÍTÉKA IS (F129-01): UGYANAZT a három
    // jelet használja (`fulfill` lefutott · a lap beolvasta a törzset · egy esemény-forduló), és
    // itt a folytatás RAJZOL. Tehát ha az E1–E4-ben a folytatás rajzolt volna, azt ez a jel után
    // látnánk — a hiány nem a jel korai voltából jön.
    await atad(page, hDoc, 'fejléc');
    await atad(page, hFull, 'vegyes');
    const kiadva = await expectSample(page, 'document', true);
    expect(kiadva).toContain(BIZONYLAT);
    await expectSample(page, 'document-full', true);

    // ÉS A BESZÁLLÍTÓI ÚT IS: a partnerek lapon, ugyanígy késleltetve.
    await gotoPage(page, 'partners');
    await inFlight(hSupp, 'beszállító');
    await expectLoading(page, 'supplier');
    await atad(page, hSupp, 'beszállító');
    await expectSample(page, 'supplier', true);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    console.log('[R127-E5] pozitív kontroll: mindhárom végpont késleltetve elengedett válasza MEGJELENT — '
      + 'a három jelből álló befejezésjel tehát ELÉGSÉGES a folytatás lefutásának megítéléséhez');
  });

  test('R127-N1 — NEGATÍV KONTROLL: a próba ELBUKIK, ha a régi válasz felülírhatja az új nézetet', async () => {
    const page = anna.page;
    // MIÉRT KELL (az R129 kifejezett kikötése). A zöld állítás magában nem bizonyítja, hogy a
    // próba a VÉDELMET méri: ugyanez a zöld akkor is megjelenhet, ha a próba érzéketlen. Ezért a
    // védelmet KIKAPCSOLJUK, és a MÉRÉS UGYANAZON állításának EL KELL BUKNIA (KUKA-041 · KUKA-051).
    //
    // A TERMÉKKÓDOT A REPÓBAN NEM ÍRJUK ÁT: a próba a KISZOLGÁLT `/app.js`-t cseréli ki arra a
    // változatra, amelyben a nézet-nemzedék kapuja nem áll. A repó fájlja érintetlen; a rontás
    // csak ennek az egy lapnak a futásában él. (A böngésző-réteget a mutációs battéria nem fedi —
    // ez a kontroll annak a helyi, egy-rontásos alakja.)
    const patch = { fired: 0, anchors: 0 };
    const HORGONY = 'if (gen !== state.generation || state.page !== page) return;';
    await page.route((u) => u.pathname === '/app.js', async (route) => {
      const r = await route.fetch();
      const src = await r.text();
      // ELAVULT HORGONY = ELAVULT KONTROLL: ha a védelem sora megváltozik, ez azonnal kiderül
      // (KUKA-207) — nem néma, mindig sikeres „kontrollt" hagyunk magunk után.
      patch.anchors = src.split(HORGONY).length - 1;
      patch.fired += 1;
      await route.fulfill({ response: r, body: src.split(HORGONY).join('/* R129 NEGATÍV KONTROLL: a kapu kikapcsolva */') });
    });
    await page.reload();
    await installFetchWatch(page);
    expect(patch.fired, 'a rontott /app.js TÉNYLEGESEN kiszolgálásra került').toBeGreaterThan(0);
    expect(patch.anchors, 'a védelem horgonya pontosan a két ismert helyen áll (dokumentum + beszállító ág)').toBe(2);

    // INNENTŐL SZÓ SZERINT AZ E1 LÉPÉSSORA, a rontott kódon.
    await switchUI(page, PRO.bookId);
    await gotoPage(page, 'documents');
    expect(await expectSample(page, 'document', true)).toContain(BIZONYLAT);

    const hDoc = await holdRoute(page, '/api/data/document');
    const hFull = await holdRoute(page, '/api/data/document-full');
    await ujraNyit(page, 'documents');
    await inFlight(hDoc, 'fejléc');
    await inFlight(hFull, 'vegyes');

    await switchUI(page, STARTER.bookId);
    await expect(page.getByTestId('header-workspace')).toContainText('R127 STARTER');
    await gotoPage(page, 'documents');
    await expectSample(page, 'document', false);
    await expectSample(page, 'document-full', false);
    await watchMain(page);

    await atad(page, hDoc, 'fejléc');
    await atad(page, hFull, 'vegyes');

    // (1) A RONTOTT KÓDON A RÉGI ADAT TÉNYLEGESEN FELÜLÍRTA AZ ÚJ NÉZETET — a kontroll a VIZSGÁLT
    //     hibára érzékeny, nem egy mesterséges állítás-hibára.
    await expect(page.getByTestId('sample-document-value')).toBeVisible();
    expect((await page.locator('main').textContent()) || '',
      'a rontott kódon a RÉGI fiók bizonylata megjelent az ÚJ nézetben').toContain(BIZONYLAT);
    expect((await header(page)).workspace, 'a fejléc közben az ÚJ fiókot mutatja').toContain('R127 STARTER');

    // (2) ÉS A MÉRÉS UGYANAZON ÁLLÍTÁSA EZT ELKAPJA. A rövidített türelem CSAK a kontrollra szól:
    //     az állapot (1) miatt már beállt, tehát nem időzítés miatt bukik.
    let hiba = null;
    try {
      await ujKepValtozatlan(page, { kulcsok: ['document', 'document-full'], kiadva: false,
        fiokNev: 'R127 STARTER', kapu: 'entitlement', tiltott: BIZONYLAT, timeout: 2000 });
    } catch (e) { hiba = e; }
    expect(hiba, 'a mérés állítása a rontott kódon ELBUKIK — tehát a zöldje a VÉDELMET méri').not.toBeNull();

    // (3) ÉS A BUKÁS OKA A KISZIVÁRGOTT ADAT, nem egy hiányzó elem: a mérés SZŰK állítása — „a régi
    //     nézet adata nem jelent meg" — ÖNMAGÁBAN is elbukik. Így a kontroll nem egy tetszőleges
    //     állítás-hibát igazol, hanem pontosan a VIZSGÁLT hibát (KUKA-127: a piros önmagában nem
    //     bizonyítja, hogy a védelem miatt piros).
    let hibaSzuk = null;
    try {
      expect((await page.locator('main').textContent()) || '').not.toContain(BIZONYLAT);
    } catch (e) { hibaSzuk = e; }
    expect(hibaSzuk, 'a „régi adat nem jelent meg az új nézetben" állítás ÖNMAGÁBAN is elbukik').not.toBeNull();
    console.log(`[R127-N1] negatív kontroll: a kapu kikapcsolásával a régi válasz felülírta az új nézetet, `
      + `és a mérés állítása elbukott — „${String(hiba && hiba.message).split('\n')[0].trim()}"`);

    // HELYREÁLLÍTÁS: a rontott kiszolgálás megszűnik, és a lap a VALÓDI kódra tölt vissza.
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await page.reload();
    await installFetchWatch(page);
    await switchUI(page, STARTER.bookId);
    await gotoPage(page, 'documents');
    await expectSample(page, 'document', false);
    console.log('[R127-N1] a valódi kód visszatöltve — a soron következő próbák az éles kódúton futnak');
  });
});
