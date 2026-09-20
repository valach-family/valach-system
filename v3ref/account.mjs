// V3 MAGREFERENCIA — ACC-01: FIÓK, BELÉPÉS ÉS A CSATORNA BIZONYÍTÁSA (K03 · R63 §5.2).
//
// MI VOLT EDDIG. A tároló ismerte a fiókot (`account.credential`) és a csatorna-bizonyítékot
// (`channel_proof`), a meghívó-beváltás ÍRTA is a fiókot — de a rendszerben NEM VOLT belépés: a
// „hitelesítő adat" egy tetszőleges szöveg volt, amit senki nem ellenőrzött, és a csatornát csak a
// próbák nyers `INSERT`-je bizonyította. Az első felhasználói folyamathoz (R63) mindkettő KELL, és
// „az alkalmazás számára azonosított cselekvő hiteles sessionből jöjjön, ne kliens által megadott
// actor/role/workspace mezőből" — a session pedig itt születik: egy ELLENŐRZÖTT belépésből.
//
// A HITELESÍTŐ ADAT SOHA NEM ÁLL NYERSEN A TÁROLÓBAN. A `credential` oszlopba a jelszó
// SÓZOTT, KULCSNYÚJTOTT lenyomata kerül (`scrypt`, node:crypto), és a meghívó-beváltás is ezt a
// lenyomatot kapja `newCredential`-ként — a beváltó (invite.mjs) VÁLTOZATLAN, mert neki mindegy,
// mit ír: a lenyomat képzése és ellenőrzése EGY helyen él, itt (KUKA-003 · KUKA-018).
//
// A CSATORNA BIZONYÍTÁSA KÜLÖN LÉPÉS, KÜLÖN TÉNY. A regisztrációkor az e-mail cím ÖNBEVALLOTT
// (external_id, issuer=self_asserted). A `channel_proof` — amit a meghívó megfigyelése és
// beváltása KÉRDEZ — csak a címre kiküldött egyszeri kihívás beváltásából születik. A kettő
// összemosása pontosan az a hiba volna, amit a K03 tilt: aki beír egy címet, még nem birtokolja.
//
// A SIKERTELEN BELÉPÉS VÁLASZA EGYFORMA. Ismeretlen cím és rossz jelszó UGYANAZT a nevezett
// választ kapja (`credentials_rejected`) — a fiók LÉTEZÉSE nem szivároghat (KUKA-084). Befelé, a
// naplóban a különbség megmarad (KUKA-058: ahol a válasz szándékosan egyforma, a napló beszél).

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { instantMs } from './store.mjs';

const frozen = (o) => Object.freeze(o);
const norm = (v) => String(v ?? '').trim().toLowerCase();

const SCRYPT = frozen({ N: 16384, r: 8, p: 1, keylen: 32, tag: 'scrypt-v1' });

