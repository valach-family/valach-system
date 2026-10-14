// tests/e2e/v3app-r204-kontextus.spec.mjs — A KÉSŐ VÁLASZ ÉS A SZEMÉLYVÁLTÁS KÖZÖS HATÁRA
// (R204 → R206: a vezérelt eseménysor és a SORRENDVÉDELEM).
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
// üzleti választ a VALÓDI szerver ad (`route.fetch()` · `route.fallback()`); a próba csak a
// MEGÉRKEZÉS idejét és egy OLVASÓ kérés elvesztését vezérli — kitalált siker nincs (KUKA-220: a
// böngésző kivétele nem bizonyít írás-mentességet, ezért az írás válaszát nem hamisítjuk, csak
// visszatartjuk).
//
// ══ AMIT AZ R206 ÁTÍRT EBBEN A LAPBAN (F206-03, a külső ellenőrző fél lelete) ══════════════════
//
// A LELET AZ R204-ES ALAKOMRÓL, FORRÁSBÓL IGAZOLVA: a próba HIÁNYZÓ FELÜLETTEL IS zöld lehetett.
//   · a rögzítő a hiányzó fejléc-elemre `'(nincs fejléc-elem)'` szöveget adott, ami TELJESÍTI a
//     `not.toBe(carl.email)` állítást — vagyis a felület eltűnése „helyes állapotnak" mérődött;
//   · a sikerre vonatkozó állítás CSAK akkor futott, ha volt látható értesítő elem;
//   · a felhasználónak megígért HARMADIK állapotot és a MŰKÖDŐ folytatást semmi nem mérte.
//
// MOSTANTÓL: a szabály EGY függvényben áll (`nemIgazoltHianyok`), és a próba meg az ELLENPRÓBA
// UGYANAZT a függvényt hívja (KUKA-207 · KUKA-239: a fájl nem a függvény). A kötelező elemek
// hiánya és az eltüntetett állapot-üzenet NEVEZETT hiba, nem hallgatás — és ezt a lap a saját
// ellenpróbáival bizonyítja, a többperces böngésző-lánc ismétlése nélkül.
import { test, expect } from '@playwright/test';
import { World, inviteUI, openInviteUI, createWorkspaceUI, logoutUI, openSwitcher,
  ensureMemberRow, withResponse, PASSWORD } from './helpers.mjs';
import { dictFor } from '../../v3app/public/i18n/dict.mjs';

test.describe.configure({ mode: 'serial' });

const TOUR_ID = 'tour.inviteAccept';
const taxOf = (tag, n = 0) => `${String(tag.replace(/\D/g, '') + '00').slice(0, 2)}${n}45671-2-42`;
/** A sablon fix (helyőrző előtti) része — a próba nem ég be feliratot (KUKA-237). */
const fix = (s) => String(s).split('{')[0].trim();

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

/**
 * AZ `/api/me` VÁLASZAINAK SORREND-VEZÉRLŐJE (R206 — F206-02).
 *
 * MIT VEZÉREL: hogy egy OLVASÓ kérés mikor érkezik meg, illetve hogy elveszik-e. MIT NEM: a
 * válasz TARTALMÁT — azt a valódi szerver adja (`route.fallback()`), a próba nem írja át.
 *
 * MIÉRT KELL. A `superseded` eredmény csak ÚGY áll elő, ha egy RÉGEBBI frissítés még útban van,
 * amikor egy ÚJABB elindul. Ez a vezérlő pontosan ezt a két sorrendet állítja elő — és a kettőt
 * KÜLÖN: „az újabb MÁR alkalmazta" és „az újabb MÉG függőben van" nem ugyanaz az állapot
 * (KUKA-012: az üres és az elérhetetlen sem ugyanaz).
 */
