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

import { instantMs } from './store.mjs';
import { rightAt, membershipEffectiveAt, KNOWN_ROLES, roleDelegates } from './authz.mjs';

const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();

// ═══ A MEGHÍVÓ ABLAKA (INV-01) — a KRITIKUS lelete, élő kódon mérve ═════════════════════════════
//
// A régi kód SZÖVEGET hasonlított: `inv.expires_at <= clock.now()`. MÉRVE, a mai forráson:
//   expires_at = '2026-09-09T09:00:00+02:00'  (valósan 07:00Z ⇒ LEJÁRT)
//   óra        = '2026-09-09T08:00:00.000Z'
//   '…09:00:00+02:00' <= '…08:00:00.000Z'  →  FALSE  ⇒ observeInvite: 'redeem_as_new',
//   redeemInvite: ok:true, shape:'birth', és ÉLŐ TAGSÁG született egy LEJÁRT meghívóból.
//
// Ez a lelet NINCS a külső fél tizenöt esete között. A hiba-osztály KUKA-039 (a fél őr): három
// hívóra terveztünk idő-ellenőrzést, a negyedikre nem. Eldönthetetlen alak ⇒ FAIL-CLOSED.
export function inviteWindowAt(inv, nowIso) {
  if (!inv) return Object.freeze({ open: false, reason: 'invite_unknown' });
  if (inv.redeemed_at !== null && inv.redeemed_at !== undefined) {
    return Object.freeze({ open: false, reason: 'invite_already_redeemed' });
  }
  const exp = instantMs(inv.expires_at);
  const now = instantMs(nowIso);
  if (!now.ok) return Object.freeze({ open: false, reason: `clock_${now.reason}` });
  if (!exp.ok) return Object.freeze({ open: false, reason: `invite_expires_at_${exp.reason}` });
  if (exp.ms <= now.ms) return Object.freeze({ open: false, reason: 'invite_expired' });
  return Object.freeze({ open: true, reason: 'invite_open' });
}

// ═══ A CÍM MÖGÖTTI EMBEREK (INV-02) — Q10/Q13 ══════════════════════════════════════════════════
//
// A régi `subjectByExternal` `store.get`-tel az ÖNKÉNYES ELSŐ sort adta, holott a séma
// KIFEJEZETTEN ismer `one_to_many` számosságot és nincs egyediségi kényszer. A K09-kérdést
// (van-e visszavont tagsága?) a CÍM MÖGÖTTI EMBERRE kell feltenni — a LEZÁRT `external_id`
// sorokat is beleértve, különben a `birth` ág megkerüli a megvonást.
//
// Az intervallum ugyanaz a szabály, mint a tagságnál: [valid_from, valid_to), eldönthetetlen
// alak fail-closed. Ugyanazt a döntést kétszer meghozni két igazságot szül (KUKA-018).
export function addressHolders(store, namespace, value, nowIso) {
  const rows = store.all(
    'SELECT subject_id, valid_from, valid_to FROM external_id WHERE namespace = ? AND value_norm = ?',
    namespace, norm(value));
  const now = instantMs(nowIso);
  const live = [];
  for (const r of rows) {
    if (!now.ok) continue;                                   // eldönthetetlen óra ⇒ senki nem él
    const from = instantMs(r.valid_from);
    if (!from.ok || from.ms > now.ms) continue;              // fail-closed
    if (r.valid_to !== null && r.valid_to !== undefined) {
      const to = instantMs(r.valid_to);
      if (!to.ok || to.ms <= now.ms) continue;
    }
    live.push(r.subject_id);
  }
  // A CÍM MÖGÖTT EMBEREK ÁLLNAK, NEM SOROK (R49/C09→C07). Ugyanannak az alanynak KÉT forrásból
  // felvett, egyaránt élő kötése EGY ember — a sor-számlálás „több élő alanyt" mondana, és a
  // meghívó némán elakadna (KUKA-002: a sor és az AZONOSSÁG két különböző tény).
  return Object.freeze({
    live: Object.freeze([...new Set(live)]),
    all: Object.freeze([...new Set(rows.map((r) => r.subject_id))]),
  });
}

// ═══ A BELÉPÉS MEGLÉTE — EGY DEFINÍCIÓ (INV-03) — Q11 ══════════════════════════════════════════
//
// A régi kód az ÍRÓ oldalon SQL-null-ságot mért, az OLVASÓ oldalon JS-igazságértéket. A séma
// megengedi a `credential = ''` állapotot, és ott a kettő ELLENTMOND: az olvasó beküldi az
// új-fiók ágba, az író megtagadja ⇒ örök zsákutca. EGY definíció, mindenkinek.
export const CREDENTIAL_MISSING_SQL = "(credential IS NULL OR credential = '')";

