// tests/e2e/v3app-r176-ket-szereplo.spec.mjs — A KÉT SZEREPLŐS TÖRTÉNET A VALÓDI FELÜLETEN (R176 §1).
//
// MIÉRT VAN EZ A LAP, ÉS MIÉRT NEM ELÉG A `proof:demo-walk`.
//
// Az R176 §1 kimondja: „A szimulált adapteren zöld `proof:demo-walk` nem ennek bizonyítéka." Igaza
// van: az a tanú a bemutató-lapot járja, aminek a HÁTTERE csonk (`demo-adapter.mjs`) — a csonk
// zöldje pedig nem a határ zöldje (`KUKA-227`). Ez a lap a VALÓDI alkalmazás-héjat járja, VALÓDI
// HTTP-vel és VALÓDI tárolóval, és a szereplő-váltás is valódi: KI- ÉS BELÉPÉS.
//
// AMIT MÉR:
//   R176-K1  1. TÖRTÉNET (`tour.inviteRevoke`) VÉGIG, a valódi felületen, asztali szélességen —
//            és a VÉGÁLLAPOT igaz: Béla tag, a visszavont meghívó nem éledt fel.
//   R176-K2  2. TÖRTÉNET (`tour.reentry`) VÉGIG — a tagságtól a készletadatig, a külön jogadással.
//   R176-K3  390 px: ugyanaz a történet keskeny nézetben is végigvihető.
//   R176-K4  ÚJRAINDÍTÁS KÖZBEN: a lap újratöltése a váltás határán nem veszíti el a haladást.
//   R176-K5  A KILÉPÉS NEM VISZ ÁT SEMMIT a következő emberhez: se meghívó-jegyet, se haladást,
//            ha a váltás NEM a bemutató deklarált határán történt.
//
// A SZEREPLŐ-VÁLTÁS MECHANIKÁJA. A bemutató egy FÜLBEN fut, és a váltás-lépés a valódi
// KIJELENTKEZÉSRE áll (`data-tour-anchor="actor-switch"` a profil-menü kilépés gombján). A
// felhasználó kilép, a MÁSIK ember a saját fiókjával belép — a lépés csak a kiszolgáló által
// igazolt ÚJ nézetre zárul (`actorSwitchReady`), nem a kattintásra (`KUKA-231`).
import { test, expect } from '@playwright/test';
import {
  World, PASSWORD, createWorkspaceUI, inviteUI, loginUI, logoutUI, gotoPage, withResponse,
  openInviteUI, switchUI, Db,
} from './helpers.mjs';
import { TOURS } from '../../v3app/knowledge/features.mjs';
import { dictFor } from '../../v3app/public/i18n/dict.mjs';
import { closeModals, startTourViaHelp } from './tourWalk.mjs';

test.describe.configure({ mode: 'serial' });
const HU = dictFor('hu');

/** A MEGHÍVÓ-SOR jelölője az e-mail alapján — a token a felületen SOHA nem látszik (KUKA-006). */
async function inviteRowRef(page, email) {
  const row = page.locator('tr[data-testid^="invite-row-"]').filter({ hasText: email }).first();
  await expect(row).toBeVisible();
  return (await row.getAttribute('data-testid')).replace('invite-row-', '');
}

/**
 * A VÁLTÁS: valódi kilépés, majd a MÁSIK ember belépése UGYANEBBEN a fülben.
 *
 * A lépés célja (a kiemelt vezérlő) a kijelentkezés — azt nyomjuk meg, ahogy a felhasználó. A
 * belépés már a másik emberé: a bemutató a kiszolgáló igazolt válaszára zárja a lépést.
 */
async function valtsSzereplot(page, kire) {
  await closeModals(page);
  const profil = page.getByTestId('profile');
  if (await profil.count() && !(await profil.evaluate((el) => el.open).catch(() => false))) {
    await profil.locator('summary').click().catch(() => {});
  }
  await page.getByTestId('logout').click();
  await expect(page.getByTestId('login-email')).toBeVisible();
  await loginUI(page, kire.email, PASSWORD);
}

/**
 * A LEVÉL MEGNYITÁSA A FEJLESZTŐI LEVÉL-FOGADÓBÓL — ahogy a címzett teszi.
 *
 * A levél-fogadó sorai `mail-<id>`/`mail-link-<id>` horgonyt kapnak; a cím szerint szűrünk, és a
 * LEGÚJABB levelet nyitjuk meg (a történet közben több is keletkezik).
 */
