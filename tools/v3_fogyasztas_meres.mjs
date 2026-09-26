#!/usr/bin/env node
// tools/v3_fogyasztas_meres.mjs — FOGYASZTÁSMÉRŐ (FGY-01, R65 §5 · javítva R67 F67-01/F67-02).
//
// MIT MÉR. A Claude Code munkamenet ÁTIRATAIBÓL (~/.claude/projects/<projekt>/<session>.jsonl és a
// <session>/ mappa al-ügynök/workflow átiratai) a MODELLHÍVÁSOK token-számlálóit: friss bemenet ·
// cache-írás · cache-olvasás · kimenet. Szereplőnként (fő szál · workflow-ügynök · önálló ügynök),
// modellenként, időablakra; a fő szál kontextusának mediánja és maximuma (kontextus = friss bemenet +
// cache-írás + cache-olvasás egy híváson); és a FŐ SZÁL ébresztés-bontása (mi indította a hívást).
//
// A REKORD-SZEMANTIKA MÉRVE, NEM FELTÉTELEZVE (R67 F67-01): egy modellhívás (üzenet-azonosító) az
// átiratban TÖBB sorban áll, tartalom-blokkonként (thinking · tool_use · text), és a sorok usage-mezője
// KUMULATÍV: a friss bemenet és a két cache-mező végig azonos, a kimenet a sorokon NŐ, az UTOLSÓ sor
// hordozza a teljes kimenetet. Ebben a munkamenetben 667 többsoros azonosítóból 667 ilyen, 0 kivétel;
// ugyanaz az azonosító KÉT FÁJLBAN egyszer sem fordult elő (0/1666). Ezért: egy hívás = egy (fájl,
// azonosító) pár, az értéke az UTOLSÓ rekord; a fájlok közti azonos azonosítót a jelentés NEVEZETTEN
// számolja (`cross_file_duplicate_ids`), és ha nem nulla, a lefedettség nem „teljes".
//
// AMIT NEM MÉR, KIMONDVA: nem dollár, nem a felület „Usage" számlálója, nem az API számlája. A hiány
// NEVEZETT, nem nulla (KUKA-093/094): nem olvasható átirat · usage-mezős, de nem értelmezhető sor ·
// usage nélküli modell-válasz · hiányos usage (nem mind a négy mező) · érvénytelen időbélyeg ·
// szintetikus (nem modell) rekord — mind külön számláló, és bármelyik nem-nulla ⇒ „HIÁNYOS".
//
// TARTALOMMENTES: a jelentésbe üzenet-szöveg, parancs, eszköz-kimenet nem kerül — számok, azonosítók,
// időbélyegek, és a bemeneti fájlok manifesztje (út `~`-val, bájt, sha256).
//
// HASZNÁLAT:
//   node tools/v3_fogyasztas_meres.mjs --session <id|auto> --from <ISO> [--to <ISO>] [--projects <dir>]
//                                      [--json <ki>] [--label <ablak neve>] [--quick]
//   node tools/v3_fogyasztas_meres.mjs --selftest
// `--session auto` (R69 F69-03) = CSAK egyértelmű kötésnél: a futó folyamat SAJÁT munkamenet-azonosítója
// (`CLAUDE_CODE_SESSION_ID`), ha ahhoz van átirat — a „legutóbb módosult fájl" NEM bizonyítja, hogy az a
// futó munkamenet, ezért az nem választó többé. `--from` = a CSOMAG KEZDŐ HATÁRA (a parancs board-időbélyege),
// `--quick`-nél KÖTELEZŐ: a jelző a csomagra szól, nem a múlt ablakaira. `--quick` = egy soros kiírás, fájl
// nélkül (munka közbeni ellenőrzési pont — modellhívás nélkül). Kilépés: 0 rendben · 1 küszöb átlépve VAGY
// NEM ELDÖNTHETŐ (hiányos megfigyelés — nem „kereten belül") · 2 nincs mérhető átirat / hibás határ /
// nem köthető munkamenet · 3 ellenpróba bukott.
import { readdirSync, readFileSync, statSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const require = createRequire(import.meta.url);
const { artifactPath } = require('../contracts/artifactNaming.js');
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
export const TOOL_VERSION = 'FGY-01/3';
const USAGE_FIELDS = ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens'];

// KÍSÉRLETI KÜSZÖBÖK (R65 §5): jelzők, nem tilalmak — átlépésnél a koordinátor szűkít vagy indokol.
export const THRESHOLDS = Object.freeze({ main_context_median: 200_000, agent_input_per_package: 40_000_000 });

/** ISO-időbélyeg → epoch ms, vagy null ha érvénytelen. Az összehasonlítás SZÁMON megy, nem szövegen. */
export function epochOf(s) {
  if (typeof s !== 'string' || !s.trim()) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

/** Egy átirat-sor → rekord VAGY null. Tiszta, próbálható. A hiány NEVEZETT, nem nulla. */
export function callOf(line, file, kind) {
  let d;
  try { d = JSON.parse(line); } catch { return null; }
  const m = d && d.message;
  if (!m || typeof m !== 'object') return null;
  const isAssistant = d.type === 'assistant' || (d.type === undefined && m.usage);
  if (!isAssistant) return null;
  const u = m.usage;
  const model = m.model || null;
  const synthetic = model === '<synthetic>';
  if (!u || typeof u !== 'object') {
    return { file, kind, id: m.id || null, model, ts: d.timestamp || null, epoch: epochOf(d.timestamp), agent: d.agentId || null, version: d.version || null, synthetic, no_usage: true };
  }
  const missing = USAGE_FIELDS.filter((f) => !(typeof u[f] === 'number' && Number.isFinite(u[f])));
  const n = (f) => (typeof u[f] === 'number' && Number.isFinite(u[f]) ? u[f] : 0);
  return {
    file, kind, id: m.id || null, model, ts: d.timestamp || null, epoch: epochOf(d.timestamp), agent: d.agentId || null, version: d.version || null,
    synthetic, no_usage: false, missing_fields: missing,
    input: n('input_tokens'), cache_write: n('cache_creation_input_tokens'), cache_read: n('cache_read_input_tokens'), output: n('output_tokens'),
  };
}

/** Rekordok → hívások: (fájl, azonosító) páronként az UTOLSÓ rekord (kumulatív kimenet — mérve). */
export function dedupe(records) {
  const byKey = new Map();
  for (const c of records) {
    if (c.no_usage) continue;
    const key = `${c.file}::${c.id || 'no-id:' + c.ts}`;
    const prev = byKey.get(key);
    if (prev && prev.trigger_start) c.trigger_start = true; // az ébresztés kezdete az ELSŐ rekordon áll, a hívás az utolsón
    byKey.set(key, c); // az utolsó nyer: a kimenet a sorokon nő, az utolsó a teljes
  }
  return [...byKey.values()];
}

/** Azonos azonosító KÜLÖNBÖZŐ fájlokban — a mért formátumban nincs ilyen; ha lesz, a jelentés kimondja. */
export function crossFileDuplicates(calls) {
  const files = new Map();
  for (const c of calls) { if (!c.id) continue; if (!files.has(c.id)) files.set(c.id, new Set()); files.get(c.id).add(c.file); }
  return [...files.entries()].filter(([, s]) => s.size > 1).map(([id]) => id);
}

/** Ablak-határok: érvénytelen szöveg NEVEZETT hiba (nem néma kizárás). */
export function windowOf(from, to) {
  const f = from ? epochOf(from) : null; const t = to ? epochOf(to) : null;
  if (from && f === null) throw new Error(`hibás ablak-határ (--from): ${from}`);
  if (to && t === null) throw new Error(`hibás ablak-határ (--to): ${to}`);
  if (f !== null && t !== null && f >= t) throw new Error(`üres ablak: --from (${from}) nem korábbi a --to (${to}) határnál`);
  return { from: f, to: t };
}

/** Időablak: inkluzív alul, exkluzív felül, EPOCH-on; idézett régi kör nem módosítja (csak a hívás ideje számít). */
export function inWindow(c, from, to) {
  const w = (typeof from === 'object' && from !== null) ? from : windowOf(from, to);
  if (c.epoch === null || c.epoch === undefined) return false;
  if (w.from !== null && c.epoch < w.from) return false;
  if (w.to !== null && c.epoch >= w.to) return false;
  return true;
}

export function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b); const h = Math.floor(s.length / 2);
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}

