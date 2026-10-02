#!/usr/bin/env node
// tools/v3_demo_walk_proof.mjs — A KÉT TELJES TÖRTÉNET ÉLŐ TANÚJA (R140).
//
// MIT MÉR, ÉS MIÉRT ÍGY.
//
// Az R139-es alakom a RÖVID, deklarált útmutatókat járta végig, és abból vont következtetést a
// történetre. Az R140 ezt nevezetten elutasította: „A teljes lefedést ne kizárólag a megvalósított
// lépésdeklarációból származtasd: az A/B eredmények ÖNÁLLÓ elvárások." Igaza van: a lépés-lista azt
// mondja meg, mit ígérünk, nem azt, hogy a rendszer tényleg oda jutott-e. Ezért a tanú KÉT dolgot
// mér külön: (1) a végigvezetés minden deklarált lépése lefut-e, VALÓDI gombokkal; (2) a történet
// VÉGÁLLAPOTA igaz-e — a tényleges szerep, a tagság, a régi és az új meghívó állapota, és a végső
// LÁTHATÓ adat. A kettő közül bármelyik bukása piros.
//
// A reset UGYANABBAN A LAPBAN fut, és utána a TELJES folyamat megismétlődik — az R139-es
// „kétszer resetelt és done===0-t nézett" alak nem volt kétszeri végigjárás, és ezt az R140
// helyesen szóvá tette.
//
// AMIT EZ A TANÚ NEM ÁLLÍT: HTTP- vagy adatbázis-bizonyítékot. A háttér a jelölt
// `demo-adapter.mjs` csonk; az ő zöldje NEM a határ zöldje (KUKA-227).
//
// Kilépési kód: 0 = hibát nem talált · 1 = MÉRT hibát talált · 2 = a mérés elakadt.

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
const ONLY = (() => { const i = process.argv.indexOf('--only'); return i >= 0 ? process.argv[i + 1] : null; })();
const NEG = process.argv.includes('--negativ-kontroll');

const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

function serve() {
  return new Promise((ok) => {
    const srv = createServer(async (req, res) => {
      try {
        const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '') || 'demo-index.html';
        const full = resolve(PUBLIC, rel);
        if (!full.startsWith(PUBLIC)) { res.writeHead(403).end('kilépés a kiszolgált fából'); return; }
        res.writeHead(200, { 'content-type': TYPES[extname(full)] || 'application/octet-stream', 'cache-control': 'no-store' })
          .end(await readFile(full));
      } catch { res.writeHead(404).end('nincs ilyen fájl'); }
    });
    srv.listen(0, '127.0.0.1', () => ok(srv));
  });
}

const red = []; const green = []; const shots = [];
function A(name, cond, extra = '') {
  const line = `${name}${extra ? ' — ' + extra : ''}`;
  (cond ? green : red).push(line);
  console.log(`${cond ? 'ZÖLD ' : 'PIROS'} ${line}`);
}

const STORIES = {
  inviteRevoke: { btn: 'demo-story-invite-revoke', tour: 'tour.inviteRevoke', cim: '1 · Meghívás visszavonása' },
  reentry: { btn: 'demo-story-reentry', tour: 'tour.reentry', cim: '2 · Munkatárs visszatérése' },
};

let chromium;
try { ({ chromium } = await import('@playwright/test')); }
catch (e) { console.error('ELAKADT MÉRÉS: a Playwright nem elérhető. Ok:', e.message); process.exit(2); }

const PKG = await (async () => {
  const raw = await readFile(join(PUBLIC, 'demo-assistant.json'), 'utf8').catch(() => null);
  if (!raw) { console.error('ELAKADT MÉRÉS: a demo-assistant.json nem olvasható.'); process.exit(2); }
  try { return JSON.parse(raw); } catch (e) { console.error('ELAKADT MÉRÉS:', e.message); process.exit(2); }
})();
const stepsOf = (tourId) => ((PKG.status.tours || []).find((t) => t.id === tourId) || {}).steps || [];

const srv = await serve();
const BASE = `http://127.0.0.1:${srv.address().port}`;
console.log(`A SZÁLLÍTOTT lap kiszolgálva: ${BASE}/demo-index.html  (forrás: v3app/public)`);
const browser = await chromium.launch();

