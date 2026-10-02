// v3app/findings_r142.mjs — AZ R142 CSOMAG ÉLŐ BATTÉRIÁJA (CMD-VS-300-002-002 R142).
//
// MIÉRT KÜLÖN BATTÉRIA. Az R142 három MÉRT leletet zár le, és mindhárom olyan helyen volt, ahol a
// korábbi battériák zöldek maradtak — tehát a zöldjük a hiányról semmit nem mondott (KUKA-092):
//   · a helyi, latin szókincsű kereső korlátja a MODELL belépési kapuja lett (AST-06 · TOK-01);
//   · a csak HASONLÓSÁGON álló téves téma „találatnak" számított, és megelőzte a pontos találatot
//     (TOK-02 — a `kerese`~`keresek` eset, karakterre visszamérve);
//   · a megjelölt modell-próza szerződése megépült, de BEKAPCSOLVA visszanyitotta a KUKA-235-ös
//     hamis mondatot — ezért NEVEZETT kapcsoló mögött áll, és MINDKÉT állása mérve van (AST-07).
//
// AMIT MÉR:
//   A) AST-06 — a modell-hívás NEVEZETT döntése, a korlátos capability-index, és az ELLENPÁR;
//   B) TOK-01 — az írás-független darabolás, a latin padló változatlansága, a nevezett ok;
//   C) TOK-02 — a találat ALAPJA (pontos vs. hasonlóság) és a rendezés megfordulása;
//   D) AST-07 — a megjelölt következtetés alakja, és hogy KIKAPCSOLVA a hamis mondat NEM jelenik meg;
//   E) LEF-01 — a lefedési népesség a TÉNYLEGES forrásból jön, padlóval és ellenpárral.
//
// KIMONDVA: a szolgáltatói ág HELYI CSONKKAL mérve — ez NEM élő AI-eredmény, és nem is annak
// szánjuk. A csonk a SAJÁT szerződésünket méri: mit ad át a szerver, mikor hív, mit fogad el. Ebben
// a konténerben nincs engedélyezett szolgáltató (`VS_AI_PROVIDER` hiányzik — `npm run kapcsolat:ai`),
// tehát élő nyelvértésre vonatkozó állítás ebből NEM következik (KUKA-089 · KUKA-127).
//
// Kilépési kód: 0 = minden állítás PASS · 1 = MÉRT hibát talált · 2 = a mérés elakadt.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { startServer } from './server.mjs';
import {
  LIMITS, tokensOf, scriptsOf, wordHitKind, selectKnowledge, modelNeed, groundedAnswer,
} from './assistant/policy.mjs';
import { FEATURES, TOURS } from './knowledge/features.mjs';
import * as COV from './knowledge/coverage.mjs';
import { dictFor } from './public/i18n/dict.mjs';

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

// ── HELYI SZOLGÁLTATÓI CSONK ────────────────────────────────────────────────────────────────────
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
await new Promise((ok) => stubServer.listen(0, '127.0.0.1', ok));
const stubPort = stubServer.address().port;

process.env.VS_AI_PROVIDER = 'openai_compatible';
process.env.VS_AI_API_KEY = 'csonk-kulcs-nem-titok';
process.env.VS_AI_BASE_URL = `http://127.0.0.1:${stubPort}`;
process.env.VS_AI_MODEL = 'csonk';
delete process.env.VS_AI_GROUNDED_PROSE;            // a KIKAPCSOLT állás a vizsgált alapállapot

const dbPath = resolve(ROOT, artifactPath({ area: 'tmp', kind: 'v3app_r142_leletek', ext: 'sqlite', version: VERSION }));
const app = await startServer({ port: 0, dbPath });
const base = `http://127.0.0.1:${app.port}`;
console.log(`R142 battéria: ${base}  ·  helyi szolgáltatói csonk: http://127.0.0.1:${stubPort}  ·  tároló: ${dbPath}`);

