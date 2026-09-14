// V3 MAGREFERENCIA — BAN-01: A CÉLZOTT TILTÁS (REV-N5a · REV-N5b · REV-N5c).
//
// MIÉRT MOST ÉS MIÉRT EZ. A `NEXT_REQUIRED_EVIDENCE` (req-3) sorrendje az R53 §7-ből jön:
// REV-N3 → **REV-N5** → REV-N2 → ORG-N1 → ORG-N3 → REV-N4. A REV-N3 az R65-ben lezárult, tehát ez a
// soron következő csomag — és a külső fél az R71 §8/1-ben kimondottan ezt kérte elsődleges
// szállításként. A REV-N5c saját gap-szövege azt is megmondja, MIÉRT nem halasztható: a klauzula a
// tiltás-fogalom nélkül MÉRETLEN, tehát KUKA-051 szerint ZÖLDNEK LÁTSZANA — a méretlen klauzula
// veszélyesebb, mint a kimondottan nyitott.
//
// MIÉRT KÜLÖN MODUL (a SUS-01 mintájára, KUKA-003). A tiltás tényét KETTEN olvassák: az `authz.mjs`
// (tagsági út) és az `adjudication.mjs` (hatásköri út). Az `authz.mjs` MÁR behúzza az
// `adjudication.mjs`-t, tehát az ellenirányú behúzás KÖRT csinálna. Egy fogalomnak EGY otthona, és
// az otthon nem lehet egyik oldal sem: ez a modul csak a tárolót ismeri, és mindkét út ide fordul.
// Ez egyben a REV-N5a gépi biztosítéka: ha a tiltás EGY feloldóban él, egy új engedő út nem tud
// „elfelejtkezni" róla — a fél őr (KUKA-039) nem tud csendben megszületni.
//
// A HÁROM KLAUZULA, ÉS HOL ÁLL A KÓDBAN:
//   · REV-N5b — a FAJTA nevezett, zárt halmazból, és az OK választja ki (`BAN_KINDS` · `BAN_CAUSES`
//     · `kindForCause`). A hatókör a fajtából származik (`banReaches`).
//   · REV-N5a — EGY feloldó (`banEffectiveAt`), amit MINDKÉT engedő út hív. A tiltás bevezetésének
//     HELYE nem szűkíti a hatását: a rekordban nincs olyan mező, ami azt mondaná, „melyik úton".
//   · REV-N5c — ez a modul KIZÁRÓLAG a `subject_ban` táblába ír. A múlt (parancs · nyugta · kiadás)
//     és a MÁSIK jogosult sora érintetlen marad; ezt a P-REV-ban-past próba tartalmilag méri.

import { instantMs, withTransaction } from './store.mjs';
import { authorityRowAt } from './authority.mjs';

// ═══ A TILTÁS FAJTÁI — ZÁRT HALMAZ, NEVEZETT HATÓKÖRREL (REV-N5b) ══════════════════════════════
//
// A norma hét fajtát sorol fel: hitelesítő · munkamenet · alany · jogalap · könyv · művelet ·
// adatkör. Mindegyikhez tartozik egy MEGKÜLÖNBÖZTETŐ: az a tény a kérésben, ami eldönti, hogy ez a
// tiltás érinti-e ezt a kérést. A `discriminator: null` azt jelenti, hogy a fajta hatóköre az EGÉSZ
// alany — nincs mit egyeztetni, mindig hat.
//
// `Map`, nem sima objektum: az örökölt kulcs (`toString`, `constructor`, `__proto__`) így nem tud
// beletalálni, tehát egy `kind: 'toString'` nem oldódik fel „ismert fajtává" (a Q07 tanulsága).
const BAN_KINDS = new Map([
  ['credential', Object.freeze({
    discriminator: 'credentialId',
    meaning: 'a HITELESÍTŐ tiltott — mindenhol, ahol azzal lépnének be',
  })],
  ['session', Object.freeze({
    discriminator: 'sessionId',
    meaning: 'egy konkrét MUNKAMENET tiltott',
  })],
  ['subject', Object.freeze({
    discriminator: null,
    meaning: 'az ALANY maga tiltott — minden könyvön, minden úton',
  })],
  ['legal_basis', Object.freeze({
    discriminator: 'basisId',
    meaning: 'a JOGALAP megszűnt — minden, ami rajta nyugszik, tiltott',
  })],
  ['book', Object.freeze({
    discriminator: 'bookId',
    meaning: 'EGY könyvre szóló tiltás — a többi könyvet NEM érinti',
  })],
  ['operation', Object.freeze({
    discriminator: 'opClass',
    meaning: 'EGY művelet-osztály tiltott — könyveken át',
  })],
  ['data_scope', Object.freeze({
    discriminator: 'dataScope',
    meaning: 'EGY adatkör tiltott',
  })],
]);

