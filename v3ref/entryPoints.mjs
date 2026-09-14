// V3 MAGREFERENCIA — ENT-01: A BELÉPÉSI PONTOK KONTEXTUS-BEKÖTÉSE (R79/F03).
//
// ═══ A LELET, ÉS MIÉRT NEM ELÉG EGY EGYSOROS JAVÍTÁS ════════════════════════════════════════════
//
// A külső tárgyaló fél mérése (R79/F03): a `revokeMembership` nem vette át és nem adta tovább a
// `credentials` paramétert. A judge RÉGI hitelesítőjére szóló tiltás mellett a HELYES, MÁSIK
// hitelesítővel kezdeményezett megvonás is `ban_target_undecidable`-re futott. Ez TÚLZÁRÁS, nem
// szivárgás: a tiltás-feloldó helyesen jelezte, hogy a kérés nem hordozza a megkülönböztetőt — a
// HÍVÓ ejtette el a kontextust.
//
// A javítás maga egy paraméter. A TANULSÁG viszont a mérésről szól, és ezt ők ki is mondták:
//
//   *„a közös feloldó helyessége nem bizonyítja az összes hívó paraméterátadását."*
//
// Pontosan ez a KUKA-039 („fél őr") alakja a BEKÖTÉS terében, és a saját, egy körrel korábbi
// javításomon ismétlődött: az R77/F01-ben ÉN kötöttem be a `revokeMembership`-et a közös
// hatályosulási pontra (EFF-01) — és épp a `credentials` maradt le, miközben a négy testvér-út
// (readClaim · adjudicateClaim · suspendMembership · liftSuspension) az R75/F05 óta átadja.
//
// Eddig a `banMatrix.mjs` az ENGEDŐ UTAKAT mérte (tagsági · hatásköri · kiadási), a FELOLDÓKON
// keresztül. Az a mérés a hatókör-szabályt bizonyítja — de a feloldó hívása és a BELÉPÉSI PONT
// hívása két külön dolog: a feloldó akkor is helyesen dönt, ha a belépési pont üres kézzel hívja.
// Ezért ez a modul MÁS tengelyen mér: az EXPORTÁLT ÍRÓ BELÉPÉSI PONTOKAT hívja végig, azzal a
// kontextussal, amit egy valódi hívó adna át.
//
// ═══ MIT MÉR EGY SOR ════════════════════════════════════════════════════════════════════════════
//
// belépési pont × kontextus-tengely × (matching | other | absent)
//
//   `matching`  a tiltott értéket hozza    ⇒ ZÁR          (a tiltás megfogja)
//   `other`     MÁSIK, jogos értéket hoz   ⇒ NEM ZÁR      ← EZ az ellenpár, ezt buktatta az R79/F03
//   `absent`    nem hozza                  ⇒ NEM DÖNTHETŐ (zár, de NEVEZETTEN — KUKA-020)
//
// A tengelyek nem lemásolva állnak itt, hanem a `banScope` zárt halmazából SZÁRMAZNAK (KUKA-051: a
// hatókör SZABÁLY, nem lista) — egy új, kontextus-hordozó tiltás-fajta magától bekerül a mérésbe.
//
// ═══ A BESOROLÁS SZAVAI — ÉS EGY SAJÁT LELET A MÉRÉS ELSŐ FUTÁSÁN ═══════════════════════════════
//
// Ugyanaz a három szó, amit a tiltás-mátrix használ (`open` · `blocked` · `undecidable`), mert
// ugyanarról a tényről beszélünk.
//
// AZ ELSŐ ALAKOM A VÁLASZ OKÁT olvasta (`ban_*` előtag ⇒ zár). A mérés első futása 60-ból NYOLC
// „eltérést" adott, MIND az `adjudicateClaim` úton — és a KÓD volt a helyes, az ÉN MÉRŐM a hibás:
// az elbírálási út SZÁNDÉKOSAN semleges választ ad (`{ok:false, error:'not_available'}`, R67/F02),
// hogy a nemleges válasz ne árulja el, létezik-e az ügy és miért nem járható. A tiltás rendben
// megfogta (az ügy állapota `received` maradt) — csak épp NEM MONDTA MEG, és pont ez a dolga.
//
// Ha a mérésem kedvéért „beszédessé" tenném ezt az utat, egy BIZTONSÁGI tulajdonságot rontanék el
// egy mérőeszköz kényelméért (KUKA-049: az őr a kért eredményt jelentette kudarcnak; KUKA-088: ne
// fagyassz be egy ellenőrzést a helyesség kedvéért). Ezért a besorolás a HATÁSBÓL jön:
//
//   · minden belépési pont KIMONDJA, mi a megfigyelhető HATÁSA (`effect`) — az változik meg, ha az
//     írás megtörtént;
//   · a `named` válaszú utakon a hatás MELLETT a nevezett ok is mérve van (zár vs. nem dönthető);
//   · a `neutral` válaszú úton a kettő kívülről MEGKÜLÖNBÖZTETHETETLEN — és ez nem hiányosság,
//     hanem KÖVETELMÉNY: a próba azt is méri, hogy a két válasz BÁJTAZONOS (KUKA-084: a szivárgás
//     kijárata nem hely, hanem CSATORNA — a mondat MEGLÉTE is csatorna).

