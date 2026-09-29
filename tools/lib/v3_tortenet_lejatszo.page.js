  // ── R112: A TÖRTÉNETEK LEJÁTSZÓJA (beágyazva a bemutató-lap közös IIFE-jébe; P · st · D · esc innen jön) ──
  // A kezelő feliratai az operátornak szólnak (magyarul); a SZIMULÁLT képernyők szövege a kiválasztott
  // nyelv csomagjából jön. A lap nem hív szervert, nem ír adatot, és nem fogad el meghívót.
  const SS = { mode: 'stories', story: null, at: 0, phase: 'before', done: 0, langBefore: null };
  const EMAIL = { anna: 'anna@pelda.hu', bea: 'bea@pelda.hu', cecil: 'cecil@pelda.hu' };
  const MINE = 'te@pelda.hu';

  function deep(box, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), box); }
  function tplT(key, vals) {
    const t = (D().TPL || {})[key] || '';
    return t.replace(/\{(\w+)\}/g, (_, k) => (vals && vals[k] != null && vals[k] !== '' ? String(vals[k]) : '—'));
  }
  /** Szöveg-hivatkozás feloldása a KIVÁLASZTOTT nyelven — a hiány kimondott, nem üres. */
  function T(ref) {
    if (!ref) return '';
    const parts = ref.split(':');
    if (parts.length === 1) return deep(D(), ref) || ('[' + ref + ']');
    const [kind, id, field] = parts;
    const group = { KB: 'KB', FAQ: 'FAQ', TOUR: 'TOUR', STORY: 'STORY' }[kind];
    if (group) { const box = (D()[group] || {})[id]; const v = box ? deep(box, field) : null; return v || ('[' + ref + ']'); }
    if (kind === 'TPL') return tplT(id, {});
    if (kind === 'NAME') return id;
    return '[' + ref + ']';
  }
  const accountLabel = (h) => (!h ? '' : h.personal ? D().STATE.personalAccount : h.name);
  function actingAs(h, email) {
    if (!h) return '—';
    return h.personal ? tplT('actingAsPersonal', { ki: email, fiok: D().STATE.personalAccount })
      : tplT('actingAsBusiness', { ki: email, fiok: h.name, szerep: D().ROLE[h.role] || h.role });
  }
  function nextLang() {
    const codes = P.LANGS.filter((l) => l.enabled && l.kind === 'product').map((l) => l.code);
    return codes.find((c) => c !== st.lang && c === 'de') || codes.find((c) => c !== st.lang) || st.lang;
  }
  const endonym = (c) => (P.LANGS.find((l) => l.code === c) || {}).endonym || c;

  /** Az alkalmazás-keret EGYSZERŰSÍTETT képe: fejléc (fiók · ki nevében) és a tartalom. */
  function frame(sc, inner) {
    const h = sc.header;
    const email = EMAIL[sc.who] || MINE;
    const head = h && h.none
      ? '<div class="sframe-head"><strong>VS</strong><span class="sacc" data-testid="sim-header-account">' + esc(D().UI.chooseAccount) + '</span>'
        + '<span class="sact">' + esc(email) + '</span></div>'
      : h
      ? '<div class="sframe-head"><strong>VS</strong><span class="sacc" data-testid="sim-header-account">' + esc(accountLabel(h)) + '</span>'
        + '<span class="sact" data-testid="sim-acting-as">' + esc(actingAs(h, email)) + '</span></div>'
      : '<div class="sframe-head"><strong>VS</strong><span class="sacc">' + esc(D().UI.notSignedIn || '') + '</span></div>';
    return '<div class="sframe">' + head + '<div class="sframe-body">' + inner + '</div></div>';
  }
  function actBtn(label) { return '<button class="p sact-btn" data-sact="1" data-testid="story-act">' + esc(label) + '</button>'; }

  /** A meghívó-képernyő öt helyzete — ugyanazok a mondatok, mint a valódi lapon (`inviteText.mjs`). */
  function invitePage(sit) {
    const U = D().UI; const R = D().REASON;
    const map = {
      anon: { lead: U.inviteNeedsIdentityLead, next: U.inviteWrongAddress, id: U.inviteNotSignedIn, acc: false },
      ready: { lead: U.inviteAsExistingLead, next: U.inviteNextAccept, id: (U.signedInAs || '') + ': bea@pelda.hu', acc: true },
      other: { lead: U.inviteNeedsIdentityLead, next: U.inviteOtherPersonLead, id: (U.signedInAs || '') + ': cecil@pelda.hu', acc: false },
      expired: { lead: R.invite_expired, next: U.inviteNextNewInvite, id: (U.signedInAs || '') + ': bea@pelda.hu', acc: false },
      used: { lead: R.invite_already_redeemed, next: U.inviteNextUsed, id: (U.signedInAs || '') + ': bea@pelda.hu', acc: false },
    }[sit] || {};
    return '<h2>' + esc(U.inviteGenericTitle) + '</h2>'
      + (map.acc ? '<p><strong>Minta Kft</strong></p><p class="muted">' + esc(U.inviteRoleLine) + ': ' + esc(D().ROLE.user) + ' · '
        + esc(U.inviteInvitedByLine) + ': anna@pelda.hu</p>' : '')
      + '<p data-testid="sim-invite-lead">' + esc(map.lead || '') + '</p>'
      + '<p class="muted">' + esc(U.inviteWhatHappens) + '</p>'
      + '<p class="muted">' + esc(map.id || '') + '</p>'
      + '<p class="snext" data-testid="sim-invite-next">' + esc(map.next || '') + '</p>'
      + '<p class="muted">' + esc(U.inviteFaqOpen) + ' · ' + esc(U.inviteTourStart) + '</p>';
  }

  /** Egy képernyő a SZIMULÁLT alkalmazásban. `act` csak a művelet ELŐTTI képen áll. */
  function screenHtml(sc, act) {
    const U = D().UI; const S = D().STATE;
    let inner = '';
    switch (sc.screen) {
      case 'register': inner = '<h2>' + esc(U.registerTitle) + '</h2><p class="muted">' + esc(U.registerLead || '') + '</p>'
        + '<p>' + esc(U.email) + ': <code>te@pelda.hu</code><br>' + esc(U.password) + ': ••••••••</p>'; break;
      case 'sent': inner = '<h2>✉ ' + esc(U.checkMailTitle) + '</h2><p data-testid="sim-result">' + esc(U.registerSentLead) + '</p>'; break;
      case 'mailbox': inner = '<h2>' + esc(D().UI.mailboxTitle) + '</h2><ul class="list"><li><b>' + esc(T(sc.mail).replace('{fiok}', 'Minta Kft')) + '</b><br><small class="muted">'
        + esc(sc.who === 'bea' ? 'bea@pelda.hu' : 'te@pelda.hu') + '</small></li></ul>'; break;
      case 'verified': inner = '<h2>✓ ' + esc(D().SRV.verifyTitleOk) + '</h2><p data-testid="sim-result">' + esc(D().SRV.verifyOkLeadPersonal || D().SRV.verifyOkLead) + '</p>'; break;
      case 'login': inner = '<h2>' + esc(U.loginTitle) + '</h2><p class="muted">' + esc(U.loginLead || '') + '</p><p>' + esc(U.email) + ': <code>te@pelda.hu</code></p>'; break;
      case 'overview': {
        const h = sc.header || {};
        const lead = h.personal ? U.overviewPersonalLead : U.overviewLead;
        let note = '';
        if (sc.notice) {
          const vals = { nev: sc.notice.nev, ki: sc.notice.ki, mit: sc.notice.scope ? (D().SCOPE_ACC || {})[sc.notice.scope] || D().SCOPE[sc.notice.scope] : '' };
          note = '<p class="snote ok" data-testid="sim-result">' + esc(tplT(sc.notice.tpl, vals)) + '</p>';
        }
        if (sc.joined) note = '<p class="snote ok" data-testid="sim-result">' + esc(U.inviteAcceptedLead + ' ' + tplT('accountJoined', { nev: 'Minta Kft' }) + ' ' + U.inviteJoinedScopeNote) + '</p>'
          + '<div class="sbubble" data-testid="sim-tour-closure"><b>' + esc(D().TOURUI.finishedTitle) + '</b><br>' + esc(D().TOURUI.carriedLeadInvite)
          + '<br><small>' + esc(D().TOURUI.done) + ': 4 · ' + esc(D().TOURUI.skipped) + ': 0 · ' + esc(D().TOURUI.pending) + ': 0</small></div>';
        if (sc.langChanged || sc.langKept) note += '<p class="snote" data-testid="sim-result">' + esc((U.language || 'Nyelv') + ': ' + endonym(st.lang)) + (sc.langKept ? ' ✓' : '') + '</p>';
        inner = note + '<h2>' + esc(D().PAGE.overview) + '</h2><p class="muted">' + esc(lead) + '</p>'
          + (h.personal ? '' : '<p>' + esc(U.statRole) + ': <b>' + esc(D().ROLE[h.role] || '') + '</b></p>');
        break;
      }
      case 'language': inner = '<h2>' + esc(D().PAGE.profile) + '</h2><p>' + esc(U.language || '') + ': <b>' + esc(endonym(st.lang)) + '</b> → <b>' + esc(endonym(nextLang())) + '</b></p>'; break;
      case 'newBusiness': inner = '<h2>' + esc(D().PAGE.new) + '</h2><p><b>' + esc(S.kindBusiness) + '</b> — ' + esc(S.kindBusinessLead) + '</p>'
        + '<p>Minta Kft · HU · <code>12345678-2-42</code></p><p class="muted">' + esc(S.kindShared) + ' — ' + esc(S.kindSharedLead) + '</p>'; break;
      case 'switcher': {
        const accs = [{ personal: true }, { name: 'Minta Kft' }, { name: 'Saját Bt' }];
        inner = '<h2>' + esc(U.activeAccountCard || '') + '</h2><ul class="list">' + accs.map((a) => {
          const on = sc.target === (a.personal ? 'personal' : a.name);
          return '<li' + (on ? ' class="starget"' : '') + '>' + esc(a.personal ? S.personalAccount : a.name) + '</li>';
        }).join('') + '</ul><p class="muted">' + esc(U.switchAccountLead || '') + '</p>';
        break;
      }
      case 'members': {
        let note = '';
        if (sc.notice) note = '<p class="snote ok" data-testid="sim-result">' + esc(tplT(sc.notice.tpl, { ki: sc.notice.ki, nev: sc.notice.nev,
          mit: sc.notice.scope ? (D().SCOPE_ACC || {})[sc.notice.scope] || D().SCOPE[sc.notice.scope] : '' })) + '</p>';
        inner = note + '<h2>' + esc(D().PAGE.members) + '</h2><p class="muted">' + esc(U.membersLead || '') + '</p>'
          + '<ul class="list"><li>anna@pelda.hu · ' + esc(D().ROLE.admin) + '</li><li>bea@pelda.hu · ' + esc(D().ROLE.user) + '</li></ul>';
        break;
      }
      case 'inviteForm': inner = '<h2>' + esc(U.inviteTitle) + '</h2><p class="muted">' + esc(U.inviteLead) + '</p>'
        + '<p>' + esc(U.email) + ': <code>bea@pelda.hu</code> · ' + esc(D().ROLE.user) + ' · ' + esc(D().SCOPE.keszlet) + '</p>'; break;
      case 'inviteReady': inner = '<p class="snote ok" data-testid="sim-result">' + esc(tplT('inviteReady', { mikor: '2026-10-06' })) + '</p>'
        + '<p class="muted">' + esc(U.inviteMailOpen || '') + '</p>'; break;
      case 'invitePage': inner = invitePage(sc.situation); break;
      case 'grantPanel': inner = '<h2>bea@pelda.hu</h2><p>' + esc(U.scopeToGrant || '') + ': <b>' + esc(D().SCOPE.keszlet) + '</b></p>'; break;
      case 'stock': inner = '<h2>' + esc(D().PAGE.stock) + '</h2>' + (sc.access
        ? '<table class="stable" data-testid="sim-result"><tr><th>' + esc(U.colProduct || '') + '</th><th>' + esc(U.colQty || '') + '</th></tr>'
          + '<tr><td>Minta termék</td><td>12</td></tr></table>'
        : '<p class="snote warn" data-testid="sim-result">' + esc(D().REASON.no_scope_grant) + '</p>'); break;
      case 'revokeConfirm': inner = '<h2>' + esc(tplT('revokeTitle', { ki: 'bea@pelda.hu', nev: 'Minta Kft' })) + '</h2><p>' + esc(tplT('revokeLead', { ki: 'bea@pelda.hu', nev: 'Minta Kft' })) + '</p>'; break;
      // A VALÓDI LAP ÁLLAPOTA a megszűnés után: fiók nincs kiválasztva, a mondat KIMONDJA, mi történt, és
      // a személyes fiók megnyitását kínálja (R81 §5/13 · a `refreshMe` hozzáférés-vesztés ága).
      case 'lost': inner = '<p class="snote warn" data-testid="sim-result">' + esc(tplT('accountLost', { nev: 'Minta Kft' }) + ' ' + U.personalStillUsable)
        + ' <span class="slink">' + esc(U.openPersonal) + '</span></p>'
        + '<h2>' + esc(U.chooseAccount) + '</h2><p class="muted">' + esc(U.chooseAccountLead) + '</p>'; break;
      case 'faq': { const f = (D().FAQ || {})[sc.faq] || {}; inner = '<h2>' + esc(f.q || '') + '</h2><p data-testid="sim-result">' + esc(f.a || '') + '</p>'; break; }
      default: inner = '<p class="warn">[' + esc(sc.screen) + ']</p>';
    }
    return frame(sc, inner + (act ? '<p>' + act + '</p>' : ''));
  }

  function actLabel(step) {
    if (step.act === 'LANG') return (D().UI.language || 'Nyelv') + ': ' + endonym(nextLang());
    // A levél tárgya helyőrzőt hordoz ({fiok}) — a szintetikus fiók nevével töltjük ki.
    return T(step.act).replace('{fiok}', 'Minta Kft');
  }
  function evidenceHtml(id) {
    const ev = (P.EVIDENCE && P.EVIDENCE.stories && P.EVIDENCE.stories[id]) || null;
    const story = P.STORIES.find((s) => s.id === id);
    const rows = story.evidence.map((e, i) => {
      const m = ev ? ev[i] : null;
      const mark = !m ? '<span class="evno">nem mért</span>' : m.runs && m.passed === m.runs
        ? '<span class="evok">✓ ' + m.passed + '/' + m.runs + '</span>' : '<span class="evbad">✗ ' + m.passed + '/' + m.runs + '</span>';
      return '<li>' + mark + ' <code>' + esc(e.spec.replace('tests/e2e/', '')) + '</code> — ' + esc(e.title) + '</li>';
    }).join('');
    const when = P.EVIDENCE ? ' (' + esc(P.EVIDENCE.measured_at || '') + ' · ' + esc((P.EVIDENCE.commit || '').slice(0, 7)) + ')' : '';
    const zold = ev ? ev.filter((m) => m.runs && m.passed === m.runs).length : 0;
    const osszeg = ev ? zold + '/' + story.evidence.length + ' bizonyító próba zöld' : 'bizonyíték: nem mért';
    return '<details class="sevid" data-testid="story-evidence"><summary>A VALÓDI alkalmazásban bizonyítva: <span data-testid="story-evidence-count">' + osszeg + '</span>' + when + '</summary><ul class="list">' + rows + '</ul>'
      + '<p class="muted">A pipa a próba mért kimenete a megnevezett commiton: valódi HTTP-szerver, valódi böngésző, valódi adatbázis-sor. '
      + 'A fenti képernyők ezzel szemben SZIMULÁCIÓ.</p></details>';
  }
  function helpLinks(id) {
    const story = P.STORIES.find((s) => s.id === id);
    const feats = story.features.map((f) => esc(((D().KB || {})[f] || {}).title || f)).join(' · ');
    const tours = story.tours.map((t) => esc(((D().TOUR || {})[t] || {}).title || t)).join(' · ');
    const faqs = [...new Set(story.features.flatMap((f) => (P.INDEX.find((r) => r.id === f) || { faq: [] }).faq))]
      .map((q) => esc(((D().FAQ || {})[q] || {}).q || q)).join(' · ');
    return '<details class="shelp"><summary>Súgó, gyakori kérdések és bemutató ehhez az úthoz</summary>'
      + '<p><b>Súgó-témák:</b> ' + feats + '</p><p><b>Kattintható bemutató:</b> ' + tours + '</p><p><b>Gyakori kérdések:</b> ' + faqs + '</p></details>';
  }

  function renderStories() {
    const box = document.getElementById('stories');
    if (!box) return;
    const on = SS.mode === 'stories';
    box.hidden = !on;
    const main = document.querySelector('main'); if (main) main.hidden = on;
    const tech = document.getElementById('techbox'); if (tech) tech.hidden = on;
    const roleSel = document.getElementById('role'); if (roleSel && roleSel.parentElement) roleSel.parentElement.hidden = on;
    for (const b of document.querySelectorAll('[data-mode]')) b.classList.toggle('on', b.dataset.mode === SS.mode);
    if (!on) return;
    if (!SS.story) {
      box.innerHTML = '<h1>Történetek — válassz egy használati utat</h1>'
        + '<p class="muted">Minden történet a valódi alkalmazás egyszerűsített képein megy végig, a kiválasztott nyelven. '
        + 'A lépéseknél te kattintasz; a lap szimulál, a valódi működést a lap alján felsorolt böngésző-próbák bizonyítják.</p>'
        + '<div class="scards">' + P.STORIES.map((s) => {
          const t = (D().STORY || {})[s.id] || {};
          const ev = P.EVIDENCE && P.EVIDENCE.stories && P.EVIDENCE.stories[s.id];
          const ok = ev ? ev.filter((m) => m.runs && m.passed === m.runs).length : 0;
          return '<div class="scard" data-testid="story-card-' + esc(s.id) + '"><h3>' + esc(t.title || s.id) + '</h3><p class="muted">' + esc(t.lead || '') + '</p>'
            + '<p><small>' + (ev ? ok + '/' + s.evidence.length + ' bizonyító próba zöld' : 'bizonyíték: nem mért') + ' · ' + (P.STORY_STEPS[s.id] || []).length + ' lépés</small></p>'
            + '<button class="p" data-sstart="' + esc(s.id) + '" data-testid="story-start-' + esc(s.id) + '">Indítás</button></div>';
        }).join('') + '</div>';
      return;
    }
    const steps = P.STORY_STEPS[SS.story] || [];
    const step = steps[SS.at];
    const t = (D().STORY || {})[SS.story] || {};
    const finished = SS.at >= steps.length;
    let body = '';
    if (finished) {
      body = '<div class="sdone" data-testid="story-finished"><h2>A történet végére értél</h2><p>' + steps.length + ' lépés · mindegyiknél te kattintottál, és a lap megmutatta az eredményt.</p>'
        + '<p><button class="p" data-srestart="1" data-testid="story-restart">Újrakezdés</button> <button data-sback="1" data-testid="story-back">Vissza a történetekhez</button></p></div>';
    } else {
      const sc = SS.phase === 'before' ? step.before : step.after;
      body = '<p class="sexplain" data-testid="story-explain"><b>' + (SS.at + 1) + '/' + steps.length + '.</b> ' + esc(T(step.explain)) + '</p>'
        + (SS.phase === 'before' ? '<p class="shint">Kattints a kiemelt gombra: <b>' + esc(actLabel(step)) + '</b></p>' : '<p class="shint ok">Eredmény — így néz ki a valódi képernyő a művelet után:</p>')
        + screenHtml(sc, SS.phase === 'before' ? actBtn(actLabel(step)) : '')
        + (SS.phase === 'after' ? '<p><button class="p" data-snext="1" data-testid="story-next">Tovább</button></p>' : '');
    }
    box.innerHTML = '<div class="shead"><button data-sback="1" data-testid="story-back-top">← Történetek</button> '
      + '<button data-srestart="1" data-testid="story-restart-top">Újrakezdés</button></div>'
      + '<h1 data-testid="story-title">' + esc(t.title || SS.story) + '</h1><p class="muted">' + esc(t.lead || '') + '</p>'
      + '<div class="splayer"><ol class="ssteps" data-testid="story-steps">' + steps.map((s, i) => '<li class="' + (i < SS.at ? 'sdone-step' : i === SS.at ? 'scur' : '') + '">'
        + '<button data-sjump="' + i + '">' + (i + 1) + '. ' + esc(actLabel(s)) + '</button></li>').join('') + '</ol>'
      + '<div class="sstage">' + body + '</div></div>'
      + '<p class="simtag">SZIMULÁCIÓ: ez a lap nem hív szervert, nem ír adatot, nem küld levelet és nem fogad el meghívót. Az adatok szintetikusak (pelda.hu).</p>'
      + helpLinks(SS.story) + evidenceHtml(SS.story);
  }
  const renderBase = render;
  render = function renderAll() { renderBase(); renderStories(); };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.mode) { SS.mode = d.mode; render(); return; }
    if (d.sstart) { SS.story = d.sstart; SS.at = 0; SS.phase = 'before'; SS.langBefore = st.lang; render(); return; }
    if (d.sback) { SS.story = null; render(); return; }
    if (d.srestart) { if (SS.langBefore) st.lang = SS.langBefore; SS.at = 0; SS.phase = 'before'; render(); return; }
    if (d.sjump !== undefined) { SS.at = Number(d.sjump); SS.phase = 'before'; render(); return; }
    if (d.sact) {
      const step = (P.STORY_STEPS[SS.story] || [])[SS.at];
      if (step && step.act === 'LANG') st.lang = nextLang();
      SS.phase = 'after'; render(); return;
    }
    if (d.snext) { SS.at += 1; SS.phase = 'before'; render(); }
  });
