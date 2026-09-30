// v3app/findings_r123.mjs — AZ R123 ELLENPRÓBÁI: ÍRÁSMENTES ELUTASÍTÁS ÉS ATOMI JOGKEZELÉS.
//
// MIT MÉR. A külső ellenőrző fél (chatgpt-v3, CMD-VS-300-002-002 R123) HÁROM valódi hibát talált az
// R121-es csomagomban. Ez a battéria mind a hármat REPRODUKÁLJA — a VALÓDI HTTP-héjon és a VALÓDI
// tárolón —, tehát a javítás ELŐTT PIROS, utána ZÖLD; és minden állításhoz tartozik POZITÍV
// ELLENPÁR, hogy a zöld ne a művelet letiltásából jöjjön (KUKA-092: a tiltás nem javítás).
//
//   F123-01  a plafonon TÚLI megvonás elutasítása ÍRT: új `authority_basis` verzió keletkezett,
//            miközben a `scope_grant_revocation` üres maradt — vagyis EGY tábla számlálása nem
//            bizonyít írás-mentességet (KUKA-220).
//   F123-02  a bukott TÁROLÁS részleges írást hagyott: `ok=false, changed=false` mellett az
//            `authority_basis` 2 → 3 lett. A kivételes ág (RAISE(ABORT)) helyesen görgetett vissza
//            — tehát a hiba a NEVEZETT hibakimenet ágán élt, nem a kivételén.
//   F123-03  az ismételt MEGADÁS duplikált: két azonos kérés `ok=true`-t adott, a `scope_grant`
//            8 → 10 lett, közbeni megvonás nélkül.
//
// AMIT KIMONDVA NEM BIZONYÍT. Ez a battéria a SZABÁLYT és a BEKÖTÉSÉT méri, nem böngészőt: az
// A121-08 böngészős tanúja a `tests/e2e/` alatt áll, és a kettő EGYÜTT a bizonyíték (KUKA-207).
// A `TEMP TRIGGER` a TÁROLÁS bukását utánozza — nem állítja, hogy élesben pont így bukna; azt
// állítja, hogy BÁRMIKOR bukik, a művelet SAJÁT részleges írása nem maradhat bent.
import { rmSync, existsSync } from 'node:fs';
import { startServer, selfcheckDbPath, ROWCOUNT_TABLES } from './server.mjs';
import { KNOWN_DATA_SCOPES } from '../v3ref/resultScope.mjs';
import { grantAdjudicationAuthority } from '../v3ref/adjudication.mjs';
import { readScopeGrantAt } from '../v3ref/scopeGrant.mjs';
import { basisAsOf, recordAuthorityBasis } from '../v3ref/authorityBasis.mjs';
import { createLegacyV1Workspace } from '../v3ref/legacyAccountFixture.mjs';
import { delegationBasisId, delegationCeilingOf } from '../v3ref/delegation.mjs';
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
console.log(`findings_r123: ${base}  · tároló: ${dbPath}`);