async function meControl(page) {
  const held = [];
  let hold = 0;
  let abort = 0;
  await page.route('**/api/me', async (route) => {
    if (abort > 0) { abort -= 1; await route.abort('failed'); return; }
    if (hold > 0) {
      hold -= 1;
      let release;
      const gate = new Promise((r) => { release = r; });
      held.push({ release, done: false });
      await gate;
    }
    await route.fallback();
  });
  return {
    holdNext(n = 1) { hold += n; },
    abortNext(n = 1) { abort += n; },
    get heldCount() { return held.filter((h) => !h.done).length; },
    async waitHeld(n) {
      await expect.poll(() => held.length, { message: `${n} visszatartott /api/me kérés` }).toBeGreaterThanOrEqual(n);
    },
    release(i = 0) { const h = held[i]; if (h && !h.done) { h.done = true; h.release(); } },
  };
}

/**
 * A TELJES FELHASZNÁLÓI ÁLLAPOT MÉRÉSE — EGY HELYEN, ÉS A HIÁNY IS MÉRT ÉRTÉK.
 *
 * A `null` itt azt jelenti: AZ ELEM NINCS A LAPON. Ezt SOHA nem cseréljük magyarázó szövegre —
 * pontosan az volt az R204-es alakom hibája, hogy a hiányt egy mondattal pótolta, és a mondat
 * aztán teljesítette az állítást (F206-03).
 */
async function merdAllapotot(page) {
  const txt = async (tid) => {
    const l = page.getByTestId(tid);
    return (await l.count()) ? ((await l.textContent()) || '').trim() : null;
  };
  const latszik = async (tid) => {
    const l = page.getByTestId(tid);
    return (await l.count()) ? l.isVisible() : false;
  };
  const redeem = page.getByTestId('invite-redeem');
  return {
    fejlecSzemely: await txt('header-subject'),
    fejlecFiok: await txt('header-workspace'),
    monogram: await txt('avatar'),
    kinevebenSr: await txt('header-acting-as'),
    csatornaSr: await txt('channel-proven'),
    valasztoLatszik: await latszik('account-switcher'),
    profilLatszik: await latszik('profile'),
    fiokLista: await txt('ws-list'),
    profilMenu: await txt('profile-menu'),
    folytatasLatszik: await latszik('ctx-recheck'),
    folytatasFelirat: await txt('ctx-recheck'),
    kartyaSor: await txt('invite-redeem-result'),
    kartyaLatszik: await latszik('invite-redeem-result'),
    ertesito: await txt('global-notice'),
    ertesitoLatszik: await latszik('global-notice'),
    bevaltasTiltott: (await redeem.count()) ? await redeem.isDisabled() : null,
    utmutatoMegallas: await txt('tour-aborted'),
    utmutatoOka: (await page.getByTestId('tour-aborted').count())
      ? await page.getByTestId('tour-aborted').getAttribute('data-why') : null,
    lathatoHorgonyok: await page.evaluate(() => [...document.querySelectorAll('[data-testid]')]
      .filter((x) => x.offsetParent !== null).map((x) => x.getAttribute('data-testid')).slice(0, 40)),
  };
}

/** A NEM IGAZOLT ÁLLAPOT KÖTELEZŐ ELEMEI: ami nincs a lapon, az nem mérhető „rendben"-nek. */
const KOTELEZO = Object.freeze({
  fejlecSzemely: 'header-subject',
  fejlecFiok: 'header-workspace',
  monogram: 'avatar',
  kinevebenSr: 'header-acting-as',
  csatornaSr: 'channel-proven',
  folytatasFelirat: 'ctx-recheck',
});

/**
 * A SZABÁLY: MIT KELL LÁTNIA A FELHASZNÁLÓNAK, HA A LAP NEM TUDJA, KI ÜL A GÉPNÉL (R206 — F206-01).
 *
 * TISZTA FÜGGVÉNY a MÉRT állapoton — ezért ugyanez a szabály dönt a próbában és az ELLENPRÓBÁBAN
 * is (KUKA-207). Nevezett hiányok listáját adja; az üres lista a zöld.
 */
