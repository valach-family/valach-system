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
import { grantMembership, closedMembershipPeriodOf } from './bitemporal.mjs';
import { redemptionLimitGate, recordGrantBasis } from './basisLimit.mjs';
import { canonicalize } from './command.mjs';
import { effectuate, atomicOutcome, refuseAndRollBack } from './authority.mjs';
// R134/F134-01 (RNV-02): a VÁLTOZHATÓ kizárások (felfüggesztés · tiltás · nyitott felülvizsgálat ·
// visszamenőleges érvénytelenség) EGY feloldóban élnek, és a KIADÁS is ugyanezt hívja.
import { reentryExclusionsAt } from './reentryGate.mjs';

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

// ═══ R132/1 — A MEGHÍVÓ VISSZAVONÁSA (INVR-01) ══════════════════════════════════════════════════
//
// A NEVEZETT HIÁNY, AMIT EZ ZÁR. Nem új ötlet: a SAJÁT norma-szövegünk (norms.mjs, ORG-N1a
// `remaining`) az R132 előtt így állt: *„a MEGHÍVÓ VISSZAVONÁSA mint saját esemény (ma a lejárat és
// a kiadó jogának megvonása zár; a meghívón nincs `revoked_at`)"*. Eddig tehát a kezelőnek NEM volt
// módja egy még el nem fogadott meghívást visszavonni anélkül, hogy a kiadó (gyakran önmaga) egész
// jogát elvenné — a felhasználó szándékához („ezt az EGY ajánlatot ne lehessen beváltani") a
// legközelebbi elérhető művelet egy NAGYSÁGRENDDEL tágabb hatás volt. Ez a KUKA-002 alakja a
// MŰVELETEKEN, pontosan úgy, ahogy az R121-ben az adatkör-megvonásnál már egyszer kijavítottuk.
//
// A VISSZAVONÁS ÁLLAPOTA EGY HELYEN DŐL EL. A `redeemInvite` és az `observeInvite` UGYANEZT a
// feloldót kérdezi, nem két másolatot: ha a megfigyelés folytatást ígérne arra, amit a beváltás
// elutasít, a jogos címzett zsákutcába futna (KUKA-064), és a két olvasó két igazságot hordozna
// (KUKA-018).

/**
 * A VISSZAVONÁS ÁLLAPOTA EGY IDŐPONTBAN. A napló APPEND-ONLY: ha több sor is állna, a LEGKORÁBBI
 * hatályú dönt — a zárás fail-closed (KUKA-012). Az OLVASHATATLAN sor ZÁR, nem néma kihagyás
 * (KUKA-020): egy értelmezhetetlen idejű visszavonásból nem lehet „valószínűleg nem érintett".
 *
 * PURE: csak olvas, nem ír.
 */
export function inviteRevocationAt({ store, token, nowIso }) {
  const now = instantMs(nowIso);
  if (!now.ok) return Object.freeze({ revoked: true, reason: `clock_${now.reason}` });
  const rows = store.all('SELECT * FROM invite_revocation WHERE token = ? ORDER BY id', token);
  if (!rows.length) return Object.freeze({ revoked: false, reason: 'invite_not_revoked' });
  let best = null;
  for (const r of rows) {
    const eff = instantMs(r.effective_at);
    const rec = instantMs(r.recorded_at);
    if (!eff.ok || !rec.ok) return Object.freeze({ revoked: true, reason: 'invite_revocation_undecidable' });
    if (rec.ms > now.ms) continue;                       // ezt akkor még nem tudtuk
    if (eff.ms > now.ms) continue;                       // erre a pillanatra még nem hatályos
    if (best === null || eff.ms < best.effMs) best = { row: r, effMs: eff.ms };
  }
  if (best === null) return Object.freeze({ revoked: false, reason: 'invite_revocation_not_yet_effective' });
  return Object.freeze({
    revoked: true, reason: 'invite_revoked', id: best.row.id,
    effective_at: best.row.effective_at, recorded_at: best.row.recorded_at,
    actor_subject_id: best.row.actor_subject_id ?? null,
  });
}

/**
 * „BEVÁLTHATÓ-E MOST EZ A MEGHÍVÓ?" — EGY FELOLDÓ, MINDEN OLVASÓNAK (INVR-01).
 *
 * A sorrend KIMONDOTT, és a VISSZAVONÁS AZ ELSŐ: egy visszavont meghívónál a lejárat vagy a
 * beváltottság ténye már nem a helyes válasz — a kezelő döntése erősebb (és a nyugtának is ezt kell
 * mondania, KUKA-129). A `redeemed_at` és a lejárat ezután, VÁLTOZATLAN szabállyal (INV-01).
 *
 * PURE: csak olvas, nem ír.
 */
export function inviteOpenAt({ store, invite, nowIso }) {
  if (!invite) return Object.freeze({ open: false, reason: 'invite_unknown' });
  const rev = inviteRevocationAt({ store, token: invite.token, nowIso });
  if (rev.revoked) {
    return Object.freeze({
      open: false, reason: rev.reason,
      revoked_effective_at: rev.effective_at ?? null, revoked_recorded_at: rev.recorded_at ?? null,
    });
  }
  return inviteWindowAt(invite, nowIso);
}

