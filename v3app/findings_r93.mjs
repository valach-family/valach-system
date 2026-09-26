// v3app/findings_r93.mjs — AZ R93 BEFEJEZŐ CSOMAG ÉLŐ BATTÉRIÁJA (CMD-VS-300-002-002 R93).
//
// MIÉRT KÜLÖN BATTÉRIA. Az R91-es battéria a FORMAI válasz-szerződést mérte (AST-04: jelölt forrás ·
// egyező verzió · deklarált nyelv · hossz). A külső ellenőrző fél az R93-ban megmutatta, hogy ez a
// kapu egy TARTALMILAG HAMIS mondatot is átenged, ha a jelölői rendben vannak — vagyis az érvényes
// azonosító DÍSZÍTÉS volt, nem bizonyíték (KUKA-235). Az R93 döntése: a megjelenő választ a SZERVER
// állítja össze ellenőrzött, lokalizált tudás-blokkokból (AST-05), a modell pedig VÁLOGAT.
//
// AMIT MÉR:
//   A) AST-05 — A BLOKK-VÁLASZ (F93-03): az ELFOGADOTT út is (nem csak a tiltás!), a külső fél
//      ELLENPÉLDÁJA reprodukálva, és az öt nevezett elutasítási ok;
//   B) A NYELV A BLOKK-ÚTON (F93-02/03): a kiadott szöveg a KÉRT nyelv csomagjából jön, karakterre;
//   C) A BEMUTATÓ ÉLETCIKLUSA (F93-01): a hordozható elszámolás a lezárt futásból, egy rajzolóval;
//   D) A MEGNYITHATÓ FORRÁS (F93-03): a válasz forrásai a kérő tudás-indexében állnak.
//
// KIMONDVA: a szolgáltatói ág itt is HELYI CSONKKAL mérve — ez NEM élő AI-eredmény. A csonk pont
// arra való, hogy a SAJÁT szerződésünket mérje: mit fogad el és mit utasít el a szerver.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { startServer } from './server.mjs';
import { LIMITS } from './assistant/policy.mjs';
import { dictFor } from './public/i18n/dict.mjs';
import { carrySnapshot, runSummary, finishRun, finishedHtml, newTourRun, taskDone } from './public/tour.mjs';

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
    try { stub.lastBody = JSON.parse(raw); } catch { stub.lastBody = { raw }; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: stub.next } }], usage: { prompt_tokens: 100, completion_tokens: 20 } }));
  });
});
await new Promise((r) => stubServer.listen(0, '127.0.0.1', r));
const stubPort = stubServer.address().port;

const dbPath = resolve(ROOT, artifactPath({ area: 'tmp', kind: 'v3app_r93_leletek', ext: 'sqlite', version: VERSION }));
const app = await startServer({ port: 0, dbPath });
const base = `http://127.0.0.1:${app.port}`;
console.log(`R93 befejező battéria: ${base}  ·  helyi szolgáltatói csonk: http://127.0.0.1:${stubPort}  ·  tároló: ${dbPath}`);

