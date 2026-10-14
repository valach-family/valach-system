// tests/e2e/v3app-r190-k3-diag.diag.mjs — AZ R176-K3 MÉRT INGADOZÁSÁNAK CÉLZOTT VIZSGÁLATA (R189 §3).
//
// MIÉRT `.diag.mjs` ÉS NEM `.spec.mjs` — KIMONDVA. A kötelező kapu (`tools/vs_verify_browser_gate.mjs`)
// a lemezen álló MINDEN `tests/e2e/*.spec.mjs` fájlt megköveteli a jelentésben, tehát egy ilyen néven
// hagyott diagnosztika a kapu helyzet-számát is megnövelné (154 → több), és a RÉGI bizonyítékkal
// összevethetetlenné tenné. Ez a lap MÉRŐESZKÖZ egy NYITOTT tételhez, nem a kapu része: az R189 §3
// csak REPRODUKCIÓ esetén kér determinisztikus regressziót, és a keretben reprodukció NEM történt.
// Ezért a fájl a repóban marad (a következő kör ingyen újrafuttathatja), de a kapun NEM változtat.
//
// FUTTATÁS (MÉRVE — ennek a futtatónak NINCS `--testMatch` kapcsolója, csak konfiguráció):
//   npm run diag:r190-k3                       # mind az öt eset
//   npm run diag:r190-k3 -- -g "R190-D4"       # egy eset
//
// MIÉRT KÜLÖN LAP, ÉS MIÉRT NEM A `R176-K3`-BA ÍRVA. Az R189 §3 egy KORLÁTOZOTT hibavizsgálatot
// kér (legfeljebb 60 perc aktív vizsgálat, legfeljebb 20 célzott esetfuttatás), és kimondja, hogy
// „vezérelt válaszsorrenddel" kell vizsgálni a névtelen átmenetet, a helyes szereplőt és a
// harmadik személyt. A `R176-K3` a TELJES, 19 lépéses történetet járja (~31 s), tehát a váltás
// határán történő újratöltés mérésére DRÁGA és zajos. Ez a lap CSAK az egy lépést méri: elvezet a
// váltás-lépésig (`megallAt`), ott vált és újratölt — a többi 13 lépést nem futtatja újra.
//
// A NAPLÓ TITOKMENTES. A rekeszből csak a lépés-INDEX kerül a naplóba, a válaszokból csak az
// alany-azonosító UTOLSÓ HAT jegye (jelölő, nem azonosítás) — jegy, e-mail, titok és üzleti adat
// nem. A napló maga a lap `sessionStorage`-ában áll, tehát az ÚJRATÖLTÉST is túléli: pontosan ez
// kell, mert a mérendő esemény az újratöltés KÉT oldalán zajlik.
import { test, expect } from '@playwright/test';
import { World, PASSWORD, createWorkspaceUI, inviteUI, loginUI } from './helpers.mjs';
import { TOURS } from '../../v3app/knowledge/features.mjs';
import { dictFor } from '../../v3app/public/i18n/dict.mjs';
import { closeModals, startTourViaHelp } from './tourWalk.mjs';

test.describe.configure({ mode: 'serial' });
const HU = dictFor('hu');
const REKESZ = 'vs3.tour.handover';

/**
 * A MÉRŐ, AMIT A LAP INDULÁSA ELŐTT TESZÜNK FEL — ÉS AMI AZ ÚJRATÖLTÉSEN IS ÁTMEGY.
 *
 * Négy tényt jegyez fel, időbélyeggel: a lap INDULÁSA · a rekesz minden ÍRÁSA/OLVASÁSA/ÜRÍTÉSE ·
 * minden kérés KIMENETE és VISSZATÉRÉSE (úttal és státusszal) · és a lap ELHAGYÁSA (`pagehide`).
 * A `pagehide` figyelőnk a termék figyelője ELŐTT regisztrál, tehát a napló a mentés ELŐTTI
 * állapotot is megőrzi.
 *
 * A TERMÉKKÓDHOZ NEM NYÚLUNK: a burkolat kívülről kerül a `Storage.prototype`-ra és a `fetch`-re.
 */
