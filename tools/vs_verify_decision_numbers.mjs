#!/usr/bin/env node
// Valach System — DÖNTÉS-SZÁM ŐR (DNR-01). READ-ONLY + offline. Exit 0/1.
//
// MIÉRT: a `D-VS-…` szám EGY dolgot jelöl. Két repó (V2 = `vs`, V3 = `valach-system`) és két sáv
// (Claude-DEV, Claude-AUX) egyszerre dolgozik — ha mindenki a saját legmagasabb számából indul,
// ugyanaz a szám két különböző döntést fog jelölni. A V2-ben ez MÉRVE megtörtént: 14 szám két
// bejegyzést jelöl. A prózai szabály („ellenőrizni, hogy szabad-e") nem tartott (KUKA-004).
//
// A MEGOLDÁS BLOKK-FOGLALÁS: a V3 az 5000-től oszt, a V2 az 5000 ALATT marad. Így a két repó
// egyszerre oszthat számot, ütközés nélkül — és a névtér nem hasad ketté (nem lett `D-V3-…`,
// mert az a VERZIÓT tenné az azonosítóba, amit épp kivezettünk a repó nevéből is).
//
// MIÉRT 5000 ÉS NEM 700 (D-VS-5005, operátori kérdés: „hova mennek majd a v2-nek a maradék apró
// dolgai?"). A 700 MÉRVE szűk volt: a V2 a 670-nél állt, tehát 29 száma maradt, miközben a git
// történetéből mért ütem 433 → 670 huszonkét nap alatt (~10,8/nap, a legutóbbi napokon 3,7/nap).
// Vagyis a V2 a saját blokkját EGY HÉTEN BELÜL elfogyasztotta volna — és a túlcsordulás NÉMA
// ütközés lett volna két repó között. A V2 a Shoprenter-szinkronig és a folyamatok alapszintű
// működéséig tovább dolgozik, tehát nem „pár apró dolog" jön még.
//
// A HATÁR NEM TIPP, HANEM MÉRÉSBŐL SZÁMOLT FEDEZET: 5000 − 671 = 4329 szabad szám a V2-nek,
// ami a MÉRT leggyorsabb ütemen (10,8/nap) is 400 nap, a mai ütemen (3,7/nap) 3 év. A V2 ennél
// hamarabb nyugdíjba megy. És a szám MAGA nem hordoz verziót (nem „V3 = 5000"), csak azt, hogy
// melyik repó naplója osztja — ha egyszer V4 lesz, ugyanebben a repóban folytatódik (D-VS-5000).
//
//   DNR01  a napló olvasható, és van benne bejegyzés (a néma nulla nem zöld — KUKA-012)
//   DNR02  NINCS ütközés (két bejegyzés ugyanazon a számon)
//   DNR03  MINDEN szám a V3 blokkjában van (>= 700) — a blokk-határ átlépése piros
//   DNR04  a következő SZABAD szám kiszámolható, és ki is íródik (ne emlékezetből menjen)

import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// A V3 BLOKKJA. Az 5000 alatti számok a V2 repóé (`valach-family/vs`) — oda nem nyúlunk.
const V3_BLOCK_START = 5000;

let pass = 0; let fail = 0; const bad = [];
const check = (id, name, ok) => { if (ok) { pass++; } else { fail++; bad.push(`  FAIL [${id}] ${name}`); } };

const log = read('DECISION_LOG.md');
const nums = [...log.matchAll(/^## D-VS-(\d+)/gm)].map((m) => Number(m[1]));
check('DNR01', `a napló olvasható és tartalmaz bejegyzéseket (${nums.length} db)`, nums.length > 0);

const seen = new Map();
for (const n of nums) seen.set(n, (seen.get(n) || 0) + 1);
const dups = [...seen.entries()].filter(([, c]) => c > 1).map(([n]) => n).sort((a, b) => a - b);
check('DNR02', `nincs döntés-szám ütközés${dups.length ? `: ${dups.map((n) => `D-VS-${n}`).join(', ')}` : ''}`,
  dups.length === 0);

const outOfBlock = nums.filter((n) => n < V3_BLOCK_START).sort((a, b) => a - b);
check('DNR03', `minden szám a V3 blokkjában van (>= ${V3_BLOCK_START})`
  + (outOfBlock.length ? ` — a blokkon KÍVÜL: ${outOfBlock.map((n) => `D-VS-${n}`).join(', ')}` : ''),
  outOfBlock.length === 0);

const max = nums.length ? Math.max(...nums) : V3_BLOCK_START - 1;
check('DNR04', 'a legmagasabb szám kiolvasható', Number.isFinite(max));

console.log('');
console.log('DÖNTÉS-SZÁM ŐR (DNR-01)');
console.log('='.repeat(50));
if (bad.length) console.log(bad.join('\n'));
console.log(`  A V3 BLOKKJA: D-VS-${V3_BLOCK_START}-tól. Az ${V3_BLOCK_START} ALATT a V2 repó (valach-family/vs) oszt.`);
console.log(`  A KÖVETKEZŐ SZABAD SZÁM: D-VS-${Math.max(max + 1, V3_BLOCK_START)}  (a legmagasabb kiadott itt: D-VS-${max})`);
console.log(`RESULT: ${pass}/${pass + fail} PASS${fail ? ` — ${fail} FAIL` : ''}`);
process.exit(fail ? 1 : 0);
