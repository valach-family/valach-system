/** MCS-2 / IDO-01 — AZ IDŐPONT: VALÓDI NAPTÁR, KANONIKUS ALAK, KÉT TENGELY.
 *
 * MIÉRT SZÜLETETT (R10-F03, a külső fél lelete). A BEM-01 első alakja REGULÁRIS KIFEJEZÉSSEL nézte
 * az időpontot, és elfogadta ezt: **`2026-99-99T99:99:99Z`**. A minta az ALAKOT mérte, nem a
 * JELENTÉST — pontosan az a hiba-osztály, amiről a KUKA-022 szól („a név nem bizonyíték"): a
 * karakterek rendben voltak, a nap és az óra nem létezik.
 *
 * ÉS A MÁSODIK BAJ UGYANEBBŐL: ha az időpont nyers SZÖVEGKÉNT kerül a táblába, akkor UGYANANNAK az
 * időpontnak TÖBB alakja lehet (`2026-03-01T00:00:00Z` · `2026-03-01T00:00:00.000Z` ·
 * `2026-03-01T01:00:00+01:00`), és a főkönyv SZÖVEG-összehasonlítással rendez. Két azonos pillanat
 * így két külön helyre kerül a sorrendben — a készlet-egyenleg a szöveg írásmódjától függne
 * (KUKA-029: ahol egy értéknek tárolt és gyógyított alakja is él, MINDEN olvasó a gyógyítottat
 * nézze; itt a gyógyított alak a KANONIKUS UTC-szöveg).
 *
 * A KÉT TENGELY NEVE ITT DŐL EL, EGY HELYEN (KSZ-01):
 *   · `recorded_at`  — MIKOR TUDTUK MEG (a rögzítés pillanata)
 *   · `effective_at` — MIKORRA VONATKOZIK (a hatály pillanata)
 * A kettő SOHA nem cserélhető fel, és a lekérdezésnek MINDKETTŐT meg kell tudnia szólítani.
 */

const CANON = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const fail = (error, detail) => Object.freeze({ ok: false, error, detail: detail ?? null });

/**
 * SZÖVEG → KANONIKUS IDŐPONT. Nem dob: nevezett elutasítást ad (KUKA-020).
 *
 * A VALÓDISÁG MÉRÉSE KÉT LÉPÉS, és a második a lényeg: a `Date.parse` a `2026-02-30`-at „elfogadja"
 * és március 2-ára csúsztatja — a néma javítás itt HAMIS ADAT lenne. Ezért a beolvasott időpontot
 * VISSZAÍRJUK szöveggé, és a mezőket ÖSSZEHASONLÍTJUK a bemenettel: ami átcsúszott, az nem az,
 * amit a beadó írt.
 */
export function parseInstant(input) {
  if (typeof input !== 'string') return fail('not_a_string', `ISO időpont (szöveg) kell, kapott: ${typeof input}`);
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,9})?Z$/.exec(input);
  if (!m) return fail('invalid_format', 'alak: YYYY-MM-DDTHH:MM:SS[.sss]Z — kizárólag UTC („Z")');

  const [, y, mo, d, h, mi, s, frac] = m;
  const ms = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s, frac ? Math.round(Number(`0${frac}`) * 1000) : 0);
  if (!Number.isFinite(ms)) return fail('invalid_calendar', 'nem értelmezhető időpont');

  // A VISSZAÍRÁS A BIZONYÍTÉK: ha a naptár „kijavította" a bemenetet, akkor az nem létező időpont
  // volt. Így bukik el a 2026-99-99, a 2026-02-30 és a 25:00 egyaránt — NÉVVEL, nem csúsztatással.
  const back = new Date(ms);
  const same = back.getUTCFullYear() === +y && back.getUTCMonth() === +mo - 1 && back.getUTCDate() === +d
    && back.getUTCHours() === +h && back.getUTCMinutes() === +mi && back.getUTCSeconds() === +s;
  if (!same) {
    return fail('invalid_calendar',
      `nem létező időpont: ${input} — a naptár ${back.toISOString()}-ra csúsztatná, `
      + 'és a néma csúsztatás HAMIS adat lenne');
  }
  return Object.freeze({ ok: true, ms, canonical: back.toISOString() });
}

