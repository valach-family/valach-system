// ADAPTÁCIÓ R63 (CMD-VS-300-002-002 R63 — SPEC · forrás: `v3ref/source-documents/R63_board_v1.md`):
// EBBEN A PROGRAMBAN NINCS KÓD-VÁLTOZÁS — a fejléc alatt a szöveg BÁJTRA a történeti
// `r88_chatgpt-v3.core.mjs` (md5 d12336ec7dc26febcfcb222b9627f562, a case-manifest pinje). Az aktív
// változat azért létezik, hogy az aktív-változat feloldója (`activeCoreProgram.mjs`) EGYSÉGESEN találja
// meg, és hogy a következő kör LÁSSA: ez a program az R63-hoz MÉRVE lett hozzáigazítva — a hiányzó
// adaptált fájl a „nem kellett" mellett a „nem nézték meg" olvasatot is hordozná (KUKA-093).
//
// MIÉRT NEM KELL VÁLTOZÁS — mérve, nem következtetve (KUKA-033): az R63 §4 KÉT szabályt szigorított a
// magreferenciában. (A) `grantAdjudicationAuthority` (`adjudication.mjs`) alap NÉLKÜL DOB
// (`basis_id_required`), és `authorityRowAt` (`authority.mjs`) az alap nélküli (`basis_id` NULL)
// hatáskör-sort NEM használja (`authority_without_recorded_basis`) — „Bírálati/felülvizsgálati
// hatáskör: nevezett, erre jogosult delegáló vagy külön védett rendszerüzemeltetői kiinduló szabály
// kell." Ez a program a hatáskört EDDIG IS nevezett alappal adta: a `basis()` segéd a `decision-A`
// alapot rögzíti az `A` könyvre (`recordAuthorityBasis`, `allowedOperations: ['adjudicate']`,
// `evidenceRef: 'doc:decision-A'`), és P01 `basisId: 'decision-A'`-val hív — a megadás átmegy, a
// használat (`adjudicationRightAt` → `authorityRowAt`) a rögzített alap alatt enged. F01 UGYANEZZEL az
// alappal a `B` könyvre hív: a `basisId` MEGVAN, tehát a `basis_id_required` ág nem érinti; az
// elutasítás ma is a könyv-eltérés (`basis_belongs_to_other_book`), hatáskör-sor nélkül, ahogy az eset
// várja — az R63 dobás-alakja szándékosan ehhez a szerződéshez igazodik (a `grantAdjudicationAuthority`
// megjegyzése az r88/F01-re hivatkozik). Ezért a platformszabály (`grantPlatformReviewAuthority`,
// `platformRule.mjs`) ide NEM kell: a program SAJÁT, nevezett alappal ad, és pont az alap
// könyv-azonosságát méri — platformalapra cserélve F01 mást mérne, mint amit a külső fél kért.
// (B) `redeemInvite` (`invite.mjs` 3/b · `basisLimit.mjs` `redemptionLimitGate`) az `invite_basis`
// pecsét nélküli meghívót elutasítja (`invite_without_basis`, `no_declared_basis`) — ERRE A PROGRAMRA
// NEM VONATKOZIK, KIMONDVA: meghívót nem ír és nem vált be; P02/F02/P03 a `grantMembership` egy-írás
// tulajdonságát méri, hatáskör-sor és meghívó nélkül.
//
// MÉRVE (a futtató kirakási alakjában — `source/v3ref` a program mellett — közvetlenül futtatva, az
// R63 utáni forráson): a történeti fájl 5 PASS / 0 FAIL; ez a változat ugyanúgy 5 PASS / 0 FAIL.
//
// AMI NEM VÁLTOZOTT: egyetlen eset-azonosító, elvárás, óra (JAN · MAR · JUN), negatív ág (F01 az idegen
// könyvű alap · F02 az elutasított tagságadás · P03 a külső tranzakció visszagördülése), a `basis()`
// segéd, a bizonyíték-fájl neve (`evidence/core-r87.json` — az ő elnevezésük), forráskötés és kilépési
// szerződés sem.
// AZ EREDETI VÁLTOZAT ÉRINTETLEN ÉS TOVÁBBRA IS FUT: `r88_chatgpt-v3.core.mjs` (történeti forrás).
import fs from 'node:fs';
import {openStore,clockFrom} from './source/v3ref/store.mjs';
import {grantMembership,membershipAsOf} from './source/v3ref/bitemporal.mjs';
import {recordAuthorityBasis} from './source/v3ref/authorityBasis.mjs';
import {grantAdjudicationAuthority,adjudicationRightAt} from './source/v3ref/adjudication.mjs';
const JAN='2026-01-01T00:00:00.000Z',MAR='2026-03-01T00:00:00.000Z',JUN='2026-06-01T00:00:00.000Z',cases=[];
function test(id,fn){const store=openStore();try{for(const s of ['issuer','member'])store.run('INSERT INTO subject VALUES (?,?)',s,'person');for(const b of ['A','B'])store.run('INSERT INTO book VALUES (?,?)',b,b);cases.push({id,...fn(store)});}catch(e){cases.push({id,pass:false,harness_error:e.message});}finally{store.close();}}
function basis(store){return recordAuthorityBasis({store,basisId:'decision-A',bookId:'A',issuerSubject:'issuer',effectiveAt:JAN,recordedAt:JAN,allowedOperations:['adjudicate'],evidenceRef:'doc:decision-A'});}
test('P01-same-book-basis',store=>{basis(store);grantAdjudicationAuthority({store,subjectId:'member',bookId:'A',operation:'adjudicate',clock:clockFrom(MAR),basisId:'decision-A'});const r=adjudicationRightAt({store,subjectId:'member',bookId:'A',operation:'adjudicate',clock:clockFrom(MAR)});return{pass:r.allowed===true,result:r};});
test('F01-foreign-book-basis',store=>{basis(store);let error=null;try{grantAdjudicationAuthority({store,subjectId:'member',bookId:'B',operation:'adjudicate',clock:clockFrom(MAR),basisId:'decision-A'});}catch(e){error=e.message;}const rows=store.all('SELECT * FROM adjudication_authority');const r=adjudicationRightAt({store,subjectId:'member',bookId:'B',operation:'adjudicate',clock:clockFrom(MAR)});return{pass:rows.length===0&&r.allowed===false,error,rows,result:r};});
test('P02-successful-grant-is-paired',store=>{const r=grantMembership({store,subjectId:'member',bookId:'A',role:'user',at:JUN});return{pass:r.ok===true&&store.all('SELECT * FROM membership_grant').length===1&&store.all('SELECT * FROM membership').length===1,result:r};});
test('F02-rejected-grant-leaves-no-event',store=>{grantMembership({store,subjectId:'member',bookId:'A',role:'user',at:JUN});const query={store,subjectId:'member',bookId:'A',validAt:MAR,knownAt:MAR};const before=membershipAsOf(query);let error=null,result=null;try{result=grantMembership({store,subjectId:'member',bookId:'A',role:'user',at:JAN});}catch(e){error=e.message;}const after=membershipAsOf(query),events=store.all('SELECT * FROM membership_grant');return{pass:(!!error||result?.ok===false)&&events.length===1&&before.effective===false&&after.effective===false,error,result,before,after,event_count:events.length};});
test('P03-outer-transaction-rolls-back',store=>{grantMembership({store,subjectId:'member',bookId:'A',role:'user',at:JUN});let rejected=false;try{const r=store.tx(()=>grantMembership({store,subjectId:'member',bookId:'A',role:'user',at:JAN}));rejected=r?.ok===false;}catch{rejected=true;}const events=store.all('SELECT * FROM membership_grant'),r=membershipAsOf({store,subjectId:'member',bookId:'A',validAt:MAR,knownAt:MAR});return{pass:rejected&&events.length===1&&!r.effective,event_count:events.length,result:r};});
fs.writeFileSync(new URL('./evidence/core-r87.json',import.meta.url),JSON.stringify({cases},null,2));console.log(JSON.stringify(cases,null,2));process.exitCode=cases.some(x=>!x.pass)?1:0;