// playwright.diag.config.mjs — A DIAGNOSZTIKAI LAPOK FUTTATÓJA (R190, az R189 §3 nyitott tételéhez).
//
// MIÉRT KÜLÖN KONFIGURÁCIÓ, ÉS MIÉRT NEM EGY `--testMatch` KAPCSOLÓ. Mérve: ennek a futtatónak
// (Playwright 1.56) NINCS `--testMatch` parancssori kapcsolója — a `npx playwright test
// --testMatch=…` hívás `unknown option`-nal áll meg. A gyűjtési minta tehát csak KONFIGURÁCIÓBÓL
// állítható, és egy nem létező kapcsolót dokumentálni ugyanaz a hiba, mint egy hamis feliratot
// kiírni (KUKA-050: a szöveg a valóságot követi).
//
// MIT VÁLTOZTAT: EGYETLEN dolgot — a gyűjtési mintát (`*.diag.mjs` a `*.spec.mjs` helyett). Minden
// más (a tároló, a kiszolgáló indítása, a soros futás, a türelmek) az ALAP konfigurációból jön,
// mert két másolat előbb-utóbb elcsúszna egymástól (KUKA-003 · KUKA-018: egy fogalom, egy otthon).
//
// MIÉRT NEM LÁTJA EZT A KÖTELEZŐ KAPU: a kapu a `tests/e2e/*.spec.mjs` fájlokat követeli meg a
// jelentésben, és a diagnosztika neve `*.diag.mjs` — a kapu 154 helyzete és 26 fájlja tehát
// VÁLTOZATLAN, a RÉGI bizonyítékkal összevethető marad.
//
//   npm run diag:r190-k3                       # mind az öt eset
//   npm run diag:r190-k3 -- -g "R190-D4"       # egy eset
import alap from './playwright.config.mjs';

export default { ...alap, testMatch: '**/*.diag.mjs' };
