/** MCS-2 / KSZ-01 — KÉSZLET-FŐKÖNYV.
 *
 * BIRTOKOL: hozzáfűzéses mozgás-sorok (előjeles mennyiség), mindegyik egy VÉGLEGESÍTETT parancshoz
 *           és annak nyugtájához kötve — UGYANABBAN a tranzakcióban.
 * ÍGÉR: a hiteles forrás a MOZGÁSNAPLÓ · KÉT idő-nézet, TENGELYENKÉNT · mennyiség-szerződés ·
 *       készletkulcs `(könyv, cikk, tulajdonos, raktár)` · atomiság a parancs-úton.
 * TILT: tárolt egyenleg átírása az igazság helyett · árva mozgás-sor · mozgás-sor TÖRLÉSE ·
 *       **a parancs-út megkerülése nyers segéddel**.
 *
 * ── AZ R10 HÁROM LELETE, ÉS MI VÁLTOZOTT TŐLÜK ──────────────────────────────────────────────────
 *
 * **R10-F01 — nem volt közös, egyszeri és atomikus bevét.** A régi `receiveStock` SAJÁT tranzakciót
 * nyitott, és egy MÁR véglegesített parancsot KÉRT. Mérve: ugyanaz a hatásazonosító kétszer
 * könyvelt · az elutasítás után a parancs `finalized` maradt a nyugtájával · egy MÁSIK művelet
 * azonosítójával is lehetett készletet írni. A javítás: **a bevét a `submitCommand` útján megy**, a
 * mozgás a parancs tranzakciójában születik, és a nyers író NEM belépési pont többé (nincs
 * exportálva).
 *
 * **R10-F02 — idegen könyv cikke elfogadható volt.** A `cmd.book_id === key.bookId` ellenőrzés
 * megvolt, az `item.book_id === key.bookId` nem: A könyv parancsával B könyv cikkére lehetett írni.
 * A cikk könyvhöz tartozását MOST az író ÉS az olvasó is megkérdezi (KUKA-027: közös csatornán
 * minden azonosító csak a SAJÁT terében egyedi).
 *
 * **R10-F03 — az idő.** Az „A" nézet csak a rögzítés tengelyét szűrte, tehát egy MÁRCIUSBAN
 * rögzített, JÚNIUSRA hatályos bevét a MÁRCIUSI „akkor mit tudtunk" képen már benne volt. És a
 * visszadátumozott írás megkerülte az összeg-ellenőrzést: a márciusi egyenlegre fért, a JÚNIUSIT
 * viszont számíthatatlanná tette. A nézet MOST tengely-PÁR (`instant.mjs`), az összeg-ellenőrzés
 * pedig a visszadátumozás által érintett KÉSŐBBI állapotot is megnézi.
 */
import { parseQuantity, addQuantities, formatQuantity, DEFAULT_PROFILE_ID } from './quantity.mjs';
import { parseInstant, LEDGER_VIEW_AXES, LEDGER_VIEWS } from './instant.mjs';
import { itemById } from './catalog.mjs';
import { validateInput, bindQuantityProfile } from './inputSchema.mjs';
import { submitCommandWithEffect } from './command.mjs';
import { authorizeBookAction } from './accessGate.mjs';
import { lookupClosed } from './closedRegistry.mjs';

export { LEDGER_VIEWS };
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
 * A CIKK FELOLDÁSA A KULCSHOZ — a könyvhöz tartozás ELLENŐRZÉSÉVEL (R10-F02).
 *
 * EGY feloldó, mert az író és az olvasó ugyanazt a kérdést teszi fel, és ha két helyen válaszolnánk
 * rá, előbb-utóbb elcsúsznának (KUKA-039). A kereszt-könyves eset KÜLÖN, nevezett válasz — nem
 * „ismeretlen cikk": a cikk létezik, csak nem ebben a könyvben, és a beadónak ezt kell megtudnia
 * (KUKA-064). Létezés-szivárgás itt nincs: a hívó a SAJÁT könyvének parancsával jött.
 */
function itemForKey(store, key) {
  const item = itemById(store, key.itemId);
  if (!item) return { ok: false, error: 'unknown_item', detail: key.itemId };
  if (item.book_id !== key.bookId) {
    return {
      ok: false,
      error: 'item_belongs_to_another_book',
      detail: `a cikk (${key.itemId}) a(z) ${item.book_id} könyvé, a készletkulcs a(z) ${key.bookId} könyvé`,
    };
  }
  return { ok: true, item };
}

