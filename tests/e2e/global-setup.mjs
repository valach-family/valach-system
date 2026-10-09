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
import { execFileSync } from 'node:child_process';
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
  // A SZIMULÁLT BEMUTATÓ-LAP (R89 · R112 történetek) AZ ELŐKÉSZÍTÉS RÉSZE (R111): a lap származtatott
  // (`docs/_olvashato/`, gitignore), tehát friss klónban nincs meg — a próba nem bukhat a hiányán.
  // A generátor a repóban álló bizonyíték-lapot olvassa; a futás jelentéséből NEM ír vissza.
  execFileSync(process.execPath, [resolve(ROOT, 'tools/v3_r89_bemutato.mjs')], { cwd: ROOT, stdio: 'ignore' });
  // ── A BÖNGÉSZŐS PRÓBAPAD AZ ELKÜLÖNÍTETT BEMUTATÓ-KÖRNYEZET (R158/2) ──────────────────────────
  //
  // MIÉRT KELL. A próbapad a doktrína `demo` környezete: SAJÁT, eldobható tárolón futó, elkülönített
  // bemutató (CLAUDE.md 5. szakasz). A jel ezt a környezetet mondja ki.
  //
  // AMIT EZ A JEL ÖNMAGÁBAN NEM NYIT KI — ÉS EZ A R164/3 JAVÍTÁSA. Két végigvezetés
  // (`tour.inviteRevoke` · `tour.reentry`) KÉT ÉLŐ MUNKAMENETET kér, tehát „váltás a másik nézetére"
  // vezérlőt. A R158/2-ben ezeket a KÖRNYEZET jele kapuzta — csak hogy ez a próbapad a VALÓDI
  // alkalmazás-héjat futtatja, amiben ilyen vezérlő NINCS: a két bemutató felkínálódott, és a hatodik
  // lépésén megszakadt, miközben a próba épp ezt a megszakadást írta elő ELVÁRT eredménynek. Ez hamis
  // zöld volt a kötelező böngésző-kapuban (KUKA-227). A felkínálás ma a BETÖLTÖTT FELÜLET horgonyaihoz
  // kötött (`surface_anchors`), tehát itt a két történet NEVEZETTEN nem kínálódik fel — a
  // végigvitelüket a bemutató LAPJÁN mérjük (`npm run proof:demo-walk`, a kötelező kapu része).
  //
  // AMIT EZ NEM KAPCSOL BE — ÉS EZT MÉRJÜK IS (findings_r154 „U" csoport, u1–u9). A `VS_DEMO` jel a
  // kiszolgálón EGYETLEN döntést érint: a `requires_demo` végigvezetések felkínálását
  // (`v3app/assistant/policy.mjs` → `allowedToursFor`), és ott is CSAK a felület-feltétellel EGYÜTT.
  // NEM ad jogot, NEM kerül meg jogosultsági kaput, és NEM kapcsolja be a böngésző-oldali
  // bemutató-adaptert sem: azt a lap `vs-demo` meta jele telepíti, amit a repó `index.html`-je nem
  // hordoz.
  process.env.VS_DEMO = '1';
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
