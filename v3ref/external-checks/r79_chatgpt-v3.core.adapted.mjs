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
//
// MÁSODIK ADAPTÁCIÓ — R51 (verzió: adapted-v2 · forrás: CMD-VS-300-002-002 R51, „Külső ellenőrzői
// döntés és engedély", `v3ref/source-documents/R51_board_v1.md`). A tesztvilág KIMONDOTT készlet- ÉS
// ár-olvasási jogot kap a rendszer SAJÁT íróján, rögzített alappal — karakterre a külső fél által
// megadott és kipróbált `explicitReadFixture(store)` alakban, a meglévő `member` tagsági sor UTÁN.
//
// MIÉRT KELL: az R49 óta a kiadás IGAZOLT, adatkörre szóló olvasási jogot követel (a tagság
// önmagában nem az, és a tiltás hiánya nem engedély). A program az R49 ELŐTT született, ezért a
// pozitív kontrolljai adatköri jog nélkül álltak — a régi piros mérés tehát VALÓDI volt, és NEM
// nevezzük visszamenőleg zöldnek: a szigorítás marad, a TESZT-ELŐFELTÉTEL változik.
//
// AMI NEM VÁLTOZOTT: egyetlen eset, elvárás, negatív/jogosultsági/beágyazott/időhatár-ellenőrzés,
// óra, forráskötés és kilépési szerződés sem. Mindkét adatkör azért kell, hogy az ártiltást vizsgáló
// negatív ágakat ne pusztán a hiányzó árjog állítsa meg.
//
// HARMADIK ADAPTÁCIÓ R63 (verzió: adapted-v3 · forrás: CMD-VS-300-002-002 R63 §4,
// `v3ref/source-documents/R63_board_v1.md`): a próba-világ bírálói hatásköre (`judge` → suspend ·
// alter_right · adjudicate az `a` könyvön) a VÉDETT RENDSZERÜZEMELTETŐI KIINDULÓ SZABÁLY alatt
// születik — `grantAdjudicationAuthority(…)` helyett
// `grantPlatformReviewAuthority({store,clock,subjectId,bookId,operation})` (`platformRule.mjs`,
// PRL-01), UGYANAZOKKAL az argumentumokkal: az rögzíti a könyv platformbírálói alapját
// (`platform-rule:a`, idempotensen — a második és harmadik művelet a már álló alap alatt kap), és
// AZ ALATT ad. A hívás `.ok`-ját a fixtúra ELLENŐRZI, hogy egy fixtúra-hiba NEVEZETT üzenettel
// jelenjen meg FAIL-ként, ne néma „nem"-ként (KUKA-020).
//
// MIÉRT: az R63 két szabályt szigorított. (A) `grantAdjudicationAuthority` alap NÉLKÜL DOB
// (`adjudication.mjs`: `basis_id_required`), és `authorityRowAt` az alap nélküli (`basis_id` NULL)
// hatáskör-sort NEM használja (`authority.mjs`: `authority_without_recorded_basis`) — „Bírálati/
// felülvizsgálati hatáskör: nevezett, erre jogosult delegáló vagy külön védett rendszerüzemeltetői
// kiinduló szabály kell." (B) `redeemInvite` az `invite_basis` pecsét nélküli meghívót elutasítja
// (`invite.mjs` 3/b · `basisLimit.mjs`: `invite_without_basis`). Ez a program az R63 ELŐTT
// született, és a `test()` előkészítője HÁROM műveletre alap nélkül adott hatáskört — ezért ma MIND
// A TIZENNYOLC eset a fixtúrában, az első kérdés előtt bukik el (mérve a futtató módján
// előkészített másolaton: passed 0 / failed 18, mind `basis_id_required`). A régi piros tehát ELAVULT
// ELŐFELTÉTEL, nem termékhiba — és NEM nevezzük visszamenőleg zöldnek: a szigorítás marad, a
// TESZT-ELŐFELTÉTEL változik.
//
// A (B) SZABÁLY ERRE A PROGRAMRA NEM VONATKOZIK, KIMONDVA: meghívót nem ír és nem vált be.
//
// AMI NEM VÁLTOZOTT: egyetlen eset-azonosító, elvárás, óra (T · END · LATE, a P04/P06 „cross" és az
// F02 kilenc-hívásos órája), negatív ág (P02/F01/P03 ártiltás · P04/P06 visszavonás után és
// átlósan · P07 lejárt tagság · P05 beágyazott hatás · F03 hitelesítő-tiltás), a P04/P06 esetek
// `UPDATE adjudication_authority SET revoked_at` sora (a platformszabály alatt adott hatáskör
// UGYANABBA a táblába kerül, tehát a visszavonás-próba ugyanazt a sort éri), az R35/R51 adaptáció,
// forráskötés és kilépési szerződés sem. A platformszabály a rendszer SAJÁT íróin megy
// (recordAuthorityBasis · grantAdjudicationAuthority), tehát a megadási kapu is fut — nem kiskapu,
// hanem a GPR-01 `measurement_fixture` használat. A már nem hívott `grantAdjudicationAuthority`
// behúzása kikerült (holt behúzás nem marad — KUKA-050).
// AZ EREDETI VÁLTOZAT ÉRINTETLEN ÉS TOVÁBBRA IS FUT: `r79_chatgpt-v3.core.mjs` (történeti forrás).
import {recordAuthorityBasis} from './source/v3ref/authorityBasis.mjs';import {grantReadScope} from './source/v3ref/scopeGrant.mjs';
import assert from 'node:assert/strict';
import {openStore,clockFrom} from './source/v3ref/store.mjs';
import {rightAt,revokeMembership} from './source/v3ref/authz.mjs';
import {effectuate} from './source/v3ref/authority.mjs';
import {submitClaim,adjudicateClaim} from './source/v3ref/adjudication.mjs';
import {grantPlatformReviewAuthority} from './source/v3ref/platformRule.mjs';
import {submitCommand,readCommandResult} from './source/v3ref/command.mjs';
const T='2026-09-14T08:00:00.000Z',END='2026-09-14T08:00:01.000Z',LATE='2026-09-14T08:00:02.000Z';const cases=[];
function explicitReadFixture(store){const basis=recordAuthorityBasis({store,basisId:'review-reader',bookId:'a',issuerSubject:'member',effectiveAt:T,recordedAt:T,allowedScopes:['keszlet','arak'],evidenceRef:'synthetic:review-R51'});assert(basis.ok);for(const scope of ['keszlet','arak']){assert(grantReadScope({store,subjectId:'member',bookId:'a',scope,basisId:'review-reader',basisVersion:1,grantedBy:'member',effectiveAt:T,recordedAt:T}).ok);}}
function test(id,fn){const store=openStore(),clock=clockFrom(T);try{for(const s of ['judge','member'])store.run('INSERT INTO subject VALUES (?,?)',s,'person');store.run('INSERT INTO book VALUES (?,?)','a','A');store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)','member','a','user',T);explicitReadFixture(store);for(const operation of ['suspend','alter_right','adjudicate']){const g=grantPlatformReviewAuthority({store,clock,subjectId:'judge',bookId:'a',operation});assert(g.ok,'platform review basis: '+g.reason);}const ban=(kind,cause,target)=>store.run('INSERT INTO subject_ban(subject_id,kind,cause,target_ref,actor_subject_id,banned_at) VALUES(?,?,?,?,?,?)','member',kind,cause,target,'judge',T);fn({store,clock,ban});cases.push({id,pass:true});}catch(e){cases.push({id,pass:false,error:e.message});}finally{store.close();}}
for(const [id,result,expected] of [['P01-flat-quantity',{qty:'1'},true],['P02-flat-price',{qty:'1',unit_price:12345},false],['F01-nested-price',{lines:[{qty:'1',unit_price:12345}]},false],['F01-object-in-qty',{qty:{unit_price:12345}},false],['P03-unknown-top-field',{private_price:12345},false]])test(id,({store,clock,ban})=>{ban('data_scope','data_scope_withdrawn','arak');const s=submitCommand({store,clock,actor:'member',bookId:'a',idemKey:'x',type:'stock.receipt',typeVersion:'1',declared:{qty:'1'},resolve:()=>result,credentials:{dataScope:'keszlet'}});const r=s.ok?readCommandResult({store,clock,requester:'member',actor:'member',bookId:'a',idemKey:'x',credentials:{dataScope:'keszlet'}}):s;assert.equal(r.ok,expected,JSON.stringify({submit:s,read:r}));});
for(const mode of ['before','after','cross'])test(`P04-revoke-${mode}`,({store,clock})=>{store.run('UPDATE adjudication_authority SET revoked_at=?',END);let n=0;const c={now:()=>mode==='before'?T:mode==='after'?LATE:++n===1?T:LATE};const r=revokeMembership({store,clock:c,actorSubjectId:'judge',subjectId:'member',bookId:'a'});assert.equal(r.ok,mode==='before',JSON.stringify(r));if(!r.ok)assert.equal(store.get('SELECT revoked_at FROM membership').revoked_at,null);});
for(const mode of ['before','after','cross'])test(`P06-adjudicate-${mode}`,({store,clock})=>{submitClaim({store,clock,claimantRef:'synthetic',bookId:'a',statement:'test',intakeContext:{channel:'test',source:'synthetic'}});const row=store.get('SELECT * FROM claim');assert(row);store.run('UPDATE adjudication_authority SET revoked_at=?',END);let n=0;const c={now:()=>mode==='before'?T:mode==='after'?LATE:++n===1?T:LATE};const r=adjudicateClaim({store,clock:c,actorSubjectId:'judge',claimId:row.id,decision:'resolve'});assert.equal(r.ok,mode==='before',JSON.stringify(r));assert.equal(store.get('SELECT state FROM claim').state,mode==='before'?'resolved':'received');});
for(const mode of ['before','after'])test(`P07-command-${mode}`,({store})=>{store.run('UPDATE membership SET revoked_at=?',END);const r=submitCommand({store,clock:clockFrom(mode==='before'?T:LATE),actor:'member',bookId:'a',idemKey:'time-control',type:'stock.receipt',typeVersion:'1',declared:{qty:'1'},resolve:()=>({qty:'1'})});assert.equal(r.ok,mode==='before');assert.equal(store.all('SELECT * FROM command').length,mode==='before'?1:0);});
test('P05-nested-effect-rolls-back',({store,clock})=>{assert.throws(()=>effectuate({store,clock,subjectId:'judge',bookId:'a',operation:'alter_right'},()=>{store.run('UPDATE membership SET role=?','admin');revokeMembership({store,clock,actorSubjectId:'judge',subjectId:'member',bookId:'a'});}),/beágyazott/);assert.equal(store.get('SELECT role FROM membership').role,'user');});
test('F02-command-time-splits-at-finalization',({store})=>{store.run('UPDATE membership SET revoked_at=?',END);let n=0;const clock={now:()=>++n<=9?T:LATE};const r=submitCommand({store,clock,actor:'member',bookId:'a',idemKey:'late',type:'stock.receipt',typeVersion:'1',declared:{qty:'1'},resolve:()=>({qty:'1'})});const row=store.get('SELECT * FROM command');assert(!row||rightAt({store,clock:clockFrom(row.finalized_at),subjectId:'member',bookId:'a',opClass:'own_book'}).allowed,JSON.stringify({calls:n,result:r,finalized_at:row?.finalized_at,revoked_at:END}));});
for(const mode of ['matching','other','absent'])test(`F03-revoke-credential-${mode}`,({store,clock})=>{store.run('INSERT INTO subject_ban(subject_id,kind,cause,target_ref,actor_subject_id,banned_at) VALUES(?,?,?,?,?,?)','judge','credential','credential_compromised','old','judge',T);const credentials=mode==='absent'?undefined:{credentialId:mode==='matching'?'old':'new'};const r=revokeMembership({store,clock,actorSubjectId:'judge',subjectId:'member',bookId:'a',credentials});assert.equal(r.ok,mode==='other',JSON.stringify(r));});
console.log(JSON.stringify({commit:'8dced6f444aff777d5842a050101eedefdcdeec1',cases,passed:cases.filter(x=>x.pass).length,failed:cases.filter(x=>!x.pass).length},null,2));process.exitCode=cases.some(x=>!x.pass)?1:0;
