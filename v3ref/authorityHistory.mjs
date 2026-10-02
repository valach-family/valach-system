/** AHI-01 — A HATÁSKÖR TÖRTÉNETI FELOLDÁSA: A MÚLT FORRÁSA A NAPLÓ, NEM A MAI VETÜLET (R136/F136-01).
 *
 * A LELET (megtalálta: a KÜLSŐ ELLENŐRZŐ FÉL, chatgpt-v3, R136). Az R134-es alak a hatáskör-sort a
 * MAI vetületből (`adjudication_authority`) olvasta, aminek a kulcsa alany × könyv × művelet — tehát
 * EGY sor. Egy ÚJ időszakhoz tartozó, szabályos új megadás ezt a sort FELÜLÍRJA (`granted_at`,
 * `period_grant_event_id`), és ezzel a RÉGI időszak BELSEJÉRE adott válasz is megváltozott. Mérve,
 * változatlan termékkódon, ugyanazon a kérdésen:
 *
 *   · az új megadás ELŐTT:  ok:true  · period_binding:stamped · current_period:15
 *   · az új megadás UTÁN:   ok:false · reason:authority_not_yet_effective
 *
 * A HIBA OSZTÁLYA, KIMONDVA. Az R134 megépítette az append-only naplót
 * (`adjudication_authority_grant`), és a jelentés ezt a történeti igazság megőrzésének nevezte. A
 * napló PUSZTA LÉTE viszont nem őriz meg semmit, ha egyetlen olvasó sem olvassa: a történeti kérdés
 * továbbra is a vetületből indult. Ez a KUKA-118 alakja (a mag szerződése kész volt, a hívó nem adta
 * át) és a KUKA-122 alakja (a bizonyíték meglétét a bizonyíték HASZNÁLATÁVAL összemosni).
 *
 * A SZABÁLY: a MAI vetület GYORSÍTÓTÁR, a múlt forrása a napló. A vetület nem tűnik el és nem is
 * hazudik — csak nem ő dönt a múltról.
 *
 * KÉT TENGELY (REV-N2a, ugyanaz a szerződés, mint a tagságnál — `membershipPeriod.mjs`):
 *   · `validAt` — MELYIK időpont hatáskörét kérdezzük (HATÁLY: `granted_at`);
 *   · `knownAt` — MILYEN TUDÁSSAL kérdezzük (RÖGZÍTÉS: `recorded_at`) — ami ennél később került a
 *     naplóba, azt ez a válasz MÉG NEM ISMERI.
 *
 * PURE: csak olvas, nem ír. Órát nem hív — az időt a hívó adja. A `store.mjs`-en kívül SEMMIT nem
 * importál, tehát mindkét oldal behúzhatja, kör nélkül (ugyanaz a szerkezeti válasz, mint az
 * AUT-01-nél és az MPR-01-nél: „a függőségi kör szerkezeti feladat, nem indok az ellenőrzés
 * elhagyására").
 */
import { instantMs } from './store.mjs';

const frozen = (o) => Object.freeze(o);

/** A FELOLDÁS FORRÁSA — a válasz mindig MEGNEVEZI, melyik ágon állt (KUKA-012 · KUKA-049). */
export const AUTHORITY_AXIS = Object.freeze({
  /** a naplóban VAN a kérdezett időpontra illeszkedő megadás — ez a teljes alak */
  EVENT: 'grant_event',
  /** napló nélküli, CSAK a vetületben álló történeti sor (R134 előtti megadás) */
  PROJECTION_ONLY: 'projection_only',
});

/**
 * A HATÁSKÖRADÁS, AMI A KÉRDEZETT IDŐPONTBAN ÁLLT.
 *
 * @returns {{found:false, reason:string} |
 *           {found:true, axis:string, row:object, superseded:boolean,
 *            revocation_applies:boolean, revocation_known_for_event:boolean}}
 *
 * A `row` alakja a vetület sorának alakja (`granted_at` · `basis_id` · `basis_version` ·
 * `period_grant_event_id` · `revoked_at`), hogy a HÍVÓ logikája egy soron dolgozhasson, akármelyik
 * ágról jött — két külön alak előbb-utóbb elcsúszik (KUKA-003).
 */
