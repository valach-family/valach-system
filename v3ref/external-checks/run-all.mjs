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

const HERE = dirname(fileURLToPath(import.meta.url));   // v3ref/external-checks
const REF = resolve(HERE, '..');                        // v3ref
const ROOT = resolve(REF, '..');                        // a repó gyökere (KUKA-031: nincs beégetett út)

// ── A PROGRAMOK — és KI ÍRTA ŐKET ───────────────────────────────────────────────────────────────
// A szerző nem díszítés: a külső fél programja FÜGGETLEN tanú, a mienk ÖNVIZSGÁLAT. Ha a kettőt
// egy kalap alá vennénk, a saját programunk zöldje független bizonyítéknak látszana (KUKA-054).
const PROGRAMS = [
  {
    id: 'r57',
    file: 'r57_chatgpt-v3.mjs',
    by: 'chatgpt-v3 — KÜLSŐ, független fél',
    origin: 'R57 (változatlanul, ahogy a boardon érkezett)',
    what: 'T01–T05: az R56-ban tett pecsét-állítások · E01–E04: a bizonyíték-kapu megkerülhetősége',
    evidence: 'r56-challenge.json',
  },
  {
    id: 'r55',
    file: 'r55_restated.mjs',
    by: 'Claude-v3 — a SAJÁT sávunk (önvizsgálat)',
    origin: 'R56',
    what: 'az R55 öt esete újrafogalmazva a mai szerződésre, mindegyikhez ellenpárral',
    evidence: 'restated.json',
  },
  {
    id: 'r53',
    file: 'r53_f03_restated.mjs',
    by: 'Claude-v3 — a SAJÁT sávunk (önvizsgálat)',
    origin: 'R54',
    what: 'az R53/F03 támadás egyenértékű alakja (G01) + érintetlen ellenpár (G02)',
    evidence: 'f03-restated.json',
  },
];

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
  const ignore = ['v3ref/external-checks/results/', 'v3ref/v3ref-mutation-result.json'];
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
function stage(src) {
  const dir = mkdtempSync(join(tmpdir(), 'v3ref-ext-'));
  const skip = [join(REF, 'external-checks'), join(REF, 'v3ref-mutation-result.json')];
  cpSync(REF, join(dir, 'source', 'v3ref'), {
    recursive: true,
    filter: (from) => !skip.some((s) => from === s || from.startsWith(`${s}/`)),
  });
  writeFileSync(join(dir, 'source-manifest.json'), `${JSON.stringify({
    commit: src.commit,
    measured_at: new Date().toISOString(),
    source_state: src.note,
    dirty_files: src.dirty_files,
    staged_from: 'v3ref/ (a external-checks/ és a generált eredmény nélkül)',
  }, null, 2)}\n`);
  mkdirSync(join(dir, 'evidence'), { recursive: true });
  for (const p of PROGRAMS) cpSync(join(HERE, p.file), join(dir, p.file));
  return dir;
}

// ── Az eredmény kiolvasása ──────────────────────────────────────────────────────────────────────
// Mind a három program a szabvány kimenetre írja az esetek listáját, és a részleteset az
// `evidence/` alá. A KETTŐ KÖZÜL a fájl az erősebb (teljes), a kimenet a gyors összegzés.
function readCases(stdout, evidencePath) {
  const parse = (text) => {
    if (!text) return null;
    const t = text.trim();
    const at = Math.min(...['[', '{'].map((c) => (t.indexOf(c) < 0 ? Infinity : t.indexOf(c))));
    if (!Number.isFinite(at)) return null;
    try { return JSON.parse(t.slice(at)); } catch { return null; }
  };
  const fromFile = existsSync(evidencePath) ? parse(readFileSync(evidencePath, 'utf8')) : null;
  const v = fromFile ?? parse(stdout);
  if (!v) return null;
  const cases = Array.isArray(v) ? v : (Array.isArray(v.cases) ? v.cases : null);
  return cases;
}

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
  const t0 = Date.now();
  const q = spawnSync(process.execPath, [join(dir, p.file)], {
    cwd: dir, encoding: 'utf8', timeout: 600_000, maxBuffer: 64 * 1024 * 1024,
  });
  const ms = Date.now() - t0;
  const evidencePath = join(dir, 'evidence', p.evidence);
  const cases = readCases(q.stdout, evidencePath);

  // A gépi eredmény a kimenő könyvtárba kerül — ezt kérte a külső fél („teljes, géppel olvasható").
  let saved = null;
  if (existsSync(evidencePath)) {
    saved = join(OUT, `${p.id}_${p.evidence}`);
    cpSync(evidencePath, saved);
  }

  const failed = cases ? cases.filter((c) => c.pass !== true || c.test_error) : null;
  const ok = Array.isArray(cases) && cases.length > 0 && failed.length === 0 && q.status === 0 && !q.error;
  summary.push({
    id: p.id, file: p.file, by: p.by, origin: p.origin,
    exit: q.status, ms, total: cases ? cases.length : null,
    failed: failed ? failed.map((c) => c.id) : null,
    ok, saved,
    stderr: (q.stderr || '').trim().split('\n').filter(Boolean).slice(0, 4),
    error: q.error ? String(q.error.message || q.error) : null,
  });

  const head = ok ? 'MEGFELEL' : 'ELTÉRÉS ';
  console.log(`  ${head}  [${p.id}] ${p.file}`);
  console.log(`            írta:      ${p.by} · ${p.origin}`);
  console.log(`            mit mér:   ${p.what}`);
  console.log(`            eredmény:  ${cases ? `${cases.length - (failed?.length ?? 0)}/${cases.length} eset` : 'a kimenet nem értelmezhető'}`
    + ` · kilépés ${q.status} · ${ms} ms`);
  if (failed && failed.length) console.log(`            ELBUKOTT:  ${failed.map((c) => c.id).join(' · ')}`);
  if (q.error) console.log(`            HIBA:      ${q.error.message || q.error}`);
  for (const l of summary.at(-1).stderr) console.log(`            stderr:    ${l}`);
  if (saved) console.log(`            fájl:      ${saved}`);
  console.log('');
}

const all = { at: new Date().toISOString(), node: process.version, source: src, programs: summary };
const indexPath = join(OUT, 'external-checks-result.json');
writeFileSync(indexPath, `${JSON.stringify(all, null, 2)}\n`);

if (keep) console.log(`  a munkakönyvtár MEGMARADT: ${dir}`);
else rmSync(dir, { recursive: true, force: true });

const green = summary.filter((s) => s.ok).length;
console.log('='.repeat(88));
console.log(`  összesítő fájl: ${indexPath}`);
console.log(`RESULT: ${green}/${summary.length} program MEGFELEL`
  + (green === summary.length ? '' : ` — ELTÉRÉS: ${summary.filter((s) => !s.ok).map((s) => s.id).join(' · ')}`));
console.log('');
process.exit(green === summary.length ? 0 : 1);
