// V3 — PARAMÉTER-HELYŐRZŐ FORDÍTÁS (PGD-01).
//
// MIT CSINÁL, ÉS MIT NEM — EZT KI KELL MONDANI, MERT AZ R146 §4 NEVEZETTEN TILTJA A MÁSIKAT.
//
// A parancs szava: *„Ne próbáld szöveges SQL-helyettesítésekkel SQLite-nak álcázni a Postgrest."*
// Ez a fájl NEM azt csinálja. Egyetlen dolgot fordít: a KÖTÉS-JELÖLÉST (`?` → `$1`, `$2`, …), mert
// a két illesztő ugyanazt a fogalmat — „ide paraméter jön" — más karakterrel írja. Ez nem
// szemantika, hanem jelölés: a paraméter ÉRTÉKE, típusa, sorrendje és a kötés ideje változatlan.
//
// AMIT KIMONDOTTAN NEM CSINÁL (ezek a „álcázás" tiltott alakjai):
//   · nem ír át típusokat, nem emulál SQLite-típusaffinitást;
//   · nem fordít triggert, kényszert vagy `RAISE(ABORT, …)`-ot JS-be — azok VALÓDI PostgreSQL
//     trigger-függvényként élnek a migrációban;
//   · nem pótol hiányzó PostgreSQL-képességet szöveg-cserével;
//   · nem nyúl a lekérdezés szerkezetéhez.
//
// MIÉRT TOKENIZÁL, ÉS NEM `replace(/\?/g, …)`. Mert egy `?` ÁLLHAT szövegliterálban, idézett
// azonosítóban vagy megjegyzésben is — ott NEM kötés-jelölés, és a vak csere ELRONTANÁ az adatot.
// A naiv alak pontosan a KUKA-039 alakja (a fél őr): három helyen jó, a negyediken némán hibás.
// Ezért a fordító végigolvassa a szöveget, és CSAK a literálokon-megjegyzéseken KÍVÜLI `?`-et
// cseréli. A kihagyott alakok: '…' (benne a '' kettőzés) · "…" · $tag$…$tag$ · -- sor · /* blokk */.

/**
 * `?` kötés-jelölések → `$1..$n`, a literálok és megjegyzések érintetlenül hagyásával.
 * @param {string} sql
 * @returns {{ text: string, count: number }}
 */
export function toPgPlaceholders(sql) {
  if (typeof sql !== 'string') throw new TypeError('toPgPlaceholders: a bemenet szöveg kell legyen');
  let out = '';
  let n = 0;
  let i = 0;
  const L = sql.length;
  while (i < L) {
    const c = sql[i];

    // -- sor-megjegyzés a sor végéig
    if (c === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i);
      const end = nl === -1 ? L : nl;
      out += sql.slice(i, end); i = end; continue;
    }
    // /* blokk-megjegyzés */ — a PostgreSQL ezeket EGYMÁSBA ÁGYAZHATÓNAK tekinti, ezért számolunk.
    if (c === '/' && sql[i + 1] === '*') {
      let depth = 1; let j = i + 2;
      while (j < L && depth > 0) {
        if (sql[j] === '/' && sql[j + 1] === '*') { depth++; j += 2; continue; }
        if (sql[j] === '*' && sql[j + 1] === '/') { depth--; j += 2; continue; }
        j++;
      }
      out += sql.slice(i, j); i = j; continue;
    }
    // '…' szövegliterál, benne a '' kettőzéssel
    if (c === "'") {
      let j = i + 1;
      while (j < L) {
        if (sql[j] === "'") { if (sql[j + 1] === "'") { j += 2; continue; } j++; break; }
        j++;
      }
      out += sql.slice(i, j); i = j; continue;
    }
    // "…" idézett azonosító, benne a "" kettőzéssel
    if (c === '"') {
      let j = i + 1;
      while (j < L) {
        if (sql[j] === '"') { if (sql[j + 1] === '"') { j += 2; continue; } j++; break; }
        j++;
      }
      out += sql.slice(i, j); i = j; continue;
    }
    // $tag$ … $tag$ dollár-idézés (a trigger-törzsek alakja)
    if (c === '$') {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (m) {
        const tag = m[0];
        const close = sql.indexOf(tag, i + tag.length);
        const end = close === -1 ? L : close + tag.length;
        out += sql.slice(i, end); i = end; continue;
      }
    }
    if (c === '?') { out += `$${++n}`; i++; continue; }
    out += c; i++;
  }
  return { text: out, count: n };
}
