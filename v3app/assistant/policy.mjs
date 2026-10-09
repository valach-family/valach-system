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
import { FEATURES, ACTIONS, ACTION_PARAMS, TOURS, PERSONAL_SCREENS, actorSwitchSteps }
  from '../knowledge/features.mjs';

/** A VÉGES KORLÁTOK — külön szám minden tengelyre (R89 §6 „Költség és adatkezelés"). */
export const LIMITS = Object.freeze({
  question_chars: 500,
  knowledge_features: 3,
  knowledge_chars: 4000,
  history_turns: 6,
  answer_chars: 1200,
  model_calls_per_question: 1,
  faq_hits: 5,
  // A BLOKK-VÁLASZ KORLÁTJA (AST-05, F93-03): a modell legfeljebb ennyi ellenőrzött
  // tudás-blokkot válogathat össze — a hosszú, sok forrású válasz nem segítség, hanem kivonat.
  answer_blocks: 4,
  /**
   * A KORLÁTOS CAPABILITY-INDEX (AST-06, R142 §6): hány ELÉRHETŐ képesség FEJLÉCE mehet át a
   * modellnek, ha a helyi keresés nem talált. Fejléc = azonosító · cím · állapot · verzió — a
   * TÖRZS nem. Így a modell tudja, MIRŐL lehet kérdezni, anélkül hogy a teljes kézikönyvet
   * elküldenénk minden kérdéshez (a terv kikötése szó szerint). A megjelenő szöveget a szerver
   * állítja össze a SAJÁT nyelvcsomagjából — az index csak a VÁLASZTÁST teszi lehetővé.
   */
  knowledge_index: 40,
});

/** A TALÁLAT MINIMUMA — egyetlen, a leírás testében elkapott szó nem találat (lásd `selectKnowledge`). */
export const MIN_SCORE = 3;

/**
 * AZOK A KIZÁRÁSI OKOK, AMIKET A SEGÉD KIMONDHAT (AST-09). Mindegyikre igaz, hogy a tudás-index
 * végpontja ugyanennek a kérőnek MÁR MA is megmondja — tehát a chat nem fed fel újat. A `retired`
 * SZÁNDÉKOSAN nincs itt: annak saját útja van (`replaced_by`), és nem jog-kérdés.
 */
export const BLOCK_REASONS_TOLD = Object.freeze([
  'admin_required', 'not_a_member', 'workspace_required', 'personal_space', 'login_required',
]);

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
  /**
   * A SZEMÉLYES TÉRBEN NINCS FIÓK-KEZELÉS — DE A MEGHÍVÁS ELFOGADÁSA NEM FIÓK-KEZELÉS (P109-01, R109).
   *
   * A LELET (a saját böngészős mérésem, R109): a tiltás a `group === 'invite'` egész csoportjára
   * szólt, ezért a SZEMÉLYES térben álló, épp MEGHÍVOTT embertől elrejtette az `invite.accept`
   * tudását és GYIK-jét is — vagyis pont attól, akinek szól. A meghívott ember MINDIG a személyes
   * teréből indul: nincs még tagsága abban a vállalkozásban, amibe hívták.
   *
   * A tiltás CÉLJA a KEZELŐI oldal elrejtése (mást meghívni · tagok · előfizetés) — nem a saját
   * meghívásom elfogadása. Ezért a kivétel NEVEZETT és a funkción áll (`personal_space_ok`), nem egy
   * itteni külön névsoron: a szabály egy helyen marad, a kivételt a funkció MONDJA KI (KUKA-051).
   */
  /**
   * A LAP NEVE EGY FELOLDÓBÓL (R164 review, Codex, P2 — `KUKA-390` · `D-VS-3198`).
   *
   * A LELET: a regiszter KÉT néven hívja ugyanazt — a FUNKCIÓK `screen`-t, a BEMUTATÓK `page`-et
   * deklarálnak —, ez a szűrő pedig csak a `page`-et olvasta. Az R164/3-ban szállított három ÚJ,
   * `scope: 'book'` funkció `screen`-t deklarál és `group: 'shell'`-t, tehát MINDKÉT régi listából
   * kimaradt: a személyes térben is felkínáltuk a bemutatójukat, pedig a személyes menüben a lapjuk
   * NINCS BENNE. A felhasználó így vagy egy nem létező lapra navigált, vagy a bemutató azonnal
   * `targetMissing`-gel megállt.
   *
   * A VÁLASZ KÉT RÉSZBŐL ÁLL, és a második az, ami az OSZTÁLYT zárja:
   *   1. a lap neve EGY feloldóból jön (`screen` VAGY `page`) — a két mezőnév egy fogalom;
   *   2. a szabály nem egy kézi tiltó-névsor, hanem a TÉNYLEGES menü: ami a személyes tér lapjai
   *      között NINCS, az a személyes térben NEM elérhető. Így egy NEGYEDIK ilyen funkció is
   *      magától helyesen viselkedik — nem kell hozzá a névsort bővíteni (KUKA-045).
   * A régi tiltó-névsor BENT MARAD: szűkebb, de igaz, és a `personal_space_ok` kivételt továbbra is
   * ő hordozza (KUKA-091: az őrt nem lazítjuk, csak bővítjük).
   */
  const lapja = item.screen ?? item.page ?? null;
  const idegenLap = typeof lapja === 'string' && lapja !== '' && !PERSONAL_SCREENS.includes(lapja);
  const personalBlocked = (['invite', 'members', 'plan'].includes(item.group || '')
    || ['members', 'plan', 'account'].includes(item.page || '')
    || idegenLap)
    && item.personal_space_ok !== true;
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
/**
 * A FOLYTATÁSNÁL TOLERÁLT LÁTHATÓSÁGI OKOK — ZÁRT LISTA, NEM „minden más is jó" (R176 §1).
 *
 * MÉRVE, a két szereplős történeten: a meghívott nézetében a funkció sora KÉT okból zárhat, és
 * MINDKETTŐ pontosan az az átmeneti állapot, amit a FUTÓ történet épp megváltoztat:
 *   · `admin_required`  — a meghívott nem fiókkezelő; a történet következő lépése AZ ÖVÉ, nem adminé;
 *   · `personal_space`  — az elfogadás után a kiszolgáló a SZEMÉLYES körbe léptet be, és a történet
 *                         soron következő lépése épp a CÉG fiókjára váltás (`account-switcher`).
 *
 * MINDEN MÁS OK ZÁR: terv, adatkör, kivezetett funkció, nem létező sor. Ezért zárt lista, és ezért
 * NEM `folytatas ? true : …` — a tolerálás a MÉRT két állapotra szól, nem a kapu kikapcsolására
 * (`KUKA-091`: a javítás iránya nem az őr lazítása).
 */
/**
 * A TÖRTÉNET INDULÓ ADATÁNAK ZÁRT KÉSZLETE (R176 §1). Egy új érték = egy új, MÉRT tény a
 * kiszolgálóban — a kapu addig zárva (KUKA-236: a zárt lista a MEZŐKRE is érvényes).
 */
export const TOUR_STORY_DATA = Object.freeze(['pending_invite', 'other_member', 'own_personal_book']);

const RESUME_TOLERALT_OK = Object.freeze(['admin_required', 'personal_space']);

