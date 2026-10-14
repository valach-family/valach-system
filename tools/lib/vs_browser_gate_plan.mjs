// tools/lib/vs_browser_gate_plan.mjs — A BÖNGÉSZŐS KAPU FUTTATÁSI TERVE (BRG-02, R206 — F206-04).
//
// MIÉRT KÜLÖN MODUL, ÉS MIÉRT PONTOSAN EZ A HATÁR.
//
// A LELET (R206/F206-04, a külső ellenőrző fél mérése, forrásból igazolva). Az R204-ben felvettem
// a `docs:kiprobalas-kepek` láncot a kapu `CHAINS` listájába — a VÉGREHAJTÁS viszont nem a
// listából jött: a kapu a Playwright-láncot és utána egy FIXEN beírt `proof:demo-walk`-ot
// indított. A lista tehát csak a PARANCSALAKOT ellenőrizte, a hozzáadott láncot nem indította el.
// Az „bekerült a kötelező kapuba" állítás így végrehajtási értelemben nem teljesült, és ezt
// egyetlen gépi jel sem mondta ki: a kapu TELJES ZÖLDET adott egy el sem indult láncra
// (`KUKA-051`: a nem létező/nem futó dolgon a tiltó-minta zöldnek látszik · `KUKA-206`: a nem
// futott nem „részben").
//
// A JAVÍTÁS NEM EGY ÚJABB BEÍRT HÍVÁS — az ugyanitt bukna el a KÖVETKEZŐ láncnál (`KUKA-218`:
// a hívó jóindulatára bízott szabály nem szabály). A terv ITT, EGY helyen születik:
//   · a FUTTATANDÓ lépések a deklarált láncokból jönnek (`chainPlan`);
//   · és a modul KIMONDJA, ha egy deklarált lánc kimaradt a tervből (`planProblems`) — vagyis a
//     lista és a végrehajtás közti csúszás NEVEZETT hiba, nem némaság.
//
// ÉS AMIÉRT KÜLÖN FÁJL: így a próba MEG TUDJA HÍVNI (`KUKA-207` — „amit próba nem tud MEGHÍVNI,
// azt bizalomból hisszük"). A futtatót a hívó adja át (`run`), tehát az ellenpróba a többperces
// böngésző-láncok ismétlése NÉLKÜL tudja megmérni, hogy egy lánc hibája átszivárog-e a kapu
// verdiktjébe.

/**
 * A FUTTATÁSI TERV. A Playwright-láncok EGYESÍTÉSE megmarad (ha ugyanaz a parancs, EGY futás
 * fedi mindkettőt), a `node` fajtájú láncok PONTOSAN EGYSZER futnak, a deklarálás sorrendjében.
 *
 * @param {Array<{script:string,cmd:string,kind:string,outputs?:Array<string>}>} chains
 * @returns {Array<{kind:string,script:string,label:string,cmd:string,covers:string[],report:boolean,outputs:string[]}>}
 */
export function chainPlan(chains) {
  const steps = [];
  const csoportok = new Map();
  for (const c of (chains || [])) {
    if (c.kind !== 'playwright') continue;
    // A CSOPORTOSÍTÁS A TÉNYLEGES PARANCS SZERINT MEGY (nem a név szerint): ha a két script
    // parancsa szétválik, KÉT lépés lesz belőle, és ezt a sor is kimondja.
    const kulcs = c.cmd ? `cmd:${c.cmd}` : `script:${c.script}`;
    if (!csoportok.has(kulcs)) csoportok.set(kulcs, []);
    csoportok.get(kulcs).push(c);
  }
  let elso = true;
  for (const g of csoportok.values()) {
    steps.push({
      kind: 'playwright', script: g[0].script, cmd: g[0].cmd || '',
      label: g.map((c) => c.script).join(' + '), covers: g.map((c) => c.script),
      // A FUTÁS JSON-JELENTÉSÉT EGYSZER olvassuk el: azt az egy Playwright-futást írja, amelyik
      // a jelentés útját megkapja (a többi csoport a saját kilépési kódjával felel).
      report: elso, outputs: Object.freeze([...(g[0].outputs || [])]),
    });
    elso = false;
  }
  for (const c of (chains || [])) {
    if (c.kind !== 'node') continue;
    steps.push({
      kind: 'node', script: c.script, cmd: c.cmd || '', label: c.script,
      covers: [c.script], report: false, outputs: Object.freeze([...(c.outputs || [])]),
    });
  }
  return steps;
}

/** A DEKLARÁLT, DE NEM INDÍTOTT LÁNC NEVEZETT HIBA — ez a F206-04 gépi jele. */
export function planProblems(chains, plan) {
  const futo = new Set((plan || []).flatMap((s) => s.covers || []));
  const bajok = [];
  for (const c of (chains || [])) {
    if (!futo.has(c.script)) bajok.push(`a \`${c.script}\` lánc DEKLARÁLT, de a kapu futtatási terve nem indítja el`);
  }
  for (const s of (plan || [])) {
    for (const nev of (s.covers || [])) {
      if (!(chains || []).some((c) => c.script === nev)) bajok.push(`a terv olyan láncot indítana, ami nincs deklarálva: \`${nev}\``);
    }
  }
  return bajok;
}

/**
 * A TERV VÉGREHAJTÁSA — a FUTTATÓT a hívó adja (`run(step) → { ok, ms, detail }`).
 *
 * MINDEN LÉPÉS LEFUT, akkor is, ha egy korábbi bukott: egy piros lánc nem rejthet el egy másikat
 * (`KUKA-012`: a hiány nem lehet néma). A visszaadott lista a lépés SORRENDJÉT és eredményét is
 * megtartja, tehát a verdikt ebből ellenőrizhető — nem a futtató jóindulatából.
 */
export async function runPlan(plan, { run }) {
  if (typeof run !== 'function') throw new Error('vs_browser_gate_plan: a futtató (run) kötelező');
  const out = [];
  for (const step of (plan || [])) {
    // eslint-disable-next-line no-await-in-loop — a láncok SOROSAN futnak (egy szerver, egy tároló)
    const r = await run(step);
    out.push({ step, ...r });
  }
  return out;
}

/** A VERDIKT: minden lépésnek zöldnek kell lennie, ÉS minden deklarált láncnak futnia. */
export function planVerdict({ chains, plan, results }) {
  const bajok = planProblems(chains, plan);
  for (const r of (results || [])) if (!r.ok) bajok.push(`a \`${r.step.label}\` lánc NEM zöld${r.detail ? ` — ${r.detail}` : ''}`);
  const futott = new Set((results || []).flatMap((r) => r.step.covers || []));
  for (const c of (chains || [])) {
    if (!futott.has(c.script)) bajok.push(`a \`${c.script}\` lánc nem futott le — a nem futott mérés NEM zöld`);
  }
  return { ok: bajok.length === 0, bajok };
}
