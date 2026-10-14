#!/usr/bin/env node
// tools/v3_bemutato_artifact.mjs — AZ INTERAKTÍV ÁTADÁS CSOMAGJA (BMA-01, R206 §3).
//
// MIÉRT VAN EZ, ÉS MI A KÜLÖNBSÉG A KÉPES ÚTMUTATÓHOZ KÉPEST. A `docs:kiprobalas-kepek` KÉPEKET és
// mondatokat ad: képes útmutató, nem bejárás. Az operátor viszont azt kérte, hogy „ide kattintok a
// valódi UX-en, ez történik, majd ott kattintok" — vagyis a MEGLÉVŐ alkalmazásfelületet akarja
// használni, megnyitható hivatkozásból. Ez a szerszám ezt a csomagot állítja össze.
//
// AMI A CSOMAGBAN VAN: a VALÓDI felületi forrás, VÁLTOZATLANUL — `app.js`, `tour.mjs`, `texts.mjs`,
// `style.css`, az `i18n/` csomagok, a bemutató-adapter és a bemutató-lap. NINCS átírt, kézzel
// készített alternatív UX, és nincs második másolat a kódból: a csomag a repó fájljaira MUTAT
// (manifeszt), az összeállítás pedig másolás — nem újraírás (KUKA-003: egy fogalom, egy otthon).
//
// AMIT A CSOMAG KIMONDVA NEM: nem HTTP- és nem tároló-bizonyíték. A háttere a SZIMULÁLT
// bemutató-adapter (`demo-adapter.mjs`), minden adat szintetikus, és ezt a lap LÁTHATÓAN jelzi
// (`demo-marker` sáv). A valódi szerveres/tárolós tanú a `findings_*` battériákban, a Playwright-
// láncban és a `proof:demo-walk`-ban áll (KUKA-220 · KUKA-227: a csonk zöldje nem a határ zöldje).
//
// A FÁJL-LISTA NEM KÉZI: az IMPORT-GRÁFBÓL jön (a lap `src`/`href` hivatkozásaitól indulva,
// tranzitívan). Ez a lényeg: ha a felület HOLNAP új modult importál, és a csomagból kimarad, az
// átadott lap NÉMÁN törne el — pontosan az a hiba-osztály, amiért a KUKA-504 megszületett. A
// gráf-bejárás ezért a szerszám MAGJA, és a `--selftest` ezt méri.
//
// Használat:
//   node tools/v3_bemutato_artifact.mjs             # a csomag összeállítása + manifeszt
//   node tools/v3_bemutato_artifact.mjs --selftest  # ellenpróbák (gráf-lefedés, önhordóság)
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative, posix } from 'node:path';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { artifactPath, parseArtifactName } = require('../contracts/artifactNaming.js');
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

const SELFTEST = process.argv.includes('--selftest');
const SRC_DIR = 'v3app/public';
const PAGE = 'demo-index.html';
/**
 * AMIT A GRÁF NEM LÁT — ÉS EZÉRT KIMONDVA ÁLL ITT. A segéd-csomagot az adapter a VALÓDI `fetch`-csel
 * kéri le (`realFetch('./demo-assistant.json')`), nem `import`-tal — tehát a bejárás nem találja meg.
 * A lista NEM dekoráció: a szerszám megköveteli, hogy a hivatkozás TÉNYLEG ott legyen a forrásban.
 */
const EXTRA = Object.freeze([
  Object.freeze({ file: 'demo-assistant.json', referencedIn: 'demo-adapter.mjs', pattern: './demo-assistant.json' }),
]);

// ── A GRÁF-BEJÁRÁS (tiszta függvények — a próba ezeket hívja) ────────────────────────────────────

