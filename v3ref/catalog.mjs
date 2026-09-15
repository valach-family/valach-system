/** MCS-2 / KAT-01 — CIKK-AZONOSSÁG.
 *
 * BIRTOKOL: a cikk azonossága a könyvön belül.
 * ÍGÉR: stabil BELSŐ azonosító az SKU MELLETT · az SKU a könyvön belül egyedi · a mértékegység a
 *       mennyiség JELENTÉSE, nem címke.
 * TILT: mértékegység utólagos átírása átszámolás nélkül · kereszt-könyves SKU-egyezésből levont
 *       azonosság · hivatkozás a belső azonosító helyett az SKU-ra.
 *
 * MIÉRT KÉT AZONOSÍTÓ. Az SKU EMBER-KULCS: a beszállító átnevezi, szabvány vált, a cég átáll másik
 * kódrendszerre. Ha a mozgás-sorok az SKU-ra hivatkoznának, egyetlen átnevezés visszamenőleg
 * átírná a történelmet — a készlet ép maradna, a nyomonkövetés nem (KUKA-023 alakja az
 * azonosságon). A belső azonosító ezért SOHA nem változik, és minden hivatkozás azt viszi.
 *
 * MIÉRT A KÖNYVÖN BELÜL EGYEDI, ÉS MIÉRT NEM AZON TÚL. Két könyv (két cég) `050`-es SKU-ja két
 * KÜLÖNBÖZŐ termék — a V2-ben ez élesben megtörtént: a közös bolton egy diólaj és egy fűszerpaprika
 * állt volna párba a közös kód miatt (KUKA-027). Ezért az egyediség hatóköre a KÖNYV, és
 * kereszt-könyves azonosságot ez a modul NEM állít: azt külön bizonyíték dönti el.
 */
import { createHash } from 'node:crypto';
import { quantityProfile, DEFAULT_PROFILE_ID } from './quantity.mjs';

/** A mértékegység DIMENZIÓJA — az átváltás lehetőségének kérdése, nem a felirat kérdése. */
export const UNIT_DIMENSIONS = Object.freeze({
  l: 'volume', ml: 'volume',
  kg: 'mass', g: 'mass',
  db: 'count',
});
export function unitDimension(unit) { return UNIT_DIMENSIONS[unit] || null; }

const fail = (error, detail) => Object.freeze({ ok: false, error, detail: detail ?? null });
const itemIdFor = (bookId, sku, at) =>
  `itm_${createHash('sha256').update(`kat-1|${bookId}|${sku}|${at}`).digest('hex').slice(0, 24)}`;

/**
 * CIKK FELVÉTELE. A visszatérés nevezett elutasítás vagy a felvett cikk — nem dob (KUKA-020).
 * A SKU ütközése a KÖNYVÖN BELÜL hiba; MÁSIK könyvben ugyanaz a SKU teljesen rendben van.
 */