/** A fő szál ébresztés-bontása: minden hívás PONTOSAN EGY megelőző indítóhoz tartozik (átfedés kizárva). */
export function triggerOf(line) {
  let d; try { d = JSON.parse(line); } catch { return null; }
  if (!d || d.type !== 'user') return null;
  const c = d.message && d.message.content;
  if (Array.isArray(c) && c.some((x) => x && x.type === 'tool_result')) return null; // eszköz-eredmény: ugyanaz a menet folytatódik
  const txt = typeof c === 'string' ? c : Array.isArray(c) ? c.filter((x) => x && x.type === 'text').map((x) => x.text || '').join('\n') : '';
  if (/^Stop hook feedback:/m.test(txt)) return 'hook';
  if (/<task-notification>|SYSTEM NOTIFICATION - NOT USER INPUT|<agent-message /.test(txt)) return 'notification';
  if (/^This session is being continued from a previous conversation/.test(txt)) return 'compaction';
  // A felhasználói menet KÍSÉRŐ sorai (beszúrt skill-szöveg, /parancs visszhangja, rendszer-emlékeztető)
  // NEM új ébresztések — ugyanahhoz a menethez tartoznak, ezért az indítót nem írják át (mérve: az R63
  // parancs után három ilyen sor állt, és a régi alak a parancs hívásait „system"-nek könyvelte).
  if (d.isMeta || /^<(local-command|command-|system-reminder)/.test(txt)) return null;
  return 'user';
}

