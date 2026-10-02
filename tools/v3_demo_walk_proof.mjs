#!/usr/bin/env node
// tools/v3_demo_walk_proof.mjs — A BEMUTATÓ VÉGIGJÁRÁSÁNAK ÉLŐ TANÚJA (R138 §1–§3).
//
// MIÉRT VAN EZ. Az R138 §3 elfogadási tanúja szó szerint azt kéri, hogy a SZÁLLÍTOTT előnézetet
// járjuk végig „asztali gépen és ~390 px-en", képekkel, és hogy „mindkét történet kétszer
// újraindítható" legyen. Egy ilyen állítást nem lehet olvasással megtenni: a bemutató azon bukott
// el, amit csak a VÉGIGJÁRÁS mutat meg (R93 §4 ugyanezt kérte, és akkor is a bejárás találta meg a
// buborék-takarást). Ezért a tanú KATTINT, és minden lépést MÉRT állítással zár.
//
// AMIT EZ A TANÚ MÉR — és amit KIMONDOTTAN NEM.
//   MÉR: a SZÁLLÍTOTT lapot (`v3app/public/demo-index.html`) a saját statikus kiszolgálóján, tehát
//        pontosan azt a forrást, ami a csomagban megy; a két történet MINDEN lépését; a VALÓDI
//        gombok megnyomását; és a lépés lezárulását a SZERVER-oldali igazolás után.
//   NEM MÉR, és nem is állít: HTTP- vagy adatbázis-bizonyítékot. A bemutató háttere a
//        `demo-adapter.mjs` (kimondott, jelölt csonk) — az ő zöldje NEM a határ zöldje
//        (KUKA-227 · R138 §3: „NO HTTP/DB evidence claimed from it").
//
// A KAPU-PRÓBÁK (g*) A VALÓDI FÜGGVÉNYT HÍVJÁK, nem a viselkedését utánozzák (KUKA-207): a
// `navIntentFulfilled` feladat-kapujára a történet-bejárás NEM ad fedezetet (mérve: a kapu
// kivétele mellett is zöld maradt a bejárás, mert a feladat-lépés célja nem a bal menüben van).
// Egy nem mért kapu bizalom, nem védelem — ezért hívjuk meg közvetlenül, mindkét irányban.
//
// Kilépési kód: 0 = végigfutott, hibát nem talált · 1 = MÉRT hibát talált · 2 = a mérés elakadt
// (a tanú maga is mérce — a „nem tudtuk megmérni" NEM zöld és nem is „nincs eset", KUKA-094/206).

import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { artifactPath } = require('../contracts/artifactNaming.js');
const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const PUBLIC = join(ROOT, 'v3app', 'public');
const VERSION = '0.1.0';

const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

/** A SZÁLLÍTOTT FÁJLOKAT szolgálja ki, és SEMMI MÁST: a `..` kilépést nevezetten elutasítja. */
function serve() {
  return new Promise((ok) => {
    const srv = createServer(async (req, res) => {
      try {
        const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '') || 'demo-index.html';
        const full = resolve(PUBLIC, rel);
        if (!full.startsWith(PUBLIC)) { res.writeHead(403).end('kilépés a kiszolgált fából'); return; }
        const buf = await readFile(full);
        res.writeHead(200, { 'content-type': TYPES[extname(full)] || 'application/octet-stream' }).end(buf);
      } catch { res.writeHead(404).end('nincs ilyen fájl'); }
    });
    // EFEMER PORT: foglalt porton nem állunk meg és IDEGEN folyamatot nem lövünk ki (D-VS-704).
    srv.listen(0, '127.0.0.1', () => ok(srv));
  });
}

const red = []; const green = [];
function A(name, cond, extra = '') {
  const line = `${name}${extra ? ' — ' + extra : ''}`;
  (cond ? green : red).push(line);
  console.log(`${cond ? 'ZÖLD ' : 'PIROS'} ${line}`);
}

/**
 * A LÉPÉS-LISTA A SZÁLLÍTOTT CSOMAGBÓL — ez a mérés ALAPSOKASÁGA.
 * Ha nem olvasható, az ELAKADT MÉRÉS, nem „nincs lépés" és nem zöld (KUKA-094 · KUKA-206).
 */
