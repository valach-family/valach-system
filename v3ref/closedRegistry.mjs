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
