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

let cov; let FEATURES; let TOURS; let SHELL_ANCHORS; let HU; let TEXTS; let HELPMOD;
try {
  cov = await import('../v3app/knowledge/coverage.mjs');
  ({ FEATURES, TOURS, SHELL_ANCHORS } = await import('../v3app/knowledge/features.mjs'));
  HU = await import('../v3app/public/i18n/hu.mjs');
  /**
   * A MENÜ-CSOPORTOK ÉS AZ OLDALTÉRKÉP A TÉNYLEGES FORRÁSBÓL (R144 — F144-02).
   *
   * A régi alak a nyelvcsomagból kérte a `NAV_GROUPS`-ot, ahol az NEM LÉTEZIK — a nyelvcsomagban
   * csak a csoport-FELIRATOK állnak (`NAV`), a csoport-SZERKEZET a `texts.mjs`-ben. MÉRVE: a
   * szótárral 17 oldalból 0 menütalálat, a tényleges forrással 16. A `|| []` tartalék-ág ezt
   * NÉMÁN üres menüvé alakította (KUKA-238), és a lefedés „javulni" látszott tőle.
   */
  TEXTS = await import('../v3app/public/texts.mjs');
  HELPMOD = await import('../v3app/public/help.mjs');
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
  navGroups: TEXTS.NAV_GROUPS,
  navAdmin: TEXTS.NAV_ADMIN,
  navPersonal: TEXTS.NAV_PERSONAL,
  // AZ OLDALTÉRKÉP NÉPESSÉGE A LAP SAJÁT FELOLDÓJÁBÓL (SMP-01): üzleti ÉS személyes nézet együtt —
  // egy oldal akkor is elérhető, ha csak a személyes menüben áll.
  sitemap: (() => {
    const u = HELPMOD.sitemapPages({ personal: false });
    const sz = HELPMOD.sitemapPages({ personal: true });
    return { all: [...new Set([...u.all, ...sz.all])] };
  })(),
});
const inv = cov.inventory({ population, features: FEATURES, tours: TOURS,
  shellAnchors: new Set(SHELL_ANCHORS || []) });

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
  /**
   * A HIÁNY-OSZTÁLYOK A GÉPI ALAKBAN IS BENNE VANNAK (R164 review, Codex, P2 —
   * `KUKA-384` · `D-VS-3192`).
   *
   * A LELET: a kettéosztás (`classifyGaps`) a csomag KÖZPONTI új kimenete volt, de CSAK az
   * ÖNPRÓBA ágában jelent meg, konzol-állításokban — a gépi artefaktum, amit a KÖVETKEZŐ kör olvas,
   * nem vitte. Sőt: a `--json` út a nyomtatás ELŐTT kilép, tehát ott az osztályozás egyáltalán nem
   * látszott. Így a leltár nem tudta megmondani, mely hiány PÓTOLHATÓ és mely NEVESÍTETT FEJLESZTÉSI
   * RÉS — pontosan azt nem, amiért készült (KUKA-126: amit senki nem olvas vissza, az nem kötés).
   */
  gap_classes: {
    total: inv.classes.total,
    counts: {
      fillable: inv.classes.fillable.length,
      capability_missing: inv.classes.capability_missing.length,
      unclassified: inv.classes.unclassified.length,
    },
    fillable: inv.classes.fillable,
    capability_missing: inv.classes.capability_missing,
    unclassified: inv.classes.unclassified,
  },
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
  /**
   * KÉT KÜLÖN VERDIKT (R144 — F144-01(c)): a TELJESSÉG és a REGRESSZIÓ nem ugyanaz a kérdés, és a
   * második soha nem teheti zölddé az elsőt. Az R143-as alakom összemosta őket egy önmagát növelő
   * plafonnal — attól egy huszonegy hiányos lefedés is zöld volt.
   */
  A('(LT) TELJESSÉG: nincs egyetlen valódi, alkalmazható lefedési hiány sem',
    inv.gapKeys.length === 0,
    inv.gapKeys.length
      ? `${inv.gapKeys.length} hiány — a cél NULLA. Soronként lentebb; a regresszió-irány külön áll (LR1/LR2).`
      : 'nulla hiány');
  /**
   * (LT2) AZ ELFOGADÁSI CÉL KÜLÖN ÁLLÍTÁS — ÉS EZ NEM A `LT` LAZÍTÁSA (R166 §3).
   *
   * Az R166 §3 elfogadási célja SZÓ SZERINT: *„pótolható hiány 0; osztályozatlan 0"* — és külön
   * kimondja, hogy a `personal.ownMatters` hiányzó képessége MEGMARAD nevesített fejlesztési résnek.
   * A két kérdés tehát NEM ugyanaz: a `LT` a TELJES hiány-halmazt méri (az a cél továbbra is NULLA,
   * és a fejlesztési rés miatt PIROS marad), ez az állítás pedig azt, hogy a PÓTOLHATÓ munka
   * elkészült-e. A `LT` szövegén és feltételén EGY KARAKTERT sem változtattunk — különben a zöld
   * eredmény a mérés lazításából jönne, nem a munkából (`KUKA-091` · az R166 §3 kikötése:
   * „Az eredeti őrt ne gyengítsd pusztán zöld eredményért").
   */
  A('(LT2) AZ ELFOGADÁSI CÉL: PÓTOLHATÓ hiány 0 és OSZTÁLYOZATLAN 0 (a nevesített fejlesztési rés külön sor, a `LT` azt is számolja)',
    inv.classes.fillable.length === 0 && inv.classes.unclassified.length === 0,
    inv.classes.fillable.length || inv.classes.unclassified.length
      ? `pótolható ${inv.classes.fillable.length} (${inv.classes.fillable.map((x) => x.key).join(' · ') || '—'}) · osztályozatlan ${inv.classes.unclassified.length}`
      : `pótolható 0 · osztályozatlan 0 · a maradék ${inv.classes.capability_missing.length} NEVESÍTETT fejlesztési rés: ${inv.classes.capability_missing.map((x) => x.key).join(' · ') || '—'}`);
  A('(LR1) REGRESSZIÓ: nem jelent meg olyan hiány, ami a(z) ' + cov.GAP_BASELINE.version + ' alapvonalban nem volt',
    inv.unexpected.length === 0,
    inv.unexpected.length ? `${inv.unexpected.length} ÚJ: ${inv.unexpected.join(' · ')}` : `${inv.gapKeys.length} hiány, mind örökölt`);
  A('(LR2) REGRESSZIÓ: amit megjavítottunk, az ki is került az alapvonalból (nincs HALOTT sor)',
    inv.dead.length === 0,
    inv.dead.length ? `${inv.dead.length} halott sor — vedd ki a GAP_BASELINE.keys-ből: ${inv.dead.join(' · ')}` : 'nincs halott sor');

  /**
   * ════════════════════════════════════════════════════════════════════════════════════════════
   * A HIÁNY KÉT CSOPORTJA — MÉRVE, NEM A JELENTÉSBEN ELMONDVA (R164/3)
   *
   * Az R164/3 azt kérte, hogy a réseket a VALÓDI kód szerint bontsuk kettőre, és azt is, hogy „ne
   * állítsd, hogy minden rés ebből jön". Egy jelentés-bekezdés ezt nem tudja igazolni, ezért a
   * csoportot a REGISZTER állapotából vezetjük le (`classifyGaps`), és itt MEGMÉRJÜK:
   *   · minden hiány pontosan EGY csoportba esik — OSZTÁLYOZATLAN nem maradhat;
   *   · és a „nevesített fejlesztési rés" tényleg NEVEZETT: a tervezett bejegyzés kimondja, mi hiányzik.
   * ════════════════════════════════════════════════════════════════════════════════════════════
   */
  const cls = inv.classes;
  A('(LC1) A KÉT CSOPORT TELJES: minden hiány pótolható VAGY nevesített fejlesztési rés — OSZTÁLYOZATLAN nincs',
    cls.unclassified.length === 0 && cls.total === inv.gapKeys.length,
    cls.unclassified.length
      ? `${cls.unclassified.length} OSZTÁLYOZATLAN: ${cls.unclassified.map((x) => `${x.key} (${x.basis})`).join(' · ')}`
      : `pótolható ${cls.fillable.length} · nevesített fejlesztési rés ${cls.capability_missing.length} · összesen ${cls.total} = a hiány-kulcsok száma`);
  A('(LC2) A FEJLESZTÉSI RÉS NEVEZETT: mindegyik kimondja, MI a hiányzó üzleti képesség',
    cls.capability_missing.every((x) => typeof x.reason === 'string' && x.reason.length > 20),
    cls.capability_missing.length
      ? cls.capability_missing.map((x) => `${x.key}: ${String(x.reason || '').slice(0, 70)}…`).join(' · ')
      : 'nincs fejlesztési rés a hiányok között');
  // ELLENPÁR: ha a tervezett bejegyzés NEM nevezi meg a hiányzó képességet, a sor OSZTÁLYOZATLAN
  // lesz — nem csúszik némán a „fejlesztési rés" sávba (KUKA-012).
  {
    const hamisFeatures = FEATURES.map((f) => (f.screen === 'personal' && f.status === 'planned'
      ? { ...f, missing_capability: undefined } : f));
    const hamis = cov.classifyGaps({ rows: inv.rows, tourRows: inv.tourRows, features: hamisFeatures });
    /**
     * (LC4) ÉS AZ OSZTÁLYOZÁS A GÉPI ARTEFAKTUMBAN IS OTT VAN (R164 review, Codex, P2 — `KUKA-384`).
     *
     * A LELET: a kettéosztás CSAK itt, az önpróba konzol-állításaiban létezett; a JSON — amit a
     * KÖVETKEZŐ kör olvas, és amiért ez a lap készült — nem vitte. A `--json` út pedig a nyomtatás
     * ELŐTT kilép, tehát ott egyáltalán nem látszott. Ezért most a kiírt FÁJLT olvassuk vissza: ami
     * nincs a fájlban, az a következő körben nem létezik (KUKA-126 · CLAUDE.md: a repó a memória).
     */
    const kiirt = JSON.parse(readFileSync(jsonPath, 'utf8'));
    A('(LC4) A GÉPI ARTEFAKTUM VISZI a hiány-osztályokat — a visszaolvasott fájl számai EGYEZNEK a mérttel',
      Boolean(kiirt.gap_classes)
      && kiirt.gap_classes.counts.fillable === cls.fillable.length
      && kiirt.gap_classes.counts.capability_missing === cls.capability_missing.length
      && kiirt.gap_classes.counts.unclassified === cls.unclassified.length
      && kiirt.gap_classes.total === cls.total
      && Array.isArray(kiirt.gap_classes.capability_missing)
      && kiirt.gap_classes.capability_missing.every((x) => typeof x.key === 'string' && typeof x.reason === 'string'),
      kiirt.gap_classes
        ? `a fájlban: pótolható ${kiirt.gap_classes.counts.fillable} · fejlesztési rés ${kiirt.gap_classes.counts.capability_missing} · osztályozatlan ${kiirt.gap_classes.counts.unclassified}`
        : 'a fájlban NINCS `gap_classes` — a következő kör nem tudja, melyik rés melyik');
  }
  {
    const hamisFeatures2 = FEATURES.map((f) => (f.screen === 'personal' && f.status === 'planned'
      ? { ...f, missing_capability: undefined } : f));
    const hamis = cov.classifyGaps({ rows: inv.rows, tourRows: inv.tourRows, features: hamisFeatures2 });
    A('(LC3) ELLENPÁR: a MEGNEVEZÉS NÉLKÜLI tervezett bejegyzés OSZTÁLYOZATLAN-ra vált (nem lesz némán „fejlesztési rés")',
      hamis.unclassified.some((x) => x.key === 'page:personal') && hamis.capability_missing.length === 0,
      `osztályozatlan: ${hamis.unclassified.map((x) => x.key).join(', ') || 'nincs'}`);
  }
  console.log(`      PÓTOLHATÓ (${cls.fillable.length}): ${cls.fillable.map((x) => x.key).join(', ')}`);
  console.log(`      NEVESÍTETT FEJLESZTÉSI RÉS (${cls.capability_missing.length}): ${cls.capability_missing.map((x) => x.key).join(', ') || 'nincs'}`);

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
  // A DARABSZÁM NEM ELVÁRÁS (KUKA-237): az első alakom `gaps.length === 3`-ra illesztett, és az
  // F144-02 javítása (az elérhetőség bekerült a hiányok közé) PIROSRA vitte egy HELYESEBB mérés
  // mellett. A próba azt mérje, hogy a NEVEZETT hiányok ott vannak-e, ne azt, hogy hányan vannak.
  const hamisSzoveg = hamis.gaps.join(' | ');
  A('(L8) ELLENPÁR: egy nem létező oldalra a feloldó NEVEZETT hiányt ad',
    hamis.evidence === cov.EVIDENCE.missing
    && /funkció-leírás/.test(hamisSzoveg) && /gyakori kérdés/.test(hamisSzoveg)
    && /bemutató/.test(hamisSzoveg) && /nem érhető el/.test(hamisSzoveg),
    `hiányok=${hamis.gaps.length} szint=${hamis.evidence}`);

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

  // (L9)–(L12) A MŰVELET- ÉS BEMUTATÓ-KÖTÉS MINDKÉT IRÁNYA (R144 — F144-01).
  const tech = cov.actionCoverage({ kind: 'action', id: 'panel-close' }, { features: FEATURES });
  A('(L9) a TISZTÁN TECHNIKAI művelet kimondva kivett, INDOKKAL — nem némán fedett',
    tech.technical === true && tech.features.length === 0 && tech.gaps.length === 0
    && typeof tech.why === 'string' && tech.why.length > 10,
    `technical=${tech.technical} indok=${String(tech.why).slice(0, 60)}`);
  const hamisOlvasas = cov.declaredReadsNotInSource(FEATURES, population.route);
  A('(L13) nincs olyan DEKLARÁLT támogató olvasás, ami a route-táblában nem létezik',
    hamisOlvasas.length === 0, hamisOlvasas.length ? hamisOlvasas.join(' · ') : `${population.route.length} végpont mérve`);
  const hamisKotes = cov.declaredActionsNotInSource(FEATURES, population.action);
  A('(L10) nincs olyan DEKLARÁLT művelet, ami a forrásban nem létezik (elírás · kivezetett gomb)',
    hamisKotes.length === 0, hamisKotes.length ? hamisKotes.join(' · ') : `${population.action.length} művelet mérve`);
  /**
   * (L11) ELLENPÁR a MŰVELET-kötésre — a SPEC által kért negatív kontroll (R144/F144-01):
   * „a tényleges tagságmegszüntetési kötés eltávolítása legyen piros akkor is, ha meghívó- és
   * hatáskör-visszavonás létezik". Az R143-as rész-szó-egyezés itt ZÖLD maradt (mérve).
   */
  const nelkule = FEATURES.filter((f) => f.id !== 'members.revoke');
  const r11 = cov.actionCoverage({ kind: 'action', id: 'revoke' }, { features: nelkule });
  A('(L11) ELLENPÁR: a tagság-megszüntetés kötése nélkül a `revoke` HIÁNY — a meghívó- és '
    + 'hatáskör-visszavonás NEM bizonyít más feladatot',
    r11.gaps.length === 1 && r11.features.length === 0,
    `gaps=${r11.gaps.length} fedi=${JSON.stringify(r11.features)}`);
  /**
   * (L12) ELLENPÁR a BEMUTATÓ-kötésre: a MENÜPONTRA mutató, task nélküli lépés nem bizonyít —
   * ez volt az R143 három hamis pozitívjának a közös alakja (help-open · nav-members · levélablak).
   */
  const hamisTura = cov.tourCoverage(
    { id: 'proba.feature', tour: null, entry: 'nav-members', anchors: ['nav-members'],
      surface: 'proba-munkafelulet', shared_tour: { tour: 'tour.invite', steps: ['s1'] } },
    { tours: TOURS });
  A('(L12) ELLENPÁR: a MENÜPONTRA mutató, task nélküli lépés nem fedi a funkciót',
    hamisTura.how === 'declared_invalid' && hamisTura.problems.length > 0,
    `how=${hamisTura.how} indok=${String(hamisTura.problems[0] || '').slice(0, 70)}`);

  console.log(`\nZÖLD=${green.length} · PIROS=${red.length}`);
  console.log(`Gépi alak: ${jsonPath}`);
  if (red.length) { console.log('\nPIROSAK:'); red.forEach((f) => console.log(' - ' + f)); process.exit(1); }
  process.exit(0);
}

process.exit(0);
