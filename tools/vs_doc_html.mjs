#!/usr/bin/env node

// Valach System (VS) — DOKUMENTUM → OLVASHATÓ LAP (DHT-01). Csak olvas a forrásból, HTML-t ír.
//
//   node tools/vs_doc_html.mjs docs/70_PLANNING/V3_TERV.md   # egy lap
//   node tools/vs_doc_html.mjs --mind                        # minden terv-lap + doktrína + napló
//   node tools/vs_doc_html.mjs --all                         # ugyanaz (lásd ALL_FLAGS — KUKA-014)
//   node tools/vs_doc_html.mjs --mind --nyit                 # + kiírja, mit nyisson meg
//
// MIÉRT (operátori parancs 2026-09-05): „mint mondtam már sokszor, .md-ket nem tudok megnyitni …
// kellene egy html verzió is mindig, ami rám is vonatkozik." — a KUKA-079 gépi fele: az operátornak
// szánt dokumentum akkor van SZÁLLÍTVA, ha meg tudja nyitni. Az .md a gépé (git, diff, verifier), a
// HTML az emberé; a kettő UGYANABBÓL a forrásból származik, tehát nem tud elcsúszni (KUKA-018).
//
// A FORDÍTÓ MAGA NEM ITT LAKIK (D-VS-654): `tools/chatops-board/src/mdRender.js` (MDR-01) — mert a
// BOARD is ugyanezt a fordítást végzi a feltöltött lapokon, és két másolat előbb-utóbb elcsúszik
// (KUKA-003). Itt csak a fájl-bejárás, a tartalomjegyzék és a parancssor él.
//
// A lap ÖNÁLLÓ: nincs benne külső hivatkozás, betűtípus-letöltés vagy szkript — offline, dupla
// kattintásra megnyílik. Az `docs/_olvashato/` mappa a .gitignore-ban van: a HTML SZÁRMAZTATOTT.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative, basename } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync } from 'node:fs';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// A TELJES MENET KAPCSOLÓJA — EGY OTTHONBAN, EXPORTÁLVA (D-VS-704).
// Miért nem elég a `--mind` sztring a helyén: a repó megnyitásakor a `package.json` `docs:html`
// sora `--all`-t kapott (emlékezetből, nem innen), és mivel a kapcsoló nem egyezett, a parancs
// NULLA lapot készített — miközben „elkészült" mondattal, nulla kilépési kóddal zárt. Réteg-határon
// átgépelt azonosító (KUKA-036) + néma üres eredmény sikerként jelentve (KUKA-012 · KUKA-041).
// Innentől a `package.json` értékét a pin EHHEZ méri, nem egy második, kézi listához.
export const ALL_FLAGS = Object.freeze(['--mind', '--all']);
const OUT_DIR = join(ROOT, 'docs', '_olvashato');

// EGY OTTHON: ugyanaz a fordító, amit a board is hív (MDR-01).
const MD = require(join(ROOT, 'tools', 'chatops-board', 'src', 'mdRender.js'));
const { renderPage, titleOf, PAGE_STYLE, esc } = MD;

/** EGY lap átfordítása. Visszaadja a kiírt fájl repó-relatív útját. */
export function renderDocToHtml(mdRelPath, outDir = OUT_DIR) {
  const md = readFileSync(join(ROOT, mdRelPath), 'utf8');
  mkdirSync(outDir, { recursive: true });
  const outAbs = join(outDir, `${basename(mdRelPath, '.md')}.html`);
  writeFileSync(outAbs, renderPage({
    md,
    source: mdRelPath,
    footer: `Készítette: node tools/vs_doc_html.mjs ${mdRelPath} — a forrás módosítása után futtasd újra.`,
  }), 'utf8');
  return relative(ROOT, outAbs);
}

/**
 * A TARTALOMJEGYZÉK — EGY lap, amit az operátor kitesz az asztalra, és onnantól minden elérhető.
 * A LEGFRISSEBB áll elöl (őt az érdekli, mi készült ma), a csoportok a forrás-mappát követik.
 */