import { openStore, clockFrom } from './store.mjs';
import { KNOWN_BAN_KINDS, KNOWN_BAN_CAUSES, banKind, kindForCause } from './banScope.mjs';
import { issueBan } from './ban.mjs';
import { revokeMembership } from './authz.mjs';
import {
  grantAdjudicationAuthority, suspendMembership, liftSuspension, submitClaim, adjudicateClaim,
} from './adjudication.mjs';

const T0 = '2026-09-14T08:00:00.000Z';

/** A belépési kontextus tengelyei — a `banRequestFor` ugyanezeket veszi át (egy igazság). */
export const CONTEXT_AXES = Object.freeze(['credentialId', 'sessionId', 'basisId', 'dataScope']);

/** A HÁROM kontextus-állapot, névvel. A harmadik nem „nem", hanem „nem tudom" (KUKA-020). */
export const CONTEXT_MODES = Object.freeze(['matching', 'other', 'absent']);

/**
 * MELY TILTÁS-FAJTÁK HORDOZZÁK A MEGKÜLÖNBÖZTETŐT A BELÉPÉSI KONTEXTUSBAN — SZÁRMAZTATVA.
 * Nem lista: a `banScope` fajta-táblájából jön, tehát új fajta magától mérve lesz (KUKA-051).
 */
export function contextCarriedKinds() {
  return Object.freeze(KNOWN_BAN_KINDS
    .filter((k) => CONTEXT_AXES.includes(banKind(k)?.discriminator))
    .map((k) => Object.freeze({
      kind: k,
      axis: banKind(k).discriminator,
      cause: KNOWN_BAN_CAUSES.find((c) => kindForCause(c) === k) || null,
    })));
}

// ── A VILÁG ─────────────────────────────────────────────────────────────────────────────────────
//
// EGY világ, minden belépési ponthoz ugyanaz az alap: két alany (eljáró + érintett), egy könyv,
// tagság, és az eljárónak mind a három hatáskör. A tiltás az ELJÁRÓRA szól — mert a kérdés az,
// hogy az ELJÁRÓ kontextusa eljut-e a döntésig.
function world() {
  const store = openStore();
  const clock = clockFrom(T0);
  store.run('INSERT INTO book (id, name) VALUES (?,?)', 'book_a', 'A könyv');
  for (const s of ['sub_eljaro', 'sub_erintett']) store.run('INSERT INTO subject (id, kind) VALUES (?,?)', s, 'person');
  for (const s of ['sub_eljaro', 'sub_erintett']) {
    store.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
      s, 'book_a', 'user', T0);
  }
  for (const op of ['suspend', 'alter_right', 'adjudicate']) {
    grantAdjudicationAuthority({ store, subjectId: 'sub_eljaro', bookId: 'book_a', operation: op, clock });
  }
  return { store, clock };
}

/**
 * AZ EXPORTÁLT ÍRÓ BELÉPÉSI PONTOK — azok, amelyek a közös hatályosulási ponton (EFF-01) mennek át.
 *
 * Minden bejegyzés KIMONDJA, melyik modul melyik exportját hívja, és az `invoke` PONTOSAN úgy hívja,
 * ahogy egy valódi hívó tenné: a `credentials` a hívás paramétere, nem globális állapot. A `setup`
 * az adott úthoz szükséges előfeltételt írja meg (pl. az elbíráláshoz kell egy ügy).
 *
 * Ha ide új író kerül, a padló (ENT_FLOOR) és a próba magától számon kéri — a néma zsugorodás piros.
 */
