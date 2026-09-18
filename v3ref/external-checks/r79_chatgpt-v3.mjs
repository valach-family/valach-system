#!/usr/bin/env node
/**
 * R79 — A KÜLSŐ FÉL MAG-PRÓBÁJA, BURKOLÓVAL (EXT-01).
 *
 * MI EZ. A külső fél (chatgpt-v3) R79-es programja a `r79_chatgpt-v3.core.mjs` fájlban áll,
 * **BÁJTAZONOSAN, ahogy a lapjukon megérkezett** — egyetlen karaktert sem írtunk át benne.
 *
 * MIT MÉR. 18 eset három lelet-családban: F01 — a KIADOTT eredmény RÉSZFÁJÁNAK adatköre (a `lines[]`
 * alatt rejtett ármező a készlet-címke alatt kijutott) · F02 — a PARANCSÍRÁS hatályosulása (a
 * tagsági jog és a rögzített `finalized_at` két külön óraolvasáson állt) · F03 — a `revokeMembership`
 * nem vitte át a hiteles kontextust, tehát a hitelesítő-alapú tiltás azon az író úton nem hatott.
 *
 * A KÉT FUTÁS KÜLÖN NEVEZVE. A program a JAVÍTÁS ELŐTTI forráson **14 PASS / 4 FAIL** — pontosan az
 * általuk közölt reprodukció —, a mai forráson **18 PASS / 0 FAIL**. TESZTADAPTÁCIÓ NEM TÖRTÉNT:
 * egyetlen elvárást sem írtunk át, a program szövege változatlan.
 *
 * MIÉRT KELL MÉGIS EZ A FÁJL. A programjuk a szabvány KIMENETRE ír, a mi átadhatósági szerződésünk
 * (EXT-02 · R59/F02) viszont RÉSZLETES EREDMÉNY-ARTEFAKTUMOT követel: „a szabvány kimenet
 * DIAGNOSZTIKA, nem bizonyíték". Ez a burkoló LEFUTTATJA az ő programjukat változatlanul, elkapja a
 * JSON-t, és a `source-manifest.json` commit-kötésével együtt kiírja az artefaktumot.
 */import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { activeCoreProgram, coreVariant } from './activeCoreProgram.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PIN = JSON.parse(readFileSync(join(HERE, 'source-manifest.json'), 'utf8')).commit;

const run = spawnSync(process.execPath, [join(HERE, activeCoreProgram('r79_chatgpt-v3'))], {
  cwd: HERE, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
});
const raw = String(run.stdout || '');
process.stdout.write(raw);
if (run.stderr) process.stderr.write(run.stderr);

// A KIMENET FELDOLGOZÁSA NEM ÉRTELMEZÉS: a JSON-t VÁLTOZATLANUL vesszük át, és csak a
// commit-kötést tesszük mellé. Ha nem értelmezhető, azt KIMONDJUK — nem írunk üres artefaktumot,
// mert az úgy nézne ki, mint egy lefutott, eredménytelen mérés (KUKA-012).
let parsed = null;
try { parsed = JSON.parse(raw.slice(raw.indexOf('{'))); } catch { parsed = null; }
// A MEZŐNÉV-LEKÉPEZÉS KIMONDVA. Az ő programjuk a `results` néven adja az eseteket
// (`{id, result: 'PASS'|'FAIL'}`), a mi eset-szemlénk `cases`-t olvas `{id, pass}` alakban. NEM
// írjuk át a programjukat: a burkoló KÉPEZI a mi alakunkat, az EREDETIT pedig változatlanul
// megtartja az artefaktumban (`results`) — így visszaolvasható, hogy mit adott ő, és mit
// olvasott a mi szemlénk (KUKA-018: két ábrázolás csak akkor él meg, ha látszik, melyik melyik).
//
// R75 — A KÉT ALAK KÜLÖNBÖZIK, ÉS EZT MÉRNI KELL, NEM FELTÉTELEZNI. Az R69-es programjuk
// `{id, result: 'PASS'|'FAIL'}` alakot adott, az R75-ös viszont MÁR `{id, pass: true|false}`-t. Az
// első alakomban ezt a burkolót az R69-esről másoltam, és a `String(r.result) === 'PASS'` minden
// esetre HAMISAT adott — 7/7 zöld programra 0/7 „elbukott" artefaktum. A hiba osztálya a KUKA-016
// (az alakot a TESTVÉRTŐL vettem, nem a VALÓDI bemenettől) és a KUKA-068 (a mérő a saját
// nyelvjárását beszélte, nem a fogyasztóét). Ezért innentől MINDKÉT alakot NÉVVEL ismerjük fel, és
// a harmadik eset — az ISMERETLEN alak — NEM „bukott", hanem kimondottan OLVASHATATLAN (KUKA-020:
// a „nem tudom" nem nézhet ki ugyanúgy, mint a „nem").
function caseVerdict(r) {
  if (r && typeof r.pass === 'boolean') return { pass: r.pass, shape: 'pass:boolean' };
  if (r && typeof r.result === 'string') return { pass: r.result === 'PASS', shape: 'result:string' };
  return { pass: false, shape: 'ISMERETLEN — az eset alakja nem értelmezhető, ezért NEM számít zöldnek' };
}
const mapped = parsed && Array.isArray(parsed.results)
  ? parsed.results.map((r) => { const v = caseVerdict(r); return { id: r && r.id, pass: v.pass, verdict_shape: v.shape, result: r }; })
  : null;
const out = parsed
  ? { program: activeCoreProgram('r79_chatgpt-v3'), variant: coreVariant().id, source_commit: PIN, node: process.version,
      at: new Date().toISOString(), verbatim: true, ...parsed,
      ...(mapped ? { cases: mapped, cases_mapped_from: 'results (a burkoló képezte, a program szövege érintetlen)' } : {}) }
  : { program: activeCoreProgram('r79_chatgpt-v3'), variant: coreVariant().id, source_commit: PIN, node: process.version,
      at: new Date().toISOString(), verbatim: true, error: 'a program kimenete nem értelmezhető JSON',
      cases: [], passed: 0, failed: 0 };
writeFileSync(join(HERE, 'evidence/r79-core-challenge.json'), `${JSON.stringify(out, null, 2)}\n`);
process.exitCode = run.status === 0 ? 0 : 1;
