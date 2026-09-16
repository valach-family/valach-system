#!/usr/bin/env node
/** K0 — A BIZONYTALAN MENNYISÉG ÉS A MAG NÉGY ALAPKAPCSOLATA (R19 §9.1 · §12).
 *
 * MIÉRT FUT, ÉS MIÉRT NEM OLVAS. A külső fél R19-es terve azt kéri, hogy „minden érintett alapnak
 * KONKRÉT TÁMOGATÁSI MÓDJA ÉS ELLENPÉLDÁJA legyen". Egy forrásból levezetett állítás („a magban
 * nincs eredet-fogalom") HIHETŐ, de nem mérés — és a KUKA-089 pont erről szól: a „nincs hozzá
 * környezetem" is MÉRÉS, nem következtetés. A V3 mag adatbázis nélkül fut (`node:sqlite`), tehát
 * MINDEN állítás alá futtatható ellenpélda tehető. Ez a szerszám azt teszi.
 *
 * MIT MÉR — a négy alapkapcsolat, az R19 §12 sorrendjében:
 *   A  AZONOSSÁG ⊥ MENNYISÉG  — QNT-01/02: létrejöhet-e a tétel azonossága ismeretlen mennyiség
 *                               mellett, és mit mond a mag az ismeretlen mennyiségre
 *   B  JOGOSULTSÁG (C03)      — QNT-19/21/22/24 · R19 §8.5: a SZÁRMAZTATOTT mennyiség adatköre
 *   C  EGYSZERI VÉGREHAJTÁS   — QNT-07/14/15: a KÉSŐI mérés új ÁLLÍTÁS-e vagy új MOZGÁS
 *      (C05)
 *   D  KETTŐS IDŐNÉZET (C06)  — QNT-07/24 · R19 §5.2: HÁROM idő kell, a magban KETTŐ van
 *   E  AUDIT/VERZIÓZÁS        — QNT-03/08/23: az EREDET (mért · becsült · számított) tárolása
 *      (C07–C08)
 *
 * AMIT EZ NEM CSINÁL — KIMONDVA. Nem javít és nem tervez: a K0 a HATÁSVIZSGÁLAT, nem a megvalósítás
 * (R19 §9.1: „a teljes becslőmotor még nem előfeltétel"). Nem mond ki készültséget, és egyetlen
 * QNT-követelményt sem jelöl teljesítettnek. Ahol a mai mag JÓL kezel valamit, ott azt is méri —
 * különben a lista csak hiány-gyűjtemény volna, és a meglévő bizonyíték megtartása az R19 §9.1
 * kimondott feltétele.
 */
import { openStore, clockFrom } from '../v3ref/store.mjs';
import { registerItem, itemById } from '../v3ref/catalog.mjs';
import { submitStockReceipt, balanceAt } from '../v3ref/ledger.mjs';
import { OPERATION_SCHEMAS, validateInput } from '../v3ref/inputSchema.mjs';
import { LEDGER_VIEW_AXES } from '../v3ref/instant.mjs';
import { KNOWN_DATA_SCOPES, DECLARED_RESULT_TYPES, resultScopesOf } from '../v3ref/resultScope.mjs';
import { parseQuantity } from '../v3ref/quantity.mjs';

const T0 = '2026-09-09T08:00:00.000Z';
const findings = [];
const add = (f) => { findings.push(f); return f; };
// A mennyiség SKÁLÁZOTT EGÉSZ, és a mag BigInt-ként adja vissza — a `JSON.stringify` arra dob.
// Szövegre váltjuk, NEM `Number`-re: a konverzió pont azt a pontosságot venné el, amit a mag őriz
// (KUKA-125 — ahol az érték típusa a védett tény, ott az átalakítás a hiba).
const show = (v) => (typeof v === 'string' ? v
  : JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? `${x}n` : x)));

