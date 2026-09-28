// tools/lib/vs_interrupt_report.mjs — ITR-01: A MEGSZAKÍTÁSI JELENTÉS BIZTOS CSATORNÁJA (F105-01, R105).
//
// A LELET (chatgpt-v3, R105 §F105-01, KÉT független futtatásban reprodukálva, és ebben a körben a
// saját gépemen is 2/2): MAKACS gyermek + ISMÉTELT megszakító jel mellett a TÉNYLEGES söprés
// `tools/vs_verify_sweep.mjs` TELJESEN NÉMÁN lépett ki — üres stdout ÉS üres stderr, kilépés 143.
// Új munka nem indult (az R104 indítási kapuja MŰKÖDIK), de a jelentésből SEMMI nem látszott: se a
// megszakítás ténye, se a jel, se az, hogy MELYIK ellenőrző nem indult el, se a takarítás állapota.
//
// MIÉRT TÖRTÉNT. Az R104 a láthatóságot EGY ESEMÉNYHUROK-FORDULÓRA bízta: a jelkezelő a rendezett
// lezárás után `setImmediate`-tel adott egy fordulót, hogy a FOLYAMATBAN LÉVŐ hívások
// (`runGuarded` visszatérése → `runSequence` következő döntése → a söprés kiírása) visszatekeredjenek.
// Ez a forduló azonban NEM a jelentés csatornája, hanem egy VERSENY: a söprés kiírása csak akkor
// fut le, ha a gyermek `close` eseménye MEGELŐZI a `setImmediate`-et. Makacs gyermeknél a lánc
// gyors (az ismételt jel lezárja a türelmet, a SIGKILL azonnal megy), a `close` esemény viszont
// lassú (jel-átadás, SIGCHLD, a stdio EOF-ja) — tehát a kilépés ért előbb, és a jelentés elveszett.
// Ez a KUKA-127 alakja a SAJÁT jelentésünkön: ahol a kilépés versenyez a láthatósággal, ott a
// „zöld" a versenyt igazolja, nem a védelmet — és egy elvesztett versenyből NÉMASÁG lesz (KUKA-012).
//
// MIT BIRTOKOL EZ A MODUL. EGYETLEN dolgot: hogy a megszakításról szóló MINIMÁLIS, BIZTOS jelentés
// MEGSZÜLESSEN és KIJUSSON — akkor is, ha a rendes jelentési út nem tud visszatekeredni. Ehhez két
// dolgot tart: (1) a BEJELENTETT FELADATLISTÁT és a haladást (mi futott le, mi maradt félbe, mi nem
// indult el) — a jel pillanatában ez MÁR TUDHATÓ, nem kell hozzá megvárni semmit; (2) a kiírást
// SZINKRON rendszer-hívással (`writeSync(2, …)`), tehát nem egy folyam-puffert bízunk a kilépésre.
//
// AMIT NEM BIRTOKOL: a folyamatok leállítását és annak IGAZOLÁSÁT (CHR-01) · a sorrendet (SEQ-01) ·
// a megszakítás állapotát (SHD-01) · a verdiktet (SWV-01) · a kilépés PILLANATÁT (a jelkezelő).
// A három felelősség KÜLÖN marad (az R105 kikötése): a leállítás, az igazolása és a KIÍRÁS.
//
// AMIT EZ A MODUL NEM ÁLLÍT, KIMONDVA (KUKA-012 · KUKA-093):
//   · nem állítja, hogy a RÉSZLETES söprés-jelentés is kiíródik — azt a rendes út adja, ha ideje van;
//   · nem állítja, hogy a takarítás igazolt: a szót a MÉRT lezárási jelentésből veszi, és ha az
//     hiányzik vagy maradványt mért, a jelentés NEVEZETTEN „NEM IGAZOLT" — sosem hamis zöld;
//   · nem nyeli el a kilépési okot: a kilépés a jelé (128 + jelszám), tehát NEM siker.

import { writeSync } from 'node:fs';

/** A BEJELENTETT FELADATLISTA — a hívó tervének sorrendben vett CÍMKÉI (string). */
let plan = [];
/** ELINDÍTOTT tételek (a sorozat kiadta őket a futtatónak), beérkezési sorrendben. */
const started = [];
/** LEZÁRT tételek: címke → NEVEZETT verdikt-szó (a hívó szava, pl. „zöld" · „piros"). */
const settled = new Map();
/** A JELENTÉS EGYSZER MEGY KI. A második hívás NEM ír újra — de nem is hiba (idempotens). */
let emitted = null;

