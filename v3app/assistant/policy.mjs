// v3app/assistant/policy.mjs — AST-01: A SEGÉD SZERZŐDÉSE (R89 §6).
//
// MIT BIRTOKOL, EGY HELYEN: (1) hogy MELY funkciók tudása adható ki egy kérőnek, (2) hogy egy
// kérdéshez MELY tudás-darabok kerülnek elő (célzottan, nem a teljes kézikönyv), (3) hogy MELY
// műveletek nyithatók folytatásként, (4) a VÉGES korlátok, és (5) hogy az utasításnak álcázott
// tartalom ADAT, nem parancs.
//
// A SORREND, ami nem cserélhető fel (a terv §6 kikötése): „A szerver a tudás kiválasztása ELŐTT
// ellenőrzi a személyt, a fiókot, a jogosultságot, az előfizetést és a funkció állapotát." Ezért a
// `visibleFeaturesFor()` a BEMENETE a `selectKnowledge()`-nek, nem a szűrője utólag — egy utólagos
// szűrő már kiadta volna a tudást a kiválasztó lépésnek (KUKA-202: az őr ott álljon, ahol a kár
// keletkezik).
//
// AMIT EZ SOHA NEM TESZ: nem dönt jogról. A `ctx` a SZERVER által már eldöntött tényeket hordozza
// (belépett alany · aktív könyv · szerep · csomag · tagság) — ez a modul ezekre HIVATKOZIK, nem
// újraszámolja őket (KUKA-047). És nem ír: egyetlen `ACTIONS` bejegyzésnek sincs `writes: true`.
//
// TISZTA MODUL: se hálózat, se tároló, se óra. A végpont hívja, és a `verify:assistant` UGYANEZT
// (KUKA-207).
import { FEATURES, ACTIONS, TOURS } from '../knowledge/features.mjs';

/** A VÉGES KORLÁTOK — külön szám minden tengelyre (R89 §6 „Költség és adatkezelés"). */
export const LIMITS = Object.freeze({
  question_chars: 500,
  knowledge_features: 3,
  knowledge_chars: 4000,
  history_turns: 6,
  answer_chars: 1200,
  model_calls_per_question: 1,
  faq_hits: 5,
});

/** A TALÁLAT MINIMUMA — egyetlen, a leírás testében elkapott szó nem találat (lásd `selectKnowledge`). */
export const MIN_SCORE = 3;

/** A funkció-állapotok, amikről a segéd KÉSZ szolgáltatásként beszélhet. */
export const TEACHABLE_STATUS = Object.freeze(['working', 'demo']);

const lower = (s) => String(s ?? '').toLowerCase();
/** A kombináló ékezetek — EGY helyen, mert a kereső és a mérés UGYANEZT használja (KUKA-039). */
const DIACRITICS = /[\u0300-\u036f]/g;

/**
 * A KÉRDÉS ALAKJA. Nem tartalmi ítélet: hossz és üresség. A kérdés SZÖVEGE innentől ADAT.
 */
export function checkQuestion(raw) {
  const q = String(raw ?? '').trim();
  if (!q) return { ok: false, reason: 'missing_field' };
  if (q.length > LIMITS.question_chars) return { ok: false, reason: 'assistant_question_too_long', limit: LIMITS.question_chars, got: q.length };
  return { ok: true, question: q };
}

/**
 * AZ UTASÍTÁSNAK ÁLCÁZOTT TARTALOM — MÉRVE, de NEM végrehajtva (R89 §6).
 *
 * A terv kikötése: „A modell válasza és a tudásanyag adat, nem futtatható utasítás… A promptba
 * rejtett »hagyd figyelmen kívül a jogosultságot« szöveget negatív próbával kell vizsgálni."
 *
 * AMIT EZ A FÜGGVÉNY TESZ: megnevezi, hogy a kérdésben utasítás-alak van, hogy a válasz ezt
 * KIMONDHASSA a felhasználónak. AMIT NEM TESZ: nem tiltja le a kérdést emiatt — a védelem nem a
 * minta-felismerésen áll (azt körbe lehet írni), hanem azon, hogy a folytatás KIZÁRÓLAG az
 * `ACTIONS` zárt listájából nyílhat, és az sem ír. A minta-felismerés a TÁJÉKOZTATÁS, a zárt lista
 * a VÉDELEM (KUKA-203: a kényszerítés nem ellenőrzés).
 */
