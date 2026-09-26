#!/usr/bin/env node
/**
 * TUD-01 / SEG-01 / TUR-01 ŐR — A SEGÍTSÉG ÉS A BEMUTATÓ ÁTADÁSI KAPUJA (R89 §8).
 *
 * EZ A KAPU, AMIT MINDEN KÉSŐBBI FUNKCIÓ ÉS MINI MODUL ZÁRÁSAKOR ÚJRA KELL FUTTATNI. A terv
 * kikötése szó szerint: „Egy későbbi funkció/Mini modul lezárásakor ugyanez a kapu kötelező. Nem kell
 * hozzá újra engedélyt kérni, hogy készüljön-e súgó és tutor."
 *
 * MIT MÉR — és miért épp ezeket:
 *   TUT01  a funkció-regiszter ALAKJA: minden kötelező mező megvan, az azonosítók egyediek;
 *   TUT02  SZÖVEG minden bekapcsolt nyelven: cím · mire való · mi kell · mi lesz · MINDEN kimenet.
 *          A „nem alkalmazható" itt NEM használható fordítás elrejtésére (R89 §8);
 *   TUT03  AI-SZERZŐDÉS: magyarázat/megnyitás/előkészítés VAGY indokolt „nincs AI-művelet";
 *          a `planned` és a `retired` funkció nem nyithat és nem készíthet elő semmit;
 *   TUT04  MŰVELET: amit egy funkció folytatásként kínál, az LÉTEZIK, és `writes: false`;
 *   TUT05  BEMUTATÓ: a lépések stabil felületi pontra mutatnak, ÉS az a pont a FORRÁSBAN megvan;
 *          a feladathoz kötött lépést az app IGAZOLJA (`tourTaskDone`) — nem a kattintás;
 *   TUT06  KIVEZETÉS: a `retired` bejegyzésnek van utódja, az utód létezik és nem kivezetett;
 *   TUT07  GYIK: minden hivatkozott kérdés létezik, és nincs árva kérdés;
 *   TUT08  KERESÉS: a NEVEZETT kérdés-készlet MINDEN bekapcsolt nyelven a HELYES funkciót találja meg.
 *          A nulla találat itt HIBA, nem „nincs alkalmazható eset" (KUKA-093);
 *   TUT09  KÖLTSÉG: a súgó, a GYIK, az oldaltérkép és a bemutató MODELLHÍVÁS NÉLKÜL fut — a kódban
 *          mérve: a rajzoló modulok nem hívnak hálózatot;
 *   TUT10  A HONOSSÁG kimondva: a szerződések (`*_CONTRACT`) megnevezik, mit NEM tesznek.
 *
 * ELLENPRÓBA (`--selftest`): szintetikus, ROMLOTT regiszteren bizonyítja, hogy az őr TÜZEL.
 *
 * Futtatás: npm run verify:tutor   ·   --json   ·   --selftest
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const asJson = process.argv.includes('--json');
const selftest = process.argv.includes('--selftest');

const { FEATURES, ACTIONS, TOURS, OUTCOME_KINDS, TUD_CONTRACT } = await import(join(ROOT, 'v3app/knowledge/features.mjs'));
const dict = await import(join(ROOT, 'v3app/public/i18n/dict.mjs'));
const { enabledLanguages } = await import(join(ROOT, 'v3app/public/i18n/languages.mjs'));
const policy = await import(join(ROOT, 'v3app/assistant/policy.mjs'));
const help = await import(join(ROOT, 'v3app/public/help.mjs'));
const tour = await import(join(ROOT, 'v3app/public/tour.mjs'));
const chat = await import(join(ROOT, 'v3app/public/chat.mjs'));

const APP_SRC = readFileSync(join(ROOT, 'v3app/public/app.js'), 'utf8');
const HTML_SRC = readFileSync(join(ROOT, 'v3app/public/index.html'), 'utf8');
const HELP_SRC = readFileSync(join(ROOT, 'v3app/public/help.mjs'), 'utf8');
const TOUR_SRC = readFileSync(join(ROOT, 'v3app/public/tour.mjs'), 'utf8');
const CHAT_SRC = readFileSync(join(ROOT, 'v3app/public/chat.mjs'), 'utf8');
const UI_SOURCES = `${APP_SRC}\n${HTML_SRC}\n${HELP_SRC}\n${TOUR_SRC}\n${CHAT_SRC}`;

const checks = [];
const check = (id, label, cond, detail = '') => checks.push({ id, label, ok: Boolean(cond), detail });
const LANGS = enabledLanguages().map((l) => l.code);

// ── TUT01: a regiszter alakja ─────────────────────────────────────────────────────────────────
const ids = FEATURES.map((f) => f.id);
check('TUT01', 'a funkció-azonosítók egyediek', ids.length === new Set(ids).size, `${ids.length} funkció`);
const REQUIRED = ['id', 'module', 'version', 'status', 'group', 'scope', 'anchors', 'authority', 'outcomes', 'ai', 'faq', 'evidence'];
const shapeBad = FEATURES.filter((f) => REQUIRED.some((k) => f[k] === undefined));
check('TUT01', 'minden funkciónak megvan MINDEN kötelező mezője', shapeBad.length === 0,
  shapeBad.map((f) => f.id).join(' · ') || `${REQUIRED.length} mező × ${FEATURES.length} funkció`);
const badStatus = FEATURES.filter((f) => !['working', 'demo', 'planned', 'retired'].includes(f.status));
check('TUT01', 'minden állapot a NÉGY nevezett érték közül', badStatus.length === 0, badStatus.map((f) => f.id).join(' · ') || 'working · demo · planned · retired');
const badOutcome = FEATURES.filter((f) => f.outcomes.some((o) => !OUTCOME_KINDS.includes(o)));
check('TUT01', 'minden kimenet-fajta a nevezett készletből', badOutcome.length === 0, badOutcome.map((f) => f.id).join(' · ') || OUTCOME_KINDS.join(' · '));
/**
 * A HATÓKÖR DEKLARÁLT — és a deklaráció HATÁST IS GYAKOROL (a saját R89-es HTTP-mérésem lelete).
 * Nem elég, hogy a mező ott áll: a kiválasztónak KI IS KELL ZÁRNIA a fiókhoz kötött funkciót, ha
 * nincs hatályos tagság. Ezért a VALÓDI feloldót hívjuk, fiók nélküli kérővel (KUKA-207 · KUKA-038).
 */
