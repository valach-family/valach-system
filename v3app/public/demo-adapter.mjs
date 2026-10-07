// v3app/public/demo-adapter.mjs — A BEMUTATÓ-ADAPTER (DMA-01, R138 §3).
//
// MI EZ, ÉS MI NEM — EZ A LEGFONTOSABB BEKEZDÉS.
//
// Ez a modul a VALÓDI felületet (`app.js`, `tour.mjs`, `texts.mjs`, `style.css`, `i18n/`) futtatja
// szerver NÉLKÜL: a `fetch`-et elfogja az `/api/*` és `/dev/*` utakon, és egy BÖNGÉSZŐN BELÜLI,
// elkülönített bemutató-állapotból szolgálja ki. A felületi forrás EGYETLEN sora sem változik —
// a gombok, az űrlapok, a megerősítő panelek, a nyugták és a bemutató-buborék ugyanazon a kódon
// futnak, mint az alkalmazásban.
//
// AMIT EBBŐL SOHA NEM ÁLLÍTUNK (az R138 §3 kikötése, és a KUKA-220 elve):
//   · ez NEM HTTP-bizonyíték és NEM tároló-bizonyíték. A mért HTTP/DB tanú a `v3app/findings_*.mjs`
//     battériákban és a `v3ref/run.mjs` mag-próbáiban áll, VALÓDI szerveren és VALÓDI tárolón;
//   · ez NEM a mag (`v3ref/`): a mag `node:sqlite`-ra épül, ami böngészőben nem fut. Az itt álló
//     szabályok a bemutató KÉT történetéhez szükséges viselkedést adják vissza, nem a teljes magot;
//   · ez NEM éles telepítés és NEM üzemi adatkapcsolat: minden adat SZINTETIKUS, kitalált.
//
// AZ ADAPTER NEM SZIVÁROGHAT BE A NORMÁL MŰKÖDÉSBE (az R138 §3 kikötése). Két egymást erősítő
// korlát áll erre:
//   1. a repó `v3app/public/index.html`-je ezt a fájlt NEM hivatkozza — kizárólag a bemutató-csomag
//      saját `index.html`-je tölti be, az `app.js` ELŐTT;
//   2. a modul INDULÁSKOR megvizsgálja, hogy bemutató-környezetben fut-e (`VS_DEMO` jel a lapon).
//      Ha nem, NEM telepíti a `fetch`-elfogót, és ezt a konzolon KI IS MONDJA — a néma bekapcsolás
//      ugyanaz a hiba volna, mint a néma kikapcsolás (KUKA-041).
//
// A MÉRT ALAK (KUKA-016 · KUKA-068). A válaszok alakját NEM emlékezetből írtam: a VALÓDI szerveren
// végigvittem mind a két történetet, és rögzítettem az 52 kérés/válasz párt. A mezőnevek, a
// nevezett indokok (`invite_revoked` · `not_available` · `within_delegation_basis`) és a statikus
// listák (`known_scopes` · `known_roles`) EBBŐL a mérésből származnak.

const DEMO_FLAG = 'VS_DEMO';

/** A bemutató-környezet JELE a lapon. Enélkül az adapter NEM telepszik fel. */
function demoRequested() {
  if (typeof document === 'undefined') return false;
  const el = document.querySelector('meta[name="vs-demo"]');
  return !!(el && String(el.content || '').trim() === 'on');
}


// ══ A SZINTETIKUS VILÁG ════════════════════════════════════════════════════════════════════════
//
// A szereplők és a cég KITALÁLTAK. Az operátornak nem kell semmit létrehoznia: a történet indítása
// EGY kattintás, és az állapot mindig ugyanonnan indul (az R138 §2 kikötése).

const BOOK = 'ws_bemutato01';
const PERSONAL = { anna: 'ps_bemutato_a', bela: 'ps_bemutato_b' };
const COMPANY = 'Minta Műhely Kft.';
const PEOPLE = {
  anna: { id: 'sub_bemutato_anna', email: 'anna@mintamuhely.hu', name: 'Anna' },
  bela: { id: 'sub_bemutato_bela', email: 'bela@mintamuhely.hu', name: 'Béla' },
};
const KNOWN_SCOPES = ['keszlet', 'arak', 'dokumentumok', 'beszallitok'];
const KNOWN_ROLES = ['admin', 'user'];
/** A bemutató készlet-mennyisége — szintetikus, deklarált érték (nem számítás). */
const DEMO_QTY = '12';

/**
 * A KÉT TÖRTÉNET KÜLÖN KEZDŐÁLLAPOTBÓL INDUL, és ez SZÁNDÉKOS.
 *
 * Az „A" történethez Béla FÜGGŐ meghívóval kell, a „B"-hez MEGLÉVŐ tagként — a kettő egyszerre nem
 * állhat. Ezért a történet indítása (és az újrakezdés) a SAJÁT kezdőállapotát állítja vissza, nem
 * egy közös félállapotot (R138 §2: „az állapot mindig reprodukálható").
 */
