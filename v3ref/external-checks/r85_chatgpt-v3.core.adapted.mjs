// ADAPTÁCIÓ R63 (CMD-VS-300-002-002 R63 — SPEC · forrás: `v3ref/source-documents/R63_board_v1.md`): KÉT
// TESZT-ELŐFELTÉTEL változik, mert ez a program az R63 ELŐTT született, és mindkét R63-as szabályba
// beleütközik — a MÉRT tulajdonságok (F01 két idő-tengely · F02 tartós bizonyíték-hivatkozás) nem.
//
// (A) A `world()` bírálói hatásköre (`judge` → `alter_right` az `a` könyvön) a VÉDETT
//     RENDSZERÜZEMELTETŐI KIINDULÓ SZABÁLY alatt születik — `grantAdjudicationAuthority(...)` helyett
//     `grantPlatformReviewAuthority(...)` (`platformRule.mjs`, PRL-01), UGYANAZOKKAL a paraméterekkel
//     ({store, clock: clockFrom(JAN), subjectId: 'judge', bookId: 'a', operation: 'alter_right'}): az
//     rögzíti a könyv platformbírálói alapját, és AZ ALATT ad. A hívás `.ok`-ját a fixtúra ELLENŐRZI, és
//     bukásnál az INDOKKAL dob (KUKA-020: a fixtúra-hiba nevezett hiba, nem néma „nem").
// (B) Az F01 meghívója NEM nyers `INSERT INTO invite ...`, hanem a NEVEZETT kiadó úton születik:
//     `recordAuthorityBasis` (`authorityBasis.mjs`) rögzít egy meghívó-kiadási alapot az `a` könyvre
//     (allowedOperations ['invite_issue'] · allowedRoles ['user'] — a felkínált szerep · allowedScopes
//     ['keszlet'] · evidenceRef 'synthetic:R63-adaptation'), és `issueInviteUnderBasis`
//     (`basisLimit.mjs`) adja ki alatta a meghívót UGYANAZOKKAL a feltételekkel, mint a nyers sor
//     (token 'synthetic-invite' · `a` · email · member@example.invalid · 'user' · kiadó 'judge' ·
//     lejárat 2026-09-30), `scope: 'keszlet'`-tel. Az alap és a kiadás ideje JAN — ugyanaz a pillanat,
//     amikor a világ többi januári ténye (a bíró hatásköre és admin-tagsága) áll —, hogy a tagot érintő
//     EGYETLEN júniusi esemény továbbra is maga a beváltás legyen (a két idő-tengely mérése ezt kérdezi).
//     Mindkét hívás `.ok`-ját a fixtúra ELLENŐRZI, és bukásnál az indokkal dob — pontosan úgy, ahogy
//     az eredeti a `redeemInvite` fixtúra-bukására dobott (`grant fixture failed`).
//
// MIÉRT: az R63 §4 két szabályt szigorított a magreferenciában. (A) `grantAdjudicationAuthority`
// (`adjudication.mjs`) alap NÉLKÜL DOB (`basis_id_required`), és `authorityRowAt` (`authority.mjs`)
// az alap nélküli (`basis_id` NULL) hatáskör-sort NEM használja (`authority_without_recorded_basis`)
// — „Bírálati/felülvizsgálati hatáskör: nevezett, erre jogosult delegáló vagy külön védett
// rendszerüzemeltetői kiinduló szabály kell." (B) `redeemInvite` (`invite.mjs` 3/b ·
// `basisLimit.mjs` `redemptionLimitGate`) az `invite_basis` pecsét nélküli meghívót elutasítja
// (`invite_without_basis`, `no_declared_basis`) — „Nyers tárolói írással keletkezett, alap nélküli
// meghívó vagy hatáskör nem kerülheti meg az új használati határt." Ez a program MINDKETTŐBE
// beleütközik: a `world()` alap nélkül ad hatáskört, az F01 nyersen ír meghívót és beváltja. MÉRVE a
// történeti alakon: a `world()` a `test()` try-blokkján KÍVÜL fut, ezért az első `basis_id_required`
// dobás a MODUL BETÖLTÉSÉNÉL öli meg a programot — kilépési kód 1, ÜRES szabvány kimenet, és
// `evidence/core-r85.json` NEM születik (nem „0 PASS / 4 FAIL", hanem NINCS mérés — KUKA-012: az
// elérhetetlen és az üres nem ugyanaz). A (B) szabály a történeti alakon ezért ma meg sem szólal —
// ELLENPÁRRAL mérve: CSAK az (A) adaptációval, a nyers meghívó-sort megtartva 3 PASS / 1 FAIL, az F01
// a `redeemInvite` fixtúra-dobásán bukik (`invite_without_basis` · `no_declared_basis`); a két
// szabály tehát két külön ütközés, és mindkettő ebben a programban áll. A piros ELAVULT ELŐFELTÉTEL, nem a
// mért tulajdonság kudarca és nem termékhiba — és NEM nevezzük visszamenőleg zöldnek: a szigorítás
// marad, a TESZT-ELŐFELTÉTEL változik.
//
// AMI NEM VÁLTOZOTT: egyetlen eset-azonosító (P01 · F01 · P02 · F02), elvárás, óra (JAN · MAR · JUN ·
// AUG; az F01 világa JUN-ban adott tagsággal), negatív ág (F01 `before`/`after` = false a márciusi
// tudás szerint · `today` = true; F02 a JÖVŐBELI hatályú ág), az F01 törzsének nyers írásai (a
// membership törlése/beszúrása · account · external_id · channel_proof — ezek nem hatáskört és nem
// meghívót írnak, a szabályok nem érintik őket), a `harness_error` könyvelés, a bizonyíték-fájl
// (`evidence/core-r85.json`), a kimenet alakja (csupasz tömb) és a kilépési szerződés sem. A
// platformszabály és a meghívó-kiadás a rendszer SAJÁT íróin megy (recordAuthorityBasis ·
// grantAdjudicationAuthority · issueInviteUnderBasis), tehát a megadási és a kiadási kapu is fut —
// nem kiskapu, hanem a GPR-01 `measurement_fixture` használat. A már nem hívott
// `grantAdjudicationAuthority` behúzása kikerült (holt behúzás nem marad — KUKA-050).
// AZ EREDETI VÁLTOZAT ÉRINTETLEN ÉS TOVÁBBRA IS FUT: `r85_chatgpt-v3.core.mjs` (történeti forrás).
import fs from 'node:fs';
import {openStore,clockFrom} from './source/v3ref/store.mjs';
import {grantPlatformReviewAuthority} from './source/v3ref/platformRule.mjs';
import {recordAuthorityBasis} from './source/v3ref/authorityBasis.mjs';
import {issueInviteUnderBasis} from './source/v3ref/basisLimit.mjs';
import {redeemInvite} from './source/v3ref/invite.mjs';
import {membershipAsOf,recordRetroactiveInvalidity,reviewCircleState} from './source/v3ref/bitemporal.mjs';
const cases=[],JAN='2026-01-01T00:00:00.000Z',MAR='2026-03-01T00:00:00.000Z',JUN='2026-06-01T00:00:00.000Z',AUG='2026-08-01T00:00:00.000Z';
function world(granted=JAN){const store=openStore();for(const id of ['member','judge'])store.run('INSERT INTO subject VALUES (?,?)',id,'person');store.run('INSERT INTO book VALUES (?,?)','a','A');store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)','member','a','user',granted);const g=grantPlatformReviewAuthority({store,clock:clockFrom(JAN),subjectId:'judge',bookId:'a',operation:'alter_right'});if(!g.ok)throw Error('platform review basis: '+g.reason);return store;}
function test(id,fn){const store=world(id.startsWith('F01')?JUN:JAN);try{cases.push({id,...fn(store)});}catch(e){cases.push({id,pass:false,harness_error:e.message});}finally{store.close();}}
test('P01-known-grant',store=>{const r=membershipAsOf({store,subjectId:'member',bookId:'a',validAt:MAR,knownAt:MAR});return{pass:r.effective===true,result:r};});
test('F01-grant-not-known-at-query',store=>{
  store.run('DELETE FROM membership WHERE subject_id = ?','member');
  store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)','judge','a','admin',JAN);
  store.run('INSERT INTO account VALUES (?,?)','member','synthetic-credential');
  store.run('INSERT INTO external_id (subject_id,namespace,issuer,jurisdiction,value_raw,value_norm,cardinality,valid_from,valid_to) VALUES (?,?,?,?,?,?,?,?,NULL)','member','email','self_asserted','n/a','member@example.invalid','member@example.invalid','one_to_one',JAN);
  store.run('INSERT INTO channel_proof (subject_id,namespace,value_norm,proven_at) VALUES (?,?,?,?)','member','email','member@example.invalid',JUN);
  // ADAPTÁCIÓ R63 (B): a nyers `INSERT INTO invite ...` helyett NEVEZETT alap + NEVEZETT kiadó út.
  const basis=recordAuthorityBasis({store,basisId:'synthetic-invite-basis:a',bookId:'a',issuerSubject:'judge',effectiveAt:JAN,recordedAt:JAN,allowedOperations:['invite_issue'],allowedRoles:['user'],allowedScopes:['keszlet'],evidenceRef:'synthetic:R63-adaptation'});
  if(!basis.ok)throw Error('invite basis fixture failed '+JSON.stringify(basis));
  const issued=issueInviteUnderBasis({store,token:'synthetic-invite',bookId:'a',inviteeNamespace:'email',inviteeValue:'member@example.invalid',offeredRole:'user',issuerSubject:'judge',expiresAt:'2026-09-30T00:00:00.000Z',basisId:'synthetic-invite-basis:a',scope:'keszlet',issuedAt:JAN});
  if(!issued.ok)throw Error('invite issue fixture failed '+JSON.stringify(issued));
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
