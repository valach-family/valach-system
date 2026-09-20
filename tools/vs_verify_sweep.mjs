#!/usr/bin/env node
// Valach System — TELJES VERIFIER-SÖPRÉS EGY PARANCSBAN (a V2-ből átjött, D-VS-406).
//
// MIÉRT: a kör-végi ellenőrzés eddig a CÉL-verifiereket futtatta, és két szomszéd-pin (PRV06, SS11)
// három körön át némán piroslott — a battéria csak ott zöld, ahol nézik. Ez a futtató MINDEN verify:*
// scriptet lefuttat; a DB-t kívánó ellenőrzések DATABASE_URL nélkül NEVESÍTETT env-kihagyást kapnak
// (nem néma zöldet és nem hamis pirosat — a KUKA-012 némaság-elve a söprésre alkalmazva).
//
// Használat: npm run verify:sweep  (minden kör vége előtt — agent-fegyelem, CLAUDE.md ÁLLANDÓK)

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
// SWV-01 (OB-10, R16 §2): a verdikt a gyermek GÉPI deklarációjából dől el, nem részszövegből.
import { sweepVerdict } from './lib/vs_sweep_verdict.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const allScripts = Object.keys(pkg.scripts || {})
  .filter((s) => s.startsWith('verify:') && s !== 'verify:sweep')
  .sort();

