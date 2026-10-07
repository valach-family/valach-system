// tests/e2e/v3app-r166-utmutatok.spec.mjs — A TIZENKÉT PÓTOLT ÚTMUTATÓ TÉNYLEGES BEJÁRÁSA (R166 §3).
//
// MIÉRT VAN EZ A LAP. Az R166 §3 nem azt kérte, hogy a lefedési leltár ZÖLD legyen, hanem hogy a
// hiányzó útmutatók **ténylegesen bejárhatók** legyenek. A regiszter zöldje ezt NEM bizonyítja: a
// `verify:lefedes` a DEKLARÁCIÓT méri, a `verify:tutor` pedig azt, hogy a lépés-célok a FORRÁSBAN
// megvannak — egyik sem nyitja meg a böngészőt. A `KUKA-391` pontosan ezt a rést nevezte meg: a
// kiszolgáló két olyan útmutatót kínált fel, amit a felület nem tudott végigvinni, és a kötelező
// kapu emellett ZÖLD maradt.
//
// EZÉRT ez a lap minden ÚJ útmutatót VÉGIGKATTINT a valódi felületen, és három dolgot mér:
//   1. az útmutató a VALÓDI úton elindul (súgó → Útmutatók → az útmutató gombja);
//   2. MINDEN lépése elérhető: a „Tovább" végigvisz, és az utolsó lépésig nem keletkezik
//      NEVEZETT megszakítás (`tour-blocked`), ami azt mondaná, hogy a cél nem látható;
//   3. a lépés SZÖVEGE a nyelvcsomagból jön (nem a lépés-azonosító látszik) — a buborék
//      tartalék-ága a nyers `s1`-et írná ki, és az a felhasználónak gépi szó (KUKA-210 · KUKA-237).
//
// AMIT EZ A LAP NEM MÉR: a két szereplős történeteket (azok a `proof:demo-walk` és az R112 lapja),
// és a jogosultsági mag döntéseit.
import { test, expect } from '@playwright/test';
import { World, createWorkspaceUI, gotoPage, PASSWORD } from './helpers.mjs';
import { TOURS } from '../../v3app/knowledge/features.mjs';
import { dictFor } from '../../v3app/public/i18n/dict.mjs';
import { UJ_UTMUTATOK } from './r166Tours.mjs';

test.describe.configure({ mode: 'serial' });
const HU = dictFor('hu');

// A LISTA KÖZÖS OTTHONBÓL (`r166Tours.mjs`) — az R93 lefedés-állítása UGYANEZT olvassa.

const KOZONSEG = (id) => TOURS[id].audience;

/** Az útmutató indítása a VALÓDI úton: súgó → Útmutatók fül → az útmutató saját gombja. */
async function closeHelp(page) {
  // A súgó MODÁLIS panel: nyitva a lap többi része nem kattintható — a felhasználó is becsukja
  // (× vagy Esc), mielőtt továbbmegy. A saját első alakom ezt nem tette, és a MÁSODIK útmutató
  // indítása „intercepts pointer events"-be futott: a próba a saját előkészítését mérte (KUKA-120).
  if (await page.getByTestId('help-close').count()) {
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('help-close')).toHaveCount(0);
  }
}

/**
 * MINDEN NYITOTT MODÁLIS PANEL BEZÁRÁSA — a felhasználó útján (Esc). SAJÁT LELET a próbán: a
 * `tour.verify` bejárása megnyitja a levél-fogadót, és a NYITOTT párbeszéd mellett a következő
 * útmutató indítása „intercepts pointer events"-be fut. A próba a saját előkészítését mérte volna,
 * nem a rendszert (KUKA-120).
 */
async function closeModals(page) {
  for (let i = 0; i < 5; i += 1) {
    if (await page.locator('dialog[open]').count() === 0) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
  }
}

