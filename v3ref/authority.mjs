// V3 MAGREFERENCIA — A HATÁSKÖR-SOR ÉRTÉKELÉSE, EGY OTTHONBAN (AUT-01, D-VS-3020).
//
// MIÉRT SZÜLETETT (R73/C-F03). Az `imposeBan` a hatáskör helyén egy BEMONDHATÓ igaz/hamis értéket
// nézett (`authorityOk === true`), és a hatáskört soha nem oldotta fel. Mérve: egy `outsider`,
// akinek NULLA hatásköri rekordja van, `authorityOk: true` mellett sikeresen tiltott — a célszemély
// hozzáférése tényleg megszűnt. Ez a KUKA-121/122 családja: amit a hívó BEGÉPELHET, az ÁLLÍTÁS.
//
// A JAVÍTÁS SZERKEZETI AKADÁLYA — ÉS MIÉRT NEM INDOK. A feloldás az `adjudication.mjs`-ben élt, az
// viszont a `ban.mjs`-t importálja, tehát a fordított irányú import KÖRT csinálna. A külső fél ezt
// előre kimondta: *„A függőségi kör szerkezeti feladat, nem indok az ellenőrzés elhagyására."*
// Ezért a hatáskör-sor ÉRTÉKELÉSE ide költözött, egy semleges modulba, amit MINDKÉT oldal importál:
// az `adjudication.mjs` (a saját jog-feloldójában) és a `ban.mjs` (a kiadáskor). A szabály így nem
// két másolatban él (KUKA-003), és a kör megszűnt.
//
// 2026-09-14 (R75/F01, D-VS-3021) — EZ A MODUL MOST MÁR TILTÁST IS NÉZ, ÉS EZ A LÉNYEG.
// Az R73-as alak szándékosan NEM nézett tiltást („a tiltás-kapu az engedő utak saját első
// kérdése") — és pont ez volt a hiba: a tiltás KIADÁSA is engedő út, csak nem ismertük el annak.
// Aki a nyers hatásköri sort olvassa, az a döntésnek CSAK A FELÉT kapja meg; a másik fele (a
// kiadó SAJÁT tiltásai) némán kimarad. Ezért a TELJES döntés ide költözött, és a tiltás-feloldót
// egy olyan modulból hívjuk (`banScope.mjs`), ami semmit nem importál vissza — a kör megszűnt,
// nem megkerülve, hanem a függőség IRÁNYÁNAK megfordításával.

import { instantMs, withTransaction } from './store.mjs';
import { banEffectiveAt, banRequestFor } from './banScope.mjs';

export const ADJUDICATION_OPS = Object.freeze(['suspend', 'adjudicate', 'alter_right']);

export const OP_MEANING = Object.freeze({
  suspend: 'tagság felfüggesztése',
  adjudicate: 'beadvány elbírálása',
  alter_right: 'jog megváltoztatása',
});

/**
 * A HATÁSKÖR-SOR ÉRTÉKELÉSE. Csak a rekordot és az időt nézi — a hívó dolga a tiltás-kapu és a
 * művelet-név ellenőrzése (azt az `adjudication.mjs` végzi a saját bejáratán).
 *
 * @returns {{ok:true, granted_at:string} | {ok:false, reason:string, message:string}}
 */
export function authorityRowAt({ store, subjectId, bookId, operation, nowIso }) {
  const who = String(subjectId || '').trim();
  const now = instantMs(nowIso);
  if (!now.ok) return { ok: false, reason: `clock_${now.reason}`, message: 'az óra nem értelmezhető' };

  const row = store.get(
    'SELECT * FROM adjudication_authority WHERE subject_id = ? AND book_id = ? AND operation = ?',
    who, bookId, operation);
  if (!row) {
    return {
      ok: false,
      reason: 'authority_not_established',
      message: `"${who}" nem rendelkezik ${operation} hatáskörrel ezen a könyvön `
        + `(${OP_MEANING[operation] || operation}). A tagság — akár admin — ehhez nem elég: a `
        + 'hatáskör MŰVELETENKÉNT adott.',
    };
  }
  if (row.revoked_at !== null && row.revoked_at !== undefined) {
    const rev = instantMs(row.revoked_at);
    if (!rev.ok) {
      return { ok: false, reason: 'authority_revocation_undecidable', message: 'a hatáskör megvonásának ideje nem értelmezhető' };
    }
    if (rev.ms <= now.ms) {
      return { ok: false, reason: 'authority_revoked', message: `"${who}" ${operation} hatásköre vissza lett vonva` };
    }
  }
  const from = instantMs(row.granted_at);
  if (!from.ok) {
    return { ok: false, reason: 'authority_grant_undecidable', message: 'a hatáskör keletkezésének ideje nem értelmezhető' };
  }
  if (from.ms > now.ms) {
    return { ok: false, reason: 'authority_not_yet_effective', message: 'a hatáskör még nem hatályos' };
  }
  return { ok: true, granted_at: row.granted_at };
}

