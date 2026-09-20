#!/usr/bin/env node
// ADAPTÁCIÓ R63 (repó-helyi program, közvetlenül szerkesztve · forrás: CMD-VS-300-002-002 R63 §4,
// `v3ref/source-documents/R63_board_v1.md`): a próba-világ bírálói hatásköre (`judge` → suspend ·
// alter_right · adjudicate az `a` könyvön) a VÉDETT RENDSZERÜZEMELTETŐI KIINDULÓ SZABÁLY alatt születik —
// `grantAdjudicationAuthority(…)` helyett `grantPlatformReviewAuthority({store,clock,subjectId,bookId,operation})`
// (`../platformRule.mjs`, PRL-01), UGYANAZOKKAL az argumentumokkal: az rögzíti a könyv platformbírálói
// alapját (könyvenként egyszer, idempotensen — a három művelet ugyanazt az alapot kapja), és AZ ALATT ad.
// A hívás `.ok`-ját a fixtúra ELLENŐRZI, és bukásnál az INDOKKAL dob, hogy egy fixtúra-hiba nevezett
// hibaként jelenjen meg, ne néma „nem"-ként (KUKA-020).
//
// MIÉRT: az R63 két szabályt szigorított a magreferenciában. (A) `grantAdjudicationAuthority`
// (`adjudication.mjs`) alap NÉLKÜL DOB (`basis_id_required`), és `authorityRowAt` (`authority.mjs`) az
// alap nélküli (`basis_id` NULL) hatáskör-sort NEM használja (`authority_without_recorded_basis`) —
// „Bírálati/felülvizsgálati hatáskör: nevezett, erre jogosult delegáló vagy külön védett
// rendszerüzemeltetői kiinduló szabály kell." (B) `redeemInvite` (`invite.mjs` 3/b · `basisLimit.mjs`
// `redemptionLimitGate`) az `invite_basis` pecsét nélküli meghívót elutasítja (`invite_without_basis`,
// `no_declared_basis`). Ez a program az R63 ELŐTT született, és a `world()` fixtúrája alap NÉLKÜL adott
// hatáskört — ezért az R63 után NEM IS JUTOTT EL az első kérdésig: a `grantAdjudicationAuthority` már az
// első eset fixtúrájában kezeletlen kivétellel dobott (mérve: `basis_id_required`, kilépés 1, a JSON
// összesítő — passed/failed — meg sem született). A piros tehát ELAVULT ELŐFELTÉTEL, nem a mért
// tulajdonság (a mennyiség ALAKJA) kudarca és nem termékhiba — és NEM nevezzük visszamenőleg zöldnek:
// a szigorítás marad, a TESZT-ELŐFELTÉTEL változik.
//
// A (B) SZABÁLY ERRE A PROGRAMRA NEM VONATKOZIK, KIMONDVA: meghívót nem ír és nem vált be.
//
// AMI NEM VÁLTOZOTT: egyetlen eset-azonosító (a hét ellenpár: r77·F02 · r79core·P01 · r79core·P07 ·
// r81core·P01 · r81core·F04 before/after/cross), elvárás (szám ⇒ `result_shape_type_mismatch` ·
// szöveg ⇒ elfogadva), óra (T · END · LATE és az F04 `cross` lépő órája), negatív ág, a nyers
// `subject_ban`-írás (`ban` — SZÁNDÉKOS, a tiltás-tényt állítja elő, nem hatáskört ad), a P07 nyers
// `revoked_at` UPDATE-je, a kimeneti alak és a kilépési szerződés sem. A platformszabály a rendszer
// SAJÁT íróin megy (recordAuthorityBasis · grantAdjudicationAuthority), tehát a megadási kapu is fut —
// nem kiskapu, hanem a GPR-01 `measurement_fixture` használat. A már nem hívott
// `grantAdjudicationAuthority` behúzása kikerült (holt behúzás nem marad — KUKA-050).
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
import { grantPlatformReviewAuthority } from '../platformRule.mjs';
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
      // ADAPTÁCIÓ R63: a hatáskör a védett platformszabály alatt, UGYANAZOKKAL az argumentumokkal; a
      // bukás nevezett indokkal DOB, hogy fixtúra-hiba ne látsszon néma „nem"-nek (KUKA-020).
      const g = grantPlatformReviewAuthority({ store, clock, subjectId: 'judge', bookId: 'a', operation });
      if (!g.ok) throw new Error(`platform review basis: ${g.reason}`);
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
