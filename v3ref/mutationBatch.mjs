// v3ref/mutationBatch.mjs — MBX-01: AZ EGYSZER MÉRT ALAPVONAL EGY RÖGZÍTETT MÉRÉSI CSOMAGHOZ
//
// MIÉRT SZÜLETETT (R198 §0). Az R197 fázis-mérése kimondta, hogy a másolás NEM érdemi szűk
// keresztmetszet: a 26,4 MB-os másolat 29 ms, tíz másolat 3,6%. A domináns költség a TELJES,
// mutálatlan alapvonal, amit a régi szerződés MINDEN egységben újra lefuttat. MÉRVE (üres szelet,
// `--unit=254/254`, tehát alapvonal + nyolc ellenpróba, NULLA mutáció): **4 254 és 5 526 ms**.
// Ennyit fizet ki minden egység, mielőtt egyetlen mutációt megmérne.
//
// A chatgpt-v3 az R196-ban TILTOTTA az alapvonal megosztását, és az R198 §0-ban ezt a korlátot
// KIZÁRÓLAG erre az itt meghatározott, SAJÁT VEZÉRLÉSŰ batch módra oldotta fel — a biztonsági és
// bizonyíték-követelményeket NEM oldotta fel. Ezért ez a modul egy KÜLÖN NEVŰ, KÜLÖN VERZIÓS
// szerződés (`MBX-01`), nem a régi szerződés átnevezése: a régi, önállóan indított egység
// TOVÁBBRA IS maga futtatja az alapvonalát, és a 12 000 / 15 000 ms-os korlát nem emelkedik.
//
// AMIT EZ A SZERZŐDÉS KÖVETEL (R198 §2) — és mind a hét pont GÉPI jel, nem jóindulat:
//   (1) a batch INDÍTÁSAKOR a megbízható SZÜLŐ rögzíti a teljes tervezett egység-/mutációkészletet
//       ÉS a kötést: mért forrás · futtató · manifeszt · konfiguráció · futtatókörnyezet · batch-azonosító;
//   (2) a lenyomat fedi az ÚJ segédmodulokat is — a `BND-01` NEM rekurzív, tehát az
//       `external-checks/batteryUnits.mjs`-t önmagában NEM fedi (ezt az R198 §2 kimondja);
//   (3) a teljes mutálatlan alapvonal TÉNYLEGESEN lefut, átmegy az érvényességi és kilépési
//       ellenőrzéseken, és MINDEN elvárt próba PASS — hibás, hiányos vagy megszakított alapvonal
//       után NINCS mutációs elfogadás;
//   (4) csak UGYANAZON AKTÍV batch változatlan forrásmásolatai használhatják. Új program, új negatív
//       forgatókönyv, megváltozott bemenet vagy újraindított batch ÚJ alapvonalat kér;
//   (5) másik batch eredménye, üres/kitalált lenyomat, hiányzó vagy megváltozott bizonyíték
//       NEVEZETT hiba — és egy környezeti változóba írt „baseline=PASS" NEM bizonyíték, ezért a
//       bizonyíték LEMEZEN álló fájl, aminek a lenyomatát a gyermek ÚJRASZÁMOLJA;
//   (6) az egység a SZÜLŐ elvárásához ÉS a VALÓDI alapvonal-bizonyítékhoz kötődik — egység nem
//       igazolhatja önmagát a saját állításából;
//   (7) mind a nyolc meglévő ellenpróba TOVÁBBRA IS minden egységben ténylegesen fut, és minden
//       mutáció saját izolált másolatot, friss futásjelet és valódi próbafutást kap.
//
// A KORLÁT KIMONDVA, és ezt nem is állítjuk többnek: ez KONZISZTENCIA-ellenőrzés, nem kriptográfiai
// védelem egy minden fájlhoz hozzáférő rosszindulatú író ellen (ugyanaz a korlát, amit az `EXS-01`
// kapu is kimond). Amit megfog: a piszkos forrást, az idegen batchet, a megváltozott futtatót vagy
// manifesztet, a hiányzó vagy átírt alapvonal-bizonyítékot, a megszakított alapvonalat, és azt, ha
// egy egység a saját állításából próbálná igazolni magát.
//
// ÉS AMI MIATT TISZTA FÜGGVÉNY: a kapu döntését próbából KÖZVETLENÜL hívjuk, valódi futás nélkül
// (`KUKA-207`), és a próba a VISELKEDÉST méri, nem a forrás szövegét (`KUKA-239`).
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { digestOfBundle } from './bundleDigest.mjs';

export const BATCH_CONTRACT = 'MBX-01';
export const BATCH_CONTRACT_VERSION = 2;

