// tests/e2e/v3app-r93.spec.mjs — AZ R93 BEFEJEZŐ CSOMAG VÉGIGKATTINTVA (CMD-VS-300-002-002 R93).
//
// MIÉRT EZ A LAP, ÉS MIBEN MÁS AZ R91-NÉL. A külső ellenőrző fél az R93-ban NEVEZETTEN kimondta,
// hogy az R91-03 próba INDULÁSI PRÓBA volt: „a kiemelést, várakozást ÉS megszakadást egyaránt
// sikernek veszi, majd kilép". Egy bemutatóról tehát nem tudtuk meg, hogy VÉGIG lehet-e menni rajta
// — pedig pont ez a kérdés. Ez a lap MINDEN deklarált bemutatót VÉGIGJÁR, a valódi műveletekkel
// együtt (valódi meghívó · valódi tag · valódi engedélymentés · valódi cégalapítás), és a
// négy kimenetet KÜLÖN eredményként kezeli: befejezve · átugorva · megszakadt · el sem indult.
//
// MIT MÉR:
//   R93-01  MIND A KILENC deklarált bemutató VÉGIGVIHETŐ — a végállapot `befejezve`, nem „elindult".
//   R93-02  A CÉGALAPÍTÁS bemutatója a FIÓKVÁLTÁS UTÁN is lezárul (a hordozott elszámolás).
//   R93-03  Nem marad ÁLLAPOT NÉLKÜLI Befejezés gomb: az ürítés a buborékot is takarítja.
//   R93-04  A BELÉPÉS ELŐTT választott nyelvet az ÚJ személy első belépése MEGTARTJA.
//   R93-05  Az ODA-VISSZA nyelvváltás is érvényteleníti a késve érkező választ.
//   R93-06  Az elavult válasz NEM oldja fel egy ÚJABB, még futó kérés küldés-állapotát.
//   R93-07  A chat FORRÁSA megnyitható — és a megfelelő útmutatóra visz.
import { test, expect } from '@playwright/test';
import { dictFor } from '../../v3app/public/i18n/dict.mjs';
import {
  World, createWorkspaceUI, openProfile, logoutUI,
  gotoPage, openInviteUI, redeemUI, ensureMemberRow, openMemberPanel, inviteUI, openMailbox, revokeUI,
} from './helpers.mjs';

const openHelp = async (page) => { await page.getByTestId('help-open').click(); await expect(page.getByTestId('help-close')).toBeVisible(); };
const closeHelp = async (page) => {
  if (await page.getByTestId('help-close').count()) {
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('help-close')).toHaveCount(0);
  }
};
const helpTab = async (page, tab) => { await page.getByTestId(`help-tab-${tab}`).click(); await expect(page.getByTestId(`help-view-${tab}`)).toBeVisible(); };

const closeTourPanel = async (page) => {
  const close = page.getByTestId('tour-close');
  if (await close.count() && await close.isVisible()) await close.click();
  // A TAKARÍTÁS NEM MÉRÉS: ha a bemutató nem ért véget, azt a VERDIKT mondja ki — itt csak
  // elpakolunk, hogy a következő bemutató tiszta lappal induljon (KUKA-216: a verdikt ne
  // mutasson a mérés hatókörén túl).
  const exit = page.getByTestId('tour-exit');
  if (await exit.count() && await exit.first().isVisible()) await exit.first().click();
  const close2 = page.getByTestId('tour-close');
  if (await close2.count() && await close2.isVisible()) await close2.click();
  // A BEMUTATÓ VÉGÉN NYITVA MARADHAT A MŰVELETI PANEL (meghívó · hozzáférés) — az MODÁLIS, tehát a
  // menü mögötte nem kattintható. A felhasználó útja ugyanez: a panelt be kell zárni (UX-18).
  const panelClose = page.locator('[data-action="panel-close"]');
  while (await panelClose.count() && await panelClose.last().isVisible()) {
    await panelClose.last().click();
    await page.waitForTimeout(100);
  }
};

async function startTourFor(page, feature) {
  await closeHelp(page);
  await openHelp(page);
  await helpTab(page, 'guides');
  await page.getByTestId('guide-search').fill('');
  await page.getByTestId(`help-guide-${feature}`).getByRole('button').click();
  await page.getByTestId(`help-tour-${feature}`).click();
  await expect(page.getByTestId('tour')).toBeVisible();
}

/** A FUTÓ LÉPÉS azonosítója a buborék listájából — a bemutató SAJÁT állapotából, nem tippből. */
async function currentStep(page) {
  const cur = page.locator('[data-testid^="tour-step-"][aria-current="step"]');
  if (!await cur.count()) return null;
  return String(await cur.first().getAttribute('data-testid')).replace('tour-step-', '');
}

