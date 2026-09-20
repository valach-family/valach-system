#!/usr/bin/env node
// tools/v3_fogyasztas_meres.mjs — FOGYASZTÁSMÉRŐ (FGY-01, R65 §5).
//
// MIT MÉR. A Claude Code munkamenet ÁTIRATAIBÓL (~/.claude/projects/**/<session>.jsonl és az al-ügynökök
// átiratai) a MODELLHÍVÁSOK token-számlálóit: friss bemenet · cache-írás · cache-olvasás · kimenet,
// hívásonként, üzenet-azonosítóra DEDUPLIKÁLVA (egy hívás több sorban is megjelenhet, tartalom-blokkonként).
// Szereplőnként (fő szál · workflow-ügynök · önálló ügynök), modellenként és időablakra bontva; a fő szál
// kontextusának mediánja és maximuma (kontextus = friss bemenet + cache-írás + cache-olvasás egy híváson).
//
// AMIT NEM MÉR, KIMONDVA: nem dollár (árat nem hordoz), nem a felület „Usage" számlálója (annak időablaka
// és számlálási módja nem ismert), nem az API valódi számlája. A hiányzó lefedettség NEVEZETT: ha egy
// átirat nem olvasható vagy egy sorban nincs usage, azt a jelentés kiírja, nem nullának veszi (KUKA-093/094).
//
// TARTALOMMENTES: a jelentésbe egyetlen üzenet-szöveg, parancs vagy eszköz-kimenet sem kerül — csak számok,
// azonosítók, időbélyegek, és a bemeneti fájlok manifesztje (út · méret · sha256), hogy a mérés
// reprodukálható legyen a szöveg publikálása nélkül.
//
// HASZNÁLAT:
//   node tools/v3_fogyasztas_meres.mjs --session <id> [--from <ISO>] [--to <ISO>] [--projects <dir>] [--json <ki>]
//   node tools/v3_fogyasztas_meres.mjs --selftest        # az ellenpróbák (fixtúrán, átirat nélkül)
// A kimenet: var/reports/<generált név>.json (ART-01) + rövid összesítő a képernyőn. Kilépés: 0 rendben ·
// 1 küszöb átlépve (kísérleti jelző, nem tilalom) · 2 nincs mérhető átirat · 3 ellenpróba bukott.
import { readdirSync, readFileSync, statSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const require = createRequire(import.meta.url);
const { artifactPath } = require('../contracts/artifactNaming.js');
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
export const TOOL_VERSION = 'FGY-01/1';

// KÍSÉRLETI KÜSZÖBÖK (R65 §5): jelzők, nem tilalmak — átlépésnél a koordinátor szűkít vagy indokol.
export const THRESHOLDS = Object.freeze({ main_context_median: 200_000, agent_input_per_package: 40_000_000 });

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Egy átirat-sor → hívás-rekord VAGY null. Tiszta, próbálható. */
export function callOf(line, file, kind) {
  let d;
  try { d = JSON.parse(line); } catch { return null; }
  const m = d && d.message;
  if (!m || typeof m !== 'object' || !m.usage || typeof m.usage !== 'object') return null;
  const u = m.usage;
  return {
    file, kind, id: m.id || null, model: m.model || null, ts: d.timestamp || null, agent: d.agentId || null,
    input: num(u.input_tokens), cache_write: num(u.cache_creation_input_tokens),
    cache_read: num(u.cache_read_input_tokens), output: num(u.output_tokens),
  };
}

/** Sorok → deduplikált hívások (üzenet-azonosító + fájl kulccsal). A streamelt/ismételt rekord nem duplázódik. */
export function dedupe(calls) {
  const seen = new Set(); const out = [];
  for (const c of calls) {
    const key = `${c.file}::${c.id || 'no-id:' + c.ts}`;
    if (seen.has(key)) continue;
    seen.add(key); out.push(c);
  }
  return out;
}

/** Időablak-szűrés: a határ INKLUZÍV alul, exkluzív felül; idézett régi kör NEM módosítja (csak a hívás ts számít). */
export function inWindow(c, from, to) {
  if (!c.ts) return false;
  if (from && c.ts < from) return false;
  if (to && c.ts >= to) return false;
  return true;
}

export function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b); const h = Math.floor(s.length / 2);
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}