// ── A MOZGÁS ÍRÁSA — BELSŐ. SZÁNDÉKOSAN NINCS EXPORTÁLVA (R10-F01) ──────────────────────────────
//
// Az R10 kimondta: *„A nyers belső segéd ne legyen ennek megkerülése."* Amíg ez a függvény nyilvános
// belépési pont volt, a parancs-út minden garanciája (jog · ismétlés-védelem · normalizált tartalom ·
// atomiság) MEGKERÜLHETŐ maradt — és a próbám maga is megkerülte, tehát a mérés a saját vakfoltját
// igazolta vissza (KUKA-054). Innentől CSAK a `stockReceiptEffect` hívja, a parancs tranzakciójából.
function appendMovement({ store, key, item, qty, effectId, recordedAt, effectiveAt, positive = false }) {
  const q = parseQuantity(qty, { profileId: item.qty_profile, positive });
  if (!q.ok) return fail(q.error, q.detail);

  const rec = parseInstant(recordedAt);
  if (!rec.ok) return fail(`recorded_at_${rec.error}`, rec.detail);
  const eff = parseInstant(effectiveAt);
  if (!eff.ok) return fail(`effective_at_${eff.error}`, eff.detail);

  // A TÁROLÓ ŐREI NEVEZETT VÁLASZT ADNAK, NEM NYERS KIVÉTELT (KUKA-020 · KUKA-028).
  //
  // A kötést (véglegesített parancs + nyugta) a `stock_movement_*` őrök tartják, nem ez a függvény —
  // így egy jövőbeli MÁSODIK író sem tudja megkerülni (KUKA-013). Az őr üzenetét viszont NEM
  // cseréljük le feltételezett diagnózisra: a forrás mondata megy tovább a `detail`-ben.
  try {
    store.run(
      'INSERT INTO stock_movement (book_id, item_id, owner_id, warehouse_id, qty_scaled, qty_profile, effect_id, recorded_at, effective_at) '
      + 'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      key.bookId, key.itemId, key.ownerId, key.warehouseId, q.scaled.toString(), item.qty_profile,
      effectId, rec.canonical, eff.canonical);
  } catch (e) {
    const msg = String(e && e.message || e);
    if (msg.includes('unknown_effect')) return fail('unknown_effect', msg);
    if (msg.includes('receipt_missing')) return fail('receipt_missing', msg);
    throw e;                                   // ismeretlen tárolási hiba: NEM nyeljük el
  }
  return Object.freeze({ ok: true, scaled: q.scaled, profileId: item.qty_profile, text: q.text });
}

/**
 * EGYENLEG — A MOZGÁSOKBÓL SZÁMOLVA, SOHA NEM TÁROLT VETÜLETBŐL.
 *
 * A `view` KÖTELEZŐ és NEVEZETT; a mögötte álló TENGELY-PÁR az `instant.mjs`-ben él, egy helyen
 * (R10-F03). Ismeretlen nézetre fail-closed: a néma alapértelmezés azt jelentené, hogy a hívó azt
 * hiszi, az egyik nézetet kapja, és a másikat kapja — ez a KUKA-012 néma hazugsága.
 */
export function balanceAt({ store, key, view, asOf }) {
  const k = stockKey(key);
  // ZÁRT REGISZTER, SAJÁT KULCSON (CLR-01, R37 · KUKA-180): a nézet NEVE külső bemenet, tehát az
  // örökölt tulajdonság-nevek itt sem adhatnak „találatot".
  const spec = lookupClosed(LEDGER_VIEW_AXES, view, { shape: (v) => typeof v === 'object' && v.id });
  if (!spec) {
    return fail('unknown_view', `a nézetet NEVEZNI kell: ${LEDGER_VIEWS.join(' | ')} — `
      + Object.values(LEDGER_VIEW_AXES).map((v) => `${v.id} = "${v.label}"`).join(' · '));
  }
  const t = parseInstant(asOf);
  if (!t.ok) return fail(`as_of_${t.error}`, t.detail);

  const found = itemForKey(store, k);
  if (!found.ok) return fail(found.error, found.detail);
  const { item } = found;

  // A TENGELYEK A DEKLARÁCIÓBÓL JÖNNEK, nem kézzel írt WHERE-ből: így a nézet JELENTÉSE és a
  // lekérdezés nem tud elcsúszni (KUKA-018 — melyiket olvassa a fogyasztó?).
  const where = spec.axes.map((a) => `${a} <= ?`).join(' AND ');
  const rows = store.all(
    `SELECT qty_scaled, qty_profile FROM stock_movement
      WHERE book_id = ? AND item_id = ? AND owner_id = ? AND warehouse_id = ? AND ${where}`,
    k.bookId, k.itemId, k.ownerId, k.warehouseId, ...spec.axes.map(() => t.canonical));

  const parts = rows.map((r) => ({ scaled: BigInt(r.qty_scaled), profileId: r.qty_profile }));
  const sum = addQuantities(parts, { profileId: item.qty_profile });
  if (!sum.ok) return sum;
  return Object.freeze({
    ok: true, view, view_axes: spec.axes, asOf: t.canonical, movements: rows.length,
    scaled: sum.scaled, profileId: item.qty_profile,
    // AZ API-KIMENET DECIMÁLIS SZÖVEG (R8 §2): a JSON-szám a 0,1-et sem tudja pontosan.
    text: formatQuantity(sum.scaled, item.qty_profile),
  });
}

