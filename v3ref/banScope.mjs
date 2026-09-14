// V3 MAGREFERENCIA — BAN-01/olvasó: A CÉLZOTT TILTÁS TÉNYE ÉS HATÓKÖRE (REV-N5a/b/c).
//
// MIÉRT VÁLT KÜLÖN A FÁJL (R75/F01 · F03, D-VS-3021). Az R73-ban a tiltás OLVASÁSA és KIADÁSA egy
// modulban élt, és emiatt a kiadás nem tudta megkérdezni a TELJES döntést: a `ban.mjs` importálta az
// `authority.mjs`-t, tehát az `authority.mjs` nem importálhatta vissza a tiltás-feloldót (kör). A
// kiadási út ezért CSAK a hatásköri sort nézte — és így egy MÁR LETILTOTT eljáró is tilthatott
// (F01). A külső fél szava: *„a körkörös függőség feloldása nem ér véget egy adatolvasó
// kiemelésével; legyen olyan közös döntési réteg, amelyből a tiltáskiadás sem marad ki."*
//
// EZÉRT A SORREND MEGFORDULT. Ez a modul CSAK OLVAS (tároló → tény), és semmit nem importál az
// engedélyezési rétegből. Fölötte:
//   `authority.mjs`  → ezt HÍVJA, és megépíti a TELJES döntést (`executableRightAt`)
//   `ban.mjs`        → a KIADÁS (író), ami azt a teljes döntést kéri — nem a nyers hatásköri sort
// Így a függőség egyirányú, és a kiadási út nem tud „harmadik engedő úttá" válni.
//
// A FOGALOM OTTHONA EZ A FÁJL. A `ban.mjs` a régi neveket TOVÁBBADJA (re-export), mert a korábbi
// hívók és a külső fél programjai onnan kérik — de MÁSODIK DEFINÍCIÓ nincs (KUKA-018): az irány
// egyirányú, és a definíció itt áll.

import { instantMs } from './store.mjs';

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
// ═══ A TÁROLT REKORD INTEGRITÁSA — HÁROM KÜLÖN VÁLASZ, ELNYELÉS NÉLKÜL (R75/F04) ══════════════
//
// A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL). Az R73-ban az ok↔fajta ellentmondást úgy zártam le,
// hogy a feltétel `expectedKind && banKind(row.kind) && expectedKind !== row.kind` volt. ISMERETLEN
// OKNÁL az `expectedKind` NULL, tehát az egész ellenőrzés KIMARADT — egy importált vagy sérült
// `cause:'unknown-imported-cause'` sor mellett a kérés ENGEDÉLYT kapott. Az ÍRÓ ismeretlen-ok
// ellenőrzése erre nem véd: az a KIADÁST köti, a TÁROLÓBÓL olvasott sort nem.
//
// A HIBA OSZTÁLYA a KUKA-124/2: a legtöbb összehasonlítás a ROSSZ ÉRTÉKRE készül, és a HIÁNYT némán
// ugyanoda sorolja — itt viszont a hiány az ELLENKEZŐ oldalra esett: nem zárt, hanem NYITOTT.
// A külső fél mondata: *„a diagnózisok sorrendje legyen meghatározott, de ne a diagnózis elnyelése
// őrizze a sorrendet."*
//
// EZÉRT EGY NEVEZETT FELOLDÓ, HÁROM KÜLÖN VÁLASSZAL, KIMONDOTT SORRENDBEN:
//   1. ismeretlen FAJTA      → `ban_kind_unknown`
//   2. ismeretlen OK         → `ban_cause_unknown_stored`
//   3. ok ↔ fajta ELLENTMOND → `ban_cause_kind_contradiction`
// Mindhárom NEM DÖNTHETŐ és ZÁR: az eldönthetetlen rekord nem igazolhatja a kért hozzáférés
// függetlenségét — a sérült sor TÉNYLEGES hatóköre épp az, amit nem tudunk (KUKA-020).
/**
 * @returns {null | {reason:string, message:string}} `null`, ha a rekord belsőleg ép
 */
export function banRecordIntegrity(row) {
  const kindKnown = banKind(row?.kind);
  if (!kindKnown) {
    return Object.freeze({
      reason: 'ban_kind_unknown',
      message: `a tiltás fajtája ("${row?.kind}") nem ismert — a zárt halmaz: ${KNOWN_BAN_KINDS.join(', ')}. `
        + 'Ismeretlen fajtánál a hatókör NEM DÖNTHETŐ, ezért a hozzáférés zárva marad; ez nem '
        + '„általános tiltás", hanem nevezett bizonytalanság.',
    });
  }
  const expectedKind = kindForCause(row?.cause);
  if (!expectedKind) {
    return Object.freeze({
      reason: 'ban_cause_unknown_stored',
      message: `a tárolt tiltás OKA ("${row?.cause}") nem ismert — a zárt halmaz: `
        + `${KNOWN_BAN_CAUSES.join(', ')}. Az OK választja ki a hatókört (REV-N5b), ezért ismeretlen `
        + 'oknál a rekord VALÓDI hatóköre nem dönthető el: a hozzáférés zárva marad. Ez NEM a fajta '
        + 'alapján továbbmenő engedély — a sérült vagy importált sort helyre kell állítani.',
    });
  }
  if (expectedKind !== row.kind) {
    return Object.freeze({
      reason: 'ban_cause_kind_contradiction',
      message: `a tiltás-rekord ÖNMAGÁNAK mond ellent: az oka \`${row.cause}\`, amiből `
        + `\`${expectedKind}\` fajta következik, a sorban viszont \`${row.kind}\` áll. Amíg ez nem `
        + 'dől el, a kérés NEM engedhető — az ellentmondás nem a tiltás megszűnése.',
    });
  }
  return null;
}

