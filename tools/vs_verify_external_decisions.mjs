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
import { EXTERNAL_CLAUSE_DECISIONS, EXTERNAL_DECISION_SOURCE, EXTERNAL_VERDICTS } from '../v3ref/externalDecisions.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'v3ref/source-documents/R37_board_v1.md');
const norm = (t) => String(t == null ? '' : t).replace(/\s+/g, ' ').trim();

const problems = [];
console.log('='.repeat(78));
console.log('EXD-02 — A KÜLSŐ TARTALMI DÖNTÉSEK IDÉZET-HŰSÉGE');
console.log('='.repeat(78));

if (!existsSync(SRC)) {
  problems.push(`a rögzített forrás-lap HIÁNYZIK: ${SRC} — a „szó szerinti" állítás így nem mérhető`);
} else {
  const src = norm(readFileSync(SRC, 'utf8'));
  for (const d of EXTERNAL_CLAUSE_DECISIONS) {
    if (!EXTERNAL_VERDICTS.includes(d.verdict)) {
      problems.push(`${d.clause}: ismeretlen verdikt-szó (${JSON.stringify(d.verdict)})`);
    }
    const r = norm(d.reason);
    if (!r) { problems.push(`${d.clause}: ÜRES indok`); continue; }
    if (!src.includes(r)) {
      problems.push(`${d.clause}: az indok NEM SZÓ SZERINTI a forrás-lapban — „${r.slice(0, 80)}…"`);
    }
    // A SAJÁT MEGJEGYZÉS SOHA NEM KEVEREDHET AZ IDÉZETBE (R39 · R41).
    if (/\bR3[5-9]\b|\bR4[0-9]\b|javítva|pótolva/i.test(r)) {
      problems.push(`${d.clause}: az indokba SAJÁT megjegyzés került — az `
        + '`our_progress_note` mezőbe való');
    }
  }
  // MINDKÉT IRÁNY (KUKA-039): a forrás-lap táblájának MINDEN klauzula-sora meg kell legyen nálunk.
  const inSource = [...src.matchAll(/\|\s*((?:REV|ORG|K05|K10)-[A-Za-z0-9-]+)\s*\|/g)].map((m) => m[1]);
  const have = new Set(EXTERNAL_CLAUSE_DECISIONS.map((d) => d.clause));
  const missing = [...new Set(inSource)].filter((c) => !have.has(c));
  if (missing.length) problems.push(`a forrás-lap ${missing.length} klauzulája HIÁNYZIK a regiszterből: ${missing.join(', ')}`);
}

console.log(`  forrás-lap: ${SRC.replace(`${ROOT}/`, '')}`);
console.log(`  kör: ${EXTERNAL_DECISION_SOURCE.round} · döntő: ${EXTERNAL_DECISION_SOURCE.decided_by}`);
console.log(`  mérve: ${EXTERNAL_CLAUSE_DECISIONS.length} döntés · gépi hitelesítés: `
  + `${EXTERNAL_DECISION_SOURCE.not_a_machine_attestation ? 'NINCS (kimondva)' : 'ÁLLÍTVA — ez hiba'}`);
console.log('-'.repeat(78));
if (problems.length) {
  console.log(`PIROS (${problems.length}):`);
  for (const p of problems) console.log(`  · ${p}`);
  console.log(`RESULT: ${EXTERNAL_CLAUSE_DECISIONS.length - problems.length}/${EXTERNAL_CLAUSE_DECISIONS.length} — ${problems.length} HIBA`);
  process.exit(1);
}
console.log(`RESULT: ${EXTERNAL_CLAUSE_DECISIONS.length}/${EXTERNAL_CLAUSE_DECISIONS.length} PASS — minden indok SZÓ SZERINTI, és minden forrás-klauzula megvan`);