try {
  const q = (obj) => `?${new URLSearchParams(obj).toString()}`;
  const mailsOf = async (c) => (await c.get('/dev/mailbox')).body.mails;
  async function person(email, { lang = 'hu', password = 'proba-jelszo-2026' } = {}) {
    const c = new Client(base);
    await c.post('/api/register', { email, password, lang });
    const S = dictFor(lang).SRV;
    const m = (await mailsOf(c)).filter((x) => x.to === email && String(x.subject).startsWith(S.mailVerifySubject))[0];
    await c.get(new URL(m.link).pathname + new URL(m.link).search);
    await c.post('/api/login', { email, password });
    return { c, email };
  }

  const anna = await person('anna.r93@pelda.hu');
  const ws = await anna.c.post('/api/workspaces', { name: 'R93 Kft', business: { jurisdiction: 'HU', tax_id: '12345678-1-42' } });
  await anna.c.post('/api/session/workspace', { book_id: ws.body.book_id });

  process.env.VS_AI_PROVIDER = 'openai_compatible';
  process.env.VS_AI_API_KEY = 'proba-kulcs-nem-valodi';
  process.env.VS_AI_BASE_URL = `http://127.0.0.1:${stubPort}`;

  const invDe = (await anna.c.get('/api/assistant/knowledge' + q({ lang: 'de', feature: 'invite.send' }))).body.feature;
  const invHu = (await anna.c.get('/api/assistant/knowledge' + q({ lang: 'hu', feature: 'invite.send' }))).body.feature;
  const KB_DE = dictFor('de').KB['invite.send'];
  const KB_HU = dictFor('hu').KB['invite.send'];
  const DE_Q = 'Wie lade ich jemanden ein?';

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('A) AST-05 — A VÁLASZ ELLENŐRZÖTT TUDÁS-BLOKKOKBÓL ÉPÜL (F93-03)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  // (a) AZ ELFOGADOTT ÚT — a külső fél kikötése: „ne minden modellválasz kikapcsolása legyen javítás".
  stub.next = `[[VS-BLOCKS: invite.send@${invDe.version}#purpose]] [[VS-LANG: de]]`;
  const okOne = await anna.c.post('/api/assistant/ask', { question: DE_Q, lang: 'de' });
  step('(a) a szabályos BLOKK-válasz ELFOGADOTT, és a szöveg KARAKTERRE a forrás mondata',
    okOne.body.ok === true && okOne.body.answer_kind === 'model_blocks'
    && okOne.body.answer === KB_DE.purpose && okOne.body.model_discarded === null,
    { fajta: okOne.body.answer_kind, egyezik_a_forrással: okOne.body.answer === KB_DE.purpose });
  step('(a/2) …a GÉPI alak megnevezi a felhasznált blokkot, a forrás pedig IGAZOLT',
    Array.isArray(okOne.body.answer_blocks) && okOne.body.answer_blocks.length === 1
    && okOne.body.answer_blocks[0] === `invite.send@${invDe.version}#purpose`
    && (okOne.body.sources || []).some((s) => s.feature === 'invite.send'),
    { blokk: okOne.body.answer_blocks, forrás: (okOne.body.sources || []).map((s) => s.feature || `faq:${s.faq}`) });

  stub.next = `[[VS-BLOCKS: invite.send@${invDe.version}#purpose, invite.send@${invDe.version}#result]] [[VS-LANG: de]]`;
  const okTwo = await anna.c.post('/api/assistant/ask', { question: DE_Q, lang: 'de' });
  step('(a/3) TÖBB blokk is összefűzhető — és a szöveg akkor is a forrásból áll, nem a modelltől',
    okTwo.body.answer_kind === 'model_blocks' && okTwo.body.answer === `${KB_DE.purpose} ${KB_DE.result}`,
    { hossz: String(okTwo.body.answer || '').length, blokk: okTwo.body.answer_blocks });

  // (b) A KÜLSŐ FÉL ELLENPÉLDÁJA — a HAMIS mondat HELYES jelölőkkel.
  stub.next = `Der Vshop stellt bereits echte Rechnungen aus. [[VS-BLOCKS: invite.send@${invDe.version}#purpose]] [[VS-LANG: de]]`;
  const liar = await anna.c.post('/api/assistant/ask', { question: DE_Q, lang: 'de' });
  step('(b) A LELET LEZÁRVA: a HAMIS mondat HELYES jelölővel sem jelenik meg — a forrás szövege jön',
    liar.body.ok === true && liar.body.answer_kind === 'model_blocks'
    && !String(liar.body.answer).includes('Rechnungen') && !String(liar.body.answer).includes('Vshop')
    && liar.body.answer === KB_DE.purpose,
    { megjelenített: String(liar.body.answer).slice(0, 60), hamis_mondat_bent_van: String(liar.body.answer).includes('Vshop') });

  // (c)–(g) A NEVEZETT ELUTASÍTÁSI OKOK.
  const reject = async (next, why, label) => {
    stub.next = next;
    const r = await anna.c.post('/api/assistant/ask', { question: DE_Q, lang: 'de' });
    step(label, r.body.answer_kind !== 'model_blocks' && r.body.model_discarded && r.body.model_discarded.reason === why,
      { várt: why, kapott: r.body.model_discarded && r.body.model_discarded.reason, fajta: r.body.answer_kind });
    return r;
  };
  await reject(`[[VS-BLOCKS: vshop.invoice@1.0.0#purpose]] [[VS-LANG: de]]`, 'model_unknown_source',
    '(c) a NEM ÁTADOTT funkcióra mutató blokk kiesik');
  await reject(`[[VS-BLOCKS: invite.send@0.0.1#purpose]] [[VS-LANG: de]]`, 'model_stale_source',
    '(d) az ELAVULT verziójú blokk kiesik (a verzió nem díszítés)');
  await reject(`[[VS-BLOCKS: invite.send@${invDe.version}#belso_megjegyzes]] [[VS-LANG: de]]`, 'model_unknown_block',
    '(e) a KI NEM ADHATÓ szakaszra mutató blokk kiesik (zárt szakasz-lista)');
  await reject(`[[VS-BLOCKS: invite.send@${invDe.version}#purpose]] [[VS-LANG: hu]]`, 'model_wrong_language',
    '(f) a TÉVES nyelvet deklaráló blokk-válasz kiesik');
  const many = Array.from({ length: LIMITS.answer_blocks + 1 }, () => `invite.send@${invDe.version}#purpose`).join(', ');
  await reject(`[[VS-BLOCKS: ${many}]] [[VS-LANG: de]]`, 'model_too_many_blocks',
    '(g) a KORLÁTNÁL több blokk kiesik — a kivonat nem lehet újabb fal');

  // (h) A SZABAD PRÓZA: NEVEZETT, NEM ELFOGADOTT MÓD.
  const prose = await reject(`So lädst du jemanden ein: öffne Benutzer. [[VS-SOURCES: invite.send@${invDe.version}]] [[VS-LANG: de]]`,
    'model_prose_unverified', '(h) a FORMAILAG szabályos PRÓZA nevezetten NEM elfogadott mód');
  step('(h/2) …és a próza mondata SEHOL nem jelenik meg a válaszban',
    !String(prose.body.answer || '').includes('öffne Benutzer'),
    { megjelenített: String(prose.body.answer || '').slice(0, 60) });

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('B) A NYELV A BLOKK-ÚTON — a szöveg a KÉRT nyelv csomagjából jön (F93-02 · F93-03)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  stub.next = `[[VS-BLOCKS: invite.send@${invHu.version}#purpose]] [[VS-LANG: hu]]`;
  const huAns = await anna.c.post('/api/assistant/ask', { question: 'Hogyan hívhatok meg valakit?', lang: 'hu' });
  step('(a) MAGYAR kérésre a MAGYAR csomag mondata jön — karakterre',
    huAns.body.answer_kind === 'model_blocks' && huAns.body.answer === KB_HU.purpose,
    { egyezik: huAns.body.answer === KB_HU.purpose, minta: String(huAns.body.answer).slice(0, 48) });
  step('(a/2) …és a két nyelv válasza TÉNYLEGESEN különbözik (nem ugyanaz a szöveg két címkével)',
    KB_HU.purpose !== KB_DE.purpose && huAns.body.answer !== okOne.body.answer,
    { hu: String(huAns.body.answer).slice(0, 34), de: String(okOne.body.answer).slice(0, 34) });
  step('(b) a KÉRT nyelv és a szakasz-lista TÉNYLEGESEN át van adva a szolgáltatónak',
    JSON.stringify(stub.lastBody).includes('KÖTELEZŐEN: hu') && JSON.stringify(stub.lastBody).includes('VS-BLOCKS'),
    'a csonk kérésében ott a kért nyelv és a blokk-szerződés');

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('C) A BEMUTATÓ ÉLETCIKLUSA — a lezárás túléli a fiókváltást (F93-01)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  const def = { id: 'tour.addBusiness', version: '1.0.0', feature: 'account.add_business', page: 'new',
    steps: [{ id: 's1', target: 'ws-kind-business', task: null }, { id: 's2', target: 'ws-create', task: 'workspace.created' }] };
  const run = newTourRun({ def, view: { book: 'b1', subject: 'u1' }, role: 'admin' });
  run.steps[0].state = 'done'; run.at = 1;
  step('(a) a feladat-lépés a SZERVER tanújára zárul (taskDone), nem a kattintásra',
    taskDone(run, 'workspace.created') === true && run.steps[1].state === 'done', run.steps.map((s) => s.state).join('/'));
  const fin = finishRun(run);
  const carry = carrySnapshot(run);
  step('(b) a lezárt futásból HORDOZHATÓ elszámolás készül, és megjelöli magát',
    fin.ok === true && carry && carry.carried === true && carry.id === 'tour.addBusiness'
    && carry.steps.length === run.steps.length, { lepes: carry.steps.map((s) => `${s.id}:${s.state}`).join(' ') });
  const sum = runSummary(carry);
  step('(c) az ELSZÁMOLÁS összege SOHA nem kevesebb a lépésszámnál (nem tűnhet el lépés)',
    sum.done + sum.skipped + sum.pending === sum.total && sum.whole === true, sum);
  const html = finishedHtml(carry);
  step('(d) a hordozott záró lapot UGYANAZ a rajzoló írja ki, MÁS bevezetővel (nem hazudik helyszínt)',
    html.includes('data-carried="true"') && html.includes('data-whole="true"')
    && html.includes(dictFor('hu').TOURUI.carriedLead.slice(0, 40)),
    { carried_jelölő: html.includes('data-carried="true"') });
  const half = newTourRun({ def, view: { book: 'b1', subject: 'u1' }, role: 'admin' });
  step('(e) a NEM lezárt futásból nem lesz „egész" lezárás — a hordozás nem emel készre',
    runSummary(carrySnapshot(half)).whole === false && runSummary(carrySnapshot(half)).pending === 2,
    runSummary(carrySnapshot(half)));

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('D) A MEGNYITHATÓ FORRÁS — a válasz forrása a kérő tudás-indexében áll (F93-03)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  const idx = (await anna.c.get('/api/assistant/knowledge' + q({ lang: 'de' }))).body.index || [];
  const visible = idx.filter((r) => r.visible).map((r) => r.id);
  step('(a) a blokk-válasz MINDEN forrása ott van a kérő tudás-indexében (van hova megnyitni)',
    (okOne.body.sources || []).filter((s) => s.feature).every((s) => visible.includes(s.feature)),
    { forrás: (okOne.body.sources || []).map((s) => s.feature).filter(Boolean), indexben: visible.length });
  const askFaq = await anna.c.post('/api/assistant/ask', { question: 'Wer kann mich einladen?', lang: 'de' });
  step('(b) a GYIK-forrás EMBERI kérdés-szöveggel azonosítható (a nyers azonosító nem felhasználói szöveg)',
    (askFaq.body.faq || []).every((f) => typeof f.q === 'string' && f.q.length > 0),
    { találat: (askFaq.body.faq || []).length });

} finally {
  await app.close();
  await new Promise((r) => stubServer.close(r));
}

const pass = results.filter((r) => r.pass).length;
console.log(`\n${'='.repeat(100)}`);
console.log(`R93 befejező battéria: ${pass}/${results.length} PASS${pass === results.length ? '' : ` — ${results.length - pass} FAIL`}`);
console.log('KIMONDVA: a szolgáltatói ág HELYI CSONKKAL mérve — ez NEM élő AI-eredmény. Amit ez bizonyít:');
console.log('a SAJÁT szerződésünk (AST-05) mit fogad el és mit utasít el; azt NEM, hogy egy valódi modell');
console.log('mindig a legjobb blokkot választja (a rossz VÁLOGATÁS így is lehetséges — de az rossz');
console.log('TALÁLAT, nem kitalált tény). Élő mérés: `npm run kapcsolat:ai` · `npm run proof:assistant-live`.');
process.exit(pass === results.length ? 0 : 1);
