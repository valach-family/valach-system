// tests/e2e/v3app-r123.spec.mjs — AZ R123 BÖNGÉSZŐS TANÚJA (F123-03 · F123-04).
//
// AMIT EZ MÉR, ÉS A `findings_r123.mjs` NEM: a VALÓDI DOM-ot. A battéria a szabályt és a bekötését
// méri a HTTP-héjon; ez a lap azt, hogy a KÉT SZEREPLŐS történet végigkattintható, hogy a nyugta a
// képernyőn IGAZAT MOND arról, változott-e valami, és hogy a plafonon túli kör nem gomb, hanem
// KIMONDOTT tiltás (KUKA-207: a két tanú együtt a bizonyíték).
//
//   R123-C1  A KÉT SZEREPLŐS TÖRTÉNET, HU: csak mennyiség → a kezelő megad → a minta megnyílik →
//            EGY jog visszavonása → a mennyiség marad, a bizalmas minta zárul → a VEGYES bizonylat
//            egyetlen hiányzó jog mellett is EGÉSZBEN zár
//   R123-C2  A NYUGTA IGAZAT MOND: a megadás „mostantól megtekintheti", a visszavonás „nem látja",
//            és az ELAVULT gombra érkező ISMÉTELT kérés „eddig is megtekinthette — nem változott
//            semmi" (F123-03 felületi fele)
//   R123-C3  A PLAFONON TÚLI KÖR NEM GOMB: a régi (v1) fiókban a két új adatkör KIMONDOTT tiltás
//   R123-C4  KESKENY nézet: ugyanaz a történet, vízszintes csúszás nélkül
//   R123-C5  EN/DE: az új nyugta-mondatok a felhasználó saját nyelvén
import { test, expect } from '@playwright/test';
import {
  World, Db, inviteUI, openInviteUI, redeemUI, createWorkspaceUI, setPlanUI,
  grantScopeUI, revokeScopeUI, stockUI, gotoPage, openMemberPanel, openProfile,
} from './helpers.mjs';
import { dictFor } from '../../v3app/public/i18n/dict.mjs';

test.describe.configure({ mode: 'serial' });
const HU = dictFor('hu');

/** A várt minta-állapot, VÁRAKOZÓ állítással — a megadás/megvonás utáni újrarajzolás közepébe
 *  futó egyszeri mintavétel hamis leletet ad (KUKA-228). */
async function expectSample(page, kulcs, kiadva) {
  await expect(page.getByTestId(`sample-${kulcs}`)).toBeVisible();
  const cel = page.getByTestId(`sample-${kulcs}-${kiadva ? 'value' : 'denied'}`);
  await expect(cel).toBeVisible();
  return (await cel.textContent()) || '';
}

/**
 * A NÉZETHEZ KÖTÖTT KÉRÉS A LAPRÓL — az ISMÉTELT (újraküldött) kérés valódi alakja.
 *
 * MIÉRT ÍGY, ÉS MIÉRT NEM KATTINTÁSSAL. A `changed:false` nyugta kattintással NEM érhető el, és ez
 * SZÁNDÉKOS: a felület nem ajánl fel olyan gombot, aminek nincs hatása — megadott jognál a soron a
 * VISSZAVONÁS gombja áll. A `changed:false` a HÁLÓZATI ÚJRAKÜLDÉS és a dupla beküldés esete, ezért
 * a próba is ÚGY állítja elő: a lapról, a lap SAJÁT nézet-bélyegével küld újra (KUKA-217: a
 * böngészőből küldött jelzés nem felhatalmazás — a szerver a munkamenetből dönt, a bélyeg csak a
 * NÉZETET igazolja).
 */