export const KNOWN_BAN_KINDS = Object.freeze([...BAN_KINDS.keys()]);

// ═══ A KANONIKUS KÉRÉS — KÉT EREDET, EGY ALAK (REV-N5a, R73/C-F01+C-F02) ═══════════════════════
//
// A LELET. A két jogfeloldó így állította össze a tiltás-kérdés tárgyát:
//     { bookId, opClass, ...(credentials || {}) }
// A spread a MÁR ISMERT könyvet és műveletet FELÜLÍRHATTA, miközben a tagsági/hatásköri lekérdezés
// az EREDETI argumentumokkal ment tovább. Mérve: `left_company` tiltás az A könyvre, majd
// `credentials: {bookId:'b'}` — és az A könyvre irányuló kérés MINDKÉT úton `allowed: true` lett.
// Ugyanez a `suspend` műveletre `credentials: {opClass:'own_book'}` mellett.
//
// A JAVÍTÁS NEM A SPREAD MEGFORDÍTÁSA. Az is megszüntetné az ütközést, de semmit nem mondana arról,
// HONNAN jön az egyes mezők értéke — a külső fél ezt kimondottan kérte. Ezért itt EREDET-HATÁR van:
//   · A KÉRÉS tengelyei (`bookId`, `opClass`) KIZÁRÓLAG a hívó argumentumaiból jönnek. Ezt a
//     felhasználó nem „adja meg" — ez maga a művelet, amit végre akar hajtani.
//   · A BELÉPÉSI KONTEXTUS (`credentialId`, `sessionId`, `basisId`, `dataScope`) KIZÁRÓLAG a
//     hitelesített kontextusból, NÉV SZERINT kiemelve. Ami nem ezen a négy néven jön, azt eldobjuk.
// Egy fogalomnak egy otthona: ezt a feloldót hívja MINDEN engedő út (KUKA-039).
const CREDENTIAL_AXES = Object.freeze(['credentialId', 'sessionId', 'basisId', 'dataScope']);
const REQUEST_AXES = Object.freeze(['bookId', 'opClass']);

/**
 * @param {{bookId?:string, opClass?:string}} operation a VÉGREHAJTANDÓ művelet (a hívó argumentumai)
 * @param {object|null|undefined} credentials a HITELESÍTETT belépési kontextus
 * @returns {Readonly<object>} a tiltás-kérdés kanonikus tárgya
 */
export function banRequestFor(operation, credentials) {
  const req = {};
  for (const axis of REQUEST_AXES) {
    if (operation && operation[axis] !== undefined) req[axis] = operation[axis];
  }
  // A belépési kontextus SOHA nem írhat a kérés tengelyeire — ha mégis hozza őket, azok itt
  // egyszerűen nem léteznek: nem hibázunk, mert a hívó jogos kontextusa tartalmazhat többet is,
  // de a tiltás tárgyát ettől nem mozdíthatja el.
  for (const axis of CREDENTIAL_AXES) {
    if (credentials && credentials[axis] !== undefined) req[axis] = credentials[axis];
  }
  return Object.freeze(req);
}

// ═══ AZ OK VÁLASZTJA A FAJTÁT — NEM EGY ÁLTALÁNOS SZABÁLY (REV-N5b) ════════════════════════════
//
// Ez a norma szíve, és az R55 §7 második korrekciójából született. A régi mondatunk feltétel nélkül
// állította, hogy a tiltás „nem sújthat FÜGGETLEN könyveket" — ez TÚL ERŐS: kompromittált
// HITELESÍTŐNÉL a másik könyvbe SEM szabad bejutni ugyanazzal. A hatókör tehát az OKBÓL származik
// (KUKA-048 elve: a kivétel/hatókör mércéjét az INDOK szabja meg, nem egy általános tilalom).
//
// A két, normában NEVESÍTETT eset:
//   · kilépés egy cégből        ⇒ `book`       ⇒ a másik, független könyv joga ÉRINTETLEN
//   · kompromittált hitelesítő  ⇒ `credential` ⇒ MINDENHOL tilos, ahol azzal lépnének be
const BAN_CAUSES = new Map([
  ['left_company', 'book'],
  ['credential_compromised', 'credential'],
  ['session_hijack_suspected', 'session'],
  ['mandate_withdrawn', 'legal_basis'],
  ['court_order_subject', 'subject'],
  ['operation_misuse', 'operation'],
  ['data_scope_withdrawn', 'data_scope'],
]);