export const INJECTION_MARKERS = Object.freeze([
  'ignore the above', 'ignore previous', 'hagyd figyelmen kívül', 'felejtsd el az eddigi',
  'system prompt', 'rendszer-utasítás', 'you are now', 'mostantól te', 'act as admin',
  'viselkedj adminként', 'grant me', 'adj nekem jogot', 'disregard', 'override the',
  'jogosultság nélkül', 'bypass', 'reveal your', 'áruld el a', 'developer mode',
]);
export function injectionFindings(question) {
  const q = lower(question);
  return INJECTION_MARKERS.filter((m) => q.includes(m));
}

/**
 * MELY FUNKCIÓK TUDÁSA ADHATÓ KI ENNEK A KÉRŐNEK — a SZERVER már eldöntött tényeiből.
 *
 * `ctx`: `{ signed_in, book_id, role, personal, plan, member }`. A `reason` mező megmondja, MIÉRT
 * maradt ki egy funkció — a hiány nem néma (KUKA-012), és a súgó ezt KI IS ÍRJA a felhasználónak.
 */
export function visibleFeaturesFor(ctx = {}) {
  const admin = ctx.role === 'admin';
  const personal = ctx.personal === true;
  const plan = String(ctx.plan || 'starter');
  const out = [];
  for (const f of FEATURES) {
    // A KIVEZETETT FUNKCIÓ NEM AKTÍV TALÁLAT (R89 §3). Nem tűnik el: a `replaced_by` viszi tovább.
    if (f.status === 'retired') { out.push({ feature: f, visible: false, why: 'retired', replaced_by: f.replaced_by || null }); continue; }
    if (!ctx.signed_in) { out.push({ feature: f, visible: false, why: 'login_required' }); continue; }
    /**
     * A FIÓK IS A KAPU RÉSZE — a SAJÁT R89-es HTTP-mérésem lelete (`v3app/findings_r89.mjs` C).
     *
     * A korábbi alakom a személyt, a szerepet, a személyes jelleget és a csomagot nézte, a FIÓK
     * meglétét NEM. Ezért a MEGVONT tag (akinek `currentBookOf` már `book_id: null`-t ad) továbbra is
     * megkapta a készlet-, ár-, tagság- és mintaadat-tudást: a segéd többet adott ki, mint amihez
     * hozzáférése volt. A terv sorrendje kimondja: „a szerver … ellenőrzi a személyt, A FIÓKOT, a
     * jogosultságot, az előfizetést és a funkció állapotát" (R89 §6 · KUKA-047).
     *
     * A hatókört a funkció DEKLARÁLJA (`scope`), nem a kiválasztó találja ki: `book` = hatályos
     * tagság kell hozzá, `person` = a belépéshez tartozik (regisztráció · nyelv · súgó · profil).
     */
    if (f.scope === 'book' && !(ctx.book_id && ctx.member === true)) {
      out.push({ feature: f, visible: false, why: ctx.book_id ? 'not_a_member' : 'workspace_required' });
      continue;
    }
    const needsAdmin = f.action && ACTIONS[f.action] && ACTIONS[f.action].requires_role === 'admin';
    if (needsAdmin && !admin) { out.push({ feature: f, visible: false, why: 'admin_required' }); continue; }
    if (personal && ['invite', 'members', 'plan'].includes(f.group)) { out.push({ feature: f, visible: false, why: 'personal_space' }); continue; }
    // AZ ÁRAK KÉT KAPUJA (ENT-02): a csomag ÉS az engedély. A csomag itt mérhető, az ENGEDÉLY a
    // mag döntése — azt NEM találjuk ki, ezért az ár-funkció tudása kiadható, a MONDATA viszont
    // kimondja, hogy két kapu áll előtte.
    if (f.id === 'data.price' && plan !== 'pro') { out.push({ feature: f, visible: true, why: 'plan_limited', note: 'feature_not_in_plan' }); continue; }
    out.push({ feature: f, visible: true, why: null });
  }
  return out;
}

/** A jelenleg NYITHATÓ műveletek — a zárt listából, a kérő tényeire szűkítve. */
export function allowedActionsFor(ctx = {}) {
  const admin = ctx.role === 'admin';
  const personal = ctx.personal === true;
  const allowed = [];
  for (const [id, a] of Object.entries(ACTIONS)) {
    if (a.requires_role === 'admin' && !admin) continue;
    if (personal && ['members', 'plan', 'account'].includes(a.page)) continue;
    allowed.push(id);
  }
  return Object.freeze(allowed);
}