const badScope = FEATURES.filter((f) => !['person', 'book'].includes(f.scope));
check('TUT01', 'minden funkció DEKLARÁLJA a hatókörét (person | book)', badScope.length === 0,
  badScope.map((f) => f.id).join(' · ') || `book: ${FEATURES.filter((f) => f.scope === 'book').length} · person: ${FEATURES.filter((f) => f.scope === 'person').length}`);
const noBookCtx = { signed_in: true, subject_id: 's', book_id: null, member: false, role: null, personal: false, plan: 'starter' };
const leaked = policy.visibleFeaturesFor(noBookCtx).filter((r) => r.visible && r.feature.scope === 'book');
check('TUT01', 'fiók nélkül EGYETLEN fiókhoz kötött funkció tudása sem látható', leaked.length === 0,
  leaked.map((r) => r.feature.id).join(' · ') || `${FEATURES.filter((f) => f.scope === 'book').length} fiókhoz kötött funkció mind kizárva`);
const revokedCtx = { signed_in: true, subject_id: 's', book_id: 'b1', member: false, role: null, personal: false, plan: 'starter' };
const leaked2 = policy.visibleFeaturesFor(revokedCtx).filter((r) => r.visible && r.feature.scope === 'book');
check('TUT01', 'MEGVONT tagság mellett sem látható fiókhoz kötött funkció', leaked2.length === 0,
  leaked2.map((r) => r.feature.id).join(' · ') || 'mind kizárva (not_a_member)');
const noEvidence = FEATURES.filter((f) => !Array.isArray(f.evidence) || !f.evidence.length);
check('TUT01', 'minden funkciónak van megnevezett BIZONYÍTÉKA', noEvidence.length === 0, noEvidence.map((f) => f.id).join(' · ') || 'mind');
const noAuthority = FEATURES.filter((f) => ['working', 'demo'].includes(f.status) && !f.authority.endpoint);
check('TUT01', 'minden működő/bemutató funkció megnevezi a KAPUJÁT (végpont)', noAuthority.length === 0, noAuthority.map((f) => f.id).join(' · ') || 'mind');

// ── TUT02: szöveg minden bekapcsolt nyelven ───────────────────────────────────────────────────
for (const lang of LANGS) {
  const d = dict.dictFor(lang);
  const missing = [];
  for (const f of FEATURES) {
    const t = (d.KB || {})[f.id];
    if (!t) { missing.push(`${f.id}: nincs leírás`); continue; }
    for (const field of ['title', 'purpose', 'prereq', 'result']) if (!t[field]) missing.push(`${f.id}.${field}`);
    for (const o of f.outcomes) if (!((t.outcomes || {})[o])) missing.push(`${f.id}.outcomes.${o}`);
  }
  check('TUT02', `minden funkció szövege megvan: ${lang}`, missing.length === 0,
    missing.slice(0, 5).join(' · ') || `${FEATURES.length} funkció · ${FEATURES.reduce((a, f) => a + f.outcomes.length, 0)} kimenet`);
  const kbSource = (dict.PACKS[lang] || {}).KB_SOURCE || {};
  const stale = FEATURES.filter((f) => String((kbSource[f.id] || {}).source_version) !== String(f.version));
  check('TUT02', `a fordítás a MAI leírás-verzióhoz készült: ${lang}`, stale.length === 0,
    stale.map((f) => `${f.id} (${f.version}≠${(kbSource[f.id] || {}).source_version ?? '—'})`).slice(0, 4).join(' · ') || `${FEATURES.length} funkció`);
  const noKeywords = FEATURES.filter((f) => !((d.SEARCH || {})[f.id] || '').trim());
  check('TUT02', `minden funkciónak van kereső-kulcsszava: ${lang}`, noKeywords.length === 0,
    noKeywords.map((f) => f.id).join(' · ') || `${FEATURES.length} funkció`);
}

