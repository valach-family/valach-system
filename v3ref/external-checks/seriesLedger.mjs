// v3ref/external-checks/seriesLedger.mjs — EXS-01: A PROGRAMONKÉNT FOLYTATHATÓ MÉRÉSI SOROZAT
//
// MIÉRT SZÜLETETT (R194 §2). A lánc tizenkilenc programja egyetlen, megszakítás nélküli futásban
// nem fér a támogatott környezet 120 perces feladatkorlátjába (R193 mérése). A `--only` viszont MÁR
// MEGVAN — ami hiányzott, az a SOROZAT: hogy a külön futások eredménye (1) megmaradjon, (2) EGY
// rögzített forráshoz és konfigurációhoz legyen kötve, és (3) GÉPILEG összesíthető legyen úgy, hogy
// a hiányos vagy idegen bizonyítékot a kapu ELUTASÍTJA.
//
// ── AZ R196 JAVÍTÁSA: A VÁRT ÉRTÉK NEM A VIZSGÁLT REKORDOKBÓL KELETKEZIK ───────────────────────
//
// A chatgpt-v3 az R195 fejéről (`0d5ee24`) a VÁLTOZATLAN modult izolált Node-futtatásban meghívta,
// és MÉRTE a hibát — nem a forrás szövegéből következtetett rá (`KUKA-125` · `KUKA-239`):
//
//     binding = { commit:'a'*40, clean:FALSE, config_digest:'cfg', programs_digest:'', runner_digest:'' }
//     evidence_digest = 'unverified'
//     verifySeries({ records:[rekord], programs:[{id:'p',cases:['c']}] })
//       →  complete: TRUE · ok: TRUE · green: 1
//
// Vagyis egy PISZKOS forrás és HIÁNYZÓ érdemi lenyomatok mellett a kapu TELJES BIZONYÍTÉKOT
// állított. Az OK nem egy elfelejtett `if`, hanem a MÉRCE HELYE: az előző alak a rekordokat
// EGYMÁSHOZ hasonlította (egy sorozat? egy commit? egy konfiguráció?), és ha a készlet EGYÖNTETŰ
// volt, nem volt mihez mérni. Egyöntetűen hamis készlet tehát átment. Ugyanaz a hiba-osztály, mint
// a `KUKA-121`: a bizonyíték a SAJÁT állítását igazolta vissza.
//
// A JAVÍTÁS HÁROM, EGYMÁSSAL NEM KIELÉGÍTHETŐ RÉTEG (`KUKA-207`: a jel ne legyen MÁS mechanizmussal
// is kielégíthető, mint amit vizsgál):
//
//   L1  rekord ↔ rekord   — egy sorozat, egy commit, egy konfiguráció (ez volt meg eddig is);
//   L2  rekord ↔ KÖTÉS-HORGONY — a megbízható futtató a sorozat INDÍTÁSAKOR rögzíti az ELVÁRT
//       kötést (`results/series/<sorozat>/binding.json`), és a rekordokat EHHEZ mérjük. Ez a horgony
//       a vizsgált rekordoktól FÜGGETLENÜL jön létre, tehát egyöntetűen hamis készlet sem tudja
//       magát igazolni;
//   L3  horgony ↔ ÉLŐ ÁLLAPOT — a horgony arról a forrásról szól-e, ami MA itt áll (commit, tiszta,
//       manifeszt-, futtató- és konfiguráció-lenyomat). Ez dönti el, hogy egy teljes készlet MAI
//       eredmény-e, vagy TÖRTÉNETI: a történeti készlet a SAJÁT forrásáról beszélhet, de mai
//       bizonyítékként nem hivatkozható (R196 §1).
//
// ÉS AZ ÉRDEMI ÁLLAPOT MÉRCÉJE MOST VAN: `clean === true` KAPU · a commit könyvelt 40-hex (a
// `…+uncommitted` jelölt alak NEM fogadható el) · a manifeszt-, futtató- és bizonyíték-lenyomat
// VALÓDI sha256 (a puszta „nem üres" nem elég: a `'unverified'` is nem üres) · és a
// bizonyíték-lenyomatot az összesítő a LEMEZEN ÁLLÓ fájlból ÚJRASZÁMOLJA, nem a rekordtól kérdezi
// meg. A sorozatazonosítót is újraszámoljuk a kötésből — a rekord saját `series` mezője ÁLLÍTÁS.
//
// A KORLÁT KIMONDVA (R196 §1, és ezt nem is állítjuk többnek): ez KONZISZTENCIA-ellenőrzés, nem
// kriptográfiai védelem egy MINDEN FÁJLHOZ hozzáférő rosszindulatú író ellen — aki a rekordot és a
// horgonyt EGYSZERRE írja át, azt ez a kapu nem fogja meg. Amit megfog: a piszkos forrást, a
// hiányzó vagy kitalált lenyomatot, az összeválogatott részfutásokat, a megszakadt fájlt és a
// történeti készlet mai eredményként való hivatkozását.
//
// AMIT EZ A MODUL NEM TESZ. Nem nyúl a `external-checks-result.json` nevéhez és alakjához: azt a
// KÜLSŐ FÉL programjai olvassák be név szerint (`r59` · `r59a` · `r61` · `r83_runner`), tehát a
// szerződés része (`KUKA-054`). A sorozat MELLÉ kerül, nem helyette. És NYERS NAPLÓT, KULCSOT vagy
// ÜZLETI ADATOT nem hordoz: a rekord lenyomatokból, eset-azonosítókból és NEVEZETT, hosszában
// korlátozott indokból áll (R196 §1).
//
// ÉS AMI MIATT TISZTA FÜGGVÉNY: a kapu döntését próbából közvetlenül hívjuk, valódi futás nélkül
// (`KUKA-207`), és a próba a VISELKEDÉST méri, nem a forrás szövegét (`KUKA-239`).
import { createHash } from 'node:crypto';

