// v3app/public/app.js — A KÉPERNYŐ CSAK AZT RAJZOLJA, AMIT A SZERVER MOND. Nincs kliensoldali
// jogosultsági mátrix: minden „lehet-e" kérdésre a szerver nevezett válasza a forrás.
(() => {
  'use strict';
  const $ = (sel) => document.querySelector(sel);
  const byTest = (id) => document.querySelector(`[data-testid="${id}"]`);
  const show = (el, on) => { if (el) el.hidden = !on; };
  const text = (el, s) => { if (el) el.textContent = s; };
  const pretty = (o) => JSON.stringify(o, null, 2);

  async function api(method, path, body) {
    const opts = { method, credentials: 'same-origin', headers: {} };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const res = await fetch(path, opts);
    let json;
    try { json = await res.json(); } catch { json = { ok: false, reason: 'invalid_response' }; }
    return { status: res.status, ...json };
  }

  // KTX-01 — A KONTEXTUS A LAPON (R75/F75-02).
  //
  // MI VOLT A RÉSZLEGES ALAK. A generáció-számlálót CSAK a munkakörnyezet-váltó léptette, és csak az
  // adat-gombok nézték. Ezért: egy lassú TAGLISTA-válasz a váltás után is beírhatta a RÉGI cég
  // tagjait az ÚJ nézetbe, a kilépés után visszaérkező adat-válasz a rejtett panelbe írt, és egy
  // MÁSIK LAPON történt váltásról ez a lap nem tudott.
  //
  // A MAI ALAK — HÁROM RÉTEG, és mindhárom kell:
  //   1. GENERÁCIÓ: minden kontextus-váltó esemény lépteti (belépés · kilépés · váltás · létrehozás ·
  //      beváltás · megvonás). Minden kérés a SAJÁT generációjával tér vissza; ami elavult, azt a
  //      lap ELDOBJA — nem rajzolja, és a gombjai sem írnak.
  //   2. A SZERVER IGAZSÁGA: a `/me` minden válaszánál összevetjük, kinek a nevében és melyik
  //      könyvben állunk. Ha a szerver MÁST mond (mert egy másik lap ugyanabban a munkamenetben
  //      váltott), az KONTEXTUS-VÁLTÁS: léptet és ürít.
  //   3. A SZERVER MEGERŐSÍTÉSE: minden állapotváltoztató kérés VISZI a könyvet, amiben a gomb
  //      született (`expected_book_id`) — a szerver eltérésnél nevezetten elakad (KTX-01). Ez a
  //      réteg a döntő: a kliens jelzése SOHA nem ad jogot, csak SZŰKÍT.
  const state = {
    me: null,
    generation: 0,
    seq: 0,
    ctx: { subject: null, book: null },
    inviteToken: new URL(location.href).searchParams.get('invite'),
    resendReason: new URL(location.href).searchParams.get('megerosites'),
  };

  /** A kontextus léptetése — minden váltó esemény ezen megy át, hogy egy helyen legyen (KUKA-018). */
  function newContext(why) {
    state.generation += 1;
    clearPanels();
    return { generation: state.generation, why };
  }

  /** A mai kontextus jele: amivel egy válasz vagy egy gomb ÖSSZEHASONLÍTHATÓ. */
  const currentGeneration = () => state.generation;
  const currentBookId = () => (state.me && state.me.current_book_id) || null;

  /** Állapotváltoztató kérés a MAI könyv megerősítésével (KTX-01). */
  async function apiInContext(method, path, body) {
    const book = currentBookId();
    return api(method, path, book ? { ...body, expected_book_id: book } : body);
  }

  // ── FEJLÉC + LÁTHATÓSÁG ───────────────────────────────────────────────────────────────────────
  function renderMe() {
    const me = state.me;
    const loggedIn = !!(me && me.subject_id);
    text(byTest('header-subject'), loggedIn ? `${me.email || me.subject_id} (${me.subject_id})` : 'nincs bejelentkezve');
    text(byTest('header-workspace'), me && me.current_book_id
      ? `${me.current_book_name || me.current_book_id} · ${me.current_role}${me.current_plan ? ' · ' + me.current_plan : ''}`
      : 'nincs munkakörnyezet');
    text(byTest('channel-proven'), loggedIn ? (me.channel_proven ? 'igen' : 'nem — kattints a levél-fogadóban a megerősítő hivatkozásra, vagy kérj új hivatkozást') : '—');
    // A KÉPERNYŐ MONDJA KI, KI NEVÉBEN JÁRSZ EL — a SZERVER mondatával, nem a lap találgatásával.
    text(byTest('header-acting-as'), loggedIn ? (me.acting_as || '—') : '—');
    show(byTest('logout'), loggedIn);
    show($('#sec-workspace'), loggedIn);
    show($('#sec-data'), loggedIn && !!me.current_book_id);
    const isAdmin = loggedIn && me.current_role === 'admin';
    show($('#sec-members'), isAdmin);
    show($('#form-plan'), isAdmin);
    if (isAdmin && me.current_plan) byTest('plan-select').value = me.current_plan;

    // AZ ÚJRAKÉRÉS OTT VAN, AHOL KERESIK (KUKA-011): kilépve mindig, belépve akkor, ha a csatorna
    // még bizonyítatlan — a bizonyított fióknak nincs mit kérnie, és a felirat sem ígéri.
    show($('#form-resend'), !loggedIn || (loggedIn && me.channel_proven === false));

    const list = $('#ws-list');
    list.innerHTML = '';
    if (loggedIn && me.workspaces.length === 0) {
      list.innerHTML = me.channel_proven
        ? '<li class="muted">még nincs munkakörnyezeted — hozz létre egyet, vagy válts be egy meghívót</li>'
        : '<li class="muted">a SZEMÉLYES köröd a cím megerősítése után magától létrejön — kattints a megerősítő hivatkozásra, vagy kérj újat</li>';
    }
    for (const w of (loggedIn ? me.workspaces : [])) {
      const li = document.createElement('li');
      li.className = (w.book_id === me.current_book_id ? 'current' : '') + (w.personal ? ' personal' : '');
      li.dataset.testid = `ws-item-${w.book_id}`;
      // A SZEMÉLYES KÖR NEVESÍTETT CÉL A VÁLTÓBAN (SZK-01 · R64 L11) — nem egy sokadik „cég".
      const kindLabel = w.personal ? 'személyes kör' : 'közös munkakörnyezet';
      li.innerHTML = `<span><strong>${escapeHtml(w.name)}</strong> <span class="badge" data-testid="ws-kind-${escapeHtml(w.book_id)}">${kindLabel}</span> <span class="muted">${escapeHtml(w.book_id)} · ${escapeHtml(w.role)}${w.plan ? ' · ' + escapeHtml(w.plan) : ''}</span></span>`;
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = w.book_id === me.current_book_id ? 'aktív' : 'váltás';
      b.disabled = w.book_id === me.current_book_id;
      b.dataset.testid = `ws-switch-${w.book_id}`;
      b.addEventListener('click', () => switchWorkspace(w.book_id));
      li.appendChild(b);
      list.appendChild(li);
    }
    if (isAdmin) loadMembers(); else $('#members-list').innerHTML = '';
  }

  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  async function refreshMe() {
    const seq = (state.seq += 1);
    const me = await api('GET', '/api/me');
    // A KÉSVE ÉRKEZŐ `/me` NEM ÍRHATJA FELÜL AZ ÚJABBAT: két gyors váltásnál a régi válasz a RÉGI
    // cég fejlécét tenné vissza (a fejléc a kontextus egyik látható jele — KUKA-050).
    if (seq !== state.seq) return;
    // A SZERVER IGAZSÁGA DÖNT: ha az alany vagy a könyv MÁS, mint amit a lap hitt (mert egy másik
    // lap ugyanabban a munkamenetben váltott, vagy a tagságot megvonták), az KONTEXTUS-VÁLTÁS.
    if (me.subject_id !== state.ctx.subject || (me.current_book_id ?? null) !== state.ctx.book) {
      state.ctx = { subject: me.subject_id ?? null, book: me.current_book_id ?? null };
      state.generation += 1;
      clearPanels();
    }
    state.me = me;
    renderMe();
    if (state.inviteToken) await observeInvite();
  }

  /** ELAVULT ADAT NEM MARADHAT A KÉPERNYŐN: váltás előtt ürítünk, csak utána kérdezünk (KUKA-050). */
  function clearPanels() {
    text(byTest('data-stock'), '—');
    text(byTest('data-price'), '—');
    $('#members-list').innerHTML = '';
    text(byTest('members-result'), '');
  }

  async function switchWorkspace(bookId) {
    newContext('workspace_switch');
    const r = await api('POST', '/api/session/workspace', { book_id: bookId });
    notice(r.ok
      ? `${r.personal ? 'Személyes kör' : 'Munkakörnyezet'}: ${r.name || r.book_id} (${r.role})`
      : `Váltás elutasítva: ${r.reason} — ${r.message || ''}`, !r.ok);
    await refreshMe();
  }

  /**
   * A SZERVER MONDTA KI, HOGY ELAVULT (KTX-01 `context_mismatch`) — a MAGYARÁZAT NEM TŰNHET EL.
   *
   * MIÉRT A GLOBÁLIS SÁVBA MEGY. A magyarázat első alakja a tag-lista eredmény-sorába került, a rá
   * következő `refreshMe()` viszont kontextus-váltást észlelt (a másik lap váltott), tehát ÜRÍTETT
   * — és a felhasználó egy NÉMA, változatlan képernyőt kapott volna arról, hogy a kérése elakadt
   * (KUKA-012). A globális sávot a panel-ürítés nem törli; ezt a saját böngésző-próbám fogta meg.
   */
  async function contextMismatchNotice(r) {
    notice(r.message || 'Közben munkakörnyezetet váltottál — a művelet nem hajtódott végre.', true);
    await refreshMe();
    notice(r.message || 'Közben munkakörnyezetet váltottál — a művelet nem hajtódott végre.', true);
  }

  /** ELAVULT GOMB: nem csinál semmit — de KIMONDJA, miért (KUKA-064). */
  function staleNotice() {
    notice('Közben munkakörnyezetet váltottál — ez a gomb a korábbi kör listájából maradt itt, ezért nem hajtottuk végre. A lista frissül.', true);
    loadMembers();
  }

  function notice(msg, isError) {
    const el = byTest('global-notice');
    el.textContent = msg; el.className = 'notice' + (isError ? ' error' : ''); el.hidden = !msg;
  }

  // ── (1) FIÓK ──────────────────────────────────────────────────────────────────────────────────
  $('#form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const r = await api('POST', '/api/register', { email: f.email.value, password: f.password.value });
    text(byTest('register-result'), r.ok ? r.message : `${r.reason}: ${r.message || ''}`);
    await loadMailbox();
  });

  $('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const r = await api('POST', '/api/login', { email: f.email.value, password: f.password.value });
    text(byTest('login-result'), r.ok ? 'Belépve.' : `${r.reason}: ${r.message || ''}`);
    if (r.ok && r.pending_invite_token) state.inviteToken = r.pending_invite_token;
    newContext('login');
    await refreshMe();
  });

  $('#btn-logout').addEventListener('click', async () => {
    await api('POST', '/api/logout');
    newContext('logout');
    text(byTest('login-result'), 'Kiléptél.');
    await refreshMe();
  });

  // ÚJ MEGERŐSÍTŐ HIVATKOZÁS (F75-01) — a lejárt hivatkozás FOLYTATÁSA, nem új regisztráció.
  $('#form-resend').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const r = await api('POST', '/api/verification/resend', { email: f.email.value });
    text(byTest('resend-result'), r.ok ? r.message : `${r.reason}: ${r.message || ''}`);
    await loadMailbox();
  });

  // ── (2) MUNKAKÖRNYEZET ────────────────────────────────────────────────────────────────────────
  byTest('ws-business').addEventListener('change', (e) => show($('#ws-business-fields'), e.target.checked));

  $('#form-ws').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const body = { name: f.name.value, plan: f.plan.value };
    if (f.is_business.checked) body.business = { jurisdiction: f.jurisdiction.value, tax_id: f.tax_id.value };
    newContext('workspace_create');
    const r = await api('POST', '/api/workspaces', body);
    text(byTest('ws-create-result'), r.ok
      ? `Létrejött: ${r.name} (${r.book_id}) · terv: ${r.workspace.plan}`
        + (r.business ? ` · vállalkozási minőség: ${r.business.ok ? `${r.business.jurisdiction} ${r.business.value_norm} — ÖNBEVALLOTT, hatósági igazolás: ${r.business.verification} (más szervezet képviselete ebből nem következik)` : `nem rögzült (${r.business.reason})`}` : '')
      : `${r.reason}${r.field ? ` (${r.field})` : ''}: ${r.message || ''}`);
    await refreshMe();
  });

  $('#form-plan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = await apiInContext('POST', '/api/workspaces/plan', { plan: e.target.plan.value });
    text(byTest('plan-result'), r.ok ? `Terv: ${r.plan} (${r.features.join(', ')})` : `${r.reason}: ${r.message || ''}`);
    text(byTest('data-price'), '—');
    await refreshMe();
  });

  // ── (3) MUNKATÁRSAK ───────────────────────────────────────────────────────────────────────────
  $('#form-invite').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const r = await apiInContext('POST', '/api/invites', { email: f.email.value, role: f.role.value, scope: f.scope.value });
    text(byTest('invite-result'), r.ok
      ? `Meghívó kiadva (${r.token.slice(0, 8)}…) · plafon: szerepek ${r.ceiling.roles.join('/')}, adatkörök ${r.ceiling.scopes.join('/')} · lejár: ${r.expires_at}`
      : `Elutasítva: ${r.reason} — ${r.message || ''}` + (r.ceiling ? ` (plafon: ${pretty(r.ceiling)})` : ''));
    await loadMailbox();
  });

  async function loadMembers() {
    const list = $('#members-list');
    // A KÉRÉS A SAJÁT GENERÁCIÓJÁVAL TÉR VISSZA (KTX-01): ha közben váltottunk, a RÉGI cég
    // taglistája nem kerülhet az ÚJ nézetbe — ez volt az F75-02 első ága, valódi versenyben mérve.
    const gen = currentGeneration();
    const book = currentBookId();
    const r = await api('GET', '/api/members');
    if (gen !== currentGeneration()) return;
    list.innerHTML = '';
    // A LISTA ÚJRATÖLTÉSE NEM TÖRLI A MŰVELET EREDMÉNYÉT: a „megadva"/„megvonva" mondatnak a
    // képernyőn kell maradnia (KUKA-012) — csak a munkakörnyezet-váltás (clearPanels) törli.
    if (!r.ok) { text(byTest('members-result'), `${r.reason}: ${r.message || ''}`); return; }
    // A VÁLASZ MEGMONDJA, MELYIK KÖNYVÉ — és ha nem a mai, eldobjuk (a generáció-őr mellé egy
    // TARTALMI ellenőrzés: a szerver igazsága, nem a lap számlálója).
    if (r.book_id && book && r.book_id !== book) return;
    for (const m of r.members) {
      const li = document.createElement('li');
      li.dataset.testid = `member-${m.subject_id}`;
      const scopes = Object.entries(m.scopes).map(([k, v]) => `${k}: ${v.granted ? 'van' : 'nincs (' + v.reason + ')'}`).join(' · ');
      li.innerHTML = `<span><strong>${escapeHtml(m.email || m.subject_id)}</strong> <span class="muted">${escapeHtml(m.subject_id)} · ${escapeHtml(m.role)} · ${m.effective ? 'hatályos' : 'NEM hatályos (' + escapeHtml(m.effective_reason) + ')'}</span><br><span class="small">${escapeHtml(scopes)}</span></span>`;
      const ctl = document.createElement('span'); ctl.className = 'ctl';
      const sel = document.createElement('select');
      for (const s of r.known_scopes) { const o = document.createElement('option'); o.value = s; o.textContent = s; sel.appendChild(o); }
      sel.dataset.testid = `member-scope-select-${m.subject_id}`;
      const grant = document.createElement('button'); grant.type = 'button'; grant.textContent = 'adatkör adása';
      grant.dataset.testid = `member-scope-${m.subject_id}`;
      grant.addEventListener('click', async () => {
        // A GOMB A SAJÁT KÖRÉBEN ÍR, VAGY SEHOL: a kérés viszi a könyvet, amiben született, és a
        // lap a saját generációját is ellenőrzi (KTX-01 · F75-02 második ága).
        if (gen !== currentGeneration()) { staleNotice(); return; }
        const g = await api('POST', '/api/members/scope', { subject_id: m.subject_id, scope: sel.value, ...(book ? { expected_book_id: book } : {}) });
        if (g.reason === 'context_mismatch') { contextMismatchNotice(g); return; }
        if (gen !== currentGeneration()) return;
        text(byTest('members-result'), g.ok ? `Adatkör megadva: ${g.scope} → ${m.email || m.subject_id}` : `Elutasítva: ${g.reason} ${g.message || ''}${g.ceiling ? ' (plafon: ' + g.ceiling.join('/') + ')' : ''}`);
        await loadMembers();
      });
      const revoke = document.createElement('button'); revoke.type = 'button'; revoke.textContent = 'megvonás'; revoke.className = 'danger';
      revoke.dataset.testid = `member-revoke-${m.subject_id}`;
      revoke.disabled = !m.effective;
      revoke.addEventListener('click', async () => {
        if (gen !== currentGeneration()) { staleNotice(); return; }
        const v = await api('POST', '/api/members/revoke', { subject_id: m.subject_id, ...(book ? { expected_book_id: book } : {}) });
        if (v.reason === 'context_mismatch') { contextMismatchNotice(v); return; }
        if (gen !== currentGeneration()) return;
        text(byTest('members-result'), v.ok ? `Megvonva: ${m.email || m.subject_id} (${v.reason})` : `Elutasítva: ${v.reason} — ${v.message || ''}`);
        await refreshMe();
      });
      ctl.append(sel, grant, revoke);
      li.appendChild(ctl);
      list.appendChild(li);
    }
  }

  // ── (4) ADATOK ────────────────────────────────────────────────────────────────────────────────
  function gateText(r) {
    if (r.ok) return `KIADVA\n${pretty(r.result)}`;
    const lines = [`ELUTASÍTVA — melyik kapu: ${r.refused_by}`];
    if (r.reason) lines.push(`ok: ${r.reason}`);
    if (r.right_reason) lines.push(`jog-kapu: ${r.right_reason}`);
    if (r.entitlement_reason) lines.push(`előfizetés-kapu: ${r.entitlement_reason}${r.entitlement && r.entitlement.plan ? ' (terv: ' + r.entitlement.plan + ')' : ''}`);
    if (r.message) lines.push(r.message);
    if (r.param_ignored) lines.push(`(figyelmen kívül hagyott kliens-mezők: ${r.ignored_params.join(', ')})`);
    return lines.join('\n');
  }
  // GENERÁCIÓ-ŐR (KUKA-046 · az R64 ellenséges felülvizsgálat H08 lelete): ha a válasz megérkezése
  // ELŐTT munkakörnyezetet váltottak, a régi cég válasza nem írható az új cég paneljébe. Minden
  // váltás lépteti a számlálót; a késve érkező válasz a saját generációját hasonlítja a maihoz.
  async function fetchData(path, testId) {
    // A FEJLÉC ELŐBB FRISSÜL (ugyanaz a munkamenet egy másik lapon már válthatott): a kérés a
    // SZERVER mai könyvére megy, és a lap ezt mutatja, nem a nyitáskori állapotot.
    await refreshMe();
    const gen = currentGeneration();
    text(byTest(testId), '…');
    const r = await api('GET', path);
    // KÖZBEN VÁLTOTTAK (ez a lap, egy másik lap, vagy megvonás) — a válasz elavult, nem rajzoljuk.
    if (gen !== currentGeneration()) return;
    text(byTest(testId), gateText(r));
  }
  $('#btn-stock').addEventListener('click', () => fetchData('/api/data/stock', 'data-stock'));
  $('#btn-price').addEventListener('click', () => fetchData('/api/data/price', 'data-price'));

  // ── (5) MEGHÍVÓ ───────────────────────────────────────────────────────────────────────────────
  async function observeInvite() {
    const token = state.inviteToken;
    show($('#sec-invite'), !!token);
    if (!token) return;
    text(byTest('invite-token'), token);
    await api('POST', '/api/invites/pending', { token });       // a szándék a szerveren áll, lejárattal
    const o = await api('GET', `/api/invites/observe?token=${encodeURIComponent(token)}`);
    text(byTest('invite-observe'), pretty(o));
    const loggedIn = !!(state.me && state.me.subject_id);
    let next = '';
    let canRedeem = false;
    switch (o.status) {
      case 'needs_invitee_identity':
        next = loggedIn
          ? 'Ez a fiók nem a meghívás címzettje, vagy a címzetti csatorna nincs bizonyítva. Lépj ki, majd lépj be / regisztrálj azzal a címmel, amelyre a meghívó érkezett, és erősítsd meg a levél-fogadóban.'
          : 'Folytasd a meghívás címzettjének azonosságával: lépj be, vagy regisztrálj azzal a címmel, amelyre a meghívó érkezett (utána a megerősítő hivatkozás a levél-fogadóban). Belépés után ide visszatérünk.';
        break;
      case 'redeem_as_existing':
        next = loggedIn ? `A címhez (${o.continue_as.hint}) tartozó fiókkal be vagy lépve — váltsd be a meghívót.` : `Ehhez a címhez (${o.continue_as.hint}) tartozik belépés — jelentkezz be vele, és a meghívás folytatódik.`;
        canRedeem = loggedIn;
        break;
      case 'redeem_as_new':
        next = `Állíts be belépést ehhez a címhez (${o.continue_as.hint}): regisztrálj, erősítsd meg, lépj be — majd váltsd be.`;
        canRedeem = loggedIn;
        break;
      case 'not_actionable':
        next = `Ehhez a hivatkozáshoz most nem tartozik beváltható meghívás (${o.reason}).`;
        break;
      default:
        next = o.message || '';
    }
    text(byTest('invite-next'), next);
    show($('#btn-redeem'), canRedeem);
  }

  $('#btn-redeem').addEventListener('click', async () => {
    const r = await api('POST', '/api/invites/redeem', { token: state.inviteToken });
    const out = byTest('invite-redeem-result');
    show(out, true);
    text(out, pretty(r));
    if (r.ok) {
      notice(`Meghívó beváltva: ${r.book_id} (${r.shape} / ${r.outcome}). Az olvasási jogot az admin adja meg külön lépésben. A SZEMÉLYES köröd megmarad — a váltóban mindkettő ott lesz.`, false);
      state.inviteToken = null;
      history.replaceState(null, '', '/');
      show($('#sec-invite'), false);
      newContext('invite_redeem');
    }
    await refreshMe();
  });

  // ── (6) LEVÉL-FOGADÓ ──────────────────────────────────────────────────────────────────────────
  async function loadMailbox() {
    const r = await api('GET', '/dev/mailbox');
    const list = $('#mailbox');
    list.innerHTML = '';
    if (!r.ok) return;
    if (!r.mails.length) list.innerHTML = '<li class="muted">még nincs levél</li>';
    for (const m of r.mails) {
      const li = document.createElement('li');
      li.dataset.testid = `mail-${m.id}`;
      li.innerHTML = `<span><strong>${escapeHtml(m.subject)}</strong> <span class="muted">→ ${escapeHtml(m.to)} · ${escapeHtml(m.at)}</span><br><span class="small">${escapeHtml(m.body)}</span><br><a href="${escapeHtml(m.link)}" data-testid="mail-link-${m.id}">${escapeHtml(m.link)}</a></span>`;
      list.appendChild(li);
    }
  }
  $('#btn-mailbox').addEventListener('click', loadMailbox);

  // ── INDULÁS ───────────────────────────────────────────────────────────────────────────────────
  // A MEGERŐSÍTŐ LAPRÓL VISSZATÉRŐ FOLYTATÁS (F75-01): a lap KIMONDJA, mi történt, és az újrakérés
  // űrlapja készen áll — nem a felhasználónak kell kitalálnia, hogy most mit tegyen (KUKA-064).
  if (state.resendReason) {
    const REASONS = {
      challenge_expired: 'A megerősítő hivatkozás lejárt. Kérj újat — a jelszavad nem változik.',
      challenge_superseded: 'Ehhez a címhez újabb megerősítő levelet kértek: a LEGUTÓBBI levél hivatkozása él.',
      challenge_already_used: 'Ezt a hivatkozást már beváltották — ha te voltál, egyszerűen lépj be.',
      challenge_unknown: 'Ismeretlen vagy hibás hivatkozás. Kérj újat a címedre.',
    };
    notice(Object.prototype.hasOwnProperty.call(REASONS, state.resendReason) ? REASONS[state.resendReason] : 'A megerősítés nem sikerült — kérj új hivatkozást.', true);
    history.replaceState(null, '', '/');
  }
  refreshMe().then(loadMailbox);
})();
