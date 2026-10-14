// v3app/findings_r144.mjs — AZ R144 CSOMAG ÉLŐ BATTÉRIÁJA (CMD-VS-300-002-002 R144).
//
// MIÉRT KÜLÖN BATTÉRIA. Az R144 három MÉRT leletet nevezett meg az R143-as munkámban, és mindhárom
// olyan helyen volt, ahol a saját őröm ZÖLD maradt — tehát a zöldje a hibáról semmit nem mondott:
//   · F144-01 — a lefedési mérés HAMIS POZITÍVJAI: a közös bemutató az ELSŐ egyező horgonyból
//     minősített (menü- és megnyitó-horgonyon is), a művelet-kötés kötőjeles RÉSZ-SZÓRA illesztett
//     (ezért a tagság-megszüntetés kötésének ELTÁVOLÍTÁSA zöld maradt), és a nyitott hiányok
//     plafonja ÖNMAGÁT növelte;
//   · F144-02 — az oldaltérkép mérése a NYELVCSOMAGBÓL kérte a menü-szerkezetet, ahol az nem
//     létezik: 17 oldalból 0 menütalálat, és a `sitemap: false` soha nem került a hiányok közé;
//   · F144-03 — a modell IGAZOLT témaválasztásából nem lett MŰVELET: a kínai meghívási kérdésre a
//     válasz helyes volt, a gomb viszont elmaradt (`actions: []`).
//
// AMIT MÉR:
//   A) F144-01 — a bemutató- és művelet-kötés EXPLICIT, és a negatív kontrollok PIROSAK;
//   B) F144-02 — a menü-szerkezet a TÉNYLEGES forrásból jön, és az elérhetetlenség HIÁNY;
//   C) F144-03 — a hat nevezett eset: a TÉMA és a MŰVELET is mérve, joghiánnyal és tiltott
//      modell-azonosítóval együtt;
//   D) a TELJESSÉG és a REGRESSZIÓ két külön verdikt — a második nem teheti zölddé az elsőt.
//
// KIMONDVA: a szolgáltatói ág HELYI CSONKKAL mérve — ez NEM élő AI-eredmény. Ebben a konténerben
// nincs engedélyezett szolgáltató (`npm run kapcsolat:ai`), tehát élő nyelvértésre vonatkozó
// állítás ebből NEM következik (KUKA-089 · KUKA-127).
//
// Kilépési kód: 0 = minden állítás PASS · 1 = MÉRT hibát talált · 2 = a mérés elakadt.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { startServer } from './server.mjs';
import { offersFor, allowedToursFor } from './assistant/policy.mjs';
import { FEATURES, TOURS } from './knowledge/features.mjs';
import * as COV from './knowledge/coverage.mjs';
import { dictFor } from './public/i18n/dict.mjs';
import * as TEXTS from './public/texts.mjs';
import { sitemapPages } from './public/help.mjs';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { artifactPath } = require('../contracts/artifactNaming.js');
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

const results = [];
let section = '';
function part(name) { section = name; console.log(`\n── ${name} ──`); }
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
    return { status: res.status, body: ct.includes('application/json') ? await res.json() : await res.text() };
  }

  get(p) { return this.call('GET', p); }

  post(p, b) { return this.call('POST', p, b ?? {}); }
}

const stub = { next: '', lastBody: null, calls: 0 };
const stubServer = createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    stub.calls += 1;
    try { stub.lastBody = JSON.parse(raw); } catch { stub.lastBody = null; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: stub.next } }], usage: { prompt_tokens: 50, completion_tokens: 10 } }));
  });
});
await new Promise((ok) => stubServer.listen(0, '127.0.0.1', ok));
process.env.VS_AI_PROVIDER = 'openai_compatible';
process.env.VS_AI_API_KEY = 'csonk-kulcs-nem-titok';
process.env.VS_AI_BASE_URL = `http://127.0.0.1:${stubServer.address().port}`;
process.env.VS_AI_MODEL = 'csonk';

