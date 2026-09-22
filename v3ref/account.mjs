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

/**
 * CHR-01 — A MEGERŐSÍTÉS ÚJRAKÉRÉSÉNEK SZABÁLYA, EGY HELYEN (R75/F75-01).
 *
 * MI VOLT A HIBA. A kihívás 24 óráig élt, és lejárás után a képernyő azt mondta: „regisztrálj
 * újra" — ami NEM működik: a cím már foglalt, a második regisztráció (helyesen) semleges választ
 * ad, levél nem megy ki, a fiók pedig bizonyítatlan marad, tehát munkakörnyezetet sem lehet
 * indítani. A felhasználó ZSÁKUTCÁBA ért (KUKA-064), a felirat meg olyasmit ígért, ami nem igaz
 * (KUKA-050). A lelet a külső ellenőrző félé (chatgpt-v3, R75/F75-01), valódi HTTP-n reprodukálva.
 *
 * A SZABÁLY, KIMONDVA — EGY CÍMRE EGY ÉLŐ HIVATKOZÁS:
 *   · új hivatkozás kiadása a korábbi, még be nem váltott és le nem járt hivatkozásokat LEVÁLTJA
 *     (`superseded_at` + `superseded_by`), tehát a régi levél hivatkozása nevezetten elutasított;
 *   · a LEJÁRT és a MÁR BEVÁLTOTT hivatkozás SOHA nem éled újra — az új kérés ÚJ sort ír, a
 *     régi tények változatlanok maradnak (a napló nem íródik át);
 *   · az ismétlés KORLÁTOS: két levél között legalább `min_gap_ms`, és egy ablakban legfeljebb
 *     `max_per_window` — a korlát a CÍMHEZ tartozik, tehát nem lehet vele levelet záporoztatni;
 *   · a jelszóhoz EGYETLEN ága sem nyúl: az újrakérés nem hitelesítő-művelet.
 */
export const CHALLENGE_POLICY = frozen({
  ttl_ms: 24 * 60 * 60 * 1000,
  min_gap_ms: 60 * 1000,
  max_per_window: 5,
  window_ms: 24 * 60 * 60 * 1000,
});

/** EGYSZERI KIHÍVÁS a címre — a kiküldés az alkalmazás dolga (fejlesztői levél-fogadó), ez csak a tény. */
export function issueChannelChallenge({ store, subjectId, namespace = 'email', value, token, at, ttlMs = CHALLENGE_POLICY.ttl_ms, supersede = true }) {
  const t = instantMs(at);
  if (!t.ok) return frozen({ ok: false, reason: `issued_at_${t.reason}` });
  if (typeof token !== 'string' || token.length < 16) return frozen({ ok: false, reason: 'token_too_short' });
  const v = norm(value);
  if (!v) return frozen({ ok: false, reason: 'value_required' });
  const expiresAt = new Date(t.ms + ttlMs).toISOString();
  return store.atomic(() => {
    // A LEVÁLTÁS AZ ÍRÁSSAL EGY TRANZAKCIÓBAN: nem lehet olyan pillanat, amikor két élő
    // hivatkozás áll ugyanarra a címre (KUKA-026: a hatás és a nyoma nem szakad el).
    let superseded = 0;
    if (supersede) {
      // AZ IDŐT NEM SZÖVEGKÉNT HASONLÍTJUK (KUKA-029 · IDO-01): a lejárat eldöntése az `instantMs`
      // feloldóé, nem az SQL `>` operátoráé — egy zónás alak („+02:00") a szöveg-rendezésben
      // NÉMÁN rossz oldalra kerülne, és egy lejárt hivatkozást „élőnek" olvasnánk.
      const open = store.all(
        `SELECT token, expires_at FROM channel_challenge
         WHERE subject_id = ? AND namespace = ? AND value_norm = ? AND used_at IS NULL AND superseded_at IS NULL`,
        subjectId, namespace, v);
      for (const row of open) {
        const ex = instantMs(row.expires_at);
        if (!ex.ok || ex.ms <= t.ms) continue;                       // a lejárt marad „lejárt"
        const r = store.run(
          'UPDATE channel_challenge SET superseded_at = ?, superseded_by = ? WHERE token = ? AND used_at IS NULL AND superseded_at IS NULL',
          at, token, row.token);
        superseded += Number(r.changes || 0);
      }
    }
    store.run(
      'INSERT INTO channel_challenge (token, subject_id, namespace, value_norm, created_at, expires_at, used_at) VALUES (?,?,?,?,?,?,NULL)',
      token, subjectId, namespace, v, at, expiresAt);
    return frozen({ ok: true, token, subject_id: subjectId, namespace, value_norm: v, expires_at: expiresAt, superseded });
  });
}

