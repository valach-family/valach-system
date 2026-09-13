// V3 MAGREFERENCIA — ADJ-01: A HATÁSKÖR ÉS A BEJELENTÉS (REV-N3a · REV-N3b · REV-N3c).
//
// MIT ÉPÍT MEG. Az R60-ban ELŐRE leszögezett `req-2` csomag 1. és 2. lépését (`NEXT_REQUIRED_EVIDENCE`
// a norms.mjs-ben), a külső fél R65 §7 kérésére, változtatás nélkül abban a sorrendben:
//   1. MŰVELETENKÉNTI hatáskör-fogalom ÉS a jelzés-fogadó út — EGYSZERRE (REV-N3a + REV-N3c);
//   2. a jelzés NEM ad olvasást a vitatott adatra — a bejelentés-út ÉLESÍTÉSE ELŐTT (REV-N3b).
//
// MIÉRT EGYSZERRE. A saját REV-N3c gap-szövegünk mondja ki: „külön-külön mindkettő félrevezető —
// hatáskör nélkül a bejelentés jogot mozdítana, bejelentés nélkül a hatáskör elfojtja a jelzést".
// És miért a 2. lépés a bejelentés élesítése ELŐTT: visszavonható ENGEDÉLYT lehet építeni,
// visszavonható MEGISMERÉST nem (KUKA-085 · KUKA-077 — a kockázat-lista MENETREND).
//
// AZ ÉLETHELYZET (a normából átvéve, nem utólag kitalálva): egy volt beszállító azt állítja, hogy a
// márciusi meghatalmazás hibás volt, és kéri a hozzáférése visszaállítását. Nincs igazolt
// jogviszonya a céggel. A rendszer FOGADJA a jelzését — de a jelzés nem függeszt fel, nem bírál el,
// nem változtat jogot, és nem is mutatja meg a vitatott árlistát.
//
// A HÁROM MŰVELET KÜLÖN HATÁSKÖR. Ez nem formaság: ha egy általános „bíráló" jelölés mindhármat
// adná, a LEGSZŰKEBB felhatalmazás a LEGTÁGABB hatást adná (a norma szövege ezt kifejezetten
// tiltja). Ugyanez a KUKA-002 a hatáskörön: három különböző tény nem ülhet egy jelölésen.
import { createHash } from 'node:crypto';
import { instantMs } from './store.mjs';
// A FELFÜGGESZTÉS HATÁLYÁT az a feloldó mondja ki, amit a `rightAt` is hív — egy fogalom, egy
// otthon (KUKA-003 · KUKA-039). Az író itt van (hatáskör-kérdés), a TÉNY olvasása ott.
import { suspensionEffectiveAt } from './suspension.mjs';

/** A hatáskör-igényes műveletek ZÁRT halmaza — ismeretlen művelet nem „általános", hanem NEM DÖNTHETŐ. */
export const ADJUDICATION_OPS = Object.freeze(['suspend', 'adjudicate', 'alter_right']);

export const OP_MEANING = Object.freeze({
  suspend: 'a jog FELFÜGGESZTÉSE (ideiglenes, az elbírálás idejére)',
  adjudicate: 'a kifogás ÉRDEMI ELBÍRÁLÁSA (a döntés meghozatala)',
  alter_right: 'a döntésből következő JOGVÁLTOZTATÁS végrehajtása (megvonás, visszaállítás)',
});

function deny(reason, message) { return Object.freeze({ allowed: false, reason, message, operation: null }); }
function allow(operation, detail) {
  return Object.freeze({ allowed: true, reason: 'authority_on_operation', operation, detail: Object.freeze(detail || {}) });
}

/**
 * VAN-E HATÁSKÖRE ERRE A MŰVELETRE — nevezett feloldó, amit MINDEN hatáskör-igényes út HÍV.
 *
 * A hatáskör NEM a tagságból jön (egy admin tagság nem tesz senkit elbírálóvá), és NEM általános:
 * a `suspend` jog nem ad `alter_right`-ot. A visszavont hatáskör azonnal megszűnik — a mérce a
 * KÉRÉS pillanata, ahogy a `rightAt`-nél is.
 *
 * @returns {{allowed:boolean, reason:string, message?:string, operation:string|null}}
 */