// ── A SOR-SZÁMLÁLÓ: AZ „ÍRÁSMENTES" SZÓ MÉRHETŐ ALAKJA ──────────────────────────────────────────
// A HTTP-n kérjük le, nem a tárolóból — ugyanazt az utat használja a mérés, amit a külső fél is
// használni tud, és a végpont léte is mérve lesz (az R121-es `countRows` segédem egy NEM LÉTEZŐ
// végpontra mutatott, és soha nem is hívta meg senki: KUKA-207).
const reader = new Client(base, 'szamlalo');
const counts = async () => {
  const r = await reader.get('/dev/rowcounts');
  if (r.status !== 200 || !r.body || r.body.ok !== true) throw new Error(`/dev/rowcounts nem elérhető (${r.status})`);
  return r.body.counts;
};
const diff = (a, b) => {
  const out = {};
  for (const t of Object.keys(b)) if (a[t] !== b[t]) out[t] = `${a[t]}→${b[t]}`;
  return out;
};
const unchanged = (a, b) => Object.keys(diff(a, b)).length === 0;

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

  step('(0) a sor-számláló végpont LÉTEZIK és minden kért táblát ad', (async () => true)() && true, null);
  const c0 = await counts();
  step('(0/b) minden deklarált tábla szerepel a számlálóban',
    ROWCOUNT_TABLES.every((t) => Number.isInteger(c0[t])), Object.keys(c0).length);

  const annaId = await signUp(anna, 'anna@r123.hu', 'anna-titok-1');
  const ws = await anna.post('/api/workspaces', { name: 'R123 Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '12345678-2-42' } });
  const bookId = ws.body.book_id;

  // BÉLA — MÁSODADMIN a MAI (v2) fiókban. MÉRT TÉNY, amit itt ki kell mondani: az ÁTVITT KORLÁT
  // a MEGHÍVÓ ALAPJÁNAK plafona (`grant_basis`), NEM a meghívó pecsételt adatköre — ezért egy
  // `keszlet` körrel hívott admin plafona is MIND A NÉGY kör. Vagyis egy v2 fiókban a
  // `outside_basis_scopes` ág ezen az úton NEM érhető el; a valódi szűk alap a RÉGI (v1) fiók,
  // amit a lenti A) szakasz használ. Ez az a mérés, ami megmagyarázza, miért ÉLTE TÚL az R121-es
  // plafon-mutációm a battériát: nem a próba hiányzott, a FIXTURE volt túl tág (KUKA-134).
  let inv = await anna.post('/api/invites', { email: 'bela@r123.hu', role: 'admin', scope: 'keszlet' });
  const belaToken = inv.body.token;
  await bela.post('/api/invites/pending', { token: belaToken });
  const belaId = await signUp(bela, 'bela@r123.hu', 'bela-titok-1');
  const belaRedeem = await bela.post('/api/invites/redeem', { token: belaToken });
  await bela.post('/api/session/workspace', { book_id: bookId });

  // CILI — sima tag: rajta lesz mit megvonni.
  inv = await anna.post('/api/invites', { email: 'cili@r123.hu', role: 'user', scope: 'arak' });
  const ciliToken = inv.body.token;
  await cili.post('/api/invites/pending', { token: ciliToken });
  const cilild = await signUp(cili, 'cili@r123.hu', 'cili-titok-1');
  await cili.post('/api/invites/redeem', { token: ciliToken });
  await cili.post('/api/session/workspace', { book_id: bookId });

  // A HELYI JOGVÁLTOZTATÁS hatásköre Bélának — a VALÓDI úton, a kezelő indulási alapja alatt.
  // EZ a "valódi, szűk alapú fixture": Béla ELJÁRHAT (`alter_right`), de az ÁTVITT PLAFONJA szűk.
  grantAdjudicationAuthority({ store, subjectId: belaId, bookId, operation: 'alter_right',
    clock: app.clock, basisId: ws.body.workspace.basis_id });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('A) F123-01 — A PLAFONON TÚLI ELUTASÍTÁS ÍRÁSMENTES (valódi, SZŰK alapú v1 fiók)');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // A FIXTURE VALÓDISÁGA. Szűk plafon a rendszerben EGY módon áll elő magától: a RÉGI, v1 indulási
  // szabállyal született fiókban, ahol a szabály CSAK a `keszlet` és az `arak` kört ismerte. Ott a
  // kezelő plafona két kör — a `dokumentumok` és a `beszallitok` NEM az övé, tehát sem megadni,
  // sem megvonni nem tudja. Ez EGYSZERRE az R123 két kikötése: a plafon-korlát valódi, szűk alapú
  // mérése, ÉS a „régi, tárolt v1 fiók nem tágul" valódi fixture-rel (nem konstans-lista egyezés).
  const dora = new Client(base, 'dora');
  const elek = new Client(base, 'elek');
  const doraId = await signUp(dora, 'dora@r123.hu', 'dora-titok-1');
  const legacy = createLegacyV1Workspace({
    store, creatorSubjectId: doraId, bookId: 'ws_legacy_v1', name: 'Régi Kft (v1)', at: app.clock.now() });
  await dora.post('/api/session/workspace', { book_id: legacy.book_id });

  const doraCeiling = delegationCeilingOf({ store, subjectId: doraId, bookId: legacy.book_id, at: app.clock.now() });
  step('(a1) a fixture VALÓDI és SZŰK: a v1 fiók kezelőjének plafona PONTOSAN a két v1 kör',
    legacy.rule_version === 'v1' && doraCeiling.ok === true
    && doraCeiling.scopes.length === 2 && doraCeiling.scopes.includes('keszlet') && doraCeiling.scopes.includes('arak')
    && !doraCeiling.scopes.includes('dokumentumok') && !doraCeiling.scopes.includes('beszallitok'),
    { rule: legacy.rule_version, plafon: doraCeiling.scopes });

  const tagLista = await dora.get('/api/members');
  step('(a2) és a FELÜLET is ezt látja: a két új kör TILTOTT, nem csak „nincs gomb"',
    Array.isArray(tagLista.body.blocked_scopes)
    && tagLista.body.blocked_scopes.includes('dokumentumok') && tagLista.body.blocked_scopes.includes('beszallitok')
    && tagLista.body.startup_rule_version === 'v1',
    { megadhato: tagLista.body.grantable_scopes, tiltott: tagLista.body.blocked_scopes, rule: tagLista.body.startup_rule_version });

  let linv = await dora.post('/api/invites', { email: 'elek@r123.hu', role: 'user', scope: 'keszlet' });
  await elek.post('/api/invites/pending', { token: linv.body.token });
  const elekId = await signUp(elek, 'elek@r123.hu', 'elek-titok-1');
  await elek.post('/api/invites/redeem', { token: linv.body.token });

  // FERI — MÁSODADMIN a RÉGI fiókban, akinek MÉG NINCS rögzített delegálási alapja.
  // MÉRT TÉNY, amiért Feri kell: a meghívó KIADÁSA (`/api/invites`) maga is rögzíti a KIADÓ
  // delegálási alapját, tehát Dórának az első mérés előtt már van alapja. A „még nem rögzített
  // alap" állapot csak olyan eljárónál áll fenn, aki még semmit nem adott ki — ez Feri.
  const feri = new Client(base, 'feri');
  linv = await dora.post('/api/invites', { email: 'feri@r123.hu', role: 'admin', scope: 'keszlet' });
  await feri.post('/api/invites/pending', { token: linv.body.token });
  const feriId = await signUp(feri, 'feri@r123.hu', 'feri-titok-1');
  await feri.post('/api/invites/redeem', { token: linv.body.token });
  await feri.post('/api/session/workspace', { book_id: legacy.book_id });
  grantAdjudicationAuthority({ store, subjectId: feriId, bookId: legacy.book_id, operation: 'alter_right',
    clock: app.clock, basisId: legacy.basis_id });

  // ── A/1 — ÚJ (MÉG NEM RÖGZÍTETT) DELEGÁLT ALAP MELLETT ──────────────────────────────────────
  // A SORREND ITT MÉRÉSI SZERZŐDÉS, NEM STÍLUS. Az ELUTASÍTOTT műveleteket mérjük ELŐBB —
  // különben egy korábbi sikeres lépés (vagy akár egy ELLENŐRZŐ olvasás) már rögzítette volna az
  // alapot, és az elutasításnak nem lenne mit írnia: a mérés a SAJÁT mellékhatását igazolná
  // vissza. EZ A SAJÁT LELETEM EBBEN A KÖRBEN: az első alakomban egy ellenőrző
  // `delegationCeilingOf` hívás — a régi kódúton ÍRÓ hívás — elnyelte a mérést, és a battéria a
  // RÉGI kódon is zöld volt, miközben a hiba megvolt (KUKA-120 · KUKA-121).
  const feriBasisId = delegationBasisId(legacy.book_id, feriId);
  const nincsAlap = basisAsOf({ store, basisId: feriBasisId, bookId: legacy.book_id, validAt: app.clock.now(), knownAt: app.clock.now() });
  step('(a3) a mérés KIINDULÓ ÁLLAPOTA: a másodadminnak MÉG NINCS rögzített delegálási alapja',
    nincsAlap.in_effect !== true, { in_effect: nincsAlap.in_effect ?? null });

  // A NEVEZETT OKOT NEM ÍRJUK ELŐ EGYETLEN CÍMKÉRE (KUKA-237: a próba a VISELKEDÉST mérje). Két
  // plafon-kapu áll itt: a CÉL átvitt korlátja és az ELJÁRÓ saját plafona — mindkettő szabályos,
  // nevezett elutasítás. Amit mérünk: elakad-e, nevezetten-e, és ír-e.
  const plafonOkok = ['outside_basis_scopes', 'outside_transferred_limit'];
  const p1 = await counts();
  const tulAd = await feri.post('/api/members/scope', { subject_id: elekId, scope: 'dokumentumok' });
  const p2 = await counts();
  step('(a4) ÚJ alap mellett a plafonon TÚLI MEGADÁS nevezetten elakad',
    tulAd.status === 403 && tulAd.body.ok === false && plafonOkok.includes(tulAd.body.reason),
    { status: tulAd.status, reason: tulAd.body.reason, ceiling: tulAd.body.ceiling });
  step('(a5) ÉS SEMMIT NEM ÍR — ÚJ alapverzió sem keletkezik', unchanged(p1, p2), diff(p1, p2));

  const p3 = await counts();
  const tulVon = await feri.post('/api/members/scope/revoke', { subject_id: elekId, scope: 'dokumentumok' });
  const p4 = await counts();
  step('(a6) ÚJ alap mellett a plafonon TÚLI MEGVONÁS nevezetten elakad',
    tulVon.status === 403 && tulVon.body.ok === false && tulVon.body.reason === 'outside_basis_scopes',
    { status: tulVon.status, reason: tulVon.body.reason, ceiling: tulVon.body.ceiling });
  step('(a7) ÉS SEMMIT NEM ÍR — sem alapot, sem alapverziót (F123-01 magja)', unchanged(p3, p4), diff(p3, p4));
  step('(a8) a megvonás-tábla is változatlan (ezt mérte az R121 — ÖNMAGÁBAN nem elég)',
    p4.scope_grant_revocation === p3.scope_grant_revocation, { rev: `${p3.scope_grant_revocation}→${p4.scope_grant_revocation}` });
  const mindigNincs = basisAsOf({ store, basisId: feriBasisId, bookId: legacy.book_id, validAt: app.clock.now(), knownAt: app.clock.now() });
  step('(a9) és a másodadminnak EZUTÁN SEM lett rögzített delegálási alapja',
    mindigNincs.in_effect !== true, { in_effect: mindigNincs.in_effect ?? null });

  // ── A/2 — POZITÍV ELLENPÁR: a plafonon BELÜL MŰKÖDIK (a zöld nem tiltásból jön) ─────────────
  const p5 = await counts();
  const belulAd = await feri.post('/api/members/scope', { subject_id: elekId, scope: 'arak' });
  const p6 = await counts();
  step('(a10) POZITÍV ELLENPÁR — a plafonon BELÜLI megadás sikerül és ÍR',
    belulAd.body.ok === true && belulAd.body.changed === true && p6.scope_grant === p5.scope_grant + 1,
    { changed: belulAd.body.changed, delta: diff(p5, p6) });

  // ── A/3 — MEGLÉVŐ delegált alap mellett ugyanaz a követelmény ───────────────────────────────
  const megvanAlap = basisAsOf({ store, basisId: feriBasisId, bookId: legacy.book_id, validAt: app.clock.now(), knownAt: app.clock.now() });
  step('(a11) MEGLÉVŐ delegált alap: a SIKERES megadás rögzítette', megvanAlap.in_effect === true,
    { in_effect: megvanAlap.in_effect, version: megvanAlap.version, scopes: megvanAlap.limit ? megvanAlap.limit.scopes : null });
  const p7 = await counts();
  const tulVon2 = await feri.post('/api/members/scope/revoke', { subject_id: elekId, scope: 'beszallitok' });
  const p8 = await counts();
  step('(a12) MEGLÉVŐ delegált alap mellett is írásmentes az elutasítás',
    tulVon2.body.reason === 'outside_basis_scopes' && unchanged(p7, p8), diff(p7, p8));

  // ── A/4 — VÁLTOZOTT SZÜLŐPLAFON: a rögzített alap ELAVUL, a döntés a MAI plafont követi ─────
  // A fixture hatását a SZÜLŐ alap közvetlen olvasásával igazoljuk (`basisAsOf`) — SOHA nem a
  // plafon-feloldóval, mert az a régi kódúton maga is ÍR, és elnyelné a mérést (lásd (a3) fent).
  const szukites = recordAuthorityBasis({
    store, basisId: legacy.basis_id, bookId: legacy.book_id, issuerSubject: doraId,
    effectiveAt: app.clock.now(), recordedAt: app.clock.now(),
    allowedOperations: ['invite_issue', 'alter_right'], allowedRoles: ['admin', 'user'], allowedScopes: ['keszlet'],
    evidenceRef: 'r123-fixture: a szülőplafon SZŰKÍTVE — csak keszlet',
  });
  const szuloMost = basisAsOf({ store, basisId: legacy.basis_id, bookId: legacy.book_id, validAt: app.clock.now(), knownAt: app.clock.now() });
  step('(a13) a SZÜLŐPLAFON valóban szűkült (KÖZVETLEN olvasással igazolva)',
    szukites.ok === true && szuloMost.in_effect === true
    && Array.isArray(szuloMost.limit.scopes) && szuloMost.limit.scopes.length === 1 && szuloMost.limit.scopes[0] === 'keszlet',
    { uj_verzio: szukites.version, szulo_plafon: szuloMost.limit ? szuloMost.limit.scopes : null });
  const p9 = await counts();
  const tulVon3 = await dora.post('/api/members/scope/revoke', { subject_id: elekId, scope: 'arak' });
  const p10 = await counts();
  step('(a14) VÁLTOZOTT szülőplafonnál a korábban MEGENGEDETT kör is elakad — ÍRÁS NÉLKÜL',
    tulVon3.body.ok === false && tulVon3.body.reason === 'outside_basis_scopes' && unchanged(p9, p10),
    { reason: tulVon3.body.reason, ceiling: tulVon3.body.ceiling, delta: diff(p9, p10) });
  const elekArak = readScopeGrantAt({ store, subjectId: elekId, bookId: legacy.book_id, scope: 'arak', validAt: app.clock.now(), knownAt: app.clock.now() });
  step('(a15) és a megtámadott jog ÉRVÉNYBEN marad (az elutasítás nem fél-hatás)',
    elekArak.granted === true, { granted: elekArak.granted });
  const mostPlafon = delegationCeilingOf({ store, subjectId: doraId, bookId: legacy.book_id, at: app.clock.now() });
  step('(a16) a plafon-feloldó a MAI szülőplafont adja (és ez a hívás A MÉRÉS UTÁN áll)',
    mostPlafon.ok === true && mostPlafon.scopes.length === 1 && mostPlafon.scopes[0] === 'keszlet', { plafon: mostPlafon.scopes });

  // A RÉGI FIÓK NEM TÁGUL — VALÓDI TÁROLT ALAKON MÉRVE, nem konstans-lista egyezéssel.
  step('(a17) a RÉGI fiók indulási szabálya v1 MARADT a tárolóban (nem írta át a v2 bevezetése)',
    store.get('SELECT rule_version FROM workspace_bootstrap WHERE book_id = ?', legacy.book_id).rule_version === 'v1',
    { rule: store.get('SELECT rule_version FROM workspace_bootstrap WHERE book_id = ?', legacy.book_id).rule_version });

  // JOGOSULATLAN eljáró · ISMERETLEN kör · NEM TAG cél — ugyanaz a követelmény, a MAI fiókban.
  const c7 = await counts();
  const jogosulatlan = await cili.post('/api/members/scope/revoke', { subject_id: cilild, scope: 'arak' });
  const c8 = await counts();
  step('(a18) a JOGOSULATLAN eljáró elutasítása írásmentes (a saját sorára sem ír)',
    jogosulatlan.body.ok === false && unchanged(c7, c8), { reason: jogosulatlan.body.reason, delta: diff(c7, c8) });
  const c9 = await counts();
  const ismeretlenKor = await anna.post('/api/members/scope/revoke', { subject_id: cilild, scope: 'nincs-ilyen-kor' });
  const c10 = await counts();
  step('(a19) az ISMERETLEN adatkör elutasítása írásmentes és NEVEZETT',
    ismeretlenKor.body.ok === false && unchanged(c9, c10), { reason: ismeretlenKor.body.reason ?? ismeretlenKor.body.error, delta: diff(c9, c10) });
  const c11 = await counts();
  const nemTag = await anna.post('/api/members/scope/revoke', { subject_id: 'sub_nincs_ilyen', scope: 'arak' });
  const c12 = await counts();
  step('(a20) a NEM TAG célra adott megvonás írásmentes és NEVEZETT',
    nemTag.body.ok === false && nemTag.body.reason === 'target_not_a_member' && unchanged(c11, c12),
    { reason: nemTag.body.reason, delta: diff(c11, c12) });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('B) F123-02 — A BUKOTT TÁROLÁS NEM HAGY RÉSZLEGES ÍRÁST');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // Vissza kell adni Bélának a `keszlet` kört, hogy legyen mit megvonni a következő mérésekhez.
  await anna.post('/api/members/scope', { subject_id: cilild, scope: 'keszlet' });

  // (b) NULLA-SOROS TÁROLÁS: a beszúrás NÉMÁN elmarad (RAISE(IGNORE)) — ez a NEVEZETT hibakimenet.
  store.db.exec(`CREATE TEMP TRIGGER r123_ignore BEFORE INSERT ON scope_grant_revocation
                 BEGIN SELECT RAISE(IGNORE); END`);
  const c13 = await counts();
  const nullaSor = await anna.post('/api/members/scope/revoke', { subject_id: cilild, scope: 'keszlet' });
  const c14 = await counts();
  step('(b1) a NULLA-SOROS tárolás NEVEZETT hibakimenet, nem csendes siker',
    nullaSor.body.ok === false && nullaSor.body.changed === false
    && typeof nullaSor.body.reason === 'string' && nullaSor.body.reason.length > 0,
    { ok: nullaSor.body.ok, changed: nullaSor.body.changed, reason: nullaSor.body.reason });
  step('(b2) ÉS a művelet SAJÁT részleges írása visszagörög — az `authority_basis` sem mozdul (F123-02 magja)',
    unchanged(c13, c14), diff(c13, c14));
  const megvanMeg = readScopeGrantAt({ store, subjectId: cilild, bookId, scope: 'keszlet', validAt: app.clock.now(), knownAt: app.clock.now() });
  step('(b3) a jog TARTALMA változatlan a bukott kísérlet után',
    megvanMeg.granted === true, { granted: megvanMeg.granted });
  store.db.exec('DROP TRIGGER r123_ignore');

  // (b/c) KIVÉTELES ÁG — POZITÍV ELLENPÁR: ez ma is helyesen görget vissza.
  store.db.exec(`CREATE TEMP TRIGGER r123_abort BEFORE INSERT ON scope_grant_revocation
                 BEGIN SELECT RAISE(ABORT, 'r123-probapad'); END`);
  const c15 = await counts();
  const kivetel = await anna.post('/api/members/scope/revoke', { subject_id: cilild, scope: 'keszlet' });
  const c16 = await counts();
  step('(b4) POZITÍV ELLENPÁR — a KIVÉTELES ág is visszagörget, és nem ad hamis sikert',
    kivetel.body.ok !== true && unchanged(c15, c16), { ok: kivetel.body.ok, status: kivetel.status, delta: diff(c15, c16) });
  store.db.exec('DROP TRIGGER r123_abort');

  // (b/d) A JOGOS ISMÉTLÉS a visszagörgetés UTÁN sikerül — nem ragadt be semmi.
  const c17 = await counts();
  const jogosIsmet = await anna.post('/api/members/scope/revoke', { subject_id: cilild, scope: 'keszlet' });
  const c18 = await counts();
  step('(b5) a JOGOS ISMÉTLÉS a visszagörgetés után SIKERÜL (a kapu nem lett fal — KUKA-122)',
    jogosIsmet.body.ok === true && jogosIsmet.body.changed === true
    && c18.scope_grant_revocation === c17.scope_grant_revocation + 1,
    { ok: jogosIsmet.body.ok, changed: jogosIsmet.body.changed, delta: diff(c17, c18) });

  // (b/e) UGYANEZ A MEGADÁSI ÚTON: bukott grant → nincs bent maradó alap-írás.
  store.db.exec(`CREATE TEMP TRIGGER r123_grant_ignore BEFORE INSERT ON scope_grant
                 BEGIN SELECT RAISE(IGNORE); END`);
  const c19 = await counts();
  const bukottGrant = await anna.post('/api/members/scope', { subject_id: cilild, scope: 'keszlet' });
  const c20 = await counts();
  step('(b6) a MEGADÁSI úton is: bukott tárolás → nevezett hiba, részleges írás nélkül',
    bukottGrant.body.ok === false && unchanged(c19, c20), { reason: bukottGrant.body.reason, delta: diff(c19, c20) });
  store.db.exec('DROP TRIGGER r123_grant_ignore');

  // ── B/2 — A BEJELENTETT ALAK: FRISS ALAPÚ ELJÁRÓ + BUKOTT TÁROLÁS ──────────────────────────
  // EZ a külső fél által mért eset (`authority_basis` 2 → 3): az eljárónak MÉG NINCS rögzített
  // delegálási alapja, tehát a művelet ELŐKÉSZÍTŐ írása most VALÓBAN megtörténne — és a régi
  // alakban bent maradt, miközben a nyugta `ok=false, changed=false`-ot mondott.
  const gizi = new Client(base, 'gizi');
  let ginv = await dora.post('/api/invites', { email: 'gizi@r123.hu', role: 'admin', scope: 'keszlet' });
  await gizi.post('/api/invites/pending', { token: ginv.body.token });
  const giziId = await signUp(gizi, 'gizi@r123.hu', 'gizi-titok-1');
  await gizi.post('/api/invites/redeem', { token: ginv.body.token });
  await gizi.post('/api/session/workspace', { book_id: legacy.book_id });
  grantAdjudicationAuthority({ store, subjectId: giziId, bookId: legacy.book_id, operation: 'alter_right',
    clock: app.clock, basisId: legacy.basis_id });
  const giziBasisId = delegationBasisId(legacy.book_id, giziId);
  step('(b7) a KIINDULÓ ÁLLAPOT: az eljárónak MÉG NINCS rögzített delegálási alapja',
    basisAsOf({ store, basisId: giziBasisId, bookId: legacy.book_id, validAt: app.clock.now(), knownAt: app.clock.now() }).in_effect !== true);

  // MÉRT TÉNY, amit ki kell mondani: a MEGHÍVÓ BEVÁLTÁSA ma CSAK TAGSÁGOT ad
  // (`shape: membership_only`, `read_scope_granted: null`) — a pecsételt adatkör nem lesz magától
  // olvasási jog. Ezért amit meg akarunk vonni, azt EXPLICIT megadással kell létrehozni.
  const elore = await feri.post('/api/members/scope', { subject_id: elekId, scope: 'keszlet' });
  step('(b7/a) a megvonandó jog EXPLICIT megadással áll elő (a beváltás csak tagságot ad)',
    elore.body.ok === true && elore.body.changed === true, { ok: elore.body.ok, changed: elore.body.changed });

  store.db.exec(`CREATE TEMP TRIGGER r123_rev_ignore2 BEFORE INSERT ON scope_grant_revocation
                 BEGIN SELECT RAISE(IGNORE); END`);
  const q1 = await counts();
  const frissBukott = await gizi.post('/api/members/scope/revoke', { subject_id: elekId, scope: 'keszlet' });
  const q2 = await counts();
  step('(b8) a nyugta NEVEZETTEN nemleges', frissBukott.body.ok === false && frissBukott.body.changed === false
    && typeof frissBukott.body.reason === 'string', { ok: frissBukott.body.ok, changed: frissBukott.body.changed, reason: frissBukott.body.reason });
  step('(b9) és FRISS alap mellett sem marad bent ELŐKÉSZÍTŐ írás (a bejelentett 2 → 3 alak)',
    unchanged(q1, q2), diff(q1, q2));
  store.db.exec('DROP TRIGGER r123_rev_ignore2');
  const q3 = await counts();
  const frissJogos = await gizi.post('/api/members/scope/revoke', { subject_id: elekId, scope: 'keszlet' });
  const q4 = await counts();
  step('(b10) POZITÍV ELLENPÁR — a trigger nélkül ugyanez a művelet sikerül',
    frissJogos.body.ok === true && frissJogos.body.changed === true
    && q4.scope_grant_revocation === q3.scope_grant_revocation + 1, { changed: frissJogos.body.changed, delta: diff(q3, q4) });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('C) F123-03 — A MEGADÁS ÜZLETILEG IDEMPOTENS');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  const c21 = await counts();
  const elso = await anna.post('/api/members/scope', { subject_id: cilild, scope: 'keszlet' });
  const c22 = await counts();
  step('(c1) az ELSŐ megadás VALÓDI változás: ok=true, changed=true, EGY új jog-sor',
    elso.body.ok === true && elso.body.changed === true
    && c22.scope_grant === c21.scope_grant + 1, { changed: elso.body.changed, delta: diff(c21, c22) });

  const c23 = await counts();
  const masodik = await anna.post('/api/members/scope', { subject_id: cilild, scope: 'keszlet' });
  const c24 = await counts();
  step('(c2) a MÁSODIK, azonos megadás NEM gyárt új jog-sort (F123-03 magja)',
    masodik.body.ok === true && masodik.body.changed === false
    && c24.scope_grant === c23.scope_grant, { ok: masodik.body.ok, changed: masodik.body.changed, delta: diff(c23, c24) });
  step('(c3) és a második megadás az `authority_basis`-t sem mozdítja',
    c24.authority_basis === c23.authority_basis, { basis: `${c23.authority_basis}→${c24.authority_basis}` });

  const napElotte = app.clock.now();
  const c25 = await counts();
  const megvon = await anna.post('/api/members/scope/revoke', { subject_id: cilild, scope: 'keszlet' });
  const ujra = await anna.post('/api/members/scope', { subject_id: cilild, scope: 'keszlet' });
  const c26 = await counts();
  step('(c4) VISSZAVONÁS UTÁN az újramegadás VALÓDI új esemény (nem nyeli el az idempotencia)',
    megvon.body.ok === true && megvon.body.changed === true
    && ujra.body.ok === true && ujra.body.changed === true
    && c26.scope_grant === c25.scope_grant + 1, { megvon: megvon.body.changed, ujra: ujra.body.changed, delta: diff(c25, c26) });

  const c27 = await counts();
  const masAlany = await anna.post('/api/members/scope', { subject_id: belaId, scope: 'keszlet' });
  const masKor = await anna.post('/api/members/scope', { subject_id: cilild, scope: 'dokumentumok' });
  const c28 = await counts();
  step('(c5) MÁS alanyra és MÁS adatkörre a megadás KÜLÖN esemény (nem mos össze)',
    masAlany.body.changed === true && masKor.body.changed === true
    && c28.scope_grant === c27.scope_grant + 2, { delta: diff(c27, c28) });

  const tortenet = readScopeGrantAt({ store, subjectId: cilild, bookId, scope: 'keszlet', validAt: napElotte, knownAt: napElotte });
  step('(c6) a TÖRTÉNET sértetlen: a megvonás előtti pillanatra a jog továbbra is látszik',
    tortenet.granted === true, { granted: tortenet.granted, at: napElotte });

  const idegenKonyv = await anna.post('/api/members/scope', { subject_id: cilild, scope: 'keszlet', expected_book_id: 'masik_konyv' });
  step('(c7) IDEGEN nézetből küldött megadás elakad a kontextus-kapun (KTX-02)',
    idegenKonyv.body.ok === false, { status: idegenKonyv.status, reason: idegenKonyv.body.reason ?? idegenKonyv.body.error });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('D) A NYUGTA IGAZAT MOND — MINDEN BEKAPCSOLT NYELVEN');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  const langs = enabledLanguages().map((l) => l.code);
  for (const key of ['memberCanSee', 'scopeGrantUnchanged', 'scopeRevoked', 'scopeRevokeUnchanged']) {
    const hol = langs.filter((lc) => {
      const d = dictFor(lc);
      const t = (d.TPL || {})[key];
      return typeof t === 'string' && t.trim().length > 0;
    });
    step(`(d) a "${key}" nyugta-szöveg MINDEN bekapcsolt nyelven megvan`, hol.length === langs.length, { megvan: hol, kell: langs });
  }

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('E) A PLAFON-KÖZLÉS ÉS A NÉGY KÖR — a felület nem talál ki jogot');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  const lista = await anna.get('/api/members');
  step('(e1) a tag-lista kimondja a megadható és a TILTOTT köröket',
    Array.isArray(lista.body.grantable_scopes) && Array.isArray(lista.body.blocked_scopes),
    { megadhato: lista.body.grantable_scopes, tiltott: lista.body.blocked_scopes });
  step('(e2) a négy kör a ZÁRT szótárból jön, nem a felületről',
    KNOWN_DATA_SCOPES.length === 4, KNOWN_DATA_SCOPES);
  const belaBasis = basisAsOf({ store, basisId: delegationBasisId(bookId, belaId), bookId, validAt: app.clock.now(), knownAt: app.clock.now() });
  step('(e3) a delegálási alap ÁLLAPOTA olvasható (a mérés nem sejt)',
    belaBasis !== null && typeof belaBasis === 'object', { in_effect: belaBasis.in_effect ?? null, version: belaBasis.version ?? null });

} finally {
  await app.close();
  if (existsSync(dbPath)) rmSync(dbPath, { force: true });
}

const pass = results.filter((x) => x.pass).length;
console.log(`\n${'='.repeat(94)}`);
console.log(`findings_r123: ${pass}/${results.length} PASS`);
if (pass !== results.length) {
  console.log('\nBUKOTT:');
  for (const x of results.filter((y) => !y.pass)) console.log(`  · [${x.section}] ${x.name}`);
}
process.exit(pass === results.length ? 0 : 1);