function nemIgazoltHianyok(s, { D, regiEmail, utmutatoVolt = false }) {
  const h = [];
  for (const [kulcs, tid] of Object.entries(KOTELEZO)) {
    if (s[kulcs] === null || s[kulcs] === undefined) h.push(`hiányzó kötelező elem: ${tid}`);
  }
  // 1. A HARMADIK ÁLLAPOT KI VAN MONDVA — a látható fejlécben és a képernyőolvasónak szánt sorban is.
  if (s.fejlecSzemely !== null && s.fejlecSzemely !== D.UI.contextUnconfirmedShort) {
    h.push(`a fejléc személy-sora nem a nem igazolt állapotot mondja: „${s.fejlecSzemely}”`);
  }
  if (s.fejlecFiok !== null && s.fejlecFiok !== D.UI.contextUnconfirmedShort) {
    h.push(`a fejléc fiók-sora nem a nem igazolt állapotot mondja: „${s.fejlecFiok}”`);
  }
  if (s.monogram !== null && s.monogram !== '?') h.push(`a monogram a régi emberé: „${s.monogram}”`);
  if (s.kinevebenSr !== null && s.kinevebenSr !== D.UI.contextUnconfirmedActing) {
    h.push(`a képernyőolvasónak szánt „ki nevében" sor nem a nem igazolt állapotot mondja: „${s.kinevebenSr}”`);
  }
  if (s.csatornaSr !== null && s.csatornaSr !== '—') h.push(`a cím-megerősítés a régi emberé: „${s.csatornaSr}”`);
  // 2. A RÉGI SZEMÉLY SEHOL NEM ÁLL AKTUÁLISKÉNT (a SPEC §2: se a profilban, se a választóban,
  //    se a képernyőolvasónak szánt szövegben).
  for (const [kulcs, mit] of [['fejlecSzemely', 'a fejlécben'], ['kinevebenSr', 'a „ki nevében" sorban'],
    ['fiokLista', 'a fiókválasztó listájában'], ['profilMenu', 'a profilmenüben'], ['kartyaSor', 'a kártya sorában']]) {
    if (typeof s[kulcs] === 'string' && regiEmail && s[kulcs].includes(regiEmail)) {
      h.push(`a régi személy ${mit} még aktuálisként áll`);
    }
  }
  if (s.valasztoLatszik) h.push('a fiókválasztó a régi fiókokat kínálja egy nem igazolt nézetben');
  if (s.profilLatszik) h.push('a profil a régi személyt kínálja egy nem igazolt nézetben');
  // 3. A MŰKÖDŐ FOLYTATÁS LÁTSZIK, ÉS AZ A FELIRATA, AMIT A NYELVCSOMAG AD (KUKA-201 · SZO-01).
  if (!s.folytatasLatszik) h.push('a nem igazolt állapotnak nincs LÁTHATÓ folytatása (ctx-recheck)');
  if (s.folytatasFelirat !== null && s.folytatasFelirat !== D.UI.contextRecheck) {
    h.push(`a folytatás felirata nem a nyelvcsomagból jön: „${s.folytatasFelirat}”`);
  }
  /**
   * 4. AZ ÁLLAPOT ÜZENETE OTT ÁLL, AHOL A FELHASZNÁLÓ ÁLL — ÉS LÁTSZIK.
   *
   * A HELY KÉT KÉPERNYŐN KÉT ELEM, és ezt MÉRJÜK, nem feltételezzük: a meghívó-képernyőn a kártya
   * saját sora (`invite-redeem-result`) van a lapon, a héjban a közös értesítő (`global-notice`) —
   * a másik ilyenkor nem is létezik. Pontosan ez nyelte el az R204 előtti alakban a `notice()`
   * üzenetét NÉMÁN; a szabály ezért azt kéri, hogy a mondat LEGALÁBB EGY látható helyen ott
   * legyen, és a helyet NEVEZZE meg a hiány (KUKA-012: a hiány nem lehet néma).
   */
  const uzenetHelyek = [['invite-redeem-result', s.kartyaLatszik, s.kartyaSor],
    ['global-notice', s.ertesitoLatszik, s.ertesito]];
  const latszo = uzenetHelyek.filter(([, latszik]) => latszik === true);
  if (!latszo.length) {
    h.push('az állapot üzenete nem látszik ott, ahol a felhasználó áll '
      + `(${uzenetHelyek.map(([tid]) => tid).join(' / ')})`);
  } else if (!latszo.some(([, , szoveg]) => szoveg === D.UI.inviteAcceptedUnconfirmed)) {
    h.push('a látható állapot-üzenet nem a nem igazolt elfogadás mondata: '
      + latszo.map(([tid, , szoveg]) => `${tid}: „${szoveg}”`).join(' | '));
  }
  // 5. A RÉGI MŰVELET NEM KÜLDHETŐ BE ÚJRA (a SPEC §2).
  if (s.bevaltasTiltott === false) h.push('a beváltás gombja újra beküldhető egy nem igazolt nézetben');
  // 6. A BEMUTATÓ EREDMÉNYE SEM SZÁLL ÁT: a futás NEVEZETT indokkal állt meg.
  if (utmutatoVolt) {
    if (s.utmutatoOka !== 'contextUnconfirmed') h.push(`a bemutató nem a nem igazolt kontextussal állt meg: ${s.utmutatoOka}`);
    if (s.utmutatoMegallas !== null && s.utmutatoMegallas !== D.TOURUI.contextUnconfirmed) {
      h.push(`a bemutató megállásának mondata nem a nyelvcsomagból jön: „${s.utmutatoMegallas}”`);
    }
  }
  return h;
}

