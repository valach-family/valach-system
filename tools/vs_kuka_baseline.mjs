#!/usr/bin/env node
/**
 * A MEGŐRZÖTT MEMÓRIA SORONKÉNTI ALAPVONALA — előállító és visszamérő (R10-F04).
 *
 * MIÉRT SZÜLETETT. A külső fél R10-F04 lelete a SAJÁT őrömről szólt: a KUK04 „nem csonkolt"
 * ígéretét PADLÓKKAL mértem (legrövidebb sor ≥ 100 karakter · összméret ≥ 170 000 bájt), és MÉRVE
 * ez nem teljesítette az ígéretet — az ELSŐ sort 238 karakterről 120-ra vágva a battéria végig
 * **244/244 PASS** maradt. A padló egy MÁSIK kérdésre felel („van-e egyáltalán tartalom?"), mint
 * amit az ígéret mond („megvan-e MINDEN sor, VÁLTOZATLANUL?"). Ez a KUKA-045 alakja a
 * szöveg-megőrzésen: ahol a szabály megfogalmazható, ott ne darabszámot mérjünk.
 *
 * MIT MÉR EZ, ÉS MIT NEM — KIMONDVA.
 *   · MÉRI: minden alapvonalbeli sor MEGVAN-e, és BÁJTRA azonos-e (sha256). A csonkolás, a
 *     kiegészítés, a néma átfogalmazás és a sor eltűnése MIND piros, mert mind megváltoztatja a
 *     lenyomatot. A HOSSZ-TÖLTELÉK sem segít: nem a hosszt mérjük, hanem a tartalmat.
 *   · NEM MÉRI: hogy a sor TARTALMA helyes-e. Egy szándékos, rossz átírás az alapvonal
 *     újragenerálásával „legalizálható". Amit ez az őr ad, az nem megváltoztathatatlanság, hanem
 *     LÁTHATÓSÁG: a változás NEM történhet véletlenül és nem maradhat néma — bekerül a
 *     verziókövetésbe, és a commit diffjében el kell számolni vele (KUKA-127 rokona: a gyengébb
 *     jel ERŐSSÉGÉT is ki kell írni, nem eltitkolni).
 *
 * AZ AZONOSÍTÓ A SOR ELSŐ CELLÁJÁBÓL JÖN, NEM A SZÖVEGBŐL (KUKA-134). A táblázat 157 sorából
 * **128 hivatkozik MÁSIK KUKA-azonosítóra** a szövegtörzsében („…KUKA-039 rokona…"). Egy egyszerű
 * `KUKA-\d{3}` keresés tehát a sorok többségét ROSSZ kulcs alá tenné, és az alapvonal önmagával
 * kerülne ellentmondásba. Ami a szövegben csak ELŐFORDUL, az idézet; ami DEKLARÁL, az az ELSŐ
 * cella — és ezt SZERKEZETI jelre bízzuk, nem újabb, mondatokra illesztett mintára.
 *
 * HASZNÁLAT:
 *   node tools/vs_kuka_baseline.mjs           # összeveti a mai archívumot az alapvonallal
 *   node tools/vs_kuka_baseline.mjs --write   # ÚJ alapvonalat ír (tudatos lépés, verzióval)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

export const ARCHIVE_REL = 'docs/KUKA_ARCHIVUM.md';
export const BASELINE_REL = 'contracts/kukaArchiveBaseline.json';

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

/**
 * A TÁBLA SORAI, SZERKEZETI KULCCSAL.
 *
 * A `|` kezdetű, `**KUKA-nnn**` első cellájú sorok a BEJEGYZÉSEK. Minden más sor — fejléc,
 * elválasztó, próza — nem tartozik ide. A duplikált azonosító NEM csendes felülírás: nevezett hiba,
 * mert két sor egy kulcson azt jelentené, hogy az egyik némán kimarad a mérésből (KUKA-012).
 */
