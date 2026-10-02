#!/usr/bin/env node
// tools/v3_funkcio_leltar.mjs — A LEFEDÉSI LELTÁR ÉS AZ ŐR, EGY FUTTATÓBÓL (R142 §4 · §8).
//
// KÉT MÓD, EGY SZABÁLY-FORRÁS (KUKA-009 · KUKA-039):
//   · riport (alapértelmezés) — funkciónkénti és fajtánkénti lefedési tábla, emberi + gépi alakban;
//   · `--selftest`            — az ŐR: nevezett hiányra PIROS, és a népesség padlóját is méri.
//
// Mindkettő UGYANAZT a `v3app/knowledge/coverage.mjs` modult hívja — a szöveg-egyezés itt nem elég,
// mert van mit MEGHÍVNI (KUKA-009).
//
// AMIT EZ A FUTTATÓ KIMOND, ÉS AMIT NEM. A népesség FORRÁSBÓL van kivonva (route-tábla, nyelvcsomag
// oldal-listája, `data-action`, űrlapok, belépési nézetek) — nem futtatásból. Ezért minden sor viszi
// a bizonyíték SZINTJÉT, és a `futtatott` szintet a böngészős tanúk adják (`proof:demo-walk`,
// `test:e2e`), nem ez. A négy szintet soha nem mossuk össze (R142 §4).
//
// Kilépési kód: 0 = hibát nem talált · 1 = MÉRT hibát talált · 2 = a mérés elakadt.

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { artifactPath } = require('../contracts/artifactNaming.js');
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SELFTEST = process.argv.includes('--selftest');
const JSON_ONLY = process.argv.includes('--json');

const red = []; const green = [];
function A(name, cond, extra = '') {
  const line = `${name}${extra ? ' — ' + extra : ''}`;
  (cond ? green : red).push(line);
  if (!JSON_ONLY) console.log(`${cond ? 'ZÖLD ' : 'PIROS'} ${line}`);
}

let cov; let FEATURES; let TOURS; let HU;
try {
  cov = await import('../v3app/knowledge/coverage.mjs');
  ({ FEATURES, TOURS } = await import('../v3app/knowledge/features.mjs'));
  HU = await import('../v3app/public/i18n/hu.mjs');
} catch (e) {
  console.error('ELAKADT MÉRÉS: a regiszterek nem olvashatók. Ok:', e && e.message);
  process.exit(2);
}

const olvas = (rel) => {
  try { return readFileSync(join(ROOT, rel), 'utf8'); } catch { return null; }
};

// A FELÜLET FORRÁSAI — MINDEN szállított lap-modul, nem csak az `app.js`. A chat, a súgó és a
// bemutató SAJÁT gombokat rajzol; ha csak az `app.js`-t olvasnánk, a népesség némán szűkebb lenne
// (KUKA-051 · a padló ezt meg is fogja).
const UI_FILES = ['v3app/public/app.js', 'v3app/public/help.mjs', 'v3app/public/chat.mjs', 'v3app/public/tour.mjs'];
const serverSource = olvas('v3app/server.mjs');
const uiSources = UI_FILES.map((f) => ({ f, src: olvas(f) }));
const hianyzoForras = [serverSource ? null : 'v3app/server.mjs', ...uiSources.map((x) => (x.src ? null : x.f))].filter(Boolean);
if (hianyzoForras.length) {
  console.error(`ELAKADT MÉRÉS: nem olvasható forrás: ${hianyzoForras.join(', ')}`);
  process.exit(2);
}

const dict = HU.default || HU;
const population = cov.populationFrom({
  serverSource,
  uiSources: uiSources.map((x) => x.src),
  pageLabels: dict.PAGE,
  navGroups: dict.NAV_GROUPS,
  navAdmin: dict.NAV_ADMIN,
  navPersonal: dict.NAV_PERSONAL,
});
const inv = cov.inventory({ population, features: FEATURES, tours: TOURS });

