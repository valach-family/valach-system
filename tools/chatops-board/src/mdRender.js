'use strict';

// MARKDOWN → OLVASHATÓ HTML — EGY OTTHON (MDR-01, D-VS-654).
//
// Ezt a modult KETTEN hívják, és ez a lényeg (KUKA-003: ha egy fogalom kódja két helyen áll, az nem
// két dolog, hanem egy elcsúszásra váró másolat):
//   · a repó-oldali eszköz  → tools/vs_doc_html.mjs  (a docs/_olvashato/ lapjai)
//   · a BOARD               → src/documentService.js (a feltöltött .md megjelenítése)
//
// A kimenet ÖNÁLLÓ lap: nincs benne külső betöltés (se betűtípus, se szkript), tehát internet nélkül
// is megnyílik, és a böngésző világos/sötét beállítását követi.

const esc = (s) => String(s === null || s === undefined ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// A kód-részleteket egy MAGÁN-HASZNÁLATÚ jellel (U+E000) fogjuk ki, nem szóközzel és nem NUL-lal:
// a szóköz valódi szövegben is előfordul, a NUL pedig binárissá teszi a fájlt a git szemében.
/** Sor-szintű jelölés: félkövér · dőlt · kód · hivatkozás. A sorrend számít (a kód nem fordul tovább). */
function inline(s) {
  const code = [];
  let t = String(s).replace(/`([^`]+)`/g, (_, c) => `${code.push(c) - 1}`);
  t = esc(t);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, href) => `<a href="${esc(href)}">${txt}</a>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  t = t.replace(/(\d+)/g, (_, i) => `<code>${esc(code[Number(i)])}</code>`);
  return t;
}

const cell = (c) => inline(String(c).trim().replace(/\\\|/g, '|'));
const splitRow = (line) => line.replace(/^\s*\|/, '').replace(/\|\s*$/, '')
  .split(/(?<!\\)\|/).map((c) => c.trim());