/**
 * A TARTALMI AZONOSSÁG ÉS AZ EGYSZERI FUTÁSPÉLDÁNY KÜLÖN FOGALOM (R200 §1).
 *
 * A LELET, MÉRVE a chatgpt-v3 által a `bc374c6` fejen: a `batchId` KIZÁRÓLAG a tartalmi kötésből és
 * a tervből származott, ezért **két külön indítás** — eltérő `started_at` és eltérő
 * alapvonal-bizonyíték mellett — UGYANAZT az azonosítót kapta. Reprodukálva:
 *   b484366ddbac1 vs b484366ddbac1 → AZONOS.
 * Ettől a `verifyBatchForUnit` nem kapott külön elvárt futáspéldányt: az AKTÍV futást tartalmi
 * egyezéssel helyettesítette, tehát egy KORÁBBI, már lezárt vagy megszakadt csomag alapvonala egy
 * ÚJ futás friss alapvonalaként szolgálhatott volna.
 *
 * A KETTŐ EZÉRT KÜLÖNVÁLIK, és mind a kettő kell:
 *   · `batch_id`  — a TARTALMI azonosság (kötés + terv). Ugyanaz a forrás és ugyanaz a terv
 *     ugyanabba a tartalmi osztályba esik; ez teszi összehasonlíthatóvá a futásokat.
 *   · `run_id`    — az EGYSZERI FUTÁSPÉLDÁNY. A szülő MINDEN indításnál FRISSET ad, és ez köti
 *     össze az alapvonalat, az egységeket és az összefűzést UGYANAHHOZ a futáshoz.
 * A történeti bizonyíték ettől olvasható marad a SAJÁT futásáról — de nem válik új futássá.
 */
export function newRunId() { return `r_${randomUUID()}`; }

/** A batch-horgony és a bizonyíték fájlneve — EGY otthon, hogy a szülő és a gyermek ne gépelje kétszer. */
export const BATCH_ANCHOR_FILE = 'batch.json';
export const BATCH_BASELINE_FILE = 'baseline.json';
export const BATCH_ATTEMPTS_FILE = 'attempts.jsonl';

/**
 * A MUTÁCIÓS FUTTATÓ ALKÖNYVTÁRI DARABJAI — NÉVSZERINT (R198 §2).
 *
 * A `BND-01` a `v3ref/*.mjs` kötegét fedi, de NEM rekurzívan. A darabolás otthona viszont az
 * `external-checks/` alatt él, tehát a köteg-lenyomat önmagában NEM fedné: egy ottani változás
 * NÉMÁN ugyanabba a batchbe esne. Ezért a batch-lenyomat a köteg MELLÉ ezeket is beszámolja.
 */
export const BATCH_EXTRA_FILES = Object.freeze(['external-checks/batteryUnits.mjs']);

const sha = (s) => createHash('sha256').update(s).digest('hex');
const str = (v) => (typeof v === 'string' ? v : '');
const isHex = (v, n) => typeof v === 'string' && new RegExp(`^[0-9a-f]{${n}}$`).test(v);

/** A részletes bizonyíték lenyomata — EGY otthon, mert a szülő ÍRJA és a gyermek ÚJRASZÁMOLJA. */
export function evidenceDigest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * A TELJES MUTÁCIÓS FUTTATÓ LENYOMATA: a `BND-01` köteg + a nevezett alkönyvtári darabok.
 * Ha bármelyik nevezett fájl HIÁNYZIK, a lenyomat `null` — nem egy „üres fájlok lenyomata" nevű
 * hamis zöld (`KUKA-051`).
 */
export function batchRunnerDigest(refDir) {
  let bundle = null;
  try { bundle = String(digestOfBundle(refDir.replace(/\/v3ref$/, ''))).replace(/^sha256:/, ''); } catch { return null; }
  if (!isHex(bundle, 64)) return null;
  const rows = [['__bundle__', bundle]];
  for (const rel of BATCH_EXTRA_FILES) {
    const p = join(refDir, rel);
    if (!existsSync(p)) return null;
    rows.push([rel, sha(readFileSync(p))]);
  }
  return sha(JSON.stringify(rows));
}

/** A darabolási konfiguráció lenyomata — ami a MÉRÉS eredményét befolyásolja. */
export function batchConfigDigest(config = {}) {
  return sha(JSON.stringify({
    units: Number(config.units) || null,
    unit_budget_ms: Number(config.unit_budget_ms) || null,
    external_cap_ms: Number(config.external_cap_ms) || null,
  })).slice(0, 16);
}

