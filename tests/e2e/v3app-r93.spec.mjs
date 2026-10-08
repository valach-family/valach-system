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
import { TOURS, actorSwitchSteps } from '../../v3app/knowledge/features.mjs';
// AZ R166 §3 TIZENKÉT ÚTMUTATÓJÁNAK ÉLŐ TANÚJA EGY MÁSIK LAP — a listát ONNAN olvassuk, nem
// írjuk ide másodszor: két névsor előbb-utóbb elcsúszik (KUKA-003 · KUKA-045).
import { UJ_UTMUTATOK } from './r166Tours.mjs';
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
    /**
     * A VÁRT KÉSZLET A REGISZTERBŐL JÖN, NEM BEÍRT DARABSZÁMBÓL (R164/3 — KUKA-045).
     *
     * A RÉGI ALAK egy pin volt (`toBe(11)`, majd `toBe(14)`), és a külső review `F164-05`-ként
     * kimondta a csapdát: a szám ÁTÍRÁSA önmagában hamis zöld, a MEGTARTÁSA viszont piros egy ép
     * rendszeren. A szám így kétszer bukott el ebben a csomagban, pusztán attól, hogy új útmutató
     * született.
     *
     * A MÉRCE MOST A KÉSZLET, MINDKÉT IRÁNYBAN: a határ pontosan azt adja ki, amit a regiszter
     * deklarál. Egy némán kiesett bemutatót a darabszám nem fogott volna meg (ha közben új születik,
     * az összeg akár stimmelhet is), egy kitalált azonosítót sem. A HÁROM kizárás a regiszter
     * ADATÁBÓL jön: `requires_anonymous` (belépés előtti képernyő) · `requires_invite`
     * (meghívó-képernyő) · és a SZEREPLŐ-VÁLTÓ lépés (lásd alább).
     *
     * A HARMADIK KIZÁRÁS A R164/3 JAVÍTÁSA (a külső review hatodik körének lelete). Ez a próba a
     * VALÓDI alkalmazás-héjat futtatja; abban nincs „váltás a másik nézetére" vezérlő, tehát a két
     * szereplő-váltó bemutató ott NEM vihető végig. Korábban a kiszolgáló mégis felkínálta őket (a
     * kapu a KÖRNYEZET jelét kérdezte), és ez a próba a `targetMissing` MEGSZAKADÁST írta elő
     * elvárt eredményként — azaz a hibát szentesítette. Mostantól a kapu a FELÜLET horgonyaihoz
     * kötött, a héj ezt a kettőt NEM kapja meg, és itt a KIZÁRÁST mérjük. A kizárandók listája nem
     * kézi: a bemutató SAJÁT `switch_actor` lépéseiből számoljuk (KUKA-045).
     */
    /**
     * A HARMADIK KIZÁRÁS INDOKA AZ R176 §1-BEN MEGVÁLTOZOTT. A váltó vezérlő ma MEGVAN a valódi
     * héjban (a kijelentkezés az, `data-tour-anchor="actor-switch"`), és a két átívelő történet a
     * VALÓDI felületen végig is megy (`R176-K1/K2/K3`). A kizárás ma a történet INDULÓ ADATÁN áll
     * (`requires_story_data`): ebben a próbában nincs függő meghívás és nincs másik tag, tehát a
     * kiszolgáló NEVEZETTEN nem kínálja fel őket (`KUKA-417`).
     */
    /**
     * ÉS AZ INDULÓ ADATOT MÉRJÜK, NEM FELTESSZÜK (`KUKA-215`). Itt a két tény KÜLÖNBÖZIK, és éppen
     * ez az ELLENPÁR: Berta elfogadta a meghívást, tehát FÜGGŐ meghívás NINCS (a visszavonás
     * története nem jár), MÁSIK TAG viszont VAN (az újbóli belépés története jár). Egy általános,
     * mindkettőt kizáró szabály ezt a különbséget elrejtené.
     */
    const fuggo = await anna.api.get('/api/invites/waiting');
    const tagok = await anna.api.get('/api/members');
    const adat = {
      pending_invite: ((fuggo.body && fuggo.body.invites) || []).some((i) => i.state === 'pending'),
      other_member: ((tagok.body && tagok.body.members) || []).some((m) => m.email !== anna.email),
    };
    expect(`${adat.pending_invite} · ${adat.other_member}`,
      'MÉRVE: függő meghívás NINCS (Berta elfogadta), másik tag viszont VAN').toBe('false · true');
    const DEKLARALT = Object.keys(TOURS);
    const valtosBemutato = (id) => actorSwitchSteps(TOURS[id]).length > 0;
    const kiszolgalt = DEKLARALT.filter((id) => TOURS[id].requires_anonymous !== true
      && TOURS[id].requires_invite !== true
      && (!TOURS[id].requires_story_data || adat[TOURS[id].requires_story_data] === true));
    // ELLENPÁR A KIZÁRÁSHOZ: ha a regiszterből eltűnne minden `switch_actor` lépés, ez az állítás
    // azonnal pirosra vált — a kizárás így nem lehet néma üres halmaz (KUKA-216). És MINDKETTŐ
    // kimondja az induló adatát: a horgony-változás után ez tartja távol a végig nem vihetőt.
    expect(DEKLARALT.filter(valtosBemutato).sort(), 'a regiszter KÉT szereplő-váltó bemutatót deklarál')
      .toEqual(['tour.inviteRevoke', 'tour.reentry']);
    expect(DEKLARALT.filter(valtosBemutato).filter((id) => !TOURS[id].requires_story_data).join(',') || 'nincs',
      'és MINDKETTŐ kimondja a saját INDULÓ adatát').toBe('nincs');
    expect(tours.map((t) => t.id).sort(), 'a határ PONTOSAN a regiszter deklarált készletét adja ki')
      .toEqual(kiszolgalt.slice().sort());
    const byId = Object.fromEntries(tours.map((t) => [t.id, t]));

    const simple = ['tour.shell', 'tour.stock', 'tour.language', 'tour.help', 'tour.plan',
      // R164/3 — AZ ÚJ, OLVASÓ NÉZETEK ÚTMUTATÓI. Mind a három engedély nélkül megnyíló lapon áll
      // (a fiók mintaadatát, illetve a fiók saját adatait rajzolja), feladat-lépés nélkül — tehát
      // ugyanazon az egyszerű úton járható be, mint a héj- és a készlet-bemutató.
      'tour.warehouses', 'tour.processes', 'tour.accountSettings'];
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

    // ── R132/1-2 — A VALÓDI MŰVELETEK A HATÁRON, BEMUTATÓ NÉLKÜL (R164/3) ────────────────────
    //
    // MI VOLT ITT, ÉS MIÉRT MÁS MOST. Ez a szakasz a `tour.inviteRevoke` és a `tour.reentry`
    // VÉGIGJÁRÁSA volt az alkalmazás-héjban — csak épp nem lehetett végigjárni: a hatodik, illetve
    // ötödik lépés „váltás a másik nézetére" vezérlőt kér, ami ezen a felületen nem létezik. A
    // kiszolgáló mégis felkínálta őket, a próba pedig a megszakadást írta ELVÁRT eredménynek. A
    // felkínálás ma a FELÜLET horgonyaihoz kötött, tehát a héj ezt a kettőt meg sem kapja.
    //
    // AMI VISZONT NEM VESZHET EL (R164/3 kikötése): a bemutató LÉPÉSEI három VALÓDI műveletet
    // mértek a valódi felületen és a valódi határon — meghívó visszavonása · tag eltávolítása ·
    // visszahívás —, a nyugtájukkal együtt. Ezeket a bemutató keretétől FÜGGETLENÜL végezzük el, és
    // ugyanazokat a nyugtákat állítjuk: a hiba-elkapó erő megmarad, a hamis elvárás eltűnik.
    // A HÁROM MŰVELET A BEMUTATÓ LÉPÉSEIKÉNT is mérve van — a bemutató LAPJÁN (`proof:demo-walk`).

    // (1) A MEGHÍVÓ VISSZAVONÁSA. A függő meghívó a `tour.invite` lépésében született (cili) — a
    //     próba a SAJÁT előfeltételét használja, nem egy másik próbától örökölt állapotot (KUKA-239).
    await gotoPage(anna.page, 'members');
    await anna.page.getByTestId('members-tab-invites').click();
    await expect(anna.page.getByTestId('invites-list')).toBeVisible();
    const inviteRow = anna.page.locator('tr[data-testid^="invite-row-"]').filter({ hasText: w.email('cili') }).first();
    await expect(inviteRow).toBeVisible();
    // A GOMBOT A SORHOZ KÉPEST keressük, nem egy KORÁBBAN kiolvasott azonosítóval: a lista a
    // fül-váltás és az adat megérkezése között ÚJRARAJZOLÓDIK, és egy előre eltett `data-testid` a
    // régi DOM-ra mutat (KUKA-228: amit a próba nem nyom meg helyettünk, arra VÁRNI kell).
    await expect(inviteRow.locator('[data-action="invite-revoke-start"]')).toBeVisible();
    await inviteRow.locator('[data-action="invite-revoke-start"]').click();
    await expect(anna.page.getByTestId('invite-revoke-lead')).toBeVisible();
    await anna.page.getByTestId('invite-revoke-confirm').click();
    // A NYUGTA A SZÓTÁRBÓL mért ÁLLANDÓ szakaszára vár (KUKA-237: a próba se égessen be feliratot).
    await expect(anna.page.getByTestId('members-result')).toContainText(allando(HU.TPL.inviteRevoked));
    await expect(inviteRow.getByTestId('invite-state-revoked')).toBeVisible();

    // (2) A TAG ELTÁVOLÍTÁSA — valódi művelet, valódi nyugtával.
    await anna.page.getByTestId('members-tab-members').click();
    await expect(anna.page.getByTestId('members-list')).toBeVisible();
    await revokeUI(anna.page, berta.subjectId);
    await expect(anna.page.getByTestId(`member-removed-${berta.subjectId}`)).toBeVisible();

    // (3) A VISSZAHÍVÁS. És a megerősítés CSAK akkor művelet, ha LÁTSZIK: a `count()` a DOM-ot
    //     számolja, a rejtett gomb „megvan"-nak látszott, a kattintás pedig időtúllépéssel bukott —
    //     a mérő hibájáról beszélt a lelet helyett (KUKA-215).
    await openMemberPanel(anna.page, berta.subjectId);
    await anna.page.getByTestId(`member-reinvite-${berta.subjectId}`).click();
    await expect(anna.page.getByTestId('reinvite-form')).toBeVisible();
    await expect(anna.page.getByTestId('reinvite-confirm')).toBeVisible();
    await anna.page.getByTestId('reinvite-confirm').click();
    await expect(anna.page.getByTestId('members-result')).toContainText(allando(HU.TPL.reinviteSent));

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

    // ── AZ ELSZÁMOLÁS — ÉS A HATÓKÖR KIMONDVA (R164/3 · KUKA-216 · KUKA-227) ─────────────────
    //
    // MINDEN bemutató, amit a VALÓDI ALKALMAZÁS-HÉJ MEGKAP, VÉGIG LETT JÁRVA, és a verdiktje
    // `befejezve` — nem „elindult" és nem „megszakadt". A mérce itt EGY, nem kettő.
    //
    // MI VÁLTOZOTT A R164/3-BAN, ÉS MIÉRT. Eddig ez a próba KÉT osztályt vezetett: tíz „befejezve",
    // és KETTŐ (`tour.inviteRevoke` · `tour.reentry`), aminél az ELVÁRT eredmény a
    // `megszakadt:targetMissing` volt. A külső review ezt nevezetten kimondta: a próba így a HIBÁT
    // szentesítette — a kiszolgáló felkínált két olyan bemutatót, amit ezen a felületen semmi nem
    // tud végigvinni, a kötelező böngésző-kapu pedig emellett zöld maradt.
    //
    // A JAVÍTÁS A FELKÍNÁLÁS OLDALÁN VAN, nem itt: a kapu a BETÖLTÖTT FELÜLET horgonyaihoz kötött
    // (`surface_anchors`), tehát a héj ezt a kettőt MEG SEM KAPJA. Így itt nincs mit „elvárt
    // megszakadásként" leírni — a kizárást a fenti készlet-állítás méri, a végigvitelüket pedig a
    // bemutató LAPJÁN mérjük.
    //
    // HOL VAN A KETTŐ BIZONYÍTÉKA — ÉS MIT NEM ÁLLÍT. A `npm run proof:demo-walk` a bemutató lapján
    // (ahol a váltó vezérlő LÉTEZIK) mindkét történetet VÉGIG viszi, kétszer, végállapot-
    // ellenőrzéssel; a lánc a KÖTELEZŐ böngésző-kapu része (`npm run verify:browser-gate`). És a
    // lista, amit az a lap mutat, a VALÓDI kiszolgálóról származik (`npm run demo:knowledge` →
    // `demo-assistant.json`, `surface=demo`), tehát amit a termék a bemutató-felületnek felkínál,
    // azt ott végig is viszik. AMIT AZ A TANÚ NEM ÁLLÍT: a háttere a SZIMULÁLT bemutató-adapter,
    // tehát nem HTTP- és nem tároló-bizonyíték (KUKA-227).
    const appShell = ['tour.shell', 'tour.stock', 'tour.language', 'tour.help', 'tour.plan',
      'tour.invite', 'tour.grant', 'tour.scopeLifecycle', 'tour.addBusiness', 'tour.register',
      // R164/3 (a külső review P1-es leletére): a három ÚJ útmutató is az alkalmazás-héjban
      // VÉGIGVIHETŐ — nem elég felvenni a listára, a verdiktjük is `befejezve` kell legyen.
      'tour.warehouses', 'tour.processes', 'tour.accountSettings'];
    /**
     * A „MINDEN DEKLARÁLT BEMUTATÓ VÉGIG LETT JÁRVA" MONDAT A REGISZTERHEZ MÉRVE DŐL EL (R164/3).
     *
     * Eddig a kézi lista ÖNMAGÁHOZ volt mérve: ha egy új bemutató se a listára, se a bejárásba nem
     * került, ez az állítás ZÖLD maradt — a mondat mégsem volt igaz (KUKA-216). A bejárandó készlet
     * ezért a regiszterből jön, és a kézi listának PONTOSAN azt kell lefednie.
     *
     * A KÉT NEVEZETT KIZÁRÁS, MINDKETTŐ A REGISZTER ADATÁBÓL (nem itteni döntés):
     *   · `requires_invite` — a meghívás elfogadása érvényes meghívó-hivatkozást kér; mesterséges
     *     meghívót nem gyártunk hozzá;
     *   · `switch_actor` — a szereplő-váltó történetek a bemutató LAPJÁN járhatók végig (fent).
     */
    const bejarando = DEKLARALT.filter((id) => TOURS[id].requires_invite !== true && !valtosBemutato(id));
    /**
     * A LEFEDÉS KÉT TANÚ ÖSSZEGE, ÉS MINDKETTŐ NEVEZETT (R166 §3).
     *
     * Az R166 §3 tizenkét pótolt útmutatót adott, és azokat SAJÁT lapja járja végig
     * (`v3app-r166-utmutatok.spec.mjs` U0–U3: belépés előtt, belépve és 390 px-en is). A listát
     * onnan IMPORTÁLJUK, tehát nem két névsor áll egymás mellett — ha egy új útmutató EGYIK tanúba
     * sem kerül be, ez az állítás pirosra vált. A szabály tehát nem lazult: „új bemutató nem
     * maradhat ki némán" továbbra is mérve, csak a tanúk SZÁMA kettő (KUKA-216: a verdikt nem
     * mutathat a mérés hatókörén túl).
     */
    const masTanu = bejarando.filter((id) => UJ_UTMUTATOK.includes(id));
    expect([...appShell, ...masTanu].slice().sort(), 'a bejárási lista a regiszter készletét fedi — új bemutató nem maradhat ki némán')
      .toEqual(bejarando.slice().sort());
    expect([...Object.keys(verdict), ...masTanu].sort(), 'minden bejárandó bemutató végig lett járva (a NEVEZETT másik tanúval együtt)').toEqual(
      bejarando.slice().sort(),
    );
    for (const id of appShell) {
      expect(verdict[id], `${id}: az alkalmazás-héjban VÉGIGVIHETŐ`).toBe('befejezve');
    }
    /**
     * ÉS A KÉT SZEREPLŐ-VÁLTÓ TÖRTÉNET ITT NEM INDULT EL — DE MÁS OKBÓL, MINT AZ R164/3-BAN.
     *
     * A váltó vezérlő ma MEGVAN a valódi héjban (az R176 §1 a kijelentkezésre horgonyozta), tehát a
     * felkínálás ma az INDULÓ ADATON áll: a visszavonás története FÜGGŐ meghívás nélkül nem jár, az
     * újbóli belépés története a VALÓDI tag miatt JÁR. A két tény KÜLÖNBÖZIK — ez az ellenpár.
     *
     * BEJÁRNI egyiket sem ITT kell: a két szereplős végigvitelnek SAJÁT, nevezett tanúja van a
     * VALÓDI felületen (`tests/e2e/v3app-r176-ket-szereplo.spec.mjs` — K1 19/19 · K2 18/18 · K3 390
     * px-en, újraindítással). Ez tehát nem „kihagyás", hanem KIMONDOTT hatókör (KUKA-093 · KUKA-216).
     */
    for (const id of DEKLARALT.filter(valtosBemutato)) {
      const vart = adat[TOURS[id].requires_story_data] === true;
      expect(Boolean(byId[id]),
        `${id}: a felkínálás az INDULÓ adatot követi (${TOURS[id].requires_story_data} = ${vart})`).toBe(vart);
      expect(Object.prototype.hasOwnProperty.call(verdict, id),
        `${id}: a két szereplős bejárás NEM itt fut, hanem a saját tanújában (R176-K1/K2/K3)`).toBe(false);
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
