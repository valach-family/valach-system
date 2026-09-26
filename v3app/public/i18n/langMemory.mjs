// v3app/public/i18n/langMemory.mjs — LNG-02: A SZEMÉLY NYELV-EMLÉKEZETE, EGY SZABÁLYBAN (F95-01).
//
// MIÉRT KÜLÖN MODUL, ÉS MIÉRT TISZTA. A nyelv-visszaállítás szabálya eddig az `app.js`-ben, HÁROM
// helyen élt, és mindhárom a `setLang` visszatérési értékén egy NEM LÉTEZŐ mezőt (`got.code`) olvasott
// — a függvény NYELVKÓD-SZTRINGET ad (I18N-01, `dict.mjs` 82). Két ág ezért SOHA nem futott le (a
// személyhez mentés), a harmadikat a tartalék-ága (`: wanted`) mentette meg, VÉLETLENÜL. A hibát a
// külső ellenőrző fél (chatgpt-v3) mérte meg az R95-ben: angol/német nyelv KIJELENTKEZÉS és ÚJBÓLI
// BELÉPÉS után magyarra váltott. Ez a KUKA-238 alakja a saját kódunkon: a tartalék-ággal rendelkező
// feloldó elrejti a hibás hívást — ezért a döntés innentől MÉRT KIMENETET ad (`source`), és a próba
// UGYANEZT a függvényt hívja, nem a képernyőt utánozza (KUKA-207).
//
// MIT BIRTOKOL. Azt a kérdést, hogy egy adott pillanatban MELYIK nyelv érvényes a MAI személyre, és
// hogy ezt EL KELL-E TENNI neki. Semmi mást: se DOM, se tároló, se hálózat — a `localStorage`-ot a
// hívó írja (a böngésző az övé), a KULCSOT viszont innen kéri (`langStoreKey`), hogy ne legyen két
// alakja ugyanannak a kulcsnak (KUKA-018).
//
// AMIT NEM BIRTOKOL: a nyelvek listája és a visszaesési lánc (LANG-01, `languages.mjs`), a szavak (a
// csomagok), és az, hogy a felirat mikor rajzolódik újra (az a lap dolga).
import { resolveLanguage, BASE_LANGUAGE } from './languages.mjs';

/** A SZEMÉLYHEZ KÖTÖTT TÁROLÁS KULCS-ELŐTAGJA — `vs3.lang.<alany>`, névtelenül `vs3.lang.anon`. */
export const LANG_STORE_PREFIX = 'vs3.lang.';

/**
 * AZ ÚTON TUDATOSAN VÁLASZTOTT NYELV SAJÁT KULCSA (F93-02). KIJELENTKEZÉSKOR ÜRÜL — ezért egy
 * kijelentkezés után belépő MÁSIK ember soha nem örökli. Üzleti adat nincs benne: egy nyelv-kód.
 */
export const LANG_CHOICE_KEY = 'vs3.lang.choice';

/** A tárolás kulcsa a MAI személyre. Belépve az alany azonosítója, névtelenül `anon`. */
export function langStoreKey(subjectId) {
  const sub = subjectId === null || subjectId === undefined || subjectId === '' ? null : String(subjectId);
  return `${LANG_STORE_PREFIX}${sub || 'anon'}`;
}

/**
 * A TUDATOS FORRÁSOK — amit a felhasználó MAGA állított be, szemben azzal, amit a böngészője kér.
 * Ez a lista a szerződés: a személyhez mentés ENNEK a halmaznak a következménye, nem külön ág
 * minden hívóban (KUKA-003: a több helyen igaz szabály EGY helyen él).
 */
export const CONSCIOUS_SOURCES = Object.freeze(['choice', 'url', 'carried']);

/**
 * A MAI NYELV ÉS A MENTÉSI DÖNTÉS — EGY SZABÁLY, MINDEN ÚTRA.
 *
 * A SORREND, kimondva: (1) amit a felhasználó MOST kért — a nyelvválasztóból (`choice`) vagy a lap
 * címéből (`url`, a megerősítő levél útja); (2) ENNEK A SZEMÉLYNEK a tárolt választása (`stored`);
 * (3) az ÚJ személy első belépésekor az úton tudatosan választott nyelv (`carried`); (4) a böngésző
 * nyelvi kérése (`accept_language`); (5) az alapnyelv (`default`).
 *
 * A HÁROM KIKÖTÉS, amit a külső fél az R93-ban és az R95-ben kért, és ami itt EGY helyen áll:
 *   · a MÁR TÁROLT személyes választás ERŐSEBB, mint az átvitt választás — nem írja felül semmi;
 *   · a TUDATOS választás a SZEMÉLYÉ lesz (`persist_for_person`) — ez volt az F95-01 hiányzó fele:
 *     e nélkül a kijelentkezés után nem volt mire visszaesni, és a lap a böngésző nyelvére állt;
 *   · a RÉGI ANONIM TÁROLÁSI MARADVÁNY NEM tudatos választás: csak `newPerson` esetén, és csak a
 *     kijelentkezéskor ÜRÜLŐ választás-kulcsról jöhet át (`carriedChoice`).
 *
 * A VISSZATÉRÉS MÉRT KIMENET, nem puszta kód: a `source` megmondja, HONNAN jött a döntés, a
 * `resolver_source` pedig azt, hogy a LANG-01 feloldó minek látta. Enélkül egy néma alapnyelvre esés
 * és egy valódi magyar választás ugyanúgy néz ki (KUKA-238).
 */