/** A lapról induló hivatkozások: `<script src>` és `<link href>`, csak RELATÍV utak. */
export function pageRefs(html) {
  const out = [];
  for (const m of String(html).matchAll(/<(?:script|link)\b[^>]*?(?:src|href)\s*=\s*"([^"]+)"/gi)) out.push(m[1]);
  return out.filter((u) => !/^[a-z]+:|^\/\//i.test(u));
}

/** Egy modul `import`/`export … from` hivatkozásai — csak RELATÍV utak. */
export function moduleRefs(src) {
  const out = [];
  for (const m of String(src).matchAll(/(?:^|[\s;}])(?:import|export)\b[^;'"]*?from\s*'([^']+)'/g)) out.push(m[1]);
  for (const m of String(src).matchAll(/(?:^|[\s;}])import\s*'([^']+)'/g)) out.push(m[1]);
  return out.filter((u) => u.startsWith('./') || u.startsWith('../'));
}

/** Ami hálózatot kérne a megnyitáskor: ABSZOLÚT hivatkozás a csomag fájljaiban (UX-21 · önhordóság). */
export function absoluteRefs(src) {
  const out = [];
  for (const m of String(src).matchAll(/(?:src|href)\s*=\s*"(https?:\/\/[^"]+)"/gi)) out.push(m[1]);
  for (const m of String(src).matchAll(/@import\s+(?:url\()?["'](https?:\/\/[^"']+)["']/gi)) out.push(m[1]);
  return out;
}

/** A TELJES fájl-készlet a laptól indulva, tranzitívan. A hiányzó fájl NEVEZETT hiba. */
export function collect({ read, page = PAGE }) {
  const seen = new Map();          // publikált út → a bejárás oka
  const miss = [];
  const walk = (rel, why) => {
    if (seen.has(rel)) return;
    const src = read(rel);
    if (src === null) { miss.push(`${rel} (hivatkozza: ${why})`); return; }
    seen.set(rel, why);
    const refs = rel.endsWith('.html') ? pageRefs(src) : (rel.endsWith('.mjs') || rel.endsWith('.js') ? moduleRefs(src) : []);
    for (const r of refs) {
      const target = posix.normalize(posix.join(posix.dirname(rel), r));
      walk(target, rel);
    }
  };
  walk(page, '(a lap)');
  for (const e of EXTRA) walk(e.file, `${e.referencedIn} (kimondott, nem import)`);
  return { files: [...seen.keys()].sort(), missing: miss };
}

/** AZ EXTRA LISTA NEM DEKORÁCIÓ: a hivatkozásnak TÉNYLEG ott kell lennie a megnevezett forrásban. */
export function extraProblems({ read, extra = EXTRA }) {
  const bajok = [];
  for (const e of extra) {
    const src = read(e.referencedIn);
    if (src === null) { bajok.push(`a kimondott hivatkozó nincs meg: ${e.referencedIn}`); continue; }
    if (!src.includes(e.pattern)) bajok.push(`a(z) ${e.file} hivatkozása NINCS a ${e.referencedIn}-ben (${e.pattern})`);
  }
  return bajok;
}

const readRepo = (rel) => {
  const abs = join(ROOT, SRC_DIR, rel);
  try { return readFileSync(abs, 'utf8'); } catch { return null; }
};

// ── ELLENPRÓBÁK ─────────────────────────────────────────────────────────────────────────────────
if (SELFTEST) {
  const lines = [];
  const problems = [];
  const P = (ok, mit, reszlet) => {
    lines.push(`  ${ok ? 'ZÖLD ' : 'PIROS'} ${mit}${reszlet === undefined ? '' : `  — ${reszlet}`}`);
    if (!ok) problems.push(mit);
  };
  console.log('AZ INTERAKTÍV ÁTADÁS CSOMAGJÁNAK ELLENPRÓBÁI (BMA-01)');
  console.log('='.repeat(94));

  const { files, missing } = collect({ read: readRepo });
  P(missing.length === 0, 'a lap import-gráfja HIÁNYTALAN', missing.length ? missing.join(' · ') : `${files.length} fájl`);
  P(files.includes('app.js') && files.includes('tour.mjs') && files.includes('texts.mjs')
    && files.includes('demo-adapter.mjs') && files.includes('style.css'),
    'a VALÓDI felületi forrás van a csomagban (nem kézzel írt alternatíva)',
    files.filter((f) => !f.startsWith('i18n/')).join(' · '));
  P(files.filter((f) => f.startsWith('i18n/')).length >= 6, 'MINDEN nyelvcsomag benne van',
    files.filter((f) => f.startsWith('i18n/')).join(' · '));
  P(extraProblems({ read: readRepo }).length === 0, 'a kimondott, nem import-alapú hivatkozás TÉNYLEG létezik',
    extraProblems({ read: readRepo }).join(' · ') || EXTRA.map((e) => e.file).join(' · '));

  // A HIÁNYZÓ FÁJL NEVEZETT HIBA (ez a KUKA-504 osztálya ezen a szerszámon): ha a gráf egy
  // hivatkozást nem talál, a szerszám NEM állítja össze a csomagot némán.
  const vak = (rel) => (rel === 'tour.mjs' ? null : readRepo(rel));
  const hianyos = collect({ read: vak });
  P(hianyos.missing.some((m) => m.startsWith('tour.mjs')), 'egy KIESETT modul NEVEZETTEN hiba (nem néma csomag)',
    hianyos.missing.join(' · ') || 'nincs baj — ez volna a hamis zöld');

  // AZ ÖNHORDÓSÁG MÉRÉSE TÜZEL: egy abszolút hivatkozás hálózatot kérne a megnyitáskor.
  P(absoluteRefs('<script src="https://cdn.pelda.hu/a.js"></script>').length === 1,
    'az abszolút hivatkozást a mérés MEGTALÁLJA', 'szintetikus bemeneten');
  const kulso = files.flatMap((f) => absoluteRefs(readRepo(f) || '').map((u) => `${f}: ${u}`));
  P(kulso.length === 0, 'a csomag MINDEN fájlja önhordó (nincs hálózatot kérő hivatkozás)',
    kulso.join(' · ') || `${files.length} fájl átnézve`);

  // A SZIMULÁLT HÁTTÉR LÁTHATÓAN JELÖLT, és a javítás vezérlője OTT van a lapon (KUKA-227).
  const page = readRepo(PAGE) || '';
  P(page.includes('name="vs-demo" content="on"') && page.includes('data-testid="demo-marker"'),
    'a lap KIMONDJA, hogy a háttér a bemutató-adapter (szimulált)', 'vs-demo meta + demo-marker sáv');
  // A VEZÉRLŐT A LAP RAJZOLJA (renderHeader), a héjban csak a HELYE áll — a mérés tehát a HELYET
  // kérdezi a héjtól, a GOMBOT pedig a felületi forrástól (`app.js`): a kettő együtt a bekötés.
  P(page.includes('data-testid="ctx-recheck-slot"'), 'az R206 folytatásának HELYE a bemutató-héjban is ott van', 'ctx-recheck-slot');
  const appSrc = readRepo('app.js') || '';
  P(appSrc.includes('data-action="ctx-recheck"') && appSrc.includes("byTest('ctx-recheck-slot')"),
    'és a felület TÉNYLEGESEN oda rajzolja a működő folytatást', 'app.js → ctx-recheck-slot');
  P(page.includes('data-testid="demo-lose-me"'), 'a javítás KIPRÓBÁLHATÓ: a hálózati hiba kérhető', 'demo-lose-me');

  console.log(lines.join('\n'));
  console.log('='.repeat(94));
  if (problems.length) {
    console.log(`RESULT: FAIL — ${problems.length} mért hiba`);
    for (const x of problems) console.log(`  · ${x}`);
    process.exit(1);
  }
  console.log('RESULT: PASS — a csomag a VALÓDI felületi forrásból áll, hiánytalan és önhordó.');
  process.exit(0);
}

// ── A CSOMAG ÖSSZEÁLLÍTÁSA ──────────────────────────────────────────────────────────────────────
const { files, missing } = collect({ read: readRepo });
if (missing.length) {
  console.error('HIBA: a lap import-gráfja HIÁNYOS — a csomag nem állítható össze:');
  for (const m of missing) console.error(`  · ${m}`);
  process.exit(1);
}
const extraBajok = extraProblems({ read: readRepo });
if (extraBajok.length) {
  console.error('HIBA: a kimondott, nem import-alapú hivatkozások nem egyeznek a forrással:');
  for (const m of extraBajok) console.error(`  · ${m}`);
  process.exit(1);
}

// A CSOMAG HELYE A KÖZÖS NÉVKÉPZŐBŐL jön (ART-01): a mappa neve a csomag-fájl neve, kiterjesztés nélkül.
const pageArtifact = artifactPath({ area: 'exports', kind: 'v3app_interaktiv_bemutato', ext: 'html', version: VERSION });
const stem = pageArtifact.replace(/\.html$/, '');
const BUNDLE = join(ROOT, stem);
rmSync(BUNDLE, { recursive: true, force: true });
mkdirSync(BUNDLE, { recursive: true });

const manifest = [];
for (const f of files) {
  // A LAP A CSOMAG `index.html`-je (a megnyitható belépő), minden más a SAJÁT relatív útján.
  const published = f === PAGE ? 'index.html' : f;
  const to = join(BUNDLE, published);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(join(ROOT, SRC_DIR, f), to);
  const bytes = readFileSync(to);
  manifest.push({ published, source: `${SRC_DIR}/${f}`, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}

const reportPath = join(ROOT, artifactPath({ area: 'reports', kind: 'v3app_interaktiv_bemutato_manifeszt', ext: 'json', version: VERSION }));
const report = {
  contract: 'BMA-01',
  generated_by: 'node tools/v3_bemutato_artifact.mjs',
  version: VERSION,
  page: 'index.html',
  bundle_dir: stem,
  background: 'SZIMULÁLT bemutató-adapter (v3app/public/demo-adapter.mjs) — NEM HTTP- és NEM tároló-bizonyíték',
  surface_source: 'a repó v3app/public/ fájljai, VÁLTOZATLANUL (másolat, nem újraírás)',
  files: manifest,
  total_bytes: manifest.reduce((a, b) => a + b.bytes, 0),
};
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log('AZ INTERAKTÍV ÁTADÁS CSOMAGJA (BMA-01)');
console.log('='.repeat(94));
console.log(`  csomag:     ${stem}/   (${manifest.length} fájl · ${(report.total_bytes / 1024).toFixed(0)} kB)`);
console.log(`  belépő:     ${stem}/index.html`);
console.log(`  manifeszt:  ${relative(ROOT, reportPath)}`);
console.log(`  háttér:     ${report.background}`);
for (const m of manifest) console.log(`    ${m.published.padEnd(28)} ← ${m.source} · ${String(m.bytes).padStart(7)} B`);
console.log('='.repeat(94));
console.log('RESULT: PASS — a csomag összeállt. A publikálás (artifact) a kör ÁTADÁSI lépése; ez a szerszám nem tölt fel semmit.');
void parseArtifactName;
void existsSync;
