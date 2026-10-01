// v3app/findings_r132.mjs — AZ R132 ELLENPRÓBÁI: MEGHÍVÓ VISSZAVONÁSA ÉS ÚJBÓLI BELÉPÉS.
//
// MIT MÉR, ÉS MIT NEM. Ez a battéria a VALÓDI HTTP-héjon, VALÓDI tárolón méri az R132 §1–§5
// szerződéseit: a függő meghívó visszavonását, a jogosultsági kapukat, az újbóli belépés külön
// döntését, a régi jogok FEL NEM ÉLEDÉSÉT, a két idő-tengelyt és az egyszeri hatást.
//
// AMIT KIMONDVA NEM BIZONYÍT:
//   · NEM böngésző: az A132-09 tanúja a `tests/e2e/` alatt áll (Playwright). Itt nincs DOM.
//   · NEM valódi levélküldés: a meghívó hivatkozása a bemutató levél-dobozából jön (`/dev/mailbox`) —
//     ez SZÁNDÉKOS, mert pontosan ezt az utat járja a címzett is, és a tokent a felület SOHA nem kapja
//     meg (KUKA-006).
//   · NEM Postgres és NEM többkapcsolatos verseny: az A132-03 és a párhuzamos elfogadás tanúja a
//     `npm run proof:multiconn` (két VALÓDI OS-folyamat, egy fájlon). Az itt mért „ismételt beküldés"
//     EGY kapcsolaton megy, és ezt a szakasz fejléce kimondja (KUKA-033: a mérés nevezze meg a tárgyát).
//
// A SZÁMLÁLÓ A TANÚ. Minden ÍRÁSMENTESSÉGI állítás a `/dev/rowcounts` KÜLÖNBSÉGÉN áll, nem azon,
// hogy „nem láttam hibát" (KUKA-135: a kimaradás egyetlen számlálóba sem kerül; KUKA-220: az
// elutasításnak nyoma sem lehet a védett nyilvántartásban).
import { rmSync, existsSync } from 'node:fs';
import { startServer, selfcheckDbPath } from './server.mjs';
import { KNOWN_DATA_SCOPES } from '../v3ref/resultScope.mjs';
import { membershipAsOf, membershipPeriodsOf } from '../v3ref/bitemporal.mjs';
import { scopeGrantLiveAt } from '../v3ref/releaseScope.mjs';
import { readScopeGrantAt } from '../v3ref/scopeGrant.mjs';
import { inviteRevocationAt } from '../v3ref/invite.mjs';
import { revokeAuthorityBasis } from '../v3ref/authorityBasis.mjs';
import { dictFor } from './public/i18n/dict.mjs';
import { enabledLanguages } from './public/i18n/languages.mjs';