/**
 * A BEMUTATÓ VÉGIGJÁRÁSA — ÚGY, AHOGY A FELHASZNÁLÓ.
 *
 * A `perform` a feladathoz kötött és a feltárást igénylő lépésekhez rendeli a VALÓDI műveletet. Ami
 * nincs benne, ott a járó a KIEMELT feltáró elemre kattint (a bemutató épp azt mondja, hogy arra
 * kell) — vagyis a próba nem kerüli meg a felületet, hanem használja.
 *
 * A VISSZATÉRÉSI ÉRTÉK NÉGY KÜLÖN SZÓ (a külső fél kikötése): `befejezve` · `megszakadt:<ok>` ·
 * `elakadt:<lépés>` · `nem_ert_veget`. Az „elindult" NEM eredmény.
 */
async function walkTour(page, perform = {}) {
  // AZ UTOLSÓ ISMERT LÉPÉS — mert a megszakítás-kártya ELVISZI a lépés-listát, és akkor már nincs
  // kit megkérdezni. A verdikt viszont pontosan azt kéri számon, HOL állt meg a történet, tehát a
  // tényt ott kell megőrizni, ahol még tudható (KUKA-049: a nem tudott nem „nem történt meg").
  let lastStep = null;
  for (let guard = 0; guard < 40; guard += 1) {
    if (await page.getByTestId('tour-finished').count()) return 'befejezve';
    // A LÉPÉST A MEGSZAKADÁS ELŐTT OLVASSUK KI: a megszakítás-kártya ELVISZI a lépés-listát (nincs
    // többé `aria-current`), tehát a megszakadás után kérdezve a válasz `null` — a verdikt épp azt
    // nem tudná megmondani, amiért a lépést felvettük (MÉRVE: „megszakadt:targetMissing:null").
    const step = await currentStep(page);
    if (step !== null) lastStep = step;
    if (await page.getByTestId('tour-aborted').count()) {
      // A HOL IS RÉSZE A VERDIKTNEK (R158/2): egy puszta „megszakadt:targetMissing" nem mondja meg,
      // hogy a történet a MÁSODIK vagy a TIZENHATODIK lépésnél állt-e meg — márpedig az elvárást
      // csak a lépés ismeretében lehet pontosan kimondani (KUKA-216).
      const w = await page.getByTestId('tour-aborted').getAttribute('data-why');
      return `megszakadt:${w}:${step ?? lastStep}`;
    }
    if (await page.getByTestId('tour-blocked').count()) {
      if (!perform[step]) return `elakadt:${step}`;
      await perform[step]();
      continue;
    }
    // A TEENDŐ ÉS A TÁJÉKOZTATÁS KÜLÖNBSÉGE A KIMENETBŐL JÖN, NEM A JÁRÓ TUDÁSÁBÓL (R158/2): a
    // `data-actionable` a lap döntése (`INFORMATIONAL_PENDING`, `v3app/public/tour.mjs`) — így a
    // szabály EGY helyen áll, nem két járóban lemásolva (KUKA-003 · KUKA-039).
    if (await page.getByTestId('tour-pending').count()
        && await page.getByTestId('tour-pending').getAttribute('data-actionable') !== 'false') {
      if (perform[step]) { await perform[step](); continue; }
      // A VÁRAKOZÁSHOZ TARTOZIK KIEMELÉS — ÉS HA NEM, AZ MÉRT VERDIKT, NEM IDŐTÚLLÉPÉS (R158/2).
      // A korábbi alak VAKON kattintott a `.tourtarget`-re: ha a buborék várakozást írt ki kiemelés
      // NÉLKÜL (pl. szereplő-váltást kérő lépés a valódi héjban, ahol ilyen vezérlő nincs), a próba
      // 15 másodpercet várt, majd „locator.click: Timeout"-tal bukott — a LELET helyett a MÉRŐ
      // hibájáról beszélt (KUKA-215: a választ meg kell MÉRNI · KUKA-049: a nem tudott nem „nem
      // történt meg"). Most a verdikt megnevezi a lépést ÉS a várakozás okát.
      if (!await page.locator('.tourtarget').count()) {
        const why = await page.getByTestId('tour-pending').getAttribute('data-why');
        return `varakozik_kiemeles_nelkul:${step}:${why}`;
      }
      await page.locator('.tourtarget').first().click();
      continue;
    }
    if (await page.getByTestId('tour-finish').count()) { await page.getByTestId('tour-finish').click(); continue; }
    if (await page.getByTestId('tour-next').count()) { await page.getByTestId('tour-next').click(); continue; }
    return `nem_ert_veget:${step}`;
  }
  const last = await currentStep(page);
  const states = await page.locator('[data-testid^="tour-step-"]').evaluateAll(
    (els) => els.map((e) => `${e.getAttribute('data-testid')}=${e.getAttribute('data-state')}`).join(','),
  );
  return `nem_ert_veget:${last}:${states}`;
}

/** A VERDIKT AZONNAL LÁTSZIK — a futás-napló megmondja, MELYIK bemutató hol állt meg. */
async function walkTourLogged(page, id, perform = {}) {
  const out = await walkTour(page, perform);
  console.log(`[R93-01] ${id.padEnd(18)} → ${out}`);
  return out;
}

