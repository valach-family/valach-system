// v3app/public/tour.mjs — TUR-01: A KATTINTHATÓ BEMUTATÓ (R89 §4).
//
// MIT TESZ: a VALÓDI képernyőn, stabil azonosítóval jelölt elemre mutat, lépésenként egy célt
// magyaráz, és a Vissza · Tovább · Befejezés · Kilépés úton végig billentyűzettel is használható.
//
// ÉS AMIT SOHA NEM TESZ — ez a lényeg, kódban:
//   · NEM kattint mentésre, meghívásra, jóváhagyásra, jogadásra vagy törlésre. A modul a DOM-ban
//     semmit nem aktivál: csak KIEMEL és MAGYARÁZ (`highlight`), a műveletet a felhasználó végzi el
//     a rendes felületen;
//   · a FELADATHOZ KÖTÖTT lépés (`task`) CSAK igazolt siker után halad tovább: a gomb megnyomása
//     önmagában NEM siker. Az igazolást az `app.js` adja meg (`taskDone`), és azt a SZERVER válasza
//     alapján teszi — nem a kattintás alapján (KUKA-129: a nyugtának is igazat kell mondania);
//   · az „ÁTUGROTT" NEM „ELVÉGEZETT": a lépés állapota három szó (`pending` · `done` · `skipped`),
//     és a zárás KIÍRJA, mi maradt el;
//   · a HIÁNYZÓ CÉL, a MEGSZŰNT JOG és a MÁSIK FIÓK nevezetten MEGSZAKÍTJA a bemutatót — nem
//     mutogat a semmibe (KUKA-201: a nemleges válasz vigye a működő folytatást).
//
// AZ ELŐREHALADÁS MINIMÁLIS ÁLLAPOT, és a SZEMÉLYHEZ + FIÓKHOZ + BEMUTATÓ-VERZIÓHOZ kötött. Nem
// tároljuk el a böngészőben: kijelentkezés vagy személyváltás után más NEM láthatja (R89 §4).
import { TOURUI, PAGE } from './texts.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** A lépés HÁROM állapota — az „átugrott" nem „elvégezett". */
export const STEP_STATES = Object.freeze(['pending', 'done', 'skipped']);

/** A bemutató futó állapota. `null` = nincs futó bemutató. */
export function newTourRun({ def, view, role }) {
  if (!def || !Array.isArray(def.steps) || !def.steps.length) return null;
  return {
    id: def.id,
    version: def.version,
    feature: def.feature,
    page: def.page ?? null,
    requires_role: def.requires_role ?? null,
    steps: def.steps.map((s) => ({ ...s, state: 'pending' })),
    text: def.text || null,
    at: 0,
    // A NÉZET, AMIBEN INDULT — a bemutató ehhez tartozik, és nézet-váltásnál MEGÁLL (KTX-03 alakja).
    view: { book: view.book ?? null, subject: view.subject ?? null },
    role: role ?? null,
    endedBy: null,
  };
}

/** A célelem a MAI képernyőn — `null`, ha nem látható (akkor a bemutató nevezetten megáll). */
export function targetOf(run) {
  if (!run) return null;
  const step = run.steps[run.at];
  if (!step) return null;
  const el = document.querySelector(`[data-testid="${step.target}"]`);
  if (!el) return null;
  // A REJTETT ELEM NEM CÉL: egy `hidden` gombra mutatni ugyanolyan hazugság, mint a nem létezőre.
  if (el.hidden || (el.offsetParent === null && el.getClientRects().length === 0)) return null;
  return el;
}

