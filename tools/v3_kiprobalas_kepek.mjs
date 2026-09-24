#!/usr/bin/env node
// tools/v3_kiprobalas_kepek.mjs — KÉPERNYŐ-BIZONYÍTÉK A KIPRÓBÁLHATÓ ÁTADÁSHOZ (R75 §4).
//
// MIÉRT VAN EZ. Az operátor nem futtat repót, és a próba-alkalmazásnak NINCS megosztható, nyilvános
// címe (nincs telepítés, és a fejlesztői levél-fogadót nyilvánosan kitenni nem szabad). A szállítás
// ezért KÉT alakban megy: (1) EGY parancs, amit a saját gépén elindíthat, ha akarja; (2) EZ a lap —
// a VALÓDI felületről, VALÓDI böngészőben készült képernyőkkel, a felhasználó útjának sorrendjében.
// Amit a címzett nem tud megnyitni, azt nem szállítottuk le (KUKA-079).
//
// A KÉPEK A VALÓDI FUTÁSBÓL JÖNNEK: a szerver itt indul (saját, eldobható tárolóval), a lépéseket
// egy Chromium kattintja végig, és minden kép ALÁ odakerül, mi történt és mi a bizonyítéka. Nem
// montázs és nem rajz — ha a lépés elakadna, a futtató PIROS lesz, nem szépít (KUKA-041).
//
// Kimenet: egy ÖNÁLLÓ HTML lap (a képek beágyazva), a `var/reports` alatt, a közös névképzővel
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
 * A LAP KÖTÖTT FORRÁSA (R77 §5). Egy képernyő-lap önmagában nem mondja meg, MIBŐL készült — ezért a
 * fejléc a git-állapotot viszi: ÁG · COMMIT · tiszta-e a munkafa. Ha a munkafa nem tiszta, azt a lap
 * KIMONDJA (nem „a commithoz tartozik" — az a bizonyíték hamisítása lenne, KUKA-122).
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

async function shot(page, title, what, evidence) {
  const buf = await page.screenshot({ fullPage: true, ...(JPEG ? { type: 'jpeg', quality: 72 } : {}) });
  shots.push({ title, what, evidence, png: buf.toString('base64'), mime: JPEG ? 'image/jpeg' : 'image/png' });
  console.log(`kép ${shots.length}: ${title}`);
}

const dbPath = resolve(ROOT, artifactPath({ area: 'tmp', kind: 'v3app_kiprobalas', ext: 'sqlite', version: VERSION }));
const outPath = resolve(ROOT, artifactPath({ area: 'reports', kind: JPEG ? 'v3app_kiprobalas_kepek_tomor' : 'v3app_kiprobalas_kepek', ext: 'html', version: VERSION }));
const app = await startServer({ port: 0, dbPath });
const base = `http://127.0.0.1:${app.port}`;
const browser = await chromium.launch();
const started = new Date().toISOString();

try {
  const ctxA = await browser.newContext({ baseURL: base, viewport: { width: 1100, height: 900 }, locale: 'hu-HU' });
  const anna = await ctxA.newPage();
  const ANNA = 'anna@pelda.hu';
  const BELA = 'bela@pelda.hu';
  const JELSZO = 'proba-jelszo-2026';

  // ── 1. REGISZTRÁCIÓ ──────────────────────────────────────────────────────────────────────────
  await anna.goto('/');
  await anna.getByTestId('register-email').fill(ANNA);
  await anna.getByTestId('register-password').fill(JELSZO);
  await anna.getByTestId('register-submit').click();
  await anna.getByTestId('register-result').waitFor();
  await anna.getByTestId('mailbox-refresh').click();
  await shot(anna, '1. Anna regisztrál', 'A válasz SEMLEGES: ugyanazt mondja, akár szabad a cím, akár foglalt — nem árulja el, ki van már a rendszerben. A megerősítő levél a fejlesztői levél-fogadóban áll (valódi levél SOHA nem megy ki).', 'K03 anti-enumeráció · npm run verify:app-selfcheck');

  const firstLink = await anna.locator('li[data-testid^="mail-"] a[data-testid^="mail-link-"]').first().getAttribute('href');

  // ── 2. A LEJÁRT HIVATKOZÁS — ÉS A FOLYTATÁS (F75-01) ────────────────────────────────────────
  await anna.request.post(`${base}/dev/clock`, { data: { advance_ms: 25 * 3600 * 1000 } });
  await anna.goto(firstLink);
  await shot(anna, '2. A hivatkozás LEJÁRT — de nem zsákutca', 'Az óra 25 órával előre (fejlesztői óra, nem vártunk egy napot). A lap KIMONDJA, mi történt, és FOLYTATÁST ad: „Új hivatkozás kérése". A korábbi alak itt azt írta: „regisztrálj újra" — ami nem működött, mert a cím már foglalt volt.', 'R75/F75-01 · KUKA-201 · npm run verify:app-findings');

  await anna.getByTestId('verify-resend-link').click();
  await anna.getByTestId('resend-email').fill(ANNA);
  await anna.getByTestId('resend-submit').click();
  await anna.getByTestId('resend-result').waitFor();
  await anna.getByTestId('mailbox-refresh').click();
  await shot(anna, '3. Új megerősítő hivatkozás kérése', 'A válasz itt is SEMLEGES, a jelszó NEM változik, és a korábbi hivatkozás érvénytelenné válik (egy címre egy élő hivatkozás). Rövid időn belül ismételve nem megy újabb levél.', 'CHR-01 · ismétlés-korlát: legalább 60 mp, ablakonként legfeljebb 5');

  const secondLink = await anna.locator('li[data-testid^="mail-"]').filter({ hasText: 'Új megerősítő' }).first()
    .locator('a[data-testid^="mail-link-"]').getAttribute('href');
  await anna.goto(secondLink);
  await shot(anna, '4. Az ÚJ hivatkozás működik', 'A cím bizonyítva — és ezzel megszületett Anna SZEMÉLYES KÖRE. Nem kell „céget" alapítania ahhoz, hogy legyen hova belépnie.', 'SZK-01 (R64 L11 zárása)');

  // ── 3. BELÉPÉS — A SZEMÉLYES KÖR A VÁLTÓBAN ────────────────────────────────────────────────
  await anna.getByTestId('verify-back').click();
  await anna.getByTestId('login-email').fill(ANNA);
  await anna.getByTestId('login-password').fill(JELSZO);
  await anna.getByTestId('login-submit').click();
  await anna.getByTestId('header-acting-as').waitFor();
  await shot(anna, '5. Belépés: a személyes kör készen áll', 'A fejléc KIMONDJA, ki nevében jár el („személyes kör"), a váltóban pedig nevesítve áll a kör fajtája. Az EREDETI jelszó működik — az új hivatkozás kérése nem nyúlt hozzá.', 'L11 · a fejléc „ki nevében jársz el" mondata');

  // ── 4. CSALÁDI KFT — ÖNBEVALLOTT ADÓSZÁM, KIMONDOTT HATÁRRAL ───────────────────────────────
  await anna.getByTestId('ws-name').fill('Családi Kft');
  await anna.getByTestId('ws-plan').selectOption('pro');
  await anna.getByTestId('ws-business').check();
  await anna.getByTestId('ws-jurisdiction').selectOption('HU');
  await anna.getByTestId('ws-tax-id').fill('12345678-2-42');
  await anna.getByTestId('ws-create').click();
  await anna.getByTestId('ws-create-result').waitFor();
  await shot(anna, '6. A családi vállalkozás köre elindul', 'Az adószám ÖNBEVALLOTT ÁLLÍTÁS, nem hatósági igazolás — és a képernyő ezt kimondja. A saját kör indításához elég; MÁS szervezet nevében eljárni ebből nem következik.', 'REP-01 (R64 L2) · a képviseleti határ a felületen is');

  // ── 5. BÉLA MEGHÍVÁSA ──────────────────────────────────────────────────────────────────────
  await anna.getByTestId('invite-email').fill(BELA);
  await anna.getByTestId('invite-role').selectOption('user');
  await anna.getByTestId('invite-scope').selectOption('keszlet');
  await anna.getByTestId('invite-submit').click();
  await anna.getByTestId('invite-result').waitFor();
  await anna.getByTestId('mailbox-refresh').click();
  await shot(anna, '7. Anna meghívja Bélát', 'A meghívó a TÁRGYAT mondja meg (szerep + adatkör), a JOGOT viszont nem adja: azt a kezelő külön lépésben adja meg a beváltás után. A meghívó levél a fogadóban áll.', 'DLG-01 · KUKA-199 (a plafon nem jog)');

  const inviteLink = await anna.locator('li[data-testid^="mail-"]').filter({ hasText: 'Meghívás' }).first()
    .locator('a[data-testid^="mail-link-"]').getAttribute('href');

  // ── 6. BÉLA: SAJÁT FIÓK, SAJÁT BÖNGÉSZŐ ────────────────────────────────────────────────────
  const ctxB = await browser.newContext({ baseURL: base, viewport: { width: 1100, height: 900 }, locale: 'hu-HU' });
  const bela = await ctxB.newPage();
  await bela.goto('/');
  await bela.getByTestId('register-email').fill(BELA);
  await bela.getByTestId('register-password').fill(JELSZO);
  await bela.getByTestId('register-submit').click();
  await bela.getByTestId('mailbox-refresh').click();
  const belaVerify = await bela.locator('li[data-testid^="mail-"]').filter({ hasText: BELA }).filter({ hasText: 'Erősítsd meg' }).first()
    .locator('a[data-testid^="mail-link-"]').getAttribute('href');
  await bela.goto(belaVerify);
  await bela.getByTestId('verify-back').click();
  await bela.getByTestId('login-email').fill(BELA);
  await bela.getByTestId('login-password').fill(JELSZO);
  await bela.getByTestId('login-submit').click();
  await bela.getByTestId('header-acting-as').waitFor();
  await bela.goto(inviteLink);
  await bela.getByTestId('invite-observe').waitFor();
  await shot(bela, '8. Béla megkapja a meghívót', 'Béla SAJÁT fiókkal, saját böngészőben. A lap megmondja, mi a következő lépés — és csak akkor ad Beváltás gombot, ha a meghívás tényleg beváltható (lejárt vagy visszavont meghívóra nem ígér semmit).', 'observeInvite · H06/H09');

  await bela.getByTestId('invite-redeem').click();
  // A SIKERES beváltás UTÁN a lap az EGÉSZ meghívó-szakaszt elrejti (a munka kész) — a visszaigazolás
  // a globális sávban áll, tehát arra várunk, nem a rejtett dobozra.
  await bela.getByTestId('global-notice').filter({ hasText: 'Meghívó beváltva' }).waitFor();
  await bela.getByTestId('data-stock-btn').click();
  await bela.getByTestId('data-stock').waitFor();
  await shot(bela, '9. Beváltva — de adat még NINCS', 'A tagság megszületett, a váltóban ott a SZEMÉLYES köre ÉS a Családi Kft. Az adat viszont NEM jár automatikusan: a készlet-nézet nevezetten elutasítva, amíg az admin külön meg nem adja a jogot.', 'KUKA-199 · a két kapu külön mér');

  // ── 7. ANNA KÜLÖN ADATKÖRT AD ──────────────────────────────────────────────────────────────
  const belaId = (await (await ctxB.request.get(`${base}/api/me`)).json()).subject_id;
  await anna.reload();
  await anna.getByTestId(`member-${belaId}`).waitFor();
  await anna.getByTestId(`member-scope-select-${belaId}`).selectOption('keszlet');
  await anna.getByTestId(`member-scope-${belaId}`).click();
  await anna.getByTestId('members-result').waitFor();
  await shot(anna, '10. Az admin KÜLÖN megadja az olvasási jogot', 'Ez az a kimondott lépés, ami nélkül a tagság nem lát adatot. A sor mutatja, kinek mije van — és a megvonás gombja is itt áll.', 'DLG-01 · scope_grant');

  await bela.getByTestId('data-stock-btn').click();
  await bela.getByTestId('data-stock').waitFor();
  await shot(bela, '11. Béla készlet-nézete: KIADVA', 'A jog megadása után ugyanaz a gomb már kiadja az adatot. Az ÁR-nézet viszont nem következik belőle — az külön adatkör, és a terv (előfizetés) külön kapu.', 'két kapu: jog · előfizetés (H07 · H11)');

  // ── 8. MEGVONÁS ────────────────────────────────────────────────────────────────────────────
  await anna.getByTestId(`member-revoke-${belaId}`).click();
  await anna.getByTestId('members-result').waitFor();
  await shot(anna, '12. Megvonás', 'A megvonás ESEMÉNY, nem sor-törlés: a történet megmarad, a hatás viszont azonnal érvényes az ÚJ kéréseken.', 'K09 · bitemporális megvonás');

  await bela.getByTestId('data-stock-btn').click();
  await bela.getByTestId('data-stock').waitFor();
  await shot(bela, '13. Béla oldalán a megvonás hatása', 'Az új kérés nevezetten elutasítva („nem tag"), a Családi Kft eltűnt a váltójából — a SZEMÉLYES köre viszont megmaradt: a fiók nem szűnik meg attól, hogy egy cégben már nincs tagsága.', 'H09 · SZK-01');

  // ── 9. AZ R77 KÉT JAVÍTÁSA A FELÜLETEN ─────────────────────────────────────────────────────
  // (a) F77-02: értelmetlen adószámmal a kör EL SEM INDUL — nevezett mondat, nem programhiba.
  await anna.getByTestId('ws-name').fill('Elgépelt Kft');
  const box = anna.getByTestId('ws-business');
  if (!(await box.isChecked())) await box.check();
  await anna.getByTestId('ws-jurisdiction').selectOption('HU');
  await anna.getByTestId('ws-tax-id').fill('---');
  await anna.getByTestId('ws-create').click();
  // A VÁLASZRA VÁRUNK, NEM A DOBOZ MEGLÉTÉRE: a lap üres eredmény-dobozzal is „megvan" (a
  // `waitFor` az ELEMET várja, nem a tartalmát) — a mérés így a saját türelmetlenségét mérné.
  await anna.waitForFunction(() => {
    const el = document.querySelector('[data-testid="ws-create-result"]');
    return !!(el && el.textContent && el.textContent.trim().length > 0);
  });
  // A KÉP NEM ÖNMAGÁBAN BIZONYÍT: a szövegét MEGMÉRJÜK, és ha nem azt mondja, a futtató PIROS
  // (KUKA-041 — díszpipát nem szállítunk).
  const hibaSzoveg = (await anna.getByTestId('ws-create-result').textContent()) || '';
  if (!/business\.tax_id/.test(hibaSzoveg) || /internal_error/i.test(hibaSzoveg)) {
    throw new Error(`a 14. lépés nem a nevezett elutasítást mutatja: ${hibaSzoveg}`);
  }
  await shot(anna, '14. Elgépelt adószám: a kör EL SEM INDUL (R77 javítás)', 'A korábbi alak ilyenkor programhibát adott (HTTP 500), a munkakörnyezet viszont FÉLKÉSZEN megszületett. Most a képernyő megmondja, melyik mező a baj, és a kör, a tagság és az indulási jogok közül EGY sem születik meg — a fejléc is ott marad, ahol volt.', 'PRV-01 (atomi indítás) · verify:app-findings-r77 F77-02 · KUKA-205');

  // (b) F77-01: két lap, KÖZÖS munkamenet — a fejléc és az adat EGYÜTT mozdul.
  const me = await (await ctxA.request.get(`${base}/api/me`)).json();
  const szemelyes = (me.workspaces || []).find((w) => w.personal);
  const masodikLap = await ctxA.newPage();
  await masodikLap.goto('/');
  await masodikLap.getByTestId(`ws-switch-${szemelyes.book_id}`).click();
  await masodikLap.getByTestId('global-notice').waitFor();
  await anna.getByTestId('data-stock-btn').click();
  await anna.waitForFunction(() => {
    const el = document.querySelector('[data-testid="data-stock"]');
    const n = document.querySelector('[data-testid="global-notice"]');
    return !!(el && el.textContent && el.textContent.trim() && el.textContent.trim() !== '…'
      && n && n.textContent && n.textContent.trim().length > 0);
  });
  const fejlec = (await anna.getByTestId('header-workspace').textContent()) || '';
  const mondat = (await anna.getByTestId('global-notice').textContent()) || '';
  const panel = (await anna.getByTestId('data-stock').textContent()) || '';
  if (!fejlec.includes(szemelyes.name) || !/MÁSIK munkakörnyezetre váltottak/.test(mondat) || panel.includes('…')) {
    throw new Error(`a 15. lépés nem az együtt mozduló képet mutatja — fejléc: „${fejlec}" · mondat: „${mondat}" · panel: „${panel}"`);
  }
  await shot(anna, '15. Két böngésző-lap, egy munkamenet (R77 javítás)', 'A MÁSIK lapon átváltottunk a személyes körre. Ezen a lapon a korábbi alak a RÉGI cég fejléce alatt mutatta volna az ÚJ kör adatát. Most a lap a szerver igazságához igazodik: a fejléc és a panel EGYÜTT mozdul, és a képernyő kimondja, hogy időközben máshol váltottak.', 'KTX-02 (a válasz kimondja, kinek szolgált ki) · verify:app-findings-r77 F77-01 · KUKA-204');
  await masodikLap.close();

  const finished = new Date().toISOString();
  const html = `<!doctype html>
<html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>V3 kipróbálható átadás</title>
<style>
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
 .ev { font-size:13px; color:var(--muted); margin-top:8px; }
 code { background:var(--chip); padding:1px 5px; border-radius:4px; font-size:14px; }
 .box { background:var(--card); border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:8px; padding:14px 16px; margin:18px 0; }
 a { color: var(--accent); }
 pre.cmd { background:var(--chip); border:1px solid var(--line); border-radius:8px; padding:12px 14px; overflow-x:auto; font-size:13px; line-height:1.55; }
 pre.cmd code { background:none; padding:0; font-size:13px; }
</style></head><body><main>
<h1>V3 — kipróbálható átadás</h1>
<p class="lead">Anna létrehozza a fiókját, elindítja a családi vállalkozás körét, meghívja Bélát, külön olvasójogot ad,
Béla vált a személyes és a céges nézet között, majd a megvonás hatása is látszik. Egy késői (lejárt) levélből is van helyes folytatás.</p>
<div class="box">
<p><strong>Hol fut ez ma, és hol NEM.</strong> Ez egy <strong>telepítés nélküli próba-alkalmazás</strong> a V3 magreferencia fölött.
<strong>Megosztható, nyilvános cím NINCS</strong> — és ez szándékos: a lapon látható <em>fejlesztői levél-fogadó</em> hitelesítés nélkül
mutatja a kimenő leveleket, azt nyilvánosan kitenni nem szabad. Amit itt lát, az egy VALÓDI futás valódi böngészőben készült képeivel.</p>
</div>
<div class="box">
<p><strong>HA KIPRÓBÁLNÁ A SAJÁT GÉPÉN — ez a pontos út.</strong> Külön mappába tölt le, tehát a meglévő munkamásolatot és a
<code>main</code>-t NEM érinti. Adatbázis, kulcs, internet-hozzáférés a futtatáshoz nem kell (a letöltéshez igen).</p>
<p><strong>Előfeltételek:</strong> <strong>Node 22.5 vagy újabb</strong> (ellenőrzés: <code>node -v</code>; ha régebbi vagy „command not found”,
a <a href="https://nodejs.org/">nodejs.org</a> LTS telepítője elég) · <strong>Git</strong> (<code>git --version</code>) ·
és <strong>hozzáférés a repóhoz</strong> — ugyanaz a GitHub-belépés, amivel a szokásos <code>git pull</code> is megy (a repó nem nyilvános).</p>
<p>Terminálban, sorban (öt sor, egyben másolható). A negyedik sor a <strong>PONTOS commitra</strong> állítja a másolatot,
tehát pontosan ezt a bemutatót kapja vissza — a meglévő munkamásolatát és a <code>main</code>-t nem érinti:</p>
<pre class="cmd"><code>cd ~/Downloads
git clone https://github.com/valach-family/valach-system.git v3-proba
cd v3-proba
git checkout ${esc(GIT.commit || '')}
node v3app/server.mjs</code></pre>
<p>A negyedik sor kiírja a címet: <code>http://127.0.0.1:3300/</code> — ezt nyissa meg a böngészőben. A kimenő levelek
(megerősítés, meghívó) a <code>http://127.0.0.1:3300/dev/mailbox</code> lapon állnak; VALÓDI levél nem megy ki.
A leállítás: a terminálban <strong>Ctrl + C</strong>. A próba adatai egy eldobható fájlban élnek a letöltött mappán belül
(<code>var/tmp/</code>) — a törléshez elég a <code>v3-proba</code> mappát kidobni.</p>
<p><strong>Ez a lap ebből a forrásból készült:</strong> ág <code>${esc(GIT.branch || '—')}</code> · commit
<code>${esc((GIT.commit || '—').slice(0, 12))}</code>${GIT.dirty === false ? ' · a munkafa TISZTA volt (a képek pontosan ehhez a commithoz tartoznak)' : GIT.dirty === true ? ' · <strong>a munkafán COMMITOLATLAN változások álltak</strong> — a képek tehát nem köthetők karakterre ehhez a commithoz' : ''}.</p>
</div>
<p class="lead">Készült: ${esc(started)} – ${esc(finished)} · verzió: ${esc(VERSION)} · ${shots.length} képernyő</p>
${shots.map((s, i) => `<div class="step"><h2>${esc(s.title)}</h2><p>${esc(s.what)}</p>
<img alt="${esc(s.title)}" src="data:${s.mime};base64,${s.png}">
<p class="ev">Bizonyíték: ${esc(s.evidence)}</p></div>`).join('\n')}
<div class="box"><p><strong>Amit ez a lap NEM állít.</strong> Nem üzemi rendszer és nem üzleti modul: a minta-rekordok szintetikusak,
valódi levél nem megy ki, és a teljes core-lezárás nincs elfogadva. Amit állít: a fenti lánc a mag SAJÁT szabályain, valódi
böngészőben végigjárható.</p></div>
</main></body></html>`;
  writeFileSync(outPath, html);
  console.log(`\nKÉSZ: ${outPath}`);
  console.log(`  ${shots.length} képernyő · ${(html.length / 1024 / 1024).toFixed(2)} MB`);
} finally {
  await browser.close();
  await app.close();
  for (const suffix of ['', '-wal', '-shm']) { if (existsSync(dbPath + suffix)) rmSync(dbPath + suffix, { force: true }); }
}
