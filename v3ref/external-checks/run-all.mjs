#!/usr/bin/env node
/** EXT-01 — A KÜLSŐ ELLENŐRZŐ PROGRAMOK FUTTATÓJA (egy paranccsal).
 *
 * MIÉRT VAN. Az R57 §7 kimondott átadhatósági követelménye: „Az új programok tényleges fájlja vagy
 * teljes szövege; pontos commit; teljes, géppel olvasható eredmény". A külső fél az R57-ben azt
 * írta, hogy az R56-ban HIVATKOZOTT programokat a megadott commit fájlfájában nem találta, ezért
 * SAJÁT rekonstrukciót futtatott. Rekonstrukciót futtatni a mi mulasztásunk következménye: a
 * programok nem voltak a repóban, tehát nem voltak leszállítva (KUKA-079 — amit a címzett nem tud
 * megnyitni/futtatni, azt nem adtuk át).
 *
 * MIÉRT EGY PARANCS. A három program mindegyike SAJÁT környezetet vár maga mellett (`source/`,
 * `source-manifest.json`, `evidence/`), és ezt eddig kézzel raktuk össze. Ha egy eszköz használatához
 * a fejlesztőnek kell fel-alá üzengetnie a részleteket, az eszköz nincs kész (KUKA-072). Ez a futtató
 * összerakja a környezetet, lefuttatja mind a hármat, a gépi eredményt fájlba teszi, és KIMONDJA az
 * összesítést — ember nélkül.
 *
 * MIT NEM CSINÁL. A három program szövegéhez NEM nyúl. A `r57_chatgpt-v3.mjs` a KÜLSŐ fél munkája,
 * bájtazonosan; a másik kettő a mi korábbi köreink programja, szintén változatlanul. Ha a futtató
 * „megjavítaná" őket, az ellenőrzés a saját előfeltevésünket igazolná vissza (KUKA-054).
 *
 * A BEMONDOTT COMMIT NEM MÉRÉS (R45 P01 / KUKA-056). A `source-manifest.json` `commit` mezője a
 * programok felé továbbadott ÁLLÍTÁS. Ezért itt MÉRJÜK: ha a munkamásolatban a lemásolt forrást
 * érintő, nem-könyvelt változás áll, a commit `+uncommitted` jelölést kap, és a futtató kiírja,
 * mely fájlokon. A forrás tartalmi lenyomatát a programok által indított `run.mjs` maga számolja —
 * az a bizonyíték, nem ez a szöveg.
 *
 * Használat:
 *   node v3ref/external-checks/run-all.mjs                  # mind a három, eredmény a results/ alá
 *   node v3ref/external-checks/run-all.mjs --only r57       # csak a külső fél programja
 *   node v3ref/external-checks/run-all.mjs --out /tmp/ki     # máshova írja a gépi eredményt
 *   node v3ref/external-checks/run-all.mjs --keep           # a munkakönyvtárat is meghagyja
 *
 * Kilépési kód: 0, ha MINDEN lefuttatott eset `pass` — különben 1. (A három program maga mindig
 * 0-val zár, csak kiírja a JSON-t; a döntést ezért itt kell meghozni — az R57 F01 leckéje a saját
 * futtatónkra fordítva: a nemleges eredménynek a KILÉPÉSI KÓDBAN is látszania kell.)
 */
import {
  cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
// A PROGRAM-REGISZTER ÉS AZ ESET-SZEMLE KÜLÖN MODULBAN ÁLL (EXT-02, R59/F02), hogy a verifier
// HÍVHASSA ugyanazt a döntést, amit a futtató használ — ne a forrás szövegét olvassa (KUKA-009).
import { PROGRAMS, auditCases, auditEvidenceArtifact, runScope } from './case-manifest.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));   // v3ref/external-checks
const REF = resolve(HERE, '..');                        // v3ref
const ROOT = resolve(REF, '..');                        // a repó gyökere (KUKA-031: nincs beégetett út)

// ── Parancssor ──────────────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? (argv[i + 1] ?? null) : null;
};
const only = flag('--only');
const keep = argv.includes('--keep');
const OUT = resolve(flag('--out') || join(HERE, 'results'));