export function adjudicationRightAt({ store, subjectId, bookId, operation, clock }) {
  if (!ADJUDICATION_OPS.includes(operation)) {
    return deny('unknown_adjudication_op',
      `ismeretlen hatáskör-igényes művelet ("${operation}") — a zárt halmaz: ${ADJUDICATION_OPS.join(', ')}`);
  }
  const who = String(subjectId || '').trim();
  if (!who) {
    return deny('actor_missing',
      'a művelet ELJÁRÓ ALANYT igényel: meg kell mondani, KI végzi. A hatáskör nem a hívás '
      + 'tényéből jön (REV-N3a).');
  }
  const nowIso = clock.now();
  const now = instantMs(nowIso);
  if (!now.ok) return deny(`clock_${now.reason}`, 'az óra nem értelmezhető');

  const row = store.get(
    'SELECT * FROM adjudication_authority WHERE subject_id = ? AND book_id = ? AND operation = ?',
    who, bookId, operation);
  if (!row) {
    return deny('authority_not_established',
      `"${who}" nem rendelkezik ${operation} hatáskörrel ezen a könyvön (${OP_MEANING[operation]}). `
      + 'A tagság — akár admin — ehhez nem elég: a hatáskör MŰVELETENKÉNT adott.');
  }
  if (row.revoked_at !== null && row.revoked_at !== undefined) {
    const rev = instantMs(row.revoked_at);
    if (!rev.ok) return deny('authority_revocation_undecidable', 'a hatáskör megvonásának ideje nem értelmezhető');
    if (rev.ms <= now.ms) {
      return deny('authority_revoked', `"${who}" ${operation} hatásköre vissza lett vonva`);
    }
  }
  const from = instantMs(row.granted_at);
  if (!from.ok) return deny('authority_grant_undecidable', 'a hatáskör keletkezésének ideje nem értelmezhető');
  if (from.ms > now.ms) return deny('authority_not_yet_effective', 'a hatáskör még nem hatályos');

  return allow(operation, { granted_at: row.granted_at });
}

export function grantAdjudicationAuthority({ store, subjectId, bookId, operation, clock }) {
  if (!ADJUDICATION_OPS.includes(operation)) throw new Error(`grantAdjudicationAuthority: ismeretlen művelet (${operation})`);
  store.run(
    `INSERT INTO adjudication_authority (subject_id, book_id, operation, granted_at, revoked_at)
     VALUES (?,?,?,?,NULL)`,
    subjectId, bookId, operation, clock.now());
}

// ═══ A BEJELENTÉS — NYITOTT ÚT, SEMLEGES VÁLASZ, VISSZAÉLÉS-KORLÁT (REV-N3c) ═══════════════════
//
// A HÁROM KÖVETELMÉNY EGYÜTT ÉRVÉNYES, és bármelyik hiánya megbuktatja a klauzulát:
//   · NYITOTT — a még nem igazolt panaszos is beadhat (nincs tagsági/hatásköri kapu);
//   · SEMLEGES — a válasz BÁJTRA azonos akkor is, ha a könyv/ügy nem létezik (KUKA-084: a
//     megfigyelhető viselkedés egyike sem függhet a védett ténytől — státusz, hibakód, egy mondat
//     MEGLÉTE, a válasz alakja);
//   · KORLÁTOZOTT — a visszaélés-korlát a BEADÓ viselkedéséről szól, nem az ügyről, tehát a
//     korlát-válasz nem szivárogtat (a saját beadásaimról tudni jogos).
//
// A JELZÉS NEM MŰVELET A JOGON: a bejelentés SEMMILYEN tagságot, hatáskört vagy olvasási kört nem
// mozdít. Ezt a REV-N3b próbája ellenpárral is méri.

/** A visszaélés-korlát: ennyi beadás fér bele ekkora ablakba, BEFOGADÁSI KONTEXTUSONKÉNT. */
export const CLAIM_RATE = Object.freeze({ window_ms: 60 * 60 * 1000, max: 3 });