/**
 * A FUTTATÓKÖRNYEZET lenyomata (R198 §2: „releváns futtatókörnyezet"). Csak az, ami a mérés
 * eredményét befolyásolja — a node fő verziója és a platform. A pontos javítás-verziót és a
 * gép-azonosítót SZÁNDÉKOSAN kihagyjuk: azoktól két jogos részfutás sem tartozhatna egy batchbe.
 */
export function batchRuntimeDigest(env = {}) {
  return sha(JSON.stringify({
    node_major: str(env.node_major),
    platform: str(env.platform),
    arch: str(env.arch),
  })).slice(0, 16);
}

/** A kötés kanonikus alakja — a horgony és a gyermek UGYANEZT az öt mezőt méri. */
export function canonBatchBinding(b = {}) {
  return {
    source_digest: str(b && b.source_digest),
    runner_digest: str(b && b.runner_digest),
    programs_digest: str(b && b.programs_digest),
    config_digest: str(b && b.config_digest),
    runtime_digest: str(b && b.runtime_digest),
  };
}

/** A kötés ÉRDEMI állapota: valódi lenyomatok, nem „nem üres" értékek. */
export function batchBindingProblems(binding, { label = 'batch-kötés' } = {}) {
  if (!binding || typeof binding !== 'object') return [`a ${label} nem objektum`];
  const b = canonBatchBinding(binding);
  const p = [];
  if (!isHex(b.source_digest, 64)) p.push(`a ${label} MÉRT FORRÁS-lenyomata nem valódi (64-hex): ${JSON.stringify(b.source_digest)}`);
  if (!isHex(b.runner_digest, 64)) p.push(`a ${label} FUTTATÓ-lenyomata nem valódi (64-hex): ${JSON.stringify(b.runner_digest)}`);
  if (!isHex(b.programs_digest, 64)) p.push(`a ${label} MANIFESZT-lenyomata nem valódi (64-hex): ${JSON.stringify(b.programs_digest)}`);
  if (!isHex(b.config_digest, 16)) p.push(`a ${label} KONFIGURÁCIÓ-lenyomata nem valódi (16-hex): ${JSON.stringify(b.config_digest)}`);
  if (!isHex(b.runtime_digest, 16)) p.push(`a ${label} FUTTATÓKÖRNYEZET-lenyomata nem valódi (16-hex): ${JSON.stringify(b.runtime_digest)}`);
  return p;
}

/** Két kötés MEZŐNKÉNTI egyezése — a várt érték a HORGONYBÓL jön, nem a gyermek állításából. */
export function batchBindingMismatch(got, expected) {
  const a = canonBatchBinding(got);
  const b = canonBatchBinding(expected);
  const out = [];
  for (const k of Object.keys(a)) {
    if (a[k] !== b[k]) {
      const sh = (v) => (v && v.length > 16 ? `${v.slice(0, 12)}…` : JSON.stringify(v));
      out.push(`${k}: ${sh(a[k])} ≠ ELVÁRT ${sh(b[k])}`);
    }
  }
  return out;
}

/** A BATCH-AZONOSÍTÓ a KÖTÉSBŐL + a tervből származik, nem véletlenszám (így nem keverhető össze). */
export function batchId({ binding, plan } = {}) {
  return `b${sha(JSON.stringify({ b: canonBatchBinding(binding), p: canonPlan(plan) })).slice(0, 12)}`;
}

/** A TERV kanonikus alakja: a teljes tervezett egység-/mutációkészlet (R198 §2). */
export function canonPlan(plan = {}) {
  return {
    units: Number.isInteger(plan && plan.units) ? plan.units : null,
    mutation_count: Number.isInteger(plan && plan.mutation_count) ? plan.mutation_count : null,
    // Egységenként a MUTÁCIÓ-AZONOSÍTÓK: a gyermek ebből tudja, hogy a SAJÁT szelete a tervben áll.
    slices: plan && plan.slices && typeof plan.slices === 'object'
      ? Object.fromEntries(Object.entries(plan.slices).map(([k, v]) => [String(k), (Array.isArray(v) ? v : []).map(String)]))
      : {},
  };
}

/** Az ALAPVONAL-BIZONYÍTÉK kanonikus alakja — ez az, amit a gyermek a saját alapvonala HELYETT használ. */
export function canonBaseline(b = {}) {
  return {
    ok: b && b.ok === true,
    run_id: str(b && b.run_id),
    probes: (Array.isArray(b && b.probes) ? b.probes : []).map(String),
    records: Array.isArray(b && b.records) ? b.records : [],
    digest: str(b && b.digest),
    ms: Number.isFinite(b && b.ms) ? b.ms : null,
    at: str(b && b.at),
  };
}

