/** MCS-2 / BEM-01 — BEMENETI SÉMA.
 *
 * BIRTOKOL: műveletenként a bemenet DEKLARÁLT alakja.
 * ÍGÉR: ismeretlen mező · rossz típus · hiányzó kötelező mező · nem véges szám → NEVEZETT
 *       elutasítás, ÍRÁS NÉLKÜL; ismeretlen műveletre FAIL-CLOSED.
 * TILT: `Number()` / `String()` konverzió a TÍPUS-ELLENŐRZÉS ELŐTT · néma alapértelmezés.
 *
 * MIÉRT TILOS A KONVERZIÓ ELŐBB (KUKA-125 — a külső fél R71-es lelete a saját javításomon).
 * A `Number(true)`, a `Number([1])` és a `Number("1")` MIND 1-et ad. Ha a konverzió a típus-
 * ellenőrzés ELŐTT fut, akkor a legszigorúbb utána következő ellenőrzés is a saját vakfoltját méri
 * — és ami rosszabb: a jelenléte AZT SUGALLJA, hogy a típus meg van fogva. Ezért ebben a modulban
 * a típus a NYERS értéken dől el, és a konverzió csak utána jöhet.
 *
 * MIÉRT FAIL-CLOSED AZ ISMERETLEN MŰVELET (KUKA-122/2). Ha egy ismeretlen művelet „nincs rá séma,
 * tehát mindent elfogadunk" ágra fut, akkor a séma nem kapu, hanem OPCIÓ: aki meg akarja kerülni,
 * elnevezi másnak a műveletét. A szerződés HIÁNYA ZÁR.
 *
 * MIT NEM CSINÁL — KIMONDVA (az MCS-1 §3/BEM-01 mért függősége, az R6 §4 szűkítésével).
 * Ma a magban **19 exportált író függvény** van: 5 deklarált belépési pont · 13 belső író · 1 mérési
 * segéd. **Egyik sem érhető el kívülről — HTTP-réteg és bizalmi határ NINCS**, tehát jelenlegi
 * megkerülésről nincs szó; ez TERVEZÉSI kockázat. Amikor a BEJ-01 megépül, a BEM-01 a KÜLSŐ HATÁRON
 * ellenőriz sémát, a belső írók pedig a SAJÁT invariánsaikat tartják — két külön felelősség.
 */
import { parseQuantity, quantitySyntaxProblem } from './quantity.mjs';
import { parseInstant } from './instant.mjs';
import { showValue } from './closedRegistry.mjs';

const fail = (error, detail, at) => Object.freeze({ ok: false, error, detail: detail ?? null, at: at ?? null });

// ── A MEZŐ-TÍPUSOK — a NYERS értéken mérve ──────────────────────────────────────────────────────
//
// Mindegyik a KONVERZIÓ NÉLKÜLI kérdést teszi fel. A `quantity` külön fajta, mert a mennyiség
// szerződése SAJÁT hibakód-sorrendet visz (MNY-01), és azt nem szabad `invalid_type`-ra lapítani.
const TYPES = Object.freeze({
  string: (v) => (typeof v === 'string' ? null : `szöveg kell, kapott: ${describe(v)}`),
  nonempty_string: (v) => {
    if (typeof v !== 'string') return `szöveg kell, kapott: ${describe(v)}`;
    return v.trim() ? null : 'nem lehet üres';
  },
  // A SZÁM ITT VALÓDI SZÁM, és NEM VÉGES érték fail-closed: a NaN és a ±Infinity átcsúszik minden
  // összehasonlításon (NaN < x hamis, NaN > x is hamis), tehát a határ-ellenőrzés némán elenged.
  finite_number: (v) => {
    if (typeof v !== 'number') return `szám kell, kapott: ${describe(v)}`;
    return Number.isFinite(v) ? null : 'nem véges szám (NaN vagy ±Infinity)';
  },
  boolean: (v) => (typeof v === 'boolean' ? null : `logikai érték kell, kapott: ${describe(v)}`),
});

