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
import { openStore, clockFrom } from './store.mjs';
import { observeInvite, redeemInvite, rememberIntent, resumeIntent } from './invite.mjs';
import { rightAt, revokeMembership } from './authz.mjs';
import { submitCommand, readCommandResult } from './command.mjs';

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
      const effects = w.store.all('SELECT effect_id FROM command');

      const ok = first.ok && readBefore.ok
        && retrySameActor.ok && retrySameActor.replayed && retrySameActor.effect_id === first.effect_id
        && !conflict.ok && conflict.error === 'idempotency_conflict'
        && resolveCalls === 1 && effects.length === 1
        && !retry.ok && JSON.stringify(retry) === JSON.stringify(retryUnknown)
        && !readAfter.ok && readAfter.result === null
        && JSON.stringify(readAfter) === JSON.stringify(unknownKey);
      return {
        expected: 'jogosult újrapróbálás ugyanarra a hatásra · eltérő tartalom = konfliktus · a hatás EGYSZER születik · '
          + 'a feloldás EGYSZER fut · megvonás után sem az újrapróbálás, sem az olvasás nem árulja el a parancs létezését',
        actual: `hatás-sorok=${effects.length} · feloldás=${resolveCalls}× · jogosult újrapróbálás=${retrySameActor.effect_id} · `
          + `eltérő tartalom=${conflict.error} · újrapróbálás megvonás után `
          + `${JSON.stringify(retry) === JSON.stringify(retryUnknown) ? 'azonos az ismeretlen kulcséval' : 'ELÁRULJA a létezést'} · `
          + `olvasás ${JSON.stringify(readAfter) === JSON.stringify(unknownKey) ? 'azonos az ismeretlen kulcséval' : 'ELTÉR'}`,
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

      const own = ask('own_book', {});
      const freshDown = ask('representation', { mandate_registry: { obtained_at: T0, source_down: true } });
      w.clock.advance(25 * 3600 * 1000);
      const stale = ask('representation', { mandate_registry: { obtained_at: T0, source_down: true } });
      const revoked = ask('representation', { mandate_registry: { obtained_at: w.clock.now(), revoked: true } });

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

// ── KI FUTTATTA (R42 §3/1) ──────────────────────────────────────────────────────────────────────
// Sorrend: `--executed-by=NÉV` · `V3REF_EXECUTED_BY` · `unknown`. Soha nincs beírt alapérték.
const EXECUTED_BY = (() => {
  const arg = process.argv.find((a) => a.startsWith('--executed-by='));
  if (arg) return arg.slice('--executed-by='.length).trim() || 'unknown';
  const env = (process.env.V3REF_EXECUTED_BY || '').trim();
  return env || 'unknown';
})();

import { REVIEWS_FOR, staleFor } from './reviews.mjs';
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
      phase: thrown ? thrown.phase : null,
      norm_version: NORM_VERSION,
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
      at: started,
    };
  });
  return records;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const records = runAll();
  const src = sourceDigest();
  // FUTÁSAZONOSÍTÓ: két futás eredménye ne legyen összekeverhető (R45 §2). A tartalmi lenyomatból
  // és az indulás idejéből származik, tehát nem véletlen — visszakereshető.
  const RUN_ID = `run_${createHash('sha256').update(src.digest).update(records[0] ? records[0].at : '')
    .digest('hex').slice(0, 16)}`;
  if (process.argv.includes('--json')) {
    const stale = staleFor(SOURCE_COMMIT);
    console.log(JSON.stringify({
      norm_version: NORM_VERSION,
      impl_version: IMPL_VERSION,
      manifest_version: MANIFEST_VERSION,
      expected_probe_ids: EXPECTED_IDS,
      run_id: RUN_ID,
      // MÉRT forrás-azonosság (a futtató SAJÁT számítása) — ez a bizonyíték.
      source_digest: src.digest,
      source_files: src.files,
      executed_by: EXECUTED_BY,
      // BEMONDOTT commit — a hívó ÁLLÍTÁSA, nem mérés. Külön néven áll, hogy ne lehessen
      // összekeverni a mérttel (R45 P01).
      declared_source_commit: SOURCE_COMMIT,
      source_commit: SOURCE_COMMIT,
      // A felülvizsgálatok érvényessége KIMONDVA: melyik nem a mai forrásra vonatkozik.
      review_binding: SOURCE_COMMIT
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
  }
  if (records.some((r) => r.status !== PROBE_STATUS.PASS)) process.exit(1);
}
