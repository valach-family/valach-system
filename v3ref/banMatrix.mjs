// V3 MAGREFERENCIA — A TILTÁS-MÁTRIX MÉRÉSE (R73 §? · R75 §8, D-VS-3022).
//
// ═══ MIÉRT LÉTEZIK EZ A MODUL ═══════════════════════════════════════════════════════════════════
//
// A külső tárgyaló fél KÉTSZER kérte ugyanazt, és kétszer nem kapta meg bizonyított alakban:
//   *„Kérem az … értelmes tiltásfajta × engedő út × érintett/független cél × hiteles kontextus
//   mátrixot is: ez most sem készült el a riportban bizonyított alakban. A kiadási művelet maga is
//   szerepeljen a fogyasztók között."* (R75 §8)
//
// A kísértés az volna, hogy a mátrixot KÉZZEL rajzolom meg a kód olvasatából. Pontosan ezt tiltja a
// KUKA-082: amit kézzel írunk egy gépi állományból, azt a GÉPNEK kell visszamérnie — különben a lap
// és a rendszer két külön igazságot szül, némán. Ezért a mátrix NEM leírás, hanem MÉRÉS:
//
//   · minden CELLA egy valódi futás: valódi tároló, valódi tiltás-rekord, valódi jogfeloldó;
//   · a VÁRT értéket a cella DEKLARÁLJA (`expect`), és a mérés ehhez hasonlít — tehát a mátrix
//     önmagában is falszifikálható (a `P-REV-ban-matrix` próba pont ezt teszi);
//   · az ember-olvasható tábla ebből a FÜGGVÉNYBŐL származik (`renderBanMatrix`), nem mellette.
//
// ═══ A NÉGY TENGELY ═════════════════════════════════════════════════════════════════════════════
//
// (1) TILTÁS-FAJTA — mind a hét, a `banScope.mjs` zárt halmazából véve (nem lemásolva: KUKA-051, a
//     hatókör SZABÁLY, nem lista — új fajta magától bekerül, és ha nincs hozzá cella, PIROS).
//
// (2) ENGEDŐ ÚT — HÁROM, és a harmadik az R75/F01 lelete:
//       `membership`  a tagsági út (`rightAt`)
//       `authority`   a hatásköri/elbírálási út (`adjudicationRightAt`)
//       `issuing`     a KIADÁS maga (`issueBan`) — a külső fél kimondottan kérte, hogy szerepeljen:
//                     egy már letiltott eljáró NEM tilthat. Ez korábban HIÁNYZOTT a fogyasztók
//                     közül, és pont ezért tudott harmadik, őrizetlen úttá válni.
//
// (3) CÉL — ÉRINTETT vagy FÜGGETLEN. A „független" nem elméleti: a `left_company` okú tiltásnál a
//     másik könyvnek NYITVA kell maradnia, különben a tiltás általános zár lenne (KUKA-092). Az
//     alany-szintű fajtánál viszont NINCS független cél — ezt a cella KIMONDJA (`n/a`), nem
//     hallgatja el.
//
// (4) HITELES KONTEXTUS — a belépési kontextus (`credentialId` · `sessionId` · `basisId` ·
//     `dataScope`) HORDOZZA-e a megkülönböztetőt. Három állapot, nem kettő:
//       `matching`   a tiltott értéket hozza      ⇒ elér
//       `other`      egy MÁSIK, jogos értéket hoz ⇒ NEM ér el (ez az ellenpár)
//       `absent`     nem hozza                    ⇒ NEM DÖNTHETŐ, tehát ZÁR — de NEVEZETTEN
//     A harmadik állapot a KUKA-020 miatt külön oszlop: a „nem tudom" nem nézhet ki ugyanúgy, mint
//     a „nem".
//
// A cellák VÁRT értékei a normából (REV-N5a/b/c) következnek, nem a mai kód olvasatából — ezért ha
// a kód elcsúszik a normától, a mátrix PIROS lesz, nem „új igazságot" ír ki.

