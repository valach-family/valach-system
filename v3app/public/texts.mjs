// v3app/public/texts.mjs — A FELÜLET EGYETLEN SZÖVEG-BEJÁRATA (SZO-01, R81 §6 · R89 §5).
//
// MI VÁLTOZOTT AZ R89-BEN, ÉS MIÉRT. Eddig ebben a fájlban ÁLLTAK a magyar mondatok. Ez két dolgot
// jelentett: (1) a felület egy nyelvű volt, és (2) — ahogy a külső ellenőrző fél az R83-ban mérte
// (KUKA-214) — a szótár RÉSZLEGES maradt, mert a gombok, táblafejlécek és bevezető mondatok az
// `app.js` szövegliterájaiban éltek. Az R89 mindkettőt zárja:
//
//   · A SZAVAK A NYELVCSOMAGOKBA KERÜLTEK (`i18n/hu.mjs` · `en.mjs` · `de.mjs` + próbák). A magyar a
//     lánc VÉGE, tehát teljes; a többit a feloldó (`i18n/dict.mjs`) fűzi rá a KIMONDOTT visszaesési
//     lánccal (LANG-01).
//   · EZ A FÁJL MARADT A BEJÁRAT, és az alakja NEM változott: a lap ugyanazt a `PAGE[…]`,
//     `STATE.…`, `reasonText(…)`, `tpl(…)` felületet használja. A csoportok viszont ÉLŐ NÉZETEK: a
//     kulcsaik olvasói az ÉPPEN AKTÍV nyelvet kérdezik meg, ezért a nyelvváltás után ugyanaz a
//     `render()` már a másik nyelven rajzol — egyetlen hívási helyet sem kellett átírni (KUKA-003:
//     a több helyen igaz szabály EGY helyen él).
//
// A KULCS-KÉSZLETET A MAGYAR CSOMAG ADJA. A nézetek kulcsait NEM kézzel soroljuk fel: a `hu` pack
// kulcsaiból épülnek, tehát egy új kulcs INGYEN megjelenik itt is, és nem lehet elfelejteni
// (KUKA-039 · KUKA-159: a bekötés listája az ÚJ szabály hatóköréből jön).
//
// AMI NEM ITT VAN: a szerver válaszainak TARTALMA (azt a mag mondja meg), a jogosultság, és a
// funkciók gépi tényei (`v3app/knowledge/features.mjs`). Ez a fájl csak FORDÍT.
import * as hu from './i18n/hu.mjs';
import {
  dict, dictFor, setLang as setLangInner, currentLang, currentDir, currentLocale, currentEndonym,
  enabledLanguages, allLanguages, languageOf, lookup, placeholdersOf, tpl as tplInner,
  reasonText as reasonInner, plural as pluralInner, fmtNumber as fmtNumberInner, fmtDate,
  coverageOf, knowledgeText, TEXT_GROUPS, DEEP_GROUPS, PACKS, I18N_CONTRACT,
} from './i18n/dict.mjs';

/**
 * ÉLŐ NÉZET EGY SZÖVEG-CSOPORTRA. A kulcsok a magyar (teljes) csomagból jönnek, az ÉRTÉK viszont az
 * aktív nyelvből — getter-rel, tehát a nyelvváltás után ugyanaz a hivatkozás mást ad vissza.
 * A nézet FAGYOTT: új kulcsot a képernyő nem tehet bele (a szó a nyelvcsomagba kerül, nem a lapba).
 */
function liveGroup(group) {
  const view = {};
  for (const key of Object.keys(hu[group] || {})) {
    Object.defineProperty(view, key, {
      enumerable: true,
      get() {
        const box = dict()[group] || {};
        return Object.prototype.hasOwnProperty.call(box, key) ? box[key] : (hu[group] || {})[key];
      },
    });
  }
  return view;
}

