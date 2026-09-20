// ADAPTÁCIÓ R63 (verzió: adapted-v1 · forrás: CMD-VS-300-002-002 R63 §4, `v3ref/source-documents/R63_board_v1.md`):
// a próba-világ meghívója NEVEZETT, rögzített felhatalmazási alap alatt, a rendszer SAJÁT kiadóján
// születik — a nyers `INSERT INTO invite …` helyett `recordAuthorityBasis(…)` (`authorityBasis.mjs`,
// BAS-01: `allowedOperations: [invite_issue]` · `allowedRoles: [a kínált szerep]` · `allowedScopes:
// ['keszlet']` · `evidenceRef: 'synthetic:R63-adaptation'`) + `issueInviteUnderBasis(…)`
// (`basisLimit.mjs`, BLI-01, `scope: 'keszlet'`), UGYANAZOKKAL a meghívó-mezőkkel (token · könyv · cím ·
// szerep · kiadó · lejárat), UGYANAZON az órán (T0). Mindkét hívás `.ok`-ját a fixtúra ELLENŐRZI, és
// bukásnál az INDOKKAL dob, hogy egy fixtúra-hiba nevezett FAIL-ként (`test_error`) jelenjen meg, ne
// néma „nem"-ként (KUKA-020). A művelet nevét a szerződéstől kérdezzük (`INVITE_ISSUE_OPERATION`), nem
// gépeljük le (KUKA-036).
//
// MIÉRT: az R63 két szabályt szigorított a magreferenciában. (A) `grantAdjudicationAuthority`
// (`adjudication.mjs`) alap NÉLKÜL DOB (`basis_id_required`), és `authorityRowAt` (`authority.mjs`) az
// alap nélküli (`basis_id` NULL) hatáskör-sort NEM használja (`authority_without_recorded_basis`).
// (B) `redeemInvite` (`invite.mjs` 3/b · `basisLimit.mjs` `redemptionLimitGate`) az `invite_basis`
// pecsét nélküli meghívót ELUTASÍTJA (`invite_without_basis`, `no_declared_basis`) — „Nyers tárolói
// írással keletkezett, alap nélküli meghívó vagy hatáskör nem kerülheti meg az új használati határt."
// Ez a program az R63 ELŐTT született, és a `world()` fixtúrája nyers INSERT-tel írta a meghívót, pecsét
// nélkül — ezért az R63 után a beváltásra épülő HÁROM eset (C11' nyitott ága · N10' (a) ága · F01')
// a fixtúrában, a mért kérdés előtt bukna el (`invite_without_basis`). A piros tehát ELAVULT
// ELŐFELTÉTEL, nem a mért tulajdonság kudarca és nem termékhiba — és NEM nevezzük visszamenőleg
// zöldnek: a szigorítás marad, a TESZT-ELŐFELTÉTEL változik.
//
// AZ (A) SZABÁLY ERRE A PROGRAMRA NEM VONATKOZIK, KIMONDVA: bírálati hatáskört nem ad és nem használ.
//
// AMI NEM VÁLTOZOTT: egyetlen eset-azonosító, elvárás, óra (T0 = 2026-09-10T10:00:00.000Z, és a C11'
// két lejárata), negatív ág (C11' lejárt ága · N10' (a) elutasított UPDATE-je és (b) őr nélküli
// `invite_terms_changed` ága · F01' elutasított átírása), a GUARDS-lista és a triggerek elvétele, a
// mutációs (N04') és a lenyomat- (D01') mérés, az `evidence/restated.json` alakja és a kimenet sem.
// Az N10' (b) ágán a nyers `UPDATE invite SET offered_role='admin'` SZÁNDÉKOS marad: az a pecsét-
// eltérés TÉNYÉT állítja elő, és a beváltás az (1/b) ponton — a 3/b alap-kapu ELŐTT — fogja meg,
// tehát az elvárt válasz (`invite_terms_changed`) az R63 után is ugyanaz. A kiadás a rendszer SAJÁT
// íróin megy (recordAuthorityBasis · issueInviteUnderBasis), tehát a kiadási korlát-kapu is fut —
// nem kiskapu, hanem a GPR-01 `measurement_fixture` használat.
//
// R55 — AZ ÚJRAFOGALMAZOTT ESETEK (Claude-AUX, R56).
//
// MIÉRT KELL. Öt korábbi eset LITERÁLIS alakja a mai szerződésen nem fut le — nem azért, mert a
// határ gyengült, hanem mert SZIGORÚBB lett, vagy mert egy fájl HELYE változott. Ezt nem hagyjuk
// „elbukott" jelzéssel: mindegyikhez itt áll a szándék újrafogalmazása, ELLENPÁRRAL, teljes
// futtatással. A külső fél maga kérte ezt a fegyelmet ("a tesztnek ezt kezelnie kell").
//
//   C11' (R49) - offset-zónás LEJÁRAT: a régi eset a KIADOTT sort írta át; ma a lejárat is pecsételt
//                feltétel, tehát a helyes alak ÚJ meghívó kiadása offset-zónás lejárattal.
//   N10' (R51) - a szerep LEFOKOZÁSA a véglegesítési határon: ma az írás maga elutasított; a MÁSODIK
//                réteget (beváltás-kori pecsét-összevetés) őr NÉLKÜLI tárolón mérjük.
//   F01' (R53) - a kiadott ajánlat átírása beváltás ELŐTT: ma az írás elutasított, és a tagság `user`.
//   N04' (R55) - a REV-N1b visszabontási bizonyítéka NEM az M32: az M32 futása nem buktatja az
//                `A-REV-N1b` állítást, az M47/M48/M49 futása IGEN.
//   D01' (R55) - a K-klauzula CÍMÉNEK megváltozása MEGVÁLTOZTATJA a kiadott szerződés-lenyomatot;
//                az INDEX lenyomatát viszont NEM (a kettő külön artefaktum).
//
// Használat: node restated.mjs   (a `source/` a mért forrás másolata, a `source-manifest.json` a commit)
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { openStore, clockFrom } from './source/v3ref/store.mjs';
import { redeemInvite } from './source/v3ref/invite.mjs';
import { recordAuthorityBasis } from './source/v3ref/authorityBasis.mjs';
import { issueInviteUnderBasis, INVITE_ISSUE_OPERATION } from './source/v3ref/basisLimit.mjs';
import { MUTATIONS } from './source/v3ref/mutations.mjs';
import { indexDigest, contractDigest, normsDigest } from './source/v3ref/norms.mjs';