// ── A KORLÁT KULCSA (R67/F05) ───────────────────────────────────────────────────────────────────
//
// A LELET. A számláló kulcsa a BEADÓ által szabadon írt `claimantRef` volt. Ugyanaz a hívó négy
// különböző szöveggel négy beadást tudott elhelyezni: a „korlátozott beadó" követelmény nem
// teljesült. Megtalálta: a KÜLSŐ TÁRGYALÓ FÉL (R67/F05).
//
// A JAVÍTÁS IRÁNYA, ÉS AMI BELŐLE MA HIÁNYZIK — KIMONDVA. A korlát ELSŐDLEGES kulcsa mostantól a
// SZERVER által képzett befogadási kontextus, amit a hívó NEM tud átírni. Ez a magreferencia
// viszont nem lát hálózatot: a kontextust az ADAPTER adja (`intakeContext.channel_key`), és amíg
// nincs ilyen adapter, MINDEN kontextus nélküli beadás EGYETLEN, NEVEZETT közös vödörbe esik.
//
// EZ REFERENCIA-HELYETTESÍTŐ, NEM VÉDELEM, és így is nevezzük: a közös vödör azt a tulajdonságot
// állítja helyre, hogy a kulcsot ne lehessen a kérésből átírni — de nem különbözteti meg a jóhiszemű
// beadókat egymástól, tehát egyetlen elárasztó a többiek elől is elveszi a keretet. A klauzula
// megfelelő része ezért NYITVA marad (`norms.mjs` REV-N3c gap), és a maradék kockázat kimondva:
// valódi védelemhez az adapternek több szintű, szerver-oldali kontextust kell adnia.
export const UNATTRIBUTED_INTAKE_KEY = 'chan:unattributed';

/** A befogadási kontextus kulcsa — nevezett feloldó, hogy a próba UGYANAZT hívhassa (KUKA-009). */
export function intakeKeyOf(intakeContext) {
  const k = intakeContext && typeof intakeContext === 'object'
    ? String(intakeContext.channel_key == null ? '' : intakeContext.channel_key).trim() : '';
  return k ? `chan:${k}` : UNATTRIBUTED_INTAKE_KEY;
}

/** A SEMLEGES VÁLASZ — egyetlen, mindig azonos alak. Nem tartalmaz ügy-azonosítót és nem mond
 *  semmit arról, hogy a könyv vagy az ügy létezik-e. */
export const NEUTRAL_CLAIM_ACK = Object.freeze({
  accepted: true,
  message: 'A jelzést fogadtuk. Ha az ügy vizsgálatot igényel, a hatáskörrel rendelkező elbíráló '
    + 'jár el; erről külön értesítés nem jár, és a jelzés önmagában nem ad hozzáférést semmilyen adathoz.',
});

function digestOf(statement) {
  return `sha256:${createHash('sha256').update(String(statement == null ? '' : statement)).digest('hex')}`;
}

function claimIdFor(claimantRef, bookId, submittedAt, digest) {
  return `clm_${createHash('sha256').update([claimantRef, bookId, submittedAt, digest].join('\0')).digest('hex').slice(0, 24)}`;
}

/**
 * A JELZÉS FOGADÁSA. Bárki beadhat; a válasz MINDIG a `NEUTRAL_CLAIM_ACK`.
 *
 * A beadást MINDIG könyveljük az intake-naplóba (a korláthoz), és a `claim` sort is MINDIG
 * létrehozzuk — akkor is, ha a hivatkozott könyv nem létezik. Ez SZÁNDÉKOS: ha csak létező könyvre
 * írnánk sort, a viselkedés (írás vagy nem írás) maga hordozná a védett tényt.
 *
 * @returns {{accepted:boolean, message:string}|{accepted:false, reason:'rate_limited', message:string}}
 */
