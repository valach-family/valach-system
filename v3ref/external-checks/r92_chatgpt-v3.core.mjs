import {openStore,clockFrom} from './v3ref/store.mjs';
import {grantMembership} from './v3ref/bitemporal.mjs';
import {recordAuthorityBasis} from './v3ref/authorityBasis.mjs';
import {issueInviteUnderBasis} from './v3ref/basisLimit.mjs';
import {redeemInvite} from './v3ref/invite.mjs';
const at='2026-03-01T00:00:00.000Z';
for(const [id,ops,scopes,extra] of [
 ['F01',['suspend'],['stock'],{scope:'stock',operation:'suspend'}],
 ['F02',['invite_issue'],[],{}]
]){
 const store=openStore();
 try{
  store.run('INSERT INTO book VALUES (?,?)','a','A');
  for(const s of ['issuer','target'])
   store.run('INSERT INTO subject VALUES (?,?)',s,'person');
  grantMembership({store,subjectId:'issuer',bookId:'a',role:'admin',at});
  store.run('INSERT INTO external_id VALUES (?,?,?,?,?,?,?,?,NULL)',
   'target','email','self_asserted','n/a','x@example.invalid',
   'x@example.invalid','one_to_one',at);
  store.run('INSERT INTO account VALUES (?,?)','target','synthetic');
  store.run('INSERT INTO channel_proof VALUES (?,?,?,?)',
   'target','email','x@example.invalid',at);
  recordAuthorityBasis({store,basisId:'b',bookId:'a',
   issuerSubject:'issuer',effectiveAt:at,recordedAt:at,
   allowedOperations:ops,allowedRoles:['user'],allowedScopes:scopes,
   evidenceRef:'doc:test'});
  const issue=issueInviteUnderBasis({store,token:'t',bookId:'a',
   inviteeNamespace:'email',inviteeValue:'x@example.invalid',
   offeredRole:'user',issuerSubject:'issuer',
   expiresAt:'2026-12-31T00:00:00.000Z',basisId:'b',issuedAt:at,...extra});
  const redeem=redeemInvite({store,token:'t',actingSubjectId:'target',
   clock:clockFrom(at)});
  const membership=store.get(
   'SELECT role FROM membership WHERE subject_id = ?','target');
  console.log({id,issue,redeem,membership});
 }finally{store.close();}
}