function meroScript() {
  const K = 'vs3.tour.handover';
  const NAPLO = 'vs3.diag.naplo';
  const P = Storage.prototype;
  const oSet = P.setItem; const oRem = P.removeItem; const oGet = P.getItem;
  // A napló a SAJÁT, burkolatlan műveleteket használja — különben a feljegyzés önmagát jegyezné fel.
  const jegyez = (s) => {
    try {
      const a = JSON.parse(oGet.call(sessionStorage, NAPLO) || '[]');
      a.push(`${String(Math.round(performance.now())).padStart(6, ' ')}ms  ${s}`);
      oSet.call(sessionStorage, NAPLO, JSON.stringify(a));
    } catch { /* a napló hiánya nem állíthatja meg a mérést */ }
  };
  if (window.__r190diag) return;
  window.__r190diag = true;
  jegyez(`=== LAP INDUL (${location.pathname}${location.search}) ===`);

  P.setItem = function setItemMert(k, v) {
    if (k === K) {
      let at = '?'; let id = '?';
      try { const o = JSON.parse(v); at = o.at; id = o.id; } catch { /* alak-hiba is tény */ }
      jegyez(`REKESZ ÍRÁS      at=${at} id=${id}`);
    }
    return oSet.call(this, k, v);
  };
  P.removeItem = function removeItemMert(k) {
    if (k === K) jegyez('REKESZ ÜRÍTÉS    (clearTourHandover)');
    return oRem.call(this, k);
  };
  P.getItem = function getItemMert(k) {
    const v = oGet.call(this, k);
    if (k === K) jegyez(`REKESZ OLVASÁS   -> ${v ? 'MEGVAN' : 'ÜRES'}`);
    return v;
  };

  const oFetch = window.fetch;
  window.fetch = async function fetchMert(...args) {
    let ut = '';
    try { ut = new URL((args[0] && args[0].url) || args[0], location.href).pathname; } catch { ut = String(args[0]); }
    jegyez(`KÉRÉS   →        ${ut}`);
    const r = await oFetch.apply(this, args);
    let extra = '';
    // A VÁLASZ TARTALMÁBÓL CSAK A SZEMÉLY JELÖLŐJE kell — az azonosító utolsó hat jegye.
    if (ut === '/api/me' || ut === '/api/assistant/status') {
      try {
        const j = await r.clone().json();
        if (ut === '/api/me') {
          const s = j && j.subject_id ? String(j.subject_id) : null;
          extra = ` alany=${s ? `…${s.slice(-6)}` : 'NÉVTELEN'} konyv=${j && j.current_book_id ? `…${String(j.current_book_id).slice(-6)}` : '-'}`;
        } else {
          const t = (j && j.tours || []).length; const rt = (j && j.resumable_tours || []).length;
          extra = ` indithato=${t} folytathato=${rt} ok=${j && j.ok}`;
        }
      } catch { extra = ' (a törzs nem olvasható)'; }
    }
    jegyez(`VÁLASZ  ←        ${ut} ${r.status}${extra}`);
    return r;
  };

  window.addEventListener('pagehide', () => jegyez('PAGEHIDE         (a termék mentése EZUTÁN fut)'));
}

/** A felgyűjtött napló — és egyben a lap mai, LÁTHATÓ döntése a bemutatóról. */
async function leolvas(page) {
  return page.evaluate((k) => {
    const naplo = (() => { try { return JSON.parse(sessionStorage.getItem('vs3.diag.naplo') || '[]'); } catch { return ['(a napló nem olvasható)']; } })();
    const rekesz = (() => { try { return sessionStorage.getItem(k); } catch { return 'OLVASHATATLAN'; } })();
    const q = (s) => document.querySelector(`[data-testid="${s}"]`);
    return {
      naplo,
      rekesz: rekesz ? `MEGVAN at=${(() => { try { return JSON.parse(rekesz).at; } catch { return '?'; } })()}` : 'ÜRES',
      panel: Boolean(q('tour')),
      lepesCim: (q('tour-step-title') && q('tour-step-title').textContent || '(nincs)').trim().slice(0, 50),
      haladas: (q('tour-progress') && q('tour-progress').textContent || '(nincs)').replace(/\s+/g, ' ').trim(),
      blocked: (q('tour-blocked') && q('tour-blocked').textContent || '(nincs)').trim().slice(0, 70),
    };
  }, REKESZ);
}

