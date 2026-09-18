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

import { cpSync, readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync, spawn } from 'node:child_process';
import { availableParallelism } from 'node:os';

const REF = dirname(fileURLToPath(import.meta.url));
let BASE_DIGEST = null;   // az ALAP (mutálatlan) forrás lenyomata — az alapvonal-kapu tölti fel
const RUN_TIMEOUT_MS = 60000;

import { MUTATIONS } from './mutations.mjs';
// A NEM-NULLA EGYSÉG OKÁNAK FELOLDÓJA KÜLÖN MODULBAN (UFK-01): ezt a fájlt a próba is
// IMPORTÁLHATJA anélkül, hogy a teljes battériát elindítaná (a `mutate.mjs` maga futtató, nem könyvtár).
import { unitFailureKind, freshUnitWitness } from './unitFailureKind.mjs';


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

import { MANIFEST_VERSION, EXPECTED_IDS, EXPECTED_PROBES, PROBE_STATUS, checkResultSet, assertionOf } from './manifest.mjs';
import {
  checkNorms, NEXT_REQUIRED_EVIDENCE, REQUIRED_EVIDENCE, indexDigest, chainResultRank,
  // A KANONIKUS ELVÁRT LÁNC (R83/F02): az összefűzés nem a beadott sorokból tudja meg, MELY
  // soroknak kell ott lenniük — a listát a rögzített norma- és próba-szerződés adja.
  expectedChainRows, chainRowKey,
} from './norms.mjs';
import { contractRef } from './normContract.mjs';
// MRG-01 (R81/F01–F03) — az ÖSSZEFŰZÉS BEADVÁNY-KAPUJA. Külön modulban áll, hogy a pin HÍVHASSA
// ugyanazt a döntést, amit a futtató használ (KUKA-009), ne a forrás szövegét olvassa.
import { admitUnits, chainBacking, SUPPORTED_RUN_CONTRACTS } from './unitAdmission.mjs';

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

// ── A SZÜLŐI ELVÁRÁS-FŐKÖNYV (R59/F01) ──────────────────────────────────────────────────────────
//
// MIÉRT KÜLÖN. A végleges kapunak átadott `expectation` korábban a MINŐSÍTENDŐ csomagokból épült
// (`r.falsification.run_token` / `.mutated_digest`) — vagyis ugyanabból az adatból, amit ellenőrizni
// kellett volna. A gyermek-futás ellenőrzése ettől még valós volt, de a VÉGSŐ kapu így önmagához
// mért (a KUKA-103 maradéka: a bizonyíték nem igazolhatja önmagát). Innentől a szülő itt, a
// KELETKEZÉS pillanatában jegyzi fel, mit állított elő — és a végső elvárás EBBŐL épül, soha nem a
// csomagokból. A főkönyv `Map`, tehát a mutáció-azonosító nem ütközhet örökölt kulccsal.
const PARENT_EXPECTATIONS = new Map();   // mutation_id → { digest, runToken }

/** A szülő elvárása EGY gyermek-futásra: mit állítottunk elő, és melyik futás ez.
 *  @param {string} [mutationId] — ha meg van adva, a főkönyvbe is bekerül (a mutációs ágak adják).
 */