export const SERIES_CONTRACT = 'EXS-01';

/** A horgony-fájl neve — EGY otthon, hogy a futtató és az összesítő ne gépelje kétszer (KUKA-003). */
export const BINDING_ANCHOR_FILE = 'binding.json';

/** A NEVEZETT INDOK HOSSZ-KORLÁTJA: a bizonyíték-csomag nem nyers napló (R196 §1). */
export const WHY_MAX_CHARS = 400;

const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const str = (v) => (typeof v === 'string' ? v : '');
const isHex = (v, n) => typeof v === 'string' && new RegExp(`^[0-9a-f]{${n}}$`).test(v);

/** A RÉSZLETES BIZONYÍTÉK LENYOMATA — EGY otthon, mert a futtató ÍRJA és az összesítő ÚJRASZÁMOLJA. */
export function evidenceDigest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * A NEVEZETT INDOK — EGY SOR, KORLÁTOZOTT HOSSZ. A program `failure_why`-ja szabad szöveg, tehát
 * elvben nyers kimenetet, kulcsot vagy üzleti adatot is behozhatna a bizonyíték-csomagba. Ezért a
 * rekordba csak egysoros, vágott alak kerül, és a vágás NEVEZETT — nem néma (`KUKA-050`).
 */
export function sanitizeWhy(v) {
  const one = str(v).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (!one) return '';
  return one.length <= WHY_MAX_CHARS ? one : `${one.slice(0, WHY_MAX_CHARS)}… [VÁGVA: a rekord nem nyers napló]`;
}

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

/** A kötés kanonikus alakja — a horgony és a rekord UGYANEZT a négy+egy mezőt hordozza. */
export function canonBinding(binding = {}) {
  return {
    commit: str(binding && binding.commit),
    clean: Boolean(binding && binding.clean),
    config_digest: str(binding && binding.config_digest),
    programs_digest: str(binding && binding.programs_digest),
    runner_digest: str(binding && binding.runner_digest),
  };
}

/**
 * A KÖTÉS ÉRDEMI ÁLLAPOTA — ez a réteg hiányzott (R196 §1). Nem azt kérdezi, hogy a mezők EGYEZNEK-E
 * egymással, hanem hogy MIT ÁLLÍTANAK: könyvelt-e a forrás, tiszta-e, és valódi lenyomat-e a három
 * érdemi digest. A `'cfg'`, a `''` és az `'unverified'` mind „nem üres" — de egyik sem lenyomat.
 */
