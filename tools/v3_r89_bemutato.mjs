#!/usr/bin/env node
/**
 * R89 — ÖNÁLLÓ, KATTINTHATÓ BEMUTATÓ AZ OPERÁTORNAK (R89 §9).
 *
 * MIÉRT VAN EZ, ÉS MIT NEM BIZONYÍT — ez a fájl legfontosabb mondata. A terv kikötése: „Rövid videó
 * vagy képes HTML mellett valóban kattintható, szintetikus tutor-bemutató is legyen. Ha ez önálló
 * offline bemutató, egyértelműen jelezze a szimulációt; NEM bizonyít szerveres jogosultságot vagy élő
 * AI-t. A tényleges alkalmazás útjairól külön futási bizonyíték kell."
 *
 * EZÉRT: a kimenet EGY önálló HTML, ami hálózat nélkül megnyílik (az operátor nem futtat repót —
 * KUKA-079), és a lap FEJÉBEN, a CÍMÉBEN és minden nézet alján KIMONDJA, hogy szimuláció. A
 * jogosultságot itt egy legördülő állítja, nem a szerver; AI-hívás nincs.
 *
 * ÉS AMI VALÓDI BENNE: a SZÖVEG. Minden mondat a TÉNYLEGES nyelvcsomagokból és a TÉNYLEGES
 * funkció-regiszterből származik (`v3app/public/i18n/*` · `v3app/knowledge/features.mjs`) — ez a
 * fájl nem ír új szöveget, csak beforgatja a mérteket. Így a bemutató nem tud „szebb" lenni, mint a
 * termék (KUKA-050: a szöveg a valóságot követi).
 *
 * R112 — A TÖRTÉNETEK BELÉPŐJE (P109-03 · R112 §3). Ugyanez a lap ma a KÖZÖS BELÉPŐ: az öt
 * használati út és a meghívó-helyzetek kattintható lejátszója (`tools/lib/v3_tortenet_lejatszo*`),
 * ugyanabban a keretben, ugyanazokkal a nyelvcsomagokkal. Új bemutató-platform NEM épült: a generátor
 * és a kiadási csatorna ugyanaz (a `docs/_olvashato/` + az artifact-link).
 *
 * Futtatás: npm run docs:r89-bemutato   ·   a kimenet útját a futtató kiírja.
 *           npm run docs:r89-bemutato -- --from-report <e2e-jelentés.json>   ·   a bizonyíték-lapot a
 *           böngésző-próbák MÉRT jelentéséből építi újra (`docs/70_PLANNING/V3_R112_TORTENETEK_BIZONYITEK.json`).
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { artifactPath } = require('../contracts/artifactNaming.js');
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

const { FEATURES, TOURS, ACTIONS } = await import(join(ROOT, 'v3app/knowledge/features.mjs'));
const { STORIES } = await import(join(ROOT, 'v3app/knowledge/stories.mjs'));
const { STORY_STEPS, evidenceFromReport, loadEvidence } = await import(join(ROOT, 'tools/lib/v3_tortenet_lejatszo.mjs'));
const { execFileSync } = await import('node:child_process');
const PAGE_JS = readFileSync(join(ROOT, 'tools/lib/v3_tortenet_lejatszo.page.js'), 'utf8');

/**
 * A BIZONYÍTÉK-LAP (tartalom nélküli: fájl · próbacím-eleje · futások · zöldek). A `--from-report`
 * a futás jelentéséből építi újra és a repóba írja; enélkül a repóban álló lapot olvassuk. A lap a
 * MÉRÉS commitját is hordozza — a bemutató nem állíthat frissebbet, mint amit mértünk (KUKA-216).
 */
const EVIDENCE_PATH = 'docs/70_PLANNING/V3_R112_TORTENETEK_BIZONYITEK.json';
const repIdx = process.argv.indexOf('--from-report');
let EVIDENCE = null;
if (repIdx > 0 && process.argv[repIdx + 1]) {
  const report = JSON.parse(readFileSync(resolve(process.argv[repIdx + 1]), 'utf8'));
  let commit = null;
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { commit = null; }
  EVIDENCE = { schema: 'v3-r112-tortenet-bizonyitek/1', measured_at: (report.stats && report.stats.startTime) || null,
    commit, note: 'A böngésző-próbák mért kimenete történetenként. Tartalom nélküli: fájl, próbacím-eleje, futás- és zöld-szám.',
    stories: evidenceFromReport(report, STORIES) };
  writeFileSync(join(ROOT, EVIDENCE_PATH), `${JSON.stringify(EVIDENCE, null, 2)}\n`);
} else {
  EVIDENCE = loadEvidence(ROOT, EVIDENCE_PATH);
}
const dict = await import(join(ROOT, 'v3app/public/i18n/dict.mjs'));
const { allLanguages, dirOf } = await import(join(ROOT, 'v3app/public/i18n/languages.mjs'));

