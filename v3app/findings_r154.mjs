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
import { rmSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { startServer, makeRateLimiter, makeSessionStore, sessionLimits, SESSION_LIMITS, rateLimitConfig } from './server.mjs';
import { dictFor } from './public/i18n/dict.mjs';
import { resolveLanguage, parseAcceptLanguage, pickFromAcceptLanguage } from './public/i18n/languages.mjs';
import { validateAgainstSchema } from '../v3ref/inputSchema.mjs';
import { purgeExpiredIntents, resumeIntent } from '../v3ref/invite.mjs';
import { validateRequest } from './httpSchema.mjs';
import { request as httpReq } from 'node:http';
import { transcriptsOf } from '../tools/v3_fogyasztas_meres.mjs';
import { restoreTargetProblem, sameDatabase, effectiveDatabase, withDatabase } from '../tools/lib/vs_pg_target.mjs';
import { execFileSync } from 'node:child_process';

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
    const a = sameDatabase('postgres://source_user:pw@host', 'source_user');
    step('(q1) út nélküli cím: a felhasználó neve az adatbázis — tehát AZONOS a céllal (RÉGEN: „eltér” → a FORRÁST törölte volna)',
      a.same === true, a);
    const b = sameDatabase('postgres://source_user:pw@host', 'vs_visszatoltes_proba');
    step('(q2) ELLENPÁR: más cél mellett a lánc továbbra is indulhat',
      b.same === false, b);
    const c = sameDatabase('postgres://host/', 'barmi');
    step('(q3) sem adatbázis, sem felhasználó: NEM megállapítható → ÓVATOS megállás',
      c.same === true && /NEM megállapítható/i.test(c.basis), c);
    const d = sameDatabase('postgres://source%5Fuser:pw@host', 'source_user');
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
    const a = sameDatabase('postgres://decoy@host/?user=source', 'source');
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
    step('(r5) és a tényleges név feloldása KIMONDJA, MIN alapul',
      /dbname/.test(effectiveDatabase('postgres://h/?dbname=x').basis) && effectiveDatabase('postgres://h/?dbname=x').name === 'x',
      effectiveDatabase('postgres://h/?dbname=x'));

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
      step('(r8) MÁS munkamenet átirata a `--transcript`-ben NEVEZETTEN elakad (RÉGEN: lefutott, és a KÉRT azonosítót írta a fejlécbe)',
        roszz.kod === 2 && /NEM A KÉRT MUNKAMENETÉ/.test(roszz.hiba), { kilepes: roszz.kod });
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
      const KOT = ['POST /api/login', 'POST /api/logout', 'POST /api/invites/pending', 'POST /api/invites/redeem', 'POST /api/session/workspace'];
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
      const turak = async (c) => {
        const r = await c.get('/api/assistant/status?lang=hu');
        return (r.body.tours || []).map((t) => t.id);
      };

      // A FIÓKKEZELŐ: saját cég, és egy FÜGGŐ meghívó, amit vissza lehetne vonni.
      const anna = await fiok('u-anna');
      await anna.post('/api/workspaces', { name: 'U158 Kft', plan: 'starter', business: { jurisdiction: 'HU', tax_id: '12345678-1-42' } });
      const megh = await anna.post('/api/invites', { email: 'u-cili@pelda.hu', role: 'user', scope: 'keszlet', lang: 'hu' });
      const jelolo = String(megh.body.token || '').slice(0, 8);

      // (u1) DEMÓ BE: a két szereplős végigvezetés MEGJELENIK.
      process.env.VS_DEMO = '1';
      const beTurak = await turak(anna);
      step('(u1) DEMÓ BE: a KÉT ÉLŐ MUNKAMENETET igénylő végigvezetések felkínálódnak',
        beTurak.includes('tour.inviteRevoke') && beTurak.includes('tour.reentry'),
        { darab: beTurak.length, ketszereplos: beTurak.filter((x) => x === 'tour.inviteRevoke' || x === 'tour.reentry') });

      // (u2) DEMÓ KI: ugyanazon a fiókon NEVEZETTEN eltűnnek — az ÉLES védelem érintetlen.
      delete process.env.VS_DEMO;
      const kiTurak = await turak(anna);
      step('(u2) ELLENPÁR — DEMÓ KI: ugyanaz a fiók, és a két bemutató-kötött végigvezetés NINCS felkínálva (az éles kapu áll)',
        !kiTurak.includes('tour.inviteRevoke') && !kiTurak.includes('tour.reentry')
          && kiTurak.length === beTurak.length - 2,
        { demoval: beTurak.length, demo_nelkul: kiTurak.length, kulonbseg: beTurak.filter((x) => !kiTurak.includes(x)) });

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
      // ÉS A MEGHÍVÓ TÉNYLEGESEN ÉL: a fenti elutasítások nem azért jöttek, mert nincs mit visszavonni.
      const sorok = u.store.all('SELECT token, redeemed_at FROM invite');
      const vonasok = u.store.all('SELECT token FROM invite_revocation');
      step('(u5) a mérés ALAPSOKASÁGA igaz: a meghívó ÉL (nincs beváltás, nincs visszavonás), tehát az elutasítások a JOGRÓL szólnak, nem a hiányról',
        sorok.length === 1 && !sorok[0].redeemed_at && vonasok.length === 0,
        { meghivo: sorok.length, bevaltott: sorok.filter((x) => x.redeemed_at).length, visszavonas: vonasok.length });

      // (u6) ÉS A JEL HATÓKÖRE A FORRÁSBÓL MÉRVE: a `demo` EGYETLEN döntést érint. Ha valaki egy
      // jogosultsági ágba beköti, ez a sor pirosra vált — a kapu nem a szándékon áll, hanem a kódon.
      const srvU = readFileSync(join(ROOT, 'v3app/server.mjs'), 'utf8');
      const polU = readFileSync(join(ROOT, 'v3app/assistant/policy.mjs'), 'utf8');
      const olvasasok = (srvU.match(/process\.env\.VS_DEMO/g) || []).length;
      const ctxDemo = (polU.match(/ctx\.demo/g) || []).length;
      // A FÜGGVÉNY-HATÓKÖR KIMONDVA (KUKA-239): a `ctx.demo` a végigvezetés-felkínálóban álljon.
      const kezd = polU.indexOf('export function allowedToursFor');
      const veg = polU.indexOf('\nexport ', kezd + 10);
      const torzs = kezd >= 0 ? polU.slice(kezd, veg > kezd ? veg : polU.length) : '';
      step('(u6) a demó-jel HATÓKÖRE: a kiszolgáló EGY helyen olvassa, és a döntés CSAK a végigvezetés-felkínálóban áll',
        olvasasok === 1 && ctxDemo === 1 && /ctx\.demo !== true/.test(torzs),
        { env_olvasas: olvasasok, ctx_demo: ctxDemo, a_felkinaloban: /ctx\.demo !== true/.test(torzs) });
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
    step('(w1) F158-01: az ISMÉTELT `dbname` kulcsból az UTOLSÓ, nem üres érték dönt (libpq) — a `decoy&source` cím forrása `source`',
      effectiveDatabase('postgres://u@host/decoy?dbname=decoy&dbname=source').name === 'source'
        && effectiveDatabase('postgres://u@host/decoy?dbname=source&dbname=').name === 'source'
        && sameDatabase('postgres://u@host/decoy?dbname=decoy&dbname=source', 'source').same === true,
      { ismetelt: effectiveDatabase('postgres://u@host/decoy?dbname=decoy&dbname=source').name,
        utolso_ures: effectiveDatabase('postgres://u@host/decoy?dbname=source&dbname=').name });
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
