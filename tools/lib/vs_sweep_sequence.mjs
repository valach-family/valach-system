// tools/lib/vs_sweep_sequence.mjs — SEQ-01: A SOROZAT-VEZÉRLŐ (F98-01/A, R98 · chatgpt-v3 lelete).
//
// A LELET. A söprés a maradványt FELJEGYEZTE, de a ciklust nem állította meg: az első feladat
// `cleanup.leftovers=true` eredménye után a MÁSODIK elindult, a hibakód csak a végén keletkezett, és
// a kijelzett számláló közben „2 zöld"-et mutatott. Vagyis a következő ellenőrzés egy olyan gépen
// mért, amelyen a megelőző fa lezárása NEM volt igazolt — a mérés hitele veszett el, némán
// (KUKA-012: a hiányt ki kell mondani · KUKA-041: a szabály az egyik irányon érvényesült, a másikon nem).
//
// MIT BIRTOKOL EZ A MODUL. Egyetlen kérdést: SZABAD-E a következő feladatot elindítani. A választ a
// megelőző feladat TAKARÍTÁS-ÁLLAPOTA adja — nem a feladat eredménye. A kettő KÜLÖN tény, és külön is
// marad: egy piros verifier után a sorozat FUT TOVÁBB (az a mérés dolga), egy nem igazolt LEZÁRÁS
// után viszont MEGÁLL (az a gép állapotáról szól).
//
// AMIT NEM BIRTOKOL: a verdiktet (SWV-01, a hívó feloldója) · a türelem mértékét (CHR-01, a hívó) ·
// a kiírás alakját. Ez a modul a SORRENDRŐL szól, nem arról, hogy egy ellenőrző zöld-e.
//
// MIÉRT KÜLÖN FÁJL (KUKA-207): hogy a próba a TÉNYLEGES vezérlőt hívhassa, ne a másolatát. A régi
// alakban a vezérlés a söprés törzsében, egyetlen `for` ciklusban élt — kívülről meghívhatatlanul,
// tehát bizonyíthatatlanul (az R98 is csak úgy tudta mérni, hogy a vezérlési kódot maga futtatta).

// SHD-01 (F101-01, R103): a MEGSZAKÍTÁS közös, nevezett állapota. A sorozat NEM tart saját
// kapcsolót — ugyanazt kérdezi, amit a futtató a `spawn` előtt (R101: nem egymástól független
// kapcsolók). Enélkül a sorozat csak a TAKARÍTÁST nézte, és egy szabályosan záró gyermek után
// megszakítás közben is elindította a következő feladatot (a mért rés).
import { interruptState, NOT_STARTED_INTERRUPTED } from './vs_shutdown_state.mjs';

/**
 * A NEVEZETT ÁLLAPOTOK. A `nem_igazolhato` NEM zöld és NEM „valószínűleg rendben"; a `nem_indult`
 * pedig azt mondja ki, hogy a feladat MEG SEM INDULT — ott nincs mit igazolni, tehát zöldnek
 * végképp nem nevezhető (F101-01: a megszakítás KÜLÖN, nevezett állapot).
 */
export const CLEANUP_STATES = Object.freeze(['igazolt', 'maradvany', 'nem_igazolhato', 'nem_indult']);

/** A KIMARADT FELADAT SZAVA — nem „kihagyva" és nem „zöld": nevezett állapot, okkal (KUKA-093). */
export const NOT_STARTED_REASON = 'nem indult — az előző lezárása nem igazolt';
/** A MÁSIK MEGÁLLÁSI OK, KÜLÖN SZÓVAL: a megszakítás nem takarítási hiba (SHD-01). */
export { NOT_STARTED_INTERRUPTED } from './vs_shutdown_state.mjs';
/** A MEGÁLLÁS KÉT FAJTÁJA — a jelentésnek meg kell tudnia mondani, MELYIK történt. */
export const HALT_KINDS = Object.freeze(['takaritas', 'megszakitas']);

/**
 * A FUTTATÓ TAKARÍTÁS-VÁLASZÁNAK MINŐSÍTÉSE — EGY helyen, hogy ne szóródjon szét (KUKA-003 · 018).
 *
 * IGAZOLT CSAK A MÉRT ÜRESSÉG: `leftovers === false`. A `true` maradvány; a `null` (nincs
 * folyamatcsoport-támogatás — NEVEZETT PLATFORM-KORLÁT) és a hiányzó válasz egyaránt
 * `nem_igazolhato`. **A platform-korlát nem hallgatólagos engedély a folytatásra** (R98 előírása):
 * ahol a lezárást nem tudjuk MÉRNI, ott nem állítjuk, hogy rendben van.
 */
export function cleanupStateOf(cleanup) {
  if (!cleanup || typeof cleanup !== 'object') {
    return { state: 'nem_igazolhato', why: 'a futtató nem adott takarítás-állapotot' };
  }
  // A MEG SEM INDULT FELADAT ELSŐKÉNT dől el: ott nem takarítás történt, hanem semmi — és ez SAJÁT
  // szava van, hogy ne csússzon se a zöld, se a maradvány oldalára (F101-01/2).
  if (cleanup.verdict === 'nem_indult') {
    return { state: 'nem_indult', why: 'a feladat MEG SEM INDULT (megszakítás) — nincs mit igazolni', steps: cleanup.steps || [] };
  }
  if (cleanup.leftovers === false) return { state: 'igazolt', why: cleanup.verdict || 'üres' };
  if (cleanup.leftovers === true) {
    return { state: 'maradvany', why: cleanup.verdict || 'maradt élő folyamat', steps: cleanup.steps || [] };
  }
  return {
    state: 'nem_igazolhato',
    why: cleanup.verdict || 'a lezárás nem mérhető ezen az úton',
    steps: cleanup.steps || [],
  };
}

