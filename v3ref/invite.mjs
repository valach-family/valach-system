// V3 MAGREFERENCIA — K03: fiók, belépés, meghívás és tagság.
//
// A K03 negyedik bekezdése a mérce, szó szerint:
//   „A jogosulatlanul nézett, azonos címzetti feltételű meghívóknál a FIÓK LÉTEZÉSE nem
//    befolyásolhatja a látható választ, fiókváltási lehetőséget, státuszt vagy hitelesítési út
//    felkínálását. A semleges »Folytasd a meghívás címzetti feltételének megfelelő azonossággal«
//    út mind létező, mind még nem létező fióknál elérhető."
//
// Ez a mi KUKA-083/084 hibaosztályunk szerződéses alakja: nem az számít, HOL áll a kapu, hanem
// hogy egyetlen MEGFIGYELHETŐ viselkedés sem függhet a védett ténytől. Ezért a megfigyelés
// visszaadott alakja egyetlen helyen születik, és a próba a KETTŐ EGYEZÉSÉT méri (A04).

const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();

export function hasProvenChannel(store, subjectId, namespace, value) {
  if (!subjectId) return false;
  const row = store.get(
    'SELECT 1 AS ok FROM channel_proof WHERE subject_id = ? AND namespace = ? AND value_norm = ?',
    subjectId, namespace, norm(value));
  return !!row;
}

// ── A MEGFIGYELÉS (K03) ─────────────────────────────────────────────────────────────────────────
// Visszaadja a NÉZŐ számára megfigyelhető TELJES választ. A próba ezt hasonlítja össze bájtra a
// két világ között, ezért ebbe soha nem kerülhet olyan mező, ami a védett tényből származik.
export function observeInvite({ store, token, viewerSubjectId, clock }) {
  const inv = store.get('SELECT * FROM invite WHERE token = ?', token);

  // Ismeretlen vagy lejárt meghívó: a válasz ugyanaz, mint egy nem beváltható meghívóé —
  // különben a token LÉTEZÉSE is szivárgás (KUKA-084 csatorna-elve).
  if (!inv || inv.redeemed_at || inv.expires_at <= clock.now()) {
    return Object.freeze({
      status: 'not_actionable',
      message: 'ehhez a hivatkozáshoz most nem tartozik beváltható meghívás',
      continue_as: null,
      switch_account_offered: false,
      account_exists: null,
    });
  }

  const proven = hasProvenChannel(store, viewerSubjectId, inv.invitee_namespace, inv.invitee_value);

  if (!proven) {
    // A NÉZŐ nem igazolta a címzetti csatorna feletti rendelkezését — akkor sem, ha ő adta ki a
    // meghívót (K03: „a kézzel átadott hivatkozás birtoklása nem e-mail-bizonyíték").
    // Innentől MINDEN mező konstans: a fiók létezéséről semmit nem tudhat meg.
    return Object.freeze({
      status: 'needs_invitee_identity',
      message: 'folytasd a meghívás címzetti feltételének megfelelő azonossággal',
      continue_as: { namespace: inv.invitee_namespace, hint: maskHint(inv.invitee_value) },
      switch_account_offered: false,
      account_exists: null,
    });
  }

  // Innentől a néző BIRTOKOLJA a címzetti csatornát — neki megmondani a helyes válasz (KUKA-064).
  const target = subjectByExternal(store, inv.invitee_namespace, inv.invitee_value);
  const acct = target ? store.get('SELECT credential FROM account WHERE subject_id = ?', target) : null;
  const exists = !!(acct && acct.credential);
  return Object.freeze({
    status: exists ? 'redeem_as_existing' : 'redeem_as_new',
    message: exists
      ? 'ehhez a címhez tartozik belépés — jelentkezz be vele, és a meghívás folytatódik'
      : 'állíts be belépést ehhez a címhez, és a meghívás folytatódik',
    continue_as: { namespace: inv.invitee_namespace, hint: maskHint(inv.invitee_value) },
    switch_account_offered: exists && viewerSubjectId !== target,
    account_exists: exists,
  });
}

