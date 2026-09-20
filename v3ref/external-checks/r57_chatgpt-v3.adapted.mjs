// ADAPTÁCIÓ R63 (adaptált burkoló, közvetlenül szerkesztve · forrás: CMD-VS-300-002-002 R63 §4,
// `v3ref/source-documents/R63_board_v1.md`): a `world()` próba-meghívója NEVEZETT, rögzített felhatalmazási
// alap alatt, a rendszer SAJÁT kiadóján születik — a nyers `INSERT INTO invite VALUES (…)` helyett
// `recordAuthorityBasis(…)` (`authorityBasis.mjs`, BAS-01: `allowedOperations: [invite_issue]` ·
// `allowedRoles: ['user']` (a kínált szerep) · `allowedScopes: ['keszlet']` · `evidenceRef:
// 'synthetic:R63-adaptation'`) + `issueInviteUnderBasis(…)` (`basisLimit.mjs`, BLI-01, `scope: 'keszlet'`),
// UGYANAZOKKAL a meghívó-mezőkkel (token `invite` · könyv `A` · cím `holder@example.invalid` · szerep `user` ·
// kiadó `issuer` · a HÍVÓ által adott lejárat), UGYANAZON az órán (a fixtúra órája, 2026-09-10T10:00:00.000Z).
// Mindkét hívás `.ok`-ját a fixtúra ELLENŐRZI, és bukásnál az INDOKKAL dob, hogy egy fixtúra-hiba nevezett
// `test_error`-ként jelenjen meg, ne néma „nem"-ként (KUKA-020). A művelet nevét a szerződéstől kérdezzük
// (`INVITE_ISSUE_OPERATION`), nem gépeljük le (KUKA-036).
//
// MIÉRT: az R63 két szabályt szigorított a magreferenciában. (A) `grantAdjudicationAuthority`
// (`adjudication.mjs`) alap NÉLKÜL DOB (`basis_id_required`), és `authorityRowAt` (`authority.mjs`) az
// alap nélküli (`basis_id` NULL) hatáskör-sort NEM használja (`authority_without_recorded_basis`) —
// „Bírálati/felülvizsgálati hatáskör: nevezett, erre jogosult delegáló vagy külön védett
// rendszerüzemeltetői kiinduló szabály kell." (B) `redeemInvite` (`invite.mjs` 3/b · `basisLimit.mjs`
// `redemptionLimitGate`) az `invite_basis` pecsét nélküli meghívót ELUTASÍTJA (`invite_without_basis`,
// `no_declared_basis`) — „Nyers tárolói írással keletkezett, alap nélküli meghívó vagy hatáskör nem
// kerülheti meg az új használati határt." Ez a program az R63 ELŐTT született, és a `world()` fixtúrája
// nyers INSERT-tel írta a meghívót, pecsét nélkül — ezért az R63 után a beváltásra épülő HÁROM eset a
// fixtúrában, a mért kérdés előtt bukott el (MÉRVE, az adaptáció ELŐTT: T01 · T02 · T05
// `invite_without_basis` / `no_declared_basis`; a T03 · T04 · E01 · E04 meghívót nem vált be, az zöld
// maradt; az E02 · E03 a mérés gépén a battéria 15 000 ms-os egység-korlátján akadt el —
// `spawnSync … ETIMEDOUT`, KÖRNYEZETI akadály, nem az R63 két szabálya: a futtató utolsó, R63 előtti
// eredményében (results/, 2026-09-20 07:41) mind a kilenc zöld volt; a kilencből ELŐTTE passed 4 /
// failed 5). A piros tehát ELAVULT ELŐFELTÉTEL, nem a mért tulajdonság kudarca és nem termékhiba —
// és NEM nevezzük visszamenőleg zöldnek: a szigorítás marad, a TESZT-ELŐFELTÉTEL változik.
//
// AZ (A) SZABÁLY ERRE A PROGRAMRA NEM VONATKOZIK, KIMONDVA: bírálati hatáskört nem ad és nem használ.
//
// AMI NEM VÁLTOZOTT: egyetlen eset-azonosító (T01–T05 · E01–E04), elvárás, óra (2026-09-10T10:00:00.000Z
// és a T01 két lejárata — az offset-zónás LEJÁRT és a nyílt), negatív ág (T01 lejárt ága · T02 elutasított
// UPDATE-je és a `invite_no_change_sealed` elvétele utáni `invite_terms_changed` ága · T05 mind a 14 DML
// alakja a `recursive_triggers` 0 és 1 alatt · E01–E04 kapu-megkerülései), a T03 mutáció-ellenpárja, a
// T04 lenyomat-mérése, a battéria darabolt hívása (R81 §5 · R8 §3 · R52, lentebb), az
// `evidence/r56-challenge.json` alakja és a kimenet sem. A T02 őr nélküli ágán a nyers
// `UPDATE invite SET offered_role='admin'` SZÁNDÉKOS marad: az a pecsét-eltérés TÉNYÉT állítja elő, és a
// beváltás az (1/b) ponton — a 3/b alap-kapu ELŐTT — fogja meg, tehát az elvárt válasz
// (`invite_terms_changed`) az R63 után is ugyanaz. A T05 14 nyers DML-je ugyanígy SZÁNDÉKOS: azok a
// KIADOTT feltétel átírhatatlanságát támadják, és a tároló őrei utasítják el őket — a pecsét mellettük
// érintetlen marad. A kiadás a rendszer SAJÁT íróin megy (recordAuthorityBasis · issueInviteUnderBasis),
// tehát a kiadási korlát-kapu is fut — nem kiskapu, hanem a GPR-01 `measurement_fixture` használat.
// AZ EREDETI VÁLTOZAT ÉRINTETLEN ÉS TOVÁBBRA IS FUT: `r57_chatgpt-v3.mjs` (történeti forrás, a nyers
// INSERT-tel — ott a három eset az R63 után NEVEZETTEN piros, és ezt nem takarjuk el).
//
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
import {readFileSync,writeFileSync,cpSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {openStore,clockFrom} from './source/v3ref/store.mjs';
import {redeemInvite} from './source/v3ref/invite.mjs';
import {recordAuthorityBasis} from './source/v3ref/authorityBasis.mjs';
import {issueInviteUnderBasis,INVITE_ISSUE_OPERATION} from './source/v3ref/basisLimit.mjs';
import {EXPECTED_PROBES} from './source/v3ref/manifest.mjs';
import {MUTATIONS} from './source/v3ref/mutations.mjs';
import {ALL_NORMS,checkNorms,clauseDigest,contentReviewState,indexDigest,normsDigest} from './source/v3ref/norms.mjs';
import {contractDigest} from './source/v3ref/normContract.mjs';
const root=import.meta.dirname,pin=JSON.parse(readFileSync(join(root,'source-manifest.json'))).commit;
const cases=[];
// ADAPTÁCIÓ R63 (B): a próba-meghívó felhatalmazási alapja — egy nevezett azonosító, egy bizonyíték-hivatkozás, egy adatkör (KUKA-036: egy fogalom, egy képző).
const BASIS=Object.freeze({id:'synthetic:R63-adaptation:A',evidence:'synthetic:R63-adaptation',scope:'keszlet'});
function world(expires='2026-09-30T00:00:00.000Z'){const store=openStore(),clock=clockFrom('2026-09-10T10:00:00.000Z');for(const s of ['issuer','holder'])store.run('INSERT INTO subject VALUES (?,?)',s,'person');store.run('INSERT INTO book VALUES (?,?)','A','A');store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)','issuer','A','admin','2026-09-01T00:00:00.000Z');store.run('INSERT INTO external_id VALUES (?,?,?,?,?,?,?,?,NULL)','holder','email','self_asserted','n/a','holder@example.invalid','holder@example.invalid','one_to_one','2026-09-01T00:00:00.000Z');store.run('INSERT INTO account VALUES (?,?)','holder','original');store.run('INSERT INTO channel_proof VALUES (?,?,?,?)','holder','email','holder@example.invalid','2026-09-01T00:00:00.000Z');/* ADAPTÁCIÓ R63 (B): a meghívó NEVEZETT alap alatt, a rendszer SAJÁT kiadóján születik — a régi nyers `INSERT INTO invite VALUES (…)` helyett. A mezők, a token és az óra ugyanazok. */const at=clock.now();const basis=recordAuthorityBasis({store,basisId:BASIS.id,bookId:'A',issuerSubject:'issuer',effectiveAt:at,recordedAt:at,allowedOperations:[INVITE_ISSUE_OPERATION],allowedRoles:['user'],allowedScopes:[BASIS.scope],evidenceRef:BASIS.evidence});if(!basis.ok)throw new Error('R63 adaptation: az alap nem rögzíthető — '+basis.reason);const issued=issueInviteUnderBasis({store,token:'invite',bookId:'A',inviteeNamespace:'email',inviteeValue:'holder@example.invalid',offeredRole:'user',issuerSubject:'issuer',expiresAt:expires,basisId:BASIS.id,scope:BASIS.scope,issuedAt:at});if(!issued.ok)throw new Error('R63 adaptation: a meghívó nem adható ki az alap alatt — '+issued.reason);return{store,clock};}
async function add(id,expected,fn){try{cases.push({id,expected,...await fn()});}catch(e){cases.push({id,expected,test_error:e.stack});}}
async function copy(fn){const dir=mkdtempSync(join(tmpdir(),'r57-'));try{cpSync(join(root,'source'),dir,{recursive:true});return await fn(dir);}finally{rmSync(dir,{recursive:true,force:true});}}
function replace(file,from,to){const s=readFileSync(file,'utf8');if(s.split(from).length!==2)throw Error('Anchor must match exactly once: '+file);writeFileSync(file,s.replace(from,to));}
function run(dir,entry='run.mjs'){if(entry==='mutate.mjs')return runBatteryUnits(dir);const r=spawnSync(process.execPath,[join(dir,'v3ref',entry),...(entry==='run.mjs'?['--json','--executed-by=ChatGPT',`--source-commit=${pin}`]:[])],{cwd:dir,encoding:'utf8',timeout:15000});if(r.error)throw r.error;return{exit:r.status,stdout:r.stdout,stderr:r.stderr,...(entry==='run.mjs'?{data:JSON.parse(r.stdout)}:{})};}
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

