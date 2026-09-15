/** MCS-2 / KSZ-01 — KÉSZLET-FŐKÖNYV.
 *
 * BIRTOKOL: hozzáfűzéses mozgás-sorok (előjeles mennyiség), mindegyik egy VÉGLEGESÍTETT parancshoz
 *           és annak nyugtájához kötve.
 * ÍGÉR: a hiteles forrás a MOZGÁSNAPLÓ · KÉT idő-nézet, megnevezve · mennyiség-szerződés ·
 *       készletkulcs `(könyv, cikk, tulajdonos, raktár)` · atomiság.
 * TILT: tárolt egyenleg átírása az igazság helyett · árva mozgás-sor · mozgás-sor TÖRLÉSE.
 *
 * A KÉT IDŐ — ÉS MIÉRT KELL MINDKETTŐ (az R2 §2/a és a P4 feloldása).
 *
 *   NÉZET-A — „tegnap mit TUDTUNK a tegnapi készletről": a `recorded_at` szerinti állapot. Egy MA
 *             rögzített, TEGNAPRA hatályos bevét ezt NEM módosítja. Ez a nézet a KÖNYVELÉSÉ és a
 *             hatósági lapoké: ami egyszer kiment, az nem változhat utólag.
 *   NÉZET-B — „MAI tudásunk szerint mennyi volt tegnap": az `effective_at` szerinti állapot, a
 *             ma ismert összes sorral. Ez a nézet az ÜZLETÉ: „mi volt a valóság?"
 *
 * A KETTŐ KÜLÖNBÖZIK, és a különbség nem hiba, hanem INFORMÁCIÓ. Ezért a nézetet a hívó NEVEZI MEG
 * (`view: 'A' | 'B'`), és az alapértelmezés nem néma: ismeretlen nézet FAIL-CLOSED (KUKA-124/2).
 *
 * KIMONDOTT KORLÁT: a tagság kétidős modulja (`bitemporal.mjs`) NEM bizonyítja ezt — más a tárgya
 * (jogviszony vs. mennyiség), és a létezése nem bizonyíték a működésre (KUKA-038). A KSZ-01-nek
 * SAJÁT próbája van.
 *
 * KIMONDOTT KORLÁT 2: a bemutatóban EGY raktár és EGY tulajdonos. A készletkulcs mégis a TELJES
 * négyes, mert a kulcs UTÓLAGOS bővítése minden tárolt sort értelmez újra — azt viszont nem
 * szabad (ugyanaz az osztály, mint a profil-váltás: a tárolt szám jelentése nem változhat).
 */
import { parseQuantity, addQuantities, formatQuantity, DEFAULT_PROFILE_ID } from './quantity.mjs';
import { itemById } from './catalog.mjs';

export const LEDGER_VIEWS = Object.freeze(['A', 'B']);
const fail = (error, detail) => Object.freeze({ ok: false, error, detail: detail ?? null });

/** A KÉSZLETKULCS — EGY feloldó, hogy az író és az olvasó ne tudjon elcsúszni (KUKA-039). */
export function stockKey({ bookId, itemId, ownerId, warehouseId }) {
  const missing = [];
  if (!bookId) missing.push('bookId');
  if (!itemId) missing.push('itemId');
  if (!ownerId) missing.push('ownerId');
  if (!warehouseId) missing.push('warehouseId');
  if (missing.length) throw new Error(`stockKey: hiányos készletkulcs: ${missing.join(', ')} (KSZ-01)`);
  return Object.freeze({ bookId, itemId, ownerId, warehouseId });
}

/**
 * MOZGÁS HOZZÁFŰZÉSE — CSAK VÉGLEGESÍTETT PARANCSHOZ KÖTVE.
 *
 * AZ ATOMISÁG ITT MÉRHETŐ TÉNY, NEM ÍGÉRET: a függvény a parancs `effect_id`-jét KÖTELEZŐEN kéri,
 * és megnézi, hogy (1) a parancs létezik, (2) `finalized` állapotú, (3) van NYUGTA-eseménye. Ha
 * bármelyik hiányzik, a sor NEM születik meg — árva mozgás-sor nincs.
 *
 * A HIÁNYZÓ NYUGTA KÜLÖN VÁLASZ a hiányzó parancstól (KUKA-124/2): a kettő két különböző baj, és
 * a hívónak mást kell tennie.
 */