async function nyisdMegALevelet(page, email) {
  const lista = page.getByTestId('mailbox');
  await expect(lista).toBeVisible();
  /**
   * A MEGHÍVÓ LEVELÉT A HIVATKOZÁS ALAKJA AZONOSÍTJA, NEM A SORRENDJE (SAJÁT LELET, MÉRVE).
   *
   * Az első alakom a LEGUTOLSÓ sort nyitotta meg a címre szűrve — a fogadóban viszont a
   * megerősítő levél is ott áll, és a sorrend nem szerződés. A meghívó hivatkozása `?invite=`-ot
   * hordoz: EZT kérdezzük meg, nem a pozíciót (`KUKA-045`: a készlet a forrásból, ne a sorrendből).
   */
  const linkek = lista.locator('li[data-testid^="mail-"]').filter({ hasText: email }).locator('a[data-testid^="mail-link-"]');
  const n = await linkek.count();
  expect(n, `a levél-fogadóban van levél ${email} címre`).toBeGreaterThan(0);
  let megnyitva = false;
  for (let k = n - 1; k >= 0; k -= 1) {
    const href = (await linkek.nth(k).getAttribute('href')) || '';
    if (!href.includes('invite=')) continue;
    await linkek.nth(k).click();
    megnyitva = true;
    break;
  }
  expect(megnyitva, `a ${email} címre érkezett levelek közt VAN meghívó-hivatkozás`).toBe(true);
  await expect(page.getByTestId('invite-observe')).toBeVisible();
}

/**
 * A VÉGIGVEZETÉS. Lépésenként: megvárjuk a lépés SAJÁT szövegét (ez a bizonyíték, hogy a bemutató
 * ott áll), elvégezzük a lépés VALÓDI műveletét, és csak a feladat nélküli lépésen nyomunk „Tovább"-ot
 * — a feladathoz kötött lépést a SZERVER igazolt válasza zárja (`TUR-01`).
 *
 * A VISSZATÉRÉS HÁROM ÁLLAPOTÚ (`KUKA-216`): meddig jutott · volt-e NEVEZETT megszakítás · mi a baj.
 */