// ═══ A TELJES VÉGREHAJTHATÓSÁGI DÖNTÉS — EGY RÉTEG, AMIBŐL A KIADÁS SEM MARAD KI (R75/F01) ═════
//
// A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL, R75/F01). A `judge` A könyvön `alter_right` hatáskörrel
// rendelkezett, de UGYANARRA a könyvre hatályos tiltása volt. Az `adjudicationRightAt` helyesen
// `allowed:false, ban_scope_book` választ adott — ugyanő viszont az `issueBan`-nal SIKERESEN
// letiltotta a dolgozót, mert a kiadási út csak az `authorityRowAt`-et hívta.
//
// A HIBA OSZTÁLYA: nem az AUT-01 volt hibás, hanem az, hogy a HÍVÓ tette hozzá (vagy nem tette
// hozzá) a hiányzó felét. Ez a KUKA-039 („fél őr") és a KUKA-132 együtt: a döntést két darabra
// vágtam, és a második darab összerakását a hívóra bíztam — ami pontosan ugyanaz a szerkezet, mint
// a `authorityOk` bemondás, csak eggyel följebb.
//
// EZÉRT A DÖNTÉS EGÉSZBEN ÁLL ITT, és minden hatáskör-igényes út EZT hívja: a művelet neve · az
// eljáró megléte · az óra · a TILTÁS · a hatásköri sor. Aki ezt megkerüli és a `authorityRowAt`-et
// hívja közvetlenül, az fél döntést kap — ezt gépi jel méri (`verify:v3ref`, M73).
//
// A SORREND KIMONDOTT: a tiltás ELŐBB dől el, mint a hatáskör. Így a tiltott eljáró ugyanazt a
// választ kapja, akár van hatásköre, akár nincs — a különbség nem szivárog ki (KUKA-084).
/**
 * @returns {{ok:true, granted_at:string} | {ok:false, reason:string, message:string}}
 */
export function executableRightAt({ store, subjectId, bookId, operation, nowIso, credentials }) {
  if (!ADJUDICATION_OPS.includes(operation)) {
    return {
      ok: false,
      reason: 'unknown_adjudication_op',
      message: `ismeretlen hatáskör-igényes művelet ("${operation}") — a zárt halmaz: ${ADJUDICATION_OPS.join(', ')}`,
    };
  }
  const who = String(subjectId || '').trim();
  if (!who) {
    return {
      ok: false,
      reason: 'actor_missing',
      message: 'a művelet ELJÁRÓ ALANYT igényel: meg kell mondani, KI végzi. A hatáskör nem a hívás '
        + 'tényéből jön (REV-N3a).',
    };
  }
  const now = instantMs(nowIso);
  if (!now.ok) return { ok: false, reason: `clock_${now.reason}`, message: 'az óra nem értelmezhető' };

  // REV-N5a — A TILTÁS MINDEN ENGEDŐ ÚTON HAT, A KIADÁSI ÚTON IS.
  const ban = banEffectiveAt({
    store, subjectId: who, nowIso, request: banRequestFor({ bookId, opClass: operation }, credentials),
  });
  if (ban.banned) {
    return {
      ok: false,
      reason: ban.reason,
      message: ban.message
        || `"${who}" ellen célzott tiltás van hatályban, ezért hatásköri művelet nem végezhető`,
    };
  }
  return authorityRowAt({ store, subjectId: who, bookId, operation, nowIso });
}

