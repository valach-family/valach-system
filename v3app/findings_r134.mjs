// v3app/findings_r134.mjs — AZ R134 ELLENPRÓBÁI: A VÉGLEGESÍTÉSI KAPUK, A RÉGI HATÁSKÖR ÉS AZ
// EGYSZERI AJÁNLAT.
//
// MIT MÉR, ÉS MIÉRT ÉPP EZT. Az R134 NÉGY leletet nevezett meg az R132-es csomagon. Hármat a külső
// ellenőrző fél (chatgpt-v3) VALÓDI HTTP + tároló ellenpéldával mutatott ki, egyet a szállítás
// hiányaként. Ez a battéria a három MÉRHETŐ leletet viszi, mindegyiket NEGATÍV KONTROLLKÉNT: előbb
// reprodukálható PIROS a javítás előtt, aztán UGYANEZ a tanú zöld a javítás után (R134 §Végrehajtás).
//
//   F134-01  a KIADÁS UTÁN bekövetkezett felfüggesztés/tiltás/felülvizsgálat mellett a beváltás
//            ÚJ TAGSÁGOT adott és ELFOGYASZTOTTA a tokent (`ok:true, outcome:regranted`);
//   F134-02  a RÉGI bírálati hatáskör az ÚJ tagsági időszakban is használható maradt, és a régi
//            kiadó MÁSNAK kiadott függő meghívója sem volt mérve;
//   F134-03  az ajánlat kiadása nem volt ismétlésbiztos: két azonos kérés KÉT önálló ajánlatot adott.
//
// ÉS AMIT AZ R134 AZ ELFOGADÁSI TÁBLÁHOZ KÉRT, ugyanitt:
//   A132-06  azonos időbélyegnél MI engedett és MI nevezetten tiltott — két cikluson át;
//   A132-08  NULLA SOROS és KIVÉTELT DOBÓ tárolóhiba az ajánlat ÉS a véglegesítés több-írásos ágán,
//            a TOKENFOGYASZTÁS hibáját is beleértve (ne maradjon új időszak vagy átvitt korlát).
//
// AMIT KIMONDVA NEM BIZONYÍT:
//   · NEM böngésző (a DOM-tanú a `tests/e2e/` alatt áll) · NEM valódi levélküldés (a bemutató
//     levél-doboza az út) · NEM többkapcsolatos verseny: az itt mért ismétlés EGY kapcsolaton megy,
//     a két VALÓDI folyamat tanúja a `npm run proof:multiconn` (KUKA-033: a mérés nevezze meg a tárgyát).
//
// A SZÁMLÁLÓ A TANÚ: minden írásmentességi állítás a `/dev/rowcounts` KÜLÖNBSÉGÉN áll (KUKA-135 ·
// KUKA-220). A FIXTÚRA TÉNYE KIMONDOTT: ahol a mag saját íróját hívjuk (felfüggesztés, tiltás,
// hatáskör-adás), ott HTTP-út nincs, és ezt a szakasz fejléce megmondja (KUKA-033).
import { rmSync, existsSync } from 'node:fs';
import { startServer, selfcheckDbPath } from './server.mjs';
import { membershipAsOf, membershipPeriodsOf } from '../v3ref/bitemporal.mjs';
import { scopeGrantLiveAt } from '../v3ref/releaseScope.mjs';
import { executableRightAt } from '../v3ref/authority.mjs';
import { reinviteMember } from '../v3ref/delegation.mjs';
import { grantAdjudicationAuthority } from '../v3ref/adjudication.mjs';
import { basisAsOf, recordAuthorityBasis } from '../v3ref/authorityBasis.mjs';
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
console.log(`findings_r134: ${base}  · tároló: ${dbPath}`);

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
  // A `/dev/mailbox` a LEGÚJABBAT adja ELŐRE — a legfrissebb levél a nulladik elem (az R132
  // battéria mért tapasztalata, KUKA-120).
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
  let BOOK = null;
  const mState = (who) => membershipAsOf({ store, subjectId: who, bookId: BOOK, validAt: now(), knownAt: now() });
  const period = (who) => mState(who).period_grant_event_id;
  const waiting = async () => (await anna.get('/api/invites/waiting')).body;
  const sor = (lista, email) => (lista.invites || []).find((x) => x.email === email) || null;
  const opId = (s) => `op-r134-${s}`;

  // ── (0) SZABÁLYOS FELÁLLÁS ────────────────────────────────────────────────────────────────────
  const annaId = await signUp(anna, 'anna@r134.hu', 'anna-titok-1');
  const ws = await anna.post('/api/workspaces', { name: 'R134 Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '62345676-2-42' } });
  BOOK = ws.body.book_id;
  step('(0) a felállás szabályos: v2 pro fiók', ws.status === 201 && !!BOOK, { book: BOOK });

  /** Egy munkatárs szabályos belépése (meghívó → regisztráció → beváltás). */
  const joinAsMember = async (c, email, pw, role, scope) => {
    const inv = await anna.post('/api/invites', { email, role, scope });
    await c.post('/api/invites/pending', { token: inv.body.token });
    const id = await signUp(c, email, pw);
    const red = await c.post('/api/invites/redeem', { token: inv.body.token });
    await c.post('/api/session/workspace', { book_id: BOOK });
    return { id, ok: red.body.ok === true };
  };
  /** Megszüntetés → kifejezett újrahívás → a CÍMZETT saját elfogadása. A közbeni lépés a hívóé. */
  const revokeAndOffer = async (c, subjectId, role, scope, suffix) => {
    await tick(1000);
    const kiv = await anna.post('/api/members/revoke', { subject_id: subjectId });
    await tick(1000);
    const ri = await anna.post('/api/members/reinvite', { subject_id: subjectId, role, scope, operation_id: opId(suffix) });
    const tok = tokenFromLink(await linkFor(c.name, 'Meghívás'));
    return { kiv, ri, tok };
  };

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('A) F134-01 — A KIADÁS UTÁN BEKÖVETKEZETT ZÁRÁS A VÉGLEGESÍTÉSNÉL IS ZÁR');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // A FIXTÚRA TÉNYE KIMONDOTT: a felfüggesztésre és a tiltásra ma NINCS HTTP-út, ezért a séma
  // szerinti VALÓDI sort a mag saját íróján/nyers beszúrással állítjuk be (KUKA-033). A lelet nem
  // ettől lelet: a beváltási út UGYANAZ, amit a címzett jár.
  const dora = new Client(base, 'dora@r134.hu');
  const d = await joinAsMember(dora, 'dora@r134.hu', 'dora-titok-1', 'user', 'keszlet');
  step('(a0) Dóra szabályosan tag', d.ok === true && mState(d.id).effective === true);
  const dP1 = period(d.id);

  const dOffer = await revokeAndOffer(dora, d.id, 'user', 'keszlet', 'dora-1');
  step('(a1) a megszüntetés és az ÚJRAHÍVÁS kiadása rendben van (előfeltétel)',
    dOffer.kiv.body.ok === true && dOffer.ri.body.ok === true && typeof dOffer.tok === 'string',
    { reason: dOffer.ri.body.reason });

  // (a2) A KIADÁS UTÁN jön a FELFÜGGESZTÉS — és a beváltás MOST ZÁRJON.
  store.run(`INSERT INTO membership_suspension (subject_id, book_id, actor_subject_id, suspended_at, reason)
             VALUES (?,?,?,?,?)`, d.id, BOOK, annaId, now(), 'r134-fixtura: kiadás UTÁNI felfüggesztés');
  const cA = await counts();
  const dRedeem = await dora.post('/api/invites/redeem', { token: dOffer.tok });
  const cB = await counts();
  step('(a2) KIADÁS UTÁNI FELFÜGGESZTÉS: a beváltás NEVEZETTEN zár, tagság NEM születik',
    dRedeem.body.ok === false && dRedeem.body.reason === 'reentry_blocked_suspension'
    && mState(d.id).effective === false,
    { ok: dRedeem.body.ok, reason: dRedeem.body.reason, outcome: dRedeem.body.outcome });
  step('(a3) …a TOKEN ÉRINTETLEN, és egyetlen védett sor sem változott',
    store.get('SELECT redeemed_at FROM invite WHERE token = ?', dOffer.tok).redeemed_at === null
    && unchanged(cA, cB),
    { redeemed_at: store.get('SELECT redeemed_at FROM invite WHERE token = ?', dOffer.tok).redeemed_at, delta: diff(cA, cB) });
  step('(a4) …és a nemleges válasz a MEGLÉVŐ eljárásra mutat (a nyugta nem zsákutca)',
    dRedeem.body.next_step === 'lift_suspension' && typeof dRedeem.body.message === 'string',
    { next_step: dRedeem.body.next_step });

  // (a5) POZITÍV KONTROLL: a felfüggesztés feloldása után UGYANAZ a token működik.
  store.run('UPDATE membership_suspension SET lifted_at = ?, lifted_by = ? WHERE subject_id = ? AND book_id = ?',
    now(), annaId, d.id, BOOK);
  await tick(1000);
  const dRedeem2 = await dora.post('/api/invites/redeem', { token: dOffer.tok });
  step('(a5) POZITÍV KONTROLL: feloldás után UGYANAZ az ajánlat elfogadható, ÚJ időszakot nyit',
    dRedeem2.body.ok === true && dRedeem2.body.outcome === 'regranted'
    && mState(d.id).effective === true && period(d.id) !== dP1,
    { outcome: dRedeem2.body.outcome, p1: dP1, p2: period(d.id) });

  // (a6) KIADÁS UTÁNI TILTÁS — másik munkatárson, hogy a fixtúrák ne keveredjenek.
  const elek = new Client(base, 'elek@r134.hu');
  const e = await joinAsMember(elek, 'elek@r134.hu', 'elek-titok-1', 'user', 'keszlet');
  const eOffer = await revokeAndOffer(elek, e.id, 'user', 'keszlet', 'elek-1');
  store.run(`INSERT INTO subject_ban (subject_id, kind, cause, target_ref, actor_subject_id, banned_at)
             VALUES (?,?,?,?,?,?)`, e.id, 'book', 'left_company', BOOK, annaId, now());
  const cC = await counts();
  const eRedeem = await elek.post('/api/invites/redeem', { token: eOffer.tok });
  const cD = await counts();
  step('(a6) KIADÁS UTÁNI TILTÁS: a beváltás nevezetten zár, írásmentesen',
    eRedeem.body.ok === false && eRedeem.body.reason === 'reentry_blocked_ban'
    && mState(e.id).effective === false && unchanged(cC, cD),
    { reason: eRedeem.body.reason, delta: diff(cC, cD) });
  store.run('UPDATE subject_ban SET lifted_at = ?, lifted_by = ? WHERE subject_id = ?', now(), annaId, e.id);
  await tick(1000);
  const eRedeem2 = await elek.post('/api/invites/redeem', { token: eOffer.tok });
  step('(a7) POZITÍV KONTROLL: a tiltás feloldása után ugyanaz az ajánlat elfogadható',
    eRedeem2.body.ok === true && eRedeem2.body.outcome === 'regranted' && mState(e.id).effective === true,
    { outcome: eRedeem2.body.outcome });

  // (a8) KIADÁS UTÁN NYITOTT FELÜLVIZSGÁLATI KÖR — a lezáró megvonás eseményéhez kötve.
  const feri = new Client(base, 'feri@r134.hu');
  const f = await joinAsMember(feri, 'feri@r134.hu', 'feri-titok-1', 'user', 'keszlet');
  const fOffer = await revokeAndOffer(feri, f.id, 'user', 'keszlet', 'feri-1');
  const fRev = store.get(
    `SELECT * FROM membership_revocation WHERE subject_id = ? AND book_id = ? ORDER BY id DESC LIMIT 1`, f.id, BOOK);
  store.run(`INSERT INTO review_circle (subject_id, book_id, revocation_event_id, basis_effective_at,
               basis_recorded_at, opened_at, opened_by) VALUES (?,?,?,?,?,?,?)`,
    f.id, BOOK, fRev.id, fRev.effective_at, fRev.recorded_at, now(), annaId);
  const cE = await counts();
  const fRedeem = await feri.post('/api/invites/redeem', { token: fOffer.tok });
  const cF = await counts();
  step('(a8) KIADÁS UTÁN NYITOTT FELÜLVIZSGÁLAT: a beváltás nevezetten zár, írásmentesen',
    fRedeem.body.ok === false && fRedeem.body.reason === 'reentry_blocked_open_review_circle'
    && mState(f.id).effective === false && unchanged(cE, cF),
    { reason: fRedeem.body.reason, delta: diff(cE, cF) });
  store.run('UPDATE review_circle SET closed_at = ?, closed_by = ? WHERE subject_id = ? AND book_id = ?',
    now(), annaId, f.id, BOOK);
  await tick(1000);
  const fRedeem2 = await feri.post('/api/invites/redeem', { token: fOffer.tok });
  step('(a9) POZITÍV KONTROLL: a kör lezárása után ugyanaz az ajánlat elfogadható',
    fRedeem2.body.ok === true && fRedeem2.body.outcome === 'regranted' && mState(f.id).effective === true,
    { outcome: fRedeem2.body.outcome });

  // (a10) A KÉT KAPU UGYANAZT A SZERZŐDÉST HOZZA: ami a KIADÁSNÁL zár, a VÉGLEGESÍTÉSNÉL is zár,
  //       ugyanazzal a nevezett okkal (egy feloldó, két hívó — KUKA-018 · KUKA-039).
  const gabi = new Client(base, 'gabi@r134.hu');
  const g = await joinAsMember(gabi, 'gabi@r134.hu', 'gabi-titok-1', 'user', 'keszlet');
  await tick(1000);
  await anna.post('/api/members/revoke', { subject_id: g.id });
  store.run(`INSERT INTO membership_suspension (subject_id, book_id, actor_subject_id, suspended_at, reason)
             VALUES (?,?,?,?,?)`, g.id, BOOK, annaId, now(), 'r134-fixtura: kiadás ELŐTTI felfüggesztés');
  await tick(1000);
  const gIssue = await anna.post('/api/members/reinvite', { subject_id: g.id, role: 'user', scope: 'keszlet', operation_id: opId('gabi-1') });
  step('(a10) a KIADÁSI és a VÉGLEGESÍTÉSI kapu NEVE azonos — ugyanaz a feloldó mondja ki',
    gIssue.body.ok === false && gIssue.body.reason === 'reentry_blocked_suspension'
    && gIssue.body.reason === dRedeem.body.reason,
    { kiadas: gIssue.body.reason, veglegesites: dRedeem.body.reason });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('B) F134-02 — A RÉGI HATÁSKÖR, A RÉGI ALAP ÉS A RÉGI KIADOTT MEGHÍVÓ NEM ÉLED FEL');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // A FIXTÚRA TÉNYE KIMONDOTT: a bírálati hatáskör megadására ma NINCS HTTP-út, ezért a mag saját
  // íróját hívjuk (`grantAdjudicationAuthority`), a könyv INDULÁSI szabályára alapozva — pontosan
  // úgy, ahogy a külső ellenőrző fél az R134-es ellenpéldáját felállította.
  // A TUDÁS TENGELYÉNEK HORGONYA (R136/F136-01): egy instans, ami MINDEN ebben a szakaszban
  // születő megadásnál KORÁBBI — ezzel kérdezhető meg a „még nem ismertük" eset.
  const bootIso = now();
  const bela = new Client(base, 'bela@r134.hu');
  const b = await joinAsMember(bela, 'bela@r134.hu', 'bela-titok-1', 'admin', 'keszlet');
  await anna.post('/api/members/scope', { subject_id: b.id, scope: 'keszlet' });
  const bP1 = period(b.id);
  step('(b0) Béla ADMIN tag, és a készlet-joga ÉLŐ az ELSŐ időszakban',
    b.ok === true && mState(b.id).effective === true
    && scopeGrantLiveAt({ store, subjectId: b.id, bookId: BOOK, scope: 'keszlet', nowIso: now(), knownAt: now() }).allowed === true,
    { period: bP1 });

  // A RÉGI DELEGÁLT ALAP: Béla MÁSNAK ad ki meghívót (ez rögzíti a `deleg:…:bela` alapot).
  const hanna = new Client(base, 'hanna@r134.hu');
  const belaInvite = await bela.post('/api/invites', { email: 'hanna@r134.hu', role: 'user', scope: 'keszlet' });
  const hannaTok = belaInvite.body.token;
  const belaBasisId = `deleg:${BOOK}:${b.id}`;
  step('(b1) a RÉGI delegált alap VALÓBAN létezik és hatályos, és Béla függő meghívót adott MÁSNAK',
    belaInvite.status === 201 && typeof hannaTok === 'string'
    && basisAsOf({ store, basisId: belaBasisId, bookId: BOOK, validAt: now(), knownAt: now() }).in_effect === true,
    { basis: belaBasisId, invitee: 'hanna@r134.hu' });

  // A RÉGI BÍRÁLATI HATÁSKÖR: `alter_right`, a könyv indulási szabálya alatt.
  grantAdjudicationAuthority({
    store, subjectId: b.id, bookId: BOOK, operation: 'alter_right', clock: app.clock,
    basisId: `startup-rule:${BOOK}`,
  });
  const authP1 = executableRightAt({ store, subjectId: b.id, bookId: BOOK, operation: 'alter_right', nowIso: now() });
  step('(b2) POZITÍV KONTROLL: az ELSŐ időszakban a hatáskör VÉGREHAJTHATÓ',
    authP1.ok === true, { reason: authP1.reason, granted_at: authP1.granted_at });
  const authGrantedAt = authP1.granted_at;

  // MEGSZÜNTETÉS → ÚJRAHÍVÁS → SAJÁT ELFOGADÁS: új tagsági időszak.
  const bOffer = await revokeAndOffer(bela, b.id, 'admin', 'keszlet', 'bela-1');
  await tick(1000);
  const bRedeem = await bela.post('/api/invites/redeem', { token: bOffer.tok });
  const bP2 = period(b.id);
  step('(b3) Béla ÚJ tagsági időszakot kap (előfeltétel)',
    bRedeem.body.ok === true && bRedeem.body.outcome === 'regranted' && bP2 !== bP1,
    { p1: bP1, p2: bP2 });

  // (b4) A LELET: a RÉGI hatáskör az ÚJ időszakban NEM használható.
  const authP2 = executableRightAt({ store, subjectId: b.id, bookId: BOOK, operation: 'alter_right', nowIso: now() });
  step('(b4) a RÉGI bírálati hatáskör az ÚJ időszakban NEM végrehajtható, és az ok NEVEZETT',
    authP2.ok === false && authP2.reason === 'authority_other_period',
    { ok: authP2.ok, reason: authP2.reason, granted_at: authP2.granted_at ?? null });

  // (b5) A TÖRTÉNETI IGAZSÁG SÉRTETLEN: a régi időszak BELSEJÉRE a hatáskör MA IS igaz.
  const belsoP1 = authGrantedAt;
  const authHist = executableRightAt({ store, subjectId: b.id, bookId: BOOK, operation: 'alter_right', nowIso: belsoP1 });
  step('(b5) a RÉGI időszakra kérdezve a hatáskör MA IS fennállt — a történetet nem írtuk át',
    authHist.ok === true, { at: belsoP1, reason: authHist.reason });

  // (b6) POZITÍV KONTROLL: az ÚJ időszakhoz ÚJ, kifejezett megadás kell — és az MŰKÖDIK.
  grantAdjudicationAuthority({
    store, subjectId: b.id, bookId: BOOK, operation: 'alter_right', clock: app.clock,
    basisId: `startup-rule:${BOOK}`,
  });
  const authP2b = executableRightAt({ store, subjectId: b.id, bookId: BOOK, operation: 'alter_right', nowIso: now() });
  step('(b6) POZITÍV KONTROLL: ÚJ, kifejezett megadás után a hatáskör az ÚJ időszakban működik',
    authP2b.ok === true, { reason: authP2b.reason });

  // (b5b) F136-01 — A TÖRTÉNET AZ ÚJ MEGADÁS UTÁN IS UGYANAZ (megtalálta: chatgpt-v3, R136).
  //
  // A LELET. A (b5) tanú a (b6) ÚJ megadás ELŐTT futott, tehát a történeti kérdést az új megadás
  // UTÁN senki nem tette fel. Mérve ugyanezen a kódon: ELŐTTE `ok:true · stamped · 15`, UTÁNA
  // `ok:false · authority_not_yet_effective` — vagyis az ÚJ megadás MEGHAMISÍTOTTA a régi időszakra
  // adott választ. Ez a KUKA-122 alakja: az append-only napló PUSZTA LÉTE nem őrzi meg a történeti
  // feloldás igazságát, ha az olvasó a MAI vetületből indul.
  const authHistAfter = executableRightAt({ store, subjectId: b.id, bookId: BOOK, operation: 'alter_right', nowIso: belsoP1 });
  step('(b5b) F136-01: az ÚJ megadás UTÁN a RÉGI időszakra adott válasz VÁLTOZATLAN',
    authHistAfter.ok === true,
    { at: belsoP1, elotte: authHist.ok, utana: authHistAfter.ok, reason: authHistAfter.reason ?? null,
      elotte_binding: authHist.period_binding ?? null, utana_binding: authHistAfter.period_binding ?? null });

  // (b5c) …ÉS AZ ÚJ JOG MEGVONÁSA UTÁN IS VÁLTOZATLAN A MÚLT (az R136 kötelező tanújának zárása).
  // A megvonás a vetületen történik (termék-út ma nincs rá) — épp ezért jó tanú: a KÉSŐBBI jog
  // megvonása nem nyúlhat vissza a KORÁBBI időszakra.
  store.run('UPDATE adjudication_authority SET revoked_at = ? WHERE subject_id = ? AND book_id = ? AND operation = ?',
    now(), b.id, BOOK, 'alter_right');
  const authTodayRevoked = executableRightAt({ store, subjectId: b.id, bookId: BOOK, operation: 'alter_right', nowIso: now() });
  const authHistAfterRevoke = executableRightAt({ store, subjectId: b.id, bookId: BOOK, operation: 'alter_right', nowIso: belsoP1 });
  step('(b5c) F136-01: az ÚJ jog MEGVONÁSA után a MA zár, a RÉGI időszak válasza VÁLTOZATLAN',
    authTodayRevoked.ok === false && authHistAfterRevoke.ok === true,
    { ma: authTodayRevoked.ok, ma_reason: authTodayRevoked.reason, regi: authHistAfterRevoke.ok,
      regi_source: authHistAfterRevoke.authority_axis ?? null, superseded: authHistAfterRevoke.authority_superseded ?? null });

  // (b5d) KÜLÖN HATÁLY- ÉS TUDÁSIDŐ, AZONOS IDŐBÉLYEGGEL. A régi időszak hatályára kérdezünk, de
  // a RÉGI megadás ELŐTTI tudással: az akkor még nem ismert megadás NEM igazolhat jogot.
  const authOldKnowledge = executableRightAt({
    store, subjectId: b.id, bookId: BOOK, operation: 'alter_right', nowIso: belsoP1, knownAt: bootIso });
  const authSameStamp = executableRightAt({
    store, subjectId: b.id, bookId: BOOK, operation: 'alter_right', nowIso: belsoP1, knownAt: belsoP1 });
  step('(b5d) F136-01: a TUDÁS tengelye külön hat — a megadás előtti tudás NEM ad jogot, az azonos időbélyeg IGEN',
    authOldKnowledge.ok === false && authSameStamp.ok === true,
    { regi_tudas: authOldKnowledge.ok, regi_tudas_reason: authOldKnowledge.reason,
      azonos_idobelyeg: authSameStamp.ok });

  // (b5e) NEGATÍV KONTROLL — A VETÜLETBŐL TÖRTÉNETI FELOLDÁS HIBÁJÁT FOGJA MEG. Ez a lépés a
  // MEGHAMISÍTOTT választ írja le pozitívan: a MAI vetület `granted_at`-ja KÉSŐBBI, mint a
  // kérdezett régi időpont — tehát aki a vetületből oldaná fel a múltat, az NEM-et kapna. Ha a
  // kontroll-feltétel maga nem áll (a vetület nem későbbi), a lépés ELAKADT MÉRÉS, nem zöld.
  const projNow = store.get('SELECT granted_at, period_grant_event_id FROM adjudication_authority WHERE subject_id = ? AND book_id = ? AND operation = ?', b.id, BOOK, 'alter_right');
  const projLater = projNow && Date.parse(projNow.granted_at) > Date.parse(belsoP1);
  // A MAI TUDÁSSAL kérdezünk a RÉGI hatályra: így az ÚJ megadás MÁR ISMERT, tehát a felülírt
  // generáció ága az, ami válaszol. Ez a lelet ÉLES alakja — a `knownAt` nélküli kérdés a régi
  // megadás tudás-horizontján áll, és ott az új megadás még nem is létezik.
  const authHistTodayKnown = executableRightAt({
    store, subjectId: b.id, bookId: BOOK, operation: 'alter_right', nowIso: belsoP1, knownAt: now() });
  step('(b5e) F136-01 NEGATÍV KONTROLL: a vetület KÉSŐBBI megadást hordoz és MA ismert, a történeti válasz mégis a RÉGI megadást adja',
    projLater === true && authHistTodayKnown.ok === true
    && authHistTodayKnown.authority_superseded === true
    && authHistTodayKnown.authority_source === 'grant_log_superseded_generation'
    && String(authHistTodayKnown.granted_at) === String(belsoP1)
    && String(projNow.granted_at) !== String(authHistTodayKnown.granted_at),
    { vetulet_granted_at: projNow?.granted_at ?? null, kerdezett: belsoP1, vetulet_kesobbi: projLater,
      valasz_granted_at: authHistTodayKnown.granted_at ?? null, source: authHistTodayKnown.authority_source ?? null,
      felulirt_generacio: authHistTodayKnown.authority_superseded ?? null });

  // (b5f) A TÖRTÉNETI KOMPATIBILITÁSI ÁG CÉLZOTTAN: napló nélküli, CSAK a vetületben álló megadás
  // (R134 ELŐTTI alak). A naplót ÜRESRE állítjuk egy MÁSIK alanyon, és a válasznak ki kell
  // mondania, hogy a vetület az EGYETLEN tanú — nem elakadni, és nem is elhallgatni.
  const cili = new Client(base, 'cili@r134.hu');
  const cl = await joinAsMember(cili, 'cili@r134.hu', 'cili-titok-1', 'admin', 'keszlet');
  grantAdjudicationAuthority({
    store, subjectId: cl.id, bookId: BOOK, operation: 'alter_right', clock: app.clock,
    basisId: `startup-rule:${BOOK}`,
  });
  store.run('DELETE FROM adjudication_authority_grant WHERE subject_id = ?', cl.id);
  const authLegacy = executableRightAt({ store, subjectId: cl.id, bookId: BOOK, operation: 'alter_right', nowIso: now() });
  step('(b5f) F136-01: a napló nélküli, CSAK vetületben álló történeti megadás MŰKÖDIK, és a válasz KIMONDJA a tanút',
    authLegacy.ok === true && authLegacy.authority_axis === 'projection_only'
    && authLegacy.authority_source === 'projection_only_no_log',
    { ok: authLegacy.ok, axis: authLegacy.authority_axis ?? null, source: authLegacy.authority_source ?? null,
      binding: authLegacy.period_binding ?? null });

  // (b7) A RÉGI KIADÓ MÁSNAK KIADOTT FÜGGŐ MEGHÍVÓJA sem éled fel.
  const hannaId = await signUp(hanna, 'hanna@r134.hu', 'hanna-titok-1');
  await hanna.post('/api/invites/pending', { token: hannaTok });
  const cG = await counts();
  const hannaRedeem = await hanna.post('/api/invites/redeem', { token: hannaTok });
  const cH = await counts();
  step('(b7) a visszahívott kiadó RÉGI, MÁSNAK kiadott függő meghívója NEM ad tagságot',
    hannaRedeem.body.ok === false
    && membershipAsOf({ store, subjectId: hannaId, bookId: BOOK, validAt: now(), knownAt: now() }).effective === false
    && unchanged(cG, cH),
    { ok: hannaRedeem.body.ok, reason: hannaRedeem.body.reason ?? hannaRedeem.body.error, delta: diff(cG, cH) });
  step('(b8) …és a RÉGI delegált alap sem hatályos többé (a megvonás elvitte)',
    basisAsOf({ store, basisId: belaBasisId, bookId: BOOK, validAt: now(), knownAt: now() }).in_effect === false,
    { basis: belaBasisId, reason: basisAsOf({ store, basisId: belaBasisId, bookId: BOOK, validAt: now(), knownAt: now() }).reason });

  // (b9) POZITÍV ELLENPÁR AZ ÚJ IDŐSZAKBÓL: Béla ÚJ meghívója ÚJ alap alatt beváltható.
  const iren = new Client(base, 'iren@r134.hu');
  const belaInvite2 = await bela.post('/api/invites', { email: 'iren@r134.hu', role: 'user', scope: 'keszlet' });
  await iren.post('/api/invites/pending', { token: belaInvite2.body.token });
  const irenId = await signUp(iren, 'iren@r134.hu', 'iren-titok-1');
  const irenRedeem = await iren.post('/api/invites/redeem', { token: belaInvite2.body.token });
  step('(b9) POZITÍV ELLENPÁR: az ÚJ időszakban képzett alap alatt kiadott meghívó MŰKÖDIK',
    belaInvite2.status === 201 && irenRedeem.body.ok === true
    && membershipAsOf({ store, subjectId: irenId, bookId: BOOK, validAt: now(), knownAt: now() }).effective === true,
    { ok: irenRedeem.body.ok, outcome: irenRedeem.body.outcome });

  // (b7b) F136-02 — A RÉGI TOKEN AZ ÚJ ALAP UTÁN SEM ÉLED FEL (megtalálta: chatgpt-v3, R136).
  //
  // A LELET. A (b7) tanú az ÚJ alap kiadása ELŐTT futott. A (b9) viszont ÚJ delegált alapot képez a
  // MÁSODIK időszakban — és mérve ugyanezen a kódon ezután a KORÁBBAN HELYESEN ELUTASÍTOTT régi
  // token `ok:true · shape:membership_only · outcome:granted` választ adott. Az ok a forrásban: a
  // `delegationBasisId` alany × könyv azonosságú, tehát a JELEN IDEJŰ új alap IGAZOLJA a RÉGI
  // időszakból kiadott ajánlatot. Ez az A132-05 és az R132 §4 sérülése.
  const cHa = await counts();
  const hannaRedeem2 = await hanna.post('/api/invites/redeem', { token: hannaTok });
  const cHb = await counts();
  step('(b7b) F136-02: a RÉGI token az ÚJ alap és ÚJ meghívó MŰKÖDÉSE UTÁN sem ad tagságot',
    hannaRedeem2.body.ok === false
    && membershipAsOf({ store, subjectId: hannaId, bookId: BOOK, validAt: now(), knownAt: now() }).effective === false
    && unchanged(cHa, cHb),
    { ok: hannaRedeem2.body.ok, reason: hannaRedeem2.body.reason ?? hannaRedeem2.body.error,
      shape: hannaRedeem2.body.shape ?? null, outcome: hannaRedeem2.body.outcome ?? null, delta: diff(cHa, cHb) });

  // (b7c) …ÉS A TOKEN NEM FOGYOTT EL. A hibás tokenfogyasztás ugyanolyan kár, mint a hamis
  // tagságadás: a címzett elveszítené a jogos ajánlatát. A tanú: UGYANAZ a kérés UGYANAZT a
  // nevezett okot adja (nem `invite_already_redeemed`), és a tárolóban megint nulla új sor.
  const cHc = await counts();
  const hannaRedeem3 = await hanna.post('/api/invites/redeem', { token: hannaTok });
  const cHd = await counts();
  const hannaInviteRow = store.get('SELECT redeemed_at FROM invite WHERE token = ?', hannaTok);
  step('(b7c) F136-02: a régi token NEM fogyott el (az ok változatlan, nincs „már beváltva"), és nincs MÁS jog sem',
    hannaRedeem3.body.ok === false
    && String(hannaRedeem3.body.reason ?? hannaRedeem3.body.error) === String(hannaRedeem2.body.reason ?? hannaRedeem2.body.error)
    && (hannaInviteRow?.redeemed_at ?? null) === null
    && scopeGrantLiveAt({ store, subjectId: hannaId, bookId: BOOK, scope: 'keszlet', nowIso: now(), knownAt: now() }).allowed === false
    && unchanged(cHc, cHd),
    { reason: hannaRedeem3.body.reason ?? hannaRedeem3.body.error, redeemed_at: hannaInviteRow?.redeemed_at ?? null,
      mas_jog: scopeGrantLiveAt({ store, subjectId: hannaId, bookId: BOOK, scope: 'keszlet', nowIso: now(), knownAt: now() }).allowed,
      delta: diff(cHc, cHd) });

  // (b7d) A RÉGI ALAPRA HIVATKOZÓ MÁS JOG SEM ÉLED FEL — UGYANAZON AZ EREDET-KAPUN (R136 kikötése).
  //
  // A HATÓKÖR ELŐBB, MÉRVE. A delegálási alap korlátja KIZÁRÓLAG `invite_issue` — ezért a BÍRÁLATI
  // úton ugyanez az alap fogalmilag nem is használható (`outside_basis_operations` zár előbb). Ezt
  // MÉRTÜK, nem feltételeztük: a (b7d) első alakja épp ezen akadt el. Tehát a MAI termékben
  // `adjudicate`-et engedő, EREDETHEZ KÖTÖTT alap nem keletkezik — a bírálati úton az eredet-kapu
  // ELŐVIGYÁZATOSSÁG arra a résre, amit az R136 megnevezett, nem egy ma elérhető élő hiba. Ezt
  // KIMONDJUK, nem mossuk össze a két állítást (KUKA-033 · KUKA-216).
  //
  // A FIXTÚRA TÉNYE KIMONDOTT: a kaput a termék SAJÁT alap-íróján (`recordAuthorityBasis`)
  // állítjuk fel, két generációval és KÜLÖNBÖZŐ eredettel; HTTP-út ehhez nincs.
  const belaOrigins = store.all(
    'SELECT version, origin_grant_event_id FROM authority_basis WHERE basis_id = ? ORDER BY version', belaBasisId);
  // A MÉRÉSNEK TÁRGY KELL: a hatáskör-sor a RÉGI delegált generációra hivatkozik, és ÚGY kérdezünk.
  // (A sor nélküli kérdés `authority_not_established`-et ad — az a hatókörről semmit nem mond.)
  const belaOldVersion = belaOrigins.length ? belaOrigins[0].version : null;
  store.run(
    `INSERT INTO adjudication_authority (subject_id, book_id, operation, granted_at, revoked_at,
       basis_id, basis_version, period_grant_event_id)
     VALUES (?,?,?,?,NULL,?,?,?)
     ON CONFLICT(subject_id, book_id, operation) DO UPDATE SET
       granted_at = excluded.granted_at, revoked_at = NULL, basis_id = excluded.basis_id,
       basis_version = excluded.basis_version, period_grant_event_id = excluded.period_grant_event_id`,
    hannaId, BOOK, 'adjudicate', now(), belaBasisId, belaOldVersion, period(hannaId) ?? null);
  const delegOnlyInvite = executableRightAt({ store, subjectId: hannaId, bookId: BOOK, operation: 'adjudicate', nowIso: now() });
  const TANU = `tanu-eredet:${BOOK}`;
  const r1 = recordAuthorityBasis({
    store, basisId: TANU, bookId: BOOK, issuerSubject: b.id, effectiveAt: now(), recordedAt: now(),
    allowedOperations: ['adjudicate'], allowedRoles: ['user'], allowedScopes: ['keszlet'],
    evidenceRef: 'fixtura:R136-eredet-kapu-1', originGrantEventId: bP1,
  });
  store.run(
    `INSERT INTO adjudication_authority (subject_id, book_id, operation, granted_at, revoked_at,
       basis_id, basis_version, period_grant_event_id)
     VALUES (?,?,?,?,NULL,?,?,?)
     ON CONFLICT(subject_id, book_id, operation) DO UPDATE SET
       granted_at = excluded.granted_at, revoked_at = NULL, basis_id = excluded.basis_id,
       basis_version = excluded.basis_version, period_grant_event_id = excluded.period_grant_event_id`,
    hannaId, BOOK, 'adjudicate', now(), TANU, r1.version, period(hannaId) ?? null);
  const tanuBefore = executableRightAt({ store, subjectId: hannaId, bookId: BOOK, operation: 'adjudicate', nowIso: now() });
  step('(b7d) F136-02 ELŐFELTÉTEL: a delegálási alap a BÍRÁLATI úton fogalmilag sem használható, a tanú-alap alatt viszont a jog ÉL',
    delegOnlyInvite.ok === false && delegOnlyInvite.reason === 'outside_basis_operations'
    && r1.ok === true && tanuBefore.ok === true,
    { deleg_reason: delegOnlyInvite.reason, deleg_eredetek: belaOrigins.map((r) => `v${r.version}=${r.origin_grant_event_id ?? '—'}`).join(' · '),
      tanu_v1: r1.version, tanu_jog: tanuBefore.ok });

  // …és most UGYANAZ az alap ÚJ generációt kap MÁS eredettel: a RÁ HIVATKOZÓ jog ZÁR.
  const r2 = recordAuthorityBasis({
    store, basisId: TANU, bookId: BOOK, issuerSubject: b.id, effectiveAt: now(), recordedAt: now(),
    allowedOperations: ['adjudicate'], allowedRoles: ['user'], allowedScopes: ['keszlet'],
    evidenceRef: 'fixtura:R136-eredet-kapu-2', originGrantEventId: bP2,
  });
  const tanuAfter = executableRightAt({ store, subjectId: hannaId, bookId: BOOK, operation: 'adjudicate', nowIso: now() });
  step('(b7e) F136-02: a RÉGI generáció alatt adott MÁS jog sem éled fel az ÚJ, MÁS EREDETŰ generációtól',
    r2.ok === true && r2.version > r1.version
    && tanuAfter.ok === false && tanuAfter.reason === 'basis_origin_changed',
    { v1: r1.version, v1_eredet: bP1, v2: r2.version, v2_eredet: bP2,
      ok: tanuAfter.ok, reason: tanuAfter.reason });

  // …POZITÍV ELLENPÁR UGYANAZON A KAPUN: a MAI generáció alatt adott ugyanaz a jog MŰKÖDIK.
  // Enélkül a fenti zöld attól is jöhetne, hogy a kapu MINDENT zár (KUKA-122: a kapu nem fal).
  store.run('UPDATE adjudication_authority SET basis_version = ? WHERE subject_id = ? AND book_id = ? AND operation = ?',
    r2.version, hannaId, BOOK, 'adjudicate');
  const tanuRegranted = executableRightAt({ store, subjectId: hannaId, bookId: BOOK, operation: 'adjudicate', nowIso: now() });
  step('(b7e2) F136-02 POZITÍV ELLENPÁR: a MAI generáció alatt adott ugyanaz a jog VÉGREHAJTHATÓ',
    tanuRegranted.ok === true,
    { ok: tanuRegranted.ok, reason: tanuRegranted.reason ?? null, verzio: r2.version });

  // (b7f) MÁSODIK CIKLUS: a megszüntetés → újrahívás → elfogadás MÉGEGYSZER, és a MÁSODIK
  // időszakból kiadott ajánlat a HARMADIK időszakban sem éled fel. Egy ciklus zöldje nem
  // bizonyítja, hogy a kötés ciklus-független (az R136 kikötése: „Ismételd meg második ciklusban is").
  const jolan = new Client(base, 'jolan@r134.hu');
  const belaInvite3 = await bela.post('/api/invites', { email: 'jolan@r134.hu', role: 'user', scope: 'keszlet' });
  const jolanTok = belaInvite3.body.token;
  const jolanId = await signUp(jolan, 'jolan@r134.hu', 'jolan-titok-1');
  await jolan.post('/api/invites/pending', { token: jolanTok });
  const bOffer3 = await revokeAndOffer(bela, b.id, 'admin', 'keszlet', 'bela-3');
  await tick(1000);
  await bela.post('/api/invites/redeem', { token: bOffer3.tok });
  const bP3 = period(b.id);
  // …és Béla a HARMADIK időszakban ÚJ alapot képez (ÚJ meghívóval), ahogy a (b9) tette.
  const kata = new Client(base, 'kata@r134.hu');
  const belaInvite4 = await bela.post('/api/invites', { email: 'kata@r134.hu', role: 'user', scope: 'keszlet' });
  await kata.post('/api/invites/pending', { token: belaInvite4.body.token });
  const kataId = await signUp(kata, 'kata@r134.hu', 'kata-titok-1');
  const kataRedeem = await kata.post('/api/invites/redeem', { token: belaInvite4.body.token });
  const cHe = await counts();
  const jolanRedeem = await jolan.post('/api/invites/redeem', { token: jolanTok });
  const cHf = await counts();
  step('(b7f) F136-02 MÁSODIK CIKLUS: a 2. időszakból kiadott ajánlat a 3. időszakban sem éled fel, az ÚJ pedig MŰKÖDIK',
    bP3 !== bP2 && bP3 !== bP1
    && kataRedeem.body.ok === true
    && membershipAsOf({ store, subjectId: kataId, bookId: BOOK, validAt: now(), knownAt: now() }).effective === true
    && jolanRedeem.body.ok === false
    && membershipAsOf({ store, subjectId: jolanId, bookId: BOOK, validAt: now(), knownAt: now() }).effective === false
    && unchanged(cHe, cHf),
    { p1: bP1, p2: bP2, p3: bP3, uj_mukodik: kataRedeem.body.ok,
      regi_zar: jolanRedeem.body.ok, regi_reason: jolanRedeem.body.reason ?? jolanRedeem.body.error,
      delta: diff(cHe, cHf) });

  // (b10) ÉS A RÉGI ADATKÖRJOG SEM: a négy kör zárva, nevezett okkal (az R132 állítása, újramérve).
  step('(b10) a RÉGI adatkörjog sem éled fel az ÚJ időszakban',
    scopeGrantLiveAt({ store, subjectId: b.id, bookId: BOOK, scope: 'keszlet', nowIso: now(), knownAt: now() }).allowed === false,
    { reason: scopeGrantLiveAt({ store, subjectId: b.id, bookId: BOOK, scope: 'keszlet', nowIso: now(), knownAt: now() }).reason });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('C) F134-03 — AZ AJÁNLAT KIADÁSA ISMÉTLÉSBIZTOS (szerveres egyszeri hatás)');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  const kati = new Client(base, 'kati@r134.hu');
  const k = await joinAsMember(kati, 'kati@r134.hu', 'kati-titok-1', 'user', 'keszlet');
  await tick(1000);
  await anna.post('/api/members/revoke', { subject_id: k.id });
  await tick(1000);

  const cI = await counts();
  const k1 = await anna.post('/api/members/reinvite', { subject_id: k.id, role: 'user', scope: 'keszlet', operation_id: opId('kati-1') });
  const cJ = await counts();
  const k2 = await anna.post('/api/members/reinvite', { subject_id: k.id, role: 'user', scope: 'keszlet', operation_id: opId('kati-1') });
  const cK = await counts();
  step('(c1) az ELSŐ kiadás EGY ajánlatot ad (döntés + meghívó együtt)',
    k1.body.ok === true && cJ.membership_reentry === cI.membership_reentry + 1 && cJ.invite === cI.invite + 1,
    diff(cI, cJ));
  step('(c2) AZONOS azonosság + AZONOS tartalom: az ISMÉTLÉS ugyanazt az ajánlatot adja, ÚJ hatás nélkül',
    k2.body.ok === true && k2.body.replayed === true && k2.body.ref === k1.body.ref
    && k2.body.reentry_id === k1.body.reentry_id && unchanged(cJ, cK),
    { ref1: k1.body.ref, ref2: k2.body.ref, replayed: k2.body.replayed, delta: diff(cJ, cK) });

  const cL = await counts();
  const k3 = await anna.post('/api/members/reinvite', { subject_id: k.id, role: 'admin', scope: 'keszlet', operation_id: opId('kati-1') });
  const cM = await counts();
  step('(c3) AZONOS azonosság + ELTÉRŐ tartalom: NEVEZETT ÜTKÖZÉS, nulla új hatás',
    k3.body.ok === false && k3.body.reason === 'operation_identity_conflict' && unchanged(cL, cM),
    { reason: k3.body.reason, delta: diff(cL, cM) });

  const cN = await counts();
  const k4 = await anna.post('/api/members/reinvite', { subject_id: k.id, role: 'user', scope: 'keszlet', operation_id: opId('kati-2') });
  const cO = await counts();
  step('(c4) ÚJ, TUDATOS ajánlat KÜLÖN azonossággal továbbra is lehetséges',
    k4.body.ok === true && k4.body.replayed !== true && k4.body.ref !== k1.body.ref
    && cO.membership_reentry === cN.membership_reentry + 1,
    { ref: k4.body.ref, delta: diff(cN, cO) });

  // (c5) AZ AZONOSSÁG A SZEMÉLYHEZ, A FIÓKHOZ ÉS A LEZÁRT IDŐSZAKHOZ KÖTÖTT: ugyanaz a kulcs egy
  //      MÁS személyre is ÜTKÖZÉS, nem új ajánlat (a kulcs nem „szabad névtér").
  const lili = new Client(base, 'lili@r134.hu');
  const l = await joinAsMember(lili, 'lili@r134.hu', 'lili-titok-1', 'user', 'keszlet');
  await tick(1000);
  await anna.post('/api/members/revoke', { subject_id: l.id });
  await tick(1000);
  const cP = await counts();
  const l1 = await anna.post('/api/members/reinvite', { subject_id: l.id, role: 'user', scope: 'keszlet', operation_id: opId('kati-1') });
  const cQ = await counts();
  step('(c5) ugyanaz az azonosság MÁS személyre: nevezett ütközés, nulla új hatás',
    l1.body.ok === false && l1.body.reason === 'operation_identity_conflict' && unchanged(cP, cQ),
    { reason: l1.body.reason, delta: diff(cP, cQ) });

  // (c6) A MEGISMÉTELT AJÁNLAT NEM TESZ ÚJABB LEVELET A PRÓBAÜZENET-DOBOZBA.
  const mailsBefore = (await mails()).filter((x) => x.to === 'kati@r134.hu').length;
  await anna.post('/api/members/reinvite', { subject_id: k.id, role: 'user', scope: 'keszlet', operation_id: opId('kati-1') });
  const mailsAfter = (await mails()).filter((x) => x.to === 'kati@r134.hu').length;
  step('(c6) az ISMÉTLÉS nem gyárt újabb önálló meghívó-levelet',
    mailsAfter === mailsBefore, { elotte: mailsBefore, utana: mailsAfter });

  // (c7) ÉS AZ ISMÉTLÉS UTÁN IS CSAK EGY TAGSÁGI IDŐSZAK NYÍLIK (az ajánlat egy, a hatás egy).
  const katiTok = tokenFromLink(await linkFor('kati@r134.hu', 'Meghívás'));
  await tick(1000);
  const kRed = await kati.post('/api/invites/redeem', { token: katiTok });
  const perKati = membershipPeriodsOf({ store, subjectId: k.id, bookId: BOOK, knownAt: now() });
  step('(c7) a beváltás után EGY nyitott időszak van, a két ajánlatból sem lesz kettő',
    kRed.body.ok === true && perKati.periods.filter((x) => x.open === true).length === 1,
    { nyitott: perKati.periods.filter((x) => x.open === true).length, osszes: perKati.periods.length });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('D) A132-08 — TÁROLÁSI HIBA: NULLA SOROS ÉS KIVÉTELT DOBÓ, AZ AJÁNLATON ÉS A VÉGLEGESÍTÉSEN');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  const mari = new Client(base, 'mari@r134.hu');
  const m = await joinAsMember(mari, 'mari@r134.hu', 'mari-titok-1', 'user', 'keszlet');
  await tick(1000);
  await anna.post('/api/members/revoke', { subject_id: m.id });
  await tick(1000);

  // (d1) KIVÉTELT DOBÓ tárolóhiba az AJÁNLAT útján (a nulla soros ágat az R132 (g4) már mérte).
  store.db.exec('CREATE TEMP TRIGGER r134_reentry_abort BEFORE INSERT ON membership_reentry BEGIN SELECT RAISE(ABORT, \'r134\'); END');
  const cR = await counts();
  let d1err = null;
  const d1 = await anna.post('/api/members/reinvite', { subject_id: m.id, role: 'user', scope: 'keszlet', operation_id: opId('mari-1') }).catch((x) => { d1err = x; return { body: {} }; });
  const cS = await counts();
  store.db.exec('DROP TRIGGER r134_reentry_abort');
  step('(d1) KIVÉTELT DOBÓ tárolóhiba az ajánlat útján: se ajánlat, se meghívó, se pecsét, se egyszeri-hatás nyom',
    d1.body.ok !== true && unchanged(cR, cS), { delta: diff(cR, cS), status: d1.status });

  // (d2) ÉS AZ ISMÉTLÉS-NYOM SEM MARADT: a visszagörgetés után UGYANAZ az azonosság ÚJRA kiadható.
  const cT = await counts();
  const d2 = await anna.post('/api/members/reinvite', { subject_id: m.id, role: 'user', scope: 'keszlet', operation_id: opId('mari-1') });
  const cU = await counts();
  step('(d2) a bukott kiadás NEM foglalja le az azonosságot: ugyanaz a kulcs újra kiadható',
    d2.body.ok === true && d2.body.replayed !== true && cU.membership_reentry === cT.membership_reentry + 1,
    { ok: d2.body.ok, reason: d2.body.reason, delta: diff(cT, cU) });

  // (d3) A TOKENFOGYASZTÁS HIBÁJA: a véglegesítés NEM hagy új időszakot és átvitt korlátot.
  const mariTok = tokenFromLink(await linkFor('mari@r134.hu', 'Meghívás'));
  await tick(1000);
  store.db.exec('CREATE TEMP TRIGGER r134_token_ignore BEFORE UPDATE OF redeemed_at ON invite BEGIN SELECT RAISE(IGNORE); END');
  const cV = await counts();
  let d3 = { body: {} };
  try { d3 = await mari.post('/api/invites/redeem', { token: mariTok }); } catch (x) { d3 = { body: { ok: false, thrown: String(x) } }; }
  const cW = await counts();
  store.db.exec('DROP TRIGGER r134_token_ignore');
  step('(d3) a TOKENFOGYASZTÁS meghiúsulása: NINCS új tagsági időszak és NINCS átvitt korlát',
    d3.body.ok !== true && mState(m.id).effective === false && unchanged(cV, cW),
    { ok: d3.body.ok, effective: mState(m.id).effective, delta: diff(cV, cW) });

  // (d4) KIVÉTELT DOBÓ tárolóhiba a TAGSÁGADÁSON (a véglegesítés több-írásos ága).
  store.db.exec('CREATE TEMP TRIGGER r134_grant_abort BEFORE INSERT ON membership_grant BEGIN SELECT RAISE(ABORT, \'r134\'); END');
  const cX = await counts();
  let d4 = { body: {} };
  try { d4 = await mari.post('/api/invites/redeem', { token: mariTok }); } catch (x) { d4 = { body: { ok: false, thrown: String(x) } }; }
  const cY = await counts();
  store.db.exec('DROP TRIGGER r134_grant_abort');
  step('(d4) KIVÉTELT DOBÓ tárolóhiba a tagságadáson: a TELJES véglegesítés visszagördül',
    d4.body.ok !== true && mState(m.id).effective === false && unchanged(cX, cY),
    { ok: d4.body.ok, delta: diff(cX, cY) });

  // (d5) POZITÍV KONTROLL: a trigger nélkül UGYANAZ a beváltás végigmegy.
  await tick(1000);
  const d5 = await mari.post('/api/invites/redeem', { token: mariTok });
  step('(d5) POZITÍV KONTROLL: tárolóhiba nélkül ugyanaz a beváltás MŰKÖDIK',
    d5.body.ok === true && d5.body.outcome === 'regranted' && mState(m.id).effective === true,
    { outcome: d5.body.outcome });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('E) A132-06 — AZONOS IDŐBÉLYEG: MI ENGEDETT, MI NEVEZETTEN TILTOTT (két cikluson át)');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  const nora = new Client(base, 'nora@r134.hu');
  const n = await joinAsMember(nora, 'nora@r134.hu', 'nora-titok-1', 'user', 'keszlet');
  const nP1 = period(n.id);
  await tick(1000);
  await anna.post('/api/members/revoke', { subject_id: n.id });
  // AZ AZONOS IDŐBÉLYEG MÉRÉSE A MAGON, FIX ÓRÁVAL — ÉS EZT KIMONDJUK (KUKA-033). A HTTP-út órája
  // valódi idő + eltolás, tehát két egymás utáni kérés SOHA nem ad bájtra azonos pillanatot: az
  // „azonos időbélyeg" eset csak a mag szintjén állítható elő, a záró megvonás hatály-idejére
  // ÁLLÍTOTT órával. A szabály ott is lakik (`reinviteMember` → `reentry_not_after_revocation`).
  const nRev = store.get(
    'SELECT * FROM membership_revocation WHERE subject_id = ? AND book_id = ? ORDER BY id DESC LIMIT 1',
    n.id, BOOK);
  const cZ = await counts();
  const nSame = reinviteMember({
    store, clock: { now: () => nRev.effective_at }, deciderSubjectId: annaId, bookId: BOOK,
    targetSubjectId: n.id, offeredRole: 'user', scope: 'keszlet',
    token: 'r134-same-instant-token', expiresAt: new Date(Date.parse(nRev.effective_at) + 86400000).toISOString(),
    operationId: opId('nora-same'),
  });
  const cAA = await counts();
  step('(e1) AZONOS IDŐBÉLYEG a megvonással (magon mérve, fix órával): NEVEZETT tiltás, írásmentesen',
    nSame.ok === false && nSame.reason === 'reentry_not_after_revocation' && unchanged(cZ, cAA),
    { reason: nSame.reason, delta: diff(cZ, cAA) });
  // ÉS AMI ENGEDETT: egy pillanattal KÉSŐBB ugyanaz a kérés végigmegy.
  await tick(1);
  const nLater = await anna.post('/api/members/reinvite', { subject_id: n.id, role: 'user', scope: 'keszlet', operation_id: opId('nora-later') });
  const noraTok = tokenFromLink(await linkFor('nora@r134.hu', 'Meghívás'));
  await tick(1000);
  const nRed = await nora.post('/api/invites/redeem', { token: noraTok });
  const nP2 = period(n.id);
  step('(e2) …és ami ENGEDETT: egy pillanattal később ugyanaz a kérés ÚJ időszakot nyit',
    nLater.body.ok === true && nRed.body.ok === true && nP2 !== nP1,
    { p1: nP1, p2: nP2 });
  // MÁSODIK CIKLUS: a két tengely és az esemény-kötés UGYANÚGY áll.
  await tick(1000);
  await anna.post('/api/members/revoke', { subject_id: n.id });
  await tick(1000);
  const n2 = await anna.post('/api/members/reinvite', { subject_id: n.id, role: 'user', scope: 'keszlet', operation_id: opId('nora-2') });
  const noraTok2 = tokenFromLink(await linkFor('nora@r134.hu', 'Meghívás'));
  await tick(1000);
  const nRed2 = await nora.post('/api/invites/redeem', { token: noraTok2 });
  const nP3 = period(n.id);
  const perNora = membershipPeriodsOf({ store, subjectId: n.id, bookId: BOOK, knownAt: now() });
  step('(e3) a MÁSODIK ciklus is végigvihető, és HÁROM időszak áll a történetben',
    n2.body.ok === true && nRed2.body.ok === true && nP3 !== nP2 && nP3 !== nP1
    && perNora.periods.length === 3 && perNora.periods.filter((x) => x.open === true).length === 1,
    { p1: nP1, p2: nP2, p3: nP3, idoszakok: perNora.periods.length });
  // A RÉGI AJÁNLAT A KÉSŐBBI MEGSZŰNÉST NEM NYITJA ÚJRA (az esemény-kötés, nem a dátum).
  await tick(1000);
  await anna.post('/api/members/revoke', { subject_id: n.id });
  await tick(1000);
  const cBB = await counts();
  const nStale = await nora.post('/api/invites/redeem', { token: noraTok });
  const cCC = await counts();
  step('(e4) a KORÁBBI ciklus ajánlata a KÉSŐBBI megszűnést nem nyitja újra (esemény-kötés)',
    nStale.body.ok === false && mState(n.id).effective === false && unchanged(cBB, cCC),
    { reason: nStale.body.reason, delta: diff(cBB, cCC) });

  // (e5) ÉS AZ ESEMÉNY-KÖTÉS NEVEZETTEN MOND NEMET EGY BE NEM VÁLTOTT, KORÁBBI AJÁNLATRA IS: a
  //      beváltatlan ajánlat a KÉSŐBBI lezárásra `reentry_offer_period_mismatch`-et ad, tehát a
  //      kötés tényleg az ESEMÉNY-PÁRON áll, nem a token állapotán (a (e4) ott `már beváltott`
  //      okot mér — két külön tény, két külön tanú: KUKA-124/2).
  // KÉT ajánlat UGYANARRA a lezárásra, KÜLÖN azonossággal (ez megengedett — két tudatos döntés).
  // Az EGYIKET elfogadja, a MÁSIK beváltatlan marad; majd egy ÚJABB megszüntetés után próbáljuk be.
  const riA = await anna.post('/api/members/reinvite', { subject_id: n.id, role: 'user', scope: 'keszlet', operation_id: opId('nora-extra-a') });
  const tokA = tokenFromLink(await linkFor('nora@r134.hu', 'Meghívás'));
  const riB = await anna.post('/api/members/reinvite', { subject_id: n.id, role: 'user', scope: 'keszlet', operation_id: opId('nora-extra-b') });
  const tokB = tokenFromLink(await linkFor('nora@r134.hu', 'Meghívás'));
  await tick(1000);
  const nAccept = await nora.post('/api/invites/redeem', { token: tokA });
  await tick(1000);
  await anna.post('/api/members/revoke', { subject_id: n.id });
  await tick(1000);
  const cDD = await counts();
  const nStale2 = await nora.post('/api/invites/redeem', { token: tokB });
  const cEE = await counts();
  step('(e5) a BEVÁLTATLAN, KORÁBBI lezárásra kiadott ajánlat NEVEZETT időszak-eltérést ad, írásmentesen',
    riA.body.ok === true && riB.body.ok === true && tokA !== tokB && nAccept.body.ok === true
    && nStale2.body.ok === false && nStale2.body.reason === 'reentry_offer_period_mismatch'
    && mState(n.id).effective === false && unchanged(cDD, cEE),
    { reason: nStale2.body.reason, delta: diff(cDD, cEE) });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('F) A132-09/10 — AZ ÚJ NYUGTÁK ÉS ELUTASÍTÁSOK MINDEN BEKAPCSOLT NYELVEN');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // AMIT EZ MÉR, ÉS AMIT NEM: a KULCS MEGLÉTE mindhárom bekapcsolt nyelven (a kulcs hiánya gépi
  // jelet mutatna a képernyőn). A teljes FELÜLETI út tanúja a böngésző-próba (`tests/e2e/`), nem ez.
  const langs = enabledLanguages().map((l) => l.code);
  for (const key of ['reinviteReplayed']) {
    const hol = langs.filter((lc) => {
      const d = dictFor(lc);
      const t = ((d.TPL) || {})[key] ?? ((d.UI) || {})[key] ?? ((d.STATE) || {})[key];
      return typeof t === 'string' && t.trim().length > 0;
    });
    step(`(f) a "${key}" szöveg MINDEN bekapcsolt nyelven megvan`, hol.length === langs.length, { megvan: hol, kell: langs });
  }
  for (const key of ['authority_other_period', 'operation_identity_conflict', 'operation_id_required',
    'reentry_blocked_ban', 'reentry_blocked_open_review_circle']) {
    const hol = langs.filter((lc) => {
      const t = ((dictFor(lc).REASON) || {})[key];
      return typeof t === 'string' && t.trim().length > 0;
    });
    step(`(f) a "${key}" INDOK-szöveg minden bekapcsolt nyelven megvan`, hol.length === langs.length, { megvan: hol, kell: langs });
  }

} finally {
  await app.close();
  if (existsSync(dbPath)) rmSync(dbPath, { force: true });
}

const pass = results.filter((x) => x.pass).length;
console.log(`\n${'='.repeat(94)}`);
console.log(`findings_r134: ${pass}/${results.length} PASS`);
if (pass !== results.length) {
  console.log('\nBUKOTT:');
  for (const x of results.filter((y) => !y.pass)) console.log(`  · [${x.section}] ${x.name}`);
}
process.exit(pass === results.length ? 0 : 1);