export function renderIndex(entries, outDir = OUT_DIR) {
  const groups = new Map();
  for (const e of entries) {
    const g = e.src.startsWith('docs/70_PLANNING') ? 'Tervek, levelek, felmérések'
      : e.src.startsWith('docs/10_DOCTRINE') ? 'Doktrína — a rendszer kánonja'
        : 'Napló és belépő';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(e);
  }
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const rows = [...groups.entries()].map(([name, list]) => {
    list.sort((a, b) => b.mtime - a.mtime);
    return `<h2>${esc(name)} <span class="cnt">${list.length}</span></h2>\n<ul class="idx">`
      + list.map((e) => `<li><a href="./${esc(e.file)}">${esc(e.title)}</a>`
        + `<span class="meta">${fmt(e.mtime)} · <code>${esc(e.src)}</code></span></li>`).join('\n')
      + '</ul>';
  }).join('\n');
  const html = `<!doctype html>
<html lang="hu"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>VS — olvasható lapok</title><style>${PAGE_STYLE}
h2 .cnt{font:400 13px/1 ui-monospace,monospace;color:var(--muted);vertical-align:middle;margin-left:6px}
ul.idx{list-style:none;padding:0;margin:0 0 26px}
ul.idx li{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:baseline;padding:9px 0;
border-bottom:1px solid var(--rule)}
ul.idx li:last-child{border-bottom:0}
ul.idx a{font:600 16px/1.35 ui-sans-serif,system-ui,sans-serif;text-decoration:none;flex:1 1 340px}
ul.idx a:hover{text-decoration:underline}
ul.idx .meta{font:12px/1.5 ui-monospace,monospace;color:var(--muted)}
</style></head>
<body><div class="wrap">
<header class="doc"><p class="kicker">Valach System · olvasható lapok</p>
<h1>Tartalomjegyzék</h1>
<p class="meta">${entries.length} lap, a repó markdown-forrásaiból. A legfrissebb áll elöl.
Frissítés: <code>npm run docs:html</code>.</p></header>
${rows}
<footer class="doc">Ez a lap is származtatott — a forrás mindig az <code>.md</code> a repóban.</footer>
</div></body></html>`;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html, 'utf8');
  return relative(ROOT, join(outDir, 'index.html'));
}

const args = process.argv.slice(2);
if (args.length && !process.env.VS_DOC_HTML_LIB) {
  const say = (s = '') => console.log(s);
  const targets = [];
  const wantsAll = ALL_FLAGS.some((f) => args.includes(f));
  if (wantsAll) {
    for (const dir of ['docs/70_PLANNING', 'docs/10_DOCTRINE']) {
      if (!existsSync(join(ROOT, dir))) continue;
      for (const f of readdirSync(join(ROOT, dir))) if (f.endsWith('.md')) targets.push(`${dir}/${f}`);
    }
    for (const f of ['DECISION_LOG.md', 'PROJECT_HISTORY.md', 'START_HERE.md']) {
      if (existsSync(join(ROOT, f))) targets.push(f);
    }
  } else {
    for (const a of args) if (!a.startsWith('--')) targets.push(a.replace(/^\.\//, ''));
  }

  say('VS — OLVASHATÓ VÁLTOZAT (markdown → HTML)');
  say('='.repeat(46));
  const done = []; const entries = [];
  for (const t of targets) {
    if (!existsSync(join(ROOT, t))) { say(`  KIMARAD: ${t} (nincs ilyen fájl)`); continue; }
    try {
      const out = renderDocToHtml(t);
      done.push(out);
      const md = readFileSync(join(ROOT, t), 'utf8');
      entries.push({
        src: t, file: basename(out), title: titleOf(md, basename(t, '.md')),
        mtime: statSync(join(ROOT, t)).mtime,
      });
    } catch (e) { say(`  HIBA: ${t} — ${e.message}`); }
  }
  // A TARTALOMJEGYZÉK csak a teljes menetnél születik: egy lap-renderelés ne írja felül a listát
  // egyetlen sorral (KUKA-012 — a fél-igazság rosszabb, mint a semmi).
  const idx = wantsAll ? renderIndex(entries) : null;
  say('');
  say(`${done.length} lap elkészült ide: docs/_olvashato/`);

  // A NULLA LAP NEM SIKER. Ez a KUKA-012 gomb-alakja: ha az operátor lefuttatja a blokkot és
  // „elkészült"-et olvas, azt hiszi, van mit megnyitnia. Zsákutca nélkül (KUKA-064): a mondat
  // megmondja, mi a helyes hívás, és felsorolja, mit talált.
  if (done.length === 0) {
    say('');
    say('HIBA: EGYETLEN lap sem készült el — ez nem siker, ezért piros.');
    if (!targets.length) {
      say(`  Nem volt mit fordítani. A teljes menet kapcsolója: ${ALL_FLAGS.join(' vagy ')}`);
      say(`  Kapott kapcsolók: ${args.join(' ') || '(egy sem)'}`);
      say('  Egy lap: node tools/vs_doc_html.mjs docs/70_PLANNING/<lap>.md');
    } else {
      say(`  ${targets.length} cél volt, de mind kimaradt vagy hibára futott (lásd fent).`);
    }
    process.exit(1);
  }
  if (args.includes('--nyit') || done.length <= 3) for (const d of done) say(`  ${d}`);
  say('');
  if (idx) {
    say(`NYISD MEG EZT AZ EGYET: ${idx}`);
    say('  (tartalomjegyzék — innen minden lap egy kattintás; tedd ki az asztalra hivatkozásként)');
  } else {
    say('Nyisd meg dupla kattintással a Finderben — a lapok önállóak, internet sem kell hozzájuk.');
  }
}
