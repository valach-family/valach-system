#!/usr/bin/env node
// VS — LAP FELTÖLTÉSE A BOARDRA (DOC-01, D-VS-655). Egy paranccsal, egy körhöz.
//
// OPERÁTORI PARANCS (2026-09-06): „de én nem akarok repot futtatni állandóan. mi lenne, ha a boardra
// feltolnátok az adott round-hoz a .md-t + a hozzá tartozó html-t … te ide írsz egy copy-zható
// elértést (példa: CMD-VS-300-001-002 R11 — LETTER) én erre annyit nyomok, hogy copy."
//
// Ez az eszköz EZT az egy mondatot állítja elő. A markdownt küldi fel; az olvasható HTML-t a BOARD
// készíti belőle (MDR-01), tehát a kettő nem tud elcsúszni (KUKA-018), és a lap ott van, ahol az
// operátor ÉS a másik fél is eléri — nem a letöltések mappájában (KUKA-079).
//
//   node tools/vs_board_doc.mjs docs/70_PLANNING/BOARD_HASZNALAT_KULSO_FELNEK.md \
//     --pr 300 --step 2 --cmd 1 --round R4 --label GUIDE --by Claude-AUX
//   node tools/vs_board_doc.mjs --list [--pr 300]      # mi van fenn
//
// Környezet: CHATOPS_BASE_URL + CHATOPS_WRITE_TOKEN (a .env-ből is betöltődik — KUKA-040).
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, basename } from 'node:path';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { loadRepoEnv } from './lib/vs_tool_env.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadRepoEnv(ROOT);

const BASE = String(process.env.CHATOPS_BASE_URL || '').trim().replace(/\/+$/, '');
const TOKEN = String(process.env.CHATOPS_WRITE_TOKEN || '').trim();
if (!BASE || !TOKEN) {
  console.error('HIÁNYZIK: CHATOPS_BASE_URL és/vagy CHATOPS_WRITE_TOKEN (a .env-ben vagy a környezetben).');
  console.error('Ez az eszköz a boardra ír, tehát író-token kell hozzá — kulcs SOHA nem kerül chatbe.');
  process.exit(2);
}

const args = process.argv.slice(2);
const opt = (name, def = null) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = args[i + 1];
  return (v === undefined || v.startsWith('--')) ? true : v;
};
const SERIES = String(opt('series', 'VS'));
const pad = (v, n) => String(v).padStart(n, '0');
/** `--pr 300 --step 2 --cmd 1` → CMD-VS-300-002-001. Teljes kulcsot is elfogad. */
function keyOf(kind) {
  const pr = opt('pr'); const step = opt('step'); const cmd = opt('cmd');
  const full = (v) => (typeof v === 'string' && /^(PR|STEP|CMD)-/i.test(v) ? v.toUpperCase() : null);
  if (kind === 'PR') return full(pr) || (pr ? `PR-${SERIES}-${pad(pr, 3)}` : null);
  if (kind === 'STEP') return full(step) || (pr && step ? `STEP-${SERIES}-${pad(pr, 3)}-${pad(step, 3)}` : null);
  return full(cmd) || (pr && step && cmd ? `CMD-${SERIES}-${pad(pr, 3)}-${pad(step, 3)}-${pad(cmd, 3)}` : null);
}

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', 'x-chatops-write-token': TOKEN },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}

// ── LISTA ─────────────────────────────────────────────────────────────────────────────────────
if (args.includes('--list')) {
  const q = [];
  if (opt('pr')) q.push(`pr=${encodeURIComponent(keyOf('PR'))}`);
  if (opt('cmd')) q.push(`cmd=${encodeURIComponent(keyOf('CMD'))}`);
  const r = await call('GET', `/api/chatops/documents${q.length ? `?${q.join('&')}` : ''}`);
  if (!r.ok) { console.error(`A lista nem érhető el (HTTP ${r.status}): ${(r.data || {}).error || ''}`); process.exit(1); }
  const docs = (r.data || {}).documents || [];
  console.log('='.repeat(78));
  console.log('A BOARDRA FELTÖLTÖTT LAPOK');
  console.log('='.repeat(78));
  if (!docs.length) { console.log((r.data || {}).reason || 'Nincs egyetlen lap sem.'); process.exit(0); }
  for (const d of docs) {
    console.log(`${d.doc_date}  ${d.reference}`);
    console.log(`            ${d.title}  ·  ${d.file_md}${d.has_html ? ' + .html' : '  (NINCS olvasható alak!)'}`);
  }
  console.log(`\n${docs.length} lap.`);
  process.exit(0);
}