const root = import.meta.dirname;
const PIN = JSON.parse(readFileSync(join(root, 'source-manifest.json'), 'utf8')).commit;
const T0 = '2026-09-10T10:00:00.000Z';
// ADAPTÁCIÓ R63 (B): a próba-meghívó felhatalmazási alapja — egy nevezett azonosító, egy bizonyíték-
// hivatkozás, egy adatkör (KUKA-036: egy fogalom, egy képző).
const BASIS = Object.freeze({ id: 'synthetic:R63-adaptation:A', evidence: 'synthetic:R63-adaptation', scope: 'keszlet' });
const out = { program: 'restated.mjs', source_commit: PIN, node: process.version, at: new Date().toISOString(), cases: [] };

function world({ expiresAt = '2026-09-30T00:00:00.000Z', role = 'user' } = {}) {
  const store = openStore(); const clock = clockFrom(T0);
  for (const s of ['issuer', 'holder']) store.run('INSERT INTO subject VALUES (?,?)', s, 'person');
  store.run('INSERT INTO book VALUES (?,?)', 'A', 'A');
  store.run('INSERT INTO membership VALUES (?,?,?,?,NULL)', 'issuer', 'A', 'admin', T0);
  store.run('INSERT INTO external_id VALUES (?,?,?,?,?,?,?,?,NULL)', 'holder', 'email', 'self_asserted', 'n/a', 'holder@example.invalid', 'holder@example.invalid', 'one_to_one', T0);
  store.run('INSERT INTO account VALUES (?,?)', 'holder', 'original');
  store.run('INSERT INTO channel_proof VALUES (?,?,?,?)', 'holder', 'email', 'holder@example.invalid', T0);
  // ADAPTÁCIÓ R63 (B): a meghívó NEVEZETT alap alatt, a rendszer SAJÁT kiadóján születik — a régi
  // nyers `INSERT INTO invite VALUES (…)` helyett. A mezők, a token és az óra ugyanazok.
  const basis = recordAuthorityBasis({
    store, basisId: BASIS.id, bookId: 'A', issuerSubject: 'issuer', effectiveAt: T0, recordedAt: T0,
    allowedOperations: [INVITE_ISSUE_OPERATION], allowedRoles: [role], allowedScopes: [BASIS.scope],
    evidenceRef: BASIS.evidence,
  });
  if (!basis.ok) throw new Error(`R63 adaptation: az alap nem rögzíthető — ${basis.reason}`);
  const issued = issueInviteUnderBasis({
    store, token: 'invite', bookId: 'A', inviteeNamespace: 'email', inviteeValue: 'holder@example.invalid',
    offeredRole: role, issuerSubject: 'issuer', expiresAt, basisId: BASIS.id, scope: BASIS.scope, issuedAt: T0,
  });
  if (!issued.ok) throw new Error(`R63 adaptation: a meghívó nem adható ki az alap alatt — ${issued.reason}`);
  return { store, clock };
}
const GUARDS = ['invite_terms_no_update', 'invite_terms_no_delete', 'invite_terms_no_reseal',
  'invite_no_change_sealed', 'invite_no_reissue', 'invite_no_delete_sealed'];
