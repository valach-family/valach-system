#!/usr/bin/env node
// V3 — DOMAIN-VERSENY VALÓDI PostgreSQL-EN (RCE-02). `npm run proof:pg-domain-race`
//
// MIT BIZONYÍT, ÉS MIT NEM FOGADUNK EL BIZONYÍTÉKNAK.
//
// Az előző alakom (R151) HÁROM ponton volt gyenge, és ezt a külső ellenőrző fél mérte ki
// (R152/F152-02) — a leletet SAJÁT ellenpróbával megerősítettem: a RÉGI kiértékelő blokk
// ZÖLDET adott arra a bemenetre, ahol MINDKÉT író eldobott és SEMMI nem íródott. Egy próba,
// ami két összeomlott írót sikernek lát, nem próba (KUKA-120 · KUKA-127).
//
// AMI MOSTANTÓL KÖTELEZŐ EGY MENET ELFOGADÁSÁHOZ:
//   1. a megállítási pont a TRANZAKCIÓN BELÜL, a KÖZÖS SOR-ZÁR megszerzése UTÁN fog;
//   2. a másik fél bizonyíthatóan a ZÁRRA VÁR — `pg_locks`-ból visszaolvasva, nem `sleep`-ből;
//   3. a barrier NEM járt le egyik félnél sem;
//   4. MINDKÉT gyerek 0 kilépési kóddal, `threw`/`crashed` nélkül ér véget;
//   5. a TERVEZETT NYERTES tényleg ÍRT (nem csak „nem lett baj");
//   6. a vesztes NEVEZETT nyugtát kapott, és a nyugta egyezik a TARTÓS hatással.
// Bármelyik hiányzik ⇒ FAIL vagy ELAKADT MÉRÉS — SOHA nem PASS.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { loadRepoEnv } from './lib/vs_tool_env.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadRepoEnv(ROOT);
const { startServer } = await import('../v3app/server.mjs');
const { openPgStore } = await import('../v3ref/pgStore.mjs');
const { scopeReleaseDecision } = await import('../v3ref/releaseScope.mjs');
const { membershipAsOf } = await import('../v3ref/bitemporal.mjs');
const CHILD = join(ROOT, 'tools/v3_pg_domain_race_child.mjs');

// ── A MÉRCE ELLENPRÓBÁI (`--selftest`) — adatbázis NÉLKÜL futnak ──────────────────────────────
if (process.argv.includes('--selftest')) {
  const expect = {
    state: (st) => st.redeemed === true && st.membership === 1 && st.revocations === 0,
    loser: (o) => o && o.ok === true && o.changed === false && o.reason === 'invite_already_redeemed',
  };
  const good = {
    blocked: true,
    winner: { code: 0, out: { ok: true } },
    loser: { code: 0, out: { ok: true, changed: false, reason: 'invite_already_redeemed' } },
    state: { redeemed: true, revocations: 0, membership: 1 },
    expect,
  };
  const cases = [
    ['POZITÍV KONTROLL: a helyes menet ÁTMEGY', good, (v) => v.blocked && v.clean && v.wrote && v.loserNamed],
    // A KÜLSŐ FÉL PONTOS ELLENPRÓBÁJA (R152/F152-02): két eldobott író, semmi nem íródott.
    ['a külső fél esete: MINDKÉT író eldobott, semmi nem íródott',
      { ...good, winner: { code: 1, out: { ok: false, threw: true } }, loser: { code: 1, out: { ok: false, threw: true } },
        state: { redeemed: false, revocations: 0, membership: 0 } },
      (v) => !v.clean && !v.wrote && !v.loserNamed],
    ['a vesztes ÖSSZEOMLOTT', { ...good, loser: { code: 1, crashed: true, out: null } }, (v) => !v.clean],
    ['a nyertes BARRIER-e lejárt', { ...good, winner: { code: 0, barrierTimedOut: true, out: { ok: true } } }, (v) => !v.clean],
    ['a zárra várakozás NEM igazolt', { ...good, blocked: false }, (v) => !v.blocked],
    ['a nyertes NEM írt (üres végállapot)', { ...good, state: { redeemed: false, revocations: 0, membership: 0 } }, (v) => !v.wrote],
    ['a vesztes NÉMÁN sikert mondott', { ...good, loser: { code: 0, out: { ok: true, changed: true } } }, (v) => !v.loserNamed],
  ];
  let bad = 0;
  console.log('A MÉRCE ELLENPRÓBÁI (judgeRound)');
  console.log('='.repeat(78));
  for (const [name, input, want] of cases) {
    const v = judgeRound(input);
    const ok = want(v);
    if (!ok) bad += 1;
    console.log(`  ${ok ? 'PASS' : 'FAIL'} ${name}\n         ${JSON.stringify(v)}`);
  }
  console.log('='.repeat(78));
  console.log(bad ? `RESULT: FAIL — ${bad} ellenpróba` : `RESULT: PASS — ${cases.length} ellenpróba (1 pozitív kontroll)`);
  process.exit(bad ? 1 : 0);
}

