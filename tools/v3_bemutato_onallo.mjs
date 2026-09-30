#!/usr/bin/env node
// tools/v3_bemutato_onallo.mjs — A KATTINTHATÓ BEMUTATÓ ÖNÁLLÓ, ÁTADHATÓ ALAKJA.
//
// MIÉRT LÉTEZIK (R125 kikötése): „a kattintható HTML teljes reprodukálható forrása is legyen a
// repóban, pontos útvonallal és generálási paranccsal, vagy közvetlenül átadható HTML-ként, a
// megnyitható hivatkozás mellett. Ne csak az artifact privát nézetében éljen."
//
// A FORRÁS EGY, A KIMENET KETTŐ. A kanonikus forrás a publikált artifact-alak:
// `docs/bemutato/V3_R121_ADATKOROK_BEMUTATO.artifact.html`. Az az alak SZÁNDÉKOSAN nem teljes
// dokumentum: a közzétevő tesz rá `<!doctype html>`-t, `<html>`-t, `<head>`-et és `<body>`-t. Ez a
// szerszám ugyanabból a forrásból ÖNÁLLÓ dokumentumot ír, amit böngészőben, hálózat nélkül is meg
// lehet nyitni és át lehet adni.
//
// MIÉRT NEM KÉT KÉZI FÁJL: két másolat elcsúszik (KUKA-039 — egy tény, egy otthon). A második
// alak SZÁRMAZTATOTT, ezért a `var/` alá megy, a `contracts/artifactNaming.js` szabálya szerint.
//
// AMIT KIMONDVA NEM TESZ: nem tölt fel semmit, nem hív hálózatot, és nem állítja, hogy a publikált
// artifact bájtra ugyanez — a publikálás a saját vázát adja hozzá. Azt állítja, hogy a TARTALOM
// (a lap szövege, stílusa és viselkedése) ugyanabból az egy forrásból származik.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import naming from '../contracts/artifactNaming.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const FORRAS = resolve(REPO, 'docs/bemutato/V3_R121_ADATKOROK_BEMUTATO.artifact.html');
const VERZIO = JSON.parse(readFileSync(resolve(REPO, 'package.json'), 'utf8')).version;

const toredek = readFileSync(FORRAS, 'utf8');
const lenyomat = `sha256:${createHash('sha256').update(toredek).digest('hex')}`;

// A `<title>` és a `<link>` a töredék tetején áll (így kéri a közzétevő szerződése) — az önálló
// alakban ezeket a `<head>`-be kell tenni, a többit a `<body>`-ba. A vágás a `<div class="wrap">`
// nyitásánál van, mert az a lap első törzs-eleme.
const vagas = toredek.indexOf('<div class="wrap">');
if (vagas < 0) throw new Error('v3_bemutato_onallo: a forrásban nincs `<div class="wrap">` — a vágási pont megváltozott');
const fej = toredek.slice(0, vagas).trim();
const torzs = toredek.slice(vagas).trim();

const onallo = `<!doctype html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<!-- SZÁRMAZTATOTT FÁJL — kézzel nem szerkesztjük.
     forrás:  docs/bemutato/V3_R121_ADATKOROK_BEMUTATO.artifact.html
     lenyomat: ${lenyomat}
     parancs: npm run bemutato:onallo -->
${fej}
<style>
  /* A közzétevő vázának megfelelő alap — önálló alakban nekünk kell megadni. */
  :root{color-scheme:light}
  html,body{margin:0}
  body{font:14px/1.5 system-ui,sans-serif}
  img{max-width:100%}
  [hidden]{display:none!important}
</style>
</head>
<body>
${torzs}
</body>
</html>
`;

const cel = naming.artifactPath({ area: 'reports', kind: 'v3app_r121_adatkorok_bemutato', ext: 'html', version: VERZIO });
mkdirSync(dirname(cel), { recursive: true });
writeFileSync(cel, onallo, 'utf8');

console.log('A BEMUTATÓ ÖNÁLLÓ ALAKJA ELKÉSZÜLT');
console.log('='.repeat(78));
console.log(`  forrás:    docs/bemutato/V3_R121_ADATKOROK_BEMUTATO.artifact.html`);
console.log(`  lenyomat:  ${lenyomat}`);
console.log(`  kimenet:   ${cel.replace(`${REPO}/`, '')}`);
console.log(`  méret:     ${onallo.length} bájt · hálózat nélkül megnyitható`);
console.log('');
console.log('  A publikált, megnyitható alak: https://claude.ai/artifact/NDfQsPZYDQ6myj9Cnf5wCo');
console.log('  (a publikálás a saját dokumentum-vázát adja hozzá — a TARTALOM ugyanez az egy forrás)');
