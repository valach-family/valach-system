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
  World, PASSWORD, createWorkspaceUI, inviteUI, loginUI, gotoPage, withResponse,
  openInviteUI, switchUI, Db, revokeUI, grantScopeUI, openMemberPanel,
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
async function valtsSzereplot(page, kire, { valtasLepes = false } = {}) {
  /**
   * A NÉZŐ ÚTJÁT KÖVETJÜK — A PRÓBA NEM NYITJA KI HELYETTE A PROFILMENÜT (R176, külső review P2).
   *
   * A LELET (chatgpt-codex, az `fb231e6` fejen): ez a segéd eddig MAGA nyitotta ki a profil
   * `<details>`-ét, és ezzel ELREJTETTE, hogy a héjban a `actor-switch` horgony (a kijelentkezés)
   * egy CSUKOTT lenyíló belsejében áll — a bemutatónak tehát a FELTÁRÓ útját is deklarálnia kell,
   * különben a lépés `targetMissing`-gel megszakad. A próba a felhasználó útját járja: ha a cél
   * nem látszik, a buborék által KIEMELT vezérlőt nyomja meg (`KUKA-228`), és csak utána lép.
   */
  await closeModals(page);
  /**
   * A SZEMANTIKUS HORGONYT HASZNÁLJUK, AHOGY A BEMUTATÓ IS (R176, külső review P2).
   *
   * A horgony szerződése: „az a vezérlő, amivel a néző átvált a másik szereplőre". Ez a héjban a
   * profilmenü kijelentkezése, a MEGHÍVÓ-KÉPERNYŐN viszont az ottani kilépés — a próba ezért nem
   * köthet egyetlen `data-testid`-hez (a saját első alakom a `logout`-ra kötött, és a meghívó
   * képernyőjén el sem találta a vezérlőt).
   */
  const horgony = page.locator('[data-tour-anchor="actor-switch"]');
  const lathato = async () => {
    const n = await horgony.count();
    for (let k = 0; k < n; k += 1) if (await horgony.nth(k).isVisible().catch(() => false)) return horgony.nth(k);
    return null;
  };
  let vezerlo = await lathato();
  if (!vezerlo) {
    // A FELTÁRÁS A NÉZŐ DOLGA: a buborék által KIEMELT vezérlőt nyomjuk meg (`KUKA-228`).
    const kiemelt = page.locator('.tourtarget').first();
    if (await kiemelt.count() && await kiemelt.isVisible()) {
      await kiemelt.click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(150);
      vezerlo = await lathato();
    }
  }
  /**
   * ÉS AMIKOR NINCS FUTÓ LÉPÉS, A NÉZŐ MAGÁTÓL NYITJA KI A MENÜT (az ELŐKÉSZÍTÉS fázisa).
   *
   * A szigorítás CÉLZOTT: a VÁLTÁS-LÉPÉSEN (`valtasLepes: true`) a próba SOHA nem nyitja ki a
   * lenyílót maga — épp ez rejtette el a külső fél leletét: ott a BEMUTATÓNAK kell feltárnia.
   * Minden más pillanatban (előkészítés, vagy egy másik lépésnél álló futás) a saját útját járó
   * felhasználót mintázzuk: ő tudja, hol a kijelentkezés, és megnyomja a menü nyitóját.
   */
  if (!vezerlo && !valtasLepes) {
    const nyito = page.locator('[data-tour-anchor="actor-switch"]').first()
      .locator('xpath=ancestor::details[1]/summary');
    if (await nyito.count() && await nyito.isVisible()) {
      await nyito.click({ timeout: 2500 }).catch(() => {});
      vezerlo = await lathato();
    }
  }
  if (!vezerlo) {
    const d = await page.evaluate(() => {
      const jel = [...document.querySelectorAll('[data-tour-anchor="actor-switch"]')]
        .map((el) => `${el.getAttribute('data-testid') || el.tagName.toLowerCase()}:${typeof el.checkVisibility === 'function' ? el.checkVisibility() : '?'}`).join(' | ');
      const kiemelt = [...document.querySelectorAll('.tourtarget')]
        .map((el) => el.getAttribute('data-testid') || el.tagName.toLowerCase()).join(',');
      const B = document.querySelector('[data-testid="tour"]');
      return `panel=${Boolean(B)} lépés="${(document.querySelector('[data-testid="tour-step-title"]')?.textContent || '-').slice(0, 34)}"`
        + ` blocked="${(document.querySelector('[data-testid="tour-blocked"]')?.textContent || '-').slice(0, 50)}"`
        + ` horgonyok=[${jel || 'egy sincs'}] kiemelt=[${kiemelt}]`
        + ` profil_open=${String(document.querySelector('[data-testid="profile"]')?.open)}`
        + ` buborék="${(document.querySelector('[data-testid="tour-pending"]')?.textContent || '(nincs)').slice(0, 70)}"`;
    });
    throw new Error(`a váltó vezérlő NEM tárult fel a néző útján — MÉRVE: ${d}`);
  }
  await vezerlo.click();
  await expect(page.getByTestId('login-email')).toBeVisible();
  await loginUI(page, kire.email, PASSWORD);
}

