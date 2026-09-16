#!/usr/bin/env node
/**
 * R16 — A KÜLSŐ ELLENŐRZŐ FÉL HÉT MAG-ELLENPÉLDÁJA, BURKOLÓVAL.
 *
 * MIÉRT VAN ITT EGYÁLTALÁN. Az R88 §7-ben a külső fél kimondta, hogy a KAPOTT programot
 * „lefuttattam" és „be van kötve" KÉT KÜLÖNBÖZŐ állítás, és én az elsőt mondtam a második helyett
 * (KUKA-132). Az R16-os programjukat ezért nem elég egyszer megfuttatni: a söprésnek MINDEN KÖRBEN
 * futtatnia kell, különben a következő javításom némán visszateheti a hibát. A megkülönböztető
 * kérdés az volt: „melyik kapu bukna el, ha ez a fájl holnap eltűnne?" — mostantól ez:
 * `npm run verify:external-checks`.
 *
 * MIÉRT KELL BURKOLÓ. A programjuk a REPÓ GYÖKERÉT feltételezi (`./v3ref/store.mjs`), és a
 * kimenete mellé egy `challenge.json`-t is ír maga mellé. A szövegüket NEM írjuk át
 * (TESZTADAPTÁCIÓ NEM TÖRTÉNT — md5 22ef819859a563fbba3b7e6f306da4e2): a burkoló a mag gyökeréből
 * futtatja, a STDOUT JSON-ját olvassa, és utána eltakarítja a maga mögött hagyott fájlokat.
 *
 * MIT MÉR (hét eset, az ő azonosítóikkal):
 *   · repeat-canonical          — az ismétlés visszajátszik, EGY mozgással
 *   · scope-conflict            — más adatkörrel ugyanaz a kulcs ütközés, nem néma felülírás
 *   · cross-book-write-rejected — MÁS könyv cikkére nem lehet írni
 *   · future-not-in-past        — a jövőbeli hatály nem jelenik meg a múltbeli nézetben
 *   · calendar-invalid          — a nem létező naptári nap elutasítva
 *   · backdate-overflow-atomic  — a túlcsorduló visszadátumozás NYOMTALAN (parancs/esemény/mozgás)
 *   · unauthorized-object-neutral — a tiltott hívó válasza NEM függ attól, LÉTEZIK-e az objektum
 *
 * AZ ELFOGADÁS: mind a hét `ok:true`. A JAVÍTÁS ELŐTTI forráson 6/7 volt — egyedül az
 * `unauthorized-object-neutral` bukott (F16-01 · KUKA-173), és pontosan ezt javította az AUT-01.
 *
 * TITOK ÉS ÜZLETI ADAT: kizárólag szintetikus adat, ideiglenes SQLite-tárolón.
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROGRAM = 'r16_chatgpt-v3.core.mjs';
export const EXPECTED = Object.freeze([
  'repeat-canonical', 'scope-conflict', 'cross-book-write-rejected', 'future-not-in-past',
  'calendar-invalid', 'backdate-overflow-atomic', 'unauthorized-object-neutral',
]);

/**
 * A MAG GYÖKERE — MEGKERESVE, NEM TIPPELVE (KUKA-031 · KUKA-130 · a testvér-burkolók alakja).
 * A futtató ideiglenes homokozóba másol (`<dir>/source/v3ref/`), a közvetlen futtatás a repóban áll.
 * Ha egyik jelölt sem hordozza a bizonyítékot, NEVEZETT hiba, nem nulla eset (KUKA-012 · KUKA-020).
 */
export function coreRootFor(here) {
  const candidates = [
    { path: join(here, 'source'), how: 'staged_sandbox' },
    { path: resolve(here, '..', '..'), how: 'git_worktree' },
  ];
  for (const c of candidates) {
    if (existsSync(join(c.path, 'v3ref', 'store.mjs'))) return Object.freeze(c);
  }
  throw new Error(`[r16core] nem találom a V3 magot — megnéztem: ${candidates.map((c) => c.path).join(' · ')}`);
}

