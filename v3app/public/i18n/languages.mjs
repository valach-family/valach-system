// v3app/public/i18n/languages.mjs — LANG-01: A BŐVÍTHETŐ NYELVJEGYZÉK, EGY OTTHONBAN (R89 §5).
//
// A LELET, AMI EZT KIKÉNYSZERÍTETTE. A V2-ben a nyelv HÁROM tagú, kézzel írt tömb volt
// (`src/i18n/languages.js`: `['hu','en','de']`), és a hozzá tartozó szabályok (visszaesés, emberi
// név) ugyanabban a fájlban, de MÁS fájlok is ismételték a hármas listát. Egy negyedik nyelv
// felvétele így nem TARTALOM-, hanem KÓD-kérdés volt: a vezérlést kellett átírni hozzá. Az R89-es
// terv kikötése ezért: „Egy bővíthető nyelvjegyzék: azonosító, saját nyelvű név, írásirány,
// engedélyezési állapot, kifejezett helyettesítő nyelv. Nem több fájlba másolt hu/en/de lista."
//
// AMIT EZ A FÁJL BIRTOKOL: hogy MELY nyelvek léteznek, melyik van BEKAPCSOLVA, mi az írásirányuk,
// és melyik nyelv a kimondott HELYETTESÍTŐJÜK. A szavakat NEM ez a fájl tartja — azok a
// nyelvcsomagokban állnak (`hu.mjs` · `en.mjs` · `de.mjs` · …), és a feloldó (`dict.mjs`) fűzi
// össze őket ezzel a jegyzékkel.
//
// AMIT EZ A FÁJL SOHA NEM DÖNT EL — kimondva, mert a terv külön kikötötte: „A felület nyelve nem
// választ automatikusan országot, adózási rendet, időzónát vagy pénznemet." A `locale` mező ITT
// KIZÁRÓLAG szám- és dátumformázásra szolgál (Intl), és semmilyen üzleti következménye nincs.
//
// SZABVÁNY: a kód RFC 5646 alakú nyelvazonosító, az írásirány KÜLÖN mező — a W3C is külön kezeli a
// kettőt (https://www.w3.org/International/questions/qa-html-language-declarations).

/** A jegyzék EGYETLEN alakja. Új nyelv = EGY új sor itt + EGY nyelvcsomag — kódot nem írunk hozzá. */
export const LANGUAGES = Object.freeze([
  Object.freeze({
    code: 'hu', endonym: 'magyar', dir: 'ltr', locale: 'hu-HU',
    enabled: true, fallback: null, kind: 'product',
    note: 'alapnyelv és a lánc VÉGE: minden más nyelv ide esik vissza',
  }),
  Object.freeze({
    code: 'en', endonym: 'English', dir: 'ltr', locale: 'en-GB',
    enabled: true, fallback: 'hu', kind: 'product',
    note: 'bekapcsolt termék-nyelv',
  }),
  Object.freeze({
    code: 'de', endonym: 'Deutsch', dir: 'ltr', locale: 'de-DE',
    enabled: true, fallback: 'hu', kind: 'product',
    note: 'bekapcsolt termék-nyelv',
  }),
  // A NEGYEDIK NYELV PRÓBÁJA (R89 §5 utolsó pontja). A terv kikötése szó szerint: „Francia
  // próba-nyelvcsomaggal bizonyítani kell, hogy egy negyedik nyelv a nyelvjegyzéken és tartalmon
  // keresztül felvehető, a felületi/segéd vezérlés átírása nélkül. A próba nem jelenti a teljes
  // francia termék bekapcsolását." Ezért `kind: 'probe'` és `enabled: false`: a felület
  // NYELVVÁLASZTÓJÁBAN nem kínáljuk, de a feloldó és a mérés fel tudja venni — és a mérés KI IS
  // ÍRJA, mennyi hiányzik belőle (KUKA-050: hiányos nyelvet nem nevezünk támogatottnak).
  Object.freeze({
    code: 'fr', endonym: 'français', dir: 'ltr', locale: 'fr-FR',
    enabled: false, fallback: 'en', kind: 'probe',
    note: 'PRÓBA-nyelvcsomag: azt bizonyítja, hogy egy negyedik nyelv TARTALOMBÓL felvehető — '
      + 'nem bekapcsolt termék-nyelv, és a fordítása nincs ellenőrizve',
  }),
  // JOBBRÓL BALRA ÍRT PRÓBATARTALOM (R89 §5). A terv kikötése: „Jobbról balra írt próbatartalommal
  // az alapelrendezést is ellenőrizni kell; ez nem arab fordítás elfogadása." Ezért a kód
  // SZÁNDÉKOSAN privát alhasználat-jelöléses (`-x-proba`, RFC 5646 privát alcímke): senki nem
  // hiheti, hogy ez arab termék-nyelv lenne.
  Object.freeze({
    code: 'ar-x-proba', endonym: 'اختبار (RTL próba)', dir: 'rtl', locale: 'ar',
    enabled: false, fallback: 'en', kind: 'probe',
    note: 'RTL PRÓBATARTALOM az elrendezés méréséhez — NEM arab fordítás és nem termék-nyelv',
  }),
]);