/** A VÁLTÁS-LÉPÉS INDEXE a történetben — a mérés ehhez a lépéshez tartozik, nem egy számhoz. */
function elsoValtasLepes(tourId) {
  const steps = TOURS[tourId].steps;
  const i = steps.findIndex((x) => x.switch_actor === true && x.switch_axis === 'subject');
  return { index: i, id: steps[i].id };
}

/**
 * ELVEZET A VÁLTÁS-LÉPÉSIG — a történet elejét végigjárja, de a váltást MÁR NEM végzi el.
 * (A `vezess` `megallAt`-ja a megnevezett lépés AKCIÓJA előtt áll meg.)
 */
async function vezessAValtasig(page, tourId, akciok) {
  const steps = TOURS[tourId].steps;
  const D = HU.TOUR[tourId];
  const { id: valtasId } = elsoValtasLepes(tourId);
  const naplo = [];
  for (let i = 0; i < steps.length; i += 1) {
    const st = steps[i];
    const cim = D[st.id].title;
    await expect(page.getByTestId('tour-step-title')).toHaveText(cim, { timeout: 8000 });
    naplo.push(st.id);
    if (st.id === valtasId) return { naplo, valtasId, index: i };
    if (akciok[st.id]) await akciok[st.id]();
    const tovabb = page.getByTestId('tour-next');
    const cel = page.getByTestId(st.target);
    if (await cel.count() && await cel.isVisible().catch(() => false)
        && await cel.evaluate((el) => ['BUTTON', 'A', 'SUMMARY'].includes(el.tagName)).catch(() => false)) {
      await cel.click({ timeout: 4000 }).catch(() => {});
    }
    if (await tovabb.count() && await tovabb.isEnabled().catch(() => false)) await tovabb.click();
  }
  throw new Error(`a váltás-lépés (${valtasId}) nem jött el — bejárva: ${naplo.join('→')}`);
}

/** A KILÉPÉS A NÉZŐ ÚTJÁN (a váltás-lépésen a bemutatónak kell feltárnia a vezérlőt). */
async function kilepAValtasLepesen(page) {
  await closeModals(page);
  const horgony = page.locator('[data-tour-anchor="actor-switch"]');
  const lathato = async () => {
    const n = await horgony.count();
    for (let k = 0; k < n; k += 1) if (await horgony.nth(k).isVisible().catch(() => false)) return horgony.nth(k);
    return null;
  };
  let v = await lathato();
  if (!v) {
    const kiemelt = page.locator('.tourtarget').first();
    if (await kiemelt.count() && await kiemelt.isVisible()) {
      await kiemelt.click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(150);
      v = await lathato();
    }
  }
  if (!v) throw new Error('a váltó vezérlő nem tárult fel a néző útján');
  await v.click();
  await expect(page.getByTestId('login-email')).toBeVisible();
}

let world;
test.beforeAll(async ({ browser }) => { world = new World(browser, 'r190d'); });
test.afterAll(async () => { if (world) await world.close(); });

/**
 * A VILÁG EGY ESETHEZ: friss fiókkezelő, friss meghívott, függő meghívás — és a bemutató elvezetve
 * a váltás-lépésig. Minden eset SAJÁT szereplőket kap (`KUKA-120`: a próba ne a maradékát mérje).
 */
/**
 * A SZEREPLŐK NEVE MINDEN FUTÁSBAN MÁS — ÉS EZT NEM MODUL-ÁLLAPOTRA BÍZZUK (saját lelet, MÉRVE).
 *
 * Az első alakom egy modul-szintű számlálóval adott egyedi nevet. `--repeat-each` mellett viszont a
 * futtató a modult MINDEN ismétléshez ÚJRA betölti, tehát a számláló VISSZAÁLLT 1-re: a második
 * ismétlés ugyanazt a címet regisztrálta, a kiszolgáló a már létező fiókra nevezetten UGYANAZT a
 * „elküldtük" mondatot adta (K03 · KUKA-084), a levél-fogadóban pedig a RÉGI, már felhasznált
 * hivatkozás állt — hét ismétlés bukott el a próba saját maradékán, nem a rendszeren (KUKA-120).
 * Ezért az egyediség forrása a futás ideje, nem a modul élettartama.
 */
