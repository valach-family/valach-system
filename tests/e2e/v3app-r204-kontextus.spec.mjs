// tests/e2e/v3app-r204-kontextus.spec.mjs — A KÉSŐ VÁLASZ ÉS A SZEMÉLYVÁLTÁS KÖZÖS HATÁRA (R204).
//
// MIÉRT VAN EZ A LAP, ÉS MIÉRT NEM A MEGLÉVŐ R112-ES FÁJLBAN. Az R112-I3 próba a TÜNETET rögzíti,
// és a saját fején ZÖLD: a hiba ott egyszeri, nem vezérelt eseménysoron jött elő, és a jelentés
// (R176 · R186 §4) kimondta, hogy a mechanizmus MÉRVE NINCS. Az R204 SPEC §2 ezt kérte:
//
//   „A válaszok sorrendjét szabályozó böngészőpróbával állíts elő konkrét eseménysort; valódi
//    szerverválaszt késleltethetsz, de a sikeres üzleti választ ne találja ki a teszt."
//
// Ez a lap tehát NEM az R112-I3 helyettesítője (az marad, a maga rögzítésével), hanem a VEZÉRELT
// eseménysor: ugyanazt a határt méri, de a sorrendet a próba állítja elő, nem a szerencse. Minden
// üzleti választ a VALÓDI szerver ad (`route.fetch()`); a próba csak a MEGÉRKEZÉS idejét és egy
// OLVASÓ kérés elvesztését vezérli — kitalált siker nincs (KUKA-220: a böngésző kivétele nem
// bizonyít írás-mentességet, ezért az írás válaszát nem hamisítjuk, csak visszatartjuk).
//
// A MÉRT MECHANIZMUS (R204 — a saját mérésem, lásd a REPORT §2): a `refreshMe` KÉT korai kilépése
// (`seq`-eltérés · `status === 0`) KIHAGYJA a `render()`-t, és a `state.me`-t a RÉGI emberen hagyja.
// A meghívó-képernyőn ráadásul a `global-notice` elem NINCS a lapon (a héj `main`-jében születik),
// tehát a `notice()` üzenete NÉMÁN az állapotba kerül. A hívó (`doRedeem`) ezután a RÉGI `state.me`
// alapján dönti el, hogy „az övé-e a siker" — így a védelem, amit az R112 épp ezért épített
// (KUKA-204), egy elvesztett `/api/me` válasszal megkerülhető.
import { test, expect } from '@playwright/test';
import { World, inviteUI, openInviteUI, createWorkspaceUI, logoutUI, withResponse, PASSWORD } from './helpers.mjs';
import { dictFor } from '../../v3app/public/i18n/dict.mjs';

test.describe.configure({ mode: 'serial' });

const TOUR_ID = 'tour.inviteAccept';
const taxOf = (tag) => `${tag.replace(/\D/g, '').slice(0, 2).padStart(2, '8')}345671-2-42`;

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

