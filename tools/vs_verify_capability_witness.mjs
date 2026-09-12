#!/usr/bin/env node
/**
 * CAP-01 TANÚ-ŐR — A FÁZIS-KÉPESSÉGEK ÁLLAPOTA A V3 REPÓ VALÓSÁGÁHOZ MÉRVE (R63 §5).
 *
 * MIÉRT ITT, ÉS MIÉRT NEM A BOARDON. A board mátrixa fázis-képességekre hivatkozik (`capability`),
 * és a képesség állapota dönti el, hogy egy tétel nem-releváns, mérendő, vagy egyáltalán nem
 * zárható le. A képességek TANÚJA viszont ebben a repóban él: a board szolgáltatás a V3 lemezét
 * nem látja. Ezt nem hallgatjuk el és nem is állítunk mérést oda, ahol nincs (KUKA-089): a board
 * regisztere kimondja, hogy a tanú HOL mérhető, és a mérést EZ az őr végzi el.
 *
 * A KÜLSŐ FÉL KÉRÉSE (R63 §5): „A fázisváltást a módosító agent feladata legyen rögzíteni és az ŐR
 * feladata ellenőrizni; az operátor ne emlékeztesse rá." Ez az őr a második fele.
 *
 * MIT MÉR:
 *   · minden mérhető képességnél a TANÚT (fájl/szkript léte ebben a repóban);
 *   · ha a board regisztere elérhető (`V2_REPO_ROOT`, vagy a szomszéd munkamásolat), a RÖGZÍTETT
 *     állapotot a mérthez hasonlítja — az elavult rögzítés PIROS;
 *   · amit NEM tud mérni, azt KIMONDJA (nevezett kihagyás), nem tesz úgy, mintha rendben lenne.
 *
 * Futtatás:  npm run verify:capability-witness   ·   --json a gépi alakhoz
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * A REPÓ FÁJLJAI — a GIT DÖNTÉSÉN mérve, nem kézi kizáró-listával (KUKA-057).
 *
 * SAJÁT LELET, AZ ELSŐ FUTÁSON: az első alak a fát járta be, és a `docs/_olvashato/` alatti
 * SZÁRMAZTATOTT doksi-HTML-eket felületnek nézte — a `v3-ui-slice` képességet tévesen `present`-nek
 * mérte, tehát az őr egy szabályos állapotot jelentett hibának (KUKA-049). A javítás iránya nem a
 * mappa-név betiltása: megkérdezzük a gitet, MIT TART SZÁMON — a származtatott kimenet definíció
 * szerint ignorált, tehát a tanú-halmazba be sem kerül.
 */
let TRACKED = null;
let trackedWhy = '';
function trackedFiles() {
  if (TRACKED) return TRACKED;
  try {
    const out = spawnSync('git', ['-C', ROOT, 'ls-files'], { encoding: 'utf8' });
    if (out.status === 0 && out.stdout.trim()) {
      TRACKED = out.stdout.split('\n').map((s2) => s2.trim()).filter(Boolean);
      trackedWhy = `git ls-files: ${TRACKED.length} követett fájl`;
      return TRACKED;
    }
  } catch { /* tartalék alább */ }
  // TARTALÉK, KIMONDVA: git nélkül a fát járjuk be — ilyenkor a származtatott kimenet is beleeshet,
  // ezért a mérés GYENGÉBB, és ezt a riport ki is írja (KUKA-049: a tartalék mérce nem veheti fel a
  // pontos tanú nevét).
  const found = [];
  const walk = (dir, depth) => {
    if (depth > 5) return;
    let entries; try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      if (name === 'node_modules' || name === '.git' || name.startsWith('.')) continue;
      const abs = join(dir, name);
      let st; try { st = statSync(abs); } catch { continue; }
      if (st.isDirectory()) walk(abs, depth + 1);
      else found.push(abs.slice(ROOT.length + 1));
    }
  };
  walk(ROOT, 0);
  TRACKED = found;
  trackedWhy = `TARTALÉK (git nem elérhető): ${found.length} fájl a fáról — a származtatott kimenet is beleeshet`;
  return TRACKED;
}