async function vilag(cimkeAlap, { szelesseg = null } = {}) {
  const cimke = `${cimkeAlap}${Date.now().toString(36).slice(-5)}${Math.floor(Math.random() * 1000)}`;
  const anna = await world.person(`a_${cimke}`);
  const ws = await createWorkspaceUI(anna.page, { name: `R190 ${cimke} Kft`, business: { jurisdiction: 'HU', tax_id: '10779224-2-44' } });
  const bela = await world.person(`b_${cimke}`);
  await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
  const p = anna.page;
  await p.addInitScript(meroScript);
  /**
   * A NÉZET SZÉLESSÉGE A MÉRÉS RÉSZE. Az `R176-K3` — az EGYETLEN tétel, ami ingadozott — 390 px-en
   * fut, a `K4` (ugyanaz az újratöltés asztali szélességen) nem ingadozott. A szélesség tehát nem
   * díszítés: keskeny nézetben a célok a ☰ mögé kerülnek, és egy `targetMissing` megszakítás a
   * futást MÉG A LAP ELHAGYÁSA ELŐTT leveheti — a `pagehide` mentése ilyenkor nem talál futást.
   */
  if (szelesseg) await p.setViewportSize({ width: szelesseg, height: 844 });
  await p.goto('/');
  /**
   * A KÉSZ ALAPÁLLÁS KESKENY NÉZETBEN MÁS — ÉS EZT A PRÓBÁNAK KELL TUDNIA (saját lelet, MÉRVE).
   *
   * Az első alakom a `nav-overview` LÁTHATÓSÁGÁRA várt. 390 px-en viszont a menü a ☰ mögött áll:
   * a gomb LÉTEZIK és `aria-current="page"`, de REJTETT — a mérés tehát a saját előfeltevésén
   * bukott el, nem a rendszeren (`KUKA-120`). A kész alapállás jele ezért a nézethez tartozik:
   * keskenyen a ☰, asztali szélességen a menüpont.
   */
  if (szelesseg && szelesseg < 700) await expect(p.getByTestId('nav-toggle')).toBeVisible();
  else await expect(p.getByTestId('nav-overview')).toBeVisible();
  const elindult = await startTourViaHelp(p, 'tour.inviteRevoke');
  expect(elindult, 'a történet elindult').toBe(true);
  const { valtasId } = await vezessAValtasig(p, 'tour.inviteRevoke', {
    s4: async () => {
      await closeModals(p);
      const row = p.locator('tr[data-testid^="invite-row-"]').filter({ hasText: bela.email }).first();
      await expect(row).toBeVisible();
      const ref = (await row.getAttribute('data-testid')).replace('invite-row-', '');
      await p.getByTestId(`invite-revoke-${ref}`).click();
      await expect(p.getByTestId('invite-revoke-confirm')).toBeVisible();
      await p.getByTestId('invite-revoke-confirm').click();
      await p.waitForResponse((r) => r.url().includes('/api/invites/revoke'));
    },
  });
  return { anna, bela, ws, p, valtasId };
}

// ───────────────────────────────────────────────────────────────────────────────────────────────
// D1 — A TERMÉSZETES SORREND: váltás, majd AZONNALI újratöltés. Ez az `R176-K3` mért lépése.
// ───────────────────────────────────────────────────────────────────────────────────────────────
test('R190-D1 — a váltás határán AZONNALI újratöltés: a bemutató visszaáll (a mérés naplóval)', async () => {
  const { bela, p, valtasId } = await vilag('d1');
  await kilepAValtasLepesen(p);
  await loginUI(p, bela.email, PASSWORD);
  await p.reload();
  let hiba = null;
  try { await expect(p.getByTestId('tour')).toBeVisible({ timeout: 15000 }); } catch (e) { hiba = String(e.message).split('\n')[0]; }
  const m = await leolvas(p);
  console.log(`\n───── R190-D1 (váltás-lépés: ${valtasId}) ─────\n${m.naplo.join('\n')}`
    + `\n── A LAP DÖNTÉSE: panel=${m.panel} lépés="${m.lepesCim}" haladás="${m.haladas}" blocked="${m.blocked}" rekesz=${m.rekesz}\n`);
  expect(hiba || 'a bemutató VISSZAÁLLT', `a váltás határán az újratöltés nem veszíti el a haladást — rekesz: ${m.rekesz}`).toBe('a bemutató VISSZAÁLLT');
});