test.describe('R204 — a késő válasz és a személyváltás közös határa', () => {
  let w; let anna;

  test.beforeAll(async ({ browser }) => {
    w = new World(browser, `r204-${Date.now().toString(36)}`);
    anna = await w.person('anna');
    const biz = await createWorkspaceUI(anna.page, { name: 'R204 Kft', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag) } });
    expect(biz.body.ok).toBe(true);
  });

  test.afterAll(async () => { if (w) await w.close(); });

  /**
   * R204-K1 — VEZÉRELT ESEMÉNYSOR: a beváltás válasza KÉSVE érkezik, közben MÁS ember lép be
   * ugyanabban a böngészőben, ÉS a frissítés olvasó kérése elveszik.
   *
   * MIT VEZÉREL A PRÓBA, ÉS MIT NEM:
   *   · VEZÉRELT: a `/api/invites/redeem` válaszának MEGÉRKEZÉSI ideje (a szerver MÁR feldolgozta),
   *     és EGYETLEN `/api/me` OLVASÓ kérés elvesztése (`route.abort`) — ez a valódi hálózati hiba
   *     alakja, amit a `v3app` `api()` `status: 0`-ként ad vissza.
   *   · NEM VEZÉRELT és nem kitalált: a beváltás üzleti eredménye. A szerver válaszolt, a tagság
   *     tényleg létrejött, és a próba a tárolt tényt is visszaolvassa.
   *
   * MIT ÁLLÍT: a kiszolgáló által igazolt személy, a FEJLÉC és az ÉRTESÍTÉS ugyanazt a kontextust
   * tükrözze. Késő válasz NE rajzolja vissza a régi személyt, és a siker ne annak szóljon, aki
   * nem végezte (R204 SPEC §2 · KUKA-204).
   */
  test('R204-K1 — a KÉSŐ beváltás + elvesztett frissítés nem rajzolja vissza a régi személyt, és a siker nem száll át', async () => {
    const D = dictFor('hu');
    const carl = await w.person('carl');
    const dora = await w.person('dora');
    const inv = await inviteUI(anna.page, { email: carl.email, role: 'user', scope: 'keszlet' });
    expect(inv.body.ok).toBe(true);
    await openInviteUI(carl.page, inv.link);
    await tourToLastStep(carl.page, D);

    // (1) A BEVÁLTÁS VÁLASZÁT VISSZATARTJUK. A szerver MÁR feldolgozta (Carl csatlakozott), a lap
    //     még nem tudja. A választ NEM írjuk át — csak később engedjük ki.
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
    await expect.poll(() => served && served.ok, { message: 'a VALÓDI szerver fogadta el a beváltást' }).toBe(true);
    expect(served.subject_id).toBe(carl.subjectId);

    // (2) KÖZBEN UGYANEBBEN A BÖNGÉSZŐBEN Dóra lép be egy másik lapon — Carl munkamenete lecserélődik.
    const p2 = await carl.ctx.newPage();
    await p2.goto('/');
    await logoutUI(p2);
    const li = await loginHere(p2, dora.email);
    expect(li.body.ok).toBe(true);

    // (3) A FRISSÍTÉS OLVASÓ KÉRÉSE ELVESZIK — EGYSZER. Ez az az eseménysor, amit az R186 §4 nem
    //     tudott előállítani: a `doRedeem` a beváltás UTÁN frissít, és ha ez a frissítés nem jut
    //     el a szerverig, a lap a RÉGI igazsággal marad.
    let aborted = 0;
    await carl.page.route('**/api/me', async (route) => {
      if (aborted === 0) { aborted = 1; await route.abort('failed'); return; }
      await route.fallback();
    });

    // (4) A KÉSŐ VÁLASZ MEGÉRKEZIK Carl régi lapjára.
    release();
    await answered;
    await expect.poll(() => aborted, { message: 'a frissítés olvasó kérése tényleg elveszett' }).toBe(1);
    await carl.page.unroute('**/api/invites/redeem');

    // (5) A MÉRÉS. A szerver igazsága: a munkamenet DÓRÁÉ.
    const me = (await carl.api.get('/api/me')).body;
    expect(me.subject_id, 'a kiszolgáló szerint Dóra ül a lapnál').toBe(dora.subjectId);

    const fejlec = carl.page.getByTestId('header-subject');
    const ertesito = carl.page.getByTestId('global-notice');
    // A RÖGZÍTÉS MINDIG MEGTÖRTÉNIK, bukásnál is — a következő előfordulás adatot hozzon, ne
    // találgatást (KUKA-121).
    const allapot = async () => ({
      fejlec: (await fejlec.count()) ? (await fejlec.textContent() || '').trim() : '(nincs fejléc-elem)',
      ertesito: (await ertesito.count()) ? (await ertesito.textContent() || '').trim() : '(nincs értesítő elem)',
      ertesito_latszik: (await ertesito.count()) ? await ertesito.isVisible() : false,
      lathato_horgonyok: await carl.page.evaluate(() => [...document.querySelectorAll('[data-testid]')]
        .filter((x) => x.offsetParent !== null).map((x) => x.getAttribute('data-testid')).slice(0, 40)),
    });

    // (5/a) A FEJLÉC NEM MUTATHATJA A RÉGI EMBERT. Ez a mért tünet magja: a késő válasz utáni
    //       rajzolás a `state.me`-ből él, és azt a kimaradt frissítés a RÉGI emberen hagyta.
    const s = await allapot();
    expect(s.fejlec, `a fejléc nem a RÉGI embert mutatja · mért állapot: ${JSON.stringify(s)}`)
      .not.toBe(carl.email);

    // (5/b) ÉS A SIKER NEM SZÁLL ÁT: Dórának nem írjuk ki, hogy ő fogadta el a meghívást.
    if (s.ertesito_latszik) {
      expect(s.ertesito, `a siker nem annak szól, aki nem végezte · mért állapot: ${JSON.stringify(s)}`)
        .not.toContain(D.UI.inviteAcceptedLead);
    }

    // (5/c) A TÁROLT TÉNY VÁLTOZATLANUL HELYES: Carl lett tag, Dóra nem. Ezt a hiba sem rontotta el,
    //       és a javítás sem gyengítheti (a SPEC: „A meglévő személy+fiók-védelem … megmaradnak").
    const tagsagok = (me.workspaces || []).map((x) => x.book_id);
    expect(tagsagok, 'Dóra NEM lett tag a meghívott fiókban').not.toContain(served.book_id);
  });
});
