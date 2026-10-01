// tests/e2e/lateResponse.mjs — A KÉSŐI VÁLASZ MÉRÉSÉNEK KÖZÖS FEGYELME (R129/R130 → R134).
//
// MIÉRT KÜLÖN MODUL. Ez a hat segéd az R127–R130 körökben SZÜLETETT, és a leletei ott vannak
// kimondva: a befejezésjel a `fulfill` UTÁN áll be (F129-01), a feldolgozás tanúja a lap SAJÁT
// törzs-olvasása, a „folyamatban" állítás pedig várakozó (KUKA-228). Az R134 ugyanezt kéri az ÚJ
// válaszokra (visszavonás · újrahívás) — és egy MÁSODIK másolat előbb-utóbb elcsúszna az elsőtől
// (KUKA-003 · KUKA-018: egy fogalom, egy otthon). Ezért a fegyelem ITT lakik, és MINDEN próba ezt
// hívja; az R127-es lap a saját, minta-szakaszra szabott segédeit megtartotta.
//
// AMIT EZ A MODUL NEM TESZ: nem alszik rögzített ideig, és nem állít a terméktől független
// időzítést — minden várakozás a lap SAJÁT eseményütemezéséhez kötött.
import { expect } from '@playwright/test';

/**
 * PRÓBAOLDALI MEGFIGYELŐ A LAPON: mikor vette át az ALKALMAZÁS a válasz TÖRZSÉT.
 *
 * MIÉRT KELL. A `route.fulfill` befejezése azt mondja meg, hogy a válasz elment a lap felé — azt
 * NEM, hogy az alkalmazás fel is dolgozta. Az `api()` a törzset `res.json()`-nal olvassa; a hívó
 * folytatása (`kerd` → `Promise.all` → a nemzedék-kapu) EZUTÁN kerül a mikrotaszk-sorba. Ezért a
 * burkolat a saját ígéretét a `json()` LEFUTÁSA UTÁN oldja fel, és feljegyzi az utat.
 *
 * A TERMÉKKÓD VÁLTOZATLAN: az `api()` a GLOBÁLIS `fetch`-et hívja, névfeloldással hívás közben —
 * tehát a burkolást a próba kívülről teszi rá, a lap kódjához nem nyúlunk.
 */
export function fetchWatchScript() {
  if (window.__r129watch) return;                   // idempotens: újratöltés és ismételt hívás után is egy burkolat
  const w = { bodyRead: [], responses: [] };
  window.__r129watch = w;
  const orig = window.fetch;
  window.fetch = async (...args) => {
    const res = await orig.apply(window, args);
    const ref = res.url || (typeof args[0] === 'string' ? args[0] : '');
    let ut = '';
    try { ut = new URL(ref, location.href).pathname; } catch { ut = String(ref); }
    w.responses.push(ut);
    const origJson = res.json.bind(res);
    Object.defineProperty(res, 'json', {
      configurable: true,
      value: async () => { const v = await origJson(); w.bodyRead.push(ut); return v; },
    });
    return res;
  };
}

export async function installFetchWatch(page) { await page.evaluate(fetchWatchScript); }

/** Hányszor olvasta be az ALKALMAZÁS ennek az ÚTNAK a törzsét (pontos út-egyezés, nem prefix). */
export async function bodyReads(page, ut) {
  return page.evaluate((u) => (window.__r129watch
    ? window.__r129watch.bodyRead.filter((x) => x === u).length : -1), ut);
}

/**
 * EGY ESEMÉNY-FORDULÓ — NEM ALVÁS, hanem az esemény-sor szabálya.
 *
 * Egy makrotaszk (`setTimeout(…, 0)`) elé a böngésző a TELJES mikrotaszk-sort kiüríti. A válasz
 * törzsének beolvasása után sorba került folytatások (`kerd` visszatérése, a `Promise.all`
 * feloldása, a nemzedék-kapu, és rajzolás esetén a `render()`) tehát eddigre lefutottak; a
 * rajzolási keret (`requestAnimationFrame`) még azt is megvárja, hogy a rajzolás KI IS látszódjon.
 * Rögzített hosszú várakozás nincs — a hívás a lap saját eseményütemezéséhez kötött.
 */
export async function drainTurn(page) {
  await page.evaluate(() => new Promise((r) => {
    setTimeout(() => requestAnimationFrame(() => r(null)), 0);
  }));
}