async function startTourViaHelp(page, tourId) {
  const featureId = TOURS[tourId].feature;
  if (await page.getByTestId('tour-exit').count()) await page.getByTestId('tour-exit').click();
  await closeModals(page);
  await closeHelp(page);
  if (await page.getByTestId('help-open').count() === 0) return false;
  await page.getByTestId('help-open').click();
  await expect(page.getByTestId('help-close')).toBeVisible();
  await page.getByTestId('help-tab-guides').click();
  // A FELHASZNÁLÓ ÚTJA: a súgó-sort előbb KI KELL NYITNI — az útmutató gombja a sor alatt áll,
  // tehát a zárt sor mellett nem létezik (a `appears_after` elve a súgóban is érvényes).
  const sor = page.getByTestId(`help-guide-${featureId}`);
  if (await sor.count() === 0) return false;          // a súgó ebben a nézetben nem kínálja fel
  await sor.getByRole('button').first().click();
  const gomb = page.getByTestId(`help-tour-${featureId}`);
  if (await gomb.count() === 0) return false;         // nincs útmutatója ebben a nézetben
  await gomb.click();
  // A LAP MAGA CSUKJA BE A SÚGÓT (`startTour` → `closeHelp`) — a próba NE nyomjon rá még egy Esc-et,
  // mert az már a MEGNYÍLT útmutató panelt zárná be. Saját lelet: emiatt futott időtúllépésbe a
  // lépés-cím olvasása (KUKA-209: a rajzolás és a művelet két külön tény).
  if (await page.getByTestId('tour').count() === 0) return false;
  if (await page.getByTestId('tour-step-title').count() === 0) {
    // DIAGNOSZTIKA: a panel kint van, de lépés nincs — a panel maga mondja meg, miért (megszakítás).
    const miert = ((await page.getByTestId('tour').textContent()) || '').trim().replace(/\s+/g, ' ').slice(0, 90);
    const elsoCel = TOURS[tourId].steps[0].target;
    const vanE = await page.getByTestId(elsoCel).count();
    const lathato = vanE ? await page.getByTestId(elsoCel).first().isVisible() : false;
    const jelenlevo = await page.evaluate(() => [...document.querySelectorAll('[data-testid]')]
      .map((e) => e.getAttribute('data-testid')).filter((x) => /^(auth|login|register|resend|nav-|app|tour)/.test(x)).slice(0, 14).join(','));
    return { nemIndult: `${miert} [első cél: ${elsoCel} · a lapon: ${vanE} · látható: ${lathato} · jelen: ${jelenlevo}]` };
  }
  return true;
}

/**
 * VÉGIGKATTINTÁS. A „Tovább" minden lépésen, az utolsóig. A mérés HÁROM dolgot gyűjt: hol állt meg,
 * volt-e nevezett megszakítás, és minden lépés szövege a nyelvcsomagból jött-e.
 */
async function walkTour(page, tourId) {
  const D = HU.TOUR[tourId];
  const steps = TOURS[tourId].steps;
  const bajok = [];
  for (let i = 0; i < steps.length; i += 1) {
    const varhatoCim = D && D[steps[i].id] ? D[steps[i].id].title : null;
    if (!varhatoCim) { bajok.push(`${steps[i].id}: nincs szöveg a nyelvcsomagban`); break; }
    /**
     * A FELTÁRÓ VEZÉRLŐT A FELHASZNÁLÓ NYOMJA MEG — tehát a próba is (KUKA-228: amit az útmutató nem
     * nyom meg helyettünk, arra várni kell). Ha a lépés célja csak egy másik vezérlő használata UTÁN
     * létezik (`appears_after`), a bejárás előbb azt nyomja meg, ahogy az ember.
     */
    const feltaro = steps[i].appears_after;
    if (feltaro && await page.getByTestId(steps[i].target).count() === 0
        && await page.getByTestId(feltaro).count() > 0
        && await page.getByTestId(feltaro).first().isVisible()) {
      await page.getByTestId(feltaro).first().click();
    }
    // A BUBORÉK a lépés SAJÁT szövegét mutatja — a panel újrarajzolására várunk, nem egy pillanatot
    // mérünk (KUKA-121: a próba ne a saját türelmetlenségét mérje).
    try {
      await expect(page.getByTestId('tour-step-title')).toHaveText(varhatoCim, { timeout: 8000 });
    } catch {
      const kint = ((await page.getByTestId('tour-step-title').textContent().catch(() => null)) || '(nincs lépés-cím)').trim();
      bajok.push(`${steps[i].id}: a buborék „${kint.slice(0, 50)}”, a csomag szerint „${varhatoCim}”`);
      break;
    }
    // A NEVEZETT MEGSZAKÍTÁS a bukás: azt mondja, hogy a megnevezett elem nem látható ezen a képernyőn.
    if (await page.getByTestId('tour-blocked').count() > 0) {
      bajok.push(`${steps[i].id}: NEVEZETT megszakítás — ${((await page.getByTestId('tour-blocked').textContent()) || '').trim().slice(0, 70)}`);
      break;
    }
    if (i + 1 < steps.length) await page.getByTestId('tour-next').click();
  }
  return { bajok, lepes: steps.length };
}

let world; let anna;

test.beforeAll(async ({ browser }) => {
  world = new World(browser, 'r166u');
  anna = await world.person('anna');
  await createWorkspaceUI(anna.page, { name: 'R166 Útmutató Kft', business: { jurisdiction: 'HU', tax_id: '82345671-2-42' } });
});

test.afterAll(async () => { if (world) await world.close(); });