/**
 * EGY JAVASOLT FOLYTATÁS ELFOGADÁSA — ez a határ, ahol a modell szava megáll (R89 §6).
 *
 * Csak (a) LÉTEZŐ művelet-azonosító, (b) a kérőre ENGEDÉLYEZETT, (c) `writes: false` — és a
 * paraméterek típus-ellenőrzöttek. Minden más NEVEZETT elutasítás, nem néma kihagyás.
 */
export function acceptAction(proposed, ctx = {}) {
  const id = typeof proposed === 'string' ? proposed : (proposed && proposed.id);
  if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(ACTIONS, id)) {
    return { ok: false, reason: 'action_unknown', id: typeof id === 'string' ? id : null };
  }
  const a = ACTIONS[id];
  if (a.writes === true) return { ok: false, reason: 'action_not_allowed', id };
  if (!allowedActionsFor(ctx).includes(id)) return { ok: false, reason: 'action_not_allowed', id };
  const params = proposed && typeof proposed === 'object' && proposed.params ? proposed.params : {};
  if (params && typeof params === 'object' && !Array.isArray(params)) {
    for (const [k, v] of Object.entries(params)) {
      if (!['string', 'number', 'boolean'].includes(typeof v)) return { ok: false, reason: 'invalid_type', at: k };
      if (typeof v === 'string' && v.length > 120) return { ok: false, reason: 'invalid_value', at: k };
    }
  }
  return { ok: true, action: Object.freeze({ id, kind: a.kind, page: a.page ?? null, panel: a.panel ?? null, focus: a.focus ?? null, params: Object.freeze({ ...params }) }) };
}

/**
 * A KÉRDÉS-SZAVAK, AMIK SEMMIT NEM SZŰKÍTENEK (R89 saját lelet). A „hogyan", „miért", „hol" és a
 * hasonló kérdő-szavak MINDEN útmutatóban előfordulnak, ezért pontszámot adva a TALÁLATI SORRENDET
 * rontják: az első mérésemben a „Hogyan hívhatok meg valakit?" kérdésre a JELSZÓ-változtatás
 * útmutatója is előkerült, mert annak a gyakori kérdése is „Hogyan"-nal kezdődött. A lista
 * nyelvenként bővíthető; a mérés kiírja, ha egy kérdésnek MINDEN szava kiesett.
 */
export const STOPWORDS = Object.freeze([
  'hogyan', 'miert', 'mit', 'hol', 'mikor', 'lehet', 'kell', 'tudok', 'tudom', 'nem', 'igen',
  'meg', 'egy', 'van', 'nincs', 'ezt', 'azt', 'hogy', 'itt', 'ott', 'mar', 'csak', 'valami',
  'milyen', 'lesz', 'adok', 'latom', 'hozza',
  'how', 'why', 'what', 'where', 'when', 'can', 'cannot', 'does', 'the', 'and', 'for', 'this',
  'that', 'with', 'from', 'was', 'somebody', 'anybody',
  'wie', 'warum', 'wann', 'kann', 'nicht', 'der', 'die', 'das', 'und', 'fur', 'ich', 'sie', 'sehe',
]);

/** A szó-darabok egy kérdésből — ékezet-érzéketlen, 3 karakternél rövidebbet és stopszót nem veszünk. */
export function tokensOf(text, { keepStopwords = false } = {}) {
  const norm = lower(text).normalize('NFD').replace(DIACRITICS, '');
  const all = [...new Set(norm.split(/[^a-z0-9]+/).filter((w) => w.length >= 3))];
  return keepStopwords ? all : all.filter((w) => !STOPWORDS.includes(w));
}

/**
 * A RAGOZÁS ÉS AZ ÖSSZETÉTEL MIATT A SZÓ SZERINTI EGYEZÉS KEVÉS — MÉRVE (R89 saját lelet).
 *
 * A magyar RAGOZ, a német ÖSSZETESZ. A saját első mérésem ezért nulla találatot adott a teljesen
 * szabályos kérdésekre: „a **készletadatokat**" ≠ `keszlet` · „egy **vállalkozást**" ≠ `vallalkozas`
 * · „**Jelszót** szeretnék" ≠ `jelszo` · „die **Bestandsdaten**" ≠ `bestand`. A tudás megvolt, az ÚT
 * nem — pontosan a KUKA-011 alakja a keresőn.
 *
 * A MAI SZABÁLY: két szó találat, ha az egyik a másik ELŐTAGJA, és a rövidebb legalább 4 karakter.
 * Ez elkapja a ragot és az összetétel elejét, de nem mos össze rövid, hasonló szavakat.
 *
 * AMIT EZ NEM: nem tövező és nem szemantikus kereső — kimondva. A visszamaradó eseteket a
 * nyelvcsomag `SEARCH` kulcsszó-sora fedi, és a `verify:tutor` MÉRI, hogy a nevezett kérdés-készlet
 * minden bekapcsolt nyelven talál (a nulla találat ott nem „nincs eset", hanem HIBA — KUKA-093).
 */
