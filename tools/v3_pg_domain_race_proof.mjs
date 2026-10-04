#!/usr/bin/env node
// V3 — DOMAIN-VERSENY VALÓDI PostgreSQL-EN (RCE-01). `npm run proof:pg-domain-race`
//
// MIT MÉR (R150 §4). Nem a kulcs-ütközést és nem az idempotencia-kulcsot — azokat az R148 már
// megmérte. Itt a „JOGOT OLVASOK, MAJD HATÁST ÍROK" utak a tárgy: két KÜLÖN folyamat, két KÜLÖN
// kapcsolat, és egy DETERMINISZTIKUS megállítási pont az olvasás és az írás között.
//
// MIÉRT NEM ELÉG AZ EGYSZERRE INDÍTÁS. Mert ha a két folyamat véletlenül sorban fut le, a próba
// zöld lesz anélkül, hogy az ütközést előidézte volna. A megállítási pont teszi a versenyt
// BIZTOSSÁ — és a gyerek KI IS MONDJA (`paused`), ha a pont nem fogott: akkor a kimenet nem
// bizonyíték (KUKA-120 · KUKA-127).
//
// AZ ÁLLÍTÁS, AMIT MÉRÜNK. Egy meghívó nem lehet EGYSZERRE beváltott és visszavont: a két
// művelet közül az egyiknek NEVEZETTEN el kell akadnia, és a NYUGTÁNAK igazat kell mondania
// arról, mi történt (KUKA-129 — a helyes végállapot nem elég).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import { loadRepoEnv } from './lib/vs_tool_env.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadRepoEnv(ROOT);
const { startServer } = await import('../v3app/server.mjs');
const { openPgStore } = await import('../v3ref/pgStore.mjs');
const { scopeReleaseDecision } = await import('../v3ref/releaseScope.mjs');
const { membershipAsOf } = await import('../v3ref/bitemporal.mjs');

/**
 * A KIADÁS KÉT KAPUN ÁLL, és a héj IS így kérdezi (`v3app/server.mjs`, `/api/data/*`):
 * előbb a TAGSÁG, utána az ADATKÖR. A kettőt egy mezőbe vonni tilos (ENT-02 · KUKA-002), ezért
 * a mérés is KÜLÖN kérdezi mindkettőt, és a VÉGSŐ választ a kettő EGYÜTT adja. Ha csak a
 * hatáskör-feloldót kérdeznénk, a mérés a rendszer EGYIK kapuját hagyná ki — és egy biztonságos
 * rendszert mondana szivárgónak (a saját mérőm első alakja pontosan ezt tette).
 */
function readAllowed(store, subjectId, bookId, scope, at) {
  const m = membershipAsOf({ store, subjectId, bookId, validAt: at, knownAt: at });
  if (m.effective !== true) return false;
  const d = scopeReleaseDecision({ store, subjectId, bookId, scope, nowIso: at, knownAt: at });
  return d && d.allowed === true;
}
const CHILD = join(ROOT, 'tools/v3_pg_domain_race_child.mjs');

const url = String(process.env.DATABASE_URL || '').trim();
if (!url) { console.error('proof:pg-domain-race — nincs DATABASE_URL: ELAKADT MÉRÉS.'); process.exit(2); }

const marks = [];
const check = (id, name, ok, detail) => { marks.push({ id, name, ok, detail }); console.log(`  ${ok ? 'PASS' : 'FAIL'} ${id} ${name}${detail ? `\n          ${detail}` : ''}`); };