/**
 * AZ ALAPVONAL ÉRVÉNYESSÉGE — a (3) pont gépi alakja.
 *
 * `expectedProbes`: a manifeszt ELVÁRT próbakészlete. Nem elég, hogy „zöld": MINDEN elvárt
 * próbának le kell futnia és PASS-nak kell lennie. A hiányos alapvonal után nincs mutációs
 * elfogadás (`KUKA-206`: a „nem futott" nem „részben").
 */
export function baselineProblems(baseline, expectedProbes, expected = {}) {
  if (!baseline || typeof baseline !== 'object') return ['az ALAPVONAL-BIZONYÍTÉK hiányzik vagy nem objektum'];
  const b = canonBaseline(baseline);
  const p = [];
  if (b.ok !== true) p.push('az ALAPVONAL nem ZÖLD — hibás vagy megszakított alapvonal után NINCS mutációs elfogadás');
  if (!b.probes.length) p.push('az ALAPVONAL egyetlen lefutott próbát sem nevez meg');
  if (!b.records.length) p.push('az ALAPVONAL nem hordoz próba-rekordokat (a puszta „PASS" nem bizonyíték)');
  if (!/^sha256:[0-9a-f]{64}$/.test(b.digest)) p.push(`az ALAPVONAL forrás-lenyomata nem valódi: ${JSON.stringify(b.digest.slice(0, 24))}`);

  /**
   * A FORRÁSLENYOMAT A HORGONYHOZ **ÉS** AZ ÉLŐ ELVÁRÁSHOZ KÖTVE (R200 §1/c).
   *
   * A LELET, MÉRVE: a teljes rekordkészlet mellett a `baseline.digest`-et `'sha256:'+'f'*64`-re
   * cserélve a kapu `ok: true`-t adott — vagyis a bizonyíték forrása NEM a horgony forrása volt, és
   * ez nem látszott. A `digest` „valódi alakú" volt, csak MÁS forrásról szólt; az alak önmagában
   * sosem mérce (`KUKA-121`: a bizonyíték nem igazolhatja önmagát).
   */
  if (expected.source_digest) {
    if (b.digest !== expected.source_digest) {
      p.push(`az ALAPVONAL MÁS FORRÁSRÓL szól: a bizonyíték ${b.digest.slice(0, 20)}…, az ELVÁRT `
        + `${String(expected.source_digest).slice(0, 20)}… — a bizonyíték forrása nem a batch forrása`);
    }
  }

  /**
   * AZ EGYSZERI FUTÁSPÉLDÁNY (R200 §1): a bizonyítéknak UGYANAHHOZ a futáshoz kell tartoznia, amit a
   * szülő most indított. Enélkül egy korábbi, lezárt vagy megszakadt csomag alapvonala egy ÚJ futás
   * friss alapvonalaként szolgálhatna.
   */
  if (expected.run_id) {
    if (!str(b.run_id)) p.push('az ALAPVONAL nem nevez meg FUTÁSPÉLDÁNYT — korábbi csomag nem szolgálhat új futás alapvonalaként');
    else if (str(b.run_id) !== String(expected.run_id)) {
      p.push(`az ALAPVONAL MÁS FUTÁSBÓL való: ${str(b.run_id).slice(0, 16)}… ≠ az ELVÁRT `
        + `${String(expected.run_id).slice(0, 16)}… — lezárt vagy megszakadt csomag nem új futás`);
    }
  }

  /**
   * MINDEN ELVÁRT REKORD PONTOSAN EGYSZER, PASS ÁLLAPOTTAL (R200 §1/b).
   *
   * A LELET, MÉRVE: a `records`-ból a `p2`-t törölve — de a `probes` listában meghagyva, és a
   * horgony lenyomatát a CSÖKKENTETT bizonyítékhoz illesztve — a kapu `ok: true`-t adott. Az ok
   * HÁRMAS volt: (1) a hiányt a `probes` LISTÁN kérdeztem, ami ÁLLÍTÁS, nem bizonyíték;
   * (2) a „nem PASS" ellenőrzés csak azokra az azonosítókra futott, amelyek a `Map`-ben BENNE
   * VOLTAK — a hiányzó rekord így láthatatlan maradt; (3) a `Map`-be alakítás a DUPLIKÁTUMOT
   * némán összevonta (az utolsó győzött).
   *
   * Innentől a REKORDOKAT számoljuk, nem a listát hisszük el: minden elvárt próbának PONTOSAN EGY
   * rekordja van, `PASS` állapottal; a hiány, a duplikáció, a nem várt és az érvénytelen bejegyzés
   * mind NEVEZETT lelet — és a `probes` lista is a rekordokhoz méretik, mert az ÁLLÍTÁS nem lehet
   * erősebb a saját adatánál (`KUKA-129`).
   */
  if (Array.isArray(expectedProbes) && expectedProbes.length) {
    const want = expectedProbes.map(String);
    const rows = b.records;
    const invalid = rows.filter((r) => !r || typeof r !== 'object' || Array.isArray(r) || !str(r.probe_id));
    if (invalid.length) p.push(`az ALAPVONALBAN ${invalid.length} ÉRVÉNYTELEN rekord-bejegyzés (nincs probe_id vagy nem objektum)`);
    const ids = rows.filter((r) => r && str(r.probe_id)).map((r) => str(r.probe_id));
    const count = new Map();
    for (const id of ids) count.set(id, (count.get(id) || 0) + 1);

    const missing = want.filter((id) => !count.has(id));
    if (missing.length) {
      p.push(`az ALAPVONALBÓL HIÁNYZÓ elvárt próba-REKORD (${missing.length}): `
        + `${missing.slice(0, 6).join(' · ')}${missing.length > 6 ? ' …' : ''}`);
    }
    const dupes = want.filter((id) => (count.get(id) || 0) > 1);
    if (dupes.length) {
      p.push(`az ALAPVONALBAN DUPLIKÁLT elvárt próba-rekord (${dupes.length}): ${dupes.slice(0, 6).join(' · ')} `
        + '— nem dönthető el, melyik az érvényes');
    }
    const extra = [...count.keys()].filter((id) => !want.includes(id));
    if (extra.length) {
      p.push(`az ALAPVONALBAN NEM VÁRT próba-rekord (${extra.length}): ${extra.slice(0, 6).join(' · ')} `
        + '— a manifeszten kívüli rekord nem bizonyíték');
    }
    const byId = new Map();
    for (const r of rows) { const id = str(r && r.probe_id); if (id && !byId.has(id)) byId.set(id, r); }
    const notPass = want.filter((id) => byId.has(id) && String(byId.get(id).status || '') !== 'PASS');
    if (notPass.length) p.push(`az ALAPVONALBAN NEM PASS elvárt próba: ${notPass.slice(0, 6).join(' · ')}`);

    // A `probes` LISTA A REKORDOKHOZ MÉRETIK: az állítás ne legyen erősebb a bizonyítékánál.
    const claimedOnly = b.probes.filter((id) => !count.has(id));
    if (claimedOnly.length) {
      p.push(`az ALAPVONAL ${claimedOnly.length} próbát ÁLLÍT, amihez nincs rekordja: `
        + `${claimedOnly.slice(0, 6).join(' · ')} — a lista nem bizonyíték`);
    }
  }
  return p;
}