export const WRITER_ENTRY_POINTS = Object.freeze([
  Object.freeze({
    id: 'ban.issueBan',
    module: 'ban.mjs',
    exportName: 'issueBan',
    what: 'tiltás kiadása',
    answer: 'named',
    // A HATÁS: az eljáró által kiadott ÚJ tiltás-sor. A fixtúra-tiltást az eljáró magára adta ki,
    // ezért a célt is mérjük — különben a saját fixtúránkat számolnánk hatásnak.
    effect: ({ store }) => store.all(
      'SELECT id FROM subject_ban WHERE actor_subject_id = ? AND subject_id = ?', 'sub_eljaro', 'sub_erintett').length,
    invoke: ({ store, clock, credentials }) => issueBan({
      store, clock, subjectId: 'sub_erintett', cause: 'left_company', targetRef: 'book_a',
      actorSubjectId: 'sub_eljaro', bookId: 'book_a', credentials,
    }),
  }),
  Object.freeze({
    id: 'authz.revokeMembership',
    module: 'authz.mjs',
    exportName: 'revokeMembership',
    what: 'tagság megvonása',
    answer: 'named',
    effect: ({ store }) => store.get(
      'SELECT revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', 'sub_erintett', 'book_a')?.revoked_at ?? null,
    invoke: ({ store, clock, credentials }) => revokeMembership({
      store, clock, actorSubjectId: 'sub_eljaro', subjectId: 'sub_erintett', bookId: 'book_a', credentials,
    }),
  }),
  Object.freeze({
    id: 'adjudication.suspendMembership',
    module: 'adjudication.mjs',
    exportName: 'suspendMembership',
    what: 'tagság felfüggesztése',
    answer: 'named',
    effect: ({ store }) => store.all(
      'SELECT id FROM membership_suspension WHERE subject_id = ? AND book_id = ?', 'sub_erintett', 'book_a').length,
    invoke: ({ store, clock, credentials }) => suspendMembership({
      store, clock, actorSubjectId: 'sub_eljaro', subjectId: 'sub_erintett', bookId: 'book_a',
      reason: 'ENT-01 mérés', credentials,
    }),
  }),
  Object.freeze({
    id: 'adjudication.liftSuspension',
    module: 'adjudication.mjs',
    exportName: 'liftSuspension',
    what: 'felfüggesztés feloldása',
    answer: 'named',
    // ELŐFELTÉTEL: feloldani csak azt lehet, ami fel van függesztve. A fixtúra-felfüggesztést a
    // tiltás BEÍRÁSA ELŐTT tesszük be, tehát a mérés a feloldás útját méri, nem a felfüggesztését.
    setup: ({ store, clock }) => {
      suspendMembership({
        store, clock, actorSubjectId: 'sub_eljaro', subjectId: 'sub_erintett', bookId: 'book_a',
        reason: 'ENT-01 előfeltétel',
      });
      return {};
    },
    effect: ({ store }) => store.get(
      'SELECT lifted_at FROM membership_suspension WHERE subject_id = ? AND book_id = ? ORDER BY id DESC',
      'sub_erintett', 'book_a')?.lifted_at ?? null,
    invoke: ({ store, clock, credentials }) => liftSuspension({
      store, clock, actorSubjectId: 'sub_eljaro', subjectId: 'sub_erintett', bookId: 'book_a', credentials,
    }),
  }),
  Object.freeze({
    id: 'adjudication.adjudicateClaim',
    module: 'adjudication.mjs',
    exportName: 'adjudicateClaim',
    what: 'ügy elbírálása',
    // SEMLEGES VÁLASZ (R67/F02) — és ez KÖVETELMÉNY, nem hiányosság: a nemleges válasz nem árulhatja
    // el, létezik-e az ügy és miért nem járható. Ezért itt a besorolás a HATÁSBÓL jön, a próba pedig
    // azt is megköveteli, hogy a „zár" és a „nem dönthető" válasz BÁJTAZONOS legyen (KUKA-084).
    answer: 'neutral',
    setup: ({ store, clock }) => {
      submitClaim({
        store, clock, claimantRef: 'ENT-01', bookId: 'book_a', statement: 'mérés',
        intakeContext: { channel: 'test', source: 'synthetic' },
      });
      return { claimId: store.get('SELECT id FROM claim').id };
    },
    effect: ({ store }) => store.get('SELECT state FROM claim')?.state ?? null,
    invoke: ({ store, clock, credentials, prepared }) => adjudicateClaim({
      store, clock, actorSubjectId: 'sub_eljaro', claimId: prepared.claimId, decision: 'resolve', credentials,
    }),
  }),
]);

/**
 * PADLÓ — a néma zsugorodás ellen (KUKA-045: szabály, ahol lehet; padló, ahol szám kell).
 * Ma öt író megy át a közös hatályosulási ponton; ha ez CSÖKKEN, a próba pirosra megy.
 */
export const ENT_FLOOR = 5;

/**
 * A BESOROLÁS — a HATÁS az elsődleges tanú, a nevezett ok a pontosítás.
 *
 * `changed` = megtörtént-e az írás (a belépési pont saját `effect`-je szerint). Ha megtörtént, az
 * út NYITVA volt — bármit is mond a válasz. Ha nem, akkor a NEVEZETT válaszú utakon az ok
 * megkülönbözteti a „zár"-t a „nem dönthető"-től; a SEMLEGES válaszú úton ez kívülről nem
 * látszik — ott `withheld` a szó, és ez KIMONDOTT, nem elhallgatott korlát (KUKA-015).
 */
