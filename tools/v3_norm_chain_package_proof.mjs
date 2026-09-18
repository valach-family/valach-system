#!/usr/bin/env node
/**
 * NCP-02 — A CSOMAG-GENERÁTOR ELLENPÁR-BATTÉRIÁJA (R37/F37-01).
 *
 * MIÉRT KELL. Az NCP-01 első alakja **nulla mutációs tanú mellett is 78 fedett sort** írt ki,
 * kilépés 0-val — mert a minősítést MAGA képezte a mérés helyett. A javítás önmagában nem
 * bizonyíték: azt is meg kell mutatni, hogy a mai alak a HAZUG csomagot ELUTASÍTJA. Ez a battéria
 * hét visszalépést állít elő a MÉRT állományon, és mindnek PIROSNAK kell lennie — plusz két
 * POZITÍV ellenpár (az ép csomag zöld az elején és a végén is), mert az őr, ami mindent pirosra
 * visz, ugyanolyan haszontalan, mint az, ami mindent átenged (KUKA-049).
 *
 * A MÉRÉS A KILÉPÉSI KÓDON ÁLL (KUKA-094): a kimenet szövegét nem számoljuk.
 *
 * BIZTONSÁG: a mért állományt a futás ELEJÉN félreteszi, és MINDEN ág után visszaállítja — a
 * megszakadt futás sem hagyhat rontott állományt (a helyreállítás `finally` ágon is fut).
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MEASURED = join(ROOT, 'v3ref/v3ref-mutation-result.json');
const BACKUP = join(ROOT, 'var/tmp/ncp02-measured-backup.json');
const GEN = join(ROOT, 'tools/v3_norm_chain_package.mjs');

const run = () => spawnSync(process.execPath, [GEN], { cwd: ROOT, encoding: 'utf8' });
const read = () => JSON.parse(readFileSync(MEASURED, 'utf8'));
const write = (j) => writeFileSync(MEASURED, JSON.stringify(j, null, 2));
const restore = () => copyFileSync(BACKUP, MEASURED);

const CASES = [
  { id: 'NCP02-01', want: 'zöld', what: 'az ÉP, mért csomag ZÖLD (pozitív ellenpár)', break: null },
  { id: 'NCP02-02', want: 'piros', what: 'ÜRES mérés — nulla mutációs tanú',
    break: () => writeFileSync(MEASURED, JSON.stringify({ mutation_results: [] })) },
  { id: 'NCP02-03', want: 'piros', what: 'ELAVULT szerződés-kötés (idegen lenyomat)',
    break: () => { const j = read(); j.norm_evidence.contract.digest = `sha256:${'0'.repeat(64)}`; write(j); } },
  { id: 'NCP02-04', want: 'piros', what: 'ELAVULT norma-index lenyomat',
    break: () => { const j = read(); j.norm_evidence.index_digest = `sha256:${'1'.repeat(64)}`; write(j); } },
  { id: 'NCP02-05', want: 'piros', what: 'EGY hiányzó láncsor',
    break: () => { const j = read(); j.norm_evidence.chain.pop(); write(j); } },
  { id: 'NCP02-06', want: 'piros', what: 'IDEGEN láncsor a mérésben',
    break: () => { const j = read(); const r = { ...j.norm_evidence.chain[0], clause_id: 'NINCS-ILYEN' }; j.norm_evidence.chain.push(r); write(j); } },
  { id: 'NCP02-07', want: 'piros', what: '„covered" NEM LÉTEZŐ falszifikáló tanúval',
    break: () => { const j = read(); const r = j.norm_evidence.chain.find((x) => x.result === 'no_evidence'); r.result = 'covered'; r.falsified_by = 'M999'; write(j); } },
  { id: 'NCP02-08', want: 'piros', what: '„covered", de a tanú NEM NEVEZI MEG az állítást',
    break: () => { const j = read(); const r = j.norm_evidence.chain.find((x) => x.result === 'covered'); const m = j.mutation_results.find((x) => x.mutation_id === r.falsified_by); m.failed_assertions = []; write(j); } },
  { id: 'NCP02-09', want: 'piros', what: 'ISMERETLEN minősítés-szó a láncon',
    break: () => { const j = read(); j.norm_evidence.chain[0].result = 'tokeletes'; write(j); } },
  { id: 'NCP02-10', want: 'piros', what: 'az INTEGRITÁS-jelzés hamis',
    break: () => { const j = read(); j.norm_evidence.integrity_ok = false; write(j); } },
  { id: 'NCP02-11', want: 'piros', what: 'NOT_FALSIFIED sort „covered"-nek átírva, tanú nélkül',
    break: () => { const j = read(); const r = j.norm_evidence.chain.find((x) => x.result === 'partially_covered'); r.result = 'covered'; delete r.falsified_by; write(j); } },
  { id: 'NCP02-12', want: 'zöld', what: 'a VISSZAÁLLÍTOTT ép csomag ISMÉT zöld (a battéria nem hagy nyomot)', break: null },
];

let fail = 0;
console.log('='.repeat(78));
console.log('NCP-02 — A CSOMAG-GENERÁTOR ELLENPÁR-BATTÉRIÁJA (a kilépési kódon mérve)');
console.log('='.repeat(78));
try {
  copyFileSync(MEASURED, BACKUP);
  for (const c of CASES) {
    restore();
    if (c.break) c.break();
    const r = run();
    const got = r.status === 0 ? 'zöld' : 'piros';
    const ok = got === c.want;
    if (!ok) fail += 1;
    const firstProblem = String(r.stderr || '').split('\n').find((l) => l.trim().startsWith('·')) || '';
    console.log(`  ${ok ? 'RENDBEN ' : 'BUKOTT  '} [${c.id}] ${c.what}`);
    console.log(`            várt: ${c.want} · mért: ${got} (kilépés ${r.status})${firstProblem ? ` ·${firstProblem.trim().slice(1)}` : ''}`);
  }
} finally {
  restore();
  rmSync(BACKUP, { force: true });
  spawnSync(process.execPath, [GEN], { cwd: ROOT });   // a csomag a MÉRT állapotból álljon helyre
}
console.log('-'.repeat(78));
console.log(fail === 0
  ? `RESULT: ${CASES.length}/${CASES.length} RENDBEN — a hazug csomag minden ágon elakad, az ép átmegy`
  : `RESULT: ${fail} BUKOTT a ${CASES.length}-ből`);
process.exit(fail === 0 ? 0 : 1);
