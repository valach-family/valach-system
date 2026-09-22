// v3app/findings_r75.mjs — AZ R75 LELETEINEK CÉLZOTT PIROS/ZÖLD PRÓBÁI (CMD-VS-300-002-002 R75).
//
// MIT MÉR EZ, ÉS MIÉRT KÜLÖN FÁJLBAN. A `selfcheck.mjs` a TELJES folyamatot járja végig; ez a
// battéria a külső ellenőrző fél (chatgpt-v3) HÁROM reprodukált leletét és a hozzájuk kötött
// R64-maradékokat méri — pontosan azon a bemeneten, amin a lelet született, és minden tiltás
// mellett a POZITÍV ELLENPÁRRAL (KUKA-051: a tiltás önmagában üres bizonyíték, ha a jó eset is
// elakadna; és KUKA-041: a zöld pipa nem szólhat arról, ami meg sem történt).
//
//   F75-01  lejárt megerősítésből NINCS folytatás      → CHR-01 (újrakérés · leváltás · korlát)
//   F75-02  a kontextusváltási védelem csak részleges  → KTX-01 (megerősítés, nem felhatalmazás)
//   F75-03  hibás típusú HTTP-bemenetből írás lesz     → HTP-01 (séma a külső határon)
//   L11     a személyes kör nem nevesített cél         → SZK-01
//   L2      a képviseleti határ próza volt             → REP-01
//   L3      közös jóváhagyás: TÉNYLEGES HIÁNY          → mérve, nem ígérve
//   H06/H09 lejárati ágak                              → támogatott órával, HTTP szinten
//
// A HÁROM BIZONYÍTÉK-FAJTA KÜLÖN NEVEN: HTTP-válasz · TÁROLT SOR (második kapcsolatról olvasva) ·
// és FORRÁS-MÉRÉS (ahol a bizonyíték az, hogy valami NINCS a kódban). Egyik sem helyettesíti a
// böngésző-próbát (`npm run proof:core-ux`) — az a felület útját méri, ez a határét.
import { rmSync, existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { startServer } from './server.mjs';
import { openStoreAt } from '../v3ref/store.mjs';
import { schemaForEndpoint, ENDPOINT_SCHEMAS, HTP_CONTRACT } from './httpSchema.mjs';
import { representationCheck, REP_CONTRACT } from '../v3ref/representation.mjs';
import { CHALLENGE_POLICY } from '../v3ref/account.mjs';

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
    const res = await fetch(this.base + path, {
      method, headers,
      body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
      redirect: 'manual',
    });
    const sc = res.headers.get('set-cookie');
    if (sc) this.cookie = sc.split(';')[0];
    const ct = res.headers.get('content-type') || '';
    const payload = ct.includes('application/json') ? await res.json() : await res.text();
    return { status: res.status, headers: res.headers, body: payload };
  }
  get(p) { return this.call('GET', p); }
  post(p, b) { return this.call('POST', p, b ?? {}); }
  raw(p, text) { return this.call('POST', p, text); }
}

const dbPath = resolve(ROOT, artifactPath({ area: 'tmp', kind: 'v3app_r75_leletek', ext: 'sqlite', version: VERSION }));
const app = await startServer({ port: 0, dbPath });
const base = `http://127.0.0.1:${app.port}`;
console.log(`R75 lelet-battéria: ${base}  · tároló: ${dbPath}`);

// MÁSODIK KAPCSOLAT UGYANARRA A FÁJLRA — a tárolt sor NEM a szerver válaszából jön (WAL).
const db = openStoreAt(dbPath, { timeoutMs: 5000 });
const count = (sql, ...p) => { const r = db.get(sql, ...p); return r ? Number(Object.values(r)[0]) : 0; };
const businessRowCounts = () => ({
  book: count('SELECT COUNT(*) FROM book'),
  membership: count('SELECT COUNT(*) FROM membership'),
  grant: count('SELECT COUNT(*) FROM membership_grant'),
  basis: count('SELECT COUNT(*) FROM authority_basis'),
  invite: count('SELECT COUNT(*) FROM invite'),
  command: count('SELECT COUNT(*) FROM command'),
  scope_grant: count('SELECT COUNT(*) FROM scope_grant'),
  subject: count('SELECT COUNT(*) FROM subject'),
  challenge: count('SELECT COUNT(*) FROM channel_challenge'),
});

