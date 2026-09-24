// tests/e2e/global-setup.mjs — A FUTÁSONKÉNTI SZERVER ÉS TÁROLÓ (R64).
//
// A valódi `v3app/server.mjs` indul, szabad porton, SAJÁT tárolóval a `var/tmp` alatt. A tároló
// neve a közös feloldóból jön (ART-01); a futás végén a fájl törlődik (a `tmp` terület
// „bármikor törölhető" — a bizonyíték nem a tároló, hanem a jelentés). A címet, a tároló útját és
// a bizonyíték-lap útját környezeti változó viszi a munkásokhoz: a munkás ugyanezt a fájlt
// MÁSODIK kapcsolaton olvassa (WAL-napló, `openStoreAt`), tehát az adatbázis-oldali bizonyíték
// nem a szerver válaszából, hanem a tárolt sorból jön.
import { createRequire } from 'node:module';
import { readFileSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { startServer } from '../../v3app/server.mjs';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { artifactPath } = require('../../contracts/artifactNaming.js');
const VERSION = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).version;

export default async function globalSetup() {
  const dbPath = resolve(ROOT, artifactPath({ area: 'tmp', kind: 'v3app_e2e', ext: 'sqlite', version: VERSION }));
  const evidencePath = resolve(ROOT, artifactPath({ area: 'reports', kind: 'v3app_elfogadas_helyzetek', ext: 'json', version: VERSION }));
  // Az R81 UX-feltételeinek SAJÁT bizonyíték-lapja (a két lap nem írja felül egymást).
  const uxPath = resolve(ROOT, artifactPath({ area: 'reports', kind: 'v3app_ux_elfogadas', ext: 'json', version: VERSION }));
  const app = await startServer({ port: 0, dbPath });
  process.env.VS_E2E_BASE_URL = `http://127.0.0.1:${app.port}`;
  process.env.VS_E2E_DB_PATH = dbPath;
  process.env.VS_E2E_EVIDENCE_PATH = evidencePath;
  process.env.VS_E2E_UX_PATH = uxPath;
  process.env.VS_E2E_VERSION = VERSION;
  console.log(`[e2e] v3app fut: ${process.env.VS_E2E_BASE_URL} · tároló: ${dbPath}`);
  console.log(`[e2e] bizonyíték-lap: ${evidencePath}`);
  console.log(`[e2e] UX bizonyíték-lap: ${uxPath}`);
  console.log(`[e2e] futás-jelentés: ${process.env.VS_E2E_REPORT_PATH}`);
  return async () => {
    await app.close();
    for (const suffix of ['', '-wal', '-shm']) { if (existsSync(dbPath + suffix)) rmSync(dbPath + suffix, { force: true }); }
  };
}
