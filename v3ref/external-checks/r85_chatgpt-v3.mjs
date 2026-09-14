#!/usr/bin/env node
/**
 * R85 — A KÜLSŐ FÉL MAG-PRÓBÁJA, BURKOLÓVAL (EXT-01).
 *
 * MIÉRT MOST KERÜL BE, ÉS MIÉRT HELYESBÍTÉS. Az R86 §10-ben azt írtam, hogy az ő R85-ös programjuk
 * „be van kötve a V3 külső-ellenőrző könyvtárába". MÉRVE ez NEM VOLT IGAZ: a fájl sem a rögzített
 * fájl-fában, sem a program-regiszterben nem szerepelt. A külső fél mérte meg (R88 §7), és igaza
 * volt. Ez a KUKA-038 alakja a SAJÁT ÁTADÁSI ÁLLÍTÁSOMON: „megvan a program" annyit mondott volna,
 * hogy megkaptam — nem azt, hogy a söprés FUTTATJA. A helyesbítés ezért nem mondat, hanem EZ A FÁJL.
 *
 * MIT MÉR (4 eset). A tagságadás KÉT IDŐ-TENGELYE (R85/F01: a júniusi beváltás nem írhatja át, mit
 * tudtunk márciusban) és a jogváltozási esemény SAJÁT bizonyíték-hivatkozása (R85/F02: a hivatkozás
 * a VISSZAMENŐLEGES és a JÖVŐBELI hatályú ágon is tartósan megmarad).
 *
 * A KÉT FUTÁS KÜLÖN NEVEZVE. A JAVÍTÁS ELŐTTI forráson 2 PASS / 2 FAIL — pontosan az általuk közölt
 * reprodukció —, a mai forráson 4 PASS / 0 FAIL. TESZTADAPTÁCIÓ NEM TÖRTÉNT: a program szövege
 * karakterre az övék (md5 854892614413c6d8fbd0afe8c785e765, ahogy a lapjukról kinyertük — „bájtazonost"
 * az ő saját példányukhoz képest nem állítunk, mert azt nem mértük meg: R83 §6 tanulsága).
 *
 * MIÉRT KELL A BURKOLÓ. A programjuk a szabvány kimenetre ír; a mi átadhatósági szerződésünk
 * (EXT-02 · R59/F02) RÉSZLETES eredmény-artefaktumot követel — „a szabvány kimenet DIAGNOSZTIKA,
 * nem bizonyíték". Ez a burkoló lefuttatja őket változatlanul, és a commit-kötéssel együtt kiírja.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PIN = JSON.parse(readFileSync(join(HERE, 'source-manifest.json'), 'utf8')).commit;

const run = spawnSync(process.execPath, [join(HERE, 'r85_chatgpt-v3.core.mjs')], {
  cwd: HERE, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
});
const raw = String(run.stdout || '');
process.stdout.write(raw);
if (run.stderr) process.stderr.write(run.stderr);

// A KIMENET ALAKJA AZ Ő DÖNTÉSÜK: csupasz TÖMB (`[{id, pass, …}]`). Nem írjuk át a programjukat,
// és nem is feltételezzük az alakot emlékezetből (KUKA-068: a mérő a FOGYASZTÓ nyelvjárását
// olvassa) — a nem értelmezhető kimenet KIMONDOTTAN olvashatatlan, nem üres mérés (KUKA-012).
let parsed = null;
try { parsed = JSON.parse(raw.slice(raw.indexOf('['))); } catch { parsed = null; }
const cases = Array.isArray(parsed)
  ? parsed.map((r) => ({ id: r && r.id, pass: r && r.pass === true, result: r }))
  : [];
const out = parsed
  ? { program: 'r85_chatgpt-v3.core.mjs', source_commit: PIN, node: process.version,
      at: new Date().toISOString(), verbatim: true, cases,
      passed: cases.filter((c) => c.pass).length, failed: cases.filter((c) => !c.pass).length }
  : { program: 'r85_chatgpt-v3.core.mjs', source_commit: PIN, node: process.version,
      at: new Date().toISOString(), verbatim: true,
      error: 'a program kimenete nem értelmezhető JSON', cases: [], passed: 0, failed: 0 };
writeFileSync(join(HERE, 'evidence/r85-core-challenge.json'), `${JSON.stringify(out, null, 2)}\n`);
process.exitCode = run.status === 0 ? 0 : 1;
