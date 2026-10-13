/**
 * PRF-01 — A MAI ELFOGADÁSI PROFIL, ÉS A TÖRTÉNETI DIAGNOSZTIKA GÉPI ELVÁLASZTÁSA (R202).
 *
 * MIÉRT SZÜLETETT. Az R201-ben mind a 19 külső program lefutott, de az elfogadási kapu PIROS volt: a
 * külső fél KÉT VÁLTOZATLAN, EREDETI programja (`r57` · `r59`) a SAJÁT bejelentett 15 000 ms-os
 * belső korlátjába futott ezen a környezeten. Az R202-ben a külső ellenőrző fél (chatgpt-v3) a kért
 * szakmai döntést meghozta: **a mai elfogadási profilban az `r57` helyét az `r57a`, az `r59` helyét az
 * `r59a` tölti be**; az eredeti kettő TÖRTÉNETI/DIAGNOSZTIKAI program marad, a saját nyers
 * eredményével.
 *
 * AMIT EZ A DÖNTÉS NEM TESZ (a SPEC szó szerinti korlátai):
 *   · a bukásuk NEM lesz PASS, és NINCS általános „várt bukás = siker" szabály;
 *   · az R201 régi, 19-programos kapujának `accepted=false` eredménye TÖRTÉNETI TÉNY — nem
 *     minősítjük visszamenőleg zöldnek;
 *   · a 15 000 ms-os korlát NEM emelkedik, és egyetlen gép mérésből nem következtetünk minden gépre;
 *   · a termék jogadási szabálya NEM gyengül (lásd `r57a`: a TESZT-ELŐFELTÉTEL vált szabályos
 *     alapra, nem a szabály).
 *
 * A HIÁNY, AMIT BETÖLT. A manifeszt (`case-manifest.mjs`) MA IS megnevezi a helyetteseket és az R63
 * szerinti `rule_superseded` eseteket — ami hiányzott, az a **mai elfogadás és a történeti
 * diagnosztika KÖVETKEZETES, GÉPI elválasztása**. Ez a modul az a hely: egy saját, VERZIÓZOTT otthon,
 * amit a futtató, a sorozat-kapu és a söprés UGYANÚGY használ.
 *
 * A PROFIL A BIZONYÍTÉK KÖTÉSÉNEK RÉSZE. A `profile_id` és a `profile_digest` bekerül a sorozat
 * kötésébe, tehát: más profil → más kötés → MÁS SOROZAT. Egy történeti profil eredménye így gépileg
 * nem adható be mai profilként, és fordítva sem (`KUKA-121`: a befogadott bizonyíték mércéje nem
 * lehet a bizonyíték maga).
 *
 * A LENYOMAT MÉRT, NEM BEÍRT. A profil-lenyomat tartalmazza a helyettesítésben szereplő fájlok MÉRT
 * sha256-át, ezért egy adaptált program megváltozása ÚJ kötést ad — nevezetten, nem némán. Kézzel
 * felvett pint szándékosan NEM vezetünk be: az a `KUKA-003` osztálya (a másolat az első
 * szerkesztésnél elcsúszik), és az azonosság igazolására már van bizonyíték — az R201 sorozat
 * rekordjainak `program_digest`-je (`npm run verify:acceptance-profile`, PRF06).
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const PROFILE_CONTRACT = 'PRF-01';
export const PROFILE_CONTRACT_VERSION = 1;

const sha = (s) => createHash('sha256').update(s).digest('hex');
const str = (v) => (typeof v === 'string' ? v : '');

/**
 * A HELYETTESÍTÉSEK — NÉVVEL, DÖNTÉSSEL ÉS FORRÁSFÁJLLAL (R202 §1).
 *
 * A `decision` KÉT hivatkozást visz: az R63 §4 a TERMÉK szabályát szigorította (az alap nélküli nyers
 * meghívó jogadása tilos, és a szintetikus tesztelőképeket ÁT KELL VEZETNI), az R202 §0 pedig a mai
 * elfogadási profilra vonatkozó, előre ható döntés. A kettő nem ugyanaz, és egyik sem helyettesíti a
 * másikat.
 */