/**
 * A BEVÉT HATÁSA — a parancs tranzakciójában fut (R10-F01).
 *
 * Nem exportált belépési pont: a `submitStockReceipt` adja át a `submitCommand`-nak. Ami itt
 * `{ok:false}`-t ad, az a TELJES parancsot visszagörgeti — parancs-sor és nyugta nélkül.
 */
// A HATÁS BEMENETE NEM A KIADHATÓ EREDMÉNY. A `qtyText` és az `effectiveAt` a `validateInput` FAGYASZTOTT
// értékéből jön, nem a `resolved`-ból: az eredmény a kiadás adatköreire van szabva (mennyiség + cikk),
// és a hatály nem kiadható mező. Mindkét forrás fagyasztott, tehát nincs olyan ablak, amiben a hatás
// bemenete a feloldás után elmozdulhatna (KUKA-088: a PILLANATKÉP fagy, a JOG nem).
function stockReceiptEffect({ store, at, effectId, key, qtyText, effectiveAt }) {
  const k = stockKey(key);
  const found = itemForKey(store, k);
  if (!found.ok) return found;                       // R10-F02: idegen könyv cikke ITT bukik el
  const { item } = found;

  const q = parseQuantity(qtyText, { profileId: item.qty_profile, positive: true });
  if (!q.ok) return fail(q.error, q.detail);

  // ── AZ ÖSSZEG-ELLENŐRZÉS A VISSZADÁTUMOZÁST IS VÉDI (R10-F03) ─────────────────────────────────
  //
  // A régi alak CSAK a bevét HATÁLYÁRA vett egyenleget nézte. Mérve: ha júniusban már 1 000 000 áll,
  // egy MÁRCIUSRA visszadátumozott +1 átment (márciusban fért), és utána a JÚNIUSI egyenleg
  // `out_of_range` lett — tehát olyan írást fogadtunk el, ami a KÉSŐBBI nézetet SZÁMÍTHATATLANNÁ
  // tette. A visszadátumozás nem „régi" írás: a mai képre is hat (KUKA-021 rokona az IDŐN).
  //
  // Ezért a védett állapot a LEGKÉSŐBBI ismert pont: a bevét hatálya ÉS a főkönyv legnagyobb
  // hatályos ideje közül a későbbi. Így a kapu azt méri, ami a bevét után TÉNYLEG előállna.
  const latest = store.get(
    `SELECT MAX(effective_at) AS t FROM stock_movement
      WHERE book_id = ? AND item_id = ? AND owner_id = ? AND warehouse_id = ?`,
    k.bookId, k.itemId, k.ownerId, k.warehouseId);
  const horizonIso = latest && latest.t && latest.t > effectiveAt ? latest.t : effectiveAt;

  const current = balanceAt({ store, key: k, view: 'B', asOf: horizonIso });
  if (!current.ok) return current;
  const after = addQuantities(
    [{ scaled: current.scaled, profileId: item.qty_profile }, { scaled: q.scaled, profileId: item.qty_profile }],
    { profileId: item.qty_profile });
  if (!after.ok) {
    return fail('sum_out_of_range',
      `a ${horizonIso} időpontra álló ${current.text} + a bevét ${q.text} a profil `
      + `(${item.qty_profile}) ÖSSZEG-korlátja fölé megy — a bevét, a mozgás és a nyugta EGYÜTT `
      + 'elutasítva, írás nélkül');
  }

  const moved = appendMovement({
    store, key: k, item, qty: q.text, effectId,
    recordedAt: at, effectiveAt, positive: true,
  });
  if (!moved.ok) return moved;
  return Object.freeze({ ok: true, added: q.text, horizon: horizonIso });
}

