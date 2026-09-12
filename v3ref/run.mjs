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

// A KANONIKUS NORMA-VERZIÓ EGYETLEN HELYRŐL JÖN (R53 §5). Korábban itt egy KÉZZEL ÍRT `'R32/K01-K16'`
// állt, miközben a norma-index ugyanezt külön tárolta — két, részben átfedő igazságforrás, ami
// előbb-utóbb elcsúszik (KUKA-018). Innentől a futtató nem tárolja, hanem KÉRDEZI.
export const NORM_VERSION = NORM_CONTRACT_VERSION;
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
      revokeMembership({ store: w.store, subjectId: 'sub_issuer', bookId: 'book_a', clock: w.clock });
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
  'A PARANCS-oldal mindhárom ága zár a tx-határon visszavont joggal — és a KORÁBBI esemény megmarad',
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
      const orig = w.store.tx;
      w.store.tx = (fn) => { mutate(w); return orig(fn); };
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
        // A BIZONYÍTÉK-HIVATKOZÁS TÍPUSOS ÉS FELOLDHATÓ (R59/F03) — a szabad szöveg helyett.
        positive_evidence: [{ kind: 'document', ref: 'R32_board_v1.md#4.1', note: 'a pozitív eset helye' }],
        negative_evidence: [{ kind: 'document', ref: 'R32_board_v1.md#4.2', note: 'az ellenpélda helye' }],
        residual: 'mi maradt ki',
      });
      const st = (over, b2 = bind) => contentReviewState({ ...cl, content_review: over }, b2).state;
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
        positive_evidence: [{ kind: 'document', ref: 'R32_board_v1.md#4.1', note: 'hely' }],
        negative_evidence: [{ kind: 'document', ref: 'R32_board_v1.md#4.2', note: 'hely' }],
        residual: 'mi maradt ki',
      });
      const res = (over, b2 = bind, cat) => contentReviewState({ ...cl, content_review: over }, b2, cat);
      const bad4 = (over, cat) => res(over, bind, cat).state === 'invalid';
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
          { assertions: new Set(), mutations: new Set(['M32']) },
        ),
        feloldhatatlan_mutacio: bad4(
          { ...full(), negative_evidence: [{ kind: 'mutation', mutation: 'M-NINCS' }] },
          { assertions: new Set(), mutations: new Set(['M32']) },
        ),
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
      if (ns.length < 4) nem.push(`a terv ${ns.length} lépéses — a csomag négy lépésre van vállalva`);
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

import { checkNorms, normsSummary, OPEN_BLOCKERS, NORM_CONTRACT_VERSION, NORMS_INDEX_ID, NORMS_INDEX_SCHEMA, contractRef, indexDigest, contentReviewState, CONTENT_REVIEW_RECORD_VERSION, ALL_NORMS, REQUIRED_EVIDENCE, NEXT_REQUIRED_EVIDENCE, clauseDigest as clauseDigestOf } from './norms.mjs';
const contractRefDigest = () => contractRef().digest;
import { sourceArtifactMeasurement } from './normContract.mjs';
import { manifestDigest } from './manifest.mjs';
import { REVIEWS, REVIEWS_FOR, staleFor, residualStandingFor, checkResolutions } from './reviews.mjs';
import { MANIFEST_VERSION, EXPECTED_IDS, EXPECTED_PROBES, PROBE_STATUS, assertionOf } from './manifest.mjs';
import { MUTATIONS } from './mutations.mjs';

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
  }

  if (!nrm.integrity_ok) {
    console.error('\nA NORMA-BIZONYÍTÉK INDEX HIBÁS — a regiszter magáról állít valótlant:');
    for (const p of nrm.integrity_problems) console.error(`  · ${p}`);
    process.exit(2);
  }
  if (records.some((r) => r.status !== PROBE_STATUS.PASS)) process.exit(1);
}
