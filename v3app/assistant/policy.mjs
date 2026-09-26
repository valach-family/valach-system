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
import { FEATURES, ACTIONS, ACTION_PARAMS, TOURS } from '../knowledge/features.mjs';

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
/**
 * EGY KÖZÖS ELÉRHETŐSÉGI FELOLDÓ — a tudás, a GYIK, a bemutató ÉS a művelet UGYANEBBŐL felel (AVL-01).
 *
 * A LELET (a külső ellenőrző fél, chatgpt-v3, R91/F91-05): három külön szabály élt egymás mellett.
 * A funkció-lista a személyt/fiókot/szerepet mérte, a GYIK-kereső MINDEN sort végigjárt (fiók és
 * tagság nélküli kérőnél is előkerült a `faq.invite.who` és a `faq.members.revoke`), a művelet- és
 * bemutató-lista pedig a SAJÁT, hiányos szerep-szűrőjét használta. Ez nem bizonyított
 * üzletiadat-szivárgás — a szövegek általános terméksúgók —, a HIBA a háromféle szerződés
 * (KUKA-003: a több helyen igaz szabály EGY helyen él · KUKA-039: egy feloldó, minden hívó).
 *
 * A KÉT TENGELY KIMONDVA, a deklarációból (nem a kiválasztó találja ki):
 *   · `audience` — `public` = belépés ELŐTT is elmagyarázható (regisztráció · belépés · megerősítés ·
 *     meghívó elfogadása · nyelv · súgó) · `signed_in` = belépés kell hozzá;
 *   · `scope` — `person` = a belépett emberhez tartozik · `book` = HATÁLYOS tagság kell hozzá.
 * A NYILVÁNOS MAGYARÁZAT ÉS A JOGOSAN NYITHATÓ MŰVELET KÉT KÜLÖN ÁLLAPOT: az első a belépés előtt is
 * jár, a második soha (`open_required`) — a régi alak a kettőt összemosta.
 */
export function availabilityOf(item, ctx = {}) {
  if (!item) return { visible: false, why: 'action_unknown' };
  if (item.status === 'retired') return { visible: false, why: 'retired' };
  const audience = item.audience || 'signed_in';
  if (audience !== 'public' && !ctx.signed_in) return { visible: false, why: 'login_required' };
  if ((item.scope || 'person') === 'book' && !(ctx.book_id && ctx.member === true)) {
    return { visible: false, why: ctx.book_id ? 'not_a_member' : 'workspace_required' };
  }
  const needsAdmin = item.requires_role === 'admin'
    || (item.action && ACTIONS[item.action] && ACTIONS[item.action].requires_role === 'admin');
  if (needsAdmin && ctx.role !== 'admin') return { visible: false, why: 'admin_required' };
  const personalBlocked = ['invite', 'members', 'plan'].includes(item.group || '')
    || ['members', 'plan', 'account'].includes(item.page || '');
  if (ctx.personal === true && personalBlocked) return { visible: false, why: 'personal_space' };
  return { visible: true, why: null };
}

/** A NYILVÁNOS (belépés előtt is elmagyarázható) funkciók — a deklarációból, egy helyen. */
export function isPublicFeature(feature) { return Boolean(feature) && feature.audience === 'public' && feature.status !== 'retired'; }

export function visibleFeaturesFor(ctx = {}) {
  const plan = String(ctx.plan || 'starter');
  const out = [];
  for (const f of FEATURES) {
    const a = availabilityOf(f, ctx);
    if (!a.visible) {
      out.push({ feature: f, visible: false, why: a.why, replaced_by: a.why === 'retired' ? (f.replaced_by || null) : undefined });
      continue;
    }
    // AZ ÁRAK KÉT KAPUJA (ENT-02): a csomag ÉS az engedély. A csomag itt mérhető, az ENGEDÉLY a
    // mag döntése — azt NEM találjuk ki, ezért az ár-funkció tudása kiadható, a MONDATA viszont
    // kimondja, hogy két kapu áll előtte.
    if (f.id === 'data.price' && plan !== 'pro') { out.push({ feature: f, visible: true, why: 'plan_limited', note: 'feature_not_in_plan' }); continue; }
    out.push({ feature: f, visible: true, why: null });
  }
  return out;
}

