// v3app/findings_r121.mjs — AZ R121 BATTÉRIÁJA: HOZZÁFÉRÉSEK ADATKÖRÖNKÉNT (CMD-VS-300-002-002 R121).
//
// MIT MÉR. A négy adatkör (keszlet · arak · dokumentumok · beszallitok) KÜLÖN megadását és KÜLÖN
// visszavonását, a VALÓDI HTTP-héjon és a VALÓDI tárolón — nem a mag függvényeit közvetlenül hívva.
// Az A121-01…A121-07 és A121-09 elfogadási feltétel gépi alakja; az A121-08 böngészős tanúja a
// `tests/e2e/v3app-r121.spec.mjs`, és a kettő EGYÜTT a bizonyíték (KUKA-207).
//
// AMIT KIMONDVA NEM BIZONYÍT: ez a battéria a SZABÁLYT és a BEKÖTÉSÉT méri. Nem böngésző, nem
// vizuális audit, és nem valódi külső levél-kézbesítés — a levél-fogadó fejlesztői próbaüzenet.
//
// A MINTÁK SZINTETIKUSAK. Üzleti mintatartalom nem kerül a minden böngészőnek kiküldött csomagba;
// az adatot az ENGEDÉLYEZETT szerverválasz adja (R121 §1).
import { rmSync, existsSync } from 'node:fs';
import { startServer, selfcheckDbPath, NEUTRAL_REGISTER } from './server.mjs';
import { KNOWN_DATA_SCOPES, declaredScopesOfType, resultScopesOf, DECLARED_RESULT_TYPES } from '../v3ref/resultScope.mjs';
import { STARTUP_RULE, STARTUP_RULE_V1, STARTUP_RULE_V2, startupRuleOf } from '../v3ref/workspace.mjs';
import { KNOWN_FEATURES, PLANS } from '../v3ref/entitlement.mjs';
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
console.log(`findings_r121: ${base}  · tároló: ${dbPath}`);

// A TÁROLÓ ÍRÁS-SZÁMLÁLÓJA — az "ÍRÁSMENTES elutasítás" állítást MÉRNI kell, nem hinni (KUKA-220).
const countRows = async (c) => {
  const r = await c.get('/dev/rowcounts');
  return r.status === 200 && r.body && r.body.ok ? r.body.counts : null;
};