/** A menü- és oldalcímek. */
export const PAGE = Object.freeze(liveGroup('PAGE'));
/** A menü csoport-nevei. */
export const NAV = Object.freeze(liveGroup('NAV'));
export const ROLE = Object.freeze(liveGroup('ROLE'));
export const SCOPE = Object.freeze(liveGroup('SCOPE'));
export const SCOPE_ACC = Object.freeze(liveGroup('SCOPE_ACC'));
export const PLAN = Object.freeze(liveGroup('PLAN'));
/** A mennyiség jellege — a kód (`mert`/`becsult`/`ismeretlen`) a TÉNY, ez csak a felirata. */
export const QUALITY = Object.freeze(liveGroup('QUALITY'));
/** A szerver okainak emberi megfelelője EGY helyen él. */
export const REASON = Object.freeze(liveGroup('REASON'));
/** A nézet-kötés nemleges mondatai (KTX-03) — a `contextBinding.mjs` innen kéri. */
export const UNBOUND = Object.freeze(liveGroup('UNBOUND'));
/** Állandó állapot-szövegek. */
export const STATE = Object.freeze(liveGroup('STATE'));
/** A képernyők feliratai — ide került minden, ami az R83-ig az `app.js`-be volt égetve (KUKA-214). */
export const UI = Object.freeze(liveGroup('UI'));
/** A segítségpanel kerete (SEG-01). */
export const HELP = Object.freeze(liveGroup('HELP'));
/** A kattintható bemutató kerete (TUR-01). */
export const TOURUI = Object.freeze(liveGroup('TOURUI'));
/** A chates segéd felirata (AST-01). */
export const CHAT = Object.freeze(liveGroup('CHAT'));
/** A paraméteres mondatok a KÖZÖS forrásban élnek. */
export const TPL = Object.freeze(liveGroup('TPL'));

/**
 * A MENÜ SZERKEZETE — oldal-AZONOSÍTÓK, nem szavak. A csoport NEVE a `NAV` élő nézetéből jön, tehát
 * a szerkezet nyelv-független, a felirat nyelv-követő (KUKA-018: egy fogalom, egy ábrázolás).
 */
const navGroup = (nameKey, pages) => Object.freeze({
  get group() { return nameKey === null ? null : NAV[nameKey]; },
  pages: Object.freeze(pages),
});

export const NAV_GROUPS = Object.freeze([
  navGroup(null, ['overview']),
  navGroup('operations', ['processes', 'documents', 'outbox']),
  navGroup('reports', ['stock', 'movements', 'stockcard']),
  navGroup('masterdata', ['products', 'partners', 'warehouses']),
]);
export const NAV_ADMIN = navGroup('settings', ['account', 'members', 'plan']);
export const NAV_PERSONAL = Object.freeze([
  navGroup(null, ['overview']),
  navGroup('ownMatters', ['personal']),
  navGroup('ownData', ['profile', 'security']),
]);

/** A fiók neve a felületen: a személyes kör NEVEZETT szót kap, a cégnév ADAT (nem fordítjuk). */
export function accountLabel(ws) {
  if (!ws) return '';
  return ws.personal === true ? STATE.personalAccount : (ws.name || '');
}

/** A sablon behelyettesítése — EGY helyen, az aktív nyelven. */
export function tpl(key, vals) { return tplInner(key, vals); }

/** Egy gépi ok emberi mondata; ismeretlen oknál nevezett, de érthető tartalék. */
export function reasonText(reason, fallback) { return reasonInner(reason, fallback); }

/** Dátum a FELHASZNÁLÓ időzónájában és területi alakján, ISO helyett (R81 §6). */
export function whenText(iso) { return fmtDate(iso); }

/** Szám a területi alakon. A pénznemet NEM a nyelv adja (LANG-01). */
export function fmtNumber(n, opts) { return fmtNumberInner(n, currentLang(), opts); }

/** Többes szám `Intl.PluralRules`-szal — nem kézi `n === 1` ág. */
export function plural(n, forms) { return pluralInner(n, forms); }

/**
 * A NYELV BEÁLLÍTÁSA. A hívó a TÉNYLEGESEN beállított kódot kapja vissza — ismeretlen kérésnél az
 * alapnyelvet, és ezt a lap KI IS ÍRJA (nem néma elnyelés: KUKA-012).
 */
export function setLang(code, opts) { return setLangInner(code, opts); }

export {
  currentLang, currentDir, currentLocale, currentEndonym,
  enabledLanguages, allLanguages, languageOf,
  lookup, placeholdersOf, coverageOf, knowledgeText, dict, dictFor,
  TEXT_GROUPS, DEEP_GROUPS, PACKS, I18N_CONTRACT,
};

export const SZO_CONTRACT = Object.freeze({
  id: 'SZO-01',
  owns: 'a felület EGYETLEN szöveg-bejárata: minden felirat innen jön, sablonba égetni tilos',
  since_r89: 'a szavak a nyelvcsomagokban állnak; ez a fájl ÉLŐ NÉZET az aktív nyelvre',
  key_source: 'a kulcs-készletet a magyar (teljes) csomag adja — kézi felsorolás nincs',
  stated_limit: 'a nyelvváltás a FELIRATOT váltja; országot, adózási rendet, időzónát és pénznemet SOHA',
});