/**
 * A KERESHETŐ GYAKORI KÉRDÉSEK — a ELÉRHETŐ funkciók GYIK-jei, és semmi más (F91-05).
 *
 * A kereső alapsokasága ETTŐL a halmaztól függ, nem a szótár teljes GYIK-táblájától — és az
 * alapsokaságot a válasz KIÍRJA, hogy a szűkebb találati lista ne látszódjon hibának (KUKA-093).
 */
export function searchableFaqIds(ctx = {}) {
  const ids = [];
  for (const { feature, visible } of visibleFeaturesFor(ctx)) {
    if (!visible) continue;
    for (const id of feature.faq || []) if (!ids.includes(id)) ids.push(id);
  }
  return Object.freeze(ids);
}

/**
 * A JELENLEG NYITHATÓ MŰVELETEK — a zárt listából, a KÖZÖS feloldóval (AVL-01).
 *
 * KÉT feltétel, nem egy: (a) a művelet MAGA elérhető a kérőnek (`audience` · `scope` · szerep ·
 * személyes tér), és (b) ha egy vagy több FUNKCIÓ hivatkozik rá, akkor legalább egy hivatkozó
 * funkciónak is elérhetőnek kell lennie — különben a segéd olyan képességhez kínálna belépőt,
 * amiről ugyanő azt mondja, hogy nem érhető el (F91-05).
 */
export function allowedActionsFor(ctx = {}) {
  const allowed = [];
  const visible = visibleFeaturesFor(ctx);
  for (const [id, a] of Object.entries(ACTIONS)) {
    if (a.writes === true) continue;
    if (!availabilityOf({ ...a, action: id }, ctx).visible) continue;
    const refs = FEATURES.filter((f) => f.action === id);
    if (refs.length) {
      const anyVisible = refs.some((f) => (visible.find((r) => r.feature.id === f.id) || {}).visible);
      if (!anyVisible) continue;
    }
    allowed.push(id);
  }
  return Object.freeze(allowed);
}

/**
 * A NYITHATÓ BEMUTATÓK — UGYANEBBŐL a feloldóból, a bemutató FUNKCIÓJÁN keresztül (F91-05).
 *
 * A régi alak csak a `requires_role`-t nézte, tehát fiók nélküli kérőnek is felkínálta a fiókhoz
 * kötött bemutatókat. Mostantól a bemutató annyira elérhető, amennyire a FUNKCIÓJA — plusz a
 * bemutató saját kikötései (szerep · belépés előtti képernyő).
 */
export function allowedToursFor(ctx = {}) {
  const visible = visibleFeaturesFor(ctx);
  const out = [];
  for (const t of Object.values(TOURS)) {
    if (t.requires_role === 'admin' && ctx.role !== 'admin') continue;
    // A BELÉPÉS ELŐTTI KÉPERNYŐN futó bemutató (regisztráció) belépve NEM indítható: a célja ott
    // nincs a lapon. Ez NEVEZETT kizárás, nem `targetMissing`-gel megszakadó bemutató (F91-01).
    if (t.requires_anonymous === true && ctx.signed_in) continue;
    // A BEMUTATÓ SAJÁT KÖZÖNSÉGE. Nem a funkcióé: a nyelvváltás ELMAGYARÁZHATÓ belépés előtt is
    // (a funkció `public`), de a bemutatója az alkalmazás-héjban jár, tehát belépés kell hozzá.
    if (!availabilityOf({ audience: t.audience || 'signed_in', scope: 'person' }, ctx).visible) continue;
    const f = FEATURES.find((x) => x.id === t.feature);
    if (f) { const row = visible.find((r) => r.feature.id === f.id); if (!row || !row.visible) continue; }
    out.push(t.id);
  }
  return Object.freeze(out);
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
  /**
   * A PARAMÉTEREK — ZÁRT MEZŐ-LISTA, NEM TÍPUS-SZABÁLY (F91-05, a külső fél lelete).
   *
   * A régi alak a TÖMBÖT némán átvette (`params:['bad']` → `{0:'bad'}`), és minden kitalált mezőt
   * elfogadott, ha primitív volt. Mostantól: a tömb és minden nem-objektum NEVEZETT elutasítás, és
   * csak az `ACTION_PARAMS`-ban KIMONDOTT mező mehet át (`param_unknown`).
   */
  const raw = proposed && typeof proposed === 'object' ? proposed.params : undefined;
  const params = {};
  if (raw !== undefined && raw !== null) {
    if (typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'invalid_type', at: 'params' };
    const allowedFields = ACTION_PARAMS[id] || [];
    for (const [k, v] of Object.entries(raw)) {
      if (!allowedFields.includes(k)) return { ok: false, reason: 'param_unknown', at: k };
      if (!['string', 'number', 'boolean'].includes(typeof v)) return { ok: false, reason: 'invalid_type', at: k };
      if (typeof v === 'string' && v.length > 120) return { ok: false, reason: 'invalid_value', at: k };
      params[k] = v;
    }
  }
  return { ok: true, action: Object.freeze({ id, kind: a.kind, page: a.page ?? null, panel: a.panel ?? null, focus: a.focus ?? null, params: Object.freeze({ ...params }) }) };
}