/** A BATCH-HORGONY — amit a megbízható SZÜLŐ a batch INDÍTÁSAKOR rögzít. */
export function makeBatchAnchor({ binding, plan, run_id, baseline_source_digest, baseline_evidence_digest, recorded_by, started_at } = {}) {
  const b = canonBatchBinding(binding);
  const p = canonPlan(plan);
  return {
    contract: BATCH_CONTRACT,
    version: BATCH_CONTRACT_VERSION,
    // A TARTALMI azonosság: ugyanaz a forrás + ugyanaz a terv ugyanide esik.
    batch_id: batchId({ binding: b, plan: p }),
    // AZ EGYSZERI FUTÁSPÉLDÁNY: minden indításnál FRISS (R200 §1).
    run_id: str(run_id),
    binding: b,
    plan: p,
    // AZ ELVÁRT ALAPVONAL-FORRÁS: a bizonyíték forrásának a batch forrásával kell egyeznie.
    baseline_source_digest: str(baseline_source_digest),
    baseline_evidence_digest: str(baseline_evidence_digest),
    recorded_by: str(recorded_by) || 'mutate.mjs --units-auto',
    started_at: str(started_at) || new Date().toISOString(),
  };
}

/** A horgony ALAKI és ÉRDEMI érvényessége — a kitalált horgony itt esik ki. */
export function batchAnchorProblems(anchor) {
  if (!anchor || typeof anchor !== 'object' || Array.isArray(anchor)) {
    return ['a BATCH-HORGONY hiányzik vagy nem objektum — az ELVÁRT kötés nem ismert, tehát megosztott alapvonal nem használható'];
  }
  const p = [];
  if (anchor.contract !== BATCH_CONTRACT) p.push(`a horgony idegen szerződés: ${JSON.stringify(anchor.contract)} (várt: ${BATCH_CONTRACT})`);
  if (anchor.version !== BATCH_CONTRACT_VERSION) p.push(`a horgony idegen szerződés-verzió: ${JSON.stringify(anchor.version)} (várt: ${BATCH_CONTRACT_VERSION})`);
  p.push(...batchBindingProblems(anchor.binding, { label: 'horgony-kötés' }));
  const plan = canonPlan(anchor.plan);
  if (!plan.units || plan.units < 1) p.push('a horgony nem nevezi meg a tervezett EGYSÉG-számot');
  if (!plan.mutation_count || plan.mutation_count < 1) p.push('a horgony nem nevezi meg a tervezett MUTÁCIÓ-számot');
  if (!Object.keys(plan.slices).length) p.push('a horgony nem nevezi meg a tervezett egység-/mutációkészletet (szeletek)');
  if (!isHex(anchor.baseline_evidence_digest, 64)) {
    p.push(`a horgony ALAPVONAL-lenyomata nem valódi (64-hex): ${JSON.stringify(str(anchor.baseline_evidence_digest).slice(0, 24))}`);
  }
  // AZ EGYSZERI FUTÁSPÉLDÁNY KÖTELEZŐ (R200 §1): nélküle az aktív futást tartalmi egyezés helyettesítené.
  if (!/^r_[0-9a-f-]{36}$/.test(str(anchor.run_id))) {
    p.push(`a horgony nem nevez meg érvényes FUTÁSPÉLDÁNYT (run_id): ${JSON.stringify(str(anchor.run_id).slice(0, 24))}`);
  }
  /**
   * AZ ELVÁRT ALAPVONAL-FORRÁS A KÖTÉSHEZ LÁNCOLVA (R200 §1/c). A horgony nem mondhat MÁS forrást az
   * alapvonalra, mint amit a saját kötése hordoz — különben a „bizonyíték forrása" szabadon lebegne.
   */
  const wantBase = `sha256:${canonBatchBinding(anchor.binding).source_digest}`;
  if (str(anchor.baseline_source_digest) !== wantBase) {
    p.push(`a horgony ELVÁRT alapvonal-forrása ${str(anchor.baseline_source_digest).slice(0, 20)}…, `
      + `a saját kötése szerint ${wantBase.slice(0, 20)}… — a kettőnek egyeznie kell`);
  }
  const recomputed = batchId({ binding: anchor.binding, plan: anchor.plan });
  if (str(anchor.batch_id) !== recomputed) {
    p.push(`a horgony batch-azonosítója ${JSON.stringify(anchor.batch_id)}, a kötésből+tervből ÚJRASZÁMOLVA ${recomputed}`);
  }
  return p;
}