// ── FELTÖLTÉS ─────────────────────────────────────────────────────────────────────────────────
const file = args.find((a) => !a.startsWith('--') && /\.md$/i.test(a));
if (!file) {
  console.error('Melyik lapot töltsem fel? Adj meg egy .md útvonalat, pl.:');
  console.error('  node tools/vs_board_doc.mjs docs/70_PLANNING/V3_TERV.md --pr 300 --step 2 --cmd 1 --round R4 --label PLAN --by Claude-AUX');
  process.exit(2);
}
const rel = file.replace(/^\.\//, '');
if (!existsSync(join(ROOT, rel))) {
  // KUKA-064: a „nincs ilyen" önmagában zsákutca — a legközelebbi jelöltek is menjenek vele.
  console.error(`Nincs ilyen fájl: ${rel}`);
  const dir = dirname(rel) === '.' ? 'docs/70_PLANNING' : dirname(rel);
  if (existsSync(join(ROOT, dir))) {
    const want = basename(rel, '.md').toUpperCase().slice(0, 8);
    const all = readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.md'));
    const near = all.filter((f) => f.toUpperCase().includes(want)).slice(0, 8);
    const list = near.length ? near : all
      .map((f) => ({ f, m: statSync(join(ROOT, dir, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m).slice(0, 8).map((x) => x.f);
    console.error(`\nEzek állnak a legközelebb a(z) ${dir}/ mappában:`);
    for (const f of list) console.error(`  ${dir}/${f}`);
  }
  process.exit(2);
}

const cmd = keyOf('CMD');
if (!cmd) {
  console.error('Melyik PARANCS köréhez tartozik? Add meg: --pr 300 --step 2 --cmd 1 (vagy --cmd CMD-VS-300-002-001).');
  console.error('Enélkül nincs másolható hivatkozás, tehát az operátor nem tudná átadni a lapot.');
  process.exit(2);
}

const payload = {
  cmd,
  pr: keyOf('PR'), step: keyOf('STEP'),
  round: opt('round') || null,
  label: String(opt('label', 'NOTE')).toUpperCase(),
  source_agent: String(opt('by', 'Claude-AUX')),
  name: opt('name') || basename(rel, '.md'),
  title: opt('title') || null,
  doc_date: opt('date') || null,
  source_path: rel,
  md_text: readFileSync(join(ROOT, rel), 'utf8'),
};

const r = await call('POST', '/api/chatops/documents', payload);
if (!r.ok) {
  console.error(`A feltöltés elutasítva (HTTP ${r.status}).`);
  for (const e of ((r.data || {}).errors || [])) console.error(`  · ${e.field}: ${e.message}`);
  if (!((r.data || {}).errors || []).length) console.error(`  ${(r.data || {}).error || '(nincs indoklás)'}`);
  process.exit(1);
}

const d = r.data.document;
console.log('='.repeat(78));
console.log('FELTÖLTVE A BOARDRA');
console.log('='.repeat(78));
console.log(`  lap:          ${d.title}`);
console.log(`  fájlok:       ${d.file_md}  +  ${d.has_html ? d.file_html : 'NINCS olvasható alak — nézd meg a lapot!'}`);
console.log(`  hova:         ${d.cmd}${d.round ? ` ${d.round}` : ''}  (${d.pr || 'PR nélkül'})`);
console.log(`  ki töltötte:  ${d.source_agent}${d.version > 1 ? `  ·  ${d.version}. változat (frissítés)` : ''}`);
// A cím a GÉPÉ: a board olvasása token-fejlécet kíván, ezért böngészőbe bemásolva 401-et ad.
// Az EMBER útja a Dokumentumok fül — ezt mondjuk ki, nem hagyjuk zsákutcába futni (KUKA-064).
console.log(`  gépi cím:     ${BASE}${d.urls.view}   (token-fejléccel; böngészőbe másolva 401)`);
console.log('');
console.log('MÁSOLHATÓ HIVATKOZÁS — ezt add át a másik félnek:');
console.log('');
console.log(`    ${r.data.reference}`);
console.log('');
console.log('A boardon a „Dokumentumok" fülön áll, és egy kattintással megnyílik új ablakban.');
