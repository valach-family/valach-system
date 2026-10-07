#!/usr/bin/env node
// tools/v3_demo_knowledge_capture.mjs — A BEMUTATÓ TUDÁS-CSOMAGJA A VALÓDI FORRÁSBÓL (R140).
//
// MIÉRT VAN EZ, ÉS MIÉRT ESZKÖZ. A bemutató lapja nem futtat szervert: a segéd állapotát és
// tudás-indexét egy STATIKUS fájlból kapja (`v3app/public/demo-assistant.json`). Ha azt a fájlt
// kézzel írnánk, a bemutató a termék helyett SAJÁT igazságot hordozna — a lépés-lista, a szövegek
// és az elérhetőség elcsúszna a `knowledge/features.mjs`-től, és senki nem venné észre
// (KUKA-018: egy fogalomnak EGY otthona van · KUKA-172: a szintetikus háttér ALAKJA is állítás).
//
// EZÉRT A CSOMAG SZÁRMAZTATOTT: ez az eszköz elindítja a VALÓDI szervert, `VS_DEMO=1`-gyel (a
// doktrína `demo` környezete), létrehoz egy eldobható fiókot, és a VALÓDI `/api/assistant/status`
// és `/api/assistant/knowledge` válaszát írja ki. Amit a bemutató mutat, azt tehát a termék
// mondta — nem mi.
//
// Használat:  npm run demo:knowledge           (írja a csomagot)
//             npm run demo:knowledge -- --check (NEM ír: megmondja, elavult-e)
//
// Kilépési kód: 0 = kész / naprakész · 1 = `--check` mellett ELAVULT · 2 = a mérés elakadt.

import { writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const OUT = join(ROOT, 'v3app', 'public', 'demo-assistant.json');
const CHECK = process.argv.includes('--check');

// A BEMUTATÓ-KÖRNYEZET JELE A SZERVER INDÍTÁSA ELŐTT: a `requires_demo` bemutatókat csak így adja ki.
process.env.VS_DEMO = '1';

let app = null; let dbPath = null;
try {
  const srv = await import(join(ROOT, 'v3app', 'server.mjs'));
  dbPath = srv.selfcheckDbPath();
  app = await srv.startServer({ port: 0, dbPath });
  const base = `http://127.0.0.1:${app.port}`;
  let cookie = null;
  const call = async (m, p, b) => {
    const h = {};
    if (cookie) h.Cookie = cookie;
    if (b !== undefined) h['Content-Type'] = 'application/json';
    const r = await fetch(base + p, { method: m, headers: h, redirect: 'manual',
      body: b === undefined ? undefined : JSON.stringify(b) });
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    const ct = r.headers.get('content-type') || '';
    return { status: r.status, body: ct.includes('json') ? await r.json() : await r.text() };
  };

  // EGY ELDOBHATÓ FIÓKKEZELŐ: a bemutató lépés-listája fiókkezelői jogot kíván, tehát a
  // pillanatkép is azzal készül. Az adatbázis a futás végén törlődik.
  await call('POST', '/api/register', { email: 'anna@demo.vs', password: 'anna-titok-1' });
  const mails = (await call('GET', '/dev/mailbox')).body.mails || [];
  const m = mails.find((x) => x.to === 'anna@demo.vs' && /meg/i.test(x.subject || ''));
  if (!m) throw new Error('a megerősítő levél nem jött meg — a mérés elakadt');
  const u = new URL(m.link);
  await call('GET', u.pathname + u.search);
  await call('POST', '/api/login', { email: 'anna@demo.vs', password: 'anna-titok-1' });
  await call('POST', '/api/workspaces', { name: 'Minta Műhely Kft.', plan: 'pro',
    business: { jurisdiction: 'HU', tax_id: '62345676-2-42' } });

  // A FELÜLET MEGNEVEZÉSE (R164/3). A csomag a BEMUTATÓ LAPJÁHOZ készül (`demo-index.html`), és a
  // szereplő-váltó végigvezetéseket a kiszolgáló ahhoz a felülethez köti — a vezérlő létét a lap
  // FÁJLJÁBÓL méri, nem ebből a megnevezésből. Ha a váltó horgony kiesne a bemutató lapjáról, a
  // lenti `hiany` ellenőrzés nevezetten elakad: a csomag nem születik meg hamis listával.
  const st = await call('GET', '/api/assistant/status?lang=hu&surface=demo');
  const kn = await call('GET', '/api/assistant/knowledge?lang=hu');
  if (!st.body || st.body.ok !== true) throw new Error(`a segéd állapota nem jött meg (${st.status})`);
  if (!kn.body || kn.body.ok !== true) throw new Error(`a tudás-index nem jött meg (${kn.status})`);

  const tours = st.body.tours || [];
  const kell = ['tour.inviteRevoke', 'tour.reentry'];
  const hiany = kell.filter((id) => !tours.some((t) => t.id === id));
  if (hiany.length) throw new Error(`a bemutató-kötött végigvezetések hiányoznak a válaszból: ${hiany.join(', ')} — a VS_DEMO kapu vagy a definíció nem áll`);

  const payload = `${JSON.stringify({ status: st.body, knowledge: kn.body }, null, 1)}\n`;
  if (CHECK) {
    const mai = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (mai === payload) { console.log('A bemutató tudás-csomagja NAPRAKÉSZ.'); process.exit(0); }
    console.error('ELAVULT: a bemutató tudás-csomagja eltér a mai forrástól. Futtasd: npm run demo:knowledge');
    process.exit(1);
  }
  writeFileSync(OUT, payload);
  for (const id of kell) {
    const t = tours.find((x) => x.id === id);
    console.log(`  ${id}: ${t.steps.length} lépés · váltás-lépés: ${t.steps.filter((x) => x.switch_actor).length}`);
  }
  console.log(`ÍRVA: ${OUT} (${payload.length} bájt) · bemutatók: ${tours.length}`);
  process.exit(0);
} catch (e) {
  console.error('ELAKADT MÉRÉS:', e && e.message);
  process.exit(2);
} finally {
  try { if (app) await app.close(); } catch { /* a lezárás hibája nem írja felül a verdiktet */ }
  try { if (dbPath && existsSync(dbPath)) rmSync(dbPath, { force: true }); } catch { /* eldobható */ }
}