/**
 * A CÉLT FELTÁRÓ ELEM — `null`, ha a lépés nem deklarál feltárót, vagy az sincs a lapon.
 *
 * MIÉRT KELL (KUKA-228). A bemutató SOHA nem kattint, tehát a panelen belüli cél (a meghívó
 * e-mail mezője, a súgó fülei, a céges adószám-mező) a lépés pillanatában MÉG NEM LÉTEZIK — a
 * felhasználónak előbb meg kell nyitnia. A régi alak ezt `targetMissing`-nek minősítette, és
 * MEGSZAKÍTOTTA a bemutatót egy teljesen ép képernyőn: a mondat („eltűnt a képernyőről") HAMIS
 * volt, a cél nem eltűnt, hanem még nem jelent meg. Ezért a lépés KIMONDJA, mi tárja fel
 * (`appears_after`), és a bemutató a feltáró gombot emeli ki, majd MEGVÁRJA a felhasználót.
 */
export function revealerOf(run) {
  if (!run) return null;
  const step = run.steps[run.at];
  if (!step || !step.appears_after) return null;
  const el = document.querySelector(`[data-testid="${step.appears_after}"]`);
  if (!el) return null;
  if (el.hidden || (el.offsetParent === null && el.getClientRects().length === 0)) return null;
  return el;
}

/** A lépés VÁRAKOZIK-e a feltárásra: a cél még nincs, de a feltáró elem ott van a lapon. */
export function isPending(run) { return !targetOf(run) && Boolean(revealerOf(run)); }

/**
 * A BEMUTATÓ ÉRVÉNYESSÉGE a MAI állapotban. `ok: false` esetén a `why` a KIÍRANDÓ mondat kulcsa.
 * A négy megszakítási ok kimondva: nézet-váltás · megszűnt jog · hiányzó cél · nincs lépés.
 */
export function checkRun(run, { view, role }) {
  if (!run) return { ok: false, why: 'no_run' };
  if ((view.book ?? null) !== run.view.book || (view.subject ?? null) !== run.view.subject) return { ok: false, why: 'contextChanged' };
  if (run.requires_role === 'admin' && role !== 'admin') return { ok: false, why: 'rightLost' };
  if (!run.steps[run.at]) return { ok: false, why: 'no_run' };
  // A HIÁNYZÓ CÉL KÉT KÜLÖN HELYZET, és a felhasználó teendője is más: FELTÁRÁSRA VÁR (ő nyitja
  // meg) VAGY valóban eltűnt (a bemutató megáll). A kettőt nem mossuk össze (KUKA-228).
  if (!targetOf(run)) {
    if (revealerOf(run)) return { ok: true, why: null, pending: 'targetPending' };
    return { ok: false, why: 'targetMissing' };
  }
  return { ok: true, why: null, pending: null };
}

/**
 * TOVÁBBLÉPÉS. A feladathoz kötött lépésen CSAK akkor halad, ha az `app.js` már IGAZOLTA a
 * műveletet (`taskDone`). Egyébként nevezetten megmondja, mi hiányzik.
 */
export function advance(run) {
  const step = run.steps[run.at];
  if (!step) return { moved: false, why: 'no_run' };
  // A CÉL NÉLKÜLI LÉPÉS NEM HALAD, és két külön okkal: FELTÁRÁSRA VÁR (a felhasználó nyitja meg —
  // a mondat megmondja a folytatást, KUKA-201) VAGY a cél eltűnt (a rajzolás NEVEZETTEN megszakít).
  // MIÉRT NEM LÉPÜNK TOVÁBB egyszerűen: a régi alak a nem létező célú lépést `done`-ra állította és
  // átugrotta — vagyis „elvégzett"-nek könyvelt egy lépést, ami meg sem történhetett (KUKA-129).
  if (!targetOf(run)) return { moved: false, why: isPending(run) ? 'targetPending' : 'targetMissing' };
  if (step.task && step.state !== 'done') return { moved: false, why: 'taskNotDone' };
  if (!step.task) step.state = 'done';
  if (run.at + 1 >= run.steps.length) return { moved: false, why: 'finished' };
  run.at += 1;
  return { moved: true, why: null };
}

/** VISSZALÉPÉS — a már elvégzett lépés állapotát NEM írja vissza „hátravan"-ra (a tény tény). */
export function back(run) {
  if (run.at <= 0) return { moved: false };
  run.at -= 1;
  return { moved: true };
}

