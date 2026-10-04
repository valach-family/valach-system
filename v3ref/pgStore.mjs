// V3 — A TÁROLÓ PostgreSQL-ALAKJA (PGT-01).
//
// UGYANAZ AZ AJTÓ, MÁSIK TEREM. Ez a modul PONTOSAN azt az API-t adja, amit a
// `v3ref/store.mjs` (`run` · `get` · `all` · `tx` · `atomic` · `close`) — ezért a `v3ref/` írói és
// olvasói VÁLTOZATLANUL futnak rajta. Ez a csomag központi követelménye (R146 §4):
// *„Ugyanaz a jogi/domain-szabály éljen, ne épüljön második, eltérő üzleti motor."*
//
// AMI ALATTA VALÓDI PostgreSQL: a tranzakció, a mentéspont, a trigger-őrök (plpgsql
// `RAISE EXCEPTION`), az idegen kulcs, az egyediség és a sor-zár. Semmit nem emulálunk JS-ben.
//
// A HÁROM KIMONDOTT ELTÉRÉS, amit a hídnak kezelnie KELL (és nem elrejtenie):
//   1. KÖTÉS-JELÖLÉS: `?` → `$n` (PGD-01). Jelölés, nem szemantika.
//   2. `lastInsertRowid`: a PostgreSQL-ben NINCS ilyen fogalom — a beszúrt kulcsot a
//      `RETURNING` adja vissza. Ezt a hívó helyett a tároló intézi, és NEM találgatásból:
//      induláskor MEGKÉRDEZI a sémától, mely táblák hordoznak identitás-`id`-t.
//   3. TRANZAKCIÓ-ÁLLAPOT: az SQLite `db.isTransaction`-jét itt magunk követjük.
import { openPgBridge, PgBridgeError } from './pgBridge.mjs';
import { toPgPlaceholders } from './pgDialect.mjs';

export { PgBridgeError };

/**
 * PostgreSQL-tároló a kanonikus séma fölött.
 *
 * @param {string} url  DATABASE_URL. Az ÉRTÉKE soha nem kerül naplóba vagy hibaüzenetbe.
 * @param {{waitMs?:number, statementTimeoutMs?:number}} [opts]
 */
