// V3 MAGREFERENCIA — BAN-01/író: A CÉLZOTT TILTÁS KIADÁSA (REV-N5a · REV-N5b).
//
// EZ A MODUL ÍR. Az olvasó oldal (fajták · okok · hatókör · hatályosság · integritás) a
// `banScope.mjs`-ben él; a TELJES végrehajthatósági döntés az `authority.mjs`-ben
// (`executableRightAt`). A függőség egyirányú: `banScope` → `authority` → `ban`.
//
// MIÉRT EZ A SORREND (R75/F01 · F03, D-VS-3021). Az R73-as alakban az olvasó és az író egy fájlban
// állt, ezért az `authority.mjs` nem hívhatta a tiltás-feloldót (kör lett volna) — a kiadási út így
// CSAK a nyers hatásköri sort nézte. Mérve: egy MÁR LETILTOTT `judge` sikeresen tiltott. A kiadás
// tehát HARMADIK engedő úttá vált, ami nem teljesítette a REV-N5a-t. A javítás nem egy újabb
// ellenőrzés a hívóban, hanem a függőség irányának megfordítása: a kiadás ugyanazt a TELJES döntést
// kéri, amit a hatásköri olvasó út.
//
// A RÉGI NEVEK TOVÁBBADÁSA. A `banScope.mjs` exportjait ez a modul RE-EXPORTÁLJA, mert a korábbi
// hívók (és a külső fél rögzített programjai) innen kérik. Ez nem második otthon: definíció csak
// egy helyen van, és az irány egyirányú (KUKA-018).

import { withTransaction } from './store.mjs';
import { executableRightAt } from './authority.mjs';
import { kindForCause, banKind, KNOWN_BAN_CAUSES, operationScopeRef } from './banScope.mjs';

export {
  KNOWN_BAN_KINDS, KNOWN_BAN_CAUSES, banKind, kindForCause, banRequestFor, banReaches,
  banEffectiveAt, banRecordIntegrity, operationScopeRef, parseOperationScope,
} from './banScope.mjs';

// ═══ A KIADHATÓ HATÓKÖR A KIADÓ HATÁSKÖRÉBŐL — ÉS CSAK ABBÓL (REV-N5b, R75/F02) ════════════════
//
// A könyvre szóló `alter_right` hatáskörből KÖNYV-hatókörű tiltás következik. A személy, a
// hitelesítő, a jogalap és az adatkör tiltása SZÉLESEBB a jogcímnél; a művelet-tiltás pedig csak
// akkor adható ki, ha a tárolt cél MAGA is a könyvre korlátozza (`operationScopeRef`) — különben a
// „könyv-hatókörű" elnevezés mellett a rekord globálisan hatna (R75/F02).
const BOOK_SCOPED_KINDS = Object.freeze(['book', 'operation']);

const said = (v) => (v === undefined || v === null ? '' : String(v).trim());

/**
 * A TILTÁS KIADÁSÁNAK EGYETLEN BEJÁRATA.
 *
 * Az `imposeBan` UGYANEZT hívja — nincs „alacsonyabb szintű", gyengébb szerződésű író (R75/F03).
 * A tesztadat-építés nem ezen az úton megy: az a tárolóba ír közvetlenül, és FIXTÚRÁNAK nevezzük.
 */