export function decideLang({
  asked = null,
  askedSource = null,
  storedForPerson = null,
  carriedChoice = null,
  acceptLanguage = '',
  newPerson = false,
  hasPerson = false,
} = {}) {
  const nonEmpty = (v) => (v === null || v === undefined ? null : (String(v).trim() || null));
  const explicit = nonEmpty(asked);
  const stored = explicit ? null : nonEmpty(storedForPerson);
  const carried = !explicit && !stored && newPerson ? nonEmpty(carriedChoice) : null;
  // A FELOLDÓT A SAJÁT MEZŐNEVEIN hívjuk (`explicit` · `stored` · `acceptLanguage`) — a kitalált
  // mezőnév itt NÉMÁN alapnyelvre esett vissza (KUKA-238).
  const resolved = resolveLanguage({ explicit: explicit || carried, stored, acceptLanguage });
  let source;
  if (explicit) source = askedSource === 'url' ? 'url' : 'choice';
  else if (stored) source = 'stored';
  else if (carried) source = 'carried';
  else source = resolved.source === 'accept_language' ? 'accept_language' : 'default';
  const conscious = CONSCIOUS_SOURCES.includes(source);
  return Object.freeze({
    code: resolved.code,
    source,
    resolver_source: resolved.source,
    matched: resolved.matched,
    /**
     * A TUDATOS VÁLASZTÁS EL IS TEVŐDIK. A VÁLASZTÓBÓL jött nyelv MINDIG (névtelenül a `vs3.lang.anon`
     * kulcsra — ettől él túl egy frissítést a névtelen látogató választása is); a CÍMBŐL és az ÁTVITT
     * választásból jött nyelv viszont CSAK ha van kihez kötni. Enélkül a lap címe NÉVTELEN maradványt
     * gyártana, amit a következő ember örökölne.
     */
    persist_for_person: source === 'choice' || (conscious && hasPerson),
    /**
     * A PATH-VÁLASZTÁS KULCSÁT CSAK VALÓDI ÁTÁLLÍTÁS ÍRJA (F95-01 másodlagos lelete).
     *
     * MÉRVE (saját böngésző-próba, R97): amikor a `got.code` elírás javításával a lap CÍMÉBŐL jött
     * nyelv ága FELÉLEDT, egy MÁSIK, korábban elfogadott szabály sérült meg: a névtelen tárolási
     * MARADVÁNY (`vs3.lang.anon`) a megerősítő levél `?lang=` hivatkozásán TUDATOS választássá
     * mosódott, és így a KÖVETKEZŐ ember örökölte az előzőét (az R93-04 utolsó állítása). A külső fél
     * kikötése erre kimondott: „a régi anonim tárolási maradvány NEM ilyen választás: csak az számít,
     * amit a felhasználó ténylegesen átállított MOST." Ezért a hordozó kulcsot KIZÁRÓLAG a választó
     * írja; a cím ága a nyelvet MEGJELENÍTI és a személyhez elteszi, de hordozót nem gyárt — a
     * kijelentkezésnél ürülő kulcs így csak valódi átállítást visz át (KUKA-245).
     */
    persist_choice: source === 'choice',
    base_language: BASE_LANGUAGE,
  });
}

export const LANG_MEMORY_CONTRACT = Object.freeze({
  id: 'LNG-02',
  owns: 'melyik nyelv érvényes a MAI személyre, és hogy azt el kell-e tenni neki',
  does_not_own: 'a nyelvek listája és a visszaesési lánc (LANG-01) · a tároló írása (a lap) · a szavak',
  order: Object.freeze(['choice|url', 'stored', 'carried', 'accept_language', 'default']),
  measured_output: 'source + resolver_source: a NÉMA alapnyelvre esés nem téveszthető össze a választással',
  persists_for_person: CONSCIOUS_SOURCES,
  never: 'a setLang visszatérése SZTRING (I18N-01) — mező-olvasás rajta tilos, a döntés ebből a modulból jön',
  stated_limit: 'a nyelv a NÉZŐ kényelme: a böngészőben marad meg, a fiók adatai közé nem kerül',
});