export function summarize(calls) {
  const real = calls.filter((c) => !c.synthetic);
  const by = (keyf) => {
    const m = new Map();
    for (const c of real) {
      const k = keyf(c); const a = m.get(k) || { calls: 0, input: 0, cache_write: 0, cache_read: 0, output: 0 };
      a.calls += 1; a.input += c.input; a.cache_write += c.cache_write; a.cache_read += c.cache_read; a.output += c.output;
      m.set(k, a);
    }
    return Object.fromEntries([...m.entries()].sort((x, y) => (y[1].cache_read + y[1].cache_write) - (x[1].cache_read + x[1].cache_write)));
  };
  const main = real.filter((c) => c.kind === 'main');
  const ctx = main.map((c) => c.input + c.cache_write + c.cache_read);
  const agents = real.filter((c) => c.kind !== 'main');
  const agentInput = agents.reduce((s, c) => s + c.input + c.cache_write + c.cache_read, 0);
  const ts = real.map((c) => c.ts).filter(Boolean).sort();
  const tot = (f) => real.reduce((s, c) => s + c[f], 0);
  const trig = {};
  for (const c of main) {
    const k = c.trigger || 'ismeretlen'; const a = trig[k] || { wakeups: 0, calls: 0, input_with_cache: 0 };
    a.calls += 1; a.input_with_cache += c.input + c.cache_write + c.cache_read; trig[k] = a;
  }
  for (const c of main) if (c.trigger_start) trig[c.trigger].wakeups += 1;
  const incomplete = real.filter((c) => c.missing_fields && c.missing_fields.length).length;
  return {
    calls: real.length, synthetic_records: calls.length - real.length,
    incomplete_usage_calls: incomplete,
    // R69 F69-03: hiányos usage mellett az összeg NEM „az összes", hanem az ISMERT RÉSZÖSSZEG — a hiányzó
    // mező nem nulla, csak nem számolható; a kijelzés ezt a nevet viszi, nem a számot mutatja teljesnek.
    totals_kind: incomplete ? 'ismert_reszosszeg' : 'teljes',
    first_call: ts[0] || null, last_call: ts[ts.length - 1] || null,
    totals: { input: tot('input'), cache_write: tot('cache_write'), cache_read: tot('cache_read'), output: tot('output') },
    by_kind: by((c) => c.kind), by_model: by((c) => c.model || 'ismeretlen'),
    main_context: { median: median(ctx), max: ctx.length ? Math.max(...ctx) : null, calls_over_400k: ctx.filter((x) => x > 400_000).length },
    main_wakeups: trig,
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

/** `--session auto`: a legutóbb módosult fő-átirat (a futó munkamenet). */
export function latestSession(projectsDir) {
  let best = null;
  for (const proj of readdirSync(projectsDir, { withFileTypes: true })) {
    if (!proj.isDirectory()) continue;
    const base = join(projectsDir, proj.name);
    for (const e of readdirSync(base, { withFileTypes: true })) {
      if (!e.isFile() || !e.name.endsWith('.jsonl')) continue;
      const m = statSync(join(base, e.name)).mtimeMs;
      if (!best || m > best.mtime) best = { session: e.name.replace(/\.jsonl$/, ''), mtime: m };
    }
  }
  return best ? best.session : null;
}

function toolCommit() {
  try { return execSync('git rev-parse HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return null; }
}
/** R69 F69-02: a commit nem elég — az ESZKÖZFÁJL lenyomata és a piszkos állapota is a jelentésé. */
export function toolBinding() {
  const self = fileURLToPath(import.meta.url);
  const sha = createHash('sha256').update(readFileSync(self)).digest('hex');
  let dirty = null;
  try { dirty = execSync(`git status --porcelain -- ${JSON.stringify(self)}`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().length > 0; } catch { dirty = null; }
  return { tool_file: self.replace(ROOT, '.'), tool_file_sha256: sha, tool_dirty: dirty };
}
/** `--session auto` egyértelmű kötése: a futó folyamat saját azonosítója, ha van hozzá átirat. */
export function boundSession(projectsDir, env = process.env) {
  const id = String(env.CLAUDE_CODE_SESSION_ID || '').trim();
  if (!id) return { session: null, basis: null, why: 'nincs CLAUDE_CODE_SESSION_ID a környezetben — a munkamenet nem köthető automatikusan' };
  const files = transcriptsOf(projectsDir, id);
  if (!files.some((f) => f.kind === 'main')) return { session: null, basis: null, why: `a környezet ${id.slice(0, 8)}… azonosítójához nincs fő-átirat a projects mappában` };
  return { session: id, basis: 'env:CLAUDE_CODE_SESSION_ID', why: null };
}

/**
 * TARTALOMMENTES HÍVÁS-SOROK (FGY-02, R93 F93-04/5 — a külső ellenőrző fél kérése).
 *
 * MIÉRT KELL. Az R91-es összesítőből a külső fél nem tudta újraszámolni sem a 411 976-os INDULÓ
 * értéket, sem a növekedés okait: az összeg egy szám, a NÖVEKEDÉS viszont a hívások SORRENDJÉBŐL
 * olvasható ki. Ezért a mérő mostantól hívásonként EGY SORT is tud adni — és abban SEMMILYEN
 * tartalom nincs: se üzenet, se parancs, se eszköz-kimenet. Csak sorszám · idő · szereplő · modell ·
 * a négy számláló · a kontextus összege · az ébresztés fajtája.
 *
 * ÍGY A NAPLÓ NEM KERÜL MODELL-KONTEXTUSBA (a külső fél kikötése): a fájlt egy helyi szkript írja,
 * és a másik fél MAGA nézi meg — az ügynöknek nem kell beolvasnia.
 */
export function callRows(calls) {
  return calls.filter((c) => !c.synthetic).sort((a, b) => (a.epoch ?? 0) - (b.epoch ?? 0)).map((c, i) => ({
    n: i + 1,
    ts: c.ts || null,
    kind: c.kind,                         // main | agent
    agent: c.agent || null,
    model: c.model || null,
    input: c.input, cache_write: c.cache_write, cache_read: c.cache_read, output: c.output,
    context: c.input + c.cache_write + c.cache_read,
    trigger: c.trigger || null,
    incomplete: Boolean(c.missing_fields && c.missing_fields.length),
  }));
}

export function measure({ projectsDir, session, from, to, label, withCalls = false }) {
  const w = windowOf(from, to);
  const files = transcriptsOf(projectsDir, session);
  const records = []; const manifest = []; const unreadable = []; const versions = new Set();
  let unparsed = 0; let noUsage = 0; let badTs = 0;
  for (const f of files) {
    let text;
    try { text = readFileSync(f.path, 'utf8'); } catch (e) { unreadable.push({ path: f.path.replace(homedir(), '~'), why: String(e && e.message) }); continue; }
    manifest.push({ path: f.path.replace(homedir(), '~'), bytes: Buffer.byteLength(text, 'utf8'), sha256: createHash('sha256').update(text).digest('hex'), kind: f.kind });
    let trigger = null; let startPending = false;
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      if (f.kind === 'main') { const t = triggerOf(line); if (t) { trigger = t; startPending = true; } }
      let parsed = true; try { JSON.parse(line); } catch { parsed = false; }
      if (!parsed) { unparsed += 1; continue; } // nem értelmezhető sor: HIÁNY, nem néma átlépés
      const c = callOf(line, f.path, f.kind);
      if (!c) continue;
      if (c.version) versions.add(c.version);
      if (c.no_usage) { if (!c.synthetic) noUsage += 1; continue; }
      if (c.epoch === null) badTs += 1;
      if (f.kind === 'main') { c.trigger = trigger || 'nyitó'; if (startPending) { c.trigger_start = true; startPending = false; } }
      records.push(c);
    }
  }
  const all = dedupe(records);
  const cross = crossFileDuplicates(all);
  const win = all.filter((c) => inWindow(c, w));
  const gaps = [];
  if (unreadable.length) gaps.push(`${unreadable.length} nem olvasható átirat`);
  if (unparsed) gaps.push(`${unparsed} nem értelmezhető (nem JSON) sor`);
  if (noUsage) gaps.push(`${noUsage} usage nélküli modell-válasz`);
  if (badTs) gaps.push(`${badTs} hívás érvénytelen időbélyeggel (ablakba nem sorolható)`);
  if (cross.length) gaps.push(`${cross.length} azonosító több fájlban (a fájlonkénti számlálás ezeket kétszer venné)`);
  const incomplete = all.filter((c) => c.missing_fields && c.missing_fields.length).length;
  if (incomplete) gaps.push(`${incomplete} hívás hiányos usage-mezővel (a hiányzó mező nem nulla, csak nem számolható)`);
  const generatedAt = new Date().toISOString();
  return {
    tool: TOOL_VERSION, tool_commit: toolCommit(), ...toolBinding(), generated_at: generatedAt, session,
    // A NYITOTT ABLAK ZÁRÓ PILLANATKÉPE (R69 F69-02): amit a mérés látott, az a generálás pillanatáig tart —
    // az ismétléshez ez a záró határ, nem a „…".
    snapshot_closed_at: generatedAt,
    runtime_versions: [...versions].sort(),
    window: { label: label || null, from: from || null, to: to || null, to_effective: to || generatedAt },
    coverage: {
      files: files.length, unreadable, unparsable_lines: unparsed, assistant_without_usage: noUsage, invalid_timestamp_calls: badTs,
      cross_file_duplicate_ids: cross.length, incomplete_usage_calls: incomplete, synthetic_records: all.length - all.filter((c) => !c.synthetic).length,
      calls_total: all.filter((c) => !c.synthetic).length, calls_in_window: win.filter((c) => !c.synthetic).length,
      complete: gaps.length === 0, note: gaps.length ? `HIÁNYOS: ${gaps.join(' · ')}` : 'teljes: minden megtalált átirat beolvasva, minden modell-válasz usage-dzsal, azonos azonosító csak egy fájlban',
    },
    whole_session: summarize(all), window_summary: summarize(win),
    // A HÍVÁS-SOROK CSAK KÉRÉSRE (a jelentés különben feleslegesen nagy lenne).
    ...(withCalls ? { window_calls: callRows(win) } : {}),
    // A KÜSZÖB CSAK TELJES MEGFIGYELÉSEN DÖNTHETŐ EL (R69 F69-03): hiányos lefedettségből nem következik
    // „kereten belül" — az átlépés IGEN mondható (ami látszik, az már túl van), a „rendben" NEM.
    thresholds_decidable: gaps.length === 0,
    input_manifest: manifest,
    reproduce: `node tools/v3_fogyasztas_meres.mjs --session ${session}${from ? ` --from ${from}` : ''} --to ${to || generatedAt}${label ? ` --label ${JSON.stringify(label)}` : ''} --projects ${projectsDir.replace(homedir(), '~')}`,
  };
}

// ── ELLENPRÓBÁK (R65 §5 + R67 F67-01) ────────────────────────────────────────────────────────────
export function selftest() {
  const results = [];
  const ok = (id, pass, why) => results.push({ id, pass: !!pass, why });
  const L = (id, ts, usage, extra = {}) => JSON.stringify({ type: 'assistant', timestamp: ts, message: { id, model: 'm', usage }, ...extra });
  const U = (i, w, r, o) => ({ input_tokens: i, cache_creation_input_tokens: w, cache_read_input_tokens: r, output_tokens: o });
  // (1) ismételt/streamelt rekord egyszer számít
  const c1 = dedupe([callOf(L('msg1', '2026-01-01T00:00:00Z', U(1, 2, 3, 4)), 'f', 'main'), callOf(L('msg1', '2026-01-01T00:00:00Z', U(1, 2, 3, 4)), 'f', 'main')]);
  ok('FGY-T1 ismételt rekord nem duplázódik', c1.length === 1 && c1[0].cache_read === 3);
  // (2) két KÜLÖNBÖZŐ hívás megmarad
  const c2 = dedupe([callOf(L('a', '2026-01-01T00:00:00Z', U(1, 0, 0, 1)), 'f', 'main'), callOf(L('b', '2026-01-01T00:00:01Z', U(1, 0, 0, 1)), 'f', 'main')]);
  ok('FGY-T2 köztes usage megmarad', c2.length === 2);
  // (3) az ablak a hívás IDEJÉN áll — idézett régi kör nem módosítja (a szöveget a mérő nem olvassa)
  const old = callOf(L('c', '2025-12-31T23:59:59Z', U(1, 0, 0, 1), { quoted_round: 'R1' }), 'f', 'main');
  ok('FGY-T3 idézett régi kör nem kerül az ablakba', !inWindow(old, '2026-01-01T00:00:00Z', null) && inWindow(c2[0], '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z'));
  // (4) hibás JSON nem hívás; usage nélküli modell-válasz NEM hívás, de HIÁNYKÉNT jelenik meg
  const nu = callOf('{"type":"assistant","message":{"id":"x","model":"m"}}', 'f', 'main');
  ok('FGY-T4 usage nélküli sor hiány, hibás sor nem hívás', callOf('nem json', 'f', 'main') === null && nu && nu.no_usage === true && dedupe([nu]).length === 0);
  // (5) idegen session kizárva, saját al-ügynök benne — a VALÓDI mappa-rendben
  const tmp = join(ROOT, 'var', 'tmp', 'fgy_selftest'); const proj = join(tmp, 'p', 'proj');
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(join(proj, 'S1'), { recursive: true });
  writeFileSync(join(proj, 'S1.jsonl'), L('m', '2026-01-01T00:00:00Z', U(1, 0, 5, 1)) + '\n');
  writeFileSync(join(proj, 'S2.jsonl'), L('m', '2026-01-01T00:00:00Z', U(1, 0, 7, 1)) + '\n');
  writeFileSync(join(proj, 'S1', 'agent-a.jsonl'), L('n', '2026-01-01T00:00:00Z', U(1, 0, 9, 1), { agentId: 'a' }) + '\n');
  const r = measure({ projectsDir: join(tmp, 'p'), session: 'S1' });
  ok('FGY-T5 idegen session kizárva, saját al-ügynök benne', r.coverage.files === 2 && r.whole_session.calls === 2 && r.whole_session.by_kind.main.cache_read === 5 && r.whole_session.agent_input_total === 10 && r.coverage.complete === true);
  ok('FGY-T6 medián', median([3, 1, 2]) === 2 && median([1, 2, 3, 4]) === 2.5 && median([]) === null);
  const s = summarize([{ kind: 'main', input: 0, cache_write: 0, cache_read: 250_000, output: 1, ts: 't', model: 'm' }]);
  ok('FGY-T7 küszöb átlépése jelez', s.thresholds.main_context_median.exceeded === true);
  // (8) R67: KUMULATÍV streamelt rekord — az UTOLSÓ kimenet marad meg, nem az első (1 → 100 ⇒ 100)
  const c8 = dedupe([callOf(L('s', '2026-01-01T00:00:00Z', U(10, 0, 0, 1)), 'f', 'main'), callOf(L('s', '2026-01-01T00:00:01Z', U(10, 0, 0, 100)), 'f', 'main')]);
  ok('FGY-T8 kumulatív rekord: a végső usage marad meg', c8.length === 1 && c8[0].output === 100 && c8[0].input === 10);
  // (9) R67: időzóna-eltolásos időbélyeg IDŐPONTKÉNT hasonlít (12:00+02:00 = 10:00Z, benne a [09:59Z,10:01Z) ablakban)
  const c9 = callOf(L('z', '2026-09-20T12:00:00+02:00', U(1, 0, 0, 1)), 'f', 'main');
  let badBoundary = false; try { windowOf('nem-idő', null); } catch { badBoundary = true; }
  ok('FGY-T9 időzóna és hibás határ', inWindow(c9, '2026-09-20T09:59:00Z', '2026-09-20T10:01:00Z') && badBoundary);
  // (10) R67: üres/hiányos usage NEM néma nulla — hiányként számol; szintetikus rekord nem valódi hívás
  const c10 = callOf(L('e', '2026-01-01T00:00:00Z', {}), 'f', 'main');
  const syn = callOf(JSON.stringify({ type: 'assistant', timestamp: '2026-01-01T00:00:00Z', message: { id: 'sy', model: '<synthetic>', usage: U(0, 0, 0, 0) } }), 'f', 'main');
  const s10 = summarize([c10, syn]);
  ok('FGY-T10 hiányos usage hiány, szintetikus nem hívás', c10.missing_fields.length === 4 && s10.incomplete_usage_calls === 1 && s10.calls === 1 && s10.synthetic_records === 1);
  // (11) R67: nem értelmezhető usage-sor mellett a lefedettség NEM „teljes"
  writeFileSync(join(proj, 'S1.jsonl'), L('m', '2026-01-01T00:00:00Z', U(1, 0, 5, 1)) + '\n{"usage": törött\n');
  const r11 = measure({ projectsDir: join(tmp, 'p'), session: 'S1' });
  ok('FGY-T11 hibás sor ⇒ HIÁNYOS lefedettség', r11.coverage.unparsable_lines === 1 && r11.coverage.complete === false && /HIÁNYOS/.test(r11.coverage.note));
  // (12) R67: azonos azonosító két fájlban NEVEZETT (a mért formátumban nincs ilyen; ha lesz, nem néma)
  writeFileSync(join(proj, 'S1', 'agent-a.jsonl'), L('m', '2026-01-01T00:00:00Z', U(1, 0, 9, 1), { agentId: 'a' }) + '\n');
  writeFileSync(join(proj, 'S1.jsonl'), L('m', '2026-01-01T00:00:00Z', U(1, 0, 5, 1)) + '\n');
  const r12 = measure({ projectsDir: join(tmp, 'p'), session: 'S1' });
  ok('FGY-T12 azonos azonosító két fájlban kimondva', r12.coverage.cross_file_duplicate_ids === 1 && r12.coverage.complete === false);
  // (13) R67: a manifest bájtot mér, nem karaktert (többbájtos jel)
  writeFileSync(join(proj, 'S1.jsonl'), L('m', '2026-01-01T00:00:00Z', U(1, 0, 5, 1), { note: 'árvíztűrő' }) + '\n');
  writeFileSync(join(proj, 'S1', 'agent-a.jsonl'), L('n', '2026-01-01T00:00:00Z', U(1, 0, 9, 1), { agentId: 'a' }) + '\n');
  const r13 = measure({ projectsDir: join(tmp, 'p'), session: 'S1' });
  const mainEntry = r13.input_manifest.find((m) => m.kind === 'main');
  ok('FGY-T13 manifest bájt', mainEntry && mainEntry.bytes === Buffer.byteLength(readFileSync(join(proj, 'S1.jsonl'), 'utf8'), 'utf8') && mainEntry.bytes > readFileSync(join(proj, 'S1.jsonl'), 'utf8').length);
  // (14) R67: ébresztés-bontás — minden hívás egy indítóhoz, a hook és az értesítés külön, átfedés nélkül
  const Uu = (txt, meta) => JSON.stringify({ type: 'user', isMeta: !!meta, message: { content: [{ type: 'text', text: txt }] } });
  writeFileSync(join(proj, 'S1.jsonl'), [Uu('R1 parancs'), L('a1', '2026-01-01T00:00:00Z', U(1, 0, 5, 1)), Uu('Stop hook feedback:\n[x]: uncommitted', true), L('a2', '2026-01-01T00:00:01Z', U(1, 0, 5, 1)), L('a3', '2026-01-01T00:00:02Z', U(1, 0, 5, 1)), Uu('<task-notification>x</task-notification>'), L('a4', '2026-01-01T00:00:03Z', U(1, 0, 5, 1))].join('\n') + '\n');
  const r14 = measure({ projectsDir: join(tmp, 'p'), session: 'S1' }); const mw = r14.whole_session.main_wakeups;
  ok('FGY-T14 ébresztés-bontás átfedés nélkül', mw.user && mw.user.calls === 1 && mw.hook && mw.hook.calls === 2 && mw.hook.wakeups === 1 && mw.notification && mw.notification.calls === 1 && Object.values(mw).reduce((s, v) => s + v.calls, 0) === r14.whole_session.by_kind.main.calls);
  // (15) R69 F69-03: `--session auto` CSAK a futó folyamat saját azonosítójára köt — a legutóbb módosult fájl nem választó
  writeFileSync(join(proj, 'S2.jsonl'), L('m', '2026-01-01T00:00:00Z', U(1, 0, 7, 1)) + '\n'); // S2 a legfrissebb fájl
  const b1 = boundSession(join(tmp, 'p'), { CLAUDE_CODE_SESSION_ID: 'S1' });
  const b2 = boundSession(join(tmp, 'p'), {});
  const b3 = boundSession(join(tmp, 'p'), { CLAUDE_CODE_SESSION_ID: 'nincs-ilyen' });
  ok('FGY-T15 auto = a saját azonosító, különben nevezett hiány', b1.session === 'S1' && b1.basis === 'env:CLAUDE_CODE_SESSION_ID' && b2.session === null && /CLAUDE_CODE_SESSION_ID/.test(b2.why) && b3.session === null && /nincs fő-átirat/.test(b3.why) && latestSession(join(tmp, 'p')) === 'S2');
  // (16) R69 F69-03: hiányos usage ⇒ az összeg ISMERT RÉSZÖSSZEG, nem „az összes"
  ok('FGY-T16 hiányos usage: ismert részösszeg', s10.totals_kind === 'ismert_reszosszeg' && summarize([c8[0]]).totals_kind === 'teljes');
  // (17) R69 F69-03: hiányos megfigyelésből nem következik „kereten belül" — a küszöb NEM ELDÖNTHETŐ, az átlépés viszont igen
  const r17 = measure({ projectsDir: join(tmp, 'p'), session: 'S1' }); // a T14 fájl: teljes lefedettség
  writeFileSync(join(proj, 'S1.jsonl'), L('a1', '2026-01-01T00:00:00Z', U(1, 0, 5, 1)) + '\n{"type":"assistant","message":{"id":"nu","model":"m"}}\n');
  const r17b = measure({ projectsDir: join(tmp, 'p'), session: 'S1' });
  const big = summarize([{ kind: 'main', input: 0, cache_write: 0, cache_read: 250_000, output: 1, ts: 't', model: 'm', missing_fields: ['output_tokens'] }]);
  ok('FGY-T17 hiányos megfigyelés: nem eldönthető, de az átlépés látszik', r17.thresholds_decidable === true && r17b.thresholds_decidable === false && r17b.coverage.complete === false && big.thresholds.main_context_median.exceeded === true && big.totals_kind === 'ismert_reszosszeg');
  /**
   * (18) R93 F93-04/5: A HÍVÁS-SOROK IDŐREND SZERINT ÁLLNAK, TARTALMAT NEM VISZNEK, ÉS A
   * SZINTETIKUS REKORD NEM HÍVÁS. Enélkül a másik fél nem tudja újraszámolni a növekedést.
   */
  const rowsIn = [
    { kind: 'main', ts: '2026-01-01T00:00:02Z', epoch: 2, model: 'm', input: 1, cache_write: 2, cache_read: 3, output: 4, trigger: 'nyitó' },
    { kind: 'main', ts: '2026-01-01T00:00:01Z', epoch: 1, model: 'm', input: 5, cache_write: 0, cache_read: 0, output: 1, trigger: 'nyitó' },
    { kind: 'main', ts: '2026-01-01T00:00:03Z', epoch: 3, model: '<synthetic>', synthetic: true, input: 9, cache_write: 9, cache_read: 9, output: 9 },
  ];
  const rows = callRows(rowsIn);
  /**
   * A TARTALOMMENTESSÉGET A KULCS-HALMAZ MÉRI, NEM SZÖVEG-MINTA. (A saját első alakom mintája a
   * „context" szóra illeszkedett a „text" miatt, és pirosat adott egy jó soron — KUKA-239: a
   * hatókör nélküli minta a szomszéd sort igazolja.) A zárt kulcs-lista viszont NEM téveszthető:
   * ha valaki új mezőt tesz a sorba, ez a próba PIROS lesz, amíg a mező nincs kimondva.
   */
  const ALLOWED = ['n', 'ts', 'kind', 'agent', 'model', 'input', 'cache_write', 'cache_read', 'output', 'context', 'trigger', 'incomplete'];
  const contentless = rows.every((r) => Object.keys(r).sort().join(',') === [...ALLOWED].sort().join(','));
  ok('FGY-T18 hívás-sorok: időrend · kontextus-összeg · zárt kulcs-lista · szintetikus kihagyva',
    rows.length === 2 && rows[0].n === 1 && rows[0].ts === '2026-01-01T00:00:01Z'
    && rows[0].context === 5 && rows[1].context === 6 && contentless
    && rows.every((r) => r.model !== '<synthetic>'));
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
  const projectsDir = flag('--projects') || join(homedir(), '.claude', 'projects');
  let session = flag('--session'); let sessionBasis = 'explicit';
  if (session === 'auto') {
    const b = boundSession(projectsDir);
    if (!b.session) { console.error(`--session auto: ${b.why}. Add meg explicit: --session <munkamenet-azonosító> (a ~/.claude/projects alatti átirat neve).`); process.exit(2); }
    session = b.session; sessionBasis = b.basis;
  }
  if (!session) { console.error('add meg: --session <munkamenet-azonosító|auto> (a ~/.claude/projects alatti átirat neve)'); process.exit(2); }
  if (process.argv.includes('--quick') && !flag('--from')) { console.error('--quick: add meg a CSOMAG KEZDŐ HATÁRÁT (--from <ISO>, a parancs board-időbélyege) — a jelző a csomagra szól, nem a teljes múltra.'); process.exit(2); }
  let rep;
  const callsOut = flag('--calls');
  try {
    rep = measure({
      projectsDir, session, from: flag('--from'), to: flag('--to'), label: flag('--label'),
      withCalls: Boolean(callsOut),
    });
  } catch (e) { console.error(`HIBA: ${e.message}`); process.exit(2); }
  if (!rep.coverage.files) { console.error(`nincs mérhető átirat ehhez a munkamenethez: ${session} (${projectsDir})`); process.exit(2); }
  const fmt = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('hu-HU'));
  const w = rep.window_summary; const a = rep.whole_session;
  const t = (rep.window.from || rep.window.to) ? w : a;
  const ex = Object.entries(t.thresholds).filter(([, v]) => v.exceeded);
  const decidable = rep.thresholds_decidable;
  const sumKind = t.totals_kind === 'ismert_reszosszeg' ? `ISMERT RÉSZÖSSZEG (${fmt(t.incomplete_usage_calls)} hívás hiányos usage-dzsal, az összes ISMERETLEN)` : 'teljes összeg';
  const thresholdWord = ex.length ? `KÜSZÖB ÁTLÉPVE: ${ex.map(([k, v]) => `${k} ${fmt(v.value)} > ${fmt(v.limit)}`).join(' · ')}` : (decidable ? 'küszöbök: rendben' : 'küszöb: NEM ELDÖNTHETŐ — hiányos megfigyelésből nem következik „kereten belül"');
  if (process.argv.includes('--quick')) {
    console.log(`FGY ${session.slice(0, 8)} (${sessionBasis}) · ablak ${rep.window.from || '…'} → ${rep.window.to || 'most'} · hívás ${fmt(t.calls)} · fő-szál kontextus medián ${fmt(t.main_context.median)} / max ${fmt(t.main_context.max)} · ügynök-bemenet ${fmt(t.agent_input_total)} (${t.agent_count} ügynök) · cache-olvasás ${fmt(t.totals.cache_read)} [${sumKind}] · lefedettség: ${rep.coverage.complete ? 'teljes' : rep.coverage.note} · ${thresholdWord}`);
    process.exit(ex.length || !decidable ? 1 : 0);
  }
  const out = flag('--json') || join(ROOT, artifactPath({ area: 'reports', kind: 'fogyasztas', ext: 'json', version: VERSION }));
  mkdirSync(dirname(out), { recursive: true });
  /**
   * A HÍVÁS-SOROK KÜLÖN FÁJLBA (FGY-02, R93 F93-04/5). Külön fájl, mert a fő jelentés így marad
   * olvasható méretű, és mert ezt a másik fél MAGA nézi meg — nem kerül modell-kontextusba.
   */
  if (callsOut) {
    const rows = rep.window_calls || [];
    delete rep.window_calls;
    mkdirSync(dirname(callsOut), { recursive: true });
    writeFileSync(callsOut, `${JSON.stringify({
      tool: TOOL_VERSION, session, window: rep.window, snapshot_closed_at: rep.snapshot_closed_at,
      coverage: rep.coverage, contentless: 'sorszám · idő · szereplő · modell · négy számláló · kontextus · ébresztés — üzenet, parancs és eszköz-kimenet NEM',
      calls: rows,
    }, null, 1)}\n`);
    console.log(`  hívás-sorok (tartalommentes, ${rows.length} sor): ${callsOut}`);
  }
  writeFileSync(out, `${JSON.stringify(rep, null, 1)}\n`);
  console.log(`FGY-01 — munkamenet ${session} (${sessionBasis}) · eszköz ${TOOL_VERSION}@${(rep.tool_commit || '').slice(0, 7)} (fájl ${rep.tool_file_sha256.slice(0, 12)}${rep.tool_dirty ? ', NEM KÖNYVELT változással' : rep.tool_dirty === false ? ', könyvelt' : ''}) · futtató ${rep.runtime_versions.join(', ') || 'ismeretlen'} · lefedettség: ${rep.coverage.note} (${rep.coverage.files} átirat, ${rep.coverage.calls_total} hívás)`);
  console.log(`  teljes munkamenet: ${a.first_call} → ${a.last_call} · hívás ${fmt(a.calls)} · friss bemenet ${fmt(a.totals.input)} · cache-írás ${fmt(a.totals.cache_write)} · cache-olvasás ${fmt(a.totals.cache_read)} · kimenet ${fmt(a.totals.output)} [${a.totals_kind === 'ismert_reszosszeg' ? 'ISMERT RÉSZÖSSZEG' : 'teljes összeg'}]`);
  if (rep.window.from || rep.window.to) console.log(`  ablak${rep.window.label ? ` „${rep.window.label}"` : ''} ${rep.window.from || '…'} → ${rep.window.to || `${rep.window.to_effective} (nyitott, a pillanatkép zárása)`}: hívás ${fmt(w.calls)} · cache-olvasás ${fmt(w.totals.cache_read)} · kimenet ${fmt(w.totals.output)} · ügynök-bemenet ${fmt(w.agent_input_total)} (${w.agent_count} ügynök) [${sumKind}]`);
  console.log(`  fő szál kontextus: medián ${fmt(t.main_context.median)} · max ${fmt(t.main_context.max)} · 400 ezer fölött ${fmt(t.main_context.calls_over_400k)} hívás`);
  const mw = Object.entries(t.main_wakeups).map(([k, v]) => `${k} ${v.wakeups}× → ${fmt(v.calls)} hívás / ${fmt(v.input_with_cache)}`).join(' · ');
  if (mw) console.log(`  fő szál ébresztések: ${mw}`);
  console.log(`  ${thresholdWord}${ex.length ? ' (kísérleti jelző)' : ''}`);
  console.log(`  jelentés: ${out}`);
  process.exit(ex.length || !decidable ? 1 : 0);
}
