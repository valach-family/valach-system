// V3 — A DOMAIN-VERSENY GYEREK-FOLYAMATA (RCE-02). Külön OS-folyamat, SAJÁT PG-kapcsolat.
//
// A MEGÁLLÍTÁSI PONT A TRANZAKCIÓN BELÜL, A KÖZÖS SOR-ZÁR MEGSZERZÉSE UTÁN van (F152-02).
//
// MIÉRT PONT OTT, ÉS MIÉRT NEM EGY OLVASÁS UTÁN. Az első alakom a `FROM invite WHERE token`
// mintára állt meg — csakhogy a `redeemInvite` ezt a mondatot a TRANZAKCIÓ és a `lockRows` ELŐTT
// is olvassa. A „beváltás olvasott előbb" menet tehát NEM kényszerítette ki, hogy a beváltás
// BIRTOKOLJA a zárat és előbb véglegesüljön — mindkét menetben ugyanaz a fél nyert, vagyis a két
// kért nyerési sorrendből EGYET sem igazoltam. (Megtalálta: a külső ellenőrző fél, R152/F152-02.)
//
// Mostantól a burkoló a `lockRows` UTÁN áll meg: ekkor a zár már a MIÉNK, és a másik fél
// bizonyíthatóan VÁRNI fog rá — ezt a szülő a PostgreSQL `pg_locks` nézetéből olvassa vissza,
// nem egy `sleep`-ből (a puszta várakozás nem kapu).
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { openPgStore } from '../v3ref/pgStore.mjs';
import { redeemInvite, revokeInvite } from '../v3ref/invite.mjs';
import { delegationCeilingOf, grantScopeToMember } from '../v3ref/delegation.mjs';
import { revokeMembership } from '../v3ref/authz.mjs';

const [, , url, mode, barrierDir, payloadJson] = process.argv;
const P = JSON.parse(payloadJson);
const clock = { now: () => new Date().toISOString() };

const raw = openPgStore(url);
let reachedPause = false;
let barrierTimedOut = false;

/** Szinkron várakozás egy fájlra. A VISSZATÉRÉSI ÉRTÉKET a hívó MEGNÉZI (F152-02/4). */
function waitForFile(f, timeoutMs = 25000) {
  const until = Date.now() + timeoutMs;
  while (!existsSync(f) && Date.now() < until) { /* szoros várakozás: a cél a pontos pillanat */ }
  return existsSync(f);
}

const store = {
  ...raw,
  get(sql, ...a) { return raw.get(sql, ...a); },
  all(sql, ...a) { return raw.all(sql, ...a); },
  run(sql, ...a) { return raw.run(sql, ...a); },
  tx(fn) { return raw.tx(fn); },
  atomic(fn) { return raw.atomic(fn); },
  get dialect() { return raw.dialect; },
  /** A ZÁR MEGSZERZÉSE UTÁN állunk meg — ekkor a másik fél már NEM tud bejönni. */
  lockRows(table, where, ...params) {
    const n = raw.lockRows(table, where, ...params);
    if (P.pauseAfterLockOn && table === P.pauseAfterLockOn && !reachedPause) {
      reachedPause = true;
      writeFileSync(join(barrierDir, `${mode}.locked`), '1');
      if (!waitForFile(join(barrierDir, `${mode}.go`))) barrierTimedOut = true;
    }
    return n;
  },
};

let out;
try {
  if (mode === 'redeem') {
    out = redeemInvite({ store, token: P.token, actingSubjectId: P.actor, clock });
  } else if (mode === 'revoke') {
    out = revokeInvite({ store, clock, token: P.token, bookId: P.bookId, revokerSubjectId: P.actor, delegationCeilingOf });
  } else if (mode === 'grantScope') {
    out = grantScopeToMember({ store, granterSubjectId: P.actor, bookId: P.bookId, targetSubjectId: P.target, scope: P.scope, at: clock.now() });
  } else if (mode === 'revokeMembership') {
    out = revokeMembership({ store, subjectId: P.target, bookId: P.bookId, clock, actorSubjectId: P.actor });
  } else {
    out = { ok: false, reason: 'unknown_mode' };
  }
} catch (e) {
  out = { ok: false, threw: true, code: e && e.code, message: String(e && e.message || e).slice(0, 180) };
}
// A HÁROM TÉNY EGYÜTT MEGY VISSZA: mi lett a kimenet · elértük-e a megállítási pontot · és
// LEJÁRT-E a barrier. A lejárt barrier NEM mérés: a szülő ebből FAIL-t csinál, nem PASS-t.
process.stdout.write(JSON.stringify({ mode, reachedPause, barrierTimedOut, out }) + '\n');
try { writeFileSync(join(barrierDir, `${mode}.done`), '1'); } catch { /* a jelzés hiánya nem fed el eredményt */ }
raw.close();
