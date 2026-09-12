// R53/F03 — A TÁMADÁS ÚJRAFOGALMAZVA A MAI SZERZŐDÉSRE (Claude-AUX, R54).
//
// MIÉRT KELL ÚJRAFOGALMAZNI. Az eredeti F03 eset a `norms.mjs` szövegében cserélte a
// `probe: 'P-CMD-finalize-gate'` bejegyzést `probe: 'P-A04'`-re. A mai forrásban ilyen mező NINCS:
// az R53 §4/2 kifejezett kérése volt, hogy „a norma ne szabadon választott próbanevet tároljon".
// A csere ezért NO-OP, és az eredeti eset azért mutat `pass:true`-t, mert a kapu a régi HÍVÁSI
// ALAKRA (puszta próbanév-lista) fail-closed — vagyis MÁST mér, mint amit a cím ígér.
//
// EZ A PROGRAM AZ EREDETI TÁMADÁS EGYENÉRTÉKŰ ALAKJA. A kötés iránya megfordult, tehát az
// átkötést ott kell megkísérelni, ahol ma él: a MANIFESTBEN. Két eset:
//   G01 — a REV-N1a beváltását áttesszük az idegen, de LÉTEZŐ `P-A04` próbára. Elvárás: a futás
//         2-es kóddal zár, és a norma-index KIMONDJA, hogy a próba nem adta ki a deklarált
//         állítást. (Az eredeti F03 szándéka, végpontról végpontig mérve.)
//   G02 — ELLENPÁR: érintetlen forrás. Elvárás: 0-s kód, és a REV-N1a/REV-N1b fedett. Enélkül a
//         G01 pirosa semmit nem bizonyít — lehetne, hogy MINDEN pirosra megy.
//
// Használat (a `source/` a mért forrás másolata, ahogy az eredeti programnál is):
//   node f03-restated.mjs
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

// A FUTÁS-KÖTÉS A RÉSZLETES EREDMÉNYBEN (R61/F02). A külső fél kimondta: „idegen forráshoz vagy
// futáshoz kötött fájl ne adjon `complete_evidence: true` értéket". Ehhez a fájlnak MEG KELL NEVEZNIE,
// melyik forrás-állapoton készült — ez a mi SAJÁT programunk, tehát a hiányt itt pótoljuk, nem
// kivételt adunk rá a futtatóban (KUKA-048: a kivétel hatókörét a mérce dönti el, nem a fájl).
const PIN = JSON.parse(readFileSync('./source-manifest.json', 'utf8')).commit;
const out = { program: 'f03-restated.mjs', pin: PIN, at: new Date().toISOString(), node: process.version, cases: [] };

function runCopy(patch) {
  const dir = mkdtempSync(join(tmpdir(), 'r53-f03r-'));
  try {
    cpSync('./source', dir, { recursive: true });
    if (patch) patch(dir);
    const q = spawnSync(process.execPath, [join(dir, 'v3ref/run.mjs'), '--json', '--executed-by=ChatGPT'],
      { encoding: 'utf8', timeout: 15000 });
    let json = null;
    try { json = JSON.parse(q.stdout); } catch { /* a kimenet nem értelmezhető — ezt is jelentjük */ }
    return { exit: q.status, json, stderr: (q.stderr || '').trim().split('\n').slice(0, 4).join(' | ') };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

// ── G01: átkötés idegen, de LÉTEZŐ próbára ────────────────────────────────────────────────────
{
  const anchorFrom = "  Object.freeze({ id: 'P-A04', assertion: 'A04-two-worlds-byte-identical' }),";
  const anchorTo = "  Object.freeze({ id: 'P-A04', assertion: 'A04-two-worlds-byte-identical',\n"
    + "    discharges: Object.freeze([Object.freeze({ clause: 'REV-N1a', assertion: 'A-REV-N1a-dependent-new-op-and-release-blocked' })]) }),";
  const dropFrom = "      Object.freeze({ clause: 'REV-N1a', assertion: 'A-REV-N1a-dependent-new-op-and-release-blocked' }),\n";
  const r = runCopy((dir) => {
    const p = join(dir, 'v3ref/manifest.mjs');
    let s = readFileSync(p, 'utf8');
    if (!s.includes(anchorFrom)) throw new Error('horgony (P-A04) nem található');
    if (!s.includes(dropFrom)) throw new Error('horgony (REV-N1a beváltás) nem található');
    s = s.replace(anchorFrom, anchorTo).replace(dropFrom, '');
    writeFileSync(p, s);
  });
  const ev = r.json && r.json.norm_evidence;
  const said = ev ? ev.integrity_problems.some((x) => x.includes('P-A04')
    && x.includes('A-REV-N1a-dependent-new-op-and-release-blocked')) : false;
  out.cases.push({
    id: 'G01',
    expected: 'a norma-index NEM fogadja el az idegen, létező próbára átkötött klauzulát',
    pass: r.exit === 2 && !!ev && ev.integrity_ok === false && said,
    exit: r.exit,
    integrity_ok: ev ? ev.integrity_ok : null,
    integrity_problems: ev ? ev.integrity_problems : null,
    stderr: r.stderr,
  });
}

// ── G02: ELLENPÁR — érintetlen forráson zöld ──────────────────────────────────────────────────
//
// R55/F03 UTÁN ÚJRA-HORGONYOZVA, ÉS EZ A SAJÁT ELAVULÁSOM. Az első alak azt várta, hogy a
// REFERENCIA-futás a két klauzulát `covered`-nek mondja. A külső fél R55/F03/1 pontja ezt
// megdöntötte: a magpróba a mutációs battéria ELŐTT fut, tehát a falszifikációról ott nem
// nyilatkozhat — az állapot `falsification_pending`. A próbát a HATÁRHOZ igazítjuk, nem fordítva:
// itt a KÖZTES állapotot mérjük, a `covered` a battéria dolga (lásd `restated.mjs` N04').
{
  const r = runCopy(null);
  const ev = r.json && r.json.norm_evidence;
  const chain = ev ? ev.chain : [];
  const pending = chain.filter((c) => c.result === 'falsification_pending').map((c) => c.clause_id);
  out.cases.push({
    id: 'G02',
    expected: 'érintetlen forráson a kapu ZÖLD, és a két bizonyítható klauzula állítása teljesült, '
      + 'falszifikáció FÜGGŐBEN (a magpróba nem állít többet, mint amit mért)',
    pass: r.exit === 0 && !!ev && ev.integrity_ok === true && ev.ok === true
      && ev.falsification_stage === 'pending'
      && pending.includes('REV-N1a') && pending.includes('REV-N1b')
      && chain.every((c) => c.result !== 'covered'),
    exit: r.exit,
    falsification_stage: ev ? ev.falsification_stage : null,
    pending_clauses: pending,
    norm_states: ev ? ev.norms : null,
  });
}

writeFileSync('./evidence/f03-restated.json', `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify({ cases: out.cases.map((c) => ({ id: c.id, pass: c.pass, exit: c.exit })) }, null, 2));