function expectationFor(dir, mutationId) {
  const e = { digest: digestOfBundle(dir), runToken: `rt_${randomUUID()}` };
  if (mutationId) PARENT_EXPECTATIONS.set(mutationId, e);
  return e;
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
// A HORGONY LEGYEN EGYEDI, NE CSAK LÉTEZŐ (R81 — a SAJÁT söprésem lelete).
//
// A LELET. A régi alak `includes`-szal kérdezte meg, hogy a horgony MEGVAN-E, majd `replace`-szel
// az ELSŐ előfordulást cserélte ki. Mérve: az R81-es kiadási javítás után az M93 horgonya
// (`  return out.authorized ? out.value : refused;`) KÉT helyen állt a `command.mjs`-ben — a
// parancsírásban és a kiadásban —, és a mutáció némán az elsőre esett. Itt VÉLETLENÜL az volt a
// megnevezett hely, de ez szerencse, nem szerkezet: egy sorrend-csere vagy egy új, azonos alakú
// sor átvinné a mérést egy MÁSIK kódrészletre, és a battéria ettől zöld maradna (KUKA-038: a
// LÉTEZÉS nem bizonyíték arra, hogy AZT mérjük, amit megnevezünk — KUKA-128 a normalizálásról:
// ami két különböző dolgot azonosnak lát, az nem azonosít, hanem összemos).
//
// A VERDIKT UGYANAZ, AZ OK NEVEZETT. Mindkét eset ugyanazt jelenti a battéria számára: ez a
// mutáció NEM érvényes mérés, a regisztert javítani kell — ezért `STALE_ANCHOR` marad. A `why`
// viszont KIMONDJA, melyik (hiányzó vagy TÖBBSZÖRÖS horgony), mert a javítás más: az egyiket
// újra kell horgonyozni, a másikat SZŰKÍTENI (KUKA-124/2 · KUKA-064: a nemleges válasz mondja meg,
// mi a teendő).
function applyEdits(src, edits) {
  let out = src;
  for (let i = 0; i < edits.length; i++) {
    const hits = out.split(edits[i].from).length - 1;
    if (hits !== 1) return { ok: false, at: i + 1, count: edits.length, hits };
    out = out.replace(edits[i].from, edits[i].to);
  }
  return { ok: true, src: out };
}

function staleAnchorWhy(bad) {
  const which = bad.count > 1 ? `a mutáció ${bad.at}./${bad.count} horgonya` : 'a mutáció horgonya';
  return bad.hits > 1
    ? `${which} ${bad.hits} HELYEN illeszkedik a forrásban — nem eldönthető, MELYIKET mérnénk; `
      + 'a horgonyt SZŰKÍTENI kell (több sort felvéve), nem újrahorgonyozni'
    : `${which} NEM TALÁLHATÓ a forrásban — a mutáció elavult`;
}

function withCopy(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'v3mut-'));
  try {
    cpSync(REF, join(dir, 'v3ref'), { recursive: true });
    return fn(dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

// ── (a) ALAPVONAL: a mutálatlan másolat zöld? ────────────────────────────────────────────────────

// ── A FALSZIFIKÁCIÓS BIZONYÍTÉK (R55/F03) ───────────────────────────────────────────────────────
//
// MIÉRT NEM ELÉG A DEFINÍCIÓ. A norma-kapu eddig azt kérdezte, hogy egy mutáció DEFINÍCIÓJÁBAN
// szerepel-e a próba neve. A külső fél N01 esete két, SOHA NEM FUTTATOTT `{id, catcher}` bejegyzést
// adott át, és a kapu mindhárom klauzulát fedettnek mondta. Innentől a kapu EREDMÉNYT kap, és az
// eredmény hozza magával az EREDETÉT is: az alkalmazás igazolva, az alap- és a mutált forrás MÉRT
// lenyomata (a kettő különbözik), a futás-jel, a nevezett próba — és a ténylegesen HAMISRA fordult
// állítás-azonosítók. Nem a mutáció ÖSSZESÍTETT bukása számít, hanem hogy MELYIK állítás bukott
// (N04: az M32 az egyik REV-N1 klauzulát buktatja, a másikat nem).
function falsificationEvidence(m, c, e, v) {
  const rec = (c.records || []).find((r) => r.probe_id === m.catcher);
  const failedAssertions = rec && Array.isArray(rec.assertions)
    ? rec.assertions.filter((a) => a && a.pass === false).map((a) => a.id)
    : [];
  return Object.freeze({
    mutation_id: m.id,
    catcher: m.catcher,
    applied: true,                       // ide csak alkalmazott szerkesztés után jutunk el
    base_digest: BASE_DIGEST,
    mutated_digest: e.digest,
    run_token: e.runToken,
    probe_id: m.catcher,
    probe_status: rec ? rec.status : null,
    failed_assertions: Object.freeze(failedAssertions),
    verdict: v.verdict,
    evidence_limit: m.evidence_limit || null,
  });
}

function baselineGate() {
  return withCopy((dir) => {
    const e = expectationFor(dir);
    const c = classifyRun(runIn(dir, e.runToken), e);
    if (c.kind === 'harness') return { ok: false, why: `az ALAPVONAL nem futott le: ${c.why}` };
    if (c.failed.length || c.threw.length) {
      return { ok: false, why: `az ALAPVONAL piros: ${[...c.failed, ...c.threw.map((r) => `${r.probe_id}(kivétel)`)].join(', ')}` };
    }
    // A REKORDOK ÉS AZ ALAP-LENYOMAT IS KELL: a norma-bizonyíték végleges minősítése a battéria
    // UTÁN ezekből születik (R55/F03/2 — a kapu tényleges eredményeket kapjon, ne definíciókat).
    return { ok: true, probes: c.records.map((r) => r.probe_id), records: c.records, digest: e.digest };
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
const POOL = Math.max(1, Number(process.env.V3REF_POOL) || Math.min(16, availableParallelism() * 4));
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
    const e = expectationFor(dir, m.id);
    const c = classifyRun(await runInAsync(dir, e.runToken), e);
    const v = verdictFor(m, c);
    return { ...m, ...v, falsification: falsificationEvidence(m, c, e, v) };
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
    const e = expectationFor(dir, m.id);
    const c = classifyRun(runIn(dir, e.runToken), e);
    const v = verdictFor(m, c);
    return { ...m, ...v, falsification: falsificationEvidence(m, c, e, v) };
  });
}

// ═══ RUN-02 — A FUTÁS SZERZŐDÉSE (R79 §6, a KÜLSŐ TÁRGYALÓ FÉL kérése) ══════════════════════════
//
// A LELET, AMI EZT KIKÉNYSZERÍTETTE — ÉS A SAJÁT FUTÁSOMON: az R79 három új próbájával a battéria
// faliórája 17 254 ms lett, a külső fél korlátja 15 000 ms. Eddig ilyenkor EGYETLEN válaszunk volt
// („HIÁNYOS"), ami ÖSSZEMOSTA a két teljesen különböző esetet:
//
//   · a battéria LEFUTOTT, és TALÁLT valamit (túlélő mutáció, rossz próba, elavult horgony)
//   · a battéria EL SEM JUTOTT a végéig (időkorlát)
//
// A kettő NEM ugyanaz a válasz, és az összemosásuk pontosan a KUKA-124/2 alakja: a HIÁNYNAK saját,
// nevezett válasza jár. Ráadásul az időtúllépés a RÉGI alakban a KÓD hibájának látszott, holott a
// mérésről szól. Ezért innentől HÁROM állapot van, KÜLÖN mezőkön:
//
//   run_state: 'complete'   + clean: true/false   — a battéria végigfutott, és tiszta/nem tiszta
//   run_state: 'incomplete' + clean: null         — NEM futott végig; `incomplete_reason` megmondja, miért
//
// A `clean: null` szándékos: az el nem végzett mérés SEM nem zöld, SEM nem piros — a hiányzó mérés
// nem zöld (KUKA-051), de hazugság lenne a kódra fogni (KUKA-049). A kilépési kód is HÁROM értékű:
// 0 = teljes és tiszta · 1 = teljes és NEM tiszta · 2 = NEM teljes. Így egy automatizált fogyasztó
// sem tudja véletlenül sikernek olvasni a félbemaradt futást.
//
// ── AZ EGYSÉG (`--unit=k/n`) ────────────────────────────────────────────────────────────────────
//
// A battéria DARABOLHATÓ: `--unit=k/n` a mutációk k-adik n-ed részét futtatja. Az egység
// MINDEN futásban lefuttatja a TELJES alapvonalat és MINDEN hazugság-ellenpróbát — ez nem
// takarékossági kérdés: az alapvonal nélkül egy egység eredménye értelmezhetetlen (a mutáció
// „elkapva" volta csak ahhoz képest jelent valamit, hogy MUTÁLATLANUL minden zöld volt). Az egység
// a saját részeredményét fájlba írja (`v3ref/units/`), és NEM állít semmit a battéria egészéről.
//
// ── AZ ÖSSZEFŰZÉS (`--merge`) ───────────────────────────────────────────────────────────────────
//
// Teljes összefoglalót KIZÁRÓLAG az összefűzés adhat, és CSAK akkor, ha mind a négy feltétel áll:
//   (1) minden mutáció PONTOSAN EGYSZER szerepel (se hiány, se duplikátum — R59/F02 szabálya a
//       külső futtató eset-manifesztjéről, most a SAJÁT futtatónkra fordítva)
//   (2) minden egység UGYANARRA a forrás-lenyomatra hivatkozik, és az a MA mért lenyomat
//   (3) minden egység `complete` (egyik sem lépte túl a saját költségvetését)
//   (4) minden egységben ZÖLD volt az alapvonal és mind a nyolc hazugság-ellenpróba
// Bármelyik hiánya ⇒ `run_state: 'incomplete'` NEVEZETT okkal — nem „majdnem kész".
// A KÜLSŐ KORLÁT ÉS A SAJÁT KÖLTSÉGVETÉS — a definíció ITT áll, mert az összefűzés is ehhez mér.
// A kapu a korlát ELŐTT áll, nem rajta: egy őr, ami pont akkor tüzel, amikor a baj bekövetkezik,
// nem őr. A 20% tartalék a LASSABB gépé. KIMONDOTT KORLÁT: ez a MI gépünkön mért idő.
const EXTERNAL_WALL_LIMIT_MS = 15000;
const WALL_BUDGET_MS = Math.round(EXTERNAL_WALL_LIMIT_MS * 0.8);
const UNIT_SIZE = 24;
const UNIT_ARG = process.argv.find((a) => a.startsWith('--unit='));
const MERGE_ONLY = process.argv.includes('--merge');
const UNITS_DIR = join(REF, 'units');
const UNIT = (() => {
  if (!UNIT_ARG) return null;
  const m = /^--unit=(\d+)\/(\d+)$/.exec(UNIT_ARG);
  if (!m) { console.error(`--unit alakja: k/n (kapott: ${UNIT_ARG})`); process.exit(2); }
  const k = Number(m[1]); const n = Number(m[2]);
  if (!(n >= 1 && k >= 1 && k <= n)) { console.error(`--unit=${k}/${n}: érvénytelen egység`); process.exit(2); }
  return { k, n };
})();
/** A felosztás DETERMINISZTIKUS és körbeforgó: az egységek költsége így hasonló marad. */
const sliceFor = (k, n) => MUTATIONS.filter((_, i) => i % n === k - 1);
const AUTO_UNITS = Math.max(1, Math.ceil(MUTATIONS.length / UNIT_SIZE));

// ── A DARABSZÁM SZÁRMAZTATVA, NEM KÉZZEL (`--units-auto`, R32/§B3) ──────────────────────────────
//
// MIÉRT SZÜLETETT. A söprés a `v3ref:mutate:units` úton futott, és az a parancs KÉZZEL BEÍRT HETES
// darabszámot hordozott (`--unit=1/7 … --unit=7/7`). A battéria közben 149 mutációra nőtt, és a mi
// 4 vCPU-s futtató-gépünkön a 2/7 szelet 12 406 ms-ot kért — a SAJÁT költségvetés (12 000 ms) fölött.
// Ettől a `verify:v3ref` PIROS lett, miközben a TARTALOM tiszta: tíz egységgel mérve 149/149 mutáció
// elkapva, 0 túlélő. Egy kézzel léptetett szám pontosan így hazudtat meg egy ép mérést, és arra
// tanít, hogy a pirosat át kell írni (KUKA-045).
//
// A SZABÁLY, AMI A SZÁM HELYÉRE LÉP: minden egység férjen bele a saját költségvetésébe. A darabszám
// ebből SZÁRMAZIK: az ajánlott értékről indulunk, és ha egy egység nem fér bele, FINOMABBRA
// osztunk — a KÖLTSÉGVETÉS SOHA nem tágul (KUKA-091: a javítás iránya nem az őr lazítása).
//
// ÉS A FINOMÍTÁS NEM LEHET NÉMA. A végtelen darabolás elfedne egy valódi lassulást, ezért: legfeljebb
// `AUTO_MAX_ATTEMPTS` próbálkozás, és ha a tool SAJÁT ajánlásánál finomabbra kellett menni, a futtató
// KIMONDJA. Ha a plafonon sem fér bele, a kilépés NEM 0 — a mérés akkor hiányos, nem zöld (KUKA-093).
if (process.argv.includes('--units-auto')) {
  const AUTO_MAX_ATTEMPTS = 4;
  const self = fileURLToPath(import.meta.url);
  const runNode = (args) => spawnSync(process.execPath, [self, ...args], { stdio: 'inherit' });
  let n = AUTO_UNITS; let attempt = 0; let lastTooSlow = null;
  for (;;) {
    attempt += 1;
    let tooSlow = null;
    for (let k = 1; k <= n; k += 1) {
      // A TANÚ FRISSESSÉGE A GYERMEK INDULÁSÁHOZ MÉRVE (UFK-02, R35/F35-01): egy KORÁBBI futás
      // egység-fájlja nem indokolhatja az ÚJ, sikertelen futás újradarabolását.
      const startedAt = Date.now();
      const r = runNode([`--unit=${k}/${n}`]);
      if (r.status !== 0) {
        // A NEM-NULLA kilépés KÉT dolgot jelenthet: tartalmi bukás vagy idő-túllépés. A kettőt a
        // MÉRT egység-fájl különbözteti meg — nem a kilépési kód (KUKA-049).
        let raw = null;
        try { raw = JSON.parse(readFileSync(join(UNITS_DIR, `unit-${k}-of-${n}.json`), 'utf8')); }
        catch { /* nincs egység-fájl: nem tudjuk, tehát nem mentegetünk */ }
        const w = freshUnitWitness(raw, { k, n, startedAt });
        const kind = w.ok ? unitFailureKind(w.unit) : 'unknown';
        if (kind === 'too_slow') { tooSlow = { k, n }; break; }
        if (kind === 'content') {
          console.error(`  AZ EGYSÉG ${k}/${n} TARTALMI OKBÓL bukott — a darabolás ezen nem segít.`);
        } else {
          // AZ ISMERETLEN NEM FINOMÍTHATÓ. Ha nem tudjuk, miért bukott, a darabolás vakon menne
          // tovább, és a mérés csendben zölddé minősülne (KUKA-093: a kihagyás nem zöld).
          console.error(`  AZ EGYSÉG ${k}/${n} nem nullával zárt, és az OKA NEM ÁLLAPÍTHATÓ MEG`
            + `${w.ok ? '' : ` — a tanú nem hitelesíthető: ${w.why}`}.`);
          console.error('  EZ NEM IDŐ-BUKÁS: darabolással nem kerüljük meg. A mérés HIÁNYOS.');
        }
        process.exit(r.status || 1);
      }
    }
    if (!tooSlow) break;
    lastTooSlow = tooSlow;
    if (attempt >= AUTO_MAX_ATTEMPTS) {
      console.error(`  A ${n} egységre osztott battéria ${AUTO_MAX_ATTEMPTS} próbálkozás után SEM fér bele a `
        + `${WALL_BUDGET_MS} ms-os egység-költségvetésbe (utoljára a ${lastTooSlow.k}/${lastTooSlow.n} szeleten).`);
      console.error('  EZ NEM ZÖLD ÉS NEM PIROS TARTALOM: a MÉRÉS hiányos — a futtató-gép lassabb, mint amire a '
        + 'darabolás méretezve van. A költségvetést nem tágítjuk; a teendő a gép vagy a battéria felülvizsgálata.');
      process.exit(1);
    }
    n *= 2;
    console.error(`  A ${lastTooSlow.k}/${lastTooSlow.n} szelet nem fért a költségvetésbe — FINOMABBRA osztok: ${n} egység.`);
  }
  if (n !== AUTO_UNITS) {
    console.log(`  MEGJEGYZÉS: a tool ajánlása ${AUTO_UNITS} egység volt, de ezen a gépen ${n} kellett `
      + '— a költségvetés változatlan, a darabolás finomabb.');
  }
  const m = runNode(['--merge']);
  process.exit(m.status === null ? 1 : m.status);
}

// ── AZ ÖSSZEFŰZÉS (`--merge`) — CSAK EZ ADHAT TELJES ÖSSZEFOGLALÓT ──────────────────────────────
if (MERGE_ONLY) {
  console.log('');
  console.log('V3 MAGREFERENCIA — MUTÁCIÓS PRÓBA · EGYSÉGEK ÖSSZEFŰZÉSE (RUN-02)');
  console.log('='.repeat(78));
  const today = digestOfBundle(REF.replace(/\/v3ref$/, ''));
  let files = [];
  try { files = readdirSync(UNITS_DIR).filter((f) => /^unit-\d+-of-\d+\.json$/.test(f)).sort(); } catch { files = []; }
  const units = [];
  const problems = [];
  for (const f of files) {
    try { units.push({ file: f, ...JSON.parse(readFileSync(join(UNITS_DIR, f), 'utf8')) }); }
    catch (e) { problems.push(`olvashatatlan egység-fájl: ${f} — ${e.message}`); }
  }
  // ── A BEADVÁNY-KAPU (MRG-01, R81/F01–F03) ────────────────────────────────────────────────────
  //
  // MI VÁLTOZOTT ÉS MIÉRT. A régi alak az egység SAJÁT ÖSSZEFOGLALÓIT vette mérésnek: a
  // lefedettséget a `mutation_ids`, a darabszámot a `counts`, a tisztaságot a `slice_clean`, a
  // kötelező klauzula-készletet pedig az EGYIK BEADOTT EGYSÉG mondta meg — a RÉSZLETES eredményhez
  // (`mutation_results`) egyik sem volt mérve, a `run_contract` mezőt senki nem olvasta el. A külső
  // fél a saját, VALÓDI egységeink másolatain négy alakban mutatta meg, mi következik ebből: üres
  // részletes eredmény · önellentmondó verdikt · kiürített kötelező készlet · idegen futási
  // szerződés — MIND `exit 0` · `complete` · `clean: true` lett.
  //
  // Innentől a mérce a MAI, RÖGZÍTETT forrás (`REQUIRED_EVIDENCE` · `contractRef()` ·
  // `indexDigest()`), az adat pedig a RÉSZLETES eredmény — a bejelentett összesítő ehhez MÉRVE
  // lesz, és az ELLENTMONDÁS maga a nevezett akadály (KUKA-121 az összefűzésen).
  const admission = admitUnits(units, {
    today,
    // A MAI REGISZTER EGÉSZE megy át, nem csak az azonosítói (R83/F01): a kapu innen tudja meg, mi
    // az EGYES mutációk szerződése (`probe_fail` · `runtime_error`) és ki a NEVEZETT elkapója —
    // enélkül a beadott `probe_status` csak önmagával lenne összevethető (KUKA-121).
    mutations: MUTATIONS,
    pinned: {
      required: { version: REQUIRED_EVIDENCE.version, clauses: REQUIRED_EVIDENCE.clauses, expected_state: 'covered' },
      contract: { version: contractRef().version, digest: contractRef().digest },
      index_digest: indexDigest(),
    },
  });
  problems.push(...admission.problems);
  const { missing, duplicated, unknown } = admission.coverage;
  const seen = admission.detailsById;
  // (2) AZONOS FORRÁS, ÉS AZ A MAI. Egy tegnapi egység nem fűzhető a maihoz — a futás-tanú
  //     leckéje a saját futtatónkon (KUKA-127: a hovatartozást elő kell ÁLLÍTANI, nem megfigyelni).
  const wrongDigest = units.filter((u) => u.base_digest !== today);
  if (wrongDigest.length) problems.push(`MÁS FORRÁSRA hivatkozó egység (${wrongDigest.map((u) => u.file).join(', ')}) — mai lenyomat: ${today}`);
  // (3) MINDEN EGYSÉG VÉGIGFUTOTT, és (4) mindegyikben zöld volt a két kapu.
  const incomplete = units.filter((u) => u.run_state !== 'complete');
  if (incomplete.length) problems.push(`NEM TELJES egység: ${incomplete.map((u) => `${u.file} (${(u.why || []).join('; ') || 'ok nélkül'})`).join(', ')}`);
  const gateBad = units.filter((u) => !u.base_gate_ok || !u.attacks_ok);
  if (gateBad.length) problems.push(`KAPU-hiba egységben: ${gateBad.map((u) => u.file).join(', ')}`);
  // (5) MINDEN EGYSÉG BIZONYÍTÉKA A SAJÁT SZÜLŐI FŐKÖNYVÉHEZ KÖTÖTT. Az egység ezt maga mérte
  //     (ott van a főkönyv); az összefűzés a KIMONDOTT eredményt kéri számon — a hiánya (régi,
  //     még mező nélküli egység-fájl) NEM „rendben", hanem külön válasz (KUKA-124/2). A beadott
  //     `true` MAGA viszont nem bizonyíték: a kapu a részletes eredmények alap-lenyomatát a MA
  //     mérthez hasonlítja, és az önmagának ellentmondó kötés-állítást is megfogja (MRG-01).
  const unbound = units.filter((u) => u.evidence_bound !== true);
  if (unbound.length) problems.push(`a bizonyíték NINCS a főkönyvhöz kötve: ${unbound.map((u) => `${u.file}${Array.isArray(u.evidence_unbound) && u.evidence_unbound.length ? ` (${u.evidence_unbound.join(', ')})` : ' (mező hiányzik)'}`).join(', ')}`);

  let complete = true;   // véglegesítve a lánc kiértékelése UTÁN (a `problems` még bővülhet)
  // A LÁNC UNIÓJA: egy klauzula-sor akkor FEDETT, ha BÁRMELYIK egység annak mérte. Az egységek a
  // SAJÁT szülői főkönyvükhöz mérték a bizonyítékot, tehát itt már kész verdikteket egyesítünk —
  // az összefűzés nem minősít újra semmit.
  //
  // A SOROK AZONOSSÁGA A RÖGZÍTETT SZERZŐDÉSHEZ MÉRVE (R83/F02). Az egyesítés önmagában csak azt
  // tudja, ami MEGÉRKEZETT — a külső fél épp ezt használta ki: minden egységből kivette UGYANAZT az
  // egy REV-N3a állítás-sort, és a lánc 48 sorral is „teljes" maradt, mert a hiányzó sor nem lesz
  // gyenge sorrá, hanem eltűnik. Innentől az ELVÁRT hármasokat (klauzula · állítás · próba) a mai
  // norma- és próba-szerződés adja, és a beadott lánc EHHEZ mérődik:
  //   · HIÁNYZÓ sor  → a lánc `row_missing` sort kap (a leggyengébb rang), és nevezett akadály;
  //   · IDEGEN sor   → nevezett akadály (a csere így nem fér el a darabszám mögé);
  //   · ISMÉTLŐDÉS   → EGY egységen belül hiba, TÖBB egység között JOGOS (mindegyik ugyanazt a
  //                    láncot számolja a saját szeletén — a darabolás következménye, nem hiba).
  const expectedRows = expectedChainRows(EXPECTED_PROBES);
  const expectedKeys = new Map(expectedRows.map((r) => [chainRowKey(r), r]));
  const rows = new Map();
  for (const u of units) {
    const inUnit = new Set();
    for (const c of (u.norm_chain || [])) {
      const key = chainRowKey(c);
      if (inUnit.has(key)) {
        problems.push(`ISMÉTLŐDŐ lánc-sor EGY egységen belül (${u.file}): ${c.clause_id} → ${c.assertion_id} @ ${c.probe_id}`);
      }
      inUnit.add(key);
      const prev = rows.get(key);
      // A LEGERŐSEBB SOR NYER — a KÖZÖS rangsorból (KUKA-129). A régi alak `covered`-et keresett
      // betűre, ezért egy ÚJ, erős állapot (`partially_covered`) sosem győzött volna: a sor sorsát
      // az EGYSÉGEK SORRENDJE döntötte volna el, nem a bizonyíték — mérés helyett műtermék.
      if (!prev || chainResultRank(c.result) > chainResultRank(prev.result)) rows.set(key, c);
    }
  }
  const foreignRows = [...rows.keys()].filter((k) => !expectedKeys.has(k));
  if (foreignRows.length) {
    problems.push(`IDEGEN lánc-sor — a mai szerződésben nincs ilyen (klauzula · állítás · próba) hármas `
      + `(${foreignRows.length}): ${foreignRows.slice(0, 5).join(' · ')}${foreignRows.length > 5 ? ' …' : ''}`);
  }
  const missingRows = [...expectedKeys.entries()].filter(([k]) => !rows.has(k));
  if (missingRows.length) {
    problems.push(`HIÁNYZÓ lánc-sor — a mai szerződés szerint kötelező, de egyetlen egység sem hozta `
      + `(${missingRows.length}): ${missingRows.slice(0, 5).map(([k]) => k).join(' · ')}${missingRows.length > 5 ? ' …' : ''}`);
  }
  // A HIÁNY A LÁNCBAN IS LÁTSZIK, nem csak a hibalistán: enélkül a klauzula-ítélet ugyanúgy a
  // megmaradt sorokból születne, és a hiányzó sor megint néma maradna (KUKA-012).
  for (const [key, want] of missingRows) {
    rows.set(key, {
      norm_id: want.norm_id, clause_id: want.clause_id, covers: [],
      assertion_id: want.assertion_id, probe_id: want.probe_id,
      mutation_candidates: [], falsified_by: null, evidence_limit: null, content_review: null,
      result: 'row_missing',
      why: 'a mai szerződés szerint kötelező lánc-sor, de EGYETLEN beadott egység sem hozta (MRG-01 · R83/F02)',
    });
  }
  // A FEDETTSÉG VISSZAVEZETVE A RÉSZLETES EREDMÉNYRE (MRG-01 · R81/F01b). Egy sor nem attól fedett,
  // hogy a beadvány így nevezi: a `falsified_by` mutációnak lennie kell a részletes eredmények
  // között, `CAUGHT` verdikttel, ugyanazon a próbán, a sor állítás-azonosítóját buktatva. A külső
  // fél épp ezt a kötést vágta el (minden verdikt `SURVIVED`, üres `failed_assertions` — a lánc
  // mégis 36 FEDETT sort mondott).
  const backing = chainBacking([...rows.values()], admission.detailsById);
  for (const x of backing.problems) problems.push(`FEDEZETLEN lánc-sor: ${x}`);
  const backedKeys = new Set(backing.backed.map((c) => `${c.clause_id}|${c.assertion_id}|${c.probe_id}`));
  // A FEDEZET-KÖVETELMÉNY A RÉSZLEGESRE IS ÁLL. Mindkét állapot azt állítja, hogy az állítást egy
  // mutáció MEGBUKTATTA — a kettő csak a KLAUZULA teljességében tér el. Ha csak a `covered`-et
  // mérnénk vissza, a `partially_covered` néma kiskaput nyitna ugyanazon a csatornán (KUKA-084: a
  // javítás a hibát KÖLTÖZTETNÉ).
  const claimsFalsification = new Set(['covered', 'partially_covered']);
  const chain = [...rows.values()].map((c) => (claimsFalsification.has(c.result) && !backedKeys.has(`${c.clause_id}|${c.assertion_id}|${c.probe_id}`)
    ? { ...c, result: 'not_falsified', why: 'a beadott FEDETT minősítés mögött nincs megfelelő részletes eredmény (MRG-01)' }
    : c));
  const covered = chain.filter((c) => c.result === 'covered');
  const allResults = admission.details;
  // AZ ÖSSZESÍTŐ A RÉSZLETESBŐL (MRG-01 · R81/F01a). A régi alak a beadott `counts` mezőket adta
  // össze — azokat a beadó gépelte be. Az `stale` az egyetlen, ami fogalmilag nem hordoz részletes
  // eredményt (az elavult horgony verdiktet ad, falszifikációt nem), ezért az marad bejelentett —
  // és a kapu külön méri, hogy a hiányt PONTOSAN ez magyarázza-e.
  const sum = (k) => (k === 'stale' ? units.reduce((a, u) => a + (u.counts?.stale || 0), 0) : (admission.counts[k] || 0));
  const worst = units.reduce((a, u) => Math.max(a, u.wall?.ms || 0), 0);
  const allPortable = units.every((u) => u.portable);
  // A KÖTELEZŐ KÉSZLET A MAI, RÖGZÍTETT SZERZŐDÉSBŐL (R81/F02). A régi alak az EGYIK BEADOTT
  // EGYSÉG `norm_required` mezőjét vette definíciónak — így aki kiürítette a listát, „teljesítette"
  // a készletet. A mérce nem jöhet attól, akit mérünk (KUKA-054): a lista, a verzió és az elvárt
  // állapot innentől a `REQUIRED_EVIDENCE`-ből jön, a beadott értéket a kapu ehhez méri. A
  // TELJESÜLÉST továbbra is az egyesített lánc dönti el — egy klauzulát falszifikálhat egy MÁSIK
  // egység mutációja.
  //
  // A KLAUZULA MÉRCÉJE: A LEGGYENGÉBB SOR DÖNT — UGYANÚGY, MINT A `checkNorms`-BAN (R81 — a SAJÁT
  // söprésem lelete, a külső fél adaptált R59-es programja hozta elő). Az R79-es alakom
  // `chain.some(... === 'covered')`-öt írt, tehát a LEGERŐSEBB sor döntött: ha egy klauzulának négy
  // állítás-sora volt és EGY fedett, az egész klauzula „teljesült". A kánon az ellenkezője — a
  // `checkNorms` kimondja: *„Egy klauzulának több sora is lehet; a leggyengébb dönt (ha bármelyik
  // szem szakad, nincs kész)."* Mérve: a REV-N3a kilenc sorából nyolc fedett volt, egy
  // (`A-REV-N3a-release-refusal-is-neutral-and-inert`) nem — a `checkNorms` HIÁNYT mondott, az
  // összefűzésem TELJESÜLÉST. Ugyanarra a kérdésre két szabály (KUKA-003 · KUKA-018), és a
  // permisszívebb épp a záró kapunál állt.
  const mergedRequired = (() => {
    const clauses = REQUIRED_EVIDENCE.clauses;
    const rowsOf = (id) => chain.filter((c) => c.clause_id === id);
    const weakest = (id) => {
      const rs = rowsOf(id);
      if (!rs.length) return 'no_row';
      return rs.reduce((w, c) => (chainResultRank(c.result) < chainResultRank(w) ? c.result : w), rs[0].result);
    };
    const satisfied = clauses.filter((id) => weakest(id) === 'covered');
    const missingReq = clauses.filter((id) => weakest(id) !== 'covered')
      .map((id) => ({ clause_id: id, result: weakest(id),
        rows: rowsOf(id).filter((c) => c.result !== 'covered').map((c) => `${c.assertion_id} @ ${c.probe_id}: ${c.result}`) }));
    return { version: REQUIRED_EVIDENCE.version, stage: 'measured', expected_state: 'covered',
      source: 'a MAI rögzített szerződés (REQUIRED_EVIDENCE), nem a beadvány',
      rule: 'klauzulánként a LEGGYENGÉBB állítás-sor dönt — azonos a `checkNorms` kánonjával; és a '
        + 'SOROK HALMAZA is a mai szerződésből jön (R83/F02), tehát a hiányzó sor `row_missing`-ként '
        + 'a leggyengébb rangot viszi, nem tűnik el a számításból',
      rows: { expected: expectedRows.length, seen: rows.size, foreign: foreignRows.length, missing: missingRows.length,
        source: 'ALL_NORMS × a manifest beváltás-deklarációi (expectedChainRows)' },
      clauses, satisfied, missing: missingReq, ok: missingReq.length === 0 };
  })();
  if (!mergedRequired.ok) {
    // A NEMLEGES VÁLASZ MONDJA MEG, MI A BAJ (KUKA-064): a klauzula neve mellé az ÁLLAPOTA is kell —
    // a `row_missing` (a sor meg sem érkezett) MÁS teendő, mint a `falsification_pending` (megvan,
    // de nincs mögötte falszifikáció). A kettő összemosása épp az R83/F02 leletét rejtené el.
    problems.push(`hiányzó kötelező bizonyíték (${mergedRequired.missing.map((m) => `${m.clause_id}: ${m.result}`).join(', ')})`);
  }
  // A TISZTASÁG IS MÉRT ADAT: az egység `slice_clean` mezője ÁLLÍTÁS, a kapu pedig a részletes
  // eredményből számolta vissza — ha a kettő ütközik, az már fent nevezett akadály lett.
  const cleanAll = admission.units.every((u) => u.admitted && u.clean)
    && units.every((u) => u.norm_integrity_ok !== false)
    && mergedRequired.ok;

  complete = problems.filter((x) => !x.startsWith('hiányzó kötelező bizonyíték')).length === 0;
  console.log(`  egységek: ${units.length} (${units.map((u) => `${u.unit?.k}/${u.unit?.n}`).join(', ')})`);
  console.log(`  beadvány-kapu (MRG-01): ${admission.ok ? 'BEFOGADVA' : `${admission.problems.length} akadály`}`
    + ` · támogatott futási szerződés: ${SUPPORTED_RUN_CONTRACTS.join(' · ')}`);
  console.log(`  lefedettség a RÉSZLETES eredményből: ${seen.size}/${MUTATIONS.length} mutáció · hiány=${missing.length} · duplikátum=${duplicated.length}`);
  console.log(`  kötelező készlet FORRÁSA: ${mergedRequired.source} (${mergedRequired.version}, ${mergedRequired.clauses.length} klauzula)`);
  console.log(`  forrás-lenyomat (ma mérve): ${today}`);
  console.log(`  legrosszabb egység falióra: ${worst} ms · külső korlát: ${EXTERNAL_WALL_LIMIT_MS} ms · minden egység belefér: ${allPortable ? 'igen' : 'NEM'}`);
  console.log(`  ${sum('measured')} mutáció · ${sum('caught')} elkapva · ${sum('survived')} túlélte · ${sum('wrong')} rossz próba · ${sum('harness')} mérőhiba · ${sum('stale')} elavult horgony`);
  console.log(`  norma-lánc: ${covered.length}/${chain.length} klauzula-sor FEDETT (az egységek uniója)`
    + ` · elvárt sorok a mai szerződésből: ${expectedRows.length} · hiányzó: ${missingRows.length} · idegen: ${foreignRows.length}`);
  for (const x of problems) console.log(`  ÖSSZEFŰZÉSI AKADÁLY: ${x}`);
  console.log(`RESULT: ${complete
    ? (cleanAll ? (allPortable ? 'TELJES ÉS TISZTA — minden mutáció pontosan egyszer, minden egység belefér a korlátba'
      : 'TELJES ÉS TISZTA, DE VAN KORLÁTON KÍVÜLI EGYSÉG — több egységre kell bontani')
      : 'TELJES, DE NEM TISZTA')
    : 'NEM TELJES — a fenti akadályok miatt az összefűzés nem ad teljes összefoglalót'}`);
  // KIMONDOTT KORLÁT (KUKA-121 · a R71 §4 tanulsága a saját futtatónkon): az egység-fájl NEM
  // kriptográfiailag kötött az őt előállító folyamathoz. Aki a fájlrendszerhez hozzáfér, KÉZZEL is
  // írhat egység-fájlt. A forrás-lenyomat egyezése szűkít, de nem bizonyít; a zárás feltétele
  // nevezett (aláírt egység-tanú), és amíg nincs, ez a sor kimondja, hol tartunk.
  const evidenceLimit = 'az egység-fájl nincs kriptográfiailag a futásához kötve — kézzel írt '
    + 'egység-fájl is beolvadna; a forrás-lenyomat egyezése szűkít, de nem bizonyít (nevezett függő: aláírt egység-tanú)';
  console.log(`  KIMONDOTT KORLÁT: ${evidenceLimit}`);
  try {
    const outPath = join(REF, 'v3ref-mutation-result.json');
    writeFileSync(outPath, `${JSON.stringify({
      at: new Date().toISOString(),
      node: process.version,
      base_digest: today,
      clean: complete ? cleanAll : null,
      why: problems,
      wall_ms: units.reduce((a, u) => a + (u.wall?.ms || 0), 0),
      run_contract: 'RUN-02',
      run_state: complete ? 'complete' : 'incomplete',
      execution: 'merged_units',
      units: units.map((u) => ({ unit: u.unit, file: u.file, wall_ms: u.wall?.ms ?? null, portable: u.portable,
        run_state: u.run_state, slice_clean: u.slice_clean, mutation_ids: u.mutation_ids })),
      coverage: { expected: MUTATIONS.length, seen: seen.size, missing, duplicated, unknown,
        measured_from: 'a RÉSZLETES eredmények (mutation_results), NEM a beadott mutation_ids lista (MRG-01)' },
      admission: { contract: 'MRG-01', ok: admission.ok, supported_run_contracts: [...SUPPORTED_RUN_CONTRACTS],
        problems: admission.problems, units: admission.units.map((u) => ({ file: u.file, admitted: u.admitted, clean: u.clean ?? null })) },
      evidence_bound: admission.ok && units.length > 0 && units.every((u) => u.evidence_bound === true),
      portable: allPortable,
      portable_remedy: allPortable ? null : 'növeld az egységek számát (--unit=k/n)',
      wall_detail: { worst_unit_ms: worst, budget_ms: WALL_BUDGET_MS, external_cap_ms: EXTERNAL_WALL_LIMIT_MS, within_budget: allPortable },
      evidence_limit: evidenceLimit,
      mutations: { total: MUTATIONS.length, measured: sum('measured'), caught: sum('caught'),
        survived: sum('survived'), wrong: sum('wrong'), harness: sum('harness'), stale: sum('stale') },
      lie_probes: { total: ATTACKS.length, defended: units.every((u) => u.attacks_ok) ? ATTACKS.length : null },
      norm_evidence: complete ? {
        contract: units[0]?.norm_contract ?? null,
        index_digest: units[0]?.norm_index_digest ?? null,
        required: mergedRequired,
        integrity_ok: units.every((u) => u.norm_integrity_ok),
        integrity_problems: units.flatMap((u) => u.norm_integrity_problems || []),
        chain,
      } : null,
      mutation_results: allResults,
    }, null, 2)}\n`);
    console.log(`  gépi végeredmény: ${outPath}`);
  } catch (e) {
    console.log(`  gépi végeredmény NEM íródott ki: ${e.message}`);
  }
  process.exit(complete ? (cleanAll && allPortable ? 0 : 1) : 2);
}

// ── Futtatás ─────────────────────────────────────────────────────────────────────────────────────
console.log('');
const WALL_T0 = Date.now();
console.log('V3 MAGREFERENCIA — MUTÁCIÓS PRÓBA (G6)');
console.log('='.repeat(78));
if (UNIT) console.log(`  EGYSÉG: ${UNIT.k}/${UNIT.n} — a mutációk ${Math.ceil(MUTATIONS.length / UNIT.n)} darabos szelete (RUN-02)`);

const base = baselineGate();
// AZ ALAP FORRÁS LENYOMATA — ehhez méri a norma-kapu, hogy a mutált csomag TÉNYLEG más (R55/F03).
BASE_DIGEST = base.digest || digestOfBundle(REF.replace(/\/v3ref$/, '')) || null;
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

const SLICE = UNIT ? sliceFor(UNIT.k, UNIT.n) : MUTATIONS;
let results = [];
if (base.ok && attacksOk) {
  results = await pool(SLICE, POOL, (m) => runMutationAsync(m, base.probes));
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
console.log(`  ${SLICE.length}${UNIT ? `/${MUTATIONS.length}` : ''} mutáció · ${caught} elkapva (ebből ${weak} korlátozott erejű)`
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

// ── A NORMA-BIZONYÍTÉK VÉGLEGES MINŐSÍTÉSE (R55/F03/2) ──────────────────────────────────────────
//
// A magpróba a battéria ELŐTT fut, tehát ott a falszifikáció fogalmilag nem eldönthető: a
// klauzulák `falsification_pending` állapotúak. A VÉGLEGES minősítés ITT születik, a TÉNYLEGES
// mutációs futások eredményéből — nem a definícióikból (a külső fél N01 esete).
let normFinal = null;
// A BIZONYÍTÉK KÖTÉSE KÜLÖN KÉRDÉS A LEFEDETTSÉGTŐL — ÉS EZT A SAJÁT R79-ES PRÓBÁM MUTATTA MEG.
//
// A RUN-02 egység-módban kivettem a KÖTELEZŐ KÉSZLET feltételét a `sliceClean`-ből (joggal: az
// globális — egy klauzulát falszifikálhat egy MÁSIK egység mutációja). Csakhogy eddig ÉPP EZ a
// feltétel fogta meg a HAMISÍTOTT bizonyítékot is: idegen lenyomatú csomagnál minden klauzula
// `not_falsified` lesz, és a kapu emiatt tüzelt. Az egység-módban tehát a hamisítás ÁTMENT —
// a kaput ÁTHELYEZTEM, és azt hittem, lezártam (KUKA-084, a saját változtatásomon).
//
// Megtalálta: a SAJÁT, ugyanebben a körben írt r79-es próbám (U01). A javítás nem a régi kapu
// visszatétele, hanem a KÉT KÉRDÉS SZÉTVÁLASZTÁSA (KUKA-124/1 — más kérdés, más név):
//   `required.ok`     — FEDVE VAN-E a kötelező készlet? (globális, az összefűzés dönti el)
//   `evidence_bound`  — a SAJÁT csomagom a SAJÁT szülői főkönyvemhez van-e kötve? (szelet-helyi)
// A második csak hamisításra bukik, a első legitim okból is — ezért nem helyettesítik egymást.
let evidenceBound = true;
let evidenceUnbound = [];
if (base.ok && attacksOk && results.length === SLICE.length) {
  const mutationResults = results.map((r) => r.falsification).filter(Boolean);
  // AZ ELVÁRT ÉRTÉKEK A SZÜLŐ MEGBÍZHATÓ KÖRNYEZETÉBŐL (R57/F02). Ezeket EZ a futtató mérte és
  // osztotta ki — a bizonyíték-csomag nem adhatja meg őket saját magának. Innentől az idegen vagy
  // elavult csomag nem tud `covered`-et előállítani, akkor sem, ha minden mezője ki van töltve.
  // AZ ELVÁRÁS A SZÜLŐI FŐKÖNYVBŐL ÉPÜL, NEM A CSOMAGOKBÓL (R59/F01, a külső fél §2 utolsó pontja).
  // A régi alak a `r.falsification.run_token` / `.mutated_digest` mezőkből építette — vagyis abból az
  // adatból, amit ellenőrizni kellett volna: a végső kapu önmagához mért. A `PARENT_EXPECTATIONS`
  // a KELETKEZÉSKOR (az `expectationFor` hívásakor) rögzíti, mit állított elő a szülő; a csomag ehhez
  // méretik. Ami nincs a főkönyvben, arra nincs elvárás — tehát nem lehet `covered`.
  const withEvidence = results.filter((r) => r.falsification && PARENT_EXPECTATIONS.has(r.id));
  const expectation = {
    base_digest: BASE_DIGEST,
    // A FUTÁS-JEL MUTÁCIÓNKÉNT SZÜLETIK (`expectationFor` → `rt_<uuid>`), tehát az elvárás is
    // mutációnként tartja — ez szigorúbb, mint egy közös token: egy MÁSIK mutáció jele sem megy át.
    run_tokens: Object.fromEntries(withEvidence.map((r) => [r.id, PARENT_EXPECTATIONS.get(r.id).runToken])),
    mutated_digests: Object.fromEntries(withEvidence.map((r) => [r.id, PARENT_EXPECTATIONS.get(r.id).digest])),
  };
  // A KÖTÉS AZON MÉRVE, AMIT A KAPU KAPOTT (R57/F02 · R59/F01). Nem a `results`-on: a hamisítás a
  // `checkNorms`-nak ÁTADOTT csomagon történik, tehát a mérésnek is ott kell állnia (KUKA-024: a
  // VISZONYT kell mérni, nem az oldalakat).
  evidenceUnbound = mutationResults.filter((x) => {
    const exp = PARENT_EXPECTATIONS.get(x.mutation_id);
    return !exp || x.base_digest !== BASE_DIGEST || x.run_token !== exp.runToken
      || x.mutated_digest !== exp.digest;
  }).map((x) => x.mutation_id);
  evidenceBound = evidenceUnbound.length === 0;
  normFinal = checkNorms({
    probes: EXPECTED_PROBES, mutations: MUTATIONS, records: base.records, mutationResults, expectation,
  });
  const cov = normFinal.chain.filter((c) => c.result === 'covered');
  const notFals = normFinal.chain.filter((c) => c.result === 'not_falsified');
  console.log('');
  console.log('  NORMA-BIZONYÍTÉK — VÉGLEGES MINŐSÍTÉS (a tényleges mutációs eredményekből)');
  console.log(`    szerződés ${normFinal.contract.version} · ${normFinal.contract.digest}`);
  console.log(`    index ${normFinal.index_digest}`);
  console.log(`    ${cov.length}/${normFinal.chain.length} klauzula-sor FEDETT · ${notFals.length} állítás teljesült, de NEM falszifikált`);
  for (const c of cov) {
    console.log(`    FEDVE  ${c.clause_id} → ${c.assertion_id} @ ${c.probe_id} · falszifikálta: ${c.falsified_by}`
      + (c.evidence_limit ? '  ⚠ korlátozott erejű' : ''));
  }
  for (const c of notFals) console.log(`    NEM FALSZIFIKÁLT  ${c.clause_id} → ${c.why.slice(0, 150)}`);
  if (!normFinal.integrity_ok) {
    console.log('    A REGISZTER SZERKEZETI HIBÁI:');
    for (const x of normFinal.integrity_problems) console.log(`      · ${x}`);
  }
  // A KÖTELEZŐ KÉSZLET KIMONDVA (R57/F01). A külső fél E02 esete pontosan az volt, hogy a napló már
  // kimondta a hiányt, a kilépési kód mégis sikert jelentett. Innentől ez a blokk beszél, és a
  // `clean` hallgat rá.
  const req = normFinal.required;
  console.log(`    KÖTELEZŐ BIZONYÍTÉK (${req.version}, ${req.stage}): `
    + `${req.satisfied.length}/${req.clauses.length} teljesül — elvárt állapot: ${req.expected_state}`);
  for (const m of req.missing) console.log(`      HIÁNYZIK  ${m.clause_id} → ${m.result}`);
  // A KÖVETKEZŐ CSOMAG IS LÁTSZIK (R59 §5.1). Amit nem jelenítünk meg, az nincs (KUKA-011): egy
  // előre leszögezett vállalás, amit senki nem olvas, nem vállalás. A sorrend is itt áll, mert a
  // kockázat-lista MENETREND, nem emlékeztető (KUKA-077).
  console.log(`    KÖVETKEZŐ KÖTELEZŐ CSOMAG (${NEXT_REQUIRED_EVIDENCE.version}, `
    + `vállalva: ${NEXT_REQUIRED_EVIDENCE.committed_in}): ${NEXT_REQUIRED_EVIDENCE.clauses.join(' · ')}`);
  for (const s of NEXT_REQUIRED_EVIDENCE.order) {
    console.log(`      ${s.n}. ${s.what}  [${s.clauses.join(' · ')}]`);
  }
} else {
  console.log('');
  console.log('  NORMA-BIZONYÍTÉK: a végleges minősítés NEM készült el (a battéria nem futott végig).');
  console.log('  A hiányzó mérés nem zöld (KUKA-051).');
}
const sliceClean = base.ok && attacksOk && results.length === SLICE.length
  && survived === 0 && wrong === 0 && harness === 0 && stale === 0
  // A NORMA-KAPU SZERKEZETI ÉPSÉGE a zöld feltétele: a hazug regiszter nem enyhébb eset.
  && !!normFinal && normFinal.integrity_ok
  // ÉS A KÖTELEZŐ BIZONYÍTÉK IS (R57/F01). Enélkül a futás sikert jelentett arról, amit a saját
  // naplója már hibásnak nevezett — és egy automatizált következő lépés a sikert hitte volna el.
  //
  // EGYSÉG-MÓDBAN EZ A FELTÉTEL NEM ÉRTELMES, ÉS EZT KI KELL MONDANI (RUN-02): a kötelező készlet
  // GLOBÁLIS tulajdonság — egy klauzulát falszifikálhat egy MÁSIK egység mutációja. Ha az egység
  // ezt magára kérné számon, MINDIG pirosat adna, és a piros semmit nem jelentene (KUKA-049: az őr
  // ne a kért eredményt jelentse hibának). A készletet ezért az ÖSSZEFŰZÉS dönti el, az UNIÓBÓL.
  && (UNIT ? true : (!!normFinal.required && normFinal.required.ok))
  // …ÉS A SAJÁT CSOMAG KÖTÉSE, MINDKÉT MÓDBAN. Ez az, ami egység-módban is megfogja a hamisítást.
  && evidenceBound;
// ── RUN-02: A HÁROM KÜLÖN MEZŐ (R79 §6) ─────────────────────────────────────────────────────────
//
// `run_state` — VÉGIGFUTOTT-E. A tervezett szelet minden mutációja adott verdiktet, és a két kapu
//               (alapvonal · hazugság-ellenpróbák) zöld volt. Ha nem, `clean` NEM értelmezhető.
// `clean`      — TISZTA-E. Nulla túlélő · nulla rossz próba · nulla mérőhiba · nulla elavult
//               horgony, ép norma-regiszter, teljes kötelező készlet. EZ A KÓDRÓL SZÓL.
// `portable`   — BELEFÉR-E EGY HÍVÁSBA. A külső fél 15 000 ms-os korlátja alá fér-e ez az
//               invokáció ezen a gépen. EZ A MÉRÉSRŐL SZÓL, NEM A KÓDRÓL — és ezért külön mező:
//               a régi alak a faliórát a `clean`-be olvasztotta, tehát egy lassú gép a KÓDOT
//               mondta hibásnak (KUKA-002 · KUKA-124/2).
const runComplete = base.ok && attacksOk && results.length === SLICE.length;
const clean = runComplete && sliceClean;
const portable = wallOk;
const why = [];
if (!base.ok) why.push('az alapvonal-kapu piros');
if (!attacksOk) why.push('hazugság-ellenpróba bukott');
if (runComplete && normFinal && !normFinal.integrity_ok) why.push('a norma-regiszter szerkezeti hibát jelez');
if (runComplete && normFinal && normFinal.required && !normFinal.required.ok && !UNIT) {
  why.push(`hiányzó kötelező bizonyíték (${normFinal.required.missing.map((m) => m.clause_id).join(', ')})`);
}
if (survived || wrong || harness || stale) why.push('a mutációs battéria nem tiszta');
if (!evidenceBound) why.push(`a bizonyíték-csomag NINCS a szülői főkönyvhöz kötve (${evidenceUnbound.join(', ')})`);
const portableWhy = portable ? null
  : `a falióra (${wall} ms) a saját költségvetés (${WALL_BUDGET_MS} ms) fölé ment — `
    + `darabold: ${AUTO_UNITS > 1 ? Array.from({ length: AUTO_UNITS }, (_, i) => `--unit=${i + 1}/${AUTO_UNITS}`).join(' · ') : '--unit=1/2 · --unit=2/2'} · --merge`;

// ── EGYSÉG-MÓD: a részeredmény fájlba megy, és SEMMIT nem állít a battéria egészéről ─────────────
if (UNIT) {
  const unitFile = join(UNITS_DIR, `unit-${UNIT.k}-of-${UNIT.n}.json`);
  try {
    mkdirSync(UNITS_DIR, { recursive: true });
    // MÁS FELOSZTÁSBÓL SZÁRMAZÓ EGYSÉG-FÁJL NEM EZ A FUTÁS (a SAJÁT söprésem lelete, R81).
    //
    // A fájlnév a felosztást hordozza (`unit-k-of-n.json`), tehát az `n` megváltoztatása után a RÉGI
    // készlet OTT MARAD, és az összefűzés MINDKETTŐT beolvassa: mérve 192 „mutáció" 96 helyett, 96
    // duplikátummal. Az összefűzés kapuja ezt helyesen elkapta — de a helyes válasz nem az, hogy a
    // felhasználó takarítson: a MÁS `n`-ű fájl fogalmilag egy MÁSIK futás része, tehát ennek a
    // futásnak a megkezdésekor megy (KUKA-127: a hovatartozást elő kell ÁLLÍTANI, nem megfigyelni;
    // KUKA-064: a nemleges válasz ne legyen zsákutca — itt még jobb, ha a helyzet meg sem születik).
    const foreign = (() => {
      try {
        return readdirSync(UNITS_DIR)
          .filter((f) => /^unit-\d+-of-(\d+)\.json$/.test(f))
          .filter((f) => Number(/^unit-\d+-of-(\d+)\.json$/.exec(f)[1]) !== UNIT.n);
      } catch { return []; }
    })();
    for (const f of foreign) rmSync(join(UNITS_DIR, f), { force: true });
    if (foreign.length) {
      console.log(`  MÁS FELOSZTÁSÚ egység-fájl eltávolítva (${foreign.length}): ${foreign.join(', ')}`
        + ` — ezek nem ehhez a(z) ${UNIT.n} részes futáshoz tartoznak`);
    }
    writeFileSync(unitFile, `${JSON.stringify({
      run_contract: 'RUN-02',
      unit: { k: UNIT.k, n: UNIT.n },
      at: new Date().toISOString(),
      node: process.version,
      base_digest: BASE_DIGEST,
      base_gate_ok: base.ok,
      attacks_ok: attacksOk,
      run_state: runComplete ? 'complete' : 'incomplete',
      slice_clean: clean,
      portable,
      wall: { ms: wall, budget_ms: WALL_BUDGET_MS, external_cap_ms: EXTERNAL_WALL_LIMIT_MS },
      mutation_ids: SLICE.map((m) => m.id),
      counts: { measured: results.length, caught, survived, wrong, harness, stale, weak },
      // A NORMA-LÁNC A SAJÁT SZELETRE, A SAJÁT SZÜLŐI FŐKÖNYVÉHEZ MÉRVE (R57/F02 · R59/F01). Az
      // egység a saját gyerek-futásait maga indította, tehát az elvárást JOGGAL ő tartja; az
      // összefűzés már csak a KÉSZ verdikteket egyesíti, bizonyítékot nem minősít újra.
      norm_chain: normFinal ? normFinal.chain : null,
      evidence_bound: evidenceBound,
      evidence_unbound: evidenceUnbound,
      norm_required: normFinal ? normFinal.required : null,
      norm_integrity_ok: normFinal ? normFinal.integrity_ok : null,
      norm_integrity_problems: normFinal ? normFinal.integrity_problems : null,
      norm_contract: normFinal ? normFinal.contract : null,
      norm_index_digest: normFinal ? normFinal.index_digest : null,
      mutation_results: results.map((r) => r.falsification).filter(Boolean),
      why,
    }, null, 2)}\n`);
    console.log(`  egység-eredmény: ${unitFile}`);
  } catch (e) {
    console.log(`  egység-eredmény NEM íródott ki: ${e.message}`);
    process.exit(2);
  }
  console.log(`RESULT (EGYSÉG ${UNIT.k}/${UNIT.n}): ${runComplete ? (clean ? 'a szelet TISZTA' : `a szelet NEM tiszta — ${why.join(' · ')}`) : `NEM FUTOTT VÉGIG — ${why.join(' · ') || 'ismeretlen ok'}`}`
    + ` · belefér a korlátba: ${portable ? 'igen' : 'NEM'}`);
  if (!portable) console.log(`  ${portableWhy}`);
  console.log('  AZ EGYSÉG NEM TELJES ÖSSZEFOGLALÓ. Teljeset csak a `--merge` adhat (RUN-02).');
  process.exit(runComplete ? (clean && portable ? 0 : 1) : 2);
}

console.log(`RESULT: ${runComplete
  ? (clean ? (portable ? 'MINDEN VESZÉLYES MUTÁCIÓ A NEVEZETT ÁLLÍTÁSSAL ÉSZLELT'
    : 'TISZTA, DE EGY HÍVÁSBA NEM FÉR BELE — daraboló futás kell (RUN-02)')
    : `NEM TISZTA — ${why.join(' · ') || 'lásd a fenti sorokat'}`)
  : `NEM FUTOTT VÉGIG — ${why.join(' · ') || 'lásd a fenti sorokat'}`}`);
if (!portable) console.log(`  ${portableWhy}`);

// GÉPPEL OLVASHATÓ VÉGEREDMÉNY (R57 §7 — „a teljes lánc géppel olvasható végeredményét is adjátok
// át; a terminál három FEDVE sora kevés a későbbi újraellenőrzéshez"). A fájl a futás mellé kerül,
// és a KÜLSŐ FÉL ebből dolgozik, nem a képernyő-kivonatból (KUKA-072: a terv nem üzenet, hanem fájl).
//
// A MEZŐK VISSZAFELÉ KOMPATIBILISEK (R59 eredeti alakja megmarad): a `clean`, `why`, `wall_ms`,
// `mutations`, `lie_probes`, `norm_evidence`, `mutation_results` mind a régi helyén és jelentésében
// áll. Az R79 §6 mezői HOZZÁJÖNNEK, nem lépnek a helyükbe (KUKA-013: az új író nem teheti vissza a
// régi hibát — itt fordítva: az új mező nem veheti el a régi olvasó bemenetét).
try {
  const outPath = join(REF, 'v3ref-mutation-result.json');
  writeFileSync(outPath, `${JSON.stringify({
    at: new Date().toISOString(),
    node: process.version,
    base_digest: BASE_DIGEST,
    clean,
    why,
    wall_ms: wall,
    run_contract: 'RUN-02',
    run_state: runComplete ? 'complete' : 'incomplete',
    execution: 'single_invocation',
    portable,
    portable_remedy: portableWhy,
    wall_detail: { ms: wall, budget_ms: WALL_BUDGET_MS, external_cap_ms: EXTERNAL_WALL_LIMIT_MS, within_budget: portable },
    mutations: { total: MUTATIONS.length, measured: SLICE.length, caught: results.length - survived - wrong - harness - stale, survived, wrong, harness, stale },
    lie_probes: { total: ATTACKS.length, defended: attacksOk ? ATTACKS.length : null },
    norm_evidence: normFinal ? {
      contract: normFinal.contract,
      index_digest: normFinal.index_digest,
      falsification_stage: normFinal.falsification_stage,
      required: normFinal.required,
      integrity_ok: normFinal.integrity_ok,
      integrity_problems: normFinal.integrity_problems,
      evidence_problems: normFinal.evidence_problems,
      chain: normFinal.chain,
    } : null,
    mutation_results: results.map((r) => r.falsification).filter(Boolean),
  }, null, 2)}\n`);
  console.log(`  gépi végeredmény: ${outPath}`);
} catch (e) {
  console.log(`  gépi végeredmény NEM íródott ki: ${e.message}`);
}

process.exit(runComplete ? (clean && portable ? 0 : 1) : 2);
