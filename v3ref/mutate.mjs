#!/usr/bin/env node
// V3 MAGREFERENCIA — MUTÁCIÓS PRÓBA (G6).
//
// ═══ EZ AZ ESZKÖZ EGYSZER MÁR HAZUDOTT — R42 Q18 ════════════════════════════════════════════════
//
// A külső fél a `run.mjs` helyére egy azonnal 86-os kóddal kilépő programot tett, ami NEM ad JSON-t
// és EGYETLEN próbát sem futtat. A régi alak erre azt írta ki, hogy **„10 mutáció · 10 elkapva"**,
// és **0-val zárt**. Reprodukáltam: pontosan így történt.
//
// Az ok EGY sor volt: `catch { failed = ['(a futás összeomlott)']; }` — a JSON-hibát BIZONYÍTÉKNAK
// számolta. Ettől minden mutáció, ami csak összeomlasztotta a programot, „elkapottnak" látszott;
// és ha maga a futtató volt rossz, MIND a tíz. Mellette a `wrongCatcher` értéke ki volt számolva,
// de a kilépési feltétel nem használta: a ROSSZ próba általi elkapás is teljes sikernek számított.
//
// Ez pontosan az a hiba-osztály, amiről a saját regiszterünk szól: a nem mért dolog nem
// „ismeretlen állapotú", hanem ZÖLDNEK LÁTSZIK (KUKA-051 · KUKA-089). A mérő-eszközön a legrosszabb
// helyen — mert innentől MINDEN rá hivatkozó bizonyíték hamis.
//
// ═══ A JAVÍTOTT SZERZŐDÉS ═══════════════════════════════════════════════════════════════════════
//
// Egy mutáció akkor és csak akkor ELKAPOTT, ha a MEGNEVEZETT próba a MEGNEVEZETT módon bukik el.
// Minden más külön néven jelenik meg, és mind PIROS:
//
//   CAUGHT         a nevesített próba FAIL-t adott (vagy a szerződésben ELŐRE rögzített kivételt)
//   WRONG_CATCHER  bukott valami, de NEM a nevesített próba — a próba-térkép hazudik
//   SURVIVED       minden próba átment — a PRÓBA lyuka, nem a kódé
//   HARNESS_ERROR  a futtató nem adott értelmezhető eredményt (nincs JSON · spawn-hiba · időtúllépés
//                  · hiányzó próba · nem várt összeomlás) — EZ NEM ÉSZLELÉS
//   STALE_ANCHOR   a mutáció horgonya nincs meg a forrásban — a mutáció elavult
//
// ÉS A LÉNYEG: az eszköz MINDEN futáskor bizonyítja, hogy a Q18-at ma is elkapná (`--self-test`
// nélkül is, alapból). Két kapu fut a mutációk ELŐTT:
//   (a) ALAPVONAL — a MUTÁLATLAN másolatnak zöldnek kell lennie. Piros alapvonalon minden utána
//       jövő „elkapás" értelmezhetetlen.
//   (b) Q18-ELLENPRÓBA — egy szándékosan elrontott futtatót HARNESS_ERROR-nak kell minősíteni,
//       NEM elkapásnak. Ha ez a kapu átmegy elkapásként, az eszköz megint hazudik.
//
// A (b) az egyetlen dolog, ami miatt a többi számnak van értéke. Ezért fut mindig, nem kapcsolóra.

import { cpSync, readFileSync, writeFileSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync, spawn } from 'node:child_process';
import { availableParallelism } from 'node:os';

const REF = dirname(fileURLToPath(import.meta.url));
const RUN_TIMEOUT_MS = 60000;

import { MUTATIONS } from './mutations.mjs';


// ═══ A MÁSODIK KÖR: ÖT TOVÁBBI HAZUGSÁG-ALAK (R45 H02–H06) ══════════════════════════════════════
//
// A Q18 javítása után a külső fél ÖT másik utat talált, amin a mérő MÉG MINDIG „10/10 elkapva"-t
// írt ki és 0-val zárt. Mind az öt reprodukált:
//
//   H02  a mutáns indulása UTÁN `process.exit(86)`, JSON nélkül → az M5 `runtime_error` szerződése
//        a TELJES FUTTATÓ hibáját is elkapásnak vette
//   H03  a mutánsok nem futtattak próbát, csak `SKIP` rekordot adtak a hat ismert azonosítóhoz →
//        a `status !== 'PASS'` bármit bukásnak fogadott el
//   H04  csak a BUKOTT rekordok kerültek a kimenetbe → a hiányzó rekordokat semmi nem vette észre
//   H05  valódi JSON, de a futtató 86-tal lépett ki → az értelmezhető JSON mellett a rendellenes
//        folyamat-kilépés elveszett
//   H06  a rekordokat idegen infrastruktúra-kivételt jelző `FAIL`-re cserélve → a mérő nem nézte,
//        hogy a MEGFELELŐ ÁLLÍTÁS bukott-e el
//
// A KÖZÖS TANULSÁG: **előbb érvényes mérés, utána mutációs ítélet.** A mérő eddig a MÉRT FÉLTŐL
// kérdezte meg, mit kellett volna mérnie (KUKA-054 a mérőn). Innentől a várt készlet külső
// szerződés (`manifest.mjs`), a kilépési kód és az eredménycsomag ellentmondása mérőhiba, és
// bizonyíték CSAK a nevezett próba nevezett ÁLLÍTÁSÁNAK bukása.

