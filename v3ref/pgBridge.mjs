// V3 — SZINKRON HÍD A VALÓDI PostgreSQL-HEZ (PGB-01).
//
// MIÉRT LÉTEZIK — EZ A CSOMAG LEGFONTOSABB TERVEZÉSI DÖNTÉSE, ezért hosszan kimondjuk.
//
// A FELADAT (R146 §4) három dolgot KÖVETEL EGYSZERRE:
//   (a) „A mai szerver által használt írók/olvasók PostgreSQL-en fussanak." — tehát a VALÓDI
//       domain-logika menjen PG-re, nem egy dísz-kapcsolat mellett;
//   (b) „Ugyanaz a jogi/domain-szabály éljen, ne épüljön második, eltérő üzleti motor." — tehát a
//       meglévő `v3ref/` írókat NEM szabad lemásolni egy PG-változatba;
//   (c) a `v3ref/external-checks/` HUSZONNÉGY beadott programja VÁLTOZATLANUL futtatandó
//       (KUKA-121 · KUKA-122: a külső fél programja TANÚ, nem a mi szövegünk) — azok pedig a
//       tároló SZINKRON API-ját hívják (`store.get(...)`, `store.run(...)`).
//
// A (b) és a (c) együtt kizárja az „írjuk át az egészet async/await-re" utat: az a 93 mag-fájlon
// túl a beadott bizonyítékot is átírná. A (a) viszont kizárja a „maradjon SQLite" utat.
//
// A MEGOLDÁS: a KÜLÖNBSÉG NEM A SZEMANTIKÁBAN VAN, HANEM A SZÁLLÍTÁSBAN. A PostgreSQL illesztő
// azért aszinkron, mert HÁLÓZATON megy — nem azért, mert a tranzakciói mások. Ezért a hálózatot
// egy MUNKÁS SZÁL végzi, a hívó szál pedig `Atomics.wait`-tel MEGVÁRJA a választ. A hívó így
// ugyanazt a szinkron alakot látja, miközben a MÁSIK OLDALON egy teljes értékű PostgreSQL áll:
// valódi tranzakció, valódi trigger, valódi kényszer, valódi sor-zár.
//
// AMIT EZ NEM OLD MEG, ÉS EZÉRT KIMONDJUK (KUKA-049: a gyengeséget nem hallgatjuk el):
//   · A hívó szál a lekérdezés idejére BLOKKOL. Egy folyamaton belül tehát a kérések SOROSAK.
//     A párhuzamosságot ezért NEM a szálak adják, hanem a FOLYAMATOK (Railway-n a példányok) —
//     és a párhuzamos írást pontosan így is mérjük: külön OS-folyamatokkal, külön kapcsolaton
//     (lásd `tools/v3_pg_concurrency_proof.mjs`). Ez nem kerülőút: az adatbázis-szintű verseny
//     (sor-zár, egyediség-ütközés, soros végrehajtás) EZEN a módon valódi, míg egy egyszálú
//     async szerveren a legtöbb ütközés fel sem lépne.
//   · A várakozásnak HATÁRA van (`statement_timeout` a kiszolgálón + `waitMs` a hídon). Határidő
//     nélküli blokkolás néma akadás volna (KUKA-121).
import { Worker, receiveMessageOnPort, MessageChannel } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

const WORKER_URL = new URL('./pgBridgeWorker.mjs', import.meta.url);

export class PgBridgeError extends Error {
  constructor(payload) {
    super(payload.message);
    this.name = 'PgBridgeError';
    this.code = payload.code;
    this.constraintName = payload.constraint;
    this.detail = payload.detail;
    this.severity = payload.severity;
  }
}

/**
 * Szinkron PostgreSQL-kapu. Egy példány = egy kapcsolat = egy tranzakciós kontextus.
 *
 * @param {string} url  A kapcsolat címe (DATABASE_URL). Értéke SOHA nem kerül naplóba.
 * @param {{waitMs?: number, statementTimeoutMs?: number}} [opts]
 */