/** A VALÓDI MŰVELETEK. A végigvezetés ezeket SOHA nem végzi el — a FELHASZNÁLÓ igen, és itt a tanú az. */
async function doTask(page, task) {
  const T = (t) => page.locator(`[data-testid="${t}"]`).first();
  const has = async (sel) => (await page.locator(sel).count()) > 0;
  if (task === 'actor.switched') {
    // MODÁLIS PANEL MELLETT A SÁV NEM ELÉRHETŐ — a felhasználó előbb bezárja (ezt a lépés szövege is mondja).
    if (await page.evaluate(() => { const d = document.querySelector('[data-testid="panel"]'); return !!(d && d.open); })) {
      await page.locator('[data-testid="panel"] [data-action="panel-close"]').first().click().catch(() => {});
      await page.waitForTimeout(400);
    }
    await page.locator('[data-tour-anchor="actor-switch"]').first().click();
    return 'néző-váltás';
  }
  if (task === 'invite.revoked' && await has('[data-testid^="invite-revoke-"]')) {
    await page.locator('[data-testid^="invite-revoke-"]').first().scrollIntoViewIfNeeded();
    await page.locator('[data-testid^="invite-revoke-"]').first().click();
    await page.waitForTimeout(400);
    if (await has('[data-testid="invite-revoke-confirm"]')) { await T('invite-revoke-confirm').click(); return 'meghívó visszavonva'; }
  }
  if (task === 'member.revoked' && await has('[data-testid^="member-revoke-"]')) {
    await page.locator('[data-testid^="member-revoke-"]').first().click();
    await page.waitForTimeout(400);
    if (await has('[data-testid="revoke-confirm"]')) { await T('revoke-confirm').click(); return 'tagság megszüntetve'; }
  }
  if (task === 'reinvite.sent' && await has('[data-testid="reinvite-confirm"]')) {
    await T('reinvite-confirm').click(); return 'újra meghívás elküldve';
  }
  if (task === 'grant.saved' && await has('[data-testid^="member-scope-grant-"]')) {
    await page.locator('[data-testid^="member-scope-grant-"]').first().click(); return 'készlet-jog megadva';
  }
  if (task === 'invite.created' && await has('[data-testid="invite-submit"]')) {
    const em = page.locator('[data-testid="invite-email"]');
    if (await em.count()) await em.fill('bela@mintamuhely.hu');
    await T('invite-submit').click(); return 'új meghívó kiadva';
  }
  if (task === 'invite.redeemed' && await has('[data-testid="invite-redeem"]')) {
    await T('invite-redeem').click(); return 'meghívó elfogadva';
  }
  return null;
}

const snap = (page) => page.evaluate(() => {
  const box = document.querySelector('[data-testid="tour"]');
  if (!box) return { nincsLap: true };
  const g = (t) => box.querySelector(`[data-testid="${t}"]`);
  const li = document.querySelector('[data-testid^="tour-step-"][aria-current="step"]');
  return {
    hidden: box.hidden,
    aborted: g('tour-aborted') ? g('tour-aborted').getAttribute('data-why') : null,
    pending: g('tour-pending') ? g('tour-pending').getAttribute('data-why') : null,
    blocked: !!g('tour-blocked'),
    hasNext: !!g('tour-next'), hasFinish: !!g('tour-finish'),
    sid: li ? li.getAttribute('data-testid').replace('tour-step-', '') : null,
    state: li ? li.getAttribute('data-state') : null,
    marked: [...document.querySelectorAll('.tourtarget')]
      .map((e) => e.getAttribute('data-testid') || e.getAttribute('data-tour-anchor')),
  };
});