/**
 * A KIÍRÁS IDEJE — egyetlen, KIMONDOTT ráhagyás a jelentésre a lezárás saját türelmén FELÜL.
 * Nem „sleep" és nem türelem-emelés: a határidő-számítás VÉGES záró tagja (lásd `deadlineMsFor`).
 */
export const REPORT_MARGIN_MS = 250;

/** A SZINKRON ÍRÁS ÚJRAPRÓBÁLÁSAINAK PADLÁSA: a nem-blokkoló csővezeték EAGAIN-je VÉGES, nem örök. */
const EAGAIN_LIMIT = 20000;

/** HONNAN készült a jelentés — a három út NEVEZETT, mert nem ugyanazt jelentik. */
export const REPORT_SOURCES = Object.freeze({
  SIGNAL: 'jel-ut',                     // a rendezett lezárás lefutott, a jelentés utána készült
  DEADLINE: 'hatarido',                 // a lezárás a saját, VÉGES határidején nem fejeződött be
  EXIT_NET: 'kilepesi-vedohalo',        // a folyamat máshogy lép ki — a jelentés így sem marad el
});

/**
 * A TERV BEJELENTÉSE — a jel pillanatában ebből tudjuk MEGNEVEZNI, mi nem indult el.
 *
 * MIÉRT ELŐRE: mert a jel után NINCS idő megkérdezni a sorozatot. A régi alak a `runSequence`
 * visszatérésére várt (`notStarted` lista) — az viszont a gyermek `close` eseményén múlt, tehát
 * pontosan azon, ami makacs gyermeknél elkésik. A TERV viszont a futás ELEJÉN ismert.
 */
export function registerPlan(labels) {
  plan = (Array.isArray(labels) ? labels : []).map((x) => String(x));
  started.length = 0;
  settled.clear();
  return plan.length;
}

/** EGY TÉTEL ELINDULT (a sorozat kiadta a futtatónak). */
export function markStarted(label) {
  const s = String(label);
  if (!started.includes(s)) started.push(s);
  return s;
}

/** EGY TÉTEL LEZÁRULT, NEVEZETT verdikt-szóval (a hívó szava — ez a modul nem minősít). */
export function markSettled(label, verdict) {
  const s = String(label);
  markStarted(s);
  settled.set(s, verdict === undefined || verdict === null ? 'lezárult' : String(verdict));
  return s;
}

/**
 * A HALADÁS HÁROM KÜLÖN HALMAZA — és a három NEM ugyanaz (KUKA-002):
 *   · `settledItems`  lefutott ÉS lezárult (van verdiktje)
 *   · `inFlight`      elindult, de a jel pillanatában MÉG FUTOTT — „félbemaradt", nem „lefutott"
 *   · `notStarted`    EL SEM INDULT — ez az, amit a jelentésnek meg kell nevezni
 */
export function planProgress() {
  const settledItems = plan.filter((l) => settled.has(l));
  const inFlight = started.filter((l) => !settled.has(l));
  const notStarted = plan.filter((l) => !started.includes(l));
  return { plan: [...plan], settledItems, inFlight, notStarted };
}

/**
 * A LEZÁRÁS HATÁRIDEJE — SZÁRMAZTATOTT, nem kitalált szám (az R105 kikötése: „önkényes hosszú sleep
 * vagy korlátlan várakozás nem elfogadható").
 *
 * A határidő a LEZÁRÁS SAJÁT, KIMONDOTT türelmeinek összege (a csoportok egymás UTÁN zárulnak),
 * plusz a kiírás egyetlen nevezett ráhagyása. ISMÉTELT JELNÉL a szabályos leállítás türelme
 * ELESIK (`forced`) — a MÉRÉS (a kényszer utáni igazolás) türelme viszont NEM, mert az nem türelem,
 * hanem BIZONYÍTÉK: aki ezt is elvágja, az egy valóban leállított fát nevez „nem igazoltnak".
 */
export function deadlineMsFor(groups, { forced = false } = {}) {
  const list = Array.isArray(groups) ? groups : [];
  let sum = 0;
  for (const g of list) {
    const grace = Number.isFinite(g && g.graceMs) ? g.graceMs : 0;
    const verify = Number.isFinite(g && g.verifyMs) ? g.verifyMs : 0;
    sum += (forced ? 0 : grace) + verify;
  }
  return sum + REPORT_MARGIN_MS;
}