/**
 * NAVIGÁCIÓ, AMI A KESKENY NÉZETET IS TUDJA (R176 §1 — a parancs 390 px-et is kér).
 *
 * 390 px-en a menü a ☰ mögött áll, tehát a menüpont nem kattintható addig, amíg a felhasználó
 * ki nem nyitja — a közös `gotoPage` ezt nem teszi meg, és a próba egy nem látható gombra várt.
 * Itt a FELHASZNÁLÓ útját követjük: ha a menüpont nem látszik, előbb a ☰-t nyomjuk meg.
 */
async function menjAzOldalra(page, nev) {
  for (const id of ['account-switcher', 'profile']) {
    const d = page.getByTestId(id);
    if (await d.count() && await d.evaluate((el) => el.open).catch(() => false)) {
      await d.evaluate((el) => { el.open = false; });
    }
  }
  const menupont = page.getByTestId(`nav-${nev}`);
  const toggle = page.getByTestId('nav-toggle');
  if (!(await menupont.isVisible().catch(() => false))) {
    if (await toggle.count() && await toggle.isVisible()) await toggle.click();
  }
  await menupont.click();
  await expect(menupont).toHaveAttribute('aria-current', 'page');
  // …és a menü-réteget be is csukjuk, ahogy a felhasználó: nyitva takarja a fejlécet.
  if (await toggle.count() && await toggle.isVisible()
      && (await toggle.getAttribute('aria-expanded')) === 'true') {
    await toggle.click();
  }
}

/**
 * FIÓKVÁLTÁS, AMI A KESKENY NÉZETET IS TUDJA (R176 §1).
 *
 * 390 px-en a fejléc fiókválasztója is a ☰ mögé kerül, tehát a közös `switchUI` a nem látható
 * összefoglalóra várt. A felhasználó útja: előbb ☰, aztán a választó.
 */
async function valtsFiokra(page, bookId) {
  /**
   * A ☰ MENÜ-RÉTEGET BE KELL ZÁRNI, NEM KINYITNI (SAJÁT LELET, MÉRVE).
   *
   * Önálló méréssel ellenőriztem: 390 px-en a fiókválasztó, a nyitója ÉS a fiók-sorok is LÁTSZANAK
   * (`switcher=látszik summary=látszik sor=látszik`). A próbám mégis elakadt — mert a navigációnál
   * kinyitott ☰ menü-réteg takarta a fejlécet, és a kattintás a mozgó/takart elemre várt. A termék
   * tehát rendben volt; a hiba az enyém (`KUKA-120`: a próba ne a saját maradékát mérje).
   */
  const toggle = page.getByTestId('nav-toggle');
  if (await toggle.count() && await toggle.isVisible()
      && (await toggle.getAttribute('aria-expanded')) === 'true') {
    await toggle.click();
  }
  // MÉRJÜK MEG, MI VAN A NYITÓ PONTJÁN — a takarást nem feltételezzük (`TUR-03` · `KUKA-215`).
  const takaro = await page.evaluate(() => {
    const sum = document.querySelector('[data-testid="account-switcher-summary"]')
      || document.querySelector('[data-testid="account-switcher"] summary');
    if (!sum) return 'a nyitó NINCS a lapon';
    const r = sum.getBoundingClientRect();
    const top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    const ut = [];
    for (let el = top; el && ut.length < 5; el = el.parentElement) ut.push(`${el.tagName.toLowerCase()}${el.getAttribute && el.getAttribute('data-testid') ? '#' + el.getAttribute('data-testid') : ''}`);
    return `a ponton: ${ut.join(' < ')} · a nyitó: ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`;
  });
  if (!takaro.startsWith('a ponton: summary') && !takaro.includes('#account-switcher')) {
    throw new Error(`a fiókválasztó nyitóját MÁS elem takarja — MÉRVE: ${takaro}`);
  }
  await switchUI(page, bookId);
}