import { MANIFEST_VERSION, EXPECTED_IDS, PROBE_STATUS, checkResultSet, assertionOf } from './manifest.mjs';

// A `run.mjs` SZERZŐDÉSE: 0 = minden próba PASS · 1 = van nem-PASS. Minden más kód mérőhiba —
// akkor is, ha közben értelmezhető JSON érkezett (H05).
const ALLOWED_EXIT_CODES = Object.freeze([0, 1]);

/**
 * EGY futtatás osztályozása — ELŐBB ÉRVÉNYESSÉG, UTÁNA ÍTÉLET.
 * Ez a függvény dönti el, mi számít BIZONYÍTÉKNAK. A hiba SOHA nem lehet észlelés.
 *
 * @returns {{kind:'ok'|'harness', why?:string, failed?:string[], threw?:object[], records?:object[]}}
 */
export function classifyRun(spawnResult, expected) {
  // (0) A CSOMAGOT A SZÜLŐ ÁLTAL ELVÁRT FORRÁSHOZ ÉS FUTÁSHOZ KELL KÖTNI (R51/J5 · M01).
  //
  // Az R49-ben megköveteltük, hogy a kimenet HOZZON forrás-lenyomatot — de csak a JELENLÉTÉT
  // néztük. A külső fél megmutatta: `source_digest: "wrong"`, futásazonosító nélkül, 24 PASS
  // rekorddal az eredmény `ok` lett. A puszta jelenlét-vizsgálat nem azonosítás (KUKA-038: a
  // létezés nem bizonyíték arra, hogy AZT mérte).
  //
  // Ezért a szülő a VALÓBAN előállított (mutált!) forrás-csomagból számolja az elvárt lenyomatot,
  // és minden gyermeknek EGYEDI futás-jelet oszt ki. A kettő hiánya nem enyhébb eset: ha a hívó
  // nem tudja megmondani, mit várt, akkor nincs mihez mérni — MÉRŐHIBA, nem PASS.
  //
  // KIMONDOTT KORLÁT: ez KONZISZTENCIA- és ELAVULT-EREDMÉNY elleni védelem. Egy ROSSZINDULATÚ
  // futtató, ami a szülőtől kapott jelet visszaírja, ezzel nem lelepleződik — arra kriptográfiai
  // hitelesítés kellene, amit nem ígérünk (a külső fél maga is így fogalmazta meg).
  if (!expected || !expected.digest || !expected.runToken) {
    return { kind: 'harness', why: 'a hívó nem adta meg az ELVÁRT forrás-lenyomatot és futás-jelet — a csomag eredete nem ellenőrizhető' };
  }
  // (1) el sem indult · jel állította le · időtúllépés
  if (spawnResult.error) {
    const to = spawnResult.error.code === 'ETIMEDOUT' ? ' (IDŐTÚLLÉPÉS)' : '';
    return { kind: 'harness', why: `a futtató nem futott le${to}: ${spawnResult.error.message}` };
  }
  if (spawnResult.signal) return { kind: 'harness', why: `a futtatót jel állította le: ${spawnResult.signal}` };

  // (2) RENDELLENES KILÉPÉSI KÓD — H05. Ezt a JSON megléte NEM írja felül: ha a folyamat állapota
  // és az eredménycsomag ellentmond, azt nem szabad elhallgatni.
  if (!ALLOWED_EXIT_CODES.includes(spawnResult.status)) {
    return { kind: 'harness', why: `a futtató rendellenes kilépési kóddal zárt: ${spawnResult.status} (a szerződés szerint csak 0 vagy 1 lehet)` };
  }

  // (3) értelmezhető JSON
  let out;
  try { out = JSON.parse(spawnResult.stdout); } catch {
    return {
      kind: 'harness',
      why: `a futtató nem adott értelmezhető JSON-t (kilépési kód: ${spawnResult.status})`
        + `${(spawnResult.stderr || '').trim() ? ` · stderr: ${String(spawnResult.stderr).trim().split('\n')[0]}` : ''}`,
    };
  }
  if (!out || !Array.isArray(out.records)) return { kind: 'harness', why: 'a JSON-ban nincs `records` tömb' };

  // (4) A TERVEZETT KÉSZLET — KÜLSŐ szerződésből, nem a futás eredményéből (H03 · H04).
  const set = checkResultSet(out.records);
  if (!set.ok) return { kind: 'harness', why: `az eredménycsomag nem felel meg a tervezett készletnek — ${set.problems.join(' · ')}` };
  // (4/b) A CSOMAG SAJÁT AZONOSSÁGA KÖTELEZŐ (R49/H03): manifest-verzió és MÉRT forrás-lenyomat
  // nélkül a kimenet nem mondja meg, MIT mért — a hiányzó kötés nem lehet néma (KUKA-012).
  if (!out.manifest_version) return { kind: 'harness', why: 'a kimenetből hiányzik a manifest-verzió — a csomag nem mondja meg, melyik tervezett készletre vonatkozik' };
  if (!out.source_digest) return { kind: 'harness', why: 'a kimenetből hiányzik a MÉRT forrás-lenyomat (source_digest) — a csomag nem mondja meg, melyik forráson mért' };
  if (out.manifest_version && out.manifest_version !== MANIFEST_VERSION) {
    return { kind: 'harness', why: `más manifest-verzió: ${out.manifest_version} ≠ ${MANIFEST_VERSION}` };
  }
  // (4/c) A LENYOMAT ÉS A FUTÁS-JEL EGYEZZEN AZZAL, AMIT A SZÜLŐ ELŐÁLLÍTOTT (R51/J5).
  if (out.source_digest !== expected.digest) {
    return { kind: 'harness', why: `a mért forrás-lenyomat NEM az, amit a szülő előállított: ${out.source_digest} ≠ ${expected.digest}` };
  }
  if (out.run_token !== expected.runToken) {
    return { kind: 'harness', why: 'a csomag nem ehhez a futáshoz tartozik (hiányzó vagy eltérő futás-jel) — korábbi futás eredménye nem fogadható el' };
  }

  // (5) EGYETLEN ÁLLÍTÁS SEM FUTOTT LE — H03. A `SKIP`/`NOT_STARTED` nem bukott állítás, és a
  // mai hatpróbás csomaghoz NINCS deklarált korai-megállási profil (R45), tehát a kihagyás mérőhiba.
  const ran = out.records.filter((r) => r.status === PROBE_STATUS.PASS
    || r.status === PROBE_STATUS.FAIL || r.status === PROBE_STATUS.THREW);
  const skipped = out.records.filter((r) => r.status === PROBE_STATUS.SKIP || r.status === PROBE_STATUS.NOT_STARTED);
  if (ran.length === 0) return { kind: 'harness', why: 'EGYETLEN próba állítása sem futott le (csak SKIP/NOT_STARTED)' };
  if (skipped.length) {
    return { kind: 'harness', why: `${skipped.length} próba kimaradt (${skipped.map((r) => r.probe_id).join(', ')}) — deklarált korai-megállási profil nincs` };
  }

  // (6) A KILÉPÉSI KÓD ÉS AZ EREDMÉNY EGYEZZEN. Ha ellentmondanak, nem tudjuk, melyik igaz.
  const nonPass = out.records.filter((r) => r.status !== PROBE_STATUS.PASS);
  const expectedCode = nonPass.length ? 1 : 0;
  if (spawnResult.status !== expectedCode) {
    return { kind: 'harness', why: `a kilépési kód (${spawnResult.status}) ellentmond az eredménynek (${nonPass.length} nem-PASS ⇒ ${expectedCode})` };
  }

  return {
    kind: 'ok',
    records: out.records,
    failed: out.records.filter((r) => r.status === PROBE_STATUS.FAIL).map((r) => r.probe_id),
    threw: out.records.filter((r) => r.status === PROBE_STATUS.THREW),
  };
}