/** A TAKARÍTÁS SZAVA — a MÉRT jelentésből, sosem feltevésből. Négy külön válasz, négy külön teendő. */
export function cleanupLine(shutdown) {
  if (!shutdown || typeof shutdown !== 'object') {
    return 'LEZÁRÁS: NEM IGAZOLT — a rendezett lezárás NEM fejeződött be, ezért a fa ürességéről '
      + 'nincs mérésünk (ez NEM maradvány-állítás és NEM zöld)';
  }
  if (shutdown.error) {
    return `LEZÁRÁS: NEM IGAZOLT — a lezárás kivétellel állt meg: ${shutdown.error}`;
  }
  const groups = Array.isArray(shutdown.groups) ? shutdown.groups : [];
  if (!groups.length) {
    return 'LEZÁRÁS: nincs alkalmazható eset — a jel pillanatában nulla saját folyamatcsoport állt '
      + 'nyilvántartásban (nulla lelet itt nem bizonyíték, hanem üres alapsokaság)';
  }
  const bad = groups.filter((g) => g.leftovers !== false);
  const reszek = groups.map((g) => `${g.verdict}${Number.isInteger(g.pgid) ? ` (pgid ${g.pgid})` : ''}`).join(' · ');
  if (bad.length) {
    return `LEZÁRÁS: NEM IGAZOLT — ${bad.length}/${groups.length} folyamatcsoport: ${reszek}`;
  }
  return `LEZÁRÁS: IGAZOLT — ${groups.length} folyamatcsoport: ${reszek}`;
}

/**
 * A JELENTÉS SZÖVEGE — RÖVID, DETERMINISZTIKUS, GÉPILEG ELLENŐRIZHETŐ.
 *
 * A sorok elején álló szavak SZERZŐDÉS: az elfogadási próba EZEKRE illeszt (jel · a meg nem indult
 * tételek NEVE · a lezárás szava). Ezért itt nem „szép", hanem STABIL alakra törekszünk.
 */
export function renderInterruptReport({ state, shutdown = null, forced = false, source = REPORT_SOURCES.SIGNAL, deadlineMs = null } = {}) {
  const jel = state && state.signal ? String(state.signal) : 'ismeretlen jel';
  const kod = state && Number.isInteger(state.code) ? state.code : null;
  const { plan: terv, settledItems, inFlight, notStarted } = planProgress();
  const L = [];
  L.push('');
  L.push('=== MEGSZAKÍTÁSI JELENTÉS (ITR-01) — BIZTOS CSATORNA ===');
  L.push(`JEL: ${jel} · KILÉPÉS: ${kod === null ? 'nevezetlen' : kod} · ISMÉTELT JEL: ${forced ? 'igen' : 'nem'} · FORRÁS: ${source}`);
  if (source === REPORT_SOURCES.DEADLINE) {
    L.push(`HATÁRIDŐ: a rendezett lezárás a saját, VÉGES határidején (${deadlineMs} ms) nem fejeződött be`);
  }
  if (!terv.length) {
    L.push('TERV: nincs bejelentett feladatlista (a futtatót közvetlenül hívták) — ezért meg nem indult '
      + 'tételt sem tudunk megnevezni; ez NEM azt jelenti, hogy nem maradt ki semmi');
  } else {
    L.push(`LEFUTOTT (${settledItems.length}/${terv.length}): ${settledItems.length ? settledItems.map((l) => `${l} [${settled.get(l)}]`).join(' · ') : '—'}`);
    if (inFlight.length) L.push(`FÉLBEMARADT (${inFlight.length}): ${inFlight.join(' · ')}`);
    L.push(`NEM INDULT (${notStarted.length}): ${notStarted.length ? notStarted.join(' · ') : '—'}`);
    for (const n of notStarted) L.push(`  · ${n} — nem indult: MEGSZAKÍTÁS (${jel})`);
  }
  L.push(cleanupLine(shutdown));
  if (shutdown && Number(shutdown.late_groups) > 0) {
    L.push(`NEVEZETT TÉNY: ${shutdown.late_groups} folyamatcsoport a felvett lista MÖGÉ érkezett (elvárt: 0)`);
  }
  L.push('A FUTÁS NEM SIKERES: a kilépés a jel oka, nem nulla. Ami nem futott le, az NEM zöld és nem kihagyás.');
  L.push('');
  return L.join('\n');
}

/**
 * A KIÍRÁS — SZINKRON RENDSZER-HÍVÁSSAL, hogy a kilépés ne tudja elnyelni.
 *
 * MIÉRT NEM `console.error`. A folyam-írás pufferelhet (nem minden csatorna szinkron minden
 * platformon), és a `process.exit` a pufferre nem vár. A `writeSync(2, …)` a rendszer-hívásig megy.
 * A nem-blokkoló csővezeték `EAGAIN`-jét VÉGES számú újrapróbálással kezeljük, és ha a szinkron út
 * mégsem járható, a folyam a TARTALÉK — a csatornát pedig KIÍRJUK (`reportChannel`), hogy a mérés
 * ne a jóindulaton álljon.
 */
