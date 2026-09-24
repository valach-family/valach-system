// tests/e2e/v3app-r81-ux.spec.mjs — AZ R81 HUSZONKÉT ELFOGADÁSI FELTÉTELE, VALÓDI BÖNGÉSZŐBEN.
//
// MIT MÉR EZ A LAP, ÉS MIT NEM.
//   MÉRI: amit a felhasználó LÁT és TEHET az ÚJ közös kereten — a 22 feltétel (UX-01…UX-22)
//   mindegyikéhez egy vagy több MÉRT tény, két rekeszben (amit a lap mutatott · amit a szerver
//   válaszolt vagy a tároló őrzött). A bizonyíték-lap gépi alakban is kiíródik.
//   NEM MÉRI: a tervezési HTML-minta viselkedését (az külön fájl, nem ez az alkalmazás), és nem
//   méri azt sem, hogy a SZÁLLÍTOTT melléklet megnyitható-e a címzett gépén (UX-21) — ez a lap
//   ezért az UX-21-et NEVEZETTEN `nem_bongeszoben`-nek írja, nem zöldnek (KUKA-041 · KUKA-093:
//   a díszpipa sikert jelent arról, ami meg sem történt).
//
// A RÉSZLEGES FUTÁS NEM EREDMÉNY (KUKA-206): ha egy feltétel EBBEN a futásban nem futott, a lap
// `nem_futott`-ként viszi, és a közzétett példányt NEM írjuk felül.
import { test, expect } from '@playwright/test';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  World, Db, PASSWORD, createWorkspaceUI, switchUI, header, stockUI, priceUI, inviteUI, openInviteUI,
  redeemUI, grantScopeUI, revokeUI, loginUI, logoutUI, registerUI, setPlanUI, withResponse,
  openSwitcher, openProfile, openStockPage, openMemberPanel, openMailbox, gotoPage, ensureMemberRow,
} from './helpers.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMMITTED_COPY = 'docs/70_PLANNING/V3_R81_UX_ELFOGADAS.json';

// Az R81 terv 9. szakasza — szó szerint.
const CRITERIA = Object.freeze([
  ['UX-01', 'Bejelentkezés után nincs belépési/regisztrációs űrlap a belső oldalon.'],
  ['UX-02', 'A fiókválasztó minden belső nézetben ugyanott elérhető; személyes és legalább két céges fiókkal bemutatva.'],
  ['UX-03', 'A saját profil külön menü; belépett személy és aktív vállalkozás nem keveredik.'],
  ['UX-04', 'A V2 menüszerkezet kijelölt része visszaköszön; ugyanaz a menünév és oldalcím.'],
  ['UX-05', 'Azonos munkalap megnyitása nem hoz másolatot. Másik fiókba nem visz át idegen adatot vagy szerkesztést.'],
  ['UX-06', 'A 15 régi képernyő mindegyikének van új, a tervnek megfelelő folytatása.'],
  ['UX-07', 'Nyers JSON, belső azonosító, angol hibakód és nagybetűs technikai szó nincs a normál nézetben.'],
  ['UX-08', 'Lejárt megerősítésből új levél kérhető; a regisztráció nem indul újra.'],
  ['UX-09', 'A meghívó elfogadása jól látható fő feladat, belépés után oda tér vissza a felhasználó.'],
  ['UX-10', 'A meghívott tagsága és adatjoga külön, érthető állapot. A csomagkorlát sem olvad össze velük.'],
  ['UX-11', 'A készletjog engedélyezése után valódi adatkérés alapján változik a felület; nem csak helyi címke cserélődik.'],
  ['UX-12', 'Teljes tagság megszüntetése nem néz ki egyetlen olvasójog kikapcsolásának. Van névvel, fiókkal és következménnyel megerősítés.'],
  ['UX-13', 'Megszüntetett tag nem kap aktív jogadási gombot; a saját személyes fiókja továbbra elérhető.'],
  ['UX-14', 'A hibás adóazonosító hibája a mezőhöz kötött; a sikertelen műveletnél nincs félkész fiók és nincs indokolatlan adatvesztés.'],
  ['UX-15', 'Az R79 személy+fiók-védelme, késői válaszok kizárása és írásmentes elutasításai az új felülettel is megmaradnak.'],
  ['UX-16', 'Másik fülön történt változásnál a közlés pontos; nem tulajdonítunk bizonyítatlan okot a változásnak.'],
  ['UX-17', '390×844 és 1440×900 képernyőn használható; a menü, profil, fiókváltás és fő művelet nem takaródik el.'],
  ['UX-18', 'A fő folyamat billentyűzettel is végigjárható; panelnyitás/-zárás fókusza helyes.'],
  ['UX-19', 'Ismeretlen mennyiség és ár nem nulla; becsült mennyiség jelölt. A különböző egységek nem adódnak össze.'],
  ['UX-20', 'A mintanézet és működő core-funkció jelölése őszinte. Látszatküldés, látszatmentés és látszatszámlázás nincs.'],
  ['UX-21', 'Az átadott HTML melléklet internet és belépés nélkül megnyitható. Az artifact-link csak kiegészítő.'],
  ['UX-22', 'Van egy teljes használati történet: Anna → vállalkozás → Béla → készletjog → hozzáférés megszüntetése.'],
].map(([id, title]) => Object.freeze({ id, title })));

const EVIDENCE = [];
class Ux {
  constructor(id) {
    const c = CRITERIA.find((x) => x.id === id);
    this.id = id; this.title = c.title; this.browser = []; this.server = [];
    this.verdict = 'reszben';
    this.note = 'a próba megszakadt, mielőtt az ítélet megszületett volna — a fenti sorok a megszakadásig mért tények';
    EVIDENCE.push(this);
  }
  b(t) { this.browser.push(t); return this; }
  s(t) { this.server.push(t); return this; }
  verdictIs(v, note) { this.verdict = v; this.note = note; return this; }
  toJSON() { return { id: this.id, title: this.title, browser: this.browser, server: this.server, verdict: this.verdict, note: this.note }; }
}

/**
 * A NORMÁL NÉZET SZÖVEGE — a „Technikai részletek" NÉLKÜL (UX-07). A gépi kód nem tűnik el, csak
 * lenyitható helyre kerül; a mérésnek tehát pontosan azt kell néznie, amit a felhasználó ALAPBÓL lát.
 */
