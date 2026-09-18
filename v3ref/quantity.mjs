import { lookupClosed, closedNames } from './closedRegistry.mjs';

/** MCS-2 / MNY-01 — A MENNYISÉG SZERZŐDÉSE, VERZIÓZOTT SZÁMÍTÁSI PROFILLAL.
 *
 * MIÉRT VERZIÓZOTT, ÉS MIÉRT NEM CORE-KORLÁT (a külső fél R8 §2 kimondott feltétele).
 * A három tizedesjegy, a pozitív bevét és a felső határ az ELSŐ D-folyamat profilja, nem a rendszer
 * természete: a következő előfizető lehet gyógyszeripari (hat tizedes) vagy fémipari (darab, nulla
 * tizedes). Ha ezt a magba betonozzuk, a rendszer hatókörét a MAI bérlőből vezettük le (KUKA-060).
 *
 * ÉS AMIT A VERZIÓZÁS TÉNYLEGESEN VÉD: *„A korábbi tárolt mennyiségek értelmezése nem változhat egy
 * későbbi skálamódosítástól."* Egy tárolt `1500` skálázott egész ÖNMAGÁBAN nem szám, hanem szám ÉS
 * skála — ha holnap a profil hat tizedesre vált, ugyanaz a `1500` 1,5-ből 0,0015 lesse, ÍRÁS NÉLKÜL,
 * NÉMÁN (KUKA-021: az egység nem címke, hanem a szám JELENTÉSE). Ezért minden tárolt mennyiség VISZI
 * a profilja azonosítóját, és az olvasó AZZAL olvassa vissza, nem a mai profillal.
 *
 * A HIBAKÓD-SORREND A SZERZŐDÉS RÉSZE (R8 §2). Egyetlen mindent eldöntő reguláris kifejezés elnyelné
 * a külön megígért pontosság- és tartomány-hibát: a beadó `invalid_format`-ot kapna arra, amiről azt
 * mondtuk, hogy `precision`. A sorrend ezért KIMONDOTT és MÉRT:
 *
 *     típus/alapszintaxis  →  tizedesjegyszám  →  tartomány  →  pozitivitás
 *
 * Példák, ahogy ők megadták:  `"1.0000"` → precision · `"1000000.001"` és `"10000000"` →
 * out_of_range · `"0.000"` → must_be_positive.
 *
 * A TÍPUS MAGA A VÉDETT TÉNY (KUKA-125). A bemenet SZÖVEG, és az is marad, amíg az alapszintaxis le
 * nem futott: `Number(x)` a `true`-t, a `[1]`-et és a `"1"`-et egyaránt 1-re alakítja, tehát a
 * konverzió magát a megkülönböztetést törli el. Ezért ebben a modulban a `Number()` a SZINTAXIS UTÁN
 * jön, és akkor is csak a SZÁMJEGYEKEN.
 */

