#!/usr/bin/env node
// V3 — A FÜGGŐ SZÁNDÉK (pending_intent) VISELKEDÉSE MINDKÉT TÁROLÓN (INT-01). `npm run proof:pg-intent`
//
// MIÉRT KELL EZ A PRÓBA, ÉS MIÉRT PONT MOST (R164/2, chatgpt-v3 kérése).
//
// Az R158 utolsó két körében a `pending_intent` írása, lejárata és takarítása HÁROM javítást kapott,
// és a harmadik (F158-24 · KUKA-357) kifejezetten TÁROLÓ-KÜLÖNBSÉG volt: a `node:sqlite` `LIKE`-ja
// ASCII-ra kis/nagybetű-ÉRZÉKETLEN, a PostgreSQL-é nem — ezért egy importált, FRISS, kisbetűs
// időbélyegű sort az egyik tároló TÖRÖLT, a másik meghagyott. A javítás válaszában akkor KIMONDTAM,
// hogy a PostgreSQL-oldali viselkedés „a SZABÁLYBÓL következik (bináris `=`), nem mérésből" — mert
// ebben a környezetben nem futott valódi kiszolgáló.
//
// MOST FUT (R164/2: a „telepítve van, de nem fut" nem bizonyíték), ezért a kimondott hiányt MÉRÉSSÉ
// váltjuk: UGYANAZT a tíz állítást futtatjuk le a referencia SQLite-tárolón ÉS valódi PostgreSQL-en,
// és a két kimenetet ÖSSZEMÉRJÜK. Ha a tárolóváltás bárhol más viselkedést okoz, az itt ELTÉRÉSKÉNT
// jelenik meg (PAR-01 mércéje: nem az, hogy „lefutott", hanem hogy a KÉT kimenet EGYEZIK).
//
// A MÉRÉS SZAVAI (D-VS-693): ELTÉRÉS = a két tároló mást adott (LELET) · ELAKADT MÉRÉS = a próba maga
// bukott el (a rendszerről semmit nem tudunk) · az ALAPSOKASÁG mindig kiíródik, mert a nulla eltérés
// csak a megmért állítások számával együtt bizonyíték.
//
// AMIT EZ A PRÓBA NEM ÁLLÍT: nem a HTTP-határt méri (azt a `verify:app-findings-r154` Z/AA csoportja
// teszi), nem terhelés, és nem PostgreSQL 18 — a futó kiszolgáló verzióját a próba KIÍRJA, és a
// 18-as kompatibilitás ettől külön NEM IGAZOLT marad.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rmSync } from 'node:fs';
import { loadRepoEnv } from './lib/vs_tool_env.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadRepoEnv(ROOT);

const { startServer } = await import('../v3app/server.mjs');
const { rememberIntent, resumeIntent, purgeExpiredIntents, intentTtlMs, PENDING_INTENT_TTL_MS } =
  await import('../v3ref/invite.mjs');

const url = String(process.env.DATABASE_URL || '').trim();
if (!url) {
  console.error('proof:pg-intent — nincs DATABASE_URL: a PostgreSQL-oldal NEM mérhető.');
  console.error('  A próba KÉT tárolót mér össze; egy tárolóval a paritás fogalmilag nem értelmezhető.');
  process.exit(2);
}

const ORA = 60 * 60 * 1000;
const MOST = '2026-10-06T22:00:00.000Z';
const clock = { now: () => MOST };
/** Eltolásos ALAK, UGYANAZ a pillanat: `2026-10-06T01:00:00+02:00` === `2026-10-05T23:00:00.000Z`. */
const eltoltClock = { now: () => '2026-10-06T01:00:00+02:00' };
const iso = (msElteres) => new Date(Date.parse(MOST) + msElteres).toISOString();

/**
 * A TÍZ ÁLLÍTÁS, TÁROLÓ-FÜGGETLENÜL MEGFOGALMAZVA. Mindegyik egy JSON-alakot ad vissza, és a két
 * tároló kimenetét KARAKTERRE vetjük össze — így egy néma típus- vagy sorrend-eltérés is látszik.
 */
