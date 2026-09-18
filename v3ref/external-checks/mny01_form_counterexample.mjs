#!/usr/bin/env node
/** MNY-FORM-01 — A HÉT PIROS ESET OKÁNAK ELLENPÁRJA (R32 §B2).
 *
 * MIÉRT VAN. A külső lánc három programja (r77 · r79core · r81core) ma HÉT eseten piros. Az R13 lap
 * 9/a szakasza ezt már megnevezte: a programjaik a mennyiséget JSON-SZÁMKÉNT adják át, a kiadási
 * osztályozó viszont az MNY-01 óta KANONIKUS DECIMÁLIS SZÖVEGET követel. Az R32 §B2 viszont
 * kimondja: „Mindegyikhez konkrét bizonyíték kell. A kód változatlansága önmagában nem magyarázat."
 *
 * EZ A PROGRAM AZ A BIZONYÍTÉK. Minden bukó esetet KÉTSZER futtat, és a kettő között EGYETLEN dolog
 * különbözik: a mennyiség ALAKJA (`1` JSON-szám ⇄ `'1'` kanonikus decimális szöveg). Ha a szám-alak
 * NEVEZETT elutasítást ad, a szöveg-alak pedig ÁTMEGY, akkor a lelet nem termékhiba, hanem ELAVULT
 * ELVÁRÁS — és ezt nem a prózám mondja ki, hanem a mérés.
 *
 * AMIT NEM CSINÁL. A külső fél programjaihoz NEM nyúl (KUKA-054: ha a mérce a megvalósításhoz
 * igazodik, a mérés a saját előfeltevését igazolja vissza). Ez KÜLÖN program, saját néven; a
 * bájtazonos eredetiek változatlanok és továbbra is pirosak.
 *
 * Kilépési kód: 0, ha MINDEN eset a várt PÁRT adja (szám ⇒ elutasítva `result_shape_type_mismatch`
 * néven · szöveg ⇒ elfogadva). 1, ha bármelyik ág mást ad — akkor a diagnózis HAMIS, és a lelet
 * termékhiba (vagy más ok), nem elavult elvárás.
 */
import assert from 'node:assert/strict';
import { openStore, clockFrom } from '../store.mjs';
import { revokeMembership } from '../authz.mjs';
import { grantAdjudicationAuthority } from '../adjudication.mjs';
import { submitCommand, readCommandResult } from '../command.mjs';

const T = '2026-09-14T08:00:00.000Z', END = '2026-09-14T08:00:01.000Z', LATE = '2026-09-14T08:00:02.000Z';
const NUM = 1, TXT = '1';                     // az EGYETLEN különbség a két ág között

function world(fn) {
  const store = openStore(), clock = clockFrom(T);
  try {
    for (const s of ['judge', 'member']) store.run('INSERT INTO subject VALUES (?,?)', s, 'person');
    store.run('INSERT INTO book VALUES (?,?)', 'a', 'A');
    store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)', 'member', 'a', 'user', T);
    for (const operation of ['suspend', 'alter_right', 'adjudicate']) {
      grantAdjudicationAuthority({ store, clock, subjectId: 'judge', bookId: 'a', operation });
    }
    const ban = (kind, cause, target) => store.run(
      'INSERT INTO subject_ban(subject_id,kind,cause,target_ref,actor_subject_id,banned_at) VALUES(?,?,?,?,?,?)',
      'member', kind, cause, target, 'judge', T);
    return fn({ store, clock, ban });
  } finally { store.close(); }
}