export function submitClaim({ store, clock, claimantRef, bookId, statement, intakeContext }) {
  const nowIso = clock.now();
  const now = instantMs(nowIso);
  const ref = String(claimantRef || '').trim();
  const intakeKey = intakeKeyOf(intakeContext);
  if (!ref) {
    // A BEADÓ hivatkozása kell — nem azonosság, csak visszakereshetőség (a korláthoz). Ez nem a
    // védett tényről szól, tehát nevesíthető elutasítás (KUKA-064).
    return Object.freeze({ accepted: false, reason: 'claimant_ref_missing',
      message: 'a jelzéshez meg kell adni egy elérhetőséget vagy hivatkozást (ez NEM igazolt azonosság)' });
  }
  if (!now.ok) {
    return Object.freeze({ accepted: false, reason: `clock_${now.reason}`, message: 'az óra nem értelmezhető' });
  }

  const since = new Date(now.ms - CLAIM_RATE.window_ms).toISOString();
  // R67/F05: az ELSŐDLEGES korlát a SZERVER képezte kulcson áll (a hívó nem tudja átírni). A beadó
  // saját hivatkozása MÁSODIK, szűkebb korlát marad — hasznos, de önmagában sosem védelem.
  const byChannel = store.get(
    'SELECT COUNT(*) AS n FROM claim_intake WHERE intake_key = ? AND submitted_at >= ?', intakeKey, since);
  const byRef = store.get(
    'SELECT COUNT(*) AS n FROM claim_intake WHERE claimant_ref = ? AND submitted_at >= ?', ref, since);
  if ((byChannel && Number(byChannel.n) >= CLAIM_RATE.max) || (byRef && Number(byRef.n) >= CLAIM_RATE.max)) {
    // A korlát a BEADÁS viselkedéséről szól, nem az ügyről — erről tudni jogos, tehát ez a válasz
    // eltérhet a semlegestől, és NEM szivárogtat a könyvről vagy az ügyről semmit.
    return Object.freeze({ accepted: false, reason: 'rate_limited',
      message: `túl sok jelzés rövid idő alatt (legfeljebb ${CLAIM_RATE.max} / `
        + `${Math.round(CLAIM_RATE.window_ms / 60000)} perc) — próbáld később` });
  }

  const digest = digestOf(statement);
  const id = claimIdFor(ref, bookId, nowIso, digest);
  // R67/F04: A BEFOGADÁS EGY TÉNY, TEHÁT EGY TRANZAKCIÓ. Korábban két külön autocommit-írás ment: ha
  // a második elhasalt, az ügy nem jött létre, a kvóta-sor viszont bent maradt — a sikertelen beadás
  // részlegesen megmaradt, és a beadó keretét elhasználta. A tranzakció a TÁROLÓ szolgáltatása
  // (KUKA-003), a hívó nem ír BEGIN-t a kezével.
  store.tx(() => {
    store.run('INSERT INTO claim_intake (intake_key, claimant_ref, submitted_at) VALUES (?,?,?)',
      intakeKey, ref, nowIso);
    store.run(
      `INSERT OR IGNORE INTO claim (id, book_id, claimant_ref, submitted_at, statement_digest, state)
       VALUES (?,?,?,?,?,'received')`,
      id, String(bookId == null ? '' : bookId), ref, nowIso, digest);
    // R67/F03: A TARTALOM IS MEGMARAD — különben az elbírálónak nincs mit elolvasnia. A lenyomat
    // innentől INTEGRITÁS-ellenőrzés, nem tartalom-helyettesítő.
    store.run('INSERT OR IGNORE INTO claim_content (claim_id, content) VALUES (?,?)',
      id, String(statement == null ? '' : statement));
  });
  return NEUTRAL_CLAIM_ACK;
}

/** A NEM LÉTEZŐ ÜGY VÁLASZA — és PONTOSAN ez jár annak is, akinek nincs elbírálói hatásköre. */
export const CLAIM_NOT_AVAILABLE = Object.freeze({ ok: false, error: 'not_available' });

/**
 * EGY BEJELENTÉS MEGTEKINTÉSE — REV-N3b.
 *
 * A bejelentő attól, hogy állít valamit, NEM lesz olvasó: a jelzés ELŐTTI és UTÁNI olvasási köre
 * AZONOS. A nemleges válasz pedig BÁJTRA azonos a nem létező ügyével (KUKA-084) — se hibakód, se
 * mondat-hossz nem árulja el, hogy az ügy létezik.
 *
 * ELLENPÁR: a HATÁSKÖRÖS elbíráló látja. A szabály nem „mindenkit kizár", hanem a hatáskörhöz köt.
 */