export function summarize(calls) {
  const by = (keyf) => {
    const m = new Map();
    for (const c of calls) {
      const k = keyf(c); const a = m.get(k) || { calls: 0, input: 0, cache_write: 0, cache_read: 0, output: 0 };
      a.calls += 1; a.input += c.input; a.cache_write += c.cache_write; a.cache_read += c.cache_read; a.output += c.output;
      m.set(k, a);
    }
    return Object.fromEntries([...m.entries()].sort((x, y) => (y[1].cache_read + y[1].cache_write) - (x[1].cache_read + x[1].cache_write)));
  };
  const main = calls.filter((c) => c.kind === 'main');
  const ctx = main.map((c) => c.input + c.cache_write + c.cache_read);
  const agents = calls.filter((c) => c.kind !== 'main');
  const agentInput = agents.reduce((s, c) => s + c.input + c.cache_write + c.cache_read, 0);
  const ts = calls.map((c) => c.ts).filter(Boolean).sort();
  return {
    calls: calls.length,
    first_call: ts[0] || null, last_call: ts[ts.length - 1] || null,
    by_kind: by((c) => c.kind), by_model: by((c) => c.model || 'ismeretlen'),
    main_context: { median: median(ctx), max: ctx.length ? Math.max(...ctx) : null, calls_over_400k: ctx.filter((x) => x > 400_000).length },
    agent_input_total: agentInput, agent_count: new Set(agents.map((c) => c.agent || c.file)).size,
    thresholds: {
      main_context_median: { limit: THRESHOLDS.main_context_median, value: median(ctx), exceeded: median(ctx) !== null && median(ctx) > THRESHOLDS.main_context_median },
      agent_input_per_package: { limit: THRESHOLDS.agent_input_per_package, value: agentInput, exceeded: agentInput > THRESHOLDS.agent_input_per_package },
    },
  };
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.isFile() && p.endsWith('.jsonl')) out.push(p);
  }
  return out;
}

/** A munkamenet átiratai: a fő szál (<session>.jsonl) és a <session>/ mappa al-ügynökei — IDEGEN session kizárva. */
export function transcriptsOf(projectsDir, session) {
  const files = [];
  for (const proj of readdirSync(projectsDir, { withFileTypes: true })) {
    if (!proj.isDirectory()) continue;
    const base = join(projectsDir, proj.name);
    const main = join(base, `${session}.jsonl`);
    if (existsSync(main)) files.push({ path: main, kind: 'main' });
    const sub = join(base, session);
    if (existsSync(sub) && statSync(sub).isDirectory()) {
      for (const f of walk(sub)) files.push({ path: f, kind: f.includes('/workflows/') ? 'workflow' : 'subagent' });
    }
  }
  return files;
}

export function measure({ projectsDir, session, from, to }) {
  const files = transcriptsOf(projectsDir, session);
  const calls = []; const manifest = []; const unreadable = []; let linesWithoutUsage = 0;
  for (const f of files) {
    let text;
    try { text = readFileSync(f.path, 'utf8'); } catch (e) { unreadable.push({ path: f.path, why: String(e && e.message) }); continue; }
    manifest.push({ path: f.path.replace(homedir(), '~'), bytes: text.length, sha256: createHash('sha256').update(text).digest('hex'), kind: f.kind });
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      const c = callOf(line, f.path, f.kind);
      if (c) calls.push(c); else if (line.includes('"usage"')) linesWithoutUsage += 1;
    }
  }
  const all = dedupe(calls);
  const win = all.filter((c) => inWindow(c, from, to));
  return {
    tool: TOOL_VERSION, generated_at: new Date().toISOString(), session, window: { from: from || null, to: to || null },
    coverage: { files: files.length, unreadable, lines_with_usage_but_unparsed: linesWithoutUsage, calls_total: all.length, calls_in_window: win.length,
      note: unreadable.length ? 'HIÁNYOS: nem olvasható átirat — a számok alulbecsülnek' : 'teljes: minden megtalált átirat beolvasva' },
    whole_session: summarize(all), window_summary: summarize(win),
    input_manifest: manifest,
    reproduce: `node tools/v3_fogyasztas_meres.mjs --session ${session}${from ? ` --from ${from}` : ''}${to ? ` --to ${to}` : ''}`,
  };
}