// A HÉT ESET, a bukott eredetik SZERKEZETÉT követve — `q` a mennyiség alakja (szám vagy szöveg).
const CASES = [
  // r77 / F02: a kiadási hatókör nem szűri a MENNYISÉGET, csak az árat — a parancsnak át kell mennie.
  // FIGYELEM a SORRENDRE: az eredetiben a beküldés a tiltás ELŐTT áll — az első alakom ezt
  // felcserélte, és `not_available`-t mért. A saját próba hibája nem a termék hibája (KUKA-054).
  ['r77 · F02-data-scope-context-does-not-filter-price-result', q => world(({ store, clock, ban }) => {
    const s = submitCommand({ store, clock, actor: 'member', bookId: 'a', idemKey: 'price',
      type: 'stock.receipt', typeVersion: '1', declared: { qty: q }, resolve: () => ({ qty: q, unit_price: 12345 }) });
    if (!s.ok) return s;                       // a bukás ITT dől el — pont ez a mért lelet
    ban('data_scope', 'data_scope_withdrawn', 'arak');
    return s;
  })],
  // r79core / P01: lapos mennyiség, kiadási hatókörrel — a beküldésnek ÉS az olvasásnak is mennie kell.
  ['r79core · P01-flat-quantity', q => world(({ store, clock, ban }) => {
    ban('data_scope', 'data_scope_withdrawn', 'arak');
    const s = submitCommand({ store, clock, actor: 'member', bookId: 'a', idemKey: 'x',
      type: 'stock.receipt', typeVersion: '1', declared: { qty: q }, resolve: () => ({ qty: q }),
      credentials: { dataScope: 'keszlet' } });
    return s.ok ? readCommandResult({ store, clock, requester: 'member', actor: 'member', bookId: 'a',
      idemKey: 'x', credentials: { dataScope: 'keszlet' } }) : s;
  })],
  // r79core / P07-before: a tagság VISSZAVONÁSA a parancs UTÁN hatályos — a parancsnak át kell mennie.
  ['r79core · P07-command-before', q => world(({ store }) => {
    store.run('UPDATE membership SET revoked_at=?', END);
    return submitCommand({ store, clock: clockFrom(T), actor: 'member', bookId: 'a', idemKey: 'time-control',
      type: 'stock.receipt', typeVersion: '1', declared: { qty: q }, resolve: () => ({ qty: q }) });
  })],
  // r81core / P01: a mennyiség a tömb ELEMÉBEN áll — a séma oda is szól (R79/F01).
  ['r81core · core/P01-pure-lines', q => world(({ store, clock }) => submitCommand({ store, clock,
    actor: 'member', bookId: 'a', idemKey: 'lines', type: 'stock.receipt', typeVersion: '1',
    declared: { qty: q }, resolve: () => ({ lines: [{ qty: q }] }) }))],
];
// r81core / F04 — ugyanaz a beküldés HÁROM idő-állásban; a szabadítás ideje a parancs UTÁN van.
for (const mode of ['before', 'after', 'cross']) {
  CASES.push([`r81core · core/F04-release-time-${mode}`, q => world(({ store, clock }) => {
    let n = 0;
    const c = mode === 'before' ? clockFrom(T) : mode === 'after' ? clockFrom(LATE)
      : { now: () => (++n === 1 ? T : LATE) };
    const r = submitCommand({ store, clock: c, actor: 'member', bookId: 'a', idemKey: 'x',
      type: 'stock.receipt', typeVersion: '1', declared: { qty: q }, resolve: () => ({ qty: q }) });
    void clock; return r;
  })]);
}

const out = [];
for (const [id, run] of CASES) {
  const num = run(NUM), txt = run(TXT);
  // A SZÁM-ág elutasítása NEVEZETT legyen: a néma bukás nem bizonyítja a diagnózist (KUKA-020).
  const numRejectedByForm = num.ok === false && num.reason === 'result_shape_type_mismatch';
  const txtAccepted = txt.ok === true;
  const pass = numRejectedByForm && txtAccepted;
  out.push({ id, pass,
    number_form: { ok: num.ok, error: num.error ?? null, reason: num.reason ?? null },
    canonical_text_form: { ok: txt.ok, error: txt.error ?? null, reason: txt.reason ?? null },
    verdict: pass ? 'elavult elvárás — a termék a szerződés szerint viselkedik'
      : 'NEM igazolt: a diagnózis ezen az eseten nem áll' });
}
const failed = out.filter(x => !x.pass).length;
console.log(JSON.stringify({
  probe: 'MNY-FORM-01',
  question: 'A hét piros eset oka a mennyiség ALAKJA (JSON-szám vs kanonikus decimális szöveg)?',
  only_difference: 'qty: 1 (JSON-szám)  ⇄  qty: "1" (kanonikus decimális szöveg)',
  contract: 'MNY-01 (R8 §2) + a séma a BEÁGYAZOTT alakra és a tömb ELEMEIRE is szól (R79/F01)',
  not_measured: 'ez a program a külső fél programjaihoz NEM nyúl; az eredetiek bájtazonosak és pirosak maradnak',
  cases: out, passed: out.length - failed, failed,
}, null, 2));
process.exitCode = failed ? 1 : 0;