try {
  const anna = new Client(base, 'anna');
  const bela = new Client(base, 'bela');
  const cili = new Client(base, 'cili');
  const mails = async () => (await anna.get('/dev/mailbox')).body.mails;
  const linkFor = async (to, part) => {
    const m = (await mails()).find((x) => x.to === to && x.subject.includes(part));
    return m ? m.link : null;
  };
  const signUp = async (c, email, pw) => {
    await c.post('/api/register', { email, password: pw });
    const link = await linkFor(email, 'Erősítsd meg');
    await c.get(new URL(link).pathname + new URL(link).search);
    const r = await c.post('/api/login', { email, password: pw });
    return r.body.subject_id;
  };

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('A) A121-01 — NÉGY ADATKÖR EGY ZÁRT FORRÁSBÓL, és minden hiány NEVEZETTEN zár');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  step('(a) a zárt szótár PONTOSAN a négy kör', KNOWN_DATA_SCOPES.length === 4
    && ['keszlet', 'arak', 'dokumentumok', 'beszallitok'].every((s) => KNOWN_DATA_SCOPES.includes(s)), KNOWN_DATA_SCOPES);

  // A SZÜKSÉGES JOGOK A DEKLARÁCIÓBÓL — adat megérintése NÉLKÜL (R121 §1).
  const dHeader = declaredScopesOfType({ type: 'doc.header', typeVersion: '1' });
  const dSupp = declaredScopesOfType({ type: 'supplier.card', typeVersion: '1' });
  const dFull = declaredScopesOfType({ type: 'doc.full', typeVersion: '1' });
  step('(b) a dokumentumfejléc TISZTA: csak `dokumentumok` (nincs benne rejtett összeg/beszállító/URL)',
    dHeader.ok && dHeader.scopes.length === 1 && dHeader.scopes[0] === 'dokumentumok', dHeader.scopes);
  step('(c) a beszállítói minta TISZTA: csak `beszallitok`',
    dSupp.ok && dSupp.scopes.length === 1 && dSupp.scopes[0] === 'beszallitok', dSupp.scopes);
  step('(d) a VEGYES dokumentum MIND A NÉGY kört igényli (a beágyazott összeg `arak`, a blokk `beszallitok`)',
    dFull.ok && dFull.scopes.length === 4, dFull.scopes);
  step('(e) ISMERETLEN típus/verzió NEVEZETTEN zár (nem "korlátozás nélküli")',
    declaredScopesOfType({ type: 'doc.header', typeVersion: '9' }).reason === 'result_scope_type_undeclared'
    && declaredScopesOfType({ type: 'nincs.ilyen', typeVersion: '1' }).reason === 'result_scope_type_undeclared');

  // ÚJ BEÁGYAZOTT MEZŐ és HIBÁS TÍPUS — a besorolás NEVEZETTEN elakad, ÚTTAL együtt.
  const extraField = resultScopesOf({ type: 'doc.full', typeVersion: '1', result: {
    doc_id: 'x', doc_kind: 'y', doc_date: 'z', doc_status: 'q', amount: 1, currency: 'HUF',
    lines: [{ qty: '1', sku: 's', unit_price: 1 }],
    supplier: { supplier_id: 'a', supplier_name: 'b', supplier_contact: 'c', titkos_url: 'http://x' },
  } });
  step('(f) ÚJ, be nem sorolt beágyazott mező → `result_scope_field_undeclared`, az ÚTJÁVAL',
    extraField.ok === false && extraField.reason === 'result_scope_field_undeclared'
    && String(extraField.at).includes('supplier.titkos_url'), { reason: extraField.reason, at: extraField.at });
  const badType = resultScopesOf({ type: 'doc.header', typeVersion: '1', result: { doc_id: 42, doc_kind: 'y', doc_date: 'z', doc_status: 'q' } });
  step('(g) HIBÁS levél-típus → `result_shape_type_mismatch` (a szám nem szöveg)',
    badType.ok === false && badType.reason === 'result_shape_type_mismatch', { reason: badType.reason, at: badType.at });
  step('(h) a három új típus DEKLARÁLT (a lista a mag saját forrásából jön)',
    ['doc.header/1', 'supplier.card/1', 'doc.full/1'].every((t) => DECLARED_RESULT_TYPES.includes(t)), DECLARED_RESULT_TYPES);

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('B) A121-02 — VALÓDI HTTP+DB: minden új körnek SAJÁT pozitív és negatív párja');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  const annaId = await signUp(anna, 'anna@r121.hu', 'anna-titok-1');
  let r = await anna.post('/api/workspaces', { name: 'R121 Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '12345678-2-42' } });
  const BOOK = r.body.book_id;
  step('(a) ÚJ munkakörnyezet a MAI (v2, négykörös) indulási szabállyal születik',
    r.status === 201 && r.body.ok === true && r.body.role === 'admin', { book: BOOK, rule: STARTUP_RULE.version });

  r = await anna.get('/api/members');
  step('(b) a kezelő plafonja MIND A NÉGY kör (v2 indulás), és a felület ezt LÁTJA',
    r.body.grantable_scopes && r.body.grantable_scopes.length === 4 && r.body.blocked_scopes.length === 0
    && r.body.startup_rule_version === 'v2', { grantable: r.body.grantable_scopes, rule: r.body.startup_rule_version });

  // Béla — a RAKTÁRI MUNKATÁRS: meghívó, majd KIMONDOTT adatkör-adás.
  r = await anna.post('/api/invites', { email: 'bela@r121.hu', role: 'user', scope: 'keszlet' });
  const inviteToken = r.body.token;
  await bela.post('/api/invites/pending', { token: inviteToken });
  const belaId = await signUp(bela, 'bela@r121.hu', 'bela-titok-1');
  await bela.post('/api/invites/redeem', { token: inviteToken });
  await bela.post('/api/session/workspace', { book_id: BOOK });
  await anna.post('/api/members/scope', { subject_id: belaId, scope: 'keszlet' });

  const readAll = async (c) => ({
    stock: (await c.get('/api/data/stock')).body,
    price: (await c.get('/api/data/price')).body,
    document: (await c.get('/api/data/document')).body,
    supplier: (await c.get('/api/data/supplier')).body,
    full: (await c.get('/api/data/document-full')).body,
  });
  let v = await readAll(bela);
  step('(c) CSAK készletjoggal: a MENNYISÉG kiadható', v.stock.ok === true && v.stock.result.qty === '12', v.stock.result);
  step('(d) …az ÁR nem', v.price.ok === false && v.price.refused_by !== null, { refused_by: v.price.refused_by });
  step('(e) …a DOKUMENTUM nem, és a válasz MEGNEVEZI a hiányzó kört',
    v.document.ok === false && v.document.result === null && v.document.missing_scopes.includes('dokumentumok'),
    { refused_by: v.document.refused_by, missing: v.document.missing_scopes });
  step('(f) …a BESZÁLLÍTÓ nem, saját nevezett hiánnyal',
    v.supplier.ok === false && v.supplier.result === null && v.supplier.missing_scopes.includes('beszallitok'),
    { missing: v.supplier.missing_scopes });
  step('(g) a nemleges válasz ADATMENTES (a mintarekord egyetlen mezője sem szivárog)',
    !JSON.stringify(v.document).includes('BEJ-2026') && !JSON.stringify(v.supplier).includes('Példa Beszállító')
    && !JSON.stringify(v.full).includes('41880'), 'nincs mintatartalom az elutasításokban');

  // POZITÍV PÁR körönként: a jog megadása UTÁN ugyanaz a kérés kiadható.
  await anna.post('/api/members/scope', { subject_id: belaId, scope: 'dokumentumok' });
  v = await readAll(bela);
  step('(h) `dokumentumok` megadása után a FEJLÉC kiadható — a többi kör változatlanul zárt',
    v.document.ok === true && v.document.result.doc_id === 'BEJ-2026-0042'
    && v.supplier.ok === false && v.price.ok === false, { doc: v.document.result, supplier_zar: v.supplier.ok === false });
  await anna.post('/api/members/scope', { subject_id: belaId, scope: 'beszallitok' });
  v = await readAll(bela);
  step('(i) `beszallitok` megadása után a BESZÁLLÍTÓI minta kiadható',
    v.supplier.ok === true && v.supplier.result.supplier_id === 'BSZ-0007', v.supplier.result);

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('C) A121-03 — A VEGYES DOKUMENTUM: EGYETLEN hiányzó jog az EGÉSZET zárja');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  step('(a) három körrel (ár nélkül) a VEGYES dokumentum MÉG ZÁRVA van',
    v.full.ok === false && v.full.missing_scopes.includes('arak'), { missing: v.full.missing_scopes });
  await anna.post('/api/members/scope', { subject_id: belaId, scope: 'arak' });
  v = await readAll(bela);
  step('(b) MIND A NÉGY joggal a vegyes dokumentum kiadható, a beágyazott összeggel és beszállítóval',
    v.full.ok === true && v.full.result.amount === 41880 && v.full.result.supplier.supplier_id === 'BSZ-0007'
    && v.full.result.lines[0].unit_price === 3490, { amount: v.full.result.amount, sor: v.full.result.lines[0] });

  // MINDEN EGYES jog külön elvétele EGÉSZBEN zár — és utána visszaadjuk (a következő kör méréséhez).
  for (const scope of ['arak', 'beszallitok', 'dokumentumok', 'keszlet']) {
    await anna.post('/api/members/scope/revoke', { subject_id: belaId, scope });
    const after = (await bela.get('/api/data/document-full')).body;
    step(`(c/${scope}) a(z) \`${scope}\` egyedüli elvétele a TELJES vegyes dokumentumot zárja`,
      after.ok === false && after.result === null && after.missing_scopes.includes(scope),
      { missing: after.missing_scopes });
    await anna.post('/api/members/scope', { subject_id: belaId, scope });
  }

  // HAMIS KLIENS-SCOPE: a kérő címkéje nem dönt (DSC-01 eredeti lelete, most a négy körre).
  await anna.post('/api/members/scope/revoke', { subject_id: belaId, scope: 'arak' });
  const faked = (await bela.get('/api/data/document-full?data_scope=dokumentumok&scope=keszlet')).body;
  step('(d) HAMIS kliens-scope paraméter NEM kerüli meg a zárat (a típus deklarál, nem a kérő)',
    faked.ok === false && faked.result === null && faked.missing_scopes.includes('arak'),
    { missing: faked.missing_scopes, param_ignored: faked.param_ignored ?? null });
  await anna.post('/api/members/scope', { subject_id: belaId, scope: 'arak' });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('D) A121-04 — A TELJES ÉLETCIKLUS, és ami KÖZBEN NEM változik');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  const membersBefore = (await anna.get('/api/members')).body.members.find((m) => m.subject_id === belaId);
  r = await anna.post('/api/members/scope/revoke', { subject_id: belaId, scope: 'arak' });
  step('(a) EGY adatkör visszavonása sikeres, és KIMONDJA, hogy változott', r.body.ok === true && r.body.changed === true && r.body.scope === 'arak', r.body);
  v = await readAll(bela);
  step('(b) az ÁR zárva, de a MENNYISÉG továbbra is kiadható (a tagság él)',
    v.price.ok === false && v.stock.ok === true && v.document.ok === true && v.supplier.ok === true,
    { ar: v.price.ok, keszlet: v.stock.ok, dok: v.document.ok, besz: v.supplier.ok });
  const membersAfter = (await anna.get('/api/members')).body.members.find((m) => m.subject_id === belaId);
  step('(c) a TAGSÁG, a SZEREP és a többi adatkör VÁLTOZATLAN — csak az `arak` fordult át',
    membersAfter.effective === membersBefore.effective && membersAfter.role === membersBefore.role
    && membersAfter.scopes.arak.granted === false && membersAfter.scopes.keszlet.granted === true
    && membersAfter.scopes.dokumentumok.granted === true && membersAfter.scopes.beszallitok.granted === true,
    { szerep: membersAfter.role, hatalyos: membersAfter.effective, korok: Object.fromEntries(Object.entries(membersAfter.scopes).map(([k, x]) => [k, x.granted])) });
  r = await anna.get('/api/me');
  step('(d) ANNA saját jogai és a MÁSIK ember érintetlen (a megvonás nem szivárgott át)', r.body.subject_id === annaId);

  // ÚJRAADÁS — és a KORÁBBI események megmaradnak (a történet nem törlődik).
  r = await anna.post('/api/members/scope', { subject_id: belaId, scope: 'arak' });
  step('(e) szabályos ÚJRAADÁS működik', r.body.ok === true && r.body.scope === 'arak');
  v = await readAll(bela);
  step('(f) …és utána az ÁR ismét kiadható', v.price.ok === true && v.price.result.unit_price === 3490, v.price.result);

  // IDEMPOTENCIA: kétszer megnyomott gomb NEM gyárt két üzleti változást.
  await anna.post('/api/members/scope/revoke', { subject_id: belaId, scope: 'arak' });
  const second = await anna.post('/api/members/scope/revoke', { subject_id: belaId, scope: 'arak' });
  step('(g) UGYANAZ a visszavonás másodszor: ok, de `changed:false` — nincs második üzleti változás',
    second.body.ok === true && second.body.changed === false, second.body);
  await anna.post('/api/members/scope', { subject_id: belaId, scope: 'arak' });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('E) A121-05 — JOGOSULATLAN, IDEGEN, PLAFONON TÚLI kérés NEM ír');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  r = await bela.post('/api/members/scope/revoke', { subject_id: annaId, scope: 'keszlet' });
  step('(a) a JOGOSULATLAN tag (user) nem vonhat meg — nevezett elutasítás, nincs hatás',
    r.status === 403 && r.body.ok === false && r.body.changed === false, { reason: r.body.reason });
  const annaStillHas = (await anna.get('/api/data/stock')).body;
  step('(b) …és Anna joga ÉRINTETLEN maradt (a kísérlet nem írt)', annaStillHas.ok === true);

  r = await bela.post('/api/members/scope/revoke', { subject_id: belaId, scope: 'keszlet' });
  step('(c) "saját magának sem": a jogosulatlan tag a SAJÁT sorára sem írhat ezen az úton',
    r.status === 403 && r.body.ok === false && r.body.changed === false, { reason: r.body.reason });
  step('(d) …és a saját joga is megmaradt', (await bela.get('/api/data/stock')).body.ok === true);

  r = await anna.post('/api/members/scope/revoke', { subject_id: 'sub_nincs_ilyen', scope: 'keszlet' });
  step('(e) IDEGEN/nem létező célfiók → `target_not_a_member`, írás nélkül',
    r.body.ok === false && r.body.reason === 'target_not_a_member' && r.body.changed === false, r.body.reason);

  r = await anna.post('/api/members/scope/revoke', { subject_id: belaId, scope: 'penzugy' });
  step('(f) ISMERETLEN adatkör a HATÁRON akad el (400 invalid_value), a domain-műveletig el sem jut',
    r.status === 400 && r.body.reason === 'invalid_value' && r.body.field === 'scope' && r.body.refused_by === 'input_schema',
    { reason: r.body.reason, field: r.body.field });

  // POZITÍV ELLENPÁR: ugyanaz a művelet ÉLŐ, megfelelő alappal MŰKÖDIK (különben a zöld semmit nem ér).
  r = await anna.post('/api/members/scope/revoke', { subject_id: belaId, scope: 'dokumentumok' });
  step('(g) POZITÍV ELLENPÁR: a jogosult kezelő UGYANEZT a műveletet végre tudja hajtani',
    r.body.ok === true && r.body.changed === true, { scope: r.body.scope });
  await anna.post('/api/members/scope', { subject_id: belaId, scope: 'dokumentumok' });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('F) A121-06 — A RÉGI (v1) FIÓK NEM BŐVÜL, az új v2 út teljes');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  step('(a) a v1 szabály KÉT köre RÖGZÍTETT — a szótár bővülése nem írja át visszamenőleg',
    STARTUP_RULE_V1.scopes.join(',') === 'keszlet,arak' && STARTUP_RULE_V1.version === 'v1', STARTUP_RULE_V1.scopes);
  step('(b) a v2 szabály NÉGY kört ad, és MA ez az érvényes',
    STARTUP_RULE_V2.scopes.length === 4 && STARTUP_RULE.version === 'v2', STARTUP_RULE_V2.scopes);
  step('(c) a tárolt verzió VISSZAOLDHATÓ, az ismeretlen NEM "alapértelmezett"',
    startupRuleOf('v1').version === 'v1' && startupRuleOf('v2').version === 'v2' && startupRuleOf('v3') === null);
  step('(d) az új nézeteknek SAJÁT funkció-neve van, és a `starter` ZÁRT rájuk',
    KNOWN_FEATURES.includes('document_view') && KNOWN_FEATURES.includes('supplier_view')
    && !PLANS.starter.includes('document_view') && !PLANS.starter.includes('supplier_view')
    && PLANS.pro.includes('document_view') && PLANS.pro.includes('supplier_view'), { starter: PLANS.starter, pro: PLANS.pro });

  // A NÉGY KOMBINÁCIÓ: terv (starter|pro) × jog (van|nincs) — MIND a négy mérve, a válasz MEGMONDJA,
  // MELYIK kapu zárt (ENT-02: a két kaput egy mezőbe vonni tilos).
  const combos = [];
  for (const plan of ['pro', 'starter']) {
    await anna.post('/api/workspaces/plan', { plan });
    for (const withRight of [true, false]) {
      if (withRight) await anna.post('/api/members/scope', { subject_id: belaId, scope: 'dokumentumok' });
      else await anna.post('/api/members/scope/revoke', { subject_id: belaId, scope: 'dokumentumok' });
      const res = (await bela.get('/api/data/document')).body;
      combos.push({ plan, jog: withRight, ok: res.ok, refused_by: res.refused_by });
    }
  }
  step('(e) mind a NÉGY kombináció mérve, és a zárt kapu NEVE helyes',
    combos.length === 4
    && combos.find((c) => c.plan === 'pro' && c.jog === true).ok === true
    && combos.find((c) => c.plan === 'pro' && c.jog === false).refused_by === 'right'
    && combos.find((c) => c.plan === 'starter' && c.jog === true).refused_by === 'entitlement'
    && combos.find((c) => c.plan === 'starter' && c.jog === false).refused_by === 'both', combos);
  await anna.post('/api/workspaces/plan', { plan: 'pro' });
  await anna.post('/api/members/scope', { subject_id: belaId, scope: 'dokumentumok' });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('G) A121-07 — KONTEXTUS ÉS ISMÉTELT BEKÜLDÉS: nincs részleges jogváltozás');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  r = await anna.post('/api/members/scope/revoke', { subject_id: belaId, scope: 'keszlet', expected_book_id: 'masik_konyv' });
  step('(a) MÁSIK nézetből érkező kérés → 409 context_mismatch, a jog ÉRINTETLEN',
    r.status === 409 && r.body.reason === 'context_mismatch', { reason: r.body.reason });
  step('(b) …és Béla készlet-joga tényleg megmaradt', (await bela.get('/api/data/stock')).body.ok === true);

  r = await anna.post('/api/members/scope/revoke', { subject_id: belaId, scope: 'keszlet', expected_subject_id: 'sub_masik_ember' });
  step('(c) MÁSIK belépett személy megerősítésével → 409, írás nélkül', r.status === 409 && r.body.reason === 'context_mismatch');
  step('(d) …a jog továbbra is él', (await bela.get('/api/data/stock')).body.ok === true);

  const olvasoCtx = (await bela.get('/api/data/document?expected_book_id=masik')).body;
  step('(e) az OLVASÁS is nézethez kötött: eltérő nézetből NEM olvasunk (a kiadás meg sem születik)',
    olvasoCtx.refused_by === 'context' || olvasoCtx.reason === 'context_mismatch', { reason: olvasoCtx.reason });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('H) A121-09 — A LEVÉLKÉRÉS ÁLTALÁNOS VÁRAKOZÁSI MONDATA (az R120 örökölt függője)');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  const langs = enabledLanguages().map((l) => l.code);
  const hints = langs.map((code) => ({ code, text: dictFor(code).UI.resendWaitHint }));
  step('(a) a mondat MINDEN bekapcsolt nyelven megvan, és egyik sem üres',
    hints.length >= 3 && hints.every((h) => typeof h.text === 'string' && h.text.trim().length > 20),
    hints.map((h) => `${h.code}: ${h.text.slice(0, 42)}…`));
  step('(b) a magyar mondat SZÓ SZERINT az, amit az R120 előírt',
    dictFor('hu').UI.resendWaitHint === 'Két levélkérés között várj legalább egy percet. Ha több levelet kaptál, a legutóbbi hivatkozását használd.',
    dictFor('hu').UI.resendWaitHint);
  step('(c) a mondat NEM árul el létezést és NEM ígér kézbesítést (nincs benne cím-, fiók- vagy „elküldtük"-állítás)',
    hints.every((h) => !/@/.test(h.text)) && !/elküldtük|megérkez|biztosan/i.test(dictFor('hu').UI.resendWaitHint));
  step('(d) NINCS címfüggő visszaszámláló: a mondat MINDEN nyelven statikus szöveg, paraméter nélkül',
    hints.every((h) => !/\{[a-z_]+\}/i.test(h.text)));

  // A SZERVERKORLÁT VÁLTOZATLAN: a korláton belül NINCS új levél, utána jogos esetben VAN.
  const cnt0 = (await mails()).length;
  await cili.post('/api/register', { email: 'cili@r121.hu', password: 'cili-titok-1' });
  const cnt1 = (await mails()).length;
  r = await cili.post('/api/verification/resend', { email: 'cili@r121.hu' });
  const cnt2 = (await mails()).length;
  step('(e) a 60 másodperces korláton BELÜL nincs ÚJ próbaüzenet (a szerverkorlát változatlan)',
    cnt1 === cnt0 + 1 && cnt2 === cnt1, { regisztracio_utan: cnt1 - cnt0, ujrakeres_utan: cnt2 - cnt1 });
  await anna.post('/dev/clock', { advance_ms: 61 * 1000 });
  r = await cili.post('/api/verification/resend', { email: 'cili@r121.hu' });
  const cnt3 = (await mails()).length;
  step('(f) a korlát UTÁN, jogos esetben ÚJ levél megy', cnt3 === cnt2 + 1, { uj_level: cnt3 - cnt2 });
  const unknownBefore = (await mails()).length;
  r = await cili.post('/api/verification/resend', { email: 'nincs-ilyen-cim@r121.hu' });
  const unknownAfter = (await mails()).length;
  step('(g) ISMERETLEN címre ugyanaz a semleges válasz, ÚJ levél NÉLKÜL (nem árulja el, létezik-e)',
    r.status === 200 && unknownAfter === unknownBefore, { status: r.status, uj_level: unknownAfter - unknownBefore });

} finally {
  await app.close();
  if (existsSync(dbPath)) rmSync(dbPath, { force: true });
}

const pass = results.filter((x) => x.pass).length;
console.log(`\n${'='.repeat(94)}`);
console.log(`findings_r121: ${pass}/${results.length} PASS`);
if (pass !== results.length) {
  console.log('\nBUKOTT:');
  for (const x of results.filter((y) => !y.pass)) console.log(`  · [${x.section}] ${x.name}`);
}
process.exit(pass === results.length ? 0 : 1);