/**
 * A LEVÉL MEGNYITÁSA A FEJLESZTŐI LEVÉL-FOGADÓBÓL — ahogy a címzett teszi.
 *
 * A levél-fogadó sorai `mail-<id>`/`mail-link-<id>` horgonyt kapnak; a cím szerint szűrünk, és a
 * LEGÚJABB levelet nyitjuk meg (a történet közben több is keletkezik).
 */
async function nyisdMegALevelet(page, email, mod = 'barmelyik') {
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
  /**
   * ÉS A SORRENDRE SEM TÁMASZKODUNK, HANEM A VISELKEDÉSRE (SAJÁT LELET, MÉRVE).
   *
   * Az első alakom a lista VÉGÉRŐL keresett visszafelé. A fogadó viszont a LEGÚJABBAT mutatja
   * elöl, tehát a második történetnél a LEGRÉGEBBI (már visszavont) meghívót nyitotta meg, és
   * ott nincs „Elfogadás" gomb — a próba a saját feltevését mérte, nem a rendszert (`KUKA-045`:
   * a készlet a forrásból, ne a sorrendből).
   *
   * MOSTANTÓL a MÓD dönt: `barmelyik` → az első meghívó-hivatkozás (a visszavont állapot
   * megtekintéséhez); `elfogadhato` → végigpróbáljuk a jelölteket, amíg olyat nem nyitunk, ahol az
   * „Elfogadás" tényleg ott van. A címzett is így tenne: megnyitja a leveleket, és azt fogadja el,
   * amelyik még él.
   */
  const jeloltek = [];
  for (let k = 0; k < n; k += 1) {
    const href = (await linkek.nth(k).getAttribute('href')) || '';
    if (href.includes('invite=')) jeloltek.push(href);
  }
  expect(jeloltek.length, `a ${email} címre érkezett levelek közt VAN meghívó-hivatkozás`).toBeGreaterThan(0);
  if (mod === 'barmelyik') {
    await page.goto(jeloltek[0]);
    await expect(page.getByTestId('invite-observe')).toBeVisible();
    return;
  }
  for (const href of jeloltek) {
    await page.goto(href);
    await expect(page.getByTestId('invite-observe')).toBeVisible();
    const van = await page.getByTestId('invite-redeem').count();
    if (van > 0 && await page.getByTestId('invite-redeem').isVisible()) return;
  }
  throw new Error(`a ${email} címre érkezett ${jeloltek.length} meghívó közül EGYIK sem elfogadható`);
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
    {
      const l = await page.getByTestId(st.target).first().isVisible().catch(() => false);
      const c = await page.getByTestId(st.target).count().catch(() => 0);
      naplo.push(`${st.id}${c === 0 ? '[nincs]' : (l ? '' : '[rejtett]')}`);
    }
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
      /**
       * A FELTÁRÁSRA VÁRÓ LÉPÉSNÉL A NÉZŐ A KIEMELT FELTÁRÓT NYOMJA MEG (`KUKA-228`).
       *
       * 390 px-en a bal menü a ☰ gomb mögé csukódik, tehát a menüpontra mutató lépés célja a lapon
       * OTT VAN, de nem látszik. A buborék ilyenkor KIEMELI a ☰-t (`.tourtarget`) és NEVEZETTEN vár:
       * „az útmutató nem nyomja meg helyetted". A valódi néző megnyomja — a bejáró is ezt teszi,
       * különben a SAJÁT tétlenségét mérné (`KUKA-120`), és a keskeny nézet MINDEN menü-lépésén
       * elakadna egy ÉP felületen.
       */
      if (!akciok[st.id]) {
        const cel = page.getByTestId(st.target).first();
        if (await cel.count() > 0 && !(await cel.isVisible())) {
          const kiemelt = page.locator('.tourtarget').first();
          if (await kiemelt.count() > 0 && await kiemelt.isVisible()) {
            await kiemelt.click({ timeout: 2500 }).catch(() => {});
            await cel.waitFor({ state: 'visible', timeout: 2500 }).catch(() => {});
          }
        }
      }
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
    s6: async () => { await valtsSzereplot(p, bela, { valtasLepes: true }); },
    /**
     * s9 — A CÍMZETT A LEVÉL-FOGADÓBÓL NYITJA MEG A (visszavont) MEGHÍVÓT.
     *
     * SAJÁT LELET, MÉRVE: az első alakom itt ÜRES műveletet adott, és a bemutató joggal állt meg —
     * a buborék kimondta: „Ez a lépés még nem érhető el: előbb nyisd meg a kiemelt gombbal. Az
     * útmutató nem nyomja meg helyetted." (`KUKA-228`). A próba a saját tétlenségét mérte, nem a
     * rendszert. A VALÓDI művelet: a levél-fogadó listájában a meghívó levelének megnyitása.
     */
    s9: async () => { await nyisdMegALevelet(p, bela.email); },
    s10: async () => { await valtsSzereplot(p, anna, { valtasLepes: true }); },
    // s10b — A VISSZATÉRŐ FIÓKKEZELŐ A CÉG FIÓKJÁRA VÁLT (az R176 §1-ben pótolt lépés).
    s10b: async () => { await switchUI(p, cegId); },
    s13: async () => {
      // A HÉJ VEZÉRLŐJÉHEZ ELŐBB BE KELL ZÁRNI a nyitott panelt — ahogy az ember is teszi.
      await closeModals(p);
      const inv = await inviteUI(p, { email: bela.email, role: 'user', scope: 'keszlet' });
      ujJegy = inv.body && inv.body.token;
    },
    s14: async () => { await valtsSzereplot(p, bela, { valtasLepes: true }); },
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

test('R176-K2 — 2. TÖRTÉNET a VALÓDI felületen: a munkatárs visszatérése a tagságtól a készletadatig', async () => {
  const p = anna.page;
  // A K1 VÉGÉN BÉLA NÉZETÉBEN ÁLLUNK (ő fogadta el a meghívást) — a történet a fiókkezelőé, tehát
  // előbb valódi váltás Annára, majd a cég fiókjára. Ez nem a próba kényelme: a felhasználó is így tenné.
  await valtsSzereplot(p, anna);
  await switchUI(p, cegId);
  await gotoPage(p, 'overview');

  const elindult = await startTourViaHelp(p, 'tour.reentry');
  // A NEM-INDULÁS OKÁT MEGMÉRJÜK, nem sejtjük (`KUKA-215`): a határ saját válaszából.
  const miert = elindult === true ? '' : await p.evaluate(async () => {
    const r = await fetch('/api/assistant/status?lang=hu').then((x) => x.json()).catch(() => null);
    const me = await fetch('/api/me').then((x) => x.json()).catch(() => null);
    const ids = ((r && r.tours) || []).map((t) => t.id);
    const tagok = await fetch('/api/members').then((x) => x.json()).catch(() => null);
    const fuggo = await fetch('/api/invites/waiting').then((x) => x.json()).catch(() => null);
    return ` [HATÁR: felület=${r && r.surface} · van_reentry=${ids.includes('tour.reentry')}`
      + ` · van_outbox=${ids.includes('tour.outbox')} · van_verify=${ids.includes('tour.verify')} · darab=${ids.length}`
      + ` · ME: ${me && me.email} szerep=${me && me.current_role} szemelyes=${JSON.stringify(me && me.current_book_personal)}`
      + ` · TAGOK: ${JSON.stringify(((tagok && tagok.members) || []).map((m) => m.email))}`
      + ` · FÜGGŐ: ${JSON.stringify(((fuggo && fuggo.invites) || []).map((i) => i.state))}]`;
  });
  expect(elindult === true ? 'elindult' : `NEM indult — ${elindult && elindult.nemIndult ? elindult.nemIndult : 'a súgó nem kínálta fel'}${miert}`,
    'a VALÓDI felületen a súgó felkínálja és el is indítja a visszatérés-történetet').toBe('elindult');

  const r = await vezess(p, 'tour.reentry', {
    s3: async () => { await closeModals(p); await revokeUI(p, bela.subjectId); },
    s4: async () => {
      await openMemberPanel(p, bela.subjectId);
      await p.getByTestId(`member-reinvite-${bela.subjectId}`).click();
      await expect(p.getByTestId('reinvite-form')).toBeVisible();
      await p.getByTestId('reinvite-role').selectOption('user');
      await p.getByTestId('reinvite-scope').selectOption('keszlet');
      const rr = await withResponse(p, { path: '/api/members/reinvite' }, () => p.getByTestId('reinvite-confirm').click());
      expect(rr.body && rr.body.ok, 'az újbóli meghívás kiadva').toBe(true);
    },
    s5: async () => { await valtsSzereplot(p, bela, { valtasLepes: true }); },
    /**
     * s8 — A CÍMZETT A LEVÉL-FOGADÓBÓL NYITJA MEG AZ ÚJBÓLI MEGHÍVÁST, ÉS ELFOGADJA.
     *
     * A jegy SZÁNDÉKOSAN nem megy vissza a felületre (`KUKA-006`), tehát nincs mit „beírni": a
     * valódi út a levél megnyitása. Ez egyben azt is bizonyítja, hogy a levél TÉNYLEGESEN megérkezett.
     */
    s8: async () => {
      await nyisdMegALevelet(p, bela.email, 'elfogadhato');
      await withResponse(p, { path: '/api/invites/redeem' }, () => p.getByTestId('invite-redeem').click());
    },
    s9: async () => { await switchUI(p, cegId); },
    s12: async () => { await valtsSzereplot(p, anna, { valtasLepes: true }); await switchUI(p, cegId); },
    s14: async () => { await closeModals(p); await grantScopeUI(p, bela.subjectId, 'keszlet'); },
    s15: async () => { await valtsSzereplot(p, bela, { valtasLepes: true }); await switchUI(p, cegId); },
  });
  expect(r.baj || `${r.elert}/${r.lepes} OK`, `a visszatérés-történet VÉGIG vihető a valódi felületen — mérve: ${r.naplo.join('→')}`).toBe(`${r.lepes}/${r.lepes} OK`);

  // A VÉGÁLLAPOT: tagság VAN, és a KÉSZLET adatköre kiadva — az ÁR viszont nem (a történet tanulsága).
  const db = new Db();
  const tag = db.all('SELECT role FROM membership WHERE subject_id = ? AND book_id = ?', bela.subjectId, cegId);
  // A KIADOTT ADATKÖRÖK a magban `scope_grant` néven élnek, és a visszavonás KÜLÖN táblában áll —
  // tehát az ÉLŐ kiadás az, amire nincs visszavonás (a mag szabálya, nem a próba feltevése).
  const korok = db.all(`SELECT g.scope FROM scope_grant g
      WHERE g.subject_id = ? AND g.book_id = ?
        AND NOT EXISTS (SELECT 1 FROM scope_grant_revocation r
          WHERE r.subject_id = g.subject_id AND r.book_id = g.book_id AND r.scope = g.scope
            AND r.id > (SELECT MAX(id) FROM scope_grant g2
              WHERE g2.subject_id = g.subject_id AND g2.book_id = g.book_id AND g2.scope = g.scope))`,
    bela.subjectId, cegId).map((x) => x.scope);
  db.close();
  expect(tag.length, 'Béla ÚJRA tag').toBe(1);
  expect(korok.includes('keszlet'), 'a készlet adatköre KIADVA').toBe(true);
  expect(korok.includes('ar'), 'az ÁR adatköre viszont NEM — ez a történet tanulsága').toBe(false);
});

test('R176-K3 — 390 px ÉS ÚJRAINDÍTÁS: a történet keskeny nézetben is végigvihető, és a lap újratöltése a váltás határán nem veszíti el a haladást', async () => {
  /**
   * FRISS SZEREPLŐK. A történet ÁLLAPOTOT ír (tagság, meghívók), ezért az asztali futás maradékára
   * nem építünk: külön fiókkezelő és külön meghívott (`KUKA-120` — a próba ne a saját maradékát mérje).
   */
  const anna2 = await world.person('anna2');
  const ws2 = await createWorkspaceUI(anna2.page, { name: 'R176 Keskeny Kft', business: { jurisdiction: 'HU', tax_id: '10779224-2-44' } });
  const bela2 = await world.person('bela2');
  await inviteUI(anna2.page, { email: bela2.email, role: 'user', scope: 'keszlet' });

  const p = anna2.page;
  await p.setViewportSize({ width: 390, height: 844 });
  await menjAzOldalra(p, 'overview');
  const elindult = await startTourViaHelp(p, 'tour.inviteRevoke');
  expect(elindult === true ? 'elindult' : 'NEM indult', '390 px-en is felkínálja és elindítja').toBe('elindult');

  let ujraindult = false;
  let ujJegy = null;
  const r = await vezess(p, 'tour.inviteRevoke', {
    s4: async () => {
      await closeModals(p);
      const ref = await inviteRowRef(p, bela2.email);
      await p.getByTestId(`invite-revoke-${ref}`).click();
      await expect(p.getByTestId('invite-revoke-confirm')).toBeVisible();
      await withResponse(p, { path: '/api/invites/revoke' }, () => p.getByTestId('invite-revoke-confirm').click());
    },
    s6: async () => {
      await valtsSzereplot(p, bela2, { valtasLepes: true });
      /**
       * AZ ÚJRAINDÍTÁS ITT TÖRTÉNIK — A VÁLTÁS HATÁRÁN (R176 §1: „újraindítás után is").
       *
       * A váltás-határon az átadás a `sessionStorage`-ban áll, és a lap újratöltése ezen átmegy
       * (`pagehide` → mentés, indulás → visszaállás). Ha a haladás elvesztené, a bemutató a hetedik
       * lépés helyett az elejétől kezdődne — azt ez az állítás MÉRI, nem feltételezi.
       */
      await p.reload();
      await expect(p.getByTestId('tour')).toBeVisible({ timeout: 15000 });
      ujraindult = true;
    },
    s9: async () => { await nyisdMegALevelet(p, bela2.email); },
    s10: async () => { await valtsSzereplot(p, anna2, { valtasLepes: true }); },
    s10b: async () => { await valtsFiokra(p, ws2.bookId); },
    s13: async () => {
      await closeModals(p);
      const inv = await inviteUI(p, { email: bela2.email, role: 'user', scope: 'keszlet' });
      ujJegy = inv.body && inv.body.token;
    },
    s14: async () => { await valtsSzereplot(p, bela2, { valtasLepes: true }); },
    s17: async () => {
      expect(Boolean(ujJegy), 'az új meghívó jegye megszületett').toBe(true);
      await openInviteUI(p, ujJegy);
      await withResponse(p, { path: '/api/invites/redeem' }, () => p.getByTestId('invite-redeem').click());
    },
  });
  expect(r.baj || `${r.elert}/${r.lepes} OK`, `390 px-en VÉGIG vihető — mérve: ${r.naplo.join('→')}`).toBe(`${r.lepes}/${r.lepes} OK`);
  expect(ujraindult, 'a lap újratöltése MEGTÖRTÉNT a váltás határán').toBe(true);

  const db = new Db();
  const tag = db.all('SELECT role FROM membership WHERE subject_id = ? AND book_id = ?', bela2.subjectId, ws2.bookId);
  db.close();
  expect(tag.length, '390 px-en is: Béla TÉNYLEGESEN tag lett').toBe(1);
});

test('R176-K5 — A KILÉPÉS NEM VISZ ÁT SEMMIT: nem deklarált határon a bemutató elvész, és a meghívó-jegy sem kerül a következő emberhez', async () => {
  /**
   * AZ ŐR NEM TŰNT EL, CSAK NEVEZETT HATÁRT KAPOTT. Ezt itt MÉRJÜK: egy EGY-SZEREPLŐS bemutató
   * (`tour.invite`) közepén kilépünk, és más ember lép be — a futás NEM adódik át, és a következő
   * ember nem látja a korábbi haladást (`KUKA-204` · `KUKA-211` · `KUKA-218`).
   */
  const anna3 = await world.person('anna3');
  await createWorkspaceUI(anna3.page, { name: 'R176 Határ Kft', business: { jurisdiction: 'HU', tax_id: '82345671-2-42' } });
  const bela3 = await world.person('bela3');
  const p = anna3.page;
  await gotoPage(p, 'overview');
  const elindult = await startTourViaHelp(p, 'tour.invite');
  expect(elindult, 'az egy-szereplős meghívás-útmutató elindult').toBe(true);
  await expect(p.getByTestId('tour-step-title')).toHaveText(HU.TOUR['tour.invite'].s1.title);

  // …és most KILÉPÜNK, pedig a futó lépés NEM váltás-határ.
  await valtsSzereplot(p, bela3);

  // A FUTÁS ELVESZETT: a következő ember nem talál futó bemutatót a lapon.
  await expect(p.getByTestId('tour-step-title')).toHaveCount(0);

  // ÉS A MEGHÍVÓ-JEGY SEM KERÜLT ÁT: a kiszolgáló szerint sincs függő folytatás ennek az embernek.
  const folytatas = await p.evaluate(async () => {
    const r = await fetch('/api/me', { headers: { accept: 'application/json' } });
    const j = await r.json();
    return { subject: j.subject_id || null, pending: j.pending_invite || j.pending_intent || null };
  });
  expect(folytatas.subject, 'a belépett ember TÉNYLEGESEN a másik').toBe(bela3.subjectId);
  expect(folytatas.pending, 'a következő embernek NINCS átvett meghívó-folytatása').toBeFalsy();
});

test('R176-K6 — ÁTÍVELŐ történet, de VÁLTÁS-HATÁR ELŐTTI kilépés: az átadás NEM születik meg, és a következő ember nem kapja meg az előző haladását', async () => {
  /**
   * A KÜLSŐ REVIEW LELETE (chatgpt-codex, P2, az `fb231e6` fejen): a `K5` csak EGY-SZEREPLŐS
   * bemutatót mért, tehát azt az ágat nem járta be, ahol egy ÁTÍVELŐ történet fut, és a néző egy
   * KÖZÖNSÉGES (nem deklarált) ponton lép ki. A mentés feltétele eddig csak az volt, hogy a
   * történetben VAN valahol váltás-lépés — így a következő ember ugyanabban a fülben visszakapta
   * az előző ember bemutató-azonosítóját, lépés-indexét és haladását.
   *
   * EZ A PRÓBA AZ ELSŐ VÁLTÁS ELŐTT lép ki (a második lépésen), és három dolgot MÉR:
   * az átadás-rekesz ÜRES · a következő ember nézetében NINCS futó bemutató · és a `sessionStorage`
   * sem hordozza tovább (`KUKA-218`: minden nézethez kötött tár EGY helyen ürül).
   */
  const anna4 = await world.person('anna4');
  const ws4 = await createWorkspaceUI(anna4.page, { name: 'R176 Atadas Kft', business: { jurisdiction: 'HU', tax_id: '72345678-1-42' } });
  const bela4 = await world.person('bela4');
  const p = anna4.page;
  // AZ INDULÓ ADAT: függő meghívás kell hozzá, különben a kiszolgáló nevezetten nem kínálja fel.
  await inviteUI(p, { email: bela4.email, role: 'user', scope: 'keszlet' });
  await gotoPage(p, 'overview');

  const elindult = await startTourViaHelp(p, 'tour.inviteRevoke');
  expect(elindult, 'az ÁTÍVELŐ történet elindult a valódi felületen').toBe(true);
  // Egy lépést előre: a futás ÉL, de az első váltás-lépés (s6) MÉG messze van.
  await expect(p.getByTestId('tour-step-title')).toHaveText(HU.TOUR['tour.inviteRevoke'].s1.title);
  await p.getByTestId('tour-next').click();
  await expect(p.getByTestId('tour-step-title')).toHaveText(HU.TOUR['tour.inviteRevoke'].s2.title);
  const allapot = await p.evaluate(() => {
    const el = document.querySelector('[data-testid="tour-progress"]');
    return el ? el.textContent.replace(/\s+/g, ' ') : '(nincs)';
  });
  expect(allapot, 'a futás a történet ELEJÉN áll, az első váltás-lépés előtt').toContain('2/19');

  // …és most KÖZÖNSÉGES kilépés: a néző maga nyitja a menüt, mert NEM váltás-lépésen áll.
  await valtsSzereplot(p, bela4);

  const atadas = await p.evaluate(() => {
    try { return sessionStorage.getItem('vs3.tour.handover'); } catch { return 'OLVASHATATLAN'; }
  });
  expect(atadas === null || atadas === '' ? 'üres' : `MEGVAN: ${String(atadas).slice(0, 90)}`,
    'az átadás-rekesz ÜRES — a váltás-határ előtti kilépés nem ad át semmit').toBe('üres');
  await expect(p.getByTestId('tour-step-title')).toHaveCount(0);

  const ki = await p.evaluate(async () => (await fetch('/api/me').then((r) => r.json())).subject_id || null);
  expect(ki, 'a belépett ember TÉNYLEGESEN a másik').toBe(bela4.subjectId);
  expect(ws4.bookId.length > 0, 'a próba a saját, friss vállalkozásán mért').toBe(true);
});