// ═══ EFF-01 — A HATÁLYOSULÁS PONTJA: A DÖNTÉS ÉS A RÖGZÍTETT HATÁS EGY IDŐPONTON (R77/F01) ══════
//
// A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL, R77/F01). Mind a három hatáskör-igényes író KÉTSZER
// olvasta az órát: egyszer a DÖNTÉSHEZ, egyszer a rögzített hatás IDŐBÉLYEGÉHEZ. Mérve: a
// felhatalmazás 08:00:01-kor megszűnik, az első óraolvasás 08:00:00, a második 08:00:02 — a művelet
// SIKERES, és az új hatást 08:00:02-es idővel rögzíti. A tárolóban ezután olyan hatás áll, amit a
// SAJÁT könyvünk szerint a rögzítés pillanatában már senki nem volt jogosult létrehozni.
//
// A HIBA OSZTÁLYA: KÉT KÜLÖN TÉNY EGY NÉVEN (KUKA-002 az IDŐ tengelyén). A „mikor döntöttünk" és a
// „mikor lett a hatás" két külön pillanat volt, és a rekord a MÁSODIKAT viseli, miközben az ELSŐ
// igazolta. A jog viszont nem áll meg a döntésnél: aki visszavonta, azt a rögzítés ELŐTT vonta
// vissza. Ez a KUKA-024 (a viszonyt kell mérni, nem az oldalakat): mindkét óraolvasás helyes volt
// önmagában, a hiba a KETTŐ KÖZTI résben élt, amit forrás-olvasó pin sosem lát.
//
// A SZERZŐDÉS, KIMONDVA — KÉT PONT, NEM VÉGTELEN ÚJRAOLVASÁS:
//   1. BEBOCSÁTÁS (tranzakción kívül): akinek most sincs joga, az be sem lép. Ez nem ugyanaz a tény,
//      mint a 2. pont (KUKA-124 kérdése: eldöntötte-e már egy korábbi kapu?) — a jog a kettő közt
//      MEGVÁLTOZHAT, tehát a bebocsátás nem helyettesíti a hatályosulást, és fordítva sem.
//   2. HATÁLYOSULÁS (a tranzakción BELÜL): EGYETLEN óraolvasás, és UGYANAZ az időpont hordozza a
//      döntést ÉS a rögzített hatást. Ez a codebase saját, R51/J1-ben megtanult fegyelme
//      („minden KIADÁS a saját írás-tranzakcióján BELÜL kérdezi meg a mai jogot") — most az ÍRÓ
//      oldalra is kiterjesztve, mert a szabály a hiba OSZTÁLYÁRA szól, nem arra a rétegre, ahol
//      először láttuk (KUKA-051).
//
// A VISSZAMÉRHETŐ INVARIÁNS (ez a próba mércéje, nem az óra alakja): minden rögzített hatásra igaz,
// hogy a SAJÁT időbélyegén újraértékelve az eljáró joga fennállt. Ha a hatályosulás tilt, NULLA
// üzleti mellékhatás marad — a hatás-visszahívás meg sem hívódik.
//
// MIÉRT ITT LAKIK. Mind az öt hatáskör-igényes író (`issueBan` · `suspendMembership` ·
// `liftSuspension` · `adjudicateClaim` · `revokeMembership`) ezt hívja. Ha a szabály öt helyen
// KELL, akkor nem ötször megírni kell, hanem KÖZÖS OTTHONBA tenni (KUKA-129); a pin pedig ezt a
// belépési pontot HÍVJA, nem a forrás szövegét olvassa (KUKA-009).
/**
 * @param effect  visszahívás — a hatást ÍRÓ rész; megkapja a hatályosulás időpontját (`at`).
 *                SOHA nem olvashat órát: amit kap, az a hatályosulás pillanata.
 *
 * A mező neve `authorized`, nem „megtörtént": ez a feloldó a HATÁSKÖRI döntésről felel, arról nem,
 * hogy a hatás üzletileg létrejött-e. A `value`-ban a visszahívás saját (akár elutasító) válasza áll
 * — így a bemeneti hiba nem álcázódik hatásköri hibának, és fordítva sem (KUKA-020).
 *
 * @returns {{authorized:true, at:string, right:object, value:*}
 *          | {authorized:false, at:null, right:{ok:false, reason:string, message:string}, stage:'admission'|'effectuation'}}
 */
export function effectuate({ store, clock, subjectId, bookId, operation, credentials }, effect) {
  return effectuateWith({
    store,
    clock,
    basis: 'authority',
    decide: (nowIso) => executableRightAt({ store, subjectId, bookId, operation, nowIso, credentials }),
  }, effect);
}

