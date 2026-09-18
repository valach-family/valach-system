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
  // ── R39 — A KÜLSŐ ELLENŐRZŐ FÉL NYOLC ELLENPÉLDÁJA ──────────────────────────────────────────
  // Mind a nyolc ÁTMENT a korábbi alakon, VÁLTOZATLAN összesítővel (70/13/0/10, kilépés 0). A
  // javítás két része: (a) a mérés a MAI forrás lenyomatához kötve; (b) a KANONIKUS ítélő
  // (`checkNorms`) ÚJRAFUTTATVA a battéria eltett bemenetével, és a beadott vetület EHHEZ mérve.
  { id: 'NCP02-13', want: 'piros', what: 'a felső base_digest idegen — a mérés nem a mai forráson készült',
    break: () => { const j = read(); j.base_digest = `sha256:${'0'.repeat(64)}`; write(j); } },
  { id: 'NCP02-14', want: 'piros', what: 'MINDEN mutáció base_digest mezője idegen',
    break: () => { const j = read(); for (const r of j.mutation_results) r.base_digest = `sha256:${'0'.repeat(64)}`; write(j); } },
  { id: 'NCP02-15', want: 'piros', what: 'MINDEN mutáció `applied:false` — a próba el sem végződött',
    break: () => { const j = read(); for (const r of j.mutation_results) r.applied = false; write(j); } },
  { id: 'NCP02-16', want: 'piros', what: 'a próba-állapot PASS-ra írva, miközben CAUGHT marad',
    break: () => { const j = read(); for (const r of j.mutation_results) r.probe_status = 'PASS'; write(j); } },
  { id: 'NCP02-17', want: 'piros', what: 'a RÉSZLEGES sorok tanúja nem létező mutáció (M999)',
    break: () => { const j = read(); for (const r of j.norm_evidence.chain) if (r.result === 'partially_covered') r.falsified_by = 'M999'; write(j); } },
  { id: 'NCP02-18', want: 'piros', what: 'a szervezeti mutációk SURVIVED-ra írva, a részleges sorok mégis megmaradnak',
    break: () => {
      const j = read();
      const ids = new Set(['M116', 'M117', 'M118', 'M119', 'M120', 'M121', 'M122', 'M123',
        'M127', 'M128', 'M129', 'M130', 'M131', 'M132', 'M133', 'M134', 'M135', 'M136', 'M137']);
      for (const r of j.mutation_results) if (ids.has(r.mutation_id)) { r.verdict = 'SURVIVED'; r.probe_status = 'PASS'; r.failed_assertions = []; }
      write(j);
    } },
  { id: 'NCP02-19', want: 'piros', what: 'egy RÉSZLEGES sor CÍMKÉJE „covered"-re írva (a kanonikus részlegesség felülírása)',
    break: () => { const j = read(); for (const r of j.norm_evidence.chain) if (r.clause_id === 'K05-DSC-c') r.result = 'covered'; write(j); } },
  { id: 'NCP02-20', want: 'piros', what: 'ELAVULT KÓD, régi méréssel: az F37-02 hibás alakja visszaáll',
    // EZ A LEGSÚLYOSABB ESET, és forrás-fájlt ront — ezért a saját helyreállítása is itt áll.
    breakSource: {
      file: 'v3ref/inputSchema.mjs',
      from: "  if (typeof operation !== 'string') return null;\n"
        + "  if (!Object.prototype.hasOwnProperty.call(OPERATION_SCHEMAS, operation)) return null;\n"
        + "  const found = OPERATION_SCHEMAS[operation];\n"
        + "  return found && typeof found === 'object' && found.fields ? found : null;",
      to: '  return OPERATION_SCHEMAS[operation] || null;',
    } },
  { id: 'NCP02-21', want: 'zöld', what: 'a VISSZAÁLLÍTOTT ép csomag ISMÉT zöld (a battéria nem hagy nyomot)', break: null },
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
    let srcPath = null; let srcBefore = null;
    if (c.breakSource) {
      srcPath = join(ROOT, c.breakSource.file);
      srcBefore = readFileSync(srcPath, 'utf8');
      if (!srcBefore.includes(c.breakSource.from)) {
        console.log(`  BUKOTT   [${c.id}] a forrás-horgony NEM található — a rontás nem hajtható végre`);
        fail += 1;
        continue;
      }
      writeFileSync(srcPath, srcBefore.replace(c.breakSource.from, c.breakSource.to));
    }
    const r = run();
    if (srcPath) writeFileSync(srcPath, srcBefore);   // a forrás AZONNAL visszaáll
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