try {
  const mailsOf = async (c) => (await c.get('/dev/mailbox')).body.mails;
  const linkFor = async (c, to, part) => {
    const m = (await mailsOf(c)).find((x) => x.to === to && x.subject.includes(part));
    return m ? m.link : null;
  };
  const pathOf = (link) => { const u = new URL(link); return u.pathname + u.search; };
  const advance = (c, ms) => c.post('/dev/clock', { advance_ms: ms });
  const HOUR = 3600 * 1000;

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('F75-01 — LEJÁRT MEGERŐSÍTÉS: A FOLYTATÁS (CHR-01)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  const anna = new Client(base);
  await anna.post('/api/register', { email: 'anna@pelda.hu', password: 'anna-titok-1' });
  const L1 = await linkFor(anna, 'anna@pelda.hu', 'Erősítsd meg');
  step('(a) regisztráció → EGY megerősítő levél', !!L1 && (await mailsOf(anna)).length === 1);

  await advance(anna, 25 * HOUR);                       // TÁMOGATOTT ÓRA — nem várunk 24 órát
  let r = await anna.get(pathOf(L1));
  step('(b) 25 óra múlva a hivatkozás LEJÁRT — nevezett elutasítás',
    r.status === 400 && String(r.body).includes('challenge_expired'));
  step('(b/2) …és a lap FOLYTATÁST ad (új hivatkozás kérése), nem „regisztrálj újra"',
    String(r.body).includes('verify-resend-link') && !String(r.body).includes('regisztrálj újra'));

  const before01 = businessRowCounts();
  r = await anna.post('/api/verification/resend', { email: 'anna@pelda.hu' });
  const NEUTRAL_RESEND = JSON.stringify(r.body);
  step('(c) új hivatkozás kérése → semleges válasz (200)', r.status === 200 && r.body.ok === true, r.body.message);
  const L2 = await linkFor(anna, 'anna@pelda.hu', 'Új megerősítő');
  step('(c/2) …és ÚJ levél a fogadóban, ÚJ hivatkozással', !!L2 && L2 !== L1);
  step('(c/3) az újrakérés NEM nyúlt a fiókhoz, csak kihívást írt',
    businessRowCounts().challenge === before01.challenge + 1
    && businessRowCounts().subject === before01.subject && businessRowCounts().book === before01.book);

  r = await anna.get(pathOf(L1));
  step('(d) a LEJÁRT hivatkozás az újrakérés után sem éled újra',
    r.status === 400 && String(r.body).includes('challenge_expired'));

  r = await anna.get(pathOf(L2));
  step('(e) az ÚJ hivatkozás MŰKÖDIK — a csatorna bizonyítva (pozitív ellenpár)',
    r.status === 200 && String(r.body).includes('data-ok="true"'));

  r = await anna.get(pathOf(L2));
  step('(f) a BEVÁLTOTT hivatkozás másodszor nevezetten elakad',
    r.status === 400 && String(r.body).includes('challenge_already_used'));

  r = await anna.post('/api/login', { email: 'anna@pelda.hu', password: 'anna-titok-1' });
  step('(g) az EREDETI jelszó változatlanul működik — az újrakérés nem hitelesítő-művelet',
    r.status === 200 && r.body.ok === true, { subject: r.body.subject_id });
  const annaId = r.body.subject_id;
  r = await anna.post('/api/workspaces', { name: 'Családi Kft', plan: 'starter' });
  step('(g/2) …és a munkakörnyezet MOST elindítható (korábban: creator_channel_unproven)',
    r.status === 201 && r.body.ok === true, { book: r.body.book_id });
  const csalad = r.body.book_id;

  // A LEVÁLTÁS SZABÁLYA — új hivatkozás kiadása a korábbi ÉLŐ hivatkozást lezárja.
  const dora = new Client(base);
  await dora.post('/api/register', { email: 'dora@pelda.hu', password: 'dora-titok-1' });
  const D1 = await linkFor(dora, 'dora@pelda.hu', 'Erősítsd meg');
  await advance(dora, 2 * 60 * 1000);                   // a 60 mp-es ismétlés-korlát fölé
  await dora.post('/api/verification/resend', { email: 'dora@pelda.hu' });
  const D2 = await linkFor(dora, 'dora@pelda.hu', 'Új megerősítő');
  r = await dora.get(pathOf(D1));
  step('(h) a RÉGI, még élő hivatkozás LEVÁLTVA (challenge_superseded), nem „lejárt" és nem „beváltott"',
    r.status === 400 && String(r.body).includes('challenge_superseded'));
  r = await dora.get(pathOf(D2));
  step('(h/2) a LEGUTÓBBI hivatkozás működik (pozitív ellenpár)',
    r.status === 200 && String(r.body).includes('data-ok="true"'));

  // AZ ISMÉTLÉS KORLÁTOS — és a válasz MINDEN ágon bájtra azonos (anti-enumeráció).
  const emil = new Client(base);
  await emil.post('/api/register', { email: 'emil@pelda.hu', password: 'emil-titok-1' });
  const mailsBefore = (await mailsOf(emil)).length;
  r = await emil.post('/api/verification/resend', { email: 'emil@pelda.hu' });
  step('(i) 60 mp-en belüli ismétlés → NEM megy levél, a válasz mégis ugyanaz',
    JSON.stringify(r.body) === NEUTRAL_RESEND && (await mailsOf(emil)).length === mailsBefore);
  for (let i = 0; i < 6; i += 1) { await advance(emil, 2 * 60 * 1000); await emil.post('/api/verification/resend', { email: 'emil@pelda.hu' }); }
  const emilChallenges = count("SELECT COUNT(*) FROM channel_challenge WHERE value_norm = 'emil@pelda.hu'");
  step('(i/2) az ablakon belül legfeljebb 5 kihívás születik — a korlát MÉRVE',
    emilChallenges <= CHALLENGE_POLICY.max_per_window, { kihivas: emilChallenges, plafon: CHALLENGE_POLICY.max_per_window });

  r = await emil.post('/api/verification/resend', { email: 'nincs-ilyen@pelda.hu' });
  step('(j) ISMERETLEN címre ugyanaz a semleges válasz, levél nélkül',
    JSON.stringify(r.body) === NEUTRAL_RESEND && !(await mailsOf(emil)).some((m) => m.to === 'nincs-ilyen@pelda.hu'));
  const annaMails = (await mailsOf(anna)).filter((m) => m.to === 'anna@pelda.hu').length;
  r = await anna.post('/api/verification/resend', { email: 'anna@pelda.hu' });
  step('(k) MÁR BIZONYÍTOTT címre ugyanaz a semleges válasz, levél nélkül',
    JSON.stringify(r.body) === NEUTRAL_RESEND && (await mailsOf(anna)).filter((m) => m.to === 'anna@pelda.hu').length === annaMails);

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('L11 — A SZEMÉLYES KÖR (SZK-01)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  const gabi = new Client(base);
  await gabi.post('/api/register', { email: 'gabi@pelda.hu', password: 'gabi-titok-1' });
  await gabi.get(pathOf(await linkFor(gabi, 'gabi@pelda.hu', 'Erősítsd meg')));
  r = await gabi.post('/api/login', { email: 'gabi@pelda.hu', password: 'gabi-titok-1' });
  const gabiId = r.body.subject_id;
  r = await gabi.get('/api/me');
  step('(a) egyszerű regisztráció után VAN hova belépni: EGY személyes kör, név-kitalálás nélkül',
    r.body.workspaces.length === 1 && r.body.workspaces[0].personal === true && r.body.current_book_id === r.body.personal_book_id,
    { nev: r.body.workspaces[0].name, acting_as: r.body.acting_as });
  step('(a/2) a képernyő KIMONDJA, ki nevében jár el', typeof r.body.acting_as === 'string' && r.body.acting_as.includes('gabi@pelda.hu') && r.body.acting_as.includes('személyes kör'));
  r = await gabi.get('/api/data/stock');
  step('(a/3) a személyes körben az adat OLVASHATÓ (a kör nem dísz)', r.body.ok === true && r.body.result && r.body.result.qty === '12', r.body.result);

  r = await gabi.post('/api/workspaces', { name: 'Gabi Egyéni Vállalkozó', plan: 'starter', business: { jurisdiction: 'HU', tax_id: '87654321-1-13' } });
  step('(b) adószámos tevékenység indul — a FIÓK ugyanaz marad (nem új személyazonosság)',
    r.status === 201 && r.body.ok === true, { book: r.body.book_id });
  r = await gabi.get('/api/me');
  step('(b/2) a személyes kör ÉRINTETLEN, a váltóban mindkettő ott van, a személyes ELÖL',
    r.body.subject_id === gabiId && r.body.workspaces.length === 2 && r.body.workspaces[0].personal === true
    && r.body.workspaces.filter((w) => w.personal).length === 1 && r.body.personal_book_id === r.body.workspaces[0].book_id);
  step('(b/3) a tárolóban is EGY személyes kör tartozik hozzá', count('SELECT COUNT(*) FROM personal_space WHERE subject_id = ?', gabiId) === 1);
  await gabi.post('/api/logout');
  await gabi.post('/api/login', { email: 'gabi@pelda.hu', password: 'gabi-titok-1' });
  step('(c) újabb belépés NEM gyárt második személyes kört (idempotens)',
    count('SELECT COUNT(*) FROM personal_space WHERE subject_id = ?', gabiId) === 1);

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('F75-03 — A BEMENETI SÉMA A KÜLSŐ HATÁRON (HTP-01)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  const before03 = businessRowCounts();
  r = await anna.post('/api/workspaces', { name: { invalid: true }, plan: 'starter' });
  step('(a) A LELET MAGA: {"name":{"invalid":true}} → 400 invalid_type, nem 201',
    r.status === 400 && r.body.reason === 'invalid_type' && r.body.field === 'name' && r.body.refused_by === 'input_schema', r.body.message);
  step('(a/2) …és a tárolóban NEM született könyv (sem „[object Object]" nevű)',
    businessRowCounts().book === before03.book && count("SELECT COUNT(*) FROM book WHERE name = '[object Object]'") === 0);

  r = await anna.post('/api/workspaces', { plan: 'starter' });
  step('(b) hiányzó kötelező mező → missing_field (nem „rossz típus")', r.status === 400 && r.body.reason === 'missing_field' && r.body.field === 'name');
  r = await anna.post('/api/workspaces', { name: 'X', plan: 'starter', actor: annaId });
  step('(c) IDEGEN mező állapotváltoztató végponton → unknown_field ELUTASÍTÁS (nem „param_ignored")',
    r.status === 400 && r.body.reason === 'unknown_field' && r.body.field === 'actor' && r.body.param_ignored === undefined, r.body.message);
  r = await anna.post('/api/members/revoke', { subject_id: annaId, book_id: csalad });
  step('(c/2) a KÖNYVET megnevező kliens-mező is elutasítás a határon', r.status === 400 && r.body.reason === 'unknown_field' && r.body.field === 'book_id');

  step('(d) az ÖRÖKÖLT tulajdonság-nevek nem adnak sémát (saját kulcsos feloldás)',
    schemaForEndpoint('toString') === null && schemaForEndpoint('constructor') === null && schemaForEndpoint('__proto__') === null
    && schemaForEndpoint(42) === null && schemaForEndpoint({}) === null);
  r = await anna.post('/api/toString', {});
  step('(d/2) …és HTTP-n is nevezett 404, nem programhiba', r.status === 404 && r.body.reason === 'unknown_endpoint');

  r = await anna.raw('/api/workspaces', '{"name":"X","plan":"starter","__proto__":{"polluted":true}}');
  step('(e) a `__proto__` mező NEVEZETT elutasítás, és az Object.prototype ÉRINTETLEN',
    r.status === 400 && r.body.reason === 'unknown_field' && ({}).polluted === undefined, r.body.field);

  r = await anna.post('/api/workspaces', { name: 'Verzió-próba', plan: 'starter', schema_version: '1' });
  step('(f) a MEGERŐSÍTETT sémaverzió átmegy (a regiszter választ, a beadó megerősít)', r.status === 201 && r.body.ok === true);
  r = await anna.post('/api/workspaces', { name: 'Verzió-próba 2', plan: 'starter', schema_version: '2' });
  step('(f/2) az ELTÉRŐ sémaverzió nevezetten elakad', r.status === 400 && r.body.reason === 'unsupported_schema_version', r.body.message);
  r = await anna.post('/api/workspaces', { name: 'Verzió-próba 3', plan: 'starter', schema_version: 7 });
  step('(f/3) …rossz TÍPUSÚ verzió-megnevezésre is ugyanaz', r.status === 400 && r.body.reason === 'unsupported_schema_version');

  r = await anna.post('/api/session/workspace?actor=valaki', { book_id: csalad });
  step('(g) állapotváltoztató végponton a LEKÉRDEZÉS-mező is elutasítás', r.status === 400 && r.body.reason === 'unknown_field' && r.body.where === 'query');

  r = await anna.get(`/api/data/stock?book_id=${csalad}&actor=${annaId}`);
  step('(h) OLVASÓ végponton marad a NEVEZETT figyelmen kívül hagyás (a régi szerződés)',
    r.body.param_ignored === true && r.body.ignored_params.includes('book_id') && r.body.ignored_params.includes('actor'), r.body.ignored_params);

  r = await anna.post('/api/workspaces', { name: 'Beágyazott', plan: 'starter', business: 'igen' });
  step('(k) a beágyazott objektum TÍPUSA is szerződés', r.status === 400 && r.body.reason === 'invalid_type' && r.body.field === 'business');
  r = await anna.post('/api/workspaces', { name: 'Beágyazott', plan: 'starter', business: { tax_id: 5 } });
  step('(k/2) …és a MEZŐI is, pontos hely-megnevezéssel', r.status === 400 && r.body.reason === 'invalid_type' && r.body.field === 'business.tax_id', r.body.field);
  r = await anna.post('/api/workspaces', { name: 'Beágyazott', plan: 'starter', business: { tax_id: '1', extra: 1 } });
  step('(k/3) …az idegen beágyazott mező is nevezett', r.status === 400 && r.body.reason === 'unknown_field' && r.body.field === 'business.extra');
  r = await anna.post('/api/workspaces', { name: 'Beágyazott', plan: 'starter', business: { tax_id: '   ' } });
  step('(k/4) az ÜRES adószám nevezett elutasítás (a régi R64-javítás megmarad)', r.status === 400 && (r.body.reason === 'invalid_type' || r.body.reason === 'invalid_value'), r.body.reason);

  const beforeBatch = businessRowCounts();
  const beforeCookie = anna.cookie;
  for (const bad of [
    { path: '/api/workspaces', body: { name: 42, plan: 'starter' } },
    { path: '/api/invites', body: { email: 'x@pelda.hu', role: 'tulaj', scope: 'keszlet' } },
    { path: '/api/members/scope', body: { subject_id: annaId, scope: 'penzugy' } },
    { path: '/api/session/workspace', body: { book_id: 7 } },
    { path: '/api/login', body: { email: 'anna@pelda.hu' } },
  ]) { await anna.post(bad.path, bad.body); }
  const afterBatch = businessRowCounts();
  step('(i) ÖT elutasított kérés UTÁN egyetlen üzleti/jogosultsági/tagsági sor sem született',
    JSON.stringify(beforeBatch) === JSON.stringify(afterBatch), { elotte: beforeBatch, utana: afterBatch });
  step('(i/2) a megengedett TECHNIKAI munkamenet-kezelés külön mérve: a süti nem változott',
    anna.cookie === beforeCookie);

  r = await anna.post('/api/workspaces', { name: 'Jó kérés', business: { tax_id: '11111111-1-11', jurisdiction: 'HU' } });
  step('(j) POZITÍV ELLENPÁR: a jó kérés változatlanul működik, a terv DEKLARÁLT alapértelmezéssel',
    r.status === 201 && r.body.ok === true && r.body.workspace.plan === 'starter'
    && Array.isArray(r.body.defaults_applied) && r.body.defaults_applied.includes('plan'), r.body.defaults_applied);
  step('(j/2) …és a vállalkozási minőség továbbra is ÖNBEVALLOTT (verification: none_available)',
    r.body.business && r.body.business.verification === 'none_available' && r.body.representation && r.body.representation.basis === 'self_declared');

  r = await anna.post('/api/workspaces', { name: 'Ismeretlen joghatóság', plan: 'starter', business: { jurisdiction: 'egyeb', tax_id: '99999999-9-99' } });
  step('(m) az ISMERETLEN joghatóság NEM tiltás a határon (H12): a saját kör elindul, a profil „ismeretlen"',
    r.status === 201 && r.body.ok === true && r.body.business && r.body.business.ok === true
    && r.body.business.verification === 'none_available', { jurisdiction: r.body.business && r.body.business.jurisdiction });

  step('(l) MINDEN kezelőnek van deklarált sémája (fail-closed indulás)',
    HTP_CONTRACT.gated_endpoints.length > 0 && HTP_CONTRACT.read_endpoints.length > 0
    && Object.keys(ENDPOINT_SCHEMAS).every((k) => schemaForEndpoint(k) !== null),
    { kapuzo: HTP_CONTRACT.gated_endpoints.length, olvaso: HTP_CONTRACT.read_endpoints.length });

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('F75-02 — A KONTEXTUS MEGERŐSÍTÉSE A SZERVEREN (KTX-01)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Anna két könyve: a „Családi Kft" és a személyes köre. Béla a Családi Kft tagja lesz.
  const bela = new Client(base);
  await bela.post('/api/register', { email: 'bela@pelda.hu', password: 'bela-titok-1' });
  await bela.get(pathOf(await linkFor(bela, 'bela@pelda.hu', 'Erősítsd meg')));
  r = await bela.post('/api/login', { email: 'bela@pelda.hu', password: 'bela-titok-1' });
  const belaId = r.body.subject_id;
  await anna.post('/api/session/workspace', { book_id: csalad });
  r = await anna.post('/api/invites', { email: 'bela@pelda.hu', role: 'user', scope: 'keszlet' });
  const inviteToken = r.body.token;
  r = await bela.post('/api/invites/redeem', { token: inviteToken });
  step('(elő) Béla beváltja a meghívót — tagság születik', r.body.ok === true && r.body.book_id === csalad);
  r = await bela.get('/api/me');
  step('(elő/2) Béla SZEMÉLYES köre a meghívó elfogadása után is megvan (L11)',
    r.body.workspaces.length === 2 && r.body.workspaces.filter((w) => w.personal).length === 1 && r.body.subject_id === belaId);

  // A VERSENY: Anna „a Családi Kft képernyőjén áll", de a munkamenete közben átváltott a személyes körre.
  const annaMe = (await anna.get('/api/me')).body;
  await anna.post('/api/session/workspace', { book_id: annaMe.personal_book_id });
  const beforeCtx = businessRowCounts();
  r = await anna.post('/api/members/revoke', { subject_id: belaId, expected_book_id: csalad });
  step('(a) a RÉGI képernyőn indított megvonás nevezetten elakad (409 context_mismatch)',
    r.status === 409 && r.body.reason === 'context_mismatch' && r.body.expected_book_id === csalad, r.body.current_book_id);
  step('(a/2) …és NEM írt: Béla tagsága változatlan',
    JSON.stringify(businessRowCounts()) === JSON.stringify(beforeCtx)
    && count('SELECT COUNT(*) FROM membership WHERE subject_id = ? AND book_id = ? AND revoked_at IS NULL', belaId, csalad) === 1);

  r = await anna.post('/api/members/scope', { subject_id: belaId, scope: 'keszlet', expected_book_id: csalad });
  step('(a/3) ugyanez a jogadásra is áll — egy régi gomb nem ad jogot az új kör nevében',
    r.status === 409 && r.body.reason === 'context_mismatch');

  // A MEGERŐSÍTÉS NEM FELHATALMAZÁS: a mező nem VÁLASZT könyvet. Béla a SAJÁT körébe vált, és
  // onnan hivatkozik a Családi Kft-re — a művelet a SAJÁT körében sem indul el idegen könyvre.
  const belaMe = (await bela.get('/api/me')).body;
  await bela.post('/api/session/workspace', { book_id: belaMe.personal_book_id });
  r = await bela.post('/api/members/scope', { subject_id: belaId, scope: 'keszlet', expected_book_id: csalad });
  step('(b) a megerősítő mező NEM ad hatóságot: Béla a saját körében áll, a Családi Kft-re hivatkozás elakad',
    r.status === 409 && r.body.reason === 'context_mismatch' && r.body.current_book_id === belaMe.personal_book_id,
    { current: r.body.current_book_id });
  r = await bela.post('/api/session/workspace', { book_id: csalad });
  step('(b/2) …és Béla vissza tud váltani a céges körre (a tagsága él)', r.status === 200 && r.body.ok === true);

  await anna.post('/api/session/workspace', { book_id: csalad });
  r = await anna.post('/api/members/scope', { subject_id: belaId, scope: 'keszlet', expected_book_id: csalad });
  step('(c) POZITÍV ELLENPÁR: a HELYES körben ugyanaz a művelet működik', r.status === 200 && r.body.ok === true, r.body.scope);
  r = await bela.get('/api/data/stock');
  step('(c/2) …és a megadott jog a tag oldalán is látszik', r.body.ok === true && r.body.result.qty === '12');
  r = await anna.post('/api/members/revoke', { subject_id: belaId });
  step('(d) a megerősítő mező NEM kötelező — nélküle a régi út változatlan (visszafelé kompatibilis)',
    r.status === 200 && r.body.ok === true && r.body.revocation.reason === 'revocation_recorded');

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('H06/H09 — LEJÁRATI ÁGAK TÁMOGATOTT ÓRÁVAL (HTTP szint)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  const cili = new Client(base);
  await cili.post('/api/register', { email: 'cili@pelda.hu', password: 'cili-titok-1' });
  await cili.get(pathOf(await linkFor(cili, 'cili@pelda.hu', 'Erősítsd meg')));
  await cili.post('/api/login', { email: 'cili@pelda.hu', password: 'cili-titok-1' });
  r = await anna.post('/api/invites', { email: 'cili@pelda.hu', role: 'user', scope: 'keszlet' });
  const ciliInvite = r.body.token;
  await advance(anna, 8 * 24 * HOUR);                    // a 7 napos ablakon TÚL
  r = await cili.get(`/api/invites/observe?token=${ciliInvite}`);
  step('(a) a LEJÁRT meghívó a lapon sem ígér beváltást', r.body.status === 'not_actionable', { reason: r.body.reason });
  const beforeExpiry = businessRowCounts();
  r = await cili.post('/api/invites/redeem', { token: ciliInvite });
  step('(a/2) …és a beváltás nevezetten elakad, tagság NÉLKÜL',
    r.body.ok === false && JSON.stringify(businessRowCounts()) === JSON.stringify(beforeExpiry), r.body.reason);
  r = await anna.post('/api/invites', { email: 'cili@pelda.hu', role: 'user', scope: 'keszlet' });
  r = await cili.post('/api/invites/redeem', { token: r.body.token });
  step('(b) POZITÍV ELLENPÁR: FRISS meghívó az ablakon belül beváltható', r.body.ok === true && r.body.book_id === csalad);

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('L2 / L3 — A KÉPVISELETI HATÁR ÉS A KÖZÖS JÓVÁHAGYÁS (REP-01 · mérve)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  const own = representationCheck({ operationClass: 'own_self_declared_work' });
  step('(a) saját, önbevallott munkatér: ENGEDETT, képviseleti igazolás nélkül',
    own.allowed === true && own.basis === 'self_declared', own.stated_limit);
  const rep = representationCheck({ operationClass: 'represent_existing_legal_person' });
  step('(b) MÁS jogalany képviselete: nevezetten ZÁRVA, cserélhető adapter helyével',
    rep.allowed === false && rep.reason === 'representation_unproven' && rep.adapter === 'none_available' && rep.closes === 'only_this_operation');
  step('(b/2) …és a zárás CSAK azt a műveletet zárja — a regisztrációt és a saját munkát nem',
    Array.isArray(rep.does_not_close) && rep.does_not_close.includes('registration') && rep.does_not_close.includes('own_self_declared_work'));
  const unknownClass = representationCheck({ operationClass: 'akarmi' });
  step('(c) ISMERETLEN osztály FAIL-CLOSED', unknownClass.allowed === false && unknownClass.reason === 'unknown_representation_class');
  step('(c/2) a szerződés kimondja a mai hiányt (nulla adapter, nulla ilyen művelet)',
    REP_CONTRACT.adapters.length === 0 && typeof REP_CONTRACT.stated_gap === 'string');

  // L3 — KÖZÖS JÓVÁHAGYÁS: a rendszer nem ígérheti, amit nem tud. A bizonyíték FORRÁS-MÉRÉS.
  const sources = ['v3app/server.mjs', 'v3app/public/app.js', 'v3app/public/index.html']
    .map((f) => readFileSync(join(ROOT, f), 'utf8'));
  const promises = sources.join('\n').match(/két\s*(személyes|jóváhagyó)|kettős jóváhagyás|dual[_ -]?approval|second approver/gi) || [];
  step('(L3) a felület és a héj SEHOL nem ígér közös (kétszemélyes) jóváhagyást — mérve: 0 találat',
    promises.length === 0, { talalat: promises.length });

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('L10 — AZ A01–A18 MEGFELELTETÉS (a lap és a FORRÁS viszonya, mérve)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  // MIÉRT ITT. A megfeleltetés PRÓZA — a tartalmát gép nem tudja igazolni. Amit VISZONT tud: hogy
  // mind a 18 eset szerepel, hogy az azonosítók a FORRÁS-DOKUMENTUMBÓL jönnek (nem emlékezetből),
  // hogy egyetlen mező sem üres, és hogy az ÖSSZEGZÉS a sorokból SZÁMOLT szám, nem gépelt (KUKA-033:
  // a szám mérés, nem állítás; KUKA-054: a saját jelentésem száma is mérendő).
  const mapPath = join(ROOT, 'docs/70_PLANNING/V3_R75_A01_A18_MEGFELELTETES.json');
  const mapping = JSON.parse(readFileSync(mapPath, 'utf8'));
  const r32 = readFileSync(join(ROOT, 'v3ref/source-documents/R32_board_v1.md'), 'utf8');
  const srcIds = [...new Set((r32.match(/^\| (A\d{2}) \|/gm) || []).map((m) => m.slice(2, 5)))];
  step('(a) a FORRÁS-dokumentumban 18 A-eset áll, és a lap PONTOSAN ezeket viszi',
    srcIds.length === 18 && mapping.cases.length === 18
    && mapping.cases.every((c) => srcIds.includes(c.id)) && srcIds.every((id) => mapping.cases.some((c) => c.id === id)),
    { forrasban: srcIds.length, lapon: mapping.cases.length });
  const ALLOWED = ['fedett', 'reszben', 'nevezett_hiany'];
  step('(b) minden sor teljes: állapot a három szó egyike · mi működik ma · bizonyíték · maradék · mit blokkol',
    mapping.cases.every((c) => ALLOWED.includes(c.allapot)
      && typeof c.mukodik_ma === 'string' && c.mukodik_ma.length > 40
      && Array.isArray(c.bizonyitek) && c.bizonyitek.length > 0
      && typeof c.maradek === 'string' && c.maradek.length > 20
      && typeof c.blokkol === 'string' && c.blokkol.length > 3));
  const counted = mapping.cases.reduce((acc, c) => ({ ...acc, [c.allapot]: (acc[c.allapot] || 0) + 1 }), {});
  step('(c) az ÖSSZEGZÉS a sorokból számolva egyezik (nem gépelt szám)',
    Number(mapping.summary.fedett) === (counted.fedett || 0)
    && Number(mapping.summary.reszben) === (counted.reszben || 0)
    && Number(mapping.summary.nevezett_hiany) === (counted.nevezett_hiany || 0)
    && Number(mapping.summary.osszesen) === mapping.cases.length,
    { lapon: mapping.summary, szamolva: counted });

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('L8 — A MEGVONÁSI KLAUZULÁK SZÁMA A REGISZTERBŐL (nem emlékezetből)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  // AZ ELLENTMONDÁS, amit ez lezár: az R64-es lap L8 sora „mind a 13 klauzulá"-t írt lezárási
  // feltételnek, ugyanannak a lapnak az OB-5 bekezdése viszont 15-öt. A szám nem vélemény: a
  // REGISZTERBŐL mérjük, és a lezárási lista ehhez van kötve (KUKA-033 · KUKA-050).
  const { REVOCATION_NORMS } = await import('../v3ref/norms.mjs');
  const revClauses = REVOCATION_NORMS.flatMap((n) => n.clauses || []);
  const revOpen = revClauses.filter((c) => c.gap).map((c) => c.id);
  const closingList = JSON.parse(readFileSync(join(ROOT, 'docs/70_PLANNING/V3_CORE_LEZARASI_LISTA.json'), 'utf8'));
  const l8 = closingList.rows.find((r) => r.id === 'L8');
  step('(a) a lezárási lista L8 sorának SZÁMAI a regiszterrel egyeznek',
    l8 && l8.mert_szamok.klauzula === revClauses.length
    && l8.mert_szamok.nyitott === revOpen.length
    && l8.mert_szamok.hiany_nelkul === revClauses.length - revOpen.length
    && JSON.stringify([...l8.mert_szamok.nyitott_id].sort()) === JSON.stringify([...revOpen].sort()),
    { regiszter: { klauzula: revClauses.length, nyitott: revOpen } });
  step('(b) a lezárási feltétel szövege a MÉRT számot mondja (nem a régi 13-at)',
    typeof l8.lezarasi_feltetel === 'string' && l8.lezarasi_feltetel.includes(String(revClauses.length)) && !/mind a 13/.test(l8.lezarasi_feltetel));
  const L_IDS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11'];
  const ALLOWED_STATUS = ['nyitott', 'lezart', 'dontes_megvan'];
  step('(c) a lista TELJES (L1…L11), minden sor állapota a három szó egyike, és minden LEZÁRT sor visz bizonyítékot ÉS kimondott maradékot',
    L_IDS.every((id) => closingList.rows.some((r) => r.id === id))
    && closingList.rows.length === L_IDS.length
    && closingList.rows.every((r) => ALLOWED_STATUS.includes(r.allapot))
    && closingList.rows.filter((r) => r.allapot === 'lezart').every((r) => Array.isArray(r.bizonyitek) && r.bizonyitek.length > 0 && typeof r.maradek_kimondva === 'string' && r.maradek_kimondva.length > 20),
    { lezart: closingList.rows.filter((r) => r.allapot === 'lezart').map((r) => r.id) });

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('A FEJLESZTŐI FELÜLET HATÁRA');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  const closed = await startServer({ port: 0, dbPath: dbPath.replace('.sqlite', '_zart.sqlite'), devSurface: false });
  const closedClient = new Client(`http://127.0.0.1:${closed.port}`);
  const m1 = await closedClient.get('/dev/mailbox');
  const c1 = await closedClient.post('/dev/clock', { advance_ms: 1000 });
  step('a fejlesztői levél-fogadó és óra KIKAPCSOLVA nem létezik (404, nem „letiltva")',
    m1.status === 404 && m1.body.reason === 'unknown_endpoint' && c1.status === 404);
  await closed.close();
  for (const suffix of ['', '-wal', '-shm']) {
    const f = dbPath.replace('.sqlite', '_zart.sqlite') + suffix;
    if (existsSync(f)) rmSync(f, { force: true });
  }
} finally {
  db.close();
  await app.close();
  for (const suffix of ['', '-wal', '-shm']) { if (existsSync(dbPath + suffix)) rmSync(dbPath + suffix, { force: true }); }
}

const pass = results.filter((x) => x.pass).length;
console.log(`\nR75 lelet-battéria: ${pass}/${results.length} PASS${pass === results.length ? '' : ' · ' + (results.length - pass) + ' FAIL'}`);
if (pass !== results.length) {
  for (const x of results.filter((y) => !y.pass)) console.log(`  BUKOTT: [${x.section}] ${x.name}`);
  process.exit(1);
}
