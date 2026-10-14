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
import { World, createWorkspaceUI, gotoPage, withResponse } from './helpers.mjs';
import { TOURS } from '../../v3app/knowledge/features.mjs';
import { dictFor } from '../../v3app/public/i18n/dict.mjs';
import { UJ_UTMUTATOK } from './r166Tours.mjs';
// A BEJÁRÓ KÖZÖS OTTHONBÓL (`tourWalk.mjs`) — a minta-kapu viselkedés-őre UGYANEZT futtatja (KUKA-003).
import { closeModals, startTourViaHelp, walkTour, walkOutcome, walkReport, WALK_OK } from './tourWalk.mjs';

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
  const jelentes = []; const nemTeljes = [];
  for (const t of nyilvanos) {
    // MINDEN ÚTMUTATÓ A SAJÁT KIINDULÓ KÉPERNYŐJÉRŐL indul — a felhasználó is a belépési lapról
    // kezd, nem egy előző bejárás végállapotából (KUKA-120: a próba ne a saját maradékát mérje).
    await c.page.goto('/');
    await expect(c.page.getByTestId('login-email')).toBeVisible();
    const elindult = await startTourViaHelp(c.page, t);
    // A NEM INDULÓ IS BUKÁS, ÉS A SAJÁT SORÁN LÁTSZIK (`KUKA-443` saját lelet a javításon: a
    // `walkOutcome` csak a BEJÁRÁST olvassa, tehát a nem induló útmutatót külön kell beírni — a
    // régi `/OK$/` minta ezt még „véletlenül" elkapta, az új verdikt nem).
    if (elindult !== true) {
      const sor = `${t}: NEM indult el — ${elindult && elindult.nemIndult ? elindult.nemIndult : 'a súgó nem kínálta fel'}`;
      jelentes.push(sor); nemTeljes.push(sor); continue;
    }
    const r = await walkTour(c.page, t);
    const sor = walkReport(t, r);
    jelentes.push(sor);
    if (walkOutcome(r) !== WALK_OK) nemTeljes.push(sor);
    await c.page.getByTestId('tour-exit').click();
  }
  // A VERDIKT A MÉRÉSBŐL JÖN, NEM A SZÖVEGBŐL (`KUKA-443`): a `walkOutcome` dönt, nem egy
  // `/OK$/` minta a jelentés-soron — és a TELJES bejárás a követelmény (az R166 §3 ezt kérte).
  expect(nemTeljes.join(' | ') || 'mind rendben',
    `a nyilvános útmutatók végigvihetők — mérve: ${jelentes.join(' | ')}`).toBe('mind rendben');
});

