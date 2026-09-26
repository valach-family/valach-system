// v3app/public/app.js — A KÖZÖS ALKALMAZÁSKERET (R81).
//
// MI VÁLTOZOTT. A korábbi lap EGY hosszú, számozott próbafelület volt: belépés, regisztráció,
// meghívás, cégalapítás és adat-lekérés egymás alatt, nyers JSON-nal és belső szavakkal. Az R81-es
// terv szerint ezt közös keret váltja: FELÜL fiókválasztó és saját profil, BALRA a V2-ből ismerős
// menü, KÖZÉPEN az éppen végzett feladat, és minden szöveg EGY forrásból (`texts.mjs`). A technikai
// részlet nem tűnik el, csak lenyitható helyre kerül („Technikai részletek").
//
// AMI NEM VÁLTOZOTT — és nem is változhat (R79/R80, UX-15):
//   · KTX-01/02/03: minden kontextusfüggő OLVASÁS és ÍRÁS viszi a nézet ALANYÁT és KÖNYVÉT, a lap
//     pedig CSAK akkor rajzol, ha a válasz ahhoz a nézethez kötött, amelyikben a kérés indult —
//     a szabály EGY helyen él (`contextBinding.mjs`), és a próba UGYANAZT hívja (KUKA-207);
//   · a generáció-őr: a késve érkező válasz nem írhat az új nézetbe (KUKA-041);
//   · a jogosultságot KIZÁRÓLAG a szerver dönti el — itt nincs kliens-oldali jog-mátrix.
import { contextBindingVerdict, unboundMessage } from './contextBinding.mjs';
import { PAGE, NAV_GROUPS, NAV_ADMIN, NAV_PERSONAL, ROLE, SCOPE, SCOPE_ACC, PLAN, QUALITY, STATE, UNBOUND, UI, HELP, TOURUI, CHAT,
  reasonText, whenText, tpl, accountLabel, setLang, currentLang, currentDir, currentEndonym, enabledLanguages,
  dict, decideLang, langStoreKey, LANG_CHOICE_KEY } from './texts.mjs';
import { demoFor, demoSource } from './demoData.mjs';
// A SEGÍTSÉG HÁROM DARABJA — mind TISZTA rajzoló/állapot-modul: lekérést egyik sem indít, azt EGY
// helyen, itt végezzük (KUKA-209: a rajzolás nem kérdez).
import { helpPanelHtml, guidesHtml, faqHtml, sitemapHtml, VIEWS } from './help.mjs';
import { chatHtml, emptyChat } from './chat.mjs';
import * as tourMod from './tour.mjs';

