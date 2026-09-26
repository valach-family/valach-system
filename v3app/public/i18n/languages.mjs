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

/** Az `Accept-Language` fejléc első HASZNÁLHATÓ nyelve (q-súly szerint), különben az alapnyelv. */
export function parseAcceptLanguage(header, opts = {}) {
  const raw = String(header ?? '');
  if (!raw.trim()) return BASE_LANGUAGE;
  const tags = raw.split(',').map((part) => {
    const [tag, ...params] = part.split(';').map((s) => s.trim());
    const q = params.map((p) => /^q=([0-9.]+)$/i.exec(p)).find(Boolean);
    return { tag, q: q ? Number(q[1]) : 1 };
  }).filter((x) => x.tag && Number.isFinite(x.q)).sort((a, b) => b.q - a.q);
  for (const { tag } of tags) {
    const wanted = normalizeLanguage(tag, opts);
    // A `normalizeLanguage` ismeretlennél az alapnyelvet adja — ez ITT nem találat, csak ha a
    // címke TÉNYLEG erre a nyelvre mutat (különben az első idegen címke „eltalálná" a magyart).
    const asked = String(tag).toLowerCase().split(/[-_]/)[0];
    if (wanted !== BASE_LANGUAGE || asked === BASE_LANGUAGE) return wanted;
  }
  return BASE_LANGUAGE;
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
    return { code: parseAcceptLanguage(acceptLanguage, opts), source: 'accept_language', matched: true };
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