export const SUBSTITUTIONS = Object.freeze([
  Object.freeze({
    from: 'r57',
    to: 'r57a',
    from_file: 'r57_chatgpt-v3.mjs',
    to_file: 'r57_chatgpt-v3.adapted.mjs',
    decision: Object.freeze(['R63 §4 — a termék szabálya', 'R202 §0 — a mai elfogadási profil']),
    why: 'Az eredeti program az R63 ELŐTT született, és a `world()` fixtúrája NYERS `INSERT INTO invite`-tal '
      + 'írta a meghívót, pecsét nélkül — ezért az R63 után a beváltásra épülő HÁROM eset (T01 · T02 · T05) a '
      + 'fixtúrában, a MÉRT KÉRDÉS ELŐTT bukott el (`invite_without_basis` / `no_declared_basis`). Az adaptált '
      + 'változat ugyanazokat az ÁLLÍTÁSOKAT méri, de a meghívót NEVEZETT, RÖGZÍTETT felhatalmazási alap alatt, '
      + 'a rendszer SAJÁT kiadóján állítja elő (`recordAuthorityBasis` + `issueInviteUnderBasis`), ugyanazokkal '
      + 'a meghívó-mezőkkel és ugyanazon az órán. A szigorítás MARAD, a teszt-előfeltétel változik.',
    retains: 'A támadási utak VALÓDIAK maradnak: a T02 őr nélküli ágán a nyers `UPDATE invite SET '
      + 'offered_role` SZÁNDÉKOS (a pecsét-eltérés TÉNYÉT állítja elő), és a T05 tizennégy nyers DML-alakja is.',
    /**
     * A BIZTONSÁGI SZÁNDÉK TANÚJA — MEGNEVEZVE, A 69 MAGPRÓBA MEGLÉVŐ KÉSZLETÉBŐL (R202 §2).
     *
     * A SPEC kérte: *„a 69 magpróba meglévő készletében nevezd meg az alap nélküli meghívó
     * ELUTASÍTÁSÁNAK közvetlen tanúját és szabályos pozitív párját; ha nincs ilyen, egy célzott próba
     * pótolja."* MÉRVE: VAN ilyen, ezért új próbát NEM gyártunk — megnevezzük, és gépi jellel
     * megfogjuk, hogy ne tudjon némán eltűnni (`npm run verify:acceptance-profile`, PRF07).
     *
     * MIÉRT ITT. A helyettesítés azt állítja, hogy a teszt-előfeltétel vált szabályos alapra, NEM a
     * termék szabálya gyengült. Ez az állítás csak akkor hihető, ha a szabály ELUTASÍTÓ ágának van
     * ÉLŐ, mért tanúja — és az ide van kötve, a helyettesítés mellé.
     */
    security_witness: Object.freeze({
      rejection: 'P-ORG-basis-limit (e) — `v3ref/run.mjs`: NYERS, pecsét nélküli `INSERT INTO invite` után a '
        + '`redemptionLimitGate` `basis_declared:false` · `no_declared_basis`, a `redeemInvite` '
        + '`invite_without_basis` · `no_declared_basis`, ÉS A MEGHÍVÓ NEM FOGY EL (`redeemed_at === null`); '
        + 'a kikényszerítés HELYE nevezve: `LIMIT_ENFORCED_PATHS` ⊇ `invite_redeem_without_basis`.',
      positive: 'P-ORG-basis-limit (b)+(c) — a SZABÁLYOS, alapból kiadott meghívó beváltása MEGY, és a '
        + 'korlátot ÁTVISZI (`granted_limit_recorded`): ez a pozitív pár, tehát a kapu nem fal.',
      adjudication: 'P-ORG-adjudication-basis-limit (h) — az R63 (A) szabálya: az alap nélküli történeti '
        + 'hatáskör ZÁR, megadáskor (elutasítva / 0 sor) és használatkor is '
        + '(`authority_without_recorded_basis`, `usable_now=false`, `enforced=true`).',
      /**
       * A NEVEZETT JELEK, KÉT CSOPORTBAN — mert a KÉT csoport MÁS helyen bizonyít.
       *
       * `asserted_in_probe`: ezeket a magpróba SAJÁT szövege állítja (`v3ref/run.mjs`), tehát ott is
       * kell lenniük — ez az ELUTASÍTÓ ág.
       * `measured_in_output`: ezeknek a FUTÓ próbák MÉRT kimenetében kell megjelenniük. A pozitív pár
       * jele (`granted_limit_recorded`) a TERMÉKMODULBAN él (`basisLimit.mjs` · `releaseScope.mjs`),
       * nem a próba szövegében — ezért a forrás-keresés ott HAMIS leletet adna (MÉRVE, R202 §2: a
       * PRF07 első alakja épp ezen bukott el). A mért kimenet viszont valódi bizonyíték (`KUKA-207`).
       */
      asserted_in_probe: Object.freeze([
        'no_declared_basis', 'invite_without_basis', 'invite_redeem_without_basis',
        'authority_without_recorded_basis',
      ]),
      // MÉRVE, nem feltéve: az `invite_without_basis` a próba SZÖVEGÉBEN áll (a `redeemInvite`
      // hibakódját ott hasonlítjuk), a KIMENETRE viszont nem kerül ki — ezért csak az
      // `asserted_in_probe` csoportban szerepel. A csoportokat a MÉRÉS döntötte el (R202 §2).
      measured_in_output: Object.freeze([
        'no_declared_basis', 'invite_redeem_without_basis', 'authority_without_recorded_basis',
        'granted_limit_recorded',
      ]),
      probes: Object.freeze(['P-ORG-basis-limit', 'P-ORG-adjudication-basis-limit']),
    }),
  }),
  Object.freeze({
    from: 'r59',
    to: 'r59a',
    from_file: 'r59_chatgpt-v3.mjs',
    to_file: 'r59_chatgpt-v3.adapted.mjs',
    decision: Object.freeze(['R202 §0 — a mai elfogadási profil']),
    why: 'Az eredeti program EGYETLEN hívásban futtatja a teljes battériát a saját 15 000 ms-os korlátjával; '
      + 'a battéria 253 mutációra nőtt, ezért ez a hívás ezen a környezeten nem ad teljes mérést. Az adaptált '
      + 'változat ugyanazokat az eseteket méri DARABOLT battéria-hívással (N egység + `--merge`).',
    retains: 'Az E05–E09 negatív esetek és a P01/P02 pozitív kontrollok TÉNYLEGESEN futnak. A pass-predikátum '
      + 'VÁLTOZATLAN; a mért eltérés egyetlen DIAGNOSZTIKAI mezőt érint (`norm_evidence?.required ?? null`), '
      + 'nem az ítéletet.',
  }),
]);

