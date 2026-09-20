// tools/lib/vs_sweep_reuse.mjs — A SÖPRÉS BIZONYÍTÉK-ÚJRAHASZNÁLATÁNAK FELOLDÓJA (SRU-01, R69 F69-01).
//
// MIÉRT KÜLÖN MODUL. Az R68-as alak a söprésben, helyben döntött: `git diff --quiet <reuse> HEAD`
// két COMMITOT hasonlított (a munkafa és az index nem számított), a hivatkozott commithoz tartozó
// BIZONYÍTÉK létét és verdiktjét pedig meg sem kérdezte — így egy módosított, sőt BUKOTT lánc mellett is
// „eredménye érvényes, azonosság MÉRVE" sor ment ki (a külső ellenőrző fél szintetikus repón bizonyította,
// R69 F69-01; és a saját ágon a hivatkozott 64d1983 külső-lánc eredménye `ok:false` volt — KUKA-200).
//
// A SZABÁLY: egy hosszú lánc kihagyása CSAK akkor „ÚJRAHASZNÁLT BIZONYÍTÉK", ha MIND igaz:
//   (1) a `--reuse` hivatkozás FELOLDOTT commit (argumentumos git-hívás, shell nélkül);
//   (2) a hivatkozott commitban OTT a lánc bizonyíték-fájlja, és a verdiktje ZÖLD, TISZTA forráson született;
//   (3) a lánc BEMENETE a munkafán (munkafa + index + követetlen fájlok) AZONOS azzal a forrással, amin a
//       bizonyíték készült — külső láncnál a bizonyíték `source.commit`-jához mérve (git diff + ls-files),
//       a mag-battériánál a forrás-köteg TARTALMI lenyomatával (`digestOfBundle` = a mutációs `base_digest`);
//   (4) a lánc szkriptjei, a függőségek (package.json + package-lock.json) és a futtató fő verziója azonosak.
// Bármelyik hiánya ⇒ `unverified`: a lánc NEM FUTOTT, az eredménye NEM IGAZOLT, és a söprés összverdiktje
// nem zöld. A láncot a söprés ilyenkor NEM indítja el magától (R69: a kihagyás elutasítása nem indíthat
// húszperces láncot) — a kimenet megmondja, mit kell külön futtatni.
//
// A MAG-BATTÉRIA (`verify:v3ref`) KÉT FELE: a próbák (`node v3ref/run.mjs`, ~2 s) NEM hagynak tartós
// bizonyítékot, ezért azokat a söprés újrahasználat mellett is LEFUTTATJA (`cheap_part`); csak a mutációs
// fél (204 mutáció, `v3ref/v3ref-mutation-result.json`) újrahasznált.
//
// PURE a git-olvasáson kívül: nem ír, nem indít láncot.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { digestOfBundle } from '../../v3ref/bundleDigest.mjs';

export const SRU_CONTRACT_ID = 'SRU-01';
export const REUSE_STATUS = Object.freeze(['reused', 'unverified']);