/**
 * AST-04 — A SZOLGÁLTATÓI VÁLASZ SZERZŐDÉSE (F91-04, a külső ellenőrző fél R91-es lelete).
 *
 * A LELET, amit ez lezár. A német nyelvű meghívási kérdésre befecskendezett szolgáltatói válasz
 * **„UNSUPPORTED: A Vshop már éles számlákat állít ki."** volt — oda nem tartozó, magyar nyelvű,
 * forrás nélküli állítás. A szerver ezt `ok: true`, `answer_kind: 'model'`, `lang: 'de'` válasszal
 * TOVÁBBADTA, és mellétette a HELYI keresés forrásait (`Benutzer einladen`, `invite.send` 1.2.0,
 * `faq.invite.who`). Azok a forrás-sorok nem támasztották alá az állítást: a lista a helyi
 * keresésből jött, NEM a modell válaszának ellenőrzéséből — vagyis a felület egy IGAZOLTNAK látszó
 * hivatkozás-csokrot tett egy ellenőrizetlen mondat alá (KUKA-066: a hamis adat nem hibának
 * látszik, hanem adatnak · KUKA-127: a mérés harmadik szava).
 *
 * A MAI SZABÁLY. A modellnek gépi jelölőkkel KELL lezárnia a válaszát, és a szerver ezeket
 * ELLENŐRZI a NEKI ÁTADOTT tudáson:
 *   `[[VS-SOURCES: <funkció>@<verzió>, …]]`  ·  `[[VS-LANG: <nyelv>]]`
 * Ami nem teljesíti, az NEM jelenik meg modell-válaszként: a lap a HELYI választ mutatja, és a
 * válasz NEVEZETTEN kimondja, miért esett ki a modell szava. A jelölőket a szerver LEVÁGJA a
 * megjelenített szövegről.
 *
 * AMIT EZ NEM ÁLLÍT — kimondva:
 *   · nem nyelv-FELISMERÉS: a `VS-LANG` a modell SAJÁT DEKLARÁCIÓJA, és azt vetjük össze a kért
 *     nyelvvel; egy hamisan `de`-t deklaráló magyar választ ez a kapu nem fog meg (a tartalmi
 *     nyelvhelyesség mérése nyitott tétel);
 *   · nem tartalmi ellenőrzés: azt mérjük, hogy a hivatkozott források LÉTEZNEK és ÁT VOLTAK ADVA —
 *     azt nem, hogy a mondat logikailag következik belőlük. Érvényes forrásazonosító önmagában sem
 *     tartalmi bizonyíték (a külső fél kikötése, R91/F91-04);
 *   · a védelem NEM a minta-felismerés: a folytatás továbbra is a ZÁRT művelet-listából jön, és
 *     egyetlen művelet sem ír.
 */
export const ANSWER_MARKERS = Object.freeze({
  sources: /\[\[VS-SOURCES:([^\]]*)\]\]/i,
  lang: /\[\[VS-LANG:([^\]]*)\]\]/i,
  strip: /\[\[VS-(?:SOURCES|LANG):[^\]]*\]\]/gi,
});

/** EGY hivatkozás alakja: `funkció@verzió`. A verzió NEM elhagyható — az elavult forrás is lelet. */
function parseCitations(raw) {
  return String(raw || '').split(',').map((s) => s.trim()).filter(Boolean).map((one) => {
    const at = one.lastIndexOf('@');
    return at > 0 ? { feature: one.slice(0, at).trim(), version: one.slice(at + 1).trim() } : { feature: one, version: null };
  });
}

