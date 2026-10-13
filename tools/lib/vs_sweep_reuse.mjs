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
// AZ MBX-01 SAJÁT FÜGGŐSÉG-LISTÁJA — EGY otthon, hogy a lánc-bemenet ne csúszhasson el tőle
// (R200 §2 · KUKA-003). Az MBX maga nevezi meg, mit számít a futtatójához.
import { BATCH_EXTRA_FILES } from '../../v3ref/mutationBatch.mjs';
// A FÜGGETLENÜL ELVÁRT program-/esetkészlet és az EXS elfogadási szabály (R200 §2).
// A SZABÁLYT NEM ÍRJUK ÚJRA: a sorozat teljességét és érvényességét UGYANAZ a `verifySeries` dönti el,
// ami a kaput is (`npm run verify:external-checks:series`) — egy szabály, egy otthon (KUKA-003 · KUKA-029).
import { PROGRAMS } from '../../v3ref/external-checks/case-manifest.mjs';
import { verifySeries, evidenceDigest, BINDING_ANCHOR_FILE } from '../../v3ref/external-checks/seriesLedger.mjs';
/**
 * AZ ELFOGADÁSI PROFIL (PRF-01 · R202 §1) — A SÖPRÉS A MAI PROFILHOZ MÉR.
 *
 * A SPEC kimondja: *„A saját elfogadási parancs és a saját söprés az új profilt ne keverje a régi
 * lánccal."* Ezért a lánc teljességének mércéje a MAI, 17-programos elfogadási profil — nem a
 * 19-programos történeti regiszter —, és egy történeti sorozat NEM fogadható el a mai lánc
 * bizonyítékaként, akkor sem, ha a saját mércéjéhez képest teljes.
 */
import {
  ACCEPTANCE_PROFILE, resolveProfile, profileProgramRows, profileCaseKeys,
  measureProfileFiles, profileDigest,
} from '../../v3ref/external-checks/acceptanceProfile.mjs';

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
    /**
     * A MAG-BATTÉRIA BEMENETE A FELSŐ SZINTŰ `v3ref/*.mjs` — **PLUSZ AZ MBX-01 SAJÁT FÜGGŐSÉGEI**
     * (R200 §2, a chatgpt-v3 lelete).
     *
     * A régi lista csak a felső szintet fedte, azzal az indoklással, hogy „az external-checks/
     * alkönyvtár a MÁSIK lánc bemenete". Ez az `MBX-01` óta NEM igaz: a batch-szerződés maga nevezi
     * meg az `external-checks/batteryUnits.mjs`-t a futtató részének (`BATCH_EXTRA_FILES`), tehát
     * annak változása a mutációs mérést is érvényteleníti. A listát ezért az MBX SAJÁT
     * deklarációjából vesszük — nem másolatból, ami az első szerkesztésnél elcsúszna (`KUKA-003`).
     */
    inputs: Object.freeze([
      ':(glob)v3ref/*.mjs',
      ...BATCH_EXTRA_FILES.map((f) => `v3ref/${f}`),
    ]),
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