export const KNOWN_BAN_CAUSES = Object.freeze([...BAN_CAUSES.keys()]);

/** Az OK → FAJTA leképezés. Ismeretlen ok ⇒ `null` (NEM „általános tiltás"). */
export function kindForCause(cause) {
  return typeof cause === 'string' && BAN_CAUSES.has(cause) ? BAN_CAUSES.get(cause) : null;
}

/** A FAJTA leírása. Ismeretlen fajta ⇒ `null` — a hívónak KEZELNIE kell, nem elnyelnie. */
export function banKind(kind) {
  return typeof kind === 'string' && BAN_KINDS.has(kind) ? BAN_KINDS.get(kind) : null;
}

// ═══ ELÉRI-E EZT A KÉRÉST? — HÁROM VÁLASZ, NEM KETTŐ ═══════════════════════════════════════════
//
// A boolean itt KEVÉS lenne, és pontosan azt a hibát szülné, amit a KUKA-020 tilt: a „nem tudom"
// ugyanúgy nézne ki, mint a „nem". Három megkülönböztetett válasz:
//   · reaches:true                  — a megkülönböztető EGYEZIK (vagy a fajta alany-szintű)
//   · reaches:false, decidable:true — a megkülönböztető KÜLÖNBÖZIK: ez a kérés bizonyítottan más
//     (EZ tartja a „kilépés a másik könyvet nem érinti" felét — enélkül a tiltás túlnyúlna)
//   · decidable:false               — a kérés nem hordozza a megkülönböztetőt, tehát NEM TUDJUK,
//     hogy érinti-e. Ilyenkor ZÁR (védő intézkedésnél a kétség nem nyithat hozzáférést), de a
//     válasz NEVEZETT: `ban_target_undecidable`, nem „általános tiltás".
//
// AZ ISMERETLEN FAJTA külön eset, és a norma kimondja: „ismeretlen fajta NEM »általános tiltás«,
// hanem nem dönthető". Ezért NINCS SQL CHECK a `kind` oszlopon — ha lenne, az ismeretlen fajta be
// sem kerülhetne a tárolóba, és ez az ág MÉRHETETLEN volna (KUKA-051: a nem mért ág zöldnek
// látszik). A zárt halmazt a FELOLDÓ őrzi, és az ismeretlen fajta itt kap nevet.
export function banReaches(ban, request) {
  const kind = banKind(ban?.kind);
  if (!kind) {
    return Object.freeze({
      reaches: true, decidable: false, reason: 'ban_kind_unknown',
      message: `a tiltás fajtája ("${ban?.kind}") nem ismert — a zárt halmaz: ${KNOWN_BAN_KINDS.join(', ')}. `
        + 'Ismeretlen fajtánál a hatókör NEM DÖNTHETŐ, ezért a hozzáférés zárva marad; ez nem '
        + '„általános tiltás", hanem nevezett bizonytalanság.',
    });
  }
  if (kind.discriminator === null) {
    return Object.freeze({ reaches: true, decidable: true, reason: 'ban_subject_wide' });
  }
  const asked = request ? request[kind.discriminator] : undefined;
  if (asked === undefined || asked === null || String(asked).trim() === '') {
    return Object.freeze({
      reaches: true, decidable: false, reason: 'ban_target_undecidable',
      message: `a tiltás fajtája "${ban.kind}" (${kind.meaning}), a kérés viszont nem hordozza a `
        + `\`${kind.discriminator}\` megkülönböztetőt — így nem dönthető el, hogy ez a kérés érintett-e. `
        + 'A hozzáférés zárva marad; a pontos válaszhoz a hívó adja meg a megkülönböztetőt.',
    });
  }
  const target = ban.target_ref;
  if (target === null || target === undefined || String(target).trim() === '') {
    return Object.freeze({
      reaches: true, decidable: false, reason: 'ban_target_missing',
      message: `a(z) "${ban.kind}" fajtájú tiltás nem nevezi meg, MIRE szól (\`target_ref\` üres) — `
        + 'hatókör nélküli célzott tiltás nem dönthető el.',
    });
  }
  const hit = String(target) === String(asked);
  return Object.freeze({
    reaches: hit, decidable: true,
    reason: hit ? `ban_scope_${ban.kind}` : `ban_other_${kind.discriminator}`,
  });
}