test('R166-U0 — a tizenkét pótolt útmutató MIND szerepel a regiszterben, és mindegyiknek VAN szövege (hu · en · de)', async () => {
  const hianyzo = UJ_UTMUTATOK.filter((t) => !TOURS[t]);
  expect(hianyzo.join(',') || 'nincs', 'mind a tizenkettő a regiszterben áll').toBe('nincs');
  const bajok = [];
  for (const code of ['hu', 'en', 'de']) {
    const D = dictFor(code);
    for (const t of UJ_UTMUTATOK) {
      const szoveg = D.TOUR[t];
      if (!szoveg || !szoveg.title || !szoveg.lead) { bajok.push(`${code}/${t}: nincs cím vagy bevezető`); continue; }
      for (const st of TOURS[t].steps) {
        if (!szoveg[st.id] || !szoveg[st.id].title || !szoveg[st.id].body) bajok.push(`${code}/${t}/${st.id}: hiányos szöveg`);
      }
    }
  }
  expect(bajok.join(' · ') || 'nincs', 'minden lépésnek van címe és törzse mind a három bekapcsolt nyelven').toBe('nincs');
});

test('R166-U1 — a NÉVTELEN képernyőn felkínált útmutatók végigvihetők (belépés előtt is)', async () => {
  const c = await world.context();
  await c.page.goto('/');
  await expect(c.page.getByTestId('login-email')).toBeVisible();
  const nyilvanos = UJ_UTMUTATOK.filter((t) => KOZONSEG(t) === 'public');
  expect(nyilvanos.length, 'van nyilvános útmutató a pótoltak között').toBeGreaterThan(0);
  const jelentes = [];
  for (const t of nyilvanos) {
    // MINDEN ÚTMUTATÓ A SAJÁT KIINDULÓ KÉPERNYŐJÉRŐL indul — a felhasználó is a belépési lapról
    // kezd, nem egy előző bejárás végállapotából (KUKA-120: a próba ne a saját maradékát mérje).
    await c.page.goto('/');
    await expect(c.page.getByTestId('login-email')).toBeVisible();
    const elindult = await startTourViaHelp(c.page, t);
    if (elindult !== true) { jelentes.push(`${t}: NEM indult el — ${elindult && elindult.nemIndult ? elindult.nemIndult : 'a súgó nem kínálta fel'}`); continue; }
    const r = await walkTour(c.page, t);
    jelentes.push(r.bajok.length ? `${t}: ${r.bajok.join(' · ')}` : `${t}: ${r.lepes}/${r.lepes} OK`);
    await c.page.getByTestId('tour-exit').click();
  }
  expect(jelentes.filter((x) => !/OK$/.test(x)).join(' | ') || 'mind rendben',
    `a nyilvános útmutatók végigvihetők — mérve: ${jelentes.join(' | ')}`).toBe('mind rendben');
});

test('R166-U2 — a BELÉPETT nézetben felkínált útmutatók végigvihetők', async () => {
  const belepett = UJ_UTMUTATOK.filter((t) => KOZONSEG(t) === 'signed_in');
  expect(belepett.length).toBeGreaterThan(0);
  const jelentes = [];
  for (const t of belepett) {
    // A SEGÉD útmutatója NYITVA hagyja a súgó-panelt (a célja ott van) — a következő útmutató előtt
    // a felhasználó is becsukja. Modális panel mellett a menü nem kattintható, és a próba a saját
    // maradékát mérné (KUKA-120).
    if (await anna.page.getByTestId('tour-exit').count()) await anna.page.getByTestId('tour-exit').click();
    await closeModals(anna.page);
    await gotoPage(anna.page, 'overview');
    const elindult = await startTourViaHelp(anna.page, t);
    if (elindult !== true) { jelentes.push(`${t}: NEM indult el — ${elindult && elindult.nemIndult ? elindult.nemIndult : 'a súgó nem kínálta fel'}`); continue; }
    const r = await walkTour(anna.page, t);
    jelentes.push(r.bajok.length ? `${t}: ${r.bajok.join(' · ')}` : `${t}: ${r.lepes}/${r.lepes} OK`);
    if (await anna.page.getByTestId('tour-exit').count()) await anna.page.getByTestId('tour-exit').click();
  }
  expect(jelentes.filter((x) => !/OK$/.test(x)).join(' | ') || 'mind rendben',
    `a belépett útmutatók végigvihetők — mérve: ${jelentes.join(' | ')}`).toBe('mind rendben');
});

test('R166-U3 — 390 px szélességben is végigvihető (a keskeny nézet nem más szabály)', async () => {
  const c = await world.context();
  await c.page.setViewportSize({ width: 390, height: 844 });
  await c.page.goto('/');
  await expect(c.page.getByTestId('login-email')).toBeVisible();
  const t = 'tour.login';
  const elindult = await startTourViaHelp(c.page, t);
  expect(elindult === true ? 'elindult' : `NEM indult el — ${elindult && elindult.nemIndult ? elindult.nemIndult : 'a súgó nem kínálta fel'}`,
    'a keskeny nézetben is felkínálja a súgó, és el is indul').toBe('elindult');
  const r = await walkTour(c.page, t);
  expect(r.bajok.join(' · ') || 'nincs', `390 px: ${t} végigvihető`).toBe('nincs');
});