export const STEM_MIN = 4;
export function wordHit(word, hay) {
  for (const h of hay) {
    if (h === word) return true;
    const short = h.length <= word.length ? h : word;
    const long = h.length <= word.length ? word : h;
    if (short.length >= STEM_MIN && long.startsWith(short)) return true;
  }
  return false;
}

/**
 * CÉLZOTT TUDÁS-KIVÁLASZTÁS (R89 §3: „Nem egy folyamatosan növekvő, minden kérdéshez teljesen
 * betöltött kézikönyv. Modulonként külön, célzottan lekérhető tartalom kell.").
 *
 * A pontszám a MEGLÉVŐ szövegből jön (cím · mire való · gyakori kérdések), és a válasz VÉGES: `top`
 * funkció, `knowledge_chars` felső korláttal. A levágást KIMONDJUK (`truncated`) — a néma
 * csonkolás „mindent lefedtem"-nek látszana (a terv „No silent caps" elve).
 */
export function selectKnowledge({ question, dictionary, ctx = {}, top = LIMITS.knowledge_features }) {
  const words = tokensOf(question);
  const visible = visibleFeaturesFor(ctx).filter((r) => r.visible);
  const KB = (dictionary && dictionary.KB) || {};
  const FAQ = (dictionary && dictionary.FAQ) || {};
  const SEARCH = (dictionary && dictionary.SEARCH) || {};
  const scored = [];
  for (const { feature } of visible) {
    const text = KB[feature.id] || {};
    const faqText = (feature.faq || []).map((id) => { const e = FAQ[id] || {}; return `${e.q || ''} ${e.a || ''}`; }).join(' ');
    const hay = tokensOf(`${feature.id} ${text.purpose || ''} ${text.prereq || ''} ${text.result || ''} ${faqText}`);
    // A KULCSSZÓ-SOR ÉS A CÍM TÖBBET SZÁMÍT, mint a leírás testében talált szó: a felhasználó a
    // funkció NEVÉRE és a saját szavaira kérdez rá (`SEARCH`, a nyelvcsomagból).
    const keys = tokensOf(SEARCH[feature.id] || '');
    const title = tokensOf(text.title || '');
    let score = 0;
    for (const w of words) {
      if (wordHit(w, title)) score += 4;
      else if (wordHit(w, keys)) score += 3;
      else if (wordHit(w, hay)) score += 1;
    }
    // A MINIMUM PONTSZÁM: egyetlen, a leírás testében elkapott szó nem találat. A néma, gyenge
    // találat rosszabb, mint a kimondott „nincs ellenőrzött útmutató" (KUKA-050).
    if (score >= MIN_SCORE) scored.push({ feature, score });
  }
  scored.sort((a, b) => (b.score - a.score) || a.feature.id.localeCompare(b.feature.id));
  const picked = []; let chars = 0; let truncated = false;
  for (const { feature, score } of scored) {
    if (picked.length >= top) { truncated = true; break; }
    const text = KB[feature.id] || {};
    const size = JSON.stringify(text).length;
    if (chars + size > LIMITS.knowledge_chars) { truncated = true; break; }
    chars += size;
    picked.push({ id: feature.id, version: feature.version, status: feature.status, score, action: feature.action, tour: feature.tour, ai: feature.ai, text });
  }
  // A GYAKORI KÉRDÉSEK külön találati listája — modellhívás NÉLKÜL is ez a helyi keresés eredménye.
  const faqHits = [];
  for (const [id, e] of Object.entries(FAQ)) {
    const inQuestion = tokensOf(e.q || '');
    const hay = tokensOf(e.a || '');
    let score = 0;
    for (const w of words) { if (wordHit(w, inQuestion)) score += 3; else if (wordHit(w, hay)) score += 1; }
    if (score >= MIN_SCORE) faqHits.push({ id, score, q: e.q, a: e.a });
  }
  faqHits.sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id));
  return {
    features: picked,
    faq: faqHits.slice(0, LIMITS.faq_hits),
    faq_population: Object.keys(FAQ).length,
    feature_population: visible.length,
    truncated,
    chars,
  };
}

