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

  const state = { me: null, generation: 0, inviteToken: new URL(location.href).searchParams.get('invite') };

  // ── FEJLÉC + LÁTHATÓSÁG ───────────────────────────────────────────────────────────────────────
  function renderMe() {
    const me = state.me;
    const loggedIn = !!(me && me.subject_id);
    text(byTest('header-subject'), loggedIn ? `${me.email || me.subject_id} (${me.subject_id})` : 'nincs bejelentkezve');
    text(byTest('header-workspace'), me && me.current_book_id
      ? `${me.current_book_name || me.current_book_id} · ${me.current_role}${me.current_plan ? ' · ' + me.current_plan : ''}`
      : 'nincs munkakörnyezet');
    text(byTest('channel-proven'), loggedIn ? (me.channel_proven ? 'igen' : 'nem — kattints a levél-fogadóban a megerősítő hivatkozásra') : '—');
    show(byTest('logout'), loggedIn);
    show($('#sec-workspace'), loggedIn);
    show($('#sec-data'), loggedIn && !!me.current_book_id);
    const isAdmin = loggedIn && me.current_role === 'admin';
    show($('#sec-members'), isAdmin);
    show($('#form-plan'), isAdmin);
    if (isAdmin && me.current_plan) byTest('plan-select').value = me.current_plan;

    const list = $('#ws-list');
    list.innerHTML = '';
    if (loggedIn && me.workspaces.length === 0) list.innerHTML = '<li class="muted">még nincs munkakörnyezeted — hozz létre egyet, vagy válts be egy meghívót</li>';
    for (const w of (loggedIn ? me.workspaces : [])) {
      const li = document.createElement('li');
      li.className = w.book_id === me.current_book_id ? 'current' : '';
      li.dataset.testid = `ws-item-${w.book_id}`;
      li.innerHTML = `<span><strong>${escapeHtml(w.name)}</strong> <span class="muted">${escapeHtml(w.book_id)} · ${escapeHtml(w.role)}${w.plan ? ' · ' + escapeHtml(w.plan) : ''}</span></span>`;
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
    state.me = await api('GET', '/api/me');
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
    state.generation += 1;
    clearPanels();
    const r = await api('POST', '/api/session/workspace', { book_id: bookId });
    notice(r.ok ? `Munkakörnyezet: ${r.name || r.book_id} (${r.role})` : `Váltás elutasítva: ${r.reason} — ${r.message || ''}`, !r.ok);
    await refreshMe();
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
    clearPanels();
    await refreshMe();
  });

  $('#btn-logout').addEventListener('click', async () => {
    await api('POST', '/api/logout');
    clearPanels();
    text(byTest('login-result'), 'Kiléptél.');
    await refreshMe();
  });

  // ── (2) MUNKAKÖRNYEZET ────────────────────────────────────────────────────────────────────────
  byTest('ws-business').addEventListener('change', (e) => show($('#ws-business-fields'), e.target.checked));

  $('#form-ws').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const body = { name: f.name.value, plan: f.plan.value };
    if (f.is_business.checked) body.business = { jurisdiction: f.jurisdiction.value, tax_id: f.tax_id.value };
    clearPanels();
    const r = await api('POST', '/api/workspaces', body);
    text(byTest('ws-create-result'), r.ok
      ? `Létrejött: ${r.name} (${r.book_id}) · terv: ${r.workspace.plan}` + (r.business ? ` · vállalkozási minőség: ${r.business.ok ? `${r.business.jurisdiction} ${r.business.value_norm} — önbevallott, igazolás: ${r.business.verification}` : `nem rögzült (${r.business.reason})`}` : '')
      : `${r.reason}: ${r.message || ''}`);
    await refreshMe();
  });

  $('#form-plan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = await api('POST', '/api/workspaces/plan', { plan: e.target.plan.value });
    text(byTest('plan-result'), r.ok ? `Terv: ${r.plan} (${r.features.join(', ')})` : `${r.reason}: ${r.message || ''}`);
    text(byTest('data-price'), '—');
    await refreshMe();
  });

  // ── (3) MUNKATÁRSAK ───────────────────────────────────────────────────────────────────────────
  $('#form-invite').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const r = await api('POST', '/api/invites', { email: f.email.value, role: f.role.value, scope: f.scope.value });
    text(byTest('invite-result'), r.ok
      ? `Meghívó kiadva (${r.token.slice(0, 8)}…) · plafon: szerepek ${r.ceiling.roles.join('/')}, adatkörök ${r.ceiling.scopes.join('/')} · lejár: ${r.expires_at}`
      : `Elutasítva: ${r.reason} — ${r.message || ''}` + (r.ceiling ? ` (plafon: ${pretty(r.ceiling)})` : ''));
    await loadMailbox();
  });

  async function loadMembers() {
    const list = $('#members-list');
    const r = await api('GET', '/api/members');
    list.innerHTML = '';
    // A LISTA ÚJRATÖLTÉSE NEM TÖRLI A MŰVELET EREDMÉNYÉT: a „megadva"/„megvonva" mondatnak a
    // képernyőn kell maradnia (KUKA-012) — csak a munkakörnyezet-váltás (clearPanels) törli.
    if (!r.ok) { text(byTest('members-result'), `${r.reason}: ${r.message || ''}`); return; }
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
        const g = await api('POST', '/api/members/scope', { subject_id: m.subject_id, scope: sel.value });
        text(byTest('members-result'), g.ok ? `Adatkör megadva: ${g.scope} → ${m.email || m.subject_id}` : `Elutasítva: ${g.reason} ${g.message || ''}${g.ceiling ? ' (plafon: ' + g.ceiling.join('/') + ')' : ''}`);
        await loadMembers();
      });
      const revoke = document.createElement('button'); revoke.type = 'button'; revoke.textContent = 'megvonás'; revoke.className = 'danger';
      revoke.dataset.testid = `member-revoke-${m.subject_id}`;
      revoke.disabled = !m.effective;
      revoke.addEventListener('click', async () => {
        const v = await api('POST', '/api/members/revoke', { subject_id: m.subject_id });
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
    const gen = state.generation;
    text(byTest(testId), '…');
    const r = await api('GET', path);
    if (gen !== state.generation) return;   // közben váltottak — a válasz elavult, nem rajzoljuk
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
      notice(`Meghívó beváltva: ${r.book_id} (${r.shape} / ${r.outcome}). Az olvasási jogot az admin adja meg külön lépésben.`, false);
      state.inviteToken = null;
      history.replaceState(null, '', '/');
      show($('#sec-invite'), false);
      clearPanels();
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
  refreshMe().then(loadMailbox);
})();
