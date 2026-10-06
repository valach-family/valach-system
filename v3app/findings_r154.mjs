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
import { rmSync, readFileSync } from 'node:fs';
import { startServer, makeRateLimiter, makeSessionStore, sessionLimits, SESSION_LIMITS } from './server.mjs';
import { dictFor } from './public/i18n/dict.mjs';
import { resolveLanguage, parseAcceptLanguage, pickFromAcceptLanguage } from './public/i18n/languages.mjs';
import { validateAgainstSchema } from '../v3ref/inputSchema.mjs';

/** A `string` TÍPUS közvetlenül, a mag feloldóján — amit a próba nem tud meghívni, azt hisszük (KUKA-207). */
const TYPES_STRING_OK = (v) => validateAgainstSchema({
  schema: { version: '1', fields: { t: { type: 'string', required: true, max_length: 100 } } },
  input: { t: v },
}).ok === true;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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
    /newSession\(r\.subject_id\)/.test(srvSrc) && !/fresh\.subject_id = r\.subject_id/.test(srvSrc),
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
      loginBlock.indexOf('sessions.delete(session.id)') < loginBlock.indexOf('newSession(r.subject_id)')
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