/**
 * A SOROZAT — igazolt lezárásig fut, utána MEGÁLL.
 *
 * `items`  a futtatandó tételek (a hívó alakja; ez a modul nem értelmezi őket)
 * `run`    a futtató: `async (item) => { cleanup, … }` — alapesetben a CHR-01 `runGuarded` burka
 * `onResult`  AZONNALI visszajelzés minden egyes tétel után (az eredmény ne a végén derüljön ki)
 * `onHalt`    a megállás pillanatában hívva, a megállás okával
 *
 * A visszatérés MÉRT KIMENET: `results` (ami lefutott, a takarítás állapotával) · `notStarted` (ami
 * NEM indult el, NEVEZETT okkal) · `halted` (mi állította meg a sorozatot, vagy `null`).
 */
export async function runSequence(items, { run, onResult = null, onHalt = null } = {}) {
  if (typeof run !== 'function') throw new Error('vs_sweep_sequence: a `run` futtató kötelező');
  const results = [];
  const notStarted = [];
  let halted = null;
  /** Az UTOLSÓ ténylegesen lefutott tétel — a megszakítás UTÁNA következő tételeket nevezi meg. */
  let last = null;
  for (const item of items) {
    // ── ELSŐ KÉRDÉS MINDEN TÉTEL ELŐTT: MEGSZAKÍTÁS ALATT VAGYUNK-E (F101-01/2)?
    // A választ a KÖZÖS állapot adja (SHD-01), nem egy itteni külön kapcsoló. A régi alak CSAK a
    // takarítást nézte: egy szabályosan, a türelmen belül záró gyermek `leftovers:false` válasza
    // folytatási engedélynek látszott, és a következő feladat a leállás KÖZBEN indult el.
    // [F101-01-KAPU:SOROZAT] — a kapu, aminek a KIVÉTELÉRE a CR14 ellenpróbája PIROS lesz.
    if (!halted) {
      const intr = interruptState();
      if (intr) {
        halted = {
          after: last,
          kind: 'megszakitas',
          state: 'megszakitva',
          signal: intr.signal,
          why: `MEGSZAKÍTÁS (${intr.signal}) — a leállítás alatt új feladat nem indul`,
          steps: [],
        };
        if (onHalt) onHalt(halted);
      }
    }
    // [/F101-01-KAPU:SOROZAT]
    // A MEGÁLLÁS UTÁN EGYETLEN TOVÁBBI FELADAT SEM INDUL — a hátralévők NEVEZETT állapotot kapnak,
    // és az OK is látszik: takarítási hiány vagy megszakítás (a kettő nem ugyanaz — KUKA-002).
    if (halted) {
      notStarted.push({
        item,
        reason: halted.kind === 'megszakitas' ? NOT_STARTED_INTERRUPTED : NOT_STARTED_REASON,
        after: halted.after,
        kind: halted.kind,
        signal: halted.signal || null,
      });
      continue;
    }
    const startedAt = Date.now();
    const result = await run(item);
    last = item;
    const c = cleanupStateOf(result && result.cleanup);
    const entry = { item, result, ms: Date.now() - startedAt, cleanup_state: c.state, cleanup_why: c.why, cleanup_steps: c.steps || [] };
    results.push(entry);
    if (onResult) onResult(entry);
    if (c.state !== 'igazolt') {
      halted = { after: item, kind: 'takaritas', state: c.state, why: c.why, steps: c.steps || [] };
      if (onHalt) onHalt(halted);
    }
  }
  return { results, notStarted, halted };
}

export const SWEEP_SEQUENCE_CONTRACT = Object.freeze({
  id: 'SEQ-01',
  owns: 'a SORREND: a következő feladat csak IGAZOLT lezárás után indulhat el',
  does_not_own: 'a verdikt (SWV-01) · a türelem (CHR-01) · a kiírás alakja',
  states: CLEANUP_STATES,
  halts_on: Object.freeze(['maradvany', 'nem_igazolhato', 'nem_indult']),
  // A MÁSODIK MEGÁLLÍTÓ OK (F101-01, R103) — nem a takarításról szól, ezért KÜLÖN néven áll.
  halt_kinds: HALT_KINDS,
  interrupt: 'MEGSZAKÍTÁS alatt (SHD-01) a sorozat NEM hívja meg a következő feladatot; a megállás '
    + 'oka `megszakitas`, a kimaradt tételek nevezett oka a jellel együtt látszik — a megszakítás '
    + 'NEM takarítási hiba, és nem is hamis maradvány',
  separate_facts: 'a feladat EREDMÉNYE és a LEZÁRÁS állapota két külön tény — piros verifier nem állít meg, nem igazolt lezárás igen',
  platform_limit: 'a nem mérhető lezárás (nincs folyamatcsoport-támogatás) NEM engedély a folytatásra',
  never: 'idegen folyamat leállítása · a kimaradt feladat „zöldként" vagy néma kihagyásként könyvelése',
});
