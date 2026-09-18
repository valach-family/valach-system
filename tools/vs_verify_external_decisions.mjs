#!/usr/bin/env node
/**
 * EXD-02 — A „SZÓ SZERINTI" ÁLLÍTÁS MÉRVE (R41/F41-03).
 *
 * MIÉRT. Az R37-ben kimondtuk, hogy a 29 külső tartalmi döntés **szó szerinti** indokkal került be.
 * Az R39-ben ezt megerősítettük, és a saját előrehaladást külön mezőbe tettük — de a SZÓ SZERINTISÉG
 * maga ígéret maradt, nem mérés. A külső ellenőrző fél (chatgpt-v3, R41) megtalálta az első
 * átfogalmazást (K05-DSC-c utolsó mondata), a saját mérésem pedig még KETTŐT (REV-N3c — „nem fogadom
 * bele" → „nem fogadja bele"; K10-TYP-c — kiemelt nagybetűk). Egyik sem torzított tartalmat, de
 * IDÉZETKÉNT pontatlan volt.
 *
 * MOSTANTÓL MÉRÉS: minden tárolt indoknak SZÓ SZERINT meg kell jelennie a rögzített forrás-lapban
 * (`v3ref/source-documents/R37_board_v1.md`), szóköz-normalizálás mellett. Ami nem, az PIROS.
 *
 * AMIT EZ NEM MÉR, KIMONDVA: hogy a tárolt VERDIKT megfelel-e a külső döntésnek — az a szöveg
 * ÉRTELMEZÉSE, nem az idézet pontossága. A verdikt zárt halmazát a `verify:kuka` oldalon a
 * regiszter saját szerkezete őrzi.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_EXTERNAL_DECISIONS, EXTERNAL_DECISION_SOURCES, EXTERNAL_VERDICTS,
  externalDecisionFor } from '../v3ref/externalDecisions.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const norm = (t) => String(t == null ? '' : t).replace(/\s+/g, ' ').trim();

const problems = [];
console.log('='.repeat(78));
console.log('EXD-02 — A KÜLSŐ TARTALMI DÖNTÉSEK IDÉZET-HŰSÉGE');
console.log('='.repeat(78));

// MINDEN DÖNTÉS A SAJÁT FORRÁSÁHOZ MÉRVE (R45). A régi alak EGYETLEN lapot ismert (R37), tehát egy
// ÚJ kör döntése vagy „nem szó szerinti"-ként piroslott volna, vagy — ami rosszabb — a lap cseréjével
// a TÖRTÉNETI idézet tűnt volna el. A külső fél kikötése: „A döntéseket forrásukkal és hatókörükkel
// vezesd át; a történeti idézetet őrizd meg." (KUKA-103: az átírás is kivezetés.)
const SOURCES = new Map(EXTERNAL_DECISION_SOURCES.map((x) => [x.id, x]));
const TEXT = new Map();
for (const [id, src] of SOURCES) {
  const file = join(ROOT, src.document);
  if (!existsSync(file)) {
    problems.push(`a(z) ${id} forrás-lap HIÁNYZIK: ${src.document} — a „szó szerinti" állítás így nem mérhető`);
    continue;
  }
  TEXT.set(id, norm(readFileSync(file, 'utf8')));
}

for (const d of ALL_EXTERNAL_DECISIONS) {
  if (!EXTERNAL_VERDICTS.includes(d.verdict)) {
    problems.push(`${d.clause} (${d.source}): ismeretlen verdikt-szó (${JSON.stringify(d.verdict)})`);
  }
  if (!SOURCES.has(d.source)) {
    problems.push(`${d.clause}: ismeretlen FORRÁS (${JSON.stringify(d.source)}) — a döntés hovatartozása nem mérhető`);
    continue;
  }
  const src = TEXT.get(d.source);
  if (!src) continue;                       // a hiányzó lapot fent már megneveztük
  const r = norm(d.reason);
  if (!r) { problems.push(`${d.clause} (${d.source}): ÜRES indok`); continue; }
  if (!src.includes(r)) {
    problems.push(`${d.clause} (${d.source}): az indok NEM SZÓ SZERINTI a forrás-lapban — „${r.slice(0, 80)}…"`);
  }
  // A SAJÁT MEGJEGYZÉS SOHA NEM KEVEREDHET AZ IDÉZETBE (R39 · R41). A kör-szám említése az R45-ös
  // döntésekben a KÜLSŐ fél SAJÁT szava (ők írták le az R43-at), ezért a tiltás a mi jelölőinkre
  // szól: „javítva" · „pótolva".
  if (/javítva|pótolva/i.test(r)) {
    problems.push(`${d.clause} (${d.source}): az indokba SAJÁT megjegyzés került — az `
      + '`our_progress_note` mezőbe való');
  }
}

// MINDKÉT IRÁNY (KUKA-039): a forrás-lapok tábláinak MINDEN klauzula-sora meg kell legyen nálunk.
const have = new Set(ALL_EXTERNAL_DECISIONS.map((d) => d.clause));
for (const [id, src] of TEXT) {
  const inSource = [...src.matchAll(/\|\s*((?:REV|ORG|K05|K10)-[A-Za-z0-9-]+)\s*\|/g)].map((m) => m[1]);
  const missing = [...new Set(inSource)].filter((c) => !have.has(c));
  if (missing.length) problems.push(`a(z) ${id} forrás-lap ${missing.length} klauzulája HIÁNYZIK a regiszterből: ${missing.join(', ')}`);
}

// A FELÜLÍRÁS NEM TÖRLÉS (R45). Ahol egy későbbi kör döntött, a MAI verdikt az övé, és a KORÁBBI
// döntés `superseded`-ként UTAZIK vele — ha eltűnne, a történeti idézet veszne el.
for (const d of ALL_EXTERNAL_DECISIONS) {
  const today = externalDecisionFor(d.clause);
  if (!today) { problems.push(`${d.clause}: a feloldó NEM ad döntést, pedig a regiszterben áll`); continue; }
  if (today.source !== d.source) {
    const chain = [];
    for (let x = today; x; x = x.superseded) chain.push(`${x.source}:${x.verdict}`);
    if (!chain.includes(`${d.source}:${d.verdict}`)) {
      problems.push(`${d.clause}: a(z) ${d.source}-ös döntés ELTŰNT a mai feloldásból (lánc: ${chain.join(' ← ')})`);
    }
  }
}

console.log(`  források: ${[...SOURCES.values()].map((x) => `${x.id} (${x.document})`).join(' · ')}`);
for (const x of SOURCES.values()) {
  console.log(`  kör: ${x.round} · döntő: ${x.decided_by} · gépi hitelesítés: `
    + `${x.not_a_machine_attestation ? 'NINCS (kimondva)' : 'ÁLLÍTVA — ez hiba'}`);
}
console.log(`  mérve: ${ALL_EXTERNAL_DECISIONS.length} döntés-sor `
  + `(${[...SOURCES.keys()].map((id) => `${id}: ${ALL_EXTERNAL_DECISIONS.filter((d) => d.source === id).length}`).join(' · ')})`);
console.log('-'.repeat(78));
if (problems.length) {
  console.log(`PIROS (${problems.length}):`);
  for (const p of problems) console.log(`  · ${p}`);
  console.log(`RESULT: ${ALL_EXTERNAL_DECISIONS.length - problems.length}/${ALL_EXTERNAL_DECISIONS.length} — ${problems.length} HIBA`);
  process.exit(1);
}
console.log(`RESULT: ${ALL_EXTERNAL_DECISIONS.length}/${ALL_EXTERNAL_DECISIONS.length} PASS — minden indok SZÓ SZERINTI a SAJÁT forrás-lapjában, minden forrás-klauzula megvan, és a felülírt döntés sem veszett el`);
