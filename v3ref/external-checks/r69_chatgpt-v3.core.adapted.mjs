// ADAPTÁCIÓ R63 (CMD-VS-300-002-002 R63 — SPEC · forrás: `v3ref/source-documents/R63_board_v1.md`): a
// TESZTVILÁG bírálói hatásköre (`judge` → `suspend` · `adjudicate` a `book` könyvön) a VÉDETT
// RENDSZERÜZEMELTETŐI KIINDULÓ SZABÁLY alatt születik — `grantAdjudicationAuthority(...)` helyett
// `grantPlatformReviewAuthority(...)` (`platformRule.mjs`, PRL-01), UGYANAZOKKAL a paraméterekkel
// ({store, clock, subjectId, bookId, operation}); a hívás `.ok`-ját a fixtúra ELLENŐRZI (az r81
// adaptált alakja szerint), hogy egy fixtúra-hiba FAIL-ként, üzenettel jelenjen meg, ne néma
// „nem"-ként (KUKA-020).
//
// MIÉRT: az R63 §4 óta KÉT szabály él a magreferenciában — (A) a hatáskör MEGADÁSA alap nélkül ZÁR
// (`adjudication.mjs` · `grantAdjudicationAuthority`: `basis_id_required`), és (B) a HASZNÁLAT
// alap nélküli soron ZÁR (`authority.mjs` · `authorityRowAt`: a `basis_id IS NULL` hatáskör-sort
// elutasítja). „Bírálati/felülvizsgálati hatáskör: nevezett, erre jogosult delegáló vagy külön védett
// rendszerüzemeltetői kiinduló szabály kell." Ez a program az R63 ELŐTT született, és a közös
// `test()` fixtúrája alap NÉLKÜL adott hatáskört — ezért ma MIND AZ ÖT eset a fixtúrában hal meg
// (`basis_id_required`), mielőtt az eset törzse lefutna: a piros tehát ELAVULT ELŐFELTÉTEL, nem a
// mért tulajdonság kudarca, és nem is termékhiba. Az invite-szabály (R63: `invite_without_basis`)
// ezt a programot NEM érinti — meghívót nem ír.
//
// AMI NEM VÁLTOZOTT: egyetlen eset-azonosító, elvárás, negatív ág (C02/F01/F02 a sérült és a hiányzó
// bizonyíték; F03 a hívó által választott hivatkozás), óra (2026-09-12T10:00:00.000Z, az `advance`
// C01-ben), forráskötés és kilépési szerződés sem. A szigorítás marad — a TESZT-ELŐFELTÉTEL változik.
// AZ EREDETI VÁLTOZAT ÉRINTETLEN ÉS TOVÁBBRA IS FUT: `r69_chatgpt-v3.core.mjs` (történeti forrás).
import assert from 'node:assert/strict';
import {openStore,clockFrom} from './source/v3ref/store.mjs';
import {rightAt} from './source/v3ref/authz.mjs';
import {suspendMembership,submitClaim,readClaim,adjudicateClaim,liftSuspension} from './source/v3ref/adjudication.mjs';
import {grantPlatformReviewAuthority} from './source/v3ref/platformRule.mjs';
const results=[];
function test(id,fn){const store=openStore(),clock=clockFrom('2026-09-12T10:00:00.000Z');try{for(const id of ['judge','member','outsider'])store.run('INSERT INTO subject VALUES (?,?)',id,'person');store.run('INSERT INTO book VALUES (?,?)','book','Synthetic');store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)','member','book','user','2026-09-01T00:00:00.000Z');for(const operation of ['suspend','adjudicate'])assert(grantPlatformReviewAuthority({store,clock,subjectId:'judge',bookId:'book',operation}).ok);fn(store,clock);results.push({id,result:'PASS'});}catch(e){results.push({id,result:'FAIL',message:e.message});}finally{store.close();}}
const claim=(store,clock)=>{submitClaim({store,clock,claimantRef:'ref',bookId:'book',statement:'Please investigate synthetic statement 42.'});return store.get('SELECT id FROM claim').id;};
test('C01-suspension-lift-preserves-history',(store,clock)=>{const a={store,clock,actorSubjectId:'judge',subjectId:'member',bookId:'book'};suspendMembership(a);clock.advance(1000);assert.equal(rightAt({...a,opClass:'own_book'}).allowed,false);assert.equal(liftSuspension(a).lifted,true);assert.equal(rightAt({...a,opClass:'own_book'}).allowed,true);assert.equal(store.get('SELECT COUNT(*) AS n FROM membership_suspension').n,1);});
test('C02-corrupt-content-not-disclosed',(store,clock)=>{const id=claim(store,clock);store.run('UPDATE claim_content SET content=? WHERE claim_id=?','corrupt',id);assert.equal(readClaim({store,clock,viewerSubjectId:'judge',claimId:id}).error,'claim_content_integrity_failed');});
test('F01-corrupt-content-cannot-be-resolved',(store,clock)=>{const id=claim(store,clock);store.run('UPDATE claim_content SET content=? WHERE claim_id=?','corrupt',id);assert.equal(readClaim({store,clock,viewerSubjectId:'judge',claimId:id}).ok,false);const r=adjudicateClaim({store,clock,actorSubjectId:'judge',claimId:id,decision:'resolve'});assert.equal(r.ok,false,'read refuses corrupted evidence but decision succeeds');});
test('F02-missing-content-cannot-be-resolved',(store,clock)=>{const id=claim(store,clock);store.run('DELETE FROM claim_content WHERE claim_id=?',id);assert.equal(readClaim({store,clock,viewerSubjectId:'judge',claimId:id}).ok,false);assert.equal(adjudicateClaim({store,clock,actorSubjectId:'judge',claimId:id,decision:'resolve'}).ok,false,'missing evidence still resolves');});
test('F03-distinct-channel-cannot-be-blocked-by-spoofed-ref',(store,clock)=>{for(let i=0;i<3;i++)submitClaim({store,clock,claimantRef:'victim',bookId:'book',statement:'attacker-'+i,intakeContext:{channel_key:'attacker'}});const r=submitClaim({store,clock,claimantRef:'victim',bookId:'book',statement:'legitimate',intakeContext:{channel_key:'independent-victim'}});assert.equal(r.accepted,true,'a separate server channel remains blocked by caller-chosen victim reference');});
console.log(JSON.stringify({results,passed:results.filter(x=>x.result==='PASS').length,failed:results.filter(x=>x.result==='FAIL').length},null,2));process.exitCode=results.some(x=>x.result==='FAIL')?1:0;