/** A BEFORGATOTT ADAT — MÉRT, nem kézzel írt: nyelvenként a szótár és a funkció-tudás. */
const LANGS = allLanguages().map((l) => ({ code: l.code, endonym: l.endonym, dir: l.dir, kind: l.kind, enabled: l.enabled }));
const DATA = {};
for (const l of LANGS) {
  const d = dict.dictFor(l.code);
  DATA[l.code] = {
    dir: dirOf(l.code),
    PAGE: d.PAGE, NAV: d.NAV, UI: d.UI, HELP: d.HELP, TOURUI: d.TOURUI, CHAT: d.CHAT, STATE: d.STATE, REASON: d.REASON,
    // R114/9 — a LAP SAJÁT kezelő-feliratai is a nyelvcsomagból jönnek, nem a generátorból.
    STORYUI: d.STORYUI,
    KB: d.KB, FAQ: d.FAQ, TOUR: d.TOUR,
    // A TÖRTÉNETEK (R112) további csoportjai: szerepkör · adatkör · sablon · levél · történet-cím.
    ROLE: d.ROLE, SCOPE: d.SCOPE, SCOPE_ACC: d.SCOPE_ACC, TPL: d.TPL, SRV: d.SRV, STORY: d.STORY,
    coverage: (() => { const c = dict.coverageOf(l.code, FEATURES); return { covered: c.covered, population: c.population, kind: c.kind, enabled: c.enabled }; })(),
  };
}
/**
 * A BEMUTATÓ A KÖZÖS ELÉRHETŐSÉGI TENGELYEKET VISZI (F91-05/F91-06): `audience` (belépés előtt /
 * után) és `scope` (személy / fiók). A korábbi alak egy KITALÁLT `needs_admin` szabályt használt
 * (a művelet NEVÉBŐL levezetve) — vagyis a melléklet MÁS szabály szerint szűrt, mint a rendszer
 * (KUKA-039: egy feloldó, minden hívó). Mostantól a deklarációból jön.
 */
const INDEX = FEATURES.map((f) => ({
  id: f.id, status: f.status, group: f.group, scope: f.scope, audience: f.audience, screen: f.screen,
  version: f.version, action: f.action ?? null, tour: f.tour, tour_note: f.tour_note ?? null,
  faq: [...f.faq], replaced_by: f.replaced_by ?? null,
  needs_admin: Boolean(f.action && ACTIONS[f.action] && ACTIONS[f.action].requires_role === 'admin'),
}));
// A LAP SAJÁT MŰVELETEI — képernyőnként, a regiszterből. A korábbi alak MINDEN oldalra kitette a
// „Frissítés / Meghívás / Csomag" hármast, ezért a készlet-oldalon meghívási és csomag-vezérlő állt
// (a külső fél R91-es lelete). Ami nem ehhez az oldalhoz tartozik, az nem is jelenik meg.
const PAGE_ACTIONS = {};
for (const f of FEATURES) {
  if (!f.screen || !f.action || f.status === 'retired') continue;
  const a = ACTIONS[f.action];
  if (!a) continue;
  (PAGE_ACTIONS[f.screen] = PAGE_ACTIONS[f.screen] || []).push({
    id: f.action, feature: f.id, kind: a.kind, needs_admin: a.requires_role === 'admin',
  });
}
const TOURDEF = Object.fromEntries(Object.entries(TOURS).map(([id, t]) => [id, {
  id, version: t.version, feature: t.feature, page: t.page ?? null, requires_role: t.requires_role ?? null,
  audience: t.audience ?? 'signed_in', requires_anonymous: t.requires_anonymous === true,
  steps: t.steps.map((s) => ({ id: s.id, target: s.target, task: s.task ?? null, appears_after: s.appears_after ?? null })),
}]));

const STORYDEF = STORIES.map((x) => ({ id: x.id, features: [...x.features], tours: [...x.tours],
  evidence: x.evidence.map((e) => ({ spec: e.spec, title: e.title })) }));
const payload = JSON.stringify({ LANGS, DATA, INDEX, TOURDEF, PAGE_ACTIONS, version: VERSION,
  STORIES: STORYDEF, STORY_STEPS, EVIDENCE })
  .replace(/</g, '\\u003c');