export function bindingProblems(binding, { label = 'kötés' } = {}) {
  const p = [];
  const b = canonBinding(binding);
  if (!binding || typeof binding !== 'object') return [`a ${label} nem objektum`];
  if (!b.commit) p.push(`a ${label}ben nincs commit`);
  else if (/\+uncommitted$/.test(b.commit)) p.push(`a ${label} JELÖLT, nem könyvelt forrásra mutat: ${b.commit}`);
  else if (b.commit === 'unknown') p.push(`a ${label} forrása BEMONDATLAN (nem git-munkamásolat)`);
  else if (!isHex(b.commit, 40)) p.push(`a ${label} commitja nem 40-hex sha: ${JSON.stringify(b.commit.slice(0, 24))}`);
  // A TISZTASÁG KAPU, NEM MEZŐ (R196 §1): piszkos forráson készült mérés nem teljes bizonyíték.
  if (b.clean !== true) p.push(`a ${label} PISZKOS forrásra mutat (clean=${JSON.stringify(binding.clean)}) — nem teljes bizonyíték`);
  if (!isHex(b.config_digest, 16)) p.push(`a ${label} konfiguráció-lenyomata nem valódi (16-hex) lenyomat: ${JSON.stringify(b.config_digest)}`);
  if (!isHex(b.programs_digest, 64)) p.push(`a ${label} MANIFESZT-lenyomata nem valódi (64-hex) lenyomat: ${JSON.stringify(b.programs_digest)}`);
  if (!isHex(b.runner_digest, 64)) p.push(`a ${label} FUTTATÓ-lenyomata nem valódi (64-hex) lenyomat: ${JSON.stringify(b.runner_digest)}`);
  return p;
}

/** Két kötés MEZŐNKÉNTI egyezése — a várt érték KÍVÜLRŐL jön, nem a vizsgált rekordból (R196 §1). */
export function bindingMismatch(got, expected) {
  const a = canonBinding(got);
  const b = canonBinding(expected);
  const out = [];
  for (const k of ['commit', 'clean', 'config_digest', 'programs_digest', 'runner_digest']) {
    if (a[k] !== b[k]) {
      const sh = (v) => (typeof v === 'string' && v.length > 16 ? `${v.slice(0, 12)}…` : JSON.stringify(v));
      out.push(`${k}: ${sh(a[k])} ≠ ELVÁRT ${sh(b[k])}`);
    }
  }
  return out;
}

/** A per-program SOROZAT-REKORD. Ez hordozza a kötést, a TÉNYLEGES kilépést és az eset-eredményt. */
export function makeRecord({ binding, program, exit, ok, cases, evidence_digest, failure, ms } = {}) {
  return {
    contract: SERIES_CONTRACT,
    series: seriesId(binding),
    binding: canonBinding(binding),
    program: str(program && program.id),
    program_digest: str(program && program.digest),
    exit: Number.isInteger(exit) ? exit : null,
    ok: ok === true,
    cases: (Array.isArray(cases) ? cases : []).map((c) => ({ id: str(c && c.id), pass: c && c.pass === true })),
    evidence_digest: str(evidence_digest),
    failure_kind: failure && failure.kind ? str(failure.kind) : null,
    // NYERS NAPLÓ NEM MEGY A CSOMAGBA (R196 §1): egy sor, korlátozott hossz, nevezett vágás.
    failure_why: failure && failure.why ? sanitizeWhy(failure.why) : null,
    ms: Number.isFinite(ms) ? ms : null,
    at: new Date().toISOString(),
  };
}

/**
 * A HORGONY — AZ ELVÁRT KÖTÉS, AMIT A FUTTATÓ A SOROZAT INDÍTÁSAKOR RÖGZÍT (R196 §1).
 *
 * Ez a lényeg: a horgony a MÉRÉS ELŐTT keletkezik, a vizsgált rekordoktól függetlenül. Az összesítő
 * innen tudja, mihez kell mérnie — nem a rekordok egyöntetűségéből.
 */
export function makeAnchor({ binding, programs, config, recorded_by, recorded_at } = {}) {
  return {
    contract: SERIES_CONTRACT,
    series: seriesId(binding),
    binding: canonBinding(binding),
    programs: (Array.isArray(programs) ? programs : []).map((p) => String(p && p.id ? p.id : p)),
    config: config && typeof config === 'object' ? config : null,
    recorded_by: str(recorded_by) || 'run-all.mjs',
    recorded_at: str(recorded_at) || new Date().toISOString(),
  };
}

