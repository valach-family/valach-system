#!/usr/bin/env node
// tools/v3_bemutato_artifact_proof.mjs — AZ INTERAKTÍV ÁTADÁS BEJÁRÁSA (BMA-02, R206 §3).
//
// MIT MÉR EZ, ÉS MIÉRT PONTOSAN EZT.
//
// Az R206 SPEC §3 azt kéri, hogy az operátor a MEGLÉVŐ alkalmazásfelületen tudja végigkattintani a
// JAVÍTOTT személyváltás és meghívó-elfogadás útját — asztali szélességen ÉS 390 px-en —, és hogy
// amit átadunk, azt a címzett nézőpontjából ellenőrizzük. Egy helyi `var/` útvonal és egy lenyomat
// NEM átadás (KUKA-079), de a megnyitható csomag sem átadás, ha senki nem mérte meg, hogy
// KATTINTHATÓ-e. Ez a szerszám a CSOMAGOT futtatja: ugyanazokat a fájlokat, amiket publikálunk,
// egy sima statikus kiszolgálóról — tehát a mérés arról a lapról szól, amit az operátor megnyit.
//
// AMIT EZ KIMONDVA NEM BIZONYÍT: nem HTTP- és nem tároló-bizonyíték. A háttér a SZIMULÁLT
// bemutató-adapter; a szerveres/tárolós tanú a `findings_*` battériákban, a Playwright-láncban
// (`startServer` + SQLite), a magban és a `docs:kiprobalas-kepek`-ben áll (KUKA-227: a csonk zöldje
// nem a határ zöldje).
//
// ÉS NEM A `proof:demo-walk` HELYETTESÍTŐJE — DE A HATÓKÖRÜK UGYANAZ AZ OSZTÁLY (helyesbítés,
// R208 §2). Az a lánc a KÉT teljes történetet járja végig 19 lépésen, mindkét méreten — a SAJÁT
// statikus kiszolgálójáról, UGYANEZZEL a jelölt adapter-csonkkal, a `v3app/public` fájljairól.
// Elsőre azt írtam ide, hogy „a VALÓDI szerveren": TÉVES volt. Ez a szerszám a CSOMAG
// megnyithatóságát, a vezetett történetek indulását és a JAVÍTOTT út kattinthatóságát méri — és
// MEGMÉRI, hogy a csomag fájljai BÁJTRA azonosak a repó forrásával, mert ez köti a két mérést össze:
// a teljes 19 lépéses végigjárást a `proof:demo-walk` adja, ugyanazokon a bájtokon.
//
// Kilépési kód: 0 = minden állítás zöld · 1 = MÉRT hiba.
import { chromium } from '@playwright/test';
import { readFileSync, readdirSync, statSync, createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, normalize } from 'node:path';
import { dictFor } from '../v3app/public/i18n/dict.mjs';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { parseArtifactName } = require('../contracts/artifactNaming.js');
const D = dictFor('hu');

const lines = [];
const problems = [];
const A = (ok, mit, reszlet) => {
  lines.push(`    ${ok ? 'ZÖLD ' : 'PIROS'} ${mit}${reszlet === undefined ? '' : `  — ${reszlet}`}`);
  if (!ok) problems.push(`${mit}${reszlet === undefined ? '' : ` (${reszlet})`}`);
};

console.log('AZ INTERAKTÍV ÁTADÁS BEJÁRÁSA (BMA-02)');
console.log('='.repeat(94));