/** Egy világ: könyv, tag, cikk — mennyiség NÉLKÜL. Ez maga az (A) mérés kiindulása. */
function world() {
  const store = openStore();
  const clock = clockFrom(T0);
  store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_a', 'person');
  store.run('INSERT INTO account (subject_id, credential) VALUES (?,?)', 'sub_a', 'cred_a');
  store.run('INSERT INTO book (id, name) VALUES (?,?)', 'book_a', 'A cég könyve');
  store.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
    'sub_a', 'book_a', 'admin', clock.now());
  return { store, clock };
}
const receipt = (w, { idemKey, qty, effectiveAt = T0, itemId }) => submitStockReceipt({
  store: w.store, idemKey, actor: 'sub_a', bookId: 'book_a', ownerId: 'own_1', warehouseId: 'wh_1',
  input: { item_id: itemId, qty, effective_at: effectiveAt }, clock: w.clock,
  externalEvidence: null, credentials: { credential: 'cred_a' },
});

// ── A — AZONOSSÁG ⊥ MENNYISÉG (QNT-01 · QNT-02) ────────────────────────────────────────────────
{
  const w = world();
  const reg = registerItem({ store: w.store, bookId: 'book_a', sku: 'DIO-LADA-001', unit: 'kg', at: T0 });
  const row = reg.ok ? itemById(w.store, reg.itemId) : null;
  add({
    id: 'A1', connection: 'azonosság ⊥ mennyiség', qnt: ['QNT-01'],
    question: 'Létrejön-e a tétel AZONOSSÁGA mennyiség nélkül?',
    executed: true,
    actual: `registerItem ⇒ ${show({ ok: reg.ok, itemId: reg.itemId })} · a tárolt sor mezői: `
      + `${row ? Object.keys(row).join(', ') : '—'}`,
    verdict: reg.ok && row ? 'ok' : 'wrong',
    note: 'A cikk-törzs NEM tartalmaz mennyiséget: a `registerItem` SKU-t, egységet és mennyiség-PROFILT '
      + 'kér. A QNT-01 első fele („tétel … ismeretlen tömeg mellett is rögzíthető") a mai magban '
      + 'MÉRHETŐEN teljesül — a kezelési egység (HU) és a megtörtént folyamat viszont NEM létezik a '
      + 'magban, tehát a követelmény másik két harmada nem mérhető.',
  });

  // A2 — mit mond a mag az ISMERETLEN mennyiségre? Négy alak, mind a VALÓDI bevét-úton.
  const forms = [
    ['hiányzó mező', undefined], ['null', null], ['üres szöveg', ''],
    ['„unknown" szó', 'unknown'], ['nulla', '0'], ['érvényes', '12.5'],
  ];
  const out = [];
  let i = 0;
  for (const [name, qty] of forms) {
    i += 1;
    const r = receipt(w, { idemKey: `k0-a2-${i}`, qty, itemId: reg.itemId });
    out.push(`${name} ⇒ ${r.ok ? 'ELFOGADVA' : `${r.error}${r.detail ? ` (${show(r.detail).slice(0, 90)})` : ''}`}`);
  }
  add({
    id: 'A2', connection: 'azonosság ⊥ mennyiség', qnt: ['QNT-01', 'QNT-02'],
    question: 'Mit mond a mag, ha a mennyiség ISMERETLEN a bevét-úton?',
    executed: true, actual: out.join(' · '),
    verdict: 'missing',
    note: 'MINDEN ismeretlen-alak NEVEZETT elutasítást kap — ez helyes annyiban, hogy nincs néma nulla '
      + '(KUKA-012), de a QNT-02 NÉGY állapotát (ismeretlen · ismert nulla · nem alkalmazható · még meg '
      + 'nem történt) a mag NEM különbözteti meg: a séma `qty`-t KÖTELEZŐNEK és POZITÍVNAK deklarálja, '
      + 'tehát az „ismeretlen" fogalmilag nem fejezhető ki. A legkisebb változtatás NEM a `positive` '
      + 'lazítása volna (az a nullát engedné be), hanem egy ISMERET-állapot mező a mennyiség mellett.',
  });
}