export function registerItem({ store, bookId, sku, unit, qtyProfile = DEFAULT_PROFILE_ID, at }) {
  if (typeof bookId !== 'string' || !bookId) return fail('book_required');
  if (typeof sku !== 'string' || !sku.trim()) return fail('sku_required');
  if (typeof unit !== 'string' || !unitDimension(unit)) {
    return fail('unknown_unit', `ismeretlen mértékegység: ${JSON.stringify(unit)} — `
      + `választható: ${Object.keys(UNIT_DIMENSIONS).join(' · ')}`);
  }
  try { quantityProfile(qtyProfile); } catch (e) { return fail('unknown_qty_profile', e.message); }
  if (typeof at !== 'string' || !at) return fail('at_required');

  if (store.get('SELECT item_id FROM item WHERE book_id = ? AND sku = ?', bookId, sku)) {
    return fail('sku_taken', `ebben a könyvben már van ilyen SKU: ${sku}`);
  }
  const itemId = itemIdFor(bookId, sku, at);
  store.run('INSERT INTO item (item_id, book_id, sku, unit, qty_profile, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    itemId, bookId, sku, unit, qtyProfile, at);
  return Object.freeze({ ok: true, itemId, bookId, sku, unit, qtyProfile });
}

/** A cikk feloldása a BELSŐ azonosítóból — ez a kanonikus út minden hivatkozáshoz. */
export function itemById(store, itemId) {
  return store.get('SELECT * FROM item WHERE item_id = ?', itemId) || null;
}

/**
 * FELOLDÁS SKU-BÓL — CSAK könyvvel együtt. A könyv nélküli SKU-keresés fogalmilag hibás
 * (KUKA-027), ezért ez a függvény a könyvet KÖTELEZŐEN kéri, és nem ad „legjobb találatot".
 */
export function itemBySku(store, bookId, sku) {
  if (!bookId) throw new Error('itemBySku: a KÖNYV kötelező — SKU önmagában nem azonosít (KAT-01)');
  return store.get('SELECT * FROM item WHERE book_id = ? AND sku = ?', bookId, sku) || null;
}

/**
 * MÉRTÉKEGYSÉG-VÁLTÁS — ez a modul legfontosabb TILTÁSA.
 *
 * A V2-ben ez élesben megtörtént: egy átírás literről darabra, átszámolás nélkül — és a szám
 * ugyanaz maradt, miközben a JELENTÉSE megváltozott (KUKA-021). A szabály itt HÁROM ágra bomlik,
 * és mindhárom NEVEZETT — a néma elnyelés lenne a hiba:
 *
 *   1. AZONOS egység             → no-op, `unchanged`
 *   2. NULLA LÁBNYOM             → szabad: ha egyetlen mozgás sincs, nincs mit átszámolni
 *                                  („a lábnyom dönt, nem a név" — KUKA-021 kimondott kivétele)
 *   3. VAN LÁBNYOM               → TILOS, `unit_change_needs_conversion`, a mért lábnyommal együtt
 *
 * A 2. ág NEM engedmény: a mérés DÖNTI el, nem a szándék. És a lábnyom SZÁMA benne van a válaszban,
 * hogy a hívó ne a hitét, hanem a mért tényt lássa (KUKA-033).
 */
export function changeItemUnit({ store, itemId, unit }) {
  const item = itemById(store, itemId);
  if (!item) return fail('unknown_item', itemId);
  if (!unitDimension(unit)) return fail('unknown_unit', unit);
  if (item.unit === unit) return Object.freeze({ ok: true, changed: false, reason: 'unchanged' });

  const row = store.get('SELECT COUNT(*) AS n FROM stock_movement WHERE item_id = ?', itemId);
  const footprint = Number(row ? row.n : 0);
  if (footprint > 0) {
    return fail('unit_change_needs_conversion',
      `${footprint} mozgás-sor áll a cikk mögött — az egység a mennyiség JELENTÉSE, tehát az `
      + `átírás visszamenőleg MÁS mennyiséget állítana. Az átváltás külön, kimondott művelet `
      + `(${item.unit} → ${unit}, dimenzió: ${unitDimension(item.unit)} → ${unitDimension(unit)}).`);
  }
  store.run('UPDATE item SET unit = ? WHERE item_id = ?', unit, itemId);
  return Object.freeze({ ok: true, changed: true, reason: 'zero_footprint', footprint: 0 });
}

export const KAT_CONTRACT = Object.freeze({
  id: 'KAT-01',
  owns: 'a cikk azonossága a könyvön belül',
  promises: Object.freeze([
    'stabil BELSŐ azonosító az SKU mellett',
    'az SKU a KÖNYVÖN BELÜL egyedi',
    'a mértékegység a mennyiség JELENTÉSE, nem címke',
  ]),
  forbids: Object.freeze([
    'mértékegység utólagos átírása átszámolás nélkül (nem nulla lábnyomon)',
    'kereszt-könyves SKU-egyezésből levont azonosság',
    'hivatkozás a belső azonosító helyett az SKU-ra',
  ]),
});
