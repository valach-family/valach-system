import {readFileSync,writeFileSync,cpSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {openStore,clockFrom} from './source/v3ref/store.mjs';
import {redeemInvite} from './source/v3ref/invite.mjs';
import {EXPECTED_PROBES} from './source/v3ref/manifest.mjs';
import {MUTATIONS} from './source/v3ref/mutations.mjs';
import {ALL_NORMS,checkNorms,clauseDigest,contentReviewState,indexDigest,normsDigest} from './source/v3ref/norms.mjs';
import {contractDigest} from './source/v3ref/normContract.mjs';
const root=import.meta.dirname,pin=JSON.parse(readFileSync(join(root,'source-manifest.json'))).commit;
const cases=[];
function world(expires='2026-09-30T00:00:00.000Z'){const store=openStore(),clock=clockFrom('2026-09-10T10:00:00.000Z');for(const s of ['issuer','holder'])store.run('INSERT INTO subject VALUES (?,?)',s,'person');store.run('INSERT INTO book VALUES (?,?)','A','A');store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)','issuer','A','admin','2026-09-01T00:00:00.000Z');store.run('INSERT INTO external_id VALUES (?,?,?,?,?,?,?,?,NULL)','holder','email','self_asserted','n/a','holder@example.invalid','holder@example.invalid','one_to_one','2026-09-01T00:00:00.000Z');store.run('INSERT INTO account VALUES (?,?)','holder','original');store.run('INSERT INTO channel_proof VALUES (?,?,?,?)','holder','email','holder@example.invalid','2026-09-01T00:00:00.000Z');store.run('INSERT INTO invite VALUES (?,?,?,?,?,?,?,NULL)','invite','A','email','holder@example.invalid','user','issuer',expires);return{store,clock};}
async function add(id,expected,fn){try{cases.push({id,expected,...await fn()});}catch(e){cases.push({id,expected,test_error:e.stack});}}
async function copy(fn){const dir=mkdtempSync(join(tmpdir(),'r57-'));try{cpSync(join(root,'source'),dir,{recursive:true});return await fn(dir);}finally{rmSync(dir,{recursive:true,force:true});}}
function replace(file,from,to){const s=readFileSync(file,'utf8');if(s.split(from).length!==2)throw Error('Anchor must match exactly once: '+file);writeFileSync(file,s.replace(from,to));}
function run(dir,entry='run.mjs'){const r=spawnSync(process.execPath,[join(dir,'v3ref',entry),...(entry==='run.mjs'?['--json','--executed-by=ChatGPT',`--source-commit=${pin}`]:[])],{cwd:dir,encoding:'utf8',timeout:15000});if(r.error)throw r.error;return{exit:r.status,stdout:r.stdout,stderr:r.stderr,...(entry==='run.mjs'?{data:JSON.parse(r.stdout)}:{})};}
const base=run(join(root,'source'));
await add('T01','Expired offset-zone invitation denied; unexpired invitation succeeds.',()=>{const results=[];for(const expiry of ['2026-09-10T11:00:00+02:00','2026-09-30T00:00:00.000Z']){const w=world(expiry);try{results.push(redeemInvite({...w,token:'invite',actingSubjectId:'holder'}));}finally{w.store.close();}}return{pass:results[0].ok===false&&results[1].ok===true,results};});
await add('T02','Role write rejected with guards; without the write guard, redemption detects changed terms.',()=>{const results=[];for(const unguarded of [false,true]){const w=world();try{if(unguarded)w.store.run('DROP TRIGGER invite_no_change_sealed');let rejected=null;try{w.store.run("UPDATE invite SET offered_role='admin' WHERE token='invite'");}catch(e){rejected=e.message;}const result=redeemInvite({...w,token:'invite',actingSubjectId:'holder'}),membership=w.store.get("SELECT * FROM membership WHERE subject_id='holder'");results.push({unguarded,rejected,result,membership:membership??null});}finally{w.store.close();}}return{pass:!!results[0].rejected&&results[0].membership?.role==='user'&&results[1].result.ok===false&&results[1].result.reason==='invite_terms_changed'&&results[1].membership===null,results};});
await add('T03','M32 falsifies a only; M47/M48/M49 each falsify b.',async()=>{const results=[];for(const id of ['M32','M47','M48','M49'])results.push(await copy(dir=>{const m=MUTATIONS.find(m=>m.id===id);replace(join(dir,'v3ref',m.file),m.from,m.to);const r=run(dir),named=r.data.records.find(r=>r.probe_id===m.catcher);return{id,exit:r.exit,assertions:named.assertions};}));return{pass:results.every(r=>r.assertions.find(a=>a.id.includes('REV-N1b')).pass===(r.id==='M32')),results};});
await add('T04','K title change changes contract and combined digest, not index digest.',()=>copy(async dir=>{replace(join(dir,'v3ref/normContract.mjs'),"title: 'Alany, azonosító és kötés'","title: 'R57_CHANGED_TITLE'");const c=await import(join(dir,'v3ref/normContract.mjs')),n=await import(join(dir,'v3ref/norms.mjs'));return{pass:c.contractDigest()!==contractDigest()&&n.normsDigest()!==normsDigest()&&n.indexDigest()===indexDigest(),before:{contract:contractDigest(),combined:normsDigest(),index:indexDigest()},after:{contract:c.contractDigest(),combined:n.normsDigest(),index:n.indexDigest()}};}));
const writes=[
['terms-update',"UPDATE invite_terms SET offered_role='admin' WHERE token='invite'"],
['terms-delete',"DELETE FROM invite_terms WHERE token='invite'"],
['terms-replace',"INSERT OR REPLACE INTO invite_terms SELECT * FROM invite_terms WHERE token='invite'"],
['terms-upsert',"INSERT INTO invite_terms SELECT * FROM invite_terms WHERE token='invite' ON CONFLICT(token) DO UPDATE SET offered_role='admin'"],
['terms-insert-ignore',"INSERT OR IGNORE INTO invite_terms SELECT * FROM invite_terms WHERE token='invite'"],
['invite-role',"UPDATE invite SET offered_role='admin' WHERE token='invite'"],
['invite-expiry',"UPDATE invite SET expires_at='2099-01-01T00:00:00.000Z' WHERE token='invite'"],
['invite-replace',"INSERT OR REPLACE INTO invite SELECT * FROM invite WHERE token='invite'"],
['invite-upsert',"INSERT INTO invite SELECT * FROM invite WHERE token='invite' ON CONFLICT(token) DO UPDATE SET offered_role='admin'"],
['invite-insert-ignore',"INSERT OR IGNORE INTO invite SELECT * FROM invite WHERE token='invite'"],
['invite-delete',"DELETE FROM invite WHERE token='invite'"],
['invite-update-replace',"UPDATE OR REPLACE invite SET offered_role='admin' WHERE token='invite'"],
['invite-key',"UPDATE invite SET token='renamed' WHERE token='invite'"],
['terms-key',"UPDATE OR REPLACE invite_terms SET token='renamed' WHERE token='invite'"]];
await add('T05','14 DML forms cannot change issued terms, under recursive_triggers 0 and 1.',()=>{const results=[];for(const pragma of [0,1])for(const[id,sql]of writes){const w=world();try{w.store.run('PRAGMA recursive_triggers='+pragma);const before=JSON.stringify(w.store.get("SELECT * FROM invite_terms WHERE token='invite'"));let rejected=null;try{w.store.run(sql);}catch(e){rejected=e.message;}const after=JSON.stringify(w.store.get("SELECT * FROM invite_terms WHERE token='invite'")),result=redeemInvite({...w,token:'invite',actingSubjectId:'holder'}),membership=w.store.get("SELECT * FROM membership WHERE subject_id='holder'");results.push({id,pragma,rejected,pass:!!rejected&&before===after&&result.ok===true&&membership?.role==='user'});}finally{w.store.close();}}return{pass:results.every(x=>x.pass),results};});
function invented(){return EXPECTED_PROBES.filter(p=>p.discharges?.length).flatMap(p=>p.discharges.map(d=>({mutation_id:'NOT_IN_REGISTRY',applied:true,base_digest:'sha256:foreign-base',mutated_digest:'sha256:foreign-mutated',run_token:'old-run',probe_id:p.id,probe_status:'PASS',failed_assertions:[d.assertion],verdict:'SURVIVED'})));}
await add('E01','Foreign unregistered contradictory mutation results must not produce covered clauses.',()=>{const mutationResults=invented(),r=checkNorms({probes:EXPECTED_PROBES,mutations:MUTATIONS,records:base.data.records,mutationResults});return{pass:!r.chain.some(x=>x.result==='covered'),mutationResults,result:r};});
for(const[id,map,expected]of[
['E02',".map(x => ({...x, failed_assertions: []}))",'Final CLI must fail when all required clauses are not_falsified.'],
['E03',".map(x => ({...x, base_digest: 'sha256:foreign-base', run_token: 'old-run', mutation_id: 'NOT_IN_REGISTRY', verdict: 'SURVIVED', probe_status: 'PASS'}))",'Final CLI must reject foreign or contradictory results even after actual runs.']])await add(id,expected,()=>copy(dir=>{const p=join(dir,'v3ref/mutate.mjs');replace(p,'const mutationResults = results.map((r) => r.falsification).filter(Boolean);','const mutationResults = results.map((r) => r.falsification).filter(Boolean)'+map+';');const r=run(dir,'mutate.mjs');return{pass:r.exit!==0,mutation_applied:true,...r};}));
await add('E04','Hashes alone without reviewer/time/evidence binding must not create a current content review.',()=>{const clause=structuredClone(ALL_NORMS[0].clauses[0]);clause.content_review={contract_digest:contractDigest(),clause_digest:clauseDigest(clause)};const result=contentReviewState(clause);return{pass:result.state!=='current',review:clause.content_review,result};});
writeFileSync(join(root,'evidence/r56-challenge.json'),JSON.stringify({pin,node:process.version,at:new Date().toISOString(),cases},null,2)+'\n');
console.log(JSON.stringify(cases.map(({id,pass,test_error,exit})=>({id,pass,test_error,exit})),null,2));