const html = `<!doctype html>
<html lang="hu" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Valach System — kipróbálás</title>
<style>
  :root { --ink:#0f172a; --muted:#64748b; --line:#cbd5e1; --warn:#b45309; --warnbg:#fffbeb; --ok:#15803d; }
  * { box-sizing: border-box; }
  body { margin:0; font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color:var(--ink); background:#f8fafc; }
  .simbar { background:#fef3c7; border-bottom:2px solid #f59e0b; padding:10px 16px; font-weight:700; color:#7c2d12; }
  .simbar small { display:block; font-weight:400; color:#7c2d12; }
  header { background:#fff; border-bottom:1px solid var(--line); padding:10px 16px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
  header .sp { flex:1 1 auto; }
  main { display:flex; gap:0; min-height:60vh; }
  nav { inline-size:210px; background:#fff; border-inline-end:1px solid var(--line); padding:12px; }
  nav .grp { font-size:11px; text-transform:uppercase; color:var(--muted); margin:12px 0 4px; }
  nav button { display:block; inline-size:100%; text-align:start; padding:7px 9px; border:0; background:none; border-radius:7px; cursor:pointer; font:inherit; }
  nav button.on { background:#e0e7ff; font-weight:650; }
  section.body { flex:1 1 auto; padding:18px; }
  button, select { font:inherit; padding:7px 11px; border:1px solid var(--line); border-radius:8px; background:#fff; cursor:pointer; }
  button.p { background:#2549a0; color:#fff; border-color:#2549a0; }
  .panel { position:fixed; inset-block:0; inset-inline-end:0; inline-size:min(520px,96vw); background:#fff; border-inline-start:1px solid var(--line); box-shadow:-10px 0 30px #1e293b22; padding:16px; overflow:auto; z-index:40; }
  .tabs { display:flex; gap:6px; flex-wrap:wrap; margin:10px 0; }
  .tabs button.on { background:#e0e7ff; font-weight:650; }
  .bubble { position:fixed; inset-block-end:16px; inset-inline-end:16px; inline-size:min(360px,94vw); background:#fff; border:1px solid var(--line); border-radius:12px; box-shadow:0 10px 30px #0f172a2e; padding:14px; z-index:60; }
  .hl { outline:3px solid #2563eb; outline-offset:3px; border-radius:6px; }
  .warn { background:var(--warnbg); border:1px solid #fcd34d; border-radius:8px; padding:9px 11px; color:var(--warn); }
  .muted { color:var(--muted); }
  ol.steps li[data-state=done] b { color:var(--ok); }
  ol.steps li[data-state=skipped] b { color:var(--warn); }
  .foot { padding:14px 16px; color:var(--warn); background:var(--warnbg); border-top:2px solid #f59e0b; }
  ul.list { list-style:none; padding:0; margin:6px 0; }
  ul.list li { border-bottom:1px solid #eef2f7; padding:6px 0; }
  .line span { display:block; font-size:12px; color:var(--muted); }
  input[type=text] { inline-size:100%; padding:7px 9px; border:1px solid var(--line); border-radius:8px; font:inherit; }
  .tech { margin:16px; padding:10px 14px; border:1px solid var(--line); border-radius:10px; background:#f8fafc; }
  .tech summary { cursor:pointer; font-weight:650; }
  /* R116: a magyarázó mondat a SAJÁT sorába kerül — korábban a listaelem szövegéhez tapadt */
  .tech ul.list li span { display:block; font-size:12px; color:var(--muted); margin-block-start:2px; }
  .simbar { font-weight:650; }
  /* R112 — a [hidden] attribútum ERŐSEBB a keret saját display-szabályánál (a main flex volt, és látszott) */
  [hidden] { display:none !important; }
  /* R112 — a történetek belépője és lejátszója */
  .modebar { display:flex; gap:8px; padding:8px 16px; background:#fff; border-bottom:1px solid var(--line); flex-wrap:wrap; }
  .modebar button.on { background:#e0e7ff; font-weight:650; }
  #stories { padding:16px; max-inline-size:1100px; overflow-wrap:break-word; hyphens:auto; }
  #stories h1 { font-size:clamp(20px, 5vw, 28px); }
  .scards { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:12px; }
  .scard { background:#fff; border:1px solid var(--line); border-radius:12px; padding:12px 14px; }
  .scard h3 { margin:0 0 6px; font-size:16px; }
  .splayer { display:flex; gap:14px; align-items:flex-start; flex-wrap:wrap; }
  .ssteps { flex:0 1 250px; min-inline-size:200px; padding-inline-start:0; list-style:none; margin:0; }
  .ssteps li { margin:0 0 6px; }
  .ssteps li button { inline-size:100%; text-align:start; }
  .ssteps li.scur button { border-color:#2549a0; font-weight:650; }
  .ssteps li.sdone-step button { color:var(--ok); }
  .sstage { flex:1 1 380px; min-inline-size:0; }
  .sexplain { background:#fff; border-inline-start:4px solid #2549a0; padding:8px 12px; border-radius:6px; }
  .shint { color:var(--muted); } .shint.ok { color:var(--ok); }
  .sframe { border:1px solid var(--line); border-radius:12px; background:#fff; overflow:hidden; }
  .sframe-head { display:flex; gap:10px; align-items:center; flex-wrap:wrap; padding:8px 12px; background:#f1f5f9; border-bottom:1px solid var(--line); font-size:13px; }
  .sframe-head .sacc { font-weight:650; } .sframe-head .sact { color:var(--muted); overflow-wrap:anywhere; }
  .sframe-body { padding:12px 14px; overflow-wrap:anywhere; }
  .sframe-body h2 { margin:0 0 8px; font-size:18px; }
  .sact-btn { box-shadow:0 0 0 3px #93c5fd; }
  .snote { border-radius:8px; padding:8px 10px; background:#eef2ff; }
  .snote.ok { background:#ecfdf5; color:#065f46; } .snote.warn { background:var(--warnbg); color:var(--warn); }
  .snext { font-weight:600; }
  .slink { text-decoration:underline; font-weight:600; }
  .starget { outline:3px solid #2563eb; outline-offset:2px; border-radius:6px; }
  .sbubble { border:1px solid var(--line); border-radius:10px; padding:8px 10px; margin:8px 0; background:#f8fafc; }
  .stable { border-collapse:collapse; } .stable td, .stable th { border:1px solid var(--line); padding:4px 8px; }
  .simtag { margin-top:14px; padding:8px 12px; background:var(--warnbg); border:1px solid #fcd34d; border-radius:8px; color:var(--warn); }
  .sevid, .shelp { margin-top:12px; background:#fff; border:1px solid var(--line); border-radius:10px; padding:8px 12px; }
  .sevid summary, .shelp summary { cursor:pointer; font-weight:650; }
  .evok { color:var(--ok); font-weight:650; } .evbad { color:#b91c1c; font-weight:650; } .evno { color:var(--muted); }
  .shead { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
  @media (max-width: 700px) { main { flex-direction:column; } nav { inline-size:auto; border-inline-end:0; border-bottom:1px solid var(--line); } .ssteps { flex-basis:100%; } }
</style>
</head>
<body>
<div class="simbar" id="simbar"></div>
<div class="modebar"><button data-mode="stories" class="on" data-testid="mode-stories"></button>
  <button data-mode="help" data-testid="mode-help"></button></div>

<header>
  <strong>VS</strong>
  <label><span id="langlabel"></span> <select id="lang"></select></label>
  <label><span id="rolelabel"></span> <select id="role"></select></label>
  <span class="sp"></span>
  <button id="help"></button>
</header>
<main>
  <nav id="nav"></nav>
  <section class="body">
    <h1 id="title"></h1>
    <p class="muted" id="lead"></p>
    <p id="pageacts"></p>
  </section>
</main>
<section id="stories" data-testid="stories"></section>
<details class="tech" id="techbox">
  <summary id="techsummary"></summary>
  <div id="tech"></div>
</details>
<div id="panelbox"></div>
<div id="bubblebox"></div>
<script type="application/json" id="payload">${payload}</script>
<script>
(() => {
  'use strict';
  const P = JSON.parse(document.getElementById('payload').textContent);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const st = { lang: 'hu', role: 'admin', page: 'stock', help: false, view: 'guides', topic: null, search: '', faqOpen: null, tour: null, blocked: null, done: false, aborted: null, chat: [] };
  const D = () => P.DATA[st.lang];
  const NAVDEF = [
    { key: null, pages: ['overview'] },
    { key: 'reports', pages: ['stock', 'movements', 'stockcard'] },
    { key: 'masterdata', pages: ['products', 'partners', 'warehouses'] },
    { key: 'settings', pages: ['account', 'members', 'plan'], admin: true },
  ];

  function applyLang() {
    document.documentElement.lang = st.lang;
    document.documentElement.dir = D().dir;
  }
  function renderChrome() {
    // A LAP KERETE IS A KIVÁLASZTOTT NYELVEN SZÓL (R114/9): a sáv, a két mód, a két legördülő címkéje
    // és a lenyíló fejléce mind a STORYUI csoportból jön — a generátorban nincs beégetett felirat.
    const S = D().STORYUI;
    const sel = document.getElementById('lang');
    sel.innerHTML = P.LANGS.map((l) => '<option value="' + esc(l.code) + '"' + (l.code === st.lang ? ' selected' : '') + '>'
      + esc(l.endonym) + (l.kind === 'probe' ? ' — ' + esc(S.probeLang) : '') + '</option>').join('');
    // A SZIMULÁCIÓ JELÖLÉSE VÉGIG LÁTSZIK, és a mondat megmondja, mi NEM történik (R114/8).
    document.getElementById('simbar').innerHTML = '<strong>' + esc(D().STATE.demo) + '</strong><small>' + esc(S.simulationBanner) + '</small>';
    document.querySelector('[data-testid="mode-stories"]').textContent = S.modeStories;
    document.querySelector('[data-testid="mode-help"]').textContent = S.modeHelp;
    document.getElementById('langlabel').textContent = D().UI.language;
    document.getElementById('rolelabel').textContent = S.viewAs;
    const roleSel = document.getElementById('role');
    const roles = [['admin', D().ROLE.admin], ['user', D().ROLE.user], ['anon', S.viewAnon]];
    roleSel.innerHTML = roles.map(([v, t]) => '<option value="' + v + '"' + (v === st.role ? ' selected' : '') + '>' + esc(t) + '</option>').join('');
    document.getElementById('techsummary').textContent = S.checkDetails + ' — ' + S.checkDetailsLead;
    document.getElementById('help').textContent = D().HELP.open;
    // A LAP SAJÁT MŰVELETEI — csak ami EHHEZ a képernyőhöz tartozik (F91-06).
    const acts = (P.PAGE_ACTIONS[st.page] || []).filter((a) => !(a.needs_admin && st.role !== 'admin'));
    document.getElementById('pageacts').innerHTML = acts.length
      ? acts.map((a, i) => '<button class="' + (i === 0 ? 'p' : '') + '" data-testid="sim-' + esc(a.id) + '">'
        + esc((D().KB[a.feature] || {}).title || a.feature) + '</button>').join(' ')
      : '<span class="muted">' + esc(D().UI.demoListLead) + '</span>';
    // A MÉRÉSI RÉSZLETEK A TECHNIKAI SZAKASZBAN (F91-06): a kulcs-darabszám nem a fő oldal szövege.
    const c = D().coverage;
    document.getElementById('tech').innerHTML = '<ul class="list">'
      + '<li>' + esc(S.techCoverage) + ': <b>' + c.covered + '/' + c.population + '</b> · '
      + esc(c.enabled ? S.techEnabledLang : S.techProbeLang) + '.'
      + '<span>' + esc(S.techCoverageNote) + '</span></li>'
      + '<li><b>' + esc(S.techNoServer) + '</b><span>' + esc(S.techNoServerNote) + '</span></li>'
      + '<li>' + esc(S.techNotProven) + '<span>' + esc(S.techNotProvenNote) + '</span></li>'
      + '</ul>';
  }
  function renderNav() {
    const n = document.getElementById('nav');
    let h = '';
    for (const g of NAVDEF) {
      if (g.admin && st.role !== 'admin') continue;
      if (g.key) h += '<div class="grp">' + esc(D().NAV[g.key]) + '</div>';
      for (const p of g.pages) h += '<button data-go="' + p + '" data-testid="nav-' + p + '" class="' + (st.page === p ? 'on' : '') + '">' + esc(D().PAGE[p]) + '</button>';
    }
    n.innerHTML = h;
    document.getElementById('title').textContent = D().PAGE[st.page] || st.page;
    document.getElementById('lead').textContent = st.page === 'stock' ? D().UI.stockLead
      : st.page === 'members' ? D().UI.membersLead : st.page === 'plan' ? D().UI.planLead : D().UI.demoListLead;
  }
  /**
   * A LÁTHATÓ FUNKCIÓK — UGYANAZ A KÉT TENGELY, mint a rendszerben (F91-05): a közönség és a
   * hatókör, plusz a szerep. A „Belépés előtt" nézet ezért a NYILVÁNOS hetet mutatja: a melléklet a
   * rendszer szabályát mutatja be, nem egy hasonlót.
   */
  const visible = () => P.INDEX.filter((r) => {
    if (r.status === 'retired') return false;
    if (st.role === 'anon') return r.audience === 'public';
    if (r.scope === 'book' && false) return false;
    return !(r.needs_admin && st.role !== 'admin');
  });
  function topicHtml(r) {
    const t = D().KB[r.id] || {};
    const o = t.outcomes || {};
    const names = { success: D().HELP.outcomeSuccess, empty: D().HELP.outcomeEmpty, missing: D().HELP.outcomeMissing, refused: D().HELP.outcomeRefused, error: D().HELP.outcomeError, uncertain: D().HELP.outcomeUncertain };
    return '<h3>' + esc(t.title || r.id) + '</h3>'
      + '<div class="line"><span>' + esc(D().HELP.whatFor) + '</span>' + esc(t.purpose || '') + '</div>'
      + '<div class="line"><span>' + esc(D().HELP.prerequisites) + '</span>' + esc(t.prereq || '') + '</div>'
      + '<div class="line"><span>' + esc(D().HELP.result) + '</span>' + esc(t.result || '') + '</div>'
      + (Object.keys(o).length ? '<div class="line"><span>' + esc(D().HELP.outcomes) + '</span><ul class="list">'
        + Object.entries(o).map(([k, v]) => '<li><b>' + esc(names[k] || k) + ':</b> ' + esc(v) + '</li>').join('') + '</ul></div>' : '')
      + (r.tour ? '<p><button class="p" data-tour="' + esc(r.tour) + '">' + esc(D().HELP.startTour) + '</button></p>' : '')
      + '<p class="muted">' + esc(D().HELP.sourceVersion) + ': ' + esc(r.version) + ' · ' + esc(r.id) + '</p>';
  }
  function renderPanel() {
    const box = document.getElementById('panelbox');
    if (!st.help) { box.innerHTML = ''; return; }
    const tab = (k, label) => '<button data-view="' + k + '" class="' + (st.view === k ? 'on' : '') + '">' + esc(label) + '</button>';
    let inner = '';
    if (st.view === 'guides') {
      if (st.topic) inner = '<button data-view="guides" data-topic="">← ' + esc(D().HELP.backToList) + '</button>' + topicHtml(P.INDEX.find((r) => r.id === st.topic));
      else {
        const q = st.search.toLowerCase();
        const rows = visible().filter((r) => !q || ((D().KB[r.id] || {}).title || '').toLowerCase().includes(q) || ((D().KB[r.id] || {}).purpose || '').toLowerCase().includes(q));
        inner = '<input type="text" id="gsearch" placeholder="' + esc(D().HELP.searchGuidesPlaceholder) + '" value="' + esc(st.search) + '">'
          + '<p class="muted">' + esc(D().HELP.searchGuides) + ' — ' + esc(D().STORYUI.noModelCall) + '</p>'
          + '<ul class="list">' + rows.map((r) => '<li><button data-topic="' + esc(r.id) + '">' + esc((D().KB[r.id] || {}).title || r.id) + '</button></li>').join('') + '</ul>'
          + (rows.length ? '' : '<p class="warn">' + esc(D().HELP.searchNoHit) + '</p>');
      }
    } else if (st.view === 'faq') {
      const ids = [...new Set(visible().flatMap((r) => r.faq))];
      inner = '<p class="muted">' + esc(D().HELP.faqLead) + '</p><ul class="list">'
        + ids.map((id) => { const e = D().FAQ[id] || {}; return e.q ? '<li><button data-faq="' + esc(id) + '">' + esc(e.q) + '</button>'
          + (st.faqOpen === id ? '<p>' + esc(e.a) + '</p>' : '') + '</li>' : ''; }).join('') + '</ul>';
    } else if (st.view === 'sitemap') {
      inner = '<p class="muted">' + esc(D().HELP.sitemapLead) + '</p><ul class="list">'
        + NAVDEF.flatMap((g) => g.pages.map((p) => {
          const okp = !(g.admin && st.role !== 'admin');
          return '<li>' + (okp ? '<button data-go="' + p + '">' + esc(D().PAGE[p]) + '</button>'
            : '<span class="muted">' + esc(D().PAGE[p]) + '</span> <small>' + esc(D().HELP.sitemapNotAvailable) + ' — ' + esc(D().HELP.sitemapWhyRole) + '</small>') + '</li>';
        })).join('') + '</ul>';
    } else {
      inner = '<div class="warn">' + esc(D().CHAT.notConfigured) + ' ' + esc(D().CHAT.notConfiguredLead) + '</div>'
        + '<p class="muted">' + esc(D().CHAT.introLead) + '</p>'
        + '<ul class="list">' + st.chat.map((t) => '<li><b>' + esc(t.q) + '</b><p>' + esc(t.a) + '</p><small class="muted">'
          + esc(D().CHAT.localOnlyNote) + '</small></li>').join('') + '</ul>'
        + '<p>' + [D().CHAT.q1, D().CHAT.q2, D().CHAT.q3].map((q) => '<button data-ask="' + esc(q) + '">' + esc(q) + '</button>').join(' ') + '</p>'
        + '<p class="muted">' + esc(D().CHAT.noSecrets) + '</p>';
    }
    box.innerHTML = '<div class="panel"><div style="display:flex;justify-content:space-between;align-items:start">'
      + '<h2 style="margin:0">' + esc(D().HELP.title) + '</h2><button data-close="1">×</button></div>'
      + '<div class="tabs">' + tab('ask', D().HELP.tabAsk) + tab('guides', D().HELP.tabGuides) + tab('faq', D().HELP.tabFaq) + tab('sitemap', D().HELP.tabSitemap) + '</div>'
      + inner + '<p class="muted" style="margin-top:14px">' + esc(D().STORYUI.panelSimNote) + '</p></div>';
  }
  function targetEl(run) {
    const s = run.steps[run.at];
    return s ? document.querySelector('[data-testid="' + s.target + '"]') || document.getElementById(s.target) || null : null;
  }
  function renderTour() {
    const box = document.getElementById('bubblebox');
    for (const e of document.querySelectorAll('.hl')) e.classList.remove('hl');
    if (st.aborted) {
      box.innerHTML = '<div class="bubble"><p class="warn">' + esc(D().TOURUI[st.aborted] || D().TOURUI.targetMissing) + '</p>'
        + '<p class="muted">' + esc(D().TOURUI.targetMissingNext) + '</p><button data-texit="1">' + esc(D().TOURUI.exit) + '</button></div>';
      return;
    }
    if (!st.tour) { box.innerHTML = ''; return; }
    const run = st.tour;
    if (st.done) {
      const d = run.steps.filter((s) => s.state === 'done').length;
      const sk = run.steps.filter((s) => s.state === 'skipped').length;
      const pend = run.steps.filter((s) => s.state === 'pending').length;
      const whole = d === run.steps.length;
      box.innerHTML = '<div class="bubble"><h3>' + esc(whole ? D().TOURUI.finishedTitle : D().TOURUI.endedTitle) + '</h3>'
        + '<p>' + esc(whole ? D().TOURUI.finishedLead : D().TOURUI.endedLead) + '</p>'
        + '<p>' + esc(D().TOURUI.done) + ': ' + d + ' · ' + esc(D().TOURUI.skipped) + ': ' + sk
        + ' · ' + esc(D().TOURUI.pending) + ': ' + pend + '</p>'
        + '<button data-texit="1">' + esc(D().TOURUI.exit) + '</button></div>';
      return;
    }
    const el = targetEl(run);
    if (!el) { st.aborted = 'targetMissing'; renderTour(); return; }
    el.classList.add('hl');
    const txt = (D().TOUR[run.id] || {})[run.steps[run.at].id] || {};
    const last = run.at + 1 >= run.steps.length;
    box.innerHTML = '<div class="bubble"><small class="muted">' + esc((D().TOUR[run.id] || {}).title || run.id) + ' · ' + (run.at + 1) + '/' + run.steps.length + '</small>'
      + '<h3>' + esc(txt.title || '') + '</h3><p>' + esc(txt.body || '') + '</p>'
      + (st.blocked ? '<p class="warn">' + esc(D().TOURUI[st.blocked] || st.blocked) + '</p>' : '')
      + '<ol class="steps">' + run.steps.map((s, i) => '<li data-state="' + s.state + '"' + (i === run.at ? ' aria-current="step"' : '') + '>'
        + esc(((D().TOUR[run.id] || {})[s.id] || {}).title || s.id) + ' <b>' + esc(D().TOURUI[s.state === 'done' ? 'done' : s.state === 'skipped' ? 'skipped' : 'pending']) + '</b></li>').join('') + '</ol>'
      + '<p class="muted">' + esc(D().TOURUI.simulationNote) + '</p>'
      + '<p><button data-tback="1"' + (run.at === 0 ? ' disabled' : '') + '>' + esc(D().TOURUI.back) + '</button> '
      + '<button class="p" data-' + (last ? 'tfinish' : 'tnext') + '="1">' + esc(last ? D().TOURUI.finish : D().TOURUI.next) + '</button> '
      + '<button data-texit="1">' + esc(D().TOURUI.exit) + '</button></p>'
      + (st.blocked === 'taskNotDone' ? '<p><button data-tskip="1">' + esc(D().TOURUI.skipStep) + '</button></p>' : '')
      + '</div>';
  }
  function render() { applyLang(); renderChrome(); renderNav(); renderPanel(); renderTour(); }

  function startTour(id) {
    const def = P.TOURDEF[id];
    if (!def) return;
    if (def.requires_role === 'admin' && st.role !== 'admin') { st.aborted = 'rightLost'; st.tour = null; render(); return; }
    st.tour = { id, at: 0, steps: def.steps.map((s) => ({ ...s, state: 'pending' })) };
    st.blocked = null; st.done = false; st.aborted = null; st.help = false;
    if (def.page) st.page = def.page;
    render();
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (b.id === 'help') { st.help = true; st.view = 'guides'; render(); return; }
    if (d.close) { st.help = false; render(); return; }
    if (d.view !== undefined && d.view) { st.view = d.view; st.topic = d.topic === '' ? null : st.topic; render(); return; }
    if (d.topic !== undefined) { st.topic = d.topic || null; st.view = 'guides'; st.help = true; render(); return; }
    if (d.faq) { st.faqOpen = st.faqOpen === d.faq ? null : d.faq; render(); return; }
    if (d.go) { st.page = d.go; st.help = false; render(); return; }
    if (d.ask) {
      // SZIMULÁLT HELYI KERESÉS: a válasz a VALÓDI útmutató-szövegből jön, modell nélkül.
      const q = d.ask.toLowerCase();
      const hit = visible().find((r) => { const t = D().KB[r.id] || {}; return (t.title || '').toLowerCase().split(/\\s+/).some((wd) => wd.length > 3 && q.includes(wd.slice(0, 5))); })
        || visible().find((r) => r.id === 'shell.help');
      st.chat.push({ q: d.ask, a: (D().KB[hit.id] || {}).purpose || D().CHAT.noAnswer });
      render(); return;
    }
    if (d.tour) { startTour(d.tour); return; }
    if (d.tnext) {
      const run = st.tour; const s = run.steps[run.at];
      if (s.task && s.state !== 'done') { st.blocked = 'taskNotDone'; render(); return; }
      if (!s.task) s.state = 'done';
      if (run.at + 1 >= run.steps.length) { st.done = true; } else { run.at += 1; }
      st.blocked = null; render(); return;
    }
    if (d.tback) { if (st.tour.at > 0) st.tour.at -= 1; st.blocked = null; render(); return; }
    if (d.tfinish) {
      const s = st.tour && st.tour.steps[st.tour.at];
      if (s && s.state === 'pending' && s.task) { st.blocked = 'taskNotDone'; render(); return; }
      if (s && s.state === 'pending') s.state = 'done';
      st.done = true; render(); return;
    }
    if (d.texit) {
      if (st.tour) for (const s of st.tour.steps) if (s.state === 'pending') s.state = 'skipped';
      st.tour = null; st.done = false; st.aborted = null; st.blocked = null; render(); return;
    }
    // A SZIMULÁLT MŰVELETEK: a feladathoz kötött lépést CSAK ez „igazolja" — a bemutató maga nem kattint.
    if (String(b.dataset.testid || '').startsWith('sim-')) {
      if (st.tour) { const s = st.tour.steps[st.tour.at]; if (s.task) { s.state = 'done'; st.blocked = null; } }
      render(); return;
    }
    // A KIHAGYÁS KÜLÖN ÁLLAPOT, a befejezés pedig csak ELSZÁMOLT lépéssel zárul (F91-01).
    if (d.tskip) {
      if (st.tour) { const s = st.tour.steps[st.tour.at]; s.state = 'skipped';
        if (st.tour.at + 1 >= st.tour.steps.length) st.done = true; else st.tour.at += 1; }
      st.blocked = null; render(); return;
    }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'gsearch') { st.search = e.target.value; renderPanel(); const el = document.getElementById('gsearch'); if (el) el.focus(); }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'lang') { st.lang = e.target.value; render(); }
    if (e.target.id === 'role') { st.role = e.target.value; st.topic = null; render(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (st.tour || st.aborted || st.done) { if (st.tour) for (const s of st.tour.steps) if (s.state === 'pending') s.state = 'skipped'; st.tour = null; st.done = false; st.aborted = null; }
    else st.help = false;
    render();
  });
${PAGE_JS}
  render();
})();
</script>
</body>
</html>
`;