export function appendMovement({ store, key, qty, profileId = DEFAULT_PROFILE_ID, effectId, recordedAt, effectiveAt, positive = false }) {
  const k = stockKey(key);
  const item = itemById(store, k.itemId);
  if (!item) return fail('unknown_item', k.itemId);
  // A CIKK PROFILJA AZ IGAZSÁG, nem a hívóé: enélkül a hívó megváltoztathatná a tárolt szám
  // JELENTÉSÉT egyetlen paraméterrel (KUKA-021 · a verziózott profil ÉRTELME).
  if (profileId !== item.qty_profile) {
    return fail('profile_mismatch', `a cikk profilja ${item.qty_profile}, a hívó ${profileId}-t adott`);
  }
  const q = parseQuantity(qty, { profileId: item.qty_profile, positive });
  if (!q.ok) return fail(q.error, q.detail);
  if (typeof recordedAt !== 'string' || !recordedAt) return fail('recorded_at_required');
  if (typeof effectiveAt !== 'string' || !effectiveAt) return fail('effective_at_required');
  if (typeof effectId !== 'string' || !effectId) return fail('effect_id_required');

  // (1)(2) A PARANCS és az ÁLLAPOTA.
  const cmd = store.get('SELECT * FROM command WHERE effect_id = ?', effectId);
  if (!cmd) return fail('unknown_effect', `nincs ilyen véglegesített parancs: ${effectId}`);
  if (cmd.state !== 'finalized') return fail('command_not_finalized', `a parancs állapota: ${cmd.state}`);
  if (cmd.book_id !== k.bookId) return fail('book_mismatch', `a parancs könyve ${cmd.book_id}, a mozgásé ${k.bookId}`);
  // (3) A NYUGTA — a `command_finalized` esemény. Ez KÜLÖN válasz: a parancs megvan, a nyugta nem.
  const receipt = store.get(
    'SELECT id FROM command_event WHERE book_id = ? AND actor = ? AND idem_key = ? AND event = ?',
    cmd.book_id, cmd.actor, cmd.idem_key, 'command_finalized');
  if (!receipt) return fail('receipt_missing', 'a parancs véglegesített, de NYUGTA-eseménye nincs — árva mozgás nem születhet');

  store.run(
    'INSERT INTO stock_movement (book_id, item_id, owner_id, warehouse_id, qty_scaled, qty_profile, effect_id, recorded_at, effective_at) '
    + 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    k.bookId, k.itemId, k.ownerId, k.warehouseId, q.scaled.toString(), item.qty_profile, effectId, recordedAt, effectiveAt);
  return Object.freeze({ ok: true, scaled: q.scaled, profileId: item.qty_profile, text: q.text });
}

/**
 * EGYENLEG — A MOZGÁSOKBÓL SZÁMOLVA, SOHA NEM TÁROLT VETÜLETBŐL.
 *
 * A `view` KÖTELEZŐ és NEVEZETT. Ismeretlen nézetre fail-closed: a néma alapértelmezés itt azt
 * jelentené, hogy a hívó azt hiszi, az egyik nézetet kapja, és a másikat kapja — ez pontosan az a
 * néma hazugság, amiről a KUKA-012 szól.
 *
 * @param {'A'|'B'} view   A: a `recorded_at` szerint · B: az `effective_at` szerint
 * @param {string}  asOf   a fordulónap (ISO) — eddig bezárólag
 */
export function balanceAt({ store, key, view, asOf }) {
  const k = stockKey(key);
  if (!LEDGER_VIEWS.includes(view)) {
    return fail('unknown_view', `a nézetet NEVEZNI kell: ${LEDGER_VIEWS.join(' | ')} `
      + '(A = "akkor mit tudtunk", B = "ma mit tudunk arról az időről")');
  }
  if (typeof asOf !== 'string' || !asOf) return fail('as_of_required');
  const item = itemById(store, k.itemId);
  if (!item) return fail('unknown_item', k.itemId);

  const column = view === 'A' ? 'recorded_at' : 'effective_at';
  const rows = store.all(
    `SELECT qty_scaled, qty_profile FROM stock_movement
      WHERE book_id = ? AND item_id = ? AND owner_id = ? AND warehouse_id = ? AND ${column} <= ?`,
    k.bookId, k.itemId, k.ownerId, k.warehouseId, asOf);

  const parts = rows.map((r) => ({ scaled: BigInt(r.qty_scaled), profileId: r.qty_profile }));
  const sum = addQuantities(parts, { profileId: item.qty_profile });
  if (!sum.ok) return sum;
  return Object.freeze({
    ok: true, view, asOf, movements: rows.length,
    scaled: sum.scaled, profileId: item.qty_profile,
    // AZ API-KIMENET DECIMÁLIS SZÖVEG (R8 §2): a JSON-szám a 0,1-et sem tudja pontosan.
    text: formatQuantity(sum.scaled, item.qty_profile),
  });
}

