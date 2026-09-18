/**
 * CLR-01 — ZÁRT REGISZTER FELOLDÁSA KÜLSŐ NÉVVEL (R37/F37-02 testvér-ága).
 *
 * MIÉRT EGY HELYEN. Az R37-ben a külső ellenőrző fél a BEMENETI séma-regiszteren mutatta meg, hogy a
 * `REGISZTER[nev]` alak az ÖRÖKÖLT tulajdonságokat is megtalálja (`toString` · `constructor` ·
 * `__proto__`), tehát a „zárt" regiszter kívülről bővíthető olyan nevekkel, amiket sosem vettünk
 * fel — és a kapu nyers kivétellel áll meg nevezett elutasítás helyett. A javítás után MEGMÉRTEM a
 * TESTVÉR-HELYEKET is (KUKA-039), és a mennyiség-profil feloldóján UGYANEZ élt: `toString` névre nem
 * „ismeretlen mennyiség-profil", hanem `Cannot convert undefined to a BigInt` jött.
 *
 * Ezért a szabály nem három fájl javítása, hanem EGY feloldó, amit mindhárom hívó HÍV (KUKA-003):
 *   · a név TÍPUSA is mérce — ami nem szöveg, az nem név;
 *   · a kulcs SAJÁT kulcsként oldódik fel (`Object.prototype.hasOwnProperty.call`);
 *   · a talált érték ALAKJÁT is ellenőrizzük, ha a hívó megmondja, mit vár.
 *
 * A HIÁNY MINDIG `null` — a hívó dönti el, mi a nevezett válasz (dobás vagy hibakód); ez a modul
 * nem hoz üzleti döntést.
 *
 * PURE + INERT: nincs I/O, nincs állapot.
 */

export function lookupClosed(registry, name, { shape } = {}) {
  if (typeof name !== 'string') return null;
  if (!registry || typeof registry !== 'object') return null;
  if (!Object.prototype.hasOwnProperty.call(registry, name)) return null;
  const found = registry[name];
  if (found === null || found === undefined) return null;
  if (typeof shape === 'function' && !shape(found)) return null;
  return found;
}

/** A választható nevek — SAJÁT kulcsok, ábécé-rendben; a nevezett elutasítás ezt sorolja fel. */
export function closedNames(registry) {
  return registry && typeof registry === 'object' ? Object.keys(registry).sort() : [];
}

/**
 * SAFE-01 — A DIAGNOSZTIKAI MEGJELENÍTÉS, AMI SOHA NEM DOB (R39, chatgpt-v3 lelete).
 *
 * MIÉRT. A nevezett elutasítások a `JSON.stringify(nev)` alakot használták, hogy megmutassák, MIT
 * kaptak (KUKA-064: a nemleges válasz ne legyen zsákutca). Csakhogy a `JSON.stringify` maga is
 * DOBHAT: `BigInt`-re („Do not know how to serialize a BigInt") és KÖRKÖRÖS objektumra
 * („Converting circular structure to JSON"). Így a hibás típusú NÉV nem nevezett elutasítást, hanem
 * nyers kivételt kapott — pont az a hiba-osztály, amit a KUKA-180-ban javítottunk, egy réteggel
 * beljebb: a diagnosztika vitte el a választ, amit ki akartunk mondani (KUKA-020).
 *
 * A megjelenítés MINDIG sikerül, és a fajtát is megmondja; ha semmi nem megy, a típus nevét adja.
 */
export function showValue(v) {
  const t = typeof v;
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (t === 'bigint') return `${v}n (BigInt)`;
  if (t === 'symbol') { try { return `${String(v)} (Symbol)`; } catch { return '(Symbol)'; } }
  if (t === 'function') return `(függvény: ${v.name || 'névtelen'})`;
  if (t === 'string' || t === 'number' || t === 'boolean') {
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  try {
    const seen = new WeakSet();
    const out = JSON.stringify(v, (_k, val) => {
      if (typeof val === 'bigint') return `${val}n`;
      if (val && typeof val === 'object') {
        if (seen.has(val)) return '(körkörös hivatkozás)';
        seen.add(val);
      }
      return val;
    });
    return out === undefined ? `(${Array.isArray(v) ? 'tömb' : t})` : out.slice(0, 200);
  } catch {
    return `(${Array.isArray(v) ? 'tömb' : t} — nem megjeleníthető)`;
  }
}