const ALLITASOK = [
  {
    nev: '(i1) az ÍRÁS kanonizál: eltolásos óra → UTC `Z` alak',
    fut: (store) => {
      store.run('DELETE FROM pending_intent');
      rememberIntent({ store, sessionId: 's_kanon', token: 'tok_k', clock: eltoltClock });
      const r = store.get('SELECT created_at FROM pending_intent WHERE session_id = ?', 's_kanon');
      return { tarolt: r ? r.created_at : null };
    },
  },
  {
    nev: '(i2) az ÚJRA-írás FRISSÍTI a sort, és nem keletkezik második',
    fut: (store) => {
      store.run('DELETE FROM pending_intent');
      rememberIntent({ store, sessionId: 's_ujra', token: 'tok_1', clock: { now: () => iso(-5 * ORA) } });
      rememberIntent({ store, sessionId: 's_ujra', token: 'tok_2', clock });
      const sorok = store.all('SELECT session_id, invite_token, created_at FROM pending_intent');
      return { darab: sorok.length, token: sorok[0] ? sorok[0].invite_token : null,
        kor_ora: sorok[0] ? (Date.parse(MOST) - Date.parse(sorok[0].created_at)) / ORA : null };
    },
  },
  {
    nev: '(i3) a FRISS szándék folytatható',
    fut: (store) => {
      store.run('DELETE FROM pending_intent');
      rememberIntent({ store, sessionId: 's_friss', token: 'tok_f', clock });
      return { token: resumeIntent({ store, sessionId: 's_friss', clock }) };
    },
  },
  {
    nev: '(i4) a LEJÁRT szándék nem folytatható, és az OLVASÁS eldobja a sort',
    fut: (store) => {
      store.run('DELETE FROM pending_intent');
      store.run('INSERT INTO pending_intent (session_id, invite_token, created_at) VALUES (?,?,?)',
        's_lejart', 'tok_l', iso(-(25 * ORA)));
      const token = resumeIntent({ store, sessionId: 's_lejart', clock });
      return { token, sor_megvan: Boolean(store.get('SELECT 1 AS x FROM pending_intent WHERE session_id = ?', 's_lejart')) };
    },
  },
  {
    nev: '(i5) a ROMLOTT időbélyeg LEJÁRTNAK számít (olvasás)',
    fut: (store) => {
      store.run('DELETE FROM pending_intent');
      store.run('INSERT INTO pending_intent (session_id, invite_token, created_at) VALUES (?,?,?)',
        's_romlott', 'tok_r', 'nem-egy-idopont');
      const token = resumeIntent({ store, sessionId: 's_romlott', clock });
      return { token, sor_megvan: Boolean(store.get('SELECT 1 AS x FROM pending_intent WHERE session_id = ?', 's_romlott')) };
    },
  },
  {
    nev: '(i6) a JÖVŐBELI időbélyeg LEJÁRTNAK számít (olvasás)',
    fut: (store) => {
      store.run('DELETE FROM pending_intent');
      store.run('INSERT INTO pending_intent (session_id, invite_token, created_at) VALUES (?,?,?)',
        's_jovo', 'tok_j', '2099-01-01T00:00:00.000Z');
      const token = resumeIntent({ store, sessionId: 's_jovo', clock });
      return { token, sor_megvan: Boolean(store.get('SELECT 1 AS x FROM pending_intent WHERE session_id = ?', 's_jovo')) };
    },
  },
  {
    nev: '(i7) a HALMAZOS takarítás: lejárt · jövőbeli · romlott MEGY, a friss MARAD',
    fut: (store) => {
      store.run('DELETE FROM pending_intent');
      const be = (sid, at) => store.run('INSERT INTO pending_intent (session_id, invite_token, created_at) VALUES (?,?,?)', sid, 'tok', at);
      be('p_lejart', iso(-(25 * ORA))); be('p_jovo', '2099-01-01T00:00:00.000Z');
      be('p_romlott', 'bogus'); be('p_friss', iso(-(2 * ORA)));
      const p = purgeExpiredIntents({ store, clock });
      return { takaritva: p.purged, nem_kanonikus: p.odd_rows, abbol_takaritva: p.odd_purged,
        maradt: store.all('SELECT session_id FROM pending_intent').map((r) => r.session_id).sort().join(',') };
    },
  },
  {
    nev: '(i8) F158-24 — a KISBETŰS kanonikus alak: a FRISS MARAD, a LEJÁRT MEGY',
    fut: (store) => {
      store.run('DELETE FROM pending_intent');
      const be = (sid, at) => store.run('INSERT INTO pending_intent (session_id, invite_token, created_at) VALUES (?,?,?)', sid, 'tok', at);
      be('k_friss', iso(-(2 * ORA)).toLowerCase());
      be('k_lejart', iso(-(25 * ORA)).toLowerCase());
      be('n_friss', iso(-(2 * ORA)));
      be('n_lejart', iso(-(25 * ORA)));
      const p = purgeExpiredIntents({ store, clock });
      return { takaritva: p.purged, nem_kanonikus: p.odd_rows, abbol_takaritva: p.odd_purged,
        maradt: store.all('SELECT session_id FROM pending_intent').map((r) => r.session_id).sort().join(',') };
    },
  },
  {
    nev: '(i9) F158-20 — az ELTOLÁSOS alakú FRISS sor a takarítást túléli',
    fut: (store) => {
      store.run('DELETE FROM pending_intent');
      store.run('INSERT INTO pending_intent (session_id, invite_token, created_at) VALUES (?,?,?)',
        'e_friss', 'tok_e', '2026-10-06T23:30:00+02:00');   // = 21:30Z, tehát FRISS
      store.run('INSERT INTO pending_intent (session_id, invite_token, created_at) VALUES (?,?,?)',
        'e_lejart', 'tok_e2', '2026-10-05T18:00:00+02:00');  // = 16:00Z előző nap, tehát LEJÁRT
      const p = purgeExpiredIntents({ store, clock });
      return { takaritva: p.purged, nem_kanonikus: p.odd_rows,
        maradt: store.all('SELECT session_id FROM pending_intent').map((r) => r.session_id).sort().join(',') };
    },
  },
  {
    nev: '(i10) a türelmi idő a PLAFON és a munkamenet tétlenségi korlátjának KISEBBIKE',
    fut: () => ({
      ket_ora: intentTtlMs({ sessionIdleMs: 2 * ORA }) / ORA,
      negyvennyolc_ora: intentTtlMs({ sessionIdleMs: 48 * ORA }) / ORA,
      plafon_ora: PENDING_INTENT_TTL_MS / ORA,
    }),
  },
];