if (only && !PROGRAMS.some((p) => p.id === only)) {
  // KUKA-064: a nemleges válasz ne legyen zsákutca — a választható halmaz jöjjön vele.
  console.error(`ismeretlen program: "${only}" — választható: ${PROGRAMS.map((p) => p.id).join(' · ')}`);
  process.exit(2);
}
const selected = only ? PROGRAMS.filter((p) => p.id === only) : PROGRAMS;

// ── A FORRÁS-ÁLLAPOT MÉRÉSE ─────────────────────────────────────────────────────────────────────
// A `commit` a programoknak továbbadott ÁLLÍTÁS. Itt derül ki, igaz-e: ha a lemásolt forrást érintő
// nem-könyvelt változás áll a munkamásolatban, a bemondott commit MÁS forrásra vonatkozna.
function measureSource() {
  const git = (...a) => spawnSync('git', ['-C', ROOT, ...a], { encoding: 'utf8' });
  const head = git('rev-parse', 'HEAD');
  if (head.status !== 0) {
    return {
      commit: 'unknown',
      clean: null,
      dirty_files: [],
      note: 'ez a könyvtár nem git-munkamásolat (vagy a git nem elérhető) — a commit BEMONDATLAN marad',
    };
  }
  const sha = head.stdout.trim();
  const st = git('status', '--porcelain', '--', 'v3ref');
  // A generált kimenetek nem tartoznak a MÉRT forráshoz: a results/ és a mutációs eredmény-fájl
  // piszkossága nem teszi mássá a lemásolt kódot.
  const ignore = ['v3ref/external-checks/results/', 'v3ref/v3ref-mutation-result.json', 'v3ref/units/'];
  const dirty = (st.status === 0 ? st.stdout.split('\n') : [])
    .map((l) => l.trim()).filter(Boolean)
    .map((l) => l.replace(/^\S+\s+/, ''))
    .filter((f) => !ignore.some((i) => f.startsWith(i)));
  return {
    commit: dirty.length ? `${sha}+uncommitted` : sha,
    clean: dirty.length === 0,
    dirty_files: dirty,
    note: dirty.length
      ? 'a lemásolt forráson nem-könyvelt változás áll — a bemondott commit ezért jelölt'
      : 'a lemásolt forrás a könyvelt állapoton áll',
  };
}

// ── A KÖRNYEZET ÖSSZERAKÁSA ─────────────────────────────────────────────────────────────────────
// A programok mellett `source/v3ref/…`, `source-manifest.json` és `evidence/` kell — ezt eddig kézzel
// raktuk össze, innentől a gép.
// A FUTTATÓ IS A LEMÁSOLT FORRÁS RÉSZE (R59/F02). A külső fél E08 esete magát a FUTTATÓT támadja:
// kicseréli az egyik programot egy csonkra, majd a másolatban futó `run-all.mjs`-től kérdezi meg,
// észreveszi-e. Ehhez a másolatban ott kell lennie a futtatónak és a programoknak — csak a GENERÁLT
// kimenet marad ki (a `results/` és a mutációs eredmény-fájl nem forrás).
function stage(src) {
  const dir = mkdtempSync(join(tmpdir(), 'v3ref-ext-'));
  const skip = [join(HERE, 'results'), join(REF, 'v3ref-mutation-result.json'), join(REF, 'units')];
  cpSync(REF, join(dir, 'source', 'v3ref'), {
    recursive: true,
    filter: (from) => !skip.some((s) => from === s || from.startsWith(`${s}/`)),
  });
  writeFileSync(join(dir, 'source-manifest.json'), `${JSON.stringify({
    commit: src.commit,
    measured_at: new Date().toISOString(),
    source_state: src.note,
    dirty_files: src.dirty_files,
    staged_from: 'v3ref/ (a generált eredmény nélkül: external-checks/results/, v3ref-mutation-result.json és units/)',
  }, null, 2)}\n`);
  mkdirSync(join(dir, 'evidence'), { recursive: true });
  // A PROGRAM NEM FELTÉTLENÜL EGY FÁJL. Ahol a külső fél szövegét BÁJTAZONOSAN tartjuk meg, ott a
  // bejegyzés egy BURKOLÓRA mutat, és a változatlan próba a `companions` listán áll — a másolat
  // enélkül némán hiányos volna, és a program „nem futott végig" jelzéssel bukna el egy olyan
  // okból, aminek semmi köze a méréshez (KUKA-049).
  for (const p of PROGRAMS) {
    for (const f of [p.file, ...(p.companions || [])]) cpSync(join(HERE, f), join(dir, f));
  }
  return dir;
}

