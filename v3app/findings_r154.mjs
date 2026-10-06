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
import { startServer, makeRateLimiter, makeSessionStore, sessionLimits, SESSION_LIMITS } from './server.mjs';
import { dictFor } from './public/i18n/dict.mjs';
import { resolveLanguage, parseAcceptLanguage, pickFromAcceptLanguage } from './public/i18n/languages.mjs';
import { validateAgainstSchema } from '../v3ref/inputSchema.mjs';
import { validateRequest } from './httpSchema.mjs';
import { request as httpReq } from 'node:http';
import { transcriptsOf } from '../tools/v3_fogyasztas_meres.mjs';
import { restoreTargetProblem, sameDatabase } from '../tools/lib/vs_pg_target.mjs';
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

    // (g6) F154-11 második fele — AZ ÁRVA SOR TAKARÍTÁSA, élő HTTP-n, HITELESÍTÉS NÉLKÜL.
    const sorok = () => app.store.get('SELECT COUNT(*) AS n FROM pending_intent').n;
    const elotte = sorok();
    for (let i = 0; i < 120; i++) {
      await fetch(base + '/api/invites/pending', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'arasztas-' + i }) });
    }
    const utana = sorok();
    step('(g6) 120 HITELESÍTÉS NÉLKÜLI kérés után a munkamenethez kötött tábla a tárral együtt KORLÁTOS',
      utana <= SESSION_CAP + elotte + 1, { sorok: `${elotte}→${utana}`, munkamenet_plafon: SESSION_CAP, tar: app.sessions.size });

    // (g7) ELLENPÁR: az ÉLŐ munkamenet sorát NEM takarítjuk el — a takarítás csak az árvát viszi.
    const elo = new Client(base);
    await elo.get('/api/me');
    await elo.post('/api/invites/pending', { token: 'elo-folytatas-154' });
    const sajat = app.store.get("SELECT session_id FROM pending_intent WHERE invite_token = 'elo-folytatas-154'");
    step('(g7) ELLENPÁR: az ÉLŐ munkamenet folytatása MEGMARAD — a takarítás csak az árvát viszi',
      Boolean(sajat) && app.sessions.has(String(sajat.session_id)) === true,
      { sor_megvan: Boolean(sajat), munkamenet_el: sajat ? app.sessions.has(String(sajat.session_id)) : null });
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
    const nagy = makeSessionStore({ idleMs: 10 ** 9, maxSessions: 20000, warn: () => {} });
    for (let i = 0; i < 20000; i++) nagy.set('u' + i, { id: 'u' + i, subject_id: 'S' + i }, 1_000_000 + i);
    const t0 = Date.now();
    for (let i = 0; i < 100; i++) nagy.set('anon' + i, { id: 'anon' + i, subject_id: null }, 2_000_000 + i);
    const ms = Date.now() - t0;
    step('(i4) 100 süti nélküli beszúrás 20 000 belépett sor mellett 200 ms alatt (régen MÉRVE: 754 ms)',
      ms < 200, { ms, regi_mert_ms: 754 });
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
      st3.pin(`p${i}`, jel);
      st3.set(`p${i}`, { id: `p${i}`, subject_id: `u${i}` }, t0);
    }
    const kezdet = Date.now();
    for (const jel of jelek3) st3.unpinAll(jel, t0 + 1);
    const ms = Date.now() - kezdet;
    step(`(l4) ${C} átfedő kérés pinjeinek elengedése ÁLLANDÓ költségű lépésekben megy (a KVADRATIKUS alak kizárva)`,
      ms < 300 && st3.stats().pinned === 0, { ms, C, pinned_utana: st3.stats().pinned, regi_alak: 'kérésenként a TELJES pin-tábla → O(C²)' });

    // (l5) F154-28 (P2): a `touch` megmondja, ha a sor lejárt — és a kérés-ciklus EGY időt használ.
    const st4 = makeSessionStore({ idleMs: 1_000, maxSessions: 10, warn: () => {} });
    st4.set('s', { id: 's', subject_id: 'u' }, t0);
    const erintes = st4.touch('s', t0 + 5_000);
    step('(l5) a `touch` MEGMONDJA, ha a sor lejárt (régen: csendben eldobta, a hívó meg belépettnek hitte)',
      erintes === false && st4.has('s', t0 + 5_000) === false, { touch: erintes });
    const srcL = readFileSync(join(ROOT, 'v3app/server.mjs'), 'utf8');
    const egyIdo = /const requestNow = Date\.now\(\);[\s\S]{0,1200}?sessions\.get\(cookies\.get\(SESSION_COOKIE\) \|\| '', requestNow\)[\s\S]{0,600}?!sessions\.touch\(session\.id, requestNow\)/.test(srcL);
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
        execFileSync(process.execPath, [join(ROOT, 'tools/v3_fogyasztas_export.mjs'),
          '--session', sess2, '--projects', tmp2, '--from', '2026-01-01T00:00:00Z', '--to', '2026-01-02T00:00:00Z'],
          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (e) { kod = e.status; hiba = String(e.stderr || ''); }
      step('(n6) két projekt-könyvtárban ugyanaz az átirat → NEVEZETT elakadás (RÉGEN: csendben az elsőt exportálta)',
        kod === 2 && /KÉTÉRTELMŰ ÁTIRAT/.test(hiba) && /projekt-egy/.test(hiba) && /projekt-ketto/.test(hiba),
        { kilepes: kod, megnevezte_mindkettot: /projekt-egy/.test(hiba) && /projekt-ketto/.test(hiba) });
    } finally { rmSync(tmp2, { recursive: true, force: true }); }
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