const alak = (v) => JSON.stringify(v, Object.keys(v).sort());

console.log('A FÜGGŐ SZÁNDÉK VISELKEDÉSE — KÉT TÁROLÓN ÖSSZEMÉRVE (INT-01)');
console.log('='.repeat(78));

const sqlitePath = resolve(ROOT, 'var/tmp/v3_pg_intent_sqlite.sqlite');
for (const s of ['', '-wal', '-shm']) { try { rmSync(sqlitePath + s, { force: true }); } catch { /* nem volt */ } }

let sqliteApp = null; let pgApp = null; let kilepes = 0;
try {
  sqliteApp = await startServer({ port: 0, host: '127.0.0.1', dbPath: sqlitePath });
  pgApp = await startServer({ port: 0, host: '127.0.0.1' });
  if (pgApp.store.dialect !== 'postgres') {
    console.error(`ELAKADT MÉRÉS: a második tároló nem PostgreSQL (dialect=${pgApp.store.dialect}).`);
    process.exit(2);
  }
  const ver = pgApp.store.get('SELECT version() AS v');
  console.log(`  a futó kiszolgáló: ${String(ver && ver.v).split(' on ')[0]}`);
  console.log(`  a referencia-tároló: node:sqlite (dialect=${sqliteApp.store.dialect ?? 'nincs megadva'})`);
  console.log('');

  const eltero = [];
  for (const a of ALLITASOK) {
    let s = null; let p = null; let hiba = null;
    try { s = a.fut(sqliteApp.store); } catch (e) { hiba = `SQLite: ${e && e.message}`; }
    try { p = a.fut(pgApp.store); } catch (e) { hiba = `${hiba ? hiba + ' · ' : ''}PostgreSQL: ${e && e.message}`; }
    if (hiba) {
      console.log(`  ELAKADT MÉRÉS ${a.nev}`);
      console.log(`      ${hiba}`);
      eltero.push({ nev: a.nev, elakadt: hiba });
      continue;
    }
    const egyezik = alak(s) === alak(p);
    console.log(`  ${egyezik ? '=' : '≠'} ${a.nev}`);
    console.log(`      ${alak(s)}`);
    if (!egyezik) { console.log(`      PostgreSQL: ${alak(p)}`); eltero.push({ nev: a.nev, sqlite: s, pg: p }); }
  }

  console.log('');
  console.log('='.repeat(78));
  console.log(`ALAPSOKASÁG: ${ALLITASOK.length} állítás, MINDKÉT tárolón lefuttatva.`);
  if (eltero.length) {
    console.log(`ELTÉRÉS: ${eltero.length} — LELET:`);
    for (const e of eltero) console.log(`  · ${e.nev}${e.elakadt ? ` — ELAKADT MÉRÉS: ${e.elakadt}` : ''}`);
    kilepes = 1;
  } else {
    console.log('ELTÉRÉS: 0 — a két tároló UGYANAZT a viselkedést adta mind a tíz állításon.');
  }
  console.log('');
  console.log('AMIT EZ BIZONYÍT: a `pending_intent` írása (kanonizálás), olvasás-kori lejárata és halmazos');
  console.log('  takarítása — a nem kanonikus, kisbetűs, eltolásos, romlott és jövőbeli időbélyegekkel együtt —');
  console.log('  a két tárolón AZONOSAN viselkedik, valódi PostgreSQL-en mérve.');
  console.log('AMIT NEM BIZONYÍT (kimondva): nem a HTTP-határ (azt a verify:app-findings-r154 Z/AA csoportja méri),');
  console.log('  nem terhelés, és NEM PostgreSQL 18 — a futó verzió a fejlécben áll, a 18-as kompatibilitás külön');
  console.log('  NEM IGAZOLT marad.');
  console.log(`RESULT: ${kilepes === 0 ? 'PASS' : 'FAIL'} — ${ALLITASOK.length} állítás, ${eltero.length} eltérés`);
} catch (e) {
  console.error('ELAKADT MÉRÉS (a próba bukott el; a rendszerről ez NEM mond semmit):', e && e.message);
  kilepes = 2;
} finally {
  for (const app of [sqliteApp, pgApp]) {
    if (app) { try { await new Promise((r) => app.server.close(r)); } catch { /* már zárva */ } }
  }
  for (const s of ['', '-wal', '-shm']) { try { rmSync(sqlitePath + s, { force: true }); } catch { /* nem volt */ } }
}
process.exit(kilepes);