let app2 = null;
try {
  const mailsOf = async (c) => (await c.get('/dev/mailbox')).body.mails;
  async function person(email, { lang = 'hu', password = 'proba-jelszo-2026' } = {}) {
    const c = new Client(base);
    await c.post('/api/register', { email, password, lang });
    const S = dictFor(lang).SRV;
    const m = (await mailsOf(c)).filter((x) => x.to === email && String(x.subject).startsWith(S.mailVerifySubject))[0];
    if (!m) throw new Error(`a megerősítő levél nem jött meg: ${email}`);
    await c.get(new URL(m.link).pathname + new URL(m.link).search);
    await c.post('/api/login', { email, password });
    return { c, email };
  }

  const anna = await person('anna@r142.proba');
  const ws = await anna.c.post('/api/workspaces', { name: 'R142 Próba Kft.', business: { tax_id: '12345678-1-42' } });
  if (!ws.body || ws.body.ok !== true) throw new Error(`a cégtér nem jött létre: ${JSON.stringify(ws.body).slice(0, 200)}`);

  const KINAI = '我如何邀请某人加入我的公司？';
  const BLOKK = (id, v, sec) => `[[VS-BLOCKS: ${id}@${v}#${sec}]] [[VS-LANG: hu]]`;
  const inv = FEATURES.find((f) => f.id === 'invite.send');

  // ── A) AST-06 — A HELYI TALÁLAT NEM A MODELL KAPUJA ──────────────────────────────────────────
  part('A) AST-06 — a modell-hívás NEVEZETT döntése (a kapu megszüntetése)');

  stub.calls = 0; stub.next = BLOKK('invite.send', inv.version, 'purpose');
  const kinai = await anna.c.post('/api/assistant/ask', { question: KINAI, lang: 'hu' });
  step('(a1) a NEM LATIN íráson feltett kérdésnél a szolgáltató MEGHÍVÓDIK (eddig nem)',
    stub.calls === 1 && kinai.body.model_need && kinai.body.model_need.call === true,
    { hivas: stub.calls, miert: kinai.body.model_need && kinai.body.model_need.why });
  step('(a1/2) …és az ok NEVEZETT: a helyi szókincs eleve nem illeszkedhet',
    kinai.body.model_need && kinai.body.model_need.why === 'non_latin_question',
    { miert: kinai.body.model_need && kinai.body.model_need.why, kereses: kinai.body.search });

  stub.calls = 0;
  const folytatas = await anna.c.post('/api/assistant/ask', {
    question: 'És ezt hogyan csinálom?', lang: 'hu',
    history_text: 'K: Hogyan hívok meg valakit?\n---\nV: A Felhasználók fülön.',
  });
  step('(a2) az ELŐZMÉNYRE utaló folytatás is eljut a modellhez',
    stub.calls === 1 && folytatas.body.model_need.call === true
    && folytatas.body.model_need.why === 'history_followup',
    { hivas: stub.calls, miert: folytatas.body.model_need.why });

  stub.calls = 0;
  const semmi = await anna.c.post('/api/assistant/ask', { question: '??? !!! ...', lang: 'hu' });
  step('(a3) ELLENPÁR: betű és előzmény nélkül NEM hívunk modellt — és ezt is KIMONDJUK',
    stub.calls === 0 && semmi.body.model_need.call === false
    && semmi.body.model_need.why === 'nothing_to_interpret',
    { hivas: stub.calls, miert: semmi.body.model_need.why });

  // A KORLÁTOS INDEX — és hogy TÖRZS nélkül megy át.
  const atadott = (() => {
    try { return JSON.parse(String((stub.lastBody.messages || []).map((m) => m.content).join('\n').match(/\{[\s\S]*\}$/) || [''])[0]); } catch { return null; }
  })();
  stub.calls = 0; stub.next = BLOKK('invite.send', inv.version, 'purpose');
  await anna.c.post('/api/assistant/ask', { question: KINAI, lang: 'hu' });
  const user = String((stub.lastBody.messages || []).find((m) => m.role === 'user')?.content || '');
  const tudas = (() => { try { return JSON.parse(user.slice(user.indexOf('{'), user.lastIndexOf('}') + 1)); } catch { return null; } })();
  step('(a4) a modell a KORLÁTOS capability-INDEXET kapja (fejlécek), nem a teljes kézikönyvet',
    !!tudas && Array.isArray(tudas.index) && tudas.index.length > 0
    && tudas.index.length <= LIMITS.knowledge_index
    && tudas.index.every((x) => x.id && x.version && !('purpose' in x) && !('result' in x)),
    { index: tudas ? tudas.index.length : null, korlat: LIMITS.knowledge_index, detail: tudas ? (tudas.detail || []).length : null });

  const indexOnly = await anna.c.post('/api/assistant/ask', { question: KINAI, lang: 'hu' });
  step('(a5) …és az INDEXBŐL hivatkozott blokkra a szerver a SAJÁT nyelvcsomagjából ad szöveget',
    indexOnly.body.ok === true && indexOnly.body.answer_kind === 'model_blocks'
    && indexOnly.body.answer === dictFor('hu').KB['invite.send'].purpose,
    { fajta: indexOnly.body.answer_kind, egyezik: indexOnly.body.answer === dictFor('hu').KB['invite.send'].purpose });

  // ── B) TOK-01 — AZ ÍRÁS-FÜGGETLEN DARABOLÁS ─────────────────────────────────────────────────
  part('B) TOK-01 — a latin íráson kívüli kérdés nem „üres kérdés"');
  step('(b1) a nem latin kérdésnek VAN mérhető szó-darabja (a régi alak 0-t adott)',
    tokensOf(KINAI).length > 0, { darab: tokensOf(KINAI).length });
  step('(b1/2) …és az ÍRÁST a mérés megnevezi (nem nyelvet állít)',
    scriptsOf(KINAI).includes('spaceless') && !scriptsOf(KINAI).includes('latin'),
    { iras: scriptsOf(KINAI) });
  step('(b2) ELLENPÁR: a LATIN padló VÁLTOZATLAN — a két karakteres latin szó továbbra sem darab',
    !tokensOf('ab cd keszlet').includes('ab') && tokensOf('ab cd keszlet').includes('keszlet'),
    { darabok: tokensOf('ab cd keszlet') });
  step('(b3) ELLENPÁR: tartalom nélküli kérdésre NINCS darab (a javítás nem gyárt zajt)',
    tokensOf('??? !!! ...').length === 0, { darab: tokensOf('??? !!! ...').length });

  // ── C) TOK-02 — A TALÁLAT ALAPJA ────────────────────────────────────────────────────────────
  part('C) TOK-02 — a hasonlóság nem dönthet témát');
  step('(c1) a hasonlóság NEVEZVE van: `kerese` ~ `keresek` csak TŐ-egyezés, nem pontos',
    wordHitKind('keresek', ['kerese']) === 'stem' && wordHitKind('keresek', ['keresek']) === 'exact',
    { tovel: wordHitKind('keresek', ['kerese']), pontosan: wordHitKind('keresek', ['keresek']) });
  const raktar = selectKnowledge({ question: 'Hogyan keresek a raktárak között?', dictionary: dictFor('hu'),
    ctx: { signed_in: true, book_id: 'b', role: 'admin', personal: false, plan: 'starter', member: true } });
  const elso = raktar.features[0];
  step('(c2) A LELET LEZÁRVA: a MÉRT téves téma (`auth.resend`) többé nem az ELSŐ találat',
    !!elso && elso.id !== 'auth.resend', { elso: elso ? `${elso.id}(${elso.confidence})` : null, sorrend: raktar.features.map((f) => f.id) });
  step('(c2/2) …és az ELSŐ találat a felhasználó SAJÁT szaván áll (pontos), nem hasonlóságon',
    !!elso && elso.confidence === 'exact', { elso: elso ? elso.confidence : null });
  step('(c3) a találat erőssége a VÁLASZBAN is ott van (a mérés és a felület is látja)',
    ['exact', 'weak', 'none'].includes(raktar.confidence), { eros: raktar.confidence });
  const gyenge = modelNeed({ selection: { confidence: 'weak' }, question: 'valami' });
  step('(c4) a CSAK hasonlóságon álló találat miatt a témát a MODELL dönti el',
    gyenge.call === true && gyenge.why === 'weak_only', gyenge);

  // ── D) AST-07 — A MEGJELÖLT KÖVETKEZTETÉS, KAPCSOLÓVAL ──────────────────────────────────────
  part('D) AST-07 — a próza NEVEZETT mód, és KIKAPCSOLVA nem jelenik meg');
  const HAMIS = 'A Vshop már éles számlákat állít ki.';
  stub.next = `${HAMIS} ${BLOKK('invite.send', inv.version, 'purpose')}`;
  const kikapcsolva = await anna.c.post('/api/assistant/ask', { question: 'Hogyan hívok meg valakit?', lang: 'hu' });
  step('(d1) A KUKA-235 VÉDELEM ÁLL: kikapcsolt prózánál a HAMIS mondat NEM jelenik meg',
    kikapcsolva.body.ok === true && kikapcsolva.body.answer_kind === 'model_blocks'
    && !String(kikapcsolva.body.answer).includes('Vshop'),
    { fajta: kikapcsolva.body.answer_kind, hamis_bent: String(kikapcsolva.body.answer).includes('Vshop') });

  const L = { facts: dictFor('hu').CHAT.groundedFacts, inference: dictFor('hu').CHAT.modelInference };
  const g = groundedAnswer({ facts: 'A forrás mondata.', prose: 'A segéd magyarázata.', labels: L });
  step('(d2) a megjelölt alak KÉT darabból áll, és a feliratot a NYELVCSOMAG adja',
    g.ok === true && g.has_inference === true
    && g.answer.includes(L.facts) && g.answer.includes(L.inference)
    && g.answer.indexOf(L.facts) < g.answer.indexOf(L.inference),
    { valasz: g.answer.slice(0, 80) });
  const gUres = groundedAnswer({ facts: '', prose: 'csak próza', labels: L });
  step('(d3) ELLENPÁR: forrás-rész NÉLKÜL a próza NEM jelenik meg (a jelölés nem pótolja a megalapozást)',
    gUres.ok === false && gUres.reason === 'grounded_without_facts', gUres);

  // ÉS A BEKAPCSOLT ÁLLÁS IS MÉRVE — hogy a kapcsoló ne DÍSZ legyen (KUKA-041).
  process.env.VS_AI_GROUNDED_PROSE = '1';
  const db2 = resolve(ROOT, artifactPath({ area: 'tmp', kind: 'v3app_r142_proza', ext: 'sqlite', version: VERSION }));
  app2 = await startServer({ port: 0, dbPath: db2 });
  const base2 = `http://127.0.0.1:${app2.port}`;
  const anna2 = await (async () => {
    const c = new Client(base2);
    await c.post('/api/register', { email: 'anna@r142b.proba', password: 'proba-jelszo-2026', lang: 'hu' });
    const S = dictFor('hu').SRV;
    const mm = ((await c.get('/dev/mailbox')).body.mails || []).filter((x) => x.to === 'anna@r142b.proba' && String(x.subject).startsWith(S.mailVerifySubject))[0];
    await c.get(new URL(mm.link).pathname + new URL(mm.link).search);
    await c.post('/api/login', { email: 'anna@r142b.proba', password: 'proba-jelszo-2026' });
    await c.post('/api/workspaces', { name: 'R142 Próza Kft.', business: { tax_id: '12345678-1-43' } });
    return c;
  })();
  stub.next = `A segéd magyarázata. ${BLOKK('invite.send', inv.version, 'purpose')}`;
  const bekapcsolva = await anna2.post('/api/assistant/ask', { question: 'Hogyan hívok meg valakit?', lang: 'hu' });
  step('(d4) BEKAPCSOLVA a válasz fajtája `model_grounded`, és a forrás-rész a MONDAT ELEJÉN áll',
    bekapcsolva.body.answer_kind === 'model_grounded'
    && String(bekapcsolva.body.answer).includes(L.facts)
    && String(bekapcsolva.body.answer).includes(L.inference)
    && String(bekapcsolva.body.answer).includes(dictFor('hu').KB['invite.send'].purpose),
    { fajta: bekapcsolva.body.answer_kind, elso60: String(bekapcsolva.body.answer).slice(0, 60) });
  delete process.env.VS_AI_GROUNDED_PROSE;

  // ── E) LEF-01 — A LEFEDÉSI NÉPESSÉG A TÉNYLEGES FORRÁSBÓL ───────────────────────────────────
  part('E) LEF-01 — a lefedés alapsokasága NEM a tudásjegyzék önellenőrzése');
  const serverSrc = readFileSync(join(ROOT, 'v3app/server.mjs'), 'utf8');
  const uiSrc = ['v3app/public/app.js', 'v3app/public/help.mjs', 'v3app/public/chat.mjs', 'v3app/public/tour.mjs']
    .map((f) => readFileSync(join(ROOT, f), 'utf8'));
  const hu = dictFor('hu');
  const pop = COV.populationFrom({ serverSource: serverSrc, uiSources: uiSrc, pageLabels: hu.PAGE, navGroups: hu.NAV_GROUPS, navAdmin: hu.NAV_ADMIN, navPersonal: hu.NAV_PERSONAL });
  const inven = COV.inventory({ population: pop, features: FEATURES, tours: TOURS });
  step('(e1) a népesség minden fajtán eléri a MÉRT padlót (a kivonatolás nem zsugorodott)',
    inven.floorBreaks.length === 0, inven.floorBreaks.length ? inven.floorBreaks : inven.counts);
  step('(e2) a népesség a FORRÁSBÓL nagyobb, mint a tudásjegyzék — tehát van mihez mérni',
    pop.route.length + pop.page.length + pop.action.length > FEATURES.length,
    { forras: pop.route.length + pop.page.length + pop.action.length, regiszter: FEATURES.length });
  const hamisOldal = COV.pageCoverage({ kind: 'page', id: 'nincs-ilyen-oldal', label: 'x', menu: null, group: null }, { features: FEATURES, tours: TOURS });
  step('(e3) ELLENPÁR: nem létező oldalra a feloldó NEVEZETT hiányt ad, nem zöldet',
    hamisOldal.gaps.length === 3 && hamisOldal.evidence === COV.EVIDENCE.missing,
    { hianyok: hamisOldal.gaps.length });
  step('(e4) a bemutató-lefedés LÉPÉSEN áll, nem a `tour_note` hosszán',
    inven.tourRows.some((t) => t.how === 'shared' && t.steps.length > 0)
    && inven.tourRows.every((t) => t.how !== 'shared' || t.steps.length > 0),
    { sajat: inven.tourRows.filter((t) => t.how === 'own').length, kozos: inven.tourRows.filter((t) => t.how === 'shared').length, csak_szoveg: inven.tourRows.filter((t) => t.how === 'note_only').length });

  // ── ÖSSZEGZÉS ───────────────────────────────────────────────────────────────────────────────
  const fail = results.filter((r) => !r.pass);
  console.log(`\nR142 battéria: ${results.length - fail.length}/${results.length} PASS${fail.length ? ` — ${fail.length} FAIL` : ''}`);
  console.log('A SZOLGÁLTATÓI ÁG HELYI CSONKKAL mérve — élő nyelvértésre vonatkozó állítás ebből NEM következik.');
  if (fail.length) { console.log('\nFAIL-ek:'); fail.forEach((f) => console.log(` - [${f.section}] ${f.name}`)); }
  await app.close(); if (app2) await app2.close(); stubServer.close();
  process.exit(fail.length ? 1 : 0);
} catch (e) {
  console.error('\nELAKADT MÉRÉS (a battéria bukott el; a rendszerről ez NEM mond semmit):', e && e.message);
  try { await app.close(); } catch { /* már zárva */ }
  try { if (app2) await app2.close(); } catch { /* már zárva */ }
  try { stubServer.close(); } catch { /* már zárva */ }
  process.exit(2);
}
