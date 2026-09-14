// V3 MAGREFERENCIA — DSC-01: A KIADOTT EREDMÉNY ADATKÖRE (R77/F02).
//
// A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL, R77/F02). Egy parancs eredménye `{qty:1,
// unit_price:12345}` volt, az olvasót pedig az `arak` adatkörre TILTOTTUK. `dataScope: 'arak'`
// kontextussal a kiadás helyesen megtagadta; UGYANAZT az eredményt `dataScope: 'keszlet'`
// kontextussal viszont EGÉSZBEN visszaadta — az ÁRMEZŐVEL együtt. A tiltás tehát nem az adatra
// hatott, hanem egy CÍMKÉRE, amit a kérés hozott magával.
//
// A HIBA OSZTÁLYA: KÉT KÜLÖNBÖZŐ TÉNY EGY NÉVEN (KUKA-002). A `dataScope` a kérésben a
// HITELESÍTÉSI KONTEXTUS egyik tengelye („milyen körben lépek be"), az `arak` tiltásnak viszont
// arról kellene szólnia, hogy MILYEN ADAT jöhet ki. A kettő ugyanazt a szót viselte, ezért úgy
// nézett ki, mintha a védelem megvolna — miközben a kimenő tartalomhoz SEMMI nem volt kötve
// (KUKA-126: amit a küldő kiír és a fogadó nem mér, az dísz; itt a fogadó a ROSSZ dolgot mérte).
//
// A SZERZŐDÉS: A SZÜKSÉGES ADATKÖRT A TÍPUS DEKLARÁLJA, NEM A KÉRŐ MONDJA MEG. Amit a beadó
// begépelhet, az állítás, nem mérés (KUKA-121); ezért a kiadás azt kérdezi meg, hogy a KIADANDÓ
// EREDMÉNY mezői MELY adatkörökbe tartoznak — a rendszer saját, megbízható deklarációjából —, és
// MINDEGYIKRE külön megnézi, tilos-e az olvasónak.
//
// A BIZTONSÁGOS ALAPÉRTELMEZÉS: A VEGYES EREDMÉNY EGÉSZBEN MEGTAGADVA. Szabályos mezővetítés
// (csak-mennyiség válasz) ma NINCS a magreferenciában, és nem tettetjük, hogy van: amíg nem épül
// meg, a tiltott adatkört ÉRINTŐ eredmény nem megy ki részlegesen sem. Ezt a korlátot kimondjuk,
// nem elhallgatjuk (KUKA-015).
//
// A HIÁNYZÓ BESOROLÁS KÜLÖN VÁLASZ, ÉS ZÁR (KUKA-124/2). Ha a típus nincs deklarálva, vagy az
// eredmény olyan mezőt hoz, amit a deklaráció nem sorol be, az NEM „nincs korlátozás", hanem
// NEM TUDJUK — tehát nem adható ki. A kettőt nem mossuk össze a „nincs jogod" válasszal sem: a
// helye dönti el, melyik alakban jelenik meg (lásd a `command.mjs` két bekötését).

import { banEffectiveAt } from './banScope.mjs';

// ═══ A ZÁRT HALMAZ ══════════════════════════════════════════════════════════════════════════════
//
// `Map`, nem sima objektum — az örökölt kulcs (`toString`, `constructor`) nem tud „ismert
// adatkörré" oldódni (a Q07 tanulsága, ugyanúgy, ahogy a tiltás-fajtáknál).
export const KNOWN_DATA_SCOPES = Object.freeze(['keszlet', 'arak']);

const SCOPE_MEANING = new Map([
  ['keszlet', 'készlet-adat: mennyiség, cikkazonosító, tételsorok'],
  ['arak', 'ár-adat: egységár, listaár, árlista-hivatkozás'],
]);

// ═══ A TÍPUS DEKLARÁCIÓJA — MIT HORDOZHAT AZ EREDMÉNYE ═════════════════════════════════════════
//
// A kulcs a TÍPUS és a VERZIÓ együtt: egy típus új verziója új mezőket hozhat, és a besorolást
// akkor ÚJRA ki kell mondani — a régi deklaráció nem öröklődik hallgatólagosan.
//
// A besorolás a LEGFELSŐ SZINTŰ mezőn dől el, és a mező teljes részfája vele megy: egy
// `lines: [...]` alatt álló mennyiség ugyanabba az adatkörbe tartozik, mint maga a `lines`. Ez
// szándékos egyszerűsítés, és kimondott korlát: vegyes adatkörű RÉSZFA ma nem ábrázolható, mert
// ahhoz mezővetítés kellene, ami nincs megépítve.
const SEP = '';
const declKey = (type, typeVersion) => `${String(type ?? '')}${SEP}${String(typeVersion ?? '')}`;