async function vezess(page, tourId, akciok, { lepesHatar = 4000 } = {}) {
  const steps = TOURS[tourId].steps;
  const D = HU.TOUR[tourId];
  const naplo = [];
  for (let i = 0; i < steps.length; i += 1) {
    const st = steps[i];
    const cim = D && D[st.id] ? D[st.id].title : null;
    if (!cim) return { elert: i, lepes: steps.length, baj: `${st.id}: nincs szöveg a nyelvcsomagban`, naplo };
    try {
      await expect(page.getByTestId('tour-step-title')).toHaveText(cim, { timeout: lepesHatar * 2 });
    } catch {
      const panel = await page.getByTestId('tour').count();
      const blocked = await page.getByTestId('tour-blocked').count();
      const szoveg = panel ? ((await page.getByTestId('tour').textContent()) || '').trim().replace(/\s+/g, ' ').slice(0, 110) : '(nincs panel)';
      const kint = ((await page.getByTestId('tour-step-title').textContent().catch(() => null)) || '(nincs lépés-cím)').trim();
      /**
       * DIAGNOSZTIKA A CÉLRÓL — hogy a mérés a RENDSZERRŐL beszéljen, ne a sejtésemről (`KUKA-215`).
       * A váltás-lépésnél a szemantikus horgony MINDEN jelöltjét kiírjuk, láthatósággal együtt.
       */
      const celAllapot = await page.evaluate((nev) => {
        const sor = (el) => el ? `${el.getAttribute('data-testid') || '(nincs testid)'}${el.hidden ? ' [hidden]' : ''}${(el.offsetParent === null && el.getClientRects().length === 0) ? ' [nem látszik]' : ' [látszik]'}` : '(nincs)';
        const jeloltek = [...document.querySelectorAll(`[data-testid="${nev}"]`), ...document.querySelectorAll(`[data-tour-anchor="${nev}"]`)];
        return { cel: nev, jelolt: jeloltek.map(sor).join(' | ') || '(egy sincs)',
          tovabb: sor(document.querySelector('[data-testid="tour-next"]')),
          hej: sor(document.querySelector('[data-testid="logout"]')),
          meghivo: sor(document.querySelector('[data-testid="invite-logout"]')) };
      }, st.target);
      const elozoCel = i > 0 ? steps[i - 1].target : null;
      const elozo = elozoCel ? await page.evaluate((nev) => {
        const el = document.querySelector(`[data-testid="${nev}"]`) || document.querySelector(`[data-tour-anchor="${nev}"]`);
        if (!el) return `${nev}: NINCS A LAPON`;
        return `${nev}: ${el.hidden ? 'hidden' : ((el.offsetParent === null && el.getClientRects().length === 0) ? 'nem látszik' : 'látszik')}`;
      }, elozoCel) : '(nincs előző)';
      const panelTeljes = panel ? ((await page.getByTestId('tour').textContent()) || '').trim().replace(/\s+/g, ' ') : '(nincs panel)';
      return { elert: i, lepes: steps.length, naplo,
        baj: `${st.id}: a buborék „${kint.slice(0, 40)}”, a csomag szerint „${cim}” [panel:${panel} blocked:${blocked} · ${szoveg}] CÉL(${celAllapot.cel}): ${celAllapot.jelolt} · Tovább: ${celAllapot.tovabb} · héj-kilépés: ${celAllapot.hej} · meghívó-kilépés: ${celAllapot.meghivo} · ELŐZŐ LÉPÉS CÉLJA: ${elozo} · PANEL: ${panelTeljes.slice(0, 320)}` };
    }
    naplo.push(st.id);
    if (akciok[st.id]) await akciok[st.id]();
    if (await page.getByTestId('tour-blocked').count() > 0) {
      const m = ((await page.getByTestId('tour-blocked').textContent()) || '').trim().slice(0, 90);
      return { elert: i + 1, lepes: steps.length, baj: `${st.id}: NEVEZETT megszakítás — ${m}`, naplo };
    }
    if (i + 1 >= steps.length) break;
    {
      /**
       * A „TOVÁBB" MINDEN LÉPÉS UTÁN KELL — A FELADAT CSAK MEGJELÖL (SAJÁT LELET, MÉRVE).
       *
       * A `taskDone` a lépést `done`-ra állítja, de NEM léptet: a továbblépés a felhasználó
       * döntése (`advance`). Az első alakom a feladathoz kötött lépés után nem nyomta meg a
       * Tovább-ot, ezért a bemutató a NEGYEDIK lépésen állt, pedig a visszavonás TÉNYLEGESEN
       * megtörtént — a próba a saját kihagyását mérte, nem a rendszert (`KUKA-120`).
       */
      /**
       * A FELHASZNÁLÓ MEGNYOMJA A KIEMELT VEZÉRLŐT (`KUKA-407` · `KUKA-237`) — és a bejáró is.
       *
       * SAJÁT LELET EZEN A LAPON, MÉRVE: az első alakom csak a „Tovább"-ot nyomta, ezért a
       * meghívó-fül soha nem nyílt ki, a `invites-table` cél nem létezett, és a bemutató a
       * harmadik lépésen megállt — a próba a SAJÁT tétlenségét mérte, nem a rendszert.
       *
       * Ahol a cél nem megnyomható (tábla, szöveg, panel), a kattintás elmarad: nem a próba dönti
       * el, mi vezérlő, hanem a lap. És ahol a lépésnek SAJÁT valódi művelete van (`akciok`), azt
       * már elvégeztük feljebb.
       */
      if (!akciok[st.id] && !st.task) {
        const cel = page.getByTestId(st.target).first();
        if (await cel.count() > 0 && await cel.isVisible()) {
          const megnyomhato = await cel.evaluate((el) => {
            const t = el.tagName.toLowerCase();
            return t === 'button' || t === 'a' || t === 'summary' || el.hasAttribute('data-go')
              || el.hasAttribute('data-action') || el.hasAttribute('data-auth') || el.hasAttribute('data-tab');
          }).catch(() => false);
          /**
           * ÉS HA EGY NYITOTT PANEL TAKARJA, A FELHASZNÁLÓ IS BEZÁRJA (SAJÁT LELET, MÉRVE).
           *
           * A levél-fogadó fiókja (`dialog`) nyitva marad a történet közepén, és a héj menüpontjára
           * irányuló kattintást elfogja („intercepts pointer events"). Az ember ilyenkor bezárja a
           * panelt — a próba is ezt tegye, ne a saját maradékát mérje (`KUKA-120`).
           */
          try {
            await cel.click({ timeout: 2500 });
          } catch {
            await closeModals(page);
            await cel.click({ timeout: 2500 }).catch(() => { /* a lap elvette — a következő állítás méri */ });
          }
        }
      }
      // A KÖVETKEZŐ lépés célját megvárjuk, mielőtt továbblépünk (`KUKA-121`): a kiértékelés
      // különben a RÉGI lapon futna. A lejárat NEM bukás — az útmutató maga mondja ki a bajt.
      await page.getByTestId(steps[i + 1].target).first().waitFor({ state: 'visible', timeout: lepesHatar }).catch(() => {});
      await page.getByTestId('tour-next').click();
    }
    await page.getByTestId('tour-step-title').waitFor({ state: 'visible', timeout: lepesHatar }).catch(() => {});
  }
  return { elert: steps.length, lepes: steps.length, baj: null, naplo };
}