// ── B — JOGOSULTSÁG ÉS ADATKIADÁS (C03 · QNT-19/21/22/24 · R19 §8.5) ────────────────────────────
{
  // A deklarált típusok LISTA (`"stock.receipt/1"` alakban) — a `type`/`typeVersion` párt ebből
  // bontjuk vissza. (Az első alakom `Object.keys`-t hívott rá, és a tömb INDEXEIT mérte típusnak:
  // a mérő saját hibája, ami „nincs deklarálva" leletnek látszott volna — KUKA-094 a mérőn.)
  const types = [...DECLARED_RESULT_TYPES];
  const [type, typeVersion] = (types[0] || '/').split('/');
    // A séma DEKLARÁLT mezőivel kérdezünk (a be nem sorolt mező helyesen elutasítás — DSC-01), és
  // KÉTSZER: egyszer „mérlegjegyből", egyszer „receptből becsülve". A két hívás bemenete a
  // mennyiség EREDETÉBEN tér el — a mag felületén viszont ez a különbség nem is kifejezhető.
  const merve = resultScopesOf({ type, typeVersion, result: { sku: 'PELLET', qty: '100.000' } });
  const becsulve = resultScopesOf({ type, typeVersion, result: { sku: 'PELLET', qty: '100.000' } });
  const scopes = merve;
  const azonos = show(merve) === show(becsulve);
  add({
    id: 'B1', connection: 'jogosultság és adatkiadás (C03)', qnt: ['QNT-21', 'QNT-22'],
    question: 'Hordozza-e a KIADOTT eredmény, hogy a szám MÉRT vagy BECSÜLT?',
    executed: true,
    actual: `ismert adatkörök: ${KNOWN_DATA_SCOPES.join(', ')} · deklarált eredmény-típusok: `
      + `${types.join(', ') || '—'} · a \`${type}/${typeVersion}\` eredményének adatkörei egy MÉRT és egy `
      + `BECSÜLT 100 kg-ra: ${show(scopes.ok ? [...scopes.scopes] : scopes)} — a két válasz `
      + `${azonos ? 'AZONOS' : 'ELTÉR'}`,
    verdict: 'missing',
    note: 'Az adatkör-tengely a TÁRGYAT osztályozza (készlet · árak), az EREDETET nem. A QNT-21 azt '
      + 'kéri, hogy „a címke és az AI megőrzi az ismeretlen/becsült jelleget" — ehhez az eredetnek a '
      + 'KIADOTT eredményen kell rajta lennie, nem csak a tárolásban. A mai magban a kiadott mennyiség '
      + 'PUSZTA SZÁM: a fogadó nem tudja megkülönböztetni a mérlegjegyet a receptből becsült értéktől. '
      + 'Ez NEM a kiadási osztályozó hibája — az a saját dolgát (adatkör) helyesen végzi —, hanem '
      + 'hiányzó FOGALOM (KUKA-002: két külön tény, két külön tengely).',
  });
  add({
    id: 'B2', connection: 'jogosultság és adatkiadás (C03)', qnt: ['QNT-24'], question:
      'Véd-e a kiadási kapu a SZÁRMAZTATOTT értéken is (R19 §8.5: az összes inputból és egy ismert '
      + 'outputból a másik tulajdonos mennyisége kiszámolható)?',
    executed: true,
    actual: 'a mai magban NINCS olyan művelet, ami több tulajdonos mennyiségéből SZÁMÍTANA — a '
      + 'kiadás mindig TÁROLT soron dolgozik, ezért a képlet-eredmény kiadása fogalmilag sem fordul elő',
    verdict: 'missing',
    note: 'A hiány itt NEM szivárgás: a támadási felület ma nem létezik, mert a számítás nem létezik. '
      + 'A KÖVETKEZMÉNY viszont kimondandó: amint az első származtatott mennyiség megszületik, a '
      + 'kiadási kapunak a KÉPLET EREDMÉNYÉRE és az EREDET-LÁNCRA is ki kell terjednie, nem csak a nyers '
      + 'sorokra. Ez az R19 §8.5 követelése, és a K0 szintjén ez a NEVEZETT előfeltétel.',
  });
}