// ── A GÉPI ALAK — a következő kör EZT olvassa, nem újraméri (CLAUDE.md: a repó a memória) ───────
const jsonPath = join(ROOT, artifactPath({ area: 'reports', kind: 'funkcio_lefedes', ext: 'json', version: '0.1.0' }));
mkdirSync(dirname(jsonPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify({
  contract: cov.LEF_CONTRACT.id,
  evidence_levels: cov.EVIDENCE,
  counts: inv.counts,
  floor: cov.FLOOR,
  floor_breaks: inv.floorBreaks,
  rows: inv.rows,
  tour_rows: inv.tourRows,
}, null, 2));

if (JSON_ONLY) { console.log(jsonPath); process.exit(0); }

// ── EMBERI ALAK ─────────────────────────────────────────────────────────────────────────────────
if (!SELFTEST) {
  console.log('='.repeat(96));
  console.log('V3 — FUNKCIÓ-LEFEDÉSI LELTÁR (LEF-01). A NÉPESSÉG A TÉNYLEGES FORRÁSBÓL JÖN.');
  console.log('='.repeat(96));
  console.log('A bizonyíték szintje SOHA nincs összemosva: forrásból ellenőrzött ≠ futtatott.');
  console.log('A `futtatott` szintet a böngészős tanúk adják (proof:demo-walk · test:e2e) — nem ez a lap.\n');
  for (const k of cov.KINDS) {
    const c = inv.counts[k];
    console.log(`── ${k.toUpperCase()} — ${c.total} darab (padló ${cov.FLOOR[k]}) · nevezett hiány: ${c.gaps}`);
    for (const r of inv.rows[k]) {
      if (!r.gaps.length) continue;
      console.log(`   HIÁNY  ${r.id}${r.label ? ` („${r.label}")` : ''} → ${r.gaps.join(' · ')}`);
    }
  }
  console.log('\n── BEMUTATÓ-LEFEDÉS funkciónként (a közös út is ÉR, ha egy LÉPÉSE tényleg odavisz)');
  const byHow = {};
  for (const t of inv.tourRows) { byHow[t.how] = byHow[t.how] || []; byHow[t.how].push(t); }
  for (const how of ['own', 'shared', 'note_only', 'none']) {
    const list = byHow[how] || [];
    const cim = { own: 'SAJÁT bemutató', shared: 'KÖZÖS bemutató (mért lépéssel)', note_only: 'CSAK indok-szöveg — az R142 óta NEM teljesítés', none: 'SEMMI' }[how];
    console.log(`   ${cim}: ${list.length}`);
    for (const t of list) console.log(`      ${t.feature}${t.tour ? ` → ${t.tour} (${t.steps.join(',')})` : ''}`);
  }
  console.log(`\nGépi alak: ${jsonPath}`);
}

// ── AZ ŐR ───────────────────────────────────────────────────────────────────────────────────────
if (SELFTEST) {
  console.log('V3 — LEFEDÉSI ŐR (LEF-01). A hiány PIROS, nem néma.\n');
  // (L1) A NÉPESSÉG NEM ZSUGORODHAT — a kivonatolás elromlása „javulásnak" látszana (KUKA-012).
  A('(L1) a népesség minden fajtán eléri a MÉRT padlót', inv.floorBreaks.length === 0,
    inv.floorBreaks.length ? inv.floorBreaks.join(' · ') : Object.entries(inv.counts).map(([k, c]) => `${k}=${c.total}`).join(' · '));

  // (L2–L6) FAJTÁNKÉNT: nevezett hiány = PIROS. A sor MEGMONDJA, mi hiányzik (KUKA-171).
  /**
   * A HIÁNY A DEKLARÁLT NYITOTT HALMAZHOZ MÉRVE — MINDKÉT IRÁNYBAN (LEF-01).
   *
   * Nem a hiányok SZÁMA a verdikt, hanem a VISZONY: egy nem deklarált hiány visszacsúszás (vagy új,
   * lefedetlen képesség), egy halott rögzítés pedig azt jelenti, hogy a lista nem követte a
   * javítást. A kettőt soha nem mossuk össze — és a lista MÉRETE plafon (KUKA-012).
   */
  A('(L2) NINCS olyan hiány, ami ne lenne NEVESÍTVE a nyitott halmazban',
    inv.unexpected.length === 0,
    inv.unexpected.length ? `${inv.unexpected.length} nem deklarált: ${inv.unexpected.join(' · ')}` : `${inv.gapKeys.length} hiány, mind nevesítve`);
  A('(L3) NINCS HALOTT rögzítés: amit megjavítottunk, az ki is került a listáról',
    inv.dead.length === 0,
    inv.dead.length ? `${inv.dead.length} halott sor — vedd ki a OPEN_GAPS-ból: ${inv.dead.join(' · ')}` : 'nincs halott sor');
  A('(L4) a nyitott hiányok száma nem NŐTT a deklarált plafon fölé',
    inv.gapKeys.length <= cov.OPEN_GAPS_CEILING,
    `${inv.gapKeys.length} / plafon ${cov.OPEN_GAPS_CEILING}`);
  // ÉS A FAJTÁNKÉNTI ÁLLAPOT KIÍRVA — a nyitott halmaz nem elrejti, hogy MI maradt (KUKA-093).
  const cimek = { route: 'végpont', page: 'oldal', action: 'művelet', form: 'űrlap', authview: 'belépési nézet' };
  for (const k of cov.KINDS) {
    const bad = inv.rows[k].filter((r) => r.gaps.length);
    console.log(`      ${cimek[k]}: ${inv.counts[k].total - bad.length}/${inv.counts[k].total} fedett${bad.length ? ` · nyitott: ${bad.map((r) => r.id).join(', ')}` : ''}`);
  }

  // (L7) A BEMUTATÓ-LEFEDÉS LÉPÉS, NEM SZÖVEG (R142 §4) — a `tour_note`-tal álló funkció NEM fedett,
  // és a nyitott halmazban NEVESÍTVE kell állnia (a viszonyt az L2/L3 méri).
  const csakSzoveg = inv.tourRows.filter((t) => t.how === 'note_only' || t.how === 'none');
  console.log(`      bemutató: ${inv.tourRows.length - csakSzoveg.length}/${inv.tourRows.length} MÉRT lépéssel fedett`
    + `${csakSzoveg.length ? ` · csak indok-szöveggel: ${csakSzoveg.map((t) => t.feature).join(', ')}` : ''}`);
  A('(L7) a bemutató-lefedés LÉPÉSEN áll: ahol közös túra fed, ott VAN mért lépés',
    inv.tourRows.every((t) => t.how !== 'shared' || t.steps.length > 0),
    `saját ${inv.tourRows.filter((t) => t.how === 'own').length} · közös ${inv.tourRows.filter((t) => t.how === 'shared').length} · csak szöveg ${csakSzoveg.length}`);

  // (L8) ÉS AZ ŐR TUDJON PIROSRA VÁLTANI (KUKA-092): egy kitalált, nem létező oldalra a lefedés-
  // feloldó NEVEZETT hiányt kell adjon. Ha ez zöld, az őr dísz.
  const hamis = cov.pageCoverage({ kind: 'page', id: 'nincs-ilyen-oldal-sehol', label: 'x', menu: null, group: null },
    { features: FEATURES, tours: TOURS });
  A('(L8) ELLENPÁR: egy nem létező oldalra a feloldó NEVEZETT hiányt ad',
    hamis.gaps.length === 3 && hamis.evidence === cov.EVIDENCE.missing,
    `hiányok=${hamis.gaps.length} szint=${hamis.evidence}`);

  // (L9) ÉS A HÁZTARTÁSI KIVÉTEL NEVEZETT, NEM NÉMA: a listán szereplő művelet nem „fedett", hanem
  // KIMONDOTTAN kivett — a kettő nem ugyanaz (KUKA-012).
  const hk = cov.actionCoverage({ kind: 'action', id: 'panel-close' }, { features: FEATURES });
  /**
   * (L5)–(L6) AZ ELLENPÁROK — a VALÓDI feloldót hívják, kitalált bemenettel (KUKA-092 · KUKA-068).
   * Ha ezek zöldek egy rontott bemenetre, akkor az L2/L3 dísz, nem védelem.
   */
  const r1 = cov.gapVerdict(['page:uj-hiany'], []);
  A('(L5) ELLENPÁR: a NEM deklarált hiányt a feloldó visszacsúszásnak mondja',
    r1.unexpected.length === 1 && r1.unexpected[0] === 'page:uj-hiany' && r1.dead.length === 0,
    JSON.stringify({ unexpected: r1.unexpected, dead: r1.dead }));
  const r2 = cov.gapVerdict([], ['page:mar-nincs-hiany']);
  A('(L6) ELLENPÁR: a HALOTT rögzítést a feloldó külön mondja ki (nem mossa össze)',
    r2.dead.length === 1 && r2.dead[0] === 'page:mar-nincs-hiany' && r2.unexpected.length === 0,
    JSON.stringify({ unexpected: r2.unexpected, dead: r2.dead }));

  A('(L9) a háztartási művelet KIMONDOTTAN kivett, nem némán fedett',
    hk.housekeeping === true && hk.features.length === 0 && hk.gaps.length === 0,
    `housekeeping=${hk.housekeeping}`);

  console.log(`\nZÖLD=${green.length} · PIROS=${red.length}`);
  console.log(`Gépi alak: ${jsonPath}`);
  if (red.length) { console.log('\nPIROSAK:'); red.forEach((f) => console.log(' - ' + f)); process.exit(1); }
  process.exit(0);
}

process.exit(0);