/** A horgony ALAKI és ÉRDEMI érvényessége — a kitalált horgony itt esik ki. */
export function anchorProblems(anchor) {
  if (!anchor || typeof anchor !== 'object' || Array.isArray(anchor)) {
    return ['a KÖTÉS-HORGONY hiányzik vagy nem objektum — az ELVÁRT kötés nem ismert, tehát a készlet nem fogadható el'];
  }
  const p = [];
  if (anchor.contract !== SERIES_CONTRACT) p.push(`a horgony idegen szerződés: ${JSON.stringify(anchor.contract)} (várt: ${SERIES_CONTRACT})`);
  p.push(...bindingProblems(anchor.binding, { label: 'horgony-kötés' }));
  const recomputed = seriesId(anchor.binding);
  if (str(anchor.series) !== recomputed) {
    p.push(`a horgony sorozatazonosítója ${JSON.stringify(anchor.series)}, a kötésből ÚJRASZÁMOLVA ${recomputed}`);
  }
  if (!Array.isArray(anchor.programs) || anchor.programs.length === 0) {
    p.push('a horgony nem nevezi meg az ELVÁRT program-készletet');
  }
  return p;
}

/**
 * A HORGONY ÉS AZ ÉLŐ ÁLLAPOT (L3) — MAI EREDMÉNY-E, VAGY TÖRTÉNETI?
 *
 * A `live` a MOST itt álló forrás mért kötése (commit · tiszta · manifeszt · futtató · konfiguráció).
 * Ha eltér, a sorozat NEM MAI: a saját forrásáról beszélhet, de mai bizonyítékként nem hivatkozható
 * (R196 §1 · R196 §3: *„a futtató megváltozásakor új érvényes kötés kell"*).
 */
export function freshnessProblems(anchor, live) {
  if (!live || typeof live !== 'object') return ['az ÉLŐ forrás-állapot nem mérhető — a frissesség nem dönthető el'];
  const mm = bindingMismatch(anchor && anchor.binding, live);
  if (!mm.length) return [];
  return [`a sorozat NEM a MA itt álló forrásról szól (TÖRTÉNETI): ${mm.join(' · ')}`];
}

/**
 * EGY REKORD ÉRVÉNYTELENSÉGE — ÉS A HATÁR KIMONDVA (R196 §1).
 *
 * Ez CSAK az AZONOSSÁG-szintű sérülést nevezi meg: olyat, ami után a rekord VERDIKTJE nem olvasható
 * (idegen szerződés · nincs kötés vagy piszkos/kitalált kötés · nincs tényleges kilépés · nincs
 * valódi bizonyíték-lenyomat · a sorozatazonosító nem a kötésből jön · a rekord ERŐSEBBET állít a
 * saját adatánál).
 *
 * AMI SZÁNDÉKOSAN NEM ÉRVÉNYTELENSÉG: a HIÁNYZÓ és a manifeszten KÍVÜLI eset. Azok a MÉRÉS tényei
 * (lefedettségi hiány, illetve nem várt diagnosztika), és a `classifyFacts` adja őket tovább. Ha
 * érvénytelenséggé tennénk, az `r83core` 131 `merge/KORNYEZET-N` diagnosztikája elnyomná azt a
 * valódi leletet, hogy a NÉGY ELVÁRT eset EL SEM INDULT (`KUKA-206` · R194 §3).
 */