const rel = artifactPath({ area: 'reports', kind: 'v3_r89_szimulalt_bemutato', ext: 'html', version: VERSION });
const out = resolve(ROOT, rel);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
// A DOKUMENTUMOK MELLÉ is kiírjuk, hogy a `docs:html` kimenetével egy helyen álljon az operátornak.
const stable = resolve(ROOT, 'docs/_olvashato/V3_R89_SZIMULALT_BEMUTATO.html');
mkdirSync(dirname(stable), { recursive: true });
writeFileSync(stable, html);
// R112: ugyanaz a lap a TÖRTÉNETEK nevén is — az operátor ezen a néven keresi.
const stableStories = resolve(ROOT, 'docs/_olvashato/V3_R112_TORTENETEK_BEMUTATO.html');
writeFileSync(stableStories, html);
console.log('');
console.log('R89 — SZIMULÁLT, KATTINTHATÓ BEMUTATÓ');
console.log('='.repeat(84));
console.log(`  időbélyeges példány: ${out}`);
console.log(`  állandó út:         ${stable}`);
console.log(`  történetek belépő:  ${stableStories}`);
console.log(`  bizonyíték:         ${EVIDENCE ? `${EVIDENCE_PATH} · mérve: ${EVIDENCE.measured_at} · commit ${String(EVIDENCE.commit || '').slice(0, 7)}` : 'NINCS (a próbák nem mérték — a lap „nem mért" jelölést mutat)'}`);
console.log(`  történetek:         ${STORIES.length} · lépés: ${Object.values(STORY_STEPS).reduce((n, x) => n + x.length, 0)}`);
console.log(`  méret:              ${html.length} bájt · nyelv: ${LANGS.length} (ebből próba: ${LANGS.filter((l) => l.kind === 'probe').length})`);
console.log(`  beforgatott adat:   ${FEATURES.length} funkció · ${Object.keys(TOURS).length} bemutató · MÉRT szótárból`);
console.log('');
console.log('  KIMONDVA: ez SZIMULÁCIÓ. Hálózat nélkül fut, a jogosultságot legördülő állítja,');
console.log('  és NEM bizonyít szerveroldali jogosultságot vagy élő AI-választ. A tényleges');
console.log('  alkalmazás útjairól a böngésző-próbák és a HTTP-battériák a bizonyíték.');
console.log('='.repeat(84));
console.log('');