export function openPgStore(url, opts = {}) {
  const bridge = openPgBridge(url, opts);

  // MELY TÁBLÁK ADNAK VISSZA KULCSOT. A sémától kérdezzük meg, nem egy kézzel vezetett listából
  // (KUKA-051: a védelem SZABÁLY legyen, ne lista) — így egy ÚJ identitás-táblát a következő
  // migráció után is magától ismer, átírás nélkül.
  const identityTables = new Set(
    bridge.query(`SELECT table_name FROM information_schema.columns
                   WHERE table_schema = current_schema()
                     AND column_name = 'id'
                     AND (is_identity = 'YES' OR column_default LIKE 'nextval%')`).rows
      .map((r) => r.table_name),
  );

  let depth = 0;          // 0 = nincs tranzakció; 1 = BEGIN; >1 = mentéspont
  let savepointSeq = 0;

  function exec(sql, params) {
    const { text } = toPgPlaceholders(sql);
    return bridge.query(text, params);
  }

  /** `INSERT` kulcs-visszaadással — CSAK ott, ahol a séma szerint van mit visszaadni. */
  function runWithKey(sql, params) {
    const m = /^\s*INSERT\s+INTO\s+"?([A-Za-z_][A-Za-z0-9_]*)"?/i.exec(sql);
    const wantsKey = m && identityTables.has(m[1]) && !/\bRETURNING\b/i.test(sql);
    const r = exec(wantsKey ? `${sql.replace(/;\s*$/, '')} RETURNING id` : sql, params);
    return {
      changes: r.rowCount ?? 0,
      lastInsertRowid: wantsKey && r.rows[0] ? r.rows[0].id : undefined,
    };
  }

  const store = {
    dialect: 'postgres',
    durable: true,
    get inTransaction() { return depth > 0; },

    run(sql, ...params) { return runWithKey(sql, params); },
    all(sql, ...params) { return exec(sql, params).rows; },
    // Az SQLite `get()`-je `undefined`-ot ad, ha nincs sor — ezt tartjuk.
    get(sql, ...params) { return exec(sql, params).rows[0]; },

    /**
     * KÜLSŐ TRANZAKCIÓ-HATÁR. Beágyazva DOB — pontosan úgy, ahogy a `withTransaction` az
     * SQLite-oldalon; a beágyazott út az `atomic`.
     *
     * AZ ELKÜLÖNÍTÉS SZINTJE KIMONDOTT: alapértelmezett `READ COMMITTED`. Ez SZÁNDÉKOS és a
     * séma tervezési elvét követi — a kanonikus séma kimondja, hogy az invariánst a KULCS tartja
     * („a szabályt itt a KULCS tartja (PRIMARY KEY + UNIQUE), nem egy alkalmazás-oldali
     * ellenőrzés, amit egy versenyhelyzet megkerülhet" — KUKA-047). A kulcs-ütközés
     * READ COMMITTED mellett is kulcs-ütközés, és a vesztes NEVEZETT kimenetet kap (STE-01).
     * Amit ez NEM állít: hogy minden „olvass, aztán írj" minta sorosítva van. Ezt a
     * `tools/v3_pg_concurrency_proof.mjs` MÉRI, külön folyamatokkal — nem feltételezzük.
     */
    tx(fn) {
      if (depth > 0) throw new Error('tx: beágyazott tranzakció — a hívó már tranzakcióban van');
      exec('BEGIN', []);
      depth = 1;
      try {
        const out = fn();
        exec('COMMIT', []);
        depth = 0;
        return out;
      } catch (e) {
        // A ROLLBACK CSAK FUTÓ TRANZAKCIÓRA MEGY, és a HIBÁJA nem nyelheti el az EREDETIT
        // (KUKA-026): egy bukott COMMIT után a vak visszagörgetés MÁSODIK kivétele eltüntetné
        // a valódi okot.
        //
        // ÉS EGY HARMADIK ESET, amit a hídjavítás hozott felszínre (PGB-04): ha a kapcsolat
        // ELDÖNTHETETLEN szállítási hiba miatt érvénytelen, akkor a visszagörgetés nemcsak
        // hiábavaló — HAZUG is volna. A `PG_COMMIT_OUTCOME_UNKNOWN` azt jelenti, hogy a
        // tranzakció a kiszolgálón VÉGLEGESÜLHETETT; egy „visszagörgettük" látszat pont azt a
        // hamis bizonyosságot adná, amit a hiba neve tilt. Ilyenkor hozzá sem nyúlunk a
        // kapcsolathoz, és az EREDETI, nevezett kimenet megy tovább.
        const undecidable = e && (e.code === 'PG_COMMIT_OUTCOME_UNKNOWN'
          || e.code === 'PG_BRIDGE_TIMEOUT' || e.code === 'PG_BRIDGE_UNUSABLE'
          || e.code === 'PG_BRIDGE_DESYNC' || e.code === 'PG_BRIDGE_EMPTY');
        if (depth > 0 && !undecidable) { try { exec('ROLLBACK', []); } catch { /* az EREDETI hiba megy tovább */ } }
        depth = 0;
        throw e;
      }
    },

    /** ATOMI EGYSÉG, BEÁGYAZVA IS — mentésponttal, ha már fut tranzakció. */
    atomic(fn) {
      if (depth === 0) return store.tx(fn);
      const name = `sp_${++savepointSeq}`;
      exec(`SAVEPOINT ${name}`, []);
      depth += 1;
      try {
        const out = fn();
        exec(`RELEASE SAVEPOINT ${name}`, []);
        depth -= 1;
        return out;
      } catch (e) {
        // UGYANAZ A SZABÁLY A MENTÉSPONTON (PGB-04): érvénytelen kapcsolaton a mentéspont
        // visszagörgetése sem jelent semmit — az eredeti, nevezett kimenet megy tovább.
        const undecidable = e && (e.code === 'PG_COMMIT_OUTCOME_UNKNOWN'
          || e.code === 'PG_BRIDGE_TIMEOUT' || e.code === 'PG_BRIDGE_UNUSABLE'
          || e.code === 'PG_BRIDGE_DESYNC' || e.code === 'PG_BRIDGE_EMPTY');
        if (!undecidable) {
          try { exec(`ROLLBACK TO SAVEPOINT ${name}`, []); exec(`RELEASE SAVEPOINT ${name}`, []); }
          catch { /* az EREDETI hiba megy tovább */ }
        }
        depth -= 1;
        throw e;
      }
    },

    /**
     * SOR-ZÁR A TRANZAKCIÓ VÉGÉIG (LCK-01).
     *
     * MIÉRT KELL, MÉRVE (R150 §4 / F150-03). READ COMMITTED mellett két tranzakció UGYANAZT a
     * meghívó-sort olvashatja „még nem beváltott"-nak, aztán MINDKETTŐ ír: a beváltás tagságot
     * ad, a visszavonás pedig visszavonás-sort ír ugyanarra a meghívóra. Mérve, két külön
     * folyamattal, determinisztikus megállítási ponttal: a végállapot `beváltva=true` ÉS
     * `visszavonás-sor=1` ÉS `tagság=1` lett — az operátor „visszavontam"-ot lát, a munkatárs
     * viszont BENT VAN. A helyes végállapot hiánya mellett a NYUGTA is hazudott (KUKA-129).
     *
     * A ZÁR SOROSÍT: aki előbb veszi fel, az dönt, a másik a COMMIT után FRISS állapotot olvas.
     * Ez nem új üzleti motor és nem elkülönítési szint váltás — a meglévő írók UGYANAZT a
     * szabályt alkalmazzák, csak immár sorosítva (a parancs kikötése: „ne új üzleti motort
     * építs", és „minden érintett íróra vonatkozzon").
     *
     * A tábla és a feltétel KÓD-ÁLLANDÓ, soha nem felhasználói bemenet; az ÉRTÉK paraméter.
     */
    lockRows(table, whereSql, ...params) {
      if (depth === 0) throw new Error('lockRows: sor-zár csak TRANZAKCIÓN BELÜL vehető fel');
      return exec(`SELECT 1 FROM ${table} WHERE ${whereSql} FOR UPDATE`, params).rows.length;
    },

    close() { bridge.close(); },
    /** Érvénytelen-e a kapcsolat (eldönthetetlen szállítási hiba után) — ÚJ kapcsolat kell. */
    get poisoned() { return bridge.poisoned; },
  };
  return store;
}

