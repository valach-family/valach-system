// tools/lib/vs_shutdown_state.mjs — SHD-01: A MEGSZAKÍTÁSI ÁLLAPOT, EGY HELYEN (F101-01, R103).
//
// A LELET (chatgpt-v3, R101 §F101-01, saját elkülönített próbával háromszor reprodukálva, és ebben a
// körben a MÁSODIK GYERMEK indulásáig is megmérve): a futtató megszakításkor elindította a rendezett
// lezárást, de az ÚJ INDÍTÁSOKAT semmi nem tiltotta. Az első gyermek szabályosan, 100 ms alatt
// kilépett, a `runGuarded` erre `cleanup.leftovers=false` (`mar_ures`) választ adott, a `runSequence`
// pedig ezt FOLYTATÁSI ENGEDÉLYNEK olvasta — mert csak a TAKARÍTÁS állapotát nézte. A második
// visszahívás lefutott, a második gyermek el is indult, és csak a késleltetett `process.exit` vagy a
// kilépési védőháló vitte el. A lezárás tehát nem volt teljes: a „leállítok" és a „nem indítok újat"
// KÉT KÜLÖN dolog, és csak az egyik volt megépítve (KUKA-041 alakja a futtatón).
//
// MIT BIRTOKOL EZ A MODUL. EGYETLEN tényt: MEGSZAKÍTÁS ALATT VAGYUNK-E, és ha igen, MELYIK jel óta.
// Azért külön fájl, mert KÉT modul kérdezi (CHR-01 a spawn előtt, SEQ-01 minden tétel előtt), és az
// R101 kikötése kimondott: „közös megszakítási állapot/jelzés szükséges, nem egymástól független
// kapcsolók". Két kapcsoló előbb-utóbb elcsúszik egymástól (KUKA-003 · KUKA-018: egy fogalomnak egy
// otthona) — és az elcsúszás itt épp az a rés, amit be kell zárni.
//
// AMIT NEM BIRTOKOL: a takarítást (CHR-01) · a sorrendet (SEQ-01) · a kilépés PILLANATÁT (a jelkezelő
// dolga). Ez a modul nem küld jelet, nem indít folyamatot és nem lép ki — csak TUDJA az állapotot.
//
// A TILALOM AZONNALI, ÉS EZ A LÉNYEG: a jelkezelő ELSŐ, még SZINKRON lépése az állapot beállítása —
// MIELŐTT az aszinkron takarítás egyetlen sort is futna. Node-ban a jelkezelő az eseményhurokban fut,
// a `spawn` viszont szinkron: ezért egy „állapot-kérdezés majd rögtön spawn" sorozatot jel NEM tud
// kettévágni. A rés bezárása ezen a szinkronitáson áll, nem időzítésen.

/** A MEGSZAKÍTÁS — `null`, amíg nincs; utána FAGYASZTOTT tény: melyik jel, mikor, milyen kilépéssel. */
let interrupt = null;
/** ISMÉTELT JEL: a türelmet lezárja (a rend így is VÉGES), de új takarítási menetet NEM indít. */
let force = false;
/** Akik értesülni akarnak az ELSŐ jelről. A hiba egy figyelőben nem döntheti össze a lezárást. */
const watchers = new Set();

/**
 * A KILÉPÉSI OK: 128 + jelszám. A jelet NEM nyeljük el — a saját kilépési okunk igaz marad.
 * (A régi alak minden nem-SIGINT jelre 143-at adott, tehát SIGHUP-ra is — a saját kimondott
 * „128 + jelszám" szabályát mondta meg nem igaz módon a SIGHUP ágon; KUKA-050: a szöveg kövesse
 * a valóságot, itt inkább a valóság követi a kimondott szabályt.)
 */
export const INTERRUPT_EXIT_CODES = Object.freeze({ SIGINT: 130, SIGTERM: 143, SIGHUP: 129 });

/** A KEZELT JELEK — egy helyen, hogy a kezelő és a próba ugyanazt a halmazt ismerje. */
export const HANDLED_SIGNALS = Object.freeze(['SIGINT', 'SIGTERM', 'SIGHUP']);

/**
 * A MEGSZAKÍTÁS BEJELENTÉSE — SZINKRON, és ez a szerződés lényege.
 *
 * Az ELSŐ hívás állítja be az állapotot (`fresh: true`), MINDEN további csak a kényszert kéri
 * (`fresh: false`) — az ok és a kilépési kód az ELSŐ jelé marad. Visszatérés után `isInterrupted()`
 * MÁR igazat mond: a hívó ezután semmilyen új munkát nem kezdhet.
 */
export function beginInterrupt(signal) {
  if (interrupt) { force = true; return { fresh: false, state: interrupt }; }
  const code = Object.prototype.hasOwnProperty.call(INTERRUPT_EXIT_CODES, signal)
    ? INTERRUPT_EXIT_CODES[signal] : 143;
  interrupt = Object.freeze({ signal: String(signal), code, at: Date.now() });
  // A FIGYELŐ HIBÁJA NEM DÖNTHETI ÖSSZE A LEZÁRÁST (KUKA-118): az állapot MÁR beállt, a rend fut.
  for (const fn of [...watchers]) { try { fn(interrupt); } catch { /* a figyelő baja, nem a lezárásé */ } }
  return { fresh: true, state: interrupt };
}

/** A MEGSZAKÍTÁS TÉNYE — `null`, ha nincs. A visszaadott érték fagyasztott, kívülről nem írható át. */
export function interruptState() { return interrupt; }

/** A KÉRDÉS, amit a `spawn` ELŐTT és minden tétel ELŐTT fel kell tenni. */
export function isInterrupted() { return interrupt !== null; }

/** KÉRTÉK-E A KÉNYSZERT (ismételt jel)? A türelem lezárásának jele, nem második takarítás. */
export function forceRequested() { return force; }

/** Értesítés az ELSŐ jelről. Visszaadja a leiratkozót. Ha már megtörtént, AZONNAL hív (nem késik el). */
export function onInterrupt(fn) {
  if (typeof fn !== 'function') throw new Error('vs_shutdown_state: a figyelő függvény kötelező');
  if (interrupt) { try { fn(interrupt); } catch { /* a figyelő baja */ } return () => {}; }
  watchers.add(fn);
  return () => watchers.delete(fn);
}

/** A KIMARADÁS SZAVA — nem „kihagyva" és nem „zöld": nevezett ok (KUKA-093). */
export const NOT_STARTED_INTERRUPTED = 'nem indult — MEGSZAKÍTÁS: a leállítás alatt új feladat nem kezdődik';

export const SHUTDOWN_STATE_CONTRACT = Object.freeze({
  id: 'SHD-01',
  owns: 'EGY tény: megszakítás alatt vagyunk-e, és melyik jel óta — a KÖZÖS állapot, amit a futtató és a sorozat egyaránt kérdez',
  does_not_own: 'a takarítás (CHR-01) · a sorrend (SEQ-01) · a kilépés pillanata (a jelkezelő)',
  immediate: 'a tilalom a jelkezelő ELSŐ, SZINKRON lépésében áll be — MIELŐTT az aszinkron takarítás elindul',
  repeat_signal: 'ismételt jel: a türelmet zárja le (`forceRequested`), új takarítási menetet NEM indít; az ok és a kilépési kód az ELSŐ jelé marad',
  exit_codes: INTERRUPT_EXIT_CODES,
  never: 'jel-küldés · folyamat-indítás · kilépés · az állapot VISSZAÁLLÍTÁSA (a megszakítás nem vonható vissza — egy folyamat életében EGYSZER történik)',
});