export function issueBan({ store, clock, subjectId, cause, targetRef, actorSubjectId, bookId, credentials }) {
  const actor = said(actorSubjectId);
  if (!actor) {
    return Object.freeze({
      ok: false, reason: 'actor_missing',
      message: 'a célzott tiltás JOGVÁLTOZTATÁS: meg kell nevezni, KI adja ki (REV-N3a).',
    });
  }
  const book = said(bookId);
  if (!book) {
    return Object.freeze({
      ok: false, reason: 'authority_book_required',
      message: 'meg kell nevezni, MELYIK könyvön áll fenn az eljáró `alter_right` hatásköre — a '
        + 'hatáskör könyvenként és műveletenként adott, nem általános (R73/C-F03).',
    });
  }

  // (1) A TELJES DÖNTÉS — tiltás ÉS hatáskör, egy rétegből (R75/F01). A nyers hatásköri sor
  //     olvasása itt TILOS: az a döntésnek csak a fele, és épp a kiadó SAJÁT tiltása maradna ki.
  const right = executableRightAt({
    store, subjectId: actor, bookId: book, operation: 'alter_right', nowIso: clock.now(), credentials,
  });
  if (!right.ok) return Object.freeze({ ok: false, reason: right.reason, message: right.message });

  // (2) AZ OK ISMERT-E — az OK választja a FAJTÁT, a fajta a hatókört (REV-N5b).
  const kind = kindForCause(cause);
  if (!kind) {
    return Object.freeze({
      ok: false, reason: 'ban_cause_unknown',
      message: `ismeretlen tiltás-ok ("${cause}") — a zárt halmaz: ${KNOWN_BAN_CAUSES.join(', ')}. `
        + 'Az OK választja ki a tiltás FAJTÁJÁT és ezzel a hatókörét (REV-N5b); ok nélkül a hatókör '
        + 'nem vezethető le, és „általánosat" nem tételezünk fel.',
    });
  }

  // (3) A KÉRT HATÓKÖR BELEFÉR-E A KIADÓ HATÁSKÖRÉBE.
  if (!BOOK_SCOPED_KINDS.includes(kind)) {
    return Object.freeze({
      ok: false, reason: 'ban_wider_than_authority',
      message: `a(z) "${cause}" ok "${kind}" fajtájú tiltást jelent, ami TÚLMUTAT a(z) "${book}" `
        + 'könyvre szóló hatáskörön: a személy, a hitelesítő, a jogalap és az adatkör tiltása nem '
        + 'következik egy könyv gazdálkodási jogából. Ehhez külön, nevesített hatáskör kell — a '
        + 'könyvgazda más, független könyvek felett nem kap hallgatólagos hatalmat (R73/C-F03).',
    });
  }
  if (kind === 'book' && said(targetRef) !== book) {
    return Object.freeze({
      ok: false, reason: 'ban_target_outside_authority',
      message: `a hatáskör a(z) "${book}" könyvre szól, a tiltás viszont "${said(targetRef)}"-t `
        + 'nevez meg. Idegen könyvre nem adható ki tiltás ezzel a jogcímmel.',
    });
  }

  // (4) A TÁROLT CÉL MAGA HORDOZZA A HATÓKÖRT (R75/F02). A művelet-tiltás célja a KÖNYV és a
  //     MŰVELET együtt — így a független könyvben ugyanaz a művelet érintetlen marad.
  const shape = banKind(kind);
  if (shape.discriminator !== null && said(targetRef) === '') {
    return Object.freeze({
      ok: false, reason: 'ban_target_required',
      message: `a(z) "${cause}" ok "${kind}" fajtájú tiltást jelent (${shape.meaning}), ezért meg kell `
        + `nevezni, MIRE szól (\`targetRef\` = a kérés \`${shape.discriminator}\` értéke).`,
    });
  }
  const storedTarget = kind === 'operation'
    ? operationScopeRef(book, said(targetRef))
    : (shape.discriminator === null ? null : said(targetRef));

  const nowIso = clock.now();
  return withTransaction(store.db, () => {
    store.run(
      `INSERT INTO subject_ban (subject_id, kind, cause, target_ref, actor_subject_id, banned_at)
       VALUES (?,?,?,?,?,?)`,
      subjectId, kind, cause, storedTarget, actor, nowIso);
    return Object.freeze({ ok: true, kind, cause, target_ref: storedTarget, banned_at: nowIso });
  });
}

/**
 * A KORÁBBI NÉV — UGYANAZ A SZERZŐDÉS (R75/F03).
 *
 * A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL). Az `imposeBan` „alacsony szintű íróként" volt
 * exportálva, és megkerülte az `issueBan` hatókör-kapuját: az A könyvre jogosult eljáró vele a B
 * könyvre is kiadhatott tiltást, és a dolgozó ott TÉNYLEGESEN elvesztette a hozzáférését. A modul
 * KOMMENTJE azt állította, hogy ez belső — **a komment nem hozzáférésvédelem** (KUKA-015).
 *
 * Ezért nincs többé két szerződés: ez a név ugyanazt a teljes műveletet végzi. Nem törlöm, mert a
 * rögzített külső programok és a korábbi hívók innen kérik — de gyengébb utat nem kínál.
 */
export const imposeBan = issueBan;