// ═══ HATÁLYOS-E MOST — EGY FELOLDÓ, AMIT MINDEN ENGEDŐ ÚT HÍV (REV-N5a) ════════════════════════
//
// Az idő-kezelés IRÁNYA azonos a felfüggesztésével (SUS-01), és ez SZÁNDÉKOS: a tiltás VÉDŐ
// intézkedés, tehát az eldönthetetlen óra nem oldhatja fel.
//
// @param request  a kérés megkülönböztetői: {bookId, opClass, credentialId, sessionId, basisId, dataScope}
// @returns {{banned:boolean, reason:string, ...}}
export function banEffectiveAt({ store, subjectId, nowIso, request }) {
  const now = instantMs(nowIso);
  if (!now.ok) return Object.freeze({ banned: false, reason: `clock_${now.reason}` });

  const rows = store.all('SELECT * FROM subject_ban WHERE subject_id = ? ORDER BY id', subjectId);
  for (const row of rows) {
    const from = instantMs(row.banned_at);
    if (!from.ok) {
      return Object.freeze({ banned: true, reason: 'ban_start_undecidable', id: row.id, kind: row.kind });
    }
    if (from.ms > now.ms) continue;                       // ütemezett, még nem hatályos
    if (row.lifted_at !== null && row.lifted_at !== undefined) {
      const lifted = instantMs(row.lifted_at);
      if (!lifted.ok) {
        return Object.freeze({ banned: true, reason: 'ban_lift_undecidable', id: row.id, kind: row.kind });
      }
      if (lifted.ms <= now.ms) continue;                  // a tiltás véget ért — a SOR megmarad (történet)
    }
    // R73/C-F05 — AZ OK ÉS A FAJTA EGYMÁSNAK ELLENTMONDHAT. Az ÍRÓ a fajtát az OKBÓL képezi, de a
    // TÁROLÓ mindkettőt hordozza, és a `banReaches` KIZÁRÓLAG a fajtát nézte — az okot el sem
    // olvasta. Egy sérült vagy importált sorral (`cause: 'credential_compromised', kind: 'book'`) a
    // régi hitelesítővel érkező kérés ENGEDÉLYT kapott. A leletük integritási eset: közvetlenül a
    // tárolóba helyezett inkonzisztens rekord, nem a szabályos `imposeBan` terméke — de a
    // megszüntetéséhez épp ezért kell OLVASÓ-oldali ellenőrzés is (a séma-szintű kényszer a
    // migrációt és a jövőbeli importot köti, a már bent lévő sort nem).
    //
    // EGY IGAZSÁGFORRÁS: a viszonyt ugyanaz a leképezés mondja ki, amit az író használ. Az
    // ellentmondás NEM „nincs tiltás", hanem NEVEZETT bizonytalanság, ami NEM nyit hozzáférést —
    // ugyanúgy, ahogy az ismeretlen fajta és az eldönthetetlen időpont (KUKA-020).
    // A SORREND SZÁMÍT (a külső fél §3 pontosítása): az ismeretlen FAJTA a feloldó saját,
    // nevezett válasza (`ban_kind_unknown`), az ismeretlen OKOT az ÍRÓ utasítja el. Az
    // ellentmondás csak ott kérdés, ahol MINDKÉT oldal ismert — különben ez a sor elfedné a
    // pontosabb diagnózist (KUKA-124: a rossz nevű hibaüzenet elrejti az igazit).
    const expectedKind = kindForCause(row.cause);
    if (expectedKind && banKind(row.kind) && expectedKind !== row.kind) {
      return Object.freeze({
        banned: true, reason: 'ban_cause_kind_contradiction', decidable: false,
        id: row.id, kind: row.kind, cause: row.cause, since: row.banned_at,
        message: `a tiltás-rekord ÖNMAGÁNAK mond ellent: az oka \`${row.cause}\`, amiből `
          + `\`${expectedKind}\` fajta következik, a sorban viszont \`${row.kind}\` áll. Amíg ez nem `
          + 'dől el, a kérés NEM engedhető — az ellentmondás nem a tiltás megszűnése.',
      });
    }

    const scope = banReaches(row, request);
    if (!scope.reaches) continue;                         // más könyv / más művelet — NEM érinti (REV-N5b)
    return Object.freeze({
      banned: true, reason: scope.reason, decidable: scope.decidable,
      id: row.id, kind: row.kind, cause: row.cause, since: row.banned_at,
      message: scope.message || `célzott tiltás van hatályban ("${row.kind}", oka: "${row.cause}")`,
    });
  }
  return Object.freeze({ banned: false, reason: 'not_banned' });
}

