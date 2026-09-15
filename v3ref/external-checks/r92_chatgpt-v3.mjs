#!/usr/bin/env node
/**
 * R92 — A KÜLSŐ ELLENŐRZŐ FÉL KÉT JOGOSULTSÁGI ELLENPÉLDÁJA, BURKOLÓVAL.
 *
 * MIÉRT KELL BURKOLÓ. A programjuk a REPÓ GYÖKERÉT feltételezi (`./v3ref/store.mjs`), és NEM
 * JSON-t ad, hanem két `console.log({id, issue, redeem, membership})` sort. A szövegüket NEM írjuk
 * át (tesztadaptáció nem történik): a burkoló a gyökérből futtatja és a KÉT SORT olvassa ki.
 *
 * MIT MÉR. **F01** — a hívó átnevezheti-e az ellenőrzött MŰVELETET (csak `suspend`-re felhatalmazó
 * alappal kiadható-e meghívó); **F02** — az adatkör ELHAGYÁSA megkerüli-e az ÜRES korlátot. Mindkét
 * eset a TELJES kiadás→beváltás úton mér: a bizonyíték a keletkezett TAGSÁG.
 *
 * AZ ELFOGADÁS: a javítás UTÁN mindkét úton `issue.ok === false`, és NEM keletkezik tagság.
 * A JAVÍTÁS ELŐTTI forráson mindkettő `ok:true` + `outcome:'granted'` + `role:'user'` volt —
 * pontosan az általuk közölt reprodukció.
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
const PROGRAM = 'r92_chatgpt-v3.core.mjs';
export const EXPECTED = Object.freeze(['F01', 'F02']);

/**
 * A MAG GYÖKERE — NEM TIPPELVE, hanem MEGKERESVE (KUKA-031 · KUKA-130).
 *
 * Az első alakom `resolve(HERE, '..', '..')`-t írt, tehát a REPÓ LAYOUTJÁT feltételezte. A futtató
 * viszont ideiglenes HOMOKOZÓBA másolja a programot (`<dir>/<burkoló>` + `<dir>/source/v3ref/`),
 * ezért ott a két szint fölött `/` állt: a próba a söprésben ERR_MODULE_NOT_FOUND-dal, 0/2 esettel
 * és 1-es kilépéssel halt el — MIKÖZBEN önmagában futtatva 2/2 zöld volt. Vagyis: a program létezett
 * és futott, a KÖTÉSE nem (KUKA-132 a saját szerszámomon).
 *
 * A feloldó ezért a BIZONYÍTÉKOT keresi (ott van-e a `v3ref/store.mjs`), és ha egyik jelölt sem áll,
 * NEVEZETT hibával áll meg — nem nulla esettel (KUKA-012 · KUKA-020).
 */
export function coreRootFor(here) {
  const candidates = [
    { path: join(here, 'source'), how: 'staged_sandbox' },   // a futtató homokozója
    { path: resolve(here, '..', '..'), how: 'git_worktree' }, // közvetlen futtatás a repóban
  ];
  for (const c of candidates) {
    if (existsSync(join(c.path, 'v3ref', 'store.mjs'))) return Object.freeze(c);
  }
  throw new Error(`[r92authz] nem találom a V3 magot — megnéztem: ${candidates.map((c) => c.path).join(' · ')}`);
}

/**
 * A FUTÁS FORRÁS-KÖTÉSE — és az EREJE kimondva (KUKA-127).
 * A homokozóban a futtató `source-manifest.json`-ja a kanonikus pin (ezt olvassa minden testvér-
 * burkoló); közvetlen futtatásnál a git munkamásolat HEAD-je a tanú, ami GYENGÉBB (piszkos fa is
 * lehet) — ezért a `source_commit_from` mező megmondja, melyiket tartja a kezében a befogadó.
 */
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

/** A KÉT SOR KIOLVASÁSA. Ami nem illeszkedik, az NEM „nulla", hanem OLVASHATATLAN (KUKA-012). */
export function parseCases(raw) {
  const out = [];
  const text = String(raw || '');
  for (const id of EXPECTED) {
    const i = text.indexOf(`id: '${id}'`);
    if (i < 0) continue;
    const chunk = text.slice(i, text.indexOf('\n}', i) + 2 || undefined);
    const issueOk = /issue:\s*\{[\s\S]*?ok:\s*(true|false)/.exec(chunk);
    const membership = /membership:\s*(undefined|\[Object)/.exec(chunk);
    const reason = /reason:\s*'([a-z_]+)'/.exec(chunk);
    const blocked = issueOk && issueOk[1] === 'false';
    const noMembership = !!membership && membership[1] === 'undefined';
    out.push({ id, blocked, no_membership: noMembership, reason: reason ? reason[1] : null, pass: blocked && noMembership });
  }
  return out;
}

export function runExternalR92Check() {
  const core = coreRootFor(HERE);
  const pin = sourcePinFor(HERE, core.path);
  // A programjuk `./v3ref/store.mjs`-t húz be, tehát a MAG GYÖKERE MELLÉ kell tenni — akárhol is van.
  const staged = join(core.path, `.r92-external-${process.pid}.mjs`);
  try {
    cpSync(join(HERE, PROGRAM), staged);
    const run = spawnSync(process.execPath, [staged], {
      cwd: core.path, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    });
    const cases = parseCases(String(run.stdout || ''));
    const got = cases.map((c) => c.id);
    const missing = EXPECTED.filter((id) => !got.includes(id));
    const unknown = got.filter((id) => !EXPECTED.includes(id));
    return Object.freeze({
      program: PROGRAM, node: process.version, exit_code: run.status,
      source_commit: pin.commit, source_commit_from: pin.from, core_root_from: core.how,
      readable: cases.length > 0, cases,
      passed: cases.filter((c) => c.pass).length, failed: cases.filter((c) => !c.pass).length,
      missing, unknown, duplicates: got.filter((id, i) => got.indexOf(id) !== i),
      ok: cases.length === EXPECTED.length && !missing.length && !unknown.length && cases.every((c) => c.pass),
      stderr: String(run.stderr || '').slice(0, 2000),
    });
  } finally { rmSync(staged, { force: true }); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = runExternalR92Check();
  mkdirSync(join(HERE, 'evidence'), { recursive: true });
  writeFileSync(join(HERE, 'evidence', 'r92-authz-challenge.json'), `${JSON.stringify({
    ...r, source_md5: '1a65be2a8b3b43fc28f3cd93b3ea2874', verbatim: true, at: new Date().toISOString(),
  }, null, 2)}\n`);
  console.log('='.repeat(78));
  console.log('A KÜLSŐ ELLENŐRZŐ FÉL R92 JOGOSULTSÁGI PRÓBÁJA (változatlan program)');
  console.log('='.repeat(78));
  for (const c of r.cases) {
    console.log(`  ${c.pass ? 'RENDBEN ' : 'ELTÉRÉS '} ${c.id}  kiadás elakadt=${c.blocked} (${c.reason || '—'}) · tagság NEM keletkezett=${c.no_membership}`);
  }
  console.log(`\nRESULT: ${r.passed}/${r.cases.length} eset rendben · hiányzó=${r.missing.length} · kilépés=${r.exit_code}`);
  process.exitCode = r.ok ? 0 : 1;
}

export { PROGRAM };
export const SOURCE_MD5 = '1a65be2a8b3b43fc28f3cd93b3ea2874';
export const readProgramSource = () => readFileSync(join(HERE, PROGRAM), 'utf8');