// CÉLZOTT SÖPRÉS (R67 F67-03): a több-tízperces láncok NEVESÍTETT kihagyása — de csak AZONOSSÁG mellett.
//   npm run verify:sweep -- --skip verify:external-checks,verify:v3ref --reuse <commit>
// A kihagyott verifier BEMENETI útjai (alább) a `--reuse` commithoz mérve VÁLTOZATLANOK kell legyenek
// (git diff), különben a kihagyás ELUTASÍTVA és a verifier lefut. Az újrahasznált bizonyíték státusza
// külön sor a kimenetben: „KIHAGYVA — a <commit> eredménye érvényes, azonosság mérve". Nem „a mag nem
// változott" alapon, hanem a mért diffen (KUKA-038: a létezés nem bizonyíték, a mérés az).
// A bemenet a FORRÁS, nem a kimenet: a `results/` (a lánc saját írása) és a `source-documents/` (a körök
// lapjai, a próbák nem olvassák) kizárva — különben egy új kör-lap mentése hamisan „változott bemenetet" mérne.
const CORE = ['v3ref', ':(exclude)v3ref/external-checks/results', ':(exclude)v3ref/source-documents', 'contracts'];
// A package.json-ból CSAK a lánc által futtatott szkriptek számítanak bemenetnek (a többi szkript, pl. egy új
// mérő felvétele, nem változtat a lánc eredményén) — ezért nem az egész fájl, hanem a nevezett előtagok.
const SCRIPT_PREFIXES = ['verify:v3ref', 'verify:external-checks', 'v3ref:', 'proof:'];
function chainScriptsAt(ref) {
  const raw = ref === 'HEAD' ? readFileSync(join(ROOT, 'package.json'), 'utf8') : execSync(`git show ${ref}:package.json`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  const sc = JSON.parse(raw).scripts || {};
  return JSON.stringify(Object.fromEntries(Object.entries(sc).filter(([k]) => SCRIPT_PREFIXES.some((p) => k.startsWith(p))).sort()));
}
const SKIP_INPUTS = {
  'verify:external-checks': [...CORE, 'tools/vs_verify_external_checks.mjs'],
  'verify:v3ref': CORE,
};
const argv = process.argv.slice(2);
const argOf = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const skipReq = String(argOf('--skip') || '').split(',').map((x) => x.trim()).filter(Boolean);
const reuse = argOf('--reuse');
const skipped = []; const skipRefused = [];
for (const s of skipReq) {
  const inputs = SKIP_INPUTS[s];
  if (!inputs) { skipRefused.push({ s, why: 'nincs deklarált bemeneti útja — csak nevesített láncot lehet kihagyni' }); continue; }
  if (!reuse) { skipRefused.push({ s, why: 'nincs --reuse <commit>, amihez az azonosság mérhető' }); continue; }
  try {
    execSync(`git diff --quiet ${reuse} HEAD -- ${inputs.map((x) => `'${x}'`).join(' ')}`, { cwd: ROOT, stdio: 'ignore' });
    if (chainScriptsAt(reuse) !== chainScriptsAt('HEAD')) throw new Error('a lánc szkriptjei változtak a package.json-ban');
    skipped.push({ s, reuse, inputs });
  } catch (e) {
    skipRefused.push({ s, why: `a bemenete VÁLTOZOTT a(z) ${reuse} óta (${inputs.filter((x) => !x.startsWith(':(')).join(', ')}, lánc-szkriptek; ${e.message || e}) — a régi eredmény nem érvényes, lefut` });
  }
}
const scripts = allScripts.filter((s) => !skipped.some((k) => k.s === s));

// A SÖPRÉS TÜRELME NEM MÉRCE (a SAJÁT söprésem lelete, R81). A régi 180 000 ms a `verify:external-
// checks` láncát PONT akkor vágta el, amikor az R81-es programokkal ~200 mp-re nőtt — és a
// kivágást a söprés PIROSNAK jelentette, holott a verifier külön futtatva NULLÁVAL zárt. Két külön
// dolog csúszott egy csatornára (KUKA-002): „a verifier ELBUKOTT" és „a söprés nem várta meg".
// Ezért (1) a türelem akkora, hogy a leghosszabb lánc kétszerese beleférjen, és (2) a KIVÁGÁS
// SAJÁT, nevezett válasz — nem piros, hanem „NEM FEJEZŐDÖTT BE", a futási idővel együtt, hogy
// látszódjon, mennyivel nőtt túl (KUKA-124/2 · KUKA-064: a nemleges válasz mondja meg a teendőt).
const PATIENCE_MS = 900000;
const t0 = Date.now();
let pass = 0;
const envSkips = [];
const timedOut = [];
const fails = [];
for (const s of scripts) {
  const started = Date.now();
  let exitCode = 0; let out = ''; let killed = false;
  try {
    out = String(execSync(`npm run -s ${s}`, { stdio: ['ignore', 'pipe', 'pipe'], cwd: ROOT, timeout: PATIENCE_MS }) || '');
  } catch (e) {
    killed = e.code === 'ETIMEDOUT' || e.signal === 'SIGTERM';
    exitCode = typeof e.status === 'number' ? e.status : 1;
    out = `${e.stdout || ''}\n${e.stderr || ''}`;
  }
  // A DÖNTÉST A KÖZÖS FELOLDÓ HOZZA (SWV-01). A régi alak itt, helyben keresett részszöveget: ha a
  // bukott gyermek kimenetében BÁRHOL szerepelt az „ENV-KIHAGYÁS", az EGÉSZ ellenőrző kihagyássá
  // vált — és a `verify:external-checks` SAJÁT, szabályos jelentése épp ezt a szót tartalmazza.
  // Hiba és kihagyás együtt nem lehet tiszta kihagyás (OB-10).
  const v = sweepVerdict({ exitCode, timedOut: killed, stdout: out });
  if (v.verdict === 'green') { pass += 1; continue; }
  if (v.verdict === 'unfinished') { timedOut.push({ s, ms: Date.now() - started }); continue; }
  if (v.verdict === 'env_skipped') { envSkips.push({ s, reason: v.reason }); continue; }
  fails.push(s);
  console.error(`\n=== PIROS: ${s} === (${v.why})`);
  console.error(String(out).trim().split('\n').slice(-12).join('\n'));
}

const secs = Math.round((Date.now() - t0) / 1000);
console.log(`\nSÖPRÉS (${scripts.length} verifier${skipped.length ? ` + ${skipped.length} nevesített kihagyás` : ''}, ${secs}s): ${pass} zöld · ${envSkips.length} env-kihagyás`
  + `${timedOut.length ? ` · ${timedOut.length} NEM FEJEZŐDÖTT BE` : ''} · ${fails.length} piros`);
for (const k of skipped) console.log(`KIHAGYVA — ${k.s}: a(z) ${k.reuse} commit eredménye érvényes, azonosság MÉRVE (${k.inputs.filter((x) => !x.startsWith(':(')).join(', ')} és a lánc szkriptjei változatlanok a git szerint; a results/ és a source-documents/ nem bemenet)`);
for (const k of skipRefused) console.log(`KIHAGYÁS ELUTASÍTVA — ${k.s}: ${k.why}`);
if (timedOut.length) {
  console.error(`NEM FEJEZŐDÖTT BE a söprés türelmén (${Math.round(PATIENCE_MS / 1000)}s) belül: `
    + timedOut.map((t) => `${t.s} (${Math.round(t.ms / 1000)}s)`).join(', '));
  console.error('  Ez NEM azt jelenti, hogy a verifier elbukott — futtasd külön, és nézd meg a saját eredményét.');
}
if (envSkips.length) {
  console.log('ENV-KIHAGYÁS (a gyermek MAGA deklarálta, gépi alakban — a söprés nem szövegből következtet):');
  for (const e of envSkips) console.log(`  · ${e.s} — ${e.reason}`);
}
if (fails.length) console.error(`PIROS: ${fails.join(', ')}`);
if (fails.length || timedOut.length) process.exit(1);