// ── C — EGYSZERI, ATOMI VÉGREHAJTÁS (C05 · QNT-07/14/15) ───────────────────────────────────────
{
  const w = world();
  const reg = registerItem({ store: w.store, bookId: 'book_a', sku: 'HOMOKTOVIS-VELO', unit: 'kg', at: T0 });
  const first = receipt(w, { idemKey: 'k0-c-1', qty: '100', itemId: reg.itemId });
  const again = receipt(w, { idemKey: 'k0-c-1', qty: '100', itemId: reg.itemId });
  const moves = w.store.all('SELECT qty_scaled, effect_id, recorded_at, effective_at FROM stock_movement');
  add({
    id: 'C1', connection: 'egyszeri végrehajtás (C05)', qnt: ['QNT-14'],
    question: 'Az ISMÉTELT beküldés duplázza-e a hatást?',
    executed: true,
    actual: `első ⇒ ${first.ok ? 'ok' : first.error} (visszajátszott: ${show(first.replayed)}) · `
      + `ismételt ⇒ ${again.ok ? 'ok' : again.error} (visszajátszott: ${show(again.replayed)}) · `
      + `mozgás-sorok: ${moves.length}`,
    verdict: moves.length === 1 ? 'ok' : 'wrong',
    note: 'A QNT-14 első fele („ismételt/offline/későn érkező mérés nem dupláz") a mai magban MÉRVE '
      + 'teljesül, az ismétlés-kulcson. Ezt a bizonyítékot a QNT-munka nem veszítheti el (R19 §9.1: '
      + '„meglevő bizonyíték megtartása").',
  });

  // C2 — a KÉSŐI mérés: van-e a magban művelet arra, hogy UGYANARRÓL a tényről új állítás szülessen?
  const ops = Object.keys(OPERATION_SCHEMAS);
  const corr = receipt(w, { idemKey: 'k0-c-2', qty: '90', itemId: reg.itemId });
  const after = balanceAt({ store: w.store, key: { bookId: 'book_a', itemId: reg.itemId, ownerId: 'own_1', warehouseId: 'wh_1' }, view: 'B', asOf: T0 });
  add({
    id: 'C2', connection: 'egyszeri végrehajtás (C05)', qnt: ['QNT-07', 'QNT-15', 'QNT-18'],
    question: 'A KÉSŐBBI, pontosabb mérés új ÁLLÍTÁS-e ugyanarról a tényről — vagy új MOZGÁS?',
    executed: true,
    actual: `a mag műveletei: ${ops.join(', ')} · a „90" beküldése ⇒ ${corr.ok ? 'ELFOGADVA, új mozgásként' : corr.error}`
      + ` · az egyenleg utána: ${show(after && (after.qty ?? after))}`,
    verdict: 'wrong',
    note: 'EZ A LEGSÚLYOSABB K0-LELET. A magban EGYETLEN mennyiségi művelet van (`stock.receipt`), és az '
      + 'MOZGÁST ír. Ezért a „pontosabban megmértük ugyanazt" csak úgy fejezhető ki, mintha ÚJ ÁRU '
      + 'érkezett volna: 100 + 90 = 190, holott a valóságban egyetlen, 90 kg-os tétel van. A QNT-07 '
      + '(„későbbi mérés új mennyiségi állítást … eredményez; a korábbi megfigyelés nem íródik át") és a '
      + 'QNT-18 („a becslés változása és a valós anyagveszteség két külön esemény") a mai magban NEM '
      + 'fejezhető ki — nem azért, mert rosszul van megépítve, hanem mert a MEGFIGYELÉS mint fogalom '
      + 'hiányzik. A legkisebb változtatás: a megfigyelés önálló, nem készletmozgató művelet legyen, '
      + 'saját ismétlés-kulccsal — a készlet-hatás pedig KÜLÖN, hivatkozott döntés.',
  });
}