export function recordInvalid(rec, { expected } = {}) {
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return ['a rekord nem objektum (sérült vagy megszakadt fájl)'];
  const p = [];
  if (rec.contract !== SERIES_CONTRACT) p.push(`idegen szerződés: ${JSON.stringify(rec.contract)} (várt: ${SERIES_CONTRACT})`);
  if (!str(rec.program)) p.push('nincs program-azonosító');
  if (!Number.isInteger(rec.exit)) p.push('a TÉNYLEGES kilépési állapot hiányzik (nem egész)');
  if (!isHex(rec.evidence_digest, 64)) {
    p.push(`a bizonyíték-lenyomat nem valódi (64-hex) sha256: ${JSON.stringify(str(rec.evidence_digest).slice(0, 24))}`);
  }
  if (!rec.binding || typeof rec.binding !== 'object') p.push('nincs kötés (commit/konfiguráció)');
  else {
    p.push(...bindingProblems(rec.binding, { label: 'rekord-kötés' }));
    // A SOROZATAZONOSÍTÓ ÁLLÍTÁS, NEM ADAT: a kötésből ÚJRASZÁMOLJUK (R196 §1).
    const recomputed = seriesId(rec.binding);
    if (str(rec.series) !== recomputed) {
      p.push(`a sorozatazonosító ${JSON.stringify(rec.series)}, a kötésből ÚJRASZÁMOLVA ${recomputed}`);
    }
    if (expected) {
      const mm = bindingMismatch(rec.binding, expected);
      if (mm.length) p.push(`a kötés nem az ELVÁRT: ${mm.join(' · ')}`);
    }
  }
  // AZ „ok" NEM LEHET ERŐSEBB A SAJÁT ADATÁNÁL (KUKA-129: a nyugtának is igazat kell mondania).
  if (rec.ok === true && Number.isInteger(rec.exit) && rec.exit !== 0) p.push(`a rekord ZÖLDET állít, de a tényleges kilépés ${rec.exit}`);
  if (rec.ok === true && Array.isArray(rec.cases) && rec.cases.some((c) => c.pass !== true)) p.push('a rekord ZÖLDET állít, de van bukott esete');
  if (!Array.isArray(rec.cases)) p.push('az eset-eredmények nem listák');
  return p;
}

/** Egy rekord ÖSSZES lelete — az azonosság-szintű sérülés ÉS a mérés tényei (alak-ellenőrzés). */
export function recordProblems(rec, expectedCases, opts = {}) {
  const p = recordInvalid(rec, opts);
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return p;
  if (!str(rec.series)) p.push('nincs sorozatazonosító');
  if (Array.isArray(rec.cases) && Array.isArray(expectedCases)) {
    const got = rec.cases.map((c) => str(c.id));
    const want = expectedCases.map(String);
    const missing = want.filter((id) => !got.includes(id));
    const extra = got.filter((id) => !want.includes(id));
    const dupes = got.filter((id, i) => got.indexOf(id) !== i);
    if (missing.length) p.push(`HIÁNYZÓ eset(ek): ${missing.slice(0, 6).join(' · ')}${missing.length > 6 ? ' …' : ''}`);
    if (extra.length) p.push(`a manifesztben NEM SZEREPLŐ eset(ek): ${extra.slice(0, 6).join(' · ')}${extra.length > 6 ? ' …' : ''}`);
    if (dupes.length) p.push(`DUPLIKÁLT eset(ek): ${[...new Set(dupes)].slice(0, 6).join(' · ')}`);
  }
  return p;
}

/**
 * A SOROZAT ÖSSZESÍTÉSE — ÉS A TELJES VERDIKT CSAK A TELJES, ELLENŐRZÖTT KÉSZLETBŐL.
 *
 * HÁROM RÉTEG, EGYMÁSSAL NEM KIELÉGÍTHETŐEN (R196 §1):
 *   L1  a rekordok egymáshoz: egy sorozat · egy commit · egy konfiguráció;
 *   L2  a rekordok a HORGONYHOZ (`expected`): a várt kötés KÍVÜLRŐL jön, a futtató rögzítette a
 *       sorozat indításakor — egyöntetűen idegen készlet sem igazolhatja magát;
 *   L3  a horgony az ÉLŐ állapothoz (`live`): mai eredmény-e, vagy történeti.
 *
 * `evidenceDigests`: program → a LEMEZEN álló részletes bizonyíték ÚJRASZÁMOLT lenyomata. A rekord
 * `evidence_digest`-je ÁLLÍTÁS; ha nem egyezik az újraszámolttal, a részletes bizonyíték más vagy
 * hiányzik — ez NEVEZETT lelet, nem néma elfogadás.
 *
 * `accepted` ≠ `ok`: az `ok` a KÉSZLET állapota, az `accepted` az ELFOGADÁSI KAPU döntése — csak az
 * utóbbi veszi be a horgonyt és a frissességet. Puszta státuszlekérdezésnél az `accepted` is
 * kiszámolódik, de a CLI nem keveri össze a kettőt (R196 §1).
 */