// ═══ R79/F02 — A HATÁLYOSULÁS MECHANIKÁJA KÖZÖS, A JOGOSULTSÁG-FAJTA NEM ═══════════════════════
//
// A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL, R79/F02). Az EFF-01 az öt HATÁSKÖRI írót védte. A
// `submitCommand` viszont TAGSÁGI jogon működő, külön író maradt: a jogértékelés, a `finalized_at`
// és a nyugta három külön óraolvasáson állt. Mérve: a tagság 08:00:01-kor megszűnik, az első kilenc
// óraolvasás 08:00:00, a többi 08:00:02 — a parancs `finalized` lesz, `finalized_at = 08:00:02`,
// amely időpontra a `rightAt` MÁR TILTJA az eljárót.
//
// AMIT NEM SZABAD: összemosni a két jogosultság-fajtát. A tagsági jog (ki tagja ennek a könyvnek) és
// a hatásköri jog (ki járhat el ebben a műveletben) KÉT külön tény, két külön feloldóval — ha egy
// névre kerülnének, az pont a KUKA-002 lenne, csak nagyban.
//
// EZÉRT A SZÉTVÁLASZTÁS KIMONDOTT, ÉS A KÉRDÉSÜKRE („melyik réteg birtokolja az atomi határt?") EZ
// A VÁLASZ:
//
//   · AZ ATOMI HATÁRT EZ A RÉTEG BIRTOKOLJA (`effectuateWith`): ő nyitja a tranzakciót, ő olvassa
//     az órát EGYSZER, és ő adja tovább ugyanazt az `at`-ot a döntésnek ÉS a hatásnak;
//   · A JOG-FELOLDÓ (`decide`) UGYANANNAK A DÖNTÉSI IDŐNEK A FOGYASZTÓJA: `nowIso`-t KAP, nem
//     olvas órát — tehát a fajtája szabadon más lehet (hatásköri vagy tagsági), a hatályosulás
//     szabálya mégis EGY.
//
// A `decide` INJEKTÁLT, nem behúzott: a tagsági feloldó az `authz.mjs`-ben él, ami EZT a modult
// húzza be — a fordított irányú behúzás kört csinálna (KUKA-003). A hívó adja át; a bekötést a
// mérés kéri számon, nem a jóindulat.
/**
 * @param basis   a jogosultság FAJTÁJA, NÉVVEL (`authority` | `membership`) — a válaszban is ott áll,
 *                hogy a hívó és a próba is meg tudja különböztetni, MI döntött (KUKA-062: a jog-alapot
 *                nevezni kell, nem igennel-nemmel felelni).
 * @param decide  (nowIso) => {ok:boolean, reason?:string, message?:string} — TISZTA döntés egy ADOTT
 *                időpontra. SOHA nem olvashat órát.
 */
export function effectuateWith({ store, clock, basis, decide }, effect) {
  // (1) BEBOCSÁTÁS — a mai jog a hívás pillanatában.
  const admission = decide(clock.now());
  if (!admission.ok) {
    return Object.freeze({ authorized: false, at: null, right: admission, basis, stage: 'admission' });
  }

  // (2) HATÁLYOSULÁS — a tranzakción BELÜL, EGYETLEN óraolvasásból.
  //
  // A TRANZAKCIÓT A TÁROLÓ SAJÁT KAPUJÁN NYITJUK (`store.tx`), NEM a `withTransaction` közvetlen
  // hívásával. Ez a SAJÁT SÖPRÉSEM lelete az R79-ben, és fogalmi, nem stiláris:
  //
  //   `store.tx(fn)` ≡ `withTransaction(store.db, fn)` — UGYANAZ a határ, KÉT néven. Az R77-es
  //   alakom a másodikat hívta, tehát az öt hatásköri író tranzakció-HATÁRA kikerült a tároló
  //   kapuja mögül. A `P-CMD-finalize-gate` próba épp ezen a kapun méri a „megvonás a tranzakció
  //   BELÉPÉSÉNÉL" esetet — és amint a parancs-írót is ide kötöttem, a próba ELVESZTETTE a mérési
  //   pontját: nem a kód romlott el, hanem a MÉRÉS VAKULT MEG (KUKA-018: ahol egy fogalomnak két
  //   ábrázolása van, a kérdés az, MELYIKET olvassa a fogyasztó — itt: melyiket látja a mérő).
  //
  // Egy fogalom, EGY ajtó (KUKA-003). Így a hatályosulási pont minden fogyasztója ugyanazon a
  // határon megy át, és aki a határt méri, MINDET látja.
  return store.tx(() => {
    const at = clock.now();
    const right = decide(at);
    if (!right.ok) return Object.freeze({ authorized: false, at: null, right, basis, stage: 'effectuation' });
    return Object.freeze({ authorized: true, at, right, basis, value: effect({ at, right }) });
  });
}