// A LÁNC BEMENETE A FORRÁS, NEM A KIMENET: ugyanaz a kizárás, amit a lánc maga is használ (run-all.mjs:
// `results/` · `v3ref-mutation-result.json` · `units/`), plusz a körök lapjai (`source-documents/`, a próbák
// nem olvassák). Különben a bizonyíték KÉSŐBBI commitja (a mutációs eredmény a forrás után kerül be) hamisan
// „változott bemenetet" mérne, és érvényes pár soha nem születne (a próba SRU01-e fogta meg).
// MÉRVE (R70): a `contracts/` mappát egyik lánc sem húzza be (a `v3ref/*.mjs` és az `external-checks/*.mjs`
// importjai mind a v3ref-en belül maradnak; a run-all a v3ref/-et másolja), és a `tools/vs_verify_external_checks.mjs`
// nem létezik — az R68-as bemeneti lista mindkettőt bemenetnek mondta. Ami nem bemenet, azt nem mérjük
// bemenetként (különben egy KUKA-bejegyzés is „változott láncot" jelentene — KUKA-049).
export const SOURCE_INPUTS = Object.freeze(['v3ref', ':(exclude)v3ref/external-checks/results', ':(exclude)v3ref/v3ref-mutation-result.json', ':(exclude)v3ref/units', ':(exclude)v3ref/source-documents']);
/** A KIHAGYHATÓ LÁNCOK SZERZŐDÉSE — csak nevezett lánc hagyható ki. */
export const CHAINS = Object.freeze({
  'verify:external-checks': Object.freeze({
    inputs: Object.freeze(SOURCE_INPUTS),
    evidence_path: 'v3ref/external-checks/results/external-checks-result.json',
    identity: 'source_commit', // a bizonyíték megnevezi a forrás-commitot; ahhoz mérünk
    cheap_part: null,
  }),
  'verify:v3ref': Object.freeze({
    // a mag-battéria a FELSŐ szintű v3ref/*.mjs fájlokat futtatja (a `run.mjs` és a mutációk otthona) —
    // az external-checks/ alkönyvtár a MÁSIK lánc bemenete
    inputs: Object.freeze([':(glob)v3ref/*.mjs']),
    evidence_path: 'v3ref/v3ref-mutation-result.json',
    identity: 'bundle_digest', // a mutációs eredmény a forrás-köteg TARTALMI lenyomatát hordozza
    cheap_part: 'node v3ref/run.mjs', // a próbák nem hagynak tartós bizonyítékot — lefutnak
  }),
});
export const SCRIPT_PREFIXES = Object.freeze(['verify:v3ref', 'verify:external-checks', 'v3ref:', 'proof:']);

function git(root, args, opts = {}) {
  return execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'], ...opts }).toString();
}

/** (1) A hivatkozás FELOLDOTT commit — argumentumként megy a git-nek, shell nem értelmezi. */
export function resolveCommit(root, ref) {
  if (typeof ref !== 'string' || !ref.trim() || /\s/.test(ref)) return null;
  try { return git(root, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).trim() || null; } catch { return null; }
}

/** A commit, amelyik a bizonyíték-fájlt UTOLJÁRA írta (a hivatkozott commitból visszafelé). */
export function evidenceCommitOf(root, commit, path) {
  try { return git(root, ['log', '-1', '--format=%H', commit, '--', path]).trim() || null; } catch { return null; }
}

function showAt(root, commit, path) {
  try { return git(root, ['show', `${commit}:${path}`]); } catch { return null; }
}

/** A lánc szkriptjei a package.json-ból (csak a lánc által futtatott előtagok). */
export function chainScriptsOf(pkgText) {
  const sc = (JSON.parse(pkgText).scripts) || {};
  return JSON.stringify(Object.fromEntries(Object.entries(sc).filter(([k]) => SCRIPT_PREFIXES.some((p) => k.startsWith(p))).sort()));
}
/** A függőség-szerződés a package.json-ból: dependencies · devDependencies · engines. */
export function depsOf(pkgText) {
  const p = JSON.parse(pkgText);
  return JSON.stringify({ dependencies: p.dependencies || {}, devDependencies: p.devDependencies || {}, engines: p.engines || {} });
}

/** (3) A munkafa (munkafa + index + követetlen) AZONOS-e a commit alakjával a megadott utakon. */
export function worktreeIdentity(root, commit, inputs) {
  const paths = [...inputs];
  const problems = [];
  const quiet = (args) => { try { git(root, args); return true; } catch { return false; } };
  if (!quiet(['diff', '--quiet', commit, '--', ...paths])) problems.push('a munkafa eltér a commit alakjától');
  if (!quiet(['diff', '--quiet', '--cached', commit, '--', ...paths])) problems.push('az index (staged) eltér a commit alakjától');
  let untracked = '';
  try { untracked = git(root, ['ls-files', '--others', '--exclude-standard', '--', ...paths]).trim(); } catch { problems.push('a követetlen fájlok nem mérhetők'); }
  if (untracked) problems.push(`követetlen bemeneti fájl: ${untracked.split('\n').slice(0, 3).join(', ')}${untracked.split('\n').length > 3 ? ' …' : ''}`);
  return { same: problems.length === 0, problems };
}

