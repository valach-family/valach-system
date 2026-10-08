// v3app/findings_r154.mjs — AZ R154 AUDIT ÉLŐ BATTÉRIÁJA (CMD-VS-300-002-002 R154).
//
// MIÉRT KÜLÖN BATTÉRIA. Az R154 a MEGLÉVŐ, VÁLTOZATLAN V3 auditját kérte — nem egy PR-diff
// átolvasását. Az első csomag három MÉRT leletet talált a HTTP-határon, és mind a három olyan
// helyen volt, ahol a teljes söprés ZÖLD maradt (37 verifier), tehát a zöldje ezekről semmit nem
// mondott:
//   · F154-01 — A KÉRÉSKORLÁT A TÁMADÁS ERŐSÍTŐJE VOLT. A `makeRateLimiter` egy címhez MINDEN
//     bélyeget megtartott, és kérésenként végigszűrte a sort. MÉRVE: 60 000 kérés egy címről
//     `count=60000` (240-es korlát mellett!) és 29,0 s tiszta CPU; 120 000 kérés 225,3 s — azaz
//     négyszeres kérésre 7,8-szoros idő. Egyszálú folyamatban a kéréskorlát maga állítja meg a
//     szolgáltatást, miközben a napló „megfogtuk"-ot mutat.
//   · F154-02 — HIBÁS SZÁZALÉK-ESCAPE → 500. `GET /%`, `GET /%zz`, `GET /a%E0%A4%A` mind
//     **500 `internal_error`** volt: a `decodeURIComponent` `URIError`-ja programhibaként esett ki.
//     A határ szerződése nevezett elutasítást ír elő (HTP-01 · KUKA-203 · KUKA-215).
//   · F154-03 — A MUNKAMENET-TÁR KORLÁTLAN VOLT. Sima `Map`, amibe MINDEN süti nélküli kérés új
//     sort tett, és egyedül a ki-/belépés törölt. MÉRVE: 10 000 süti nélküli `GET /api/me` után a
//     tár 10 000 sort tartott. Egy robot vagy egy elárasztás korlátlanul növeli a memóriát — és egy
//     munkamenet-süti amúgy is ÖRÖKKÉ érvényes volt.
//
// AMIT MÉR, ÉS HOGYAN (KUKA-092: a próba a JAVÍTÁS KIVÉTELÉRE pirosra kell váltson):
//   A) F154-01 — a sor hossza korlátos, a verdikt BETŰRE ugyanaz, és a vágott szám KIMONDJA, hogy
//      alsó korlát (`capped`) — nem hallgatja el (KUKA-129);
//   B) F154-02 — a három hibás út NEVEZETT 400, ÉLŐ HTTP-n, és az ellenpróbák változatlanok;
//   C) F154-03 — a plafon és a tétlenség a feloldón MÉRVE, ÉS a HATÁRON: egy névtelen elárasztás
//      NEM lépteti ki a belépett felhasználót (ez a felhasználó által LÁTOTT tulajdonság).
//
// Kilépési kód: 0 = minden állítás PASS · 1 = MÉRT hibát talált · 2 = a mérés elakadt.
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rmSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { startServer, makeRateLimiter, makeSessionStore, sessionLimits, SESSION_LIMITS, rateLimitConfig,
  clientAddressOf, clientIpOf, CLIENT_IP_HEADERS, PROXY_WITHOUT_ADDRESS_PREFIX,
  mondjaKiEgyszerAProxyHibat, resetProxyWarning } from './server.mjs';
import { dictFor } from './public/i18n/dict.mjs';
import { resolveLanguage, parseAcceptLanguage, pickFromAcceptLanguage, enabledLanguages } from './public/i18n/languages.mjs';
import { validateAgainstSchema } from '../v3ref/inputSchema.mjs';
import { purgeExpiredIntents, resumeIntent, rememberIntent, intentTtlMs, PENDING_INTENT_TTL_MS } from '../v3ref/invite.mjs';
import { validateRequest } from './httpSchema.mjs';
import { adaptiveUnitPlan } from '../v3ref/external-checks/batteryUnits.mjs';
import { allowedToursFor, availabilityOf, allowedActionsFor } from './assistant/policy.mjs';
import { TOURS } from './knowledge/features.mjs';
import { PERSONAL_SCREENS, ALWAYS_AVAILABLE_SCREENS } from './knowledge/features.mjs';
import { NAV_PERSONAL } from './public/texts.mjs';
import { request as httpReq } from 'node:http';
import { transcriptsOf } from '../tools/v3_fogyasztas_meres.mjs';
import { restoreTargetProblem, sameDatabase, effectiveDatabase, withDatabase, freshTargetName,
  restoreTargetDecision, restoreOutcome, redactConnStrings, acquireFreshTarget, localOnlyVerdict,
  effectiveHost, RESTORE_TARGET_PREFIX, PROTECTED_DB_NAMES,
  cliEnvFor, pgUrlShape, PG_URL_SHAPES, explicitSwitch, SWITCH_ON } from '../tools/lib/vs_pg_target.mjs';

import { execFileSync } from 'node:child_process';
/**
 * A CÍM SZEMANTIKÁJÁT MÉRŐ SOROK KIMONDOTTAN ÜRES KÖRNYEZETET ADNAK (F158-16).
 *
 * A feloldó MOST a libpq teljes sorrendjét követi, tehát a `PGDATABASE`/`PGUSER`/`PGSERVICE` is
 * dönthet. Ha ezek a sorok a futtató környezetét kapnák, a mérés a GAZDAGÉPET mérné, nem a kódot —
 * egy beállított `PGDATABASE` pirosra váltana regresszió nélkül (ez a `KUKA-344` hiba-osztálya).
 * A környezet-érzékeny ágakat a lenti Y csoport méri, kimondott környezettel.
 */
const PG_ENV_NELKUL = Object.freeze({});

/** A `string` TÍPUS közvetlenül, a mag feloldóján — amit a próba nem tud meghívni, azt hisszük (KUKA-207). */
const TYPES_STRING_OK = (v) => validateAgainstSchema({
  schema: { version: '1', fields: { t: { type: 'string', required: true, max_length: 100 } } },
  input: { t: v },
}).ok === true;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PW = 'proba-jelszo-2026';
const results = [];
let section = '';
function part(name) { section = name; console.log(`\n── ${name} ──`); }
function step(name, cond, detail) {
  const pass = !!cond;
  results.push({ section, name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
  return pass;
}

class Client {
  constructor(base) { this.base = base; this.cookie = null; }
  async call(method, path, body) {
    const headers = {};
    if (this.cookie) headers.Cookie = this.cookie;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(this.base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    const sc = res.headers.get('set-cookie');
    if (sc) this.cookie = sc.split(';')[0];
    const ct = res.headers.get('content-type') || '';
    return { status: res.status, body: ct.includes('application/json') ? await res.json() : await res.text() };
  }
  get(p) { return this.call('GET', p); }
  post(p, b) { return this.call('POST', p, b ?? {}); }
}

// ── A) F154-01 — A KÉRÉSKORLÁT NEM LEHET A TÁMADÁS ERŐSÍTŐJE ────────────────────────────────────
part('A) F154-01 — a kéréskorlát sora korlátos, a verdikt változatlan');

const MAX = 240;
const FLOOD = 60000;
{
  const take = makeRateLimiter({ windowMs: 60000, max: MAX });
  const t0 = Date.now();
  let last = null;
  for (let i = 0; i < FLOOD; i++) last = take('1.2.3.4', t0 + Math.floor(i / 1000));
  const ms = Date.now() - t0;

  // (a1) A TÉRIGÉNY: a megtartott sor a VERDIKTHEZ szükséges hosszon áll. A javítás kivételével ez
  // a szám 60 000 lenne — a régi alak MÉRT értéke.
  step('(a1) 60 000 kérés egy címről a sort `max + 1`-en tartja (régen: 60 000)',
    last.count <= MAX + 1, { count: last.count, keep: MAX + 1, ms });

  // (a2) AZ IDŐ: a régi alak MÉRT 28 987 ms-ot kért ugyanerre. A plafon nagyvonalú (5 s), mert ez
  // nem teljesítmény-próba: a KVADRATIKUS nagyságrendet zárja ki, nem a gépet méri.
  step('(a2) ugyanaz a 60 000 kérés 5 másodperc alatt lefut (régen MÉRVE: 28 987 ms)',
    ms < 5000, { ms, regi_mert_ms: 28987 });

  // (a3) A SZÁM IGAZAT MOND (KUKA-129): vágás után a `count` ALSÓ KORLÁT, és ezt a válasz kimondja.
  step('(a3) a vágott darabszám KIMONDVA alsó korlát (`capped: true`), nem néma',
    last.capped === true && last.allowed === false, { capped: last.capped, allowed: last.allowed });
}
{
  // (a4) A VERDIKT BETŰRE UGYANAZ. Ez az ELLENPÁR: a gyorsítás nem lehet a védelem elrontása —
  // egy „mindig engedünk" vagy „mindig tiltunk" alak az (a1)/(a2)-t is teljesítené (KUKA-120).
  const take = makeRateLimiter({ windowMs: 1000, max: 5 });
  const t = 10_000_000;
  const alatt = [0, 1, 2, 3, 4].map((i) => take('x', t + i).allowed);
  const felett = [5, 6, 7].map((i) => take('x', t + i).allowed);
  step('(a4) ELLENPÁR: a korlátig ENGED, utána TILT — a verdikt nem változott',
    alatt.every((v) => v === true) && felett.every((v) => v === false), { alatt, felett });

  // (a5) ÉS AZ ABLAK CSÚSZIK: a kiürült ablak után újra engedni KELL — különben a „javítás" egy
  // örök kizárás lenne (az a hiba, amit a KUKA-092 néven ismerünk: a zöld a rossz okból jön).
  step('(a5) ELLENPÁR: az ablak lejárta után ugyanaz a cím ÚJRA engedélyt kap',
    take('x', t + 5000).allowed === true, 'a csúszó ablak nem vált örök kizárássá');
}
{
  // (a6) A `capped` NEM mindig igaz: a korlát alatt a darabszám PONTOS. Ennek az ellenpárnak a
  // hiányában egy „capped: true mindig" alak is átmenne az (a3)-on.
  const take = makeRateLimiter({ windowMs: 60000, max: 240 });
  const v = take('tiszta', 5_000_000);
  step('(a6) ELLENPÁR: a korlát ALATT a darabszám PONTOS (`capped: false`)',
    v.capped === false && v.count === 1 && v.allowed === true, v);
}

// ── C/1) F154-03 — A FELOLDÓ KÖZVETLENÜL (a HATÁR mérése lentebb, élő HTTP-n) ───────────────────
part('C/1) F154-03 — a munkamenet-tár plafonja és tétlensége a feloldón');
{
  const st = makeSessionStore({ idleMs: 10 ** 9, maxSessions: 100, warn: () => {} });
  for (let i = 0; i < 500; i++) st.set('a' + i, { id: 'a' + i, subject_id: null }, 1_000_000 + i);
  void 0;
  step('(c1) 500 névtelen sor 100-as plafonon NEM nő 500-ra (régen: korlátlan)',
    st.size <= 100, { size: st.size, plafon: 100 });

  // AZ IDŐT MINDENHOL KIMONDJUK. A tár az F154-07 óta IDŐ-TUDATOS (`get`/`has` lejáratot mér), tehát
  // szimulált bélyegek mellett a valódi `Date.now()` MINDENT lejártnak látna — a próba így jó vagy
  // rossz okból lenne zöld, de nem azt mérné, amit állít (KUKA-127).
  const T2 = 2_000_100;
  const st2 = makeSessionStore({ idleMs: 10 ** 9, maxSessions: 10, warn: () => {} });
  for (let i = 0; i < 9; i++) st2.set('u' + i, { id: 'u' + i, subject_id: 'S' + i }, 1_000_000 + i);
  for (let i = 0; i < 40; i++) st2.set('n' + i, { id: 'n' + i, subject_id: null }, 2_000_000 + i);
  const belepett = [...Array(9).keys()].filter((i) => st2.has('u' + i, T2)).length;
  step('(c2) a NÉVTELENEK esnek ki ELŐBB — a 9 belépett mind megmaradt (KUKA-202)',
    belepett === 9, { belepett_megmaradt: belepett, size: st2.size, stat: st2.stats() });

  const st3 = makeSessionStore({ idleMs: 1000, maxSessions: 10 ** 6, warn: () => {} });
  st3.set('reg', { id: 'reg', subject_id: null }, 1_000_000);
  st3.sweep(1_002_000);
  step('(c3) a TÉTLENSÉGI idő is kiszorít — a munkamenet-süti nem örök érvényű',
    st3.has('reg', 1_002_000) === false, { stat: st3.stats() });

  // AZ ÉRINTÉS A LEJÁRAT ELŐTT TÖRTÉNIK — különben nem az aktív munkamenetet mérnénk, hanem az
  // F154-07 FELÉLESZTÉSÉT (azt az e2 méri, és ott a helyes válasz az, hogy NEM éled fel).
  const st4 = makeSessionStore({ idleMs: 1000, maxSessions: 10 ** 6, warn: () => {} });
  st4.set('elo', { id: 'elo', subject_id: null }, 1_000_000);
  st4.touch('elo', 1_000_800);                      // a korláton BELÜL
  st4.sweep(1_001_500);                             // 1_001_500 − 1_000_800 = 700 < 1000
  step('(c4) ELLENPÁR: az ÉRINTETT (aktív) munkamenet NEM esik ki',
    st4.has('elo', 1_001_500) === true, 'az „utoljára látva" bélyeg hat');

  let naplo = null;
  const st5 = makeSessionStore({ idleMs: 10 ** 9, maxSessions: 4, warn: (m) => { naplo = m; } });
  for (let i = 0; i < 20; i++) st5.set('s' + i, { id: 's' + i, subject_id: 'S' + i }, 1_000_000 + i);
  step('(c5) a BELÉPETT munkamenet kiszorítása NAPLÓBAN nevezett — nem néma kiléptetés',
    typeof naplo === 'string' && /kiléptetve/.test(naplo), naplo ? naplo.slice(0, 96) : null);

  step('(c6) a környezeti felülírás MŰKÖDIK, és az alapérték a deklarált (sessionLimits)',
    sessionLimits({ VS_APP_SESSION_MAX: '50', VS_APP_SESSION_IDLE_MS: '900' }).maxSessions === 50
    && sessionLimits({ VS_APP_SESSION_IDLE_MS: '900' }).idleMs === 900
    && sessionLimits({}).maxSessions === SESSION_LIMITS.max_sessions
    && sessionLimits({ VS_APP_SESSION_MAX: 'nemszam' }).maxSessions === SESSION_LIMITS.max_sessions,
    'a hibás érték az alapértékre esik, nem nullára');
}

// ── D) F154-05 + F154-06 — A NYELVI FELOLDÓ: A NYUGTA NEM HARDKÓDOLT, A q=0 KIZÁRÁS ────────────
part('D) F154-05 · F154-06 — a kért nyelv tényét nem hardkódoljuk, és a q=0 kizárás');
{
  // (d1) A FŐ LELET: a fejléc-úton a `matched` HARDKÓDOLT `true` volt. MÉRVE: `fr-FR` → `hu`, és a
  // válasz azt állította, hogy a KÉRT nyelvet adta.
  const fr = resolveLanguage({ acceptLanguage: 'fr-FR' });
  step('(d1) Accept-Language: fr-FR → hu, és a válasz KIMONDJA, hogy nem a kért nyelv (régen: matched=true)',
    fr.code === 'hu' && fr.matched === false, fr);

  // (d2) AZ ELLENPÁR, AMI A LELETET MEGMUTATTA: UGYANEZ a kérés a kifejezett úton HELYESEN felelt.
  // Egy kérdésre EGY válasz — a két út nem adhat különbözőt (KUKA-003).
  const frExplicit = resolveLanguage({ explicit: 'fr' });
  step('(d2) a KÉT ÚT ugyanarra a kérdésre ugyanazt feleli (fejléc vs kifejezett)',
    fr.matched === frExplicit.matched && fr.code === frExplicit.code,
    { fejlec: fr, kifejezett: frExplicit });

  // (d3) ELLENPÁR: a VALÓDI találat továbbra is találat — a javítás nem mindent hamisra állít.
  const de = resolveLanguage({ acceptLanguage: 'de-AT' });
  const en = resolveLanguage({ acceptLanguage: 'en-US,en;q=0.9' });
  step('(d3) ELLENPÁR: a valódi találat MARAD találat (de-AT → de · en-US → en, matched=true)',
    de.code === 'de' && de.matched === true && en.code === 'en' && en.matched === true,
    { de, en });

  // (d4) ELLENPÁR: a magyart KÉRŐ fejléc nem keverhető össze a magyarra VISSZAESŐVEL — pont ez a
  // kétértelműség szülte a leletet (KUKA-238).
  const hu = resolveLanguage({ acceptLanguage: 'hu-HU' });
  step('(d4) ELLENPÁR: a magyart KÉRŐ fejléc matched=true, a magyarra VISSZAESŐ matched=false',
    hu.code === 'hu' && hu.matched === true && fr.code === 'hu' && fr.matched === false,
    { kert_hu: hu, visszaesett: fr });

  // (d5) F154-06: a `q=0` az RFC 7231 §5.3.1 szerint NEM elfogadható, nem leghátsó preferencia.
  step('(d5) Accept-Language: de;q=0 → hu, NEM de (régen MÉRVE: de — a kizárt nyelvet adta)',
    parseAcceptLanguage('de;q=0') === 'hu', { kapott: parseAcceptLanguage('de;q=0') });
  step('(d6) Accept-Language: en;q=0 → hu, NEM en',
    parseAcceptLanguage('en;q=0') === 'hu', { kapott: parseAcceptLanguage('en;q=0') });

  // (d7) ELLENPÁR: a q=0 KIZÁRÁS nem söpri el a többi címkét — a súlyozás változatlanul működik.
  step('(d7) ELLENPÁR: `de;q=0, en;q=0.5` → en · `hu;q=0, en;q=0.1` → en — a súlyozás ép',
    parseAcceptLanguage('de;q=0, en;q=0.5') === 'en' && parseAcceptLanguage('hu;q=0, en;q=0.1') === 'en',
    { a: parseAcceptLanguage('de;q=0, en;q=0.5'), b: parseAcceptLanguage('hu;q=0, en;q=0.1') });

  // (d8) A RÉGI SZERZŐDÉS NEM TÖRT EL: a `parseAcceptLanguage` továbbra is KÓDOT ad (szöveget),
  // nem objektumot — a mai hívói érintetlenek (KUKA-130: a javítás ne legyen a következő lelet).
  step('(d8) a `parseAcceptLanguage` szerződése változatlan: szöveget ad, nem objektumot',
    typeof parseAcceptLanguage('de') === 'string' && parseAcceptLanguage('de') === 'de'
    && typeof pickFromAcceptLanguage('de').matched === 'boolean',
    { parse: parseAcceptLanguage('de'), pick: pickFromAcceptLanguage('de') });

  // (d9) ÜRES FEJLÉC: nincs kérés, tehát nincs TALÁLAT sem — de a kód az alapnyelv.
  step('(d9) üres fejléc → alapnyelv, és NEM állítja, hogy találat volt',
    pickFromAcceptLanguage('').code === 'hu' && pickFromAcceptLanguage('').matched === false,
    pickFromAcceptLanguage(''));
}

// ── E) A KÜLSŐ REVIEW (Codex, R154) HÁROM LELETE A SAJÁT JAVÍTÁSOMBAN ──────────────────────────
part('E) F154-07 · F154-08 · F154-09 — a külső review leletei, reprodukálva és javítva');
{
  // (e1) F154-07 — A LEJÁRT SORT AZ OLVASÁS FELÉLESZTETTE. MÉRVE a régi alakon: `get` VISSZAADTA a
  // 5 s-ig tétlen sort 1 s-os korlát mellett, és a `touch` után a söprés MEGHAGYTA.
  const st = makeSessionStore({ idleMs: 1000, maxSessions: 10 ** 6, warn: () => {} });
  st.set('s', { id: 's', subject_id: 'SUB' }, 1_000_000);
  const kesobb = 1_005_000;
  step('(e1) a LEJÁRT munkamenetet a `get` NEM adja vissza (régen MÉRVE: visszaadta)',
    st.get('s', kesobb) === undefined, { lejart_ido_ms: 5000, korlat_ms: 1000 });

  const st2 = makeSessionStore({ idleMs: 1000, maxSessions: 10 ** 6, warn: () => {} });
  st2.set('s', { id: 's', subject_id: 'SUB' }, 1_000_000);
  st2.touch('s', kesobb);           // a kérés-ciklus ezt teszi
  st2.sweep(kesobb);
  step('(e2) és a `touch` sem ÉLESZTI FEL (régen MÉRVE: feléledt, a korlát hatástalan volt)',
    st2.has('s', kesobb) === false, 'az ellopott süti nem újítható meg korlátlanul');

  // (e3) ELLENPÁR: a korlát ALATT tétlen sor MEGMARAD, és a `touch` MEGHOSSZABBÍTJA — különben a
  // „javítás" mindenkit kiléptetne (KUKA-130).
  const st3 = makeSessionStore({ idleMs: 10_000, maxSessions: 10 ** 6, warn: () => {} });
  st3.set('s', { id: 's', subject_id: 'SUB' }, 1_000_000);
  const elo = st3.get('s', 1_005_000) !== undefined;
  st3.touch('s', 1_009_000);
  const meg = st3.get('s', 1_015_000) !== undefined;   // 1_009_000 + 10_000 > 1_015_000
  step('(e3) ELLENPÁR: a korlát ALATT a sor MEGMARAD, és az érintés MEGHOSSZABBÍTJA',
    elo === true && meg === true, { korlat_alatt: elo, erintes_utan: meg });

  // (e4) F154-09 — A FRISSEN BESZÚRT SOR A SAJÁT BESZÚRÁSÁTÓL ESETT KI. MÉRVE a régi alakon: 37
  // belépett + 3 névtelen 40-es plafonon, és az ÚJ sor beszúrása MAGÁT is elvitte.
  const T = 1_200_000;
  const st4 = makeSessionStore({ idleMs: 10 ** 9, maxSessions: 40, warn: () => {} });
  for (let i = 0; i < 37; i++) st4.set('u' + i, { id: 'u' + i, subject_id: 'S' + i }, 1_000_000 + i);
  for (let i = 0; i < 3; i++) st4.set('a' + i, { id: 'a' + i, subject_id: null }, 1_100_000 + i);
  st4.set('UJ', { id: 'UJ', subject_id: null }, T);
  step('(e4) a FRISSEN beszúrt munkamenet MEGMARAD a plafon-söprésben (régen MÉRVE: kiesett)',
    st4.has('UJ', T) === true, { size: st4.size, stat: st4.stats() });

  // (e5) A GYÖKÉR-OK IS JAVÍTVA: a belépés munkamenete BELÉPETTEN születik, nem utólag kap alanyt —
  // különben a beszúrás pillanatában még névtelennek számít, és a söprés szemétnek veszi.
  const srvSrc = readFileSync(join(ROOT, 'v3app/server.mjs'), 'utf8');
  step('(e5) a belépés munkamenete BELÉPETTEN születik (`newSession(r.subject_id)`)',
    // A MINTA A TULAJDONSÁGRA ILLESZKEDIK, NEM AZ ARGUMENTUM-LISTÁRA (KUKA-239): a `pinToken`
    // hozzáadása nem változtat azon, hogy a munkamenet BELÉPETTEN születik.
    /newSession\(r\.subject_id\b/.test(srvSrc) && !/fresh\.subject_id = r\.subject_id/.test(srvSrc),
    'a beszúrás pillanatában már belépett — nem utólag kap alanyt');

  // (e6) F154-08 — A SZERVER-OLDALI FOLYTATÁST HORDOZÓ NÉVTELEN SOR VÉDETT. A tényt a KANONIKUS
  // otthona mondja meg, ezért a próba is ONNAN adja (nem bélyegből).
  const vedett = new Set(['meghivott']);
  const st5 = makeSessionStore({ idleMs: 10 ** 9, maxSessions: 10, warn: () => {}, protectedIds: () => vedett });
  st5.set('meghivott', { id: 'meghivott', subject_id: null }, 1_000_000);
  for (let i = 0; i < 40; i++) st5.set('f' + i, { id: 'f' + i, subject_id: null }, 1_100_000 + i);
  step('(e6) a FOLYTATÁST hordozó névtelen munkamenet TÚLÉLI a névtelen elárasztást',
    st5.has('meghivott', 1_200_000) === true, { size: st5.size, stat: st5.stats() });

  // (e7) ELLENPÁR: a folytatást NEM hordozó névtelen sor továbbra is ELŐBB esik ki — a védelem nem
  // tette korlátlanná a tárat.
  step('(e7) ELLENPÁR: a folytatást NEM hordozó névtelen sorok ESNEK ki (a tár korlátos maradt)',
    st5.size <= 10 && st5.stats().evicted_cap_anonymous > 0, st5.stats());

  // (e8) ÉS A BIZONYTALANSÁG NEM NÉMA: ha a védett lista NEM megállapítható (a tároló nem válaszol),
  // a kiszorítás lefut (a memória-korlát áll), de a naplóban KIMONDVA (KUKA-049).
  let naplo = '';
  const st6 = makeSessionStore({ idleMs: 10 ** 9, maxSessions: 4,
    warn: (m) => { naplo += m + '\n'; },
    protectedIds: () => { throw new Error('a tároló nem válaszol'); } });
  for (let i = 0; i < 12; i++) st6.set('x' + i, { id: 'x' + i, subject_id: null }, 1_000_000 + i);
  step('(e8) a NEM megállapítható védett lista NAPLÓBAN nevezett — nem néma',
    /NEM tudta megállapítani/.test(naplo) && st6.size <= 4,
    { size: st6.size, naplo: naplo.slice(0, 90) });

  // (e9) A VÉDETTSÉG NEM MENTESSÉG — ÉS EZ BIZTONSÁGI ÁLLÍTÁS. A védett listát a `pending_intent`
  // adja, abba viszont a `POST /api/invites/pending` HITELESÍTÉS NÉLKÜL ír: ha a védettség kivonna
  // a plafon alól, egy elárasztó MINDEN sorát védetté tehetné, és a memória-korlát megkerülhető
  // lenne — a védelem nyitná a kaput (KUKA-092). Ezért: minden sor védett ⇒ a plafon MÉGIS áll.
  const mind = new Set([...Array(12).keys()].map((i) => 'p' + i));
  const st7 = makeSessionStore({ idleMs: 10 ** 9, maxSessions: 4, warn: () => {}, protectedIds: () => mind });
  for (let i = 0; i < 12; i++) st7.set('p' + i, { id: 'p' + i, subject_id: null }, 1_000_000 + i);
  step('(e9) ha MINDEN sor „védett", a plafon MÉGIS áll — a védettség nem plafon-megkerülés',
    st7.size <= 4, { size: st7.size, plafon: 4, stat: st7.stats() });

  // (e10) ELLENPÁR a c2 leletére: a BELÉPETTEKBŐL csak a plafonig veszünk el, nem az alsó vízszintig.
  // 9 belépett + névtelen elárasztás 10-es plafonon: a 9 ember MIND megmarad.
  const st8 = makeSessionStore({ idleMs: 10 ** 9, maxSessions: 10, warn: () => {} });
  for (let i = 0; i < 9; i++) st8.set('u' + i, { id: 'u' + i, subject_id: 'S' + i }, 1_000_000 + i);
  for (let i = 0; i < 40; i++) st8.set('n' + i, { id: 'n' + i, subject_id: null }, 2_000_000 + i);
  step('(e10) a BELÉPETTEKBŐL csak a plafonig veszünk el — a hisztérézis nem léptet ki embert',
    [...Array(9).keys()].every((i) => st8.has('u' + i, 2_000_100)),
    { belepett_megmaradt: [...Array(9).keys()].filter((i) => st8.has('u' + i, 2_000_100)).length, stat: st8.stats() });
}

// ── B + C/2) A HATÁRON, ÉLŐ HTTP-N ─────────────────────────────────────────────────────────────
const DB = resolve(ROOT, 'var/tmp/v3app_r154_findings.sqlite');
try { rmSync(DB, { force: true }); rmSync(DB + '-wal', { force: true }); rmSync(DB + '-shm', { force: true }); } catch { /* nem volt */ }

const SESSION_CAP = 40;
process.env.VS_APP_SESSION_MAX = String(SESSION_CAP);
process.env.VS_APP_SESSION_IDLE_MS = String(10 ** 9);
let app = null;
try {
  app = await startServer({ port: 0, dbPath: DB });
  const base = `http://127.0.0.1:${app.server.address().port}`;

  part('B) F154-02 — a hibás százalék-escape NEVEZETT 400, nem 500');
  for (const p of ['/%', '/%zz', '/a%E0%A4%A']) {
    const r = await fetch(base + p);
    let b = null; try { b = await r.json(); } catch { b = null; }
    step(`(b1) GET ${p} → 400 \`path_malformed\` (régen MÉRVE: 500 internal_error)`,
      r.status === 400 && b && b.reason === 'path_malformed', { status: r.status, reason: b && b.reason });
  }
  {
    const ok = await fetch(base + '/index.html');
    const nf = await fetch(base + '/nincs-ilyen-lap.html');
    const tr = await fetch(base + '/..%2F..%2Fpackage.json');
    step('(b2) ELLENPÁR: a LÉTEZŐ lap változatlanul 200 — a javítás nem zárta be a kiszolgálást',
      ok.status === 200, { status: ok.status });
    step('(b3) ELLENPÁR: a NEM létező lap továbbra is 404 `not_found` — nem mosódott össze',
      nf.status === 404 && (await nf.json()).reason === 'not_found', { status: nf.status });
    step('(b4) ELLENPÁR: az ÚTVONAL-ÁTLÉPÉS továbbra is elutasítva (nem 200)',
      tr.status !== 200, { status: tr.status });
  }

  part('C/2) F154-03 a HATÁRON — a névtelen elárasztás NEM lépteti ki a belépettet');
  // A BELÉPETT FELHASZNÁLÓ. A levél a fejlesztői levél-fogadóba megy, valódi levél nem indul.
  const email = 'audit154@pelda.hu';
  const password = 'proba-jelszo-2026';
  const anna = new Client(base);
  await anna.post('/api/register', { email, password, lang: 'hu' });
  const S = dictFor('hu').SRV;
  const mails = (await anna.get('/dev/mailbox')).body.mails;
  const mail = mails.filter((x) => x.to === email && String(x.subject).startsWith(S.mailVerifySubject))[0];
  if (!mail) throw new Error('a megerősítő levél nem jött meg — a mérés alapsokasága nem áll fel');
  const link = new URL(mail.link);
  await anna.get(link.pathname + link.search);
  const be = await anna.post('/api/login', { email, password });
  if (!be.body || be.body.ok !== true) throw new Error(`a belépés nem sikerült: ${JSON.stringify(be.body).slice(0, 160)}`);

  const elotte = (await anna.get('/api/me')).body;
  step('(c7) alapsokaság: a felhasználó BE VAN LÉPVE (különben a mérés nem jelent semmit)',
    elotte && elotte.ok === true && elotte.subject_id, { subject_id: elotte && elotte.subject_id });

  // AZ ELÁRASZTÁS: süti nélküli kérések, a plafon tízszerese.
  const arasztas = SESSION_CAP * 10;
  for (let i = 0; i < arasztas; i++) await fetch(base + '/api/me');   // SÜTI NÉLKÜL
  // A MÉRÉS NEM TÁMASZKODHAT A TÁR BELSŐ FELSZÍNÉRE (KUKA-092, SAJÁT LELET a visszavétel-próbán):
  // az első alakom a `stats()`-ot a RÉSZLETBEN hívta, ezért a bekötés kivételekor a battéria
  // ELAKADT MÉRÉST (kilépési kód 2) jelzett — az pedig „a próba bukott el", nem „a rendszer hibás".
  // A `size` MINDEN alakon (sima `Map`-en is) létezik, tehát a KORLÁTOSSÁG mindig MÉRHETŐ.
  const statOf = () => (typeof app.sessions.stats === 'function' ? app.sessions.stats() : null);
  step(`(c8) ${arasztas} süti nélküli kérés után a tár a plafon ALATT áll (régen: ${arasztas} sor)`,
    app.sessions.size <= SESSION_CAP, { size: app.sessions.size, plafon: SESSION_CAP, stat: statOf() });

  const utana = (await anna.get('/api/me')).body;
  step('(c9) és a BELÉPETT felhasználó ettől NEM lett kiléptetve — ez a látott tulajdonság',
    utana && utana.ok === true && utana.subject_id === elotte.subject_id,
    { subject_id: utana && utana.subject_id, ok: utana && utana.ok });

  // A KISZORÍTÁS NEM NÉMA — és ez is MÉRT állítás: ha a tár nem ad számlálót, akkor a kiszorítás
  // megmagyarázhatatlan kiléptetéseket szülne, tehát a számláló HIÁNYA maga a hiba (nem elakadás).
  const st = statOf();
  step('(c10) a kiszorítás NEVEZETT, és a NÉVTELENEKET vitte (a belépett nem került sorra)',
    st !== null && st.evicted_cap_signed_in === 0,
    st === null ? 'a tár NEM ad kiszorítás-számlálót — a kiszorítás NÉMA volna' : st);

  // ── F) F154-10 — A VEZÉRLŐ-KARAKTER A HATÁRON AKAD EL, NEM A TÁROLÓBAN ──────────────────────
  part('F) F154-10 — a vezérlő-karakter a HATÁRON akad el, tárolótól függetlenül');
  {
    // A LELET, MÉRVE a régi alakon: `{"name":"A\u0000B"}` ÁTMENT a kapun, és onnantól a kimenet a
    // TÁROLÓTÓL függött — SQLite: 201 (a könyv létrejött `A\0B` névvel) · PostgreSQL 16.15: 400
    // `provision_failed`. Egy határ-szerződés, aminek a kimenete attól függ, melyik tároló fut,
    // nem szerződés.
    const ws = (name) => anna.call('POST', '/api/workspaces', { name, business: { tax_id: '12345678-1-42' } });
    const elotte = app.store.get('SELECT COUNT(*) AS n FROM book').n;
    const nul = await ws('A\u0000B');
    const nl = await ws('A\nB');
    const tab = await ws('A\tB');
    const utana = app.store.get('SELECT COUNT(*) AS n FROM book').n;
    step('(f1) a NULLA BÁJT a névben NEVEZETT 400, ÍRÁS NÉLKÜL (régen SQLite-on MÉRVE: 201)',
      nul.status === 400 && /vezérlő-karakter/.test(String(nul.body && nul.body.message || '')) && utana === elotte,
      { status: nul.status, message: String(nul.body && nul.body.message || '').slice(0, 60), konyv: `${elotte}→${utana}` });
    step('(f2) és a TÖBBI vezérlő is (sortörés · tabulátor) — a NÉV nem szabad szöveg',
      nl.status === 400 && tab.status === 400,
      { sortores: nl.status, tabulator: tab.status });

    // ELLENPÁR: a rendes név ÉS a nem-latin betű továbbra is MEGY — a szűkítés nem vágta le a
    // valódi tartalmat (KUKA-130 · és a nyelvi jegyzék bővül, tehát az ékezet/írásjel nem gyanús).
    const jo = await ws('Árvíztűrő Tükörfúrógép Kft. — 北京');
    step('(f3) ELLENPÁR: az ékezetes és NEM LATIN betűs név változatlanul MEGY',
      jo.status === 201, { status: jo.status });

    // ÉS A SZABAD SZÖVEG MÁS FAJTA: a `string` típus a sortörést ENGEDI (history_text 4000 karakter),
    // csak a nulla bájtot zárja — a szűkítés mezőfajtához kötött, nem mindenre kimondott.
    step('(f4) a SZABAD SZÖVEG típusa a sortörést ENGEDI, a nulla bájtot ZÁRJA — a határ a mező fajtája',
      TYPES_STRING_OK('A\nB') === true && TYPES_STRING_OK('A\u0000B') === false,
      'string: sortörés igen · nulla bájt nem');
  }


  // ── G) A KÜLSŐ REVIEW MÁSODIK KÖRE (Codex, R154) — HÁROM ÚJABB P2 A SAJÁT JAVÍTÁSOMBAN ────────
  part('G) F154-11 · F154-12 · F154-13 — a külső review MÁSODIK körének leletei');
  {
    // (g1) F154-11 — A KORLÁTOS TÁR ŐRZÉSE KORLÁTLAN KÖLTSÉGET VETT FEL. A védett lista a TELJES
    // `pending_intent` táblát beolvasta minden söprésnél, abba viszont a `POST /api/invites/pending`
    // HITELESÍTÉS NÉLKÜL ír. Ugyanaz a hibaalak, amit az F154-01-ben kivezettünk.
    let kerdezett = -1;
    const st1 = makeSessionStore({ idleMs: 10 ** 9, maxSessions: 4, warn: () => {},
      protectedIds: (c) => { kerdezett = c.length; return new Set(); } });
    for (let i = 0; i < 12; i++) st1.set('a' + i, { id: 'a' + i, subject_id: null }, 1_000_000 + i);
    step('(g1) a védett lista kérdése a JELÖLTEKRE szűkítve megy (nem a teljes táblára)',
      kerdezett >= 0 && kerdezett <= 4 + 1, { kerdezett_azonosito: kerdezett, plafon: 4 });

    // (g4) F154-13 — EGY NÉVTELEN LÁTOGATÓ KILÉPTETETT EGY BELÉPETT EMBERT. MÉRVE a régi alakon:
    // 4 belépett sor 4-es plafonon, majd EGY névtelen beszúrás → `evicted_cap_signed_in: 1`, és a
    // névtelen bent maradt.
    const st2 = makeSessionStore({ idleMs: 10 ** 9, maxSessions: 4, warn: () => {} });
    for (let i = 0; i < 4; i++) st2.set('u' + i, { id: 'u' + i, subject_id: 'S' + i }, 1_000_000 + i);
    st2.set('anon', { id: 'anon', subject_id: null }, 1_100_000);
    step('(g2) egy süti nélküli kérés NEM léptet ki belépett embert telt táron (régen MÉRVE: kiléptetett)',
      st2.stats().evicted_cap_signed_in === 0 && st2.has('anon', 1_100_000) === false,
      { belepett_kileptetve: st2.stats().evicted_cap_signed_in, friss_nevtelen_bent: st2.has('anon', 1_100_000) });
    step('(g3) ELLENPÁR: a négy belépett MIND megmaradt — a hiány a névtelen oldalán rendeződött',
      [0, 1, 2, 3].every((i) => st2.has('u' + i, 1_100_000)), { size: st2.size });

    // (g4) ELLENPÁR a `keep`-re: a BELÉPETTEN született friss sor viszont SÉRTHETETLEN marad
    // (az F154-09 garanciája nem veszett el) — a védelem a SAJÁT OSZTÁLYÁIG tart.
    const st3 = makeSessionStore({ idleMs: 10 ** 9, maxSessions: 4, warn: () => {} });
    for (let i = 0; i < 4; i++) st3.set('u' + i, { id: 'u' + i, subject_id: 'S' + i }, 1_000_000 + i);
    st3.set('belepo', { id: 'belepo', subject_id: 'UJ' }, 1_100_000);
    step('(g4) ELLENPÁR: a BELÉPETTEN született friss sor SÉRTHETETLEN (F154-09 nem veszett el)',
      st3.has('belepo', 1_100_000) === true, { size: st3.size, stat: st3.stats() });

    // (g5) F154-12 — AZ ÚJRA-BELÉPÉS IDEGEN EMBERT LÉPTETETT KI. A régi sorrend ELŐBB szúrt be,
    // és csak UTÁNA törölte a saját régi sorát: telt táron ez idegen belépett sort vitt el, a
    // saját törlés pedig mégis felszabadított egy helyet.
    const srvSrc2 = readFileSync(join(ROOT, 'v3app/server.mjs'), 'utf8');
    const loginBlock = srvSrc2.slice(srvSrc2.indexOf("'POST /api/login'"), srvSrc2.indexOf("'POST /api/logout'"));
    step('(g5) a belépés ELŐBB törli a saját régi sorát, AZTÁN szúr be (a sorrend a kódban áll)',
      loginBlock.indexOf('sessions.delete(session.id)') < loginBlock.indexOf('newSession(r.subject_id')
      && loginBlock.includes('sessions.delete(session.id)'),
      'a rotáció nem szorít ki idegen munkamenetet');

    /**
     * (g7) ELLENPÁR ELŐSZÖR, MÍG VAN HELY: a FOLYTATÁST HORDOZÓ sor túléli az ÁLLAPOT NÉLKÜLI
     * kérések nyomását — és a takarítás nem viszi el a sorát (KUKA-297 · KUKA-315 szándéka).
     *
     * A SORRENDET A TIZEDIK KÖR LELETE ÍRTA ÁT (F154-42): a mérés korábban a 120-as elárasztás UTÁN
     * futott, tehát TELT, csupa védett sorral teli táron — ott viszont ma (helyesen) a friss, semmit
     * nem hordozó sor esik ki ELSŐKÉNT, és a jövevény nevezetten elutasítást kap. A két állítás tehát
     * KÉT helyzet: itt a hely VAN, a `g8`-ban nincs.
     */
    const sorok = () => app.store.get('SELECT COUNT(*) AS n FROM pending_intent').n;
    const elo = new Client(base);
    await elo.get('/api/me');
    const eloValasz = await elo.post('/api/invites/pending', { token: 'elo-folytatas-154' });
    for (let i = 0; i < 10; i++) await fetch(base + '/api/me');          // ÁLLAPOT NÉLKÜLI nyomás
    const sajat = app.store.get("SELECT session_id FROM pending_intent WHERE invite_token = 'elo-folytatas-154'");
    step('(g7) ELLENPÁR: a folytatást hordozó sor túléli az állapot nélküli kéréseket — és a takarítás nem viszi el',
      eloValasz.status === 200 && Boolean(sajat) && app.sessions.has(String(sajat.session_id)) === true,
      { irasa: eloValasz.status, sor_megvan: Boolean(sajat), munkamenet_el: sajat ? app.sessions.has(String(sajat.session_id)) : null });

    // (g6) F154-11 második fele — AZ ÁRVA SOR TAKARÍTÁSA, élő HTTP-n, HITELESÍTÉS NÉLKÜL.
    const elotte = sorok();
    for (let i = 0; i < 120; i++) {
      await fetch(base + '/api/invites/pending', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'arasztas-' + i }) });
    }
    const utana = sorok();
    step('(g6) 120 HITELESÍTÉS NÉLKÜLI kérés után a munkamenethez kötött tábla a tárral együtt KORLÁTOS',
      utana <= SESSION_CAP + elotte + 1, { sorok: `${elotte}→${utana}`, munkamenet_plafon: SESSION_CAP, tar: app.sessions.size });

    /**
     * (g8) F154-42 — TELT, CSUPA VÉDETT TÁRON A JÖVEVÉNY KAP NEVEZETT ELUTASÍTÁST, és a mÁR MEGLÉVŐ
     * folytatások MEGMARADNAK. A LELET (külső review, Codex, tizedik kör): korábban a friss, SEMMIT
     * nem hordozó sor bent maradt, és helyette KÉT folytatást hordozó sor esett ki — vagyis egy
     * látogató, aki semmit nem tett, mások állapotát törölte.
     */
    const vedettElotte = sorok();
    const jovevenyValasz = await fetch(base + '/api/invites/pending', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'jovevény-telt-taron' }) });
    const vedettUtana = sorok();
    step('(g8) telt, csupa VÉDETT táron a jövevény NEVEZETTEN elutasítva — és EGYETLEN meglévő folytatás sem esett ki (RÉGEN: 2 folytatás elveszett, a friss üres sor maradt)',
      jovevenyValasz.status === 503 && vedettUtana >= vedettElotte - 1,
      { status: jovevenyValasz.status, sorok: `${vedettElotte}→${vedettUtana}` });
  }

  // ── H) F154-14 — A SAJÁT ISC-02 JAVÍTÁSOM ELTÖRTE A SEGÉD-CHATET ───────────────────────────────
  part('H) F154-14 — a vezérlő-karakter tiltása NEM teheti küldhetetlenné a jogos kérdést');
  {
    // A LELET (külső review, Codex): az ISC-02 tiltását a `nonempty_string`-re tettem, a `question`
    // mező pedig az volt — MÉRVE: a `<textarea>`-ba ENTERREL beírt több soros kérdés HTTP 400
    // `invalid_type`-ot kapott. A felületen felajánlott szerkesztő tett küldhetetlenné egy jogos
    // kérdést. A kockázatot a saját kommentemben MEG IS NEVEZTEM (KUKA-130), aztán elkövettem.
    const ask = (question) => anna.post('/api/assistant/ask', { question, lang: 'hu' });
    const tobbSoros = await ask('Hogyan hívok meg valakit?\nÉs ha nem fogadja el?');
    const tabos = await ask('Hogyan\thívok meg valakit?');
    step('(h1) a TÖBB SOROS kérdés elmegy (régen MÉRVE: 400 invalid_type)',
      tobbSoros.status === 200, { status: tobbSoros.status, reason: tobbSoros.body && tobbSoros.body.reason });
    step('(h2) a tabulátoros kérdés is elmegy — a szabad szöveg szabad szöveg',
      tabos.status === 200, { status: tabos.status });

    // A PÁROSÍTÁS MÉRVE, NEM FELTÉVE (KUKA-207 · KUKA-237): a mező TÍPUSA és a felületen felajánlott
    // SZERKESZTŐ együtt dönti el, mi küldhető. Ha a lap `<textarea>`-t ad, a típus nem lehet
    // azonosító-fajta — ezt a próba a KÉT FÁJLBÓL olvassa össze, nem a jóindulatból.
    const chatSrc = readFileSync(join(ROOT, 'v3app/public/chat.mjs'), 'utf8');
    const schemaSrc = readFileSync(join(ROOT, 'v3app/httpSchema.mjs'), 'utf8');
    const textarea = /<textarea[^>]*name="question"/.test(chatSrc);
    const kerdesTipus = (/question: frozen\(\{ type: '([a-z_]+)'/.exec(schemaSrc) || [])[1] || null;
    step('(h3) a lap `<textarea>`-t ad a kérdéshez, ÉS a mező típusa szabad szöveg — a kettő PÁR',
      textarea === true && kerdesTipus === 'nonempty_text',
      { textarea, kerdes_tipusa: kerdesTipus });

    // ELLENPÁROK: a szűkítés NEM tűnt el, csak a mező fajtájához kötött.
    const nullas = await ask('Hogyan\u0000hívok');
    const ures = await ask('   ');
    step('(h4) ELLENPÁR: a NULLA BÁJT a kérdésben is TILOS — azt egyetlen tároló sem tartja',
      nullas.status === 400 && /nulla bájt/.test(String(nullas.body && nullas.body.message || '')),
      { status: nullas.status, message: String(nullas.body && nullas.body.message || '').slice(0, 40) });
    step('(h5) ELLENPÁR: az ÜRES kérdés TILOS marad',
      ures.status === 400, { status: ures.status, reason: ures.body && ures.body.reason });
    const nevSortores = await anna.post('/api/workspaces', { name: 'A\nB', business: { tax_id: '12345678-1-42' } });
    step('(h6) ELLENPÁR: a NÉV mezőben a sortörés TOVÁBBRA IS tilos — a szűkítés mezőfajtához kötött',
      nevSortores.status === 400 && /vezérlő-karakter/.test(String(nevSortores.body && nevSortores.body.message || '')),
      { status: nevSortores.status, message: String(nevSortores.body && nevSortores.body.message || '').slice(0, 40) });
  }

  // ── I) A KÜLSŐ REVIEW HARMADIK KÖRE (Codex, R154) — EGY P1 ÉS KÉT P2 ──────────────────────────
  part('I) F154-15 · F154-16 · F154-17 — a külső review HARMADIK körének leletei');
  {
    // (i1) F154-15 (P2) — A NULLA BÁJT TILALMA KÉT TÍPUSON ÁLLT, AZ E-MAIL SAJÁT ELLENŐRZŐJÉN NEM.
    // MÉRVE a régi alakon: a `POST /api/register {"email":"a\u0000@b.test"}` törzsre a
    // `validateRequest` `ok: true`-t adott — tehát pont az a tároló-eltérés maradt nyitva, aminek a
    // megszüntetése az ISC-02 CÉLJA volt.
    const reg = (email) => validateRequest({ key: 'POST /api/register', body: { email, password: 'proba-jelszo-2026', lang: 'hu' } });
    step('(i1) a NULLA BÁJT az E-MAIL mezőn is elakad (régen MÉRVE: ok: true)',
      reg('a\u0000@b.test').ok === false, { ok: reg('a\u0000@b.test').ok, error: reg('a\u0000@b.test').error });
    step('(i2) ELLENPÁR: a rendes e-mail cím változatlanul átmegy',
      reg('anna@pelda.hu').ok === true, { ok: reg('anna@pelda.hu').ok });

    // A SZABÁLY EGY OTTHONBAN: mind a NÉGY szöveges típus ugyanazt a nulla bájt-tilalmat futtatja.
    const tip = (type, v) => validateAgainstSchema({
      schema: { version: '1', fields: { t: { type, required: true, max_length: 200 } } }, input: { t: v } }).ok;
    step('(i3) a nulla bájt MIND A NÉGY szöveges típuson tilos — a szabály egy otthonban áll',
      tip('string', 'a\u0000b') === false && tip('nonempty_string', 'a\u0000b') === false
      && tip('nonempty_text', 'a\u0000b') === false && tip('email_address', 'a\u0000@b.test') === false,
      { string: tip('string', 'a\u0000b'), nonempty_string: tip('nonempty_string', 'a\u0000b'),
        nonempty_text: tip('nonempty_text', 'a\u0000b'), email_address: tip('email_address', 'a\u0000@b.test') });

    // (i4) F154-17 (P2) — A TELJES TÉRKÉP RENDEZÉSE ELUTASÍTOTT NÉVTELEN BESZÚRÁSNÁL.
    // MÉRVE a régi alakon 20 000 belépett sor mellett: 100 süti nélküli beszúrás 754 ms.
    //
    // A MÉRCE SKÁLA-FÜGGETLEN, NEM GÉPSEBESSÉG (F158-03, külső review, Codex, P2). Az első alakom
    // `ms < 200`-at kért: ez a GÉP sebességét méri, nem a rövidre zárást — a reviewer gépén a helyes
    // viselkedés 219 ms-ot kapott, és a lánc PIROS lett regresszió NÉLKÜL. Ugyanaz a hiba-osztály,
    // amit a söprés türelménél már egyszer kijavítottunk (KUKA-045: az őr ne egy kézi számon álljon).
    // A VALÓDI állítás: a költség NEM NŐ a tár méretével. Ezért KÉT méretet mérünk, és az ARÁNYT
    // kötjük meg; a nagyvonalú absztrakt plafon csak a végtelen hurkot fogja meg.
    const mer = (meret) => {
      const st = makeSessionStore({ idleMs: 10 ** 9, maxSessions: meret, warn: () => {} });
      for (let i = 0; i < meret; i++) st.set('u' + i, { id: 'u' + i, subject_id: 'S' + i }, 1_000_000 + i);
      const t = Date.now();
      for (let i = 0; i < 100; i++) st.set('anon' + i, { id: 'anon' + i, subject_id: null }, 2_000_000 + i);
      return { st, ms: Date.now() - t };
    };
    const kicsi = mer(2000);
    const { st: nagy, ms } = mer(20000);
    // A TŰRÉS KIMONDVA: a tízszeres tárméret legfeljebb NÉGYSZERES időt hozhat (a konstans út
    // mérési zaját a +50 ms fedi) — a régi, rendező alak ennél nagyságrenddel többet adott
    // (MÉRVE a régi alakon: 754 ms 20 000 sor mellett).
    const hatar = Math.max(kicsi.ms * 4, kicsi.ms + 50);
    step('(i4) a süti nélküli beszúrás költsége NEM nő a tár méretével: tízszeres tár, legfeljebb négyszeres idő',
      ms <= hatar && ms < 5000, { kis_tar_ms: kicsi.ms, nagy_tar_ms: ms, hatar, regi_mert_ms: 754 });
    step('(i5) ELLENPÁR: a verdikt nem változott — a 20 000 belépett sor MIND megmaradt',
      [0, 9999, 19999].every((i) => nagy.has('u' + i, 2_000_100)) && nagy.stats().evicted_cap_signed_in === 0,
      { size: nagy.size, stat: nagy.stats() });

    // (i6) A SZÁMLÁLÓ HELYESSÉGE. A rövidre zárás O(1) döntése a névtelen sorok SZÁMÁN áll; ha a
    // számláló elcsúszik, a döntés csendben rosszra fordul. Ezért VEGYES sorozat után a számlálót
    // ÖSSZEVETJÜK a tényleges tartalommal (KUKA-207: a próba hívja meg, ne higgye el).
    const vegyes = makeSessionStore({ idleMs: 10 ** 9, maxSessions: 50, warn: () => {} });
    const ids = [];
    for (let i = 0; i < 20; i++) { vegyes.set('u' + i, { id: 'u' + i, subject_id: 'S' + i }, 1_000_000 + i); ids.push(['u' + i, false]); }
    for (let i = 0; i < 40; i++) { vegyes.set('a' + i, { id: 'a' + i, subject_id: null }, 1_100_000 + i); ids.push(['a' + i, true]); }
    vegyes.delete('a0'); vegyes.delete('u0');
    vegyes.set('a5', { id: 'a5', subject_id: null }, 1_200_000);
    const T = 1_200_000;
    const tenyleges = ids.filter(([id, anon]) => anon && vegyes.has(id, T)).length;
    step('(i6) a névtelen-számláló EGYEZIK a tényleges tartalommal vegyes sorozat után is',
      vegyes.stats().anonymous === tenyleges,
      { szamlalo: vegyes.stats().anonymous, tenyleges, size: vegyes.size });

    // (i7) F154-16 (P1) — A KIESETT FRISS MUNKAMENETTEL IS LEFUTOTT AZ ÁLLAPOTÍRÓ KEZELŐ.
    // MÉRVE a régi alakon: 30 süti nélküli állapotíró kérés → 30 ÁRVA adatbázis-sor, és az
    // `onEvicted` már LEFUTOTT, mielőtt a sor megszületett.
    //
    // A mérés SAJÁT szervert kér, mert csupa BELÉPETT sorral teli tár kell hozzá.
    const DB2 = resolve(ROOT, 'var/tmp/v3app_r154_i7.sqlite');
    try { rmSync(DB2, { force: true }); rmSync(DB2 + '-wal', { force: true }); rmSync(DB2 + '-shm', { force: true }); } catch { /* nem volt */ }
    const elozoMax = process.env.VS_APP_SESSION_MAX;
    process.env.VS_APP_SESSION_MAX = '4';
    const tele = await startServer({ port: 0, dbPath: DB2 });
    try {
      const b2 = `http://127.0.0.1:${tele.server.address().port}`;
      for (let i = 0; i < 4; i++) {
        const c = new Client(b2);
        await c.post('/api/register', { email: `tele${i}@pelda.hu`, password: PW, lang: 'hu' });
        const m = (await c.get('/dev/mailbox')).body.mails.filter((x) => x.to === `tele${i}@pelda.hu`)[0];
        const l = new URL(m.link);
        await c.get(l.pathname + l.search);
        await c.post('/api/login', { email: `tele${i}@pelda.hu`, password: PW });
      }
      const sorokOf = () => tele.store.get('SELECT COUNT(*) AS n FROM pending_intent').n;
      const kodok = {};
      for (let i = 0; i < 30; i++) {
        const r = await fetch(b2 + '/api/invites/pending', { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'arva-' + i }) });
        kodok[r.status] = (kodok[r.status] || 0) + 1;
      }
      const arvak = tele.store.all('SELECT session_id FROM pending_intent')
        .filter((r) => !tele.sessions.has(String(r.session_id))).length;
      // A MÉRT TULAJDONSÁG: telt táron az állapotíró kérés NEM hagy ÁRVA sort. A mechanizmus az
      // F154-21/F154-22 óta MÁS (a kiszolgálás idejére VÉDETT munkamenet a `503 at_capacity` kapu
      // helyett), a TULAJDONSÁG viszont ugyanaz — és az számít (KUKA-216: a verdikt a mérthez
      // szóljon, ne a megvalósításhoz).
      step('(i7) telt táron az ÁLLAPOTÍRÓ kérés NEM hagy ÁRVA sort (régen MÉRVE: 30 árva)',
        arvak === 0, { kodok, arva_sor: arvak, pending_intent: sorokOf() });
      const statikus = await fetch(b2 + '/index.html');
      step('(i8) ELLENPÁR: a statikus lap telt táron is kimegy — ahhoz nem kell munkamenet',
        statikus.status === 200, { status: statikus.status });

      // ── F154-22: EGYETLEN VÉGPONT SEM ZÁRÓDIK EL A PLAFON MIATT ─────────────────────────────
      // A LELET (külső review, Codex, P2): az átfogó `503` a `GET /api/verify`-t is elzárta, ami
      // munkamenetet NEM is használ (a saját egyszeri tokenje hitelesíti). MÉRVE: csupa belépett
      // sorral teli táron a megerősítő levél hivatkozása 503-at kapott — a felhasználó nem tudta
      // megerősíteni a fiókját, és a token közben lejárhat.
      const ver = await fetch(b2 + '/api/verify?token=nemletezo&lang=hu');
      const reg = await fetch(b2 + '/api/register', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'teltvolt@pelda.hu', password: PW, lang: 'hu' }) });
      step('(i9) telt táron a MEGERŐSÍTŐ hivatkozás NEM záródik el (régen MÉRVE: 503 at_capacity)',
        ver.status !== 503, { status: ver.status });
      step('(i10) és a REGISZTRÁCIÓ sem — a plafon nem zár el végpontot',
        reg.status !== 503, { status: reg.status });
      step('(i11) ELLENPÁR: és közben BELÉPETT munkamenetet sem léptettünk ki',
        tele.sessions.stats().evicted_cap_signed_in === 0, tele.sessions.stats());

      // ── F154-21: IDŐ-ELLENŐRZÉS / IDŐ-HASZNÁLAT (TOCTOU) A TÖRZS OLVASÁSA KÖZBEN ────────────
      // A LELET (külső review, Codex, P1): a felvétel ellenőrzése EGYSZERI volt, a kérés viszont
      // `await readBody`-n megszakad — és közben befutó kérések kiszorították a munkamenetet.
      // MÉRVE: a lassú, darabolt POST 200-at adott, és ÁRVA sort hagyott.
      const arvaElotte = tele.store.all('SELECT session_id FROM pending_intent')
        .filter((r) => !tele.sessions.has(String(r.session_id))).length;
      const port2 = tele.server.address().port;
      const lassu = await new Promise((resolve) => {
        const rq = httpReq({ host: '127.0.0.1', port: port2, path: '/api/invites/pending', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' } }, (res) => {
          let b = ''; res.on('data', (c) => { b += c; }); res.on('end', () => resolve({ status: res.statusCode }));
        });
        rq.on('error', () => resolve({ status: 0 }));
        rq.write('{"token":"toctou-');
        setTimeout(async () => {
          await fetch(b2 + '/api/me'); await fetch(b2 + '/api/me'); await fetch(b2 + '/api/me');
          rq.end('proba"}');
        }, 150);
      });
      const arvaUtana = tele.store.all('SELECT session_id FROM pending_intent')
        .filter((r) => !tele.sessions.has(String(r.session_id))).length;
      step('(i12) a LASSÚ, darabolt POST sem hagy ÁRVA sort — a munkamenet a kiszolgálás idejére VÉDETT',
        arvaUtana === arvaElotte, { status: lassu.status, arva_elotte: arvaElotte, arva_utana: arvaUtana });

      /**
       * ELLENPÁR: A PIN ELENGED. Egy elfelejtett pin csendben elrontaná a plafont — a sor ÖRÖKRE
       * védett maradna, és a tár kérésenként nőne. Ezt 50 kéréssel mérjük: ha a pin szivárogna, a
       * tár ~50-re nőne.
       *
       * ÉS AMIT A MÉRÉS KIMOND: a plafon a KÖVETKEZŐ beszúrásnál érvényesül, ezért a tár ÁTMENETILEG
       * egy sorral túllóghat (a most kiszolgált kérés sora, amíg új kérés nem jön). Ez a pin
       * bekötött következménye, és korlátos — nem „majdnem jó", hanem kimondott tűrés.
       */
      for (let i = 0; i < 50; i++) await fetch(b2 + '/api/me');
      step('(i13) ELLENPÁR: a PIN ELENGED — 50 kérés után a tár a plafon + 1 alatt marad (szivárgó pin esetén ~50 lenne)',
        tele.sessions.size <= 4 + 1, { size: tele.sessions.size, plafon: 4, tures: '+1 az épp kiszolgált sor' });
    } finally {
      await new Promise((r) => tele.server.close(r));
      if (elozoMax === undefined) delete process.env.VS_APP_SESSION_MAX; else process.env.VS_APP_SESSION_MAX = elozoMax;
    }
  }

  // ── J) F154-21 · F154-22 — A KISZOLGÁLÁS IDEJÉRE VÉDETT MUNKAMENET ────────────────────────────
  //
  // SAJÁT SERVER, SAJÁT PLAFON. Az első alakom a meglévő (4-es plafonú) szerveren mérte a TOCTOU-t,
  // és a PIN KIVÉTELÉVEL IS ZÖLD MARADT — mert a 4-es plafon és a négy belépett sor mellett a
  // párhuzamos kérések nem gyakoroltak elég szorítást. Vagyis a próba JÓ OKBÓL volt zöld, de nem
  // azt mérte, amit állított (KUKA-293 · KUKA-127). Itt a feltételt KIMONDOTTAN előállítjuk:
  // plafon = 2, és a tárat KÉT BELÉPETT sor tölti meg.
  part('J) F154-21 · F154-22 — a kiszolgálás idejére VÉDETT munkamenet (saját plafon: 2)');
  {
    const DB3 = resolve(ROOT, 'var/tmp/v3app_r154_j.sqlite');
    try { rmSync(DB3, { force: true }); rmSync(DB3 + '-wal', { force: true }); rmSync(DB3 + '-shm', { force: true }); } catch { /* nem volt */ }
    const elozo = process.env.VS_APP_SESSION_MAX;
    process.env.VS_APP_SESSION_MAX = '2';
    const kis = await startServer({ port: 0, dbPath: DB3 });
    try {
      const b3 = `http://127.0.0.1:${kis.server.address().port}`;
      for (let i = 0; i < 2; i++) {
        const c = new Client(b3);
        await c.post('/api/register', { email: `j${i}@pelda.hu`, password: PW, lang: 'hu' });
        const m = (await c.get('/dev/mailbox')).body.mails.filter((x) => x.to === `j${i}@pelda.hu`)[0];
        const l = new URL(m.link);
        await c.get(l.pathname + l.search);
        await c.post('/api/login', { email: `j${i}@pelda.hu`, password: PW });
      }
      step('(j1) alapsokaság: a tár CSUPA BELÉPETT sorral tele (különben a mérés nem jelent semmit)',
        kis.sessions.stats().anonymous === 0 && kis.sessions.size >= 2,
        { size: kis.sessions.size, nevtelen: kis.sessions.stats().anonymous, plafon: 2 });

      const arvaOf = () => kis.store.all('SELECT session_id FROM pending_intent')
        .filter((r) => !kis.sessions.has(String(r.session_id))).length;
      const elotte = arvaOf();
      const port3 = kis.server.address().port;
      const lassu = await new Promise((resolve2) => {
        const rq = httpReq({ host: '127.0.0.1', port: port3, path: '/api/invites/pending', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' } }, (res) => {
          let b = ''; res.on('data', (c) => { b += c; }); res.on('end', () => resolve2({ status: res.statusCode }));
        });
        rq.on('error', () => resolve2({ status: 0 }));
        rq.write('{"token":"toctou-');
        setTimeout(async () => {
          await fetch(b3 + '/api/me'); await fetch(b3 + '/api/me'); await fetch(b3 + '/api/me');
          rq.end('proba"}');
        }, 150);
      });
      step('(j2) a LASSÚ, darabolt POST NEM hagy ÁRVA sort (régen MÉRVE: 1 árva — a sor kiesett a törzs olvasása közben)',
        arvaOf() === elotte, { status: lassu.status, arva_elotte: elotte, arva_utana: arvaOf() });

      const ver = await fetch(b3 + '/api/verify?token=nemletezo&lang=hu');
      step('(j3) telt táron a MEGERŐSÍTŐ hivatkozás NEM záródik el (régen MÉRVE: 503 at_capacity)',
        ver.status !== 503, { status: ver.status });
      step('(j4) ELLENPÁR: és közben BELÉPETT munkamenetet sem léptettünk ki',
        kis.sessions.stats().evicted_cap_signed_in === 0, kis.sessions.stats());

      // ELLENPÁR: A PIN ELENGED. Szivárgó pin esetén a tár kérésenként nőne — 50 kérés után ~50 lenne.
      // ÉS KIMONDVA: a plafon a KÖVETKEZŐ beszúrásnál érvényesül, ezért egy sorral túllóghat.
      for (let i = 0; i < 50; i++) await fetch(b3 + '/api/me');
      step('(j5) ELLENPÁR: a PIN ELENGED — 50 kérés után a tár a plafon + 1 alatt marad (szivárgó pin: ~50)',
        kis.sessions.size <= 2 + 1, { size: kis.sessions.size, plafon: 2, tures: '+1 az épp kiszolgált sor' });
    } finally {
      await new Promise((r) => kis.server.close(r));
      if (elozo === undefined) delete process.env.VS_APP_SESSION_MAX; else process.env.VS_APP_SESSION_MAX = elozo;
    }
  }

  // ── K) F154-24 — AZ ÁTIRAT HELYE EGY FELOLDÓBÓL (az átadást blokkoló hiba) ──────────────
  // MI VOLT: a tartalom nélküli fogyasztás-leltár ÁTADÁSI kötelezettség (CLAUDE.md 1. szakasz), és az
  // exportáló a projekt-könyvtárat BEÉGETVE kereste (`-home-user`), miközben a mérő ugyanazt a tényt
  // végignézéssel oldja fel. MÉRVE: a mérő megtalálta és 315 hívást olvasott be ugyanabból az átiratból,
  // amire az export `NINCS ÁTIRAT`-tal elhasalt — vagyis EGY tény KÉT helyen élt (KUKA-003 · KUKA-039).
  part('K) F154-24 — az átirat helyét EGY feloldó adja (a tartalom nélküli leltár az ÁTADÁS kapuja)');
  {
    const tmp = mkdtempSync(join(tmpdir(), 'vs-fgy-r154-'));
    try {
      const proj = join(tmp, '-valami-mas-projekt-nev');
      mkdirSync(proj, { recursive: true });
      const sess = 'ffffffff-0000-4000-8000-000000000001';
      writeFileSync(join(proj, `${sess}.jsonl`), '{"type":"assistant"}\n');
      const got = transcriptsOf(tmp, sess).filter((f) => f.kind === 'main');
      step('(k1) a feloldó MINDEN projekt-könyvtárat végignéz — nem csak a `-home-user`-t (MÉRVE: ez buktatta el az exportot)',
        got.length === 1 && got[0].path.startsWith(proj + '/'), { talalat: got.length, konyvtar: '-valami-mas-projekt-nev' });

      const expSrc = readFileSync(join(ROOT, 'tools/v3_fogyasztas_export.mjs'), 'utf8');
      const hasznalja = /transcriptsOf\(projectsDir, session\)/.test(expSrc);
      const sajatUt = /join\([^)]*-home-user/.test(expSrc);
      step('(k2) az export a KÖZÖS feloldót hívja, és nem rak össze saját projekt-utat',
        hasznalja && !sajatUt, { hasznalja, sajat_ut: sajatUt });
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  }

  // ── L) F154-25…F154-28 — AZ ÖTÖDIK KÜLSŐ KÖR: A PIN NÉGY ÁRA ──────────────────────
  //
  // MIND A NÉGY LELET AZ ELŐZŐ KÖRBEN BEVEZETETT PIN-MECHANIZMUSRA MUTAT (F154-21/22). Nem új
  // terület: UGYANAZ a munkamenet-tár, és ez a csomagban a hetedik kör ugyanitt — a GYÖKÉR-OKOT
  // (minden süti nélküli kérés szerver-oldali sort nyit) a lefedettségi lap nevezi meg, és a
  // átalakítását döntésre tettem fel, nem egyoldalúan.
  part('L) F154-25…F154-28 — a pin négy ára (ötödik Codex-kör)');
  {
    const t0 = 1_000_000;

    // (l1) F154-25 (P1): a pin a PLAFON alól is kivette a sort, az ELENGEDÉS viszont nem söpört.
    const st = makeSessionStore({ idleMs: 600_000, maxSessions: 2, warn: () => {} });
    st.set('b1', { id: 'b1', subject_id: 'u1' }, t0);
    st.set('b2', { id: 'b2', subject_id: 'u2' }, t0);
    const jelek = [];
    for (let i = 0; i < 10; i++) {
      const jel = Symbol(`kérés-${i}`);
      jelek.push(jel);
      st.set(`n${i}`, { id: `n${i}`, subject_id: null }, t0 + i);   // a kérés-ciklus ELŐBB szúr be…
      st.pin(`n${i}`, jel);                                         // … és CSAK UTÁNA pinel (F154-29)
    }
    const csucs = st.size;
    for (const jel of jelek) st.unpinAll(jel);
    step('(l1) 10 ÁTFEDŐ kérés a plafont KÖZBEN SEM lépi túl (RÉGEN MÉRVE: 12 sor, közben és utána is)',
      csucs <= 2 && st.size <= 2, { csucs_kozben: csucs, utana: st.size, plafon: 2 });
    step('(l2) ELLENPÁR: és a két BELÉPETT sor megmaradt — a takarítás nem rájuk száll',
      st.stats().evicted_cap_signed_in === 0 && st.has('b1', t0 + 100) && st.has('b2', t0 + 100),
      { b1: st.has('b1', t0 + 100), b2: st.has('b2', t0 + 100), kileptetve: st.stats().evicted_cap_signed_in });

    // (l3) F154-26 (P2): a SIKERTELEN takarítás azonosítói várólistán maradnak.
    let tarolo_hiba = true;
    const leadva = [];
    const st2 = makeSessionStore({ idleMs: 600_000, maxSessions: 1, warn: () => {},
      onEvicted: (ids) => { if (tarolo_hiba) throw new Error('a tároló nem elérhető'); leadva.push(...ids); } });
    st2.set('x1', { id: 'x1', subject_id: null }, t0);
    st2.set('x2', { id: 'x2', subject_id: null }, t0 + 1);     // ez kiszorítja x1-et → onEvicted DOB
    const varolista = st2.stats().cleanup_pending;
    tarolo_hiba = false;
    st2.set('x3', { id: 'x3', subject_id: null }, t0 + 2);     // a következő bejelentés már sikerül
    step('(l3) a kiesett tisztítás azonosítói NEM vesznek el — a következő bejelentés leadja őket (RÉGEN: elvesztek)',
      varolista >= 1 && leadva.includes('x1'), { varolista_a_hiba_utan: varolista, kesobb_leadva: leadva });

    // (l4) F154-27 (P2): a pin elengedése a SAJÁT azonosítóit ismeri — nem olvassa végig a táblát.
    const C = 4000;
    const st3 = makeSessionStore({ idleMs: 600_000, maxSessions: C * 2, warn: () => {} });
    const jelek3 = [];
    for (let i = 0; i < C; i++) {
      const jel = Symbol(`p${i}`);
      jelek3.push(jel);
      // ELŐBB BESZÚRÁS, AZTÁN PIN (F154-36, külső review, Codex, kilencedik kör): az F154-29 óta a
      // `pin()` nem létező sorra NEM pinel — a régi sorrenddel ez a mérés NULLA pint hozott létre,
      // tehát ÜRES volt, és a kvadratikus alak visszatérését sem kapta volna el (KUKA-207 · KUKA-239).
      st3.set(`p${i}`, { id: `p${i}`, subject_id: `u${i}` }, t0);
      st3.pin(`p${i}`, jel);
    }
    // AZ ALAPSOKASÁGOT KIMONDJUK ÉS MEGMÉRJÜK: e nélkül a következő állítás semmit nem jelent.
    const pinekSzama = st3.stats().pinned;
    step(`(l4a) ALAPSOKASÁG: mind a ${C} átfedő kérés sora TÉNYLEG pinelve van (régen: 0 pin, üres mérés)`,
      pinekSzama === C, { pinek: pinekSzama, C });
    const kezdet = Date.now();
    for (const jel of jelek3) st3.unpinAll(jel);
    const ms = Date.now() - kezdet;
    step(`(l4) ${C} átfedő kérés pinjeinek elengedése ÁLLANDÓ költségű lépésekben megy (a KVADRATIKUS alak kizárva)`,
      ms < 300 && st3.stats().pinned === 0, { ms, C, pinek_elotte: pinekSzama, pinned_utana: st3.stats().pinned, regi_alak: 'kérésenként a TELJES pin-tábla → O(C²)' });

    // (l5) F154-28 (P2): a `touch` megmondja, ha a sor lejárt — és a kérés-ciklus EGY időt használ.
    const st4 = makeSessionStore({ idleMs: 1_000, maxSessions: 10, warn: () => {} });
    st4.set('s', { id: 's', subject_id: 'u' }, t0);
    const erintes = st4.touch('s', t0 + 5_000);
    step('(l5) a `touch` MEGMONDJA, ha a sor lejárt (régen: csendben eldobta, a hívó meg belépettnek hitte)',
      erintes === false && st4.has('s', t0 + 5_000) === false, { touch: erintes });
    const srcL = readFileSync(join(ROOT, 'v3app/server.mjs'), 'utf8');
    // A MINTA A MAI ALAKOT KÖVETI: az igény szerinti munkamenet (SES-04) óta a kikeresés CSAK sütire
    // történik (`cookieId`), de a KÖTÉS ugyanaz: EGY időbélyeg a kikeresésnek és az érintésnek.
    const egyIdo = /const requestNow = Date\.now\(\);[\s\S]{0,1200}?sessions\.get\(cookieId, requestNow\)[\s\S]{0,600}?!sessions\.touch\(session\.id, requestNow\)/.test(srcL);
    step('(l6) a kérés-ciklus EGY időbélyeget ad a kikeresésnek és az érintésnek, és a hamis érintést munkamenet-hiánynak veszi',
      egyIdo, { minta: egyIdo });

    // (l7) ELLENPÁR ÉLŐ HTTP-N: az átfedő köteg a HATÁRON sem hagyja a plafon fölött a tárat.
    const DB4 = resolve(ROOT, 'var/tmp/v3app_r154_l.sqlite');
    try { rmSync(DB4, { force: true }); rmSync(DB4 + '-wal', { force: true }); rmSync(DB4 + '-shm', { force: true }); } catch { /* nem volt */ }
    const elozoL = process.env.VS_APP_SESSION_MAX;
    process.env.VS_APP_SESSION_MAX = '2';
    const lap = await startServer({ port: 0, dbPath: DB4 });
    try {
      const b4 = `http://127.0.0.1:${lap.server.address().port}`;
      for (let i = 0; i < 2; i++) {
        const c = new Client(b4);
        await c.post('/api/register', { email: `l${i}@pelda.hu`, password: PW, lang: 'hu' });
        const m = (await c.get('/dev/mailbox')).body.mails.filter((x) => x.to === `l${i}@pelda.hu`)[0];
        const l = new URL(m.link);
        await c.get(l.pathname + l.search);
        await c.post('/api/login', { email: `l${i}@pelda.hu`, password: PW });
      }
      const port4 = lap.server.address().port;
      // TÍZ ÁTFEDŐ, LASSAN érkező POST — mind nyitva van, amíg az utolsó el nem indul.
      const kotes = [];
      for (let i = 0; i < 10; i++) {
        kotes.push(new Promise((resolve2) => {
          const rq = httpReq({ host: '127.0.0.1', port: port4, path: '/api/invites/pending', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' } }, (res) => {
            res.on('data', () => {}); res.on('end', () => resolve2(res.statusCode));
          });
          rq.on('error', () => resolve2(0));
          rq.write(`{"token":"koteg-${i}-`);
          setTimeout(() => rq.end('proba"}'), 250);
        }));
      }
      const valaszok = await Promise.all(kotes);
      step('(l7) ÉLŐ HTTP: 10 átfedő lassú POST után a tár a plafon közelében áll (RÉGEN: a köteg mérete hozzáadódott)',
        lap.sessions.size <= 2 + 1, { size: lap.sessions.size, plafon: 2, valaszok: valaszok.filter((x) => x === 200).length });
      step('(l8) ELLENPÁR: a köteg egyetlen BELÉPETT munkamenetet sem léptetett ki',
        lap.sessions.stats().evicted_cap_signed_in === 0, lap.sessions.stats());
    } finally {
      await new Promise((r) => lap.server.close(r));
      if (elozoL === undefined) delete process.env.VS_APP_SESSION_MAX; else process.env.VS_APP_SESSION_MAX = elozoL;
    }
  }

  // ── M) F154-29 — AMIT A TÁR NEM TUD MEGTARTANI, AZT FEL SEM VESSZÜK (hatodik Codex-kör, P1) ───
  //
  // A LELET: az ötödik kör javítása (a pin elengedésekori söprés) azt a sort vitte el, amelyhez a
  // kezelő ÉPP AKKOR írt szerver-oldali állapotot: a kérés 200-at és sütit adott, a következő kérés
  // pedig sem a munkamenetet, sem a meghívó-folytatást nem találta. HÁROM egymást visszafordító kör
  // után (felvételi kapu → pin → utólagos söprés) a hiba nem a lépésekben volt, hanem a SORRENDBEN.
  // Ezért a plafon a BESZÚRÁSHOZ került, és a munkamenethez kötött ÍRÁS mond nevezetten nemet.
  part('M) F154-29 — a plafon a BESZÚRÁSNÁL dönt, és a munkamenethez kötött írás nevezetten nemet mond');
  {
    const DB5 = resolve(ROOT, 'var/tmp/v3app_r154_m.sqlite');
    try { rmSync(DB5, { force: true }); rmSync(DB5 + '-wal', { force: true }); rmSync(DB5 + '-shm', { force: true }); } catch { /* nem volt */ }
    const elozoM = process.env.VS_APP_SESSION_MAX;
    process.env.VS_APP_SESSION_MAX = '2';
    const tele2 = await startServer({ port: 0, dbPath: DB5 });
    try {
      const b5 = `http://127.0.0.1:${tele2.server.address().port}`;
      for (let i = 0; i < 2; i++) {
        const c = new Client(b5);
        await c.post('/api/register', { email: `m${i}@pelda.hu`, password: PW, lang: 'hu' });
        const mail = (await c.get('/dev/mailbox')).body.mails.filter((x) => x.to === `m${i}@pelda.hu`)[0];
        const lnk = new URL(mail.link);
        await c.get(lnk.pathname + lnk.search);
        await c.post('/api/login', { email: `m${i}@pelda.hu`, password: PW });
      }
      step('(m0) ALAPSOKASÁG: a tár CSUPA BELÉPETT sorral tele — e nélkül a mérés semmit nem jelent',
        tele2.sessions.stats().anonymous === 0 && tele2.sessions.size >= 2,
        { size: tele2.sessions.size, nevtelen: tele2.sessions.stats().anonymous, plafon: 2 });

      const sorok = () => tele2.store.get('SELECT COUNT(*) AS n FROM pending_intent').n;
      const elotte = sorok();
      const v = await fetch(b5 + '/api/invites/pending', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'telt-tar-proba' }) });
      const vb = await v.json();
      step('(m1) telt táron a munkamenethez kötött írás NEVEZETTEN elutasít (RÉGEN: 200 + süti, majd a következő kérés mindent elvesztett)',
        v.status === 503 && vb.reason === 'at_capacity', { status: v.status, reason: vb.reason });
      step('(m2) és NEM ír sort: a tábla változatlan (RÉGEN: ÁRVA sor keletkezett)',
        sorok() === elotte, { sorok: `${elotte}→${sorok()}` });
      step('(m3) és NEM ad sütit sem — egy süti, ami semmire nem mutat, csak elfedi a helyzetet',
        !v.headers.get('set-cookie'), { set_cookie: v.headers.get('set-cookie') });

      const ver2 = await fetch(b5 + '/api/verify?token=nemletezo&lang=hu');
      const reg2 = await fetch(b5 + '/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'm-telt@pelda.hu', password: PW, lang: 'hu' }) });
      step('(m4) ELLENPÁR (F154-22 érvényben): a belépés ELŐTTI utak telt táron sem záródnak el',
        ver2.status !== 503 && reg2.status !== 503, { verify: ver2.status, register: reg2.status });
      step('(m5) ELLENPÁR: és közben egyetlen BELÉPETT munkamenet sem esett ki',
        tele2.sessions.stats().evicted_cap_signed_in === 0, tele2.sessions.stats());
    } finally {
      await new Promise((r) => tele2.server.close(r));
      if (elozoM === undefined) delete process.env.VS_APP_SESSION_MAX; else process.env.VS_APP_SESSION_MAX = elozoM;
    }
  }

  // ── N) F154-30…F154-32 — A SZERSZÁMOK HÁROM LELETE (hatodik Codex-kör: két P1 és egy P2) ────
  //
  // MINDHÁROM OLYAN ESZKÖZBEN volt, amit a söprés nem futtat (a PostgreSQL-lánc VALÓDI adatbázist
  // kér, az export egyszeri) — ezért a két tiszta döntés most külön modulban él és MEGHÍVHATÓ
  // (KUKA-207), a harmadikat pedig az eszköz tényleges futtatásával mérjük.
  part('N) F154-30…F154-32 — a szerszámok három lelete (döntések külön modulban, meghívva)');
  {
    // (n1) F154-30 (P1): a százalék-kódolt forrás-név UGYANAZ az adatbázis — és a lánc végén DROP áll.
    const kodolt = sameDatabase('postgres://u:p@h:5432/foo%24bar', 'foo$bar');
    step('(n1) a százalék-kódolt forrás-név a DEKÓDOLÁS után azonosnak számít (RÉGEN: különböző → a forrást törölte volna)',
      kodolt.same === true, kodolt);
    const mas = sameDatabase('postgres://u:p@h:5432/vs_eles', 'vs_visszatoltes_proba');
    step('(n2) ELLENPÁR: a valóban MÁS cél továbbra is megengedett (a javítás nem zárja le a láncot)',
      mas.same === false, mas);
    const rossz = sameDatabase('postgres://u:p@h:5432/foo%E0%A4%A', 'barmi');
    step('(n3) a hibás százalék-kódolás NEM MEGÁLLAPÍTHATÓ — és ott ÓVATOSAN megállunk, nem törlünk',
      rossz.same === true && /NEM megállapítható/i.test(rossz.basis), rossz);

    // (n4) F154-31 (P1): a hibás érték JELSZÓT tartalmazhat — a naplóba sem kerülhet.
    const titkos = 'postgres://felhasznalo:NAGYON-TITKOS-JELSZO@host:5432/vs';
    const baj = restoreTargetProblem(titkos);
    const kiirt = JSON.stringify(baj);
    step('(n4) a hibás cél jelzése az ÉRTÉKET NEM hordozza (RÉGEN: a teljes kapcsolati cím a naplóba került)',
      baj !== null && !kiirt.includes('TITKOS') && !kiirt.includes('felhasznalo') && !kiirt.includes(titkos)
        && baj.looks_like_url === true && baj.length === titkos.length, baj);
    step('(n5) ELLENPÁR: a HELYES adatbázis-név átmegy (a szűkítés nem zár el jogos értéket)',
      restoreTargetProblem('vs_visszatoltes_proba') === null, { ertek: 'vs_visszatoltes_proba' });

    // (n6) F154-32 (P2): KÉT projekt-könyvtárban ugyanaz az azonosító → NEVEZETT elakadás, nem választás.
    const tmp2 = mkdtempSync(join(tmpdir(), 'vs-ketert-'));
    try {
      const sess2 = 'ffffffff-0000-4000-8000-000000000002';
      for (const nev of ['-projekt-egy', '-projekt-ketto']) {
        mkdirSync(join(tmp2, nev), { recursive: true });
        writeFileSync(join(tmp2, nev, `${sess2}.jsonl`), '{"type":"assistant"}\n');
      }
      let kod = 0; let hiba = '';
      try {
        // A KIMENET IDEIGLENES ÚTRA MEGY (F154-34, külső review, Codex, nyolcadik kör, P1): `--out`
        // nélkül az exportáló az ALAPÉRTELMEZETT, KÖNYVELT R71-es bizonyíték-fájlt írná felül —
        // és pont akkor, amikor ez a próba a hiba visszatérését méri. A próba nem rombolhatja azt a
        // bizonyítékot, amit a repó őriz.
        execFileSync(process.execPath, [join(ROOT, 'tools/v3_fogyasztas_export.mjs'),
          '--session', sess2, '--projects', tmp2, '--from', '2026-01-01T00:00:00Z', '--to', '2026-01-02T00:00:00Z',
          '--out', join(tmp2, 'kimenet')],
          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (e) { kod = e.status; hiba = String(e.stderr || ''); }
      step('(n6) két projekt-könyvtárban ugyanaz az átirat → NEVEZETT elakadás (RÉGEN: csendben az elsőt exportálta)',
        kod === 2 && /KÉTÉRTELMŰ ÁTIRAT/.test(hiba) && /projekt-egy/.test(hiba) && /projekt-ketto/.test(hiba),
        { kilepes: kod, megnevezte_mindkettot: /projekt-egy/.test(hiba) && /projekt-ketto/.test(hiba) });
    } finally { rmSync(tmp2, { recursive: true, force: true }); }
  }

  // ── O) F154-33 — A KIZÁRÁST MEG IS KELL TARTANI, ÉS A JOKERT IS ÉRTENI (hetedik Codex-kör) ───
  //
  // A LELET a SAJÁT F154-06 javításom ára: a `q=0` címkéket KISZŰRTEM, ezzel a KIZÁRÁS ténye
  // elveszett — a visszaesés pedig pont azt a nyelvet adta, amit a kérő kizárt.
  part('O) F154-33 — a `q=0` KIZÁRÁS, és a `*` joker is számít');
  {
    const p = (h) => pickFromAcceptLanguage(h);
    const a = p('hu;q=0, *;q=1');
    step('(o1) a kizárt alapnyelv helyett a joker ad más nyelvet (RÉGEN MÉRVE: `hu` — pont a kizárt)',
      a.code !== 'hu' && a.matched === true, a);
    const b = p('hu;q=0');
    step('(o2) kizárt alapnyelv joker NÉLKÜL sem jön vissza — és a nyugta nem állít teljesítést (RÉGEN: `hu`)',
      b.code !== 'hu' && b.matched === false, b);
    const c = p('hu;q=0, de;q=0.5');
    step('(o3) a pozitív címke továbbra is nyer — a kizárás nem borítja fel a sorrendet',
      c.code === 'de' && c.matched === true, c);
    const d = p('*;q=0');
    step('(o4) ha MINDENT kizártak, a lap akkor is kiíródik — alapnyelv, de NEM teljesítésként',
      d.code === 'hu' && d.matched === false, d);
    const e = p('hu;q=0, de;q=0, en;q=0');
    step('(o5) minden bekapcsolt nyelv kizárva: ugyanaz a kimondott vége (alapnyelv, matched: false)',
      e.code === 'hu' && e.matched === false, e);
    step('(o6) ELLENPÁR: a korábbi mért esetek NEM változtak (F154-06 és F154-05 érvényben)',
      p('de;q=0').code === 'hu' && p('de;q=0').matched === false
      && p('de-AT').code === 'de' && p('de-AT').matched === true
      && p('fr-FR').code === 'hu' && p('fr-FR').matched === false
      && p('de;q=0.8, en;q=0.9').code === 'en',
      { 'de;q=0': p('de;q=0'), 'de-AT': p('de-AT').code, 'fr-FR': p('fr-FR'), 'suly': p('de;q=0.8, en;q=0.9').code });
    const f = resolveLanguage({ acceptLanguage: 'hu;q=0, *;q=1' });
    step('(o7) és a KÉRÉS nyelve is ezt kapja — a feloldó EGY (a `resolveLanguage` nem másol szabályt)',
      f.code !== 'hu' && f.source === 'accept_language' && f.matched === true, f);
  }

  // ── P) F154-35 — HA MINDEN ÁLDOZAT VÉDETT, A BESZÚRÁS ELUTASÍTVA (nyolcadik Codex-kör, P1) ──
  //
  // A LELET: ha MINDEN sort épp kiszolgálnak, a belépett kör minden jelöltet kihagy, a beszúrt
  // BELÉPETT sort pedig a `keep` védte — a `set` tehát a plafon FÖLÖTT tért vissza, és mivel az
  // elengedés már nem söpör (F154-29), a többlet ott maradt. Érvényes jelszóval ismételhető volt.
  part('P) F154-35 — a plafon a `set` után MINDIG áll: a felvétel elutasítható');
  {
    const t1 = 2_000_000;
    const st = makeSessionStore({ idleMs: 600_000, maxSessions: 2, warn: () => {} });
    st.set('b1', { id: 'b1', subject_id: 'u1' }, t1);
    st.set('b2', { id: 'b2', subject_id: 'u2' }, t1 + 1);
    const k1 = Symbol('k1'); const k2 = Symbol('k2');
    st.pin('b1', k1); st.pin('b2', k2);                      // MINDEN sort épp kiszolgálunk
    st.set('b3', { id: 'b3', subject_id: 'u3' }, t1 + 2);     // belépés: rotált, BELÉPETT sor
    step('(p1) minden áldozat védett → a BESZÚRT belépett sor nem kerül be, a plafon áll (RÉGEN: 3 sor, és ott is maradt)',
      st.size === 2 && st.has('b3', t1 + 2) === false, { size: st.size, uj_sor_bent: st.has('b3', t1 + 2), plafon: 2 });
    step('(p2) és ez NEM kiléptetés: a bent lévő kettő marad, a számláló ELUTASÍTÁST mond',
      st.has('b1', t1 + 2) && st.has('b2', t1 + 2) && st.stats().evicted_cap_signed_in === 0 && st.stats().refused_cap === 1,
      st.stats());
    st.unpinAll(k1); st.unpinAll(k2);
    const st2 = makeSessionStore({ idleMs: 600_000, maxSessions: 2, warn: () => {} });
    st2.set('c1', { id: 'c1', subject_id: 'v1' }, t1);
    st2.set('c2', { id: 'c2', subject_id: 'v2' }, t1 + 1);
    st2.set('c3', { id: 'c3', subject_id: 'v3' }, t1 + 2);    // pin NÉLKÜL: a régi szabály áll
    step('(p3) ELLENPÁR: pin nélkül a belépés továbbra is bejut — a LEGRÉGEBBEN látott esik ki (a szabály nem változott)',
      st2.has('c3', t1 + 2) && st2.size === 2 && st2.has('c1', t1 + 2) === false && st2.stats().refused_cap === 0,
      { size: st2.size, uj_bent: st2.has('c3', t1 + 2), legregebbi_bent: st2.has('c1', t1 + 2), stats: st2.stats() });

    // (p4) ÉLŐ HTTP: telt tár + futó kérés → a belépés NEVEZETTEN elutasít, és a bent lévő marad.
    const DB6 = resolve(ROOT, 'var/tmp/v3app_r154_p.sqlite');
    try { rmSync(DB6, { force: true }); rmSync(DB6 + '-wal', { force: true }); rmSync(DB6 + '-shm', { force: true }); } catch { /* nem volt */ }
    const elozoP = process.env.VS_APP_SESSION_MAX;
    process.env.VS_APP_SESSION_MAX = '1';
    const egy = await startServer({ port: 0, dbPath: DB6 });
    try {
      const b6 = `http://127.0.0.1:${egy.server.address().port}`;
      const port6 = egy.server.address().port;
      const fiok = async (nev) => {
        const c = new Client(b6);
        await c.post('/api/register', { email: `${nev}@pelda.hu`, password: PW, lang: 'hu' });
        const m = (await c.get('/dev/mailbox')).body.mails.filter((x) => x.to === `${nev}@pelda.hu`)[0];
        const l = new URL(m.link);
        await c.get(l.pathname + l.search);
        return c;
      };
      const a = await fiok('p-egy');
      const b = await fiok('p-ketto');
      await a.post('/api/login', { email: 'p-egy@pelda.hu', password: PW });
      step('(p4) ALAPSOKASÁG: 1-es plafon, a tárban EGY belépett sor',
        egy.sessions.size === 1 && egy.sessions.stats().anonymous === 0, egy.sessions.stats());

      // LASSÚ kérés az ELSŐ fiókkal: amíg fut, az ő sora VÉDETT (pin).
      let belepes = null;
      await new Promise((kesz) => {
        const rq = httpReq({ host: '127.0.0.1', port: port6, path: '/api/invites/pending', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked', cookie: a.cookie || '' } }, (res) => {
          res.on('data', () => {}); res.on('end', () => kesz());
        });
        rq.on('error', () => kesz());
        rq.write('{"token":"p-lassu-');
        setTimeout(async () => {
          const r = await fetch(b6 + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'p-ketto@pelda.hu', password: PW }) });
          belepes = { status: r.status, body: await r.json().catch(() => ({})) };
          rq.end('proba"}');
        }, 150);
      });
      step('(p5) ÉLŐ HTTP: telt táron, futó kérés mellett a belépés NEVEZETTEN elutasít (nem ad sütit nem létező munkamenetre)',
        belepes && (belepes.status === 503 ? belepes.body.reason === 'at_capacity' : belepes.status === 200),
        { status: belepes && belepes.status, reason: belepes && belepes.body && belepes.body.reason });
      step('(p6) és a tár a plafonon maradt — a már bent lévőt nem léptettük ki',
        egy.sessions.size <= 1 && egy.sessions.stats().evicted_cap_signed_in === 0, egy.sessions.stats());

      const ujra = await fetch(b6 + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'p-ketto@pelda.hu', password: PW }) });
      step('(p7) ELLENPÁR: a lassú kérés LEFUTÁSA UTÁN a belépés sikerül — az elutasítás ÁTMENETI, nem kapu',
        ujra.status === 200, { status: ujra.status });
      void b;
    } finally {
      await new Promise((r) => egy.server.close(r));
      if (elozoP === undefined) delete process.env.VS_APP_SESSION_MAX; else process.env.VS_APP_SESSION_MAX = elozoP;
    }
  }

  // ── Q) F154-37 · F154-38 — A KILENCEDIK KÖR: MŰKÖDŐ KIÚT ÉS AZ ÚT NÉLKÜLI CÍM ──────────
  part('Q) F154-37 · F154-38 — a hibának MŰKÖDŐ kiútja van, és az út nélküli cím is megnevez adatbázist');
  {
    // (q1–q4) F154-38 (P1): út nélküli PostgreSQL-cím → a FELHASZNÁLÓ neve az adatbázis.
    const a = sameDatabase('postgres://source_user:pw@host', 'source_user', PG_ENV_NELKUL);
    step('(q1) út nélküli cím: a felhasználó neve az adatbázis — tehát AZONOS a céllal (RÉGEN: „eltér” → a FORRÁST törölte volna)',
      a.same === true, a);
    const b = sameDatabase('postgres://source_user:pw@host', 'vs_visszatoltes_proba', PG_ENV_NELKUL);
    step('(q2) ELLENPÁR: más cél mellett a lánc továbbra is indulhat',
      b.same === false, b);
    const c = sameDatabase('postgres://host/', 'barmi', PG_ENV_NELKUL);
    step('(q3) sem adatbázis, sem felhasználó: NEM megállapítható → ÓVATOS megállás',
      c.same === true && /NEM megállapítható/i.test(c.basis), c);
    const d = sameDatabase('postgres://source%5Fuser:pw@host', 'source_user', PG_ENV_NELKUL);
    step('(q4) a felhasználó-név százalék-kódolása is dekódolva számít',
      d.same === true, d);

    // (q5–q6) F154-37 (P2): a kétértelműség hibaüzenete MŰKÖDŐ kiútat ajánl.
    const tmp3 = mkdtempSync(join(tmpdir(), 'vs-kiut-'));
    try {
      const sess3 = 'ffffffff-0000-4000-8000-000000000003';
      const utak = [];
      for (const nev of ['-pr-egy', '-pr-ketto']) {
        mkdirSync(join(tmp3, nev), { recursive: true });
        const ut = join(tmp3, nev, `${sess3}.jsonl`);
        writeFileSync(ut, '{"type":"assistant"}\n');
        utak.push({ dir: join(tmp3, nev), file: ut });
      }
      const futtat = (extra) => {
        try {
          execFileSync(process.execPath, [join(ROOT, 'tools/v3_fogyasztas_export.mjs'),
            '--session', sess3, '--from', '2026-01-01T00:00:00Z', '--to', '2026-01-02T00:00:00Z',
            '--out', join(tmp3, 'kimenet'), ...extra], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
          return { kod: 0, hiba: '' };
        } catch (e) { return { kod: e.status, hiba: String(e.stderr || '') }; }
      };
      const ketert = futtat(['--projects', tmp3]);
      step('(q5) ALAPSOKASÁG: a két projekt-könyvtár miatt az export NEVEZETTEN elakad',
        ketert.kod === 2 && /KÉTÉRTELMŰ ÁTIRAT/.test(ketert.hiba), { kilepes: ketert.kod });
      step('(q6) és a hiba MINDKÉT ajánlott kiutat megnevezi (--transcript és --projects)',
        /--transcript/.test(ketert.hiba) && /--projects/.test(ketert.hiba), { transcript: /--transcript/.test(ketert.hiba) });
      const valasztott = futtat(['--transcript', utak[0].file]);
      step('(q7) a `--transcript` kiút MŰKÖDIK — pont azt a fájlt exportálja',
        valasztott.kod === 0, { kilepes: valasztott.kod, hiba: valasztott.hiba.slice(0, 80) });
      const kivalasztottDir = futtat(['--projects', utak[1].dir]);
      step('(q8) a KIVÁLASZTOTT projekt-könyvtár is kiút (RÉGEN: `NINCS ÁTIRAT` — a tanács nem működött)',
        kivalasztottDir.kod === 0, { kilepes: kivalasztottDir.kod, hiba: kivalasztottDir.hiba.slice(0, 80) });
    } finally { rmSync(tmp3, { recursive: true, force: true }); }
  }

  // ── R) F154-39…F154-43 — A TIZEDIK KÖR ÖT LELETE ────────────────────────────────
  part('R) F154-39…F154-43 — a query-felülírás, az egész plafon, a fájl-kötés és a nyelvi tartomány');
  {
    // (r1–r4) F154-39 (P1): a kapcsolati cím QUERY-paraméterei is számítanak.
    const a = sameDatabase('postgres://decoy@host/?user=source', 'source', PG_ENV_NELKUL);
    step('(r1) `?user=` felülírja a cím-felhasználót, és út híján AZ az adatbázis (RÉGEN: `decoy`-t vetette össze → a FORRÁST törölte volna)',
      a.same === true, a);
    const b = sameDatabase('postgres://u:p@h/vs_eles?dbname=source', 'source');
    step('(r2) `?dbname=` FELÜLÍRJA az utat — tehát az a tényleges adatbázis',
      b.same === true, b);
    const c = sameDatabase('postgres://u:p@h/vs_eles', 'vs_visszatoltes_proba');
    step('(r3) ELLENPÁR: a valóban más cél mellett a lánc továbbra is indulhat',
      c.same === false, c);
    const szerver = withDatabase('postgres://u:p@h/vs_eles?dbname=masik&sslmode=require', 'postgres').toString();
    step('(r4) a kiszolgáló-URL a MEGNEVEZETT adatbázisra mutat, és a `?dbname=` felülírás KIKERÜL',
      szerver.includes('/postgres') && !szerver.includes('dbname=') && szerver.includes('sslmode=require'), { url: szerver });
    // PONTOSÍTVA az R166/P1-ben: a `?dbname=`-et a libpq VESZI, a node-postgres NEM — ahol a kettő
    // mást ad (itt: a node-olvasat neve nem is tudható), a válasz MEGÁLLÁS, nem a libpq-érték. A
    // feloldó TOVÁBBRA IS kimondja, min alapul — ez a pin eredeti állítása — csak most az
    // ELTÉRÉST mondja ki. (És a környezetet kimondottan ürítjük: a valódi `PGDATABASE` különben a
    // gazdagépet mérné, nem a kódot — KUKA-344.)
    const r5 = effectiveDatabase('postgres://h/?dbname=x', PG_ENV_NELKUL);
    step('(r5) és a tényleges név feloldása KIMONDJA, MIN alapul — a `?dbname=` felülírás mellett a KÉT FOGYASZTÓ eltérése MEGÁLLÁS (R166/P1; régen a libpq-érték lett az eldöntött név)',
      r5.name === null && /node-postgres pedig NEM/.test(r5.basis)
      && sameDatabase('postgres://h/?dbname=x', 'x', PG_ENV_NELKUL).same === true,
      { nev: r5.name, alap: r5.basis.slice(0, 80) });

    // (r6–r7) F154-41: a plafon pozitív EGÉSZ szám.
    const naplo = [];
    const tort = sessionLimits({ VS_APP_SESSION_MAX: '0.5' }, (m) => naplo.push(m));
    step('(r6) a tört plafon NEM érvényes érték: az alapértelmezés áll be, és a napló KIMONDJA (RÉGEN: 0.5 érvényes volt, és a szolgáltatás egyetlen munkamenetet sem tartott meg)',
      tort.maxSessions === SESSION_LIMITS.max_sessions && naplo.length === 1 && /NEM pozitív egész/.test(naplo[0]),
      { maxSessions: tort.maxSessions, naplo: naplo.length });
    step('(r7) ELLENPÁR: az érvényes egész érték átmegy (a szűkítés nem zár el jogos beállítást)',
      sessionLimits({ VS_APP_SESSION_MAX: '2' }, () => {}).maxSessions === 2
      && sessionLimits({ VS_APP_SESSION_MAX: '1e3' }, () => {}).maxSessions === 1000, {
        ketto: sessionLimits({ VS_APP_SESSION_MAX: '2' }, () => {}).maxSessions,
        ezer: sessionLimits({ VS_APP_SESSION_MAX: '1e3' }, () => {}).maxSessions });

    // (r8–r9) F154-40: a `--transcript` a KÉRT munkamenethez kötve.
    const tmp4 = mkdtempSync(join(tmpdir(), 'vs-kotes-'));
    try {
      const kert = 'ffffffff-0000-4000-8000-000000000004';
      const masik = 'ffffffff-0000-4000-8000-000000000005';
      mkdirSync(join(tmp4, '-pr'), { recursive: true });
      const masikFajl = join(tmp4, '-pr', `${masik}.jsonl`);
      writeFileSync(masikFajl, `{"type":"assistant","sessionId":"${masik}"}\n`);
      const kertFajl = join(tmp4, '-pr', `${kert}.jsonl`);
      writeFileSync(kertFajl, `{"type":"assistant","sessionId":"${kert}"}\n`);
      const futtat = (sess, extra) => {
        try {
          execFileSync(process.execPath, [join(ROOT, 'tools/v3_fogyasztas_export.mjs'),
            '--session', sess, '--from', '2026-01-01T00:00:00Z', '--to', '2026-01-02T00:00:00Z',
            '--out', join(tmp4, 'kimenet'), ...extra], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
          return { kod: 0, hiba: '' };
        } catch (e) { return { kod: e.status, hiba: String(e.stderr || '') }; }
      };
      const roszz = futtat(kert, ['--transcript', masikFajl]);
      // A MONDAT PONTOSABB LETT, A MÉRCE NEM LAZULT (R166 P2 · KUKA-412): a fájl tartalma KIMONDOTTAN
      // más azonosítót hordoz, tehát a nevezett elakadás az ELLENTMONDÁS-ág — nem a „nincs egyezés".
      // A kilépés-kód és a nevezett elakadás követelménye változatlan.
      step('(r8) MÁS munkamenet átirata a `--transcript`-ben NEVEZETTEN elakad (RÉGEN: lefutott, és a KÉRT azonosítót írta a fejlécbe)',
        roszz.kod === 2 && /TARTALMA MÁS MUNKAMENETÉ/.test(roszz.hiba), { kilepes: roszz.kod });
      const jo = futtat(kert, ['--transcript', kertFajl]);
      step('(r9) ELLENPÁR: a HELYES fájl továbbra is átmegy',
        jo.kod === 0, { kilepes: jo.kod, hiba: jo.hiba.slice(0, 80) });
    } finally { rmSync(tmp4, { recursive: true, force: true }); }

    // (r10–r11) F154-43: a nyelvi kizárás a TELJES tartományra szól.
    const de = pickFromAcceptLanguage('de-AT;q=0, de;q=1');
    step('(r10) regionális kizárás mellett az ÁLTALÁNOS nyelv megengedett (RÉGEN: `hu` — a német egésze kizártnak számított)',
      de.code === 'de' && de.matched === true, de);
    const deAll = pickFromAcceptLanguage('de;q=0, de-AT;q=1');
    step('(r11) ELLENPÁR: ha az ÁLTALÁNOS nyelvet zárták ki, a regionális sem adhat németet',
      deAll.code !== 'de', deAll);
  }

  // ── S) R158/1 — IGÉNY SZERINTI MUNKAMENET (SES-04): ÉLŐ HTTP-N MÉRVE ─────────────────
  //
  // A GYÖKÉR-OK JAVÍTÁSA (az operátor és a chatgpt-v3 döntése, R158): süti nélküli, állapotot nem
  // igénylő kérés NEM nyit tárolt munkamenetet és nem ad sütit. A plafon TOVÁBBRA IS kell: az
  // állapotot KÉRŐ forgalom változatlanul sort nyit — ezt az `s8` méri.
  part('S) R158/1 — igény szerinti munkamenet: állapot nélkül nincs sor és nincs süti');
  {
    const DB7 = resolve(ROOT, 'var/tmp/v3app_r158_s.sqlite');
    try { rmSync(DB7, { force: true }); rmSync(DB7 + '-wal', { force: true }); rmSync(DB7 + '-shm', { force: true }); } catch { /* nem volt */ }
    const elozoMax = process.env.VS_APP_SESSION_MAX; const elozoIdle = process.env.VS_APP_SESSION_IDLE_MS;
    process.env.VS_APP_SESSION_MAX = '20';
    process.env.VS_APP_SESSION_IDLE_MS = '1000';
    const lazy = await startServer({ port: 0, dbPath: DB7 });
    try {
      const b7 = `http://127.0.0.1:${lazy.server.address().port}`;
      const sorok = () => lazy.store.get('SELECT COUNT(*) AS n FROM pending_intent').n;

      const lap = await fetch(b7 + '/');
      const olvas = await fetch(b7 + '/api/me');
      step('(s1) statikus lap ÉS olvasó végpont kiszolgálva — NINCS tárolt munkamenet és NINCS süti (RÉGEN: mindkettő nyitott egyet)',
        lap.status === 200 && olvas.status === 200 && lazy.sessions.size === 0
        && !lap.headers.get('set-cookie') && !olvas.headers.get('set-cookie'),
        { lap: lap.status, api: olvas.status, tar: lazy.sessions.size, suti: Boolean(olvas.headers.get('set-cookie')) });

      for (let i = 0; i < 200; i++) await fetch(b7 + '/api/me');
      step('(s2) 200 süti nélküli olvasás után a tár ÜRES (RÉGEN: 200 sor, a plafonig telve és kiszorításokkal)',
        lazy.sessions.size === 0, { tar: lazy.sessions.size, keresek: 200 });

      // (s3) AZ ÁLLAPOTOT KÉRŐ ÚT MATERIALIZÁL — és a folytatás a KÖVETKEZŐ kérésből visszaolvasható.
      const elotteSorok = sorok();
      const iro = await fetch(b7 + '/api/invites/pending', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'lazy-folytatas' }) });
      const kapottSuti = (iro.headers.get('set-cookie') || '').split(';')[0];
      step('(s3) a meghívó-folytatás írása MATERIALIZÁL: 200, süti, EGY új sor a tárban és EGY a táblában',
        iro.status === 200 && Boolean(kapottSuti) && lazy.sessions.size === 1 && sorok() === elotteSorok + 1,
        { status: iro.status, suti: Boolean(kapottSuti), tar: lazy.sessions.size, sorok: `${elotteSorok}→${sorok()}` });
      const visszaOlvas = await fetch(b7 + '/api/me', { headers: { cookie: kapottSuti } });
      step('(s4) és a KÖVETKEZŐ kérés ugyanazzal a sütivel UGYANAZT a munkamenetet kapja (nem új sort)',
        visszaOlvas.status === 200 && !visszaOlvas.headers.get('set-cookie') && lazy.sessions.size === 1,
        { status: visszaOlvas.status, uj_suti: Boolean(visszaOlvas.headers.get('set-cookie')), tar: lazy.sessions.size });

      // (s5–s6) BELÉPÉS ÁTMENETI munkamenetből, majd KILÉPÉS: a süti törlődik, új sor nem nyílik.
      const c = new Client(b7);
      await c.post('/api/register', { email: 's-anna@pelda.hu', password: PW, lang: 'hu' });
      const mail = (await c.get('/dev/mailbox')).body.mails.filter((x) => x.to === 's-anna@pelda.hu')[0];
      const l = new URL(mail.link);
      await c.get(l.pathname + l.search);
      const tarBelepesElott = lazy.sessions.size;
      const belep = await c.post('/api/login', { email: 's-anna@pelda.hu', password: PW });
      const me = await c.get('/api/me');
      step('(s5) BELÉPÉS átmeneti munkamenetből is működik — és a regisztráció/megerősítés nem nyitott sort',
        belep.status === 200 && me.body.subject_id && lazy.sessions.size === tarBelepesElott + 1,
        { belepes: belep.status, subject: Boolean(me.body.subject_id), tar: `${tarBelepesElott}→${lazy.sessions.size}` });
      const kilep = await c.post('/api/logout');
      const utanaMe = await c.get('/api/me');
      step('(s6) KILÉPÉS: a sor törlődik, ÚJ sort NEM nyitunk, és a süti törlődik (RÉGEN: a kilépés is nyitott egy névtelen sort)',
        kilep.status === 200 && lazy.sessions.size === tarBelepesElott && utanaMe.body.subject_id === null,
        { kilepes: kilep.status, tar: lazy.sessions.size, me_subject: utanaMe.body.subject_id });

      // (s7) LEJÁRAT: a lejárt süti ÁTMENETI munkamenetet ad, a sütit TÖRÖLJÜK, és NEM nyílik új sor.
      const lejaro = await fetch(b7 + '/api/invites/pending', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'lazy-lejaro' }) });
      const lejaroSuti = (lejaro.headers.get('set-cookie') || '').split(';')[0];
      const tarLejaratElott = lazy.sessions.size;
      await new Promise((r) => setTimeout(r, 1300));                      // a 1000 ms-os tétlenségi korlát fölött
      const lejartKeres = await fetch(b7 + '/api/me', { headers: { cookie: lejaroSuti } });
      const torloSuti = lejartKeres.headers.get('set-cookie') || '';
      const lejartTest = await lejartKeres.json();
      step('(s8) LEJÁRT süti: átmeneti munkamenet (nincs belépve), a süti TÖRÖLVE (Max-Age=0), és NEM nyílik új sor',
        lejartKeres.status === 200 && lejartTest.subject_id === null
        && /Max-Age=0/.test(torloSuti) && lazy.sessions.size <= tarLejaratElott,
        { status: lejartKeres.status, subject_id: lejartTest.subject_id, torlo_suti: /Max-Age=0/.test(torloSuti), tar: `${tarLejaratElott}→${lazy.sessions.size}` });

      // (s9) ELLENPÁR — A PLAFON TOVÁBBRA IS KELL: az ÁLLAPOTOT KÉRŐ forgalom sort nyit, és a tár
      // KORLÁTOS marad. Ezt az R158 kifejezetten kéri: az igény szerinti létrehozás nem helyettesíti.
      for (let i = 0; i < 120; i++) {
        await fetch(b7 + '/api/invites/pending', { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'lazy-arasztas-' + i }) });
      }
      step('(s9) ELLENPÁR: 120 ÁLLAPOTOT KÉRŐ hívás sort nyit, de a tár a PLAFONNÁL marad — a plafon továbbra is kell',
        lazy.sessions.size <= 20 + 1, { tar: lazy.sessions.size, plafon: 20 });
      step('(s10) és a munkamenethez kötött tábla is a tárral együtt korlátos marad',
        sorok() <= 20 + 2, { sorok: sorok(), plafon: 20 });

      /**
       * (s11) AZ ÁLLAPOT-IGÉNY LELTÁRA GÉPI ŐR (R158/1 · KUKA-227).
       *
       * Az R158 azt kéri, hogy ELŐBB rögzítsük, melyik út mikor igényel állapotot. Ha ezt csak
       * szövegben rögzítenénk, az ELAVULNA az első új végponttal — ezért a leltár ITT áll, és a
       * próba a FORRÁSBÓL számolja ki. Ha egy ÚJ kezelő munkamenet-állapotot kezd használni, ez a
       * sor pirosra vált, és az írónak döntenie kell: olvassa-e csak a belépettséget (akkor az
       * átmeneti sor is elég), vagy tartós állapotot köt (akkor `materialize()` kell).
       */
      const srvS = readFileSync(join(ROOT, 'v3app/server.mjs'), 'utf8');
      const kulcsok = [...srvS.matchAll(/^    '([A-Z]+ [^']+)':/gm)].map((x) => ({ key: x[1], at: x.index }));
      // A TÉRKÉP VÉGE: az UTOLSÓ kezelő törzse NEM a fájl végéig tart (különben a kérés-ciklus kódja
      // is beleszámítana, és a mérés idegen találatot adna — KUKA-239: a hatókör nélküli minta a
      // szomszéd sort igazolja).
      const terkepVege = srvS.indexOf('\n  };\n', kulcsok[kulcsok.length - 1].at);
      const vegeOf = (i) => (i + 1 < kulcsok.length ? kulcsok[i + 1].at : terkepVege);
      const allapotIgeny = [];
      for (let i = 0; i < kulcsok.length; i++) {
        const torzs = srvS.slice(kulcsok[i].at, vegeOf(i));
        if (/session\.subject_id|session\.current_book_id|session\.id|session\.transient|materialize/.test(torzs)) allapotIgeny.push(kulcsok[i].key);
      }
      // A KIMONDOTT LELTÁR: ami tartós állapotot KÖT (materializál vagy rotál), és ami csak OLVASSA
      // a belépettséget. A második csoportnak NEM kell tárolt sor — ezért működik az átmeneti alak.
      // A `…/pending/forget` az R166 P2-jével került be, és KIMONDOTTAN ide tartozik: a SAJÁT
      // munkamenet tartós sorát TÖRLI (`forgetIntent` + `clearIntent`), tehát a munkamenet
      // azonosítóját használja. Ez az őr épp arra van, hogy egy ilyen út ne kerülhessen be csendben —
      // és meg is fogta, mielőtt a csomag lezárult (R166, külső review P2).
      const KOT = ['POST /api/login', 'POST /api/logout', 'POST /api/invites/pending',
        'POST /api/invites/pending/forget', 'POST /api/invites/redeem', 'POST /api/session/workspace'];
      const hianyzo = KOT.filter((k) => !allapotIgeny.includes(k));
      const ujKoto = allapotIgeny.filter((k) => {
        const i = kulcsok.findIndex((x) => x.key === k);
        return !KOT.includes(k) && /session\.id|materialize|session\.transient/.test(srvS.slice(kulcsok[i].at, vegeOf(i)));
      });
      step('(s11) AZ ÁLLAPOT-IGÉNY LELTÁRA ÁLL: a tartós állapotot KÖTŐ utak pontosan a kimondottak — új ilyen út nem kerülhet be csendben',
        hianyzo.length === 0 && ujKoto.length === 0,
        { allapotot_olvas: allapotIgeny.length, kimondott_koto: KOT.length, hianyzo, varatlan_koto: ujKoto });
    } finally {
      await new Promise((r) => lazy.server.close(r));
      if (elozoMax === undefined) delete process.env.VS_APP_SESSION_MAX; else process.env.VS_APP_SESSION_MAX = elozoMax;
      if (elozoIdle === undefined) delete process.env.VS_APP_SESSION_IDLE_MS; else process.env.VS_APP_SESSION_IDLE_MS = elozoIdle;
    }
  }

  // ── T) R158/1b — A FÜGGŐ SZÁNDÉK LEJÁR: ÉLŐ HTTP-N, A FEJLESZTŐI ÓRÁVAL ─────────────
  //
  // A D-VS-3007 nevezett függője: a `pending_intent` sor IDŐBEN korlátlan volt. A mag most 24 órás
  // élettartamot érvényesít (D-VS-3141), és a lejáratot az OLVASÁS is kapu. Itt a HATÁRON mérjük,
  // a fejlesztői órával — mert a lejárati ágat böngészőből is ki kell tudni próbálni.
  part('T) R158/1b — a függő szándék lejár, és a takarítás halmazon megy');
  {
    const DB8 = resolve(ROOT, 'var/tmp/v3app_r158_t.sqlite');
    try { rmSync(DB8, { force: true }); rmSync(DB8 + '-wal', { force: true }); rmSync(DB8 + '-shm', { force: true }); } catch { /* nem volt */ }
    const lej = await startServer({ port: 0, dbPath: DB8 });
    try {
      const b8 = `http://127.0.0.1:${lej.server.address().port}`;
      const sorok = () => lej.store.get('SELECT COUNT(*) AS n FROM pending_intent').n;
      const fiok = async (nev) => {
        const c = new Client(b8);
        await c.post('/api/register', { email: `${nev}@pelda.hu`, password: PW, lang: 'hu' });
        const m = (await c.get('/dev/mailbox')).body.mails.filter((x) => x.to === `${nev}@pelda.hu`)[0];
        const u = new URL(m.link);
        await c.get(u.pathname + u.search);
        return c;
      };

      // (t1–t2) A FRISS SZÁNDÉK FOLYTATÓDIK — ez a felhasználó által LÁTOTT tulajdonság.
      const a = await fiok('t-anna');
      const irtA = await a.post('/api/invites/pending', { token: 'folytatas-ANNA' });
      const belepA = await a.post('/api/login', { email: 't-anna@pelda.hu', password: PW });
      step('(t1) a FRISS függő szándék a belépés után FOLYTATÓDIK (a határ visszaadja a tokent)',
        irtA.status === 200 && belepA.status === 200 && belepA.body.pending_invite_token === 'folytatas-ANNA',
        { iras: irtA.status, belepes: belepA.status, token: belepA.body.pending_invite_token });

      // (t3–t4) A LEJÁRT SZÁNDÉK NEM folytatódik — és a sora eltûnik (az olvasás is kapu).
      const b = await fiok('t-bela');
      await b.post('/api/invites/pending', { token: 'folytatas-BELA' });
      const sorokElotte = sorok();
      await b.post('/dev/clock', { advance_ms: 25 * 60 * 60 * 1000 });     // a 24 órás élettartam FÖLÉ
      const belepB = await b.post('/api/login', { email: 't-bela@pelda.hu', password: PW });
      step('(t2) a LEJÁRT függő szándék NEM folytatódik: a belépés sikerül, de token NÉLKÜL (RÉGEN: időben korlátlan volt, és évekkel később is visszatért volna)',
        belepB.status === 200 && belepB.body.pending_invite_token === null,
        { belepes: belepB.status, token: belepB.body.pending_invite_token });
      step('(t3) és a lejárt sor a TÁBLÁBÓL is eltűnt — az OLVASÁS is kapu (KUKA-296)',
        sorok() < sorokElotte, { sorok: `${sorokElotte}→${sorok()}` });

      // (t4) A TAKARÍTÁS halmazon: a lejártakat viszi, a FRISSET meghagyja.
      const c1 = await fiok('t-cili'); await c1.post('/api/invites/pending', { token: 'folytatas-CILI' });
      const c2 = await fiok('t-dora'); await c2.post('/api/invites/pending', { token: 'folytatas-DORA' });
      const elotteT = sorok();
      const kesoiOra = { now: () => new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString() };
      const takaritas = purgeExpiredIntents({ store: lej.store, clock: kesoiOra });
      step('(t4) a takarítás a lejárt sorokat EGY halmaz-utasításban viszi, és megszámolja, mennyit',
        takaritas.purged === elotteT && sorok() === 0, { elotte: elotteT, takaritva: takaritas.purged, utana: sorok() });
      // A VERDIKT A MÉRÉS HATÓKÖRÉN BELÜL MARAD (KUKA-216 · KUKA-239): a két belépőnek KÜLÖN sora van,
      // mert a visszavonás-próba megmutatta, hogy a `resumeIntent` órájának kivétele a `purgeExpiredIntents`
      // sorát ZÖLDEN hagyja — egy összevont „a mag" sor tehát a szomszéd függvényt igazolta volna.
      step('(t5) ELLENPÁR: a TAKARÍTÁS óra nélkül NEVEZETTEN elakad — nincs néma „lejárat kikapcsolva" ág (KUKA-238)',
        (() => { try { purgeExpiredIntents({ store: lej.store }); return false; } catch (e) { return /clock/.test(String(e && e.message)); } })(), 'nevezett hiba');
      step('(t5b) ELLENPÁR: az OLVASÁS (resumeIntent) óra nélkül szintén NEVEZETTEN elakad — a lejárat nem opcionális',
        (() => { try { resumeIntent({ store: lej.store, sessionId: 'barmi' }); return false; } catch (e) { return /clock/.test(String(e && e.message)); } })(), 'nevezett hiba');
      const srcT = readFileSync(join(ROOT, 'v3app/server.mjs'), 'utf8');
      step('(t6) a takarítás AMORTIZÁLT és nem időzítős: percenként legfeljebb egyszer, a kérés útján',
        // A TILTÓ minta HÍVÁSRA illeszkedik (`setInterval(`), nem a szóra: a saját megjegyzésem
        // IDÉZI a `setInterval`-t, és egy szó-szintű minta a PRÓZÁT igazolta volna (KUKA-239).
        /nextIntentPurge = now \+ 60_000/.test(srcT) && /purgeIntentsIfDue\(requestNow\)/.test(srcT) && !/setInterval\(/.test(srcT),
        { amortizalt: true, idozito_hivas: /setInterval\(/.test(srcT) });
    } finally {
      await new Promise((r) => lej.server.close(r));
    }
  }

  // ── U) R158/2 — A BEMUTATÓ-JEL BEMUTATÓT NYIT, NEM JOGOT ───────────────────────────────────────
  //
  // MIÉRT ÁLL ITT. A böngészős próbapadot bemutató-környezetre állítottuk (`VS_DEMO=1`), mert a két
  // KÉT SZEREPLŐS végigvezetés csak ott kínálható fel. Az R158 ehhez kimondott feltételt adott: „a
  // demó bekapcsolása ne kerülje meg a normál jogosultsági védelmet." Ezt NEM elhinni kell, hanem
  // MÉRNI — ugyanazon a szerveren, ugyanazokkal a fiókokkal, CSAK a jelet átállítva: így a különbség
  // nem lehet másé (KUKA-132: az összehasonlítás csak egyenlő feltételek mellett bizonyít).
  part('U) R158/2 — a demó-jel a végigvezetéseket nyitja ki, jogot NEM ad');
  {
    const DB9 = resolve(ROOT, 'var/tmp/v3app_r158_u.sqlite');
    try { rmSync(DB9, { force: true }); rmSync(DB9 + '-wal', { force: true }); rmSync(DB9 + '-shm', { force: true }); } catch { /* nem volt */ }
    const demoVolt = process.env.VS_DEMO;
    const u = await startServer({ port: 0, dbPath: DB9 });
    try {
      const b9 = `http://127.0.0.1:${u.server.address().port}`;
      const fiok = async (nev) => {
        const c = new Client(b9);
        await c.post('/api/register', { email: `${nev}@pelda.hu`, password: PW, lang: 'hu' });
        const m = (await c.get('/dev/mailbox')).body.mails.filter((x) => x.to === `${nev}@pelda.hu`)[0];
        const link = new URL(m.link);
        await c.get(link.pathname + link.search);
        await c.post('/api/login', { email: `${nev}@pelda.hu`, password: PW });
        return c;
      };
      // A FELÜLET MEGNEVEZÉSE A MÉRÉS RÉSZE (R164/3): a két szereplős végigvezetés felkínálása KÉT
      // feltételhez kötött — a KÖRNYEZET bemutató-jele ÉS a BETÖLTÖTT FELÜLET váltó vezérlője —, és
      // a válasz ki is mondja, melyik felületet mérte (`surface`).
      const turak = async (c, surface) => {
        const r = await c.get(`/api/assistant/status?lang=hu${surface ? `&surface=${surface}` : ''}`);
        return { ids: (r.body.tours || []).map((t) => t.id), surface: r.body.surface ?? null };
      };

      // A FIÓKKEZELŐ: saját cég, és egy FÜGGŐ meghívó, amit vissza lehetne vonni.
      const anna = await fiok('u-anna');
      await anna.post('/api/workspaces', { name: 'U158 Kft', plan: 'starter', business: { jurisdiction: 'HU', tax_id: '12345678-1-42' } });
      const megh = await anna.post('/api/invites', { email: 'u-cili@pelda.hu', role: 'user', scope: 'keszlet', lang: 'hu' });
      const jelolo = String(megh.body.token || '').slice(0, 8);
      /**
       * ÉS EGY VALÓDI TAG IS KELL — A TÖRTÉNET INDULÓ ADATA ELŐFELTÉTEL (R176 §1 · KUKA-417).
       *
       * A visszavonás története FÜGGŐ meghívást kér (ez Cilié, aki NEM fogadja el), a visszatérés
       * története MÁSIK TAGOT (ez Dóra, aki elfogadja). Így MIND A KÉT tény igaz ebben a fiókban,
       * tehát a lenti állítások a KAPUT mérik, nem a fixtúra hiányát (KUKA-120).
       */
      const dora = await fiok('u-dora');
      const meghD = await anna.post('/api/invites', { email: 'u-dora@pelda.hu', role: 'user', scope: 'keszlet', lang: 'hu' });
      await dora.post('/api/invites/redeem', { token: meghD.body.token });

      const KETSZEREPLOS = ['tour.inviteRevoke', 'tour.reentry'];
      const vanE = (r) => KETSZEREPLOS.filter((x) => r.ids.includes(x));

      // (u1) DEMÓ BE + A BEMUTATÓ FELÜLETE: a két szereplős végigvezetés MEGJELENIK.
      process.env.VS_DEMO = '1';
      const beTurak = await turak(anna, 'demo');
      step('(u1) DEMÓ BE + a BEMUTATÓ felülete: a KÉT ÉLŐ MUNKAMENETET igénylő végigvezetések felkínálódnak',
        vanE(beTurak).length === 2 && beTurak.surface === 'demo',
        { darab: beTurak.ids.length, felulet: beTurak.surface, ketszereplos: vanE(beTurak) });

      /**
       * (u7) A VALÓDI HÉJ MOST MÁR AD VÁLTÓ VEZÉRLŐT — ÉS EZ A MAI IGAZSÁG (R176 §1).
       *
       * MI VOLT ITT EDDIG. Az R164/3 óta ez a sor azt állította, hogy az alkalmazás-héj NEM ad
       * „váltás a másik nézetére" vezérlőt, tehát a két szereplős történet ott fel sem kínálódik.
       * Akkor ez IGAZ volt — és a sor jó munkát végzett: egy végig nem vihető felkínálást fogott meg.
       *
       * MI VÁLTOZOTT, ÉS MIÉRT NEM GYENGÜLÉS. Az R176 §1 a történetet a TÉNYLEGES felületen kérte
       * végigvihetőnek. A válasz NEM megszemélyesítő kapcsoló (a parancs kimondottan nem is kér
       * ilyet), hanem a MÁR MEGLÉVŐ kijelentkezés: a szemantikus horgony szerződése szerint „az a
       * vezérlő, amivel a néző átvált a másik szereplőre" — éles héjban ez a kilépés, utána a másik
       * ember a SAJÁT fiókjával lép be. A képesség tehát valódi vezérlőn áll, nem új kapcsolón.
       *
       * ÉS A FELTÉTEL ÉL TOVÁBB: a horgony nélküli felület ZÁR — azt a (u8) méri, kitalált
       * felület-néven (üres horgony-készlet). A kapu nem tűnt el, csak a valóság lett más.
       */
      const hejTurak = await turak(anna);          // nincs `surface` → az alapértelmezett héj
      const logoutSrc = readFileSync(join(ROOT, 'v3app/public/app.js'), 'utf8');
      const valodiVezerlo = /data-action="logout" data-testid="logout"\s*\n\s*data-tour-anchor="actor-switch"/.test(logoutSrc);
      step('(u7) R176 §1: a VALÓDI alkalmazás-héj felkínálja a két szereplős végigvezetést, mert a váltó vezérlő a MEGLÉVŐ kijelentkezés (nem megszemélyesítő kapcsoló)',
        vanE(hejTurak).length === 2 && hejTurak.surface === 'app'
          && hejTurak.ids.length === beTurak.ids.length && valodiVezerlo,
        { felulet: hejTurak.surface, darab: hejTurak.ids.length, bemutato_felulettel: beTurak.ids.length,
          a_horgony_a_kijelentkezesen: valodiVezerlo });

      // (u8) ELLENPÁR A ZÁRT LISTÁRA (KUKA-236): nem ismert felület-névre a kiszolgáló ÜRES
      // horgony-készletet ad, és a válasz `surface: null`-t mond — nem némán „bemutatót".
      const kitalaltTurak = await turak(anna, 'kitalalt-felulet');
      step('(u8) ELLENPÁR — KITALÁLT felület-név: a kapu ZÁR, és a válasz NEVEZETTEN `null` felületet mond',
        vanE(kitalaltTurak).length === 0 && kitalaltTurak.surface === null
          && kitalaltTurak.ids.length === hejTurak.ids.length - 2,
        { felulet: kitalaltTurak.surface, darab: kitalaltTurak.ids.length, hej: hejTurak.ids.length });

    /**
     * (as1–as5) R176 §1 — A VÁLTÁS UTÁNI FOLYTATÁS, MINDKÉT IRÁNYBAN MÉRVE.
     *
     * A parancs nevesített hibája: „a meghívó elfogadása utáni folytatásvesztés". A gyökér MÉRVE: a
     * két szereplős történet ÁTÍVEL a szerepeken, a meghívott viszont nem fiókkezelő, tehát az ő
     * nézetében a kiszolgáló a bemutatót nem kínálja fel INDÍTÁSRA — és a visszaállás EBBŐL kereste
     * a lépés-listát. A javítás külön listát ad a FOLYTATHATÓKRÓL; a mérés mindkét irányban megy.
     */
    {
      const bela = await fiok('u-bela-folyt');
      // A FORRÁSOKAT EZ A BLOKK OLVASSA (nem a lentebbi `srvAs`/`polAs`): a mérés sorrendje nem
      // függhet attól, melyik blokk deklarált előbb egy segéd-változót (KUKA-120).
      const srvAs = readFileSync(join(ROOT, 'v3app/server.mjs'), 'utf8');
      const polAs = readFileSync(join(ROOT, 'v3app/assistant/policy.mjs'), 'utf8');
      const belepveT = async (c, surface) => {
        const r = await c.get(`/api/assistant/status?lang=hu${surface ? `&surface=${surface}` : ''}`);
        return { ind: (r.body.tours || []).map((t) => t.id),
          fol: (r.body.resumable_tours || []).map((t) => t.id),
          volt_e_mezo: Array.isArray(r.body.resumable_tours) };
      };
      const annaT = await belepveT(anna);
      const belaT = await belepveT(bela);

      step('(as1) R176 §1: a FIÓKKEZELŐ nézetében a két szereplős történet INDÍTHATÓ is, FOLYTATHATÓ is',
        KETSZEREPLOS.every((x) => annaT.ind.includes(x)) && KETSZEREPLOS.every((x) => annaT.fol.includes(x)),
        { inditható: KETSZEREPLOS.filter((x) => annaT.ind.includes(x)).length, folytathato: annaT.fol.length });

      step('(as2) R176 §1: a MÁSIK szereplő nézetében NEM indítható, de FOLYTATHATÓ — ez a javítás lényege (RÉGEN: a visszaállás nem találta a lépés-listát, és a futást `notAvailable`-lel elengedte)',
        KETSZEREPLOS.every((x) => !belaT.ind.includes(x)) && KETSZEREPLOS.every((x) => belaT.fol.includes(x)),
        { bela_inditható: KETSZEREPLOS.filter((x) => belaT.ind.includes(x)).join(',') || 'egyik sem',
          bela_folytathato: belaT.fol.join(',') || 'egyik sem' });

      step('(as3) R176 §1: a HATÁR viszi a mezőt, és a két lista UGYANABBÓL a leképezőből jön (egy otthon)',
        annaT.volt_e_mezo && belaT.volt_e_mezo
          && (srvAs.match(/\.map\(\(id\) => tourPayloadOf\(id, lang\)\)/g) || []).length === 2
          && (srvAs.match(/function tourPayloadOf\(/g) || []).length === 1,
        { lekepezo_hivasok: (srvAs.match(/\.map\(\(id\) => tourPayloadOf\(id, lang\)\)/g) || []).length,
          lekepezo_definicio: (srvAs.match(/function tourPayloadOf\(/g) || []).length });

      // (as4) A TOLERÁLT OKOK ZÁRT LISTÁJA — nem „minden más is jó" (KUKA-236 szelleme).
      const zartLista = /const RESUME_TOLERALT_OK = Object\.freeze\(\['admin_required', 'personal_space'\]\)/.test(polAs);
      const csakEzek = /RESUME_TOLERALT_OK\.includes\(row\.why\)/.test(polAs);
      step('(as4) R176 §1: a folytatásnál TOLERÁLT láthatósági okok ZÁRT listán állnak (`admin_required` · `personal_space`), és a kapu CSAK ezeket engedi',
        zartLista && csakEzek, { zart_lista: zartLista, csak_ezek: csakEzek });

      // (as5) ÉS A FOLYTATÁS SEM AD JOGOT: csak a szereplő-váltó történetek kerülnek bele, és a
      // készlet a DEFINÍCIÓBÓL jön (KUKA-045) — kézi bemutató-lista nincs.
      const csakValto = /if \(actorSwitchSteps\(t\)\.length === 0\) continue;/.test(polAs);
      step('(as5) R176 §1 ELLENPÁR: a folytatható listába CSAK szereplő-váltó történet kerül (a definícióból, nem kézi névsorból), és a lista rövidebb az indíthatóknál',
        csakValto && annaT.fol.length === KETSZEREPLOS.length && annaT.fol.length < annaT.ind.length,
        { csak_valto: csakValto, folytathato: annaT.fol.length, inditható: annaT.ind.length });

      // (as6) A BÖNGÉSZŐ-OLDALI VISSZAÁLLÁS IS EBBŐL OLVAS — különben a határ zöldje nem a felület
      // zöldje (KUKA-227): a mező átmegy, de senki nem használja.
      const appSrc = readFileSync(join(ROOT, 'v3app/public/app.js'), 'utf8');
      step('(as6) R176 §1: a váltás utáni visszaállás a FOLYTATHATÓ listából is keres (a határ mezőjét a felület TÉNYLEGESEN használja)',
        /state\.astStatus\.resumable_tours/.test(appSrc)
          && /defs\.find\(\(t\) => t\.id === h\.id\) \|\| folytathatok\.find\(\(t\) => t\.id === h\.id\)/.test(appSrc));

      /**
       * (as7–as8) R176 §1 — A FEJLÉC NYITOTT TAKARÓI A SZEMÉLY VÁLTÁSÁN IS BECSUKÓDNAK (KUKA-416).
       *
       * A LELET, MÉRVE 390 px-en: a profilmenü `open` állapota túlélte a kilépést ÉS a következő
       * ember belépését, és a nyitott menü pontosan a fiókválasztó nyitója fölé ült
       * (`elementFromPoint` → `div#profile-menu`) — a néző rá sem tudott kattintani arra, amire az
       * útmutató mutat. Ezért a zárásnak EGY otthona van, és a KÖZÖS nézet-ürítő hívja.
       */
      const zarasOtthon = (appSrc.match(/function closeHeaderOverlays\(\)/g) || []).length;
      const zarasHivas = (appSrc.match(/closeHeaderOverlays\(\);/g) || []).length;
      const uritoZar = /closeHeaderOverlays\(\);\n    renderTour\(\);/.test(appSrc);
      step('(as7) R176 §1: a fejléc takaróinak zárása EGY otthonban áll, és a KÖZÖS nézet-ürítő is hívja (a személy váltása után nem marad nyitott menü)',
        zarasOtthon === 1 && zarasHivas === 3 && uritoZar,
        { otthon: zarasOtthon, hivas: zarasHivas, urito_zar: uritoZar });

      // (as8) ELLENPÁR: a NYERS zárás pontosan EGY helyen állhat (az otthonban) — a másolatból
      // maradt ki a kilépés, és a `go()`-ba visszaírt alak nevezetten tilos.
      const nyersProfil = (appSrc.match(/if \(pr\) pr\.open = false;/g) || []).length;
      const nyersValto = (appSrc.match(/if \(sw\) sw\.open = false;/g) || []).length;
      const visszairtGo = /setNavOpen\(false\);\n    render\(\);\n    loadPageData\(\);/.test(appSrc);
      step('(as8) R176 §1 ELLENPÁR: a NYERS zárás EGYETLEN helyen áll, és a `go()`-ba visszamásolt alak nincs (a másolat volt az, ami a kilépésből kimaradt)',
        nyersProfil === 1 && nyersValto === 1 && visszairtGo === false,
        { nyers_profil: nyersProfil, nyers_valto: nyersValto, visszairt_go: visszairtGo });

      /**
       * (as9–as10) R176 §1 — A TÖRTÉNET INDULÓ ADATA IS ELŐFELTÉTEL (KUKA-417).
       *
       * A LELET, amit a KÖTELEZŐ böngésző-kapu mért a saját horgony-változásom felett: a váltó
       * vezérlő megléte KEVÉS. Mintaadat nélküli vállalkozásban a `tour.inviteRevoke` a 4. lépésen
       * (nincs FÜGGŐ meghívás), a `tour.reentry` a 2.-on (nincs MÁSIK tag) szakadt meg — a
       * felkínálás maga volt a hibás állítás. A tényt a KISZOLGÁLÓ méri a tárból.
       */
      const fuggoR = await anna.get('/api/invites/waiting');
      const tagokR = await anna.get('/api/members');
      const tenyFuggo = (((fuggoR.body || {}).invites) || []).some((i) => i.state === 'pending');
      const tenyMasTag = (((tagokR.body || {}).members) || []).some((m) => m.email && m.email !== 'u-anna@pelda.hu');
      const kapuMert = /story_data: storyDataFacts\(bookId, session\.subject_id, clock\.now\(\)\)/.test(srvAs)
        && /function storyDataFacts\(bookId, subjectId, at\)/.test(srvAs);
      const zartKeszlet = /TOUR_STORY_DATA = Object\.freeze\(\['pending_invite', 'other_member'\]\)/.test(polAs)
        && /if \(!TOUR_STORY_DATA\.includes\(t\.requires_story_data\)\) return false;/.test(polAs);
      step('(as9) R176 §1: a két szereplős történet INDULÓ adata MÉRT tény a tárból (függő meghívás ÉS másik tag), zárt készlettel — nem feltevés és nem kézi névsor',
        tenyFuggo === true && tenyMasTag === true && kapuMert && zartKeszlet,
        { fuggo_meghivas: tenyFuggo, mas_tag: tenyMasTag, kiszolgalo_meri: kapuMert, zart_lista: zartKeszlet });

      /**
       * (as10) AZ ELLENPÁR, ÉS EGYSZERRE A FOLYTATÁS VÉDELME. Egy ÜRES vállalkozásban (se függő
       * meghívás, se másik tag) a kettő NEM indítható — FOLYTATHATÓ viszont mindkettő: ami már
       * elindult, annak az INDULÓ feltétele már nem feltétel (a meghívást épp beváltják a történet
       * közben). E nélkül a kapu visszahozná a folytatásvesztést, amit az R176 §1 javítani kért.
       */
      const ures = await fiok('u-ures-176');
      await ures.post('/api/workspaces', { name: 'U176 Üres Kft', plan: 'starter', business: { jurisdiction: 'HU', tax_id: '10779224-2-44' } });
      const uresT = await belepveT(ures);
      step('(as10) R176 §1 ELLENPÁR: INDULÓ ADAT NÉLKÜL egyik két szereplős történet sem INDÍTHATÓ — de MINDKETTŐ FOLYTATHATÓ (a futó történet nem esik el a haladásától)',
        KETSZEREPLOS.every((x) => !uresT.ind.includes(x)) && KETSZEREPLOS.every((x) => uresT.fol.includes(x)),
        { inditható: KETSZEREPLOS.filter((x) => uresT.ind.includes(x)), folytathato: uresT.fol });
    }

      // (u2) DEMÓ KI: ugyanazon a fiókon, UGYANAZZAL a bemutató-felülettel is eltűnnek — az ÉLES
      // védelem érintetlen. A két feltétel tehát ÉS-kapcsolatban áll, nem helyettesíti egymást.
      delete process.env.VS_DEMO;
      const kiTurak = await turak(anna, 'demo');
      step('(u2) ELLENPÁR — DEMÓ KI (a bemutató felületével is): a két bemutató-kötött végigvezetés NINCS felkínálva (az éles kapu áll)',
        vanE(kiTurak).length === 0 && kiTurak.ids.length === beTurak.ids.length - 2,
        { demoval: beTurak.ids.length, demo_nelkul: kiTurak.ids.length, kulonbseg: beTurak.ids.filter((x) => !kiTurak.ids.includes(x)) });

      // (u3–u5) A JOGOSULTSÁG UGYANAZ MINDKÉT JELÁLLÁSBAN. A művelet az, amit a bemutató-kötött
      // végigvezetés TANÍT (meghívó visszavonása) — tehát épp ott mérünk, ahol a megkerülés
      // értelmes volna: ha a demó jogot adna, ITT adná.
      const kivul = await fiok('u-bela');                       // belépett, de NEM tagja a cégnek
      const mer = async () => ({
        nevtelen: (await new Client(b9).post('/api/invites/revoke', { ref: jelolo })),
        kivulallo: (await kivul.post('/api/invites/revoke', { ref: jelolo })),
      });
      process.env.VS_DEMO = '1';
      const demoval = await mer();
      delete process.env.VS_DEMO;
      const nelkul = await mer();

      step('(u3) a BELÉPÉS NÉLKÜLI visszavonás mindkét jelálláskor UGYANÚGY elakad',
        demoval.nevtelen.status === nelkul.nevtelen.status && demoval.nevtelen.status === 401
          && demoval.nevtelen.body.reason === nelkul.nevtelen.body.reason,
        { demoval: `${demoval.nevtelen.status}/${demoval.nevtelen.body.reason}`, nelkul: `${nelkul.nevtelen.status}/${nelkul.nevtelen.body.reason}` });
      step('(u4) a KÍVÜLÁLLÓ (belépett, de nem tag) visszavonása mindkét jelálláskor UGYANÚGY elakad — a demó NEM ad jogot',
        demoval.kivulallo.status === nelkul.kivulallo.status
          && demoval.kivulallo.body.reason === nelkul.kivulallo.body.reason
          && demoval.kivulallo.status >= 400,
        { demoval: `${demoval.kivulallo.status}/${demoval.kivulallo.body.reason}`, nelkul: `${nelkul.kivulallo.status}/${nelkul.kivulallo.body.reason}` });
      /**
       * ÉS A MEGHÍVÓ TÉNYLEGESEN ÉL: a fenti elutasítások nem azért jöttek, mert nincs mit visszavonni.
       *
       * A MÉRÉS A VISSZAVONANDÓ MEGHÍVÓRA SZŰKÍTVE (R176 §1 — a saját fixtúra-bővítésem mérte). Ez a
       * sor eddig a TELJES `invite` táblát számolta; a fiókba viszont bekerült Dóra MÁSIK, beváltott
       * meghívója is (az `other_member` tény előállítója, `KUKA-417`), tehát a tábla-szintű darabszám
       * nem a saját állításáról beszélt volna. A hatókör a FÜGGVÉNYHEZ tartozik, nem a fájlhoz
       * (`KUKA-239`): itt Cili meghívója az alapsokaság, és ő NEM fogadta el.
       */
      const sorok = u.store.all('SELECT token, redeemed_at FROM invite WHERE invitee_value = ?', 'u-cili@pelda.hu');
      const vonasok = sorok.length
        ? u.store.all('SELECT token FROM invite_revocation WHERE token = ?', sorok[0].token) : [];
      step('(u5) a mérés ALAPSOKASÁGA igaz: a VISSZAVONANDÓ meghívó ÉL (nincs beváltás, nincs visszavonás), tehát az elutasítások a JOGRÓL szólnak, nem a hiányról',
        sorok.length === 1 && !sorok[0].redeemed_at && vonasok.length === 0,
        { meghivo: sorok.length, bevaltott: sorok.filter((x) => x.redeemed_at).length, visszavonas: vonasok.length });

      // (u6) ÉS A JEL HATÓKÖRE A FORRÁSBÓL MÉRVE: a `demo` EGYETLEN döntést érint. Ha valaki egy
      // jogosultsági ágba beköti, ez a sor pirosra vált — a kapu nem a szándékon áll, hanem a kódon.
      const srvU = readFileSync(join(ROOT, 'v3app/server.mjs'), 'utf8');
      const polU = readFileSync(join(ROOT, 'v3app/assistant/policy.mjs'), 'utf8');
      const olvasasok = (srvU.match(/process\.env\.VS_DEMO/g) || []).length;
      // A MINTA PONTOS, NEM RÉSZSZÓ (R166 P2 · KUKA-413): a `ctx.demo` korábban megfogta az ÚJ,
      // KÜLÖN jelet is (`ctx.demo_fixture`), és a sor hamisan pirosra vált. Két külön jel, két külön
      // kérdés — a hatókör-mérce MINDKETTŐRE külön áll, és mindkettő EGY helyen olvasódik.
      const ctxDemo = (polU.match(/ctx\.demo(?![a-z_])/g) || []).length;
      const ctxMinta = (polU.match(/ctx\.demo_fixture/g) || []).length;
      // A FÜGGVÉNY-HATÓKÖR KIMONDVA (KUKA-239): a `ctx.demo` a végigvezetés-felkínálóban álljon.
      /**
       * A KAPU-LÁNC OTTHONA ELMOZDULT, ÉS ERŐSEBB LETT (R176 §1 · `KUKA-003`).
       *
       * Eddig a lánc az `allowedToursFor` törzsében állt. Mostantól KÉT fogyasztója van — az
       * INDÍTHATÓ és a VÁLTÁS UTÁN FOLYTATHATÓ lista —, ezért a lánc egy KÖZÖS feloldóba került
       * (`tourGateOpen`), és a két lista CSAK a szerep-kapuban tér el. A hatókör-mérce ezért a
       * közös feloldó törzsét kérdezi: ha a lánc visszamásolódna két példányba, ez a sor pirosra vált.
       */
      const kezd = polU.indexOf('function tourGateOpen(');
      const veg = polU.indexOf('\n/** AZ INDÍTHATÓ', kezd + 10);
      const torzs = kezd >= 0 ? polU.slice(kezd, veg > kezd ? veg : polU.length) : '';
      // ÉS A MÁSODIK FELTÉTEL OTTHONA IS MÉRVE (R164/3 · KUKA-003): a felület-horgony kapu UGYANEBBEN
      // a felkínálóban áll, a lista pedig a bemutató SAJÁT `switch_actor` lépéseiből jön — nincs
      // kézzel írt bemutató-azonosító lista, amiből egy ÚJ szereplő-váltó történet kimaradhatna.
      const horgonyKapu = /ctx\.surface_anchors/.test(torzs) && /actorSwitchSteps\(t\)/.test(torzs);
      const ctxHorgony = (polU.match(/ctx\.surface_anchors/g) || []).length;
      step('(u6) a demó-jel HATÓKÖRE: a kiszolgáló EGY helyen olvassa, és a döntés CSAK a végigvezetés-felkínálóban áll — a FELÜLET-feltétellel EGYÜTT (és a MINTA-jel is EGY helyen, ugyanott)',
        olvasasok === 1 && ctxDemo === 1 && ctxMinta === 1
        && /ctx\.demo_fixture !== true/.test(torzs) && /ctx\.demo !== true/.test(torzs)
          && horgonyKapu && ctxHorgony === 1,
        { env_olvasas: olvasasok, ctx_demo: ctxDemo, a_felkinaloban: /ctx\.demo !== true/.test(torzs),
          felulet_kapu: horgonyKapu, ctx_surface_anchors: ctxHorgony });
      // (u9) ÉS A HORGONY-KÉSZLET MÉRT, NEM ELHITT: a kiszolgáló a lap FÁJLJÁBÓL olvassa. Ha valaki a
      // kérésnek engedné megállítani a képességet, ez a sor pirosra vált (KUKA-217 · KUKA-227).
      const merve = /readFileSync\(join\(PUBLIC_DIR, f\), 'utf8'\)/.test(srvU)
        && /data-\(\?:testid\|tour-anchor\)=/.test(srvU);
      step('(u9) a felület horgony-készlete a LAP FÁJLJÁBÓL mérve születik, nem a kérés állításából',
        merve, { fajlbol_mert: merve });
    } finally {
      if (demoVolt === undefined) delete process.env.VS_DEMO; else process.env.VS_DEMO = demoVolt;
      await new Promise((r) => u.server.close(r));
    }
  }

  // ── V) R158/3 — A HÁROM BEKAPCSOLT NYELV A HATÁRON, TARTALOMMAL ────────────────────────────────
  //
  // MIT MÉR, ÉS MIÉRT NEM A SZÓTÁRBÓL. Az R158 kimondott kérése: „ellenőrizd a HU/EN/DE i18n-t, a
  // segédet/chatet, a GYIK-et, a súgót, az oldaltérképet és a végigvezetés-elérhetőséget — ÉS a
  // TARTALMAT a meglévő funkciókra." A statikus oldalt a `verify:tutor` és a `verify:i18n` már
  // végigjárja MINDEN bekapcsolt nyelven; ami eddig NEM volt mérve, az a HATÁR: amit a kiszolgáló
  // TÉNYLEGESEN kiad `?lang=` szerint. Ezért itt ÉLŐ HTTP-n kérdezünk, és a nyelv tényét úgy
  // mérjük, hogy a HÁROM válasz EGYMÁSTÓL különbözik — nem úgy, hogy egy várt feliratot keresünk
  // (KUKA-237: a próba se égessen be szöveget; KUKA-223: a keresést a NYELVEN kell mérni).
  part('V) R158/3 — a három bekapcsolt nyelv a HATÁRON: súgó-tartalom, GYIK, végigvezetés-szöveg');
  {
    const DB10 = resolve(ROOT, 'var/tmp/v3app_r158_v.sqlite');
    try { rmSync(DB10, { force: true }); rmSync(DB10 + '-wal', { force: true }); rmSync(DB10 + '-shm', { force: true }); } catch { /* nem volt */ }
    const demoVolt2 = process.env.VS_DEMO;
    process.env.VS_DEMO = '1';           // hogy a bemutató-kötött végigvezetések is a mérésben legyenek
    const nyelv = await startServer({ port: 0, dbPath: DB10 });
    try {
      const b10 = `http://127.0.0.1:${nyelv.server.address().port}`;
      const c = new Client(b10);
      await c.post('/api/register', { email: 'v-anna@pelda.hu', password: PW, lang: 'hu' });
      const mail = (await c.get('/dev/mailbox')).body.mails.filter((x) => x.to === 'v-anna@pelda.hu')[0];
      const u10 = new URL(mail.link);
      await c.get(u10.pathname + u10.search);
      await c.post('/api/login', { email: 'v-anna@pelda.hu', password: PW });
      await c.post('/api/workspaces', { name: 'V158 Kft', plan: 'starter', business: { jurisdiction: 'HU', tax_id: '12345678-1-42' } });

      const LANGS = ['hu', 'en', 'de'];
      const idx = {}; const stat = {};
      for (const l of LANGS) {
        idx[l] = (await c.get(`/api/assistant/knowledge?lang=${l}`)).body;
        stat[l] = (await c.get(`/api/assistant/status?lang=${l}`)).body;
      }

      // (v1) MINDHÁROM NYELVEN UGYANANNYI FUNKCIÓ LÁTSZIK — a nyelv nem jogosultság (KUKA-233).
      step('(v1) a látható funkciók köre nyelvtől FÜGGETLEN (a nyelv nem jogosultsági tengely)',
        LANGS.every((l) => idx[l].ok === true && idx[l].visible_count === idx.hu.visible_count && idx[l].population === idx.hu.population)
          && idx.hu.visible_count > 0,
        Object.fromEntries(LANGS.map((l) => [l, `${idx[l].visible_count}/${idx[l].population}`])));

      // (v2) ÉS MINDEN LÁTHATÓ FUNKCIÓNAK VAN CÍME MINDHÁROM NYELVEN — nem üres, nem null.
      const cimHiany = {};
      for (const l of LANGS) {
        cimHiany[l] = idx[l].index.filter((r) => r.visible && !(typeof r.title === 'string' && r.title.trim())).map((r) => r.id);
      }
      step('(v2) minden LÁTHATÓ funkciónak van címe mindhárom nyelven',
        LANGS.every((l) => cimHiany[l].length === 0), Object.fromEntries(LANGS.map((l) => [l, cimHiany[l].length])));

      // (v3) A NYELV TÉNYE: a címek a három nyelven KÜLÖNBÖZNEK. Ha egy nyelv némán alapnyelvre
      //      esne (KUKA-238), ez a sor pirosra vált — és NEM egy várt felirat keresésével.
      const cim = (l) => idx[l].index.filter((r) => r.visible).map((r) => r.title).join('|');
      const kulonbozo = new Set(LANGS.map(cim)).size;
      step('(v3) a három nyelv válasza TÉNYLEGESEN különbözik (nincs néma alapnyelvre esés)',
        kulonbozo === 3, { kulonbozo_valaszok: kulonbozo, hu_elso: idx.hu.index.find((r) => r.visible).title, en_elso: idx.en.index.find((r) => r.visible).title, de_elso: idx.de.index.find((r) => r.visible).title });

      // (v4) A TARTALOM FUNKCIÓNKÉNT: súgó-szöveg + GYIK-szöveg MINDEN látható funkcióra, MINDEN
      //      nyelven. Ez az ÁTADÁSI KAPU (D-VS-3075/3076) határ-oldali ellenőrzése: nem a regiszter
      //      állítását olvassuk, hanem amit a kiszolgáló TÉNYLEGESEN kiad.
      const hiany = { text: [], faq: [] };
      for (const l of LANGS) {
        for (const r of idx[l].index.filter((x) => x.visible)) {
          const d = (await c.get(`/api/assistant/knowledge?lang=${l}&feature=${encodeURIComponent(r.id)}`)).body;
          const t = d.text;
          const KB_MEZOK = ['title', 'purpose', 'prereq', 'result'];
          if (!(t && KB_MEZOK.every((m) => typeof t[m] === 'string' && t[m].trim()))) hiany.text.push(`${l}:${r.id}`);
          const faqIds = (d.feature && d.feature.faq) || [];
          for (const fid of faqIds) {
            const ft = (d.faq_text || {})[fid];
            if (!(ft && typeof ft.q === 'string' && ft.q.trim() && typeof ft.a === 'string' && ft.a.trim())) hiany.faq.push(`${l}:${r.id}:${fid}`);
          }
        }
      }
      step('(v4) MINDEN látható funkció súgó-szövege megvan mindhárom nyelven (cím · cél · előfeltétel · eredmény — a `verify:tutor` szerződése)',
        hiany.text.length === 0, { hianyzo: hiany.text.slice(0, 6), darab: hiany.text.length });
      step('(v5) és MINDEN hozzá kötött GYIK-tétel is (kérdés + válasz, nem üres)',
        hiany.faq.length === 0, { hianyzo: hiany.faq.slice(0, 6), darab: hiany.faq.length });

      // (v6) A VÉGIGVEZETÉSEK: ugyanannyi mindhárom nyelven, és a LÉPÉS-SZÖVEG is megvan — a
      //      bemutató nem indulhat el néma buborékkal egy másik nyelven (KUKA-210).
      const turaHiany = {};
      for (const l of LANGS) {
        turaHiany[l] = (stat[l].tours || []).filter((t) => {
          const txt = t.text || {};
          return !(t.steps || []).every((st) => txt[st.id] && String(txt[st.id].title || '').trim() && String(txt[st.id].body || '').trim());
        }).map((t) => t.id);
      }
      step('(v6) a végigvezetések száma nyelvtől független, és MINDEN lépésnek van címe+törzse mindhárom nyelven',
        LANGS.every((l) => (stat[l].tours || []).length === (stat.hu.tours || []).length && turaHiany[l].length === 0)
          && (stat.hu.tours || []).length > 0,
        Object.fromEntries(LANGS.map((l) => [l, `${(stat[l].tours || []).length} túra · ${turaHiany[l].length} hiányos`])));

      // (v7) AZ OLDALTÉRKÉP a funkciók KÉPERNYŐ-mezőjéből áll: minden látható funkció megnevez egy
      //      lapot, és a lap-lista mindhárom nyelven UGYANAZ (a lapok azonosítója nem fordul le).
      const lapok = (l) => [...new Set(idx[l].index.filter((r) => r.visible).map((r) => r.screen))].sort().join(',');
      step('(v7) az oldaltérkép alapja (a funkciók képernyői) mindhárom nyelven ugyanaz, és nem üres',
        LANGS.every((l) => lapok(l) === lapok('hu')) && lapok('hu').length > 0,
        { lapok: lapok('hu').split(',').length });

      // (v8) A SEGÉD (chat) HELYI VÁLASZT AD MINDHÁROM NYELVEN — modellhívás nélkül, és a válasz
      //      nyelve a KÉRÉS nyelve. A szolgáltatói csonkot KIMONDVA nem használjuk itt: ez a HELYI
      //      út mérése (KUKA-235: amit nem ellenőriztünk, ahhoz nem teszünk igazolás-jelzést).
      const valasz = {};
      for (const l of LANGS) {
        // A kérdés a MEGHÍVÁS funkció SAJÁT címe az adott nyelven — így a kérdés nyelve és a keresés
        // nyelve egybeesik, és egyetlen felirat sincs beégetve a próbába.
        const cel = idx[l].index.find((r) => r.id === 'invite.send' && r.visible) || idx[l].index.find((r) => r.visible);
        const r = await c.post('/api/assistant/ask', { question: String(cel.title), lang: l });
        valasz[l] = r.body;
      }
      step('(v8) a segéd mindhárom nyelven VÁLASZOL a saját nyelvén feltett kérdésre, és a deklarált nyelv a KÉRÉS nyelve',
        LANGS.every((l) => valasz[l] && valasz[l].ok === true && valasz[l].lang === l
          && typeof valasz[l].answer === 'string' && valasz[l].answer.trim().length > 0),
        Object.fromEntries(LANGS.map((l) => [l, valasz[l] && `${valasz[l].ok}/${valasz[l].lang}/${String(valasz[l].answer || '').length} karakter`])));
      step('(v9) és a három válasz SZÖVEGE különbözik (a nyelv nem csak a mezőben áll)',
        new Set(LANGS.map((l) => String((valasz[l] || {}).answer || ''))).size === 3,
        { kulonbozo: new Set(LANGS.map((l) => String((valasz[l] || {}).answer || ''))).size });
    } finally {
      if (demoVolt2 === undefined) delete process.env.VS_DEMO; else process.env.VS_DEMO = demoVolt2;
      await new Promise((r) => nyelv.server.close(r));
    }
  }

  // ── W) R158 — A KÜLSŐ REVIEW TIZENEGY LELETE, MIND GÉPI JELLEL ─────────────────────────────────
  //
  // Ebben a csoportban az R158 köre alatt érkezett Codex-leletek regressziói állnak. Ami mag-próbával
  // vagy mutációval mérhető volt (F158-04: a NaN korú szándék), az OTT áll — ide a HATÁR és a
  // feloldók kerülnek. Minden sor NEVEZI a leletet, hogy a javítás és a bizonyíték ne csúszhasson el.
  part('W) R158 — a külső review leleteinek regressziói (F158-01 … F158-10)');
  {
    // (w1–w2) F158-01/02 — A VISSZATÖLTÉSI CÉL AZONOSSÁGA: ismételt kulcs és szolgáltatás-fájl.
    // PONTOSÍTVA az F158-22-ben: az ÜRES utolsó érték MOST „nem megállapítható" (megállás), nem
    // `source`. Az F158-01 köre az „utolsó, NEM ÜRES érték győz" olvasatot vette alapul; a biztonsági
    // átolvasás kimutatta, hogy az üres érték a libpq-ban AKTÍV felülírás. Ahol a két olvasat MÁST ad,
    // ott megállunk — a lelet eredeti kárát (a `decoy&source` cím `decoy`-nak látszott) ez nem oldja.
    // ÉS MÁSODSZOR IS PONTOSÍTVA (R166/P1): az „utolsó, nem üres érték győz" a libpq olvasata, a
    // node-postgres viszont a `?dbname=`-et EGYÁLTALÁN nem veszi, hanem az UTAT (`decoy`). A két
    // fogyasztó tehát MÁS adatbázist nyit — ezért a név itt sem `source`, hanem NEM MEGÁLLAPÍTHATÓ.
    // A lelet eredeti kára (a cím `decoy`-nak LÁTSZOTT, és a `source`-ra menő `DROP` átment) ezzel
    // ERŐSEBBEN zárva: MOST EGYIK név sem engedi el a kaput.
    const w1 = effectiveDatabase('postgres://u@host/decoy?dbname=decoy&dbname=source', PG_ENV_NELKUL);
    step('(w1) F158-01 + R166/P1: az ISMÉTELT `dbname` kulcsot a libpq veszi (az utolsó, nem üres értéket), a node-postgres viszont az UTAT — a kettő MÁST nyit, tehát a név NEM megállapítható, és a kapu MINDKÉT névre megáll; az ÜRES utolsó érték is MEGÁLLÁS (F158-22)',
      w1.name === null && /KÉT FOGYASZTÓ MÁST olvas/.test(w1.basis)
        && effectiveDatabase('postgres://u@host/decoy?dbname=source&dbname=', PG_ENV_NELKUL).name === null
        && sameDatabase('postgres://u@host/decoy?dbname=decoy&dbname=source', 'source', PG_ENV_NELKUL).same === true
        && sameDatabase('postgres://u@host/decoy?dbname=decoy&dbname=source', 'decoy', PG_ENV_NELKUL).same === true,
      { ismetelt: w1.name,
        utolso_ures: effectiveDatabase('postgres://u@host/decoy?dbname=source&dbname=', PG_ENV_NELKUL).name });
    step('(w2) F158-02: a `?service=` paraméter mellett a forrás NEM megállapítható — és a döntés ÓVATOS megállás',
      effectiveDatabase('postgres://decoy@host/?service=prod').name === null
        && sameDatabase('postgres://decoy@host/?service=prod', 'source').same === true,
      { nev: effectiveDatabase('postgres://decoy@host/?service=prod').name,
        alap: effectiveDatabase('postgres://decoy@host/?service=prod').basis.slice(0, 48) });

    // (w3) F158-07 — A KÉRÉSKORLÁT BEÁLLÍTÁSÁNAK ALAKJA. A hibás érték NEM kapcsolhatja ki a védelmet.
    const naplo = [];
    const cfg = (env) => rateLimitConfig(env, (m) => naplo.push(m));
    const romlott = [{ VS_APP_RATE_WINDOW_MS: 'bogus' }, { VS_APP_RATE_WINDOW_MS: '0' }, { VS_APP_RATE_WINDOW_MS: '-1' }];
    const tortMax = cfg({ VS_APP_RATE_MAX: '0.5', VS_APP_ENV: 'staging' });
    step('(w3) F158-07: a hibás ablak-hossz az ALAPÉRTELMEZÉSRE esik vissza (nem NaN, nem 0), a tört korlát sem megy át, és a napló MEGNEVEZI',
      romlott.every((e) => cfg(e).windowMs === 60000)
        && tortMax.max === 240 && tortMax.enabled === true
        && cfg({ VS_APP_RATE_MAX: '0', VS_APP_ENV: 'staging' }).enabled === false
        && cfg({ VS_APP_RATE_MAX: '100', VS_APP_RATE_WINDOW_MS: '30000' }).max === 100
        && naplo.length >= 4,
      { ablakok: romlott.map((e) => cfg(e).windowMs), tort_max: tortMax.max, naplosorok: naplo.length });

    // (w4) F158-08 — A KULCS-TÉRKÉP KEMÉNY PLAFONJA. A régi alak CSAK a lejártakat vitte; friss
    //      kulcsokkal a térkép a forgalommal nőtt. A csere kimondva: a LEGRÉGEBBEN látott kulcs
    //      számlálója újraindul — ezt MÉRJÜK, nem feltételezzük (KUKA-207).
    let figyelmeztetes = 0;
    const take = makeRateLimiter({ windowMs: 10 ** 9, max: 3, keyCap: 50, warn: () => { figyelmeztetes += 1; } });
    take('regi', 1_000_000); take('regi', 1_000_001);           // a „régi" cím kétszer kért
    for (let i = 0; i < 200; i += 1) take('uj' + i, 1_000_100 + i);
    const regiUjra = take('regi', 1_000_400);
    step('(w4) F158-08: 200 FRISS kulcs 50-es plafonnal — a térkép korlátos marad, és a legrégebben látott cím számlálója újraindul (KIMONDOTT csere)',
      figyelmeztetes > 0 && regiUjra.count === 1,
      { figyelmeztetes, regi_szamlalo_ujra: regiUjra.count });

    // (w5) F158-09 — A JOKER CSAK A NEM EMLÍTETT NYELVEKRE SZÓL (RFC 9110 §12.4.3).
    const nyelvEsetek = [
      ['hu;q=0.5, *;q=1', 'en'], ['*;q=1', 'hu'], ['hu;q=0, *;q=1', 'en'],
      ['en;q=0.8, hu;q=0.5, *;q=1', 'de'], ['hu;q=1, *;q=1', 'hu'],
      ['hu;q=0.5, en;q=0.5, de;q=0.5, *;q=1', 'hu'], ['de-AT;q=0, *;q=1', 'hu'],
    ];
    const nyelvRossz = nyelvEsetek.filter(([h, v]) => pickFromAcceptLanguage(h).code !== v);
    step('(w5) F158-09: a kisebb súllyal KIFEJEZETTEN megnevezett nyelvet a joker NEM választja ki',
      nyelvRossz.length === 0,
      { hibas: nyelvRossz.map(([h, v]) => `${h} → ${pickFromAcceptLanguage(h).code} (elvárt: ${v})`) });

    // (w6) F158-10 — AZ ÁTIRAT ÚTJA A KÖZÖS TISZTÍTÓN MEGY. A `--transcript` bármilyen abszolút utat
    //      hozhat, a leltár pedig megosztásra/commitra készül. A kötés a KÓDON áll, nem ígéreten.
    const expSrc = readFileSync(join(ROOT, 'tools/v3_fogyasztas_export.mjs'), 'utf8');
    step('(w6) F158-10: az exportált `source.path` a `safePath` tisztítón megy át (nem nyers `replace(homedir())`)',
      /source: \{ path: safePath\(file\)/.test(expSrc) && !/path: file\.replace\(homedir/.test(expSrc),
      { safePath: /source: \{ path: safePath\(file\)/.test(expSrc) });

    // (w7–w8) F158-06 és F158-05 — ÉLŐ HATÁRON, KÉT KÜLÖN SZERVERREL.
    const DB11 = resolve(ROOT, 'var/tmp/v3app_r158_w.sqlite');
    try { rmSync(DB11, { force: true }); rmSync(DB11 + '-wal', { force: true }); rmSync(DB11 + '-shm', { force: true }); } catch { /* nem volt */ }
    const idleVolt = process.env.VS_APP_SESSION_IDLE_MS;
    process.env.VS_APP_SESSION_IDLE_MS = '150';          // rövid tétlenségi idő, hogy a lejárat MÉRHETŐ legyen
    const lej2 = await startServer({ port: 0, dbPath: DB11 });
    try {
      const b11 = `http://127.0.0.1:${lej2.server.address().port}`;
      const c11 = new Client(b11);
      await c11.post('/api/invites/pending', { token: 'w-lejarat' });   // névtelen sor + folytatás
      const sorokElotte = lej2.store.all('SELECT session_id FROM pending_intent').length;
      await new Promise((r) => setTimeout(r, 300));                     // a tétlenségi idő FÖLÉ
      await c11.get('/api/me');                                        // a LEJÁRT sütit bemutatjuk
      const sorokUtana = lej2.store.all('SELECT session_id FROM pending_intent').length;
      step('(w7) F158-06: a LEJÁRT munkamenet eldobását is BEJELENTI a tár — az árva folytatás-sor takarítása nem marad el',
        sorokElotte === 1 && sorokUtana === 0, { sorok_elotte: sorokElotte, sorok_utana: sorokUtana });
    } finally {
      if (idleVolt === undefined) delete process.env.VS_APP_SESSION_IDLE_MS; else process.env.VS_APP_SESSION_IDLE_MS = idleVolt;
      await new Promise((r) => lej2.server.close(r));
    }

    const DB12 = resolve(ROOT, 'var/tmp/v3app_r158_w2.sqlite');
    try { rmSync(DB12, { force: true }); rmSync(DB12 + '-wal', { force: true }); rmSync(DB12 + '-shm', { force: true }); } catch { /* nem volt */ }
    const race = await startServer({ port: 0, dbPath: DB12 });
    try {
      const b12 = `http://127.0.0.1:${race.server.address().port}`;
      const c12 = new Client(b12);
      await c12.post('/api/register', { email: 'w-anna@pelda.hu', password: PW, lang: 'hu' });
      const m12 = (await c12.get('/dev/mailbox')).body.mails.filter((x) => x.to === 'w-anna@pelda.hu')[0];
      const u12 = new URL(m12.link);
      await c12.get(u12.pathname + u12.search);
      await c12.post('/api/login', { email: 'w-anna@pelda.hu', password: PW });
      const suti = c12.cookie;
      const port12 = race.server.address().port;
      const arvaOf = () => race.store.all('SELECT session_id FROM pending_intent')
        .filter((r) => !race.sessions.has(String(r.session_id))).length;
      const arvaElotte2 = arvaOf();
      // A LASSÚ, DARABOLT POST a TARTÓS munkamenettel megy, és közben UGYANAZT a sort KIJELENTKEZÉS
      // törli. A tűzés a KISZORÍTÁS ellen véd, a KIMONDOTT törlés ellen nem — ezért kell a
      // használat pillanatában újraellenőrizni (F158-05).
      const lassu2 = await new Promise((resolve3) => {
        const rq = httpReq({ host: '127.0.0.1', port: port12, path: '/api/invites/pending', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked', Cookie: suti } }, (res) => {
          let b = ''; res.on('data', (ch) => { b += ch; });
          res.on('end', () => resolve3({ status: res.statusCode, body: (() => { try { return JSON.parse(b); } catch { return null; } })() }));
        });
        rq.on('error', () => resolve3({ status: 0, body: null }));
        rq.write('{"token":"w-ver');
        setTimeout(async () => {
          await fetch(b12 + '/api/logout', { method: 'POST', headers: { Cookie: suti, 'Content-Type': 'application/json' }, body: '{}' });
          rq.end('seny"}');
        }, 150);
      });
      step('(w8) F158-05: a törzs olvasása közben TÖRÖLT tartós munkamenet nem írhat — a válasz a SAJÁT nevén mond nemet (409 `session_gone`, nem „tár megtelt"), és nem keletkezik ÁRVA sor',
        lassu2.status === 409 && lassu2.body && lassu2.body.reason === 'session_gone' && arvaOf() === arvaElotte2,
        { status: lassu2.status, reason: lassu2.body && lassu2.body.reason, arva_elotte: arvaElotte2, arva_utana: arvaOf() });
    } finally {
      await new Promise((r) => race.server.close(r));
    }
  }

  // ── X) R158 MÁSODIK REVIEW-KÖR — a négy újabb lelet regressziói (F158-12 … F158-15) ─────────────
  part('X) R158 — a második review-kör leletei: a védelem költsége, a jövőbeli idő, az árva sor, a kapu tanúja');
  {
    // (x1) F158-12 (P1) — A KULCS-TAKARÍTÁS NE LEGYEN ERŐSÍTŐ. Az első javításom telt plafonnál MINDEN
    //      új kulcsra RENDEZTE a teljes térképet (a reviewer gépén 20 000 kulcs ~9,5 s), és naplósort is
    //      írt. A mérce SKÁLA-FÜGGETLEN (KUKA-344): négyszeres kulcs-szám legfeljebb ~nyolcszoros idő —
    //      vagyis a költség LINEÁRIS marad, nem négyzetes.
    let naploSor = 0;
    const mer = (db) => {
      const t = makeRateLimiter({ windowMs: 60000, max: 240, keyCap: 5000, warn: () => { naploSor += 1; } });
      const t0 = Date.now();
      for (let i = 0; i < db; i += 1) t('cim' + i, 1_000_000 + i);
      return Date.now() - t0;
    };
    const KAPACITAS = 5000;
    const kicsiDb = 20000; const nagyDb = 80000;      // 15 000 és 75 000 KISZORÍTÁS — a munka egysége ez
    const kicsiMs = mer(kicsiDb); const nagyMs = mer(nagyDb);
    const egysegre = (ms, db) => Math.max(ms, 1) / (db - KAPACITAS);   // a nullára mért idő a mérés alsó határa
    const pKicsi = egysegre(kicsiMs, kicsiDb); const pNagy = egysegre(nagyMs, nagyDb);
    step('(x1) F158-12: a kulcs-plafon takarítása KISZORÍTÁSONKÉNT ÁLLANDÓ költségű (négyszeres munka mellett a kiszorításonkénti idő nem nő kétszeresére) — a védelem nem lett a támadás erősítője',
      pNagy <= pKicsi * 2, { kulcs_kicsi: kicsiDb, ms_kicsi: kicsiMs, kulcs_nagy: nagyDb, ms_nagy: nagyMs,
        kiszoritasonkent_kicsi_ms: Number(pKicsi.toFixed(5)), kiszoritasonkent_nagy_ms: Number(pNagy.toFixed(5)),
        kapacitas: KAPACITAS, reviewer_merese_regi_alakon: '20 000 kulcs ~9500 ms' });
    const kiszoritasok = (kicsiDb - KAPACITAS) + (nagyDb - KAPACITAS);
    step('(x2) F158-12 második fele: a figyelmeztetés sem erősítő — a naplósorok száma a KISZORÍTÁSOKHOZ képest elhanyagolható (ablakonként legfeljebb egy, nem kérésenként)',
      naploSor <= 5 && naploSor * 1000 < kiszoritasok,
      { naplosor_osszesen: naploSor, kiszoritasok, kerésenkenti_naplo_lett_volna: kiszoritasok });
    // ELLENPÁR: a verdikt nem változott — egy címről a korlát ugyanúgy fog.
    const egyCim = makeRateLimiter({ windowMs: 60000, max: 3, keyCap: 5000, warn: () => {} });
    const sorozat = [0, 1, 2, 3, 4].map((i) => egyCim('egy', 2_000_000 + i).allowed);
    step('(x3) ELLENPÁR: a kulcs-plafon nem lazította a korlátot — egy címről 3-as korláttal a negyedik kérés ELAKAD',
      JSON.stringify(sorozat) === JSON.stringify([true, true, true, false, false]), { sorozat });

    // (x4–x5) F158-13 és F158-14 — a JÖVŐBELI és az ÁRVA, ROMLOTT sor. A tár szintjén mérjük, mert a
    //      két eset épp az, amit a HATÁR nem tud előállítani (import, óra-visszaállítás, sérülés).
    const DB13 = resolve(ROOT, 'var/tmp/v3app_r158_x.sqlite');
    try { rmSync(DB13, { force: true }); rmSync(DB13 + '-wal', { force: true }); rmSync(DB13 + '-shm', { force: true }); } catch { /* nem volt */ }
    const xsrv = await startServer({ port: 0, dbPath: DB13 });
    try {
      const xclock = { now: () => '2026-10-06T12:00:00.000Z' };
      const be = (sid, at) => xsrv.store.run('INSERT INTO pending_intent (session_id, invite_token, created_at) VALUES (?,?,?)', sid, 'tok_' + sid, at);
      be('x_jovo', '2099-01-01T00:00:00.000Z');
      const jovoToken = resumeIntent({ store: xsrv.store, sessionId: 'x_jovo', clock: xclock });
      const jovoSor = xsrv.store.get('SELECT 1 AS x FROM pending_intent WHERE session_id = ?', 'x_jovo');
      step('(x4) F158-13: a JÖVŐBELI időbélyegű szándék NEM folytatódik (a negatív kor is lejárt), és a sor eltűnik',
        jovoToken === null && !jovoSor, { token: jovoToken, sor_megvan: Boolean(jovoSor) });

      xsrv.store.run('DELETE FROM pending_intent');
      be('x_arva_romlott', 'bogus'); be('x_arva_jovo', '2099-01-01T00:00:00.000Z'); be('x_friss', '2026-10-06T11:30:00.000Z');
      const xpurge = purgeExpiredIntents({ store: xsrv.store, clock: xclock });
      const xmaradt = xsrv.store.all('SELECT session_id FROM pending_intent').map((r) => r.session_id).sort().join(',');
      step('(x5) F158-14: a HALMAZOS takarítás az ÁRVA, romlott és jövőbeli időbélyegű sort is viszi — a frisset nem',
        xpurge.purged === 2 && xmaradt === 'x_friss', { takaritva: xpurge.purged, maradt: xmaradt });
    } finally {
      await new Promise((r) => xsrv.server.close(r));
    }

    // (x6) F158-15 — A KAPU TANÚJA A MOSTANI FUTÁSHOZ KÖTÖTT. A viselkedés teljes mérése egy TELJES
    //      böngésző-kapu futás (~13 perc), ezért itt a KÖTÉST mérjük a kódon: a jelentés a futtatás
    //      ELŐTT törlődik, ÉS a kezdő időpontját a futás indulásához hasonlítjuk. KIMONDVA: ez
    //      szerkezeti kötés, nem a viselkedés mérése (KUKA-216).
    const gateSrc = readFileSync(join(ROOT, 'tools/vs_verify_browser_gate.mjs'), 'utf8');
    step('(x6) F158-15: a böngésző-kapu a RÉGI jelentést törli a futtatás előtt, és a kezdő időpontot a MOSTANI futáshoz köti (szerkezeti kötés, nem viselkedés-mérés)',
      /rmSync\(REPORT, \{ force: true \}\)/.test(gateSrc)
        && /const futasIndult = Date\.now\(\);/.test(gateSrc)
        && /indulasMs >= futasIndult - 2000/.test(gateSrc),
      { torles: /rmSync\(REPORT/.test(gateSrc), futashoz_kotve: /indulasMs >= futasIndult/.test(gateSrc) });
  }

  part('Y) R158 — a harmadik review-kör leletei: a KÖRNYEZET is bemenet, és a folytatás nem élheti túl a kulcsát');
  {
    // ── (y1–y5) F158-16 (P1) — A LIBPQ KÖRNYEZETI ALAPÉRTÉKEI A TÖRLÉS ELŐTT ─────────────────────
    // A LELET: út nélküli cím + `PGDATABASE=source` esetén a kliens a `source` adatbázist nyitja, a
    // feloldó mégis a cím FELHASZNÁLÓJÁT mondta forrásnak — tehát a kapu „eltér"-t mondott, a lánc
    // elindult, és a `DROP DATABASE "source"` a VALÓDI forrást vitte volna. A környezetet a `pg_dump`
    // ÖRÖKLI, a kapu nem nézte.
    const y1env = { PGDATABASE: 'source' };
    const y1 = effectiveDatabase('postgres://decoy@host', y1env);
    const y1s = sameDatabase('postgres://decoy@host', 'source', y1env);
    const y1ellen = sameDatabase('postgres://decoy@host', 'source', PG_ENV_NELKUL);
    step('(y1) F158-16: `PGDATABASE` dönt, ha a cím nem nevez meg adatbázist — a kapu MEGÁLL (RÉGEN: a cím felhasználója lett a „forrás", és a lánc elindult)',
      y1.name === 'source' && y1s.same === true && y1ellen.same === false,
      { nev: y1.name, megall: y1s.same, ellenpar_env_nelkul: y1ellen.same });

    const y2a = effectiveDatabase('postgres://u@h/vs_eles', { PGDATABASE: 'source' });
    const y2b = effectiveDatabase('postgres://u@h/?dbname=a', { PGDATABASE: 'b' });
    step('(y2) F158-16 ELLENPÁR: a CÍM megelőzi a környezetet (libpq sorrend) — az ÚT mellett a `PGDATABASE` nem szól bele; a `?dbname=` mellett viszont a node-postgres ÉPP a `PGDATABASE`-re esik, a libpq a paraméterre: a kettő eltérése MEGÁLLÁS (R166/P1)',
      y2a.name === 'vs_eles' && y2b.name === null && /KÉT FOGYASZTÓ MÁST olvas/.test(y2b.basis)
      && sameDatabase('postgres://u@h/?dbname=a', 'a', { PGDATABASE: 'b' }).same === true
      && sameDatabase('postgres://u@h/?dbname=a', 'b', { PGDATABASE: 'b' }).same === true,
      { uttal: y2a.name, dbname_parameterrel: y2b.name });

    const y3 = effectiveDatabase('postgres://decoy@host/vs_eles', { PGSERVICE: 'prod' });
    const y3s = sameDatabase('postgres://decoy@host/vs_eles', 'source', { PGSERVICE: 'prod' });
    step('(y3) F158-16: a szolgáltatást a KÖRNYEZET is megnevezheti (`PGSERVICE`) — a válasz ugyanaz, mint a `?service=`-re: NEM megállapítható, tehát megállás',
      y3.name === null && y3s.same === true && /PGSERVICE/.test(y3.basis), { nev: y3.name, megall: y3s.same });

    const y4a = effectiveDatabase('postgres://host/', { PGUSER: 'source' });
    const y4b = effectiveDatabase('postgres://host/', PG_ENV_NELKUL);
    const y4c = effectiveDatabase('postgres://decoy@host', { PGDATABASE: '   ' });
    step('(y4) F158-16: `PGUSER` az utolsó jelölt; ha sem a cím, sem a környezet nem nevez meg, a név NEM TUDHATÓ — és az ÜRES érték nem érték',
      y4a.name === 'source' && y4b.name === null && y4c.name === 'decoy',
      { pguser: y4a.name, semmi: y4b.name, ures_pgdatabase: y4c.name });

    // (y5) A KÖTÉS: a VALÓDI lánc (`proof:pg-durability`) a feloldót MÁSODIK paraméter nélkül hívja,
    //      tehát az alapértelmezésnek a futó folyamat környezetének kell lennie. Ezt VISELKEDÉSSEL
    //      mérjük, nem a kód szövegéből (KUKA-207): átmenetileg beállítjuk, majd visszaállítjuk.
    const y5volt = Object.prototype.hasOwnProperty.call(process.env, 'PGDATABASE') ? process.env.PGDATABASE : null;
    let y5nev = null;
    try {
      process.env.PGDATABASE = 'vs_y5_forras';
      y5nev = effectiveDatabase('postgres://decoy@host').name;
    } finally {
      if (y5volt === null) delete process.env.PGDATABASE; else process.env.PGDATABASE = y5volt;
    }
    step('(y5) F158-16: a feloldó alapértelmezése a FUTÓ folyamat környezete — a valódi lánc (`proof:pg-durability`) így örökli, amit a `pg_dump` is',
      y5nev === 'vs_y5_forras' && effectiveDatabase('postgres://decoy@host').name === 'decoy',
      { beallitott_kornyezettel: y5nev, visszaallitas_utan: effectiveDatabase('postgres://decoy@host').name });

    // ── (y6–y8) F158-17 (P2) — A FOLYTATÁS NEM ÉLHETI TÚL A KULCSÁT ──────────────────────────────
    // A LELET: a kimondott 24 óra a MÁSODIK 12 órában elvileg sem teljesülhetett, mert a sor egyetlen
    // kulcsa a munkamenet, ami 12 óra tétlenség után kiesik — és a kiesés a sort is törli. A szöveg
    // tehát a valóság előtt járt (KUKA-050).
    const ORA = 60 * 60 * 1000;
    let y6hiba = null;
    try { intentTtlMs({}); } catch (e) { y6hiba = String(e && e.message); }
    step('(y6) F158-17: a tényleges türelmi idő a PLAFON és a munkamenet tétlenségi korlátjának KISEBBIKE — és a tétlenségi korlát nélkül NEVEZETTEN elakad (KUKA-238)',
      intentTtlMs({ sessionIdleMs: SESSION_LIMITS.idle_ms }) === SESSION_LIMITS.idle_ms
        && intentTtlMs({ sessionIdleMs: 48 * ORA }) === PENDING_INTENT_TTL_MS
        && /tétlenségi korlátja KÖTELEZŐ/.test(y6hiba || ''),
      { mai_ertek_ora: intentTtlMs({ sessionIdleMs: SESSION_LIMITS.idle_ms }) / ORA,
        hosszu_munkamenettel_ora: intentTtlMs({ sessionIdleMs: 48 * ORA }) / ORA,
        plafon_ora: PENDING_INTENT_TTL_MS / ORA, korlat_nelkul: (y6hiba || '').slice(0, 56) });

    // (y7) A KISZOLGÁLÓ TÉNYLEG EZT HASZNÁLJA, nem a mag plafonját — a határon mérve (KUKA-207), és
    //      MINDKÉT irányban. A tétlenségi korlátot kimondottan állítjuk be, mert a battéria futásához
    //      a fő kiszolgáló korlátja szándékosan nagyon magas (337–338. sor): a mérés a VISELKEDÉST
    //      mérje, ne azt, hogy épp milyen környezetben fut.
    const YDB = resolve(ROOT, 'var/tmp/v3app_r158_y.sqlite');
    try { rmSync(YDB, { force: true }); rmSync(YDB + '-wal', { force: true }); rmSync(YDB + '-shm', { force: true }); } catch { /* nem volt */ }
    const yElozoIdle = process.env.VS_APP_SESSION_IDLE_MS;
    let ysrv = null; let yHosszu = null;
    try {
      process.env.VS_APP_SESSION_IDLE_MS = String(SESSION_LIMITS.idle_ms);   // az ÜZEMI alapérték: 12 óra
      ysrv = await startServer({ port: 0, dbPath: YDB });
      process.env.VS_APP_SESSION_IDLE_MS = String(48 * ORA);                 // és egy HOSSZABB munkamenet
      yHosszu = await startServer({ port: 0, dbPath: ':memory:' });
    } finally {
      if (yElozoIdle === undefined) delete process.env.VS_APP_SESSION_IDLE_MS;
      else process.env.VS_APP_SESSION_IDLE_MS = yElozoIdle;
    }
    try {
      step('(y7) F158-17: a kiszolgáló a SZÁRMAZTATOTT türelmi időt használja — 12 órás munkamenetnél a TÉTLENSÉGI korlát fog (nem a mag 24 órás plafonja), 48 órásnál a PLAFON',
        ysrv.intentTtlMs === SESSION_LIMITS.idle_ms && ysrv.intentTtlMs !== PENDING_INTENT_TTL_MS
          && yHosszu.intentTtlMs === PENDING_INTENT_TTL_MS,
        { rovid_munkamenet_ora: ysrv.intentTtlMs / ORA, hosszu_munkamenet_ora: yHosszu.intentTtlMs / ORA,
          plafon_ora: PENDING_INTENT_TTL_MS / ORA });

      // (y8) A VISELKEDÉS: egy 13 ÓRÁS ÁRVA sor (a munkamenete már nincs) a RÉGI mércével a táblában
      //      maradt — pedig folytatni már nem lehetett —, a mostanival elmegy; a 11 órás marad.
      const yclock = { now: () => '2026-10-06T22:00:00.000Z' };
      const ybe = (sid, ora) => ysrv.store.run('INSERT INTO pending_intent (session_id, invite_token, created_at) VALUES (?,?,?)',
        sid, 'tok_' + sid, new Date(Date.parse(yclock.now()) - ora * ORA).toISOString());
      ybe('y_13h', 13); ybe('y_11h', 11);
      const yregi = purgeExpiredIntents({ store: ysrv.store, clock: yclock, ttlMs: PENDING_INTENT_TTL_MS });
      const yuj = purgeExpiredIntents({ store: ysrv.store, clock: yclock, ttlMs: ysrv.intentTtlMs });
      const ymaradt = ysrv.store.all('SELECT session_id FROM pending_intent').map((r) => r.session_id).sort().join(',');
      step('(y8) F158-17: a 13 ÓRÁS árva folytatás (a munkamenete már nincs) a RÉGI 24 órás mércével BENT MARADT, a mostanival elmegy — a 11 órás marad',
        yregi.purged === 0 && yuj.purged === 1 && ymaradt === 'y_11h',
        { regi_mercevel_takaritva: yregi.purged, mostani_mercevel_takaritva: yuj.purged, maradt: ymaradt });
    } finally {
      await new Promise((r) => ysrv.server.close(r));
      await new Promise((r) => yHosszu.server.close(r));
    }
  }

  part('Z) R158 — a NEGYEDIK review-kör leletei: a használat pillanata, az amortizált pászta, az IDŐPILLANAT');
  {
    const ORA2 = 60 * 60 * 1000;

    // ── (z1–z2) F158-18 (P2) — A KAPU A HASZNÁLAT PILLANATÁT OLVASSA ─────────────────────────────
    // A LELET: a kapu a KÉRÉS ELEJI időbélyeggel kérdezte a tárat, ezért egy lassan feltöltött törzs
    // átvihetett a tétlenségi korláton: a tár a RÉGI pillanatra élőnek mondta a sort, a kezelő írt, és
    // 200-at adott — a következő kérés viszont a valódi időt mérte, és a most írt sort TÖRÖLTE.
    const ZDB = resolve(ROOT, 'var/tmp/v3app_r158_z.sqlite');
    try { rmSync(ZDB, { force: true }); rmSync(ZDB + '-wal', { force: true }); rmSync(ZDB + '-shm', { force: true }); } catch { /* nem volt */ }
    const zElozoIdle = process.env.VS_APP_SESSION_IDLE_MS;
    let zsrv = null;
    try {
      process.env.VS_APP_SESSION_IDLE_MS = '400';       // RÖVID korlát, hogy a lejárat mérhető legyen
      zsrv = await startServer({ port: 0, dbPath: ZDB });
    } finally {
      if (zElozoIdle === undefined) delete process.env.VS_APP_SESSION_IDLE_MS;
      else process.env.VS_APP_SESSION_IDLE_MS = zElozoIdle;
    }
    try {
      const zport = zsrv.server.address().port;
      const zbase = `http://127.0.0.1:${zport}`;
      const zsorok = () => zsrv.store.all('SELECT session_id, invite_token FROM pending_intent');
      // Egy LASSÚ, darabolt POST: a törzs második fele a tétlenségi korlát UTÁN érkezik.
      const zlassu = (suti, keses) => new Promise((res) => {
        const rq = httpReq({ host: '127.0.0.1', port: zport, path: '/api/invites/pending', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked', Cookie: suti || '' } }, (r) => {
          let b = ''; r.on('data', (ch) => { b += ch; });
          r.on('end', () => res({ status: r.statusCode, body: (() => { try { return JSON.parse(b); } catch { return null; } })(),
            suti: (r.headers['set-cookie'] || [''])[0].split(';')[0] }));
        });
        rq.on('error', () => res({ status: 0, body: null, suti: '' }));
        rq.write('{"token":"z-ver');
        setTimeout(() => rq.end('seny"}'), keses);
      });
      // (a) a NYITÓ kérés: tartós munkamenet és egy folytatás-sor
      const zelso = await zlassu('', 5);
      const zsuti = zelso.suti;
      const zelotte = zsorok().length;
      // (b) a LASSÚ kérés: a 700 ms a 400 ms-os korlát FÖLÖTT van
      const zkeso = await zlassu(zsuti, 700);
      step('(z1) F158-18: a tétlenségi korláton ÁTVIVŐ lassú kérés NEM ír (409 `session_gone`) — RÉGEN 200-at adott, és a most írt sort a következő kérés törölte',
        zelso.status === 200 && zkeso.status === 409 && zkeso.body && zkeso.body.reason === 'session_gone'
          && zsorok().length === zelotte,
        { nyito: zelso.status, lassu: zkeso.status, ok: zkeso.body && zkeso.body.reason,
          sorok_elotte: zelotte, sorok_utana: zsorok().length });

      // (z2) ÉS A KAPU MEG IS ÚJÍTJA A SORT: egy a korláton BELÜL maradó kérés után a munkamenet a
      //      kérés VÉGÉTŐL számol — tehát egy 300 ms-os törzs + 300 ms várakozás után MÉG ÉL.
      //      A régi alakban a két 300 ms a kérés ELEJÉTŐL összeadódott (600 > 400), és a sor kiesett.
      const zfriss = await zlassu('', 5);
      const zsuti2 = zfriss.suti;
      const zbelul = await zlassu(zsuti2, 300);
      await new Promise((r) => setTimeout(r, 300));
      const zme = await fetch(`${zbase}/api/me`, { headers: { Cookie: zsuti2 } });
      const zujSuti = (zme.headers.get('set-cookie') || '').includes('vs_session');
      step('(z2) F158-18 második fele: a kapu a HASZNÁLAT pillanatában meg is ÚJÍTJA a sort — a korláton belüli lassú kérés után a munkamenet ÉL (nem kap új sütit)',
        zbelul.status === 200 && zme.status === 200 && zujSuti === false,
        { lassu_de_belul: zbelul.status, kovetkezo_keres: zme.status, uj_sutit_kapott: zujSuti });
    } finally {
      await new Promise((r) => zsrv.server.close(r));
    }

    // ── (z3–z4) F158-19 (P2) — AZ ELUTASÍTOTT FELVÉTEL NEM JÁRJA VÉGIG A TÁRAT ───────────────────
    // (z3) A VISELKEDÉS, idő-mérés NÉLKÜL: a tétlenségi pászta percenként legfeljebb egyszer fut, tehát
    //      ugyanazon a percen belüli második beszúrás NEM söpri újra a lejárt sorokat; a perc után IGEN.
    {
      const t = makeSessionStore({ maxSessions: 100, idleMs: 1000, warn: () => {} });
      // Az ELSŐ beszúrás pászta-jogot használ el (a `nextIdleSweep` nullából indul), és a következő
      // percben már NEM söpör — tehát a lejárt sorok ott maradnak, a tárat nem járjuk végig újra.
      t.set('regi1', { id: 'regi1', subject_id: null }, 1_000_000);
      t.set('regi2', { id: 'regi2', subject_id: null }, 1_000_000);
      t.set('uj1', { id: 'uj1', subject_id: null }, 1_010_000);      // regi1/regi2 ekkor már LEJÁRT
      const percenBelul1 = t.size;
      t.set('uj2', { id: 'uj2', subject_id: null }, 1_010_100);
      t.set('uj3', { id: 'uj3', subject_id: null }, 1_030_000);      // uj1/uj2 ekkor már LEJÁRT
      const percenBelul2 = t.size;
      // A perc UTÁN egyetlen pászta MINDET elviszi — tehát nem „sosem söpör", hanem RITKÍTVA söpör.
      t.set('uj4', { id: 'uj4', subject_id: null }, 1_075_000);
      const percUtan = t.size;
      step('(z3) F158-19: a tétlenségi pászta AMORTIZÁLT — a percen belüli beszúrások nem járják végig a tárat (a lejárt sorok maradnak), a perc után EGY pászta mindet elviszi',
        percenBelul1 === 3 && percenBelul2 === 5 && percUtan === 1,
        { percen_belul_1: percenBelul1, percen_belul_2: percenBelul2, perc_utan: percUtan });

      // (z3b) ELLENPÁR: a PLAFON NEM amortizált — a memória-korláton nem lehet késni. Ugyanazon a
      //       percen belül, pászta-jog nélkül is azonnal érvényesül.
      const c = makeSessionStore({ maxSessions: 3, idleMs: 60 * ORA2, warn: () => {} });
      for (let i = 0; i < 3; i += 1) c.set('be' + i, { id: 'be' + i, subject_id: 'sub' + i }, 2_000_000 + i);
      const capElotte = c.size;
      c.set('nv', { id: 'nv', subject_id: null }, 2_000_010);        // ugyanazon a percen belül
      step('(z3b) F158-19 ELLENPÁR: a PLAFON nem amortizált — ugyanazon a percen belül is AZONNAL érvényesül (a memória-korláton nem lehet késni)',
        capElotte === 3 && c.size === 3 && c.has('nv', 2_000_010) === false,
        { plafon_elotte: capElotte, plafon_utana: c.size, jovevenyt_felvette: c.has('nv', 2_000_010) });

      // (z4) ÉS A KÖLTSÉG NEM NŐ A TÁRRAL (skála-független mérce, KUKA-344): telt, csupa BELÉPETT
      //      táron a jövevény névtelen sort az O(1) rövidre zárás dobja el — a pászta ezt nem
      //      terhelheti újra. A mércét a KÉRÉSENKÉNTI költség ARÁNYA adja, nem egy kézi ms-szám.
      const perKeres = (n, db) => {
        const st = makeSessionStore({ maxSessions: n, idleMs: 60 * ORA2, warn: () => {} });
        for (let i = 0; i < n; i += 1) st.set('be' + i, { id: 'be' + i, subject_id: 'sub' + i }, 1_000_000 + i);
        const t0 = process.hrtime.bigint();
        for (let i = 0; i < db; i += 1) st.set('nv' + i, { id: 'nv' + i, subject_id: null }, 2_000_000 + i);
        return Number(process.hrtime.bigint() - t0) / 1e6 / db;
      };
      const DBZ = 2000;
      const pKicsi = perKeres(20000, DBZ);
      const pNagy = perKeres(80000, DBZ);
      step('(z4) F158-19: az ELUTASÍTOTT felvétel költsége nem nő a tár méretével — négyszeres táron sem lehet négyszeres a kérésenkénti költség (régen: 0,62 → 1,43 ms)',
        pNagy <= Math.max(pKicsi * 4, pKicsi + 0.05) && pNagy < 0.1,
        { kerésenkent_20e_ms: Number(pKicsi.toFixed(5)), kerésenkent_80e_ms: Number(pNagy.toFixed(5)),
          regi_alakon_mert: '20 000 → 0,6217 ms · 80 000 → 1,4320 ms' });
    }

    // ── (z5–z7) F158-20 (P2) — AZ IDŐT IDŐPILLANATKÉNT VETJÜK ÖSSZE ──────────────────────────────
    {
      const zsrv2 = await startServer({ port: 0, dbPath: ':memory:' });
      try {
        const eltolt = { now: () => '2026-10-06T01:00:00+02:00' };   // UGYANAZ a pillanat, MÁS alak
        rememberIntent({ store: zsrv2.store, sessionId: 'z_eltolas', token: 'tok_friss', clock: eltolt });
        const tarolt = zsrv2.store.get('SELECT created_at FROM pending_intent WHERE session_id = ?', 'z_eltolas').created_at;
        const p1 = purgeExpiredIntents({ store: zsrv2.store, clock: eltolt });
        step('(z5) F158-20: az ÍRÁS kanonikus UTC alakot tárol, és a friss, eltolásos órával írt sor NEM tűnik el — RÉGEN a takarítás jövőbelinek minősítette és TÖRÖLTE',
          tarolt === '2026-10-05T23:00:00.000Z' && p1.purged === 0
            && zsrv2.store.all('SELECT session_id FROM pending_intent').length === 1,
          { tarolt_alak: tarolt, takaritva: p1.purged });

        // (z6) IMPORTÁLT sorok: a nem kanonikus alakot IDŐPILLANATKÉNT ítéljük meg — a FRISS marad.
        zsrv2.store.run('DELETE FROM pending_intent');
        const zbe = (sid, at) => zsrv2.store.run('INSERT INTO pending_intent (session_id, invite_token, created_at) VALUES (?,?,?)', sid, 'tok', at);
        zbe('z_import_friss_eltolas', '2026-10-06T01:00:00+02:00');
        zbe('z_import_romlott', 'bogus');
        zbe('z_import_jovo', '2099-01-01T00:00:00.000Z');
        zbe('z_import_regi', '2026-10-04T00:00:00.000Z');
        const p2 = purgeExpiredIntents({ store: zsrv2.store, clock: eltolt });
        const maradt = zsrv2.store.all('SELECT session_id FROM pending_intent').map((r) => r.session_id).sort().join(',');
        step('(z6) F158-20: a NEM kanonikus sort időpillanatként ítéljük meg — a romlott, a jövőbeli és a lejárt megy, a FRISS eltolásos MARAD',
          p2.purged === 3 && p2.odd_purged === 1 && maradt === 'z_import_friss_eltolas',
          { takaritva: p2.purged, nem_kanonikus_sor: p2.odd_rows, abbol_takaritva: p2.odd_purged, maradt });

        // (z7) ELLENPÁR: a nem értelmezhető óra NEVEZETTEN elakad — nem tárolunk megítélhetetlen kort.
        let zhiba = null;
        try { rememberIntent({ store: zsrv2.store, sessionId: 'z_rossz', token: 't', clock: { now: () => 'nem-egy-idopont' } }); }
        catch (e) { zhiba = String(e && e.message); }
        // ── (z8–z9) F158-21 (P2) — A DIAGNOSZTIKA IS A TISZTÍTÓN MEGY ──────────────────────────
        // A LELET: a `source.path`-ot átvezettem a tisztítón (F158-10), a HIBA-ÁGAK viszont nyers
        // `replace(homedir(), '~')`-szal írták ki az utat — egy repón ÉS HOME-on kívüli
        // `--transcript` teljes abszolút útja a terminálra és a CI-naplóba került.
        const zt = mkdtempSync(join(tmpdir(), 'vs-kulso-'));
        try {
          const titkos = join(zt, 'telepites', 'ugyfel_titkos_nev');
          mkdirSync(titkos, { recursive: true });
          const futtatZ = (extra) => {
            try {
              execFileSync(process.execPath, [join(ROOT, 'tools/v3_fogyasztas_export.mjs'),
                '--session', 'ffffffff-0000-4000-8000-00000000000a', '--from', '2026-01-01T00:00:00Z',
                '--to', '2026-01-02T00:00:00Z', '--out', join(zt, 'kimenet'), ...extra],
                { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
              return { kod: 0, hiba: '' };
            } catch (e) { return { kod: e.status, hiba: String(e.stderr || '') }; }
          };
          const kulso = futtatZ(['--transcript', join(titkos, 'nincs.jsonl')]);
          step('(z8) F158-21: a HIBA-ÁG útja is a tisztítón megy — a repón ÉS HOME-on kívüli út NEM kerül a naplóba (RÉGEN a teljes abszolút út kiíródott)',
            kulso.kod === 2 && !kulso.hiba.includes('ugyfel_titkos_nev') && !kulso.hiba.includes(titkos)
              && /ELREJTVE/.test(kulso.hiba),
            { kilepes: kulso.kod, titkos_konyvtarnev_a_naploban: kulso.hiba.includes('ugyfel_titkos_nev'),
              uzenet: kulso.hiba.split('\n')[0].slice(0, 72) });

          // ELLENPÁR: a REPÓN BELÜLI út továbbra is LÁTSZIK — a tisztítás nem teszi használhatatlanná
          // a hibaüzenetet (KUKA-201: a nemleges válasz vigye a működő folytatást).
          const belso = futtatZ(['--transcript', 'var/tmp/nincs_ilyen_atirat.jsonl']);
          step('(z9) F158-21 ELLENPÁR: a repón BELÜLI út a hibaüzenetben továbbra is LÁTSZIK — a tisztítás nem teszi használhatatlanná a hibát',
            belso.kod === 2 && /var\/tmp\/nincs_ilyen_atirat\.jsonl/.test(belso.hiba),
            { kilepes: belso.kod, uzenet: belso.hiba.split('\n')[0].slice(0, 80) });
          // (z10) ÉS A KÉT SZABÁLY EGYÜTT (KUKA-319 + F158-21): a kétértelműség listája MEGNEVEZI a
          //       jelölteket (különben nem lehet választani), de a `--projects` GYÖKERET nem írja ki.
          const ketert = join(zt, 'ketertelmu');
          for (const nev of ['-projekt-egy', '-projekt-ketto']) {
            mkdirSync(join(ketert, nev), { recursive: true });
            writeFileSync(join(ketert, nev, 'ffffffff-0000-4000-8000-00000000000b.jsonl'), '{"type":"assistant"}\n');
          }
          let kk = { kod: 0, hiba: '' };
          try {
            execFileSync(process.execPath, [join(ROOT, 'tools/v3_fogyasztas_export.mjs'),
              '--session', 'ffffffff-0000-4000-8000-00000000000b', '--projects', ketert,
              '--from', '2026-01-01T00:00:00Z', '--to', '2026-01-02T00:00:00Z', '--out', join(zt, 'ki2')],
              { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
          } catch (e) { kk = { kod: e.status, hiba: String(e.stderr || '') }; }
          step('(z10) F158-21 + KUKA-319 EGYÜTT: a kétértelműség listája MEGNEVEZI a jelölteket (választható marad), de a `--projects` GYÖKERET nem írja ki',
            kk.kod === 2 && /KÉTÉRTELMŰ ÁTIRAT/.test(kk.hiba)
              && /projekt-egy/.test(kk.hiba) && /projekt-ketto/.test(kk.hiba) && !kk.hiba.includes(ketert),
            { kilepes: kk.kod, megnevezte_mindkettot: /projekt-egy/.test(kk.hiba) && /projekt-ketto/.test(kk.hiba),
              gyoker_a_naploban: kk.hiba.includes(ketert) });
        } finally { rmSync(zt, { recursive: true, force: true }); }

        step('(z7) F158-20 ELLENPÁR: a nem értelmezhető órával az ÍRÁS nevezetten elakad — nincs néma, megítélhetetlen korú sor (KUKA-238)',
          /nem értelmezhető időpontot adott/.test(zhiba || '')
            && !zsrv2.store.get('SELECT 1 AS x FROM pending_intent WHERE session_id = ?', 'z_rossz'),
          { hiba: (zhiba || '').slice(0, 64), sor_keletkezett: Boolean(zsrv2.store.get('SELECT 1 AS x FROM pending_intent WHERE session_id = ?', 'z_rossz')) });
      } finally {
        await new Promise((r) => zsrv2.server.close(r));
      }
    }
  }

  part('AA) R158 — az ÖTÖDIK review-kör leletei: az üres felülírás, a regionális említés, a betű-érzékeny alak');
  {
    // ── (aa1–aa2) F158-22 (P1, BIZTONSÁGI) — AZ ÜRES ÉRTÉK IS FELÜLÍRÁS ──────────────────────────
    // A LELET: a libpq az ÜRES `?dbname=` felülírást IS eltárolja, és a nevet a FELHASZNÁLÓRA oldja
    // fel. A feloldóm az üres értéket kiszűrte, tehát az ÚTRA (`decoy`) esett vissza — a `pg_dump`
    // viszont a `source`-ot olvasta volna, és a `DROP DATABASE "source"` a VALÓDI forrást viszi.
    const aa1 = effectiveDatabase('postgres://source@host/decoy?dbname=', PG_ENV_NELKUL);
    const aa1s = sameDatabase('postgres://source@host/decoy?dbname=', 'source', PG_ENV_NELKUL);
    step('(aa1) F158-22: az ÜRES `?dbname=` felülírás mellett a név NEM megállapítható — a kapu MEGÁLL (RÉGEN: az útra esett vissza, és a lánc elindult)',
      aa1.name === null && aa1s.same === true && /ÜRES/.test(aa1.basis)
        && effectiveDatabase('postgres://u@host/decoy?dbname=source&dbname=', PG_ENV_NELKUL).name === null,
      { nev: aa1.name, megall: aa1s.same, ismetelt_utolso_ures: effectiveDatabase('postgres://u@host/decoy?dbname=source&dbname=', PG_ENV_NELKUL).name });

    step('(aa2) F158-22 ELLENPÁROK: a JOGOS esetek változatlanok — a `?user=` adja a nevet, és az ÚT továbbra is a lánc jogos indulását; a két nem üres `dbname` ismétlés viszont az R166/P1 óta MEGÁLLÁS, mert a node-postgres az UTAT nyitja',
      effectiveDatabase('postgres://u@host/decoy?dbname=decoy&dbname=source', PG_ENV_NELKUL).name === null
        && effectiveDatabase('postgres://decoy@host/?user=source', PG_ENV_NELKUL).name === 'source'
        && sameDatabase('postgres://u:p@h/vs_eles', 'vs_visszatoltes_proba', PG_ENV_NELKUL).same === false
        && effectiveDatabase('postgres://source_user:pw@host/?user=', PG_ENV_NELKUL).name === null,
      { ismetelt: effectiveDatabase('postgres://u@host/decoy?dbname=decoy&dbname=source', PG_ENV_NELKUL).name,
        user_parameterrel: effectiveDatabase('postgres://decoy@host/?user=source', PG_ENV_NELKUL).name,
        ures_user_felulirja_a_cim_felhasznalojat: effectiveDatabase('postgres://source_user:pw@host/?user=', PG_ENV_NELKUL).name });

    // ── (aa3) F158-23 (P2) — A POZITÍV TARTOMÁNY ARRA IS „EMLÍTÉS", AMIRE FELOLDÓDIK ─────────────
    const nyelvEsetek = [
      ['hu-HU;q=0.5, *;q=1', 'en'],          // A LELET: régen `hu` — a joker felminősítette a 0,5-es kérést
      ['en-GB;q=0.3, *;q=1', 'hu'],          // ellenpár: a `hu` tényleg EMLÍTÉS NÉLKÜLI
      ['hu;q=0.5, *;q=1', 'en'],             // a korábbi kör (F158-09) esete változatlan
      ['xx-YY;q=0.5, *;q=1', 'hu'],          // ellenpár: ISMERETLEN címke NEM „említi" az alapnyelvet
      ['de-AT;q=0, de;q=1', 'de'],           // ellenpár: a KIZÁRÁS pontossága változatlan (KUKA-330)
      ['hu;q=1, *;q=1', 'hu'],               // ellenpár: egyenlő súlynál a kifejezett előbb
    ];
    const nyelvHibas = nyelvEsetek.filter(([h, v]) => pickFromAcceptLanguage(h).code !== v)
      .map(([h, v]) => `${h} → ${pickFromAcceptLanguage(h).code} (várt: ${v})`);
    step('(aa3) F158-23: a joker a REGIONÁLIS alakban megnevezett nyelvet sem választja ki (a pozitív tartomány arra is említés, amire feloldódik) — és a kizárás pontossága változatlan',
      nyelvHibas.length === 0, { hibas: nyelvHibas });

    // ── (aa4) F158-24 (P2) — A KANONIKUS ALAK VIZSGÁLATA BETŰ-ÉRZÉKENY ───────────────────────────
    // A LELET: a `node:sqlite` `LIKE`-ja kis/nagybetű-érzéketlen, ezért egy `…t…z` alakú FRISS,
    // értelmezhető sor kanonikusnak látszott, és a szöveges összevetés jövőbelinek minősítve TÖRÖLTE
    // — PostgreSQL-en ugyanaz a sor megmaradt. A takarítás viselkedése a TÁROLÓTÓL függött.
    const aasrv = await startServer({ port: 0, dbPath: ':memory:' });
    try {
      const aaclock = { now: () => '2026-10-06T22:00:00.000Z' };
      const aabe = (sid, at) => aasrv.store.run('INSERT INTO pending_intent (session_id, invite_token, created_at) VALUES (?,?,?)', sid, 'tok', at);
      aabe('aa_kisbetus_friss', '2026-10-06t21:30:00.000z');
      aabe('aa_kisbetus_lejart', '2026-10-04t00:00:00.000z');
      aabe('aa_nagybetus_friss', '2026-10-06T21:30:00.000Z');
      aabe('aa_nagybetus_lejart', '2026-10-04T00:00:00.000Z');
      aabe('aa_romlott', 'bogus');
      const aap = purgeExpiredIntents({ store: aasrv.store, clock: aaclock });
      const aamaradt = aasrv.store.all('SELECT session_id FROM pending_intent').map((r) => r.session_id).sort().join(',');
      step('(aa4) F158-24: a KISBETŰS, FRISS sor MEGMARAD (az időpillanat-ágra kerül), a kisbetűs LEJÁRT elmegy — a takarítás viselkedése nem függ a tároló `LIKE`-jának betű-érzékenységétől',
        aamaradt === 'aa_kisbetus_friss,aa_nagybetus_friss' && aap.purged === 3 && aap.odd_rows === 3 && aap.odd_purged === 2,
        { maradt: aamaradt, takaritva: aap.purged, nem_kanonikus_sor: aap.odd_rows, abbol_takaritva: aap.odd_purged });
    } finally {
      await new Promise((r) => aasrv.server.close(r));
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // AC — A VÉDETT NÉVTELEN SOROKKAL TELT TÁR FELVÉTELE O(1) (R164, KÜLSŐ REVIEW, Codex, P1)
  //
  // A LELET: az F154-17-es rövidre zárás CSAK `anonOthers === 0` mellett állt, tehát egy támadó, aki
  // a tárat FOLYTATÁST HORDOZÓ (védett) névtelen sorokkal tölti tele — amit hitelesítés NÉLKÜL
  // megtehet —, minden további kérésnél kifizettette velünk a teljes védett-lista kérdést és a teljes
  // térkép RENDEZÉSÉT, hogy a végén mégis csak a beszúrt sort dobjuk el.
  //
  // A MÉRÉS JELE A HÍVÁS-SZÁM, NEM AZ ÓRA (KUKA-344): azt mérjük, hányszor kérdezzük meg a védett
  // listát. Ez a gépen és a terhelésen FÜGGETLEN jel — egy időkorlát ugyanezen a futtatón ingadozna.
  {
    const CAP = 200;
    let kerdesek = 0;
    const mk = (intentIndex) => makeSessionStore({
      maxSessions: CAP, idleMs: 60_000, warn: () => {}, intentIndex,
      protectedIds: (ids) => { kerdesek += 1; return new Set(ids.map(String)); },  // MINDEN jelölt védett
    });
    const T0 = 1_000_000;
    const toltes = (st, jelol) => {
      for (let i = 0; i < CAP; i += 1) {
        st.set(`v${i}`, { id: `v${i}`, subject_id: null }, T0 + i);
        if (jelol) st.markIntent(`v${i}`);
      }
    };
    // (ac1) A BEJELENTŐS TÁR: a felvételek EGYETLEN védett-lista kérdést sem futtatnak.
    kerdesek = 0;
    const be = mk(true);
    toltes(be, true);
    const kerdesekToltesUtan = kerdesek;
    for (let i = 0; i < 50; i += 1) be.set(`uj${i}`, { id: `uj${i}`, subject_id: null }, T0 + CAP + i);
    const indexelt = kerdesek - kerdesekToltesUtan;
    // (ac2) A BEJELENTŐ NÉLKÜLI TÁR: ugyanaz a forgalom MINDEN felvételnél megkérdezi a listát.
    kerdesek = 0;
    const ki = mk(false);
    toltes(ki, false);
    const kerdesekToltesUtan2 = kerdesek;
    for (let i = 0; i < 50; i += 1) ki.set(`uj${i}`, { id: `uj${i}`, subject_id: null }, T0 + CAP + i);
    const indexNelkul = kerdesek - kerdesekToltesUtan2;
    step('(ac1) F164-07: VÉDETT névtelen sorokkal TELT táron az ötven felvétel EGYETLEN védett-lista kérdést sem futtat (a növekményes index O(1)-ben dönt)',
      indexelt === 0 && be.stats().intent_index_trusted === true && be.stats().intent_indexed === CAP,
      { kerdesek_a_felvetelekre: indexelt, indexelt_sorok: be.stats().intent_indexed, bizhato: be.stats().intent_index_trusted });
    step('(ac2) F164-07 ELLENPÁR: bejelentő NÉLKÜL ugyanaz a forgalom MINDEN felvételnél megkérdezi a listát — tehát a javítás TÉNYLEGESEN az indexen múlik, nem más változáson',
      indexNelkul >= 50, { kerdesek_a_felvetelekre: indexNelkul });
    /**
     * (ac3) ÉS A VÉDETT SOROK TÚLÉLIK: a beszúrt, ÜRES sor megy, nem egy folytatást hordozó.
     *
     * A SZINTETIKUS ÓRÁT AZ OLVASÁSNAK IS ÁT KELL ADNI (saját lelet a mérés írásán): a `has()` is
     * KAPU — a lejárt sort nem adja vissza, és EL IS DOBJA (F154-07). Valós órával kérdezve a
     * szintetikus időbélyegű sorok mind „lejártnak" látszottak, és a MÉRÉS MAGA dobta el őket
     * (0 megmaradt védett sor) — a rendszer ép volt, a mérés nem (KUKA-216).
     */
    const MOSTANI = T0 + CAP + 200;
    const megvan = Array.from({ length: CAP }, (_, i) => be.has(`v${i}`, MOSTANI)).filter(Boolean).length;
    step('(ac3) F164-07: a folytatást hordozó sorok TÚLÉLIK az elárasztást — a beszúrt, üres sor megy el',
      megvan === CAP && be.stats().evicted_cap_anonymous >= 50,
      { megmaradt_vedett: megvan, kiszoritott_nevtelen: be.stats().evicted_cap_anonymous });
    // (ac4) A HALMAZOS TAKARÍTÁS UTÁN AZ INDEX NEM BÍZHATÓ — és a következő felvétel megkérdezi a listát.
    be.intentsPurged();
    kerdesek = 0;
    be.set('uj_purge_utan', { id: 'uj_purge_utan', subject_id: null }, MOSTANI + 1);
    step('(ac4) F164-07: a halmazos takarítás után az index NEM bízható, és a következő felvétel MEGKÉRDEZI a listát (a nem tudás a drágább, de IGAZ útra esik)',
      kerdesek >= 1, { kerdesek_a_purge_utan: kerdesek, bizhato: be.stats().intent_index_trusted });
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // AD — A PROXY-HATÁR: MELYIK FEJLÉC HORDOZZA A LÁTOGATÓ CÍMÉT (F164-08, külső review, Codex, P1)
  //
  // A LELET: a bízott proxy mögül CSAK az `X-Forwarded-For`-t olvastuk. Ha a szolgáltató más fejlécben
  // adja a címet (a reviewer a Railway dokumentációját idézi: `X-Real-IP`), akkor a feloldás a PROXY
  // kapcsolat-címére esett vissza — vagyis MINDEN látogató UGYANABBA a kéréskorlát-kosárba került, és
  // szerény összforgalom is kizárta az EGÉSZ szolgáltatást.
  //
  // A MÉRÉS ALAKJA: tiszta függvényen, hamisított kérés-objektumokkal — nincs hálózat, nincs óra.
  {
    const kerés = (headers, socket = '10.0.0.1') =>
      ({ headers, socket: { remoteAddress: socket } });
    const BIZALOM = { VS_APP_TRUST_PROXY: '1' };

    // (ad1) A történelmi alak VÁLTOZATLANUL működik — az `X-Forwarded-For` lánc ELSŐ eleme.
    const ad1 = clientAddressOf(kerés({ 'x-forwarded-for': '203.0.113.7, 10.9.9.9' }), BIZALOM);
    step('(ad1) F164-08: a bízott proxy mögül az `X-Forwarded-For` lánc ELSŐ eleme a cím (a régi viselkedés megmarad)',
      ad1.key === '203.0.113.7' && ad1.decided === true && ad1.header === 'x-forwarded-for',
      { kulcs: ad1.key, alap: ad1.basis, fejlec: ad1.header });

    // (ad2) A LELET MAGA: `X-Forwarded-For` NÉLKÜL az `X-Real-IP` hozza a címet — nem a proxy címe.
    const ad2 = clientAddressOf(kerés({ 'x-real-ip': '198.51.100.22' }), BIZALOM);
    step('(ad2) F164-08: `X-Forwarded-For` NÉLKÜL az `X-Real-IP` a cím — RÉGEN itt a PROXY kapcsolat-címe jött, tehát minden látogató EGY kosárba került',
      ad2.key === '198.51.100.22' && ad2.decided === true && ad2.header === 'x-real-ip' && ad2.key !== '10.0.0.1',
      { kulcs: ad2.key, alap: ad2.basis, fejlec: ad2.header });

    // (ad3) ÉS A KÁR MÉRÉSE: két KÜLÖN látogató két KÜLÖN kosárba kerül — a régi úton egybe estek.
    const ad3a = clientAddressOf(kerés({ 'x-real-ip': '198.51.100.22' }), BIZALOM);
    const ad3b = clientAddressOf(kerés({ 'x-real-ip': '198.51.100.23' }), BIZALOM);
    const ad3regi = (r) => String(r.headers['x-forwarded-for'] || '').split(',')[0].trim()
      || r.socket.remoteAddress;   // a JAVÍTÁS ELŐTTI feloldó, szó szerint
    step('(ad3) F164-08: két KÜLÖN látogató két KÜLÖN kosárba kerül — a javítás ELŐTTI feloldó mindkettőt a proxy címére vitte (ellenpár ugyanazon a bemeneten)',
      ad3a.key !== ad3b.key && ad3regi(kerés({ 'x-real-ip': '198.51.100.22' })) === ad3regi(kerés({ 'x-real-ip': '198.51.100.23' })),
      { ma: `${ad3a.key} ≠ ${ad3b.key}`, regen: ad3regi(kerés({ 'x-real-ip': '198.51.100.22' })) });

    // (ad4) A DEKLARÁLT FEJLÉC KIZÁRÓLAGOS: ami nincs megnevezve, azt nem olvassuk — a hamisítás ellen.
    const ad4 = clientAddressOf(
      kerés({ 'x-forwarded-for': '1.2.3.4', 'x-real-ip': '198.51.100.22' }),
      { ...BIZALOM, VS_APP_CLIENT_IP_HEADER: 'X-Real-IP' });
    step('(ad4) F164-08: ha a telepítés MEGNEVEZI a fejlécet, KIZÁRÓLAG azt olvassuk — a hamisított `X-Forwarded-For` nem nyer (a név kis/nagybetűre érzéketlen)',
      ad4.key === '198.51.100.22' && ad4.basis === 'deklaralt-fejlec',
      { kulcs: ad4.key, alap: ad4.basis });

    // (ad5) ÉS AZ ALAP KIMONDOTT: deklaráció nélkül a bizalom „kikövetkeztetett", nem „deklarált".
    step('(ad5) F164-08: deklaráció NÉLKÜL a feloldás alapja KIKÖVETKEZTETETT — a jelentés tudja, hogy a bizalom gyengébb, mint amilyennek látszik',
      ad1.basis === 'kikovetkeztetett-fejlec' && ad2.basis === 'kikovetkeztetett-fejlec',
      { ad1: ad1.basis, ad2: ad2.basis });

    // (ad6) BÍZOTT PROXY, DE SEMMILYEN CÍM-FEJLÉC: NEVEZETTEN nem cím — és nem a puszta socket-cím.
    const ad6 = clientAddressOf(kerés({}), BIZALOM);
    step('(ad6) F164-08: bízott proxy mögül cím-fejléc NÉLKÜL a kulcs NEVEZETTEN nem látogató-cím (előtaggal), és a döntés NEM eldöntött',
      ad6.decided === false && ad6.key.startsWith(PROXY_WITHOUT_ADDRESS_PREFIX) && ad6.key !== '10.0.0.1',
      { kulcs: ad6.key, alap: ad6.basis });

    // (ad7) A BIZALOM NÉLKÜLI ESET VÁLTOZATLAN: a fejléceket NEM olvassuk, akkor sem, ha ott vannak.
    const ad7 = clientAddressOf(kerés({ 'x-forwarded-for': '9.9.9.9', 'x-real-ip': '8.8.8.8' }), {});
    step('(ad7) F164-08 ELLENPÁR: proxy-bizalom NÉLKÜL egyik fejlécet sem olvassuk — a kapcsolat címe az igazság (a hamisítás elleni erő megmarad)',
      ad7.key === '10.0.0.1' && ad7.basis === 'kapcsolat' && ad7.header === null,
      { kulcs: ad7.key, alap: ad7.basis });

    // (ad8) A HIBA KIMONDÁSA EGYSZERI — a költség nem nő a forgalommal (KUKA-290).
    resetProxyWarning();
    const naplo = [];
    const elso = mondjaKiEgyszerAProxyHibat((m) => naplo.push(m));
    const masodik = mondjaKiEgyszerAProxyHibat((m) => naplo.push(m));
    const harmadik = mondjaKiEgyszerAProxyHibat((m) => naplo.push(m));
    step('(ad8) F164-08: a konfigurációs hibát a szolgáltatás EGYSZER mondja ki, nem kérésenként — és a szöveg MEGNEVEZI a beállítandó értéket',
      elso === true && masodik === false && harmadik === false && naplo.length === 1
      && naplo[0].includes('VS_APP_CLIENT_IP_HEADER') && CLIENT_IP_HEADERS.every((h) => naplo[0].includes(h)),
      { kimondva_hanyszor: naplo.length, megnevezi_a_beallitast: naplo[0].includes('VS_APP_CLIENT_IP_HEADER') });
    resetProxyWarning();

    // (ad9) ÉS A RÉGI BELÉPŐ UGYANAZT ADJA, AMIT A KULCS — a két út nem válhat szét (KUKA-003).
    step('(ad9) F164-08: a `clientIpOf` belépő PONTOSAN a feloldó kulcsát adja — egy szabály, egy válasz',
      clientIpOf(kerés({ 'x-real-ip': '198.51.100.22' }), BIZALOM) === ad2.key
      && clientIpOf(kerés({}), BIZALOM) === ad6.key,
      { egyezik: true });
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // AE — AZ R164 MÁSODIK REVIEW-KÖRÉNEK TISZTA DÖNTÉSEI (F164-09 … F164-14)
  //
  // Hat lelet, aminek a döntése TISZTA függvény — tehát a söprésben is piros lesz, nem csak kézi
  // futtatáson (KUKA-207). A hetediket (a forrás-pillanatkép) a `proof:pg-restore-safety` méri valódi
  // PostgreSQL-en, a nyolcadikat (a címsor) a böngészős kapu.
  {
    // ── (ae1) CSAK AZ ABSZOLÚT ÚT SOCKET — a PONTTAL kezdődő gazdagép NEM helyi (F164-09, P1) ─────
    const ae_pont = localOnlyVerdict('postgres://u@localhost/db?host=.belso.pelda.hu', {});
    const ae_socket = localOnlyVerdict('postgres://u@localhost/db?host=/var/run/postgresql', {});
    const ae_hurok = localOnlyVerdict('postgres://u@127.0.0.1:5432/db', {});
    const ae_tavoli = localOnlyVerdict('postgres://u@db.pelda.hu/db', {});
    step('(ae1) F164-09: a PONTTAL kezdődő gazdagép NEM helyi (a PostgreSQL csak az ABSZOLÚT utat kezeli socketként) — a destruktív próbák kapuja zár',
      ae_pont.allowed === false && ae_socket.allowed === true && ae_hurok.allowed === true && ae_tavoli.allowed === false,
      { pontos: ae_pont.allowed, socket: ae_socket.allowed, hurok: ae_hurok.allowed, tavoli: ae_tavoli.allowed });

    // ── (ae2) A CLI-KÖRNYEZET TISZTELI A `?host=` FELÜLÍRÁST (F164-10, 2× P2) ─────────────────────
    const ae_url = 'postgres://u:p@localhost:5432/forras?host=/var/run/pg-alt';
    // A `PGSERVICE` NEM ide tartozik: azt a gazdagép-feloldó már NEM ELDÖNTHETŐ-nek mondja (ae3) —
    // ez SAJÁT lelet a mérés írásán: az első alakom ezt adta be, és a próba a FAIL-CLOSED ágra esett,
    // vagyis a rendszer volt helyes, a mérés nem (KUKA-216). A törlést a `PGSERVICEFILE` méri.
    const ae_env = cliEnvFor({ sourceUrl: ae_url, database: 'cel', env: { PGSERVICEFILE: 'y', PGSERVICE: undefined } });
    const ae_regi = new URL(ae_url).hostname;          // a JAVÍTÁS ELŐTTI feloldó, szó szerint
    step('(ae2) F164-10: a parancssori kliens a `?host=` FELÜLÍRÁST kapja, nem a cím autoritás-gazdagépét — és a `service` változókat NEM kapja meg',
      ae_env.ok === true && ae_env.env.PGHOST === '/var/run/pg-alt' && ae_regi === 'localhost'
      && ae_env.env.PGDATABASE === 'cel' && ae_env.env.PGSERVICEFILE === undefined
      && ae_env.env.PGPORT === '5432' && ae_env.env.PGUSER === 'u' && ae_env.env.PGPASSWORD === 'p',
      { ma: ae_env.ok ? ae_env.env.PGHOST : ae_env.reason, regen: ae_regi });

    // ── (ae3) ÉS FAIL-CLOSED: ami nem eldönthető, arra NEM ad környezetet ────────────────────────
    const ae_service = cliEnvFor({ sourceUrl: 'postgres://u@localhost/db?service=prod', env: {} });
    const ae_uresPort = cliEnvFor({ sourceUrl: 'postgres://u@localhost:5432/db?port=', env: {} });
    const ae_tobb = cliEnvFor({ sourceUrl: 'postgres://u@localhost/db?host=a,b', env: {} });
    step('(ae3) F164-10: a nem eldönthető cím NEM kap környezetet (szolgáltatás · ÜRES port-felülírás · több gazdagép) — a hívó megáll, nem tippel',
      ae_service.ok === false && ae_uresPort.ok === false && ae_tobb.ok === false
      && [ae_service, ae_uresPort, ae_tobb].every((r) => typeof r.reason === 'string' && r.reason.length > 20),
      { service: ae_service.ok, ures_port: ae_uresPort.ok, tobb_gazdagep: ae_tobb.ok });

    // ── (ae4) A KILÉPÉS IS LESZEDI A VÉDETT-INDEXET (F164-11, P1) ────────────────────────────────
    const ae_st = makeSessionStore({ maxSessions: 50, idleMs: 10 ** 9, warn: () => {}, intentIndex: true,
      protectedIds: (ids) => new Set(ids.map(String)) });
    ae_st.set('anon_1', { id: 'anon_1', subject_id: null }, 1000);
    ae_st.markIntent('anon_1');
    const ae_indexelve = ae_st.stats().intent_indexed;
    ae_st.delete('anon_1');
    const ae_indexUtan = ae_st.stats().intent_indexed;
    // ELLENPÁR: a kiszorítási út (`drop`) eddig is helyesen könyvelt — a kettő MOST UGYANAZT teszi.
    ae_st.set('anon_2', { id: 'anon_2', subject_id: null }, 2000);
    ae_st.markIntent('anon_2');
    ae_st.intentsPurged();                       // hogy a rövidre zárás ne szóljon közbe
    step('(ae4) F164-11: a KILÉPÉS útja (`delete`) is leszedi a sort a védett-indexről — nem csak a kiszorítás (`drop`)',
      ae_indexelve === 1 && ae_indexUtan === 0,
      { kilepes_elott: ae_indexelve, kilepes_utan: ae_indexUtan });

    // ── (ae5) AZ EGYSÉG-KÖLTSÉGVETÉS TÚLLÉPÉSE IS FINOMÍTÁST KÉR (F164-12, P2) ───────────────────
    {
      const JEL = '  GEPI-JEL: unit_over_budget\n';
      const hivasok = [];
      const terv = adaptiveUnitPlan({
        startUnits: 4, maxUnits: 32, maxAttempts: 4,
        spawnUnits: (n) => {
          hivasok.push(n);
          // 4 egységnél a futtató a SAJÁT költségvetését lépi túl (nem nulla kilépés, NINCS
          // időtúllépés); 8-nál belefér. A régi alak a 4-et „belefért"-nek olvasta.
          return n < 8
            ? { timedOut: false, exit: 1, runs: [{ arg: `--unit=1/${n}`, stdout: `RESULT…${JEL}`, stderr: '' }] }
            : { timedOut: false, exit: 0, runs: [{ arg: `--unit=1/${n}`, stdout: 'RESULT: tiszta', stderr: '' }] };
        },
      });
      // ELLENPÁR: TARTALMI bukás (nem nulla kilépés, de NINCS költségvetés-jel) → NEM finomítunk,
      // mert a finomítás egy tartalmi hibát nem gyógyít, viszont elvinné a külső program-keretet.
      const tartalmi = [];
      const terv2 = adaptiveUnitPlan({
        startUnits: 4, maxUnits: 32, maxAttempts: 4,
        spawnUnits: (n) => { tartalmi.push(n); return { timedOut: false, exit: 1, runs: [{ arg: `--unit=1/${n}`, stdout: 'RESULT: a szelet NEM tiszta', stderr: '' }] }; },
      });
      step('(ae5) F164-12: a futtató SAJÁT költségvetés-túllépése FINOMÍTÁST kér (nem „belefért"), a TARTALMI bukás viszont NEM — két külön ok, két külön válasz',
        terv.fitted === true && terv.units === 8 && hivasok.join(',') === '4,8'
        && terv2.fitted === true && tartalmi.join(',') === '4',
        { koltsegvetes_hivasok: hivasok.join(','), koltsegvetes_vegso: terv.units,
          tartalmi_hivasok: tartalmi.join(','), tartalmi_finomitott: tartalmi.length > 1 });
    }

    // ── (ae6) A PÁSZTA KURZORA ELŐRE HALAD (F164-13, P2) ────────────────────────────────────────
    {
      const DB5 = resolve(ROOT, 'var/tmp/v3app_r154_ae6.sqlite');
      try { rmSync(DB5, { force: true }); rmSync(DB5 + '-wal', { force: true }); rmSync(DB5 + '-shm', { force: true }); } catch { /* nem volt */ }
      const ae6 = await startServer({ port: 0, dbPath: DB5 });
      try {
        const st = ae6.store;
        const be = (sid, at) => st.run('INSERT INTO pending_intent (session_id, invite_token, created_at) VALUES (?,?,?)', sid, 'tok', at);
        const ora = { now: () => new Date().toISOString() };
        const alap = Date.parse(ora.now());
        /**
         * HÁROM friss, ÉRVÉNYES eltolásos sor (SZÁMMAL kezdődik → előre rendeződik) és EGY romlott
         * (BETŰVEL kezdődik → mögé). A köteg háromra korlátozva: a romlott sor így az ELSŐ pásztán
         * meg sem jelenik — ez maga a lelet.
         */
        const feltolt = () => {
          st.run('DELETE FROM pending_intent');
          for (let i = 0; i < 3; i += 1) {
            be(`friss_${i}`, new Date(alap - (3 - i) * 1000).toISOString().replace('Z', '+00:00'));
          }
          be('romlott', 'bogus');
        };
        feltolt();
        const p1 = purgeExpiredIntents({ store: st, clock: ora, maxOddRows: 3 });
        const p2 = purgeExpiredIntents({ store: st, clock: ora, maxOddRows: 3, oddCursor: p1.odd_cursor });
        const romlottElfogyott = !st.get('SELECT 1 AS x FROM pending_intent WHERE session_id = ?', 'romlott');
        // ELLENPÁR: kurzor NÉLKÜL a második pászta UGYANAZT a köteget látja, és a romlott sor MARAD.
        feltolt();
        purgeExpiredIntents({ store: st, clock: ora, maxOddRows: 3 });
        purgeExpiredIntents({ store: st, clock: ora, maxOddRows: 3 });
        const kurzorNelkulMegvan = Boolean(st.get('SELECT 1 AS x FROM pending_intent WHERE session_id = ?', 'romlott'));
        step('(ae6) F164-13: a pászta KURZORA továbblép, ezért a romlott sor a MÁSODIK pásztán sorra kerül — kurzor NÉLKÜL ugyanaz a köteg ismétlődik, és a sor MARAD',
          p1.odd_capped === true && p1.odd_cursor !== null && p1.odd_purged === 0
          && p2.odd_purged === 1 && romlottElfogyott === true && kurzorNelkulMegvan === true,
          { elso_paszta: `${p1.odd_rows} sor, tele: ${p1.odd_capped}, takarítva: ${p1.odd_purged}`,
            masodik_paszta_kurzorral: `takarítva: ${p2.odd_purged}`,
            kurzor_nelkul_megmaradt: kurzorNelkulMegvan });
      } finally { await ae6.close(); }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // AH — A SZEMÉLYES TÉRBEN NINCS ÜZLETI BEMUTATÓ (F164-18, külső review, Codex, P2)
  //
  // A LELET: a regiszter KÉT néven hívja ugyanazt — a FUNKCIÓK `screen`-t, a BEMUTATÓK `page`-et
  // deklarálnak —, a személyes-tér szűrő pedig csak a `page`-et olvasta. Az R164/3 három ÚJ funkciója
  // `screen`-t és `group: 'shell'`-t deklarál, tehát MINDKÉT régi listából kimaradt: a személyes
  // térben is felkínáltuk a bemutatójukat, pedig a lapjuk a személyes menüben NINCS BENNE.
  //
  // A MÉRÉS A FELOLDÓN MEGY, és a két irányt EGYÜTT nézi: a személyes térben NEM elérhető, a céges
  // térben IGEN — különben a javítás „mindent elrejtek" is lehetne (KUKA-091).
  {
    const UZLETI = ['tour.warehouses', 'tour.processes', 'tour.accountSettings'];
    const szemelyes = { signed_in: true, book_id: 'b_personal', member: true, role: 'admin', personal: true, demo: true };
    // A CÉGES kontextus a MINTA tényét is hordozza (R166 P2 · KUKA-413): ez a sor a SZEMÉLYES-TÉR
    // szabályt méri, és a tábla-bemutatók előfeltétele a kiosztott bemutató-minta — ugyanúgy, ahogy a
    // `demo: true` is itt áll. A mérce nem lazult: a személyes térben továbbra is EGYET sem adhat.
    const ceges = { signed_in: true, book_id: 'b_firm', member: true, role: 'admin', personal: false, demo: true, demo_fixture: true };
    const szTour = allowedToursFor(szemelyes);
    const cTour = allowedToursFor(ceges);
    step('(ah1) F164-18: a SZEMÉLYES térben egyetlen ÜZLETI bemutató sem elérhető — a CÉGES térben mind a három igen',
      UZLETI.every((t) => !szTour.includes(t)) && UZLETI.every((t) => cTour.includes(t)),
      { szemelyes_terben: UZLETI.filter((t) => szTour.includes(t)).join(',') || 'egyik sem',
        ceges_terben: UZLETI.filter((t) => cTour.includes(t)).length });

    // (ah2) A LISTÁK NEM CSÚSZHATNAK SZÉT — ÉS A MÉRCE A KLIENS SZABÁLYA, NEM A MENÜ (KUKA-392).
    //
    // AZ ELSŐ ALAK ITT A MENÜVEL EGYEZTETETT, és ezzel a HIBÁT szentesítette: a `new` lap nem
    // menüpont (a fiókváltó `ws-add` gombja nyitja), mégis elérhető a személyes körben — a kliens
    // `pageAvailable` feloldója NÉGY lapot ad meg mindig elérhetőként. A helyes mérce a kettő UNIÓJA.
    const menuLapok = NAV_PERSONAL.flatMap((g) => [...g.pages]).sort();
    const vartSzemelyes = [...new Set([...ALWAYS_AVAILABLE_SCREENS, ...menuLapok])].sort();
    step('(ah2) F164-18: a feloldó személyes lap-listája PONTOSAN a MINDIG ELÉRHETŐK és a személyes menü UNIÓJA (KUKA-003 · KUKA-392)',
      [...PERSONAL_SCREENS].sort().join(',') === vartSzemelyes.join(','),
      { feloldo: [...PERSONAL_SCREENS].sort().join(','), elvart_unio: vartSzemelyes.join(','),
        mindig: [...ALWAYS_AVAILABLE_SCREENS].sort().join(','), menu: menuLapok.join(',') });

    // (ah4) ÉS A „MINDIG ELÉRHETŐ" LISTA A KLIENS FÁJLJÁBÓL MÉRVE (KUKA-227: a határ zöldje nem a
    // felület zöldje). Ha valaki a `pageAvailable` első sorát átírja, ez a sor azonnal pirosra vált —
    // nem a szándékot hisszük el, hanem a kódot olvassuk.
    const appJs = readFileSync(join(ROOT, 'v3app/public/app.js'), 'utf8');
    const mAlways = appJs.match(/if \(\[([^\]]*)\]\.includes\(page\)\) return true;/);
    const kliensLista = mAlways
      ? mAlways[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean).sort()
      : null;
    step('(ah4) KUKA-392: a MINDIG ELÉRHETŐ lapok listája a KLIENS `pageAvailable` feloldójából mérve egyezik',
      kliensLista !== null && kliensLista.join(',') === [...ALWAYS_AVAILABLE_SCREENS].sort().join(','),
      { kliensbol: kliensLista ? kliensLista.join(',') : 'NEM OLVASHATÓ KI', regiszter: [...ALWAYS_AVAILABLE_SCREENS].sort().join(',') });

    // (ah5) A REGRESSZIÓ ELLENPÁRJA (a hatodik review-kör második leletére). A SZEMÉLYES körben az
    // ELSŐ vállalkozás létrehozása a legfontosabb út — a súgója, a művelete ÉS a bemutatója is
    // elérhető kell legyen. Ugyanakkor egy KÖNYV-hatókörű, menün KÍVÜLI lap továbbra sem az.
    const ujLap = availabilityOf({ audience: 'signed_in', scope: 'person', screen: 'new' }, szemelyes);
    const konyvLap = availabilityOf({ audience: 'signed_in', scope: 'book', screen: 'members' }, szemelyes);
    step('(ah5) KUKA-392 ELLENPÁR: a SZEMÉLYES körben a vállalkozás-létrehozás (`new`) elérhető — a könyv-hatókörű `members` nem',
      ujLap.visible === true && konyvLap.visible === false
        && szTour.includes('tour.addBusiness') && allowedActionsFor(szemelyes).includes('prepare.business'),
      { uj_lap: ujLap.visible, members: `${konyvLap.visible} (${konyvLap.why})`,
        tour_addBusiness: szTour.includes('tour.addBusiness'),
        prepare_business: allowedActionsFor(szemelyes).includes('prepare.business') });

    // (ah3) ELLENPÁR: a NEVEZETT kivétel (`personal_space_ok`) továbbra is átmegy — a javítás nem
    // „mindent elrejtek" (a meghívás elfogadása a személyes térből indul, P109-01).
    const kivetel = availabilityOf({ audience: 'public', scope: 'person', screen: 'members', personal_space_ok: true }, szemelyes);
    const nelkul = availabilityOf({ audience: 'public', scope: 'person', screen: 'members' }, szemelyes);
    step('(ah3) F164-18 ELLENPÁR: a NEVEZETT kivétel (`personal_space_ok`) a személyes térben is látható marad, nélküle viszont nem',
      kivetel.visible === true && nelkul.visible === false && nelkul.why === 'personal_space',
      { kivetellel: kivetel.visible, kivetel_nelkul: `${nelkul.visible} (${nelkul.why})` });
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // AG — A MEMÓRIA ÉS A TÁROLÓ EGYÜTT ÜRÜL (F164-16 · F164-17, külső review, Codex, 2× P2)
  //
  // KÉT LELET, EGY MECHANIZMUS — és HARMADSZOR ugyanaz a hibaosztály (KUKA-378 · KUKA-003):
  //   · a KILÉPÉS a memóriából kivette a sort, az ADATBÁZISBÓL nem (a kiszorítás BEJELENT, a kilépés
  //     nem) — így a `folytatás → kilépés` ismétlése ELÉRHETETLEN sorokat hagyott a táblában a teljes
  //     türelmi időre, miközben a tár ÜRES maradt: a tár plafonja nem fogta meg;
  //   · az OLVASÁSI kapu (`resumeIntent`) a LEJÁRT sort eldobja, de ez a törlés nem jutott el a
  //     védett-indexhez — az index `bízható` maradt egy ELAVULT azonosítóval.
  //
  // A MÉRÉS A HATÁRON MEGY, nem a belső függvényen: a kilépés HTTP-úton, a lejárat a FEJLESZTŐI ÓRA
  // előretekerésével — tehát nincs benne várakozás (KUKA-121), és a mérés azt nézi, amit a
  // felhasználó útja tényleg kivált.
  {
    const DB6 = resolve(ROOT, 'var/tmp/v3app_r154_ag.sqlite');
    try { rmSync(DB6, { force: true }); rmSync(DB6 + '-wal', { force: true }); rmSync(DB6 + '-shm', { force: true }); } catch { /* nem volt */ }
    const ag = await startServer({ port: 0, dbPath: DB6 });
    try {
      const b6 = `http://127.0.0.1:${ag.server.address().port}`;
      const sorok = () => ag.store.get('SELECT COUNT(*) AS n FROM pending_intent').n;

      // ── (ag1) A KILÉPÉS A TÁROLÓBÓL IS VISZI A SORT ────────────────────────────────────────────
      const c1 = new Client(b6);
      await c1.get('/api/me');
      const be1 = await c1.post('/api/invites/pending', { token: 'ag-folytatas-1' });
      const sorokFelvetelUtan = sorok();
      const indexFelvetelUtan = ag.sessions.stats().intent_indexed;
      const ki1 = await c1.post('/api/logout', {});
      step('(ag1) F164-16: a KILÉPÉS a tárolóból is viszi a függő folytatás sorát — nem csak a memóriából',
        be1.status === 200 && sorokFelvetelUtan === 1 && indexFelvetelUtan === 1
        && ki1.status === 200 && sorok() === 0 && ag.sessions.stats().intent_indexed === 0,
        { felvetel: be1.status, sor_a_felvetel_utan: sorokFelvetelUtan, index_a_felvetel_utan: indexFelvetelUtan,
          kilepes: ki1.status, sor_a_kilepes_utan: sorok(), index_a_kilepes_utan: ag.sessions.stats().intent_indexed });

      // ── (ag2) A LEJÁRAT OLVASÁSI TÖRLÉSE IS KÖVETI AZ INDEXET ─────────────────────────────────
      const c2 = new Client(b6);
      await c2.get('/api/me');
      const be2 = await c2.post('/api/invites/pending', { token: 'ag-folytatas-2' });
      const index2 = ag.sessions.stats().intent_indexed;
      // A FEJLESZTŐI ÓRA a türelmi idő FÖLÉ — a lejárat így nem valós várakozásból jön.
      await c2.post('/dev/clock', { advance_ms: ag.intentTtlMs + 60_000 });
      // Az OLVASÁSI kapu ezen az úton fut (`invite_context` → `resumeIntent`).
      const all = await c2.get('/api/assistant/status?lang=hu');
      const index2Utan = ag.sessions.stats().intent_indexed;
      const bizhato = ag.sessions.stats().intent_index_trusted;
      step('(ag2) F164-17: a LEJÁRT sor olvasási törlése is KIVESZI az azonosítót a védett-indexből — nem marad elavult bejegyzés',
        be2.status === 200 && index2 === 1 && all.status === 200 && index2Utan === 0 && bizhato === true,
        { index_a_felvetel_utan: index2, status_hivas: all.status, index_a_lejarat_utan: index2Utan, index_bizhato: bizhato });
    } finally { await ag.close(); }
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // AF — A FOLYTATÁS-MEGŐRZÉS ELUTASÍTÁSA LEFORDÍTHATÓ (F164-15, külső review, Codex, P2)
  //
  // A LELET: a kliens ELDOBTA a `POST /api/invites/pending` válaszát, tehát egy NEVEZETT elutasítás
  // (`at_capacity` · `session_gone`) után is úgy folytatta, mintha a jegy megmaradt volna — a megígért
  // folytatás NÉMÁN eltűnt. A kliens-oldali javítás a választ megméri és kiírja; EZ a mérés azt
  // zárja le, hogy a kiírt szöveg VALÓDI mondat legyen, ne a `generic` tartalékra essen.
  //
  // MIÉRT ÍGY MÉRJÜK: a tartalék-ágas feloldó elrejti a hiányzó kulcsot (KUKA-238) — a `refusalText`
  // a nem talált kulcsra `REASON.generic`-et ad, tehát a felhasználó egy semmitmondó mondatot kapna,
  // és a próba mégis „volt szöveg"-et látna. Ezért MINDEN bekapcsolt nyelven azt mérjük, hogy a kulcs
  // TÉNYLEGESEN ott van, és a mondat NEM azonos a generikussal.
  {
    const OKOK = ['at_capacity', 'session_gone'];
    const nyelvek = enabledLanguages().map((l) => l.code);
    const hiany = [];
    for (const kod of nyelvek) {
      const d = dictFor(kod);
      for (const ok of OKOK) {
        const sz = d && d.REASON ? d.REASON[ok] : undefined;
        const generikus = d && d.REASON ? d.REASON.generic : undefined;
        if (typeof sz !== 'string' || sz.length < 40 || sz === generikus) hiany.push(`${kod}/${ok}`);
      }
    }
    step('(af1) F164-15: a folytatás-megőrzés MINDEN nevezett elutasítása VALÓDI mondatot ad MINDEN bekapcsolt nyelven — nem a generikus tartalékra esik (KUKA-238)',
      hiany.length === 0 && nyelvek.length >= 3,
      { nyelvek: nyelvek.join(','), hianyzo: hiany.length ? hiany.join(' · ') : 'nincs' });

    // (af2) ÉS A SZERVER TÉNYLEGESEN EZEKET AZ OKOKAT ADJA — a két lista nem válhat szét (KUKA-003).
    const srvU = readFileSync(resolve(ROOT, 'v3app/server.mjs'), 'utf8');
    const pendingBlokk = srvU.slice(srvU.indexOf("'POST /api/invites/pending'"),
      srvU.indexOf("'POST /api/invites/redeem'"));
    const srvOkok = [...new Set([...pendingBlokk.matchAll(/reason: '([a-z_]+)'/g)].map((m) => m[1]))].sort();
    step('(af2) F164-15: a végponton TÉNYLEGESEN csak a lefordított okok állnak — egy új, le nem fordított ok azonnal pirosra vált',
      srvOkok.length > 0 && srvOkok.every((o) => OKOK.includes(o)),
      { a_vegponton: srvOkok.join(','), leforditva: OKOK.join(',') });
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // AB — AZ R164/1 VISSZATÖLTÉSI BIZTONSÁG TISZTA DÖNTÉSEI
  //
  // MIÉRT ITT: a `proof:pg-restore-safety` lánc valódi, ELDOBHATÓ PostgreSQL-t kér, ezért a söprésben
  // nem fut (KUKA-307). A döntések viszont TISZTA függvények — a battéria közvetlenül hívja őket, így
  // a visszacsúszás a söprésben is piros lesz, nem csak kézi futtatáson (KUKA-207).
  {
    // ── (ab1) A TULAJDON A LÉTREHOZÁS, NEM A NÉV ────────────────────────────────────────────────
    const ab_forras = 'vs_eles';
    const ab_gen = freshTargetName({ now: Date.UTC(2026, 9, 7, 4, 50, 0), rand: 0.5 });
    const ab_letezo = restoreTargetDecision({ measuredSource: ab_forras, explicitTarget: 'vs_regi_proba', exists: true, generated: ab_gen });
    const ab_nemletezo = restoreTargetDecision({ measuredSource: ab_forras, explicitTarget: 'vs_regi_proba', exists: false, generated: ab_gen });
    const ab_friss = restoreTargetDecision({ measuredSource: ab_forras, explicitTarget: null, exists: false, generated: ab_gen });
    const ab_utkozo = restoreTargetDecision({ measuredSource: ab_forras, explicitTarget: null, exists: true, generated: ab_gen });
    step('(ab1) F164-01: a MÁR LÉTEZŐ cél elutasítva, a NEM létező elfogadva — a tulajdont a LÉTREHOZÁS adja, nem a név (RÉGEN: `DROP DATABASE IF EXISTS` a megadott célon)',
      ab_letezo.use === null && /MÁR LÉTEZIK/.test(ab_letezo.basis)
      && ab_nemletezo.use === 'vs_regi_proba' && ab_friss.use === ab_gen && ab_utkozo.use === null,
      { mar_letezo: ab_letezo.use, nem_letezo: ab_nemletezo.use, generalt: ab_friss.use, generalt_utkozo: ab_utkozo.use });

    // ── (ab2) A GENERÁLT NÉV ALAKJA ÉS EGYEDISÉGE ──────────────────────────────────────────────
    const ab_nevek = new Set();
    for (let i = 0; i < 200; i++) ab_nevek.add(freshTargetName());
    step('(ab2) F164-01: a generált célnév az ELŐTAGOT hordozza, adatbázis-NÉV alakú, és 200 hívásból 200 különböző',
      ab_gen === `${RESTORE_TARGET_PREFIX}20261007045000_7fffff` && ab_nevek.size === 200
      && [...ab_nevek].every((n) => /^[A-Za-z_][A-Za-z0-9_$]*$/.test(n) && n.length <= 63),
      { rogzitett_mag: ab_gen, kulonbozo: ab_nevek.size });

    // ── (ab3) A VÉDETT ÉS A FORRÁS NEVE SOHA NEM CÉL ───────────────────────────────────────────
    const ab_tiltott = [...PROTECTED_DB_NAMES, ab_forras].map((n) => restoreTargetDecision({ measuredSource: ab_forras, explicitTarget: n, exists: false, generated: ab_gen }));
    const ab_mertelen = restoreTargetDecision({ measuredSource: null, explicitTarget: 'vs_barmi', exists: false, generated: ab_gen });
    step('(ab3) F164-01: a VÉDETT rendszer-adatbázisok és a MÉRT forrás neve célként elutasítva — és ha a forrás neve NEM mérhető, az is megállás (nem találgatunk törlés előtt)',
      ab_tiltott.every((d) => d.use === null && d.stop === true) && ab_mertelen.use === null && /nem mérhető/.test(ab_mertelen.basis),
      { tiltott: [...PROTECTED_DB_NAMES, ab_forras].join(','), nem_merheto_forras: ab_mertelen.use });

    // ── (ab4) A MEGSZERZÉS HURKA: A PÁRHUZAMOS ÜTKÖZÉST NEM VESZI ÁT ───────────────────────────
    // A versenyzőt BEADJUK: a létezés-mérés „nincs"-et mond, a `CREATE` mégis ütközést ad — pontosan
    // úgy, ahogy két párhuzamos futás egymásba lépne.
    let ab_hivas = 0;
    const ab_atvett = [];
    const ab_sz = acquireFreshTarget({
      measuredSource: ab_forras, explicitTarget: null,
      generate: () => `${RESTORE_TARGET_PREFIX}20261007045000_${String(ab_hivas).padStart(6, '0')}`,
      exists: () => ({ known: true, exists: false }),
      create: (n) => { ab_hivas += 1; ab_atvett.push(n); return ab_hivas === 1 ? { ok: false, collision: true } : { ok: true }; },
    });
    step('(ab4) F164-01: párhuzamos névütközésnél a hurok ÚJ nevet kér, és SOHA nem veszi át a másik futás adatbázisát',
      ab_sz.target === `${RESTORE_TARGET_PREFIX}20261007045000_000001` && ab_sz.attempts === 2 && ab_sz.created === true
      && ab_atvett[0] !== ab_sz.target && /párhuzamos névütközés/.test(ab_sz.log.join(' ')),
      { megszerzett: ab_sz.target, utkozott: ab_atvett[0], kiserletek: ab_sz.attempts });

    // ── (ab5) A „NEM MÉRHETŐ" LÉTEZÉS MEGÁLLÁS, NEM „NEM LÉTEZIK" ──────────────────────────────
    let ab_create_hivas = 0;
    const ab_nemtudom = acquireFreshTarget({
      measuredSource: ab_forras, explicitTarget: null,
      generate: () => ab_gen,
      exists: () => ({ known: false, hiba: 'a kiszolgáló nem válaszolt' }),
      create: () => { ab_create_hivas += 1; return { ok: true }; },
    });
    step('(ab5) F164-01: ha a cél LÉTEZÉSE nem mérhető, a hurok megáll, és a `CREATE` MEG SEM hívódik (a nem tudott nem „nem létezik" — KUKA-220)',
      ab_nemtudom.target === null && ab_create_hivas === 0 && /NEM MÉRHETŐ/.test(ab_nemtudom.basis),
      { cel: ab_nemtudom.target, create_hivas: ab_create_hivas });

    // ── (ab6) A VERDIKT: A FIGYELMEZTETÉS NEM OLDJA FEL A HIBÁT ────────────────────────────────
    const ab_egyutt = restoreOutcome({ exitCode: 1, stderr: 'pg_restore: warning: owner\npg_restore: error: relation missing' });
    const ab_csak_fi = restoreOutcome({ exitCode: 1, stderr: 'pg_restore: warning: owner' });
    const ab_tiszta = restoreOutcome({ exitCode: 0, stderr: '' });
    const ab_nulla_de_hiba = restoreOutcome({ exitCode: 0, stderr: 'pg_restore: error: relation missing' });
    const ab_ures_diag = restoreOutcome({ exitCode: 3, stderr: '' });
    const ab_nulla_fi = restoreOutcome({ exitCode: 0, stderr: 'pg_restore: warning: owner' });
    step('(ab6) F164-02 + F164-05: a visszatöltés CSAK nulla kilépés mellett siker — hiba+figyelmeztetés EGYÜTT FAIL, csak figyelmeztetés + NEM NULLA kilépés is FAIL, ÜRES (vagy más nyelvű) diagnosztika mellett is FAIL; nulla kilépésnél a figyelmeztetés NEM buktat, de egy hiba-sor igen',
      ab_egyutt.ok === false && ab_egyutt.errors === 1 && ab_egyutt.warnings === 1
      && ab_csak_fi.ok === false && ab_ures_diag.ok === false
      && ab_tiszta.ok === true && ab_nulla_fi.ok === true && ab_nulla_de_hiba.ok === false,
      { egyutt: ab_egyutt.ok, csak_figyelmeztetes_nem_nulla: ab_csak_fi.ok, ures_diagnosztika: ab_ures_diag.ok,
        tiszta: ab_tiszta.ok, nulla_plus_figyelmeztetes: ab_nulla_fi.ok, nulla_kod_de_hiba: ab_nulla_de_hiba.ok });

    // ── (ab8) F164-04/06 — A TÉNYLEGES GAZDAGÉP, ÉS A KIMONDOTT FELÜLÍRÁS ────────────────────────
    const ab_lelet = localOnlyVerdict('postgres://u@localhost/db?host=production.example', PG_ENV_NELKUL);
    const ab_helyi = localOnlyVerdict('postgres://u@127.0.0.1:5432/db', PG_ENV_NELKUL);
    const ab_tavoli = localOnlyVerdict('postgres://u@db.pelda.hu/db', PG_ENV_NELKUL);
    const ab_service = localOnlyVerdict('postgres://u@localhost/db?service=prod', PG_ENV_NELKUL);
    const ab_nulla_ov = localOnlyVerdict('postgres://u@db.pelda.hu/db', { VS_SAFETY_ALLOW_REMOTE: '0' });
    const ab_egy_ov = localOnlyVerdict('postgres://u@db.pelda.hu/db', { VS_SAFETY_ALLOW_REMOTE: '1' });
    step('(ab8) F164-04 + F164-06: a helyi kapu a TÉNYLEGES gazdagépre áll (a `?host=` felülírja a cím gazdagépét), a nem eldönthető NEM „helyi", és a felülírás CSAK a pontos `1` értékre nyit (RÉGEN: a `0` és a `false` is felülírásnak számított)',
      ab_lelet.allowed === false && ab_lelet.host === 'production.example'
      && ab_helyi.allowed === true && ab_tavoli.allowed === false
      && ab_service.allowed === false && ab_service.decidable === false
      && ab_nulla_ov.allowed === false && ab_egy_ov.allowed === true && ab_egy_ov.override === true,
      { host_felulirás: ab_lelet.host, helyi: ab_helyi.allowed, tavoli: ab_tavoli.allowed,
        service_eldontheto: ab_service.decidable, allow_0: ab_nulla_ov.allowed, allow_1: ab_egy_ov.allowed });

    // ── (ab9) F164-03 — AZ IDÉZŐJELES JELSZÓ IS TELJESEN ELTŰNIK ─────────────────────────────────
    const ab_idezo = redactConnStrings("PGPASSWORD='top secret' password=\"más titok\" pwd=egyszeru");
    step('(ab9) F164-03: a titok-tisztító az APOSZTRÓF- és IDÉZŐJEL-idézett értéket is teljesen elrejti, a belső szóközzel együtt (RÉGEN: az érték-osztály kizárta az idézőjelet, ezért a megszokott alak érintetlen maradt)',
      !/top secret|más titok|egyszeru/.test(ab_idezo) && (ab_idezo.match(/«elrejtve»/g) || []).length === 3,
      { tisztitott: ab_idezo.slice(0, 90) });

    // ── (ab7) A TITOK NEM KERÜL A NAPLÓBA ──────────────────────────────────────────────────────
    const ab_t = redactConnStrings('pg_restore: error: connection to postgres://u:TITKOS@gep:5432/db failed; PGPASSWORD=MASIK');
    const ab_t2 = redactConnStrings('rendben, nincs benne titok');
    step('(ab7) F164-01: a kiírt szövegből a kapcsolati cím ÉS a jelszó is eltűnik, a titokmentes szöveg viszont változatlan',
      !/TITKOS|MASIK/.test(ab_t) && /elrejtve/.test(ab_t) && ab_t2 === 'rendben, nincs benne titok',
      { tisztitott: ab_t.slice(0, 80) });
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // AC — AZ R166 NYITOTT P1: A SÉMA DÖNTI EL, HOL ÁLL AZ ADATBÁZIS (`#discussion_r4207213198`)
  //
  // A LELET SZÖVEGE a `postgres://…?db=…` felülírást állította. MEGMÉRVE a kitűzött könyvtáron
  // (`pg-connection-string` 2.14.1) **az a konkrét eset NEM áll elő** — a hálózati sémán az ÚT
  // feltétel nélkül győz. A MECHANIZMUS viszont létezik, csak a `socket:` sémán: ott a `?db=` AZ
  // adatbázis, az ÚT pedig a SOCKET-KÖNYVTÁR. A leletet tehát NEM zárom le „nem reprodukálható"
  // címen (a checkpoint kikötése) — a rés valódi, és a kár NÉMA volt:
  //
  //   MÉRVE, a régi feloldóval, `socket:/var/run/postgresql?db=eles` mellett:
  //     · `effectiveDatabase` → `var/run/postgresql` (az ÚT!), nem `eles`;
  //     · ezért `sameDatabase(cím, 'eles')` → „ELTÉR" → a kapu ÁTENGEDTE a célt,
  //       és a lánc végén álló `DROP DATABASE "eles"` a VALÓDI adatbázist vitte volna.
  //
  // Ezek a sorok TISZTA függvényeket hívnak, tehát a söprésben futnak (KUKA-207); a valódi
  // kiszolgálón mért ellenpár a `proof:pg-restore-safety` (RS) csoportjában áll.
  {
    part('AJ) R166 — a `socket:` séma és a KÉT FOGYASZTÓ olvasata (a nyolcadik review-kör P1-je)');
    const SOCK = 'socket:/var/run/postgresql?db=eles&user=app';

    // ── (ac1) A SÉMA ZÁRT LISTÁJA — ami nincs rajta, az NEM tipp, hanem nevezett megállás ────────
    const ac_halozati = pgUrlShape('postgres://u@localhost/original');
    const ac_hosszu = pgUrlShape('postgresql://u@localhost/original');
    const ac_socket = pgUrlShape(SOCK);
    const ac_idegen = pgUrlShape('mysql://u@localhost/original');
    const ac_dummy = pgUrlShape('socket://u@/var/run/postgresql?db=eles');
    const ac_perjel = pgUrlShape('/var/run/postgresql eles');
    step('(aj1) R166/P1: a séma ZÁRT listán áll (`postgres:` · `postgresql:` · `socket:`), és a listán kívüli alak NEVEZETT megállás — a kliens által elfogadott, de WHATWG URL-lel nem értelmezhető két alak is nevezetten áll meg, nem némán',
      ac_halozati.shape === 'halozati' && ac_hosszu.shape === 'halozati' && ac_socket.shape === 'socket'
      && ac_idegen.shape === null && /zárt listán/.test(ac_idegen.basis)
      && ac_dummy.shape === null && /PÓT-gazdagéppel/.test(ac_dummy.basis)
      && ac_perjel.shape === null && /SZÓKÖZ adatbázis/.test(ac_perjel.basis)
      && Object.keys(PG_URL_SHAPES).length === 3,
      { halozati: ac_halozati.shape, socket: ac_socket.shape, idegen: ac_idegen.shape,
        dummy: ac_dummy.shape, perjel: ac_perjel.shape });

    // ── (ac2) A SOCKET-CÍMEN A `?db=` AZ ADATBÁZIS, AZ ÚT A SOCKET-KÖNYVTÁR ──────────────────────
    const ac_nev = effectiveDatabase(SOCK, PG_ENV_NELKUL);
    const ac_ures = effectiveDatabase('socket:/var/run/postgresql?db=', PG_ENV_NELKUL);
    const ac_nincs = effectiveDatabase('socket:/var/run/postgresql', PG_ENV_NELKUL);
    const ac_ketto = effectiveDatabase('socket:/var/run/postgresql?db=egyik&db=masik', PG_ENV_NELKUL);
    step('(aj2) R166/P1: a `socket:` címen a `?db=` nevezi meg az adatbázist, és NEM az út (RÉGEN: az ÚT lett a „név", tehát a kapu a socket-könyvtárat vetette össze a céllal) — az üres, a hiányzó és a KÉT eltérő `?db=` mind NEM megállapítható',
      ac_nev.name === 'eles' && !/var\/run/.test(String(ac_nev.name))
      && ac_ures.name === null && ac_nincs.name === null && ac_ketto.name === null
      && /ELTÉRŐ/.test(ac_ketto.basis),
      { nev: ac_nev.name, ures: ac_ures.name, nincs: ac_nincs.name, ketto: ac_ketto.name });

    // ── (ac3) A KAPU — EZ A NÉMA KÁR HELYE ──────────────────────────────────────────────────────
    const ac_kapu_azonos = sameDatabase(SOCK, 'eles', PG_ENV_NELKUL);
    const ac_kapu_ut = sameDatabase(SOCK, 'var/run/postgresql', PG_ENV_NELKUL);
    const ac_kapu_mas = sameDatabase(SOCK, 'vs_restore_proba_x', PG_ENV_NELKUL);
    step('(aj3) R166/P1: a kapu a `?db=` adatbázissal AZONOS célon MEGÁLL (régen ÁTENGEDTE, és a `DROP DATABASE` a valódi adatbázist vitte volna), az ÚT nevével egyező célon pedig NEM azonosságot mond — a friss, saját cél viszont továbbra is átmegy',
      ac_kapu_azonos.same === true && ac_kapu_ut.same === false && ac_kapu_mas.same === false,
      { azonos_db_vel: ac_kapu_azonos.same, azonos_uttal: ac_kapu_ut.same, friss_cel: ac_kapu_mas.same });

    // ── (ac4) AZ ÁTIRÁNYÍTÁS — AZ ÚT ÉRINTETLEN, A `?db=` KAPJA A NEVET ─────────────────────────
    const ac_at = withDatabase(SOCK, 'vs_restore_proba_uj');
    const ac_at_halozati = withDatabase('postgres://u@localhost/original?dbname=a&db=b&database=c', 'vs_restore_proba_uj');
    step('(aj4) R166/P1: `socket:` címen az átirányítás az ÚTAT (a socket-könyvtárat) ÉRINTETLENÜL hagyja és a `?db=`-t írja át, PONTOSAN egy előfordulással (RÉGEN: az utat írta át, a `?db=`-t érintetlenül hagyta — vagyis a kapcsolat az EREDETI adatbázisra ment volna); a hálózati címről MINDHÁROM adatbázis-megnevező kulcs kimegy',
      ac_at.pathname === '/var/run/postgresql'
      && ac_at.searchParams.getAll('db').length === 1
      && ac_at.searchParams.get('db') === 'vs_restore_proba_uj'
      && effectiveDatabase(ac_at.toString(), PG_ENV_NELKUL).name === 'vs_restore_proba_uj'
      && ac_at_halozati.pathname === '/vs_restore_proba_uj'
      && !ac_at_halozati.searchParams.has('dbname') && !ac_at_halozati.searchParams.has('db')
      && !ac_at_halozati.searchParams.has('database'),
      { socket_ut: ac_at.pathname, socket_db: ac_at.searchParams.get('db'),
        halozati_ut: ac_at_halozati.pathname, halozati_query: ac_at_halozati.search || '(üres)' });

    // ── (ac5) ISMERETLEN SÉMÁN AZ ÁTIRÁNYÍTÁS MEGÁLL, NEM TIPPEL ────────────────────────────────
    let ac_dobott = null;
    try { withDatabase('mysql://u@localhost/original', 'vs_x'); } catch (e) { ac_dobott = e; }
    step('(aj5) R166/P1: a zárt listán nem szereplő sémán az átirányítás NEVEZETT hibával megáll (fail-closed), nem ad vissza csendben egy félig átírt címet',
      ac_dobott instanceof TypeError && /NEM biztonságos/.test(ac_dobott.message),
      { hiba: ac_dobott ? ac_dobott.message.slice(0, 70) : 'NEM DOBOTT' });

    // ── (ac6) A HÁLÓZATI SÉMA EGYETLEN DIVERGENCIÁJA: a `?dbname=` ──────────────────────────────
    //
    // Mérve: a libpq VESZI a `?dbname=`-et, a node-postgres az utat írja a `database`-re FELTÉTEL
    // NÉLKÜL. Ahol a kettő mást ad, ott a név NEM megállapítható — különben a kapu egy olyan célt
    // engedne át, amit a másik fogyasztó ÉPPEN HASZNÁL.
    const ac_div = effectiveDatabase('postgres://u@localhost/original?dbname=source', PG_ENV_NELKUL);
    const ac_egyez = effectiveDatabase('postgres://u@localhost/original?dbname=original', PG_ENV_NELKUL);
    const ac_db_nem = effectiveDatabase('postgres://u@localhost/original?db=source', PG_ENV_NELKUL);
    const ac_div_kapu = sameDatabase('postgres://u@localhost/original?dbname=source', 'original', PG_ENV_NELKUL);
    step('(aj6) R166/P1: a hálózati címen a `?dbname=` és az út ELTÉRÉSE NEM megállapítható (régen a libpq-olvasat lett az eldöntött név, és a kapu átengedte a node-postgres által ÉPPEN HASZNÁLT adatbázist), egyezésnél viszont megadott a név; a `?db=` a hálózati ágon egyik fogyasztónál sem írja felül az utat',
      ac_div.name === null && /KÉT FOGYASZTÓ MÁST olvas/.test(ac_div.basis)
      && ac_egyez.name === 'original'
      && ac_db_nem.name === 'original'
      && ac_div_kapu.same === true,
      { eltero: ac_div.name, egyezo: ac_egyez.name, db_parameter: ac_db_nem.name, kapu_megall: ac_div_kapu.same });

    // ── (ac7) A GAZDAGÉP IS A SÉMÁTÓL FÜGG — ÉS A HELYI KAPU EZEN ÁLL ───────────────────────────
    const ac_gazda = effectiveHost(SOCK, PG_ENV_NELKUL);
    const ac_gazda_rel = effectiveHost('socket:var/run/postgresql?db=eles', PG_ENV_NELKUL);
    const ac_gazda_utkozo = effectiveHost('socket:/var/run/postgresql?db=eles&host=masik.pelda.hu', PG_ENV_NELKUL);
    const ac_helyi = localOnlyVerdict(SOCK, PG_ENV_NELKUL);
    step('(aj7) R166/P1: a `socket:` címen az ÚT a gazdagép (a socket-könyvtár), ezért a helyi kapu HELYI-t mond; a NEM abszolút út és az úttal ütköző `?host=` viszont NEM eldönthető, tehát a destruktív kapu zárva marad',
      ac_gazda.host === '/var/run/postgresql' && ac_gazda.decidable === true
      && ac_gazda_rel.decidable === false && /ABSZOLÚT/.test(ac_gazda_rel.basis)
      && ac_gazda_utkozo.decidable === false
      && ac_helyi.allowed === true && ac_helyi.host === '/var/run/postgresql',
      { gazdagep: ac_gazda.host, relativ_eldontheto: ac_gazda_rel.decidable,
        utkozo_eldontheto: ac_gazda_utkozo.decidable, helyi: ac_helyi.allowed });

    // ── (ac8) ÉS A CLI-KÖRNYEZET IS: a gyermek a SOCKET-KÖNYVTÁRAT kapja gazdagépnek ────────────
    const ac_cli = cliEnvFor({ sourceUrl: SOCK, database: 'vs_restore_proba_uj', env: PG_ENV_NELKUL });
    step('(aj8) R166/P1: a CLI-gyermek (`pg_dump`/`psql`) a `socket:` címről a SOCKET-KÖNYVTÁRAT kapja `PGHOST`-nak és a MEGNEVEZETT célt `PGDATABASE`-nek — a libpq a `socket:` URI-t nem értelmezi, ezért a cím SOHA nem mehet át neki kapcsolati sztringként',
      ac_cli.ok === true && ac_cli.env.PGHOST === '/var/run/postgresql'
      && ac_cli.env.PGDATABASE === 'vs_restore_proba_uj' && ac_cli.env.PGUSER === 'app',
      { ok: ac_cli.ok, host: ac_cli.ok ? ac_cli.env.PGHOST : ac_cli.reason,
        db: ac_cli.ok ? ac_cli.env.PGDATABASE : null, user: ac_cli.ok ? ac_cli.env.PGUSER : null });
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // AE — A TITOK VÉGE A SHELL-SZÓ HATÁRA (R166, külső review, Codex, P2)
  //
  // A LELET pontos esete: egy gyermek-diagnosztika shell-idézett jelszót ír ki, amiben APOSZTRÓF
  // van — a shell ezt `'pa'\''ss'` alakban adja, és EGY szónak olvassa. A korábbi alak az ELSŐ záró
  // idézőjelnél megállt, tehát a jelszó MARADÉKA a naplóba került. Mérve, javítás előtt:
  // `PGPASSWORD='pa'\''ss'` → `PGPASSWORD=«elrejtve»''ss'`.
  {
    part('AK) R166 — a titok-tisztító határa: shell-szó, nem az első idézőjel (külső review, P2)');
    const glued = String.raw`PGPASSWORD='pa'\''ss' psql -h /tmp`;
    const ae1 = redactConnStrings(glued);
    const escQuote = String.raw`PGPASSWORD="pa\"ss" psql`;
    const ae2 = redactConnStrings(escQuote);
    step('(ak1) R166/P2: az APOSZTRÓFOT tartalmazó, shell-idézett jelszó TELJESEN eltűnik — a glued `\'…\'\\\'\'…\'` szó is egy érték (RÉGEN: az első záró idézőjelnél megállt, és a maradék a naplóba került)',
      !/ss/.test(ae1.replace(/PGPASSWORD|«elrejtve»/g, '')) && /«elrejtve»/.test(ae1) && / psql -h \/tmp$/.test(ae1),
      { tisztitott: ae1 });
    step('(ak2) R166/P2: a dupla idézeten belüli `\\"` sem zárja a titkot',
      !/ss/.test(ae2.replace(/PGPASSWORD|«elrejtve»/g, '')) && /«elrejtve» psql$/.test(ae2),
      { tisztitott: ae2 });
    // A ZÁRATLAN IDÉZET A SOR VÉGÉIG TART: ahol a határ nem tudható, TÖBBET rejtünk el (KUKA-049).
    const ae3 = redactConnStrings("PGPASSWORD='nyitva marad a sor vegeig");
    step('(ak3) R166/P2: a ZÁRATLAN idézet a sor végéig tart — a bizonytalanság nem a megengedő ág',
      ae3 === 'PGPASSWORD=«elrejtve»', { tisztitott: ae3 });
    // ÉS AZ ELLENPÁROK: a jogos esetek változatlanok, és a szomszéd szöveg NEM esik áldozatul.
    const ae4 = redactConnStrings("PGPASSWORD='top secret' password=\"más titok\" pwd=egyszeru");
    const ae5 = redactConnStrings('rendben, nincs benne titok');
    const ae6 = redactConnStrings('PGPASSWORD=TITOK; PGUSER=lathato');
    step('(ak4) R166/P2 ELLENPÁROK: a három jogos alak továbbra is PONTOSAN háromszor rejtőzik el, a titokmentes szöveg változatlan, és a `;` utáni NEM titkos mező megmarad',
      (ae4.match(/«elrejtve»/g) || []).length === 3 && !/top secret|más titok|egyszeru/.test(ae4)
      && ae5 === 'rendben, nincs benne titok'
      && ae6 === 'PGPASSWORD=«elrejtve»; PGUSER=lathato',
      { harom: ae4, hatarral: ae6 });
    // ÉS A KAPCSOLATI CÍM ÚTJA VÁLTOZATLAN (a tisztító első passzusa).
    const ae7 = redactConnStrings('pg_restore: error: connection to postgres://u:TITKOS@gep:5432/db failed; PGPASSWORD=MASIK');
    step('(ak5) R166/P2: a kapcsolati cím és a jelszó EGYÜTT is eltűnik (a két passzus nem rontja el egymást)',
      !/TITKOS|MASIK/.test(ae7) && /«kapcsolati cím elrejtve»/.test(ae7) && /«elrejtve»$/.test(ae7),
      { tisztitott: ae7 });
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // AG — AMIT NEM LEHET VÉGIGVINNI, AZT NEM KÍNÁLJUK FEL (R166, külső review, Codex, két P2)
  //
  // A KÉT LELET: (1) a megerősítés és a Próbaüzenetek útmutatója a fejlesztői levél-fogadóra áll,
  // ami a `devSurface` kapcsoló mögött él — telepített környezetben a cél NEM létezik; (2) a két
  // készlet-nézet útmutatója a megnyíló TÁBLÁRA áll, ami csak kiadott `keszlet` adatkörrel rajzol —
  // a tagság NEM jog. Mindkettő a `KUKA-391` osztálya: a felkínálás volt a hibás állítás.
  //
  // A MÉRÉS MINDKÉT IRÁNYBAN megy: a kapu zárva NEM kínál, nyitva IGEN — különben a javítás
  // „mindent elrejtek" is lehetne (KUKA-091).
  {
    part('AL) R166 — a felkínálás az ÉLŐ feltételhez kötött: levél-fogadó és készlet-jog (külső review, P2)');
    // A JELENET MEGKAPJA A KIOSZTOTT MINTA TÉNYÉT is (R166, hetedik kör): ez a csoport a LEVÉL-FOGADÓ
    // és a KÉSZLET-JOG kapuját méri — a minta-kapu (`KUKA-413` · `KUKA-414`) a saját csoportjában áll.
    // A sor nem gyengül: a `stock_access: false` ág továbbra is ZÁRJA a két készlet-útmutatót.
    /**
     * AZ INDULÓ ADAT IS BENNE VAN, KÜLÖNBEN A MÉRÉS ÜRES (R176 · `KUKA-417` · `KUKA-216`).
     *
     * A két átívelő útmutató `requires_story_data`-t is kér. Ha ezt a kiinduló nézet nem hordozza,
     * akkor a levél-fogadó kapujának a HATÁSA sem mérhető rajtuk: már az induló adat kizárná őket,
     * és a sor egy üres halmazt igazolna.
     */
    const alap = { signed_in: true, book_id: 'b_firm', member: true, role: 'admin', personal: false, demo: true, demo_fixture: true, story_data: { pending_invite: true, other_member: true } };
    const levelNelkul = allowedToursFor({ ...alap, dev_mailbox: false, stock_access: true });
    const levellel = allowedToursFor({ ...alap, dev_mailbox: true, stock_access: true });
    const jogNelkul = allowedToursFor({ ...alap, dev_mailbox: true, stock_access: false });
    const joggal = levellel;
    /**
     * KÉT KÉSZLET, KÉT KÉRDÉS (R176) — és a különbség KIMONDVA.
     *
     * A levél-fogadóhoz kötött útmutatók DEKLARÁLT készlete az R176 óta NÉGY tagú: a két átívelő
     * történet is tartalmaz `demo-mail-open` és `mailbox` lépést, tehát telepített demóban (a
     * fejlesztői jel nélkül) a levél-fogadó 404-et ad, és a történet megszakadna.
     *
     * A KAPU HATÁSÁT viszont itt csak a két eredetin tudjuk mérni: a két átívelő történetet ebben a
     * nézet-objektumban a FELÜLET-horgony kapuja már előbb kizárja (`surface_anchors` — az a
     * kiszolgáló belső feloldója, ezt az egység-mérés nem modellezi). Az ő levél-kapujuk ÉLŐ mérése
     * ezért máshol áll: `as1`/`as10` (élő HTTP) és a kötelező böngésző-kapu. A verdikt tehát nem
     * mutat a mérés hatókörén túl (`KUKA-216`).
     */
    const LEVEL = ['tour.verify', 'tour.outbox'];
    const LEVEL_DEKLARALT = ['tour.verify', 'tour.outbox', 'tour.inviteRevoke', 'tour.reentry'];
    const KESZLET = ['tour.stockcard', 'tour.movements'];

    step('(al1) R166/P2: a fejlesztői levél-fogadó NÉLKÜL a megerősítés és a Próbaüzenetek útmutatója NEM kínálódik fel (RÉGEN: felkínálódott, és a második lépésén nevezetten megszakadt)',
      LEVEL.every((t) => !levelNelkul.includes(t)) && LEVEL.every((t) => levellel.includes(t)),
      { kapu_zarva: LEVEL.filter((t) => levelNelkul.includes(t)).join(',') || 'egyik sem',
        kapu_nyitva: LEVEL.filter((t) => levellel.includes(t)).length });

    step('(al2) R166/P2: kiadott készlet-adatkör NÉLKÜL a két készlet-nézet útmutatója NEM kínálódik fel — a tagság nem jog (RÉGEN: a tagság alapján felkínálódott, és a táblán megszakadt)',
      KESZLET.every((t) => !jogNelkul.includes(t)) && KESZLET.every((t) => joggal.includes(t)),
      { kapu_zarva: KESZLET.filter((t) => jogNelkul.includes(t)).join(',') || 'egyik sem',
        kapu_nyitva: KESZLET.filter((t) => joggal.includes(t)).length });

    // ELLENPÁR: a két kapu CSAK a sajátjait zárja — a többi útmutató készlete VÁLTOZATLAN.
    const maradek = (lista) => lista.filter((t) => !LEVEL.includes(t) && !KESZLET.includes(t)).sort().join(',');
    step('(al3) R166/P2 ELLENPÁR: a két kapu CSAK a saját útmutatóit zárja — a többi felkínált készlet betűre változatlan',
      maradek(levelNelkul) === maradek(levellel) && maradek(jogNelkul) === maradek(joggal)
      && maradek(levellel).length > 0,
      { tobbi_darab: maradek(levellel).split(',').length });

    // ÉS A FELTÉTELT A REGISZTER MONDJA KI, nem a kapu találja ki (a deklaráció mindkét irányban mérve).
    const deklaralt = Object.values(TOURS).filter((t) => t.requires_dev_mailbox === true).map((t) => t.id).sort();
    const deklaraltJog = Object.values(TOURS).filter((t) => t.requires_stock_access === true).map((t) => t.id).sort();
    step('(al4) R166/P2 + R176: a feltételt az ÚTMUTATÓ deklarálja (a kapu nem névsorból dönt) — a levél-fogadóhoz kötött készlet NÉGY tagú, a készlet-joghoz kötött KETTŐ',
      deklaralt.join(',') === LEVEL_DEKLARALT.slice().sort().join(',')
      && deklaraltJog.join(',') === KESZLET.slice().sort().join(','),
      { level_fogado: deklaralt.join(','), keszlet_jog: deklaraltJog.join(',') });
  }

  // ── AI) R166 — A KAPCSOLÓ-OLVASÁS EGY OTTHONA (külső review, Codex, P2 · KUKA-398) ──────────
  //
  // A LELET: a `VS_KEEP_RESTORE_TARGET` a PUSZTA igaz-értéken állt, ezért a kikapcsolásnak szánt
  // `0` és `false` BEKAPCSOLTA a megtartást — futásonként egy maradék adatbázis a kiszolgálón.
  //
  // ÉS A SZABÁLY MÁR MEGVOLT: pontosan ezt javította az R164 a `VS_SAFETY_ALLOW_REMOTE`-on, de a
  // HELYSZÍNEN, nem szabályként (KUKA-003 · KUKA-129). Ezért a mérés NEM csak a javított kapcsolót
  // nézi: az ELLENPÁR a testvér-kapcsolót is méri, hogy az egy otthonba húzás nem vitt el semmit.
  {
    part('AI) R166 — a kapcsoló-olvasás EGY otthon: a `0`/`false` KI, nem BE (külső review, P2)');
    const KI = ['0', 'false', 'nem', 'off', 'no', 'true', 'igen', 'ON', '2'];

    step('(ai1) R166/P2: a megtartás-kapcsoló CSAK a pontos `1`-re áll BE (RÉGEN: `VS_KEEP_RESTORE_TARGET=0` és `=false` is bekapcsolta, mert nem üres sztring)',
      KI.every((v) => explicitSwitch({ VS_KEEP_RESTORE_TARGET: v }, 'VS_KEEP_RESTORE_TARGET').on === false)
      && explicitSwitch({ VS_KEEP_RESTORE_TARGET: '1' }, 'VS_KEEP_RESTORE_TARGET').on === true,
      { be_kapcsolo_ertek: SWITCH_ON,
        ki_marad: KI.filter((v) => explicitSwitch({ VS_KEEP_RESTORE_TARGET: v }, 'VS_KEEP_RESTORE_TARGET').on === false).length });

    step('(ai2) R166/P2: a nem beállított és az ÜRES kapcsoló KI — és ez FELISMERT állapot, nem elírás',
      ['', '   '].every((v) => { const r = explicitSwitch({ VS_KEEP_RESTORE_TARGET: v }, 'VS_KEEP_RESTORE_TARGET'); return r.on === false && r.recognised === true; })
      && explicitSwitch({}, 'VS_KEEP_RESTORE_TARGET').recognised === true
      && explicitSwitch({}, 'VS_KEEP_RESTORE_TARGET').on === false,
      { ures_es_nincs: 'KI, felismert' });

    // A NÉMA TARTALÉK-ÁG ELREJTENÉ AZ ELÍRÁST (KUKA-238): a be-nem-álló, NEM üres érték KIMONDVA.
    step('(ai3) R166/P2: a beállított, de nem `1` érték NEVEZETTEN nem felismert — a hívó ki tudja mondani, hogy a kapcsolót figyelmen kívül hagyta',
      KI.every((v) => explicitSwitch({ VS_KEEP_RESTORE_TARGET: v }, 'VS_KEEP_RESTORE_TARGET').recognised === false)
      && KI.every((v) => explicitSwitch({ VS_KEEP_RESTORE_TARGET: v }, 'VS_KEEP_RESTORE_TARGET').basis.includes(JSON.stringify(v))),
      { nem_felismert: KI.length });

    // ELLENPÁR: a testvér-kapcsoló VÁLTOZATLAN — az egy otthonba húzás nem lazított a helyi kapun.
    const tavoli = 'postgres://u@10.0.0.9:5432/x';
    step('(ai4) R166/P2 ELLENPÁR: a testvér-kapcsoló (`VS_SAFETY_ALLOW_REMOTE`) viselkedése BETŰRE változatlan — a távoli cél csak a pontos `1`-re engedett',
      localOnlyVerdict(tavoli, {}).allowed === false
      && ['0', 'false', 'true', 'igen'].every((v) => localOnlyVerdict(tavoli, { VS_SAFETY_ALLOW_REMOTE: v }).allowed === false)
      && localOnlyVerdict(tavoli, { VS_SAFETY_ALLOW_REMOTE: '1' }).allowed === true
      && localOnlyVerdict(tavoli, { VS_SAFETY_ALLOW_REMOTE: '1' }).override === true,
      { helyi_kapu: 'zárva marad minden nem-`1` értékre' });

    // ÉS A PRÓBA A MEGHÍVHATÓ FELOLDÓT HÍVJA, nem a forrás szövegét olvassa (KUKA-207 · KUKA-239).
    step('(ai5) R166/P2: a megtartás-ág a MEGHÍVHATÓ feloldóból dönt — a próba ugyanazt futtatja, amit a lánc',
      typeof explicitSwitch === 'function' && SWITCH_ON === '1'
      && explicitSwitch({ VS_KEEP_RESTORE_TARGET: ' 1 ' }, 'VS_KEEP_RESTORE_TARGET').on === true,
      { koruli_szokoz: 'levágva, tehát a ` 1 ` is BE' });
  }

  // ── AN) R166 — A FELKÍNÁLÁS PRÓBÁJA NEM ÍRHAT KIADÁSI LELTÁRT (külső review, P2) ──────────────
  //
  // A LELET: a 2.2-ben megépített `stock_access` a `readSample()`-t hívta — az viszont SIKERES
  // olvasáskor `disclose()`-t hajt végre, tehát egy `disclosure` sort ÍR. A súgó megnyitása
  // (`GET /api/assistant/status`, deklarált `mutates: false`) így olyan audit-sort keletkeztetett,
  // ami szerint védett adat KIADÁSRA került — holott a válasz a készlet-eredményt nem is hordozza.
  {
    part('AN) R166 — a felkínálás próbája NEM ír kiadási leltárt (külső review, P2)');
    const base = `http://127.0.0.1:${app.server.address().port}`;
    const sorok = () => app.store.get('SELECT COUNT(*) AS n FROM disclosure').n;
    const c = new Client(base);
    await c.post('/api/register', { email: 'an-anna@pelda.hu', password: PW, lang: 'hu' });
    const mail = (await c.get('/dev/mailbox')).body.mails.filter((x) => x.to === 'an-anna@pelda.hu')[0];
    const l = new URL(mail.link);
    await c.get(l.pathname + l.search);
    await c.post('/api/login', { email: 'an-anna@pelda.hu', password: PW });
    await c.post('/api/workspaces', { name: 'AN166 Kft', plan: 'starter', business: { jurisdiction: 'HU', tax_id: '12345678-1-42' } });

    const elotte = sorok();
    const st = await c.get('/api/assistant/status');
    const utana = sorok();
    const tourok = (st.body && st.body.tours) || [];
    const keszletKinalva = ['tour.stockcard', 'tour.movements'].every((t) => tourok.some((x) => (x.id || x) === t));

    step('(an1) R166/P2: a súgó-állapot kérése EGYETLEN kiadási leltár-sort sem ír (RÉGEN: a `readSample` sikeres ága `disclose`-t hajtott végre, tehát minden súgó-megnyitás audit-sort keletkeztetett)',
      st.status === 200 && utana === elotte,
      { status: st.status, disclosure: `${elotte}→${utana}`, keletkezett: utana - elotte });

    // ELLENPÁR: a kapu NEM lett megengedőbb — a készlet-útmutatók TOVÁBBRA IS felkínálódnak annak,
    // akinek a joga megvan (különben a javítás „mindent elrejtek" is lehetne — KUKA-091).
    step('(an2) R166/P2 ELLENPÁR: a két készlet-útmutató TOVÁBBRA IS felkínálódik a jogosult tagnak — a hatás elvétele nem vette el a döntést',
      keszletKinalva, { felkinalt_utmutato: tourok.length, keszlet: keszletKinalva });

    // ÉS AZ ISMÉTELT KÉRÉS SEM ÍR: a hiba nem „egyszer fordult elő", hanem minden megnyitáskor.
    const m2 = sorok();
    await c.get('/api/assistant/status');
    await c.get('/api/assistant/status');
    step('(an3) R166/P2: két TOVÁBBI súgó-megnyitás sem ír leltár-sort — a hiba minden kérésnél keletkezett, nem egyszer',
      sorok() === m2, { disclosure: `${m2}→${sorok()}` });
  }

  // ── AO) R166 — A PG-PRÓBÁK INDULÁSA ÉS A LÉTEZÉS-KÉRDÉS (külső review, P2) ────────────────────
  //
  // HÁROM LELET EGY CSOPORTBAN, mert mind a három ugyanazt az osztályt mutatja: egy BIZONYTALAN
  // vagy MÁS SÉMÁJÚ bemenetet a régi kód a MEGENGEDŐ ágra fordított.
  {
    part('AO) R166 — a pg-próbák indulása és a létezés-kérdés (külső review, P2)');
    const SOCKET = 'socket:/var/run/postgresql?db=forras&port=5432&user=u';
    const HALO = 'postgres://u@127.0.0.1:5432/forras';
    const utat = (u) => { try { return new URL(u).pathname.replace(/^\/+/, '') || 'postgres'; } catch { return null; } };

    step('(ao1) R166/P2: a pg-próbák INDULÓ kérdése a feloldóból kapja a forrás nevét, és a `socket:` címen ez NEM az út (RÉGEN: az út csupaszítva lett „adatbázis-névvé", a kapcsolat elbukott, és a próba a saját adatbázisa előtt kilépett)',
      effectiveDatabase(SOCKET).name === 'forras' && utat(SOCKET) === 'var/run/postgresql'
      && effectiveDatabase(SOCKET).name !== utat(SOCKET),
      { feloldo: effectiveDatabase(SOCKET).name, regi_csupaszitas: utat(SOCKET) });

    step('(ao2) R166/P2 ELLENPÁR: HÁLÓZATI címen a feloldó UGYANAZT adja, amit a régi csupaszítás — a javítás tehát nem változtatott a működő eseten',
      effectiveDatabase(HALO).name === 'forras' && utat(HALO) === 'forras',
      { feloldo: effectiveDatabase(HALO).name, regi_csupaszitas: utat(HALO) });

    step('(ao3) R166/P2: és ahol a KÉT FOGYASZTÓ mást olvas, az induló kérdés sem talál ki nevet — a feloldó NEM ELDÖNTHETŐ-t ad, a hívó kimondja és megáll',
      effectiveDatabase('postgres://u@h:5432/egy?dbname=ketto').name === null
      && /KÉT FOGYASZTÓ/.test(effectiveDatabase('postgres://u@h:5432/egy?dbname=ketto').basis),
      { nev: String(effectiveDatabase('postgres://u@h:5432/egy?dbname=ketto').name) });

    // ── A LÉTEZÉS-KÉRDÉS HÁROM ÁLLAPOTÚ, ÉS AZ ISMERETLEN MINDKÉT IRÁNYBAN BUKTAT ───────────────
    //
    // A lánc feloldóját a FORRÁSÁBÓL nem méri egy minta (KUKA-239) — a SZABÁLYT mérjük, ugyanazon
    // az alakon, amire a lánc épült: a parancs-állapot megmarad, és a két kérdés fail-closed.
    const letezikV = (allapot) => (allapot.code === 0
      ? { known: true, exists: allapot.out.trim() === '1', hiba: '' }
      : { known: false, exists: null, hiba: allapot.err || `psql kilépés ${allapot.code}` });
    const ottVan = (a) => letezikV(a).exists === true;
    const nincsOtt = (a) => { const v = letezikV(a); return v.known === true && v.exists === false; };
    const VAN = { code: 0, out: '1\n', err: '' };
    const NINCS = { code: 0, out: '\n', err: '' };
    const BUKOTT = { code: 2, out: '', err: 'could not connect to server' };

    step('(ao4) R166/P2: a BUKOTT létezés-kérdés NEM „nincs ott" — az „eltakarítva" állítás tehát nem mehet át attól, hogy az ellenőrző kérés sem futott le (RÉGEN: az üres kimenet `false`-ra fordult, és a takarítás-állítás ZÖLD lett)',
      nincsOtt(VAN) === false && nincsOtt(NINCS) === true && nincsOtt(BUKOTT) === false,
      { van: nincsOtt(VAN), nincs: nincsOtt(NINCS), bukott: nincsOtt(BUKOTT) });

    step('(ao5) R166/P2: és a BUKOTT kérdés NEM „ott van" sem — a „maradékot nem dobtuk el" állítás sem mehet át mérés nélkül; az ismeretlen MINDKÉT irányban buktat',
      ottVan(VAN) === true && ottVan(NINCS) === false && ottVan(BUKOTT) === false
      && letezikV(BUKOTT).known === false && letezikV(BUKOTT).hiba.length > 0,
      { van: ottVan(VAN), nincs: ottVan(NINCS), bukott: ottVan(BUKOTT), alap: letezikV(BUKOTT).hiba.slice(0, 40) });

    // ÉS A KÉT PRÓBA TÉNYLEGESEN EZT HÍVJA (KUKA-239: a feloldó zöldje nem a hívás zöldje — egy
    // pin, amit a javítás visszavétele nem buktat meg, nem gépi jel).
    const intentSrc = readFileSync(join(ROOT, 'tools/v3_pg_intent_proof.mjs'), 'utf8');
    const safetySrc = readFileSync(join(ROOT, 'tools/v3_pg_restore_safety_proof.mjs'), 'utf8');
    const csupaszit = /SELECT current_database\(\)'\], new URL\([a-zA-Z]+\)\.pathname/;
    step('(ao7) R166/P2: MINDKÉT pg-próba induló kérdése a feloldót hívja, és egyik sem csupaszítja az ÚTAT adatbázis-névvé — a nem eldönthető nevet pedig kimondja és megáll',
      /effectiveDatabase\(url\)/.test(intentSrc) && /effectiveDatabase\(bazisUrl\)/.test(safetySrc)
      && !csupaszit.test(intentSrc) && !csupaszit.test(safetySrc)
      && (intentSrc.match(/NEM ELDÖNTHETŐ/g) || []).length > 0
      && (safetySrc.match(/NEM ELDÖNTHETŐ/g) || []).length > 0,
      { intent: /effectiveDatabase\(url\)/.test(intentSrc), safety: /effectiveDatabase\(bazisUrl\)/.test(safetySrc),
        regi_csupaszitas: csupaszit.test(intentSrc) || csupaszit.test(safetySrc) });

    // ÉS A LÉTEZÉS-FELOLDÓ IS A LÁNCBAN ÁLL, nem csak itt (ugyanaz a kötés, mint fent).
    step('(ao8) R166/P2: a lánc a HÁROM ÁLLAPOTÚ létezés-feloldót használja, és a puszta `=== \'1\'` alakú kérdés eltűnt a forrásból',
      /const letezikV = \(nev\) => \{/.test(safetySrc)
      && /const nincsOtt = \(nev\) =>/.test(safetySrc) && /const ottVan = \(nev\) =>/.test(safetySrc)
      && !/const letezik = \(nev\) => psql\(/.test(safetySrc)
      && !/!letezik\(/.test(safetySrc),
      { harom_allapot: true, regi_alak: /const letezik = \(nev\) => psql\(/.test(safetySrc) });

    // ── A MEGSZAKÍTÁS SORRENDJE: a gyerek ELŐBB áll le, csak utána takarítunk ────────────────────
    const forras = readFileSync(join(ROOT, 'tools/v3_pg_restore_safety_proof.mjs'), 'utf8');
    const kezelo = /process\.on\(jel, \(\) => \{ ([^}]+) \}\);/.exec(forras);
    const sorrend = kezelo ? kezelo[1] : '';
    step('(ao6) R166/P2: a megszakítás-kezelő ELŐBB a gyerek FOLYAMATCSOPORTJÁT állítja le, és CSAK UTÁNA dobja el a sajátot (RÉGEN: a `detached` gyerek a szülő kilépése után is futtathatta a `pg_dump`/`pg_restore`-t, versenyben a takarítással)',
      sorrend.indexOf('allitsdLeAGyereket()') >= 0
      && sorrend.indexOf('allitsdLeAGyereket()') < sorrend.indexOf('dobjaSajat()')
      && /process\.kill\(-gyerekPid, jel\)/.test(forras)
      && /let gyerekPid = 0;[\s\S]{0,400}?process\.on\('exit'/.test(forras),
      { sorrend: sorrend.replace(/\s+/g, ' ').slice(0, 80) });
  }

  // ── AP) R166 — AZ ÖTÖDIK REVIEW-KÖR ÖT P2-JE (külső review) ──────────────────────────────────
  //
  // ÖT LELET, HÁROM OSZTÁLY: (a) a titok határa megint egy IDÉZŐJEL volt, (b) a próba verdiktje
  // nem vette figyelembe, amit maga mondott ki (nem mért eset · bukott takarítás), (c) a nemleges
  // ág nem állította vissza, amit lebontott.
  {
    part('AP) R166 — az ötödik review-kör öt P2-je (külső review)');

    // (a) A KAPCSOLATI CÍM VÉGE IS SHELL-SZÓ, nem az első aposztróf.
    const cimAposztrof = redactConnStrings("postgres://u:pa'ss@host/db");
    const cimIdezett = redactConnStrings("pg_dump 'postgres://u:titok@host/db' -f ki.dump");
    const cimKetto = redactConnStrings('ket: postgres://a:x@h1/d es postgres://b:y@h2/d vege');
    step("(ap1) R166/P2: az APOSZTRÓFOT tartalmazó kapcsolati cím TELJESEN eltűnik (RÉGEN: a minta `[^\\s'\\\"]*`-gal zárt, ezért a `pa` után megállt, és a jelszó MARADÉKA meg a GAZDAGÉP kiszivárgott)",
      !cimAposztrof.includes('ss@host') && !cimAposztrof.includes('pa') && cimAposztrof.includes('«kapcsolati cím elrejtve»'),
      { tisztitott: cimAposztrof });

    step('(ap2) R166/P2: és a rejtés a SAJÁT szaván belül marad — a sor hasznos része megmarad (nem rejtünk a sor végéig, ha a szó határa tudható)',
      !cimIdezett.includes('titok') && !cimIdezett.includes('host') && cimIdezett.includes('-f ki.dump')
      && cimKetto.includes('vege') && (cimKetto.match(/«kapcsolati cím elrejtve»/g) || []).length === 2,
      { idezett: cimIdezett, ketto: cimKetto });

    step('(ap3) R166/P2 ELLENPÁR: a titokmentes szöveg VÁLTOZATLAN, és a cím+jelszó együtt is eltűnik',
      redactConnStrings('semmi titok nincs itt, csak sima szoveg') === 'semmi titok nincs itt, csak sima szoveg'
      && !redactConnStrings('PGPASSWORD=titok psql postgres://u:x@h/d').includes('titok')
      && !redactConnStrings('PGPASSWORD=titok psql postgres://u:x@h/d').includes('x@h'),
      { valtozatlan: true });

    // (b) A PRÓBA VERDIKTJE AZT IS NÉZZE, AMIT MAGA MONDOTT KI.
    const safetySrc2 = readFileSync(join(ROOT, 'tools/v3_pg_restore_safety_proof.mjs'), 'utf8');
    const intentSrc2 = readFileSync(join(ROOT, 'tools/v3_pg_intent_proof.mjs'), 'utf8');
    step('(ap4) R166/P2: a NEM MÉRT eset nem lehet „RENDBEN" — a siker-feltétel a `nemMert` listát is nézi (RÉGEN: csak a bukott lépéseket, így egy TCP-only kiszolgálón a kimaradt `socket:` ellenpár mellett is 0-val lépett ki)',
      /bad\.length === 0 && nemMert\.length === 0/.test(safetySrc2)
      && /NEM TELJES/.test(safetySrc2) && /process\.exit\(4\)/.test(safetySrc2),
      { siker_feltetel: 'bad === 0 ÉS nemMert === 0' });

    step('(ap5) R166/P2: a SAJÁT erőforrás takarítása a VERDIKT ELŐTT fut, és a maradék MÉRT lépés — mindkét pg-próbában (RÉGEN: csak a kilépési horog figyelmeztetett, a verdikt és a kilépési kód már megvolt)',
      /const maradekSajat = dobjaSajat\(\);/.test(safetySrc2)
      && /step\('Y\. a lánc MINDEN saját adatbázisa eldobva/.test(safetySrc2)
      && /const maradekSajat = dobjaSajat\(\);/.test(intentSrc2)
      && /return maradt;/.test(safetySrc2) && /return maradt;/.test(intentSrc2),
      { mindkét_proba: true });

    // (c) A NEMLEGES ÁG ÁLLÍTSA VISSZA, AMIT LEBONTOTT.
    const srvSrc3 = readFileSync(join(ROOT, 'v3app/server.mjs'), 'utf8');
    step('(ap6) R166/P2: a telt tárból jövő 503 VISSZAVESZI a régi munkamenetet és ÚJRAÍRJA a függő meghívó-szándékot (RÉGEN: a `delete` a `pending_intent` sort is elvitte, a jegy pedig a normál úton csak a szerveren él — az újrapróbálás nem tudta folytatni a meghívást)',
      /sessions\.set\(session\.id, session\);/.test(srvSrc3)
      && /helyreallt && pending/.test(srvSrc3)
      && /rememberIntent\(\{ store, sessionId: session\.id, token: pending, clock \}\)/.test(srvSrc3)
      && /intent_preserved/.test(srvSrc3),
      { visszavetel: 'a saját azonosítóján, a szándékkal együtt' });

    step('(ap7) R166/P2: és ha a VISSZAVÉTEL is elbukik, azt a válasz KIMONDJA — nem hallgatjuk el (KUKA-050)',
      /helyreallt = sessions\.has\(session\.id\)/.test(srvSrc3)
      && /a korábbi munkamenetet sem sikerült visszavenni/.test(srvSrc3),
      { kimondva: true });

    // (d) A KIJELENTKEZÉS-ÚTMUTATÓ NEM VESZÍTI EL A CÉLJÁT, és a BEJÁRÓ azt nyomja, amit az ember.
    const logoutTour = TOURS['tour.logout'];
    const logoutCelok = logoutTour.steps.map((x) => x.target);
    // A BEJÁRÓ KÖZÖS OTTHONBA KERÜLT (R166, hetedik kör · `KUKA-003`): a minta-kapu viselkedés-őre
    // UGYANEZT futtatja, ezért a pin a MAI otthonra mutat. A szabály nem változott — ERŐSEBB lett,
    // mert most két próba-lap ugyanazt a szigorítást használja.
    const jaroSrc = readFileSync(join(ROOT, 'tests/e2e/tourWalk.mjs'), 'utf8');
    step('(ap8) R166/P2: a kijelentkezés-útmutató NEM lép ki a profil-menüből — nincs benne navigáló lépés, ami elvinné a `logout` horgonyt (RÉGEN: a középső lépés a biztonsági lapra vitt, a `go()` bezárta a menüt, és a harmadik lépés nevezetten megszakadt)',
      logoutCelok.join(',') === 'profile,logout'
      && !logoutCelok.includes('profile-menu-security'),
      { lepesek: logoutCelok.join(' → ') });

    step('(ap9) R166/P2: és a BEJÁRÓ megnyomja minden lépés SAJÁT célját (az utolsót nem, mert az a CÉL) — a mérés így a VISELKEDÉST méri, nem egy olyan utat, amit ember nem jár be (KUKA-237)',
      /const cel = page\.getByTestId\(steps\[i\]\.target\)\.first\(\);/.test(jaroSrc)
      && /if \(megnyomhato\) await cel\.click/.test(jaroSrc)
      && /if \(i \+ 1 < steps\.length\) \{/.test(jaroSrc),
      { bejaro: 'a kiemelt vezérlőt is megnyomja' });

    /**
     * ÉS AZ OSZTÁLYRA ÁLTALÁNOS ŐR JÖN, NEM HARMADIK EGYEDI PIN (`KUKA-409` · KUKA-003).
     *
     * A kattintó bejáró a `tour.resend`-et is kibuktatta: az első lépése a NÉZET-VÁLTÓ gombra állt
     * (`auth-resend-open`), ami CSAK a belépési nézetben létezik — megnyomva a lap átvált, a gomb
     * MEGSZŰNIK, és a `checkRun` már az ELSŐ lépésen `targetMissing`-et ad. Ugyanaz az osztály, mint
     * a `tour.logout`-nál: a bemutató elnavigál a saját céljától.
     *
     * A VÁLTÓ-KÉSZLET A LAP FORRÁSÁBÓL JÖN, nem beírt névsorból (KUKA-045): ami `data-auth=`-ot
     * hordoz, az nézetet vált. Így egy JÖVŐBELI váltó-vezérlő is automatikusan fedve van.
     */
    const lapSrc = readFileSync(join(ROOT, 'v3app/public/app.js'), 'utf8');
    const valtok = new Set([
      ...(lapSrc.match(/data-auth="[a-z]+"[^>]*data-testid="([a-z0-9-]+)"/g) || []),
      ...(lapSrc.match(/data-testid="([a-z0-9-]+)"[^>]*data-auth="[a-z]+"/g) || []),
    ].map((x) => (/data-testid="([a-z0-9-]+)"/.exec(x) || [])[1]).filter(Boolean));
    const valtoCel = [];
    for (const t of Object.values(TOURS)) {
      for (const lep of t.steps) if (valtok.has(lep.target)) valtoCel.push(`${t.id}/${lep.id}→${lep.target}`);
    }
    step('(ap10) KUKA-409: EGYETLEN útmutató-lépés sem áll NÉZET-VÁLTÓ vezérlőn — az ilyen gomb a használatával MEGSZŰNIK, és a bemutató a saját céljától navigál el (RÉGEN: a `tour.resend` első lépése az `auth-resend-open`-en állt, és a kattintó bejáró ki is buktatta)',
      valtoCel.length === 0 && valtok.size >= 3,
      { valto_vezerlo: valtok.size, lepes_ami_valton_all: valtoCel.join(', ') || 'egy sincs' });
  }

  // ── AQ) R166 — A HATODIK REVIEW-KÖR NÉGY P2-JE (külső review) ────────────────────────────────
  //
  // MIND A NÉGY A SAJÁT, EBBEN A KÖRBEN ÉPÍTETT MUNKÁMBAN — kettő KÖZVETLENÜL egy korábbi
  // javításom következménye (a shell-határos elrejtés és a leváló gyerek takarítása).
  {
    part('AQ) R166 — a hatodik review-kör négy P2-je (külső review)');

    // (a) A CÍM HATÁRA NEM SHELL-ELVÁLASZTÓ: a `;` és a `&` LEGÁLIS egy URL-ben.
    const pv = (x) => redactConnStrings(x);
    step('(aq1) R166/P2: a kapcsolati cím jelszó-részében lévő `;` és `&` NEM zárja a rejtést (RÉGEN: az én KUKA-404-es javításom SHELL-nyelvtant alkalmazott egy URL-re, és a `;ss@host/db` — a jelszó maradéka ÉS a gazdagép — a naplóba került)',
      !pv('postgres://u:pa;ss@host/db').includes('ss@host')
      && !pv('postgres://u:pa&ss@host/db').includes('ss@host')
      && !pv('psql postgres://u:pa;ss@host/db --quiet').includes('ss@host')
      && !pv('postgres://u:t@h/d?opt=a;b&c=d utana').includes('t@h'),
      { negy_alak: 'mind elrejtve' });

    step('(aq2) R166/P2 ELLENPÁR: a SHELL-szót olvasó kulcs=érték passzus viszont TOVÁBBRA IS a shell határát használja (a `;` ott valódi szó-vég), és a hasznos szöveg megmarad',
      pv('PGPASSWORD=sec;ret psql').includes(';ret')
      && !pv('PGPASSWORD=sec;ret psql').includes('sec')
      && pv('postgres://u:t@h/d?x=1;2 utana').includes('utana')
      && pv('semmi titok, csak sima szoveg') === 'semmi titok, csak sima szoveg',
      { ket_nyelvtan: 'URL = fehér szóköz · kulcs=érték = shell' });

    // (b) A MÉRÉS SAJÁT „IDEGEN" ADATBÁZISA A TAKARÍTÁSI LISTÁN ÁLL.
    const safetyQ = readFileSync(join(ROOT, 'tools/v3_pg_restore_safety_proof.mjs'), 'utf8');
    // A KIKOMMENTELT SOR NEM TELJESÍTÉS (SAJÁT lelet a visszacsúszás-próbán · KUKA-239): az első
    // alakom a `//`-val kezdődő sort is elfogadta, tehát a javítás visszavétele NEM buktatta meg.
    // Mostantól a sor ELEJÉRE kötünk: sor-kezdet, csak fehér szóköz, és semmi más előtte.
    const addSor = /^[ \t]*sajatDb\.add\(idegen\);/m.exec(safetyQ);
    const addIdx = addSor ? addSor.index : -1;
    const zIdx = safetyQ.indexOf("step('Z. a mérés saját idegen-maradéka eldobva");
    const yIdx = safetyQ.indexOf('const maradekSajat = dobjaSajat();');
    step('(aq3) R166/P2: a mérés SAJÁT „idegen" adatbázisa a takarítási listán áll, tehát a MEGSZAKÍTÁS is eldobja (RÉGEN: a jel-kezelő és a kilépési horog csak a `sajatDb`-t dobta, ez pedig soha nem került bele — minden megszakított futás ott hagyta)',
      addIdx > 0, { listan: addIdx > 0, kikommentelt_nem_szamit: true });

    step('(aq4) R166/P2: és a SORREND rendben van — a záró `Z.` lépés ELŐBB dobja el és MÉRI a hiányt, a verdikt előtti takarítás csak utána fut (különben a `Z.` a saját takarításunkat mérné)',
      zIdx > 0 && yIdx > zIdx && addIdx < zIdx,
      { sorrend: 'add → Z (mér) → dobjaSajat (verdikt előtt)' });

    // (c) AZ ÁTIRAT-ELLENŐRZÉS A TARTALMAT IS MEGKÉRDEZI, HA A FÁJLNÉV EGYEZIK.
    const exportQ = readFileSync(join(ROOT, 'tools/v3_fogyasztas_export.mjs'), 'utf8');
    step('(aq5) R166/P2: az átirat-ellenőrzés HÁROM állapotú — a beágyazott azonosító ELLENTMONDÁSA elakadás akkor is, ha a FÁJLNÉV egyezik; a hiánya viszont megengedi a fájlnév-alapot (RÉGEN: a név-egyezés KIHAGYTA a tartalom-ellenőrzést, és egy átmásolt fájl MÁS munkamenet fogyasztását címkézte a kértnek)',
      // A MAI, ERŐSEBB alak: az ellentmondás az IDEGEN azonosító jelenléte (a hetedik kör leletével —
      // a vegyes átirat is ellentmondás, `KUKA-415`). A RÉGI, gyengébb alakot kifejezetten TILTJUK.
      /const tartalomEllentmond = idegenAzonositok\.length > 0;/.test(exportQ)
      && !/const tartalomEllentmond = !tartalomEgyezik && talaltAzonositok\.size > 0;/.test(exportQ)
      && /if \(tartalomEllentmond\) \{/.test(exportQ)
      && /TARTALMA MÁS MUNKAMENETÉ/.test(exportQ)
      && !/if \(!nevEgyezik\) \{\n    const elso/.test(exportQ),
      { harom_allapot: 'csak a kért · idegen is (elakadás) · nem hordoz' });

    // (d) A MINTAADATHOZ KÖTÖTT TÁBLA-ÚTMUTATÓK KAPUJA — MINDKÉT IRÁNYBAN.
    const alapQ = { signed_in: true, book_id: 'b_firm', member: true, role: 'admin', personal: false, demo: true };
    // A KAPUZOTT KÉSZLET A REGISZTERBŐL JÖN, NEM BEÍRT NÉVSORBÓL (R166, hetedik kör · `KUKA-045`).
    // Az első alakom három nevet írt le — a hetedik kör NÉGY TOVÁBBIT talált, és a beírt névsor
    // ezeket nem fedte. Mostantól a lista MAGA a deklaráció: egy jövőbeli kapuzott útmutató is mérve van.
    const TABLA = Object.values(TOURS).filter((t) => t.requires_demo_fixture === true).map((t) => t.id);
    const mintaval = allowedToursFor({ ...alapQ, demo_fixture: true, dev_mailbox: true, stock_access: true });
    const minta_nelkul = allowedToursFor({ ...alapQ, demo_fixture: false, dev_mailbox: true, stock_access: true });
    step('(aq6) R166/P2: kiosztott bemutató-minta NÉLKÜL a MINTÁHOZ KÖTÖTT útmutatók közül EGY SEM kínálódik fel (a készlet a regiszterből) (RÉGEN: minden céges tagnak felkínálódott, a HARMADIK vállalkozásban viszont a lap az ÜRES ÁLLAPOTOT rajzolja, és a második lépés nevezetten megszakadt)',
      TABLA.every((t) => !minta_nelkul.includes(t)) && TABLA.every((t) => mintaval.includes(t)),
      { minta_nelkul: TABLA.filter((t) => minta_nelkul.includes(t)).join(',') || 'egyik sem',
        mintaval: TABLA.filter((t) => mintaval.includes(t)).length });

    const maradekQ = (lista) => lista.filter((t) => !TABLA.includes(t)).sort().join(',');
    step('(aq7) R166/P2 ELLENPÁR: a minta-kapu CSAK a mintához kötött útmutatókat zárja — a többi felkínált készlet betűre változatlan',
      maradekQ(minta_nelkul) === maradekQ(mintaval) && maradekQ(mintaval).length > 0,
      { tobbi_darab: maradekQ(mintaval).split(',').length });

    /**
     * ÉS ÁLTALÁNOS ŐR AZ OSZTÁLYRA (`KUKA-413` · KUKA-003), nem negyedik egyedi pin.
     *
     * A MINTAADATTÓL FÜGGŐ HORGONYOK a tábla-lap azon részében születnek, ami az ÜRES ÁLLAPOT
     * korai visszatérése UTÁN áll — ha nincs kiosztott minta, a lap `demo-empty`-vel tér vissza, és
     * ezek a horgonyok SOHA nem jönnek létre. A készletet ezért a LAP FORRÁSÁBÓL vezetjük le
     * (KUKA-045), nem beírt névsorból: egy JÖVŐBELI tábla-horgony is automatikusan fedve van.
     */
    const lapQ = readFileSync(join(ROOT, 'v3app/public/app.js'), 'utf8');
    /**
     * A LETAPOGATÓ MINDEN LAP-FÜGGVÉNYT OLVAS, ÉS A HÍVOTT SEGÉDET IS (R166, HETEDIK KÖR · `KUKA-414`).
     *
     * AZ ELSŐ ALAKOM CSAK a `tablePage()`-et nézte — a `stockCardPage()` és a `movementsPage()`
     * ugyanúgy korán tér vissza az ÜRES ÁLLAPOTTAL, és azokat kihagyta (`KUKA-239`). A függvény-lista
     * ezért a FORRÁSBÓL jön: minden `function` blokk, amiben `noDemoBox()` szerepel. ÉS a
     * minta-függő szakaszból HÍVOTT segéd horgonyai is ide tartoznak (a `serverSamples(page)` a
     * korai visszatérés UTÁN áll) — különben a `sample-*` horgonyok láthatatlanok maradnak.
     *
     * AMIT EZ A LETAPOGATÓ NEM TUD, ÉS EZT KIMONDJUK: a DINAMIKUS horgonyt
     * (`data-testid="sample-${'$'}{kulcs}"`) betű szerint nem látja. Azt a VISELKEDÉS mérése fogja meg
     * (`tests/e2e/v3app-r166-minta-kapu.spec.mjs` — a kiosztott minta NÉLKÜLI vállalkozásban MINDAZ,
     * amit a kiszolgáló felkínál, végigvihető). Ez a pin tehát a KÖNNYŰ felét méri, és a `(ar6)` sor
     * mondja ki, hogy a nehezebb felének van élő tanúja.
     */
    const fnPoz = [...lapQ.matchAll(/\n  function ([A-Za-z0-9_]+)\(/g)].map((m) => ({ poz: m.index, nev: m[1] }));
    const mintaFuggo = new Set();
    const hivottSegedek = new Set();
    fnPoz.forEach((f, i) => {
      const veg = i + 1 < fnPoz.length ? fnPoz[i + 1].poz : lapQ.length;
      const test = lapQ.slice(f.poz, veg);
      const ag = test.indexOf('noDemoBox()');
      if (ag < 0) return;
      const regio = test.slice(ag);
      for (const m of regio.matchAll(/data-testid="([a-z0-9-]+)"/g)) mintaFuggo.add(m[1]);
      // A RÉGIÓBÓL HÍVOTT SAJÁT SEGÉDEK (a lap függvényei) horgonyai is minta-függők.
      for (const m of regio.matchAll(/([A-Za-z0-9_]+)\(/g)) {
        if (fnPoz.some((x) => x.nev === m[1]) && m[1] !== f.nev) hivottSegedek.add(m[1]);
      }
    });
    for (const nev of hivottSegedek) {
      const i = fnPoz.findIndex((x) => x.nev === nev);
      if (i < 0) continue;
      const veg = i + 1 < fnPoz.length ? fnPoz[i + 1].poz : lapQ.length;
      for (const m of lapQ.slice(fnPoz[i].poz, veg).matchAll(/data-testid="([a-z0-9-]+)"/g)) mintaFuggo.add(m[1]);
    }
    const deklaracioNelkul = [];
    for (const t of Object.values(TOURS)) {
      for (const lep of t.steps) {
        if (mintaFuggo.has(lep.target) && t.requires_demo_fixture !== true) deklaracioNelkul.push(`${t.id}/${lep.id}→${lep.target}`);
      }
    }
    step('(aq8) KUKA-413: MINDEN útmutató, aminek a lépése a MINTAADATTÓL függő tábla-horgonyra áll, DEKLARÁLJA a `requires_demo_fixture` feltételt — a horgony-készlet a lap forrásából, az üres-állapot ága UTÁNRÓL mérve (nem beírt névsorból)',
      deklaracioNelkul.length === 0 && mintaFuggo.size >= 2,
      { minta_fuggo_horgony: [...mintaFuggo].join(','), deklaracio_nelkul: deklaracioNelkul.join(', ') || 'egy sincs' });
  }

  // ── AM) R166 — A MÉRŐ ÖNELLENŐRZÉSE: EGY AZONOSÍTÓ EGY MÉRÉSRE MUTAT (KUKA-399) ─────────────
  //
  // MIÉRT KELL: ebben a körben HÁROMSZOR adtam ütköző csoport-előtagot (`ac` · `ae` · `ag` — mind
  // a három ÉLT már az F164-es pinekben), és csak a visszacsúszás-próba kimenete buktatta le a
  // harmadikat. A hivatkozás ilyenkor NÉMÁN kétértelmű: a jelentés és a KUKA-jegy „ag1"-re mutat,
  // a battéria viszont KÉT KÜLÖN mérésben futtat `ag1`-et. Egy bizonyíték, amire nem lehet
  // egyértelműen MUTATNI, nem bizonyíték (KUKA-121).
  //
  // ÉS A MÉRCE PONTOS, NEM CSAK SZIGORÚ (KUKA-216). Az azonosító ISMÉTLŐDÉSE önmagában NEM hiba:
  // a `(b1)` háromszor fut, egy `for`-hurokban, UGYANABBAN a mérésben, három bemenettel — a név
  // megnevezi, melyikről van szó. A hiba a KÉT KÜLÖN MÉRÉS (`part`) közti ütközés: ott a puszta
  // azonosító nem dönti el, melyikre mutat a jelentés. Ezt mérjük, és csak ezt.
  //
  // A SZEMRE NÉZÉS NEM MŰKÖDÖTT — ezért MÉR. A battéria a SAJÁT gyűjtött eredményeiből dolgozik,
  // nem a forrás szövegéből (KUKA-207 · KUKA-239: a hatókör nélküli minta a szomszéd sort igazolja).
  {
    part('AM) R166 — a MÉRŐ önellenőrzése: egy azonosító EGY mérésre mutat (KUKA-399)');
    const ALAK = /^\(([a-z]{1,3}\d+[a-z]?)\)/;
    const otthon = new Map();
    for (const r of results) {
      const m = ALAK.exec(r.name);
      if (!m) continue;
      if (!otthon.has(m[1])) otthon.set(m[1], new Set());
      otthon.get(m[1]).add(r.section);
    }
    const ketlaki = [...otthon.entries()].filter(([, sz]) => sz.size > 1)
      .map(([id, sz]) => `${id}: ${[...sz].map((x) => String(x).slice(0, 18)).join(' ⇄ ')}`);

    step('(am1) KUKA-399: egyetlen pin-azonosító sem szerepel KÉT KÜLÖN mérésben — a jelentés hivatkozása egyértelmű (RÉGEN: `ac1` · `ae1` · `ag1` kétlaki volt, mérés nélkül)',
      ketlaki.length === 0,
      { azonosito: otthon.size, ketlaki: ketlaki.join(' | ') || 'egy sincs' });

    // ELLENPÁR: a mérő TUD kétlakiságot találni — különben a zöldje a néma nullát is jelenthetné.
    const beultetett = new Map([['zz1', new Set(['A) elso meres', 'B) masodik meres'])],
      ['zz2', new Set(['A) elso meres'])]]);
    step('(am2) KUKA-399 ELLENPÁR: a mérő egy BEÜLTETETT kétlaki azonosítót megtalál, az egy-otthonút viszont NEM jelzi — a zöldje tehát nem a néma nulla',
      [...beultetett.entries()].filter(([, sz]) => sz.size > 1).map(([id]) => id).join(',') === 'zz1'
      && otthon.size > 200,
      { beultetett: 'zz1 kétlaki, zz2 nem', valodi_azonosito: otthon.size });

    // ÉS AZ AZONOSÍTÓ ALAKJA IS KÖTÖTT: ami nem nevezi meg magát, arra nem lehet hivatkozni.
    const alaktalan = results.filter((r) => !ALAK.test(r.name)).map((r) => r.name.slice(0, 40));
    step('(am3) KUKA-399: MINDEN pin a kötött alakban nevezi meg magát (`(xxN)` vagy `(xxNa)` a név elején) — különben a jelentés nem tud rá mutatni',
      alaktalan.length === 0, { alak_nelkul: alaktalan.length ? alaktalan.join(' | ') : 'egy sincs' });

    // ÉS AZ ISMÉTLŐDŐ AZONOSÍTÓ NEVE MEGKÜLÖNBÖZTET (a hurkos pin a bemenetét írja ki).
    const nevek = results.map((r) => r.name);
    const nevSzam = new Map();
    for (const n of nevek) nevSzam.set(n, (nevSzam.get(n) || 0) + 1);
    const egyezoNev = [...nevSzam.entries()].filter(([, n]) => n > 1).map(([n]) => n.slice(0, 50));
    step('(am4) KUKA-399: két pin SZÓ SZERINT azonos nevet sem visz — az ismétlődő azonosító (pl. a hurkos `(b1)`) a BEMENETÉT írja a nevébe',
      egyezoNev.length === 0, { pin: nevek.length, egyezo_nev: egyezoNev.join(' | ') || 'egy sincs' });
  }

  // ── AR) R166 HETEDIK KÖR — HÁROM KÜLSŐ P2 A SAJÁT JAVÍTÁSAIM FELETT ─────────────────────────────
  {
    part('AR) R166 hetedik kör — a befogadott séma rejtése · a vegyes átirat · a minta-kapu teljes készlete');

    /**
     * (1) A REJTÉS SÉMA-KÉSZLETE A BEFOGADOTT SÉMÁKBÓL JÖN (`KUKA-414` első fele).
     *
     * A LELET: a `socket://u:JELSZÓ@gazdagép/út?db=x` cím a `pgUrlShape` zárt listáján ÁT MEGY, a
     * `cliEnvFor` VALÓDI `PGPASSWORD`-öt állít belőle a gyermeknek — a rejtés sémái viszont BEÍRT
     * névsorból jöttek, és a `socket:` nem volt köztük. MÉRVE: a cím betűre változatlanul ment át.
     */
    const socketCim = 'socket://felhasznalo:TITKOS_JELSZO@localhost/var/run/postgresql?db=forras';
    const socketSor = redactConnStrings(`psql ${socketCim} -f ki.dump`);
    step('(ar1) KUKA-414: a BEFOGADOTT `socket:` séma kapcsolati címe is ELREJTVE (RÉGEN: betűre változatlanul ment át, a jelszóval együtt)',
      !socketSor.includes('TITKOS_JELSZO') && socketSor.includes('«kapcsolati cím elrejtve»') && socketSor.includes('-f ki.dump'),
      { kimenet: socketSor.replace('TITKOS_JELSZO', '<<JELSZO>>') });

    /**
     * ELLENPÁR: a készlet a ZÁRT LISTÁBÓL jön, nem beírt névsorból — tehát MINDEN befogadott séma
     * rejtve van, és a rejtés nem szűkebb a befogadásnál (`KUKA-045`).
     */
    const befogadott = Object.keys(PG_URL_SHAPES);
    const nemRejtett = befogadott.filter((sema) => redactConnStrings(`psql ${sema}//u:TITOK@h/db`).includes('TITOK'));
    step('(ar2) KUKA-414 ELLENPÁR: a `PG_URL_SHAPES` MINDEN befogadott sémája rejtve van — a rejtés soha nem szűkebb a befogadásnál',
      nemRejtett.length === 0 && befogadott.length >= 3,
      { befogadott: befogadott.join(' · '), nem_rejtett: nemRejtett.join(' · ') || 'egy sincs' });

    step('(ar3) KUKA-414: és a titokmentes sor BETŰRE változatlan (a szigorítás nem vitt el hasznos szöveget)',
      redactConnStrings('psql -h /var/run/postgresql -d vs_proba -c "SELECT 1"') === 'psql -h /var/run/postgresql -d vs_proba -c "SELECT 1"');

    /**
     * (2) A VEGYES ÁTIRAT IS ELLENTMONDÁS (`KUKA-415`).
     *
     * A LELET: a mércém azt kérdezte, hogy a kért azonosító MEGVAN-E — nem azt, hogy MÁS is. Egy
     * összefűzött átirat (a kért ÉS egy idegen azonosító) így átment, az exportáló pedig `sessionId`
     * szerint NEM szűr: az idegen sorok a kért munkamenet nevére kerültek volna.
     */
    const expSrc = readFileSync(join(ROOT, 'tools/v3_fogyasztas_export.mjs'), 'utf8');
    step('(ar4) KUKA-415: az átirat-mérce azt kérdezi, hogy van-e benne IDEGEN azonosító (nem azt, hogy a kért MEGVAN-E)',
      /idegenAzonositok\s*=\s*\[\.\.\.talaltAzonositok\]\.filter\(\(x\)\s*=>\s*x\s*!==\s*session\)/.test(expSrc)
      && /tartalomEllentmond\s*=\s*idegenAzonositok\.length\s*>\s*0/.test(expSrc)
      && !/tartalomEllentmond\s*=\s*!tartalomEgyezik\s*&&/.test(expSrc),
      { regi_alak_bent_maradt: /tartalomEllentmond\s*=\s*!tartalomEgyezik\s*&&/.test(expSrc) });

    step('(ar5) KUKA-415: és az elakadás KIMONDJA, melyik azonosító az idegen — a „megvan a kért" nem ment föl',
      /ebből IDEGEN/.test(expSrc) && /IDEGEN SOROKAT IS HORDOZ/.test(expSrc) && /`sessionId` szerint NEM szűri/.test(expSrc));

    /**
     * (ar6–ar7) A MÉRCE HATÓKÖRE AZ EXPORTÁLÓ HATÓKÖRE (R176, külső review P2 · `KUKA-418`).
     *
     * A LELET: a `KUKA-415`-es mércém csak az ELSŐ 50 nem üres sort nézte, az exportáló viszont
     * MINDEN sort feldolgoz és `sessionId` szerint nem szűr. Egy összefűzött átirat tehát némán
     * átment, ha az idegen azonosító KÉSŐBB állt. Ezt NEM forrás-mintával mérjük, hanem
     * VISELKEDÉSSEL: egy 60 soros átirat, benne EGY idegen sorral a végén (`KUKA-207`).
     */
    {
      const tmpA = mkdtempSync(join(tmpdir(), 'vs3-ar6-'));
      const sessA = 'aaaaaaaa-1111-2222-3333-444444444444';
      const idegen = 'bbbbbbbb-9999-8888-7777-666666666666';
      const sor = (sid) => `${JSON.stringify({ type: 'assistant', sessionId: sid, timestamp: '2026-01-01T00:30:00.000Z', message: { usage: { input_tokens: 1, output_tokens: 1 } } })}\n`;
      const tisztaUt = join(tmpA, `${sessA}.jsonl`);
      writeFileSync(tisztaUt, sor(sessA).repeat(60));
      const vegyesUt = join(tmpA, 'vegyes', `${sessA}.jsonl`);
      mkdirSync(join(tmpA, 'vegyes'), { recursive: true });
      writeFileSync(vegyesUt, sor(sessA).repeat(60) + sor(idegen));
      const fut = (ut) => {
        try {
          execFileSync(process.execPath, [join(ROOT, 'tools/v3_fogyasztas_export.mjs'),
            '--session', sessA, '--from', '2026-01-01T00:00:00Z', '--to', '2026-01-02T00:00:00Z',
            '--transcript', ut, '--out', join(tmpA, `ki-${Math.random().toString(36).slice(2)}`)],
          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
          return { kod: 0, hiba: '' };
        } catch (e) { return { kod: e.status, hiba: String(e.stderr || '') }; }
      };
      const tiszta = fut(tisztaUt);
      const vegyes = fut(vegyesUt);
      step('(ar11) R176/P2: az 50. sor UTÁN érkező IDEGEN azonosító is NEVEZETTEN elakad (RÉGEN: a mérce 50 sornál megállt, és némán átengedte)',
        vegyes.kod === 2 && vegyes.hiba.includes(idegen) && /IDEGEN/.test(vegyes.hiba),
        { kilepes: vegyes.kod, megnevezi_az_idegent: vegyes.hiba.includes(idegen) });
      /**
       * AZ ELLENPÁR HATÓKÖRE KIMONDVA (`KUKA-216`): ez az állítás az AZONOSSÁG-KAPUT méri, nem a
       * teljes exportot. A szintetikus átirat szándékosan minimális, tehát a kapu UTÁN a feldolgozás
       * más okból elakadhat — amit itt mérünk: a tiszta, 60 soros átirat NEM az azonosság miatt
       * akad el (nem `2`-es kilépés, és nincs IDEGEN a diagnosztikában).
       */
      step('(ar12) R176/P2 ELLENPÁR: a TISZTA, 60 soros átirat az AZONOSSÁG-kapun ÁTMEGY — a szigorítás nem vitt el jó esetet',
        tiszta.kod !== 2 && !/IDEGEN/.test(tiszta.hiba),
        { kilepes: tiszta.kod, azonossag_miatt_akadt: tiszta.kod === 2 });
      rmSync(tmpA, { recursive: true, force: true });
    }

    /**
     * (3) A MINTA-KAPU TELJES KÉSZLETE, ÉS A NEHEZEBB FELÉNEK ÉLŐ TANÚJA (`KUKA-414` második fele).
     *
     * A LELET: négy TOVÁBBI útmutató (`documents` · `partners` · `stockcard` · `movements`) állt
     * minta-függő horgonyon deklaráció nélkül. Kettőt a kiterjesztett letapogató (`aq8`) megfog, a
     * `sample-*` kettőt NEM — azok DINAMIKUSAN születnek. Ezért a nehezebb fele VISELKEDÉS-mérés.
     */
    const NEGY = ['tour.documents', 'tour.partners', 'tour.stockcard', 'tour.movements'];
    const deklaralatlan = NEGY.filter((id) => !TOURS[id] || TOURS[id].requires_demo_fixture !== true);
    step('(ar6) KUKA-414: a hetedik kör NÉGY útmutatója is DEKLARÁLJA a `requires_demo_fixture` feltételt',
      deklaralatlan.length === 0, { deklaralatlan: deklaralatlan.join(' · ') || 'egy sincs' });

    const ures = readFileSync(join(ROOT, 'v3app/public/app.js'), 'utf8');
    const uresAgasFn = [...ures.matchAll(/\n  function ([A-Za-z0-9_]+)\(/g)]
      .map((m, i, arr) => ({ nev: m[1], poz: m.index, veg: i + 1 < arr.length ? arr[i + 1].index : ures.length }))
      .filter((f) => ures.slice(f.poz, f.veg).includes('noDemoBox()')).map((f) => f.nev);
    step('(ar7) KUKA-414: az `aq8` letapogatója MINDEN üres-állapotos lap-függvényt olvas (RÉGEN: csak a `tablePage`-et — KUKA-239)',
      uresAgasFn.length >= 3 && /fnPoz\.forEach/.test(readFileSync(join(ROOT, 'v3app/findings_r154.mjs'), 'utf8')),
      { ures_agas_fuggvenyek: uresAgasFn.join(' · ') });

    const viselkedesProba = join(ROOT, 'tests/e2e/v3app-r166-minta-kapu.spec.mjs');
    const vanProba = existsSync(viselkedesProba);
    const probaSzoveg = vanProba ? readFileSync(viselkedesProba, 'utf8') : '';
    step('(ar8) KUKA-414: a DINAMIKUS horgonyra VISELKEDÉS-mérés áll (a minta nélküli vállalkozásban MINDAZ, amit a kiszolgáló felkínál, végigvihető) — és a próba a KÖZÖS bejárót futtatja, ELLENPÁRRAL a minta LÉTÉRE',
      vanProba && /requires_demo_fixture/.test(probaSzoveg) && /from '\.\/tourWalk\.mjs'/.test(probaSzoveg)
      && /switchUI\(anna\.page, elsoBook\)/.test(probaSzoveg),
      { proba: vanProba ? 'tests/e2e/v3app-r166-minta-kapu.spec.mjs' : 'NINCS' });

    /**
     * ÉS A VISELKEDÉS-MÉRÉS HÁROM KIMENETŰ, ÉS NEM TUD ÜRESEN ZÖLD LENNI (SAJÁT LELET, a kapu mérte
     * ki · `KUKA-215` · `KUKA-216`).
     *
     * AZ ELSŐ ALAKOM BUKÁSNAK ÍRTA azt is, amikor az útmutató a FELHASZNÁLÓ műveletére vár
     * (`task`) — a bejáró nem tud meghívót létrehozni vagy jogot kiadni, tehát a mérés a SAJÁT
     * korlátját mondta volna a rendszer hibájának. Mostantól: végigvihető · TASK-IG (mért tény) ·
     * MEGSZAKADT (bukás). ÉS hogy a task-megállás ne tudja kiüresíteni az állítást, a lap kimondja,
     * hogy VAN teljesen bejárt útmutató, és hogy a mintához kötöttek közül EGY SEM hordoz task-ot.
     */
    step('(ar9) KUKA-414: a viselkedés-mérés HÁROM kimenetű (OK · TASK-IG · MEGSZAKADT), és csak a harmadik bukás — a bejáró korlátja nem a rendszer hibája',
      /taskStop/.test(probaSzoveg) && /TASK-IG/.test(probaSzoveg)
      && /tests\/e2e\/tourWalk\.mjs/.test('tests/e2e/tourWalk.mjs')
      && /steps\[i\]\.task !== null/.test(readFileSync(join(ROOT, 'tests/e2e/tourWalk.mjs'), 'utf8')));

    step('(ar10) KUKA-215: és az állítás NEM tud üresen zöld lenni — a lap kimondja, hogy VAN teljesen bejárt útmutató, és hogy a mintához kötöttek közül egy sem vár a felhasználóra',
      /toBeGreaterThan\(4\)/.test(probaSzoveg) && /mintasTask/.test(probaSzoveg)
      && Object.values(TOURS).filter((t) => t.requires_demo_fixture === true)
        .every((t) => t.steps.every((l) => l.task === null || l.task === undefined)),
      { mintahoz_kotott: Object.values(TOURS).filter((t) => t.requires_demo_fixture === true).length });
  }

  const fail = results.filter((r) => !r.pass);
  console.log(`\nR154 battéria: ${results.length - fail.length}/${results.length} PASS${fail.length ? ` — ${fail.length} FAIL` : ''}`);
  console.log('A MÉRÉS HATÓKÖRE: a HTTP-határ és a két feloldó. Üzleti folyamatról, élő AI-ról és felhős');
  console.log('üzemről ebből NEM következik állítás (KUKA-216).');
  if (fail.length) { console.log('\nFAIL-ek:'); fail.forEach((f) => console.log(` - [${f.section}] ${f.name}`)); }
  await new Promise((r) => app.server.close(r));
  process.exit(fail.length ? 1 : 0);
} catch (e) {
  console.error('\nELAKADT MÉRÉS (a battéria bukott el; a rendszerről ez NEM mond semmit):', e && e.message);
  try { if (app) await new Promise((r) => app.server.close(r)); } catch { /* már zárva */ }
  process.exit(2);
}