const dbPath = resolve(ROOT, artifactPath({ area: 'tmp', kind: 'v3app_r144_leletek', ext: 'sqlite', version: VERSION }));
const app = await startServer({ port: 0, dbPath });
const base = `http://127.0.0.1:${app.port}`;
console.log(`R144 battéria: ${base}  ·  helyi szolgáltatói csonk: ${process.env.VS_AI_BASE_URL}  ·  tároló: ${dbPath}`);

try {
  const KINAI = '我如何邀请某人加入我的公司？';
  const inv = FEATURES.find((f) => f.id === 'invite.send');
  const stk = FEATURES.find((f) => f.id === 'data.stock');
  const BLOKK = (id, v, sec) => `[[VS-BLOCKS: ${id}@${v}#${sec}]] [[VS-LANG: hu]]`;

  async function person(email, { lang = 'hu' } = {}) {
    const c = new Client(base);
    await c.post('/api/register', { email, password: 'proba-jelszo-2026', lang });
    const S = dictFor(lang).SRV;
    const m = ((await c.get('/dev/mailbox')).body.mails || [])
      .filter((x) => x.to === email && String(x.subject).startsWith(S.mailVerifySubject)).pop();
    if (!m) throw new Error(`nem jött megerősítő levél: ${email}`);
    await c.get(new URL(m.link).pathname + new URL(m.link).search);
    await c.post('/api/login', { email, password: 'proba-jelszo-2026' });
    return c;
  }

  const anna = await person('anna@r144.proba');
  const ws = await anna.post('/api/workspaces', { name: 'R144 Próba Kft.', business: { tax_id: '12345678-1-44' } });
  if (!ws.body || ws.body.ok !== true) throw new Error(`a cégtér nem jött létre: ${JSON.stringify(ws.body).slice(0, 180)}`);

  // ── A) F144-01 — A KÖTÉS EXPLICIT, ÉS A NEGATÍV KONTROLLOK PIROSAK ─────────────────────────────
  part('A) F144-01 — a lefedési kötés EXPLICIT (hamis pozitív nincs)');

  const hamisak = ['shell.assistant', 'members.revoke', 'auth.verify'];
  for (const id of hamisak) {
    const f = FEATURES.find((x) => x.id === id);
    const r = COV.tourCoverage(f, { tours: TOURS });
    const valodi = r.how === 'own' || (r.how === 'shared' && typeof r.proof === 'string');
    step(`(a1/${id}) a minősítés NEM az első egyező horgonyból jön`,
      r.how === 'none' || valodi,
      { how: r.how, proof: r.proof ?? null, tour: r.tour ?? null });
  }
  const mrev = COV.tourCoverage(FEATURES.find((x) => x.id === 'members.revoke'), { tours: TOURS });
  step('(a2) a `members.revoke` a reentry VALÓDI lépésével fedett (task: member.revoked)',
    mrev.how === 'shared' && mrev.proof === 'task:member.revoked' && mrev.tour === 'tour.reentry',
    { how: mrev.how, proof: mrev.proof, steps: mrev.steps });
  /**
   * (a3) A `shell.assistant` FEDÉSE A DEKLARÁCIÓBÓL JÖN, NEM EGY HORGONY-EGYEZÉSBŐL.
   *
   * ELÖRÖKLÖTT, NEM JELENTETT PIROS — ÉS AMIT A MÉRÉS MONDOTT (R186 §5, saját lelet). Ez a sor
   * eddig azt állította, hogy a funkció NEM fedett („a hiány NEVEZETT"), és a mai fejen PIROS volt:
   * a feloldó `how: 'own'`-t ad. Megmértem a két fejen — a HANDOVER fején (`167a70a`) is ugyanez a
   * sor bukott, tehát NEM ennek a csomagnak a következménye: az R166 §3 megépítette a
   * `tour.assistant` útmutatót (a pótolt tizenkettő egyike), és a funkció DEKLARÁLJA is
   * (`tour: 'tour.assistant'`, négy lépés, „forrásból ellenőrzött", nulla probléma). Az ÁLLÍTÁS
   * avult el, nem a rendszer romlott el (`KUKA-050`: a szöveg a valóságot követi).
   *
   * AMIT EZ A SOR VALÓBAN ŐRZ, ÉS AMI MEGMARAD: hogy a minősítés a funkció SAJÁT, deklarált
   * útmutatójából jöjjön — ne egy véletlen horgony-egyezésből (a súgógomb kiemeléséből). Ezért a
   * mérce ma a DEKLARÁCIÓT kéri: `own` + a megnevezett útmutató. A horgony-egyezés tilalmát az
   * (a1) sor külön is méri, mind a három funkción.
   */
  const sass = COV.tourCoverage(FEATURES.find((x) => x.id === 'shell.assistant'), { tours: TOURS });
  step('(a3) a `shell.assistant` fedése a SAJÁT, deklarált útmutatójából jön — nem a súgógomb horgony-egyezéséből (RÉGEN: `none`-t állított, mert a `tour.assistant` még nem létezett)',
    sass.how === 'own' && sass.tour === 'tour.assistant'
    && Array.isArray(sass.steps) && sass.steps.length > 0 && sass.problems.length === 0,
    { how: sass.how, tour: sass.tour ?? null, steps: sass.steps, problems: sass.problems });

  step('(a4) ELLENPÁR: MENÜPONTRA mutató, task nélküli lépés nem fed',
    (() => {
      const r = COV.tourCoverage({ id: 'p', tour: null, entry: 'nav-members', anchors: ['nav-members'],
        surface: 'nincs-ilyen', shared_tour: { tour: 'tour.invite', steps: ['s1'] } }, { tours: TOURS });
      return r.how === 'declared_invalid' && r.problems.length > 0;
    })(), 'declared_invalid + nevezett indok');
  step('(a5) ELLENPÁR: NEM LÉTEZŐ deklarált lépés is NEVEZETTEN piros',
    (() => {
      const r = COV.tourCoverage({ id: 'p', tour: null, entry: 'x', anchors: ['x'], surface: 'x',
        shared_tour: { tour: 'tour.invite', steps: ['s99'] } }, { tours: TOURS });
      return r.how === 'declared_invalid' && r.problems.some((x) => /nem létezik/.test(x));
    })(), 'a hiányzó lépés megnevezve');

  const nelkule = FEATURES.filter((f) => f.id !== 'members.revoke');
  const rev = COV.actionCoverage({ kind: 'action', id: 'revoke' }, { features: nelkule });
  step('(a6) A SPEC NEGATÍV KONTROLLJA: a tagság-megszüntetés kötése nélkül a `revoke` HIÁNY — '
    + 'a meghívó- és hatáskör-visszavonás NEM bizonyít más feladatot',
    rev.gaps.length === 1 && rev.features.length === 0, { gaps: rev.gaps.length, fedi: rev.features });
  const revVan = COV.actionCoverage({ kind: 'action', id: 'revoke' }, { features: FEATURES });
  step('(a6/2) …a kötéssel viszont FEDETT, és a fedő funkció megnevezve',
    revVan.gaps.length === 0 && revVan.features.includes('members.revoke'), { fedi: revVan.features });
  step('(a7) a TISZTÁN TECHNIKAI művelet kimondva kivett, INDOKKAL',
    (() => { const t = COV.actionCoverage({ kind: 'action', id: 'panel-close' }, { features: FEATURES });
      return t.technical === true && typeof t.why === 'string' && t.why.length > 10; })(),
    'panel-close · nav-close');
  step('(a8) a plafon NEM önmagát növelő: az alapvonal FIX, nevesített verzióhoz kötött',
    typeof COV.GAP_BASELINE.version === 'string' && COV.GAP_BASELINE.version.length > 3
    && COV.GAP_BASELINE.keys.length > 0 && COV.OPEN_GAPS_CEILING === undefined,
    { verzio: COV.GAP_BASELINE.version, alapvonal: COV.GAP_BASELINE.keys.length });

  // ── B) F144-02 — AZ OLDALTÉRKÉP A TÉNYLEGES FORRÁSBÓL ─────────────────────────────────────────
  part('B) F144-02 — a menü-szerkezet a TÉNYLEGES forrásból');
  const hu = dictFor('hu');
  step('(b1) a nyelvcsomag NEM tartalmaz menü-szerkezetet (ezért volt 0 menütalálat)',
    hu.NAV_GROUPS === undefined && hu.NAV_ADMIN === undefined && hu.NAV_PERSONAL === undefined,
    'hu.NAV_* = undefined — a csomagban csak a csoport-FELIRATOK állnak (NAV)');
  step('(b2) a TÉNYLEGES forrás (texts.mjs) viszont tartalmazza',
    Array.isArray(TEXTS.NAV_GROUPS) && TEXTS.NAV_GROUPS.length > 0 && !!TEXTS.NAV_ADMIN,
    { csoport: TEXTS.NAV_GROUPS.length });
  const smp = { all: [...new Set([...sitemapPages({ personal: false }).all, ...sitemapPages({ personal: true }).all])] };
  const popJo = COV.pagesFrom({ pageLabels: hu.PAGE, navGroups: TEXTS.NAV_GROUPS, navAdmin: TEXTS.NAV_ADMIN, navPersonal: TEXTS.NAV_PERSONAL, sitemap: smp, uiSources: [readFileSync(join(ROOT, 'v3app/public/app.js'), 'utf8')] });
  const popRossz = COV.pagesFrom({ pageLabels: hu.PAGE, navGroups: hu.NAV_GROUPS, navAdmin: hu.NAV_ADMIN, navPersonal: hu.NAV_PERSONAL, sitemap: smp, uiSources: [] });
  step('(b3) a HIBÁS bemenettel 0 menütalálat — a jó bemenettel nem (a lelet reprodukálva)',
    popRossz.filter((p) => p.menu !== null).length === 0 && popJo.filter((p) => p.menu !== null).length >= 13,
    { rossz: popRossz.filter((p) => p.menu !== null).length, jo: popJo.filter((p) => p.menu !== null).length });
  step('(b4) MINDEN oldal elérhető valamilyen VALÓS úton (menü · oldaltérkép · belépő)',
    popJo.every((p) => p.menu !== null || p.sitemap === true || p.entry === true),
    { nem_elerheto: popJo.filter((p) => !(p.menu !== null || p.sitemap === true || p.entry === true)).map((p) => p.id) });
  step('(b5) a `new` oldal a FŐMENÜBEN nincs, mégis elérhető — a valós út számít',
    (() => { const n = popJo.find((p) => p.id === 'new'); return n && n.menu === null && (n.sitemap === true || n.entry === true); })(),
    JSON.stringify(popJo.find((p) => p.id === 'new')));
  step('(b6) ELLENPÁR: az ELÉRHETETLENSÉG mostantól NEVEZETT HIÁNY (eddig néma volt)',
    (() => { const r = COV.pageCoverage({ kind: 'page', id: 'nincs-ilyen', label: 'x', menu: null, group: null, sitemap: false, entry: false }, { features: FEATURES, tours: TOURS });
      return r.gaps.some((g) => /nem érhető el/.test(g)); })(), 'a hiány szövege megnevezi');
  step('(b7) ELLENPÁR: a NEM MÉRT oldaltérkép nem „hiányzik", hanem ELAKADT MÉRÉS',
    (() => { const r = COV.pageCoverage({ kind: 'page', id: 'stock', label: 'x', menu: 'business', group: null, sitemap: null, entry: false }, { features: FEATURES, tours: TOURS });
      return r.gaps.some((g) => /ELAKADT MÉRÉS/.test(g)); })(), 'a két állapot nincs összemosva');

  // ── C) F144-03 — A MODELL TÉMÁJÁBÓL MŰVELET LESZ ─────────────────────────────────────────────
  part('C) F144-03 — a TÉMA és a MŰVELET is mérve, hat nevezett eseten');
  const akcio = (r) => (r.body.actions || []);
  const vanElokeszites = (r) => akcio(r).some((a) => a.id === 'prepare.invite');
  const vanTura = (r) => akcio(r).some((a) => a.kind === 'tour' && a.tour === 'tour.invite');

  stub.next = BLOKK('invite.send', inv.version, 'purpose');
  const c1 = await anna.post('/api/assistant/ask', { question: 'Hogyan hívok meg valakit a céghez?', lang: 'hu' });
  step('(c1) HU PARAFRÁZIS: a téma `invite.send`, ÉS van elérhető művelet + bemutató',
    (c1.body.sources || []).some((x) => x.feature === 'invite.send') && vanElokeszites(c1) && vanTura(c1),
    { kind: c1.body.answer_kind, actions: akcio(c1).map((a) => a.id || a.tour) });

  const c2 = await anna.post('/api/assistant/ask', { question: KINAI, lang: 'hu' });
  step('(c2) NEM LATIN kérdés: ugyanaz a téma, ÉS ugyanaz a művelet (ez volt az F144-03 lelete)',
    (c2.body.sources || []).some((x) => x.feature === 'invite.send') && vanElokeszites(c2) && vanTura(c2),
    { kind: c2.body.answer_kind, miert: c2.body.model_need && c2.body.model_need.why, actions: akcio(c2).map((a) => a.id || a.tour) });

  const c3 = await anna.post('/api/assistant/ask', {
    question: 'És ezt hogyan csinálom?', lang: 'hu',
    history_text: 'K: Hogyan hívok meg valakit?\n---\nV: A Felhasználók fülön.',
  });
  step('(c3) ELŐZMÉNYES FOLYTATÁS: a modell témájából itt is lesz művelet',
    (c3.body.sources || []).some((x) => x.feature === 'invite.send') && vanElokeszites(c3),
    { kind: c3.body.answer_kind, miert: c3.body.model_need && c3.body.model_need.why, actions: akcio(c3).map((a) => a.id || a.tour) });

  // ROSSZ HELYI TALÁLAT: a helyi kereső a készletre talál, a modell a MEGHÍVÁST választja.
  stub.next = BLOKK('invite.send', inv.version, 'purpose');
  const c4 = await anna.post('/api/assistant/ask', { question: 'Hol látom a készletadatokat?', lang: 'hu' });
  step('(c4) ROSSZ HELYI TALÁLAT: a modell IGAZOLT témájához is jár művelet (nem csak a helyihez)',
    (c4.body.sources || []).some((x) => x.feature === 'invite.send') && vanElokeszites(c4),
    { kind: c4.body.answer_kind, sources: (c4.body.sources || []).map((x) => x.feature), actions: akcio(c4).map((a) => a.id || a.tour) });

  // JOGHIÁNY: a meghívás ADMIN-művelet. A céghez meghívott, NEM admin tag ugyanerre a témára
  // magyarázatot kaphat, ADMIN-műveletet viszont SOHA.
  await anna.post('/api/invites', { email: 'bela@r144.proba', role: 'user', scope: 'keszlet' });
  /**
   * A TOKEN A LEVÉLBEN VAN, NEM A VÁLASZBAN (saját lelet a próba írása közben). Az első alakom a
   * válasz-törzsből próbálta kiolvasni, ezért a beváltás ELMARADT, Béla a SAJÁT személyes terében
   * maradt — és az állítás ZÖLD lett, de NEM a joghiány miatt, hanem mert a személyes térben a
   * fiók-kezelés amúgy is tiltott. Egy hamis okból zöld állítás nem bizonyít (KUKA-127: a mérés
   * harmadik szava). Ezért a próba most KIOLVASSA a tokent, BEVÁLTJA, ÁTVÁLT a cégre, és a
   * mért szerepet KI IS ÍRJA — ha nem `user`, az ELAKADT MÉRÉS, nem zöld.
   */
  const bela = await person('bela@r144.proba');
  const invMail = ((await bela.get('/dev/mailbox')).body.mails || [])
    .filter((x) => x.to === 'bela@r144.proba' && /invite=/.test(String(x.link || ''))).pop();
  if (!invMail) throw new Error('a meghívó levél nem jött meg — a joghiány-eset nem állítható fel');
  const tok = new URL(invMail.link).searchParams.get('invite');
  await bela.post('/api/invites/pending', { token: tok });
  const redeem = await bela.post('/api/invites/redeem', { token: tok });
  if (!redeem.body || redeem.body.ok !== true) throw new Error(`a beváltás nem sikerült: ${JSON.stringify(redeem.body).slice(0, 160)}`);
  await bela.post('/api/session/workspace', { book_id: redeem.body.book_id });
  const belaMe = (await bela.get('/api/me')).body;
  if (belaMe.current_role !== 'user' || belaMe.current_personal === true) {
    step('(c5) a joghiány-eset alapsokasága felállt', false,
      `ELAKADT MÉRÉS: Béla szerepe „${belaMe.current_role}", személyes tér: ${belaMe.current_personal} — nem nem-admin CÉGES tagként mérnénk`);
  } else {
    stub.next = BLOKK('invite.send', inv.version, 'purpose');
    const c5 = await bela.post('/api/assistant/ask', { question: 'Hogyan hívok meg valakit?', lang: 'hu' });
    step('(c5) JOGHIÁNY: a NEM admin CÉGES tag ADMIN-műveletet NEM kap — a friss szerveroldali jog dönt',
      !akcio(c5).some((a) => a.id === 'prepare.invite'),
      { szerep: belaMe.current_role, szemelyes: belaMe.current_personal, kind: c5.body.answer_kind, actions: akcio(c5).map((a) => a.id || a.tour) });
    /**
     * SAJÁT LELET A PRÓBA ÍRÁSA KÖZBEN (AST-09): a nem admin tag EDDIG SEMMIT nem kapott erre a
     * kérdésre — se választ, se okot. A hallgatás zsákutca (KUKA-201). Mostantól a VALÓDI OKOT
     * adjuk vissza, SAJÁT fajtával (`access`), hogy a mérés ne mossa össze a tudás-válasszal.
     */
    step('(c5/2) …és a hallgatás helyett a VALÓDI OKOT kapja, saját válasz-fajtával',
      c5.body.ok === true && c5.body.answer_kind === 'access'
      && /fiókkezelői/.test(String(c5.body.answer))
      && (c5.body.blocked || []).some((b) => b.feature === 'invite.send' && b.why === 'admin_required')
      && (c5.body.actions || []).length === 0,
      { kind: c5.body.answer_kind, valasz: String(c5.body.answer || '').slice(0, 60), blocked: c5.body.blocked });
  }

  // MEG NEM ENGEDETT MODELL-AZONOSÍTÓ: a modell olyan funkciót hivatkozik, amit NEM adtunk át.
  stub.next = '[[VS-BLOCKS: nincs.ilyen.funkcio@9.9.9#purpose]] [[VS-LANG: hu]]';
  const c6 = await anna.post('/api/assistant/ask', { question: 'Hogyan hívok meg valakit?', lang: 'hu' });
  step('(c6) MEG NEM ENGEDETT MODELL-AZONOSÍTÓ: nevezetten kiesik, és NEM lesz belőle művelet',
    c6.body.answer_kind !== 'model_blocks'
    && !!c6.body.model_discarded && /model_unknown_source|model_no_blocks|model_stale_source/.test(String(c6.body.model_discarded.reason))
    && !akcio(c6).some((a) => a.feature === 'nincs.ilyen.funkcio'),
    { kind: c6.body.answer_kind, kiesett: c6.body.model_discarded && c6.body.model_discarded.reason });

  step('(c7) a modell SOHA nem ad művelet-azonosítót: a felajánlás a FUNKCIÓ deklarációjából jön',
    (() => {
      const r = offersFor({ rows: [{ id: 'invite.send' }], dictionary: dictFor('hu'),
        ctx: { signed_in: true, book_id: 'b', role: 'admin', personal: false, plan: 'starter', member: true } });
      const kitalalt = offersFor({ rows: [{ id: 'nincs.ilyen' }], dictionary: dictFor('hu'),
        ctx: { signed_in: true, book_id: 'b', role: 'admin', personal: false, plan: 'starter', member: true } });
      return r.length > 0 && kitalalt.length === 0;
    })(), 'ismeretlen azonosítóra NULLA felajánlás');
  step('(c8) a bemutató-felajánlás is KAPUN megy át (allowedToursFor) — eddig nem',
    (() => {
      const ctxNincsDemo = { signed_in: true, book_id: 'b', role: 'admin', personal: false, plan: 'starter', member: true };
      const demoTura = Object.values(TOURS).find((t) => t.requires_demo === true);
      const eng = allowedToursFor(ctxNincsDemo);
      return !!demoTura && !eng.includes(demoTura.id);
    })(), 'a demó-kötött bemutató nem kínálódik fel demó nélkül');

  // ── D) A TELJESSÉG ÉS A REGRESSZIÓ KÉT KÜLÖN VERDIKT ─────────────────────────────────────────
  part('D) A teljesség és a regresszió nem ugyanaz a kérdés');
  const serverSrc = readFileSync(join(ROOT, 'v3app/server.mjs'), 'utf8');
  const uiSrc = ['v3app/public/app.js', 'v3app/public/help.mjs', 'v3app/public/chat.mjs', 'v3app/public/tour.mjs']
    .map((f) => readFileSync(join(ROOT, f), 'utf8'));
  const pop = COV.populationFrom({ serverSource: serverSrc, uiSources: uiSrc, pageLabels: hu.PAGE,
    navGroups: TEXTS.NAV_GROUPS, navAdmin: TEXTS.NAV_ADMIN, navPersonal: TEXTS.NAV_PERSONAL, sitemap: smp });
  const inven = COV.inventory({ population: pop, features: FEATURES, tours: TOURS });
  step('(d1) a TELJESSÉG a hiányok SZÁMÁT mondja ki, kivétel-lista nélkül',
    Array.isArray(inven.gapKeys), { hiany: inven.gapKeys.length });
  step('(d2) a REGRESSZIÓ külön kérdés: van-e ÚJ hiány a FIX alapvonalhoz képest',
    Array.isArray(inven.unexpected) && Array.isArray(inven.dead),
    { uj: inven.unexpected.length, halott: inven.dead.length });
  step('(d3) ELLENPÁR: a regresszió-irány zöldje NEM teszi zölddé a teljességet',
    (() => { const v = COV.gapVerdict(['page:valami'], ['page:valami']);
      return v.unexpected.length === 0 && v.dead.length === 0 && v.gapKeys.length === 1; })(),
    'ismert hiány mellett a regresszió zöld, a hiány MEGVAN');

  const fail = results.filter((r) => !r.pass);
  console.log(`\nR144 battéria: ${results.length - fail.length}/${results.length} PASS${fail.length ? ` — ${fail.length} FAIL` : ''}`);
  console.log('A SZOLGÁLTATÓI ÁG HELYI CSONKKAL mérve — élő nyelvértésre vonatkozó állítás ebből NEM következik.');
  if (fail.length) { console.log('\nFAIL-ek:'); fail.forEach((f) => console.log(` - [${f.section}] ${f.name}`)); }
  await app.close(); stubServer.close();
  process.exit(fail.length ? 1 : 0);
} catch (e) {
  console.error('\nELAKADT MÉRÉS (a battéria bukott el; a rendszerről ez NEM mond semmit):', e && e.message);
  try { await app.close(); } catch { /* már zárva */ }
  try { stubServer.close(); } catch { /* már zárva */ }
  process.exit(2);
}
