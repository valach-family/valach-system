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
import { canonicalize } from './command.mjs';

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

// ═══ A MEGHÍVÓ FELTÉTELEI VÁLTOZTATHATATLANOK (R51/J2 · INV-05) ════════════════════════════════
//
// A külső fél N10 esete: a meghívó admin szerepet ajánl, a tranzakció HATÁRÁN a sor `user`-re
// csökken, a friss ablak/jog-ellenőrzés a `user` ajánlatot látja — az ÍRÁS viszont a KORÁBBAN
// olvasott sor `admin` szerepét használta. Eredmény: a meghívóban `user`, az új tagságban `admin`.
//
// A hiba nem a hiányzó újraolvasás volt (azt az R50-ben megépítettük), hanem hogy a DÖNTÉS és az
// ÍRÁS két KÜLÖNBÖZŐ példányból dolgozott. Nem több szétszórt `if` a megoldás: a kiadott feltételek
// VÁLTOZTATHATATLANOK, és ezt ki kell KÉNYSZERÍTENI, nem kommentben kijelenteni. Ha a feltétel
// mégis mozdul, a régi token nem váltható be — új meghívó kell (nevezett `invite_terms_changed`,
// nem zsákutca: a mondat megmondja, mi történt — KUKA-064).
//
// ── R53/F02: A KÉZI ÖSSZEFŰZÉS ÜTKÖZÖTT, ÉS VOLT MÁR JÓ MEGOLDÁS A SZOMSZÉD FÁJLBAN ─────────────
//
// A régi alak `f=érték` párokat fűzött `|` jellel. A külső fél megmutatta, hogy ez ÜTKÖZIK:
//   { book_id: 'A|invitee_namespace=email', invitee_namespace: 'x', … }
//   { book_id: 'A',                          invitee_namespace: 'email|invitee_namespace=x', … }
// KÉT KÜLÖNBÖZŐ feltétel-készlet, EGY szöveg. Mérve, a mi kódunkon: ütközött.
//
// A csúnya nem az ütközés, hanem hogy KÉZZEL ÍRTAM egy második azonosság-protokollt, miközben a
// parancs-azonosságnál MÁR ÁLL egy zárt, típusos, mért kanonizálás (`canonicalize`) — az idézőjelez,
// escape-el és rendezett kulcsokkal dolgozik, tehát elválasztó-ütközése fogalmilag nincs. Ez a
// KUKA-003 pontos alakja: ha egy fogalomnak már van otthona, nem írunk mellé másodikat.
//
// ── R53/F01: ÉS A LENYOMAT ÖNMAGÁBAN NEM VÁLTOZTATHATATLANSÁG ───────────────────────────────────
//
// Az R52-es alak a beváltás KÉT OLVASÁSA KÖZÖTTI változást fogta meg. Ha a sort KORÁBBAN írták át,
// mindkét olvasás már az átírt értéket látja — tehát TOCTOU-védelem volt, nem a KIADOTT ajánlat
// változtathatatlansága. A külső fél ezt egy sorral megmutatta: `UPDATE invite SET offered_role
// = 'admin'` a beváltás ELŐTT, és a címzett admin lett.
//
// Ezért a `expires_at` MOST BEKERÜL a feltételek közé (a korábbi indok — „az ÁLLAPOT, nem feltétel" —
// megdőlt: a lejárat megrövidítése ugyanúgy a kiadott ajánlat átírása), és a feltételek a KIADÁS
// pillanatában PECSÉTET kapnak (`invite_terms`, lásd `store.mjs`). Innentől a lenyomat nem az
// esetleg átírt élő sorból képződik, hanem a PECSÉTBŐL, és az élő sort ahhoz MÉRJÜK.
//
// HIÁNYZÓ MEZŐ ⇒ `null`, nem kivétel: a `inviteTerms` publikus és részleges objektumra is hívható
// (a külső fél is így hívja). A tárolt sorban mind a hat oszlop NOT NULL, tehát élesben nem fordul elő.
export const INVITE_TERMS = Object.freeze([
  'book_id', 'invitee_namespace', 'invitee_value', 'offered_role', 'issuer_subject', 'expires_at',
]);

export function inviteTerms(row) {
  if (!row) return null;
  const picked = {};
  for (const f of INVITE_TERMS) picked[f] = row[f] === undefined ? null : row[f];
  return canonicalize(picked);
}