/**
 * A PROFILOK — VERZIÓZVA, ÉS MINDKETTŐ OLVASHATÓ.
 *
 * A `historical-19` a RÉGI futtató-szerződés: a teljes program-regiszter. Ha egy külső próba ezt
 * vizsgálja, UGYANAZT kapja — a régi CLI, a `--only r57/r59` és az eredményalak változatlan.
 * A `today-17` a MAI elfogadási profil. A kettőt a kötés választja el, nem a jóindulat.
 */
export const PROFILES = Object.freeze({
  'historical-19': Object.freeze({
    id: 'historical-19',
    version: 1,
    kind: 'historical',
    title: 'A teljes történeti program-regiszter (19 program)',
    programs: Object.freeze([
      'r16core', 'r92authz', 'r88core', 'r85core', 'r77', 'r75', 'r69', 'r67', 'r61',
      'r83core', 'r81core', 'r79core', 'r79', 'r59a', 'r57a', 'r59', 'r57', 'r55', 'r53',
    ]),
    substitutions: Object.freeze([]),
    why: 'A RÉGI futtató-szerződés, változatlanul: minden program, az eredeti `r57`/`r59`-cel együtt. '
      + 'A korábbi körök eredményei ehhez szólnak, és a bukásaik LÁTHATÓK maradnak. Ez NEM a mai '
      + 'elfogadás mércéje.',
  }),
  'today-17': Object.freeze({
    id: 'today-17',
    version: 1,
    kind: 'acceptance',
    title: 'A MAI elfogadási profil (17 aktív program)',
    // A SORREND A SPEC SZÖVEGE SZERINT — a készlet halmaz, de a felsorolás visszakövethető.
    programs: Object.freeze([
      'r16core', 'r92authz', 'r88core', 'r85core', 'r77', 'r75', 'r69', 'r67', 'r61',
      'r81core', 'r79core', 'r79', 'r59a', 'r57a', 'r55', 'r53', 'r83core',
    ]),
    substitutions: SUBSTITUTIONS,
    why: 'Az R202 §0 döntése: az `r57`/`r59` helyét az adaptált `r57a`/`r59a` tölti be. Az eredeti kettő '
      + 'TÖRTÉNETI diagnosztika marad, a saját nyers eredményével — a bukásuk NEM PASS, és nem lesz '
      + '„várt bukás = siker" szabály. Elfogadás CSAK 17/17 aktív programmal és MINDEN aktív esettel.',
  }),
});