export function archiveRows(md) {
  const rows = new Map();
  const duplicates = [];
  for (const line of md.split('\n')) {
    const m = /^\|\s*\*\*(KUKA-\d{3})\*\*/.exec(line);
    if (!m) continue;
    const id = m[1];
    if (rows.has(id)) { duplicates.push(id); continue; }
    rows.set(id, line);
  }
  return { rows, duplicates };
}

export function baselineFrom(md, version) {
  const { rows, duplicates } = archiveRows(md);
  const entries = {};
  for (const [id, line] of rows) entries[id] = { sha256: sha256(line), chars: line.length };
  return {
    baseline_version: version,
    generated_from: ARCHIVE_REL,
    row_count: rows.size,
    archive_sha256: sha256(md),
    archive_bytes: Buffer.byteLength(md, 'utf8'),
    duplicates,
    rows: entries,
  };
}

/**
 * VISSZAMÉRÉS. Négy KÜLÖN válasz, mert négy külön teendő (KUKA-124/2):
 *   · `changed`  — a sor megvan, de MÁS (csonkolás · átírás · töltelék) → HIBA
 *   · `missing`  — az alapvonalbeli sor eltűnt → HIBA
 *   · `added`    — új sor, amiről az alapvonal még nem tud → NEM hiba (szabályos bővülés), de
 *                  NEVESÍTVE, mert az alapvonalat frissíteni kell
 *   · `duplicates` — ugyanaz a kulcs kétszer → HIBA
 */
export function compare(md, baseline) {
  const { rows, duplicates } = archiveRows(md);
  const changed = []; const missing = []; const added = [];
  for (const [id, spec] of Object.entries(baseline.rows || {})) {
    if (!rows.has(id)) { missing.push(id); continue; }
    const line = rows.get(id);
    const now = sha256(line);
    if (now !== spec.sha256) changed.push({ id, was_chars: spec.chars, now_chars: line.length });
  }
  for (const id of rows.keys()) if (!(baseline.rows || {})[id]) added.push(id);
  return { changed, missing, added, duplicates, row_count: rows.size };
}

function main() {
  const write = process.argv.includes('--write');
  const md = readFileSync(join(ROOT, ARCHIVE_REL), 'utf8');
  const path = join(ROOT, BASELINE_REL);

  if (write) {
    const prev = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
    const version = (prev && Number(prev.baseline_version) || 0) + 1;
    const next = baselineFrom(md, version);
    writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    console.log(`alapvonal ÍRVA: ${BASELINE_REL} · verzió ${version} · ${next.row_count} sor · `
      + `archívum ${next.archive_bytes} bájt`);
    if (prev) {
      const d = compare(md, prev);
      console.log(`  az ELŐZŐ alapvonalhoz képest: ${d.changed.length} változott · ${d.missing.length} eltűnt · ${d.added.length} új`);
      for (const c of d.changed) console.log(`    VÁLTOZOTT ${c.id}: ${c.was_chars} → ${c.now_chars} karakter`);
      for (const m of d.missing) console.log(`    ELTŰNT ${m}`);
    }
    return 0;
  }

  if (!existsSync(path)) { console.log(`HIÁNYZIK az alapvonal: ${BASELINE_REL} — futtasd: --write`); return 1; }
  const baseline = JSON.parse(readFileSync(path, 'utf8'));
  const d = compare(md, baseline);
  console.log(`alapvonal v${baseline.baseline_version} · ${Object.keys(baseline.rows).length} sor · `
    + `ma ${d.row_count} sor`);
  for (const c of d.changed) console.log(`  VÁLTOZOTT ${c.id}: ${c.was_chars} → ${c.now_chars} karakter`);
  for (const m of d.missing) console.log(`  ELTŰNT ${m}`);
  for (const a of d.added) console.log(`  ÚJ ${a} (az alapvonal régebbi — frissítsd: --write)`);
  const bad = d.changed.length + d.missing.length + d.duplicates.length;
  console.log(bad ? `RESULT: ${bad} eltérés` : 'RESULT: minden alapvonalbeli sor VÁLTOZATLAN');
  return bad ? 1 : 0;
}

if (resolve(process.argv[1] || '') === resolve(fileURLToPath(import.meta.url))) process.exit(main());