/**
 * A GYERMEK KAPUJA — HASZNÁLHATJA-E EZ AZ EGYSÉG A MEGOSZTOTT ALAPVONALAT?
 *
 * Ez a döntés tiszta függvény, hogy a próba KÖZVETLENÜL hívhassa (`KUKA-207`). A gyermek a SAJÁT
 * mérését (`liveBinding`) és a lemezről beolvasott bizonyíték BÁJTJAIT adja be — a várt értéket a
 * HORGONY hordozza, nem a gyermek állítása (`KUKA-121`: a bizonyíték nem igazolhatja önmagát).
 */
export function verifyBatchForUnit({ anchor, unit, liveBinding, baselineBytes, baseline, expectedProbes } = {}) {
  const problems = [...batchAnchorProblems(anchor)];
  if (problems.length) return { ok: false, problems };

  // (4) UGYANAZON AKTÍV BATCH: a gyermek SAJÁT mérése egyezzen a horgony kötésével, mezőnként.
  const mm = batchBindingMismatch(liveBinding, anchor.binding);
  if (mm.length) {
    problems.push(`a gyermek MÉRT állapota nem a horgony batchéhez tartozik: ${mm.join(' · ')}`);
  }
  // (1) A TERVBEN ÁLL-E EZ AZ EGYSÉG, ÉS UGYANAZT A SZELETET FUTTATJA-E?
  const plan = canonPlan(anchor.plan);
  const k = unit && Number(unit.k);
  const n = unit && Number(unit.n);
  if (!Number.isInteger(k) || !Number.isInteger(n) || k < 1 || n < 1 || k > n) {
    problems.push(`az egység megnevezése érvénytelen: ${JSON.stringify(unit)}`);
  } else if (n !== plan.units) {
    problems.push(`az egység ${n} darabos bontásból jön, a terv ${plan.units} egységet rögzített — újraindított batch ÚJ alapvonalat kér`);
  } else {
    const want = plan.slices[String(k)];
    if (!Array.isArray(want)) problems.push(`a terv nem tartalmazza a ${k}/${n} egységet`);
    else {
      const got = (Array.isArray(unit.mutations) ? unit.mutations : []).map(String);
      const miss = want.filter((id) => !got.includes(id));
      const extra = got.filter((id) => !want.includes(id));
      if (miss.length || extra.length) {
        problems.push(`a ${k}/${n} egység szelete nem a tervezett: hiányzó [${miss.slice(0, 4).join(' · ')}] · nem tervezett [${extra.slice(0, 4).join(' · ')}]`);
      }
    }
  }
  // (5) A BIZONYÍTÉK A LEMEZRŐL, ÚJRASZÁMOLT LENYOMATTAL — nem környezeti változóból.
  if (baselineBytes === undefined || baselineBytes === null) {
    problems.push('az ALAPVONAL-BIZONYÍTÉK fájl NEM TALÁLHATÓ — a horgony lenyomata nem ellenőrizhető');
  } else {
    const actual = evidenceDigest(baselineBytes);
    if (actual !== str(anchor.baseline_evidence_digest)) {
      problems.push(`az ALAPVONAL-BIZONYÍTÉK MÁS: a horgony ${str(anchor.baseline_evidence_digest).slice(0, 12)}…-t állít, `
        + `a lemezen álló fájl ÚJRASZÁMOLVA ${actual.slice(0, 12)}…`);
    }
  }
  // (3) ÉS AZ ALAPVONAL MAGA: zöld, teljes, minden elvárt próba PONTOSAN EGYSZER PASS — és
  // ugyanARRÓL a forrásról, ugyanABBÓL a futásból, mint amit a horgony elvár (R200 §1/b–c).
  problems.push(...baselineProblems(baseline, expectedProbes, {
    run_id: anchor.run_id,
    source_digest: anchor.baseline_source_digest,
  }));
  // (6) ÉS AZ EGYSÉG IS UGYANAHHOZ A FUTÁSHOZ TARTOZIK, ha megnevezi (az összefűzés ezt kéri).
  if (unit && unit.run_id !== undefined && str(unit.run_id) !== str(anchor.run_id)) {
    problems.push(`az egység MÁS futáspéldányt nevez meg: ${str(unit.run_id).slice(0, 16)}… ≠ `
      + `${str(anchor.run_id).slice(0, 16)}…`);
  }

  return { ok: problems.length === 0, problems };
}

