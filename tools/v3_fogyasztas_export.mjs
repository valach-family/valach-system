#!/usr/bin/env node
// tools/v3_fogyasztas_export.mjs — EGYSZERI, CÉLZOTT, TARTALOM NÉLKÜLI EXPORT egy munkamenet átiratából (R71 · javítva R73).
//
// R73 JAVÍTÁSOK: az események is CSAK az ablakon belül (a hívások első és utolsó sora között — az ablak utáni esemény
// nem magyarázhat korábbi bemenetet) · a Write/Edit ÍRÁS, nem olvasás · a Bash parancs HELYBEN, végrehajtás nélkül
// elemezve: csak a felismert fájl-utak mennek ki, a fel nem ismert parancs `bash_unknown` számláló · a blokkok
// (azonosító, blokk-index) párra deduplikálva · HÍVÁSONKÉNTI LEFEDÉS: a bemenet változása = az előző hívás kimenete
// (usage) + a közéjük eső események becsült tokenje (bájt/4 — BECSLÉS, nem mérés) + MEGMAGYARÁZATLAN maradék.
//
// MIT AD: hívásonként egy sor (azonosító · idő · modell · a négy usage-számláló · a bemeneti összeg · az előző
// híváshoz képesti változás) · a hívások KÖZÉ eső események (fajta · eszköznév · tool_use azonosító · az eredmény
// UTF-8 bájtmérete és sha256-a · biztonságosan kinyerhető, repó-relatív fájlút; ismétlődő eredmény és ismételt
// fájl-olvasás jelölve) · a kiadott tartalom bontása blokk-fajtánként (darab · bájt — BÁJT, NEM TOKEN) · az induló
// automatikus anyagok, ahogy az átirat tárolja (fajta · fájlnév · bájt · sha256) · összevetés a leltárral · rövid
// gépi összesítő. A DEDUPLIKÁLÁST és az ABLAKOT a meglévő mérő (FGY-01/3) függvényei adják — nem új mérőrendszer.
//
// MIT NEM AD, KIMONDVA: parancsszöveget · argumentumot · felhasználói szöveget · eszközválasz-tartalmat ·
// rendszer-utasítás szövegét · tokenbontást bájtból (a bájt nem token; a rejtett gondolkodás hiánya nem nulla).
// A kimeneten tartalom-őr fut: hosszú szöveges mező nem mehet ki.
//
//   node tools/v3_fogyasztas_export.mjs --session <id> --from <ISO> --to <ISO> --leltar <json> --out <alap-út>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { callOf, dedupe, windowOf, inWindow, triggerOf } from './v3_fogyasztas_meres.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)); const ROOT = resolve(HERE, '..');
const flag = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const sha = (s) => createHash('sha256').update(s).digest('hex');
const bytes = (s) => Buffer.byteLength(typeof s === 'string' ? s : JSON.stringify(s ?? ''), 'utf8');
const safePath = (p) => {
  if (typeof p !== 'string') return null;
  const abs = p.startsWith('/') ? p : join(ROOT, p);
  if (abs.startsWith(ROOT + '/')) return abs.slice(ROOT.length + 1);
  if (abs.startsWith(homedir())) return '~' + abs.slice(homedir().length);
  return '(repón kívüli út — nem exportált)';
};

const session = flag('--session'); const w = windowOf(flag('--from'), flag('--to'));
const file = join(homedir(), '.claude', 'projects', '-home-user', `${session}.jsonl`);
if (!existsSync(file)) { console.error(`NINCS ÁTIRAT: ${file.replace(homedir(), '~')}`); process.exit(2); }
const raw = readFileSync(file, 'utf8');
const lines = raw.split('\n').filter((l) => l.trim());
const recs = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } });

// ── 1. HÍVÁSOK (a mérő dedupe-ja: (fájl, azonosító) → utolsó rekord; az ablakban megfigyelt végső számláló) ──
const callRecords = []; const blocksById = new Map(); const firstLineOfId = new Map();
recs.forEach((d, i) => {
  if (!d || d.type !== 'assistant') return;
  const c = callOf(lines[i], file, 'main'); if (!c) return;
  if (!inWindow(c, w)) return; // későbbi állapot nem keveredik vissza
  callRecords.push(c);
  const id = d.message.id; if (!firstLineOfId.has(id)) firstLineOfId.set(id, i);
  // (azonosító, blokk-index) párra deduplikálva: a streamelt ismétlés nem duplázza a bájtot
  const blocks = blocksById.get(id) || { thinking: { db: 0, bytes: 0 }, text: { db: 0, bytes: 0 }, tool_use: { db: 0, bytes: 0 }, other: { db: 0, bytes: 0 }, _seen: new Set() };
  (Array.isArray(d.message.content) ? d.message.content : []).forEach((x, bi) => {
    const key = `${d.apiBlockIndex ?? 'b' + bi}:${x.type}`; if (blocks._seen.has(key)) return; blocks._seen.add(key);
    const k = blocks[x.type] ? x.type : 'other';
    blocks[k].db += 1;
    blocks[k].bytes += x.type === 'thinking' ? bytes(x.thinking || '') : x.type === 'text' ? bytes(x.text || '') : x.type === 'tool_use' ? bytes(x.input) : bytes(x);
  });
  blocksById.set(id, blocks);
});
const calls = dedupe(callRecords).sort((a, b) => a.epoch - b.epoch);
let prev = null;
const rows = calls.map((c, i) => {
  const inputSum = c.input + c.cache_write + c.cache_read;
  const { _seen, ...blk } = blocksById.get(c.id) || {};
  const r = { sorszam: i + 1, message_id: c.id, at: c.ts, model: c.model, input: c.input, cache_write: c.cache_write, cache_read: c.cache_read, output: c.output, input_sum: inputSum, delta_input_sum: prev === null ? null : inputSum - prev, missing_usage_fields: c.missing_fields || [], blocks: blk };
  prev = inputSum; return r;
});