export function openPgBridge(url, { waitMs = 30000, statementTimeoutMs = 15000 } = {}) {
  if (typeof url !== 'string' || !url.trim()) {
    const e = new Error('openPgBridge: a kapcsolat címe (DATABASE_URL) kötelező');
    e.code = 'PG_URL_MISSING';
    throw e;
  }
  const sab = new SharedArrayBuffer(8);   // [0] = válasz-jelző, [1] = a munkás elindult-e
  const ctl = new Int32Array(sab);
  const { port1, port2 } = new MessageChannel();

  const worker = new Worker(fileURLToPath(WORKER_URL), {
    workerData: { sab, url, statementTimeoutMs, port: port2 },
    transferList: [port2],
    // A MUNKÁS NE TARTSA ÉLETBEN A FOLYAMATOT: ha a hívó elfelejt `close()`-t hívni, a program
    // attól még kilép. (A `close()` változatlanul takarít; ez csak a HIÁNYZÓ zárás esete —
    // ugyanaz a háló, amit az SQLite-tároló is kifeszít a maga ideiglenes mappái alá.)
    stdout: false, stderr: false,
  });
  worker.unref();
  // A munkás hibája ne NÉMA halál legyen: eltesszük, és a következő hívás ezt mondja ki.
  let fatal = null;
  worker.on('error', (e) => { fatal = e; Atomics.store(ctl, 0, 1); Atomics.notify(ctl, 0); });
  worker.on('exit', (code) => {
    if (code !== 0 && !fatal) fatal = new Error(`pgBridge: a munkás szál ${code} kóddal kilépett`);
    Atomics.store(ctl, 0, 1); Atomics.notify(ctl, 0);
  });

  let closed = false;

  /** Egy kör: üzenet a munkásnak → BLOKKOLÓ várakozás → a válasz szinkron kivétele. */
  function roundTrip(msg) {
    if (closed) { const e = new Error('pgBridge: a kapcsolat már zárva'); e.code = 'PG_CLOSED'; throw e; }
    if (fatal) throw fatal;
    Atomics.store(ctl, 0, 0);
    port1.postMessage(msg);
    const res = Atomics.wait(ctl, 0, 0, waitMs);
    if (res === 'timed-out') {
      // A KÉT OK KÜLÖNBÖZŐ, ÉS A NEVÜK IS LEGYEN AZ (KUKA-171). Ha a munkás INDULÁSI JELE
      // sincs meg, akkor nem a lekérdezés lassú: a szál el sem indult.
      if (Atomics.load(ctl, 1) !== 1) {
        const e = new Error('pgBridge: a munkás szál EL SEM INDULT (modul-betöltési hiba) — '
          + 'a futás NEM eldönthető; a PostgreSQL-ről ez semmit nem állít');
        e.code = 'PG_BRIDGE_WORKER_NOT_STARTED';
        throw e;
      }
      const e = new Error(`pgBridge: a válasz ${waitMs} ms alatt nem érkezett meg — a futás NEM eldönthető`);
      e.code = 'PG_BRIDGE_TIMEOUT';
      throw e;
    }
    if (fatal) throw fatal;
    const got = receiveMessageOnPort(port1);
    if (!got) {
      const e = new Error('pgBridge: a munkás jelzett, de üzenet nem érkezett — a futás NEM eldönthető');
      e.code = 'PG_BRIDGE_EMPTY';
      throw e;
    }
    const payload = got.message;
    if (!payload.ok) throw new PgBridgeError(payload);
    return payload;
  }

  roundTrip({ op: 'connect' });

  return {
    /** Nyers lekérdezés MÁR `$n` alakú helyőrzőkkel. */
    query(sql, params = []) { return roundTrip({ op: 'query', sql, params }); },
    close() {
      if (closed) return;
      try { roundTrip({ op: 'end' }); } catch { /* a bontás hibája nem fed el korábbit */ }
      closed = true;
      port1.close();
      worker.terminate();
    },
    get closed() { return closed; },
  };
}