test('R93-01/02/03 — MINDEN bemutató VÉGIGVIHETŐ, a cégalapítás a fiókváltás UTÁN is lezárul', async ({ browser }) => {
  const w = new World(browser, 'r9301');
  const verdict = {};
  try {
    const anna = await w.person('anna');
    await createWorkspaceUI(anna.page, { name: 'R93 Kft', business: { jurisdiction: 'HU', tax_id: '12345678-1-42' } });

    // ── EGY VALÓDI TAG a hozzáférés-bemutatóhoz (a külső fél kikötése: „legyen valódi tag").
    const berta = await w.person('berta');
    const inv = await inviteUI(anna.page, { email: berta.email, role: 'user', scope: 'keszlet' });
    expect(inv.body.ok, 'a valódi meghívó elkészült').toBe(true);
    await openInviteUI(berta.page, inv.link);
    await redeemUI(berta.page);
    await anna.page.reload();
    await ensureMemberRow(anna.page, berta.subjectId);

    // ── A DEKLARÁLT LISTA A SZERVERTŐL JÖN — nem kézi másolat (KUKA-051).
    const status = await anna.api.get('/api/assistant/status?lang=hu');
    const tours = status.body.tours;
    // R132: a tizedik a MEGHÍVÁS VISSZAVONÁSA, a tizenegyedik az ÚJBÓLI BELÉPÉS. A szám KÖVETKEZMÉNY,
    // nem kézi pin: mind a tizenegyet VÉGIG IS VISSZÜK ebben a próbában (KUKA-045).
    expect(tours.length, 'a fiókkezelőnek tizenegy bemutató jár').toBe(11);
    const byId = Object.fromEntries(tours.map((t) => [t.id, t]));

    const simple = ['tour.shell', 'tour.stock', 'tour.language', 'tour.help', 'tour.plan'];
    for (const id of simple) {
      await startTourFor(anna.page, byId[id].feature);
      verdict[id] = await walkTourLogged(anna.page, id, {
        // A CSOMAG-bemutató utolsó lépése VALÓDI mentéshez kötött.
        s3: id === 'tour.plan' ? async () => {
          await anna.page.getByTestId('plan-select').selectOption('pro');
          await anna.page.getByTestId('plan-submit').click();
          await expect(anna.page.getByTestId('plan-result')).toBeVisible();
        } : undefined,
      });
      await closeTourPanel(anna.page);
      await closeHelp(anna.page);
    }

    // ── A MEGHÍVÁS: valódi meghívó készül a bemutató lépésében.
    await gotoPage(anna.page, 'overview');
    await startTourFor(anna.page, byId['tour.invite'].feature);
    verdict['tour.invite'] = await walkTourLogged(anna.page, 'tour.invite', {
      s5: async () => {
        await anna.page.getByTestId('invite-email').fill(w.email('cili'));
        await anna.page.getByTestId('invite-submit').click();
        // A MENTÉS UTÁN A KÖVETKEZŐ LÉPÉS IS MEGJELENIK — ez a bemutató HATODIK lépésének a célja.
        // (A saját leletem itt jött ki: egy néma kliens-oldali kivétel miatt ez a gomb rejtve maradt.)
        await expect(anna.page.getByTestId('invite-result')).toContainText('elkészült');
        await expect(anna.page.getByTestId('invite-mail-open')).toBeVisible();
      },
    });
    await closeTourPanel(anna.page);

    // ── A HOZZÁFÉRÉS: valódi tag, valódi engedélymentés.
    await gotoPage(anna.page, 'overview');
    /**
     * A SOR VÉGÁLLAPOTÁRA VÁRUNK, NEM A NYUGTA-MEZŐ „NEM ÜRES" ÁLLAPOTÁRA (KUKA-228).
     *
     * A LELET (saját, R126): a `members-result` mező a KORÁBBI lépés mondatát viszi, tehát a
     * `not.toHaveText('')` AZONNAL teljesül — a lépés visszatér, miközben a `loadMembers()`
     * újrarajzolása még fut. A következő lépés gombja így a rajzolás közepébe kattint, és a
     * Playwright „element was detached from the DOM" hibával ütközik. Párhuzamos teljes futásban
     * ez időtúllépéssel bukott; egyedül futtatva átment — vagyis a próba a FUTÁSI SORRENDTŐL
     * függött, nem a rendszertől (KUKA-121: a nem-várakozó ellenőrzés mint várakozás).
     *
     * A MÉRCE: a sor ÁTBILLENT-e. Megadás után a soron a VISSZAVONÁS gombja áll, és fordítva —
     * ez a lista tényleges újrarajzolásához kötött, ellentétben a nyugta-mezővel.
     */
    const HU = dictFor('hu');
    /** A sablon leghosszabb ÁLLANDÓ szakasza — a mérés a szótárból veszi a mondatot (KUKA-237). */
    const allando = (tpl) => String(tpl || '').split(/\{[^}]*\}/g).map((x) => x.trim())
      .reduce((a, b) => (b.length > a.length ? b : a), '');
    const kattintEsMegvar = async (scope, muvelet, kulcs) => {
      const gomb = anna.page.getByTestId(`member-scope-${muvelet}-${berta.subjectId}-${scope}`);
      if (!await gomb.count()) { await openMemberPanel(anna.page, berta.subjectId); return; }
      await gomb.click();
      // A MŰVELET SAJÁT NYUGTÁJÁRA várunk, nem arra, hogy a mező „nem üres" (a mező a KORÁBBI
      // lépés mondatát viszi, tehát az azonnal teljesülne). A mondat a szótárból jön.
      await expect(anna.page.getByTestId('members-result')).toContainText(allando(HU.TPL[kulcs]));
    };

    await startTourFor(anna.page, byId['tour.grant'].feature);
    verdict['tour.grant'] = await walkTourLogged(anna.page, 'tour.grant', {
      // R121 ÓTA KÖRÖNKÉNTI GOMB: a bemutató lépése a SOR gombját nyomja meg (a közös űrlap kivezetve).
      s3: () => kattintEsMegvar('arak', 'grant', 'memberCanSee'),
    });
    await closeTourPanel(anna.page);

    // ── R121 — A HOZZÁFÉRÉS ÉLETCIKLUSA: megadás ÉS visszavonás, MINDKETTŐ igazolt mentéshez
    //    kötve. A lépés csak TÉNYLEGES változás után halad (TUR-01): a gomb megnyomása nem siker.
    await gotoPage(anna.page, 'overview');
    await startTourFor(anna.page, byId['tour.scopeLifecycle'].feature);
    verdict['tour.scopeLifecycle'] = await walkTourLogged(anna.page, 'tour.scopeLifecycle', {
      s3: () => kattintEsMegvar('dokumentumok', 'grant', 'memberCanSee'),
      s4: () => kattintEsMegvar('dokumentumok', 'revoke', 'scopeRevoked'),
    });
    await closeTourPanel(anna.page);

    // ── R132/1 — A MEGHÍVÁS VISSZAVONÁSA: a lépés CSAK tényleges visszavonás után halad (TUR-01).
    //    A FÜGGŐ meghívó a `tour.invite` lépésében született (cili) — a próba a SAJÁT előfeltételét
    //    használja, nem egy másik próbától örökölt állapotot (KUKA-239).
    await gotoPage(anna.page, 'overview');
    await startTourFor(anna.page, byId['tour.inviteRevoke'].feature);
    verdict['tour.inviteRevoke'] = await walkTourLogged(anna.page, 'tour.inviteRevoke', {
      // A LÉPÉS-KEZELŐ ÁLLAPOT-TUDATOS, és ez SZÁNDÉKOS: a járó a feladathoz kötött lépésen
      // TÖBBSZÖR is meghívja (előbb a „feltárásra vár", majd a „feladat hiányzik" állapotban) —
      // ugyanaz az alak, mint a `tour.grant` kezelőjénél. Minden hívás a MAI DOM-ból dönt, nem egy
      // korábbi feltevésből (KUKA-228 · KUKA-209).
      //
      // A FELADAT A NEGYEDIK LÉPÉSEN ÁLL: a harmadik a LISTÁT emeli ki (ő a negyedik feltárója), a
      // negyedik a megerősítő panelt. A kulcs ezért `s4` — a bemutató SAJÁT lépés-azonosítója, nem
      // egy sorszám-tipp (a járó a buborék aria-current állapotából olvassa).
      s4: async () => {
        if (await anna.page.getByTestId('invite-revoke-confirm').count()) {
          await anna.page.getByTestId('invite-revoke-confirm').click();
          await expect(anna.page.getByTestId('members-result')).toContainText(allando(HU.TPL.inviteRevoked));
          return;
        }
        if (!(await anna.page.getByTestId('invites-list').count())) {
          await anna.page.getByTestId('members-tab-invites').click();
          await expect(anna.page.getByTestId('invites-list')).toBeVisible();
        }
        const row = anna.page.locator('tr[data-testid^="invite-row-"]').filter({ hasText: w.email('cili') }).first();
        await expect(row).toBeVisible();
        // A GOMBOT A SORHOZ KÉPEST keressük, nem egy KORÁBBAN kiolvasott azonosítóval: a lista a
        // fül-váltás és az adat megérkezése között ÚJRARAJZOLÓDIK, és egy előre eltett `data-testid`
        // a régi DOM-ra mutat (KUKA-228: amit a próba nem nyom meg helyettünk, arra VÁRNI kell).
        const gomb = row.locator('[data-action="invite-revoke-start"]');
        // HA A SOR MÁR VISSZAVONT, A MUNKA KÉSZ: a járó a feladat-lépést többször hívja, és a
        // művelet UTÁNI hívásban nincs több gomb — ez nem hiba, hanem a végállapot (KUKA-129).
        if (!(await gomb.count())) {
          await expect(row.getByTestId('invite-state-revoked')).toBeVisible();
          return;
        }
        await expect(gomb).toBeVisible();
        await gomb.click();
        await expect(anna.page.getByTestId('invite-revoke-lead')).toBeVisible();
      },
    });
    await closeTourPanel(anna.page);
    // A LEZÁRÓ BUBORÉK ELPAKOLÁSA MÉRVE, NEM FELTÉTELEZVE. A buborék a megerősítő PÁRBESZÉDBE
    // költözött (`hostTour`), és annak bezárása után a `tour-close` nem feltétlenül kattintható —
    // mérve: a befejező kártya a lapon maradt, és elfogta a következő művelet kattintását. A
    // takarítás ezért ÁLLÍT: ha a kártya még ott van, a lap újratöltésével pakolunk el (ez a
    // felhasználó számára is kézenfekvő út). A takarítás NEM mérés — a verdiktet a `walkTour` adta
    // (KUKA-216), de a takarítás HIÁNYA a KÖVETKEZŐ mérést rontaná el (KUKA-120).
    if (await anna.page.getByTestId('tour').isVisible().catch(() => false)) {
      await anna.page.reload();
      await expect(anna.page.getByTestId('header-subject')).toContainText('@');
    }
    await expect(anna.page.getByTestId('tour')).toBeHidden();

    // ── R132/2 — AZ ÚJBÓLI BELÉPÉS: előbb VALÓDI eltávolítás (a bemutató előfeltétele), majd a
    //    visszahívás. A lépés CSAK tényleges elküldés után halad.
    await gotoPage(anna.page, 'overview');
    // VISSZA A TAG-FÜLRE: a fül-választás a lap ÁLLAPOTA, és az előző bemutató a meghívó-fülön
    // hagyta — a `members-list` horgony (a következő bemutató 2. lépésének célja) csak a tag-fülön
    // létezik (KUKA-218: minden nézethez kötött állapotot egy helyen kell rendezni).
    await gotoPage(anna.page, 'members');
    await anna.page.getByTestId('members-tab-members').click();
    await expect(anna.page.getByTestId('members-list')).toBeVisible();
    // AZ ELTÁVOLÍTÁS A BEMUTATÓ HARMADIK LÉPÉSE (`member-revoke`, feladat: `member.revoked`) — NEM
    // előfeltétel. A régi alak a bemutató INDÍTÁSA ELŐTT végezte el a felületről, és ezzel a lépés
    // feladatát ELÉRHETETLENNÉ tette: a bemutatón belül a `member.revoked` jel soha nem keletkezett
    // újra, tehát a harmadik lépés nem tudott lezárulni. Ez nem a kód hibája volt, hanem a MÉRÉSÉ —
    // és addig nem látszott, amíg a két szereplős történet egyáltalán el nem indult (a `requires_demo`
    // kapu miatt a próba sosem jutott el idáig). A műveletet innentől a bemutató LÉPÉSE végzi.
    await gotoPage(anna.page, 'overview');
    await startTourFor(anna.page, byId['tour.reentry'].feature);
    verdict['tour.reentry'] = await walkTourLogged(anna.page, 'tour.reentry', {
      // A HARMADIK LÉPÉS AZ ELTÁVOLÍTÁS (feladat: `member.revoked`) — a bemutatón BELÜL, a valódi
      // felületről, tehát a határ is mérve van. A járó ezt a kezelőt a „feltárásra vár" és a
      // „feladat hiányzik" állapotban is meghívja, ezért minden hívás a MAI DOM-ból dönt.
      s3: async () => {
        if (await anna.page.getByTestId(`member-removed-${berta.subjectId}`).isVisible().catch(() => false)) return;
        if (!(await anna.page.getByTestId('members-list').isVisible().catch(() => false))) {
          await anna.page.getByTestId('members-tab-members').click();
          await expect(anna.page.getByTestId('members-list')).toBeVisible();
        }
        await revokeUI(anna.page, berta.subjectId);
        await expect(anna.page.getByTestId(`member-removed-${berta.subjectId}`)).toBeVisible();
      },
      // A NEGYEDIK LÉPÉS A VISSZAHÍVÁS (feladat: `reinvite.sent`).
      //
      // ÉS A MEGERŐSÍTÉS CSAK AKKOR MŰVELET, HA LÁTSZIK. A régi alak `count()`-tal kérdezett, ami a
      // DOM-ot számolja: a rejtett megerősítő gomb „megvan"-nak látszott, a kattintás pedig 15
      // másodperc után időtúllépéssel bukott — a mérő hibájáról beszélt a lelet helyett (KUKA-215).
      s4: async () => {
        if (await anna.page.getByTestId('reinvite-confirm').isVisible().catch(() => false)) {
          await anna.page.getByTestId('reinvite-confirm').click();
          // A NYUGTA A SZÓTÁRBÓL mért ÁLLANDÓ szakaszára várunk (KUKA-237).
          await expect(anna.page.getByTestId('members-result')).toContainText(allando(HU.TPL.reinviteSent));
          return;
        }
        if (!(await anna.page.getByTestId('members-list').isVisible().catch(() => false))) {
          await anna.page.getByTestId('members-tab-members').click();
          await expect(anna.page.getByTestId('members-list')).toBeVisible();
        }
        await openMemberPanel(anna.page, berta.subjectId);
        await anna.page.getByTestId(`member-reinvite-${berta.subjectId}`).click();
        await expect(anna.page.getByTestId('reinvite-form')).toBeVisible();
      },
    });
    await closeTourPanel(anna.page);

    // ── A CÉGALAPÍTÁS: a bemutató a SAJÁT sikerétől vesztette el az elszámolását (F93-01).
    await gotoPage(anna.page, 'overview');
    await startTourFor(anna.page, byId['tour.addBusiness'].feature);
    verdict['tour.addBusiness'] = await walkTourLogged(anna.page, 'tour.addBusiness', {
      s5: async () => {
        await anna.page.getByTestId('ws-name').fill('Own93 Kft');
        await anna.page.getByTestId('ws-jurisdiction').selectOption('HU');
        await anna.page.getByTestId('ws-tax-id').fill('87654321-1-42');
        await anna.page.getByTestId('ws-create').click();
        await expect(anna.page.getByTestId('tour-finished')).toBeVisible();
      },
    });
    // R93-02: a lezárás MEGSZÜLETETT, TELJES, és KIMONDJA, hogy hordozott (nem hazudik helyszínt).
    await expect(anna.page.getByTestId('tour-finished'), 'a fiókváltás után is van lezárás').toBeVisible();
    await expect(anna.page.getByTestId('tour-finished')).toHaveAttribute('data-whole', 'true');
    await expect(anna.page.getByTestId('tour-finished')).toHaveAttribute('data-carried', 'true');
    await expect(anna.page.getByTestId('tour-summary')).toContainText('5');
    // …és tényleg AZ ÚJ fiókban vagyunk (a lezárás nem a váltás elmaradásából jön).
    await expect(anna.page.getByTestId('header-workspace')).toContainText('Own93');
    await anna.page.getByTestId('tour-close').click();
    await expect(anna.page.getByTestId('tour')).toBeHidden();

    // ── R93-03: NEM MARAD ÁLLAPOT NÉLKÜLI BEFEJEZÉS GOMB. Egy futó bemutató közben fiókot váltunk.
    await gotoPage(anna.page, 'overview');
    await startTourFor(anna.page, byId['tour.shell'].feature);
    await expect(anna.page.getByTestId('tour-next')).toBeVisible();
    await anna.page.getByTestId('account-switcher-summary').click();
    await anna.page.getByTestId(`ws-switch-${(await anna.api.get('/api/me')).body.personal_book_id}`).click();
    await expect(anna.page.getByTestId('tour'), 'a buborék a váltással eltűnik — nem marad gazdátlan gomb').toBeHidden();
    await expect(anna.page.getByTestId('tour-finish')).toHaveCount(0);
    await expect(anna.page.getByTestId('tour-next')).toHaveCount(0);

    // ── A BELÉPÉS ELŐTTI bemutató a saját képernyőjén (a kilencedik).
    const { page: anon } = await w.anonymous();
    await anon.goto('/');
    await anon.getByTestId('auth-help-open').click();
    await helpTab(anon, 'guides');
    await anon.getByTestId('help-guide-auth.register').getByRole('button').click();
    await anon.getByTestId('help-tour-auth.register').click();
    await expect(anon.getByTestId('tour')).toBeVisible();
    verdict['tour.register'] = await walkTourLogged(anon, 'tour.register');
    /**
     * A FELADAT NÉLKÜLI TÚRA NEM ÁLLÍTHATJA, HOGY A FELHASZNÁLÓ MŰVELETET VÉGZETT (R93 §4).
     * Ezt VISELKEDÉSSEL mérjük, nem felirattal: a bemutató végigmenetele után SEMMI nem jött
     * létre — a lap a belépési képernyőn áll, és nincs munkamenet (KUKA-237).
     */
    await expect(anon.getByTestId('tour-finished')).toHaveAttribute('data-whole', 'true');
    const me = await anon.evaluate(async () => (await fetch('/api/me')).json());
    expect(me.subject_id ?? null, 'a bemutató VÉGIGMENETELE nem hozott létre fiókot').toBeNull();
    await anon.getByTestId('tour-close').click();
    // A BELÉPÉS ELŐTTI KÉPERNYŐN MARADTUNK: a keret NEM nyílt meg (UX-01 — belső nézet csak belépve).
    await expect(anon.getByTestId('auth'), 'a belépés előtti képernyőn maradtunk').toBeVisible();
    await expect(anon.getByTestId('app')).toBeHidden();

    // ── AZ ELSZÁMOLÁS — ÉS A HATÓKÖR KIMONDVA (R158/2, KUKA-216) ─────────────────────────────
    //
    // MINDEN deklarált bemutató végig lett JÁRVA, és egyik verdikt sem „elindult". A TIZENKETTŐ
    // viszont KÉT osztályba esik, és ezt a próba KIMONDJA, nem elmossa:
    //
    //   (a) TÍZ bemutató az alkalmazás-héjban VÉGIGVIHETŐ — itt a „befejezve" a mérce;
    //   (b) KETTŐ (`tour.inviteRevoke` · `tour.reentry`) DEKLARÁLTAN átível a szereplőkön
    //       (`switch_actor`, `requires_demo`): a végigvitelükhöz KÉT ÉLŐ munkamenet kell. A héjban
    //       nincs „váltás a másik nézetére" vezérlő — ezt a `requires_demo` kapu indoklása maga
    //       mondja ki —, tehát a történet a VALÓDI határon megy a szereplő-váltásig (meghívó
    //       visszavonása · tag eltávolítása · visszahívás: mind igazi HTTP-művelet), és ott
    //       NEVEZETTEN áll meg. Ez a R158/2 előtt NEM így volt: a buborék egy nem létező kiemelt
    //       gombra küldött, a próba-járó pedig időtúllépéssel bukott.
    //
    // ÉS A VÉGIGVITELÜK NEM MARAD BIZONYÍTÉK NÉLKÜL: a két történet TELJES végigjárását a
    // `npm run proof:demo-walk` méri a bemutató-lapon (ahol a váltás-vezérlő létezik), kétszer,
    // végállapot-ellenőrzéssel — és ez a lánc az R158/2-vel a KÖTELEZŐ böngésző-kapu része lett
    // (`npm run verify:browser-gate`). AMIT AZ A TANÚ NEM ÁLLÍT: a háttere a SZIMULÁLT
    // bemutató-adapter, tehát nem HTTP- és nem tároló-bizonyíték (KUKA-227).
    const appShell = ['tour.shell', 'tour.stock', 'tour.language', 'tour.help', 'tour.plan',
      'tour.invite', 'tour.grant', 'tour.scopeLifecycle', 'tour.addBusiness', 'tour.register'];
    const crossActor = ['tour.inviteRevoke', 'tour.reentry'];
    expect(Object.keys(verdict).sort(), 'minden deklarált bemutató végig lett járva').toEqual(
      [...appShell, ...crossActor].sort(),
    );
    for (const id of appShell) {
      expect(verdict[id], `${id}: az alkalmazás-héjban VÉGIGVIHETŐ`).toBe('befejezve');
    }
    for (const id of crossActor) {
      // A MEGÁLLÁS HELYE NEM KÉZI SZÁM, HANEM A DEKLARÁCIÓBÓL SZÁMÍTOTT KÖVETKEZMÉNY (KUKA-045):
      // az utolsó megjárt lépés UTÁN álló lépésnek a bemutató SAJÁT definíciója szerint
      // `switch_actor`-nak kell lennie. Ha valaki a megállást előbbre csúsztatja (mert elromlott egy
      // valódi művelet), ez az állítás azonnal pirosra vált.
      expect(verdict[id], `${id}: NEVEZETTEN áll meg, nem hallgat el és nem akad el`)
        .toMatch(/^megszakadt:targetMissing:s\d+$/);
      const steps = byId[id].steps;
      const megallo = String(verdict[id]).split(':')[2];
      const idx = steps.findIndex((x) => x.id === megallo);
      expect(idx, `${id}: a megnevezett lépés a bemutató definíciójában áll`).toBeGreaterThanOrEqual(0);
      expect(steps[idx + 1] && steps[idx + 1].switch_actor === true,
        `${id}: a megállás PONTOSAN a deklarált szereplő-váltó lépésen van (${megallo} után)`).toBe(true);
    }
  } finally { await w.close(); }
});