/**
 * A HELYI VÁLASZ — MODELLHÍVÁS NÉLKÜL („Keresés az útmutatókban", R89 §6).
 *
 * Ez NEM AI-válasz, és a mondata sem állítja azt. Amit ad: a legjobban illeszkedő útmutató
 * mondatai, a FORRÁSA (funkció + verzió), és — ha van — engedélyezett folytatás. Ha nincs találat,
 * azt KIMONDJA (`assistant_no_knowledge`), nem talál ki választ (KUKA-050).
 */
export function localAnswer({ selection, dictionary, ctx = {} }) {
  const HELPT = (dictionary && dictionary.HELP) || {};
  const CHATT = (dictionary && dictionary.CHAT) || {};
  if (!selection || (!selection.features.length && !selection.faq.length)) {
    return { ok: false, reason: 'assistant_no_knowledge', kind: 'local', sources: [], actions: [] };
  }
  const parts = [];
  const sources = [];
  const actions = [];
  for (const f of selection.features) {
    const t = f.text || {};
    if (t.purpose) parts.push(t.purpose);
    if (t.prereq && t.prereq !== '—') parts.push(`${HELPT.prerequisites || ''}: ${t.prereq}`);
    sources.push({ feature: f.id, version: f.version, status: f.status, title: t.title || f.id });
    // AZ ÁLLAPOT KIMONDVA: a bemutató mintaadat, a TERVEZETT pedig NEM létező szolgáltatás — tervet
    // kész szolgáltatásként nem tanítunk (R89 §3).
    if (f.status === 'demo' && HELPT.statusDemoNote) parts.push(HELPT.statusDemoNote);
    if (f.status === 'planned' && HELPT.statusPlannedNote) parts.push(HELPT.statusPlannedNote);
    // A FUNKCIÓ SAJÁT AI-SZERZŐDÉSE DÖNT (R89 §6: minden funkciónál magyarázat/megnyitás/előkészítés
    // VAGY indokolt „nincs AI-művelet"). A korábbi alakom ezt ÁTLÉPTE: a jelszó-változtatás
    // (`open: false`) mellé is odatette a „Belépés és biztonság" gombot — a szerződés a
    // REGISZTERBEN élt, a KÓDBAN nem (KUKA-038).
    const ai = f.ai || {};
    const prepareAction = String(f.action || '').startsWith('prepare.');
    const mayPrepare = ai.prepare === true && prepareAction;
    const mayOpen = ai.open === true && !prepareAction;
    if (f.action && (mayPrepare || mayOpen)) {
      const acc = acceptAction(f.action, ctx);
      if (acc.ok) actions.push({ ...acc.action, label: (mayPrepare ? CHATT.prepareAction : CHATT.openAction) || 'open', feature: f.id });
    }
    if (f.tour && ai.explain === true) actions.push({ id: null, kind: 'tour', tour: f.tour, label: HELPT.startTour || 'tour', feature: f.id });
  }
  for (const hit of selection.faq.slice(0, 2)) { parts.push(hit.a); sources.push({ faq: hit.id }); }
  let answer = parts.join(' ');
  let truncated = false;
  if (answer.length > LIMITS.answer_chars) { answer = `${answer.slice(0, LIMITS.answer_chars)}…`; truncated = true; }
  return { ok: true, kind: 'local', answer, sources, actions, truncated };
}

/** A bemutatók, amiket a kérő EL IS TUD indítani — a szerepkör-kötés a `TOURS` bejegyzésből jön. */
export function allowedToursFor(ctx = {}) {
  return Object.freeze(Object.values(TOURS)
    .filter((t) => !(t.requires_role === 'admin' && ctx.role !== 'admin'))
    .map((t) => t.id));
}

export const AST_CONTRACT = Object.freeze({
  id: 'AST-01',
  owns: 'kinek adható ki mely funkció tudása · a célzott kiválasztás · a nyitható műveletek zárt '
    + 'listája · a véges korlátok · az utasításnak álcázott tartalom kezelése',
  does_not_own: 'a jogosultság (a mag dönti el) · a szolgáltatói hívás (AST-02) · a mérés (AST-03)',
  order_rule: 'a jog- és állapot-ellenőrzés a tudás KIVÁLASZTÁSA ELŐTT fut, nem utána szűr',
  protection: 'a védelem a ZÁRT művelet-lista és a `writes: false`, NEM a minta-felismerés',
  never_writes: 'egyetlen nyitható művelet sem ír; a mentést a felhasználó végzi a rendes űrlapon',
  limits: LIMITS,
});