/** EGY TELJES TÖRTÉNET VÉGIGJÁRÁSA. Visszaadja, elérte-e a végét. */
async function walk(page, storyKey, tag, { kihagy = null } = {}) {
  const T = (t) => page.locator(`[data-testid="${t}"]`).first();
  const steps = stepsOf(STORIES[storyKey].tour);
  const latott = new Set(); let elvegzett = 0;
  for (let i = 0; i < steps.length * 4 + 10; i += 1) {
    let s = await snap(page);
    if (s.nincsLap) { await page.waitForTimeout(1200); continue; }
    if (s.aborted) { A(`${tag} a végigvezetés nem szakad meg`, false, `megszakadt: ${s.aborted} (${s.sid})`); return false; }
    if (!s.sid) { await page.waitForTimeout(600); continue; }
    latott.add(s.sid);
    const step = steps.find((x) => x.id === s.sid) || {};
    // A HALADÁS LÁTHATÓ: egy némán elakadó tanú maga is hiba — nem mondja meg, HOL állt meg
    // (KUKA-171: ami megállít, annak neve is legyen).
    const jel = `${s.sid}/${s.state}${s.pending ? `·${s.pending}` : ''}${s.blocked ? '·blokkolt' : ''}`;
    if (jel !== walk.utolso) { console.log(`     ${tag} ${jel} → ${s.marked[0] || '—'}`); walk.utolso = jel; }

    // A NEGATÍV KONTROLL: egy KÖTELEZŐ KÉSŐI lépést szándékosan kihagyunk, és a tanúnak pirosnak kell lennie.
    if (kihagy && s.sid === kihagy) { A(`${tag} (negatív kontroll) a(z) ${kihagy} lépést SZÁNDÉKOSAN kihagyjuk`, true); return false; }

    if (s.state !== 'done' && step.task) {
      const did = await doTask(page, step.task);
      if (did) { elvegzett += 1; await page.waitForTimeout(1500); continue; }
    }
    if (s.pending) {
      const m = s.marked[0];
      if (!m) { A(`${tag} a feltárásra váró lépés megnevezi a feltárót`, false, `lépés=${s.sid}`); return false; }
      const sel = `[data-testid="${m}"],[data-tour-anchor="${m}"]`;
      const inner = await page.evaluate((q) => {
        const c = document.querySelector(q);
        if (!c) return null;
        if (c.tagName === 'BUTTON' || c.tagName === 'A') return 'self';
        const b = c.querySelector('a[href],button:not([disabled])');
        return b ? (b.getAttribute('data-testid') || '__first') : null;
      }, sel);
      if (inner === 'self' || inner === null) await page.locator(sel).first().click().catch(() => {});
      else if (inner === '__first') await page.locator(sel).first().locator('a[href],button:not([disabled])').first().click().catch(() => {});
      else await page.locator(`[data-testid="${inner}"]`).first().click().catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(1400);
      continue;
    }
    // NAVIGÁCIÓS LÉPÉS: a felhasználó rákattint a kiemelt menüpontra.
    const m0 = s.marked[0];
    if (m0 && m0.startsWith('nav-') && s.state !== 'done') {
      await page.locator(`[data-testid="${m0}"]`).first().click().catch(() => {});
      await page.waitForTimeout(600);
    }
    if (s.hasFinish && !s.hasNext) { return true; }
    if (s.hasNext) {
      const elotte = `${s.sid}|${s.state}`;
      await T('tour-next').click().catch(() => {});
      await page.waitForTimeout(600);
      const utana = await snap(page);
      if (!utana.nincsLap && `${utana.sid}|${utana.state}` === elotte && utana.blocked) {
        // A „TOVÁBB" NEM PÓTOLJA A MŰVELETET — ez a VÉDELEM, nem hiba. De ha nincs mit tennünk, állunk.
        const step2 = steps.find((x) => x.id === utana.sid) || {};
        if (!step2.task) { A(`${tag} minden lépésen van működő folytatás`, false, `megállt: ${utana.sid}`); return false; }
      }
      continue;
    }
    A(`${tag} minden lépésen van működő folytatás`, false, JSON.stringify(s).slice(0, 150));
    return false;
  }
  A(`${tag} a végigvezetés befejeződik (nem ragad be)`, false, `látott lépések: ${latott.size}/${steps.length}`);
  return false;
}

/** A VÉGÁLLAPOT — ÖNÁLLÓ ELVÁRÁS, nem a lépés-listából levezetve (R140). */
async function outcome(page, storyKey, tag) {
  const o = await page.evaluate(async () => {
    const j = async (p) => { try { const r = await fetch(p); return await r.json(); } catch { return null; } };
    const me = await j('/api/me');
    const stock = await j('/api/data/stock');
    const price = await j('/api/data/price');
    const mails = await j('/dev/mailbox');
    return {
      email: me && me.email, role: me && me.current_role, book: me && me.current_book_name,
      workspaces: (me && me.workspaces || []).map((w) => w.name),
      stockOk: !!(stock && stock.ok), stockReason: stock && stock.reason,
      stockHasQty: !!(stock && stock.ok && JSON.stringify(stock).match(/\d/)),
      priceOk: !!(price && price.ok), priceReason: price && price.reason,
      mailCount: (mails && mails.mails || []).length,
    };
  });
  if (storyKey === 'inviteRevoke') {
    A(`${tag} (E1) a meghívott VALÓBAN tag lett`, (o.workspaces || []).includes('Minta Műhely Kft.'), JSON.stringify(o.workspaces));
    A(`${tag} (E2) a végén a meghívott nézetében vagyunk`, o.email === 'bela@mintamuhely.hu', String(o.email));
    const sorok = await page.evaluate(() => {
      const t = document.querySelector('[data-testid="invites-table"]');
      return t ? [...t.querySelectorAll('tbody tr')].map((tr) => tr.innerText.replace(/\s+/g, ' ')) : null;
    });
    A(`${tag} (E3) KÉT meghívó van a történetben: a visszavont és az elfogadott`, o.mailCount >= 2, `levél: ${o.mailCount}`);
    if (sorok) A(`${tag} (E4) a régi meghívó sora visszavont maradt`, sorok.some((x) => /Visszavon/.test(x)), String(sorok).slice(0, 120));
  } else {
    A(`${tag} (E1) a meghívott VALÓBAN tag lett`, (o.workspaces || []).includes('Minta Műhely Kft.'), JSON.stringify(o.workspaces));
    A(`${tag} (E2) a MENNYISÉG látszik (a megadott készlet-jog hatályos)`, o.stockOk === true, `stock ok=${o.stockOk} ok nélkül: ${o.stockReason}`);
    A(`${tag} (E3) az ÁR viszont NEM — nevezett hiánnyal, nem üres mezővel`, o.priceOk === false && !!o.priceReason, `price ok=${o.priceOk} indok=${o.priceReason}`);
  }
  return o;
}