import { grantPlatformReviewAuthority } from './platformRule.mjs';
import { openStore, clockFrom } from './store.mjs';
import { rightAt } from './authz.mjs';
import { adjudicationRightAt, grantAdjudicationAuthority } from './adjudication.mjs';
import { issueBan, KNOWN_BAN_KINDS, KNOWN_BAN_CAUSES, kindForCause, banKind, operationScopeRef } from './ban.mjs';

const T0 = '2026-09-14T08:00:00.000Z';

export const PERMITTING_PATHS = Object.freeze(['membership', 'authority', 'issuing']);

// ── A FAJTÁK CELLA-TERVE ────────────────────────────────────────────────────────────────────────
//
// Minden fajtához megadjuk, MI az oka (ebből jön a fajta — REV-N5b), mi az ÉRINTETT és mi a
// FÜGGETLEN cél, és hogy a megkülönböztetőt a KÉRÉS tengelye hordozza-e (`request`) vagy a belépési
// KONTEXTUS (`credential`). Ez a különbség nem kozmetika: a kérés tengelyét a kontextus NEM írhatja
// át (KUKA-131), tehát a „hiteles kontextus" oszlop csak a kontextus-tengelyű fajtáknál értelmes.
const PLAN = Object.freeze([
  Object.freeze({
    kind: 'book', cause: 'left_company', axis: 'request',
    affected: { bookId: 'book_a' }, independent: { bookId: 'book_b' },
    target: 'book_a',
    note: 'kilépés egy cégből — a MÁSIK, független könyv joga érintetlen (R55 §7 korrekciója)',
  }),
  Object.freeze({
    kind: 'operation', cause: 'operation_misuse', axis: 'request',
    affected: { bookId: 'book_a', opClass: 'suspend' },
    independent: { bookId: 'book_b', opClass: 'suspend' },
    target: 'suspend',
    note: 'művelet-visszaélés — a tárolt cél a KÖNYVET IS hordozza (R75/F02), ezért a független '
      + 'könyvben ugyanaz a művelet nyitva marad',
  }),
  Object.freeze({
    kind: 'subject', cause: 'court_order_subject', axis: 'request',
    affected: { bookId: 'book_a' }, independent: null,
    target: null,
    note: 'bírósági végzés az ALANY ellen — nincs független cél: minden könyvön, minden úton hat',
  }),
  Object.freeze({
    kind: 'credential', cause: 'credential_compromised', axis: 'credential',
    affected: { credentialId: 'cred_tiltott' }, independent: { credentialId: 'cred_masik' },
    target: 'cred_tiltott',
    note: 'kompromittált hitelesítő — MINDEN könyvön tilt, de CSAK azzal a hitelesítővel',
  }),
  Object.freeze({
    kind: 'session', cause: 'session_hijack_suspected', axis: 'credential',
    affected: { sessionId: 'sess_tiltott' }, independent: { sessionId: 'sess_masik' },
    target: 'sess_tiltott',
    note: 'eltérített munkamenet — egy konkrét munkamenet, nem az ember',
  }),
  Object.freeze({
    kind: 'legal_basis', cause: 'mandate_withdrawn', axis: 'credential',
    affected: { basisId: 'megbizas_2026' }, independent: { basisId: 'megbizas_2025' },
    target: 'megbizas_2026',
    note: 'visszavont megbízás — ami azon a jogalapon nyugszik, az megszűnik; a másik jogalap él',
  }),
  Object.freeze({
    kind: 'data_scope', cause: 'data_scope_withdrawn', axis: 'credential',
    affected: { dataScope: 'arak' }, independent: { dataScope: 'keszlet' },
    target: 'arak',
    note: 'visszavont adatkör — egy adatkör tiltott, a többi nem',
  }),
]);

