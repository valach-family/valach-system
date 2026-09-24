#!/usr/bin/env node
// tools/v3_kiprobalas_kepek.mjs — A KIPRÓBÁLHATÓ ÁTADÁS KÉT LAPJA (R81 §8).
//
// MIÉRT VAN EZ. Az operátor nem futtat repót, és a próba-alkalmazásnak NINCS megosztható, nyilvános
// címe (nincs telepítés, és a bemutató levél-fogadóját nyilvánosan kitenni nem szabad). Amit a
// címzett nem tud megnyitni, azt nem szállítottuk le (KUKA-079).
//
// AZ R81 KÉT RÉSZRE VÁLASZTJA AZ ÁTADÁST — és ez itt KÉT KÜLÖN FÁJL, nem egy lap két doboza:
//   1. FELHASZNÁLÓI BEMUTATÓ (`..._bemutato.html`): rövid útmutató és állapotképek. Minden
//      feladatnál EGY mondat arról, mit próbálhat ki, és EGY arról, miből látja a sikert.
//      Megnyitásához NEM kell terminál, Git vagy Node — csak egy böngésző.
//   2. MŰSZAKI MELLÉKLET (`..._muszaki.html`): forráscommit, a helyi indítás pontos útja,
//      szerződés-azonosítók, futási eredmények és a NEVEZETT hiányok. Ez nem a termék lapja.
//
// A KÉPEK A VALÓDI FUTÁSBÓL JÖNNEK: a szerver itt indul (saját, eldobható tárolóval), a lépéseket
// egy Chromium kattintja végig, és minden lépés MÉRT állítással zárul — ha egy lépés nem azt
// mutatja, amit a szöveg mond, a futtató PIROS lesz, nem szépít (KUKA-041: a díszpipa sikert
// jelent arról, ami meg sem történt).
//
// Kimenet: két ÖNÁLLÓ HTML lap (a képek beágyazva), a `var/reports` alatt, a közös névképzővel
// (ART-01). Hálózat és kulcs nem kell hozzá.
import { chromium } from '@playwright/test';
import { writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { startServer } from '../v3app/server.mjs';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { artifactPath } = require('../contracts/artifactNaming.js');
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

/**
 * A LAP KÖTÖTT FORRÁSA (R77 §5 · R79 §4). Egy képernyő-lap önmagában nem mondja meg, MIBŐL készült
 * — ezért a fejléc a git-állapotot viszi: ÁG · COMMIT · tiszta-e a munkafa. Ha a munkafa nem tiszta,
 * azt a lap KIMONDJA (nem „a commithoz tartozik" — az a bizonyíték hamisítása lenne, KUKA-122).
 */
function gitState() {
  const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  try {
    return { branch: git(['rev-parse', '--abbrev-ref', 'HEAD']), commit: git(['rev-parse', 'HEAD']), dirty: git(['status', '--porcelain']).length > 0 };
  } catch { return { branch: null, commit: null, dirty: null }; }
}
const GIT = gitState();

// KÉT ALAK, EGY TARTALOM (R79 §4): a PNG-s lap a részletekhez, a JPEG-es TÖMÖR lap a
// továbbküldéshez. A tömör alakot a `VS_KEPEK_JPEG=1` kapcsolja — a lépések és a szövegek azonosak.
const JPEG = process.env.VS_KEPEK_JPEG === '1';
const shots = [];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * EGY LÉPÉS = EGY KÉP + HÁROM MONDAT.
 *   `mit`     — mit próbálhat ki a felhasználó ezen a képernyőn (felhasználói lap);
 *   `siker`   — miből LÁTJA, hogy sikerült (felhasználói lap);
 *   `muszaki` — a szerződés/próba azonosítója (CSAK a műszaki mellékletben).
 */
async function shot(page, title, { mit, siker, muszaki }) {
  const buf = await page.screenshot({ fullPage: true, ...(JPEG ? { type: 'jpeg', quality: 58 } : {}) });
  shots.push({ title, mit, siker, muszaki, png: buf.toString('base64'), mime: JPEG ? 'image/jpeg' : 'image/png' });
  console.log(`kép ${shots.length}: ${title}`);
}
/** A KÉP NEM ÖNMAGÁBAN BIZONYÍT: a szövegét MEGMÉRJÜK, és eltérésnél a futtató megáll. */
function mert(feltetel, uzenet) { if (!feltetel) throw new Error(`MÉRÉSI ELTÉRÉS: ${uzenet}`); }

const dbPath = resolve(ROOT, artifactPath({ area: 'tmp', kind: 'v3app_kiprobalas', ext: 'sqlite', version: VERSION }));
const demoPath = resolve(ROOT, artifactPath({ area: 'reports', kind: JPEG ? 'v3app_bemutato_tomor' : 'v3app_bemutato', ext: 'html', version: VERSION }));
const techPath = resolve(ROOT, artifactPath({ area: 'reports', kind: JPEG ? 'v3app_muszaki_tomor' : 'v3app_muszaki', ext: 'html', version: VERSION }));
const app = await startServer({ port: 0, dbPath });
const base = `http://127.0.0.1:${app.port}`;
const browser = await chromium.launch();
const started = new Date().toISOString();
const KEPERNYO = { width: 1280, height: 900 };          // „normál képernyőméret" (R81 §8/1)

const ANNA = 'anna@pelda.hu';
const BELA = 'bela@pelda.hu';
const JELSZO = 'proba-jelszo-2026';

async function ujContext() {
  const ctx = await browser.newContext({ baseURL: base, viewport: KEPERNYO, locale: 'hu-HU', ...(JPEG ? { deviceScaleFactor: 0.7 } : {}) });
  // A LAP HIBÁJA NEM MARADHAT NÉMA: ha a böngészőben kivétel keletkezik, a futtató KIÍRJA — egy
  // néma JS-hiba különben „időtúllépésnek" látszana, és a valódi okot elrejtené (KUKA-121).
  ctx.on('page', (p) => {
    p.on('pageerror', (e) => console.error(`[LAP-HIBA] ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error') console.error(`[LAP-KONZOL] ${m.text()}`); });
  });
  return ctx;
}
async function nyitFiokValaszto(page) {
  const d = page.getByTestId('account-switcher');
  if (!(await d.getAttribute('open'))) await d.locator('summary').click();
}
async function menu(page, nev) {
  await page.getByTestId(`nav-${nev}`).click();
  await page.waitForFunction((n) => document.querySelector(`[data-testid="nav-${n}"]`)?.getAttribute('aria-current') === 'page', nev);
}
async function levelek(page) {
  // A PANELEK MODÁLISAK: ha épp nyitva van egy, a fejléc gombja nem kattintható — előbb bezárjuk,
  // ahogy a felhasználó is tenné (Esc vagy a panel „×” gombja).
  const panel = page.getByTestId('panel');
  if (await panel.evaluate((d) => d.open).catch(() => false)) await page.keyboard.press('Escape');
  await page.getByTestId('demo-mail-open').click();
  await page.getByTestId('mailbox').waitFor();
}
async function levelHivatkozas(page, szuro) {
  return page.locator('li[data-testid^="mail-"]').filter({ hasText: szuro }).first()
    .locator('a[data-testid^="mail-link-"]').getAttribute('href');
}
async function belep(page, email) {
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(JELSZO);
  await page.getByTestId('login-submit').click();
  await page.getByTestId('app').waitFor();
}
async function regisztral(page, email) {
  await page.goto('/');
  await page.locator('[data-auth="register"]').first().click();
  await page.getByTestId('register-email').fill(email);
  await page.getByTestId('register-password').fill(JELSZO);
  await page.getByTestId('register-submit').click();
  await page.getByTestId('register-result').waitFor();
}

try {
  const ctxA = await ujContext();
  const anna = await ctxA.newPage();

  // ── 1. REGISZTRÁCIÓ ──────────────────────────────────────────────────────────────────────────
  await regisztral(anna, ANNA);
  const semleges = (await anna.getByTestId('register-result').textContent()) || '';
  mert(/folytatható a regisztráció/.test(semleges) && !/már használ|foglalt/i.test(semleges),
    `az 1. lépés válasza nem semleges: „${semleges}"`);
  await shot(anna, '1. Fiók létrehozása', {
    mit: 'Adja meg az e-mail-címét és egy legalább 8 karakteres jelszót, majd nyomja meg a „Fiók létrehozása" gombot. Céges adatot itt nem kérünk.',
    siker: 'A képernyő átvált a „Nézd meg a leveleidet" lapra. A válasz szándékosan ugyanaz akkor is, ha a címhez már tartozik fiók — így senki nem tudja kitalálni, ki van már a rendszerben.',
    muszaki: 'K03 anti-enumeráció (semleges regisztrációs válasz) · HTP-01 bemeneti séma · npm run app:selfcheck',
  });

  // ── 2. A LEJÁRT HIVATKOZÁS — ÉS A FOLYTATÁS ─────────────────────────────────────────────────
  await levelek(anna);
  const elsoLink = await levelHivatkozas(anna, ANNA);
  await anna.request.post(`${base}/dev/clock`, { data: { advance_ms: 25 * 3600 * 1000 } });
  await anna.goto(elsoLink);
  const lejartMondat = (await anna.getByTestId('verify-result').textContent()) || '';
  mert(/új megerősítő levelet|új fiókot sem kell/i.test(lejartMondat) && !/challenge_/.test(lejartMondat),
    `a 2. lépés lapja nem a folytatást mondja: „${lejartMondat}"`);
  await shot(anna, '2. Ha lejárt a megerősítő link', {
    mit: 'Nyissa meg a levélben kapott hivatkozást azután, hogy lejárt (a bemutatóban az órát állítottuk 25 órával előre, nem vártunk egy napot).',
    siker: 'A lap nem hibakódot mutat, hanem azt írja, mi a teendő: „Új megerősítő levél kérése". Új regisztrációra nincs szükség, és a jelszava sem változik.',
    muszaki: 'CHR-01 kihívás-szerződés · R75/F75-01 · KUKA-201 (a nemleges válasz is vigye a MŰKÖDŐ folytatást) · npm run verify:app-findings',
  });

  // ── 3. ÚJ MEGERŐSÍTŐ LEVÉL ──────────────────────────────────────────────────────────────────
  await anna.getByTestId('verify-resend-link').click();
  await anna.getByTestId('resend-email').fill(ANNA);
  await anna.getByTestId('resend-submit').click();
  await anna.getByTestId('resend-result').waitFor();
  await shot(anna, '3. Új megerősítő levél kérése', {
    mit: 'Írja be ugyanazt az e-mail-címet, és kérjen új levelet. Egy mező, egy gomb.',
    siker: 'A lap visszaigazolja, hogy ha a címhez megerősítésre váró fiók tartozik, megy az új levél. A legutóbbi levél hivatkozása lesz az érvényes — a korábbiak lejárnak.',
    muszaki: 'CHR-01 (egy élő kihívás címenként) · ismétlés-korlát: legalább 60 mp, ablakonként legfeljebb 5 · a válasz SEMLEGES minden ágon',
  });

  // ── 4. A MEGERŐSÍTÉS ────────────────────────────────────────────────────────────────────────
  await levelek(anna);
  const ujLink = await levelHivatkozas(anna, 'Új megerősítő');
  await anna.goto(ujLink);
  mert((await anna.getByTestId('verify-result').getAttribute('data-ok')) === 'true', 'a 4. lépésben a megerősítés nem sikerült');
  await shot(anna, '4. Az e-mail-cím megerősítve', {
    mit: 'Kattintson az ÚJ levélben lévő hivatkozásra.',
    siker: 'A lap kimondja, hogy a cím megerősítve, és a „Tovább a bejelentkezéshez" gomb átvisz a belépésre. A személyes fiókja ezzel készen áll — nem kell „céget" kitalálnia ahhoz, hogy legyen hova belépnie.',
    muszaki: 'CHR-01 beváltás (egyszeri · lejáró · leváltható) · SZK-01 személyes kör · az R64 L11 zárása',
  });

  // ── 5. BELÉPÉS — A KÖZÖS ALKALMAZÁSKERET ────────────────────────────────────────────────────
  await anna.getByTestId('verify-back').click();
  await belep(anna, ANNA);
  mert((await anna.getByTestId('login-email').count()) === 0, 'az 5. lépés után belépési űrlap maradt a belső oldalon');
  await shot(anna, '5. Belépés: a személyes fiók áttekintése', {
    mit: 'Lépjen be a most megerősített címmel. A belső oldalon nézze meg a fejlécet: bal oldalon az AKTÍV FIÓK választója, jobb oldalon a SAJÁT PROFIL menüje.',
    siker: 'Belépés után a belépési űrlap eltűnik, és a rendes alkalmazás nyílik meg: felül a fiókválasztó és a profil, balra a menü, középen a munka.',
    muszaki: 'UX-01 · UX-03 · a fejléc „ki nevében jársz el" mondata a szerver /api/me válaszából (R75 §4)',
  });

  // ── 6. VÁLLALKOZÁS HOZZÁADÁSA ───────────────────────────────────────────────────────────────
  await nyitFiokValaszto(anna);
  await anna.getByTestId('ws-add').click();
  await anna.getByTestId('ws-name').fill('Családi Műhely Kft');
  await anna.getByTestId('ws-jurisdiction').selectOption('HU');
  await anna.getByTestId('ws-tax-id').fill('12345678-2-42');
  await anna.getByTestId('ws-create').click();
  await anna.getByTestId('after-create').waitFor();
  await shot(anna, '6. Vállalkozás hozzáadása', {
    mit: 'A fiókválasztóból indítsa a „Vállalkozás hozzáadása" lapot, adja meg a nevet, az ország/terület mezőt és az adószámot.',
    siker: 'A fejlécben megjelenik az új vállalkozás neve, és a kezdőlapon ott a következő lépés („Felhasználó meghívása"). A személyes fiókja megmarad, a választóban továbbra is ott van.',
    muszaki: 'PRV-01 (a könyv · az indulási tények · a vállalkozási minőség EGY egység) · REP-01 képviseleti határ: a megadott adat ÖNBEVALLOTT, hatósági igazolás nincs',
  });

  // ── 7. ELŐFIZETÉSI CSOMAG ───────────────────────────────────────────────────────────────────
  await menu(anna, 'plan');
  await anna.getByTestId('plan-select').selectOption('pro');
  await anna.getByTestId('plan-submit').click();
  await anna.getByTestId('plan-result').waitFor();
  await shot(anna, '7. Előfizetési csomag', {
    mit: 'A Beállítások → Előfizetés oldalon váltson „Bővített" csomagra.',
    siker: 'A lap kiírja, melyik csomag aktív, és azt is, mi tartozik hozzá. A csomag a FUNKCIÓK elérhetőségét szabja meg — az adatok megtekintésének jogát nem ez adja. Ebben a bemutatóban nincs vásárlás és nincs díjfizetés.',
    muszaki: 'ENT-02 két kapu (jog · előfizetés) KÜLÖN mérve és KÜLÖN jelentve · KUKA-002 (két tény nem ül egy ábrázoláson)',
  });

  // ── 8. MEGHÍVÁS ─────────────────────────────────────────────────────────────────────────────
  await menu(anna, 'members');
  await anna.getByTestId('invite-open').click();
  await anna.getByTestId('invite-email').fill(BELA);
  await anna.getByTestId('invite-role').selectOption('user');
  await anna.getByTestId('invite-scope').selectOption('keszlet');
  await anna.getByTestId('invite-submit').click();
  await anna.getByTestId('invite-result').waitFor();
  const meghivoSzoveg = (await anna.getByTestId('invite-result').textContent()) || '';
  mert(/A meghívó elkészült/.test(meghivoSzoveg) && !/elküldtük|kiküldtük/i.test(meghivoSzoveg),
    `a 8. lépés küldést állít, holott nem küldtünk levelet: „${meghivoSzoveg}"`);
  await shot(anna, '8. Felhasználó meghívása', {
    mit: 'A Beállítások → Felhasználók oldalon nyomja meg a „Felhasználó meghívása" gombot, adja meg a címet és a szerepkört.',
    siker: 'A panel visszaigazolja, hogy a meghívó ELKÉSZÜLT, és megmondja, meddig érvényes. Nem azt írja, hogy „elküldtük" — ebben a bemutatóban valódi levél nem megy ki, a levél a Próbaüzenetek panelen nyitható meg.',
    muszaki: 'DLG-01 továbbadási plafon (a meghívás NEM adatjog) · KUKA-199 · R81 §5/07 (küldést csak tényleges kézbesítésnél írunk)',
  });

  // A TERV SZERINTI KÖZVETLEN ÚT (R81 §8): a meghívó elkészülte után EGY gomb visz a levélhez.
  await anna.getByTestId('invite-mail-open').click();
  await anna.getByTestId('mailbox').waitFor();
  const meghivoLink = await levelHivatkozas(anna, 'Meghívás');
  await anna.locator('[data-action="panel-close"]').last().click();

  // ── 9. BÉLA MEGKAPJA A MEGHÍVÓT ─────────────────────────────────────────────────────────────
  const ctxB = await ujContext();
  const bela = await ctxB.newPage();
  await regisztral(bela, BELA);
  await levelek(bela);
  const belaVerify = await levelHivatkozas(bela, 'Erősítsd meg');
  await bela.goto(belaVerify);
  await bela.getByTestId('verify-back').click();
  await belep(bela, BELA);
  await bela.goto(meghivoLink);
  await bela.getByTestId('invite-redeem').waitFor();
  await shot(bela, '9. Béla megnyitja a meghívót', {
    mit: 'Béla a saját böngészőjében, a saját fiókjával nyitja meg a meghívó hivatkozását.',
    siker: 'A meghívás önálló, középre helyezett kártyaként jelenik meg, és a fő gomb a „Meghívás elfogadása". Ha valaki más címmel van bejelentkezve, a lap a bejelentkezéshez irányítja — és nem árulja el, kihez tartozik a cím.',
    muszaki: 'observeInvite (a megfigyelés csak a CSATORNÁT bizonyító nézőnek mond többet) · KUKA-084 · H06/H09',
  });

  await bela.getByTestId('invite-redeem').click();
  await bela.getByTestId('global-notice').waitFor();
  await menu(bela, 'stock');
  await bela.getByTestId('stock-denied').waitFor();
  await shot(bela, '10. Csatlakozott — de az adatokhoz még nincs joga', {
    mit: 'Fogadja el a meghívást, majd nyissa meg a Riportok → Készletegyenleg oldalt.',
    siker: 'A fejlécben megjelenik a vállalkozás, a készlet helyén pedig egy nyugodt állapotkártya: „A készletadatokhoz még nincs hozzáférésed". Ez nem hiba: a tagság és az adatok megtekintése KÉT külön engedély.',
    muszaki: 'a tagság és a scope_grant két külön tény · KUKA-199 · a mintaadat is a VALÓDI mag jogához kötött (UX-20)',
  });

  // ── 10. ANNA MEGADJA AZ OLVASÁSI JOGOT ──────────────────────────────────────────────────────
  const belaId = (await (await ctxB.request.get(`${base}/api/me`)).json()).subject_id;
  await anna.reload();
  await menu(anna, 'members');
  await anna.getByTestId(`member-${belaId}`).waitFor();
  await shot(anna, '11. A felhasználók listája', {
    mit: 'Nézze meg a Beállítások → Felhasználók táblázatot: ki milyen szerepkörben van, és melyik adatkört láthatja.',
    siker: 'A sor HÁROM külön dolgot mond: a szerepkört, a két adatkör engedélyét („Nincs engedélyezve" / „Megtekintheti") és a tagság állapotát („Aktív" / „Megszüntetve").',
    muszaki: 'UX-10 (tagság · adatjog · csomag három külön állapot) · a jogot minden esetben a szerver dönti el',
  });

  await anna.getByTestId(`member-open-${belaId}`).click();
  await anna.getByTestId(`member-scope-select-${belaId}`).selectOption('keszlet');
  await anna.getByTestId(`member-scope-${belaId}`).click();
  await anna.getByTestId('members-result').waitFor();
  const jogSzoveg = (await anna.getByTestId('members-result').textContent()) || '';
  mert(/mostantól megtekintheti a készletadatokat/.test(jogSzoveg), `a 12. lépés mondata nem nevezi meg a tárgyat: „${jogSzoveg}"`);
  await shot(anna, '12. A készletadatok megtekintésének engedélyezése', {
    mit: 'Kattintson a felhasználó sorában a „Hozzáférés" gombra, válassza ki az adatkört, és engedélyezze.',
    siker: 'A visszajelzés megnevezi, KI és MIT tekinthet meg mostantól, a táblázat sora pedig „Megtekintheti"-re vált.',
    muszaki: 'DLG-01 · scope_grant sor (granter = a bejelentkezett kezelő) · KTX-03: a gomb a SAJÁT nézetének alanyát és könyvét viszi',
  });

  await menu(bela, 'stock');
  await bela.getByTestId('data-stock-btn').click();
  await bela.getByTestId('stock-table').waitFor();
  const tabla = (await bela.getByTestId('stock-table').textContent()) || '';
  mert(/Nem ismert/.test(tabla) && /Becsült/.test(tabla) && /Egység nincs megadva/.test(tabla),
    'a 13. lépés táblája nem viszi a mennyiség három állapotát');
  await shot(bela, '13. Béla látja a készletet', {
    mit: 'Béla oldalán nyomja meg a „Frissítés" gombot a Készletegyenleg oldalon.',
    siker: 'Ugyanaz a gomb most táblázatot ad: termék, raktár, mennyiség, egység és a mennyiség jellege. Az ISMERETLEN mennyiség nem nulla — külön szó jelöli —, és a különböző mértékegységű mennyiségeket nem adjuk össze. Az árak külön engedélyt igényelnek.',
    muszaki: 'UX-19 (mért · becsült · nem ismert) · R19 QNT · a „db" egységet SOHA nem találjuk ki egy egység nélküli válaszhoz',
  });

  // ── 11. A CÉGES HOZZÁFÉRÉS MEGSZÜNTETÉSE ────────────────────────────────────────────────────
  await anna.getByTestId(`member-open-${belaId}`).click();
  await anna.getByTestId(`member-revoke-${belaId}`).click();
  await anna.getByTestId('revoke-confirm').waitFor();
  const megerosites = (await anna.getByTestId('panel-body').textContent()) || '';
  mert(megerosites.includes(BELA) && /Családi Műhely Kft/.test(megerosites) && /története megmarad/.test(megerosites),
    `a 14. lépés megerősítése nem viszi a nevet, a fiókot és a következményt: „${megerosites}"`);
  await shot(anna, '14. Céges hozzáférés megszüntetése — megerősítéssel', {
    mit: 'A felhasználó paneljén válassza a „Céges hozzáférés megszüntetése" gombot.',
    siker: 'A megerősítő kérdés megnevezi a SZEMÉLYT, a FIÓKOT és a KÖVETKEZMÉNYT is: a felhasználó saját fiókja és a korábbi műveletek története megmarad. Ez a teljes céges hozzáférést érinti, nem egyetlen adatkört.',
    muszaki: 'UX-12 · K09 bitemporális megvonás (esemény, nem sor-törlés) · a megerősítés NEM ad jogot — a szerver kapuja változatlanul dönt',
  });

  await anna.getByTestId('revoke-confirm').click();
  await anna.getByTestId('members-result').waitFor();
  // BÉLA A NYITOTT KÉPERNYŐJÉN FRISSÍT: a lap ilyenkor a szerverhez igazítja a nézetet, és MÉRT
  // tényt közöl (a fiók eltűnt a listájából). Teljes újratöltés után ez a TÖRTÉNET már nem
  // bizonyítható — ott a lap csak annyit tud: nincs megnyitott fiók (UX-16: bizonyítatlan okot
  // nem tulajdonítunk).
  await bela.getByTestId('data-stock-btn').click();
  await bela.getByTestId('global-notice').waitFor();
  const belaKozles = (await bela.getByTestId('global-notice').textContent()) || '';
  mert(/Megszűnt a hozzáférésed/.test(belaKozles), `a 15. lépés közlése nem a megszűnt hozzáférésről szól: „${belaKozles}"`);
  await shot(bela, '15. Béla oldalán a következmény', {
    mit: 'Béla frissíti az oldalt.',
    siker: 'A lap kimondja, hogy megszűnt a hozzáférése a vállalkozás fiókjához, és felkínálja a folytatást: a személyes fiókja továbbra is használható. A céges fiók kikerül a választóból.',
    muszaki: 'UX-13 · H09 (a megvonás az ÚJ kérésen hatályos) · SZK-01 (a személyes fiók megmarad) · a közlés csak MÉRT tényt állít (UX-16)',
  });

  // ── 12. HIBÁS ADÓAZONOSÍTÓ ──────────────────────────────────────────────────────────────────
  await nyitFiokValaszto(anna);
  await anna.getByTestId('ws-add').click();
  await anna.getByTestId('ws-name').fill('Elgépelt Kft');
  await anna.getByTestId('ws-jurisdiction').selectOption('HU');
  await anna.getByTestId('ws-tax-id').fill('---');
  await anna.getByTestId('ws-create').click();
  await anna.waitForFunction(() => (document.querySelector('[data-testid="ws-tax-error"]')?.textContent || '').trim().length > 0);
  const mezoHiba = (await anna.getByTestId('ws-tax-error').textContent()) || '';
  const osszegzes = (await anna.getByTestId('ws-create-result').textContent()) || '';
  mert(/Add meg az adóazonosítót/.test(mezoHiba) && /még nem hoztuk létre/.test(osszegzes) && !/internal_error/i.test(osszegzes),
    `a 16. lépés nem a mezőhöz kötött hibát mutatja: „${mezoHiba}" / „${osszegzes}"`);
  await shot(anna, '16. Hibás adóazonosító', {
    mit: 'Próbálja meg úgy hozzáadni a vállalkozást, hogy az adószám mezőbe csak kötőjeleket ír.',
    siker: 'A hiba A MEZŐNÉL jelenik meg („Add meg az adóazonosítót. Csak szóköz vagy kötőjel nem elegendő."), a mező jelölve van, és felül egy rövid mondat mondja meg, hogy a vállalkozás még nem jött létre. A már kitöltött mezők megmaradnak, és az aktív fiók nem változik.',
    muszaki: 'UX-14 · R77/F77-02 (a korábbi alak HTTP 500-at adott és félkész könyvet hagyott) · PRV-01 atomi indítás · a séma ÍRÁS ELŐTT utasít el',
  });

  // ── 13. KÉT BÖNGÉSZŐFÜL, EGY BÖNGÉSZŐ ───────────────────────────────────────────────────────
  const me = await (await ctxA.request.get(`${base}/api/me`)).json();
  const szemelyes = (me.workspaces || []).find((w) => w.personal);
  const masodikLap = await ctxA.newPage();
  await masodikLap.goto('/');
  await nyitFiokValaszto(masodikLap);
  await masodikLap.getByTestId(`ws-switch-${szemelyes.book_id}`).click();
  await masodikLap.getByTestId('global-notice').waitFor();
  await anna.bringToFront();
  await menu(anna, 'stock').catch(() => {});
  await anna.getByTestId('data-stock-btn').click();
  await anna.waitForFunction(() => {
    const n = document.querySelector('[data-testid="global-notice"]');
    return !!(n && !n.hidden && (n.textContent || '').trim().length > 0);
  });
  const fejlec = (await anna.getByTestId('header-workspace').textContent()) || '';
  const mondat = (await anna.getByTestId('global-notice').textContent()) || '';
  mert(fejlec.includes(szemelyes.name) && /fiókot váltottál|Megnyitva/.test(mondat),
    `a 17. lépés nem az együtt mozduló képet mutatja — fejléc: „${fejlec}" · mondat: „${mondat}"`);
  await shot(anna, '17. Másik böngészőfülön fiókot váltottak', {
    mit: 'Nyisson egy MÁSIK fület ugyanabban a böngészőben, ott váltson másik fiókra, majd térjen vissza az első fülre, és kérjen adatot.',
    siker: 'Az első fül nem mutat kevert képet: a fejléc és az adat EGYÜTT mozdul, és a lap kimondja, hogy időközben másik fiókra váltott. A korábbi nézetben hagyott gombok nem írnak a másik fiók nevében.',
    muszaki: 'KTX-01/02/03 nézet-kötés (`expected_book_id` + `expected_subject_id`) · R77/F77-01 · R79/F79-02 · KUKA-204 · KUKA-208',
  });
  await masodikLap.close();

  // ── 14. TELEFON-MÉRETŰ KÉPERNYŐ ─────────────────────────────────────────────────────────────
  await anna.setViewportSize({ width: 390, height: 844 });
  await menu(anna, 'overview').catch(() => {});
  await anna.getByTestId('nav-toggle').waitFor();
  await shot(anna, '18. Telefon-méretű képernyőn', {
    mit: 'Nyissa meg ugyanezt az oldalt keskeny (telefon-méretű) ablakban.',
    siker: 'A bal menü gombbá csukódik, de nem tűnik el; a fiókváltó és a saját profil a fejlécben marad, és a fő művelet gombja a képernyőn belül áll. Vízszintesen nem kell görgetni.',
    muszaki: 'UX-17 (390×844 és 1440×900) · a töréspontok a közös stíluslapban: 1000 px és 760 px',
  });
  await anna.setViewportSize(KEPERNYO);

  const finished = new Date().toISOString();
  const kozosStilus = `
 :root { --ink:#0f172a; --muted:#475569; --line:#e2e8f0; --card:#ffffff; --bg:#f8fafc; --accent:#1d4ed8; --chip:#eef2f7; }
 @media (prefers-color-scheme: dark) {
   :root:not([data-theme="light"]) { color-scheme: dark; --ink:#e2e8f0; --muted:#94a3b8; --line:#1e293b; --card:#0f172a; --bg:#020617; --accent:#93b4fd; --chip:#111c33; }
 }
 :root[data-theme="dark"] { color-scheme: dark; --ink:#e2e8f0; --muted:#94a3b8; --line:#1e293b; --card:#0f172a; --bg:#020617; --accent:#93b4fd; --chip:#111c33; }
 body { margin:0; font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; color:var(--ink); background:var(--bg); }
 main { max-width: 1000px; margin: 0 auto; padding: 24px 16px 64px; }
 h1 { font-size: 26px; margin: 0 0 6px; line-height:1.25; } h2 { font-size: 19px; margin: 28px 0 6px; }
 .lead { color: var(--muted); }
 .step { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px; margin:18px 0; }
 .step img { width:100%; border:1px solid var(--line); border-radius:8px; margin-top:10px; background:#fff; }
 .mit, .siker { margin:8px 0; }
 .mit strong, .siker strong { color: var(--accent); }
 .ev { font-size:13px; color:var(--muted); margin-top:8px; }
 code { background:var(--chip); padding:1px 5px; border-radius:4px; font-size:14px; }
 .box { background:var(--card); border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:8px; padding:14px 16px; margin:18px 0; }
 a { color: var(--accent); }
 table { border-collapse:collapse; width:100%; font-size:14px; }
 th, td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
 pre.cmd { background:var(--chip); border:1px solid var(--line); border-radius:8px; padding:12px 14px; overflow-x:auto; font-size:13px; line-height:1.55; }
 pre.cmd code { background:none; padding:0; font-size:13px; }`;

  // ── A FELHASZNÁLÓI BEMUTATÓ ─────────────────────────────────────────────────────────────────
  const demoHtml = `<!doctype html>
<html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>V3 — felhasználói bemutató</title><style>${kozosStilus}</style></head><body><main>
<h1>V3 — mit tud ma a rendszer?</h1>
<p class="lead">Végigmegyünk egy teljes történeten: Anna létrehozza a fiókját, hozzáadja a családi vállalkozását,
meghívja Bélát, külön engedélyezi neki a készletadatok megtekintését, Béla megnézi a készletet, végül Anna
megszünteti Béla céges hozzáférését. Minden lépésnél ott van, <strong>mit próbálhat ki</strong>, és
<strong>miből látja, hogy sikerült</strong>.</p>
<div class="box">
<p><strong>Ehhez a laphoz semmit nem kell telepítenie.</strong> Nincs szükség terminálra, Gitre vagy Node-ra:
ez egy önálló HTML fájl, amit bármelyik böngésző megnyit, internet nélkül is. A képek egy VALÓDI futásból
készültek, nem rajzok.</p>
<p><strong>Ami ezen a lapon minta:</strong> a termékek, partnerek, raktárak és bizonylatok kitalált sorok, hogy a
képernyők elrendezése érthető legyen — a felületen ezek külön jelölve vannak („Bemutató · mintaadatok”).
<strong>Ami viszont valódi:</strong> a regisztráció, a megerősítés, a belépés, a fiókváltás, a meghívás, a
jogosultság-adás és a hozzáférés megszüntetése — ezek a rendszer saját szabályain futnak.</p>
<p><strong>Valódi levél nem megy ki.</strong> A megerősítő és meghívó levelek a bemutató „Próbaüzenetek” paneljébe
érkeznek.</p>
</div>
<p class="lead">Készült: ${esc(started.slice(0, 16).replace('T', ' '))} · ${shots.length} képernyő · verzió ${esc(VERSION)}</p>
${shots.map((s) => `<div class="step"><h2>${esc(s.title)}</h2>
<p class="mit"><strong>Mit próbálhat ki:</strong> ${esc(s.mit)}</p>
<p class="siker"><strong>Miből látja a sikert:</strong> ${esc(s.siker)}</p>
<img alt="${esc(s.title)}" src="data:${s.mime};base64,${s.png}"></div>`).join('\n')}
<div class="box"><p><strong>Amit ez a lap NEM állít.</strong> Ez nem üzemi rendszer és nem kész üzleti modul:
készletmozgás, könyvelés és számlázás nem tartozik hozzá. A műszaki részletek — forráscommit, futási
eredmények, nyitott tételek — a külön <em>műszaki mellékletben</em> állnak, hogy ez a lap olvasható maradjon.</p></div>
</main></body></html>`;

  // ── A MŰSZAKI MELLÉKLET ─────────────────────────────────────────────────────────────────────
  const techHtml = `<!doctype html>
<html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>V3 — műszaki melléklet</title><style>${kozosStilus}</style></head><body><main>
<h1>V3 — műszaki melléklet</h1>
<p class="lead">A felhasználói bemutató párja: forrás, futtatás, szerződés-azonosítók és a NEVEZETT hiányok.
Ezek szándékosan nem szerepelnek a felhasználói lapon.</p>
<div class="box">
<p><strong>A forrás, amiből ez készült:</strong> ág <code>${esc(GIT.branch || '—')}</code> · commit
<code>${esc(GIT.commit || '—')}</code>${GIT.dirty === false
  ? ' · a munkafa TISZTA volt — a képek pontosan ehhez a commithoz tartoznak'
  : GIT.dirty === true
    ? ' · <strong>a munkafán COMMITOLATLAN változások álltak</strong>, a képek tehát nem köthetők karakterre ehhez a commithoz'
    : ''}.</p>
<p>Készült: ${esc(started)} – ${esc(finished)} · verzió: ${esc(VERSION)} · ${shots.length} képernyő ·
képernyőméret: ${KEPERNYO.width}×${KEPERNYO.height}${JPEG ? ' · TÖMÖR (JPEG) változat' : ''}.</p>
</div>
<h2>Helyi indítás — ha valaki a saját gépén is ki akarja próbálni</h2>
<div class="box">
<p><strong>Előfeltételek</strong> (a felhasználói bemutatóhoz EGYIK SEM kell, csak ehhez a helyi futtatáshoz):
<strong>Node 22.5 vagy újabb</strong> (<code>node -v</code>) · <strong>Git</strong> (<code>git --version</code>) ·
<strong>hozzáférés a repóhoz</strong> (a repó nem nyilvános).</p>
<p>Öt sor, egyben másolható. A klón ÚJ, a commit rövid azonosítójáról elnevezett mappába megy, tehát meglévő
mappát nem ír felül, és a mai munkamásolatot nem érinti. A harmadik sor a <strong>PONTOS commitra</strong> állítja
a másolatot — így pontosan ezt a bemutatót kapja vissza:</p>
<pre class="cmd"><code>cd ~/Downloads
git clone https://github.com/valach-family/valach-system.git v3-proba-${esc((GIT.commit || 'ismeretlen').slice(0, 8))}
cd v3-proba-${esc((GIT.commit || 'ismeretlen').slice(0, 8))}
git checkout ${esc(GIT.commit || '')}
node v3app/server.mjs</code></pre>
<p><strong>Az ÖTÖDIK sor</strong> (<code>node v3app/server.mjs</code>) indítja a szervert, és ez írja ki a címet:
<code>http://127.0.0.1:3300/</code> — ezt kell megnyitni a böngészőben. A bemutató levelei a felületen, a
<strong>Próbaüzenetek</strong> panelből olvashatók. A leállítás: <strong>Ctrl + C</strong>. A próba adatai egy
eldobható fájlban élnek a letöltött mappán belül (<code>var/tmp/</code>) — a törléshez elég a letöltött mappát kidobni.</p>
<p><strong>Ami nyilvánosan nincs kitéve, és nem is lesz:</strong> a bemutató levél-fogadója hitelesítés nélkül
mutatná a kimenő leveleket, ezért nincs megosztható, nyilvános cím. A felület fejlesztői felülete kapcsoló mögött
áll: kikapcsolva a végpont NEM LÉTEZIK (HTTP 404), nem „letiltva".</p>
</div>
<h2>Lépésenkénti szerződés- és próba-azonosítók</h2>
<table><thead><tr><th>Lépés</th><th>Amit a lépés bizonyít</th></tr></thead><tbody>
${shots.map((s) => `<tr><td>${esc(s.title)}</td><td>${esc(s.muszaki)}</td></tr>`).join('\n')}
</tbody></table>
<h2>Mi futott le ehhez a csomaghoz</h2>
<table><thead><tr><th>Parancs</th><th>Mit mér</th></tr></thead><tbody>
<tr><td><code>npm run app:selfcheck</code></td><td>a héj és a mag szerződéseinek HTTP-szintű önellenőrzése</td></tr>
<tr><td><code>npm run verify:app-findings</code></td><td>az R75 leletei (semleges regisztráció · folytatás lejárt hivatkozásnál · séma a határon)</td></tr>
<tr><td><code>npm run verify:app-findings-r77</code></td><td>az R77 leletei (nézet-kötés az olvasáson · atomi indítás hibás adószámnál)</td></tr>
<tr><td><code>npm run verify:app-findings-r79</code></td><td>az R79 leletei (a hiányzó kontextus-mező NEM egyezés · alany+könyv az íráson)</td></tr>
<tr><td><code>npm run proof:core-ux</code></td><td>böngésző-próbák: az R63 tizennégy elfogadási helyzete + az R81 huszonkét UX-feltétele</td></tr>
<tr><td><code>npm run verify:kuka</code></td><td>a visszacsúszás-tiltó minták (a korábbi hibák nem épülhetnek újra)</td></tr>
</tbody></table>
<div class="box"><p><strong>Amit ez a csomag NEM állít.</strong> Nem üzemi rendszer: nincs telepítés, nincs
adatbázis-migráció, nincs valódi levélküldés, és a teljes core-lezárás nincs elfogadva. A termékek, partnerek,
raktárak és bizonylatok listája BEMUTATÓ — szintetikus sorok, üzleti modul nélkül. A nyitott tételeket a kör
REPORT-ja sorolja fel nevesítve.</p></div>
</main></body></html>`;

  writeFileSync(demoPath, demoHtml);
  writeFileSync(techPath, techHtml);
  console.log(`\nKÉSZ:`);
  console.log(`  felhasználói bemutató: ${demoPath} · ${(demoHtml.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  műszaki melléklet:     ${techPath} · ${(techHtml.length / 1024).toFixed(0)} kB`);
  console.log(`  ${shots.length} képernyő`);
} finally {
  await browser.close();
  await app.close();
  for (const suffix of ['', '-wal', '-shm']) { if (existsSync(dbPath + suffix)) rmSync(dbPath + suffix, { force: true }); }
}
