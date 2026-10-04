// ADAPTÁCIÓ R148 (verzió: adapted-v4 · forrás: CMD-VS-300-002-002 R146 §4,
// `v3ref/source-documents/R146_board_v1.md`) — EGYETLEN KARAKTERLÁNC, A BEFECSKENDEZÉSI PONT.
//
// MI VÁLTOZOTT: az F04 eset a tároló-hibát a MONDAT SZÖVEGÉRE illesztve fecskendezi be
// (`sql.includes('INSERT OR IGNORE INTO claim')`). A PostgreSQL-átvezetés során ez a mondat a
// hordozható alakra került (`INSERT INTO claim … ON CONFLICT DO NOTHING`), mert az
// `INSERT OR IGNORE` az SQLite SAJÁT bővítése, és PostgreSQL-en SZINTAKTIKAI HIBA. A befecskendezés
// ezért NEM TALÁLT TÖBBÉ: a próba nem a terméken bukott el, hanem azon, hogy a horga lecsúszott.
// Az illesztés mostantól `'INSERT INTO claim'` — UGYANARRA a mondatra, UGYANAZON a ponton.
//
// AMIT EZ NEM JELENT, kimondva: a termék viselkedése NEM változott, és az eset állítása sem. Az
// F04 továbbra is azt méri, hogy egy MEGHIÚSULT beadvány nem hagy maga után könyvelt sort
// (`claim_intake` = 0) — és ezt ma is teljesíti. Ha a befecskendezést NEM igazítottuk volna ki, a
// piros azt állította volna, hogy az atomicitás elromlott, holott a mérés nem is futott le:
// a hazug piros ugyanolyan rossz, mint a hazug zöld (KUKA-049 · KUKA-093 · KUKA-127).
//
// MIÉRT SZABAD EZT MEGTENNI, ÉS MI AZ, AMIT NEM TETTÜNK: a beadott program TANÚ, a szövegét nem
// írjuk át (KUKA-121 · 122) — ezért a TÖRTÉNETI fájl (`r67_chatgpt-v3.core.mjs`) BÁJTAZONOS marad,
// és `VS_EXT_CORE_VARIANT=historic` alatt változatlanul futtatható. Ez itt az ADAPTÁLT nemzedék, a
// repó saját, erre való mechanizmusa; az adaptáció HATÓKÖRE egyetlen karakterlánc, és az eset
// azonosítója, elvárása, órája és kilépési szerződése karakterre változatlan.
//
// TANULSÁG, ami túlmutat ezen a fájlon: egy próba, ami a VÉGREHAJTOTT SQL SZÖVEGÉRE illeszt, a
// megvalósítás szövegéhez köti magát — tárolóváltáskor NÉMÁN lecsúszik. A történeti tanút nem
// írjuk át emiatt, de az ÚJ próbáink a VISELKEDÉSRE mérjenek, ne a mondat betűire (KUKA-237).
//
// ───────────────────────────────────────────────────────────────────────────────────────────────
// ADAPTÁCIÓ R63 (verzió: adapted-v3 · forrás: CMD-VS-300-002-002 R63 §4, `v3ref/source-documents/R63_board_v1.md`):
// a próba-világ bírálói hatásköre (`judge` → suspend · adjudicate) a VÉDETT RENDSZERÜZEMELTETŐI
// KIINDULÓ SZABÁLY alatt születik — `grantAdjudicationAuthority(…)` helyett
// `grantPlatformReviewAuthority({store,subjectId,bookId,operation,clock})` (`platformRule.mjs`),
// UGYANAZOKKAL az argumentumokkal: az rögzíti a könyv platformbírálói alapját, és AZ ALATT ad.
//
// MIÉRT: az R63 két szabályt szigorított. (A) `grantAdjudicationAuthority` alap NÉLKÜL DOB
// (`basis_id_required`), és `authorityRowAt` az alap nélküli (`basis_id` NULL) hatáskör-sort NEM
// használja (`authority_without_recorded_basis`) — „Bírálati/felülvizsgálati hatáskör: nevezett, erre
// jogosult delegáló vagy külön védett rendszerüzemeltetői kiinduló szabály kell." (B) `redeemInvite`
// az `invite_basis` pecsét nélküli meghívót elutasítja (`invite_without_basis`). Ez a program az R63
// ELŐTT született, és a `test()` előkészítője alap nélkül adott hatáskört — ezért ma MIND A NYOLC eset
// a fixtúrában, az első kérdés előtt bukik el (mérve: passed 0 / failed 8, mind `basis_id_required`).
// A régi piros tehát ELAVULT ELŐFELTÉTEL, nem termékhiba — és NEM nevezzük visszamenőleg zöldnek: a
// szigorítás marad, a TESZT-ELŐFELTÉTEL változik.
//
// A (B) SZABÁLY ERRE A PROGRAMRA NEM VONATKOZIK, KIMONDVA: meghívót nem ír és nem vált be.
//
// AMI NEM VÁLTOZOTT: egyetlen eset-azonosító, elvárás, óra, negatív ág (C01 kívülálló · C02/F02
// semlegesség · C03 · F04 atomicitás · F05 korlát), forráskötés és kilépési szerződés sem. A
// platformszabály a rendszer SAJÁT íróin megy (recordAuthorityBasis · grantAdjudicationAuthority),
// tehát a megadási kapu is fut — nem kiskapu, hanem a GPR-01 `measurement_fixture` használat. Ha a
// platformalap nem rögzíthető, a fixtúra NEVEZETTEN dob (nem néma), ahogy a régi megadás is dobott. A
// már nem hívott `grantAdjudicationAuthority` behúzása kikerült (holt behúzás nem marad — KUKA-050).
// AZ EREDETI VÁLTOZAT ÉRINTETLEN ÉS TOVÁBBRA IS FUT: `r67_chatgpt-v3.core.mjs` (történeti forrás).
import assert from 'node:assert/strict';
import {openStore,clockFrom} from './source/v3ref/store.mjs';
import {rightAt} from './source/v3ref/authz.mjs';
import {suspendMembership,submitClaim,readClaim,adjudicateClaim} from './source/v3ref/adjudication.mjs';
import {grantPlatformReviewAuthority} from './source/v3ref/platformRule.mjs';
const results=[];
function test(id,fn){const store=openStore(),clock=clockFrom('2026-09-12T10:00:00.000Z');try{for(const id of ['judge','member','outsider'])store.run('INSERT INTO subject VALUES (?,?)',id,'person');store.run('INSERT INTO book VALUES (?,?)','book','Synthetic');store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)','member','book','user','2026-09-01T00:00:00.000Z');for(const operation of ['suspend','adjudicate']){const g=grantPlatformReviewAuthority({store,subjectId:'judge',bookId:'book',operation,clock});if(!g.ok)throw new Error('platform review basis: '+g.reason);}fn(store,clock);results.push({id,result:'PASS'});}catch(e){results.push({id,result:'FAIL',message:e.message});}finally{store.close();}}
const claim=(store,clock)=>{submitClaim({store,clock,claimantRef:'ref',bookId:'book',statement:'Please investigate synthetic statement 42.'});return store.get('SELECT id FROM claim').id;};
test('C01-unauthorized-suspension-denied',(store,clock)=>assert.equal(suspendMembership({store,clock,actorSubjectId:'outsider',subjectId:'member',bookId:'book'}).ok,false));
test('C02-read-neutrality',(store,clock)=>{const id=claim(store,clock);assert.deepEqual(readClaim({store,clock,viewerSubjectId:'outsider',claimId:id}),readClaim({store,clock,viewerSubjectId:'outsider',claimId:'missing'}));});
test('C03-claim-does-not-grant-membership',(store,clock)=>{claim(store,clock);assert.equal(rightAt({store,clock,subjectId:'outsider',bookId:'book',opClass:'own_book'}).allowed,false);});
test('F01-successful-suspension-removes-current-access',(store,clock)=>{const args={store,clock,subjectId:'member',bookId:'book',opClass:'own_book'};assert.equal(rightAt(args).allowed,true);assert.equal(suspendMembership({...args,actorSubjectId:'judge'}).suspended,true);assert.equal(rightAt(args).allowed,false,'suspended:true but rightAt.allowed remains true');});
test('F02-adjudication-denial-neutrality',(store,clock)=>{const id=claim(store,clock),args={store,clock,actorSubjectId:'outsider',decision:'review'};assert.deepEqual(adjudicateClaim({...args,claimId:id}),adjudicateClaim({...args,claimId:'missing'}));});
test('F03-authorized-reviewer-can-retrieve-submitted-content',(store,clock)=>{const id=claim(store,clock),r=readClaim({store,clock,viewerSubjectId:'judge',claimId:id});assert.equal(r.ok,true);assert.equal(r.claim.statement,'Please investigate synthetic statement 42.','No statement or resolvable content reference is stored or returned; digest alone is not content');});
test('F04-failed-intake-is-atomic',(store,clock)=>{const wrapper={...store,run(sql,...args){if(sql.includes('INSERT INTO claim'))throw Error('injected storage failure');return store.run(sql,...args);}};assert.throws(()=>claim(wrapper,clock),/injected/);assert.equal(store.get('SELECT COUNT(*) AS n FROM claim_intake').n,0,'failed submission left intake/quota write committed');});
test('F05-caller-chosen-reference-is-not-a-rate-limit-identity',(store,clock)=>{const accepted=[];for(let i=0;i<4;i++)accepted.push(submitClaim({store,clock,claimantRef:'arbitrary-'+i,bookId:'book',statement:'same caller'}).accepted);assert.equal(accepted.filter(Boolean).length<=3,true,'four submissions accepted by changing an unverified caller-controlled reference');});
console.log(JSON.stringify({scope:'isolated reference functions and SQLite, no HTTP or production claim',results,passed:results.filter(x=>x.result==='PASS').length,failed:results.filter(x=>x.result==='FAIL').length},null,2));process.exitCode=results.some(x=>x.result==='FAIL')?1:0;
