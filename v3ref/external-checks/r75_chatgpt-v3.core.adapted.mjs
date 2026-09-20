// ADAPTÁCIÓ R63 (CMD-VS-300-002-002 R63 — SPEC · forrás: `v3ref/source-documents/R63_board_v1.md`): a
// TESZTVILÁG bírálói hatásköre (`judge` → `alter_right` · `adjudicate` az `a` könyvön) a VÉDETT
// RENDSZERÜZEMELTETŐI KIINDULÓ SZABÁLY alatt születik — `grantAdjudicationAuthority(...)` helyett
// `grantPlatformReviewAuthority(...)` (`platformRule.mjs`, PRL-01), UGYANAZOKKAL a paraméterekkel
// ({store, clock, subjectId, bookId, operation}): az rögzíti a könyv platformbírálói alapját, és AZ
// ALATT ad. A hívás `.ok`-ját a fixtúra ELLENŐRZI, és bukásnál az INDOKKAL dob, hogy egy fixtúra-hiba
// nevezett FAIL-ként jelenjen meg, ne néma „nem"-ként (KUKA-020).
//
// MIÉRT: az R63 §4 két szabályt szigorított a magreferenciában. (A) `grantAdjudicationAuthority`
// (`adjudication.mjs`) alap NÉLKÜL DOB (`basis_id_required`), és `authorityRowAt` (`authority.mjs`)
// az alap nélküli (`basis_id` NULL) hatáskör-sort NEM használja (`authority_without_recorded_basis`)
// — „Bírálati/felülvizsgálati hatáskör: nevezett, erre jogosult delegáló vagy külön védett
// rendszerüzemeltetői kiinduló szabály kell." (B) `redeemInvite` (`invite.mjs` 3/b ·
// `basisLimit.mjs` `redemptionLimitGate`) az `invite_basis` pecsét nélküli meghívót elutasítja
// (`invite_without_basis`, `no_declared_basis`). Ez a program az R63 ELŐTT született, és a közös
// `test()` fixtúrája alap NÉLKÜL adott hatáskört — ezért ma MIND A HÉT eset a fixtúrában hal meg
// (mérve: passed 0 / failed 7, mind `basis_id_required`), mielőtt az eset törzse lefutna. A piros tehát
// ELAVULT ELŐFELTÉTEL, nem a mért tulajdonság kudarca és nem termékhiba — és NEM nevezzük
// visszamenőleg zöldnek: a szigorítás marad, a TESZT-ELŐFELTÉTEL változik.
//
// A (B) SZABÁLY ERRE A PROGRAMRA NEM VONATKOZIK, KIMONDVA: meghívót nem ír és nem vált be.
//
// AMI NEM VÁLTOZOTT: egyetlen eset-azonosító, elvárás, óra (2026-09-14T06:00:00.000Z), negatív ág
// (C02 kívülálló és idegen könyv · F01 a TILTOTT eljáró · F02 a független könyv · F03 az exportált író
// · F04 az ismeretlen tárolt ok), a nyers `subject_ban`-írás (`raw` — az SZÁNDÉKOS, a tiltás-tényt
// méri, nem hatáskört ad), a hatáskör HATÓKÖRE (CSAK az `a` könyv — a `b` könyvön a `judge`-nak
// továbbra sincs hatásköre, ezt C02/F03 méri), forráskötés és kilépési szerződés sem. A
// platformszabály a rendszer SAJÁT íróin megy (recordAuthorityBasis · grantAdjudicationAuthority),
// tehát a megadási kapu is fut — nem kiskapu, hanem a GPR-01 `measurement_fixture` használat. A már
// nem hívott `grantAdjudicationAuthority` behúzása kikerült (holt behúzás nem marad — KUKA-050).
// AZ EREDETI VÁLTOZAT ÉRINTETLEN ÉS TOVÁBBRA IS FUT: `r75_chatgpt-v3.core.mjs` (történeti forrás).
import assert from 'node:assert/strict';
import {openStore,clockFrom} from './source/v3ref/store.mjs';
import {rightAt} from './source/v3ref/authz.mjs';
import {issueBan,imposeBan} from './source/v3ref/ban.mjs';
import {adjudicationRightAt,submitClaim,readClaim} from './source/v3ref/adjudication.mjs';
import {grantPlatformReviewAuthority} from './source/v3ref/platformRule.mjs';
const results=[];
function test(id,fn){const store=openStore(),clock=clockFrom('2026-09-14T06:00:00.000Z');try{for(const s of ['judge','member','outsider'])store.run('INSERT INTO subject VALUES (?,?)',s,'person');for(const b of ['a','b']){store.run('INSERT INTO book VALUES (?,?)',b,b);store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)','member',b,'user',clock.now());}for(const operation of ['alter_right','adjudicate']){const g=grantPlatformReviewAuthority({store,clock,subjectId:'judge',bookId:'a',operation});if(!g.ok)throw new Error('platform review basis: '+g.reason);}const raw=(subject,cause,kind,target)=>store.run('INSERT INTO subject_ban(subject_id,cause,kind,target_ref,actor_subject_id,banned_at) VALUES(?,?,?,?,?,?)',subject,cause,kind,target,'outsider',clock.now());const args={store,clock,subjectId:'member',actorSubjectId:'judge',bookId:'a'};const right=b=>rightAt({store,clock,subjectId:'member',bookId:b,opClass:'own_book'});fn({store,clock,raw,args,right});results.push({id,pass:true});}catch(e){results.push({id,pass:false,error:e.message});}finally{store.close();}}
test('C01-authorized-book-ban-and-independent-book',({args,right})=>{assert(right('a').allowed&&right('b').allowed);assert(issueBan({...args,cause:'left_company',targetRef:'a'}).ok);assert(!right('a').allowed&&right('b').allowed);});
test('C02-no-authority-and-outside-book-refused',({args,store})=>{assert.equal(issueBan({...args,actorSubjectId:'outsider',cause:'left_company',targetRef:'a'}).ok,false);assert.equal(issueBan({...args,cause:'left_company',targetRef:'b'}).ok,false);assert.equal(store.get('SELECT count(*) n FROM subject_ban').n,0);});
test('F01-banned-issuer-cannot-issue-ban',({store,clock,raw,args})=>{raw('judge','left_company','book','a');const right=adjudicationRightAt({store,clock,subjectId:'judge',bookId:'a',operation:'alter_right'});assert.equal(right.allowed,false);const r=issueBan({...args,cause:'left_company',targetRef:'a'});assert.equal(r.ok,false,JSON.stringify({issuer_right:right,issued:r}));});
test('F02-book-authority-does-not-ban-independent-book-operation',({args,right})=>{assert(right('b').allowed);const r=issueBan({...args,cause:'operation_misuse',targetRef:'own_book'});assert(r.ok);assert.equal(right('a').allowed,false);assert.equal(right('b').allowed,true,JSON.stringify({issued:r,independent_book:right('b')}));});
test('F03-exported-writer-cannot-bypass-scope',({args,right})=>{assert.equal(issueBan({...args,cause:'left_company',targetRef:'b'}).ok,false);const r=imposeBan({...args,cause:'left_company',targetRef:'b'});assert.equal(r.ok,false,JSON.stringify({issued:r,independent_book:right('b')}));});
test('F04-unknown-stored-cause-not-a-permit',({raw,right})=>{raw('member','unknown-imported-cause','book','b');const r=right('a');assert.equal(r.allowed,false,JSON.stringify(r));});
test('F05-good-credential-reaches-claim-read',({store,clock,raw})=>{submitClaim({store,clock,claimantRef:'synthetic',bookId:'a',statement:'Synthetic claim'});const claimId=store.get('SELECT id FROM claim').id;const call=credentials=>readClaim({store,clock,viewerSubjectId:'judge',claimId,credentials});assert.equal(call().ok,true);raw('judge','credential_compromised','credential','old');assert.equal(adjudicationRightAt({store,clock,subjectId:'judge',bookId:'a',operation:'adjudicate',credentials:{credentialId:'new'}}).allowed,true);const r=call({credentialId:'new'});assert.equal(r.ok,true,JSON.stringify(r));});
console.log(JSON.stringify({scope:'pinned reference; real isolated SQLite; issueBan public entry and exported writer, no live endpoints',results,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length},null,2));process.exitCode=results.some(x=>!x.pass)?1:0;
