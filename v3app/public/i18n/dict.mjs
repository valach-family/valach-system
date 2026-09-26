// v3app/public/i18n/dict.mjs — I18N-01: A FELOLDÓ (LANG-01 fölött, R89 §5).
//
// MIT BIRTOKOL. Azt, hogy egy KULCS melyik nyelvcsomagból kapja az értékét: az AKTÍV nyelvből, ha
// megvan, különben a KIMONDOTT visszaesési láncon (`languages.mjs` → `fallbackChainOf`). A lánc
// VÉGE a magyar, ami teljes — ezért kulcs SOHA nem tűnik el, és gépi kulcs SOHA nem jelenik meg a
// képernyőn (KUKA-210: a mag szava nem a felhasználó szava).
//
// ÉS AMIT UGYANEZ NEM JELENT: a visszaesés NEM lefedettség. Egy hiányzó fordítás magyarul jelenik
// meg — ez a felhasználónak jobb, mint egy kulcs, de a mérésben NEM „kész". A `coverageOf()` ezért
// kulcsonként megmondja, MELYIK nyelv szolgálta ki, és a `verify:i18n` ebből számol hiányt, elavulást
// és paraméter-eltérést. „Hiányzó vagy elavult fordítás nem számít teljes lefedésnek." (R89 §5)
//
// A PARAMÉTER IS SZERZŐDÉS. A `{jel}` helyőrzők a mondat ALAKJÁHOZ tartoznak: ha egy fordításból
// kimarad vagy elgépelik, a mondat csendben elveszít egy adatot (a fiók nevét, egy dátumot). Ezért a
// mérés a helyőrző-KÉSZLETET is összeveti, nem csak a kulcs meglétét (KUKA-039: a fél őr nem őr).
//
// TISZTA MODUL: se DOM, se hálózat, se írás. A böngésző lapja és a `verify:i18n` UGYANEZT a fájlt
// hívja (KUKA-207: amit a próba nem tud meghívni, azt bizalomból hisszük).
import * as hu from './hu.mjs';
import * as en from './en.mjs';
import * as de from './de.mjs';
import * as fr from './fr.mjs';
import * as rtlProba from './rtl_proba.mjs';
import { BASE_LANGUAGE, fallbackChainOf, normalizeLanguage, dirOf, localeOf, languageOf, enabledLanguages, allLanguages, resolveLanguage} from './languages.mjs';

/** A CSOMAGOK — a jegyzék kódja a kulcs. Új nyelv: EGY sor a jegyzékben + EGY sor itt. */
export const PACKS = Object.freeze({
  hu, en, de, fr, 'ar-x-proba': rtlProba,
});

/** A SZÖVEG-CSOPORTOK — ez a lista a szerződés, nem a hívó emlékezete. */
export const TEXT_GROUPS = Object.freeze([
  'PAGE', 'NAV', 'ROLE', 'SCOPE', 'SCOPE_ACC', 'PLAN', 'QUALITY',
  'TPL', 'REASON', 'UNBOUND', 'STATE', 'UI', 'HELP', 'TOURUI', 'CHAT',
  // A SZERVER ÁLTAL RAJZOLT LAPOK ÉS A PRÓBAÜZENETEK is a szótárból jönnek (F91-02).
  'SRV',
]);

/** A MÉLY (funkció-tudás) csoportok — külön kezeljük, mert al-objektumokat tartanak. */
export const DEEP_GROUPS = Object.freeze(['KB', 'FAQ', 'TOUR', 'SEARCH']);

let active = BASE_LANGUAGE;
const merged = new Map();

const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** Egy csoport ÖSSZEFŰZÉSE a láncon: az ELSŐ nyelv nyer, ami hozza a kulcsot. */
function mergeGroup(group, chain) {
  const out = {};
  for (const code of [...chain].reverse()) {          // hátulról előre: az elsőbbség felülír
    const src = (PACKS[code] || {})[group];
    if (!isPlainObject(src)) continue;
    for (const [k, v] of Object.entries(src)) {
      if (v === undefined || v === null || v === '') continue;
      out[k] = isPlainObject(v) ? { ...(isPlainObject(out[k]) ? out[k] : {}), ...v } : v;
    }
  }
  return Object.freeze(out);
}

/** A TELJES szótár egy nyelvhez — gyorsítótárazva, mert a rajzolás sokszor kéri. */
export function dictFor(code) {
  const lang = normalizeLanguage(code, { includeProbes: true });
  if (merged.has(lang)) return merged.get(lang);
  const chain = fallbackChainOf(lang);
  const box = {};
  for (const g of [...TEXT_GROUPS, ...DEEP_GROUPS]) box[g] = mergeGroup(g, chain);
  // A KB_SOURCE NEM ÖSSZEFŰZŐDIK: a fordítás állapota NYELVENKÉNT igaz, a visszaesés nem „ellenőrzött
  // fordítás" (KUKA-094: a hiányzó tanú nem zöld).
  box.KB_SOURCE = Object.freeze({ ...((PACKS[lang] || {}).KB_SOURCE || {}) });
  box.__lang = lang;
  box.__chain = Object.freeze(chain);
  const frozen = Object.freeze(box);
  merged.set(lang, frozen);
  return frozen;
}