/**
 * A BEMUTATÓ-KAPUK EGY OTTHONBAN (R176 §1 · `KUKA-003`).
 *
 * MIÉRT VAN EZ A FELOLDÓ. Két fogyasztó kérdezi ugyanazt a kapu-láncot, és CSAK EGY feltételben
 * térnek el: az INDÍTÁS (`allowedToursFor`) a szerepet is kéri, a VÁLTÁS UTÁNI VISSZAÁLLÁS
 * (`resumableToursFor`) nem. Ha a lánc két példányban állna, a következő kapu az egyikből
 * kimaradna — pontosan az a hiba-osztály, amit a `KUKA-003` nevez meg.
 *
 * @param opts.folytatas a FOLYTATÁS kapuja: a szerep- és az INDULÓ ADAT-kapu tolerálása
 *        (CSAK a folytatáshoz — lásd `resumableToursFor`; a zárt lista ettől sem lazul)
 */
function tourGateOpen(t, ctx, visible, { folytatas = false } = {}) {
  if (!folytatas && t.requires_role === 'admin' && ctx.role !== 'admin') return false;
    // A BELÉPÉS ELŐTTI KÉPERNYŐN futó bemutató (regisztráció) belépve NEM indítható: a célja ott
    // nincs a lapon. Ez NEVEZETT kizárás, nem `targetMissing`-gel megszakadó bemutató (F91-01).
    if (t.requires_anonymous === true && ctx.signed_in) return false;
    // A MEGHÍVÁS-KONTEXTUSHOZ KÖTÖTT BEMUTATÓ (P109-01, R109): a meghívó-képernyő CSAK érvényes
    // meghívó-hivatkozásból nyílik meg, ezért meghívás nélkül a bemutató célja NEM LÉTEZIK. Ezt
    // NEVEZETT kizárással zárjuk ki — nem `targetMissing`-gel megszakadó bemutatóval (F91-01) —, és
    // a kontextust a SZERVER mondja meg (`resumeIntent`), nem a böngésző feltevése. A súgó
    // főoldaláról így nem kínálódik fel, mesterséges meghívót pedig nem gyártunk hozzá.
    if (t.requires_invite === true && ctx.invite_context !== true) return false;
    // A KÉT ÉLŐ MUNKAMENETET IGÉNYLŐ BEMUTATÓ (R140 — ACT-01). Egy teljes történet, ami ÁTÍVEL a
    // szereplőkön (a fiókkezelő visszavon, a meghívott elfogad), CSAK ott járható végig, ahol
    // mindkét ember munkamenete elérhető — ez az elkülönített bemutató. Éles üzemben a meghívott a
    // SAJÁT eszközén lép be, tehát nincs és nem is lenne értelme „váltás a másik nézetére"
    // vezérlőnek. Amit nem lehet végigvinni, azt nem kínáljuk fel (KUKA-041 · F91-01): NEVEZETT
    // kizárás, nem `targetMissing`-gel megszakadó bemutató. A funkció leírása, súgója és GYIK-je
    // éles üzemben is a helyén marad — csak a VÉGIGVEZETÉS nem indítható.
    if (t.requires_demo === true && ctx.demo !== true) return false;
    /**
     * A FEJLESZTŐI LEVÉL-FOGADÓHOZ KÖTÖTT ÚTMUTATÓ (R166, külső review, Codex, P2).
     *
     * A megerősítés és a Próbaüzenetek útmutatója a levél-fogadóra áll, ami a `devSurface` kapcsoló
     * mögött él: telepített környezetben a `/dev/mailbox` 404, a cél nem létezik, és az útmutató
     * NEVEZETTEN megszakadt volna. NEVEZETT kizárás, nem `targetMissing`-gel megszakadó útmutató
     * (F91-01 · KUKA-391: amit nem lehet végigvinni, azt nem kínáljuk fel).
     */
    if (t.requires_dev_mailbox === true && ctx.dev_mailbox !== true) return false;
    /**
     * AZ ENGEDÉLYHEZ KÖTÖTT KÉSZLET-NÉZETEK (R166, külső review, Codex, P2).
     *
     * A tagság NEM jog: a készlet-karton és a mozgások TÁBLÁJA csak kiadott `keszlet` adatkörrel
     * rajzol. A felkínálás ezért UGYANAZON az ÉLŐ döntésen áll, mint a lap (`stock_access`), nem a
     * tagságon és nem az útmutató bevezető szövegén — egy felirat nem kapu (KUKA-221).
     */
    if (t.requires_stock_access === true && ctx.stock_access !== true) return false;
    // A MINTAADATHOZ KÖTÖTT TÁBLA-ÚTMUTATÓ csak ott, ahol a bemutató-minta tényleg ki van osztva
    // (KUKA-413): minta nélkül a lap az ÜRES ÁLLAPOTOT rajzolja, és a lépés célja SOHA nem jön létre.
    if (t.requires_demo_fixture === true && ctx.demo_fixture !== true) return false;
    /**
     * …ÉS A TÖRTÉNET INDULÓ ADATA IS ELŐFELTÉTEL (R176 §1 — SAJÁT LELET, a KÖTELEZŐ KAPU mérte).
     *
     * A LELET. Az R176 §1-ben a szereplő-váltó vezérlőt a VALÓDI héjra horgonyoztam (a kijelentkezés
     * az, amivel a néző a másik szereplőre vált) — ettől a két átívelő történet a héjban is
     * felkínálódott. A kötelező kapu MÉRTE a következményt: egy MINTAADAT NÉLKÜLI vállalkozásban a
     * `tour.inviteRevoke` a 4. lépésen (`invites-table`: nincs FÜGGŐ meghívás), a `tour.reentry` a
     * 2.-on (`members-list`: nincs MÁSIK tag) megszakadt. A vezérlő tehát KEVÉS: a történet INDULÓ
     * ADATA is kell hozzá — amit nem lehet végigvinni, azt nem kínáljuk fel (KUKA-391 · KUKA-413).
     *
     * A KÉSZLET ZÁRT, és nyilatkozat nélkül ZÁRVA (fail-closed): egy kitalált mezőnév nem esik
     * némán „igaz"-ra, és a tényt a KISZOLGÁLÓ méri a tárból, nem a tagságból (KUKA-236 · KUKA-238).
     */
    if (t.requires_story_data !== undefined && t.requires_story_data !== null) {
      // A ZÁRT LISTA A FOLYTATÁSNÁL SEM LAZUL: a kitalált mezőnév NEM esik némán „igaz"-ra.
      if (!TOUR_STORY_DATA.includes(t.requires_story_data)) return false;
      /**
       * A FOLYTATÁS VISZONT NEM KÉRI EL AZ INDULÓ ADATOT (R176 §1 — MÉRVE, ugyanabban a körben).
       *
       * AMI MÁR ELINDULT, ANNAK AZ INDULÓ FELTÉTELE MÁR NEM FELTÉTEL — és itt ez nem elvi finomság:
       * a visszavonás története KÖZBEN váltják be a függő meghívást, a visszatérés története KÖZBEN
       * szűnik meg a tagság, a meghívott pedig a SAJÁT személyes körében áll, ahol egyik tény sem
       * igaz. Ha az indítás feltételét minden lépésnél újra megkérdeznénk, a futó történet a saját
       * haladásától esne el — pontosan az a folytatásvesztés, amit az R176 §1 javítani kért.
       * Ugyanaz a szellem, mint a szerep-kapunál: a történet ÁTÍVEL a szereplőkön és az állapotokon.
       */
      if (!folytatas && (!ctx.story_data || ctx.story_data[t.requires_story_data] !== true)) return false;
    }
    /**
     * …ÉS A VEZÉRLŐ IS KELL HOZZÁ, NEM CSAK A KÖRNYEZET (R164/3 — a külső review lelete).
     *
     * A fenti `requires_demo` kapu a KISZOLGÁLÓ környezetét kérdezi. Az viszont nem mondja meg, hogy
     * a BETÖLTÖTT FELÜLETEN van-e „váltás a másik nézetére" vezérlő: bemutató-környezetben futó
     * VALÓDI alkalmazás-héjban nincs, tehát a bemutató ott felkínálódott, és a hatodik lépésén
     * NEVEZETTEN megszakadt — a felkínálás maga volt a hibás állítás (KUKA-227: a határ zöldje nem a
     * felület zöldje). Mostantól a felület MONDJA MEG, milyen horgonyokat ad (`surface_anchors`), és
     * a kapu a lépés SAJÁT `target`-jét kéri tőle. Nyilatkozat nélkül ZÁRVA (fail-closed): aki nem
     * mond semmit a felületéről, annak nem kínálunk végig nem vihető bemutatót.
     */
    const valtoLepesek = actorSwitchSteps(t);
    if (valtoLepesek.length > 0) {
      const ad = ctx.surface_anchors;
      const horgonyok = ad instanceof Set ? ad : (Array.isArray(ad) ? new Set(ad) : null);
      if (!horgonyok || !valtoLepesek.every((s) => horgonyok.has(s.target))) return false;
    }
    // A BEMUTATÓ SAJÁT KÖZÖNSÉGE. Nem a funkcióé: a nyelvváltás ELMAGYARÁZHATÓ belépés előtt is
    // (a funkció `public`), de a bemutatója az alkalmazás-héjban jár, tehát belépés kell hozzá.
    if (!availabilityOf({ audience: t.audience || 'signed_in', scope: 'person' }, ctx).visible) return false;
    const f = FEATURES.find((x) => x.id === t.feature);
    if (f) {
      const row = visible.find((r) => r.feature.id === f.id);
      /**
       * A FUNKCIÓ-SOR IS SZEREP-KÉRDÉST TEHET FEL (R176 §1 — MÉRVE).
       *
       * A `tour.inviteRevoke` funkciója (`invite.revoke`) és a `tour.reentry`-é (`members.reinvite`)
       * `admin_required`: a meghívott nézetében a SOR sem látszik. Ez UGYANAZ a szerep-kérdés, amit
       * a folytatás szándékosan félretesz — ha itt nem engednénk, a `folytatas` üres ígéret volna
       * (mérve: a szerep-kapu megnyitása után is zárva maradt).
       *
       * ÉS CSAK EZT AZ EGY OKOT FOGADJUK EL: bármely MÁS láthatósági ok (terv, adatkör, kivezetés)
       * továbbra is ZÁR. A szerep-kérdést a LÉPÉSEK saját `role` őre érvényesíti futás közben
       * (`rightLost`), tehát a folytatás nem ad jogot, csak lépés-listát (`KUKA-047`: a kapu ott
       * álljon, ahol a kár keletkezik).
       */
      const atmeneti = folytatas && row && row.visible === false && RESUME_TOLERALT_OK.includes(row.why);
      if ((!row || !row.visible) && !atmeneti) return false;
    }
  return true;
}