// ── A PROFILOK ──────────────────────────────────────────────────────────────────────────────────
//
// Egy profil = a mennyiség JELENTÉSE egy adott korszakban. A `decimals` a tárolási skála kitevője:
// a tárolt egész a valódi érték × 10^decimals. A `maxUnits` a legnagyobb megengedett EGÉSZ rész.
export const QUANTITY_PROFILES = Object.freeze({
  'qty-1': Object.freeze({
    id: 'qty-1',
    decimals: 3,
    // ── KÉT KÜLÖN KORLÁT, KÉT KÜLÖN KÉRDÉS (R10-F03, a külső fél lelete) ──────────────────────
    //
    // Az első alakomban EGYETLEN `maxUnits` állt, és ugyanaz az 1 000 000 kapuzta az EGY MOZGÁS
    // méretét ÉS az ÖSSZEGZETT egyenleget. A megállapodott D-profil viszont a kettőt külön kezelte:
    // az egy bevétre eső korlát ÜZLETI szabály („ekkora tétel nem érkezhet egyszerre"), az összeg
    // korlátja pedig SZÁMÍTÁSI biztonság (a skálázott egész maradjon kezelhető tartományban).
    // Egy értékre húzva a kettőt HALLGATÓLAGOS TERMÉKKORLÁTOT vezettem volna be: „egy könyvben egy
    // cikkből soha nem állhat 1 000 000-nál több" — ezt senki nem mondta ki (KUKA-002: két
    // független tény nem ülhet egy oszlopon).
    maxPerMovement: 1_000_000,          // EGY mozgás legnagyobb megengedett értéke
    maxTotal: 1_000_000_000,            // az ÖSSZEGZETT egyenleg biztonságos tartománya
    why: 'az ELSŐ D-folyamat profilja: élelmiszer-készlet literben/kilogrammban, három tizedes '
      + '(ml/g pontosság). NEM a rendszer korlátja — új profil új azonosítóval születik, a régi '
      + 'tárolt mennyiségek pedig a SAJÁT profiljukkal olvasódnak vissza.',
  }),

  // ── A MÁSODIK PROFIL: DARABOS KÉSZLET (a SAJÁT leletem az R10-F03 mérése közben) ──────────────
  //
  // MIÉRT SZÜLETETT MEG MOST. Amíg a regiszterben EGYETLEN profil állt, a „profil" fogalma
  // MÉRHETETLEN volt: a tizedesjegy-szám, a két plafon és a `profile_mismatch` ág mind egyetlen
  // értékkel futott, tehát egyetlen próba sem tudta megmutatni, hogy a rendszer TÉNYLEG a CIKK
  // profilját használja, és nem egy beégetett alapértelmezést. Az egyelemű lista nem méri a
  // szabályt (KUKA-051) — és a hiányzó mérés zöldnek látszik.
  //
  // MIÉRT PONT EZ. A darabos készlet VALÓDI fajta, nem próba-kellék: egész darab (0 tizedes), és a
  // tétel- meg összeg-mérete nagyságrendekkel kisebb, mint a folyadékoké. Ez egyben azt is
  // megmutatja, hogy a KÉT plafon két külön kérdés (R10-F03): itt az arányuk is más.
  'qty-2': Object.freeze({
    id: 'qty-2',
    decimals: 0,
    maxPerMovement: 1_000,
    maxTotal: 10_000,
    why: 'darabos készlet: EGÉSZ darab, kis tételméret. A profil a CIKK tulajdonsága, nem a hívóé és '
      + 'nem a rendszeré — két profil azonos számjegyei NEM ugyanaz a mennyiség, ezért összeadni sem '
      + 'lehet őket (`profile_mismatch`).',
  }),
});
export const DEFAULT_PROFILE_ID = 'qty-1';

/** A profil feloldása. Ismeretlen profil FAIL-CLOSED, és megnevezi a választhatókat (KUKA-064). */
export function quantityProfile(profileId = DEFAULT_PROFILE_ID) {
  // A ZÁRT REGISZTER KÖZÖS FELOLDÓJA (CLR-01, R37). A régi `QUANTITY_PROFILES[profileId]` alak az
  // ÖRÖKÖLT neveket is megtalálta: `toString` névre nem a nevezett „ismeretlen mennyiség-profil"
  // jött, hanem egy nyers `Cannot convert undefined to a BigInt` — a TESTVÉR-ÁGA annak, amit a
  // külső fél a bemeneti sémán talált (KUKA-039 · KUKA-180).
  const p = lookupClosed(QUANTITY_PROFILES, profileId, { shape: (v) => typeof v === 'object' && v.id });
  if (!p) {
    throw new Error(`ismeretlen mennyiség-profil: ${JSON.stringify(profileId)} — `
      + `választható: ${closedNames(QUANTITY_PROFILES).join(' · ')}`);
  }
  return p;
}

// ── A HIBAKÓDOK — ZÁRT KÉSZLET, KIMONDOTT SORRENDBEN ────────────────────────────────────────────
export const QUANTITY_ERRORS = Object.freeze([
  'not_a_string',      // 1. TÍPUS — a bemenet nem szöveg (szám, logikai, tömb, null, objektum)
  'invalid_format',    // 1. ALAPSZINTAXIS — nem opcionális előjel + számjegyek + opcionális tizedes
  'precision',         // 2. TIZEDESJEGYSZÁM — több tizedes, mint amit a profil megenged
  'out_of_range',      // 3. TARTOMÁNY — EGY MOZGÁS korlátja fölött
  'total_out_of_range', // (nem a parse ága) — az ÖSSZEGZETT egyenleg korlátja fölött
  'must_be_positive',  // 4. POZITIVITÁS — nulla vagy negatív ott, ahol pozitív kell
]);

const fail = (error, detail) => Object.freeze({ ok: false, error, detail: detail ?? null });

// A SZIGORÚ ALAK. Szándékosan NEM enged: exponenciális jelölést (`1e3`), szóközt, ezres elválasztót,
// vezető `+`-t, üres tizedes részt (`1.`), csupasz tizedespontot. Mindegyik olyan alak, aminek a
// JELENTÉSE országonként más — a laza elfogadás itt néma félreértelmezés (KUKA-022).
const SYNTAX = /^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/;