(() => {
  'use strict';
  const byTest = (id) => document.querySelector(`[data-testid="${id}"]`);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const setText = (el, s) => { if (el) el.textContent = s; };
  const show = (el, on) => { if (el) el.hidden = !on; };

  const state = {
    me: null, page: 'overview', tabs: ['overview'], generation: 0, seq: 0,
    ctx: { subject: null, book: null, bookName: null }, noticeSeq: 0, selfInitiated: false, afterCreate: null,
    // A PANELEK TARTALMA ÁLLAPOT, NEM CSAK DOM — és a LEKÉRÉS NÉZETENKÉNT EGYSZER indul magától.
    // MÉRT LELET (R81, a saját böngésző-próbámon): a kötetlen válasz mondata után a lap
    // újrarajzolt, az újrarajzolás pedig ÚJRA kért — 700 ms alatt 33 kérés. A nemleges válasz
    // SOHA nem indíthat frissítési kört (az R79 parancsának kikötése · KUKA-041 · KUKA-121).
    panels: { stock: null, price: null, members: null },
    // A KÉSZLET-JELLEGŰ NÉZETEK KÖZÖS HOZZÁFÉRÉS-ÁLLAPOTA (STK-01, R83/F83-03): EGY szerver-válasz
    // dönt mind a háromról — a Készletegyenlegről, a Termékkartonról és a Készletmozgásokról.
    access: { stock: { state: 'unknown' } },
    inviteToken: null, invite: null, authView: null, search: '', members: [], notice: null, resendReason: null,
    membersTab: 'members', invites: null, processState: '',
    // A MEGKEZDETT KITÖLTÉS ÁLLAPOT, NEM CSAK DOM (FRM-01, R83/F83-02): a munkalap-váltás
    // újrarajzol, és az újrarajzolt űrlap üres volt — a lap „megőrizte a munkát" látszatával.
    forms: {},
    // ── A SEGÍTSÉG ÁLLAPOTA (R89 §4). A panel a FELHASZNÁLÓ nyitására nyílik, magától soha.
    help: { open: false, view: 'ask', topic: null, search: '', faqSearch: '', faqOpen: null },
    // A SZERVER válasza arról, MI engedélyezett (művelet · bemutató · szolgáltatói csatlakozás).
    // A böngésző ezt NEM találja ki: a „böngészőből küldött admin jelzés" nem felhatalmazás (AST-01).
    astStatus: null,
    // A TUDÁS-INDEX a szerverről: melyik funkció látható ENNEK a kérőnek, és ha nem, MIÉRT nem.
    helpIndex: null,
    // A SZEMÉLYES beszélgetés — a nyilvános terméksúgótól KÜLÖN tárolva (R89 §6).
    chat: emptyChat(),
    // A FUTÓ BEMUTATÓ (TUR-01) — a nézethez kötve, a böngészőben nem tároljuk.
    tour: null, tourBlocked: null, tourFinished: false, tourAborted: null,
    /**
     * A HORDOZOTT LEZÁRÁS (F93-01). A fiók LÉTREHOZÁSA a saját bemutatóját ürítette ki: a siker után
     * a lap átvált az ÚJ cégre, a váltás pedig a `tour`-t is törli — a buborék ott maradt, mögötte
     * állapot nélkül. Ez a mező a BIZONYÍTOTT elszámolást viszi át, és a SZEMÉLYHEZ tartozik: más
     * ember belépésekor ürül (R83/F83-01). Szerkesztő-állapotot NEM tartalmaz.
     */
    tourCarry: null,
    /**
     * A NYELV MONOTON GENERÁCIÓJA (F93-02). A késő válasz eldobása eddig a nyelv ÉRTÉKÉT hasonlította
     * — ezért a magyar → német → magyar oda-vissza váltás átcsúszott rajta, és a régi nyelvű válasz
     * megjelent (a külső ellenőrző fél mérése, R93). A generáció MINDEN váltásnál nő, tehát a
     * visszaváltás is érvénytelenít (KUKA-202: az őr ott álljon, ahol a kár keletkezik).
     */
    langGen: 0,
    /**
     * AZ AKTUÁLIS ÚTON TUDATOSAN VÁLASZTOTT NYELV (F93-02) — és ez NEM ugyanaz, mint a tárolt anonim
     * maradvány: csak akkor áll be, ha a felhasználó EBBEN a lap-munkamenetben tényleg átállította a
     * választót. Az új személy első belépésekor ezt visszük át (nincs saját tárolt választása),
     * kijelentkezéskor pedig eldobjuk — a következő ember nem örökli (a külső fél kikötése).
     */
    langChoice: null,
  };

  // ── HÁLÓZAT ─────────────────────────────────────────────────────────────────────────────────
  async function api(method, path, body) {
    const opts = { method, credentials: 'same-origin', headers: {} };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    let res;
    // A KÉRÉS FAJTÁJA A VÁLASZ RÉSZE: egy elveszett válasz OLVASÁSNÁL ártalmatlan, ÍRÁSNÁL viszont
    // NEM dönthető el, teljesült-e (R85/F85-04). A hívó ezt a mezőt olvassa, nem találgat.
    const mutating = method !== 'GET';
    try { res = await fetch(path, opts); } catch { return { status: 0, ok: false, reason: 'network_error', mutating }; }
    let json;
    try { json = await res.json(); } catch { json = { ok: false, reason: 'invalid_response' }; }
    return { status: res.status, mutating, ...json };
  }

  /**
   * A NÉGY KIMENET KÜLÖN SZÓ — ÉS A BÖNGÉSZŐ KIVÉTELE NEM BIZONYÍTÉK (R85/F85-04 · KUKA-093).
   *
   * A LELET (a külső ellenőrző fél, R85): a próba a kérést TÉNYLEGESEN végrehajtotta a szerveren
   * (HTTP 200, a levél-fogadóban 1 → 2), és CSAK a böngésző felé menő választ dobta el. A lap
   * mégis azt írta: „Nem sikerült kapcsolatba lépni… Próbáld újra." — vagyis a `fetch` kivételét
   * BIZTOS meghiúsulásnak nevezte. A böngésző NEM tudja megkülönböztetni a meg sem indult kérést
   * az elveszett választól; ezt a mérés cáfolta.
   *
   * A MAI SZABÁLY: `ok` = a szerver válaszolt és teljesítette · `refused` = nevezetten elutasította ·
   * `uncertain` = a kimenet NEM ELDÖNTHETŐ (elveszett vagy értelmezhetetlen válasz, 5xx — vagy
   * bármilyen ÍRÓ kérés kivétele) · `network` = CSAK OLVASÁSNÁL: a lekérés nem jutott el, és ott
   * nincs mit eldönteni, mert olvasás semmit nem változtat. Alkalmazás-szintű bizonyíték hiányában
   * az írás sorsát NEM állítjuk — sem így, sem úgy.
   */
  function requestOutcome(r) {
    if (!r || r.status === 0) return r && r.mutating ? 'uncertain' : 'network';
    if (r.status >= 500 || r.reason === 'invalid_response') return 'uncertain';
    return r.ok ? 'ok' : 'refused';
  }

  const bookId = () => (state.me && state.me.current_book_id) || null;
  const subjectId = () => (state.me && state.me.subject_id) || null;
  /** A NÉZET: alany ÉS könyv EGYÜTT — ez a kötés alapja (KTX-03, R79/F79-02 · KUKA-208). */
  const view = () => ({ book: bookId(), subject: subjectId() });
  const isAdmin = () => !!(state.me && state.me.current_role === 'admin');
  const isPersonal = () => !!(state.me && state.me.current_personal === true);
  const accountName = () => accountLabel(state.me && state.me.current_book_id
    ? { name: state.me.current_book_name, personal: state.me.current_personal === true } : null);

  /** ÁLLAPOTVÁLTOZTATÓ kérés a nézet megerősítésével. A mező csak SZŰKÍT, jogot SOHA nem ad. */
  function apiInContext(method, path, body, given) {
    const v = given || view();
    const confirm = {};
    if (v.book) confirm.expected_book_id = v.book;
    if (v.subject) confirm.expected_subject_id = v.subject;
    return api(method, path, { ...body, ...confirm });
  }
  /**
   * PNL-01 — A MEGNYITOTT SZERKESZTŐ A MEGNYITÁSKORI NÉZETHEZ TARTOZIK (R83/F83-01).
   *
   * A LELET, amit ez lezár (a külső ellenőrző fél, chatgpt-v3, R83): a meghívó-panel MÁSODIK
   * kattintása az időközben aktívvá lett MÁSIK cégbe írt (HTTP 201), miközben a panel még az
   * EREDETI cég nevét és a beírt címet mutatta. Nem jog-megkerülés volt (Anna mindkét fiókot
   * kezeli), hanem ennél alattomosabb: a felhasználó SZÁNDÉKA és a végrehajtás CÉLJA vált el.
   *
   * A szabály: minden ÍRÓ űrlap a rajzolásakor MEGBÉLYEGZŐDIK a nézettel (alany · könyv ·
   * generáció), és a beküldés EZT használja, nem az időközben frissült globális nézetet. Ha a
   * bélyeg már nem a mai nézet, a kérés EL SEM INDUL: a szerkesztő érvénytelen, bezárul, és a lap
   * kimondja, mi történt. A bélyeg a DOM-ban áll, tehát MÉRHETŐ (KUKA-207).
   */
  function stampEl(el) {
    if (!el) return;
    const v = view();
    el.setAttribute('data-view-book', v.book || '');
    el.setAttribute('data-view-subject', v.subject || '');
    el.setAttribute('data-view-gen', String(state.generation));
  }
  /** A bélyeg visszaolvasása: `{ book, subject, gen, fresh }` — `fresh` false ⇒ a szerkesztő elavult. */
  function stampOf(el) {
    const host = el && el.closest ? el.closest('[data-view-gen]') : null;
    if (!host) return { book: null, subject: null, gen: null, fresh: false };
    const gen = Number(host.getAttribute('data-view-gen'));
    return {
      book: host.getAttribute('data-view-book') || null,
      subject: host.getAttribute('data-view-subject') || null,
      gen,
      fresh: Number.isFinite(gen) && gen === state.generation,
    };
  }
  /**
   * AZ ELAVULT SZERKESZTŐ NEM ÍR. Bezárja a panelt, kimondja a helyzetet, és a régi kitöltést NEM
   * viszi át az új fiókba (a felhasználónak újra kell kezdenie, a MAI, egyértelműen megnyitott
   * fiókban). Igazat ad, ha a szerkesztő elavult volt.
   */
  async function refuseStale(stamp) {
    if (stamp.fresh) return false;
    closePanel();
    const before = state.noticeSeq;
    await refreshMe();
    if (state.noticeSeq === before) notice(reasonText('context_mismatch'), 'warn');
    render();
    return true;
  }

  /**
   * FRM-01 — A MUNKALAP MEGŐRZI A MEGKEZDETT KITÖLTÉST (R83/F83-02).
   *
   * A LELET: „Vállalkozás hozzáadása → név beírása → Áttekintés → vissza a nyitva maradt lapra" —
   * a név ELTŰNT, megerősítés nélkül. A munkalap tehát csak LÁTSZÓLAG őrizte a munkát: a lap-váltás
   * újrarajzol, és az újrarajzolt űrlap a DOM-ban új, üres mezőket kapott.
   *
   * A szabály EGY helyen áll: a `data-keep="<kulcs>"` jelölésű űrlapok kitöltése — amint a
   * felhasználó HOZZÁÉR — az állapotba kerül, és minden rajzolás után visszaáll. A kulcs a LAP, nem
   * a mező, ezért új űrlap ingyen kapja meg (KUKA-003: a több helyen igaz szabály EGY helyen él).
   * Amit ez NEM állít: hogy a kitöltés a böngésző bezárása után is megmarad — nem tároljuk el; és
   * a MÁS személy/fiók alatti átvitelt kimondottan TILTJA (a `refreshMe` üríti — R83/F83-01).
   */
  function rememberForm(f) {
    const key = f && f.dataset ? f.dataset.keep : null;
    if (!key || !f.elements) return;
    const box = {};
    for (const el of f.elements) {
      if (!el.name) continue;
      // A VÁLASZTÓ-CSOPORT (radio) EGY érték, nem mezőnként külön: a NEVE alatt a KIVÁLASZTOTT
      // érték áll, különben az utolsó gomb `false` értéke elnyomná a kiválasztást (KUKA-039).
      if (el.type === 'radio') { if (el.checked) box[el.name] = el.value; continue; }
      box[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    }
    state.forms[key] = box;
  }
  let restoring = false;
  function restoreForms() {
    restoring = true;
    try { restoreFormsInner(); } finally { restoring = false; }
  }
  function restoreFormsInner() {
    for (const f of document.querySelectorAll('form[data-keep]')) {
      const box = state.forms[f.dataset.keep];
      if (!box) continue;
      for (const el of f.elements) {
        if (!el.name || !(el.name in box)) continue;
        if (el.type === 'radio') { el.checked = el.value === box[el.name]; continue; }
        if (el.type === 'checkbox') { el.checked = !!box[el.name]; continue; }
        el.value = box[el.name];
      }
      // A SZÁRMAZTATOTT MEZŐK (felirat, rejtett sor) a visszaállított értékhez igazodnak: a
      // választó- és jelölő-mezők ugyanazt a `change` utat járják, mint kézi állításnál (KUKA-039).
      for (const el of f.elements) {
        if (el.name && (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio')) {
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
  }
  /** VAN-E NEM MENTETT MÓDOSÍTÁS? Csak amihez a felhasználó HOZZÁÉRT, az számít (nem az alapérték). */
  function hasUnsaved() {
    return Object.keys(state.forms).length > 0;
  }
  function forgetForms() { state.forms = {}; }
  /**
   * A SIKERES MENTÉS UTÁN A FORM MÁR NEM „NEM MENTETT" (R83/F83-02 saját lelete a csomag futtatásakor).
   * Enélkül a csomagmentés után MINDEN fiókváltás megkérdezte, hogy elveszik-e a munka — miközben a
   * munka már el volt mentve. A hamis kérdés ugyanolyan kár, mint a hiányzó (KUKA-041).
   */
  function forgetForm(key) { if (key) delete state.forms[key]; }

  /** OLVASÓ kérés UGYANAZZAL a kötéssel, lekérdezés-mezőként (KTX-02 · KUKA-204). */
  function readQuery(extra, given) {
    const v = given || view();
    const p = new URLSearchParams(extra || {});
    if (v.book) p.set('expected_book_id', v.book);
    if (v.subject) p.set('expected_subject_id', v.subject);
    const q = p.toString();
    return q ? `?${q}` : '';
  }

  // ── KONTEXTUS ÉS ÉRTESÍTÉS ──────────────────────────────────────────────────────────────────
  function newContext(why) {
    state.generation += 1;
    state.selfInitiated = why || true;
    state.search = '';
    return state.generation;
  }
  function notice(msg, kind, action) {
    state.notice = msg ? { msg, kind: kind || '', action: action || null } : null;
    state.noticeSeq += 1;
    const el = byTest('global-notice');
    if (!el) return;
    el.innerHTML = msg
      ? `${esc(msg)}${action ? ` <button type="button" class="plain" data-go="${esc(action.go)}">${esc(action.label)}</button>` : ''}`
      : '';
    el.className = `notice ${kind || ''}`;
    el.hidden = !msg;
  }
  function toast(msg) {
    const el = byTest('toast');
    if (!el) return;
    el.textContent = msg; el.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.hidden = true; }, 6000);
  }
  /** EGY HELYZET — EGY MONDAT: ha a frissítés már kimondta, nem írjuk felül általánosabbal. */
  async function contextChangedNotice(why) {
    const before = state.noticeSeq;
    await refreshMe();
    if (state.noticeSeq === before) notice(unboundMessage(why, UNBOUND), 'warn');
  }

  /**
   * A SZERVER IGAZSÁGA DÖNT. Ha az alany vagy a fiók MÁS, mint amit a lap hitt (mert egy másik fül
   * ugyanabban a böngészőben váltott vagy belépett), az KONTEXTUS-VÁLTÁS: új generáció, ürítés, és
   * KIMONDOTT mondat — nem néma képernyő (R77/F77-01 · R79/F79-02 · KUKA-201).
   */
  async function refreshMe() {
    const seq = (state.seq += 1);
    const me = await api('GET', '/api/me');
    if (seq !== state.seq) return;
    if (me.status === 0) { notice(STATE.loadFailed, 'bad'); return; }
    const prevSubject = state.ctx.subject;
    const prevBook = state.ctx.book;
    const prevBookName = state.ctx.bookName;
    const changed = (me.subject_id ?? null) !== prevSubject || (me.current_book_id ?? null) !== prevBook;
    /**
     * A NYELV A SZEMÉLYHEZ TARTOZIK (F91-02, a reviewer kikötése): „személyváltáskor egy korábbi
     * ember személyes preferenciáját ne keverjük az új ember beállításával". Ezért AMINT kiderül,
     * hogy MÁS ember van a munkamenetben, a nyelv az ŐVÉ lesz — a tárolt választása, vagy ha
     * nincs, a böngésző kérése. A régi ember nyelve NEM öröklődik át.
     */
    if ((me.subject_id ?? null) !== prevSubject) {
      state.me = { ...(state.me || {}), subject_id: me.subject_id ?? null };
      // MÁS EMBER — a hordozott lezárás az ELŐZŐ személyé volt (F93-01): nem mutatjuk meg neki.
      state.tourCarry = null;
      restoreLang({ newPerson: true });
      state.astStatus = null; state.helpIndex = null;   // a tudás a KÉRT nyelven jött (KTX-02)
    }
    if (changed) {
      const foreign = prevSubject !== null && !state.selfInitiated;
      const otherSubject = (me.subject_id ?? null) !== prevSubject;
      // A HOZZÁFÉRÉS MEGSZŰNÉSE MÁS TÉNY, MINT A FIÓKVÁLTÁS (R81 §5/13). Amit MÉRÜNK: a korábbi
      // fiók eltűnt ENNEK a felhasználónak a listájából — ez a szerver állítása, nem következtetés.
      // Amit NEM állítunk: hogy KI és MIÉRT szüntette meg; az okot nem találjuk ki (UX-16).
      const list = (me.workspaces || []).map((w) => w.book_id);
      const accessLost = !otherSubject && prevBook !== null && !list.includes(prevBook);
      const personal = me.personal_book_id || null;
      state.ctx = { subject: me.subject_id ?? null, book: me.current_book_id ?? null, bookName: me.current_book_name ?? null };
      state.generation += 1;
      resetViewCaches();
      state.tabs = ['overview'];
      state.afterCreate = null;
      // KÜLSŐ OKBÓL VÁLTOZOTT A NÉZET: a nyitott szerkesztő és a félbehagyott kitöltés NEM
      // használható fel az ÚJ személy/fiók alatt (R83/F83-01 · F83-02 utolsó bekezdése).
      state.forms = {};
      closePanel();
      if (!pageAvailable(state.page, me)) state.page = 'overview';
      if (state.page !== 'overview') state.tabs = ['overview', state.page];
      if (foreign && otherSubject) {
        notice(UI.otherPersonHere, 'warn');
      } else if (accessLost) {
        notice(`${tpl('accountLost', { nev: prevBookName })} ${UI.personalStillUsable}`,
          'warn', personal ? { label: UI.openPersonal, go: 'switch:' + personal } : null);
      } else if (foreign) {
        notice(tpl('accountSwitchedElsewhere', { nev: me.current_personal === true ? STATE.personalAccount : me.current_book_name }), 'warn');
      }
    }
    state.selfInitiated = false;
    state.me = me;
    render();
    if (changed) loadPageData();      // ÚJ nézet ⇒ ÚJ adat; a rajzolás maga nem kérdez
  }

  /** Létezik-e ez az oldal az ÚJ nézetben? (A tag nem lát Beállítások-oldalt — UX-09.) */
  function pageAvailable(page, me) {
    if (!me || !me.current_book_id) return false;
    if (['overview', 'new', 'profile', 'security'].includes(page)) return true;
    if (me.current_personal === true) return NAV_PERSONAL.some((g) => g.pages.includes(page));
    if (NAV_GROUPS.some((g) => g.pages.includes(page))) return true;
    return NAV_ADMIN.pages.includes(page) && me.current_role === 'admin';
  }

  // ── A KERET SZÖVEGEI ÉS A NYELV ─────────────────────────────────────────────────────────────
  /**
   * A LAP NYELVE ÉS ÍRÁSIRÁNYA (LANG-01, R89 §5). A `lang` és a `dir` a `documentElement`-en áll,
   * mert a böngésző ezt olvassa: elválasztás, betűkészlet, felolvasó nyelve és a tükrözés is ettől
   * függ. A W3C a kettőt KÜLÖN kezeli — ezért két attribútum.
   *
   * ÉS AMIT A NYELV NEM ÁLLÍT: országot, adózási rendet, időzónát, pénznemet. A `dir` váltása
   * kizárólag az ELRENDEZÉST tükrözi.
   */
  function applyLanguage() {
    const root = document.documentElement;
    root.setAttribute('lang', currentLang());
    root.setAttribute('dir', currentDir());
  }

  /**
   * A NYELV-VÁLASZTÁS TÚLÉLI A LAPFRISSÍTÉST — DE SZEMÉLYHEZ KÖTVE (F91-02 · LANG-01).
   *
   * A LELET (a külső ellenőrző fél, chatgpt-v3, R91): a profilban németre állított lap FRISSÍTÉS után
   * magyarra állt vissza — a választás csak a modul memóriájában élt. A javítás KÉT kikötéssel jár:
   *   · a választás a BÖNGÉSZŐBEN marad meg (nem a szerveren): a nyelv a NÉZŐ kényelme, nem a fiók
   *     adata — üzleti adatot a böngésző tárolójába nem írunk;
   *   · a tárolás KULCSA A SZEMÉLY: `vs3.lang.<alany>` belépve, `vs3.lang.anon` névtelenül. Ezért
   *     személyváltáskor a MÁSIK ember beállítása nem szivárog át (a reviewer kikötése), és ha az új
   *     embernek nincs saját választása, a lap a böngésző kérésére (`Accept-Language`) esik vissza —
   *     NEM az előző ember nyelvére.
   * A tároló hibáját (privát ablak · letiltott tároló) ELNYELJÜK: a nyelv ettől nem áll meg, csak
   * nem marad meg — és ezt a profil-oldal ki is mondja.
   */
  /**
   * AZ ÚTON VÁLASZTOTT NYELV SAJÁT KULCSA (F93-02) — és MIÉRT NEM elég a memória.
   *
   * MÉRVE (saját böngésző-próba, R93): a regisztráció → megerősítő levél → visszatérés út közben a
   * lap TELJESEN ÚJRATÖLT (a levél hivatkozása külön oldal), tehát a memóriában tartott választás
   * pont a mérendő ponton veszett el. A választás ezért a böngészőben marad meg — DE külön kulcson,
   * és NEM azonos a `vs3.lang.anon` maradvánnyal (a külső fél kikötése: „különböztesd meg az aktív
   * felhasználói választást a régi anonim tárolási maradványtól").
   *
   * A KÜLÖNBSÉG, KIMONDVA: ez a kulcs KIJELENTKEZÉSKOR ÜRÜL, az anonim maradvány nem. Ezért egy
   * kijelentkezés után belépő MÁSIK ember soha nem örökli — a tér csak addig él, amíg ugyanaz a
   * belépési/regisztrációs út tart. Üzleti adat nincs benne: egy nyelv-kód.
   */
  function rememberChoice(code) {
    state.langChoice = code || null;
    try {
      if (code) window.localStorage.setItem(LANG_CHOICE_KEY, String(code));
      else window.localStorage.removeItem(LANG_CHOICE_KEY);
    } catch { /* privát ablak · letiltott tároló: a választás ettől nem áll meg, csak nem marad meg */ }
  }
  function pathChoice() {
    if (state.langChoice) return state.langChoice;
    try { return window.localStorage.getItem(LANG_CHOICE_KEY); } catch { return null; }
  }
  /** A MAI személy tárolási kulcsa — a KULCS ALAKJA a modulé (LNG-02), nem itt épül újra. */
  function myLangKey() { return langStoreKey(state.me && state.me.subject_id ? state.me.subject_id : null); }
  function rememberLang(code) {
    try { window.localStorage.setItem(myLangKey(), String(code)); return true; } catch { return false; }
  }
  function storedLang() {
    try { return window.localStorage.getItem(myLangKey()); } catch { return null; }
  }
  /**
   * EGY BEJÁRAT A NYELV ÉRVÉNYESÍTÉSÉHEZ (F95-01) — ÉS MIÉRT PONT EGY.
   *
   * A HIBA, amit a külső ellenőrző fél (chatgpt-v3) az R95-ben MÉRT: az angolra/németre állított
   * felület KIJELENTKEZÉS és ÚJBÓLI BELÉPÉS után magyarra váltott. Az OK a forráson: a `setLang`
   * NYELVKÓD-SZTRINGET ad (I18N-01), a lap viszont HÁROM helyen egy nem létező `got.code` mezőt
   * olvasott rajta. Két ág (a személyhez mentés) ezért SOHA nem futott le, a harmadikat a
   * tartalék-ága mentette meg — VÉLETLENÜL (KUKA-238 · KUKA-245).
   *
   * Ezért innentől a nyelv-váltás MINDEN útja ezen az egy függvényen megy át, a döntést pedig a
   * tiszta modul hozza (`decideLang`), amit a próba is HÍVNI tud (KUKA-207). A mentés nem külön ág
   * minden hívóban: a döntés MEGMONDJA, kell-e (`persist_for_person` · `persist_choice`).
   */
  function useLang(decision) {
    const code = setLang(decision.code);        // SZTRING — mezőt nem olvasunk rajta (KUKA-245)
    state.langSource = decision.source;
    applyLanguage();
    state.langStored = decision.persist_for_person ? rememberLang(code) : state.langStored;
    if (decision.persist_choice) rememberChoice(code);
    return code;
  }
  /**
   * A NYELV VISSZAÁLLÍTÁSA a MAI személyhez. Sorrend: (1) a lap címében KIFEJEZETTEN kért nyelv
   * (`?lang=` — a megerősítő levélből visszatérő út hozza), (2) ENNEK A SZEMÉLYNEK a tárolt
   * választása, (3) a böngésző nyelvi kérése. Ami nincs bekapcsolva, azt a feloldó eldobja.
   */
  function restoreLang({ fromUrl = false, newPerson = false } = {}) {
    let urlAsked = null;
    if (fromUrl) {
      try { urlAsked = new URL(window.location.href).searchParams.get('lang'); } catch { urlAsked = null; }
    }
    /**
     * AZ ÚJ SZEMÉLY ÖRÖKLI AZ ÚTON VÁLASZTOTT NYELVET (F93-02, a külső ellenőrző fél mérése, R93).
     *
     * A LELET: belépés előtt németre állított felület után az ÚJ ember első belépésekor a lap
     * magyar lett — mert ennek a személynek még nincs tárolt választása, és a feloldó a böngésző
     * kérésére esett vissza. Vagyis a MOST, tudatosan kiválasztott nyelv veszett el a belépés
     * pillanatában, épp azon az úton, ahol kiválasztották.
     *
     * A SZABÁLY HÁROM RÉSZE, és mindhárom kimondott:
     *   · a MÁR ISMERT ember tárolt választása ERŐSEBB — azt nem írja felül semmi (`wanted` már áll);
     *   · ha az új embernek NINCS tárolt választása, az EBBEN a lap-munkamenetben tudatosan
     *     választott nyelv (`state.langChoice`) megy át, és ELTESSZÜK neki — innentől az övé;
     *   · a RÉGI ANONIM TÁROLÁSI MARADVÁNY NEM ilyen választás: csak az számít, amit a felhasználó
     *     ténylegesen átállított most (ezért külön mező, nem a `vs3.lang.anon` olvasása).
     */
    // A BÖNGÉSZŐ NYELVI KÉRÉSE a NEGYEDIK forrás — a döntést a tiszta modul hozza, a jegyzék
    // feloldójának SAJÁT mezőnevein (`explicit` · `stored` · `acceptLanguage`). A kitalált mezőnév
    // itt NÉMÁN alapnyelvre esett vissza: a hibát a mérés fogta meg, nem a figyelem (KUKA-039/238).
    const nav = (window.navigator && (window.navigator.languages || [window.navigator.language])) || [];
    // AZ ÁTVITT VÁLASZTÁS INNENTŐL AZ ÖVÉ: a döntés `persist_for_person`-t ad, és a `useLang`
    // elteszi a SAJÁT kulcsára — az úthoz kötött tér itt ér véget (F93-02 · F95-01).
    return useLang(decideLang({
      asked: urlAsked,
      askedSource: 'url',
      storedForPerson: storedLang(),
      carriedChoice: pathChoice(),
      acceptLanguage: nav.filter(Boolean).join(','),
      newPerson,
      // VAN-E KIHEZ KÖTNI: a cím ága csak BELÉPETT emberhez tesz el nyelvet — névtelen maradványt
      // nem gyárt, mert azt a KÖVETKEZŐ ember örökölné (F95-01 másodlagos lelete, KUKA-245).
      hasPerson: Boolean(state.me && state.me.subject_id),
    }));
  }
  /**
   * A VÁZ FELIRATAI. Az `index.html` szándékosan SZÖVEG NÉLKÜLI: a demósáv, az aria-címkék és a
   * Segítség gomb felirata is a szótárból jön, különben a fordítás kihagyná őket (KUKA-214 — ez volt
   * a „részleges szótár" utolsó zuga: a váz).
   */
  function renderChrome() {
    applyLanguage();
    setText(byTest('demo-bar-title'), UI.demoBar);
    setText(byTest('demo-bar-lead'), UI.demoBarLead);
    setText(byTest('demo-mail-open'), UI.demoMailButton);
    setText(byTest('ws-label'), UI.activeAccount);
    const help = byTest('help-open');
    if (help) { help.textContent = HELP.open; help.setAttribute('aria-label', HELP.openAria); }
    const aria = [
      ['nav-toggle', UI.navOpen], ['brand', UI.home],
      ['account-switcher-summary', UI.activeAccount], ['nav', UI.mainMenu], ['tabs', UI.openTabs],
    ];
    for (const [id, label] of aria) { const el = byTest(id); if (el) el.setAttribute('aria-label', label); }
    const prof = document.querySelector('[data-testid="profile"] summary');
    if (prof) prof.setAttribute('aria-label', UI.profileMenu);
    const ns = byTest('noscript'); if (ns) ns.textContent = UI.noScript;
  }

  // ── FEJLÉC ──────────────────────────────────────────────────────────────────────────────────
  function renderHeader() {
    const me = state.me;
    const loggedIn = !!(me && me.subject_id);
    const list = (me && me.workspaces) || [];
    setText(byTest('header-workspace'), loggedIn ? (accountName() || UI.chooseAccount) : UI.noAccountShort);
    setText(byTest('header-subject'), loggedIn ? (me.email || me.subject_id) : UI.notSignedIn);
    setText(byTest('avatar'), loggedIn ? String(me.email || '?').slice(0, 2).toUpperCase() : '–');
    // A SZERVER mondata arról, ki nevében járunk el, és a cím-megerősítés állapota: képernyőolvasónak
    // mindig elérhető, a szemnek a Saját profil / Belépés és biztonság oldalon (R81 §3.3).
    setText(byTest('header-acting-as'), loggedIn ? (me.acting_as || '—') : '—');
    setText(byTest('channel-proven'), loggedIn ? (me.channel_proven ? 'igen' : 'nem') : '—');
    show(byTest('account-switcher'), loggedIn);
    show(byTest('profile'), loggedIn);

    const personal = list.filter((w) => w.personal);
    const shared = list.filter((w) => !w.personal);
    const line = (w) => `<li data-testid="ws-item-${esc(w.book_id)}">
      <button type="button" data-testid="ws-switch-${esc(w.book_id)}" data-switch="${esc(w.book_id)}"
        ${w.book_id === (me && me.current_book_id) ? 'class="current" aria-current="true"' : ''}>
        <span class="wsname">${esc(accountLabel(w))}</span>
        <small data-testid="ws-kind-${esc(w.book_id)}">${w.personal ? STATE.personalKind : `${ROLE[w.role] || w.role}${w.plan ? ` · ${PLAN[w.plan] || w.plan}` : ''}`}</small>
      </button></li>`;
    const menu = byTest('ws-list');
    if (menu) {
      menu.innerHTML = loggedIn ? `
        ${personal.length ? `<div class="group">${esc(UI.groupPersonal)}</div><ul class="menu-list">${personal.map(line).join('')}</ul>` : ''}
        ${shared.length ? `<div class="group">${esc(UI.groupShared)}</div><ul class="menu-list">${shared.map(line).join('')}</ul>` : ''}
        <div class="divider"></div>
        <button type="button" data-go="new" data-testid="ws-add">${esc(UI.addBusiness)}</button>` : '';
    }
    const pm = byTest('profile-menu');
    if (pm) {
      pm.innerHTML = loggedIn ? `
        <div class="identity"><strong>${esc(me.email || me.subject_id)}</strong>
          <small>${esc(me.channel_proven ? UI.channelProven : UI.channelPending)}</small></div>
        <button type="button" data-go="profile">${PAGE.profile}</button>
        <button type="button" data-go="security">${PAGE.security}</button>
        <div class="divider"></div>
        <button type="button" data-action="logout" data-testid="logout">${esc(UI.logout)}</button>` : '';
    }
  }

  // ── MENÜ ÉS MUNKALAPOK ──────────────────────────────────────────────────────────────────────
  function renderNav() {
    const nav = byTest('nav');
    if (!nav) return;
    const item = (p) => `<button type="button" class="navitem ${state.page === p ? 'active' : ''}" data-go="${p}"
      data-testid="nav-${p}" ${state.page === p ? 'aria-current="page"' : ''}>${PAGE[p]}</button>`;
    let h = `<button type="button" class="mobile-close" data-action="nav-close">${esc(UI.navClose)} ×</button>`;
    if (isPersonal()) {
      for (const g of NAV_PERSONAL) h += (g.group ? `<div class="navgroup">${g.group}</div>` : '') + g.pages.map(item).join('');
    } else {
      for (const g of NAV_GROUPS) h += (g.group ? `<div class="navgroup">${g.group}</div>` : '') + g.pages.map(item).join('');
      // A BEÁLLÍTÁSOK CSOPORT CSAK ANNAK LÁTSZIK, AKI HASZNÁLHATJA (UX-09): a tag nem lát olyan
      // menüpontot, amin „nincs jogod" fogadná — a jogot továbbra is a SZERVER dönti el.
      if (isAdmin()) h += `<div class="navgroup">${NAV_ADMIN.group}</div>` + NAV_ADMIN.pages.map(item).join('');
    }
    nav.innerHTML = h;
  }
  function renderTabs() {
    const el = byTest('tabs');
    if (!el) return;
    el.innerHTML = state.tabs.map((p) => `<div class="tab ${p === state.page ? 'active' : ''}">
      <button type="button" data-tab="${p}" data-testid="tab-${p}">${PAGE[p]}</button>
      ${p === 'overview' ? '' : `<button type="button" class="x" data-close-tab="${p}" aria-label="${esc(tpl('closeTab', { oldal: PAGE[p] }))}">×</button>`}</div>`).join('');
  }
  /** UX-05: ugyanaz a munkalap nem nyílik meg kétszer; fiókváltáskor új lap-készlet indul. */
  function go(page) {
    if (!PAGE[page]) return;
    state.page = page;
    state.search = '';
    state.notice = null;
    if (page !== 'overview') state.afterCreate = null;
    if (!state.tabs.includes(page)) state.tabs.push(page);
    const sw = byTest('account-switcher'); if (sw) sw.open = false;
    const pr = byTest('profile'); if (pr) pr.open = false;
    const nav = byTest('nav'); if (nav) nav.classList.remove('open');
    render();
    loadPageData();
  }

  // ── OLDAL-SABLONOK ──────────────────────────────────────────────────────────────────────────
  function head(title, lead, action) {
    return `<div class="pagehead"><div><div class="eyebrow">${esc(accountName())}</div><h1>${esc(title)}</h1>
      ${lead ? `<p>${esc(lead)}</p>` : ''}</div>${action || ''}</div>`;
  }
  /**
   * A MEZŐ / MŰVELET MELLETTI KÉRDŐJEL (R89 §4): ugyanazt a segítség-panelt nyitja, mindjárt az
   * ADOTT témán. Nem külön súgó-rendszer — EGY panel, egy tudásforrás (SEG-01).
   */
  const helpDot = (featureId) => `<button type="button" class="helpdot" data-action="help-topic"
    data-topic="${esc(featureId)}" data-testid="helpdot-${esc(featureId)}"
    aria-label="${esc(HELP.fieldHelpAria)}" title="${esc(HELP.fieldHelpAria)}">?</button>`;
  function emptyBox(title, lead, action) {
    return `<div class="empty"><h2>${esc(title)}</h2><p>${esc(lead)}</p>${action || ''}</div>`;
  }
  const demoBadge = () => `<span class="badge gray">${esc(STATE.demo)}</span>`;
  /**
   * A MENNYISÉG JELLEGÉNEK JELVÉNYE A KÓDBÓL DÖNT, NEM A FELIRATBÓL (R89 §5 · KUKA-214 osztálya).
   *
   * A LELET, amit ez lezár (a SAJÁT R89-es mérésem): a korábbi alak a MAGYAR feliratot hasonlította
   * (`x.quality === 'Mért'`), ezért angolul és németül egyetlen sor sem került volna a „mért" ágra —
   * minden mennyiség „ismeretlen"-nek LÁTSZOTT volna, holott a fixtúra mérte. A fordítás így nem
   * csak szöveget, hanem a képernyő ÁLLÍTÁSÁT is elrontotta volna (KUKA-066: a hamis adat nem
   * hibának látszik, hanem adatnak).
   */
  const qualityBadge = (code) => {
    const nev = QUALITY[code];
    if (code === 'mert') return `<span class="badge ok">${esc(nev)}</span>`;
    if (code === 'becsult') return `<span class="badge wait">${esc(nev)}</span>`;
    return `<span class="badge gray">${esc(nev || STATE.notGiven)}</span>`;
  };
  /** A FIÓKHOZ RENDELT mintacsomag (KIMONDOTT hozzárendelés, nem számítás — R83/F83-03). */
  /** A FIÓKHOZ RÖGZÍTETT bemutató-csomag azonosítója — a SZERVER válaszából (DEM-02, R85/F83-03). */
  const demoFixture = () => {
    const w = ((state.me && state.me.workspaces) || []).find((x) => x.book_id === bookId());
    return (w && w.demo_fixture) || null;
  };
  const demoSet = () => demoFor(demoFixture());
  const demoName = () => demoSource(demoFixture());
  /** NINCS HOZZÁRENDELVE? Akkor a lap ezt KIMONDJA — nem rajzol másik cég adatát (KUKA-066). */
  const noDemoBox = () => `<div class="empty" data-testid="demo-empty"><h2>${esc(STATE.demoNone)}</h2>
      <p>${esc(STATE.demoNoneLead)}</p></div>`;
  const techDetails = (obj) => `<details class="tech"><summary>${esc(UI.technicalDetails)}</summary><pre>${esc(JSON.stringify(obj, null, 2))}</pre></details>`;

  /**
   * A LISTÁK KÖZÖS RAJZOLÓJA — sorra kattintható RÉSZLETEZŐ panellel (R83/F83-04).
   *
   * A LELET: a lista sorai nem voltak megnyithatók, tehát a felület felsorolt, de nem MUTATOTT
   * semmit. A részletező UGYANEZEKBŐL a fixture-sorokból épül — új üzleti végrehajtás NINCS
   * (se mozgás, se könyvelés, se írás), és a panel ezt KIMONDJA.
   */
  const ROW_DEF = Object.freeze({
    products: { cols: () => [UI.colProduct, UI.colCode, UI.colKind, UI.colWarehouse], of: (d) => d.products,
      row: (p) => [`<strong>${esc(p.name)}</strong>`, esc(p.code), esc(p.kind), esc(p.warehouse)] },
    partners: { cols: () => [UI.colPartner, UI.colContact, UI.colCountry], of: (d) => d.partners,
      row: (p) => [`<strong>${esc(p.name)}</strong>`, esc(p.kind), esc(p.country)] },
    warehouses: { cols: () => [UI.colWarehouse, UI.colKind, UI.colSamplesHere], of: (d) => d.warehouses,
      row: (wh, d) => [`<strong>${esc(wh.name)}</strong>`, esc(wh.kind), esc(tpl('itemCount', { n: d.products.filter((x) => x.warehouse === wh.name).length }))] },
    processes: { cols: () => [UI.colProcess, UI.colName, UI.colState, UI.colWhen], of: (d) => d.processes,
      row: (p) => [`<strong>${esc(p.code)}</strong>`, esc(p.name), `<span class="badge">${esc(p.state)}</span>`, esc(whenText(p.at))] },
    documents: { cols: () => [UI.colDocument, UI.colKind, UI.colPartner, UI.colWhen], of: (d) => d.documents,
      row: (x) => [`<strong>${esc(x.code)}</strong>`, esc(x.kind), esc(x.partner), esc(whenText(x.at))] },
  });

  function tablePage(page) {
    const def = ROW_DEF[page];
    if (!def) return head(PAGE[page] || page, UI.notBuiltLead) + emptyBox(UI.notBuiltTitle, UI.notBuiltBox);
    const d = demoSet();
    const all = def.of(d);
    if (!all.length) return head(PAGE[page], UI.demoListLead) + noDemoBox();
    const q = state.search.toLocaleLowerCase(currentLang());
    // A FOLYAMATOK ÁLLAPOT-SZŰRÉSE (R83/F83-04): a választható értékek a MEGLÉVŐ sorokból jönnek —
    // nem találunk ki állapot-listát, amit a mintaadat nem tartalmaz (KUKA-050).
    const states = page === 'processes' ? [...new Set(all.map((x) => x.state))] : [];
    const kept = all.map((item, i) => ({ item, i }))
      .filter(({ item }) => !(page === 'processes' && state.processState) || item.state === state.processState);
    const visible = kept.filter(({ item }) => !q
      || Object.values(item).join(' ').toLocaleLowerCase(currentLang()).includes(q));
    const szuro = states.length ? `<label class="inline">${esc(UI.stateFilter)}
        <select data-testid="process-state"><option value="">${esc(tpl('allOf', { n: all.length }))}</option>
        ${states.map((st) => `<option value="${esc(st)}" ${state.processState === st ? 'selected' : ''}>${esc(tpl('stateWithCount', { allapot: st, n: all.filter((x) => x.state === st).length }))}</option>`).join('')}</select></label>` : '';
    return head(PAGE[page], UI.demoListLeadRows)
      + `<div class="tablebox"><div class="toolbar">
          <input data-testid="list-search" aria-label="${esc(UI.searchInList)}" placeholder="${esc(UI.searchInListPlaceholder)}" value="${esc(state.search)}">
          ${szuro}${demoBadge()}</div>
        <div class="table-scroll"><table><thead><tr>${def.cols().map((c) => `<th>${esc(c)}</th>`).join('')}<th><span class="sr-only">${esc(UI.details)}</span></th></tr></thead>
        <tbody data-testid="list-rows">${visible.length ? visible.map(({ item, i }) => `<tr data-testid="row-${page}-${i}">${def.row(item, d).map((c) => `<td>${c}</td>`).join('')}
            <td><button type="button" class="plain" data-action="row-open" data-list="${page}" data-row="${i}"
              data-testid="row-open-${page}-${i}">${esc(UI.details)}</button></td></tr>`).join('')
          : `<tr><td colspan="${def.cols().length + 1}">${esc(STATE.noResult)}
              <button type="button" class="plain" data-action="clear-search">${esc(UI.clearFilters)}</button></td></tr>`}</tbody></table></div>
        <div class="tablefoot">${esc(tpl('rowCount', { n: visible.length }))}</div></div>`;
  }

  /** A RÉSZLETEZŐ PANEL — a fixture SORÁBÓL, mező-nevekkel; a raktárnál a hozzá kötött tételekkel. */
  function detailPanel(list, idx) {
    const def = ROW_DEF[list];
    const d = demoSet();
    const item = def ? def.of(d)[Number(idx)] : null;
    if (!item) return;
    const line = (nev, ertek) => `<div class="splitline"><span>${esc(nev)}</span><strong>${esc(ertek ?? STATE.notGiven)}</strong></div>`;
    let body = '';
    if (list === 'products') {
      body = line(UI.colCode, item.code) + line(UI.colKind, item.kind) + line(UI.colWarehouse, item.warehouse)
        + line(UI.colQty, item.qty === null ? STATE.unknownQty : `${item.qty} ${item.unit || STATE.noUnit}`)
        + line(UI.colQtyQuality, QUALITY[item.quality])
        + line(UI.colUnitPrice, item.price === null ? STATE.noPrice : `${item.price} ${item.currency}`);
    } else if (list === 'partners') {
      body = line(UI.colContact, item.kind) + line(UI.colCountry, item.country);
    } else if (list === 'warehouses') {
      const itt = d.products.filter((x) => x.warehouse === item.name);
      body = line(UI.colKind, item.kind) + line(UI.colSamplesHere, tpl('itemCount', { n: itt.length }))
        + `<h3>${esc(UI.detailItemsHere)}</h3><ul class="menu-list" data-testid="warehouse-items">${itt.length
          ? itt.map((x) => `<li><span>${esc(x.name)}</span> <small>${esc(x.qty === null ? STATE.unknownQty : `${x.qty} ${x.unit || STATE.noUnit}`)}</small></li>`).join('')
          : `<li class="muted">${STATE.empty}</li>`}</ul>`;
    } else if (list === 'processes') {
      body = line(UI.colName, item.name) + line(UI.colState, item.state) + line(UI.colWhen, whenText(item.at));
    } else if (list === 'documents') {
      body = line(UI.colKind, item.kind) + line(UI.colPartner, item.partner) + line(UI.colWhen, whenText(item.at));
    }
    openPanel(panelHead(item.name || item.code, STATE.demo)
      + `<div data-testid="detail-body">${body}</div>
      <p class="muted" style="font-size:13px">${esc(UI.detailDemoNote)}</p>
      ${techDetails({ list, index: Number(idx), demo_fixture: demoName(), row: item })}
      <div class="buttonrow"><button type="button" data-action="panel-close">${esc(UI.close)}</button></div>`);
  }

  function overviewPage() {
    if (isPersonal()) {
      return head(PAGE.overview, UI.overviewPersonalLead)
        + `<div class="grid"><section class="card"><h2>${esc(STATE.personalAccount)}</h2>
            <p class="muted">${esc(UI.personalReady)}</p>
            <button type="button" data-go="personal" class="primary">${esc(tpl('openPage', { oldal: PAGE.personal }))}</button></section>
          <section class="card"><h2>${esc(UI.alsoBusiness)}</h2>
            <p class="muted">${esc(UI.alsoBusinessLead)}</p>
            <button type="button" data-go="new">${esc(PAGE.new)}</button></section></div>`;
    }
    const demo = demoSet();
    const justCreated = state.afterCreate ? `<section class="card" data-testid="after-create">
        <h2>${esc(STATE.inviteAsk)}</h2>
        <p class="muted">${esc(UI.afterCreateLead)}</p>
        <div class="buttonrow">${isAdmin() ? `<button type="button" class="primary" data-action="invite-from-create" data-testid="after-create-invite">${esc(UI.inviteUser)}</button>` : ''}
          <button type="button" data-action="dismiss-after-create" data-testid="after-create-skip">${esc(STATE.inviteSkip)}</button></div></section>` : '';
    return head(PAGE.overview, UI.overviewLead)
      + justCreated
      + `<div class="stats">
          <div class="card stat"><span>${esc(UI.statProcesses)}</span><strong>${demo.processes.filter((p) => p.state === 'Folyamatban').length}</strong></div>
          <div class="card stat"><span>${esc(UI.statProducts)}</span><strong>${demo.products.length}</strong></div>
          <div class="card stat"><span>${esc(UI.statRole)}</span><strong>${esc(ROLE[state.me.current_role] || state.me.current_role || '—')}</strong></div>
        </div>
        <div class="grid">
          <section class="card"><h2>${esc(UI.nextTasks)}</h2>
            <p class="muted">${esc(UI.nextTasksLead)}</p>
            <div class="buttonrow"><button type="button" data-go="stock" class="primary">${esc(PAGE.stock)}</button>
            ${isAdmin() ? `<button type="button" data-go="members">${esc(PAGE.members)}</button>` : ''}</div></section>
          <section class="card"><h2>${esc(UI.activeAccountCard)}</h2><p><strong>${esc(accountName())}</strong></p>
            <p class="muted">${esc(UI.switchAccountLead)}</p>${demoBadge()}</section>
        </div>`;
  }

  /**
   * A NÉZETHEZ KÖTÖTT GYORSÍTÓTÁRAK EGY HELYEN ÜRÜLNEK (R85/F85-02).
   *
   * A LELET: a várakozó meghívások listája (`state.invites`) KIMARADT a közös ürítésből, ezért
   * fiókváltás után a MÁSODIK cég fejléce alatt még az ELSŐ cég címzettje állt, amíg az új válasz
   * meg nem érkezett. A generáció-őr ezt nem javítja: az a KÉSVE ÉRKEZŐ választ fogja meg, nem a
   * már kirajzolt RÉGI sort.
   *
   * Ezért MINDEN nézethez kötött tár EGY függvényben ürül, és ezt hívja a saját váltás ÉS a külső
   * okból jött nézet-változás is — új tár felvételekor itt az egyetlen hely, amit bővíteni kell
   * (KUKA-003: a több helyen igaz szabály EGY helyen él).
   */
  function resetViewCaches() {
    // A SEGÉD ÁLLAPOTA IS NÉZETHEZ KÖTÖTT (KUKA-218: minden nézethez kötött tár EGY helyen ürül).
    // A beszélgetés, a tudás-index, az engedélyezett műveletek és a futó bemutató MIND a megnyitáskori
    // személy + fiók párhoz tartozik — a fiókváltás vagy a másik ember belépése után egyik sem élhet
    // tovább (R89 §6: „Kijelentkezés vagy személyváltás után más nem láthatja az előző felhasználó
    // kitöltését és beszélgetését").
    state.chat = emptyChat();
    state.astStatus = null;
    state.helpIndex = null;
    state.tour = null; state.tourBlocked = null; state.tourFinished = false; state.tourAborted = null;
    state.help = { open: false, view: 'ask', topic: null, search: '', faqSearch: '', faqOpen: null };
    tourMod.clearHighlight();
    closeHelp();
    state.members = [];
    state.panels = { stock: null, price: null, members: null };
    state.access = { stock: { state: 'unknown' } };
    state.invites = null;
    state.membersTab = 'members';
    state.search = '';
    state.processState = '';
    /**
     * ÉS A KÉPERNYŐT IS (F93-01). Az ürítés eddig CSAK az állapotot törölte: a buborék a lapon
     * maradt, a Befejezés gomb mögött viszont már nem volt futás — egy állapot nélküli gomb, ami
     * semmit nem zár le. A rajzolás ugyanabban a lépésben történik, mint az ürítés, mert a kettő
     * EGY tény két fele (KUKA-218: minden nézethez kötött tár EGY helyen ürül — a képével együtt).
     */
    renderTour();
  }

  /** A panel tartalmát EGY helyen írjuk: az állapotba és a DOM-ba is (KUKA-039). */
  function setPanel(name, testid, html) {
    state.panels[name] = html;
    const el = byTest(testid);
    if (el) el.innerHTML = html;
  }
  /**
   * STK-01 — A KÉSZLET-JELLEGŰ NÉZETEK UGYANAZT A HOZZÁFÉRÉST MUTATJÁK (R83/F83-03).
   *
   * A LELET (a külső ellenőrző fél, R83): Béla készlet-kérése NEVEZETTEN elutasítva
   * (`ok=false, refused_by=right`), a Termékkarton mégis 840 db-ot, a Készletmozgások 200 db-ot és
   * −80 db-ot rajzolt. A mintaadat a JOGTÓL FÜGGETLENÜL megjelent — vagyis a képernyő többet
   * mondott, mint amit a szerver kiadott. A kapu ott áll, ahol a kár keletkezik (KUKA-202), és a
   * szabály EGY helyen él: mind a három nézet UGYANEZT a függvényt hívja (KUKA-003 · KUKA-207).
   *
   * `null` = szabad az út; egyébként a KIÍRANDÓ nemleges nézet. A lap nevét csak a jelölő hordozza.
   */
  function stockGate(testid) {
    const a = state.access.stock;
    if (a.state === 'granted') return null;
    if (a.state === 'unbound') return `<div class="notice warn" data-testid="${testid}-unbound">${esc(unboundMessage(a.why, UNBOUND))}</div>`;
    // AZ OLVASÁS EL SEM JUTOTT (R85/F85-04): olvasásnál ez ELDÖNTHETŐ hiány — nem változtattunk
    // semmit, tehát a lap nyugodtan kimondhatja, és ugyanazzal a gombbal újra lehet próbálni.
    if (a.state === 'network') {
      return `<div class="empty" data-testid="${testid}-network"><h2>${esc(STATE.stockLoadFailed)}</h2>
          <p>${esc(STATE.stockLoadFailedLead)}</p>
          <button type="button" data-action="reload-stock">${esc(UI.refresh)}</button></div>`;
    }
    if (a.state === 'denied') {
      return `<div class="empty" data-testid="${testid}-denied" data-gate="${esc(a.gate || '')}">
          <h2>${esc(UI.stockNoAccessTitle)}</h2>
          <p>${esc(reasonText(a.reason, UI.stockNoAccessLead))}</p>
          <button type="button" data-action="reload-stock">${esc(UI.refresh)}</button></div>
        ${techDetails({ ok: false, refused_by: a.gate ?? null, reason: a.reason ?? null, detail: a.detail ?? null, demo_fixture: demoName() })}`;
    }
    return `<p data-testid="${testid}-loading">${STATE.loading}</p>`;
  }

  function stockPage() {
    return head(PAGE.stock, UI.stockLead,
      `${helpDot('data.stock')}<button type="button" class="primary" data-action="reload-stock" data-testid="data-stock-btn">${esc(UI.refresh)}</button>`)
      + `<div data-testid="data-stock">${stockBody()}</div>
         <section class="card" style="margin-top:20px"><div class="cardhead"><h2>${esc(UI.prices)}</h2>
           <button type="button" data-action="reload-price" data-testid="data-price-btn">${esc(UI.refresh)}</button></div>
           <div data-testid="data-price">${state.panels.price ?? STATE.loading}</div></section>`;
  }

  /** A KÉSZLET a VALÓDI mag kapuján megy át; a mintatábla CSAK akkor látszik, ha a core kiadja. */
  const STOCK_PAGES = ['stock', 'stockcard', 'movements'];

  /**
   * A KÉSZLET-HOZZÁFÉRÉS EGYETLEN LEKÉRÉSE (STK-01). A választ mind a három készlet-jellegű nézet
   * ugyanebből az állapotból olvassa — nem külön-külön dönt a jogról (R83/F83-03).
   */
  async function loadStock({ sync = true } = {}) {
    state.access.stock = { state: 'unknown' };                // ELŐBB ÜRÍT, aztán kér (KUKA-050)
    renderStockViews();
    // …aztán a NÉZET igazsága a szerveré (R77/F77-01). Ha közben MÁS nézetbe kerültünk, ez a
    // hívás NEM kérdez tovább: a frissítés már elindította a lekérést az ÚJ nézetben.
    if (sync && !(await syncView())) return;
    if (!STOCK_PAGES.includes(state.page)) return;
    const v = view();
    const gen = state.generation;
    const r = await api('GET', '/api/data/stock' + readQuery(null, v));
    if (gen !== state.generation || !STOCK_PAGES.includes(state.page)) return;
    if (requestOutcome(r) === 'network') { state.access.stock = { state: 'network' }; renderStockViews(); return; }
    const verdict = contextBindingVerdict(r, v);
    if (!verdict.bound) {
      state.access.stock = { state: 'unbound', why: verdict.why };
      renderStockViews();
      await contextChangedNotice(verdict.why);
      return;
    }
    if (!r.ok) {
      state.access.stock = { state: 'denied', gate: r.refused_by ?? null, reason: r.reason ?? null, detail: r.detail ?? null };
      renderStockViews();
      return;
    }
    // A MAG VÁLASZA CSAK MENNYISÉGET AD. Raktárt és mérési eredetet NEM tartalmaz, ezért nem is
    // találunk ki hozzá (R83/F83-03: a korábbi alak „Központi raktár"-t és „Mért"-et írt ki, amit
    // a válasz nem bizonyít — a kliensbe beégetett szó adatnak látszott).
    state.access.stock = {
      state: 'granted',
      coreQty: r.result && r.result.qty !== undefined && r.result.qty !== null ? String(r.result.qty) : null,
      servedBook: r.served_book_id ?? null,
      servedSubject: r.served_subject_id ?? null,
      result: r.result ?? null,
    };
    renderStockViews();
  }

  /** A HÁROM NÉZET ÚJRARAJZOLÁSA — csak az éppen nyitott lap változik (KUKA-209: a rajzolás nem kér). */
  function renderStockViews() {
    if (!STOCK_PAGES.includes(state.page)) return;
    if (state.page === 'stock') { setPanel('stock', 'data-stock', stockBody()); return; }
    render();
  }

  /** A KÉSZLETEGYENLEG TÖRZSE: a közös kapu, majd a fiókhoz RENDELT mintacsomag sorai. */
  function stockBody() {
    const gate = stockGate('stock');
    if (gate) return gate;
    const a = state.access.stock;
    const d = demoSet();
    const rows = d.products.filter((p) => p.kind !== 'Szolgáltatás').map((p) => ({
      name: p.name, code: p.code, warehouse: p.warehouse,
      qty: p.qty === null ? STATE.unknownQty : p.qty, unit: p.unit || STATE.noUnit, quality: p.quality,
    }));
    // A MAGTÓL KAPOTT SOR: „Bemutató tétel", és amit a válasz NEM mond meg, az „Nincs megadva" —
    // sem raktárt, sem mérési eredetet nem tulajdonítunk neki (R83/F83-03 · UX-19).
    if (a.coreQty) {
      rows.unshift({ name: STATE.demoItem, code: STATE.notGiven, warehouse: STATE.notGiven,
        qty: a.coreQty, unit: STATE.noUnit, quality: null });
    }
    if (!rows.length) return noDemoBox() + techDetails({ ok: true, result: a.result, demo_fixture: demoName() });
    return `<div class="tablebox" data-testid="stock-table"><div class="toolbar">${demoBadge()}
        <span class="muted">${esc(STATE.demoItemLead)}</span></div>
      <div class="table-scroll"><table><thead><tr><th>${esc(UI.colProduct)}</th><th>${esc(UI.colWarehouse)}</th><th class="numeric">${esc(UI.colQty)}</th><th>${esc(UI.colUnit)}</th><th>${esc(UI.colQtyQuality)}</th></tr></thead>
      <tbody>${rows.map((x) => `<tr><td><strong>${esc(x.name)}</strong><small>${esc(x.code)}</small></td><td>${esc(x.warehouse)}</td>
        <td class="numeric">${esc(x.qty)}</td><td>${esc(x.unit)}</td>
        <td>${qualityBadge(x.quality)}</td></tr>`).join('')}
      </tbody></table></div><div class="tablefoot">${esc(tpl('rowsAndUnits', { n: rows.length }))}</div></div>
      ${techDetails({ ok: true, result: a.result, served_book_id: a.servedBook, served_subject_id: a.servedSubject, demo_fixture: demoName() })}`;
  }

  async function loadPrice({ sync = true } = {}) {
    setPanel('price', 'data-price', STATE.loading);
    if (sync && !(await syncView())) return;
    if (state.page !== 'stock') return;
    const v = view();
    const gen = state.generation;
    const r = await api('GET', '/api/data/price' + readQuery(null, v));
    if (gen !== state.generation || state.page !== 'stock') return;
    const verdict = contextBindingVerdict(r, v);
    if (!verdict.bound) {
      // UGYANAZ A SZABÁLY MINDKÉT PANELEN (KUKA-039): a kötetlen válasz nem rajzol, és a lap
      // KIMONDJA, mi változott — nem néma képernyő (R81 §5/15 · KUKA-201).
      setPanel('price', 'data-price', `<p class="muted">${esc(unboundMessage(verdict.why, UNBOUND))}</p>`);
      await contextChangedNotice(verdict.why);
      return;
    }
    if (!r.ok) {
      // A KÉT KAPU KÜLÖN MONDAT (ENT-02): a csomag hiánya és a jog hiánya nem ugyanaz a helyzet.
      const ent = r.refused_by === 'entitlement' || r.refused_by === 'both';
      setPanel('price', 'data-price', `<p data-testid="price-denied" data-gate="${esc(r.refused_by || '')}">${esc(ent
        ? (isAdmin() ? STATE.planMissingAdmin : STATE.planMissingMember)
        : reasonText(r.right_reason === 'no_scope_grant' || r.right_reason === 'not_available' ? 'no_scope_grant' : r.right_reason, UI.priceNotAllowed))}</p>
        ${ent && isAdmin() ? `<button type="button" data-go="plan">${esc(tpl('openPage', { oldal: PAGE.plan }))}</button>` : ''}
        ${techDetails({ refused_by: r.refused_by, right_reason: r.right_reason ?? null, entitlement_reason: r.entitlement_reason ?? null, message: r.message ?? null })}`);
      return;
    }
    const price = r.result && r.result.unit_price !== undefined && r.result.unit_price !== null ? String(r.result.unit_price) : null;
    setPanel('price', 'data-price', `<p data-testid="price-value"><strong>${esc(STATE.demoItem)}</strong> · ${esc(price ?? STATE.noPrice)} <span class="muted">(${STATE.noCurrency})</span></p>
      <p class="muted">${esc(UI.priceMissingNote)}</p>
      ${techDetails({ ok: r.ok, result: r.result ?? null, served_book_id: r.served_book_id ?? null, served_subject_id: r.served_subject_id ?? null })}`);
  }

  /**
   * FELHASZNÁLÓK — KÉT FÜL: a belépett tagok ÉS a várakozó meghívások (R83/F83-04).
   *
   * A LELET: a kiadott, még be nem váltott meghívás SEHOL nem látszott, tehát a fiókkezelő nem
   * tudta, kire vár. A lista MEGLÉVŐ tényekből, ugyanazon a joghatáron olvas (fiókkezelői jog + a
   * nézet kötése), és NYERS meghívó-token nem kerül bele — a token a levél titka (KUKA-006).
   */
  function membersPage() {
    if (!isAdmin()) return head(PAGE.members) + emptyBox(UI.membersNoAccessTitle, UI.membersNoAccessLead);
    const fül = (kulcs, cimke) => `<button type="button" role="tab" data-action="members-tab" data-mtab="${kulcs}"
      data-testid="members-tab-${kulcs}" aria-selected="${state.membersTab === kulcs}" class="${state.membersTab === kulcs ? 'current' : ''}">${cimke}</button>`;
    const varakozo = state.membersTab === 'invites';
    return head(PAGE.members, UI.membersLead,
      `${helpDot('invite.send')}<button type="button" class="primary" data-action="invite-open" data-testid="invite-open">${esc(UI.inviteUserButton)}</button>`)
      + '<p class="notice" data-testid="members-result" hidden></p>'
      + `<div class="subtabs" role="tablist">${fül('members', PAGE.members)}${fül('invites', STATE.invitePending)}</div>`
      + (varakozo
        ? `<div data-testid="section-invites"><div data-testid="invites-list">${invitesBody()}</div></div>`
        : `<div data-testid="section-members"><div data-testid="members-list">${state.panels.members ?? STATE.loading}</div></div>`);
  }

  /** A VÁRAKOZÓ MEGHÍVÁSOK TÁBLÁJA — a szerver válaszából, token nélkül. */
  function invitesBody() {
    const list = state.invites;
    if (list === null) return `<p data-testid="invites-loading">${esc(STATE.invitesLoading)}</p>`;
    if (!list.length) return emptyBox(STATE.invitePendingEmpty, UI.inviteEmptyLead);
    return `<div class="tablebox" data-testid="invites-table"><div class="table-scroll"><table>
      <thead><tr><th>${esc(UI.colInvitedEmail)}</th><th>${esc(UI.colRole)}</th><th>${esc(UI.colInvitedBy)}</th><th>${esc(UI.colValidUntil)}</th><th>${esc(UI.colState)}</th></tr></thead>
      <tbody>${list.map((x) => `<tr data-testid="invite-row-${esc(x.ref)}">
        <td><strong>${esc(x.email || STATE.notGiven)}</strong></td><td>${esc(ROLE[x.role] || x.role)}</td>
        <td>${esc(x.invited_by || STATE.notGiven)}</td><td>${esc(whenText(x.expires_at))}</td>
        <td>${x.expired ? `<span class="badge gray">${esc(UI.inviteExpired)}</span>` : `<span class="badge wait">${esc(UI.inviteWaiting)}</span>`}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="tablefoot">${esc(UI.inviteTokenNote)}</div></div>`;
  }

  /** A VÁRAKOZÓ MEGHÍVÁSOK LEKÉRÉSE — ugyanazzal a nézet-kötéssel, mint a tagoké (KTX-02). */
  async function loadInvites() {
    state.invites = null;
    const v = view();
    const gen = state.generation;
    const r = await api('GET', '/api/invites/waiting' + readQuery(null, v));
    if (gen !== state.generation || state.page !== 'members') return;
    const verdict = contextBindingVerdict(r, v);
    if (!verdict.bound) { state.invites = []; render(); await contextChangedNotice(verdict.why); return; }
    state.invites = r.ok ? (r.invites || []) : [];
    if (!r.ok) notice(reasonText(r.reason, r.message), 'bad');
    render();
  }

  async function loadMembers() {
    const v = view();
    const gen = state.generation;
    const r = await api('GET', '/api/members' + readQuery(null, v));
    if (gen !== state.generation || state.page !== 'members') return;
    const verdict = contextBindingVerdict(r, v);
    if (!verdict.bound) { setPanel('members', 'members-list', `<div class="notice warn">${esc(unboundMessage(verdict.why, UNBOUND))}</div>`); await contextChangedNotice(verdict.why); return; }
    if (!r.ok) { setPanel('members', 'members-list', `<div class="empty"><h2>${esc(STATE.noAccess)}</h2><p>${esc(reasonText(r.reason))}</p></div>`); return; }
    state.members = r.members || [];
    const cell = (m, k) => (m.effective
      ? (m.scopes && m.scopes[k] && m.scopes[k].granted ? `<span class="badge ok">${esc(UI.canView)}</span>` : `<span class="badge wait">${esc(UI.notAllowed)}</span>`)
      : `<span class="badge gray">${esc(UI.noAccessBadge)}</span>`);
    const rows = state.members.map((m) => `<tr data-testid="member-${esc(m.subject_id)}">
        <td><strong>${esc(m.email || UI.unknownEmail)}</strong></td>
        <td>${esc(ROLE[m.role] || m.role)}</td>
        <td>${cell(m, 'keszlet')}</td><td>${cell(m, 'arak')}</td>
        <td>${m.effective ? `<span class="badge ok">${esc(UI.active)}</span>` : `<span class="badge gray">${esc(UI.revoked)}</span>`}</td>
        <td><button type="button" data-action="member-open" data-subject="${esc(m.subject_id)}" data-testid="member-open-${esc(m.subject_id)}">${esc(UI.accessButton)}</button></td>
      </tr>`).join('');
    setPanel('members', 'members-list', `<div class="tablebox"><div class="table-scroll"><table>
      <thead><tr><th>${esc(UI.colUser)}</th><th>${esc(UI.colRole)}</th><th>${esc(SCOPE.keszlet)}</th><th>${esc(SCOPE.arak)}</th><th>${esc(UI.colState)}</th><th><span class="sr-only">${esc(UI.colActions)}</span></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="6">${esc(STATE.noMembers)}</td></tr>`}</tbody></table></div>
      <div class="tablefoot">${esc(UI.membersFoot)}</div></div>`);
  }

  /**
   * A NÉZET SZINKRONIZÁLÁSA a lekérés ELŐTT. Igazat ad, ha a nézet VÁLTOZATLAN; hamisat, ha közben
   * megváltozott — ilyenkor a hívó NEM kérdez tovább, mert az újrarajzolás már elindította a
   * lekérést az ÚJ nézetben (és így nem születik kétszeres kérés).
   */
  async function syncView() {
    const before = state.generation;
    await refreshMe();
    return state.generation === before;
  }

  // ── PANELEK ─────────────────────────────────────────────────────────────────────────────────
  /**
   * A FUTÓ BEMUTATÓ ÚJRAÉRTÉKELÉSE, amikor a DOM változott (panel nyílt/zárult, súgó nyílt/zárult).
   * MIÉRT EGY HELYEN: a bemutató célja lehet panelen BELÜL — a feltárás pillanatában a buboréknak a
   * VALÓDI célra kell átállnia, különben a felhasználó a régi kiemelést látja (TUR-01 · KUKA-228).
   */
  // A HORDOZOTT LEZÁRÁS IS ÚJRARAJZOLANDÓ (F93-01): ha közben modális panel nyílik, a buboréknak
  // oda kell költöznie — különben a lezárás a párbeszéd MÖGÖTT ragad, ahol nem kattintható.
  function tourRecheck() { if (state.tour || state.tourCarry) renderTour(); }
  /**
   * A BUBORÉK OTTHONA — ha MODÁLIS panel van nyitva, a buborék ANNAK a gyereke lesz.
   *
   * MIÉRT (a saját R89-es böngésző-mérésem lelete). A meghívó-, a csomag- és a hozzáférés-panel
   * `showModal()`-lal nyílik, tehát a párbeszéd MÖGÖTT semmi nem kattintható — a lap tetején lebegő
   * buborék „Tovább" gombja is elérhetetlen lett. A bemutató így pontosan ott állt meg, ahol a
   * felhasználónak a legnagyobb szüksége volt rá: a kitöltés közben (KUKA-011: hol kattint?).
   * A párbeszéd a felső rétegben van, ezért a buborékot ODA kell tenni — nem „fölé emelni"
   * z-index-szel, mert a felső réteg fölé z-index nem visz (mérve).
   */
  function hostTour() {
    const box = byTest('tour');
    if (!box) return null;
    const open = [...document.querySelectorAll('dialog[open]')];
    const host = open.length ? open[open.length - 1] : document.body;
    if (box.parentElement !== host) host.appendChild(box);
    return box;
  }
  function openPanel(html, drawer = true) {
    const d = byTest('panel');
    d.className = drawer ? 'drawer' : '';
    stampEl(d);                     // A PANEL A MEGNYITÁSKORI SZEMÉLYHEZ ÉS FIÓKHOZ TARTOZIK (PNL-01)
    byTest('panel-body').innerHTML = html;
    if (!d.open) d.showModal();
    tourRecheck();
  }
  function closePanel() { const d = byTest('panel'); if (d && d.open) d.close(); }
  // A PANEL TARTALMA A BEZÁRÁSSAL ELTŰNIK — Esc-re is. A rejtett, de meglévő űrlap ugyanúgy a lap
  // része (a böngésző kitöltője és a képernyőolvasó is megtalálja), ezért nem hagyjuk ott.
  const panelEl = byTest('panel');
  if (panelEl) panelEl.addEventListener('close', () => { const b = byTest('panel-body'); if (b) b.innerHTML = ''; tourRecheck(); });
  function panelHead(title, lead) {
    return `<div class="dialoghead"><div><small>${esc(accountName())}</small><h2>${esc(title)}</h2>
      ${lead ? `<p class="muted">${esc(lead)}</p>` : ''}</div>
      <button type="button" class="x" data-action="panel-close" aria-label="${esc(UI.close)}">×</button></div>`;
  }

  function invitePanel() {
    openPanel(panelHead(UI.inviteTitle, UI.inviteLead)
      + `<form class="form" data-testid="invite-form">
        <label>${esc(UI.email)}<input type="email" name="email" required data-testid="invite-email" autocomplete="off" placeholder="pelda@example.test"></label>
        <label>${esc(UI.role)}<select name="role" data-testid="invite-role"><option value="user">${esc(ROLE.user)}</option><option value="admin">${esc(ROLE.admin)}</option></select>
          <small>${esc(STATE.inviteRoleHelp)}</small></label>
        <label>${esc(STATE.inviteScopeQuestion)}<select name="scope" data-testid="invite-scope"><option value="keszlet">${esc(SCOPE.keszlet)}</option><option value="arak">${esc(SCOPE.arak)}</option></select>
          <small>${esc(STATE.inviteScopeHelp)}</small></label>
        <div class="buttonrow"><button type="submit" class="primary" data-testid="invite-submit">${esc(UI.inviteCreate)}</button>
          <button type="button" data-action="panel-close">${esc(UI.cancel)}</button></div>
        <p class="notice" data-testid="invite-result" hidden></p>
        <!-- KÖZVETLEN ÚT A LEVÉLHEZ (R81 §8): a meghívó elkészülte után egy gomb viszi a
             próbaüzenethez — nem kell megkeresni a lap alján. Sikerig rejtve. -->
        <p hidden data-testid="invite-mail-row"><button type="button" data-action="mail-open"
          data-testid="invite-mail-open">${esc(UI.inviteMailOpen)}</button></p></form>`);
  }

  function memberPanel(id) {
    const m = (state.members || []).find((x) => x.subject_id === id);
    if (!m) return;
    const scopes = m.scopes || {};
    const row = (k) => `<div class="splitline"><div><strong>${esc(SCOPE[k])}</strong>
        <small>${esc(scopes[k] && scopes[k].granted ? UI.canView : UI.notAllowed)}</small></div>
      ${scopes[k] && scopes[k].granted ? `<span class="badge ok">${esc(UI.allowed)}</span>` : `<span class="badge wait">${esc(UI.notAllowed)}</span>`}</div>`;
    openPanel(panelHead(tpl('memberAccessTitle', { ki: m.email || m.subject_id }))
      + `<p class="identity"><strong>${esc(m.email || m.subject_id)}</strong>
          <small>${esc(ROLE[m.role] || m.role)} · ${esc(m.effective ? UI.active : UI.revoked)}</small></p>
      ${m.effective ? '' : `<div class="notice warn">${esc(UI.memberRevokedNote)}</div>`}
      <h3>${esc(UI.dataViewing)}</h3>${row('keszlet')}${row('arak')}
      ${m.effective ? `<form class="form" data-testid="member-scope-form" data-subject="${esc(id)}">
        <label>${esc(UI.scopeToGrant)}
          <select data-testid="member-scope-select-${esc(id)}" name="scope">
            <option value="keszlet">${esc(SCOPE.keszlet)}</option><option value="arak">${esc(SCOPE.arak)}</option></select></label>
        <button type="submit" class="primary" data-testid="member-scope-${esc(id)}">${esc(UI.grantView)}</button>
        <p class="muted" style="font-size:13px">${esc(tpl('scopeOnlyHere', { nev: accountName() }))}</p></form>
      <div class="divider"></div><h3>${esc(UI.accountAccess)}</h3>
      <p class="muted">${esc(STATE.revokeSectionLead)}</p>
      <button type="button" class="danger" data-action="revoke-start" data-subject="${esc(id)}" data-testid="member-revoke-${esc(id)}">${esc(UI.revokeBusinessAccess)}</button>` : ''}
      <div class="buttonrow"><button type="button" data-action="panel-close">${esc(UI.close)}</button></div>`);
  }

  function revokePanel(id) {
    const m = (state.members || []).find((x) => x.subject_id === id);
    const who = m ? (m.email || m.subject_id) : UI.someUser;
    openPanel(panelHead(tpl('revokeTitle', { ki: who }))
      + `<p>${esc(tpl('revokeLead', { ki: who, nev: accountName() }))}</p>
      <div class="buttonrow"><button type="button" data-action="member-open" data-subject="${esc(id)}">${esc(UI.cancel)}</button>
        <button type="button" class="danger" data-action="revoke" data-subject="${esc(id)}" data-testid="revoke-confirm">${esc(UI.revokeConfirm)}</button></div>`, false);
  }

  /**
   * PRÓBAÜZENETEK — a bemutató levél-fogadója. A fejlesztői felület KAPCSOLÓ mögött áll: ha ki van
   * kapcsolva, a végpont NEM LÉTEZIK (404) — és akkor ezt KI IS MONDJUK, nem üres listát mutatunk
   * (KUKA-201: a nemleges válasz is vigye a működő folytatást).
   */
  async function mailPanel() {
    const r = await api('GET', '/dev/mailbox');
    const off = r.status === 404 || r.reason === 'unknown_endpoint';
    const mails = r.mails || [];
    openPanel(panelHead(UI.mailboxTitle, STATE.demoMail)
      + (off
        ? `<div class="notice warn">${esc(UI.mailboxOff)}</div>`
        : `<ul class="maillist" data-testid="mailbox">${mails.length ? mails.map((m) => `<li data-testid="mail-${m.id}">
            <small>${esc(m.to)} · ${esc(whenText(m.at))}</small><h3>${esc(m.subject)}</h3>
            <p class="muted">${esc(m.body || '')}</p>
            <a href="${esc(m.link)}" data-testid="mail-link-${m.id}">${esc(UI.mailOpen)}</a></li>`).join('') : `<li class="muted">${esc(STATE.empty)}</li>`}</ul>`)
      + `<div class="buttonrow">${off ? '' : `<button type="button" data-action="mail-refresh" data-testid="mailbox-refresh">${esc(UI.refresh)}</button>`}
        <button type="button" data-action="panel-close">${esc(UI.close)}</button></div>`);
  }

  // ── SEGÍTSÉG · BEMUTATÓ · CHAT ──────────────────────────────────────────────────────────────
  /**
   * A SEGÍTSÉGPANEL MEGNYITÁSA. A felhasználó nyitja — magától SOHA (R89 §4). A megnyitás
   * MODELLHÍVÁST NEM indít: legfeljebb KÉT olvasó kérést tesz (állapot + tudás-index), és azokat is
   * csak egyszer nézetenként. A szöveg a már letöltött nyelvcsomagból jön.
   */
  async function openHelp(view, topic) {
    state.help.open = true;
    if (view) state.help.view = VIEWS.includes(view) ? view : 'ask';
    if (topic !== undefined) state.help.topic = topic;
    // A SÚGÓ-PANEL IS ÍRÓ FELÜLET: a kérdés `POST /api/assistant/ask`-ot indít, tehát UGYANÚGY a
    // MEGNYITÁSKORI nézethez tartozik, mint a szerkesztő-panel és a fő tartalom (PNL-01). A bélyeg
    // MEGNYITÁSKOR születik (nem minden rajzolásnál), és a `help-body` attribútumain áll, ezért a
    // belső újrarajzolás nem írja felül. Bélyeg nélkül a `stampOf` „elavult szerkesztőt" mért: a
    // kérdés EL SEM INDULT, és a lap egy MEG NEM TÖRTÉNT nézet-váltást állított (KUKA-227).
    stampEl(byTest('help-body'));
    renderHelp();
    const d = byTest('help-panel');
    if (d && !d.open) d.showModal();
    tourRecheck();
    await loadHelpData();
    renderHelp();
  }
  function closeHelp() {
    state.help.open = false;
    const d = byTest('help-panel');
    if (d && d.open) d.close();
    tourRecheck();
  }
  /** A KÉT OLVASÓ KÉRÉS — nézetenként EGYSZER. A nemleges válasz NEM indít újabb kört (KUKA-209). */
  async function loadHelpData() {
    // BELÉPÉS ELŐTT IS BETÖLT — a NYILVÁNOS tudás (regisztráció · belépés · megerősítés · meghívó
    // elfogadása · nyelv · súgó) a belépési képernyőn a legszükségesebb. A korábbi alak itt
    // visszatért, ezért a névtelen felhasználónak a Segítség gomb LÁTSZOTT, de a panel üres maradt
    // (F91-01, a külső fél lelete). A szerver oldali kapu változatlan: a nem nyilvános funkciót a
    // KÖZÖS elérhetőségi feloldó zárja ki (AVL-01), nem a kliens hallgatása.
    const v = view();
    const gen = state.generation;
    /**
     * A NYELV ÉLETCIKLUSA IS ŐRZI EZT A LEKÉRÉST (F93-02, a külső fél kód-vizsgálati lelete).
     *
     * A korábbi alak CSAK a fiók-generációt nézte, a tudás viszont a KÉRT nyelven jön: két gyors
     * nyelvváltás mellett az ELSŐ, régi nyelvű válasz írhatta felül a már új nyelvű állapotot — a
     * lap új nyelven állt, a súgó tartalma a régin. Ugyanaz a generáció védi, mint a chatet és az
     * újraszövegezést, tehát egy szabály, egy otthon (KUKA-003).
     */
    const langGen = state.langGen;
    const stale = () => gen !== state.generation || langGen !== state.langGen;
    const q = readQuery({ lang: currentLang() }, v);
    if (state.astStatus === null) {
      const r = await api('GET', `/api/assistant/status${q}`);
      if (stale()) return;
      state.astStatus = r && r.ok ? r : { ok: false, reason: (r && r.reason) || 'network_error', provider: { configured: false, missing: [] }, actions: [], tours: [] };
    }
    if (state.helpIndex === null) {
      const r = await api('GET', `/api/assistant/knowledge${q}`);
      if (stale()) return;
      state.helpIndex = r && r.ok ? r.index : [];
    }
  }
  /** A funkció-címek a forrás-sorokhoz — a szerver indexéből, a mai nyelven. */
  function featureTitles() {
    const box = {};
    for (const r of state.helpIndex || []) box[r.id] = r.title || r.id;
    return box;
  }
  /** A GYAKORI KÉRDÉSEK EMBERI CÍMEI — a nyers azonosító nem felhasználói szöveg (F91-06). */
  function faqTitles() {
    const box = {};
    const src = (dict().FAQ) || {};
    for (const [id, e] of Object.entries(src)) if (e && e.q) box[id] = e.q;
    return box;
  }
  function renderHelp() {
    const body = byTest('help-body');
    if (!body) return;
    // A BEZÁRT PANELT NEM RAJZOLJUK ÚJRA. A LELET (saját R89-es böngésző-mérés): a megnyitás a tudás-
    // indexet HÁLÓZATON kéri le, és ha a felhasználó közben Esc-cel bezárta a panelt, a KÉSVE érkező
    // válasz újra kitöltötte a `help-body`-t — a bezárt felület tartalma (fülek, gombok, a kérdés-mező)
    // VISSZATÉRT a lapra, láthatatlanul. A rejtett, de meglévő űrlap ugyanúgy a lap része: a böngésző
    // kitöltője és a képernyőolvasó is megtalálja (R75/F75-02 · KUKA-209 · KUKA-012).
    if (!state.help.open) { body.innerHTML = ''; return; }
    const st = state.astStatus;
    const index = state.helpIndex || [];
    let inner = '';
    if (state.help.view === 'guides') {
      inner = guidesHtml({ index, page: state.page, search: state.help.search, topic: state.help.topic,
        tours: (st && st.tours) || [], actions: (st && st.actions) || [] });
    } else if (state.help.view === 'faq') {
      inner = faqHtml({ index, search: state.help.faqSearch, open: state.help.faqOpen });
    } else if (state.help.view === 'sitemap') {
      inner = sitemapHtml({ me: state.me });
    } else {
      /**
       * A FORRÁS CSAK AKKOR MEGNYITHATÓ, HA TÉNYLEG ELÉRHETŐ (F93-03): a tudás-index ENNEK a
       * kérőnek a látható funkcióit sorolja — amire ő nem jogosult, ahhoz nem rajzolunk gombot.
       */
      const openable = (id) => (state.helpIndex || []).some((r) => r.id === id);
      inner = chatHtml({ chat: state.chat, status: st, titles: featureTitles(), faqTitles: faqTitles(), openable,
        limits: (st && st.limits) || null });
    }
    body.innerHTML = helpPanelHtml({ view: state.help.view, body: inner, page: state.page });
  }

  /**
   * A BEMUTATÓ INDÍTÁSA. A definíciót a SZERVER adta (`astStatus.tours`) — a böngésző nem talál ki
   * bemutatót, és nem indít olyat, amihez nincs joga (AST-01). Ha a bemutató másik oldalhoz tartozik,
   * ELŐBB odavisz, és csak utána emel ki.
   */
  async function startTour(id) {
    await loadHelpData();
    const defs = (state.astStatus && state.astStatus.tours) || [];
    const def = defs.find((t) => t.id === id);
    state.tourFinished = false; state.tourAborted = null; state.tourBlocked = null;
    state.tourCarry = null;                   // új futás indul: a korábbi lezárás lekerül a lapról
    // A SZERVER ADJA A LISTÁT (AST-01): ami nincs rajta, az ebben az állapotban NEM indítható. A
    // mondat ezt KIMONDJA (`notAvailable`) — a korábbi alak „megszűnt jogot" állított akkor is, ha a
    // bemutató egyszerűen nem ehhez az állapothoz tartozik (F91-01: a regisztrációs bemutató belépve
    // azonnal `targetMissing`-gel szakadt meg, holott NEM is lett volna szabad felkínálni).
    if (!def) { state.tourAborted = 'notAvailable'; renderTour(); return; }
    // AZ ELŐZŐ FUTÁS ELŐBB ZÁRUL: a panel bezárása újraértékeli a futó bemutatót, és egy már
    // elhagyott futásra nem akarunk megszakítást írni (a sorrend itt MÉRT, nem vélt).
    if (state.tour) { tourMod.exitRun(state.tour, 'restart'); state.tour = null; }
    closeHelp();
    state.tour = tourMod.newTourRun({ def, view: view(), role: state.me && state.me.current_role });
    // A BELÉPÉS ELŐTTI BEMUTATÓ a belépési képernyőn jár: oda visz, nem egy belső oldalra.
    if (def.requires_anonymous === true) {
      if (state.authView !== 'register') renderAuth('register');
    } else {
      const page = tourMod.pageOf(state.tour);
      if (page && state.page !== page) go(page);
    }
    renderTour();
  }
  function renderTour() {
    const box = hostTour();
    if (!box) return;
    if (state.tourAborted) {
      tourMod.clearHighlight();
      box.innerHTML = tourMod.abortedHtml(state.tourAborted);
      show(box, true);
      return;
    }
    /**
     * A HORDOZOTT LEZÁRÁS (F93-01): futás már nincs — a fiókváltás elvitte —, de a BIZONYÍTOTT
     * elszámolás megvan, és a felhasználónak jár egy lezárás arról, amit ténylegesen elvégzett.
     * UGYANAZ a rajzoló írja ki, mint a rendes befejezést, tehát a két út nem tud elcsúszni.
     */
    if (!state.tour && state.tourCarry) {
      tourMod.clearHighlight();
      box.innerHTML = tourMod.finishedHtml(state.tourCarry);
      show(box, true);
      return;
    }
    if (!state.tour) { tourMod.clearHighlight(); box.innerHTML = ''; show(box, false); return; }
    if (state.tourFinished) {
      tourMod.clearHighlight();
      box.innerHTML = tourMod.finishedHtml(state.tour);
      show(box, true);
      return;
    }
    const check = tourMod.checkRun(state.tour, { view: view(), role: state.me && state.me.current_role });
    if (!check.ok) {
      state.tourAborted = check.why === 'no_run' ? 'targetMissing' : check.why;
      renderTour();
      return;
    }
    // A FELTÁRÁSRA VÁRÁS a MAI DOM-ból dől el, nem tárolt állapotból: a felhasználó bármikor
    // megnyithatja a panelt, és a következő rajzolás már a valódi célt emeli ki (TUR-01).
    box.innerHTML = tourMod.tourHtml(state.tour, { blocked: state.tourBlocked, pending: check.pending || null });
    show(box, true);
    const marked = tourMod.highlight(state.tour);
    // A BUBORÉK NEM ÜLHET RÁ ARRA, AMIRE MUTAT (TUR-03, F93-01): a végigjárás lelete szerint a
    // hozzáférés-bemutatónál pont a kiemelt tag-sor gombját nyelte el a buborék.
    tourMod.avoidOverlap(box, marked);
    const first = box.querySelector('button:not([disabled])');
    if (first && typeof first.focus === 'function') first.focus();
  }
  /**
   * A FUTÓ BEMUTATÓ SZÖVEGE A MAI NYELVRE ÁLL (F91-03, a reviewer kikötése: „a nyelvváltás után a
   * bemutató is a választott nyelven folytatódik vagy érthetően újraindítható").
   *
   * A LÉPÉS-ÁLLAPOTOK MEGMARADNAK: az elvégzett lépés elvégzett marad, a nyelv csak a SZÖVEGET
   * váltja. Ha az új nyelvű válasz nem tartalmazza ezt a bemutatót (mert a jog közben megszűnt), a
   * bemutató NEVEZETTEN megszakad — nem marad ott régi nyelvű szöveggel (KUKA-050).
   */
  function retextTour() {
    if (!state.tour) return;
    const defs = (state.astStatus && state.astStatus.tours) || [];
    const def = defs.find((t) => t.id === state.tour.id);
    if (!def) { state.tourAborted = 'notAvailable'; state.tour = null; renderTour(); return; }
    state.tour.text = def.text || null;
    renderTour();
  }
  /** A FELADAT IGAZOLÁSA — a SZERVER válasza után hívjuk, nem a kattintás után (TUR-01). */
  function tourTaskDone(taskId) {
    if (!state.tour) return;
    if (tourMod.taskDone(state.tour, taskId)) { state.tourBlocked = null; renderTour(); }
  }

  /** A KÉRDÉS ELKÜLDÉSE — a nézet a küldéskor rögzül, és a késő válasz nem rajzol (KUKA-041). */
  async function doAsk(form) {
    const el = byTest('chat-input');
    const question = el ? String(el.value || '').trim() : '';
    if (!question) return;
    const v = stampOf(form);
    if (await refuseStale(v)) return;
    const gen = state.generation;
    /**
     * A KÉRÉS HÁROM AZONOSÍTÓT VISZ (F91-03): a NÉZET generációját (fiók/személy), a BESZÉLGETÉS
     * azonosítóját és a beszélgetésen belüli SORSZÁMOT — plusz a kérés NYELVÉT. A késve érkező
     * választ mind a négy tengelyen eldobjuk: fiókváltás · Új beszélgetés · újabb kérdés · nyelvváltás.
     */
    const convId = state.chat.id;
    const seq = (state.chat.seq += 1);
    const askLang = currentLang();
    const askLangGen = state.langGen;         // a NYELV ÉLETCIKLUSA, nem csak az értéke (F93-02)
    /**
     * AZ ELŐZMÉNY VÉGES — ÉS A KLIENS OLDALON IS (F91-03). A deklarált korlát (`history_turns`) a
     * MEGVALÓSULT működés: a legutóbbi N fordulót adjuk át, a régebbiek KIESNEK, és ezt a panel
     * kimondja. A korábbi alak korlátlanul gyűjtötte a fordulókat, és a modellnek EGYÁLTALÁN nem
     * adott előzményt — tehát a „6 előzmény-kör" nem a működést írta le (KUKA-038).
     */
    const keep = historyTurnsLimit();
    const historyText = state.chat.turns.slice(-keep)
      .map((t) => `K: ${t.question}\nV: ${t.answer || ''}`).join('\n---\n');
    state.chat.sending = true; state.chat.draft = question; state.chat.cleared = false;
    renderHelp();
    const r = await apiInContext('POST', '/api/assistant/ask', {
      question, lang: askLang, conversation_id: convId, history_text: historyText,
    }, v);
    if (gen !== state.generation) return;               // a késő válasz NEM jelenik meg új nézetben
    /**
     * ÚJ BESZÉLGETÉS · TÖRLÉS · ÚJABB KÉRDÉS · NYELVVÁLTÁS után a válasz NEM rajzol (F91-03), és a
     * nyelvet a GENERÁCIÓJA dönti el, nem az értéke (F93-02): az oda-vissza váltás is érvénytelenít.
     *
     * ÉS A KÜLDÉS-ÁLLAPOTOT CSAK A SAJÁT KÉRÉS OLDHATJA FEL (F93-02, a külső fél kód-vizsgálati
     * lelete): ha közben ÚJABB kérdés indult, az eldobott régi válasz eddig letörölte a MÁSIK,
     * még futó kérés „küldés folyamatban" jelzését — a lap késznek látszott, miközben dolgozott
     * (KUKA-202: az őr ott álljon, ahol a kár keletkezik).
     */
    const mine = convId === state.chat.id && seq === state.chat.seq;
    if (!mine || askLang !== currentLang() || askLangGen !== state.langGen) {
      if (mine) { state.chat.sending = false; renderHelp(); }
      return;
    }
    const verdict = contextBindingVerdict({ ...r, served_book_id: r.served_book_id, served_subject_id: r.served_subject_id }, v);
    state.chat.sending = false;
    if (!verdict.bound) {
      state.chat.draft = question;
      renderHelp();
      formResult('chat-result', unboundMessage(verdict.why, UNBOUND), 'warn');
      await contextChangedNotice(verdict.why);
      return;
    }
    state.chat.turns.push({
      question,
      answer: r.ok ? r.answer : null,
      kind: r.answer_kind || null,
      reason: r.ok ? null : r.reason,
      sources: r.sources || [],
      // A KAPCSOLÓDÓ ÚTMUTATÓ NEM A VÁLASZ FORRÁSA (F91-04) — külön listán, külön felirattal.
      related: r.related || [],
      // A KIESETT MODELL-VÁLASZ OKA a felületen is megjelenik, nevezetten.
      discarded: r.model_discarded || null,
      actions: r.actions || [],
      faq: r.faq || [],
      injection: Number(r.injection_markers || 0) > 0,
      usage: r.usage || null,
    });
    // A TÁROLT ELŐZMÉNY IS VÉGES: a legutóbbi N forduló marad, a régebbi KIESIK (F91-03).
    const cap = historyTurnsLimit();
    if (state.chat.turns.length > cap) state.chat.turns.splice(0, state.chat.turns.length - cap);
    state.chat.draft = '';
    forgetForm('chat');
    renderHelp();
  }
  /** A DEKLARÁLT ELŐZMÉNY-KORLÁT — a SZERVER mondja meg (AST-01 `LIMITS`), nem a lap találja ki. */
  function historyTurnsLimit() {
    const n = state.astStatus && state.astStatus.limits && Number(state.astStatus.limits.history_turns);
    return Number.isFinite(n) && n > 0 ? n : 6;
  }

  // ── BELÉPÉSI OLDALAK (UX-01: belső oldalon NINCS belépési űrlap) ────────────────────────────
  function renderAuth(kind) {
    state.authView = kind;
    // A BELÉPÉSI OLDALRA LÉPVE A KORÁBBI KÉPERNYŐ TARTALMA ELTŰNIK — nem csak elrejtve marad.
    // A rejtett, de meglévő tábla ugyanúgy a lap része: a késve érkező válasznak nem lehet hova
    // visszaírnia, és a böngésző kereső-/olvasó-eszközei sem találják meg (R75/F75-02 · KUKA-012).
    show(byTest('app'), false);
    for (const id of ['nav', 'tabs', 'main']) { const el = byTest(id); if (el) el.innerHTML = ''; }
    const auth = byTest('auth');
    show(auth, true);
    let h = '';
    if (kind === 'register' || kind === 'login') {
      const reg = kind === 'register';
      h = `<h1>${esc(reg ? UI.registerTitle : UI.loginTitle)}</h1>
        <p class="muted">${esc(reg ? UI.registerLead : UI.loginLead)}</p>
        <form class="form" data-kind="${kind}" data-testid="${reg ? 'register-form' : 'login-form'}">
          <label>${esc(UI.email)}<input type="email" name="email" required autocomplete="username" data-testid="${reg ? 'register-email' : 'login-email'}"></label>
          <label>${esc(UI.password)}<input type="password" name="password" required ${reg ? 'minlength="8"' : ''} autocomplete="${reg ? 'new-password' : 'current-password'}" data-testid="${reg ? 'register-password' : 'login-password'}">
            ${reg ? `<small>${esc(UI.passwordMin)}</small>` : ''}</label>
          <label class="check"><input type="checkbox" data-testid="show-password" data-pw="${reg ? 'register-password' : 'login-password'}">${esc(UI.showPassword)}</label>
          <button type="submit" class="primary" data-testid="${reg ? 'register-submit' : 'login-submit'}">${esc(reg ? UI.registerTitle : UI.loginTitle)}</button>
          <p class="notice" data-testid="${reg ? 'register-result' : 'login-result'}" hidden></p>
        </form>
        <p class="authfoot">${esc(reg ? UI.haveAccount : UI.noAccountYet)}
          <button type="button" class="plain" data-auth="${reg ? 'login' : 'register'}">${esc(reg ? UI.loginTitle : UI.registerTitle)}</button></p>
        ${reg ? '' : `<p class="authfoot"><button type="button" class="plain" data-auth="resend">${esc(UI.resendAsk)}</button></p>`}`;
    } else if (kind === 'resend') {
      h = `<h1>${esc(UI.resendTitle)}</h1>
        ${state.resendReason ? `<p class="notice warn" data-testid="resend-reason">${esc(state.resendReason)}</p>` : ''}
        <p class="muted">${esc(UI.resendLead)}</p>
        <form class="form" data-kind="resend" data-testid="resend-form">
          <label>${esc(UI.email)}<input type="email" name="email" required autocomplete="username" data-testid="resend-email"></label>
          <button type="submit" class="primary" data-testid="resend-submit">${esc(UI.resendSubmit)}</button>
          <p class="notice" data-testid="resend-result" hidden></p></form>
        <p class="authfoot"><button type="button" class="plain" data-auth="login">${esc(UI.backToLogin)}</button></p>`;
    } else if (kind === 'sent' || kind === 'resent') {
      h = `<div class="status-icon">✉</div><h1>${esc(UI.checkMailTitle)}</h1>
        <p class="muted" data-testid="${kind === 'sent' ? 'register-result' : 'resend-result'}">${esc(kind === 'sent' ? UI.registerSentLead : UI.resendSentLead)}</p>
        <button type="button" class="primary" data-action="mail-open">${esc(UI.openMailbox)}</button>
        <p class="authfoot"><button type="button" class="plain" data-auth="login">${esc(UI.loginTitle)}</button></p>`;
    } else if (kind === 'invite') {
      h = invitePageHtml();
    }
    /**
     * A NYELVVÁLASZTÓ A BELÉPÉS ELŐTT IS OTT VAN (F91-02).
     *
     * A LELET (a külső ellenőrző fél, chatgpt-v3, R91): „névtelen kezdőlapon nincs nyelvválasztó" —
     * vagyis a regisztráció, a belépés és a megerősítés lépését a felhasználó NEM tudta a saját
     * nyelvén elvégezni, csak a böngészője beállításától remélhette. A választó ugyanazt a
     * jegyzéket kínálja, mint a profil-oldal (LANG-01), és a választás ITT is megmarad (személyhez
     * kötve: névtelenül a `anon` kulcson).
     */
    const langRow = `<div class="langbar" data-testid="auth-langbar">
      <label class="sr-only" for="auth-lang-select">${esc(UI.language)}</label>
      <select id="auth-lang-select" data-testid="lang-select-public" aria-label="${esc(UI.language)}">
        ${enabledLanguages().map((l) => `<option value="${esc(l.code)}" ${l.code === currentLang() ? 'selected' : ''}>${esc(l.endonym)}</option>`).join('')}</select>
      <button type="button" class="plain" data-action="help-open" data-testid="auth-help-open">${esc(HELP.open)}</button>
    </div>`;
    auth.innerHTML = `<div class="card">${langRow}${h}</div>`;
    renderHeader();
  }

  /**
   * A MEGHÍVÓ LAPJA. A cég NEVÉT NEM TALÁLJUK KI: a megfigyelés szándékosan nem árulja el annak,
   * aki nem bizonyította a címzetti csatornát (KUKA-084) — a lap azt mondja, ami MÉRT.
   */
  function invitePageHtml() {
    const o = state.invite;
    const loggedIn = !!(state.me && state.me.subject_id);
    if (!o) return `<div data-testid="section-invite"><h1>${esc(UI.inviteOpenTitle)}</h1><p>${esc(STATE.loading)}</p></div>`;
    let lead = ''; let actions = '';
    if (o.status === 'redeem_as_existing' && loggedIn) {
      lead = UI.inviteAsExistingLead;
      actions = `<button type="button" class="primary" data-action="redeem" data-testid="invite-redeem">${esc(UI.inviteAcceptButton)}</button>`;
    } else if (o.status === 'redeem_as_new') {
      lead = UI.inviteAsNewLead;
      actions = `<button type="button" class="primary" data-auth="register">${esc(UI.registerTitle)}</button>
        <button type="button" data-auth="login">${esc(UI.inviteHaveAccount)}</button>`;
    } else if (o.status === 'redeem_as_existing') {
      lead = UI.inviteLoginFirstLead;
      actions = `<button type="button" class="primary" data-auth="login">${esc(UI.inviteContinueLogin)}</button>`;
    } else if (o.status === 'needs_invitee_identity') {
      lead = UI.inviteNeedsIdentityLead;
      actions = `<button type="button" class="primary" data-auth="login">${esc(UI.loginTitle)}</button>
        <button type="button" data-auth="register">${esc(UI.registerTitle)}</button>`;
    } else {
      lead = reasonText(o.reason, UI.inviteUnknownLead);
      actions = `<button type="button" class="primary" data-auth="login">${esc(UI.loginTitle)}</button>`;
    }
    const hint = o.continue_as && o.continue_as.hint ? o.continue_as.hint : null;
    // A FIÓK NEVE CSAK A BIZONYÍTOTT CÍMZETTNEK (R83/F83-04): a szerver akkor adja ki, ha a néző a
    // meghívás címzetti csatornáját bizonyította — a lap semmit nem következtet ki magától.
    const acc = o.account && o.account.name ? o.account : null;
    return `<div data-testid="section-invite"><div class="status-icon">✉</div>
      <h1>${esc(acc ? tpl('inviteFor', { nev: acc.name }) : UI.inviteGenericTitle)}</h1>
      ${acc ? `<p class="helpbox" data-testid="invite-account">${esc(UI.inviteRoleLine)}: <strong>${esc(ROLE[acc.role] || acc.role)}</strong>${o.invited_by ? ` · ${esc(UI.inviteInvitedByLine)}: <strong>${esc(o.invited_by)}</strong>` : ''}</p>` : ''}
      <p class="muted" data-testid="invite-observe">${esc(lead)}</p>
      ${hint ? `<p class="helpbox">${esc(UI.inviteAddressLine)}: <strong>${esc(hint)}</strong></p>` : ''}
      ${loggedIn ? `<p class="helpbox">${esc(UI.signedInAs)}: <strong>${esc(state.me.email || '')}</strong></p>` : ''}
      <div class="buttonrow">${actions}</div>
      <p class="notice" data-testid="invite-redeem-result" hidden></p>
      <p class="authfoot" data-testid="invite-next">${esc(o.message || UI.inviteWrongAddress)}</p>
      <details class="tech"><summary>${esc(UI.technicalDetails)}</summary>
        <pre data-testid="invite-observe-json">${esc(JSON.stringify(o, null, 2))}</pre></details></div>`;
  }

  // ── TOVÁBBI OLDALAK ─────────────────────────────────────────────────────────────────────────
  function stockCardPage() {
    const gate = stockGate('stockcard');
    if (gate) return head(PAGE.stockcard, UI.stockcardLead) + gate;
    const p = demoSet().products[0];
    if (!p) return head(PAGE.stockcard, UI.stockcardLead) + noDemoBox();
    return head(PAGE.stockcard, UI.stockcardLead)
      + `<section class="card" data-testid="stockcard-table"><h2>${esc(p.name)}</h2><p class="muted">${esc(p.code)} · ${esc(p.kind)}</p>
        <div class="splitline"><span>${esc(UI.stockcardStock)}</span><strong>${esc(p.qty ?? STATE.unknownQty)} ${esc(p.unit || STATE.noUnit)} · ${esc(QUALITY[p.quality] || STATE.notGiven)}</strong></div>
        <div class="splitline"><span>${esc(UI.colWarehouse)}</span><strong>${esc(p.warehouse)}</strong></div>
        <div class="buttonrow"><button type="button" data-go="movements">${esc(PAGE.movements)}</button></div>${demoBadge()}</section>`;
  }

  /**
   * A KÉSZLETMOZGÁSOK UGYANAZON A KAPUN ÁLLNAK, mint a Készletegyenleg (STK-01). Korábban ez a lap
   * a közös tábla-rajzolón ment át, ami a jogot nem kérdezte meg — ezért rajzolt adatot jog nélkül.
   */
  function movementsPage() {
    const gate = stockGate('movements');
    if (gate) return head(PAGE.movements, UI.movementsLead) + gate;
    const d = demoSet();
    if (!d.movements.length) return head(PAGE.movements, UI.movementsLead) + noDemoBox();
    return head(PAGE.movements, UI.movementsLead)
      + `<div class="tablebox" data-testid="movements-table"><div class="toolbar">${demoBadge()}</div>
        <div class="table-scroll"><table><thead><tr><th>${esc(UI.colWhen)}</th><th>${esc(UI.colProduct)}</th><th>${esc(UI.colOperation)}</th><th class="numeric">${esc(UI.colQty)}</th></tr></thead>
        <tbody>${d.movements.map((m) => `<tr><td>${esc(whenText(m.at))}</td><td>${esc(m.product)}</td><td>${esc(m.op)}</td>
          <td class="numeric">${esc(m.qty)} ${esc(m.unit)}</td></tr>`).join('')}</tbody></table></div>
        <div class="tablefoot">${esc(tpl('rowCount', { n: d.movements.length }))}</div></div>`;
  }

  /**
   * ÚJ FIÓK — KÉT FAJTA, VÁLASZTÁSSAL (R83/F83-04). A korábbi alak egy jelölő-kockát adott
   * („Vállalkozási minőséget is rögzítek"), ami belső fogalom volt: a felhasználó nem tudta, mit
   * választ. Most a lap KÉT nevezett fajtát kínál, és a céges adatlap CSAK a vállalkozásnál látszik
   * (közös fióknál adószám-mező nincs). Új jogmodell NEM épült: a fiók ugyanaz, a céges adatlap a
   * különbség — ezért a kérés is ugyanaz a végpont, ugyanazzal a mezőkészlettel (HTP-01).
   */
  function newBusinessPage() {
    // A FAJTA EGY FORRÁSBÓL: a megőrzött űrlap-állapot (FRM-01) — nem külön jelző, ami elcsúszhat
    // tőle (KUKA-039: egy tény, egy otthon).
    const cegkent = !(state.forms.ws && state.forms.ws.kind === 'shared');
    return head(PAGE.new, UI.newLead, helpDot('account.add_business'))
      + `<section class="card"><form class="form" data-kind="ws" data-keep="ws" data-testid="ws-form">
        <fieldset class="choice"><legend>${esc(UI.newKindLegend)}</legend>
          <label class="check"><input type="radio" name="kind" value="business" data-testid="ws-kind-business" ${cegkent ? 'checked' : ''}>
            <span><strong>${esc(STATE.kindBusiness)}</strong><small>${esc(STATE.kindBusinessLead)}</small></span></label>
          <label class="check"><input type="radio" name="kind" value="shared" data-testid="ws-kind-shared" ${cegkent ? '' : 'checked'}>
            <span><strong>${esc(STATE.kindShared)}</strong><small>${esc(STATE.kindSharedLead)}</small></span></label></fieldset>
        <label>${esc(cegkent ? UI.businessName : UI.sharedName)}<input name="name" required data-testid="ws-name" autocomplete="organization"></label>
        <div data-testid="ws-business-fields" ${cegkent ? '' : 'hidden'}>
          <label>${esc(UI.jurisdiction)}
            <select name="jurisdiction" data-testid="ws-jurisdiction">
              <option value="HU">${esc(UI.countryHU)}</option><option value="AT">${esc(UI.countryAT)}</option><option value="DE">${esc(UI.countryDE)}</option>
              <option value="SK">${esc(UI.countrySK)}</option><option value="RO">${esc(UI.countryRO)}</option>
              <option value="__egyeb__">${esc(UI.jurisdictionOther)}</option></select></label>
          <label hidden data-testid="ws-jurisdiction-other-row">${esc(UI.jurisdictionOtherRow)}
            <input name="jurisdiction_other" data-testid="ws-jurisdiction-other" autocomplete="off" maxlength="32">
            <small>${esc(UI.jurisdictionOtherNote)}</small></label>
          <label><span data-testid="ws-tax-label">${esc(UI.taxIdHu)}</span>
            <input name="tax_id" data-testid="ws-tax-id" autocomplete="off" inputmode="numeric">
            <span class="error" data-testid="ws-tax-error" role="alert"></span></label>
          <p class="muted" style="font-size:13px">${esc(UI.businessNote)}</p></div>
        <details class="tech"><summary>${esc(UI.joinExisting)}</summary>
          <p>${esc(UI.joinExistingLead)}</p></details>
        <div class="buttonrow"><button type="submit" class="primary" data-testid="ws-create">${esc(PAGE.new)}</button>
          <button type="button" data-go="overview">${esc(UI.cancel)}</button></div>
        <p class="notice" data-testid="ws-create-result" hidden></p></form></section>`;
  }

  function planPage() {
    const plan = (state.me && state.me.current_plan) || 'starter';
    const opt = (k) => `<option value="${k}" ${plan === k ? 'selected' : ''}>${esc(PLAN[k])}</option>`;
    return head(PAGE.plan, UI.planLead, helpDot('plan.change'))
      + `<section class="card"><form class="form" data-kind="plan" data-keep="plan" data-testid="plan-form">
        <div class="splitline"><span>${esc(UI.planCurrent)}</span><strong>${esc(PLAN[plan] || plan)}</strong></div>
        <div class="splitline"><span>${esc(tpl('scopeViewOf', { mit: SCOPE.keszlet }))}</span><strong>${esc(UI.planAvailableIfGranted)}</strong></div>
        <div class="splitline"><span>${esc(tpl('scopeViewOf', { mit: SCOPE.arak }))}</span><strong>${esc(plan === 'pro' ? UI.planAvailableIfGranted : UI.planNotIncluded)}</strong></div>
        <label style="margin-top:18px">${esc(UI.planField)}<select name="plan" data-testid="plan-select">${opt('starter')}${opt('pro')}</select></label>
        <div class="buttonrow"><button type="submit" class="primary" data-testid="plan-submit">${esc(UI.planSave)}</button></div>
        <p class="notice" data-testid="plan-result" hidden></p>
        <p class="muted" style="font-size:13px">${esc(UI.planNoPurchase)}</p></form></section>`;
  }

  function accountPage() {
    const ws = ((state.me && state.me.workspaces) || []).find((w) => w.book_id === bookId()) || null;
    const b = ws && ws.business ? ws.business : null;
    return head(PAGE.account, UI.accountLead)
      + `<section class="card" data-testid="section-account">
        <div class="splitline"><span>${esc(UI.fieldName)}</span><strong>${esc(accountName())}</strong></div>
        <div class="splitline"><span>${esc(UI.statRole)}</span><strong>${esc(ROLE[state.me.current_role] || state.me.current_role || '—')}</strong></div>
        <div class="splitline"><span>${esc(UI.planField)}</span><strong>${esc(PLAN[state.me.current_plan] || state.me.current_plan || '—')}</strong></div>
        <div class="splitline"><span>${esc(UI.fieldBusinessData)}</span><strong data-testid="representation-note">${esc(b
          ? `${b.jurisdiction || '—'} · ${UI.businessGivenNoCheck}`
          : UI.businessNotRecorded)}</strong></div>
        <p class="muted" style="font-size:13px">${esc(UI.accountRepresentationNote)}</p></section>`;
  }

  function profilePage() {
    const me = state.me;
    return head(PAGE.profile, UI.profileLead, helpDot('shell.language'))
      + `<section class="card">
        <div class="splitline"><span>${esc(UI.email)}</span><strong>${esc(me.email || me.subject_id)}</strong></div>
        <div class="splitline"><span>${esc(UI.emailState)}</span><strong data-testid="personal-space-note">${esc(me.channel_proven ? UI.confirmed : UI.awaitingConfirm)}</strong></div>
        <label class="inline" data-testid="lang-row">${esc(UI.language)}
          <select data-testid="lang-select">${enabledLanguages().map((l) => `<option value="${esc(l.code)}" ${l.code === currentLang() ? 'selected' : ''}>${esc(l.endonym)}</option>`).join('')}</select></label>
        <p class="muted" style="font-size:13px">${esc(UI.languageLead)}</p>
        <p class="muted" style="font-size:13px">${esc(UI.profileEditPending)}</p></section>`;
  }

  function securityPage() {
    const me = state.me;
    return head(PAGE.security, UI.securityLead)
      + `<section class="card">
        <div class="splitline"><span>${esc(UI.signedIn)}</span><strong>${esc(me.email || me.subject_id)}</strong></div>
        <div class="splitline"><span>${esc(UI.emailConfirmed)}</span><strong>${esc(me.channel_proven ? UI.yes : UI.no)}</strong></div>
        <div class="splitline"><span>${esc(UI.actingAs)}</span><strong>${esc(me.acting_as || '—')}</strong></div>
        ${me.channel_proven ? '' : `<div class="buttonrow"><button type="button" data-auth="resend">${esc(UI.resendAsk)}</button></div>`}
        <div class="divider"></div>
        <div class="buttonrow"><button type="button" data-action="logout">${esc(UI.logout)}</button></div>
        <p class="muted" style="font-size:13px">${esc(UI.passwordChangePending)}</p></section>`;
  }

  // ── FŐ RENDER ───────────────────────────────────────────────────────────────────────────────
  function render() {
    renderChrome();
    renderHeader();
    if (state.inviteToken) { renderAuth('invite'); return; }
    if (!(state.me && state.me.subject_id)) {
      if (!['register', 'login', 'resend', 'sent', 'resent'].includes(state.authView)) state.authView = 'login';
      renderAuth(state.authView);
      return;
    }
    state.authView = null;
    // A BELÉPÉSI LAP NEM MARAD OTT REJTVE (UX-01): a belső nézetben nincs belépési/regisztrációs
    // űrlap — sem láthatóan, sem a lap szerkezetében. A rejtett, de meglévő űrlap a böngésző
    // jelszó-kitöltőjének és a képernyőolvasónak is létező mező (KUKA-011 a „látszik-e" fordítottja).
    const auth = byTest('auth');
    if (auth) { auth.innerHTML = ''; show(auth, false); }
    show(byTest('app'), true);
    renderNav();
    renderTabs();
    const main = byTest('main');
    if (!main) return;
    stampEl(main);                  // MINDEN ág kap bélyeget — a fiók nélküli nézet is (PNL-01)
    const n = state.notice;
    let body = '';
    // A BEMUTATÓADAT IS A FIÓKHOZ TARTOZIK (R81 §7): fiók nélkül nincs miből táblát rajzolni —
    // a lap ezt KIMONDJA, és a választóhoz küld, nem mutat gazdátlan sorokat.
    if (!bookId()) {
      main.innerHTML = `<p class="notice ${n ? n.kind : ''}" data-testid="global-notice" ${n ? '' : 'hidden'}>${n ? esc(n.msg) + (n.action ? ` <button type="button" class="plain" data-go="${esc(n.action.go)}">${esc(n.action.label)}</button>` : '') : ''}</p>`
        + head(UI.chooseAccount, UI.chooseAccountLead)
        + emptyBox(STATE.noAccount, UI.chooseAccountBox,
          `<button type="button" class="primary" data-go="new">${esc(PAGE.new)}</button>`);
      renderNav();
      return;
    }
    switch (state.page) {
      case 'overview': body = overviewPage(); break;
      case 'stock': body = stockPage(); break;
      case 'members': body = membersPage(); break;
      case 'new': body = newBusinessPage(); break;
      case 'plan': body = planPage(); break;
      case 'account': body = accountPage(); break;
      case 'profile': body = profilePage(); break;
      case 'security': body = securityPage(); break;
      case 'stockcard': body = stockCardPage(); break;
      case 'movements': body = movementsPage(); break;
      case 'personal': body = head(PAGE.personal, UI.personalLead)
        + emptyBox(UI.personalEmptyTitle, UI.personalEmptyLead); break;
      case 'outbox': body = head(PAGE.outbox, UI.outboxLead)
        + emptyBox(UI.outboxSampleTitle, UI.outboxSampleLead,
          `<button type="button" data-action="mail-open">${esc(UI.demoMailButton)}</button>`); break;
      default: body = tablePage(state.page);
    }
    const noticeAction = n && n.action ? ` <button type="button" class="plain" data-go="${esc(n.action.go)}">${esc(n.action.label)}</button>` : '';
    main.innerHTML = `<p class="notice ${n ? n.kind : ''}" data-testid="global-notice" ${n ? '' : 'hidden'}>${n ? esc(n.msg) + noticeAction : ''}</p>${body}`;
    restoreForms();                 // …és a megkezdett kitöltés nem tűnik el a rajzolással
  }

  /**
   * A NYITOTT KÉPERNYŐ ADATA. EZ az egyetlen hely, ahonnan egy nézet-váltás lekérést indít — a
   * rajzolás maga SOHA nem kérdez (KUKA-209). A `sync: false` azt mondja: a nézetet épp most
   * igazítottuk a szerverhez, nem kell újra megkérdezni.
   */
  function loadPageData() {
    if (!bookId()) return;                 // fiók nélkül nincs mit kérdezni (a lap ezt kimondja)
    if (STOCK_PAGES.includes(state.page)) loadStock({ sync: false });
    if (state.page === 'stock') loadPrice({ sync: false });
    if (state.page === 'members' && isAdmin()) {
      if (state.membersTab === 'invites') loadInvites(); else loadMembers();
    }
  }

  // ── ESEMÉNYEK ───────────────────────────────────────────────────────────────────────────────
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.go) {
      if (b.dataset.go.startsWith('switch:')) { await switchWorkspace(b.dataset.go.slice(7)); return; }
      go(b.dataset.go); return;
    }
    if (b.dataset.auth) { renderAuth(b.dataset.auth); return; }
    if (b.dataset.tab) { state.page = b.dataset.tab; state.notice = null; render(); loadPageData(); return; }
    if (b.dataset.closeTab) {
      state.tabs = state.tabs.filter((x) => x !== b.dataset.closeTab);
      if (state.page === b.dataset.closeTab) state.page = state.tabs[state.tabs.length - 1] || 'overview';
      render(); return;
    }
    if (b.dataset.switch) { await switchWorkspace(b.dataset.switch); return; }
    switch (b.dataset.action) {
      case 'panel-close': closePanel(); break;
      case 'unsaved-keep': closePanel(); break;
      case 'unsaved-discard': closePanel(); await switchWorkspace(b.dataset.switchTo, { discarded: true }); break;
      case 'nav-close': byTest('nav').classList.remove('open'); break;
      case 'mail-open': closePanel(); await mailPanel(); break;
      case 'mail-refresh': await mailPanel(); break;
      case 'invite-open': invitePanel(); break;
      case 'members-tab': state.membersTab = b.dataset.mtab; render(); loadPageData(); break;
      case 'member-open': memberPanel(b.dataset.subject); break;
      case 'revoke-start': revokePanel(b.dataset.subject); break;
      case 'clear-search': state.search = ''; state.processState = ''; render(); break;
      case 'row-open': detailPanel(b.dataset.list, b.dataset.row); break;
      case 'dismiss-after-create': state.afterCreate = null; render(); break;
      case 'invite-from-create': state.afterCreate = null; go('members'); invitePanel(); break;
      case 'reload-stock': await loadStock(); break;
      case 'reload-price': await loadPrice(); break;
      // ── SEGÍTSÉG (SEG-01). A panel CSAK innen nyílik: felhasználói kattintásra.
      case 'help-open': await openHelp(); break;
      case 'help-close': closeHelp(); break;
      case 'help-view': state.help.view = b.dataset.view; state.help.topic = null; renderHelp(); break;
      case 'help-topic': state.help.topic = b.dataset.topic || null; state.help.view = 'guides';
        if (!state.help.open) await openHelp('guides', b.dataset.topic || null); else renderHelp(); break;
      case 'faq-open': state.help.faqOpen = state.help.faqOpen === b.dataset.faq ? null : b.dataset.faq;
        state.help.view = 'faq'; if (!state.help.open) await openHelp('faq'); else renderHelp(); break;
      // A SÚGÓBÓL INDULÓ TOVÁBBLÉPÉS VALÓDI KÉPERNYŐRE VISZ (R89 §4) — a panel bezárul, hogy ne
      // fedje el a fő műveletet.
      case 'help-go': closeHelp(); go(b.dataset.page); break;
      // ── BEMUTATÓ (TUR-01)
      case 'tour-start': await startTour(b.dataset.tour); break;
      case 'tour-next': {
        const r = tourMod.advance(state.tour);
        if (!r.moved && r.why === 'finished') { state.tourFinished = true; state.tourBlocked = null; }
        // A FELTÁRÁSRA VÁRÁS és a HIÁNYZÓ CÉL nem „elakadás": az elsőt a buborék MÁR kimondja, a
        // másodikat a rajzolás nevezett megszakításként írja ki — egyikre sem teszünk második,
        // figyelmeztető mondatot (a rajzolás a MAI DOM-ból dönt — TUR-01).
        else if (!r.moved) state.tourBlocked = ['targetPending', 'targetMissing'].includes(r.why) ? null : r.why;
        else state.tourBlocked = null;
        renderTour(); break;
      }
      case 'tour-back': tourMod.back(state.tour); state.tourBlocked = null; renderTour(); break;
      // A BEFEJEZÉS UGYANAZT AZ ÁLLAPOTELLENŐRZÉST FUTTATJA, MINT A TOVÁBB (F91-01, a külső fél
      // R91-es lelete: függő feladat mellett is „a bemutató végére értél" állt a lapon).
      case 'tour-finish': {
        const f = tourMod.finishRun(state.tour);
        if (f.ok) { state.tourFinished = true; state.tourBlocked = null; }
        else state.tourBlocked = ['targetPending', 'targetMissing'].includes(f.why) ? null : f.why;
        renderTour(); break;
      }
      // A TUDATOS KIHAGYÁS: külön művelet és külön ÁLLAPOT — nem hamis befejezés (F91-01).
      case 'tour-skip': {
        const r = tourMod.skipStep(state.tour);
        if (!r.moved && r.why === 'finished') state.tourFinished = true;
        state.tourBlocked = null;
        renderTour(); break;
      }
      // AZ ÚJRAINDÍTÁS A HORDOZOTT LEZÁRÁSRÓL IS MŰKÖDIK (F93-01): a záró lapon ott a gomb, tehát
      // működnie kell — a felkínált művelet nem lehet hatástalan (KUKA-160).
      case 'tour-restart': {
        const id = state.tour ? state.tour.id : (state.tourCarry ? state.tourCarry.id : null);
        if (id) { state.tourCarry = null; await startTour(id); }
        break;
      }
      // A KILÉPÉS ELSZÁMOL: a záró lap KIÍRJA, mi lett elvégezve és mi maradt ki — a néma eltűnés
      // volt a hiba párja (F91-01). A záró lap „Bezárom" gombja (`tour-close`) veszi le a lapról.
      case 'tour-exit': {
        if (state.tour && !state.tourFinished && !state.tourAborted) {
          tourMod.exitRun(state.tour, 'exit');
          state.tourFinished = true; state.tourBlocked = null;
          renderTour(); break;
        }
        state.tour = null; state.tourFinished = false; state.tourAborted = null; state.tourBlocked = null;
        state.tourCarry = null;                 // a lezárást a felhasználó elolvasta és bezárta
        renderTour(); break;
      }
      // ── CHAT (AST-01). A javasolt kérdés csak KITÖLTI a mezőt — nem küldi el magától.
      case 'chat-suggest': { state.chat.draft = b.dataset.q || ''; renderHelp(); const inp = byTest('chat-input'); if (inp) inp.focus(); break; }
      case 'chat-new': state.chat = emptyChat(); renderHelp(); break;
      case 'chat-clear': state.chat = emptyChat(); state.chat.cleared = true; renderHelp(); break;
      // A SEGÉD FOLYTATÁSA: a műveletet a SZERVER engedélyezte, és CSAK megnyit — nem ír (AST-01).
      case 'chat-do': {
        const allowed = ((state.astStatus && state.astStatus.actions) || []).find((a) => a.id === b.dataset.do);
        if (!allowed) { formResult('chat-result', reasonText('action_not_allowed'), 'bad'); break; }
        closeHelp();
        if (allowed.page) go(allowed.page);
        if (allowed.panel === 'invite') invitePanel();
        if (allowed.panel === 'mailbox') await mailPanel();
        if (allowed.focus) { const f = byTest(allowed.focus); if (f && typeof f.focus === 'function') f.focus(); }
        break;
      }
      case 'logout': await doLogout(); break;
      case 'revoke': await doRevoke(b.dataset.subject, b); break;
      case 'redeem': await doRedeem(); break;
      default: break;
    }
  });

  document.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const kind = f.dataset.kind;
    if (kind === 'register' || kind === 'login') return doAuth(f, kind);
    if (kind === 'resend') return doResend(f);
    if (kind === 'ws') return doCreateWorkspace(f);
    if (kind === 'plan') return doPlan(f);
    if (f.dataset.testid === 'chat-form') return doAsk(f);
    if (f.dataset.testid === 'invite-form') return doInvite(f);
    if (f.dataset.testid === 'member-scope-form') return doGrant(f.dataset.subject, f.elements.scope.value, f);
    return undefined;
  });

  // A MEGKEZDETT KITÖLTÉS RÖGZÍTÉSE — EGY helyen, minden megőrzendő űrlapra (FRM-01).
  for (const ev of ['input', 'change']) {
    document.addEventListener(ev, (e) => {
      if (restoring) return;                 // a visszaállítás nem „felhasználói hozzáérés"
      const f = e.target && e.target.form;
      if (f && f.dataset && f.dataset.keep) rememberForm(f);
    }, true);
  }

  document.addEventListener('input', (e) => {
    const t = e.target && e.target.dataset ? e.target.dataset.testid : null;
    // A SÚGÓ KERESŐI GÉPELÉS KÖZBEN SZŰRNEK, és a kurzor a helyén marad (ugyanaz a minta, mint a
    // lista-keresőnél). MODELLHÍVÁS NINCS: ez helyi keresés a letöltött útmutatókban.
    if (t === 'guide-search' || t === 'faq-search') {
      const pos = e.target.selectionStart;
      if (t === 'guide-search') { state.help.search = e.target.value; state.help.topic = null; } else state.help.faqSearch = e.target.value;
      renderHelp();
      const again = byTest(t);
      if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch { /* nem szöveges mező */ } }
      return;
    }
    if (t === 'chat-input') { state.chat.draft = e.target.value; return; }
    if (t !== 'list-search') return;
    const pos = e.target.selectionStart;
    state.search = e.target.value;
    render();
    const again = byTest('list-search');
    if (again) { again.focus(); again.setSelectionRange(pos, pos); }
  });
  document.addEventListener('change', async (e) => {
    if (restoring) return;                   // a visszaállítás nem felhasználói művelet
    const d = e.target.dataset || {};
    if (d.testid === 'show-password') {
      const pw = byTest(d.pw);
      if (pw) pw.type = e.target.checked ? 'text' : 'password';
    }
    // A FAJTA VÁLTÁSA ÚJRARAJZOL (a céges adatlap és a név-felirat is változik), és a FÓKUSZ
    // visszatér a választóra — billentyűvel is végigjárható marad (UX-18).
    if (d.testid === 'ws-kind-business' || d.testid === 'ws-kind-shared') {
      const jel = d.testid;
      render();
      const ujra = byTest(jel);
      if (ujra) ujra.focus();
      return;
    }
    // NYELVVÁLTÁS (LANG-01). A választás azonnal érvényes: a szótár élő nézetei miatt EGYETLEN
    // újrarajzolás elég. A nézethez kötött tudás-index és segéd-állapot ÜRÜL, mert azok a kért
    // nyelven jöttek (a szerver a `lang` mezőt olvasta) — különben magyar index maradna angol lapon.
    if (d.testid === 'lang-select' || d.testid === 'lang-select-public') {
      // UGYANAZ AZ EGY SZABÁLY, mint a visszaállításnál (F95-01): a döntés a modulé, a mentés a
      // döntés következménye — nem három helyen kitalált mező-név. A tároló hibája nem állítja meg
      // a váltást (privát ablak · letiltott tároló): a nyelv váltódik, csak nem marad meg.
      const decision = decideLang({ asked: e.target.value, askedSource: 'choice' });
      const code = useLang(decision);
      /**
       * A GENERÁCIÓ MINDEN VÁLTÁSNÁL NŐ (F93-02) — akkor is, ha a nyelv ugyanoda ér vissza. A
       * MÉRT lelet: magyar → német → magyar közben visszatartott chat-válasz megjelent, mert az
       * eldobás a nyelv ÉRTÉKÉT hasonlította, a váltás TÉNYÉT nem (a külső ellenőrző fél, R93).
       */
      state.langGen += 1;
      // AZ ÚTON TUDATOSAN VÁLASZTOTT NYELV — ezt viszi át az új személy első belépése (F93-02).
      // A `useLang` már eltette (`persist_choice`), ezért itt NINCS második írás (KUKA-018).
      state.astStatus = null; state.helpIndex = null;
      render();
      // A TUDÁS A KÉRT NYELVEN JÖN, ezért a nyelvváltás UTÁN újra kell kérni — és ez a FUTÓ
      // bemutatóra is áll: a lépés-szövege a régi nyelvű válaszból származik (F91-03).
      await loadHelpData();
      if (state.help.open) renderHelp();
      retextTour();
      // A KÉRT ÉS A KAPOTT NYELV KÜLÖNBSÉGE KIMONDVA — néma elnyelés nincs (KUKA-012).
      notice(tpl('langSwitched', { nyelv: currentEndonym() }), got === wanted ? 'ok' : 'warn');
      const again = byTest(d.testid);
      if (again && typeof again.focus === 'function') again.focus();
      return;
    }
    if (d.testid === 'guide-search') { state.help.search = e.target.value; renderHelp(); return; }
    if (d.testid === 'faq-search') { state.help.faqSearch = e.target.value; renderHelp(); return; }
    if (d.testid === 'process-state') { state.processState = e.target.value; render(); return; }
    if (d.testid === 'ws-jurisdiction') {
      setText(byTest('ws-tax-label'), e.target.value === 'HU' ? UI.taxIdHu : UI.taxIdOther);
      show(byTest('ws-jurisdiction-other-row'), e.target.value === '__egyeb__');
    }
  });

  /**
   * ESC — a súgó-panel és a bemutató is zárul, és a FÓKUSZ visszatér a megnyitó gombra (R89 §4:
   * „Esc bezárás és fókusz-visszaadás"). A súgó `<dialog>`, ezért a böngésző maga is elkapja az
   * Esc-et: a `close` esemény ADJA VISSZA a fókuszt, hogy mindkét úton ugyanaz történjen (KUKA-039).
   */
  const helpEl = byTest('help-panel');
  if (helpEl) helpEl.addEventListener('close', () => {
    state.help.open = false;
    const b = byTest('help-body'); if (b) b.innerHTML = '';
    const opener = byTest('help-open');
    if (opener && typeof opener.focus === 'function') opener.focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    // HA PÁRBESZÉD VAN NYITVA, AZ ESC AZT ZÁRJA — és a bemutató MEGMARAD (saját R89-es lelet).
    // A korábbi alakom a bemutatót is kilőtte: aki a meghívó-panelt Esc-cel csukta be a bemutató
    // ötödik lépésénél, annak a bemutatója is eltűnt — egy szabályos lépés vitte el a saját
    // folytatását (KUKA-160: amit a képernyő felkínál, annak végig kell mennie).
    if (document.querySelector('dialog[open]')) return;
    if (state.tour || state.tourAborted || state.tourFinished || state.tourCarry) {
      tourMod.exitRun(state.tour, 'escape');
      state.tour = null; state.tourFinished = false; state.tourAborted = null; state.tourBlocked = null;
      state.tourCarry = null;
      renderTour();
      const opener = byTest('help-open');
      if (opener && typeof opener.focus === 'function') opener.focus();
    }
  });

  const navToggle = byTest('nav-toggle');
  if (navToggle) navToggle.addEventListener('click', () => {
    const nav = byTest('nav');
    nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(nav.classList.contains('open')));
  });
  const brand = byTest('brand');
  if (brand) brand.addEventListener('click', () => { if (state.me && state.me.subject_id) go('overview'); });
  const mailOpen = byTest('demo-mail-open');
  if (mailOpen) mailOpen.addEventListener('click', () => mailPanel());

  // ── MŰVELETEK ───────────────────────────────────────────────────────────────────────────────
  function formResult(testid, msg, kind) {
    const el = byTest(testid);
    if (!el) return;
    el.textContent = msg || '';
    el.className = `notice ${kind || ''}`;
    el.hidden = !msg;
  }

  async function doAuth(form, kind) {
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    if (kind === 'register') {
      // A KÉRT NYELV A LEVÉLLEL IS MEGY (F91-02): a megerősítő levél és a lapja ezen a nyelven szól.
      const r = await api('POST', '/api/register', { email, password, lang: currentLang() });
      if (!r.ok) { formResult('register-result', reasonText(r.reason, r.message), 'bad'); return; }
      renderAuth('sent');
      return;
    }
    const r = await api('POST', '/api/login', { email, password });
    if (!r.ok) { formResult('login-result', reasonText(r.reason, reasonText('invalid_credentials')), 'bad'); return; }
    newContext('login');
    state.tabs = ['overview'];
    state.page = 'overview';
    state.notice = null;
    // A FÜGGŐ MEGHÍVÁS A SZERVEREN ÁLL: a belépés visszahozza, akkor is, ha a felhasználó a sima
    // címen lépett be, nem a meghívó hivatkozásán (R81 §5/04 · UX-09).
    if (!state.inviteToken && typeof r.pending_invite_token === 'string' && r.pending_invite_token) {
      state.inviteToken = r.pending_invite_token;
    }
    await refreshMe();
    if (state.inviteToken) { await observeInvite(); render(); }
  }

  /**
   * A SEMLEGES LEVÉL-OLDAL CSAK SIKERES SZERVER-VÁLASZ UTÁN (R83/F83-05).
   *
   * A LELET: a kérés megszakítása után a lap ugyanúgy kiírta, hogy „új levelet küldünk" — a válasz
   * MÉRÉSE elmaradt, tehát a lap KÜLDÉST ÁLLÍTOTT, ami meg sem történt (KUKA-121 · KUKA-127 a saját
   * felületünkre fordítva). A három kimenet KÜLÖN mondat, és a semlegesség egyiknél sem sérül:
   * a lap SOHA nem mondja meg, tartozik-e fiók a címhez (KUKA-084).
   */
  async function doResend(form) {
    const cim = form.elements.email.value.trim();
    formResult('resend-result', UI.resendInProgress, '');
    const r = await api('POST', '/api/verification/resend', { email: cim, lang: currentLang() });
    const v = requestOutcome(r);
    if (v === 'network') {
      // A CÍM A MEZŐBEN MARAD: nem kell újra beírni, és nem állítunk küldést (UX-14).
      formResult('resend-result', reasonText('network_error'), 'bad');
      return;
    }
    if (v === 'uncertain') {
      formResult('resend-result', STATE.uncertainWrite, 'warn');
      return;
    }
    if (v === 'refused') { formResult('resend-result', reasonText(r.reason, r.message), 'bad'); return; }
    renderAuth('resent');
  }

  async function doLogout() {
    newContext('logout');
    await api('POST', '/api/logout', {});
    state.me = null; state.ctx = { subject: null, book: null }; state.members = [];
    // AZ ELŐZŐ EMBER VÁLASZTÁSA NEM A KÖVETKEZŐ EMBERÉ (F93-02, a külső fél kikötése): a tárolt
    // választás személyhez kötve megmarad, de az ÚTON tett választást itt eldobjuk — különben egy
    // kijelentkezés után belépő MÁSIK ember örökölné.
    rememberChoice(null);
    state.tabs = ['overview']; state.page = 'overview'; state.notice = null; state.invite = null;
    closePanel();
    renderAuth('login');
  }

  /**
   * A SAJÁT ELHAGYÁS MEGKÉRDEZ (R83/F83-02). Nem „biztos?" párbeszéd: KIMONDJA, mi a tét, és két
   * NEVEZETT folytatást ad. A KÜLSŐ okból jött nézet-váltás NEM ide tartozik — azt nem kérdezzük
   * meg, mert nem a felhasználó kezdeményezte; ott a régi kitöltés ELDOBÁSA a szabály (PNL-01).
   */
  function unsavedPanel(id) {
    openPanel(`<div data-testid="unsaved-dialog"><div class="dialoghead"><div>
        <h2>${esc(UI.unsavedTitle)}</h2>
        <p class="muted">${esc(UI.unsavedLead)}</p></div></div>
      <div class="buttonrow"><button type="button" class="primary" data-action="unsaved-keep"
          data-testid="unsaved-keep">${esc(UI.unsavedKeep)}</button>
        <button type="button" class="danger" data-action="unsaved-discard" data-switch-to="${esc(id)}"
          data-testid="unsaved-discard">${esc(UI.unsavedDiscard)}</button></div></div>`, false);
  }

  async function switchWorkspace(id, opts) {
    if (hasUnsaved() && !(opts && opts.discarded)) { unsavedPanel(id); return; }
    forgetForms();
    newContext('workspace_switch');
    resetViewCaches();
    state.tabs = ['overview']; state.page = 'overview'; state.notice = null; state.afterCreate = null;
    closePanel();
    const sw = byTest('account-switcher'); if (sw) sw.open = false;
    render();                       // ELŐBB ÜRÍT, aztán kér — a régi fiók adata azonnal lekerül
    const r = await api('POST', '/api/session/workspace', { book_id: id });
    if (!r.ok) { notice(reasonText(r.reason, r.message), 'bad'); await refreshMe(); return; }
    // A NEVET A SAJÁT LISTÁJÁBÓL vesszük (ott áll a `personal` tény) — a válasz nevét tartalékként.
    const cel = ((state.me && state.me.workspaces) || []).find((w) => w.book_id === id);
    notice(tpl('accountOpened', { nev: accountLabel(cel) || r.name || r.book_id }), 'ok');
    await refreshMe();
  }

  async function doCreateWorkspace(form) {
    // UGYANAZ A KÖZÖS ŐR (PNL-01), DE A DÖNTÉS A SZERVERÉ (R85/F85-01). A helyi bélyeg csak az
    // ITT látható nézet-változást fogja meg; ha egy MÁSIK fül lépett be más emberként, a régi lap
    // állapota nem mozdul. Ezért a kérés VISZI a megnyitáskori alanyt, és a szerver ÍRÁS ELŐTT
    // utasít el — a kliens-oldali ellenőrzés ezt kiegészíti, nem helyettesíti.
    const nyitottNezet = stampOf(form);
    if (await refuseStale(nyitottNezet)) return;
    const name = form.elements.name.value.trim();
    const body = { name };
    if (nyitottNezet.subject) body.expected_subject_id = nyitottNezet.subject;
    const cegkent = !form.elements.kind || form.elements.kind.value === 'business';
    if (cegkent) {
      const valasztott = form.elements.jurisdiction.value;
      const jurisdiction = valasztott === '__egyeb__' ? form.elements.jurisdiction_other.value.trim() : valasztott;
      body.business = { jurisdiction, tax_id: form.elements.tax_id.value };
    }
    setText(byTest('ws-tax-error'), '');
    const input = byTest('ws-tax-id');
    if (input) { input.classList.remove('fieldbad'); input.removeAttribute('aria-invalid'); }
    const r = await api('POST', '/api/workspaces', body);
    if (!r.ok && r.reason === 'context_mismatch') {
      // MÁSIK EMBER LÉPETT BE EBBEN A BÖNGÉSZŐBEN. A kitöltést NEM mentettük el, és nem is visszük
      // át az ő fiókjába: a szerkesztő érvénytelen, a lap pedig kimondja a folytatást.
      forgetForms();
      // A RÉGI SZERKESZTŐ ÉRVÉNYTELEN: nem hagyjuk kint az űrlapot a MÁSIK ember nézetében, mert az
      // azt ígérné, hogy onnan folytatható. A folytatást a mondat adja meg.
      state.page = 'overview'; state.tabs = ['overview'];
      notice(STATE.otherPersonSignedIn, 'warn');
      await refreshMe();
      notice(STATE.otherPersonSignedIn, 'warn');   // a frissítés saját mondatát ez a konkrétabb váltja
      render();
      return;
    }
    if (!r.ok) {
      // A HIBA A MEZŐHÖZ KÖTÖTT (UX-14): a hibás mező jelölve és megnevezve, a fenti összegzés rövid.
      // A kiváltó lelet: `{"tax_id":"---"}` ⇒ HTTP 500 és félig létrejött fiók (R77/F77-02) — ma a
      // szerver ÍRÁS ELŐTT utasítja el, a lap pedig a MEZŐNÉL mondja meg, mit kell javítani.
      if (String(r.field || '').startsWith('business.tax_id')) {
        setText(byTest('ws-tax-error'), reasonText(r.reason, UI.taxIdRequired));
        if (input) { input.classList.add('fieldbad'); input.setAttribute('aria-invalid', 'true'); input.focus(); }
        formResult('ws-create-result', UI.wsNotCreated, 'bad');
      } else {
        formResult('ws-create-result', reasonText(r.reason, r.message), 'bad');
      }
      return;
    }
    // A SIKER TANÚSÍTÁSA MEGELŐZI A KONTEXTUS-VÁLTÁST (F91-01, a külső fél kód-vizsgálati leletei).
    // A `newContext` lépteti a generációt, és a `refreshMe` átváltja az aktív fiókot az ÚJ cégre —
    // ettől a bemutató nézet-kötése `contextChanged`-re fut, tehát a LÉTREHOZÁS bemutatója soha nem
    // tudta volna befejezni a saját feladat-lépését. A szerver válasza (`r.ok`) MÁR megvan: a tanú
    // ITT keletkezik, nem a rajzolás után (KUKA-129: a nyugtának is igazat kell mondania).
    tourTaskDone('workspace.created');
    /**
     * ÉS A LEZÁRÁS IS ITT SZÜLETIK, A VÁLTÁS ELŐTT (F93-01, a külső fél R93-as reprodukciója).
     *
     * A SORRENDCSERE NEM LETT VOLNA ELÉG: a `refreshMe` → `resetViewCaches` a futó bemutatót MINDEN
     * esetben üríti, tehát bárhová tesszük a tanúsítást, a váltás utáni takarítás elviszi. Ezért a
     * MÁR BIZONYÍTOTT eredményről itt készül a hordozható elszámolás — az új fiókban ezt látja a
     * felhasználó, és csak ezt: se cél, se szerkesztő-állapot, se jog nem megy át.
     */
    if (state.tour) {
      const fin = tourMod.finishRun(state.tour);
      if (fin.ok) state.tourCarry = tourMod.carrySnapshot(state.tour);
    }
    newContext('workspace_created');
    forgetForms();                  // A LÉTREHOZÁS LEZÁRTA A MUNKÁT: nincs mit megőrizni
    state.tabs = ['overview']; state.page = 'overview';
    await refreshMe();
    // EGY SIKERJELZÉS (R83/F83-04): a fejléc-üzenet ÉS a kártya nem mondja ugyanazt kétszer — a
    // fejléc-sáv jelzi a tényt, a kártya a KÖVETKEZŐ LÉPÉST kérdezi meg.
    state.afterCreate = r.name || name;
    notice(tpl(cegkent ? 'accountCreated' : 'sharedCreated', { nev: r.name || name }), 'ok');
    render();
  }

  async function doPlan(form) {
    const v = stampOf(form);
    if (await refuseStale(v)) return;
    const r = await apiInContext('POST', '/api/workspaces/plan', { plan: form.elements.plan.value }, v);
    const verdict = contextBindingVerdict(r, v);
    if (!verdict.bound) { formResult('plan-result', unboundMessage(verdict.why, UNBOUND), 'warn'); await contextChangedNotice(verdict.why); return; }
    if (!r.ok) { formResult('plan-result', reasonText(r.reason, r.message), 'bad'); return; }
    // A VISSZAJELZÉS A FRISSÍTÉS UTÁN SZÜLETIK: a frissítés újrarajzolja a képernyőt, és egy
    // előbb kiírt üzenetet elmosna (ugyanaz az osztály, mint a létrehozás-kártyánál).
    forgetForm('plan');                      // elmentve ⇒ nincs mit megőrizni (és nincs mit kérdezni)
    await refreshMe();
    formResult('plan-result', tpl('planSaved', { csomag: PLAN[r.plan] || r.plan }), 'ok');
    tourTaskDone('plan.saved');              // IGAZOLT mentés után (TUR-01)
  }

  async function doInvite(form) {
    const v = stampOf(form);
    if (await refuseStale(v)) return;
    const r = await apiInContext('POST', '/api/invites', {
      email: form.elements.email.value.trim(), role: form.elements.role.value, scope: form.elements.scope.value,
      // A MEGHÍVÓ LEVÉL A MEGHÍVÓ nyelvén szól — a címzett a saját nyelvét a lapon állítja át (F91-02).
      lang: currentLang(),
    }, v);
    const verdict = contextBindingVerdict(r, v);
    if (!verdict.bound) { formResult('invite-result', unboundMessage(verdict.why, UNBOUND), 'warn'); await contextChangedNotice(verdict.why); return; }
    if (!r.ok) { formResult('invite-result', reasonText(r.reason, r.message), 'bad'); return; }
    formResult('invite-result', tpl('inviteReady', { mikor: whenText(r.expires_at) }), 'ok');
    // A BEMUTATÓ FELADAT-LÉPÉSE ITT LESZ IGAZOLT: a szerver TÉNYLEGESEN létrehozta a meghívót. A
    // gomb megnyomása önmagában nem siker (TUR-01 · KUKA-129).
    tourTaskDone('invite.created');
    show(byTest('invite-mail-row'), true);
    if (state.page === 'members' && state.membersTab === 'invites') await loadInvites();
  }

  async function doGrant(id, scope, form) {
    const v = stampOf(form);
    if (await refuseStale(v)) return;
    const gen = state.generation;
    const r = await apiInContext('POST', '/api/members/scope', { subject_id: id, scope }, v);
    const verdict = contextBindingVerdict(r, v);
    closePanel();
    if (!verdict.bound) { await contextChangedNotice(verdict.why); return; }
    if (gen !== state.generation) { notice(reasonText('context_mismatch'), 'warn'); render(); return; }
    const m = (state.members || []).find((x) => x.subject_id === id);
    const who = m ? (m.email || id) : id;
    if (r.ok) {
      tourTaskDone('grant.saved');           // IGAZOLT mentés után (TUR-01 · F91-01)
      const mondat = tpl('memberCanSee', { ki: who, mit: SCOPE_ACC[scope] || SCOPE[scope] || scope });
      formResult('members-result', mondat, 'ok');
      toast(mondat);
    } else {
      formResult('members-result', reasonText(r.reason, r.message), 'bad');
    }
    await loadMembers();
  }

  async function doRevoke(id, btn) {
    const v = stampOf(btn);
    if (await refuseStale(v)) return;
    const gen = state.generation;
    const r = await apiInContext('POST', '/api/members/revoke', { subject_id: id }, v);
    const verdict = contextBindingVerdict(r, v);
    closePanel();
    if (!verdict.bound) { await contextChangedNotice(verdict.why); return; }
    if (gen !== state.generation) { notice(reasonText('context_mismatch'), 'warn'); render(); return; }
    const m = (state.members || []).find((x) => x.subject_id === id);
    const who = m ? (m.email || id) : id;
    formResult('members-result', r.ok ? tpl('memberRevoked', { ki: who, nev: accountName() }) : reasonText(r.reason, r.message), r.ok ? 'ok' : 'bad');
    await loadMembers();
  }

  // ── MEGHÍVÓ ─────────────────────────────────────────────────────────────────────────────────
  async function observeInvite() {
    if (!state.inviteToken) return;
    await api('POST', '/api/invites/pending', { token: state.inviteToken });
    state.invite = await api('GET', `/api/invites/observe?token=${encodeURIComponent(state.inviteToken)}`);
  }
  async function doRedeem() {
    const r = await api('POST', '/api/invites/redeem', { token: state.inviteToken });
    if (!r.ok) { formResult('invite-redeem-result', reasonText(r.reason, r.message), 'bad'); return; }
    state.inviteToken = null;
    state.invite = null;
    history.replaceState(null, '', '/');
    newContext('invite_redeemed');
    state.tabs = ['overview']; state.page = 'overview';
    await refreshMe();
    notice(`${tpl('accountJoined', { nev: accountName() })} ${UI.inviteJoinedScopeNote}`, 'ok');
    render();
  }

  // ── INDULÁS ─────────────────────────────────────────────────────────────────────────────────
  (async function start() {
    const url = new URL(location.href);
    // A NYELV AZ ELSŐ RAJZOLÁS ELŐTT ÁLL BE (F91-02): a megerősítő levélből visszatérő út a címben
    // hozza (`?lang=`), különben ennek a SZEMÉLYNEK a tárolt választása, végül a böngésző kérése.
    // Névtelenül a `anon` kulcs a személy — a másik ember beállítása nem szivárog át.
    restoreLang({ fromUrl: true });
    state.inviteToken = url.searchParams.get('invite');
    const megerosites = url.searchParams.get('megerosites');
    if (megerosites) {
      state.resendReason = reasonText(megerosites, reasonText('challenge_not_found'));
      state.authView = 'resend';
    }
    await refreshMe();
    if (state.inviteToken) { await observeInvite(); render(); }
  })();
})();
