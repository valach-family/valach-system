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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const scripts = Object.keys(pkg.scripts || {})
  .filter((s) => s.startsWith('verify:') && s !== 'verify:sweep')
  .sort();

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
  try {
    execSync(`npm run -s ${s}`, { stdio: ['ignore', 'pipe', 'pipe'], cwd: ROOT, timeout: PATIENCE_MS });
    pass += 1;
  } catch (e) {
    if (e.code === 'ETIMEDOUT' || e.signal === 'SIGTERM') {
      timedOut.push({ s, ms: Date.now() - started });
      continue;
    }
    const out = `${e.stdout || ''}\n${e.stderr || ''}`;
    // NEVESÍTETT KIHAGYÁS: a környezet hiánya (adatbázis · külön települő csomagfa) nem piros, de
    // nem is néma zöld — a összefoglaló FELSOROLJA. A jelet a verifier mondja ki magáról.
    if (/DATABASE_URL is not set|db_not_configured|ENV-KIHAGYÁS/.test(out)) {
      envSkips.push(s);
    } else {
      fails.push(s);
      console.error(`\n=== PIROS: ${s} ===`);
      console.error(String(out).trim().split('\n').slice(-12).join('\n'));
    }
  }
}

const secs = Math.round((Date.now() - t0) / 1000);
console.log(`\nSÖPRÉS (${scripts.length} verifier, ${secs}s): ${pass} zöld · ${envSkips.length} env-kihagyás`
  + `${timedOut.length ? ` · ${timedOut.length} NEM FEJEZŐDÖTT BE` : ''} · ${fails.length} piros`);
if (timedOut.length) {
  console.error(`NEM FEJEZŐDÖTT BE a söprés türelmén (${Math.round(PATIENCE_MS / 1000)}s) belül: `
    + timedOut.map((t) => `${t.s} (${Math.round(t.ms / 1000)}s)`).join(', '));
  console.error('  Ez NEM azt jelenti, hogy a verifier elbukott — futtasd külön, és nézd meg a saját eredményét.');
}
if (envSkips.length) console.log(`ENV-KIHAGYÁS (hiányzó környezet — adatbázis vagy külön települő csomagfa; élesen ezek is futnak): ${envSkips.join(', ')}`);
if (fails.length) console.error(`PIROS: ${fails.join(', ')}`);
if (fails.length || timedOut.length) process.exit(1);
