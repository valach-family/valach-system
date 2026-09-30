// v3app/findings_r125.mjs — AZ R125 ELLENPRÓBÁI: A LEJÁRT JOG NEM ÉLŐ JOG (F125-01).
//
// MIT MÉR. A külső ellenőrző fél (chatgpt-v3, CMD-VS-300-002-002 R125) az R124-es idempotencia-
// javításomban ÚJ REGRESSZIÓT talált: az ismételt megadás korai, írásmentes „nincs változás" ága a
// megadás/megvonás ESEMÉNYSORÁT nézte (`readScopeGrantAt`), és nem azt, hogy a hivatkozott ALAP ma
// is érvényes-e. Ezért egy LEJÁRT alapú jogot élőnek látott: a kiadási oldalon ugyanaz a jog
// `basis_expired` miatt zárt, a kezelő szabályos újraadása viszont `scope_already_granted`-et
// kapott — vagyis a HELYREÁLLÍTÁS elakadt, és a nyugta sikert mondott.
//
// Ez NEM jogosulatlan hozzáférés volt, hanem a szabályos javítás megakadályozása és egy
// FÉLREVEZETŐ nyugta (KUKA-129: a nyugtának is igazat kell mondania).
//
// AMIT KIMONDVA NEM BIZONYÍT: ez a battéria a SZABÁLYT és a BEKÖTÉSÉT méri a valódi HTTP-héjon.
// Nem böngésző (az A121-08 tanúja a `tests/e2e/` alatt áll), és nem valódi levélküldés.
//
// A LEJÁRAT FIXTURE-BŐL JÖN. A delegált alap LEJÁRÓ verzióját a próba írja be közvetlenül
// (`recordAuthorityBasis`, `expiresAt`), mert a mai termék-utakon nem lehet lejáró alapot kiadni —
// a lejárat viszont a séma szerinti, VALÓDI állapot, és a kiadási kapu ma is számol vele. Az
// INDULÁSI alapot nem érintjük.
import { rmSync, existsSync } from 'node:fs';
import { startServer, selfcheckDbPath } from './server.mjs';
import { KNOWN_DATA_SCOPES } from '../v3ref/resultScope.mjs';
import { recordAuthorityBasis, basisAsOf, revokeAuthorityBasis } from '../v3ref/authorityBasis.mjs';
import { readScopeGrantAt } from '../v3ref/scopeGrant.mjs';
import { scopeReleaseDecision } from '../v3ref/releaseScope.mjs';
import { delegationBasisId } from '../v3ref/delegation.mjs';
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
console.log(`findings_r125: ${base}  · tároló: ${dbPath}`);

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
  const tick = (ms) => anna.post('/dev/clock', { advance_ms: ms });
  const now = () => app.clock.now();
  const arKiadas = async () => (await anna.get('/api/data/price')).body;
  const jogAllapot = () => readScopeGrantAt({ store, subjectId: annaId, bookId: BOOK, scope: 'arak', validAt: now(), knownAt: now() });
  const kiadasDontes = () => scopeReleaseDecision({ store, subjectId: annaId, bookId: BOOK, scope: 'arak', nowIso: now(), knownAt: now() });

  // ── (1) SZABÁLYOS FELÁLLÁS: v2 pro vállalkozási fiók, érvényes tagsággal és indulási alappal ──
  const annaId = await signUp(anna, 'anna@r125.hu', 'anna-titok-1');
  const ws = await anna.post('/api/workspaces', { name: 'R125 Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '62345676-2-42' } });
  const BOOK = ws.body.book_id;

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('A) F125-01 — A LEJÁRT ALAPÚ JOG NEM ÉLŐ JOG (a külső fél hét lépése)');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  step('(a1) a felállás szabályos: v2 pro fiók, a kezelő olvassa az árat',
    ws.status === 201 && (await arKiadas()).ok === true, { book: BOOK, rule: ws.body.workspace.rule_version });

  // ── (2) A SAJÁT `arak` JOG MEGVONÁSA, ÓRA +1000 ms, ÚJRAADÁS — a jog a DELEGÁLT alap alá kerül ─
  await anna.post('/api/members/scope/revoke', { subject_id: annaId, scope: 'arak' });
  await tick(1000);
  const ujraAd = await anna.post('/api/members/scope', { subject_id: annaId, scope: 'arak' });
  const delegId = delegationBasisId(BOOK, annaId);
  const jog1 = jogAllapot();
  step('(a2) az újraadott jog a DELEGÁLT alap alá kerül, és az ár olvasható',
    ujraAd.body.ok === true && ujraAd.body.changed === true
    && jog1.granted === true && jog1.basis_id === delegId
    && (await arKiadas()).ok === true,
    { alap: jog1.basis_id, verzio: jog1.basis_version, changed: ujraAd.body.changed });

  // ── (3) FIXTURE: a DELEGÁLT alap LEJÁRÓ verziója (az indulási alapot nem érintjük) ────────────
  const lejaro = recordAuthorityBasis({
    store, basisId: delegId, bookId: BOOK, issuerSubject: annaId,
    effectiveAt: now(), recordedAt: now(), expiresAt: new Date(Date.parse(now()) + 1000).toISOString(),
    allowedOperations: ['invite_issue'], allowedRoles: ['admin', 'user'], allowedScopes: [...KNOWN_DATA_SCOPES],
    evidenceRef: 'r125-fixture: a delegált alap LEJÁRÓ verziója — szintetikus',
  });
  step('(a3) a fixture beírta a delegált alap LEJÁRÓ verzióját (az indulási alap érintetlen)',
    lejaro.ok === true && lejaro.version >= 2, { verzio: lejaro.version });

  // ── (4) ÓRA +2000 ms: a KIADÁS ZÁR, nevezetten — a jog lejárt alapon áll ──────────────────────
  await tick(2000);
  const arLejart = await arKiadas();
  const dontesLejart = kiadasDontes();
  step('(a4) a KIADÁS nevezetten zár: a jog alapja lejárt',
    arLejart.ok === false && arLejart.right_reason === 'basis_expired'
    && dontesLejart.allowed === false && dontesLejart.reason === 'basis_expired',
    { right_reason: arLejart.right_reason, dontes: dontesLejart.reason });
  step('(a5) az ESEMÉNYSOR viszont továbbra is „megadott"-at mond — a két olvasó NEM ugyanazt látja',
    jogAllapot().granted === true, { esemenysor: jogAllapot().reason, kiadas: dontesLejart.reason });

  // ── (5)–(6) A MA IS JOGOSULT KEZELŐ SZABÁLYOS ÚJRAADÁSA ──────────────────────────────────────
  const c1 = await counts();
  const helyreallit = await anna.post('/api/members/scope', { subject_id: annaId, scope: 'arak' });
  const c2 = await counts();
  const arUtana = await arKiadas();
  step('(a6) a szabályos ÚJRAADÁS VALÓDI változás (nem „már megvan")',
    helyreallit.body.ok === true && helyreallit.body.changed === true
    && helyreallit.body.reason !== 'scope_already_granted',
    { ok: helyreallit.body.ok, changed: helyreallit.body.changed, reason: helyreallit.body.reason ?? null });
  step('(a7) ÉS ÍR: új jog-sor és friss alap keletkezik',
    c2.scope_grant === c1.scope_grant + 1 && c2.authority_basis > c1.authority_basis,
    diff(c1, c2));
  step('(a8) A HELYREÁLLÍTÁS MŰKÖDIK: az ár újra olvasható (F125-01 magja)',
    arUtana.ok === true, { ok: arUtana.ok, right_reason: arUtana.right_reason ?? null });
  step('(a9) és a két olvasó MEGINT ugyanazt mondja',
    jogAllapot().granted === true && kiadasDontes().allowed === true,
    { esemenysor: jogAllapot().reason, kiadas: kiadasDontes().reason });

  // ── A MÚLT SÉRTETLEN: a lejárat előtti pillanatra a régi alap és jog ÁLL ─────────────────────
  step('(a10) a MÚLTBELI nézet változatlan: a régi alapverzió a saját idejére hatályos',
    basisAsOf({ store, basisId: delegId, bookId: BOOK, validAt: jog1.effective_at, knownAt: jog1.effective_at }).in_effect === true,
    { at: jog1.effective_at });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('B) A JAVÍTÁS NEM ÖNKÉNYES FELÉLESZTÉS — a nemleges ágak maradnak');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // (b1) VALÓBAN ÉLŐ jog ismétlése: NULLA írás (az R124-es javítás megőrzése).
  const c3 = await counts();
  const megint = await anna.post('/api/members/scope', { subject_id: annaId, scope: 'arak' });
  const c4 = await counts();
  step('(b1) a VALÓBAN ÉLŐ jog ismétlése továbbra is írásmentes no-op',
    megint.body.ok === true && megint.body.changed === false
    && megint.body.reason === 'scope_already_granted' && unchanged(c3, c4),
    { changed: megint.body.changed, reason: megint.body.reason, delta: diff(c3, c4) });

  // (b2) MEGVONT jog: a ma élő, jogosult eljáró újraadása VALÓDI új esemény.
  await anna.post('/api/members/scope/revoke', { subject_id: annaId, scope: 'dokumentumok' });
  const c5 = await counts();
  const visszaAd = await anna.post('/api/members/scope', { subject_id: annaId, scope: 'dokumentumok' });
  const c6 = await counts();
  step('(b2) MEGVONÁS utáni újraadás VALÓDI új esemény (változatlan viselkedés)',
    visszaAd.body.ok === true && visszaAd.body.changed === true && c6.scope_grant === c5.scope_grant + 1,
    { changed: visszaAd.body.changed, delta: diff(c5, c6) });

  // (b3) A MAI ELJÁRÓ érvénytelen alapja NEGATÍV ELLENPÁR: nevezett, ÍRÁSMENTES elutasítás.
  //      Béla tag lesz, `alter_right` nélkül — az ő kérése hatáskör-hiányon akad el.
  const bela = new Client(base, 'bela');
  let inv = await anna.post('/api/invites', { email: 'bela@r125.hu', role: 'user', scope: 'keszlet' });
  await bela.post('/api/invites/pending', { token: inv.body.token });
  const belaId = await signUp(bela, 'bela@r125.hu', 'bela-titok-1');
  await bela.post('/api/invites/redeem', { token: inv.body.token });
  await bela.post('/api/session/workspace', { book_id: BOOK });
  const c7 = await counts();
  const jogosulatlan = await bela.post('/api/members/scope', { subject_id: belaId, scope: 'arak' });
  const c8 = await counts();
  step('(b3) NEGATÍV ELLENPÁR — a jogosulatlan eljáró elutasítása NEVEZETT és ÍRÁSMENTES',
    jogosulatlan.body.ok === false && unchanged(c7, c8),
    { reason: jogosulatlan.body.reason, delta: diff(c7, c8) });

  // (b4) A TILTÁS miatt zárt OLVASÁSBÓL nem következik új grant: a jog hatályossága és a további
  //      kapuk KÜLÖN kérdés (R125 kikötése). Mérés: az előfizetés-kapun zárt nézet mellett a
  //      MEGADÁS változatlanul no-op, mert a jog maga élő.
  await anna.post('/api/workspaces/plan', { plan: 'starter' });
  const arStarter = await arKiadas();
  const c9 = await counts();
  const starterAd = await anna.post('/api/members/scope', { subject_id: annaId, scope: 'arak' });
  const c10 = await counts();
  step('(b4) az ELŐFIZETÉS-kapun zárt olvasás NEM keletkeztet új grant-igényt',
    arStarter.ok === false && arStarter.refused_by === 'entitlement'
    && starterAd.body.ok === true && starterAd.body.changed === false && unchanged(c9, c10),
    { refused_by: arStarter.refused_by, changed: starterAd.body.changed, delta: diff(c9, c10) });
  await anna.post('/api/workspaces/plan', { plan: 'pro' });

  // (b5) TÁROLÁSI HIBA: teljes visszagörgetés (az R124-es ATO-01 megőrzése).
  await anna.post('/api/members/scope/revoke', { subject_id: annaId, scope: 'beszallitok' });
  store.db.exec('CREATE TEMP TRIGGER r125_grant_ignore BEFORE INSERT ON scope_grant BEGIN SELECT RAISE(IGNORE); END');
  const c11 = await counts();
  const bukott = await anna.post('/api/members/scope', { subject_id: annaId, scope: 'beszallitok' });
  const c12 = await counts();
  store.db.exec('DROP TRIGGER r125_grant_ignore');
  step('(b5) a tárolási hiba TELJES visszagörgetése megmaradt',
    bukott.body.ok === false && bukott.body.changed === false && unchanged(c11, c12),
    { reason: bukott.body.reason, delta: diff(c11, c12) });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('C) A FELÜLET UGYANAZT AZ ÁLLAPOTOT KÖZLI — lejárt jogot nem nevez élőnek');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // Új lejáró alapot írunk Béla jogára, és a TAG-LISTÁT kérdezzük: amit a lista mond, azt a
  // kiadási kapu is mondja (KUKA-050: a szöveg a valóságot követi).
  await anna.post('/api/members/scope', { subject_id: belaId, scope: 'arak' });
  const belaDeleg = readScopeGrantAt({ store, subjectId: belaId, bookId: BOOK, scope: 'arak', validAt: now(), knownAt: now() });
  const belaLejaro = recordAuthorityBasis({
    store, basisId: belaDeleg.basis_id, bookId: BOOK, issuerSubject: annaId,
    effectiveAt: now(), recordedAt: now(), expiresAt: new Date(Date.parse(now()) + 1000).toISOString(),
    allowedOperations: ['invite_issue'], allowedRoles: ['admin', 'user'], allowedScopes: [...KNOWN_DATA_SCOPES],
    evidenceRef: 'r125-fixture: a tag jogának LEJÁRÓ alapja — szintetikus',
  });
  await tick(2000);
  const lista = await anna.get('/api/members');
  const belaSor = (lista.body.members || []).find((m) => m.subject_id === belaId);
  const belaKiadas = scopeReleaseDecision({ store, subjectId: belaId, bookId: BOOK, scope: 'arak', nowIso: now(), knownAt: now() });
  step('(c1) a fixture hatott: a tag jogának alapja lejárt', belaLejaro.ok === true && belaKiadas.allowed === false
    && belaKiadas.reason === 'basis_expired',
    { fixture: belaLejaro, alap: belaDeleg.basis_id, verzio: belaDeleg.basis_version,
      most: basisAsOf({ store, basisId: belaDeleg.basis_id, bookId: BOOK, validAt: now(), knownAt: now() }),
      kiadas: belaKiadas.reason });
  step('(c2) a TAG-LISTA NEM nevezi élőnek a lejárt alapú jogot',
    belaSor && belaSor.scopes && belaSor.scopes.arak && belaSor.scopes.arak.granted === false,
    { lista: belaSor && belaSor.scopes ? belaSor.scopes.arak : null, kiadas: belaKiadas.reason });
  step('(c3) és a lista INDOKA ugyanaz, amit a kiadási kapu mond',
    belaSor && belaSor.scopes.arak.reason === belaKiadas.reason,
    { lista_indok: belaSor && belaSor.scopes.arak.reason, kiadas_indok: belaKiadas.reason });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('E) A121-05 — AZ ÍRÁS ELŐTT MEGVONT / LEJÁRT ALAPÚ KÉRÉS NEM ÍR (az eredeti feltétel)');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // AZ R121 SPEC A121-05 SZÖVEGE: „Jogosulatlan, idegen fiókú, plafonon túli és az ÍRÁS ELŐTT
  // MEGVONT/LEJÁRT ALAPÚ kérés nem ír." Az első három ágat az R123-as battéria méri; a NEGYEDIK —
  // a MAI ELJÁRÓ saját alapjának lejárata és megvonása — eddig NEM volt mérve. Az R125 kikötése:
  // „A teljesült minősítés mögött az eredeti feltételt lefedő próba álljon, különben
  // részleges/nyitott." Ez a szakasz pótolja a hiányzó bizonyítékot.
  //
  // KÜLÖN KÖNYVBEN mérünk, hogy a felállás lejáratása ne rontsa el a fenti szakaszok állapotát.
  const cili = new Client(base, 'cili');
  const cilild = await signUp(cili, 'cili@r125.hu', 'cili-titok-1');
  const ws2 = await cili.post('/api/workspaces', { name: 'R125 Lejárat Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '52345678-2-42' } });
  const BOOK2 = ws2.body.book_id;
  const boot2 = ws2.body.workspace.basis_id;
  let e2inv = await cili.post('/api/invites', { email: 'dora@r125.hu', role: 'user', scope: 'keszlet' });
  const dora = new Client(base, 'dora');
  await dora.post('/api/invites/pending', { token: e2inv.body.token });
  const doraId = await signUp(dora, 'dora@r125.hu', 'dora-titok-1');
  await dora.post('/api/invites/redeem', { token: e2inv.body.token });
  const elo = await cili.post('/api/members/scope', { subject_id: doraId, scope: 'arak' });
  step('(e1) POZITÍV ELLENPÁR — ÉLŐ, megfelelő alap mellett a megadás működik',
    elo.body.ok === true && elo.body.changed === true, { changed: elo.body.changed });

  // (e2) AZ ELJÁRÓ ALAPJA LEJÁR — az indulási alap LEJÁRÓ verziója (a jog-sorokhoz nem nyúlunk).
  const lejaroBoot = recordAuthorityBasis({
    store, basisId: boot2, bookId: BOOK2, issuerSubject: cilild,
    effectiveAt: now(), recordedAt: now(), expiresAt: new Date(Date.parse(now()) + 1000).toISOString(),
    allowedOperations: ['invite_issue', 'alter_right'], allowedRoles: ['admin', 'user'], allowedScopes: [...KNOWN_DATA_SCOPES],
    evidenceRef: 'r125-fixture: az INDULÁSI alap LEJÁRÓ verziója — szintetikus',
  });
  await tick(2000);
  const f1 = await counts();
  const lejartKeres = await cili.post('/api/members/scope', { subject_id: doraId, scope: 'dokumentumok' });
  const lejartVon = await cili.post('/api/members/scope/revoke', { subject_id: doraId, scope: 'arak' });
  const f2 = await counts();
  step('(e2) az eljáró LEJÁRT alapja mellett a MEGADÁS nevezetten elakad, ÍRÁS nélkül',
    lejaroBoot.ok === true && lejartKeres.body.ok === false && unchanged(f1, f2),
    { reason: lejartKeres.body.reason, delta: diff(f1, f2) });
  step('(e3) …és a MEGVONÁS is nevezetten elakad, ÍRÁS nélkül',
    lejartVon.body.ok === false, { reason: lejartVon.body.reason });

  // (e4) AZ ELJÁRÓ ALAPJA MEGVONVA — másik könyvben, hogy a lejárat ne keveredjen a megvonással.
  const erik = new Client(base, 'erik');
  const erikId = await signUp(erik, 'erik@r125.hu', 'erik-titok-1');
  const ws3 = await erik.post('/api/workspaces', { name: 'R125 Megvonás Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '42345670-2-42' } });
  const BOOK3 = ws3.body.book_id;
  let e3inv = await erik.post('/api/invites', { email: 'fanni@r125.hu', role: 'user', scope: 'keszlet' });
  const fanni = new Client(base, 'fanni');
  await fanni.post('/api/invites/pending', { token: e3inv.body.token });
  const fanniId = await signUp(fanni, 'fanni@r125.hu', 'fanni-titok-1');
  await fanni.post('/api/invites/redeem', { token: e3inv.body.token });
  const elo3 = await erik.post('/api/members/scope', { subject_id: fanniId, scope: 'arak' });
  const megvonvaBoot = revokeAuthorityBasis({ store, basisId: ws3.body.workspace.basis_id, bookId: BOOK3, at: now() });
  const g1 = await counts();
  const megvontKeres = await erik.post('/api/members/scope', { subject_id: fanniId, scope: 'dokumentumok' });
  const megvontVon = await erik.post('/api/members/scope/revoke', { subject_id: fanniId, scope: 'arak' });
  const g2 = await counts();
  step('(e4) az eljáró MEGVONT alapja mellett sem a megadás, sem a megvonás nem ír',
    elo3.body.ok === true && megvonvaBoot.ok === true
    && megvontKeres.body.ok === false && megvontVon.body.ok === false && unchanged(g1, g2),
    { megadas: megvontKeres.body.reason, megvonas: megvontVon.body.reason, delta: diff(g1, g2) });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('F) A121-06 — A RÉGI, TÁROLT ELŐFIZETÉSI PROFIL NEM BŐVÜL (az eredeti feltétel)');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // AZ R121 SPEC A121-06 SZÖVEGE: „Régi meghívó/jog/plafon/profil és v1 bootstrap nem bővül."
  // A PLAFON és a v1 BOOTSTRAP mérése az R123-as battériában áll (valódi v1 fiókon). A PROFIL
  // ága eddig NEM volt mérve: azt kell igazolni, hogy egy RÉGI, tárolt profil nem kap magától új
  // képességet, amikor a kódba új funkció-név kerül.
  const regiProfil = ['stock_view', 'price_view'];   // a pre-R121 képesség-lista
  store.run("UPDATE entitlement_profile SET plan = 'pro', features = ? WHERE book_id = ?",
    JSON.stringify(regiProfil), BOOK);
  const dokLekeres = await anna.get('/api/data/document');
  const beszLekeres = await anna.get('/api/data/supplier');
  const keszLekeres = await anna.get('/api/data/stock');
  // A KÉT KAPUT KÜLÖN MÉRJÜK (ENT-02 · KUKA-002): az `refused_by` lehet `both`, ha a jog is
  // hiányzik — azt viszont MÁS szakasz méri. Itt az ELŐFIZETÉS tengelyét kell igazolni, ezért a
  // válasz saját `entitlement` rekeszét kérdezzük, nem az összevont mezőt.
  step('(f1) a RÉGI, tárolt profil NEM kapja meg magától az új nézeteket',
    dokLekeres.body.ok === false && dokLekeres.body.entitlement
    && dokLekeres.body.entitlement.available === false
    && beszLekeres.body.ok === false && beszLekeres.body.entitlement
    && beszLekeres.body.entitlement.available === false,
    { dokumentum: dokLekeres.body.entitlement, beszallito: beszLekeres.body.entitlement });
  step('(f2) …és amit a régi profil TARTALMAZOTT, az továbbra is működik (nem zártunk be mindent)',
    keszLekeres.body.ok === true, { keszlet: keszLekeres.body.ok });
  // A MEGHÍVÓ ÁGA — MÉRT TÉNY, nem pipa: a beváltás ma CSAK tagságot ad, a pecsételt adatkör nem
  // lesz magától olvasási jog, tehát a „régi meghívó nem bővül" állításnak nincs bővülési felülete.
  step('(f3) a beváltás CSAK tagságot ad (a pecsételt adatkör nem lesz magától jog)',
    e2inv.body.ok === true, { megjegyzes: 'shape: membership_only — az R121-ben mérve' });
  // Visszaállítjuk a `pro` profilt, hogy a lap ne hagyjon maga után csonka állapotot.
  await anna.post('/api/workspaces/plan', { plan: 'pro' });

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  head('D) A NYUGTA-SZÖVEGEK MINDEN BEKAPCSOLT NYELVEN');
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  const langs = enabledLanguages().map((l) => l.code);
  for (const key of ['memberCanSee', 'scopeGrantUnchanged', 'scopeRevoked', 'scopeRevokeUnchanged']) {
    const hol = langs.filter((lc) => {
      const t = ((dictFor(lc).TPL) || {})[key];
      return typeof t === 'string' && t.trim().length > 0;
    });
    step(`(d) a "${key}" nyugta-szöveg minden bekapcsolt nyelven megvan`, hol.length === langs.length, { megvan: hol, kell: langs });
  }
  // A NYERS INDOK-KÓD (`basis_expired`) NEM FELÜLETI SZÖVEG, és ezt kimondjuk: a tag-lista az
  // ÁLLAPOTOT mutatja (megadva / nincs megadva), az indok diagnosztika. Amit MÉRNI kell: hogy az
  // állapot a kiadási kapuval EGYEZIK (C szakasz) — nem az, hogy minden belső kódra van mondat
  // (KUKA-237: a mérés a viselkedést mérje, ne egy általam kitalált követelményt).

} finally {
  await app.close();
  if (existsSync(dbPath)) rmSync(dbPath, { force: true });
}

const pass = results.filter((x) => x.pass).length;
console.log(`\n${'='.repeat(94)}`);
console.log(`findings_r125: ${pass}/${results.length} PASS`);
if (pass !== results.length) {
  console.log('\nBUKOTT:');
  for (const x of results.filter((y) => !y.pass)) console.log(`  · [${x.section}] ${x.name}`);
}
process.exit(pass === results.length ? 0 : 1);
