import {readFileSync,writeFileSync,cpSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {ALL_NORMS,contentReviewState,clauseDigest} from './source/v3ref/norms.mjs';
import {contractDigest} from './source/v3ref/normContract.mjs';
import {EXPECTED_PROBES} from './source/v3ref/manifest.mjs';
import {MUTATIONS} from './source/v3ref/mutations.mjs';
import {PROGRAMS} from './source/v3ref/external-checks/case-manifest.mjs';
const root=import.meta.dirname,src=join(root,'source'),cases=[];
const hash='sha256:'+'a'.repeat(64),bindings={source_digest:hash,manifest_digest:hash};
const catalog={assertions:new Set(EXPECTED_PROBES.flatMap(p=>(p.discharges||[]).map(d=>`${p.id}\0${d.assertion}`))),mutations:new Set(MUTATIONS.map(m=>m.id))};
const p=EXPECTED_PROBES.find(p=>p.discharges?.length),m=MUTATIONS.find(m=>m.catcher===p.id);
function clause(){const c=structuredClone(ALL_NORMS[0].clauses[0]);c.content_review={record_version:'content-review-2',reviewer:{id:'review-fixture',role:'independent-review',independent_of:'implementation-author'},at:'2026-09-01T00:00:00.000Z',contract_digest:contractDigest(),clause_digest:clauseDigest(c),...bindings,situation:'Fixture only: revoked permission.',property:'No new effect.',positive_evidence:[{kind:'probe',probe:p.id,assertion:p.discharges[0].assertion}],negative_evidence:[{kind:'mutation',mutation:m.id}],residual:'Fixture: identity and actual evidence execution are not authenticated.'};return c;}
function add(id,expected,fn){try{cases.push({id,expected,...fn()});}catch(e){cases.push({id,expected,pass:false,test_error:e.stack});}}
add('P03','Known references pass structural/current binding check but remain unauthenticated.',()=>{const result=contentReviewState(clause(),bindings,catalog);return{pass:result.state==='current'&&result.authenticity.state==='unauthenticated',result};});
add('R01','Unknown references must not become current merely by omitting the catalog.',()=>{const c=clause();c.content_review.positive_evidence=[{kind:'probe',probe:'P-DOES-NOT-EXIST',assertion:'A-DOES-NOT-EXIST'}];c.content_review.negative_evidence=[{kind:'mutation',mutation:'M-DOES-NOT-EXIST'}];const withCatalog=contentReviewState(c,bindings,catalog),withoutCatalog=contentReviewState(c,bindings);return{pass:withCatalog.state!=='current'&&withoutCatalog.state!=='current',withCatalog,withoutCatalog};});
add('R02','Unresolved document strings cannot count as resolved evidence, even with a catalog.',()=>{const c=clause();c.content_review.positive_evidence=[{kind:'document',ref:'NONEXISTENT-R61-POSITIVE',note:'Invented positive reference.'}];c.content_review.negative_evidence=[{kind:'document',ref:'NONEXISTENT-R61-NEGATIVE',note:'Invented negative reference.'}];const result=contentReviewState(c,bindings,catalog);return{pass:result.state!=='current',result};});
add('R03','Without detailed evidence files, a full set of stdout-only pass summaries is not complete evidence.',()=>{const dir=mkdtempSync(join(tmpdir(),'r61-'));try{cpSync(src,dir,{recursive:true});for(const p of PROGRAMS)writeFileSync(join(dir,'v3ref/external-checks',p.file),'console.log('+JSON.stringify(JSON.stringify(p.cases.map(id=>({id,pass:true}))))+');\n');const out=join(dir,'out');const r=spawnSync(process.execPath,[join(dir,'v3ref/external-checks/run-all.mjs'),'--out',out],{cwd:dir,encoding:'utf8',timeout:15000});if(r.error)throw r.error;const result=JSON.parse(readFileSync(join(out,'external-checks-result.json')));return{pass:r.status!==0&&result.verdict?.complete_evidence!==true,exit:r.status,result,stdout:r.stdout,stderr:r.stderr};}finally{rmSync(dir,{recursive:true,force:true});}});
for (const [id,cat] of [['U01',undefined],['U02',{mutations:catalog.mutations}],['U03',{assertions:catalog.assertions}],['U04',{assertions:[],mutations:catalog.mutations}]]) add(id,'Missing or mistyped required catalog must remain unresolved and unauthenticated.',()=>{const result=contentReviewState(clause(),bindings,cat);return {pass:result.state==='unresolved'&&result.authenticity.state==='unauthenticated',result};});
writeFileSync(join(root,'evidence/r60-challenge.json'),JSON.stringify({pin:JSON.parse(readFileSync(join(root,'source-manifest.json'))).commit,node:process.version,cases},null,2)+'\n');
console.log(JSON.stringify(cases.map(({id,pass,test_error})=>({id,pass,test_error})),null,2));

process.exitCode=cases.every(c=>c.pass)?0:1;