// ── MINDEN ÚT A SAJÁT MŰVELETÉT KÉRDEZI ─────────────────────────────────────────────────────────
//
// EZT AZ ELSŐ FUTÁS TANÍTOTTA MEG (és ez a modul értelme): a mátrix első alakja KÉT cellán
// „eltérést" mutatott az `operation` fajtánál — és a KÓD volt a helyes, az ELVÁRÁSOM a hibás.
// Az ok: a „cél érintett-e" kérdés művelet-tiltásnál NEM a tiltás tulajdonsága, hanem a tiltás
// célja és az adott ÚT SAJÁT MŰVELETE közötti VISZONY (KUKA-024). A tagsági út a `own_book`-ot
// kérdezi, a kiadási út az `alter_right`-ot — egy `suspend`-re szóló tiltás egyiket sem érinti,
// és ez HELYES. Ha az elvárást „javítottam" volna a mért értékre, a mátrix önmagát igazolta volna
// vissza (KUKA-054); ha a kódot igazítom az elváráshoz, a tiltás túlnyúlt volna (KUKA-092).
// Ezért a művelet NEVEZETT lett, és minden cella KIÍRJA, mit kérdezett.
const PATH_OP = Object.freeze({
  membership: 'own_book',        // a tagsági út művelet-osztálya
  authority: null,               // a hatásköri út a cella SAJÁT műveletét kérdezi (`req.opClass`)
  issuing: 'alter_right',        // a kiadás mindig jogváltoztatás
});

function opClassOf(plan, pathName, req) {
  if (pathName === 'authority') return (req && req.opClass) || 'suspend';
  return PATH_OP[pathName];
}

// ── A VÁRT ÉRTÉK — A NORMÁBÓL, NEM A KÓDBÓL ─────────────────────────────────────────────────────
/**
 * @returns {'blocked'|'open'|'undecidable'} mi KÖVETKEZIK a REV-N5a/b/c-ből erre a cellára
 */
function expectedFor(plan, target, context, opClass) {
  if (plan.kind === 'subject') return 'blocked';            // alany-szintű: nincs mit egyeztetni
  if (plan.kind === 'operation') {
    // KÉT tengely EGYÜTT (R75/F02): a könyv ÉS a művelet is egyezzen. A „független" cella a másik
    // KÖNYVET viszi; a művelet-eltérés viszont minden úton külön kérdés (lásd `PATH_OP`).
    return (target === 'affected' && opClass === plan.target) ? 'blocked' : 'open';
  }
  if (plan.axis === 'request') {
    // A kérés tengelyén a megkülönböztető MINDIG jelen van (a művelet maga hozza), tehát a
    // „hiányzó kontextus" oszlop itt nem szűkít — ezt a mátrix KIMONDJA, nem hallgatja el.
    return target === 'affected' ? 'blocked' : 'open';
  }
  if (context === 'absent') return 'undecidable';           // KUKA-020: a „nem tudom" külön válasz
  return target === 'affected' ? 'blocked' : 'open';
}

function classify(verdict) {
  if (verdict.allowed === true) return 'open';
  if (verdict.reason === 'ban_target_undecidable') return 'undecidable';
  return 'blocked';
}

