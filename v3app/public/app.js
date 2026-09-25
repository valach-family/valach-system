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
import { PAGE, NAV_GROUPS, NAV_ADMIN, NAV_PERSONAL, ROLE, SCOPE, SCOPE_ACC, PLAN, STATE, reasonText, whenText, tpl, accountLabel } from './texts.mjs';
import { demoFor, demoSource, QUALITY_LABEL } from './demoData.mjs';

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
    if (state.noticeSeq === before) notice(unboundMessage(why), 'warn');
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
        notice('Másik felhasználó jelentkezett be ebben a böngészőben. Az oldal frissült.', 'warn');
      } else if (accessLost) {
        notice(`${tpl('accountLost', { nev: prevBookName })} A személyes fiókodat továbbra is használhatod.`,
          'warn', personal ? { label: 'Személyes fiók megnyitása', go: 'switch:' + personal } : null);
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

  // ── FEJLÉC ──────────────────────────────────────────────────────────────────────────────────
  function renderHeader() {
    const me = state.me;
    const loggedIn = !!(me && me.subject_id);
    const list = (me && me.workspaces) || [];
    setText(byTest('header-workspace'), loggedIn ? (accountName() || 'Válassz fiókot') : 'nincs fiók');
    setText(byTest('header-subject'), loggedIn ? (me.email || me.subject_id) : 'nincs bejelentkezve');
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
        ${personal.length ? `<div class="group">Személyes</div><ul class="menu-list">${personal.map(line).join('')}</ul>` : ''}
        ${shared.length ? `<div class="group">Vállalkozások és közös fiókok</div><ul class="menu-list">${shared.map(line).join('')}</ul>` : ''}
        <div class="divider"></div>
        <button type="button" data-go="new" data-testid="ws-add">+ Vállalkozás hozzáadása</button>` : '';
    }
    const pm = byTest('profile-menu');
    if (pm) {
      pm.innerHTML = loggedIn ? `
        <div class="identity"><strong>${esc(me.email || me.subject_id)}</strong>
          <small>${me.channel_proven ? 'E-mail-cím megerősítve' : 'E-mail-cím megerősítésre vár'}</small></div>
        <button type="button" data-go="profile">${PAGE.profile}</button>
        <button type="button" data-go="security">${PAGE.security}</button>
        <div class="divider"></div>
        <button type="button" data-action="logout" data-testid="logout">Kijelentkezés</button>` : '';
    }
  }

  // ── MENÜ ÉS MUNKALAPOK ──────────────────────────────────────────────────────────────────────
  function renderNav() {
    const nav = byTest('nav');
    if (!nav) return;
    const item = (p) => `<button type="button" class="navitem ${state.page === p ? 'active' : ''}" data-go="${p}"
      data-testid="nav-${p}" ${state.page === p ? 'aria-current="page"' : ''}>${PAGE[p]}</button>`;
    let h = '<button type="button" class="mobile-close" data-action="nav-close">Menü bezárása ×</button>';
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
      ${p === 'overview' ? '' : `<button type="button" class="x" data-close-tab="${p}" aria-label="${PAGE[p]} lap bezárása">×</button>`}</div>`).join('');
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
  function emptyBox(title, lead, action) {
    return `<div class="empty"><h2>${esc(title)}</h2><p>${esc(lead)}</p>${action || ''}</div>`;
  }
  const demoBadge = () => `<span class="badge gray">${STATE.demo}</span>`;
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
  const techDetails = (obj) => `<details class="tech"><summary>Technikai részletek</summary><pre>${esc(JSON.stringify(obj, null, 2))}</pre></details>`;

  /**
   * A LISTÁK KÖZÖS RAJZOLÓJA — sorra kattintható RÉSZLETEZŐ panellel (R83/F83-04).
   *
   * A LELET: a lista sorai nem voltak megnyithatók, tehát a felület felsorolt, de nem MUTATOTT
   * semmit. A részletező UGYANEZEKBŐL a fixture-sorokból épül — új üzleti végrehajtás NINCS
   * (se mozgás, se könyvelés, se írás), és a panel ezt KIMONDJA.
   */
  const ROW_DEF = Object.freeze({
    products: { cols: ['Termék', 'Kód', 'Típus', 'Raktár'], of: (d) => d.products,
      row: (p) => [`<strong>${esc(p.name)}</strong>`, esc(p.code), esc(p.kind), esc(p.warehouse)] },
    partners: { cols: ['Partner', 'Kapcsolat', 'Ország'], of: (d) => d.partners,
      row: (p) => [`<strong>${esc(p.name)}</strong>`, esc(p.kind), esc(p.country)] },
    warehouses: { cols: ['Raktár', 'Típus', 'Itt tartott mintatételek'], of: (d) => d.warehouses,
      row: (wh, d) => [`<strong>${esc(wh.name)}</strong>`, esc(wh.kind), `${d.products.filter((x) => x.warehouse === wh.name).length} tétel`] },
    processes: { cols: ['Folyamat', 'Megnevezés', 'Állapot', 'Időpont'], of: (d) => d.processes,
      row: (p) => [`<strong>${esc(p.code)}</strong>`, esc(p.name), `<span class="badge">${esc(p.state)}</span>`, esc(whenText(p.at))] },
    documents: { cols: ['Bizonylat', 'Típus', 'Partner', 'Időpont'], of: (d) => d.documents,
      row: (x) => [`<strong>${esc(x.code)}</strong>`, esc(x.kind), esc(x.partner), esc(whenText(x.at))] },
  });

  function tablePage(page) {
    const def = ROW_DEF[page];
    if (!def) return head(PAGE[page] || page, 'Ez a nézet ebben a bemutatóban még nem épült meg.') + emptyBox('Nincs megjeleníthető tartalom', 'A menüből másik nézetet nyithatsz meg.');
    const d = demoSet();
    const all = def.of(d);
    if (!all.length) return head(PAGE[page], 'Bemutatóadatok a V2-ből ismert elrendezésben.') + noDemoBox();
    const q = state.search.toLocaleLowerCase('hu');
    // A FOLYAMATOK ÁLLAPOT-SZŰRÉSE (R83/F83-04): a választható értékek a MEGLÉVŐ sorokból jönnek —
    // nem találunk ki állapot-listát, amit a mintaadat nem tartalmaz (KUKA-050).
    const states = page === 'processes' ? [...new Set(all.map((x) => x.state))] : [];
    const kept = all.map((item, i) => ({ item, i }))
      .filter(({ item }) => !(page === 'processes' && state.processState) || item.state === state.processState);
    const visible = kept.filter(({ item }) => !q
      || Object.values(item).join(' ').toLocaleLowerCase('hu').includes(q));
    const szuro = states.length ? `<label class="inline">Állapot
        <select data-testid="process-state"><option value="">Mind (${all.length})</option>
        ${states.map((st) => `<option value="${esc(st)}" ${state.processState === st ? 'selected' : ''}>${esc(st)} (${all.filter((x) => x.state === st).length})</option>`).join('')}</select></label>` : '';
    return head(PAGE[page], 'Bemutatóadatok a V2-ből ismert elrendezésben. A sorra kattintva a részletek is megnyílnak.')
      + `<div class="tablebox"><div class="toolbar">
          <input data-testid="list-search" aria-label="Keresés a listában" placeholder="Keresés a listában…" value="${esc(state.search)}">
          ${szuro}${demoBadge()}</div>
        <div class="table-scroll"><table><thead><tr>${def.cols.map((c) => `<th>${c}</th>`).join('')}<th><span class="sr-only">Részletek</span></th></tr></thead>
        <tbody data-testid="list-rows">${visible.length ? visible.map(({ item, i }) => `<tr data-testid="row-${page}-${i}">${def.row(item, d).map((c) => `<td>${c}</td>`).join('')}
            <td><button type="button" class="plain" data-action="row-open" data-list="${page}" data-row="${i}"
              data-testid="row-open-${page}-${i}">Részletek</button></td></tr>`).join('')
          : `<tr><td colspan="${def.cols.length + 1}">${STATE.noResult}
              <button type="button" class="plain" data-action="clear-search">Szűrők törlése</button></td></tr>`}</tbody></table></div>
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
      body = line('Kód', item.code) + line('Típus', item.kind) + line('Raktár', item.warehouse)
        + line('Mennyiség', item.qty === null ? STATE.unknownQty : `${item.qty} ${item.unit || STATE.noUnit}`)
        + line('Mennyiség jellege', QUALITY_LABEL[item.quality])
        + line('Egységár', item.price === null ? STATE.noPrice : `${item.price} ${item.currency}`);
    } else if (list === 'partners') {
      body = line('Kapcsolat', item.kind) + line('Ország', item.country);
    } else if (list === 'warehouses') {
      const itt = d.products.filter((x) => x.warehouse === item.name);
      body = line('Típus', item.kind) + line('Itt tartott mintatételek', `${itt.length} tétel`)
        + `<h3>Tételek ebben a raktárban</h3><ul class="menu-list" data-testid="warehouse-items">${itt.length
          ? itt.map((x) => `<li><span>${esc(x.name)}</span> <small>${esc(x.qty === null ? STATE.unknownQty : `${x.qty} ${x.unit || STATE.noUnit}`)}</small></li>`).join('')
          : `<li class="muted">${STATE.empty}</li>`}</ul>`;
    } else if (list === 'processes') {
      body = line('Megnevezés', item.name) + line('Állapot', item.state) + line('Időpont', whenText(item.at));
    } else if (list === 'documents') {
      body = line('Típus', item.kind) + line('Partner', item.partner) + line('Időpont', whenText(item.at));
    }
    openPanel(panelHead(item.name || item.code, STATE.demo)
      + `<div data-testid="detail-body">${body}</div>
      <p class="muted" style="font-size:13px">Ez bemutató tétel: a rendszer ehhez nem végez üzleti műveletet.</p>
      ${techDetails({ list, index: Number(idx), demo_fixture: demoName(), row: item })}
      <div class="buttonrow"><button type="button" data-action="panel-close">Bezárás</button></div>`);
  }

  function overviewPage() {
    if (isPersonal()) {
      return head(PAGE.overview, 'Itt találod a saját ügyeidet. Vállalkozást később is hozzáadhatsz.')
        + `<div class="grid"><section class="card"><h2>Személyes fiók</h2>
            <p class="muted">A fiókod készen áll. A vállalkozásaidat a fejléc fiókválasztójából éred el.</p>
            <button type="button" data-go="personal" class="primary">${PAGE.personal} megnyitása</button></section>
          <section class="card"><h2>Vállalkozást is kezelsz?</h2>
            <p class="muted">Ugyanezzel a belépéssel hozzáadhatod. A személyes fiókod megmarad.</p>
            <button type="button" data-go="new">${PAGE.new}</button></section></div>`;
    }
    const demo = demoSet();
    const justCreated = state.afterCreate ? `<section class="card" data-testid="after-create">
        <h2>${esc(STATE.inviteAsk)}</h2>
        <p class="muted">Ha egyedül dolgozol, ezt a lépést nyugodtan kihagyhatod.</p>
        <div class="buttonrow">${isAdmin() ? `<button type="button" class="primary" data-action="invite-from-create" data-testid="after-create-invite">Felhasználó meghívása</button>` : ''}
          <button type="button" data-action="dismiss-after-create" data-testid="after-create-skip">${esc(STATE.inviteSkip)}</button></div></section>` : '';
    return head(PAGE.overview, 'A napi munka és a következő teendők.')
      + justCreated
      + `<div class="stats">
          <div class="card stat"><span>Folyamatban lévő munkák</span><strong>${demo.processes.filter((p) => p.state === 'Folyamatban').length}</strong></div>
          <div class="card stat"><span>Megjelenített termékek</span><strong>${demo.products.length}</strong></div>
          <div class="card stat"><span>Szerepköröd</span><strong>${esc(ROLE[state.me.current_role] || state.me.current_role || '—')}</strong></div>
        </div>
        <div class="grid">
          <section class="card"><h2>Következő teendők</h2>
            <p class="muted">A készlet- és ármegtekintést a fiókkezelő felhasználónként engedélyezi.</p>
            <div class="buttonrow"><button type="button" data-go="stock" class="primary">${PAGE.stock}</button>
            ${isAdmin() ? `<button type="button" data-go="members">${PAGE.members}</button>` : ''}</div></section>
          <section class="card"><h2>Aktív fiók</h2><p><strong>${esc(accountName())}</strong></p>
            <p class="muted">Másik fiókra a fejléc fiókválasztójával válthatsz.</p>${demoBadge()}</section>
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
    state.members = [];
    state.panels = { stock: null, price: null, members: null };
    state.access = { stock: { state: 'unknown' } };
    state.invites = null;
    state.membersTab = 'members';
    state.search = '';
    state.processState = '';
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
    if (a.state === 'unbound') return `<div class="notice warn" data-testid="${testid}-unbound">${esc(unboundMessage(a.why))}</div>`;
    // AZ OLVASÁS EL SEM JUTOTT (R85/F85-04): olvasásnál ez ELDÖNTHETŐ hiány — nem változtattunk
    // semmit, tehát a lap nyugodtan kimondhatja, és ugyanazzal a gombbal újra lehet próbálni.
    if (a.state === 'network') {
      return `<div class="empty" data-testid="${testid}-network"><h2>${esc(reasonText('network_error'))}</h2>
          <p>A készletadatokat nem kérdeztük le. Semmi nem változott.</p>
          <button type="button" data-action="reload-stock">Frissítés</button></div>`;
    }
    if (a.state === 'denied') {
      return `<div class="empty" data-testid="${testid}-denied" data-gate="${esc(a.gate || '')}">
          <h2>A készletadatokhoz még nincs hozzáférésed</h2>
          <p>${esc(reasonText(a.reason, 'A fiókkezelő tudja engedélyezni a megtekintésüket.'))}</p>
          <button type="button" data-action="reload-stock">Frissítés</button></div>
        ${techDetails({ ok: false, refused_by: a.gate ?? null, reason: a.reason ?? null, detail: a.detail ?? null, demo_fixture: demoName() })}`;
    }
    return `<p data-testid="${testid}-loading">${STATE.loading}</p>`;
  }

  function stockPage() {
    return head(PAGE.stock, 'Mennyiségek raktáranként. Az ismeretlen mennyiség nem nulla.',
      '<button type="button" class="primary" data-action="reload-stock" data-testid="data-stock-btn">Frissítés</button>')
      + `<div data-testid="data-stock">${stockBody()}</div>
         <section class="card" style="margin-top:20px"><div class="cardhead"><h2>Árak</h2>
           <button type="button" data-action="reload-price" data-testid="data-price-btn">Frissítés</button></div>
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
      qty: p.qty === null ? STATE.unknownQty : p.qty, unit: p.unit || STATE.noUnit, quality: QUALITY_LABEL[p.quality],
    }));
    // A MAGTÓL KAPOTT SOR: „Bemutató tétel", és amit a válasz NEM mond meg, az „Nincs megadva" —
    // sem raktárt, sem mérési eredetet nem tulajdonítunk neki (R83/F83-03 · UX-19).
    if (a.coreQty) {
      rows.unshift({ name: STATE.demoItem, code: STATE.notGiven, warehouse: STATE.notGiven,
        qty: a.coreQty, unit: STATE.noUnit, quality: STATE.notGiven });
    }
    if (!rows.length) return noDemoBox() + techDetails({ ok: true, result: a.result, demo_fixture: demoName() });
    return `<div class="tablebox" data-testid="stock-table"><div class="toolbar">${demoBadge()}
        <span class="muted">${esc(STATE.demoItemLead)}</span></div>
      <div class="table-scroll"><table><thead><tr><th>Termék</th><th>Raktár</th><th class="numeric">Mennyiség</th><th>Egység</th><th>Mennyiség jellege</th></tr></thead>
      <tbody>${rows.map((x) => `<tr><td><strong>${esc(x.name)}</strong><small>${esc(x.code)}</small></td><td>${esc(x.warehouse)}</td>
        <td class="numeric">${esc(x.qty)}</td><td>${esc(x.unit)}</td>
        <td>${x.quality === 'Mért' ? '<span class="badge ok">Mért</span>' : x.quality === 'Becsült' ? '<span class="badge wait">Becsült</span>' : `<span class="badge gray">${esc(x.quality)}</span>`}</td></tr>`).join('')}
      </tbody></table></div><div class="tablefoot">${rows.length} sor · különböző mértékegységű mennyiségeket nem adunk össze.</div></div>
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
      setPanel('price', 'data-price', `<p class="muted">${esc(unboundMessage(verdict.why))}</p>`);
      await contextChangedNotice(verdict.why);
      return;
    }
    if (!r.ok) {
      // A KÉT KAPU KÜLÖN MONDAT (ENT-02): a csomag hiánya és a jog hiánya nem ugyanaz a helyzet.
      const ent = r.refused_by === 'entitlement' || r.refused_by === 'both';
      setPanel('price', 'data-price', `<p data-testid="price-denied" data-gate="${esc(r.refused_by || '')}">${esc(ent
        ? (isAdmin() ? STATE.planMissingAdmin : STATE.planMissingMember)
        : reasonText(r.right_reason === 'no_scope_grant' || r.right_reason === 'not_available' ? 'no_scope_grant' : r.right_reason, 'Az árak megtekintése nincs engedélyezve.'))}</p>
        ${ent && isAdmin() ? `<button type="button" data-go="plan">${PAGE.plan} megnyitása</button>` : ''}
        ${techDetails({ refused_by: r.refused_by, right_reason: r.right_reason ?? null, entitlement_reason: r.entitlement_reason ?? null, message: r.message ?? null })}`);
      return;
    }
    const price = r.result && r.result.unit_price !== undefined && r.result.unit_price !== null ? String(r.result.unit_price) : null;
    setPanel('price', 'data-price', `<p data-testid="price-value"><strong>${esc(STATE.demoItem)}</strong> · ${esc(price ?? STATE.noPrice)} <span class="muted">(${STATE.noCurrency})</span></p>
      <p class="muted">A hiányzó ár nem 0: ahol nincs megadva, ott „${STATE.noPrice}" áll.</p>
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
    if (!isAdmin()) return head(PAGE.members) + emptyBox('Ehhez a beállításhoz nincs hozzáférésed', 'A fiókkezelő tud segíteni.');
    const fül = (kulcs, cimke) => `<button type="button" role="tab" data-action="members-tab" data-mtab="${kulcs}"
      data-testid="members-tab-${kulcs}" aria-selected="${state.membersTab === kulcs}" class="${state.membersTab === kulcs ? 'current' : ''}">${cimke}</button>`;
    const varakozo = state.membersTab === 'invites';
    return head(PAGE.members, 'Itt kezelheted, ki fér hozzá a fiókhoz és az adatokhoz.',
      '<button type="button" class="primary" data-action="invite-open" data-testid="invite-open">+ Felhasználó meghívása</button>')
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
    if (!list.length) return emptyBox(STATE.invitePendingEmpty, 'A „Felhasználó meghívása" gombbal küldhetsz újat.');
    return `<div class="tablebox" data-testid="invites-table"><div class="table-scroll"><table>
      <thead><tr><th>Meghívott cím</th><th>Szerepkör</th><th>Meghívta</th><th>Érvényesség</th><th>Állapot</th></tr></thead>
      <tbody>${list.map((x) => `<tr data-testid="invite-row-${esc(x.ref)}">
        <td><strong>${esc(x.email || STATE.notGiven)}</strong></td><td>${esc(ROLE[x.role] || x.role)}</td>
        <td>${esc(x.invited_by || STATE.notGiven)}</td><td>${esc(whenText(x.expires_at))}</td>
        <td>${x.expired ? '<span class="badge gray">Lejárt</span>' : '<span class="badge wait">Elfogadásra vár</span>'}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="tablefoot">A meghívó hivatkozása csak a levélben szerepel — itt nem jelenítjük meg.</div></div>`;
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
    if (!verdict.bound) { setPanel('members', 'members-list', `<div class="notice warn">${esc(unboundMessage(verdict.why))}</div>`); await contextChangedNotice(verdict.why); return; }
    if (!r.ok) { setPanel('members', 'members-list', `<div class="empty"><h2>${esc(STATE.noAccess)}</h2><p>${esc(reasonText(r.reason))}</p></div>`); return; }
    state.members = r.members || [];
    const cell = (m, k) => (m.effective
      ? (m.scopes && m.scopes[k] && m.scopes[k].granted ? '<span class="badge ok">Megtekintheti</span>' : '<span class="badge wait">Nincs engedélyezve</span>')
      : '<span class="badge gray">Nincs hozzáférés</span>');
    const rows = state.members.map((m) => `<tr data-testid="member-${esc(m.subject_id)}">
        <td><strong>${esc(m.email || 'ismeretlen cím')}</strong></td>
        <td>${esc(ROLE[m.role] || m.role)}</td>
        <td>${cell(m, 'keszlet')}</td><td>${cell(m, 'arak')}</td>
        <td>${m.effective ? '<span class="badge ok">Aktív</span>' : '<span class="badge gray">Megszüntetve</span>'}</td>
        <td><button type="button" data-action="member-open" data-subject="${esc(m.subject_id)}" data-testid="member-open-${esc(m.subject_id)}">Hozzáférés</button></td>
      </tr>`).join('');
    setPanel('members', 'members-list', `<div class="tablebox"><div class="table-scroll"><table>
      <thead><tr><th>Felhasználó</th><th>Szerepkör</th><th>${SCOPE.keszlet}</th><th>${SCOPE.arak}</th><th>Állapot</th><th><span class="sr-only">Műveletek</span></th></tr></thead>
      <tbody>${rows || `<tr><td colspan="6">${STATE.noMembers}</td></tr>`}</tbody></table></div>
      <div class="tablefoot">A tagság és az adatok megtekintésének engedélye két külön állapot.</div></div>`);
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
  function openPanel(html, drawer = true) {
    const d = byTest('panel');
    d.className = drawer ? 'drawer' : '';
    stampEl(d);                     // A PANEL A MEGNYITÁSKORI SZEMÉLYHEZ ÉS FIÓKHOZ TARTOZIK (PNL-01)
    byTest('panel-body').innerHTML = html;
    if (!d.open) d.showModal();
  }
  function closePanel() { const d = byTest('panel'); if (d && d.open) d.close(); }
  // A PANEL TARTALMA A BEZÁRÁSSAL ELTŰNIK — Esc-re is. A rejtett, de meglévő űrlap ugyanúgy a lap
  // része (a böngésző kitöltője és a képernyőolvasó is megtalálja), ezért nem hagyjuk ott.
  const panelEl = byTest('panel');
  if (panelEl) panelEl.addEventListener('close', () => { const b = byTest('panel-body'); if (b) b.innerHTML = ''; });
  function panelHead(title, lead) {
    return `<div class="dialoghead"><div><small>${esc(accountName())}</small><h2>${esc(title)}</h2>
      ${lead ? `<p class="muted">${esc(lead)}</p>` : ''}</div>
      <button type="button" class="x" data-action="panel-close" aria-label="Bezárás">×</button></div>`;
  }

  function invitePanel() {
    openPanel(panelHead('Felhasználó meghívása', 'A meghívott a fiók adataihoz külön engedéllyel fér hozzá.')
      + `<form class="form" data-testid="invite-form">
        <label>E-mail-cím<input type="email" name="email" required data-testid="invite-email" autocomplete="off" placeholder="pelda@example.test"></label>
        <label>Szerepkör<select name="role" data-testid="invite-role"><option value="user">${ROLE.user}</option><option value="admin">${ROLE.admin}</option></select>
          <small>${esc(STATE.inviteRoleHelp)}</small></label>
        <label>${esc(STATE.inviteScopeQuestion)}<select name="scope" data-testid="invite-scope"><option value="keszlet">${SCOPE.keszlet}</option><option value="arak">${SCOPE.arak}</option></select>
          <small>${esc(STATE.inviteScopeHelp)}</small></label>
        <div class="buttonrow"><button type="submit" class="primary" data-testid="invite-submit">Meghívó létrehozása</button>
          <button type="button" data-action="panel-close">Mégse</button></div>
        <p class="notice" data-testid="invite-result" hidden></p>
        <!-- KÖZVETLEN ÚT A LEVÉLHEZ (R81 §8): a meghívó elkészülte után egy gomb viszi a
             próbaüzenethez — nem kell megkeresni a lap alján. Sikerig rejtve. -->
        <p hidden data-testid="invite-mail-row"><button type="button" data-action="mail-open"
          data-testid="invite-mail-open">A meghívó levél megnyitása a Próbaüzenetek között</button></p></form>`);
  }

  function memberPanel(id) {
    const m = (state.members || []).find((x) => x.subject_id === id);
    if (!m) return;
    const scopes = m.scopes || {};
    const row = (k) => `<div class="splitline"><div><strong>${SCOPE[k]}</strong>
        <small>${scopes[k] && scopes[k].granted ? 'Megtekintheti' : 'Nincs engedélyezve'}</small></div>
      ${scopes[k] && scopes[k].granted ? '<span class="badge ok">Engedélyezve</span>' : '<span class="badge wait">Nincs engedélyezve</span>'}</div>`;
    openPanel(panelHead(tpl('memberAccessTitle', { ki: m.email || m.subject_id }))
      + `<p class="identity"><strong>${esc(m.email || m.subject_id)}</strong>
          <small>${esc(ROLE[m.role] || m.role)} · ${m.effective ? 'Aktív' : 'Megszüntetve'}</small></p>
      ${m.effective ? '' : '<div class="notice warn">Ennek a felhasználónak megszűnt a céges hozzáférése, ezért adatkört sem lehet neki engedélyezni.</div>'}
      <h3>Adatok megtekintése</h3>${row('keszlet')}${row('arak')}
      ${m.effective ? `<form class="form" data-testid="member-scope-form" data-subject="${esc(id)}">
        <label>Engedélyezendő adatkör
          <select data-testid="member-scope-select-${esc(id)}" name="scope">
            <option value="keszlet">${SCOPE.keszlet}</option><option value="arak">${SCOPE.arak}</option></select></label>
        <button type="submit" class="primary" data-testid="member-scope-${esc(id)}">Megtekintés engedélyezése</button>
        <p class="muted" style="font-size:13px">${esc(tpl('scopeOnlyHere', { nev: accountName() }))}</p></form>
      <div class="divider"></div><h3>Hozzáférés a fiókhoz</h3>
      <p class="muted">${esc(STATE.revokeSectionLead)}</p>
      <button type="button" class="danger" data-action="revoke-start" data-subject="${esc(id)}" data-testid="member-revoke-${esc(id)}">Céges hozzáférés megszüntetése</button>` : ''}
      <div class="buttonrow"><button type="button" data-action="panel-close">Bezárás</button></div>`);
  }

  function revokePanel(id) {
    const m = (state.members || []).find((x) => x.subject_id === id);
    const who = m ? (m.email || m.subject_id) : 'A felhasználó';
    openPanel(panelHead(tpl('revokeTitle', { ki: who }))
      + `<p>${esc(tpl('revokeLead', { ki: who, nev: accountName() }))}</p>
      <div class="buttonrow"><button type="button" data-action="member-open" data-subject="${esc(id)}">Mégse</button>
        <button type="button" class="danger" data-action="revoke" data-subject="${esc(id)}" data-testid="revoke-confirm">Hozzáférés megszüntetése</button></div>`, false);
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
    openPanel(panelHead('Próbaüzenetek', STATE.demoMail)
      + (off
        ? '<div class="notice warn">Ebben a környezetben a próbaüzenetek nem érhetők el (a bemutató levél-fogadója ki van kapcsolva).</div>'
        : `<ul class="maillist" data-testid="mailbox">${mails.length ? mails.map((m) => `<li data-testid="mail-${m.id}">
            <small>${esc(m.to)} · ${esc(whenText(m.at))}</small><h3>${esc(m.subject)}</h3>
            <p class="muted">${esc(m.body || '')}</p>
            <a href="${esc(m.link)}" data-testid="mail-link-${m.id}">Megnyitás</a></li>`).join('') : `<li class="muted">${STATE.empty}</li>`}</ul>`)
      + `<div class="buttonrow">${off ? '' : '<button type="button" data-action="mail-refresh" data-testid="mailbox-refresh">Frissítés</button>'}
        <button type="button" data-action="panel-close">Bezárás</button></div>`);
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
      h = `<h1>${reg ? 'Fiók létrehozása' : 'Bejelentkezés'}</h1>
        <p class="muted">${reg ? 'Egy fiókkal a saját és a vállalkozásaid ügyeit is kezelheted.' : 'Lépj be a saját fiókodba.'}</p>
        <form class="form" data-kind="${kind}" data-testid="${reg ? 'register-form' : 'login-form'}">
          <label>E-mail-cím<input type="email" name="email" required autocomplete="username" data-testid="${reg ? 'register-email' : 'login-email'}"></label>
          <label>Jelszó<input type="password" name="password" required ${reg ? 'minlength="8"' : ''} autocomplete="${reg ? 'new-password' : 'current-password'}" data-testid="${reg ? 'register-password' : 'login-password'}">
            ${reg ? '<small>Legalább 8 karakter.</small>' : ''}</label>
          <label class="check"><input type="checkbox" data-testid="show-password" data-pw="${reg ? 'register-password' : 'login-password'}">Jelszó megjelenítése</label>
          <button type="submit" class="primary" data-testid="${reg ? 'register-submit' : 'login-submit'}">${reg ? 'Fiók létrehozása' : 'Bejelentkezés'}</button>
          <p class="notice" data-testid="${reg ? 'register-result' : 'login-result'}" hidden></p>
        </form>
        <p class="authfoot">${reg ? 'Már van fiókod?' : 'Még nincs fiókod?'}
          <button type="button" class="plain" data-auth="${reg ? 'login' : 'register'}">${reg ? 'Bejelentkezés' : 'Fiók létrehozása'}</button></p>
        ${reg ? '' : '<p class="authfoot"><button type="button" class="plain" data-auth="resend">Új megerősítő levél kérése</button></p>'}`;
    } else if (kind === 'resend') {
      h = `<h1>Új megerősítő levél</h1>
        ${state.resendReason ? `<p class="notice warn" data-testid="resend-reason">${esc(state.resendReason)}</p>` : ''}
        <p class="muted">Add meg a regisztrációnál használt e-mail-címedet.</p>
        <form class="form" data-kind="resend" data-testid="resend-form">
          <label>E-mail-cím<input type="email" name="email" required autocomplete="username" data-testid="resend-email"></label>
          <button type="submit" class="primary" data-testid="resend-submit">Levél kérése</button>
          <p class="notice" data-testid="resend-result" hidden></p></form>
        <p class="authfoot"><button type="button" class="plain" data-auth="login">Vissza a bejelentkezéshez</button></p>`;
    } else if (kind === 'sent' || kind === 'resent') {
      h = `<div class="status-icon">✉</div><h1>Nézd meg a leveleidet</h1>
        <p class="muted" data-testid="${kind === 'sent' ? 'register-result' : 'resend-result'}">${kind === 'sent'
          ? 'Ha ezzel a címmel folytatható a regisztráció, elküldjük a következő lépést. Nyisd meg a levélben lévő hivatkozást.'
          : 'Ha ehhez a címhez megerősítésre váró fiók tartozik, új levelet küldünk. Nézd meg a levélszemét mappát is. A legutóbbi levél linkjét használd.'}</p>
        <button type="button" class="primary" data-action="mail-open">Próbaüzenetek megnyitása</button>
        <p class="authfoot"><button type="button" class="plain" data-auth="login">Bejelentkezés</button></p>`;
    } else if (kind === 'invite') {
      h = invitePageHtml();
    }
    auth.innerHTML = `<div class="card">${h}</div>`;
    renderHeader();
  }

  /**
   * A MEGHÍVÓ LAPJA. A cég NEVÉT NEM TALÁLJUK KI: a megfigyelés szándékosan nem árulja el annak,
   * aki nem bizonyította a címzetti csatornát (KUKA-084) — a lap azt mondja, ami MÉRT.
   */
  function invitePageHtml() {
    const o = state.invite;
    const loggedIn = !!(state.me && state.me.subject_id);
    if (!o) return `<div data-testid="section-invite"><h1>Meghívás megnyitása</h1><p>${STATE.loading}</p></div>`;
    let lead = ''; let actions = '';
    if (o.status === 'redeem_as_existing' && loggedIn) {
      lead = 'A meghívás erre a belépéshez tartozó címre szól. Az elfogadás után a fiókkezelő külön engedélyezi az adatok megtekintését.';
      actions = '<button type="button" class="primary" data-action="redeem" data-testid="invite-redeem">Meghívás elfogadása</button>';
    } else if (o.status === 'redeem_as_new') {
      lead = 'Állíts be belépést a meghívott címhez, és a meghívás folytatódik.';
      actions = `<button type="button" class="primary" data-auth="register">Fiók létrehozása</button>
        <button type="button" data-auth="login">Már van fiókom</button>`;
    } else if (o.status === 'redeem_as_existing') {
      lead = 'Ehhez a címhez tartozik belépés — jelentkezz be vele, és a meghívás folytatódik.';
      actions = '<button type="button" class="primary" data-auth="login">Bejelentkezés és folytatás</button>';
    } else if (o.status === 'needs_invitee_identity') {
      lead = 'A folytatáshoz jelentkezz be azzal az e-mail-címmel, amelyre a meghívó érkezett, és erősítsd meg a címet.';
      actions = `<button type="button" class="primary" data-auth="login">Bejelentkezés</button>
        <button type="button" data-auth="register">Fiók létrehozása</button>`;
    } else {
      lead = reasonText(o.reason, 'Ehhez a hivatkozáshoz most nem tartozik beváltható meghívás.');
      actions = '<button type="button" class="primary" data-auth="login">Bejelentkezés</button>';
    }
    const hint = o.continue_as && o.continue_as.hint ? o.continue_as.hint : null;
    // A FIÓK NEVE CSAK A BIZONYÍTOTT CÍMZETTNEK (R83/F83-04): a szerver akkor adja ki, ha a néző a
    // meghívás címzetti csatornáját bizonyította — a lap semmit nem következtet ki magától.
    const acc = o.account && o.account.name ? o.account : null;
    return `<div data-testid="section-invite"><div class="status-icon">✉</div>
      <h1>${esc(acc ? tpl('inviteFor', { nev: acc.name }) : 'Meghívás egy közös fiókba')}</h1>
      ${acc ? `<p class="helpbox" data-testid="invite-account">Szerepkör: <strong>${esc(ROLE[acc.role] || acc.role)}</strong>${o.invited_by ? ` · Meghívta: <strong>${esc(o.invited_by)}</strong>` : ''}</p>` : ''}
      <p class="muted" data-testid="invite-observe">${esc(lead)}</p>
      ${hint ? `<p class="helpbox">A meghívott cím: <strong>${esc(hint)}</strong></p>` : ''}
      ${loggedIn ? `<p class="helpbox">Bejelentkezve: <strong>${esc(state.me.email || '')}</strong></p>` : ''}
      <div class="buttonrow">${actions}</div>
      <p class="notice" data-testid="invite-redeem-result" hidden></p>
      <p class="authfoot" data-testid="invite-next">${esc(o.message || 'Ha nem a te címedre szól, jelentkezz be a meghívott címmel.')}</p>
      <details class="tech"><summary>Technikai részletek</summary>
        <pre data-testid="invite-observe-json">${esc(JSON.stringify(o, null, 2))}</pre></details></div>`;
  }

  // ── TOVÁBBI OLDALAK ─────────────────────────────────────────────────────────────────────────
  function stockCardPage() {
    const gate = stockGate('stockcard');
    if (gate) return head(PAGE.stockcard, 'Egy termék készlete és mozgásai.') + gate;
    const p = demoSet().products[0];
    if (!p) return head(PAGE.stockcard, 'Egy termék készlete és mozgásai.') + noDemoBox();
    return head(PAGE.stockcard, 'Egy termék készlete és mozgásai.')
      + `<section class="card" data-testid="stockcard-table"><h2>${esc(p.name)}</h2><p class="muted">${esc(p.code)} · ${esc(p.kind)}</p>
        <div class="splitline"><span>Készlet</span><strong>${esc(p.qty ?? STATE.unknownQty)} ${esc(p.unit || STATE.noUnit)} · ${QUALITY_LABEL[p.quality]}</strong></div>
        <div class="splitline"><span>Raktár</span><strong>${esc(p.warehouse)}</strong></div>
        <div class="buttonrow"><button type="button" data-go="movements">${PAGE.movements}</button></div>${demoBadge()}</section>`;
  }

  /**
   * A KÉSZLETMOZGÁSOK UGYANAZON A KAPUN ÁLLNAK, mint a Készletegyenleg (STK-01). Korábban ez a lap
   * a közös tábla-rajzolón ment át, ami a jogot nem kérdezte meg — ezért rajzolt adatot jog nélkül.
   */
  function movementsPage() {
    const gate = stockGate('movements');
    if (gate) return head(PAGE.movements, 'A készlet mozgásai időrendben.') + gate;
    const d = demoSet();
    if (!d.movements.length) return head(PAGE.movements, 'A készlet mozgásai időrendben.') + noDemoBox();
    return head(PAGE.movements, 'A készlet mozgásai időrendben.')
      + `<div class="tablebox" data-testid="movements-table"><div class="toolbar">${demoBadge()}</div>
        <div class="table-scroll"><table><thead><tr><th>Időpont</th><th>Termék</th><th>Művelet</th><th class="numeric">Mennyiség</th></tr></thead>
        <tbody>${d.movements.map((m) => `<tr><td>${esc(whenText(m.at))}</td><td>${esc(m.product)}</td><td>${esc(m.op)}</td>
          <td class="numeric">${esc(m.qty)} ${esc(m.unit)}</td></tr>`).join('')}</tbody></table></div>
        <div class="tablefoot">${d.movements.length} mintaadat · ehhez a bemutatóhoz nem tartozik üzleti végrehajtás.</div></div>`;
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
    return head(PAGE.new, 'Ugyanezzel a belépéssel kezelheted. A személyes fiókod megmarad.')
      + `<section class="card"><form class="form" data-kind="ws" data-keep="ws" data-testid="ws-form">
        <fieldset class="choice"><legend>Milyen fiókot adsz hozzá?</legend>
          <label class="check"><input type="radio" name="kind" value="business" data-testid="ws-kind-business" ${cegkent ? 'checked' : ''}>
            <span><strong>${esc(STATE.kindBusiness)}</strong><small>${esc(STATE.kindBusinessLead)}</small></span></label>
          <label class="check"><input type="radio" name="kind" value="shared" data-testid="ws-kind-shared" ${cegkent ? '' : 'checked'}>
            <span><strong>${esc(STATE.kindShared)}</strong><small>${esc(STATE.kindSharedLead)}</small></span></label></fieldset>
        <label>${cegkent ? 'Vállalkozás neve' : 'A fiók neve'}<input name="name" required data-testid="ws-name" autocomplete="organization"></label>
        <div data-testid="ws-business-fields" ${cegkent ? '' : 'hidden'}>
          <label>Nyilvántartás országa vagy területe
            <select name="jurisdiction" data-testid="ws-jurisdiction">
              <option value="HU">Magyarország</option><option value="AT">Ausztria</option><option value="DE">Németország</option>
              <option value="SK">Szlovákia</option><option value="RO">Románia</option>
              <option value="__egyeb__">Más ország vagy terület…</option></select></label>
          <label hidden data-testid="ws-jurisdiction-other-row">Ország vagy terület kódja
            <input name="jurisdiction_other" data-testid="ws-jurisdiction-other" autocomplete="off" maxlength="32">
            <small>A megadott kódot változatlanul megőrizzük — nem olvasztjuk össze más országokéval.</small></label>
          <label><span data-testid="ws-tax-label">Adószám</span>
            <input name="tax_id" data-testid="ws-tax-id" autocomplete="off" inputmode="numeric">
            <span class="error" data-testid="ws-tax-error" role="alert"></span></label>
          <p class="muted" style="font-size:13px">A megadott cégadatokat most nem ellenőrizzük hatósági nyilvántartásban, és a megadásuk nem igazolja más vállalkozás képviseletét.</p></div>
        <details class="tech"><summary>Csatlakozás egy meglévő céges fiókhoz</summary>
          <p>Meglévő céges fiókhoz meghívóval csatlakozhatsz: a fiókkezelő küld meghívót az e-mail-címedre.
          Az adóazonosító megadása önmagában nem ad hozzáférést más fiókjához.</p></details>
        <div class="buttonrow"><button type="submit" class="primary" data-testid="ws-create">${PAGE.new}</button>
          <button type="button" data-go="overview">Mégse</button></div>
        <p class="notice" data-testid="ws-create-result" hidden></p></form></section>`;
  }

  function planPage() {
    const plan = (state.me && state.me.current_plan) || 'starter';
    const opt = (k) => `<option value="${k}" ${plan === k ? 'selected' : ''}>${PLAN[k]}</option>`;
    return head(PAGE.plan, 'A csomag a FUNKCIÓK elérhetőségét szabja meg. Az adatok megtekintésének jogát nem a csomag adja.')
      + `<section class="card"><form class="form" data-kind="plan" data-keep="plan" data-testid="plan-form">
        <div class="splitline"><span>Jelenlegi csomag</span><strong>${esc(PLAN[plan] || plan)}</strong></div>
        <div class="splitline"><span>${SCOPE.keszlet} megtekintése</span><strong>Elérhető, ha a fiókkezelő engedélyezte</strong></div>
        <div class="splitline"><span>${SCOPE.arak} megtekintése</span><strong>${plan === 'pro' ? 'Elérhető, ha a fiókkezelő engedélyezte' : 'Nincs a csomagban'}</strong></div>
        <label style="margin-top:18px">Csomag<select name="plan" data-testid="plan-select">${opt('starter')}${opt('pro')}</select></label>
        <div class="buttonrow"><button type="submit" class="primary" data-testid="plan-submit">Csomag mentése</button></div>
        <p class="notice" data-testid="plan-result" hidden></p>
        <p class="muted" style="font-size:13px">Ebben a bemutatóban nincs vásárlás és nincs díjfizetés.</p></form></section>`;
  }

  function accountPage() {
    const ws = ((state.me && state.me.workspaces) || []).find((w) => w.book_id === bookId()) || null;
    const b = ws && ws.business ? ws.business : null;
    return head(PAGE.account, 'A fiók törzsadatai.')
      + `<section class="card" data-testid="section-account">
        <div class="splitline"><span>Név</span><strong>${esc(accountName())}</strong></div>
        <div class="splitline"><span>Szerepköröd</span><strong>${esc(ROLE[state.me.current_role] || state.me.current_role || '—')}</strong></div>
        <div class="splitline"><span>Csomag</span><strong>${esc(PLAN[state.me.current_plan] || state.me.current_plan || '—')}</strong></div>
        <div class="splitline"><span>Vállalkozási adatok</span><strong data-testid="representation-note">${b
          ? `${esc(b.jurisdiction || '—')} · megadva, hatósági ellenőrzés nélkül`
          : 'Nincs rögzítve'}</strong></div>
        <p class="muted" style="font-size:13px">A név vagy az adóazonosító megadása nem igazolja más vállalkozás képviseletét.</p></section>`;
  }

  function profilePage() {
    const me = state.me;
    return head(PAGE.profile, 'Ezek az adatok a saját belépésedhez tartoznak, nem a fiókhoz.')
      + `<section class="card">
        <div class="splitline"><span>E-mail-cím</span><strong>${esc(me.email || me.subject_id)}</strong></div>
        <div class="splitline"><span>E-mail-cím állapota</span><strong data-testid="personal-space-note">${me.channel_proven ? 'Megerősítve' : 'Megerősítésre vár'}</strong></div>
        <div class="splitline"><span>Nyelv</span><strong>Magyar</strong></div>
        <p class="muted" style="font-size:13px">A profil szerkesztése ebben a csomagban még nem érhető el — ezért nem is kínálunk rá gombot.</p></section>`;
  }

  function securityPage() {
    const me = state.me;
    return head(PAGE.security, 'A belépéshez tartozó adatok és műveletek.')
      + `<section class="card">
        <div class="splitline"><span>Bejelentkezve</span><strong>${esc(me.email || me.subject_id)}</strong></div>
        <div class="splitline"><span>E-mail-cím megerősítve</span><strong>${me.channel_proven ? 'Igen' : 'Nem'}</strong></div>
        <div class="splitline"><span>Ki nevében jársz el</span><strong>${esc(me.acting_as || '—')}</strong></div>
        ${me.channel_proven ? '' : '<div class="buttonrow"><button type="button" data-auth="resend">Új megerősítő levél kérése</button></div>'}
        <div class="divider"></div>
        <div class="buttonrow"><button type="button" data-action="logout">Kijelentkezés</button></div>
        <p class="muted" style="font-size:13px">Jelszó-változtatás ebben a csomagban még nem érhető el — ezért nem is kínálunk rá gombot.</p></section>`;
  }

  // ── FŐ RENDER ───────────────────────────────────────────────────────────────────────────────
  function render() {
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
        + head('Válassz fiókot', 'A folytatáshoz nyiss meg egy fiókot a fejléc fiókválasztójából.')
        + emptyBox(STATE.noAccount, 'A fejléc bal oldalán lévő fiókválasztóban megtalálod a személyes fiókodat és a vállalkozásaidat.',
          `<button type="button" class="primary" data-go="new">${PAGE.new}</button>`);
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
      case 'personal': body = head(PAGE.personal, 'A saját ügyeid egy helyen.')
        + emptyBox('Még nincs megjeleníthető ügyleted', 'A vállalkozásaid ügyeit a fejléc fiókválasztójából éred el.'); break;
      case 'outbox': body = head(PAGE.outbox, 'A vállalkozás kimenő levelei ezen a helyen lesznek elérhetők.')
        + emptyBox('Ez most mintanézet', 'A belépési és meghívólevelek a Próbaüzenetek panelen próbálhatók ki. Valódi levelet ez a bemutató nem küld.',
          '<button type="button" data-action="mail-open">Próbaüzenetek</button>'); break;
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
    if (!e.target.dataset || e.target.dataset.testid !== 'list-search') return;
    const pos = e.target.selectionStart;
    state.search = e.target.value;
    render();
    const again = byTest('list-search');
    if (again) { again.focus(); again.setSelectionRange(pos, pos); }
  });
  document.addEventListener('change', (e) => {
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
    if (d.testid === 'process-state') { state.processState = e.target.value; render(); return; }
    if (d.testid === 'ws-jurisdiction') {
      setText(byTest('ws-tax-label'), e.target.value === 'HU' ? 'Adószám' : 'Adóazonosító');
      show(byTest('ws-jurisdiction-other-row'), e.target.value === '__egyeb__');
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
      const r = await api('POST', '/api/register', { email, password });
      if (!r.ok) { formResult('register-result', reasonText(r.reason, r.message), 'bad'); return; }
      renderAuth('sent');
      return;
    }
    const r = await api('POST', '/api/login', { email, password });
    if (!r.ok) { formResult('login-result', reasonText(r.reason, 'Az e-mail-cím vagy a jelszó nem megfelelő.'), 'bad'); return; }
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
    formResult('resend-result', 'Levélkérés folyamatban…', '');
    const r = await api('POST', '/api/verification/resend', { email: cim });
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
        <h2>Vannak nem mentett módosításaid</h2>
        <p class="muted">Ha most másik fiókra váltasz, a megkezdett kitöltés elveszik. A fiókok adatai
          nem keverednek: a beírt szöveget nem visszük át az új fiókba.</p></div></div>
      <div class="buttonrow"><button type="button" class="primary" data-action="unsaved-keep"
          data-testid="unsaved-keep">Szerkesztés folytatása</button>
        <button type="button" class="danger" data-action="unsaved-discard" data-switch-to="${esc(id)}"
          data-testid="unsaved-discard">Elvetés és váltás</button></div></div>`, false);
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
        setText(byTest('ws-tax-error'), reasonText(r.reason, 'Add meg az adóazonosítót.'));
        if (input) { input.classList.add('fieldbad'); input.setAttribute('aria-invalid', 'true'); input.focus(); }
        formResult('ws-create-result', 'A vállalkozást még nem hoztuk létre. Javítsd a jelölt mezőt.', 'bad');
      } else {
        formResult('ws-create-result', reasonText(r.reason, r.message), 'bad');
      }
      return;
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
    if (!verdict.bound) { formResult('plan-result', unboundMessage(verdict.why), 'warn'); await contextChangedNotice(verdict.why); return; }
    if (!r.ok) { formResult('plan-result', reasonText(r.reason, r.message), 'bad'); return; }
    // A VISSZAJELZÉS A FRISSÍTÉS UTÁN SZÜLETIK: a frissítés újrarajzolja a képernyőt, és egy
    // előbb kiírt üzenetet elmosna (ugyanaz az osztály, mint a létrehozás-kártyánál).
    forgetForm('plan');                      // elmentve ⇒ nincs mit megőrizni (és nincs mit kérdezni)
    await refreshMe();
    formResult('plan-result', tpl('planSaved', { csomag: PLAN[r.plan] || r.plan }), 'ok');
  }

  async function doInvite(form) {
    const v = stampOf(form);
    if (await refuseStale(v)) return;
    const r = await apiInContext('POST', '/api/invites', {
      email: form.elements.email.value.trim(), role: form.elements.role.value, scope: form.elements.scope.value,
    }, v);
    const verdict = contextBindingVerdict(r, v);
    if (!verdict.bound) { formResult('invite-result', unboundMessage(verdict.why), 'warn'); await contextChangedNotice(verdict.why); return; }
    if (!r.ok) { formResult('invite-result', reasonText(r.reason, r.message), 'bad'); return; }
    formResult('invite-result', tpl('inviteReady', { mikor: whenText(r.expires_at) }), 'ok');
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
    notice(`${tpl('accountJoined', { nev: accountName() })} Az adatok megtekintését a fiókkezelő külön engedélyezi.`, 'ok');
    render();
  }

  // ── INDULÁS ─────────────────────────────────────────────────────────────────────────────────
  (async function start() {
    const url = new URL(location.href);
    state.inviteToken = url.searchParams.get('invite');
    const megerosites = url.searchParams.get('megerosites');
    if (megerosites) {
      state.resendReason = reasonText(megerosites, 'Ez a megerősítő link nem használható.');
      state.authView = 'resend';
    }
    await refreshMe();
    if (state.inviteToken) { await observeInvite(); render(); }
  })();
})();