/**
 * A FELADAT IGAZOLÁSA. Az `app.js` hívja, a SZERVER válasza után — nem a kattintás után. Ha a futó
 * lépés épp erre a feladatra vár, `done` lesz; különben nem történik semmi (nem „előre" igazolunk).
 */
export function taskDone(run, taskId) {
  if (!run) return false;
  const step = run.steps[run.at];
  if (!step || step.task !== taskId) return false;
  step.state = 'done';
  return true;
}

/** A KILÉPÉS: a hátralévő lépések „átugrott"-ak — NEM „elvégezett"-ek. */
export function exitRun(run, by) {
  if (!run) return null;
  for (const s of run.steps) if (s.state === 'pending') s.state = 'skipped';
  run.endedBy = by || 'exit';
  return run;
}

/** A lépés szövege a nyelvcsomagból (a `text` a szerver válaszában jött, a kért nyelven). */
function stepText(run) {
  const step = run.steps[run.at];
  const box = run.text || {};
  const t = step ? box[step.id] : null;
  return { title: (t && t.title) || '', body: (t && t.body) || '' };
}

/**
 * A BUBORÉK. Nem párbeszéd (`aria-modal="false"`): a valódi képernyő MÖGÖTTE kattintható marad —
 * különben a feladathoz kötött lépést nem lehetne elvégezni (R89 §4: a panel ne fedje el a fő
 * műveletet). A lépések RÖVID SZÖVEGES LISTÁBÓL is követhetők (nem csak képen).
 */
export function tourHtml(run, { blocked, pending } = {}) {
  if (!run) return '';
  const { title, body } = stepText(run);
  const n = run.at + 1;
  const total = run.steps.length;
  const last = run.at + 1 >= total;
  const stateWord = { pending: TOURUI.pending, done: TOURUI.done, skipped: TOURUI.skipped };
  return `<div class="tourhead"><small data-testid="tour-progress">${esc(run.text && run.text.title ? run.text.title : run.id)} · ${esc(String(n))}/${esc(String(total))}</small>
      <button type="button" class="x" data-action="tour-exit" aria-label="${esc(TOURUI.exit)}" data-testid="tour-exit">×</button></div>
    <h3 data-testid="tour-step-title">${esc(title)}</h3>
    <p data-testid="tour-step-body">${esc(body)}</p>
    ${pending ? `<p class="notice" data-testid="tour-pending" data-why="${esc(pending)}">${esc(TOURUI.targetPending)}</p>` : ''}
    ${blocked ? `<p class="notice warn" data-testid="tour-blocked">${esc(TOURUI[blocked] || blocked)}</p>` : ''}
    <ol class="tourlist" data-testid="tour-steps" aria-label="${esc(TOURUI.stepList)}">
      ${run.steps.map((s, i) => `<li data-testid="tour-step-${esc(s.id)}" data-state="${esc(s.state)}" ${i === run.at ? 'aria-current="step"' : ''}>
        ${esc((run.text && run.text[s.id] && run.text[s.id].title) || s.id)} <small>${esc(stateWord[s.state] || s.state)}</small></li>`).join('')}
    </ol>
    <p class="muted" style="font-size:12px" data-testid="tour-note">${esc(TOURUI.simulationNote)}</p>
    <div class="buttonrow">
      <button type="button" data-action="tour-back" data-testid="tour-back" ${run.at === 0 ? 'disabled' : ''}>${esc(TOURUI.back)}</button>
      ${last
    ? `<button type="button" class="primary" data-action="tour-finish" data-testid="tour-finish">${esc(TOURUI.finish)}</button>`
    : `<button type="button" class="primary" data-action="tour-next" data-testid="tour-next">${esc(TOURUI.next)}</button>`}
      <button type="button" data-action="tour-restart" data-testid="tour-restart">${esc(TOURUI.restart)}</button>
    </div>`;
}