export function readClaim({ store, viewerSubjectId, claimId, clock }) {
  const row = store.get('SELECT * FROM claim WHERE id = ?', claimId);
  // A HATÁSKÖRT a SOR ISMERETE NÉLKÜL nem lehet megkérdezni (könyv kell hozzá) — ezért ha a sor
  // nincs meg, a válasz azonnal a semleges nemleges. Ha megvan, a hatáskört a sor könyvén mérjük,
  // és a nemleges válasz UGYANAZ az objektum. A kettő megkülönböztethetetlen kívülről.
  if (!row) return CLAIM_NOT_AVAILABLE;
  const right = adjudicationRightAt({
    store, subjectId: viewerSubjectId, bookId: row.book_id, operation: 'adjudicate', clock,
  });
  if (!right.allowed) return CLAIM_NOT_AVAILABLE;

  // R67/F03: AZ ELBÍRÁLÓNAK VAN MIT ELOLVASNIA. Korábban csak a lenyomat ment vissza — abból a
  // panasz szövege nem áll vissza, tehát az „elbírálás" formaság maradt. A tartalom itt jön elő, és
  // a lenyomat MOST AZ, AMI: integritás-ellenőrzés. Eltérésnél NEM adunk vissza szöveget, hanem
  // nevezett hibát — a néma, csendben megváltozott beadvány rosszabb, mint a nemleges válasz.
  const content = store.get('SELECT content FROM claim_content WHERE claim_id = ?', row.id);
  if (!content) {
    return Object.freeze({ ok: false, error: 'claim_content_missing',
      message: 'a beadvány metaadata megvan, a TARTALMA viszont nem — az ügy nem bírálható el '
        + 'érdemben; ezt jelenteni kell, nem üres kézzel dönteni' });
  }
  if (digestOf(content.content) !== row.statement_digest) {
    return Object.freeze({ ok: false, error: 'claim_content_integrity_failed',
      message: 'a tárolt beadvány nem egyezik a befogadáskor rögzített lenyomattal — a tartalom '
        + 'megváltozott, ezért NEM adjuk vissza' });
  }
  return Object.freeze({
    ok: true,
    claim: Object.freeze({
      id: row.id, book_id: row.book_id, claimant_ref: row.claimant_ref,
      submitted_at: row.submitted_at, statement_digest: row.statement_digest, state: row.state,
      statement: content.content,
    }),
  });
}

/**
 * A KIFOGÁS ÉRDEMI ELBÍRÁLÁSA — `adjudicate` hatáskör kell hozzá, és ÖNMAGÁBAN nem változtat jogot.
 * A jogváltoztatás KÜLÖN művelet, KÜLÖN hatáskörrel (`alter_right`) — ez a REV-N3a lényege.
 */
export function adjudicateClaim({ store, actorSubjectId, claimId, decision, clock }) {
  const row = store.get('SELECT * FROM claim WHERE id = ?', claimId);
  // R67/F02: A NEMLEGES VÁLASZ ITT IS SEMLEGES. Korábban a hiányzó ügy `not_available`-t kapott, a
  // hatáskör nélküli hívó viszont a hatáskör-hiba NEVÉT és MONDATÁT — a kettő különbsége maga
  // mondta meg, hogy az ügy létezik-e. Ez a KUKA-084 („a kijárat nem HELY, hanem CSATORNA") pontos
  // ismétlődése: a `readClaim`-en már helyesen állt, ezen az úton nem — fél őr volt (KUKA-039).
  // MOSTANTÓL mind a négy eset UGYANAZT az objektumot kapja: nincs ügy · nincs hatáskör · MÁS könyvre
  // van hatásköre · visszavont hatáskör. A pozitív ellenpár változatlan: az illetékes elbíráló dolgozhat.
  if (!row) return CLAIM_NOT_AVAILABLE;
  const right = adjudicationRightAt({
    store, subjectId: actorSubjectId, bookId: row.book_id, operation: 'adjudicate', clock });
  if (!right.allowed) return CLAIM_NOT_AVAILABLE;
  const state = decision === 'resolve' ? 'resolved' : 'under_review';
  store.run('UPDATE claim SET state = ? WHERE id = ?', state, claimId);
  return Object.freeze({ ok: true, state, changed_rights: false });
}

