// v3app/httpSchema.mjs — HTP-01: A BEMENETI SÉMA A KÜLSŐ HATÁRON (R75/F75-03 · az OB-3 / R64 L7 zárása).
//
// A LELET, AMIT EZ LEZÁR (a külső ellenőrző fél, chatgpt-v3, R75/F75-03 — valódi HTTP-n mérve):
//   POST /api/workspaces  {"name":{"invalid":true},"plan":"starter"}
//   → HTTP 201, name="[object Object]", a munkakörnyezetek száma 0 → 1.
// A héj `String(body.name ?? '')`-t írt: a kényszerítés a TÍPUS-KÉRDÉST nem tette fel, csak
// eltüntette (KUKA-125 a határon). A séma nem „szigorúbb String()", hanem MÁS kérdés: mi a
// deklarált alakja ennek a műveletnek — és ami nem az, az NEVEZETTEN elakad, ÍRÁS NÉLKÜL.
//
// A KÉT SZERZŐDÉS EGY SZABÁLYBÓL — és a határuk KIMONDVA (R75: „ne hagyj két ellentétes külső
// szerződést"):
//   · ÁLLAPOTVÁLTOZTATÓ végpont (`mutates: true`): a séma KAPU. Ismeretlen mező · hiányzó kötelező ·
//     rossz típus · zárt készleten kívüli érték · nem támogatott sémaverzió ⇒ HTTP 400, nevezett ok,
//     és a kérés NEM ír. Ezeken a végpontokon `param_ignored` TÖBBÉ NEM SZÜLETIK — ami nem deklarált,
//     az elutasítás, nem „figyelmen kívül hagyva".
//   · OLVASÓ végpont (`mutates: false`): nincs mit megvédeni az írástól, ezért a régi, NEVEZETT
//     figyelmen kívül hagyás marad (`param_ignored` + `ignored_params`) — a kliens által küldött
//     cselekvő/könyv-mező továbbra sem ad jogot, és a válasz ezt KI IS MONDJA (H08).
// A kettőt nem a véletlen dönti el, hanem ez a regiszter: a `mutates` mező a szerződés maga.
//
// A SÉMA A KÉRÉS ALAKJÁT MÉRI, NEM AZ ÜZLETI IGAZSÁGOT. Hogy létezik-e a cím, hatályos-e a tagság,
// jár-e a jog — azt a mag dönti el, változatlanul. A határ csak annyit állít: ez a kérés
// ÉRTELMEZHETŐ-e (KUKA-002: két tény nem ül egy ábrázoláson).
//
// A MOTOR KÖZÖS (`v3ref/inputSchema.mjs` → `validateAgainstSchema`): a sorrend, a hibakódok és a
// „konverzió sosem előzi meg a típust" szabály EGY otthonban él (KUKA-003 · KUKA-018 · KUKA-039).
// Amit ez a fájl birtokol: VÉGPONTONKÉNT a mezők — a `stock.receipt` üzleti sémáját NEM másoljuk rá.
import { validateAgainstSchema } from '../v3ref/inputSchema.mjs';
import { PLANS } from '../v3ref/entitlement.mjs';
import { KNOWN_ROLES } from '../v3ref/authz.mjs';
import { KNOWN_DATA_SCOPES } from '../v3ref/resultScope.mjs';

const frozen = (o) => Object.freeze(o);

// A SÉMAVERZIÓ MEGERŐSÍTŐ MEZŐJE (SVR-01 a határon). A verziót a REGISZTER választja; a beadó
// legfeljebb MEGERŐSÍTI. Ezért ez a mező NEM a séma mezője: a motor `version` bemenete lesz, és
// eltérésnél `unsupported_schema_version` a válasz — nem `unknown_field`.
export const VERSION_FIELD = 'schema_version';