const url = String(process.env.DATABASE_URL || '').trim();
if (!url) { console.error('proof:pg-domain-race — nincs DATABASE_URL: ELAKADT MÉRÉS.'); process.exit(2); }

const marks = [];
const check = (id, name, ok, detail) => { marks.push({ id, name, ok, detail }); console.log(`     ${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? `\n            ${detail}` : ''}`); };
const stalled = (id, name, detail) => { marks.push({ id, name, ok: false, detail, stalled: true }); console.log(`     ELAKADT ${id} ${name}\n            ${detail}`); };

// ── FIXTÚRA valódi HTTP-úton ──────────────────────────────────────────────────────────────────
class C {
  constructor(b) { this.b = b; this.ck = null; }
  async call(m, p, body) {
    const h = { 'content-type': 'application/json' }; if (this.ck) h.cookie = this.ck;
    const r = await fetch(this.b + p, { method: m, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    const sc = r.headers.get('set-cookie'); if (sc) this.ck = sc.split(';')[0];
    const ct = r.headers.get('content-type') || '';
    return { s: r.status, b: ct.includes('json') ? await r.json() : await r.text() };
  }
}
async function fixture(app, mark) {
  const base = `http://127.0.0.1:${app.port}`;
  const owner = new C(base); const guest = new C(base);
  const mails = async () => (await owner.call('GET', '/dev/mailbox')).b.mails || [];
  const signUp = async (c, email) => {
    await c.call('POST', '/api/register', { email, password: 'verseny-titok-1' });
    const m = (await mails()).find((x) => String(x.to).toLowerCase() === email.toLowerCase() && x.subject.includes('Erősítsd meg'));
    if (m) { const u = new URL(m.link); await c.call('GET', u.pathname + u.search); }
    return (await c.call('POST', '/api/login', { email, password: 'verseny-titok-1' })).b.subject_id;
  };
  const ownerId = await signUp(owner, `gazda${mark}@verseny.hu`);
  const ws = await owner.call('POST', '/api/workspaces', { name: 'Verseny Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '12345678-2-42' } });
  const guestId = await signUp(guest, `vendeg${mark}@verseny.hu`);
  const inv = await owner.call('POST', '/api/invites', { email: `vendeg${mark}@verseny.hu`, role: 'user', scope: 'keszlet' });
  return { ownerId, guestId, bookId: ws.b.book_id, token: inv.b.token, owner, guest };
}

function child(mode, payload, dir) {
  return new Promise((res) => {
    const p = spawn(process.execPath, [CHILD, url, mode, dir, JSON.stringify(payload)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; let err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => {
      try { res({ code, ...JSON.parse(out.trim().split('\n').pop()) }); }
      catch { res({ code, mode, crashed: true, err: err.slice(-300) }); }
    });
  });
}

/**
 * A MENET ÍTÉLETE — TISZTA FELOLDÓ, hogy ELLENPRÓBÁZHATÓ legyen (F152-02).
 *
 * Az előző alakom a kiértékelést a menet törzsébe írta, ezért csak VALÓDI futással lehetett
 * megnézni, mit fogad el — és pont ez rejtette el, hogy KÉT ÖSSZEOMLOTT ÍRÓT is zöldnek látott.
 * A `--selftest` most ezt a függvényt eteti szándékosan rossz bemenetekkel, és megköveteli, hogy
 * BUKJON. Egy mérce, amit nem lehet elrontani, nem mérce (KUKA-051 · KUKA-089).
 */
export function judgeRound({ blocked, winner, loser, state, expect }) {
  const clean = winner.code === 0 && loser.code === 0 && !winner.crashed && !loser.crashed
    && !(winner.out && winner.out.threw) && !(loser.out && loser.out.threw)
    && winner.barrierTimedOut !== true && loser.barrierTimedOut !== true;
  return {
    blocked: blocked === true,
    clean,
    wrote: expect.state(state),
    loserNamed: expect.loser(loser.out),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFile = async (f, ms = 25000) => { const u = Date.now() + ms; while (!existsSync(f) && Date.now() < u) await sleep(10); return existsSync(f); };

/**
 * A MÁSIK FÉL TÉNYLEG A ZÁRRA VÁR — a PostgreSQL mondja meg, nem az óra (F152-02/1).
 * Egy harmadik, FÜGGETLEN kapcsolatról olvassuk a `pg_locks`-ot: egy meg nem adott (granted=false)
 * zár a mi adatbázisunkban azt jelenti, hogy valaki VÁRAKOZIK. A `sleep` ezt nem bizonyítaná.
 */
async function waitUntilSomeoneBlocks(probe, ms = 15000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const n = probe.get('SELECT COUNT(*) AS n FROM pg_locks WHERE NOT granted').n;
    if (n > 0) return true;
    await sleep(25);
  }
  return false;
}

console.log('DOMAIN-VERSENY VALÓDI PostgreSQL-EN (RCE-02)');
console.log('='.repeat(78));
console.log('  Megállítás a TRANZAKCIÓN BELÜL, a közös sor-zár UTÁN · a várakozás pg_locks-ból igazolva');

const app = await startServer({ port: 0, host: '127.0.0.1', devSurface: true });
if (app.store.dialect !== 'postgres') { console.error('  ELAKADT MÉRÉS: nem PostgreSQL-en fut.'); process.exit(2); }
const probe = openPgStore(url);

/**
 * EGY MENET. A `winner` szerzi meg a zárat és áll meg; a `loser` nekifut és BLOKKOL; amikor a
 * blokkolást a `pg_locks` visszaigazolta, elengedjük a nyertest. Így a nyerési sorrend
 * KIKÉNYSZERÍTETT, nem remélt.
 */
async function round(label, winnerMode, loserMode, expect, mark) {
  console.log(`\n  ${label}`);
  const f = await fixture(app, mark);
  if (!f.token || !f.bookId) { stalled('[0]', 'a fixtúra nem született meg', JSON.stringify({ token: !!f.token, book: !!f.bookId })); return; }
  const dir = mkdtempSync(join(tmpdir(), 'race-'));
  const payload = (m) => ({ token: f.token, bookId: f.bookId, actor: m === 'redeem' ? f.guestId : f.ownerId, pauseAfterLockOn: m === winnerMode ? 'invite' : null });

  const winner = child(winnerMode, payload(winnerMode), dir);
  const gotLock = await waitFile(join(dir, `${winnerMode}.locked`));
  if (!gotLock) { stalled('[1]', 'a NYERTES nem érte el a zárolt szakaszt', 'barrier-határidő — a menet nem mér versenyt'); rmSync(dir, { recursive: true, force: true }); return; }

  const loser = child(loserMode, payload(loserMode), dir);
  const blocked = await waitUntilSomeoneBlocks(probe);
  writeFileSync(join(dir, `${winnerMode}.go`), '1');
  const [w, l] = [await winner, await loser];
  rmSync(dir, { recursive: true, force: true });

  const s = openPgStore(url);
  const inviteRow = s.get('SELECT redeemed_at FROM invite WHERE token = ?', f.token);
  const state = {
    redeemed: Boolean(inviteRow && inviteRow.redeemed_at),
    revocations: s.get('SELECT COUNT(*) AS n FROM invite_revocation WHERE token = ?', f.token).n,
    membership: s.get('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ?', f.guestId, f.bookId).n,
  };
  s.close();

  console.log(`     nyertes(${winnerMode}): ${JSON.stringify(w.out).slice(0, 130)}`);
  console.log(`     vesztes(${loserMode}):  ${JSON.stringify(l.out).slice(0, 130)}`);
  console.log(`     VÉGÁLLAPOT: beváltva=${state.redeemed} · visszavonás-sor=${state.revocations} · tagság=${state.membership}`);

  const P = label.slice(1, 2);
  const v = judgeRound({ blocked, winner: w, loser: l, state, expect });
  check(`[${P}1]`, 'a vesztes BIZONYÍTOTTAN a zárra várt (pg_locks)', v.blocked,
    v.blocked ? '' : 'nem láttunk meg nem adott zárat — a menet NEM kényszerítette ki a versenyt');
  check(`[${P}2]`, 'mindkét író RENDBEN futott le (nincs threw/crash/barrier-lejárat)', v.clean,
    v.clean ? '' : `nyertes: kód=${w.code} threw=${!!(w.out && w.out.threw)} barrier=${w.barrierTimedOut} · vesztes: kód=${l.code} threw=${!!(l.out && l.out.threw)} barrier=${l.barrierTimedOut}`);
  check(`[${P}3]`, `a TERVEZETT nyertes (${winnerMode}) tényleg ÍRT — a tartós hatás a várt`, v.wrote,
    v.wrote ? '' : `várt: ${expect.describe} · kapott: ${JSON.stringify(state)}`);
  check(`[${P}4]`, `a vesztes (${loserMode}) NEVEZETT nyugtát kapott`, v.loserNamed,
    v.loserNamed ? '' : `várt: ${expect.loserDescribe} · kapott: ${JSON.stringify(l.out).slice(0, 160)}`);
}

await round(
  '(A) A BEVÁLTÁS NYER — a beváltás birtokolja a zárat, a visszavonás vár',
  'redeem', 'revoke',
  {
    state: (st) => st.redeemed === true && st.membership === 1 && st.revocations === 0,
    describe: 'beváltva=true · tagság=1 · visszavonás-sor=0',
    loser: (o) => o && o.ok === true && o.changed === false && o.reason === 'invite_already_redeemed',
    loserDescribe: 'ok:true · changed:false · reason:"invite_already_redeemed"',
  }, `a${Date.now().toString(36)}`);

await round(
  '(B) A VISSZAVONÁS NYER — a visszavonás birtokolja a zárat, a beváltás vár',
  'revoke', 'redeem',
  {
    state: (st) => st.revocations === 1 && st.redeemed === false && st.membership === 0,
    describe: 'visszavonás-sor=1 · beváltva=false · tagság=0',
    loser: (o) => o && o.ok === false && o.reason === 'invite_revoked',
    loserDescribe: 'ok:false · reason:"invite_revoked"',
  }, `b${Date.now().toString(36)}`);

// ── (C) HATÁSKÖR-ADÁS ↔ TAGSÁG-MEGVONÁS — a műveletek SIKERÉT is mérve (F152-02/5) ────────────
{
  console.log('\n  (C) HATÁSKÖR-ADÁS ↔ TAGSÁG-MEGVONÁS — a két kapu együtt');
  const mark = `c${Date.now().toString(36)}`;
  const f = await fixture(app, mark);
  await f.guest.call('POST', '/api/invites/pending', { token: f.token });
  const red = await f.guest.call('POST', '/api/invites/redeem', { token: f.token });
  if (!(red.b && red.b.ok === true)) { stalled('[C0]', 'a tagság nem jött létre', JSON.stringify(red.b).slice(0, 140)); }
  else {
    const dir = mkdtempSync(join(tmpdir(), 'ctl-'));
    const base = { bookId: f.bookId, target: f.guestId, actor: f.ownerId, scope: 'arak', pauseAfterLockOn: null };
    const g = await child('grantScope', base, dir);
    const rv = await child('revokeMembership', base, dir);
    rmSync(dir, { recursive: true, force: true });

    const s = openPgStore(url);
    const after = new Date(Date.now() + 60000).toISOString();
    const m = membershipAsOf({ store: s, subjectId: f.guestId, bookId: f.bookId, validAt: after, knownAt: after });
    const d = m.effective === true && scopeReleaseDecision({ store: s, subjectId: f.guestId, bookId: f.bookId, scope: 'arak', nowIso: after, knownAt: after });
    const allows = Boolean(d && d.allowed === true);
    const revokedRow = s.get('SELECT revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', f.guestId, f.bookId);
    s.close();

    console.log(`     hatáskör-adás: ${JSON.stringify(g.out).slice(0, 110)}`);
    console.log(`     tagság-megvonás: ${JSON.stringify(rv.out).slice(0, 110)}`);
    // A MŰVELETEK SIKERÉT KÜLÖN MÉRJÜK (F152-02/5): az, hogy a végén nincs adatkiadás, NEM
    // bizonyít működő írókat — két no-op is „nem ad ki adatot".
    check('[C1]', 'a hatáskör-adás TÉNYLEG lefutott (nem no-op, nem hiba)',
      Boolean(g.out && g.out.ok === true && g.code === 0), JSON.stringify(g.out).slice(0, 140));
    check('[C2]', 'a tagság-megvonás TÉNYLEG megtörtént (nyugta ÉS tartós sor)',
      Boolean(rv.out && rv.out.ok === true && rv.out.changed === true && revokedRow && revokedRow.revoked_at),
      `nyugta: ${JSON.stringify(rv.out).slice(0, 90)} · revoked_at a tárolóban: ${Boolean(revokedRow && revokedRow.revoked_at)}`);
    check('[C3]', 'a MEGVONT tag a KÉT KAPUN át nem kap adatot', allows === false,
      allows ? 'a két kapu ENGEDNE — jogosultság-szivárgás' : '');
  }
}

probe.close();
await app.close();
console.log(`\n${'='.repeat(78)}`);
const bad = marks.filter((m) => !m.ok);
const st = marks.filter((m) => m.stalled);
console.log(`ALAPSOKASÁG: ${marks.length} mért állítás.`);
if (st.length) { console.log(`ELAKADT MÉRÉS: ${st.length} — a rendszerről ezekre nézve SEMMIT nem állítunk.`); process.exit(2); }
if (!bad.length) { console.log('RESULT: PASS — mindkét nyerési sorrend kikényszerítve és igazolva.'); process.exit(0); }
console.log(`RESULT: FAIL — ${bad.length} állítás`); process.exit(3);