// ───────────────────────────────────────────────────────────────────────────────────────────────
// D2 — VEZÉRELT SORREND: NÉVTELEN ÁTMENET. Az újratöltés `/api/me` válasza NÉVTELEN, és csak
// AZUTÁN derül ki, ki van bent. Az R189 §3 nevezetten ezt kéri megvizsgálni.
// ───────────────────────────────────────────────────────────────────────────────────────────────
test('R190-D2 — VEZÉRELT: az újratöltés NÉVTELEN /api/me-t lát, és a személy csak UTÁNA derül ki', async () => {
  const { bela, p, valtasId } = await vilag('d2');
  await kilepAValtasLepesen(p);
  await loginUI(p, bela.email, PASSWORD);

  /**
   * A NÉVTELENSÉG KÖVETKEZETES: ha nincs munkamenet, akkor `/api/me` ÉS a bemutató-lista IS
   * névtelen. (Az első alakom csak az `/api/me`-t hamisította, a süti viszont élt — a kiszolgáló
   * tehát továbbra is felkínálta a történetet, és a mérés a SAJÁT következetlenségét mérte, nem a
   * rendszert. `KUKA-120` alakja a próbapadon.)
   */
  let nevtelenKor = true;
  await p.route('**/api/me', async (route) => (nevtelenKor
    ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ subject_id: null, workspaces: [], current_book_id: null }) })
    : route.fallback()));
  // A MINTA VÉGÉN `*` KELL: a lap a nyelvet kérdésben küldi (`?lang=hu`), és a minta a TELJES
  // címre illeszkedik — az első alakom (`…/status`) ezért SOHA nem fogott (saját lelet, mérve).
  await p.route('**/api/assistant/status*', async (route) => (nevtelenKor
    ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, tours: [], resumable_tours: [] }) })
    : route.fallback()));

  await p.reload();
  await p.waitForTimeout(1500);
  const m1 = await leolvas(p);
  console.log(`\n───── R190-D2/a — KÖVETKEZETESEN NÉVTELEN ÚJRATÖLTÉS (váltás-lépés: ${valtasId}) ─────\n${m1.naplo.join('\n')}`
    + `\n── A LAP DÖNTÉSE: panel=${m1.panel} lépés="${m1.lepesCim}" haladás="${m1.haladas}" blocked="${m1.blocked}" rekesz=${m1.rekesz}\n`);
  // A KÓD SAJÁT ÁLLÍTÁSA (KUKA-438): névtelenül a kérdés nem tehető fel, tehát a rekesz MARAD.
  expect(m1.rekesz.startsWith('MEGVAN'), 'NÉVTELEN újratöltés: a rekesz NEM fogy el (KUKA-438)').toBe(true);

  // …ÉS A KÖVETKEZŐ BETÖLTÉS VISSZAÁLLÍT — ezt a kód kimondja („egy újabb betöltés visszaállítja").
  nevtelenKor = false;
  await p.reload();
  let hiba = null;
  try { await expect(p.getByTestId('tour')).toBeVisible({ timeout: 15000 }); } catch (e) { hiba = String(e.message).split('\n')[0]; }
  const m2 = await leolvas(p);
  console.log(`\n───── R190-D2/b — A KÖVETKEZŐ BETÖLTÉS ─────\n${m2.naplo.slice(-12).join('\n')}`
    + `\n── A LAP DÖNTÉSE: panel=${m2.panel} lépés="${m2.lepesCim}" haladás="${m2.haladas}" rekesz=${m2.rekesz}\n`);
  expect(hiba || 'visszaállt', `a névtelen kör UTÁN a következő betöltés visszaállít — rekesz: ${m2.rekesz}`).toBe('visszaállt');
});