/** Van-e KÖVETETT fájl, aminek az útvonala illeszkedik? */
function anyPath(re) {
  return trackedFiles().find((rel) => re.test(rel)) || null;
}

const pkg = (() => {
  try { return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')); } catch { return {}; }
})();
const hasScript = (name) => Boolean((pkg.scripts || {})[name]);

/**
 * A TANÚK. Minden bejegyzés VAGY mér (`measure`), VAGY kimondja, miért nem mérhető (`unmeasurable`).
 * A harmadik lehetőség — a csendes kihagyás — nincs (KUKA-051 · KUKA-012).
 */
const WITNESSES = {
  'v3-ui-slice': {
    what: 'playwright-konfiguráció VAGY `test:e2e` szkript VAGY böngészőből betölthető lap',
    measure: () => Boolean(anyPath(/^playwright\.config\.[cm]?[jt]s$/) || hasScript('test:e2e') || anyPath(/\.html$/)),
  },
  'v3-module-map': {
    what: 'modul- vagy útvonal-térkép állomány',
    measure: () => Boolean(anyPath(/(MODULE_MAP|module-map|route-map|ROUTE_MAP)/i)),
  },
  'v3-vertical-slice': {
    what: 'HTTP-kiszolgáló a függőségek között VAGY útvonal-definíció a forrásban',
    measure: () => Boolean((pkg.dependencies || {}).express || (pkg.dependencies || {}).fastify
      || anyPath(/(^|\/)(server|routes?)\.[cm]?js$/)),
  },
  'v3-tenant-route': {
    what: 'cégtér-kötött HTTP-útvonal',
    measure: () => Boolean(anyPath(/(^|\/)(tenantRoutes|tenant-routes)\.[cm]?js$/)),
  },
  'v3-query-export': {
    what: 'lekérdező-spec regiszter vagy export-út',
    measure: () => Boolean(anyPath(/(query-?specs?|queryRegistry|export(Builder|Spec))/i)),
  },
  'v3-surface-registry': {
    what: 'felület-regiszter állomány',
    measure: () => Boolean(anyPath(/(surface-?registry|surfaceRegistry|screens?\.json)/i)),
  },
  'v3-user-facing-text': {
    what: 'i18n-szótár állomány',
    measure: () => Boolean(anyPath(/(^|\/)i18n(\/|\.)/i) || anyPath(/(^|\/)locales?\//i)),
  },
  'v3-ai-consumer': {
    what: 'AI-fogyasztó modul',
    measure: () => Boolean(anyPath(/(^|\/)(ai|assistant)[A-Za-z]*\.[cm]?js$/)),
  },
  'v3-screen-design-started': {
    what: 'képernyő-terv állomány',
    measure: () => Boolean(anyPath(/(screen|kepernyo|ui)[-_]?(design|terv)/i)),
  },
  'v3-switchable-module': {
    what: 'modul-kapcsoló regiszter',
    measure: () => Boolean(anyPath(/(module-?toggles?|moduleRegistry|features?\.json)/i)),
  },
  'v3-legal-documents': {
    what: 'jogi dokumentum-regiszter (ÁSZF · GDPR · cookie)',
    measure: () => Boolean(anyPath(/legal[-_]?documents?/i)),
  },
  'v3-user-capability': {
    what: 'felhasználó által használható képesség',
    unmeasurable: 'nincs fájl-szintű tanúja: azt, hogy egy képesség HASZNÁLHATÓ-e, a felület megléte '
      + 'és egy végigvitt használat mutatja meg — a fázisváltást a `v3-ui-slice` tanúja után az azt '
      + 'megépítő sáv rögzíti',
  },
  'v3-personal-data-path': {
    what: 'valódi (nem fixtúra) személyes adatot kezelő út',
    unmeasurable: 'a „valódi" és a „fixtúra" személyes adat között fájl-szinten nincs különbség — '
      + 'ezt az azt megépítő sáv mondja ki, nem egy minta-illesztés (KUKA-035: amit egy okirat/döntés '
      + 'kimond, azt ne vezesd le)',
  },
};

/** A board képesség-regisztere, ha elérhető. A hiánya NEVEZETT kihagyás, nem hallgatás. */
function loadBoardRegistry() {
  const candidates = [
    process.env.V2_REPO_ROOT && join(process.env.V2_REPO_ROOT, 'tools/chatops-board/config/matrix-capabilities.json'),
    resolve(ROOT, '..', 'v2', 'tools/chatops-board/config/matrix-capabilities.json'),
    resolve(ROOT, '..', 'vs', 'tools/chatops-board/config/matrix-capabilities.json'),
  ].filter(Boolean);
  for (const p of candidates) {
    if (existsSync(p)) {
      try { return { path: p, data: JSON.parse(readFileSync(p, 'utf8')) }; } catch { /* tovább */ }
    }
  }
  return { path: null, data: null, tried: candidates };
}

const asJson = process.argv.includes('--json');
const board = loadBoardRegistry();
const rows = [];
let mismatches = 0;
let unmeasurable = 0;

for (const [name, w] of Object.entries(WITNESSES)) {
  const recorded = board.data ? ((board.data.capabilities || {})[name] || {}).state || null : null;
  if (w.unmeasurable) {
    unmeasurable++;
    rows.push({ capability: name, witness: w.what, measured: null, recorded,
      verdict: 'nem mérhető gépileg', why: w.unmeasurable });
    continue;
  }
  const present = w.measure();
  const measured = present ? 'present' : 'absent';
  const mismatch = recorded && recorded !== measured;
  if (mismatch) mismatches++;
  rows.push({ capability: name, witness: w.what, measured, recorded,
    verdict: mismatch ? 'ELTÉR a rögzítéstől' : (recorded ? 'egyezik' : 'nincs mihez mérni') });
}

const missingInBoard = board.data
  ? Object.keys(board.data.capabilities || {})
    .filter((n) => n.startsWith('v3-') && !WITNESSES[n])
  : [];

if (asJson) {
  console.log(JSON.stringify({ root: ROOT, board_registry: board.path, rows, missingInBoard,
    mismatches, unmeasurable }, null, 2));
  process.exit(mismatches || missingInBoard.length ? 1 : 0);
}

console.log('');
console.log('V3 — FÁZIS-KÉPESSÉGEK TANÚJA (CAP-01)');
console.log('='.repeat(78));
for (const r of rows) {
  const mark = r.verdict === 'ELTÉR a rögzítéstől' ? 'FAIL' : (r.measured === null ? 'SKIP' : 'OK  ');
  console.log(`  ${mark}  ${r.capability.padEnd(28)} mért: ${String(r.measured ?? '—').padEnd(8)}`
    + `rögzített: ${String(r.recorded ?? '—')}`);
  console.log(`        tanú: ${r.witness}`);
  if (r.why) console.log(`        NEM MÉRHETŐ: ${r.why}`);
}
console.log('-'.repeat(78));
console.log(`  tanú-halmaz: ${trackedWhy}`);
if (board.path) console.log(`  board-regiszter: ${board.path}`);
else console.log('  NEVEZETT KIHAGYÁS: a board képesség-regisztere nem elérhető '
  + '(add meg: V2_REPO_ROOT=<a v2 munkamásolat útja>) — a mért állapot kiírva, összevetés nincs');
if (missingInBoard.length) console.log(`  A BOARD ISMER OLYAN V3-KÉPESSÉGET, AMIHEZ ITT NINCS TANÚ: ${missingInBoard.join(' · ')}`);
console.log('='.repeat(78));
console.log(`RESULT: ${rows.length - mismatches - unmeasurable}/${rows.length - unmeasurable} egyezik`
  + (mismatches ? ` — ${mismatches} ELAVULT RÖGZÍTÉS` : '')
  + (unmeasurable ? ` · ${unmeasurable} gépileg nem mérhető (kimondva)` : '')
  + (missingInBoard.length ? ` · ${missingInBoard.length} tanú nélküli képesség` : ''));
console.log('');
process.exit(mismatches || missingInBoard.length ? 1 : 0);
