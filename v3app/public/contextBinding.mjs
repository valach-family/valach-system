// v3app/public/contextBinding.js — A NÉZET-KÖTÉS EGYETLEN SZABÁLYA (KTX-03, R79/F79-01).
//
// MI VOLT A RÉS. Az R77-ben kimondtam, hogy „a hiányzó mező NEM egyezés" — a kód viszont csak AKKOR
// hasonlított, ha a mező megvolt: két hiányzó `served_*` mezővel a `servedMatches` IGAZAT adott. A
// külső ellenőrző fél (chatgpt-v3, R79/F79-01) ezt HIBABEVITELLEL mutatta meg: a valódi, sikeres
// készlet-válaszból a szállítási rétegben eltávolította mindkét `served_*` mezőt, és a változatlan
// kliens kirajzolta a „KIADVA" képet. Az állítás tehát a MEGJEGYZÉSBEN élt, nem a kódban
// (KUKA-038: a szerződés kimondott állítása nem bizonyíték arra, hogy a kód teljesíti is).
//
// A MAI SZABÁLY — és EGY helyen, mert a szabály szétmásolása ugyanaz a hiba (KUKA-039):
//   · egy KONTEXTUSFÜGGŐ válasz csak akkor rajzolható ki, ha MINDKÉT saját mezője MEGVAN
//     (`served_book_id` · `served_subject_id`), a típusuk érvényes, és PONTOSAN egyezik azzal a
//     nézettel, amiben a kérés INDULT;
//   · a hiányzó mező (`undefined`) NEM egyezés, hanem „nem tudom" — és a „nem tudom" nem adat
//     (KUKA-094: a hiányzó tanú nem zöld);
//   · a NEVEZETT nemleges válasz (nincs belépve · kontextus-eltérés · séma-hiba) nem adat, de
//     KIMONDHATÓ mondat: a hívó a `why` szóból tud érthető folytatást adni, nem néma képernyőt
//     (KUKA-201) — és nem indít magától újabb kérést, tehát nincs frissítési körforgás.
//
// AMI EZ NEM: jogosultság. A kötés csak SZŰKÍT: a kiszolgált kontextust a szerver mondja meg, a
// jogot pedig változatlanul a mag kapui döntik el (KUKA-047).

/** A kontextusfüggő válasz KÖTELEZŐ saját mezői. A lista a szerződés, nem a hívó emlékezete. */
export const CONTEXT_RESPONSE_FIELDS = Object.freeze(['served_book_id', 'served_subject_id']);

/** A NEVEZETT nemleges okok, amikre a válasz jogosan NEM hordoz kiszolgált kontextust. */
export const UNBOUND_REASONS = Object.freeze(['login_required', 'context_mismatch', 'invalid_response']);

/** Érvényes mező-alak: SZÖVEG, vagy `null` (kimondott hiány: nincs kiválasztott kör / nincs alany). */
function validField(v) {
  return typeof v === 'string' || v === null;
}

/**
 * KÖTÖTT-E A VÁLASZ AHHOZ A NÉZETHEZ, AMIBEN A KÉRÉS INDULT?
 *
 * @param {object|null} r         a szerver válasza (a HTTP-státusszal kiegészítve)
 * @param {{book: string|null, subject: string|null}} expected  a nézet, amiben a kérés indult
 * @returns {{bound: boolean, why: string|null}} — `why` csak akkor van, ha NEM kötött
 */
export function contextBindingVerdict(r, expected) {
  if (!r || typeof r !== 'object') return { bound: false, why: 'invalid_response' };
  if (typeof r.reason === 'string' && UNBOUND_REASONS.includes(r.reason)) return { bound: false, why: r.reason };
  if (r.status === 401) return { bound: false, why: 'login_required' };
  for (const field of CONTEXT_RESPONSE_FIELDS) {
    if (!(field in r) || r[field] === undefined) return { bound: false, why: 'missing_context_field' };
    if (!validField(r[field])) return { bound: false, why: 'invalid_context_field' };
  }
  if (r.served_book_id !== (expected ? expected.book ?? null : null)) return { bound: false, why: 'other_book' };
  if (r.served_subject_id !== (expected ? expected.subject ?? null : null)) return { bound: false, why: 'other_subject' };
  return { bound: true, why: null };
}

/** A hívó oldali rövid alak — a döntés UGYANAZ, csak a szó rövidebb. */
export function servedMatches(r, expected) {
  return contextBindingVerdict(r, expected).bound === true;
}

/**
 * A NEM-KÖTÖTT VÁLASZ OKA → SZÓTÁR-KULCS. A szabály (melyik ok melyik mondatot kapja) ITT él, a
 * MONDAT viszont a nyelvcsomagokban (`i18n/<nyelv>.mjs` → `UNBOUND`) — R89 §5.
 *
 * MIÉRT VÁLT KETTŐ: eddig a négy mondat ebben a fájlban állt, tehát HARMADIK szöveg-otthon volt a
 * `texts.mjs` és a `demoData.mjs` mellett, és lefordíthatatlan (SZO-01 · KUKA-214). A DÖNTÉS
 * viszont a kötés szabálya, nem szöveg — ezért maradt itt, kulcsra fordítva.
 */
export const UNBOUND_KEY = Object.freeze({
  login_required: 'login_required',
  context_mismatch: 'context_mismatch',
  other_book: 'other_context',
  other_subject: 'other_context',
  missing_context_field: 'unsafe',
  invalid_context_field: 'unsafe',
});

/** A kulcs egy okhoz; ismeretlen oknál a NEVEZETT „nem biztonságos" ág (nem néma üres szöveg). */
export function unboundKey(why) {
  return Object.prototype.hasOwnProperty.call(UNBOUND_KEY, why) ? UNBOUND_KEY[why] : 'unsafe';
}

/**
 * EMBERI MONDAT a nem-kötött válaszra: a képernyő sosem marad néma (KUKA-012 · KUKA-201).
 *
 * A `texts` paraméter a SZÓTÁR `UNBOUND` csoportja. A hívó adja át, hogy ez a modul TISZTA
 * maradjon (se import-kör, se rejtett globális) — a lap és a próba UGYANEZT a függvényt hívja
 * (KUKA-207). Szótár nélkül a kulcsot adja vissza: a hiány DERÜLJÖN KI, ne néma üres mondat legyen.
 */
export function unboundMessage(why, texts) {
  const key = unboundKey(why);
  const box = texts && typeof texts === 'object' ? texts : null;
  const sentence = box && typeof box[key] === 'string' && box[key] ? box[key] : null;
  return sentence || key;
}