// Az IDŐPONT — ez is SAJÁT SZERZŐDÉSŰ fajta (IDO-01), mint a mennyiség, nem egyszerű típus-próba.
//
// MIÉRT KERÜLT KI A `TYPES`-BÓL (R10-F03). Amíg reguláris kifejezés állt itt, a séma az ALAKOT
// mérte és a JELENTÉST nem: a `2026-99-99T99:99:99Z` átment. A minta-illesztés fogalmilag nem tud
// naptárt nézni, tehát nem szigorítani kellett, hanem a kérdést AHHOZ tenni, aki tudja rá a választ
// (KUKA-039: a szabály EGY otthonban él, és minden olvasó azt hívja). Két következménye van:
//   · a HIBAKÓD az IDO-01-é marad (`invalid_calendar` · `invalid_format` · `not_a_string`), nem
//     lapul `invalid_type`-ra — különben a beadó azt hinné, rossz TÍPUST küldött, holott a típus jó
//     volt, csak a nap nem létezik (KUKA-124/2 · KUKA-064);
//   · a KANONIKUS alak megy tovább, nem a nyers szöveg (KUKA-029).
const INSTANT_FIELD = 'iso_instant';


/** A TÍPUS LEÍRÁSA — hogy a hibaüzenet megmondja, MIT kapott (KUKA-064: ne legyen zsákutca). */
function describe(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'tömb';
  return typeof v;
}

// ── A MŰVELETEK DEKLARÁLT ALAKJA ────────────────────────────────────────────────────────────────
//
// Az ELSŐ D-folyamat egyetlen írás-művelete. Minden mező NEVESÍTVE, kötelezőség kimondva —
// „opcionális, alapértelmezéssel" ág NINCS: a néma alapértelmezés tiltott (BEM-01).
export const OPERATION_SCHEMAS = Object.freeze({
  // A TULAJDONOS ÉS A RAKTÁR NEM A KÉRÉS TÖRZSÉBŐL JÖN — ezért NINCS is a sémában.
  //
  // AMI ELŐTTE VOLT, ÉS MIÉRT VOLT ROSSZ (a SAJÁT leletem a KSZ-01 bekötése közben). A séma kérte
  // az `owner_id`-t és a `warehouse_id`-t, a készletkulcsot viszont a HÍVÓ MEGBÍZHATÓ KÖRNYEZETE
  // adta (KUKA-047) — tehát a beadó kitölthetett két mezőt, amit a rendszer NÉMÁN eldobott. Ez a
  // KUKA-041 dísz-vezérlője a bemeneti sémán: a mező látszik, kitölthető, és semmit nem billent.
  // Két tény ült egy ábrázoláson (KUKA-002): a hatókör a kontextusé, a tartalom a beadóé.
  //
  // A MAI ALAK: a kontextus-mező a sémában NINCS — aki mégis küldi, NEVEZETT `unknown_field`
  // választ kap a séma mezőivel együtt (KUKA-064), nem néma eldobást. A parancs AZONOSSÁGÁBA
  // viszont a FELOLDOTT kontextus kerül (KSZ-01), különben ugyanaz az ismétlés-kulcs MÁS raktárra
  // némán „ismétlésnek" látszana.
  'stock.receipt': Object.freeze({
    version: '1',
    fields: Object.freeze({
      item_id: Object.freeze({ type: 'nonempty_string', required: true }),
      // A MENNYISÉG SZÖVEG, és a saját szerződése dönt róla (MNY-01) — a `positive` a MŰVELET
      // tulajdonsága, nem a mezőé: bevétnél a nulla nem mennyiség, hanem „nincs mozgás".
      qty: Object.freeze({ type: 'quantity', required: true, positive: true }),
      effective_at: Object.freeze({ type: 'iso_instant', required: true }),
    }),
  }),
});

/**
 * A BEMENET ELLENŐRZÉSE — nevezett elutasítás vagy tisztított érték. SOHA nem ír.
 *
 * A SORREND itt is szerződés: ismeretlen művelet → ismeretlen MEZŐ → hiányzó kötelező → típus.
 * Az ismeretlen mező ELŐBB dől el, mint a hiányzó: egy elgépelt mezőnév különben „hiányzó
 * kötelezőnek" látszana, és a beadó a rossz dolgot javítaná (KUKA-064).
 */