/** A visszaesési lánc VÉGE: ez a nyelv mindig teljes (az összes kulcs itt áll). */
export const BASE_LANGUAGE = 'hu';

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));

/** Egy nyelv leírója vagy `null`. Saját kulcson oldunk fel (SOP-01: az örökölt név nem nyelv). */
export function languageOf(code) {
  const key = String(code ?? '').trim();
  return BY_CODE.has(key) ? BY_CODE.get(key) : null;
}

/** A felületen KÍNÁLHATÓ nyelvek (bekapcsolt termék-nyelvek) — a próbák NEM szerepelnek benne. */
export function enabledLanguages() {
  return LANGUAGES.filter((l) => l.enabled === true && l.kind === 'product');
}

/** MINDEN ismert nyelv, a próbákkal együtt — ezt a MÉRÉS használja, nem a felület. */
export function allLanguages() { return [...LANGUAGES]; }

/**
 * NORMALIZÁLÁS. Pontos találat előbb (`ar-x-proba`), utána a nyelv-alcímke (`de-AT` → `de`).
 * Ismeretlen bemenetnél az alapnyelv — és ez KIMONDOTT szabály, nem csendes elnyelés: a hívó a
 * `resolveLanguage` `matched` mezőjéből megtudja, hogy nem a kért nyelvet kapta.
 */
export function normalizeLanguage(input, { includeProbes = false } = {}) {
  const raw = String(input ?? '').trim();
  if (!raw) return BASE_LANGUAGE;
  const usable = (l) => Boolean(l) && (includeProbes || (l.enabled === true && l.kind === 'product'));
  const exact = languageOf(raw);
  if (usable(exact)) return exact.code;
  const primary = raw.toLowerCase().split(/[-_]/)[0];
  const byPrimary = languageOf(primary);
  if (usable(byPrimary)) return byPrimary.code;
  return BASE_LANGUAGE;
}

/**
 * AZ `Accept-Language` FEJLÉC VÁLASZTÁSA — ÉS HOGY VOLT-E TALÁLAT (LNG-03, F154-05 · F154-06).
 *
 * KÉT MÉRT HIBA VOLT EBBEN AZ EGY FÜGGVÉNYBEN:
 *
 * F154-06 — A `q=0` ELFOGADÁSKÉNT SZÁMÍTOTT. Az RFC 7231 §5.3.1 kimondja: *„a 0 súly azt jelenti,
 * hogy NEM elfogadható."* A régi alak a `q=0`-t egy sima, legkisebb súlyú ELŐNYBEN RÉSZESÍTÉSNEK
 * vette, ezért MÉRVE: `Accept-Language: de;q=0` → `de`, és `en;q=0` → `en`. Vagyis aki kifejezetten
 * KIZÁRTA a németet, pont németet kapott. A fájl fejléce szabványra hivatkozik (RFC 5646 · W3C) —
 * egy hivatkozott szabványt viszont MEG IS KELL MÉRNI, különben csak idézet (KUKA-050).
 *
 * F154-05 — A TALÁLAT TÉNYE ELVESZETT. A függvény csak a KÓDOT adta vissza, és az alapnyelv
 * kétértelmű: ugyanazt kapja a „magyart kért és magyart kapott" és a „franciát kért, nincs francia,
 * ezért magyar". A hívó (`resolveLanguage`) ezért a `matched` mezőt HARDKÓDOLT `true`-ra tette a
 * fejléc-úton — tehát a nyugta hazudott. Innentől a találat ténye a visszatérés RÉSZE.
 *
 * A `parseAcceptLanguage` szerződése NEM változik (a kódot adja), hogy a mai hívók érintetlenek
 * maradjanak; a bővebb alakot a `pickFromAcceptLanguage` adja.
 *
 * @returns {{code:string, matched:boolean}} `matched` = a fejléc EGYIK címkéje tényleg erre mutatott
 */