const STEPS = await (async () => {
  const raw = await readFile(join(PUBLIC, 'demo-assistant.json'), 'utf8').catch(() => null);
  if (!raw) { console.error('ELAKADT MÉRÉS: a demo-assistant.json nem olvasható.'); process.exit(2); }
  let tours;
  try { tours = JSON.parse(raw).status.tours; } catch (e) {
    console.error('ELAKADT MÉRÉS: a demo-assistant.json nem értelmezhető:', e.message); process.exit(2);
  }
  if (!Array.isArray(tours) || !tours.length) { console.error('ELAKADT MÉRÉS: a csomag egyetlen bemutatót sem deklarál.'); process.exit(2); }
  const out = {};
  for (const t of tours) {
    const key = String(t.id || '').replace(/^tour\./, '');
    out[key] = (t.steps || []).map((x) => ({ id: x.id, target: x.target, task: x.task || null, appears_after: x.appears_after || null }));
  }
  return out;
})();

const STORIES = {
  inviteRevoke: { start: 'demo-story-invite-revoke', cim: '1 · Meghívás visszavonása' },
  reentry: { start: 'demo-story-reentry', cim: '2 · Munkatárs visszatérése' },
};

let chromium;
try { ({ chromium } = await import('@playwright/test')); }
catch (e) {
  console.error('ELAKADT MÉRÉS: a Playwright nem elérhető (npm install --include=dev). Ok:', e.message);
  process.exit(2);
}

const srv = await serve();
const BASE = `http://127.0.0.1:${srv.address().port}`;
console.log(`A SZÁLLÍTOTT lap kiszolgálva: ${BASE}/demo-index.html  (forrás: v3app/public)`);
const browser = await chromium.launch();
const shots = [];