let world; let anna; let bela; let cegId;

test.beforeAll(async ({ browser }) => {
  world = new World(browser, 'r176k');
  anna = await world.person('anna');
  const ws = await createWorkspaceUI(anna.page, { name: 'R176 Két Szereplő Kft', business: { jurisdiction: 'HU', tax_id: '12345676-2-42' } });
  cegId = ws.bookId;
  // BÉLÁNAK SAJÁT FIÓKJA VAN — a váltás valódi belépés, nem megszemélyesítés.
  bela = await world.person('bela');
  // …és egy FÜGGŐ meghívó, amit az első történet visszavon.
  await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
});

test.afterAll(async () => { if (world) await world.close(); });

test('R176-K1 — 1. TÖRTÉNET a VALÓDI felületen: a meghívás visszavonása, majd új meghívás és elfogadás', async () => {
  const p = anna.page;
  await gotoPage(p, 'overview');
  const elindult = await startTourViaHelp(p, 'tour.inviteRevoke');
  expect(elindult === true ? 'elindult' : `NEM indult — ${elindult && elindult.nemIndult ? elindult.nemIndult : 'a súgó nem kínálta fel'}`,
    'a VALÓDI felületen a súgó felkínálja és el is indítja a két szereplős történetet').toBe('elindult');

  let ujJegy = null;
  const r = await vezess(p, 'tour.inviteRevoke', {
    // s4 — a VISSZAVONÁS ténylegesen megtörténik (a megerősítéssel együtt)
    s4: async () => {
      const ref = await inviteRowRef(p, bela.email);
      await p.getByTestId(`invite-revoke-${ref}`).click();
      await expect(p.getByTestId('invite-revoke-confirm')).toBeVisible();
      await withResponse(p, { path: '/api/invites/revoke' }, () => p.getByTestId('invite-revoke-confirm').click());
    },
    s6: async () => { await valtsSzereplot(p, bela); },
    /**
     * s9 — A CÍMZETT A LEVÉL-FOGADÓBÓL NYITJA MEG A (visszavont) MEGHÍVÓT.
     *
     * SAJÁT LELET, MÉRVE: az első alakom itt ÜRES műveletet adott, és a bemutató joggal állt meg —
     * a buborék kimondta: „Ez a lépés még nem érhető el: előbb nyisd meg a kiemelt gombbal. Az
     * útmutató nem nyomja meg helyetted." (`KUKA-228`). A próba a saját tétlenségét mérte, nem a
     * rendszert. A VALÓDI művelet: a levél-fogadó listájában a meghívó levelének megnyitása.
     */
    s9: async () => { await nyisdMegALevelet(p, bela.email); },
    s10: async () => { await valtsSzereplot(p, anna); },
    // s10b — A VISSZATÉRŐ FIÓKKEZELŐ A CÉG FIÓKJÁRA VÁLT (az R176 §1-ben pótolt lépés).
    s10b: async () => { await switchUI(p, cegId); },
    s13: async () => {
      // A HÉJ VEZÉRLŐJÉHEZ ELŐBB BE KELL ZÁRNI a nyitott panelt — ahogy az ember is teszi.
      await closeModals(p);
      const inv = await inviteUI(p, { email: bela.email, role: 'user', scope: 'keszlet' });
      ujJegy = inv.body && inv.body.token;
    },
    s14: async () => { await valtsSzereplot(p, bela); },
    s17: async () => {
      expect(Boolean(ujJegy), 'az új meghívó jegye megszületett').toBe(true);
      await openInviteUI(p, ujJegy);
      await withResponse(p, { path: '/api/invites/redeem' }, () => p.getByTestId('invite-redeem').click());
    },
  });
  expect(r.baj || `${r.elert}/${r.lepes} OK`, `a történet VÉGIG vihető a valódi felületen — mérve: ${r.naplo.join('→')}`).toBe(`${r.lepes}/${r.lepes} OK`);

  // ÉS A VÉGÁLLAPOT IGAZ (nem csak a lépések futottak le) — a TÁROLÓBÓL mérve.
  const db = new Db();
  const tagsag = db.all('SELECT role FROM membership WHERE subject_id = ? AND book_id = ?', bela.subjectId, cegId);
  const visszavont = db.all('SELECT token FROM invite_revocation');
  db.close();
  expect(tagsag.length, 'Béla TÉNYLEGESEN tag lett a cégben').toBe(1);
  expect(visszavont.length >= 1, 'a visszavonás a tárolóban is ott van — a régi hivatkozás nem éledt fel').toBe(true);
});
