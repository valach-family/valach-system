#!/usr/bin/env node
// V3 MAGREFERENCIA — MUTÁCIÓS PRÓBA (G6).
//
// ═══ EZ AZ ESZKÖZ EGYSZER MÁR HAZUDOTT — R42 Q18 ════════════════════════════════════════════════
//
// A külső fél a `run.mjs` helyére egy azonnal 86-os kóddal kilépő programot tett, ami NEM ad JSON-t
// és EGYETLEN próbát sem futtat. A régi alak erre azt írta ki, hogy **„10 mutáció · 10 elkapva"**,
// és **0-val zárt**. Reprodukáltam: pontosan így történt.
//
// Az ok EGY sor volt: `catch { failed = ['(a futás összeomlott)']; }` — a JSON-hibát BIZONYÍTÉKNAK
// számolta. Ettől minden mutáció, ami csak összeomlasztotta a programot, „elkapottnak" látszott;
// és ha maga a futtató volt rossz, MIND a tíz. Mellette a `wrongCatcher` értéke ki volt számolva,
// de a kilépési feltétel nem használta: a ROSSZ próba általi elkapás is teljes sikernek számított.
//
// Ez pontosan az a hiba-osztály, amiről a saját regiszterünk szól: a nem mért dolog nem
// „ismeretlen állapotú", hanem ZÖLDNEK LÁTSZIK (KUKA-051 · KUKA-089). A mérő-eszközön a legrosszabb
// helyen — mert innentől MINDEN rá hivatkozó bizonyíték hamis.
//
// ═══ A JAVÍTOTT SZERZŐDÉS ═══════════════════════════════════════════════════════════════════════
//
// Egy mutáció akkor és csak akkor ELKAPOTT, ha a MEGNEVEZETT próba a MEGNEVEZETT módon bukik el.
// Minden más külön néven jelenik meg, és mind PIROS:
//
//   CAUGHT         a nevesített próba FAIL-t adott (vagy a szerződésben ELŐRE rögzített kivételt)
//   WRONG_CATCHER  bukott valami, de NEM a nevesített próba — a próba-térkép hazudik
//   SURVIVED       minden próba átment — a PRÓBA lyuka, nem a kódé
//   HARNESS_ERROR  a futtató nem adott értelmezhető eredményt (nincs JSON · spawn-hiba · időtúllépés
//                  · hiányzó próba · nem várt összeomlás) — EZ NEM ÉSZLELÉS
//   STALE_ANCHOR   a mutáció horgonya nincs meg a forrásban — a mutáció elavult
//
// ÉS A LÉNYEG: az eszköz MINDEN futáskor bizonyítja, hogy a Q18-at ma is elkapná (`--self-test`
// nélkül is, alapból). Két kapu fut a mutációk ELŐTT:
//   (a) ALAPVONAL — a MUTÁLATLAN másolatnak zöldnek kell lennie. Piros alapvonalon minden utána
//       jövő „elkapás" értelmezhetetlen.
//   (b) Q18-ELLENPRÓBA — egy szándékosan elrontott futtatót HARNESS_ERROR-nak kell minősíteni,
//       NEM elkapásnak. Ha ez a kapu átmegy elkapásként, az eszköz megint hazudik.
//
// A (b) az egyetlen dolog, ami miatt a többi számnak van értéke. Ezért fut mindig, nem kapcsolóra.

import { cpSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const REF = dirname(fileURLToPath(import.meta.url));
const RUN_TIMEOUT_MS = 60000;

// Minden mutáció EGY őrt ront el, és megnevezi, MELYIK próbának kell elkapnia, MILYEN MÓDON.
//   expect: 'probe_fail'    — a nevesített próba FAIL-t ad (ez a szabályos alak)
//   expect: 'runtime_error' — a mutáció a szerződés szerint ELŐRE VÁRHATÓAN kivételt okoz; csak
//                             akkor bizonyíték, ha itt előre ki van mondva (R42 §2.3)
const MUTATIONS = [
  { id: 'M1', rule: 'K03', catcher: 'P-A04', expect: 'probe_fail',
    what: 'a semleges válasz elárulja, hogy a címhez tartozik-e fiók',
    file: 'invite.mjs',
    from: "      switch_account_offered: false,\n      account_exists: null,\n    });\n  }\n\n  // Innentől a néző BIRTOKOLJA",
    to: "      switch_account_offered: !!subjectByExternal(store, inv.invitee_namespace, inv.invitee_value),\n      account_exists: null,\n    });\n  }\n\n  // Innentől a néző BIRTOKOLJA" },

  { id: 'M2', rule: 'K03', catcher: 'P-K03-cred', expect: 'probe_fail',
    what: 'a meghívó beváltása FELÜLÍRJA a meglévő hitelesítő adatot (a mi KUKA-086-os hibánk)',
    file: 'invite.mjs',
    from: "    shape = 'membership_only';",
    to: "    shape = 'membership_only';\n    if (newCredential) store.run('UPDATE account SET credential = ? WHERE subject_id = ?', newCredential, target);" },

  { id: 'M3', rule: 'K03', catcher: 'P-K03-intent', expect: 'probe_fail',
    what: 'a függő szándék elvész, tehát a kézi beváltás zsákutcába fut (a mi D-VS-667-es hibánk)',
    file: 'invite.mjs',
    from: "  return row ? row.invite_token : null;",
    to: "  return null;" },

  { id: 'M4', rule: 'K07', catcher: 'P-A08', expect: 'probe_fail',
    what: 'az eredmény kiadása kihagyja a MAI jog ellenőrzését (a mi hibás C08-as javaslatunk)',
    file: 'command.mjs',
    from: "  const decision = rightAt({ store, subjectId: requester, bookId: cmd.book_id, opClass: 'own_book', clock, externalEvidence });\n  if (!decision.allowed) return refused;",
    to: "  const decision = { allowed: true };\n  if (!decision.allowed) return refused;" },

  // R42 §2.3: az M5 a mai kódon EGYEDI KULCS-ÜTKÖZÉST is kiválthat. Az ütközés a MEGVÁLTOZOTT
  // VISELKEDÉS észlelése — de NEM bizonyítja, hogy két gazdasági hatás sikeresen lekönyvelődött.
  // Ezért itt `runtime_error` a szerződés: ELŐRE kimondva, hogy a bizonyíték ereje ennyi.
  { id: 'M5', rule: 'K07', catcher: 'P-A08', expect: 'runtime_error',
    what: 'az ismétlésvédelem nem fog: a hatás MÁSODSZOR is megszületik',
    evidence_limit: 'a mai kódon egyedi kulcs-ütközést vált ki — ez a VISELKEDÉS-VÁLTOZÁS észlelése, '
      + 'NEM két sikeresen lekönyvelt hatás bizonyítéka (R42 §2.3)',
    file: 'command.mjs',
    from: "  const prior = store.get('SELECT * FROM command WHERE idem_key = ?', idemKey);",
    to: "  const prior = null;" },

  { id: 'M6', rule: 'K12', catcher: 'P-A14', expect: 'probe_fail',
    what: 'a lejárt külső bizonyíték türelmi időt kap',
    file: 'authz.mjs',
    from: "    if (age > profile.max_age_ms) {",
    to: "    if (false && age > profile.max_age_ms) {" },

  { id: 'M7', rule: 'K09', catcher: 'P-A08', expect: 'probe_fail',
    what: 'a visszavont tagság továbbra is jogot ad',
    file: 'authz.mjs',
    from: "  if (m.revoked_at && m.revoked_at <= clock.now()) {",
    to: "  if (false && m.revoked_at && m.revoked_at <= clock.now()) {" },

  { id: 'M8', rule: 'K05', catcher: 'P-A08', expect: 'probe_fail',
    what: 'a NEM LÉTEZŐ és a NEM LÁTHATÓ parancs válasza eltér — a kulcs próbálgathatóvá válik',
    file: 'command.mjs',
    from: "  if (!cmd) return refused;",
    to: "  if (!cmd) return Object.freeze({ ...refused, error: 'unknown_key' });" },

  { id: 'M9', rule: 'K03', catcher: 'P-A04b', expect: 'probe_fail',
    what: 'a postafiók birtokosa is csak a semleges választ kapja — a javítás zsákutcát csinál (KUKA-064)',
    file: 'invite.mjs',
    from: "  const proven = hasProvenChannel(store, viewerSubjectId, inv.invitee_namespace, inv.invitee_value);",
    to: "  const proven = false;" },

  { id: 'M10', rule: 'K07', catcher: 'P-A08', expect: 'probe_fail',
    what: 'az ÚJRAPRÓBÁLÁS a jog-ellenőrzés ELŐTT felel a kulcsra — a kulcs létezés-csatornává válik',
    file: 'command.mjs',
    from: "  const decision = rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence });\n  if (!decision.allowed) {",
    to: "  if (prior && prior.declared_hash === declaredHash) return { ok: true, effect_id: prior.effect_id, state: prior.state, replayed: true };\n  const decision = rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence });\n  if (!decision.allowed) {" },
];

// A próbák NEVE — a mutáció-térkép csak LÉTEZŐ próbát nevezhet meg (R42 §3/1: „Próba- és
// bizonyítékazonosítók verzióhoz kötöttek"). Egy elgépelt `catcher` némán WRONG_CATCHER-t okozna.
function probeIdsOf(runResult) {
  return (runResult.records || []).map((r) => r.probe_id);
}

/**
 * EGY futtatás osztályozása. Ez a függvény dönti el, mi számít BIZONYÍTÉKNAK — és a Q18 után
 * ez a rendszer legkényesebb pontja. A hiba SOHA nem lehet észlelés.
 *
 * @returns {{kind:'ok'|'harness', failed?:string[], all?:string[], why?:string}}
 */
export function classifyRun(spawnResult) {
  if (spawnResult.error) return { kind: 'harness', why: `a futtató nem indult el: ${spawnResult.error.message}` };
  if (spawnResult.signal) return { kind: 'harness', why: `a futtatót jel állította le: ${spawnResult.signal}` };
  let out;
  try { out = JSON.parse(spawnResult.stdout); } catch {
    return {
      kind: 'harness',
      why: `a futtató nem adott értelmezhető JSON-t (kilépési kód: ${spawnResult.status})`
        + `${(spawnResult.stderr || '').trim() ? ` · stderr: ${String(spawnResult.stderr).trim().split('\n')[0]}` : ''}`,
    };
  }
  if (!out || !Array.isArray(out.records)) return { kind: 'harness', why: 'a JSON-ban nincs `records` tömb' };
  if (out.records.length === 0) return { kind: 'harness', why: 'a futtató NULLA próbát adott vissza' };
  const failed = out.records.filter((x) => x.status !== 'PASS').map((x) => x.probe_id);
  return { kind: 'ok', failed, all: probeIdsOf(out) };
}

function runIn(dir) {
  return spawnSync(process.execPath, [join(dir, 'v3ref', 'run.mjs'), '--json'],
    { encoding: 'utf8', timeout: RUN_TIMEOUT_MS });
}

function withCopy(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'v3mut-'));
  try { cpSync(REF, join(dir, 'v3ref'), { recursive: true }); return fn(dir); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

// ── (a) ALAPVONAL: a mutálatlan másolat zöld? ────────────────────────────────────────────────────
function baselineGate() {
  return withCopy((dir) => {
    const c = classifyRun(runIn(dir));
    if (c.kind === 'harness') return { ok: false, why: `az ALAPVONAL nem futott le: ${c.why}` };
    if (c.failed.length) return { ok: false, why: `az ALAPVONAL piros: ${c.failed.join(', ')}` };
    return { ok: true, probes: c.all };
  });
}

// ── (b) Q18-ELLENPRÓBA: az elrontott futtatót HARNESS_ERROR-nak kell mondani ─────────────────────
// Ez a kapu bizonyítja, hogy a Q18 hiba ma nincs jelen. Pontosan azt csináljuk, amit a külső fél:
// a `run.mjs` helyére azonnal kilépő program kerül, JSON nélkül.
function q18Gate() {
  return withCopy((dir) => {
    writeFileSync(join(dir, 'v3ref', 'run.mjs'), 'process.exit(86);\n');
    const c = classifyRun(runIn(dir));
    return {
      ok: c.kind === 'harness',
      why: c.kind === 'harness'
        ? `helyesen HARNESS_ERROR — ${c.why}`
        : 'A MÉRŐ ÚJRA HAZUDIK: a nem futó próbát ÉSZLELÉSNEK minősítette (R42 Q18)',
    };
  });
}

function runMutation(m, knownProbes) {
  if (!knownProbes.includes(m.catcher)) {
    return { ...m, verdict: 'STALE_ANCHOR', why: `a megnevezett próba nem létezik: ${m.catcher}` };
  }
  return withCopy((dir) => {
    const target = join(dir, 'v3ref', m.file);
    const src = readFileSync(target, 'utf8');
    if (!src.includes(m.from)) {
      return { ...m, verdict: 'STALE_ANCHOR', why: 'a mutáció horgonya NEM TALÁLHATÓ a forrásban — a mutáció elavult' };
    }
    writeFileSync(target, src.replace(m.from, m.to));
    const c = classifyRun(runIn(dir));

    if (c.kind === 'harness') {
      // A ROSSZ FUTÁS NEM ÉSZLELÉS — kivéve, ha a mutáció szerződése ELŐRE kimondta.
      if (m.expect === 'runtime_error') {
        return { ...m, verdict: 'CAUGHT', why: `előre rögzített futásidejű hiba — ${c.why}`, weak: true };
      }
      return { ...m, verdict: 'HARNESS_ERROR', why: c.why };
    }
    if (c.failed.length === 0) return { ...m, verdict: 'SURVIVED', why: 'minden próba átment' };
    if (!c.failed.includes(m.catcher)) {
      return { ...m, verdict: 'WRONG_CATCHER', why: `bukott: ${c.failed.join(', ')} — de a nevesített ${m.catcher} NEM` };
    }
    if (m.expect === 'runtime_error') {
      return { ...m, verdict: 'CAUGHT', why: `a nevesített ${m.catcher} bukott (a szerződés futásidejű hibát is megengedett)`, weak: true };
    }
    return { ...m, verdict: 'CAUGHT', why: `a nevesített ${m.catcher} bukott` };
  });
}

// ── Futtatás ─────────────────────────────────────────────────────────────────────────────────────
console.log('');
console.log('V3 MAGREFERENCIA — MUTÁCIÓS PRÓBA (G6)');
console.log('='.repeat(78));

const base = baselineGate();
const q18 = q18Gate();
console.log(`  KAPU (a) alapvonal:     ${base.ok ? 'ZÖLD' : 'PIROS'} — ${base.ok ? `${base.probes.length} próba futott` : base.why}`);
console.log(`  KAPU (b) Q18-ellenpróba: ${q18.ok ? 'ZÖLD' : 'PIROS'} — ${q18.why}`);
console.log('');

let results = [];
if (base.ok && q18.ok) {
  results = MUTATIONS.map((m) => runMutation(m, base.probes));
  console.log('  Minden sor EGY elrontott őr. A NEVESÍTETT próbának kell pirosra váltania.');
  console.log('');
  for (const r of results) {
    console.log(`  ${r.verdict.padEnd(13)} [${r.id}·${r.rule}] ${r.what}`);
    console.log(`                → ${r.why}`);
    if (r.weak) console.log(`                ⚠ a bizonyíték ereje korlátozott: ${r.evidence_limit || 'előre rögzített futásidejű hiba'}`);
  }
} else {
  console.log('  A mutációk NEM FUTOTTAK: a két kapu valamelyike piros, tehát az eredményük');
  console.log('  értelmezhetetlen volna. A hiányzó mérés nem zöld (KUKA-051 · KUKA-089).');
}

const count = (v) => results.filter((r) => r.verdict === v).length;
const caught = count('CAUGHT'), survived = count('SURVIVED'), wrong = count('WRONG_CATCHER');
const harness = count('HARNESS_ERROR'), stale = count('STALE_ANCHOR');
const weak = results.filter((r) => r.weak).length;

console.log('');
console.log(`  ${MUTATIONS.length} mutáció · ${caught} elkapva (ebből ${weak} korlátozott erejű)`
  + ` · ${survived} túlélte · ${wrong} rossz próba · ${harness} mérőhiba · ${stale} elavult horgony`);
const clean = base.ok && q18.ok && survived === 0 && wrong === 0 && harness === 0 && stale === 0;
console.log(`RESULT: ${clean ? 'MINDEN VESZÉLYES MUTÁCIÓ A NEVESÍTETT PRÓBÁVAL ÉSZLELT' : 'HIÁNYOS — lásd a fenti sorokat'}`);
process.exit(clean ? 0 : 1);