/** A MAI ELFOGADÁSI PROFIL NEVE — EGY helyen, hogy a fogyasztók ne gépeljék le (KUKA-003). */
export const ACCEPTANCE_PROFILE = 'today-17';
/** A RÉGI, VÁLTOZATLAN futtató-szerződés neve. */
export const HISTORICAL_PROFILE = 'historical-19';

/**
 * A PROFIL FELOLDÁSA — EXPLICIT VÁLASZTÁS, NÉMA ALAPÉRTÉK NÉLKÜL (R202 §1).
 *
 * Ha a név nem nevezett profil, az NEVEZETT hiba. Néma visszaesés a „mai" profilra azt jelentené,
 * hogy egy elírás csendben más mércét választ (`KUKA-051`).
 */
export function resolveProfile(name) {
  const key = str(name);
  if (!key) {
    return { ok: false, why: `a profil nincs megnevezve — a választás EXPLICIT (nevezett profilok: ${Object.keys(PROFILES).join(' · ')})` };
  }
  const p = PROFILES[key];
  if (!p) {
    return { ok: false, why: `nem nevezett profil: ${JSON.stringify(key)} (nevezett profilok: ${Object.keys(PROFILES).join(' · ')})` };
  }
  return { ok: true, profile: p };
}

/** A profil program-sorai a FÜGGETLEN manifesztből — a sorrend a profilé, a tartalom a manifeszté. */
export function profileProgramRows(profile, programs) {
  const byId = new Map((Array.isArray(programs) ? programs : []).map((p) => [String(p.id), p]));
  return (profile.programs || []).map((id) => byId.get(String(id)) || null);
}

/**
 * AZ AKTÍV ESETKÉSZLET — program-azonosító + eset-azonosító PÁROK, a FÜGGETLEN profilból számolva.
 *
 * A SPEC kimondja: *„a számot a független profilból számítsd, ne a beérkező eredményből"*. Ezért ez a
 * függvény SOHA nem lát mérési eredményt — csak a profilt és a manifesztet.
 */
export function profileCaseKeys(profile, programs) {
  const byId = new Map((Array.isArray(programs) ? programs : []).map((p) => [String(p.id), p]));
  const keys = [];
  for (const id of profile.programs || []) {
    const row = byId.get(String(id));
    if (!row) continue;
    for (const c of row.cases || []) keys.push(`${id}/${String(c)}`);
  }
  return keys.sort();
}

/** A helyettesítésben szereplő fájlok MÉRT lenyomata (a kísérő fájlokkal együtt). */
export function measureProfileFiles(here, profile, programs) {
  const byId = new Map((Array.isArray(programs) ? programs : []).map((p) => [String(p.id), p]));
  const out = {};
  const add = (id) => {
    const row = byId.get(String(id));
    if (!row) { out[id] = null; return; }
    const files = [row.file, ...(row.companions || [])];
    const parts = [];
    for (const f of files) {
      try { parts.push(`${f}:${createHash('sha256').update(readFileSync(join(here, f))).digest('hex')}`); }
      catch { out[id] = null; return; }
    }
    out[id] = sha(parts.join('\n'));
  };
  for (const s of profile.substitutions || []) { add(s.from); add(s.to); }
  return out;
}

/**
 * A PROFIL TARTALMI LENYOMATA — EZ kerül a bizonyíték kötésébe.
 *
 * Mit fed: a szerződés és a verzió · a profil azonosítója és verziója · a programok RENDEZETT
 * azonosítói · az aktív eset-kulcsok RENDEZETT listája · és a helyettesítések kötése a MÉRT
 * fájl-lenyomatokkal. Bármelyik változása ÚJ kötést ad, tehát a régi bizonyíték nevezetten esik ki.
 */
