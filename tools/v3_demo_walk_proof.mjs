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
// RÖVID KATTINTÁS-HATÁRIDŐ (KUKA-280): az alapértelmezett 30 s egyetlen elérhetetlen gombnál
// percekre nyújtja a mérést, és a VÉGÉN derül ki, hogy elakadt. 5 s elég egy helyi lapon — ami
// ennél lassabb, az nem lassú, hanem ELÉRHETETLEN, és azt MOST akarjuk tudni.
const KATT = { timeout: 5000 };

/**
 * A MODÁLIS PANEL BEZÁRÁSA — EGY OTTHON, TÖBB HÍVÓ (KUKA-003 · KUKA-039).
 *
 * MÉRVE (R164/3): a nyitott levél-panel (`<dialog>`) ELFOGJA a kattintást mindenen, ami mögötte
 * van — a fejléc profil-menüjén és a meghívó-elfogadás gombján is. A tanú 58 újrapróbálkozás után
 * is ott állt. A felhasználó ugyanezt látja: amíg a panel nyitva, a mögötte lévő felület nem
 * elérhető. A tanú tehát ZÁR, és a zárás tényét MEGMÉRI, nem reméli (KUKA-215).
 */
async function zarjaPanelt(page, KATT) {
  for (let k = 0; k < 4; k += 1) {
    const nyitva = await page.evaluate(() => { const d = document.querySelector('[data-testid="panel"]'); return !!(d && d.open); });
    if (!nyitva) return true;
    await page.locator('[data-testid="panel"] [data-action="panel-close"]').first().click(KATT).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(350);
  }
  return !(await page.evaluate(() => { const d = document.querySelector('[data-testid="panel"]'); return !!(d && d.open); }));
}