/** AZ INDÍTHATÓ bemutatók — a teljes kapu-lánccal, a szerep-kapuval együtt. */
export function allowedToursFor(ctx = {}) {
  const visible = visibleFeaturesFor(ctx);
  const out = [];
  for (const t of Object.values(TOURS)) if (tourGateOpen(t, ctx, visible)) out.push(t.id);
  return Object.freeze(out);
}

/**
 * A VÁLTÁS UTÁN FOLYTATHATÓ bemutatók (R176 §1 — a parancs nevesített hibája: „a meghívó elfogadása
 * utáni folytatásvesztés").
 *
 * A LELET, MÉRVE. A két szereplős történet ÁTÍVEL a szerepeken: a fiókkezelő visszavon, a MEGHÍVOTT
 * elfogad. A meghívott viszont NEM admin, tehát a saját nézetében a kiszolgáló ezt a bemutatót nem
 * kínálja fel — a váltás utáni visszaállás (`resumeTourAfterSwitch`) így nem találta meg a
 * lépés-listát, és a futást NEVEZETTEN elengedte (`notAvailable`). A felhasználó a történet
 * közepén, egy ÉP képernyőn vesztette el a bemutatót, pont a tanulság előtt.
 *
 * A VÁLASZ: a FOLYTATÁS más kérdés, mint az INDÍTÁS. Az indítás joggal kéri a szerepet (a történet
 * a fiókkezelő képernyőjén kezdődik); a már FUTÓ történet másik szereplője viszont épp azért váltott
 * ide, mert a soron következő lépés AZ ÖVÉ. Ezért ez a lista a szerep-kapun KÍVÜL minden kaput
 * megkér — a környezetet, a felület horgonyait, a közönséget és a funkció láthatóságát is.
 *
 * AMIT EZ NEM GYENGÍT, ÉS EZ A LÉNYEG:
 *   · csak a SZEREPLŐ-VÁLTÓ bemutatók kerülnek bele (a definícióból, nem kézi listából — `KUKA-045`);
 *   · a LÉPÉSEK saját `role` őre VÁLTOZATLAN: a meghívott a fiókkezelő lépésein `rightLost`-ot kap,
 *     tehát nem tud admin-műveletet végezni azzal, hogy „folytatja" a bemutatót;
 *   · a lista csak a lépés-LISTÁT adja meg a visszaálláshoz — jogot nem ad, műveletet nem nyit;
 *   · és a kliens ebből NEM indíthat: a súgó az `allowedToursFor`-t kínálja fel, ez a halmaz csak a
 *     KÉZBEN LÉVŐ átadás visszaállításához van.
 */