/**
 * A JOG FELFÜGGESZTÉSE — `suspend` hatáskör. Külön művelet, mert ideiglenes és szűkebb hatású, mint
 * a megvonás; a `suspend` hatáskör SOHA nem ad `alter_right`-ot.
 */
export function suspendMembership({ store, actorSubjectId, subjectId, bookId, clock, reason }) {
  const right = adjudicationRightAt({
    store, subjectId: actorSubjectId, bookId, operation: 'suspend', clock });
  if (!right.allowed) return Object.freeze({ ok: false, reason: right.reason, message: right.message });
  const m = store.get('SELECT * FROM membership WHERE subject_id = ? AND book_id = ?', subjectId, bookId);
  if (!m) return Object.freeze({ ok: false, reason: 'no_membership' });

  const at = clock.now();
  // R67/F01: A SIKER-JELENTÉS NEM HATÁS. Korábban itt `ok:true, suspended:true` állt ÍRÁS NÉLKÜL:
  // a válasz azt mondta, hogy felfüggesztve, a `rightAt` pedig továbbra is engedett. A tény ezért
  // TARTÓSAN rögzül, és a hatályt ugyanaz a nevezett feloldó mondja ki, amit a `rightAt` hív.
  const already = suspensionEffectiveAt({ store, subjectId, bookId, nowIso: at });
  if (already.suspended) {
    // Az idempotencia-őr csak az AZONOS tényt nyelheti el (KUKA-074): itt tényleg ugyanaz áll fenn.
    return Object.freeze({ ok: true, suspended: true, at, already_suspended: true, since: already.since || null });
  }
  const res = store.run(
    `INSERT INTO membership_suspension (subject_id, book_id, actor_subject_id, suspended_at, lifted_at, lifted_by, reason)
     VALUES (?,?,?,?,NULL,NULL,?)`,
    subjectId, bookId, actorSubjectId, at, reason == null ? null : String(reason));
  return Object.freeze({
    ok: true, suspended: true, at, already_suspended: false,
    suspension_id: Number(res.lastInsertRowid),
  });
}

/**
 * A FELFÜGGESZTÉS FELOLDÁSA — a `suspend` hatáskör MÁSIK IRÁNYA, kimondott szabállyal (R67/F01).
 *
 * MIÉRT `suspend` ÉS NEM `alter_right`. A feloldás nem ad új jogot: az IDEIGLENES intézkedést
 * zárja le, és utána pontosan az a jog éled fel, ami egyébként is fennállna (ha közben megvonták a
 * tagságot, a feloldás nem hozza vissza — azt csak az `alter_right` teheti). Aki felfüggeszthet,
 * az fel is oldhatja; a jog MEGVÁLTOZTATÁSA külön hatáskör marad.
 *
 * AZ IDŐ SZABÁLYA: a feloldás a MOSTANI pillanattól hat, visszamenőleg nem. A sor NEM tűnik el —
 * `lifted_at`/`lifted_by` kap, tehát a felfüggesztés ideje a történetben megmarad (K09 elve).
 */
export function liftSuspension({ store, actorSubjectId, subjectId, bookId, clock }) {
  const right = adjudicationRightAt({
    store, subjectId: actorSubjectId, bookId, operation: 'suspend', clock });
  if (!right.allowed) return Object.freeze({ ok: false, reason: right.reason, message: right.message });
  const at = clock.now();
  const eff = suspensionEffectiveAt({ store, subjectId, bookId, nowIso: at });
  if (!eff.suspended) return Object.freeze({ ok: false, reason: 'not_suspended' });
  store.run('UPDATE membership_suspension SET lifted_at = ?, lifted_by = ? WHERE id = ?',
    at, actorSubjectId, eff.id);
  return Object.freeze({ ok: true, lifted: true, at, suspension_id: eff.id });
}