/**
 * A KANONIKUS BEVÉT-ÚT — EZ AZ EGYETLEN belépési pont (R10-F01).
 *
 * A LÁNC, EGY HELYEN: bemeneti séma (BEM-01) → NORMALIZÁLT tartalom → parancs-azonosság és
 * ismétlés-védelem → jog a tranzakción belül → mozgás + nyugta EGY tranzakcióban.
 *
 * A NORMALIZÁLT TARTALOM A PARANCS-AZONOSSÁGBA MEGY (R8 §2 · R10-F01): a `declared` a `validateInput`
 * tisztított értéke, tehát a `"1"`, `"1.0"` és `"1.000"` UGYANAZT a hasht adja — egy hálózati
 * újrapróbálkozás más írásmóddal sem könyvel kétszer. A `canonicalQuantity` segéd LÉTEZÉSE ezt nem
 * bizonyította; a bizonyíték az, hogy a VALÓDI út ezen megy át.
 */
export function submitStockReceipt({ store, idemKey, actor, bookId, ownerId, warehouseId, input, clock, externalEvidence, credentials }) {
  // 0. A JOG ELŐBB DÖNT, MINT BÁRMI MÁS (AUT-01 · R16/F16-01 — a külső fél lelete).
  //
  // A RÉGI SORREND SZIVÁRGOTT. A cikk feloldása (3. lépés) a jogosultsági döntés ELŐTT futott, ezért
  // a tagság nélküli hívó KÜLÖNBÖZŐ választ kapott a nem létező (`unknown_item`) és a MÁSIK könyvben
  // létező (`item_belongs_to_another_book`) cikkre — a részlet ráadásul megnevezte a másik könyvet.
  // A hibakód különbsége ÖNMAGÁBAN hordozza a védett bitet, tehát a részlet törlése nem javítás
  // (KUKA-084: a szivárgás nem HELY, hanem CSATORNA).
  //
  // EZ NEM HELYETTESÍTI a tranzakción belüli ellenőrzést: a `submitCommand` a véglegesítés előtt
  // ÚJRA kérdez, mert a kettő közt a jog megszűnhet (KUKA-124/1 — más időpont, más tény).
  const gate = authorizeBookAction({
    store, actor, bookId, opClass: 'own_book', operation: 'stock.receipt',
    clock, externalEvidence, credentials,
  });
  if (!gate.ok) return gate;

  // 1. BEMENETI SÉMA — a nyers bemenet ITT dől el, konverzió nélkül (BEM-01 · KUKA-125).
  const checked = validateInput({ operation: 'stock.receipt', input });
  if (!checked.ok) return checked;

  // 2. A KÉSZLETKULCS a MEGBÍZHATÓ KONTEXTUSBÓL + a deklarált cikkből. A tulajdonost és a raktárat
  //    a HÍVÓ KÖRNYEZETE adja, nem a kérés törzse (KUKA-047: a hatókör a kérés-KÖRNYEZETÉBŐL jön).
  const key = stockKey({ bookId, itemId: checked.value.item_id, ownerId, warehouseId });

  // 3. A CIKK FELOLDÁSA A FELOLDÁS ELŐTT — hogy a `resolve` ne DOBHASSON a határon (KUKA-020).
  //    Ez NEM teszi feleslegessé a tranzakción BELÜLI ellenőrzést (KUKA-124/1): ez itt a tranzakción
  //    KÍVÜL áll, tehát a kettő közt a cikk még megszűnhet vagy átkerülhet. A valódi kapu a hatásban
  //    van; ez a mondat kedvéért fut, és UGYANAZT a feloldót hívja (KUKA-039).
  const preflight = itemForKey(store, key);
  if (!preflight.ok) return fail(preflight.error, preflight.detail);

  // 3/b. A MENNYISÉG B. SZAKASZA — MOST, hogy a cikk (és vele a PROFIL) ismert.
  //
  // A bemeneti séma a HATÁRON áll, ahol a profil még nem tudható; ha ott kanonizálnánk egy
  // alapértelmezéssel, akkor a darabos cikk `"1000"` értékéből `"1000.000"` lenne, és a főkönyv a
  // SAJÁT profiljával újraolvasva `precision`-re futna — mérve ez történt. A gyógyítást tehát az
  // végzi, aki ismeri a szabályt (KUKA-029), és ez az alak megy a parancs AZONOSSÁGÁBA is.
  const bound = bindQuantityProfile(checked, { profileId: preflight.item.qty_profile });
  if (!bound.ok) return bound;

  // 4. A PARANCS-ÚT — a hatás a tranzakcióján BELÜL fut.
  // AZ AZONOSSÁGBA A FELOLDOTT KONTEXTUS IS BELEMEGY. A tulajdonos és a raktár nem a kérés törzséből
  // jön (BEM-01), de a parancs AZONOSSÁGÁHOZ hozzátartozik: enélkül ugyanaz az ismétlés-kulcs MÁS
  // raktárra némán „ismétlésnek" látszana, és a második bevét soha nem könyvelődne (KUKA-074: az
  // idempotencia-őr csak az AZONOS kérést nyelheti el). Így viszont NEVEZETT `idempotency_conflict`.
  const identityBody = Object.freeze({ ...bound.value, owner_id: ownerId, warehouse_id: warehouseId,
    qty_profile: bound.qty_profile });

  return submitCommandWithEffect({
    store, idemKey, actor, bookId,
    type: 'stock.receipt', typeVersion: bound.version,
    declared: identityBody,                  // a NORMALIZÁLT tartalom + a FELOLDOTT hatókör
    // ── A BEMENET ÉS AZ EREDMÉNY KÉT KÜLÖN DOLOG (a SAJÁT leletem a bekötés közben) ─────────────
    //
    // Az első alakom a `resolve`-ból a BEMENETET adta vissza, és ezzel két tényt ültetett egy
    // ábrázolásra (KUKA-002): a parancs AZONOSSÁGA a beadott tartalom, az EREDMÉNY viszont az, amit
    // az olvasó KIADVA megkap — és utóbbi adatkörökre bomlik (DSC-01). A bemenet mezői (tulajdonos,
    // raktár, hatály) nem eredmény-mezők: az osztályozó jogosan utasította el őket. A `declared`
    // ezért marad a teljes, normalizált BEMENET, az eredmény pedig a bevét TÉNYE: mennyiség + cikk.
    resolve: () => Object.freeze({ qty: bound.value.qty, sku: preflight.item.sku }),
    effect: ({ store: s, at, resolved, effectId }) =>
      stockReceiptEffect({ store: s, at, resolved, effectId, key, qtyText: bound.value.qty, effectiveAt: bound.value.effective_at }),
    clock, externalEvidence, credentials,
  });
}