/** A FUTÁS FORRÁS-KÖTÉSE, az EREJE kimondva (KUKA-127). */
export function sourcePinFor(here, coreRoot) {
  const manifest = join(here, 'source-manifest.json');
  if (existsSync(manifest)) {
    const m = JSON.parse(readFileSync(manifest, 'utf8'));
    return Object.freeze({ commit: String(m.commit || ''), from: 'staged_manifest' });
  }
  const git = spawnSync('git', ['-C', coreRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  return Object.freeze({
    commit: git.status === 0 ? String(git.stdout).trim() : '',
    from: git.status === 0 ? 'git_worktree' : 'unknown',
  });
}

/**
 * A KIMENET KIOLVASÁSA. A program a TELJES tömböt kiírja a stdout-ra; a `detail` mező nagy és
 * változékony, ezért CSAK az azonosítót és az `ok`-ot vesszük át. Ami nem olvasható JSON, az NEM
 * „nulla eset", hanem OLVASHATATLAN — nevezett hibával (KUKA-012 · a futtató E08 tanulsága).
 */
export function parseCases(raw) {
  const text = String(raw || '').trim();
  const start = text.indexOf('[');
  if (start < 0) return Object.freeze({ readable: false, cases: Object.freeze([]), why: 'nincs JSON-tömb a kimenetben' });
  let rows;
  try { rows = JSON.parse(text.slice(start)); } catch (e) {
    return Object.freeze({ readable: false, cases: Object.freeze([]), why: `olvashatatlan JSON: ${e.message}` });
  }
  if (!Array.isArray(rows)) return Object.freeze({ readable: false, cases: Object.freeze([]), why: 'a kimenet nem tömb' });
  return Object.freeze({
    readable: true, why: null,
    cases: Object.freeze(rows.map((r) => Object.freeze({
      id: typeof r?.id === 'string' ? r.id : null,
      // A `pass` LOGIKAI érték legyen — a „hihető" nem elég (KUKA-125: a konverzió eltörli a típust).
      pass: r?.ok === true,
      well_formed: typeof r?.id === 'string' && typeof r?.ok === 'boolean',
    }))),
  });
}

export function runExternalR16Check() {
  const core = coreRootFor(HERE);
  const pin = sourcePinFor(HERE, core.path);
  // A programjuk `./v3ref/store.mjs`-t húz be, tehát a MAG GYÖKERE MELLÉ kell tenni.
  const staged = join(core.path, `.r16-external-${process.pid}.mjs`);
  // …és MAGA MELLÉ írja a `challenge.json`-t is; a takarítás a miénk, nem az övék.
  const litter = join(core.path, 'challenge.json');
  const litterExisted = existsSync(litter);
  try {
    cpSync(join(HERE, PROGRAM), staged);
    const run = spawnSync(process.execPath, [staged], {
      cwd: core.path, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    });
    const parsed = parseCases(String(run.stdout || ''));
    const got = parsed.cases.map((c) => c.id).filter(Boolean);
    const missing = EXPECTED.filter((id) => !got.includes(id));
    const unknown = got.filter((id) => !EXPECTED.includes(id));
    const duplicates = got.filter((id, i) => got.indexOf(id) !== i);
    const malformed = parsed.cases.filter((c) => !c.well_formed).length;
    return Object.freeze({
      program: PROGRAM, node: process.version, exit_code: run.status,
      source_commit: pin.commit, source_commit_from: pin.from, core_root_from: core.how,
      readable: parsed.readable, unreadable_why: parsed.why,
      cases: parsed.cases,
      passed: parsed.cases.filter((c) => c.pass).length,
      failed: parsed.cases.filter((c) => !c.pass).length,
      missing, unknown, duplicates, malformed,
      ok: parsed.readable && parsed.cases.length === EXPECTED.length
        && !missing.length && !unknown.length && !duplicates.length && !malformed
        && parsed.cases.every((c) => c.pass),
      stderr: String(run.stderr || '').slice(0, 2000),
    });
  } finally {
    rmSync(staged, { force: true });
    if (!litterExisted) rmSync(litter, { force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = runExternalR16Check();
  mkdirSync(join(HERE, 'evidence'), { recursive: true });
  writeFileSync(join(HERE, 'evidence', 'r16-core-challenge.json'), `${JSON.stringify({
    ...r, source_md5: '22ef819859a563fbba3b7e6f306da4e2', verbatim: true, at: new Date().toISOString(),
  }, null, 2)}\n`);
  console.log('='.repeat(78));
  console.log('A KÜLSŐ ELLENŐRZŐ FÉL R16 MAG-PRÓBÁJA (változatlan program)');
  console.log('='.repeat(78));
  for (const c of r.cases) console.log(`  ${c.pass ? 'RENDBEN ' : 'ELTÉRÉS '} ${c.id}`);
  if (!r.readable) console.log(`  OLVASHATATLAN: ${r.unreadable_why}`);
  console.log(`\nRESULT: ${r.passed}/${r.cases.length} eset rendben · hiányzó=${r.missing.length} · kilépés=${r.exit_code}`);
  process.exitCode = r.ok ? 0 : 1;
}

export { PROGRAM };
export const SOURCE_MD5 = '22ef819859a563fbba3b7e6f306da4e2';
export const readProgramSource = () => readFileSync(join(HERE, PROGRAM), 'utf8');
