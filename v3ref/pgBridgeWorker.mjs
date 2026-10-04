// V3 — A SZINKRON PG-HÍD MUNKÁS OLDALA (PGB-01).
//
// Ez a szál VÉGZI a hálózati munkát (a `pg` illesztő aszinkron), a hívó szál pedig MEGVÁRJA.
// A várakozás `Atomics.wait`-tel történik a fő szálon — Node-ban ez megengedett.
//
// EGY KAPCSOLAT, NEM POOL. Ez nem kényelmi döntés: a tranzakció (BEGIN/COMMIT/SAVEPOINT) a
// KAPCSOLAT tulajdonsága. Egy pool két egymást követő hívást két különböző kapcsolatra tehetne,
// és akkor a `COMMIT` nem azt zárná le, amit a `BEGIN` nyitott — a tranzakció NÉMÁN szétesne
// (a KUKA-139 alakja: „egy zár, amit a másik fél nem vesz fel, nem zár"). Egy tároló = egy
// kapcsolat, pontosan úgy, ahogy az SQLite-nál egy `DatabaseSync` = egy kapcsolat.
import { workerData } from 'node:worker_threads';
import pg from 'pg';

// A 64 BITES EGÉSZ SZÁMKÉNT JÖJJÖN VISSZA, NE SZÖVEGKÉNT (PGB-02).
//
// MÉRT ELTÉRÉS, nem ízlés: a `pg` alapból SZÖVEGKÉNT adja vissza a `bigint`-et (int8, OID 20),
// mert a 64 bit nem fér el hiánytalanul a JS számában. Az SQLite-tároló viszont SZÁMOT ad.
// A különbség NÉMÁN hamisítana: a `SELECT COUNT(*) AS n` után az `n === 0` összehasonlítás
// PostgreSQL-en MINDIG hamis lenne (mert `'0' !== 0`), tehát egy „nincs találat" ág soha nem
// futna le. Ezért a biztonságos tartományban SZÁMOT adunk; a tartományon KÍVÜL marad a szöveg,
// mert ott a csendes pontosságvesztés volna a rosszabb (KUKA-020: a nyelt ok).
pg.types.setTypeParser(20, (v) => {
  const n = Number(v);
  return Number.isSafeInteger(n) ? n : v;
});

const { sab, url, statementTimeoutMs, port } = workerData;
const ctl = new Int32Array(sab);
// A HÍVÓ SZÁL A CSATORNÁN VÁR, NEM A `parentPort`-on. A `parentPort` üzenetét a fő szál csak
// akkor venné át, ha az eseményhurka futna — de az éppen `Atomics.wait`-ben áll. A `MessagePort`
// viszont `receiveMessageOnPort`-tal SZINKRON kiolvasható, tehát a blokkolt szál is eléri.
const chan = port;

// INDULÁSI JEL (PGB-03). A hívó szál `Atomics.wait`-ben áll, tehát a `worker.on('error')`
// eseményt NEM tudja megkapni — az eseményhurka nem fut. Egy modul-betöltési hiba (hiányzó
// csomag, rossz futtató-kapcsoló) így NÉMA, HATÁRIDŐS akadás lenne, és a hívó azt hinné, hogy
// a LEKÉRDEZÉS lassú, holott a szál el sem indult. Ezért a munkás a megosztott pufferbe írja,
// hogy a modulja betöltődött; a hídnak ebből MEGMONDHATÓ a különbség (KUKA-171: ami megállít,
// annak NEVE is legyen — a „nem tudtuk megmérni" nem ugyanaz, mint a „lassú").
Atomics.store(ctl, 1, 1);

// A JELZÉS MINDIG MEGTÖRTÉNIK. Ha a munkás néma marad, a hívó szál ÖRÖKRE állna az
// `Atomics.wait`-ben — egy határidőtlen várakozás pedig néma hét perc (KUKA-121). Ezért minden
// kimeneti út (siker, hiba, váratlan kivétel) UGYANAZON a kapun megy ki.
function answer(payload) {
  chan.postMessage(payload);
  Atomics.store(ctl, 0, 1);
  Atomics.notify(ctl, 0);
}

let client = null;

chan.on('message', async (msg) => {
  try {
    if (msg.op === 'connect') {
      client = new pg.Client({ connectionString: url, application_name: 'v3app' });
      await client.connect();
      // A VÉGTELEN LEKÉRDEZÉS NEM VÁRAKOZÁS, HANEM AKADÁS. A hívó szál blokkol, tehát egy
      // beragadt lekérdezés az EGÉSZ folyamatot megállítaná. A határt a kiszolgáló tartja be.
      if (Number.isFinite(statementTimeoutMs) && statementTimeoutMs > 0) {
        await client.query(`SET statement_timeout = ${Math.floor(statementTimeoutMs)}`);
      }
      return answer({ ok: true, connected: true });
    }
    if (msg.op === 'end') {
      if (client) { try { await client.end(); } catch { /* a bontás hibája nem fed el korábbit */ } }
      client = null;
      return answer({ ok: true, ended: true });
    }
    if (!client) return answer({ ok: false, message: 'pgBridge: nincs kapcsolat', code: 'PG_NO_CONNECTION' });
    const r = await client.query(msg.sql, msg.params);
    return answer({ ok: true, rows: r.rows, rowCount: r.rowCount, command: r.command });
  } catch (e) {
    // A HIBA ADATAI ÁTMENNEK, NEM CSAK A SZÖVEGE. A `code` (pl. '23505' egyediség-sértés) és a
    // `constraint` a hívó döntésének a bemenete — ha csak a mondat menne át, a hívó a saját
    // szövegegyezésére kényszerülne (KUKA-020: a nyelt ok).
    return answer({
      ok: false,
      message: String(e && e.message || e),
      code: e && e.code, constraint: e && e.constraint, detail: e && e.detail,
      where: e && e.where, severity: e && e.severity,
    });
  }
});