test.describe('R204/R206 — a késő válasz, a személyváltás és a sorrend közös határa', () => {
  let w; let anna; let biz;

  test.beforeAll(async ({ browser }) => {
    w = new World(browser, `r204-${Date.now().toString(36)}`);
    anna = await w.person('anna');
    biz = await createWorkspaceUI(anna.page, { name: 'R204 Kft', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag) } });
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
   * MIT ÁLLÍT (R206 — F206-01/F206-03): a felhasználó a VÁLASZTOTT képernyőn a HARMADIK állapotot
   * látja, egyetlen következetes jelentéssel és MŰKÖDŐ folytatással; a régi ember sehol nem áll
   * aktuálisként; a régi művelet nem küldhető be újra; a folytatás megnyomása után a VALÓS személy,
   * fiók, nézet és értesítés EGYÜTT áll helyre; a tagság szerveroldali helyessége változatlan.
   */
  test('R204-K1 — a KÉSŐ beváltás + elvesztett frissítés: nem igazolt állapot, működő folytatással, és helyreállás', async () => {
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
    const me = await meControl(carl.page);
    me.abortNext(1);

    // (4) A KÉSŐ VÁLASZ MEGÉRKEZIK Carl régi lapjára.
    release();
    await answered;
    await carl.page.unroute('**/api/invites/redeem');

    // (5) A MÉRÉS — ELŐBB A SZERVER IGAZSÁGA: a munkamenet DÓRÁÉ.
    const szerver = (await carl.api.get('/api/me')).body;
    expect(szerver.subject_id, 'a kiszolgáló szerint Dóra ül a lapnál').toBe(dora.subjectId);

    // (5/a) A LAP ÁLLAPOTA — a TELJES előírt állapot, nem csak a rossz mondat hiánya (F206-03).
    await expect(carl.page.getByTestId('ctx-recheck')).toBeVisible();
    const s = await merdAllapotot(carl.page);
    const hianyok = nemIgazoltHianyok(s, { D, regiEmail: carl.email, utmutatoVolt: true });
    expect(hianyok, `a nem igazolt állapot előírt alakja · mért állapot: ${JSON.stringify(s)}`).toEqual([]);

    // (5/b) ELLENPRÓBA 1 — ELTÜNTETETT ÁLLAPOT-ÜZENET. UGYANEZ a szabály fut rá (KUKA-239), és
    //       NEVEZETTEN pirosra vált. A mutáció VISSZAFORDÍTHATÓ: utána a zöld is visszaáll.
    await carl.page.evaluate(() => { document.querySelector('[data-testid="invite-redeem-result"]').hidden = true; });
    const e1 = nemIgazoltHianyok(await merdAllapotot(carl.page), { D, regiEmail: carl.email, utmutatoVolt: true });
    expect(e1.join(' | '), 'az eltüntetett állapot-üzenet NEVEZETT hiba')
      .toContain('az állapot üzenete nem látszik ott, ahol a felhasználó áll');
    await carl.page.evaluate(() => { document.querySelector('[data-testid="invite-redeem-result"]').hidden = false; });

    // (5/c) ELLENPRÓBA 2 — HIÁNYZÓ KÖTELEZŐ ELEM. A korábbi alakom épp ettől volt zöld.
    await carl.page.evaluate(() => {
      const el = document.querySelector('[data-testid="ctx-recheck"]');
      window.__r206 = { el, parent: el.parentNode, next: el.nextSibling };
      el.remove();
    });
    const e2 = nemIgazoltHianyok(await merdAllapotot(carl.page), { D, regiEmail: carl.email, utmutatoVolt: true });
    expect(e2.join(' | '), 'a hiányzó kötelező elem NEVEZETT hiba, nem hallgatás').toContain('hiányzó kötelező elem: ctx-recheck');
    await carl.page.evaluate(() => {
      const { el, parent, next } = window.__r206;
      parent.insertBefore(el, next); window.__r206 = null;
    });
    const vissza = nemIgazoltHianyok(await merdAllapotot(carl.page), { D, regiEmail: carl.email, utmutatoVolt: true });
    expect(vissza, 'a mutáció visszafordítása után a mérés ismét zöld').toEqual([]);

    // (6) A MŰKÖDŐ FOLYTATÁS TÉNYLEG MŰKÖDIK: a felhasználó megnyomja, és a lap HELYREÁLL.
    const frissites = carl.page.waitForResponse((r) => r.request().method() === 'GET'
      && new URL(r.url()).pathname === '/api/me');
    await carl.page.getByTestId('ctx-recheck').click();
    await frissites;

    // (6/a) A VALÓS SZEMÉLY, FIÓK, NÉZET ÉS ÉRTESÍTÉS EGYÜTT (a SPEC §2).
    await expect(carl.page.getByTestId('header-subject')).toHaveText(dora.email);
    await expect(carl.page.getByTestId('ctx-recheck')).toBeHidden();
    await expect(carl.page.getByTestId('account-switcher')).toBeVisible();
    await expect(carl.page.getByTestId('profile')).toBeVisible();
    const u = await merdAllapotot(carl.page);
    expect(u.fejlecFiok, `a fiók-sor a helyreállás után sem „nem igazolt" · ${JSON.stringify(u)}`)
      .not.toBe(D.UI.contextUnconfirmedShort);
    expect(u.ertesitoLatszik, `a helyreállás MONDATA is ott van · ${JSON.stringify(u)}`).toBe(true);
    expect(u.ertesito, 'a lap kimondja, hogy MÁS ember lépett be ebben a böngészőben').toBe(D.UI.otherPersonHere);
    // A RÉGI EMBER SEHOL — se a fejlécben, se a menükben (a profilmenü a nyitáskor is Dóráé).
    for (const [kulcs, hol] of [['fejlecSzemely', 'fejléc'], ['fiokLista', 'fiókválasztó'], ['profilMenu', 'profilmenü']]) {
      expect(String(u[kulcs] || ''), `a régi ember nem áll a ${hol}ben`).not.toContain(carl.email);
    }
    expect(String(u.profilMenu || ''), 'a profilmenü a MOSTANI embert írja ki').toContain(dora.email);

    // (6/b) A TÁROLT TÉNY VÁLTOZATLANUL HELYES: Carl lett tag, Dóra nem. Ezt a hiba sem rontotta el,
    //       és a javítás sem gyengítheti (a SPEC: „A tagság szerveroldali helyességét a javítás nem
    //       ronthatja"). A tagságot a FIÓKKEZELŐ felületén olvassuk vissza — szerver-válaszból.
    const tagsagok = (szerver.workspaces || []).map((x) => x.book_id);
    expect(tagsagok, 'Dóra NEM lett tag a meghívott fiókban').not.toContain(served.book_id);
    await ensureMemberRow(anna.page, carl.subjectId);
    expect(await anna.page.getByTestId(`member-${dora.subjectId}`).count(), 'Dóra nem tag a fiókban').toBe(0);
  });

  /**
   * R206-K2 — AZ ELAVULT FRISSÍTÉS NEM ÉRVÉNYTELENÍTHETI AZ ÚJABBAT (F206-02).
   *
   * A VEZÉRELT SORREND: (1) a beváltás frissítése útnak indul és VISSZATARTJUK; (2) a felhasználó
   * KÖZBEN fiókot nyit, aminek a frissítése MEGÉRKEZIK és ALKALMAZ; (3) a régebbi frissítés
   * ezután tér vissza — `superseded` eredménnyel.
   *
   * MIT ÁLLÍT: a régi hívó nem teheti újra bizonytalanná a már igazolt, FRISSEBB képet, és nem
   * írhatja felül a frissebb értesítést sem. A tagság ettől nem lesz kevesebb: a szerver igazsága
   * (a csatlakozott fiók) ott áll a listában.
   */
  test('R206-K2 — az ELAVULT frissítés nem teszi újra bizonytalanná a már igazolt, frissebb nézetet', async () => {
    const D = dictFor('hu');
    const elek = await w.person('elek');
    const inv = await inviteUI(anna.page, { email: elek.email, role: 'user', scope: 'keszlet' });
    expect(inv.body.ok).toBe(true);
    await openInviteUI(elek.page, inv.link);
    const sajatFiok = (await elek.api.get('/api/me')).body;
    const sajatKonyv = sajatFiok.current_book_id;
    expect(sajatKonyv, 'Eleknek van saját (személyes) fiókja, amire váltani tud').toBeTruthy();

    const me = await meControl(elek.page);
    // (1) A BEVÁLTÁS FRISSÍTÉSE ÚTBAN VAN, és VISSZATARTJUK (az írás válasza VALÓDI és megérkezik).
    me.holdNext(1);
    const bevaltas = await withResponse(elek.page, { path: '/api/invites/redeem' },
      () => elek.page.getByTestId('invite-redeem').click());
    expect(bevaltas.body.ok, 'a VALÓDI szerver fogadta el a beváltást').toBe(true);
    await me.waitHeld(1);

    // (2) KÖZBEN A FELHASZNÁLÓ FIÓKOT NYIT: EZ a frissítés megérkezik és ALKALMAZ.
    await openSwitcher(elek.page);
    const valtas = await withResponse(elek.page, { path: '/api/session/workspace' },
      () => elek.page.getByTestId(`ws-switch-${sajatKonyv}`).click());
    expect(valtas.body.ok, 'a fiók megnyitása a szerveren sikerült').toBe(true);
    await expect(elek.page.getByTestId('global-notice')).toContainText(fix(D.TPL.accountOpened));
    const igazolt = await merdAllapotot(elek.page);

    // (3) ÉS MOST TÉR VISSZA A RÉGEBBI FRISSÍTÉS — `superseded` eredménnyel.
    me.release(0);
    // A LAP SAJÁT ESEMÉNYÜTEMEZÉSÉHEZ KÖTÖTT VÁRAKOZÁS (nem fix alvás): a visszatartott válasz
    // feldolgozása után a lap vagy átírja az állapotot (ez volna a hiba), vagy nem.
    await elek.page.evaluate(() => new Promise((r) => setTimeout(() => requestAnimationFrame(() => r()), 0)));
    const utana = await merdAllapotot(elek.page);

    expect(utana.fejlecSzemely, `a fejléc nem vált újra bizonytalanra · ${JSON.stringify(utana)}`).toBe(elek.email);
    expect(utana.fejlecFiok, 'a fiók-sor sem').not.toBe(D.UI.contextUnconfirmedShort);
    expect(utana.folytatasLatszik, 'nincs mit ellenőrizni: az állapot IGAZOLT').toBe(false);
    expect(utana.valasztoLatszik && utana.profilLatszik, 'a fiókválasztó és a profil a helyén marad').toBe(true);
    expect(utana.ertesito, `a frissebb, igazolt értesítést nem írja felül a régebbi hívó · ${JSON.stringify(utana)}`)
      .toBe(igazolt.ertesito);
    expect(String(utana.kartyaSor || ''), 'a nem igazolt elfogadás mondata NEM jelenik meg')
      .not.toContain(fix(D.UI.inviteAcceptedUnconfirmed));

    // ÉS A TAGSÁG MEGVAN: a szerver igazsága szerint a csatlakozott fiók ott áll Elek listájában.
    const szerver = (await elek.api.get('/api/me')).body;
    expect((szerver.workspaces || []).map((x) => x.book_id), 'Elek tagja a meghívott fióknak')
      .toContain(bevaltas.body.book_id);
  });

  /**
   * R206-K3 — A FÜGGŐ ÚJABB FRISSÍTÉS KÜLÖN ESET (F206-02, a SPEC kikötése: „A függő újabb
   * frissítés és a valóban elérhetetlen kiszolgáló esete külön kontroll legyen").
   *
   * A VEZÉRELT SORREND: a beváltás frissítése ÉS a fiókváltás frissítése is ÚTBAN van; a RÉGEBBI
   * tér vissza előbb (`superseded`), és ekkor MÉG SEMMI nincs alkalmazva. Ilyenkor a kontextus
   * VALÓBAN nem igazolt — a lap ezt kimondja, a folytatást felkínálja —, és amint a FÜGGŐ újabb
   * frissítés megérkezik, az állapot MAGÁTÓL helyreáll: nincs végtelen várakozás, és nincs
   * második kattintás-kényszer.
   */
  test('R206-K3 — a FÜGGŐ újabb frissítés: nem igazolt állapot, majd MAGÁTÓL helyreállás', async () => {
    const D = dictFor('hu');
    const frida = await w.person('frida');
    const inv = await inviteUI(anna.page, { email: frida.email, role: 'user', scope: 'keszlet' });
    expect(inv.body.ok).toBe(true);
    await openInviteUI(frida.page, inv.link);
    const sajatKonyv = (await frida.api.get('/api/me')).body.current_book_id;

    const me = await meControl(frida.page);
    me.holdNext(2);                       // MIND A KETTŐ útban marad
    const bevaltas = await withResponse(frida.page, { path: '/api/invites/redeem' },
      () => frida.page.getByTestId('invite-redeem').click());
    expect(bevaltas.body.ok).toBe(true);
    await me.waitHeld(1);

    await openSwitcher(frida.page);
    const valtas = await withResponse(frida.page, { path: '/api/session/workspace' },
      () => frida.page.getByTestId(`ws-switch-${sajatKonyv}`).click());
    expect(valtas.body.ok).toBe(true);
    await me.waitHeld(2);

    // (1) A RÉGEBBI TÉR VISSZA ELŐBB — és MÉG SEMMI nincs alkalmazva: az állapot VALÓBAN nem igazolt.
    me.release(0);
    await expect(frida.page.getByTestId('ctx-recheck')).toBeVisible();
    const s = await merdAllapotot(frida.page);
    const hianyok = nemIgazoltHianyok(s, { D, regiEmail: frida.email, utmutatoVolt: false });
    expect(hianyok, `a nem igazolt állapot előírt alakja · mért állapot: ${JSON.stringify(s)}`).toEqual([]);

    // (2) ÉS AMINT A FÜGGŐ ÚJABB FRISSÍTÉS MEGÉRKEZIK, A LAP MAGÁTÓL HELYREÁLL — kattintás nélkül.
    me.release(1);
    await expect(frida.page.getByTestId('header-subject')).toHaveText(frida.email);
    await expect(frida.page.getByTestId('ctx-recheck')).toBeHidden();
    const u = await merdAllapotot(frida.page);
    // A SIKER MOST ÉR CÉLBA: ugyanaz az ember ül a lapnál, aki elfogadta — a szerver által
    // igazolt műveletet tehát nem tagadjuk le (a SPEC §2), és a mondat a nyelvcsomagból jön.
    expect(u.ertesito, `a saját, igazolt műveletének a mondata · ${JSON.stringify(u)}`)
      .toContain(D.UI.inviteAcceptedLead);
    expect((await frida.api.get('/api/me')).body.workspaces.map((x) => x.book_id))
      .toContain(bevaltas.body.book_id);
  });
});