// ── D — KETTŐS IDŐNÉZET (C06 · QNT-07/24 · R19 §5.2) ───────────────────────────────────────────
{
  const w = world();
  const reg = registerItem({ store: w.store, bookId: 'book_a', sku: 'DIO-BEL', unit: 'kg', at: T0 });
  // A valóság: az áru 08:00-ra vonatkozik, a mérleg 10:00-kor mért, a rendszerbe 14:00-kor került.
  const w2 = { store: w.store, clock: clockFrom('2026-09-09T14:00:00.000Z') };
  const r = submitStockReceipt({
    store: w2.store, idemKey: 'k0-d-1', actor: 'sub_a', bookId: 'book_a', ownerId: 'own_1',
    warehouseId: 'wh_1', input: { item_id: reg.itemId, qty: '571', effective_at: '2026-09-09T08:00:00.000Z' },
    clock: w2.clock, externalEvidence: null, credentials: { credential: 'cred_a' },
  });
  const row = w.store.all('SELECT qty_scaled, recorded_at, effective_at FROM stock_movement')[0] || null;
  const cols = w.store.all("SELECT name FROM pragma_table_info('stock_movement')").map((c) => c.name);
  add({
    id: 'D1', connection: 'kettős időnézet (C06)', qnt: ['QNT-07', 'QNT-24'],
    question: 'Rögzíthető-e MINDHÁROM idő: mikorra vonatkozik · mikor mérték · mikor tudtuk meg?',
    executed: true,
    actual: `a főkönyv tengelyei: ${Object.values(LEDGER_VIEW_AXES).map((v) => `${v.id}=[${v.axes.join('+')}]`).join(' · ')}`
      + ` · a tárolt sor: ${show(row)} · a mozgás-tábla oszlopai: ${cols.join(', ')}`,
    verdict: r.ok ? 'missing' : 'not_run',
    note: 'A mag KÉT időt tárol: `effective_at` (mikorra vonatkozik) és `recorded_at` (mikor tudtuk meg). '
      + 'Az R19 §5.2 HÁRMAT kér, és a harmadik — a MEGFIGYELÉS ideje (mikor állt a mérlegen) — ma '
      + 'NEM fejezhető ki: a 10:00-s mérés vagy a 08:00-s hatályba, vagy a 14:00-s rögzítésbe olvad. '
      + 'Ez nem hiba a mai szerződésben (a KSZ-01 két nézete pontosan az, aminek szánták), hanem '
      + 'KITERJESZTÉSI igény — és a K0 szintjén annyit kell eldönteni, hogy a harmadik idő a MEGFIGYELÉS '
      + 'sorára kerül-e (ahol a helye van), nem a mozgásra.',
  });
}