/**
 * SOP-01 — A MŰVELET-NÉV FELOLDÁSA, SAJÁT KULCSON (R37/F37-02).
 *
 * MIÉRT KÜLÖN FELOLDÓ. A régi alak `OPERATION_SCHEMAS[operation]`-t írt, ami az ÖRÖKÖLT
 * tulajdonságokat is megtalálja: `'toString'`, `'constructor'` és `'__proto__'` mellett a lekérés
 * egy FÜGGVÉNYT (illetve az Object.prototype-ot) adta vissza, tehát a `!schema` kapu ÁTENGEDTE, és
 * a hívás két sorral lejjebb `TypeError: Cannot convert undefined or null to object`-tel szállt el
 * — nem nevezett elutasítással. A zárt regiszter tehát NEM volt zárt; a hiba a külső ellenőrző fél
 * (chatgpt-v3, R37/F37-02) lelete, három néven reprodukálva.
 *
 * A NÉV TÍPUSA IS MÉRCE: egy szám vagy objektum nem művelet-név. A válasz mindkét esetben UGYANAZ
 * a nevezett `unknown_operation` — kivétel nélkül, írás nélkül (KUKA-020: a programhiba nem lehet
 * ugyanaz a válasz, mint a valódi „nem", de a valódi „nem" se bújjon kivételbe).
 */
export function schemaForOperation(operation) {
  if (typeof operation !== 'string') return null;
  if (!Object.prototype.hasOwnProperty.call(OPERATION_SCHEMAS, operation)) return null;
  const found = OPERATION_SCHEMAS[operation];
  return found && typeof found === 'object' && found.fields ? found : null;
}

/**
 * SVR-01 — A SÉMAVERZIÓ TULAJDONOSA ÉS HATÁRA, KIMONDVA (R37/F37-02 második fele).
 *
 * KI A TULAJDONOS: a **regiszter**, nem a beadó. A művelet sémája deklarálja a saját verzióját
 * (`version`), és a beadó ezt NEM választhatja meg. Ez szándékos szűkítés, nem hiányosság.
 *
 * MI A HATÁR: ha a beadvány MEGNEVEZ egy verziót, azt ELLENŐRIZZÜK. Egyezésnél megy tovább;
 * eltérésnél NEVEZETT elutasítás (`unsupported_schema_version`), a támogatott verzióval együtt.
 * Hallgatólagos átértelmezés NINCS: egy korábbi vagy ismeretlen verziójú beadványt nem olvasunk
 * úgy, mintha a maiban jött volna (KUKA-074: a megváltozott tényt nem nyelheti el az őr).
 *
 * AMIT EZ NEM CSINÁL, KIMONDVA: nincs migráció, nincs verzió-fordítás, nincs több élő verzió. Ha
 * valaha kell, annak SAJÁT szerződése és bizonyítéka lesz — ez a feloldó csak a HATÁRT mondja ki.
 */
export function checkSchemaVersion(schema, requested) {
  if (requested === undefined || requested === null) {
    return { ok: true, version: schema.version, chosen_by: 'register' };
  }
  const want = typeof requested === 'number' ? String(requested) : requested;
  if (typeof want !== 'string' || want !== schema.version) {
    return {
      ok: false,
      error: 'unsupported_schema_version',
      detail: `a beadvány ${showValue(requested)} sémaverziót nevez meg; ezen a műveleten `
        + `EGYETLEN támogatott verzió van: ${showValue(schema.version)} — a verziót a `
        + 'REGISZTER választja, nem a beadó, és korábbi verziójú beadványt nem értelmezünk át',
    };
  }
  return { ok: true, version: schema.version, chosen_by: 'request_confirmed' };
}