// ── A VILÁG: EGY TILTÁS, ÉS SOHA TÖBB ───────────────────────────────────────────────────────────
//
// A KÖVETELMÉNY: egy világban PONTOSAN EGY tiltás álljon — különben egy cella zöldje jöhetne egy
// MÁSIK cella tiltásából, és a mátrix a saját előfeltevését igazolná vissza (KUKA-054).
//
// AZ ELSŐ ALAK CELLÁNKÉNT ÉPÍTETT VILÁGOT, és ez TÚL DRÁGA VOLT — nem elvben, hanem MÉRVE: a
// mutációs battéria a próba-készletet 77-szer futtatja le, és a falióra 11 260 ms lett a saját
// 12 000 ms-os költségvetésnél (a külső fél 15 000 ms-os korlátjának 80%-a). A 20% tartalék épp
// azért van, hogy egy lassabb gépen se boruljon — én pedig megettem. **A válasz nem a költségvetés
// emelése volt:** a 15 000 ms a KÜLSŐ fél korlátja, nem a miénk — az emelés náluk mérőhibává
// változtatná a mérést (KUKA-091: az őr engedékenysége sosem a javítás iránya).
//
// A VALÓDI MEGKÜLÖNBÖZTETŐ: a cellák többsége CSAK OLVAS, és az olvasás nem mozdítja a világot.
// Ezért egy PLANHEZ egy világ elég — a kiadási (ÍRÓ) cella viszont sort tesz a `subject_ban`-ba,
// tehát annak KÖTELEZŐEN saját, friss világ jár. A követelmény így sértetlen marad (egy világ =
// egy tiltás), a költség pedig 66 világról ~27-re esik.
function worldWithBan(plan) {
  const store = openStore();
  const clock = clockFrom(T0);
  for (const [id, name] of [['book_a', 'A könyv'], ['book_b', 'B könyv — FÜGGETLEN']]) {
    store.run('INSERT INTO book (id, name) VALUES (?,?)', id, name);
  }
  store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_alany', 'person');
  store.run('INSERT INTO subject (id, kind) VALUES (?,?)', 'sub_biro', 'person');
  for (const b of ['book_a', 'book_b']) {
    store.run('INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
      'sub_alany', b, 'user', clock.now());
    for (const op of ['suspend', 'alter_right']) {
      grantPlatformReviewAuthority({ store, subjectId: 'sub_alany', bookId: b, operation: op, clock });
    }
    grantPlatformReviewAuthority({ store, subjectId: 'sub_biro', bookId: b, operation: 'alter_right', clock });
  }
  // A TILTÁS FIXTÚRAKÉNT kerül be (közvetlenül a tárolóba), és ezt KIMONDJUK: a mátrix a HATÓKÖRT
  // méri, nem a kiadhatóságot. A kiadhatóságnak SAJÁT mérése van (`P-REV-ban-paths` (b3)/(e)/(f)),
  // és több fajta (személy · hitelesítő · jogalap · adatkör) a mai jogcímmel JOGGAL nem adható ki —
  // ha a mátrixot a kiadási úton építeném, ezek a sorok egyszerűen hiányoznának (KUKA-051).
  const storedTarget = plan.kind === 'operation'
    ? operationScopeRef('book_a', plan.target)
    : plan.target;
  store.run(
    `INSERT INTO subject_ban (subject_id, kind, cause, target_ref, actor_subject_id, banned_at)
     VALUES (?,?,?,?,?,?)`,
    'sub_alany', plan.kind, plan.cause, storedTarget, 'sub_biro', clock.now());
  return { store, clock };
}

function measureCell(plan, pathName, targetName, contextName, shared) {
  const req = targetName === 'affected' ? plan.affected : plan.independent;
  const credentials = plan.axis === 'credential' && contextName !== 'absent'
    ? (contextName === 'matching' ? plan.affected : plan.independent)
    : undefined;
  const bookId = req.bookId || 'book_a';
  // AZ ÍRÓ CELLA A MEGOSZTOTT VILÁGON FUT, ÉS UTÁNA PONTOSAN A SAJÁT NYOMÁT TÖRLI (R77).
  //
  // Korábban minden kiadási cella ÚJ világot kapott, mert a kiadás sort tesz a tiltás-táblába, és
  // az elmozdítaná a következő cellák alapját. Ez igaz — de a megoldás nem kell, hogy egy egész
  // világ legyen: a kiadás nyoma AZONOSÍTHATÓ (az eljáró `sub_alany`, a fixtúráé `sub_biro`),
  // tehát a cella után PONTOSAN az törölhető, amit ő írt. A mérés így ugyanaz marad (egy világ =
  // egy tiltás a mérés pillanatában), a költség viszont ~27 világról 7-re esik.
  //
  // A MÉRŐ KÖLTSÉGÉT A SAJÁT KÖLTSÉGVETÉSE KÖTI (KUKA-140), és a takarékosság itt nem gyengít:
  // a takarítás NEVEZETT és SZŰK, nem „ürítsük ki a táblát" — ha egyszer többet törölne, a mátrix
  // eltérés-száma azonnal pirosra menne, mert a következő cellák alapja hiányozna.
  const { store, clock } = shared;
  try {
    if (pathName === 'membership') {
      return classify(rightAt({ store, subjectId: 'sub_alany', bookId, opClass: 'own_book', clock, credentials }));
    }
    if (pathName === 'authority') {
      const op = opClassOf(plan, pathName, req);
      return classify(adjudicationRightAt({ store, subjectId: 'sub_alany', bookId, operation: op, clock, credentials }));
    }
    // A KIADÁS: az alany MAGA ad ki egy (számára jogszerű) könyv-hatókörű tiltást. A `ban_*` okú
    // elutasítás azt jelenti, hogy a SAJÁT tiltása megfogta — a `authority_*` vagy `ban_target_*`
    // válasz mást jelent, ezért a besorolás UGYANAZ a három szó, nem „sikerült/nem sikerült".
    const out = issueBan({
      store, clock, subjectId: 'sub_harmadik', cause: 'left_company', targetRef: bookId,
      actorSubjectId: 'sub_alany', bookId, credentials,
    });
    if (out.ok) return 'open';
    if (out.reason === 'ban_target_undecidable') return 'undecidable';
    return 'blocked';
  } finally {
    if (pathName === 'issuing') store.run('DELETE FROM subject_ban WHERE actor_subject_id = ?', 'sub_alany');
  }
}