// A KONTEXTUS MEGERŐSÍTÉSE (KTX-01, R75/F75-02). Ugyanaz az alak, mint a sémaverziónál: a kliens
// nem VÁLASZT könyvet vele (azt kizárólag a munkamenet dönti el), hanem MEGERŐSÍTI, melyik
// munkakörnyezetben állt, amikor a gombot megnyomta. Eltérésnél a kérés nevezetten elakad —
// így egy RÉGI képernyőn hagyott gomb nem írhat az ÚJ cég nevében.
export const CONTEXT_FIELD = 'expected_book_id';
const contextConfirm = frozen({ type: 'nonempty_string', required: false, max_length: 64, confirm_only: true });

// A NÉZET MEGERŐSÍTÉSE AZ OLVASÁSON (KTX-02, R77/F77-01) — ugyanaz a „csak szűkíthet" alak, mint a
// `CONTEXT_FIELD`-nél, csak lekérdezés-mezőként: a kliens megmondhatja, MELYIK nézetben indult a
// kérés, és eltérésnél a szerver nem ad adatot. Jogot SOHA nem ad.
const expectedBookQuery = frozen({ type: 'nonempty_string', required: false, max_length: 64, confirm_only: true });
const expectedSubjectQuery = frozen({ type: 'nonempty_string', required: false, max_length: 64, confirm_only: true });
const readContextQuery = frozen({ fields: frozen({ expected_book_id: expectedBookQuery, expected_subject_id: expectedSubjectQuery }) });

const email = frozen({ type: 'email_address', required: true, max_length: 254 });
const token = frozen({ type: 'nonempty_string', required: true, max_length: 128 });
const subjectRef = frozen({ type: 'nonempty_string', required: true, max_length: 64 });

/**
 * A VÉGPONTOK DEKLARÁLT ALAKJA. Végpontonként SAJÁT mezők — a `mutates` mondja meg, kapu-e a séma.
 * A `query` mindenhol deklarált: állapotváltoztató végponton ÜRES (tehát bármely lekérdezés-mező
 * elutasítás), olvasón a ténylegesen olvasott paraméterek.
 */