function seed(story) {
  const t0 = '2026-10-02T09:00:00.000Z';
  const base = {
    story,
    now: Date.parse(t0),
    actor: 'anna',
    // R164/3 — A KIJELENTKEZÉS VALÓDI ÁLLAPOTA. Eddig a `POST /api/logout` csak a FIÓKOT hagyta el
    // (`inBook = false`), az ember pedig bejelentkezve maradt — miközben a fölötte álló megjegyzés
    // azt állította, hogy „a néző váltása az app saját útján: kilépés → belépés". A szöveg többet
    // mondott, mint amit a kód tett (KUKA-050). Mostantól a kilépés KILÉPTET: a héj az anonim
    // állapotot rajzolja, és a folytatás VALÓDI belépés a másik emberrel.
    signedOut: false,
    book: BOOK,
    plan: 'pro',
    subjects: {
      anna: { ...PEOPLE.anna, proven: true },
      bela: { ...PEOPLE.bela, proven: true },
    },
    // A TAGSÁG IDŐSZAKOKBAN áll: a megszüntetés zár egy időszakot, az elfogadás újat nyit.
    memberships: {
      anna: { role: 'admin', effective: true, period: 1, removed_at: null },
    },
    // AZ ADATKÖRJOG IDŐSZAKHOZ KÖTÖTT: egy új időszak NEM állítja vissza a régi jogokat.
    scopes: { anna: { keszlet: 1, arak: 1, dokumentumok: 1, beszallitok: 1 } },
    invites: [],
    mails: [],
    seq: 100,
    // A BEMUTATÓ A CÉGBEN INDUL: Anna fiókkezelő, tehát a Felhasználók képernyő elérhető. A
    // személyes körben indulás a történetek ELŐTT egy üres kitérő volna (mérve: a lap a személyes
    // áttekintést rajzolta, és a történet célja nem is látszott).
    inBook: true,
  };
  if (story === 'inviteRevoke') {
    // „A" — Bélának FÜGGŐ meghívója van, tagsága még nincs.
    base.invites.push({
      ref: 'bemutato01', token: 'demo-token-a1', who: 'bela', email: PEOPLE.bela.email,
      role: 'user', scope: 'keszlet', state: 'pending', invited_by: PEOPLE.anna.email,
      expires_at: '2026-10-09T09:00:00.000Z', accepted_at: null, revoked_at: null, reentry: false,
    });
    base.mails.push(mail(PEOPLE.bela.email, 'Meghívás', 'demo-token-a1'));
  } else {
    // „B" — BÉLA ÉLŐ TAG, ÉS A KÉSZLET-JOGA ÁLL. Innen indul a történet: Anna megszünteti a
    // tagságát, újra meghívja, Béla elfogadja — és akkor derül ki, hogy a RÉGI adat-hozzáférése
    // NEM jött vissza vele.
    //
    // AZ R138-BAN EZ FORDÍTVA VOLT, ÉS AZ IS MÉRT DÖNTÉS VOLT A MAGA IDEJÉN: akkor a bemutató
    // HÁROM lépésből állt, és rögtön az „Újbóli belépés" gombjára mutatott — ahhoz megszűnt
    // tagság kellett. Az R140-ben a megszüntetés MAGA is vezetett lépés lett, tehát a
    // kezdőállapotnak is a történet elejére kell állnia. A kezdőállapot a TÖRTÉNET része, nem
    // díszlet: ha nem oda állítjuk, ahonnan a történet indul, az első lépés nem végezhető el.
    base.memberships.bela = { role: 'user', effective: true, period: 2, removed_at: null };
    // A RÉGI ADATKÖRJOG A RÉGI IDŐSZAKHOZ TAPAD — ez teszi mérhetővé a történet tanulságát:
    // az új időszakban a jog NEM él, amíg külön meg nem adják.
    base.scopes.bela = { keszlet: 2 };
  }
  return base;
}

/**
 * A BEMUTATÓ LEVELÉNEK HIVATKOZÁSA A SAJÁT LAPJÁRA MUTAT (SAJÁT LELET, böngészőben MÉRVE).
 *
 * Az első alakom kitalált, külső címet írt a levélbe (`https://bemutato.vs/?invite=…`). Amíg a
 * levelet csak NÉZTÜK, ez nem tűnt fel; a teljes történetben viszont a meghívottnak MEG KELL
 * NYITNIA a hivatkozást — és a bemutató ilyenkor elnavigált egy nem létező címre, ahonnan nincs
 * visszaút. Mérve: a lap soha nem állt fel újra, a végigjárás a 8. lépésen elhalt. Egy hivatkozás,
 * amit a saját bemutatónk kínál fel, MŰKÖDJÖN (KUKA-011 · KUKA-160: amit a képernyő felkínál,
 * annak végig kell mennie).
 */