export function verifySeries({ records, programs, expected, live, evidenceDigests } = {}) {
  const problems = [];
  const anchorIssues = [];
  const freshness = [];
  const recs = Array.isArray(records) ? records.filter(Boolean) : [];
  const progs = Array.isArray(programs) ? programs : [];
  const expectedIds = progs.map((p) => String(p.id));
  const casesById = new Map(progs.map((p) => [String(p.id), (p.cases || []).map(String)]));
  const digests = evidenceDigests instanceof Map
    ? evidenceDigests
    : new Map(Object.entries(evidenceDigests || {}));

  // ── L2/a — A HORGONY MAGA. Horgony nélkül NINCS elfogadás: nem tudjuk, mi volt a VÁRT kötés. ──
  const anchor = expected && expected.binding ? expected : (expected ? { contract: SERIES_CONTRACT, series: seriesId(expected), binding: expected, programs: expectedIds } : null);
  if (!anchor) {
    anchorIssues.push('NINCS ELVÁRT KÖTÉS (kötés-horgony): a várt értéket a vizsgált rekordokból nem vezetjük le — '
      + 'horgony nélkül a készlet FOLYTATHATÓ ÁLLAPOT, de nem elfogadható bizonyíték (R196 §1)');
  } else {
    anchorIssues.push(...anchorProblems(anchor));
  }
  const expectedBinding = anchor && anchorIssues.length === 0 ? anchor.binding : null;

  // ── L3 — MAI EREDMÉNY, VAGY TÖRTÉNETI? ──
  if (anchor && live !== undefined) freshness.push(...freshnessProblems(anchor, live));

  // ── L1 — EGY SOROZAT = EGY KÖTÉS. Az eltérő forrású/konfigurációjú rekord nem válogatható be. ──
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

  // ── ALAKI + ÉRDEMI ÉRVÉNYESSÉG, DUPLIKÁTUM, ÉS A BIZONYÍTÉK ÚJRASZÁMOLT LENYOMATA ──
  const byId = new Map();
  const invalidById = new Map();
  for (const r of recs) {
    const id = str(r && r.program);
    const inv = recordInvalid(r, { expected: expectedBinding });
    for (const why of recordProblems(r, casesById.get(id), { expected: expectedBinding })) problems.push(`[${id || '?'}] ${why}`);
    if (!id) continue;
    if (byId.has(id)) { problems.push(`[${id}] DUPLIKÁLT rekord a sorozatban — nem dönthető el, melyik az érvényes`); continue; }
    byId.set(id, r);
    invalidById.set(id, inv);
    // A RÉSZLETES BIZONYÍTÉK AZONOSSÁGA — ÚJRASZÁMOLVA, nem a rekordtól kérdezve (R196 §1).
    if (digests.size) {
      const actual = digests.get(id);
      if (actual === undefined) {
        problems.push(`[${id}] a részletes bizonyíték-fájl NEM TALÁLHATÓ — a rekord lenyomata (${str(r.evidence_digest).slice(0, 12)}…) nem ellenőrizhető`);
        invalidById.set(id, [...inv, 'a részletes bizonyíték-fájl nem található']);
      } else if (actual !== str(r.evidence_digest)) {
        problems.push(`[${id}] a részletes bizonyíték MÁS: a rekord ${str(r.evidence_digest).slice(0, 12)}…-t állít, `
          + `a lemezen álló fájl ÚJRASZÁMOLVA ${String(actual).slice(0, 12)}…`);
        invalidById.set(id, [...inv, 'a részletes bizonyíték lenyomata nem egyezik az újraszámolttal']);
      }
    }
  }
  // IDEGEN PROGRAM: ami nincs a manifesztben, az nem bizonyíték.
  for (const id of byId.keys()) {
    if (!expectedIds.includes(id)) problems.push(`[${id}] a manifesztben NEM SZEREPLŐ program`);
  }
  // TELJESSÉG: a hiányzó program NEM „részben zöld" (KUKA-206).
  const missing = expectedIds.filter((id) => !byId.has(id));
  const complete = missing.length === 0;

  // A ZÖLD CSAK ÉRVÉNYES REKORDRA IGAZ (R196 §1: „csak érvényes rekordot nevezzenek sikeresnek").
  const green = [...byId.entries()].filter(([id, r]) => r.ok === true && (invalidById.get(id) || []).length === 0).length;
  const failed = [...byId.entries()].filter(([id, r]) => !(r.ok === true && (invalidById.get(id) || []).length === 0)).length;
  const invalid = [...invalidById.entries()].filter(([, v]) => v.length).map(([id]) => id);

  const okSet = complete && problems.length === 0 && failed === 0;
  const accepted = okSet && anchorIssues.length === 0 && freshness.length === 0;
  const verdict = {
    contract: SERIES_CONTRACT,
    series: seriesSet.length === 1 ? seriesSet[0] : null,
    complete,
    // TELJES VERDIKT CSAK A TELJES, ELLENŐRZÖTT KÉSZLETBŐL (R194 §2).
    ok: okSet,
    // AZ ELFOGADÁSI KAPU DÖNTÉSE — ehhez a HORGONY és a FRISSESSÉG is kell (R196 §1).
    accepted,
    anchored: Boolean(anchor) && anchorIssues.length === 0,
    fresh: live === undefined ? null : (Boolean(anchor) && freshness.length === 0),
    green,
    failed,
    invalid,
    of: expectedIds.length,
    measured: byId.size,
    missing,
    why: complete
      ? (problems.length === 0
        ? (accepted
          ? 'a sorozat TELJES, HORGONYZOTT és a MA itt álló forrásról szól — ez a lánc teljes bizonyítéka'
          : 'a sorozat teljes és belsőleg ép, DE az ELVÁRT kötés vagy a frissesség nem igazolt — '
            + 'a saját forrásáról beszélhet, MAI eredményként nem hivatkozható')
        : 'a sorozat teljes, DE a bizonyíték ellenőrzése leleteket adott — NEM teljes bizonyíték')
      : `RÉSZLEGES sorozat: ${missing.length} program még nem futott (${missing.slice(0, 8).join(' · ')}${missing.length > 8 ? ' …' : ''}) — `
        + 'folytatható, de NEM a lánc teljes bizonyítéka',
  };
  return { verdict, problems, anchorIssues, freshness, byId, invalidById };
}