// ── Az eredmény kiolvasása ──────────────────────────────────────────────────────────────────────
// Mind a három program a szabvány kimenetre írja az esetek listáját, és a részleteset az
// `evidence/` alá. A KETTŐ KÖZÜL a fájl az erősebb (teljes), a kimenet a gyors összegzés.
// A RÉSZLETES FÁJL AZ IGAZSÁG, A SZABVÁNY KIMENET DIAGNOSZTIKA (R61/F02). A régi alak a fájl
// hiányában NÉMÁN visszaesett a kimenetre — így egy semmit nem futtató csonk „teljes bizonyítéknak"
// látszott. Innentől a kettő KÜLÖN olvasódik, és az ítéletet a FÁJL hordozza.
function parseJson(text) {
  if (!text) return null;
  const t = String(text).trim();
  const at = Math.min(...['[', '{'].map((c) => (t.indexOf(c) < 0 ? Infinity : t.indexOf(c))));
  if (!Number.isFinite(at)) return null;
  try { return JSON.parse(t.slice(at)); } catch { return null; }
}
const casesOf = (v) => (Array.isArray(v) ? v : (v && Array.isArray(v.cases) ? v.cases : null));

// ── Futtatás ────────────────────────────────────────────────────────────────────────────────────
const src = measureSource();
const dir = stage(src);
mkdirSync(OUT, { recursive: true });

console.log('');
console.log('V3 MAGREFERENCIA — KÜLSŐ ELLENŐRZŐ PROGRAMOK (EXT-01)');
console.log('='.repeat(88));
console.log(`  forrás commit:  ${src.commit}`);
console.log(`  forrás állapot: ${src.note}`);
for (const f of src.dirty_files) console.log(`                  · ${f}`);
console.log(`  munkakönyvtár:  ${dir}`);
console.log(`  gépi eredmény:  ${OUT}`);
console.log(`  node:           ${process.version}`);
console.log('');

