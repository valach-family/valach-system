// v3ref/external-checks/seriesLedger.mjs — EXS-01: A PROGRAMONKÉNT FOLYTATHATÓ MÉRÉSI SOROZAT
//
// MIÉRT SZÜLETETT (R194 §2). A lánc tizenkilenc programja egyetlen, megszakítás nélküli futásban
// nem fér a támogatott környezet 120 perces feladatkorlátjába (R193 mérése). A `--only` viszont MÁR
// MEGVAN — ami hiányzott, az a SOROZAT: hogy a külön futások eredménye (1) megmaradjon, (2) EGY
// rögzített forráshoz és konfigurációhoz legyen kötve, és (3) GÉPILEG összesíthető legyen úgy, hogy
// a hiányos vagy idegen bizonyítékot a kapu ELUTASÍTJA.
//
// A MÉRT KIINDULÓ ÁLLAPOT, AMI EZT KIKÉNYSZERÍTETTE. A `results/external-checks-result.json`
// 2026-10-09-én, egy PISZKOS forráson (`1e4faa79…+uncommitted`) készült, és azt írja magáról, hogy
// `scope: full`, `verdict.ok: true`, 19 program. A mellette álló per-program fájlok viszont MÁRA
// NÉGY különböző forrásból valók: 11 a `bc06c85`-ből, 6 KÖTÉS NÉLKÜL, 1 a `1e4faa79`-ből, 1 az
// `abe54a0`-ből. Aki ezt a fájlt olvassa, „teljes, rendben" verdiktet lát egy olyan készletre, ami
// EGYETLEN futást sem ír le. Pontosan ez az, amit az R194 §2 tilt: *„Nem válogathatók össze külön
// futások legjobb részei"* és *„részfutás ne írja felül teljesként"*.
//
// AMIT EZ A MODUL NEM TESZ. Nem nyúl a `external-checks-result.json` nevéhez és alakjához: azt a
// KÜLSŐ FÉL programjai olvassák be név szerint (`r59` · `r59a` · `r61` · `r83_runner`), tehát a
// szerződés része (`KUKA-054`). A sorozat MELLÉ kerül, nem helyette.
//
// ÉS AMI MIATT TISZTA FÜGGVÉNY: a kapu döntését próbából közvetlenül hívjuk, valódi futás nélkül
// (`KUKA-207`), és a próba a VISELKEDÉST méri, nem a forrás szövegét (`KUKA-239`).
import { createHash } from 'node:crypto';

export const SERIES_CONTRACT = 'EXS-01';

const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const str = (v) => (typeof v === 'string' ? v : '');

/**
 * AZ ÉRDEMI KONFIGURÁCIÓ LENYOMATA. Csak az kerül bele, ami a MÉRÉS EREDMÉNYÉT befolyásolja — a
 * darabolás és a futtató azonossága. A faliórát és az időbélyeget SZÁNDÉKOSAN kihagyjuk: azok
 * futásonként mások, és ha beszámítanának, két jogos részfutás sosem tartozhatna egy sorozatba.
 */
export function configDigest(config = {}) {
  const canon = JSON.stringify({
    battery_units: Number(config.battery_units) || null,
    unit_plan: Array.isArray(config.unit_plan) ? config.unit_plan.map(Number) : null,
    unit_budget_ms: Number(config.unit_budget_ms) || null,
    external_cap_ms: Number(config.external_cap_ms) || null,
    node: str(config.node),
  });
  return sha(canon).slice(0, 16);
}

/**
 * A SOROZAT AZONOSÍTÓJA — a KÖTÉSBŐL SZÁRMAZIK, nem véletlenszám. Így ugyanaz a forrás + ugyanaz a
 * konfiguráció + ugyanaz a program-készlet és futtató MINDIG ugyanabba a sorozatba esik, és egy
 * eltérő forrású futás MÁS sorozatba — tehát nem lehet véletlenül összeválogatni (R194 §2).
 */
export function seriesId(binding = {}) {
  const b = {
    commit: str(binding.commit),
    clean: binding.clean === true,
    config_digest: str(binding.config_digest),
    programs_digest: str(binding.programs_digest),
    runner_digest: str(binding.runner_digest),
  };
  return `s${sha(JSON.stringify(b)).slice(0, 12)}`;
}