/** @returns {'no_subject'|'no_account_row'|'credential_missing'|'credential_set'} */
export function accountStateFor(store, subjectId) {
  if (!subjectId) return 'no_subject';
  const row = store.get('SELECT credential FROM account WHERE subject_id = ?', subjectId);
  if (!row) return 'no_account_row';
  return (row.credential === null || row.credential === undefined || row.credential === '')
    ? 'credential_missing' : 'credential_set';
}

// ═══ A BEVÁLTÁS ALAKJA — EGY FELOLDÓ (INV-04) — Q10 + Q11 ══════════════════════════════════════
//
// A megfigyelés és a beváltás UGYANABBÓL a három tényből számolt, KÉZZEL, külön-külön — ezért
// tudott a kettő ellentmondani. Az IDEGEN ALANY őre itt, a shape-elágazás ELŐTT áll:
// a régi kódban csak a `membership_only` ág belsejébe lett volna betéve, a testvér-ág
// (`credential_set`) viszont SÚLYOSABBAT engedett: egy idegen ELSŐ hitelesítő adatot írt volna
// egy MÁR LÉTEZŐ ember alanyára, és onnantól annak MINDEN könyvébe belép (KUKA-039).
export function redeemShapeFor({ actingSubjectId, target, accountState }) {
  if (!target) return 'birth';
  if (actingSubjectId !== target) return 'foreign_existing_subject';
  return accountState === 'credential_set' ? 'membership_only' : 'self_credential_set';
}

// ═══ A TAGSÁG KIMENETE — Q13 ═══════════════════════════════════════════════════════════════════
//
// A régi `ON CONFLICT DO NOTHING` a MEGVÁLTOZOTT tényt nyelte el: visszavont vagy más szerepű
// sor mellett `ok:true` jött, a meghívó ELFOGYOTT, és az illetőnek TOVÁBBRA SEM volt hozzáférése.
// A csendes reaktiválás tiltása HELYES — de a megoldatlan hozzáférést nem szabad befejezett
// tagságadásnak jelenteni. Négy NEVEZETT kimenet, és a `membershipEffectiveAt`-et hívja, hogy a
// jövőbeli dátumú (ütemezett) megvonásnál ne mondjon mást, mint a `rightAt` (KUKA-018).
export function membershipOutcome(existing, offeredRole, nowIso) {
  if (!existing) return Object.freeze({ outcome: 'granted', grants_access: true });
  const eff = membershipEffectiveAt(existing, nowIso);
  if (!eff.effective) {
    return Object.freeze({ outcome: 'revoked_needs_decision', grants_access: false, reason: eff.reason });
  }
  if (existing.role !== offeredRole) {
    return Object.freeze({ outcome: 'role_differs', grants_access: false, have: existing.role, offered: offeredRole });
  }
  return Object.freeze({ outcome: 'already_active', grants_access: true });
}

// ═══ A KIBOCSÁTÓ MAI JOGA — Q09 ════════════════════════════════════════════════════════════════
//
// Ez ad OLVASÓT a halott `issuer_subject` oszlopnak — pontosan az a KUKA-069, amit a lelet
// gyökér-okként megnevezett: a mező ott állt, senki nem olvasta, tehát a kibocsátó jogának
// visszavonása után a függő meghívó TOVÁBBRA IS új tagságot adott.
//
// KIMONDVA, MIT NEM ÉPÍTÜNK: nincs önbevalló `grant_basis_kind` mező. Egy olyan oszlop, amit a
// kibocsátó maga tölt ki, kiírná magát a jog-ellenőrzés alól — bárki, aki meghívó-sort tud írni,
// megkerülné a kaput. A jogalap a MEGLÉVŐ `rightAt`-tól jön, nem egy másolatból.
// A DELEGÁLÁS UGYANABBÓL A ZÁRT REGISZTERBŐL (R49/C05). Külön lista két helyen = két igazság
// (KUKA-003/018): aki új szerepet vesz fel, csak az egyiket írná át.
export const DELEGABLE_ROLES = Object.freeze(Object.fromEntries(
  KNOWN_ROLES.map((r) => [r, roleDelegates(r)]),
));