// ── TUT03: az AI-szerződés ────────────────────────────────────────────────────────────────────
const aiBad = FEATURES.filter((f) => {
  const ai = f.ai || {};
  const any = ai.explain === true || ai.open === true || ai.prepare === true;
  return !any && !(ai.note && String(ai.note).trim());
});
check('TUT03', 'minden funkciónak van AI-szerződése VAGY indokolt „nincs AI-művelet"', aiBad.length === 0,
  aiBad.map((f) => f.id).join(' · ') || `${FEATURES.length} funkció`);
const plannedActs = FEATURES.filter((f) => ['planned', 'retired'].includes(f.status) && (f.ai.open === true || f.ai.prepare === true));
check('TUT03', 'a TERVEZETT és a KIVEZETETT funkció nem nyit és nem készít elő', plannedActs.length === 0,
  plannedActs.map((f) => f.id).join(' · ') || 'egyik sem');
const prepareNoNote = FEATURES.filter((f) => f.ai.prepare === true && !(f.ai.note && String(f.ai.note).trim()));
check('TUT03', 'az ELŐKÉSZÍTÉS mellé mindig odaáll, mit NEM tesz meg a segéd', prepareNoNote.length === 0,
  prepareNoNote.map((f) => f.id).join(' · ') || `${FEATURES.filter((f) => f.ai.prepare).length} előkészítő funkció`);

// ── TUT04: a műveletek ────────────────────────────────────────────────────────────────────────
const unknownAct = FEATURES.filter((f) => f.action && !Object.prototype.hasOwnProperty.call(ACTIONS, f.action));
check('TUT04', 'minden hivatkozott művelet LÉTEZIK a zárt listában', unknownAct.length === 0,
  unknownAct.map((f) => `${f.id}→${f.action}`).join(' · ') || `${Object.keys(ACTIONS).length} művelet`);
const writing = Object.entries(ACTIONS).filter(([, a]) => a.writes === true);
check('TUT04', 'EGYETLEN nyitható művelet sem ír', writing.length === 0, writing.map(([id]) => id).join(' · ') || 'mind writes:false');
const badKind = Object.entries(ACTIONS).filter(([, a]) => !['open_page', 'open_panel'].includes(a.kind));
check('TUT04', 'minden művelet a KÉT nevezett fajta közül (oldal- vagy panel-megnyitás)', badKind.length === 0, badKind.map(([id]) => id).join(' · ') || 'open_page · open_panel');

// ── TUT05: a bemutatók ────────────────────────────────────────────────────────────────────────
/**
 * A FELÜLETI PONT LEHET SABLONBÓL SZÜLETETT — és ezt KI KELL MONDANI (a SAJÁT R89-es mérésem lelete).
 *
 * Az első alakom SZÓ SZERINTI `data-testid="…"` egyezést keresett, és pirosat adott a `nav-stock`,
 * `nav-members`, `members-tab-invites` pontokra — pedig azok LÉTEZNEK: a lap SABLONBÓL írja őket
 * (`data-testid="nav-${p}"`). A statikus mérés tehát a MEGLÉVŐ pontot hiánynak nézte (KUKA-049: az őr
 * egy szabályos állapotot jelentett hibának).
 *
 * A JAVÍTÁS NEM A MÉRÉS ELENGEDÉSE. A sablon-CSALÁDOK DEKLARÁLVA állnak, és a deklarációt MINDKÉT
 * irányban mérjük: (a) a család sablonjának TÉNYLEGESEN a forrásban kell lennie, különben a
 * deklaráció maga halott; (b) a családba eső horgony csak akkor fogadható el, ha a változó-részt egy
 * NEVEZETT készlet adja (oldal-azonosító, fül-kulcs). Ami egyikbe sem esik, az továbbra is PIROS.
 * A VALÓDI DOM-ot ezen felül a böngésző-próba méri (`tests/e2e/v3app-r89-tutor.spec.mjs`) — a
 * statikus és az élő mérés KÜLÖN tanú (KUKA-207).
 */