async function replayScopeGrant(page, subjectId, scope) {
  return page.evaluate(async ({ subjectId: sid, scope: sc }) => {
    const host = document.querySelector('[data-view-gen]');
    const body = { subject_id: sid, scope: sc };
    if (host && host.getAttribute('data-view-book')) body.expected_book_id = host.getAttribute('data-view-book');
    if (host && host.getAttribute('data-view-subject')) body.expected_subject_id = host.getAttribute('data-view-subject');
    const res = await fetch('/api/members/scope', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  }, { subjectId, scope });
}

/**
 * A SABLON LEGHOSSZABB ÁLLANDÓ SZAKASZA — a mérés a SZÓTÁRBÓL veszi a mondatot, nem beégetve.
 *
 * MIÉRT NEM AZ ELEJE VAGY A VÉGE. Van olyan mondat, ami behelyettesített értékkel KEZDŐDIK
 * (`{ki} mostantól megtekintheti {mit}.`) — ott az „eleje" üres; és van, ahol a vége csak egy pont.
 * A leghosszabb ÁLLANDÓ szakasz mindkét alakban beszédes, és nyelvenként MÁS — tehát azt is méri,
 * hogy tényleg a felhasználó nyelvén szól a nyugta (KUKA-237: a próba a viselkedést mérje).
 */
function longestLiteral(tpl) {
  return String(tpl || '').split(/\{[^}]*\}/g).map((x) => x.trim())
    .reduce((a, b) => (b.length > a.length ? b : a), '');
}

