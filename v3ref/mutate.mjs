#!/usr/bin/env node
// V3 MAGREFERENCIA — MUTÁCIÓS PRÓBA (G6).
//
// Az R32 §4 mércéje: „a bizonyíték eredetét is ellenőrizni kell: egy saját kézzel írt
// `passed: true` NEM futási eredmény." És a G6: „Minden veszélyes mutáció ÉSZLELT."
//
// Ezért a zöld futás önmagában semmit nem bizonyít. Ez az eszköz a FORRÁST rontja el — a v3ref
// másolatát egy ideiglenes könyvtárba, karakter-cserével —, majd újrafuttatja a próbákat, és azt
// várja, hogy PIROSRA váltanak. Ami TÚLÉLI a mutációt, az a PRÓBA lyuka, nem a kódé — és azt
// kimondjuk (KUKA-049: az őr a mechanizmust mérje, ne a tünetet).
import { cpSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const REF = dirname(fileURLToPath(import.meta.url));

// Minden mutáció EGY őrt ront el, és megnevezi, MELYIK próbának kell elkapnia.
const MUTATIONS = [
  { id: 'M1', rule: 'K03', catcher: 'P-A04',
    what: 'a semleges válasz elárulja, hogy a címhez tartozik-e fiók',
    file: 'invite.mjs',
    from: "      switch_account_offered: false,\n      account_exists: null,\n    });\n  }\n\n  // Innentől a néző BIRTOKOLJA",
    to: "      switch_account_offered: !!subjectByExternal(store, inv.invitee_namespace, inv.invitee_value),\n      account_exists: null,\n    });\n  }\n\n  // Innentől a néző BIRTOKOLJA" },

  { id: 'M2', rule: 'K03', catcher: 'P-K03-cred',
    what: 'a meghívó beváltása FELÜLÍRJA a meglévő hitelesítő adatot (a mi KUKA-086-os hibánk)',
    file: 'invite.mjs',
    from: "    shape = 'membership_only';",
    to: "    shape = 'membership_only';\n    if (newCredential) store.run('UPDATE account SET credential = ? WHERE subject_id = ?', newCredential, target);" },

  { id: 'M3', rule: 'K03', catcher: 'P-K03-intent',
    what: 'a függő szándék elvész, tehát a kézi beváltás zsákutcába fut (a mi D-VS-667-es hibánk)',
    file: 'invite.mjs',
    from: "  return row ? row.invite_token : null;",
    to: "  return null;" },

  { id: 'M4', rule: 'K07', catcher: 'P-A08',
    what: 'az eredmény kiadása kihagyja a MAI jog ellenőrzését (a mi hibás C08-as javaslatunk)',
    file: 'command.mjs',
    from: "  const decision = rightAt({ store, subjectId: requester, bookId: cmd.book_id, opClass: 'own_book', clock, externalEvidence });\n  if (!decision.allowed) return refused;",
    to: "  const decision = { allowed: true };\n  if (!decision.allowed) return refused;" },

  { id: 'M5', rule: 'K07', catcher: 'P-A08',
    what: 'az ismétlésvédelem nem fog: a hatás MÁSODSZOR is megszületik',
    file: 'command.mjs',
    from: "  const prior = store.get('SELECT * FROM command WHERE idem_key = ?', idemKey);",
    to: "  const prior = null;" },

  { id: 'M6', rule: 'K12', catcher: 'P-A14',
    what: 'a lejárt külső bizonyíték türelmi időt kap',
    file: 'authz.mjs',
    from: "    if (age > profile.max_age_ms) {",
    to: "    if (false && age > profile.max_age_ms) {" },

  { id: 'M7', rule: 'K09', catcher: 'P-A08',
    what: 'a visszavont tagság továbbra is jogot ad',
    file: 'authz.mjs',
    from: "  if (m.revoked_at && m.revoked_at <= clock.now()) {",
    to: "  if (false && m.revoked_at && m.revoked_at <= clock.now()) {" },

  { id: 'M8', rule: 'K05', catcher: 'P-A08',
    what: 'a NEM LÉTEZŐ és a NEM LÁTHATÓ parancs válasza eltér — a kulcs próbálgathatóvá válik',
    file: 'command.mjs',
    from: "  if (!cmd) return refused;",
    to: "  if (!cmd) return Object.freeze({ ...refused, error: 'unknown_key' });" },

  { id: 'M9', rule: 'K03', catcher: 'P-A04b',
    what: 'a postafiók birtokosa is csak a semleges választ kapja — a javítás zsákutcát csinál (KUKA-064)',
    file: 'invite.mjs',
    from: "  const proven = hasProvenChannel(store, viewerSubjectId, inv.invitee_namespace, inv.invitee_value);",
    to: "  const proven = false;" },
  { id: 'M10', rule: 'K07', catcher: 'P-A08',
    what: 'az ÚJRAPRÓBÁLÁS a jog-ellenőrzés ELŐTT felel a kulcsra — a kulcs létezés-csatornává válik',
    file: 'command.mjs',
    from: "  const decision = rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence });\n  if (!decision.allowed) {",
    to: "  if (prior && prior.declared_hash === declaredHash) return { ok: true, effect_id: prior.effect_id, state: prior.state, replayed: true };\n  const decision = rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence });\n  if (!decision.allowed) {" },

];

function runMutation(m) {
  const dir = mkdtempSync(join(tmpdir(), 'v3mut-'));
  try {
    cpSync(REF, join(dir, 'v3ref'), { recursive: true });
    const target = join(dir, 'v3ref', m.file);
    const src = readFileSync(target, 'utf8');
    if (!src.includes(m.from)) {
      return { ...m, applied: false, detected: false, note: 'a mutáció horgonya NEM TALÁLHATÓ a forrásban — a mutáció elavult' };
    }
    writeFileSync(target, src.replace(m.from, m.to));
    const r = spawnSync(process.execPath, [join(dir, 'v3ref', 'run.mjs'), '--json'], { encoding: 'utf8' });
    let failed = [];
    try {
      const out = JSON.parse(r.stdout);
      failed = out.records.filter((x) => x.status !== 'PASS').map((x) => x.probe_id);
    } catch { failed = ['(a futás összeomlott)']; }
    return {
      ...m,
      applied: true,
      detected: failed.length > 0,
      caught_by: failed,
      by_named_catcher: failed.includes(m.catcher),
    };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const results = MUTATIONS.map(runMutation);

console.log('');
console.log('V3 MAGREFERENCIA — MUTÁCIÓS PRÓBA (G6)');
console.log('='.repeat(78));
console.log('  Minden sor EGY elrontott őr. A próbának PIROSRA kell váltania — ami túléli, az a PRÓBA lyuka.');
console.log('');
let survived = 0; let wrongCatcher = 0;
for (const r of results) {
  const mark = !r.applied ? 'HIBÁS ' : r.detected ? 'ELKAPVA' : 'TÚLÉLTE';
  if (r.applied && !r.detected) survived += 1;
  if (r.applied && r.detected && !r.by_named_catcher) wrongCatcher += 1;
  console.log(`  ${mark} [${r.id}·${r.rule}] ${r.what}`);
  if (!r.applied) console.log(`          → ${r.note}`);
  else console.log(`          → elkapta: ${r.caught_by.join(', ') || '— SENKI —'}`
    + (r.detected && !r.by_named_catcher ? `   (a nevesített ${r.catcher} NEM fogta meg)` : ''));
}
console.log('');
const bad = results.filter((r) => !r.applied).length;
console.log(`  ${results.length} mutáció · ${results.length - survived - bad} elkapva · ${survived} túlélte · ${bad} elavult horgony`);
console.log(`RESULT: ${survived === 0 && bad === 0 ? 'MINDEN VESZÉLYES MUTÁCIÓ ÉSZLELT' : 'HIÁNYOS — a próba nem fogja meg mindet'}`);
if (survived > 0 || bad > 0) process.exit(1);
