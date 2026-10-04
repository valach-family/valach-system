/** OON-01 — AZ EGYSZERI HATÁS A HATÁSKÖRI MŰVELETEKEN (R134/F134-03).
 *
 * A LELET (megtalálta: a KÜLSŐ ELLENŐRZŐ FÉL, chatgpt-v3, R134/F134-03). Két azonos, egymás utáni
 * `POST /api/members/reinvite` kérésre a mi saját battériánk ezt mérte — és PASS-nak nevezte:
 * `invite` 10→12 · `invite_basis` 10→12 · `membership_reentry` 2→4. A HTTP-út minden kéréshez ÚJ
 * tokent gyártott, tartós KÉRÉS-AZONOSSÁG pedig nem volt. Az R132 §5 viszont SZERVERES egyszeri
 * hatást kért: *„Dupla kattintás, hálózati újraküldés, elveszett sikeres válasz és párhuzamos
 * elfogadás ne adjon új üzleti hatást."* A letiltott gomb erre nem védelem.
 *
 * MIÉRT NEM A `grantScopeToMember` MINTÁJA. Ott az idempotencia a JOG MAI ÁLLAPOTÁN áll („ha ma
 * hatályos, nincs mit tenni") — AJÁNLATNÁL ez nem működik: két ajánlat kiadása után is „nincs
 * tagság", tehát az állapot nem különbözteti meg az ISMÉTLÉST egy ÚJ, tudatos második ajánlattól.
 * A kettő bájtra azonos kérés. Ezért a megismételt SZÁNDÉK azonosságát a hívó adja, a HATÓKÖRÉT és
 * a TARTALOM lenyomatát a szerver képezi.
 *
 * MIÉRT NEM A `command` TÁBLA (KUKA-003 helyes olvasata). Az azonosság FELOLDÓIT innen hívjuk
 * (`commandIdentity` · `commandScope` · `canonicalize`) — azokat nem írjuk meg másodszor. A
 * TÁROLÁS viszont más könyv: a `command` a TAGSÁGI jogon (`own_book`) működő parancs-út otthona,
 * kiadási leltárral, nyugtával és tároló-őrökkel; egy BÍRÁLATI hatáskörön (`alter_right`) engedett
 * műveletet oda írni a kapu FAJTÁJÁT csúsztatná el (KUKA-002).
 *
 * MIT FED AZ AZONOSSÁG, ÉS MIT NEM — KIMONDVA (KUKA-033):
 *   · FEDI: a művelet neve és verziója · a könyv · a cselekvő · a hívó azonossága (`idem_key`) ·
 *     és a kanonikus TARTALOM (alany · szerep · adatkör).
 *   · NEM FEDI: a kiadás pillanatában lezárt tagsági IDŐSZAK. Azt az AJÁNLAT maga köti
 *     (`membership_reentry.closed_grant_event_id` + `closed_revocation_id`), a tárolt nyugta
 *     VISSZA IS ADJA, és az egyezést a BEVÁLTÁS méri (`reentry_offer_period_mismatch`). Ezért az
 *     ismétlés akkor is ugyanazt az ajánlatot adja, ha a címzett közben már elfogadta — ilyenkor
 *     az ajánlat kötése már nem áll, és a beváltás mondja ki, nem a kiadás hallgatja el.
 *
 * PURE + NEVEZETT: a feloldó nem dob kivételt a hívóra; a verseny NEVEZETT kimenet (KUKA-020).
 */
import { commandIdentity, commandScope, CanonError } from './command.mjs';
import { isUniqueViolation } from './storeError.mjs';

const frozen = (o) => Object.freeze(o);

/** A zárt művelet-készlet: ismeretlen művelet NEM „általános", hanem nem dönthető (KUKA-020). */
export const ONCE_ONLY_OPERATIONS = Object.freeze(['member.reinvite']);
export const ONCE_ONLY_VERSION = '1';

/**
 * A SZÁNDÉK LENYOMATA. A művelet nevét és verzióját is tartalmazza (Q03: más műveletet ugyanannak
 * minősíteni nem szabad), a könyv és a cselekvő a HATÓKÖRBEN áll (nem a lenyomatban — egy tény egy
 * helyen, KUKA-002).
 *
 * @returns {{ok:true, identity:string}|{ok:false, reason:string, at:string|null}}
 */