const summary = [];
for (const p of selected) {
  const evidencePath = join(dir, 'evidence', p.evidence);
  // A RÉGI EREDMÉNY-FÁJL FÉLRETÉTELE A FUTÁS ELŐTT (R81 §5 · KUKA-127).
  //
  // MIÉRT LETT EBBŐL KÖTELEZŐ LÉPÉS. Eddig minden programnak SAJÁT eredmény-fájlneve volt, tehát a
  // „megvan a fájl" egyben azt is jelentette, hogy EZ a program írta. Az R81-ben a külső fél KÉT
  // ADAPTÁLT programot küldött (r57a · r59a), amelyek — szándékosan, hiszen az eredetiek változatai
  // — UGYANAZT az eredmény-fájlnevet írják, mint az eredetik. Ettől a „fájl megléte" MÁSIK kérdésre
  // felel, mint amit a szemle kérdez: egy időtúllépésre futó program mellett a SZOMSZÉDJA fájlja
  // maradna ott, azonos eset-listával és azonos commit-kötéssel — tehát ZÖLDNEK látszana.
  //
  // A bizonyítást ezért ELŐ KELL ÁLLÍTANI, nem megfigyelni: a régi fájl megy, és az újnak MEG KELL
  // SZÜLETNIE. Ez pontosan a KUKA-127 szabálya (a külső fél R71 §5 lelete) a saját futtatónkon.
  rmSync(evidencePath, { force: true });
  // A LEMÁSOLT FORRÁS MINDEN PROGRAMNAK UGYANAZ — a generált kimenete NEM (a SAJÁT söprésem lelete,
  // R81). Az R81-es burkoló a mérése előtt lefuttatja a darabolt battériát a lemásolt forráson, és
  // az EGYSÉG-FÁJLOKAT odaírja (`source/v3ref/units/`). A `stage()` ezt a könyvtárat szándékosan
  // kihagyja a másolásból — de attól még KELETKEZHET futás közben, és a KÖVETKEZŐ program már azt
  // találja ott. Mérve: a `r79` önmagában 4/4, a teljes láncban U02 BUKOTT, mert a „hiányzó egység"
  // esetéhez másolt forrás MÁR HORDOZTA az előző program három egység-fájlját — vagyis a mérés nem
  // azt mérte, amit megnevezett (KUKA-127 · KUKA-054). A generált állapotot ezért minden program
  // ELŐTT töröljük: a lemásolt forrás legyen ugyanaz mindenkinek.
  for (const leftover of [join(dir, 'source', 'v3ref', 'units'),
    join(dir, 'source', 'v3ref', 'v3ref-mutation-result.json')]) {
    rmSync(leftover, { recursive: true, force: true });
  }
  const t0 = Date.now();
  const q = spawnSync(process.execPath, [join(dir, p.file)], {
    cwd: dir, encoding: 'utf8', timeout: 600_000, maxBuffer: 64 * 1024 * 1024,
  });
  const ms = Date.now() - t0;
  const exists = existsSync(evidencePath);
  const parsed = exists ? parseJson(readFileSync(evidencePath, 'utf8')) : null;
  const cases = casesOf(parsed);              // az ÍTÉLET a részletes fájlból
  const stdoutCases = casesOf(parseJson(q.stdout)); // a kimenet csak diagnosztika és ellentmondás-szemle

  // A gépi eredmény a kimenő könyvtárba kerül — ezt kérte a külső fél („teljes, géppel olvasható").
  let saved = null;
  if (exists) {
    saved = join(OUT, `${p.id}_${p.evidence}`);
    cpSync(evidencePath, saved);
  }

  // AZ ARTEFAKTUM-SZEMLE (R61/F02). ELŐBB, mint az esetek: ha nincs részletes eredmény, nincs mit
  // megítélni — a szabvány kimenet nem lép a helyébe.
  const artifact = auditEvidenceArtifact(p, { exists, parsed, expectedCommit: src.commit, stdoutCases });

  // AZ ESET-SZEMLE (EXT-02). Nem az a kérdés, hogy amit KAPTUNK, az zöld-e, hanem hogy AZ ÉRKEZETT-E
  // MEG, aminek meg kellett — hiány · ismeretlen · duplikátum · rossz alak · bukás, mind külön szóval.
  const audit = auditCases(p, cases);
  audit.problems.unshift(...artifact.problems);
  const ok = artifact.ok && audit.ok && q.status === 0 && !q.error;
  if (q.status !== 0) audit.problems.push(`[${p.id}] a program NEM NULLÁVAL zárt (kilépés ${q.status})`);
  if (q.error) audit.problems.push(`[${p.id}] a futtatás elszállt: ${q.error.message || q.error}`);

  summary.push({
    id: p.id, file: p.file, by: p.by, origin: p.origin,
    exit: q.status, ms,
    expected_cases: [...p.cases], expected_from: p.cases_source,
    evidence_file: p.evidence, evidence_present: artifact.present, evidence_pin: artifact.pin,
    total: cases ? cases.length : null,
    present: audit.present, missing: audit.missing, unknown: audit.unknown,
    duplicate: audit.duplicate, failed: audit.failed,
    problems: audit.problems,
    ok, saved,
    stderr: (q.stderr || '').trim().split('\n').filter(Boolean).slice(0, 4),
    error: q.error ? String(q.error.message || q.error) : null,
  });

  const head = ok ? 'MEGFELEL' : 'ELTÉRÉS ';
  console.log(`  ${head}  [${p.id}] ${p.file}`);
  console.log(`            írta:      ${p.by} · ${p.origin}`);
  console.log(`            mit mér:   ${p.what}`);
  console.log(`            elvárt:    ${p.cases.length} eset (${p.cases.join(' · ')}) — forrás: ${p.cases_source}`);
  console.log(`            eredmény:  ${cases ? `${audit.present.length - audit.failed.length}/${p.cases.length} eset zöld` : 'NINCS részletes eredmény'}`
    + ` · részletes fájl: ${artifact.present ? `megvan (kötés: ${artifact.pin ? `${artifact.pin.slice(0, 12)}…` : 'NINCS'})` : 'HIÁNYZIK'}`
    + ` · kilépés ${q.status} · ${ms} ms`);
  for (const w of audit.problems) console.log(`            ELTÉRÉS:   ${w}`);
  for (const l of summary.at(-1).stderr) console.log(`            stderr:    ${l}`);
  if (saved) console.log(`            fájl:      ${saved}`);
  console.log('');
}

// A HATÓKÖR KIMONDVA (R59/F02). A `--only` legitim, de a RÉSZLEGES futás soha nem a lánc teljes
// bizonyítéka — és ezt a GÉPI kimenetnek is hordoznia kell, nem csak a képernyőnek (KUKA-104: két
// csatorna, két igazság). Aki a JSON-t olvassa, a `scope`-ból tudja meg, mit ér a zöld.
const scope = runScope(selected.map((p) => p.id), PROGRAMS.map((p) => p.id));