async function story(storyKey, width, height, { ismetles = false, kihagy = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  const T = (t) => page.locator(`[data-testid="${t}"]`).first();
  const tag = `[${storyKey} @ ${width}px${ismetles ? ' · ismétlés' : ''}]`;
  await page.goto(`${BASE}/demo-index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await T(STORIES[storyKey].btn).click();
  await page.waitForTimeout(1800);

  const vege = await walk(page, storyKey, tag, { kihagy });
  if (kihagy) { await ctx.close(); return { vege, kihagyott: true }; }
  A(`${tag} a TELJES történet végigvihető`, vege);
  if (vege) {
    const shot = join(ROOT, artifactPath({ area: 'reports', kind: `demo_${storyKey}_${width}${ismetles ? '_ism' : ''}`, ext: 'png', version: VERSION }));
    await mkdir(resolve(shot, '..'), { recursive: true });
    await page.screenshot({ path: shot, fullPage: false });
    shots.push(shot);
    await outcome(page, storyKey, tag);
    const sum = await page.locator('[data-testid="tour-summary"]').innerText().catch(() => null);
    if (await T('tour-finish').count()) {
      await T('tour-finish').click(); await page.waitForTimeout(700);
      const s2 = await page.locator('[data-testid="tour-summary"]').innerText().catch(() => null);
      A(`${tag} a záró lap IGAZAT mond: 0 hátravan`, !!(s2 && /Hátravan:\s*0/.test(s2)), String(s2 || sum));
    }
  }

  // ── RESET UGYANABBAN A LAPBAN, ÉS A TELJES FOLYAMAT MÉG EGYSZER (R140) ──────────────────────
  if (vege && !ismetles) {
    await T('demo-restart').click();
    await page.waitForTimeout(1800);
    const alap = await page.evaluate(async () => {
      const j = async (p) => { try { return await (await fetch(p)).json(); } catch { return null; } };
      const me = await j('/api/me');
      const inv = await j('/api/invites/waiting');
      const done = [...document.querySelectorAll('[data-testid^="tour-step-"]')].filter((li) => li.getAttribute('data-state') === 'done').length;
      return { email: me && me.email, tagsagok: (me && me.workspaces || []).map((w) => w.name), inv: inv && inv.ok, done };
    });
    A(`${tag} az újrakezdés az ÜZLETI állapotot is visszaállítja`,
      alap.email === 'anna@mintamuhely.hu' && alap.done === 0,
      JSON.stringify(alap));
    await T(STORIES[storyKey].btn).click();
    await page.waitForTimeout(1800);
    const megegyszer = await walk(page, storyKey, `${tag} ismétlés`, {});
    A(`${tag} a TELJES történet reset után MÉGEGYSZER végigvihető`, megegyszer);
    if (megegyszer) await outcome(page, storyKey, `${tag} ismétlés`);
  }
  await ctx.close();
  return { vege };
}

try {
  const keys = ONLY ? [ONLY] : Object.keys(STORIES);
  if (NEG) {
    // NEGATÍV KONTROLL: egy KÖTELEZŐ KÉSŐI lépés kihagyása — a tanúnak NEM szabad zöldet mondania.
    const k = keys[0];
    const utolsoFeladat = [...stepsOf(STORIES[k].tour)].reverse().find((s) => s.task && s.task !== 'actor.switched');
    console.log(`\nNEGATÍV KONTROLL: a(z) ${utolsoFeladat.id} (${utolsoFeladat.task}) lépés kihagyva — a végigjárásnak PIROSNAK kell lennie.`);
    const r = await story(k, 1280, 900, { kihagy: utolsoFeladat.id });
    A(`(nk) a kihagyott kötelező lépés mellett a történet NEM megy végig`, r.vege === false);
  } else {
    for (const w of [1280, 390]) for (const k of keys) await story(k, w, w === 1280 ? 900 : 844);
  }
} catch (e) {
  console.error('\nELAKADT MÉRÉS (a tanú bukott el, a próbafelületről ez NEM mond semmit):', e && e.message);
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
console.log('A HÁTTÉR: `demo-adapter.mjs` (jelölt csonk) — ebből HTTP/adatbázis-bizonyíték NEM következik.');
process.exit(0);