/**
 * BEMENET → MENNYISÉG. A visszatérés vagy `{ok:true, …}`, vagy `{ok:false, error, detail}` — NEM dob:
 * a határon a nevezett elutasítás a válasz, a kivétel a programhibáé (KUKA-020).
 *
 * @param {unknown} input           a NYERS bemenet (szöveg kell, de bármit kaphatunk)
 * @param {object}  opts
 * @param {string}  opts.profileId  melyik profil szerint olvassuk
 * @param {boolean} opts.positive   kötelező-e a szigorúan pozitív érték (bevét: igen)
 */
/**
 * A PROFIL-FÜGGETLEN ELŐSZŰRŐ (a SAJÁT leletem az R10 mérése közben).
 *
 * MIÉRT KELL. A mennyiség szerződésének EGY része nem függ a profiltól (szöveg-e · decimális
 * alakú-e), a többi IGEN (tizedesjegyek · plafonok · kanonikus írásmód). A bemeneti séma a HATÁRON
 * áll, ahol a CIKK — és vele a profil — még nem ismert. Amíg ezt nem választottuk szét, a séma az
 * ALAPÉRTELMEZETT profillal kanonizált, és a darabos cikk `"1000"` értékéből `"1000.000"` lett:
 * a főkönyv ezt a SAJÁT profiljával újraolvasva `precision` hibára futott. A határ tehát NÉMÁN
 * átírta az értéket egy olyan szabály szerint, ami arra a cikkre nem volt igaz (KUKA-029: ahol egy
 * értéknek tárolt és gyógyított alakja is él, a gyógyítást AZ VÉGEZZE, aki ismeri a szabályt).
 *
 * @returns {null | {error:string, detail:string}} — null, ha az alak rendben van
 */
export function quantitySyntaxProblem(input) {
  if (typeof input !== 'string') return { error: 'not_a_string', detail: `a mennyiség szöveg, kapott: ${typeof input}` };
  if (!SYNTAX.test(input)) return { error: 'invalid_format', detail: 'alak: [-]egész[.tizedesek], kitevő és elválasztó nélkül' };
  return null;
}

export function parseQuantity(input, { profileId = DEFAULT_PROFILE_ID, positive = false } = {}) {
  const profile = quantityProfile(profileId);

  // 1/a. TÍPUS — a szöveg-voltot a KONVERZIÓ ELŐTT kérdezzük meg (KUKA-125).
  if (typeof input !== 'string') return fail('not_a_string', `a mennyiség szöveg, kapott: ${typeof input}`);
  // 1/b. ALAPSZINTAXIS.
  if (!SYNTAX.test(input)) return fail('invalid_format', 'alak: [-]egész[.tizedesek], kitevő és elválasztó nélkül');

  const neg = input.startsWith('-');
  const body = neg ? input.slice(1) : input;
  const [intPart, fracPart = ''] = body.split('.');

  // 2. TIZEDESJEGYSZÁM — ELŐBB, mint a tartomány: különben a hosszú tizedes rész `out_of_range`-nek
  //    látszana, és a beadó MÁS hibát javítana, mint ami van (KUKA-064).
  if (fracPart.length > profile.decimals) {
    return fail('precision', `legfeljebb ${profile.decimals} tizedesjegy, kapott ${fracPart.length}`);
  }

  // A SKÁLÁZOTT EGÉSZ — BigInt-tel, mert a lebegőpontos szorzás itt NÉMÁN hibázik
  // (0.1 + 0.2 ≠ 0.3), és a készlet-főkönyvben a néma kerekítés pénz.
  const scaled = BigInt(intPart + fracPart.padEnd(profile.decimals, '0')) * (neg ? -1n : 1n);

  // 3. TARTOMÁNY — EGY MOZGÁS korlátja (R10-F03: ez NEM az összeg korlátja).
  const cap = BigInt(profile.maxPerMovement) * 10n ** BigInt(profile.decimals);
  if (scaled > cap || scaled < -cap) {
    return fail('out_of_range', `egy mozgás legfeljebb ${profile.maxPerMovement} lehet `
      + `(profil: ${profile.id}) — az ÖSSZEG korlátja ettől külön áll`);
  }

  // 4. POZITIVITÁS — UTOLSÓ. A `"0.000"` alakilag ép, a pontossága ép, a tartománya ép; ami baj
  //    vele, az KIZÁRÓLAG az, hogy nem pozitív — és pontosan ezt kell mondani.
  if (positive && scaled <= 0n) return fail('must_be_positive', 'bevétnél a mennyiség szigorúan pozitív');

  return Object.freeze({
    ok: true,
    scaled,                       // BigInt — a TÁROLT alak
    profileId: profile.id,        // a JELENTÉSE — enélkül a `scaled` nem szám, csak számjegy-sor
    text: formatQuantity(scaled, profile.id),
  });
}

