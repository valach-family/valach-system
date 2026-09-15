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
    maxUnits: 1_000_000,       // a legnagyobb megengedett érték: 1 000 000,000
    why: 'az ELSŐ D-folyamat profilja: élelmiszer-készlet literben/kilogrammban, három tizedes '
      + '(ml/g pontosság). NEM a rendszer korlátja — új profil új azonosítóval születik, a régi '
      + 'tárolt mennyiségek pedig a SAJÁT profiljukkal olvasódnak vissza.',
  }),
});
export const DEFAULT_PROFILE_ID = 'qty-1';

/** A profil feloldása. Ismeretlen profil FAIL-CLOSED, és megnevezi a választhatókat (KUKA-064). */
export function quantityProfile(profileId = DEFAULT_PROFILE_ID) {
  const p = QUANTITY_PROFILES[profileId];
  if (!p) {
    throw new Error(`ismeretlen mennyiség-profil: ${JSON.stringify(profileId)} — `
      + `választható: ${Object.keys(QUANTITY_PROFILES).join(' · ')}`);
  }
  return p;
}

// ── A HIBAKÓDOK — ZÁRT KÉSZLET, KIMONDOTT SORRENDBEN ────────────────────────────────────────────
export const QUANTITY_ERRORS = Object.freeze([
  'not_a_string',      // 1. TÍPUS — a bemenet nem szöveg (szám, logikai, tömb, null, objektum)
  'invalid_format',    // 1. ALAPSZINTAXIS — nem opcionális előjel + számjegyek + opcionális tizedes
  'precision',         // 2. TIZEDESJEGYSZÁM — több tizedes, mint amit a profil megenged
  'out_of_range',      // 3. TARTOMÁNY — a profil felső határa fölött
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

  // 3. TARTOMÁNY.
  const cap = BigInt(profile.maxUnits) * 10n ** BigInt(profile.decimals);
  if (scaled > cap || scaled < -cap) {
    return fail('out_of_range', `a profil (${profile.id}) felső határa ${profile.maxUnits}`);
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
  const cap = BigInt(profile.maxUnits) * 10n ** BigInt(profile.decimals);
  if (sum > cap || sum < -cap) {
    return fail('out_of_range', `az ÖSSZEG a profil (${profile.id}) felső határa fölé megy: ${profile.maxUnits}`);
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