export const ENDPOINT_SCHEMAS = frozen({
  'POST /api/register': frozen({
    version: '1', mutates: true,
    body: frozen({ fields: frozen({ email, password: frozen({ type: 'secret_string', required: true, min_length: 8, max_length: 512 }) }) }),
    query: frozen({ fields: frozen({}) }),
  }),
  'POST /api/verification/resend': frozen({
    version: '1', mutates: true,
    body: frozen({ fields: frozen({ email }) }),
    query: frozen({ fields: frozen({}) }),
  }),
  'POST /api/login': frozen({
    version: '1', mutates: true,
    body: frozen({ fields: frozen({ email, password: frozen({ type: 'secret_string', required: true, max_length: 512 }) }) }),
    query: frozen({ fields: frozen({}) }),
  }),
  'POST /api/logout': frozen({
    version: '1', mutates: true,
    body: frozen({ fields: frozen({}) }),
    query: frozen({ fields: frozen({}) }),
  }),
  'POST /api/workspaces': frozen({
    version: '1', mutates: true,
    body: frozen({
      fields: frozen({
        name: frozen({ type: 'nonempty_string', required: true, min_length: 1, max_length: 120 }),
        // DEKLARÁLT (nem néma) alapértelmezés: a válasz felsorolja (`defaults_applied`), tehát
        // látszik, hogy nem a beadó küldte — a BEM-01 a NÉMA alapértelmezést tiltja.
        plan: frozen({ type: 'nonempty_string', required: false, default: 'starter', enum: frozen(Object.keys(PLANS)) }),
        business: frozen({
          type: 'object', required: false,
          fields: frozen({
            // AZ ADÓSZÁM ÖNBEVALLOTT ÁLLÍTÁS (REP-01): az alakját mérjük, az IGAZSÁGÁT nem.
            tax_id: frozen({ type: 'nonempty_string', required: true, max_length: 64 }),
            // A JOGHATÓSÁGRA SZÁNDÉKOSAN NINCS ZÁRT KÉSZLET (H12 · R64): az ISMERETLEN országprofil
            // nem tilthatja meg a független saját munkát — a mag ilyenkor `UNKNOWN`-t tárol, és a
            // képviseleti jogot amúgy sem az azonosító adja (REP-01). A séma itt az ALAKOT méri.
            // Ha enumot tennénk ide, a határ SZIGORÚBB lenne a magnál, és egy megépített képesség
            // tűnne el némán a felületről (KUKA-092: a tiltás a megépítés helyett).
            jurisdiction: frozen({ type: 'string', required: false, default: '', max_length: 32 }),
          }),
        }),
      }),
    }),
    query: frozen({ fields: frozen({}) }),
  }),
  'POST /api/session/workspace': frozen({
    version: '1', mutates: true,
    // A `book_id` ITT LEGITIM BEMENET: ez maga a váltás tárgya. A jogot nem ez adja — a mag ÉLŐ
    // tagság-feloldója dönt (`membershipAsOf`), és idegen könyvre `not_a_member` a válasz.
    body: frozen({ fields: frozen({ book_id: frozen({ type: 'nonempty_string', required: true, max_length: 64 }) }) }),
    query: frozen({ fields: frozen({}) }),
  }),
  'POST /api/workspaces/plan': frozen({
    version: '1', mutates: true,
    body: frozen({ fields: frozen({ plan: frozen({ type: 'nonempty_string', required: true, enum: frozen(Object.keys(PLANS)) }), [CONTEXT_FIELD]: contextConfirm }) }),
    query: frozen({ fields: frozen({}) }),
  }),
  'POST /api/invites': frozen({
    version: '1', mutates: true,
    body: frozen({
      fields: frozen({
        email,
        role: frozen({ type: 'nonempty_string', required: true, enum: frozen([...KNOWN_ROLES]) }),
        scope: frozen({ type: 'nonempty_string', required: true, enum: frozen([...KNOWN_DATA_SCOPES]) }),
        [CONTEXT_FIELD]: contextConfirm,
      }),
    }),
    query: frozen({ fields: frozen({}) }),
  }),
  'POST /api/invites/pending': frozen({
    version: '1', mutates: true,
    body: frozen({ fields: frozen({ token }) }),
    query: frozen({ fields: frozen({}) }),
  }),
  'POST /api/invites/redeem': frozen({
    version: '1', mutates: true,
    body: frozen({ fields: frozen({ token }) }),
    query: frozen({ fields: frozen({}) }),
  }),
  'POST /api/members/scope': frozen({
    version: '1', mutates: true,
    body: frozen({
      fields: frozen({
        subject_id: subjectRef,
        scope: frozen({ type: 'nonempty_string', required: true, enum: frozen([...KNOWN_DATA_SCOPES]) }),
        [CONTEXT_FIELD]: contextConfirm,
      }),
    }),
    query: frozen({ fields: frozen({}) }),
  }),
  'POST /api/members/revoke': frozen({
    version: '1', mutates: true,
    body: frozen({ fields: frozen({ subject_id: subjectRef, [CONTEXT_FIELD]: contextConfirm }) }),
    query: frozen({ fields: frozen({}) }),
  }),
  // ── FEJLESZTŐI FELÜLET — a `devSurface` kapcsoló mögött; élesben nem létezhet (lásd server.mjs).
  'POST /dev/clock': frozen({
    version: '1', mutates: true,
    body: frozen({ fields: frozen({ advance_ms: frozen({ type: 'finite_number', required: true }) }) }),
    query: frozen({ fields: frozen({}) }),
  }),

  // ── OLVASÓ VÉGPONTOK — a séma itt a DEKLARÁLT paramétereket méri, a többi NEVEZETTEN kimarad.
  'GET /api/me': frozen({ version: '1', mutates: false, body: frozen({ fields: frozen({}) }), query: frozen({ fields: frozen({}) }) }),
  'GET /api/members': frozen({ version: '1', mutates: false, body: frozen({ fields: frozen({}) }), query: readContextQuery }),
  // A MEGERŐSÍTŐ HIVATKOZÁS ÍR (beváltja a kihívást), MÉGSEM KAPUZÓ — és ez KIMONDOTT kivétel, nem
  // feledékenység: ez egy LEVÉLBŐL megnyitott böngésző-hivatkozás, amihez a levelezők szívesen
  // ragasztanak saját paramétert. Ha egy idegen paraméter miatt a megerősítés elutasításba futna,
  // a felhasználó ZSÁKUTCÁBA érne (KUKA-064) — pont abba, amit az F75-01 javít. Az írást itt nem a
  // séma védi, hanem a kihívás SAJÁT szerződése (CHR-01): egyszeri · lejáró · leváltható token.
  'GET /api/verify': frozen({ version: '1', mutates: true, gate: false, body: frozen({ fields: frozen({}) }), query: frozen({ fields: frozen({ token: frozen({ type: 'nonempty_string', required: false, max_length: 128 }) }) }) }),
  'GET /api/invites/observe': frozen({ version: '1', mutates: false, body: frozen({ fields: frozen({}) }), query: frozen({ fields: frozen({ token: frozen({ type: 'nonempty_string', required: false, max_length: 128 }) }) }) }),
  'GET /api/data/stock': frozen({ version: '1', mutates: false, body: frozen({ fields: frozen({}) }), query: readContextQuery }),
  'GET /api/data/price': frozen({ version: '1', mutates: false, body: frozen({ fields: frozen({}) }), query: readContextQuery }),
  'GET /dev/mailbox': frozen({ version: '1', mutates: false, body: frozen({ fields: frozen({}) }), query: frozen({ fields: frozen({}) }) }),
  'GET /dev/clock': frozen({ version: '1', mutates: false, body: frozen({ fields: frozen({}) }), query: frozen({ fields: frozen({}) }) }),
});