/**
 * A TELJES MÁTRIX — minden cella MÉRT és DEKLARÁLT értékkel.
 * @returns {{cells:Array, kinds:string[], paths:string[], mismatches:Array, complete:boolean}}
 */
export function banMatrix() {
  const cells = [];
  for (const plan of PLAN) {
    const contexts = plan.axis === 'credential' ? ['matching', 'other', 'absent'] : ['n/a'];
    // EGY OLVASÓ VILÁG PLANENKÉNT — benne PONTOSAN EGY tiltás. Az író cella ebből nem kér (saját
    // világot nyit), tehát a „egy világ = egy tiltás" követelmény sértetlen marad.
    const shared = worldWithBan(plan);
    try {
    for (const path of PERMITTING_PATHS) {
      for (const target of ['affected', 'independent']) {
        if (target === 'independent' && !plan.independent) {
          cells.push(Object.freeze({
            kind: plan.kind, cause: plan.cause, path, target, context: 'n/a',
            expect: 'n/a', actual: 'n/a', ok: true,
            note: 'az alany-szintű fajtánál NINCS független cél — a hatóköre maga az alany',
          }));
          continue;
        }
        for (const context of contexts) {
          // A „matching"/„other" a CÉLLAL együtt mozog: érintett cél + más hitelesítő értelmetlen
          // pár volna (a kérdés kétszer kérdezné ugyanazt) — a kontextus-tengelyű fajtánál a CÉLT
          // maga a kontextus adja, ezért ott a `target` a kontextusból következik.
          if (plan.axis === 'credential' && context !== 'absent'
            && ((context === 'matching') !== (target === 'affected'))) continue;
          const req = target === 'affected' ? plan.affected : plan.independent;
          const opClass = opClassOf(plan, path, req);
          const expect = expectedFor(plan, target, context, opClass);
          const actual = measureCell(plan, path, target, context, shared);
          cells.push(Object.freeze({
            kind: plan.kind, cause: plan.cause, path, target, context,
            op_class: opClass, book_id: req.bookId || 'book_a',
            expect, actual, ok: expect === actual, note: plan.note,
          }));
        }
      }
    }
    } finally { shared.store.close(); }
  }
  const planned = new Set(PLAN.map((p) => p.kind));
  const missing = KNOWN_BAN_KINDS.filter((k) => !planned.has(k));
  const unknownCause = PLAN.filter((p) => !KNOWN_BAN_CAUSES.includes(p.cause)
    || kindForCause(p.cause) !== p.kind || !banKind(p.kind));
  // A SOR NEM UGYANAZ, MINT AZ EGYEDI BEMENET (R77 §3, a KÜLSŐ TÁRGYALÓ FÉL pontosítása). A tábla
  // 66 SORT rajzol, de ebből 3 fogalmilag nem értelmezhető cella (`n/a`), a maradék 63 pedig 51
  // KÜLÖNBÖZŐ végrehajtott bemenetre esik: a négy kontextusos fajtánál a HIÁNYZÓ kontextus mellett
  // az „érintett" és a „független" címke UGYANAZT a kérést jelenti (nincs mihez mérni), tehát a
  // három úton 12 sor ISMÉTLŐDIK. Az ismétlés önmagában nem hiba — a tábla a fajtánként×utanként
  // teljes lefedést mutatja —, de a JELENTÉS nem nevezheti 66 független forgatókönyvnek.
  //
  // EZÉRT A SZÁM IS MÉRÉS, NEM A LAP SZÁMOLJA (KUKA-082): ugyanaz a függvény adja, ami a cellákat,
  // így az ember-olvasható tábla és a gépi leltár nem tud elcsúszni.
  const executed = cells.filter((c) => c.actual !== 'n/a');
  const uniqueInputs = new Set(executed.map((c) => JSON.stringify([c.kind, c.path, c.book_id, c.op_class, c.context])));
  return Object.freeze({
    cells: Object.freeze(cells),
    kinds: KNOWN_BAN_KINDS,
    paths: PERMITTING_PATHS,
    mismatches: Object.freeze(cells.filter((c) => !c.ok)),
    missing_kinds: Object.freeze(missing),
    inconsistent_plan: Object.freeze(unknownCause.map((p) => p.kind)),
    complete: missing.length === 0 && unknownCause.length === 0,
    rows: cells.length,
    executed_rows: executed.length,
    not_applicable_rows: cells.length - executed.length,
    unique_executed_inputs: uniqueInputs.size,
    repeated_rows: executed.length - uniqueInputs.size,
    counting_note: 'a SOR nem egyedi bemenet: a kontextusos fajtáknál a HIÁNYZÓ kontextus mellett az '
      + '„érintett" és a „független" címke ugyanazt a kérést jelenti, ezért a végrehajtott sorok egy '
      + 'része ismétlődik. A jelentésben a SOR-számot és az EGYEDI BEMENET-számot külön kell nevezni.',
  });
}