export function inviteGrantAt({ store, invite, clock }) {
  const d = rightAt({ store, subjectId: invite.issuer_subject, bookId: invite.book_id, opClass: 'own_book', clock });
  if (!d.allowed) return Object.freeze({ ok: false, reason: 'issuer_right_withdrawn' });
  const role = d.detail && d.detail.role;
  const delegable = roleDelegates(role);
  if (!delegable) {
    // KONFIGURÁCIÓS HIÁNY — DOB. A hiány NE olvadjon össze a valódi „nem"-mel (KUKA-020): a
    // futtató kivételként könyveli, a mérő szerint az NEM szabályos bizonyíték, tehát a hiány
    // HIÁNYKÉNT jelenik meg, nem zöldként.
    // NEM DOBUNK (R49/C05 + KUKA-064): a nem ismert szerep VALÓDI, nevezett elutasítás — a nyers
    // kivétel a véglegesítési kapun belül ROLLBACK-kel és értelmezhetetlen hibával állna meg.
    return Object.freeze({ ok: false, reason: 'role_not_recognised' });
  }
  if (!delegable.includes(invite.offered_role)) {
    return Object.freeze({ ok: false, reason: 'role_not_delegable' });
  }
  return Object.freeze({ ok: true, issuer_role: role });
}

export function hasProvenChannel(store, subjectId, namespace, value) {
  if (!subjectId) return false;
  const row = store.get(
    'SELECT 1 AS ok FROM channel_proof WHERE subject_id = ? AND namespace = ? AND value_norm = ?',
    subjectId, namespace, norm(value));
  return !!row;
}

// ── A MEGFIGYELÉS (K03) ─────────────────────────────────────────────────────────────────────────
//
// A CSATORNA-KAPU MEGELŐZI AZ ÁLLAPOT-KAPUT. A régi sorrend fordított volt (előbb a token
// állapota, utána a csatorna), és emiatt a NEM BIZONYÍTOTT néző MEGKÜLÖNBÖZTETTE a token négy
// állapotát: ismeretlen · élő · beváltott · lejárt. A Q13 javítása (a meghívó ne fogyjon el a
// blokkolt ágon) ezt CSATORNÁVÁ szélesítette volna: a `redeemed_at`-en át kiderülne, hogy a
// címzettnek visszavont tagsága van abban a könyvben (KUKA-084).
//
// INNENTŐL: aki nem bizonyította a címzetti csatornát, MIND A NÉGY állapotra UGYANAZT a
// bájt-azonos választ kapja. A `hint` is elmarad az unproven ágról — a hivatkozás birtokosa a
// címet amúgy is ismeri, tehát nem közlünk vele semmi újat, de a token LÉTEZÉSE sem szivárog.
const UNPROVEN = Object.freeze({
  status: 'needs_invitee_identity',
  message: 'folytasd a meghívás címzetti feltételének megfelelő azonosságával',
  continue_as: null,
  switch_account_offered: false,
  account_exists: null,
});