// ── 1. A CSOMAG: MOST ÁLLÍTJUK ELŐ, és a MANIFESZTBŐL olvassuk ki, hol van (KUKA-121) ───────────
const indult = Date.now();
execFileSync(process.execPath, [join(ROOT, 'tools/v3_bemutato_artifact.mjs')], { cwd: ROOT, stdio: 'pipe' });
const reportsDir = join(ROOT, 'var', 'reports');
let manifestPath = null;
for (const f of readdirSync(reportsDir)) {
  const p = parseArtifactName(f);
  if (!p || p.kind !== 'v3app_interaktiv_bemutato_manifeszt') continue;
  const st = statSync(join(reportsDir, f));
  if (st.mtimeMs >= indult - 2000) manifestPath = join(reportsDir, f);
}
if (!manifestPath) {
  console.log('    PIROS a csomag manifesztje nem született meg EBBEN a futásban');
  console.log('RESULT: FAIL — nincs mit megnyitni');
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const BUNDLE = join(ROOT, manifest.bundle_dir);
console.log(`  csomag:    ${manifest.bundle_dir}  (${manifest.files.length} fájl)`);
/**
 * A CSOMAG BÁJTRA AZONOS A REPÓ FORRÁSÁVAL — ÉS EZ NEM FORMALITÁS (R208 §3).
 *
 * Ez az állítás KÖTI ÖSSZE a két mérést: a KÉT teljes történet 19-19 lépéses végigjárását a
 * `proof:demo-walk` méri a `v3app/public` fájljain, ez a szerszám pedig a CSOMAGOT nyitja meg. Ha a
 * csomag bájtra ugyanaz, akkor a végigjárás bizonyítéka a csomagra is áll; ha nem, akkor a két
 * mérés KÉT KÜLÖN dologról szól, és azt nem szabad összemosni (KUKA-122 · KUKA-216).
 */
{
  const eltero = [];
  for (const f of manifest.files) {
    let sha = null;
    try { sha = `${createHash('sha256').update(readFileSync(join(ROOT, f.source))).digest('hex')}`; } catch { sha = '(nem olvasható)'; }
    if (sha !== f.sha256) eltero.push(`${f.published} ← ${f.source}`);
  }
  A(eltero.length === 0, 'a csomag MINDEN fájlja BÁJTRA azonos a repó forrásával (sha256)',
    eltero.length ? `ELTÉR: ${eltero.join(' · ')}` : `${manifest.files.length} fájl`);
  console.log(lines.splice(0).join('\n'));
}
console.log(`  manifeszt: ${manifestPath.replace(`${ROOT}/`, '')}`);
console.log(`  háttér:    ${manifest.background}`);

// ── 2. SIMA STATIKUS KISZOLGÁLÓ: nincs `/api`, nincs tároló — ahogy az átadott lapon sincs ──────
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const apiHits = [];
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let p = decodeURIComponent(url.pathname);
  if (p === '/' || p === '') p = '/index.html';
  // A STATIKUS KISZOLGÁLÓ NEM AD API-T: ha a lap mégis kérne, azt MEGJEGYEZZÜK — az adapternek
  // kell elfognia MINDEN `/api/` kérést (ha ide beérkezik egy, az néma hálózat-függés volna).
  if (p.startsWith('/api/') || p.startsWith('/dev/')) { apiHits.push(`${req.method} ${p}`); res.writeHead(502).end('nincs kiszolgáló'); return; }
  const file = join(BUNDLE, normalize(p).replace(/^(\.\.(\/|\\|$))+/, ''));
  if (!file.startsWith(BUNDLE)) { res.writeHead(403).end('tilos'); return; }
  try {
    statSync(file);
    const ext = file.slice(file.lastIndexOf('.'));
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end('nincs ilyen fájl'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;
console.log(`  kiszolgáló: ${BASE} (sima statikus — API NÉLKÜL)`);

const browser = await chromium.launch();
const SZELESSEGEK = [{ nev: 'asztali', w: 1280, h: 860 }, { nev: '390 px', w: 390, h: 844 }];

try {
  for (const sz of SZELESSEGEK) {
    console.log(`\n  ── ${sz.nev} (${sz.w}×${sz.h}) ───────────────────────────────────────────────`);
    const ctx = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, locale: 'hu-HU' });
    const page = await ctx.newPage();
    const hibak = [];
    page.on('pageerror', (e) => hibak.push(String(e && e.message).slice(0, 160)));
    const T = (tid) => page.getByTestId(tid);
    const txt = async (tid) => ((await T(tid).count()) ? ((await T(tid).textContent()) || '').trim() : null);

    await page.goto(BASE, { waitUntil: 'domcontentloaded' });

    // (1) A LAP FELÁLL — a VALÓDI felületi kódon, szerver nélkül.
    await T('header-subject').waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="header-subject"]');
      return el && /@/.test(el.textContent || '');
    }, null, { timeout: 20_000 }).catch(() => {});
    A((await txt('header-subject')) === 'anna@mintamuhely.hu', 'a csomag MEGNYITVA feláll, és a bemutató Annával indul',
      String(await txt('header-subject')));
    A(hibak.length === 0, 'a lap betöltése közben NEM volt JavaScript-hiba', hibak.join(' | ') || 'nincs');
    // ÉS A BETÖLTÉS-HIBA MONDATA NEM JELENIK MEG, AMIKOR MINDEN RENDBEN (a néma helyeslés párja:
    // egy mindig kiírt figyelmeztetés ugyanolyan félrevezető volna — KUKA-049).
    A((await page.getByTestId('demo-load-failed').count()) === 0,
      'a betöltés-hiba mondata NEM jelenik meg működő csomagnál', 'demo-load-failed: nincs');

    // (2) A SZIMULÁLT HÁTTÉR LÁTHATÓAN JELÖLT (a SPEC §3 kikötése).
    A(await T('demo-marker').isVisible() && String(await txt('demo-bar-title')).length > 0,
      'a lap LÁTHATÓAN kimondja, hogy ez bemutató (szimulált háttér)', `${await txt('demo-bar-title')} · ${await txt('demo-bar-lead')}`);

    /**
     * (3) A NYELVCSOMAGOK TÉNYLEG BETÖLTŐDTEK — ÉS NEM CSAK AZ ALAPNYELV (R208 §3).
     *
     * A modul-gráf betöltését már az bizonyítja, hogy a lap feláll (egy hiányzó nyelvcsomag a
     * `dict.mjs` importján elakadna). De a SPEC a nyelvcsomagok betöltését NEVEZETTEN kéri, ezért
     * MEGMÉRJÜK a váltást is: a profil-oldalon angolra váltunk, és azt kérjük, hogy a fejléc-sáv
     * szövege az ANGOL csomagból jöjjön — majd visszaváltunk. A mérce a csomagból jön, nem beégetve
     * (KUKA-237).
     */
    const EN = dictFor('en');
    // A PROFIL-OLDAL A FELHASZNÁLÓ ÚTJÁN NYÍLIK MEG: a céges nézet BAL MENÜJÉBEN nincs „Saját
    // profil" — a lenyíló profilmenüből érhető el (mérve: a `nav-profile` ezen a képernyőn nincs).
    await T('profile').locator('summary').click();
    await T('profile-menu-profile').click();
    await T('lang-select').waitFor({ state: 'visible', timeout: 15_000 });
    await T('lang-select').selectOption('en');
    await page.waitForFunction((kell) => {
      const el = document.querySelector('[data-testid="demo-bar-lead"]');
      return el && (el.textContent || '').trim() === kell;
    }, EN.UI.demoBarLead, { timeout: 15_000 }).catch(() => {});
    A((await txt('demo-bar-lead')) === EN.UI.demoBarLead,
      'az ANGOL nyelvcsomag is betöltődött és élesben vált', `„${await txt('demo-bar-lead')}"`);
    await T('lang-select').selectOption('hu');
    await page.waitForFunction((kell) => {
      const el = document.querySelector('[data-testid="demo-bar-lead"]');
      return el && (el.textContent || '').trim() === kell;
    }, D.UI.demoBarLead, { timeout: 15_000 }).catch(() => {});
    A((await txt('demo-bar-lead')) === D.UI.demoBarLead, 'és a visszaváltás is él (magyar)', `„${await txt('demo-bar-lead')}"`);

    /**
     * (4) A KÉT VEZETETT TÖRTÉNET INDULÁSA ÉS VEZETETT HALADÁSA (R208 §3).
     *
     * MIT MÉR, ÉS MIT NEM — KIMONDVA. A bemutató SOHA nem végzi el a felhasználó helyett az üzleti
     * műveletet (TUR-01 `never_clicks`), tehát a „Tovább" egy FELADATHOZ KÖTÖTT lépésen NEM léphet
     * tovább: ott a buborék VÁR, és ezt KI IS MONDJA (KUKA-228). Ez a szerszám ezért azt méri, hogy
     * a történet INDUL, a vezetés HALAD, amíg haladhat, és ahol megáll, ott NEVEZETTEN áll meg — a
     * KÉT TÖRTÉNET MINDEN LÉPÉSÉNEK végigjárása (19-19 lépés, mindkét méreten, valódi kattintásokkal)
     * a `proof:demo-walk` lánc dolga, UGYANEZEKEN a bájtokon (lásd a fenti sha256-sort).
     */
    const tortenet = async (btn, cim) => {
      await T(btn).click();
      await T('tour-step-title').waitFor({ state: 'visible', timeout: 20_000 });
      const indulo = await txt('tour-progress');
      A(Boolean(indulo) && /\s1\/\d+$/.test(indulo), `a(z) „${cim}" történet INDUL`, String(indulo));
      A(String(await txt('tour-step-title')).length > 0, 'és a lépés szövege a nyelvcsomagból jön', `„${await txt('tour-step-title')}"`);
      // VEZETETT HALADÁS: legfeljebb három „Tovább", és minden lépés UTÁN megmérjük, mi látszik.
      let halad = 0; let varakozik = null;
      for (let i = 0; i < 3; i += 1) {
        const elotte = await txt('tour-progress');
        await T('tour-next').click();
        const utana = await txt('tour-progress');
        if (utana !== elotte) { halad += 1; continue; }
        varakozik = await page.evaluate(() => {
          const p = document.querySelector('[data-testid="tour-pending"]');
          const b = document.querySelector('[data-testid="tour-blocked"]');
          return { pending: p ? p.getAttribute('data-why') : null, blocked: b ? (b.textContent || '').trim().slice(0, 60) : null };
        });
        break;
      }
      A(halad > 0 || Boolean(varakozik && (varakozik.pending || varakozik.blocked)),
        'a vezetés HALAD, vagy NEVEZETTEN kimondja, mire vár',
        `előre lépett: ${halad} · ${varakozik ? JSON.stringify(varakozik) : 'nincs megállás'}`);
      // ÉS A FELADATHOZ KÖTÖTT LÉPÉS NEM LESZ „ELVÉGEZVE" magától.
      const feladat = await page.evaluate(() => [...document.querySelectorAll('[data-testid="tour-steps"] li')]
        .filter((x) => x.getAttribute('data-state') === 'done').length);
      A(feladat <= 3, 'a bemutató nem végzett el üzleti műveletet helyettünk', `elvégzett lépés: ${feladat}`);
      // KILÉPÉS: a záró lap ELSZÁMOL (a tutor szabálya), majd bezárjuk.
      await T('tour-exit').click();
      await T('tour-summary').waitFor({ state: 'visible', timeout: 10_000 });
      const el = await page.evaluate(() => {
        const sm = document.querySelector('[data-testid="tour-summary"]');
        const f = document.querySelector('[data-testid="tour-finished"]');
        return sm ? { done: Number(sm.getAttribute('data-done')), skipped: Number(sm.getAttribute('data-skipped')),
          pending: Number(sm.getAttribute('data-pending')), whole: f && f.getAttribute('data-whole') } : null;
      });
      A(Boolean(el) && el.skipped > 0 && el.whole === 'false',
        `a(z) „${cim}" kilépése ELSZÁMOL (az átugrott lépés nem „elvégezve")`,
        el ? `elvégezve ${el.done} · átugorva ${el.skipped} · hátravan ${el.pending}` : 'nincs összegzés');
      await T('tour-close').click();
    };

    // (3) A VEZETÉS VALÓDI VEZÉRLŐT JELÖL, ÉS VÁR — NEM KATTINT HELYETTÜNK (TUR-01 · KUKA-228).
    await T('demo-story-invite-revoke').click();
    await T('tour-step-title').waitFor({ state: 'visible', timeout: 15_000 });
    const jeloles = await page.evaluate(() => {
      const el = document.querySelector('.tourtarget');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { tid: el.getAttribute('data-testid'), tag: el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height), lathato: el.offsetParent !== null };
    });
    /**
     * A KÉT HELYES ALAK (és a próba NEM dönthet helyettük): a bemutató VAGY megjelöl egy valódi,
     * látható vezérlőt, VAGY NEVEZETTEN kimondja, mire vár — illetve hogy a lépés célja MÁR
     * teljesült (`targetPendingDone`, a 390 px-es harmadik állapot). A néma semmi a hiba
     * (KUKA-228: amit a bemutató nem nyom meg helyettünk, arra VÁRNI kell).
     */
    const varakozas = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="tour-pending"]');
      return el ? { why: el.getAttribute('data-why'), actionable: el.getAttribute('data-actionable'), text: (el.textContent || '').trim().slice(0, 70) } : null;
    });
    /**
     * ÉS A HARMADIK, KIMONDOTT ÁLLAPOT: a lépés célja a MAI képernyőn MÁR teljesült — a menüpont a
     * mai oldalt jelöli (`aria-current="page"`), csak a csukott mobil menü rejti el. Ezt a DOM-ból
     * MÉRJÜK (nem a kód szavát fogadjuk el): ilyenkor nincs mit kiemelni, és nincs mire várni.
     */
    const celTeljesult = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="nav-members"]');
      if (!el) return null;
      return { rejtve: el.offsetParent === null, maiOldal: el.getAttribute('aria-current') === 'page',
        menuben: Boolean(el.closest('[data-testid="nav"]')) };
    });
    const harmadik = Boolean(celTeljesult && celTeljesult.rejtve && celTeljesult.maiOldal && celTeljesult.menuben);
    A(Boolean((jeloles && jeloles.lathato && jeloles.w > 0) || (varakozas && varakozas.why) || harmadik),
      'a vezetés VALÓDI vezérlőt jelöl meg, VAGY kimondja, mire vár, VAGY a lépés célja MÁR teljesült',
      jeloles ? `kiemelve: ${jeloles.tid} (${jeloles.tag} ${jeloles.w}×${jeloles.h})`
        : (varakozas && varakozas.why ? `várakozás: ${varakozas.why} — ${varakozas.text}`
          : (harmadik ? 'a lépés célja a mai oldal (a csukott mobil menü rejti el) — nincs mit kiemelni'
            : 'NINCS sem kiemelés, sem mondat, sem teljesült cél')));
    /**
     * ÉS A FELADATOT NEM VÉGZI EL HELYETTÜNK (TUR-01 `never_clicks`): a történet feladathoz kötött
     * lépése (a meghívó VISSZAVONÁSA) a bemutató elindítása után is FÜGGŐ — a bemutató navigálhat a
     * saját képernyőjére, de üzleti műveletet nem indít.
     */
    const lepesek = await page.evaluate(() => {
      const li = [...document.querySelectorAll('[data-testid="tour-steps"] li')];
      return { osszes: li.length, kesz: li.filter((x) => x.getAttribute('data-state') === 'done').length,
        s4: (document.querySelector('[data-testid="tour-step-s4"]') || {}).dataset
          ? document.querySelector('[data-testid="tour-step-s4"]').getAttribute('data-state') : null };
    });
    A(lepesek.kesz === 0 && lepesek.s4 === 'pending',
      'a bemutató NEM végezte el helyettünk a feladatot (a visszavonás lépése FÜGGŐ)',
      `${lepesek.osszes} lépés · elvégezve ${lepesek.kesz} · a visszavonás lépése: ${lepesek.s4}`);

    // (4) A KILÉPÉS ELSZÁMOL: a hátralévő lépések ÁTUGROTTAK, nem elvégezettek (a tutor szabálya).
    await T('tour-exit').click();
    await T('tour-summary').waitFor({ state: 'visible', timeout: 10_000 });
    const el = await page.evaluate(() => {
      const s = document.querySelector('[data-testid="tour-summary"]');
      const f = document.querySelector('[data-testid="tour-finished"]');
      return s ? { done: Number(s.getAttribute('data-done')), skipped: Number(s.getAttribute('data-skipped')), pending: Number(s.getAttribute('data-pending')), whole: f && f.getAttribute('data-whole') } : null;
    });
    A(Boolean(el) && el.skipped > 0 && el.whole === 'false',
      'a kilépés ELSZÁMOL: az átugrott lépések nem lesznek „elvégezve"', el ? `elvégezve ${el.done} · átugorva ${el.skipped} · hátravan ${el.pending}` : 'nincs összegzés');
    await T('tour-close').click();

    // (5) SZEMÉLYVÁLTÁS A VALÓDI ÚTON (kilépés → belépés a másik emberrel), majd a MEGHÍVÓ LEVÉL.
    await T('demo-switch-viewer').click();
    await page.waitForFunction(() => {
      const x = document.querySelector('[data-testid="header-subject"]');
      return x && (x.textContent || '').includes('bela@');
    }, null, { timeout: 20_000 }).catch(() => {});
    A(String(await txt('header-subject')).includes('bela@'), 'a személyváltás a valódi úton megtörtént', String(await txt('header-subject')));

    await T('demo-mail-open').click();
    await T('mailbox').waitFor({ state: 'visible', timeout: 10_000 });
    const link = page.locator('[data-testid="mailbox"] a').first();
    A(await link.count() > 0, 'a meghívó levele megnyitható a bemutató levél-fogadójából', `${await link.count()} hivatkozás`);
    await link.click();
    await T('section-invite').waitFor({ state: 'visible', timeout: 20_000 });
    A(await T('invite-redeem').isVisible(), 'a meghívó képernyője megnyílt, az elfogadás gombja ott van');

    // (6) A JAVÍTÁS KIPRÓBÁLÁSA: a KÉRT hálózati hiba után a lap a HARMADIK állapotot mondja ki.
    await T('demo-lose-me').click();
    A(String(await txt('demo-lose-me-note')).length > 0, 'a hálózati hiba kérése NYUGTÁZVA (a néző látja, mi fog történni)', String(await txt('demo-lose-me-note')).slice(0, 60));
    await T('invite-redeem').click();
    await T('ctx-recheck').waitFor({ state: 'visible', timeout: 15_000 });
    const nem = {
      szemely: await txt('header-subject'), fiok: await txt('header-workspace'), monogram: await txt('avatar'),
      folytatas: await txt('ctx-recheck'), kartya: await txt('invite-redeem-result'),
      valaszto: await T('account-switcher').isVisible(), profil: await T('profile').isVisible(),
      fiokLista: await txt('ws-list'), profilMenu: await txt('profile-menu'),
    };
    A(nem.szemely === D.UI.contextUnconfirmedShort && nem.fiok === D.UI.contextUnconfirmedShort && nem.monogram === '?',
      'a fejléc a NEM IGAZOLT állapotot mondja ki (nem a régi embert)', JSON.stringify(nem));
    A(nem.valaszto === false && nem.profil === false
      && !String(nem.fiokLista || '').includes('bela@') && !String(nem.profilMenu || '').includes('bela@'),
      'a régi személy és fiók SEHOL nem áll aktuálisként (választó · profil)', `választó: ${nem.valaszto} · profil: ${nem.profil}`);
    A(nem.folytatas === D.UI.contextRecheck && nem.kartya === D.UI.inviteAcceptedUnconfirmed,
      'a MŰKÖDŐ folytatás és az állapot mondata a nyelvcsomagból jön', `${nem.folytatas} · ${String(nem.kartya).slice(0, 48)}…`);
    A(await T('invite-redeem').isDisabled(), 'a régi művelet nem küldhető be újra (a beváltás gombja tiltott)');

    // (7) ÉS A FOLYTATÁS MŰKÖDIK: egy kattintás, és a valós személy, fiók, nézet, értesítés helyreáll.
    await T('ctx-recheck').click();
    await page.waitForFunction(() => {
      const x = document.querySelector('[data-testid="header-subject"]');
      return x && (x.textContent || '').includes('bela@');
    }, null, { timeout: 20_000 }).catch(() => {});
    const vissza = {
      szemely: await txt('header-subject'), fiok: await txt('header-workspace'),
      folytatas: await T('ctx-recheck').isVisible(), ertesito: await txt('global-notice'),
      fiokLista: await txt('ws-list'),
    };
    A(String(vissza.szemely).includes('bela@') && vissza.folytatas === false,
      'az állapot-ellenőrzés HELYREÁLLÍTJA a valós személyt', JSON.stringify(vissza).slice(0, 220));
    A(String(vissza.ertesito || '').includes(D.UI.inviteAcceptedLead),
      'a szerver által igazolt műveletet nem tagadjuk le: a siker a saját emberéhez ér', String(vissza.ertesito || '').slice(0, 90));
    A(String(vissza.fiokLista || '').includes('Minta Műhely'), 'a csatlakozott fiók ott áll a választóban', String(vissza.fiokLista || '').replace(/\s+/g, ' ').slice(0, 90));

    /**
     * (8) A MÁSODIK VEZETETT TÖRTÉNET — A MEGHÍVÓ-ÚT UTÁN, ÉS EZ SORREND, NEM ÍZLÉS.
     *
     * A két történet KÜLÖN kezdőállapotból indul (az egyikben Bélának FÜGGŐ meghívója van, a
     * másikban MEGLÉVŐ tagsága), ezért a bemutató-lap a történet-váltáskor újraveti az állapotot. Ha
     * a második történetet ELŐBB indítanánk, a meghívó-út alól tűnne el a függő meghívó. A tiszta
     * címre is visszatérünk: a meghívó hivatkozása (`?invite=…`) különben újratöltéskor megint a
     * meghívó-képernyőt nyitná (ugyanaz a MÉRT lelet, amiért a bemutató-lap `switchViewer`-e is a
     * `pathname`-re tér vissza).
     */
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const x = document.querySelector('[data-testid="header-subject"]');
      return x && /@/.test(x.textContent || '');
    }, null, { timeout: 20_000 }).catch(() => {});
    await tortenet('demo-story-reentry', '2 · Munkatárs visszatérése');

    A(hibak.length === 0, 'a teljes bejárás alatt NEM volt JavaScript-hiba', hibak.join(' | ') || 'nincs');

    console.log(lines.splice(0).join('\n'));
    await ctx.close();
  }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}

console.log('='.repeat(94));
console.log(`  TÉNY  a statikus kiszolgálóhoz beérkezett API-kérés: ${apiHits.length ? apiHits.join(' · ') : 'EGY SEM — minden kérést az adapter fogott el'}`);
if (apiHits.length) problems.push('a lap a kiszolgálótól kért API-t (nem önhordó)');
if (problems.length) {
  console.log(`RESULT: FAIL — ${problems.length} mért hiba`);
  for (const x of problems) console.log(`  · ${x}`);
  process.exit(1);
}
console.log('RESULT: PASS — az átadott csomag MEGNYITVA, a javított út VÉGIGKATTINTHATÓ asztali szélességen és 390 px-en.');
