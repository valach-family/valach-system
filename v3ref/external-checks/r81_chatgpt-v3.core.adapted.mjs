// ADAPTÁCIÓ (chatgpt-v3 R35 §„Meghozott döntések" 1. pontjának kimondott engedélyével): a TESZTADAT
// mennyiség-literáljai kanonikus decimális SZÖVEGRE állnak — `qty:1` → `qty:'1'`, `qty:2` → `qty:'2'`.
//
// MIÉRT: a kiadási osztályozó az MNY-01 (R8 §2) óta kanonikus decimális szöveget követel, mert a
// lebegőpontos alak a 0,1-et sem ábrázolja pontosan; a séma a beágyazott alakra és a tömb elemeire is
// szól (R79/F01). Ez a program az MNY-01 ELŐTT született, ezért a szám-alak ma NEVEZETT elutasításba
// fut (`result_shape_type_mismatch`) — a lelet tehát ELAVULT ELVÁRÁS volt, nem termékhiba; mérve:
// `npm run proof:mny01-form` (7/7 ellenpár).
//
// AMI NEM VÁLTOZOTT: egyetlen eset, elvárás, negatív/jogosultsági/beágyazott/időhatár-ellenőrzés,
// forráskötés és kilépési szerződés sem. Az Infinity és az objektum alakú negatív bemenet NEM lett
// „javítandó" szöveggé — azok szándékos hibás alakok, és úgy is maradnak (R35 kikötése).
// AZ EREDETI VÁLTOZAT ÉRINTETLEN ÉS TOVÁBBRA IS FUT: `r81_chatgpt-v3.core.mjs` (történeti forrás).
import assert from 'node:assert/strict';import fs from 'node:fs';import {openStore,clockFrom} from './source/v3ref/store.mjs';import {submitCommand,readCommandResult} from './source/v3ref/command.mjs';import {rightAt} from './source/v3ref/authz.mjs';
const T='2026-09-14T08:00:00.000Z',END='2026-09-14T08:00:01.000Z',LATE='2026-09-14T08:00:02.000Z',cases=[];
function test(id,fn){const store=openStore(),clock=clockFrom(T);try{store.run('INSERT INTO subject VALUES (?,?)','member','person');store.run('INSERT INTO book VALUES (?,?)','a','A');store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)','member','a','user',T);fn({store,clock});cases.push({id,pass:true});}catch(e){cases.push({id,pass:false,error:e.message});}finally{store.close();}}
for(const [id,result,ok]of [['P01-pure-lines',{lines:[{qty:'1',sku:'A'},{qty:'2'}]},true],['P02-second-line-price',{lines:[{qty:'1'},{qty:'2',unit_price:5}]},false],['P03-deep-unknown',{lines:[{qty:'1',secret:'x'}]},false],['P04-nonfinite',{qty:Infinity},false]])test(id,({store,clock})=>{store.run('INSERT INTO subject_ban(subject_id,kind,cause,target_ref,actor_subject_id,banned_at) VALUES(?,?,?,?,?,?)','member','data_scope','data_scope_withdrawn','arak','member',T);const s=submitCommand({store,clock,actor:'member',bookId:'a',idemKey:'x',type:'stock.receipt',typeVersion:'1',declared:{qty:'1'},resolve:()=>result,credentials:{dataScope:'keszlet'}});const r=s.ok?readCommandResult({store,clock,requester:'member',actor:'member',bookId:'a',idemKey:'x',credentials:{dataScope:'keszlet'}}):s;assert.equal(r.ok,ok,JSON.stringify(r));});
for(const mode of ['before','after','cross'])test(`F04-release-time-${mode}`,({store,clock})=>{assert(submitCommand({store,clock,actor:'member',bookId:'a',idemKey:'x',type:'stock.receipt',typeVersion:'1',declared:{qty:'1'},resolve:()=>({qty:'1'})}).ok);store.run('UPDATE membership SET revoked_at=?',END);let n=0;const c={now:()=>mode==='before'?T:mode==='after'?LATE:++n<=3?T:LATE};const r=readCommandResult({store,clock:c,requester:'member',actor:'member',bookId:'a',idemKey:'x'});const row=store.get('SELECT * FROM disclosure ORDER BY id DESC LIMIT 1');if(mode==='before')assert(r.ok);else if(mode==='after')assert(!r.ok);else assert(!r.ok||rightAt({store,subjectId:'member',bookId:'a',opClass:'own_book',clock:clockFrom(row.at)}).allowed,JSON.stringify({calls:n,result:r,disclosure:row}));});
fs.writeFileSync(new URL('./evidence/core-challenge.json',import.meta.url),JSON.stringify({cases,passed:cases.filter(x=>x.pass).length,failed:cases.filter(x=>!x.pass).length},null,2));console.log(cases);

process.exitCode=cases.some(x=>!x.pass)?1:0;