export function pickFromAcceptLanguage(header, opts = {}) {
  const raw = String(header ?? '');
  if (!raw.trim()) return Object.freeze({ code: BASE_LANGUAGE, matched: false });
  const parsed = raw.split(',').map((part) => {
    const [tag, ...params] = part.split(';').map((s) => s.trim());
    const q = params.map((p) => /^q=([0-9.]+)$/i.exec(p)).find(Boolean);
    return { tag, q: q ? Number(q[1]) : 1 };
  }).filter((x) => x.tag && Number.isFinite(x.q));

  /**
   * A KIZÁRÁST MEG IS KELL TARTANI, ÉS A JOKERT IS ÉRTENI (F154-33, külső review, Codex, hetedik kör).
   *
   * A LELET a SAJÁT F154-06 javításom ára: a `q=0`-t kiszűrtem a listából — ezzel a kizárás TÉNYE
   * elveszett. MÉRVE: `Accept-Language: hu;q=0, *;q=1` → `hu`, vagyis pont azt a nyelvet adtuk, amit
   * a kérő KIFEJEZETTEN kizárt; és a `*` jokert sem vettük figyelembe, holott az mondja ki, hogy
   * bármely más nyelv jó lenne. A szűrés tehát a hiba egyik felét javította, a másikat elrejtette.
   *
   * A MAI SZABÁLY: a `q=0` címkék KIZÁRÁST képeznek (`*;q=0` = minden más kizárva), a pozitív
   * címkéket súly szerint járjuk be, a `*` a JEGYZÉK SORRENDJÉBEN ad egy nem kizárt nyelvet, és
   * kizárt nyelvre még az alapnyelvre-esés sem vezethet. Ha MINDENT kizártak, a lapot akkor is ki
   * kell rajzolni: az alapnyelv megy, de `matched: false`-szal — nem állítjuk, hogy teljesítettük a
   * kérést (KUKA-049 · KUKA-129).
   */
  const zero = parsed.filter((x) => x.q === 0).map((x) => x.tag.toLowerCase());
  const excluded = new Set(zero.filter((t) => t !== '*').map((t) => t.split(/[-_]/)[0]));
  const excludesRest = zero.includes('*');
  const allowed = (code) => !excluded.has(String(code).toLowerCase().split(/[-_]/)[0]);
  const firstAllowed = () => (enabledLanguages().map((l) => l.code).find((c) => allowed(c)) || null);

  const wanted = parsed.filter((x) => x.q > 0).sort((a, b) => b.q - a.q);
  for (const { tag } of wanted) {
    if (tag === '*') {
      // A JOKER: bármi elfogadható, amit nem zártak ki — a jegyzék sorrendje dönt.
      const pick = allowed(BASE_LANGUAGE) ? BASE_LANGUAGE : firstAllowed();
      if (pick) return Object.freeze({ code: pick, matched: true });
      continue;
    }
    const asked = String(tag).toLowerCase().split(/[-_]/)[0];
    if (excluded.has(asked)) continue;                 // ugyanaz a nyelv máshol `q=0`-val: kizárva
    const code = normalizeLanguage(tag, opts);
    if (!allowed(code)) continue;                      // az alapnyelvre-esés sem mehet kizárt nyelvre
    // A `normalizeLanguage` ismeretlennél az alapnyelvet adja — ez ITT nem találat, csak ha a
    // címke TÉNYLEG erre a nyelvre mutat (különben az első idegen címke „eltalálná" a magyart).
    if (code !== BASE_LANGUAGE || asked === BASE_LANGUAGE) return Object.freeze({ code, matched: true });
  }
  // NINCS TALÁLAT. Az alapnyelv megy — kivéve, ha azt (vagy a `*`-gal mindent) kizárták.
  if (allowed(BASE_LANGUAGE) && !excludesRest) return Object.freeze({ code: BASE_LANGUAGE, matched: false });
  if (!excludesRest) {
    const pick = firstAllowed();
    if (pick) return Object.freeze({ code: pick, matched: false });
  }
  return Object.freeze({ code: BASE_LANGUAGE, matched: false });
}

