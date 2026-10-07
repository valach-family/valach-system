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
import { World, createWorkspaceUI, gotoPage } from './helpers.mjs';
import { TOURS } from '../../v3app/knowledge/features.mjs';
import { dictFor } from '../../v3app/public/i18n/dict.mjs';
import { UJ_UTMUTATOK } from './r166Tours.mjs';
// A BEJÁRÓ KÖZÖS OTTHONBÓL (`tourWalk.mjs`) — a minta-kapu viselkedés-őre UGYANEZT futtatja (KUKA-003).
import { closeModals, startTourViaHelp, walkTour } from './tourWalk.mjs';

test.describe.configure({ mode: 'serial' });

// A LISTA KÖZÖS OTTHONBÓL (`r166Tours.mjs`) — az R93 lefedés-állítása UGYANEZT olvassa.

const KOZONSEG = (id) => TOURS[id].audience;

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