/** (4) Lánc-szkriptek, függőségek és futtató a commit és a munkafa között. */
export function environmentIdentity(root, commit, runtime = process.version) {
  const problems = [];
  const headPkg = readFileSync(join(root, 'package.json'), 'utf8');
  const atPkg = showAt(root, commit, 'package.json');
  if (atPkg === null) problems.push('a hivatkozott commitban nincs package.json');
  else {
    if (chainScriptsOf(atPkg) !== chainScriptsOf(headPkg)) problems.push('a lánc szkriptjei változtak a package.json-ban');
    if (depsOf(atPkg) !== depsOf(headPkg)) problems.push('a függőség-szerződés (dependencies/devDependencies/engines) változott');
  }
  const lockHere = existsSync(join(root, 'package-lock.json')) ? readFileSync(join(root, 'package-lock.json'), 'utf8') : null;
  const lockAt = showAt(root, commit, 'package-lock.json');
  if ((lockHere === null) !== (lockAt === null) || (lockHere !== null && lockHere !== lockAt)) problems.push('a package-lock.json változott');
  return { same: problems.length === 0, problems, runtime };
}

/** (2) A bizonyíték a hivatkozott commitban: léte, verdiktje, forrás-kötése. */
export function evidenceOf(root, commit, chain) {
  const c = CHAINS[chain];
  if (!c) return { present: false, green: false, why: 'nem nevezett lánc' };
  const raw = showAt(root, commit, c.evidence_path);
  if (raw === null) return { present: false, green: false, why: `nincs bizonyíték-fájl a(z) ${commit.slice(0, 7)} commitban (${c.evidence_path})` };
  let j; try { j = JSON.parse(raw); } catch { return { present: true, green: false, why: 'a bizonyíték-fájl nem értelmezhető JSON' }; }
  if (chain === 'verify:external-checks') {
    const v = j.verdict || {}; const s = j.source || {};
    const srcCommit = typeof s.commit === 'string' ? s.commit : '';
    const dirty = s.clean !== true || /\+uncommitted$/.test(srcCommit);
    const green = v.ok === true;
    const why = [];
    if (!green) why.push(`a verdikt nem zöld (ok=${JSON.stringify(v.ok)}, ${v.green}/${v.of}, env-kihagyás ${v.env_skipped})`);
    if (dirty) why.push(`a bizonyíték NEM tiszta forráson készült (${srcCommit || 'nincs forrás-commit'})`);
    return { present: true, green: green && !dirty, at: j.at || null, node: j.node || null, source_commit: dirty ? null : srcCommit, summary: `${v.green}/${v.of}, env-kihagyás ${v.env_skipped}`, why: why.join(' · ') };
  }
  // verify:v3ref — a mutációs fél
  const mr = Array.isArray(j.mutation_results) ? j.mutation_results : [];
  const cov = j.coverage || {};
  const notCaught = mr.filter((m) => m.verdict !== 'CAUGHT').length;
  const why = [];
  if (j.clean !== true) why.push('a mutációs futás nem tiszta forráson készült');
  if (j.run_state !== 'complete') why.push(`a futás állapota nem teljes (${j.run_state})`);
  if (!(typeof cov.expected === 'number' && cov.seen === cov.expected && Array.isArray(cov.missing) && cov.missing.length === 0)) why.push('a lefedettség nem teljes');
  if (!mr.length || notCaught) why.push(`nem minden mutáció elkapva (${mr.length - notCaught}/${mr.length})`);
  if (typeof j.base_digest !== 'string' || !j.base_digest) why.push('nincs forrás-lenyomat (base_digest)');
  return { present: true, green: why.length === 0, at: j.at || null, node: j.node || null, base_digest: j.base_digest || null, summary: `${mr.length - notCaught}/${mr.length} mutáció elkapva`, why: why.join(' · ') };
}

const major = (v) => String(v || '').replace(/^v/, '').split('.')[0];

/**
 * A DÖNTÉS. `reused` CSAK a négy feltétel együttes teljesülésével; minden más `unverified`, nevezett okkal.
 * @returns {{status:'reused'|'unverified', chain, commit, evidence, checks:object[], why:string, cheap_part:string|null}}
 */
