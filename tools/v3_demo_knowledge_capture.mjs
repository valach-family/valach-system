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

  /**
   * ÉS A TÖRTÉNETEK INDULÓ ADATA IS KELL (R176 · `KUKA-417` · `KUKA-421`).
   *
   * A két átívelő végigvezetés felkínálása ma az INDULÓ ADATHOZ kötött: a visszavonás egy FÜGGŐ
   * meghívást kér, a visszatérés egy HATÁLYOS másik tagot. A pillanatkép tehát csak akkor születhet
   * meg, ha a fixtúra MINDKETTŐT előállítja — különben a lenti `hiany` ellenőrzés (helyesen) elakad.
   * Cili meghívása FÜGGŐ marad, Dóra elfogadja: így a két tény egymástól független marad.
   */
  const anna = cookie;
  await call('POST', '/api/invites', { email: 'cili@demo.vs', role: 'user', scope: 'keszlet', lang: 'hu' });
  const meghD = await call('POST', '/api/invites', { email: 'dora@demo.vs', role: 'user', scope: 'keszlet', lang: 'hu' });
  const jegy = meghD.body && meghD.body.token;
  if (!jegy) throw new Error('a második meghívó jegye nem jött meg — a mérés elakadt');
  cookie = null;                                           // ÚJ munkamenet: Dóra a saját fiókjával
  await call('POST', '/api/register', { email: 'dora@demo.vs', password: 'dora-titok-1' });
  const dMails = (await call('GET', '/dev/mailbox')).body.mails || [];
  const dm = dMails.find((x) => x.to === 'dora@demo.vs' && /meg/i.test(x.subject || ''));
  if (!dm) throw new Error('Dóra megerősítő levele nem jött meg — a mérés elakadt');
  const du = new URL(dm.link);
  await call('GET', du.pathname + du.search);
  await call('POST', '/api/login', { email: 'dora@demo.vs', password: 'dora-titok-1' });
  const bevaltas = await call('POST', '/api/invites/redeem', { token: jegy });
  if (!bevaltas.body || bevaltas.body.ok !== true) throw new Error(`Dóra beváltása nem sikerült (${bevaltas.status})`);

  /**
   * ÉS CILINEK FIÓKJA IS VAN — A MEGHÍVÓJA VISZONT FÜGGŐ MARAD (R186 §2 · `KUKA-447`).
   *
   * MIÉRT KELL. A visszavonás-története a MEGHÍVOTT belépésével folytatódik (a `s6` lépés az ő
   * nézetére vált), és az R186 §2 óta a személyváltás a VÁRT résztvevőt kívánja meg. A kiszolgáló
   * ezért csak olyan függő meghívót fogad el induló adatként, aminek a címzettje AZONOSÍTHATÓ —
   * különben a történet olyan utat állítana, ami nincs. MÉRVE: Cili fiókja nélkül a `/api/assistant/
   * status` NEM kínálja fel a `tour.inviteRevoke`-ot, és ez az eszköz (helyesen) elakad.
   *
   * A MEGHÍVÓT NEM VÁLTJUK BE: Cili fiókja létezik, az ajánlata FÜGGŐ marad — pontosan ez a
   * történet induló adata. Ugyanaz a lecke NYOLCADSZOR: a felkínálás a VÉGIGVIHETŐSÉG állítása
   * (`KUKA-417` · `421` · `429` · `430` · `431` · `437` · `442` · `447`).
   */
  cookie = null;                                           // ÚJ munkamenet: Cili a saját fiókjával
  await call('POST', '/api/register', { email: 'cili@demo.vs', password: 'cili-titok-1' });
  const cMails = (await call('GET', '/dev/mailbox')).body.mails || [];
  const cm = cMails.find((x) => x.to === 'cili@demo.vs' && /meg/i.test(x.subject || ''));
  if (!cm) throw new Error('Cili megerősítő levele nem jött meg — a mérés elakadt');
  const cu = new URL(cm.link);
  await call('GET', cu.pathname + cu.search);
  cookie = anna;                                           // vissza a fiókkezelő munkamenetére

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

  /**
   * A VILÁGHOZ KÖTÖTT AZONOSÍTÓK NEM KERÜLNEK A CSOMAGBA (R186 §5 · `KUKA-453`).
   *
   * A csomag a VALÓDI szerver válasz-ALAKJÁT viszi (`KUKA-016`), a benne álló azonosítók viszont
   * ennek az ELDOBHATÓ mérő-világnak az azonosítói: az alany-azonosítók minden rögzítésnél MÁSOK
   * (mérve, két egymás utáni rögzítés: `served_subject_id` `sub_ee1e03aa…` → `sub_979081…`), a
   * meghívó jelölője pedig egy VÉLETLEN tokenből képzett lenyomat. Ennek két mért következménye van:
   *
   *   1. A `--check` ÍGÉRETE HAMIS VOLT: „megmondja, elavult-e" — de MINDEN futásnál ELAVULT-at
   *      mondott, akkor is, ha a forrás nem változott. Egy jel, ami mindig pirosat ad, nem jel
   *      (`KUKA-050`: a szöveg kövesse a valóságot).
   *   2. Az R186 §2 óta a csomag a történet CÉL-KÖTÉSÉT is viszi (`story.ref` · `story.actor`).
   *      Változatlanul kiszolgálva az egy NEM LÉTEZŐ célra szólna a bemutató saját világában, és a
   *      történet fail-closed kapui megállítanák a bemutatót (`KUKA-453`).
   *
   * Ezért a négy világ-kötött mező KIMONDOTTAN `null`: mindegyiket a bemutató-adapter adja meg a
   * SAJÁT állapotából (`v3app/public/demo-adapter.mjs` — a `served()` és a `storyKotes()`), és egy
   * esetleges visszacsúszásnál a `null` FAIL-CLOSED — egy másik világ HIHETŐ azonosítója nem az.
   * A `served_book_id` NEM ilyen: két rögzítés között változatlan, tehát marad.
   */
  const vilagtalan = (b) => ({ ...b, served_book_id: null, served_subject_id: null });
  const kotesNelkul = (lista) => (Array.isArray(lista) ? lista : [])
    .map((t) => (t && t.story ? { ...t, story: { ...t.story, ref: null, actor: null } } : t));
  const statusCsomag = {
    ...vilagtalan(st.body),
    tours: kotesNelkul(tours),
    // A MÁSODIK LISTA IS VISZI A KÖTÉST, ÉS EZT MÉRTEM: az első alakom csak a `tours`-t
    // semlegesítette, és két egymás utáni rögzítés diffje mutatta meg, hogy a `resumable_tours`
    // UGYANAZOKAT a jelölőket hordozza (a szerver mindkettőt ugyanazzal a feloldóval állítja elő).
    // Ugyanez a könyv-azonosítóra is igaz volt: a `served_book_id` is rögzítésenként más.
    resumable_tours: kotesNelkul(st.body.resumable_tours),
  };
  const payload = `${JSON.stringify({ status: statusCsomag, knowledge: vilagtalan(kn.body) }, null, 1)}\n`;
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