/**
 * A FÁZIS-ELSZÁMOLÁS KAPUJA (R200 §2) — TISZTA FÜGGVÉNY, SZABÁLYOZHATÓ IDŐFORRÁSSAL.
 *
 * A LELET, amit a chatgpt-v3 a forrásból kimondott: a `--units-auto` ágban az összesített óra a
 * `prepareBatch(n)` **UTÁN** indult, ezért az R199-ben jelentett „TELJES, az előkészítéssel együtt"
 * **375 707 ms** az ELSŐ alapvonal **3 422 ms**-át NEM tartalmazta. Az elszámolás kisebbet mondott a
 * valóságnál, és épp azt a tételt hagyta ki, amiről a kör szólt.
 *
 * EZT NEM DRÁGA LÁNCCAL MÉRJÜK (a §2 ezt kifejezetten tiltja), hanem itt: a függvény bemenete a
 * parancs indulása, az ELSŐ előkészítés indulása, a fázis-idők és a vég — minden időpont KÍVÜLRŐL
 * adott, tehát a próba szabályozható időforráson fut, és a FÁZISSORRENDET figyeli.
 *
 * Amit elutasít: ha az összesített óra az első előkészítés UTÁN indult (a mért hiba alakja) · ha a
 * teljes idő KISEBB a részfázisok összegénél (akkor valami kimaradt) · ha az alapvonal-fázis
 * hiányzik, miközben történt előkészítés.
 */