// ═══ A TILTÁS KIMONDÁSA — HATÁSKÖRHÖZ KÖTVE, ESEMÉNYKÉNT ═══════════════════════════════════════
//
// A hatáskör ugyanaz, ami a jogváltoztatásé (`alter_right`) — a hívó adja át a döntést, mert a
// hatáskör-feloldó az `adjudication.mjs`-ben él, és annak behúzása innen kört csinálna. Ez NEM
// kiskapu: a `imposeBan` hatáskör nélkül NEM hívható a magban, és a próba ezt méri.
//
// A tiltás ESEMÉNY, nem sor-átírás (K09): a feloldás sem törli, `lifted_at`-ot kap.
// ═══ A TILTÁS KIADÁSA — A HATÁSKÖRT FELOLDJUK, NEM ELHISSZÜK (R73/C-F03) ══════════════════════
//
// A LELET. Az `imposeBan` egyetlen feltételt nézett: `authorityOk === true`. A hatáskört NEM oldotta
// fel, és a termék-oldalon egyetlen hívó sem végezte el helyette — a hívások a PRÓBÁKBAN voltak. A
// modul kommentje ennél erősebbet állított („hatáskör nélkül nem hívható"), tehát a szöveg ígért
// valamit, amit a gép nem teljesített (KUKA-015). Mérve: egy `outsider`, akinek NULLA hatásköri
// rekordja van, `authorityOk: true` mellett sikeresen tiltott — és a célszemély hozzáférése
// tényleg megszűnt. Ez a KUKA-121/122 családja: amit a hívó BEGÉPELHET, az állítás, nem mérés.
//
// A HATÓKÖR SEM ÖRÖKLŐDIK. A külső fél kimondta: a KÖNYVRE adott `alter_right` hatáskörből NEM
// következik személyszintű, minden könyvre kiterjedő vagy hitelesítő-szintű tiltási jog — a
// könyvgazda ne kapjon hallgatólagos hatalmat más, független könyvek felett. Ezért a kiadható
// tiltás-fajtát is a hatáskör szabja meg, nevezetten.
const BOOK_SCOPED_KINDS = Object.freeze(['book', 'operation']);

/**
 * A TILTÁS KIADÁSÁNAK IGAZOLT BEJÁRATA. Ezt hívja a termék-oldal; az `imposeBan` az alacsony
 * szintű ÍRÓ marad, ami a rekordot létrehozza — de nem ő az igazolatlan publikus művelet.
 *
 * @param {string} bookId a könyv, amelyre az eljáró hatásköre szól (a hatókör forrása)
 */