/** EGY TÖRTÉNET VÉGIGJÁRÁSA — a lépéseket a VALÓDI felületen nyomja meg. */
async function walk(storyKey, width, height, { label }) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  const T = (t) => page.locator(`[data-testid="${t}"]`).first();
  const tag = `[${storyKey} @ ${width}px]`;
  const bubble = () => page.evaluate(() => {
    const box = document.querySelector('[data-testid="tour"]');
    if (!box) return { missing: true };
    const g = (t) => box.querySelector(`[data-testid="${t}"]`);
    const li = document.querySelector('[data-testid^="tour-step-"][aria-current="step"]');
    return { hidden: box.hidden, cls: box.className,
      aborted: g('tour-aborted') ? g('tour-aborted').getAttribute('data-why') : null,
      pending: !!g('tour-pending'), blocked: !!g('tour-blocked'),
      body: (g('tour-step-body') || {}).textContent || null,
      hasNext: !!g('tour-next'), hasFinish: !!g('tour-finish'), hasSkip: !!g('tour-skip'),
      step: li ? { id: li.getAttribute('data-testid'), state: li.getAttribute('data-state') } : null,
      marked: [...document.querySelectorAll('.tourtarget')].map((e) => e.getAttribute('data-testid')) };
  });

  await page.goto(`${BASE}/demo-index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await T(STORIES[storyKey].start).click();
  await page.waitForTimeout(1500);

  let s = await bubble();
  A(`${tag} (a1) a bemutató elindul és NEM szakad meg`, s.aborted === null && !s.hidden, `aborted=${s.aborted}`);
  if (s.aborted !== null || s.hidden) {           // a bejárás itt értelmét veszti: NEVEZETTEN állunk meg
    A(`${tag} (a2) a történet végigvihető`, false, 'a bemutató a 0. lépésen megszakadt — a többi lépés NEM MÉRT');
    await ctx.close();
    return;
  }

  // A LÉPÉSEKET A DEKLARÁCIÓ VEZETI, NEM A TALÁLGATÁS (saját lelet ebben a körben).
  //
  // Az első alakom a buborék állapotából próbálta kitalálni, melyik lépés feladathoz kötött
  // (`state === 'pending'`), és MINDEN lépést annak olvasott — a 0. navigációs lépésen keresett
  // visszavonás-gombot, és persze nem talált. A rosszabbik baj viszont az volt, hogy így az
  // „a feladat-lépésen nincs Tovább" állítás ÖNMAGÁT igazolta volna: a feladat-lépést éppen a
  // „Tovább" hiányából ismertem fel. Egy állítás, ami a saját feltételéből következik, nem mérés
  // (KUKA-134 · KUKA-215). Ezért a lépések listája a SZÁLLÍTOTT tudás-csomagból jön, és a „nincs
  // Tovább" ahhoz van mérve, amit a lépés DEKLARÁL (`task`).
  const steps = STEPS[storyKey];
  A(`${tag} (a2) a szállított csomag deklarálja a történet lépéseit`, steps.length > 0, `lépés=${steps.length}`);
  let revoked = false; let reinvited = false;

  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    s = await bubble();
    if (s.aborted !== null) { A(`${tag} (a3/${step.id}) nincs váratlan megszakadás`, false, `aborted=${s.aborted}`); break; }
    A(`${tag} (a3/${step.id}) a bemutató a ${i + 1}. deklarált lépésen áll`,
      s.step && s.step.id === `tour-step-${step.id}`, `kapott=${s.step && s.step.id}`);

    // FELTÁRÁS: a bemutató SOHA nem kattint a felhasználó helyett — a feltárót ő nyomja meg.
    //
    // A FELTÁRÓ LEHET EGY EGÉSZ LISTA, ÉS AKKOR A LISTÁRA KATTINTANI NEM ÚT (saját lelet). A
    // visszatérés-történet feltárója a TELJES tag-lista (mért döntés: egy kis elem elől kitérő
    // buborék épp a műveleti oszlopra esett). A listára magára kattintani viszont nem tesz semmit —
    // a felhasználó a SORÁBAN lévő gombot nyomja meg. Az első alakom a konténerre kattintott, és a
    // lépés emiatt nem nyílt ki: a panel sosem jelent meg, a megnevezett gomb „nem található" lett.
    // Ezért a tanú a feltáró KONTÉNEREN BELÜL a történet szereplőjének sorát keresi meg.
    if (s.pending) {
      const rev = s.marked[0];
      A(`${tag} (a4/${step.id}) a feltárásra váró lépés MEGNEVEZI a feltárót`, !!rev, `kiemelve=${rev}`);
      if (!rev) break;
      const inner = await page.evaluate((revId) => {
        const c = document.querySelector(`[data-testid="${revId}"]`);
        if (!c) return { none: 'a feltáró nincs a lapon' };
        if (c.tagName === 'BUTTON' || c.tagName === 'A') return { self: true };
        const row = [...c.querySelectorAll('tr')].find((tr) => /bela@/.test(tr.innerText));
        const btn = (row || c).querySelector('button:not([disabled])');
        return btn ? { testid: btn.getAttribute('data-testid'), label: btn.textContent.trim() } : { none: 'a feltáróban nincs megnyomható gomb' };
      }, rev);
      if (inner.none) { A(`${tag} (a4b/${step.id}) a feltáró ÚTJA járható`, false, inner.none); break; }
      if (inner.self) { await T(rev).click(); } else {
        A(`${tag} (a4b/${step.id}) a feltáró a szereplő SORÁBAN kínál műveletet`, !!inner.testid, `gomb=${inner.label}`);
        await T(inner.testid).click();
      }
      await page.waitForTimeout(800);
      s = await bubble();
    }

    if (!step.task) {
      A(`${tag} (a5/${step.id}) a navigációs lépésen VAN működő folytatás`, s.hasNext || s.hasFinish,
        JSON.stringify({ hasNext: s.hasNext, hasFinish: s.hasFinish, pending: s.pending, blocked: s.blocked }));
      if (s.hasNext) { await T('tour-next').click(); await page.waitForTimeout(700); }
      continue;
    }

    // ── FELADATHOZ KÖTÖTT LÉPÉS ────────────────────────────────────────────────────────────────
    A(`${tag} (a6/${step.id}) a DEKLARÁLT feladat-lépésen NINCS „Tovább" (a gomb nem helyettesíti a műveletet)`,
      !s.hasNext, `task=${step.task} hasNext=${s.hasNext}`);

    if (step.task === 'invite.revoked') {
      const btn = page.locator('[data-testid^="invite-revoke-"]').first();
      if (await btn.count() === 0) { A(`${tag} (a7/${step.id}) a valódi visszavonás gombja ott van`, false, 'nem található'); break; }
      await btn.scrollIntoViewIfNeeded(); await page.waitForTimeout(250);
      const hit = await page.evaluate(() => {
        const e = document.querySelector('[data-testid^="invite-revoke-"]');
        const r = e.getBoundingClientRect(); const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
        const el = document.elementFromPoint(cx, cy);
        return { testid: el ? el.getAttribute('data-testid') : null, what: el ? el.tagName + '.' + el.className : null,
          inViewport: cx >= 0 && cx <= innerWidth && cy >= 0 && cy <= innerHeight };
      });
      A(`${tag} (a8/${step.id}) a célgomb a nézetbe hozható`, hit.inViewport);
      A(`${tag} (a9/${step.id}) az útmutató NEM takarja a célgombot`,
        !!(hit.testid && hit.testid.startsWith('invite-revoke-')), `a pontot elfogta: ${hit.what}`);
      await btn.click(); await page.waitForTimeout(600);
      const lead = await T('invite-revoke-lead').innerText().catch(() => null);
      A(`${tag} (a10/${step.id}) a megerősítés MEGNEVEZI, kinek a meghívóját vonjuk vissza`,
        !!(lead && /bela@/.test(lead)), String(lead).slice(0, 90));
      await T('invite-revoke-confirm').click(); await page.waitForTimeout(1300);
      revoked = true;
    } else if (step.task === 'reinvite.sent') {
      const open = page.locator('[data-testid^="member-reinvite-"]').first();
      if (await open.count() === 0) { A(`${tag} (a7/${step.id}) az „Újra meghívás" gombja ott van`, false, 'nem található'); break; }
      await open.scrollIntoViewIfNeeded(); await page.waitForTimeout(250);
      const hit = await page.evaluate(() => {
        const e = document.querySelector('[data-testid^="member-reinvite-"]');
        const r = e.getBoundingClientRect(); const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
        const el = document.elementFromPoint(cx, cy);
        return { testid: el ? el.getAttribute('data-testid') : null, what: el ? el.tagName + '.' + el.className : null,
          inViewport: cx >= 0 && cx <= innerWidth && cy >= 0 && cy <= innerHeight };
      });
      A(`${tag} (a8/${step.id}) a célgomb a nézetbe hozható`, hit.inViewport);
      A(`${tag} (a9/${step.id}) az útmutató NEM takarja a célgombot`,
        !!(hit.testid && hit.testid.startsWith('member-reinvite-')), `a pontot elfogta: ${hit.what}`);
      await open.click(); await page.waitForTimeout(700);
      // A MEGERŐSÍTÉS MONDATA — KÉT KÜLÖN ÁLLÍTÁS, mert KÉT KÜLÖN dolog tud elromlani.
      //
      // SAJÁT LELET, A RONTÁS-PRÓBA MÉRTE MEG. Az első alakom a TELJES panel szövegében keresett
      // egy szó-töredéket (`/nem állnak vissza/`). A rontás-próbán a mondatot KICSERÉLTEM a
      // nyelvcsomagban — a panelen már `RONTAS_JELZO` állt —, és az állítás MÉGIS zöld maradt: a
      // töredék a panel egy MÁSIK szövegére illeszkedett. Egy állítás, ami a keresett mondat
      // eltűnése mellett is zöld, nem azt méri, aminek a nevét viseli (KUKA-215 · KUKA-239: a
      // hatókör nélküli minta a szomszéd sort igazolja). Ezért:
      //   (a10a) TARTALOM — a SZÁLLÍTOTT nyelvcsomag mondata tényleg kimondja-e a jog-figyelmeztetést;
      //   (a10b) SZÁLLÍTÁS — pontosan EZ a mondat áll-e a megerősítő panel fejlécében.
      // A felirat nem égethető a próbába: az elvárást a CSOMAGBÓL olvassuk (KUKA-237).
      const lead = await page.evaluate(async () => {
        const pack = await import('./i18n/hu.mjs');
        // A MONDAT A `TPL` CSOPORTBAN ÁLL (helyőrzős sablonok) — ezt MÉRVE állapítottuk meg, nem
        // feltételezve; a tartalék-ágas "bárhol megkeresem" alak épp a kitalált mezőnevet rejtette
        // volna el (KUKA-238).
        const sentence = pack.TPL && pack.TPL.reinviteConfirmLead;
        const head = document.querySelector('[data-testid="panel"] .dialoghead p.muted');
        return { sentence: sentence || null, shown: head ? head.textContent.trim() : null };
      });
      if (!lead.sentence) A(`${tag} (a10a/${step.id}) a nyelvcsomag mondata MÉRHETŐ`, false,
        'ELAKADT MÉRÉS: a `reinviteConfirmLead` kulcs nem olvasható a csomagból');
      else {
        A(`${tag} (a10a/${step.id}) a csomag mondata KIMONDJA: a korábbi hozzáférések nem állnak vissza`,
          /nem állnak vissza/.test(lead.sentence), lead.sentence.slice(0, 120));
        // A `{ki}` helyére a címzett kerül, ezért a mondatot a helyőrző KÖRÜLI részeire mérjük.
        const parts = lead.sentence.split('{ki}').map((x) => x.trim()).filter((x) => x.length > 3);
        const shown = String(lead.shown || '');
        A(`${tag} (a10b/${step.id}) EZ a mondat áll a megerősítő panel fejlécében`,
          parts.length > 0 && parts.every((x) => shown.includes(x)), shown.slice(0, 130) || 'nincs fejléc-mondat');
      }
      A(`${tag} (a11/${step.id}) az űrlap a szerepkört ÉS az adatkört is kéri`,
        (await T('reinvite-role').count()) > 0 && (await T('reinvite-scope').count()) > 0);
      await T('reinvite-confirm').click(); await page.waitForTimeout(1300);
      reinvited = true;
    } else {
      A(`${tag} (a7/${step.id}) a tanú ismeri ezt a feladat-fajtát`, false, `ismeretlen task=${step.task} — ELAKADT MÉRÉS`);
      break;
    }

    const after = await bubble();
    A(`${tag} (a12/${step.id}) a lépés a SZERVER igazolása után lett elvégezve`,
      !!(after.step && after.step.state === 'done') || after.hasFinish,
      `állapot=${after.step && after.step.state} hasFinish=${after.hasFinish}`);
  }

  s = await bubble();
  A(`${tag} (a14) a bemutató a BEFEJEZÉSIG eljut`, !!s.hasFinish, JSON.stringify({ hasFinish: s.hasFinish, aborted: s.aborted }));
  const shot = join(ROOT, artifactPath({ area: 'reports', kind: `demo_${storyKey}_${width}`, ext: 'png', version: VERSION }));
  await mkdir(resolve(shot, '..'), { recursive: true });
  await page.screenshot({ path: shot });
  shots.push(shot);
  if (s.hasFinish) {
    await T('tour-finish').click(); await page.waitForTimeout(800);
    const sum = await page.locator('[data-testid="tour-summary"]').innerText().catch(() => null);
    A(`${tag} (a15) a záró lap IGAZAT mond: 0 hátravan`, !!(sum && /Hátravan:\s*0/.test(sum)), String(sum));
  }
  if (storyKey === 'inviteRevoke') {
    const row = await page.evaluate(() => {
      const t = document.querySelector('[data-testid="invites-table"]');
      if (!t) return null;
      const tr = [...t.querySelectorAll('tbody tr')].find((x) => /bela@/.test(x.innerText));
      return tr ? [...tr.querySelectorAll('td')].map((td) => td.innerText.trim()) : null;
    });
    A(`${tag} (a16) a meghívó sora VISSZAVONVA állapotot mutat`, !!(row && row.some((c) => /Visszavonva/.test(c))), JSON.stringify(row));
    A(`${tag} (a17) nincs MÁSODIK visszavonás ugyanarra a meghívóra`,
      (await page.locator('[data-testid^="invite-revoke-"]').count()) === 0);
    A(`${tag} (a18) a történet VALÓDI műveletet végzett`, revoked);
  }
  if (storyKey === 'reentry') A(`${tag} (a18) a történet VALÓDI műveletet végzett`, reinvited);
  await ctx.close();
}