/**
 * ATOMIKUS BEVÉT — a PARANCS, a NYUGTA és a MOZGÁS EGYÜTT születik vagy EGYÜTT gördül vissza.
 *
 * AZ R8 §2 KIMONDOTT KÖVETELMÉNYE: *„Az összegkorlát megsértése a teljes bevétet, a mozgást és a
 * nyugtát EGYÜTT utasítsa el; ne csak később a készletnézet bukjon."*
 *
 * Ez nem magától értetődő: a mennyiség ÖNMAGÁBAN lehet érvényes (`999999`), és csak a MEGLÉVŐ
 * egyenleggel ÖSSZEADVA lépi túl a profil határát. Ha az ellenőrzés csak az olvasásnál futna, a
 * főkönyvben ott állna egy sor, amit egyetlen nézet sem tud kiszámolni — a hiba a kiadásnál
 * jelentkezne, ahol már nincs mit tenni (KUKA-026: a kudarc nyoma nem utazhat a tranzakcióval).
 *
 * Ezért a HATÁR ellenőrzése az ÍRÁS ELŐTT fut, a tranzakción BELÜL, és a visszagörgetés TELJES.
 */
export function receiveStock({ store, key, qty, effectId, recordedAt, effectiveAt }) {
  const k = stockKey(key);
  const item = itemById(store, k.itemId);
  if (!item) return fail('unknown_item', k.itemId);

  return store.tx(() => {
    // 1. A BEMENET ÖNMAGÁBAN — bevétnél szigorúan pozitív (a nulla „nincs mozgás", nem bevét).
    const q = parseQuantity(qty, { profileId: item.qty_profile, positive: true });
    if (!q.ok) return fail(q.error, q.detail);

    // 2. A MEGLÉVŐ EGYENLEG + AZ ÚJ SOR — az ÖSSZEG a profil határán belül kell maradjon.
    //    A "B" nézetet kérdezzük, mert a hatályos idő dönti el a mai egyenleget.
    const current = balanceAt({ store, key: k, view: 'B', asOf: effectiveAt });
    if (!current.ok) return current;
    const after = addQuantities(
      [{ scaled: current.scaled, profileId: item.qty_profile }, { scaled: q.scaled, profileId: item.qty_profile }],
      { profileId: item.qty_profile });
    if (!after.ok) {
      // NEVEZETT elutasítás, MÉRT számokkal — a hívónak tudnia kell, mennyi fér még bele.
      return fail('sum_out_of_range',
        `a meglévő ${current.text} + a bevét ${q.text} a profil (${item.qty_profile}) határa fölé megy — `
        + 'a bevét, a mozgás és a nyugta EGYÜTT elutasítva, írás nélkül');
    }

    // 3. A MOZGÁS — csak most, és csak véglegesített parancshoz + nyugtához kötve.
    const moved = appendMovement({
      store, key: k, qty: q.text, profileId: item.qty_profile,
      effectId, recordedAt, effectiveAt, positive: true,
    });
    if (!moved.ok) return moved;
    return Object.freeze({ ok: true, added: q.text, balance: after.text, profileId: item.qty_profile });
  });
}

export const KSZ_CONTRACT = Object.freeze({
  id: 'KSZ-01',
  owns: 'hozzáfűzéses mozgás-sorok, véglegesített parancshoz és nyugtához kötve',
  views: LEDGER_VIEWS,
  key_axes: Object.freeze(['book', 'item', 'owner', 'warehouse']),
  promises: Object.freeze([
    'a hiteles forrás a MOZGÁSNAPLÓ — tárolt egyenleg-vetület ma NINCS',
    'KÉT idő-nézet, NEVEZVE: A = rögzítés szerint · B = hatály szerint',
    'a mennyiség-szerződés a cikk PROFILJÁVAL érvényesül, nem a hívóéval',
    'atomiság: parancs + nyugta + mozgás együtt születik vagy együtt gördül vissza',
  ]),
  forbids: Object.freeze([
    'tárolt egyenleg átírása az igazság helyett',
    'árva mozgás-sor (parancs vagy nyugta nélkül)',
    'mozgás-sor törlése — a helyesbítés ÚJ sor',
  ]),
  stated_limits: Object.freeze([
    'a bemutatóban EGY raktár és EGY tulajdonos — a KULCS mégis a teljes négyes',
    'a bitemporal.mjs NEM bizonyítja a készlet-időkezelést: saját próba (P4)',
    'tárolt egyenleg-vetület nincs, ezért a T6 (vetület-sérülés) MA NEM ALKALMAZHATÓ',
  ]),
});