// ── RENDEZETT ÚJRACSATLAKOZÁS EGY ELDÖNTHETETLEN SZÁLLÍTÁSI HIBA UTÁN (PGR-01) ─────────────────
//
// A LELET (a külső ellenőrző fél R152 §5 kikötése). A hídjavítás (PGB-04) helyesen ÉRVÉNYTELENÍTI
// a kapcsolatot, ha a válasz sorsa eldönthetetlen — de a szerver EGYSZER nyit tárolót, tehát a
// `poisoned` jelző önmagában nem állít helyre semmit: az első ilyen hiba után a példány MINDEN
// további kérésre `PG_BRIDGE_UNUSABLE`-t adna, amíg valaki újra nem indítja. A zárás tehát
// megvolt, a FOLYTATÁS nem (KUKA-201: a nemleges válasz vigye a MŰKÖDŐ folytatást).
//
// A HELYREÁLLÍTÁS KÉT SZABÁLYA, és a második a fontosabb:
//
//   1. ÚJ KAPCSOLAT, NEM ÚJRAÉLESZTETT. A mérgezett hidat eldobjuk, és FRISSET nyitunk. A régi
//      kapcsolat állapota ismeretlen — nem „gyógyítjuk meg", hanem elhagyjuk.
//
//   2. A HELYREÁLLÍTÁS NEM ISMÉTLI MEG A MŰVELETET. A megbukott hívás a SAJÁT nevezett hibájával
//      száll el, és ott is marad: egy `PG_COMMIT_OUTCOME_UNKNOWN` után a tranzakció a
//      kiszolgálón VÉGLEGESÜLHETETT, tehát a vak újrapróbálás DUPLIKÁLT HATÁST szülne. Az
//      ismétlésről a hívó dönt, az alkalmazás meglévő egyszeriség-szerződése szerint
//      (`operation_once`) — nem ez a réteg.
//
// MIKOR SZABAD ÚJRACSATLAKOZNI — ÉS MIÉRT NEM BÁRMIKOR. CSAK olyan ponton, ahol BIZTOSAN nem fut
// tranzakció: a kérés HATÁRÁN. Ha egy `tx(fn)` törzsének közepén cserélnénk kapcsolatot, a
// callback további mondatai egy ÚJ kapcsolaton, tranzakción KÍVÜL futnának — a hívó azt hinné,
// atomi egységben van, holott már nincs. Az ilyen „segítőkész" helyreállítás rosszabb volna a
// hibánál (KUKA-026). Ezért a csere KIZÁRÓLAG a `recoverIfNeeded()` kimondott hívásán történik,
// amit a héj a kérés elején hív — és ott a szinkron híd miatt bizonyosan nincs nyitott tranzakció.
export function openResilientPgStore(url, opts = {}) {
  let inner = openPgStore(url, opts);
  let generation = 1;
  let recoveries = 0;
  let lastCause = null;

  const api = {
    get dialect() { return inner.dialect; },
    get durable() { return inner.durable; },
    get inTransaction() { return inner.inTransaction; },
    get poisoned() { return inner.poisoned; },
    /** Hányadik kapcsolaton járunk, és hányszor kellett helyreállni — a jelentés ebből mér. */
    get generation() { return generation; },
    get recoveries() { return recoveries; },
    get lastRecoveryCause() { return lastCause; },

    run(sql, ...p) { return inner.run(sql, ...p); },
    all(sql, ...p) { return inner.all(sql, ...p); },
    get(sql, ...p) { return inner.get(sql, ...p); },
    tx(fn) { return inner.tx(fn); },
    atomic(fn) { return inner.atomic(fn); },
    lockRows(t, w, ...p) { return inner.lockRows(t, w, ...p); },
    close() { inner.close(); },

    /**
     * A KÉRÉS HATÁRÁN hívandó. Ha a kapcsolat érvénytelen, ELDOBJA és ÚJAT nyit.
     * A megbukott műveletet NEM ismétli meg — arról a hívó dönt.
     * @returns {{recovered:boolean, generation:number, cause?:string, failed?:string}}
     */
    recoverIfNeeded() {
      const p = inner.poisoned;
      if (!p) return { recovered: false, generation };
      lastCause = p.code;
      try { inner.close(); } catch { /* a mérgezett hidat amúgy is eldobjuk */ }
      try {
        inner = openPgStore(url, opts);
        generation += 1;
        recoveries += 1;
        return { recovered: true, generation, cause: p.code };
      } catch (e) {
        // AZ ÚJRACSATLAKOZÁS IS BUKHAT (a kiszolgáló tényleg elérhetetlen). Ez NEM elrejtendő:
        // a készenlét ettől marad 503, és a telepítő nem küld ide forgalmat.
        return { recovered: false, generation, cause: p.code, failed: String(e && e.code || e.message) };
      }
    },
  };
  return api;
}