export function phaseAccounting({ command_t0, first_prepare_t0, end_t, baseline_ms, units_ms, merge_ms, baseline_runs } = {}) {
  const problems = [];
  const num = (v) => (Number.isFinite(v) ? v : null);
  const c0 = num(command_t0);
  const p0 = num(first_prepare_t0);
  const e = num(end_t);
  const bl = num(baseline_ms) || 0;
  const un = num(units_ms) || 0;
  const mg = num(merge_ms) || 0;
  if (c0 === null) problems.push('nincs PARANCS-INDULÁS időpont — a teljes idő nem mérhető');
  if (e === null) problems.push('nincs PARANCS-VÉG időpont — a teljes idő nem mérhető');
  if (c0 !== null && p0 !== null && p0 < c0) {
    problems.push(`az összesített óra az ELSŐ ELŐKÉSZÍTÉS UTÁN indult (${c0 - p0} ms-mal) — `
      + 'az első alapvonal kimaradna a teljes időből');
  }
  const phases = bl + un + mg;
  const total = (c0 !== null && e !== null) ? e - c0 : null;
  if (total !== null && total < phases) {
    problems.push(`a TELJES idő (${total} ms) KISEBB a részfázisok összegénél (${phases} ms) — `
      + `${phases - total} ms kimaradt az elszámolásból`);
  }
  if ((num(baseline_runs) || 0) > 0 && bl <= 0) {
    problems.push('történt előkészítés, de az ALAPVONAL-fázis ideje nulla — az egyszeri előkészítés eltűnt');
  }
  return {
    total_ms: total,
    phases_ms: phases,
    unaccounted_ms: total === null ? null : total - phases,
    problems,
  };
}

// ── §4 — AZ INDÍTÁSI NAPLÓ: A MEGSZAKADT KÍSÉRLET NEM „EL NEM INDULT" ──────────────────────────
//
// AZ R197 SAJÁT HIBÁJA, NEVEZETTEN. Az `r79` ELINDULT, majd az én 1500 s-os eszköz-korlátom
// megszakította — és a jelentésem „el nem indult"-ként sorolta be, mert rekord nem keletkezett
// róla. A kettő NEM ugyanaz: az „el nem indult" azt állítja, hogy meg sem kíséreltük; a
// „megszakadt" azt, hogy fut, és nem tudjuk a verdiktjét. A megszakadás NEM termékhiba és NEM
// siker (R198 §4).
//
// EZÉRT A NAPLÓ A GYERMEK ELŐTT ÍR. Egy sor az indulásról (`started`), egy a befejezésről
// (`finished`) — és ha a szülőt kényszerűen leállítják, a `started` sor PÁR NÉLKÜL marad, tehát a
// nyitott kísérlet helyreállításkor is FELISMERHETŐ. Append-only JSONL: a megszakított írás
// legfeljebb az utolsó sort csonkítja, a korábbiakat nem.
export const ATTEMPT_STATES = Object.freeze(['started', 'finished']);

/** Egy napló-sor — a szülő a gyermek ELŐTT írja a `started`-et, utána a `finished`-et. */
export function attemptLine({ batch_id, unit, state, exit, ms, why } = {}) {
  return `${JSON.stringify({
    contract: BATCH_CONTRACT,
    batch_id: str(batch_id),
    unit: str(unit),
    state: ATTEMPT_STATES.includes(state) ? state : 'started',
    exit: Number.isInteger(exit) ? exit : null,
    ms: Number.isFinite(ms) ? ms : null,
    why: str(why) || null,
    at: new Date().toISOString(),
  })}\n`;
}

/**
 * A NAPLÓ ÉRTELMEZÉSE — ÉS A HÁROM ÁLLAPOT KÜLÖNVÁLASZTVA.
 *
 * `befejezett`  — van `started` és `finished` párja;
 * `megszakadt`  — van `started`, de NINCS `finished` (a szülőt leállították, vagy a gyermeket elvágták);
 * `el_nem_indult` — a tervben áll, de egyetlen sora sincs a naplóban.
 *
 * A csonka utolsó sort NEM dobjuk el némán: nevezetten `olvashatatlan`-ként jelenik meg.
 */
export function readAttempts(text, plannedUnits = []) {
  const rows = [];
  const broken = [];
  for (const line of String(text || '').split('\n')) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch { broken.push(line.slice(0, 60)); }
  }
  const started = new Map();
  const finished = new Map();
  for (const r of rows) {
    const u = str(r && r.unit);
    if (!u) continue;
    if (r.state === 'finished') finished.set(u, r);
    else if (r.state === 'started') started.set(u, r);
  }
  const want = plannedUnits.map(String);
  const out = { befejezett: [], megszakadt: [], el_nem_indult: [], olvashatatlan: broken };
  for (const u of want) {
    if (finished.has(u)) out.befejezett.push(u);
    else if (started.has(u)) out.megszakadt.push(u);
    else out.el_nem_indult.push(u);
  }
  // A TERVEN KÍVÜLI sor sem vész el: ha a naplóban olyan egység áll, ami nincs a tervben, az lelet.
  for (const u of [...started.keys(), ...finished.keys()]) {
    if (!want.includes(u) && !out.el_nem_indult.includes(u)) {
      if (!out.terven_kivul) out.terven_kivul = [];
      if (!out.terven_kivul.includes(u)) out.terven_kivul.push(u);
    }
  }
  return out;
}