export function assessReuse({ root, chain, reuseRef, runtime = process.version }) {
  const c = CHAINS[chain];
  const out = { status: 'unverified', chain, commit: null, evidence: null, checks: [], why: '', cheap_part: c ? c.cheap_part : null };
  const check = (name, ok, why) => { out.checks.push({ name, ok: !!ok, why: ok ? '' : why }); return !!ok; };
  if (!check('nevezett lánc', !!c, 'csak nevezett lánc hagyható ki (verify:external-checks · verify:v3ref)')) return finish(out);
  const commit = resolveCommit(root, reuseRef);
  out.commit = commit;
  if (!check('feloldott commit', !!commit, `a --reuse hivatkozás nem oldható fel commitra: ${JSON.stringify(reuseRef)}`)) return finish(out);
  const ev = evidenceOf(root, commit, chain);
  out.evidence = ev;
  if (!check('zöld bizonyíték tiszta forráson', ev.green, ev.why)) return finish(out);
  if (c.identity === 'source_commit') {
    const src = resolveCommit(root, ev.source_commit);
    if (!check('a bizonyíték forrás-commitja feloldható', !!src, `a bizonyíték forrás-commitja nem oldható fel: ${ev.source_commit}`)) return finish(out);
    const wt = worktreeIdentity(root, src, c.inputs);
    check(`a lánc bemenete azonos a forrás-commit (${src.slice(0, 7)}) alakjával (munkafa + index + követetlen)`, wt.same, wt.problems.join(' · '));
    const env = environmentIdentity(root, src, runtime);
    check('lánc-szkriptek · függőségek · package-lock azonosak', env.same, env.problems.join(' · '));
  } else {
    let here = null; try { here = digestOfBundle(root); } catch (e) { here = null; }
    check('a forrás-köteg tartalmi lenyomata azonos a bizonyíték base_digest-jével', here !== null && here === ev.base_digest, `munkafa ${here ? here.slice(0, 19) : 'nem mérhető'} ≠ bizonyíték ${String(ev.base_digest || '').slice(0, 19)}`);
    // A mutációs bizonyíték nem nevez forrás-commitot: a mérés alapja az a commit, amelyik a bizonyíték-fájlt
    // UTOLJÁRA írta (a lenyomat a felső v3ref/*.mjs-t fedi, a többi bemenetet ez a diff).
    const evCommit = evidenceCommitOf(root, commit, c.evidence_path) || commit;
    const wt = worktreeIdentity(root, evCommit, c.inputs);
    check(`a lánc bemenete azonos a bizonyíték commitjának (${evCommit.slice(0, 7)}) alakjával (munkafa + index + követetlen)`, wt.same, wt.problems.join(' · '));
    const env = environmentIdentity(root, evCommit, runtime);
    check('lánc-szkriptek · függőségek · package-lock azonosak', env.same, env.problems.join(' · '));
  }
  check(`a futtató fő verziója azonos (bizonyíték ${ev.node || '?'} · itt ${runtime})`, ev.node && major(ev.node) === major(runtime), `a bizonyíték ${ev.node || 'ismeretlen'} futtatón készült, itt ${runtime}`);
  return finish(out);
}

function finish(out) {
  const bad = out.checks.filter((k) => !k.ok);
  out.status = bad.length ? 'unverified' : 'reused';
  out.why = bad.map((k) => `${k.name}: ${k.why}`).join(' · ');
  return out;
}

/** A söprés két kimeneti sora — EGY helyen, hogy a próba és a söprés ugyanazt írja. */
export function reuseLine(a) {
  if (a.status === 'reused') {
    return `ÚJRAHASZNÁLT BIZONYÍTÉK — ${a.chain}: a(z) ${a.commit.slice(0, 7)} commit bizonyítéka ZÖLD (${a.evidence.summary}, ${a.evidence.at}), azonosság MÉRVE: ${a.checks.map((k) => k.name).join(' · ')}${a.cheap_part ? ` · az olcsó fele lefutott (${a.cheap_part})` : ''}`;
  }
  return `NEM FUTOTT — NEM IGAZOLT — ${a.chain}: ${a.why || 'a kihagyás feltételei nem teljesülnek'}. Az összverdikt ettől NEM zöld; a lánc futtatása: npm run ${a.chain}`;
}

export const SRU_CONTRACT = Object.freeze({
  contract_id: SRU_CONTRACT_ID,
  pure: true,
  statuses: REUSE_STATUS,
  chains: Object.keys(CHAINS),
  rule: 'reused CSAK: feloldott commit + zöld, tiszta bizonyíték + munkafa/index/követetlen azonosság a bizonyíték forrásával + lánc-szkript/függőség/futtató azonosság; különben unverified, a lánc nem indul, az összverdikt nem zöld',
});