export function issueBan({ store, clock, subjectId, cause, targetRef, actorSubjectId, bookId }) {
  const said = (v) => (v === undefined || v === null ? '' : String(v).trim());
  // A KIADHATÓ FAJTA A HATÁSKÖRBŐL. (A hatáskör FELOLDÁSÁT maga az `imposeBan` végzi — AUT-01.) A könyv-szintű hatáskör könyv-szintű tiltást enged; a
  // személyt, a hitelesítőt, a jogalapot és az adatkört érintő tiltás SZÉLESEBB, mint a jogcím.
  const kind = kindForCause(cause);
  if (kind && !BOOK_SCOPED_KINDS.includes(kind)) {
    return Object.freeze({
      ok: false, reason: 'ban_wider_than_authority',
      message: `a(z) "${cause}" ok "${kind}" fajtájú tiltást jelent, ami TÚLMUTAT a(z) "${bookId}" `
        + 'könyvre szóló hatáskörön: a személy, a hitelesítő, a jogalap és az adatkör tiltása nem '
        + 'következik egy könyv gazdálkodási jogából. Ehhez külön, nevesített hatáskör kell — a '
        + 'könyvgazda más, független könyvek felett nem kap hallgatólagos hatalmat (R73/C-F03).',
    });
  }
  // A könyv-szintű tiltás a SAJÁT könyvre szólhat, másra nem.
  if (kind === 'book' && said(targetRef) !== said(bookId)) {
    return Object.freeze({
      ok: false, reason: 'ban_target_outside_authority',
      message: `a hatáskör a(z) "${bookId}" könyvre szól, a tiltás viszont "${said(targetRef)}"-t `
        + 'nevez meg. Idegen könyvre nem adható ki tiltás ezzel a jogcímmel.',
    });
  }
  return imposeBan({ store, subjectId, cause, targetRef, actorSubjectId, clock, bookId });
}

// AZ ALACSONY SZINTŰ ÍRÓ. Az `authorityOk` itt már NEM jogcím, hanem annak a jelzése, hogy a
// hívó elvégezte a feloldást — ezért ezt a függvényt a termék-oldal közvetlenül nem hívja
// (a bejárat az `issueBan`), és a hívást gépi jel méri (M71).
export function imposeBan({ store, subjectId, cause, targetRef, actorSubjectId, clock, bookId }) {
  // A HATÁSKÖRT ITT FELOLDJUK — a `authorityOk` boolean MEGSZŰNT. Amíg a hívó szava állt a
  // hatáskör helyén, addig egy hatáskör nélküli alany is tilthatott (R73/C-F03). A feloldás a
  // közös AUT-01 modulból jön, tehát ugyanaz a szabály fut, mint a hatásköri jog-feloldón.
  const actor = String(actorSubjectId || '').trim();
  if (!actor) {
    return Object.freeze({
      ok: false, reason: 'actor_missing',
      message: 'a célzott tiltás JOGVÁLTOZTATÁS: meg kell nevezni, KI adja ki (REV-N3a).',
    });
  }
  const book = String(bookId || '').trim();
  if (!book) {
    return Object.freeze({
      ok: false, reason: 'authority_book_required',
      message: 'meg kell nevezni, MELYIK könyvön áll fenn az eljáró `alter_right` hatásköre — a '
        + 'hatáskör könyvenként és műveletenként adott, nem általános (R73/C-F03).',
    });
  }
  const authority = authorityRowAt({ store, subjectId: actor, bookId: book, operation: 'alter_right', nowIso: clock.now() });
  if (!authority.ok) return Object.freeze({ ok: false, reason: authority.reason, message: authority.message });
  const kind = kindForCause(cause);
  if (!kind) {
    return Object.freeze({
      ok: false, reason: 'ban_cause_unknown',
      message: `ismeretlen tiltás-ok ("${cause}") — a zárt halmaz: ${KNOWN_BAN_CAUSES.join(', ')}. `
        + 'Az OK választja ki a tiltás FAJTÁJÁT és ezzel a hatókörét (REV-N5b); ok nélkül a hatókör '
        + 'nem vezethető le, és „általánosat" nem tételezünk fel.',
    });
  }
  const shape = banKind(kind);
  if (shape.discriminator !== null && (targetRef === undefined || targetRef === null || String(targetRef).trim() === '')) {
    return Object.freeze({
      ok: false, reason: 'ban_target_required',
      message: `a(z) "${cause}" ok "${kind}" fajtájú tiltást jelent (${shape.meaning}), ezért meg kell `
        + `nevezni, MIRE szól (\`targetRef\` = a kérés \`${shape.discriminator}\` értéke).`,
    });
  }
  const nowIso = clock.now();
  return withTransaction(store.db, () => {
    store.run(
      `INSERT INTO subject_ban (subject_id, kind, cause, target_ref, actor_subject_id, banned_at)
       VALUES (?,?,?,?,?,?)`,
      subjectId, kind, cause, shape.discriminator === null ? null : String(targetRef), actorSubjectId, nowIso);
    return Object.freeze({ ok: true, kind, cause, target_ref: shape.discriminator === null ? null : String(targetRef), banned_at: nowIso });
  });
}