/**
 * A KANONIKUS ALAK — EZ MEGY A TÁROLÓBA, és CSAK ez.
 *
 * Azért `toISOString()` (mindig három tizedes, mindig „Z"), mert a főkönyv SZÖVEG szerint rendez és
 * hasonlít: ha két azonos pillanat két különböző szöveg, a rendezés és a `<=` szűrés HAMIS lesz. A
 * kanonizálás tehát nem kozmetika, hanem a lekérdezés helyességének feltétele.
 */
export function canonicalInstant(input) {
  const t = parseInstant(input);
  return t.ok ? t.canonical : null;
}

/** IGAZ, ha a szöveg MÁR kanonikus alakban áll — a tárolt sorok visszamérésére. */
export function isCanonicalInstant(v) { return typeof v === 'string' && CANON.test(v); }

/**
 * A KÉT TENGELY EGY HELYEN DEKLARÁLVA (KSZ-01 · R10-F03).
 *
 * A NÉZET NEM EGY TENGELY, HANEM EGY (rögzítés, hatály) PÁR. Az első alakomban az „A" nézet CSAK a
 * `recorded_at`-ot szűrte, és emiatt egy MÁRCIUSBAN rögzített, JÚNIUSRA hatályos bevét a MÁRCIUSI
 * „akkor mit tudtunk" képen már benne volt — holott márciusban a készlet még nem nőtt meg. Ez a
 * KUKA-002 alakja az IDŐN: két független tény (mikor tudtuk meg · mikorra szól) közül csak az
 * egyiket kérdeztem, és a választ mindkettőre érvényesnek mondtam.
 *
 *   A = „AKKOR mit tudtunk AZ AKKORI készletről"  → recorded_at ≤ T ÉS effective_at ≤ T
 *   B = „MA mit tudunk arról az időpontról"        → effective_at ≤ T (a mai tudás teljes)
 *
 * A két nézet MEGNEVEZETT felhasználói alakja marad A/B; a BELSŐ igazság a két tengely, és a
 * lekérdezés MINDKETTŐT viszi.
 */
export const LEDGER_VIEW_AXES = Object.freeze({
  A: Object.freeze({
    id: 'A',
    label: 'akkor mit tudtunk az akkori készletről',
    axes: Object.freeze(['recorded_at', 'effective_at']),
    why: 'a rögzítés ÉS a hatály is az adott időpontig — a később rögzített sor akkor még nem létezett, '
      + 'a későbbre hatályos pedig akkor még nem hatott',
  }),
  B: Object.freeze({
    id: 'B',
    label: 'ma mit tudunk arról az időpontról',
    axes: Object.freeze(['effective_at']),
    why: 'a mai tudás TELJES: minden ma ismert sor számít, ami arra az időpontra hatályos — '
      + 'ezért a visszamenőleg rögzített bevét ITT megjelenik',
  }),
});
export const LEDGER_VIEWS = Object.freeze(Object.keys(LEDGER_VIEW_AXES));

export const IDO_CONTRACT = Object.freeze({
  id: 'IDO-01',
  owns: 'az időpont valódisága, kanonikus alakja és a főkönyv két idő-tengelye',
  promises: Object.freeze([
    'nem létező naptári időpont NEVEZETT elutasítás, nem néma csúsztatás',
    'a tárolt alak KANONIKUS UTC — azonos pillanat azonos szöveg',
    'a nézet (rögzítés, hatály) PÁR, nem egyetlen tengely',
  ]),
  forbids: Object.freeze([
    'reguláris kifejezéssel „validált" időpont',
    'nyers bemeneti szöveg tárolása',
    'egytengelyű A nézet',
  ]),
});