export function validateInput({ operation, input, version }) {
  // 1. ISMERETLEN MŰVELET — FAIL-CLOSED, a választhatók felsorolásával (KUKA-064).
  const schema = schemaForOperation(operation);
  if (!schema) {
    return fail('unknown_operation',
      `nincs deklarált bemeneti séma erre: ${showValue(operation)} — `
      + `választható: ${Object.keys(OPERATION_SCHEMAS).join(' · ')}`);
  }
  // A BURKOLÓ MAGA IS TÍPUS: a tömb és a null is „object" a `typeof`-nak (KUKA-125 rokona).
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return fail('invalid_body', `a bemenet objektum kell legyen, kapott: ${describe(input)}`);
  }

  // 1/b. A MEGNEVEZETT SÉMAVERZIÓ (SVR-01). A verziót a REGISZTER választja; ha a beadvány
  // megnevez egyet, azt ellenőrizzük — a néma átértelmezés tiltott.
  const ver = checkSchemaVersion(schema, version);
  if (!ver.ok) return fail(ver.error, ver.detail);

  // 2. ISMERETLEN MEZŐ.
  const declared = Object.keys(schema.fields);
  const unknown = Object.keys(input).filter((k) => !declared.includes(k));
  if (unknown.length) {
    return fail('unknown_field', `nem deklarált mező: ${unknown.join(', ')} — `
      + `a séma mezői: ${declared.join(' · ')}`, unknown[0]);
  }

  // 3. HIÁNYZÓ KÖTELEZŐ — a HIÁNY külön válasz, nem „rossz típus" (KUKA-124/2).
  const clean = {};
  const pendingQuantities = [];
  for (const [name, spec] of Object.entries(schema.fields)) {
    const present = Object.prototype.hasOwnProperty.call(input, name);
    if (!present) {
      if (spec.required) return fail('missing_field', `kötelező mező: ${name}`, name);
      continue;
    }
    const value = input[name];

    // 4. TÍPUS — a NYERS értéken, konverzió NÉLKÜL.
    if (spec.type === 'quantity') {
      // A. SZAKASZ — PROFIL-FÜGGETLEN. Ez a réteg a HATÁRON áll: a CIKKET, és vele a mennyiség
      // PROFILJÁT még nem ismeri. Ami a profiltól függ (tizedesjegy · plafonok · kanonikus alak), az
      // a B. SZAKASZ, és ott dől el, ahol a cikk ismert — a főkönyvben (`bindQuantityProfile`).
      // A MENNYISÉG SAJÁT HIBAKÓDJA MEGMARAD (R8 §2): nem lapítjuk `invalid_type`-ra, különben a
      // beadó `precision` helyett `invalid_type`-ot kapna, és mást javítana.
      const syn = quantitySyntaxProblem(value);
      if (syn) return fail(syn.error, syn.detail, name);
      clean[name] = value;           // a NYERS alak megy tovább — a gyógyítás a profil dolga
      pendingQuantities.push(name);
      continue;
    }
    if (spec.type === INSTANT_FIELD) {
      const t = parseInstant(value);
      if (!t.ok) return fail(t.error, t.detail, name);
      clean[name] = t.canonical;     // a KANONIKUS UTC-szöveg megy tovább — a főkönyv ezen rendez
      continue;
    }
    const checker = TYPES[spec.type];
    if (!checker) return fail('schema_error', `ismeretlen mező-típus a sémában: ${spec.type}`, name);
    const problem = checker(value);
    if (problem) return fail('invalid_type', problem, name);
    clean[name] = value;
  }

  // A VÁLASZ KIMONDJA, MI MARADT NYITVA. Ha a hívó elfelejtené a B. szakaszt, a `profile_bound`
  // hamis marad, és a főkönyv NEVEZETTEN utasít el — a fél lánc nem csúszhat át némán (KUKA-069).
  return Object.freeze({
    ok: true, operation, version: schema.version, version_chosen_by: ver.chosen_by, value: Object.freeze(clean),
    quantity_fields: Object.freeze(pendingQuantities), profile_bound: pendingQuantities.length === 0,
  });
}

/**
 * B. SZAKASZ — A MENNYISÉG A CIKK PROFILJÁVAL (a SAJÁT leletem az R10 mérése közben).
 *
 * A HÍVÓ akkor hívja, amikor a cikk — és vele a profil — MÁR ismert. Innentől a mennyiség
 * KANONIKUS alakja a PROFILÉ: a darabos cikknél `"1000"`, a három tizedesesnél `"1000.000"`, és a
 * kettő NEM ugyanaz a szöveg. Ezért kerül a parancs AZONOSSÁGÁBA is ez az alak, nem a nyers bemenet.
 *
 * A HIÁNYZÓ PROFIL NEM ALAPÉRTELMEZÉS, HANEM ZÁR (KUKA-122/2 · BEM-01): ha a hívó nem tudja
 * megmondani, melyik profil szerint kell érteni a számot, akkor a szám JELENTÉSE ismeretlen — és az
 * ismeretlen jelentésű mennyiséget nem könyveljük.
 */