export function verifyModelAnswer({ text, lang, offered = [], limits = LIMITS } = {}) {
  const raw = String(text ?? '');
  if (!raw.trim()) return { ok: false, reason: 'assistant_no_knowledge', answer: null, sources: [], cited: [] };
  const mSrc = ANSWER_MARKERS.sources.exec(raw);
  const mLang = ANSWER_MARKERS.lang.exec(raw);
  const body = raw.replace(ANSWER_MARKERS.strip, '').trim();
  // (1) A JELÖLŐ HIÁNYA: a válasz nem teljesíti a szerződést — a helyi válasz jön.
  if (!mSrc) return { ok: false, reason: 'model_no_source', answer: null, sources: [], cited: [] };
  const cited = parseCitations(mSrc[1]);
  if (!cited.length) return { ok: false, reason: 'model_no_source', answer: null, sources: [], cited: [] };
  // (2) A DEKLARÁLT NYELV — a KÉRT nyelvvel vetjük össze (nem felismerés, hanem deklaráció).
  const declared = mLang ? String(mLang[1]).trim().toLowerCase() : null;
  if (!declared || declared !== String(lang).toLowerCase()) {
    return { ok: false, reason: 'model_wrong_language', answer: null, sources: [], cited, declared_lang: declared };
  }
  // (3) A HIVATKOZÁS CSAK AZ ÁTADOTT TUDÁSRA MUTATHAT — és a verziójának is egyeznie kell.
  const bad = [];
  const good = [];
  for (const c of cited) {
    const hit = offered.find((o) => o.id === c.feature);
    if (!hit) { bad.push({ ...c, why: 'model_unknown_source' }); continue; }
    if (c.version !== String(hit.version)) { bad.push({ ...c, why: 'model_stale_source', expected: String(hit.version) }); continue; }
    good.push({ feature: hit.id, version: String(hit.version), title: hit.title ?? null });
  }
  if (bad.length) return { ok: false, reason: bad[0].why, answer: null, sources: [], cited, bad };
  // (4) A TÚL HOSSZÚ VÁLASZ SEM „félig jó": nem csonkolunk bele egy ellenőrizetlen mondatba.
  if (body.length > limits.answer_chars) {
    return { ok: false, reason: 'model_too_long', answer: null, sources: [], cited, length: body.length, limit: limits.answer_chars };
  }
  if (!body) return { ok: false, reason: 'assistant_no_knowledge', answer: null, sources: [], cited };
  return { ok: true, reason: null, answer: body, sources: good, cited, declared_lang: declared };
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
/**
 * ÉS A RAGOZÁS A SZÓ VÉGÉT IS ÁTÍRJA — MÉRVE (F91-05 nyomán, a saját R91-es mérésem).
 *
 * Az előtag-szabály csak akkor talál, ha az egyik szó a másik ELEJE. A magyarban viszont a rag a
 * tövet is átírja: „regisztrálok" és „regisztráció" KÖZÖS ELEJE hét karakter, de egyik sem előtagja
 * a másiknak — ezért a teljesen szabályos „Hogyan regisztrálok?" kérdés NULLA találatot adott,
 * miközben a regisztráció a NYILVÁNOS tudás első sora. Mostantól a KÖZÖS ELŐTAG hossza is mérce
 * (legalább 6 karakter). AMIT EZ NEM: nem tövező és nem szemantikus kereső — a hat karakter
 * szándékosan szigorú („megvon" / „megvan" közös eleje 4, tehát NEM találat).
 */
export const PREFIX_MIN = 6;
function commonPrefixLen(a, b) { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i += 1; return i; }
export function wordHit(word, hay) {
  for (const h of hay) {
    if (h === word) return true;
    const short = h.length <= word.length ? h : word;
    const long = h.length <= word.length ? word : h;
    if (short.length >= STEM_MIN && long.startsWith(short)) return true;
    if (short.length >= PREFIX_MIN && commonPrefixLen(h, word) >= PREFIX_MIN) return true;
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
  // A KERESHETŐ HALMAZ AZ ELÉRHETŐ FUNKCIÓK GYIK-JE (F91-05) — nem a szótár teljes táblája.
  const searchable = searchableFaqIds(ctx);
  for (const [id, e] of Object.entries(FAQ)) {
    if (!searchable.includes(id)) continue;
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
    // AZ ALAPSOKASÁG KÉT SZÁM: a KERESHETŐ (a kérőre elérhető) és a szótár TELJES táblája — a
    // szűkebb találati lista így nem látszik hibának, és a kizárás mértéke is látható (KUKA-093).
    faq_population: searchable.length,
    faq_population_total: Object.keys(FAQ).length,
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
