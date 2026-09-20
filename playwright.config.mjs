// playwright.config.mjs — A V3APP BÖNGÉSZŐ-BIZONYÍTÉK FUTTATÓJA (R64 · CMD-VS-300-002-002).
//
// EGY SZERVER FUTÁSONKÉNT: a `tests/e2e/global-setup.mjs` indítja a valódi HTTP-héjat
// (`startServer({ port: 0, dbPath })`) a globális előkészítésben, és a címét KÖRNYEZETI VÁLTOZÓN
// adja át a munkás-folyamatoknak — a `use.baseURL` innen töltődik. A tároló útja és a jelentés
// útja SOHA nem kézzel írt időbélyeges név: mindkettő a `contracts/artifactNaming.js` feloldójából
// jön (ART-01 · KUKA-003), tehát a `verify:artifact-naming` őr nem tud pirosra váltani.
//
// SZIGORÚAN SOROS: `workers: 1`, `fullyParallel: false`, `retries: 0` — a helyzetek egymásra
// épülő világot NEM osztanak meg, de EGY tárolón futnak, és az ismétlés a hibát elfedné.
import { defineConfig, devices } from '@playwright/test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = dirname(fileURLToPath(import.meta.url));
const { artifactPath } = require('./contracts/artifactNaming.js');
const VERSION = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')).version;

// A JELENTÉS ÚTJA EGYSZER születik (a futtató folyamatban), és a munkások örökölik — különben a
// konfiguráció minden újraolvasása MÁS másodpercet tenne a névbe (KUKA-018: egy tény, egy otthon).
if (!process.env.VS_E2E_REPORT_PATH) {
  process.env.VS_E2E_REPORT_PATH = resolve(ROOT, artifactPath({ area: 'reports', kind: 'v3app_e2e_eredmeny', ext: 'json', version: VERSION }));
}

export default defineConfig({
  testDir: 'tests/e2e',
  // A futtató SAJÁT kimenete (hiba-kontextus) is a `var/` alá megy — a repó gyökerén generált
  // könyvtár nem állhat (ART-01: minden generált kimenet egy otthonban).
  outputDir: resolve(ROOT, 'var/tmp/v3app_e2e_kimenet'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 180_000,
  expect: { timeout: 10_000 },
  globalSetup: './tests/e2e/global-setup.mjs',
  reporter: [['list'], ['json', { outputFile: process.env.VS_E2E_REPORT_PATH }]],
  use: {
    baseURL: process.env.VS_E2E_BASE_URL,
    locale: 'hu-HU',
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
