// v3app/findings_r77.mjs — AZ R77 KÉT LELETÉNEK CÉLZOTT PIROS/ZÖLD PRÓBÁI (CMD-VS-300-002-002 R77).
//
// A KÉT LELET (mindkettő a külső ellenőrző fél — chatgpt-v3 — mérése, valódi HTTP-n és SQLite-on):
//
//   F77-01  A MÁSIK LAP /me UTÁNI VÁLTÁSA ROSSZ FEJLÉC ALÁ AD ADATOT. A lap A-ra szóló `/me`-t kap,
//           közben a másik lap (közös süti) átvált B-re, és a rákövetkező adat-kérést a szerver MÁR
//           B-re szolgálja ki — a fejléc A-t mutat, a panel B adatát. A taglistán VAN könyv-kötés
//           (`book_id` a válaszban), az ADAT-utakon nem volt.
//
//   F77-02  HIBÁS ADÓSZÁM UTÁN 500 ÉS FÉLKÉSZ MUNKAKÖRNYEZET. A `{"tax_id":"---"}` normalizálva
//           ÜRES; a séma ezt nem fogta meg, a `createWorkspace` viszont MÁR véglegesített, mire az
//           `attachBusinessIdentity` saját tranzakciója elbukott: HTTP 500, és a könyv + indulási
//           jogok ott maradtak (1 → 2 munkakörnyezet).
//
// MINDEN TILTÁS MELLETT OTT A POZITÍV ELLENPÁR (KUKA-051), és minden „nem írt" állítás a TÁROLÓBÓL
// mérve áll, második kapcsolaton (KUKA-054: a saját jelentés száma is mérendő).
import { rmSync, existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { startServer } from './server.mjs';
import { openStoreAt } from '../v3ref/store.mjs';

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

const dbPath = resolve(ROOT, artifactPath({ area: 'tmp', kind: 'v3app_r77_leletek', ext: 'sqlite', version: VERSION }));
const app = await startServer({ port: 0, dbPath });
const base = `http://127.0.0.1:${app.port}`;
console.log(`R77 lelet-battéria: ${base}  · tároló: ${dbPath}`);

const db = openStoreAt(dbPath, { timeoutMs: 5000 });
const count = (sql, ...p) => { const r = db.get(sql, ...p); return r ? Number(Object.values(r)[0]) : 0; };
/** A TELJES üzleti nyom egy helyen — az „elutasításkor üzleti változás ne maradjon" mérése. */
const businessRows = () => ({
  book: count('SELECT COUNT(*) FROM book'),
  bootstrap: count('SELECT COUNT(*) FROM workspace_bootstrap'),
  membership: count('SELECT COUNT(*) FROM membership'),
  grant: count('SELECT COUNT(*) FROM membership_grant'),
  basis: count('SELECT COUNT(*) FROM authority_basis'),
  adjudication: count('SELECT COUNT(*) FROM adjudication_authority'),
  scope_grant: count('SELECT COUNT(*) FROM scope_grant'),
  entitlement: count('SELECT COUNT(*) FROM entitlement_profile'),
  business: count('SELECT COUNT(*) FROM business_identity'),
  subject: count('SELECT COUNT(*) FROM subject'),
  external_id: count('SELECT COUNT(*) FROM external_id'),
  command: count('SELECT COUNT(*) FROM command'),
  personal: count('SELECT COUNT(*) FROM personal_space'),
});

try {
  const mailsOf = async (c) => (await c.get('/dev/mailbox')).body.mails;
  const verifyLinkOf = async (c, email) => {
    const m = (await mailsOf(c)).find((x) => x.to === email && x.subject.includes('Erősítsd meg'));
    if (!m) return null;
    const u = new URL(m.link); return u.pathname + u.search;
  };
  /** Kész fiók: regisztráció → megerősítés → belépés (a felhasználó útján, végpontokon). */
  async function person(email, password = 'proba-jelszo-2026') {
    const c = new Client(base);
    await c.post('/api/register', { email, password });
    await c.get(await verifyLinkOf(c, email));
    const login = await c.post('/api/login', { email, password });
    return { c, email, password, subjectId: login.body.subject_id };
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('F77-01 — A MÁSIK LAP VÁLTÁSA UTÁN AZ ADAT-OLVASÁS (KTX-02)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  const anna = await person('anna@pelda.hu');
  let r = await anna.c.post('/api/workspaces', { name: 'A STARTER', plan: 'starter' });
  const A = r.body.book_id;
  r = await anna.c.post('/api/workspaces', { name: 'B PRO', plan: 'pro' });
  const B = r.body.book_id;
  await anna.c.post('/api/session/workspace', { book_id: A });

  // KONTROLL: A-ban állva az ár-nézet az ELŐFIZETÉS-kapun akad el (starter terv).
  r = await anna.c.get('/api/data/price');
  step('(kontroll) A-ban (starter) az ár-nézet az előfizetés-kapun akad el',
    r.body.ok === false && r.body.refused_by === 'entitlement', r.body.refused_by);

  // A LELET: a lap A-ra szóló /me-t kap; a MÁSIK lap átvált B-re; a lap ezután kér adatot.
  const meForA = await anna.c.get('/api/me');
  const masikLap = anna.c.tab();
  await masikLap.post('/api/session/workspace', { book_id: B });
  const naiv = await anna.c.get('/api/data/price');            // a RÉGI alak: kötés nélküli kérés
  step('(a) a lap A-t hisz (a /me A-ra szólt), a másik lap közben B-re váltott',
    meForA.body.current_book_id === A && (await masikLap.get('/api/me')).body.current_book_id === B);
  // A JAVÍTÁS UTÁN: a válasz KIMONDJA, melyik könyvet szolgálta ki — a kliens ebből tud dönteni.
  step('(b) MINDEN kontextusfüggő válasz megmondja a TÉNYLEGES kontextust (served_book_id · served_subject_id)',
    naiv.body.served_book_id === B && naiv.body.served_subject_id === anna.subjectId,
    { served_book_id: naiv.body.served_book_id, served_subject_id: naiv.body.served_subject_id });

  // A KÖTÖTT KÉRÉS: a lap megmondja, MELYIK nézetben indult — eltérésnél nincs adat.
  const kotott = await anna.c.get(`/api/data/price?expected_book_id=${A}&expected_subject_id=${anna.subjectId}`);
  step('(c) a NÉZETHEZ KÖTÖTT kérés eltérő kontextuson nevezetten elakad (409), adat NÉLKÜL',
    kotott.status === 409 && kotott.body.reason === 'context_mismatch' && kotott.body.result === null
    && kotott.body.expected_book_id === A && kotott.body.served_book_id === B, kotott.body.reason);
  step('(c/2) …és a válasz NEM mondja „kiadva"-nak', !/kiadva/i.test(String(kotott.body.message || '')));

  // UGYANEZ A KÉSZLET-ÚTON (nem egyetlen időzítési pontot javítunk).
  const kotottStock = await anna.c.get(`/api/data/stock?expected_book_id=${A}`);
  step('(d) ugyanez a KÉSZLET-úton is áll', kotottStock.status === 409 && kotottStock.body.reason === 'context_mismatch');

  // A TAGLISTA meglévő védelme NEM romolhat, és ugyanígy kötött.
  const kotottMembers = await anna.c.get(`/api/members?expected_book_id=${A}`);
  step('(e) a TAGLISTA is a nézethez kötött (a meglévő book_id-kötés megmarad)',
    kotottMembers.status === 409 && kotottMembers.body.reason === 'context_mismatch');

  // POZITÍV ELLENPÁR: a MAI nézethez kötött kérés kiszolgálva (a kötés nem bénítja a jó esetet).
  const jo = await anna.c.get(`/api/data/price?expected_book_id=${B}&expected_subject_id=${anna.subjectId}`);
  step('(f) POZITÍV ELLENPÁR: a MAI nézethez kötött kérés kiszolgálva (B pro → ár kiadva)',
    jo.status === 200 && jo.body.ok === true && jo.body.result && jo.body.result.unit_price === 3490
    && jo.body.served_book_id === B, jo.body.reason);
  const joStock = await anna.c.get(`/api/data/stock?expected_book_id=${B}`);
  step('(f/2) …és a készlet-út is (a kötés nem tiltás)', joStock.body.ok === true && joStock.body.result.qty === '12');

  // AZ ALANY VÁLTÁSA IS KONTEXTUS-VÁLTÁS: a másik lap kilép és MÁS fiókkal lép be.
  const bela = await person('bela@pelda.hu');
  const belaLap = anna.c.tab();                                   // Anna sütijével induló lap…
  await belaLap.post('/api/logout');
  const belaLogin = await belaLap.post('/api/login', { email: bela.email, password: bela.password });
  const masAlany = await belaLap.get(`/api/data/stock?expected_subject_id=${anna.subjectId}`);
  step('(g) az ALANY változása is elakasztja a régi nézet kérését',
    masAlany.status === 409 && masAlany.body.reason === 'context_mismatch'
    && masAlany.body.served_subject_id === belaLogin.body.subject_id,
    { expected: anna.subjectId, served: masAlany.body.served_subject_id });

  // A KÖTÉS NEM AD JOGOT: idegen könyvre hivatkozva sem nyílik meg semmi.
  const idegen = await belaLap.get(`/api/data/stock?expected_book_id=${B}`);
  step('(h) a kötés SOHA nem ad jogot: idegen könyvre hivatkozva is elutasítás, adat nélkül',
    idegen.body.ok !== true && idegen.body.result == null, { status: idegen.status, reason: idegen.body.reason });

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('F77-02 — HIBÁS AZONOSÍTÓ: NEVEZETT ELUTASÍTÁS, ÍRÁS NÉLKÜL (PRV-01)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  const cili = await person('cili@pelda.hu');
  const before = businessRows();
  const hibas = await cili.c.post('/api/workspaces', { name: 'Hibas ceg', business: { tax_id: '---', jurisdiction: 'HU' } });
  step('(a) A LELET MAGA: a normalizálva ÜRES adószám NEVEZETT 4xx (nem 500)',
    hibas.status >= 400 && hibas.status < 500 && hibas.body.ok === false && hibas.body.reason !== 'internal_error',
    { status: hibas.status, reason: hibas.body.reason, field: hibas.body.field });
  step('(a/2) …és a mező NEVESÍTVE van', hibas.body.field === 'business.tax_id', hibas.body.field);
  const after = businessRows();
  step('(a/3) …és a TÁROLÓBAN egyetlen üzleti sor sem született (könyv · indulás · tagság · alap · jogok · minta)',
    JSON.stringify(before) === JSON.stringify(after), { elotte: before, utana: after });
  const me = (await cili.c.get('/api/me')).body;
  step('(a/4) …a munkamenet sem váltott félkész célra',
    me.current_book_id === me.personal_book_id && me.workspaces.length === 1);

  // TÖBB ÍRÁSMÓD, ugyanaz a szabály (a normalizáló SAJÁT szabálya, nem új „adóellenőrzés").
  for (const [i, v] of [' - - ', '  ', '-', '\t-\t'].entries()) {
    const b = businessRows();
    const rr = await cili.c.post('/api/workspaces', { name: `Hibas ${i}`, business: { tax_id: v, jurisdiction: 'HU' } });
    step(`(b${i + 1}) normalizálva üres írásmód (${JSON.stringify(v)}) → nevezett 4xx, írás nélkül`,
      rr.status >= 400 && rr.status < 500 && JSON.stringify(businessRows()) === JSON.stringify(b), rr.body.reason);
  }

  // POZITÍV ELLENPÁR: érvényes HU és ISMERETLEN országprofil is elindul.
  const joHu = await cili.c.post('/api/workspaces', { name: 'Jo HU', business: { tax_id: '12345678-2-42', jurisdiction: 'HU' } });
  step('(c) POZITÍV ELLENPÁR: érvényes HU adószámmal a kör elindul, a minőség önbevallott',
    joHu.status === 201 && joHu.body.business && joHu.body.business.ok === true
    && joHu.body.business.verification === 'none_available', joHu.body.reason);
  const joIsmeretlen = await cili.c.post('/api/workspaces', { name: 'Jo ismeretlen', business: { tax_id: '99999999', jurisdiction: 'egyeb' } });
  step('(c/2) …és az ISMERETLEN országprofil sem tiltja a legitim saját munkát (H12)',
    joIsmeretlen.status === 201 && joIsmeretlen.body.business.ok === true, joIsmeretlen.body.business && joIsmeretlen.body.business.jurisdiction);

  // AZ ÖSSZETETT ÍRÁS HIBAHATÁRA: vezérelt hiba a létrehozás KÉSŐBBI lépésében.
  const { provisionWorkspace } = await import('../v3ref/workspace.mjs');
  const store2 = openStoreAt(dbPath, { timeoutMs: 5000 });
  const beforeFail = businessRows();
  const failed = provisionWorkspace({
    store: store2, creatorSubjectId: cili.subjectId, bookId: `ws_probe_${Date.now().toString(36)}`,
    name: 'Vezérelt hiba', at: new Date().toISOString(), plan: 'starter',
    business: { namespace: 'tax_id', jurisdiction: 'HU', valueRaw: '11111111-1-11' },
    // A VEZÉRELT HIBA AZ EGYSÉGEN BELÜL fut (a könyv és a minőség MÁR megvolna) — pontosan az a
    // pillanat, ahol a régi alak félkész könyvet hagyott hátra.
    onAfterCore: () => { throw new Error('vezérelt hiba a létrehozás KÉSŐBBI lépésében'); },
  });
  step('(d) vezérelt hiba az EGYSÉGEN BELÜL → nevezett elutasítás, és SEMMI nem marad hátra',
    failed.ok === false && failed.wrote === false && JSON.stringify(businessRows()) === JSON.stringify(beforeFail),
    { reason: failed.reason, elotte: beforeFail.book, utana: businessRows().book });

  // A MINTA-REKORD KIMONDOTTAN AZ EGYSÉGEN KÍVÜL ÁLL (a parancs-út saját, mért tranzakció-határa).
  // Ha a minta elmarad, a KÖNYV attól még érvényes — és a válasz ezt NEVEZETTEN mondja ki, nem némán.
  const beforeSeed = businessRows();
  const seedFailed = provisionWorkspace({
    store: store2, creatorSubjectId: cili.subjectId, bookId: `ws_seed_${Date.now().toString(36)}`,
    name: 'Minta nélkül', at: new Date().toISOString(), plan: 'starter',
    seed: () => { throw new Error('a minta-rekord nem írható'); },
  });
  store2.close();
  step('(d/2) a MINTA elmaradása NEM félkész jog: a könyv érvényes, és a hiány NEVEZETT',
    seedFailed.ok === true && typeof seedFailed.seed_failed === 'string' && seedFailed.seeded === null
    && businessRows().book === beforeSeed.book + 1 && businessRows().command === beforeSeed.command,
    { seed_failed: seedFailed.seed_failed });

  // A KORÁBBI HATÁR-PRÓBÁK (R75) MARADNAK ZÖLDEK — idegen mező · típus · verzióhatár.
  const idegenMezo = await cili.c.post('/api/workspaces', { name: 'X', actor: cili.subjectId });
  const rosszTipus = await cili.c.post('/api/workspaces', { name: { invalid: true } });
  const rosszVerzio = await cili.c.post('/api/workspaces', { name: 'X', schema_version: '2' });
  step('(e) az R75-ös határ-próbák változatlanul zöldek (idegen mező · típus · sémaverzió)',
    idegenMezo.body.reason === 'unknown_field' && rosszTipus.body.reason === 'invalid_type'
    && rosszVerzio.body.reason === 'unsupported_schema_version');

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('H11 — A FELIRAT ÉS A DÖNTÉS EGYEZZEN (a beismert hibás termékfelirat)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Anna a saját starter körében: a JOG-kapu enged (admin + arak jog), az ELŐFIZETÉS zár.
  await anna.c.post('/api/login', { email: anna.email, password: anna.password });
  await anna.c.post('/api/session/workspace', { book_id: A });
  const arStarter = await anna.c.get(`/api/data/price?expected_book_id=${A}`);
  step('(a) jog-kapu enged, előfizetés zár → a kísérő mondat NEM mondhatja „kiadva"-nak',
    arStarter.body.ok === false && arStarter.body.refused_by === 'entitlement'
    && !/kiadva/i.test(String(arStarter.body.message || '')),
    { refused_by: arStarter.body.refused_by, message: arStarter.body.message });
  step('(a/2) …és a mondat MEGMONDJA, melyik kapu zárt',
    typeof arStarter.body.message === 'string' && /előfizet/i.test(arStarter.body.message), arStarter.body.message);
  await anna.c.post('/api/session/workspace', { book_id: B });
  const arPro = await anna.c.get(`/api/data/price?expected_book_id=${B}`);
  step('(b) POZITÍV ELLENPÁR: ahol mindkét kapu enged, ott a felirat KIADVA',
    arPro.body.ok === true && /kiadva/i.test(String(arPro.body.message || '')), arPro.body.message);

  // ════════════════════════════════════════════════════════════════════════════════════════════
  head('R77 §4 — A TARTALMI HELYESBÍTÉSEK GÉPI KÖTÉSE (a szó a SAJÁT mércéjéhez mérve)');
  // ════════════════════════════════════════════════════════════════════════════════════════════
  // MIÉRT VAN ERRE ŐR. A két helyesbített minősítés („fedett" egy nevezett hiány mellett · „lezart"
  // teljesületlen lezárási feltétel mellett) NEM elírás volt, hanem VISSZATÉRŐ hibaosztály: a szó
  // elszakadt a saját meghatározásától. Amit gép MÉRHET ebből, azt mérjük is — a tartalmi helyesség
  // továbbra is olvasás dolga, és ezt a lapok ki is mondják (KUKA-033 · KUKA-045).
  const mapping = JSON.parse(readFileSync(join(ROOT, 'docs/70_PLANNING/V3_R75_A01_A18_MEGFELELTETES.json'), 'utf8'));
  const fedettek = mapping.cases.filter((c) => c.allapot === 'fedett');
  step('(a) „fedett" CSAK ott, ahol a sor KIMONDJA, hogy nincs nevezett maradék',
    fedettek.length > 0 && fedettek.every((c) => /^nincs nevezett maradék/i.test(String(c.maradek || '').trim())),
    { fedett: fedettek.map((c) => c.id) });
  const szamolt = mapping.cases.reduce((a, c) => ({ ...a, [c.allapot]: (a[c.allapot] || 0) + 1 }), {});
  step('(a/2) …és az összegzés a sorokból SZÁMOLT (nem gépelt szám)',
    Number(mapping.summary.fedett) === (szamolt.fedett || 0)
    && Number(mapping.summary.reszben) === (szamolt.reszben || 0)
    && Number(mapping.summary.nevezett_hiany) === (szamolt.nevezett_hiany || 0)
    && Number(mapping.summary.osszesen) === mapping.cases.length, szamolt);

  const closing = JSON.parse(readFileSync(join(ROOT, 'docs/70_PLANNING/V3_CORE_LEZARASI_LISTA.json'), 'utf8'));
  step('(b) a „lezart" állapot ÉS a lezárási feltétel teljesülése EGYÜTT mozog (egyik sem állítható a másik nélkül)',
    closing.rows.every((r) => typeof r.lezarasi_feltetel_teljesult === 'boolean'
      && (r.allapot === 'lezart') === (r.lezarasi_feltetel_teljesult === true)),
    { lezart: closing.rows.filter((r) => r.allapot === 'lezart').map((r) => r.id) });
  step('(b/2) …és ahol NEM teljesült, a sor MEGNEVEZI, mi hiányzik (nem általános „még nyitott")',
    closing.rows.filter((r) => r.lezarasi_feltetel_teljesult !== true)
      .every((r) => typeof r.miert_nem_teljesult === 'string' && r.miert_nem_teljesult.length > 20),
    { nem_teljesult: closing.rows.filter((r) => r.lezarasi_feltetel_teljesult !== true).map((r) => r.id) });

  // AZ ELFOGADÁSI HELYZET-LAP a böngésző-futásból születik; itt a BELSŐ összhangját mérjük: az
  // összegzés a verdiktekből számolt, és minden „reszben" sor MEGNEVEZI a határt (nem üres szó).
  const sheet = JSON.parse(readFileSync(join(ROOT, 'docs/70_PLANNING/V3_R75_ELFOGADAS_HELYZETEK.json'), 'utf8'));
  const sheetCount = sheet.situations.reduce((a, s2) => ({ ...a, [s2.verdict]: (a[s2.verdict] || 0) + 1 }), {});
  step('(c/0) a KÖZZÉTETT helyzet-lap TELJES futásból való (részleges futás nem írhatja felül)',
    sheet.partial_run !== true && (!Array.isArray(sheet.not_run_ids) || sheet.not_run_ids.length === 0)
    && sheet.situations.every((s2) => s2.verdict !== 'nem_futott'),
    { partial_run: sheet.partial_run ?? null, not_run: sheet.not_run_ids ?? null });
  step('(c) az elfogadási helyzet-lap összegzése a VERDIKTEKBŐL számolva egyezik',
    Number(sheet.summary.bizonyitva) === (sheetCount.bizonyitva || 0)
    && Number(sheet.summary.reszben) === (sheetCount.reszben || 0)
    && Number(sheet.summary.nem_bongeszoben) === (sheetCount.nem_bongeszoben || 0)
    && Number(sheet.summary.nem_futott ?? 0) === (sheetCount.nem_futott || 0), sheetCount);
  step('(c/2) …és minden „reszben" helyzet KIMONDJA, mi az, ami NEM áll mérve',
    sheet.situations.filter((s2) => s2.verdict === 'reszben')
      .every((s2) => typeof s2.note === 'string' && s2.note.length > 120),
    { reszben: sheet.situations.filter((s2) => s2.verdict === 'reszben').map((s2) => s2.id) });
} finally {
  db.close();
  await app.close();
  for (const suffix of ['', '-wal', '-shm']) { if (existsSync(dbPath + suffix)) rmSync(dbPath + suffix, { force: true }); }
}

const pass = results.filter((x) => x.pass).length;
console.log(`\nR77 lelet-battéria: ${pass}/${results.length} PASS${pass === results.length ? '' : ' · ' + (results.length - pass) + ' FAIL'}`);
if (pass !== results.length) {
  for (const x of results.filter((y) => !y.pass)) console.log(`  BUKOTT: [${x.section}] ${x.name}`);
  process.exit(1);
}