test('R166-U2 — a BELÉPETT nézetben felkínált útmutatók végigvihetők', async () => {
  const belepett = UJ_UTMUTATOK.filter((t) => KOZONSEG(t) === 'signed_in');
  expect(belepett.length).toBeGreaterThan(0);
  const jelentes = []; const nemTeljes = [];
  for (const t of belepett) {
    // A SEGÉD útmutatója NYITVA hagyja a súgó-panelt (a célja ott van) — a következő útmutató előtt
    // a felhasználó is becsukja. Modális panel mellett a menü nem kattintható, és a próba a saját
    // maradékát mérné (KUKA-120).
    if (await anna.page.getByTestId('tour-exit').count()) await anna.page.getByTestId('tour-exit').click();
    await closeModals(anna.page);
    await gotoPage(anna.page, 'overview');
    const elindult = await startTourViaHelp(anna.page, t);
    if (elindult !== true) {
      const sor = `${t}: NEM indult el — ${elindult && elindult.nemIndult ? elindult.nemIndult : 'a súgó nem kínálta fel'}`;
      jelentes.push(sor); nemTeljes.push(sor); continue;
    }
    const r = await walkTour(anna.page, t);
    const sor = walkReport(t, r);
    jelentes.push(sor);
    if (walkOutcome(r) !== WALK_OK) nemTeljes.push(sor);
    if (await anna.page.getByTestId('tour-exit').count()) await anna.page.getByTestId('tour-exit').click();
  }
  expect(nemTeljes.join(' | ') || 'mind rendben',
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
  expect(walkOutcome(r) === WALK_OK ? 'végigvihető' : walkReport(t, r),
    `390 px: ${t} VÉGIG bejárható — a verdikt a mérésből (KUKA-443)`).toBe('végigvihető');
});

/**
 * R166-U5 — A VERDIKT-OLVASÓ ELLENPRÓBÁJA (R176, külső review P2 · `KUKA-443`).
 *
 * MIÉRT PRÓBA, NEM FORRÁS-PIN (`KUKA-207`): a hamis `OK`-ot nem a forrás ALAKJA okozta, hanem az,
 * hogy a jelentés-sor a REGISZTER számát írta ki a MÉRÉS száma helyett. Ezt csak úgy lehet
 * igazolni, hogy a próba MEGHÍVJA a verdikt-olvasót — ugyanazt a fájlt, amit a három bejárás is
 * használ. A böngészőre itt nincs szükség: a hiba a verdiktben volt, nem a lapon.
 *
 * ÉS A HATÓKÖR KIMONDVA (`KUKA-216`): a lelet MA lappangó — a pótolt tizenkettő közül egy lépés sem
 * deklarál `task`-ot —, tehát ez a próba a CSAPDÁT zárja be, nem egy mai hamis zöldet szüntet meg.
 */
test('R166-U5 — a task-on megálló bejárás NEM olvasható „végig bejárt"-ként (a verdikt a mérésből jön)', async () => {
  const teljes = { bajok: [], lepes: 3, elert: 3, taskStop: null };
  const taskon = { bajok: [], lepes: 5, elert: 2, taskStop: 's2 (invite.created)' };
  const szakadt = { bajok: ['s2: NEVEZETT megszakítás — a cél nem látható'], lepes: 5, elert: 2, taskStop: null };
  const csonka = { bajok: [], lepes: 5, elert: 2, taskStop: null };   // kevesebb lépés, NEVEZETT ok nélkül

  expect(walkOutcome(teljes), 'a végigvitt bejárás OK').toBe(WALK_OK);
  expect(walkOutcome(taskon), 'a task-on megálló bejárás NEM OK').not.toBe(WALK_OK);
  expect(walkOutcome(szakadt), 'a nevezetten megszakadt bejárás NEM OK').not.toBe(WALK_OK);
  expect(walkOutcome(csonka), 'a nevezett ok NÉLKÜL csonka bejárás sem OK').not.toBe(WALK_OK);

  // A JELENTÉS-SOR SEM MONDHAT TÖBBET, MINT AMIT MÉRT: a régi alak itt `5/5 OK`-ot írt volna.
  const sorTaskon = walkReport('tour.proba', taskon);
  expect(sorTaskon.includes('5/5'), `a task-on megálló sor NEM írhat 5/5-öt — mérve: „${sorTaskon}”`).toBe(false);
  expect(/ OK$/.test(sorTaskon), `a task-on megálló sor NEM végződhet OK-ra — mérve: „${sorTaskon}”`).toBe(false);
  expect(sorTaskon.includes('2/5'), `a sor a MÉRT 2/5-öt írja — mérve: „${sorTaskon}”`).toBe(true);
  expect(walkReport('tour.proba', teljes), 'a végigvitt sor a mért számot írja').toBe('tour.proba: 3/3 OK');

  /**
   * ÉS A FELADAT UTÁNI HIBA SEM OLVASHATÓ TELJESNEK (R186 §1).
   *
   * Ez a verdikt-olvasó SZERZŐDÉSE arra az esetre, amit a `perform`-os bejárás nyitott meg: a
   * feladat IGAZOLTAN elvégződött (`elvegzett`), a mérés viszont egy KÉSŐBBI lépésen bukott. Az
   * ÉLŐ tanú erre az `R166-U7` (a böngészőben, vezérelt hibával) — ez itt a szerződés.
   */
  const feladatUtan = { bajok: ['s6: a buborék „”, a csomag szerint „Levél”'], lepes: 6, elert: 5,
    taskStop: null, elvegzett: ['s5 (invite.created)'] };
  expect(walkOutcome(feladatUtan), 'a feladat UTÁNI hiba NEM OK').not.toBe(WALK_OK);
  const sorFeladatUtan = walkReport('tour.proba', feladatUtan);
  expect(sorFeladatUtan.includes('6/6'),
    `a feladat utáni hibánál a sor NEM írhat 6/6-ot — mérve: „${sorFeladatUtan}”`).toBe(false);

  // ÉS A MAI HATÓKÖR MÉRVE: ezért állíthatja a fenti két bejárás a TELJES végigvitelt.
  const taskosak = UJ_UTMUTATOK.filter((t) => TOURS[t]
    && TOURS[t].steps.some((l) => l.task !== null && l.task !== undefined));
  expect(taskosak.join(' · ') || 'egyik sem',
    'a pótolt tizenkettő közül MA egyik sem vár a felhasználó műveletére — a lelet lappangó volt').toBe('egyik sem');
});


/**
 * ════════════════════════════════════════════════════════════════════════════════════════════════
 * R166-U6 · U7 — A FELADAT UTÁNI LÉPÉSEK MÉRÉSE, ÉS AZ ELLENPRÓBA RÁ (R186 §1)
 * ════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * AMIT AZ R186 §1 KÉRT, ÉS AMI EDDIG NEM VOLT MEG. Az `R166-U5` azt bizonyítja, hogy a `task`-on
 * MEGÁLLÓ bejárás nem olvasható teljesnek. Azt NEM bizonyítja, hogy egy feladat UTÁNI hibát a
 * teljes bejárást állító mérés elkapna — mert a bejáró a feladatot EL SEM TUDTA VÉGEZNI, tehát a
 * feladat utáni lépésekről semmit nem mért. Az R186 §1 szó szerint ezt a kettőt kéri:
 * *„a teljes bejárásként számolt történetnél valódi művelet után MINDEN későbbi lépést is mérj"*,
 * és *„célzott ellenpróba bizonyítsa, hogy az ELSŐ FELADAT UTÁNI hibát is észleli"* a mérés.
 *
 * EZ A KETTŐ EGY PÁR, ÉS CSAK EGYÜTT BIZONYÍT (`KUKA-051` · `KUKA-089`: az őr tüzelését MÉRNI kell).
 *   · U6 (POZITÍV): a bejárás a `tour.invite` ötödik lépésén VALÓDI meghívót állít ki, a lap
 *     igazolja a feladatot, és a mérés a HATODIK lépésig megy — `6/6`, nevezett művelettel.
 *   · U7 (ELLENPRÓBA): ugyanaz a bejárás, ugyanazzal a valódi művelettel, de a feladat UTÁNI lépés
 *     célját VEZÉRELTEN elvesszük. A mérésnek PIROSAT kell adnia — ha zöldet adna, akkor a
 *     „teljes bejárás" állítás egy nem mért lépést takarna (`KUKA-206` · `KUKA-216`).
 *
 * MIÉRT A `tour.invite`-on. Ez a legrövidebb útmutató, amiben a feladat UTÁN is van lépés
 * (`s5: invite-submit · task: invite.created` → `s6: invite-mail-open`), tehát pontosan az a
 * szerkezet, amit a lelet megnevez — és a művelete valódi HTTP-n megy (`POST /api/invites`).
 */

/** A VALÓDI MŰVELET az `s5`-ön: a néző kitölti és elküldi a meghívást. A siker a SZERVER válasza. */
function meghivoKiallitasa(email) {
  return async ({ page }) => {
    await page.getByTestId('invite-email').fill(email);
    await page.getByTestId('invite-role').selectOption('user');
    await page.getByTestId('invite-scope').selectOption('keszlet');
    const r = await withResponse(page, { path: '/api/invites' },
      () => page.getByTestId('invite-submit').click());
    // A MŰVELET BUKÁSA NEVEZETT TÉNY, nem időtúllépés (`KUKA-215`): a bejáró ezt `bajok`-ként kapja.
    expect(r.body && r.body.ok, `a meghívó kiállítása a szerveren sikerült — kapott: ${JSON.stringify(r.body)}`).toBe(true);
  };
}

test('R166-U6 — a bejárás ELVÉGZI a feladatot, és a feladat UTÁNI lépést is MÉRI (6/6, nevezett művelettel)', async () => {
  if (await anna.page.getByTestId('tour-exit').count()) await anna.page.getByTestId('tour-exit').click();
  await closeModals(anna.page);
  await gotoPage(anna.page, 'overview');
  const t = 'tour.invite';
  const elindult = await startTourViaHelp(anna.page, t);
  expect(elindult === true ? 'elindult' : `NEM indult el — ${elindult && elindult.nemIndult ? elindult.nemIndult : 'a súgó nem kínálta fel'}`,
    'a meghívás útmutatója a valódi úton elindul').toBe('elindult');

  const r = await walkTour(anna.page, t, { perform: { s5: meghivoKiallitasa('u6.cimzett@pelda.hu') } });
  const sor = walkReport(t, r);

  // 1. A VERDIKT TELJES — és a szám a MÉRÉSBŐL jön, nem a regiszterből.
  expect(walkOutcome(r) === WALK_OK ? 'teljes' : sor,
    `a feladat elvégzése után a bejárás VÉGIG megy — mérve: ${sor}`).toBe('teljes');
  expect(r.elert, 'a mérés a HATODIK lépésig jutott').toBe(TOURS[t].steps.length);

  // 2. ÉS A SOR KIMONDJA, HOGY VALÓDI MŰVELET TÖRTÉNT — különben a „6/6 OK" nem volna visszakereshető.
  expect((r.elvegzett || []).join(' · '), 'az elvégzett valódi művelet nevezetten látszik').toBe('s5 (invite.created)');
  expect(sor.includes('elvégezve: s5 (invite.created)'), `a jelentés-sor megnevezi a műveletet — mérve: „${sor}”`).toBe(true);

  if (await anna.page.getByTestId('tour-exit').count()) await anna.page.getByTestId('tour-exit').click();
});

test('R166-U7 — ELLENPRÓBA: az ELSŐ FELADAT UTÁNI hibát a teljes bejárást állító mérés ÉSZLELI', async () => {
  if (await anna.page.getByTestId('tour-exit').count()) await anna.page.getByTestId('tour-exit').click();
  await closeModals(anna.page);
  await gotoPage(anna.page, 'overview');
  const t = 'tour.invite';
  const elindult = await startTourViaHelp(anna.page, t);
  expect(elindult === true ? 'elindult' : 'NEM indult el', 'az ellenpróba ugyanazon az úton indul').toBe('elindult');

  /**
   * A VEZÉRELT HIBA: a feladat UTÁNI lépés célját elvesszük — a művelet UTÁN, tehát a hiba
   * bizonyítottan az ELSŐ FELADAT UTÁN keletkezik (`KUKA-207`: a viselkedést mérjük, nem a forrást).
   * Ez nem a termék hibája: ez a MÉRŐESZKÖZ ellenpróbája, a próba saját, vezérelt állapotán.
   */
  const muveletUtanElvesszukACelt = async (ctx) => {
    await meghivoKiallitasa('u7.cimzett@pelda.hu')(ctx);
    await ctx.page.getByTestId('invite-mail-open').first().waitFor({ state: 'visible', timeout: 8000 });
    /**
     * A HIBA TARTÓS, ÉS EZ SZÁNDÉKOS. Egy `el.remove()` csak a MAI rajzolást érintené: a lap
     * újrarajzolása (vagy a bejáró feltáró-kattintása) visszahozná a vezérlőt, és az ellenpróba a
     * SAJÁT törlését mérné, nem a mérőeszközt (`KUKA-127`). A stíluslap a RAJZOLÁSOKON ÁT megmarad,
     * tehát a lépés célja az ellenpróba végéig LÁTHATATLAN — pontosan az az állapot, amire a motor
     * `isShown` döntése szól: a vezérlő OTT VAN, de a néző nem látja.
     */
    await ctx.page.addStyleTag({ content: '[data-testid="invite-mail-open"] { display: none !important; }' });
    await expect(ctx.page.getByTestId('invite-mail-open').first()).toBeHidden();
  };

  const r = await walkTour(anna.page, t, { perform: { s5: muveletUtanElvesszukACelt } });
  const sor = walkReport(t, r);

  // 1. A MÉRÉS NEM MONDHATJA TELJESNEK — ez az ellenpróba lényege.
  expect(walkOutcome(r), `a feladat UTÁNI hiba mellett a verdikt NEM lehet OK — mérve: ${sor}`).not.toBe(WALK_OK);
  // 2. ÉS A SZÁM SEM MONDHAT 6/6-OT (a régi alak a `break` után is a regiszter hosszát adta vissza).
  expect(sor.includes('6/6'), `a megszakadt bejárás NEM írhat 6/6-ot — mérve: „${sor}”`).toBe(false);
  // 3. A FELADAT VISZONT IGAZOLTAN ELVÉGZŐDÖTT — tehát a hiba tényleg a feladat UTÁN van,
  //    nem a feladat elvégezhetetlensége (`KUKA-049`: a nem tudott nem „nem történt meg").
  expect((r.elvegzett || []).join(' · '), 'a feladat az ellenpróbában is elvégződött').toBe('s5 (invite.created)');
  // 4. ÉS A HATODIK LÉPÉS NEVEZETTEN LÁTSZIK a bajok között — nem csendes kihagyásként.
  expect((r.bajok || []).join(' · ').includes('s6'),
    `a hatodik lépés NEVEZETTEN bukik — mérve: ${(r.bajok || []).join(' · ') || '(nincs baj)'}`
    + ` · napló: ${(r.naplo || []).join(' | ')}`).toBe(true);

  if (await anna.page.getByTestId('tour-exit').count()) await anna.page.getByTestId('tour-exit').click();
});
