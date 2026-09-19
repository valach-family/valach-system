// ADAPTÁCIÓ (chatgpt-v3 R8 §3 hozzájárulásával): a battéria egység-DARABSZÁMA konfigurálható
// futtatási paraméter, alapértéke 6. MIÉRT: a mutációs battéria 134 mutációra nőtt, és a korábban
// rögzített HÁRMAS darabolásnál minden egység ~12,0–12,4 s — a `v3ref/mutate.mjs` SAJÁT
// költségvetése (12 000 ms = a külső 15 000 ms-os korlát 80%-a) fölött —, ezért a battéria
// 1-gyel lépett ki, miközben a MÉRT TARTALOM tiszta volt
// (134/134 elkapva). A darabszám a hívás alakja, nem az elvárás: egyetlen eset, mutáció, elvárás,
// forráskötés és az időkeret-érvényesítés sem változik. Felülírható: VS_BATTERY_UNITS.
// A DARABSZÁM SZÁRMAZTATVA, NEM KÉZZEL (R52 — a KUKA-045 alakja ezen a hívó-oldalon). Az eredeti
// alak a hatos darabszámot LITERÁLKÉNT hordozta; a battéria azóta 185 mutációra nőtt, és MÉRVE a
// 2/6 szelet 12 388 ms-ot kért — a `mutate.mjs` SAJÁT költségvetése (12 000 ms) fölött. A hívás
// ezért 1-gyel zárult, és a `--merge` is, miközben a TARTALOM tiszta volt. A szám helyére a tool
// SAJÁT szabálya lép (ugyanaz, amit a `--units-auto` használ: egység-méret 24), tehát a hívó a
// battéria növekedésével magától finomodik. A `VS_BATTERY_UNITS` felülírás VÁLTOZATLAN, a padló a
// korábbi alapérték (6), és a hívás ALAKJA sem változik: N egység + `--merge`, egységenként 15 000 ms.
const BATTERY_UNITS=(()=>{const v=Number(process.env.VS_BATTERY_UNITS);if(Number.isInteger(v)&&v>=1&&v<=64)return v;return Math.max(6,Math.ceil(MUTATIONS.length/24));})();
function batteryArgs(n){const a=[];for(let i=1;i<=n;i++)a.push(`--unit=${i}/${n}`);a.push('--merge');return a;}
function runBatteryUnits(dir){
  const unitsDir=join(dir,'v3ref','units');rmSync(unitsDir,{recursive:true,force:true});
  const runs=[];
  for(const arg of batteryArgs(BATTERY_UNITS)){
    const r=spawnSync(process.execPath,[join(dir,'v3ref','mutate.mjs'),arg],{cwd:dir,encoding:'utf8',timeout:15000,maxBuffer:32*1024*1024});
    if(r.error)throw r.error;runs.push({arg,exit:r.status,stdout:r.stdout,stderr:r.stderr});
  }
  return {exit:runs.some(r=>r.exit!==0)?(runs.find(r=>r.exit!==0).exit??2):0,stdout:runs.map(r=>r.stdout).join('\n'),stderr:runs.map(r=>r.stderr).join('\n'),units:runs};
}
import {readFileSync,writeFileSync,cpSync,mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {checkNorms,ALL_NORMS,contentReviewState,clauseDigest} from './source/v3ref/norms.mjs';
import {contractDigest} from './source/v3ref/normContract.mjs';
import {EXPECTED_PROBES} from './source/v3ref/manifest.mjs';
import {MUTATIONS} from './source/v3ref/mutations.mjs';
const root=import.meta.dirname,src=join(root,'source'),cases=[];
const pin=JSON.parse(readFileSync(join(root,'source-manifest.json'))).commit;
function run(dir,entry,args=[]){if(entry==='mutate.mjs')return runBatteryUnits(dir);const r=spawnSync(process.execPath,[join(dir,'v3ref',entry),...args],{cwd:dir,encoding:'utf8',timeout:15000,maxBuffer:32*1024*1024});if(r.error)throw r.error;return{exit:r.status,stdout:r.stdout,stderr:r.stderr};}
function copy(fn){const dir=mkdtempSync(join(tmpdir(),'r59-'));try{cpSync(src,dir,{recursive:true});return fn(dir);}finally{rmSync(dir,{recursive:true,force:true});}}
function replace(path,from,to){const s=readFileSync(path,'utf8');if(s.split(from).length!==2)throw Error('Anchor not unique: '+from);writeFileSync(path,s.replace(from,to));}
function add(id,expected,fn){try{cases.push({id,expected,...fn()});}catch(e){cases.push({id,expected,pass:false,test_error:e.stack});}}
const reference=run(src,'run.mjs',['--json']);const base=JSON.parse(reference.stdout);
writeFileSync(join(root,'evidence/reference.json'),JSON.stringify(reference,null,2));
const batt=run(src,'mutate.mjs');const measured=JSON.parse(readFileSync(join(src,'v3ref/v3ref-mutation-result.json')));
writeFileSync(join(root,'evidence/battery.json'),JSON.stringify({process:batt,result:measured},null,2));
const expectation={base_digest:measured.base_digest,run_tokens:Object.fromEntries(measured.mutation_results.map(x=>[x.mutation_id,x.run_token])),mutated_digests:Object.fromEntries(measured.mutation_results.map(x=>[x.mutation_id,x.mutated_digest]))};
function gate(results,exp){const r=checkNorms({probes:EXPECTED_PROBES,mutations:MUTATIONS,records:base.records,mutationResults:results,expectation:exp});return{ok:r.ok,required:r.required,covered:r.chain.filter(x=>x.result==='covered').map(x=>x.clause_id)};}
add('P01','Untouched reference and battery pass; complete genuine evidence is accepted.',()=>{const result=gate(measured.mutation_results,expectation);return{pass:reference.exit===0&&batt.exit===0&&measured.clean&&result.required.ok,result};});
add('E05','Every missing expectation component rejects evidence, including an empty expectation object.',()=>{const rows=[];for(const missing of ['base_digest','run_tokens','mutated_digests','ALL']){const exp=structuredClone(expectation);if(missing==='ALL')for(const k of Object.keys(exp))delete exp[k];else delete exp[missing];const results=measured.mutation_results.map(x=>({...x,...(missing==='base_digest'||missing==='ALL'?{base_digest:'sha256:foreign-base'}:{}),...(missing==='run_tokens'||missing==='ALL'?{run_token:'old-run'}:{}),...(missing==='mutated_digests'||missing==='ALL'?{mutated_digest:'sha256:foreign-mutated'}:{})}));const result=gate(results,exp);rows.push({missing,pass:result.covered.length===0,result});}return{pass:rows.every(x=>x.pass),rows};});
add('E06','Missing verdict or probe status does not qualify as falsification.',()=>{const rows=[];for(const key of ['verdict','probe_status']){const results=measured.mutation_results.map(x=>{const r={...x};delete r[key];return r;});const result=gate(results,expectation);rows.push({key,pass:result.covered.length===0,result});}return{pass:rows.every(x=>x.pass),rows};});
add('E07','The full CLI rejects foreign evidence even when the parent expectation object is empty.',()=>copy(dir=>{replace(join(dir,'v3ref/mutate.mjs'),'const mutationResults = results.map((r) => r.falsification).filter(Boolean);',"const mutationResults = results.map((r) => r.falsification).filter(Boolean).map(x => ({...x,base_digest:'sha256:foreign-base',mutated_digest:'sha256:foreign-mutated',run_token:'old-run'}));");replace(join(dir,'v3ref/mutate.mjs'),'records: base.records, mutationResults, expectation,','records: base.records, mutationResults, expectation: {},');const process=run(dir,'mutate.mjs'),result=JSON.parse(readFileSync(join(dir,'v3ref/v3ref-mutation-result.json')));return{pass:process.exit!==0,process,required:result.norm_evidence?.required??null,clean:result.clean};}));
add('E08','The external runner rejects a truncated result with only T01 and rejects duplicate T01 results.',()=>{const rows=[];for(const count of [1,9])rows.push(copy(dir=>{writeFileSync(join(dir,'v3ref/external-checks/r57_chatgpt-v3.mjs'),`console.log(JSON.stringify(${JSON.stringify(Array.from({length:count},()=>({id:'T01',pass:true})))}));\n`);const out=join(dir,'out'),process=run(dir,'external-checks/run-all.mjs',['--only','r57','--out',out]),result=JSON.parse(readFileSync(join(out,'external-checks-result.json')));return{count,pass:process.exit!==0,process,result};}));return{pass:rows.every(x=>x.pass),rows};});
add('P02','Missing R32 artifact and one altered byte both reject with their named errors.',()=>{const rows=[];for(const mode of ['missing','byte'])rows.push(copy(dir=>{const file=join(dir,'v3ref/source-documents/R32_board_v1.md');if(mode==='missing')rmSync(file);else{const b=readFileSync(file);b[0]^=1;writeFileSync(file,b);}const process=run(dir,'run.mjs',['--json']),code=mode==='missing'?'NORM_SOURCE_ARTIFACT_MISSING':'NORM_SOURCE_ARTIFACT_MISMATCH';return{mode,pass:process.exit!==0&&process.stderr.includes(code),process};}));return{pass:rows.every(x=>x.pass),rows};});
add('E09','Invalid field types, an invalid timestamp and empty evidence cannot yield a current review.',()=>{const clause=structuredClone(ALL_NORMS[0].clauses[0]);const bindings={source_digest:measured.base_digest,manifest_digest:'sha256:fixture-manifest'};clause.content_review={reviewer:{id:[],role:{},independent_of:[]},at:'not-a-date',contract_digest:contractDigest(),clause_digest:clauseDigest(clause),...bindings,situation:[],property:{},positive_evidence:[],negative_evidence:[],residual:[]};const result=contentReviewState(clause,bindings);return{pass:result.state!=='current',record:clause.content_review,result,note:'Structural test only; no claim of authenticated reviewer provenance.'};});
writeFileSync(join(root,'evidence/r58-challenge.json'),JSON.stringify({pin,node:process.version,at:new Date().toISOString(),cases},null,2)+'\n');
console.log(JSON.stringify(cases.map(({id,pass,test_error})=>({id,pass,test_error})),null,2));