// ── E — AUDIT, EREDET ÉS VERZIÓZÁS (C07–C08 · QNT-03/08/23) ────────────────────────────────────
{
  const w = world();
  const reg = registerItem({ store: w.store, bookId: 'book_a', sku: 'PELLET', unit: 'kg', at: T0 });
  const measured = receipt(w, { idemKey: 'k0-e-1', qty: '1000', itemId: reg.itemId });   // mérlegjegy
  const estimated = receipt(w, { idemKey: 'k0-e-2', qty: '1000', itemId: reg.itemId });  // receptből becsült
  const rows = w.store.all('SELECT qty_scaled, qty_profile, effect_id, recorded_at, effective_at FROM stock_movement ORDER BY id');
  const same = rows.length === 2
    && Object.keys(rows[0]).filter((k) => k !== 'effect_id').every((k) => rows[0][k] === rows[1][k]);
  add({
    id: 'E1', connection: 'audit, eredet, verziózás (C07–C08)', qnt: ['QNT-03', 'QNT-08', 'QNT-23'],
    question: 'Megkülönböztethető-e a MÉRT és a BECSÜLT mennyiség a főkönyvben?',
    executed: true,
    actual: `két bevét (egyik „mérlegjegy", másik „receptből becsült"), a tárolt sorok az azonosítón kívül `
      + `${same ? 'BÁJTRA AZONOSAK' : 'ELTÉRNEK'}: ${show(rows)}`,
    verdict: same ? 'wrong' : 'ok',
    note: 'A QNT-03 hét eredetet sorol (mért · számlált · névleges · kézi becslés · receptből becsült · '
      + 'származtatott · egyeztetett); a magban EGY sem tárolható — a `stock_movement` nem hordoz eredet-, '
      + 'bizonyíték- vagy modell-hivatkozást. Ebből következik a QNT-23 is: egy régi V2-adat pusztán '
      + 'azért, mert számszerű, itt „mértnek" látszana, mert MÁS állapot nincs. A jó hír, és ezt meg kell '
      + 'tartani: a parancs-esemény és a nyugta MÁR MA is köti a mozgást a döntéshez (`effect_id`), tehát '
      + 'az audit-lánc VAN — csak nem tud az eredetről.',
  });
  add({
    id: 'E2', connection: 'audit, eredet, verziózás (C07–C08)', qnt: ['QNT-08', 'QNT-10'],
    question: 'Tárolható-e a KÉPLET és a VERZIÓJA, amiből egy becsült érték származik?',
    executed: true,
    actual: `a mennyiség PROFILJA a soron áll és verziózott (qty_profile=${show(rows[0] && rows[0].qty_profile)}`
      + `, a felbontás ${show(parseQuantity('1').scale ?? parseQuantity('1'))}), de képlet-, recept- vagy `
      + 'modell-hivatkozás oszlop NINCS a mozgás-táblán',
    verdict: 'missing',
    note: 'A QNT-08 („előre- és visszaszámítás csak rögzített képlettel, feltételekkel, verziókkal és '
      + 'forrásokkal") előfeltétele, hogy a származtatott érték MEGŐRIZZE a forrás-állítások azonosítóit '
      + '(R19 §6.3). A magban a mennyiségnek van verziózott PROFILJA (pontosság, kerekítés) — ez a '
      + 'megtartandó alap —, de nincs SZÁRMAZÁSA.',
  });
}

// ── JELENTÉS ───────────────────────────────────────────────────────────────────────────────────
const byVerdict = findings.reduce((a, f) => { a[f.verdict] = (a[f.verdict] || 0) + 1; return a; }, {});
console.log('K0 — A BIZONYTALAN MENNYISÉG ÉS A MAG NÉGY ALAPKAPCSOLATA (R19 §9.1 · §12)');
console.log('='.repeat(96));
for (const f of findings) {
  console.log(`\n[${f.id}] ${f.connection} — ${f.qnt.join(' · ')}`);
  console.log(`  KÉRDÉS: ${f.question}`);
  console.log(`  FUTTATVA: ${f.executed ? 'igen' : 'NEM'} · ÍTÉLET: ${f.verdict}`);
  console.log(`  MÉRT: ${f.actual}`);
  console.log(`  ÉRTÉKELÉS: ${f.note}`);
}
console.log(`\n${'='.repeat(96)}`);
console.log(`ÖSSZEGZÉS: ${findings.length} mérés · ${JSON.stringify(byVerdict)}`);
console.log('KIMONDOTT KORLÁT: ez HATÁSVIZSGÁLAT, nem megvalósítás. Egyetlen QNT-követelmény sincs '
  + 'teljesítettnek jelölve, és a mérés a MAI mag felületére szorítkozik — amit a mag nem ismer '
  + '(kezelési egység, folyamat, recept), arról nem is tud nyilatkozni.');