const RESULT_FIELD_SCOPES = new Map([
  [declKey('stock.receipt', '1'), new Map([
    ['qty', 'keszlet'],
    ['sku', 'keszlet'],
    ['lines', 'keszlet'],
    ['price', 'arak'],
    ['unit_price', 'arak'],
    ['price_list', 'arak'],
  ])],
  [declKey('stock.issue', '1'), new Map([
    ['qty', 'keszlet'],
    ['sku', 'keszlet'],
    ['lines', 'keszlet'],
    ['price', 'arak'],
    ['unit_price', 'arak'],
    ['price_list', 'arak'],
  ])],
]);

/** A deklarált típusok listája — a nemleges válasz megnevezheti, mi közül lehet választani (KUKA-064). */
export const DECLARED_RESULT_TYPES = Object.freeze(
  [...RESULT_FIELD_SCOPES.keys()].map((k) => k.split(SEP).join('/')).sort());

/**
 * MELY ADATKÖRÖKET ÉRINTI EZ AZ EREDMÉNY — a TÍPUS deklarációjából, nem a kérésből.
 *
 * @returns {{ok:true, scopes:string[]}
 *          | {ok:false, reason:'result_scope_type_undeclared'|'result_scope_field_undeclared'|'result_not_an_object',
 *             message:string, fields?:string[]}}
 */
export function resultScopesOf({ type, typeVersion, result }) {
  const decl = RESULT_FIELD_SCOPES.get(declKey(type, typeVersion));
  if (!decl) {
    return Object.freeze({
      ok: false,
      reason: 'result_scope_type_undeclared',
      message: `a(z) "${type}" / "${typeVersion}" parancstípus eredményének ADATKÖRE nincs deklarálva. `
        + 'A kiadás nem tudja eldönteni, milyen adatot adna ki, ezért nem ad ki semmit. A ma deklarált '
        + `típusok: ${DECLARED_RESULT_TYPES.join(', ')}. Új típusnál a deklaráció a megépítés része `
        + '(DSC-01), nem utólagos ráadás.',
    });
  }
  if (result === null || typeof result !== 'object' || Array.isArray(result)) {
    return Object.freeze({
      ok: false,
      reason: 'result_not_an_object',
      message: 'a parancs eredménye nem mezőkre bontható objektum, ezért az adatköre nem sorolható be. '
        + 'A kiadás zárva marad; ez nem „üres eredmény", hanem el nem dönthető besorolás.',
    });
  }
  const fields = Object.keys(result);
  const undeclared = fields.filter((f) => !decl.has(f)).sort();
  if (undeclared.length) {
    return Object.freeze({
      ok: false,
      reason: 'result_scope_field_undeclared',
      fields: Object.freeze(undeclared),
      message: `a(z) "${type}" / "${typeVersion}" eredményében olyan mező áll, amit a deklaráció nem sorol `
        + `be adatkörbe: ${undeclared.join(', ')}. A be nem sorolt mező NEM „korlátozás nélküli": nem `
        + 'tudjuk, mi ez, ezért nem adjuk ki. A mezőt be kell sorolni a típus deklarációjába '
        + `(a zárt halmaz: ${KNOWN_DATA_SCOPES.join(', ')}).`,
    });
  }
  const scopes = [...new Set(fields.map((f) => decl.get(f)))].sort();
  return Object.freeze({ ok: true, scopes: Object.freeze(scopes) });
}

/**
 * KIADHATÓ-E EZ AZ EREDMÉNY ENNEK AZ OLVASÓNAK — a MÉRT adatkörökre mérve.
 *
 * A `request` a kérés egyéb tengelyeit hozza (könyv, művelet, hitelesítő, munkamenet, jogalap), hogy
 * a többi tiltás-fajta ne váljon eldönthetetlenné; a `dataScope` tengelyt viszont MINDIG a MÉRT
 * érték írja felül — épp ez a javítás lényege: nem a kérő címkéje dönt.
 *
 * @returns {{releasable:true, scopes:string[]}
 *          | {releasable:false, reason:string, message:string, scope?:string, scopes?:string[]}}
 */
export function resultReleasable({ store, subjectId, nowIso, type, typeVersion, result, request }) {
  const cls = resultScopesOf({ type, typeVersion, result });
  if (!cls.ok) return Object.freeze({ releasable: false, reason: cls.reason, message: cls.message });

  const base = request && typeof request === 'object' ? request : {};
  for (const scope of cls.scopes) {
    const ban = banEffectiveAt({
      store, subjectId, nowIso, request: { ...base, dataScope: scope },
    });
    if (ban.banned) {
      return Object.freeze({
        releasable: false,
        reason: ban.reason,
        scope,
        scopes: cls.scopes,
        message: `az eredmény a(z) "${scope}" adatkört is érinti (${SCOPE_MEANING.get(scope) || scope}), `
          + 'az olvasó pedig arra tiltott. A VEGYES eredményt egészben tagadjuk meg: szabályos '
          + 'mezővetítés ma nincs megépítve, félkész válasz pedig nem mehet ki. '
          + `${ban.message || ''}`.trim(),
      });
    }
  }
  return Object.freeze({ releasable: true, scopes: cls.scopes });
}