/** Az AKTÍV szótár. */
export function dict() { return dictFor(active); }

/** A nyelv beállítása. Visszaadja a TÉNYLEGESEN beállított kódot (ismeretlennél az alapnyelvet). */
export function setLang(code, { includeProbes = false } = {}) {
  active = normalizeLanguage(code, { includeProbes });
  return active;
}
export function currentLang() { return active; }
export function currentDir() { return dirOf(active); }
export function currentLocale() { return localeOf(active); }
export function currentEndonym() { const l = languageOf(active); return l ? l.endonym : active; }
export { enabledLanguages, allLanguages, languageOf };

/**
 * EGY KULCS — és hogy MELYIK nyelv szolgálta ki. A `lang` mező a mérés bemenete: ha nem az aktív
 * nyelv adta, akkor ott VISSZAESÉS történt, és az nem lefedettség.
 */
export function lookup(group, key, code = active) {
  const lang = normalizeLanguage(code, { includeProbes: true });
  for (const c of fallbackChainOf(lang)) {
    const src = (PACKS[c] || {})[group];
    if (isPlainObject(src) && Object.prototype.hasOwnProperty.call(src, key)) {
      const v = src[key];
      if (v !== undefined && v !== null && v !== '') return { value: v, lang: c, fallback: c !== lang };
    }
  }
  return { value: null, lang: null, fallback: true };
}

/** A `{jel}` helyőrzők KÉSZLETE egy mondatban — a paraméter-szerződés mérésének bemenete. */
export function placeholdersOf(text) {
  if (typeof text !== 'string') return [];
  return [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();
}

/**
 * A PARAMÉTERES MONDAT BEHELYETTESÍTÉSE — EGY helyen, mint a V2-ben (KUKA-214).
 * Ismeretlen jelet NEM hagyunk a szövegben: a hiány DERÜLJÖN KI (`—`), ne látszódjon kulcsnak.
 */
export function tpl(key, vals, code = active) {
  const found = lookup('TPL', key, code);
  const t = found.value;
  if (typeof t !== 'string') return '';
  return t.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vals && vals[k] !== undefined && vals[k] !== null && String(vals[k]) !== '' ? String(vals[k]) : null;
    return v === null ? '—' : v;
  });
}

/** A szerver gépi okának emberi mondata az AKTÍV nyelven; ismeretlen oknál nevezett tartalék. */
export function reasonText(reason, fallback, code = active) {
  const found = reason ? lookup('REASON', reason, code) : { value: null };
  if (typeof found.value === 'string') return found.value;
  if (fallback) return fallback;
  const generic = lookup('REASON', 'generic', code);
  return typeof generic.value === 'string' ? generic.value : '';
}

/**
 * TÖBBES SZÁM — `Intl.PluralRules`-szal, nem `n === 1 ? … : …` alakkal (R89 §5: „Teljes mondatok,
 * paraméterezett szövegek, többesszám és helyi szám-/dátumformázás").
 * A `forms` a szótárból jön: `{ one: '…', other: '…' }` — a magyar `other`-t használ, az angol kettőt,
 * az arab hatot. Ami a nyelvben nincs, az `other`-re esik vissza, KIMONDVA.
 */
export function plural(n, forms, code = active) {
  const box = isPlainObject(forms) ? forms : {};
  let rule = 'other';
  try { rule = new Intl.PluralRules(localeOf(code)).select(Number(n)); } catch { rule = 'other'; }
  const pick = box[rule] !== undefined ? box[rule] : box.other;
  return typeof pick === 'string' ? pick.replace(/\{n\}/g, String(n)) : '';
}

/** Szám a FELHASZNÁLÓ területi alakján. A pénznemet NEM a nyelv adja (LANG-01). */
export function fmtNumber(n, code = active, opts = {}) {
  if (n === null || n === undefined || n === '') return '';
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);
  try { return new Intl.NumberFormat(localeOf(code), opts).format(num); } catch { return String(n); }
}

/** Dátum a FELHASZNÁLÓ területi alakján és időzónájában — ISO helyett (R81 §6). */
export function fmtDate(iso, code = active) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return d.toLocaleString(localeOf(code), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return d.toISOString(); }
}

/**
 * A FUNKCIÓ-TUDÁS EGY NYELVEN, a FORDÍTÁS ÁLLAPOTÁVAL EGYÜTT (R89 §3).
 *
 * `translation`: `checked` = ehhez a verzióhoz készült · `stale` = korábbi verzióhoz · `missing` =
 * ehhez a nyelvhez nincs (a szöveg a láncról jön). A hívó ezt KIÍRJA a súgó-panelen — a hiány nem
 * néma (KUKA-012).
 */
export function knowledgeText(featureId, featureVersion, code = active) {
  const lang = normalizeLanguage(code, { includeProbes: true });
  const own = ((PACKS[lang] || {}).KB || {})[featureId];
  const src = ((PACKS[lang] || {}).KB_SOURCE || {})[featureId];
  const text = (dictFor(lang).KB || {})[featureId] || null;
  let translation = 'missing';
  if (own && src && String(src.source_version) === String(featureVersion)) translation = 'checked';
  else if (own && src) translation = 'stale';
  else if (own) translation = 'stale';
  return { text, translation, source_version: src ? src.source_version : null, lang, own: Boolean(own) };
}