/**
 * A MÉRÉS KÉT KÜLÖN TÉNYE — ÉS EZ AZ R196 MÁSODIK JAVÍTÁSA.
 *
 * A chatgpt-v3 MÉRT leletét reprodukáltam a `0d5ee24` fejen:
 *   `classify({ ok:false, cases:[{id:'c',pass:false}] }, ['c','d'])`  →  `'hianyos_meresu'`
 * A `d` eset tényleg nem futott — de a `c` LEFUTOTT ÉS BUKOTT, és ez a tény ELTŰNT. Az előző alak
 * a lefedettségi hiányt ELŐBB vizsgálta, és azonnal visszatért vele, tehát a tartalmi bukást már
 * meg sem kérdezte. Egy osztályozó, ami KÉT tényből EGYET ad vissza, a másikat elhallgatja — és a
 * jelentés ebből idéz (`KUKA-131`: a mérés ne veszítsen el tényt az összevonáskor).
 *
 * A JAVÍTÁS: a két tény ORTOGONÁLIS, és MINDKETTŐ továbbmegy.
 *   `coverage_gap`    — az ELVÁRT esetek közül nem futott le mind (a mérés hiányos);
 *   `content_failure` — az ELVÁRT esetek közül, AMELYIK LEFUTOTT, bukott (a terméknek szóló lelet).
 * A kategória ebből SZÁRMAZIK, és van saját neve a KETTŐ EGYÜTT esetének is.
 *
 * A HATÁR VÁLTOZATLAN (R194 §3, az `r83core` futásán élesítve): a tartalmi bukás csak az ELVÁRT,
 * LEFUTOTT esetekből jöhet. A manifeszten KÍVÜLI `merge/KORNYEZET-N` diagnosztika-áradatból NEM
 * gyártunk termékhibát — ott a MÉRÉS maradt hiányos (`KUKA-206`).
 */