export function classifyEntryOutcome(out, { changed, answer }) {
  if (changed) return 'open';
  if (answer === 'neutral') return 'withheld';
  const reason = String(out?.reason || '');
  if (reason === 'ban_target_undecidable') return 'undecidable';
  if (reason.startsWith('ban_')) return 'blocked';
  // Nem történt írás, és nem a tiltás mondta — ez ÜZLETI nem, és NEM ugyanaz (KUKA-020).
  return 'other_no';
}

/** A VÁRT besorolás — a normából (REV-N5a/b), nem a mai kód olvasatából. */
export function expectedForMode(mode, answer) {
  if (mode === 'other') return 'open';
  if (answer === 'neutral') return 'withheld';
  return mode === 'matching' ? 'blocked' : 'undecidable';
}

/**
 * A MÉRÉS: minden belépési pont × minden kontextus-hordozó fajta × három állapot.
 *
 * Minden cella SAJÁT világot kap, mert az írók állapotot mozdítanak (a felfüggesztés/megvonás a
 * következő cella alapját írná át). A cellák száma kicsi (5 × 4 × 3 = 60), a világ olcsó
 * (`journal_mode=MEMORY`), tehát a mérés a saját idő-keretén belül marad (KUKA-140).
 *
 * @returns {{rows:Array, mismatches:Array, entry_points:number, axes:number}}
 */
export function measureEntryPointBinding() {
  const kinds = contextCarriedKinds();
  const rows = [];
  for (const ep of WRITER_ENTRY_POINTS) {
    for (const k of kinds) {
      for (const mode of CONTEXT_MODES) {
        const { store, clock } = world();
        try {
          const prepared = ep.setup ? ep.setup({ store, clock }) : {};
          store.run(
            `INSERT INTO subject_ban (subject_id, kind, cause, target_ref, actor_subject_id, banned_at)
             VALUES (?,?,?,?,?,?)`,
            'sub_eljaro', k.kind, k.cause, 'tiltott_ertek', 'sub_eljaro', T0);
          const before = ep.effect({ store });
          const credentials = mode === 'absent'
            ? undefined
            : { [k.axis]: mode === 'matching' ? 'tiltott_ertek' : 'masik_jogos_ertek' };
          const out = ep.invoke({ store, clock, credentials, prepared });
          const after = ep.effect({ store });
          const changed = after !== before;
          const actual = classifyEntryOutcome(out, { changed, answer: ep.answer });
          const expect = expectedForMode(mode, ep.answer);
          rows.push(Object.freeze({
            entry_point: ep.id, module: ep.module, export: ep.exportName, what: ep.what,
            answer: ep.answer, kind: k.kind, axis: k.axis, mode, expect, actual,
            match: actual === expect, changed,
            effect_before: before, effect_after: after,
            reason: out?.reason ?? null,
            // A SEMLEGES út válaszát SZÓ SZERINT megőrizzük, hogy a megkülönböztethetetlenség
            // mérhető legyen — nem a hiányából következtetünk rá (KUKA-038).
            answer_bytes: JSON.stringify(out ?? null),
          }));
        } finally {
          store.close();
        }
      }
    }
  }
  // A SEMLEGESSÉG MÉRÉSE: a `matching` és az `absent` válasz BÁJTAZONOS legyen minden semleges úton.
  // Ha eltérnek, a különbség maga hordozza a védett tényt (KUKA-084), akkor is, ha a szöveg „szép".
  const neutralLeaks = [];
  for (const ep of WRITER_ENTRY_POINTS.filter((e) => e.answer === 'neutral')) {
    for (const k of kinds) {
      const m = rows.find((r) => r.entry_point === ep.id && r.kind === k.kind && r.mode === 'matching');
      const a = rows.find((r) => r.entry_point === ep.id && r.kind === k.kind && r.mode === 'absent');
      if (m && a && m.answer_bytes !== a.answer_bytes) {
        neutralLeaks.push(Object.freeze({
          entry_point: ep.id, kind: k.kind, matching: m.answer_bytes, absent: a.answer_bytes,
        }));
      }
    }
  }
  return Object.freeze({
    rows: Object.freeze(rows),
    mismatches: Object.freeze(rows.filter((r) => !r.match)),
    neutral_leaks: Object.freeze(neutralLeaks),
    entry_points: WRITER_ENTRY_POINTS.length,
    axes: kinds.length,
    named_paths: WRITER_ENTRY_POINTS.filter((e) => e.answer === 'named').length,
    neutral_paths: WRITER_ENTRY_POINTS.filter((e) => e.answer === 'neutral').length,
  });
}