/** Az `Accept-Language` fejléc első HASZNÁLHATÓ nyelve (q-súly szerint), különben az alapnyelv. */
export function parseAcceptLanguage(header, opts = {}) {
  return pickFromAcceptLanguage(header, opts).code;
}

/**
 * A KÉRÉS NYELVE — és hogy MIÉRT az (`source`), meg hogy a KÉRT nyelvet kapta-e (`matched`).
 * A sorrend: kifejezett választás → tárolt beállítás → böngésző fejléce → alapnyelv.
 */
export function resolveLanguage({ explicit, stored, acceptLanguage } = {}, opts = {}) {
  for (const [value, source] of [[explicit, 'explicit'], [stored, 'stored']]) {
    const raw = String(value ?? '').trim();
    if (!raw) continue;
    const code = normalizeLanguage(raw, opts);
    return { code, source, matched: code === normalizeLanguage(raw, { includeProbes: true }) && Boolean(languageOf(raw) || languageOf(raw.toLowerCase().split(/[-_]/)[0])) };
  }
  if (String(acceptLanguage ?? '').trim()) {
    // A `matched` NEM HARDKÓDOLHATÓ (F154-05). A régi alak mindig `true`-t adott, ezért a
    // `Accept-Language: fr-FR` → `hu` esetre is azt állította, hogy a KÉRT nyelvet kapta — miközben
    // UGYANEZ a kérés `explicit: 'fr'`-ként helyesen `matched: false`-t adott. Egy kérdésre egy
    // válasz: a találat tényét az oldja fel, aki a választást is (KUKA-238 · KUKA-129).
    const got = pickFromAcceptLanguage(acceptLanguage, opts);
    return { code: got.code, source: 'accept_language', matched: got.matched };
  }
  return { code: BASE_LANGUAGE, source: 'default', matched: true };
}

/**
 * A KIMONDOTT VISSZAESÉSI LÁNC egy nyelvhez: `['de','hu']`. Kör esetén megáll (a lánc nem
 * végtelen), és az alapnyelv MINDIG a vége — a feloldó erre támaszkodik.
 */
export function fallbackChainOf(code) {
  const chain = [];
  let cur = languageOf(normalizeLanguage(code, { includeProbes: true }));
  const seen = new Set();
  while (cur && !seen.has(cur.code)) {
    chain.push(cur.code);
    seen.add(cur.code);
    cur = cur.fallback ? languageOf(cur.fallback) : null;
  }
  if (!chain.includes(BASE_LANGUAGE)) chain.push(BASE_LANGUAGE);
  return chain;
}

/** Az írásirány — a felület `dir` attribútumához. Ismeretlen nyelvnél `ltr`. */
export function dirOf(code) {
  const l = languageOf(normalizeLanguage(code, { includeProbes: true }));
  return l && l.dir === 'rtl' ? 'rtl' : 'ltr';
}

/** Az Intl-hez használt területi címke — KIZÁRÓLAG szám- és dátumformázásra (lásd a fejlécet). */
export function localeOf(code) {
  const l = languageOf(normalizeLanguage(code, { includeProbes: true }));
  return (l && l.locale) || 'hu-HU';
}

export const LANG_CONTRACT = Object.freeze({
  id: 'LANG-01',
  owns: 'mely nyelvek léteznek, melyik van bekapcsolva, az írásirányuk és a kimondott helyettesítőjük',
  does_not_own: 'a szavak (azok a nyelvcsomagokban állnak) és a fordítás minősége',
  never_decides: 'ország · adózási rend · időzóna · pénznem — a felület nyelve ezekről NEM dönt',
  probe_languages: Object.freeze(LANGUAGES.filter((l) => l.kind === 'probe').map((l) => l.code)),
  base_language: BASE_LANGUAGE,
  standard: 'RFC 5646 nyelvazonosító · a W3C szerint az írásirány KÜLÖN megadás',
});
