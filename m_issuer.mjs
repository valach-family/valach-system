import { openStore, clockFrom } from './v3ref/store.mjs';
import { redeemInvite, inviteGrantAt } from './v3ref/invite.mjs';
const T0='2026-09-09T08:00:00.000Z';
const store=openStore(), clock=clockFrom(T0);
store.run('INSERT INTO subject (id,kind) VALUES (?,?)','sub_issuer','person');
store.run('INSERT INTO account (subject_id,credential) VALUES (?,?)','sub_issuer','c');
store.run('INSERT INTO book (id,name) VALUES (?,?)','book_a','A');
store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)','sub_issuer','book_a','tulajdonos',T0); // el nem ismert szerep a kibocsatoen
store.run('INSERT INTO subject (id,kind) VALUES (?,?)','sub_inv','person');
store.run(`INSERT INTO external_id VALUES (?,?,?,?,?,?,?,?,NULL)`,'sub_inv','email','self','n/a','k@p.hu','k@p.hu','one_to_one',T0);
store.run('INSERT INTO account (subject_id,credential) VALUES (?,?)','sub_inv','cred');
store.run('INSERT INTO channel_proof VALUES (?,?,?,?)','sub_inv','email','k@p.hu',T0);
store.run(`INSERT INTO invite VALUES (?,?,?,?,?,?,?,NULL)`,'tok','book_a','email','k@p.hu','user','sub_issuer','2026-09-30T00:00:00.000Z');
const inv=store.get('SELECT * FROM invite');
try{ console.log('inviteGrantAt:', JSON.stringify(inviteGrantAt({store,invite:inv,clock}))); }
catch(e){ console.log('inviteGrantAt -> DOB:', e.message); }
try{ console.log('redeemInvite :', JSON.stringify(redeemInvite({store,token:'tok',actingSubjectId:'sub_inv',clock}))); }
catch(e){ console.log('redeemInvite -> DOB:', e.message); }
store.close();
