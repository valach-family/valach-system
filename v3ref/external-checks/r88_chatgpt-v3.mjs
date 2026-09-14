#!/usr/bin/env node
/**
 * R88 — A KÜLSŐ FÉL MAG-PRÓBÁJA, BURKOLÓVAL (EXT-01).
 *
 * MIT MÉR (5 eset). Két core-lelet, mindkettőhöz POZITÍV KONTROLLAL:
 *   · R88-F01 — a felhatalmazási ALAP azonossága: a `basisAsOf` csak az azonosítóra keresett, a
 *     kiadó út a KÖNYVET meg sem kérdezte, tehát egy „A" könyvre szóló határozatra hivatkozva „B"
 *     könyvben is lehetett `adjudicate` hatáskört adni. A tiltott kérésnek NYOM NÉLKÜL kell
 *     elakadnia (se sor, se későbbi engedő válasz), a saját könyvön viszont MENNIE kell.
 *   · R88-F02 — a tagságadás EGY ÍRÁS: az esemény és a vetület együtt sikerül vagy együtt bukik;
 *     a KÜLSŐ tranzakció visszagördülése a tagságadást is elviszi.
 *
 * A KÉT FUTÁS KÜLÖN NEVEZVE. A JAVÍTÁS ELŐTTI forráson 3 PASS / 2 FAIL — pontosan az általuk közölt
 * reprodukció —, a mai forráson 5 PASS / 0 FAIL. TESZTADAPTÁCIÓ NEM TÖRTÉNT: a program szövege
 * karakterre az övék (md5 d12336ec7dc26febcfcb222b9627f562, ahogy a lapjukról kinyertük).
 *
 * KIMONDOTT RÉSZLET: a program a SAJÁT bizonyíték-fájlját `evidence/core-r87.json` néven írja —
 * ez az Ő elnevezésük, és NEM írjuk át (a program szövegéhez nem nyúlunk); a mi szerződésünk
 * szerinti artefaktumot a burkoló teszi mellé, külön néven.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PIN = JSON.parse(readFileSync(join(HERE, 'source-manifest.json'), 'utf8')).commit;

const run = spawnSync(process.execPath, [join(HERE, 'r88_chatgpt-v3.core.mjs')], {
  cwd: HERE, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
});
const raw = String(run.stdout || '');
process.stdout.write(raw);
if (run.stderr) process.stderr.write(run.stderr);

let parsed = null;
try { parsed = JSON.parse(raw.slice(raw.indexOf('['))); } catch { parsed = null; }
const cases = Array.isArray(parsed)
  ? parsed.map((r) => ({ id: r && r.id, pass: r && r.pass === true, result: r }))
  : [];
const out = parsed
  ? { program: 'r88_chatgpt-v3.core.mjs', source_commit: PIN, node: process.version,
      at: new Date().toISOString(), verbatim: true, cases,
      passed: cases.filter((c) => c.pass).length, failed: cases.filter((c) => !c.pass).length }
  : { program: 'r88_chatgpt-v3.core.mjs', source_commit: PIN, node: process.version,
      at: new Date().toISOString(), verbatim: true,
      error: 'a program kimenete nem értelmezhető JSON', cases: [], passed: 0, failed: 0 };
writeFileSync(join(HERE, 'evidence/r88-core-challenge.json'), `${JSON.stringify(out, null, 2)}\n`);
process.exitCode = run.status === 0 ? 0 : 1;