/**
 * ÚJ MEGERŐSÍTŐ HIVATKOZÁS KÉRÉSE — a korlátokkal együtt (CHR-01).
 *
 * A VÁLASZ BEFELÉ NEVEZETT, KIFELÉ A HÍVÓ DOLGA SEMLEGESSÉ TENNI (K03 anti-enumeráció): ez a
 * függvény megmondja, MIÉRT nem ment ki levél (`channel_already_proven` · `resend_rate_limited`),
 * az alkalmazás viszont ugyanazt a semleges mondatot adja vissza minden ágon (KUKA-084 · KUKA-058:
 * ahol a válasz szándékosan egyforma, befelé a napló beszél).
 */
export function reissueChannelChallenge({ store, subjectId, namespace = 'email', value, token, at, policy = CHALLENGE_POLICY }) {
  const t = instantMs(at);
  if (!t.ok) return frozen({ ok: false, reason: `requested_at_${t.reason}` });
  if (typeof subjectId !== 'string' || !subjectId.trim()) return frozen({ ok: false, reason: 'subject_id_required' });
  const v = norm(value);
  if (!v) return frozen({ ok: false, reason: 'value_required' });
  if (!store.get('SELECT 1 AS ok FROM subject WHERE id = ?', subjectId)) return frozen({ ok: false, reason: 'subject_unknown' });
  // MÁR BIZONYÍTOTT CSATORNÁRA NINCS ÚJ HIVATKOZÁS — nem hiba, hanem „nincs mit kérni".
  const proven = store.get(
    'SELECT 1 AS ok FROM channel_proof WHERE subject_id = ? AND namespace = ? AND value_norm = ?',
    subjectId, namespace, v);
  if (proven) return frozen({ ok: false, reason: 'channel_already_proven' });

  const windowStart = new Date(t.ms - policy.window_ms).toISOString();
  const recent = store.all(
    `SELECT created_at FROM channel_challenge
     WHERE subject_id = ? AND namespace = ? AND value_norm = ? AND created_at > ?
     ORDER BY created_at DESC`,
    subjectId, namespace, v, windowStart);
  if (recent.length >= policy.max_per_window) {
    return frozen({ ok: false, reason: 'resend_rate_limited', limit: 'max_per_window', sent_in_window: recent.length, window_ms: policy.window_ms });
  }
  if (recent.length) {
    const last = instantMs(recent[0].created_at);
    const waited = last.ok ? t.ms - last.ms : Number.POSITIVE_INFINITY;
    if (waited < policy.min_gap_ms) {
      return frozen({ ok: false, reason: 'resend_rate_limited', limit: 'min_gap', retry_after_ms: policy.min_gap_ms - waited });
    }
  }
  const issued = issueChannelChallenge({ store, subjectId, namespace, value: v, token, at, ttlMs: policy.ttl_ms, supersede: true });
  if (!issued.ok) return issued;
  return frozen({ ...issued, sent_in_window: recent.length + 1 });
}

/** A KIHÍVÁS BEVÁLTÁSA ⇒ csatorna-bizonyíték. Lejárt, ismeretlen vagy már használt: nevezett, írásmentes. */
export function redeemChannelChallenge({ store, token, at }) {
  const t = instantMs(at);
  if (!t.ok) return frozen({ ok: false, reason: `redeemed_at_${t.reason}` });
  const row = store.get('SELECT * FROM channel_challenge WHERE token = ?', String(token ?? ''));
  if (!row) return frozen({ ok: false, reason: 'challenge_unknown' });
  if (row.used_at) return frozen({ ok: false, reason: 'challenge_already_used' });
  // A SORREND SZERZŐDÉS: a BEVÁLTOTT marad „beváltott", a LEJÁRT marad „lejárt" — a leváltás csak
  // az élő, még beváltatlan hivatkozásra igaz (CHR-01). Egyik ág sem éled újra egy újabb kéréstől.
  const ex = instantMs(row.expires_at);
  if (!ex.ok || ex.ms <= t.ms) return frozen({ ok: false, reason: 'challenge_expired' });
  if (row.superseded_at) return frozen({ ok: false, reason: 'challenge_superseded', superseded_at: row.superseded_at });
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
