import fs from 'node:fs';
import {openStore,clockFrom} from './source/v3ref/store.mjs';
import {grantAdjudicationAuthority} from './source/v3ref/adjudication.mjs';
import {redeemInvite} from './source/v3ref/invite.mjs';
import {membershipAsOf,recordRetroactiveInvalidity,reviewCircleState} from './source/v3ref/bitemporal.mjs';
const cases=[],JAN='2026-01-01T00:00:00.000Z',MAR='2026-03-01T00:00:00.000Z',JUN='2026-06-01T00:00:00.000Z',AUG='2026-08-01T00:00:00.000Z';
function world(granted=JAN){const store=openStore();for(const id of ['member','judge'])store.run('INSERT INTO subject VALUES (?,?)',id,'person');store.run('INSERT INTO book VALUES (?,?)','a','A');store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)','member','a','user',granted);grantAdjudicationAuthority({store,clock:clockFrom(JAN),subjectId:'judge',bookId:'a',operation:'alter_right'});return store;}
function test(id,fn){const store=world(id.startsWith('F01')?JUN:JAN);try{cases.push({id,...fn(store)});}catch(e){cases.push({id,pass:false,harness_error:e.message});}finally{store.close();}}
test('P01-known-grant',store=>{const r=membershipAsOf({store,subjectId:'member',bookId:'a',validAt:MAR,knownAt:MAR});return{pass:r.effective===true,result:r};});
test('F01-grant-not-known-at-query',store=>{
  store.run('DELETE FROM membership WHERE subject_id = ?','member');
  store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)','judge','a','admin',JAN);
  store.run('INSERT INTO account VALUES (?,?)','member','synthetic-credential');
  store.run('INSERT INTO external_id (subject_id,namespace,issuer,jurisdiction,value_raw,value_norm,cardinality,valid_from,valid_to) VALUES (?,?,?,?,?,?,?,?,NULL)','member','email','self_asserted','n/a','member@example.invalid','member@example.invalid','one_to_one',JAN);
  store.run('INSERT INTO channel_proof (subject_id,namespace,value_norm,proven_at) VALUES (?,?,?,?)','member','email','member@example.invalid',JUN);
  store.run('INSERT INTO invite (token,book_id,invitee_namespace,invitee_value,offered_role,issuer_subject,expires_at,redeemed_at) VALUES (?,?,?,?,?,?,?,NULL)','synthetic-invite','a','email','member@example.invalid','user','judge','2026-09-30T00:00:00.000Z');
  const query={store,subjectId:'member',bookId:'a',validAt:AUG,knownAt:MAR};
  const before=membershipAsOf(query);
  const grant=redeemInvite({store,clock:clockFrom(JUN),token:'synthetic-invite',actingSubjectId:'member'});
  if(!grant.ok)throw Error('grant fixture failed '+JSON.stringify(grant));
  const after=membershipAsOf(query),today=membershipAsOf({...query,knownAt:JUN});
  return{pass:before.effective===false&&after.effective===false&&today.effective===true,before,after,today,grant};
});
test('P02-retro-evidence-persists',store=>{const ref='doc:retro-proof';const r=recordRetroactiveInvalidity({store,clock:clockFrom(JUN),subjectId:'member',bookId:'a',actorSubjectId:'judge',effectiveAt:MAR,evidenceRef:ref});const c=reviewCircleState({store,circleId:r.review_circle_id});return{pass:r.ok&&c.basis.evidence_ref===ref,result:r};});
test('F02-future-evidence-persists',store=>{const ref='doc:future-proof';const r=recordRetroactiveInvalidity({store,clock:clockFrom(JUN),subjectId:'member',bookId:'a',actorSubjectId:'judge',effectiveAt:AUG,evidenceRef:ref});const tables=store.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");const locations=tables.filter(t=>JSON.stringify(store.all('SELECT * FROM '+t.name)).includes(ref)).map(t=>t.name);return{pass:r.ok&&locations.length>0,result:r,evidence_locations:locations};});
fs.writeFileSync(new URL('./evidence/core-r85.json',import.meta.url),JSON.stringify({cases},null,2));console.log(JSON.stringify(cases,null,2));process.exitCode=cases.some(x=>!x.pass)?1:0;