/**
 * KANONIKUS SZÖVEG — az API-kimenet is DECIMÁLIS SZÖVEG (R8 §2), soha nem lebegőpontos szám:
 * a JSON-szám a 0,1-et sem tudja pontosan, tehát a kiadott érték már nem az, amit könyveltünk.
 * `"1"`, `"1.0"` és `"1.000"` ugyanazt a szöveget adja vissza — ez a normalizálás ÉRTELME.
 */
export function formatQuantity(scaled, profileId = DEFAULT_PROFILE_ID) {
  const profile = quantityProfile(profileId);
  const n = typeof scaled === 'bigint' ? scaled : BigInt(scaled);
  const neg = n < 0n;
  const abs = (neg ? -n : n).toString().padStart(profile.decimals + 1, '0');
  const cut = abs.length - profile.decimals;
  const frac = profile.decimals ? `.${abs.slice(cut)}` : '';
  return `${neg ? '-' : ''}${abs.slice(0, cut)}${frac}`;
}

/**
 * A PARANCSAZONOSSÁGHOZ HASZNÁLT ALAK (R8 §2 kimondott követelménye).
 *
 * *„A `"1"`, `"1.0"`, `"1.000"` ugyanazt a normalizált mennyiséget jelentse a PARANCSAZONOSSÁGNÁL
 * is."* Ez nem kényelmi kérdés: az ismétlés-védelem azonosság-hasht számol a deklarált tartalomból,
 * tehát ha a `"1.0"` és az `"1.000"` két KÜLÖNBÖZŐ hasht ad, akkor egy hálózati újrapróbálkozás —
 * amit egy kliens más alakban formáz — KÉTSZER könyvelne. A normalizálás ezért a kanonizálás ELŐTT
 * fut, és a profil azonosítója IS benne van: két profil azonos számjegyei nem ugyanaz a mennyiség.
 *
 * A HIBÁS BEMENETET NEM NYELI EL: `null`-t ad vissza, és a hívó NEVEZETT elutasítást ad (KUKA-020).
 */
export function canonicalQuantity(input, { profileId = DEFAULT_PROFILE_ID, positive = false } = {}) {
  const q = parseQuantity(input, { profileId, positive });
  if (!q.ok) return null;
  return `${q.profileId}:${q.text}`;
}

/**
 * EGZAKT SKÁLÁZOTT ÖSSZEADÁS, TÚLCSORDULÁS-ELLENŐRZÉSSEL.
 * Csak AZONOS profilú mennyiségek adhatók össze — a profil-keverés ugyanaz a hiba, mint a
 * mértékegység-keverés (KUKA-021): a szám ugyanaz, a JELENTÉSE nem.
 */
export function addQuantities(parts, { profileId = DEFAULT_PROFILE_ID } = {}) {
  const profile = quantityProfile(profileId);
  let sum = 0n;
  for (const p of parts) {
    if (p.profileId !== profile.id) {
      return fail('profile_mismatch', `${p.profileId} ≠ ${profile.id} — eltérő profilú mennyiség nem adható össze`);
    }
    sum += p.scaled;
  }
  // AZ ÖSSZEG SAJÁT KORLÁTJA (R10-F03) — számítási biztonság, nem üzleti tételméret.
  const cap = BigInt(profile.maxTotal) * 10n ** BigInt(profile.decimals);
  if (sum > cap || sum < -cap) {
    return fail('total_out_of_range', `az ÖSSZEG a profil (${profile.id}) összeg-korlátja fölé megy: `
      + `${profile.maxTotal} — ez a SZÁMÍTÁSI tartomány, nem az egy mozgásra eső ${profile.maxPerMovement}`);
  }
  return Object.freeze({ ok: true, scaled: sum, profileId: profile.id, text: formatQuantity(sum, profile.id) });
}

export const MNY_CONTRACT = Object.freeze({
  id: 'MNY-01',
  profiles: Object.freeze(Object.keys(QUANTITY_PROFILES)),
  default_profile: DEFAULT_PROFILE_ID,
  error_order: QUANTITY_ERRORS,
  purpose: 'a mennyiség JELENTÉSE — verziózott profil, kimondott hibakód-sorrend, decimális '
    + 'szöveg ki és be, egzakt skálázott számítás',
});
