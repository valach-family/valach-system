#!/usr/bin/env node
// V3 — A SZÁLLÍTÁSI RÉTEG BIZONYÍTÉKA (PGB-05). `npm run proof:pg-bridge-transport`
//
// MIT MÉR, ÉS MIÉRT SZINTETIKUS SZOLGÁLTATÓVAL. Ez NEM PostgreSQL-próba: a híd SZÁLLÍTÁSI
// viselkedését méri — azt, hogy mi történik, ha a válasz KÉSIK, ha a kapcsolatfelvétel bukik, és
// hogy egy kérés megkaphatja-e MÁS kérés válaszát. Ehhez determinisztikus késleltetés kell, amit
// egy valódi adatbázissal nem lehet megbízhatóan előidézni (KUKA-120: a próbapad ne a saját
// versenyhelyzetét mérje). A VALÓDI PG-oldalt a többi bizonyító méri.
//
// A FORRÁS A KÜLSŐ ELLENŐRZŐ FÉL ESETE (R150 §2, F150-01). Az ő reprodukciójukat SZÓ SZERINT
// futtatjuk (T1–T2), és NEM írjuk át az elvárt értéket azért, hogy a híd zöld legyen — a mérce
// a VISELKEDÉS: egy kérés SOHA nem kaphatja meg másik kérés adatát.
import { mkdtempSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Elkülönített mappa a hídnak + egy szintetikus `pg` csomaggal. */
function sandbox(stub) {
  const dir = mkdtempSync(join(tmpdir(), 'pgbridge-proof-'));
  mkdirSync(join(dir, 'node_modules/pg'), { recursive: true });
  writeFileSync(join(dir, 'node_modules/pg/package.json'), '{"name":"pg","type":"module","exports":"./index.js"}');
  writeFileSync(join(dir, 'node_modules/pg/index.js'), stub);
  for (const f of ['pgBridge.mjs', 'pgBridgeWorker.mjs']) copyFileSync(join(ROOT, 'v3ref', f), join(dir, f));
  return dir;
}

function run(dir, script) {
  const f = join(dir, 'case.mjs');
  writeFileSync(f, script);
  try {
    return { ok: true, out: execFileSync(process.execPath, [f], { cwd: dir, encoding: 'utf8', timeout: 30000 }).trim() };
  } catch (e) {
    return { ok: false, out: String(e.stdout || '').trim(), err: String(e.stderr || '').slice(-300) };
  }
}

// A KÜLSŐ FÉL SZINTETIKUS SZOLGÁLTATÓJA — karakterre az R150 §2 szerint.
const LATE_STUB = `class Client {
  tail = Promise.resolve();
  async connect() {}
  query(sql) {
    const delay = sql === 'A' || sql === 'B' ? 750 : 0;
    this.tail = this.tail.then(() => new Promise(resolve =>
      setTimeout(() => resolve({
        rows: [{marker: sql}], rowCount: 1, command: 'SELECT'
      }), delay)));
    return this.tail;
  }
  async end() {}
}
export default {Client, types: {setTypeParser() {}}};`;

const COMMIT_STUB = LATE_STUB.replace("sql === 'A' || sql === 'B'", "sql === 'COMMIT'");
const CONNECT_FAIL_STUB = `class Client {
  async connect() { throw Object.assign(new Error('synthetic connect refused'), {code: 'ECONNREFUSED'}); }
  async query() { return {rows: [], rowCount: 0}; }
  async end() {}
}
export default {Client, types: {setTypeParser() {}}};`;
const HAPPY_STUB = `class Client {
  async connect() {}
  async query(sql) { return {rows: [{marker: sql}], rowCount: 1, command: 'SELECT'}; }
  async end() {}
}
export default {Client, types: {setTypeParser() {}}};`;

const marks = [];
const check = (id, name, ok, detail) => { marks.push({ id, name, ok, detail }); console.log(`  ${ok ? 'PASS' : 'FAIL'} [${id}] ${name}${detail ? `\n         ${detail}` : ''}`); };

console.log('A SZÁLLÍTÁSI RÉTEG BIZONYÍTÉKA (PGB-05)');
console.log('='.repeat(78));

// ── T1 · T2 — a külső fél esete ────────────────────────────────────────────────────────────────
{
  const dir = sandbox(LATE_STUB);
  const r = run(dir, `import {openPgBridge} from './pgBridge.mjs';
const b = openPgBridge('synthetic://transport-only', {waitMs: 500});
let aCode = null, closedAfter = null, bOut = null;
try { b.query('A'); } catch (e) { aCode = e.code; }
closedAfter = b.closed;
try { bOut = {rows: b.query('B').rows}; } catch (e) { bOut = {threw: e.code}; }
console.log(JSON.stringify({aCode, closedAfter, bOut}));
try { b.close(); } catch {}`);
  let v = null; try { v = JSON.parse(r.out.split('\n').pop()); } catch { /* lásd detail */ }
  check('T1', 'a KÉSŐN érkező válasz SOHA nem jut másik kéréshez',
    Boolean(v && v.bOut && v.bOut.threw && !v.bOut.rows),
    v ? `a következő kérés: ${JSON.stringify(v.bOut)} (a hiba előtt: {"rows":[{"marker":"A"}]})` : r.out || r.err);
  check('T2', 'eldönthetetlen szállítási hiba után a kapcsolat ÉRVÉNYTELEN',
    Boolean(v && v.aCode === 'PG_BRIDGE_TIMEOUT' && v.closedAfter === true),
    v ? `kód: ${v.aCode} · closed: ${v.closedAfter}` : '');
  rmSync(dir, { recursive: true, force: true });
}

// ── T3 — a COMMIT időtúllépése KÜLÖN fogalom ───────────────────────────────────────────────────
{
  const dir = sandbox(COMMIT_STUB);
  const r = run(dir, `import {openPgBridge} from './pgBridge.mjs';
const b = openPgBridge('synthetic://transport-only', {waitMs: 400});
let code = null, msg = '';
try { b.query('COMMIT'); } catch (e) { code = e.code; msg = e.message; }
console.log(JSON.stringify({code, mentionsUncertain: /bizonytalan/.test(msg) && /NEM visszagörgetés/.test(msg)}));
try { b.close(); } catch {}`);
  let v = null; try { v = JSON.parse(r.out.split('\n').pop()); } catch { /* lásd detail */ }
  check('T3', 'a COMMIT időtúllépése NEVEZETTEN bizonytalan (nem visszagörgetés, nem siker)',
    Boolean(v && v.code === 'PG_COMMIT_OUTCOME_UNKNOWN' && v.mentionsUncertain),
    v ? `kód: ${v.code}` : r.out || r.err);
  rmSync(dir, { recursive: true, force: true });
}

// ── T4 — a kapcsolatfelvétel hibája is TAKARÍT ─────────────────────────────────────────────────
{
  const dir = sandbox(CONNECT_FAIL_STUB);
  const t0 = Date.now();
  const r = run(dir, `import {openPgBridge} from './pgBridge.mjs';
let code = null;
try { openPgBridge('synthetic://refused', {waitMs: 2000}); } catch (e) { code = e.code || e.name; }
console.log(JSON.stringify({code}));`);
  const ms = Date.now() - t0;
  let v = null; try { v = JSON.parse(r.out.split('\n').pop()); } catch { /* lásd detail */ }
  check('T4', 'a kapcsolatfelvétel hibája NEVEZETTEN elszáll, és a folyamat nem akad be',
    Boolean(v && v.code) && ms < 20000, v ? `kód: ${v.code} · a folyamat ${ms} ms alatt kilépett` : r.out || r.err);
  rmSync(dir, { recursive: true, force: true });
}

// ── T5 — POZITÍV KONTROLL: a javítás nem a működést törte el ───────────────────────────────────
//
// E NÉLKÜL A PRÓBA HAZUDNA: ha a híd MINDEN kérésre hibát dobna, T1–T4 akkor is zöld lenne.
// A tiltás önmagában nem bizonyíték — azt is meg kell mutatni, hogy a JOGOS út él (KUKA-122).
{
  const dir = sandbox(HAPPY_STUB);
  const r = run(dir, `import {openPgBridge} from './pgBridge.mjs';
const b = openPgBridge('synthetic://ok', {waitMs: 5000});
const one = b.query('X').rows[0].marker;
const two = b.query('Y').rows[0].marker;
console.log(JSON.stringify({one, two, poisoned: b.poisoned}));
b.close();`);
  let v = null; try { v = JSON.parse(r.out.split('\n').pop()); } catch { /* lásd detail */ }
  check('T5', 'POZITÍV KONTROLL: a jogos egymás utáni kérések a SAJÁT válaszukat kapják',
    Boolean(v && v.one === 'X' && v.two === 'Y' && v.poisoned === null),
    v ? `X→${v.one} · Y→${v.two}` : r.out || r.err);
  rmSync(dir, { recursive: true, force: true });
}

console.log('='.repeat(78));
const bad = marks.filter((m) => !m.ok);
console.log(`ALAPSOKASÁG: ${marks.length} mért eset (ebből 1 pozitív kontroll).`);
if (!bad.length) { console.log('RESULT: PASS — a szállítási réteg a mért eseteken helyesen viselkedik.'); process.exit(0); }
console.log(`RESULT: FAIL — ${bad.length} eset`);
process.exit(1);