export function classifyFacts(rec, expectedCases, opts = {}) {
  const base = {
    category: 'el_nem_indult', ran: false, valid: null,
    coverage_gap: false, missing_cases: [], content_failure: false, failed_cases: [],
    unexpected_cases: [], env_skipped: false,
  };
  if (!rec) return base;
  const valid = opts.valid === undefined ? null : opts.valid === true;
  const want = Array.isArray(expectedCases) ? expectedCases.map(String) : null;
  const rows = Array.isArray(rec.cases) ? rec.cases : [];
  const got = rows.map((c) => str(c && c.id));
  const byCase = new Map(rows.map((c) => [str(c && c.id), c]));

  const missing_cases = want ? want.filter((id) => !got.includes(id)) : [];
  const unexpected_cases = want ? got.filter((id) => !want.includes(id)) : [];
  // A TARTALMI BUKÁS CSAK AZ ELVÁRT, LEFUTOTT ESETEKBŐL (a nem várt diagnosztika nem termékhiba).
  const failed_cases = want
    ? want.filter((id) => byCase.has(id) && byCase.get(id).pass !== true)
    : got.filter((id) => byCase.get(id) && byCase.get(id).pass !== true);

  const facts = {
    ...base,
    ran: true,
    valid,
    coverage_gap: missing_cases.length > 0,
    missing_cases,
    content_failure: failed_cases.length > 0,
    failed_cases,
    unexpected_cases,
    env_skipped: rec.env_skipped === true,
  };

  // ── A KATEGÓRIA A TÉNYEKBŐL SZÁRMAZIK, ÉS MINDEN PROGRAM PONTOSAN EGYBE ESIK ──
  // ÉRVÉNYTELEN REKORD: a verdiktje nem olvasható, tehát SEM sikeresnek, SEM termék-leletnek nem
  // nevezhető (R196 §1: „csak érvényes rekordot nevezzenek sikeresnek").
  if (valid === false) { facts.category = 'ervenytelen_rekord'; return facts; }
  if (facts.env_skipped) { facts.category = 'kornyezeti_kihagyas'; return facts; }
  if (facts.coverage_gap && facts.content_failure) { facts.category = 'hianyos_es_tartalmi_hibas'; return facts; }
  if (facts.content_failure) { facts.category = 'tartalmi_hibas'; return facts; }
  if (facts.coverage_gap) { facts.category = 'hianyos_meresu'; return facts; }
  if (rec.ok === true) { facts.category = 'sikeres'; return facts; }
  // Nem zöld, de az elvárt esetei (ha vannak) lefutottak és nem buktak: a MÉRÉS maradt hiányos —
  // nem tudjuk, mit mondana a program (a `too_slow` és az `unknown` fajta is ide esik, KUKA-206).
  if (str(rec.failure_kind) === 'content') { facts.category = 'tartalmi_hibas'; facts.content_failure = true; return facts; }
  facts.category = 'hianyos_meresu';
  return facts;
}

/**
 * A KATEGÓRIA — a `classifyFacts` származtatott neve. A KÉT TÉNY a `classifyFacts`-ben áll, és a
 * `tally` mindkettőt továbbadja; ez a burkoló a rövid, egy-szavas alakot adja a hívóknak.
 */
export function classify(rec, expectedCases, opts = {}) {
  return classifyFacts(rec, expectedCases, opts).category;
}

/** A SOROZAT KATEGÓRIA-SZÁMAI ÉS A PROGRAMONKÉNTI KÉT TÉNY — a jelentés ebből idéz, nem becslésből. */
export function tally({ byId, programs, invalidById } = {}) {
  const out = {
    sikeres: [], tartalmi_hibas: [], hianyos_meresu: [], hianyos_es_tartalmi_hibas: [],
    kornyezeti_kihagyas: [], ervenytelen_rekord: [], el_nem_indult: [],
  };
  const facts = {};
  for (const p of (Array.isArray(programs) ? programs : [])) {
    const id = String(p.id);
    const rec = byId instanceof Map ? byId.get(id) : (byId || {})[id];
    const inv = invalidById instanceof Map ? invalidById.get(id) : (invalidById || {})[id];
    const f = classifyFacts(rec, p.cases, inv === undefined ? {} : { valid: (inv || []).length === 0 });
    out[f.category].push(id);
    facts[id] = f;
  }
  out.facts = facts;
  return out;
}
