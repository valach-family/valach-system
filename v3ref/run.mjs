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
import { submitCommand, readCommandResult, commandRef, canonicalize, CanonError, recordCommandEvent, releasedFieldPaths } from './command.mjs';

export const NORM_VERSION = 'R32/K01-K16';
export const IMPL_VERSION = 'v3ref-0.1';

const T0 = '2026-09-09T08:00:00.000Z';

// ── Világ-építő: a KÉT VILÁG csak a védett tényben tér el (A04) ─────────────────────────────────
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
  return { store, clock };
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

      revokeMembership({ store: w.store, subjectId: 'sub_worker', bookId: 'book_a', clock: w.clock });
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
  return { store, clock };
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
      const out = CMD(w, { resolve: () => { revokeMembership({ store: w.store, subjectId: 'sub_alice', bookId: 'book_a', clock: w.clock }); return { price: 100 }; } });
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
      revokeMembership({ store: w.store, subjectId: 'sub_alice', bookId: 'book_a', clock: w.clock });
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
      const pulled = revokeMembership({ store: w.store, subjectId: 'sub_alice', bookId: 'book_a', clock: w.clock });
      const aliceNow = ask('sub_alice');
      // (b) MAR hatalyos (multbeli) => NEM hosszabbit
      w.store.run('UPDATE membership SET revoked_at = ? WHERE subject_id = ?', '2026-09-01T00:00:00.000Z', 'sub_carol');
      const already = revokeMembership({ store: w.store, subjectId: 'sub_carol', bookId: 'book_a', clock: w.clock });
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
      w.store.run('UPDATE invite SET expires_at = ? WHERE token = ?', '2026-09-09T09:00:00+02:00', 'tok_1');
      const obs = observeInvite({ store: w.store, token: 'tok_1', viewerSubjectId: 'sub_holder', clock: w.clock });
      const red = redeemInvite({ store: w.store, token: 'tok_1', actingSubjectId: 'sub_holder', newCredential: 'c', clock: w.clock });
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
      revokeMembership({ store: w.store, subjectId: 'sub_issuer', bookId: 'book_a', clock: w.clock });
      const noIssuer = redeemInvite({ store: w.store, token: 'tok_1', actingSubjectId: 'sub_invitee', clock: w.clock });
      const ok = foreign.ok === false && foreign.error === 'account_authentication_required'
        && revoked.ok === false && revoked.outcome === 'revoked_needs_decision'
        && stillOpen === null
        && noIssuer.ok === false && noIssuer.reason === 'issuer_right_withdrawn';
      return {
        expected: 'idegen alany=account_authentication_required · visszavont=revoked_needs_decision (meghívó ÉL) · kibocsátó joga elveszett=issuer_right_withdrawn',
        actual: `idegen=${foreign.error} · visszavont=${revoked.outcome} · meghívó felhasználva=${stillOpen !== null} · kibocsátó=${noIssuer.reason}`,
        pass: ok,
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
        const tx = w.store.tx;
        w.store.tx = (fn) => { mutate(w); return tx(fn); };
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
    const revoked = atBoundary((w) => revokeMembership({ store: w.store, subjectId: 'sub_issuer', bookId: 'book_a', clock: w.clock }));
    // (c) A KIBOCSÁTÓT a határon LEFOKOZZÁK — a delegálás-ellenőrzés KÜLÖN ok, nem ugyanaz (KUKA-039).
    const demoted = atBoundary((w) => w.store.run(
      "UPDATE membership SET role = 'user' WHERE subject_id = 'sub_issuer' AND book_id = 'book_a'"));

    // (d)+(e) A MEGHÍVÓ SAJÁT SORA mozdul a határon. Ez a KÜLÖN tengely: az (a)–(c) mind az ÓRÁT
    // vagy a TAGSÁG-táblát mozgatja, amit a kapu úgyis frissen olvas — tehát egyikük sem méri,
    // hogy a MEGHÍVÓ SORÁT is újra kell olvasni. A saját M31 rontásom pontosan itt ment át:
    // a kapu megvolt, csak az ELAVULT sort nézte (KUKA-051 — a nem mért rész ZÖLDNEK látszik).
    //   (d) VISSZAVONÁS: a kibocsátó a határon lejárttá teszi a meghívót. Elavult olvasással a
    //       régi, távoli lejáratot látná ⇒ TAGSÁG SZÜLETNE. Ez valódi jogsértés, nem alak-hiba.
    //   (e) KÖZBEN FELHASZNÁLTÁK: itt az ön-őrző `UPDATE` úgyis nulla sort ír, tehát tagság nem
    //       születik — de elavult olvasással a válasz KIVÉTEL lesz a nevezett elutasítás helyett.
    //       A programhiba nem lehet ugyanaz a válasz, mint a valódi „nem" (KUKA-020 · KUKA-064).
    const withdrawn = atBoundary((w) => w.store.run(
      "UPDATE invite SET expires_at = ? WHERE token = 'tok_1'", w.clock.now()));
    const takenMeanwhile = atBoundary((w) => w.store.run(
      "UPDATE invite SET redeemed_at = ? WHERE token = 'tok_1'", w.clock.now()));

    const blocked = (x) => x.r.ok === false && x.memberships === 0;
    const named = (x) => blocked(x) && x.r.threw !== true && !!x.r.reason;
    const ok = named(expired) && named(revoked) && named(demoted) && named(withdrawn) && named(takenMeanwhile)
      // A HÁROM ÖNÁLLÓ JOGALAP NEM OLVADHAT EGYBE: külön indokot kell adniuk (KUKA-020 · KUKA-064).
      && new Set([expired.r.reason, revoked.r.reason, demoted.r.reason]).size === 3
      // A (d) UGYANAZ a jogalap, mint az (a) — csak a sor felől mérve —, ezért AZONOS indokot vár.
      // Négy különböző indokot követelni itt az én kitalált többletem volna, nem a joghatár része.
      && withdrawn.r.reason === expired.r.reason
      && takenMeanwhile.r.reason === 'invite_already_redeemed';
    return {
      expected: 'mind az öt határ-eset: ok=false · NULLA új tagság · NEVEZETT indok (nem kivétel); '
        + 'három önálló jogalap három indokkal; a sor felőli visszavonás az ablak indokát adja',
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
    const c = mk(); const txc = c.store.tx;
    c.store.tx = (fn) => { revokeMembership({ store: c.store, subjectId: 'sub_alice', bookId: 'book_a', clock: c.clock }); return txc(fn); };
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
  'A PARANCS-oldal mindhárom ága zár a tx-határon visszavont joggal — nulla sor, nulla leltár',
  () => {
    const mk = () => {
      const store = openStore(); const clock = clockFrom(T0);
      store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_alice', 'person');
      store.run('INSERT INTO book (id, name) VALUES (?,?)', 'book_a', 'A');
      store.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
        'sub_alice', 'book_a', 'admin', clock.now());
      return { store, clock };
    };
    const pull = (w) => revokeMembership({ store: w.store, subjectId: 'sub_alice', bookId: 'book_a', clock: w.clock });

    // MIND A HÁROM ÁG A TRANZAKCIÓ BELÉPÉSÉNÉL KAPJA A MEGVONÁST (R51/J1 — javítva).
    //
    // AZ ELSŐ ALAKOM ITT TÉVEDETT, ÉS A TÉVEDÉST KI IS ADTAM ÁLLÍTÁSKÉNT. Az Y2/Y3 ágat úgy
    // mértem, hogy a megvonás a HÍVÁS ELŐTT történt — azt a tranzakción KÍVÜLI ellenőrzés úgyis
    // elkapja. Ebből azt a következtetést írtam az R50-be, hogy „az ismétlés és az olvasás ezen a
    // határon MÁR ZÁRVA VAN". A külső fél N08/N09 esete megcáfolta: a `store.tx` BELÉPÉSÉNÉL
    // beavatkozva mindkettő KIADOTT — az olvasás a védett tartalmat is. Gyengébb esetet mértem, és
    // az erősebb állítást írtam le (KUKA-094). Innentől mind a három ág UGYANAZT a beavatkozást
    // kapja, tehát a próba a VALÓDI határt méri.
    const atBoundary = (w) => { const orig = w.store.tx; w.store.tx = (fn) => { pull(w); return orig(fn); }; };

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

    const ok = y1.ok === false && rows1 === 0 && y2.ok === false && d2 === 0 && y3.ok === false && d3 === 0
      // A NEMLEGES VÁLASZ AZONOS a soha nem látott kulcséval — a létezés nem szivároghat (KUKA-084).
      && y1.error === 'not_available' && y2.error === 'not_available' && y3.error === 'not_available'
      // ÉS A TARTALOM SEM MEGY KI: az olvasó ág `result` mezője üres marad.
      && (y3.result === null || y3.result === undefined);
    return {
      expected: 'a tx-HATÁRÁN visszavont joggal mindhárom ág not_available · NULLA parancs-sor · NULLA leltár-sor · NULLA tartalom',
      actual: `befogadás=${y1.error}/${rows1} sor · ismétlés=${y2.error}/${d2} leltár · olvasás=${y3.error}/${d3} leltár/tartalom=${JSON.stringify(y3.result ?? null)}`,
      pass: ok,
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
      const orig = w.store.tx;
      w.store.tx = (fn) => { mutate(w); return orig(fn); };
      return redeemInvite({ store: w.store, token: 'tok_1', actingSubjectId: 'sub_holder', newCredential: 'c', clock: w.clock });
    };

    // (a) A SZEREP LEFOKOZÁSA a határon. A régi alak a friss soron ELLENŐRZÖTT, de a RÉGI példány
    // szerepét ÍRTA — a meghívóban `user`, a tagságban `admin`. Ma: nevezett elutasítás.
    const w1 = mk();
    w1.store.run("UPDATE invite SET offered_role = 'admin' WHERE token = 'tok_1'");
    const r1 = atBoundary(w1, (w) => w.store.run("UPDATE invite SET offered_role = 'user' WHERE token = 'tok_1'"));
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
    const orig2 = w2.store.tx;
    w2.store.tx = (fn) => { revokeMembership({ store: w2.store, subjectId: 'sub_invitee', bookId: 'book_a', clock: w2.clock }); return orig2(fn); };
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


// ── KI FUTTATTA (R42 §3/1) ──────────────────────────────────────────────────────────────────────
// Sorrend: `--executed-by=NÉV` · `V3REF_EXECUTED_BY` · `unknown`. Soha nincs beírt alapérték.
const EXECUTED_BY = (() => {
  const arg = process.argv.find((a) => a.startsWith('--executed-by='));
  if (arg) return arg.slice('--executed-by='.length).trim() || 'unknown';
  const env = (process.env.V3REF_EXECUTED_BY || '').trim();
  return env || 'unknown';
})();

import { checkNorms, normsSummary } from './norms.mjs';
import { REVIEWS, REVIEWS_FOR, staleFor, residualStandingFor, checkResolutions } from './reviews.mjs';
import { MANIFEST_VERSION, EXPECTED_IDS, PROBE_STATUS, assertionOf } from './manifest.mjs';

// A FELÜLVIZSGÁLAT A FORRÁS-ÁLLAPOTHOZ KÖTÖTT. Ha a mai commit más, mint amin a felülvizsgálat
// készült, a rekord NEM a mai kódra vonatkozik. A futtató megmondhatja, min fut
// (`--source-commit=` vagy `V3REF_SOURCE_COMMIT`); ha nem mondja meg, a kimenet ezt KIMONDJA —
// nem tesz úgy, mintha a pecsét friss volna (KUKA-050: az állítás elévül).
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
const REF_DIR = dirname(fileURLToPath(import.meta.url));
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
      error_code: thrown ? thrown.error_code : null,
      error_message: thrown ? thrown.message : null,
      phase: thrown ? thrown.phase : null,
      norm_version: NORM_VERSION,
      norms: normsSummary(),
      impl_version: IMPL_VERSION,
      command: 'node v3ref/run.mjs',
      environment: `node ${process.version} · node:sqlite · elkülönített ideiglenes fájl`,
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const records = runAll();
  const src = sourceDigest();

  // A MARADÉK-TÁBLA ÖNELLENŐRZÉSE — KAPU, nem felirat. Ha egy lezárt maradék nem létező mondatra
  // vagy nem létező próbára mutat, az ugyanaz a díszpipa, mint a hatókör nélküli pecsét volt
  // (KUKA-041) — csak nehezebb észrevenni, mert szövegesen meggyőző.
  const res = checkResolutions(EXPECTED_IDS);
  if (!res.ok) {
    console.error('\nA MARADÉK-TÁBLA HIBÁS — a lezárt maradékok nem hitelesek:');
    for (const p of res.problems) console.error(`  · ${p}`);
    process.exit(2);
  }

  // A NORMATÍV MAG ÖNELLENŐRZÉSE (R51 §3/§4/§5.3) — ugyanaz a kapu-elv. Ha egy szabály
  // „megépült"-nek mondja magát nem létező próbára, vagy egy hiány nincs megnevezve, az ugyanaz a
  // díszpipa, mint a hatókör nélküli pecsét volt (KUKA-041).
  const nrm = checkNorms(EXPECTED_IDS);
  if (!nrm.ok) {
    console.error('\nA NORMATÍV MAG HIBÁS — a szabályok állapota nem hiteles:');
    for (const p of nrm.problems) console.error(`  · ${p}`);
    process.exit(2);
  }
  // FUTÁSAZONOSÍTÓ: két futás eredménye ne legyen összekeverhető (R45 §2). A tartalmi lenyomatból
  // és az indulás idejéből származik, tehát nem véletlen — visszakereshető.
  const RUN_ID = `run_${createHash('sha256').update(src.digest).update(records[0] ? records[0].at : '')
    .digest('hex').slice(0, 16)}`;
  if (process.argv.includes('--json')) {
    const stale = staleFor(src.digest);
    console.log(JSON.stringify({
      norm_version: NORM_VERSION,
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
  }
  if (records.some((r) => r.status !== PROBE_STATUS.PASS)) process.exit(1);
}