/** A bizonyíték-fájl NYERS BÁJTJAI a commitból — a lenyomat bájton mér, nem szövegen. */
function showBytesAt(root, commit, path) {
  try {
    return execFileSync('git', ['show', `${commit}:${path}`], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch { return null; }
}

/** A SOROZATOK OTTHONA — ugyanaz az út, amit a futtató ír és a kapu olvas. */
export const EXTERNAL_SERIES_BASE = 'v3ref/external-checks/results/series';

/**
 * A SOROZAT A HIVATKOZOTT COMMITBÓL — ugyanaz a betöltési alak, mint a kapué, csak git-ből olvas.
 *
 * MIÉRT A COMMITBÓL. Az SRU-01 (2) szabálya szerint a bizonyítéknak a HIVATKOZOTT COMMITBAN kell
 * állnia; a munkafán álló sorozat bármikor írható, tehát nem bizonyíték. A horgony NEM rekord
 * (R196 §1), az `evidence/` a sorozat SAJÁT példánya — a rekord lenyomata ahhoz szól.
 */
export function seriesAtCommit(root, commit) {
  let names = [];
  try {
    names = git(root, ['ls-tree', '-r', '--name-only', commit, '--', EXTERNAL_SERIES_BASE])
      .split('\n').map((x) => x.trim()).filter(Boolean);
  } catch { return []; }
  const want = new Set(PROGRAMS.map((p) => String(p.id)));
  const bySid = new Map();
  const ensure = (sid) => {
    if (!bySid.has(sid)) bySid.set(sid, { sid, anchor: null, records: [], evidenceDigests: new Map() });
    return bySid.get(sid);
  };
  for (const full of names) {
    if (!full.startsWith(`${EXTERNAL_SERIES_BASE}/`)) continue;
    const rest = full.slice(EXTERNAL_SERIES_BASE.length + 1);
    const cut = rest.indexOf('/');
    if (cut <= 0) continue;
    const e = ensure(rest.slice(0, cut));
    const tail = rest.slice(cut + 1);
    if (tail === BINDING_ANCHOR_FILE) {
      const raw = showAt(root, commit, full);
      try { e.anchor = JSON.parse(raw); } catch { e.anchor = { contract: 'OLVASHATATLAN' }; }
    } else if (tail.startsWith('evidence/')) {
      const id = tail.slice('evidence/'.length).replace(/\.json$/, '');
      if (!want.has(id)) continue;
      const bytes = showBytesAt(root, commit, full);
      if (bytes) e.evidenceDigests.set(id, evidenceDigest(bytes));
    } else if (!tail.includes('/') && tail.endsWith('.json')) {
      const raw = showAt(root, commit, full);
      try { e.records.push(JSON.parse(raw)); } catch { e.records.push(`OLVASHATATLAN: ${tail}`); }
    }
  }
  return [...bySid.values()];
}

/**
 * A TELJESSÉG — A FÜGGETLENÜL ELVÁRT KÉSZLETHEZ MÉRVE, NEM A BEMENETBŐL (R200 §2).
 *
 * A LELET, a chatgpt-v3-tól: a söprés `verify:external-checks` ága KIZÁRÓLAG `verdict.ok === true`-t
 * és a tiszta forrást nézte. A mai bizonyíték viszont EGYETLEN RÉSZPROGRAM eredménye
 * (`{ ok: true, complete_evidence: false, green: 1, of: 1 }`), és a söprés ezt a TELJES lánc
 * újrahasznált bizonyítékaként fogadta el: a `of` a BEMENETBŐL jött, tehát a bizonyíték a SAJÁT
 * hatókörét nevezte teljesnek (KUKA-121 · KUKA-206). Az R199 szöveges „csak 1/1" pontosítása a GÉPI
 * döntést nem javította.
 *
 * KÉT ELFOGADOTT ALAK VAN, és MINDKETTŐ a kívülről elvárt 19 programhoz szól:
 *   (a) EGYETLEN FUTÁS, ami maga is teljes: a hatóköre teljes, és a 19 program MINDEN elvárt esete
 *       ott van, zölden;
 *   (b) A SOROZAT, a MEGLÉVŐ EXS elfogadási szabállyal (`verifySeries` → `verdict.accepted`) — ez az
 *       az út, amin a programonként mért 19 program EGY kötés alatt teljessé áll össze.
 * Egy sikeres részprogram megmaradhat részprogram-eredménynek; a láncot NEM helyettesíti.
 *
 * A FRISSESSÉGET itt NEM mérjük újra (`live` nélkül hívunk): az az SRU-01 (3) szabálya, és a feloldó
 * maga végzi — a munkafát a bizonyíték forrás-commitjához mérve. A futtató konfigurációját NEM
 * másoljuk ide, mert a másolat az első szerkesztésnél elcsúszna (KUKA-003).
 */
export function externalCompleteness(root, commit, j) {
  /**
   * A MÉRCE A MAI ELFOGADÁSI PROFIL (PRF-01 · R202 §1), NEM A TELJES REGISZTER.
   *
   * Az R200-ban a független mérce a 19-programos manifeszt volt. Az R202 döntése után a mai lánc
   * elfogadási mércéje a 17-programos `today-17` profil: az eredeti `r57`/`r59` TÖRTÉNETI
   * diagnosztika, és a bukásuk nem blokkolja a mai elfogadást — de a helyettesítőik (`r57a` · `r59a`)
   * hiánya vagy pirosa IGEN, és azt az eredeti sikere SEM pótolja.
   */
  const prof = resolveProfile(ACCEPTANCE_PROFILE);
  if (!prof.ok) return { complete: false, basis: null, source_commit: null, state: 'no_valid_measurement', why: `a mai profil nem oldható fel: ${prof.why}` };
  const PROFILE = prof.profile;
  const PROFILE_FILES = measureProfileFiles(join(root, 'v3ref/external-checks'), PROFILE, PROGRAMS);
  const PROFILE_DIGEST = profileDigest({ profile: PROFILE, programs: PROGRAMS, fileDigests: PROFILE_FILES });
  const PROFILE_ROWS = profileProgramRows(PROFILE, PROGRAMS).filter(Boolean);
  const want = PROFILE_ROWS.map((p) => String(p.id));
  const why = [];

  // ── (a) EGYETLEN FUTÁS, ami maga is teljes ──────────────────────────────────────────────────────
  const v = j.verdict || {};
  const scope = j.scope || {};
  const rows = Array.isArray(j.programs) ? j.programs : [];
  const byId = new Map(rows.filter((r) => r && r.id).map((r) => [String(r.id), r]));
  const singleWhy = [];
  if (v.complete_evidence !== true) {
    singleWhy.push(`a futás bizonyítéka NEM teljes (complete_evidence=${JSON.stringify(v.complete_evidence)})`);
  }
  if (scope.complete !== true) {
    const sk = Array.isArray(scope.skipped) ? scope.skipped : [];
    singleWhy.push(`a futás hatóköre RÉSZLEGES (${JSON.stringify(scope.scope)}): ${sk.length} program nem futott`
      + `${sk.length ? ` (${sk.slice(0, 4).join(' · ')}${sk.length > 4 ? ' …' : ''})` : ''}`);
  }
  const missingProg = want.filter((id) => !byId.has(id));
  if (missingProg.length) {
    singleWhy.push(`a FÜGGETLENÜL elvárt program-készletből HIÁNYZIK ${missingProg.length}/${want.length}: `
      + `${missingProg.slice(0, 5).join(' · ')}${missingProg.length > 5 ? ' …' : ''}`);
  }
  const notOk = want.filter((id) => byId.has(id) && byId.get(id).ok !== true);
  if (notOk.length) singleWhy.push(`nem zöld program (${notOk.length}): ${notOk.slice(0, 5).join(' · ')}`);
  // ÉS AZ ESETEK IS: a program-szintű zöld nem fedi az eset-szintű hiányt (KUKA-206).
  const caseGaps = [];
  for (const pr of PROFILE_ROWS) {
    const r = byId.get(String(pr.id));
    if (!r) continue;
    const got = new Map((Array.isArray(r.case_rows) ? r.case_rows : [])
      .filter((c) => c && c.id !== undefined).map((c) => [String(c.id), c]));
    const bad = (pr.cases || []).map(String).filter((id) => !got.has(id) || got.get(id).pass !== true);
    if (bad.length) caseGaps.push(`${pr.id}(${bad.length})`);
  }
  if (caseGaps.length) {
    singleWhy.push(`eset-szintű hiány vagy bukás ${caseGaps.length} programban: ${caseGaps.slice(0, 5).join(' · ')}`);
  }
  if (!singleWhy.length) {
    return { complete: true, basis: `egyetlen TELJES futás (profil ${PROFILE.id})`, source_commit: null, state: 'reused_ok', why: '' };
  }

  // ── (b) VAGY A SOROZAT — a MEGLÉVŐ EXS elfogadási szabállyal ────────────────────────────────────
  const all = seriesAtCommit(root, commit);
  const seriesWhy = [];
  // HÁROM ÁLLAPOT, NEM KETTŐ (R202 §3): a „mért bukás" nem ugyanaz, mint a „nincs érvényes mérés".
  let measuredFailure = false;
  for (const e of all) {
    /**
     * A SOROZAT CSAK A MAI PROFIL ALATT SZÁMÍT MAI BIZONYÍTÉKNAK (R202 §1).
     *
     * Egy `historical-19` sorozat a saját mércéjéhez képest lehet teljes és zöld — a MAI, 17-programos
     * elfogadás bizonyítéka ettől NEM lesz. A horgony profil-neve és -lenyomata dönt, nem a rekordok
     * száma (`KUKA-121`).
     */
    const anchorProfile = String(((e.anchor || {}).binding || {}).profile_id || '');
    if (anchorProfile !== PROFILE.id) {
      seriesWhy.push(`${e.sid}: MÁS PROFIL (${anchorProfile || 'nincs megnevezve — PRF-01 előtti kötés'}) `
        + `≠ a mai ${PROFILE.id} — történeti eredmény nem mai profilbizonyíték`);
      continue;
    }
    const claimed = String(((e.anchor || {}).binding || {}).profile_digest || '');
    if (claimed !== PROFILE_DIGEST) {
      seriesWhy.push(`${e.sid}: a horgony PROFIL-lenyomata ${claimed || '(nincs)'}, a repóból ÚJRASZÁMOLVA `
        + `${PROFILE_DIGEST} — a profil megváltozott a mérés óta`);
      continue;
    }
    const { verdict } = verifySeries({
      records: e.records, programs: PROFILE_ROWS, expected: e.anchor, evidenceDigests: e.evidenceDigests,
    });
    if (verdict.accepted === true) {
      const prov = (e.anchor && e.anchor.provenance) || {};
      return {
        complete: true,
        basis: `SOROZAT ${e.sid} · profil ${PROFILE.id} (${verdict.green}/${verdict.of}, EXS elfogadva)`,
        source_commit: typeof prov.commit === 'string' ? prov.commit : null,
        state: 'reused_ok',
        why: '',
      };
    }
    // A MAI PROFIL ALATT, TELJES KÉSZLETTEL, DE NEM ZÖLD → ez MÉRT BUKÁS, nem „nincs mérés".
    if (verdict.complete === true) measuredFailure = true;
    seriesWhy.push(`${e.sid} (profil ${PROFILE.id}): ${verdict.why}`);
  }
  why.push(...singleWhy.map((x) => `EGYETLEN FUTÁS — ${x}`));
  if (!all.length) {
    why.push(`a commitban EGYETLEN SOROZAT SINCS (${EXTERNAL_SERIES_BASE}) — a teljes lánc bizonyítéka hiányzik`);
  } else {
    why.push(`a commit ${all.length} sorozata közül EGYIKET SEM fogadja el az EXS szabály: `
      + `${seriesWhy.slice(0, 2).join(' | ')}${seriesWhy.length > 2 ? ' | …' : ''}`);
  }
  return {
    complete: false,
    basis: null,
    source_commit: null,
    // A HÁROM ÁLLAPOT (R202 §3): ha a mai profil alatt TELJES készlet mérődött, de nem zöld, akkor a
    // lánc állapota MÉRT BUKÁS — azt nem nevezzük „nincs érvényes mérés"-nek, mert az elhallgatná,
    // hogy TUDJUK az eredményt (`KUKA-206`).
    state: measuredFailure ? 'measured_failure' : 'no_valid_measurement',
    why: why.join(' · '),
  };
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
    /**
     * A TELJES LÁNC ÚJRAHASZNÁLATA A FÜGGETLENÜL ELVÁRT KÉSZLETHEZ KÖTVE (R200 §2).
     *
     * A LELET, a chatgpt-v3-tól: ez az ág KIZÁRÓLAG `v.ok === true`-t és a tiszta forrást nézte, a
     * TELJESSÉGET meg sem kérdezte. A mai bizonyíték-fájl viszont ezt mondja magáról:
     *   `verdict = { ok: true, complete_evidence: false, green: 1, env_skipped: 0, of: 1 }`
     * — egyetlen RÉSZPROGRAM eredménye —, és a söprés ezt a TELJES `verify:external-checks` lánc
     * újrahasznált bizonyítékaként fogadta el: a `of` a BEMENETBŐL jött, tehát a bizonyíték a SAJÁT
     * hatókörét nevezte teljesnek (KUKA-121 · KUKA-206). Az R199 szöveges „csak 1/1" pontosítása a
     * GÉPI döntést nem javította.
     *
     * A teljesség mércéje innentől KÍVÜLRŐL jön, és NEM itt dől el: `externalCompleteness`.
     */
    const v = j.verdict || {}; const src = j.source || {};
    const srcCommit = typeof src.commit === 'string' ? src.commit : '';
    const dirty = src.clean !== true || /\+uncommitted$/.test(srcCommit);
    const why = [];
    if (v.ok !== true) why.push(`a verdikt nem zöld (ok=${JSON.stringify(v.ok)}, ${v.green}/${v.of}, env-kihagyás ${v.env_skipped})`);
    const comp = externalCompleteness(root, commit, j);
    if (!comp.complete) why.push(comp.why);
    /**
     * A FORRÁS, AMIHEZ AZ SRU-01 (3) A MUNKAFÁT MÉRI. Ha a teljességet a SOROZAT adja, akkor a lánc
     * bizonyítéka a sorozat, tehát a forrás a HORGONY származása — nem a `results/` alatti, minden
     * futással FELÜLÍRT egyfutás-fájl commitja. Különben egy részleges mai futás commitja
     * hitelesítene egy MÁS forráson született sorozatot (KUKA-051).
     */
    const viaSeries = comp.complete && Boolean(comp.source_commit);
    const bindCommit = viaSeries ? comp.source_commit : srcCommit;
    const bindDirty = viaSeries ? /\+uncommitted$/.test(comp.source_commit) : dirty;
    if (bindDirty) why.push(`a bizonyíték NEM tiszta forráson készült (${bindCommit || 'nincs forrás-commit'})`);
    const green = why.length === 0;
    const profileRows = (() => {
      const pr = resolveProfile(ACCEPTANCE_PROFILE);
      return pr.ok ? profileProgramRows(pr.profile, PROGRAMS).filter(Boolean).length : 0;
    })();
    return {
      present: true, green, at: j.at || null, node: j.node || null,
      source_commit: bindDirty ? null : bindCommit,
      // A HÁROM ÁLLAPOT ÁTVEZETVE (R202 §3) — a söprés sora ebből írja ki, MI történt.
      state: green ? 'reused_ok' : (comp.state || 'no_valid_measurement'),
      summary: comp.complete
        ? `${comp.basis} — a MAI profil elvárt készlete: ${profileRows} program`
        : `${v.green}/${v.of} (a MAI profil elvárt készlete: ${profileRows} program), `
          + `complete_evidence=${JSON.stringify(v.complete_evidence)}`,
      why: why.join(' · '),
    };
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
  /**
   * A HÁROM ÁLLAPOT (R202 §3): a SPEC kimondja, hogy a söprés kiírása különböztesse meg a
   * „most nem futott, korábbi bizonyíték ÚJRAHASZNÁLT", a „MÉRT BUKÁS" és a „NINCS ÉRVÉNYES MÉRÉS"
   * állapotot. A régi alak kettőt ismert (`reused` · `unverified`), és a mért bukást is „nem
   * igazolt"-nak nevezte — ami elhallgatja, hogy TUDJUK az eredményt (`KUKA-206`).
   */
  out.state = out.status === 'reused'
    ? 'reused_ok'
    : ((out.evidence && out.evidence.state) || 'no_valid_measurement');
  return out;
}

/** A söprés két kimeneti sora — EGY helyen, hogy a próba és a söprés ugyanazt írja. */
export function reuseLine(a) {
  if (a.status === 'reused') {
    return `ÚJRAHASZNÁLT BIZONYÍTÉK — ${a.chain}: MOST NEM FUTOTT, a(z) ${a.commit.slice(0, 7)} commit bizonyítéka ZÖLD (${a.evidence.summary}, ${a.evidence.at}), azonosság MÉRVE: ${a.checks.map((k) => k.name).join(' · ')}${a.cheap_part ? ` · az olcsó fele lefutott (${a.cheap_part})` : ''}`;
  }
  /**
   * A MÉRT BUKÁS KÜLÖN SOR (R202 §3). A „nincs érvényes mérés" azt állítja, hogy nem tudjuk; a
   * „mért bukás" azt, hogy TUDJUK, és piros. A kettőt nem mossuk össze.
   */
  if (a.state === 'measured_failure') {
    return `MÉRT BUKÁS — ${a.chain}: a mai profil alatt a készlet TELJES, de a verdikt NEM ZÖLD — ${a.why || 'nevezett lelet'}. `
      + `Ez NEM „nincs mérés": az eredmény MEGVAN és piros. Az összverdikt ettől nem zöld.`;
  }
  return `NINCS ÉRVÉNYES MÉRÉS — ${a.chain}: ${a.why || 'a kihagyás feltételei nem teljesülnek'}. Az összverdikt ettől NEM zöld; a lánc futtatása: npm run ${a.chain}`;
}

export const SRU_CONTRACT = Object.freeze({
  contract_id: SRU_CONTRACT_ID,
  pure: true,
  statuses: REUSE_STATUS,
  chains: Object.keys(CHAINS),
  rule: 'reused CSAK: feloldott commit + zöld, tiszta bizonyíték + munkafa/index/követetlen azonosság a bizonyíték forrásával + lánc-szkript/függőség/futtató azonosság; különben unverified, a lánc nem indul, az összverdikt nem zöld',
});