/** MARKDOWN → HTML-törzs + szakasz-jegyzék. A repó lapjain ténylegesen előforduló alakok. */
function renderMarkdown(md) {
  const lines = String(md === null || md === undefined ? '' : md).replace(/\r\n/g, '\n').split('\n');
  const out = []; const toc = [];
  let i = 0; let para = []; let list = null; let quote = []; let li = null;

  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  // A LISTA-TÉTEL SORAIT is bekezdéssé kell fűzni, mielőtt jelölést oldunk — ugyanaz a szabály,
  // mint az idézetnél. Ez a KUKA-039 („a kivétel nem állhat EGY ág feltételében"): a sortörésen
  // átnyúló félkövért előbb csak az idézetnél javítottam, és a TESTVÉR-ág, a lista, nem tudott róla —
  // a külső félnek szánt útmutató két tételében nyers `**` maradt a lapon.
  const flushLi = () => { if (li) { out.push(`<li>${inline(li.join(' '))}</li>`); li = null; } };
  const flushList = () => { flushLi(); if (list) { out.push(`</${list}>`); list = null; } };
  // Az idézet SORAIT bekezdéssé kell fűzni, mielőtt jelölést oldunk: a félkövér átérhet a sortörésen,
  // és soronként fordítva a nyitó `**` sosem találná meg a párját — a nyers jelölés a lapon maradna.
  const flushQuote = () => {
    if (!quote.length) return;
    const paras = []; let buf = [];
    for (const q of quote) { if (q.trim()) buf.push(q.trim()); else if (buf.length) { paras.push(buf.join(' ')); buf = []; } }
    if (buf.length) paras.push(buf.join(' '));
    out.push(`<blockquote>${paras.map((p) => `<p>${inline(p)}</p>`).join('')}</blockquote>`);
    quote = [];
  };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      flushAll();
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushAll();
      const level = h[1].length;
      const id = `sz-${toc.length + 1}`;
      if (level <= 2) toc.push({ id, level, text: h[2].replace(/[*`]/g, '') });
      out.push(`<h${level} id="${id}">${inline(h[2])}</h${level}>`);
      i++; continue;
    }

    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      flushAll();
      const head = splitRow(line); i += 2;
      const body = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { body.push(splitRow(lines[i])); i++; }
      out.push('<div class="tw"><table><thead><tr>'
        + head.map((c) => `<th>${cell(c)}</th>`).join('')
        + '</tr></thead><tbody>'
        + body.map((r) => `<tr>${r.map((c) => `<td>${cell(c)}</td>`).join('')}</tr>`).join('')
        + '</tbody></table></div>');
      continue;
    }

    if (/^\s*>\s?/.test(line)) { flushPara(); flushList(); quote.push(line.replace(/^\s*>\s?/, '')); i++; continue; }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { flushAll(); out.push('<hr>'); i++; continue; }

    const item = line.match(/^\s*([-*+]|\d+[.)])\s+(.*)$/);
    // A TÖRDELT MONDAT NEM LISTA. Egy bekezdés folytatása kezdődhet számmal („… vagy\n5. szinten
    // van."), és listaként olvasva a mondat KETTÉVÁGÓDIK — a félkövér nyitója és zárója külön
    // blokkba kerül, tehát nyers `**` marad a lapon (élesben mérve, D-VS-655). A szabály a
    // CommonMark-é: számozott tétel bekezdést csak 1-gyel kezdve szakíthat meg.
    const interruptsParagraph = item && !list && para.length
      && /^\d/.test(item[1]) && parseInt(item[1], 10) !== 1;
    if (item && !interruptsParagraph) {
      flushPara(); flushQuote(); flushLi();
      const want = /^\d/.test(item[1]) ? 'ol' : 'ul';
      if (list && list !== want) flushList();
      if (!list) { out.push(`<${want}>`); list = want; }
      li = [item[2]];
      i++; continue;
    }

    if (!line.trim()) { flushAll(); i++; continue; }
    // NYITOTT LISTA-TÉTEL FOLYTATÁSA: a tördelt sor ugyanahhoz a tételhez tartozik, nem új bekezdés.
    if (li) { li.push(line.trim()); i++; continue; }
    flushList(); flushQuote(); para.push(line.trim()); i++;
  }
  flushAll();
  return { html: out.join('\n'), toc };
}

const PAGE_STYLE = `
:root{color-scheme:light dark;--bg:#f6f7f9;--surface:#fff;--ink:#14181e;--muted:#5b6472;
--rule:#dfe3e9;--accent:#0f5f5c;--accent-soft:#e6f1f0;--code:#f2f4f7}
@media (prefers-color-scheme:dark){:root{--bg:#101317;--surface:#171b21;--ink:#e8ecf1;--muted:#9aa4b2;
--rule:#282f38;--accent:#57c2b4;--accent-soft:#122b29;--code:#1d2229}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
font:16px/1.65 ui-serif,Georgia,"Times New Roman",serif;padding:0 20px 96px}
.wrap{max-width:820px;margin:0 auto}
header.doc{padding:40px 0 24px;border-bottom:2px solid var(--ink);margin-bottom:28px}
header.doc .kicker{font:600 11px/1.4 ui-sans-serif,system-ui,sans-serif;letter-spacing:.14em;
text-transform:uppercase;color:var(--accent);margin:0 0 10px}
header.doc h1{font:700 30px/1.2 ui-sans-serif,system-ui,sans-serif;margin:0;text-wrap:balance}
header.doc .meta{font:13px/1.5 ui-sans-serif,system-ui,sans-serif;color:var(--muted);margin-top:10px}
nav.toc{background:var(--surface);border:1px solid var(--rule);border-left:3px solid var(--accent);
padding:16px 20px;margin:0 0 32px;font:14px/1.7 ui-sans-serif,system-ui,sans-serif}
nav.toc b{display:block;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
nav.toc a{display:block;color:var(--ink);text-decoration:none;padding:1px 0}
nav.toc a:hover{color:var(--accent);text-decoration:underline}
nav.toc a.l2{padding-left:14px;color:var(--muted)}
h1,h2,h3,h4,h5,h6{font-family:ui-sans-serif,system-ui,sans-serif;text-wrap:balance;line-height:1.25}
h2{font-size:22px;margin:40px 0 12px;padding-top:14px;border-top:1px solid var(--rule)}
h3{font-size:17px;margin:28px 0 8px}
h4,h5,h6{font-size:15px;margin:20px 0 6px;color:var(--muted)}
p{margin:0 0 14px}
ul,ol{margin:0 0 16px;padding-left:22px}li{margin:0 0 6px}
blockquote{margin:18px 0;padding:12px 18px;background:var(--accent-soft);
border-left:3px solid var(--accent);border-radius:0 4px 4px 0}
blockquote p{margin:0 0 8px}blockquote p:last-child{margin:0}
code{font:0.88em ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--code);
padding:1px 5px;border-radius:3px}
pre{background:var(--code);border:1px solid var(--rule);border-radius:5px;padding:14px 16px;
overflow-x:auto;margin:0 0 18px}
pre code{background:none;padding:0;font-size:13px;line-height:1.55}
.tw{overflow-x:auto;margin:0 0 20px;border:1px solid var(--rule);border-radius:5px;background:var(--surface)}
table{border-collapse:collapse;width:100%;font:14px/1.5 ui-sans-serif,system-ui,sans-serif}
th,td{text-align:left;vertical-align:top;padding:9px 12px;border-bottom:1px solid var(--rule)}
th{background:var(--accent-soft);font-weight:700;font-size:12px;letter-spacing:.04em;
text-transform:uppercase;color:var(--muted);white-space:nowrap}
tbody tr:last-child td{border-bottom:0}
td{font-variant-numeric:tabular-nums}
hr{border:0;border-top:1px solid var(--rule);margin:32px 0}
a{color:var(--accent)}
strong{font-weight:700}
footer.doc{margin-top:56px;padding-top:16px;border-top:1px solid var(--rule);
font:12px/1.6 ui-sans-serif,system-ui,sans-serif;color:var(--muted)}
`;

/** A dokumentum CÍME: az első H1, ha van; különben a megadott tartalék. */
function titleOf(md, fallback) {
  const m = String(md || '').match(/^#\s+(.+)$/m);
  return ((m && m[1]) || fallback || 'Dokumentum').replace(/[*`]/g, '').trim();
}

/**
 * TELJES, ÖNÁLLÓ LAP a markdownból.
 * @param {object} o  { md, title?, source?, kicker?, footer? }
 */
function renderPage(o = {}) {
  const md = o.md || '';
  const { html, toc } = renderMarkdown(md);
  const title = o.title || titleOf(md, o.source);
  const nav = toc.length > 2
    ? `<nav class="toc"><b>Tartalom</b>${toc.map((t) => `<a class="l${t.level}" href="#${t.id}">${esc(t.text)}</a>`).join('')}</nav>`
    : '';
  const meta = o.source
    ? `<p class="meta">Forrás: <code>${esc(o.source)}</code> — ez a lap a forrásból készült, nem külön szöveg.</p>`
    : '';
  const foot = o.footer ? `<footer class="doc">${esc(o.footer)}</footer>` : '';
  return `<!doctype html>
<html lang="hu"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${PAGE_STYLE}</style></head>
<body><div class="wrap">
<header class="doc"><p class="kicker">${esc(o.kicker || 'Valach System · olvasható változat')}</p>
<h1>${esc(title)}</h1>
${meta}</header>
${nav}
${html}
${foot}
</div></body></html>`;
}

module.exports = { renderMarkdown, renderPage, titleOf, PAGE_STYLE, esc, CONTRACT_ID: 'MDR-01' };
