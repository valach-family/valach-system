#!/usr/bin/env node
/**
 * R67 — A KÜLSŐ FÉL MAG-PRÓBÁJA, BURKOLÓVAL (EXT-01, R67 §7/2).
 *
 * MI EZ. A külső fél (chatgpt-v3) R67-es programja a `r67_chatgpt-v3.core.mjs` fájlban áll,
 * **BÁJTAZONOSAN, ahogy a lapjukon megérkezett** — egyetlen karaktert sem írtunk át benne. Ha a
 * futtató „megjavítaná" a próbát, az ellenőrzés a saját előfeltevésünket igazolná vissza
 * (KUKA-054), és az egész külső kör értelmét vesztené.
 *
 * MIÉRT KELL MÉGIS EZ A FÁJL. A programjuk a szabvány KIMENETRE ír, a mi átadhatósági szerződésünk
 * (EXT-02 · R59/F02) viszont RÉSZLETES EREDMÉNY-ARTEFAKTUMOT követel: „a szabvány kimenet
 * DIAGNOSZTIKA, nem bizonyíték". A két követelmény nem ütközik — csak nem ugyanaz a fájl felelős
 * értük. Ez a burkoló LEFUTTATJA az ő programjukat változatlanul, elkapja a JSON-t, és a
 * `source-manifest.json` commit-kötésével együtt kiírja az artefaktumot. A programjuk KIMENETE
 * változatlanul megy tovább a szabvány kimenetre is.
 *
 * ÉS EGY KIMONDOTT ADÓSSÁG (R67 §5). Az R65-ös programjuk a board NOTE törzsében megérkezett
 * (üzenet: ed2c2108-dd9c-4817-8f65-a03ad412895d), de a dokumentum-oldalról lemaradt, és én tévesen
 * azt jelentettem, hogy „nem érkezett meg" — ezért az R65-ös alak NEM került be ide, csak az általam
 * ÚJRAÍRT változat (`src/externalChallengeR65.test.cjs` a V2-ben). Ez itt kimondva marad, amíg az
 * eredeti szöveget be nem emeljük: az azonos 3/8 arány NEM bizonyítja két program azonosságát.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PIN = JSON.parse(readFileSync(join(HERE, 'source-manifest.json'), 'utf8')).commit;

const run = spawnSync(process.execPath, [join(HERE, 'r67_chatgpt-v3.core.mjs')], {
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
const mapped = parsed && Array.isArray(parsed.results)
  ? parsed.results.map((r) => ({ id: r && r.id, pass: String(r && r.result) === 'PASS', result: r }))
  : null;
const out = parsed
  ? { program: 'r67_chatgpt-v3.core.mjs', source_commit: PIN, node: process.version,
      at: new Date().toISOString(), verbatim: true, ...parsed,
      ...(mapped ? { cases: mapped, cases_mapped_from: 'results (a burkoló képezte, a program szövege érintetlen)' } : {}) }
  : { program: 'r67_chatgpt-v3.core.mjs', source_commit: PIN, node: process.version,
      at: new Date().toISOString(), verbatim: true, error: 'a program kimenete nem értelmezhető JSON',
      cases: [], passed: 0, failed: 0 };
writeFileSync(join(HERE, 'evidence/r67-core-challenge.json'), `${JSON.stringify(out, null, 2)}\n`);
process.exitCode = run.status === 0 ? 0 : 1;