// ── 2. ESEMÉNYEK A HÍVÁSOK KÖZÖTT (a következő hívás ELSŐ rekordja előtt) ──
const idOrder = rows.map((r) => r.message_id);
const boundary = idOrder.map((id) => firstLineOfId.get(id));
const seenResultSha = new Map(); const seenPath = new Map(); const toolNameById = new Map(); const events = [];
const bucketOf = (i) => { const k = boundary.findIndex((b) => i < b); return k < 0 ? 'ablak után' : (k === 0 ? 'az 1. hívás előtt' : `a(z) ${k}. és ${k + 1}. hívás között`); };
const lastCallLine = Math.max(...idOrder.map((id) => { let last = firstLineOfId.get(id); recs.forEach((d, i) => { if (d && d.type === 'assistant' && d.message.id === id) last = i; }); return last; }));
const READ_TOOLS = new Set(['Read', 'Glob', 'Grep']); const WRITE_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit']);
// Bash: HELYI, reguláris felismerés, végrehajtás nélkül — csak a felismert fájl-utak; a parancs szövege nem megy ki
const bashReadPaths = (cmd) => [...new Set([...String(cmd || '').matchAll(/(?:cat|sed -n [^ ]+|head[^|;]*?|tail[^|;]*?|grep -n?[^|;]*?|git show [^ ]+:)\s*(?:-[a-zA-Z]+\s+)*([~./A-Za-z0-9_][^\s;|&'"]*\.(?:md|mjs|js|json|cjs))/g)].map((m) => safePath(m[1])))];
recs.forEach((d, i) => {
  if (i > lastCallLine) return; // az ablak utáni esemény nem tartozik a 47 híváshoz
  if (!d) { events.push({ line: i, bucket: bucketOf(i), kind: 'nem értelmezhető sor' }); return; }
  const ts = d.timestamp || null;
  if (d.type === 'assistant') {
    for (const x of (Array.isArray(d.message.content) ? d.message.content : [])) {
      if (x.type !== 'tool_use') continue;
      toolNameById.set(x.id, x.name);
      const p = safePath(x.input && (x.input.file_path || x.input.path || x.input.notebook_path));
      const reads = READ_TOOLS.has(x.name) && p ? [p] : x.name === 'Bash' ? bashReadPaths(x.input && x.input.command) : [];
      const bashUnknown = x.name === 'Bash' && reads.length === 0;
      const repeated = reads.filter((r) => seenPath.has(r)); reads.forEach((r) => seenPath.set(r, (seenPath.get(r) || 0) + 1));
      events.push({ line: i, bucket: bucketOf(i + 1), kind: 'tool_use', tool: x.name, tool_use_id: x.id, input_bytes: bytes(x.input), path: WRITE_TOOLS.has(x.name) ? p : null, role: WRITE_TOOLS.has(x.name) ? 'write' : reads.length ? 'read' : x.name === 'Bash' ? 'bash_unknown' : 'other', read_paths: reads, repeated_read_paths: repeated, bash_unknown: bashUnknown, skill: x.input && x.input.skill || null, at: ts });
    }
    return;
  }
  if (d.type === 'user') {
    const c = d.message && d.message.content;
    const results = Array.isArray(c) ? c.filter((x) => x && x.type === 'tool_result') : [];
    if (results.length) {
      for (const x of results) {
        const body = typeof x.content === 'string' ? x.content : JSON.stringify(x.content ?? '');
        const h = sha(body); const rep = seenResultSha.get(h) || 0; seenResultSha.set(h, rep + 1);
        events.push({ line: i, bucket: bucketOf(i), kind: 'tool_result', tool: toolNameById.get(x.tool_use_id) || null, tool_use_id: x.tool_use_id, result_bytes: bytes(body), result_sha256: h, is_error: !!x.is_error, repeated_identical_result: rep > 0 ? rep : 0, at: ts });
      }
      return;
    }
    const txt = typeof c === 'string' ? c : Array.isArray(c) ? c.filter((x) => x && x.type === 'text').map((x) => x.text || '').join('\n') : '';
    events.push({ line: i, bucket: bucketOf(i), kind: 'user', trigger: triggerOf(lines[i]) || (d.isMeta ? 'meta' : 'kísérő'), is_meta: !!d.isMeta, text_bytes: bytes(txt), text_sha256: sha(txt), at: ts });
    return;
  }
  if (d.type === 'attachment') {
    const a = d.attachment || {};
    const body = a.content ?? a.text ?? a.data ?? null;
    // az induló utasítás-melléklet FÁJL-LISTÁJA (út · bájt · sha), tartalom nélkül — ez mondja meg, MI töltődött be
    const files = Array.isArray(a.files) ? a.files.map((f) => ({ path: safePath(f.path || f.filename || f.file || ''), bytes: bytes(f.content ?? f.text ?? ''), sha256: sha(String(f.content ?? f.text ?? '')) })) : null;
    events.push({ line: i, bucket: bucketOf(i), kind: 'attachment', attachment_type: a.type || null, files, filename: a.filename ? safePath(a.filename) : (a.path ? safePath(a.path) : null), bytes: body === null ? bytes(a) : bytes(body), sha256: sha(body === null ? JSON.stringify(a) : (typeof body === 'string' ? body : JSON.stringify(body))), fields: Object.keys(a).sort(), at: ts });
    return;
  }
  if (d.type === 'system') { events.push({ line: i, bucket: bucketOf(i), kind: 'system', subtype: d.subtype || null, hook_count: d.hookCount ?? null, at: ts }); return; }
  if (d.type === 'cost-state') { events.push({ line: i, bucket: bucketOf(i), kind: 'cost-state', total_cost_usd: d.totalCostUSD ?? null, total_api_duration_ms: d.totalAPIDuration ?? null, model_usage: d.modelUsage ?? null, at: ts }); return; }
  events.push({ line: i, bucket: bucketOf(i), kind: d.type, at: ts });
});

// ── 4. INDULÓ ANYAGOK — csak amit az átirat tárol ──
const firstBoundary = boundary[0] ?? recs.length;
const startup = events.filter((e) => e.line < firstBoundary && (e.kind === 'attachment' || e.kind === 'user' || e.kind === 'system'));
// az induló utasítás-melléklet SZAKASZ-BONTÁSA (cím · bájt · sha; ismétlés jelölve) — programmal, a modell nem olvassa
const instr = recs.find((d) => d && d.type === 'attachment' && d.attachment && d.attachment.type === 'instructions');
const startupSections = instr ? (instr.attachment.files || []).map((f) => { const c = String(f.content ?? ''); const seen = new Set(); const secs = c.split(/(?=^#{1,3} )/m).filter((x) => x.trim()).map((x) => { const h = sha(x); const dup = seen.has(h); seen.add(h); return { cim: x.split('\n', 1)[0].slice(0, 70), bytes: bytes(x), sha256: h.slice(0, 16), ismetles: dup }; }); return { path: safePath(f.path || ''), bytes: bytes(c), sha256: sha(c), szakasz_db: secs.length, szakaszok: secs.sort((a, b) => b.bytes - a.bytes), kuka_tabla_sorok: (c.match(/^\| \*\*KUKA-/gm) || []).length }; }) : [];
const attachmentTypes = {}; for (const e of events.filter((e) => e.kind === 'attachment')) { const k = `${e.attachment_type}${e.filename ? ' · ' + e.filename : ''}`; attachmentTypes[k] = attachmentTypes[k] || { db: 0, bytes: 0 }; attachmentTypes[k].db += 1; attachmentTypes[k].bytes += e.bytes; }

// ── 5. ÖSSZEVETÉS A LELTÁRRAL ──
let compare = { leltar: flag('--leltar'), status: 'nincs leltár megadva' };
if (flag('--leltar') && existsSync(flag('--leltar'))) {
  const L = JSON.parse(readFileSync(flag('--leltar'), 'utf8')); const ws = L.window_summary || {};
  const mine = { calls: rows.length, input: rows.reduce((s, r) => s + r.input, 0), cache_write: rows.reduce((s, r) => s + r.cache_write, 0), cache_read: rows.reduce((s, r) => s + r.cache_read, 0), output: rows.reduce((s, r) => s + r.output, 0) };
  const theirs = { calls: ws.calls, ...(ws.totals || {}) };
  const diffs = Object.keys(mine).filter((k) => mine[k] !== theirs[k]).map((k) => `${k}: export ${mine[k]} ≠ leltár ${theirs[k]}`);
  compare = { leltar: flag('--leltar'), leltar_window: L.window, export: mine, leltar_values: theirs, status: diffs.length ? `NEVEZETT ELTÉRÉS: ${diffs.join(' · ')}` : 'egyezik (hívás és a négy összeg)' };
}

// ── 6. ÖSSZESÍTŐ ──
const top5 = [...rows].filter((r) => r.delta_input_sum !== null).sort((a, b) => b.delta_input_sum - a.delta_input_sum).slice(0, 5).map((r) => ({ sorszam: r.sorszam, delta_input_sum: r.delta_input_sum, input_sum: r.input_sum, events_before: events.filter((e) => e.bucket === (r.sorszam === 1 ? 'az 1. hívás előtt' : `a(z) ${r.sorszam - 1}. és ${r.sorszam}. hívás között`)).map((e) => ({ kind: e.kind, tool: e.tool || null, path: e.path || e.filename || null, bytes: e.result_bytes ?? e.bytes ?? e.text_bytes ?? e.input_bytes ?? null, repeated: e.repeated_identical_result || e.repeated_path_read || 0 })) }));
const repeatedResultBytes = events.filter((e) => e.kind === 'tool_result' && e.repeated_identical_result).reduce((s, e) => s + e.result_bytes, 0);
const repeatedPathReads = events.filter((e) => e.kind === 'tool_use' && e.repeated_read_paths && e.repeated_read_paths.length).flatMap((e) => e.repeated_read_paths);
// HÍVÁSONKÉNTI LEFEDÉS (R73 §2): Δ = előző kimenet (mért usage) + események becsült tokenje (bájt/4, BECSLÉS) + megmagyarázatlan
const coverage = rows.map((r, i) => {
  const bucket = r.sorszam === 1 ? 'az 1. hívás előtt' : `a(z) ${r.sorszam - 1}. és ${r.sorszam}. hívás között`;
  const ev = events.filter((e) => e.bucket === bucket);
  const evBytes = ev.reduce((s, e) => s + (e.result_bytes ?? e.bytes ?? e.text_bytes ?? 0), 0);
  const attByType = {}; for (const e of ev.filter((e) => e.kind === 'attachment')) attByType[e.attachment_type] = (attByType[e.attachment_type] || 0) + e.bytes;
  const prevOut = i ? rows[i - 1].output : 0; const est = Math.round(evBytes / 4);
  return { sorszam: r.sorszam, delta_input_sum: r.delta_input_sum, prev_output_tokens_measured: prevOut, event_bytes: evBytes, tool_result_bytes: ev.filter((e) => e.kind === 'tool_result').reduce((s, e) => s + e.result_bytes, 0), attachment_bytes_by_type: attByType, estimated_event_tokens_B4: est, unexplained: r.delta_input_sum === null ? null : r.delta_input_sum - prevOut - est, bash_unknown: ev.filter((e) => e.bash_unknown).length };
});
const covTotal = { growth: rows.length ? rows[rows.length - 1].input_sum - rows[0].input_sum : 0, prev_outputs_measured: coverage.reduce((s, c) => s + c.prev_output_tokens_measured, 0), estimated_event_tokens_B4: coverage.slice(1).reduce((s, c) => s + c.estimated_event_tokens_B4, 0), bash_unknown: coverage.reduce((s, c) => s + c.bash_unknown, 0) };
covTotal.unexplained = covTotal.growth - covTotal.prev_outputs_measured - covTotal.estimated_event_tokens_B4;
covTotal.note = 'a becslés bájt/4 — magyar és kód-szöveg tokenaránya ettől eltérhet; a megmagyarázatlan rész a becslési hiba ÉS a nem tárolt tényezők együtt, nem nulla';
const blockTotals = { thinking: { db: 0, bytes: 0 }, text: { db: 0, bytes: 0 }, tool_use: { db: 0, bytes: 0 }, other: { db: 0, bytes: 0 } };
for (const r of rows) for (const k of Object.keys(blockTotals)) { blockTotals[k].db += r.blocks[k].db; blockTotals[k].bytes += r.blocks[k].bytes; }
const self = readFileSync(fileURLToPath(import.meta.url));
const out = {
  export: 'V3_R71_FOGYASZTAS_EXPORT — egyszeri, célzott, tartalom nélküli (R71)',
  generated_at: new Date().toISOString(), session, window: { from: flag('--from'), to: flag('--to') },
  source: { path: file.replace(homedir(), '~'), bytes_now: Buffer.byteLength(raw, 'utf8'), sha256_now: sha(raw), lines: lines.length, note: 'az átirat az export idejéig bővülhetett — a teljes fájl-hash jogosan tér el a korábbi pillanatképétől; az ablak zárt' },
  exporter: { file: 'tools/v3_fogyasztas_export.mjs', sha256: sha(self), meter: 'FGY-01/3 (callOf · dedupe · inWindow · triggerOf)' },
  mit_nem_tartalmaz: 'parancsszöveg · argumentum · felhasználói szöveg · eszközválasz-tartalom · rendszer-utasítás szövege · tokenbontás bájtból',
  bajt_nem_token: 'a blokk-bájtok UTF-8 méretek; tokent csak a usage-mezők hordoznak; a rejtett gondolkodás hiánya nem nulla',
  calls: rows, events, startup: { before_first_call: startup, instructions_sections: startupSections, attachment_types_whole_window: attachmentTypes, note: 'csak az átiratban tárolt jelenlét/méret/hash; ami nincs az átiratban (pl. a rendszer-utasítás, az eszközleírások), az ISMERETLEN, nem nulla' },
  compare_with_leltar: compare,
  per_call_coverage: coverage, coverage_total: covTotal,
  summary: { first_input_sum: rows[0] ? rows[0].input_sum : null, last_input_sum: rows.length ? rows[rows.length - 1].input_sum : null, max_input_sum: Math.max(0, ...rows.map((r) => r.input_sum)), top5_increases: top5, repeated_identical_result_bytes: repeatedResultBytes, repeated_identical_result_count: events.filter((e) => e.kind === 'tool_result' && e.repeated_identical_result).length, repeated_path_reads: repeatedPathReads, output_blocks: blockTotals, tool_use_by_name: events.filter((e) => e.kind === 'tool_use').reduce((m, e) => (m[e.tool] = (m[e.tool] || 0) + 1, m), {}), tool_result_bytes_total: events.filter((e) => e.kind === 'tool_result').reduce((s, e) => s + e.result_bytes, 0), note: 'időbeli együttjárás nem okozati token-hozzárendelés' },
};
// TARTALOM-ŐR: hosszú szöveg és tiltott mezőnév nem mehet ki
const FORBIDDEN = new Set(['command', 'content', 'text', 'thinking', 'stdout', 'stderr', 'description', 'input']);
(function guard(v, path) {
  if (Array.isArray(v)) return v.forEach((x, i) => guard(x, `${path}[${i}]`));
  if (v && typeof v === 'object') return Object.entries(v).forEach(([k, x]) => { if (FORBIDDEN.has(k) && typeof x === 'string') throw new Error(`tiltott szöveges mező: ${path}.${k}`); guard(x, `${path}.${k}`); });
  if (typeof v === 'string' && v.length > 200) throw new Error(`túl hosszú szöveg: ${path}`);
})(out, 'export');
const base = flag('--out') || join(ROOT, 'docs', '70_PLANNING', 'V3_R71_FOGYASZTAS_EXPORT');
writeFileSync(`${base}.json`, `${JSON.stringify(out, null, 1)}\n`);
writeFileSync(`${base}.csv`, ['sorszam,message_id,at,model,input,cache_write,cache_read,output,input_sum,delta_input_sum,thinking_db,thinking_bytes,text_db,text_bytes,tool_use_db,tool_use_bytes', ...rows.map((r) => [r.sorszam, r.message_id, r.at, r.model, r.input, r.cache_write, r.cache_read, r.output, r.input_sum, r.delta_input_sum ?? '', r.blocks.thinking.db, r.blocks.thinking.bytes, r.blocks.text.db, r.blocks.text.bytes, r.blocks.tool_use.db, r.blocks.tool_use.bytes].join(','))].join('\n') + '\n');
console.log(JSON.stringify({ calls: rows.length, first: out.summary.first_input_sum, last: out.summary.last_input_sum, max: out.summary.max_input_sum, compare: compare.status, top5: top5.map((t) => `${t.sorszam}:+${t.delta_input_sum} (${t.events_before.map((e) => `${e.kind}${e.tool ? ':' + e.tool : ''}${e.path ? ' ' + e.path : ''} ${e.bytes ?? ''}B${e.repeated ? ' ISM' : ''}`).join(' | ')})`), repeated_result_bytes: repeatedResultBytes, repeated_paths: repeatedPathReads, blocks: blockTotals, tools: out.summary.tool_use_by_name, tool_result_bytes: out.summary.tool_result_bytes_total, startup: startup.map((e) => `${e.kind}${e.attachment_type ? ':' + e.attachment_type : ''}${e.filename ? ' ' + e.filename : ''}${e.trigger ? ' ' + e.trigger : ''} ${e.bytes ?? e.text_bytes ?? ''}B`), attachments: attachmentTypes, cost_state: events.filter((e) => e.kind === 'cost-state').map((e) => ({ usd: e.total_cost_usd, mu: e.model_usage && Object.keys(e.model_usage) })) }, null, 1));