export function profileDigest({ profile, programs, fileDigests } = {}) {
  if (!profile) return null;
  const canon = JSON.stringify({
    contract: PROFILE_CONTRACT,
    contract_version: PROFILE_CONTRACT_VERSION,
    id: str(profile.id),
    version: Number(profile.version) || null,
    kind: str(profile.kind),
    programs: [...(profile.programs || [])].map(String).sort(),
    cases: profileCaseKeys(profile, programs),
    substitutions: (profile.substitutions || []).map((s) => ({
      from: str(s.from),
      to: str(s.to),
      from_file: str(s.from_file),
      to_file: str(s.to_file),
      decision: [...(s.decision || [])].map(String),
      from_digest: str((fileDigests || {})[s.from]) || null,
      to_digest: str((fileDigests || {})[s.to]) || null,
    })),
  });
  return sha(canon).slice(0, 16);
}

/**
 * A PROFIL SAJÁT KAPUJA — a kitalált vagy elcsúszott profil ITT esik ki.
 *
 * Amit mér: minden nevezett program LÉTEZIK a manifesztben · nincs ismétlődés · a helyettesítés
 * `from`-ja NEM aktív és a `to`-ja AKTÍV (különben a csere csak szöveg) · minden helyettesítéshez
 * tartozik MÉRT fájl-lenyomat (hiánya NEM üres lenyomat, hanem nevezett hiba — `KUKA-051`) · és a
 * döntés meg van nevezve.
 */
export function profileProblems({ profile, programs, fileDigests } = {}) {
  const p = [];
  if (!profile || typeof profile !== 'object') return ['a profil hiányzik vagy nem objektum'];
  if (!str(profile.id)) p.push('a profil nem nevezi meg magát (id)');
  if (!Number.isInteger(profile.version) || profile.version < 1) {
    p.push(`a profil verziója nem valódi: ${JSON.stringify(profile.version)}`);
  }
  const ids = (profile.programs || []).map(String);
  if (!ids.length) p.push('a profil egyetlen programot sem nevez meg');
  const dupes = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dupes.length) p.push(`ISMÉTLŐDŐ program a profilban: ${[...new Set(dupes)].join(' · ')}`);
  const known = new Set((Array.isArray(programs) ? programs : []).map((x) => String(x.id)));
  const missing = ids.filter((x) => !known.has(x));
  if (missing.length) {
    p.push(`a profil olyan programot nevez meg, ami a MANIFESZTBEN NEM létezik: ${missing.join(' · ')}`);
  }
  const active = new Set(ids);
  for (const s of profile.substitutions || []) {
    const label = `${str(s.from)}→${str(s.to)}`;
    if (!str(s.from) || !str(s.to)) { p.push(`a helyettesítés nem nevezi meg mindkét oldalát: ${label}`); continue; }
    if (active.has(String(s.from))) {
      p.push(`a helyettesített ${s.from} MÉGIS aktív a profilban (${label}) — a csere így csak szöveg`);
    }
    if (!active.has(String(s.to))) {
      p.push(`a helyettesítő ${s.to} NEM aktív a profilban (${label}) — a csere célja hiányzik`);
    }
    if (!(s.decision || []).length) p.push(`a helyettesítés nem nevez meg DÖNTÉST: ${label}`);
    if (!str(s.from_file) || !str(s.to_file)) p.push(`a helyettesítés nem nevez meg FORRÁSFÁJLT: ${label}`);
    for (const side of [s.from, s.to]) {
      const d = (fileDigests || {})[side];
      if (typeof d !== 'string' || !/^[0-9a-f]{64}$/.test(d)) {
        p.push(`a(z) ${side} MÉRT fájl-lenyomata nem valódi (64-hex): ${JSON.stringify(d)} — `
          + 'a helyettesítés mért lenyomat nélkül nem visszakövethető');
      }
    }
  }
  return p;
}

/** A profil EGY SOROS, olvasható alakja — a kimenetek ezt írják ki, hogy a mérce LÁTSZÓDJON. */
export function profileLine({ profile, programs, fileDigests } = {}) {
  const cases = profileCaseKeys(profile, programs);
  const d = profileDigest({ profile, programs, fileDigests });
  return `PROFIL ${profile.id} v${profile.version} (${profile.kind}) · ${(profile.programs || []).length} program · `
    + `${cases.length} aktív program-eset · lenyomat ${d}`
    + ((profile.substitutions || []).length
      ? ` · helyettesítés: ${profile.substitutions.map((s) => `${s.from}→${s.to}`).join(' · ')}`
      : '');
}
