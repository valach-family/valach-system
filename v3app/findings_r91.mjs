// v3app/findings_r91.mjs — AZ R91 JAVÍTÁSOK ÉLŐ, HTTP-SZINTŰ BATTÉRIÁJA (CMD-VS-300-002-002 R91).
//
// MIÉRT KELL A `verify:*` MELLETT. A szerződés-mérések tiszta modulokon futnak; ez a battéria a
// VALÓDI HTTP-határon mér, ugyanazon az úton, amin a böngésző megy — és ami az R89-ben pont ezért
// hiányzott: a külső ellenőrző fél (chatgpt-v3, R91) hét leletéből NÉGY csak élő úton vagy
// végigkattintással jött ki. A kettő KÜLÖN tanú (KUKA-207).
//
// ÉS AMI EBBEN ÚJ: SAJÁT, HELYI SZOLGÁLTATÓI CSONK (`/v1/chat/completions`), amit a battéria maga
// indít, és a vizsgált szerver a `VS_AI_BASE_URL`-en ODA hív. Így a szolgáltatói VÁLASZ-ÚT a valódi
// határon mérhető KÜLSŐ MODELLHÍVÁS NÉLKÜL — pontosan úgy, ahogy a külső fél a leletét előállította.
// KIMONDVA: ez NEM élő AI-eredmény. Azt továbbra is csak engedélyezett szolgáltatóval mért futás adja.
//
// AMIT MÉR:
//   A) A KÖZÖS ELÉRHETŐSÉG (F91-05): a nyilvános tudás belépés ELŐTT is, a fiókhoz kötött SOHA; a
//      GYIK-kereső alapsokasága a kérőhöz szűkül; a művelet- és bemutató-lista ugyanezt a halmazt követi;
//   B) A NYELV A TELJES ÚTON (F91-02): a levél, a benne lévő hivatkozás, a SZERVER ÁLTAL RAJZOLT
//      megerősítő lap és a meghívó levél a KÉRT nyelven — és `Accept-Language`-ből is;
//   C) A BEMUTATÓK (F91-01): a lista a kérőhöz kötött, a belépés előtti bemutató MEGVAN, a
//      bemutató nélküli funkció INDOKOT visz, és a feladat-lépések tanúja a szerver válasza;
//   D) A VÁLASZ-SZERZŐDÉS (F91-04): a külső fél PONTOS lelete reprodukálva a helyi csonkkal — az
//      idegen, forrás nélküli állítás NEM lesz modell-válasz, és nem kap forrás-díszítést;
//   E) A BESZÉLGETÉS VÉGES (F91-03): a szerver a deklarált korlátra vágja az előzményt, és a válasz
//      VISSZAADJA a beszélgetés azonosítóját, hogy az elavult válasz eldobható legyen;
//   F) A MŰVELET-PARAMÉTER (F91-05): a tömb és az ismeretlen mező NEVEZETT elutasítás a határon is.
import { rmSync, existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { startServer } from './server.mjs';
import { LIMITS } from './assistant/policy.mjs';
import { dictFor } from './public/i18n/dict.mjs';

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
  constructor(base, headers = {}) { this.base = base; this.cookie = null; this.extra = headers; }
  async call(method, path, body) {
    const headers = { ...this.extra };
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

/**
 * A HELYI SZOLGÁLTATÓI CSONK. Egy változóból adja a következő válasz szövegét, és megjegyzi, mit
 * KAPOTT — így a kért nyelv és az előzmény átadása is MÉRHETŐ, nem hitkérdés.
 */
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

const dbPath = resolve(ROOT, artifactPath({ area: 'tmp', kind: 'v3app_r91_leletek', ext: 'sqlite', version: VERSION }));
const app = await startServer({ port: 0, dbPath });
const base = `http://127.0.0.1:${app.port}`;
console.log(`R91 javítás-battéria: ${base}  ·  helyi szolgáltatói csonk: http://127.0.0.1:${stubPort}  ·  tároló: ${dbPath}`);

try {
  const mailsOf = async (c) => (await c.get('/dev/mailbox')).body.mails;
  const linkOf = async (c, email, subject) => {
    const m = (await mailsOf(c)).filter((x) => x.to === email && String(x.subject).startsWith(subject))[0];
    return m ? { link: m.link, subject: m.subject, body: m.body, path: new URL(m.link).pathname + new URL(m.link).search } : null;
  };
  async function person(email, { lang = 'hu', password = 'proba-jelszo-2026' } = {}) {
    const c = new Client(base);
    await c.post('/api/register', { email, password, lang });
    const S = dictFor(lang).SRV;
    const v = await linkOf(c, email, S.mailVerifySubject);
    await c.get(v.path);
    const login = await c.post('/api/login', { email, password });
    const me = await c.get('/api/me');
    return { c, email, password, subjectId: login.body.subject_id, personalBook: me.body.personal_book_id, verify: v };
  }
  const q = (obj) => `?${new URLSearchParams(obj).toString()}`;

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('A) A KÖZÖS ELÉRHETŐSÉG — egy szabály a tudásra, a GYIK-ra, a bemutatóra és a műveletre (F91-05)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  const anon = new Client(base);
  const idxAnon = await anon.get('/api/assistant/knowledge' + q({ lang: 'hu' }));
  const anonVisible = (idxAnon.body.index || []).filter((r) => r.visible).map((r) => r.id);
  step('(a) belépés ELŐTT a NYILVÁNOS tudás elérhető (a regisztráció is)',
    idxAnon.body.ok === true && anonVisible.includes('auth.register') && anonVisible.length > 0,
    { latható: anonVisible, alapsokaság: idxAnon.body.population });
  step('(a/2) …és a FIÓKHOZ kötött funkció belépés előtt SOHA',
    !anonVisible.some((id) => ['invite.send', 'members.grant', 'data.stock', 'plan.change'].includes(id)),
    anonVisible.join(','));
  const stAnon = await anon.get('/api/assistant/status' + q({ lang: 'hu' }));
  step('(a/3) a bemutató-lista is a NYILVÁNOS halmazra szűkül, és a belépés előtti bemutató OTT van',
    (stAnon.body.tours || []).some((t) => t.id === 'tour.register' && t.requires_anonymous === true)
    && !(stAnon.body.tours || []).some((t) => ['tour.invite', 'tour.stock', 'tour.grant'].includes(t.id)),
    (stAnon.body.tours || []).map((t) => t.id).join(','));
  step('(a/4) …és névtelenül EGYETLEN nyitható művelet sincs (a nyilvános magyarázat ≠ nyitható művelet)',
    Array.isArray(stAnon.body.actions) && stAnon.body.actions.length === 0, `${(stAnon.body.actions || []).length} művelet`);

  const anna = await person('anna.r91@pelda.hu');
  const stNoBook = await anna.c.get('/api/assistant/status' + q({ lang: 'hu' }));
  step('(b) fiók NÉLKÜL a fiókhoz kötött bemutató és művelet sem jelenik meg',
    !(stNoBook.body.tours || []).some((t) => ['tour.invite', 'tour.stock', 'tour.plan', 'tour.grant'].includes(t.id))
    && !(stNoBook.body.actions || []).some((a) => a.id === 'prepare.invite'),
    { bemutató: (stNoBook.body.tours || []).map((t) => t.id), művelet: (stNoBook.body.actions || []).length });
  const askNoBook = await anna.c.post('/api/assistant/ask', { question: 'Ki hívhat meg engem?', lang: 'hu' });
  step('(b/2) …és a GYIK-kereső alapsokasága a kérőhöz szűkül (a fiókhoz kötött kérdés nem is kereshető)',
    askNoBook.body.faq_population < Object.keys(dictFor('hu').FAQ).length
    && !(askNoBook.body.faq || []).some((f) => f.id.startsWith('faq.invite') || f.id.startsWith('faq.members')),
    { kereshető: askNoBook.body.faq_population, teljes_tábla: Object.keys(dictFor('hu').FAQ).length,
      találat: (askNoBook.body.faq || []).map((f) => f.id) });

  const ws = await anna.c.post('/api/workspaces', { name: 'R91 Kft', business: { jurisdiction: 'HU', tax_id: '12345678-1-42' } });
  await anna.c.post('/api/session/workspace', { book_id: ws.body.book_id });
  const stAdmin = await anna.c.get('/api/assistant/status' + q({ lang: 'hu' }));
  step('(c) fiókkezelőként a fiókhoz kötött bemutatók MEGJELENNEK (a szabály nem tilt, hanem kötést ad)',
    ['tour.invite', 'tour.stock', 'tour.plan', 'tour.grant'].every((id) => (stAdmin.body.tours || []).some((t) => t.id === id)),
    (stAdmin.body.tours || []).map((t) => t.id).join(','));

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('B) A NYELV A TELJES ÚTON — levél · hivatkozás · SZERVER-RAJZOLT lap · meghívó (F91-02)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  const DE = dictFor('de').SRV;
  const berta = new Client(base);
  await berta.post('/api/register', { email: 'berta.r91@pelda.hu', password: 'proba-jelszo-2026', lang: 'de' });
  const deMail = await linkOf(berta, 'berta.r91@pelda.hu', DE.mailVerifySubject);
  step('(a) a megerősítő levél TÁRGYA a kért nyelven', Boolean(deMail) && deMail.subject === DE.mailVerifySubject, deMail && deMail.subject);
  step('(a/2) …és a hivatkozás VISZI a nyelvet', Boolean(deMail) && deMail.link.includes('lang=de'), deMail && deMail.link.split('?')[1]);
  const dePage = await berta.get(deMail.path);
  step('(b) a SZERVER ÁLTAL RAJZOLT megerősítő lap a kért nyelven (lang, irány, mondat)',
    typeof dePage.body === 'string' && dePage.body.includes('lang="de"') && dePage.body.includes('dir="ltr"')
    && dePage.body.includes(DE.verifyTitleOk) && !dePage.body.includes('Az e-mail-címed megerősítve'),
    { lang: /lang="([a-z-]+)"/.exec(dePage.body)?.[1], cím: DE.verifyTitleOk });
  const badPage = await berta.get('/api/verify' + q({ token: 'nincs-ilyen-token', lang: 'de' }));
  step('(b/2) …és a KUDARC-lap is: nevezett ok + folytatás, a kért nyelven',
    typeof badPage.body === 'string' && badPage.body.includes('lang="de"')
    && badPage.body.includes(DE.reason_challenge_unknown.slice(0, 30)) && badPage.body.includes(DE.verifyResend),
    'a német kudarc-lap mondata és gombja');
  const accHdr = new Client(base, { 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8' });
  const accPage = await accHdr.get('/api/verify' + q({ token: 'nincs-ilyen-token' }));
  step('(c) nyelv-paraméter NÉLKÜL a böngésző kérése dönt (Accept-Language)',
    typeof accPage.body === 'string' && accPage.body.includes('lang="de"'),
    /lang="([a-z-]+)"/.exec(String(accPage.body))?.[1]);
  const invDe = await anna.c.post('/api/invites', { email: 'kollega.r91@pelda.hu', role: 'user', scope: 'keszlet', lang: 'de' });
  const invMail = (await mailsOf(anna.c)).filter((m) => m.to === 'kollega.r91@pelda.hu')[0];
  step('(d) a MEGHÍVÓ levél is a kért nyelven, a fiók nevével',
    invDe.status === 201 && invMail && invMail.subject.startsWith('Einladung:') && invMail.subject.includes('R91 Kft'),
    invMail && invMail.subject);

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('C) A BEMUTATÓK — a hiány INDOKA is a regiszterben áll (F91-01)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  const grantF = await anna.c.get('/api/assistant/knowledge' + q({ lang: 'hu', feature: 'members.grant' }));
  step('(a) a NEVESÍTETT hozzáférés-funkció bemutatója megépült, és a lépései a válaszban vannak',
    grantF.body.ok === true && grantF.body.feature.tour === 'tour.grant'
    && (grantF.body.tour_steps.steps || []).length === 3
    && grantF.body.tour_steps.steps.some((s) => s.task === 'grant.saved')
    && grantF.body.tour_steps.steps.some((s) => s.appears_after === 'members-list'),
    grantF.body.tour_steps.steps.map((s) => `${s.id}:${s.target}${s.task ? '*' : ''}`).join(' → '));
  const acceptF = await anna.c.get('/api/assistant/knowledge' + q({ lang: 'hu', feature: 'invite.accept' }));
  step('(b) a bemutató NÉLKÜLI funkció INDOKOT visz (a `tour: null` nem teljesítés)',
    acceptF.body.ok === true && acceptF.body.feature.tour === null
    && typeof acceptF.body.feature.tour_note === 'string' && acceptF.body.feature.tour_note.length > 40,
    (acceptF.body.feature.tour_note || '(nincs)').slice(0, 90) + '…');

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('D) A VÁLASZ-SZERZŐDÉS — a külső fél lelete reprodukálva, HELYI csonkkal (F91-04)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  process.env.VS_AI_PROVIDER = 'openai_compatible';
  process.env.VS_AI_API_KEY = 'proba-kulcs-nem-valodi';
  process.env.VS_AI_BASE_URL = `http://127.0.0.1:${stubPort}`;
  const stCfg = await anna.c.get('/api/assistant/status' + q({ lang: 'hu' }));
  step('(a) a csonkkal a szerver „csatlakozott" állapotot mér (NEVEK, érték nélkül)',
    stCfg.body.provider.configured === true && !JSON.stringify(stCfg.body.provider).includes('proba-kulcs'),
    { configured: stCfg.body.provider.configured, host: stCfg.body.provider.host });

  // A LELET SZÓ SZERINT: idegen, forrás nélküli, magyar állítás NÉMET kérdésre.
  stub.next = 'UNSUPPORTED: A Vshop már éles számlákat állít ki.';
  const bad1 = await anna.c.post('/api/assistant/ask', { question: 'Wie lade ich jemanden ein?', lang: 'de' });
  step('(b) az idegen, FORRÁS NÉLKÜLI modell-válasz NEM lesz modell-válasz',
    bad1.body.answer_kind !== 'model' && bad1.body.model_discarded
    && bad1.body.model_discarded.reason === 'model_no_source',
    { answer_kind: bad1.body.answer_kind, ok: bad1.body.ok, eldobva: bad1.body.model_discarded });
  step('(b/2) …és a válasz NEM kap forrás-díszítést: a modell szövege meg sem jelenik',
    !String(bad1.body.answer || '').includes('Vshop')
    && (bad1.body.sources || []).every((s) => s.feature !== undefined || s.faq !== undefined),
    { megjelenített: String(bad1.body.answer || '').slice(0, 60), forrás: bad1.body.sources });

  stub.next = 'So geht das. [[VS-SOURCES: vshop.invoice@1.0.0]] [[VS-LANG: de]]';
  const bad2 = await anna.c.post('/api/assistant/ask', { question: 'Wie lade ich jemanden ein?', lang: 'de' });
  step('(c) a NEM ÁTADOTT forrásra hivatkozó válasz nevezetten kiesik',
    bad2.body.model_discarded && bad2.body.model_discarded.reason === 'model_unknown_source', bad2.body.model_discarded);

  stub.next = 'So geht das. [[VS-SOURCES: invite.send@0.0.1]] [[VS-LANG: de]]';
  const bad3 = await anna.c.post('/api/assistant/ask', { question: 'Wie lade ich jemanden ein?', lang: 'de' });
  step('(d) az ELAVULT verzióra hivatkozó válasz is kiesik (a verzió nem díszítés)',
    bad3.body.model_discarded && bad3.body.model_discarded.reason === 'model_stale_source', bad3.body.model_discarded);

  stub.next = 'Ezt így kell. [[VS-SOURCES: invite.send@1.2.0]] [[VS-LANG: hu]]';
  const bad4 = await anna.c.post('/api/assistant/ask', { question: 'Wie lade ich jemanden ein?', lang: 'de' });
  step('(e) a TÉVES nyelvet deklaráló válasz kiesik (a kért nyelv a szerződés része)',
    bad4.body.model_discarded && bad4.body.model_discarded.reason === 'model_wrong_language', bad4.body.model_discarded);

  stub.next = `${'x'.repeat(LIMITS.answer_chars + 50)} [[VS-SOURCES: invite.send@1.2.0]] [[VS-LANG: de]]`;
  const bad5 = await anna.c.post('/api/assistant/ask', { question: 'Wie lade ich jemanden ein?', lang: 'de' });
  step('(f) a TÚL HOSSZÚ válasz kiesik — nem csonkolunk bele egy ellenőrizetlen mondatba',
    bad5.body.model_discarded && bad5.body.model_discarded.reason === 'model_too_long', bad5.body.model_discarded);

  const invVer = (await anna.c.get('/api/assistant/knowledge' + q({ lang: 'de', feature: 'invite.send' }))).body.feature.version;
  /**
   * (g) LEVÁLTVA AZ R93 §6-BAN — és ezt KIMONDJUK, nem csendben írjuk át (KUKA-206).
   *
   * Az R91-ben ez a sor azt mérte, hogy a FORMAI szerződést teljesítő PRÓZA modell-válasszá válik.
   * A külső ellenőrző fél az R93-ban megmutatta, hogy pontosan ez a rés: helyes forrás-jelölővel és
   * helyes nyelv-deklarációval ellátott, TARTALMILAG HAMIS mondat is átment rajta. Az R93 döntése
   * szerint a szabad próza NEVEZETT, NEM ELFOGADOTT mód — a megjelenő választ a szerver állítja
   * össze ellenőrzött tudás-blokkokból (AST-05). A sor tehát nem „javítva zöldre" lett, hanem a
   * MEGVÁLTOZOTT szerződést méri; az ELFOGADOTT út mérése a `verify:app-findings-r93` battériában áll.
   */
  stub.next = `So lädst du jemanden ein: öffne Benutzer und drücke Einladen. [[VS-SOURCES: invite.send@${invVer}]] [[VS-LANG: de]]`;
  const good = await anna.c.post('/api/assistant/ask', { question: 'Wie lade ich jemanden ein?', lang: 'de' });
  step('(g) [R93 §6 óta] a FORMAILAG szabályos PRÓZA sem lesz válasz — nevezett, nem elfogadott mód',
    good.body.answer_kind !== 'model' && good.body.model_discarded
    && good.body.model_discarded.reason === 'model_prose_unverified'
    && !String(good.body.answer || '').includes('öffne Benutzer'),
    { answer_kind: good.body.answer_kind, eldobva: good.body.model_discarded.reason });
  step('(g/2) …és a HELYI válasz forrásai a HELYI keresésből valók (nem a próza díszítése)',
    good.body.ok === true && (good.body.sources || []).some((s) => s.feature === 'invite.send')
    && !String(good.body.answer || '').includes('[[VS-'),
    { forrás: (good.body.sources || []).map((s) => s.feature || `faq:${s.faq}`), fajta: good.body.answer_kind });
  step('(h) a KÉRT NYELV és az ELŐZMÉNY ténylegesen ÁT VAN ADVA a szolgáltatónak',
    JSON.stringify(stub.lastBody).includes('A VÁLASZ NYELVE: de') && JSON.stringify(stub.lastBody).includes('KÖTELEZŐEN: de'),
    'a csonk kérésében ott a kért nyelv');

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('E) A BESZÉLGETÉS VÉGES, ÉS AZ ELAVULT VÁLASZ ELDOBHATÓ (F91-03)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  const many = Array.from({ length: 9 }, (_, i) => `K: kérdés ${i + 1}\nV: válasz ${i + 1}`).join('\n---\n');
  stub.next = `Antwort. [[VS-SOURCES: invite.send@${invVer}]] [[VS-LANG: de]]`;
  const hist = await anna.c.post('/api/assistant/ask', { question: 'Wie lade ich jemanden ein?', lang: 'de', history_text: many, conversation_id: 'c7' });
  step('(a) a szerver a DEKLARÁLT korlátra vágja az előzményt (9 → 6)',
    hist.body.history_turns_sent === LIMITS.history_turns, { átadott: hist.body.history_turns_sent, korlát: LIMITS.history_turns });
  step('(a/2) …és a csonk TÉNYLEGESEN a hatot kapta meg (nem a kilencet)',
    JSON.stringify(stub.lastBody).includes('kérdés 4') && !JSON.stringify(stub.lastBody).includes('kérdés 3'),
    'a legutóbbi hat forduló van a kérésben');
  step('(b) a válasz VISSZAADJA a beszélgetés azonosítóját (ebből tudja a lap, hogy elavult-e)',
    hist.body.conversation_id === 'c7', hist.body.conversation_id);

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('F) A MŰVELET-PARAMÉTER A HATÁRON IS ZÁRT LISTA (F91-05)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  const actions = (await anna.c.get('/api/assistant/status' + q({ lang: 'hu' }))).body.actions || [];
  step('(a) MINDEN felkínált művelet `writes: false`, és a megengedett mezői KIMONDVA',
    actions.length > 0 && actions.every((a) => a.writes === false),
    `${actions.length} művelet · író: ${actions.filter((a) => a.writes !== false).length}`);
  delete process.env.VS_AI_PROVIDER; delete process.env.VS_AI_API_KEY; delete process.env.VS_AI_BASE_URL;
  const noProv = await anna.c.post('/api/assistant/ask', { question: 'Hogyan hívhatok meg valakit?', lang: 'hu' });
  step('(b) a szolgáltató kikapcsolása után a helyi válasz jön, NULLA modellhívással',
    noProv.body.ok === true && noProv.body.answer_kind === 'local' && noProv.body.usage.model_calls === 0
    && noProv.body.usage.cost === null,
    { answer_kind: noProv.body.answer_kind, hívás: noProv.body.usage.model_calls, ár: noProv.body.usage.cost });
} finally {
  await app.close();
  await new Promise((r) => stubServer.close(r));
  for (const f of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) if (existsSync(f)) rmSync(f, { force: true });
}

const pass = results.filter((r) => r.pass).length;
console.log(`\n${'═'.repeat(96)}`);
console.log(`R91 javítás-battéria: ${pass}/${results.length} PASS${pass === results.length ? '' : ` — ${results.length - pass} FAIL`}`);
console.log('KIMONDVA: a szolgáltatói ág HELYI CSONKKAL mérve — ez NEM élő AI-eredmény (a valódi');
console.log('szolgáltatói mérés továbbra is nyitott: `npm run kapcsolat:ai` · `npm run proof:assistant-live`).');
process.exit(pass === results.length ? 0 : 1);