/**
 * A KIADÁSKOR LEPECSÉTELT FELTÉTELEK (R53/F01 · INV-06).
 *
 * A pecsétet a tároló ÍRJA, `AFTER INSERT ON invite` triggerrel — nem egy általunk írt
 * kiadás-függvény. Ez SZÁNDÉKOS: a meghívók egy része (a külső fél próbáiban MINDEGYIK) NYERS
 * pozicionális `INSERT`-tel születik, tehát bármilyen alkalmazás-oldali pecsételő függvényt
 * megkerülnének, és a pecsét épp ott hiányozna, ahol a támadás történik (KUKA-013: ha az őr csak
 * az egyik írót ismeri, egy másik író visszateszi az adatot).
 *
 * @returns {{ok:true, sealed:object}|{ok:false, reason:string}}
 */
export function sealedTerms(store, token) {
  const sealed = store.get('SELECT * FROM invite_terms WHERE token = ?', token);
  // FAIL-CLOSED: pecsét nélküli meghívó nem váltható be. Ilyen sor csak akkor keletkezhet, ha
  // valaki a triggert megkerülve írt — azt nem hisszük el, hanem NEVEZVE megállunk (KUKA-020).
  if (!sealed) return Object.freeze({ ok: false, reason: 'invite_terms_unsealed' });
  return Object.freeze({ ok: true, sealed });
}

/**
 * A KIADOTT AJÁNLAT az IGAZSÁG, az élő sor csak ÁLLAPOTOT hordoz (`redeemed_at`).
 * Ha az élő sor feltétel-oszlopai eltérnek a pecséttől, a token NEM váltható be: a változtatás
 * útja a régi visszavonása + ÚJ meghívó, nem a helyben átírás.
 */