/**
 * EGY FÜGGŐ MEGHÍVÓ VISSZAVONÁSA — SAJÁT, AUDITÁLHATÓ ESEMÉNY (INVR-01, spec §2).
 *
 * A NÉGY KAPU, MIND A VÉGLEGESÍTÉSI PONTON — ugyanaz a szerkezet, mint az R121 adatkör-megvonásánál
 * (SCR-01), mert ugyanaz a fajta döntés. Az `effectuate` EGYSZER olvas órát, és ugyanazt az `at`-ot
 * adja a DÖNTÉSNEK és a HATÁSNAK (EFF-01 · KUKA-139):
 *   1. az eljáró `alter_right` hatásköre — a puszta tagság nem elég;
 *   2. a meghívó EBBEN a könyvben áll — idegen könyv meghívójához nincs köze;
 *   3. az eljáró DELEGÁLÁSI PLAFONJA — amit ő maga nem adhatna ki, azt ne is rendezhesse… DE
 *      KIMONDVA: a plafon-kapu itt a SZEREP tengelyén áll, nem az adatkörön, mert a visszavonás nem
 *      ad jogot, csak elvesz (lásd alább, miért nem szigorítunk tovább);
 *   4. az idő értelmezhetősége — eldönthetetlen alak fail-closed (KUKA-124/2).
 *
 * „AKKOR IS, HA MÁSIK JOGOSULT KEZELŐ ADTA KI" (spec §2). A kezelhetőség tehát NEM a kiadó
 * személyén áll, hanem az eljáró MAI hatáskörén és plafonján. Ezért nem kérdezzük meg, hogy ő adta-e
 * ki — ez SZÁNDÉKOS, és a spec kifejezetten így kéri.
 *
 * „A TOKEN BIRTOKLÁSA ÉS A MEGHÍVOTT SZEMÉLY VOLTA ÖNMAGÁBAN NEM AD KEZELŐI JOGOT" (spec §2): a
 * hatáskör-kapu nem ismer kivételt a célra — a címzett a SAJÁT meghívóját sem vonhatja vissza ezen
 * az adminisztratív úton, ha nincs `alter_right`-ja (KUKA-047).
 *
 * A HÁROM NEM-VÁLTOZÁS NEVEZETT, ÉS EGYIK SEM „SIKERES VÁLTOZÁS" (spec §2 · KUKA-129):
 *   · MÁR ELFOGADOTT meghívó ⇒ `invite_already_redeemed`, hatásmentes — és KIMONDOTTAN NEM
 *     tagságmegvonás: a folytatás a tagság megszüntetése, ami KÜLÖN művelet;
 *   · LEJÁRT meghívó ⇒ `invite_expired` — nem mutatunk hamis sikeres változást;
 *   · MÁR VISSZAVONT meghívó ⇒ `changed: false`, és NEM írunk második naplósort (az ismételt
 *     visszavonás ugyanazt az eseményt nem duplikálja).
 *
 * MIÉRT „MOSTANI HATÁLYÚ" (spec §2: „a nyilvános kezelői művelet mostani hatályú; múltbeli/jövőbeli
 * dátum nem kliensválasztás"): a hatály az `effectuate` EGYETLEN óraolvasásából jön, és a hívó nem
 * adhat időpontot. Ez nem felejtés, hanem kapu.
 */