/** A VALÓDI MŰVELETEK. A végigvezetés ezeket SOHA nem végzi el — a FELHASZNÁLÓ igen, és itt a tanú az. */
async function doTask(page, task, step = {}) {
  const T = (t) => page.locator(`[data-testid="${t}"]`).first();
  const has = async (sel) => (await page.locator(sel).count()) > 0;
  if (task === 'actor.switched') {
    /**
     * A VÁLTÁS KÉT ÚTJA. A szereplő-váltás a próbafelület sávjában megy (valódi ki- és belépés), a
     * FIÓK-váltás viszont a fejléc saját fiókválasztójában — ugyanaz az ember, másik fiók. A tanú
     * azt az utat járja, amit a lépés KIEMEL, nem egy előre eldöntöttet.
     */
    // A DÖNTÉST A LÉPÉS DEKLARÁLT CÉLJA ADJA, nem a pillanatnyi kiemelés (az lehet a feltáró is).
    if (step.target === 'account-switcher') {
      await page.locator('[data-testid="account-switcher-summary"]').first().click(KATT).catch(() => {});
      await page.waitForTimeout(500);
      const ceg = await page.evaluate(() => {
        const lista = document.querySelector('[data-testid="ws-list"]');
        if (!lista) return null;
        const b2 = [...lista.querySelectorAll('button')].find((x) => /Minta Műhely/.test(x.textContent || ''));
        return b2 ? (b2.getAttribute('data-testid') || '__ws') : null;
      });
      if (ceg) {
        await page.locator(`[data-testid="${ceg}"]`).first().click(KATT).catch(() => {});
        /**
         * ÉS MEGVÁRJUK, HOGY A VÁLTÁS KI IS RAJZOLÓDJON (R164/3 — MÉRVE).
         *
         * A váltás HTTP-kérés (`POST /api/session/workspace`), utána `refreshMe` és újrarajzolás. A
         * tanú korábban azonnal visszatért, a bemutató pedig a következő lépés célját (`nav-members`)
         * egy MÉG régi menün kereste — `targetMissing`-gel megállt egy ép képernyőn. Ami a kész
         * állapot ELŐTT mér, nem a kész állapotot méri (ugyanaz az osztály, mint a KUKA-121).
         */
        await page.waitForFunction(() => {
          const h = document.querySelector('[data-testid="header-workspace"]');
          return !!(h && /Minta M/.test(h.textContent || ''));
        }, null, { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(400);
        return 'fiók-váltás';
      }
      // AMI NEM MEGY, ANNAK NEVE LEGYEN (KUKA-171/280): kiírjuk, MIT látott a tanú a listán.
      const latott = await page.evaluate(() => {
        const l = document.querySelector('[data-testid="ws-list"]');
        return l ? [...l.querySelectorAll('button')].map((x) => `${x.getAttribute('data-testid')}:${(x.textContent || '').trim().slice(0, 24)}`) : ['nincs ws-list'];
      });
      console.log(`     !! a fiókválasztóban NINCS cég-bejegyzés — látott: ${JSON.stringify(latott)}`);
      return null;
    }
    // MODÁLIS PANEL MELLETT A SÁV NEM ELÉRHETŐ — a felhasználó előbb bezárja (ezt a lépés szövege is mondja).
    if (await page.evaluate(() => { const d = document.querySelector('[data-testid="panel"]'); return !!(d && d.open); })) {
      await page.locator('[data-testid="panel"] [data-action="panel-close"]').first().click().catch(() => {});
      await page.waitForTimeout(400);
    }
    /**
     * A BEMUTATÓ-LAP NÉZŐ-VÁLTÓJA: valódi ki- és belépés, majd újratöltés tiszta címre (a lap saját
     * `switchViewer`-e). A modális panelt előbb bezárjuk — a felhasználó is azt teszi (lentebb a
     * közös `zarjaPanelt`, KUKA-003).
     *
     * AZ R164/3-BAN MEGÉPÍTETT, ALKALMAZÁSON BELÜLI (újratöltés nélküli) átadás útja ettől KÜLÖNBÖZIK:
     * ott a tanú a profil-menüt tárja fel, kijelentkezik, és a másik emberrel lép be. Az a mérés
     * 19-ből 18 lépést ért el, két állapot-szivárgást javítottam közben, a harmadik nem záródott le —
     * ezért a mai, végigvihető út áll itt, a maradék pedig a jelentésben NEVESÍTVE.
     */
    if (!(await zarjaPanelt(page, KATT))) {
      console.log('     !! a modális panel NEM zárult be — a néző-váltás nem indulhat (nevezett megállás)');
      return null;
    }
    await page.locator('[data-tour-anchor="actor-switch"]').first().click(KATT);
    return 'néző-váltás (valódi ki- és belépés, majd újratöltés)';
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
  if (task === 'reinvite.sent') {
    // KÉT KATTINTÁS, AHOGY A LÉPÉS SZÖVEGE MONDJA: előbb az „Újra meghívás" gomb nyitja az űrlapot,
    // utána a megerősítés küldi el. A tanú a FELHASZNÁLÓ útját járja, nem rövidít.
    if (!(await has('[data-testid="reinvite-confirm"]')) && await has('[data-testid^="member-reinvite-"]')) {
      await page.locator('[data-testid^="member-reinvite-"]').first().click(KATT);
      await page.waitForTimeout(600);
    }
    if (await has('[data-testid="reinvite-confirm"]')) {
      /**
       * A MEGERŐSÍTÉS MONDATA — KÉT KÜLÖN, HORGONYZOTT ÁLLÍTÁS (R138/KUKA-277).
       * (a10a) TARTALOM: a SZÁLLÍTOTT nyelvcsomag mondata kimondja-e a jog-figyelmeztetést;
       * (a10b) SZÁLLÍTÁS: pontosan EZ a mondat áll-e a megerősítő panel fejlécében.
       * A felirat nem égethető a próbába: az elvárást a CSOMAGBÓL olvassuk (KUKA-237).
       */
      const lead = await page.evaluate(async () => {
        const pack = await import('./i18n/hu.mjs');
        const sentence = pack.TPL && pack.TPL.reinviteConfirmLead;
        const head = document.querySelector('[data-testid="panel"] .dialoghead p.muted');
        return { sentence: sentence || null, shown: head ? head.textContent.trim() : null };
      });
      if (!lead.sentence) A('(a10a) a nyelvcsomag mondata MÉRHETŐ', false, 'ELAKADT MÉRÉS: a `reinviteConfirmLead` kulcs nem olvasható');
      else {
        A('(a10a) a csomag mondata KIMONDJA: a korábbi hozzáférések nem állnak vissza',
          /nem állnak vissza/.test(lead.sentence), lead.sentence.slice(0, 110));
        const parts = lead.sentence.split('{ki}').map((x) => x.trim()).filter((x) => x.length > 3);
        const shown = String(lead.shown || '');
        A('(a10b) EZ a mondat áll a megerősítő panel fejlécében',
          parts.length > 0 && parts.every((x) => shown.includes(x)), shown.slice(0, 110) || 'nincs fejléc-mondat');
      }
      await T('reinvite-confirm').click(KATT); return 'újra meghívás elküldve';
    }
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
    // A LEVÉL-PANEL ELŐBB BEZÁRUL: az elfogadás gombja a meghívó-képernyőn áll, a panel MÖGÖTT
    // (mérve: „intercepts pointer events"). A felhasználó is bezárja, mielőtt elfogad.
    if (!(await zarjaPanelt(page, KATT))) {
      console.log('     !! a modális panel NEM zárult be — az elfogadás nem indulhat');
      return null;
    }
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
    // A TÁJÉKOZTATÓ VÁRAKOZÁS NEM TEENDŐ (R158/2): a lap maga mondja meg a `data-actionable`-lel,
    // hogy a mondat mögött van-e dolgunk. Az elvégzett lépés becsukott panelje csak tájékoztatás —
    // a járó MEHET tovább. A szabály otthona a `tour.mjs` (`INFORMATIONAL_PENDING`), nem ez a fájl.
    pending: g('tour-pending') && g('tour-pending').getAttribute('data-actionable') !== 'false'
      ? g('tour-pending').getAttribute('data-why') : null,
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
    if (s.aborted) {
      /**
       * A MEGSZAKADÁS HELYÉT MEG KELL NEVEZNI (KUKA-171). A régi sor a MEGSZAKADÁS OKÁT kiírta, de
       * azt nem, hogy MELYIK lépésnél és MIT látott a képernyőn — a `(null)` lépés-azonosító miatt a
       * hiba helye kitalálás kérdése volt. A tanú ezért most a KÉPERNYŐT is kiírja.
       */
      const latkep = await page.evaluate(() => {
        const nav = document.querySelector('[data-testid="nav"]');
        const ab = document.querySelector('[data-testid="tour-aborted"]');
        return {
          fiok: (document.querySelector('[data-testid="header-workspace"]') || {}).textContent || '—',
          menu: [...document.querySelectorAll('[data-testid="nav"] [data-testid^="nav-"]')].map((e) => e.getAttribute('data-testid')),
          navBajt: nav ? nav.innerHTML.length : -1,
          belepve: !document.querySelector('[data-testid="login-form"]'),
          appLatszik: (() => { const a2 = document.querySelector('[data-testid="app"]'); return !!(a2 && !a2.hidden); })(),
          mondat: ab ? (ab.textContent || '').slice(0, 70) : '—',
          lepesek: document.querySelectorAll('[data-testid^="tour-step-"]').length,
        };
      });
      const kov = steps[Math.max(0, latott.size ? [...latott].length : 0)];
      A(`${tag} a végigvezetés nem szakad meg`, false,
        `megszakadt: ${s.aborted} (${s.sid}) · utolsó látott lépés: ${[...latott].pop() || '—'}`
        + ` · fiók: ${String(latkep.fiok).trim().slice(0, 28)} · belépve: ${latkep.belepve}`
        + ` · app látszik: ${latkep.appLatszik} · menü: ${latkep.menu.join(',') || `ÜRES (${latkep.navBajt} bájt)`}`
        + ` · lépés-lista: ${latkep.lepesek} · mondat: „${latkep.mondat}"`
        + `${kov ? ` · a következő lépés célja: ${kov.target}` : ''}`);
      return false;
    }
    if (!s.sid) { await page.waitForTimeout(600); continue; }
    latott.add(s.sid);
    const step = steps.find((x) => x.id === s.sid) || {};
    // A HALADÁS LÁTHATÓ: egy némán elakadó tanú maga is hiba — nem mondja meg, HOL állt meg
    // (KUKA-171: ami megállít, annak neve is legyen).
    const jel = `${s.sid}/${s.state}${s.pending ? `·${s.pending}` : ''}${s.blocked ? '·blokkolt' : ''}`;
    if (jel !== walk.utolso) { console.log(`     ${tag} ${jel} → ${s.marked[0] || '—'}`); walk.utolso = jel; walk.ismetles = 0; }
    else {
      // PÖRGÉS-ŐR (KUKA-280): ha ugyanaz az állapot sokadszor jön vissza, a tanú NEVEZETTEN áll meg.
      walk.ismetles = (walk.ismetles || 0) + 1;
      if (walk.ismetles > 8) {
        A(`${tag} a végigvezetés HALAD (nem pörög ugyanazon a lépésen)`, false,
          `beragadt: ${jel} · kiemelve: ${s.marked[0] || '—'}`);
        return false;
      }
    }

    // A NEGATÍV KONTROLL: egy KÖTELEZŐ KÉSŐI lépést szándékosan kihagyunk, és a tanúnak pirosnak kell lennie.
    if (kihagy && s.sid === kihagy) { A(`${tag} (negatív kontroll) a(z) ${kihagy} lépést SZÁNDÉKOSAN kihagyjuk`, true); return false; }

    if (s.state !== 'done' && step.task) {
      const did = await doTask(page, step.task, step);
      if (did) { elvegzett += 1; await page.waitForTimeout(1500); continue; }
    }
    if (s.pending) {
      const m = s.marked[0];
      if (!m) { A(`${tag} a feltárásra váró lépés megnevezi a feltárót`, false, `lépés=${s.sid}`); return false; }
      const sel = `[data-testid="${m}"],[data-tour-anchor="${m}"]`;
      /**
       * A FELTÁRÓN BELÜL A TÖRTÉNET SZEREPLŐJÉNEK SORÁT KERESSÜK (SAJÁT LELET, MÉRVE).
       *
       * Az első alakom `<tr>`-ekben kereste a szereplőt — a tag-lista viszont NEM táblázat, hanem
       * dobozokból áll, tehát a keresés nem talált semmit, és a TARTALÉK ág a konténer ELSŐ gombját
       * nyomta meg: Anna sorát, nem Béláét. A tanú így egy MÁSIK emberrel kezdte volna a történetet,
       * és a hiba a végén derült volna ki, rossz néven. Ezért a sor-fogalmat a SZÖVEG adja: az a
       * legszűkebb doboz, amelyik a szereplő címét tartalmazza, a másikét viszont nem.
       */
      const inner = await page.evaluate((q) => {
        const c = document.querySelector(q);
        if (!c) return null;
        if (c.tagName === 'BUTTON' || c.tagName === 'A') return 'self';
        const gombok = [...c.querySelectorAll('a[href],button:not([disabled])')];
        const sajat = gombok.find((b2) => {
          let n = b2;
          while (n && n !== c) {
            const t = (n.innerText || '');
            if (/bela@/.test(t) && !/anna@/.test(t)) return true;
            n = n.parentElement;
          }
          return false;
        });
        const b = sajat || gombok[0];
        return b ? (b.getAttribute('data-testid') || '__first') : null;
      }, sel);
      // RÖVID HATÁRIDŐ A FELTÁRÓ-KATTINTÁSON IS (R142/F142-03 — KUKA-280).
      //
      // A fájl eleje már kimondta: „a hosszú alapértelmezett határidő nem türelem, hanem a
      // visszajelzés elodázása". A `KATT` mégsem került rá ERRE a három kattintásra, és MÉRVE
      // (R142): egy beragadt feltárás-lépésen a tanú kilenc körön át 30-30 másodpercet várt,
      // tehát a 10 másodperces diagnózisból négy és fél perc lett — pontosan a KUKA-280 alakja,
      // ugyanabban a fájlban, ami a tanulságot leírta.
      if (inner === 'self' || inner === null) await page.locator(sel).first().click(KATT).catch(() => {});
      else if (inner === '__first') await page.locator(sel).first().locator('a[href],button:not([disabled])').first().click(KATT).catch(() => {});
      else await page.locator(`[data-testid="${inner}"]`).first().click(KATT).catch(() => {});
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
  // A KIFOGYOTT KÖR IS NEVEZZE MEG, HOL ÁLLT MEG (KUKA-171): a puszta „8/20" nem mondja meg, mi
  // tartotta vissza — a tanú ezért a KÉPERNYŐT és a bemutató állapotát is kiírja.
  {
    const v = await snap(page);
    const lk = await page.evaluate(() => ({
      fiok: ((document.querySelector('[data-testid="header-workspace"]') || {}).textContent || '—').trim().slice(0, 26),
      menu: [...document.querySelectorAll('[data-testid="nav"] [data-testid^="nav-"]')].length,
      panel: (() => { const d = document.querySelector('[data-testid="panel"]'); return !!(d && d.open); })(),
      belepesiUrlap: !!document.querySelector('[data-testid="login-form"]'),
      meghivoLap: !!document.querySelector('[data-testid="invite-redeem"]'),
    }));
    A(`${tag} a végigvezetés befejeződik (nem ragad be)`, false,
      `látott lépések: ${latott.size}/${steps.length} · utolsó: ${[...latott].pop() || '—'}`
      + ` · most: ${v.sid || '—'}/${v.state || '—'}${v.pending ? `·${v.pending}` : ''}${v.blocked ? '·blokkolt' : ''}`
      + ` · kiemelve: ${v.marked[0] || '—'} · tovább-gomb: ${v.hasNext} · befejezés: ${v.hasFinish}`
      + ` · fiók: ${lk.fiok} · menü-elem: ${lk.menu} · panel nyitva: ${lk.panel}`
      + ` · belépési űrlap: ${lk.belepesiUrlap} · meghívó-lap: ${lk.meghivoLap}`);
  }
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

/**
 * A KAPU-PRÓBÁK: a VALÓDI exportált függvényt hívják (KUKA-207 · KUKA-276).
 * A történet-bejárás ezeket NEM fedi — egy nem mért kapu bizalom, nem védelem.
 */
async function gateProbes() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/demo-index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.locator('[data-testid="nav-toggle"]').first().click(KATT).catch(() => {});
  await page.waitForTimeout(400);
  const r = await page.evaluate(async () => {
    const mod = await import('./tour.mjs');
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
      taskStep: mod.navIntentFulfilled(run({ id: 's', target: 'kapu-proba-cel', task: 'invite.revoked' })),
      revealerStep: mod.navIntentFulfilled(run({ id: 's', target: 'kapu-proba-cel', appears_after: 'nav-toggle' })),
      missingTarget: mod.navIntentFulfilled(run({ id: 's', target: 'nincs-ilyen-elem-sehol' })),
      revealerWithCurrent: (() => { const e = mod.revealerOf(run({ id: 's', target: 'kapu-proba-cel' })); return e ? e.getAttribute('data-testid') : null; })(),
    };
    el.removeAttribute('aria-current');
    const rev = mod.revealerOf(run({ id: 's', target: 'kapu-proba-cel' }));
    out.revealerNoCurrent = rev ? rev.getAttribute('data-testid') : null;
    out.pendingNoCurrent = mod.isPending(run({ id: 's', target: 'kapu-proba-cel' }));
    el.remove();
    const shown = document.createElement('button');
    shown.setAttribute('data-testid', 'kapu-proba-latszik');
    shown.setAttribute('aria-current', 'page');
    shown.textContent = 'x';
    nav.appendChild(shown);
    out.shownSetup = !(shown.hidden || (shown.offsetParent === null && shown.getClientRects().length === 0));
    out.shownTarget = mod.navIntentFulfilled(run({ id: 's', target: 'kapu-proba-latszik' }));
    shown.remove();
    return out;
  });
  if (r.setupFailed) { A('(g0) a kapu-próba alapsokasága felállt', false, r.setupFailed); await ctx.close(); return; }
  A('(g1) a REJTETT, mai oldalt jelölő menü-cél TELJESÜLTNEK számít', r.navStep === true, `kapott=${r.navStep}`);
  A('(g2) a FELADAT-lépést a kapu SOHA nem igazolja (csak a szerver)', r.taskStep === false, `kapott=${r.taskStep}`);
  A('(g3) deklarált feltáró esetén a kapu NEM lép közbe', r.revealerStep === false, `kapott=${r.revealerStep}`);
  A('(g4) a lapon NEM létező cél nem „teljesült"', r.missingTarget === false, `kapott=${r.missingTarget}`);
  A('(g6) a mai oldalt jelölő REJTETT menü-célnál NINCS feltárás-kérés', r.revealerWithCurrent === null, `kapott=${r.revealerWithCurrent}`);
  A('(g7) MÁS oldal rejtett menü-célja a ☰-t adja feltárónak', r.revealerNoCurrent === 'nav-toggle', `kapott=${r.revealerNoCurrent}`);
  A('(g8) …és a lépés ekkor FELTÁRÁSRA VÁRÓNAK számít', r.pendingNoCurrent === true, `kapott=${r.pendingNoCurrent}`);
  if (!r.shownSetup) A('(g5) a LÁTHATÓ cél esete MÉRHETŐ volt', false, 'ELAKADT MÉRÉS: a próba-elem nem lett látható');
  else A('(g5) a LÁTHATÓ cél a rendes úton megy, nem ezen', r.shownTarget === false, `kapott=${r.shownTarget}`);
  await ctx.close();
}

/**
 * AZ R142-ES JAVÍTÁSOK SAJÁT ELLENPÁRJA (h1–h4) — KUKA-092.
 *
 * MIÉRT KELL. A történet-bejárás a javítás UTÁN zöld, de „a zöld battéria a hiányról semmit nem
 * mond": ha a javításomat visszarontanám, a 18 lépéses végigjárás pirosodna — azt viszont nem
 * mondaná meg, MELYIK fele tört el, és egy jövőbeli átalakítás némán visszacsúszhatna. Ezért a
 * három javított szabály KÖZVETLENÜL mérve áll itt, a VALÓDI exportált függvényt hívva
 * (KUKA-009 · KUKA-207), és mindegyik mellé ELLENPÁR jár: a kerülő úton a védelem NEM teljesül
 * (KUKA-068: a tükör nem ellenpár — a pozitívat a VALÓDI úton, a negatívat a kerülőn mérjük).
 */
async function handoverProbes() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/demo-index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  // ── (h1) A NÉZET PÁR: alany ÉS fiók — az átadásnak MINDKETTŐT vinnie kell (F142-05) ─────────
  const pair = await page.evaluate(async () => {
    const mod = await import('./tour.mjs');
    // R176 (`KUKA-423`): a váltás-lépés a DEKLARÁLT tengelyt kéri, tehát az ellenpárok is azon
    // a tengelyen állnak — és külön mérjük a ROSSZ tengelyt, illetve a nyilatkozat nélküli esetet.
    const run = (view, tengely) => ({ at: 0,
      steps: [{ id: 's', switch_actor: true, switch_axis: tengely, task: 'actor.switched' }], view, role: null });
    return {
      masFiok: mod.actorSwitchReady(run({ book: 'b1', subject: 'u1' }, 'book'), { view: { book: 'b2', subject: 'u1' }, role: null }),
      masEmber: mod.actorSwitchReady(run({ book: 'b1', subject: 'u1' }, 'subject'), { view: { book: 'b1', subject: 'u2' }, role: null }),
      rosszTengely: mod.actorSwitchReady(run({ book: 'b1', subject: 'u1' }, 'subject'), { view: { book: 'b2', subject: 'u1' }, role: null }),
      nyilatkozatNelkul: mod.actorSwitchReady({ at: 0,
        steps: [{ id: 's', switch_actor: true, task: 'actor.switched' }], view: { book: 'b1', subject: 'u1' }, role: null },
      { view: { book: 'b2', subject: 'u2' }, role: null }),
      // ELLENPÁR: pontosan az az állapot, amit a RÉGI átadás előállított — a fiók elveszett, ezért
      // a futás az ÚJ fiókhoz kötődött, és a MEGTÖRTÉNT váltás mérhetetlen lett.
      elvesztettFiok: mod.actorSwitchReady(run({ book: 'b2', subject: 'u1' }, 'book'), { view: { book: 'b2', subject: 'u1' }, role: null }),
    };
  });
  A('(h1a) ugyanaz az ember MÁSIK FIÓKJA is váltás (a FIÓK tengelyén)', pair.masFiok === true, `kapott=${pair.masFiok}`);
  A('(h1d) R176 — a ROSSZ tengely változása NEM váltás: személy-váltó lépést a fiókváltás nem teljesít',
    pair.rosszTengely === false, `kapott=${pair.rosszTengely}`);
  A('(h1e) R176 — nyilatkozat nélkül a kapu ZÁR (fail-closed)',
    pair.nyilatkozatNelkul === false, `kapott=${pair.nyilatkozatNelkul}`);
  A('(h1b) MÁS ember nézete is váltás', pair.masEmber === true, `kapott=${pair.masEmber}`);
  A('(h1c) ELLENPÁR: ha az átadás a FIÓKOT elveszti, a megtörtént váltás MÉRHETETLEN',
    pair.elvesztettFiok === false, `kapott=${pair.elvesztettFiok}`);

  // ── (h2–h4) A MOBIL MENÜ: a VÁRAKOZÁS VÉGE is esemény (F142-02) + az ARIA igazat mond (F142-04)
  await page.locator('[data-testid="help-open"]').first().click(KATT).catch(() => {});
  await page.waitForTimeout(700);
  // A SÚGÓ A „Kérdezz" nézeten nyílik: az útmutatók a MÁSIK fülön állnak, és ott ELŐBB LISTA van —
  // a bemutató-indító a téma MEGNYITÁSA után jelenik meg (`help-guide-…` → `help-topic-…`).
  await page.locator('[data-testid="help-tab-guides"]').first().click(KATT).catch(() => {});
  await page.waitForTimeout(600);
  // A TÉMA-NYITÓ GOMBRA illesztünk, nem a sor `li`-jére: a vesszős kereső a sort találta meg
  // előbb, és a sorra kattintás nem nyit témát (saját lelet a próba írása közben).
  await page.locator('[data-action="help-topic"][data-topic="data.stock"]').first().click(KATT).catch(() => {});
  await page.waitForTimeout(700);
  const start = page.locator('[data-testid="help-tour-data.stock"]').first();
  if (!(await start.count())) {
    A('(h2) a mobil-menü próba alapsokasága felállt', false,
      'ELAKADT MÉRÉS: a súgóban nincs `help-tour-data.stock` indító — a mérés nem futott, a rendszerről ez NEM mond semmit');
    await ctx.close(); return;
  }
  await start.click(KATT).catch(() => {});
  await page.waitForTimeout(1100);

  /**
   * AZ ELŐFELTÉTEL BEÁLLÍTÁSA — ÉS MIÉRT NEM ELÉG A BEMUTATÓ PUSZTA INDÍTÁSA (saját lelet, MÉRVE).
   *
   * Az első alakom a `tour.stock` indítása után azonnal mérni akart, és ELAKADT MÉRÉST jelentett:
   * a bemutató indítása ODANAVIGÁL a túra saját oldalára, ezért a menü-cél `aria-current="page"`
   * lett, a lépés szándéka TELJESÜLT, és a bemutató — helyesen — nem várt a ☰-ra (KUKA-231). A
   * `revealerOf` saját megjegyzése ezt előre meg is mondta: a mai bemutatók menü-célja a SAJÁT
   * oldalukra mutat, tehát ez az ág az indítás pillanatában egyikükkel sem érhető el.
   *
   * A VALÓDI 390 px-es elakadás útja más volt: a néző-váltás UTÁN a lap az ÁTTEKINTÉSRE töltött be,
   * miközben a következő lépés célja egy MÁSIK menüpont. Ezt állítjuk itt elő a legrövidebb úton:
   * elnavigálunk az Áttekintésre, és onnantól a lépés célja rejtett ÉS nem a mai oldal.
   */
  await page.locator('[data-testid="nav-toggle"]').first().click(KATT).catch(() => {});
  await page.waitForTimeout(500);
  await page.locator('[data-testid="nav-overview"]').first().click(KATT).catch(() => {});
  await page.waitForTimeout(800);

  const allapot = () => page.evaluate(() => {
    const box = document.querySelector('[data-testid="tour"]');
    const p = box && box.querySelector('[data-testid="tour-pending"]');
    const nav = document.querySelector('[data-testid="nav"]');
    const t = document.querySelector('[data-testid="nav-toggle"]');
    // AMI MEGÁLLÍT, ANNAK NEVE IS LEGYEN (KUKA-171): a diagnózis mondja meg, van-e egyáltalán futás,
    // melyik lépésen áll, és nem szakadt-e meg — különben a „nem a menüre vár" üzenet találgatás.
    const li = document.querySelector('[data-testid^="tour-step-"][aria-current="step"]');
    const ab = box && box.querySelector('[data-testid="tour-aborted"]');
    return {
      pending: p ? p.getAttribute('data-why') : null,
      mark: [...document.querySelectorAll('.tourtarget')].map((e) => e.getAttribute('data-testid') || e.getAttribute('data-tour-anchor'))[0] || null,
      navOpen: nav ? nav.classList.contains('open') : null,
      aria: t ? t.getAttribute('aria-expanded') : null,
      tourBox: !!box, hidden: box ? box.hidden : null,
      sid: li ? li.getAttribute('data-testid').replace('tour-step-', '') : null,
      state: li ? li.getAttribute('data-state') : null,
      aborted: ab ? ab.getAttribute('data-why') : null,
      oldal: (() => { const a = document.querySelector('[data-testid^="nav-"][aria-current="page"]'); return a ? a.getAttribute('data-testid') : null; })(),
    };
  });

  const elotte = await allapot();
  if (elotte.pending !== 'targetPending' || elotte.mark !== 'nav-toggle') {
    A('(h2) a mobil-menü próba alapsokasága felállt', false,
      `ELAKADT MÉRÉS: a bemutató nem a csukott menüre vár — ${JSON.stringify(elotte)}`);
    await ctx.close(); return;
  }
  A('(h2) 390 px-en a csukott menü mögötti célnál a bemutató a ☰-ra VÁR', true, JSON.stringify(elotte));

  // ELLENPÁR: a menü osztályát a KÖZÖS FELOLDÓ MEGKERÜLÉSÉVEL nyitjuk ki. A cél láthatóvá lesz,
  // de újraértékelés nélkül a buborék ugyanazt a „nyisd ki a menüt" mondatot mutatja — pontosan
  // ez volt a MÉRT elakadás (9 egymás utáni azonos állapot a 390 px-es végigjáráson).
  const kerulo = await page.evaluate(() => {
    const nav = document.querySelector('[data-testid="nav"]');
    nav.classList.add('open');
    const cel = document.querySelector('[data-testid="nav-stock"]');
    const lathato = !!(cel && (cel.offsetParent !== null || cel.getClientRects().length));
    const box = document.querySelector('[data-testid="tour"]');
    const p = box && box.querySelector('[data-testid="tour-pending"]');
    const out = { lathato, pending: p ? p.getAttribute('data-why') : null };
    nav.classList.remove('open');                 // visszaállítjuk, hogy a VALÓDI út mérhető legyen
    return out;
  });
  A('(h3a) ELLENPÁR: a feloldót megkerülve a cél LÁTHATÓ lesz…', kerulo.lathato === true, `kapott=${kerulo.lathato}`);
  A('(h3b) …a buborék mégis a ☰-on marad (újraértékelés nélkül nincs vége a várakozásnak)',
    kerulo.pending === 'targetPending', `kapott=${kerulo.pending}`);

  // A VALÓDI ÚT: a felhasználó megnyomja a ☰-t. Itt a várakozásnak VÉGE kell lennie.
  await page.locator('[data-testid="nav-toggle"]').first().click(KATT).catch(() => {});
  await page.waitForTimeout(700);
  const utana = await allapot();
  A('(h3c) a ☰ megnyomása UTÁN a várakozás véget ér', utana.pending === null, `kapott=${utana.pending}`);
  A('(h3d) …és a kiemelés a VALÓDI célra költözik', utana.mark === 'nav-stock', `kapott=${utana.mark}`);
  A('(h4a) a nyitott menünél az `aria-expanded` IGAZAT mond', utana.aria === 'true', `kapott=${utana.aria}`);

  // (h4b) A ZÁRÁS MÁSIK ÚTJA: a menüpontra kattintva a `go()` becsukja a menüt — az `aria-expanded`
  // eddig `true` maradt, tehát a képernyő olvasója nyitott menüt állított egy csukott menüről.
  await page.locator('[data-testid="nav-stock"]').first().click(KATT).catch(() => {});
  await page.waitForTimeout(700);
  const zarva = await allapot();
  A('(h4b) a menüpontra lépés UTÁN az `aria-expanded` is csukottat mond',
    zarva.navOpen === false && zarva.aria === 'false', JSON.stringify(zarva));
  await ctx.close();
}

try {
  await gateProbes();
  await handoverProbes();
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