// ───────────────────────────────────────────────────────────────────────────────────────────────
// D3 — VEZÉRELT SORREND: HARMADIK SZEMÉLY. Az újratöltéskor egy IDEGEN ember van bent. A rekesz
// NEM fogyhat el (R186 §2), és a szánt résztvevő később folytathat.
// ───────────────────────────────────────────────────────────────────────────────────────────────
test('R190-D3 — VEZÉRELT: HARMADIK ember az újratöltéskor — az átadás NEM fogy el', async () => {
  const { bela, p, valtasId } = await vilag('d3');
  const cecil = await world.person('c_d3');
  await kilepAValtasLepesen(p);
  await loginUI(p, cecil.email, PASSWORD);          // NEM a szánt résztvevő lép be
  await p.reload();
  await p.waitForTimeout(1500);
  const m1 = await leolvas(p);
  /**
   * MIT LÁT A HARMADIK EMBER — A TELJES PANEL-SZÖVEGGEL. A `panel=true` MAGÁBAN nem lelet: a
   * `tour` doboz lehet az ÜRES héj vagy a felkínálás is. A lelet csak az lenne, ha az ELŐZŐ ember
   * HALADÁSA látszana (`KUKA-416`). Ezért itt MÉRÜNK, nem minősítünk — az állítás alább a rekeszre
   * és a haladásra szól, nem a doboz létére.
   */
  const panelSzoveg = await p.evaluate(() => {
    const el = document.querySelector('[data-testid="tour"]');
    return el ? (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200) : '(nincs doboz)';
  });
  console.log(`\n───── R190-D3/a — HARMADIK ember (váltás-lépés: ${valtasId}) ─────\n${m1.naplo.slice(-16).join('\n')}`
    + `\n── A LAP DÖNTÉSE: panel=${m1.panel} lépés="${m1.lepesCim}" haladás="${m1.haladas}" blocked="${m1.blocked}" rekesz=${m1.rekesz}`
    + `\n── A HARMADIK EMBER DOBOZA: "${panelSzoveg}"\n`);
  expect(m1.rekesz.startsWith('MEGVAN'), 'a HARMADIK ember nem fogyasztotta el az átadást').toBe(true);
  // AZ ELŐZŐ EMBER HALADÁSA NEM SZIVÁROG ÁT (`KUKA-416`): se lépés-cím, se haladás-számláló.
  expect(`lépés="${m1.lepesCim}" haladás="${m1.haladas}"`,
    `a harmadik ember NEM látja az előző ember haladását — a doboza: "${panelSzoveg}"`)
    .toBe('lépés="(nincs)" haladás="(nincs)"');

  // ÉS MOST A SZÁNT RÉSZTVEVŐ: neki folytatnia KELL tudni.
  await closeModals(p);
  const prof = p.getByTestId('profile');
  if (await prof.count()) await prof.evaluate((el) => { el.open = true; });
  await p.getByTestId('logout').click();
  await expect(p.getByTestId('login-email')).toBeVisible();
  await loginUI(p, bela.email, PASSWORD);
  let hiba = null;
  try { await expect(p.getByTestId('tour')).toBeVisible({ timeout: 15000 }); } catch (e) { hiba = String(e.message).split('\n')[0]; }
  const m2 = await leolvas(p);
  console.log(`\n───── R190-D3/b — A SZÁNT RÉSZTVEVŐ ─────\n${m2.naplo.slice(-14).join('\n')}`
    + `\n── A LAP DÖNTÉSE: panel=${m2.panel} lépés="${m2.lepesCim}" haladás="${m2.haladas}" rekesz=${m2.rekesz}\n`);
  expect(hiba || 'folytatta', `a szánt résztvevő a harmadik ember UTÁN is folytatja — rekesz: ${m2.rekesz}`).toBe('folytatta');
});