// ── A SZÜLŐ ÁLTAL ELŐÁLLÍTOTT FORRÁS AZONOSSÁGA (R51/J5) ────────────────────────────────────────
//
// UGYANAZ az algoritmus, amit a gyermek `sourceDigest()`-je futtat — de a szülő a SAJÁT kezével,
// a MUTÁCIÓ UTÁNI könyvtáron. Így az elvárt érték nem a gyermek szava, hanem a szülő mérése.
// Ha a két algoritmus elcsúszna, minden futás MÉRŐHIBÁRA menne — vagyis a csúszás nem néma
// (KUKA-018: ahol egy fogalomnak két ábrázolása van, a különbségnek látszania kell).
export function digestOfBundle(dir) {
  const refDir = join(dir, 'v3ref');
  const files = readdirSync(refDir).filter((f) => f.endsWith('.mjs')).sort();
  const h = createHash('sha256');
  for (const f of files) { h.update(f); h.update('\0'); h.update(readFileSync(join(refDir, f))); h.update('\0'); }
  return `sha256:${h.digest('hex')}`;
}

/** A szülő elvárása EGY gyermek-futásra: mit állítottunk elő, és melyik futás ez. */
function expectationFor(dir) {
  return { digest: digestOfBundle(dir), runToken: `rt_${randomUUID()}` };
}

function runIn(dir, runToken) {
  return spawnSync(process.execPath, [join(dir, 'v3ref', 'run.mjs'), '--json'],
    { encoding: 'utf8', timeout: RUN_TIMEOUT_MS, env: { ...process.env, V3REF_RUN_TOKEN: runToken } });
}

// ── EGY MUTÁCIÓ = EGY VAGY TÖBB SZERKESZTÉS ──────────────────────────────────────────────────────
//
// A rövid alak (`from`/`to`) EGY szerkesztés — a 35-ből 34 ilyen. A hosszú alak (`edits: [{from,to}]`)
// akkor kell, amikor a védelem TÖBBRÉTEGŰ, és egyetlen réteg elvétele még nem viszi pirosra a
// próbát: ilyenkor az egy-szerkesztéses mutáció TÚLÉL, és egy próba, ami nem tud pirosra váltani,
// nem bizonyít semmit (KUKA-041). A két alak EGY otthonon megy át (KUKA-003): a normalizálót
// MINDKÉT futtató hívja, tehát a párhuzamos és a soros ág nem tud elcsúszni (KUKA-039).
//
// MINDEN szerkesztés horgonyát KÜLÖN mérjük, és a hiányzó horgony a TELJES mutációt elavulttá
// teszi. A néma fél-mutáció ugyanaz a hazugság, mint a néma fél-őr: úgy nézne ki, mint egy
// elvégzett rontás, közben a védelem egy része érintetlenül állna (KUKA-039 · KUKA-012).
function editsOf(m) {
  return Array.isArray(m.edits) ? m.edits : [{ from: m.from, to: m.to }];
}