const results = [];
let section = '';
const head = (s) => { section = s; console.log(`\n── ${s} ${'─'.repeat(Math.max(0, 86 - s.length))}`); };
function step(name, cond, detail) {
  const pass = !!cond;
  results.push({ section, name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
  return pass;
}

class Client {
  constructor(base, name) { this.base = base; this.name = name; this.cookie = null; }
  async call(method, path, body) {
    const headers = {};
    if (this.cookie) headers.Cookie = this.cookie;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(this.base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    const sc = res.headers.get('set-cookie');
    if (sc) this.cookie = sc.split(';')[0];
    const ct = res.headers.get('content-type') || '';
    return { status: res.status, headers: res.headers, body: ct.includes('application/json') ? await res.json() : await res.text() };
  }
  get(p) { return this.call('GET', p); }
  post(p, b) { return this.call('POST', p, b ?? {}); }
}

const dbPath = selfcheckDbPath();
const app = await startServer({ port: 0, dbPath });
const base = `http://127.0.0.1:${app.port}`;
const store = app.store;
console.log(`findings_r132: ${base}  · tároló: ${dbPath}`);

const reader = new Client(base, 'szamlalo');
const counts = async () => {
  const r = await reader.get('/dev/rowcounts');
  if (r.status !== 200 || !r.body || r.body.ok !== true) throw new Error(`/dev/rowcounts nem elérhető (${r.status})`);
  return r.body.counts;
};
const diff = (a, b) => { const o = {}; for (const t of Object.keys(b)) if (a[t] !== b[t]) o[t] = `${a[t]}→${b[t]}`; return o; };
const unchanged = (a, b) => Object.keys(diff(a, b)).length === 0;

try {
  const anna = new Client(base, 'anna');
  const mails = async () => (await anna.get('/dev/mailbox')).body.mails;
  // A `/dev/mailbox` a LEGÚJABBAT adja ELŐRE (`[...mailbox].reverse()`), ezért a LEGFRISSEBB levél a
  // nulladik elem. Ez mért tény, nem feltevés: az első alakom a lista VÉGÉT vette, és ezzel a
  // LEGRÉGEBBI (már beváltott) meghívó hivatkozását olvasta — a próba `invite_already_redeemed`-et
  // kapott egy helyes rendszeren (KUKA-120: a mérő a saját hibáját a tárgyra vallotta volna).
  const linkFor = async (to, part) => {
    const all = (await mails()).filter((x) => x.to === to && x.subject.includes(part));
    return all.length ? all[0].link : null;
  };
  const tokenFromLink = (link) => (link ? new URL(link).searchParams.get('invite') : null);
  const signUp = async (c, email, pw) => {
    await c.post('/api/register', { email, password: pw });
    const link = await linkFor(email, 'Erősítsd meg');
    await c.get(new URL(link).pathname + new URL(link).search);
    const r = await c.post('/api/login', { email, password: pw });
    return r.body.subject_id;
  };
  const tick = (ms) => anna.post('/dev/clock', { advance_ms: ms });
  const now = () => app.clock.now();
  const mState = (who) => membershipAsOf({ store, subjectId: who, bookId: BOOK, validAt: now(), knownAt: now() });
  const liveScope = (who, scope) => scopeGrantLiveAt({ store, subjectId: who, bookId: BOOK, scope, nowIso: now(), knownAt: now() });
  const waiting = async () => (await anna.get('/api/invites/waiting')).body;
  const membersOf = async () => (await anna.get('/api/members')).body;
  const rowOf = async (id) => ((await membersOf()).members || []).find((m) => m.subject_id === id) || null;

  // ── (0) SZABÁLYOS FELÁLLÁS: v2 pro vállalkozási fiók ─────────────────────────────────────────
  const annaId = await signUp(anna, 'anna@r132.hu', 'anna-titok-1');
  const ws = await anna.post('/api/workspaces', { name: 'R132 Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '62345676-2-42' } });
  const BOOK = ws.body.book_id;
  step('(0) a felállás szabályos: v2 pro fiók, a kezelőnek mind a négy kör megadható',
    ws.status === 201 && (await membersOf()).grantable_scopes.length === KNOWN_DATA_SCOPES.length,
    { book: BOOK, rule: ws.body.workspace.rule_version });

  // Béla belép (user, keszlet plafonnal), és megkapja a készlet-jogot.
  const bela = new Client(base, 'bela');
  const inv1 = await anna.post('/api/invites', { email: 'bela@r132.hu', role: 'user', scope: 'keszlet' });
  await bela.post('/api/invites/pending', { token: inv1.body.token });
  const belaId = await signUp(bela, 'bela@r132.hu', 'bela-titok-1');
  const red1 = await bela.post('/api/invites/redeem', { token: inv1.body.token });
  await bela.post('/api/session/workspace', { book_id: BOOK });
  await anna.post('/api/members/scope', { subject_id: belaId, scope: 'keszlet' });
  const p1 = mState(belaId).period_grant_event_id;
  step('(0/b) Béla tag, és a készlet-jog ÉLŐ az ELSŐ időszakban',
    red1.body.ok === true && mState(belaId).effective === true && liveScope(belaId, 'keszlet').allowed === true,
    { period: p1 });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('A) A132-01 — A FÜGGŐ MEGHÍVÓ KÜLÖN VISSZAVONHATÓ, ÉS MINDEN ÚT ZÁR');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  const cili = new Client(base, 'cili');
  const inv2 = await anna.post('/api/invites', { email: 'cili@r132.hu', role: 'user', scope: 'keszlet' });
  const tok2 = inv2.body.token;
  await cili.post('/api/invites/pending', { token: tok2 });
  const ciliId = await signUp(cili, 'cili@r132.hu', 'cili-titok-1');
  const lista0 = await waiting();
  const sor = (lista, email) => (lista.invites || []).find((x) => x.email === email) || null;
  step('(a1) a kiadott meghívó FÜGGŐ állapotban látszik, és a visszavonás AJÁNLOTT művelet',
    sor(lista0, 'cili@r132.hu').state === 'pending' && sor(lista0, 'cili@r132.hu').revocable === true,
    { state: sor(lista0, 'cili@r132.hu').state });

  // A TOKEN NEM JÖN KI A LISTÁBÓL (KUKA-006) — a művelet a rövid jelölőre szól.
  step('(a2) a lista NEM adja ki a nyers tokent, csak a rövid jelölőt',
    !JSON.stringify(lista0).includes(tok2) && typeof sor(lista0, 'cili@r132.hu').ref === 'string',
    { ref: sor(lista0, 'cili@r132.hu').ref });

  const cA = await counts();
  const revoke1 = await anna.post('/api/invites/revoke', { ref: sor(lista0, 'cili@r132.hu').ref });
  const cB = await counts();
  step('(a3) UI→HTTP→DB: a visszavonás SAJÁT eseményt ír, és semmi mást',
    revoke1.body.ok === true && revoke1.body.changed === true
    && cB.invite_revocation === cA.invite_revocation + 1
    && cB.membership === cA.membership && cB.membership_revocation === cA.membership_revocation
    && cB.scope_grant === cA.scope_grant,
    diff(cA, cB));

  const lista1 = await waiting();
  step('(a4) a KÉPERNYŐ az ÚJ igazságot mutatja: VISSZAVONT állapot, és nincs több művelet',
    sor(lista1, 'cili@r132.hu').state === 'revoked' && sor(lista1, 'cili@r132.hu').revocable === false
    && sor(lista1, 'cili@r132.hu').revoked_at !== null,
    { state: sor(lista1, 'cili@r132.hu').state, revoked_at: sor(lista1, 'cili@r132.hu').revoked_at });

  // HÁROM ÚT, MIND ZÁR (spec §2): megfigyelés · belépés utáni folytatás · közvetlen beváltás.
  const obs = await cili.get(`/api/invites/observe?token=${encodeURIComponent(tok2)}`);
  step('(a5) a MEGFIGYELÉS zár — és nem ígér folytatást',
    obs.body.status === 'not_actionable' && obs.body.reason === 'invite_revoked'
    && obs.body.switch_account_offered === false,
    { status: obs.body.status, reason: obs.body.reason });
  const cC = await counts();
  const red2 = await cili.post('/api/invites/redeem', { token: tok2 });
  const cD = await counts();
  step('(a6) a KÖZVETLEN beváltás zár, tagság NEM születik, és NEM ír semmit',
    red2.body.ok === false && red2.body.reason === 'invite_revoked'
    && !store.get('SELECT 1 FROM membership WHERE subject_id = ? AND book_id = ?', ciliId, BOOK)
    && unchanged(cC, cD),
    { reason: red2.body.reason, delta: diff(cC, cD) });
  // A FOLYTATÁS (a tárolt szándék) sem nyit utat: a bejelentkezés UTÁNI újraolvasás ugyanazt adja.
  await cili.post('/api/invites/pending', { token: tok2 });
  const obs2 = await cili.get(`/api/invites/observe?token=${encodeURIComponent(tok2)}`);
  step('(a7) a BELÉPÉS UTÁNI folytatás sem ad tagságot — ugyanaz a nevezett zárás',
    obs2.body.status === 'not_actionable' && obs2.body.reason === 'invite_revoked');

  // IDEMPOTENCIA: az ismételt visszavonás NEM duplikál, és a nyugta igazat mond.
  const cE = await counts();
  const revoke2 = await anna.post('/api/invites/revoke', { ref: sor(lista1, 'cili@r132.hu').ref });
  const cF = await counts();
  step('(a8) az ISMÉTELT visszavonás ugyanazt az eseményt NEM duplikálja, és changed:false',
    revoke2.body.ok === true && revoke2.body.changed === false && unchanged(cE, cF),
    { changed: revoke2.body.changed, reason: revoke2.body.reason, delta: diff(cE, cF) });

  // MÁR ELFOGADOTT meghívó visszavonása: NEVEZETT, hatásmentes — és NEM tagságmegvonás.
  const cG = await counts();
  const listaB = await waiting();
  const revokeAccepted = await anna.post('/api/invites/revoke', { ref: sor(listaB, 'bela@r132.hu').ref });
  const cH = await counts();
  step('(a9) MÁR ELFOGADOTT meghívó: nevezett, HATÁSMENTES kimenet — a tagság ÉRINTETLEN',
    revokeAccepted.body.ok === true && revokeAccepted.body.changed === false
    && revokeAccepted.body.reason === 'invite_already_redeemed'
    && revokeAccepted.body.next_step === 'revoke_membership'
    && mState(belaId).effective === true && unchanged(cG, cH),
    { reason: revokeAccepted.body.reason, bela_effective: mState(belaId).effective, delta: diff(cG, cH) });

  // LEJÁRT meghívó: nincs hamis sikeres változás.
  const invExp = await anna.post('/api/invites', { email: 'lejart@r132.hu', role: 'user', scope: 'keszlet' });
  await tick(8 * 24 * 60 * 60 * 1000);
  const listaC = await waiting();
  const cI = await counts();
  const revokeExpired = await anna.post('/api/invites/revoke', { ref: sor(listaC, 'lejart@r132.hu').ref });
  const cJ = await counts();
  step('(a10) LEJÁRT meghívó: nevezett, hatásmentes — nem mutatunk hamis sikeres változást',
    revokeExpired.body.ok === true && revokeExpired.body.changed === false
    && revokeExpired.body.reason === 'invite_expired' && unchanged(cI, cJ),
    { reason: revokeExpired.body.reason, state: sor(listaC, 'lejart@r132.hu').state, delta: diff(cI, cJ) });
  await anna.post('/api/invites', { email: 'friss@r132.hu', role: 'user', scope: 'keszlet' });
  const listaD0 = await waiting();
  step('(a11) a lista a NÉGY állapotot KÜLÖN mutatja',
    listaD0.states.pending >= 1 && listaD0.states.accepted >= 1 && listaD0.states.revoked >= 1 && listaD0.states.expired >= 1,
    listaD0.states);

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('B) A132-02 — JOGOSULATLAN · IDEGEN · ELAVULT · PLAFONON TÚLI: HATÁSMENTES');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  const inv3 = await anna.post('/api/invites', { email: 'dori@r132.hu', role: 'user', scope: 'keszlet' });
  const listaD = await waiting();
  const refDori = sor(listaD, 'dori@r132.hu').ref;

  // (b1) A TAG, AKINEK NINCS `alter_right`-ja: a saját meghívóját sem vonhatja vissza.
  const cK = await counts();
  const belaRevoke = await bela.post('/api/invites/revoke', { ref: refDori });
  const cL = await counts();
  step('(b1) a hatáskör nélküli tag visszavonása NEVEZETTEN és ÍRÁSMENTESEN elakad',
    belaRevoke.body.ok === false && unchanged(cK, cL),
    { reason: belaRevoke.body.reason, delta: diff(cK, cL) });

  // (b2) IDEGEN FIÓK: Edit saját munkakörnyezetében áll, és egy MÁSIK könyv jelölőjét küldi be.
  const edit = new Client(base, 'edit');
  const editId = await signUp(edit, 'edit@r132.hu', 'edit-titok-1');
  const editWs = await edit.post('/api/workspaces', { name: 'Edit Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '10779298-2-44' } });
  // A SAJÁT CÉGES KÖNYVÉT A VÁLASZ MONDJA MEG, NEM EGY SQL-TALÁLGATÁS. Az első alakom a
  // `membership` első sorát vette — az viszont a SZEMÉLYES tere (`ps_…`) volt, nem a cége (`ws_…`),
  // tehát a mérés egy MÁS könyv alapját vonta meg, és „nem tüzelt az őr"-nek látszott volna
  // (KUKA-120 · KUKA-239: a hatókör nélküli minta a szomszéd sort igazolja).
  const editBook = editWs.body.book_id;
  const cM = await counts();
  const editRevoke = await edit.post('/api/invites/revoke', { ref: refDori });
  const cN = await counts();
  step('(b2) IDEGEN könyv jelölője: a válasz ugyanaz, mint a nem létezőé, és nem ír',
    editRevoke.body.ok === false && editRevoke.body.reason === 'invite_unknown' && unchanged(cM, cN),
    { reason: editRevoke.body.reason, delta: diff(cM, cN) });

  // (b3) ELAVULT KONTEXTUS: a kérés egy MÁSIK könyvet erősít meg, mint amiben a munkamenet áll.
  const cO = await counts();
  const staleCtx = await anna.post('/api/invites/revoke', { ref: refDori, expected_book_id: 'bk_nem_letezik' });
  const cP = await counts();
  step('(b3) ELAVULT nézet-megerősítés: a kérés nevezetten elakad, írás nélkül',
    staleCtx.body.ok === false && unchanged(cO, cP),
    { reason: staleCtx.body.reason, delta: diff(cO, cP) });

  // (b4) POZITÍV ELLENPÁR: ugyanaz a kérés, helyes kontextusból, MŰKÖDIK.
  const cQ = await counts();
  const jo = await anna.post('/api/invites/revoke', { ref: refDori, expected_book_id: BOOK });
  const cR = await counts();
  step('(b4) POZITÍV ELLENPÁR: a jogosult, helyes nézetű kérés MŰKÖDIK',
    jo.body.ok === true && jo.body.changed === true && cR.invite_revocation === cQ.invite_revocation + 1,
    { changed: jo.body.changed, delta: diff(cQ, cR) });

  // (b5) IDEGEN NÉZŐ: nem kap cím-listát és nem kap token-adatot.
  const idegen = new Client(base, 'idegen');
  await signUp(idegen, 'idegen@r132.hu', 'idegen-titok-1');
  const idegenList = await idegen.get('/api/invites/waiting');
  const idegenObs = await idegen.get(`/api/invites/observe?token=${encodeURIComponent(tok2)}`);
  step('(b5) IDEGEN néző: se meghívólista, se token-adat, se cím',
    (idegenList.body.ok !== true || !(idegenList.body.invites || []).length)
    && idegenObs.body.status !== 'redeem_as_existing' && idegenObs.body.status !== 'redeem_as_new'
    && !JSON.stringify(idegenObs.body).includes('cili@r132.hu'),
    { lista: idegenList.body.reason ?? 'üres', obs: idegenObs.body.status });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('C) A132-04 — A RENDES MEGHÍVÓ NEM REAKTIVÁL; AZ ÚJRAHÍVÁS KÜLÖN DÖNTÉS');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // Béla ÁR-jogot is kap, hogy a következő szakaszban mérhető legyen a FEL NEM ÉLEDÉS.
  await anna.post('/api/members/scope', { subject_id: belaId, scope: 'arak' });
  const belaCred = store.get('SELECT credential FROM account WHERE subject_id = ?', belaId).credential;
  step('(c0) Béla két körrel áll, mindkettő ÉLŐ',
    liveScope(belaId, 'keszlet').allowed === true && liveScope(belaId, 'arak').allowed === true);

  await tick(1000);
  const kiv = await anna.post('/api/members/revoke', { subject_id: belaId });
  step('(c1) a tagság megszüntetése MŰKÖDIK, és Béla már nem tag',
    kiv.body.ok === true && mState(belaId).effective === false,
    { reason: mState(belaId).reason });

  // A RENDES meghívás NEM reaktivál (a `revoked_needs_decision` védelem MEGMARADT).
  await tick(1000);
  const invNorm = await anna.post('/api/invites', { email: 'bela@r132.hu', role: 'user', scope: 'keszlet' });
  const cS = await counts();
  const redNorm = await bela.post('/api/invites/redeem', { token: invNorm.body.token });
  const cT = await counts();
  step('(c2) a RENDES meghívó NEM reaktivál: nevezett zárás, a token NEM fogy el, nincs írás',
    redNorm.body.ok === false && redNorm.body.outcome === 'revoked_needs_decision'
    && store.get('SELECT redeemed_at FROM invite WHERE token = ?', invNorm.body.token).redeemed_at === null
    && mState(belaId).effective === false && unchanged(cS, cT),
    { outcome: redNorm.body.outcome, reason: redNorm.body.reason, delta: diff(cS, cT) });

  // A KÉPERNYŐ MEGTALÁLJA AZ ELTÁVOLÍTOTT TAGOT, és kimondja, hogy újrahívható.
  const belaRow = await rowOf(belaId);
  step('(c3) az eltávolított tag VISSZAKERESHETŐ, és a szerver mondja meg, hogy újrahívható',
    belaRow && belaRow.effective === false && belaRow.reinvitable === true && belaRow.removed_at !== null,
    { reinvitable: belaRow && belaRow.reinvitable, removed_at: belaRow && belaRow.removed_at });

  // AZ ÚJRAHÍVÁS: külön művelet, AJÁNLATOT ad, nem tagságot.
  await tick(1000);
  const cU = await counts();
  const ri = await anna.post('/api/members/reinvite', { subject_id: belaId, role: 'user', scope: 'keszlet', operation_id: 'r132-bela-1' });
  const cV = await counts();
  step('(c4) az ÚJRAHÍVÁS ajánlatot ad (nem tagságot): döntés + meghívó + pecsét EGYÜTT születik',
    ri.body.ok === true && ri.body.requires_acceptance === true && ri.body.restores_previous_scopes === false
    && cV.membership_reentry === cU.membership_reentry + 1 && cV.invite === cU.invite + 1
    && cV.membership === cU.membership && cV.membership_grant === cU.membership_grant,
    diff(cU, cV));
  step('(c5) az újrahívás UTÁN Béla MÉG NEM tag — a tagságot a saját elfogadása adja',
    mState(belaId).effective === false, { reason: mState(belaId).reason });
  // A TOKEN NEM MEGY VISSZA A FELÜLETRE — a címzett a LEVÉLBŐL kapja (ez a valódi út).
  step('(c6) a válasz NEM ad ki beváltható hivatkozást',
    !JSON.stringify(ri.body).match(/[0-9a-f]{64}/), { ref: ri.body.ref });

  const tok4 = tokenFromLink(await linkFor('bela@r132.hu', 'Meghívás'));
  step('(c7) a címzett a LEVÉLBŐL kapja a hivatkozást', typeof tok4 === 'string' && tok4.length === 64);

  await tick(1000);
  const red4 = await bela.post('/api/invites/redeem', { token: tok4 });
  const p2 = mState(belaId).period_grant_event_id;
  step('(c8) a CÍMZETT elfogadása ÚJ TAGSÁGI IDŐSZAKOT ad',
    red4.body.ok === true && red4.body.outcome === 'regranted'
    && mState(belaId).effective === true && p2 !== p1,
    { outcome: red4.body.outcome, reason: red4.body.reason, err: red4.body.error, msg: red4.body.message, period1: p1, period2: p2 });
  step('(c9) UGYANAZ a személy, VÁLTOZATLAN hitelesítő adat, más fiókok érintetlenül',
    store.get('SELECT credential FROM account WHERE subject_id = ?', belaId).credential === belaCred
    && Number(store.get('SELECT COUNT(*) n FROM subject WHERE id = ?', belaId).n) === 1
    && membershipAsOf({ store, subjectId: editId, bookId: store.get('SELECT book_id FROM membership WHERE subject_id = ?', editId).book_id, validAt: now(), knownAt: now() }).effective === true,
    { credential_unchanged: true });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('D) A132-05 — A RÉGI JOGOK NEM ÉLEDNEK FEL');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  const zartak = KNOWN_DATA_SCOPES.filter((sc) => liveScope(belaId, sc).allowed !== true);
  step('(d1) MIND A NÉGY adatkör ZÁRT az új belépés után',
    zartak.length === KNOWN_DATA_SCOPES.length, { zart: zartak });
  step('(d2) és a zárás OKA nevezett: a megadás egy KORÁBBI, lezárt időszakban történt',
    liveScope(belaId, 'keszlet').reason === 'scope_grant_other_period'
    && liveScope(belaId, 'arak').reason === 'scope_grant_other_period',
    { keszlet: liveScope(belaId, 'keszlet').reason, arak: liveScope(belaId, 'arak').reason });
  step('(d3) a RÉGI megadás-esemény viszont MEGVAN — nem töröltük, csak nem él',
    readScopeGrantAt({ store, subjectId: belaId, bookId: BOOK, scope: 'arak', validAt: now(), knownAt: now() }).granted === true,
    { esemenysor: 'granted' });

  // A DELEGÁLÁSI ALAP SEM ÉLED FEL.
  const belaDeleg = store.get(
    `SELECT revoked_at FROM authority_basis WHERE basis_id = ? AND book_id = ? ORDER BY version DESC LIMIT 1`,
    `deleg:${BOOK}:${belaId}`, BOOK);
  step('(d4) a RÉGI delegálási alap sem éled fel', belaDeleg === undefined || belaDeleg.revoked_at !== null,
    { deleg: belaDeleg ? 'megvont' : 'nincs' });

  // A KORÁBBAN KIADOTT FÜGGŐ MEGHÍVÓ sem ad semmit (a `invNorm` token még beváltatlan).
  const cW = await counts();
  const redOld = await bela.post('/api/invites/redeem', { token: invNorm.body.token });
  const cX = await counts();
  step('(d5) a KORÁBBAN kiadott függő meghívó sem ad új jogot vagy időszakot',
    mState(belaId).period_grant_event_id === p2
    && cX.membership_grant === cW.membership_grant && cX.scope_grant === cW.scope_grant,
    { ok: redOld.body.ok, outcome: redOld.body.outcome, delta: diff(cW, cX) });

  // ÚJ, KIFEJEZETT MEGADÁS után a mennyiség IGEN, az ár/dokumentum/beszállító NEM.
  await tick(1000);
  const g2 = await anna.post('/api/members/scope', { subject_id: belaId, scope: 'keszlet' });
  const stock = await bela.get('/api/data/stock');
  const price = await bela.get('/api/data/price');
  const doc = await bela.get('/api/data/document');
  const sup = await bela.get('/api/data/supplier');
  step('(d6) ÚJ, kifejezett készlet-megadás után: MENNYISÉG igen, ár/dokumentum/beszállító NEM',
    g2.body.ok === true && g2.body.changed === true
    && stock.body.ok === true && price.body.ok === false && doc.body.ok === false && sup.body.ok === false,
    { stock: stock.body.ok, price: price.body.ok, doc: doc.body.ok, supplier: sup.body.ok });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('E) A132-06 — KÉT IDŐ-TENGELY: RÉGI IDŐSZAK → KÖZTES SZÜNET → ÚJ IDŐSZAK');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  const per = membershipPeriodsOf({ store, subjectId: belaId, bookId: BOOK, knownAt: now() });
  const P1 = per.periods[0]; const P2 = per.periods[1];
  step('(e1) a történet KÉT időszakot visz: az első LEZÁRT, a második NYITOTT',
    per.periods.length === 2 && P1.open === false && P2.open === true && P1.grant_event_id !== P2.grant_event_id,
    per.periods.map((x) => ({ id: x.grant_event_id, open: x.open, from: x.opened_at, to: x.closed_at })));
  // A KÖZTES SZÜNET: a megvonás és az új belépés KÖZÖTTI pillanatra NEM volt tagsága.
  const kozte = new Date((Date.parse(P1.closed_at) + Date.parse(P2.opened_at)) / 2).toISOString();
  step('(e2) a KÖZTES időszakra a tagság NEM állt fenn (mai tudással kérdezve)',
    membershipAsOf({ store, subjectId: belaId, bookId: BOOK, validAt: kozte, knownAt: now() }).effective === false,
    { kozte });
  // A MÚLT SÉRTETLEN: az ELSŐ időszak belsejére a tagság ÁLL, és a RÉGI jog is ÉLŐ volt.
  // AZ IDŐSZAK BELSEJE, NEM A NYITÁS PILLANATA. A készlet-jog a beváltás UTÁN pár ms-mal született,
  // tehát a nyitás PILLANATÁBAN még nem volt hatályos — a felező pont a helyes kérdés (az első
  // alakom a nyitást kérdezte, és a `grant_not_yet_effective` választ a rendszer hibájának vette
  // volna: KUKA-120, a mérő a saját fixtúrájának hibáját a tárgyra vallotta volna).
  const belsoP1 = new Date((Date.parse(P1.opened_at) + Date.parse(P1.closed_at)) / 2).toISOString();
  step('(e3) a RÉGI időszak belsejére a tagság MA IS igaz — a történetet nem írtuk át',
    membershipAsOf({ store, subjectId: belaId, bookId: BOOK, validAt: belsoP1, knownAt: now() }).effective === true,
    { at: belsoP1 });
  step('(e4) és a RÉGI időszakban a RÉGI jog ÉLŐ volt (a történeti nézet használható)',
    scopeGrantLiveAt({ store, subjectId: belaId, bookId: BOOK, scope: 'keszlet', nowIso: belsoP1, knownAt: now() }).allowed === true,
    { at: belsoP1 });
  // A RÉGI ESEMÉNYEK SÉRTETLENEK: a számuk nem csökkent.
  step('(e5) a régi események SÉRTETLENEK: két tagságadás és egy megvonás áll a naplóban',
    Number(store.get('SELECT COUNT(*) n FROM membership_grant WHERE subject_id = ? AND book_id = ?', belaId, BOOK).n) === 2
    && Number(store.get('SELECT COUNT(*) n FROM membership_revocation WHERE subject_id = ? AND book_id = ?', belaId, BOOK).n) === 1);

  // MÁSODIK CIKLUS: megszüntetés → újrahívás → elfogadás, ÚJRA végigvihető.
  await tick(1000);
  await anna.post('/api/members/revoke', { subject_id: belaId });
  await tick(1000);
  const ri2 = await anna.post('/api/members/reinvite', { subject_id: belaId, role: 'user', scope: 'keszlet', operation_id: 'r132-bela-2' });
  const tok6 = tokenFromLink(await linkFor('bela@r132.hu', 'Meghívás'));
  await tick(1000);
  const red6 = await bela.post('/api/invites/redeem', { token: tok6 });
  const p3 = mState(belaId).period_grant_event_id;
  step('(e6) a MÁSODIK visszahívási ciklus is végigvihető, és HARMADIK időszakot nyit',
    ri2.body.ok === true && red6.body.ok === true && red6.body.outcome === 'regranted'
    && p3 !== p2 && p3 !== p1,
    { p1, p2, p3 });
  const per3 = membershipPeriodsOf({ store, subjectId: belaId, bookId: BOOK, knownAt: now() });
  step('(e7) a történet HÁROM időszakot visz, és a két korábbi LEZÁRT marad',
    per3.periods.length === 3 && per3.periods[0].open === false && per3.periods[1].open === false && per3.periods[2].open === true,
    per3.periods.map((x) => ({ id: x.grant_event_id, open: x.open })));
  step('(e8) és az ELŐZŐ ciklusban adott készlet-jog sem éledt fel',
    liveScope(belaId, 'keszlet').allowed === false && liveScope(belaId, 'keszlet').reason === 'scope_grant_other_period',
    { reason: liveScope(belaId, 'keszlet').reason });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('F) A132-07 — MEGVÁLTOZOTT CÉLÁLLAPOT, TILTÁS, CÍMELTÉRÉS, KORÁBBI CIKLUS AJÁNLATA');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // A KORÁBBI CIKLUS AJÁNLATA nem nyitja újra a KÉSŐBBI megszűnést (spec §4).
  await tick(1000);
  await anna.post('/api/members/revoke', { subject_id: belaId });
  await tick(1000);
  const cY = await counts();
  const redStale = await bela.post('/api/invites/redeem', { token: tok4 });
  const cZ = await counts();
  step('(f1) egy KORÁBBI megszűnésre kiadott ajánlat NEM nyitja újra a KÉSŐBBI megszűnést',
    redStale.body.ok === false && mState(belaId).effective === false && unchanged(cY, cZ),
    { reason: redStale.body.reason, delta: diff(cY, cZ) });

  // MA ÉLŐ tagságra nem adható újrahívás.
  const cAA = await counts();
  const riOpen = await anna.post('/api/members/reinvite', { subject_id: annaId, role: 'user', scope: 'keszlet', operation_id: 'r132-anna-open' });
  const cBB = await counts();
  step('(f2) MA ÉLŐ tagságra az újrahívás nevezetten elakad, írás nélkül',
    riOpen.body.ok === false && riOpen.body.reason === 'reentry_target_membership_is_open' && unchanged(cAA, cBB),
    { reason: riOpen.body.reason, delta: diff(cAA, cBB) });

  // A ZÁRT SZEREP-KÉSZLET A HATÁRON ZÁR (HTP-01 · KUKA-236): a szótáron kívüli szerep NEM jut el a
  // domain-műveletig. KIMONDVA, MIT MÉR EZ, ÉS MIT NEM: ez a SÉMA kapuja, nem a delegálási plafon —
  // a mai szerep-regiszterben (`admin` → [admin, user]) a kezelőnek nincs olyan ISMERT szerep, ami a
  // plafonján KÍVÜL esne, tehát a plafon szerep-tengelyét ezen a fiókon nem lehet megbuktatni. Az
  // ALAP érvényességét ezért külön, saját fiókon mérjük (f5) — a nem mérhetőt nem nevezzük mértnek
  // (KUKA-033 · KUKA-216: a verdikt nem mutathat a mérés hatókörén túl).
  const cCC = await counts();
  const riRole = await anna.post('/api/members/reinvite', { subject_id: belaId, role: 'owner', scope: 'keszlet', operation_id: 'r132-bela-role' });
  const cDD = await counts();
  step('(f3) a ZÁRT szerep-készleten kívüli szerep a HATÁRON zár, írás nélkül',
    riRole.body.ok === false && riRole.body.reason === 'invalid_value' && unchanged(cCC, cDD),
    { reason: riRole.body.reason, delta: diff(cCC, cDD) });

  // FELFÜGGESZTÉS / TILTÁS / NYITOTT FELÜLVIZSGÁLAT: nevezett zárás + a MEGLÉVŐ eljárásra mutató
  // folytatás. A felfüggesztést a mag saját írójával állítjuk be (HTTP-út nincs rá) — a FIXTÚRA
  // ténye KIMONDVA, és a séma szerinti VALÓDI állapot (KUKA-033).
  store.run(`INSERT INTO membership_suspension (subject_id, book_id, actor_subject_id, suspended_at, reason)
             VALUES (?,?,?,?,?)`, belaId, BOOK, annaId, now(), 'r132-fixtura: szintetikus felfüggesztés');
  const cEE = await counts();
  const riSusp = await anna.post('/api/members/reinvite', { subject_id: belaId, role: 'user', scope: 'keszlet', operation_id: 'r132-bela-susp' });
  const cFF = await counts();
  step('(f4) FELFÜGGESZTÉS mellett az újrahívás NEVEZETTEN zár, és a MEGLÉVŐ eljárásra mutat',
    riSusp.body.ok === false && riSusp.body.reason === 'reentry_blocked_suspension'
    && riSusp.body.next_step === 'lift_suspension' && unchanged(cEE, cFF),
    { reason: riSusp.body.reason, next_step: riSusp.body.next_step, delta: diff(cEE, cFF) });
  store.run('DELETE FROM membership_suspension WHERE subject_id = ? AND book_id = ?', belaId, BOOK);

  // (f5) ÉRVÉNYTELEN ALAP — Edit SAJÁT munkakörnyezetében, hogy a fő fiók plafonja ÉP maradjon. Az
  //      indulási alap megvonása után a kezelő MINDEN rendelkezése nevezetten elakad: a jog nem
  //      élheti túl az alapját (ORG-N1a). A pozitív ellenpár ELŐBB fut, hogy a mérés a MEGVONÁS
  //      hatását mérje, ne egy amúgy is zárt utat (KUKA-055: a negatív ág előfeltétele is mérés).
  const editInv = await edit.post('/api/invites', { email: 'ferenc@r132.hu', role: 'user', scope: 'keszlet' });
  const editList = await edit.get('/api/invites/waiting');
  const refF = (editList.body.invites || []).find((x) => x.email === 'ferenc@r132.hu').ref;
  const editInv2 = await edit.post('/api/invites', { email: 'hanna@r132.hu', role: 'user', scope: 'keszlet' });
  const editList2 = await edit.get('/api/invites/waiting');
  const refH = (editList2.body.invites || []).find((x) => x.email === 'hanna@r132.hu').ref;
  const posPair = await edit.post('/api/invites/revoke', { ref: refF });
  step('(f5a) POZITÍV ELLENPÁR: ÉLŐ alappal a visszavonás működik', posPair.body.ok === true && posPair.body.changed === true,
    { changed: posPair.body.changed });
  const rvb = revokeAuthorityBasis({ store, basisId: `startup-rule:${editBook}`, bookId: editBook, at: now() });
  step('(f5-elofeltetel) a fixtúra VALÓBAN megvonta Edit indulási alapját',
    rvb.ok === true && rvb.changed === true, { reason: rvb.reason, book: editBook });
  const cOO = await counts();
  const invalidBasis = await edit.post('/api/invites/revoke', { ref: refH });
  const cPP = await counts();
  step('(f5b) ÉRVÉNYTELEN (megvont) ALAP mellett a rendelkezés nevezetten elakad, írás nélkül',
    invalidBasis.body.ok === false && unchanged(cOO, cPP),
    { reason: invalidBasis.body.reason, delta: diff(cOO, cPP) });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('G) A132-08 — EGYSZERI HATÁS (egy kapcsolaton mérve; a verseny tanúja a proof:multiconn)');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  await tick(1000);
  // ══ AZ R132-ES (g1) ÁLLÍTÁS HELYESBÍTVE (R134/F134-03) ══════════════════════════════════════
  //
  // AMI ITT ÁLLT, ÉS MIÉRT VOLT TÚL ERŐS. Az eredeti (g1) két AZONOS, egymás utáni kérésre KÉT
  // önálló ajánlatot mért (`invite` +2 · `membership_reentry` +2), és ezt „nem duplikált döntés"
  // címen PASS-nak nevezte. A külső ellenőrző fél (chatgpt-v3, R134) kimutatta, hogy ez épp a
  // hiányzó egyszeri hatás: a HTTP-út minden kéréshez új tokent gyártott, tartós kérés-azonosság
  // nélkül — vagyis a „dupla kattintás ne adjon új üzleti hatást" (spec §5) NEM teljesült.
  //
  // A JAVÍTOTT MÉRCE (OON-01): az AZONOSSÁG dönt, nem a kérések száma. UGYANAZ az azonosság EGY
  // ajánlatot ad (ismétlés), KÜLÖN azonosság KÉT önálló ajánlatot — mert az két tudatos döntés.
  const cGG = await counts();
  const ri3a = await anna.post('/api/members/reinvite', { subject_id: belaId, role: 'user', scope: 'keszlet', operation_id: 'r132-bela-3a' });
  const ri3rep = await anna.post('/api/members/reinvite', { subject_id: belaId, role: 'user', scope: 'keszlet', operation_id: 'r132-bela-3a' });
  const cHH0 = await counts();
  step('(g1) UGYANAZ az azonosság EGY ajánlatot ad: az ismétlés ÚJ hatás nélkül ugyanazt adja vissza',
    ri3a.body.ok === true && ri3rep.body.ok === true && ri3rep.body.replayed === true
    && ri3rep.body.ref === ri3a.body.ref
    && cHH0.membership_reentry === cGG.membership_reentry + 1 && cHH0.invite === cGG.invite + 1,
    diff(cGG, cHH0));
  const ri3b = await anna.post('/api/members/reinvite', { subject_id: belaId, role: 'user', scope: 'keszlet', operation_id: 'r132-bela-3b' });
  const cHH = await counts();
  step('(g1/b) KÜLÖN azonosság viszont ÚJ, tudatos ajánlat — a kapu nem fal (KUKA-122)',
    ri3b.body.ok === true && ri3b.body.replayed !== true
    && cHH.membership_reentry === cHH0.membership_reentry + 1 && cHH.invite === cHH0.invite + 1,
    diff(cHH0, cHH));
  // ÉS TÖBB PÁRHUZAMOS AJÁNLATBÓL SEM LEHET KÉT ÉLŐ IDŐSZAK (spec §4).
  const tokA = tokenFromLink(await linkFor('bela@r132.hu', 'Meghívás'));
  await tick(1000);
  const redA = await bela.post('/api/invites/redeem', { token: tokA });
  const cII = await counts();
  const redB = await bela.post('/api/invites/redeem', { token: tokA });
  const cJJ = await counts();
  step('(g2) az ELVESZETT NYUGTA utáni ISMÉTLÉS nem ad második hatást',
    redA.body.ok === true && redB.body.ok === false && unchanged(cII, cJJ),
    { elso: redA.body.outcome, masodik: redB.body.reason, delta: diff(cII, cJJ) });
  const per4 = membershipPeriodsOf({ store, subjectId: belaId, bookId: BOOK, knownAt: now() });
  step('(g3) TÖBB párhuzamos ajánlatból sem lesz két ÉLŐ időszak',
    per4.periods.filter((x) => x.open === true).length === 1,
    { nyitott: per4.periods.filter((x) => x.open === true).length, osszes: per4.periods.length });

  // TÁROLÁSI HIBA: a döntés-sor írásának meghiúsulása a TELJES egységet visszagörgeti.
  await tick(1000);
  await anna.post('/api/members/revoke', { subject_id: belaId });
  await tick(1000);
  store.db.exec('CREATE TEMP TRIGGER r132_reentry_ignore BEFORE INSERT ON membership_reentry BEGIN SELECT RAISE(IGNORE); END');
  const cKK = await counts();
  const bukott = await anna.post('/api/members/reinvite', { subject_id: belaId, role: 'user', scope: 'keszlet', operation_id: 'r132-bela-broken' });
  const cLL = await counts();
  store.db.exec('DROP TRIGGER r132_reentry_ignore');
  step('(g4) NULLA SOROS írás: a TELJES egység visszagördül — se meghívó, se pecsét, se alap nem marad',
    bukott.body.ok === false && bukott.body.reason === 'reentry_row_not_created' && unchanged(cKK, cLL),
    { reason: bukott.body.reason, delta: diff(cKK, cLL) });

  // ÉS A VISSZAVONÁSI ÁGON IS: a napló írásának meghiúsulása nem hagy félkész állapotot.
  const invG = await anna.post('/api/invites', { email: 'gizi@r132.hu', role: 'user', scope: 'keszlet' });
  const listaG = await waiting();
  store.db.exec('CREATE TEMP TRIGGER r132_rev_ignore BEFORE INSERT ON invite_revocation BEGIN SELECT RAISE(IGNORE); END');
  const cMM = await counts();
  const bukottRev = await anna.post('/api/invites/revoke', { ref: sor(listaG, 'gizi@r132.hu').ref });
  const cNN = await counts();
  store.db.exec('DROP TRIGGER r132_rev_ignore');
  step('(g5) a VISSZAVONÁS tárolási hibája sem hagy félkész állapotot',
    bukottRev.body.ok === false && bukottRev.body.reason === 'revocation_row_not_created' && unchanged(cMM, cNN),
    { reason: bukottRev.body.reason, delta: diff(cMM, cNN) });
  const listaG2 = await waiting();
  step('(g6) és a meghívó a bukott visszavonás után IS függő marad (a nyugta igazat mondott)',
    sor(listaG2, 'gizi@r132.hu').state === 'pending'
    && inviteRevocationAt({ store, token: invG.body.token, nowIso: now() }).revoked === false,
    { state: sor(listaG2, 'gizi@r132.hu').state });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('H) A132-10 — A NYUGTÁK ÉS ELUTASÍTÁSOK MINDEN BEKAPCSOLT NYELVEN');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  const langs = enabledLanguages().map((l) => l.code);
  for (const key of ['inviteRevoked', 'inviteRevokeUnchanged', 'reinviteSent', 'reinviteConfirmLead']) {
    const hol = langs.filter((lc) => {
      const d = dictFor(lc);
      const t = ((d.TPL) || {})[key] ?? ((d.UI) || {})[key] ?? ((d.STATE) || {})[key];
      return typeof t === 'string' && t.trim().length > 0;
    });
    step(`(h) a "${key}" szöveg MINDEN bekapcsolt nyelven megvan`, hol.length === langs.length, { megvan: hol, kell: langs });
  }
  for (const key of ['invite_revoked', 'reentry_decision_required', 'reentry_blocked_suspension', 'scope_grant_other_period']) {
    const hol = langs.filter((lc) => {
      const t = ((dictFor(lc).REASON) || {})[key];
      return typeof t === 'string' && t.trim().length > 0;
    });
    step(`(h) a "${key}" INDOK-szöveg minden bekapcsolt nyelven megvan`, hol.length === langs.length, { megvan: hol, kell: langs });
  }

} finally {
  await app.close();
  if (existsSync(dbPath)) rmSync(dbPath, { force: true });
}

const pass = results.filter((x) => x.pass).length;
console.log(`\n${'='.repeat(94)}`);
console.log(`findings_r132: ${pass}/${results.length} PASS`);
if (pass !== results.length) {
  console.log('\nBUKOTT:');
  for (const x of results.filter((y) => !y.pass)) console.log(`  · [${x.section}] ${x.name}`);
}
process.exit(pass === results.length ? 0 : 1);