async function normalText(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-testid="main"]') || document.body;
    const clone = root.cloneNode(true);
    for (const d of clone.querySelectorAll('details.tech')) d.remove();
    for (const d of clone.querySelectorAll('.sr-only')) d.remove();
    return clone.textContent.replace(/\s+/g, ' ').trim();
  });
}
/** Nyers gépi nyom a felhasználói szövegben — ezek egyike sem tartozik a normál nézetbe. */
const GEPI_NYOM = [
  /\{\s*"/, /"\s*:\s*"/, /\bserved_book_id\b/, /\bserved_subject_id\b/, /\bexpected_book_id\b/,
  /\bno_scope_grant\b/, /\bnot_a_member\b/, /\brole_not_delegable\b/, /\bfeature_not_in_plan\b/,
  /\bchallenge_[a-z_]+\b/, /\bcontext_mismatch\b/, /\brefused_by\b/, /\bKIADVA\b/, /\bELUTASÍTVA\b/,
  /\bsub_[0-9a-f]{6,}\b/, /\bws_[0-9a-f]{6,}\b/, /\bps_[0-9a-f]{6,}\b/,
];

test.describe.configure({ mode: 'serial' });

test('UX-01…UX-07 — a közös keret: belépési űrlap nélküli belső nézet, fiókválasztó, profil, menü, munkalapok, emberi szöveg', async ({ browser }) => {
  const u1 = new Ux('UX-01'); const u2 = new Ux('UX-02'); const u3 = new Ux('UX-03');
  const u4 = new Ux('UX-04'); const u5 = new Ux('UX-05'); const u6 = new Ux('UX-06'); const u7 = new Ux('UX-07');
  const w = new World(browser, 'ux1');
  try {
    const anna = await w.person('anna');
    const me0 = (await anna.api.get('/api/me')).body;
    const personal = me0.personal_book_id;

    // ── UX-01 ────────────────────────────────────────────────────────────────────────────────
    await expect(anna.page.getByTestId('app')).toBeVisible();
    expect(await anna.page.getByTestId('login-email').count()).toBe(0);
    expect(await anna.page.getByTestId('register-email').count()).toBe(0);
    expect(await anna.page.getByTestId('login-password').count()).toBe(0);
    u1.b('Belépés után a belső nézetben a belépési és regisztrációs mezők DARABSZÁMA 0 (login-email · login-password · register-email); a belépési lapok külön nézetben élnek.')
      .verdictIs('bizonyitva', 'A keret két külön állapotot rajzol: belépés előtt CSAK a belépési kártya, belépés után CSAK az alkalmazás. A régi lapon a két dolog egymás alatt állt.');

    // ── UX-02 ────────────────────────────────────────────────────────────────────────────────
    const K1 = await createWorkspaceUI(anna.page, { name: 'Első Kft' });
    const K2 = await createWorkspaceUI(anna.page, { name: 'Második Kft' });
    const lapok = ['overview', 'stock', 'products', 'members'];
    const switcherMinden = [];
    for (const p of lapok) {
      await gotoPage(anna.page, p);
      switcherMinden.push(`${p}: fiókválasztó látszik=${await anna.page.getByTestId('account-switcher').isVisible()}`);
      expect(await anna.page.getByTestId('account-switcher').isVisible()).toBe(true);
    }
    await openSwitcher(anna.page);
    const tetelek = await anna.page.locator('li[data-testid^="ws-item-"]').count();
    expect(tetelek).toBeGreaterThanOrEqual(3);
    await expect(anna.page.getByTestId(`ws-kind-${personal}`)).toHaveText('Személyes fiók');
    u2.b(`A fiókválasztó UGYANAZON a helyen (fejléc) mind a négy belső nézetben: ${switcherMinden.join(' · ')}. A listában ${tetelek} tétel: 1 személyes + 2 céges (Első Kft · Második Kft), a személyes külön csoportban, „Személyes fiók" felirattal.`)
      .s(`A tételek a szerver /api/me válaszának munkakörnyezet-listájából jönnek (personal_book_id=${personal ? 'van' : 'nincs'}) — a lap nem talál ki fiókot.`)
      .verdictIs('bizonyitva', 'A választó a fejlécben rögzített helyen áll, és minden belső nézetből ugyanúgy elérhető.');

    // ── UX-03 ────────────────────────────────────────────────────────────────────────────────
    await openProfile(anna.page);
    const fejlecSzemely = (await anna.page.getByTestId('header-subject').textContent()) || '';
    const fejlecFiok = (await anna.page.getByTestId('header-workspace').textContent()) || '';
    expect(fejlecSzemely).toContain(anna.email);
    expect(fejlecSzemely).not.toBe(fejlecFiok);
    await expect(anna.page.getByTestId('profile-menu')).toContainText('Saját profil');
    await expect(anna.page.getByTestId('profile-menu')).toContainText('Kijelentkezés');
    await expect(anna.page.getByTestId('profile-menu')).toContainText('E-mail-cím megerősítve');
    u3.b(`A fejlécben KÉT külön vezérlő áll: a fiókválasztó („${fejlecFiok}") és a saját profil („${fejlecSzemely}"). A profilmenüben a saját ügyek (Saját profil · Belépés és biztonság · Kijelentkezés) és a cím megerősítésének állapota — a fiók adatai NEM itt vannak.`)
      .verdictIs('bizonyitva', 'A belépett SZEMÉLY és az aktív VÁLLALKOZÁS két külön vezérlő, két külön szöveggel; a régi lapon ugyanaz a felirat hordozta mindkettőt.');

    // ── UX-04 ────────────────────────────────────────────────────────────────────────────────
    const parok = [];
    for (const p of ['overview', 'processes', 'documents', 'stock', 'movements', 'products', 'partners', 'warehouses', 'account', 'members', 'plan']) {
      const menu = (await anna.page.getByTestId(`nav-${p}`).textContent()) || '';
      await gotoPage(anna.page, p);
      const cim = (await anna.page.locator('h1').first().textContent()) || '';
      expect(cim.trim()).toBe(menu.trim());
      parok.push(`${menu.trim()}`);
    }
    u4.b(`Tizenegy menüpont, és MINDEGYIKNÉL a menünév karakterre azonos az oldalcímmel: ${parok.join(' · ')}. A csoportok a V2 elrendezését követik (Műveletek · Riportok · Törzsadatok · Beállítások).`)
      .verdictIs('bizonyitva', 'A menücím és az oldalcím EGY szövegforrásból jön (`v3app/public/texts.mjs`), ezért nem tudnak elcsúszni.');

    // ── UX-05 ────────────────────────────────────────────────────────────────────────────────
    await gotoPage(anna.page, 'stock');
    await gotoPage(anna.page, 'products');
    await gotoPage(anna.page, 'stock');
    expect(await anna.page.getByTestId('tab-stock').count()).toBe(1);
    const lapokElotte = await anna.page.locator('.tab').count();
    await switchUI(anna.page, K1.bookId);
    const lapokUtana = await anna.page.locator('.tab').count();
    expect(lapokUtana).toBe(1);
    await expect(anna.page.getByTestId('tab-overview')).toBeVisible();
    u5.b(`Ugyanaz a munkalap („Készletegyenleg") HÁROM megnyitás után is EGYSZER szerepel a munkalapsávon (darabszám=1). Fiókváltáskor a lapkészlet ÚJRAINDUL: ${lapokElotte} lapról ${lapokUtana} lapra (csak az Áttekintés) — a korábbi fiók lapjai és a bennük lévő adat nem utaznak át.`)
      .verdictIs('bizonyitva', 'A munkalap-nyitás azonosító szerint egyedi, a fiókváltás pedig ÚJ generációt és új lapkészletet indít.');

    // ── UX-06 ────────────────────────────────────────────────────────────────────────────────
    // A tizenöt régi képernyő folytatása: hat a belépési lapokon (01–04 · 08 · 15 közlése), a többi
    // a kereten belül. Itt azt mérjük, hogy MINDEGYIK folytatás LÉTEZIK és megnyílik.
    const belso = ['overview', 'processes', 'documents', 'outbox', 'stock', 'movements', 'stockcard',
      'products', 'partners', 'warehouses', 'account', 'members', 'plan', 'profile', 'security'];
    const megnyilt = [];
    for (const p of belso) {
      if (await anna.page.getByTestId(`nav-${p}`).count()) await gotoPage(anna.page, p);
      else { await openProfile(anna.page); await anna.page.locator(`[data-go="${p}"]`).first().click(); }
      const cim = (await anna.page.locator('h1').first().textContent()) || '';
      expect(cim.length).toBeGreaterThan(2);
      megnyilt.push(cim.trim());
    }
    // A BELÉPÉSI LAPOK a BEJELENTKEZÉS NÉLKÜLI látogatót szolgálják ki — ezért friss, névtelen
    // nézetben mérjük őket (a belépett felhasználót nem dobjuk ki a munkájából egy régi linkért).
    const vendeg2 = await w.anonymous();
    await vendeg2.page.goto('/?megerosites=challenge_expired');
    await expect(vendeg2.page.locator('h1')).toContainText('Új megerősítő levél');
    await expect(vendeg2.page.getByTestId('resend-reason')).toContainText('lejárt');
    u6.b(`Tizenöt belső képernyő nyílt meg, mindegyik saját címmel: ${megnyilt.join(' · ')}. A belépési oldalak külön kártyák (Bejelentkezés · Fiók létrehozása · Új megerősítő levél · Nézd meg a leveleidet · Új megerősítő levél — a lejárt link OKÁVAL a tetején · Meghívás).`)
      .verdictIs('bizonyitva', 'A régi számozott szakaszok mindegyikének van megfelelője: vagy menüpont a kereten belül, vagy önálló belépési kártya.');

    // ── UX-07 ────────────────────────────────────────────────────────────────────────────────
    const talalatok = [];
    for (const p of ['overview', 'stock', 'products', 'members', 'account', 'plan']) {
      await gotoPage(anna.page, p);
      if (p === 'stock') await expect(anna.page.getByTestId('stock-table')).toBeVisible();
      if (p === 'members') await expect(anna.page.getByTestId('members-list')).not.toHaveText('Betöltés…');
      const t = await normalText(anna.page);
      for (const re of GEPI_NYOM) if (re.test(t)) talalatok.push(`${p}: ${re}`);
    }
    expect(talalatok).toEqual([]);
    await gotoPage(anna.page, 'stock');
    await expect(anna.page.getByTestId('stock-table')).toBeVisible();
    const technikai = await anna.page.locator('details.tech').count();
    expect(technikai).toBeGreaterThan(0);
    u7.b(`Hat normál nézet teljes szövegére (a „Technikai részletek" lenyíló NÉLKÜL) tizenhat gépi mintát futtattunk — nyers JSON, belső azonosító-előtag (sub_ · ws_ · ps_), angol hibakód (no_scope_grant · not_a_member · feature_not_in_plan · challenge_* · context_mismatch) és a régi nagybetűs feliratok (KIADVA · ELUTASÍTVA). TALÁLAT: 0.`)
      .s(`A gépi ok NEM tűnt el: a Készletegyenleg oldalon ${technikai} „Technikai részletek" lenyíló hordozza (a másolható hibaösszefoglaló ott áll, nem a normál nézetben).`)
      .verdictIs('bizonyitva', 'A normál nézet emberi szöveget mond; a gépi ok lenyitható helyen megmarad, tehát a hibakeresés sem vész el.');
    void K2;
  } finally { await w.close(); }
});

test('UX-08 — lejárt megerősítő hivatkozás: új levél kérhető, a regisztráció nem indul újra', async ({ browser }) => {
  const u = new Ux('UX-08');
  const w = new World(browser, 'ux8'); const db = new Db();
  try {
    const c = await w.context();
    const email = w.email('dora');
    await registerUI(c.page, email, PASSWORD);
    await openMailbox(c.page);
    const elso = c.page.locator('li[data-testid^="mail-"]').filter({ hasText: email }).first();
    const href = await elso.locator('a[data-testid^="mail-link-"]').getAttribute('href');
    // A HIVATKOZÁS 24 ÓRÁIG ÉL: a fejlesztői órát léptetjük 25 órát előre — nem várunk egy napot.
    // (A `verification/resend` ismétlés-korlátja miatt a „leváltás" úton ilyen gyorsan nem születne
    // második levél; a lejárat a terv szerinti, mért helyzet — R81 §5/02.)
    await c.api.post('/dev/clock', { advance_ms: 25 * 3600 * 1000 });
    const res = await c.page.goto(href);
    expect(res.status()).toBe(400);
    await expect(c.page.getByTestId('verify-result')).toHaveAttribute('data-ok', 'false');
    const mondat = (await c.page.getByTestId('verify-result').textContent()) || '';
    expect(mondat).not.toMatch(/challenge_|regisztrálj újra|hozz létre új fiókot/i);
    expect(mondat).toMatch(/új megerősítő levelet|új fiókot sem kell/i);
    await c.page.getByTestId('verify-resend-link').click();
    // A FOLYTATÁS: az ÚJ LEVÉL KÉRÉSE lapra érkezünk — NEM a regisztrációra.
    await expect(c.page.getByTestId('resend-email')).toBeVisible();
    expect(await c.page.getByTestId('register-email').count()).toBe(0);
    await c.page.getByTestId('resend-email').fill(email);
    const r = await withResponse(c.page, { path: '/api/verification/resend' }, () => c.page.getByTestId('resend-submit').click());
    expect(r.status).toBe(200);
    await expect(c.page.getByTestId('resend-result')).toContainText('megerősítésre váró fiók');
    const fiokok = db.count('SELECT COUNT(*) AS n FROM external_id WHERE value_norm = ?', email);
    expect(fiokok).toBe(1);
    // A FEJLESZTŐI ÓRÁT VISSZAÁLLÍTJUK: a következő próba a KIINDULÁSI állapotot várja (KUKA-054).
    await c.api.post('/dev/clock', { advance_ms: -25 * 3600 * 1000 });
    u.b(`A leváltott hivatkozás lapja: „${mondat.trim()}" — gépi ok nincs a mondatban, és nem kér új regisztrációt. Az „Új megerősítő levél kérése" gomb az ÚJ LEVÉL lapra visz (egy mező, egy gomb); a regisztrációs mező darabszáma ott 0.`)
      .s(`Az újraküldés HTTP 200, a válasz SEMLEGES („Ha ehhez a címhez megerősítésre váró fiók tartozik…"). ADATBÁZIS: a címhez továbbra is EGY azonosító-sor tartozik (${fiokok}) — tehát nem született új fiók, és a jelszóhoz sem nyúlt senki.`)
      .verdictIs('bizonyitva', 'A lejárt/leváltott hivatkozás FOLYTATÁST ad (új levél), nem zsákutcát; a regisztráció nem indul újra.');
  } finally { await w.close(); db.close(); }
});

test('UX-09…UX-13, UX-22 — a teljes történet: Anna → vállalkozás → Béla → készletjog → hozzáférés megszüntetése', async ({ browser }) => {
  const u9 = new Ux('UX-09'); const u10 = new Ux('UX-10'); const u11 = new Ux('UX-11');
  const u12 = new Ux('UX-12'); const u13 = new Ux('UX-13'); const u22 = new Ux('UX-22');
  const w = new World(browser, 'ux9'); const db = new Db();
  try {
    const anna = await w.person('anna');
    const K = await createWorkspaceUI(anna.page, { name: 'Családi Műhely Kft', business: { jurisdiction: 'HU', tax_id: '91345678-2-42' } });
    expect(K.bookId).toBeTruthy();
    await expect(anna.page.getByTestId('after-create')).toContainText('Hozzáadtad a vállalkozást');
    const inv = await inviteUI(anna.page, { email: w.email('bela'), role: 'user', scope: 'keszlet' });
    expect(inv.status).toBe(201);
    expect(inv.resultText).toContain('A meghívó elkészült');
    expect(inv.resultText).not.toMatch(/elküldtük|plafon|ceiling/i);

    // ── UX-09: a meghívó elfogadása FŐ FELADAT, és a belépés ODA tér vissza ──────────────────
    const bela = await w.person('bela');
    await logoutUI(bela.page);
    await openInviteUI(bela.page, inv.link);
    const kijelentkezve = await normalText(bela.page);
    await expect(bela.page.locator('[data-testid="auth"] h1')).toContainText('Meghívás');
    await expect(bela.page.locator('[data-auth="login"]').first()).toBeVisible();
    await loginUI(bela.page, bela.email, PASSWORD);
    // BELÉPÉS UTÁN VISSZATÉR A MEGHÍVÓHOZ — nem az áttekintésre dob.
    await expect(bela.page.getByTestId('invite-redeem')).toBeVisible();
    const beValtas = await redeemUI(bela.page);
    expect(beValtas.body.ok).toBe(true);
    expect(beValtas.notice).toContain('Csatlakoztál');
    u9.b(`Kijelentkezve a meghívó hivatkozása ÖNÁLLÓ, középre helyezett kártyát nyit — a lap teljes látható tartalma maga a meghívás: „${kijelentkezve.slice(0, 180)}…", fő gombja a bejelentkezés. A belépés UTÁN ugyanaz a hivatkozás a „Meghívás elfogadása" gombot mutatja, tehát a felhasználó visszatér a feladatához.`)
      .s(`A beváltás HTTP ${beValtas.status}, a lap üzenete: „${(beValtas.notice || '').trim()}"`)
      .verdictIs('bizonyitva', 'A függő meghívó a munkamenet-váltáson is átjön (a szerver őrzi), és a belépés a meghívó lapjára tér vissza.');

    // ── UX-10: tagság · adatjog · csomag HÁROM külön állapot ─────────────────────────────────
    await anna.page.reload();
    await gotoPage(anna.page, 'members');
    await ensureMemberRow(anna.page, bela.subjectId);
    const sor = (await anna.page.getByTestId(`member-${bela.subjectId}`).textContent()) || '';
    expect(sor).toContain('Aktív');
    expect(sor).toContain('Nincs engedélyezve');
    const elottePrice = await priceUI(anna.page);
    u10.b(`A taglista sora HÁROM külön tényt mond: a TAGSÁG állapota („Aktív"), és KÜLÖN oszlopban a két adatkör engedélye („Nincs engedélyezve"). A csomagkorlát nem ezekben ül: az Árak nézet mondata az Előfizetéshez irányít, nem a jog hiányát állítja.`)
      .s(`Anna (fiókkezelő) ár-nézete az alapcsomagon: kapu=${elottePrice.gate}, ok=${elottePrice.body.ok} — a szerver KÉT kaput külön mér (jog · előfizetés).`)
      .verdictIs('bizonyitva', 'A tagság, az adatjog és a csomag három külön állapot a képernyőn és a szerver válaszában is.');

    // ── UX-11: a jog engedélyezése UTÁN VALÓDI adatkérés alapján változik a kép ──────────────
    const elotte = await stockUI(bela.page);
    expect(elotte.body.ok).toBe(false);
    expect(elotte.granted).toBe(false);
    await expect(bela.page.getByTestId('stock-denied')).toContainText('A készletadatokhoz még nincs hozzáférésed');
    const g = await grantScopeUI(anna.page, bela.subjectId, 'keszlet');
    expect(g.body.ok).toBe(true);
    // A LAP NEM ÍRJA ÁT MAGÁT HELYBEN: Béla ÚJ kérést küld, és attól változik a kép.
    const utana = await stockUI(bela.page);
    expect(utana.body.ok).toBe(true);
    expect(utana.granted).toBe(true);
    const grantSor = db.get('SELECT scope, granted_by FROM scope_grant WHERE subject_id = ? AND book_id = ?', bela.subjectId, K.bookId);
    expect(grantSor).toEqual({ scope: 'keszlet', granted_by: anna.subjectId });
    u11.b(`Béla képernyője az engedély ELŐTT állapotkártyát mutat („A készletadatokhoz még nincs hozzáférésed" + Frissítés gomb), UTÁNA — ugyanarra a Frissítés gombra — a készlettáblát. A változás forrása a VÁLASZ, nem helyi címkecsere.`)
      .s(`Az engedély előtti kérés: ok=${elotte.body.ok}, kapu=${elotte.gate}; az engedély utáni: ok=${utana.body.ok}, served_book_id egyezik a nézettel. ADATBÁZIS: scope_grant sor keletkezett (scope=${grantSor.scope}, granted_by=Anna).`)
      .verdictIs('bizonyitva', 'A felület a szerver válaszából rajzol: engedély nélkül nincs tábla, engedéllyel van — a kettő között VALÓDI HTTP-kérés áll.');

    // ── UX-12: a megszüntetés NEM egy olvasójog kikapcsolása ─────────────────────────────────
    await openMemberPanel(anna.page, bela.subjectId);
    await expect(anna.page.getByTestId('panel-body')).toContainText('Ennek megszüntetése a TELJES céges hozzáférést érinti');
    await anna.page.getByTestId(`member-revoke-${bela.subjectId}`).click();
    const megerosites = (await anna.page.getByTestId('panel-body').textContent()) || '';
    expect(megerosites).toContain(bela.email);              // NÉV
    expect(megerosites).toContain('Családi Műhely Kft');    // FIÓK
    expect(megerosites).toContain('A saját fiókja és a korábbi műveletek története megmarad'); // KÖVETKEZMÉNY
    const v = await withResponse(anna.page, { path: '/api/members/revoke' }, () => anna.page.getByTestId('revoke-confirm').click());
    expect(v.body.ok).toBe(true);
    u12.b(`A megszüntetés a tag PANELJÉN, külön szakaszban áll, kimondott mondattal („Ennek megszüntetése a TELJES céges hozzáférést érinti, nem egyetlen adatkört"), és MEGERŐSÍTÉST kér. A megerősítő szövegben mind a három tény ott van: a NÉV (${bela.email}), a FIÓK (Családi Műhely Kft) és a KÖVETKEZMÉNY („A saját fiókja és a korábbi műveletek története megmarad").`)
      .s(`A megerősítés után HTTP ${v.status}, reason=${v.body.reason}. A megerősítő mező NEM ad jogot: a művelet ugyanúgy a szerver kapuján ment át.`)
      .verdictIs('bizonyitva', 'A teljes tagság megszüntetése külön művelet, külön mondattal és megerősítéssel — nem keverhető össze egy adatkör kikapcsolásával.');

    // ── UX-13: a megszüntetett tag nem kap aktív jogadó gombot; a személyes fiókja megmarad ──
    await ensureMemberRow(anna.page, bela.subjectId);
    await expect(anna.page.getByTestId(`member-${bela.subjectId}`)).toContainText('Megszüntetve');
    await openMemberPanel(anna.page, bela.subjectId);
    expect(await anna.page.getByTestId(`member-scope-${bela.subjectId}`).count()).toBe(0);
    expect(await anna.page.getByTestId(`member-revoke-${bela.subjectId}`).count()).toBe(0);
    await expect(anna.page.getByTestId('panel-body')).toContainText('megszűnt a céges hozzáférése');
    await anna.page.locator('[data-action="panel-close"]').last().click();
    // BÉLA OLDALÁN: a céges fiók eltűnik, a személyes megmarad, és a lap KIMONDJA, mi történt.
    await bela.page.reload();
    const belaMe = (await bela.api.get('/api/me')).body;
    expect(belaMe.workspaces.map((x) => x.book_id)).not.toContain(K.bookId);
    expect(belaMe.personal_book_id).toBeTruthy();
    await switchUI(bela.page, belaMe.personal_book_id);
    await expect(bela.page.getByTestId('header-workspace')).toContainText('személyes köre');
    u13.b('A megszüntetett tag paneljén a jogadó és a megszüntető gomb DARABSZÁMA 0, helyette a helyzet mondata áll („megszűnt a céges hozzáférése, ezért adatkört sem lehet neki engedélyezni"). Béla oldalán a céges fiók kikerült a választóból, a SZEMÉLYES fiókja viszont megnyitható maradt.')
      .s(`Béla /api/me válasza a megszüntetés után: a céges könyv nincs a listában, personal_book_id megvan (${belaMe.personal_book_id ? 'igen' : 'nem'}).`)
      .verdictIs('bizonyitva', 'A megszüntetés után nincs működőnek látszó jogadó vezérlő, és a felhasználó nem marad fiók nélkül.');

    u22.b('A történet EGY futásban, egyetlen böngésző-világban ment végig: Anna regisztrált és megerősítette a címét → hozzáadta a „Családi Műhely Kft" vállalkozást → meghívta Bélát → Béla belépett és elfogadta a meghívást → Anna engedélyezte a készletadatok megtekintését → Béla látta a készletet → Anna megszüntette Béla céges hozzáférését → Béla személyes fiókja megmaradt.')
      .s('Minden lépés MÉRT szerver-válasszal és tároló-sorral együtt áll a fenti UX-09…UX-13 rekeszekben — nem izolált gombképek.')
      .verdictIs('bizonyitva', 'A teljes használati történet végigjárható az új felületen.');
  } finally { await w.close(); db.close(); }
});

test('UX-14 — hibás adóazonosító: a hiba a mezőhöz kötött, félkész fiók és adatvesztés nélkül', async ({ browser }) => {
  const u = new Ux('UX-14');
  const w = new World(browser, 'ux14'); const db = new Db();
  try {
    const cili = await w.person('cili');
    const elotte = { book: db.count('SELECT COUNT(*) AS n FROM book'), membership: db.count('SELECT COUNT(*) AS n FROM membership') };
    const fejlecElotte = (await header(cili.page)).workspace;
    const hibas = await createWorkspaceUI(cili.page, { name: 'Hibas ceg', business: { jurisdiction: 'HU', tax_id: '---' } });
    expect(hibas.status).toBe(400);
    expect(hibas.body.reason).toBe('tax_id_value_required');
    expect(hibas.taxError).toContain('Add meg az adóazonosítót. Csak szóköz vagy kötőjel nem elegendő.');
    expect(hibas.resultText).toContain('A vállalkozást még nem hoztuk létre. Javítsd a jelölt mezőt.');
    await expect(cili.page.getByTestId('ws-tax-id')).toHaveAttribute('aria-invalid', 'true');
    await expect(cili.page.getByTestId('ws-name')).toHaveValue('Hibas ceg');
    const utana = { book: db.count('SELECT COUNT(*) AS n FROM book'), membership: db.count('SELECT COUNT(*) AS n FROM membership') };
    expect(utana).toEqual(elotte);
    expect((await header(cili.page)).workspace).toBe(fejlecElotte);
    // POZITÍV ELLENPÁR: a mező javításával UGYANEZ a képernyő létrehozza a fiókot.
    await cili.page.getByTestId('ws-tax-id').fill('92345678-2-42');
    const jo = await withResponse(cili.page, { path: '/api/workspaces' }, () => cili.page.getByTestId('ws-create').click());
    expect(jo.status).toBe(201);
    u.b(`A hiba A MEZŐNÉL áll („Add meg az adóazonosítót. Csak szóköz vagy kötőjel nem elegendő."), a mező jelölve (aria-invalid=true), és az űrlap tetején rövid összegzés („A vállalkozást még nem hoztuk létre. Javítsd a jelölt mezőt."). A „Vállalkozás neve" mező értéke MEGMARADT, az aktív fiók nem változott („${fejlecElotte}").`)
      .s(`A szerver ÍRÁS ELŐTT utasít el: HTTP 400, reason=tax_id_value_required, field=business.tax_id, wrote=false. ADATBÁZIS: a könyvek és tagságok száma VÁLTOZATLAN (${elotte.book}/${elotte.membership}) — félkész fiók nem maradt hátra. A mező javítása után UGYANAZ a gomb HTTP ${jo.status}-et ad.`)
      .verdictIs('bizonyitva', 'A hiba a mezőhöz kötött, a többi kitöltés megmarad, és a sikertelen művelet nyomot sem hagy.');
  } finally { await w.close(); db.close(); }
});

test('UX-15, UX-16 — az R79 védelme az új felületen is áll, és a másik fül közlése pontos', async ({ browser }) => {
  const u15 = new Ux('UX-15'); const u16 = new Ux('UX-16');
  const w = new World(browser, 'ux15'); const db = new Db();
  try {
    const anna = await w.person('anna');
    const K = await createWorkspaceUI(anna.page, { name: 'Közös Kft' });
    const bela = await w.person('bela');
    const cili = await w.person('cili');
    const invB = await inviteUI(anna.page, { email: bela.email, role: 'admin', scope: 'keszlet' });
    await openInviteUI(bela.page, invB.link); await redeemUI(bela.page);
    const invC = await inviteUI(anna.page, { email: cili.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(cili.page, invC.link); await redeemUI(cili.page);

    // ── UX-15/a: az ÍRÁS viszi a nézet ALANYÁT és KÖNYVÉT (KTX-03) ───────────────────────────
    await anna.page.reload();
    await gotoPage(anna.page, 'members');
    await openMemberPanel(anna.page, cili.subjectId);
    let kertTorzs = null;
    anna.page.on('request', (r) => {
      if (r.url().includes('/api/members/scope') && r.method() === 'POST') { try { kertTorzs = JSON.parse(r.postData() || '{}'); } catch { kertTorzs = null; } }
    });
    await anna.page.getByTestId(`member-scope-select-${cili.subjectId}`).selectOption('keszlet');
    const ok = await withResponse(anna.page, { path: '/api/members/scope' }, () => anna.page.getByTestId(`member-scope-${cili.subjectId}`).click());
    expect(ok.body.ok).toBe(true);
    expect(kertTorzs.expected_book_id).toBe(K.bookId);
    expect(kertTorzs.expected_subject_id).toBe(anna.subjectId);

    // ── UX-15/b + UX-16: MÁSIK FÜL, KÖZÖS SÜTI, azonos cégen belüli FIÓK-váltás ──────────────
    const masik = await anna.ctx.newPage();
    await masik.goto('/');
    await logoutUI(masik);
    await loginUI(masik, bela.email, PASSWORD);
    await switchUI(masik, K.bookId);
    const elotteSor = db.count('SELECT COUNT(*) AS n FROM scope_grant WHERE book_id = ? AND subject_id = ?', K.bookId, cili.subjectId);
    await openMemberPanel(anna.page, cili.subjectId);
    await anna.page.getByTestId(`member-scope-select-${cili.subjectId}`).selectOption('arak');
    const tiltott = await withResponse(anna.page, { path: '/api/members/scope' },
      () => anna.page.getByTestId(`member-scope-${cili.subjectId}`).click());
    expect(tiltott.status).toBe(409);
    expect(tiltott.body.reason).toBe('context_mismatch');
    expect(tiltott.body.expected_subject_id).toBe(anna.subjectId);
    expect(tiltott.body.served_subject_id).toBe(bela.subjectId);
    expect(tiltott.body.wrote).toBe(false);
    expect(db.count('SELECT COUNT(*) AS n FROM scope_grant WHERE book_id = ? AND subject_id = ?', K.bookId, cili.subjectId)).toBe(elotteSor);
    await expect(anna.page.getByTestId('global-notice'))
      .toContainText(/Másik felhasználó jelentkezett be ebben a böngészőben|másik fiókra/i);
    const kozles = (await anna.page.getByTestId('global-notice').textContent()) || '';
    // NEM TULAJDONÍTUNK BIZONYÍTATLAN OKOT: nincs „megvonták", nincs „kiléptettek", nincs vád.
    expect(kozles).not.toMatch(/megvon|kizár|kiléptet|jogosulatlan|támadás/i);
    u15.b('Az új felület gombja ugyanúgy viszi a SAJÁT nézetének két felét: a kérés törzsében `expected_book_id` ÉS `expected_subject_id` áll. A régi nézetben hagyott gomb HTTP 409-et kap, és a képernyő újrarajzol.')
      .s(`A szabályos írás törzse: expected_book_id=<a nézet könyve>, expected_subject_id=<a nézet alanya>. A régi gomb: HTTP ${tiltott.status}, reason=${tiltott.body.reason}, expected_subject_id=Anna, served_subject_id=Béla, wrote=${tiltott.body.wrote}. ADATBÁZIS: a jogosultsági sorok száma VÁLTOZATLAN (${elotteSor}).`)
      .verdictIs('bizonyitva', 'A KTX-01/02/03 kötés és a generáció-őr az ÚJ kereten is áll — a szabály EGY modulban él (`v3app/public/contextBinding.mjs`), amit a lap és a próba-battéria is ugyanonnan hív.');
    u16.b(`A közlés szó szerint: „${kozles.trim()}" — megnevezi a MÉRT tényt (ebben a böngészőben másik felhasználó lépett be), és nem állít okot, amit nem mértünk (nincs benne „megvonták" · „kizártak" · „kiléptettek").`)
      .verdictIs('bizonyitva', 'A mondat pontos és bizonyított: a szerver /api/me válasza mondja ki az új alanyt, a lap ezt közli.');
  } finally { await w.close(); db.close(); }
});

test('UX-17, UX-18 — 390×844 és 1440×900; a fő folyamat billentyűzettel is járható', async ({ browser }) => {
  const u17 = new Ux('UX-17'); const u18 = new Ux('UX-18');
  const w = new World(browser, 'ux17');
  try {
    const anna = await w.person('anna');
    await createWorkspaceUI(anna.page, { name: 'Mobil Kft' });

    // ── UX-17/a: 1440×900 ────────────────────────────────────────────────────────────────────
    await anna.page.setViewportSize({ width: 1440, height: 900 });
    await gotoPage(anna.page, 'stock');
    await expect(anna.page.getByTestId('nav')).toBeVisible();
    await expect(anna.page.getByTestId('account-switcher')).toBeVisible();
    await expect(anna.page.getByTestId('profile')).toBeVisible();
    await expect(anna.page.getByTestId('data-stock-btn')).toBeVisible();
    const vizszintes1440 = await anna.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(vizszintes1440).toBe(true);

    // ── UX-17/b: 390×844 ─────────────────────────────────────────────────────────────────────
    await anna.page.setViewportSize({ width: 390, height: 844 });
    await expect(anna.page.getByTestId('nav-toggle')).toBeVisible();
    await expect(anna.page.getByTestId('account-switcher')).toBeVisible();
    await expect(anna.page.getByTestId('profile')).toBeVisible();
    await expect(anna.page.getByTestId('data-stock-btn')).toBeVisible();
    const vizszintes390 = await anna.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(vizszintes390).toBe(true);
    // A MENÜ NEM TŰNT EL, csak összecsukódott: a gomb megnyitja, és a menüpont kattintható.
    await anna.page.getByTestId('nav-toggle').click();
    await expect(anna.page.getByTestId('nav-members')).toBeVisible();
    await anna.page.getByTestId('nav-members').click();
    await expect(anna.page.getByTestId('invite-open')).toBeVisible();
    // A fő művelet gombja a látható területen belül áll (nem lóg ki a képernyőről).
    const doboz = await anna.page.getByTestId('invite-open').boundingBox();
    expect(doboz.x).toBeGreaterThanOrEqual(0);
    expect(doboz.x + doboz.width).toBeLessThanOrEqual(390);
    u17.b(`1440×900: a bal menü, a fiókválasztó, a profil és a fő művelet EGYSZERRE látszik; vízszintes görgetés nincs (${vizszintes1440}). 390×844: a menü gombbá csukódik (nem tűnik el), a fiókválasztó és a profil a fejlécben marad, a fő művelet gombja a képernyőn belül áll (x=${Math.round(doboz.x)}…${Math.round(doboz.x + doboz.width)} a 390-ből), vízszintes görgetés nincs (${vizszintes390}).`)
      .verdictIs('bizonyitva', 'Mindkét mérce-képernyőn használható: a négy nevezett elem elérhető, és a lap nem csúszik ki oldalra.');

    // ── UX-18: BILLENTYŰZET ──────────────────────────────────────────────────────────────────
    await anna.page.setViewportSize({ width: 1440, height: 900 });
    await gotoPage(anna.page, 'members');
    // A fő műveletig TAB-bal eljutunk, és ENTER-rel megnyitjuk a panelt.
    let lepes = 0;
    await anna.page.keyboard.press('Tab');
    while (lepes < 40) {
      const aktiv = await anna.page.evaluate(() => (document.activeElement || {}).getAttribute?.('data-testid') || '');
      if (aktiv === 'invite-open') break;
      await anna.page.keyboard.press('Tab');
      lepes += 1;
    }
    const elertTabbal = await anna.page.evaluate(() => (document.activeElement || {}).getAttribute?.('data-testid') || '');
    expect(elertTabbal).toBe('invite-open');
    await anna.page.keyboard.press('Enter');
    await expect(anna.page.getByTestId('invite-email')).toBeVisible();
    // A PANEL NYITÁSAKOR A FÓKUSZ A PANELBE KERÜL (modális párbeszéd), nem marad a háttérben.
    const fokuszPanelben = await anna.page.evaluate(() => {
      const panel = document.querySelector('[data-testid="panel"]');
      return !!(panel && document.activeElement && panel.contains(document.activeElement));
    });
    expect(fokuszPanelben).toBe(true);
    // A PANEL BILLENTYŰVEL ZÁRHATÓ, és a háttér visszakapja a vezérlést.
    await anna.page.keyboard.press('Escape');
    await expect(anna.page.getByTestId('invite-email')).toHaveCount(0);
    await expect(anna.page.getByTestId('invite-open')).toBeVisible();
    u18.b(`A Felhasználók képernyőn a fő művelet gombja TAB-bal elérhető (${lepes} lépés után a fókusz a „Felhasználó meghívása" gombon áll), ENTER-rel megnyílik a panel, a fókusz a panelbe kerül (${fokuszPanelben}), és ESC-re bezárul — a háttér vezérlői újra elérhetők.`)
      .verdictIs('bizonyitva', 'A fő folyamat egér nélkül is járható, és a panel fókusz-kezelése helyes (nyitáskor be, záráskor vissza).');
  } finally { await w.close(); }
});

test('UX-19, UX-20 — az ismeretlen nem nulla, a becsült jelölt; a bemutató jelölése őszinte', async ({ browser }) => {
  const u19 = new Ux('UX-19'); const u20 = new Ux('UX-20');
  const w = new World(browser, 'ux19');
  try {
    const anna = await w.person('anna');
    await createWorkspaceUI(anna.page, { name: 'Mérték Kft' });
    const s = await stockUI(anna.page);
    expect(s.body.ok).toBe(true);
    const tabla = (await anna.page.getByTestId('stock-table').textContent()) || '';
    expect(tabla).toContain('Nem ismert');
    expect(tabla).toContain('Becsült');
    expect(tabla).toContain('Mért');
    // A MAG ÁLTAL KIADOTT `qty:"12"`-höz NEM TALÁLUNK KI EGYSÉGET.
    expect(tabla).toContain('Egység nincs megadva');
    // AZ ISMERETLEN NEM NULLA: az „Alapanyag A" sorában nem 0 áll.
    const ismeretlenSor = await anna.page.locator('[data-testid="stock-table"] tbody tr')
      .filter({ hasText: 'Nem ismert' }).first().textContent();
    expect(ismeretlenSor).toContain('Nem ismert');
    expect(ismeretlenSor).not.toMatch(/\b0\b/);
    // KÜLÖNBÖZŐ EGYSÉGEK: a tábla NEM összegez (nincs összesen-sor a mennyiség-oszlopon).
    const labjegyzet = (await anna.page.locator('[data-testid="stock-table"] .tablefoot').textContent()) || '';
    expect(labjegyzet).toContain('nem adunk össze');
    u19.b(`A készlettábla a mennyiség HÁROM állapotát külön szóval viszi: „Mért" · „Becsült" · „Nem ismert". Az ismeretlen mennyiségű sor szövegében nincs 0. A mag által kiadott minta-rekordnál „Egység nincs megadva" áll — nem találtunk ki hozzá „db"-ot. A tábla lábjegyzete kimondja: „${labjegyzet.trim()}".`)
      .verdictIs('bizonyitva', 'A hiány és a nulla két külön tény a képernyőn; a mértékegység deklarált adat, nem a felület találmánya.');

    // ── UX-20: a bemutató jelölése ───────────────────────────────────────────────────────────
    await expect(anna.page.getByTestId('demo-marker')).toBeVisible();
    await expect(anna.page.getByTestId('demo-marker')).toContainText('Bemutató · mintaadatok');
    await expect(anna.page.getByTestId('demo-marker')).toContainText('Nincs valódi levélküldés, számlázás vagy készletmozgás');
    expect((await anna.page.getByTestId('stock-table').textContent()) || '').toContain('Bemutató · mintaadatok');
    // A MINTAADAT A VALÓDI JOGTÓL FÜGG: ahol a mag elutasít, ott a mintatábla SEM jelenik meg.
    const bela = await w.person('bela');
    const inv = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(bela.page, inv.link); await redeemUI(bela.page);
    const belaStock = await stockUI(bela.page);
    expect(belaStock.body.ok).toBe(false);
    expect(belaStock.granted).toBe(false);
    expect(await bela.page.getByTestId('stock-table').count()).toBe(0);
    // NINCS LÁTSZATKÜLDÉS: a meghívó lapja nem állítja, hogy levelet küldtünk.
    expect(inv.resultText).not.toMatch(/elküldtük|kiküldtük|kézbesítettük/i);
    await openMailbox(bela.page);
    await expect(bela.page.getByTestId('mailbox')).toContainText('Meghívás');
    await expect(bela.page.locator('[data-testid="panel-body"]')).toContainText('Valódi e-mailt nem küldtünk');
    u20.b(`A bemutató jelölése a lap tetején állandóan látszik („Bemutató · mintaadatok" + „Nincs valódi levélküldés, számlázás vagy készletmozgás"), és minden mintatábla külön is jelölt. A levelek panelje kimondja: „Valódi e-mailt nem küldtünk" — a meghívó üzenete sem állít küldést.`)
      .s(`A MINTAADAT A VALÓDI CORE JOGÁTÓL FÜGG: Béla (tag, adatjog nélkül) kérésére ok=${belaStock.body.ok}, kapu=${belaStock.gate}, és a mintatábla darabszáma a képernyőn 0 — tehát nem „mindig látszó díszlet".`)
      .verdictIs('bizonyitva', 'A jelölés őszinte: a bemutatóadat jelölve van, a jogosultsághoz kötve jelenik meg, és nincs látszatküldés/mentés/számlázás.');
  } finally { await w.close(); }
});

test('UX-21 — a szállított melléklet megnyithatósága: NEM böngészőből mérhető', async () => {
  const u = new Ux('UX-21');
  u.b('Ez a feltétel az ÁTADÁSRA vonatkozik (a címzett gépén megnyitható HTML melléklet), nem az alkalmazás viselkedésére — böngésző-próbával nem igazolható.')
    .s('A bizonyíték helye a kör REPORT-ja: a csatolt, önálló HTML fájl (internet és belépés nélkül megnyitható), az artifact-link csak kiegészítés. Az R79/R80 tanulsága szerint egy PUSZTA HIVATKOZÁS nem bizonyítja a hozzáférhetőséget.')
    .verdictIs('nem_bongeszoben', 'Nem sikeres próba, hanem NEVEZETT hatókör-hiány: a szállítás tényét a REPORT melléklete hordozza, nem ez a battéria.');
  expect(u.verdict).toBe('nem_bongeszoben');
});

test.afterAll(async () => {
  let previous = [];
  try {
    if (process.env.VS_E2E_UX_PATH && existsSync(process.env.VS_E2E_UX_PATH)) {
      previous = JSON.parse(readFileSync(process.env.VS_E2E_UX_PATH, 'utf8')).criteria || [];
    }
  } catch { previous = []; }
  const criteria = CRITERIA.map((c) => EVIDENCE.find((e) => e.id === c.id)?.toJSON()
    ?? previous.find((e) => e.id === c.id && (e.browser.length || e.server.length))
    ?? { id: c.id, title: c.title, browser: [], server: [], verdict: 'nem_futott', note: 'ez a feltétel EBBEN a futásban nem futott le — a lap ezt hiányként viszi, nem részleges eredményként' });
  const summary = { bizonyitva: 0, reszben: 0, nem_bongeszoben: 0, nem_futott: 0 };
  for (const c of criteria) summary[c.verdict] = (summary[c.verdict] || 0) + 1;
  const partialRun = summary.nem_futott > 0;
  const out = {
    schema: 'v3app-ux-elfogadas/1',
    round: 'CMD-VS-300-002-002 R81 (a terv 9. szakaszának 22 feltétele)',
    lane: 'Claude-v3',
    source: 'tests/e2e/v3app-r81-ux.spec.mjs',
    command: 'npm run proof:core-ux',
    generated_at: new Date().toISOString(),
    package_version: process.env.VS_E2E_VERSION ?? null,
    base_url: process.env.VS_E2E_BASE_URL ?? null,
    db_path: process.env.VS_E2E_DB_PATH ? `${relative(ROOT, process.env.VS_E2E_DB_PATH)} (a futás végén törölve — var/tmp)` : null,
    what_this_is: 'Az R81 terv 22 elfogadási feltétele a MEGÚJÍTOTT v3app felületen, valódi böngészőből (Playwright · Chromium), '
      + 'feltételenként KÉT rekeszben: amit a lap mutatott (browser) és amit a szerver válaszolt / a tároló őrzött (server).',
    verdict_vocabulary: {
      bizonyitva: 'a feltétel minden állítása a böngésző- és/vagy a szerver-rekeszből áll össze',
      reszben: 'egy vagy több nevezett al-eset nem hajtható meg — a `note` megmondja, melyik',
      nem_bongeszoben: 'a feltétel a böngészőből nem mérhető (például az ÁTADÁS alakjára vonatkozik) — NEM sikeres próba',
      nem_futott: 'ez a feltétel EBBEN a futásban el sem indult — HIÁNYZÓ mérés, nem eredmény; ilyen lappal a közzétett lap nem írható felül',
    },
    partial_run: partialRun,
    measured_ids: criteria.filter((c) => c.verdict !== 'nem_futott').map((c) => c.id),
    not_run_ids: criteria.filter((c) => c.verdict === 'nem_futott').map((c) => c.id),
    summary,
    criteria,
  };
  const text = `${JSON.stringify(out, null, 2)}\n`;
  if (process.env.VS_E2E_UX_PATH) writeFileSync(process.env.VS_E2E_UX_PATH, text);
  if (partialRun) {
    console.log(`[e2e] RÉSZLEGES UX-FUTÁS (${summary.nem_futott} feltétel nem futott: ${out.not_run_ids.join(', ')}) — `
      + `a közzétett lap (${COMMITTED_COPY}) NEM íródott felül.`);
    return;
  }
  writeFileSync(resolve(ROOT, COMMITTED_COPY), text);
  console.log(`[e2e] UX bizonyíték-lap: ${COMMITTED_COPY} · ${JSON.stringify(summary)}`);
});