test.describe('R123 — írásmentes elutasítás, atomi jogkezelés, igazat mondó nyugta', () => {
  let db; let w; let kezelo; let munkatars; let bookId;

  test.beforeAll(async ({ browser }) => {
    db = new Db();
    w = new World(browser, `r123-${Date.now().toString(36)}`);
    kezelo = await w.person('kezelo');
    munkatars = await w.person('munkatars');
    const ws = await createWorkspaceUI(kezelo.page, {
      name: 'R123 Kft', plan: 'starter', business: { jurisdiction: 'HU', tax_id: '72345674-2-42' },
    });
    bookId = ws.bookId;
    // A bizonylat- és beszállítói nézet a `pro` TESZTPROFILHOZ kötött (ENT-02) — tesztprofil,
    // nem kereskedelmi díjcsomag-döntés.
    await setPlanUI(kezelo.page, 'pro');
    const inv = await inviteUI(kezelo.page, { email: munkatars.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(munkatars.page, inv.token);
    await redeemUI(munkatars.page);
  });

  test.afterAll(async () => { await w.close(); db.close(); });

  test('R123-C1 — a két szereplős történet végigkattintható (HU)', async () => {
    // (1) A MUNKATÁRS CSAK MENNYISÉGET LÁT.
    await gotoPage(kezelo.page, 'members');
    const keszletMegadas = await grantScopeUI(kezelo.page, munkatars.subjectId, 'keszlet');
    expect(keszletMegadas.body.ok).toBe(true);
    expect(keszletMegadas.body.changed).toBe(true);
    expect((await stockUI(munkatars.page)).body.ok).toBe(true);

    await gotoPage(munkatars.page, 'documents');
    // A NEMLEGES VÁLASZ MEGNEVEZI, MI HIÁNYZIK (KUKA-201).
    expect(await expectSample(munkatars.page, 'document', false)).toContain(HU.SCOPE.dokumentumok);

    // (2) A KEZELŐ MEGADJA a bizonylat-hozzáférést → (3) A MINTA MEGNYÍLIK.
    await gotoPage(kezelo.page, 'members');
    expect((await grantScopeUI(kezelo.page, munkatars.subjectId, 'dokumentumok')).body.changed).toBe(true);
    await gotoPage(munkatars.page, 'stock');
    await gotoPage(munkatars.page, 'documents');
    expect(await expectSample(munkatars.page, 'document', true)).toContain('BEJ-2026-0042');

    // (4) EGY JOG VISSZAVONÁSA → (5) A MENNYISÉG MARAD, a bizalmas minta zárul.
    await gotoPage(kezelo.page, 'members');
    const vissza = await revokeScopeUI(kezelo.page, munkatars.subjectId, 'dokumentumok');
    expect(vissza.body.changed).toBe(true);
    expect((await stockUI(munkatars.page)).body.ok).toBe(true);
    await gotoPage(munkatars.page, 'documents');
    await expectSample(munkatars.page, 'document', false);

    // (6) A TAGSÁG MEGMARADT — a tárolóban mérve, KÖNYVRE szűkítve (KUKA-239).
    const tagsag = db.get('SELECT revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', munkatars.subjectId, bookId);
    expect(tagsag.revoked_at).toBeNull();

    // (7) A VEGYES BIZONYLAT: mind a négy jog kell hozzá; EGY hiányzó jog az EGÉSZET zárja.
    await gotoPage(kezelo.page, 'members');
    for (const s of ['dokumentumok', 'arak', 'beszallitok']) {
      await grantScopeUI(kezelo.page, munkatars.subjectId, s);
    }
    await gotoPage(munkatars.page, 'documents');
    expect(await expectSample(munkatars.page, 'document-full', true)).toContain('41880');
    await gotoPage(kezelo.page, 'members');
    await revokeScopeUI(kezelo.page, munkatars.subjectId, 'arak');
    await gotoPage(munkatars.page, 'stock');
    await gotoPage(munkatars.page, 'documents');
    expect(await expectSample(munkatars.page, 'document-full', false)).toContain(HU.SCOPE.arak);
    // A FEJLÉC nyitva marad: a zárás CÉLZOTT, nem általános.
    await expectSample(munkatars.page, 'document', true);
  });

  test('R123-C2 — a nyugta igazat mond arról, változott-e valami', async () => {
    await gotoPage(kezelo.page, 'members');
    // (a) VALÓDI VÁLTOZÁS: a megadás nyugtája a MEGNYÍLT nézetről szól.
    const ad = await grantScopeUI(kezelo.page, munkatars.subjectId, 'arak');
    expect(ad.body.changed).toBe(true);
    expect(ad.resultText).toContain(munkatars.email);

    // (b) VALÓDI VÁLTOZÁS a másik irányban.
    const von = await revokeScopeUI(kezelo.page, munkatars.subjectId, 'arak');
    expect(von.body.changed).toBe(true);
    expect(von.resultText).toContain(munkatars.email);

    // (c) NINCS VÁLTOZÁS — az ELAVULT gombra érkező ISMÉTELT kérés. A panel nyitva van, és a
    //     soron a MEGADÁS gombja áll; közben a jog MÁS úton (újraküldés) már megszületik. A
    //     második kérés ugyanazt a végállapotot adja, de a nyugtának meg kell mondania, hogy
    //     MOST nem történt semmi (KUKA-129).
    await openMemberPanel(kezelo.page, munkatars.subjectId);
    // A DELTÁT MÉRJÜK, NEM A TÖRTÉNET HOSSZÁT: a sorok száma a korábbi lépésektől függ, a
    //     KÖVETELMÉNY viszont az ISMÉTLÉS hatása (KUKA-239: a hatókör nélküli állítás a szomszéd
    //     sort igazolja).
    const sorok = () => db.count(
      'SELECT COUNT(*) FROM scope_grant WHERE subject_id = ? AND book_id = ? AND scope = ?',
      munkatars.subjectId, bookId, 'arak');
    const elotte = sorok();
    const elso = await replayScopeGrant(kezelo.page, munkatars.subjectId, 'arak');
    expect(elso.body.ok).toBe(true);
    expect(elso.body.changed).toBe(true);
    const kozben = sorok();
    expect(kozben).toBe(elotte + 1);
    const ismetelt = await replayScopeGrant(kezelo.page, munkatars.subjectId, 'arak');
    expect(ismetelt.body.ok).toBe(true);
    expect(ismetelt.body.changed).toBe(false);
    // AZ ISMÉTELT, AZONOS KÉRÉS EGYETLEN ÚJ SORT SEM ÍR.
    expect(sorok()).toBe(kozben);

    // A KÉPERNYŐ IS KIMONDJA: a még nyitott panel MEGADÁS gombjára kattintva a nyugta a
    // „nem változott" mondat, nem a „mostantól megtekintheti".
    const gomb = kezelo.page.getByTestId(`member-scope-grant-${munkatars.subjectId}-arak`);
    await expect(gomb).toBeVisible();
    await gomb.click();
    // VÁRAKOZÓ ÁLLÍTÁS, nem egyszeri mintavétel: a nyugta-mező a KORÁBBI mondatot viszi, amíg az
    // új meg nem érkezik — az első alakom épp ezt a régi szöveget olvasta ki (KUKA-228).
    // ÉS A MONDATOT A SZÓTÁRBÓL vesszük, nem beégetve (KUKA-237): a paraméterek utáni ZÁRÓ részt.
    const zaro = longestLiteral(HU.TPL.scopeGrantUnchanged);
    expect(zaro.length).toBeGreaterThan(0);
    await expect(kezelo.page.getByTestId('members-result')).toContainText(zaro);
    await expect(kezelo.page.getByTestId('members-result')).toContainText(munkatars.email);
    // ÉS A KATTINTÁS SEM ÍRT ÚJ SORT.
    expect(sorok()).toBe(kozben);
  });

  test('R123-C3 — a plafonon túli adatkör nem gomb, hanem kimondott tiltás', async () => {
    // A MAI (v2) fiókban a kezelő plafona mind a négy kör, tehát tiltott kör NEM LÁTSZIK. Ez a
    // mérés ezért azt állítja, amit mérni tud: a felület a SZERVER plafon-közlését követi, és a
    // négy sor mindegyike megjelenik. A SZŰK plafonú (régi, v1) fiók gépi tanúja a
    // `findings_r123.mjs` (a2) lépése — böngészőben v1 fiókot ma nem lehet létrehozni, és ezt
    // KIMONDJUK, nem pipáljuk (KUKA-041).
    await gotoPage(kezelo.page, 'members');
    await openMemberPanel(kezelo.page, munkatars.subjectId);
    for (const s of ['keszlet', 'arak', 'dokumentumok', 'beszallitok']) {
      await expect(kezelo.page.getByTestId(`member-scope-row-${s}`)).toBeVisible();
    }
  });

  test('R123-C4 — keskeny nézetben is végigvihető, vízszintes csúszás nélkül', async () => {
    const page = kezelo.page;
    // A NYITOTT PANELT ÉS LENYÍLÓKAT BECSUKJUK: a mérés a felhasználók képernyőjéről szól.
    const panel = page.getByTestId('panel');
    if (await panel.count() && await panel.evaluate((el) => el.open)) {
      await page.locator('[data-action="panel-close"]').last().click();
    }
    await page.evaluate(() => { for (const d of document.querySelectorAll('details[open]')) d.open = false; });
    await page.setViewportSize({ width: 390, height: 780 });
    try {
      // KESKENY NÉZETBEN A BAL MENÜ ÖSSZECSUKÓDIK: a felhasználó a menü-nyitóval jut a laphoz, és
      // a próba is EZT az utat járja — nem egy takart gombra kattint (KUKA-011).
      await expect(page.getByTestId('nav-toggle')).toBeVisible();
      await page.getByTestId('nav-toggle').click();
      await gotoPage(page, 'members');
      await openMemberPanel(page, munkatars.subjectId);
      for (const scope of ['keszlet', 'arak', 'dokumentumok', 'beszallitok']) {
        await expect(page.getByTestId(`member-scope-row-${scope}`)).toBeVisible();
      }
      // NINCS VÍZSZINTES CSÚSZÁS — és a mérés IZOLÁL: a táblázat nélküli értéket is megmutatja,
      // hogy egy jövőbeli piros ne csak egy számot adjon, hanem azt is, hol keresse (KUKA-216).
      const tul = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const tulTablaNelkul = await page.evaluate(() => {
        const t = document.querySelector('.tablebox');
        if (!t) return null;
        const elozo = t.style.display; t.style.display = 'none';
        const x = document.documentElement.scrollWidth - window.innerWidth;
        t.style.display = elozo;
        return x;
      });
      expect(tul, `túlcsúszás a Felhasználók lapon (táblázat nélkül: ${tulTablaNelkul})`).toBeLessThanOrEqual(1);
    } finally {
      const p2 = page.getByTestId('panel');
      if (await p2.count() && await p2.evaluate((el) => el.open)) {
        await page.locator('[data-action="panel-close"]').last().click();
      }
      await page.setViewportSize({ width: 1280, height: 900 });
    }
  });

  test('R123-C5 — az új nyugta-mondatok a felhasználó saját nyelvén (en · de)', async () => {
    // A BELÉPETT NYELVVÁLASZTÓ A PROFIL LAPON ÁLL (nem a fejlécben) — a próba ugyanazt az utat
    // járja végig, amit a felhasználó: profilmenü → Saját profil → nyelv. Az `openProfile` csak a
    // MENÜT nyitja ki; a nyelvet a `lang-select` állítja, és a váltást a `html[lang]` IGAZOLJA
    // (az első alakom a menü megnyitását vette nyelvváltásnak — KUKA-215: a választ meg kell mérni).
    const nyelvre = async (code) => {
      const panel = kezelo.page.getByTestId('panel');
      if (await panel.count() && await panel.evaluate((el) => el.open)) {
        await kezelo.page.locator('[data-action="panel-close"]').last().click();
      }
      await openProfile(kezelo.page);
      await kezelo.page.getByTestId('profile-menu-profile').click();
      await kezelo.page.getByTestId('lang-select').selectOption(code);
      await expect(kezelo.page.locator('html')).toHaveAttribute('lang', code);
    };
    for (const lang of ['en', 'de']) {
      await nyelvre(lang);
      const D = dictFor(lang);
      await gotoPage(kezelo.page, 'members');
      // A SORREND A MAI ÁLLAPOTOT KÖVETI: a `dokumentumok` joga ekkor MEGVAN, tehát a soron a
      // VISSZAVONÁS gombja áll — előbb visszavonunk, aztán adunk. A felület nem ajánl fel hatás
      // nélküli gombot, és a próba sem kereshet olyat (KUKA-011).
      // A NYUGTA-MEZŐRE VÁRAKOZÓ ÁLLÍTÁST teszünk, nem egyszeri mintavételt: a mező a KORÁBBI
      // mondatot viszi, amíg az új meg nem érkezik (KUKA-228).
      const nyugta = kezelo.page.getByTestId('members-result');
      const von = await revokeScopeUI(kezelo.page, munkatars.subjectId, 'dokumentumok');
      expect(von.body.ok).toBe(true);
      await expect(nyugta).toContainText(longestLiteral(D.TPL.scopeRevoked));
      const ad = await grantScopeUI(kezelo.page, munkatars.subjectId, 'dokumentumok');
      expect(ad.body.ok).toBe(true);
      expect(ad.body.changed).toBe(true);
      await expect(nyugta).toContainText(longestLiteral(D.TPL.memberCanSee));
      // ÉS A „NEM VÁLTOZOTT" MONDAT IS LÉTEZIK EZEN A NYELVEN (a felület ezt fogja mutatni).
      expect(typeof D.TPL.scopeGrantUnchanged).toBe('string');
      expect(D.TPL.scopeGrantUnchanged.length).toBeGreaterThan(0);
      expect(typeof D.TPL.scopeRevokeUnchanged).toBe('string');
      expect(D.TPL.scopeRevokeUnchanged.length).toBeGreaterThan(0);
    }
    await nyelvre('hu');
  });
});