/**
 * NYELV-FÜGGETLEN REGISZTRÁCIÓ ÉS BELÉPÉS. A közös segéd a MAGYAR válasz-szövegre mér; ez a próba
 * viszont épp azt méri, hogy a lap a VÁLASZTOTT nyelven beszél — ezért itt a VISELKEDÉST nézzük
 * (megjelent-e a válasz, létrejött-e a munkamenet), nem a felirat szövegét (KUKA-237).
 */
async function registerAnyLang(page, email, password = 'proba-jelszo-2026') {
  await page.locator('[data-auth="register"]').first().click();
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill(password);
  await page.getByTestId('register-submit').click();
  await expect(page.getByTestId('register-result')).not.toHaveText('');
}
/** A megerősítés a levél-fogadóból, a CÍM alapján — a levél TÁRGYA nyelvenként más (F93-02). */
async function verifyAnyLang(page, email) {
  await openMailbox(page);
  const li = page.locator('li[data-testid^="mail-"]').filter({ hasText: email }).last();
  await expect(li).toBeVisible();
  await li.locator('a[data-testid^="mail-link-"]').click();
  await expect(page.getByTestId('verify-result')).toHaveAttribute('data-ok', 'true');
  await page.getByTestId('verify-back').click();
  await expect(page.getByTestId('login-email')).toBeVisible();
}
async function loginAnyLang(page, email, password = 'proba-jelszo-2026') {
  if (!await page.getByTestId('login-email').count()) await page.locator('[data-auth="login"]').first().click();
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('header-subject')).toContainText(email);
}