/** A KAPU-PRÓBÁK: a VALÓDI exportált függvényt hívják (KUKA-207). */
async function gateProbes() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/demo-index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  // A MENÜT KI KELL NYITNI: az (g5) eset egy LÁTHATÓ menü-elemről szól, csukott mobil fiókban
  // viszont SEMMI nem látható — ott a próba a saját alapsokaságát mérte volna el (KUKA-094).
  await page.locator('[data-testid="nav-toggle"]').first().click().catch(() => {});
  await page.waitForTimeout(500);
  const r = await page.evaluate(async () => {
    const mod = await import('./tour.mjs');
    // A MÉRÉS ALAPSOKASÁGA: egy REJTETT, a mai oldalt jelölő bal-menü elem — pontosan az az
    // állapot, amiben a csukott mobil menü hagyja a navigációs lépés célját.
    const nav = document.querySelector('[data-testid="nav"]');
    if (!nav) return { setupFailed: 'nincs [data-testid="nav"] a lapon' };
    const el = document.createElement('button');
    el.setAttribute('data-testid', 'kapu-proba-cel');
    el.setAttribute('aria-current', 'page');
    el.hidden = true;
    nav.appendChild(el);
    const run = (step) => ({ at: 0, steps: [step], view: { book: null, subject: null } });
    const out = {
      navStep: mod.navIntentFulfilled(run({ id: 's', target: 'kapu-proba-cel' })),
      // A FELTÁRÓ ÁG MÉRÉSE. Ez az ág MA egyetlen szállított bemutatóval sem érhető el (mérve: minden
      // bemutató nav-célja a SAJÁT oldalára mutat, tehát mindig `aria-current="page"`). Ezért a
      // viselkedését KÖZVETLENÜL hívjuk meg — különben bizalomból hinnénk el (KUKA-207).
      revealerWithCurrent: (() => { const e = mod.revealerOf(run({ id: 's', target: 'kapu-proba-cel' })); return e ? e.getAttribute('data-testid') : null; })(),
      taskStep: mod.navIntentFulfilled(run({ id: 's', target: 'kapu-proba-cel', task: 'invite.revoked' })),
      revealerStep: mod.navIntentFulfilled(run({ id: 's', target: 'kapu-proba-cel', appears_after: 'nav-toggle' })),
      missingTarget: mod.navIntentFulfilled(run({ id: 's', target: 'nincs-ilyen-elem-sehol' })),
    };
    // UGYANAZ AZ ELEM, `aria-current` NÉLKÜL: ez a JÖVŐBELI eset (egy bemutató MÁS oldal menüpontjára
    // mutat). Itt a feltárónak a ☰-t kell adnia, hogy a lépés ne „eltűnt elemként" akadjon el.
    el.removeAttribute('aria-current');
    const revNoCurrent = mod.revealerOf(run({ id: 's', target: 'kapu-proba-cel' }));
    out.revealerNoCurrent = revNoCurrent ? revNoCurrent.getAttribute('data-testid') : null;
    out.pendingNoCurrent = mod.isPending(run({ id: 's', target: 'kapu-proba-cel' }));
    el.remove();
    // ÉS A MÁSIK IRÁNY: a LÁTHATÓ elem nem „teljesült" eset, hanem rendes cél.
    const shown = document.createElement('button');
    shown.setAttribute('data-testid', 'kapu-proba-latszik');
    shown.setAttribute('aria-current', 'page');
    shown.textContent = 'x';
    nav.appendChild(shown);
    // A TANÚ MAGA IS MÉRCE: ha ez az elem mégsem látszik, az ESET nem áll fenn — ezt KIMONDJUK,
    // nem „zöld"-nek vagy „piros"-nak könyveljük (KUKA-094 · KUKA-171).
    const reallyShown = !(shown.hidden || (shown.offsetParent === null && shown.getClientRects().length === 0));
    out.shownSetup = reallyShown;
    out.shownTarget = mod.navIntentFulfilled(run({ id: 's', target: 'kapu-proba-latszik' }));
    shown.remove();
    return out;
  });
  if (r.setupFailed) { A('(g0) a kapu-próba alapsokasága felállt', false, r.setupFailed); await ctx.close(); return; }
  A('(g1) a REJTETT, mai oldalt jelölő menü-cél TELJESÜLTNEK számít', r.navStep === true, `kapott=${r.navStep}`);
  A('(g2) a FELADAT-lépést a kapu SOHA nem igazolja (csak a szerver)', r.taskStep === false, `kapott=${r.taskStep}`);
  A('(g3) deklarált feltáró esetén a kapu NEM lép közbe', r.revealerStep === false, `kapott=${r.revealerStep}`);
  A('(g4) a lapon NEM létező cél nem „teljesült"', r.missingTarget === false, `kapott=${r.missingTarget}`);
  A('(g6) a mai oldalt jelölő REJTETT menü-célnál NINCS feltárás-kérés (nem kérjük el kétszer)',
    r.revealerWithCurrent === null, `kapott=${r.revealerWithCurrent}`);
  A('(g7) MÁS oldal rejtett menü-célja a ☰-t adja feltárónak (a lépés nem „eltűnt elemként" akad el)',
    r.revealerNoCurrent === 'nav-toggle', `kapott=${r.revealerNoCurrent}`);
  A('(g8) …és a lépés ekkor FELTÁRÁSRA VÁRÓNAK számít', r.pendingNoCurrent === true, `kapott=${r.pendingNoCurrent}`);
  if (!r.shownSetup) A('(g5) a LÁTHATÓ cél esete MÉRHETŐ volt', false, 'ELAKADT MÉRÉS: a próba-elem nem lett látható (a menü nem nyílt ki) — a kapuról ez NEM mond semmit');
  else A('(g5) a LÁTHATÓ cél a rendes úton megy, nem ezen', r.shownTarget === false, `kapott=${r.shownTarget}`);
  await ctx.close();
}

