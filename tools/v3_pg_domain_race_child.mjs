// V3 — A DOMAIN-VERSENY GYEREK-FOLYAMATA (RCE-01). Külön OS-folyamat, SAJÁT PG-kapcsolat.
//
// A LÉNYEG A DETERMINISZTIKUS MEGÁLLÍTÁSI PONT. Az „egyszerre indítás" önmagában NEM bizonyítja
// a kívánt ütközést (R150 §4): ha a két folyamat véletlenül sorban fut le, a próba zöld lesz
// anélkül, hogy a versenyt egyáltalán előidézte volna — ez a KUKA-120 hibája. Ezért a tároló
// köré egy BURKOLÓ kerül, ami egy MEGNEVEZETT SQL-minta után megáll, és fájl-jelzéssel vár.
// Így az „olvasás megtörtént, írás még nem" állapot KÉNYSZERÍTETT, nem remélt.
//
// A BURKOLÓ CSAK A PRÓBÁBAN ÉL. A domain-kód ettől nem tud róla: ugyanazt az API-t kapja.
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
let paused = false;

/** Szinkron várakozás egy fájlra — a hívó szál amúgy is blokkol, itt ez a helyes alak. */
function waitForFile(f, timeoutMs = 20000) {
  const until = Date.now() + timeoutMs;
  while (!existsSync(f) && Date.now() < until) { /* szoros várakozás: a cél a pontos pillanat */ }
  return existsSync(f);
}

/** A tároló burkolója: a megnevezett OLVASÁS után megáll, mielőtt bármit ÍRNA. */
const store = {
  ...raw,
  get(sql, ...a) {
    const row = raw.get(sql, ...a);
    if (!paused && P.pauseAfterReadMatch && String(sql).includes(P.pauseAfterReadMatch)) {
      paused = true;
      writeFileSync(join(barrierDir, `${mode}.read-done`), '1');
      waitForFile(join(barrierDir, `${mode}.go`));
    }
    return row;
  },
  all(sql, ...a) { return raw.all(sql, ...a); },
  run(sql, ...a) { return raw.run(sql, ...a); },
  tx(fn) { return raw.tx(fn); },
  atomic(fn) { return raw.atomic(fn); },
  get dialect() { return raw.dialect; },
};

let out;
try {
  if (mode === 'redeem') {
    out = redeemInvite({ store, token: P.token, actingSubjectId: P.actor, clock });
  } else if (mode === 'revoke') {
    out = revokeInvite({
      store, clock, token: P.token, bookId: P.bookId,
      revokerSubjectId: P.actor, delegationCeilingOf,
    });
  } else if (mode === 'grantScope') {
    out = grantScopeToMember({
      store, granterSubjectId: P.actor, bookId: P.bookId,
      targetSubjectId: P.target, scope: P.scope, at: clock.now(),
    });
  } else if (mode === 'revokeMembership') {
    out = revokeMembership({
      store, subjectId: P.target, bookId: P.bookId, clock, actorSubjectId: P.actor,
    });
  } else {
    out = { ok: false, reason: 'unknown_mode' };
  }
} catch (e) {
  out = { ok: false, threw: true, code: e && e.code, message: String(e && e.message || e).slice(0, 180) };
}
// Ha a megállítási pont nem fogott (nem jött szembe a minta), azt KI KELL MONDANI: a mérés
// ilyenkor nem a versenyt mérte (KUKA-171 — ami megállít, annak neve legyen).
process.stdout.write(JSON.stringify({ mode, paused, out }) + '\n');
try { writeFileSync(join(barrierDir, `${mode}.done`), '1'); } catch { /* a jelzés hiánya nem fed el eredményt */ }
raw.close();