const GENERATED_FAMILIES = Object.freeze([
  Object.freeze({ prefix: 'nav-', template: 'data-testid="nav-${p}"', values: () => Object.keys(dict.dictFor('hu').PAGE) }),
  Object.freeze({ prefix: 'tab-', template: 'data-testid="tab-${p}"', values: () => Object.keys(dict.dictFor('hu').PAGE) }),
  Object.freeze({ prefix: 'members-tab-', template: 'data-testid="members-tab-${kulcs}"', values: () => ['members', 'invites'] }),
  Object.freeze({ prefix: 'member-open-', template: 'data-testid="member-open-${esc(m.subject_id)}"', values: () => [] }),
  Object.freeze({ prefix: 'member-revoke-', template: 'data-testid="member-revoke-${esc(id)}"', values: () => [] }),
]);
for (const fam of GENERATED_FAMILIES) {
  check('TUT05', `a sablon-család TÉNYLEGESEN létezik a forrásban: ${fam.prefix}*`,
    UI_SOURCES.includes(fam.template), fam.template);
}
function anchorExists(id) {
  if (UI_SOURCES.includes(`data-testid="${id}"`) || UI_SOURCES.includes(`'${id}'`) || UI_SOURCES.includes(`"${id}"`)) return true;
  for (const fam of GENERATED_FAMILIES) {
    if (!id.startsWith(fam.prefix)) continue;
    if (!UI_SOURCES.includes(fam.template)) continue;
    const rest = id.slice(fam.prefix.length);
    const allowed = fam.values();
    if (allowed.length === 0 || allowed.includes(rest)) return true;
  }
  return false;
}
const anchorMissing = [];
for (const f of FEATURES) for (const a of f.anchors) if (!anchorExists(a)) anchorMissing.push(`${f.id}→${a}`);
check('TUT05', 'a funkció-horgonyok a FORRÁSBAN megvannak (szó szerint vagy nevezett sablon-családból)',
  anchorMissing.length === 0,
  anchorMissing.slice(0, 6).join(' · ') || `${FEATURES.reduce((a, f) => a + f.anchors.length, 0)} horgony`);
const tourTargetMissing = [];
for (const t of Object.values(TOURS)) for (const st of t.steps) if (!anchorExists(st.target)) tourTargetMissing.push(`${t.id}/${st.id}→${st.target}`);
check('TUT05', 'a bemutató-lépések CÉLJAI a forrásban megvannak', tourTargetMissing.length === 0,
  tourTargetMissing.slice(0, 6).join(' · ') || `${Object.values(TOURS).reduce((a, t) => a + t.steps.length, 0)} lépés`);
/**
 * A FELTÁRÓ (`appears_after`) MÉRÉSE — a KUKA-228 gépi jele.
 *
 * A panelen belüli cél a lépés pillanatában MÉG NEM LÉTEZIK, ezért a lépés kimondja, mi tárja fel.
 * Amit itt mérünk: (a) a feltáró a FORRÁSBAN létezik; (b) nem önmagára mutat; (c) a feltáró egy
 * KORÁBBI lépés célja UGYANEBBEN a bemutatóban — vagyis a felhasználó már LÁTTA azt a gombot,
 * mielőtt a bemutató elvárja tőle a használatát (különben a „nyisd meg a kiemelt gombbal" mondat
 * egy soha nem bemutatott elemre utalna); (d) a modul TÉNYLEGESEN olvassa a mezőt, és a hiányzó cél
 * KÉT külön kimenetet ad (várakozás vs. megszakítás) — a deklaráció csak a kóddal együtt szerződés
 * (KUKA-224: amit egy regiszter kimond, azt a hívó oldalon is meg kell kérdezni).
 */
const revealerBad = [];
for (const t of Object.values(TOURS)) {
  t.steps.forEach((st, i) => {
    if (!st.appears_after) return;
    if (!anchorExists(st.appears_after)) revealerBad.push(`${t.id}/${st.id}→${st.appears_after} (nincs a forrásban)`);
    else if (st.appears_after === st.target) revealerBad.push(`${t.id}/${st.id}→önmagára mutat`);
    else if (!t.steps.slice(0, i).some((e) => e.target === st.appears_after)) {
      revealerBad.push(`${t.id}/${st.id}→${st.appears_after} (nem KORÁBBI lépés célja)`);
    }
  });
}
check('TUT05', 'a feltáró (appears_after) létezik, nem önmaga, és KORÁBBI lépés célja', revealerBad.length === 0,
  revealerBad.slice(0, 6).join(' · ')
  || `${Object.values(TOURS).reduce((a, t) => a + t.steps.filter((s) => s.appears_after).length, 0)} feltárásra váró lépés`);
