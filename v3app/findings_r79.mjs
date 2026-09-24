// v3app/findings_r79.mjs — AZ R79 KÉT LELETÉNEK CÉLZOTT PIROS/ZÖLD PRÓBÁI (CMD-VS-300-002-002 R79).
//
// A KÉT LELET (mindkettő a külső ellenőrző fél — chatgpt-v3 — mérése):
//
//   F79-01  „A HIÁNYZÓ MEZŐ NEM EGYEZÉS" CSAK ÁLLÍTÁS VOLT. A kliens `servedMatches`-e CSAK akkor
//           hasonlított, ha a mező megvolt; két hiányzó `served_*` mezővel IGAZAT adott. Hibabeviteles
//           próbájukban a valódi, sikeres készlet-válaszból eltávolították mindkét mezőt, és a
//           változatlan lap kirajzolta a „KIADVA" képet.
//
//   F79-02  A RÉGI JOGADÓ GOMB UGYANABBAN A CÉGBEN MÁS FIÓK NEVÉBEN ÍRT. A másik lap kilépett,
//           BÉLÁVAL lépett be, és UGYANAZT a céget választotta; a közös süti frissült. Anna régi
//           lapjának gombja lefutott (`expected_book_id` egyezett, `expected_subject_id` nem volt),
//           és az írás BÉLA nevében, az ő naplózott cselekvőjével történt meg.
//
// AMIT EZ A BATTÉRIA MÉR — és amit NEM: minden tiltás mellett ott a POZITÍV ELLENPÁR (KUKA-051), és
// minden „nem írt" állítás a TÁROLÓBÓL, második kapcsolaton mérve áll (KUKA-054). A megerősítő mező
// SOHA nem ad jogot: erre külön eset van (jogosulatlan fiók helyes mezőkkel).
import { rmSync, existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { startServer } from './server.mjs';
import { openStoreAt } from '../v3ref/store.mjs';
// A KLIENS SZABÁLYA UGYANEZ A FÁJL — nem másolat, nem újraírás (KUKA-039).
import { contextBindingVerdict, servedMatches, CONTEXT_RESPONSE_FIELDS } from './public/contextBinding.mjs';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { artifactPath } = require('../contracts/artifactNaming.js');
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

const results = [];
let section = '';
const head = (s) => { section = s; console.log(`\n── ${s} ${'─'.repeat(Math.max(0, 78 - s.length))}`); };
function step(name, cond, detail) {
  const pass = !!cond;
  results.push({ section, name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
  return pass;
}

class Client {
  constructor(base) { this.base = base; this.cookie = null; }
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
  /** MÁSIK LAP, UGYANAZ A SÜTI — a közös munkamenet a lelet lényege. */
  tab() { const c = new Client(this.base); c.cookie = this.cookie; return c; }
}

const dbPath = resolve(ROOT, artifactPath({ area: 'tmp', kind: 'v3app_r79_leletek', ext: 'sqlite', version: VERSION }));
const app = await startServer({ port: 0, dbPath });
const base = `http://127.0.0.1:${app.port}`;
console.log(`R79 lelet-battéria: ${base}  · tároló: ${dbPath}`);

const db = openStoreAt(dbPath, { timeoutMs: 5000 });
const count = (sql, ...p) => { const r = db.get(sql, ...p); return r ? Number(Object.values(r)[0]) : 0; };
const businessRows = () => ({
  membership: count('SELECT COUNT(*) FROM membership'),
  grant: count('SELECT COUNT(*) FROM membership_grant'),
  basis: count('SELECT COUNT(*) FROM authority_basis'),
  scope_grant: count('SELECT COUNT(*) FROM scope_grant'),
  revocation: count('SELECT COUNT(*) FROM membership_revocation'),
  entitlement: count('SELECT plan FROM entitlement_profile') ? 1 : 1,
  command: count('SELECT COUNT(*) FROM command'),
});
const sameRows = (a, b) => JSON.stringify(a) === JSON.stringify(b);

try {
  const mailsOf = async (c) => (await c.get('/dev/mailbox')).body.mails;
  const verifyLinkOf = async (c, email) => {
    const m = (await mailsOf(c)).find((x) => x.to === email && x.subject.includes('Erősítsd meg'));
    if (!m) return null;
    const u = new URL(m.link); return u.pathname + u.search;
  };
  async function person(email, password = 'proba-jelszo-2026') {
    const c = new Client(base);
    await c.post('/api/register', { email, password });
    await c.get(await verifyLinkOf(c, email));
    const login = await c.post('/api/login', { email, password });
    return { c, email, password, subjectId: login.body.subject_id };
  }
  const inviteLinkOf = async (c, email) => {
    const m = (await mailsOf(c)).filter((x) => x.to === email && x.subject.startsWith('Meghívás')).pop();
    return m ? new URL(m.link).searchParams.get('invite') : null;
  };

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('F79-01 — A HIÁNYZÓ MEZŐ NEM EGYEZÉS (KTX-03, a KLIENS SZABÁLYÁN mérve)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  // A TÁBLA UGYANAZT A FÜGGVÉNYT hívja, amit a lap futtat (`public/contextBinding.js`) — tehát nem
  // egy másolatot mérünk. A soronkénti elvárás KIMONDOTT, nem a kód visszaolvasása.
  const view = { book: 'ws_C', subject: 'sub_anna' };
  const okBody = { ok: true, result: { qty: '12' }, served_book_id: 'ws_C', served_subject_id: 'sub_anna' };
  const table = [
    ['mindkét mező egyezik → KÖTÖTT', okBody, true, null],
    ['a KÖNYV-mező hiányzik → nem kötött', { ok: true, result: { qty: '12' }, served_subject_id: 'sub_anna' }, false, 'missing_context_field'],
    ['az ALANY-mező hiányzik → nem kötött', { ok: true, result: { qty: '12' }, served_book_id: 'ws_C' }, false, 'missing_context_field'],
    ['MINDKETTŐ hiányzik (az EREDETI lelet) → nem kötött', { ok: true, result: { qty: '12' } }, false, 'missing_context_field'],
    ['más ALANY → nem kötött', { ...okBody, served_subject_id: 'sub_bela' }, false, 'other_subject'],
    ['más KÖNYV → nem kötött', { ...okBody, served_book_id: 'ws_D' }, false, 'other_book'],
    ['hibás TÍPUS (szám) → nem kötött', { ...okBody, served_book_id: 12 }, false, 'invalid_context_field'],
    ['hibás TÍPUS (objektum) → nem kötött', { ...okBody, served_subject_id: { id: 'sub_anna' } }, false, 'invalid_context_field'],
    ['`undefined` érték (nem csak hiányzó kulcs) → nem kötött', { ...okBody, served_book_id: undefined }, false, 'missing_context_field'],
    ['NEVEZETT nemleges: nincs belépve → nem kötött, de nevezett ok', { ok: false, reason: 'login_required', status: 401 }, false, 'login_required'],
    ['NEVEZETT nemleges: kontextus-eltérés → nem kötött, nevezett ok', { ok: false, reason: 'context_mismatch', served_book_id: 'ws_D', served_subject_id: 'sub_anna' }, false, 'context_mismatch'],
    ['ÜZLETI elutasítás a MAI nézetben (jog-kapu) → KÖTÖTT (kirajzolható mondat)', { ok: false, refused_by: 'right', reason: 'not_available', served_book_id: 'ws_C', served_subject_id: 'sub_anna' }, true, null],
    ['üres válasz (nem objektum) → nem kötött', null, false, 'invalid_response'],
  ];
  for (const [name, body, expectedBound, expectedWhy] of table) {
    const v = contextBindingVerdict(body, view);
    step(`(a) ${name}`, v.bound === expectedBound && (expectedBound || v.why === expectedWhy), { bound: v.bound, why: v.why });
  }
  // A `null` KÖNYV KIMONDOTT ÁLLAPOT (nincs kiválasztott kör) — és csak `null`-lal egyezik.
  step('(a/2) a `null` könyv kimondott állapot: null↔null KÖTÖTT, null↔szöveg NEM',
    servedMatches({ ok: true, served_book_id: null, served_subject_id: 'sub_anna' }, { book: null, subject: 'sub_anna' }) === true
    && servedMatches({ ok: true, served_book_id: null, served_subject_id: 'sub_anna' }, { book: 'ws_C', subject: 'sub_anna' }) === false);
  step('(a/3) a kötelező mezők listája a SZERZŐDÉSBŐL jön, nem a hívó emlékezetéből',
    Array.isArray(CONTEXT_RESPONSE_FIELDS) && CONTEXT_RESPONSE_FIELDS.length === 2
    && CONTEXT_RESPONSE_FIELDS.includes('served_book_id') && CONTEXT_RESPONSE_FIELDS.includes('served_subject_id'),
    CONTEXT_RESPONSE_FIELDS);

  // A VALÓDI VÁLASZOK IS HORDOZZÁK a két mezőt — különben a szigorítás a saját felületünket tiltaná ki.
  const anna = await person('anna@pelda.hu');
  const C = (await anna.c.post('/api/workspaces', { name: 'C KOZOS', plan: 'pro' })).body;
  const D = (await anna.c.post('/api/workspaces', { name: 'D MASIK', plan: 'starter' })).body;
  await anna.c.post('/api/session/workspace', { book_id: C.book_id });
  const realResponses = {
    stock: (await anna.c.get('/api/data/stock')).body,
    price: (await anna.c.get('/api/data/price')).body,
    members: (await anna.c.get('/api/members')).body,
  };
  step('(b) a VALÓDI olvasó válaszok mindegyike hordozza a két mezőt (a szigorítás nem tiltja ki a saját felületünket)',
    Object.values(realResponses).every((r) => typeof r.served_book_id === 'string' && typeof r.served_subject_id === 'string'),
    Object.fromEntries(Object.entries(realResponses).map(([k, r]) => [k, `${r.served_book_id}/${r.served_subject_id}`])));
  const annaView = { book: C.book_id, subject: anna.subjectId };
  step('(b/2) …és a mai nézethez KÖTÖTTEK (ugyanazzal a szabállyal mérve)',
    Object.values(realResponses).every((r) => servedMatches(r, annaView)));

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('F79-02 — A RÉGI GOMB NEM ÍRHAT MÁS FIÓK NEVÉBEN (KTX-03, azonos cégen belüli fiókváltás)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  // A KÜLSŐ FÉL FORGATÓKÖNYVE, LÉPÉSRŐL LÉPÉSRE — közös süti, azonos cég.
  const bela = await person('bela@pelda.hu');
  const cili = await person('cili@pelda.hu');
  const invB = await anna.c.post('/api/invites', { email: bela.email, role: 'admin', scope: 'keszlet' });
  step('(elő) Anna ADMIN szereppel, keszlet-plafonnal hívja Bélát a közös C körbe', invB.status === 201, invB.body.reason ?? 'ok');
  const tokenB = await inviteLinkOf(anna.c, bela.email);
  await bela.c.post('/api/invites/redeem', { token: tokenB });
  const invC = await anna.c.post('/api/invites', { email: cili.email, role: 'user', scope: 'keszlet' });
  const tokenC = await inviteLinkOf(anna.c, cili.email);
  await cili.c.post('/api/invites/redeem', { token: tokenC });
  step('(elő/2) Cili USER szerepet kap ugyanabban a körben (lesz kit megvonni és kinek adatkört adni)',
    invC.status === 201 && count('SELECT COUNT(*) FROM membership WHERE book_id = ?', C.book_id) === 3);

  // A KÖZÖS SÜTI: Anna lapja és a „másik lap" ugyanaz a munkamenet.
  const regiLap = anna.c;                 // Anna RÉGI lapja — a gombok itt születtek
  const masikLap = regiLap.tab();         // a MÁSIK lap: kilép, Bélával belép, és UGYANEZT a céget választja
  await masikLap.post('/api/logout', {});
  await masikLap.post('/api/login', { email: bela.email, password: bela.password });
  await masikLap.post('/api/session/workspace', { book_id: C.book_id });
  regiLap.cookie = masikLap.cookie;       // a böngésző SÜTIJE közös — a régi lap ezt már nem tudja
  const meNow = (await regiLap.get('/api/me')).body;
  step('(a) a közös munkamenet MOST Béláé, ugyanabban a C körben (a régi lap ezt nem tudja)',
    meNow.subject_id === bela.subjectId && meNow.current_book_id === C.book_id,
    { alany: meNow.subject_id === bela.subjectId ? 'Béla' : meNow.subject_id, könyv: meNow.current_book_id === C.book_id ? 'C' : meNow.current_book_id });

  // AZ EREDETI LELET: Anna régi gombja Cilinek adatkört adna — Anna nevében.
  const elotte = businessRows();
  const regiGomb = await regiLap.post('/api/members/scope', {
    subject_id: cili.subjectId, scope: 'keszlet',
    expected_book_id: C.book_id, expected_subject_id: anna.subjectId,
  });
  const utana = businessRows();
  step('(b) A LELET MAGA: a régi nézet gombja NEVEZETTEN elakad (409 context_mismatch), nem 200',
    regiGomb.status === 409 && regiGomb.body.reason === 'context_mismatch',
    { status: regiGomb.status, reason: regiGomb.body.reason, refused_by: regiGomb.body.refused_by });
  step('(b/2) …a válasz MEGNEVEZI a várt és a TÉNYLEGES nézetet is',
    regiGomb.body.expected_subject_id === anna.subjectId && regiGomb.body.served_subject_id === bela.subjectId
    && regiGomb.body.served_book_id === C.book_id && regiGomb.body.wrote === false);
  step('(b/3) …és a TÁROLÓBAN egyetlen üzleti sor sem mozdult (adatkör-adás nem született)',
    sameRows(elotte, utana) && count('SELECT COUNT(*) FROM scope_grant WHERE book_id = ? AND subject_id = ?', C.book_id, cili.subjectId) === 0,
    { elotte, utana });

  // POZITÍV ELLENPÁR: a MAI nézet (Béla) ugyanezt a műveletet elvégzi.
  const jo = await regiLap.post('/api/members/scope', {
    subject_id: cili.subjectId, scope: 'keszlet',
    expected_book_id: C.book_id, expected_subject_id: bela.subjectId,
  });
  step('(c) POZITÍV ELLENPÁR: a MAI nézettel (Béla) ugyanaz a művelet végbemegy',
    jo.status === 200 && jo.body.ok === true
    && count('SELECT COUNT(*) FROM scope_grant WHERE book_id = ? AND subject_id = ?', C.book_id, cili.subjectId) === 1,
    { status: jo.status, granted_by: jo.body.granted_by ?? null });
  step('(c/2) …és a SIKERES írás-válasz is kimondja a kiszolgált nézetet (a kliens EGY szabállyal dönt)',
    servedMatches(jo.body, { book: C.book_id, subject: bela.subjectId }) === true,
    { served: `${jo.body.served_book_id}/${jo.body.served_subject_id}` });

  // ── A MÁTRIX: NÉGY MŰVELET × NÉGY KONTEXTUS-ÁLLAPOT ─────────────────────────────────────────
  // A negatív esetekben SEMMI üzleti sor nem keletkezhet; a pozitív pár (mai nézet) működik.
  const masikSubject = anna.subjectId;    // a régi nézet alanya (már nem a munkamenet alanya)
  const muveletek = [
    ['adatkör-adás', (confirm) => regiLap.post('/api/members/scope', { subject_id: cili.subjectId, scope: 'arak', ...confirm })],
    ['megvonás', (confirm) => regiLap.post('/api/members/revoke', { subject_id: cili.subjectId, ...confirm })],
    ['meghívás', (confirm) => regiLap.post('/api/invites', { email: 'dani@pelda.hu', role: 'user', scope: 'keszlet', ...confirm })],
    ['terv-változtatás', (confirm) => regiLap.post('/api/workspaces/plan', { plan: 'starter', ...confirm })],
  ];
  const allapotok = [
    ['ALANY változik, könyv marad', { expected_book_id: C.book_id, expected_subject_id: masikSubject }],
    ['KÖNYV változik, alany marad', { expected_book_id: D.book_id, expected_subject_id: bela.subjectId }],
    ['MINDKETTŐ változik', { expected_book_id: D.book_id, expected_subject_id: masikSubject }],
  ];
  for (const [muvelet, hivas] of muveletek) {
    for (const [allapot, confirm] of allapotok) {
      const before = businessRows();
      const r = await hivas(confirm);
      const after = businessRows();
      step(`(d) ${muvelet} — ${allapot} → 409 context_mismatch, ÍRÁS NÉLKÜL`,
        r.status === 409 && r.body.reason === 'context_mismatch' && r.body.wrote === false && sameRows(before, after),
        { status: r.status, reason: r.body.reason, sorok: sameRows(before, after) ? 'változatlan' : `${JSON.stringify(before)} → ${JSON.stringify(after)}` });
    }
  }
  // NEGYEDIK ÁLLAPOT: egyik sem változik — a művelet MŰKÖDIK (a védelem nem általános tiltás).
  const maiNezet = { expected_book_id: C.book_id, expected_subject_id: bela.subjectId };
  const pozitiv = [
    ['adatkör-adás', await regiLap.post('/api/members/scope', { subject_id: cili.subjectId, scope: 'arak', ...maiNezet }), 200],
    ['meghívás', await regiLap.post('/api/invites', { email: 'dani@pelda.hu', role: 'user', scope: 'keszlet', ...maiNezet }), 201],
    ['terv-változtatás', await regiLap.post('/api/workspaces/plan', { plan: 'starter', ...maiNezet }), 200],
  ];
  for (const [nev, r, varhato] of pozitiv) {
    step(`(e) POZITÍV PÁR: ${nev} a MAI nézetben (egyik sem változik) → ${varhato}`,
      r.status === varhato && (r.body.ok === true || r.body.ok === undefined),
      { status: r.status, reason: r.body.reason ?? null });
  }
  // A MEGVONÁS KÜLÖN PÁRT KAP — ÉS OLYAN SZEREPLŐVEL, AKINEK TÉNYLEGESEN VAN RÁ HATÁSKÖRE.
  // MÉRVE: Béla admin, de a megvonási hatásköre nincs megalapozva (`authority_not_established`) —
  // egy ilyen 403 NEM bizonyítana kontextusvédelmet (a külső fél kikötése). Ezért a megvonás párját
  // ANNA saját munkamenetében mérjük: ő a kör indítója, nála a hatáskör megalapozott.
  const annaUj = new Client(base);
  await annaUj.post('/api/login', { email: anna.email, password: anna.password });
  await annaUj.post('/api/session/workspace', { book_id: C.book_id });
  const elotteMegvonas = businessRows();
  const idegenMegvonas = await annaUj.post('/api/members/revoke', {
    subject_id: cili.subjectId, expected_book_id: C.book_id, expected_subject_id: bela.subjectId,
  });
  step('(e/2) MEGVONÁS — a hatáskörrel RENDELKEZŐ szereplő is elakad IDEGEN nézet alanyával (409, írás nélkül)',
    idegenMegvonas.status === 409 && idegenMegvonas.body.reason === 'context_mismatch'
    && sameRows(elotteMegvonas, businessRows()),
    { status: idegenMegvonas.status, reason: idegenMegvonas.body.reason });
  const megvonas = await annaUj.post('/api/members/revoke', {
    subject_id: cili.subjectId, expected_book_id: C.book_id, expected_subject_id: anna.subjectId,
  });
  step('(e/3) POZITÍV PÁR: UGYANAZ a szereplő a SAJÁT nézetében megvon — tehát a 409 nem más okból jött',
    megvonas.status === 200 && megvonas.body.ok === true
    && count('SELECT COUNT(*) FROM membership_revocation WHERE book_id = ? AND subject_id = ?', C.book_id, cili.subjectId) === 1,
    { status: megvonas.status, reason: megvonas.body.reason ?? null });

  // A MEZŐ NEM AD JOGOT: jogosulatlan fiók HELYES megerősítő mezőkkel sem ír.
  const ciliLap = cili.c;
  await ciliLap.post('/api/session/workspace', { book_id: C.book_id }).catch(() => null);
  const ciliMe = (await ciliLap.get('/api/me')).body;
  const beforeCili = businessRows();
  const ciliProbal = await ciliLap.post('/api/members/scope', {
    subject_id: cili.subjectId, scope: 'arak',
    expected_book_id: ciliMe.current_book_id ?? C.book_id, expected_subject_id: cili.subjectId,
  });
  const afterCili = businessRows();
  step('(f) A MEGERŐSÍTŐ MEZŐ NEM JOG: a megvont/jogosulatlan fiók HELYES mezőkkel is elakad, írás nélkül',
    ciliProbal.status !== 200 && ciliProbal.body.ok !== true && sameRows(beforeCili, afterCili),
    { status: ciliProbal.status, reason: ciliProbal.body.reason });
  step('(f/2) …és az elutasítás NEM kontextus-ürüggyel megy (a jog-kapu mondja ki)',
    ciliProbal.body.reason !== 'context_mismatch', ciliProbal.body.reason);

  // A RÉGI (R77-es) KÖTÉS MEGMARAD: a könyv-eltérés az OLVASÁSON is elakad.
  const olvasas = await regiLap.get(`/api/data/stock?expected_book_id=${D.book_id}`);
  step('(g) az R77-es olvasás-kötés változatlanul áll (idegen könyvre 409, adat nélkül)',
    olvasas.status === 409 && olvasas.body.reason === 'context_mismatch' && olvasas.body.result === null);
  const olvasasAlany = await regiLap.get(`/api/data/stock?expected_subject_id=${masikSubject}`);
  step('(g/2) …és az OLVASÁST is elakasztja a RÉGI nézet alanya (azonos könyv mellett is)',
    olvasasAlany.status === 409 && olvasasAlany.body.reason === 'context_mismatch',
    { status: olvasasAlany.status, reason: olvasasAlany.body.reason });

  // A SÉMA DEKLARÁLJA a mezőt — nem „extra mező, amit a kezelő véletlenül elfogad" (HTP-01).
  const { ENDPOINT_SCHEMAS, CONTEXT_SUBJECT_FIELD, HTP_CONTRACT } = await import('./httpSchema.mjs');
  const irok = ['POST /api/members/scope', 'POST /api/members/revoke', 'POST /api/invites', 'POST /api/workspaces/plan'];
  step('(h) MIND A NÉGY állapotváltoztató végpont DEKLARÁLJA az alany-megerősítést (séma, nem véletlen)',
    irok.every((k) => ENDPOINT_SCHEMAS[k] && ENDPOINT_SCHEMAS[k].body.fields[CONTEXT_SUBJECT_FIELD]
      && ENDPOINT_SCHEMAS[k].body.fields[CONTEXT_SUBJECT_FIELD].confirm_only === true),
    irok);
  step('(h/2) …és a szerződés a MEGERŐSÍTŐ mezők közt tartja számon (nem üzleti bemenet)',
    HTP_CONTRACT.confirm_only_fields.includes(CONTEXT_SUBJECT_FIELD), HTP_CONTRACT.confirm_only_fields);
  const idegenMezo = await regiLap.post('/api/members/scope', { subject_id: cili.subjectId, scope: 'arak', actor: bela.subjectId, ...maiNezet });
  step('(h/3) …és az idegen mező az állapotváltoztató végponton változatlanul ELUTASÍTÁS (R75/HTP-01)',
    idegenMezo.status === 400 && idegenMezo.body.reason === 'unknown_field', idegenMezo.body.field ?? idegenMezo.body.reason);
} finally {
  db.close();
  await app.close();
  for (const suffix of ['', '-wal', '-shm']) { if (existsSync(dbPath + suffix)) rmSync(dbPath + suffix, { force: true }); }
}

const pass = results.filter((x) => x.pass).length;
console.log(`\nR79 lelet-battéria: ${pass}/${results.length} PASS${pass === results.length ? '' : ' · ' + (results.length - pass) + ' FAIL'}`);
if (pass !== results.length) {
  for (const x of results.filter((y) => !y.pass)) console.log(`  BUKOTT: [${x.section}] ${x.name}`);
  process.exit(1);
}