export function resumableToursFor(ctx = {}) {
  const visible = visibleFeaturesFor(ctx);
  const out = [];
  for (const t of Object.values(TOURS)) {
    if (actorSwitchSteps(t).length === 0) continue;          // csak a szereplő-váltó történetek
    if (tourGateOpen(t, ctx, visible, { folytatas: true })) out.push(t.id);
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
 * AST-05 — A VÁLASZ ELLENŐRZÖTT TUDÁS-BLOKKOKBÓL ÉPÜL (F93-03, a külső ellenőrző fél R93-as kikötése).
 *
 * A LELET, AMIT EZ LEZÁR. Az AST-04 azt mérte, hogy a hivatkozott források LÉTEZNEK és át voltak
 * adva — azt nem, hogy a MONDAT belőlük következik. A külső fél ezt ki is próbálta: a helyes
 * `invite.send@1.2.0` jelölővel és helyes `de` nyelv-deklarációval ellátott, de TARTALMILAG HAMIS
 * mondat („A Vshop már éles számlákat állít ki.") átment a kapun, és igazolt súgóválaszként jelent
 * meg. Egy érvényes azonosító tehát DÍSZÍTÉS volt, nem bizonyíték (KUKA-235).
 *
 * A MAI SZABÁLY — A MODELL VÁLASZT, A SZERVER MOND. A modell nem szöveget ad, hanem KIVÁLASZTJA a
 * hozzá illő, már ellenőrzött és lefordított tudás-blokkokat:
 *   `[[VS-BLOCKS: <funkció>@<verzió>#<szakasz>, faq:<azonosító>]]`  ·  `[[VS-LANG: <nyelv>]]`
 * A szerver mind a négyet MEGMÉRI — elérhetőség · verzió · nyelv · TÉNYLEGES TARTALOM —, és a
 * megjelenő szöveget a NYELVCSOMAGBÓL állítja össze. A modell saját prózája SOHA nem jelenik meg.
 *
 * MIÉRT NEM „minden modellválasz kikapcsolása" (a külső fél külön kikötése): a modell munkája
 * megmarad, és mérhető — ő dönti el, MELYIK blokk válaszol a kérdésre, három nyelven, a
 * ragozás és a kérdés-alak ismeretében. Amit elveszít, az csak a SZABAD FOGALMAZÁS joga.
 *
 * AMIT EZ NEM ÁLLÍT — kimondva: nem LLM-igazsággarancia. Azt garantálja, hogy a megjelenő MONDAT
 * ellenőrzött forrásszöveg, a kért nyelven; azt nem, hogy a kiválasztás mindig a legjobb blokkot
 * hozza. A rossz VÁLOGATÁS így is lehetséges — de az rossz TALÁLAT, nem kitalált tény.
 */
export const BLOCK_MARKERS = Object.freeze({
  blocks: /\[\[VS-BLOCKS:([^\]]*)\]\]/i,
  strip: /\[\[VS-(?:BLOCKS|SOURCES|LANG):[^\]]*\]\]/gi,
});

/** A KIADHATÓ SZAKASZOK — a nyelvcsomag EMBERNEK írt, lektorált mezői. Más mező nem hivatkozható. */
export const ANSWER_SECTIONS = Object.freeze(['purpose', 'prereq', 'result']);

/** Egy blokk-hivatkozás alakja: `funkció@verzió#szakasz` vagy `faq:<azonosító>`. */
function parseBlockRefs(raw) {
  return String(raw || '').split(',').map((x) => x.trim()).filter(Boolean).map((one) => {
    if (/^faq:/i.test(one)) return { kind: 'faq', id: one.slice(4).trim() };
    const hash = one.lastIndexOf('#');
    const head = hash > 0 ? one.slice(0, hash).trim() : one;
    const section = hash > 0 ? one.slice(hash + 1).trim() : null;
    const at = head.lastIndexOf('@');
    return {
      kind: 'kb',
      feature: at > 0 ? head.slice(0, at).trim() : head,
      version: at > 0 ? head.slice(at + 1).trim() : null,
      section,
    };
  });
}

/**
 * A BLOKK-VÁLASZ ÖSSZEÁLLÍTÁSA. A `dictionary` a KÉRT NYELV csomagja — a szöveg ONNAN jön, nem a
 * modelltől. `ok: false` esetén a `reason` NEVEZI meg, mi bukott el, és a lap a helyi választ mutatja.
 */
export function composeBlockAnswer({ text, lang, offered = [], dictionary = null, limits = LIMITS } = {}) {
  const raw = String(text ?? '');
  const mBlocks = BLOCK_MARKERS.blocks.exec(raw);
  const mLang = ANSWER_MARKERS.lang.exec(raw);
  if (!mBlocks) return { ok: false, reason: 'model_no_blocks', answer: null, sources: [], blocks: [] };
  const refs = parseBlockRefs(mBlocks[1]);
  if (!refs.length) return { ok: false, reason: 'model_no_blocks', answer: null, sources: [], blocks: [] };
  // A DEKLARÁLT NYELV itt is szerződés — a kiadott szöveg a KÉRT nyelv csomagjából jön, tehát a
  // téves deklaráció azt jelenti, hogy a modell nem a kért feladatot oldotta meg.
  const declared = mLang ? String(mLang[1]).trim().toLowerCase() : null;
  if (!declared || declared !== String(lang).toLowerCase()) {
    return { ok: false, reason: 'model_wrong_language', answer: null, sources: [], blocks: [], declared_lang: declared };
  }
  if (refs.length > limits.answer_blocks) {
    return { ok: false, reason: 'model_too_many_blocks', answer: null, sources: [], blocks: [], count: refs.length, limit: limits.answer_blocks };
  }
  const KB = (dictionary && dictionary.KB) || {};
  const FAQ = (dictionary && dictionary.FAQ) || {};
  const parts = [];
  const sources = [];
  const used = [];
  for (const r of refs) {
    if (r.kind === 'faq') {
      const e = FAQ[r.id];
      // A GYIK IS CSAK AZ ÁTADOTT HALMAZBÓL: a kiválasztásban szereplő kérdések azonosítói.
      const allowed = (offered.faq || []).some((f) => f.id === r.id);
      if (!e || !allowed) return { ok: false, reason: 'model_unknown_block', answer: null, sources: [], blocks: [], at: `faq:${r.id}` };
      const body = String(e.a || '').trim();
      if (!body) return { ok: false, reason: 'model_empty_block', answer: null, sources: [], blocks: [], at: `faq:${r.id}` };
      parts.push(body);
      sources.push({ faq: r.id });
      used.push(`faq:${r.id}`);
      continue;
    }
    const hit = (offered.features || []).find((o) => o.id === r.feature);
    if (!hit) return { ok: false, reason: 'model_unknown_source', answer: null, sources: [], blocks: [], at: r.feature };
    if (r.version !== String(hit.version)) {
      return { ok: false, reason: 'model_stale_source', answer: null, sources: [], blocks: [], at: r.feature, expected: String(hit.version) };
    }
    if (!r.section || !ANSWER_SECTIONS.includes(r.section)) {
      return { ok: false, reason: 'model_unknown_block', answer: null, sources: [], blocks: [], at: `${r.feature}#${r.section ?? ''}` };
    }
    // A TÉNYLEGES TARTALOM A KÉRT NYELVEN — az üres vagy hiányzó blokk NEM válasz (KUKA-050).
    const body = String((KB[r.feature] || {})[r.section] || '').trim();
    if (!body || body === '—') {
      return { ok: false, reason: 'model_empty_block', answer: null, sources: [], blocks: [], at: `${r.feature}#${r.section}` };
    }
    parts.push(body);
    if (!sources.some((x) => x.feature === hit.id)) {
      sources.push({ feature: hit.id, version: String(hit.version), status: hit.status ?? null, title: hit.title ?? null });
    }
    used.push(`${r.feature}@${r.version}#${r.section}`);
  }
  const answer = parts.join(' ');
  if (!answer) return { ok: false, reason: 'assistant_no_knowledge', answer: null, sources: [], blocks: [] };
  // A HOSSZ IS MÉRT: a kiadott szöveg a forrásból jön, de a sok blokk így is túlnőhet a korláton —
  // és nem csonkolunk bele egy mondatba (ugyanaz a szabály, mint az AST-04-nél).
  if (answer.length > limits.answer_chars) {
    return { ok: false, reason: 'model_too_long', answer: null, sources: [], blocks: used, length: answer.length, limit: limits.answer_chars };
  }
  return { ok: true, reason: null, answer, sources, blocks: used, declared_lang: declared };
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
  // VISZONYSZAVAK (R142/TOK-02, MÉRVE): a „között" minden lista-leírásban előfordul, tehát semmit
  // nem szűkít — viszont PONTOS találatként pontot adott, és ezzel egy téves témát emelt az élre.
  // Ugyanaz a hiba-osztály, amiért ez a lista született (a „Hogyan" a jelszó-útmutatót is behozta).
  'kozott', 'kozul', 'alatt', 'felett', 'mellett', 'szerint',
  'how', 'why', 'what', 'where', 'when', 'can', 'cannot', 'does', 'the', 'and', 'for', 'this',
  'that', 'with', 'from', 'was', 'somebody', 'anybody',
  'wie', 'warum', 'wann', 'kann', 'nicht', 'der', 'die', 'das', 'und', 'fur', 'ich', 'sie', 'sehe',
]);