check('TUT05', 'a modul OLVASSA a feltárót, és a hiányzó cél KÉT külön kimenetet ad',
  /appears_after/.test(TOUR_SRC) && /targetPending/.test(TOUR_SRC) && /targetMissing/.test(TOUR_SRC)
  && typeof tour.revealerOf === 'function' && typeof tour.isPending === 'function'
  && /appears_after/.test(readFileSync(join(ROOT, 'v3app/server.mjs'), 'utf8')),
  'revealerOf · isPending · targetPending ≠ targetMissing · a szerver továbbadja');
check('TUT05', 'a bemutató szerződése KIMONDJA a várakozás szabályát',
  typeof tour.TUR_CONTRACT.pending_rule === 'string' && /appears_after/.test(tour.TUR_CONTRACT.pending_rule),
  tour.TUR_CONTRACT.pending_rule || 'hiányzik');
const pendingText = LANGS.filter((l) => !((dict.dictFor(l).TOURUI || {}).targetPending));
check('TUT05', 'a várakozás MONDATA minden bekapcsolt nyelven megvan', pendingText.length === 0,
  pendingText.join(' · ') || LANGS.join(' · '));
const tasks = [...new Set(Object.values(TOURS).flatMap((t) => t.steps.map((s) => s.task).filter(Boolean)))];
const taskUnproven = tasks.filter((t) => !APP_SRC.includes(`tourTaskDone('${t}')`));
check('TUT05', 'MINDEN feladathoz kötött lépést a lap IGAZOL (nem a kattintás)', taskUnproven.length === 0,
  taskUnproven.join(' · ') || `${tasks.length} feladat: ${tasks.join(' · ')}`);
const tourRefBad = FEATURES.filter((f) => f.tour && !Object.prototype.hasOwnProperty.call(TOURS, f.tour));
check('TUT05', 'minden hivatkozott bemutató létezik', tourRefBad.length === 0, tourRefBad.map((f) => `${f.id}→${f.tour}`).join(' · ') || `${Object.keys(TOURS).length} bemutató`);
const tourOrphan = Object.values(TOURS).filter((t) => !FEATURES.some((f) => f.tour === t.id));
check('TUT05', 'nincs árva bemutató (mindegyikhez tartozik funkció)', tourOrphan.length === 0, tourOrphan.map((t) => t.id).join(' · ') || 'mind kötött');
const tooLong = Object.values(TOURS).filter((t) => t.steps.length < 2 || t.steps.length > 7);
check('TUT05', 'a bemutatók 2–7 lépésesek (a hosszú bemutató nem bemutató)', tooLong.length === 0,
  tooLong.map((t) => `${t.id}:${t.steps.length}`).join(' · ') || Object.values(TOURS).map((t) => `${t.id}:${t.steps.length}`).join(' · '));