// ── FIXTÚRA: valódi felhasználói úton, HTTP-n ─────────────────────────────────────────────────
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
    const r = await c.call('POST', '/api/login', { email, password: 'verseny-titok-1' });
    return r.b.subject_id;
  };
  const ownerId = await signUp(owner, `gazda${mark}@verseny.hu`);
  const ws = await owner.call('POST', '/api/workspaces', { name: 'Verseny Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '12345678-2-42' } });
  const guestId = await signUp(guest, `vendeg${mark}@verseny.hu`);
  const inv = await owner.call('POST', '/api/invites', { email: `vendeg${mark}@verseny.hu`, role: 'user', scope: 'keszlet' });
  return { ownerId, guestId, bookId: ws.b.book_id, token: inv.b.token, owner, guest };
}

/** A (c) körhöz: a vendég LEGYEN tag — a hatáskör-adásnak van mire támaszkodnia. */
async function fixtureWithMember(app, mark) {
  const f = await fixture(app, mark);
  if (!f.token) return f;
  await f.guest.call('POST', '/api/invites/pending', { token: f.token });
  const red = await f.guest.call('POST', '/api/invites/redeem', { token: f.token });
  return { ...f, member: red.b && red.b.ok === true };
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

const waitFile = async (f, ms = 20000) => {
  const until = Date.now() + ms;
  while (!existsSync(f) && Date.now() < until) await new Promise((r) => setTimeout(r, 10));
  return existsSync(f);
};
const touch = async (f) => (await import('node:fs')).writeFileSync(f, '1');

console.log('DOMAIN-VERSENY VALÓDI PostgreSQL-EN (RCE-01)');
console.log('='.repeat(78));
console.log('  KÉT KÜLÖN FOLYAMAT · KÜLÖN KAPCSOLAT · DETERMINISZTIKUS megállítás olvasás és írás között');

const app = await startServer({ port: 0, host: '127.0.0.1', devSurface: true });
if (app.store.dialect !== 'postgres') { console.error('  ELAKADT MÉRÉS: nem PostgreSQL-en fut.'); process.exit(2); }

/**
 * EGY MENET. A `slow` fél megáll a megnevezett olvasás UTÁN; a `fast` fél közben végigfut;
 * utána a `slow` folytatja. Így a `slow` ELAVULT olvasásra ír — pontosan ez a mért helyzet.
 */
async function round(label, slowMode, fastMode, mark) {
  const f = await fixture(app, mark);
  if (!f.token || !f.bookId) return { label, stalled: 'a fixtúra nem született meg', f };
  const dir = mkdtempSync(join(tmpdir(), 'race-'));
  const payload = (mode) => ({
    token: f.token, bookId: f.bookId,
    actor: mode === 'redeem' ? f.guestId : f.ownerId,
    // A MEGÁLLÍTÁSI PONT: a meghívó élő sorának olvasása — mindkét író ezzel kezd.
    pauseAfterReadMatch: mode === slowMode ? 'FROM invite WHERE token' : null,
  });
  const slow = child(slowMode, payload(slowMode), dir);
  const reachedRead = await waitFile(join(dir, `${slowMode}.read-done`));
  // A GYORS FELET ELINDÍTJUK, DE NEM VÁRJUK MEG. A sor-zár bevezetése óta a gyors fél a zárba
  // ÜTKÖZIK, és csak a lassú COMMIT-ja után folytatódik — ha itt megvárnánk, a saját próbánk
  // akadna be (a lassú a `go`-ra vár, a gyors a zárra). A versenyt a megállítási pont már
  // előidézte; innen a két fél SORRENDJE a mérés tárgya, nem a befejezésük sorrendje.
  const fastP = child(fastMode, payload(fastMode), dir);
  await new Promise((r) => setTimeout(r, 400));                  // hadd érjen a zárig
  await touch(join(dir, `${slowMode}.go`));                      // és csak UTÁNA engedjük tovább
  const [slowRes, fast] = [await slow, await fastP];
  rmSync(dir, { recursive: true, force: true });

  // A VÉGÁLLAPOT a tárolóból, nem a válaszokból.
  const s = openPgStore(url);
  const inviteRow = s.get('SELECT redeemed_at FROM invite WHERE token = ?', f.token);
  const revocations = s.get('SELECT COUNT(*) AS n FROM invite_revocation WHERE token = ?', f.token).n;
  const membership = s.get('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ?', f.guestId, f.bookId).n;
  s.close();
  return {
    label, reachedRead, slow: slowRes, fast,
    state: { redeemed: Boolean(inviteRow && inviteRow.redeemed_at), revocations, membership },
  };
}

const results = [];
// MINDKÉT KIKÉNYSZERÍTETT SORREND (a parancs kifejezett kérése).
results.push(await round('(a) a BEVÁLTÁS olvasott előbb, a VISSZAVONÁS írt közben', 'redeem', 'revoke', `a${Date.now().toString(36)}`));
results.push(await round('(b) a VISSZAVONÁS olvasott előbb, a BEVÁLTÁS írt közben', 'revoke', 'redeem', `b${Date.now().toString(36)}`));

// ── (c) A MÁSODIK NEVEZETT ESET: hatáskör-adás ↔ a TAGSÁG megvonása ─────────────────────────
//
// „hatáskör/tagság megvonása ↔ arra támaszkodó meglévő írás" (R150 §4/2). A hatáskör-adás a
// CÉLSZEMÉLY TAGSÁGÁRA támaszkodik: ha a tagságot közben megvonják, egy MEGVONT tagnak adott
// élő adatkör néma jogosultság-szivárgás volna.
{
  const mark = `c${Date.now().toString(36)}`;
  const f = await fixtureWithMember(app, mark);
  if (!f.member) {
    results.push({ label: '(c) HATÁSKÖR-ADÁS ↔ TAGSÁG-MEGVONÁS', stalled: 'a tagság nem jött létre a fixtúrában' });
  } else {
    const dir = mkdtempSync(join(tmpdir(), 'race-'));
    const base = { bookId: f.bookId, target: f.guestId, actor: f.ownerId, scope: 'arak' };
    // A lassú fél a hatáskör-adás: a TAGSÁG olvasása után áll meg.
    const slow = child('grantScope', { ...base, pauseAfterReadMatch: 'FROM membership' }, dir);
    const reachedRead = await waitFile(join(dir, 'grantScope.read-done'));
    const fastP = child('revokeMembership', { ...base, pauseAfterReadMatch: null }, dir);
    await new Promise((r) => setTimeout(r, 400));
    await touch(join(dir, 'grantScope.go'));
    const [slowRes, fast] = [await slow, await fastP];
    rmSync(dir, { recursive: true, force: true });

    const s = openPgStore(url);
    const revoked = s.get('SELECT revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', f.guestId, f.bookId);
    // A MÉRCE A VISELKEDÉS, NEM A SOR (KUKA-237). Egy `scope_grant` sor léte önmagában nem
    // szivárgás: a kiadást ugyanaz a feloldó dönti el, amit a `/api/data/*` útvonal is hív
    // (`scopeReleaseDecision`) — és AZ nézi a tagságot is. Ezért azt kérdezzük meg, amit a
    // VALÓDI olvasó-út kérdez, a megvonás hatályba lépése UTÁNI időpillanatban.
    const after = new Date(Date.now() + 60000).toISOString();
    const liveScope = readAllowed(s, f.guestId, f.bookId, 'arak', after) ? 1 : 0;
    s.close();
    // ── NEGATÍV KONTROLL (KUKA-122): UGYANEZ A KÉT MŰVELET, VERSENY NÉLKÜL, SORBAN ───────────
    //
    // Enélkül nem tudnánk, hogy a lelet a VERSENYTŐL van-e. Ha a sorosan lefuttatott pár is
    // ugyanazt adja, akkor nem versenyhiba, hanem a művelet-sorrend tulajdonsága — és akkor a
    // „versenyhiba" megnevezés HAMIS volna. Az attribúció MÉRÉS, nem besorolás (KUKA-033).
    const cmark = `k${Date.now().toString(36)}`;
    const g = await fixtureWithMember(app, cmark);
    let controlAllows = null;
    if (g.member) {
      const d2 = mkdtempSync(join(tmpdir(), 'ctl-'));
      const cbase = { bookId: g.bookId, target: g.guestId, actor: g.ownerId, scope: 'arak', pauseAfterReadMatch: null };
      await child('grantScope', cbase, d2);          // előbb a hatáskör-adás, VÉGIG
      await child('revokeMembership', cbase, d2);    // és CSAK UTÁNA a megvonás
      rmSync(d2, { recursive: true, force: true });
      const s2 = openPgStore(url);
      const after2 = new Date(Date.now() + 60000).toISOString();
      controlAllows = readAllowed(s2, g.guestId, g.bookId, 'arak', after2);
      s2.close();
    }

    results.push({
      label: '(c) HATÁSKÖR-ADÁS ↔ TAGSÁG-MEGVONÁS', reachedRead, slow: slowRes, fast,
      state: { membershipRevoked: Boolean(revoked && revoked.revoked_at), liveScope, controlAllows },
      custom: true,
    });
  }
}

for (const r of results) {
  console.log(`\n  ${r.label}`);
  if (r.stalled) { check('—', 'ELAKADT MÉRÉS', false, r.stalled); continue; }
  console.log(`     a megállítási pont fogott: ${r.reachedRead ? 'IGEN' : 'NEM'}`);
  if (!r.custom) {
    console.log(`     lassú(${r.slow.mode}): ${JSON.stringify(r.slow.out).slice(0, 150)}`);
    console.log(`     gyors(${r.fast.mode}): ${JSON.stringify(r.fast.out).slice(0, 150)}`);
  }
  if (r.custom) {
    console.log(`     lassú(grantScope): ${JSON.stringify(r.slow.out).slice(0, 150)}`);
    console.log(`     gyors(revokeMembership): ${JSON.stringify(r.fast.out).slice(0, 150)}`);
    console.log(`     VÉGÁLLAPOT: a tagság megvonva=${r.state.membershipRevoked} · a KÉT KAPU együtt enged 'arak'-ot=${r.state.liveScope === 1}`);
    check('[c1]', 'a verseny TÉNYLEG előállt (a megállítási pont fogott)', r.reachedRead === true);
    console.log(`     NEGATÍV KONTROLL (verseny NÉLKÜL, sorban): a két kapu enged 'arak'-ot = ${r.state.controlAllows}`);
    const leaked = r.state.membershipRevoked && r.state.liveScope > 0;
    // A LELET CSAK AKKOR VERSENY-LELET, ha a verseny NÉLKÜLI sorrend MÁST ad.
    const raceSpecific = leaked && r.state.controlAllows === false;
    check('[c2]', 'a MEGVONT tag a KÉT KAPUN át sem kap adatot', !leaked,
      leaked
        ? (raceSpecific
          ? 'a verseny MÁST adott, mint a sorosan futtatott pár — ez VERSENYHIBA'
          : `a kontroll is ugyanezt adja (${r.state.controlAllows}) — NEM versenyhiba`)
        : '');
    const grantOk = r.slow.out && r.slow.out.ok === true;
    check('[c3]', 'a verseny és a verseny nélküli sorrend UGYANAZT a végállapotot adja',
      r.state.controlAllows === (r.state.liveScope === 1),
      `verseny: ${r.state.liveScope === 1} · kontroll: ${r.state.controlAllows}`);
    continue;
  }
  console.log(`     VÉGÁLLAPOT: beváltva=${r.state.redeemed} · visszavonás-sor=${r.state.revocations} · tagság=${r.state.membership}`);

  check(`[${r.label[1]}1]`, 'a verseny TÉNYLEG előállt (a megállítási pont fogott)', r.reachedRead === true);
  // AZ INVARIÁNS: beváltott meghívóhoz nem születhet visszavonás, és fordítva.
  const both = r.state.redeemed && r.state.revocations > 0;
  check(`[${r.label[1]}2]`, 'a meghívó NEM lett egyszerre beváltott ÉS visszavont', !both,
    both ? 'MINDKETTŐ megtörtént — a visszavonás egy már elfogadott meghívót „vont vissza", vagy a beváltás egy visszavont meghívót fogadott el' : '');
  // A NYUGTA IGAZAT MOND: ha tagság született, a beváltás nyugtája sikert mondjon, és fordítva.
  const redeemRes = (r.slow.mode === 'redeem' ? r.slow : r.fast).out;
  const saidOk = redeemRes && redeemRes.ok === true;
  check(`[${r.label[1]}3]`, 'a NYUGTA egyezik a végállapottal (tagság ⇔ sikeres beváltás)',
    saidOk === (r.state.membership > 0),
    `a beváltás nyugtája: ok=${saidOk} · tagság a tárolóban: ${r.state.membership}`);
}

await app.close();
console.log(`\n${'='.repeat(78)}`);
const bad = marks.filter((m) => !m.ok);
console.log(`ALAPSOKASÁG: ${results.length} kikényszerített menet · ${marks.length} mért állítás.`);
if (!bad.length) { console.log('RESULT: PASS — a mért utakon az invariáns tartott, és a nyugta igazat mondott.'); process.exit(0); }
console.log(`RESULT: FAIL — ${bad.length} állítás`); process.exit(3);