/**
 * A LATIN ÍRÁSON KÍVÜLI KÉRDÉS NEM „ÜRES KÉRDÉS" (R142 — TOK-01, MÉRVE a külső fél R142-es lapján).
 *
 * A LELET. A régi alak a normalizálás után `[^a-z0-9]`-en vágott, tehát MINDEN latin íráson kívüli
 * karakter elválasztó volt: egy kínai meghívási kérdés **0 szó-darabot** adott, és a kereső üres
 * kérdésként kezelte. Ez önmagában még csak annyit jelentene, hogy a helyi, latin szókincsű kereső
 * nem talál — az viszont a szerverben KAPUVÁ lett: a modellt csak akkor hívtuk meg, ha a HELYI
 * keresés talált legalább egy funkciót. Így az önálló helyi kereső korlátja a MODELL nyelvértésének
 * belépési kapujává vált (a kapu megszüntetése a `server.mjs` dolga — AST-06).
 *
 * AMIT EZ A JAVÍTÁS TESZ: a darabolás írás-független lesz (`\p{L}` · `\p{N}`), tehát a kérdésnek
 * LESZ mérhető tartalma akkor is, ha egy betűje sem latin. A szóhossz-padló írás-érzékeny: a
 * szóközt nem használó írásokban (kínai · japán · koreai) egy-két jel is teljes szó, a latin
 * oldalon viszont MARAD a 3 karakteres padló — hogy a mai, mért viselkedés ne csússzon el.
 *
 * AMIT EZ A JAVÍTÁS NEM TESZ, ÉS EZT KI KELL MONDANI: NEM nyelvértés és NEM tövező. Egy kínai
 * kérdés ettől még nem fog illeszkedni a magyar/angol/német szócikkekre — a szókincs latin. A
 * fordítást a MODELL végzi (R142 §5: „a természetes nyelv, szinonimák, elírások … a külső
 * modell/agent feladata"), és ebbe a modulba SZÁNDÉKOSAN nem építünk nyelvenként bővülő
 * mondatértelmezőt (R142 §1 kikötése · KUKA-169: a „minden nyelv" a FORRÁS oldaláról számol).
 */
const SPACELESS_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u;
export const LATIN_MIN = 3;

/** A szó-darabok egy kérdésből — ékezet-érzéketlen; a hossz-padló írás-érzékeny (TOK-01). */
export function tokensOf(text, { keepStopwords = false } = {}) {
  const norm = lower(text).normalize('NFD').replace(DIACRITICS, '');
  // A SZÓHATÁR MINDEN, AMI NEM BETŰ ÉS NEM SZÁM — írástól függetlenül.
  const raw = norm.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const all = [...new Set(raw.filter((w) => (SPACELESS_SCRIPT.test(w) ? w.length >= 1 : w.length >= LATIN_MIN)))];
  // A STOPSZÓ-LISTA LATIN: a nem latin darabokra nem alkalmazzuk (nem is lenne mit levenni).
  return keepStopwords ? all : all.filter((w) => !STOPWORDS.includes(w));
}

/**
 * A KÉRDÉS ÍRÁSAI — MÉRT TÉNY, nem nyelv-felismerés (TOK-01).
 *
 * A szerver ebből tudja megmondani, hogy a HELYI keresés eleve nem illeszkedhet (a szókincs latin),
 * tehát a nulla találat NEM „nincs ilyen tudás", hanem „ezt a kérdést a helyi kereső nem tudja
 * megfogni" — két külön mondat, két külön teendő (KUKA-093 · KUKA-171: ami megállít, annak neve is
 * legyen). Azt NEM állítjuk, hogy melyik NYELVEN van a kérdés: az írás nem nyelv.
 */