export const KSZ_CONTRACT = Object.freeze({
  id: 'KSZ-01',
  owns: 'hozzáfűzéses mozgás-sorok, véglegesített parancshoz és nyugtához kötve, EGY tranzakcióban',
  entry_point: 'submitStockReceipt',
  views: LEDGER_VIEWS,
  key_axes: Object.freeze(['book', 'item', 'owner', 'warehouse']),
  promises: Object.freeze([
    'a hiteles forrás a MOZGÁSNAPLÓ — tárolt egyenleg-vetület ma NINCS',
    'KÉT idő-nézet, TENGELY-PÁRRAL: A = (rögzítés ÉS hatály) · B = (hatály)',
    'a mennyiség-szerződés a cikk PROFILJÁVAL érvényesül, nem a hívóéval',
    'atomiság: parancs + nyugta + mozgás együtt születik vagy együtt gördül vissza',
    'a cikk a KULCS könyvéhez tartozik — az író és az olvasó is méri',
    'az összeg-korlát a visszadátumozás által érintett KÉSŐBBI állapotot is védi',
  ]),
  forbids: Object.freeze([
    'tárolt egyenleg átírása az igazság helyett',
    'árva mozgás-sor (parancs vagy nyugta nélkül)',
    'mozgás-sor törlése — a helyesbítés ÚJ sor',
    'a parancs-út megkerülése nyers íróval (a mozgás-író NINCS exportálva)',
  ]),
  stated_limits: Object.freeze([
    'a bemutatóban EGY raktár és EGY tulajdonos — a KULCS mégis a teljes négyes',
    'a bitemporal.mjs NEM bizonyítja a készlet-időkezelést: saját próba (P4)',
    'tárolt egyenleg-vetület nincs, ezért a T6 (vetület-sérülés) MA NEM ALKALMAZHATÓ',
    'a KIADÁS (issue) és a helyesbítés útja MÉG NEM épült meg — csak a bevét',
  ]),
});
