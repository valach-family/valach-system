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

const t0 = Date.now();
let pass = 0;
const envSkips = [];
const fails = [];
for (const s of scripts) {
  try {
    execSync(`npm run -s ${s}`, { stdio: ['ignore', 'pipe', 'pipe'], cwd: ROOT, timeout: 180000 });
    pass += 1;
  } catch (e) {
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
console.log(`\nSÖPRÉS (${scripts.length} verifier, ${secs}s): ${pass} zöld · ${envSkips.length} env-kihagyás · ${fails.length} piros`);
if (envSkips.length) console.log(`ENV-KIHAGYÁS (hiányzó környezet — adatbázis vagy külön települő csomagfa; élesen ezek is futnak): ${envSkips.join(', ')}`);
if (fails.length) {
  console.error(`PIROS: ${fails.join(', ')}`);
  process.exit(1);
}