export function scriptsOf(text) {
  const s = String(text ?? '');
  const out = [];
  if (/\p{Script=Latin}/u.test(s)) out.push('latin');
  if (SPACELESS_SCRIPT.test(s)) out.push('spaceless');
  if (/\p{L}/u.test(s) && !/\p{Script=Latin}/u.test(s) && !SPACELESS_SCRIPT.test(s)) out.push('other_non_latin');
  return Object.freeze(out);
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

/**
 * A TALÁLAT FAJTÁJA — ÉS MIÉRT KELL KÜLÖN SZÓ A GYENGE TALÁLATRA (R142 — TOK-02, MÉRVE).
 *
 * A LELET, amit a külső ellenőrző fél az R142-ben megnevezett („téves témaválasztás"), és amit itt
 * KARAKTERRE visszamértem. A „Hogyan keresek a raktárak között?" kérdésre a találati lista első
 * helye az `auth.resend` lett, **CÍM-találattal (+4)**, mert a kérdés `keresek` szava illeszkedett
 * a „Új megerősítő levél **kérése**" cím `kerese` darabjára: ékezet-leszedés után a `kerese` ELŐTAGJA
 * a `keresek`-nek, tehát a TŐ-szabály (`STEM_MIN`) talált. Két teljesen más szótő — „keres" és
 * „kér" —, amit egyetlen karakter-szabály sem tud szétválasztani.
 *
 * ÉS AMIT MÉG MEGMÉRTEM, mert a kézenfekvő javítás NEM javítás: a `PREFIX_MIN` 6→7 emelése ezt a
 * találatot NEM szünteti meg (a TŐ-szabályból jön, nem az előtag-szabályból), viszont ELRONTJA az
 * `einladen` ~ `einladung` igaz esetet (a közös előtagjuk pontosan 6). A küszöb-hangolás tehát
 * egyszerre hatástalan és romboló — a kivezetett minta maga a FELTÉTELEZÉS, hogy egy karakter-
 * szabály eldöntheti a TÉMÁT (KUKA-285).
 *
 * A MAI SZABÁLY: a szabály MEGMARAD kereső-eszköznek, de MEGMONDJA, mire támaszkodik. Az `exact`
 * találat a felhasználó SAJÁT szava; a `stem` és a `prefix` csak hasonlóság. Ha egy funkció
 * pontszáma KIZÁRÓLAG hasonlóságból jön, az `weak` — és a gyenge találatot a válasz nem adhatja ki
 * biztos témaként (R142 §5: „Általános név/kód keresés maradhat adatlekérő eszköz, de nem dönthet
 * szemantikáról"). A témát a MODELL dönti el, és hozzá a szerver AKKOR IS eljut, ha itt nincs vagy
 * csak gyenge a találat (AST-06).
 */
export const HIT_KINDS = Object.freeze(['exact', 'stem', 'prefix']);

/** A találat FAJTÁJA, vagy `null`. A `wordHit` ezt használja — egy feloldó, két hívó (KUKA-039). */
export function wordHitKind(word, hay) {
  let loose = null;
  for (const h of hay) {
    if (h === word) return 'exact';
    const short = h.length <= word.length ? h : word;
    const long = h.length <= word.length ? word : h;
    if (short.length >= STEM_MIN && long.startsWith(short)) { loose = loose || 'stem'; continue; }
    if (short.length >= PREFIX_MIN && commonPrefixLen(h, word) >= PREFIX_MIN) { loose = loose || 'prefix'; }
  }
  return loose;
}

/** A VÁLTOZATLAN, IGAZ/HAMIS alak — a meglévő hívók és próbák ezt használják (KUKA-064). */
export function wordHit(word, hay) { return wordHitKind(word, hay) !== null; }

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
  /**
   * AST-09 — A NEMLEGES VÁLASZ VIGYE A VALÓDI OKOT (R144, SAJÁT LELET a joghiány-próbán).
   *
   * A LELET. A nem admin CÉGES tag a „Hogyan hívok meg valakit?" kérdésre SEMMIT nem kapott:
   * `ok: false`, nulla hosszú válasz. A meghívás ADMIN-művelet, ezért a funkció ki van zárva a
   * látható halmazból — a kérdésre viszont van IGAZ válasz: „Ehhez a művelethez fiókkezelői
   * jogosultság kell." A hallgatás zsákutca (KUKA-201: a nemleges válasz vigye a MŰKÖDŐ
   * folytatást · R142 §8: „miért nem érem el / mi hiányzik").
   *
   * AMIT EZ NEM FED FEL: semmit, amit a rendszer ne mondana el ugyanennek az embernek. A
   * tudás-index végpontja egy KONKRÉT funkcióra MÁR MA is `ok: false` + NEVEZETT okot ad
   * ugyanebben a szerepkörben — tehát a funkció LÉTE és a kizárás OKA nem titok. A szöveg a
   * nyelvcsomag `REASON` csoportjából jön (nincs új kulcs, nincs beégetett felirat).
   */
  const blocked = [];
  for (const row of visibleFeaturesFor(ctx)) {
    if (row.visible) continue;
    if (!BLOCK_REASONS_TOLD.includes(row.why)) continue;
    const text = KB[row.feature.id] || {};
    const keys = tokensOf(SEARCH[row.feature.id] || '');
    const title = tokensOf(text.title || '');
    let sc = 0;
    for (const w of words) { if (wordHit(w, title)) sc += 4; else if (wordHit(w, keys)) sc += 3; }
    if (sc >= MIN_SCORE) blocked.push({ feature: row.feature.id, why: row.why, score: sc });
  }
  blocked.sort((a, b) => (b.score - a.score) || a.feature.localeCompare(b.feature));
  for (const { feature } of visible) {
    const text = KB[feature.id] || {};
    const faqText = (feature.faq || []).map((id) => { const e = FAQ[id] || {}; return `${e.q || ''} ${e.a || ''}`; }).join(' ');
    const hay = tokensOf(`${feature.id} ${text.purpose || ''} ${text.prereq || ''} ${text.result || ''} ${faqText}`);
    // A KULCSSZÓ-SOR ÉS A CÍM TÖBBET SZÁMÍT, mint a leírás testében talált szó: a felhasználó a
    // funkció NEVÉRE és a saját szavaira kérdez rá (`SEARCH`, a nyelvcsomagból).
    const keys = tokensOf(SEARCH[feature.id] || '');
    const title = tokensOf(text.title || '');
    let score = 0;
    // A TALÁLAT ALAPJA IS MÉRT TÉNY (TOK-02): `exact` = a felhasználó SAJÁT szava · `stem`/`prefix`
    // = csak hasonlóság. Ha egy funkció pontszáma kizárólag hasonlóságból jön, a találat GYENGE.
    let exact = 0; let loose = 0;
    for (const w of words) {
      const tK = wordHitKind(w, title); const kK = wordHitKind(w, keys); const hK = wordHitKind(w, hay);
      /**
       * A SÚLYOZÁS VÁLTOZATLAN — ÉS EZ MÉRT DÖNTÉS, NEM TEHETETLENSÉG (TOK-02, R142).
       *
       * Kipróbáltam a kézenfekvő javítást: a CÍMBEN talált HASONLÓSÁG súlyát 4-ről 1-re vinni, mert
       * a téves `kerese`~`keresek` találat a címből jött. MÉRVE ROSSZABB LETT: tizenegy nevezett
       * kérdésből a hibás eset egy helyett HÁROM-ra nőtt. A cím ugyanis rendszerint TARTALMAZZA a
       * kulcs-főnevet, tehát a legitim ragozási találatok is onnan jönnek — „Hol látom a
       * KÉSZLETADATOKAT?" → „KÉSZLETEGYENLEG" és „JELSZÓT szeretnék változtatni" → „JELSZÓ
       * megváltoztatása" mindkettő a cím-hasonlóságon állt, és a gyengítés ELVITTE őket.
       *
       * Amit ebből megtartunk: a súly MARAD, a téves eset okát pedig ott javítjuk, ahol valóban
       * van: a semmit nem szűkítő VISZONYSZÓ kiesik a darabolásnál (lásd `STOPWORDS`), és a
       * TÉMÁT nem a karakter-szabály dönti el, hanem a modell (AST-06). A kipróbált és elvetett
       * alakot KIMONDJUK, hogy a következő kör ne futtassa újra (KUKA-033: a minősítés mérés).
       */
      const k = tK ? { hol: 'title', pont: 4, fajta: tK }
        : kK ? { hol: 'keys', pont: 3, fajta: kK }
          : hK ? { hol: 'hay', pont: 1, fajta: hK } : null;
      if (!k) continue;
      score += k.pont;
      if (k.fajta === 'exact') exact += 1; else loose += 1;
    }
    // A MINIMUM PONTSZÁM: egyetlen, a leírás testében elkapott szó nem találat. A néma, gyenge
    // találat rosszabb, mint a kimondott „nincs ellenőrzött útmutató" (KUKA-050).
    if (score >= MIN_SCORE) scored.push({ feature, score, exact, loose, confidence: exact > 0 ? 'exact' : 'weak' });
  }
  // A RENDEZÉS ELŐBB A TALÁLAT ALAPJÁT NÉZI (TOK-02): a felhasználó SAJÁT szaván álló találat
  // MEGELŐZI a csak hasonlóságon állót, akkor is, ha annak több pontja van. Pontosan ez a mért
  // eset: a `kerese`~`keresek` hasonlóság CÍM-találatként (+4) megelőzte a `raktar`~`raktarak`
  // kulcsszó-találatot (+3) — két más tő, és a hasonlóság nyert (KUKA-285).
  scored.sort((a, b) => (a.confidence === b.confidence ? 0 : a.confidence === 'exact' ? -1 : 1)
    || (b.score - a.score) || a.feature.id.localeCompare(b.feature.id));
  const picked = []; let chars = 0; let truncated = false;
  for (const row of scored) {
    const { feature, score } = row;
    if (picked.length >= top) { truncated = true; break; }
    const text = KB[feature.id] || {};
    const size = JSON.stringify(text).length;
    if (chars + size > LIMITS.knowledge_chars) { truncated = true; break; }
    chars += size;
    picked.push({ id: feature.id, version: feature.version, status: feature.status, score, action: feature.action, tour: feature.tour, ai: feature.ai, text, confidence: row.confidence, exact_words: row.exact });
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
  /**
   * A NULLA TALÁLAT HÁROM KÜLÖN TÉNY (R142 — TOK-01 · KUKA-093 · KUKA-171).
   *
   * A régi válasz csak azt mondta, hogy nincs találat — abból viszont nem derült ki, hogy (a) a
   * kérdésnek nem volt mérhető szó-darabja, (b) volt, de a latin szókincsre nem illeszkedett, mert
   * a kérdés más íráson van, vagy (c) volt és illeszkedhetett volna, de nincs ilyen tudás. A
   * szerver EBBŐL dönti el, kell-e modell-oldali értelmezés (AST-06) — nem a találat-számból.
   */
  const reason = picked.length ? null
    : (!words.length ? 'no_tokens'
      : (scriptsOf(question).some((s) => s !== 'latin') ? 'non_latin_question' : 'no_match'));
  return {
    features: picked,
    faq: faqHits.slice(0, LIMITS.faq_hits),
    // AMI MEGÁLLÍTOTT, ANNAK NEVE IS VAN. `null` = van találat.
    reason,
    tokens: words.length,
    scripts: scriptsOf(question),
    /**
     * A TALÁLAT ERŐSSÉGE EGY SZÓVAL (TOK-02): `exact` = legalább egy találat a felhasználó SAJÁT
     * szaván áll · `weak` = MINDEN találat csak hasonlóság (tő vagy közös előtag) · `none` = nincs
     * találat. A szerver EBBŐL dönti el, kell-e modell-oldali értelmezés — nem a találat-számból.
     */
    confidence: picked.length ? (picked.some((p) => p.confidence === 'exact') ? 'exact' : 'weak') : 'none',
    // A KIZÁRT, de ILLESZKEDŐ funkciók — nevezett okkal, VÉGES számban (AST-09).
    blocked: Object.freeze(blocked.slice(0, 2).map((b) => Object.freeze({ feature: b.feature, why: b.why }))),
    /**
     * A KORLÁTOS CAPABILITY-INDEX (AST-06): a kérőre ELÉRHETŐ képességek FEJLÉCE — azonosító, cím,
     * állapot, verzió. TÖRZS NÉLKÜL. Ez az, amit a modell akkor is megkap, ha a helyi keresés nem
     * talált: tudja, MIRŐL lehet kérdezni, és a hozzá tartozó mondatot a szerver a SAJÁT
     * nyelvcsomagjából állítja össze (AST-05 változatlan). Nem a teljes kézikönyv — fejlécek.
     */
    index: Object.freeze(visible.slice(0, LIMITS.knowledge_index).map(({ feature }) => Object.freeze({
      id: feature.id, version: feature.version, status: feature.status,
      title: (KB[feature.id] || {}).title ?? null,
    }))),
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
/**
 * AST-08 — A FELAJÁNLÁSOK EGY FELOLDÓBÓL, ÉS A MODELL VÁLASZTÁSÁRA IS (R144 — F144-03, MÉRVE).
 *
 * A LELET, AMIT EZ LEZÁR. A külső ellenőrző fél (chatgpt-v3, R144/F144-03) szintetikus providerrel
 * megmérte, és itt karakterre visszamértem: a kínai meghívási kérdésre a szerver
 * `answer_kind: 'model_blocks'`, `sources: ['invite.send']` választ adott — **`actions: []`**.
 * Ugyanarra a funkcióra a magyar parafrázis MEGKAPTA az előkészítő gombot és a bemutatót. Az ok: a
 * gombokat KIZÁRÓLAG a HELYI találatból képeztük (`local.actions`), tehát nulla helyi találatnál
 * nem volt gomb — a modell jogszerűen megtalálta a tudást, a felhasználó mégsem tudott vele mit
 * tenni (KUKA-011 alakja a segéden: amit nem lehet megnyomni, az nincs · KUKA-025: a mentéshez út
 * is kell).
 *
 * A MAI SZABÁLY. A felajánlás-képzés EGY feloldó, és KÉT hívója van: a helyi találat és a modell
 * IGAZOLT forrás-listája. Amit ez a feloldó SOHA nem tesz:
 *   · nem fogad el a modelltől route-ot, művelet-azonosítót vagy űrlap-mezőt — a műveletet a
 *     FUNKCIÓ deklarálja (`FEATURES.action`), a modell csak a FUNKCIÓT választja ki, és azt is
 *     csak az ÁTADOTT, igazolt halmazból (AST-05);
 *   · nem dönt jogról: minden felajánlás az `acceptAction`-on megy át a MAI kontextussal (friss
 *     szerveroldali jogosultság), a bemutató pedig az `allowedToursFor`-on;
 *   · nem ír és nem ment: `writes: false` minden műveletnél, a mentés a felhasználóé.
 *
 * ÉS EGY MÁSODIK, EDDIG NÉMA HIBA UGYANITT: a bemutató-felajánlás eddig NEM ment át az
 * `allowedToursFor` kapun — tehát a segéd olyan bemutatót is felkínálhatott, amit a mai nézetben
 * nem lehet elindítani (`requires_demo` · `requires_invite` · `requires_anonymous`). Most átmegy.
 */
export function offersFor({ rows, dictionary, ctx = {} }) {
  const HELPT = (dictionary && dictionary.HELP) || {};
  const CHATT = (dictionary && dictionary.CHAT) || {};
  const tourOk = allowedToursFor(ctx);
  const out = [];
  const latott = new Set();
  for (const row of rows || []) {
    // A SORBÓL CSAK AZ AZONOSÍTÓ KELL: a szerződést a REGISZTER adja, nem a hívó (és nem a modell).
    const f = FEATURES.find((x) => x.id === (row && (row.id || row.feature)));
    if (!f) continue;
    const ai = f.ai || {};
    const prepareAction = String(f.action || '').startsWith('prepare.');
    const mayPrepare = ai.prepare === true && prepareAction;
    const mayOpen = ai.open === true && !prepareAction;
    if (f.action && (mayPrepare || mayOpen)) {
      const acc = acceptAction(f.action, ctx);
      const kulcs = `a:${f.action}`;
      if (acc.ok && !latott.has(kulcs)) {
        latott.add(kulcs);
        out.push({ ...acc.action, label: (mayPrepare ? CHATT.prepareAction : CHATT.openAction) || 'open', feature: f.id });
      }
    }
    if (f.tour && ai.explain === true && tourOk.includes(f.tour)) {
      const kulcs = `t:${f.tour}`;
      if (!latott.has(kulcs)) {
        latott.add(kulcs);
        out.push({ id: null, kind: 'tour', tour: f.tour, label: HELPT.startTour || 'tour', feature: f.id });
      }
    }
  }
  return out;
}

export function localAnswer({ selection, dictionary, ctx = {} }) {
  const HELPT = (dictionary && dictionary.HELP) || {};
  if (!selection || (!selection.features.length && !selection.faq.length)) {
    return { ok: false, reason: 'assistant_no_knowledge', kind: 'local', sources: [], actions: [] };
  }
  const parts = [];
  const sources = [];
  for (const f of selection.features) {
    const t = f.text || {};
    if (t.purpose) parts.push(t.purpose);
    if (t.prereq && t.prereq !== '—') parts.push(`${HELPT.prerequisites || ''}: ${t.prereq}`);
    sources.push({ feature: f.id, version: f.version, status: f.status, title: t.title || f.id });
    // AZ ÁLLAPOT KIMONDVA: a bemutató mintaadat, a TERVEZETT pedig NEM létező szolgáltatás — tervet
    // kész szolgáltatásként nem tanítunk (R89 §3).
    if (f.status === 'demo' && HELPT.statusDemoNote) parts.push(HELPT.statusDemoNote);
    if (f.status === 'planned' && HELPT.statusPlannedNote) parts.push(HELPT.statusPlannedNote);
  }
  // A FELAJÁNLÁSOK A KÖZÖS FELOLDÓBÓL (AST-08) — ugyanaz a szerződés, mint a modell választásánál.
  const actions = offersFor({ rows: selection.features, dictionary, ctx });
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
  answer_rule: 'a MEGJELENŐ válasz a nyelvcsomag ellenőrzött blokkjaiból áll össze (AST-05 '
    + 'composeBlockAnswer): a modell BLOKKOT VÁLASZT, a szöveget a szerver adja. A modell szabad '
    + 'prózája NEVEZETT, NEM ELFOGADOTT mód (model_prose_unverified) — érvényes azonosító önmagában '
    + 'nem tartalmi bizonyíték (KUKA-235)',
});

/**
 * AST-06 — A HELYI TALÁLAT NEM A MODELL KAPUJA (R142 §6, KIFEJEZETT új tervezői döntés).
 *
 * A LELET, AMIT EZ LEZÁR (a külső ellenőrző fél, chatgpt-v3, R142 §2 — és a kódban visszamérve).
 * A szerver a modellt CSAK akkor hívta meg, ha a HELYI, latin szókincsű kereső talált legalább egy
 * funkciót (`prov.configured && selection.features.length`). Ennek három mért következménye volt:
 *   · a kínai meghívási kérdés 0 szó-darabot adott, tehát a modellt SEM hívtuk meg — pedig épp a
 *     fordítás az, amihez a modell kell (TOK-01);
 *   · az „És ezt hogyan csinálom?" alakú FOLYTATÁS 0 találatot adott, tehát az ELŐZMÉNYT értő
 *     modellhez a kérdés el sem jutott (R142 §2);
 *   · a csak HASONLÓSÁGON álló téves téma (`kerese`~`keresek`) viszont „találatnak" számított, és
 *     ezzel a rossz témát vitte a modell elé (TOK-02).
 * Vagyis egy önálló, karakter-szintű kereső korlátja lett az AI nyelvértésének BELÉPÉSI KAPUJA.
 *
 * A MAI SZABÁLY. A döntés NEM a találat-szám, hanem EZ a feloldó, és a válasza NEVEZETT — hogy a
 * mérés és a felület is látja, MIÉRT hívtuk (vagy miért nem) a modellt (KUKA-171 · KUKA-127).
 * Egyetlen eset marad, ahol nincs mit értelmezni: a kérdésben egyetlen BETŰ sincs, és előzmény sem
 * áll mögötte — ott a modellhívás költség indok nélkül („a puszta FAQ/oldalmegnyitás ne kapjon
 * szükségtelen többlépcsős hívást", R142 §6).
 *
 * AMIT EZ NEM TESZ, KIMONDVA: nem engedi el a VÉGES korlátokat. A hívás-szám, a méret és az
 * idő-keret továbbra is a `LIMITS`-ben áll, és a modell válaszát UGYANÚGY ellenőrzi a szerver
 * (AST-04 · AST-05) — a kapu megnyitása a HOZZÁFÉRÉSRE szól, nem az ellenőrzésre.
 */
export const MODEL_NEED_REASONS = Object.freeze([
  'local_hits',           // van pontos helyi találat — a modell a megfogalmazást/válogatást végzi
  'weak_only',            // CSAK hasonlóság-alapú találat: a témát a modell döntse el (TOK-02)
  'no_match',             // van mérhető szó, de nincs találat — lehet, hogy más szóval kérdezte
  'non_latin_question',   // a kérdés nem latin íráson van: a helyi szókincs eleve nem illeszkedhet
  'no_tokens',            // nincs mérhető szó-darab, de van mit értelmezni (előzmény vagy betű)
  'history_followup',     // előzményre utaló folytatás — a jelentés az előzményben van
  'nothing_to_interpret', // EGYETLEN betű sincs és előzmény sincs: nincs mit értelmezni
]);

export function modelNeed({ selection, historyTurns = 0, question = '' } = {}) {
  const sel = selection || {};
  const betu = /\p{L}/u.test(String(question ?? ''));
  if (!betu && historyTurns === 0) return { call: false, why: 'nothing_to_interpret' };
  if (sel.confidence === 'exact') return { call: true, why: 'local_hits' };
  if (sel.confidence === 'weak') return { call: true, why: 'weak_only' };
  // Nulla találat: a SZŰKÍTŐ ok dönti el a nevet — és az előzmény erősebb magyarázat, mint a
  // „nem találtunk", mert a folytatás jelentése az előzményben van, nem a mai szavakban.
  if (historyTurns > 0 && (sel.reason === 'no_match' || sel.reason === 'no_tokens')) {
    return { call: true, why: 'history_followup' };
  }
  return { call: true, why: sel.reason || 'no_match' };
}

/**
 * AST-07 — A PRÓZA NEVEZETT, MEGJELÖLT MÓD; A TÉNY A VS-HEZ VAN KÖTVE (R142 §6).
 *
 * A LELET ELŐZMÉNYE. Az AST-05 azért zárta ki a modell szabad prózáját, mert egy érvényes
 * forrás-azonosító DÍSZÍTÉS volt, nem bizonyíték (KUKA-235): a helyes jelölőkkel ellátott, de
 * tartalmilag HAMIS mondat igazolt súgóválaszként jelent meg. Ez a tiltás helyes volt, de az R142
 * kimondja, hogy TÚL SZÉLES: „A blokk-összeállítás maradhat helyi/biztos idézeti mód, de nem
 * kizárólagos AI-válaszforma."
 *
 * A MAI SZABÁLY — HÁROM DARAB, SOHA NEM ÖSSZEMOSVA:
 *   1. a TÉNYSZERŰ rész a VS-é: a szöveget a szerver a nyelvcsomagból állítja össze a modell által
 *      hivatkozott, ELÉRHETŐ és egyező verziójú blokkokból (ugyanaz, mint az AST-05);
 *   2. a modell PRÓZÁJA megjelenhet, de KÜLÖN, és KIMONDOTTAN következtetésként jelölve — nem
 *      forrásszövegként;
 *   3. ha a próza alatt NINCS ellenőrzött forrás-rész, a próza nem jelenik meg (a jelölés nem
 *      pótolja a megalapozást).
 *
 * Így a felhasználó LÁTJA, mi ellenőrzött forrásszöveg és mi a segéd következtetése — a kettőt
 * nem a jóindulat választja el, hanem a válasz ALAKJA (KUKA-127: a mérés harmadik szava).
 */
export function groundedAnswer({ facts, prose, labels } = {}) {
  const tenyek = String(facts ?? '').trim();
  const kovetkeztetes = String(prose ?? '').trim();
  if (!tenyek) return { ok: false, reason: 'grounded_without_facts', answer: null };
  if (!kovetkeztetes) return { ok: true, answer: tenyek, has_inference: false };
  const L = labels || {};
  const fejTeny = L.facts ? `${L.facts}: ` : '';
  const fejKov = L.inference ? `${L.inference}: ` : '';
  return { ok: true, answer: `${fejTeny}${tenyek}\n\n${fejKov}${kovetkeztetes}`, has_inference: true };
}

export const AST06_CONTRACT = Object.freeze({
  id: 'AST-06',
  owns: 'annak NEVEZETT eldöntése, kell-e modell-oldali értelmezés — a helyi találat-szám HELYETT',
  never: 'a helyi, karakter-szintű kereső korlátja nem lehet a modell elérésének előfeltétele',
  keeps: 'a VÉGES korlátok és a válasz-ellenőrzés (AST-04 · AST-05) változatlanok',
  index_rule: 'nulla vagy gyenge helyi találatnál a modell a KORLÁTOS capability-indexet kapja '
    + '(azonosító · cím · állapot · verzió), nem a teljes kézikönyvet — a megjelenő mondatot a '
    + 'szerver állítja össze a saját nyelvcsomagjából',
  stated_limit: 'a modell OLVASÓ ESZKÖZÖKKEL végzett, több-lépéses célzott kontextus-kérése (R142 '
    + '§6 harmadik és negyedik pontja) EBBEN a körben NEM épült meg — a kapu megnyitása és a '
    + 'korlátos index igen; a hiány NEVESÍTETT, nem néma',
});