/** @returns {{ok:true, src:string}|{ok:false, at:number, count:number}} */
function applyEdits(src, edits) {
  let out = src;
  for (let i = 0; i < edits.length; i++) {
    if (!out.includes(edits[i].from)) return { ok: false, at: i + 1, count: edits.length };
    out = out.replace(edits[i].from, edits[i].to);
  }
  return { ok: true, src: out };
}

function staleAnchorWhy(bad) {
  return bad.count > 1
    ? `a mutáció ${bad.at}./${bad.count} horgonya NEM TALÁLHATÓ a forrásban — a mutáció elavult`
    : 'a mutáció horgonya NEM TALÁLHATÓ a forrásban — a mutáció elavult';
}

function withCopy(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'v3mut-'));
  try {
    cpSync(REF, join(dir, 'v3ref'), { recursive: true });
    return fn(dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

// ── (a) ALAPVONAL: a mutálatlan másolat zöld? ────────────────────────────────────────────────────
function baselineGate() {
  return withCopy((dir) => {
    const e = expectationFor(dir);
    const c = classifyRun(runIn(dir, e.runToken), e);
    if (c.kind === 'harness') return { ok: false, why: `az ALAPVONAL nem futott le: ${c.why}` };
    if (c.failed.length || c.threw.length) {
      return { ok: false, why: `az ALAPVONAL piros: ${[...c.failed, ...c.threw.map((r) => `${r.probe_id}(kivétel)`)].join(', ')}` };
    }
    return { ok: true, probes: c.records.map((r) => r.probe_id) };
  });
}

// ── (b)–(f) A HAZUGSÁG-ELLENPRÓBÁK: MINDEN futáskor, nem kapcsolóra ──────────────────────────────
//
// Mindegyik a `run.mjs` helyére tesz egy TÁMADÓ futtatót, és megköveteli, hogy az eszköz NE
// mondja elkapásnak. Ez az egyetlen dolog, amitől a többi számnak értéke van: a mérő minden
// futáskor elvégzi magán a külső fél támadásait.

// A TÁMADÓ FUTTATÓ EREDET-HELYES (R51/J5 után). Amíg beégetett hamis lenyomatot adott, az ÚJ
// eredet-ellenőrzés MINDEN támadást azon állított meg — vagyis a H03 és a H06 többé nem a SAJÁT
// tengelyét mérte (a H03 „egyetlen próba sem futott" helyett lenyomat-eltérésre lett zöld). Ez a
// KUKA-049 alakja a saját mérőnkön: a jel a TÜNETET mérte, nem a mechanizmust — és a rossz okból
// zöld jel ugyanolyan hamis, mint a piros.
//
// Ezért a hamis futtató UGYANÚGY kiszámolja a saját csomagja lenyomatát, és visszaadja a szülőtől
// kapott futás-jelet. Így minden támadás eljut ahhoz a szakaszhoz, amit VIZSGÁLNI akar. Ez egyben
// KIMONDJA az eredet-ellenőrzés korlátját is: egy futtató, ami a kapott jelet visszaírja, ezen a
// kapun átmegy — az eredet-ellenőrzés ELAVULT és IDEGEN FORRÁSÚ csomag ellen véd, nem rosszindulat
// ellen. Erre külön két támadás mér (H08 · H09).
const fakeRunner = (jsonExpr, exitCode, digestExpr = 'MEASURED_DIGEST') =>
  `import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const D = dirname(fileURLToPath(import.meta.url));
const h = createHash('sha256');
for (const f of readdirSync(D).filter((x) => x.endsWith('.mjs')).sort()) {
  h.update(f); h.update('\\0'); h.update(readFileSync(join(D, f))); h.update('\\0');
}
const MEASURED_DIGEST = 'sha256:' + h.digest('hex');
const out = { source_digest: ${digestExpr}, run_token: process.env.V3REF_RUN_TOKEN ?? null, ...${jsonExpr} };
process.stdout.write(JSON.stringify(out));
process.exit(${exitCode});
`;

const RECORDS = (mapper) => `${JSON.stringify(EXPECTED_IDS)}.map((id) => (${mapper}))`;

const ATTACKS = [
  { id: 'Q18', what: 'a futtató azonnal 86-tal kilép, JSON nélkül',
    runner: 'process.exit(86);\n' },

  { id: 'H03', what: 'egyetlen próba sem fut, csak SKIP rekordok a hat ismert azonosítóhoz',
    runner: fakeRunner(`{ manifest_version: ${JSON.stringify(MANIFEST_VERSION)}, records: ${RECORDS("{ probe_id: id, status: 'SKIP' }")} }`, 1) },

  { id: 'H04', what: 'csak a BUKOTT rekordok kerülnek a kimenetbe (hiányos csomag)',
    runner: fakeRunner(`{ manifest_version: ${JSON.stringify(MANIFEST_VERSION)}, records: [{ probe_id: ${JSON.stringify(EXPECTED_IDS[0])}, status: 'FAIL', assertion_id: 'x' }] }`, 1) },

  { id: 'H05', what: 'valódi alakú JSON, de a futtató 86-tal lép ki',
    runner: fakeRunner(`{ manifest_version: ${JSON.stringify(MANIFEST_VERSION)}, records: ${RECORDS("{ probe_id: id, status: 'PASS' }")} }`, 86) },

  // H06 KÜLÖN MÉRCE, ÉS EZT KI KELL MONDANI (KUKA-048: a kivétel hatókörét a MÉRCE dönti el, nem
  // a kényelem). A H06 kimenete FORMAILAG érvényes mérés: minden tervezett próba szerepel, ismert
  // állapottal. Tehát nem mérőhiba — a követelmény az, hogy NE legyen belőle ELKAPÁS: a várt üzleti
  // állítás bukása és egy váratlan kivétel KÉT KÜLÖN kimenet (R45 H06). A helyes ítélet:
  // WRONG_CATCHER. Ha ezt is `harness`-nak követelném, a mérce hazudna arról, mit mértem.
  { id: 'H06', requires: 'not_caught', expect_verdict: 'WRONG_CATCHER',
    what: 'idegen infrastruktúra-kivétel a nevezett próbán, bukott ÁLLÍTÁS helyett',
    runner: fakeRunner(`{ manifest_version: ${JSON.stringify(MANIFEST_VERSION)}, records: ${RECORDS("{ probe_id: id, status: 'THREW', error_code: 'ECONNREFUSED', phase: 'infrastructure' }")} }`, 1) },

  { id: 'H0X', what: 'ISMÉTLŐDŐ és ISMERETLEN azonosító a kimenetben',
    runner: fakeRunner(`{ manifest_version: ${JSON.stringify(MANIFEST_VERSION)}, records: [...${RECORDS("{ probe_id: id, status: 'PASS' }")}, { probe_id: ${JSON.stringify(EXPECTED_IDS[0])}, status: 'PASS' }, { probe_id: 'P-KITALALT', status: 'FAIL', assertion_id: 'x' }] }`, 1) },

  // H08 · H09 — AZ ÚJ EREDET-ELLENŐRZÉS SAJÁT ELLENPRÓBÁI (R51/J5 · a külső fél M01 esete).
  // A javítás akkor kész, ha a HIÁNYA bizonyítottan pirosra vált (KUKA-092). Mindkét csomag
  // FORMAILAG hibátlan — 24 tervezett próba, mind PASS, helyes manifest-verzió, 0-s kilépés —,
  // tehát a régi osztályozó ÉRVÉNYES MÉRÉSNEK fogadta volna el őket.
  { id: 'H08', what: 'formailag hibátlan csomag, de IDEGEN forrás-lenyomattal',
    runner: fakeRunner(`{ manifest_version: ${JSON.stringify(MANIFEST_VERSION)}, records: ${RECORDS("{ probe_id: id, status: 'PASS' }")} }`, 0, "'sha256:idegen'") },

  { id: 'H09', what: 'formailag hibátlan csomag, de EGY KORÁBBI futás jelével',
    runner: fakeRunner(`{ manifest_version: ${JSON.stringify(MANIFEST_VERSION)}, records: ${RECORDS("{ probe_id: id, status: 'PASS' }")}, run_token: 'rt_egy_korabbi_futasbol' }`, 0) },
];

/**
 * Egy támadás akkor VÉDETT, ha a mérő mérőhibának minősíti — ÉS ha a `runtime_error` szerződésű
 * mutáció sem tudja belőle elkapást csinálni (H02: a teljes futtató hibája SOHA nem bizonyíték).
 */
function attackGate(a) {
  return withCopy((dir) => {
    writeFileSync(join(dir, 'v3ref', 'run.mjs'), a.runner);
    const e = expectationFor(dir);
    return judgeAttack(a, classifyRun(runIn(dir, e.runToken), e));
  });
}

// A PÁRHUZAMOS ALAK. Az ÍTÉLET ugyanaz a `judgeAttack` — a soros és a párhuzamos ág nem tud
// elcsúszni (KUKA-039), mert a döntést EGY otthon hozza; csak a futtatás módja különbözik.
// Miért kellett: nyolc ellenpróba sorosan ~2 mp-et adott a falórához, és a külső fél 15 000 ms-os
// gyermek-korlátjához a 42 mutációval együtt már NEM fért bele. A lassulás nem elfogadható
// „részlet": a korlát túllépése az ő oldalukon MÉRŐHIBA lenne, a MI hibánkból.
async function attackGateAsync(a) {
  const dir = mkdtempSync(join(tmpdir(), 'v3mut-'));
  try {
    cpSync(REF, join(dir, 'v3ref'), { recursive: true });
    writeFileSync(join(dir, 'v3ref', 'run.mjs'), a.runner);
    const e = expectationFor(dir);
    return judgeAttack(a, classifyRun(await runInAsync(dir, e.runToken), e));
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

function judgeAttack(a, c) {
  {
    const requires = a.requires || 'harness';

    if (requires === 'harness' && c.kind !== 'harness') {
      return { ok: false, why: `A MÉRŐ HAZUDIK: a támadást ÉRVÉNYES MÉRÉSNEK fogadta el (${a.what})` };
    }

    // A KÖZÖS, MINDIG ÉRVÉNYES KÖVETELMÉNY: egyik szerződés alatt SEM lehet ELKAPÁS.
    // A `runtime_error` ág külön is mérve — ez a H02: a teljes futtató hibája SOHA nem bizonyíték.
    const vRuntime = verdictFor({ expect: 'runtime_error', catcher: EXPECTED_IDS[0], error_code: 'A_SZERZODESBEN_ALLO' }, c);
    const vFail = verdictFor({ expect: 'probe_fail', catcher: EXPECTED_IDS[0] }, c);
    for (const [name, v] of [['runtime_error', vRuntime], ['probe_fail', vFail]]) {
      if (v.verdict === 'CAUGHT') {
        return { ok: false, why: `A MÉRŐ HAZUDIK: a(z) ${name} szerződés ELKAPÁSNAK vette (${v.why})` };
      }
    }
    if (a.expect_verdict && vFail.verdict !== a.expect_verdict) {
      return { ok: false, why: `az ítélet ${vFail.verdict}, de a szerződés ${a.expect_verdict}-t vár — ${vFail.why}` };
    }
    return {
      ok: true,
      why: c.kind === 'harness'
        ? `helyesen HARNESS_ERROR — ${c.why}`
        : `formailag érvényes mérés, de helyesen ${vFail.verdict} — ${vFail.why}`,
    };
  }
}

/**
 * AZ ÍTÉLET — a nevezett próba nevezett ÁLLÍTÁSA bukott-e el?
 * Külön függvény, hogy az ellenpróbák is EZT hívják, ne egy másolatát (KUKA-009).
 */
function verdictFor(m, c) {
  if (c.kind === 'harness') return { verdict: 'HARNESS_ERROR', why: c.why };

  const rec = (c.records || []).find((r) => r.probe_id === m.catcher);
  if (!rec) return { verdict: 'HARNESS_ERROR', why: `a nevezett próba (${m.catcher}) nincs az eredményben` };

  if (m.expect === 'runtime_error') {
    // SZŰKÍTVE (R45 §4): csak a próbán BELÜLI, ELŐRE MEGNEVEZETT hibakódú kivétel bizonyíték.
    // A teljes futtató hibája, idegen kivétel és a próba előtti összeomlás SOHA nem az.
    if (rec.status !== PROBE_STATUS.THREW) {
      const other = c.failed.filter((id) => id !== m.catcher);
      if (c.failed.includes(m.catcher)) {
        const wantA = assertionOf(m.catcher);
        if (wantA && rec.assertion_id !== wantA) {
          return { verdict: 'WRONG_CATCHER', why: `a ${m.catcher} MÁS állítást bukott: ${rec.assertion_id} ≠ ${wantA}` };
        }
        return { verdict: 'CAUGHT', why: `a nevezett ${m.catcher} ÁLLÍTÁSA bukott (a szerződés kivételt is megengedett volna)` };
      }
      return other.length
        ? { verdict: 'WRONG_CATCHER', why: `bukott: ${other.join(', ')} — de a nevezett ${m.catcher} nem` }
        : { verdict: 'SURVIVED', why: 'minden próba átment' };
    }
    if (m.error_code && rec.error_code !== m.error_code) {
      return { verdict: 'WRONG_CATCHER', why: `a ${m.catcher} kivételt dobott, de MÁS hibakóddal: ${rec.error_code} ≠ a szerződésben álló ${m.error_code}` };
    }
    if (m.phase && rec.phase !== m.phase) {
      return { verdict: 'WRONG_CATCHER', why: `a ${m.catcher} kivétele MÁS fázisban keletkezett: ${rec.phase} ≠ ${m.phase}` };
    }
    if (!m.error_match) {
      return { verdict: 'HARNESS_ERROR', why: `a ${m.id || m.catcher} runtime_error szerződése nem nevezi meg a kivétel HELYÉT (error_match hiányzik)` };
    }
    const msg = String(rec.error_message ?? rec.actual ?? '');
    if (!new RegExp(m.error_match).test(msg)) {
      return { verdict: 'WRONG_CATCHER', why: `a ${m.catcher} kivétele IDEGEN: ${msg} — nem illeszkedik a szerződésben álló helyre (${m.error_match})` };
    }
    return { verdict: 'CAUGHT', weak: true,
      why: `a nevezett ${m.catcher} a szerződésben ELŐRE rögzített kivételt dobta (${rec.error_code} · ${rec.phase})` };
  }

  // `probe_fail`: a NEVEZETT ÁLLÍTÁSNAK kell buknia — nem elég, hogy „valami történt" a próbán.
  if (rec.status === PROBE_STATUS.THREW) {
    return { verdict: 'WRONG_CATCHER', why: `a ${m.catcher} nem az állítását bukta, hanem KIVÉTELT dobott (${rec.error_code} · ${rec.phase}) — ez nem a szerződés szerinti bizonyíték` };
  }
  if (rec.status !== PROBE_STATUS.FAIL) {
    const other = c.failed.filter((id) => id !== m.catcher);
    return other.length
      ? { verdict: 'WRONG_CATCHER', why: `bukott: ${other.join(', ')} — de a nevezett ${m.catcher} NEM` }
      : { verdict: 'SURVIVED', why: 'minden próba átment' };
  }
  const want = assertionOf(m.catcher);
  if (want && rec.assertion_id !== want) {
    return { verdict: 'WRONG_CATCHER', why: `a ${m.catcher} bukott, de MÁS állításon: ${rec.assertion_id} ≠ ${want}` };
  }
  return { verdict: 'CAUGHT', why: `a nevezett ${m.catcher} a nevezett állításán bukott (${want})` };
}

// A PÁRHUZAMOSSÁG TÚLFOGLAL, ÉS EZ SZÁNDÉKOS. Egy mutáció-futás nem telíti a magot: az idejének
// nagyobb része folyamat-indítás és modul-betöltés (I/O), nem számolás. A mag-számhoz kötött plafon
// ezért ROSSZ plafon volt. Négyszeres túlfoglalás, a MI gépünkön (4 mag) mérve, 42 mutációval:
//
//   párhuzamosság  4 →  15,1 mp   (a külső fél 15 000 ms-os korlátja FÖLÖTT — az ő oldalukon ez
//                                  MÉRŐHIBA lenne, a MI hibánkból)
//   párhuzamosság  8 →  14,3 mp
//   párhuzamosság 12 →  12,6 mp
//   párhuzamosság 16 →  11,1-11,7 mp   <- ez az alak, VÁLTOZATLAN eredménnyel (42/42 · 8/8)
//
// A 16-os felső korlát azért van, hogy egy nagy gépen se induljon korlátlan gyerek-folyamat.
//
// R53 UTÁN A SZŰK KERESZTMETSZET MÁSHOL VOLT, ÉS EZT MEG IS MÉRTÜK. A 27. próba felvételével a
// falióra 21,8 mp-re nőtt — a párhuzamosság hangolása itt már nem segített volna, mert a költség
// 90%-a a TÁROLÓ FELÉPÍTÉSE volt (nyitás + séma, lemez-szinkronnal): 20 tárolón mérve 510 ms,
// futásonként ~50 tárolóval. A `journal_mode=MEMORY` + `synchronous=OFF` beállítással ugyanez
// 28 ms (18×), a teljes battéria pedig 21 799 ms → 3 031 ms, VÁLTOZATLAN eredménnyel (43/43 · 8/8).
// A tanulság a mérésre: az időkorlátot ne a párhuzamossággal próbáljuk kihajtani, amíg nem tudjuk,
// MIRE megy el az idő — a hangolás a mérés SAJÁT előfeltevését igazolta volna vissza (KUKA-054).
//
// KIMONDOTT KORLÁT: a falóra a MI gépünkön mért szám. A külső fél a saját, gyorsabb gépén 1,7 mp-et
// mért ugyanerre - tehát ott bőven van tartalék -, de LASSABB gépen a korlát közelebb kerülhet.
// Ezért a futás KIÍRJA a mért időt ÉS a korlátot: a különbség sosem néma (KUKA-012).
const POOL = Math.max(1, Math.min(16, availableParallelism() * 4));
function runInAsync(dir, runToken) {
  return new Promise((res) => {
    const c = spawn(process.execPath, [join(dir, 'v3ref', 'run.mjs'), '--json'],
      { encoding: 'utf8', env: { ...process.env, V3REF_RUN_TOKEN: runToken } });
    let stdout = ''; let stderr = '';
    const timer = setTimeout(() => { c.kill('SIGKILL'); }, RUN_TIMEOUT_MS);
    c.stdout.on('data', (d) => { stdout += d; });
    c.stderr.on('data', (d) => { stderr += d; });
    c.on('error', (error) => { clearTimeout(timer); res({ status: null, signal: null, error, stdout, stderr }); });
    c.on('close', (status, signal) => { clearTimeout(timer); res({ status, signal, error: undefined, stdout, stderr }); });
  });
}
async function pool(items, limit, fn) {
  const out = new Array(items.length); let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
async function runMutationAsync(m, knownProbes) {
  if (!knownProbes.includes(m.catcher)) {
    return { ...m, verdict: 'STALE_ANCHOR', why: `a megnevezett próba nem létezik: ${m.catcher}` };
  }
  const dir = mkdtempSync(join(tmpdir(), 'v3mut-'));
  try {
    cpSync(REF, join(dir, 'v3ref'), { recursive: true });
    const target = join(dir, 'v3ref', m.file);
    const applied = applyEdits(readFileSync(target, 'utf8'), editsOf(m));
    if (!applied.ok) return { ...m, verdict: 'STALE_ANCHOR', why: staleAnchorWhy(applied) };
    writeFileSync(target, applied.src);
    const e = expectationFor(dir);
    return { ...m, ...verdictFor(m, classifyRun(await runInAsync(dir, e.runToken), e)) };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

function runMutation(m, knownProbes) {
  if (!knownProbes.includes(m.catcher)) {
    return { ...m, verdict: 'STALE_ANCHOR', why: `a megnevezett próba nem létezik: ${m.catcher}` };
  }
  return withCopy((dir) => {
    const target = join(dir, 'v3ref', m.file);
    const applied = applyEdits(readFileSync(target, 'utf8'), editsOf(m));
    if (!applied.ok) return { ...m, verdict: 'STALE_ANCHOR', why: staleAnchorWhy(applied) };
    writeFileSync(target, applied.src);
    const e = expectationFor(dir);
    return { ...m, ...verdictFor(m, classifyRun(runIn(dir, e.runToken), e)) };
  });
}

// ── Futtatás ─────────────────────────────────────────────────────────────────────────────────────
console.log('');
const WALL_T0 = Date.now();
console.log('V3 MAGREFERENCIA — MUTÁCIÓS PRÓBA (G6)');
console.log('='.repeat(78));

const base = baselineGate();
console.log(`  KAPU (a) ALAPVONAL: ${base.ok ? 'ZÖLD' : 'PIROS'} — ${base.ok ? `${base.probes.length} próba futott, mind PASS` : base.why}`);
console.log('');
console.log('  KAPUK (b) HAZUGSÁG-ELLENPRÓBÁK — a külső fél támadásai a SAJÁT kódunkon, minden futáskor:');
const attacks = (await pool(ATTACKS, POOL, attackGateAsync)).map((r, i) => ({ ...ATTACKS[i], ...r }));
for (const a of attacks) {
  console.log(`    ${a.ok ? 'ZÖLD ' : 'PIROS'} [${a.id}] ${a.what}`);
  console.log(`           → ${a.why}`);
}
const attacksOk = attacks.every((a) => a.ok);
console.log('');

let results = [];
if (base.ok && attacksOk) {
  results = await pool(MUTATIONS, POOL, (m) => runMutationAsync(m, base.probes));
  console.log('  Minden sor EGY elrontott őr. A NEVEZETT próba NEVEZETT ÁLLÍTÁSÁNAK kell buknia.');
  console.log('');
  for (const r of results) {
    console.log(`  ${r.verdict.padEnd(13)} [${r.id}·${r.rule}] ${r.what}`);
    console.log(`                → ${r.why}`);
    if (r.weak) console.log(`                ⚠ a bizonyíték ereje korlátozott: ${r.evidence_limit || 'előre rögzített, próbán belüli kivétel'}`);
  }
} else {
  console.log('  A mutációk NEM FUTOTTAK: valamelyik kapu piros, tehát az eredményük értelmezhetetlen');
  console.log('  volna. A hiányzó mérés nem zöld (KUKA-051 · KUKA-089).');
}

const count = (v) => results.filter((r) => r.verdict === v).length;
const caught = count('CAUGHT'), survived = count('SURVIVED'), wrong = count('WRONG_CATCHER');
const harness = count('HARNESS_ERROR'), stale = count('STALE_ANCHOR');
const weak = results.filter((r) => r.weak).length;

console.log('');
console.log(`  Manifest: ${MANIFEST_VERSION} · tervezett próbák: ${EXPECTED_IDS.length} (${EXPECTED_IDS.join(', ')})`);
console.log(`  ${MUTATIONS.length} mutáció · ${caught} elkapva (ebből ${weak} korlátozott erejű)`
  + ` · ${survived} túlélte · ${wrong} rossz próba · ${harness} mérőhiba · ${stale} elavult horgony`);
// AZ IDŐKORLÁT IS SZERZŐDÉS, ÉS EDDIG NEM VOLT ŐRE (R53 után mérve). A külső fél a battériát
// 15 000 ms-os korláttal futtatja; ha túllépjük, náluk a folyamatot JEL állítja le, és a mérés
// „harness"-hibává válik — nem a kódról szól többé. Ez pontosan meg is történt: a 27. próba
// felvételével a falióra 15 021 ms lett, és az ő futásukban IDŐTÚLLÉPÉS-ként állt. A saját
// futtatóm ezt csak KIÍRTA, nem gátolta — a nem mért korlát ZÖLDNEK látszik (KUKA-051).
//
// A KAPU A KORLÁT ELŐTT ÁLL, NEM RAJTA. Egy őr, ami pont akkor tüzel, amikor a baj bekövetkezik,
// nem őr. Ezért a saját falióránknak a külső korlát 80%-a alatt kell maradnia: a maradék 20% a
// LASSABB gép tartaléka. KIMONDOTT KORLÁT: ez a MI gépünkön mért idő — egy nálunk 25%-kal lassabb
// gépen a külső korlát akkor is elérhető, ha itt zöld. A tartalék tehát csökkenti, de nem szünteti
// meg a kockázatot; a kiírt százalék miatt viszont a sodródás sosem néma (KUKA-012).
const EXTERNAL_WALL_LIMIT_MS = 15000;
const WALL_BUDGET_MS = Math.round(EXTERNAL_WALL_LIMIT_MS * 0.8);
const wall = Date.now() - WALL_T0;
const wallOk = wall <= WALL_BUDGET_MS;
console.log(`  falióra: ${wall} ms · párhuzamosság: ${POOL} · külső korlát: ${EXTERNAL_WALL_LIMIT_MS} ms`
  + ` · saját költségvetés: ${WALL_BUDGET_MS} ms (a korlát 80%-a) · kihasználva: ${Math.round((wall / EXTERNAL_WALL_LIMIT_MS) * 100)}%`);
if (!wallOk) {
  console.log(`  IDŐ-TÚLLÉPÉS: a battéria ${wall} ms alatt futott, a saját költségvetés ${WALL_BUDGET_MS} ms.`);
  console.log('    A külső fél 15 000 ms-os korlátjánál ez IDŐTÚLLÉPÉS-ként állna meg, és a mérés');
  console.log('    „mérőhibává" válna — nem a kódról szólna többé. Mérd meg, MIRE megy el az idő,');
  console.log('    mielőtt a párhuzamosságot hangolod (a tapasztalat szerint a tároló felépítése).');
}
console.log(`  ${attacks.length} hazugság-ellenpróba · ${attacks.filter((a) => a.ok).length} védett`);
const clean = base.ok && attacksOk && results.length === MUTATIONS.length
  && survived === 0 && wrong === 0 && harness === 0 && stale === 0 && wallOk;
console.log(`RESULT: ${clean ? 'MINDEN VESZÉLYES MUTÁCIÓ A NEVEZETT ÁLLÍTÁSSAL ÉSZLELT' : 'HIÁNYOS — lásd a fenti sorokat'}`);
process.exit(clean ? 0 : 1);