// ───────────────────────────────────────────────────────────────────────────────────────────────
// D4 — A GYANÚS IDŐABLAK, VEZÉRELTEN. A D1 mérése megmutatta, hogy a visszaállás ASZINKRON (a
// `loadHelpData()` két kérésére vár), és a próba újratöltése a rekesz ÜRÍTÉSE után mindössze
// ~17 ms-mal érkezett. Ez a tétel azt a kérdést dönti el, amit a D1 nyitva hagyott: MI TÖRTÉNIK,
// ha az újratöltés BELE esik a visszaállás ablakába — amikor a rekeszt már elolvasták, de a futás
// még nem áll. A `status` választ KÉSLELTETJÜK, tehát a sorrend nem a véletlenen áll.
// ───────────────────────────────────────────────────────────────────────────────────────────────
test('R190-D4 — VEZÉRELT: az újratöltés a VISSZAÁLLÁS ABLAKÁBAN érkezik (rekesz elolvasva, futás még nincs)', async () => {
  const { bela, p, valtasId } = await vilag('d4');
  await kilepAValtasLepesen(p);

  // CSAK A BELÉPÉS UTÁNI ELSŐ `status` KÉSIK — az újratöltés utáni visszaállás normál tempóban megy.
  let keslelesHatravan = 1;
  await p.route('**/api/assistant/status*', async (route) => {
    if (keslelesHatravan > 0) { keslelesHatravan -= 1; await new Promise((r) => setTimeout(r, 1200)); }
    return route.fallback();
  });

  await loginUI(p, bela.email, PASSWORD);
  // …ÉS MOST TÖLTÜNK ÚJRA, MIKÖZBEN A VISSZAÁLLÁS MÉG A VÁLASZRA VÁR.
  await p.reload();
  let hiba = null;
  try { await expect(p.getByTestId('tour')).toBeVisible({ timeout: 15000 }); } catch (e) { hiba = String(e.message).split('\n')[0]; }
  const m = await leolvas(p);
  console.log(`\n───── R190-D4 — ÚJRATÖLTÉS A VISSZAÁLLÁS ABLAKÁBAN (váltás-lépés: ${valtasId}) ─────\n${m.naplo.join('\n')}`
    + `\n── A LAP DÖNTÉSE: panel=${m.panel} lépés="${m.lepesCim}" haladás="${m.haladas}" blocked="${m.blocked}" rekesz=${m.rekesz}\n`);
  expect(hiba || 'a bemutató VISSZAÁLLT',
    `az ablakba eső újratöltés sem veszíti el a haladást — rekesz: ${m.rekesz}`).toBe('a bemutató VISSZAÁLLT');
});

// ───────────────────────────────────────────────────────────────────────────────────────────────
// D5 — UGYANAZ 390 PX-EN. Ez az `R176-K3` EGYETLEN megkülönböztető jegye a nem ingadozó `K4`-hez
// képest: a keskeny nézet. A D1 (asztali) zöld — ha a bukás a szélességhez kötött, ITT jön elő.
// ───────────────────────────────────────────────────────────────────────────────────────────────
test('R190-D5 — 390 PX: a váltás határán AZONNALI újratöltés (az R176-K3 szélességén)', async () => {
  const { bela, p, valtasId } = await vilag('d5', { szelesseg: 390 });
  await kilepAValtasLepesen(p);
  await loginUI(p, bela.email, PASSWORD);
  await p.reload();
  let hiba = null;
  try { await expect(p.getByTestId('tour')).toBeVisible({ timeout: 15000 }); } catch (e) { hiba = String(e.message).split('\n')[0]; }
  const m = await leolvas(p);
  console.log(`\n───── R190-D5 — 390 PX (váltás-lépés: ${valtasId}) ─────\n${m.naplo.join('\n')}`
    + `\n── A LAP DÖNTÉSE: panel=${m.panel} lépés="${m.lepesCim}" haladás="${m.haladas}" blocked="${m.blocked}" rekesz=${m.rekesz}\n`);
  expect(hiba || 'a bemutató VISSZAÁLLT',
    `390 px-en a váltás határán az újratöltés nem veszíti el a haladást — rekesz: ${m.rekesz}`).toBe('a bemutató VISSZAÁLLT');
});