// ── ELLENPRÓBÁK (R65 §5): idegen session kizárva · idézett régi kör nem módosítja a határt · ismételt rekord nem duplázódik · köztes usage nem vész el ──
export function selftest() {
  const results = [];
  const ok = (id, pass, why) => results.push({ id, pass: !!pass, why });
  const L = (id, ts, usage, extra = {}) => JSON.stringify({ timestamp: ts, message: { id, model: 'm', usage }, ...extra });
  const U = (i, w, r, o) => ({ input_tokens: i, cache_creation_input_tokens: w, cache_read_input_tokens: r, output_tokens: o });
  // (1) ismételt/streamelt rekord (ugyanaz az üzenet-azonosító két sorban) egyszer számít
  const c1 = dedupe([callOf(L('msg1', '2026-01-01T00:00:00Z', U(1, 2, 3, 4)), 'f', 'main'), callOf(L('msg1', '2026-01-01T00:00:00Z', U(1, 2, 3, 4)), 'f', 'main')]);
  ok('FGY-T1 ismételt rekord nem duplázódik', c1.length === 1 && c1[0].cache_read === 3);
  // (2) két KÜLÖNBÖZŐ hívás megmarad (a köztes usage nem vész el)
  const c2 = dedupe([callOf(L('a', '2026-01-01T00:00:00Z', U(1, 0, 0, 1)), 'f', 'main'), callOf(L('b', '2026-01-01T00:00:01Z', U(1, 0, 0, 1)), 'f', 'main')]);
  ok('FGY-T2 köztes usage megmarad', c2.length === 2);
  // (3) az időablak a hívás időbélyegén áll — egy RÉGI kört idéző szöveg nem módosítja (a szöveg nem is olvasott)
  const old = callOf(L('c', '2025-12-31T23:59:59Z', U(1, 0, 0, 1), { quoted_round: 'R1' }), 'f', 'main');
  ok('FGY-T3 idézett régi kör nem kerül az ablakba', !inWindow(old, '2026-01-01T00:00:00Z', null) && inWindow(c2[0], '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z'));
  // (4) usage nélküli sor nem hívás; hibás JSON nem hívás
  ok('FGY-T4 usage nélküli és hibás sor nem hívás', callOf('{"message":{"id":"x"}}', 'f', 'main') === null && callOf('nem json', 'f', 'main') === null);
  // (5) idegen session kizárása: a fájl-választó csak a megadott session nevű fájlt/mappát veszi
  //     a valódi rend: <projects>/<projekt>/<session>.jsonl + <projects>/<projekt>/<session>/**.jsonl
  const tmp = join(ROOT, 'var', 'tmp', 'fgy_selftest'); const proj = join(tmp, 'p', 'proj');
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(join(proj, 'S1'), { recursive: true });
  writeFileSync(join(proj, 'S1.jsonl'), L('m', '2026-01-01T00:00:00Z', U(1, 0, 5, 1)) + '\n');
  writeFileSync(join(proj, 'S2.jsonl'), L('m', '2026-01-01T00:00:00Z', U(1, 0, 7, 1)) + '\n');
  writeFileSync(join(proj, 'S1', 'agent-a.jsonl'), L('n', '2026-01-01T00:00:00Z', U(1, 0, 9, 1), { agentId: 'a' }) + '\n');
  const r = measure({ projectsDir: join(tmp, 'p'), session: 'S1' });
  ok('FGY-T5 idegen session kizárva, saját al-ügynök benne', r.coverage.files === 2 && r.whole_session.calls === 2 && r.whole_session.by_kind.main.cache_read === 5 && r.whole_session.agent_input_total === 10);
  // (6) medián: páros és páratlan
  ok('FGY-T6 medián', median([3, 1, 2]) === 2 && median([1, 2, 3, 4]) === 2.5 && median([]) === null);
  // (7) a küszöb-jelző MÉRT értéken billen (nem a deklaráción)
  const s = summarize([{ kind: 'main', input: 0, cache_write: 0, cache_read: 250_000, output: 1, ts: 't', model: 'm' }]);
  ok('FGY-T7 küszöb átlépése jelez', s.thresholds.main_context_median.exceeded === true);
  return results;
}