function mail(to, subject, token) {
  const base = (() => {
    try { return `${window.location.origin}${window.location.pathname}`; } catch { return ''; }
  })();
  return { to, subject, link: `${base}?invite=${token}`, at: '2026-10-02T09:00:00.000Z' };
}

// ══ A TELEPÍTÉS ════════════════════════════════════════════════════════════════════════════════

/** A VALÓDI szerverről MÉRT segéd-csomag (bemutató-lista + tudás-index), a két történetre szűkítve. */
let ASSISTANT = { status: { ok: true, tours: [] }, knowledge: { ok: true, index: [] } };

function install() {
  // A BEMUTATÓ NYELVE MAGYAR — AZ APP SAJÁT ÚTJÁN (LNG-02). Az `app.js` a tudatosan választott
  // nyelvet a `vs3.lang.choice` kulcsból olvassa; a bemutató ezt CSAK akkor állítja be, ha még
  // nincs választás. Így a HU a bemutató alapértelmezése, de ha a néző átvált EN/DE-re, a döntése
  // MEGMARAD — nem írjuk felül minden betöltésnél (KUKA-234: a nyelv SZEMÉLYHEZ kötve marad meg).
  try {
    if (!window.localStorage.getItem('vs3.lang.choice')) {
      window.localStorage.setItem('vs3.lang.choice', 'hu');
    }
  } catch { /* a tároló tiltva lehet — a lap enélkül is működik, csak a böngésző nyelvén */ }
  // ── AZ ÁLLAPOT TÚLÉLI A LAP ÚJRATÖLTÉSÉT (SAJÁT LELET, böngészőben MÉRVE) ───────────────────
  //
  // Az első alakom az állapotot CSAK a lap memóriájában tartotta, a néző-váltást és a
  // történet-váltást viszont `location.reload()`-dal érvényesítette — a reload pedig ELDOBTA az
  // állapotot, és minden újraindult Annával. MÉRVE: a váltás után a fejléc továbbra is
  // `anna@mintamuhely.hu` volt, a régi token pedig `invite_not_for_you`-t adott
  // `invite_revoked` helyett, a 2. történet meg el sem indult. A javítás nem a reload elkerülése
  // (az a felhasználó joga: bármikor frissíthet), hanem a MEGMARADÁS: a bemutató állapota a
  // munkamenet-tárolóban él, tehát egy kézi frissítés sem veszi el a történet közepét.
  const STORE_KEY = 'vs-demo-state';
  const load = () => {
    try {
      const raw = window.sessionStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      return o && o.story ? o : null;
    } catch { return null; }
  };
  const save = () => {
    try { window.sessionStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch { /* tiltott tároló */ }
  };
  let S = load() || seed('inviteRevoke');
  const realFetch = window.fetch.bind(window);
  window[DEMO_FLAG] = {
    /** A történet indítása / ÚJRAKEZDÉSE — csak a bemutató saját adatait állítja vissza. */
    restart(story) { S = seed(story || S.story); save(); },
    /** A NÉZŐ: a bemutató melyik szereplő munkamenetében áll. */
    actor() { return S.actor; },
    story() { return S.story; },
  };

  const tick = () => { S.now += 1000; return new Date(S.now).toISOString(); };
  const nowIso = () => new Date(S.now).toISOString();
  const me = () => S.subjects[S.actor];
  const isAdmin = () => (S.memberships[S.actor] || {}).role === 'admin'
    && (S.memberships[S.actor] || {}).effective === true;
  const inBook = () => !!S.inBook;

  const J = (status, body) => new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  });
  const served = () => ({ served_book_id: inBook() ? S.book : null, served_subject_id: me().id });

  /** A NÉZET MEGERŐSÍTÉSE — ugyanaz a kötés, amit az `app.js` küld (KTX-03). A mező csak SZŰKÍT. */
  function contextOk(body) {
    if (!body) return true;
    if (body.expected_book_id && inBook() && body.expected_book_id !== S.book) return false;
    if (body.expected_subject_id && body.expected_subject_id !== me().id) return false;
    return true;
  }

  function workspaceList() {
    const out = [{
      book_id: PERSONAL[S.actor], name: `${PEOPLE[S.actor].name.toLowerCase()} személyes köre`,
      role: 'admin', kind: 'personal', personal: true, plan: 'starter', demo_fixture: null, business: null,
    }];
    if (S.memberships[S.actor]) {
      out.push({
        book_id: S.book, name: COMPANY, role: S.memberships[S.actor].role, kind: 'shared',
        personal: false, plan: S.plan, demo_fixture: 'bemutato-A',
        business: { namespace: 'tax_id', jurisdiction: 'HU', verification: 'none_available' },
      });
    }
    return out;
  }

  function meBody() {
    const m = S.memberships[S.actor];
    const inside = inBook() && m && m.effective;
    return {
      ok: true, subject_id: me().id, email: me().email, channel_proven: true,
      workspaces: workspaceList(),
      current_book_id: inside ? S.book : PERSONAL[S.actor],
      current_role: inside ? m.role : 'admin',
      current_book_name: inside ? COMPANY : `${PEOPLE[S.actor].name.toLowerCase()} személyes köre`,
      current_kind: inside ? 'shared' : 'personal',
      current_personal: !inside,
      personal_book_id: PERSONAL[S.actor],
      acting_as: inside
        ? `${me().email} · fiók: ${COMPANY} · szerep: ${m.role}`
        : `${me().email} · fiók: ${PEOPLE[S.actor].name.toLowerCase()} személyes köre · szerep: admin`,
      current_plan: inside ? S.plan : 'starter',
    };
  }

  function memberRows() {
    return Object.keys(S.memberships).map((k) => {
      const m = S.memberships[k];
      const scopes = {};
      for (const sc of KNOWN_SCOPES) {
        const grantedIn = (S.scopes[k] || {})[sc] || null;
        // AZ IDŐSZAK-KÖTÉS: a jog csak akkor él, ha a MAI időszakban adták (RNV/SGP elve).
        const live = grantedIn !== null && m.effective === true && grantedIn === m.period;
        scopes[sc] = {
          granted: live,
          reason: live ? 'scope_granted_and_within_limits'
            : (grantedIn !== null ? 'scope_grant_other_period' : 'no_scope_grant'),
          recorded: grantedIn !== null,
        };
      }
      return {
        subject_id: S.subjects[k].id, email: S.subjects[k].email, role: m.role,
        effective: m.effective,
        effective_reason: m.effective ? 'membership_effective' : 'membership_revoked',
        scopes,
        removed_at: m.removed_at,
        reinvitable: !m.effective,
      };
    });
  }

  const membersBody = () => ({
    ok: true, book_id: S.book, ...served(), members: memberRows(),
    known_scopes: [...KNOWN_SCOPES], known_roles: [...KNOWN_ROLES],
    grantable_scopes: ['arak', 'beszallitok', 'dokumentumok', 'keszlet'],
    blocked_scopes: [], grantable_reason: 'within_delegation_basis', startup_rule_version: 'v2',
  });

  function invitesBody() {
    const rows = S.invites.map((i) => ({
      ref: i.ref, email: i.email, role: i.role, invited_by: i.invited_by,
      expires_at: i.expires_at, expired: false, state: i.state,
      accepted_at: i.accepted_at, revoked_at: i.revoked_at,
      revocable: i.state === 'pending', reentry: i.reentry,
    }));
    const states = { pending: 0, accepted: 0, expired: 0, revoked: 0 };
    for (const r of rows) if (states[r.state] !== undefined) states[r.state] += 1;
    return { ok: true, book_id: S.book, ...served(), invites: rows, states, at: nowIso() };
  }

  /** A KÉSZLET a MAI időszakra adott adatkörjogon áll; az ÁR-jogot a bemutató nem adja meg. */
  function dataBody(kind) {
    const m = S.memberships[S.actor];
    const grantedIn = (S.scopes[S.actor] || {})[kind === 'stock' ? 'keszlet' : 'arak'] || null;
    const live = inBook() && m && m.effective === true && grantedIn === m.period;
    if (!live) {
      const base = {
        ok: false, result: null, refused_by: 'right', reason: 'not_available', ...served(),
        message: 'ehhez a hivatkozáshoz most nem tartozik kiadható eredmény',
      };
      return kind === 'stock' ? base
        : { ...base, right_reason: 'not_available', entitlement_reason: null, entitlement: null };
    }
    const okBase = {
      ok: true, result: kind === 'stock' ? { qty: DEMO_QTY } : { price: '45', currency: 'HUF' },
      refused_by: null, reason: null, ...served(), message: 'az eredmény kiadva',
    };
    return kind === 'stock' ? okBase
      : { ...okBase, right_reason: null, entitlement_reason: null, entitlement: { ok: true } };
  }

  // ── A MŰVELETEK ──────────────────────────────────────────────────────────────────────────────

  const ROUTES = {
    // KILÉPVE NINCS ALANY: a héj ebből rajzolja az anonim állapotot (a belépési űrlapot).
    'GET /api/me': () => (S.signedOut
      ? J(401, { ok: false, reason: 'not_signed_in' })
      : J(200, meBody())),
    'GET /api/members': () => (inBook() && isAdmin()
      ? J(200, membersBody())
      : J(403, { ok: false, reason: 'admin_required' })),
    'GET /api/invites/waiting': () => (inBook() && isAdmin()
      ? J(200, invitesBody())
      : J(403, { ok: false, reason: 'admin_required' })),
    'GET /api/data/stock': () => {
      const b = dataBody('stock');
      return J(b.ok ? 200 : 403, b);
    },
    'GET /api/data/price': () => {
      const b = dataBody('price');
      return J(b.ok ? 200 : 403, b);
    },
    'GET /dev/mailbox': () => J(200, {
      ok: true, label: 'Próbaüzenetek', mails: [...S.mails].reverse(),
    }),

    'POST /api/session/workspace': (b) => {
      const wanted = b && b.book_id;
      if (wanted === PERSONAL[S.actor]) { S.inBook = false; return J(200, { ok: true, book_id: wanted, role: 'admin', name: `${PEOPLE[S.actor].name.toLowerCase()} személyes köre`, kind: 'personal', personal: true }); }
      if (wanted !== S.book || !S.memberships[S.actor] || !S.memberships[S.actor].effective) {
        return J(403, { ok: false, reason: 'not_a_member' });
      }
      S.inBook = true;
      return J(200, { ok: true, book_id: S.book, role: S.memberships[S.actor].role, name: COMPANY, kind: 'shared', personal: false });
    },

    // MEGHÍVÓ KIADÁSA — a kezelő tényleges műveletével.
    'POST /api/invites': (b) => {
      if (!inBook() || !isAdmin()) return J(403, { ok: false, reason: 'admin_required' });
      if (!contextOk(b)) return J(409, { ok: false, reason: 'context_mismatch' });
      const email = String((b && b.email) || '').trim().toLowerCase();
      const who = Object.keys(PEOPLE).find((k) => PEOPLE[k].email === email) || null;
      if (!who) {
        return J(400, { ok: false, reason: 'demo_unknown_invitee',
          message: `A bemutatóban csak ${PEOPLE.bela.email} hívható meg — ez szintetikus próbavilág.` });
      }
      S.seq += 1;
      const token = `demo-token-${S.seq}`;
      const ref = `bemutato${S.seq}`;
      S.invites.push({ ref, token, who, email, role: (b && b.role) || 'user', scope: (b && b.scope) || 'keszlet',
        state: 'pending', invited_by: me().email, expires_at: '2026-10-09T09:00:00.000Z',
        accepted_at: null, revoked_at: null, reentry: false });
      S.mails.push(mail(email, 'Meghívás', token));
      tick();
      return J(201, { ok: true, token, ceiling: { roles: ['user'], scopes: KNOWN_SCOPES },
        basis_id: `deleg:${S.book}:${me().id}`, basis_version: 1,
        expires_at: '2026-10-09T09:00:00.000Z', ...served() });
    },

    // A MEGHÍVÓ VISSZAVONÁSA — a felület `ref`-et küld (a mért szerződés), nem tokent.
    'POST /api/invites/revoke': (b) => {
      if (!inBook() || !isAdmin()) return J(403, { ok: false, reason: 'admin_required' });
      if (!contextOk(b)) return J(409, { ok: false, reason: 'context_mismatch' });
      const row = S.invites.find((i) => i.ref === (b && b.ref));
      if (!row) return J(404, { ok: false, changed: false, reason: 'invite_unknown' });
      if (row.state !== 'pending') {
        return J(200, { ok: true, changed: false, reason: row.state === 'revoked' ? 'invite_already_revoked' : 'invite_already_redeemed', ref: row.ref, ...served() });
      }
      const at = tick();
      row.state = 'revoked'; row.revoked_at = at;
      return J(200, { ok: true, changed: true, reason: null, revocation_id: S.seq += 1,
        effective_at: at, recorded_at: at, ref: row.ref, ...served() });
    },

    'POST /api/invites/pending': () => J(200, { ok: true }),

    /**
     * A MEGHÍVÓ MEGFIGYELÉSE — A MAG SZERZŐDÉSÉHEZ MÉRVE, NEM KITALÁLVA (KUKA-172).
     *
     * A visszavont meghívóra a mag `not_actionable` / `invite_revoked` választ ad (mérve:
     * `v3ref/run.mjs` P-INVITE-revoke), tehát a képernyőn ELFOGADÁS-GOMB SINCS: a lap a megfigyelés
     * mondatával mondja ki, hogy a hivatkozás elhalt. Ha itt „elfogadható" állapotot adnánk vissza,
     * a bemutató a TERMÉKRŐL állítana valótlant — a szintetikus háttér ALAKJA is állítás.
     */
    'GET /api/invites/observe': (_b, q) => {
      const token = q && q.get ? q.get('token') : null;
      const row = S.invites.find((i) => i.token === token) || null;
      if (!row) return J(200, { ok: true, status: 'not_actionable', reason: 'invite_unknown' });
      if (row.state === 'revoked') return J(200, { ok: true, status: 'not_actionable', reason: 'invite_revoked' });
      if (row.state === 'accepted') return J(200, { ok: true, status: 'not_actionable', reason: 'invite_already_redeemed' });
      // A CÍMZETT CSATORNÁJA BIZONYÍTOTT: a bemutatóban a levél a sajátja, tehát a fiók neve kiadható.
      const existing = Boolean(S.subjects[row.who]);
      return J(200, {
        ok: true,
        status: existing ? 'redeem_as_existing' : 'redeem_as_new',
        account: { name: COMPANY, role: row.role },
        invited_by: row.invited_by,
        continue_as: { hint: row.email },
      });
    },

    // A BEVÁLTÁS — a CÍMZETT saját műveletével. A bemutató SOHA nem fogadja el helyette.
    'POST /api/invites/redeem': (b) => {
      const row = S.invites.find((i) => i.token === (b && b.token))
        || S.invites.find((i) => i.who === S.actor && i.state === 'pending');
      if (!row) return J(404, { ok: false, error: 'invite_not_actionable', reason: 'invite_unknown' });
      if (row.who !== S.actor) {
        return J(403, { ok: false, error: 'invite_not_actionable', reason: 'invite_not_for_you' });
      }
      // A VISSZAVONT MEGHÍVÓ ZÁRT — ez az „A" történet lényege, nevezett indokkal.
      if (row.state === 'revoked') {
        return J(403, { ok: false, error: 'invite_not_actionable', reason: 'invite_revoked' });
      }
      if (row.state !== 'pending') {
        return J(403, { ok: false, error: 'invite_not_actionable', reason: 'invite_already_redeemed' });
      }
      const at = tick();
      row.state = 'accepted'; row.accepted_at = at;
      const prev = S.memberships[row.who];
      const period = prev ? prev.period + 2 : 2;
      S.memberships[row.who] = { role: row.role, effective: true, period, removed_at: null };
      // A RÉGI ADATKÖRJOGOK NEM ÁLLNAK VISSZA: az új időszakhoz ÚJ, kifejezett megadás kell.
      /**
       * A VÁLASZ MEGNEVEZI AZ ALANYT ÉS A FIÓKOT (KUKA-254 · KUKA-172 — SAJÁT LELET, KÉPEN LÁTVA).
       *
       * A LELET. A végigjárás képén a nyugta ezt írta: „Csatlakoztál ehhez a fiókhoz: Személyes
       * fiók" — pedig a CÉGHEZ csatlakozott. A felület oldalán a javítás megvolt (KUKA-254: a
       * siker annak szól, akinek a szerver kiszolgálta, és a fiók nevét a VÁLASZ fiókjából kell
       * venni), csak a próbafelület válasza NEM HORDOZTA a két mezőt, amire az a javítás épül —
       * ezért a lap a pillanatnyi nézetre esett vissza. A szintetikus háttér ALAKJA is állítás:
       * ha egy mezőt elhagy, a termék javítását teszi hatástalanná, és a bemutató valótlant mond.
       */
      return J(200, {
        ok: true, outcome: prev ? 'regranted' : 'granted', shape: 'membership_only',
        reentry: row.reentry ? S.seq : null,
        subject_id: S.subjects[row.who] && S.subjects[row.who].id,
        book_id: BOOK, name: COMPANY,
      });
    },

    // TAGSÁG MEGSZÜNTETÉSE
    'POST /api/members/revoke': (b) => {
      if (!inBook() || !isAdmin()) return J(403, { ok: false, reason: 'admin_required' });
      if (!contextOk(b)) return J(409, { ok: false, reason: 'context_mismatch' });
      const who = Object.keys(S.subjects).find((k) => S.subjects[k].id === (b && b.subject_id));
      if (!who || !S.memberships[who]) return J(404, { ok: false, reason: 'not_a_member' });
      const at = tick();
      S.memberships[who].effective = false;
      S.memberships[who].removed_at = at;
      return J(200, { ok: true, reason: null, message: 'a tagság megszűnt',
        revocation: { at }, delegation: { closed: true }, ...served() });
    },

    // ÚJRA MEGHÍVÁS — AJÁNLATOT ad, nem tagságot. A tagságot a címzett elfogadása hozza létre.
    'POST /api/members/reinvite': (b) => {
      if (!inBook() || !isAdmin()) return J(403, { ok: false, reason: 'admin_required' });
      if (!contextOk(b)) return J(409, { ok: false, reason: 'context_mismatch' });
      if (!b || !b.operation_id) return J(400, { ok: false, reason: 'operation_id_required' });
      const who = Object.keys(S.subjects).find((k) => S.subjects[k].id === b.subject_id);
      if (!who || !S.memberships[who]) return J(404, { ok: false, reason: 'reentry_target_no_membership' });
      if (S.memberships[who].effective) return J(409, { ok: false, reason: 'reentry_target_membership_is_open' });
      // AZ EGYSZERI HATÁS: ugyanaz a műveleti azonosság UGYANAZT az ajánlatot adja vissza.
      const already = S.invites.find((i) => i.operation_id === b.operation_id);
      if (already) {
        return J(200, { ok: true, changed: false, replayed: true, reason: null, ref: already.ref,
          reentry_id: already.reentry_id, offered_role: already.role, scope: already.scope,
          requires_acceptance: true, restores_previous_scopes: false, ...served() });
      }
      S.seq += 1;
      const token = `demo-token-${S.seq}`;
      const ref = `bemutato${S.seq}`;
      const at = tick();
      S.invites.push({ ref, token, who, email: S.subjects[who].email, role: b.role || 'user',
        scope: b.scope || 'keszlet', state: 'pending', invited_by: me().email,
        expires_at: '2026-10-09T09:00:00.000Z', accepted_at: null, revoked_at: null,
        reentry: true, operation_id: b.operation_id, reentry_id: S.seq });
      S.mails.push(mail(S.subjects[who].email, 'Meghívás', token));
      return J(200, { ok: true, changed: true, replayed: false, reason: null, ref,
        reentry_id: S.seq, offered_role: b.role || 'user', scope: b.scope || 'keszlet',
        closed_grant_event_id: null, closed_revocation_id: null,
        requires_acceptance: true, restores_previous_scopes: false, effective_at: at, ...served() });
    },

    // ADATKÖRJOG MEGADÁSA / VISSZAVONÁSA — a MAI időszakhoz kötve.
    'POST /api/members/scope': (b) => {
      if (!inBook() || !isAdmin()) return J(403, { ok: false, reason: 'admin_required' });
      if (!contextOk(b)) return J(409, { ok: false, reason: 'context_mismatch' });
      const who = Object.keys(S.subjects).find((k) => S.subjects[k].id === (b && b.subject_id));
      const sc = b && b.scope;
      if (!who || !S.memberships[who] || !KNOWN_SCOPES.includes(sc)) {
        return J(400, { ok: false, reason: 'invalid_type' });
      }
      S.scopes[who] = S.scopes[who] || {};
      const had = S.scopes[who][sc] === S.memberships[who].period;
      S.scopes[who][sc] = S.memberships[who].period;
      tick();
      return J(200, { ok: true, changed: !had, scope: sc,
        basis_id: `deleg:${S.book}:${me().id}`, basis_version: 1, ...served() });
    },
    'POST /api/members/scope/revoke': (b) => {
      if (!inBook() || !isAdmin()) return J(403, { ok: false, reason: 'admin_required' });
      if (!contextOk(b)) return J(409, { ok: false, reason: 'context_mismatch' });
      const who = Object.keys(S.subjects).find((k) => S.subjects[k].id === (b && b.subject_id));
      const sc = b && b.scope;
      if (!who || !S.scopes[who]) return J(400, { ok: false, reason: 'invalid_type' });
      const had = S.scopes[who][sc] === (S.memberships[who] || {}).period;
      delete S.scopes[who][sc];
      tick();
      return J(200, { ok: true, changed: had, scope: sc, ...served() });
    },

    // A NÉZŐ VÁLTÁSA AZ APP SAJÁT ÚTJÁN: kilépés → belépés. A bemutató nem „címkézi át" a képernyőt.
    'POST /api/logout': () => { S.inBook = false; S.signedOut = true; return J(200, { ok: true }); },
    'POST /api/login': (b) => {
      const email = String((b && b.email) || '').trim().toLowerCase();
      const who = Object.keys(PEOPLE).find((k) => PEOPLE[k].email === email);
      if (!who) return J(401, { ok: false, reason: 'invalid_credentials' });
      S.actor = who;
      S.signedOut = false;
      /**
       * A BELÉPÉS A TAGSÁG SZERINTI FIÓKBA VISZ — ÉS EZ A CSONK EGY KIMONDOTT EGYSZERŰSÍTÉSE.
       *
       * A VALÓDI kiszolgáló a SZEMÉLYES kört adja (`POST /api/login`: `fresh.current_book_id =
       * personal.book_id`), és a cég képernyőihez a fejléc fiókválasztójában kell átváltani. Az
       * R164/3-ban hűségesre állítottam, és a bemutató lépés-listáját is kiegészítettem a
       * fiókváltással — a sor azért áll vissza, mert a bemutató-lap mai, VÉGIGVIHETŐ útja a rövidítő
       * gomb (kilépés → belépés → újratöltés), és az a tagság szerinti fiókot várja. A különbség
       * NEVESÍTETT: a csonk ezen a ponton nem a termék viselkedését mutatja (KUKA-050 alá eső
       * kimondott hiány, nem néma eltérés).
       */
      S.inBook = !!(S.memberships[who] && S.memberships[who].effective);
      const pend = S.invites.find((i) => i.who === who && i.state === 'pending');
      return J(200, { ok: true, subject_id: PEOPLE[who].id,
        pending_invite_token: pend ? pend.token : null, personal_book_id: PERSONAL[who] });
    },

    // A BEMUTATÓBAN NEM MŰKÖDŐ, DE A FELÜLETEN LÉTEZŐ UTAK — NEVEZETTEN, nem némán.
    // A BEMUTATÓ-LISTA ÉS A TUDÁS A VALÓDI SZERVERRŐL MÉRT CSOMAGBÓL JÖN (`demo-assistant.json`).
    //
    // MIÉRT ÍGY. Az `app.js` a felkínálható bemutatókat a SZERVERTŐL kéri (AST-01,
    // `/api/assistant/status` → `tours`), nem a kliensből: ami nincs a listán, az NEM indítható. A
    // bemutató-csomag ezért a VALÓDI szerver válaszát viszi, a két történetre szűkítve — a lépések,
    // a célelemek (`target`) és a szövegek bájtra a termék saját adatai (KUKA-016: az alakot a
    // fogyasztótól vesszük, nem emlékezetből).
    'GET /api/assistant/status': () => J(200, { ...ASSISTANT.status, ...served() }),
    'GET /api/assistant/knowledge': () => J(200, { ...ASSISTANT.knowledge, ...served() }),
    'POST /api/assistant/ask': () => J(503, { ok: false, reason: 'assistant_unavailable',
      message: 'A segéd a bemutatóban nincs bekötve — ez szintetikus próbavilág, szolgáltatói hívás nem indul.' }),
    'POST /api/verification/resend': () => J(200, { ok: true }),
    'POST /api/register': () => J(200, { ok: true, message: 'A bemutatóban a szereplők készen állnak — regisztrálni nem kell.' }),
    'POST /api/workspaces': () => J(403, { ok: false, reason: 'demo_read_only',
      message: 'A bemutatóban egy kész cég szerepel; új cég létrehozása nem része a két történetnek.' }),
    'POST /api/workspaces/plan': () => J(200, { ok: true, plan: S.plan, changed: false }),
  };

  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    let path; let query = new URLSearchParams();
    // A LEKÉRDEZÉS IS A KÉRÉS RÉSZE: a meghívó megfigyelése a tokent a CÍMBŐL kapja. A régi alak
    // csak az útvonalat adta át, ezért a megfigyelés nem tudta, MELYIK meghívóról kérdezünk.
    try { const u = new URL(url, window.location.href); path = u.pathname; query = u.searchParams; }
    catch { path = String(url); }
    if (!path.startsWith('/api/') && !path.startsWith('/dev/')) return realFetch(input, init);
    const method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    let body = null;
    const raw = (init && init.body) || null;
    if (raw) { try { body = JSON.parse(raw); } catch { body = null; } }
    const route = ROUTES[`${method} ${path}`];
    if (route && method !== 'GET') {
      // MINDEN ÁLLAPOTVÁLTOZTATÓ VÁLASZ UTÁN MENTÜNK — egy helyen, hogy ne lehessen kifelejteni
      // egyetlen útnál sem (KUKA-039: a több helyen igaz szabály ne éljen több példányban).
      const out = route(body, query);
      save();
      return out;
    }
    if (!route) {
      // A NEM ISMERT ÚT NEVEZETTEN elakad — a néma 404 azt a látszatot adná, hogy a felület hibás.
      return J(501, { ok: false, reason: 'demo_route_not_implemented',
        message: `Ez az út a bemutatóban nincs kiszolgálva: ${method} ${path}` });
    }
    return route(body, query);
  };

  // A SEGÉD-CSOMAG BETÖLTÉSE a `fetch`-elfogó FELÁLLÍTÁSA UTÁN, a VALÓDI `fetch`-csel — különben a
  // saját elfogónk nyelné el a kérést (`/demo-assistant.json` nem `/api/` út, de a kerülőút így
  // KIMONDOTT, nem véletlen).
  realFetch('./demo-assistant.json')
    .then((r) => r.json())
    .then((pkg) => { ASSISTANT = pkg; })
    // eslint-disable-next-line no-console
    .catch((e) => console.error('[VS] bemutató: a segéd-csomag nem tölthető be —', e && e.message));

  // eslint-disable-next-line no-console
  console.info('[VS] bemutató-adapter: TELEPÍTVE. Minden adat SZINTETIKUS; ez nem HTTP- és nem tároló-bizonyíték.');
}

// ══ A BEKAPCSOLÁS DÖNTÉSE — A MODUL VÉGÉN, ÉS EZ NEM STÍLUS ════════════════════════════════════
//
// SAJÁT LELET, böngészőben MÉRVE: az első alakom a fájl ELEJÉN hívta az `install()`-t, a világ
// állandói (`BOOK`, `PEOPLE`, …) viszont LENTEBB állnak. A `const` a modulban HOISTOLÓDIK, de az
// inicializálásáig TDZ-ben van, ezért a lap `Cannot access 'BOOK' before initialization` hibával
// indult el, és a felület BE SEM JELENTKEZETT. A hívás ezért ide, a modul VÉGÉRE költözött: itt
// minden deklaráció készen áll (KUKA-205 alakja a modul-szinten: ami EGYÜTT igaz, az egy egységben).
if (!demoRequested()) {
  // NÉMA BEKAPCSOLÁS NINCS: ha nem bemutató-lapon vagyunk, az adapter KIMONDJA, hogy nem telepszik.
  // eslint-disable-next-line no-console
  console.info('[VS] bemutató-adapter: NEM telepítve (ez a lap nem bemutató-lap).');
} else {
  install();
}