/** A per-program SOROZAT-REKORD. Ez hordozza a kötést, a TÉNYLEGES kilépést és az eset-eredményt. */
export function makeRecord({ binding, program, exit, ok, cases, evidence_digest, failure, ms } = {}) {
  return {
    contract: SERIES_CONTRACT,
    series: seriesId(binding),
    binding: {
      commit: str(binding && binding.commit),
      clean: Boolean(binding && binding.clean),
      config_digest: str(binding && binding.config_digest),
      programs_digest: str(binding && binding.programs_digest),
      runner_digest: str(binding && binding.runner_digest),
    },
    program: str(program && program.id),
    program_digest: str(program && program.digest),
    exit: Number.isInteger(exit) ? exit : null,
    ok: ok === true,
    cases: (Array.isArray(cases) ? cases : []).map((c) => ({ id: str(c && c.id), pass: c && c.pass === true })),
    evidence_digest: str(evidence_digest),
    failure_kind: failure && failure.kind ? str(failure.kind) : null,
    failure_why: failure && failure.why ? str(failure.why) : null,
    ms: Number.isFinite(ms) ? ms : null,
    at: new Date().toISOString(),
  };
}

/** Egy rekord ALAKI érvényessége — a megszakadt vagy sérült fájl itt esik ki (R194 §2). */
export function recordProblems(rec, expectedCases) {
  const p = [];
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return ['a rekord nem objektum (sérült vagy megszakadt fájl)'];
  if (rec.contract !== SERIES_CONTRACT) p.push(`idegen szerződés: ${JSON.stringify(rec.contract)} (várt: ${SERIES_CONTRACT})`);
  if (!str(rec.series)) p.push('nincs sorozatazonosító');
  if (!str(rec.program)) p.push('nincs program-azonosító');
  const b = rec.binding;
  if (!b || typeof b !== 'object') p.push('nincs kötés (commit/konfiguráció)');
  else {
    if (!str(b.commit)) p.push('a kötésben nincs commit');
    if (!str(b.config_digest)) p.push('a kötésben nincs konfiguráció-lenyomat');
  }
  if (!Number.isInteger(rec.exit)) p.push('a TÉNYLEGES kilépési állapot hiányzik (nem egész)');
  if (!str(rec.evidence_digest)) p.push('nincs bizonyíték-lenyomat (a részletes fájl azonossága nem mérhető)');
  if (!Array.isArray(rec.cases)) p.push('az eset-eredmények nem listák');
  else if (Array.isArray(expectedCases)) {
    const got = rec.cases.map((c) => str(c.id));
    const want = expectedCases.map(String);
    const missing = want.filter((id) => !got.includes(id));
    const extra = got.filter((id) => !want.includes(id));
    const dupes = got.filter((id, i) => got.indexOf(id) !== i);
    if (missing.length) p.push(`HIÁNYZÓ eset(ek): ${missing.slice(0, 6).join(' · ')}${missing.length > 6 ? ' …' : ''}`);
    if (extra.length) p.push(`a manifesztben NEM SZEREPLŐ eset(ek): ${extra.slice(0, 6).join(' · ')}${extra.length > 6 ? ' …' : ''}`);
    if (dupes.length) p.push(`DUPLIKÁLT eset(ek): ${[...new Set(dupes)].slice(0, 6).join(' · ')}`);
  }
  // AZ „ok" NEM LEHET ERŐSEBB A SAJÁT ADATÁNÁL (KUKA-129: a nyugtának is igazat kell mondania).
  if (rec.ok === true && Number.isInteger(rec.exit) && rec.exit !== 0) {
    p.push(`a rekord ZÖLDET állít, de a tényleges kilépés ${rec.exit}`);
  }
  if (rec.ok === true && Array.isArray(rec.cases) && rec.cases.some((c) => c.pass !== true)) {
    p.push('a rekord ZÖLDET állít, de van bukott esete');
  }
  return p;
}

/**
 * A SOROZAT ÖSSZESÍTÉSE — ÉS A TELJES VERDIKT CSAK A TELJES, ELLENŐRZÖTT KÉSZLETBŐL.
 *
 * Elutasítja: a hiányzó programot · a duplikátumot · az eltérő forrású vagy konfigurációjú rekordot ·
 * a sérült/megszakadt fájlt · az eset-azonosító eltérést. És a korábbi siker NEM fedi el ugyanazon
 * sorozat későbbi kudarcát: a verdikt MINDEN rekordot számol, nem a legjobbat.
 */
