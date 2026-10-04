// A PÁRHUZAMOSSÁG-PRÓBA GYEREK-FOLYAMATA (PCC-01). Külön OS-folyamat, SAJÁT PostgreSQL-kapcsolat.
//
// MIÉRT KÜLÖN FOLYAMAT, ÉS NEM `Promise.all`. Mert a szinkron híd egy folyamaton belül SOROSÍT
// (ez a híd kimondott ára), tehát egy folyamaton belüli „párhuzamos" hívás-sorozat NEM mérne
// versenyt: a második hívás akkor indulna, amikor az első már befejeződött, és minden ütközés
// elmaradna. Az üres eredményt helyesnek látni pontosan a KUKA-120 hibája. Valódi verseny
// KÜLÖN kapcsolatokon van — és Railway-n is így lesz: több példány, több kapcsolat.
import { openPgStore } from '../v3ref/pgStore.mjs';
import { onceOnlyCommit } from '../v3ref/onceOnly.mjs';

const [, , url, mode, startAtMs, tag] = process.argv;
const store = openPgStore(url);

// BARRIER: minden gyerek UGYANABBAN a pillanatban indul, különben nincs mit mérni.
const until = Number(startAtMs);
while (Date.now() < until) { /* szoros várakozás — a cél az egyidejűség, nem a kímélet */ }

let out;
try {
  if (mode === 'once-only') {
    out = onceOnlyCommit({
      store, bookId: 'race-book', actor: 'race-actor', idemKey: 'race-key',
      operation: 'stock_receipt', identity: 'identity-hash-1',
      effect: { by: tag }, at: '2026-10-04T10:00:00.000Z',
    });
  } else if (mode === 'membership') {
    // UGYANAZ A TAGSÁG-SOR, EGYSZERRE. A kulcs (subject_id, book_id) tartja az invariánst —
    // nem egy alkalmazás-oldali „létezik már?" ellenőrzés, amit a verseny megkerülne (KUKA-047).
    try {
      store.run('INSERT INTO membership (subject_id, book_id, role, granted_at) VALUES (?,?,?,?)',
        'race-subject', 'race-book', 'member', '2026-10-04T10:00:00.000Z');
      out = { ok: true };
    } catch (e) { out = { ok: false, code: e.code, unique: /23505/.test(String(e.code)) }; }
  } else {
    out = { ok: false, reason: 'unknown_mode' };
  }
} catch (e) {
  out = { ok: false, threw: true, message: String(e && e.message || e), code: e && e.code };
}
process.stdout.write(JSON.stringify({ tag, out }) + '\n');
store.close();