export function revokeInvite({ store, clock, token, bookId, revokerSubjectId, credentials, delegationCeilingOf }) {
  const tok = String(token ?? '').trim();
  if (!tok || !bookId) return Object.freeze({ ok: false, changed: false, reason: 'token_and_book_required' });

  const out = effectuate(
    { store, clock, subjectId: revokerSubjectId, bookId, operation: 'alter_right', credentials },
    ({ at }) => {
      // SOR-ZÁR ELŐSZÖR (LCK-01 · R150/F150-03). A döntés a meghívó ÁLLAPOTÁN áll (beváltott-e,
      // visszavont-e) — ezt a tényt tehát a MIÉNK alatt kell olvasni, különben egy párhuzamos
      // beváltás a mi olvasásunk UTÁN, az írásunk ELŐTT véglegesülhet. MÉRVE (két külön
      // folyamat, determinisztikus megállítási pont): enélkül a visszavonás egy MÁR ELFOGADOTT
      // meghívóra írt visszavonás-sort, miközben a tagság létrejött — az operátor
      // „visszavontam"-ot látott, a munkatárs viszont BENT VOLT.
      store.lockRows('invite', 'token = ?', tok);
      // A MEGHÍVÓ A VÉGLEGESÍTÉSI HATÁRON BELÜL OLVASVA — nem a kapu előtt (R51/J2 · N10).
      const live = store.get('SELECT * FROM invite WHERE token = ?', tok);
      if (!live) return Object.freeze({ ok: false, changed: false, reason: 'invite_unknown' });
      if (String(live.book_id) !== String(bookId)) {
        // AZ IDEGEN KÖNYV MEGHÍVÓJA UGYANAZT A VÁLASZT KAPJA, MINT A NEM LÉTEZŐ (KUKA-047 ·
        // P-AUT-object-neutral): a jogosulatlan hívó ne tudja meg, hogy a token létezik-e.
        return Object.freeze({ ok: false, changed: false, reason: 'invite_unknown' });
      }
      // MÁR BEVÁLTOTT: NEVEZETT, HATÁSMENTES kimenet — és a FOLYTATÁS is megvan (KUKA-064).
      if (live.redeemed_at !== null && live.redeemed_at !== undefined) {
        return Object.freeze({
          ok: true, changed: false, reason: 'invite_already_redeemed', redeemed_at: live.redeemed_at,
          next_step: 'revoke_membership',
          message: 'ezt a meghívást már elfogadták — a visszavonása nem szünteti meg a tagságot; '
            + 'a tagság megszüntetése külön művelet',
        });
      }
      // ÜZLETI IDEMPOTENCIA: ha MA már visszavont, nincs mit tenni, és nem írunk második sort.
      const already = inviteRevocationAt({ store, token: tok, nowIso: at });
      if (already.revoked === true) {
        return Object.freeze({
          ok: true, changed: false, reason: already.reason,
          revocation_id: already.id ?? null, effective_at: already.effective_at ?? null,
        });
      }
      // LEJÁRT: nem mutatunk hamis sikeres változást (spec §2).
      const win = inviteWindowAt(live, at);
      if (!win.open) return Object.freeze({ ok: true, changed: false, reason: win.reason });

      // A PLAFON KÉRDÉSE ÍRÁS NÉLKÜL (DCE-01 · R123/F123-01): a `delegationCeilingOf`-ot a HÍVÓ adja
      // át, mert a `delegation.mjs` EZT a modult importálja — a fordított irányú behúzás kört
      // csinálna (KUKA-003, ugyanaz a szerkezeti válasz, mint az `authority.mjs`-nél). A hiánya NEM
      // néma engedély: nevezetten elakadunk.
      if (typeof delegationCeilingOf !== 'function') {
        return Object.freeze({ ok: false, changed: false, reason: 'delegation_ceiling_resolver_missing' });
      }
      const ceiling = delegationCeilingOf({ store, subjectId: revokerSubjectId, bookId, at });
      if (!ceiling.ok) return Object.freeze({ ok: false, changed: false, reason: ceiling.reason });
      // A SZEREP-TENGELY A KAPU. Amit az eljáró MA ki sem adhatna, azt ne is rendezhesse — így a
      // szűkebb plafonú helyi kezelő nem nyúl a tágabb jogú kiadó ajánlatához (R63 §5.3/10).
      // KIMONDVA, MIT NEM MÉRÜNK ITT: az ajánlat ADATKÖR-plafonját. A visszavonás nem ad jogot,
      // tehát az adatkör-tengely fogalmilag nem korlát rajta — ez MŰVELETI SZERZŐDÉS, nem
      // feledékenység (ugyanaz az alak, amit az ABL-01-ben a `not_applicable` kimond).
      if (!ceiling.roles.includes(live.offered_role)) {
        return Object.freeze({
          ok: false, changed: false, reason: 'outside_basis_roles', role: live.offered_role,
          ceiling: Object.freeze([...ceiling.roles]),
          message: `a te szerep-plafonod: ${ceiling.roles.join(' · ') || '(üres)'} — ezen kívül nem rendelkezel`,
        });
      }

      // AZ ÍRÁS OSZTHATATLAN EGYSÉGBEN (ATO-01). Ma EGY írás áll itt; a burkolat VÉDELEM a jövőbeli
      // hozzáadás ellen — és ezt kimondjuk, nem állítjuk MÉRT viselkedés-különbségnek (KUKA-207).
      return atomicOutcome(store, () => {
        const res = store.run(
          `INSERT INTO invite_revocation (token, book_id, actor_subject_id, recorded_at, effective_at)
             VALUES (?,?,?,?,?)`,
          tok, bookId, revokerSubjectId ?? null, at, at);
        if (res?.changes !== 1) refuseAndRollBack({ ok: false, changed: false, reason: 'revocation_row_not_created' });
        return Object.freeze({
          ok: true, changed: true, reason: 'invite_revoked', revocation_id: Number(res.lastInsertRowid),
          effective_at: at, recorded_at: at,
        });
      });
    });

  if (!out.authorized) {
    return Object.freeze({
      ok: false, changed: false, reason: out.right.reason,
      message: `${out.right.message ?? ''} Egy meghívó visszavonásához \`alter_right\` hatáskör kell — `
        + 'ugyanaz, mint a tagság megvonásához; a puszta tagság és a token birtoklása nem elég.',
    });
  }
  return out.value;
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

// ═══ R132/2 — AZ ÚJRAHÍVÁSI AJÁNLAT BEFOGADÁSA (RNV-01) ═════════════════════════════════════════
//
// A SZABÁLY, AMIT EZ NEM TÖRÖL EL. A spec §3 első mondata: *„A rendes meghívás meglévő
// `revoked_needs_decision` védelmét ne töröld és ne alakítsd csendes reaktiválássá."* Ezért a Q13-as
// négy kimenet VÁLTOZATLAN marad, és az újranyitás NEM a `membershipOutcome` kilazítása, hanem egy
// KÜLÖN, NEVEZETT befogadási kapu: a `revoked_needs_decision` ág csak akkor nyílik meg, ha EHHEZ a
// tokenhez tartozik egy TÁROLT újrahívási döntés, és az a MA lezárt időszakra szól.
//
// NÉGY EGYEZÉST KÉRÜNK, ÉS MINDEGYIK ESEMÉNY-AZONOSÍTÓN VAGY TÁROLT TÉNYEN ÁLL (nem dátumon):
//   · a döntés ERRE a tokenre szól (a tábla kulcsa a token, egyediségi index őrzi);
//   · ERRE a személyre és ERRE a könyvre (a cím mögötti ember feloldása UTÁN mérve);
//   · a MA lezárt időszak UGYANAZ, amire a döntés szólt (`closed_grant_event_id` +
//     `closed_revocation_id`) — ebből következik a spec kikötése: *„Egy megszűnésre kiadott
//     újrahívási ajánlat nem használható egy későbbi megszűnés újranyitására"*;
//   · és a döntésben rögzített SZEREP egyezik a meghívó pecsételt szerepével — különben a döntés egy
//     MÁS ajánlatot engedélyezne, mint amit beváltanak (KUKA-143: a feladáskori bizonyíték nem
//     küldéskori engedély).
//
// AMIT EZ A KAPU KIMONDOTTAN NEM TESZ: nem helyettesíti a beváltási lánc EGYETLEN kapuját sem. A
// csatorna, a pecsét, az ablak (és R132 óta a visszavonás), a kiadó MAI joga, a korlát és az idegen
// alany őre MIND előbb fut, és MIND érvényes — az újrahívási döntés csak a TAGSÁGI KIMENET ágát
// nyitja meg, semmi mást (spec §3: „Az elfogadáskor minden alkalmazandó kapu ismét álljon").

/** AZ AJÁNLATHOZ TARTOZÓ TÁROLT DÖNTÉS. A hiány NEVEZETT állapot, nem néma nulla (KUKA-012). */
export function reentryOfferFor({ store, token }) {
  const row = store.get('SELECT * FROM membership_reentry WHERE token = ?', token);
  if (!row) return Object.freeze({ present: false, reason: 'no_reentry_offer' });
  return Object.freeze({ present: true, reason: 'reentry_offer', offer: Object.freeze({ ...row }) });
}

/**
 * BEFOGADHATÓ-E MA EZ AZ ÚJRAHÍVÁSI AJÁNLAT? — a `revoked_needs_decision` ág EGYETLEN nyitója.
 *
 * Minden nemleges válasz NEVEZETT, és megmondja, mit kell javítani (KUKA-064). PURE: csak olvas.
 */
export function reentryAdmission({ store, token, targetSubjectId, bookId, offeredRole, at }) {
  const found = reentryOfferFor({ store, token });
  if (!found.present) return Object.freeze({ ok: false, reason: 'reentry_decision_required' });
  const o = found.offer;
  if (!targetSubjectId || String(o.subject_id) !== String(targetSubjectId)) {
    return Object.freeze({ ok: false, reason: 'reentry_offer_subject_mismatch' });
  }
  if (String(o.book_id) !== String(bookId)) return Object.freeze({ ok: false, reason: 'reentry_offer_book_mismatch' });
  if (String(o.offered_role) !== String(offeredRole)) {
    return Object.freeze({ ok: false, reason: 'reentry_offer_role_mismatch', decided_role: o.offered_role });
  }
  const closed = closedMembershipPeriodOf({ store, subjectId: targetSubjectId, bookId, at });
  if (closed.ok !== true) return Object.freeze({ ok: false, reason: `reentry_target_${closed.reason}` });
  if (Number(closed.grant_event_id) !== Number(o.closed_grant_event_id)
    || Number(closed.revocation_id) !== Number(o.closed_revocation_id)) {
    // A SPEC KIKÖTÉSE, MÉRHETŐ ALAKBAN: egy KORÁBBI megszűnésre kiadott ajánlat egy KÉSŐBBI
    // megszűnést nem nyit újra. A nemleges válasz megnevezi MIT látott és MIT várt.
    return Object.freeze({
      ok: false, reason: 'reentry_offer_period_mismatch',
      offer_period: Number(o.closed_grant_event_id), offer_revocation: Number(o.closed_revocation_id),
      current_period: Number(closed.grant_event_id), current_revocation: Number(closed.revocation_id),
    });
  }
  // A VÁLTOZHATÓ KIZÁRÁSOK A VÉGLEGESÍTÉSNÉL IS (RNV-02, R134/F134-01). Ez a sor zárja azt a rést,
  // amit a külső ellenőrző fél mért: a KIADÁS UTÁN rögzített felfüggesztés / tiltás / nyitott
  // felülvizsgálat mellett a beváltás ÚJ tagsági időszakot adott és ELFOGYASZTOTTA a tokent
  // (`membership_grant` 8→9, `grant_basis` 1→2). A kizárások UGYANABBÓL a feloldóból jönnek, amit a
  // KIADÁS hív, és ez a függvény a beváltás TRANZAKCIÓJÁN BELÜL is lefut (`redeemInvite` (7b) →
  // `reentryDecisionFor`), tehát a HATÁRON bekövetkező változás sem kerülhető meg (KUKA-143 ·
  // spec §3: „Az elfogadáskor minden alkalmazandó kapu ismét álljon").
  //
  // A LEZÁRT IDŐSZAKOT ÁTADJUK: a visszamenőleges érvénytelenség és a felülvizsgálati kör kérdése a
  // ZÁRÓ MEGVONÁS eseményéhez kötött — a feloldó ezt az azonosítót kapja, nem időablakot.
  const excl = reentryExclusionsAt({ store, subjectId: targetSubjectId, bookId, closed, nowIso: at });
  if (excl.ok !== true) {
    return Object.freeze({
      ok: false, reason: excl.reason, message: excl.message,
      next_step: excl.next_step ?? null, circle_id: excl.circle_id ?? null, checked: excl.checked,
    });
  }
  return Object.freeze({
    ok: true, reason: 'reentry_admitted', offer_id: Number(o.id),
    closed_grant_event_id: Number(o.closed_grant_event_id),
    closed_revocation_id: Number(o.closed_revocation_id),
    decided_by: o.decided_by, basis_id: o.basis_id, basis_version: Number(o.basis_version),
  });
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
  // R132 — A VISSZAVONÁST IS EZ A FELOLDÓ NÉZI (`inviteOpenAt`), nem csak a lejáratot: ha a
  // megfigyelés folytatást ígérne arra, amit a beváltás elutasít, a jogos címzett zsákutcába futna
  // (KUKA-064), és a két olvasó két igazságot hordozna (KUKA-018). A spec §2 ezt kifejezetten kéri:
  // „Visszavonás után a régi hivatkozás sem MEGFIGYELÉSBŐL, sem belépés utáni folytatásból, sem
  // közvetlen beváltásból nem ad tagságot."
  const win = inviteOpenAt({ store, invite: inv, nowIso: clock.now() });
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

  // A KIADÓ MAI JOGA IS A „MIT LEHET MOST" RÉSZE (KUKA-064 · az R64 ellenséges felülvizsgálat
  // H06/H09 lelete): a megvont kiadó függő meghívójára a lap eddig folytatást ígért („jelentkezz
  // be, és a meghívás folytatódik"), amit a beváltás azonnal elutasított. A címzett birtokolja a
  // csatornát, tehát neki megmondani a helyes válasz — ugyanazzal a feloldóval, amit a beváltás hív.
  const issuer = inviteGrantAt({ store, invite: inv, clock });
  if (!issuer.ok) {
    return Object.freeze({
      status: 'not_actionable',
      message: 'ehhez a hivatkozáshoz most nem tartozik beváltható meghívás',
      continue_as: { namespace: inv.invitee_namespace, hint: maskHint(inv.invitee_value) },
      switch_account_offered: false,
      account_exists: null,
      reason: issuer.reason,
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
  // HORDOZHATÓ ALAK (SQL-02). Az `INSERT OR REPLACE` szintén SQLite-bővítés, és a jelentése sem
  // azonos a beszúrás-vagy-frissítéssel: az SQLite TÖRLI a régi sort, majd beszúr — tehát DELETE
  // triggert is tüzelne. A `pending_intent` táblán MÉRVE nincs trigger (a séma egyetlen triggere
  // sem erre a táblára szól), ezért a két alak itt azonos hatású, az `ON CONFLICT … DO UPDATE`
  // viszont MINDKÉT motoron fut, és nem függ a törlés-mellékhatástól.
  //
  // AZ IDŐBÉLYEG KANONIKUS UTC ALAKBAN MEGY A TÁBLÁBA (F158-20, külső review, Codex, P2).
  //
  // A LELET: a korábbi alak az óra kimenetét SZÓ SZERINT tárolta. Egy eltolásos alak
  // (`2026-10-06T01:00:00+02:00`) ugyanazt a PILLANATOT jelenti, mint a `…T23:00:00.000Z` — a
  // halmazos takarítás viszont SZÖVEGESEN vetette össze a `Z`-s határokkal, és a friss sort
  // JÖVŐBELINEK minősítette. MÉRVE ugyanazzal az órával: a sor azonnal ELTŰNT (adatvesztés).
  // Ezért a tároláskor EGY alak van: UTC, `toISOString()`. A nem értelmezhető óra NEVEZETTEN
  // elakad — nem tárolunk olyan időbélyeget, amit magunk sem tudunk megítélni (KUKA-020 · KUKA-238).
  if (!clock || typeof clock.now !== 'function') {
    throw new Error('rememberIntent: `clock` kötelező — a függő szándék kora nem opcionális (D-VS-3161)');
  }
  const szuletett = Date.parse(clock.now());
  if (!Number.isFinite(szuletett)) {
    throw new Error('rememberIntent: az óra nem értelmezhető időpontot adott — a függő szándékot nem tároljuk megítélhetetlen korral (D-VS-3161)');
  }
  store.run(`INSERT INTO pending_intent (session_id, invite_token, created_at) VALUES (?,?,?)
             ON CONFLICT (session_id) DO UPDATE SET invite_token = excluded.invite_token,
                                                    created_at   = excluded.created_at`,
    sessionId, token, new Date(szuletett).toISOString());
}

/**
 * A FÜGGŐ SZÁNDÉK ÉLETTARTAMA (K03 · D-VS-3141 — a D-VS-3007 nevezett függőjének lezárása).
 *
 * MI VOLT A HIÁNY, KIMONDVA: a `pending_intent` sor IDŐBEN korlátlan volt. A `resumeIntent` nem
 * nézett lejáratot, tehát egy belépés előtti folytatás ÉVEKKEL később is „visszatért" volna egy
 * meghívóhoz — miközben maga a meghívó 7 nap után lejár. A tábla a tárral EGYÜTT korlátos volt
 * (KUKA-300), időben viszont nem (D-VS-3007 nevezett függője, az R42 óta nyitott maradék).
 *
 * A VÁLASZTOTT ÉRTÉK ÉS AZ OKA: 24 óra. A függő szándék egy FOLYTATÁS, nem a meghívó maga: a
 * felhasználó épp belép vagy regisztrál, és a rendszer visszaviszi a meghíváshoz. Ez a művelet
 * percek-órák kérdése; a 24 óra ugyanaz a nagyságrend, mint a megerősítő hivatkozás élettartama,
 * és biztosan RÖVIDEBB a meghívó 7 napjánál — tehát a folytatás nem élheti túl azt, amire mutat.
 *
 * ÉS EZ EGY PLAFON, NEM A TÉNYLEGES ÉLETTARTAM (F158-17, külső review, Codex, P2). A sor EGYETLEN
 * kulcsa a munkamenet; ha az kiesik, a sor elérhetetlen, és a takarítás törli. A ténylegesen
 * kiszolgálható türelmi időt ezért az `intentTtlMs` adja meg — lentebb, kimondva.
 */
export const PENDING_INTENT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * A FOLYTATÁS NEM ÉLHETI TÚL A KULCSÁT (F158-17, külső review, Codex, P2 · D-VS-3157).
 *
 * A LELET, ÉS MIÉRT A SZÖVEGRŐL SZÓL. A `pending_intent` sort KIZÁRÓLAG a munkamenet azonosítója
 * találja meg, a munkamenet pedig 12 óra tétlenség után kiesik — és a kiesés a hozzá kötött sort is
 * TÖRLI (`onEvicted`). A kimondott 24 óra tehát a MÁSODIK 12 órában elvileg sem teljesülhetett: aki
 * 13 óra múlva tért vissza, annak a belépése folytatás NÉLKÜL sikerült, miközben a kódban és a
 * szerződésben is „24 óra" állt. Ez a `KUKA-050` osztálya: a szöveg a valóság előtt járt.
 *
 * MIÉRT A RÖVIDÍTÉS, ÉS NEM A MUNKAMENET MEGHOSSZABBÍTÁSA. A reviewer mindkét irányt felajánlotta.
 * A munkamenet életének megnyújtása azt jelentené, hogy egy NÉVTELEN látogató (a `pending_intent`
 * sort belépés ELŐTT is létre tudja hozni) kétszer annyi ideig foglal szerver-oldali helyet — pont
 * azt a felületet növelve, amit a KUKA-300/302/329 szűkített —, és a tétlenségi söprésnek a tárolót
 * is kérdeznie kellene munkamenetenként (KUKA-290: a védelem költsége nem nőhet azzal, amit védünk).
 * A rövidítés viszont semmibe nem kerül, és IGAZZÁ teszi a kimondott szabályt.
 *
 * MIÉRT FELOLDÓ, ÉS NEM EGY ÁTÍRT ÁLLANDÓ: két szám egy szabályt ad, tehát EGY helyen dőljön el
 * (KUKA-003 · KUKA-039). A tétlenségi korlát a kiszolgálóban állítható (`VS_APP_SESSION_IDLE_MS`),
 * tehát egy kézzel beírt „12 óra" a következő átállításnál MEGINT hazudna (KUKA-045).
 *
 * A HIÁNYZÓ BEMENET NEVEZETTEN ELAKAD (KUKA-238): ha a tétlenségi korlát elhagyható lenne, egy hívó
 * NÉMÁN visszakapná a 24 órát — vagyis pont a most javított hibát.
 */
export function intentTtlMs({ sessionIdleMs, ceilingMs = PENDING_INTENT_TTL_MS } = {}) {
  const plafon = Number(ceilingMs);
  const tetlen = Number(sessionIdleMs);
  if (!Number.isFinite(plafon) || plafon <= 0) {
    throw new Error('intentTtlMs: a kimondott plafon pozitív szám legyen (D-VS-3157)');
  }
  if (!Number.isFinite(tetlen) || tetlen <= 0) {
    throw new Error('intentTtlMs: a munkamenet tétlenségi korlátja KÖTELEZŐ — a folytatás élettartama ebből származik (D-VS-3157)');
  }
  return Math.min(plafon, tetlen);
}

/**
 * A LEJÁRATOT AZ OLVASÁS IS ÉRVÉNYESÍTI (KUKA-296): a takarítás amortizált, tehát egy lejárt sor
 * KÖZBEN is olvasható lenne — ezért a `resumeIntent` maga is kapu, és a lejárt sort el is dobja.
 *
 * AZ ÓRA KÖTELEZŐ, ÉS EZ SZÁNDÉKOS (KUKA-238): ha elhagyható lenne, egy óra nélküli hívó NÉMÁN
 * kikapcsolná a lejáratot — pontosan az a fajta tartalék-ág, ami a hibát elrejti. Óra nélkül
 * NEVEZETT hiba jön, nem „nincs lejárat".
 */
export function resumeIntent({ store, sessionId, clock, ttlMs = PENDING_INTENT_TTL_MS }) {
  if (!clock || typeof clock.now !== 'function') {
    throw new Error('resumeIntent: `clock` kötelező — a függő szándék lejárata nem opcionális (D-VS-3141)');
  }
  const row = store.get('SELECT invite_token, created_at FROM pending_intent WHERE session_id = ?', sessionId);
  if (!row) return null;
  // ── A NEM ÉRTELMEZHETŐ IDŐBÉLYEG NEM „NEM JÁRT LE" (F158-04, külső review, Codex, P2) ───────────
  //
  // A LELET, ÉS MIÉRT FÁJ. Az első alakom `Number.isFinite(kor) && kor > ttlMs`-t írt: ha a tárolt
  // `created_at` vagy az óra értelmezhetetlen, a `kor` NaN lesz, az őr NEM tüzel, és a szándék
  // FOLYTATÓDIK — időkorlát nélkül, örökre. A `created_at` oszlop puszta `TEXT NOT NULL`, tehát egy
  // import vagy sérülés pont ezt hozza. Ez PONTOSAN az a hiba-osztály, amit ugyanebben a körben
  // KUKA-337-ként magam vezettem ki a tiltás feloldójából („a védő szabály MINDEN órájára érvényes,
  // nem csak a tárolt soréra") — és a következő függvényben megismételtem. A tanulság kimondása
  // tehát nem védelem; a jelnek a KÓDON kell állnia (KUKA-303 rokona).
  //
  // A VÁLASZ: a nem értelmezhető idő LEJÁRTNAK számít. A folytatás elmarad, a sor törlődik — mert
  // egy olyan szándékról, aminek a korát nem tudjuk, nem állíthatjuk, hogy még friss (KUKA-020).
  const most = Date.parse(clock.now());
  const szuletett = Date.parse(row.created_at);
  const kor = most - szuletett;
  // A JÖVŐBELI IDŐBÉLYEG SEM „FRISS" (F158-13, külső review, Codex, P2). A LELET: a NaN-ág javítása
  // után egy 2099-es `created_at` NEGATÍV kort ad — a kor így VÉGES, tehát átment a frissességi
  // ellenőrzésen, és a szándék a 24 órás türelmi időt megkerülve 2099-ig folytatódott volna
  // (óra-visszaállítás vagy import). Amiről nem tudjuk, HOGY LEHET a jövőben, arról nem állítjuk,
  // hogy friss: a negatív kor is LEJÁRT (KUKA-020 · a KUKA-339 tanulságának harmadik fele).
  if (!Number.isFinite(kor) || kor < 0 || kor > ttlMs) {
    store.run('DELETE FROM pending_intent WHERE session_id = ?', sessionId);
    return null;
  }
  return row.invite_token;
}

/**
 * A LEJÁRT SOROK TAKARÍTÁSA — EGY utasításban, halmazon (D-VS-3141).
 *
 * MIÉRT ÍGY: a hívó ezt AMORTIZÁLTAN futtatja (legfeljebb percenként egyszer), és a törlés EGY
 * halmaz-utasítás — tehát nem hoz vissza kérésenkénti teljes bejárást és korlátlan memória-növekedést
 * (ez az R158 kifejezett kikötése, és a KUKA-290/300/306/313 költség-osztálya).
 */
export function purgeExpiredIntents({ store, clock, ttlMs = PENDING_INTENT_TTL_MS, maxOddRows = 1000 }) {
  if (!clock || typeof clock.now !== 'function') {
    throw new Error('purgeExpiredIntents: `clock` kötelező (D-VS-3141)');
  }
  /**
   * A HALMAZOS TAKARÍTÁS IS VISZI A ROMLOTT ÉS A JÖVŐBELI SORT (F158-14, külső review, Codex, P2).
   *
   * A LELET. Az előző alak csak `created_at < hatar`-t törölt — ez a MAI, kanonikus ISO-sorokra igaz,
   * de egy `created_at = 'bogus'` ÁRVA sor (import vagy sérülés, és a munkamenete már nincs) soha nem
   * illeszkedik rá, mert a szöveges összehasonlítás szerint nem kisebb; és mivel a munkamenet nincs,
   * a `resumeIntent` sem hívódik meg rá soha. A sor tehát ÖRÖKRE a táblában maradt. Ezt a REPORT-ban
   * nevezett hiányként ki is mondtam — a reviewer joggal kérte, hogy ne hiány legyen, hanem javítás.
   *
   * A HÁROM ESET EGY UTASÍTÁSBAN, és mindhárom TÁROLÓ-FÜGGETLEN SQL-lel (`node:sqlite` és PostgreSQL
   * egyaránt): a türelmi időn túli · a JÖVŐBELI (óra-visszaállítás, import) · és a NEM KANONIKUS
   * alakú (`LIKE '____-__-__T%'` nem illeszkedik). A `_` egyetlen karakter mindkét tárolóban.
   */
  const mostMs = Date.parse(clock.now());
  if (!Number.isFinite(mostMs)) {
    throw new Error('purgeExpiredIntents: az óra nem értelmezhető időpontot adott — a takarítás nem találgat (D-VS-3161)');
  }
  const hatar = new Date(mostMs - ttlMs).toISOString();
  const most = new Date(mostMs).toISOString();
  /**
   * A SZÖVEGES ÖSSZEVETÉS CSAK AZONOS ALAKON ÉRVÉNYES (F158-20, külső review, Codex, P2).
   *
   * A LELET: az előző alak MINDEN sort szövegesen vetett össze a `Z`-s határokkal. Egy eltolásos
   * időbélyeg (`…T01:00:00+02:00`) ugyanazt a pillanatot jelenti, szövegként viszont „nagyobb" —
   * ezért egy FRISS sor jövőbelinek minősült, és a takarítás TÖRÖLTE. Ugyanaz a hiba-osztály, amit a
   * `P-INVITE-window` mag-próba a MEGHÍVÓ lejáratára már egyszer kivezetett (szöveg helyett
   * idő-összehasonlítás) — most a `pending_intent` sorra ismételtem meg.
   *
   * A VÁLASZ KÉT LÉPÉS, és a költsége KORLÁTOS (R158 kikötése):
   *   1. a KANONIKUS (UTC, `…T__:__:__.___Z`) sorokon a szöveges rendezés AZONOS alakot hasonlít,
   *      tehát érvényes — ez egy halmaz-utasítás, és az írás óta minden SAJÁT sorunk ilyen;
   *   2. ami NEM kanonikus (import, sérülés, eltolásos alak), azt szövegesen MEGÍTÉLNI SEM lehet:
   *      ezeket korlátos darabszámban kiolvassuk, és IDŐPILLANATKÉNT ítéljük meg (`Date.parse`) —
   *      a nem értelmezhető, a lejárt és a jövőbeli megy, a FRISS MARAD. Normál üzemben ez a halmaz
   *      üres, mert az írás kanonizál; a `LIMIT` arra kell, hogy egy importált tábla se hozzon vissza
   *      korlátlan bejárást (KUKA-290).
   */
  const KANONIKUS = '____-__-__T__:__:__.___Z';
  const korlat = Number.isSafeInteger(maxOddRows) && maxOddRows > 0 ? maxOddRows : 1000;
  const WHERE = 'created_at LIKE ? AND (created_at < ? OR created_at > ?)';
  const elotte = store.get(`SELECT COUNT(*) AS n FROM pending_intent WHERE ${WHERE}`, KANONIKUS, hatar, most);
  store.run(`DELETE FROM pending_intent WHERE ${WHERE}`, KANONIKUS, hatar, most);
  const kanonikusTakaritva = elotte ? Number(elotte.n) : 0;

  const furcsak = store.all(`SELECT session_id, created_at FROM pending_intent WHERE created_at NOT LIKE ? LIMIT ${korlat}`, KANONIKUS);
  const dobando = [];
  for (const r of furcsak) {
    const kor = mostMs - Date.parse(r.created_at);
    if (!Number.isFinite(kor) || kor < 0 || kor > ttlMs) dobando.push(r.session_id);
  }
  if (dobando.length) {
    store.run(`DELETE FROM pending_intent WHERE session_id IN (${dobando.map(() => '?').join(',')})`, ...dobando);
  }
  return { purged: kanonikusTakaritva + dobando.length, before: hatar,
    odd_rows: furcsak.length, odd_purged: dobando.length };
}

// ── A BEVÁLTÁS (K03) ────────────────────────────────────────────────────────────────────────────
// „Meglévő fiókhoz tagságot adunk megfelelő elfogadással; NEM ÍRUNK JELSZÓT, nem törlünk második
//  faktort vagy más céges jogot. Új fiók létrehozása és fiókhelyreállítás külön eljárás."
/**
 * A TAGSÁGI KIMENET ÉS AZ ÚJRAHÍVÁS EGY DÖNTÉSBEN — EGY OTTHONBAN (R132/2).
 *
 * MIÉRT KÖZÖS FELOLDÓ. A beváltás KÉT ponton dönt: a kapuknál és a VÉGLEGESÍTÉSI határon belül
 * (N11). Ha ez a logika kétszer lenne leírva, a két pont elcsúszhatna — és épp a határon belüli
 * változás a lényeg (KUKA-039: a fél őr; KUKA-018: egy fogalom, egy otthon).
 *
 * HÁROM KIMENET:
 *   · `{ ok: true, reentry: null }`     — a rendes ág (granted · already_active), változatlanul;
 *   · `{ ok: true, reentry: {...} }`    — ÚJRANYITÁS: a tagság új időszakot kap;
 *   · `{ ok: false, refusal }`          — NEVEZETT elutasítás, a meghívó NEM fogy el.
 */
function reentryDecisionFor({ store, outcome, token, target, inv, at }) {
  const refuse = (payload) => Object.freeze({ ok: false, refusal: Object.freeze(payload) });

  // AZ ÚJRAHÍVÁSI AJÁNLAT CSAK A SAJÁT HELYZETÉBEN ÉRVÉNYES. Ha a tagság MA ÉL (vagy más szerepen
  // áll), az ajánlat KÖTÉSI PONTJA (a lezárt időszak) már nem áll — ilyenkor NEVEZETTEN elakadunk,
  // és nem nyeljük el a tokent egy „már tag vagy" nyugtával (KUKA-129: a nyugta mondjon igazat).
  const offer = reentryOfferFor({ store, token });
  if (outcome.grants_access) {
    if (offer.present) {
      const adm = reentryAdmission({
        store, token, targetSubjectId: target, bookId: inv.book_id, offeredRole: inv.offered_role, at,
      });
      return refuse({
        ok: false, error: 'membership_not_granted', outcome: outcome.outcome,
        reason: adm.reason === 'reentry_admitted' ? 'reentry_offer_period_mismatch' : adm.reason,
        message: 'ez egy újbóli belépésre kiadott meghívás, de a hozzá tartozó lezárt tagsági '
          + 'időszak már nem áll — kérj új meghívót a munkakörnyezet kezelőjétől',
      });
    }
    return Object.freeze({ ok: true, reentry: null });
  }

  // A MEGHÍVÓ NEM FOGY EL azon az ágon, ami nem adott hozzáférést — és a válasz NEVEZI az okot
  // meg a továbblépést, mert a címzetti csatorna itt már bizonyított (KUKA-064).
  if (outcome.outcome === 'role_differs') {
    return refuse({
      ok: false, error: 'membership_not_granted', outcome: outcome.outcome,
      message: 'ehhez a könyvhöz már más szerepkörrel tartozol — a szerep módosítása külön eljárás',
    });
  }

  const adm = reentryAdmission({
    store, token, targetSubjectId: target, bookId: inv.book_id, offeredRole: inv.offered_role, at,
  });
  if (adm.ok !== true) {
    // A NEMLEGES VÁLASZ VIGYE A MŰKÖDŐ FOLYTATÁST (KUKA-201 · KUKA-064). A kizárás-feloldó
    // (RNV-02) NEVEZETT folytatást ad (`lift_suspension` · `lift_ban` · `close_review_circle`), és
    // a SAJÁT mondatát is — ezeket NEM írjuk át egy általános szöveggel: a címzett csatornája itt
    // már bizonyított, tehát neki megmondani a helyes válasz. A régi, általános mondat csak ott
    // marad, ahol a feloldó nem adott sajátot.
    return refuse({
      ok: false, error: 'membership_not_granted', outcome: outcome.outcome, reason: adm.reason,
      next_step: adm.next_step ?? null,
      message: adm.message
        ?? (adm.reason === 'reentry_decision_required'
          ? 'ehhez a könyvhöz korábban visszavont tagságod van — az újranyitás külön döntés'
          : 'ehhez a hivatkozáshoz tartozó újbóli belépési döntés nem erre a helyzetre szól — '
            + 'kérj új meghívót a munkakörnyezet kezelőjétől'),
    });
  }
  return Object.freeze({ ok: true, reentry: adm });
}

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

  // (2) A MEGHÍVÓ ABLAKA — valódi IDŐ-összehasonlítással (a kritikus élő lelete), és R132 óta a
  //     VISSZAVONÁS is itt dől el, UGYANABBÓL a feloldóból, amit a megfigyelés hív (INVR-01).
  const win = inviteOpenAt({ store, invite: inv, nowIso: clock.now() });
  if (!win.open) return Object.freeze({ ok: false, error: 'invite_not_actionable', reason: win.reason });

  // (3) A KIBOCSÁTÓ MAI JOGA (Q09) — a halott `issuer_subject` oszlop OLVASÓT kapott.
  const grant = inviteGrantAt({ store, invite: inv, clock });
  if (!grant.ok) return Object.freeze({ ok: false, error: 'invite_not_actionable', reason: grant.reason });

  // (3/b) A KORLÁT — ORG-N1b (BLI-01, R90 §6). A KIADÁSKORI alaphoz mérve: a felhatalmazás nem
  // lehet tágabb, mint az alapja. A kapu a KIADÁSSAL KÖZÖS feloldót hívja (KUKA-129), ezért egy
  // nyers `INSERT INTO invite` sem tud kibújni alóla: ha van kiadott korlát, az itt is hat.
  //
  // A DEKLARÁLATLAN MEGHÍVÓ NEM AKAD EL (KUKA-122: a kapu nem fal) — de a válasz KIMONDJA, hogy a
  // korlát nem volt kikényszerítve, tehát a hiány nem néma engedély (KUKA-041).
  const limitGate = redemptionLimitGate({ store, invite: inv, knownAt: clock.now() });
  if (!limitGate.ok) {
    // R63 §4: a HIÁNYZÓ alap és a KORLÁTON KÍVÜLI meghívó két különböző tény (KUKA-124/2) — a
    // válasz hibakódja is különbözik, hogy a hívó tudja, mit pótoljon (KUKA-064).
    return Object.freeze({
      ok: false,
      error: limitGate.basis_declared === false ? 'invite_without_basis' : 'invite_outside_basis',
      reason: limitGate.reason,
      message: limitGate.basis_declared === false
        ? 'ehhez a meghívóhoz nincs rögzített felhatalmazási alap — kérj új meghívót a jogosult kiadótól'
        : 'a meghívó a kiadáskori felhatalmazás korlátján kívül esik — kérj új meghívót',
    });
  }

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
  // (7/b) AZ ÚJRAHÍVÁSI AJÁNLAT — a `revoked_needs_decision` ág EGYETLEN nyitója (R132/2, RNV-01).
  const reentry = reentryDecisionFor({ store, outcome, token, target, inv, at: clock.now() });
  if (!reentry.ok) return reentry.refusal;

  // (8) AZ ÍRÁSOK ATOMI EGYSÉGBEN (Q12). Az ŐRÖK KÍVÜL maradtak: a `BEGIN IMMEDIATE` írás-zárat
  // vesz, tehát a tisztán OLVASÓ elutasítások zár-versengés alatt `database is locked` KIVÉTELT
  // adnának — a valódi „nem"-ből programhiba lenne (KUKA-020).
  return store.tx(() => {
    // SOR-ZÁR ELŐSZÖR (LCK-01 · R150/F150-03). A véglegesítési kapu ÚJRAOLVAS — de az
    // újraolvasás csak akkor dönt, ha közben senki nem ír. A zár UGYANARRA a sorra megy, amit a
    // visszavonás is felvesz: a két író így SOROSÍTVA dönt, és nem a szerencsén múlik, melyikük
    // olvasott frissebbet. A zár a tranzakción BELÜL van, tehát a tisztán olvasó elutasítások
    // változatlanul kívül maradnak — az ott kimondott indok érvényes.
    store.lockRows('invite', 'token = ?', token);
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
    // A VÉGLEGESÍTÉSI HATÁRON ÚJRA — ez dönti el a BEVÁLTÁS ↔ VISSZAVONÁS versenyét (spec §2:
    // „a véglegesítési sorrend dönt"). Ha a visszavonás véglegesült előbb, itt NEVEZETTEN elakadunk,
    // és nem születik tagság; ha a beváltás ért előbb célba, a visszavonás nem törli utólag a
    // tagságot — a két művelet SOHA nem ad egymással ellentétes sikeres nyugtát (KUKA-129 · KUKA-139).
    const win2 = inviteOpenAt({ store, invite: fresh, nowIso: clock.now() });
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
    // AZ ÚJRAHÍVÁS BEFOGADÁSA IS A VÉGLEGESÍTÉSI HATÁRON BELÜL DŐL EL ÚJRA (R51/J2 · N11). Ha a
    // döntést a két olvasás között visszavonták, vagy közben EGY ÚJABB megszűnés történt, a kapu itt
    // zár — a tranzakción KÍVÜL eldöntött befogadás pontosan az a hiba, amit az N11 kijavított.
    const reentry2 = reentryDecisionFor({ store, outcome: outcome2, token, target, inv: fresh, at: clock.now() });
    if (!reentry2.ok) return reentry2.refusal;

    let subjectId = target;
    let readScopeGranted = null;
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
    // A TAGSÁGADÁS A KÖZÖS OTTHONON MEGY (GRT-01 — R85/F01). A mai beváltásnál a HATÁLY és a
    // RÖGZÍTÉS ideje azonos, és ezt az `at` alak biztosítja: a writer MINDKETTŐT megőrzi, nem
    // vezeti le egyiket a másikból. Enélkül a júniusi beváltás megváltoztatta a MÁRCIUSI tudás
    // szerinti képet (KUKA-129: a szabály ott teljesüljön, ahol az érték SZÜLETIK).
    // R132 — AZ ÚJRANYITÁS UGYANAZON A TAGSÁGADÓ ÚTON MEGY (GRT-01). Nem külön író: a `granted` és a
    // `revoked_needs_decision` + befogadott újrahívási döntés UGYANAZT a `grantMembership`-et hívja,
    // tehát az esemény, a vetület és az átvitt korlát EGY helyen születik — két író két igazságot
    // szülne (KUKA-003 · KUKA-018). Az ÚJ IDŐSZAK tényét a writer MÉRI, nem mi mondjuk meg neki.
    const regranting = reentry2.reentry !== null;
    if (outcome2.outcome === 'granted' || regranting) {
      const g = grantMembership({
        store, subjectId, bookId: fresh.book_id, role: fresh.offered_role, at: clock.now(),
      });
      if (!g.ok) throw new Error(`redeemInvite: a tagságadás nem írható — ${g.reason}`);
      // (c) A KORLÁT ÁTVITELE — ORG-N1b. A beváltás nem csak a SZEREPET viszi át: a tagságadó
      // esemény mellé kerül az az alap és korlát, ami alatt keletkezett. UGYANEBBEN a
      // tranzakcióban, mert egy korlát nélkül maradt tagságadás pontosan az, amitől a norma véd
      // (KUKA-026: a kudarc/nyom nem szakadhat el a hatástól).
      if (limitGate.basis_declared === true) {
        const rb = recordGrantBasis({ store, grantEventId: g.grant_event_id, gate: limitGate });
        if (!rb.ok) throw new Error(`redeemInvite: az átvitt korlát nem írható — ${rb.reason}`);
        // R63 — A PECSÉTELT ADATKÖR PLAFON MARAD, NEM AUTOMATIKUS JOG. Az első alakom itt a pecsét
        // adatkörét beváltáskor OLVASÁSI JOGGÁ írta volna — a P-DSC-scope-basis próba azonnal
        // megfogta: az elfogadott K05-DSC-c (R49/R53) épp azt mondja ki, hogy a MEGADHATÓ nem a
        // MEGADOTT. A jogot a jogosult kezelő KÜLÖN, kimondott lépésben adja (delegation.mjs →
        // grantScopeToMember), a plafon (grant_basis) pedig szűkíti. A válasz kimondja, hogy itt
        // NEM született olvasási jog (KUKA-012 · KUKA-041).
      }
    }

    // A FOGYASZTÁS ÖN-ŐRZŐ: `WHERE redeemed_at IS NULL`. Ez tartja meg a TOCTOU-védelmet
    // anélkül, hogy az olvasó őröket a zár mögé kellene vinni.
    const used = store.run('UPDATE invite SET redeemed_at = ? WHERE token = ? AND redeemed_at IS NULL',
      clock.now(), token);
    if (used.changes !== 1) throw new Error('redeemInvite: a meghívót közben már felhasználták');

    // R132 — A NYUGTA KIMONDJA, HOGY ÚJ IDŐSZAK NYÍLT, ÉS AZT IS, HOGY ADATJOG NEM JÁR VELE.
    // A spec §4: „a régi adatkörjogok … NEM éledhetnek fel. A négy olvasási kör újra külön,
    // kifejezett megadást igényel; maga az új tagság egyiket sem adja meg." A `read_scope_granted`
    // ezért TOVÁBBRA IS `null` — és ezt a válasz KI IS MONDJA, nem hallgatja el (KUKA-012 · KUKA-041).
    return Object.freeze({
      ok: true, shape, outcome: regranting ? 'regranted' : outcome2.outcome,
      subject_id: subjectId, book_id: fresh.book_id, read_scope_granted: readScopeGranted,
      reentry: regranting
        ? Object.freeze({
          offer_id: reentry2.reentry.offer_id,
          reopened_closed_period: reentry2.reentry.closed_grant_event_id,
          reopened_closed_revocation: reentry2.reentry.closed_revocation_id,
          decided_by: reentry2.reentry.decided_by,
          scopes_granted: false,
          note: 'új tagsági időszak nyílt; a korábbi adatkörjogok NEM álltak vissza',
        })
        : null,
    });
  });
}