// A maszk a címzetti FELTÉTELT idézi föl a birtokosnak, de nem közöl új tényt: a nézőnek a
// hivatkozás birtoklásából már ismernie kell a címet. A maszk NEM függ a fiók létezésétől.
function maskHint(value) {
  const v = norm(value);
  const at = v.indexOf('@');
  if (at <= 0) return `${v.slice(0, 1)}***`;
  return `${v.slice(0, 1)}***${v.slice(at)}`;
}

function subjectByExternal(store, namespace, value) {
  const row = store.get(
    'SELECT subject_id FROM external_id WHERE namespace = ? AND value_norm = ? AND valid_to IS NULL',
    namespace, norm(value));
  return row ? row.subject_id : null;
}

// ── A FÜGGŐ SZÁNDÉK (K03) ───────────────────────────────────────────────────────────────────────
// „Bejelentkezés előtt a meghívás szándékát védett szerveroldali állapot őrzi, lejárattal és
//  helyi folytatási céllal. Hitelesítés után visszatérünk a meghíváshoz."
// EZ az, ami a mi visszavont V2-javításunkból hiányzott (D-VS-667): ott a munkamenet nélküli
// kézi beváltás egyszerűen elutasításba futott.
export function rememberIntent({ store, sessionId, token, clock }) {
  store.run('INSERT OR REPLACE INTO pending_intent (session_id, invite_token, created_at) VALUES (?,?,?)',
    sessionId, token, clock.now());
}

export function resumeIntent({ store, sessionId }) {
  const row = store.get('SELECT invite_token FROM pending_intent WHERE session_id = ?', sessionId);
  return row ? row.invite_token : null;
}

// ── A BEVÁLTÁS (K03) ────────────────────────────────────────────────────────────────────────────
// „Meglévő fiókhoz tagságot adunk megfelelő elfogadással; NEM ÍRUNK JELSZÓT, nem törlünk második
//  faktort vagy más céges jogot. Új fiók létrehozása és fiókhelyreállítás külön eljárás."
export function redeemInvite({ store, token, actingSubjectId, newCredential, clock }) {
  const inv = store.get('SELECT * FROM invite WHERE token = ?', token);
  if (!inv || inv.redeemed_at || inv.expires_at <= clock.now()) {
    return { ok: false, error: 'invite_not_actionable' };
  }
  if (!hasProvenChannel(store, actingSubjectId, inv.invitee_namespace, inv.invitee_value)) {
    return { ok: false, error: 'invitee_identity_required' };
  }

  const target = subjectByExternal(store, inv.invitee_namespace, inv.invitee_value);
  const acct = target ? store.get('SELECT credential FROM account WHERE subject_id = ?', target) : null;

  let subjectId = target;
  let shape;
  if (acct && acct.credential) {
    // SZIGORÚ: a meglévő hitelesítő adathoz a meghívó NEM nyúl. Ez a mi KUKA-086-os leletünk.
    shape = 'membership_only';
  } else if (target) {
    if (!newCredential) return { ok: false, error: 'credential_required' };
    store.run('UPDATE account SET credential = ? WHERE subject_id = ?', newCredential, target);
    shape = 'credential_set';
  } else {
    if (!newCredential) return { ok: false, error: 'credential_required' };
    subjectId = `sub_${token}`;
    store.run('INSERT INTO subject (id, kind) VALUES (?, ?)', subjectId, 'person');
    store.run(
      `INSERT INTO external_id (subject_id, namespace, issuer, jurisdiction, value_raw, value_norm,
                                cardinality, valid_from, valid_to)
       VALUES (?,?,?,?,?,?,?,?,NULL)`,
      subjectId, inv.invitee_namespace, 'self_asserted', 'n/a',
      inv.invitee_value, norm(inv.invitee_value), 'one_to_one', clock.now());
    store.run('INSERT INTO account (subject_id, credential) VALUES (?,?)', subjectId, newCredential);
    shape = 'birth';
  }

  store.run(
    `INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at)
     VALUES (?,?,?,?,NULL)
     ON CONFLICT(subject_id, book_id) DO NOTHING`,
    subjectId, inv.book_id, inv.offered_role, clock.now());
  store.run('UPDATE invite SET redeemed_at = ? WHERE token = ?', clock.now(), token);
  return { ok: true, shape, subject_id: subjectId, book_id: inv.book_id };
}