export function bindQuantityProfile(checked, { profileId } = {}) {
  if (!checked || checked.ok !== true) return checked;
  if (!checked.quantity_fields || checked.quantity_fields.length === 0) {
    return Object.freeze({ ...checked, profile_bound: true });
  }
  if (typeof profileId !== 'string' || !profileId) {
    return fail('profile_required',
      `a(z) ${checked.quantity_fields.join(', ')} mező mennyiség, a jelentését a CIKK profilja adja — `
      + 'profil nélkül a szám nem értelmezhető, ezért nem könyveljük');
  }
  const schema = schemaForOperation(checked.operation);
  const bound = { ...checked.value };
  for (const name of checked.quantity_fields) {
    const spec = schema.fields[name];
    const q = parseQuantity(bound[name], { profileId, positive: Boolean(spec && spec.positive) });
    if (!q.ok) return fail(q.error, q.detail, name);      // a HIBAKÓD az MNY-01-é marad (R8 §2)
    bound[name] = q.text;                                  // a PROFIL szerinti KANONIKUS alak
  }
  return Object.freeze({
    ...checked, value: Object.freeze(bound), profile_bound: true, qty_profile: profileId,
  });
}

export const BEM_CONTRACT = Object.freeze({
  id: 'BEM-01',
  owns: 'műveletenként a bemenet deklarált alakja',
  operations: Object.freeze(Object.keys(OPERATION_SCHEMAS)),
  error_order: Object.freeze(['unknown_operation', 'invalid_body', 'unsupported_schema_version', 'unknown_field', 'missing_field', 'invalid_type']),
  // A SÉMAVERZIÓ TULAJDONOSA KIMONDVA (SVR-01, R37): a REGISZTER választ, a beadó legfeljebb
  // MEGERŐSÍT. Több élő verzió, migráció és verzió-fordítás NINCS — ez határ, nem hiányosság.
  schema_version: Object.freeze({
    owner: 'register', requester_may: 'confirm_only',
    on_mismatch: 'unsupported_schema_version',
    stated_limit: 'egyetlen élő verzió műveletenként; korábbi verziójú beadványt NEM értelmezünk '
      + 'át, és nincs migrációs keret — ha valaha kell, saját szerződéssel és bizonyítékkal jön',
  }),
  // A SAJÁT SZERZŐDÉSŰ MEZŐ-FAJTÁK hibakódja NEM lapul `invalid_type`-ra — kimondva, hogy a
  // sorrend-lista fölötti kivétel ne legyen néma (R8 §2 · R10-F03).
  delegates: Object.freeze([
    Object.freeze({ field_type: 'quantity', contract: 'MNY-01', keeps_error_codes: true, two_stage: true }),
    Object.freeze({ field_type: 'iso_instant', contract: 'IDO-01', keeps_error_codes: true, two_stage: false }),
  ]),
  // A MENNYISÉG KÉT SZAKASZBAN dől el, mert a szerződése FÜGG a cikk profiljától, a cikket pedig ez
  // a réteg nem ismeri. Az `iso_instant` NEM ilyen: a naptár mindenkinek ugyanaz.
  quantity_stages: Object.freeze([
    'A — profil-független: szöveg-e (not_a_string) · decimális alakú-e (invalid_format)',
    'B — profil-bound, a főkönyvben: precision · out_of_range · must_be_positive · KANONIKUS alak',
  ]),
  forbids: Object.freeze([
    'Number()/String() konverzió a típus-ellenőrzés ELŐTT',
    'néma alapértelmezés hiányzó mezőre',
    'ismeretlen műveletre megengedő ág',
    'reguláris kifejezéssel „validált" időpont (R10-F03)',
    'a mennyiség kanonizálása ALAPÉRTELMEZETT profillal, a cikk profilja helyett',
  ]),
  stated_limit: 'ma NINCS külső határ (HTTP-réteg): 5 deklarált belépési pont · 13 belső író · '
    + '1 mérési segéd. A BEM-01 a BEJ-01 megépülésekor áll a KÜLSŐ határra; a belső írók a SAJÁT '
    + 'invariánsaikat tartják — két külön felelősség (az R6 §4 szűkítése).',
});
