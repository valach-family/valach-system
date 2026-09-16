#!/usr/bin/env node
/** SWV-01 GÉPI JELE — A SÖPRÉS VERDIKT-SZERZŐDÉSE (OB-10 · R16 §2).
 *
 * MIT MÉR, ÉS MIÉRT ÍGY.
 *   SWV01  a NÉGY állapot szétválik, és a döntést a KÖZÖS feloldó hozza (nem részszöveg)
 *   SWV02  A LELET MAGA: `exit 1` + `FAIL` + BEÁGYAZOTT „ENV-KIHAGYÁS" ⇒ PIROS, nem kihagyás
 *   SWV03  POZITÍV ELLENPÁR: a szabályosan DEKLARÁLT kihagyás továbbra is kihagyás (KUKA-122 —
 *          a kapu legyen teljesíthető, különben nem kapu, hanem fal)
 *   SWV04  a HIÁNY és az ELLENTMONDÁS külön, nevezett válasz (KUKA-124/2)
 *   SWV05  VALÓDI ALFOLYAMAT-PRÓBA: szintetikus gyermek-ellenőrzők tényleges futtatása, a söprés
 *          saját hívási alakjával — a tiszta függvény zöldje nem bizonyítja a bekötést (KUKA-024)
 *   SWV06  a SÖPRÉS a közös feloldót HÍVJA, és a régi, részszöveges alak nem jött vissza
 *
 * MIÉRT SZINTETIKUS GYERMEK. A pozitív ellenpárhoz nem kell megvárni egy VALÓDI környezet-hiányt:
 * a szerződés tárgya a DEKLARÁCIÓ alakja, nem az akadály valódisága. Ez a különbség engedi, hogy a
 * szigorítás ELLENPÁRRAL szülessen — enélkül a szabály jogos futásokat zárhatna ki (KUKA-049).
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { sweepVerdict, declaredVerdict, SWEEP_VERDICTS, VERDICT_MARKER } from './lib/vs_sweep_verdict.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const say = (id, ok, msg) => { if (!ok) problems.push(`${id}: ${msg}`); };
const V = (exitCode, stdout, timedOut = false) => sweepVerdict({ exitCode, stdout, timedOut }).verdict;

// ── SWV01 — A NÉGY ÁLLAPOT SZÉTVÁLIK ────────────────────────────────────────────────────────────
say('SWV01', SWEEP_VERDICTS.length === 4 && SWEEP_VERDICTS.join(',') === 'green,env_skipped,failed,unfinished',
  `a verdikt-készlet nem a négy deklarált állapot: ${SWEEP_VERDICTS.join(',')}`);
say('SWV01', V(0, 'minden rendben\nRESULT: 12/12 PASS') === 'green', 'a nullával zárt futás nem zöld');
say('SWV01', V(1, 'akármi', true) === 'unfinished', 'a türelem-túllépés nem „nem fejeződött be"');
say('SWV01', V(1, 'RESULT: 3/4 PASS — 1 FAIL') === 'failed', 'a bukott futás nem piros');

// ── SWV02 — A LELET MAGA (a külső fél izolált ellenpárja) ───────────────────────────────────────
//
// „Sikertelen gyermek kimenetében egy ENV-KIHAGYÁS szó nem bizonyítja, hogy az egész verifier
// kihagyható." Ez a sor a RÉGI alakon bizonyítottan ZÖLDET adott volna.
const LEAKY = [
  'a lánc lefutott\nENV-KIHAGYÁS: r59 — ez a program EBBEN A KÖRNYEZETBEN nem futtatható végig\nRESULT: 13/18 · 3 ELTÉRÉS',
  'ENV-KIHAGYÁS\nFAIL [X] valami elromlott',
  'DATABASE_URL is not set — de közben:\nFAIL: 4 eset',
  'db_not_configured\nRESULT: 1/2 PASS — 1 FAIL',
];
for (const out of LEAKY) {
  say('SWV02', V(1, out) === 'failed',
    `BEÁGYAZOTT kihagyás-szó átbillentette a verdiktet: ${JSON.stringify(out.slice(0, 48))}`);
}

// ── SWV03 — POZITÍV ELLENPÁR: a szabályos deklaráció ÉRVÉNYES ──────────────────────────────────
const DECLARED = `valamit csináltam\nnem megy\n${VERDICT_MARKER} env_skipped reason=nincs DATABASE_URL ebben a környezetben`;
say('SWV03', V(1, DECLARED) === 'env_skipped', 'a szabályosan deklarált kihagyás NEM kihagyás lett — a kapu fal, nem kapu');
say('SWV03', sweepVerdict({ exitCode: 1, stdout: DECLARED }).reason === 'nincs DATABASE_URL ebben a környezetben',
  'a deklarált INDOK nem jut el a jelentésig — a néma kihagyás ugyanaz a hiba, mint a néma zöld');
say('SWV03', declaredVerdict(DECLARED).kind === 'env_skipped', 'a deklaráció-olvasó nem ismeri fel a szabályos alakot');

// ── SWV04 — A HIÁNY ÉS AZ ELLENTMONDÁS KÜLÖN, NEVEZETT VÁLASZ ──────────────────────────────────
say('SWV04', declaredVerdict('semmi ilyen nincs') === null, 'a hiányzó deklaráció nem „nincs", hanem valami más');
const MALFORMED = `${VERDICT_MARKER} env_skipped`;           // indok nélkül
say('SWV04', V(1, MALFORMED) === 'failed', 'a HIBÁS ALAKÚ deklaráció kihagyásnak minősült');
say('SWV04', /HIBÁS ALAKÚ/.test(sweepVerdict({ exitCode: 1, stdout: MALFORMED }).why),
  'a hibás alak nem kap NEVEZETT választ');
say('SWV04', V(0, DECLARED) === 'failed', 'a nullával zárt, mégis kihagyást deklaráló (ellentmondó) futás nem piros');
// A DEKLARÁCIÓ CSAK AZ UTOLSÓ SORBAN — középre ágyazva idézet, nem verdikt.
say('SWV04', V(1, `${VERDICT_MARKER} env_skipped reason=x\nFAIL: és mégis elbuktam`) === 'failed',
  'a NEM utolsó sorban álló deklaráció is billentett — akkor egy idézet is verdikt lehetne');

// ── SWV05 — VALÓDI ALFOLYAMAT-PRÓBA ────────────────────────────────────────────────────────────
//
// A tiszta függvény zöldje nem bizonyítja, hogy a SÖPRÉS ténylegesen így viselkedik: a hívó és a
// hívott VISZONYA a mérendő (KUKA-024). Ezért itt VALÓDI gyermek-folyamatokat indítunk, ugyanazzal
// az `execSync`-alakkal, amit a söprés használ, és a KIMENETÜKET adjuk a feloldónak.
{
  const dir = mkdtempSync(join(tmpdir(), 'swv-'));
  try {
    const child = (name, body) => {
      const f = join(dir, `${name}.mjs`);
      writeFileSync(f, body);
      return f;
    };
    const kids = [
      ['zold', 'console.log("RESULT: 2/2 PASS");', 'green'],
      ['piros', 'console.log("ENV-KIHAGYÁS: egy belső rész kimaradt");\nconsole.log("RESULT: 1/2 PASS — 1 FAIL");\nprocess.exit(1);', 'failed'],
      ['kihagy', `console.log("nem tudom elvégezni");\nconsole.log("${VERDICT_MARKER} env_skipped reason=nincs adatbázis");\nprocess.exit(1);`, 'env_skipped'],
      ['ellentmond', `console.log("${VERDICT_MARKER} env_skipped reason=x");\nprocess.exit(0);`, 'failed'],
      // Az ÖTÖDIK gyermek az R18/F18-01 lelete: a hibás alakot NULLÁVAL zárva adja ki.
      ['hibas-alak-nullaval', `console.log("${VERDICT_MARKER} nonsense");\nprocess.exit(0);`, 'failed'],
    ];
    for (const [name, body, want] of kids) {
      const f = child(name, body);
      let exitCode = 0; let out = '';
      try {
        out = String(execSync(`node ${JSON.stringify(f)}`, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 20000 }) || '');
      } catch (e) {
        exitCode = typeof e.status === 'number' ? e.status : 1;
        out = `${e.stdout || ''}\n${e.stderr || ''}`;
      }
      const got = sweepVerdict({ exitCode, timedOut: false, stdout: out }).verdict;
      say('SWV05', got === want, `VALÓDI gyermek "${name}": várt ${want}, mért ${got}`);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

// ── SWV06 — A SÖPRÉS A KÖZÖS FELOLDÓT HÍVJA, ÉS A RÉGI ALAK NEM JÖTT VISSZA ────────────────────
{
  const SWEEP = readFileSync(join(ROOT, 'tools/vs_verify_sweep.mjs'), 'utf8');
  const code = SWEEP.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  say('SWV06', /from '\.\/lib\/vs_sweep_verdict\.mjs'/.test(code), 'a söprés nem a közös verdikt-feloldót húzza be');
  say('SWV06', /sweepVerdict\(\{/.test(code), 'a söprés nem HÍVJA a feloldót — a behúzás önmagában nem kötés (KUKA-126)');
  say('SWV06', !/ENV-KIHAGYÁS\/?\.?test\(|\/DATABASE_URL is not set\|/.test(code),
    'VISSZACSÚSZÁS: a söprés megint részszövegből osztályoz');
}

// ── SWV07 — A HIBÁS ALAK A KILÉPÉSI KÓDTÓL FÜGGETLENÜL HIBA (R18/F18-01 · KUKA-176) ─────────────
//
// A külső fél lelete: `sweepVerdict({exitCode:0, stdout:'VS-SWEEP-VERDICT: nonsense'})` ZÖLD volt,
// mert a hibás-alak ág CSAK a nem-nulla kilépés alatt állt. Az SWV04 ezt nem foghatta meg: ott a
// hibás alakot KIZÁRÓLAG `exit 1`-gyel mértem — tükröt mértem, nem ELLENPÁRT (KUKA-039 · KUKA-068).
//
// A szigorítás nem nyúlhat túl: a jelölő NÉLKÜLI nulla kilépés zöld MARAD, az érvényes kihagyás
// kihagyás marad, a türelem-túllépés pedig külön állapot (KUKA-049).
const NONSENSE = `${VERDICT_MARKER} nonsense`;
say('SWV07', V(0, NONSENSE) === 'failed', 'A LELET: hibás alakú deklaráció NULLA kilépéssel ZÖLD lett');
say('SWV07', V(1, NONSENSE) === 'failed', 'hibás alakú deklaráció nem-nulla kilépéssel nem piros');
say('SWV07', /HIBÁS ALAKÚ/.test(sweepVerdict({ exitCode: 0, stdout: NONSENSE }).why),
  'a nullával zárt hibás alak nem kap NEVEZETT választ — a puszta „failed" nem mondja meg, miért');
say('SWV07', V(0, 'RESULT: 5/5 PASS') === 'green', 'ELLENPÁR: jelölő nélküli nulla kilépés nem zöld — a szigorítás túlnyúlt');
say('SWV07', V(1, DECLARED) === 'env_skipped', 'ELLENPÁR: érvényes kihagyás nem-nulla kóddal nem kihagyás');
say('SWV07', V(1, 'x', true) === 'unfinished', 'ELLENPÁR: a türelem-túllépés nem külön állapot');
for (const bad of [`${VERDICT_MARKER} env_skipped`, `${VERDICT_MARKER} env_skipped reason=`,
  `${VERDICT_MARKER} envskipped reason=x`, `${VERDICT_MARKER}`]) {
  say('SWV07', V(0, bad) === 'failed', `hibás alak nullával zárva ZÖLD: ${JSON.stringify(bad)}`);
}

const total = 7;
console.log(`SWV-01 VERDIKT-SZERZŐDÉS (SWV01–SWV0${total}): ${SWEEP_VERDICTS.length} állapot · `
  + `${LEAKY.length} beágyazott-szó ellenpélda · 5 VALÓDI alfolyamat · pozitív ellenpár deklarált kihagyásra · `
  + 'a hibás alak MINDKÉT kilépési kóddal hiba (F18-01)');
if (problems.length) {
  console.error(`\nPIROS (${problems.length}):`);
  for (const p of problems) console.error(`  · ${p}`);
  process.exit(1);
}
console.log('ZÖLD — a verdikt a gyermek GÉPI deklarációjából dől el; hiba és kihagyás együtt nem tiszta kihagyás.');
