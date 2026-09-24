// v3app/public/demoData.mjs — A BEMUTATÓ SZINTETIKUS ADATAI (DEM-01, R81 §7).
//
// MI EZ, ÉS MI NEM. Ezek KITALÁLT sorok, hogy a képernyők elrendezése és a fogalmak érthetők
// legyenek — üzleti modul NEM tartozik hozzájuk: nincs készletmozgás, könyvelés, számlázás.
// Ezért minden ilyen lista a felületen jelölve van (`Bemutató · mintaadatok`), és a megjelenésük
// a VALÓDI mag jogosultságától függ: ha a core nem adja ki az adatot, a mintatábla SEM látszik
// (R81 §7 utolsó bekezdés · UX-20).
//
// A MENNYISÉG HÁROM ÁLLAPOTA KÜLÖN SZÓT KAP (R19 QNT · UX-19): `mert` · `becsult` · `ismeretlen`.
// Az ISMERETLEN NEM NULLA, és a különböző mértékegységű mennyiségeket nem adjuk össze.
// A mértékegység és a pénznem a szintetikus csomag DEKLARÁLT adata — nem a felület találja ki.

const frozen = (x) => Object.freeze(x);

/** Fiókonként KÜLÖN adat: váltáskor ugyanaz a tábla nem maradhat másik cégnév alatt (R81 §7). */
export const DEMO = frozen({
  default: frozen({
    products: frozen([
      frozen({ name: 'Rögzítőelem M8', code: 'TERM-001', kind: 'Alkatrész', qty: '840', unit: 'db', quality: 'mert', warehouse: 'Központi raktár', price: '45', currency: 'HUF' }),
      frozen({ name: 'Papírtasak', code: 'TERM-002', kind: 'Csomagolóanyag', qty: '1 200', unit: 'db', quality: 'mert', warehouse: 'Központi raktár', price: null, currency: 'HUF' }),
      frozen({ name: 'Alapanyag A', code: 'TERM-003', kind: 'Alapanyag', qty: null, unit: 'kg', quality: 'ismeretlen', warehouse: 'Központi raktár', price: null, currency: 'HUF' }),
      frozen({ name: 'Rézvezeték', code: 'TERM-004', kind: 'Alapanyag', qty: '48', unit: 'm', quality: 'becsult', warehouse: 'Műhely', price: '980', currency: 'HUF' }),
      frozen({ name: 'Karbantartási csomag', code: 'TERM-005', kind: 'Szolgáltatás', qty: null, unit: null, quality: 'ismeretlen', warehouse: 'Műhely', price: null, currency: 'HUF' }),
    ]),
    partners: frozen([
      frozen({ name: 'Észak Műhely Kft.', kind: 'Vevő', country: 'Magyarország' }),
      frozen({ name: 'Nova Werk GmbH', kind: 'Szállító', country: 'Németország' }),
      frozen({ name: 'Németh Júlia', kind: 'Vevő', country: 'Magyarország' }),
    ]),
    warehouses: frozen([
      frozen({ name: 'Központi raktár', kind: 'Alapanyag és késztermék' }),
      frozen({ name: 'Műhely', kind: 'Feldolgozás' }),
    ]),
    processes: frozen([
      frozen({ code: 'FOL-026', name: 'Összeállítás', state: 'Folyamatban', at: '2026-09-24T09:35:00Z' }),
      frozen({ code: 'FOL-025', name: 'Beérkezés', state: 'Lezárva', at: '2026-09-23T14:10:00Z' }),
      frozen({ code: 'FOL-024', name: 'Raktári kiadás', state: 'Előkészítés', at: '2026-09-23T08:05:00Z' }),
    ]),
    documents: frozen([
      frozen({ code: 'MEG-2026-018', kind: 'Megrendelés', partner: 'Észak Műhely Kft.', at: '2026-09-24T10:00:00Z' }),
      frozen({ code: 'SZL-2026-011', kind: 'Szállítólevél', partner: 'Nova Werk GmbH', at: '2026-09-23T16:30:00Z' }),
    ]),
    movements: frozen([
      frozen({ at: '2026-09-24T09:00:00Z', product: 'Rögzítőelem M8', op: 'Beérkezés', qty: '200', unit: 'db' }),
      frozen({ at: '2026-09-23T15:20:00Z', product: 'Papírtasak', op: 'Raktári kiadás', qty: '−80', unit: 'db' }),
    ]),
  }),
  /** MÁSODIK cégtér: LÁTHATÓAN más adat — így a fiókváltás tévedése azonnal kiderül (UX-05). */
  second: frozen({
    products: frozen([
      frozen({ name: 'Szenzormodul', code: 'DG-001', kind: 'Alkatrész', qty: '120', unit: 'db', quality: 'mert', warehouse: 'Központi raktár', price: '18,50', currency: 'EUR' }),
      frozen({ name: 'Szerelőkábel', code: 'DG-002', kind: 'Alapanyag', qty: null, unit: 'm', quality: 'ismeretlen', warehouse: 'Központi raktár', price: null, currency: 'EUR' }),
      frozen({ name: 'Hővezető paszta', code: 'DG-003', kind: 'Alapanyag', qty: '7,5', unit: 'kg', quality: 'becsult', warehouse: 'Központi raktár', price: '42,00', currency: 'EUR' }),
    ]),
    partners: frozen([frozen({ name: 'Weber Handels GmbH', kind: 'Vevő', country: 'Németország' })]),
    warehouses: frozen([frozen({ name: 'Központi raktár', kind: 'Alapanyag és késztermék' })]),
    processes: frozen([frozen({ code: 'FOL-101', name: 'Beérkezés', state: 'Lezárva', at: '2026-09-22T11:00:00Z' })]),
    documents: frozen([frozen({ code: 'MEG-2026-004', kind: 'Megrendelés', partner: 'Weber Handels GmbH', at: '2026-09-22T09:00:00Z' })]),
    movements: frozen([frozen({ at: '2026-09-22T11:05:00Z', product: 'Szenzormodul', op: 'Beérkezés', qty: '120', unit: 'db' })]),
  }),
});

/** A mennyiség HÁROM állapotának felirata — az ismeretlen soha nem nulla (UX-19). */
export const QUALITY_LABEL = Object.freeze({ mert: 'Mért', becsult: 'Becsült', ismeretlen: 'Nem ismert' });

/**
 * MELYIK mintacsomag tartozik ehhez a fiókhoz? A választás a könyv AZONOSÍTÓJÁBÓL dől el (stabil,
 * de fiókonként eltérő) — így minden fiók a SAJÁT adatát mutatja, és a váltás látható változás.
 */
export function demoFor(bookId) {
  if (!bookId) return DEMO.default;
  let sum = 0;
  for (const ch of String(bookId)) sum = (sum + ch.charCodeAt(0)) % 997;
  return sum % 2 === 0 ? DEMO.default : DEMO.second;
}