/**
 * A VÉGPONT FELOLDÁSA SAJÁT KULCSON (SOP-01 alakja a határon, R37/F37-02 tanulsága).
 * Az ÖRÖKÖLT tulajdonság-nevek (`toString` · `constructor` · `__proto__`) NEM találnak sémát:
 * a lekérés `hasOwnProperty`-vel megy, és az eredmény alakját is megnézzük.
 */
export function schemaForEndpoint(key) {
  if (typeof key !== 'string') return null;
  if (!Object.prototype.hasOwnProperty.call(ENDPOINT_SCHEMAS, key)) return null;
  const found = ENDPOINT_SCHEMAS[key];
  return found && typeof found === 'object' && found.body && found.query ? found : null;
}

/** A védett (kapuzó) végpont-e — a `gate` kifejezetten felülírhatja (a `GET /api/verify` böngésző-út). */
export function isGated(schema) {
  return Boolean(schema && schema.mutates && schema.gate !== false);
}

const fail = (error, detail, at, where) => frozen({ ok: false, error, detail: detail ?? null, at: at ?? null, where });

/**
 * A KÉRÉS ELLENŐRZÉSE. Visszaad: `{ok:true, value, query, defaults_applied, ignored_params}` vagy
 * nevezett elutasítást. SOHA nem ír, és sosem dönt jogosultságról.
 */
