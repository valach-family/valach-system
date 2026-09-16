/** AUT-01 — A HOZZÁFÉRÉSI KAPU: A JOG ELŐBB DÖNT, ÉS A TILTOTT VÁLASZ EGYFORMA (R16/F16-01).
 *
 * MIÉRT SZÜLETETT. A külső fél R16-os mérése a bevét-úton kimutatta, hogy a CIKK FELOLDÁSA a
 * jogosultsági döntés ELŐTT futott. Tagság nélküli hívó ezért KÜLÖNBÖZŐ választ kapott aszerint,
 * hogy a hivatkozott objektum nem létezik (`unknown_item`) vagy egy MÁSIK könyvben létezik
 * (`item_belongs_to_another_book`) — és a részlet még a másik könyvet is megnevezte. Két csatornán
 * szivárgott ugyanaz a védett tény: a HIBAKÓD különbségén és a RÉSZLET tartalmán.
 *
 * Ez a KUKA-083/084 alakja a főkönyvön: *ahol egy elutasítás INDOKA idegen tény, ott maga az
 * ELUTASÍTÁS a szivárgás* — és a javítás nem a részlet törlése, mert a kód-különbség maga hordozza
 * a bitet. A kaput ÁT KELL TENNI a döntési lánc elejére.
 *
 * MIT ÍGÉR — ÉS MIT NEM.
 *   · ÍGÉRI: jogosulatlan hívó UGYANAZT a választ kapja, akármilyen objektumra hivatkozik; a válasz
 *     nem mond semmit arról, hogy az objektum létezik-e, és ha igen, hol. A válasz-OBJEKTUM
 *     ugyanaz a fagyasztott érték, tehát bájtra sem tér el (a mezők sorrendje sem).
 *   · ÍGÉRI: a valódi ok NEM vész el — BEFELÉ, tartós sorba kerül (`access_refusal`), a tranzakción
 *     KÍVÜL (KUKA-026), és ott meg is NEVEZHETŐ (KUKA-058: ahol a válasz szándékosan egyforma, ott
 *     a naplónak kell beszélnie).
 *   · NEM ÍGÉRI: hogy ez helyettesíti a tranzakción BELÜLI jogellenőrzést. Ez a kapu a tranzakció
 *     ELŐTT áll, tehát a kettő közt a jog még megszűnhet; a `submitCommand` ezért a véglegesítés
 *     előtt ÚJRA kérdez (KUKA-124/1: a már eldöntött tényt mérő ellenőrzés nem véd — de ez a kettő
 *     KÉT KÜLÖNBÖZŐ időpontra szól, tehát nem ugyanaz a tény).
 *   · NEM ÍGÉRI: sebesség-korlátot, és nem bizonyítja a hívó AZONOSSÁGÁT — azt a hitelesítés adja
 *     (AUTH-01). Ez a modul azt dönti el, hogy a MÁR HITELESÍTETT alany mit tehet ebben a könyvben.
 */
import { rightAt } from './authz.mjs';

/**
 * A KIFELÉ MENŐ, EGYFORMA ELUTASÍTÁS — EGY fagyasztott érték, EGY otthonban.
 *
 * Ugyanez az alak megy a parancs-úton is (`command.mjs`), hogy a két út ne tudjon elcsúszni
 * (KUKA-039). A KÜLÖNBSÉG önmagában csatorna: ha a bevét-út és a parancs-út MÁS mondattal tiltana,
 * a hívó abból is következtethetne, meddig jutott.
 */
export const ACCESS_REFUSED = Object.freeze({
  ok: false,
  error: 'not_available',
  message: 'ehhez a művelethez most nincs jogod ebben a könyvben',
  effect_id: null,
  state: null,
});

/**
 * A BELSŐ NYOM. NEM kiadható, és nem is opcionális: ha az írás elhasal, DOBUNK — a néma, nyom
 * nélküli tiltás pontosan az az állapot, ami miatt ez a tábla létezik (KUKA-020: a programhiba ne
 * fordulhasson ugyanarra a „nem"-re, mint a valódi nemleges válasz).
 */
export function recordRefusal(store, { at, subjectId, bookId, opClass, operation, reason, detail }) {
  store.run(
    'INSERT INTO access_refusal (at, subject_id, book_id, op_class, operation, reason, detail)'
    + ' VALUES (?,?,?,?,?,?,?)',
    at, String(subjectId), String(bookId), String(opClass), String(operation),
    String(reason || 'unknown'), detail === undefined || detail === null ? null : String(detail));
}

/**
 * A BELSŐ NAPLÓ OLVASÓJA. Azért van, mert az írás-csak mező nem szerződés, hanem dísz — minden
 * írt tényre meg kell kérdezni, KI OLVASSA (KUKA-069 · KUKA-126). Ez az olvasó ÜZEMELTETŐI út:
 * a kiadási lánc (`readCommandResult` · `resultReleasable`) sehol nem hívja.
 */
export function recentRefusals(store, { subjectId = null, bookId = null, limit = 50 } = {}) {
  const where = []; const params = [];
  if (subjectId !== null) { where.push('subject_id = ?'); params.push(String(subjectId)); }
  if (bookId !== null) { where.push('book_id = ?'); params.push(String(bookId)); }
  const sql = 'SELECT * FROM access_refusal'
    + (where.length ? ` WHERE ${where.join(' AND ')}` : '')
    + ' ORDER BY id DESC LIMIT ?';
  return store.all(sql, ...params, Number(limit));
}

/**
 * A KAPU. A hívási lánc ELSŐ lépése — a bemeneti séma ELŐTT is.
 *
 * MIÉRT A SÉMA ELŐTT. Ha a séma-ellenőrzés előbb futna, a jogosulatlan hívó a válasz FAJTÁJÁBÓL
 * (`validation` vs. `not_available`) megtudná, hogy a beadott alak megfelel-e a művelet sémájának —
 * vagyis a művelet szerződése próbálgatható lenne. Ez gyengébb szivárgás, mint az objektum-létezés,
 * de ugyanaz az osztály, és a sorrend megfordítása semmibe nem kerül: a JOGOS hívó ugyanúgy
 * megkapja a részletes `validation` választ, mert ő átmegy a kapun.
 *
 * @returns {{ok:true, at:string}} vagy a fagyasztott `ACCESS_REFUSED`.
 */
export function authorizeBookAction({
  store, actor, bookId, opClass, operation, clock, nowIso, externalEvidence, credentials,
}) {
  const at = nowIso ?? clock.now();
  const right = rightAt({ store, subjectId: actor, bookId, opClass, clock, nowIso: at, externalEvidence, credentials });
  if (right.allowed) return Object.freeze({ ok: true, at });

  recordRefusal(store, {
    at, subjectId: actor, bookId, opClass, operation,
    reason: right.reason || 'not_allowed',
    detail: right.message || null,
  });
  return ACCESS_REFUSED;
}

export const AUT_CONTRACT = Object.freeze({
  id: 'AUT-01',
  title: 'A hozzáférési kapu: a jog előbb dönt, a tiltott válasz egyforma, a valódi ok befelé megy',
  entry: 'authorizeBookAction',
  refusal: 'ACCESS_REFUSED',
  internal_log: 'access_refusal',
  reader: 'recentRefusals',
  origin: 'R16/F16-01 (chatgpt-v3)',
});