/** ÚJRAINDÍTHATÓSÁG: ugyanaz a történet KÉTSZER, egymás után, ugyanabban a lapban (R138 §3). */
async function restartTwice(storyKey, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 } });
  const page = await ctx.newPage();
  const T = (t) => page.locator(`[data-testid="${t}"]`).first();
  await page.goto(`${BASE}/demo-index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  for (let i = 1; i <= 2; i += 1) {
    await T('demo-restart').click();
    await page.waitForTimeout(1600);
    await T(STORIES[storyKey].start).click();
    await page.waitForTimeout(1600);
    const s = await page.evaluate(() => {
      const box = document.querySelector('[data-testid="tour"]');
      const g = (t) => box.querySelector(`[data-testid="${t}"]`);
      return { aborted: g('tour-aborted') ? g('tour-aborted').getAttribute('data-why') : null, hidden: box.hidden,
        done: [...document.querySelectorAll('[data-testid^="tour-step-"]')].filter((li) => li.getAttribute('data-state') === 'done').length };
    });
    A(`[${storyKey} @ ${width}px] (r${i}) ${i}. újraindítás TISZTA kezdőállapotból indul`,
      s.aborted === null && !s.hidden && s.done === 0, JSON.stringify(s));
  }
  await ctx.close();
}

try {
  await gateProbes();
  for (const w of [1280, 390]) {
    for (const k of Object.keys(STORIES)) await walk(k, w, w === 1280 ? 900 : 844, { label: k });
  }
  for (const k of Object.keys(STORIES)) await restartTwice(k, 390);
} catch (e) {
  console.error('\nELAKADT MÉRÉS (a tanú maga bukott el, a bemutatóról ez NEM mond semmit):', e && e.message);
  await browser.close(); srv.close();
  process.exit(2);
}

await browser.close(); srv.close();
const report = join(ROOT, artifactPath({ area: 'reports', kind: 'demo_walk', ext: 'json', version: VERSION }));
await mkdir(resolve(report, '..'), { recursive: true });
await writeFile(report, JSON.stringify({ base: BASE, zold: green, piros: red, kepek: shots }, null, 2));
console.log(`\nZÖLD=${green.length} · PIROS=${red.length}`);
console.log(`Képek: ${shots.length} · jelentés: ${report}`);
if (red.length) { console.log('\nPIROSAK:'); red.forEach((f) => console.log(' - ' + f)); process.exit(1); }
console.log('A BEMUTATÓ HÁTTERE: `demo-adapter.mjs` (jelölt csonk) — ebből HTTP/DB bizonyíték NEM következik.');
process.exit(0);