export function onceOnlyIdentity({ operation, declared }) {
  if (!ONCE_ONLY_OPERATIONS.includes(operation)) {
    return frozen({ ok: false, reason: 'once_only_operation_unknown', at: null });
  }
  try {
    return frozen({ ok: true, identity: commandIdentity({ type: operation, typeVersion: ONCE_ONLY_VERSION, declared }) });
  } catch (e) {
    if (!(e instanceof CanonError)) throw e;
    return frozen({ ok: false, reason: 'once_only_declared_not_canonical', at: e.path ?? null });
  }
}

/**
 * MÁR MEGTÖRTÉNT EZ A SZÁNDÉK? — a hatás ELŐTT kérdezzük, írás nélkül.
 *
 * @returns {{state:'fresh', identity:string}
 *          | {state:'replay', identity:string, effect:object, recorded_at:string}
 *          | {state:'conflict', identity:string, stored_identity:string}
 *          | {state:'refused', reason:string, at?:string|null}}
 */
export function onceOnlyBegin({ store, bookId, actor, idemKey, operation, declared }) {
  const id = onceOnlyIdentity({ operation, declared });
  if (id.ok !== true) return frozen({ state: 'refused', reason: id.reason, at: id.at ?? null });
  let scope;
  try {
    scope = commandScope({ bookId, actor, idemKey });
  } catch {
    // A HIÁNYOS CÍM BEKÖTÉSI HIBA, nem üzleti „nem" — nevezetten, nem nyers kivétellel (KUKA-020).
    return frozen({ state: 'refused', reason: 'once_only_scope_incomplete' });
  }
  const prior = store.get(
    'SELECT * FROM operation_once WHERE book_id = ? AND actor = ? AND idem_key = ?',
    scope.bookId, scope.actor, scope.idemKey);
  if (!prior) return frozen({ state: 'fresh', identity: id.identity });
  if (String(prior.identity_hash) !== String(id.identity)) {
    return frozen({ state: 'conflict', identity: id.identity, stored_identity: String(prior.identity_hash) });
  }
  let effect = null;
  try { effect = JSON.parse(prior.effect_json); } catch { effect = null; }
  if (effect === null || typeof effect !== 'object') {
    // AZ OLVASHATATLAN NYUGTA NEM „NINCS NYUGTA": nevezetten elakadunk, nem adunk ki új hatást
    // egy olyan azonosságra, aminek a korábbi eredményét nem tudjuk megmondani (KUKA-020).
    return frozen({ state: 'refused', reason: 'once_only_stored_effect_unreadable' });
  }
  return frozen({ state: 'replay', identity: id.identity, effect: frozen({ ...effect }), recorded_at: prior.recorded_at });
}

/**
 * A SZÁNDÉK LEZÁRÁSA — a hatás TRANZAKCIÓJÁN BELÜL hívandó, hogy a nyugta a hatással EGYÜTT
 * maradjon vagy EGYÜTT tűnjön el (a KUKA-026 ellenpárja).
 *
 * @returns {{ok:true}|{ok:false, reason:'once_only_race'|'once_only_row_not_created'}}
 */
export function onceOnlyCommit({ store, bookId, actor, idemKey, operation, identity, effect, at }) {
  let res;
  try {
    res = store.run(
      `INSERT INTO operation_once (book_id, actor, idem_key, operation, identity_hash, effect_json, recorded_at)
       VALUES (?,?,?,?,?,?,?)`,
      bookId, actor, idemKey, operation, identity, JSON.stringify(effect ?? {}), at);
  } catch (e) {
    // KÉT VALÓDI KAPCSOLAT VERSENYE: a vesztes NEM ír másodszor, és NEM kap programhibát — a
    // kulcs-ütközés NEVEZETT kimenet, amiből a hívó ISMÉTLÉST tud csinálni (KUKA-129: a nyugta
    // mondjon igazat arról, mi történt).
    // A FELISMERÉS EGY HELYEN ÁLL (STE-01). A korábbi alak KÉT SQLite-specifikus jelre épült,
    // tehát PostgreSQL-en NEM illeszkedett volna — az egyszeriség pont a versenyhelyzetben bukott
    // volna el, némán. A `isUniqueViolation` mindkét tároló jelét ismeri.
    if (isUniqueViolation(e)) {
      return frozen({ ok: false, reason: 'once_only_race' });
    }
    throw e;
  }
  if (res?.changes !== 1) return frozen({ ok: false, reason: 'once_only_row_not_created' });
  return frozen({ ok: true });
}