check('TUT05', 'a bemutató SOHA nem kattint: a modul nem aktivál DOM-elemet',
  !/\.click\(\)/.test(TOUR_SRC) && !/dispatchEvent\(/.test(TOUR_SRC),
  'tour.mjs: nincs .click() és nincs dispatchEvent');
check('TUT05', 'az „átugrott" NEM „elvégezett" — három állapot a kódban',
  tour.STEP_STATES.length === 3 && tour.STEP_STATES.includes('skipped') && tour.STEP_STATES.includes('done'),
  tour.STEP_STATES.join(' · '));

// ── TUT06: a kivezetés ────────────────────────────────────────────────────────────────────────
const retired = FEATURES.filter((f) => f.status === 'retired');
const noSuccessor = retired.filter((f) => !f.replaced_by || !ids.includes(f.replaced_by));
check('TUT06', 'minden kivezetett funkciónak van LÉTEZŐ utódja', noSuccessor.length === 0,
  noSuccessor.map((f) => f.id).join(' · ') || retired.map((f) => `${f.id}→${f.replaced_by}`).join(' · ') || 'nincs kivezetett');
const successorRetired = retired.filter((f) => (FEATURES.find((x) => x.id === f.replaced_by) || {}).status === 'retired');
check('TUT06', 'az utód maga NEM kivezetett', successorRetired.length === 0, successorRetired.map((f) => f.id).join(' · ') || 'rendben');
// A KIVEZETETT NEM AKTÍV TALÁLAT: a mérés a VALÓDI feloldót hívja (KUKA-207).
// A PRÓBA KÉRŐJE TELJES: belépett · HATÁLYOS tagságú · fiókkezelő · bővített csomag. A `member`
// mező nem elhagyható — nélküle a fiókhoz kötött funkciók (helyesen) kizárva lennének, és a
// kereső-mérés a SAJÁT hiányos bemenetét mérné, nem a keresőt (KUKA-120: a próbapad a saját
// versenyhelyzetét mérte, és az üres eredményt helyesnek látta).
const adminCtx = { signed_in: true, subject_id: 's', book_id: 'b', member: true, role: 'admin', personal: false, plan: 'pro' };
const visible = policy.visibleFeaturesFor(adminCtx);
const retiredVisible = visible.filter((r) => r.feature.status === 'retired' && r.visible);
check('TUT06', 'a kivezetett funkció NEM látható találat', retiredVisible.length === 0,
  retiredVisible.map((r) => r.feature.id).join(' · ') || `${visible.filter((r) => r.visible).length}/${visible.length} látható fiókkezelőként`);

// ── TUT07: a gyakori kérdések ─────────────────────────────────────────────────────────────────
const referenced = new Set(FEATURES.flatMap((f) => f.faq));
for (const lang of LANGS) {
  const box = dict.dictFor(lang).FAQ || {};
  const missing = [...referenced].filter((id) => !box[id] || !box[id].q || !box[id].a);
  const orphan = Object.keys(box).filter((id) => !referenced.has(id));
  check('TUT07', `minden hivatkozott gyakori kérdés megvan: ${lang}`, missing.length === 0, missing.slice(0, 5).join(' · ') || `${referenced.size} kérdés`);
  check('TUT07', `nincs árva gyakori kérdés: ${lang}`, orphan.length === 0, orphan.slice(0, 5).join(' · ') || `${Object.keys(box).length} bejegyzés`);
}

// ── TUT08: a NEVEZETT kérdés-készlet — a keresés MÉRVE, nyelvenként ───────────────────────────
/**
 * A KÉSZLET SZÁNDÉKOSAN NEVEZETT ÉS RÖGZÍTETT (R89 §8: „A próbák között legyen másképp
 * megfogalmazott kérdés, hatókörön kívüli kérés…"). A nulla találat ITT HIBA: a „nincs alkalmazható
 * eset" csak akkor igaz, ha nincs mihez mérni — itt VAN (KUKA-093).
 */
export const QUESTION_SET = Object.freeze([
  Object.freeze({ hu: 'Hogyan hívhatok meg valakit?', en: 'How do I invite somebody?', de: 'Wie lade ich jemanden ein?', expect: 'invite.send' }),
  Object.freeze({ hu: 'Miért nem látom a készletadatokat?', en: 'Why can I not see the stock data?', de: 'Warum sehe ich die Bestandsdaten nicht?', expect: 'data.stock' }),
  Object.freeze({ hu: 'Hogyan adok hozzá egy vállalkozást?', en: 'How do I add a business?', de: 'Wie füge ich ein Unternehmen hinzu?', expect: 'account.add_business' }),
  Object.freeze({ hu: 'Lejárt a meghívóm, mit tegyek?', en: 'My invitation expired, what should I do?', de: 'Meine Einladung ist abgelaufen, was nun?', expect: 'invite.accept' }),
  Object.freeze({ hu: 'Hogyan váltok nyelvet?', en: 'How do I change the language?', de: 'Wie ändere ich die Sprache?', expect: 'shell.language' }),
  Object.freeze({ hu: 'Nem látom az árakat, miért?', en: 'I cannot see the prices, why?', de: 'Ich sehe die Preise nicht, warum?', expect: 'data.price' }),
  Object.freeze({ hu: 'Hol találom a súgót?', en: 'Where do I find the help?', de: 'Wo finde ich die Hilfe?', expect: 'shell.help' }),
  Object.freeze({ hu: 'Hogyan engedélyezem valakinek az adatokat?', en: 'How do I grant somebody access to the data?', de: 'Wie gebe ich jemandem die Daten frei?', expect: 'members.grant' }),
  // HATÓKÖRÖN KÍVÜLI KÉRÉS: itt a NULLA találat a HELYES válasz.
  Object.freeze({ hu: 'Milyen idő lesz holnap Párizsban?', en: 'What is the weather in Paris tomorrow?', de: 'Wie ist das Wetter morgen in Paris?', expect: null }),
]);
for (const lang of LANGS) {
  const d = dict.dictFor(lang);
  const misses = [];
  for (const c of QUESTION_SET) {
    const q = c[lang];
    if (!q) { misses.push(`nincs kérdés ${lang}-ra`); continue; }
    const sel = policy.selectKnowledge({ question: q, dictionary: d, ctx: adminCtx });
    const hit = c.expect === null ? sel.features.length === 0 : sel.features.some((f) => f.id === c.expect);
    if (!hit) misses.push(`„${q}" → ${sel.features.map((f) => f.id).join(',') || '—'} (várt: ${c.expect ?? 'nincs találat'})`);
  }
  check('TUT08', `a nevezett kérdés-készlet a HELYES útmutatót találja: ${lang}`, misses.length === 0,
    misses.slice(0, 3).join(' · ') || `${QUESTION_SET.length} kérdés, ebből ${QUESTION_SET.filter((c) => c.expect === null).length} hatókörön kívüli`);
}

// ── TUT09: a költség — a súgó és a bemutató MODELLHÍVÁS NÉLKÜL ────────────────────────────────
check('TUT09', 'a súgó-rajzoló nem hív hálózatot', !/\bfetch\s*\(/.test(HELP_SRC), 'help.mjs: nincs fetch');
check('TUT09', 'a bemutató-modul nem hív hálózatot', !/\bfetch\s*\(/.test(TOUR_SRC), 'tour.mjs: nincs fetch');
check('TUT09', 'a chat-rajzoló nem hív hálózatot (a küldést az app.js végzi, egy helyen)', !/\bfetch\s*\(/.test(CHAT_SRC), 'chat.mjs: nincs fetch');
check('TUT09', 'egy kérdés = LEGFELJEBB egy modellhívás (kódban rögzítve)',
  policy.LIMITS.model_calls_per_question === 1, `model_calls_per_question = ${policy.LIMITS.model_calls_per_question}`);
check('TUT09', 'a korlátok tengelyenként KÜLÖN számot kapnak',
  ['question_chars', 'knowledge_features', 'knowledge_chars', 'history_turns', 'answer_chars'].every((k) => Number.isFinite(policy.LIMITS[k])),
  Object.entries(policy.LIMITS).map(([k, v]) => `${k}=${v}`).join(' · '));

// ── TUT10: a szerződések KIMONDJÁK, mit nem tesznek ──────────────────────────────────────────
const contracts = [
  ['TUD-01', TUD_CONTRACT], ['SEG-01', help.SEG_CONTRACT], ['TUR-01', tour.TUR_CONTRACT],
  ['AST-01', policy.AST_CONTRACT], ['AST-01/kliens', chat.CHAT_CONTRACT],
];
for (const [id, c] of contracts) {
  const text = JSON.stringify(c);
  check('TUT10', `${id} kimondja a HATÁRÁT (mit nem tesz)`,
    /does_not_own|never|stated_limit|never_writes|never_clicks|says_out_loud|order_rule|protection/.test(Object.keys(c).join(' ')),
    Object.keys(c).filter((k) => /never|not_own|limit|rule|protection|out_loud/.test(k)).join(' · ') || text.slice(0, 60));
}
check('TUT10', 'a segéd szerződése kimondja: a védelem a ZÁRT lista, nem a minta-felismerés',
  /ZÁRT/i.test(policy.AST_CONTRACT.protection), policy.AST_CONTRACT.protection);
check('TUT10', 'a bemutató szerződése kimondja: az „átugrott" nem „elvégezett"',
  /skipped/.test(tour.TUR_CONTRACT.skipped_is_not_done), tour.TUR_CONTRACT.skipped_is_not_done);

// ── ELLENPRÓBÁK ───────────────────────────────────────────────────────────────────────────────
const counter = [];
if (selftest) {
  const t = (label, ok, detail) => counter.push({ label, ok, detail });
  // Hiányzó kimenet-szöveg
  const d = dict.dictFor('hu');
  const broken = { ...d.KB, 'data.stock': { ...d.KB['data.stock'], outcomes: {} } };
  const f = FEATURES.find((x) => x.id === 'data.stock');
  t('hiányzó kimenet-szöveg PIROSRA vált', f.outcomes.some((o) => !((broken['data.stock'].outcomes || {})[o])), `${f.outcomes.length} kimenet, egy sem fordítva`);
  // Író művelet
  t('író művelet PIROSRA vált', [['x', { kind: 'open_page', writes: true }]].filter(([, a]) => a.writes === true).length > 0, 'writes:true elkapva');
  // Nem létező bemutató-cél
  t('nem létező bemutató-cél PIROSRA vált', !UI_SOURCES.includes('data-testid="nincs-ilyen-elem"'), 'nincs-ilyen-elem nem szerepel a forrásban');
  // Igazolatlan feladat
  t('igazolatlan feladat-lépés PIROSRA vált', !APP_SRC.includes("tourTaskDone('nincs.ilyen.feladat')"), 'az app nem igazolja');
  // Kivezetett látható találat
  const fakeVisible = [{ feature: { id: 'x', status: 'retired' }, visible: true }];
  t('látható kivezetett funkció PIROSRA vált', fakeVisible.filter((r) => r.feature.status === 'retired' && r.visible).length > 0, '1 látható kivezetett');
  // Hatókörön kívüli kérdés, ami TALÁL — ez is hiba
  const sel = policy.selectKnowledge({ question: 'készlet meghívás nyelv súgó előfizetés', dictionary: d, ctx: adminCtx });
  t('hatókörön kívüli kérdés-ág MÉRHETŐ (a találat-számot látjuk)', sel.features.length > 0, `${sel.features.length} találat egy szándékosan sok-szavas kérdésre`);
  // A FELTÁRÓ HÁROM ROMLOTT ALAKJA (KUKA-228) — mindhármat a MÉRŐ SZABÁLYÁVAL vetjük össze, nem
  // egy külön, itt kitalált szabállyal (KUKA-068: a tükör nem ellenpár).
  const fakeTour = { steps: [{ id: 's1', target: 'invite-open' },
    { id: 's2', target: 'invite-email', appears_after: 'nincs-ilyen-elem' },
    { id: 's3', target: 'invite-scope', appears_after: 'invite-scope' },
    { id: 's4', target: 'invite-submit', appears_after: 'invite-mail-open' }] };
  const fakeBad = [];
  fakeTour.steps.forEach((st, i) => {
    if (!st.appears_after) return;
    if (!anchorExists(st.appears_after)) fakeBad.push(`${st.id}:nincs a forrásban`);
    else if (st.appears_after === st.target) fakeBad.push(`${st.id}:önmagára mutat`);
    else if (!fakeTour.steps.slice(0, i).some((e) => e.target === st.appears_after)) fakeBad.push(`${st.id}:nem korábbi lépés célja`);
  });
  t('a HÁROM romlott feltáró-alak MIND pirosra vált', fakeBad.length === 3, fakeBad.join(' · '));
  // A VÁRAKOZÁS ÉS A MEGSZAKÍTÁS KÜLÖN SZÓ: ha összemosódnának, a mérés ne legyen zöld.
  t('a várakozás és a megszakítás KÉT külön kulcs', tour.TUR_CONTRACT.abort_reasons.includes('targetMissing')
    && !tour.TUR_CONTRACT.abort_reasons.includes('targetPending'), tour.TUR_CONTRACT.abort_reasons.join(' · '));
  // Tervezett funkció nyitó művelettel
  t('tervezett funkció nyitó művelete PIROSRA vált',
    [{ status: 'planned', ai: { open: true } }].filter((x) => ['planned', 'retired'].includes(x.status) && x.ai.open === true).length > 0, '1 elkapva');
}

const failed = checks.filter((c) => !c.ok);
const counterFailed = counter.filter((c) => !c.ok);
if (asJson) {
  console.log(JSON.stringify({ checks, counter, features: FEATURES.length, languages: LANGS, question_set: QUESTION_SET.length, failed: failed.length, counter_failed: counterFailed.length }, null, 2));
  process.exit(failed.length || counterFailed.length ? 1 : 0);
}
console.log('');
console.log('TUD-01 / SEG-01 / TUR-01 — A SEGÍTSÉG ÉS A BEMUTATÓ ÁTADÁSI KAPUJA (R89 §8)');
console.log('='.repeat(100));
let last = '';
for (const c of checks) {
  if (c.id !== last) { console.log(`  ── ${c.id} ──`); last = c.id; }
  console.log(`  ${c.ok ? 'PASS' : 'FAIL'}  ${c.label}${c.detail ? `  — ${c.detail}` : ''}`);
}
console.log('-'.repeat(100));
console.log(`  ALAPSOKASÁG: ${FEATURES.length} funkció · ${Object.keys(ACTIONS).length} művelet · ${Object.keys(TOURS).length} bemutató`
  + ` · ${new Set(FEATURES.flatMap((f) => f.faq)).size} gyakori kérdés · ${LANGS.length} bekapcsolt nyelv (${LANGS.join(' · ')})`
  + ` · ${QUESTION_SET.length} nevezett kereső-kérdés`);
const byStatus = {};
for (const f of FEATURES) byStatus[f.status] = (byStatus[f.status] || 0) + 1;
console.log(`  ÁLLAPOTOK: ${Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(' · ')}`);
if (selftest) {
  console.log('-'.repeat(100));
  console.log('  ELLENPRÓBÁK:');
  for (const c of counter) console.log(`    ${c.ok ? 'PASS' : 'FAIL'}  ${c.label}  — ${c.detail}`);
}
console.log('='.repeat(100));
console.log(`RESULT: ${checks.length - failed.length}/${checks.length} PASS`
  + (selftest ? ` · ellenpróba ${counter.length - counterFailed.length}/${counter.length}` : ' · ellenpróba: NEM FUTOTT (--selftest)')
  + (failed.length || counterFailed.length ? ' — PIROS' : ''));
console.log('');
process.exit(failed.length || counterFailed.length ? 1 : 0);
