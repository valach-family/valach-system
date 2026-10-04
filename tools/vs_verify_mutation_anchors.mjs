#!/usr/bin/env node
// V3 — A MUTÁCIÓS HORGONYOK ŐRE (MUT-02). `npm run verify:mutation-anchors`
//
// MIÉRT SZÜLETETT — MÉRT LELET, nem elővigyázatosság.
//
// A mutációs battéria úgy dolgozik, hogy a mag FORRÁSSZÖVEGÉT írja át: minden bejegyzés egy
// `from` (a mai szöveg) és egy `to` (az elrontott szöveg) párt hordoz. Ha a `from` szöveg a
// forrásban MEGVÁLTOZIK, a mutáció **nem keletkezik** — és ez NÉMA: a battéria nem hibát jelez,
// hanem egyszerűen kevesebb mutációt futtat. A hozzá tartozó próba ilyenkor
// „NEM FALSZIFIKÁLT" lesz, vagyis **elveszítünk egy őrt anélkül, hogy bárki észrevenné**.
//
// EZ MEG IS TÖRTÉNT (R148). A PostgreSQL-átvezetéskor négy SQL-mondat hordozható alakra került
// (`INSERT OR IGNORE` → `ON CONFLICT DO NOTHING`), és ezzel KÉT mutáció horgonya lecsúszott
// (M59 · M203). A tünet nem itt jelent meg, hanem három lépéssel távolabb: a külső fél
// `r83core` programja bukott el, „a 17/36 egység NEM nullával zárt — a bukás oka: content"
// üzenettel. **Órákkal és három rétegen át derült ki, amit EGY illesztés-ellenőrzés azonnal
// megmondott volna.** Ez a KUKA-051 alakja (a védelem SZABÁLY legyen, ne lista) és a KUKA-239-é
// (a megvalósítás szövegéhez kötött minta a szomszéd sort igazolja).
//
// AMIT MÉR: minden mutáció `from` horgonya MEGTALÁLHATÓ-e a megnevezett forrásfájlban — és
// EGYSZER szerepel-e benne. A kétszer szereplő horgony is lelet: a csere ilyenkor nem
// eldönthető, melyik helyre vonatkozik.
import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MUTATIONS } from '../v3ref/mutations.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'v3ref');

const problems = [];
let checked = 0;
const cache = new Map();
const read = (f) => {
  if (!cache.has(f)) { try { cache.set(f, readFileSync(join(SRC, f), 'utf8')); } catch { cache.set(f, null); } }
  return cache.get(f);
};

for (const m of MUTATIONS) {
  if (!m || !m.file || m.from === undefined) continue;
  checked += 1;
  const src = read(m.file);
  if (src === null) { problems.push(`${m.id}: a megnevezett forrásfájl nem olvasható — v3ref/${m.file}`); continue; }
  const hits = src.split(String(m.from)).length - 1;
  if (hits === 0) {
    problems.push(`${m.id} (${m.file}): a horgony NEM TALÁLHATÓ a forrásban — ez a mutáció NEM `
      + `keletkezik, tehát a hozzá tartozó próba (${m.catcher || 'nincs megnevezve'}) ŐRIZETLEN. `
      + `Horgony: ${JSON.stringify(String(m.from).slice(0, 80))}`);
  } else if (hits > 1) {
    problems.push(`${m.id} (${m.file}): a horgony ${hits}× szerepel — a csere helye nem eldönthető. `
      + `Horgony: ${JSON.stringify(String(m.from).slice(0, 80))}`);
  }
}

console.log('A MUTÁCIÓS HORGONYOK ŐRE (MUT-02)');
console.log('='.repeat(74));
console.log(`  mért mutáció: ${checked} · forrásfájl: ${cache.size}`);
if (problems.length === 0) {
  console.log('RESULT: PASS — minden horgony pontosan egyszer illeszkedik a megnevezett forrásra.');
  process.exit(0);
}
console.log('LELET:');
for (const p of problems) console.log(`  · ${p}`);
console.log(`RESULT: FAIL — ${problems.length} elcsúszott horgony`);
process.exit(1);