function writeAllSync(fd, text) {
  const buf = Buffer.from(text, 'utf8');
  let off = 0;
  let eagain = 0;
  while (off < buf.length) {
    try {
      off += writeSync(fd, buf, off, buf.length - off);
    } catch (e) {
      const code = e && e.code;
      if (code === 'EAGAIN' || code === 'EWOULDBLOCK') {
        if ((eagain += 1) > EAGAIN_LIMIT) return false;   // VÉGES: korlátlanul nem várunk
        continue;
      }
      return false;                                       // EPIPE és minden más: a tartalék jön
    }
  }
  return true;
}

/** MELYIK CSATORNÁN ment ki a jelentés (`writeSync` · `stream` · `null`) — mérhető tény. */
let channel = null;
export function reportChannel() { return channel; }
export function interruptReportEmitted() { return emitted; }

/**
 * A JELENTÉS KIÍRÁSA — EGYSZER. Visszatér: `true`, ha EZ a hívás írta ki.
 *
 * AZ IDEMPOTENCIA AZÉRT KELL, mert HÁROM út hívja (jel-út · határidő · kilépési védőháló), és
 * mindhármat meg kell tartani: a kettős kiírás zavaró, a NÉMASÁG viszont a hiba, amit javítunk.
 */
export function emitInterruptReport(opts = {}) {
  if (emitted) return false;
  const text = renderInterruptReport(opts);
  emitted = { at: Date.now(), source: opts.source || REPORT_SOURCES.SIGNAL, chars: text.length };
  if (writeAllSync(2, text)) { channel = 'writeSync'; return true; }
  try { process.stderr.write(text); channel = 'stream'; return true; } catch { /* a csatorna elment */ }
  channel = null;
  return true;
}

export const INTERRUPT_REPORT_CONTRACT = Object.freeze({
  id: 'ITR-01',
  owns: 'a MEGSZAKÍTÁSRÓL szóló MINIMÁLIS, BIZTOS jelentés: a jel, a meg nem indult feladatok NEVE, '
    + 'a lezárás NEVEZETT állapota — és az, hogy mindez KIJUT, nem a rendes út visszatekeredésén múlva',
  does_not_own: 'a folyamatok leállítása és annak IGAZOLÁSA (CHR-01) · a sorrend (SEQ-01) · '
    + 'a megszakítás állapota (SHD-01) · a verdikt (SWV-01) · a kilépés pillanata (a jelkezelő)',
  plan_ahead: 'a feladatlista a futás ELEJÉN bejelentve — a jel után nincs idő megkérdezni a sorozatot, '
    + 'és a `notStarted` lista a gyermek `close` eseményén múlna (épp azon, ami makacs gyermeknél elkésik)',
  channel: 'SZINKRON `writeSync(2, …)` VÉGES EAGAIN-újrapróbálással; tartalék a folyam — a használt '
    + 'csatorna MÉRHETŐ (`reportChannel`), tehát a garancia nem a jóindulaton áll',
  once: 'a jelentés EGYSZER megy ki; három út hívhatja (jel-út · határidő · kilépési védőháló)',
  deadline: 'a határidő SZÁRMAZTATOTT: a lezárás saját türelmeinek összege + egy nevezett ráhagyás '
    + `(${REPORT_MARGIN_MS} ms); ismételt jelnél a SZABÁLYOS leállítás türelme elesik, a kényszer utáni `
    + 'IGAZOLÁS türelme NEM (az bizonyíték, nem türelem)',
  never: 'igazoltnak nevezni a nem mért lezárást · a meg nem indult feladatot „zöldként" vagy néma '
    + 'kihagyásként könyvelni · a jel kilépési okát elnyelni · korlátlan várakozás vagy önkényes sleep',
  states_limits: Object.freeze([
    'a RÉSZLETES söprés-jelentés kiírása NEM garantált — azt a rendes út adja, ha a gyermek `close` '
      + 'eseménye a kilépés előtt megérkezik; ez a modul a MINIMÁLIS jelentést garantálja',
    'bejelentett feladatlista nélkül (közvetlen `runGuarded`-hívás) a meg nem indult tételeket NEM '
      + 'tudjuk megnevezni — a jelentés ezt KIMONDJA, nem hallgatja el',
    'SIGKILL a futtatóra, illetve az operációs rendszer kiesése esetén semmilyen felhasználói kód '
      + 'nem fut: ott jelentés sincs (CHR-01 `not_guaranteed` változatlan)',
  ]),
});