export function authorityGrantAt({ store, subjectId, bookId, operation, validAt, knownAt }) {
  const who = String(subjectId || '').trim();
  const valid = instantMs(validAt);
  if (!valid.ok) return frozen({ found: false, reason: `valid_at_${valid.reason}` });
  const known = instantMs(knownAt);
  if (!known.ok) return frozen({ found: false, reason: `known_at_${known.reason}` });

  const projection = store.get(
    'SELECT * FROM adjudication_authority WHERE subject_id = ? AND book_id = ? AND operation = ?',
    who, bookId, operation) || null;

  const log = store.all(
    `SELECT * FROM adjudication_authority_grant
      WHERE subject_id = ? AND book_id = ? AND operation = ?
      ORDER BY id ASC`,
    who, bookId, operation) || [];

  // A KÉRDEZETT IDŐPONTRA ILLESZKEDŐ MEGADÁS: a LEGKÉSŐBBI olyan esemény, aminek a HATÁLYA már
  // beállt (`granted_at <= validAt`) ÉS amit a kérdés TUDÁSA már ismer (`recorded_at <= knownAt`).
  //
  // AZ ÉRTELMEZHETETLEN IDŐPONTOT NEM HAGYJUK KI NÉMÁN: egy rossz időbélyegű napló-sor nem
  // „nincs ilyen esemény", hanem eldönthetetlen — azt a hívó zárja le, nevezetten (KUKA-124/2).
  let chosen = null;
  let chosenIdx = -1;
  for (let i = 0; i < log.length; i += 1) {
    const g = instantMs(log[i].granted_at);
    const r = instantMs(log[i].recorded_at);
    if (!g.ok || !r.ok) return frozen({ found: false, reason: 'authority_log_instant_undecidable' });
    if (g.ms <= valid.ms && r.ms <= known.ms) { chosen = log[i]; chosenIdx = i; }
  }

  if (chosen) {
    // SUPERSEDED: van KÉSŐBBI, a kérdés tudása által MÁR ISMERT megadás. Ilyenkor a vetület MÁS
    // megadást hordoz, mint amit a kérdés talál — tehát a vetület `revoked_at`-ja NEM erre az
    // eseményre vonatkozik: a megadás a naplóban NULLÁRA állítja a vetület megvonását, így a
    // beolvasott `revoked_at` csak a KÉSŐBBI megadás után keletkezhetett (lásd a megadó út
    // `DO UPDATE SET revoked_at = NULL` ágát). Egy KÉSŐBBI jog megvonása nem nyúlhat vissza a
    // korábbi időszakra — pontosan ezt kérte az R136 kötelező tanúja.
    let laterKnownGrant = false;
    for (let i = chosenIdx + 1; i < log.length; i += 1) {
      const r = instantMs(log[i].recorded_at);
      if (r.ok && r.ms <= known.ms) { laterKnownGrant = true; break; }
    }
    const projMatches = projection !== null
      && String(projection.granted_at) === String(chosen.granted_at)
      && Number(projection.period_grant_event_id ?? -1) === Number(chosen.period_grant_event_id ?? -1);
    // A MEGVONÁS CSAK ARRA A MEGADÁSRA HAT, AMIT A VETÜLET ÉPP HORDOZ. Ahol a kérdés korábbi,
    // felülírt megadást talált, ott a megvonás TÉNYÉT erre az eseményre nem ismerjük — és ezt
    // KIMONDJUK (`revocation_known_for_event: false`), nem engedélyre és nem tiltásra fordítjuk.
    const revocationApplies = projMatches && !laterKnownGrant;

    // ═══ MELYIK SOR AZ OPERATÍV: A VETÜLET VAGY A NAPLÓ-ESEMÉNY ════════════════════════════════
    //
    // EZ A KÉRDÉS A SAJÁT SÖPRÉSEMEN BUKOTT EL (lelet: P-ORG-adjudication-basis-limit, R136 ·
    // KUKA-271). Az első alakom MINDIG a napló-eseményt adta vissza — és ezzel kinyitott egy
    // kiskaput, amit a mag próbája KÉSZEN mért: a `P-ORG-adjudication-basis-limit` NYERS
    // `UPDATE adjudication_authority SET basis_version = NULL|999|'nem-szam'` írásokkal ellenőrzi,
    // hogy a HASZNÁLATI kapu a megcsonkított alap-hivatkozást elutasítja. A napló ezeket a nyers
    // írásokat nem látja, tehát a kapu némán ÁTENGEDTE volna őket. Ez a KUKA-013: „az őr, ami csak
    // az egyik írót ismeri, nem őr" — a javításom egy MÁSIK írót tett láthatatlanná.
    //
    // A SZABÁLY, AMI MINDKETTŐT KISZOLGÁLJA: a vetület GYORSÍTÓTÁR, de az ÉLŐ generációról ő a
    // rögzített állapot. Ezért
    //   · ha a megtalált esemény UGYANAZ a generáció, amit a vetület hordoz → a VETÜLET sora az
    //     operatív: így a nyers írás (és a megvonás) LÁTSZIK, nem tűnik el a napló mögött;
    //   · ha a megtalált esemény egy KORÁBBI, felülírt generáció → a NAPLÓ sora az operatív, mert a
    //     vetület már egy MÁS generációról beszél (ez az F136-01 lelete).
    // A múlt forrása tehát a napló, a jelen rögzített állapota a vetület — és egyik sem írja felül
    // a másikat a maga hatókörén kívül.
    //
    // ÉS A HARMADIK ESET NEM NÉMA: ha a naplóban VAN illeszkedő esemény, de vetület EGYÁLTALÁN nincs
    // (nyers törlés), a kettő az ÉLŐ állapotról MOND ELLENT egymásnak. Ezt nem engedélyre fordítjuk
    // (KUKA-012): a hívó nevezetten zárja.
    if (!projection) {
      return frozen({ found: false, reason: 'authority_projection_missing' });
    }
    const operative = projMatches ? projection : {
      subject_id: chosen.subject_id,
      book_id: chosen.book_id,
      operation: chosen.operation,
      granted_at: chosen.granted_at,
      revoked_at: null,
      basis_id: chosen.basis_id ?? null,
      basis_version: chosen.basis_version ?? null,
      period_grant_event_id: chosen.period_grant_event_id ?? null,
    };
    return frozen({
      found: true,
      axis: AUTHORITY_AXIS.EVENT,
      source: projMatches ? 'projection_live_generation' : 'grant_log_superseded_generation',
      row: operative,
      superseded: laterKnownGrant,
      revocation_applies: revocationApplies,
      revocation_known_for_event: projMatches,
    });
  }

  // NINCS ILLESZKEDŐ NAPLÓ-SOR. KÉT KÜLÖN eset, és nem mossuk össze őket:
  //
  //  (a) a naplóban VAN sor, de MIND későbbi a kérdezett hatálynál/tudásnál → a kérdezett időpontban
  //      MÉG NEM volt megadás. A vetületre ilyenkor NEM esünk vissza: épp az a lelet, hogy a vetület
  //      egy KÉSŐBBI megadást hordoz. A hívó ezt `authority_not_yet_effective`-ként zárja.
  //
  //  (b) a naplóban NINCS sor (R134 ELŐTTI, csak vetületben álló történeti megadás) → a vetület az
  //      EGYETLEN tanú, és ezt az ág NEVE kimondja. Ez az R136 kikötése: „A korábbi, még csak
  //      vetületben tárolt sor történeti megőrzését is kezeld; a most hozzáadott napló nem
  //      tartalmazza automatikusan az összes régi sort." A visszaesés tehát KIMONDOTT kompatibilitási
  //      ág, nem néma nyelő tartalék (KUKA-117).
  if (log.length > 0) {
    return frozen({ found: false, reason: 'authority_not_yet_granted_at_that_time' });
  }
  if (!projection) return frozen({ found: false, reason: 'authority_not_established' });
  return frozen({
    found: true,
    axis: AUTHORITY_AXIS.PROJECTION_ONLY,
    source: 'projection_only_no_log',
    row: projection,
    superseded: false,
    revocation_applies: true,
    revocation_known_for_event: true,
  });
}