test('R93-04 — a belépés ELŐTT választott nyelvet az ÚJ személy első belépése MEGTARTJA', async ({ browser }) => {
  const w = new World(browser, 'r9304');
  try {
    const { page } = await w.anonymous();
    const email = w.email('dora');
    await page.goto('/');
    // ── A FELHASZNÁLÓ TUDATOSAN NÉMETRE ÁLLÍT, MÉG BELÉPÉS ELŐTT.
    await page.getByTestId('lang-select-public').selectOption('de');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    // A SEGÉD MAGYAR SZÖVEGET VÁR — itt a lap NÉMET, ezért a regisztráció a saját, nyelv-független
    // útján megy (ez maga is a javítás jele: a lap tényleg a választott nyelven válaszol).
    await registerAnyLang(page, email);
    await verifyAnyLang(page, email);
    await loginAnyLang(page, email);
    // ── A LELET: itt a lap magyarra állt vissza, mert az új személynek nincs tárolt választása.
    await expect(page.locator('html'), 'az úton választott nyelv túléli az első belépést').toHaveAttribute('lang', 'de');
    // …és innentől az ÖVÉ: a frissítés után is megmarad.
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');

    // ── ÉS NEM ÖRÖKLŐDIK: kijelentkezés után a KÖVETKEZŐ ember nem kapja meg automatikusan.
    await logoutUI(page);
    const other = w.email('elek');
    await registerAnyLang(page, other);
    await verifyAnyLang(page, other);
    await loginAnyLang(page, other);
    await expect(page.locator('html'), 'az előző ember választása nem lesz a következő emberé').not.toHaveAttribute('lang', 'de');
  } finally { await w.close(); }
});