export function observeInvite({ store, token, viewerSubjectId, clock }) {
  const inv = store.get('SELECT * FROM invite WHERE token = ?', token);

  // A CSATORNA ELŐBB. Ismeretlen tokennél nincs mihez mérni a bizonyítékot ⇒ ugyanaz a válasz,
  // mint a nem bizonyított nézőé egy LÉTEZŐ tokenre. A kettő megkülönböztethetetlen.
  if (!inv || !hasProvenChannel(store, viewerSubjectId, inv.invitee_namespace, inv.invitee_value)) {
    return UNPROVEN;
  }

  // Innentől a néző BIRTOKOLJA a címzetti csatornát — neki megmondani a helyes válasz (KUKA-064).
  const win = inviteWindowAt(inv, clock.now());
  if (!win.open) {
    return Object.freeze({
      status: 'not_actionable',
      message: 'ehhez a hivatkozáshoz most nem tartozik beváltható meghívás',
      continue_as: { namespace: inv.invitee_namespace, hint: maskHint(inv.invitee_value) },
      switch_account_offered: false,
      account_exists: null,
      reason: win.reason,
    });
  }

  const holders = addressHolders(store, inv.invitee_namespace, inv.invitee_value, clock.now());
  const target = holders.live.length === 1 ? holders.live[0] : null;
  const accountState = accountStateFor(store, target);
  const shape = redeemShapeFor({ actingSubjectId: viewerSubjectId, target, accountState });

  // A SHAPE A „MIT LEHET MOST" KÉRDÉSRE FELEL, A MEGFIGYELÉS A KÖVETKEZŐ LÉPÉST MUTATJA.
  // A kettő NEM ugyanaz: az `foreign_existing_subject` a beváltásnál NEVEZETT ELUTASÍTÁS, a
  // megfigyelésnél viszont FOLYTATÁS — „van belépés ehhez a címhez, jelentkezz be vele".
  // Enélkül a közös alak-feloldó zsákutcát csinálna a jogos címzettből (KUKA-064).
  const existing = shape === 'membership_only' || shape === 'foreign_existing_subject';
  return Object.freeze({
    status: existing ? 'redeem_as_existing' : 'redeem_as_new',
    message: existing
      ? 'ehhez a címhez tartozik belépés — jelentkezz be vele, és a meghívás folytatódik'
      : 'állíts be belépést ehhez a címhez, és a meghívás folytatódik',
    continue_as: { namespace: inv.invitee_namespace, hint: maskHint(inv.invitee_value) },
    switch_account_offered: shape === 'foreign_existing_subject',
    account_exists: existing,
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

  // (1) CSATORNA ELŐBB — ugyanaz a bájt-azonos elutasítás, mint az ismeretlen tokenre (KUKA-084).
  if (!inv || !hasProvenChannel(store, actingSubjectId, inv.invitee_namespace, inv.invitee_value)) {
    return Object.freeze({ ok: false, error: 'invitee_identity_required' });
  }

  // (2) A MEGHÍVÓ ABLAKA — valódi IDŐ-összehasonlítással (a kritikus élő lelete).
  const win = inviteWindowAt(inv, clock.now());
  if (!win.open) return Object.freeze({ ok: false, error: 'invite_not_actionable', reason: win.reason });

  // (3) A KIBOCSÁTÓ MAI JOGA (Q09) — a halott `issuer_subject` oszlop OLVASÓT kapott.
  const grant = inviteGrantAt({ store, invite: inv, clock });
  if (!grant.ok) return Object.freeze({ ok: false, error: 'invite_not_actionable', reason: grant.reason });

  // (4) A CÍM MÖGÖTTI EMBER — a lezárt sorokat is számon tartva (K09-söprés).
  const holders = addressHolders(store, inv.invitee_namespace, inv.invitee_value, clock.now());
  if (holders.live.length > 1) {
    return Object.freeze({ ok: false, error: 'address_ambiguous', reason: 'a címhez több élő alany tartozik' });
  }
  const target = holders.live.length === 1 ? holders.live[0] : null;
  const accountState = accountStateFor(store, target);
  const shape = redeemShapeFor({ actingSubjectId, target, accountState });

  // (5) AZ IDEGEN ALANY ŐRE — a shape-elágazás ELŐTT, MINDEN ágra (Q10 + Q11 + KUKA-039).
  // A csatorna-bizonyíték NEM a másik meglévő fiók hitelesített munkamenete: ha a cím MEGLÉVŐ
  // alanyt céloz, annak SAJÁT hitelesítési útja következik. A régi alak ezt az őrt csak a
  // `membership_only` ágba tette volna — a testvér-ág SÚLYOSABBAT engedett: egy idegen ELSŐ
  // hitelesítő adatot írt volna egy már létező ember alanyára.
  if (shape === 'foreign_existing_subject') {
    return Object.freeze({
      ok: false, error: 'account_authentication_required',
      message: 'ehhez a címhez saját belépés tartozik — jelentkezz be vele, és a meghívás folytatódik',
      resume_with: token,
    });
  }

  // (6) K09-SÖPRÉS a birth ágon: ha a címnek volt LEZÁRT hordozója, és annak VISSZAVONT tagsága
  // van ebben a könyvben, az új alany születése MEGKERÜLNÉ a megvonást. Ha nincs ilyen, a birth
  // ág TOVÁBBRA IS működik — az őr ne zárjon túl (KUKA-049).
  if (shape === 'birth') {
    for (const sid of holders.all) {
      const m = store.get('SELECT * FROM membership WHERE subject_id = ? AND book_id = ?', sid, inv.book_id);
      if (m && !membershipEffectiveAt(m, clock.now()).effective) {
        return Object.freeze({ ok: false, error: 'prior_revocation_needs_decision', reason: 'a címhez korábban visszavont tagság tartozik' });
      }
    }
  }

  if ((shape === 'birth' || shape === 'self_credential_set') && !newCredential) {
    return Object.freeze({ ok: false, error: 'credential_required' });
  }

  // (7) A TAGSÁG KIMENETE (Q13) — a `membership` írás ELŐTT dől el, nem az `ON CONFLICT` nyeli el.
  const existingM = target
    ? store.get('SELECT * FROM membership WHERE subject_id = ? AND book_id = ?', target, inv.book_id)
    : null;
  const outcome = membershipOutcome(existingM, inv.offered_role, clock.now());
  if (!outcome.grants_access) {
    // A MEGHÍVÓ NEM FOGY EL azon az ágon, ami nem adott hozzáférést — és a válasz NEVEZI az okot
    // meg a továbblépést, mert a címzetti csatorna itt már bizonyított (KUKA-064).
    return Object.freeze({
      ok: false, error: 'membership_not_granted', outcome: outcome.outcome,
      message: outcome.outcome === 'role_differs'
        ? 'ehhez a könyvhöz már más szerepkörrel tartozol — a szerep módosítása külön eljárás'
        : 'ehhez a könyvhöz korábban visszavont tagságod van — az újranyitás külön döntés',
    });
  }

  // (8) AZ ÍRÁSOK ATOMI EGYSÉGBEN (Q12). Az ŐRÖK KÍVÜL maradtak: a `BEGIN IMMEDIATE` írás-zárat
  // vesz, tehát a tisztán OLVASÓ elutasítások zár-versengés alatt `database is locked` KIVÉTELT
  // adnának — a valódi „nem"-ből programhiba lenne (KUKA-020).
  return store.tx(() => {
    // VÉGLEGESÍTÉSI KAPU — a változható tények ÚJRAOLVASVA, az ÍRÁS határán belül.
    const fresh = store.get('SELECT * FROM invite WHERE token = ?', token);
    const win2 = inviteWindowAt(fresh, clock.now());
    if (!win2.open) return Object.freeze({ ok: false, error: 'invite_not_actionable', reason: win2.reason });
    const grant2 = inviteGrantAt({ store, invite: fresh, clock });
    if (!grant2.ok) return Object.freeze({ ok: false, error: 'invite_not_actionable', reason: grant2.reason });

    let subjectId = target;
    if (shape === 'birth') {
      subjectId = `sub_${token}`;
      store.run('INSERT INTO subject (id, kind) VALUES (?, ?)', subjectId, 'person');
      store.run(
        `INSERT INTO external_id (subject_id, namespace, issuer, jurisdiction, value_raw, value_norm,
                                  cardinality, valid_from, valid_to)
         VALUES (?,?,?,?,?,?,?,?,NULL)`,
        subjectId, inv.invitee_namespace, 'self_asserted', 'n/a',
        inv.invitee_value, norm(inv.invitee_value), 'one_to_one', clock.now());
      store.run('INSERT INTO account (subject_id, credential) VALUES (?,?)', subjectId, newCredential);
    } else if (shape === 'self_credential_set') {
      // A LÉTEZŐ SZEMÉLY, a FIÓK MEGLÉTE és a HITELESÍTŐ MEGLÉTE HÁROM KÜLÖN ÁLLAPOT (Q11).
      // A régi kód vak `UPDATE`-et írt: ha nem volt `account` SOR, NULLA sort írt, és mégis
      // sikert jelentett — tagság született, belépés nem.
      const res = store.run(
        `INSERT INTO account (subject_id, credential) VALUES (?,?)
         ON CONFLICT(subject_id) DO UPDATE SET credential = excluded.credential
         WHERE ${CREDENTIAL_MISSING_SQL}`,
        subjectId, newCredential);
      if (!res.changes) {
        // NEVEZETT hibakód: a mutációs szerződés ehhez méri, hogy a MEGFELELŐ védelem tüzelt-e,
        // nem egy általános kivételhez (R45 §4 — az elkapás oka deklarált).
        const err = new Error('redeemInvite: a hitelesítő adat beállítása NULLA sort írt — meglévő belépést nem írunk felül');
        err.code = 'CREDENTIAL_WRITE_BLOCKED';
        throw err;
      }
    }

    if (outcome.outcome === 'granted') {
      store.run(
        `INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)`,
        subjectId, inv.book_id, inv.offered_role, clock.now());
    }

    // A FOGYASZTÁS ÖN-ŐRZŐ: `WHERE redeemed_at IS NULL`. Ez tartja meg a TOCTOU-védelmet
    // anélkül, hogy az olvasó őröket a zár mögé kellene vinni.
    const used = store.run('UPDATE invite SET redeemed_at = ? WHERE token = ? AND redeemed_at IS NULL',
      clock.now(), token);
    if (used.changes !== 1) throw new Error('redeemInvite: a meghívót közben már felhasználták');

    return Object.freeze({ ok: true, shape, outcome: outcome.outcome, subject_id: subjectId, book_id: inv.book_id });
  });
}