// ── EMBER-OLVASHATÓ ALAK — UGYANABBÓL A MÉRÉSBŐL ────────────────────────────────────────────────
//
// Ez a függvény NEM új igazság: a `banMatrix()` kimenetét formázza. Ezért a külső félnek küldött
// tábla és a gépi állítás nem tud elcsúszni (KUKA-082).
const SZO = Object.freeze({ blocked: 'ZÁR', open: 'NYITVA', undecidable: 'NEM DÖNTHETŐ (zár)', 'n/a': '—' });
const UT = Object.freeze({ membership: 'tagsági', authority: 'hatásköri', issuing: 'KIADÁS' });
const CEL = Object.freeze({ affected: 'érintett', independent: 'független' });
const KTX = Object.freeze({ matching: 'tiltott értékkel', other: 'MÁSIK, jogos értékkel', absent: 'nem hozza', 'n/a': '—' });

export function renderBanMatrix(m) {
  const out = [];
  out.push('| tiltás-fajta | ok | engedő út | mit kérdez | cél | hiteles kontextus | VÁRT | MÉRT | egyezik |');
  out.push('|---|---|---|---|---|---|---|---|---|');
  for (const c of m.cells) {
    const kerdes = c.op_class ? `${c.book_id} / \`${c.op_class}\`` : '—';
    out.push(`| \`${c.kind}\` | \`${c.cause}\` | ${UT[c.path] || c.path} | ${kerdes} | ${CEL[c.target] || c.target} | `
      + `${KTX[c.context] || c.context} | ${SZO[c.expect]} | ${SZO[c.actual]} | ${c.ok ? 'igen' : '**NEM**'} |`);
  }
  return out.join('\n');
}

// CLI: `node v3ref/banMatrix.mjs` → a tábla a képernyőre, a gépi alak a kilépési kódba.
if (import.meta.url === `file://${process.argv[1]}`) {
  const m = banMatrix();
  process.stdout.write(`${renderBanMatrix(m)}\n\n`);
  process.stdout.write(`cellák: ${m.cells.length} · eltérés: ${m.mismatches.length} · `
    + `lefedetlen fajta: ${m.missing_kinds.length ? m.missing_kinds.join(', ') : 'nincs'}\n`);
  process.exit(m.complete && m.mismatches.length === 0 ? 0 : 1);
}