export function authoritativeInvite(store, token) {
  const live = store.get('SELECT * FROM invite WHERE token = ?', token);
  if (!live) return Object.freeze({ ok: false, reason: 'invite_unknown' });
  const s = sealedTerms(store, token);
  if (!s.ok) return Object.freeze({ ok: false, reason: s.reason });
  if (inviteTerms(live) !== inviteTerms(s.sealed)) {
    return Object.freeze({ ok: false, reason: 'invite_terms_changed' });
  }
  // A KIADOTT feltételek + az élő ÁLLAPOT. A `redeemed_at` szándékosan az élő sorból jön: az az
  // egyetlen mező, aminek a változása a rendszer SAJÁT, szabályos írása (a fogyasztás).
  return Object.freeze({ ok: true, invite: Object.freeze({ ...s.sealed, redeemed_at: live.redeemed_at }) });
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
  // A KIADOTT AJÁNLAT AZ IGAZSÁG (R53/F01). Nem az élő sort olvassuk: ha azt a kiadás óta
  // átírták, a token halott — a változtatás útja a visszavonás + ÚJ meghívó.
  const auth = authoritativeInvite(store, token);
  const inv = auth.ok ? auth.invite : store.get('SELECT * FROM invite WHERE token = ?', token);

  // (1) CSATORNA ELŐBB — ugyanaz a bájt-azonos elutasítás, mint az ismeretlen tokenre (KUKA-084).
  if (!inv || !hasProvenChannel(store, actingSubjectId, inv.invitee_namespace, inv.invitee_value)) {
    return Object.freeze({ ok: false, error: 'invitee_identity_required' });
  }

  // (1/b) A KIADOTT FELTÉTELEK ÉRVÉNYESSÉGE (R53/F01). A CSATORNA-ellenőrzés UTÁN áll: a
  // pecsét-eltérés a meghívó TÉNYE, azt csak a bizonyított címzett tudhatja meg (KUKA-083/084).
  if (!auth.ok) return Object.freeze({
    ok: false,
    error: auth.reason === 'invite_terms_changed' ? 'invite_terms_changed' : 'invite_not_actionable',
    reason: auth.reason,
    message: auth.reason === 'invite_terms_changed'
      ? 'a meghívó feltételei a kiadás óta megváltoztak — kérj új meghívót'
      : 'ez a meghívó nem váltható be',
  });

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
    // A VÉGLEGESÍTÉSI HATÁRON ÚJRA a KIADOTT ajánlatot oldjuk fel: így egyszerre méri a
    // pecsét-eltérést (F01) és a két olvasás közötti változást (R51/J2 · N10).
    const freshAuth = authoritativeInvite(store, token);
    if (!freshAuth.ok) {
      return Object.freeze({
        ok: false,
        error: freshAuth.reason === 'invite_terms_changed' ? 'invite_terms_changed' : 'invite_not_actionable',
        reason: freshAuth.reason,
        message: 'a meghívó feltételei a kiadás óta megváltoztak — kérj új meghívót',
      });
    }
    const fresh = freshAuth.invite;
    const win2 = inviteWindowAt(fresh, clock.now());
    if (!win2.open) return Object.freeze({ ok: false, error: 'invite_not_actionable', reason: win2.reason });
    const grant2 = inviteGrantAt({ store, invite: fresh, clock });
    if (!grant2.ok) return Object.freeze({ ok: false, error: 'invite_not_actionable', reason: grant2.reason });

    // (7a) A KÉT PÉLDÁNY EGYEZÉSE (R51/J2 · N10). Az R52-ben ez volt a teljes védelem; ma a
    // PECSÉT a erősebb őr, és ez a sor a maradék rést zárja: a döntés, amivel ideáig eljutottunk,
    // a `inv` példányon született. Kimondva: ha a pecsét-ellenőrzés hibátlan, ez soha nem tüzel —
    // de a hallgatólagos ráhagyatkozás pont az a fajta fél őr, amit a KUKA-039 tilt.
    if (inviteTerms(fresh) !== inviteTerms(inv)) {
      return Object.freeze({
        ok: false, error: 'invite_terms_changed',
        message: 'a meghívó feltételei közben megváltoztak — kérj új meghívót',
      });
    }

    // (7b) A KIMENET ÚJRASZÁMOLVA, A TRANZAKCIÓN BELÜL (R51/J2 · N11). A régi alak a tranzakción
    // KÍVÜL eldöntött `outcome`-ot hozta be: ha a címzett tagságát a határon megvonták, az
    // `already_active` döntés SIKERT adott és ELFOGYASZTOTTA a meghívót, miközben a jog már hamis.
    // Egy ellenőrzött döntési pillanat van, és az itt van.
    const outcome2 = membershipOutcome(
      target ? store.get('SELECT * FROM membership WHERE subject_id = ? AND book_id = ?', target, fresh.book_id) : null,
      fresh.offered_role, clock.now());
    if (!outcome2.grants_access) {
      return Object.freeze({
        ok: false, error: 'membership_not_granted', outcome: outcome2.outcome,
        message: outcome2.outcome === 'role_differs'
          ? 'ehhez a könyvhöz már más szerepkörrel tartozol — a szerep módosítása külön eljárás'
          : 'ehhez a könyvhöz korábban visszavont tagságod van — az újranyitás külön döntés',
      });
    }

    let subjectId = target;
    if (shape === 'birth') {
      subjectId = `sub_${token}`;
      store.run('INSERT INTO subject (id, kind) VALUES (?, ?)', subjectId, 'person');
      store.run(
        `INSERT INTO external_id (subject_id, namespace, issuer, jurisdiction, value_raw, value_norm,
                                  cardinality, valid_from, valid_to)
         VALUES (?,?,?,?,?,?,?,?,NULL)`,
        subjectId, fresh.invitee_namespace, 'self_asserted', 'n/a',
        fresh.invitee_value, norm(fresh.invitee_value), 'one_to_one', clock.now());
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

    // MINDEN ÍRÁS A FRISS SORBÓL DOLGOZIK. A régi alak itt `inv.offered_role`-t írt — az ELAVULT
    // példány szerepét —, tehát a friss ellenőrzés és az írás két külön igazságot hordozott (N10).
    if (outcome2.outcome === 'granted') {
      store.run(
        `INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)`,
        subjectId, fresh.book_id, fresh.offered_role, clock.now());
    }

    // A FOGYASZTÁS ÖN-ŐRZŐ: `WHERE redeemed_at IS NULL`. Ez tartja meg a TOCTOU-védelmet
    // anélkül, hogy az olvasó őröket a zár mögé kellene vinni.
    const used = store.run('UPDATE invite SET redeemed_at = ? WHERE token = ? AND redeemed_at IS NULL',
      clock.now(), token);
    if (used.changes !== 1) throw new Error('redeemInvite: a meghívót közben már felhasználták');

    return Object.freeze({ ok: true, shape, outcome: outcome2.outcome, subject_id: subjectId, book_id: fresh.book_id });
  });
}