export function validateRequest({ key, body = {}, query = {} }) {
  const schema = schemaForEndpoint(key);
  if (!schema) {
    // FAIL-CLOSED (KUKA-122/2): ha egy végpontnak nincs deklarált sémája, az nem „mindent szabad",
    // hanem nevezett elutasítás — a szerződés HIÁNYA ZÁR.
    return fail('endpoint_schema_missing',
      `nincs deklarált bemeneti séma erre a végpontra: ${JSON.stringify(key)}`, null, 'endpoint');
  }
  const gated = isGated(schema);

  // 1. A SÉMAVERZIÓ MEGERŐSÍTŐ MEZŐJE — kivesszük a törzsből, mielőtt a mezők számítanának.
  let version;
  let bodyFields = body;
  if (body && typeof body === 'object' && !Array.isArray(body) && Object.prototype.hasOwnProperty.call(body, VERSION_FIELD)) {
    version = body[VERSION_FIELD];
    bodyFields = { ...body };
    delete bodyFields[VERSION_FIELD];
  }

  // 2. A TÖRZS. Kapuzó végponton a motor ítélete kötelező; olvasón nincs törzs (a kérés GET).
  const checkedBody = validateAgainstSchema({ schema: { version: schema.version, fields: schema.body.fields }, input: bodyFields, version });
  if (!checkedBody.ok) {
    if (gated) return fail(checkedBody.error, checkedBody.detail, checkedBody.at, 'body');
  }

  // 3. A LEKÉRDEZÉS-MEZŐK. A böngésző mindig szöveget küld, ezért itt a MEGLÉT és a HOSSZ a kérdés.
  const declaredQuery = Object.keys(schema.query.fields);
  const queryKeys = Object.keys(query || {});
  const unknownQuery = queryKeys.filter((k) => !declaredQuery.includes(k));
  if (gated && unknownQuery.length) {
    return fail('unknown_field',
      `nem deklarált lekérdezés-mező: ${unknownQuery.join(', ')} — ezen a végponton ${declaredQuery.length ? `a séma mezői: ${declaredQuery.join(' · ')}` : 'nincs elfogadott lekérdezés-mező'}`,
      unknownQuery[0], 'query');
  }
  const queryInput = {};
  for (const k of declaredQuery) if (Object.prototype.hasOwnProperty.call(query || {}, k)) queryInput[k] = query[k];
  const checkedQuery = validateAgainstSchema({ schema: { version: schema.version, fields: schema.query.fields }, input: queryInput });
  if (!checkedQuery.ok && gated) return fail(checkedQuery.error, checkedQuery.detail, checkedQuery.at, 'query');

  // 4. AMI NEM KAPUZÓ VÉGPONTON ÉRKEZETT: NEVEZETTEN kimarad (a régi `param_ignored` szerződés).
  const ignored = gated ? [] : [...new Set([
    ...unknownQuery,
    ...(bodyFields && typeof bodyFields === 'object' && !Array.isArray(bodyFields)
      ? Object.keys(bodyFields).filter((k) => !Object.keys(schema.body.fields).includes(k)) : []),
  ])];

  return frozen({
    ok: true,
    mutates: Boolean(schema.mutates),
    gated,
    value: checkedBody.ok ? checkedBody.value : frozen({}),
    defaults_applied: checkedBody.ok ? checkedBody.defaults_applied : frozen([]),
    query: checkedQuery.ok ? checkedQuery.value : frozen({}),
    ignored_params: frozen(ignored),
    version: schema.version,
  });
}

/** MINDEN kezelőnek van-e deklarált sémája — a héj indulásakor és a próbákban is mérve. */
export function endpointsWithoutSchema(handlerKeys) {
  return [...handlerKeys].filter((k) => !schemaForEndpoint(k));
}

export const HTP_CONTRACT = frozen({
  id: 'HTP-01',
  owns: 'végpontonként a HTTP-kérés deklarált alakja (törzs + lekérdezés)',
  engine: 'v3ref/inputSchema.mjs → validateAgainstSchema (BEM-01)',
  gated_endpoints: frozen(Object.keys(ENDPOINT_SCHEMAS).filter((k) => isGated(ENDPOINT_SCHEMAS[k]))),
  read_endpoints: frozen(Object.keys(ENDPOINT_SCHEMAS).filter((k) => !isGated(ENDPOINT_SCHEMAS[k]))),
  two_contracts: frozen({
    mutating: 'a séma KAPU — nevezett elutasítás, írás nélkül; `param_ignored` nem születik',
    reading: 'nincs írás, ezért NEVEZETT figyelmen kívül hagyás (`param_ignored` + `ignored_params`)',
    boundary_owner: 'ez a regiszter (`mutates`), nem a végpont kódja',
  }),
  confirm_only_fields: frozen([VERSION_FIELD, CONTEXT_FIELD]),
  stated_limit: 'a séma az ALAKOT méri: a cím létezése, a tagság hatálya, a jog megléte és az '
    + 'előfizetés továbbra is a mag döntése — a határ nem vesz át üzleti döntést',
});