function flag(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--selftest')) {
    const rs = selftest();
    for (const r of rs) console.log(`${r.pass ? 'ZÖLD' : 'PIROS'}  ${r.id}`);
    const bad = rs.filter((r) => !r.pass).length;
    console.log(`RESULT: ${rs.length - bad}/${rs.length} ellenpróba ZÖLD`);
    process.exit(bad ? 3 : 0);
  }
  const session = flag('--session');
  if (!session) { console.error('add meg: --session <munkamenet-azonosító> (a ~/.claude/projects alatti átirat neve)'); process.exit(2); }
  const projectsDir = flag('--projects') || join(homedir(), '.claude', 'projects');
  const rep = measure({ projectsDir, session, from: flag('--from'), to: flag('--to') });
  if (!rep.coverage.files) { console.error(`nincs mérhető átirat ehhez a munkamenethez: ${session} (${projectsDir})`); process.exit(2); }
  const out = flag('--json') || join(ROOT, artifactPath({ area: 'reports', kind: 'fogyasztas', ext: 'json', version: VERSION }));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(rep, null, 1)}\n`);
  const w = rep.window_summary; const a = rep.whole_session;
  const fmt = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('hu-HU'));
  console.log(`FGY-01 — munkamenet ${session} · eszköz ${TOOL_VERSION} · lefedettség: ${rep.coverage.note} (${rep.coverage.files} átirat, ${rep.coverage.calls_total} hívás)`);
  console.log(`  teljes munkamenet: ${a.first_call} → ${a.last_call} · hívás ${fmt(a.calls)} · friss bemenet ${fmt(sum(a.by_kind, 'input'))} · cache-írás ${fmt(sum(a.by_kind, 'cache_write'))} · cache-olvasás ${fmt(sum(a.by_kind, 'cache_read'))} · kimenet ${fmt(sum(a.by_kind, 'output'))}`);
  if (rep.window.from || rep.window.to) console.log(`  ablak ${rep.window.from || '…'} → ${rep.window.to || '…'}: hívás ${fmt(w.calls)} · cache-olvasás ${fmt(sum(w.by_kind, 'cache_read'))} · ügynök-bemenet ${fmt(w.agent_input_total)} (${w.agent_count} ügynök)`);
  const t = (rep.window.from || rep.window.to) ? w : a;
  console.log(`  fő szál kontextus: medián ${fmt(t.main_context.median)} · max ${fmt(t.main_context.max)} · 400 ezer fölött ${fmt(t.main_context.calls_over_400k)} hívás`);
  const ex = Object.entries(t.thresholds).filter(([, v]) => v.exceeded);
  console.log(ex.length ? `  KÜSZÖB ÁTLÉPVE (kísérleti jelző): ${ex.map(([k, v]) => `${k} ${fmt(v.value)} > ${fmt(v.limit)}`).join(' · ')}` : '  küszöbök: rendben');
  console.log(`  jelentés: ${out}`);
  process.exit(ex.length ? 1 : 0);
}
function sum(byKind, field) { return Object.values(byKind).reduce((s, v) => s + v[field], 0); }