export function verifySeries({ records, programs } = {}) {
  const problems = [];
  const recs = Array.isArray(records) ? records.filter(Boolean) : [];
  const progs = Array.isArray(programs) ? programs : [];
  const expectedIds = progs.map((p) => String(p.id));
  const casesById = new Map(progs.map((p) => [String(p.id), (p.cases || []).map(String)]));

  // (1) EGY SOROZAT = EGY KÖTÉS. Az eltérő forrású/konfigurációjú rekord nem válogatható be.
  const seriesSet = [...new Set(recs.map((r) => str(r && r.series)))];
  if (seriesSet.length > 1) {
    problems.push(`a készlet ${seriesSet.length} KÜLÖNBÖZŐ sorozatból áll (${seriesSet.join(' · ')}) — `
      + 'külön futások legjobb részei nem válogathatók össze');
  }
  const commits = [...new Set(recs.map((r) => str(r && r.binding && r.binding.commit)))];
  if (commits.length > 1) {
    problems.push(`a készlet ${commits.length} KÜLÖNBÖZŐ forrásból áll: ${commits.map((c) => c.slice(0, 12) || '(nincs)').join(' · ')}`);
  }
  const configs = [...new Set(recs.map((r) => str(r && r.binding && r.binding.config_digest)))];
  if (configs.length > 1) {
    problems.push(`a készlet ${configs.length} KÜLÖNBÖZŐ konfigurációval készült: ${configs.join(' · ')}`);
  }

  // (2) ALAKI ÉRVÉNYESSÉG ÉS DUPLIKÁTUM.
  const byId = new Map();
  for (const r of recs) {
    const id = str(r && r.program);
    for (const why of recordProblems(r, casesById.get(id))) problems.push(`[${id || '?'}] ${why}`);
    if (!id) continue;
    if (byId.has(id)) problems.push(`[${id}] DUPLIKÁLT rekord a sorozatban — nem dönthető el, melyik az érvényes`);
    else byId.set(id, r);
  }
  // (3) IDEGEN PROGRAM: ami nincs a manifesztben, az nem bizonyíték.
  for (const id of byId.keys()) {
    if (!expectedIds.includes(id)) problems.push(`[${id}] a manifesztben NEM SZEREPLŐ program`);
  }
  // (4) TELJESSÉG: a hiányzó program NEM „részben zöld" (KUKA-206).
  const missing = expectedIds.filter((id) => !byId.has(id));
  const complete = missing.length === 0;

  const green = [...byId.values()].filter((r) => r.ok === true).length;
  const failed = [...byId.values()].filter((r) => r.ok !== true).length;
  const verdict = {
    contract: SERIES_CONTRACT,
    series: seriesSet.length === 1 ? seriesSet[0] : null,
    complete,
    // TELJES VERDIKT CSAK A TELJES, ELLENŐRZÖTT KÉSZLETBŐL (R194 §2).
    ok: complete && problems.length === 0 && failed === 0,
    green,
    failed,
    of: expectedIds.length,
    measured: byId.size,
    missing,
    why: complete
      ? (problems.length === 0
        ? 'a sorozat TELJES és ellenőrzött — ez a lánc teljes bizonyítéka'
        : 'a sorozat teljes, DE a bizonyíték ellenőrzése leleteket adott — NEM teljes bizonyíték')
      : `RÉSZLEGES sorozat: ${missing.length} program még nem futott (${missing.slice(0, 8).join(' · ')}${missing.length > 8 ? ' …' : ''}) — `
        + 'folytatható, de NEM a lánc teljes bizonyítéka',
  };
  return { verdict, problems, byId };
}

/**
 * A NÉGY KATEGÓRIA (R194 §Döntés) — mert a „10/19 végzett" pontatlan volt: két program ELTÉRÉST
 * adott, és azt sem „sikeres", sem „el nem indult" alá nem lehet sorolni. A jelentés ezért külön
 * számolja a sikeres · tartalmi hibás · hiányos mérésű · el nem indult programokat.
 *
 * A HATÁR KIMONDVA: a `content` a TARTALMI hiba (a szelet maga bukott) — ez a terméknek szóló
 * lelet. A `too_slow` és az `unknown` HIÁNYOS MÉRÉS: nem tudjuk, mit mondana a program, mert a
 * mérés nem futott le érvényesen (`KUKA-206`: a „nem futott" nem „részben"). A nevezett környezeti
 * kihagyás SEM sikeres: külön kategóriát kap, mert zöld bizonyítékot nem ad (`KUKA-089`).
 */
export function classify(rec) {
  if (!rec) return 'el_nem_indult';
  if (rec.ok === true) return 'sikeres';
  if (rec.env_skipped === true) return 'kornyezeti_kihagyas';
  const kind = str(rec.failure_kind);
  if (kind === 'content') return 'tartalmi_hibas';
  if (Array.isArray(rec.cases) && rec.cases.length && rec.cases.some((c) => c.pass !== true)) return 'tartalmi_hibas';
  return 'hianyos_meresu';
}

/** A sorozat kategória-számai — a jelentés ebből idéz, nem becslésből. */
export function tally({ byId, programs } = {}) {
  const out = {
    sikeres: [], tartalmi_hibas: [], hianyos_meresu: [], kornyezeti_kihagyas: [], el_nem_indult: [],
  };
  for (const p of (Array.isArray(programs) ? programs : [])) {
    const id = String(p.id);
    out[classify(byId instanceof Map ? byId.get(id) : (byId || {})[id])].push(id);
  }
  return out;
}