/**
 * A LEFEDETTSÉG MÉRÉSE EGY NYELVRE — ez a `verify:i18n` bemenete, és a lap is ezt hívja.
 *
 * NÉGY KÜLÖN LELET, nem egy szám: `missing` (a kulcs a nyelvben nincs, a lánc pótolja) ·
 * `orphan` (a nyelvben VAN olyan kulcs, ami az alapnyelvben nincs — elavult sor) ·
 * `param_mismatch` (a helyőrző-készlet eltér: a mondat adatot veszít) · `stale_kb` (a funkció-leírás
 * verziója előrement a fordításhoz képest). A nulla lelet ott is ALAPSOKASÁGOT visz (KUKA-093).
 */
export function coverageOf(code, features = []) {
  const lang = normalizeLanguage(code, { includeProbes: true });
  const base = PACKS[BASE_LANGUAGE];
  const pack = PACKS[lang] || {};
  const missing = []; const orphan = []; const paramMismatch = [];
  let population = 0;
  for (const g of TEXT_GROUPS) {
    const b = base[g] || {};
    const p = pack[g] || {};
    for (const k of Object.keys(b)) {
      population += 1;
      if (!Object.prototype.hasOwnProperty.call(p, k) || p[k] === undefined || p[k] === null || p[k] === '') {
        missing.push(`${g}.${k}`);
        continue;
      }
      const want = placeholdersOf(b[k]).join(',');
      const got = placeholdersOf(p[k]).join(',');
      if (want !== got) paramMismatch.push(`${g}.${k} (alap: ${want || '—'} · ${lang}: ${got || '—'})`);
    }
    for (const k of Object.keys(p)) if (!Object.prototype.hasOwnProperty.call(b, k)) orphan.push(`${g}.${k}`);
  }
  // A MÉLY csoportok: funkció-tudás, gyakori kérdések, bemutató-lépések.
  const deepMissing = [];
  for (const g of DEEP_GROUPS) {
    const b = base[g] || {};
    const p = pack[g] || {};
    for (const id of Object.keys(b)) {
      population += 1;
      if (!Object.prototype.hasOwnProperty.call(p, id)) { deepMissing.push(`${g}.${id}`); continue; }
      const bi = b[id]; const pi = p[id];
      if (!isPlainObject(bi) || !isPlainObject(pi)) continue;
      for (const f of Object.keys(bi)) {
        if (isPlainObject(bi[f])) {
          for (const sub of Object.keys(bi[f])) {
            if (!isPlainObject(pi[f]) || pi[f][sub] === undefined || pi[f][sub] === '') deepMissing.push(`${g}.${id}.${f}.${sub}`);
          }
        } else if (pi[f] === undefined || pi[f] === '') deepMissing.push(`${g}.${id}.${f}`);
      }
      for (const k of Object.keys(pi)) if (!Object.prototype.hasOwnProperty.call(bi, k)) orphan.push(`${g}.${id}.${k}`);
    }
    for (const id of Object.keys(p)) if (!Object.prototype.hasOwnProperty.call(b, id)) orphan.push(`${g}.${id}`);
  }
  const staleKb = [];
  for (const f of features) {
    const st = knowledgeText(f.id, f.version, lang);
    if (st.translation === 'stale') staleKb.push(`${f.id} (leírás: ${f.version} · fordítás: ${st.source_version ?? '—'})`);
  }
  const info = languageOf(lang) || {};
  return {
    lang,
    kind: info.kind || 'unknown',
    enabled: info.enabled === true,
    complete_declared: Boolean((pack.meta || {}).complete),
    chain: fallbackChainOf(lang),
    population,
    missing, orphan, param_mismatch: paramMismatch, deep_missing: deepMissing, stale_kb: staleKb,
    covered: population - missing.length - deepMissing.length,
  };
}

// A JEGYZÉK FELOLDÓJA TOVÁBBADVA: a lap a szótár belépőjén kéri a nyelv-egyeztetést is, nem a
// jegyzéket importálja külön — egy fogalom, egy bejárat (I18N-01 · KUKA-018).
export { resolveLanguage };

export const I18N_CONTRACT = Object.freeze({
  id: 'I18N-01',
  owns: 'melyik nyelvcsomag szolgál ki egy kulcsot, a kimondott visszaesési láncon',
  does_not_own: 'a nyelvek listája (LANG-01) · a szavak (a csomagok) · a funkciók gépi tényei (TUD-01)',
  stated_limit: 'a VISSZAESÉS NEM LEFEDETTSÉG: a magyarul megjelenő idegen nyelvű kulcs a mérésben hiány',
  four_findings: Object.freeze(['missing', 'orphan', 'param_mismatch', 'stale_kb']),
  plural_engine: 'Intl.PluralRules — nem kézi n===1 ág',
  never: 'a felület nyelve nem választ országot, adózási rendet, időzónát vagy pénznemet',
});