const add = (id, expectation, fn) => {
  try { out.cases.push({ id, expectation, ...fn() }); }
  catch (e) { out.cases.push({ id, expectation, test_error: e.stack }); }
};
function runCopy(patch, file) {
  const dir = mkdtempSync(join(tmpdir(), 'r55r-'));
  try {
    cpSync(join(root, 'source'), dir, { recursive: true });
    if (patch) {
      const p = join(dir, 'v3ref', file);
      const s = readFileSync(p, 'utf8');
      const next = patch(s);
      if (next === s) throw new Error(`a horgony nem talalhato: ${file}`);
      writeFileSync(p, next);
    }
    const q = spawnSync(process.execPath, [join(dir, 'v3ref/run.mjs'), '--json', '--executed-by=Claude-AUX', `--source-commit=${PIN}`],
      { cwd: dir, encoding: 'utf8', timeout: 15000 });
    let data = null;
    try { data = JSON.parse(q.stdout); } catch { /* jelentjük */ }
    return { exit: q.status, data, stderr: (q.stderr || '').trim().split('\n').slice(0, 3).join(' | ') };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

// ── C11' — offset-zónás lejárat, ÚJ meghívón (nem a kiadott sor átírásával) ────────────────────
add('C11-restated', 'Az offset-zónás, MÁR LEJÁRT meghívó nem ad tagságot; a nyitott ablakú IGEN.',
  () => {
    // 2026-09-09T09:00:00+02:00 = 07:00Z — a T0 (2026-09-10T10:00Z) előtt, tehát LEJÁRT.
    const past = world({ expiresAt: '2026-09-09T09:00:00+02:00' });
    const rPast = redeemInvite({ ...past, token: 'invite', actingSubjectId: 'holder' });
    const mPast = past.store.get("SELECT * FROM membership WHERE subject_id='holder'");
    past.store.close();
    // ELLENPÁR: ugyanaz az alak, de a JÖVŐBEN — a próba ne zárjon túl (KUKA-049).
    const open = world({ expiresAt: '2026-09-30T09:00:00+02:00' });
    const rOpen = redeemInvite({ ...open, token: 'invite', actingSubjectId: 'holder' });
    const mOpen = open.store.get("SELECT * FROM membership WHERE subject_id='holder'");
    open.store.close();
    return {
      pass: rPast.ok === false && mPast === undefined && rOpen.ok === true && mOpen && mOpen.role === 'user',
      expired: { result: rPast, membership: mPast ?? null },
      open: { result: rOpen, membership: mOpen ?? null },
    };
  });

// ── N10' — a szerep lefokozása a határon: a tároló zárja, és a MÁSODIK réteg is fogja ──────────
add('N10-restated', 'A lefokozás írása elutasított; őrök NÉLKÜL a beváltás fogja meg, admin SEHOL.',
  () => {
    // (a) A TÁROLÓVAL: a `admin`-ra írás már nem megy.
    const w1 = world();
    let rejected = null;
    try { w1.store.run("UPDATE invite SET offered_role='admin' WHERE token='invite'"); }
    catch (e) { rejected = e.message; }
    const r1 = redeemInvite({ ...w1, token: 'invite', actingSubjectId: 'holder' });
    const m1 = w1.store.get("SELECT * FROM membership WHERE subject_id='holder'");
    w1.store.close();
    // (b) ŐRÖK NÉLKÜL (egy trigger nélküli tároló szimulációja): a beváltás ismeri fel az eltérést.
    const w2 = world();
    for (const t of GUARDS) w2.store.db.exec(`DROP TRIGGER ${t}`);
    w2.store.run("UPDATE invite SET offered_role='admin' WHERE token='invite'");
    const orig = w2.store.tx;
    w2.store.tx = (fn) => { w2.store.run("UPDATE invite SET offered_role='user' WHERE token='invite'"); return orig(fn); };
    const r2 = redeemInvite({ ...w2, token: 'invite', actingSubjectId: 'holder' });
    const m2 = w2.store.all("SELECT * FROM membership WHERE subject_id='holder'");
    w2.store.close();
    return {
      pass: !!rejected && r1.ok === true && m1 && m1.role === 'user'
        && r2.ok === false && r2.error === 'invite_terms_changed' && m2.length === 0,
      with_guards: { rejected, result: r1, membership: m1 ?? null },
      without_guards: { result: r2, memberships: m2.length },
    };
  });

// ── F01' — a kiadott ajánlat átírása beváltás ELŐTT ────────────────────────────────────────────
add('F01-restated', 'A kiadott token szerepe nem írható át; a beváltás `user` tagságot ad.',
  () => {
    const w = world();
    const issued = w.store.get("SELECT offered_role FROM invite_terms WHERE token='invite'");
    let rejected = null;
    try { w.store.run("UPDATE invite SET offered_role='admin' WHERE token='invite'"); }
    catch (e) { rejected = e.message; }
    const result = redeemInvite({ ...w, token: 'invite', actingSubjectId: 'holder' });
    const membership = w.store.get("SELECT * FROM membership WHERE subject_id='holder' AND book_id='A'");
    const sealed = w.store.get("SELECT offered_role FROM invite_terms WHERE token='invite'");
    w.store.close();
    return {
      pass: !!rejected && result.ok === true && membership && membership.role === 'user'
        && issued.offered_role === 'user' && sealed.offered_role === 'user',
      rejected, issued, sealed, result, membership: membership ?? null,
    };
  });

// ── N04' — a REV-N1b bizonyítéka NEM az M32 ────────────────────────────────────────────────────
add('N04-restated', 'Az M32 futása nem buktatja az A-REV-N1b állítást; az M47/M48/M49 futása igen.',
  () => {
    const TARGET = 'A-REV-N1b-earlier-record-and-decision-survive';
    const runMutation = (id) => {
      const m = MUTATIONS.find((x) => x.id === id);
      const edits = m.edits || [{ from: m.from, to: m.to }];
      const r = runCopy((s) => {
        let next = s;
        for (const e of edits) {
          if (next.split(e.from).length - 1 !== 1) throw new Error(`${id}: a horgony nem egyszer szerepel`);
          next = next.replace(e.from, e.to);
        }
        return next;
      }, m.file);
      const rec = r.data && r.data.records.find((x) => x.probe_id === m.catcher);
      const a = rec && (rec.assertions || []).find((x) => x.id === TARGET);
      return { id, probe_status: rec ? rec.status : null, target_assertion: a ? a.pass : null };
    };
    const m32 = runMutation('M32');
    const news = ['M47', 'M48', 'M49'].map(runMutation);
    // A BIZONYÍTÉK-LÁNC IS NÉZZE MEG: a REV-N1b-t nem az M32 falszifikálta.
    //
    // A BATTÉRIA HÍVÁSA DARABOLVA, A DARABSZÁM SZÁRMAZTATVA (R52 — KUKA-045 ezen a hívó-oldalon).
    // Az eredeti alak EGY hívásban futtatta a battériát; a battéria azóta 185 mutációra nőtt, és
    // MÉRVE az egy hívás a `mutate.mjs` saját költségvetése fölé megy, ezért a keresett
    // „falszifikálta" sor MEG SEM SZÜLETIK — a próba nem a rendszeren bukott el, hanem a hívás
    // alakján. A darabszám a tool SAJÁT szabályából jön (egység-méret 24), tehát a battéria
    // növekedésével magától finomodik; az ELLENŐRZÖTT ÁLLÍTÁS VÁLTOZATLAN.
    const batteryUnits = Math.max(6, Math.ceil(MUTATIONS.length / 24));
    const batteryArgs = [];
    for (let i = 1; i <= batteryUnits; i += 1) batteryArgs.push(`--unit=${i}/${batteryUnits}`);
    batteryArgs.push('--merge');
    const batteryRuns = batteryArgs.map((arg) => spawnSync(
      process.execPath, [join(root, 'source/v3ref/mutate.mjs'), arg],
      { cwd: join(root, 'source'), encoding: 'utf8', timeout: 60000, maxBuffer: 32 * 1024 * 1024 }));
    const battery = { stdout: batteryRuns.map((r) => r.stdout || '').join('\n') };
    const line = (battery.stdout || '').split('\n').find((l) => l.includes('REV-N1b') && l.includes('falszifikálta'));
    return {
      pass: m32.target_assertion === true && news.every((n) => n.target_assertion === false)
        && !!line && !/falszifikálta: M32\b/.test(line),
      m32, new_controls: news, final_credit_line: (line || '(nem találtam a sort)').trim(),
    };
  });

// ── D01' — a szerződés CÍMÉNEK változása látszik a szerződés-lenyomaton, az indexén NEM ─────────
add('D01-restated', 'A K01 címének változása MEGVÁLTOZTATJA a szerződés- és az együttes lenyomatot; az INDEX lenyomatát nem.',
  () => {
    const before = { contract: contractDigest(), index: indexDigest(), combined: normsDigest() };
    const dir = mkdtempSync(join(tmpdir(), 'r55d-'));
    try {
      cpSync(join(root, 'source'), dir, { recursive: true });
      const p = join(dir, 'v3ref/normContract.mjs');
      const s = readFileSync(p, 'utf8');
      const anchor = "title: 'Alany, azonosító és kötés'";
      if (s.split(anchor).length - 1 !== 1) throw new Error('a K01 cim horgonya nem egyszer szerepel');
      writeFileSync(p, s.replace(anchor, "title: 'DIAGNOSTIC_CHANGED_K01_TITLE'"));
      const q = spawnSync(process.execPath, ['-e',
        `import(${JSON.stringify(join(dir, 'v3ref/norms.mjs'))}).then((m) => console.log(JSON.stringify(`
        + '{ contract: m.contractDigest(), index: m.indexDigest(), combined: m.normsDigest() })));'],
      { encoding: 'utf8', timeout: 15000 });
      const after = JSON.parse(q.stdout);
      return {
        pass: after.contract !== before.contract && after.combined !== before.combined
          && after.index === before.index,
        before, after,
        note: 'a szerződés és az index KÜLÖN artefaktum: a címjegyzék változása az elsőt érinti, a '
          + 'másodikat nem — és az együttes lenyomat mindkettőt hordozza',
      };
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

writeFileSync(join(root, 'evidence/restated.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out.cases.map((c) => ({ id: c.id, pass: c.pass, test_error: c.test_error })), null, 2));