/**
 * EGY ÚTVONAL VISSZATARTÁSA — a szerver KISZOLGÁLJA, a lap CSAK elengedésre kapja meg.
 *
 * Az illesztés FÜGGVÉNNYEL megy, nem glob-bal: a `/api/data/document` és a
 * `/api/data/document-full` út egymás prefixe, és egy `**\/api/data/document**` alakú minta
 * MINDKETTŐT elkapná — a mérés így a szomszéd végpontot igazolná (KUKA-239).
 */
export async function holdRoute(page, pathname) {
  let release = null;
  const held = new Promise((r) => { release = r; });
  let atadvaJel = null;
  const delivered = new Promise((r) => { atadvaJel = r; });
  const state = { seen: 0, servedBody: null, releasedAt: null, deliveredAt: null };
  await page.route((u) => u.pathname === pathname, async (route) => {
    state.seen += 1;
    if (state.seen === 1) {
      const response = await route.fetch();          // a szerver MÁR kiszolgálta a RÉGI nézetre
      state.servedBody = await response.text();
      await held;                                     // ESEMÉNY, nem alvás
      state.releasedAt = Date.now();
      await route.fulfill({ response, body: state.servedBody });
      // A BEFEJEZÉSJEL A `fulfill` UTÁN áll be — ez volt az R129/F129-01 lelete. Előtte beállítva
      // a rá várakozó állítások az átadás BEFEJEZÉSE előtt is átmentek volna.
      state.deliveredAt = Date.now();
      atadvaJel(null);
      return;
    }
    await route.continue();                           // a KÖVETKEZŐ kérés az ÚJ nézeté — átmegy
  });
  // A VISSZAADOTT OBJEKTUM NEM MÁSOLJA az állapotot (nincs `...state`): egy másolat a mérés
  // pillanatában lefagyott értéket vinne, és a próba a SAJÁT régi képét igazolná (KUKA-259).
  return { release: () => release(), delivered, path: pathname, get: () => state };
}

/**
 * A KÉRÉS KIMENT, A SZERVER KISZOLGÁLTA, ÉS A VÁLASZ MÉG VISSZA VAN TARTVA — ez a „folyamatban"
 * bizonyítéka. VÁRAKOZÓ állítás: a navigáció visszatérése után a route-kezelő még a `route.fetch()`
 * belsejében lehet, tehát egyszeri mintavétel a saját versenyhelyzetét mérné (KUKA-228 · KUKA-120).
 */
export async function inFlight(h, nev) {
  await expect.poll(() => h.get().servedBody !== null,
    { message: `${nev}: a szerver kiszolgálta a visszatartott kérést`, timeout: 10000 }).toBe(true);
  expect(h.get().seen, `${nev}: pontosan egy kérés ment ki`).toBe(1);
  expect(h.get().releasedAt, `${nev}: a válasz még VISSZA VAN TARTVA`).toBeNull();
  expect(h.get().deliveredAt, `${nev}: az átadás még nem fejeződött be`).toBeNull();
}

/**
 * ELENGEDÉS ÉS A TÉNYLEGES ÁTVÉTEL MEGVÁRÁSA — a három jel EGYÜTT (F129-01).
 *
 * 1. a `route.fulfill` LEFUTOTT (`delivered` · `deliveredAt`) — a hálózati átadás megtörtént;
 * 2. az ALKALMAZÁS beolvasta ENNEK AZ ÚTNAK a törzsét (`res.json()` a lapon) — a feldolgozás
 *    megkezdődött, és a hívó folytatása a mikrotaszk-sorba került;
 * 3. egy esemény-forduló lefutott — tehát a folytatás (`Promise.all` → nemzedék-kapu → rajzolás
 *    vagy visszatérés) nem „még úton van", hanem VÉGET ÉRT.
 */
export async function atad(page, h, nev) {
  const elotte = await bodyReads(page, h.path);
  expect(elotte, `${nev}: a lapon áll a próbaoldali megfigyelő`).toBeGreaterThanOrEqual(0);
  h.release();
  await h.delivered;
  expect(h.get().deliveredAt, `${nev}: az átadás BEFEJEZŐDÖTT`).not.toBeNull();
  await expect.poll(() => bodyReads(page, h.path),
    { message: `${nev}: az ALKALMAZÁS beolvasta a visszatartott válasz törzsét`, timeout: 10000 })
    .toBe(elotte + 1);
  await drainTurn(page);
}