/** A jelszó TÁROLHATÓ lenyomata. Véletlen só; az alak önleíró, hogy egy későbbi paraméter-váltás felismerhető legyen. */
export function hashCredential(secret) {
  if (typeof secret !== 'string' || secret.length < 8) throw Object.assign(new Error('hashCredential: a jelszó legalább 8 karakter'), { code: 'secret_too_short' });
  const salt = randomBytes(16);
  const key = scryptSync(secret, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `${SCRYPT.tag}$${salt.toString('base64')}$${key.toString('base64')}`;
}

/** Igaz, ha a jelszó a tárolt lenyomathoz tartozik. Ismeretlen alakú lenyomat ⇒ hamis, sosem kivétel. */
export function verifyCredential(secret, stored) {
  if (typeof secret !== 'string' || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== SCRYPT.tag) return false;
  let salt; let expected;
  try { salt = Buffer.from(parts[1], 'base64'); expected = Buffer.from(parts[2], 'base64'); } catch { return false; }
  if (expected.length !== SCRYPT.keylen) return false;
  const key = scryptSync(secret, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return timingSafeEqual(key, expected);
}

/** A cím ÉLŐ hordozója (self_asserted e-mail, lezáratlan sor) — vagy `null`. */
export function subjectByEmail(store, email) {
  const row = store.get(
    `SELECT subject_id FROM external_id WHERE namespace = 'email' AND value_norm = ? AND valid_to IS NULL ORDER BY valid_from LIMIT 1`,
    norm(email));
  return row ? row.subject_id : null;
}

/**
 * ÚJ FIÓK — a SZEMÉLY alanya + önbevallott e-mail + a jelszó lenyomata, EGY egységben.
 * A cím foglaltsága NEVEZETT válasz a hívónak (az alkalmazás dönti el, mit mond kifelé — a K03
 * anti-enumerációs szabálya ott érvényesül, ahol a válasz kimegy).
 */
export function registerAccount({ store, subjectId, email, secret, at }) {
  const t = instantMs(at);
  if (!t.ok) return frozen({ ok: false, reason: `registered_at_${t.reason}` });
  if (typeof subjectId !== 'string' || !subjectId.trim()) return frozen({ ok: false, reason: 'subject_id_required' });
  const e = norm(email);
  if (!e || !e.includes('@')) return frozen({ ok: false, reason: 'email_required' });
  if (typeof secret !== 'string' || secret.length < 8) return frozen({ ok: false, reason: 'secret_too_short' });
  if (subjectByEmail(store, e)) return frozen({ ok: false, reason: 'address_already_registered' });
  if (store.get('SELECT 1 AS ok FROM subject WHERE id = ?', subjectId)) return frozen({ ok: false, reason: 'subject_id_taken' });
  const credential = hashCredential(secret);
  return store.atomic(() => {
    store.run('INSERT INTO subject (id, kind) VALUES (?, ?)', subjectId, 'person');
    store.run(
      `INSERT INTO external_id (subject_id, namespace, issuer, jurisdiction, value_raw, value_norm, cardinality, valid_from, valid_to)
       VALUES (?,?,?,?,?,?,?,?,NULL)`,
      subjectId, 'email', 'self_asserted', 'n/a', String(email).trim(), e, 'one_to_one', at);
    store.run('INSERT INTO account (subject_id, credential) VALUES (?,?)', subjectId, credential);
    return frozen({ ok: true, subject_id: subjectId, email: e, channel_proven: false });
  });
}

/** BELÉPÉS. A sikertelen ág EGYFORMA — a cím létezése nem szivárog. */
export function authenticate({ store, email, secret }) {
  const rejected = frozen({ ok: false, reason: 'credentials_rejected' });
  const subjectId = subjectByEmail(store, email);
  if (!subjectId) { verifyCredential(String(secret ?? ''), 'scrypt-v1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='); return rejected; }
  const acc = store.get('SELECT credential FROM account WHERE subject_id = ?', subjectId);
  if (!acc || !acc.credential || !verifyCredential(String(secret ?? ''), acc.credential)) return rejected;
  return frozen({ ok: true, subject_id: subjectId });
}

/** EGYSZERI KIHÍVÁS a címre — a kiküldés az alkalmazás dolga (fejlesztői levél-fogadó), ez csak a tény. */
export function issueChannelChallenge({ store, subjectId, namespace = 'email', value, token, at, ttlMs = 24 * 60 * 60 * 1000 }) {
  const t = instantMs(at);
  if (!t.ok) return frozen({ ok: false, reason: `issued_at_${t.reason}` });
  if (typeof token !== 'string' || token.length < 16) return frozen({ ok: false, reason: 'token_too_short' });
  const v = norm(value);
  if (!v) return frozen({ ok: false, reason: 'value_required' });
  const expiresAt = new Date(t.ms + ttlMs).toISOString();
  store.run(
    'INSERT INTO channel_challenge (token, subject_id, namespace, value_norm, created_at, expires_at, used_at) VALUES (?,?,?,?,?,?,NULL)',
    token, subjectId, namespace, v, at, expiresAt);
  return frozen({ ok: true, token, subject_id: subjectId, namespace, value_norm: v, expires_at: expiresAt });
}

/** A KIHÍVÁS BEVÁLTÁSA ⇒ csatorna-bizonyíték. Lejárt, ismeretlen vagy már használt: nevezett, írásmentes. */
export function redeemChannelChallenge({ store, token, at }) {
  const t = instantMs(at);
  if (!t.ok) return frozen({ ok: false, reason: `redeemed_at_${t.reason}` });
  const row = store.get('SELECT * FROM channel_challenge WHERE token = ?', String(token ?? ''));
  if (!row) return frozen({ ok: false, reason: 'challenge_unknown' });
  if (row.used_at) return frozen({ ok: false, reason: 'challenge_already_used' });
  const ex = instantMs(row.expires_at);
  if (!ex.ok || ex.ms <= t.ms) return frozen({ ok: false, reason: 'challenge_expired' });
  return store.atomic(() => {
    const used = store.run('UPDATE channel_challenge SET used_at = ? WHERE token = ? AND used_at IS NULL', at, row.token);
    if (used.changes !== 1) throw new Error('redeemChannelChallenge: a kihívást közben már beváltották');
    store.run(
      'INSERT OR IGNORE INTO channel_proof (subject_id, namespace, value_norm, proven_at) VALUES (?,?,?,?)',
      row.subject_id, row.namespace, row.value_norm, at);
    return frozen({ ok: true, subject_id: row.subject_id, namespace: row.namespace, value_norm: row.value_norm, proven_at: at });
  });
}

/** Van-e az alanynak BIZONYÍTOTT e-mail csatornája — a saját munkakörnyezet indításának előfeltétele. */
export function provenEmailOf(store, subjectId) {
  const row = store.get(
    `SELECT cp.value_norm FROM channel_proof cp
     WHERE cp.subject_id = ? AND cp.namespace = 'email' ORDER BY cp.proven_at LIMIT 1`, subjectId);
  return row ? row.value_norm : null;
}