test('R93-05/06 — az ODA-VISSZA nyelvváltás is eldobja a késő választ, és a küldés-állapot a SAJÁTJÁÉ', async ({ browser }) => {
  const w = new World(browser, 'r9305');
  try {
    const anna = await w.person('anna');
    await createWorkspaceUI(anna.page, { name: 'R93 Nyelv Kft', business: { jurisdiction: 'HU', tax_id: '11223344-1-42' } });

    // A VÁLASZT VISSZATARTJUK — a nyelvváltás a válasz ÚTON LÉTE alatt történik.
    let release = null;
    const held = new Promise((r) => { release = r; });
    let intercepted = 0;
    await anna.page.route('**/api/assistant/ask', async (route) => {
      intercepted += 1;
      if (intercepted === 1) await held;
      await route.continue();
    });

    await openHelp(anna.page);
    await helpTab(anna.page, 'ask');
    await anna.page.getByTestId('chat-input').fill('Hogyan hívhatok meg valakit?');
    await anna.page.getByTestId('chat-send').click();

    // ── ODA-VISSZA: magyar → német → magyar. A nyelv ÉRTÉKE a végén ugyanaz, mint a küldéskor.
    await closeHelp(anna.page);
    await openProfile(anna.page);
    await anna.page.getByTestId('profile-menu').getByRole('button').first().click();
    await anna.page.getByTestId('lang-select').selectOption('de');
    await expect(anna.page.locator('html')).toHaveAttribute('lang', 'de');
    await anna.page.getByTestId('lang-select').selectOption('hu');
    await expect(anna.page.locator('html')).toHaveAttribute('lang', 'hu');

    release();
    await anna.page.waitForTimeout(500);
    await openHelp(anna.page);
    await helpTab(anna.page, 'ask');
    // ── A LELET: az érték-összehasonlítás átengedte a régi választ. A GENERÁCIÓ nem engedi.
    await expect(anna.page.getByTestId('chat-list'), 'az oda-vissza váltás után a régi válasz NEM jelenik meg').toHaveCount(0);
  } finally { await w.close(); }
});

test('R93-07 — a chat FORRÁSA megnyitható, és a megfelelő útmutatóra visz', async ({ browser }) => {
  const w = new World(browser, 'r9307');
  try {
    const anna = await w.person('anna');
    await createWorkspaceUI(anna.page, { name: 'R93 Forrás Kft', business: { jurisdiction: 'HU', tax_id: '55667788-1-42' } });
    await openHelp(anna.page);
    await helpTab(anna.page, 'ask');
    await anna.page.getByTestId('chat-input').fill('Hogyan hívhatok meg valakit?');
    await anna.page.getByTestId('chat-send').click();
    await expect(anna.page.getByTestId('chat-answer-0')).toBeVisible();
    // ── A LELET: a forrás sima listasor volt — látszott, de nem lehetett eljutni oda.
    const open = anna.page.getByTestId('chat-source-open-invite.send');
    await expect(open, 'a forrás-cím megnyitható gomb').toBeVisible();
    await open.click();
    // …és a MEGFELELŐ útmutató nyílik meg, a mai nyelven.
    await expect(anna.page.getByTestId('help-view-guides')).toBeVisible();
    await expect(anna.page.getByTestId('help-topic-invite.send')).toBeVisible();
  } finally { await w.close(); }
});