// ═══ A MŰVELET-TILTÁS HATÓKÖRE STRUKTURÁLT (R75/F02, D-VS-3021) ═══════════════════════════════
//
// A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL). A `judge` CSAK az A könyvön volt jogosult, és egy
// `operation_misuse` okú tiltást adott ki. A dolgozó ettől a FÜGGETLEN B könyvben is elvesztette a
// hozzáférését, mert a feloldó a művelet-tiltást KIZÁRÓLAG az `opClass` alapján, könyveken ÁT
// értékelte. A `BOOK_SCOPED_KINDS` lista NEVE azt ígérte, hogy ez könyv-hatókörű — a tárolt rekord
// viszont nem őrizte meg a könyvet. **A konstans neve nem korlátozza a rekord hatását** (KUKA-015:
// amit a név állít, azt a gépnek teljesítenie kell).
//
// EZÉRT A TÁROLT CÉL MAGA HORDOZZA A HATÓKÖRT. Egy könyvre szóló hatáskörből kiadott
// művelet-tiltás célja `<könyv>\u0001<művelet>`, és a feloldó MINDKÉT tengelyt megköveteli. A
// VALÓBAN globális (könyvtől független) művelet-tiltás alakja a csupasz művelet — ahhoz viszont
// külön, globális hatáskör kellene, amit a mai kiadási út NEVEZETTEN elutasít (`ban.mjs`).
const OPERATION_SCOPE_SEP = '\u0001';

/** A könyvre korlátozott művelet-tiltás tárolt célja. */
export function operationScopeRef(bookId, opClass) {
  return `${String(bookId).trim()}${OPERATION_SCOPE_SEP}${String(opClass).trim()}`;
}

/**
 * A tárolt művelet-cél ÉRTELMEZÉSE. Két alak él, és a különbség a HATÁLY:
 *   `<könyv>\u0001<művelet>` → könyvre korlátozott (ma ez az EGYETLEN kiadható)
 *   `<művelet>`               → globális, könyvtől független (kiadása ma nevezetten elutasított)
 */
export function parseOperationScope(targetRef) {
  const raw = targetRef === null || targetRef === undefined ? '' : String(targetRef);
  const at = raw.indexOf(OPERATION_SCOPE_SEP);
  if (at < 0) return Object.freeze({ bookId: null, opClass: raw.trim(), global: true });
  return Object.freeze({
    bookId: raw.slice(0, at).trim(),
    opClass: raw.slice(at + 1).trim(),
    global: false,
  });
}

export function banReaches(ban, request) {
  const kind = banKind(ban?.kind);
  if (!kind) {
    // NINCS MÁSODIK DEFINÍCIÓ: az ismeretlen fajta mondata a közös integritás-feloldóban él, és a
    // közvetlen hívó (próba, szerszám) is ugyanazt a választ kapja, mint a `banEffectiveAt` (KUKA-003).
    const problem = banRecordIntegrity(ban);
    return Object.freeze({ reaches: true, decidable: false, reason: problem.reason, message: problem.message });
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
  // A MŰVELET-TILTÁS KÉT TENGELYEN dől el, ha a tárolt cél könyvre korlátozott (R75/F02). Ez NEM
  // külön szabály a `book` mellett: ugyanaz az elv — a tiltás pontosan addig ér, ameddig a kiadó
  // hatásköre ért. A csupasz (globális) alak csak akkor éri el a kérést, ha a művelet egyezik.
  if (ban.kind === 'operation') {
    const scope = parseOperationScope(target);
    const opHit = scope.opClass === String(asked).trim();
    if (!opHit) return Object.freeze({ reaches: false, decidable: true, reason: 'ban_other_opClass' });
    if (scope.global) return Object.freeze({ reaches: true, decidable: true, reason: 'ban_scope_operation' });
    const askedBook = request ? request.bookId : undefined;
    if (askedBook === undefined || askedBook === null || String(askedBook).trim() === '') {
      return Object.freeze({
        reaches: true, decidable: false, reason: 'ban_target_undecidable',
        message: 'a művelet-tiltás a(z) `' + scope.bookId + '` könyvre korlátozott, a kérés viszont nem '
          + 'hordozza a `bookId` megkülönböztetőt — így nem dönthető el, hogy ez a kérés érintett-e. '
          + 'A hozzáférés zárva marad; a pontos válaszhoz a hívó adja meg a könyvet.',
      });
    }
    const bookHit = scope.bookId === String(askedBook).trim();
    return Object.freeze({
      reaches: bookHit, decidable: true,
      reason: bookHit ? 'ban_scope_operation' : 'ban_other_bookId',
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
    // R75/F04 — A TÁROLT REKORD INTEGRITÁSA ELŐBB DŐL EL, MINT A HATÓKÖRE. Az eldönthetetlen sor
    // valódi hatóköre épp az, amit nem tudunk, ezért a „más könyvre szól" következtetés sem tehető
    // meg róla: a kapu a hatókör-értékelés ELŐTT áll, és három KÜLÖN nevezett választ ad.
    const integrity = banRecordIntegrity(row);
    if (integrity) {
      return Object.freeze({
        banned: true, reason: integrity.reason, decidable: false,
        id: row.id, kind: row.kind, cause: row.cause, since: row.banned_at,
        message: integrity.message,
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