/** A ZÁRÓ LAP — kimondja, mi lett elvégezve és mi maradt átugorva. */
export function finishedHtml(run) {
  const done = run.steps.filter((s) => s.state === 'done').length;
  const skipped = run.steps.filter((s) => s.state === 'skipped').length;
  return `<div class="tourhead"><small data-testid="tour-progress">${esc(run.text && run.text.title ? run.text.title : run.id)}</small>
      <button type="button" class="x" data-action="tour-exit" aria-label="${esc(TOURUI.exit)}" data-testid="tour-exit">×</button></div>
    <h3 data-testid="tour-finished">${esc(TOURUI.finishedTitle)}</h3>
    <p>${esc(TOURUI.finishedLead)}</p>
    <p data-testid="tour-summary">${esc(TOURUI.done)}: ${esc(String(done))} · ${esc(TOURUI.skipped)}: ${esc(String(skipped))}</p>
    <div class="buttonrow"><button type="button" data-action="tour-restart" data-testid="tour-restart">${esc(TOURUI.restart)}</button>
      <button type="button" class="primary" data-action="tour-exit" data-testid="tour-close">${esc(TOURUI.exit)}</button></div>`;
}

/** A MEGSZAKÍTÁS lapja — NEVEZETT ok, és működő folytatás. */
export function abortedHtml(why) {
  return `<div class="tourhead"><small>${esc(TOURUI.title)}</small>
      <button type="button" class="x" data-action="tour-exit" aria-label="${esc(TOURUI.exit)}" data-testid="tour-exit">×</button></div>
    <p class="notice warn" data-testid="tour-aborted" data-why="${esc(why)}">${esc(TOURUI[why] || TOURUI.targetMissing)}</p>
    <p class="muted">${esc(TOURUI.targetMissingNext)}</p>
    <div class="buttonrow"><button type="button" class="primary" data-action="tour-exit" data-testid="tour-close">${esc(TOURUI.exit)}</button>
      <button type="button" data-action="tour-restart" data-testid="tour-restart">${esc(TOURUI.restart)}</button></div>`;
}

/** A KIEMELÉS: osztályt tesz a cél-elemre, a korábbit leveszi. AKTIVÁLÁS NINCS (nem kattint). */
export function highlight(run) {
  for (const el of document.querySelectorAll('.tourtarget')) el.classList.remove('tourtarget');
  // FELTÁRÁSRA VÁRVA a FELTÁRÓ gombot emeljük ki — arra kell kattintania, nem a még nem létező célra.
  const el = targetOf(run) || revealerOf(run);
  if (el) {
    el.classList.add('tourtarget');
    if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center', behavior: 'auto' });
  }
  return el;
}
export function clearHighlight() {
  for (const el of document.querySelectorAll('.tourtarget')) el.classList.remove('tourtarget');
}

/** A bemutatóhoz tartozó oldal neve — a lap ide visz, mielőtt az első lépés kiemel. */
export function pageOf(run) { return run && run.page && PAGE[run.page] ? run.page : null; }

export const TUR_CONTRACT = Object.freeze({
  id: 'TUR-01',
  owns: 'a bemutató lépés-állapota, a cél feloldása, a továbblépés szabálya és a buborék rajzolása',
  never_clicks: 'nem aktivál DOM-elemet: se mentést, se meghívást, se jogadást, se törlést',
  task_rule: 'a feladathoz kötött lépés CSAK a szerver által igazolt siker után halad (taskDone)',
  skipped_is_not_done: 'három állapot: pending · done · skipped — a zárás kiírja, mi maradt el',
  abort_reasons: Object.freeze(['contextChanged', 'rightLost', 'targetMissing']),
  pending_rule: 'a panelen belüli cél FELTÁRÓJA deklarált (appears_after): amíg a felhasználó meg '
    + 'nem nyitja, a bemutató VÁR (targetPending) és a FELTÁRÓT emeli ki — nem szakít meg, és nem '
    + 'kattint helyette',
  progress: 'memóriában, személy + fiók + bemutató-verzió kötéssel; böngészőben NEM tároljuk',
});