// ── A KÖRNYEZETI KIHAGYÁS — NEVEZETTEN, ÉS CSAK ÉLŐ HELYETTESSEL (R81 §5) ───────────────────────
//
// KÉT PROGRAM (az EREDETI `r57` · `r59`) a mutációs battériát EGY hívásban futtatja, 15 000 ms
// korláttal — ez a mai, 4 vCPU-s futtató-gépünkön MÉRVE nem fér bele (KUKA-089: a „nincs hozzá
// környezetem" MÉRÉS, nem következtetés). Az R81-ben a külső fél ADAPTÁLT változatot küldött, ami
// UGYANAZOKAT az eseteket futtatja darabolt battériával — és az ZÖLD.
//
// A KIHAGYÁS EZÉRT FELTÉTELES, NEM MENTESSÉG (KUKA-041 · KUKA-122). Három feltétel EGYÜTT:
//   (1) a bejegyzés KIMONDJA a technikai akadályt (`env_limit`) és MEGNEVEZI a helyettest;
//   (2) a helyettes ebben a futásban BENNE VOLT;
//   (3) a helyettes ZÖLD.
// Bármelyik hiánya ⇒ a program ÚGY piros, mintha nem is volna helyettese.
const byId = new Map(summary.map((s) => [s.id, s]));
for (const s of summary) {
  const p = selected.find((x) => x.id === s.id);
  if (s.ok || !p || !p.superseded_by || !p.env_limit) continue;
  const sub = byId.get(p.superseded_by);
  if (sub && sub.ok) {
    s.env_skipped = true;
    s.env_limit = p.env_limit;
    s.superseded_by = p.superseded_by;
  } else {
    s.problems.push(`[${s.id}] a megnevezett helyettes (${p.superseded_by}) `
      + `${sub ? 'NEM zöld' : 'ebben a futásban NEM futott'} — a környezeti kihagyás ezért NEM áll`);
  }
}
const envSkipped = summary.filter((s) => s.env_skipped);
const green = summary.filter((s) => s.ok).length;
const all = {
  at: new Date().toISOString(),
  node: process.version,
  source: src,
  scope,
  verdict: {
    ok: green + envSkipped.length === summary.length,
    complete_evidence: scope.complete && green === summary.length,
    green,
    env_skipped: envSkipped.length,
    of: summary.length,
    // A ZÖLD ÉS A KIHAGYÁS KÉT KÜLÖN SZÁM, és a `complete_evidence` CSAK a valódi zöldre igaz —
    // a környezeti kihagyás nem lesz bizonyítékká attól, hogy nem piros (KUKA-089 · KUKA-122).
  },
  programs: summary,
};
const indexPath = join(OUT, 'external-checks-result.json');
writeFileSync(indexPath, `${JSON.stringify(all, null, 2)}\n`);

if (keep) console.log(`  a munkakönyvtár MEGMARADT: ${dir}`);
else rmSync(dir, { recursive: true, force: true });

console.log('='.repeat(88));
console.log(`  hatókör:        ${scope.scope} — ${scope.why}`);
if (scope.skipped.length) console.log(`  NEM futott:     ${scope.skipped.join(' · ')}`);
console.log(`  összesítő fájl: ${indexPath}`);
for (const s of envSkipped) {
  console.log(`  ENV-KIHAGYÁS:   ${s.id} — ez a program EBBEN A KÖRNYEZETBEN nem futtatható végig.`);
  console.log(`                  ${s.env_limit}`);
  console.log(`                  helyette MÉRVE: ${s.superseded_by} (zöld)`);
}
const bad = summary.filter((s) => !s.ok && !s.env_skipped);
console.log(`RESULT: ${green}/${summary.length} program MEGFELEL`
  + (envSkipped.length ? ` · ${envSkipped.length} ENV-KIHAGYÁS (nevezett helyettessel)` : '')
  + (bad.length ? ` — ELTÉRÉS: ${bad.map((s) => s.id).join(' · ')}` : '')
  + (scope.complete ? '' : ' · RÉSZLEGES FUTÁS — nem a lánc teljes bizonyítéka'));
console.log('');
process.exit(bad.length === 0 ? 0 : 1);
