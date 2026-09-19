#!/usr/bin/env node
// V3 MAGREFERENCIA — PRÓBAFUTTATÓ (G5).
//
// Ez VALÓDI futás: elkülönített SQLite-tárolón, valódi kérés → jog → véglegesítés láncon.
// NEM a V2 adatbázisa, NEM éles adat, és NEM forrás-szöveg mérése.
//
// Amit ez a kör lefed (az R32 §6 „először" listája): a folytonos meghívás + a meglévő jelszó
// védelme, és a függő jog visszavonása. A többi nevesített próba NEM futott — a lap kimondja.
//
//   node v3ref/run.mjs            # emberi kimenet
//   node v3ref/run.mjs --json     # bizonyítékrekordok (R32 §4 alakja)
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { openStore, clockFrom, instantMs } from './store.mjs';
import { observeInvite, redeemInvite, rememberIntent, resumeIntent, inviteGrantAt } from './invite.mjs';
import { rightAt, revokeMembership, revocationTransition, roleGrants, KNOWN_ROLES } from './authz.mjs';
import { ADJUDICATION_OPS, adjudicationRightAt, grantAdjudicationAuthority, submitClaim, readClaim,
  adjudicateClaim, suspendMembership, liftSuspension, intakeKeyOf, UNATTRIBUTED_INTAKE_KEY,
  NEUTRAL_CLAIM_ACK, CLAIM_NOT_AVAILABLE, CLAIM_RATE } from './adjudication.mjs';
import { suspensionEffectiveAt } from './suspension.mjs';
import { issueBan, imposeBan, banEffectiveAt, banReaches, kindForCause, KNOWN_BAN_KINDS, KNOWN_BAN_CAUSES, operationScopeRef, operationScopeProblem } from './ban.mjs';
import { executableRightAt } from './authority.mjs';
import { resultScopesOf, KNOWN_DATA_SCOPES } from './resultScope.mjs';
import { measureEntryPointBinding, CONTEXT_AXES, CONTEXT_MODES, ENT_FLOOR } from './entryPoints.mjs';
import { banMatrix } from './banMatrix.mjs';
// MCS-2 (KAT-01 · KSZ-01 · BEM-01 · MNY-01) — az ELSŐ D-folyamat tárolási és parancs-rétege.
import { parseQuantity, canonicalQuantity, formatQuantity, QUANTITY_ERRORS } from './quantity.mjs';
import { quantityProfile } from './quantity.mjs';
import { registerItem, changeItemUnit, itemBySku, itemById } from './catalog.mjs';
import { balanceAt, submitStockReceipt } from './ledger.mjs';
import { ACCESS_REFUSED, recentRefusals, authorizeBookAction } from './accessGate.mjs';
// A NÉVTÉR-BEHÚZÁS SZÁNDÉKOS: az R10-F01 azt is követeli, hogy a nyers mozgás-írón NE lehessen
// megkerülni a parancs-utat — ezt csak úgy lehet MÉRNI, ha megkérdezzük, mit exportál a modul.
import * as LEDGER_MODULE from './ledger.mjs';
import { validateInput, bindQuantityProfile } from './inputSchema.mjs';
import { submitCommand, readCommandResult, commandRef, canonicalize, CanonError, recordCommandEvent, releasedFieldPaths } from './command.mjs';
// REV-N2a/b (BIT-01): a két idő-tengely és a felülvizsgálati kör — a próbák a TERMÉK feloldóit
// hívják, nem a másolatukat (KUKA-009).
import { membershipAsOf, recordRetroactiveInvalidity, reviewCircleFor, reviewCircleState, closeReviewCircle, grantMembership } from './bitemporal.mjs';
import { recordAuthorityBasis, basisAsOf, withinBasis, basisState, LIMIT_ENFORCED_PATHS } from './authorityBasis.mjs';
import {
  issueInviteUnderBasis, redemptionLimitGate, inviteBasisSeal, grantBasisFor, limitVerdict,
  INVITE_ISSUE_OPERATION, requiredAxesFor,
} from './basisLimit.mjs';
// RSB-01 (K05-DSC-c engedő ága, R47) — az adatkörönkénti olvasási döntés közös kapuja.
import { scopeReleaseDecision, recordedScopeLimit, RSB_CONTRACT } from './releaseScope.mjs';
// SGR-01 (R49) — a TÉNYLEGESEN megadott, adatkörönkénti olvasási jog írója és olvasója.
import { grantReadScope, revokeReadScope, readScopeGrantAt, SCOPE_GRANT_CONTRACT } from './scopeGrant.mjs';

// A KANONIKUS NORMA-VERZIÓ EGYETLEN HELYRŐL JÖN (R53 §5). Korábban itt egy KÉZZEL ÍRT `'R32/K01-K16'`
// állt, miközben a norma-index ugyanezt külön tárolta — két, részben átfedő igazságforrás, ami
// előbb-utóbb elcsúszik (KUKA-018). Innentől a futtató nem tárolja, hanem KÉRDEZI.
export const NORM_VERSION = NORM_CONTRACT_VERSION;
export const IMPL_VERSION = 'v3ref-0.1';

const T0 = '2026-09-09T08:00:00.000Z';

// ── Világ-építő: a KÉT VILÁG csak a védett tényben tér el (A04) ─────────────────────────────────
/**
 * VALÓDI OLVASÁSI JOG EGY PRÓBA-VILÁGBAN (SGR-01, R49) — NEM megkerülő kapcsoló.
 *
 * A külső ellenőrző fél kikötése: *„az engedélyezett pozitív világok valódi engedélyt kapjanak, ne
 * megkerülő kapcsolót."* Ezért ez a segéd a RENDSZER SAJÁT írójával adja meg a jogot: előbb
 * rögzít egy határozatot (az alapot), majd `grantReadScope`-pal adatkörönként MEGADJA — tehát a
 * plafon-ellenőrzés és a két idő-tengely is VALÓDI úton fut. Ha bármelyik lépés elakad, a hiba
 * LÁTSZIK (dob), nem néma kihagyás (KUKA-020).
 */
function giveReadScopes(store, { subjectId, bookId, scopes = ['keszlet', 'arak'], at, grantedBy = 'sub_hatosag', basisId }) {
  const id = basisId || `HAT-OLV-${bookId}`;
  if (!store.get('SELECT 1 AS x FROM subject WHERE id = ?', grantedBy)) {
    store.run('INSERT INTO subject (id, kind) VALUES (?,?)', grantedBy, 'person');
  }
  if (!store.get('SELECT 1 AS x FROM authority_basis WHERE basis_id = ?', id)) {
    const rec = recordAuthorityBasis({
      store, basisId: id, bookId, issuerSubject: grantedBy, effectiveAt: at, recordedAt: at,
      allowedOperations: [INVITE_ISSUE_OPERATION], allowedRoles: ['user', 'admin'],
      allowedScopes: [...KNOWN_DATA_SCOPES], evidenceRef: `doc:${id}`,
    });
    if (rec && rec.ok === false) throw new Error(`giveReadScopes: az ALAP nem jött létre — ${rec.reason}`);
  }
  for (const scope of scopes) {
    const g = grantReadScope({
      store, subjectId, bookId, scope, basisId: id, basisVersion: 1, grantedBy,
      effectiveAt: at, recordedAt: at,
    });
    if (g.ok !== true) throw new Error(`giveReadScopes: a(z) ${scope} jog nem jött létre — ${g.reason}`);
  }
}

function buildWorld({ inviteeHasAccount }) {
  const store = openStore();
  const clock = clockFrom(T0);
  store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_issuer', 'person');
  store.run('INSERT INTO account (subject_id, credential) VALUES (?,?)', 'sub_issuer', 'cred_issuer');
  store.run('INSERT INTO book (id, name) VALUES (?,?)', 'book_a', 'A cég könyve');
  store.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
    'sub_issuer', 'book_a', 'admin', clock.now());

  if (inviteeHasAccount) {
    store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_invitee', 'person');
    store.run(
      `INSERT INTO external_id (subject_id, namespace, issuer, jurisdiction, value_raw, value_norm,
                                cardinality, valid_from, valid_to)
       VALUES (?,?,?,?,?,?,?,?,NULL)`,
      'sub_invitee', 'email', 'self_asserted', 'n/a', 'Kovacs@Pelda.hu', 'kovacs@pelda.hu',
      'one_to_one', clock.now());
    store.run('INSERT INTO account (subject_id, credential) VALUES (?,?)', 'sub_invitee', 'cred_EREDETI');
  }

  store.run(
    `INSERT INTO invite (token, book_id, invitee_namespace, invitee_value, offered_role,
                         issuer_subject, expires_at, redeemed_at)
     VALUES (?,?,?,?,?,?,?,NULL)`,
    'tok_1', 'book_a', 'email', 'kovacs@pelda.hu', 'user', 'sub_issuer',
    '2026-09-30T00:00:00.000Z');

  // REV-N3a: a JOGVÁLTOZTATÁS hatáskörhöz kötött, tehát a világnak van egy NEVEZETT eljáró alanya.
  // SZÁNDÉKOSAN NEM a kibocsátó és nem a könyv admin tagja: a hatáskör nem a tagságból jön. A
  // korábbi próbák a megvonást ELŐFELTÉTELKÉNT használják — azok innentől ezen az alanyon át
  // vonnak meg (`revoke()` alább), tehát a mérésük tárgya változatlan.
  seedAdjudicator(store, clock, ['book_a']);
  // R49/SGR-01 — A VILÁG OLVASÓI VALÓDI ADATKÖRI JOGOT KAPNAK. Enélkül a kiadás (helyesen) zárna,
  // és a próbák NEM a saját tárgyukat mérnék, hanem a hiányzó engedélyt. A jog a rendszer SAJÁT
  // íróján megy át, alappal és két tengellyel — nem kapcsolóval.
  giveReadScopes(store, { subjectId: 'sub_issuer', bookId: 'book_a', at: clock.now() });
  if (inviteeHasAccount) giveReadScopes(store, { subjectId: 'sub_invitee', bookId: 'book_a', at: clock.now() });
  return { store, clock };
}

/**
 * A NEVEZETT ELJÁRÓ ALANY egy tetszőleges próba-világban (REV-N3a).
 *
 * A megvonás innentől `alter_right` hatáskört kíván, tehát MINDEN világnak kell egy eljáró alany —
 * a helyi `mk()` építőknek is. EGY otthon, hogy a hatáskör-adás ne szóródjon szét (KUKA-018).
 */
function seedAdjudicator(store, clock, books = ['book_a']) {
  store.run('INSERT OR IGNORE INTO subject (id, kind) VALUES (?,?)', 'sub_adjudicator', 'person');
  for (const b of books) {
    for (const op of ADJUDICATION_OPS) {
      grantAdjudicationAuthority({ store, subjectId: 'sub_adjudicator', bookId: b, operation: op, clock });
    }
  }
}

/** A megvonás HATÁSKÖRÖS alakja — a korábbi próbák előfeltételeihez (REV-N3a). */
function revoke(w, subjectId, bookId = 'book_a') {
  return revokeMembership({
    store: w.store, subjectId, bookId, clock: w.clock, actorSubjectId: 'sub_adjudicator',
  });
}

// ── R79 (SAJÁT LELET): A HATÁR-BEAVATKOZÁS EGYSZER TÜZEL ────────────────────────────────────────
//
// A próbák egy része a tranzakció BELÉPÉSÉNÉL avatkozik be (pl. „a megvonás pont a határon
// történik"). Ezt eddig mindegyik a maga kezével kötötte rá a `store.tx`-re. Amikor az R79/F02-ben
// a hatályosulási pont is a tároló SAJÁT kapuján (`store.tx`) kezdett nyitni — hogy egy fogalomnak
// EGY ajtaja legyen (KUKA-003) —, a beavatkozás VÉGTELEN REKURZIÓBA futott: a beavatkozás MAGA is
// ír (a megvonás egy író), tehát újra belép ugyanazon az ajtón, ami újra meghívja a beavatkozást.
//
// A JAVÍTÁS NEM AZ ÁLLÍTÁSON VÁLTOZTAT, hanem a beavatkozás MECHANIZMUSÁN: a forgatókönyv EGY
// eseményt ír le („a jogot a határon vonják vissza"), nem végtelen sokat. Az egyszer tüzelő horog
// tehát HŰBB a leírt esethez, és a régi alak látens hibáját is javítja. A helye EGY (KUKA-039):
// mind az öt beavatkozó pont ezt hívja.
function atBoundaryOnce(w, act) {
  const orig = w.store.tx;
  let fired = false;
  w.store.tx = (fn) => {
    if (!fired) { fired = true; act(w); }
    return orig(fn);
  };
  return w;
}

// ── A PRÓBÁK ────────────────────────────────────────────────────────────────────────────────────
const probes = [];
const probe = (id, maps, title, fn) => probes.push({ id, maps, title, fn });

probe('P-A04', 'R32/A04 · K03 · KUKA-083/084',
  'A kibocsátó ugyanazt a meghívót nézi KÉT VILÁGBAN — a fiók létezése nem szivároghat',
  () => {
    const w1 = buildWorld({ inviteeHasAccount: true });
    const w2 = buildWorld({ inviteeHasAccount: false });
    try {
      // A NÉZŐ a kibocsátó: birtokolja a hivatkozást, de NEM a címzett postafiókját.
      const o1 = observeInvite({ store: w1.store, token: 'tok_1', viewerSubjectId: 'sub_issuer', clock: w1.clock });
      const o2 = observeInvite({ store: w2.store, token: 'tok_1', viewerSubjectId: 'sub_issuer', clock: w2.clock });
      const s1 = JSON.stringify(o1);
      const s2 = JSON.stringify(o2);
      return {
        expected: 'a két világ megfigyelhető válasza BÁJTRA azonos',
        actual: s1 === s2 ? 'azonos' : `ELTÉR:\n  van fiók: ${s1}\n  nincs fiók: ${s2}`,
        pass: s1 === s2,
        detail: s1,
      };
    } finally { w1.store.close(); w2.store.close(); }
  });

probe('P-A04b', 'R32/A04 · K03 · KUKA-064',
  'A VALÓDI címzett mindkét világban végigjut a saját helyes útján (a semleges válasz nem zsákutca)',
  () => {
    const w1 = buildWorld({ inviteeHasAccount: true });
    const w2 = buildWorld({ inviteeHasAccount: false });
    try {
      for (const w of [w1, w2]) {
        w.store.run('INSERT INTO channel_proof (subject_id, namespace, value_norm, proven_at) VALUES (?,?,?,?)',
          'sub_holder', 'email', 'kovacs@pelda.hu', w.clock.now());
      }
      const o1 = observeInvite({ store: w1.store, token: 'tok_1', viewerSubjectId: 'sub_holder', clock: w1.clock });
      const o2 = observeInvite({ store: w2.store, token: 'tok_1', viewerSubjectId: 'sub_holder', clock: w2.clock });
      const ok = o1.status === 'redeem_as_existing' && o2.status === 'redeem_as_new';
      return {
        expected: 'a postafiók birtokosa VILÁGONKÉNT MÁS, helyes utat kap (redeem_as_existing / redeem_as_new)',
        actual: `${o1.status} / ${o2.status}`,
        pass: ok,
      };
    } finally { w1.store.close(); w2.store.close(); }
  });

probe('P-K03-cred', 'R32/K03 · KUKA-086 · D-VS-667',
  'MEGLÉVŐ hitelesítő adatot a meghívó beváltása SOHA nem ír felül — csak tagságot ad',
  () => {
    const w = buildWorld({ inviteeHasAccount: true });
    try {
      w.store.run('INSERT INTO channel_proof (subject_id, namespace, value_norm, proven_at) VALUES (?,?,?,?)',
        'sub_invitee', 'email', 'kovacs@pelda.hu', w.clock.now());
      const before = w.store.get('SELECT credential FROM account WHERE subject_id = ?', 'sub_invitee').credential;
      const r = redeemInvite({
        store: w.store, token: 'tok_1', actingSubjectId: 'sub_invitee',
        newCredential: 'cred_TAMADO', clock: w.clock,
      });
      const after = w.store.get('SELECT credential FROM account WHERE subject_id = ?', 'sub_invitee').credential;
      const mem = w.store.get('SELECT role FROM membership WHERE subject_id = ? AND book_id = ?', 'sub_invitee', 'book_a');
      const ok = r.ok && r.shape === 'membership_only' && before === after && after === 'cred_EREDETI' && !!mem;
      return {
        expected: 'alak=membership_only · a hitelesítő adat VÁLTOZATLAN · a tagság létrejön',
        actual: `alak=${r.shape} · hitelesítő ${before === after ? 'változatlan' : `ÁTÍRVA (${before} → ${after})`} · tagság=${mem ? mem.role : 'NINCS'}`,
        pass: ok,
      };
    } finally { w.store.close(); }
  });

probe('P-K03-intent', 'R32/K03 · D-VS-667',
  'A kézi beváltás munkamenet nélkül NEM fut zsákutcába: a szándék megőrződik és folytatódik',
  () => {
    const w = buildWorld({ inviteeHasAccount: true });
    try {
      // 1. Kijelentkezett ember megnyitja a kimásolt hivatkozást.
      const anon = observeInvite({ store: w.store, token: 'tok_1', viewerSubjectId: null, clock: w.clock });
      rememberIntent({ store: w.store, sessionId: 'sess_1', token: 'tok_1', clock: w.clock });
      // 2. Bejelentkezik a saját címével (csatorna-bizonyíték).
      w.store.run('INSERT INTO channel_proof (subject_id, namespace, value_norm, proven_at) VALUES (?,?,?,?)',
        'sub_invitee', 'email', 'kovacs@pelda.hu', w.clock.now());
      // 3. A rendszer visszatér UGYANAHHOZ a meghívóhoz.
      const resumed = resumeIntent({ store: w.store, sessionId: 'sess_1' });
      const r = redeemInvite({ store: w.store, token: resumed, actingSubjectId: 'sub_invitee', clock: w.clock });
      const ok = anon.status === 'needs_invitee_identity' && resumed === 'tok_1' && r.ok && r.shape === 'membership_only';
      return {
        expected: 'a kijelentkezett néző semleges utat kap · a szándék megőrződik · a beváltás VÉGIGMEGY',
        actual: `${anon.status} · megőrzött=${resumed} · beváltás=${r.ok ? r.shape : r.error}`,
        pass: ok,
      };
    } finally { w.store.close(); }
  });

probe('P-A08', 'R32/A08 · K07 · C08 (javított)',
  'A VISSZAVONT olvasójog után a régi eredmény NEM játszható vissza — de a hatás nem születik újra',
  () => {
    const w = buildWorld({ inviteeHasAccount: true });
    try {
      w.store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_worker', 'person');
      w.store.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
        'sub_worker', 'book_a', 'user', w.clock.now());
      // R49/SGR-01 — az olvasó VALÓDI adatköri jogot kap (az eredmény ár-adatkörű). A próba tárgya
      // a MEGVONT KÖNYV-JOG, nem a hiányzó adatköri engedély: a kettőt külön kell tudni mérni.
      giveReadScopes(w.store, { subjectId: 'sub_worker', bookId: 'book_a', at: w.clock.now() });

      let resolveCalls = 0;
      const opts = {
        store: w.store, idemKey: 'idem_1', actor: 'sub_worker', bookId: 'book_a',
        type: 'stock.receipt', typeVersion: '1', declared: { qty: 10, sku: 'X' },
        resolve: () => { resolveCalls += 1; return { unit_price: 100, price_list: 'PL-2026-09' }; },
        clock: w.clock,
      };
      const first = submitCommand(opts);
      // JOGOSULT újrapróbálás UGYANAZZAL a kulccsal és tartalommal: a hatás NEM születik újra.
      // (Ezt a lépést a mutációs próba kényszerítette ki: nélküle az M5 mutáció túlélt.)
      const retrySameActor = submitCommand(opts);
      const conflict = submitCommand({ ...opts, declared: { qty: 99, sku: 'X' } });
      const readBefore = readCommandResult({ store: w.store, idemKey: 'idem_1', requester: 'sub_worker', clock: w.clock });

      revoke(w, 'sub_worker', 'book_a');
      w.clock.advance(1000);

      // MEGVONÁS UTÁN az ÚJRAPRÓBÁLÁS sem árulhatja el, hogy a kulcshoz tartozik-e parancs:
      // a válasz azonos a soha nem látott kulcséval.
      const retry = submitCommand(opts);                       // ugyanaz a kulcs, ugyanaz a tartalom
      const retryUnknown = submitCommand({ ...opts, idemKey: 'idem_NINCS' });
      const readAfter = readCommandResult({ store: w.store, idemKey: 'idem_1', requester: 'sub_worker', clock: w.clock });
      const unknownKey = readCommandResult({ store: w.store, idemKey: 'idem_NINCS', requester: 'sub_worker', clock: w.clock });
      // CÍMZETT olvasás visszavont jog mellett: a cím nélküli úton a jelölt-szűrő IS véd, tehát a
      // cím nélküli ág önmagában nem méri a MÁSODIK, valódi jog-kaput. Enélkül a kettő közül az
      // egyik kiesése NÉMA maradna (KUKA-039: a fél őr).
      const addressedAfter = readCommandResult({
        store: w.store, idemKey: 'idem_1', requester: 'sub_worker',
        bookId: opts.bookId, actor: opts.actor, clock: w.clock,
      });
      const effects = w.store.all('SELECT effect_id FROM command');

      const ok = first.ok && readBefore.ok
        && retrySameActor.ok && retrySameActor.replayed && retrySameActor.effect_id === first.effect_id
        && !conflict.ok && conflict.error === 'idempotency_conflict'
        && resolveCalls === 1 && effects.length === 1
        && !retry.ok && JSON.stringify(retry) === JSON.stringify(retryUnknown)
        && !readAfter.ok && readAfter.result === null
        && JSON.stringify(readAfter) === JSON.stringify(unknownKey)
        && !addressedAfter.ok && addressedAfter.result === null;
      return {
        expected: 'jogosult újrapróbálás ugyanarra a hatásra · eltérő tartalom = konfliktus · a hatás EGYSZER születik · '
          + 'a feloldás EGYSZER fut · megvonás után sem az újrapróbálás, sem az olvasás nem árulja el a parancs létezését',
        actual: `hatás-sorok=${effects.length} · feloldás=${resolveCalls}× · jogosult újrapróbálás=${retrySameActor.effect_id} · `
          + `eltérő tartalom=${conflict.error} · újrapróbálás megvonás után `
          + `${JSON.stringify(retry) === JSON.stringify(retryUnknown) ? 'azonos az ismeretlen kulcséval' : 'ELÁRULJA a létezést'} · `
          + `olvasás ${JSON.stringify(readAfter) === JSON.stringify(unknownKey) ? 'azonos az ismeretlen kulcséval' : 'ELTÉR'} · `
          + `címzett olvasás visszavont joggal=${addressedAfter.ok ? 'KIADTA' : 'elutasítva'}`,
        pass: ok,
        // R35 — A MÁR MÉRT VISELKEDÉS MEGKAPJA A NEVÉT (nem új teszt, hanem a meglévő bizonyíték
        // megnevezése, hogy KÖTHETŐ legyen a K05-DSC-d klauzulához). Az állítás pontosan az, amit ez
        // a próba eddig is mért: a VISSZAVONT olvasójog után sem az ISMÉTLÉS, sem a korábbi eredmény
        // ÚJRAOLVASÁSA nem ad ki adatot — és a hatás sem születik újra (KUKA-088).
        asserts: {
          'A-A08-revoked-right-blocks-replay-and-reread': !retry.ok && !readAfter.ok
            && !addressedAfter.ok && readAfter.result === null && addressedAfter.result === null
            && effects.length === 1 && resolveCalls === 1,
        },
      };
    } finally { w.store.close(); }
  });

probe('P-A14', 'R32/A14 · K12 · C13 (javított)',
  'Külső bizonyítékforrás KIESÉSE: érvényes friss bizonyíték él, lejárt/visszavont nem — a saját könyv független',
  () => {
    const w = buildWorld({ inviteeHasAccount: true });
    try {
      w.store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_agent', 'person');
      w.store.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
        'sub_agent', 'book_a', 'user', w.clock.now());
      const ask = (opClass, ev) => rightAt({
        store: w.store, subjectId: 'sub_agent', bookId: 'book_a', opClass, clock: w.clock, externalEvidence: ev,
      });

      // A HATÁLY (`valid_until`) MOSTANTÓL A SZERZŐDÉS RÉSZE (Q06): a lekérés KORA és az állítás
      // ÉRVÉNYESSÉGE két külön tengely, tehát minden fixtúra KIMONDJA mindkettőt. A régi alak
      // csak a kort adta meg, és emiatt a „friss lekérdezés, LEJÁRT megbízás" engedélyt kapott.
      const FAR = '2026-12-31T00:00:00.000Z';   // messze a próba órája után
      const own = ask('own_book', {});
      const freshDown = ask('representation', { mandate_registry: { obtained_at: T0, valid_until: FAR, source_down: true } });
      w.clock.advance(25 * 3600 * 1000);
      const stale = ask('representation', { mandate_registry: { obtained_at: T0, valid_until: FAR, source_down: true } });
      const revoked = ask('representation', { mandate_registry: { obtained_at: w.clock.now(), valid_until: FAR, revoked: true } });

      const ok = own.allowed && freshDown.allowed
        && !stale.allowed && stale.reason === 'evidence_stale'
        && !revoked.allowed && revoked.reason === 'evidence_revoked';
      return {
        expected: 'saját könyv=igen · friss bizonyíték kiesés alatt=igen · lejárt=evidence_stale · visszavont=evidence_revoked',
        actual: `saját=${own.allowed} · friss+kiesés=${freshDown.allowed} · lejárt=${stale.reason} · visszavont=${revoked.reason}`,
        pass: ok,
      };
    } finally { w.store.close(); }
  });

// ═══ A Q01–Q15 KÖR ÚJ PRÓBÁI ═══════════════════════════════════════════════════════════════════
//
// Minden próba a JAVÍTÁS ELŐTT BUKOTT VOLNA. A mutációk (mutate.mjs) mindegyikhez elrontják a
// megfelelő őrt, és a NEVEZETT ÁLLÍTÁSNAK kell pirosra váltania — enélkül a javítás állítás,
// nem bizonyíték (KUKA-033).

// Kis világ a parancs-próbákhoz: EGY könyv, KÉT tag.
function twoActorWorld() {
  const store = openStore();
  const clock = clockFrom(T0);
  store.run('INSERT INTO book (id, name) VALUES (?,?)', 'book_a', 'A');
  store.run('INSERT INTO book (id, name) VALUES (?,?)', 'book_b', 'B');
  for (const s of ['sub_alice', 'sub_carol']) {
    store.run('INSERT INTO subject (id, kind) VALUES (?,?)', s, 'person');
    store.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
      s, 'book_a', 'admin', clock.now());
  }
  store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_bob', 'person');
  store.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
    'sub_bob', 'book_b', 'admin', clock.now());
  // REV-N3a: itt is kell NEVEZETT eljáró alany, mert a megvonás innentől hatáskörhöz kötött.
  // SZÁNDÉKOSAN nem tagja egyik könyvnek sem: a hatáskör nem a tagságból jön.
  seedAdjudicator(store, clock, ['book_a', 'book_b']);
  // R49/SGR-01 — az olvasók VALÓDI adatköri jogot kapnak a saját könyvükben (a rendszer íróján át).
  for (const s of ['sub_alice', 'sub_carol']) giveReadScopes(store, { subjectId: s, bookId: 'book_a', at: clock.now() });
  giveReadScopes(store, { subjectId: 'sub_bob', bookId: 'book_b', at: clock.now() });
  return { store, clock };
}
// ── A MÚLT PILLANATKÉPE — TARTALOMMAL, NEM DARABSZÁMMAL (R55/F02) ──────────────────────────────
//
// A REV-N1b azt mondja ki, hogy a korábban rögzített esemény és akkori engedélyezési döntése NEM
// törlődik. Ezt darabszámmal mérni fél mérés: a sor megmaradhat MÁS TARTALOMMAL, és a szám akkor is
// stimmel. A pillanatkép ezért a TELJES SOROKAT viszi, a hatókörére szűkítve és rendezve, hogy két
// futás összehasonlítható legyen.
const auditSnapshot = (store, { actor, bookId }) => Object.freeze({
  command: store.all('SELECT * FROM command WHERE actor = ? AND book_id = ? ORDER BY idem_key', actor, bookId),
  command_event: store.all('SELECT * FROM command_event WHERE actor = ? AND book_id = ? ORDER BY id', actor, bookId),
  disclosure: store.all('SELECT * FROM disclosure WHERE recipient = ? AND scope = ? ORDER BY id', actor, bookId),
});

// A SZABÁLY: minden KORÁBBI sor változatlanul legyen meg. ÚJ sor jöhet — a napló bővülhet.
//
// A SOROKAT EGÉSZBEN hasonlítjuk (kanonikus alak), nem kulcs szerint: így egyszerre fogja meg a
// TÖRLÉST, a TARTALOM-ÁTÍRÁST és az AZONOS DARABSZÁMÚ SOR-CSERÉT — a külső fél mindhármat kérte.
// A hiányzó sort NEVEZZÜK is meg: a néma „nem stimmel" nem válasz (KUKA-064).
const rowKey = (row) => JSON.stringify(Object.keys(row).sort().map((k) => [k, row[k]]));
function priorRowsSurvive(before, after) {
  for (const table of Object.keys(before)) {
    const present = new Set((after[table] || []).map(rowKey));
    for (const row of before[table]) {
      if (!present.has(rowKey(row))) {
        return Object.freeze({ ok: false, table, why: `a(z) ${table} egy KORÁBBI sora eltűnt vagy megváltozott: ${rowKey(row).slice(0, 120)}` });
      }
    }
  }
  return Object.freeze({ ok: true, table: null, why: null });
}

const CMD = (w, over) => submitCommand({
  store: w.store, clock: w.clock, idemKey: 'k1', actor: 'sub_alice', bookId: 'book_a',
  type: 'stock.receipt', typeVersion: '1', declared: { sku: 'X', lines: [{ sku: 'X', qty: 1 }] },
  resolve: () => ({ price: 100 }), ...over,
});

probe('P-CMD-namespace', 'R32/K07 · Q01',
  'A kulcs HATÓKÖRÖS: más aktor és más könyv ugyanazzal a kulccsal NEM kapja meg az idegen hatást',
  () => {
    const w = twoActorWorld();
    try {
      const alice = CMD(w);
      const carol = CMD(w, { actor: 'sub_carol' });                 // AKTOR-tengely, azonos könyv
      const bob = CMD(w, { actor: 'sub_bob', bookId: 'book_b' });   // KÖNYV-tengely
      const rows = w.store.all("SELECT * FROM command WHERE idem_key = 'k1'");
      const ids = new Set(rows.map((r) => r.effect_id));
      const ok = alice.ok && carol.ok && bob.ok
        && carol.replayed === false && bob.replayed === false
        && carol.effect_id !== alice.effect_id && bob.effect_id !== alice.effect_id
        && rows.length === 3 && ids.size === 3;
      return {
        expected: 'három ÖNÁLLÓ hatás (aktor- és könyv-tengely is szétválik), egyik sem replayed',
        actual: `sorok=${rows.length} · külön hatásazonosító=${ids.size} · carol.replayed=${carol.replayed} · bob.replayed=${bob.replayed}`,
        pass: ok,
      };
    } finally { w.store.close(); }
  });

probe('P-CMD-identity', 'R32/K07 · Q02 · Q03',
  'AZONOSSÁG: a BEÁGYAZOTT mennyiség, a művelet és a verzió változása KONFLIKTUS — a kulcs-sorrend nem az',
  () => {
    const w = twoActorWorld();
    try {
      const first = CMD(w);
      const qty = CMD(w, { declared: { sku: 'X', lines: [{ sku: 'X', qty: 999 }] } });
      const type = CMD(w, { type: 'stock.issue' });
      const ver = CMD(w, { typeVersion: '2' });
      const reordered = CMD(w, { declared: { lines: [{ qty: 1, sku: 'X' }], sku: 'X' } });
      const ok = first.ok
        && qty.error === 'idempotency_conflict'
        && type.error === 'idempotency_conflict'
        && ver.error === 'idempotency_conflict'
        && reordered.ok === true && reordered.replayed === true;
      return {
        expected: 'menny. 1→999 = konfliktus · más művelet = konfliktus · más verzió = konfliktus · más kulcs-SORREND = visszajátszás',
        actual: `menny=${qty.error} · művelet=${type.error} · verzió=${ver.error} · sorrend=${reordered.replayed ? 'visszajátszás' : reordered.error}`,
        pass: ok,
      };
    } finally { w.store.close(); }
  });

probe('P-CMD-finalize', 'R32/K07 · Q04',
  'A FELOLDÁS KÖZBEN elvesztett jog után a parancs NEM lesz kész, és semmit nem ír',
  () => {
    const w = twoActorWorld();
    try {
      const out = CMD(w, { resolve: () => { revoke(w, 'sub_alice', 'book_a'); return { price: 100 }; } });
      const rows = w.store.all("SELECT * FROM command WHERE idem_key = 'k1'");
      const ok = out.ok === false && out.error === 'not_available' && rows.length === 0;
      return {
        expected: 'nem véglegesül (not_available) ÉS nulla parancs-sor',
        actual: `ok=${out.ok} · hiba=${out.error} · sorok=${rows.length}`,
        pass: ok,
      };
    } finally { w.store.close(); }
  });

probe('P-CMD-disclosure', 'R32/K05 · Q14 · Q15',
  'A TARTALOM csak leltározott olvasó úton megy ki; a befogadás nem szolgáltat ki, az ISMÉTLÉS leltározva',
  () => {
    const w = twoActorWorld();
    try {
      const accept = CMD(w);                              // befogadás
      const afterAccept = w.store.get('SELECT count(*) AS n FROM disclosure').n;
      const replay = CMD(w);                              // ismétlés
      const r1 = readCommandResult({ store: w.store, idemKey: 'k1', requester: 'sub_alice', bookId: 'book_a', actor: 'sub_alice', clock: w.clock });
      const r2 = readCommandResult({ store: w.store, idemKey: 'k1', requester: 'sub_alice', bookId: 'book_a', actor: 'sub_alice', clock: w.clock });
      const kinds = w.store.all('SELECT id, view, ref, fields FROM disclosure ORDER BY id');
      const results = kinds.filter((k) => k.view === 'command_result');

      const ok =
        // (1) A BEFOGADÁS nem szolgáltat ki tartalmat, és nem is ír leltár-sort — de a hatás
        //     megszületik, tehát a `resolved` HIÁNYA nem azért van, mert nincs mit kiadni.
        accept.ok && accept.resolved === undefined && accept.effect_id && afterAccept === 0
        // (2) A TARTALOM ATTÓL MÉG MEGSZERELHETŐ — különben a fenti sor úgy is teljesülne,
        //     hogy a rendszer egyszerűen nem ad ki semmit soha (a néma üres, KUKA-012).
        && r1.ok && r2.ok && r1.result && r1.result.price === 100
        // (3) AZ ISMÉTLÉS ÚJ TÉNYT KÖZÖL (egy MÁR LÉTEZŐ parancs állapotát) ⇒ leltározva.
        && replay.replayed === true && kinds.some((k) => k.view === 'command_replay')
        // (4) KÉT OLVASÁS UGYANAZON AZ ÓRAJELEN: két KÜLÖN sor — az időbélyeg nem azonosság.
        && results.length === 2 && results[0].id !== results[1].id
        // (5) A kivezetett `command_accept` NEM térhet vissza némán.
        && !kinds.some((k) => k.view === 'command_accept')
        // (6) A LELTÁR-SOR HIVATKOZÁSA A TELJES HATÓKÖRT HORDOZZA (R49/C06). A puszta kulcs
        //     (`k1`) NEM azonosít: egy könyvön belül két aktor UGYANAZT a kulcsot használhatja,
        //     és akkor a két sor bájtra azonos — a leltár nem mondaná meg, melyikről szól.
        //     A pin a FELOLDÓT HÍVJA, nem másolja le az alakot (KUKA-009).
        && kinds.every((k) => k.ref === commandRef({ bookId: 'book_a', actor: 'sub_alice', idemKey: 'k1' })
          && JSON.parse(k.fields).includes('k:effect_id'))
        // (6/b) A MEZŐÚT TÍPUSOS ÉS ÜTKÖZÉSMENTES (R51/J4). A pontos összefűzés az `{"a.b":…}` és
        //       az `{"a":{"b":…}}` esetet EGY útra képezte — incidensnél nem lehetne megmondani,
        //       melyik adat jutott ki. A tömb ELEMEI is megjelennek, indexelve.
        && releasedFieldPaths({ a: { b: 1 } })[0] !== releasedFieldPaths({ 'a.b': 1 })[0]
        && releasedFieldPaths({ a: [{ b: 1 }] })[0] === 'k:a/i:0/k:b'
        && releasedFieldPaths({ 'a/b': 1 })[0] === 'k:a~1b'
        && commandRef({ bookId: 'book_a', actor: 'sub_alice', idemKey: 'k1' })
          !== commandRef({ bookId: 'book_a', actor: 'sub_bob', idemKey: 'k1' });

      // (7) A SIKERES LELTÁR-ÍRÁS A KIADÁS FELTÉTELE (R51/J4 · a külső fél N12 esete).
      // A tárolót rávesszük, hogy a leltár-beszúrás NULLA sort írjon. A régi alak a visszatérési
      // értéket nem nézte: a védett tartalom KIMENT, a leltár pedig üres maradt — vagyis pont az
      // a néma hazugság, ami ellen a leltár egyáltalán épült (KUKA-012). Ma NEVEZETT hibával áll
      // meg, a tranzakció visszagördül, és a tartalom nem hagyja el a rendszert.
      w.store.db.exec('CREATE TRIGGER t_disclosure_skip BEFORE INSERT ON disclosure BEGIN SELECT RAISE(IGNORE); END;');
      const before = w.store.get('SELECT count(*) AS n FROM disclosure').n;
      let blocked = 'NEM_DOBOTT'; let leaked = null;
      try {
        const r = readCommandResult({ store: w.store, idemKey: 'k1', requester: 'sub_alice', bookId: 'book_a', actor: 'sub_alice', clock: w.clock });
        leaked = r?.result ?? null;
      } catch (e) { blocked = e.code || e.name; }
      const after = w.store.get('SELECT count(*) AS n FROM disclosure').n;
      const ledgerGate = blocked === 'DISCLOSURE_NOT_LEDGERED' && leaked === null && after === before;

      return {
        expected: 'befogadás: NINCS tartalom és NINCS leltár-sor · a tartalom olvasásra kimegy · ismétlés leltározva · két olvasás = két KÜLÖN sor · NULLA soros leltár-írás ⇒ NINCS kiadás',
        actual: `befogadás után leltár=${afterAccept} · befogadás tartalma=${accept.resolved === undefined ? 'NINCS' : 'VAN'} · olvasott ár=${r1.result && r1.result.price} · sorok=${kinds.length} (${kinds.map((k) => k.view).join(',')}) · olvasó sorok azonosítói=${results.map((k) => k.id).join('/')} · nulla soros leltár=${blocked}/kiszivárgott=${JSON.stringify(leaked)}`,
        pass: ok && ledgerGate,
      };
    } finally { w.store.close(); }
  });

probe('P-AUTHZ-opclass', 'R32/K04 · Q07',
  'ISMERETLEN jog-osztály TILTOTT — az ÖRÖKÖLT kulcs nem talál profilt',
  () => {
    const w = twoActorWorld();
    try {
      const ask = (opClass) => rightAt({ store: w.store, subjectId: 'sub_alice', bookId: 'book_a', opClass, clock: w.clock });
      const bad = ['toString', 'constructor', '__proto__', 'valueOf', ''].map(ask);
      const own = ask('own_book');
      const ok = own.allowed && bad.every((d) => !d.allowed && d.reason === 'unknown_op_class');
      return {
        expected: 'toString · constructor · __proto__ · valueOf · üres ⇒ mind unknown_op_class; own_book ⇒ engedve',
        actual: `örökölt=${bad.map((d) => d.reason || 'ENGEDVE').join(',')} · own_book=${own.allowed}`,
        pass: ok,
      };
    } finally { w.store.close(); }
  });

probe('P-AUTHZ-membership-time', 'R32/K04 · K09 · Q08',
  'A tagság HATÁLY-INTERVALLUMA: jövőbeli kezdet NEM ad jogot, ÜTEMEZETT jövőbeli megvonás még igen',
  () => {
    const w = twoActorWorld();
    try {
      const ask = (s) => rightAt({ store: w.store, subjectId: s, bookId: 'book_a', opClass: 'own_book', clock: w.clock });
      w.store.run('UPDATE membership SET granted_at = ? WHERE subject_id = ?', '2099-01-01T00:00:00.000Z', 'sub_carol');
      const future = ask('sub_carol');
      w.store.run('UPDATE membership SET revoked_at = ? WHERE subject_id = ?', '2099-01-01T00:00:00.000Z', 'sub_alice');
      const scheduled = ask('sub_alice');
      w.store.run('UPDATE membership SET revoked_at = ? WHERE subject_id = ?', 'nem-datum', 'sub_alice');
      const bad = ask('sub_alice');
      const ok = !future.allowed && future.reason === 'membership_not_yet_effective'
        && scheduled.allowed
        && !bad.allowed && bad.reason === 'membership_revoked_at_instant_not_canonical';
      return {
        expected: 'jövőbeli kezdet=membership_not_yet_effective · ütemezett megvonás=ENGED · értelmezhetetlen vég=fail-closed',
        actual: `jövő=${future.reason} · ütemezett=${scheduled.allowed} · rossz alak=${bad.reason}`,
        pass: ok,
      };
    } finally { w.store.close(); }
  });

probe('P-AUTHZ-evidence', 'R32/K12 · Q05 · Q06',
  'A bizonyíték HÁROM tengelye külön: kor · HATÁLY · megvonás — és a jövőbeli lekérés nem frissesség',
  () => {
    const w = twoActorWorld();
    try {
      const FAR = '2026-12-31T00:00:00.000Z';
      const ask = (mr) => rightAt({ store: w.store, subjectId: 'sub_alice', bookId: 'book_a', opClass: 'representation', clock: w.clock, externalEvidence: { mandate_registry: mr } });
      const missing = ask({ valid_until: FAR });
      const unreadable = ask({ obtained_at: 'nem-datum', valid_until: FAR });
      const noZone = ask({ obtained_at: '2026-09-09T08:00:00', valid_until: FAR });
      const future = ask({ obtained_at: '2099-01-01T00:00:00.000Z', valid_until: FAR });
      const expired = ask({ obtained_at: T0, valid_until: '2026-09-08T00:00:00.000Z' });  // FRISS lekérés, LEJÁRT megbízás
      const alien = ask({ obtained_at: T0, valid_until: FAR, elgepelt_mezo: true });
      const good = ask({ obtained_at: T0, valid_until: FAR, source_down: true });

      // A MEGVONÁS × KÉPVISELET KOMBINÁCIÓ (R42 P-A14 maradék: „a megvonás → képviseleti
      // lekérdezés kombináció külön hiányzik"). A `revoked: true` BIZONYÍTÉK-megvonást mér — az
      // más tengely. Itt a TAGSÁGOT vonjuk vissza, és HIBÁTLAN, friss megbízással kérdezünk: a
      // képviseleti jogcím nem kerülhet a visszavont tagság ELÉ (KUKA-002 — két tengely, és a
      // sorrendjük dönt; ha az ág-sorrend megfordul, a visszavont tag képviselettel bejutna).
      revoke(w, 'sub_alice', 'book_a');
      const revokedThenRepresent = ask({ obtained_at: T0, valid_until: FAR });

      const ok = !missing.allowed && missing.reason === 'evidence_obtained_at_instant_missing'
        && !unreadable.allowed && !noZone.allowed
        && !future.allowed && future.reason === 'evidence_future_dated'
        && !expired.allowed && expired.reason === 'evidence_expired'
        && !alien.allowed && alien.reason === 'evidence_shape_unknown_field'
        && good.allowed
        && !revokedThenRepresent.allowed && revokedThenRepresent.reason === 'membership_revoked';
      return {
        expected: 'hiányzó/olvashatatlan/zóna nélküli/jövőbeli idő ⇒ tilt · FRISS lekérés + LEJÁRT hatály ⇒ evidence_expired · ismeretlen mező ⇒ tilt · source_down ⇒ ENGED · VISSZAVONT TAGSÁG + hibátlan megbízás ⇒ membership_revoked',
        actual: `hiányzó=${missing.reason} · olvashatatlan=${unreadable.reason} · zóna nélkül=${noZone.reason} · jövő=${future.reason} · lejárt hatály=${expired.reason} · idegen mező=${alien.reason} · kiesés=${good.allowed} · visszavont tag képviselettel=${revokedThenRepresent.reason}`,
        pass: ok,
      };
    } finally { w.store.close(); }
  });

probe('P-AUTHZ-revoke-now', 'R32/K09',
  'Az AZONNALI megvonás ELŐREHOZZA az ütemezettet, de a MÁR HATÁLYOSAT nem hosszabbítja meg',
  () => {
    const w = twoActorWorld();
    try {
      const ask = (s) => rightAt({ store: w.store, subjectId: s, bookId: 'book_a', opClass: 'own_book', clock: w.clock });
      // (a) jovore utemezett + azonnali megvonas => MOST hatalyos
      w.store.run('UPDATE membership SET revoked_at = ? WHERE subject_id = ?', '2099-01-01T00:00:00.000Z', 'sub_alice');
      const pulled = revoke(w, 'sub_alice', 'book_a');
      const aliceNow = ask('sub_alice');
      // (b) MAR hatalyos (multbeli) => NEM hosszabbit
      w.store.run('UPDATE membership SET revoked_at = ? WHERE subject_id = ?', '2026-09-01T00:00:00.000Z', 'sub_carol');
      const already = revoke(w, 'sub_carol', 'book_a');
      const carolDate = w.store.get('SELECT revoked_at FROM membership WHERE subject_id = ?', 'sub_carol').revoked_at;
      // (c) a tortenet megmarad
      const hist = w.store.get('SELECT * FROM membership_revocation WHERE subject_id = ?', 'sub_alice');
      // (d) a NEVEZETT feloldo HIVVA (KUKA-009)
      const t = revocationTransition('2099-01-01T00:00:00.000Z', w.clock.now());
      const ok = pulled.changed === true && pulled.reason === 'revocation_pulled_forward'
        && !aliceNow.allowed && aliceNow.reason === 'membership_revoked'
        && already.changed === false && already.reason === 'revocation_already_effective'
        && carolDate === '2026-09-01T00:00:00.000Z'
        && hist && hist.previous_effective_at === '2099-01-01T00:00:00.000Z'
        && t.act === true && t.reason === 'revocation_pulled_forward';
      return {
        expected: 'utemezett=elorehozva · mar hatalyos=valtozatlan · elozmeny megorizve · a feloldo hivva',
        actual: `elorehozas=${pulled.reason} · alice=${aliceNow.reason} · mar hatalyos=${already.reason} · carol=${carolDate} · elozmeny=${hist && hist.previous_effective_at}`,
        pass: ok,
      };
    } finally { w.store.close(); }
  });

probe('P-INVITE-window', 'R32/K03 · a teljesség-kritika élő lelete',
  'A LEJÁRT meghívó ELTOLÁSOS zónás alakban sem ad tagságot (szöveg helyett IDŐ-összehasonlítás)',
  () => {
    const w = buildWorld({ inviteeHasAccount: false });
    try {
      w.store.run('INSERT INTO channel_proof (subject_id, namespace, value_norm, proven_at) VALUES (?,?,?,?)',
        'sub_holder', 'email', 'kovacs@pelda.hu', w.clock.now());
      // 09:00+02:00 === 07:00Z, az óra 08:00Z ⇒ VALÓSAN LEJÁRT; szövegként viszont „nagyobb".
      //
      // A LEJÁRAT A KIADÁSKOR kerül a sorba, NEM utólagos UPDATE-tel (R53/F01 óta). Az UPDATE ma
      // a PECSÉT-eltérésen akadna fenn, és ez a próba nem az ablakot mérné, hanem a pecsétet —
      // vagyis egy ÚJ, KORÁBBAN tüzelő kapu venné el a próbát a saját tengelyéről (KUKA-094).
      // A megkülönböztetés ára egy külön token; a mért állítás így változatlan marad.
      w.store.run(
        `INSERT INTO invite (token, book_id, invitee_namespace, invitee_value, offered_role,
                             issuer_subject, expires_at, redeemed_at)
         VALUES (?,?,?,?,?,?,?,NULL)`,
        'tok_zona', 'book_a', 'email', 'kovacs@pelda.hu', 'user', 'sub_issuer',
        '2026-09-09T09:00:00+02:00');
      const obs = observeInvite({ store: w.store, token: 'tok_zona', viewerSubjectId: 'sub_holder', clock: w.clock });
      const red = redeemInvite({ store: w.store, token: 'tok_zona', actingSubjectId: 'sub_holder', newCredential: 'c', clock: w.clock });
      // CSAK az ÚJ tagságot számoljuk: a világ a kibocsátó tagságával születik.
      const m = w.store.all("SELECT * FROM membership WHERE book_id = ? AND subject_id <> 'sub_issuer'", 'book_a');
      const ok = obs.status === 'not_actionable' && red.ok === false && red.reason === 'invite_expired' && m.length === 0;
      return {
        expected: 'megfigyelés=not_actionable · beváltás=invite_expired · NULLA új tagság',
        actual: `megfigyelés=${obs.status} · beváltás=${red.ok ? 'SIKER' : red.reason} · új tagságok=${m.length}`,
        pass: ok,
      };
    } finally { w.store.close(); }
  });

probe('P-INVITE-authority', 'R32/K03 · K09 · Q09 · Q10 · Q13',
  'A beváltás kapui: a kibocsátó MAI joga · IDEGEN alany · VISSZAVONT tagság — és a meghívó nem fogy el',
  () => {
    const w = buildWorld({ inviteeHasAccount: true });
    try {
      for (const s of ['sub_holder', 'sub_stranger']) {
        w.store.run('INSERT INTO subject (id, kind) VALUES (?,?)', s, 'person');
      }
      // A CSATORNA-KAPU AZ ELSŐ: a címzettnek MAGÁNAK is bizonyítania kell, különben a próba a
      // csatorna-kapun áll meg, és a MÖGÖTTE lévő kapukat egyáltalán nem mérné (KUKA-051).
      for (const s of ['sub_holder', 'sub_stranger', 'sub_invitee']) {
        w.store.run('INSERT INTO channel_proof (subject_id, namespace, value_norm, proven_at) VALUES (?,?,?,?)',
          s, 'email', 'kovacs@pelda.hu', w.clock.now());
      }
      // (a) IDEGEN alany: a csatorna bizonyított, de a cím MÁS ember alanyát célozza.
      const foreign = redeemInvite({ store: w.store, token: 'tok_1', actingSubjectId: 'sub_stranger', newCredential: 'x', clock: w.clock });
      // (b) VISSZAVONT tagság a címzettnek ⇒ nevezett kimenet, a meghívó ÉL.
      w.store.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,?)',
        'sub_invitee', 'book_a', 'user', T0, T0);
      const revoked = redeemInvite({ store: w.store, token: 'tok_1', actingSubjectId: 'sub_invitee', clock: w.clock });
      const stillOpen = w.store.get('SELECT redeemed_at FROM invite WHERE token = ?', 'tok_1').redeemed_at;
      // (c) A KIBOCSÁTÓ joga visszavonva ⇒ a függő meghívó nem ad tagságot.
      revoke(w, 'sub_issuer', 'book_a');
      const noIssuer = redeemInvite({ store: w.store, token: 'tok_1', actingSubjectId: 'sub_invitee', clock: w.clock });
      // AZ ORG-N2a ÖNÁLLÓ ÁLLÍTÁS. A tiltó alapértelmezés (a kibocsátó jogának megvonása a függő
      // meghívót is érvényteleníti) az EGYETLEN szervezeti klauzula, aminek ma bizonyítéka van —
      // ezért külön mérjük, és a nemleges válasz NEVEZETT volta is a feltétel része: a néma „nem"
      // ugyanolyan hasznavehetetlen, mint a hiányzó tiltás (KUKA-064).
      const orgN2a = noIssuer.ok === false && noIssuer.reason === 'issuer_right_withdrawn';
      const ok = foreign.ok === false && foreign.error === 'account_authentication_required'
        && revoked.ok === false && revoked.outcome === 'revoked_needs_decision'
        && stillOpen === null
        && orgN2a;
      return {
        expected: 'idegen alany=account_authentication_required · visszavont=revoked_needs_decision (meghívó ÉL) · kibocsátó joga elveszett=issuer_right_withdrawn',
        actual: `idegen=${foreign.error} · visszavont=${revoked.outcome} · meghívó felhasználva=${stillOpen !== null} · kibocsátó=${noIssuer.reason}`,
        pass: ok,
        asserts: { 'A-ORG-N2a-issuer-basis-withdrawn-is-fail-closed': orgN2a },
      };
    } finally { w.store.close(); }
  });

probe('P-INVITE-effect', 'R32/K03 · Q11 · Q12',
  'A beváltás VALÓDI hatása: a belépés tényleg létrejön, és az írások ATOMI egységben mennek',
  () => {
    const w = buildWorld({ inviteeHasAccount: false });
    try {
      w.store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_holder', 'person');
      w.store.run('INSERT INTO channel_proof (subject_id, namespace, value_norm, proven_at) VALUES (?,?,?,?)',
        'sub_holder', 'email', 'kovacs@pelda.hu', w.clock.now());
      // (a) BIRTH: a teljes pozitív út — alany, külső azonosító, FIÓK és tagság is születik.
      const born = redeemInvite({ store: w.store, token: 'tok_1', actingSubjectId: 'sub_holder', newCredential: 'uj_jelszo', clock: w.clock });
      const acct = w.store.get('SELECT credential FROM account WHERE subject_id = ?', born.subject_id);
      const mem = w.store.get('SELECT * FROM membership WHERE subject_id = ? AND book_id = ?', born.subject_id, 'book_a');
      // (b) ATOMICITÁS: a meghívó-fogyasztást megállítva SEMMI nem marad.
      w.store.run(`INSERT INTO invite (token,book_id,invitee_namespace,invitee_value,offered_role,issuer_subject,expires_at,redeemed_at)
                   VALUES (?,?,?,?,?,?,?,NULL)`, 'tok_2', 'book_a', 'email', 'masik@pelda.hu', 'user', 'sub_issuer', '2026-09-30T00:00:00.000Z');
      w.store.run('INSERT INTO channel_proof (subject_id, namespace, value_norm, proven_at) VALUES (?,?,?,?)',
        'sub_holder', 'email', 'masik@pelda.hu', w.clock.now());
      w.store.db.exec("CREATE TRIGGER stop_use BEFORE UPDATE OF redeemed_at ON invite BEGIN SELECT RAISE(ABORT,'proba'); END;");
      let threw = false;
      try { redeemInvite({ store: w.store, token: 'tok_2', actingSubjectId: 'sub_holder', newCredential: 'x', clock: w.clock }); }
      catch { threw = true; }
      w.store.db.exec('DROP TRIGGER stop_use');
      const leftovers = w.store.all('SELECT * FROM membership WHERE book_id = ? AND subject_id = ?', 'book_a', 'sub_tok_2');
      const ok = born.ok && born.shape === 'birth' && acct && acct.credential === 'uj_jelszo' && !!mem
        && threw && leftovers.length === 0;
      return {
        expected: 'birth: fiók VALÓBAN létrejön + tagság · a megszakadt beváltás NULLA félkész sort hagy',
        actual: `alak=${born.shape} · hitelesítő=${acct ? acct.credential : 'NINCS'} · tagság=${!!mem} · megszakadt írás dobott=${threw} · maradék tagság=${leftovers.length}`,
        pass: ok,
      };
    } finally { w.store.close(); }
  });

// ═══ A HAT HIÁNYZÓ ŐR (R49 · D-VS-3008) ═════════════════════════════════════════════════════════
//
// MIÉRT SZÜLETTEK: a javítások MÉRVE zöldek a külső fél 30 esetén (30/30), de SAJÁT KÉZZEL
// megmértem, hogy a legfontosabb felük ŐRIZETLEN: a véglegesítési kaput (5 sor) kitörölve a
// battéria 17/17 zöld maradt és 29/29 mutációt elkapott, miközben a KÜLSŐ próba 30/30 → 28/30
// esett. A nem mért kód nem „ismeretlen állapotú", hanem ZÖLDNEK LÁTSZIK (KUKA-051).
//
// Mindegyik próba a VALÓDI feloldót HÍVJA, nem másolja le a szabályt (KUKA-009).

probe('P-INVITE-finalize-gate', 'R32/K03 · K09 · R49 C02 · C03',
  'A meghívó VÉGLEGESÍTÉSI HATÁRÁN a változható tények ÚJRA mérve: óra · kibocsátói jog · lefokozás · a MEGHÍVÓ SORA',
  () => {
    // A `store.tx` határán beavatkozunk — ugyanaz a mérési alak, amit a külső fél használ.
    const atBoundary = (mutate) => {
      const w = buildWorld({ inviteeHasAccount: false });
      try {
        w.store.run('INSERT INTO channel_proof (subject_id, namespace, value_norm, proven_at) VALUES (?,?,?,?)',
          'sub_holder', 'email', 'kovacs@pelda.hu', w.clock.now());
        atBoundaryOnce(w, mutate);
        const r = redeemInvite({ store: w.store, token: 'tok_1', actingSubjectId: 'sub_holder', newCredential: 'c', clock: w.clock });
        const mem = w.store.all("SELECT * FROM membership WHERE book_id = 'book_a' AND subject_id <> 'sub_issuer'");
        return { r, memberships: mem.length };
        // A KIVÉTEL NEM VÁLASZ (KUKA-020): ha a kapu programhibával áll meg, azt NEVEZVE
        // jelentjük, nem hagyjuk kirobbanni — különben a próba bukása nem mondja meg, MIÉRT.
      } catch (e) {
        return { r: { ok: false, reason: `KIVÉTEL(${e.message})`, threw: true }, memberships: 0 };
      } finally { w.store.close(); }
    };

    // (a) A LEJÁRAT a határon következik be — az ÓRA mozdul (C03).
    const expired = atBoundary((w) => w.clock.advance(31 * 86400000));
    // (b) A KIBOCSÁTÓ jogát a határon vonják vissza (C02).
    const revoked = atBoundary((w) => revoke(w, 'sub_issuer', 'book_a'));
    // (c) A KIBOCSÁTÓT a határon LEFOKOZZÁK — a delegálás-ellenőrzés KÜLÖN ok, nem ugyanaz (KUKA-039).
    const demoted = atBoundary((w) => w.store.run(
      "UPDATE membership SET role = 'user' WHERE subject_id = 'sub_issuer' AND book_id = 'book_a'"));

    // (d)+(e) A MEGHÍVÓ SAJÁT SORA mozdul a határon. Ez a KÜLÖN tengely: az (a)–(c) mind az ÓRÁT
    // vagy a TAGSÁG-táblát mozgatja, amit a kapu úgyis frissen olvas — tehát egyikük sem méri,
    // hogy a MEGHÍVÓ SORÁT is újra kell olvasni. A saját M31 rontásom pontosan itt ment át:
    // a kapu megvolt, csak az ELAVULT sort nézte (KUKA-051 — a nem mért rész ZÖLDNEK látszik).
    //   (d) A KIADOTT FELTÉTEL ÁTÍRÁSA a határon (R53/F01 óta ÚJ jelentés). Korábban ez a
    //       „lejárttá tétel" ága volt, és az ablak indokát várta. A pecsét bevezetése óta a
    //       lejárat is KIADOTT feltétel, tehát a helyben átírása nem visszavonás, hanem a token
    //       halála: `invite_terms_changed`. Ezt KIMONDJUK, nem csendben igazítjuk a zöldhöz —
    //       a próba jelentése változott, nem a mércéje gyengült (KUKA-094).
    //       R55/F01 UTÁN: ezt az írást a TÁROLÓ zárja (P-INVITE-seal). Itt a VÉGLEGESÍTÉSI KAPU a
    //       tét — hogy a határon ÚJRA a kiadott ajánlathoz mér —, ezért az őröket kimondottan
    //       elvesszük: trigger nélküli tárolón is ugyanennek kell történnie.
    //   (e) KÖZBEN FELHASZNÁLTÁK: itt az ön-őrző `UPDATE` úgyis nulla sort ír, tehát tagság nem
    //       születik — de elavult olvasással a válasz KIVÉTEL lesz a nevezett elutasítás helyett.
    //       A programhiba nem lehet ugyanaz a válasz, mint a valódi „nem" (KUKA-020 · KUKA-064).
    const withdrawn = atBoundary((w) => withoutSealGuards(w.store, () => w.store.run(
      "UPDATE invite SET expires_at = ? WHERE token = 'tok_1'", w.clock.now())));
    const takenMeanwhile = atBoundary((w) => w.store.run(
      "UPDATE invite SET redeemed_at = ? WHERE token = 'tok_1'", w.clock.now()));

    const blocked = (x) => x.r.ok === false && x.memberships === 0;
    const named = (x) => blocked(x) && x.r.threw !== true && !!x.r.reason;
    const ok = named(expired) && named(revoked) && named(demoted) && named(withdrawn) && named(takenMeanwhile)
      // A HÁROM ÖNÁLLÓ JOGALAP NEM OLVADHAT EGYBE: külön indokot kell adniuk (KUKA-020 · KUKA-064).
      && new Set([expired.r.reason, revoked.r.reason, demoted.r.reason]).size === 3
      // A (d) MOST a PECSÉT-eltérést méri: a kiadott feltétel helyben átírása NEM az ablak
      // kérdése többé, hanem azonosság-kérdés — ezért NEVEZETTEN más indokot vár.
      && withdrawn.r.reason === 'invite_terms_changed'
      && takenMeanwhile.r.reason === 'invite_already_redeemed';
    return {
      expected: 'mind az öt határ-eset: ok=false · NULLA új tagság · NEVEZETT indok (nem kivétel); '
        + 'három önálló jogalap három indokkal; a KIADOTT feltétel átírása invite_terms_changed',
      actual: `lejárat=${expired.r.reason}/${expired.memberships} · megvonás=${revoked.r.reason}/${revoked.memberships}`
        + ` · lefokozás=${demoted.r.reason}/${demoted.memberships}`
        + ` · visszavonás=${withdrawn.r.reason}/${withdrawn.memberships}`
        + ` · közben-felhasználva=${takenMeanwhile.r.reason}/${takenMeanwhile.memberships}`,
      pass: ok,
    };
  });

probe('P-CMD-receipt', 'R32/K05 · K07 · R50 (a külső fél cáfolata a mi R47-es indokunkra)',
  'A VÉGLEGESÍTÉS NYUGTÁT AD: tartós esemény-sor, a hatással EGY tranzakcióban, közös borítékkal',
  () => {
    const mk = () => {
      const store = openStore(); const clock = clockFrom(T0);
      store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_alice', 'person');
      store.run('INSERT INTO book (id, name) VALUES (?,?)', 'book_a', 'A');
      store.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
        'sub_alice', 'book_a', 'admin', clock.now());
      seedAdjudicator(store, clock, ['book_a']);
      return { store, clock };
    };
    const events = (w) => w.store.all('SELECT * FROM command_event');

    // (a) A BEFOGADÁS nyugtát ír: PONTOSAN egy sor, nevezett fajtával, a válasz hatásazonosítójával.
    const a = mk(); const accept = CMD(a); const evA = events(a);
    const wroteOne = accept.ok === true && evA.length === 1
      && evA[0].event === 'command_finalized' && evA[0].state === 'finalized'
      && evA[0].effect_id === accept.effect_id
      && evA[0].book_id === 'book_a' && evA[0].actor === 'sub_alice' && evA[0].idem_key === 'k1';

    // (b) AZ ISMÉTLÉS nem ír nyugtát — nem kötelez el semmit —, de UGYANAZT a borítékot adja.
    // A hívó a válasz ALAKJÁBÓL ne tudja megkülönböztetni a két ágat: a `replayed` MONDJA MEG.
    const replay = CMD(a); const evAfterReplay = events(a);
    const sameEnvelope = JSON.stringify(Object.keys(accept).sort()) === JSON.stringify(Object.keys(replay).sort());
    const replaySilent = replay.ok === true && replay.replayed === true && accept.replayed === false
      && evAfterReplay.length === 1 && sameEnvelope;
    a.store.close();

    // (c) ATOMI: ha a hatás visszagördül, a nyugta sem áll meg. A tx-határon visszavont joggal a
    // parancs elutasításra fut — ilyenkor NULLA parancs-sor ÉS NULLA nyugta-sor (KUKA-026 párja:
    // a siker nyugtája KÖTELEZŐEN a tranzakcióval utazik, különben meg nem történt hatásról szól).
    const c = mk(); atBoundaryOnce(c, (w) => revoke(w, 'sub_alice', 'book_a'));
    const refused = CMD(c);
    const cmdRows = c.store.get('SELECT count(*) AS n FROM command').n;
    const atomic = refused.ok === false && cmdRows === 0 && events(c).length === 0;
    c.store.close();

    // (d) A REGISZTER ZÁRT: ismeretlen nyugta-fajtára DOB, nem ír némán idegen szót a könyvbe.
    const d = mk(); let closed = false;
    try {
      recordCommandEvent({ store: d.store, event: 'command_whatever', scope: { bookId: 'book_a', actor: 'sub_alice', idemKey: 'k1' }, effectId: 'e', state: 's', clock: d.clock });
    } catch { closed = events(d).length === 0; }
    d.store.close();

    return {
      expected: 'befogadás ⇒ 1 nyugta-sor · ismétlés ⇒ 0 új sor, azonos boríték · visszagördülés ⇒ 0 sor · zárt regiszter',
      actual: `befogadás=${evA.length}/${evA[0]?.event ?? '—'} · ismétlés=${evAfterReplay.length}/boríték-azonos=${sameEnvelope}`
        + ` · visszagördülés: parancs=${cmdRows}/nyugta=${atomic ? 0 : 'NEM NULLA'} · zárt=${closed}`,
      pass: wroteOne && replaySilent && atomic && closed,
    };
  });

probe('P-CMD-finalize-gate', 'R32/K04 · K07 · R49 (saját teljesség-lelet)',
  'A PARANCS-oldal mindhárom ága zár a tx-határon visszavont joggal — és a KORÁBBI esemény megmarad',
  () => {
    const mk = () => {
      const store = openStore(); const clock = clockFrom(T0);
      store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_alice', 'person');
      store.run('INSERT INTO book (id, name) VALUES (?,?)', 'book_a', 'A');
      store.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
        'sub_alice', 'book_a', 'admin', clock.now());
      seedAdjudicator(store, clock, ['book_a']);
      // R49/SGR-01 — VALÓDI adatköri jog: a próba tárgya a MEGVONT KÖNYV-JOG, nem a hiányzó engedély.
      giveReadScopes(store, { subjectId: 'sub_alice', bookId: 'book_a', at: clock.now() });
      return { store, clock };
    };
    const pull = (w) => revoke(w, 'sub_alice', 'book_a');

    // MIND A HÁROM ÁG A TRANZAKCIÓ BELÉPÉSÉNÉL KAPJA A MEGVONÁST (R51/J1 — javítva).
    //
    // AZ ELSŐ ALAKOM ITT TÉVEDETT, ÉS A TÉVEDÉST KI IS ADTAM ÁLLÍTÁSKÉNT. Az Y2/Y3 ágat úgy
    // mértem, hogy a megvonás a HÍVÁS ELŐTT történt — azt a tranzakción KÍVÜLI ellenőrzés úgyis
    // elkapja. Ebből azt a következtetést írtam az R50-be, hogy „az ismétlés és az olvasás ezen a
    // határon MÁR ZÁRVA VAN". A külső fél N08/N09 esete megcáfolta: a `store.tx` BELÉPÉSÉNÉL
    // beavatkozva mindkettő KIADOTT — az olvasás a védett tartalmat is. Gyengébb esetet mértem, és
    // az erősebb állítást írtam le (KUKA-094). Innentől mind a három ág UGYANAZT a beavatkozást
    // kapja, tehát a próba a VALÓDI határt méri.
    const atBoundary = (w) => atBoundaryOnce(w, pull);

    // (Y1) BEFOGADÁS.
    const a = mk(); atBoundary(a);
    const y1 = CMD(a); const rows1 = a.store.get('SELECT count(*) AS n FROM command').n; a.store.close();
    // (Y2) ISMÉTLÉS: a parancs MÁR LÉTEZIK, a jogot a tx-határon vonják vissza.
    const b = mk(); CMD(b); atBoundary(b);
    const y2 = CMD(b); const d2 = b.store.get('SELECT count(*) AS n FROM disclosure').n; b.store.close();
    // (Y3) OLVASÁS ugyanígy — itt a VÉDETT TARTALOM a tét, nem csak az állapot.
    const c = mk(); CMD(c); atBoundary(c);
    const y3 = readCommandResult({ store: c.store, idemKey: 'k1', requester: 'sub_alice', bookId: 'book_a', actor: 'sub_alice', clock: c.clock });
    const d3 = c.store.get('SELECT count(*) AS n FROM disclosure').n; c.store.close();

    // (Y4) A NORMA MÁSIK FELE — A KORÁBBI ESEMÉNY TÚLÉLI A MEGVONÁST (R53/F04 · REV-N1b).
    //
    // A külső fél ellenpéldája: ideiglenes másolatban a megvonás KITÖRÖLTE az érintett korábbi
    // parancsokat, nyugtákat és kiadásokat — és ez a próba mégis PASS maradt, mert csak azt mérte,
    // hogy megvonás UTÁN nincs ÚJ hatás. A REV-N1 két állítást hordoz, és én az egyiket mértem, a
    // védelmet mégis egészként jelentettem (KUKA-095). Itt tehát a MÚLT sértetlensége a tét: a
    // megvonás a mai jogot változtatja meg, a TÖRTÉNETET nem írja át.
    // A DARABSZÁM NEM A TÖRTÉNET (R55/F02). Az első alakom `count(*)` értékeket hasonlított
    // megvonás előtt és után. A külső fél N03 esete ezt megdöntötte: ha a megvonás UGYANAZT a sort
    // MÁS TARTALOMMAL hagyja ott (`resolved_json` → `{"tampered":true}`), a darabszám változatlan,
    // az állításom igaz marad, és a battéria végig zöld. A tegnapi bevételezés sora megvan — csak
    // már nem azt mondja, amit tegnap mondott. TARTALMI pillanatképet kell hasonlítani.
    //
    // ÉS A NORMA NEM „SEMMI NEM VÁLTOZHAT": az új, szabályos audit-bejegyzés hozzáfűzése MEGENGEDETT
    // — különben a szabály a saját naplózásunkat tiltaná meg (KUKA-049: az őr, ami a kért eredményt
    // jelenti kudarcnak). Ezért: a KORÁBBI sorok mindegyike változatlanul legyen meg; ÚJ sor jöhet.
    const e = mk();
    const okCmd = CMD(e);
    const okRead = readCommandResult({ store: e.store, idemKey: 'k1', requester: 'sub_alice', bookId: 'book_a', actor: 'sub_alice', clock: e.clock });
    const before = auditSnapshot(e.store, { actor: 'sub_alice', bookId: 'book_a' });
    pull(e);
    const after = auditSnapshot(e.store, { actor: 'sub_alice', bookId: 'book_a' });
    const survived = priorRowsSurvive(before, after);
    // AZ ELLENPÁR IS KELL (KUKA-049): a megvonásnak HATNIA is kell, nem csak nem-törölnie. Ha a
    // sorok megvannak, de a jog nem szűnt meg, az nem „norma teljesítve", hanem néma no-op.
    const afterRead = readCommandResult({ store: e.store, idemKey: 'k1', requester: 'sub_alice', bookId: 'book_a', actor: 'sub_alice', clock: e.clock });
    // POZITÍV KONTROLL: a megvonás UTÁN érkező, jogos audit-bejegyzés hozzáfűzése NEM sértheti a
    // normát — a történet BŐVÜLHET, csak át nem írható.
    e.store.run('INSERT INTO disclosure (recipient, view, scope, ref, fields, at) VALUES (?,?,?,?,?,?)',
      'sub_alice', 'command_result', 'book_a', 'audit/kesobbi', '[]', e.clock.now());
    const grown = auditSnapshot(e.store, { actor: 'sub_alice', bookId: 'book_a' });
    const appendOk = priorRowsSurvive(before, grown).ok
      && grown.disclosure.length === after.disclosure.length + 1;
    e.store.close();

    const a1 = y1.ok === false && rows1 === 0 && y2.ok === false && d2 === 0 && y3.ok === false && d3 === 0
      // A NEMLEGES VÁLASZ AZONOS a soha nem látott kulcséval — a létezés nem szivároghat (KUKA-084).
      && y1.error === 'not_available' && y2.error === 'not_available' && y3.error === 'not_available'
      // ÉS A TARTALOM SEM MEGY KI: az olvasó ág `result` mezője üres marad.
      && (y3.result === null || y3.result === undefined);
    const a2 = okCmd.ok === true && okRead.ok === true
      // A pillanatkép ne legyen üres: ha nincs mit megőrizni, az állítás semmit nem mond (KUKA-051).
      && before.command.length >= 1 && before.command_event.length >= 1 && before.disclosure.length >= 1
      && survived.ok
      && afterRead.ok === false && afterRead.error === 'not_available'
      && appendOk;
    return {
      expected: 'a tx-HATÁRÁN visszavont joggal mindhárom ág not_available · NULLA parancs-sor · NULLA leltár-sor · NULLA tartalom'
        + ' — ÉS a megvonás a KORÁBBI parancs, nyugta és kiadás minden MEZŐJÉT változatlanul hagyja (új sor jöhet)',
      actual: `befogadás=${y1.error}/${rows1} sor · ismétlés=${y2.error}/${d2} leltár · olvasás=${y3.error}/${d3} leltár/tartalom=${JSON.stringify(y3.result ?? null)}`
        + ` · múlt: parancs ${before.command.length} · nyugta ${before.command_event.length} · kiadás ${before.disclosure.length}`
        + ` → tartalmilag sértetlen=${survived.ok}${survived.ok ? '' : ` (${survived.why})`}`
        + ` · hozzáfűzés megengedett=${appendOk} · megvonás UTÁN olvasás=${afterRead.error}`,
      pass: a1 && a2,
      // A NORMA-INDEX EZEKET AZ AZONOSÍTÓKAT VÁLTJA BE (manifest `discharges`). A próba futásidőben
      // adja ki, mit mért — a norma nem próbanevet tárol, hanem a MANIFEST deklarál, és a kapu az
      // itt kiadott állításhoz méri (KUKA-009: a pin HÍVJON, ne szöveget olvasson).
      asserts: {
        'A-REV-N1a-dependent-new-op-and-release-blocked': a1,
        // K05-DSC-d SAJÁT NEVE UGYANAZON A MÉRT VISELKEDÉSEN (R37). A klauzula HÁROM próba
        // együttesén áll; ez a fél azt mondja ki, hogy a MEGVONÁS után az ISMÉTLÉS és a korábbi
        // eredmény ÚJRAOLVASÁSA az ÍRÁSI HATÁRON akad el. A mérés nem változott — a bizonyítéknak
        // saját NEVE lett, mert egy próbán belül egy állítás-azonosító nem állhat kétszer
        // (a norma-bizonyíték kapu jogosan utasította el az ismétlődést).
        'A-K05-DSC-d-replay-and-release-are-blocked-at-the-write-boundary': a1,
        'A-REV-N1b-earlier-record-and-decision-survive': a2,
      },
    };
  });

// A PECSÉT-ŐRÖK IDEIGLENES ELVÉTELE — NEVEZETT, ÉS CSAK A MÁSODIK RÉTEG MÉRÉSÉRE (R55/F01).
//
// A tároló-őrök bevezetése után a meghívó KIADOTT mezőit egyszerűen nem lehet átírni. Ez jó hír a
// terméknek, de elveszi a MÁSODIK réteg (a beváltás-kori pecsét-összevetés) mérhetőségét: nincs
// az az írás, amivel az eltérést elő lehetne állítani. A hallgatólagos ráhagyatkozás pont az a
// fajta fél őr, amit a KUKA-039 tilt — a második réteg attól van, hogy egy MÁSIK adapter, egy
// javítóprogram vagy egy trigger nélküli séma ugyanide ír.
//
// Ezért a próba KIMONDOTTAN olyan tárolót szimulál, amiben ezek az őrök nincsenek meg, és ott
// méri, hogy a beváltás akkor is felismeri az eltérést. Ez NEM megkerülés: a termék-út változatlan,
// és ezt a segédfüggvényt CSAK a próba hívja.
const SEAL_GUARDS = ['invite_terms_no_update', 'invite_terms_no_delete', 'invite_terms_no_reseal',
  'invite_no_change_sealed', 'invite_no_reissue', 'invite_no_delete_sealed'];
const withoutSealGuards = (store, fn) => {
  for (const t of SEAL_GUARDS) store.db.exec(`DROP TRIGGER ${t}`);
  try { return fn(); } finally { /* a tároló a próba végén megszűnik — nincs mit visszaállítani */ }
};

probe('P-INVITE-seal', 'R32/K03 · R55 F01 (a külső fél S00 · S01 · S02)',
  'A KIADOTT ajánlat MINDEN írási úton változtathatatlan — és az életciklus mégis mozog',
  () => {
    const mk = () => {
      const w = buildWorld({ inviteeHasAccount: false });
      w.store.run('INSERT INTO channel_proof (subject_id, namespace, value_norm, proven_at) VALUES (?,?,?,?)',
        'sub_holder', 'email', 'kovacs@pelda.hu', w.clock.now());
      return w;
    };
    // A MŰVELET oldaláról mérünk, nem a szándék oldaláról: a támadás alakja számít, nem a neve.
    const shapes = [
      ['UPDATE a pecséten',            (s) => s.run("UPDATE invite_terms SET offered_role = 'admin' WHERE token = 'tok_1'")],
      ['DELETE a pecséten',            (s) => s.run("DELETE FROM invite_terms WHERE token = 'tok_1'")],
      ['REPLACE a pecséten (S01)',     (s) => s.run("INSERT OR REPLACE INTO invite_terms SELECT token, book_id, invitee_namespace, invitee_value, 'admin', issuer_subject, expires_at FROM invite WHERE token = 'tok_1'")],
      ['UPDATE a kiadott mezőn',       (s) => s.run("UPDATE invite SET offered_role = 'admin' WHERE token = 'tok_1'")],
      ['UPDATE a lejáraton',           (s) => s.run("UPDATE invite SET expires_at = '2020-01-01T00:00:00.000Z' WHERE token = 'tok_1'")],
      ['REPLACE az élő soron (S02)',   (s) => s.run("INSERT OR REPLACE INTO invite (token, book_id, invitee_namespace, invitee_value, offered_role, issuer_subject, expires_at, redeemed_at) VALUES ('tok_1','book_a','email','kovacs@pelda.hu','admin','sub_issuer','2026-09-30T00:00:00.000Z',NULL)")],
      ['UPSERT az élő soron',          (s) => s.run("INSERT INTO invite (token, book_id, invitee_namespace, invitee_value, offered_role, issuer_subject, expires_at, redeemed_at) VALUES ('tok_1','book_a','email','kovacs@pelda.hu','admin','sub_issuer','2026-09-30T00:00:00.000Z',NULL) ON CONFLICT(token) DO UPDATE SET offered_role = 'admin'")],
      ['DELETE az élő soron',          (s) => s.run("DELETE FROM invite WHERE token = 'tok_1'")],
    ];
    const blocked = [];
    for (const [name, write] of shapes) {
      const w = mk();
      let rejected = null;
      try { write(w.store); } catch (e) { rejected = e.message; }
      // A MÉRCE NEM A KIVÉTEL, HANEM A JOG: az ajánlat akkor is `user` marad, ha valami átment.
      const after = w.store.get("SELECT offered_role FROM invite_terms WHERE token = 'tok_1'");
      const red = redeemInvite({ store: w.store, token: 'tok_1', actingSubjectId: 'sub_holder', newCredential: 'c', clock: w.clock });
      const mem = w.store.get("SELECT role FROM membership WHERE book_id = 'book_a' AND subject_id <> 'sub_issuer'");
      w.store.close();
      const elevated = red.ok === true && mem && mem.role === 'admin';
      blocked.push({ name, rejected: !!rejected, sealed_role: after ? after.offered_role : null, elevated });
    }

    // (i) ELLENPÁR — az ÉLETCIKLUS mozog: a fogyasztás írása megy, és az érintetlen meghívó
    // beváltható, `user` szereppel. Az őr, ami mindent zár, ugyanolyan hasznavehetetlen (KUKA-049).
    const wOk = mk();
    const okRedeem = redeemInvite({ store: wOk.store, token: 'tok_1', actingSubjectId: 'sub_holder', newCredential: 'c', clock: wOk.clock });
    const okRole = wOk.store.get("SELECT role FROM membership WHERE book_id = 'book_a' AND subject_id <> 'sub_issuer'");
    const consumed = wOk.store.get("SELECT redeemed_at FROM invite WHERE token = 'tok_1'").redeemed_at;
    // ÚJ meghívó kiadása változatlanul megy (a tilalom a KIADOTT tokenre szól, nem a kiadásra).
    let newIssue = null;
    try {
      wOk.store.run(`INSERT INTO invite (token, book_id, invitee_namespace, invitee_value, offered_role,
                     issuer_subject, expires_at, redeemed_at) VALUES (?,?,?,?,?,?,?,NULL)`,
      'tok_uj', 'book_a', 'email', 'masik@pelda.hu', 'user', 'sub_issuer', '2026-09-30T00:00:00.000Z');
      newIssue = wOk.store.get("SELECT offered_role FROM invite_terms WHERE token = 'tok_uj'");
    } catch (e) { newIssue = { error: e.message }; }
    wOk.store.close();

    // (j) A MÁSODIK RÉTEG — őrök NÉLKÜLI tárolón a beváltás akkor is felismeri az eltérést.
    const wNo = mk();
    const second = withoutSealGuards(wNo.store, () => {
      wNo.store.run("UPDATE invite SET offered_role = 'admin' WHERE token = 'tok_1'");
      return redeemInvite({ store: wNo.store, token: 'tok_1', actingSubjectId: 'sub_holder', newCredential: 'c', clock: wNo.clock });
    });
    const secondMem = wNo.store.all("SELECT role FROM membership WHERE book_id = 'book_a' AND subject_id <> 'sub_issuer'");
    wNo.store.close();

    // (k) A KAPCSOLATI BEÁLLÍTÁST AZ ADAPTER ÁLLÍTJA — nem a környezet alapértéke (R55/F01).
    const wP = openStore();
    const pragma = wP.get('PRAGMA recursive_triggers');
    wP.close();
    const recursiveOn = pragma && Number(Object.values(pragma)[0]) === 1;

    const noneElevated = blocked.every((b) => b.elevated === false && b.sealed_role === 'user');
    const allRejected = blocked.every((b) => b.rejected);
    const counterOk = okRedeem.ok === true && okRole && okRole.role === 'user' && consumed !== null
      && newIssue && newIssue.offered_role === 'user';
    const secondLayerOk = second.ok === false && second.error === 'invite_terms_changed' && secondMem.length === 0;

    return {
      expected: 'mind a nyolc írási alak elutasítva, a pecsét `user` marad, jog-bővülés SEHOL; '
        + 'az életciklus (fogyasztás) és az ÚJ kiadás megy; őrök nélkül a beváltás fogja meg; a pragma BE',
      actual: `elutasítva=${blocked.filter((b) => b.rejected).length}/${blocked.length} · `
        + `jog-bővülés=${blocked.filter((b) => b.elevated).length} · ellenpár=${okRedeem.ok}/${okRole && okRole.role}`
        + `/új kiadás=${newIssue && newIssue.offered_role} · második réteg=${second.error}/${secondMem.length} tagság`
        + ` · recursive_triggers=${recursiveOn ? 'BE' : 'KI'}`
        + (allRejected ? '' : ` · ÁTMENT: ${blocked.filter((b) => !b.rejected).map((b) => b.name).join(', ')}`),
      pass: allRejected && noneElevated && counterOk && secondLayerOk && recursiveOn,
    };
  });

probe('P-INVITE-terms', 'R32/K03 · R51 J2 (a külső fél N10 · N11)',
  'A meghívó FELTÉTELEI változtathatatlanok, és a KIMENET a tranzakción belül dől el',
  () => {
    const mk = () => {
      const w = buildWorld({ inviteeHasAccount: false });
      w.store.run('INSERT INTO channel_proof (subject_id, namespace, value_norm, proven_at) VALUES (?,?,?,?)',
        'sub_holder', 'email', 'kovacs@pelda.hu', w.clock.now());
      return w;
    };
    const atBoundary = (w, mutate) => {
      atBoundaryOnce(w, mutate);
      return redeemInvite({ store: w.store, token: 'tok_1', actingSubjectId: 'sub_holder', newCredential: 'c', clock: w.clock });
    };

    // (a) A SZEREP LEFOKOZÁSA a határon. A régi alak a friss soron ELLENŐRZÖTT, de a RÉGI példány
    // szerepét ÍRTA — a meghívóban `user`, a tagságban `admin`. Ma: nevezett elutasítás.
    //
    // R55/F01 UTÁN: ezt a beavatkozást a TÁROLÓ maga zárja (P-INVITE-seal méri). Itt viszont a
    // MÁSODIK réteg a tét — hogy a döntés a tranzakción BELÜL dől el —, ezért az őröket kimondottan
    // elvesszük: egy trigger nélküli tárolón is ugyanennek kell történnie.
    const w1 = mk();
    const r1 = withoutSealGuards(w1.store, () => {
      w1.store.run("UPDATE invite SET offered_role = 'admin' WHERE token = 'tok_1'");
      return atBoundary(w1, (w) => w.store.run("UPDATE invite SET offered_role = 'user' WHERE token = 'tok_1'"));
    });
    const m1 = w1.store.all("SELECT role FROM membership WHERE book_id = 'book_a' AND subject_id <> 'sub_issuer'");
    w1.store.close();

    // (b) A CÍMZETT TAGSÁGÁT vonják meg a határon, miközben a döntés `already_active` volt.
    // A régi alak SIKERT adott és ELFOGYASZTOTTA a meghívót, hozzáférés nélkül. Itt a címzettnek
    // MÁR VAN alanya és belépése (`membership_only` ág), tehát a saját nevében váltja be.
    const w2 = buildWorld({ inviteeHasAccount: true });
    w2.store.run('INSERT INTO channel_proof (subject_id, namespace, value_norm, proven_at) VALUES (?,?,?,?)',
      'sub_invitee', 'email', 'kovacs@pelda.hu', w2.clock.now());
    w2.store.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
      'sub_invitee', 'book_a', 'user', w2.clock.now());
    atBoundaryOnce(w2, (w) => revoke(w, 'sub_invitee', 'book_a'));
    const r2 = redeemInvite({ store: w2.store, token: 'tok_1', actingSubjectId: 'sub_invitee', newCredential: 'c', clock: w2.clock });
    const used2 = w2.store.get("SELECT redeemed_at FROM invite WHERE token = 'tok_1'").redeemed_at;
    w2.store.close();

    // (c) ELLENPÁR — az őr NE ZÁRJON TÚL (KUKA-049): változatlan feltételek mellett a beváltás MEGY.
    const w3 = mk();
    const r3 = redeemInvite({ store: w3.store, token: 'tok_1', actingSubjectId: 'sub_holder', newCredential: 'c', clock: w3.clock });
    const m3 = w3.store.all("SELECT role FROM membership WHERE book_id = 'book_a' AND subject_id <> 'sub_issuer'");
    w3.store.close();

    const ok = r1.ok === false && r1.error === 'invite_terms_changed' && m1.length === 0
      && r2.ok === false && r2.error === 'membership_not_granted' && used2 === null
      && r3.ok === true && m3.length === 1;
    return {
      expected: 'lefokozás ⇒ invite_terms_changed + 0 tagság · megvont tagság ⇒ nem fogy el a meghívó · változatlan ⇒ MEGY',
      actual: `lefokozás=${r1.error}/${m1.length} tagság · megvonás=${r2.error}/redeemed=${used2}`
        + ` · ellenpár=${r3.ok}/${m3.length} tagság`,
      pass: ok,
    };
  });

probe('P-CMD-receipt-integrity', 'R32/K05 · R51 J3 (a külső fél N02–N05)',
  'A nyugta a PARANCS tényéhez kötött: nincs árva · nincs második · nincs hamis tartalmú · nincs nulla soros',
  () => {
    const w = openStore(); const clock = clockFrom(T0);
    try {
      w.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_alice', 'person');
      w.run('INSERT INTO book (id, name) VALUES (?,?)', 'book_a', 'A');
      w.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
        'sub_alice', 'book_a', 'admin', clock.now());
      const accept = submitCommand({
        store: w, clock, idemKey: 'k1', actor: 'sub_alice', bookId: 'book_a',
        type: 'stock.receipt', typeVersion: '1', declared: { sku: 'X' }, resolve: () => ({ price: 100 }),
      });
      const scope = { bookId: 'book_a', actor: 'sub_alice', idemKey: 'k1' };
      const codeOf = (fn) => { try { fn(); return 'NEM_DOBOTT'; } catch (e) { return e.code || e.name; } };

      // (a) TRANZAKCIÓN KÍVÜL nem írható.
      const outside = codeOf(() => recordCommandEvent({
        store: w, event: 'command_finalized', scope, effectId: accept.effect_id, state: 'finalized', clock }));
      // (b) ÁRVA nyugta nem létező parancsra.
      const orphan = codeOf(() => w.tx(() => recordCommandEvent({
        store: w, event: 'command_finalized', scope: { ...scope, idemKey: 'nincs_ilyen' },
        effectId: accept.effect_id, state: 'finalized', clock })));
      // (c) MÁSODIK nyugta ugyanarra a parancsra.
      const twice = codeOf(() => w.tx(() => recordCommandEvent({
        store: w, event: 'command_finalized', scope, effectId: accept.effect_id, state: 'finalized', clock })));
      // (d) HAMIS TARTALOM: megengedett fajta, de idegen hatásazonosító.
      const wrongEffect = codeOf(() => w.tx(() => recordCommandEvent({
        store: w, event: 'command_finalized', scope, effectId: 'eff_idegen', state: 'finalized', clock })));
      // (e) HAMIS TARTALOM: lehetetlen állapot.
      const wrongState = codeOf(() => w.tx(() => recordCommandEvent({
        store: w, event: 'command_finalized', scope, effectId: accept.effect_id, state: 'lehetetlen', clock })));

      const rows = w.get('SELECT count(*) AS n FROM command_event').n;
      const ok = outside === 'RECEIPT_OUTSIDE_TX'
        && orphan === 'RECEIPT_NO_COMMAND'
        && twice === 'ERR_SQLITE_ERROR'          // az EGYEDISÉG a SÉMÁBAN áll, nem a jóindulatban
        && wrongEffect === 'RECEIPT_EFFECT_MISMATCH'
        && wrongState === 'RECEIPT_STATE_MISMATCH'
        && rows === 1;                            // a befogadás EGY nyugtája, semmi több
      return {
        expected: 'mind az öt kísérlet NEVEZETT hibával áll meg, és a nyugta-könyvben PONTOSAN 1 sor marad',
        actual: `tx-en kívül=${outside} · árva=${orphan} · második=${twice} · hamis hatás=${wrongEffect}`
          + ` · hamis állapot=${wrongState} · sorok=${rows}`,
        pass: ok,
      };
    } finally { w.close(); }
  });

probe('P-AUTHZ-roles', 'R32/K04 · R49 C05',
  'ISMERETLEN SZEREP nem szerez jogot — és a jog-oldal meg a meghívó-oldal UGYANABBÓL a regiszterből dolgozik',
  () => {
    const w = twoActorWorld();
    try {
      w.store.run("UPDATE membership SET role = 'unknown_role' WHERE subject_id = 'sub_alice' AND book_id = 'book_a'");
      const right = rightAt({ store: w.store, subjectId: 'sub_alice', bookId: 'book_a', opClass: 'own_book', clock: w.clock });
      const cmd = CMD(w);
      // A MEGHÍVÓ-OLDAL sem dobhat: az ismeretlen szerep NEVEZETT elutasítás (KUKA-020).
      w.store.run(`INSERT INTO invite (token, book_id, invitee_namespace, invitee_value, offered_role,
                                       issuer_subject, expires_at, redeemed_at)
                   VALUES (?,?,?,?,?,?,?,NULL)`,
        'tok_r', 'book_a', 'email', 'x@pelda.hu', 'user', 'sub_alice', '2026-09-30T00:00:00.000Z');
      let grant; let threw = false;
      try { grant = inviteGrantAt({ store: w.store, invite: w.store.get('SELECT * FROM invite WHERE token = ?', 'tok_r'), clock: w.clock }); }
      catch { threw = true; }
      // A REGISZTER a KÖZÖS otthon: a jog-oldal ismert szerepei nem lehetnek üresek (KUKA-045: szabály, nem darabszám).
      const registryLives = KNOWN_ROLES.length > 0 && KNOWN_ROLES.every((r) => typeof roleGrants(r, 'own_book') === 'boolean');
      const ok = !right.allowed && cmd.ok === false && !threw && grant && grant.ok === false && registryLives;
      return {
        expected: 'ismeretlen szerep ⇒ jog TILT · parancs NEM véglegesül · a meghívó-oldal NEVEZETTEN utasít el (nem dob)',
        actual: `jog=${right.allowed} (${right.reason}) · parancs=${cmd.ok ? 'VÉGLEGESÜLT' : cmd.error} · meghívó=${threw ? 'DOBOTT' : (grant && grant.reason)} · regiszter=${KNOWN_ROLES.join('/')}`,
        pass: ok,
      };
    } finally { w.store.close(); }
  });

probe('P-CANON-shape', 'R32/K07 · R49 C08 · C10',
  'A kanonizáló nem futtat idegen adaptert és nem nyeli el a lyukas tömböt — a HATÁR nevezetten utasít el',
  () => {
    const w = twoActorWorld();
    try {
      // (a) ADAPTER: a `toJSON` a DEKLARÁLT tartalom fölé írna — két szándék egy azonossággal.
      const adapter = { lines: { toJSON: () => [{ sku: 'X', qty: 1 }], real: 999 } };
      let adapterReason = null;
      try { canonicalize(adapter); } catch (e) { adapterReason = e instanceof CanonError ? e.reason : `IDEGEN:${e.name}`; }
      // (b) LYUKAS TÖMB: az `Array(1)` és a `[]` bájtra azonos alakot adna.
      let sparseReason = null;
      try { canonicalize({ a: Array(1) }); } catch (e) { sparseReason = e instanceof CanonError ? e.reason : `IDEGEN:${e.name}`; }
      // (c) A `Date` az EGYETLEN engedélyezett adapter — a szigorítás nem tehet tönkre működő alakot.
      const dateOk = canonicalize(new Date('2026-09-09T08:00:00.000Z')) === '"2026-09-09T08:00:00.000Z"';
      // (d) A HATÁRON nevezett elutasítás jön, NEM nyers kivétel (KUKA-020 · KUKA-064).
      const atBoundary = CMD(w, { declared: adapter });
      const ok = adapterReason === 'adapter_not_allowed' && sparseReason === 'sparse_array' && dateOk
        && atBoundary.ok === false && atBoundary.error === 'declared_not_canonical' && !!atBoundary.reason;
      return {
        expected: 'adapter ⇒ adapter_not_allowed · lyukas tömb ⇒ sparse_array · Date MŰKÖDIK · a határon declared_not_canonical',
        actual: `adapter=${adapterReason} · lyuk=${sparseReason} · Date=${dateOk} · határ=${atBoundary.error}/${atBoundary.reason}`,
        pass: ok,
      };
    } finally { w.store.close(); }
  });

probe('P-TIME-calendar', 'R32/K12 · R49 C09',
  'A NEM LÉTEZŐ naptári nap nem normalizálódik érvényes időponttá — a KÖZÖS időfeloldón, minden hívónak',
  () => {
    // A `new Date('2026-02-30')` MÁRCIUS 2-ra csúszik: egy nem létező lejárat így érvényessé válna.
    const bad = instantMs('2026-02-30T00:00:00.000Z');
    const bad2 = instantMs('2026-13-01T00:00:00.000Z');
    const bad3 = instantMs('2026-04-31T00:00:00.000Z');
    const good = instantMs('2026-02-28T00:00:00.000Z');
    const leap = instantMs('2024-02-29T00:00:00.000Z');   // SZÖKŐÉV: valódi nap, nem eshet ki
    // KÉT KÜLÖN OK, SZÁNDÉKOSAN: a 13. hónap már ALAKILAG sem időpont (`instant_unparseable`), a
    // február 30. viszont SZABÁLYOS ALAKÚ, csak nem LÉTEZŐ nap (`instant_not_a_calendar_day`).
    // Az első alakomban azonos indokot követeltem — az az én kitalált többletem volt, nem a
    // joghatár része; a megkülönböztetés TÖBBET mond, nem kevesebbet (KUKA-064).
    const ok = !bad.ok && !bad2.ok && !bad3.ok && good.ok && leap.ok
      && bad.reason === 'instant_not_a_calendar_day' && bad3.reason === 'instant_not_a_calendar_day'
      && !!bad2.reason;
    return {
      expected: 'február 30. és április 31. ⇒ instant_not_a_calendar_day · 13. hónap ⇒ NEVEZETT alaki tilt · február 28. és a SZÖKŐNAP ⇒ érvényes',
      actual: `02-30=${bad.reason || 'ELFOGADVA'} · 13-01=${bad2.reason || 'ELFOGADVA'} · 04-31=${bad3.reason || 'ELFOGADVA'} · 02-28=${good.ok} · szökőnap=${leap.ok}`,
      pass: ok,
    };
  });

probe('P-IDENTITY-address', 'R32/K03 · R49 C07',
  'KÉT bizonyíték UGYANARRA az emberre EGY személy — nem „több élő alany", és nem új fiók',
  () => {
    const w = buildWorld({ inviteeHasAccount: true });
    try {
      // MÁSODIK, független forrásból származó kötés — UGYANARRA a belső alanyra.
      w.store.run(
        `INSERT INTO external_id (subject_id, namespace, issuer, jurisdiction, value_raw, value_norm,
                                  cardinality, valid_from, valid_to)
         VALUES (?,?,?,?,?,?,?,?,NULL)`,
        'sub_invitee', 'email', 'masik_kibocsato', 'n/a', 'kovacs@pelda.hu', 'kovacs@pelda.hu',
        'one_to_one', w.clock.now());
      w.store.run('INSERT INTO channel_proof (subject_id, namespace, value_norm, proven_at) VALUES (?,?,?,?)',
        'sub_invitee', 'email', 'kovacs@pelda.hu', w.clock.now());
      const obs = observeInvite({ store: w.store, token: 'tok_1', viewerSubjectId: 'sub_invitee', clock: w.clock });
      const red = redeemInvite({ store: w.store, token: 'tok_1', actingSubjectId: 'sub_invitee', clock: w.clock });
      const cred = w.store.get('SELECT credential FROM account WHERE subject_id = ?', 'sub_invitee').credential;
      const ok = obs.status === 'redeem_as_existing' && red.ok && red.shape === 'membership_only'
        && cred === 'cred_EREDETI';
      return {
        expected: 'két kötés EGY alanyra ⇒ MEGLÉVŐ emberként megy tovább (redeem_as_existing · membership_only) · a hitelesítő VÁLTOZATLAN',
        actual: `megfigyelés=${obs.status} · beváltás=${red.ok ? red.shape : red.error}${red.reason ? ` (${red.reason})` : ''} · hitelesítő=${cred}`,
        pass: ok,
      };
    } finally { w.store.close(); }
  });

probe('P-NORM-evidence', 'R32/K11 · R53 F03 · F04 · KUKA-038 · KUKA-095',
  // A CÍM NEM HORDOZ KÉZZEL LÉPTETETT DARABSZÁMOT (KUKA-045). A korábbi „tizenkét támadás" felirat
  // már 23 kontrollnál is tizenkettőt mondott — a felirat elcsúszott a mért értéktől, pont azon a
  // próbán, aminek a hazugság-kiszűrés a tárgya. A MÉRT szám a `detail` sorban áll, futásból.
  'A NORMA-BIZONYÍTÉK KAPU nem tud hazudni: MINDEN támadás piros, a helyes csomag zöld',
  () => {
    // MIT MÉR EZ A PRÓBA, ÉS MIT NEM. Az alanya maga a KAPU (`checkNorms`), nem a mag üzleti
    // viselkedése: azt kérdezi, hogy a kapu a SZÁNDÉKOSAN elrontott bizonyíték-csomagokat
    // elutasítja-e. A VALÓDI futás valódi csomagját nem ez, hanem a futtató kiértékelője méri —
    // két külön kérdés, két külön helyen (KUKA-002). A saját csomagom nem bizonyíték a valódi
    // futásra, és fordítva sem (KUKA-054).
    //
    // Az F03 EREDETI alakja („kössük át a normát egy idegen, létező próbára") a mai szerződésben
    // fogalmilag nem létezik, mert a norma NEM tárol próbanevet. A támadás ÚJ alakja (n1) ezért a
    // MANIFESTET támadja: az idegen `P-A04` deklarálja a REV-N1a-t. Ez az egyenértékű, sőt
    // erősebb próba — a régi alakon a kapu zöld maradt, ezen pirosra megy.
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const baseProbes = clone(EXPECTED_PROBES);
    const baseRecords = baseProbes.map((p) => ({
      probe_id: p.id, status: 'PASS',
      assertions: (p.discharges || []).map((d) => ({ id: d.assertion, pass: true })),
    }));
    // A SZINTETIKUS MUTÁCIÓS EREDMÉNYEK (R55/F03). Minden deklarált klauzula-állításhoz EGY,
    // eredet-helyes eredmény: alkalmazva, két KÜLÖNBÖZŐ forrás-lenyomat, futás-jel, és a HAMISRA
    // fordult állítás NÉV SZERINT. A kapu innentől ezt kéri — a puszta definíció nem elég.
    // A SZINTETIKUS CSOMAG A VALÓDI SZERZŐDÉST BESZÉLI (R57/F02). Korábban kitalált
    // mutáció-azonosítókkal (`Mszint_…`) és kitalált lenyomatokkal dolgozott — vagyis a saját
    // nyelvjárását mérte, nem a fogyasztóét (KUKA-068). Mostantól VALÓDI regiszter-mutációt választ,
    // és az „elvárt" értékeket EGY helyről veszi, ahogy az éles battéria is: a szülő adja, a csomag
    // nem írhatja felül magának.
    const mutOf = (probeId, i) => {
      const owned = MUTATIONS.filter((m) => m.catcher === probeId);
      return owned[i] || owned[0] || null;
    };
    const EXPECT = {
      base_digest: 'sha256:alap_a_szulotol',
      run_tokens: Object.fromEntries(MUTATIONS.map((m) => [m.id, `rt_${m.id}`])),
      mutated_digests: Object.fromEntries(MUTATIONS.map((m) => [m.id, `sha256:mutalt_${m.id}`])),
    };
    const okResults = () => baseProbes.flatMap((p) => (p.discharges || []).map((d, i) => {
      const m = mutOf(p.id, i);
      return {
        mutation_id: m ? m.id : `NINCS_MUTACIO_${p.id}`, catcher: p.id, applied: true,
        base_digest: EXPECT.base_digest,
        mutated_digest: m ? EXPECT.mutated_digests[m.id] : 'sha256:nincs',
        run_token: m ? EXPECT.run_tokens[m.id] : 'rt_nincs',
        probe_id: p.id, probe_status: 'FAIL', failed_assertions: [d.assertion],
        verdict: 'CAUGHT', evidence_limit: null,
      };
    }));
    const base = (over) => ({
      probes: clone(baseProbes), mutations: MUTATIONS, records: clone(baseRecords),
      mutationResults: okResults(), expectation: EXPECT, ...over,
    });
    const findP = (b, id) => b.probes.find((p) => p.id === id);
    const findR = (b, id) => b.records.find((r) => r.probe_id === id);
    const said = (res, needle) => res.problems.some((p) => p.includes(needle));

    const controls = [];
    const control = (id, what, fn) => { const r = fn(); controls.push({ id, what, ...r }); };

    // (n0) ELLENPÁR — a helyes csomagon ZÖLD. Az őr, ami mindent pirosra visz, ugyanolyan
    // hasznavehetetlen, mint az, ami mindent átenged (KUKA-049).
    control('n0', 'a HELYES bizonyíték-csomag zöld, és a két bizonyítható klauzula fedett', () => {
      const res = checkNorms(base());
      const revN1 = res.norms.find((n) => n.id === 'REV-N1');
      const orgN2 = res.norms.find((n) => n.id === 'ORG-N2');
      return {
        pass: res.ok === true && res.integrity_ok === true
          && revN1 && revN1.covered_clause_ids.includes('REV-N1a') && revN1.covered_clause_ids.includes('REV-N1b')
          && revN1.state === 'partial'   // a REV-N1c szándékosan nyitott — nem 'implemented'
          && orgN2 && orgN2.state === 'implemented',
        detail: res.ok ? `REV-N1=${revN1 && revN1.state} · ORG-N2=${orgN2 && orgN2.state}` : res.problems[0],
      };
    });

    // (n1) IDEGEN, LÉTEZŐ PRÓBA — az R53/F03 támadása a mai szerződésben.
    control('n1', 'idegen létező próbára átkötött klauzula PIROS', () => {
      const b = base();
      const gate = findP(b, 'P-CMD-finalize-gate');
      const moved = gate.discharges.find((d) => d.clause === 'REV-N1a');
      gate.discharges = gate.discharges.filter((d) => d.clause !== 'REV-N1a');
      findP(b, 'P-A04').discharges = [moved];
      findR(b, 'P-CMD-finalize-gate').assertions = findR(b, 'P-CMD-finalize-gate').assertions
        .filter((a) => a.id !== moved.assertion);
      const res = checkNorms(b);
      return { pass: res.integrity_ok === false && said(res, 'P-A04') && said(res, moved.assertion),
        detail: res.problems[0] || '(nem mondott semmit)' };
    });

    // (n2) RÉSZLEGES LEFEDÉS — a klauzula deklarációja eltűnik, hiány-mondat nélkül.
    control('n2', 'részleges lefedés hiány-mondat nélkül PIROS', () => {
      const b = base();
      const gate = findP(b, 'P-CMD-finalize-gate');
      const dropped = gate.discharges.find((d) => d.clause === 'REV-N1b');
      gate.discharges = gate.discharges.filter((d) => d.clause !== 'REV-N1b');
      const rec = findR(b, 'P-CMD-finalize-gate');
      rec.assertions = rec.assertions.filter((a) => a.id !== dropped.assertion);
      const res = checkNorms(b);
      // A JEL PONTOSSÁGA IS SZÁMÍT (KUKA-049): a maradék klauzula fedett MARAD, és a lelet
      // KIZÁRÓLAG az elejtett REV-N1b-ről szól — nem egy mellékhatásról.
      const stillCovered = res.chain.some((c) => c.clause_id === 'REV-N1a' && c.result === 'covered');
      return { pass: res.integrity_ok === false && said(res, 'REV-N1b') && stillCovered
        && res.integrity_problems.every((p) => !p.includes('REV-N1a')),
        detail: res.integrity_problems[0] || '(néma)' };
    });

    // (n3) BUKOTT PRÓBA — ez NEM a regiszter hibája, hanem mért regresszió: a szerkezet ép, a
    // bizonyíték nem áll meg, és a klauzula nem lesz fedett.
    control('n3', 'bukott próba: a klauzula NEM fedett, de a regiszter szerkezete ép', () => {
      const b = base();
      findR(b, 'P-CMD-finalize-gate').status = 'FAIL';
      const res = checkNorms(b);
      const revN1 = res.norms.find((n) => n.id === 'REV-N1');
      return { pass: res.ok === false && res.integrity_ok === true && revN1.clauses_covered === 0
        && res.evidence_problems.some((p) => p.includes('P-CMD-finalize-gate')),
        detail: res.evidence_problems[0] || '(néma)' };
    });

    // (n4) KIMARADT PRÓBA — a hiányzó rekord nem lehet néma „teljesült" (KUKA-012).
    control('n4', 'hiányzó próbarekord: a klauzula NEM fedett', () => {
      const b = base();
      b.records = b.records.filter((r) => r.probe_id !== 'P-CMD-finalize-gate');
      const res = checkNorms(b);
      return { pass: res.ok === false && res.chain.some((c) => c.result === 'probe_missing'),
        detail: res.evidence_problems[0] || '(néma)' };
    });

    // (n5) FALSZIFIKÁLATLAN PRÓBA — ha egyetlen mutáció sem nevezi elkapónak, nem tudjuk, hogy
    // egyáltalán képes-e bukni; a soha nem bukó próba díszpipa (KUKA-041).
    control('n5', 'visszabontási kontroll nélküli próba PIROS', () => {
      const b = base();
      b.mutations = MUTATIONS.filter((m) => m.catcher !== 'P-CMD-finalize-gate');
      const res = checkNorms(b);
      return { pass: res.integrity_ok === false && said(res, 'visszabontási kontroll'),
        detail: res.problems[0] || '(néma)' };
    });

    // (n6) ROSSZ ÁLLÍTÁS — a manifest olyat ígér, amit a próba meg sem kérdez (KUKA-016).
    control('n6', 'a deklarált állítást a próba nem adja ki: PIROS', () => {
      const b = base();
      findR(b, 'P-CMD-finalize-gate').assertions = [{ id: 'A-VALAMI-MAS', pass: true }];
      const res = checkNorms(b);
      return { pass: res.integrity_ok === false && said(res, 'A-REV-N1a-dependent-new-op-and-release-blocked')
        && said(res, 'A-VALAMI-MAS'), detail: res.problems.join(' · ').slice(0, 160) };
    });

    // (n7) GAZDÁTLAN DEKLARÁCIÓ — a manifest olyan klauzulát vált be, amit egyetlen norma sem
    // definiál. A halott bejegyzés kellemetlen, a hiányzó NÉMA — ezért mindkét irány (KUKA-039).
    control('n7', 'nem létező klauzulára mutató deklaráció PIROS', () => {
      const b = base();
      findP(b, 'P-A04').discharges = [{ clause: 'REV-N9z', assertion: 'A-KITALALT' }];
      const res = checkNorms(b);
      return { pass: res.integrity_ok === false && said(res, 'REV-N9z'), detail: res.problems[0] || '(néma)' };
    });

    // (n8) A RÉGI HÍVÁSI ALAK — puszta próbanév-lista. Bizonyíték nélkül a kapu NEM mond igent.
    control('n8', 'bizonyíték-csomag nélküli (régi) hívás fail-closed', () => {
      const res = checkNorms(EXPECTED_IDS);
      return { pass: res.ok === false && res.legacy_call === true && res.integrity_ok === false,
        detail: res.problems[0].slice(0, 120) };
    });

    // ── R55/F03 — A FALSZIFIKÁCIÓ MINT MÉRÉS, NEM MINT SZÁNDÉK ────────────────────────────────
    //
    // (n9) A PUSZTA DEFINÍCIÓ NEM BIZONYÍTÉK (a külső fél N01 esete). Két, SOHA NEM FUTTATOTT
    // `{id, catcher}` bejegyzés mellett SEMMI nem lehet fedett.
    control('n9', 'soha nem futtatott mutáció-DEFINÍCIÓ nem ad fedettséget', () => {
      const defs = baseProbes.filter((p) => (p.discharges || []).length)
        .map((p, i) => ({ id: `SOHA_NEM_FUTOTT_${i}`, catcher: p.id }));
      const res = checkNorms({ probes: clone(baseProbes), mutations: defs, records: clone(baseRecords) });
      return { pass: !res.chain.some((c) => c.result === 'covered')
        && res.falsification_stage === 'pending',
        detail: `fázis=${res.falsification_stage}, fedett=${res.chain.filter((c) => c.result === 'covered').length}` };
    });

    // (n10) A KLAUZULA SAJÁT ÁLLÍTÁSÁT KELL MEGBUKTATNI (N04). Egy eredmény, ami MÁSIK állítást
    // buktat ugyanazon a próbán, nem igazolja ezt a klauzulát.
    control('n10', 'MÁS állítást buktató mutációs eredmény nem igazolja a klauzulát', () => {
      const res = checkNorms(base({ mutationResults: okResults().map((r) => ({
        ...r, failed_assertions: r.probe_id === 'P-CMD-finalize-gate'
          ? ['A-REV-N1a-dependent-new-op-and-release-blocked'] : r.failed_assertions,
      })) }));
      const n1b = res.chain.find((c) => c.clause_id === 'REV-N1b');
      const n1a = res.chain.find((c) => c.clause_id === 'REV-N1a');
      return { pass: n1b && n1b.result === 'not_falsified' && n1a && n1a.result === 'covered',
        detail: `REV-N1a=${n1a && n1a.result} · REV-N1b=${n1b && n1b.result}` };
    });

    // (n11) AZ EREDET KÖTELEZŐ: azonos lenyomat = a szerkesztés meg sem történt · nincs futás-jel =
    // nem eldönthető, MELYIK futás · nincs `applied` = nincs igazolt alkalmazás.
    control('n11', 'eredet nélküli mutációs eredmény nem bizonyíték', () => {
      const bad = [
        { name: 'azonos lenyomat', patch: (r) => ({ ...r, mutated_digest: r.base_digest }) },
        { name: 'nincs futás-jel', patch: (r) => ({ ...r, run_token: null }) },
        { name: 'nincs alkalmazás', patch: (r) => ({ ...r, applied: false }) },
      ];
      const outs = bad.map((b) => {
        const res = checkNorms(base({ mutationResults: okResults().map(b.patch) }));
        return { name: b.name, covered: res.chain.filter((c) => c.result === 'covered').length };
      });
      return { pass: outs.every((o) => o.covered === 0),
        detail: outs.map((o) => `${o.name}:${o.covered}`).join(' ') };
    });

    // (n12) ISMÉTLŐDŐ ÁLLÍTÁS-AZONOSÍTÓ (N02): a kétértelmű csomag integritási hiba — akkor is, ha
    // a két érték egyforma. A kapu nem dönthet arról, melyik az igaz.
    control('n12', 'ismétlődő állítás-azonosító PIROS (ellentétes ÉS azonos értékkel is)', () => {
      const both = [false, true].map((v) => {
        const b = base();
        const rec = findR(b, 'P-CMD-finalize-gate');
        rec.assertions.push({ ...rec.assertions[0], pass: v });
        const res = checkNorms(b);
        return { v, red: res.integrity_ok === false && said(res, 'ISMÉTLŐDŐ állítás-azonosító') };
      });
      return { pass: both.every((x) => x.red), detail: both.map((x) => `${x.v}:${x.red}`).join(' ') };
    });

    // ── R57/F02 — AZ EREDET TÉNYLEGES ÖSSZEHASONLÍTÁSA ─────────────────────────────────────────
    // A külső fél E01/E03 esete KITÖLTÖTT csomaggal jött: minden mező a helyén, csak épp IDEGEN.
    // Az R56-os kapu a mezők MEGLÉTÉT nézte, ezért mindhárom klauzulát `covered`-nek fogadta el.
    // Ezek a kontrollok a MEGLÉT helyett az EGYEZÉST mérik — külön-külön minden eredet-tengelyen.
    const noneCovered = (over) => {
      const res = checkNorms(base(over));
      return { pass: !res.chain.some((c) => c.result === 'covered'), detail: res.chain.filter((c) => c.result === 'covered').length + ' fedett' };
    };
    control('n13', 'IDEGEN alap-lenyomat PIROS (nem a mért alapé)', () => noneCovered({
      mutationResults: okResults().map((r) => ({ ...r, base_digest: 'sha256:idegen-alap' })),
    }));
    control('n14', 'MÁS futás jele PIROS (elavult csomag)', () => noneCovered({
      mutationResults: okResults().map((r) => ({ ...r, run_token: 'rt_egy_korabbi_futasbol' })),
    }));
    control('n15', 'NEM REGISZTERBELI mutáció-azonosító PIROS', () => noneCovered({
      mutationResults: okResults().map((r) => ({ ...r, mutation_id: 'NOT_IN_REGISTRY' })),
    }));
    control('n16', 'a VÁRTTÓL eltérő mutált lenyomat PIROS', () => noneCovered({
      mutationResults: okResults().map((r) => ({ ...r, mutated_digest: 'sha256:mas-mutalt' })),
    }));
    control('n17', 'ELLENTMONDÓ csomag PIROS (SURVIVED ítélet · PASS próba-állapot)', () => {
      const both = [
        okResults().map((r) => ({ ...r, verdict: 'SURVIVED' })),
        okResults().map((r) => ({ ...r, probe_status: 'PASS' })),
      ].map((mutationResults) => noneCovered({ mutationResults }).pass);
      return { pass: both.every(Boolean), detail: both.join('/') };
    });
    control('n18', 'ELVÁRÁS NÉLKÜL fail-closed (a csomag nem igazolhatja saját magát)',
      () => noneCovered({ expectation: undefined }));
    control('n19', 'a manifest által NEM deklarált állításra hivatkozó bizonyíték PIROS', () => {
      // A csomag olyan állítást nevez meg, amit a próba nem deklarál: a `failed_assertions` idegen.
      const res = checkNorms(base({
        mutationResults: okResults().map((r) => ({ ...r, failed_assertions: ['A-IDEGEN-allitas'] })),
      }));
      return { pass: !res.chain.some((c) => c.result === 'covered'), detail: `${res.chain.filter((c) => c.result === 'covered').length} fedett` };
    });

    // ── R57/F01 — A KÖTELEZŐ KÉSZLET ───────────────────────────────────────────────────────────
    control('n20', 'a KÖTELEZŐ készlet hiánya kimondva (üres bukott-lista ⇒ required.ok=false)', () => {
      const res = checkNorms(base({ mutationResults: okResults().map((r) => ({ ...r, failed_assertions: [] })) }));
      const ok = res.required && res.required.ok === false && res.required.missing.length > 0
        && res.evidence_problems.some((x) => x.includes('KÖTELEZŐ BIZONYÍTÉK'));
      return { pass: !!ok, detail: res.required ? `${res.required.missing.length} hiány` : 'nincs required blokk' };
    });
    control('n21', 'a HELYES csomagnál a kötelező készlet teljesül', () => {
      const res = checkNorms(base());
      return { pass: !!(res.required && res.required.ok === true), detail: res.required ? res.required.satisfied.join(',') : 'nincs' };
    });

    // ── R57 §6 — A FORRÁSDOKUMENTUM KÖTÉSE ─────────────────────────────────────────────────────
    // ── R57/F03 — A TARTALMI JÓVÁHAGYÁS SZERZŐDÉSE ────────────────────────────────────────────
    // NÉGY állapot, mind a négyre kontroll. A `current` ELLENPÁRJA külön fontos: enélkül nem
    // tudnánk, hogy a kapu egyáltalán ÁTENGEDHETŐ-e — egy soha nem teljesülő szabály ugyanolyan
    // haszontalan, mint egy mindent átengedő (KUKA-049: az őr ne a kért eredményt jelentse kudarcnak).
    // A próba SZINTETIKUS klauzulán fut: a valódi 18 klauzula `none` marad, ahogy van.
    // A FELOLDÓ-KATALÓGUS A VALÓDI SZERZŐDÉSBŐL (R61/F01). A saját fixtúra NEM beszélhet olyan
    // nyelvjárást, amit a fogyasztó nem ismer (KUKA-068): a próba- és mutáció-hivatkozás a MANIFESZT
    // és a REGISZTER tényleges azonosítóit hordozza, a dokumentum-hivatkozás pedig a MÉRT lenyomatot.
    const REVIEW_CATALOG = Object.freeze({
      // A kulcsot az ÍRÓ és az OLVASÓ ugyanabból a feloldóból veszi (KUKA-018/024) — a szeparátor
      // EGY helyen él, itt nem gépeljük le újra.
      assertions: new Set(EXPECTED_PROBES.flatMap((p) => (p.discharges || []).map((d) => assertionKey(p.id, d.assertion)))),
      mutations: new Set(MUTATIONS.map((m) => m.id)),
      documents: sourceDocumentCatalog(),
    });
    const REAL_PROBE = EXPECTED_PROBES.find((p) => (p.discharges || []).length);
    const REAL_MUT = MUTATIONS.find((m) => m.catcher === REAL_PROBE.id) || MUTATIONS[0];
    const REAL_DOC = [...REVIEW_CATALOG.documents.values()][0];
    const probeRef = (note) => ({ kind: 'probe', probe: REAL_PROBE.id, assertion: REAL_PROBE.discharges[0].assertion, note });
    const mutRef = (note) => ({ kind: 'mutation', mutation: REAL_MUT.id, note });
    const docRef = (note) => ({ kind: 'document', document: REAL_DOC.id, digest: REAL_DOC.digest, note });

    control('n23', 'a tartalmi jóváhagyás ÖT állapota (none · incomplete · invalid · stale · current)', () => {
      const bind = { source_digest: 'sha256:forras', manifest_digest: 'sha256:manifest' };
      const cl = { id: 'PROBA-X', covers: ['K00'], text: 'szintetikus klauzula a kapu méréséhez' };
      const full = () => ({
        record_version: CONTENT_REVIEW_RECORD_VERSION,
        reviewer: { id: 'proba-ellenorzo', role: 'független szemle', independent_of: 'a szerző' },
        at: '2026-09-11T00:00:00.000Z',
        contract_digest: contractRefDigest(),
        clause_digest: clauseDigestOf(cl),
        source_digest: bind.source_digest,
        manifest_digest: bind.manifest_digest,
        situation: 'élethelyzet', property: 'mérendő tulajdonság',
        // A BIZONYÍTÉK-HIVATKOZÁS TÍPUSOS ÉS TÉNYLEGESEN FELOLDÓDIK (R59/F03 · R61/F01): VALÓDI
        // próba-állítás pár + VALÓDI mutáció, mellé a dokumentum HÁTTÉR-hivatkozásként, mért lenyomattal.
        positive_evidence: [probeRef('a pozitív eset'), docRef('a pozitív eset helye')],
        negative_evidence: [mutRef('az ellenpélda'), docRef('az ellenpélda helye')],
        residual: 'mi maradt ki',
      });
      const st = (over, b2 = bind, cat = REVIEW_CATALOG) => contentReviewState({ ...cl, content_review: over }, b2, cat).state;
      const cases = {
        none: st(undefined) === 'none',
        incomplete_ures: st({ contract_digest: contractRefDigest(), clause_digest: clauseDigestOf(cl) }) === 'incomplete',
        incomplete_hianyos_ellenorzo: st({ ...full(), reviewer: { id: 'x' } }) === 'invalid',
        incomplete_nincs_maradek: st({ ...full(), residual: null }) === 'invalid',
        stale_forras_elcsuszott: st({ ...full(), source_digest: 'sha256:regi' }) === 'stale',
        stale_manifest_elcsuszott: st({ ...full(), manifest_digest: 'sha256:regi' }) === 'stale',
        stale_nincs_kotes: st(full(), null) === 'stale',
        current_teljes: st(full()) === 'current',
      };
      const bad2 = Object.entries(cases).filter(([, v]) => !v).map(([k]) => k);
      return { pass: bad2.length === 0, detail: bad2.length ? `NEM: ${bad2.join(', ')}` : '8/8 állapot helyes' };
    });

    // ── R59/F03 — A TÍPUSOS, VERZIÓZOTT JÓVÁHAGYÁS-REKORD ──────────────────────────────────────
    // A külső fél E09 esete a `!!mező` rést mérte: az ÜRES TÖMB, az ÜRES OBJEKTUM és a `'not-a-date'`
    // mind „truthy", tehát a régi kapu `current`-et adott egy olyan rekordra, amiben SEMMI nem volt
    // értelmezhető. Itt minden alakot külön mérünk — és a HITELESSÉG külön tengelyét is.
    control('n27', 'ROSSZ ALAKÚ jóváhagyás-rekord soha nem `current` (típus · időbélyeg · hivatkozás · verzió)', () => {
      const bind = { source_digest: 'sha256:forras', manifest_digest: 'sha256:manifest' };
      const cl = { id: 'PROBA-Y', covers: ['K00'], text: 'szintetikus klauzula az alak-szemléhez' };
      const full = () => ({
        record_version: CONTENT_REVIEW_RECORD_VERSION,
        reviewer: { id: 'proba-ellenorzo', role: 'független szemle', independent_of: 'a szerző' },
        at: '2026-09-11T00:00:00.000Z',
        contract_digest: contractRefDigest(), clause_digest: clauseDigestOf(cl),
        source_digest: bind.source_digest, manifest_digest: bind.manifest_digest,
        situation: 'élethelyzet', property: 'mérendő tulajdonság',
        positive_evidence: [probeRef('a pozitív eset'), docRef('hely')],
        negative_evidence: [mutRef('az ellenpélda'), docRef('hely')],
        residual: 'mi maradt ki',
      });
      const res = (over, b2 = bind, cat = REVIEW_CATALOG) => contentReviewState({ ...cl, content_review: over }, b2, cat);
      const bad4 = (over, cat = REVIEW_CATALOG) => res(over, bind, cat).state === 'invalid';
      const cases = {
        // A KÜLSŐ FÉL E09 CSOMAGJA, betűre.
        e09_teljes_alakhiba: bad4({
          ...full(),
          reviewer: { id: [], role: {}, independent_of: [] }, at: 'not-a-date',
          situation: [], property: {}, positive_evidence: [], negative_evidence: [], residual: [],
        }),
        ures_szoveg: bad4({ ...full(), situation: '   ' }),
        ures_tomb_ellenorzo: bad4({ ...full(), reviewer: { id: [], role: 'r', independent_of: 'x' } }),
        rossz_idobelyeg: bad4({ ...full(), at: 'not-a-date' }),
        nem_kanonikus_ido: bad4({ ...full(), at: '2026-09-11' }),
        jovobeli_ido: bad4({ ...full(), at: '2099-01-01T00:00:00.000Z' }),
        ures_bizonyitek_lista: bad4({ ...full(), positive_evidence: [] }),
        szoveg_bizonyitek: bad4({ ...full(), negative_evidence: 'ellenpélda' }),
        ismeretlen_hivatkozas_fajta: bad4({ ...full(), positive_evidence: [{ kind: 'pletyka', ref: 'x' }] }),
        // FELOLDHATÓSÁG: kitalált próba-név, katalógussal a kézben.
        feloldhatatlan_proba: bad4(
          { ...full(), positive_evidence: [{ kind: 'probe', probe: 'P-NINCS-ILYEN', assertion: 'A-x' }] },
        ),
        feloldhatatlan_mutacio: bad4(
          { ...full(), negative_evidence: [{ kind: 'mutation', mutation: 'M-NINCS' }] },
        ),
        // ── R61/F01 — A FELOLDÁS MINT ÖNÁLLÓ TENGELY ──────────────────────────────────────────
        // KATALÓGUS NÉLKÜL a válasz `unresolved`, nem `current`: a hiányzó ellenőrzési kontextus
        // többé nem felmentés (az ő R01 esetük).
        // A hívás KÖZVETLEN, nem a `res` segéden át: annak alap-értéke a katalógus, tehát az
        // `undefined` átadása épp a mérendő esetet tüntetné el (KUKA-068 a saját fixtúrán).
        katalogus_nelkul_unresolved:
          contentReviewState({ ...cl, content_review: full() }, bind).state === 'unresolved'
          && res(full(), bind, { assertions: new Set(), mutations: new Set() }).state === 'unresolved',
        // KITALÁLT DOKUMENTUM: a régi alak két szabad szöveget kért és semmit nem oldott fel
        // (az ő R02 esetük). Mindkét régi alak elutasítva: a `ref`-es forma és a nem létező név is.
        kitalalt_dokumentum_regi_alak: bad4({
          ...full(),
          positive_evidence: [probeRef('p'), { kind: 'document', ref: 'NINCS-ILYEN', note: 'kitalált' }],
        }),
        kitalalt_dokumentum_nev: bad4({
          ...full(),
          positive_evidence: [probeRef('p'), { kind: 'document', document: 'NINCS-ILYEN.md', digest: REAL_DOC.digest, note: 'kitalált' }],
        }),
        dokumentum_lenyomat_elcsuszott: bad4({
          ...full(),
          negative_evidence: [mutRef('m'), { kind: 'document', document: REAL_DOC.id, digest: 'sha256:' + '0'.repeat(64), note: 'régi' }],
        }),
        dokumentum_lenyomat_nelkul: bad4({
          ...full(),
          positive_evidence: [probeRef('p'), { kind: 'document', document: REAL_DOC.id, note: 'lenyomat nélkül' }],
        }),
        // CSAK DOKUMENTUM: megnevezi, hol az állítás — de nem bizonyítja, hogy bármi LEFUTOTT.
        csak_dokumentum_nem_bizonyitek: bad4({ ...full(), positive_evidence: [docRef('csak hely')] }),
        hianyzo_verzio: res({ ...full(), record_version: undefined }).state === 'incomplete',
        ismeretlen_verzio: bad4({ ...full(), record_version: 'content-review-0' }),
        // A HITELESSÉG KÜLÖN TENGELY, és a `current` sem állítja.
        hitelesseg_kulon_es_nemleges: res(full()).state === 'current'
          && res(full()).authenticity.state === 'unauthenticated',
        allitott_elfogadas_sem_bizonyitek:
          res({ ...full(), acceptance: { method: 'aláírás' } }).authenticity.state === 'unverified_claim',
      };
      const nem = Object.entries(cases).filter(([, v]) => !v).map(([k]) => k);
      return { pass: nem.length === 0, detail: nem.length ? `NEM: ${nem.join(', ')}` : `${Object.keys(cases).length}/${Object.keys(cases).length} alak elutasítva` };
    });

    control('n22', 'az R32 forráskötés MÉRT és egyezik a külső fél kiadott értékével', () => {
      const m = sourceArtifactMeasurement();
      const ok = m.measured.text_digest === m.attested.text_digest
        && m.measured.byte_length === m.attested.byte_length
        && m.measured.section_digest === m.attested.section.digest;
      return { pass: ok, detail: `${m.measured.byte_length} bájt · ${m.measured.text_digest.slice(0, 23)}…` };
    });

    // ── R59/F01 — A HIÁNY NEM FELMENTÉS ────────────────────────────────────────────────────────
    // A külső fél E05/E06 esete azt mérte meg, hogy az R57-es kapu FELTÉTELESEN hasonlított:
    // `if (expectation.base_digest && …)`. Ha tehát az elvárt MEZŐ hiányzott, az összehasonlítás
    // egyszerűen elmaradt — a HIÁNY felmentést adott, nem elutasítást. Ugyanez állt a csomag
    // `verdict`/`probe_status` mezőire. Mind a hat változatot MEGMÉRJÜK, külön-külön.
    control('n24', 'HIÁNYOS ELVÁRÁS PIROS mind a négy alakban (base · tokens · digests · üres {})', () => {
      const rows = ['base_digest', 'run_tokens', 'mutated_digests', 'MIND'].map((missing) => {
        const exp = JSON.parse(JSON.stringify(EXPECT));
        if (missing === 'MIND') for (const k of Object.keys(exp)) delete exp[k];
        else delete exp[missing];
        // ÉS A CSOMAG IDEGEN ÉRTÉKET VISZ azon a tengelyen, aminek az elvárása hiányzik — különben
        // a kontroll akkor is zöld lenne, ha a kapu csak véletlenül egyezőt látott (KUKA-054).
        const results = okResults().map((r) => ({
          ...r,
          ...(missing === 'base_digest' || missing === 'MIND' ? { base_digest: 'sha256:idegen-alap' } : {}),
          ...(missing === 'run_tokens' || missing === 'MIND' ? { run_token: 'rt_egy_korabbi' } : {}),
          ...(missing === 'mutated_digests' || missing === 'MIND' ? { mutated_digest: 'sha256:idegen-mutalt' } : {}),
        }));
        return { missing, ...noneCovered({ expectation: exp, mutationResults: results }) };
      });
      const bad3 = rows.filter((r) => !r.pass).map((r) => r.missing);
      return { pass: bad3.length === 0, detail: bad3.length ? `ÁTMENT: ${bad3.join(', ')}` : '4/4 hiányos elvárás elutasítva' };
    });
    control('n25', 'HIÁNYZÓ ítélet / próba-állapot PIROS (a hallgatás nem igenlés)', () => {
      const rows = ['verdict', 'probe_status'].map((key) => {
        const results = okResults().map((r) => { const c = { ...r }; delete c[key]; return c; });
        return { key, ...noneCovered({ mutationResults: results }) };
      });
      const bad3 = rows.filter((r) => !r.pass).map((r) => r.key);
      return { pass: bad3.length === 0, detail: bad3.length ? `ÁTMENT: ${bad3.join(', ')}` : '2/2 hiányzó mező elutasítva' };
    });
    control('n26', 'az ÖRÖKÖLT kulcs nem elvárás (prototípus-lánc), és a NULL sem érték', () => {
      // Az elvárás-táblák ÜRESEK, de a keresett mutáció-azonosító a prototípuson OTT VAN. Sima
      // `expectation.run_tokens[id]` olvasással ez igaz értéket adna — saját kulcson nem.
      const oroklott = (val) => Object.assign(Object.create({ M32: val, M47: val, M23: val }), { sajat: 'x' });
      const cases = {
        orokolt_token: noneCovered({
          expectation: { ...EXPECT, run_tokens: oroklott('rt_M32') },
        }).pass,
        orokolt_lenyomat: noneCovered({
          expectation: { ...EXPECT, mutated_digests: oroklott('sha256:mutalt_M32') },
        }).pass,
        null_ertek_a_csomagban: noneCovered({
          mutationResults: okResults().map((r) => ({ ...r, verdict: null })),
        }).pass,
        ures_szoveg_a_csomagban: noneCovered({
          mutationResults: okResults().map((r) => ({ ...r, run_token: '   ' })),
        }).pass,
        nem_tomb_bukott_lista: noneCovered({
          mutationResults: okResults().map((r) => ({ ...r, failed_assertions: 'A-REV-N1a' })),
        }).pass,
      };
      const bad3 = Object.entries(cases).filter(([, v]) => !v).map(([k]) => k);
      return { pass: bad3.length === 0, detail: bad3.length ? `ÁTMENT: ${bad3.join(', ')}` : '5/5 elutasítva' };
    });

    // ── R59 §5.1 — A KÖVETKEZŐ KÖTELEZŐ CSOMAG ELŐRE LESZÖGEZVE ────────────────────────────────
    // A vállalás akkor ér valamit, ha LÉTEZŐ klauzulákra mutat, és ha az élethelyzet/tulajdonság/
    // bizonyítási terv MOST le van írva — nem utólag, a megépült kódhoz igazítva (KUKA-054). Aki a
    // sorrenden vagy a tartalmon változtat, azt itt kell megtennie, láthatóan (KUKA-087: aki nem
    // tudja leírni, MIÉRT tartozik ide, az valószínűleg nem is oda tartozik).
    control('n28', 'a KÖVETKEZŐ kötelező csomag létező klauzulákra mutat, és a terve ELŐRE le van írva', () => {
      const known = new Set();
      for (const n of ALL_NORMS) for (const c of n.clauses || []) known.add(c.id);
      const nx = NEXT_REQUIRED_EVIDENCE;
      const nem = [];
      if (!nx || nx.version === REQUIRED_EVIDENCE.version) nem.push('a következő csomag verziója nem különbözik a mostanitól');
      for (const id of (nx.clauses || [])) if (!known.has(id)) nem.push(`nem létező klauzula: ${id}`);
      // A MAI kötelező készlettel nem eshet egybe: az már teljesül, tehát nem vállalás.
      for (const id of (nx.clauses || [])) if (REQUIRED_EVIDENCE.clauses.includes(id)) nem.push(`már kötelező: ${id}`);
      const ns = (nx.order || []).map((s) => s.n);
      if (ns.join(',') !== ns.map((_, i) => i + 1).join(',')) nem.push(`a sorrend nem 1..${ns.length}: ${ns.join(',')}`);
      // A LÉPÉSSZÁM SZABÁLYBÓL JÖN, NEM KÉZZEL LÉPTETETT SZÁMBÓL (KUKA-045). A régi alak `< 4`-et
      // követelt, mert az AKKORI csomag három klauzulából állt — a szám a csomaghoz volt szabva, nem
      // a szabályhoz. Egy KÉTKLAUZULÁS csomag emiatt pirosra vitte volna a futást, és a „javítás" a
      // terv PADDINGELÉSE lett volna: a mérce betanít a saját megkerülésére. A valódi követelmény:
      // MINDEN vállalt klauzulának SAJÁT lépése van, és a végén ott a BEEMELÉS lépése.
      const want = (nx.clauses || []).length + 1;
      if (ns.length < want) {
        nem.push(`a terv ${ns.length} lépéses — ${(nx.clauses || []).length} klauzulához legalább `
          + `${want} lépés kell (klauzulánként egy + a beemelés)`);
      }
      const planned = new Set((nx.order || []).flatMap((s) => s.clauses || []));
      for (const id of (nx.clauses || [])) {
        if (!planned.has(id)) nem.push(`a vállalt ${id} klauzulához NINCS lépés a tervben`);
      }
      for (const s of (nx.order || [])) {
        for (const id of (s.clauses || [])) if (!known.has(id)) nem.push(`${s.n}. lépés: nem létező klauzula (${id})`);
        if (!(s.situation || '').length || s.situation.length < 60) nem.push(`${s.n}. lépés: nincs érdemi ÉLETHELYZET`);
        if (!(s.property || '').length || s.property.length < 60) nem.push(`${s.n}. lépés: nincs érdemi MÉRENDŐ TULAJDONSÁG`);
        if (!(s.proof || '').length || s.proof.length < 60) nem.push(`${s.n}. lépés: nincs érdemi BIZONYÍTÁSI TERV`);
      }
      // MINDEN vállalt klauzula szerepeljen legalább egy lépésben (KUKA-039: mindkét irány).
      const inPlan = new Set((nx.order || []).flatMap((s) => s.clauses || []));
      for (const id of (nx.clauses || [])) if (!inPlan.has(id)) nem.push(`a tervben nem szerepel: ${id}`);
      return { pass: nem.length === 0, detail: nem.length ? `NEM: ${nem.join(', ')}` : `${nx.version} · ${nx.clauses.join('+')} · ${ns.length} lépés` };
    });

    // (blk0–blk2) BLK-01 — A BLOKKOLÓ-BEJEGYZÉS ALAKJA (R36). SAJÁT HIBA HOZTA IDE: a két új
    // lezárt blokkolót `signal` mezővel írtam meg a testvérei `guard` mezője helyett, és ezt semmi
    // nem mérte — a futtató a TELJES, zöld mérés UTÁN szállt el a jelentés kiírásakor. A pin ezért
    // a feloldót HÍVJA (KUKA-009), és MINDKÉT irányban mér: a valódi lista tiszta, az elrontott
    // másolat PIROS, és a hiány NEVEZVE jelenik meg, nem futásidejű hibaként (KUKA-020).
    control('blk0', 'a VALÓDI blokkoló-listák alakja hibátlan (ellenpár)', () => {
      const gaps = [...blockerShapeProblems(OPEN_BLOCKERS, 'open'), ...blockerShapeProblems(CLOSED_BLOCKERS, 'closed')];
      return { pass: gaps.length === 0, detail: gaps.length ? gaps.join(' · ') : `${OPEN_BLOCKERS.length} nyitott · ${CLOSED_BLOCKERS.length} lezárt, alak rendben` };
    });
    control('blk1', 'a KITALÁLT mezőnév (`signal` a `guard` helyett) PIROS', () => {
      const broken = CLOSED_BLOCKERS.map((b) => { const c = { ...b }; delete c.guard; c.signal = 'npm run valami'; return c; });
      const gaps = blockerShapeProblems(broken, 'closed');
      const onGuard = gaps.filter((g) => g.includes('guard'));
      return { pass: onGuard.length === CLOSED_BLOCKERS.length, detail: onGuard.length ? `${onGuard.length}/${CLOSED_BLOCKERS.length} bejegyzésen nevezve: ${onGuard[0]}` : 'ÁTENGEDTE a hiányzó `guard` mezőt' };
    });
    control('blk2', 'a NÉMA LEZÁRÁS (üres maradék-mondat vagy ismétlődő azonosító) PIROS', () => {
      const emptyResidual = blockerShapeProblems([{ ...CLOSED_BLOCKERS[0], residual: '   ' }], 'closed');
      const dup = blockerShapeProblems([CLOSED_BLOCKERS[0], CLOSED_BLOCKERS[0]], 'closed');
      return {
        pass: emptyResidual.some((g) => g.includes('residual')) && dup.some((g) => g.includes('ismétlődő')),
        detail: `üres maradék: ${emptyResidual.length} lelet · ismétlődő azonosító: ${dup.length} lelet`,
      };
    });

    const bad = controls.filter((c) => !c.pass);
    const attacks = controls.length - 1;
    return {
      // A SZÁM MÉRT, NEM KÉZZEL LÉPTETETT (KUKA-045): új kontroll felvételekor ez a mondat magától
      // igazat mond, és nem kell egy feliratot utánaigazítani.
      expected: `mind a ${attacks} támadás PIROS, és a helyes csomag ZÖLD (n0)`,
      actual: bad.length === 0
        ? `${controls.length - 1}/${controls.length - 1} támadás elhárítva + ellenpár zöld · ${controls.map((c) => `${c.id}:${c.detail}`).join(' | ').slice(0, 220)}`
        : `NEM VÉDETT: ${bad.map((c) => `${c.id} (${c.what}) → ${c.detail}`).join(' · ')}`,
      pass: bad.length === 0,
    };
  });


// ── KI FUTTATTA (R42 §3/1) ──────────────────────────────────────────────────────────────────────
// Sorrend: `--executed-by=NÉV` · `V3REF_EXECUTED_BY` · `unknown`. Soha nincs beírt alapérték.
const EXECUTED_BY = (() => {
  const arg = process.argv.find((a) => a.startsWith('--executed-by='));
  if (arg) return arg.slice('--executed-by='.length).trim() || 'unknown';
  const env = (process.env.V3REF_EXECUTED_BY || '').trim();
  return env || 'unknown';
})();

import { checkNorms, normsSummary, OPEN_BLOCKERS, CLOSED_BLOCKERS, blockerShapeProblems, NORM_CONTRACT_VERSION, NORMS_INDEX_ID, NORMS_INDEX_SCHEMA, contractRef, indexDigest, contentReviewState, CONTENT_REVIEW_RECORD_VERSION, ALL_NORMS, REQUIRED_EVIDENCE, NEXT_REQUIRED_EVIDENCE, sourceDocumentCatalog, assertionKey, clauseDigest as clauseDigestOf } from './norms.mjs';
const contractRefDigest = () => contractRef().digest;
import { sourceArtifactMeasurement } from './normContract.mjs';
import { manifestDigest } from './manifest.mjs';
import { REVIEWS, REVIEWS_FOR, staleFor, residualStandingFor, checkResolutions } from './reviews.mjs';
import { MANIFEST_VERSION, EXPECTED_IDS, EXPECTED_PROBES, PROBE_STATUS, assertionOf } from './manifest.mjs';
import { MUTATIONS } from './mutations.mjs';

// ═══ REV-N3 — A HATÁSKÖR ÉS A BEJELENTÉS (req-2, 1. és 2. lépés) ══════════════════════════════
//
// AZ ÉLETHELYZET A NORMÁBÓL VAN ÁTVÉVE, nem utólag kitalálva (`NEXT_REQUIRED_EVIDENCE.order`,
// R60-ban rögzítve): egy VOLT BESZÁLLÍTÓ azt állítja, hogy a márciusi meghatalmazás hibás volt, és
// kéri a hozzáférése visszaállítását. Nincs igazolt jogviszonya a céggel.

probe('P-REV-authority', 'R32/K04 · K05 · K09 · REV-N3a · REV-N3c',
  'A JELZÉST fogadjuk hatáskör nélkül is — de a jelzés nem függeszt fel, nem bírál el, és nem változtat jogot',
  () => {
    const w = buildWorld({ inviteeHasAccount: true });
    try {
      // A VOLT BESZÁLLÍTÓ: alany a rendszerben, de a könyvhöz semmilyen jogviszonya nincs.
      w.store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_expartner', 'person');
      // A CÉLPONT: egy élő tagság, amit a jelzés NEM mozdíthat meg.
      w.store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_target', 'person');
      w.store.run(
        'INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
        'sub_target', 'book_a', 'user', w.clock.now());
      // A SZŰK FELHATALMAZÁS: csak FELFÜGGESZTÉSRE szól — jogváltoztatásra NEM.
      w.store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_suspender', 'person');
      grantAdjudicationAuthority({ store: w.store, subjectId: 'sub_suspender', bookId: 'book_a',
        operation: 'suspend', clock: w.clock });

      // (a) HATÁSKÖR NÉLKÜLI jogváltoztatás-kérés → NEVEZETT elutasítás.
      const noAuthority = revokeMembership({
        store: w.store, subjectId: 'sub_target', bookId: 'book_a', clock: w.clock,
        actorSubjectId: 'sub_expartner' });
      const aOk = noAuthority.ok === false && noAuthority.changed === false
        && noAuthority.reason === 'authority_not_established';

      // (a2) AZ ELJÁRÓ ALANY HIÁNYA sem „ismeretlen hívó", hanem nincs igazolt hatáskör (fail-closed).
      const noActor = revokeMembership({
        store: w.store, subjectId: 'sub_target', bookId: 'book_a', clock: w.clock });
      const a2Ok = noActor.ok === false && noActor.reason === 'actor_missing';

      // (b) EGY MÁSIK MŰVELETRE szóló hatáskör NEM elég — a legszűkebb felhatalmazás nem adhat
      //     tágabb hatást. A `suspend` joggal a felfüggesztés MEGY, a megvonás NEM.
      const suspendOk = suspendMembership({
        store: w.store, actorSubjectId: 'sub_suspender', subjectId: 'sub_target',
        bookId: 'book_a', clock: w.clock });
      const wrongOp = revokeMembership({
        store: w.store, subjectId: 'sub_target', bookId: 'book_a', clock: w.clock,
        actorSubjectId: 'sub_suspender' });
      const bOk = suspendOk.ok === true && wrongOp.ok === false
        && wrongOp.reason === 'authority_not_established';

      // (c) A JELZÉS FOGADÁSA hatáskör NÉLKÜL is sikeres — és SEMMIT nem mozdít.
      const before = w.store.get(
        'SELECT * FROM membership WHERE subject_id = ? AND book_id = ?', 'sub_target', 'book_a');
      const ack = submitClaim({ store: w.store, clock: w.clock, claimantRef: 'volt@beszallito.hu',
        bookId: 'book_a', statement: 'A márciusi meghatalmazás hibás volt.' });
      const after = w.store.get(
        'SELECT * FROM membership WHERE subject_id = ? AND book_id = ?', 'sub_target', 'book_a');
      const claimRow = w.store.get('SELECT * FROM claim WHERE claimant_ref = ?', 'volt@beszallito.hu');
      const cOk = ack.accepted === true
        && JSON.stringify(ack) === JSON.stringify(NEUTRAL_CLAIM_ACK)
        && JSON.stringify(before) === JSON.stringify(after)
        && !!claimRow && claimRow.state === 'received';

      // (c2) A JELZÉS UTÁN sem lett hatásköre — a bejelentés nem művelet a jogon.
      const stillNo = revokeMembership({
        store: w.store, subjectId: 'sub_target', bookId: 'book_a', clock: w.clock,
        actorSubjectId: 'sub_expartner' });
      const c2Ok = stillNo.ok === false && stillNo.reason === 'authority_not_established';

      // (d) ELLENPÁR: a HATÁSKÖRÖS eljáró elvégzi a jogváltoztatást — a szabály nem mindenkit zár ki.
      const done = revokeMembership({
        store: w.store, subjectId: 'sub_target', bookId: 'book_a', clock: w.clock,
        actorSubjectId: 'sub_adjudicator' });
      const dOk = done.ok === true && done.changed === true;

      const pass = aOk && a2Ok && bOk && cOk && c2Ok && dOk;
      return {
        expected: 'hatáskör nélkül NEVEZETT elutasítás · más műveletre szóló hatáskör NEM elég · '
          + 'a jelzés fogadása hatáskör nélkül is sikeres és semmit nem mozdít · a hatáskörös elvégzi',
        actual: `(a) ${noAuthority.reason} · (a2) ${noActor.reason} · (b) suspend=${suspendOk.ok}/`
          + `revoke=${wrongOp.reason} · (c) jelzés=${ack.accepted} tagság változatlan=${JSON.stringify(before) === JSON.stringify(after)}`
          + ` · (c2) ${stillNo.reason} · (d) megvonás=${done.ok}/${done.changed}`,
        pass,
        asserts: {
          'A-REV-N3a-authority-is-per-operation': aOk && a2Ok && bOk && dOk,
          'A-REV-N3c-claim-intake-open-and-inert': cOk && c2Ok,
        },
      };
    } finally { w.store.close(); }
  });

probe('P-REV-suspension', 'R32/K04 · K09 · REV-N3a · R67/F01',
  'A FELFÜGGESZTÉS TÉNYLEG FELFÜGGESZT — a siker-jelentés nem hatás',
  () => {
    // R67/F01 (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL). A `suspendMembership` `ok:true, suspended:true`-t
    // adott ÍRÁS NÉLKÜL, és az érintett továbbra is `allowed:true`-t kapott. A régi P-REV-authority
    // azért maradt zöld, mert a VÁLASZ-MEZŐT nézte, nem a KÖVETKEZMÉNYT — ez a próba a
    // következményt méri, végig a hívók útján (KUKA-038).
    const w = twoActorWorld();
    const w2 = twoActorWorld();
    try {
      const ask = (s, b = 'book_a') => rightAt({ store: w.store, subjectId: s, bookId: b, opClass: 'own_book', clock: w.clock });

      // (a) ELŐTTE engedélyezett — enélkül a „tiltott utána" semmit nem bizonyítana.
      const aOk = ask('sub_alice').allowed === true;

      // (b) A HATÁSKÖRÖS FELFÜGGESZT ⇒ UTÁNA tiltott, NEVEZETT okkal (nem „nincs tagságod").
      const susp = suspendMembership({ store: w.store, actorSubjectId: 'sub_adjudicator',
        subjectId: 'sub_alice', bookId: 'book_a', clock: w.clock, reason: 'kifogás elbírálása' });
      const after = ask('sub_alice');
      const bOk = susp.ok === true && susp.suspended === true
        && after.allowed === false && after.reason === 'membership_suspended';

      // (b2) A TAGSÁGHOZ NEM NYÚLT: a felfüggesztés nem vált általános jogmódosítássá.
      const mrow = w.store.get('SELECT * FROM membership WHERE subject_id = ? AND book_id = ?', 'sub_alice', 'book_a');
      const b2Ok = !!mrow && (mrow.revoked_at === null || mrow.revoked_at === undefined);

      // (c) MÁS ALANY és MÁS KÖNYV VÁLTOZATLAN — a felfüggesztés célzott.
      const cOk = ask('sub_carol').allowed === true && ask('sub_bob', 'book_b').allowed === true;

      // (d) JOGOSULATLAN KÉRÉS HATÁSTALAN: `sub_carol` admin tag, de nincs `suspend` hatásköre.
      const rogue = suspendMembership({ store: w.store, actorSubjectId: 'sub_carol',
        subjectId: 'sub_bob', bookId: 'book_b', clock: w.clock });
      const rogueRows = w.store.get('SELECT COUNT(*) AS n FROM membership_suspension WHERE subject_id = ?', 'sub_bob').n;
      const dOk = rogue.ok === false && rogue.reason === 'authority_not_established'
        && Number(rogueRows) === 0 && ask('sub_bob', 'book_b').allowed === true;

      // (e) A MÁR MEGKEZDETT, MÉG NEM VÉGLEGESÍTETT MŰVELET ÚJRAELLENŐRZÉSE. A parancs a feloldás
      //     KÖZBEN kap felfüggesztést: a véglegesítés ugyanazt a tényt olvassa, tehát NEM lesz kész,
      //     és NEM ír sort. Ez az a pont, ahol a válasz-mezőt néző próba végképp nem elég.
      const out = CMD(w2, { resolve: () => {
        suspendMembership({ store: w2.store, actorSubjectId: 'sub_adjudicator',
          subjectId: 'sub_alice', bookId: 'book_a', clock: w2.clock });
        return { price: 100 };
      } });
      const cmdRows = w2.store.all("SELECT * FROM command WHERE idem_key = 'k1'");
      const eOk = out.ok === false && out.error === 'not_available' && cmdRows.length === 0;

      // (f) FELOLDÁS UTÁN a TOVÁBBRA IS FENNÁLLÓ eredeti jog éled fel — és a sor MEGMARAD (történet).
      const lift = liftSuspension({ store: w.store, actorSubjectId: 'sub_adjudicator',
        subjectId: 'sub_alice', bookId: 'book_a', clock: w.clock });
      const histo = w.store.get('SELECT * FROM membership_suspension WHERE id = ?', susp.suspension_id);
      const fOk = lift.ok === true && ask('sub_alice').allowed === true
        && !!histo && histo.lifted_at !== null && histo.lifted_by === 'sub_adjudicator';

      // (g) A FELOLDÁS NEM AD JOGOT: ha közben MEGVONTÁK a tagságot, a feloldás nem hozza vissza.
      //     (A visszaállítás KÜLÖN hatáskör — `alter_right` —, ez a `suspend` határa.)
      suspendMembership({ store: w.store, actorSubjectId: 'sub_adjudicator',
        subjectId: 'sub_carol', bookId: 'book_a', clock: w.clock });
      revoke(w, 'sub_carol', 'book_a');
      const liftedAfterRevoke = liftSuspension({ store: w.store, actorSubjectId: 'sub_adjudicator',
        subjectId: 'sub_carol', bookId: 'book_a', clock: w.clock });
      const gOk = liftedAfterRevoke.ok === true && ask('sub_carol').allowed === false
        && ask('sub_carol').reason === 'membership_revoked';

      const pass = aOk && bOk && b2Ok && cOk && dOk && eOk && fOk && gOk;
      return {
        expected: 'előtte engedélyezett · utána tiltott (membership_suspended) · a tagsághoz nem nyúlt · '
          + 'más alany/könyv változatlan · jogosulatlan kérés nem ír · a MEGKEZDETT művelet nem véglegesül · '
          + 'feloldás után csak a fennálló jog éled',
        actual: `(a) ${aOk} · (b) ${susp.ok}/${after.reason} · (b2) tagság érintetlen=${b2Ok} · (c) ${cOk} · `
          + `(d) ${rogue.reason}/sorok=${rogueRows} · (e) ${out.error}/sorok=${cmdRows.length} · `
          + `(f) feloldás=${lift.ok} történet=${!!histo && histo.lifted_at !== null} · (g) ${ask('sub_carol').reason}`,
        pass,
        asserts: { 'A-REV-N3a-suspension-has-effect': pass },
      };
    } finally { w.store.close(); w2.store.close(); }
  });

probe('P-REV-claim-read', 'R32/K05 · K15 · REV-N3b · KUKA-084 · KUKA-085',
  'A BEJELENTÉS NEM AD OLVASÁST: a jelzés előtti és utáni olvasási kör AZONOS, a nemleges válasz pedig a nem létező ügyével',
  () => {
    const w = buildWorld({ inviteeHasAccount: true });
    try {
      w.store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_expartner', 'person');
      // MÁSIK KÖNYV, MÁSIK ELBÍRÁLÓ — a (c3) ellenpárjához: van hatásköre, csak NEM ITT. A „más
      // könyvre szól a felhatalmazásom" a legkönnyebben elfelejtett nemleges ág (KUKA-039).
      w.store.run('INSERT INTO book (id, name) VALUES (?,?)', 'book_masik', 'Egy másik cég könyve');
      w.store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_adjudicator_b', 'person');
      grantAdjudicationAuthority({ store: w.store, subjectId: 'sub_adjudicator_b',
        bookId: 'book_masik', operation: 'adjudicate', clock: w.clock });

      // A BEFOGADÁSI KONTEXTUS RÉSZENKÉNT KÜLÖN (R67 §7/3). A korábbi alak MINDEN beadást a
      // `chan:unattributed` közös vödörbe tett, ezért a (d) korlát-próba a KORÁBBI részek
      // beadásaitól lett piros — vagyis a saját mérésem előfeltevését igazolta vissza, nem a
      // szabályt (KUKA-054). Innentől minden résznek SAJÁT csatornája van, és a korlát KÉT
      // irányát külön mérjük: (d) a beadó hivatkozása · (d2) a SZERVER képezte csatorna-kulcs.
      const ctx = (k) => ({ channel_key: k });

      // (a) A JELZÉS ELŐTT és UTÁN ugyanaz a nemleges válasz — a bejelentő nem lesz olvasó.
      const beforeRead = readClaim({ store: w.store, viewerSubjectId: 'sub_expartner',
        claimId: 'clm_barmi', clock: w.clock });
      submitClaim({ store: w.store, clock: w.clock, claimantRef: 'volt@beszallito.hu',
        bookId: 'book_a', statement: 'A márciusi árlista hibás.', intakeContext: ctx('ch_a') });
      const row = w.store.get('SELECT * FROM claim WHERE claimant_ref = ?', 'volt@beszallito.hu');
      const afterRead = readClaim({ store: w.store, viewerSubjectId: 'sub_expartner',
        claimId: row.id, clock: w.clock });
      const aOk = JSON.stringify(beforeRead) === JSON.stringify(afterRead)
        && afterRead.ok === false && afterRead.error === 'not_available';

      // (b) A LÉTEZŐ és a NEM LÉTEZŐ ügy válasza BÁJTRA azonos — a csatorna nem hordozza a bitet
      //     (KUKA-084: nem hely-lista, hanem CSATORNA-lista; a hibakód sem különböztet).
      const missing = readClaim({ store: w.store, viewerSubjectId: 'sub_expartner',
        claimId: 'clm_nemletezik', clock: w.clock });
      const bOk = JSON.stringify(missing) === JSON.stringify(afterRead)
        && JSON.stringify(missing) === JSON.stringify(CLAIM_NOT_AVAILABLE);

      // (b2) A SEMLEGES NYUGTA sem árulja el, létezik-e a könyv: a nem létező könyvre adott
      //      válasz BÁJTRA azonos a létezőére adottal.
      const ackReal = submitClaim({ store: w.store, clock: w.clock, claimantRef: 'masik@pelda.hu',
        bookId: 'book_a', statement: 'x', intakeContext: ctx('ch_b2a') });
      const ackGhost = submitClaim({ store: w.store, clock: w.clock, claimantRef: 'harmadik@pelda.hu',
        bookId: 'book_NEM_LETEZIK', statement: 'x', intakeContext: ctx('ch_b2b') });
      const b2Ok = JSON.stringify(ackReal) === JSON.stringify(ackGhost);

      // (c) ELLENPÁR: a HATÁSKÖRÖS elbíráló LÁTJA — a szabály nem „mindenkit kizár".
      //     R67/F03: és VAN MIT OLVASNIA. Korábban csak a lenyomat ment vissza; sha256-ból a
      //     panasz szövege nem áll vissza, tehát az „elbírálás" formaság maradt.
      const seen = readClaim({ store: w.store, viewerSubjectId: 'sub_adjudicator',
        claimId: row.id, clock: w.clock });
      const cOk = seen.ok === true && seen.claim.id === row.id
        && seen.claim.statement === 'A márciusi árlista hibás.';

      // (c2) …de az ELBÍRÁLÁS önmagában NEM változtat jogot (a REV-N3a másik fele, itt ellenpárként).
      const decided = adjudicateClaim({ store: w.store, actorSubjectId: 'sub_adjudicator',
        claimId: row.id, decision: 'review', clock: w.clock });
      const c2Ok = decided.ok === true && decided.changed_rights === false;

      // (c3) R67/F02 — A DÖNTÉSI ÚT NEMLEGES VÁLASZA IS SEMLEGES. A `readClaim`-en ez már helyesen
      //      állt, az `adjudicateClaim`-en nem: a hiányzó ügy `not_available`-t kapott, a hatáskör
      //      nélküli hívó viszont a hatáskör-hiba NEVÉT — a különbség maga mondta meg, létezik-e az
      //      ügy (KUKA-084: a kijárat nem HELY, hanem CSATORNA; KUKA-039: fél őr volt).
      //      MIND A HÁROM nemleges ág BÁJTRA azonos, és azonos a `CLAIM_NOT_AVAILABLE`-lel.
      const decNoClaim = adjudicateClaim({ store: w.store, actorSubjectId: 'sub_adjudicator',
        claimId: 'clm_nemletezik', decision: 'review', clock: w.clock });
      const decNoRight = adjudicateClaim({ store: w.store, actorSubjectId: 'sub_expartner',
        claimId: row.id, decision: 'review', clock: w.clock });
      const decOtherBook = adjudicateClaim({ store: w.store, actorSubjectId: 'sub_adjudicator_b',
        claimId: row.id, decision: 'review', clock: w.clock });
      const c3Ok = JSON.stringify(decNoClaim) === JSON.stringify(CLAIM_NOT_AVAILABLE)
        && JSON.stringify(decNoRight) === JSON.stringify(CLAIM_NOT_AVAILABLE)
        && JSON.stringify(decOtherBook) === JSON.stringify(CLAIM_NOT_AVAILABLE);

      // (c4) R67/F03 MÁSIK FELE — A TARTALOM INTEGRITÁSA. Ha a tárolt szöveg megváltozott, NEM
      //      adjuk vissza (a néma, csendben átírt beadvány rosszabb a nemleges válasznál); ha a
      //      tartalom-sor egyáltalán nincs meg, azt is KIMONDJUK, nem üres kézzel döntetünk.
      submitClaim({ store: w.store, clock: w.clock, claimantRef: 'atirt@pelda.hu',
        bookId: 'book_a', statement: 'eredeti szöveg', intakeContext: ctx('ch_c4a') });
      const tampered = w.store.get('SELECT * FROM claim WHERE claimant_ref = ?', 'atirt@pelda.hu');
      w.store.run('UPDATE claim_content SET content = ? WHERE claim_id = ?', 'MÁS szöveg', tampered.id);
      const tamperRead = readClaim({ store: w.store, viewerSubjectId: 'sub_adjudicator',
        claimId: tampered.id, clock: w.clock });
      submitClaim({ store: w.store, clock: w.clock, claimantRef: 'torolt@pelda.hu',
        bookId: 'book_a', statement: 'lesz-e tartalma?', intakeContext: ctx('ch_c4b') });
      const gone = w.store.get('SELECT * FROM claim WHERE claimant_ref = ?', 'torolt@pelda.hu');
      w.store.run('DELETE FROM claim_content WHERE claim_id = ?', gone.id);
      const goneRead = readClaim({ store: w.store, viewerSubjectId: 'sub_adjudicator',
        claimId: gone.id, clock: w.clock });
      const c4Ok = tamperRead.ok === false && tamperRead.error === 'claim_content_integrity_failed'
        && tamperRead.claim === undefined
        && goneRead.ok === false && goneRead.error === 'claim_content_missing';

      // (d) A BEADÓ HIVATKOZÁSÁRA álló, SZŰKEBB korlát — a SAJÁT csatornán belül.
      //
      //     EZ A RÉSZ AZ R69-BEN ÁTÍRÓDOTT, ÉS A RÉGI ALAKJA MAGA VOLT A HIBA PINJE. Korábban azt
      //     mérte, hogy ugyanaz a hivatkozás NÉGY KÜLÖNBÖZŐ csatornán is elfogy — vagyis pontosan
      //     azt a csatornákon átnyúló hatást igazolta vissza zölden, amit a külső fél C-F03-ban
      //     fegyverként mutatott meg: a beadó által SZABADON MEGADHATÓ szöveg globális kulcsként
      //     elveheti más keretét. Aki a hibát javította volna, PIROSRA vitte volna a battériát
      //     (KUKA-068: a pin ne a saját nyelvjárását mérje · KUKA-092 fordítottja: a rossz
      //     viselkedés befagyasztása adósság). A helyes szabály: a másodlagos korlát a szerver
      //     képezte kulcson BELÜL szűkít — a csatorna a saját keretét oszthatja fel, MÁSÉT nem.
      let limited = null;
      for (let i = 0; i < CLAIM_RATE.max + 1; i += 1) {
        limited = submitClaim({ store: w.store, clock: w.clock, claimantRef: 'sokat@pelda.hu',
          bookId: 'book_a', statement: `x${i}`, intakeContext: ctx('ch_d_kozos') });
      }
      const dOk = limited && limited.accepted === false && limited.reason === 'rate_limited';

      // (d2) R67/F05 — AZ ELSŐDLEGES KORLÁT A SZERVER KÉPEZTE KULCSON ÁLL. A beadó a saját
      //      hivatkozását szabadon átírja (négy szöveg = négy „másik ember"); ha a korlát CSAK
      //      azon állna, egyetlen elárasztó tetszőlegesen megkerülné. Itt MINDEN beadás ÚJ
      //      hivatkozással megy, UGYANAZON a csatornán — és a kvóta így is elfogy.
      let limitedByChannel = null;
      for (let i = 0; i < CLAIM_RATE.max + 1; i += 1) {
        limitedByChannel = submitClaim({ store: w.store, clock: w.clock,
          claimantRef: `alnev_${i}@pelda.hu`, bookId: 'book_a', statement: `y${i}`,
          intakeContext: ctx('ch_kozos') });
      }
      const d2Ok = limitedByChannel && limitedByChannel.accepted === false
        && limitedByChannel.reason === 'rate_limited';

      // (e) R67/F04 — A BEFOGADÁS EGY TÉNY, TEHÁT EGY TRANZAKCIÓ. Korábban két külön autocommit-írás
      //     ment: ha a második elhasalt, ügy nem jött létre, a KVÓTA-SOR viszont bent maradt — a
      //     sikertelen beadás részlegesen megmaradt, és a beadó keretét elhasználta. Itt a MÁSODIK
      //     írást buktatjuk el (a tároló elé tett burkolóval, a forrás érintése NÉLKÜL), és azt
      //     mérjük, marad-e bármi utána (KUKA-026 a tranzakció-határon).
      //
      //     A BUKTATÁS A HÁNYADIK ÍRÁSHOZ KÖTŐDIK, NEM EGY SQL-SZÖVEGHEZ. Az első alakom a
      //     `claim_content` beszúrásának SZÖVEGÉRE illesztett — csakhogy a battéria M59 mutációja
      //     épp azt a beszúrást veszi ki, tehát ott nem lett volna mit elbuktatni, a próba pedig
      //     EGY MÁSIK OK miatt bukott volna, és a kapu M59-et írta volna be az atomicitás
      //     falszifikálójaként. Ez a KUKA-049 alakja a saját mérőmön (a jel a MECHANIZMUST mérje,
      //     ne egy egybeesést) — a sorszám a tranzakció-határ mérésének helyes kulcsa.
      let writes = 0;
      const failing = Object.assign(Object.create(null), w.store, {
        run(sql, ...params) {
          writes += 1;
          if (writes >= 2) throw new Error('SZÁNDÉKOS PRÓBA-HIBA a MÁSODIK íráson');
          return w.store.run(sql, ...params);
        },
      });
      let threw = false;
      try {
        submitClaim({ store: failing, clock: w.clock, claimantRef: 'atomi@pelda.hu',
          bookId: 'book_a', statement: 'félbemaradt', intakeContext: ctx('ch_atom') });
      } catch { threw = true; }
      const leftIntake = Number(w.store.get(
        'SELECT COUNT(*) AS n FROM claim_intake WHERE intake_key = ?', 'chan:ch_atom').n);
      const leftClaim = Number(w.store.get(
        'SELECT COUNT(*) AS n FROM claim WHERE claimant_ref = ?', 'atomi@pelda.hu').n);
      const eOk = threw === true && leftIntake === 0 && leftClaim === 0;

      const pass = aOk && bOk && b2Ok && cOk && c2Ok && c3Ok && c4Ok && dOk && d2Ok && eOk;
      return {
        expected: 'a jelzés előtti és utáni olvasás AZONOS · a nemleges válasz azonos a nem létező '
          + 'ügyével, a nem létező könyvével ÉS a döntési út mindhárom nemleges ágával · a hatáskörös '
          + 'elbíráló a SZÖVEGET is látja, sérült tartalomra viszont nevezett hibát · a korlát MINDKÉT '
          + 'irányban él (hivatkozás ÉS szerver-kulcs) · a félbemaradt beadás nem hagy nyomot',
        actual: `(a) előtte=${JSON.stringify(beforeRead)} utána=${JSON.stringify(afterRead)} · `
          + `(b) nem létező=${JSON.stringify(missing)} · (b2) nyugta azonos=${b2Ok} · `
          + `(c) elbíráló látja a szöveget=${cOk} · (c2) jogot nem mozdít=${!decided.changed_rights} · `
          + `(c3) döntési út: nincs ügy=${JSON.stringify(decNoClaim)} nincs jog=${JSON.stringify(decNoRight)} `
          + `más könyv=${JSON.stringify(decOtherBook)} · (c4) átírt=${tamperRead.error} hiányzó=${goneRead.error} · `
          + `(d) ref-korlát=${limited && limited.reason} · (d2) csatorna-korlát=${limitedByChannel && limitedByChannel.reason} · `
          + `(e) dobott=${threw} maradt: kvóta=${leftIntake} ügy=${leftClaim}`,
        pass,
        asserts: {
          'A-REV-N3b-claim-grants-no-read': aOk && bOk && b2Ok && cOk && c3Ok,
          'A-REV-N3b-claim-content-readable': cOk && c4Ok,
          'A-REV-N3c-intake-limit-server-keyed': dOk && d2Ok && eOk,
        },
      };
    } finally { w.store.close(); }
  });

probe('P-REV-claim-decide', 'R69/C-F01 · C-F02 · C-F03 · K05 · K15 · KUKA-039 · KUKA-084',
  'AMIRŐL DÖNTÜNK, AZT LÁTNI KELL — és egy csatorna nem veheti el a másik keretét',
  () => {
    const w = buildWorld({ inviteeHasAccount: true });
    try {
      w.store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_kivulallo', 'person');
      const ctx = (k) => ({ channel_key: k });
      const submit = (ref, ch, text) => {
        submitClaim({ store: w.store, clock: w.clock, claimantRef: ref, bookId: 'book_a',
          statement: text, intakeContext: ctx(ch) });
        return w.store.get('SELECT * FROM claim WHERE claimant_ref = ?', ref);
      };
      const stateOf = (id) => w.store.get('SELECT state FROM claim WHERE id = ?', id).state;

      // (a) POZITÍV ELLENPÁR — ÉP tartalom + jogosult elbíráló: a döntés MEGY. A tiltás nem lehet
      //     általános zár (KUKA-092: mérni kell, mi teljesíthetetlen és mi csak nincs megépítve).
      const okClaim = submit('rendes@pelda.hu', 'ch_a', 'A márciusi árlista hibás.');
      const okDecision = adjudicateClaim({ store: w.store, actorSubjectId: 'sub_adjudicator',
        claimId: okClaim.id, decision: 'resolve', clock: w.clock });
      const aOk = okDecision.ok === true && okDecision.state === 'resolved'
        && stateOf(okClaim.id) === 'resolved';

      // (b) C-F01 — SÉRÜLT tartalom: az érdemi döntés ELUTASÍT, és az ügy állapota VÁLTOZATLAN.
      //     A régi alakban a `readClaim` nemet mondott, az `adjudicateClaim` viszont lezárta —
      //     fél őr volt, MÁSODSZOR ugyanezen a fájlon (KUKA-039).
      const bad = submit('atirt@pelda.hu', 'ch_b', 'eredeti szöveg');
      w.store.run('UPDATE claim_content SET content = ? WHERE claim_id = ?', 'MÁS szöveg', bad.id);
      const badRead = readClaim({ store: w.store, viewerSubjectId: 'sub_adjudicator',
        claimId: bad.id, clock: w.clock });
      const badDecision = adjudicateClaim({ store: w.store, actorSubjectId: 'sub_adjudicator',
        claimId: bad.id, decision: 'resolve', clock: w.clock });
      const bOk = badRead.ok === false && badDecision.ok === false
        && badDecision.error === 'claim_content_integrity_failed'
        && stateOf(bad.id) === 'received';

      // (c) C-F02 — HIÁNYZÓ tartalom: ugyanaz, saját nevezett hibával.
      const gone = submit('torolt@pelda.hu', 'ch_c', 'lesz-e tartalma?');
      w.store.run('DELETE FROM claim_content WHERE claim_id = ?', gone.id);
      const goneDecision = adjudicateClaim({ store: w.store, actorSubjectId: 'sub_adjudicator',
        claimId: gone.id, decision: 'resolve', clock: w.clock });
      const cOk = goneDecision.ok === false && goneDecision.error === 'claim_content_missing'
        && stateOf(gone.id) === 'received';

      // (d) A SORREND — a JOGOSULATLAN hívó válasza az ADATÁLLAPOTTÓL FÜGGETLENÜL semleges. Ha az
      //     integritás-vizsgálat a hatáskör ELÉ kerülne, a „sérült" és a „nincs ilyen ügy"
      //     különbsége maga mondaná meg, hogy az ügy létezik (KUKA-084). BÁJTRA hasonlítunk.
      const outsiderBad = adjudicateClaim({ store: w.store, actorSubjectId: 'sub_kivulallo',
        claimId: bad.id, decision: 'resolve', clock: w.clock });
      const outsiderGone = adjudicateClaim({ store: w.store, actorSubjectId: 'sub_kivulallo',
        claimId: gone.id, decision: 'resolve', clock: w.clock });
      const outsiderMissing = adjudicateClaim({ store: w.store, actorSubjectId: 'sub_kivulallo',
        claimId: 'clm_nemletezik', decision: 'resolve', clock: w.clock });
      const dOk = JSON.stringify(outsiderBad) === JSON.stringify(CLAIM_NOT_AVAILABLE)
        && JSON.stringify(outsiderGone) === JSON.stringify(CLAIM_NOT_AVAILABLE)
        && JSON.stringify(outsiderMissing) === JSON.stringify(CLAIM_NOT_AVAILABLE);

      // (e) C-F03 — A MÁSODLAGOS HIVATKOZÁS NEM VEHETI EL MÁS KERETÉT. A támadó a SAJÁT
      //     csatornájáról a SÉRTETT szabadon megadható hivatkozásával teleírja a kvótát; a sértett
      //     ezután a SAJÁT, független csatornájáról beadhat. A hivatkozás nem igazolt azonosság,
      //     tehát fegyverré sem válhat.
      for (let i = 0; i < CLAIM_RATE.max; i += 1) {
        submitClaim({ store: w.store, clock: w.clock, claimantRef: 'sertett@pelda.hu',
          bookId: 'book_a', statement: `tamado-${i}`, intakeContext: ctx('ch_tamado') });
      }
      const victim = submitClaim({ store: w.store, clock: w.clock, claimantRef: 'sertett@pelda.hu',
        bookId: 'book_a', statement: 'jóhiszemű', intakeContext: ctx('ch_sertett') });
      // ELLENPÁR: a korlát a SAJÁT csatornán belül TOVÁBBRA IS él — nem lazítottunk, csak szűkítettük.
      let sameChannel = null;
      for (let i = 0; i < CLAIM_RATE.max + 1; i += 1) {
        sameChannel = submitClaim({ store: w.store, clock: w.clock, claimantRef: 'sokat@pelda.hu',
          bookId: 'book_a', statement: `z${i}`, intakeContext: ctx('ch_sajat') });
      }
      const eOk = victim.accepted === true
        && sameChannel && sameChannel.accepted === false && sameChannel.reason === 'rate_limited';

      const pass = aOk && bOk && cOk && dOk && eOk;
      return {
        expected: 'ép tartalom + jogosult elbíráló ⇒ siker · sérült és hiányzó tartalom ⇒ elutasítás '
          + 'VÁLTOZATLAN ügyállapottal · a jogosulatlan hívó válasza az adatállapottól függetlenül '
          + 'semleges · a másik fél hivatkozásával nem lehet elvenni annak keretét, a SAJÁT csatornán '
          + 'viszont a korlát megmarad',
        actual: `(a) ép döntés=${okDecision.ok}/${stateOf(okClaim.id)} · `
          + `(b) sérült=${badDecision.error} állapot=${stateOf(bad.id)} · `
          + `(c) hiányzó=${goneDecision.error} állapot=${stateOf(gone.id)} · `
          + `(d) kívülálló sérültre=${JSON.stringify(outsiderBad)} nem létezőre=${JSON.stringify(outsiderMissing)} · `
          + `(e) sértett saját csatornán=${victim.accepted} saját csatorna korlátja=${sameChannel && sameChannel.reason}`,
        pass,
        asserts: {
          'A-REV-N3a-decision-needs-intact-evidence': aOk && bOk && cOk && dOk,
          'A-REV-N3c-secondary-ref-cannot-take-others-quota': eOk,
        },
      };
    } finally { w.store.close(); }
  });

// ═══ REV-N5 — A CÉLZOTT TILTÁS (R71 §8/1 · req-3) ══════════════════════════════════════════════
//
// A KÉT FÜGGETLEN KÖNYV a mérés előfeltétele: enélkül a „másik könyv érintetlen" fél nem mérhető,
// és a klauzula ZÖLDNEK LÁTSZANA (KUKA-051). A `buildWorld` egy könyvet ad, ezért a második könyvet
// és a hozzá tartozó tagságot itt építjük — kimondottan FÜGGETLENNEK: más könyv, más admin.
/**
 * FIXTÚRA — TESZTADAT-ÍRÓ, NEM TERMÉK-ÚT (R75/F03).
 *
 * A külső fél kimondta: *„A tesztadat-építést jelöljük fixtúrának, és különítsük el a termék
 * viselkedésének tesztelésétől."* Ez a függvény KÖZVETLENÜL a tárolóba ír, tehát olyan rekordot is
 * elő tud állítani, amit a kiadási út JOGGAL elutasít (személy-szintű tiltás könyv-hatáskörrel,
 * sérült sor, importált állapot). Épp ezért NEM bizonyít semmit a kiadási útról — azt kizárólag az
 * `issueBan` hívása méri.
 */
function plantBanFixture(w, { subjectId, cause, kind, targetRef, actor = 'sub_adjudicator' }) {
  w.store.run(
    `INSERT INTO subject_ban (subject_id, kind, cause, target_ref, actor_subject_id, banned_at)
     VALUES (?,?,?,?,?,?)`,
    subjectId, kind, cause, targetRef === undefined ? null : targetRef, actor, w.clock.now());
}

function buildTwoBookWorld() {
  const w = buildWorld({ inviteeHasAccount: true });
  w.store.run('INSERT INTO book (id, name) VALUES (?,?)', 'book_b', 'B cég könyve — FÜGGETLEN');
  w.store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_dolgozo', 'person');
  w.store.run('INSERT INTO account (subject_id, credential) VALUES (?,?)', 'sub_dolgozo', 'cred_dolgozo');
  // UGYANAZ a munkatárs MINDKÉT könyvben tag — ez a norma szituációja (a) és (b) esetéhez.
  for (const b of ['book_a', 'book_b']) {
    w.store.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
      'sub_dolgozo', b, 'user', w.clock.now());
  }
  // A MÁSIK JOGOSULT (REV-N5c ellenpárja): rajta mérjük, hogy a tiltás nem törli mások jogát.
  w.store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_kollega', 'person');
  w.store.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
    'sub_kollega', 'book_a', 'user', w.clock.now());
  // A KIADÓ (R75/F01): külön alany, mert a kiadási utat ŐRAJTA mérjük — a tiltott ELJÁRÓ nem
  // tilthat. Hatáskört nem kap itt: azt a próba adja meg, könyvenként, kimondottan.
  w.store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_biro', 'person');
  // R49/SGR-01 — a két könyv olvasói is VALÓDI jogot kapnak, adatkörönként.
  for (const b of ['book_a', 'book_b']) {
    giveReadScopes(w.store, { subjectId: 'sub_dolgozo', bookId: b, at: w.clock.now() });
  }
  giveReadScopes(w.store, { subjectId: 'sub_kollega', bookId: 'book_a', at: w.clock.now() });
  return w;
}

probe('P-REV-ban-scope', 'R71 §8/1 · REV-N5b · K09 · K15 · KUKA-048 · KUKA-020',
  'A TILTÁS HATÓKÖRE AZ OKÁBÓL SZÁRMAZIK — ugyanaz a szó két különböző hatókört kap',
  () => {
    const w = buildTwoBookWorld();
    try {
      const may = (book, extra) => rightAt({ store: w.store, subjectId: 'sub_dolgozo', bookId: book,
        opClass: 'own_book', clock: w.clock, ...(extra || {}) });
      const impose = (cause, targetRef) => imposeBan({ store: w.store, subjectId: 'sub_dolgozo',
        cause, targetRef, actorSubjectId: 'sub_adjudicator', clock: w.clock, bookId: 'book_a' });

      // KONTROLL: tiltás előtt MINDKÉT könyv nyitva — különben a későbbi „zárva" semmit nem mondana.
      const before = may('book_a').allowed && may('book_b').allowed;

      // (a) KILÉPÉS EGY CÉGBŐL ⇒ `book` fajta ⇒ a MÁSIK, független könyv joga ÉRINTETLEN.
      //     Ez a fél buktatja meg azt a mutációt, ami minden tiltást mindenhol hatályosnak vesz.
      const outA = impose('left_company', 'book_a');
      const aOk = outA.ok === true && outA.kind === 'book'
        && may('book_a').allowed === false && may('book_b').allowed === true;

      // (b) KOMPROMITTÁLT HITELESÍTŐ ⇒ `credential` fajta ⇒ MINDENHOL tilos, ahol azzal lépnének be.
      //     Ez a fél buktatja meg azt a mutációt, ami a hitelesítő-ágat egy könyvre szűkíti.
      //     R75/F03 — A KIADÁSI ÚT EZT JOGGAL ELUTASÍTJA: a hitelesítő-tiltás SZÉLESEBB, mint egy
      //     könyvre szóló hatáskör. A hatókör-SZEMANTIKÁT viszont mérni kell, ezért a rekord
      //     FIXTÚRAKÉNT kerül be — és a kiadás elutasítása külön, nevezett ág (b3).
      const refusedWide = impose('credential_compromised', 'cred_dolgozo');
      plantBanFixture(w, { subjectId: 'sub_dolgozo', cause: 'credential_compromised',
        kind: 'credential', targetRef: 'cred_dolgozo' });
      const withCred = (book) => may(book, { credentials: { credentialId: 'cred_dolgozo' } });
      const bOk = withCred('book_a').allowed === false && withCred('book_b').allowed === false;
      const b3Ok = refusedWide.ok === false && refusedWide.reason === 'ban_wider_than_authority';

      // (b2) ELLENPÁR A HITELESÍTŐRE: EGY MÁSIK hitelesítővel érkező kérés NEM ütközik ebbe a
      //      tiltásba — a célzott tiltás célzott marad, nem válik alany-szintűvé.
      const otherCred = may('book_b', { credentials: { credentialId: 'cred_masik' } });
      const b2Ok = otherCred.allowed === true;

      // (c) A FAJTA NEVEZETT, ZÁRT HALMAZBÓL. Ismeretlen OK ⇒ a tiltás LÉTRE SEM JÖN (nem
      //     „általánosat" tételezünk fel); ismeretlen FAJTA a tárolóban ⇒ NEM DÖNTHETŐ, nevezett
      //     okkal, és zár — de a neve nem „általános tiltás" (KUKA-020).
      const badCause = impose('valami_amit_kitalaltam', 'book_b');
      w.store.run(
        `INSERT INTO subject_ban (subject_id, kind, cause, target_ref, actor_subject_id, banned_at)
         VALUES (?,?,?,?,?,?)`,
        'sub_kollega', 'ismeretlen_fajta', 'left_company', 'book_a', 'sub_adjudicator', w.clock.now());
      const unknownKind = rightAt({ store: w.store, subjectId: 'sub_kollega', bookId: 'book_a',
        opClass: 'own_book', clock: w.clock });
      const cOk = badCause.ok === false && badCause.reason === 'ban_cause_unknown'
        && unknownKind.allowed === false && unknownKind.reason === 'ban_kind_unknown';

      // (d) A MEGKÜLÖNBÖZTETŐ NÉLKÜLI KÉRÉS: nem dönthető ⇒ ZÁR, de NEVEZETTEN (nem néma, és nem
      //     ugyanaz a szó, mint a valódi „nem" — a hívó megtudja, mit adjon meg).
      const noDiscriminator = may('book_b');
      const dOk = noDiscriminator.allowed === false
        && noDiscriminator.reason === 'ban_target_undecidable'
        && /credentialId/.test(noDiscriminator.message || '');

      // (e) A KÉRÉS TENGELYÉT A BELÉPÉSI KONTEXTUS NEM ÍRHATJA ÁT (R73/C-F01–C-F02).
      //     A tiltás a `book_a`-n áll (az (a) ágból). A támadás: a kérés TOVÁBBRA IS `book_a`-ra
      //     szól, de a hitelesített kontextus `bookId: 'book_b'`-t hoz. A régi alak a két objektumot
      //     egyszerűen összefésülte (`{...operation, ...credentials}`), tehát a kontextus NYERT, a
      //     tiltás tárgya elmozdult, és a kérés átment. Az azonosság hordozóját (a kérés tengelyét)
      //     semmilyen hívó-oldali adat nem mozdíthatja el (KUKA-047: a hatókör a kérés
      //     KÖRNYEZETÉBŐL jön, nem a TÖRZSÉBŐL).
      const spoofed = may('book_a', { credentials: { bookId: 'book_b', credentialId: 'cred_masik' } });
      const eOk = spoofed.allowed === false;

      // (f) AZ ÖNMAGÁNAK ELLENTMONDÓ REKORD NEM MÉRÉS (R73/C-F05). A sor oka `left_company`, amiből
      //     `book` fajta KÖVETKEZIK — a `kind` viszont `credential`. Ilyenkor nem választunk a kettő
      //     közül: NEVEZETT okkal zárunk, mert az ellentmondás nem a tiltás megszűnése (KUKA-020).
      //     A (c) ágtól ez KÜLÖN válasz: ott a fajta ISMERETLEN, itt MINDKÉT oldal ismert, de ütközik.
      w.store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_ellentmondas', 'person');
      w.store.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
        'sub_ellentmondas', 'book_a', 'user', w.clock.now());
      w.store.run(
        `INSERT INTO subject_ban (subject_id, kind, cause, target_ref, actor_subject_id, banned_at)
         VALUES (?,?,?,?,?,?)`,
        'sub_ellentmondas', 'credential', 'left_company', 'book_a', 'sub_adjudicator', w.clock.now());
      const contradicting = rightAt({ store: w.store, subjectId: 'sub_ellentmondas', bookId: 'book_a',
        opClass: 'own_book', clock: w.clock });
      const fOk = contradicting.allowed === false
        && contradicting.reason === 'ban_cause_kind_contradiction';

      // (g) AZ ISMERETLEN TÁROLT OK KÜLÖN VÁLASZ — ÉS ZÁR (R75/F04).
      //     A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL): az (f) ág feltétele `expectedKind && …`
      //     volt, tehát ISMERETLEN OKNÁL az `expectedKind` null lett, és az EGÉSZ ellenőrzés
      //     kimaradt — egy importált vagy sérült sor mellett a kérés ENGEDÉLYT kapott. Ez a
      //     KUKA-124/2 fordítva: a hiány nem a szigorúbb, hanem a MEGENGEDŐBB oldalra esett.
      //     A rekord fajtája itt SZÁNDÉKOSAN ismert (`book`) és a célja a kért könyv: ha a hiányt
      //     némán átengednénk, a kérés átmenne — a mérés tehát pont a hiány kezelését fogja meg.
      w.store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_importalt', 'person');
      w.store.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
        'sub_importalt', 'book_a', 'user', w.clock.now());
      plantBanFixture(w, { subjectId: 'sub_importalt', kind: 'book',
        cause: 'valamilyen-regi-importalt-ok', targetRef: 'book_a' });
      const unknownStored = rightAt({ store: w.store, subjectId: 'sub_importalt', bookId: 'book_a',
        opClass: 'own_book', clock: w.clock });
      // ELLENPÁR: a FÜGGETLEN könyvön sem következtetünk „más könyvre szól"-ra — az eldönthetetlen
      //     rekord VALÓDI hatóköre épp az, amit nem tudunk, ezért ott is zár, UGYANAZZAL a névvel.
      w.store.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
        'sub_importalt', 'book_b', 'user', w.clock.now());
      const unknownStoredOther = rightAt({ store: w.store, subjectId: 'sub_importalt', bookId: 'book_b',
        opClass: 'own_book', clock: w.clock });
      const gOk = unknownStored.allowed === false
        && unknownStored.reason === 'ban_cause_unknown_stored'
        && unknownStoredOther.allowed === false
        && unknownStoredOther.reason === 'ban_cause_unknown_stored';

      const pass = before && aOk && bOk && b2Ok && b3Ok && cOk && dOk && eOk && fOk && gOk;
      return {
        expected: 'a kilépés-ok KÖNYV-hatókörű tiltást szül (a másik könyv érintetlen) · a '
          + 'kompromittált hitelesítő MINDKÉT könyvön tilt · más hitelesítő nem ütközik bele · '
          + 'ismeretlen ok NEM hoz létre tiltást · ismeretlen fajta NEM DÖNTHETŐ (zár, nevezetten) · '
          + 'a belépési kontextus NEM írhatja át a kérés könyvét · az önmagának ellentmondó rekord ZÁR · '
          + 'az ISMERETLEN TÁROLT OK saját, nevezett válasszal ZÁR (nem a fajtára esik vissza)',
        actual: `kontroll (tiltás ELŐTT, mindkét könyv)=${before} · (a) kilépés: A=${aOk} · (b) hitelesítő MINDKÉT `
          + `könyvön=${bOk} · (b2) másik hitelesítő átmegy=${b2Ok} · (b3) a KIADÁS elutasítja=${refusedWide.reason} · (c) ismeretlen ok=${badCause.reason}, `
          + `ismeretlen fajta=${unknownKind.reason} · (d) megkülönböztető nélkül=${noDiscriminator.reason} · `
          + `(e) hamisított kontextus-könyv=${spoofed.allowed ? 'ÁTMENT' : spoofed.reason} · `
          + `(f) ellentmondó rekord=${contradicting.reason} · `
          + `(g) ismeretlen TÁROLT ok=${unknownStored.allowed ? 'ÁTMENT' : unknownStored.reason}`
          + `/${unknownStoredOther.allowed ? 'ÁTMENT' : unknownStoredOther.reason}`,
        pass,
        asserts: {
          'A-REV-N5b-ban-scope-comes-from-cause': aOk && bOk && b2Ok && b3Ok,
          'A-REV-N5b-ban-kind-is-named-and-closed': cOk && dOk,
          'A-REV-N5b-request-axis-not-overridable': eOk,
          'A-REV-N5b-contradicting-record-is-not-a-measurement': fOk,
          'A-REV-N5b-unknown-stored-cause-is-not-swallowed': gOk,
        },
      };
    } finally { w.store.close(); }
  });

probe('P-REV-ban-paths', 'R71 §8/1 · REV-N5a · K09 · K15 · KUKA-039',
  'A TILTÁS MINDEN ENGEDŐ ÚTON HAT — nem csak azon, amelyiken bevezették',
  () => {
    const w = buildTwoBookWorld();
    try {
      // A MÁSODIK ENGEDŐ ÚT: a hatásköri út (REV-N3). A munkatárs kap `suspend` hatáskört MINDKÉT
      // könyvön — így a tiltás hatását MINDKÉT úton, MINDKÉT könyvön mérni tudjuk.
      for (const b of ['book_a', 'book_b']) {
        grantAdjudicationAuthority({ store: w.store, subjectId: 'sub_dolgozo', bookId: b,
          operation: 'suspend', clock: w.clock });
      }
      const viaMembership = (book) => rightAt({ store: w.store, subjectId: 'sub_dolgozo',
        bookId: book, opClass: 'own_book', clock: w.clock });
      const viaAuthority = (book) => adjudicationRightAt({ store: w.store, subjectId: 'sub_dolgozo',
        bookId: book, operation: 'suspend', clock: w.clock });

      // KONTROLL: MINDKÉT út nyitva MINDKÉT könyvön.
      const before = viaMembership('book_a').allowed && viaAuthority('book_a').allowed
        && viaMembership('book_b').allowed && viaAuthority('book_b').allowed;

      let cOk = false; let cScopeStored = false;

      // (a) A TAGSÁGI ÚTON értelmezett tiltás a HATÁSKÖRI utat is zárja — ugyanazon a könyvön.
      //     A tiltás rekordjában NINCS olyan mező, ami azt mondaná, „melyik úton vezették be":
      //     épp ez a lényeg, és ezért nem tud féloldalas lenni.
      imposeBan({ store: w.store, subjectId: 'sub_dolgozo', cause: 'left_company',
        targetRef: 'book_a', actorSubjectId: 'sub_adjudicator', clock: w.clock, bookId: 'book_a' });
      const aOk = viaMembership('book_a').allowed === false && viaAuthority('book_a').allowed === false;

      // (b) ELLENPÁR — A KÖNYV-HATÓKÖRŰ TILTÁS A MÁSIK KÖNYV ÚTJAIT NEM ZÁRJA, egyiket sem.
      //     Enélkül az (a) fél „mindent zárok" alakkal is teljesülne (KUKA-092: a tiltás nem
      //     lehet általános zár).
      const bOk = viaMembership('book_b').allowed === true && viaAuthority('book_b').allowed === true;

      // (c) A MÁSIK IRÁNY: egy MŰVELET-hatókörű tiltás a HATÁSKÖRI úton dől el pontosan, a tagsági
      //     utat NEM zárja — ÉS a KIADÓ KÖNYVÉN TÚL SEM ÉR (R75/F02).
      //
      //     EZ AZ ÁG KORÁBBAN A HIBÁT VÁRTA EL. Az R71-es alakban itt
      //     `viaAuthority('book_b').allowed === false` állt: vagyis a saját pinem KÖVETELTE MEG,
      //     hogy egy A könyvre szóló hatáskörből kiadott művelet-tiltás a FÜGGETLEN B könyvben is
      //     zárjon. A külső fél mérte meg, hogy ez hibás (R75/F02) — a pin pedig nem elmulasztotta
      //     a hibát, hanem VÉDTE: aki javította volna, PIROSRA vitte volna a battériát (KUKA-068 ·
      //     KUKA-092). A mérés friss világon megy, hogy az (a) könyv-tiltása ne fedje el.
      const wc = buildTwoBookWorld();
      try {
        for (const b of ['book_a', 'book_b']) {
          grantAdjudicationAuthority({ store: wc.store, subjectId: 'sub_dolgozo', bookId: b,
            operation: 'suspend', clock: wc.clock });
        }
        const cAuth = (book) => adjudicationRightAt({ store: wc.store, subjectId: 'sub_dolgozo',
          bookId: book, operation: 'suspend', clock: wc.clock });
        const cMem = (book) => rightAt({ store: wc.store, subjectId: 'sub_dolgozo',
          bookId: book, opClass: 'own_book', clock: wc.clock });
        const opBan = issueBan({ store: wc.store, subjectId: 'sub_dolgozo', cause: 'operation_misuse',
          targetRef: 'suspend', actorSubjectId: 'sub_adjudicator', clock: wc.clock, bookId: 'book_a' });
        // A TÁROLT CÉL MAGA HORDOZZA A HATÓKÖRT — a könyv és a művelet EGYÜTT.
        cScopeStored = opBan.ok === true
          && opBan.target_ref === operationScopeRef('book_a', 'suspend');
        cOk = cScopeStored
          && cAuth('book_a').allowed === false      // a kiadó könyvén a művelet zárva
          && cAuth('book_b').allowed === true       // a FÜGGETLEN könyv ÉRINTETLEN (F02)
          && cMem('book_a').allowed === true        // más művelet ugyanazon a könyvön: nyitva
          && cMem('book_b').allowed === true;
      } finally { wc.store.close(); }

      // (d) A HATÁSKÖR NÉLKÜLI TILTÁS-KIMONDÁS ELUTASÍT — a célzott tiltás JOGVÁLTOZTATÁS (REV-N3a).
      const noAuth = imposeBan({ store: w.store, subjectId: 'sub_kollega', cause: 'left_company',
        targetRef: 'book_a', actorSubjectId: 'sub_kollega', clock: w.clock, bookId: 'book_a' });
      const dOk = noAuth.ok === false && noAuth.reason === 'authority_not_established';

      // (e) A KIADÁS IS ENGEDŐ ÚT — A TILTOTT ELJÁRÓ NEM TILTHAT (R75/F01).
      //     A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL): a bíró `alter_right` hatáskörrel ÉS egy
      //     ugyanarra a könyvre hatályos tiltással SIKERESEN letiltotta a dolgozót, mert a kiadási
      //     út csak a nyers hatásköri sort nézte. A kiadás így HARMADIK engedő úttá vált.
      //     A mérés friss világon megy, hogy az (a) ág tiltása ne fedje el, és MINDHÁROM utat
      //     megkérdezi UGYANARRA az alanyra: az elbírálási út zárva, a tagsági zárva — és a
      //     KIADÁS is. A kontroll (a tiltás ELŐTT tud tiltani) nélkül az „elutasít" semmit sem
      //     mondana (KUKA-092: mérni kell, tényleg akadály-e).
      let eOk = false; let eBefore = null; let eAfter = null;
      const we = buildTwoBookWorld();
      try {
        grantAdjudicationAuthority({ store: we.store, subjectId: 'sub_biro', bookId: 'book_a',
          operation: 'alter_right', clock: we.clock });
        // KONTROLL: a tiltatlan bíró TUD tiltani — enélkül a későbbi elutasítás nem bizonyít semmit.
        eBefore = issueBan({ store: we.store, subjectId: 'sub_kollega', cause: 'left_company',
          targetRef: 'book_a', actorSubjectId: 'sub_biro', clock: we.clock, bookId: 'book_a' });
        // …majd MAGÁT A BÍRÓT tiltjuk le ugyanazon a könyvön (fixtúra: a saját magát tiltó
        // kiadás nem üzleti út), és újra kiadatunk vele.
        plantBanFixture(we, { subjectId: 'sub_biro', cause: 'left_company', kind: 'book',
          targetRef: 'book_a' });
        eAfter = issueBan({ store: we.store, subjectId: 'sub_dolgozo', cause: 'left_company',
          targetRef: 'book_a', actorSubjectId: 'sub_biro', clock: we.clock, bookId: 'book_a' });
        const stillOpen = rightAt({ store: we.store, subjectId: 'sub_dolgozo', bookId: 'book_a',
          opClass: 'own_book', clock: we.clock });
        eOk = eBefore.ok === true
          && eAfter.ok === false && eAfter.reason === 'ban_scope_book'
          && stillOpen.allowed === true;   // a tiltás LÉTRE SEM JÖTT — nincs hatása
      } finally { we.store.close(); }

      // (f) NINCS GYENGÉBB SZERZŐDÉSŰ ÍRÓ (R75/F03). Az `imposeBan` a KORÁBBI név, ugyanazzal a
      //     szerződéssel — a hatókör-kapunak rajta is hatnia kell. A külső fél mérése: az A könyvre
      //     jogosult eljáró vele a B könyvre is kiadhatott tiltást. A „komment nem
      //     hozzáférésvédelem" (KUKA-015), ezért ezt VISELKEDÉSEN mérjük, nem a dokumentáción.
      let fOk = false; let fRaw = null; let fNamed = null;
      const wf = buildTwoBookWorld();
      try {
        grantAdjudicationAuthority({ store: wf.store, subjectId: 'sub_biro', bookId: 'book_a',
          operation: 'alter_right', clock: wf.clock });
        const args = { store: wf.store, subjectId: 'sub_dolgozo', cause: 'left_company',
          targetRef: 'book_b', actorSubjectId: 'sub_biro', clock: wf.clock, bookId: 'book_a' };
        fRaw = imposeBan(args);
        fNamed = issueBan(args);
        const bStillOpen = rightAt({ store: wf.store, subjectId: 'sub_dolgozo', bookId: 'book_b',
          opClass: 'own_book', clock: wf.clock });
        fOk = fRaw.ok === false && fRaw.reason === 'ban_target_outside_authority'
          && fNamed.reason === fRaw.reason           // UGYANAZ a szerződés, nem csak „szintén tilt"
          && bStillOpen.allowed === true;
      } finally { wf.store.close(); }

      // (g) A BELÉPÉSI KONTEXTUS VÉGIGMEGY AZ ELBÍRÁLÁSI ÚTON IS (R75/F05 + a C-F04 IRÁNYA).
      //     HELYESBÍTÉS a saját R74-es jelentésemhez: az R73 hibája NEM az volt, hogy a tiltott
      //     hitelesítővel átment a kérés, hanem hogy a kontextus elvesztésével a hitelesítő-tiltás
      //     NEM DÖNTHETŐVÉ vált, és a kapu ZÁRT — vagyis az ÉRVÉNYES MÁSIK hitelesítővel érkező
      //     JOGOS munka is elakadt. Ezért a mérésnek KÉT fele van, és a második a fontosabb:
      //       (g1) a TILTOTT hitelesítővel az ügy nem olvasható — a tiltás elér az elbírálási útig;
      //       (g2) az ÉRVÉNYES MÁSIK hitelesítővel UGYANAZ az elbíráló DOLGOZIK.
      let gOk = false; let gBanned = null; let gValid = null;
      const wg = buildTwoBookWorld();
      try {
        // `sub_adjudicator` az ALAPVILÁGBAN már `adjudicate` hatáskörű a `book_a`-n — itt csak a
        // HITELESÍTŐJÉT adjuk hozzá, mert a tiltás fajtája arra szól.
        wg.store.run('INSERT INTO account (subject_id, credential) VALUES (?,?)',
          'sub_adjudicator', 'cred_biro_regi');
        submitClaim({ store: wg.store, clock: wg.clock, claimantRef: 'panaszos@example.test',
          bookId: 'book_a', statement: 'a jog-megvonás indokát vitatom', intakeContext: { channel: 'web' } });
        // A NYUGTA SZÁNDÉKOSAN SEMLEGES (nem ad ügyszámot — REV-N3b), ezért az ügy azonosítóját
        // a tárolóból vesszük: ez FIXTÚRA-olvasás, nem terméki út.
        const claimRow = wg.store.get('SELECT * FROM claim ORDER BY id DESC');
        plantBanFixture(wg, { subjectId: 'sub_adjudicator', cause: 'credential_compromised',
          kind: 'credential', targetRef: 'cred_biro_regi', actor: 'sub_adjudicator' });
        gBanned = readClaim({ store: wg.store, viewerSubjectId: 'sub_adjudicator', claimId: claimRow.id,
          clock: wg.clock, credentials: { credentialId: 'cred_biro_regi' } });
        gValid = readClaim({ store: wg.store, viewerSubjectId: 'sub_adjudicator', claimId: claimRow.id,
          clock: wg.clock, credentials: { credentialId: 'cred_biro_uj' } });
        gOk = gBanned.ok !== true
          && gValid.ok === true
          && gValid.claim && gValid.claim.statement === 'a jog-megvonás indokát vitatom';
      } finally { wg.store.close(); }

      const pass = before && aOk && bOk && cOk && dOk && eOk && fOk && gOk;
      return {
        expected: 'egy könyv-hatókörű tiltás MINDKÉT engedő utat zárja azon a könyvön, a MÁSIK könyv '
          + 'mindkét útját viszont nyitva hagyja · egy művelet-hatókörű tiltás a hatásköri úton zár, '
          + 'a tagságin nem · hatáskör nélkül tiltás nem mondható ki · a TILTOTT eljáró NEM TILTHAT '
          + '(a kiadás is engedő út) · a korábbi íróneve UGYANAZT a szerződést teljesíti · a belépési '
          + 'kontextus végigmegy az elbírálási úton, és az ÉRVÉNYES MÁSIK hitelesítő nem akad el',
        actual: `kontroll=${before} · (a) A-könyv tagsági+hatásköri zárva=${aOk} · (b) B-könyv mindkét `
          + `út nyitva=${bOk} · (c) művelet-tiltás: hatásköri zárva, tagsági nyitva=${cOk} · `
          + `(d) hatáskör nélkül=${noAuth.reason} · (e) tiltott eljáró kiadása: kontroll=${eBefore && eBefore.ok}, `
          + `utána=${eAfter && eAfter.ok ? 'ÁTMENT' : eAfter && eAfter.reason} · `
          + `(f) imposeBan=${fRaw && (fRaw.ok ? 'ÁTMENT' : fRaw.reason)}, issueBan=${fNamed && (fNamed.ok ? 'ÁTMENT' : fNamed.reason)} · `
          + `(g) tiltott hitelesítő=${gBanned && (gBanned.ok ? 'OLVASHATÓ' : (gBanned.error || 'zárva'))}, `
          + `érvényes másik=${gValid && (gValid.ok ? 'DOLGOZIK' : (gValid.error || 'ELAKADT'))}`
          + ` (a C-F04 iránya: a régi alakban EZ akadt el)`,
        pass,
        asserts: {
          'A-REV-N5a-ban-reaches-every-permitting-path': aOk && bOk && cOk,
          'A-REV-N5a-ban-needs-authority': dOk,
          'A-REV-N5a-issuing-path-is-a-permitting-path': eOk,
          'A-REV-N5a-no-weaker-writer': fOk,
          'A-REV-N5a-credentials-reach-adjudication': gOk,
        },
      };
    } finally { w.store.close(); }
  });

probe('P-REV-ban-past', 'R71 §8/1 · REV-N5c · K09 · KUKA-085',
  'A TILTÁS NEM TÖRLI A MÚLTAT ÉS NEM VESZI EL MÁSOK JOGÁT',
  () => {
    const w = buildTwoBookWorld();
    try {
      // A MÚLT: a tiltott alany egy SZABÁLYOS parancsa a tiltás ELŐTT. A pillanatképet TARTALMILAG
      // vesszük (a REV-N1b mércéje), nem darabszámmal — az R55-F02 tanulsága: a szám ép maradhat
      // úgy is, hogy a tartalom megváltozott.
      const cmd = submitCommand({
        store: w.store, idemKey: 'idem_ban_past', actor: 'sub_dolgozo', bookId: 'book_a',
        type: 'stock.receipt', typeVersion: '1', declared: { qty: 3, sku: 'MARCIUS' },
        resolve: () => ({ unit_price: 100, price_list: 'PL-2026-09' }), clock: w.clock,
      });
      const snapshot = () => JSON.stringify({
        command: w.store.all('SELECT * FROM command ORDER BY book_id, actor, idem_key'),
        events: w.store.all('SELECT * FROM command_event ORDER BY id'),
        disclosure: w.store.all('SELECT * FROM disclosure ORDER BY id'),
        membership: w.store.all('SELECT * FROM membership ORDER BY subject_id, book_id'),
      });
      // A TARTALMI PILLANATKÉPET EGY JOGOSULT OLVASÓ VESZI FEL, MÉG A TILTÁS ELŐTT. Azért ő és nem
      // a tiltott alany, mert az olvasás joga a MAI állapoton dől el: a tiltott alany a saját
      // korábbi eredményét már nem kapja meg, és akkor a mérés a JOG változását mérné, nem a HATÁS
      // változatlanságát. A kettő két külön tény (KUKA-088), és a REV-N5c a HATÁSRÓL szól.
      const peerRead = () => JSON.stringify(readCommandResult({ store: w.store, clock: w.clock,
        idemKey: 'idem_ban_past', requester: 'sub_kollega' }));
      const beforeRead = peerRead();
      // A PILLANATKÉP AZ OLVASÁS UTÁN KÉSZÜL — SZÁNDÉKOSAN. Az olvasás maga is ír: a K05 kiadás-
      // leltárba sort tesz. Ha a pillanatképet ELŐBB venném, a saját mérésem változtatná meg azt,
      // amit mérni akarok, és a különbséget a TILTÁSNAK tulajdonítanám (KUKA-054 a mérőn).
      const beforeSnap = snapshot();

      // R75/F03 — FIXTÚRA, NEM TERMÉK-ÚT. A bírósági végzésből eredő SZEMÉLY-szintű tiltás
      // szélesebb, mint egy könyvre szóló hatáskör, ezért a kiadási út joggal elutasítja (ehhez
      // külön, nevesített hatáskör kellene — ma NINCS ilyen, és ezt a REV-N5b nyitott tételként
      // mondja ki). A REV-N5c viszont a MÚLTRÓL szól: a tiltás HATÁSÁT kell mérni, nem a
      // kiadhatóságát — ezért a rekord fixtúraként kerül be, és ezt kimondjuk.
      plantBanFixture(w, { subjectId: 'sub_dolgozo', cause: 'court_order_subject',
        kind: 'subject', targetRef: null });

      // …ÉS A VALÓDI KIADÁSI ÚT IS LEFUT UGYANITT (R75). A fixtúra a HATÁST méri, de a REV-N5c
      // állítása („a tiltás nem törli a múltat") a TERMÉK-ÚTRA is szól: ha csak fixtúrával mérnénk,
      // az `issueBan` bármit tehetne a múlttal, és a mérés zöld maradna — pontosan ezt mutatta meg
      // az M68 (a kiadás mellé tett `DELETE FROM command_event`) TÚLÉLÉSE a saját mutációs
      // próbámon. A kiadható alak KÖNYV-hatókörű (ehhez van hatásköre a bírónak), és épp azon a
      // könyvön, ahol a korábbi parancs született — tehát a törlés, ha megtörténne, LÁTSZANA.
      grantAdjudicationAuthority({ store: w.store, subjectId: 'sub_biro', bookId: 'book_a',
        operation: 'alter_right', clock: w.clock });
      const issued = issueBan({ store: w.store, subjectId: 'sub_dolgozo', cause: 'left_company',
        targetRef: 'book_a', actorSubjectId: 'sub_biro', clock: w.clock, bookId: 'book_a' });

      // (a) A TILTÁS UTÁN a múlt MINDEN mezője változatlan — a tiltás csak a SAJÁT tábláját írja.
      //     A pillanatképet a MÁSODIK olvasás ELŐTT vesszük, ugyanazért, amiért az elsőt utána.
      const afterSnap = snapshot();
      const aOk = afterSnap === beforeSnap;

      // (b) …és a korábbi művelet EREDMÉNYE is ugyanaz marad tartalmilag (nem csak a sor létezik).
      // (b) …és a korábbi művelet EREDMÉNYE tartalmilag ugyanaz — ELŐTTE és UTÁNA, ugyanattól a
      //     jogosult olvasótól kérdezve. Enélkül a mérés önmagát igazolná vissza (KUKA-054).
      const afterRead = peerRead();
      const bOk = afterRead === beforeRead && afterRead.length > 2;

      // (c) ELLENPÁR — A MÁSIK JOGOSULT UGYANAZT TEHETI, mint előtte. Enélkül a tiltás „mindenkit
      //     zárok" alakkal is teljesítené az (a)/(b) feleket.
      const kollega = rightAt({ store: w.store, subjectId: 'sub_kollega', bookId: 'book_a',
        opClass: 'own_book', clock: w.clock });
      const cOk = kollega.allowed === true;

      // (d) …a TILTOTT alany viszont MOSTANTÓL zárva van (alany-szintű fajta: mindenhol).
      const tiltott = rightAt({ store: w.store, subjectId: 'sub_dolgozo', bookId: 'book_b',
        opClass: 'own_book', clock: w.clock });
      const dOk = tiltott.allowed === false && tiltott.reason === 'ban_subject_wide';

      // (e) A VALÓDI KIADÁSI ÚT IS LEFUTOTT (R75) — enélkül az (a) fél csak a fixtúráról szólna,
      //     és az `issueBan` mellé tett törlés túlélné a mérést (ez TÖRTÉNT MEG: M68 SURVIVED).
      const eOk = issued.ok === true;

      const pass = aOk && bOk && cOk && dOk && eOk;
      return {
        expected: 'a tiltás után a korábbi parancs és annak eredménye TARTALMILAG változatlan — '
          + 'a FIXTÚRÁVAL és a VALÓDI KIADÁSI ÚTTAL is · a könyv másik jogosultja ugyanazt teheti · '
          + 'a tiltott alany viszont zárva van',
        actual: `(a) pillanatkép azonos=${aOk} · (b) korábbi eredmény azonos=${bOk} · `
          + `(c) másik jogosult=${kollega.allowed} · (d) tiltott alany=${tiltott.reason} · `
          + `(e) a kiadási út lefutott=${issued.ok ? issued.kind : issued.reason}`,
        pass,
        asserts: {
          'A-REV-N5c-ban-does-not-rewrite-the-past': aOk && bOk && eOk,
          'A-REV-N5c-ban-does-not-remove-others-rights': cOk && dOk,
        },
      };
    } finally { w.store.close(); }
  });

probe('P-REV-ban-matrix', 'R73 · R75 §8 · REV-N5a · REV-N5b · K09 · K15 · KUKA-051 · KUKA-082',
  'A TILTÁS-MÁTRIX: FAJTA × ENGEDŐ ÚT × ÉRINTETT/FÜGGETLEN CÉL × HITELES KONTEXTUS',
  () => {
    // A külső tárgyaló fél KÉTSZER kérte ezt a mátrixot, és kétszer nem kapta meg BIZONYÍTOTT
    // alakban (R73 · R75 §8). A kísértés a kézzel rajzolt tábla volt — pontosan az, amit a KUKA-082
    // tilt: a lap és a rendszer két külön igazságot szülne. Ezért a mátrix MÉRÉS: minden cella
    // valódi tároló + valódi tiltás-rekord + valódi jogfeloldó, és a VÁRT értéket a cella
    // DEKLARÁLJA, nem a mért érték adja (KUKA-054).
    //
    // ÉS AMIT AZ ELSŐ FUTÁSA MEGTANÍTOTT: két cellán „eltérést" mutatott az `operation` fajtánál —
    // és a KÓD volt a helyes. A művelet-tiltásnál az „érintett cél" nem a tiltás tulajdonsága,
    // hanem a tiltás célja ÉS az adott út SAJÁT művelete közötti VISZONY (KUKA-024). Ezért a
    // mátrix minden cellája KIÍRJA, mit kérdezett (`op_class`) — a „miért nyitva?" kérdésre a
    // tábla maga felel, nem egy magyarázó bekezdés (KUKA-004: a próza nem őr).
    const m = banMatrix();

    // (a) MINDEN CELLA A NORMÁT ADJA. Egy eltérés = a kód és a REV-N5a/b elcsúszott.
    const aOk = m.mismatches.length === 0;

    // (b) A HATÓKÖR SZABÁLY, NEM LISTA (KUKA-051). A fajtákat a ZÁRT HALMAZBÓL vesszük, nem
    //     lemásolva: ha holnap új fajta születik cella nélkül, ez PIROS — a nem mért fajta
    //     különben ZÖLDNEK LÁTSZANA.
    const bOk = m.missing_kinds.length === 0 && m.inconsistent_plan.length === 0;

    // (c) MIND A HÁROM ENGEDŐ ÚT SZEREPEL — A KIADÁS IS. Ezt a külső fél kimondottan kérte: a
    //     kiadási művelet korábban HIÁNYZOTT a fogyasztók közül, és pont ezért tudott harmadik,
    //     őrizetlen úttá válni (R75/F01).
    const paths = new Set(m.cells.map((c) => c.path));
    const cOk = paths.has('membership') && paths.has('authority') && paths.has('issuing');

    // (d) A MÁTRIX NEM EGYIRÁNYÚ: minden fajtánál van ZÁRÓ és NYITOTT cella is. Enélkül egy
    //     „mindent zárok" vagy „semmit sem zárok" alak is teljesítené (KUKA-092 · KUKA-049).
    const perKind = new Map();
    for (const c of m.cells) {
      if (c.expect === 'n/a') continue;
      const s = perKind.get(c.kind) || new Set();
      s.add(c.actual); perKind.set(c.kind, s);
    }
    // Az alany-szintű fajta a KIVÉTEL, és NEVEZETT: neki fogalmilag nincs nyitott cellája.
    const dOk = [...perKind.entries()].every(([kind, seen]) => (kind === 'subject'
      ? seen.has('blocked') && !seen.has('open')
      : seen.has('blocked') && seen.has('open')));

    const pass = aOk && bOk && cOk && dOk;
    const blocked = m.cells.filter((c) => c.actual === 'blocked').length;
    const open = m.cells.filter((c) => c.actual === 'open').length;
    const undec = m.cells.filter((c) => c.actual === 'undecidable').length;
    return {
      expected: 'a mátrix MINDEN cellája a normát adja · MINDEN ismert tiltás-fajtának van cellája · '
        + 'mind a három engedő út szerepel (a KIADÁS is) · és minden fajtánál van ZÁRÓ és NYITOTT '
        + 'cella is (az alany-szintű a nevezett kivétel)',
      // A SOR ÉS AZ EGYEDI BEMENET KÜLÖN NEVEZVE (R77 §3) — a számokat a MÉRÉS adja, nem a lap
      // számolja (KUKA-082), és a jelentés így nem nevezheti 66 független forgatókönyvnek.
      actual: `${m.rows} SOR (ebből ${m.not_applicable_rows} nem értelmezhető, `
        + `${m.executed_rows} végrehajtott = ${m.unique_executed_inputs} EGYEDI bemenet + `
        + `${m.repeated_rows} ismétlődő) · eltérés=${m.mismatches.length} · lefedetlen fajta=`
        + `${m.missing_kinds.length ? m.missing_kinds.join(',') : 'nincs'} · utak=${[...paths].join(',')} · `
        + `ZÁR=${blocked} · NYITVA=${open} · NEM DÖNTHETŐ=${undec} · kétirányú minden fajtán=${dOk}`,
      pass,
      asserts: {
        'A-REV-N5a-every-path-measured-for-every-kind': bOk && cOk,
        'A-REV-N5b-scope-matrix-matches-the-norm': aOk && dOk,
      },
    };
  });

probe('P-REV-effectuation', 'R77/F01 · REV-N3a · REV-N2a(NEM zárva) · K04 · K09 · KUKA-002 · KUKA-024 · KUKA-051',
  'A HATÁLYOSULÁS PONTJA: a döntés és a RÖGZÍTETT HATÁS ugyanazon az időponton áll (EFF-01)',
  () => {
    // A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL, R77/F01). Mind a három megnevezett író KÉTSZER
    // olvasott órát; a második (későbbi) érték került a rekordba, miközben a jog az ELSŐN dőlt el.
    //
    // AMIT EZ A PRÓBA MÉR, ÉS AMIT SZÁNDÉKOSAN NEM. Nem az óraolvasások SZÁMÁT méri — az a
    // megvalósítás alakja, nem a szerződés (KUKA-009). A mérce a VISSZAMÉRHETŐ INVARIÁNS: ha egy
    // hatás rögzült, akkor a SAJÁT időbélyegén újraértékelve az eljáró joga fennállt. Ez az óra
    // alakjától független, és pontosan azt a kárt fogja meg, amit a külső fél leírt: a tárolóban
    // ne állhasson olyan hatás, amit a rögzítése pillanatában senki nem volt jogosult létrehozni.
    const T0 = '2026-09-14T08:00:00.000Z';
    const CUT = '2026-09-14T08:00:01.000Z';
    const T2 = '2026-09-14T08:00:02.000Z';
    const DRIFT_CUT = '2026-09-14T08:00:03.000Z';
    const T4 = '2026-09-14T08:00:04.000Z';

    // Az ELŐREHALADÓ óra a külső fél alakja: az első olvasás a határ ELŐTT, a többi UTÁNA. Ez az
    // egyetlen olyan alak, amiben a „döntés" és az „írás" ideje el TUD térni (KUKA-046 az idő
    // tengelyén: két helyes hívás rossz sorrendben is hiba).
    const advancing = () => { let n = 0; return { now: () => (++n === 1 ? T0 : T2) }; };
    const still = () => ({ now: () => T0 });
    // A SODRÓDÓ óra HÁROM KÜLÖNBÖZŐ értéket ad: bebocsátás · hatályosulás · „bármi, ami utána jön".
    // Erre azért van szükség, mert a kétértékű órán a „friss óraolvasás a bélyeghez" alak
    // EGYENÉRTÉKŰ a helyessel — és az egyenértékű mutáció túlélése semmit nem bizonyít (KUKA-139,
    // a külső fél R77 §7 szűkítése). A megvonást a 2. és a 3. olvasás KÖZÉ tesszük: így a helyes
    // bélyeg (2. olvasás) jogos, egy KÉSŐBBI olvasásból származó bélyeg viszont már nem.
    const drifting = () => { let n = 0; return { now: () => { n += 1; return n === 1 ? T0 : (n === 2 ? T2 : T4); } }; };

    // EGY TÁROLÓ, TÖBB MÉRÉS — ahol a mérések NEM ÍRNAK. A tiltó ágak (b) és (c) definíció szerint
    // nulla üzleti mellékhatással zárulnak, tehát nyugodtan osztozhatnak a világon: a megvonás
    // idejét közben átállítjuk. A mérő költségét a SAJÁT költségvetése köti (KUKA-140) — a
    // takarékosság itt nem gyengíti az állítást, mert a megosztott ág épp az, amelyik nem ír.
    function bench({ revoke, path }) {
      const store = openStore();
      const fixed = clockFrom(T0);
      for (const s of ['judge', 'member']) store.run('INSERT INTO subject VALUES (?,?)', s, 'person');
      store.run('INSERT INTO book VALUES (?,?)', 'a', 'A könyv');
      store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)', 'member', 'a', 'user', T0);
      for (const op of ['suspend', 'alter_right', 'adjudicate']) {
        grantAdjudicationAuthority({ store, clock: fixed, subjectId: 'judge', bookId: 'a', operation: op });
      }
      // A FELOLDÁS-ÚT ELŐFELTÉTELE FIXTÚRA, NEM TERMÉK-HÍVÁS — és ezt kimondjuk (R75/F03 fegyelme).
      // Ha a felfüggesztést a termék-úton tennénk be, a MEGVONT hatáskörű világban az a lépés is
      // elbukna, és a `liftSuspension` `not_suspended`-et adna: a próba ZÖLD maradna, de MÁS okból,
      // mint amit állít (KUKA-049 — a jel a mechanizmust mérje, ne a tünetet).
      if (path === 'lift') {
        store.run(`INSERT INTO membership_suspension (subject_id, book_id, actor_subject_id, suspended_at, lifted_at, lifted_by, reason)
                   VALUES (?,?,?,?,NULL,NULL,NULL)`, 'member', 'a', 'judge', T0);
      }
      if (revoke) store.run('UPDATE adjudication_authority SET revoked_at = ? WHERE subject_id = ?', revoke, 'judge');
      return { store };
    }
    const at = (b, clock) => ({ store: b.store, clock: clock() });

    // A HÁROM MEGNEVEZETT ÚT + a SAJÁT KITERJESZTÉSEM ÖTÖDIK TAGJA (`revokeMembership`), mert a
    // szabály a hiba OSZTÁLYÁRA szól, nem arra a rétegre, ahol először láttuk (KUKA-051).
    const paths = {
      issue: (b) => issueBan({ store: b.store, clock: b.clock, actorSubjectId: 'judge', subjectId: 'member',
        bookId: 'a', cause: 'left_company', targetRef: 'a' }),
      suspend: (b) => suspendMembership({ store: b.store, clock: b.clock, actorSubjectId: 'judge',
        subjectId: 'member', bookId: 'a' }),
      lift: (b) => liftSuspension({ store: b.store, clock: b.clock, actorSubjectId: 'judge',
        subjectId: 'member', bookId: 'a' }),
      revoke: (b) => revokeMembership({ store: b.store, clock: b.clock, actorSubjectId: 'judge',
        subjectId: 'member', bookId: 'a' }),
    };
    // Minden útnál: MIT ír, és MELYIK oszlopban áll a hatás ideje.
    const effectRows = {
      issue: (s) => s.all('SELECT banned_at AS at FROM subject_ban'),
      suspend: (s) => s.all('SELECT suspended_at AS at FROM membership_suspension WHERE lifted_at IS NULL'),
      lift: (s) => s.all('SELECT lifted_at AS at FROM membership_suspension WHERE lifted_at IS NOT NULL'),
      revoke: (s) => s.all('SELECT recorded_at AS at FROM membership_revocation'),
    };
    const OP = { issue: 'alter_right', suspend: 'suspend', lift: 'suspend', revoke: 'alter_right' };

    const notes = [];
    let beforeOk = true; let afterOk = true; let crossOk = true; let noSideEffect = true; let backOk = true;

    for (const name of Object.keys(paths)) {
      // (a) A HATÁR ELŐTT a hatás LÉTREJÖN — enélkül egy „mindent tiltok" alak is teljesítené a
      //     többi ágat (KUKA-092). EZT NEM KÜLÖN VILÁGBAN MÉRJÜK: a (d) ág sodródó órája a
      //     megvonást a 2. és 3. olvasás KÖZÉ teszi, tehát ott a művelet SIKERES — ugyanez a
      //     tény, egy tárolóval kevesebbért. A mérő költségét a saját költségvetése köti
      //     (KUKA-140): ami két helyen ugyanazt bizonyítja, azt egyszer mérjük.
      // (b) A HATÁR UTÁN: a jog már megszűnt a hívás pillanatában is ⇒ elutasítás, NULLA mellékhatás.
      // (c) AZ ÁTLÉPŐ ESET — EZ A LELET. A jog a KÉT óraolvasás KÖZÖTT szűnik meg. A szerződés:
      //     a hatályosulás pontján mért jog dönt, és a rögzített idő UGYANAZ a pont.
      // A KETTŐ EGY VILÁGON OSZTOZIK: egyik sem írhat, tehát a megosztás nem mos el semmit.
      {
        const b = bench({ revoke: T0, path: name });
        const after = paths[name](at(b, still));
        if (after.ok !== false) { afterOk = false; notes.push(`${name}:határ-után=${JSON.stringify(after)}`); }
        if (effectRows[name](b.store).length !== 0) { noSideEffect = false; notes.push(`${name}:határ-után-sorok`); }

        b.store.run('UPDATE adjudication_authority SET revoked_at = ? WHERE subject_id = ?', CUT, 'judge');
        const cross = paths[name](at(b, advancing));
        if (cross.ok !== false) { crossOk = false; notes.push(`${name}:átlépő=${JSON.stringify(cross)}`); }
        if (effectRows[name](b.store).length !== 0) { noSideEffect = false; notes.push(`${name}:átlépő-sorok`); }
        b.store.close();
      }
      // (d) A VISSZAMÉRT INVARIÁNS: a rögzített idő olyan pillanat, amelyen a jog FENNÁLLT. Ezt a
      //     TÁROLÓBÓL mérjük vissza, ugyanazzal a feloldóval, amit a döntés használ — nem a
      //     visszatérési értékből (KUKA-038: a létezés nem bizonyíték, a lánc végét kell nézni).
      //     A SODRÓDÓ óra + a 2. és 3. olvasás KÖZÉ tett megvonás teszi ezt az ágat élessé, és
      //     EGYBEN ez az (a) ág is: itt a művelet SIKERES, tehát a „határ előtt létrejön" is mérve.
      {
        const b = bench({ revoke: DRIFT_CUT, path: name });
        const r = paths[name](at(b, drifting));
        const rows = effectRows[name](b.store);
        if (r.ok === true && rows.length === 1) {
          const stamp = rows[0].at;
          const right = executableRightAt({ store: b.store, subjectId: 'judge', bookId: 'a',
            operation: OP[name], nowIso: stamp });
          if (!right.ok) { backOk = false; notes.push(`${name}:visszamérve=${right.reason}@${stamp}`); }
        } else { backOk = false; beforeOk = false; notes.push(`${name}:visszamérés-alap=${JSON.stringify(r)}`); }
        b.store.close();
      }
    }

    const pass = beforeOk && afterOk && crossOk && noSideEffect && backOk;
    return {
      expected: 'mind a NÉGY hatáskör-igényes írónál (kiadás · felfüggesztés · feloldás · megvonás): '
        + 'a határ ELŐTT siker · a határ UTÁN elutasítás · az ÁTLÉPŐ esetben elutasítás · elutasításkor '
        + 'NULLA üzleti mellékhatás · és minden rögzített hatás SAJÁT időbélyegén visszamérve a jog fennállt',
      actual: `utak=${Object.keys(paths).join(',')} · határ-előtt=${beforeOk} · határ-után=${afterOk} · `
        + `átlépő=${crossOk} · nulla-mellékhatás=${noSideEffect} · visszamérve=${backOk}`
        + (notes.length ? ` · eltérések: ${notes.join(' | ')}` : ''),
      pass,
      asserts: {
        'A-REV-N3a-effect-time-is-the-decision-time': backOk && crossOk,
        'A-REV-N3a-denied-write-has-no-side-effect': afterOk && noSideEffect && beforeOk,
      },
    };
  });

probe('P-REV-ban-record-shape', 'R77/F03 · REV-N5b · K09 · K15 · KUKA-020 · KUKA-124 · KUKA-039',
  'A SZERKEZETILEG HIBÁS TÁROLT HATÓKÖR NEM „MÁSIK KÖNYV" — nevezett, fail-closed válasz',
  () => {
    // A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL, R77/F03). A tárolt `"own_book"` cél ÜRES
    // könyv-tengelyét a feloldó szabályos, könyvre korlátozott alaknak vette, majd a kérés `a`
    // könyvéhez hasonlította, nem egyezett — és `ban_other_bookId` címen TOVÁBBENGEDTE a kérést.
    const w = buildTwoBookWorld();
    try {
      const may = (book) => rightAt({ store: w.store, subjectId: 'sub_dolgozo', bookId: book,
        opClass: 'own_book', clock: w.clock });
      const plant = (target) => w.store.run(
        `INSERT INTO subject_ban (subject_id, kind, cause, target_ref, actor_subject_id, banned_at)
         VALUES (?,?,?,?,?,?)`,
        'sub_dolgozo', 'operation', 'operation_misuse', target, 'sub_adjudicator', w.clock.now());
      const wipe = () => w.store.run('DELETE FROM subject_ban');

      // KONTROLL: tiltás nélkül mindkét könyv nyitva.
      const before = may('book_a').allowed && may('book_b').allowed;

      // (a) A NÉGY HIBÁS ALAK mind ZÁR, és mind a SAJÁT, nevezett választ adja — nem a „másik könyv"
      //     felmentését. A lista SZABÁLY, nem a lelet egyetlen példánya (KUKA-051).
      const malformed = ['own_book', 'book_a', '', 'book_aown_bookx'];
      const aOk = malformed.every((t) => {
        wipe(); plant(t);
        const v = rightAt({ store: w.store, subjectId: 'sub_dolgozo', bookId: 'book_a', opClass: 'own_book', clock: w.clock });
        return v.allowed === false && v.reason === 'ban_operation_scope_malformed';
      });

      // (b) ELLENPÁR — A KÉT JOGOS ALAK ÉRINTETLEN (KUKA-049: az őr ne a kért eredményt jelentse
      //     hibának). A könyvre korlátozott pár zárja A-t és NYITVA hagyja B-t; a csupasz (globális)
      //     alak MINDKETTŐT zárja — ez a REV-N5b két, kimondottan megkülönböztetett alakja.
      wipe(); plant(operationScopeRef('book_a', 'own_book'));
      const scopedOk = may('book_a').allowed === false && may('book_b').allowed === true;
      wipe(); plant('own_book');
      const globalOk = may('book_a').allowed === false && may('book_b').allowed === false;
      const bOk = scopedOk && globalOk;

      // (c) A HIÁNYZÓ CÉL MEGTARTJA A SAJÁT, PONTOSABB NEVÉT (KUKA-124: az új kapu ne fedje el az
      //     igazit). Az üres `target_ref` NEM „szerkezetileg hibás", hanem `ban_target_missing`.
      wipe(); plant('');
      const cOk = rightAt({ store: w.store, subjectId: 'sub_dolgozo', bookId: 'book_a',
        opClass: 'own_book', clock: w.clock }).reason === 'ban_target_missing';

      // (d) A FELOLDÓT A KÖZVETLEN HÍVÓ IS UGYANÚGY KAPJA (KUKA-039: a kivétel nem állhat EGY ág
      //     feltételében). A `banReaches` ugyanazt a nevezett, NEM DÖNTHETŐ választ adja.
      const direct = banReaches({ kind: 'operation', cause: 'operation_misuse', target_ref: 'own_book' },
        { bookId: 'book_a', opClass: 'own_book' });
      const dOk = direct.decidable === false && direct.reason === 'ban_operation_scope_malformed'
        && operationScopeProblem('own_book') !== null
        && operationScopeProblem(operationScopeRef('book_a', 'own_book')) === null
        && operationScopeProblem('own_book') === null;

      wipe();
      const pass = before && aOk && bOk && cOk && dOk;
      return {
        expected: 'a szerkezetileg hibás tárolt művelet-cél NEVEZETT, fail-closed választ ad '
          + '(`ban_operation_scope_malformed`) MINDEN alakján · a két JOGOS alak érintetlen · a hiányzó '
          + 'cél megtartja a saját nevét · és a közvetlen hívó ugyanazt kapja',
        actual: `kontroll=${before} · hibás alakok zárnak=${aOk} (${malformed.length} alak) · `
          + `ellenpár (könyv-hatókörű + globális)=${bOk} · hiányzó cél külön név=${cOk} · közvetlen hívó=${dOk}`,
        pass,
        asserts: { 'A-REV-N5b-malformed-stored-scope-is-fail-closed': aOk && bOk && cOk && dOk },
      };
    } finally { w.store.close(); }
  });

// ── A JOGALAP-VILÁG (R47, JAVÍTVA R49) — a MEGLÉVŐ lánccal, nem kézzel írt sorokkal ───────────
//
// MI VÁLTOZOTT AZ R49-BEN. Az R48-as világ a MEGHÍVÓ-lánc `scope` tengelyéből származtatta az
// olvasási jogot. A külső ellenőrző fél megmutatta, hogy ez a KIADÓ FELSŐ KORLÁTJA, nem a címzett
// joga: a `scopes: ['keszlet','arak']` határozat alatt kiadott, CSAK KÉSZLETRE szóló meghívó
// címzettje megkapta az árat. Innentől a világ KÜLÖN kezeli a hármat: (1) a határozat plafonját,
// (2) a ténylegesen MEGADOTT olvasási jogot (SGR-01), (3) a tagságra átvitt korlátot.
function basisWorld() {
  const T0 = BIT.MARCH;
  const T1 = BIT.MARCH_LATER;
  const store = openStore();
  store.run('INSERT INTO book (id, name) VALUES (?,?)', 'a', 'A könyv');
  for (const id of ['vezeto', 'kiado', 'biro']) store.run('INSERT INTO subject VALUES (?,?)', id, 'person');
  grantMembership({ store, subjectId: 'kiado', bookId: 'a', role: 'admin', at: T0 });
  // A HATÁROZAT: MINDKÉT adatkörre ADHAT felhatalmazást — ez a PLAFON, nem a jog.
  recordAuthorityBasis({
    store, basisId: 'HAT', bookId: 'a', issuerSubject: 'vezeto', effectiveAt: T0, recordedAt: T0,
    allowedOperations: [INVITE_ISSUE_OPERATION], allowedRoles: ['user', 'admin'],
    allowedScopes: ['keszlet', 'arak'], evidenceRef: 'doc:HAT',
  });
  let n = 0;
  // A TAGSÁG a VALÓDI meghívó-láncon születik; az OLVASÁSI JOGOT külön, kimondottan adjuk meg.
  const member = (grantedScopes) => {
    n += 1;
    const sub = `olv${n}`;
    store.run('INSERT INTO subject VALUES (?,?)', sub, 'person');
    store.run('INSERT INTO external_id VALUES (?,?,?,?,?,?,?,?,NULL)',
      sub, 'email', 'self_asserted', 'n/a', `${sub}@p.invalid`, `${sub}@p.invalid`, 'one_to_one', T0);
    store.run('INSERT INTO account VALUES (?,?)', sub, 'jelszo');
    store.run('INSERT INTO channel_proof VALUES (?,?,?,?)', sub, 'email', `${sub}@p.invalid`, T0);
    const iv = issueInviteUnderBasis({ store, token: `tok${n}`, bookId: 'a', inviteeNamespace: 'email',
      inviteeValue: `${sub}@p.invalid`, offeredRole: 'user', issuerSubject: 'kiado',
      expiresAt: '2026-12-31T00:00:00.000Z', basisId: 'HAT', scope: 'keszlet', issuedAt: T0 });
    const rd = redeemInvite({ store, token: `tok${n}`, actingSubjectId: sub, clock: clockFrom(T1) });
    const grants = (grantedScopes || []).map((scope) => grantReadScope({
      store, subjectId: sub, bookId: 'a', scope, basisId: 'HAT', basisVersion: 1,
      grantedBy: 'vezeto', effectiveAt: T0, recordedAt: T0,
    }));
    return { sub, built: iv.ok === true && rd.ok === true && grants.every((g) => g.ok === true) };
  };
  const put = (key, result) => submitCommand({ store, clock: clockFrom(T1), idemKey: key, actor: 'kiado',
    bookId: 'a', type: 'stock.receipt', typeVersion: '1', declared: { sku: key },
    resolve: () => result, credentials: { dataScope: 'keszlet' } });
  const read = (key, sub, credentials) => readCommandResult({ store, clock: clockFrom(T1), idemKey: key,
    requester: sub, bookId: 'a', actor: 'kiado', credentials });
  const priced = (r) => r.ok === true && r.result && Object.prototype.hasOwnProperty.call(r.result, 'unit_price');
  return { store, T0, T1, member, put, read, priced };
}

probe('P-DSC-scope-basis', 'R47 · R49 · K05-DSC-c · ORG-N1a · ORG-N1b · REV-N5b · KUKA-073 · KUKA-022',
  'A KIADÁS A TÉNYLEGESEN MEGADOTT OLVASÁSI JOGBÓL DÖNT — a plafon csak szűkít, a hiány zár',
  () => {
    const w = basisWorld();
    try {
      w.put('vegyes', { qty: '1.000', unit_price: 12345 });
      w.put('tiszta', { qty: '11.000' });
      // A HÁROM ALANY KÜLÖNBSÉGE MAGA A BIZONYÍTÁS: mindhárom tagsága UGYANAZON a tág (keszlet+arak)
      // határozaton született — csak a MEGADOTT jog tér el.
      const NINCS = w.member([]);                      // tag, de EGYETLEN adatkörre sincs joga
      const KESZLET = w.member(['keszlet']);           // SZŰK adás a TÁG keretből
      const MINDEN = w.member(['keszlet', 'arak']);    // valóban MINDKÉT adatkörre megadva

      // (a) A HIÁNYZÓ ENGEDÉLY ZÁR (R49/F49-01). A tagság önmagában nem olvasási jog: a tiszta
      //     készlet-eredmény SEM jön ki. A válasz a `not_available` — a létezést nem árulja el.
      const nClean = w.read('tiszta', NINCS.sub, { dataScope: 'keszlet' });
      const nMixed = w.read('vegyes', NINCS.sub, { dataScope: 'keszlet' });
      const nDecision = scopeReleaseDecision({ store: w.store, subjectId: NINCS.sub, bookId: 'a', scope: 'keszlet', nowIso: w.T1 });
      const aOk = NINCS.built && nClean.ok === false && nMixed.ok === false && !w.priced(nMixed)
        && nDecision.allowed === false && nDecision.reason === 'no_scope_grant'
        && nDecision.basis === 'scope_grant';

      // (b) SZŰK ADÁS A TÁG KERETBŐL (R49/F49-02). A határozat MINDKÉT adatkörre adhatna, de ennek
      //     az alanynak CSAK készletet adtak: a tiszta eredmény kijön, a vegyes NEM — sem hamis
      //     címkével, sem címke nélkül. A megadható jog nem a megadott.
      const kClean = w.read('tiszta', KESZLET.sub, { dataScope: 'keszlet' });
      const kMixed = w.read('vegyes', KESZLET.sub, { dataScope: 'keszlet' });
      const kLied = w.read('vegyes', KESZLET.sub, { dataScope: 'arak' });
      const kNoLabel = w.read('vegyes', KESZLET.sub, undefined);
      const kDecision = scopeReleaseDecision({ store: w.store, subjectId: KESZLET.sub, bookId: 'a', scope: 'arak', nowIso: w.T1 });
      const bOk = KESZLET.built && kClean.ok === true && kClean.result.qty === '11.000'
        && [kMixed, kLied, kNoLabel].every((r) => r.ok === false)
        && ![kMixed, kLied, kNoLabel].some(w.priced)
        && kDecision.allowed === false && kDecision.reason === 'no_scope_grant';

      // (c) ELLENPÁR — VALÓDI, MINDKÉT adatkörre MEGADOTT jog mellett a vegyes eredmény KIJÖN.
      //     Enélkül a kapu egy „soha semmit" alakkal is teljesülne (KUKA-049 · KUKA-122).
      const mMixed = w.read('vegyes', MINDEN.sub, { dataScope: 'keszlet' });
      const mDecision = scopeReleaseDecision({ store: w.store, subjectId: MINDEN.sub, bookId: 'a', scope: 'arak', nowIso: w.T1 });
      const cOk = MINDEN.built && mMixed.ok === true && mMixed.result.unit_price === 12345
        && mMixed.result.qty === '1.000'
        && mDecision.allowed === true && mDecision.basis === 'scope_grant'
        && mDecision.reason === 'scope_granted_and_within_limits';

      // (d) A KIMONDOTT TILTÁS AZ ENGEDÉLY MELLETT IS ÉRVÉNYESÜL — és nem válik általános zárrá.
      w.store.run(`INSERT INTO subject_ban (subject_id, kind, cause, target_ref, actor_subject_id, banned_at)
                   VALUES (?,?,?,?,?,?)`, MINDEN.sub, 'data_scope', 'data_scope_withdrawn', 'arak', 'biro', w.T0);
      const mBanned = w.read('vegyes', MINDEN.sub, { dataScope: 'keszlet' });
      const mStillStock = w.read('tiszta', MINDEN.sub, { dataScope: 'keszlet' });
      const banDecision = scopeReleaseDecision({ store: w.store, subjectId: MINDEN.sub, bookId: 'a', scope: 'arak', nowIso: w.T1 });
      const dOk = mBanned.ok === false && !w.priced(mBanned)
        && mStillStock.ok === true && mStillStock.result.qty === '11.000'
        && banDecision.allowed === false && banDecision.basis === 'explicit_ban';

      // (e) A MEGADOTT JOG MEGVONÁSA ZÁR — és ez VALÓDI kiadás-különbség: ugyanaz az olvasó, ugyanaz
      //     az eredmény, előtte KIADVA, utána ZÁRVA.
      const beforeRevoke = w.read('tiszta', KESZLET.sub, { dataScope: 'keszlet' });
      revokeReadScope({ store: w.store, subjectId: KESZLET.sub, bookId: 'a', scope: 'keszlet', at: w.T0 });
      const afterRevoke = w.read('tiszta', KESZLET.sub, { dataScope: 'keszlet' });
      const revokedDecision = scopeReleaseDecision({ store: w.store, subjectId: KESZLET.sub, bookId: 'a', scope: 'keszlet', nowIso: w.T1 });
      const eOk = beforeRevoke.ok === true && afterRevoke.ok === false
        && revokedDecision.allowed === false && revokedDecision.reason === 'scope_grant_revoked';

      // (f) A JOG NEM ÉLI TÚL AZ ALAPJÁT: a határozat megvonása után a MEGADOTT jog sem nyit —
      //     és ez is VALÓDI kiadás-különbség (előtte kiadva, utána zárva), nem csak indok-csere.
      const beforeBasisRevoke = w.read('vegyes', MINDEN.sub, { dataScope: 'keszlet' });  // tiltott: arak
      const stockBefore = w.read('tiszta', MINDEN.sub, { dataScope: 'keszlet' });
      w.store.run('UPDATE authority_basis SET revoked_at = ? WHERE basis_id = ?', w.T0, 'HAT');
      const stockAfter = w.read('tiszta', MINDEN.sub, { dataScope: 'keszlet' });
      const basisDecision = scopeReleaseDecision({ store: w.store, subjectId: MINDEN.sub, bookId: 'a', scope: 'keszlet', nowIso: w.T1 });
      w.store.run('UPDATE authority_basis SET revoked_at = NULL, expires_at = ? WHERE basis_id = ?', w.T0, 'HAT');
      const stockExpired = w.read('tiszta', MINDEN.sub, { dataScope: 'keszlet' });
      const expiredDecision = scopeReleaseDecision({ store: w.store, subjectId: MINDEN.sub, bookId: 'a', scope: 'keszlet', nowIso: w.T1 });
      w.store.run('UPDATE authority_basis SET expires_at = NULL WHERE basis_id = ?', 'HAT');
      const fOk = beforeBasisRevoke.ok === false && stockBefore.ok === true
        && stockAfter.ok === false && basisDecision.reason === 'basis_revoked'
        && stockExpired.ok === false && expiredDecision.reason === 'basis_expired';

      // (g) A LÉTEZÉSI HATÁR MEGMARAD (KUKA-084): az adatkör-elutasítás BÁJTRA ugyanaz, mint a nem
      //     létező hivatkozásé — a válasz nem mondhatja meg, hogy a parancs létezik.
      const ghost = w.read('nincs-ilyen-kulcs', NINCS.sub, { dataScope: 'keszlet' });
      const gOk = JSON.stringify(nClean) === JSON.stringify(ghost);

      // (h) HATÁLYOSULÁS ÉS LELTÁR EGY PONTON, ÉS AZ ELUTASÍTÁS NEM ÍR LELTÁRT (R47/4 · R49).
      const rows = w.store.all('SELECT * FROM disclosure ORDER BY id');
      const forK = rows.filter((r) => r.recipient === KESZLET.sub && r.view === 'command_result');
      const forM = rows.filter((r) => r.recipient === MINDEN.sub && r.view === 'command_result');
      const forN = rows.filter((r) => r.recipient === NINCS.sub);
      const hOk = rows.every((r) => r.at === w.T1)                       // EGY hatályosulási pont
        && forN.length === 0                                            // engedély nélkül NINCS kiadás
        && forK.every((r) => !JSON.parse(r.fields).some((f) => f.includes('unit_price')))
        && forM.some((r) => JSON.parse(r.fields).some((f) => f.includes('unit_price')));

      return {
        expected: 'a HIÁNYZÓ adatköri engedély ZÁR · a SZŰK adás a TÁG keretből nem tágul · a valóban '
          + 'megadott jog mellett a vegyes eredmény KIJÖN · a kimondott tiltás az engedély mellett is '
          + 'zár, de nem általános zár · a jog MEGVONÁSA és az ALAP megvonása/lejárata is ZÁR '
          + '(kiadva → zárva) · a létezési határ megmarad · a leltár EGY ponton áll, engedély nélkül '
          + 'nem születik sor',
        actual: `NINCS jog: tiszta=${nClean.ok ? 'KIADVA(!)' : 'zárva'} (${nDecision.reason})`
          + ` · CSAK készlet: tiszta=${kClean.ok ? 'kiadva' : 'ZÁRVA(!)'} vegyes=${kMixed.ok ? 'KIADVA(!)' : 'zárva'} (${kDecision.reason})`
          + ` · MINDKETTŐ: vegyes=${mMixed.ok ? 'kiadva' : 'ZÁRVA(!)'}`
          + ` · tiltás után: vegyes=${mBanned.ok ? 'KIADVA(!)' : 'zárva'} tiszta=${mStillStock.ok ? 'kiadva' : 'ZÁRVA(!)'}`
          + ` · jog megvonva: ${beforeRevoke.ok ? 'kiadva' : '?'}→${afterRevoke.ok ? 'KIADVA(!)' : 'zárva'} (${revokedDecision.reason})`
          + ` · alap megvonva: ${stockBefore.ok ? 'kiadva' : '?'}→${stockAfter.ok ? 'KIADVA(!)' : 'zárva'} (${basisDecision.reason})`
          + ` · alap lejárt: ${stockExpired.ok ? 'KIADVA(!)' : 'zárva'} (${expiredDecision.reason})`
          + ` · létezési határ azonos=${gOk} · leltár-sorok=${rows.length} (engedély nélküli olvasóé: ${forN.length})`,
        pass: aOk && bOk && cOk && dOk && eOk && fOk && gOk && hOk,
        asserts: {
          'A-K05-c-missing-scope-grant-closes-the-release': aOk,
          'A-K05-c-narrow-grant-from-a-broad-basis-stays-narrow': bOk,
          'A-K05-c-reader-entitled-to-every-affected-scope-still-gets-the-result': cOk,
          'A-K05-c-explicit-ban-holds-alongside-a-permitting-basis': dOk,
          'A-K05-c-revoked-grant-or-revoked-expired-basis-closes-a-previously-open-release': eOk && fOk,
          'A-K05-c-refusal-keeps-the-existence-boundary': gOk,
          'A-K05-c-one-effectuation-point-for-decision-and-ledger': hOk,
        },
      };
    } finally { w.store.close(); }
  });

probe('P-DSC-scope-grant-history', 'R51/F51-01 · K05-DSC-c · K09 · REV-N2a · KUKA-002 · KUKA-124',
  'A JOG MEGADÁSA ÉS MEGVONÁSA UGYANAZON A KÉT IDŐ-TENGELYEN — a későbbi tudás nem írja át a korábbit',
  () => {
    // A LELET (megtalálta: a KÜLSŐ ELLENŐRZŐ FÉL, R51/F51-01). Az R49-es megvonás EGYETLEN
    // időpontot írt a MEGADÁS sorába (`revoked_at`), és az olvasó csak a megadás `recorded_at`-ját
    // nézte. Adaton mérve: egy ÁPRILISBAN rögzített, MÁRCIUS 10-i hatályú megvonás a MÁRCIUS 20-i
    // tudásállapotra is „megvont"-at adott — vagyis a márciusi kérdésre áprilisi választ adtunk.
    // A megadás bitemporális volt, a megvonás nem: a fegyelem FELE nem fegyelem (KUKA-129).
    const w = basisWorld();
    try {
      w.put('tiszta', { qty: '11.000' });
      const ask = (sub, scope, validAt, knownAt) =>
        readScopeGrantAt({ store: w.store, subjectId: sub, bookId: 'a', scope, validAt, knownAt });
      const revocations = () => w.store.all('SELECT * FROM scope_grant_revocation ORDER BY id');
      const readAt = (key, sub, at) => readCommandResult({
        store: w.store, clock: clockFrom(at), idemKey: key, requester: sub,
        bookId: 'a', actor: 'kiado', credentials: { dataScope: 'keszlet' },
      });

      // (a) VISSZAMENŐLEGES MEGVONÁS, AMIT KÉSŐBB TUDTUNK MEG. A hatály MÁRCIUS 20., a rögzítés
      //     JÚNIUS. UGYANARRA a napra (augusztus) KÉT tudásállapot KÉT igaz választ ad — és ez a
      //     hiba-osztály maga: a júniusi tudás nem írhatja át a márciusit (REV-N2a).
      const A = w.member(['keszlet']);
      const aBefore = ask(A.sub, 'keszlet', BIT.AUGUST, BIT.MARCH_LATER);   // „ahogy márciusban tudtuk"
      revokeReadScope({ store: w.store, subjectId: A.sub, bookId: 'a', scope: 'keszlet',
        effectiveAt: BIT.MARCH_LATER, recordedAt: BIT.JUNE, actorSubjectId: 'vezeto' });
      const aStillBefore = ask(A.sub, 'keszlet', BIT.AUGUST, BIT.MARCH_LATER);
      const aToday = ask(A.sub, 'keszlet', BIT.AUGUST, BIT.AUGUST);         // „ahogy ma tudjuk"
      // A MEGADÁS SORA SÉRTETLEN: a megvonás ÚJ esemény, nem sor-átírás (K09 · REV-N1b).
      const grantRow = w.store.get('SELECT * FROM scope_grant WHERE subject_id = ? AND scope = ?', A.sub, 'keszlet');
      const aOk = A.built && aBefore.granted === true
        && aStillBefore.granted === true && JSON.stringify(aBefore) === JSON.stringify(aStillBefore)
        && aToday.granted === false && aToday.reason === 'scope_grant_revoked'
        && aToday.revoked_effective_at === BIT.MARCH_LATER && aToday.revoked_recorded_at === BIT.JUNE
        && grantRow && grantRow.recorded_at === w.T0 && grantRow.effective_at === w.T0;

      // (b) ELŐRE ÜTEMEZETT, JÖVŐBELI HATÁLYÚ MEGVONÁS. Márciusban TUDJUK, augusztustól HATÁLYOS:
      //     júniusban a jog MÉG ÁLL, augusztusban MÁR NEM. A tudás megléte önmagában nem zár.
      const B = w.member(['keszlet']);
      revokeReadScope({ store: w.store, subjectId: B.sub, bookId: 'a', scope: 'keszlet',
        effectiveAt: BIT.AUGUST, recordedAt: BIT.MARCH_LATER, actorSubjectId: 'vezeto' });
      const bJune = ask(B.sub, 'keszlet', BIT.JUNE, BIT.JUNE);
      const bAugust = ask(B.sub, 'keszlet', BIT.AUGUST, BIT.AUGUST);
      const bOk = B.built && bJune.granted === true
        && bAugust.granted === false && bAugust.reason === 'scope_grant_revoked';

      // (c) ÚJRAADÁS. A megvonás nem zárja le örökre az idővonalat: egy KÉSŐBBI hatályú megadás
      //     újra nyit. (A tagságnál ez ma NINCS meg — ott a hiány KIMONDOTT; itt az EGY idővonal
      //     + „a legkésőbbi alkalmazható esemény dönt" alak ezt magától megoldja.)
      const C = w.member(['keszlet']);
      revokeReadScope({ store: w.store, subjectId: C.sub, bookId: 'a', scope: 'keszlet',
        effectiveAt: BIT.MARCH_LATER, recordedAt: BIT.MARCH_LATER, actorSubjectId: 'vezeto' });
      const cRevoked = ask(C.sub, 'keszlet', BIT.MARCH_LATER, BIT.MARCH_LATER);
      const reGrant = grantReadScope({ store: w.store, subjectId: C.sub, bookId: 'a', scope: 'keszlet',
        basisId: 'HAT', basisVersion: 1, grantedBy: 'vezeto', effectiveAt: BIT.JUNE, recordedAt: BIT.JUNE });
      const cAgain = ask(C.sub, 'keszlet', BIT.JUNE, BIT.JUNE);
      const cBetween = ask(C.sub, 'keszlet', BIT.MARCH_LATER, BIT.AUGUST);  // a KÖZBENSŐ nap zárva marad
      const cOk = C.built && cRevoked.granted === false && reGrant.ok === true
        && cAgain.granted === true && cAgain.reason === 'scope_granted'
        && cBetween.granted === false;

      // (d) MÁS ALANY · MÁS ADATKÖR · MÁS KÖNYV ÉRINTETLEN. A megvonás PONTOSAN azt a hármast
      //     zárja, amire szól — nem általános zár (KUKA-048: a hatókör a mérce).
      const D = w.member(['keszlet', 'arak']);
      revokeReadScope({ store: w.store, subjectId: D.sub, bookId: 'a', scope: 'arak',
        effectiveAt: BIT.MARCH_LATER, recordedAt: BIT.MARCH_LATER, actorSubjectId: 'vezeto' });
      const dOwnStock = ask(D.sub, 'keszlet', BIT.AUGUST, BIT.AUGUST);      // saját másik adatköre ÁLL
      const dOwnPrice = ask(D.sub, 'arak', BIT.AUGUST, BIT.AUGUST);         // a megvont adatkör ZÁRVA
      const dOther = ask(B.sub, 'keszlet', BIT.JUNE, BIT.JUNE);             // más alany ÉRINTETLEN
      const dBook = ask(D.sub, 'keszlet', BIT.AUGUST, BIT.AUGUST);
      const dForeign = readScopeGrantAt({ store: w.store, subjectId: D.sub, bookId: 'nincs-ilyen-konyv',
        scope: 'keszlet', validAt: BIT.AUGUST, knownAt: BIT.AUGUST });
      const dOk = D.built && dOwnStock.granted === true && dOwnPrice.granted === false
        && dOther.granted === true && dBook.granted === true
        && dForeign.granted === false && dForeign.reason === 'no_scope_grant';

      // (e) A HIBÁS IDŐ NEVEZETT, ÍRÁSMENTES ELUTASÍTÁS (KUKA-124/2). Nem „valószínűleg most",
      //     és nem néma eldobás: a naplóba egyetlen sor sem kerül, a jog pedig VÁLTOZATLAN.
      const E = w.member(['keszlet']);
      const beforeRows = revocations().length;
      const badEff = revokeReadScope({ store: w.store, subjectId: E.sub, bookId: 'a', scope: 'keszlet', at: 'nem-idő' });
      const badRec = revokeReadScope({ store: w.store, subjectId: E.sub, bookId: 'a', scope: 'keszlet',
        effectiveAt: BIT.MARCH_LATER, recordedAt: '2026-02-30T09:00:00.000Z' });
      const badWho = revokeReadScope({ store: w.store, bookId: 'a', scope: 'keszlet', at: BIT.MARCH_LATER });
      const afterRows = revocations().length;
      const eStill = ask(E.sub, 'keszlet', BIT.AUGUST, BIT.AUGUST);
      const eOk = E.built && badEff.ok === false && badEff.reason.startsWith('effective_at_')
        && badRec.ok === false && badRec.reason.startsWith('recorded_at_')
        && badWho.ok === false && badWho.reason === 'subject_book_and_scope_required'
        && [badEff, badRec, badWho].every((r) => r.wrote === 0)
        && afterRows === beforeRows && eStill.granted === true;

      // (f) A TELJES LÁNC EGYBEN, ÉS A KIADÁS IDŐHATÁRA: megadás → KIADÁS → leltár-sor → megvonás →
      //     ZÁRVA. Ugyanaz az olvasó, ugyanaz az eredmény, ugyanaz a hívás — csak az IDŐ más.
      const F = w.member(['keszlet']);
      const fBefore = readAt('tiszta', F.sub, BIT.MARCH_LATER);
      const ledgerBefore = w.store.all('SELECT * FROM disclosure WHERE recipient = ?', F.sub).length;
      revokeReadScope({ store: w.store, subjectId: F.sub, bookId: 'a', scope: 'keszlet',
        effectiveAt: BIT.JUNE, recordedAt: BIT.JUNE, actorSubjectId: 'vezeto' });
      const fStillOnBoundaryDay = readAt('tiszta', F.sub, BIT.MARCH_LATER);   // a hatály ELŐTTI nap KIAD
      const fAfter = readAt('tiszta', F.sub, BIT.AUGUST);                     // a hatály UTÁNI nap ZÁR
      const ledgerAfter = w.store.all('SELECT * FROM disclosure WHERE recipient = ?', F.sub).length;
      const fDecisionBefore = scopeReleaseDecision({ store: w.store, subjectId: F.sub, bookId: 'a', scope: 'keszlet', nowIso: BIT.MARCH_LATER });
      const fDecisionAfter = scopeReleaseDecision({ store: w.store, subjectId: F.sub, bookId: 'a', scope: 'keszlet', nowIso: BIT.AUGUST });
      const fOk = F.built && fBefore.ok === true && fBefore.result.qty === '11.000'
        && ledgerBefore === 1
        && fStillOnBoundaryDay.ok === true && fAfter.ok === false
        // A ZÁRT KIADÁS NEM ÍR LELTÁRT: a hatás nélküli olvasásról nem születik kiadás-sor.
        && ledgerAfter === 2
        && fDecisionBefore.allowed === true
        && fDecisionAfter.allowed === false && fDecisionAfter.reason === 'scope_grant_revoked';

      const pass = aOk && bOk && cOk && dOk && eOk && fOk;
      return {
        expected: 'a VISSZAMENŐLEG rögzített megvonás NEM írja át a korábbi tudásállapotot · az '
          + 'ELŐRE ütemezett megvonás a hatályáig nem zár · az ÚJRAADÁS újra nyit, a közbenső nap '
          + 'zárva marad · a megvonás CSAK a saját alany×könyv×adatkör hármasára hat · a hibás idő '
          + 'NEVEZETT, ÍRÁSMENTES elutasítás · és a teljes lánc (megadás → kiadás → leltár → '
          + 'megvonás) a kiadás IDŐHATÁRÁN válik zárttá',
        actual: `(a) visszamenőleges: márciusi tudás=${aBefore.granted ? 'kiadva' : 'ZÁRVA(!)'}`
          + `→${aStillBefore.granted ? 'kiadva' : 'ZÁRVA(!)'} · mai tudás=${aToday.granted ? 'KIADVA(!)' : 'zárva'} (${aToday.reason})`
          + ` · (b) ütemezett: június=${bJune.granted ? 'kiadva' : 'ZÁRVA(!)'} augusztus=${bAugust.granted ? 'KIADVA(!)' : 'zárva'}`
          + ` · (c) újraadás: megvonva=${cRevoked.granted} → újra=${cAgain.granted} · közbenső nap=${cBetween.granted}`
          + ` · (d) más adatkör=${dOwnStock.granted} megvont adatkör=${dOwnPrice.granted} más alany=${dOther.granted} más könyv=${dForeign.reason}`
          + ` · (e) hibás idő: ${badEff.reason}/${badRec.reason}/${badWho.reason} · új napló-sor=${afterRows - beforeRows} · a jog áll=${eStill.granted}`
          + ` · (f) lánc: kiadva=${fBefore.ok} határnap=${fStillOnBoundaryDay.ok} utána=${fAfter.ok ? 'KIADVA(!)' : 'zárva'}`
          + ` · leltár ${ledgerBefore}→${ledgerAfter} sor`,
        pass,
        asserts: {
          'A-K05-c-retroactive-revocation-does-not-rewrite-earlier-knowledge': aOk,
          'A-K05-c-scheduled-future-revocation-does-not-close-before-its-effect': bOk,
          'A-K05-c-re-grant-reopens-and-the-gap-day-stays-closed': cOk,
          'A-K05-c-revocation-touches-only-its-own-subject-book-and-scope': dOk,
          'A-K05-c-invalid-revocation-time-is-a-named-write-free-refusal': eOk,
          'A-K05-c-grant-release-ledger-revocation-chain-turns-on-the-release-time-boundary': fOk,
        },
      };
    } finally { w.store.close(); }
  });

probe('P-REV-result-scope', 'R77/F02 · REV-N5b · K05 · K09 · K15 · KUKA-002 · KUKA-121 · KUKA-084',
  'A KIADOTT EREDMÉNY ADATKÖRE — a típus deklarálja, nem a kérő címkéje (DSC-01)',
  () => {
    // A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL, R77/F02). Az `arak` adatkörre tiltott olvasó
    // `dataScope: 'keszlet'` kontextussal EGÉSZBEN megkapta a `{qty, unit_price}` eredményt.
    // A tiltás egy CÍMKÉRE hatott, amit a kérés hozott — a kimenő TARTALOMHOZ semmi nem volt kötve.
    const w = buildTwoBookWorld();
    try {
      // A BEADÁS MINDIG VISZI A SAJÁT KONTEXTUSÁT. Ez nem kényelmi fogás: `data_scope` tiltás
      // mellett a megkülönböztető NÉLKÜL érkező kérés NEM DÖNTHETŐ, tehát fail-closed zárul
      // (REV-N5b) — és akkor a próba a rossz dolgot mérné (a hiányzó címkét, nem a besorolást).
      const put = (idemKey, result, type = 'stock.receipt', typeVersion = '1') => submitCommand({
        store: w.store, clock: w.clock, idemKey, actor: 'sub_dolgozo', bookId: 'book_a',
        type, typeVersion, declared: { sku: 'X' }, resolve: () => result,
        credentials: { dataScope: 'keszlet' },
      });
      const read = (idemKey, credentials, requester = 'sub_dolgozo') => readCommandResult({
        store: w.store, clock: w.clock, idemKey, requester, bookId: 'book_a', actor: 'sub_dolgozo', credentials,
      });
      const banScope = (subjectId, scope) => w.store.run(
        `INSERT INTO subject_ban (subject_id, kind, cause, target_ref, actor_subject_id, banned_at)
         VALUES (?,?,?,?,?,?)`,
        subjectId, 'data_scope', 'data_scope_withdrawn', scope, 'sub_adjudicator', w.clock.now());

      // (a) POZITÍV KONTROLL — tiltás NÉLKÜL a vegyes eredmény TELJESEN kijön. Enélkül a többi ág
      //     egy „soha semmit nem adok ki" alakkal is teljesülne (KUKA-092 · KUKA-049).
      const mixed = { qty: '1.000', unit_price: 12345 };
      const okPut = put('r-mixed', mixed).ok === true;
      const free = read('r-mixed', { dataScope: 'keszlet' });
      const aOk = okPut && free.ok === true && free.result.qty === '1.000' && free.result.unit_price === 12345;

      // (b) A LELET MAGA: az `arak`-ra tiltott olvasónak MÁSIK kontextus-címkével SEM jön ki az
      //     ármező — se egészben, se részlegesen (a vegyes eredmény alapból egészben tagadva).
      banScope('sub_dolgozo', 'arak');
      const asArak = read('r-mixed', { dataScope: 'arak' });
      const asKeszlet = read('r-mixed', { dataScope: 'keszlet' });
      const noLabel = read('r-mixed', undefined);   // címke NÉLKÜL is — a hiány nem nyithat (REV-N5b)
      const leaked = [asArak, asKeszlet, noLabel].filter((r) => r.ok === true
        && Object.prototype.hasOwnProperty.call(r.result || {}, 'unit_price'));
      const bOk = leaked.length === 0 && asKeszlet.ok === false;

      // (c) A NEMLEGES VÁLASZ NEM SZIVÁROG: bájtra ugyanaz, mint a nem létező kulcsé (KUKA-084) —
      //     különben a válasz maga mondaná meg, hogy a parancs létezik.
      const ghost = read('r-nincs-ilyen', { dataScope: 'keszlet' });
      const cOk = JSON.stringify(asKeszlet) === JSON.stringify(ghost);

      // (d) A TISZTÁN KÉSZLET-ADAT UGYANANNAK AZ OLVASÓNAK KIJÖN. Ez az ELLENPÁR: az `arak` tiltás
      //     nem válhat általános zárrá — a „11 darabot láthatja" követelmény fele.
      const okQty = put('r-qty', { qty: '11.000' }).ok === true;
      const qtyRead = read('r-qty', { dataScope: 'keszlet' });
      const dOk = okQty && qtyRead.ok === true && qtyRead.result.qty === '11.000';

      // (e) A HIÁNYZÓ/ISMERETLEN BESOROLÁS KÜLÖN VÁLASZ, ÉS ZÁR (KUKA-124/2). A BEADÁS nevezett
      //     mondatot ad (a saját bemenetéről van szó), a KIADÁS néma marad — a két hely két külön
      //     kérdésre felel. Az ismeretlen TÍPUS és a be nem sorolt MEZŐ is külön nevet kap.
      const unknownType = put('r-ismeretlen-tipus', { qty: '1.000' }, 'invoice.issue', '1');
      const unknownField = put('r-ismeretlen-mezo', { qty: '1.000', margin_pct: 17 });
      const eOk = unknownType.ok === false && unknownType.error === 'result_scope_undeclared'
        && unknownType.reason === 'result_scope_type_undeclared'
        && unknownField.ok === false && unknownField.reason === 'result_scope_field_undeclared'
        && unknownField.message.includes('margin_pct')
        // …és a hatás SEM jött létre: olvashatatlan sort nem könyvelünk (KUKA-012).
        && w.store.all("SELECT * FROM command WHERE idem_key IN ('r-ismeretlen-tipus','r-ismeretlen-mezo')").length === 0;

      // (f) A FELOLDÓT A PRÓBA HÍVJA, nem a forrás szövegét olvassa (KUKA-009), és a zárt halmaz
      //     MINDKÉT iránya mérve: a besorolás a deklarált adatkörök közül kerül ki.
      const cls = resultScopesOf({ type: 'stock.receipt', typeVersion: '1', result: mixed });
      const fOk = cls.ok === true && JSON.stringify(cls.scopes) === JSON.stringify(['arak', 'keszlet'])
        && cls.scopes.every((s) => KNOWN_DATA_SCOPES.includes(s))
        && resultScopesOf({ type: 'stock.receipt', typeVersion: '2', result: mixed }).ok === false;

      const pass = aOk && bOk && cOk && dOk && eOk && fOk;
      return {
        expected: 'az ármező NEM adható ki az árra tiltott olvasónak pusztán másik kontextus-címkével · '
          + 'a tiltás nélküli olvasó MINDENT megkap (pozitív kontroll) · a tisztán készlet-adat a tiltott '
          + 'olvasónak is kijön (ellenpár) · a nemleges válasz bájtra azonos a nem létezőével · a hiányzó '
          + 'besorolás NEVEZETT, fail-closed válasz a beadáskor, és a hatás sem jön létre',
        actual: `pozitív kontroll=${aOk} · ár-szivárgás=${leaked.length} eset · vegyes megtagadva=${bOk} · `
          + `nemleges bájtra azonos=${cOk} · készlet-adat kijön=${dOk} · besorolás-hiány zár=${eOk} · `
          + `feloldó HÍVVA (adatkörök=${cls.ok ? cls.scopes.join('+') : cls.reason})=${fOk}`,
        pass,
        asserts: {
          'A-ORG-N1b-result-scope-comes-from-declaration': aOk && bOk && dOk && fOk,
          'A-ORG-N1b-undeclared-result-scope-is-fail-closed': eOk && cOk,
          // R35 — A VEGYES EREDMÉNY SORSA KÜLÖN ÁLLÍTÁS (K05-DSC-c). Nem új mérés: az `aOk` és a
          // `bOk` eddig is futott — csak nem volt SAJÁT neve, ezért nem lehetett önállóan klauzulához
          // kötni. Egy állítás nem fedhet két klauzulát (a bizonyíték-csomag akkor kétértelmű), és a
          // két klauzula MÁST mond: az egyik a besorolás FORRÁSÁRÓL, ez a VEGYES eredmény sorsáról.
          'A-ORG-N1b-mixed-result-is-refused-as-a-whole': aOk && bOk,
        },
      };
    } finally { w.store.close(); }
  });

// ════════════════════════════════════════════════════════════════════════════════════════════════
// R79 — A KÜLSŐ TÁRGYALÓ FÉL HÁROM ÚJ HATÁRA. Mindegyik SAJÁT próbát és SAJÁT falszifikálót kap,
// UGYANEBBEN a körben — a javítás akkor kész, ha a HIÁNYA bizonyítottan pirosra vált (KUKA-092).
// ════════════════════════════════════════════════════════════════════════════════════════════════

probe('P-REV-result-shape', 'R79/F01 · REV-N5b · K05 · K09 · K15 · KUKA-002 · KUKA-038 · KUKA-051',
  'A RÉSZFA IS DEKLARÁLT: a beágyazott ármező nem bújhat el egy készlet-címkéjű mező alatt',
  () => {
    // A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL, R79/F01). Az R77-es javításom LAPOS mezőnév-listát
    // deklarált, és a besorolás a GYÖKÉR mezőneveit nézte. Ezért a `{lines:[{qty, unit_price}]}`
    // eredményben a `lines` mező a SAJÁT címkéjét (`keszlet`) adta az EGÉSZ részfának — az ár
    // benne utazott, és kiment az `arak`-ra tiltott olvasónak. Ugyanez a `{qty: {unit_price: …}}`
    // alakra: a `qty` neve „mennyiség", a tartalma bármi lehetett.
    //
    // A JAVÍTÁS (DSC-01 v2): a deklaráció SÉMA, nem névsor — a levelek hordozzák a típust ÉS az
    // adatkört, és a besorolás a VALIDÁLT alakból gyűlik, mélységben. A mérce nem a mezőnév:
    // ugyanaz a név egy másik típus más pozícióján mást jelenthet (KUKA-002).
    const w = buildTwoBookWorld();
    try {
      const put = (idemKey, result, type = 'stock.receipt', typeVersion = '1') => submitCommand({
        store: w.store, clock: w.clock, idemKey, actor: 'sub_dolgozo', bookId: 'book_a',
        type, typeVersion, declared: { sku: `X-${idemKey}` }, resolve: () => result,
        credentials: { dataScope: 'keszlet' },
      });
      const read = (idemKey, dataScope) => readCommandResult({
        store: w.store, clock: w.clock, idemKey, requester: 'sub_dolgozo', bookId: 'book_a',
        actor: 'sub_dolgozo', credentials: { dataScope },
      });

      // (a) A BESOROLÁS MÉLYSÉGBEN GYŰLIK — a feloldót a próba HÍVJA (KUKA-009), és MINDKÉT irányt
      //     méri: a beágyazott ár BEHOZZA az `arak` kört, a beágyazott készlet-adat NEM.
      const sc = (result) => resultScopesOf({ type: 'stock.receipt', typeVersion: '1', result });
      const deepMixed = sc({ lines: [{ qty: '1.000', unit_price: 990 }] });
      const deepClean = sc({ lines: [{ qty: '1.000', sku: 'A' }] });
      const flatClean = sc({ qty: '1.000' });
      const aOk = deepMixed.ok === true && JSON.stringify(deepMixed.scopes) === JSON.stringify(['arak', 'keszlet'])
        && deepClean.ok === true && JSON.stringify(deepClean.scopes) === JSON.stringify(['keszlet'])
        && flatClean.ok === true && JSON.stringify(flatClean.scopes) === JSON.stringify(['keszlet']);

      // (b) A LELET MAGA, VÉGIG A TERMÉK-ÚTON: az `arak`-ra tiltott olvasónak a BEÁGYAZOTT ár sem
      //     jön ki — se egészben, se a részfában. A tiltás ELŐTT viszont kijön (pozitív kontroll,
      //     KUKA-092): különben egy „soha semmit nem adok ki" alak is teljesítené ezt az ágat.
      const okDeep = put('r-deep', { lines: [{ qty: '1.000', unit_price: 990 }] }).ok === true;
      const beforeBan = read('r-deep', 'keszlet');
      const controlOk = okDeep && beforeBan.ok === true
        && beforeBan.result.lines[0].unit_price === 990;

      w.store.run(
        `INSERT INTO subject_ban (subject_id, kind, cause, target_ref, actor_subject_id, banned_at)
         VALUES (?,?,?,?,?,?)`,
        'sub_dolgozo', 'data_scope', 'data_scope_withdrawn', 'arak', 'sub_adjudicator', w.clock.now());

      const afterKeszlet = read('r-deep', 'keszlet');
      const afterArak = read('r-deep', 'arak');
      const leakedDeep = [afterKeszlet, afterArak].filter((r) => r.ok === true
        && JSON.stringify(r.result || {}).includes('unit_price'));
      const bOk = controlOk && leakedDeep.length === 0 && afterKeszlet.ok === false;

      // (c) ELLENPÁR: a TISZTÁN készlet-adatú részfa UGYANANNAK az olvasónak KIJÖN. A mélységi
      //     szigor nem válhat általános zárrá (KUKA-049: az őr ne a kért eredményt jelentse hibának).
      const okClean = put('r-clean', { lines: [{ qty: '7.000', sku: 'A' }] }).ok === true;
      const cleanRead = read('r-clean', 'keszlet');
      const cOk = okClean && cleanRead.ok === true && cleanRead.result.lines[0].qty === '7.000'
        && cleanRead.result.lines[0].sku === 'A';

      // (d) A TÍPUS IS A SÉMÁBÓL DŐL EL, NEM A NÉVBŐL. Az objektumba csomagolt ár a `qty` helyén
      //     NEVEZETT alak-hibát kap, az ÚTJÁVAL együtt — és a hatás LÉTRE SEM JÖN (KUKA-012).
      const wrapped = put('r-becsomagolt', { qty: { unit_price: 990 } });
      // …és a MENNYISÉG SAJÁT FAJTA: JSON-számként NEM adható ki (MNY-01 · a saját leletem). A
      // lebegőpontos alak a 0,1-et sem ábrázolja pontosan, tehát a kiadott szám már nem az, amit
      // könyveltünk; a nem kanonikus szöveg ugyanígy zár, a kanonikus viszont ÁTMEGY (ELLENPÁR,
      // KUKA-049 — az őr, ami mindent pirosra visz, ugyanolyan haszontalan, mint ami mindent átenged).
      // …és UGYANEZ a SZÁM-levélre: az ármezőbe csomagolt objektum sem mennyiség. Ez KÜLÖN eset,
      // mert a `qty` mostantól DECIMÁLIS levél — a `number` levél típus-őre tehát MÁSIK mezőn él, és
      // ha csak a `qty`-t mérnénk, a szám-levél védelme ŐRIZETLENÜL maradna (KUKA-051: a hatókör
      // szabály, nem az a mező, amin először láttuk). MÉRVE: e nélkül az M90 mutáció TÚLÉLT.
      const wrappedPrice = put('r-becsomagolt-ar', { unit_price: { qty: 1 } });
      const numericQty = put('r-szam-mennyiseg', { qty: 1 });
      const looseQty = put('r-laza-mennyiseg', { qty: '1.0' });
      const canonQty = put('r-kanonikus-mennyiseg', { qty: '1.000' });
      const dOk = wrapped.ok === false && wrapped.reason === 'result_shape_type_mismatch'
        && wrapped.message.includes('"qty"')
        && w.store.all("SELECT * FROM command WHERE idem_key = 'r-becsomagolt'").length === 0
        && wrappedPrice.ok === false && wrappedPrice.reason === 'result_shape_type_mismatch'
        && wrappedPrice.message.includes('"unit_price"')
        && numericQty.ok === false && numericQty.reason === 'result_shape_type_mismatch'
        && looseQty.ok === false && looseQty.reason === 'result_shape_type_mismatch'
        && canonQty.ok === true;

      // (e) A BE NEM SOROLT MEZŐ A RÉSZFÁBAN IS NEVEZETT — és az ÚTJÁT is megmondja, különben a
      //     beadó nem tudja, MIT javítson (KUKA-064). Az ismeretlen TÍPUS külön válasz (KUKA-124/2).
      const deepUnknown = put('r-melyen-ismeretlen', { lines: [{ qty: '1.000', titok: 'x' }] });
      const unknownType = put('r-ismeretlen-tipus', { qty: '1.000' }, 'invoice.issue', '1');
      const eOk = deepUnknown.ok === false && deepUnknown.reason === 'result_scope_field_undeclared'
        && deepUnknown.message.includes('lines[0].titok')
        && unknownType.ok === false && unknownType.reason === 'result_scope_type_undeclared'
        && w.store.all("SELECT * FROM command WHERE idem_key IN ('r-melyen-ismeretlen','r-ismeretlen-tipus')").length === 0;

      // (f) A TÖMB ELEMEI KÜLÖN-KÜLÖN SZÁMÍTANAK: ha a MÁSODIK sorban áll az ár, az is behozza az
      //     `arak` kört. Az első elem alapján ítélő rövidzár pontosan itt bukna el.
      const secondLine = sc({ lines: [{ qty: '1.000' }, { qty: '2.000', unit_price: 5 }] });
      const fOk = secondLine.ok === true
        && JSON.stringify(secondLine.scopes) === JSON.stringify(['arak', 'keszlet']);

      const pass = aOk && bOk && cOk && dOk && eOk && fOk;
      return {
        expected: 'a besorolás a VALIDÁLT alakból, MÉLYSÉGBEN gyűlik · a beágyazott ármező nem jut ki '
          + 'az árra tiltott olvasónak (tiltás előtt viszont igen — pozitív kontroll) · a tisztán '
          + 'készlet-adatú részfa KIJÖN (ellenpár) · a levél TÍPUSA is deklarált · a be nem sorolt '
          + 'mező az ÚTJÁVAL nevezve zár, és a hatás sem jön létre · a tömb MINDEN eleme számít',
        actual: `mélységi besorolás=${aOk} · mély ár-szivárgás=${leakedDeep.length} eset · pozitív kontroll=${controlOk} · `
          + `tiszta részfa kijön=${cOk} · levél-típus=${dOk} · nevezett hiány+út=${eOk} · második elem=${fOk}`,
        pass,
        asserts: {
          'A-ORG-N1b-nested-result-scope-is-measured': aOk && bOk && fOk,
          'A-ORG-N1b-result-shape-is-declared-and-typed': cOk && dOk && eOk,
        },
      };
    } finally { w.store.close(); }
  });

probe('P-CMD-effectuation', 'R79/F02 · REV-N3a · K04 · K07 · KUKA-003 · KUKA-018 · KUKA-024 · KUKA-049',
  'A PARANCSÍRÁS IS A KÖZÖS HATÁLYOSULÁSI PONTON MEGY ÁT — egy óraolvasás a tagsági jogra is',
  () => {
    // A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL, R79/F02). Az R77-es EFF-01 a HATÁSKÖRI írókat
    // kötötte be; a parancs-író kimaradt, és HÁROM külön óraolvasáson állt (jog · `finalized_at` ·
    // nyugta). Mérve: a tagság 08:00:01-kor megszűnik, az első óraolvasás 08:00:00, a többi
    // 08:00:02 ⇒ a parancs `finalized` lett `finalized_at = 08:00:02` idővel, amely időpontra a
    // `rightAt` MÁR tiltja az eljárót. A hatás tehát olyan pillanatot visel, amin nem volt joga.
    //
    // A JAVÍTÁS: `effectuateWith` (a jog-feloldó INJEKTÁLVA, mert az `authority.mjs` nem húzhatja
    // be az `authz.mjs`-t — kör lenne). A `basis: 'membership'` KIMONDJA, hogy ez TAGSÁGI jog, nem
    // hatásköri: a két fajtát nem mossuk össze (KUKA-062 — a jog-alapot nevezni kell).
    //
    // A MÉRÉS ALAKJA — A SAJÁT ELSŐ PRÓBÁM HIBÁS VOLT, ÉS EZT KIMONDJUK (KUKA-049). Az első alakom
    // ÓRAOLVASÁS-SZÁMLÁLÓRA épült („az első olvasás T0, a többi T2"), csakhogy a parancs-úton a
    // hatályosulási pont ELŐTT MÉG KÉT tagsági kapu áll (a belépő és a feloldás utáni). Az
    // előrehaladó órán tehát MÁR AZOK elutasítottak, és a próba zöld volt anélkül, hogy a mért
    // mechanizmust (a hatályosulási pontot) egyáltalán elérte volna — a jel a tünetet mérte, nem a
    // mechanizmust. Ezért a mérés innentől a TRANZAKCIÓ HATÁRÁHOZ kötött: az óra a határ átlépéséig
    // T0-t ad, utána T2-t, tehát minden korábbi kapu ÁTENGED, és CSAK a hatályosuláson dőlhet el.
    const T0 = '2026-09-14T08:00:00.000Z';
    const CUT = '2026-09-14T08:00:01.000Z';
    const T2 = '2026-09-14T08:00:02.000Z';

    function bench(revokedAt) {
      const store = openStore();
      store.run('INSERT INTO subject VALUES (?,?)', 'sub_dolgozo', 'person');
      store.run('INSERT INTO book VALUES (?,?)', 'book_a', 'A könyv');
      store.run('INSERT INTO membership VALUES (?,?,?,?,?)', 'sub_dolgozo', 'book_a', 'user', T0, revokedAt);
      return store;
    }
    const still = (iso) => ({ now: () => iso });
    // A SZIGORÚAN ELŐREHALADÓ óra: MINDEN olvasás új értéket ad. Enélkül a „friss óraolvasás a
    // bélyeghez" alak EGYENÉRTÉKŰ a helyessel, és az egyenértékű mutáció túlélése semmit nem
    // bizonyít (KUKA-139 — a külső fél R77 §7 szűkítése, itt a parancs-oldalon alkalmazva).
    const ticking = () => { let n = 0; return { now: () => `2026-09-14T08:00:${String(n++).padStart(2, '0')}.000Z` }; };
    // A HATÁRHOZ KÖTÖTT óra: a `store.tx` ELSŐ átlépéséig T0, utána T2. Így a hatályosulási pont
    // ELŐTTI minden kapu átenged, és a döntés OTT dől el — pont azon a helyen, amiről a lelet szól.
    function boundaryClock(store) {
      let inside = false;
      const orig = store.tx.bind(store);
      store.tx = (fn) => { inside = true; return orig(fn); };
      return { now: () => (inside ? T2 : T0) };
    }
    const put = (store, clock, idemKey) => submitCommand({
      store, clock, idemKey, actor: 'sub_dolgozo', bookId: 'book_a',
      type: 'stock.receipt', typeVersion: '1', declared: { sku: 'X' }, resolve: () => ({ qty: '1.000' }),
      credentials: { dataScope: 'keszlet' },
    });

    const notes = [];

    // (a) POZITÍV KONTROLL — élő tagsággal a parancs véglegesül, NYUGTÁVAL, és a két sor UGYANAZT
    //     az időpontot viseli. Enélkül a „mindent elutasítok" alak is teljesítené a többi ágat
    //     (KUKA-092), a bélyeg-azonosságot pedig a ketyegő óra teszi mérhetővé.
    let aOk = false; let stampOk = false;
    {
      const s = bench(null);
      const r = put(s, ticking(), 'ok-1');
      const row = s.get("SELECT state, finalized_at FROM command WHERE idem_key = 'ok-1'");
      const ev = s.all("SELECT at FROM command_event WHERE idem_key = 'ok-1'");
      aOk = r.ok === true && row?.state === 'finalized' && ev.length === 1;
      stampOk = aOk && row.finalized_at === ev[0].at;
      if (!aOk) notes.push(`kontroll=${JSON.stringify(r)}`);
      if (aOk && !stampOk) notes.push(`bélyeg: hatás=${row.finalized_at} nyugta=${ev[0].at}`);
      s.close();
    }

    // (b) A LELET: a tagság a TRANZAKCIÓ HATÁRÁN szűnik meg. A hatályosulási pont ELŐTTI kapuk
    //     mind átengednek (az óra addig T0-t ad), tehát ha itt mégis születne sor, azt CSAK a
    //     hatályosulás hiánya okozhatná. A szerződés: elutasítás, NULLA sor, NULLA nyugta.
    let bOk = false; let reachedOk = false;
    {
      const s = bench(CUT);
      const clock = boundaryClock(s);
      const r = put(s, clock, 'hataron');
      // ELÉRTÜK-E EGYÁLTALÁN A MÉRT PONTOT? Ha az óra még mindig T0-t ad, a tranzakció meg sem
      // nyílt — akkor a próba egy MÁSIK kapu munkáját jelentené sajátjának (KUKA-049).
      reachedOk = clock.now() === T2;
      const rows = s.all("SELECT * FROM command WHERE idem_key = 'hataron'");
      const evs = s.all("SELECT * FROM command_event WHERE idem_key = 'hataron'");
      bOk = reachedOk && r.ok === false && rows.length === 0 && evs.length === 0;
      if (!bOk) notes.push(`határ=${JSON.stringify(r)} elért=${reachedOk} sorok=${rows.length} nyugták=${evs.length}`);
      s.close();
    }

    // (c) A VISSZAMÉRT INVARIÁNS (a P-REV-effectuation mintája a parancs-oldalon): minden RÖGZÜLT
    //     parancsra igaz, hogy a SAJÁT `finalized_at` bélyegén a tagsági jog fennállt. Ezt a
    //     TÁROLÓBÓL mérjük vissza, ugyanazzal a feloldóval, amit a döntés használ (KUKA-038) —
    //     nem a visszatérési értékből.
    let cOk = false;
    {
      const s = bench(CUT);
      put(s, boundaryClock(s), 'vissza');
      const rows = s.all('SELECT idem_key, finalized_at FROM command');
      cOk = rows.every((row) => rightAt({ store: s, subjectId: 'sub_dolgozo', bookId: 'book_a',
        opClass: 'own_book', nowIso: row.finalized_at }).allowed === true);
      if (!cOk) notes.push(`visszamérve=${rows.map((r) => `${r.idem_key}@${r.finalized_at}`).join(',')}`);
      s.close();
    }

    // (d) AZ ELUTASÍTÁS SEMLEGES: a hatályosulási szakasz nem szivároghat ki. A HATÁRON elbukó kérő
    //     válasza BÁJTRA ugyanaz, mint azé, akinek már a hívás pillanatában sincs joga — a szakasz
    //     maga is csatorna lenne (KUKA-084: a kijárat nem HELY, hanem CSATORNA).
    let dOk = false;
    {
      const s1 = bench(T0);                       // már a belépő kapun elbukik
      const s2 = bench(CUT);                      // a tranzakció határán bukik el
      const r1 = put(s1, still(T2), 'n-1');
      const r2 = put(s2, boundaryClock(s2), 'n-2');
      dOk = JSON.stringify(r1) === JSON.stringify(r2) && r1.ok === false;
      if (!dOk) notes.push(`semleges: belépő=${JSON.stringify(r1)} vs határ=${JSON.stringify(r2)}`);
      s1.close(); s2.close();
    }

    // (e) EGY AJTÓ (KUKA-003 · KUKA-018): a hatályosulás a TÁROLÓ SAJÁT kapuján megy át (`store.tx`).
    //     Ez a SAJÁT SÖPRÉSEM lelete ebben a körben — az R77-es alakom a `withTransaction`-t hívta
    //     közvetlenül, és amint a parancs-írót is odakötöttem, a tranzakció-határt mérő próba
    //     ELVESZTETTE a mérési pontját: nem a kód romlott el, hanem a MÉRÉS VAKULT MEG. A (b) és a
    //     (d) ág ezért is a tároló kapujára épül: ha a határ kikerülne alóla, azok az ágak dőlnek.
    let eOk = false;
    {
      const s = bench(null);
      const orig = s.tx.bind(s);
      let seen = 0;
      s.tx = (fn) => { seen += 1; return orig(fn); };
      const r = put(s, still(T0), 'ajto');
      eOk = r.ok === true && seen >= 1;
      if (!eOk) notes.push(`ajtó: siker=${r.ok} store.tx-hívások=${seen}`);
      s.close();
    }

    const pass = aOk && stampOk && bOk && cOk && dOk && eOk;
    return {
      expected: 'élő tagsággal a parancs véglegesül, és a nyugta IDEJE azonos a hatáséval · a '
        + 'TRANZAKCIÓ HATÁRÁN megszűnt tagság mellett NEM születik sem parancs-sor, sem nyugta (és a '
        + 'mérés eléri a hatályosulási pontot) · minden rögzült parancs SAJÁT `finalized_at` bélyegén '
        + 'a tagsági jog fennállt · az elutasítás bájtra ugyanaz a belépő és a határon elbukó kérőnek · '
        + 'és a határ a TÁROLÓ kapuján megy át',
      actual: `kontroll=${aOk} · bélyeg-azonosság=${stampOk} · határon zár=${bOk} (mért pont elérve=${reachedOk}) · `
        + `visszamérve=${cOk} · semleges elutasítás=${dOk} · egy ajtó (store.tx)=${eOk}`
        + (notes.length ? ` · eltérések: ${notes.join(' | ')}` : ''),
      pass,
      asserts: {
        'A-REV-N3a-command-effect-time-is-the-decision-time': aOk && stampOk && bOk && cOk,
        'A-REV-N3a-command-refusal-is-neutral-and-inert': dOk && eOk,
      },
    };
  });

probe('P-CMD-release-effectuation', 'R81/F04 · REV-N3a · K05 · K07 · KUKA-002 · KUKA-024 · KUKA-124',
  'AZ ADATKIADÁS IS EGY HATÁLYOSULÁSI PONTON — a jog, az adatkör és a leltár-sor UGYANAZON az órán',
  () => {
    // A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL, R81/F04). Az R79-ben a PARANCSÍRÁST kötöttük
    // egyetlen hatályosulási ponthoz, az ADATKIADÁST nem: a `readCommandResult` úton a jelölt-szűrés,
    // a bebocsátás, a tranzakción belüli jog-kapu, az ADATKÖR-kapu és a leltár-sor MIND külön
    // `clock.now()`-t olvasott. Az ő mérésük: a tagság 08:00:01-kor megszűnik, az első három olvasás
    // 08:00:00, a negyedik 08:00:02 ⇒ az eredmény KIMEGY, a leltár-sor pedig `08:00:02`-t visel,
    // olyan időpontot, amelyen a `rightAt` MÁR MEGTAGADNÁ a jogot. A kiadott adatot nem lehet
    // visszavenni (KUKA-085), tehát ez nem könyvelési szépséghiba.
    //
    // A JAVÍTÁS ugyanaz a szerkezet, mint az írás-oldalon: `effectuateWith` `basis: 'membership'`
    // alappal, és a tranzakción belül olvasott `at` vezetve végig a HÁROM fogyasztón — tagság+tiltás
    // (`decide`) · az eredmény ADATKÖRE (`resultReleasable`) · a KIADÁSI LELTÁR sora (`disclose`).
    // Nem új ellenőrzés született, hanem a meglévő időpont ment végig (KUKA-124: amit egy korábbi
    // kapu eldöntött, azt nem mérjük újra egy MÁSIK órán).
    const T0 = '2026-09-14T08:00:00.000Z';
    const CUT = '2026-09-14T08:00:01.000Z';
    const T2 = '2026-09-14T08:00:02.000Z';

    function bench(revokedAt) {
      const store = openStore();
      store.run('INSERT INTO subject VALUES (?,?)', 'sub_olvaso', 'person');
      store.run('INSERT INTO book VALUES (?,?)', 'book_a', 'A könyv');
      store.run('INSERT INTO membership VALUES (?,?,?,?,?)', 'sub_olvaso', 'book_a', 'user', T0, revokedAt);
      // R49/SGR-01 — VALÓDI adatköri jog T0-tól: a mérés tárgya a HATÁLYOSULÁSI PONT, nem a
      // hiányzó engedély. A kettőt külön kell tudni mérni (KUKA-039: a fél őr).
      giveReadScopes(store, { subjectId: 'sub_olvaso', bookId: 'book_a', at: T0 });
      // A parancs MINDIG élő tagsággal, T0-n születik: a mérés a KIADÁSRÓL szól, nem az írásról.
      submitCommand({
        store, clock: { now: () => T0 }, idemKey: 'k', actor: 'sub_olvaso', bookId: 'book_a',
        type: 'stock.receipt', typeVersion: '1', declared: { sku: 'X' }, resolve: () => ({ qty: '1.000' }),
        credentials: { dataScope: 'keszlet' },
      });
      return store;
    }
    const still = (iso) => ({ now: () => iso });
    const ticking = () => { let n = 0; return { now: () => `2026-09-14T08:00:${String(n++).padStart(2, '0')}.000Z` }; };
    // A HATÁRHOZ KÖTÖTT óra (a P-CMD-effectuation mintája): a `store.tx` ELSŐ átlépéséig T0, utána
    // T2. Minden korábbi kapu ÁTENGED, tehát ami elbukik, az CSAK a hatályosuláson bukhat el —
    // különben a próba egy MÁSIK kapu munkáját jelentené sajátjának (KUKA-049 · KUKA-149).
    function boundaryClock(store) {
      let inside = false;
      const orig = store.tx.bind(store);
      store.tx = (fn) => { inside = true; return orig(fn); };
      return { now: () => (inside ? T2 : T0) };
    }
    const read = (store, clock) => readCommandResult({
      store, clock, idemKey: 'k', requester: 'sub_olvaso', credentials: { dataScope: 'keszlet' },
    });
    const discl = (s) => s.all("SELECT * FROM disclosure WHERE view = 'command_result'");
    // A KIADÁS TAGSÁGI/TILTÁS-KAPUJA KÜLÖN MÉRVE — hogy el tudjuk dönteni, ELÉRTÜK-E az adatkör-kaput.
    const releaseAllowedProbe = (s, nowIso) => rightAt({
      store: s, subjectId: 'sub_olvaso', bookId: 'book_a', opClass: 'own_book', nowIso,
      credentials: { dataScope: 'keszlet' },
    }).allowed;

    const notes = [];

    // (a) POZITÍV KONTROLL — élő tagsággal az eredmény kimegy, EGY leltár-sorral. A KETYEGŐ óra
    //     teszi mérhetővé a lényeget: a sor IDEJE az az időpont, amin a jog is állt (nem egy
    //     későbbi „friss" olvasás). KUKA-122: a kapunak teljesíthetőnek is kell lennie.
    let aOk = false; let stampOk = false;
    {
      const s = bench(null);
      const before = ticking();
      const r = read(s, before);
      const rows = discl(s);
      aOk = r.ok === true && rows.length === 1;
      // A bélyeg NEM az utolsó óraolvasás: a kiadás UTÁN következő olvasás már későbbi értéket ad.
      stampOk = aOk && rows[0].at !== before.now();
      if (!aOk) notes.push(`kontroll=${JSON.stringify(r)} sorok=${rows.length}`);
      if (aOk && !stampOk) notes.push(`bélyeg: leltár=${rows[0].at}`);
      s.close();
    }

    // (b) A LELET: a tagság a TRANZAKCIÓ HATÁRÁN szűnik meg. A szerződés: elutasítás, és NULLA
    //     leltár-sor — a régi alakban itt EGY sor született, `08:00:02` idővel.
    let bOk = false; let reachedOk = false;
    {
      const s = bench(CUT);
      const clock = boundaryClock(s);
      const r = read(s, clock);
      reachedOk = clock.now() === T2;   // elértük-e egyáltalán a mért pontot?
      const rows = discl(s);
      bOk = reachedOk && r.ok === false && rows.length === 0;
      if (!bOk) notes.push(`határ=${JSON.stringify(r)} elért=${reachedOk} sorok=${rows.length}`);
      s.close();
    }

    // (c) A VISSZAMÉRT INVARIÁNS: MINDEN kiadási leltár-sorra igaz, hogy a SAJÁT bélyegén a
    //     címzettnek volt joga. A tárolóból mérve, ugyanazzal a feloldóval, amit a döntés használ
    //     (KUKA-038: a létezés nem bizonyíték — a lánc VÉGÉT mérjük).
    let cOk = false;
    {
      const s = bench(CUT);
      read(s, boundaryClock(s));
      const s2 = bench(null);
      read(s2, ticking());
      cOk = [s, s2].every((st) => discl(st).every((row) => rightAt({
        store: st, subjectId: row.recipient, bookId: row.scope, opClass: 'own_book', nowIso: row.at,
      }).allowed === true));
      if (!cOk) notes.push(`visszamérve=${[s, s2].flatMap((st) => discl(st).map((r) => `${r.recipient}@${r.at}`)).join(',')}`);
      s.close(); s2.close();
    }

    // (d) AZ ELUTASÍTÁS SEMLEGES (KUKA-084): a határon elbukó kérő válasza BÁJTRA ugyanaz, mint
    //     azé, akinek már a hívás pillanatában sincs joga. A szakasz maga is csatorna lenne.
    let dOk = false;
    {
      const s1 = bench(T0);
      const s2 = bench(CUT);
      const r1 = read(s1, still(T2));
      const r2 = read(s2, boundaryClock(s2));
      dOk = JSON.stringify(r1) === JSON.stringify(r2) && r1.ok === false;
      if (!dOk) notes.push(`semleges: belépő=${JSON.stringify(r1)} vs határ=${JSON.stringify(r2)}`);
      s1.close(); s2.close();
    }

    // (e) AZ ADATKÖR-KAPU IS AZON AZ `at`-on ÁLL. Egy adatkör-tiltás, ami PONT a tranzakció határán
    //     válik hatályossá: a korábbi kapuk átengednek (T0), a kiadás mégsem mehet ki, mert a
    //     `resultReleasable` a hatályosuláskori `at`-ot kapja. A régi alakban ez a kapu SAJÁT,
    //     KÉSŐBBI `clock.now()`-t olvasott — vagyis épp fordítva is elcsúszhatott.
    // (e) AZ ADATKÖR-ELUTASÍTÁS IS BÁJTRA UGYANAZ (KUKA-084 · DSC-01): a „nincs jogod EHHEZ AZ
    //     ADATKÖRHÖZ" nem különböztethető meg a „nincs ilyen eredmény"-től. Ha megszólalna, a válasz
    //     maga mondaná meg, hogy a parancs LÉTEZIK — csak épp az ára nem jár.
    //
    //     A MÉRÉSI PONT KIMONDVA (a SAJÁT első alakom hibája — KUKA-149). Először KÉSZLET-adatkörre
    //     szóló tiltással mértem, csakhogy a kérő KONTEXTUSA is `keszlet`: azt a tiltást MÁR a
    //     tagsági/tiltás-kapu (`decide`) elkapja, tehát a próba egy KORÁBBI kapu munkáját jelentette
    //     volna sajátjának, és az adatkör-kaput soha nem érte el. Ezért itt a tiltás az ÁR
    //     adatkörére szól, a kérés pedig KÉSZLET-címkével jön: a `decide` átenged (más tengely), és
    //     a kiadást KIZÁRÓLAG a TARTALOM adatköre állíthatja meg.
    let eOk = false; let eReached = false;
    {
      const s = openStore();
      s.run('INSERT INTO subject VALUES (?,?)', 'sub_olvaso', 'person');
      s.run('INSERT INTO book VALUES (?,?)', 'book_a', 'A könyv');
      s.run('INSERT INTO membership VALUES (?,?,?,?,NULL)', 'sub_olvaso', 'book_a', 'user', T0);
      submitCommand({
        store: s, clock: still(T0), idemKey: 'k', actor: 'sub_olvaso', bookId: 'book_a',
        type: 'stock.receipt', typeVersion: '1', declared: { sku: 'X' },
        resolve: () => ({ lines: [{ qty: '1.000', unit_price: 5 }] }), credentials: { dataScope: 'keszlet' },
      });
      s.run('INSERT INTO subject_ban(subject_id,kind,cause,target_ref,actor_subject_id,banned_at) VALUES(?,?,?,?,?,?)',
        'sub_olvaso', 'data_scope', 'data_scope_withdrawn', 'arak', 'sub_olvaso', T0);
      // ELÉRJÜK-E A MÉRT KAPUT? A tagsági/tiltás-kapu ugyanezen a kéréshez ENGEDJEN — ha nem, a
      // próba nem az adatkör-kaput mérné (KUKA-149).
      eReached = releaseAllowedProbe(s, T0);
      const r = read(s, still(T0));
      const empty = bench(null);
      const nothing = readCommandResult({
        store: empty, clock: still(T0), idemKey: 'nincs-ilyen', requester: 'sub_olvaso',
        credentials: { dataScope: 'keszlet' },
      });
      eOk = eReached && r.ok === false && discl(s).length === 0 && JSON.stringify(r) === JSON.stringify(nothing);
      if (!eOk) notes.push(`adatkör: elért=${eReached} ${JSON.stringify(r)} vs nem létező: ${JSON.stringify(nothing)} sorok=${discl(s).length}`);
      s.close(); empty.close();
    }

    // ── (f)–(g) A DÖNTÉSI PILLANAT VÉGIGVEZETÉSE — KÜLÖN-KÜLÖN MÉRVE ────────────────────────────
    //
    // MIÉRT KELL EZ A KÉT ÁG. A (b)/(e) ág a HATÁRHOZ kötött órát használja, ahol a határ után
    // MINDEN olvasás T2 — ott a „végigvezetett `at`" és a „mindenki olvassa a saját óráját" alak
    // UGYANAZT adja, tehát a különbséget nem méri (KUKA-139: az egyenértékű mutáció túlélése semmit
    // nem bizonyít). Ezért itt egy LÉPCSŐS óra áll: a határt átlépő olvasás MÉG T0, minden későbbi
    // MÁR T2. Így a helyes alak (egy `at` = T0 végig) ENGED, a visszacsúszott alak (ki-ki a saját,
    // KÉSŐBBI óraolvasásán) ZÁR vagy rossz bélyeget ír — a két alak elválik.
    function stagedClock(store) {
      let crossed = false; let after = 0;
      const orig = store.tx.bind(store);
      store.tx = (fn) => { crossed = true; return orig(fn); };
      return { now: () => (!crossed ? T0 : (after++ === 0 ? T0 : T2)) };
    }

    // (f) ADATKÖR-TILTÁS, AMI CSAK KÉSŐBB VÁLIK HATÁLYOSSÁ. A döntési pillanat T0 — akkor még nincs
    //     tiltás —, tehát az eredménynek KI KELL MENNIE. Ha az adatkör-kapu SAJÁT, későbbi órát
    //     olvasna (a régi alak), itt tévesen zárna: a kérő jogos kiadást veszítene el.
    let fOk = false;
    {
      const s = bench(null);
      s.run('INSERT INTO subject_ban(subject_id,kind,cause,target_ref,actor_subject_id,banned_at) VALUES(?,?,?,?,?,?)',
        'sub_olvaso', 'data_scope', 'data_scope_withdrawn', 'keszlet', 'sub_olvaso', CUT);
      const r = read(s, stagedClock(s));
      const rows = discl(s);
      fOk = r.ok === true && rows.length === 1 && rows[0].at === T0;
      if (!fOk) notes.push(`lépcsős/adatkör: ${JSON.stringify(r)} sorok=${rows.length} bélyeg=${rows[0]?.at}`);
      s.close();
    }

    // (g) A TAGSÁG CSAK KÉSŐBB SZŰNIK MEG. A döntés T0-n áll, tehát a kiadás jogos — ÉS a leltár-sor
    //     IS T0-t visel. Ha a leltár a SAJÁT, későbbi óráját olvasná (a külső fél R81/F04 alakja),
    //     a sor T2-t kapna: olyan időpontot, amelyen a `rightAt` már megtagadná a jogot.
    let gOk = false;
    {
      const s = bench(CUT);
      const r = read(s, stagedClock(s));
      const rows = discl(s);
      gOk = r.ok === true && rows.length === 1 && rows[0].at === T0
        && rightAt({ store: s, subjectId: 'sub_olvaso', bookId: 'book_a', opClass: 'own_book', nowIso: rows[0].at }).allowed === true;
      if (!gOk) notes.push(`lépcsős/tagság: ${JSON.stringify(r)} sorok=${rows.length} bélyeg=${rows[0]?.at}`);
      s.close();
    }

    const pass = aOk && stampOk && bOk && cOk && dOk && eOk && fOk && gOk;
    return {
      expected: 'élő tagsággal az eredmény kimegy EGY leltár-sorral, és a sor IDEJE a döntés '
        + 'időpontja (nem egy későbbi óraolvasás) · a TRANZAKCIÓ HATÁRÁN megszűnt tagság mellett NINCS '
        + 'kiadás és NINCS leltár-sor · minden leltár-sor SAJÁT bélyegén a címzettnek joga volt · az '
        + 'elutasítás bájtra ugyanaz · az ADATKÖR-kapu is a hatályosuláskori időponton áll · és LÉPCSŐS '
        + 'órán a döntési pillanat (T0) megy végig MINDHÁROM fogyasztón: a később hatályossá váló '
        + 'tiltás nem zárhat, a leltár-sor pedig T0-t visel, nem egy későbbi olvasást',
      actual: `kontroll=${aOk} · bélyeg=${stampOk} · határon zár=${bOk} (mért pont elérve=${reachedOk}) · `
        + `visszamérve=${cOk} · semleges elutasítás=${dOk} · adatkör ugyanazon az órán=${eOk} · `
        + `lépcsős/adatkör=${fOk} · lépcsős/tagság+bélyeg=${gOk}`
        + (notes.length ? ` · eltérések: ${notes.join(' | ')}` : ''),
      pass,
      asserts: {
        'A-REV-N3a-release-time-is-the-decision-time': aOk && stampOk && bOk && cOk && fOk && gOk,
        // K05-DSC-d HARMADIK FELE, SAJÁT NÉVEN (R37): a kiadás EGYETLEN hatályosulási ponton áll —
        // ez az a rész, amit a külső fél szerint a P-A08 önmagában NEM fed (hatályosulási verseny).
        'A-K05-DSC-d-release-stands-on-one-effectuation-point': aOk && stampOk && bOk && cOk && fOk && gOk,
        'A-REV-N3a-release-refusal-is-neutral-and-inert': dOk && eOk,
      },
    };
  });

probe('P-REV-entry-points', 'R79/F03 · REV-N5a · K09 · K15 · KUKA-039 · KUKA-051 · KUKA-084',
  'MINDEN ÍRÓ BELÉPÉSI PONT VIGYE A HITELES KONTEXTUST — belépési pont × tengely × mód, mérve',
  () => {
    // A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL, R79/F03). A `revokeMembership` nem fogadott
    // `credentials`-t, tehát a hitelesítő-alapú tiltás (`credential` fajta) ezen az ÍRÓ úton nem
    // hatott: a tiltott hitelesítővel belépő eljáró megvonhatott egy tagságot. A `revokeMembership`
    // AZ EGYETLEN olyan út volt, ami a hatáskör-ellenőrzést hívja, de a kontextust nem viszi át.
    //
    // AMI EBBŐL ÁLTALÁNOS (KUKA-051): a mérés hatóköre ne LISTA legyen, hanem SZABÁLY. Ezért az
    // ENT-01 regiszter minden ÍRÓ belépési pontot felsorol, és a próba MINDET végigméri, MINDEN
    // kontextus-tengelyen, HÁROM módban (egyező · másik · hiányzó). A tengelyeket a tiltás-fajták
    // ZÁRT halmazából SZÁRMAZTATJUK (`contextCarriedKinds`), nem kézzel gépeljük (KUKA-036).
    const m = measureEntryPointBinding();

    // (a) MINDEN CELLA A DEKLARÁLT VÁLASZT ADJA. A várt értéket a SOR mondja ki, nem a mérés
    //     eredménye (KUKA-054): `matching` ⇒ zárva · `other`/`absent` ⇒ nyitva, kivéve ahol az út
    //     SZÁNDÉKOSAN semleges (a bejelentés-út: R67/F02 — ott a válasz mindig ugyanaz).
    const aOk = m.mismatches.length === 0;

    // (b) A SEMLEGES ÚT VALÓBAN SEMLEGES — BÁJTRA. A `matching` és az `absent` válasz nem térhet
    //     el, különben maga a különbség hordozza a védett tényt (KUKA-084). Ezt MÉRJÜK, nem a
    //     hiányából következtetünk rá (KUKA-038).
    const bOk = m.neutral_leaks.length === 0;

    // (c) PADLÓ — a néma zsugorodás ellen (KUKA-045). Ha valaki kivesz egy belépési pontot a
    //     regiszterből, a mérés nem lesz „zöld, csak kevesebb": PIROS lesz.
    const cOk = m.entry_points >= ENT_FLOOR && m.axes === CONTEXT_AXES.length
      && m.rows.length === m.entry_points * m.axes * CONTEXT_MODES.length;

    // (d) A MÉRÉS ÉLES: van legalább egy ZÁRT és legalább egy NYITOTT cella. Csupa-zárt vagy
    //     csupa-nyitott mátrix mindent „teljesítene", és semmit nem bizonyítana (KUKA-092).
    const closed = m.rows.filter((r) => r.actual === 'blocked').length;
    const open = m.rows.filter((r) => r.actual === 'open').length;
    const dOk = closed > 0 && open > 0;

    // (e) A NEVEZETT UTAK MINDEGYIKÉN VAN ZÁRT CELLA. Ez a KUKA-039 „fél őr" ellenpróbája: nem
    //     elég, hogy ÖSSZESSÉGÉBEN van tiltás — a `revokeMembership` pont azért csúszott át, mert
    //     a TÖBBI út zárt volt, és a mátrix összesítve zöldnek látszott volna.
    const namedIds = [...new Set(m.rows.filter((r) => r.answer === 'named').map((r) => r.entry_point))];
    const missing = namedIds.filter((id) => !m.rows.some((r) => r.entry_point === id && r.actual === 'blocked'));
    const eOk = missing.length === 0 && namedIds.length === m.named_paths;

    const pass = aOk && bOk && cOk && dOk && eOk;
    return {
      expected: `mind a ${m.entry_points} ÍRÓ belépési pont × ${m.axes} kontextus-tengely × `
        + `${CONTEXT_MODES.length} mód cellája a DEKLARÁLT választ adja · a semleges utak válasza `
        + 'bájtra azonos egyező és hiányzó kontextusnál · a padló tartja a hatókört · és MINDEN '
        + 'nevezett úton van ténylegesen ZÁRT cella (nem csak összesítve)',
      actual: `cellák=${m.rows.length} (${m.entry_points}×${m.axes}×${CONTEXT_MODES.length}) · `
        + `eltérés=${m.mismatches.length}${m.mismatches.length ? ` [${m.mismatches.slice(0, 3).map((r) => `${r.entry_point}/${r.kind}/${r.mode}: várt ${r.expect}, mért ${r.actual}`).join(' | ')}]` : ''} · `
        + `semlegesség-szivárgás=${m.neutral_leaks.length} · zárt=${closed} · nyitott=${open} · `
        + `nevezett utak zárt cella nélkül=${missing.length ? missing.join(',') : 'nincs'}`,
      pass,
      asserts: {
        'A-REV-N5a-every-writer-entry-point-carries-context': aOk && cOk && dOk && eOk,
        'A-REV-N5a-neutral-entry-point-answers-are-indistinguishable': bOk,
      },
    };
  });

// ═══ REV-N2 — A KÉT IDŐ-TENGELY ÉS A FELÜLVIZSGÁLATI KÖR (BIT-01 · req-4) ══════════════════════
//
// AZ ÉLETHELYZET A NORMÁBÓL VAN ÁTVÉVE (`NEXT_REQUIRED_EVIDENCE.order`, R71-ben rögzítve, MIELŐTT
// egyetlen sor kód megszületett volna — KUKA-054): márciusban elfogadunk egy képviseleti alapot, a
// rá épülő művelet lefut; júniusban bizonyíték érkezik, hogy az alap MÁR MÁRCIUSBAN érvénytelen
// volt. A rendszernek KÉT kérdésre KÉT KÜLÖNBÖZŐ, egyaránt igaz választ kell adnia.

const BIT = Object.freeze({
  // A TAGSÁG KORÁBBAN KEZDŐDIK, MINT A HELYESBÍTÉS HATÁLYA — és ez nem kozmetika. A SAJÁT
  // BATTÉRIÁM lelete: az első alakban a tagság MÁRCIUSBAN kezdődött, ezért a „hatály ELŐTTI
  // művelet" (feb-0) LÉTRE SEM JÖHETETT — a `submitCommand` jogosan utasította el. Az ellenpár
  // így üres halmazon állt, és az M106 mutáció (az időablak-szűrő elvétele) TÚLÉLT: a szűrő
  // elvétele semmit nem változtatott. A kontroll, ami nem tud tüzelni, nem kontroll (KUKA-041).
  GRANT: '2026-01-15T09:00:00.000Z',        // a tagság kezdete — a hatály ELŐTTI művelet feltétele
  FEBRUARY: '2026-02-01T09:00:00.000Z',     // művelet a helyesbítés hatálya ELŐTT — NEM érintett
  MARCH: '2026-03-10T09:00:00.000Z',        // a képviseleti alap elfogadása + a művelet
  MARCH_LATER: '2026-03-20T09:00:00.000Z',  // „ahogy márciusban tudtuk" — a kérdezés napja
  JUNE: '2026-06-01T09:00:00.000Z',         // a bizonyíték megérkezése (a RÖGZÍTÉS ideje)
  AUGUST: '2026-08-01T09:00:00.000Z',       // egy JÖVŐBELI hatályú helyesbítés dátuma
});

/** A KÖZÖS VILÁG a két REV-N2 próbához: egy könyv, egy tag, egy eljáró, és MÁRCIUSI parancsok. */
function bitemporalWorld({ withCommands = true } = {}) {
  const store = openStore();
  const clock = clockFrom(BIT.MARCH);
  for (const s of ['judge', 'member', 'other']) store.run('INSERT INTO subject VALUES (?,?)', s, 'person');
  store.run('INSERT INTO book VALUES (?,?)', 'a', 'A könyv');
  store.run('INSERT INTO book VALUES (?,?)', 'b', 'B könyv');
  store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)', 'member', 'a', 'user', BIT.GRANT);
  store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)', 'other', 'a', 'user', BIT.GRANT);
  for (const op of ['suspend', 'alter_right', 'adjudicate']) {
    grantAdjudicationAuthority({ store, clock: clockFrom(BIT.GRANT), subjectId: 'judge', bookId: 'a', operation: op });
  }
  if (withCommands) {
    // A MŰVELETEK A TERMÉK ÚTJÁN SZÜLETNEK (nem kézi INSERT-tel): a kör tagsága így VALÓDI
    // parancs-sorokból számolódik, nem a próba által odakészített fixtúrából (R75/F03 fegyelme).
    const cmd = (idemKey, actor, at, bookId = 'a') => submitCommand({
      store, clock: clockFrom(at), idemKey, actor, bookId,
      type: 'stock.receipt', typeVersion: '1', declared: { sku: 'X', lines: [{ sku: 'X', qty: 1 }] },
      resolve: () => ({ price: 100 }),
    });
    cmd('mar-1', 'member', BIT.MARCH);        // az ablakon BELÜL
    cmd('mar-2', 'member', BIT.MARCH_LATER);  // az ablakon BELÜL
    cmd('feb-0', 'member', BIT.FEBRUARY);     // a hatály ELŐTT — nem érintett (az M106 kontrollja)
    cmd('mar-3', 'other', BIT.MARCH_LATER);   // MÁS alany — nem érintett
  }
  return { store, clock };
}

probe('P-REV-bitemporal', 'R83 §7 · REV-N2a · K08 · KUKA-002 · KUKA-018 · KUKA-126',
  'A KÉT IDŐ-TENGELY: „március, ahogy márciusban tudtuk" ⊥ „március, ahogy ma tudjuk"',
  () => {
    const w = bitemporalWorld({ withCommands: false });
    try {
      // (a) A MÚLT KÉPE MEGMARAD. A júniusi rögzítés UTÁN is igaz, hogy márciusban jogos volt.
      const before = membershipAsOf({ store: w.store, subjectId: 'member', bookId: 'a',
        validAt: BIT.MARCH_LATER, knownAt: BIT.MARCH_LATER });
      const rec = recordRetroactiveInvalidity({
        store: w.store, clock: clockFrom(BIT.JUNE), subjectId: 'member', bookId: 'a',
        actorSubjectId: 'judge', effectiveAt: BIT.MARCH, evidenceRef: 'doc:visszavont-meghatalmazas',
      });
      const asThen = membershipAsOf({ store: w.store, subjectId: 'member', bookId: 'a',
        validAt: BIT.MARCH_LATER, knownAt: BIT.MARCH_LATER });
      const aOk = before.effective === true && rec.ok === true && asThen.effective === true;

      // (b) A MAI KÉP A HELYESBÍTETT. Ugyanaz a nap, MAI tudással: már nem volt jogos.
      const asNow = membershipAsOf({ store: w.store, subjectId: 'member', bookId: 'a',
        validAt: BIT.MARCH_LATER, knownAt: BIT.JUNE });
      const bOk = asNow.effective === false && asNow.reason === 'membership_retroactively_invalid'
        && asNow.effective_at === BIT.MARCH && asNow.recorded_at === BIT.JUNE;

      // (c) ELLENPÁR — A JÖVŐBELI HATÁLYÚ HELYESBÍTÉS A MAI KÉPET NEM VÁLTOZTATJA MEG. Enélkül a
      //     szabály nem a két tengelyt mérné, hanem csak azt, hogy „van-e esemény" (KUKA-049).
      const w2 = bitemporalWorld({ withCommands: false });
      let cOk = false; let cRec = null;
      try {
        cRec = recordRetroactiveInvalidity({
          store: w2.store, clock: clockFrom(BIT.JUNE), subjectId: 'member', bookId: 'a',
          actorSubjectId: 'judge', effectiveAt: BIT.AUGUST, evidenceRef: 'doc:jovobeli',
        });
        const todayView = membershipAsOf({ store: w2.store, subjectId: 'member', bookId: 'a',
          validAt: BIT.JUNE, knownAt: BIT.JUNE });
        const laterView = membershipAsOf({ store: w2.store, subjectId: 'member', bookId: 'a',
          validAt: '2026-09-01T09:00:00.000Z', knownAt: '2026-09-01T09:00:00.000Z' });
        cOk = cRec.ok === true && todayView.effective === true && laterView.effective === false
          && cRec.review_circle_id === null;   // jövőbeli hatálynál nincs mit felülvizsgálni
      } finally { w2.store.close(); }

      // (d) A RÖGZÍTÉS JOGVÁLTOZTATÁS: hatáskör nélkül NEVEZETT elutasítás (fail-closed).
      const w3 = bitemporalWorld({ withCommands: false });
      let dOk = false;
      try {
        const noAuth = recordRetroactiveInvalidity({
          store: w3.store, clock: clockFrom(BIT.JUNE), subjectId: 'member', bookId: 'a',
          actorSubjectId: 'other', effectiveAt: BIT.MARCH, evidenceRef: 'doc:x',
        });
        const noEvidence = recordRetroactiveInvalidity({
          store: w3.store, clock: clockFrom(BIT.JUNE), subjectId: 'member', bookId: 'a',
          actorSubjectId: 'judge', effectiveAt: BIT.MARCH, evidenceRef: '   ',
        });
        dOk = noAuth.ok === false && noAuth.changed === false
          && noEvidence.ok === false && noEvidence.reason === 'evidence_ref_required';
      } finally { w3.store.close(); }

      const pass = aOk && bOk && cOk && dOk;
      return {
        expected: 'a márciusi kép a júniusi rögzítés után is a MÁRCIUSI · a mai kép a HELYESBÍTETT · '
          + 'a jövőbeli hatályú helyesbítés a mait nem mozdítja · a rögzítés hatáskörhöz és bizonyítékhoz kötött',
        actual: `(a) márciusi kép a rögzítés után=${asThen.effective} · (b) mai kép=${asNow.effective}/${asNow.reason}`
          + ` (hatály=${asNow.effective_at} rögzítés=${asNow.recorded_at}) · (c) jövőbeli hatály: ma=${cOk}`
          + ` · (d) hatáskör/bizonyíték kapu=${dOk}`,
        pass,
        asserts: {
          'A-REV-N2a-past-view-survives-later-recording': aOk,
          'A-REV-N2a-present-view-reflects-the-correction': bOk,
          'A-REV-N2a-future-dated-correction-does-not-move-today': cOk,
          'A-REV-N2a-recording-needs-authority-and-evidence': dOk,
        },
      };
    } finally { w.store.close(); }
  });

probe('P-REV-review-circle', 'R83 §7 · REV-N2b · K08 · K09 · KUKA-051 · KUKA-092 · KUKA-041',
  'A FELÜLVIZSGÁLATI KÖR: számított tagság, érintetlen eredeti történet, külön lezárás',
  () => {
    const w = bitemporalWorld();
    try {
      // A MÚLT TARTALMI PILLANATKÉPE a helyesbítés ELŐTT (R55/F02: a darabszám ép maradhat úgy is,
      // hogy a tartalom megváltozott — ezért a TARTALMAT hasonlítjuk, nem a sorok számát).
      const snapshot = () => JSON.stringify(w.store.all('SELECT * FROM command ORDER BY book_id, actor, idem_key'));
      const before = snapshot();

      const rec = recordRetroactiveInvalidity({
        store: w.store, clock: clockFrom(BIT.JUNE), subjectId: 'member', bookId: 'a',
        actorSubjectId: 'judge', effectiveAt: BIT.MARCH, evidenceRef: 'doc:visszavont-meghatalmazas',
      });
      const circle = rec.review_circle_id ? reviewCircleState({ store: w.store, circleId: rec.review_circle_id }) : null;
      const ids = circle ? circle.members.map((m) => m.idem_key).sort() : [];

      // (a) A TAGSÁG SZÁMÍTOTT: a két tengely különbségében véglegesült műveletek — és a feloldó
      //     UGYANAZT adja, mint ami a körbe került (nem két külön igazság, KUKA-018).
      const computed = reviewCircleFor({ store: w.store, subjectId: 'member', bookId: 'a',
        effectiveAt: BIT.MARCH, recordedAt: rec.recorded_at });
      const aOk = rec.ok === true && circle !== null && circle.state === 'open'
        && JSON.stringify(ids) === JSON.stringify(['mar-1', 'mar-2'])
        && JSON.stringify(computed.members.map((m) => m.idem_key).sort()) === JSON.stringify(ids)
        && computed.reason === 'computed_from_time_model';

      // (b) AZ EREDETI TÖRTÉNET ÉRINTETLEN — tartalmilag, nem csak darabszámra.
      const bOk = snapshot() === before;

      // (c) ELLENPÁR: a NEM érintett műveletek nem kerülnek a körbe (a hatály ELŐTTI és a MÁS
      //     alanyé). A „biztonság kedvéért mindent" alak itt bukna el (KUKA-092 rokona).
      const cOk = !ids.includes('feb-0') && !ids.includes('mar-3') && ids.length === 2;

      // (d) A LEZÁRÁS KÜLÖN, HATÁSKÖRHÖZ KÖTÖTT ESEMÉNY — és a tagságot nem bántja.
      const denied = closeReviewCircle({ store: w.store, clock: clockFrom(BIT.JUNE),
        circleId: rec.review_circle_id, actorSubjectId: 'member', outcomeRef: 'doc:dontes' });
      const noOutcome = closeReviewCircle({ store: w.store, clock: clockFrom(BIT.JUNE),
        circleId: rec.review_circle_id, actorSubjectId: 'judge', outcomeRef: '' });
      const closed = closeReviewCircle({ store: w.store, clock: clockFrom(BIT.JUNE),
        circleId: rec.review_circle_id, actorSubjectId: 'judge', outcomeRef: 'doc:dontes' });
      const after = reviewCircleState({ store: w.store, circleId: rec.review_circle_id });
      const dOk = denied.ok === false && denied.changed === false
        && noOutcome.ok === false && noOutcome.reason === 'outcome_ref_required'
        && closed.ok === true && after.state === 'closed' && after.closed_by === 'judge'
        && after.members.length === 2 && snapshot() === before;

      const pass = aOk && bOk && cOk && dOk;
      return {
        expected: 'a kör tagsága a két tengely különbségéből SZÁMÍTOTT · az eredeti műveletek tartalma '
          + 'változatlan · a nem érintettek kimaradnak · a lezárás külön, hatáskörhöz kötött esemény',
        actual: `(a) kör=${ids.join(', ') || '(üres)'} állapot=${circle ? circle.state : 'nincs'} · `
          + `(b) eredeti történet változatlan=${bOk} · (c) kimaradt: feb-0=${!ids.includes('feb-0')} `
          + `mar-3=${!ids.includes('mar-3')} · (d) tag lezárása=${denied.reason} · eljáró lezárása=${closed.ok}/${after.state}`,
        pass,
        asserts: {
          'A-REV-N2b-circle-membership-is-computed': aOk,
          'A-REV-N2b-original-history-is-untouched': bOk,
          'A-REV-N2b-unaffected-operations-stay-out': cOk,
          'A-REV-N2b-closing-is-a-separate-authorised-event': dOk,
        },
      };
    } finally { w.store.close(); }
  });

// A FELÜLVIZSGÁLAT A FORRÁS-ÁLLAPOTHOZ KÖTÖTT. Ha a mai commit más, mint amin a felülvizsgálat
// készült, a rekord NEM a mai kódra vonatkozik. A futtató megmondhatja, min fut
// (`--source-commit=` vagy `V3REF_SOURCE_COMMIT`); ha nem mondja meg, a kimenet ezt KIMONDJA —
// nem tesz úgy, mintha a pecsét friss volna (KUKA-050: az állítás elévül).
// ── R85/F01 + R85/F02 — A KÜLSŐ FÉL KÉT ELLENPÉLDÁJÁRA ADOTT SAJÁT FALSZIFIKÁCIÓ ───────────────
//
// Miért KÉT új próba, és miért nem a meglévők bővítése: a meglévő `P-REV-bitemporal` a MEGVONÁS
// két tengelyét méri, ez a kettő a TAGSÁGADÁSÉT és a BIZONYÍTÉK OTTHONÁT. Külön klauzula-sor,
// külön cáfoló mutáció — különben egy zöld próba két különböző dolgot állítana (KUKA-002).

probe('P-REV-grant-axis', 'R85 §3 · REV-N2a · K08 · KUKA-039 · KUKA-127',
  'A TAGSÁGADÁS IS KÉT TENGELYEN: a későbbi jogszerzés nem írja át a korábbi tudás szerinti képet',
  () => {
    const w = bitemporalWorld({ withCommands: false });
    try {
      // (a) A KÜLSŐ FÉL ESETE. Júniusban keletkezik a tagság; a MÁRCIUSI tudással kérdezett
      //     AUGUSZTUSI kép ettől NEM változhat meg — se előtte, se utána.
      const q = { store: w.store, subjectId: 'member', bookId: 'b', validAt: BIT.AUGUST, knownAt: BIT.MARCH };
      const before = membershipAsOf(q);
      const g = grantMembership({ store: w.store, subjectId: 'member', bookId: 'b', role: 'user', at: BIT.JUNE });
      const after = membershipAsOf(q);
      const today = membershipAsOf({ ...q, knownAt: BIT.JUNE });
      const aOk = g.ok === true && before.effective === false && after.effective === false
        && after.reason === 'membership_grant_not_yet_recorded' && today.effective === true;

      // (b) ELŐRE ISMERT, KÉSŐBB HATÁLYOS ALAP: márciusban rögzítjük, augusztustól jár. A
      //     MÁRCIUSI tudás az AUGUSZTUSI napra IGENT mond, a MÁRCIUSI napra NEMET — a két
      //     tengely tényleg független (ez az az alak, amit egy `granted_at <= knownAt` folt
      //     elrontana: ott a hatály ideje szolgálna tudás-időként).
      const w2 = bitemporalWorld({ withCommands: false });
      let bOk = false; let bAug = null; let bMar = null;
      try {
        grantMembership({ store: w2.store, subjectId: 'member', bookId: 'b', role: 'user',
          recordedAt: BIT.MARCH, effectiveAt: BIT.AUGUST });
        bAug = membershipAsOf({ store: w2.store, subjectId: 'member', bookId: 'b', validAt: BIT.AUGUST, knownAt: BIT.MARCH });
        bMar = membershipAsOf({ store: w2.store, subjectId: 'member', bookId: 'b', validAt: BIT.MARCH_LATER, knownAt: BIT.MARCH });
        bOk = bAug.effective === true && bMar.effective === false
          && bMar.reason === 'membership_not_yet_effective';
      } finally { w2.store.close(); }

      // (c) UTÓLAG RÖGZÍTETT ALAP: hatály márciustól, de csak júniusban került a rendszerbe. A
      //     MÁRCIUSI tudás nem ismerheti; a JÚNIUSI igen — visszamenőleg a márciusi napra is.
      const w3 = bitemporalWorld({ withCommands: false });
      let cOk = false; let cThen = null; let cNow = null;
      try {
        grantMembership({ store: w3.store, subjectId: 'member', bookId: 'b', role: 'user',
          recordedAt: BIT.JUNE, effectiveAt: BIT.MARCH });
        cThen = membershipAsOf({ store: w3.store, subjectId: 'member', bookId: 'b', validAt: BIT.MARCH_LATER, knownAt: BIT.MARCH_LATER });
        cNow = membershipAsOf({ store: w3.store, subjectId: 'member', bookId: 'b', validAt: BIT.MARCH_LATER, knownAt: BIT.JUNE });
        cOk = cThen.effective === false && cThen.reason === 'membership_grant_not_yet_recorded'
          && cNow.effective === true;
      } finally { w3.store.close(); }

      // (d) A GYENGÉBB TANÚ KIMONDVA. A közvetlenül írt sor mögött nincs napló-esemény; ilyenkor
      //     a feloldó KÉNYTELEN a sor idejét mindkét tengelyen használni — és ezt JELZI. A néma
      //     degradáció ugyanaz a hazugság, mint a néma üres lista (KUKA-127 · KUKA-012).
      const direct = membershipAsOf({ store: w.store, subjectId: 'other', bookId: 'a',
        validAt: BIT.MARCH_LATER, knownAt: BIT.MARCH_LATER });
      const evented = membershipAsOf({ store: w.store, subjectId: 'member', bookId: 'b',
        validAt: BIT.AUGUST, knownAt: BIT.JUNE });
      // AZ M110 TÚLÉLTE A PRÓBA ELSŐ ALAKJÁT, és igaza volt: a (d) csak a tengely CÍMKÉJÉT mérte,
      // a tartalék-ág TUDÁS-tengelyét nem — a fixtúra sora januári, a kérdés márciusi, tehát a
      // tudás-szűrő akkor is átengedte volna, ha nem is létezik. Ez a KUKA-124 alakja: olyan
      // állítás, ami fogalmilag nem tud elbukni. A saját cáfoló mutációm mutatta meg.
      w.store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)', 'other', 'b', 'user', BIT.JUNE);
      const lateRow = membershipAsOf({ store: w.store, subjectId: 'other', bookId: 'b',
        validAt: BIT.AUGUST, knownAt: BIT.MARCH });
      const dOk = direct.effective === true && direct.grant_axis === 'projected_row'
        && evented.grant_axis === 'event'
        && lateRow.effective === false && lateRow.reason === 'membership_grant_not_yet_recorded';

      const pass = aOk && bOk && cOk && dOk;
      return {
        expected: 'a későbbi jogszerzés nem látszik a korábbi tudás szerinti képen · az előre ismert, '
          + 'később hatályos és az utólag rögzített alap KÜLÖN kezelve · a napló nélküli sor gyengébb '
          + 'tanúként MEGNEVEZVE',
        actual: `(a) beváltás előtt=${before.effective} után=${after.effective} (${after.reason}) mai=${today.effective} · `
          + `(b) előre ismert: aug=${bAug && bAug.effective} már=${bMar && bMar.effective} · `
          + `(c) utólag rögzített: akkor=${cThen && cThen.effective} ma=${cNow && cNow.effective} · `
          + `(d) tengely: sor=${direct.grant_axis} esemény=${evented.grant_axis} · `
          + `későbbi sor a korábbi tudásban=${lateRow.effective} (${lateRow.reason})`,
        pass,
        asserts: {
          'A-REV-N2a-grant-has-its-own-knowledge-axis': aOk,
          'A-REV-N2a-pre-known-later-effective-grant': bOk,
          'A-REV-N2a-retroactively-recorded-grant': cOk,
          'A-REV-N2a-weaker-grant-witness-is-declared': dOk,
        },
      };
    } finally { w.store.close(); }
  });

probe('P-REV-evidence-home', 'R85 §4 · REV-N2a · K08 · KUKA-015 · KUKA-018 · KUKA-126',
  'A BIZONYÍTÉK A JOGVÁLTOZÁSI ESEMÉNY SAJÁT ADATA — mindhárom ágon, kör nélkül is',
  () => {
    const mk = (effectiveAt, ref) => {
      const w = bitemporalWorld({ withCommands: false });
      try {
        const rec = recordRetroactiveInvalidity({
          store: w.store, clock: clockFrom(BIT.JUNE), subjectId: 'member', bookId: 'a',
          actorSubjectId: 'judge', effectiveAt, evidenceRef: ref,
        });
        const ev = rec.revocation_event_id
          ? w.store.get('SELECT * FROM membership_revocation WHERE id = ?', rec.revocation_event_id) : null;
        const circle = rec.review_circle_id ? reviewCircleState({ store: w.store, circleId: rec.review_circle_id }) : null;
        return { rec, ev, circle };
      } finally { w.store.close(); }
    };

    // (a) JÖVŐBELI HATÁLY — nincs kör (helyesen), a hivatkozás MÉGIS megmarad az eseményen.
    //     Pontosan ez volt a külső fél R85/F02 lelete: a hivatkozás EGYETLEN táblában sem maradt.
    const fut = mk(BIT.AUGUST, 'doc:jovobeli-bizonyitek');
    const aOk = fut.rec.ok === true && fut.rec.review_circle_id === null
      && fut.ev !== null && fut.ev.evidence_ref === 'doc:jovobeli-bizonyitek'
      && fut.ev.actor_subject_id === 'judge';

    // (b) VISSZAMENŐLEGES HATÁLY — a kör MEGSZÜLETIK, és az ESEMÉNYRE mutat (nem másolja a
    //     hivatkozást): egy fogalom, egy otthon.
    const retro = mk(BIT.MARCH, 'doc:visszamenoleges-bizonyitek');
    const bOk = retro.rec.ok === true && retro.circle !== null
      && retro.circle.basis.revocation_event_id === retro.rec.revocation_event_id
      && retro.circle.basis.evidence_ref === 'doc:visszamenoleges-bizonyitek'
      && retro.ev.evidence_ref === 'doc:visszamenoleges-bizonyitek';

    // (c) AZONNALI HATÁLY (a rögzítés napja) — ugyanaz a megőrzési szerződés, kör nélkül.
    const now = mk(BIT.JUNE, 'doc:azonnali-bizonyitek');
    const cOk = now.rec.ok === true && now.rec.review_circle_id === null
      && now.ev.evidence_ref === 'doc:azonnali-bizonyitek';

    // (d) BIZONYÍTÉK NÉLKÜL NINCS JOGVÁLTOZÁS — és nyom sem marad (nem „félig megtörtént").
    const w4 = bitemporalWorld({ withCommands: false });
    let dOk = false; let denied = null;
    try {
      denied = recordRetroactiveInvalidity({
        store: w4.store, clock: clockFrom(BIT.JUNE), subjectId: 'member', bookId: 'a',
        actorSubjectId: 'judge', effectiveAt: BIT.MARCH, evidenceRef: '  ',
      });
      const rows = w4.store.all('SELECT * FROM membership_revocation WHERE subject_id = ?', 'member');
      dOk = denied.ok === false && denied.reason === 'evidence_ref_required' && rows.length === 0;
    } finally { w4.store.close(); }

    const pass = aOk && bOk && cOk && dOk;
    return {
      expected: 'a bizonyíték-hivatkozás MINDHÁROM ágon az eseményen marad · a kör az eseményre MUTAT, '
        + 'nem másolja · bizonyíték nélkül nincs jogváltozás és nincs nyom',
      actual: `(a) jövőbeli: kör=${fut.rec.review_circle_id} esemény-hivatkozás=${fut.ev && fut.ev.evidence_ref} · `
        + `(b) visszamenőleges: kör→esemény=${retro.circle && retro.circle.basis.revocation_event_id} · `
        + `(c) azonnali: esemény-hivatkozás=${now.ev && now.ev.evidence_ref} · `
        + `(d) bizonyíték nélkül: ${denied.reason}, esemény-sorok=${dOk}`,
      pass,
      asserts: {
        'A-REV-N2a-evidence-survives-without-circle': aOk,
        'A-REV-N2a-circle-points-at-the-event': bOk,
        'A-REV-N2a-all-three-branches-same-contract': cOk,
        'A-REV-N2a-no-evidence-no-right-change': dOk,
      },
    };
  });

// ── ORG-N1a — A FELHATALMAZÁS ALAPJA (R85 §1 + §5) ─────────────────────────────────────────────
probe('P-ORG-basis', 'R85 §1 · §5 · ORG-N1a · K04 · K14 · KUKA-003 · KUKA-041',
  'A FELHATALMAZÁS ALAPJA: azonosító, VERZIÓ, HATÁLY és rögzítési idő — a két tengelyen',
  () => {
    const store = openStore();
    try {
      store.run('INSERT INTO book VALUES (?,?)', 'a', 'A könyv');
      for (const id of ['vezeto', 'munkatars']) store.run('INSERT INTO subject VALUES (?,?)', id, 'person');

      // KÉT VERZIÓ: az 1. márciusban, a 2. júniusban. A 2. a régit VÁLTJA, nem törli.
      const v1 = recordAuthorityBasis({ store, basisId: 'HAT-2026-01', bookId: 'a', issuerSubject: 'vezeto',
        effectiveAt: BIT.MARCH, recordedAt: BIT.MARCH, allowedOperations: ['suspend'],
        allowedRoles: ['user'], allowedScopes: ['stock'], evidenceRef: 'doc:hatarozat-v1' });
      const v2 = recordAuthorityBasis({ store, basisId: 'HAT-2026-01', bookId: 'a', issuerSubject: 'vezeto',
        effectiveAt: BIT.JUNE, recordedAt: BIT.JUNE, allowedOperations: ['suspend', 'alter_right'],
        allowedRoles: ['user', 'admin'], allowedScopes: ['stock', 'price'], evidenceRef: 'doc:hatarozat-v2' });

      // (a) A MÚLT KÉPE MEGMARAD: a MÁRCIUSI tudás az 1. verziót látja, a JÚNIUSI a 2.-at. A
      //     júniusi csere NEM írja át, mi volt az alap márciusban (REV-N1b).
      const then = basisAsOf({ store, basisId: 'HAT-2026-01', bookId: 'a', validAt: BIT.MARCH_LATER, knownAt: BIT.MARCH_LATER });
      const now = basisAsOf({ store, basisId: 'HAT-2026-01', bookId: 'a', validAt: BIT.AUGUST, knownAt: BIT.AUGUST });
      // A KÉT TENGELY CSAK AKKOR VÁLIK SZÉT MÉRHETŐEN, ha van UTÓLAG RÖGZÍTETT verzió: hatálya a
      // MÚLTBAN, a rögzítése a JELENBEN. Az M116 (a tudás-tengely kivétele) a próba első alakját
      // TÚLÉLTE, mert ott minden későbbi verzió későbbi hatályú is volt — a hatály-szűrő akkor is
      // kizárta volna. Ez a KUKA-124 alakja: olyan állítás, ami fogalmilag nem tud elbukni. A
      // saját cáfoló mutációm mutatta meg — másodszor ebben a körben.
      recordAuthorityBasis({ store, basisId: 'HAT-UTOLAG', bookId: 'a', issuerSubject: 'vezeto',
        effectiveAt: BIT.MARCH, recordedAt: BIT.MARCH, allowedOperations: ['suspend'],
        allowedRoles: ['user'], allowedScopes: ['stock'], evidenceRef: 'doc:utolag-v1' });
      recordAuthorityBasis({ store, basisId: 'HAT-UTOLAG', bookId: 'a', issuerSubject: 'vezeto',
        effectiveAt: BIT.MARCH, recordedAt: BIT.AUGUST, allowedOperations: ['suspend', 'adjudicate'],
        allowedRoles: ['user'], allowedScopes: ['stock'], evidenceRef: 'doc:utolag-v2' });
      const retroThen = basisAsOf({ store, basisId: 'HAT-UTOLAG', bookId: 'a', validAt: BIT.MARCH_LATER, knownAt: BIT.MARCH_LATER });
      const retroNow = basisAsOf({ store, basisId: 'HAT-UTOLAG', bookId: 'a', validAt: BIT.MARCH_LATER, knownAt: BIT.AUGUST });

      // ÉS A TÜKÖR-ESET, AMIT CSAK A HATÁLY DÖNT EL: a 2. verziót AUGUSZTUSI tudással MÁR ISMERJÜK
      // (júniusban rögzült), de a MÁRCIUSI napra MÉG NEM hatályos — tehát az 1. verziónak kell
      // nyernie. Az M117 (a hatály-tengely kivétele) a próba előző alakját TÚLÉLTE, mert ott a
      // TUDÁS-szűrő is kizárta ugyanazt a verziót: KÉT szűrő mögött az egyik kivétele nem látszik.
      // Egy állítást csak akkor lehet falszifikálni, ha PONTOSAN EGY tengely dönti el (KUKA-124).
      const knownButNotYetEffective = basisAsOf({ store, basisId: 'HAT-2026-01', bookId: 'a', validAt: BIT.MARCH_LATER, knownAt: BIT.AUGUST });

      const aOk = v1.ok && v2.ok && v1.version === 1 && v2.version === 2
        && then.in_effect === true && then.version === 1 && then.evidence_ref === 'doc:hatarozat-v1'
        && now.in_effect === true && now.version === 2 && now.evidence_ref === 'doc:hatarozat-v2'
        && retroThen.in_effect === true && retroThen.version === 1
        && retroNow.in_effect === true && retroNow.version === 2
        && knownButNotYetEffective.in_effect === true && knownButNotYetEffective.version === 1;

      // (b) A HATÁSKÖR-SOR RÖGZÍTI, MELYIK VERZIÓ ALAPJÁN ADTÁK — és ez később sem változik.
      grantAdjudicationAuthority({ store, clock: clockFrom(BIT.MARCH_LATER), subjectId: 'munkatars',
        bookId: 'a', operation: 'suspend', basisId: 'HAT-2026-01' });
      const st = basisState({ store, subjectId: 'munkatars', bookId: 'a', operation: 'suspend',
        validAt: BIT.AUGUST, knownAt: BIT.AUGUST });
      const bOk = st.recorded === true && st.basis_id === 'HAT-2026-01'
        && st.granted_under_version === 1 && st.version_now === 2;

      // (c) A LEJÁRT ÉS A NEM ISMERT ALAP KÜLÖN, NEVEZETT VÁLASZ — és a kiadás ZÁR (fail-closed).
      recordAuthorityBasis({ store, basisId: 'HAT-LEJART', bookId: 'a', issuerSubject: 'vezeto',
        effectiveAt: BIT.MARCH, recordedAt: BIT.MARCH, expiresAt: BIT.JUNE,
        allowedOperations: ['suspend'], allowedRoles: ['user'], allowedScopes: ['stock'],
        evidenceRef: 'doc:lejart' });
      const expired = basisAsOf({ store, basisId: 'HAT-LEJART', bookId: 'a', validAt: BIT.AUGUST, knownAt: BIT.AUGUST });
      const unknown = basisAsOf({ store, basisId: 'NINCS-ILYEN', bookId: 'a', validAt: BIT.AUGUST, knownAt: BIT.AUGUST });
      const notYet = basisAsOf({ store, basisId: 'HAT-2026-01', bookId: 'a', validAt: BIT.FEBRUARY, knownAt: BIT.FEBRUARY });
      let refused = null;
      try {
        grantAdjudicationAuthority({ store, clock: clockFrom(BIT.AUGUST), subjectId: 'munkatars',
          bookId: 'a', operation: 'adjudicate', basisId: 'HAT-LEJART' });
      } catch (e) { refused = e.message; }
      const cOk = expired.in_effect === false && expired.reason === 'basis_expired'
        && unknown.in_effect === false && unknown.reason === 'no_recorded_basis'
        && notYet.in_effect === false && notYet.reason === 'no_basis_version_in_effect'
        && refused !== null && refused.includes('basis_expired');

      // (d) A KORLÁT MA ADAT, NEM VÉDELEM — ÉS EZT KIMONDJA. Az ítélet-feloldó mindkét irányban
      //     helyes, de EGYETLEN kiadó út sem hívja: az ORG-N1b még nem épült meg. A nem-kapuzó
      //     mező LÁTSZIK és megmondja magáról (KUKA-041) — a díszpipa itt bukna el.
      const inside = withinBasis(now, { operation: 'alter_right', role: 'admin', scope: 'price' });
      const outside = withinBasis(then, { operation: 'alter_right' });
      const dOk = st.limit_enforced === false && inside.ok === true
        && outside.ok === false && outside.reason === 'outside_basis_operations';

      // (e) AZ ALAP AZONOSSÁGA A (basis_id, book_id) PÁR — R88/F01.
      //
      // A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL). A `basisAsOf` CSAK az azonosítóra keresett, a
      // `grantAdjudicationAuthority` pedig csak az IDŐBELI hatályt mérte — a KÖNYVET egyik sem. Egy
      // „A" könyvre szóló határozatra hivatkozva tehát „B" könyvben is ki lehetett adni a
      // felhatalmazást. Ez a KUKA-027 alakja a bizonyíték-térben: egy azonosító csak a SAJÁT terében
      // egyedi, és a kiadó út a hiányzó tanút némán elnyelte.
      //
      // A HÁROM KÖVETELMÉNY EGYÜTT (KUKA-084: a lezárás nem HELY, hanem CSATORNA):
      //   · az IDEGEN könyv NEVEZETT, fail-closed választ kap (nem „nincs ilyen alap");
      //   · a tiltott kiadás SEMMILYEN sort nem hagy maga után, és később sem enged;
      //   · a SAJÁT könyvön minden változatlanul működik (ELLENPÁR — KUKA-049).
      store.run('INSERT INTO book VALUES (?,?)', 'b', 'B könyv');
      const foreign = basisAsOf({ store, basisId: 'HAT-2026-01', bookId: 'b', validAt: BIT.AUGUST, knownAt: BIT.AUGUST });
      const noBook = basisAsOf({ store, basisId: 'HAT-2026-01', bookId: '', validAt: BIT.AUGUST, knownAt: BIT.AUGUST });
      let crossRefused = null;
      try {
        grantAdjudicationAuthority({ store, clock: clockFrom(BIT.AUGUST), subjectId: 'munkatars',
          bookId: 'b', operation: 'adjudicate', basisId: 'HAT-2026-01' });
      } catch (e) { crossRefused = e.message; }
      // NYOM NÉLKÜL: se sor, se későbbi engedő válasz a MÁSIK könyvben.
      const crossRow = store.get(
        'SELECT COUNT(*) AS n FROM adjudication_authority WHERE subject_id = ? AND book_id = ?', 'munkatars', 'b');
      const crossRight = adjudicationRightAt({ store, subjectId: 'munkatars', bookId: 'b',
        operation: 'adjudicate', clock: clockFrom(BIT.AUGUST) });
      // A VERZIÓ-ÁTUGRÁS IS ZÁRVA: ugyanaz az azonosító nem költözhet át NÉMÁN másik könyvbe.
      const hop = recordAuthorityBasis({ store, basisId: 'HAT-2026-01', bookId: 'b', issuerSubject: 'vezeto',
        effectiveAt: BIT.AUGUST, recordedAt: BIT.AUGUST, allowedOperations: ['adjudicate'],
        allowedRoles: ['user'], allowedScopes: ['stock'], evidenceRef: 'doc:atugras' });
      // ELLENPÁR: a SAJÁT könyvén a kiadás változatlanul MEGY.
      let sameBookOk = true;
      try {
        grantAdjudicationAuthority({ store, clock: clockFrom(BIT.AUGUST), subjectId: 'munkatars',
          bookId: 'a', operation: 'adjudicate', basisId: 'HAT-2026-01' });
      } catch { sameBookOk = false; }
      const eOk = foreign.in_effect === false && foreign.reason === 'basis_belongs_to_other_book'
        && noBook.in_effect === false && noBook.reason === 'book_id_required'
        && crossRefused !== null && crossRefused.includes('basis_belongs_to_other_book')
        && Number(crossRow.n) === 0 && crossRight.allowed === false
        && hop.ok === false && hop.reason === 'basis_id_belongs_to_other_book'
        && sameBookOk === true;

      const pass = aOk && bOk && cOk && dOk && eOk;
      return {
        expected: 'a verzió-történet a két tengelyen olvasható · a hatáskör-sor a KIADÁSKORI verziót '
          + 'rögzíti · a lejárt/ismeretlen/még nem hatályos alap KÜLÖN nevezett válasz és ZÁR · a '
          + 'korlát ma ADAT, és ezt a válasz kimondja · az alap azonossága a (basis_id, book_id) PÁR: '
          + 'idegen könyvre nevezetten ZÁR, nyom nélkül, a saját könyvén változatlanul MEGY',
        actual: `(a) akkor=v${then.version} ma=v${now.version} · utólag rögzített: akkor=v${retroThen.version} `
          + `ma=v${retroNow.version} · ismert de még nem hatályos=v${knownButNotYetEffective.version} · `
          + `(b) kiadáskor=v${st.granted_under_version} `
          + `ma=v${st.version_now} · (c) lejárt=${expired.reason} ismeretlen=${unknown.reason} `
          + `még nem=${notYet.reason} kiadás=${refused ? 'ZÁRT' : 'ÁTMENT'} · `
          + `(d) korlát kikényszerítve=${st.limit_enforced} belül=${inside.ok} kívül=${outside.reason} · `
          + `(e) idegen könyv=${foreign.reason} könyv nélkül=${noBook.reason} kiadás=${crossRefused ? 'ZÁRT' : 'ÁTMENT'} `
          + `sor=${crossRow.n} későbbi jog=${crossRight.allowed} átugrás=${hop.reason || 'ÁTMENT'} saját könyv=${sameBookOk ? 'MEGY' : 'ELAKADT'}`,
        pass,
        asserts: {
          'A-ORG-N1a-basis-version-history-on-two-axes': aOk,
          'A-ORG-N1a-grant-records-the-version-it-was-issued-under': bOk,
          'A-ORG-N1a-expired-or-unknown-basis-is-named-and-closed': cOk,
          'A-ORG-N1a-limit-is-data-not-enforcement-and-says-so': dOk,
          'A-ORG-N1a-basis-identity-is-the-book-pair-and-crossing-leaves-no-trace': eOk,
        },
      };
    } finally { store.close(); }
  });

// ── ORG-N1b — A KORLÁT: A FELHATALMAZÁS NEM LEHET TÁGABB, MINT AZ ALAPJA (R90 §6) ──────────────
//
// A TERV ELŐRE ÁLLT (norms.mjs · REQUIRED_EVIDENCE req-5 · n:2), és a próba PONTOSAN azt méri,
// amit a terv kimondott — nem a megépült dologhoz igazítva (KUKA-054).
probe('P-ORG-basis-limit', 'R90 §6 · ORG-N1b · K04 · K05 · KUKA-041 · KUKA-122 · KUKA-129',
  'A KORLÁT: a kiadás elakad a határozaton túl, a határon belül változatlanul megy, és a beváltás a korlátot is átviszi',
  () => {
    const store = openStore();
    try {
      store.run('INSERT INTO book VALUES (?,?)', 'a', 'A könyv');
      for (const id of ['vezeto', 'kiado', 'cimzett']) store.run('INSERT INTO subject VALUES (?,?)', id, 'person');
      // A KIADÓ tagsága: admin, hogy a `user` szerep delegálható legyen — a korlát NEM ezen bukik.
      grantMembership({ store, subjectId: 'kiado', bookId: 'a', role: 'admin', at: BIT.MARCH });
      store.run('INSERT INTO external_id VALUES (?,?,?,?,?,?,?,?,NULL)',
        'cimzett', 'email', 'self_asserted', 'n/a', 'cimzett@pelda.invalid', 'cimzett@pelda.invalid',
        'one_to_one', BIT.MARCH);
      store.run('INSERT INTO account VALUES (?,?)', 'cimzett', 'jelszo');
      store.run('INSERT INTO channel_proof VALUES (?,?,?,?)', 'cimzett', 'email', 'cimzett@pelda.invalid', BIT.MARCH);

      // A HATÁROZAT: CSAK `user` szerep, CSAK készlet-adatkör, CSAK meghívó-kiadás.
      recordAuthorityBasis({
        store, basisId: 'HAT-KORLAT', bookId: 'a', issuerSubject: 'vezeto',
        effectiveAt: BIT.MARCH, recordedAt: BIT.MARCH,
        allowedOperations: [INVITE_ISSUE_OPERATION], allowedRoles: ['user'], allowedScopes: ['stock'],
        evidenceRef: 'doc:hatarozat-korlat',
      });
      const expires = '2026-12-31T00:00:00.000Z';

      // (a) A KORLÁTON TÚLI KIADÁS NEVEZETTEN ELAKAD — és NYOM NÉLKÜL (KUKA-084: ha a meghívó
      //     megszületne és csak a pecsét maradna el, a beváltás a „nincs deklarált alap" ágra
      //     esne vissza, vagyis a védelem a saját kiskapuját hordozná).
      const tooWideRole = issueInviteUnderBasis({
        store, token: 'tok_admin', bookId: 'a', inviteeNamespace: 'email',
        inviteeValue: 'cimzett@pelda.invalid', offeredRole: 'admin', issuerSubject: 'kiado',
        expiresAt: expires, basisId: 'HAT-KORLAT', scope: 'stock', issuedAt: BIT.MARCH,
      });
      const tooWideScope = issueInviteUnderBasis({
        store, token: 'tok_price', bookId: 'a', inviteeNamespace: 'email',
        inviteeValue: 'cimzett@pelda.invalid', offeredRole: 'user', issuerSubject: 'kiado',
        expiresAt: expires, basisId: 'HAT-KORLAT', scope: 'price', issuedAt: BIT.MARCH,
      });
      // AZ ÜRES TENGELY = NINCS MEGENGEDVE, nem „minden" (fail-closed). A hiányzó felsorolás nem
      // felhatalmazás — ez az az ág, amit egy „legyen megengedőbb" egyszerűsítés kinyitna (KUKA-020).
      recordAuthorityBasis({
        store, basisId: 'HAT-URES', bookId: 'a', issuerSubject: 'vezeto',
        effectiveAt: BIT.MARCH, recordedAt: BIT.MARCH,
        allowedOperations: [INVITE_ISSUE_OPERATION], allowedRoles: ['user'], allowedScopes: [],
        evidenceRef: 'doc:hatarozat-ures',
      });
      const emptyAxis = issueInviteUnderBasis({
        store, token: 'tok_ures', bookId: 'a', inviteeNamespace: 'email',
        inviteeValue: 'cimzett@pelda.invalid', offeredRole: 'user', issuerSubject: 'kiado',
        expiresAt: expires, basisId: 'HAT-URES', scope: 'stock', issuedAt: BIT.MARCH,
      });
      const noTrace = Number(store.get(
        "SELECT COUNT(*) AS n FROM invite WHERE token IN ('tok_admin','tok_price','tok_ures')").n);
      const aOk = tooWideRole.ok === false && tooWideRole.reason === 'outside_basis_roles'
        && tooWideScope.ok === false && tooWideScope.reason === 'outside_basis_scopes'
        && emptyAxis.ok === false && emptyAxis.reason === 'outside_basis_scopes'
        && noTrace === 0;

      // (b) ELLENPÁR — A KORLÁTON BELÜL VÁLTOZATLANUL MEGY (KUKA-122: a kapu nem fal).
      const inside = issueInviteUnderBasis({
        store, token: 'tok_user', bookId: 'a', inviteeNamespace: 'email',
        inviteeValue: 'cimzett@pelda.invalid', offeredRole: 'user', issuerSubject: 'kiado',
        expiresAt: expires, basisId: 'HAT-KORLAT', scope: 'stock', issuedAt: BIT.MARCH,
      });
      const seal = inviteBasisSeal(store, 'tok_user');
      const bOk = inside.ok === true && inside.basis_version === 1
        && seal.declared === true && String(seal.seal.basis_id) === 'HAT-KORLAT';

      // (c) A BEVÁLTÁS A KORLÁTOT IS ÁTVISZI — nem csak a szerepet.
      const redeemed = redeemInvite({
        store, token: 'tok_user', actingSubjectId: 'cimzett', clock: clockFrom(BIT.MARCH_LATER),
      });
      const grantRow = store.get(
        'SELECT id FROM membership_grant WHERE subject_id = ? AND book_id = ? ORDER BY id DESC', 'cimzett', 'a');
      const carried = grantBasisFor(store, grantRow ? grantRow.id : -1);
      const cOk = redeemed.ok === true && carried.declared === true
        && carried.basis_id === 'HAT-KORLAT' && carried.basis_version === 1
        && Array.isArray(carried.limit.roles) && carried.limit.roles.includes('user')
        && !carried.limit.roles.includes('admin');

      // (d) A BEVÁLTÁS OLDALÁN IS HAT — a NYERS `INSERT`-tel írt meghívó sem bújhat ki, ha van
      //     kiadott korlát; és a KIADOTT korlát nem törölhető (KUKA-013: az őr, ami csak az egyik
      //     írót ismeri, nem őr).
      store.run(`INSERT INTO invite (token, book_id, invitee_namespace, invitee_value, offered_role,
                   issuer_subject, expires_at, redeemed_at) VALUES (?,?,?,?,?,?,?,NULL)`,
        'tok_nyers', 'a', 'email', 'cimzett@pelda.invalid', 'admin', 'kiado', expires);
      store.run(`INSERT INTO invite_basis (token, basis_id, basis_version, book_id, issued_at, operation, scope, sealed_limit)
                 VALUES (?,?,?,?,?,?,?,?)`,
        'tok_nyers', 'HAT-KORLAT', 1, 'a', BIT.MARCH, INVITE_ISSUE_OPERATION, 'stock',
        JSON.stringify({ operations: [INVITE_ISSUE_OPERATION], roles: ['user'], scopes: ['stock'] }));
      const rawGate = redemptionLimitGate({ store, invite: store.get('SELECT * FROM invite WHERE token = ?', 'tok_nyers'), knownAt: BIT.MARCH_LATER });
      const rawRedeem = redeemInvite({
        store, token: 'tok_nyers', actingSubjectId: 'cimzett', clock: clockFrom(BIT.MARCH_LATER),
      });
      let sealDeleteRefused = null;
      try { store.run("DELETE FROM invite_basis WHERE token = 'tok_nyers'"); } catch (e) { sealDeleteRefused = e.message; }
      const dOk = rawGate.ok === false && rawGate.reason === 'outside_basis_roles'
        && rawRedeem.ok === false && rawRedeem.error === 'invite_outside_basis'
        && sealDeleteRefused !== null;

      // (e) A DEKLARÁLATLAN MEGHÍVÓ NEM AKAD EL, DE A VÁLASZ KIMONDJA (KUKA-041 · KUKA-122), és a
      //     kikényszerítés HELYE nevezve van — a bírálati úton a korlát MA IS csak adat (KUKA-050).
      store.run(`INSERT INTO invite (token, book_id, invitee_namespace, invitee_value, offered_role,
                   issuer_subject, expires_at, redeemed_at) VALUES (?,?,?,?,?,?,?,NULL)`,
        'tok_nincs', 'a', 'email', 'cimzett@pelda.invalid', 'user', 'kiado', expires);
      const undeclared = redemptionLimitGate({ store, invite: store.get('SELECT * FROM invite WHERE token = ?', 'tok_nincs'), knownAt: BIT.MARCH_LATER });
      const st = basisState({ store, subjectId: 'munkatars', bookId: 'a', operation: 'adjudicate', validAt: BIT.MARCH_LATER, knownAt: BIT.MARCH_LATER });
      const verdictHome = limitVerdict({ store, basisId: 'HAT-KORLAT', bookId: 'a', role: 'admin',
        operation: INVITE_ISSUE_OPERATION, scope: 'stock', validAt: BIT.MARCH, knownAt: BIT.MARCH });
      const eOk = undeclared.ok === true && undeclared.basis_declared === false
        && undeclared.reason === 'no_declared_basis'
        && st.limit_enforced === false
        && Array.isArray(LIMIT_ENFORCED_PATHS) && LIMIT_ENFORCED_PATHS.includes('invite_issue')
        && LIMIT_ENFORCED_PATHS.includes('invite_redeem')
        && verdictHome.ok === false && verdictHome.reason === 'outside_basis_roles';

      // (f) A HÍVÓ NEM NEVEZHETI ÁT AZ ELLENŐRZÖTT MŰVELETET — R92/F01 (a külső fél lelete).
      //
      // A LELET, MÉRVE a teljes kiadás→beváltás úton: egy CSAK `suspend`-re felhatalmazó alappal az
      // `operation:'suspend'` átírással a meghívó KIADÁSA és BEVÁLTÁSA is sikerült, és valódi
      // user-TAGSÁG keletkezett. A kapu azt a nevet mérte, amit a hívó MONDOTT — és a beváltás
      // UGYANAZT a hamis nevet olvasta vissza a pecsétből.
      recordAuthorityBasis({
        store, basisId: 'HAT-CSAK-FELF', bookId: 'a', issuerSubject: 'vezeto',
        effectiveAt: BIT.MARCH, recordedAt: BIT.MARCH,
        allowedOperations: ['suspend'], allowedRoles: ['user'], allowedScopes: ['stock'],
        evidenceRef: 'doc:hatarozat-csak-felfuggesztes',
      });
      const renamed = issueInviteUnderBasis({
        store, token: 'tok_atnevezett', bookId: 'a', inviteeNamespace: 'email',
        inviteeValue: 'cimzett@pelda.invalid', offeredRole: 'user', issuerSubject: 'kiado',
        expiresAt: expires, basisId: 'HAT-CSAK-FELF', operation: 'suspend', scope: 'stock',
        issuedAt: BIT.MARCH,
      });
      const defaultRefused = issueInviteUnderBasis({
        store, token: 'tok_alap', bookId: 'a', inviteeNamespace: 'email',
        inviteeValue: 'cimzett@pelda.invalid', offeredRole: 'user', issuerSubject: 'kiado',
        expiresAt: expires, basisId: 'HAT-CSAK-FELF', scope: 'stock', issuedAt: BIT.MARCH,
      });
      // A NYERS PECSÉT SEM MONDHATJA MEG, MIT MÉRJÜNK: kézzel írt, `suspend` műveletű pecsét.
      store.run(`INSERT INTO invite (token, book_id, invitee_namespace, invitee_value, offered_role,
                   issuer_subject, expires_at, redeemed_at) VALUES (?,?,?,?,?,?,?,NULL)`,
        'tok_pecset_hamis', 'a', 'email', 'cimzett@pelda.invalid', 'user', 'kiado', expires);
      store.run(`INSERT INTO invite_basis (token, basis_id, basis_version, book_id, issued_at, operation, scope, sealed_limit)
                 VALUES (?,?,?,?,?,?,?,?)`,
        'tok_pecset_hamis', 'HAT-CSAK-FELF', 1, 'a', BIT.MARCH, 'suspend', 'stock',
        JSON.stringify({ operations: ['suspend'], roles: ['user'], scopes: ['stock'] }));
      const fakeSealGate = redemptionLimitGate({ store, invite: store.get('SELECT * FROM invite WHERE token = ?', 'tok_pecset_hamis'), knownAt: BIT.MARCH_LATER });
      const fakeSealRedeem = redeemInvite({
        store, token: 'tok_pecset_hamis', actingSubjectId: 'cimzett', clock: clockFrom(BIT.MARCH_LATER),
      });
      const renamedTrace = Number(store.get(
        "SELECT COUNT(*) AS n FROM invite WHERE token IN ('tok_atnevezett','tok_alap')").n);
      const fOk = renamed.ok === false && renamed.reason === 'operation_not_overridable'
        && defaultRefused.ok === false && defaultRefused.reason === 'outside_basis_operations'
        && renamedTrace === 0
        && fakeSealGate.ok === false && fakeSealGate.reason === 'sealed_operation_mismatch'
        && fakeSealRedeem.ok === false && fakeSealRedeem.error === 'invite_outside_basis';

      // (g) AZ ADATKÖR ELHAGYÁSA NEM KAPCSOLJA KI A TENGELYT — R92/F02.
      //
      // A LELET: a `scope` alapértéke `null` volt, és a feloldó a null tengelyt ÁTUGROTTA — az
      // `allowedScopes: []` alap tehát egy ELHAGYÁSSAL megkerülhető volt. A kötelezőséget most a
      // MŰVELETI SZERZŐDÉS mondja ki (MOP-01), nem a hívó.
      const omittedOnEmpty = issueInviteUnderBasis({
        store, token: 'tok_nincs_scope', bookId: 'a', inviteeNamespace: 'email',
        inviteeValue: 'cimzett@pelda.invalid', offeredRole: 'user', issuerSubject: 'kiado',
        expiresAt: expires, basisId: 'HAT-URES', issuedAt: BIT.MARCH,
      });
      // ÉS A TÁG ALAPON IS KÖTELEZŐ: a tengely nem attól kötelező, hogy éppen üres a lista.
      const omittedOnWide = issueInviteUnderBasis({
        store, token: 'tok_nincs_scope2', bookId: 'a', inviteeNamespace: 'email',
        inviteeValue: 'cimzett@pelda.invalid', offeredRole: 'user', issuerSubject: 'kiado',
        expiresAt: expires, basisId: 'HAT-KORLAT', issuedAt: BIT.MARCH,
      });
      const omittedTrace = Number(store.get(
        "SELECT COUNT(*) AS n FROM invite WHERE token IN ('tok_nincs_scope','tok_nincs_scope2')").n);
      // ELLENPÁR: a MEGADOTT, jogos adatkörrel ugyanez az út MEGY (a kapu nem fal — KUKA-122).
      const withScope = issueInviteUnderBasis({
        store, token: 'tok_van_scope', bookId: 'a', inviteeNamespace: 'email',
        inviteeValue: 'cimzett@pelda.invalid', offeredRole: 'user', issuerSubject: 'kiado',
        expiresAt: expires, basisId: 'HAT-KORLAT', scope: 'stock', issuedAt: BIT.MARCH,
      });
      // A SZERZŐDÉS NÉLKÜLI MŰVELET ZÁR — nem néma átengedés (KUKA-020).
      const noContract = limitVerdict({ store, basisId: 'HAT-KORLAT', bookId: 'a', role: 'user',
        operation: 'valami_mas', scope: 'stock', validAt: BIT.MARCH, knownAt: BIT.MARCH });
      const gOk = omittedOnEmpty.ok === false && omittedOnEmpty.reason === 'axis_value_required_scopes'
        && omittedOnWide.ok === false && omittedOnWide.reason === 'axis_value_required_scopes'
        && omittedTrace === 0 && withScope.ok === true
        && noContract.ok === false && noContract.reason === 'operation_has_no_limit_contract'
        && Array.isArray(requiredAxesFor(INVITE_ISSUE_OPERATION))
        && requiredAxesFor(INVITE_ISSUE_OPERATION).includes('scopes')
        && requiredAxesFor('valami_mas') === null;

      const pass = aOk && bOk && cOk && dOk && eOk && fOk && gOk;
      return {
        expected: 'a korláton TÚLI kiadás nevezetten elakad és nyom nélkül · a korláton BELÜLI '
          + 'változatlanul megy · a beváltás a KORLÁTOT is átviszi · a nyers meghívó sem bújhat ki, '
          + 'és a kiadott korlát nem törölhető · a deklarálatlan meghívó megy, de a válasz kimondja · '
          + 'a MŰVELET azonosságát a belépési pont adja (a hívó és a pecsét sem nevezheti át) · '
          + 'a KÖTELEZŐ tengely ELHAGYÁSA nevezett elutasítás, nem kikapcsolás',
        actual: `(a) szerep=${tooWideRole.reason} adatkör=${tooWideScope.reason} üres tengely=${emptyAxis.reason} nyom=${noTrace} · `
          + `(b) belül=${inside.ok} v${inside.basis_version} pecsét=${seal.declared} · `
          + `(c) beváltás=${redeemed.ok} átvitt korlát=${carried.reason} szerepek=${carried.limit ? carried.limit.roles.join('/') : '—'} · `
          + `(d) nyers kapu=${rawGate.reason} beváltás=${rawRedeem.error || 'ÁTMENT'} pecsét-törlés=${sealDeleteRefused ? 'ZÁRT' : 'ÁTMENT'} · `
          + `(e) deklarálatlan=${undeclared.reason} bírálati kikényszerítés=${st.limit_enforced} kapus utak=${LIMIT_ENFORCED_PATHS.join('+')} · `
          + `(f) átnevezett művelet=${renamed.reason} alapértelmezett=${defaultRefused.reason} nyom=${renamedTrace} hamis pecsét=${fakeSealGate.reason}/${fakeSealRedeem.error} · `
          + `(g) elhagyott adatkör üresen=${omittedOnEmpty.reason} tág alapon=${omittedOnWide.reason} nyom=${omittedTrace} megadottal=${withScope.ok} szerződés nélkül=${noContract.reason}`,
        pass,
        asserts: {
          'A-ORG-N1b-issuing-beyond-the-basis-is-named-and-leaves-no-trace': aOk,
          'A-ORG-N1b-issuing-within-the-basis-is-unchanged': bOk,
          'A-ORG-N1b-redemption-carries-the-limit-not-only-the-role': cOk,
          'A-ORG-N1b-raw-written-invite-cannot-escape-the-issued-limit': dOk,
          'A-ORG-N1b-undeclared-basis-is-named-not-silent': eOk,
          'A-ORG-N1b-operation-identity-is-the-entry-point-not-the-caller': fOk,
          'A-ORG-N1b-omitting-an-axis-does-not-disable-it': gOk,
        },
      };
    } finally { store.close(); }
  });

probe('P-ORG-grant-atomic', 'R88 §3 · REV-N2a · ORG-N1a · K08 · KUKA-024 · KUKA-026 · KUKA-122',
  'A TAGSÁGADÁS EGY ÍRÁS: a bukott kísérlet NEM hagy nyomot a történetben',
  () => {
    const store = openStore();
    try {
      store.run('INSERT INTO book VALUES (?,?)', 'a', 'A könyv');
      store.run('INSERT INTO subject VALUES (?,?)', 'member', 'person');
      const events = () => Number(store.get('SELECT COUNT(*) AS n FROM membership_grant').n);
      const rows = () => Number(store.get('SELECT COUNT(*) AS n FROM membership').n);

      // (a) A SIKERES ÁG VÁLTOZATLAN: esemény ÉS vetület, egyszerre.
      const first = grantMembership({ store, subjectId: 'member', bookId: 'a', role: 'user',
        effectiveAt: BIT.MARCH, recordedAt: BIT.MARCH });
      const afterFirst = { e: events(), r: rows() };

      // (b) A BUKOTT ÁG NEM ÍR TÖRTÉNELMET — R88/F02.
      //
      // A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL). Az esemény ÖNÁLLÓAN ment be, a vetület utána; ha
      // a vetület egyediségre bukott, az ESEMÉNY bent maradt. A hívó hibát kapott, a rendszer mégis
      // megváltozott: a márciusi kérdésre előtte „nincs tagság", utána „van". Ez a KUKA-026 alakja
      // — csak fordítva: ott a KUDARC nyoma tűnt el a siker tranzakciójában, itt a kudarc HATÁSA
      // maradt bent. A puszta előzetes duplikátum-vizsgálat NEM helyettesíti az atomicitást
      // (versenyhelyzetben ugyanoda jutunk), ezért a próba a TÁROLÓ határát méri, nem egy őrt.
      const before = membershipAsOf({ store, subjectId: 'member', bookId: 'a',
        validAt: BIT.AUGUST, knownAt: BIT.AUGUST });
      let threw = null;
      try {
        grantMembership({ store, subjectId: 'member', bookId: 'a', role: 'admin',
          effectiveAt: BIT.JUNE, recordedAt: BIT.JUNE });
      } catch (e) { threw = (e && e.message) || String(e); }
      const afterFail = { e: events(), r: rows() };
      const after = membershipAsOf({ store, subjectId: 'member', bookId: 'a',
        validAt: BIT.AUGUST, knownAt: BIT.AUGUST });
      const bOk = threw !== null
        && afterFail.e === afterFirst.e && afterFail.r === afterFirst.r
        && after.role === before.role && after.granted_at === before.granted_at;

      // (c) A BEÁGYAZOTT HÍVÓ JOGOS ÚT MARAD — KUKA-122: a kapu csak akkor kapu, ha TELJESÍTHETŐ.
      //
      // A meghívó-beváltás MÁR tranzakcióban hív minket. Ha a javítás egy KÜLSŐ `BEGIN`-t írt volna
      // ide, a jogos beváltás állt volna meg — a javítás a hazugság helyett a munkát zárta volna ki.
      // Ezért `atomic` (beágyazva mentési pont), és a KÜLSŐ tranzakció sorsa dönt: ha az visszagördül,
      // a tagságadás is eltűnik — a beágyazott egység nem véglegesít a hívója helyett.
      store.run('INSERT INTO subject VALUES (?,?)', 'invitee', 'person');
      let nested = null;
      let nestedErr = null;
      // A KIVÉTELT ITT FOGJUK EL, hogy a visszacsúszás NEVEZETT ÁLLÍTÁS-BUKÁS legyen, ne nyers
      // programhiba: a mérés akkor mér, ha a bukás alakja is a miénk (KUKA-020).
      try {
        store.tx(() => { nested = grantMembership({ store, subjectId: 'invitee', bookId: 'a', role: 'user', at: BIT.MARCH }); });
      } catch (e) { nestedErr = (e && e.message) || String(e); }
      const nestedCommitted = { e: events(), r: rows() };

      store.run('INSERT INTO subject VALUES (?,?)', 'rolled', 'person');
      let outerThrew = null;
      try {
        store.tx(() => {
          grantMembership({ store, subjectId: 'rolled', bookId: 'a', role: 'user', at: BIT.MARCH });
          throw new Error('a KÜLSŐ tranzakció bukik el — a tagságadásnak vele kell mennie');
        });
      } catch (e) { outerThrew = (e && e.message) || String(e); }
      const afterRollback = { e: events(), r: rows() };
      const rolledRight = rightAt({ store, subjectId: 'rolled', bookId: 'a', nowIso: BIT.AUGUST });
      const cOk = nestedErr === null && nested !== null && nested.ok === true
        && nestedCommitted.e === afterFail.e + 1 && nestedCommitted.r === afterFail.r + 1
        && outerThrew !== null
        && afterRollback.e === nestedCommitted.e && afterRollback.r === nestedCommitted.r
        && rolledRight.allowed === false;

      const aOk = first.ok === true && afterFirst.e === 1 && afterFirst.r === 1;
      const pass = aOk && bOk && cOk;
      return {
        expected: 'a tagságadás esemény és vetület EGYÜTT sikerül vagy EGYÜTT bukik · a bukott kísérlet '
          + 'után a történet VÁLTOZATLAN · a beágyazott (beváltási) hívó jogos út marad, és a KÜLSŐ '
          + 'tranzakció visszagördülése a tagságadást is elviszi',
        actual: `(a) első: esemény=${afterFirst.e} sor=${afterFirst.r} · (b) bukás=${threw ? 'IGEN' : 'NEM'} `
          + `esemény=${afterFail.e} sor=${afterFail.r} szerep előtte=${before.role} utána=${after.role} · `
          + `(c) beágyazott=${nestedErr ? `ELAKADT (${nestedErr})` : nested && nested.ok} véglegesítve esemény=${nestedCommitted.e} · `
          + `külső visszagördülés után esemény=${afterRollback.e} sor=${afterRollback.r} jog=${rolledRight.allowed}`,
        pass,
        asserts: {
          'A-ORG-grant-success-writes-event-and-projection': aOk,
          'A-ORG-failed-grant-leaves-no-event-and-no-history-change': bOk,
          'A-ORG-nested-caller-stays-legal-and-follows-the-outer-transaction': cOk,
        },
      };
    } finally { store.close(); }
  });


// ═══ MCS-2 — AZ ELSŐ D-FOLYAMAT TÁROLÁSI ÉS PARANCS-RÉTEGE ══════════════════════════════════════
//
// HÁROM próba, HÁROM szerződésre. Mindegyik a LÁNC VÉGÉT méri, nem a darabokat: a KUKA-038 szerint
// a futtató LÉTEZÉSE nem bizonyítja, hogy FUT — ezért itt valódi tároló, valódi parancs, valódi
// nyugta és valódi mozgás-sor keletkezik, és az ÁLLÍTÁS a MÉRT végállapot.

probe('P-KAT-item-identity', 'MCS-2 · KAT-01 · K10 · KUKA-021 · KUKA-027',
  'A cikk azonossága: belső azonosító az SKU MELLETT · az SKU a KÖNYVÖN BELÜL egyedi · a mértékegység a mennyiség JELENTÉSE',
  () => {
    const store = openStore();
    try {
      store.run('INSERT INTO book VALUES (?,?)', 'a', 'A könyv');
      store.run('INSERT INTO book VALUES (?,?)', 'b', 'B könyv');
      const first = registerItem({ store, bookId: 'a', sku: '050', unit: 'l', at: BIT.MARCH });
      // (a) UGYANAZ AZ SKU UGYANABBAN A KÖNYVBEN — ütközés.
      const dup = registerItem({ store, bookId: 'a', sku: '050', unit: 'l', at: BIT.MARCH });
      // (b) UGYANAZ AZ SKU MÁSIK KÖNYVBEN — teljesen rendben, és MÁS belső azonosító (KUKA-027).
      const other = registerItem({ store, bookId: 'b', sku: '050', unit: 'kg', at: BIT.MARCH });
      // (c) SKU-FELOLDÁS KÖNYV NÉLKÜL — fogalmi hiba, DOBNIA kell.
      let bookless = null;
      try { itemBySku(store, null, '050'); } catch (e) { bookless = 'DOBOTT'; }
      // (d) EGYSÉG-VÁLTÁS NULLA LÁBNYOMON — szabad, mert nincs mit átszámolni.
      const zeroFootprint = changeItemUnit({ store, itemId: first.itemId, unit: 'ml' });

      const aOk = first.ok === true && dup.ok === false && dup.error === 'sku_taken';
      const bOk = other.ok === true && other.itemId !== first.itemId;
      const cOk = bookless === 'DOBOTT';
      const dOk = zeroFootprint.ok === true && zeroFootprint.changed === true && zeroFootprint.reason === 'zero_footprint';
      return {
        expected: 'az SKU a könyvön belül egyedi · ugyanaz az SKU másik könyvben MÁS cikk · '
          + 'könyv nélküli SKU-feloldás fogalmi hiba · nulla lábnyomon az egység-váltás szabad',
        actual: 'duplikátum=' + dup.error + ' · másik könyv azonosítója eltér=' + (other.itemId !== first.itemId)
          + ' · könyv nélkül=' + bookless + ' · nulla lábnyom=' + zeroFootprint.reason,
        pass: aOk && bOk && cOk && dOk,
        asserts: {
          'A-KAT-sku-is-unique-within-the-book': aOk,
          'A-KAT-same-sku-in-another-book-is-a-different-item': bOk,
          'A-KAT-sku-lookup-requires-the-book': cOk,
          'A-KAT-unit-change-is-free-on-zero-footprint': dOk,
        },
      };
    } finally { store.close(); }
  });

probe('P-KSZ-ledger-truth', 'MCS-2 · KSZ-01 · K10 · R10-F01 · R10-F02 · R10-F03 · KUKA-021 · KUKA-026 · KUKA-054',
  'A készlet-főkönyv a KANONIKUS parancs-úton: atomiság · nincs megkerülő író · idegen könyv cikke tilos · KÉT idő-nézet TENGELY-PÁRRAL · a visszadátumozás nem kerüli meg az összegkorlátot',
  () => {
    const store = openStore();
    try {
      // ── A VILÁG: két könyv, egy tag, könyvenként egy cikk ─────────────────────────────────────
      store.run('INSERT INTO book VALUES (?,?)', 'a', 'A könyv');
      store.run('INSERT INTO book VALUES (?,?)', 'b', 'B könyv');
      store.run('INSERT INTO subject VALUES (?,?)', 'gazda', 'person');
      store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)', 'gazda', 'a', 'user', BIT.GRANT);
      const item = registerItem({ store, bookId: 'a', sku: 'OLAJ-1L', unit: 'l', at: BIT.MARCH });
      const foreign = registerItem({ store, bookId: 'b', sku: 'IDEGEN', unit: 'l', at: BIT.MARCH });
      // A DARABOS cikk a MÁSIK profillal — az összeg-korlát ezen mérhető meg értelmes darabszámmal,
      // és egyben bizonyítja, hogy a mennyiség szerződése a CIKK profiljával érvényesül, nem a hívóéval.
      const piece = registerItem({ store, bookId: 'a', sku: 'DOBOZ', unit: 'db', qtyProfile: 'qty-2', at: BIT.MARCH });
      const pieceKey = { bookId: 'a', itemId: piece.itemId, ownerId: 'gazda', warehouseId: 'FO' };
      const key = { bookId: 'a', itemId: item.itemId, ownerId: 'gazda', warehouseId: 'FO' };

      // A TELJES UTAT HÍVJUK (R10: „ne szúrj be kész sikerállapotot a bizonyítandó szakasz helyére").
      // Ez a próba EGYETLEN belépési pontot ismer — ugyanazt, amit egy valódi hívó.
      const receipt = ({ idemKey, qty, effectiveAt, at = BIT.MARCH, itemId = item.itemId, warehouseId = 'FO' }) =>
        submitStockReceipt({
          store, idemKey, actor: 'gazda', bookId: 'a', ownerId: 'gazda', warehouseId,
          input: { item_id: itemId, qty, effective_at: effectiveAt },
          clock: clockFrom(at),
        });

      // (a) NINCS MEGKERÜLŐ ÍRÓ. A nyers mozgás-író nem exportált — ha visszakerülne, a parancs-út
      //     MINDEN garanciája megkerülhető lenne, és ezt a próba a többi ágon már nem venné észre.
      const exported = Object.keys(LEDGER_MODULE).sort();
      const aOk = !exported.includes('appendMovement') && !exported.includes('receiveStock')
        && exported.includes('submitStockReceipt');

      // (b) JOGOS BEVÉT a teljes láncon: parancs + nyugta + mozgás EGYÜTT születik.
      const ok1 = receipt({ idemKey: 'k1', qty: '10', effectiveAt: BIT.MARCH });
      const cmdRow = store.get('SELECT state, effect_id FROM command WHERE idem_key = ?', 'k1');
      const evRow = store.get("SELECT COUNT(*) AS n FROM command_event WHERE idem_key = ? AND event = 'command_finalized'", 'k1');
      const movRow = store.get('SELECT COUNT(*) AS n FROM stock_movement WHERE effect_id = ?', cmdRow ? cmdRow.effect_id : '');
      const bOk = ok1.ok === true && cmdRow && cmdRow.state === 'finalized'
        && evRow.n === 1 && movRow.n === 1;

      // (c) UGYANAZ A KULCS ÚJRA: ISMÉTLÉS, nem MÁSODIK könyvelés. A régi alakban ugyanaz a
      //     hatásazonosító kétszer könyvelt (R10-F01), és 10.000-ből 20.000 lett.
      const again = receipt({ idemKey: 'k1', qty: '10', effectiveAt: BIT.MARCH });
      const movAfterReplay = store.get('SELECT COUNT(*) AS n FROM stock_movement');
      const cOk = again.ok === true && again.replayed === true && movAfterReplay.n === 1;

      // (d) UGYANAZ A KULCS, MÁS RAKTÁR: ez NEM ismétlés, hanem ÜTKÖZÉS — a feloldott hatókör a
      //     parancs azonosságának része (KUKA-074).
      const otherWh = receipt({ idemKey: 'k1', qty: '10', effectiveAt: BIT.MARCH, warehouseId: 'MASIK' });
      const dOk = otherWh.ok === false && otherWh.error === 'idempotency_conflict';

      // (e) IDEGEN KÖNYV CIKKE — NEVEZETT elutasítás, és SEMMI nem íródik (R10-F02).
      const cmdBefore = store.get('SELECT COUNT(*) AS n FROM command').n;
      const cross = receipt({ idemKey: 'k_cross', qty: '1', effectiveAt: BIT.MARCH, itemId: foreign.itemId });
      const eOk = cross.ok === false && cross.error === 'item_belongs_to_another_book'
        && store.get('SELECT COUNT(*) AS n FROM command').n === cmdBefore;

      // (f) A KÉT IDŐ-NÉZET TENGELY-PÁRRAL (R10-F03). JÚNIUSBAN rögzítünk egy JÚNIUSRA hatályos
      //     bevétet; a MÁRCIUSI „akkor mit tudtunk" kép NEM változhat tőle — se a rögzítés, se a
      //     hatály tengelyén. A régi, egytengelyű „A" nézet itt 10.000 helyett 17.000-et mondott.
      const later = receipt({ idemKey: 'k2', qty: '7', effectiveAt: BIT.JUNE, at: BIT.JUNE });
      const viewA = balanceAt({ store, key, view: 'A', asOf: BIT.MARCH_LATER });
      const viewB = balanceAt({ store, key, view: 'B', asOf: BIT.MARCH_LATER });
      const viewJune = balanceAt({ store, key, view: 'B', asOf: BIT.JUNE });
      const viewX = balanceAt({ store, key, view: 'C', asOf: BIT.MARCH_LATER });
      const fOk = later.ok === true && viewA.ok && viewB.ok && viewJune.ok
        && viewA.text === '10.000' && viewB.text === '10.000' && viewJune.text === '17.000'
        && viewA.view_axes.length === 2 && viewB.view_axes.length === 1
        && viewX.ok === false && viewX.error === 'unknown_view';

      // ── A KÉT KORLÁT KÉT KÜLÖN KÉRDÉS (R10-F03) ─────────────────────────────────────────────
      //
      // A profil KÉT plafont visel: "maxPerMovement" (egy tétel mérete — ÜZLETI szabály) és
      // "maxTotal" (az összegzett egyenleg — SZÁMÍTÁSI biztonság). Ezért az ÖSSZEG-kaput NEM lehet
      // egyetlen óriási tétellel megszólítani: az már az ELSŐ kapun elakadna ("out_of_range"), és a
      // próba a MÁSIK kaput mérné, mint amit állít (KUKA-124/1). A mérés a DARABOS profilon megy,
      // ahol a két plafon aránya kicsi — így a kapu VALÓDI úton, tíz bevéttel elérhető.
      const pieceReceipt = ({ idemKey, qty, effectiveAt, at = BIT.JUNE }) => submitStockReceipt({
        store, idemKey, actor: 'gazda', bookId: 'a', ownerId: 'gazda', warehouseId: 'FO',
        input: { item_id: piece.itemId, qty, effective_at: effectiveAt }, clock: clockFrom(at),
      });
      // (m) A SÉMAVERZIÓ A KANONIKUS ÚTON (SVR-01 · R39). A külső fél lelete: a `submitStockReceipt`
      //     NEM vett át `version` argumentumot, tehát a felső szinten megnevezett verzió NÉMÁN
      //     eltűnt, és a bevét lefutott — miközben a `validateInput` külön hívva ugyanazt nevezett
      //     hibával utasította el. A mérés ezért a VALÓDI úton megy, és a HATÁST is visszaolvassa:
      //     az elutasításnak írás nélkül kell megállnia (KUKA-012 az íráson).
      const verCmdBefore = store.get('SELECT COUNT(*) AS n FROM command').n;
      const verMovBefore = store.get('SELECT COUNT(*) AS n FROM stock_movement').n;
      // SAJÁT CIKK a verzió-méréshez: a darabos cikk plafonját a lenti töltés PONTOSAN kimeríti,
      // tehát ha itt bevételeznénk rá, a SZOMSZÉD szakasz bukna el — nem a mért dolog miatt.
      const verItem = registerItem({ store, bookId: 'a', sku: 'VERZIO', unit: 'db', qtyProfile: 'qty-2', at: BIT.MARCH });
      const verKey = { bookId: 'a', itemId: verItem.itemId, ownerId: 'gazda', warehouseId: 'FO' };
      const verBalBefore = balanceAt({ store, key: verKey, view: 'B', asOf: BIT.JUNE }).text;
      const verBad = ['0', '2', {}].map((v, i) => submitStockReceipt({
        store, idemKey: `ver-bad-${i}`, actor: 'gazda', bookId: 'a', ownerId: 'gazda', warehouseId: 'FO',
        input: { item_id: verItem.itemId, qty: '1', effective_at: BIT.JUNE }, version: v, clock: clockFrom(BIT.JUNE),
      }));
      // A SZÁMLÁLÓT A ROSSZ HÍVÁSOK UTÁN, a JÓK ELŐTT olvassuk — a saját első alakom a jó hívások
      // UTÁN mért, és ezért „írást" látott ott, ahol az írás JOGOS volt (KUKA-054 a mérőn).
      const verCmdAfterBad = store.get('SELECT COUNT(*) AS n FROM command').n;
      const verMovAfterBad = store.get('SELECT COUNT(*) AS n FROM stock_movement').n;
      const verGoodPath = submitStockReceipt({
        store, idemKey: 'ver-ok-1', actor: 'gazda', bookId: 'a', ownerId: 'gazda', warehouseId: 'FO',
        input: { item_id: verItem.itemId, qty: '1', effective_at: BIT.JUNE }, version: '1', clock: clockFrom(BIT.JUNE),
      });
      const verSilentPath = submitStockReceipt({
        store, idemKey: 'ver-ok-2', actor: 'gazda', bookId: 'a', ownerId: 'gazda', warehouseId: 'FO',
        input: { item_id: verItem.itemId, qty: '1', effective_at: BIT.JUNE }, clock: clockFrom(BIT.JUNE),
      });
      let fillOk = true;
      for (let i = 0; i < 10; i += 1) {                // 10 × 1000 = 10 000 = PONTOSAN a plafon
        const r = pieceReceipt({ idemKey: 'fill-' + i, qty: '1000', effectiveAt: BIT.JUNE });
        if (!r.ok) { fillOk = false; break; }
      }
      const filled = balanceAt({ store, key: pieceKey, view: 'B', asOf: BIT.JUNE });

      // (g) ÖSSZEGKORLÁT — a tétel ÖNMAGÁBAN megengedett méretű (1000 = a tétel-plafon), az ÖSSZEG
      //     viszont túlcsordul. A visszautasítás TELJES: nincs mozgás, NINCS parancs-sor és NINCS
      //     nyugta (R10-F01: a régi alakban a parancs "finalized" maradt a nyugtájával, miközben a
      //     készlet nem mozdult). A mennyiség KANONIKUS alakja itt tizedes NÉLKÜLI — a cikk profilja
      //     dönt, nem az alapértelmezés.
      const cmdCountBefore = store.get('SELECT COUNT(*) AS n FROM command').n;
      const evCountBefore = store.get('SELECT COUNT(*) AS n FROM command_event').n;
      const over = pieceReceipt({ idemKey: 'k3', qty: '1001', effectiveAt: BIT.JUNE });      // tétel-plafon
      const overSum = pieceReceipt({ idemKey: 'k3b', qty: '1', effectiveAt: BIT.JUNE });     // ÖSSZEG-plafon
      const afterSum = balanceAt({ store, key: pieceKey, view: 'B', asOf: BIT.JUNE }).text;
      const gOk = fillOk && filled.ok === true && filled.text === '10000' && filled.profileId === 'qty-2'
        && over.ok === false && over.error === 'out_of_range'
        && overSum.ok === false && overSum.error === 'sum_out_of_range'
        && afterSum === filled.text
        && store.get('SELECT COUNT(*) AS n FROM command').n === cmdCountBefore
        && store.get('SELECT COUNT(*) AS n FROM command_event').n === evCountBefore
        && !store.get('SELECT 1 AS x FROM command WHERE idem_key = ?', 'k3b');

      // A VERZIÓ-HATÁR ÍTÉLETE (SVR-01 · R39): a három érvénytelen verzió NEVEZETTEN elakad, és
      // SEMMIT nem ír (se parancs, se mozgás, se egyenleg-változás); a megnevezett JÓ verzió és a
      // verziót NEM nevező hívás egyaránt átmegy, a regiszter/megerősítés megkülönböztetésével.
      const mOk = verBad.every((r) => r.ok === false && r.error === 'unsupported_schema_version')
        && verCmdAfterBad === verCmdBefore && verMovAfterBad === verMovBefore
        && verGoodPath.ok === true && verSilentPath.ok === true
        && balanceAt({ store, key: verKey, view: 'B', asOf: BIT.JUNE }).text === '2';

      // (h) A VISSZADÁTUMOZÁS NEM KERÜLI MEG A KORLÁTOT (R10-F03). A MÁRCIUSI kép ÜRES, tehát a régi,
      //     csak-a-hatályra-néző kapu ezt a tételt ÁTENGEDTE volna — a JÚNIUSI képet viszont a plafon
      //     fölé vitte volna, és onnantól az egyenleg SEMMILYEN nézetben nem lett volna számítható.
      //     A kapu ezért a LEGKÉSŐBBI ismert pontot méri, nem a bevét hatályát.
      const marchLocal = balanceAt({ store, key: pieceKey, view: 'B', asOf: BIT.MARCH_LATER });
      const wouldFitInMarch = marchLocal.ok === true && marchLocal.text === '0';
      const backdated = pieceReceipt({ idemKey: 'k5', qty: '1', effectiveAt: BIT.MARCH });
      const hOk = wouldFitInMarch && backdated.ok === false && backdated.error === 'sum_out_of_range'
        && backdated.detail.includes(BIT.JUNE);        // a mondat KIMONDJA, melyik pontra mért

      // (i) A TÁROLÓ ŐRZI A KÖTÉST, NEM A JS-ÍRÓ (a SAJÁT leletem). A séma fejléce azt ÁLLÍTOTTA,
      //     hogy „árva mozgás-sor nem születhet, és az atomiság MÉRHETŐ, nem ígéret" — mérve viszont
      //     semmilyen őr nem állt az "effect_id" mögött, a kötést kizárólag a JS-oldali író tartotta.
      //     Ez a KUKA-050 a sémán: a leíró mondat ÁLLÍTÁS, és az állítást mérni kell. Itt a NYERS
      //     tárolási utat próbáljuk, amit egy jövőbeli MÁSODIK író is használna (KUKA-013).
      const rawInsert = (effect) => {
        try {
          store.run('INSERT INTO stock_movement (book_id, item_id, owner_id, warehouse_id, qty_scaled, qty_profile, effect_id, recorded_at, effective_at) '
            + 'VALUES (?,?,?,?,?,?,?,?,?)',
            'a', item.itemId, 'gazda', 'FO', '5000', 'qty-1', effect, BIT.MARCH, BIT.MARCH);
          return 'ÁTMENT';
        } catch (e) { return String(e && e.message || e); }
      };
      const orphan = rawInsert('eff_NINCS_ILYEN');
      // Nyugta NÉLKÜLI, de véglegesített parancs: KÜLÖN válasz, nem ugyanaz, mint a hiányzó parancs.
      store.run('INSERT INTO command VALUES (?,?,?,?,?,?,?,?,?,?)',
        'k_nyugta_nelkul', 'gazda', 'a', 'stock.receipt', '1', 'h_x', '{}', 'eff_nyugta_nelkul', 'finalized', BIT.MARCH);
      const noReceipt = rawInsert('eff_nyugta_nelkul');
      const tryWrite = (sql) => { try { store.run(sql); return 'ÁTMENT'; } catch (e) { return 'ELUTASÍTVA'; } };
      const upd = tryWrite("UPDATE stock_movement SET qty_scaled = '1' WHERE id = 1");
      const del = tryWrite('DELETE FROM stock_movement WHERE id = 1');
      const iOk = orphan.includes('unknown_effect') && noReceipt.includes('receipt_missing')
        && upd === 'ELUTASÍTVA' && del === 'ELUTASÍTVA';

      return {
        expected: 'a nyers író NINCS exportálva · a bevét parancsot+nyugtát+mozgást EGYÜTT szül · az '
          + 'ismétlés nem könyvel újra, a más hatókörű kulcs ÜTKÖZIK · idegen könyv cikke nevezett '
          + 'elutasítás írás nélkül · az „A" nézet MINDKÉT tengelyen szűr · a túllépés TELJESEN '
          + 'visszagördül · a visszadátumozás a KÉSŐBBI állapotra is mérve van',
        actual: 'exportok=' + exported.join(',') + ' · bevét=' + (ok1.ok ? 'ok' : ok1.error)
          + ' · ismétlés=' + (again.replayed ? 'replay' : again.error) + ' mozgások=' + movAfterReplay.n
          + ' · más raktár=' + otherWh.error + ' · idegen könyv=' + cross.error
          + ' · A=' + viewA.text + '(' + viewA.view_axes.join('+') + ') B=' + viewB.text
          + '(' + viewB.view_axes.join('+') + ') június-B=' + viewJune.text + ' ismeretlen=' + viewX.error
          + ' · feltöltve=' + filled.text + '(' + filled.profileId + ')'
          + ' · tétel-plafon=' + over.error + ' összeg-plafon=' + overSum.error
          + ' parancs-sor=' + (store.get('SELECT 1 AS x FROM command WHERE idem_key = ?', 'k3b') ? 'MARADT' : 'nincs')
          + ' egyenleg=' + filled.text + '/' + afterSum
          + ' · márciusi kép=' + marchLocal.text + ' visszadátumozás=' + backdated.error
          + ' · tároló-őr: árva=' + orphan.slice(0, 40) + ' nyugta nélkül=' + noReceipt.slice(0, 40)
          + ' módosítás=' + upd + ' törlés=' + del,
        pass: aOk && bOk && cOk && dOk && eOk && fOk && gOk && hOk && iOk && mOk,
        asserts: {
          'A-KSZ-no-raw-writer-bypasses-the-command-path': aOk,
          'A-KSZ-receipt-writes-command-receipt-and-movement-together': bOk,
          'A-KSZ-replay-does-not-book-twice': cOk,
          'A-KSZ-same-key-other-scope-is-a-conflict': dOk,
          'A-KSZ-item-of-another-book-is-refused-without-writing': eOk,
          'A-KSZ-two-time-views-filter-on-their-declared-axes': fOk,
          'A-KSZ-sum-limit-rolls-back-command-receipt-and-movement': gOk,
          'A-KSZ-backdating-cannot-bypass-the-sum-limit': hOk,
          'A-KSZ-the-store-itself-enforces-append-only-and-the-command-binding': iOk,
          'A-KSZ-schema-version-is-checked-on-the-canonical-path-without-writing': mOk,
        },
      };
    } finally { store.close(); }
  });

probe('P-AUT-object-neutral', 'MCS-2 · AUT-01 · R16/F16-01 · KUKA-083 · KUKA-084 · KUKA-058 · KUKA-124',
  'A JOG ELŐBB DÖNT: a jogosulatlan hívó UGYANAZT a választ kapja a hiányzó és az idegen objektumra, nulla mellékhatással — a valódi ok BEFELÉ, tartós naplóba megy',
  () => {
    const store = openStore();
    try {
      // ── A VILÁG: két könyv, négy szereplő ────────────────────────────────────────────────────
      //   gazda     — tagja az "a" könyvnek                     (JOGOS)
      //   idegen    — létező alany, SEHOL nincs tagsága         (kívülálló)
      //   bkonyves  — tagja a MÁSIK könyvnek ("b")              (más könyv tagja)
      //   visszavont— volt tagsága "a"-ban, VISSZAVONVA         (visszavont jog)
      store.run('INSERT INTO book VALUES (?,?)', 'a', 'A könyv');
      store.run('INSERT INTO book VALUES (?,?)', 'b', 'B könyv');
      for (const s2 of ['gazda', 'idegen', 'bkonyves', 'visszavont']) {
        store.run('INSERT INTO subject VALUES (?,?)', s2, 'person');
      }
      store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)', 'gazda', 'a', 'user', BIT.GRANT);
      store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)', 'bkonyves', 'b', 'user', BIT.GRANT);
      // A MEGVONÁS A FIXTÚRÁBAN KÖZVETLEN. A `revokeMembership` HATÁSKÖRHÖZ kötött (REV-N3a): eljáró
      // alany és `alter_right` felhatalmazás kell hozzá. Az ELSŐ alakom ezt elfelejtette, a hívás
      // némán nem hatott, és a „visszavont" hívó ÁTMENT a kapun — a saját mérésem buktatta ki
      // (KUKA-049: a fixtúra, ami nem állítja be az állapotot, nem ellenpélda). A megvont tagság
      // TÉNYÉT ezért a sorba írjuk; a megvonás ÚTJÁT külön próbák mérik.
      store.run('INSERT INTO membership VALUES (?,?,?,?,?)', 'visszavont', 'a', 'user', BIT.GRANT, BIT.FEBRUARY);

      const own = registerItem({ store, bookId: 'a', sku: 'SAJAT', unit: 'db', qtyProfile: 'qty-2', at: BIT.MARCH });
      const foreign = registerItem({ store, bookId: 'b', sku: 'IDEGEN', unit: 'db', qtyProfile: 'qty-2', at: BIT.MARCH });

      const call = (actor, itemId, idemKey, qty = '1') => submitStockReceipt({
        store, idemKey, actor, bookId: 'a', ownerId: 'gazda', warehouseId: 'FO',
        input: { item_id: itemId, qty, effective_at: BIT.MARCH }, clock: clockFrom(BIT.MARCH),
      });
      const counts = () => ({
        cmd: store.get('SELECT COUNT(*) AS n FROM command').n,
        ev: store.get('SELECT COUNT(*) AS n FROM command_event').n,
        mov: store.get('SELECT COUNT(*) AS n FROM stock_movement').n,
      });

      // ── (a) A NÉGY TILTOTT HÍVÓ × HÁROM OBJEKTUM-OSZTÁLY ─────────────────────────────────────
      //
      // A három osztály SZÁNDÉKOSAN fedi le a teljes kérdést: a hivatkozott azonosító (1) sehol nem
      // létezik, (2) a MÁSIK könyvben létezik, (3) ÉPPEN EBBEN a könyvben létezik. Ha bármelyik
      // kettő válasza eltér, a hívó megkülönböztette őket — és épp ez volt a lelet (R16/F16-01).
      const BEFORE = counts();
      const blocked = ['idegen', 'bkonyves', 'visszavont'];
      const answers = [];
      let n = 0;
      for (const actor of blocked) {
        for (const itemId of ['nincs-ilyen', foreign.itemId, own.itemId]) {
          n += 1;
          answers.push({ actor, itemId, res: call(actor, itemId, `t${n}`) });
        }
      }
      const AFTER = counts();
      const texts = answers.map((x) => JSON.stringify(x.res));
      const uniform = new Set(texts).size === 1;
      const sameShape = answers.every((x) => x.res === ACCESS_REFUSED);
      const noSideEffect = JSON.stringify(BEFORE) === JSON.stringify(AFTER)
        && BEFORE.cmd === 0 && BEFORE.ev === 0 && BEFORE.mov === 0;
      // A VÁLASZ NEM NEVEZI MEG AZ OBJEKTUMOT SEM KÓDDAL, SEM SZÖVEGGEL.
      const noObjectWords = !/unknown_item|item_belongs_to_another_book|IDEGEN|SAJAT/.test(texts[0])
        && !texts[0].includes(foreign.itemId) && !texts[0].includes(own.itemId) && !texts[0].includes('"b"');
      const aOk = uniform && sameShape && noSideEffect && noObjectWords && answers.length === 9;

      // ── (b) A JOGOS HÍVÓ RÉSZLETES DIAGNOSZTIKÁT KAP (a kapu nem FAL — KUKA-122) ──────────────
      //
      // Enélkül a javítás egy „mindent elutasítok" alakkal is teljesülne, és az ilyen kapu nem véd,
      // hanem ZÁR: a jogos munkát lehetetlenné teszi (KUKA-092).
      const okOwn = call('gazda', own.itemId, 'jo1');
      const okMissing = call('gazda', 'nincs-ilyen', 'jo2');
      const okForeign = call('gazda', foreign.itemId, 'jo3');
      const bOk = okOwn.ok === true
        && okMissing.ok === false && okMissing.error === 'unknown_item'
        && okForeign.ok === false && okForeign.error === 'item_belongs_to_another_book'
        && typeof okForeign.detail === 'string' && okForeign.detail.length > 0;

      // ── (c) A VALÓDI OK BEFELÉ MEGVAN, ÉS MEG IS KÜLÖNBÖZTET (KUKA-058) ──────────────────────
      //
      // A kifelé menő válasz szándékosan egyforma; ettől az üzemeltető nem lehet vak. A belső sor
      // megnevezi a jogosultsági okot, alanyonként — és NEM a kiadási úton él (nincs olvasója ott).
      const log = recentRefusals(store, { bookId: 'a', limit: 100 });
      const byActor = (who) => log.filter((r) => r.subject_id === who);
      const cOk = log.length === 9
        && byActor('idegen').length === 3 && byActor('bkonyves').length === 3 && byActor('visszavont').length === 3
        && byActor('idegen')[0].reason === 'no_membership'
        && byActor('visszavont')[0].reason === 'membership_revoked'
        && log.every((r) => r.operation === 'stock.receipt' && r.op_class === 'own_book' && r.at === BIT.MARCH);

      // ── (d) A KAPU A LÁNC ELEJÉN ÁLL — a SÉMA-hiba sem szivárog ki a jogosulatlannak ──────────
      //
      // Ha a séma előbb futna, a válasz FAJTÁJA (`validation` vs. `not_available`) elárulná, hogy a
      // beadott alak megfelel-e a művelet szerződésének. A jogos hívó ugyanezt a hibás alakot
      // NEVEZETTEN kapja vissza — tehát a szigorítás nem vesz el semmit tőle.
      const badOutsider = submitStockReceipt({
        store, idemKey: 'rossz1', actor: 'idegen', bookId: 'a', ownerId: 'gazda', warehouseId: 'FO',
        input: { item_id: own.itemId, qty: true, szinezes: 'kek' }, clock: clockFrom(BIT.MARCH),
      });
      const badMember = submitStockReceipt({
        store, idemKey: 'rossz2', actor: 'gazda', bookId: 'a', ownerId: 'gazda', warehouseId: 'FO',
        input: { item_id: own.itemId, qty: true, szinezes: 'kek' }, clock: clockFrom(BIT.MARCH),
      });
      const dOk = badOutsider === ACCESS_REFUSED && badMember.ok === false && badMember.error === 'unknown_field';

      // ── (e) A PARANCS-ÚT ÉS A BEVÉT-ÚT UGYANAZT A TILTÁST ADJA (KUKA-039) ────────────────────
      //
      // Két külön mondat maga is csatorna volna: a hívó abból is megtudná, meddig jutott a kérése.
      const viaCommand = submitCommand({
        store, idemKey: 'parancs1', actor: 'idegen', bookId: 'a', type: 'proba', typeVersion: '1',
        declared: { x: 1 }, resolve: () => ({}), clock: clockFrom(BIT.MARCH),
      });
      const eOk = JSON.stringify(viaCommand) === JSON.stringify(ACCESS_REFUSED);

      return {
        expected: 'a jogosulatlan hívó HÁROM objektum-osztályra (hiányzó · idegen könyvbeli · saját könyvbeli) '
          + 'BÁJTRA azonos választ kap, nulla parancs/nyugta/mozgás mellett · a jogos hívó NEVEZETT, részletes '
          + 'diagnosztikát kap · a valódi ok a BELSŐ naplóban megvan és ott meg is különböztet · a séma-hiba sem '
          + 'szivárog ki a jogosulatlannak · a parancs-út ugyanazt a tiltást adja',
        actual: 'tiltott válaszok: ' + new Set(texts).size + ' különböző alak ' + (uniform ? '(egyforma)' : '(ELTÉR)')
          + ' · mellékhatás: parancs=' + AFTER.cmd + ' nyugta=' + AFTER.ev + ' mozgás=' + AFTER.mov
          + ' · jogos: saját=' + okOwn.ok + ' hiányzó=' + okMissing.error + ' idegen=' + okForeign.error
          + ' · belső napló: ' + log.length + ' sor (' + [...new Set(log.map((r) => r.reason))].sort().join('/') + ')'
          + ' · séma-hiba: kívülálló=' + (badOutsider.error) + ' tag=' + badMember.error
          + ' · parancs-út tiltás azonos=' + eOk,
        pass: aOk && bOk && cOk && dOk && eOk,
        asserts: {
          'A-AUT-unauthorized-cannot-distinguish-object-classes': aOk,
          'A-AUT-refusal-leaves-no-command-receipt-or-movement': noSideEffect,
          'A-AUT-authorized-caller-keeps-detailed-diagnostics': bOk,
          'A-AUT-true-reason-is-kept-inside-and-named': cOk,
          'A-AUT-schema-outcome-does-not-leak-to-the-unauthorized': dOk,
          'A-AUT-command-path-and-receipt-path-refuse-alike': eOk,
        },
      };
    } finally { store.close(); }
  });

probe('P-BEM-input-schema', 'MCS-2 · BEM-01 · MNY-01 · K10 · KUKA-122 · KUKA-124 · KUKA-125',
  'A bemeneti séma: ismeretlen művelet fail-closed · nevezett elutasítás mezőnként · a mennyiség hibakód-SORRENDJE megmarad · a konverzió nem előzi meg a típust',
  () => {
    // A TULAJDONOS ÉS A RAKTÁR NINCS A SÉMÁBAN: azok a hívó MEGBÍZHATÓ KÖRNYEZETÉBŐL jönnek
    // (KUKA-047), tehát a kérés törzsében küldve NEVEZETT `unknown_field` a válasz — lásd (g).
    const base = { item_id: 'itm_1', qty: '1.000', effective_at: BIT.MARCH };
    const V = (patch, op = 'stock.receipt') => validateInput({ operation: op, input: patch === null ? null : { ...base, ...patch } });

    // (a) ISMERETLEN MŰVELET — fail-closed, a választhatók felsorolásával.
    const unknownOp = validateInput({ operation: 'stock.teleport', input: base });
    // (j) A ZÁRT REGISZTER TÉNYLEG ZÁRT (R37/F37-02). A régi alak `OPERATION_SCHEMAS[operation]`-t
    // olvasott, ami az ÖRÖKÖLT tulajdonságot is megtalálja: `toString` · `constructor` · `__proto__`
    // mellett a kapu ÁTENGEDETT, és a hívás nyers `TypeError`-ral szállt el — nem nevezett
    // elutasítással (KUKA-020). A nem-szöveg nevet is mérjük, mert az sem művelet.
    const inherited = ['toString', 'constructor', '__proto__'].map((op) => {
      try { return validateInput({ operation: op, input: base }); } catch (e) { return { threw: String(e && e.message) }; }
    });
    const badNameTypes = [42, {}, null, undefined, ['stock.receipt']].map((op) => {
      try { return validateInput({ operation: op, input: base }); } catch (e) { return { threw: String(e && e.message) }; }
    });
    // (k) A SÉMAVERZIÓ TULAJDONOSA A REGISZTER (SVR-01). A beadó legfeljebb MEGERŐSÍT; eltérő,
    // korábbi vagy ismeretlen verzió NEVEZETT elutasítás — hallgatólagos átértelmezés nincs.
    const verSilent = validateInput({ operation: 'stock.receipt', input: base });
    const verConfirm = validateInput({ operation: 'stock.receipt', input: base, version: '1' });
    const verOlder = validateInput({ operation: 'stock.receipt', input: base, version: '0' });
    const verNewer = validateInput({ operation: 'stock.receipt', input: base, version: '2' });
    const verShape = validateInput({ operation: 'stock.receipt', input: base, version: {} });
    // (l) A TESTVÉR-ZÁRT REGISZTEREK (CLR-01, R37). A külső fél a BEMENETI sémán találta meg a rést;
    // megmérve UGYANEZ élt a mennyiség-profilon (`toString` ⇒ nyers „Cannot convert undefined to a
    // BigInt") és a korlát-szerződésen. A javítás ezért SZABÁLY, nem egy fájl (KUKA-039): egy közös
    // feloldó, és MINDHÁROM regisztert ugyanúgy mérjük — a jogos névnek pedig működnie kell.
    const inheritedNames = ['toString', 'constructor', '__proto__'];
    // A SZTRINGESÍTHETŐ ÁLNÉV. A saját mutációm (M162) ELŐSZÖR TÚLÉLT, mert a típus-ellenőrzés
    // kivétele a próbáim bemenetein semmit nem változtatott — tehát az állítás VÉDTELEN volt arra a
    // visszalépésre (KUKA-054: a saját példám a saját előfeltevésemet igazolta). Megmérve a valódi
    // rés: `hasOwnProperty.call(REGISZTER, {toString:()=>'qty-2'})` **IGAZ**, mert a kulcs
    // szöveggé konvertálódik — a típus-ellenőrzés nélkül egy OBJEKTUM is lehetne érvényes NÉV.
    const aliasProfile = { toString: () => 'qty-2' };
    const aliasLimit = { toString: () => 'invite_issue' };
    const aliasOp = { toString: () => 'stock.receipt' };
    const qtyProfileRefused = inheritedNames.every((n) => {
      try { quantityProfile(n); return false; } catch (e) { return String(e.message).includes('ismeretlen mennyiség-profil'); }
    });
    const qtyProfileWorks = (() => { try { return quantityProfile('qty-2').id === 'qty-2'; } catch { return false; } })();
    const aliasProfileRefused = (() => {
      try { quantityProfile(aliasProfile); return false; } catch (e) { return String(e.message).includes('ismeretlen mennyiség-profil'); }
    })();
    const limitRefused = inheritedNames.every((n) => {
      try { return requiredAxesFor(n) === null; } catch { return false; }
    });
    const limitWorks = Array.isArray(requiredAxesFor('invite_issue'));
    const aliasLimitRefused = (() => { try { return requiredAxesFor(aliasLimit) === null; } catch { return false; } })();
    const aliasOpRefused = (() => {
      try { const r = validateInput({ operation: aliasOp, input: base }); return r.ok === false && r.error === 'unknown_operation'; }
      catch { return false; }
    })();
    const viewRefused = inheritedNames.every((n) => {
      // A KULCS TELJES: a `stockKey` a nézet-kapu ELŐTT dob hiányos kulcsra, tehát csonka kulccsal
      // nem a mért dolgot mérnénk (a saját első alakom épp ezen bukott — KUKA-054).
      const r = balanceAt({ store: null, key: { bookId: 'b', itemId: 'i', ownerId: 'o', warehouseId: 'w' }, view: n, asOf: '2026-03-10T09:00:00Z' });
      return r && r.ok === false && r.error === 'unknown_view';
    });
    // (b) ISMERETLEN MEZŐ előbb dől el, mint a hiányzó.
    const unknownField = V({ szinezes: 'kek' });
    // (c) HIÁNYZÓ KÖTELEZŐ — külön válasz.
    const missing = validateInput({ operation: 'stock.receipt', input: { item_id: 'itm_1', qty: '1' } });
    // (d) A TÍPUS A NYERS ÉRTÉKEN — a "true" és a "[1]" NEM 1 (KUKA-125).
    const boolQty = V({ qty: true });
    const arrQty = V({ qty: ['1'] });
    const numQty = V({ qty: 1 });
    // (e) A MENNYISÉG KÉT SZAKASZA. Az A. szakasz (ez a réteg) PROFIL-FÜGGETLEN: csak azt kérdezi,
    //     szöveg-e és decimális alakú-e. Ami a PROFILTÓL függ — tizedesjegy · plafonok · pozitivitás
    //     · kanonikus alak —, az a B. szakasz, és ott dől el, ahol a CIKK ismert. A hibakódok az
    //     MNY-01-éi maradnak, nem lapulnak "invalid_type"-ra (R8 §2).
    const B = (patch, profileId) => bindQuantityProfile(V(patch), { profileId });
    const precision = B({ qty: '1.0000' }, 'qty-1');
    const range = B({ qty: '10000000' }, 'qty-1');
    const positive = B({ qty: '0.000' }, 'qty-1');
    // …és UGYANAZ a szöveg MÁS profillal MÁS választ kap: a darabos cikknél a tizedes hiba.
    const pieceDecimals = B({ qty: '1.000' }, 'qty-2');
    const pieceOk = B({ qty: '1000' }, 'qty-2');
    const profileMissing = bindQuantityProfile(V({ qty: '1' }), {});
    // (f) A JOGOS ALAK ÁTMEGY, és a mennyiség KANONIKUS szövegre normalizálódik.
    const good = B({ qty: '1' }, 'qty-1');
    const good2 = B({ qty: '1.000' }, 'qty-1');
    // A. szakasz UTÁN a mennyiség még NYERS, és a válasz ezt KI IS MONDJA (KUKA-015).
    const stageA = V({ qty: '1' });
    // (g) A NEM LÉTEZŐ NAPTÁRI IDŐPONT NEVEZETT elutasítás, nem alaki hiba (R10-F03) — és a jogos
    //     időpont KANONIKUS alakra normalizálódik, mert a főkönyv SZÖVEG szerint rendez (KUKA-029).
    const fakeDay = V({ effective_at: '2026-99-99T99:99:99Z' });
    const fakeFeb = V({ effective_at: '2026-02-30T10:00:00Z' });
    const badShape = V({ effective_at: '2026-03-10 09:00:00' });
    const canonTime = V({ effective_at: '2026-03-10T09:00:00Z' });
    // (h) A KONTEXTUS-MEZŐ A TÖRZSBEN: nem néma eldobás, hanem nevezett válasz (KUKA-041).
    const contextInBody = V({ warehouse_id: 'FO' });

    const aOk = unknownOp.ok === false && unknownOp.error === 'unknown_operation';
    const bOk = unknownField.ok === false && unknownField.error === 'unknown_field' && unknownField.at === 'szinezes';
    const cOk = missing.ok === false && missing.error === 'missing_field' && missing.at === 'effective_at';
    const dOk = boolQty.error === 'not_a_string' && arrQty.error === 'not_a_string' && numQty.error === 'not_a_string';
    const eOk = precision.error === 'precision' && range.error === 'out_of_range' && positive.error === 'must_be_positive';
    // A PROFIL-KÖTÉS ÖNÁLLÓ ÁLLÍTÁS, nem a hibakód-sorrend része: az egyik a SORRENDET méri, a másik
    // azt, hogy a mennyiség JELENTÉSE a cikké. Egy összevont pipa bukása nem igazolná mindkettőt
    // (R55/F02 lecke — KUKA-039 a bizonyítékon).
    const iOk = pieceDecimals.ok === false && pieceDecimals.error === 'precision'
      && pieceOk.ok === true && pieceOk.value.qty === '1000' && pieceOk.qty_profile === 'qty-2'
      && profileMissing.ok === false && profileMissing.error === 'profile_required';
    const fOk = good.ok === true && good.value.qty === '1.000' && good2.ok === true && good2.value.qty === '1.000'
      && canonicalQuantity('1', { positive: true }) === canonicalQuantity('1.000', { positive: true })
      && stageA.ok === true && stageA.value.qty === '1' && stageA.profile_bound === false
      && stageA.quantity_fields.includes('qty');
    const gOk = fakeDay.ok === false && fakeDay.error === 'invalid_calendar' && fakeDay.at === 'effective_at'
      && fakeFeb.ok === false && fakeFeb.error === 'invalid_calendar'
      && badShape.ok === false && badShape.error === 'invalid_format'
      && canonTime.ok === true && canonTime.value.effective_at === '2026-03-10T09:00:00.000Z';
    const hOk = contextInBody.ok === false && contextInBody.error === 'unknown_field'
      && contextInBody.at === 'warehouse_id';
    const jOk = inherited.every((r) => r && r.ok === false && r.error === 'unknown_operation')
      && badNameTypes.every((r) => r && r.ok === false && r.error === 'unknown_operation');
    const lOk = qtyProfileRefused && qtyProfileWorks && limitRefused && limitWorks && viewRefused
      && aliasProfileRefused && aliasLimitRefused && aliasOpRefused;
    const kOk = verSilent.ok === true && verSilent.version_chosen_by === 'register'
      && verConfirm.ok === true && verConfirm.version_chosen_by === 'request_confirmed'
      && verOlder.ok === false && verOlder.error === 'unsupported_schema_version'
      && verNewer.ok === false && verNewer.error === 'unsupported_schema_version'
      && verShape.ok === false && verShape.error === 'unsupported_schema_version';
    return {
      expected: 'az ÖRÖKÖLT tulajdonság-név és a nem-szöveg név NEVEZETT unknown_operation (nem kivétel) · '
        + 'a sémaverziót a REGISZTER választja, a beadó legfeljebb megerősít, eltérőre nevezett elutasítás · '
        + 'ismeretlen művelet fail-closed · ismeretlen mező ELŐBB, mint a hiányzó · a típus a NYERS '
        + 'értéken (true és [1] NEM 1) · a mennyiség hibakód-sorrendje megmarad · a jogos alak kanonizálódik · '
        + 'a nem létező naptári nap NEVEZETT elutasítás és az időpont kanonizálódik · a kontextus-mező a '
        + 'törzsben nevezett elutasítás, nem néma eldobás',
      actual: 'művelet=' + unknownOp.error + ' · ismeretlen mező=' + unknownField.error + '@' + unknownField.at
        + ' · hiányzó=' + missing.error + '@' + missing.at
        + ' · típus: true=' + boolQty.error + ' [1]=' + arrQty.error + ' 1=' + numQty.error
        + ' · sorrend: ' + precision.error + '/' + range.error + '/' + positive.error
        + ' · profil: qty-2 tizedes=' + pieceDecimals.error + ' qty-2 jó=' + pieceOk.value?.qty
        + ' profil nélkül=' + profileMissing.error + ' A-szakasz nyers=' + stageA.value?.qty
        + ' · kanonikus: "1"→' + good.value?.qty + ' "1.000"→' + good2.value?.qty
        + ' · naptár: 99-99=' + fakeDay.error + ' febr.30=' + fakeFeb.error + ' alak=' + badShape.error
        + ' idő-kanonizálás=' + canonTime.value?.effective_at
        + ' · kontextus a törzsben=' + contextInBody.error + '@' + contextInBody.at
        + ' · örökölt név: ' + inherited.map((r) => r.error || ('KIVÉTEL:' + r.threw)).join('/')
        + ' · rossz típusú név: ' + badNameTypes.map((r) => r.error || ('KIVÉTEL:' + r.threw)).join('/')
        + ' · verzió: néma=' + verSilent.version_chosen_by + ' megerősített=' + verConfirm.version_chosen_by
        + ' korábbi=' + verOlder.error + ' újabb=' + verNewer.error + ' rossz alak=' + verShape.error
        + ' · testvér-regiszterek örökölt névre: profil=' + qtyProfileRefused + ' korlát=' + limitRefused
        + ' nézet=' + viewRefused + ' (a jogos név működik: profil=' + qtyProfileWorks + ' korlát=' + limitWorks + ')'
        + ' · SZTRINGESÍTHETŐ álnév elutasítva: profil=' + aliasProfileRefused + ' korlát=' + aliasLimitRefused
        + ' művelet=' + aliasOpRefused,
      pass: aOk && bOk && cOk && dOk && eOk && fOk && gOk && hOk && iOk && jOk && kOk && lOk,
      asserts: {
        'A-BEM-unknown-operation-is-fail-closed': aOk,
        'A-BEM-unknown-field-decides-before-missing-field': bOk,
        'A-BEM-missing-required-field-is-its-own-answer': cOk,
        'A-BEM-type-is-checked-on-the-raw-value': dOk,
        'A-BEM-quantity-error-order-survives-the-boundary': eOk,
        'A-BEM-valid-input-normalizes-to-canonical-decimal-text': fOk,
        'A-BEM-nonexistent-calendar-instant-is-refused-and-canonicalized': gOk,
        'A-BEM-context-field-in-the-body-is-a-named-refusal': hOk,
        'A-BEM-quantity-profile-is-bound-where-the-item-is-known': iOk,
        'A-BEM-inherited-property-name-is-not-an-operation': jOk,
        'A-BEM-schema-version-is-owned-by-the-register-not-the-submitter': kOk,
        'A-CLR-every-closed-registry-refuses-inherited-names': lOk,
      },
    };
  });

// ════════════════════════════════════════════════════════════════════════════════════════════════
// A FORRÁS KÖNYVTÁRA — a K10-TYP-c próba a KATALÓGUS forrását olvassa vissza, hogy a „nincs
// publikus profilváltó művelet” állítás MÉRVE legyen, ne feltételezve (KUKA-038).
const REF_DIR = dirname(fileURLToPath(import.meta.url));

// R43 — A K10 KÖVETELMÉNYEK BIZONYÍTÁSA A MEGLÉVŐ REFERENCIÁN
//
// A külső ellenőrző fél (chatgpt-v3, R43) az összesítő javítását lezárta, és a MŰKÖDÉS mérését
// kérte: a termék azonossága ne függjön a megjelenítéstől vagy a mennyiségtől; egy régi tárolt
// mennyiség ne kapjon utólag más jelentést; az ismételt kérés ne könyveljen kétszer.
//
// A MUNKA SORRENDJE AZ Ő KIKÖTÉSÜK SZERINT: előbb MÉRTÜK a meglévő működést, és csak a mért
// hiányra írtunk kódot. Mérve: mind a négy klauzula viselkedése HELYES volt — a hiány a
// BIZONYÍTÉKBAN volt, nem a rendszerben. Ezért ez a négy próba nem javít, hanem BEKÖT.
// ════════════════════════════════════════════════════════════════════════════════════════════════

// ── R45/F45-01 — TELJES TARTALMI PILLANATKÉP, NEM DARABSZÁM ─────────────────────────────────────
//
// MI VOLT A BAJ (a KÜLSŐ ELLENŐRZŐ FÉL lelete, chatgpt-v3, R45/F45-01, a SAJÁT tárgyunkon
// reprodukálva). Az R44-es próbám a `command` · `command_event` · `stock_movement` DARABSZÁMÁT és
// EGYETLEN egyenleg-szöveget hasonlított — ráadásul csak a sorozat VÉGÉN. Ők a bevét-út elutasító
// ágán átírtak egy KORÁBBI esemény időpontját (`UPDATE command_event SET at = '1999-…'`), és a
// battéria mind az 58 próbája ZÖLD maradt. Én ezt a saját fámon megismételtem: a mérés `changes: 1`
// volt (tehát VALÓBAN átírt egy régi sort), az eredmény mégis 58/58 PASS.
//
// Ugyanaz a hiba-osztály, amit a KUKA-045 mond: a DARABSZÁM nem a tartalom. „Ugyanannyi sor" és
// „ugyanaz a sor" két különböző állítás, és a történet-megőrzés az utóbbiról szól.
//
// A JAVÍTÁS ALAKJA. A pillanatkép a három tábla MINDEN oszlopa, determinisztikus rendezésben — a
// tárolt nyugta/eredmény tartalmával (`command.resolved_json`) együtt —, és MINDEN egyes lépés után
// mérünk, nem csak a végén. Mezőt azért, hogy zöld maradjon, NEM szűrünk ki.
const HISTORY_TABLES = Object.freeze([
  Object.freeze({ table: 'command', order: 'book_id, actor, idem_key' }),
  Object.freeze({ table: 'command_event', order: 'book_id, actor, idem_key, event' }),
  Object.freeze({ table: 'stock_movement', order: 'book_id, item_id, owner_id, warehouse_id, effect_id, id' }),
]);
const historySnapshot = (store) => JSON.stringify(
  HISTORY_TABLES.map(({ table, order }) => [table, store.all(`SELECT * FROM ${table} ORDER BY ${order}`)]));

// A JOGOS ÚJ NAPLÓ-SOR ÉS A RÉGI SOR ÁTÍRÁSA KÉT KÜLÖN DOLOG (R45 kikötése). A kiadás-leltár
// (`disclosure`) az ISMÉTLÉSRE is ír — az Q15 szerint a visszajátszás IS kiadás —, tehát a napló
// JOGOSAN NŐ. Amit tilt a szerződés: a KORÁBBI sorok megváltozása. Ezért a napló mérce külön:
// HOZZÁFŰZÉS megengedett, ELŐZMÉNY-ÁTÍRÁS nem.
const auditTrail = (store) => store.all('SELECT * FROM disclosure ORDER BY id');
const appendedOnly = (before, after) => after.length >= before.length
  && JSON.stringify(after.slice(0, before.length)) === JSON.stringify(before);

// A FIGYELŐ: alapot vesz, és MINDEN lépés után visszamér. A `rebase` CSAK ott hívható, ahol a
// változás JOGOS (egy tényleges, sikeres új bevét) — az elutasítások és az ismétlések után soha.
const historyWatch = (store) => {
  let hist = historySnapshot(store);
  let audit = auditTrail(store);
  const drift = [];
  return {
    rebase: () => { hist = historySnapshot(store); audit = auditTrail(store); },
    check: (label) => {
      const h = historySnapshot(store); const a = auditTrail(store);
      if (h !== hist) drift.push(`${label}: a TÖRTÉNET TARTALMA megváltozott`);
      if (!appendedOnly(audit, a)) drift.push(`${label}: a napló KORÁBBI sora megváltozott`);
      audit = a;                       // a jogos ÚJ napló-sor megengedett, a régi átírása nem
      return h === hist;
    },
    clean: () => drift.length === 0,
    drift,
  };
};

const k10World = () => {
  const store = openStore();
  store.run('INSERT INTO book VALUES (?,?)', 'a', 'A könyv');
  store.run('INSERT INTO book VALUES (?,?)', 'b', 'B könyv');
  store.run('INSERT INTO subject VALUES (?,?)', 'gazda', 'person');
  store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)', 'gazda', 'a', 'user', BIT.GRANT);
  const send = (idemKey, input, version, itemBook = 'a') => submitStockReceipt({
    store, idemKey, actor: 'gazda', bookId: itemBook, ownerId: 'gazda', warehouseId: 'FO',
    input, version, clock: clockFrom(BIT.MARCH),
  });
  const counts = () => ({
    cmd: store.get('SELECT COUNT(*) AS n FROM command').n,
    ev: store.get('SELECT COUNT(*) AS n FROM command_event').n,
    mov: store.get('SELECT COUNT(*) AS n FROM stock_movement').n,
  });
  return { store, send, counts };
};

probe('P-KAT-identity-history', 'R32/K10 · K10-TYP-a · KUKA-027 · KUKA-021',
  'A cikk AZONOSSÁGA nem a megjelenítésé és nem a mennyiségé: a történeti hivatkozások megmaradnak',
  () => {
    const { store, send } = k10World();
    const it = registerItem({ store, bookId: 'a', sku: '050', unit: 'l', at: BIT.MARCH });
    const other = registerItem({ store, bookId: 'b', sku: '050', unit: 'kg', at: BIT.MARCH });

    // (a) A MENNYISÉG VÁLTOZÁSA nem mozdítja az azonosságot, és a történeti sorok végig EGY cikkre
    //     mutatnak — ez a klauzula lényege: az azonosító a tanú, nem a mennyiség.
    const r1 = send('i1', { item_id: it.itemId, qty: '10', effective_at: BIT.MARCH });
    const r2 = send('i2', { item_id: it.itemId, qty: '2.500', effective_at: BIT.MARCH });
    const stillSame = itemById(store, it.itemId);
    const refs = store.all('SELECT DISTINCT item_id FROM stock_movement');
    const aOk = r1.ok === true && r2.ok === true && stillSame && stillSame.item_id === it.itemId
      && refs.length === 1 && refs[0].item_id === it.itemId;

    // (b) UGYANAZ AZ SKU MÁSIK KÖNYVBEN MÁS CIKK — és a feloldás könyv nélkül fogalmi hiba.
    let bookless = null;
    try { itemBySku(store, null, '050'); } catch { bookless = 'DOBOTT'; }
    const bOk = other.itemId !== it.itemId && bookless === 'DOBOTT'
      && itemBySku(store, 'b', '050').item_id === other.itemId;

    // (c) A FORMÁZÁS nem azonosság: ugyanaz a jelentés MÁS alakban ugyanarra a cikkre és ugyanarra
    //     a PARANCS-azonosságra megy (a mennyiség kanonikus alakja dönt, nem a leírt szöveg).
    const fmt = send('i1', { item_id: it.itemId, qty: '10.000', effective_at: BIT.MARCH });
    const cOk = fmt.ok === true && fmt.replayed === true && fmt.effect_id === r1.effect_id;

    // (d) A MEGJELENÍTÉS MEGVÁLTOZTATÁSA NEM VÁLTOZTATJA AZ AZONOSÍTÓT — a mérhető alak az EGYSÉG,
    //     mert az a cikk kiírt tulajdonsága. Nulla lábnyomon szabad, és az azonosító ÁLL; a lábnyom
    //     fölött NEVEZETTEN tilos, mert az egység a mennyiség JELENTÉSE (KUKA-021).
    const fresh = registerItem({ store, bookId: 'a', sku: 'URES', unit: 'l', at: BIT.MARCH });
    const freeChange = changeItemUnit({ store, itemId: fresh.itemId, unit: 'ml' });
    const blocked = changeItemUnit({ store, itemId: it.itemId, unit: 'ml' });
    // A VISSZAOLVASÁS VÉDETTEN: ha a megjelenítés-váltás ELMOZDÍTANÁ az azonosítót, itt `null` jön —
    // és akkor az ÁLLÍTÁSNAK kell hamisra fordulnia, nem a próbának elszállnia (KUKA-187).
    const afterFree = itemById(store, fresh.itemId);
    const dOk = freeChange.ok === true && freeChange.changed === true
      && afterFree !== null && afterFree.item_id === fresh.itemId && afterFree.unit === 'ml'
      && blocked.ok === false && blocked.error === 'unit_change_needs_conversion';

    return {
      expected: 'a mennyiség változása és a formázás NEM mozdítja az azonosságot · a történeti sorok '
        + 'egy cikkre mutatnak · azonos SKU másik könyvben MÁS cikk · a kiírt tulajdonság változása '
        + 'nem írja át az azonosítót, lábnyom fölött pedig NEVEZETTEN tilos',
      actual: `történeti hivatkozás: ${refs.length} cikk · másik könyv: ${other.itemId !== it.itemId}`
        + ` · könyv nélkül: ${bookless} · formázás: replayed=${fmt.replayed} azonos hatás=${fmt.effect_id === r1.effect_id}`
        + ` · egység nulla lábnyomon: ${freeChange.reason} · lábnyom fölött: ${blocked.error}`,
      pass: aOk && bOk && cOk && dOk,
      asserts: {
        'A-K10-a-quantity-change-does-not-move-identity': aOk,
        'A-K10-a-same-sku-in-another-book-stays-a-different-item': bOk,
        'A-K10-a-formatting-is-not-identity': cOk,
        'A-K10-a-printed-property-change-does-not-rewrite-the-identifier': dOk,
      },
      // KIMONDOTT HATÁR (R43): a referenciában NINCS megjelenítési-név mező és NINCS átnevező
      // publikus művelet — mérve: az `item` táblán `item_id · book_id · sku · unit · qty_profile ·
      // created_at` áll, és az EGYETLEN `UPDATE item` az egység-váltás. A klauzula „megjelenítési
      // név" fordulatát ezért NEM állítjuk bizonyítottnak: nyers adatbázis-átírás nem igazolja egy
      // HIÁNYZÓ publikus művelet működését (KUKA-038).
    };
  });

probe('P-KSZ-canonical-input-boundary', 'R32/K10 · K10-TYP-b · KUKA-097 · KUKA-124 · R45/F45-01',
  'A bemeneti elutasítás a VALÓDI bevét-úton dől el, és a MEGLÉVŐ történetet sem írja át',
  () => {
    const { store, send, counts } = k10World();
    const it = registerItem({ store, bookId: 'a', sku: 'X', unit: 'l', at: BIT.MARCH });
    const base = { item_id: it.itemId, qty: '1', effective_at: BIT.MARCH };

    // ELŐZMÉNY KELL, KÜLÖNBEN A MÉRÉS ÜRES (R45/F45-01 · KUKA-093). Az „üres tárolón nem született
    // sor" állítás NEM bizonyítja, hogy a MEGLÉVŐ történet érintetlen marad: ahhoz előbb LENNIE
    // kell történetnek. Ezért a próba egy JOGOS bevéttel kezd, és az elutasításokat ARRA méri.
    const seed = send('seed', { item_id: it.itemId, qty: '4', effective_at: BIT.MARCH });
    const w = historyWatch(store);

    // MINDEN normatív rész a KANONIKUS úton (R43/2): a korábbi bizonyíték a `validateInput`
    // közvetlen hívásán állt — az a SAJÁT rétegünk, nem a felhasználó útja (KUKA-184 tanulsága).
    const cases = [
      ['missing_field', { item_id: it.itemId, effective_at: BIT.MARCH }],
      ['unknown_field', { ...base, szinezes: 'kek' }],
      ['unknown_field', { ...base, warehouse_id: 'FO' }],      // a KONTEXTUS-mező sem jöhet a törzsből
      ['not_a_string', { ...base, qty: 1 }],
      ['not_a_string', { ...base, qty: ['1'] }],
      ['not_a_string', { ...base, qty: true }],
      ['invalid_calendar', { ...base, effective_at: '2026-02-30T09:00:00Z' }],
      ['unknown_item', { ...base, item_id: 'itm_nincs' }],
    ];
    const got = cases.map(([want, input], i) => {
      const r = send(`c${i}`, input);
      // A TELJES TARTALOM MINDEN EGYES ELUTASÍTÁS UTÁN — nem a sorozat végén, és nem darabszámon.
      w.check(`${want} (${i}.)`);
      return { want, error: r.ok ? '(ÁTMENT)' : r.error, ok: r.ok === false && r.error === want };
    });
    const aOk = seed.ok === true && got.every((g) => g.ok) && w.clean();

    // A SÉMAVERZIÓ HATÁRA ugyanezen az úton (SVR-01) — és a JOGOS bevét működik.
    const ver = send('cv', base, '0');
    const verClean = w.check('nem támogatott sémaverzió');
    const movBeforeGood = counts().mov;
    const good = send('cg', base);
    const bOk = ver.ok === false && ver.error === 'unsupported_schema_version' && verClean
      && good.ok === true && counts().mov === movBeforeGood + 1;

    return {
      expected: 'mind a nyolc bemeneti hiba NEVEZETTEN elakad a VALÓDI bevét-úton, és a MEGLÉVŐ '
        + 'történet TELJES tartalma minden egyes elutasítás után változatlan · a nem támogatott '
        + 'sémaverzió ugyanitt elakad · a jogos bevét működik és EGY mozgást ír',
      actual: got.map((g) => `${g.want}→${g.error}`).join(' · ')
        + ` · verzió: ${ver.error} · jogos: ${good.ok ? 'ok' : good.error} · mozgás=${counts().mov}`
        + ` · tartalmi eltérés: ${w.drift.join(' | ') || 'nincs'}`,
      pass: aOk && bOk,
      asserts: {
        'A-K10-b-input-errors-are-named-on-the-canonical-path-without-writing': aOk,
        'A-K10-b-version-boundary-and-the-legitimate-receipt-coexist': bOk,
      },
      // KIMONDOTT HATÁR: ezen az úton a MŰVELET neve fix („stock.receipt"), tehát az „ismeretlen
      // művelet" ága itt fogalmilag nem szólítható meg — azt a `P-BEM-input-schema` méri a séma
      // határán. És ez a próba NEM zárja az OB-3 külső HTTP-/bizalmi határát: az nincs megépítve.
    };
  });

probe('P-MNY-stored-profile-history', 'R32/K10 · K10-TYP-c · KUKA-021 · KUKA-038',
  'A TÁROLT mennyiség a SAJÁT profilját viszi — profilváltás nem értelmezheti át a múltat',
  () => {
    const { store, send } = k10World();
    const L = registerItem({ store, bookId: 'a', sku: 'LITER', unit: 'l', at: BIT.MARCH });
    // A DARABOS CIKK NEM DÍSZ: egyetlen profillal a „a sor a SAJÁT profilját viszi" állítás
    // MÉRHETETLEN — egy beégetett `'qty-1'` ugyanúgy zöld lenne (KUKA-054: a fixtúra menjen SZEMBE
    // az előfeltevéssel). A saját M169 mutációm pontosan ezt találta meg.
    const D = registerItem({ store, bookId: 'a', sku: 'DARAB', unit: 'db', qtyProfile: 'qty-2', at: BIT.MARCH });
    const key = { bookId: 'a', itemId: L.itemId, ownerId: 'gazda', warehouseId: 'FO' };
    const keyD = { bookId: 'a', itemId: D.itemId, ownerId: 'gazda', warehouseId: 'FO' };
    send('p1', { item_id: L.itemId, qty: '10', effective_at: BIT.MARCH });
    send('p2', { item_id: L.itemId, qty: '2.500', effective_at: BIT.MARCH });
    send('p3', { item_id: D.itemId, qty: '7', effective_at: BIT.MARCH });

    // (a) A SOR SAJÁT PROFILT HORDOZ — nem a cikk MAI profilját olvassuk vissza rá, és nem is egy
    //     rendszer-alapértelmezést: a KÉT cikk sorai KÜLÖNBÖZŐ profilt hordoznak.
    const rows = store.all('SELECT qty_scaled, qty_profile FROM stock_movement WHERE item_id = ?', L.itemId);
    const rowsD = store.all('SELECT qty_scaled, qty_profile FROM stock_movement WHERE item_id = ?', D.itemId);
    const before = balanceAt({ store, key, view: 'B', asOf: BIT.MARCH });
    const beforeD = balanceAt({ store, key: keyD, view: 'B', asOf: BIT.MARCH });
    const aOk = rows.length === 2 && rows.every((r) => r.qty_profile === 'qty-1')
      && rowsD.length === 1 && rowsD[0].qty_profile === 'qty-2'
      && before.ok === true && before.text === '12.500' && before.profileId === 'qty-1'
      && beforeD.ok === true && beforeD.text === '7' && beforeD.profileId === 'qty-2';

    // (b) NINCS PUBLIKUS PROFILVÁLTÓ MŰVELET — mérve, nem feltételezve: a katalógus egyetlen
    //     `UPDATE item` írása az EGYSÉG-váltás, és az a `qty_profile`-hoz nem nyúl.
    const kat = readFileSync(join(REF_DIR, 'catalog.mjs'), 'utf8');
    const itemUpdates = (kat.match(/UPDATE item SET [a-z_]+/g) || []);
    const bOk = itemUpdates.length === 1 && itemUpdates[0] === 'UPDATE item SET unit'
      && !/qty_profile\s*=/.test(kat);

    // (c) A HATÁR, HA MÉGIS ELCSÚSZNA: nyers adatbázis-írással a cikk profilját átírva a
    //     visszaolvasás NEVEZETTEN elakad (`profile_mismatch`) — NEM ad más jelentést ugyanannak a
    //     tárolt számnak. KIMONDVA: ez az OLVASÓ határát bizonyítja, nem egy publikus profilváltást
    //     (R43: nyers fixtúra nem igazol hiányzó műveletet).
    store.run('UPDATE item SET qty_profile = ? WHERE item_id = ?', 'qty-2', L.itemId);
    const after = balanceAt({ store, key, view: 'B', asOf: BIT.MARCH });
    const rowsAfter = store.all('SELECT qty_scaled, qty_profile FROM stock_movement WHERE item_id = ?', L.itemId);
    store.run('UPDATE item SET qty_profile = ? WHERE item_id = ?', 'qty-1', L.itemId);
    const back = balanceAt({ store, key, view: 'B', asOf: BIT.MARCH });

    // A MÉRET SZÁMÍT, ÉS EZ A KÜLSŐ FÉL LELETE (R45/F45-02). A fenti, 12.500-as tételen az idegen
    // profilra olvasás a MÁSIK korlátba (`total_out_of_range`) ütközik — tehát a próba zöld marad
    // attól is, hogy az őr NEM a profil-eltérést fogta meg: az elutasítás oka MÁS. Ezért kell egy
    // KIS mennyiségű tétel is, ahol az átértelmezés EGYIK korlátot sem sérti: `7.500` (scaled 7500)
    // idegen, tizedes nélküli profilon „7500"-nak olvasódna — ez a CSENDES átértelmezés a saját
    // alakjában, és csak itt látszik, hogy a nevezett `profile_mismatch` az, ami megállítja.
    const S = registerItem({ store, bookId: 'a', sku: 'KICSI', unit: 'l', at: BIT.MARCH });
    const keyS = { bookId: 'a', itemId: S.itemId, ownerId: 'gazda', warehouseId: 'FO' };
    send('s1', { item_id: S.itemId, qty: '5', effective_at: BIT.MARCH });
    send('s2', { item_id: S.itemId, qty: '2.500', effective_at: BIT.MARCH });
    const smallBefore = balanceAt({ store, key: keyS, view: 'B', asOf: BIT.MARCH });
    store.run('UPDATE item SET qty_profile = ? WHERE item_id = ?', 'qty-2', S.itemId);
    const smallDrift = balanceAt({ store, key: keyS, view: 'B', asOf: BIT.MARCH });
    store.run('UPDATE item SET qty_profile = ? WHERE item_id = ?', 'qty-1', S.itemId);
    const smallBack = balanceAt({ store, key: keyS, view: 'B', asOf: BIT.MARCH });

    const cOk = after.ok === false && after.error === 'profile_mismatch'
      && rowsAfter.every((r) => r.qty_profile === 'qty-1')           // a NYERS sorok érintetlenek
      && back.ok === true && back.text === '12.500'                   // és a jelentés visszatér
      && smallBefore.ok === true && smallBefore.text === '7.500'
      // A DÖNTŐ SOR: itt a néma „7500" fogalmilag lehetséges volna (egyik korlátba sem ütközik),
      // mégis NEVEZETT elutasítás jön — tehát a profil-eltérés őre az, ami megállítja.
      && smallDrift.ok === false && smallDrift.error === 'profile_mismatch'
      && smallBack.ok === true && smallBack.text === '7.500'

    return {
      expected: 'a tárolt sor a SAJÁT profilját viszi (KÉT profilon mérve: liter és darab) '
        + '· a magban NINCS publikus profilváltó művelet '
        + '· elcsúszott profil mellett a visszaolvasás NEVEZETTEN elakad, a nyers sorok érintetlenek, '
        + 'és a helyes profilon a jelentés VÁLTOZATLANUL tér vissza',
      actual: `L sor-profilok: ${rows.map((r) => r.qty_profile).join(',')} · előtte=${before.text}`
        + ` · D sor-profilok: ${rowsD.map((r) => r.qty_profile).join(',')} · D=${beforeD.ok ? beforeD.text : beforeD.error}`
        + ` · item-írók: ${itemUpdates.join('|') || '(egy sem)'}`
        + ` · elcsúszva=${after.ok ? after.text : after.error} · visszaállítva=${back.text}`
        + ` · KIS tétel (7.500): elcsúszva=${smallDrift.ok ? `„${smallDrift.text}" (NÉMA ÁTÉRTELMEZÉS!)` : smallDrift.error}`
        + ` · visszaállítva=${smallBack.ok ? smallBack.text : smallBack.error}`,
      pass: aOk && bOk && cOk,
      asserts: {
        'A-K10-c-stored-row-carries-its-own-profile': aOk,
        'A-K10-c-no-public-profile-change-operation-exists': bOk,
        'A-K10-c-mismatched-profile-is-a-named-refusal-not-a-reinterpretation': cOk,
      },
    };
  });

probe('P-KSZ-repeat-and-error-boundary', 'R32/K10 · K10-TYP-d · KUKA-097 · KUKA-026 · R45/F45-01 · R45/F45-02',
  'ISMÉTLÉS ÉS HIBAHATÁR: a TELJES történet-tartalom változatlan, nincs második hatás és nincs részleges írás',
  () => {
    const { store, send, counts } = k10World();
    const L = registerItem({ store, bookId: 'a', sku: 'LITER', unit: 'l', at: BIT.MARCH });
    const D = registerItem({ store, bookId: 'a', sku: 'DARAB', unit: 'db', qtyProfile: 'qty-2', at: BIT.MARCH });
    const keyL = { bookId: 'a', itemId: L.itemId, ownerId: 'gazda', warehouseId: 'FO' };

    // (1) JOGOS ELSŐ BEADÁS — ez az EGYETLEN pont, ahol a történet JOGOSAN nő.
    const first = send('k1', { item_id: L.itemId, qty: '10', effective_at: BIT.MARCH });
    const movAfterFirst = counts().mov;
    const w = historyWatch(store);                    // az alap: a MÁR MEGLÉVŐ történet tartalma

    // (2)–(6) ISMÉTLÉS ÉS ELUTASÍTÁSOK — MINDEGYIK UTÁN teljes tartalmi visszamérés (R45/F45-01):
    //        a köztes eltérés visszaállítása is lelet, ezért nem csak a sorozat végén nézünk.
    const repeat = send('k1', { item_id: L.itemId, qty: '10', effective_at: BIT.MARCH });
    w.check('azonos ismétlés');
    const reformat = send('k1', { item_id: L.itemId, qty: '10.000', effective_at: BIT.MARCH });
    w.check('azonos jelentés, MÁS formázás');
    const oldVer = send('k1', { item_id: L.itemId, qty: '10', effective_at: BIT.MARCH }, '0');
    w.check('korábbi sémaverzió');
    const otherProfile = send('k1', { item_id: D.itemId, qty: '10', effective_at: BIT.MARCH });
    w.check('más számítási profil, azonos kulcs');
    const overflow = send('k1', { item_id: L.itemId, qty: '99999999', effective_at: BIT.MARCH });
    w.check('bemeneti hibapont (tétel-plafon)');

    // (7) A KORÁBBI SIKER MEGMARADT — és ez sem ír át semmit.
    const stillThere = send('k1', { item_id: L.itemId, qty: '10', effective_at: BIT.MARCH });
    w.check('a korábbi siker visszajátszása');

    const aOk = first.ok === true && first.replayed !== true && movAfterFirst === 1;
    const bOk = repeat.ok === true && repeat.replayed === true && repeat.effect_id === first.effect_id
      && reformat.ok === true && reformat.replayed === true && reformat.effect_id === first.effect_id;
    const cOk = oldVer.ok === false && oldVer.error === 'unsupported_schema_version'
      && otherProfile.ok === false && otherProfile.error === 'idempotency_conflict'
      && overflow.ok === false && overflow.error === 'out_of_range';
    const dOk = w.clean() && stillThere.ok === true && stillThere.replayed === true
      && stillThere.effect_id === first.effect_id;

    // ── (8) A HATÁS VÉGREHAJTÁSA KÖZBEN FELLÉPŐ HIBA (R45/F45-02) ───────────────────────────────
    //
    // MI VOLT A BAJ. A fenti (6) hibapont a `bindQuantityProfile` ELŐZETES ellenőrzésén akad el,
    // tehát a parancs tranzakciójába BE SEM LÉP: érvényes bemeneti ellenpélda, de a RÉSZLEGES ÍRÁS
    // visszagörgetéséről semmit nem mond (a külső fél lelete).
    //
    // AMIT HELYETTE MÉRÜNK. A darabos cikk ÖSSZEG-korlátja (10 000) a MEGLÉVŐ atomi úton belül üt:
    // a tétel ÖNMAGÁBAN szabályos (1 000 = a tétel-plafon), az elakadás a `stockReceiptEffect`-ben
    // történik — MIUTÁN a parancs-sor és a NYUGTA már beíródott ugyanabban a tranzakcióban. Tehát
    // itt derül ki, hogy a visszagörgetés TELJES-e: a teljes tartalmi pillanatkép változatlan,
    // és a KORÁBBI siker megmarad. Új tranzakciós keretet nem építünk (R45 kikötése).
    const keyD = { bookId: 'a', itemId: D.itemId, ownerId: 'gazda', warehouseId: 'FO' };
    const fills = [];
    for (let i = 0; i < 10; i += 1) {
      fills.push(send(`fill${i}`, { item_id: D.itemId, qty: '1000', effective_at: BIT.MARCH }));
    }
    const filled = balanceAt({ store, key: keyD, view: 'B', asOf: BIT.MARCH });
    const w2 = historyWatch(store);                   // alap a TELJESEN feltöltött állapoton
    const inEffect = send('sum1', { item_id: D.itemId, qty: '1', effective_at: BIT.MARCH });
    const effectClean = w2.check('a HATÁS közben fellépő összeg-hiba');
    const afterEffect = balanceAt({ store, key: keyD, view: 'B', asOf: BIT.MARCH });
    const stillThere2 = send('k1', { item_id: L.itemId, qty: '10', effective_at: BIT.MARCH });
    w2.check('a korábbi siker a hatás-hiba UTÁN');
    const eOk = fills.every((r) => r.ok === true) && filled.ok === true && filled.text === '10000'
      && inEffect.ok === false && inEffect.error === 'sum_out_of_range'
      && effectClean && w2.clean()
      && !store.get('SELECT 1 AS x FROM command WHERE idem_key = ?', 'sum1')
      && afterEffect.ok === true && afterEffect.text === '10000'
      && stillThere2.ok === true && stillThere2.replayed === true
      && stillThere2.effect_id === first.effect_id;

    return {
      expected: 'első beadás EGY hatás · azonos és MÁS FORMÁZÁSÚ ismétlés ugyanazt a hatást adja · '
        + 'korábbi sémaverzió, más profil és a bemeneti hibapont NEVEZETTEN elakad · a TELJES '
        + 'történet-tartalom MINDEN lépés után változatlan (a napló csak HOZZÁFŰZ) · és a HATÁS '
        + 'közben fellépő hiba sem hagy részleges írást, a korábbi siker megmarad',
      actual: `első: mozgás=${movAfterFirst} · ismétlés: replayed=${repeat.replayed} azonos=${repeat.effect_id === first.effect_id}`
        + ` · formázás: replayed=${reformat.replayed} azonos=${reformat.effect_id === first.effect_id}`
        + ` · régi verzió=${oldVer.error} · más profil=${otherProfile.error} · bemeneti plafon=${overflow.error}`
        + ` · hatás-közbeni hiba=${inEffect.ok ? 'ÁTMENT(!)' : inEffect.error} · egyenleg=${afterEffect.ok ? afterEffect.text : afterEffect.error}`
        + ` · tartalmi eltérés: ${w.drift.concat(w2.drift).join(' | ') || 'nincs'}`
        + ` · a korábbi siker=${stillThere.replayed ? 'megvan' : 'ELVESZETT(!)'}`,
      pass: aOk && bOk && cOk && dOk && eOk,
      asserts: {
        'A-K10-d-first-submission-creates-exactly-one-effect': aOk,
        'A-K10-d-identical-and-reformatted-repeat-replay-the-same-effect': bOk,
        'A-K10-d-old-version-other-profile-and-error-point-are-named-refusals': cOk,
        'A-K10-d-refusals-leave-the-snapshot-and-the-earlier-success-intact': dOk,
        'A-K10-d-effect-time-failure-leaves-no-partial-write': eOk,
      },
    };
  });

const SOURCE_COMMIT = (() => {
  const arg = process.argv.find((a) => a.startsWith('--source-commit='));
  if (arg) return arg.slice('--source-commit='.length).trim() || null;
  return (process.env.V3REF_SOURCE_COMMIT || '').trim() || null;
})();

// ── A FORRÁS TARTALMI LENYOMATA — MÉRVE, NEM BEMONDVA (R45 P01) ─────────────────────────────────
//
// A külső fél a ténylegesen `71c69bb…` forráson futó programnak a RÉGI `c58f5f6…` commitot adta át
// `--source-commit`-ként, és a kimenet ezt „a mai forrásra érvényes"-nek mondta. A bemondott commit
// tehát nem forrás-azonosság, hanem PUSZTA ÁLLÍTÁS (a KUKA-056 alakja a forráson: az aláíró nem egy
// beírt szöveg). Innentől a futtató KISZÁMOLJA a saját forrás-csomagja tartalmi lenyomatát; a
// bemondott commit külön mezőben, KÜLÖN NÉVEN marad, és soha nem lép a mérés helyébe.

export function sourceDigest() {
  const files = readdirSync(REF_DIR).filter((f) => f.endsWith('.mjs')).sort();
  const h = createHash('sha256');
  for (const f of files) { h.update(f); h.update('\0'); h.update(readFileSync(join(REF_DIR, f))); h.update('\0'); }
  return { digest: `sha256:${h.digest('hex')}`, files };
}

// ── Futtatás ────────────────────────────────────────────────────────────────────────────────────
export function runAll() {
  const started = new Date().toISOString();
  const records = probes.map((p) => {
    // TÍPUSOS KIMENET (R45 §3): a bukott ÁLLÍTÁS és a próbán belüli KIVÉTEL két külön dolog.
    // A régi alak mindkettőt `FAIL`-be csomagolta, ezért egy idegen infrastruktúra-kivétel
    // ugyanúgy „bizonyítéknak" látszott, mint a nevezett állítás bukása (R45 H06).
    let r; let thrown = null;
    try { r = p.fn(); } catch (e) {
      thrown = {
        error_code: (e && (e.code || e.name)) || 'Error',
        phase: 'probe_body',
        message: (e && e.message) || String(e),
      };
      r = { expected: '(a próba állítása)', actual: `KIVÉTEL a próba testében: ${thrown.message}`, pass: false };
    }
    const status = thrown ? PROBE_STATUS.THREW : (r.pass ? PROBE_STATUS.PASS : PROBE_STATUS.FAIL);
    return {
      probe_id: p.id,
      maps_to: p.maps,
      title: p.title,
      // A BUKOTT ÁLLÍTÁS NEVE — enélkül nem eldönthető, hogy a MEGFELELŐ állítás bukott-e el.
      assertion_id: status === PROBE_STATUS.FAIL ? assertionOf(p.id) : null,
      // A PRÓBA ÁLTAL KIADOTT, NEVEZETT ÁLLÍTÁSOK (R53 §4/5). Ezekhez méri a norma-index a
      // klauzulák fedettségét: a manifest DEKLARÁLJA, a próba KIADJA, a kapu a kettő VISZONYÁT
      // nézi (KUKA-024). Ha a próba teste kivétellel állt meg, itt üres marad — a hiányzó állítás
      // nem lehet néma „teljesült".
      assertions: Object.entries((r && r.asserts) || {}).map(([id, ok]) => ({ id, pass: ok === true })),
      error_code: thrown ? thrown.error_code : null,
      error_message: thrown ? thrown.message : null,
      phase: thrown ? thrown.phase : null,
      norm_version: NORM_VERSION,
      norms: normsSummary(),
      impl_version: IMPL_VERSION,
      command: 'node v3ref/run.mjs',
      // A KÖRNYEZET MONDJA MEG, MI IGAZ RÁ. A tároló ephemer: valódi fájl, valódi séma, valódi
      // kényszerek és tranzakciók — de a napló a memóriában él és nincs lemez-szinkron, mert a
      // fájl a futás végén törlődik. Ez sebesség-döntés, és mivel a mérés hitelét érinti, KIÍRVA
      // áll, nem a kódban elrejtve (KUKA-015).
      environment: `node ${process.version} · node:sqlite · elkülönített ideiglenes fájl `
        + '(ephemer: journal_mode=MEMORY, synchronous=OFF — a kényszerek és a tranzakciók élnek, '
        + 'az összeomlás-tartósság nem, mert a tároló a futás végén törlődik)',
      initial_world: `determinisztikus óra ${T0}`,
      expected: r.expected,
      actual: r.actual,
      status,
      // A VÉGREHAJTÓ NEM ÉGETHETŐ BE (R42 §3/1). Korábban itt `'Claude-AUX'` állt, ezért a
      // rekord AKKOR IS a mi nevünket vitte, amikor a külső fél futtatta a saját gépén —
      // a bizonyíték a végrehajtójáról hazudott. Innentől a futtató mondja meg magáról, és ha
      // nem mondja, a rekord ezt KIMONDJA (`unknown`), nem tippel (KUKA-056: az aláíró EMBER,
      // nem egy beírt szöveg).
      executed_by: EXECUTED_BY,
      // Az ÖSSZESÍTŐ hitelesítés üresen marad: az R42 §1 szerint a hatókör nélküli pecsét
      // értelmetlen. A hatókörös felülvizsgálatok külön, nevesített rekordban élnek
      // (`v3ref/reviews.mjs`) — ott mindegyik megmondja, MEDDIG érvényes.
      verified_by: null,
      reviews: REVIEWS_FOR(p.id),
      // A MARADÉKOK MAI ÁLLÁSA. A vallomás a MEGÍRÁSA napjáról szól; ez mondja meg, mi lett vele
      // azóta — mondatonként, próbához kötve. Enélkül a lap a mai kódról állítana valótlant
      // (KUKA-050), mert a residual-ok NÉV SZERINT sorolják a Q01–Q15 ellenpéldákat.
      residual_standing: residualStandingFor(p.id),
      at: started,
    };
  });
  return records;
}

if (import.meta.url === `file://${process.argv[1]}`) main: {
  const records = runAll();
  const src = sourceDigest();

  // A MARADÉK-TÁBLA ÖNELLENŐRZÉSE — KAPU, nem felirat. Ha egy lezárt maradék nem létező mondatra
  // vagy nem létező próbára mutat, az ugyanaz a díszpipa, mint a hatókör nélküli pecsét volt
  // (KUKA-041) — csak nehezebb észrevenni, mert szövegesen meggyőző.
  const res = checkResolutions(EXPECTED_IDS);
  if (!res.ok) {
    console.error('\nA MARADÉK-TÁBLA HIBÁS — a lezárt maradékok nem hitelesek:');
    for (const p of res.problems) console.error(`  · ${p}`);
    // `exitCode`, NEM `exit()` — lásd a fájl végén álló SAJÁT LELETET (R77): a `process.exit()` a
    // CSŐRE még ki nem írt kimenetet ELVÁGJA, és a mérő ettől néma adatvesztésbe fut.
    process.exitCode = 2; break main;
  }

  // A NORMA-BIZONYÍTÉK KAPU (R53 §4) — a BIZONYÍTÉK-CSOMAGON, nem próbanév-listán.
  //
  // KÉT KÜLÖN HIBAOSZTÁLY, KÉT KÜLÖN KÖVETKEZMÉNY (KUKA-020):
  //   · szerkezeti hazugság (gazdátlan deklaráció, meg nem nevezett hiány, falszifikálatlan próba)
  //     ⇒ a REGISZTER hibás: 2-es kilépési kód;
  //   · bizonyíték-hiány EBBEN a futásban (bukott vagy kimaradt próba) ⇒ mért REGRESSZIÓ, amit a
  //     rekordok már kimondtak: a klauzula nem lesz fedett, a futás 1-essel zár.
  //
  // ÉS A KAPU NEM NÉMÍTJA EL A KIMENETET. A régi alak a JSON kiírása ELŐTT lépett ki, ezért egy
  // bukott próba mellett a hívó egyáltalán nem kapott eredménycsomagot — a mérő pedig „harness"
  // hibát látott ott, ahol valójában szabályos regresszió volt. A bizonyíték kimegy, azután dől el
  // a kilépési kód.
  // A TARTALMI JÓVÁHAGYÁS KÖTÉSEI (R57/F03): melyik FORRÁS- és MANIFEST-állapoton érvényes egy
  // review. Enélkül a jóváhagyás nem igazolható, tehát nem lehet `current` — és a teszt/kód
  // változása magától elavultat (ezt a külső fél E04 zárómondata kérte).
  const reviewBindings = { source_digest: src.digest, manifest_digest: manifestDigest() };
  const nrm = checkNorms({ probes: EXPECTED_PROBES, mutations: MUTATIONS, records, review_bindings: reviewBindings });
  // FUTÁSAZONOSÍTÓ: két futás eredménye ne legyen összekeverhető (R45 §2). A tartalmi lenyomatból
  // és az indulás idejéből származik, tehát nem véletlen — visszakereshető.
  const RUN_ID = `run_${createHash('sha256').update(src.digest).update(records[0] ? records[0].at : '')
    .digest('hex').slice(0, 16)}`;
  if (process.argv.includes('--json')) {
    const stale = staleFor(src.digest);
    console.log(JSON.stringify({
      // EGYETLEN KANONIKUS NORMA-VERZIÓ ÉS LENYOMAT (R53 §5), és KÜLÖN, saját verziószámmal a
      // bizonyíték-index sémája — hogy a kettőt ne lehessen összekeverni.
      norm_version: NORM_VERSION,
      // A SZERZŐDÉS LENYOMATA A SZERZŐDÉS ARTEFAKTUMÁBÓL JÖN (R55/F04) — és KÜLÖN áll az index
      // lenyomatától. Az R54-es alak a kettőt egy hash-be keverte, ezért a szerződés változása
      // nem látszott. A `source_document.text_digest: null` KIMONDOTT hiány, nem pótolt érték.
      norm_contract: contractRef(),
      evidence_index: { id: NORMS_INDEX_ID, schema: NORMS_INDEX_SCHEMA, digest: indexDigest() },
      // A TELJES LÁNC: norma → klauzula → állítás → próba → mutáció → eredmény (R53 §4/5).
      norm_evidence: {
        ok: nrm.ok,
        integrity_ok: nrm.integrity_ok,
        // A FÁZIS KIMONDVA (R55/F03/1): a magpróba a mutációs battéria ELŐTT fut, tehát a
        // falszifikációról itt nem nyilatkozunk — a klauzulák `falsification_pending` állapotúak.
        falsification_stage: nrm.falsification_stage,
        // A KÖTELEZŐ KÉSZLET ÁLLAPOTA a kimenet része (R57/F01) — az olvasó ne a lánc soraiból
        // fejtse vissza, hogy mit vállaltunk bizonyítottnak.
        required: nrm.required,
        integrity_problems: nrm.integrity_problems,
        evidence_problems: nrm.evidence_problems,
        norms: nrm.norms,
        chain: nrm.chain,
      },
      impl_version: IMPL_VERSION,
      manifest_version: MANIFEST_VERSION,
      expected_probe_ids: EXPECTED_IDS,
      run_id: RUN_ID,
      // A SZÜLŐ ÁLTAL KIOSZTOTT FUTÁS-JEL (R51/J5). A saját `run_id` a futás TARTALMÁBÓL
      // származik, tehát két azonos forrású futás azonos jelet adna — a szülő nem tudná
      // megkülönböztetni a MOSTANIT egy korábbi eredménytől. Ezt a jelet a hívó adja, mi csak
      // visszaadjuk; ha nincs, üres marad, és a szülő MÉRŐHIBÁNAK minősíti (fail-closed).
      run_token: process.env.V3REF_RUN_TOKEN ?? null,
      // MÉRT forrás-azonosság (a futtató SAJÁT számítása) — ez a bizonyíték.
      source_digest: src.digest,
      source_files: src.files,
      executed_by: EXECUTED_BY,
      // BEMONDOTT commit — a hívó ÁLLÍTÁSA, nem mérés. Külön néven áll, hogy ne lehessen
      // összekeverni a mérttel (R45 P01).
      declared_source_commit: SOURCE_COMMIT,
      source_commit: SOURCE_COMMIT,
      // A felülvizsgálatok érvényessége KIMONDVA: melyik nem a mai forrásra vonatkozik.
      review_binding: true
        ? (stale.length
          ? { status: 'stale', detail: stale.map((r) => `${r.probe_id}: ${r.stale}`) }
          : { status: 'current', detail: [] })
        : { status: 'unknown_source_commit', detail: ['a futtató nem mondta meg, melyik forrás-állapoton fut (--source-commit= vagy V3REF_SOURCE_COMMIT)'] },
      records,
    }, null, 2));
  } else {
    console.log('');
    console.log('V3 MAGREFERENCIA — PRÓBAFUTÁS (G5)');
    console.log('='.repeat(78));
    for (const r of records) {
      console.log(`  ${r.status.padEnd(11)} [${r.probe_id}] ${r.title}`);
      console.log(`        leképezés: ${r.maps_to}`);
      console.log(`        várt:      ${r.expected}`);
      console.log(`        mért:      ${r.actual}`);
    }
    const fails = records.filter((r) => r.status !== PROBE_STATUS.PASS).length;
    console.log('');
    console.log(`  Környezet: node ${process.version} · node:sqlite · elkülönített tároló (NEM a V2 adatbázisa)`);
    console.log(`  Futásazonosító: ${RUN_ID}`);
    console.log(`  Forrás-lenyomat (MÉRT): ${src.digest}  (${src.files.length} fájl)`);
    console.log(`  Bemondott commit (ÁLLÍTÁS, nem mérés): ${SOURCE_COMMIT || '(nem lett megadva)'}`);
    console.log(`RESULT: ${records.length - fails}/${records.length} PASS`);
    console.log('');
    console.log(`  Végrehajtó: ${EXECUTED_BY}${EXECUTED_BY === 'unknown' ? '  (nem lett megadva — a rekord ezt KIMONDJA, nem tippel)' : ''}`);
    const st = staleFor(SOURCE_COMMIT);
    console.log(`  Felülvizsgálat: ${SOURCE_COMMIT ? (st.length ? `ELÉVÜLT ${st.length} próbán (más forrás-állapot)` : 'a mai forrás-állapotra érvényes') : 'ISMERETLEN forrás-állapot — a hatókörös ítéletek érvényessége nem eldönthető'}`);
    console.log('  Az ÖSSZESÍTŐ hitelesítés (verified_by) üresen marad — az R42 §1 szerint a hatókör');
    console.log('  nélküli pecsét értelmetlen. A hatókörös ítéletek próbánként a rekordban állnak.');
    // A MARADÉKOK ÁLLÁSA — a szám a táblából jön, nem kézzel léptetjük (KUKA-045).
    const st6 = REVIEWS.map((r) => residualStandingFor(r.probe_id));
    const sum = (k) => st6.reduce((a, s) => a + s[k], 0);
    console.log('');
    console.log(`  Felülvizsgálati MARADÉKOK: ${sum('total')} mondat · ${sum('measured')} próbával mérve · `
      + `${sum('addressed_unmeasured')} javítva de MÉRETLEN · ${sum('open')} NYITOTT`);
    for (const s of st6.filter((x) => x.open > 0)) {
      for (const row of s.rows.filter((r) => r.state === 'open')) {
        console.log(`    NYITOTT [${s.probe_id}] „${row.clause.slice(0, 62)}${row.clause.length > 62 ? '…' : ''}"`);
      }
    }
    // A NORMÁK ÁLLÁSA A BIZONYÍTÉKBÓL — nem beírt `state` mezőből (R53 §4/3).
    const cov = nrm.chain.filter((c) => c.result === 'covered').length;
    const pend = nrm.chain.filter((c) => c.result === 'falsification_pending').length;
    console.log('');
    console.log(`  NORMA-BIZONYÍTÉK (${NORMS_INDEX_ID} · ${NORMS_INDEX_SCHEMA})`);
    console.log(`    szerződés: ${nrm.contract.version} · lenyomat ${nrm.contract.digest}`);
    console.log(`               hatókör: ${nrm.contract.digest_scope}`);
    console.log(`               a teljes normaszöveg lenyomata: ${nrm.contract.source_document.text_digest || 'NINCS MEG (a szöveg a külső félnél él)'}`);
    console.log(`    index:     ${nrm.index_digest}`);
    console.log(`    falszifikációs fázis: ${nrm.falsification_stage === 'measured' ? 'MÉRVE' : 'FÜGGŐBEN (a battéria külön fázis — `node v3ref/mutate.mjs`)'}`);
    console.log(`    ${cov} fedett · ${pend} állítás teljesült, falszifikáció függőben · ${nrm.chain.length} klauzula-sor összesen`);
    console.log(`    ${nrm.norms.map((n) => `${n.id}=${n.state}`).join(' · ')}`);
    for (const c of nrm.chain.filter((x) => x.result === 'covered')) {
      console.log(`    FEDVE    ${c.norm_id}/${c.clause_id} [${c.covers.join('+')}] → ${c.assertion_id} @ ${c.probe_id} (falszifikálta: ${c.falsified_by})`);
    }
    for (const c of nrm.chain.filter((x) => x.result === 'falsification_pending')) {
      console.log(`    FÜGGŐBEN ${c.norm_id}/${c.clause_id} [${c.covers.join('+')}] → ${c.assertion_id} @ ${c.probe_id} (kontroll-jelölt: ${c.mutation_candidates.join(', ')} — még nem futott)`);
    }
    for (const c of nrm.chain.filter((x) => x.result !== 'covered' && x.result !== 'falsification_pending')) {
      console.log(`    NYITOTT  ${c.norm_id}/${c.clause_id} [${c.covers.join('+')}] — ${c.result}${c.why ? `: ${String(c.why).slice(0, 88)}` : ''}`);
    }
    const reviewed = nrm.chain.filter((c) => c.content_review && c.content_review.state === 'current').length;
    console.log(`    TARTALMI FELÜLVIZSGÁLAT (OB-7): ${reviewed}/${nrm.chain.length} klauzula-soron van érvényes emberi jóváhagyás`);
    console.log('');
    console.log('  NYITOTT BLOKKOLÓK:');
    for (const b of OPEN_BLOCKERS) console.log(`    ${b.id} — ${b.title}`);
    // A LEZÁRÁS IS TÉNY: enélkül a megoldott blokkoló megkülönböztethetetlen volna az
    // elfelejtettől (KUKA-012). A gépi jel a sorban áll, nem a jóindulatban.
    if (CLOSED_BLOCKERS.length) {
      console.log('\n  LEZÁRT BLOKKOLÓK (a lezárás gépi jelével):');
      // A KIÍRÓ NEM FELTÉTELEZI AZ ALAKOT (BLK-01): ha egy bejegyzésből hiányzik egy kötelező mező,
      // azt MONDATBAN mondja ki, nem futásidejű hibával a jelentés közepén (KUKA-020 · KUKA-064).
      const shapeGaps = [...blockerShapeProblems(OPEN_BLOCKERS, 'open'), ...blockerShapeProblems(CLOSED_BLOCKERS, 'closed')];
      for (const b of CLOSED_BLOCKERS) console.log(`    ${b.id} — ${b.title}\n      lezárta: ${b.closed_in || '(hiányzik)'} · jel: ${String(b.guard || '(hiányzik)').split(' — ')[0]}`);
      if (shapeGaps.length) { console.log('    BLOKKOLÓ-ALAK HIBA:'); for (const g of shapeGaps) console.log(`      ${g}`); }
    }
  }

  if (!nrm.integrity_ok) {
    console.error('\nA NORMA-BIZONYÍTÉK INDEX HIBÁS — a regiszter magáról állít valótlant:');
    for (const p of nrm.integrity_problems) console.error(`  · ${p}`);
    process.exitCode = 2; break main;
  }
  // ── SAJÁT LELET (R77, a mutációs battéria futtatásakor) ──────────────────────────────────────
  //
  // ITT KORÁBBAN `process.exit(1)` ÁLLT, és ez NÉMA ADATVESZTÉS volt a MÉRŐ-eszközön. A `--json`
  // kimenet CSŐRE megy (a mutációs futtató `spawnSync`-kel hívja), a `process.exit()` viszont
  // AZONNAL leállítja a folyamatot: a csőbe még ki nem írt bájtok ELVESZNEK. Amíg a jelentés
  // elfért egy írás-adagban, semmi nem látszott; az R77-es három új próbával a JSON ~141 kB fölé
  // nőtt, és onnantól a gyermek-futások KIMENETE CSONKÁN érkezett — a szülő pedig
  // „értelmezhetetlen JSON" címen HARNESS_ERROR-t adott 76-ból 57 mutációra.
  //
  // A TANULSÁG (KUKA-051 · KUKA-089 a MÉRŐN): a hiba nem a kilépési kódban volt, hanem abban, hogy
  // a mérő-eszköz a SAJÁT NÖVEKEDÉSÉTŐL romlott el — a jelentés mérete a rendszerrel együtt nő, a
  // kiírás módja viszont nem nőtt vele. Jó hír, és ezt is kimondjuk: a csonka kimenet NEM zöldnek
  // látszott, hanem nevezett MÉRŐHIBÁNAK — a szerződés itt tartott (R59/F01).
  //
  // A HELYES ALAK: `process.exitCode`, és hagyjuk a futásidőt természetesen kifutni — így a
  // kiírás befejeződik, a kilépési kód pedig ugyanaz marad.
  if (records.some((r) => r.status !== PROBE_STATUS.PASS)) process.exitCode = 1;
}
