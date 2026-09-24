// v3app/selfcheck.mjs — A TELJES FOLYAMAT VÉGIGJÁRÁSA A VALÓDI HTTP-HÉJON, süti-tárcával.
//
// Nem a mag függvényeit hívja közvetlenül, hanem a VÉGPONTOKAT — tehát a munkamenet, a süti, a
// paraméter-figyelmen-kívül-hagyás és a válasz-boríték is mérve van, nem csak a mag. Minden lépés
// PASS/FAIL sort ír; bármelyik bukása ⇒ kilépési kód 1. A tároló ideiglenes és a végén törlődik.
import { rmSync, existsSync } from 'node:fs';
import { startServer, selfcheckDbPath, NEUTRAL_REGISTER } from './server.mjs';

const results = [];
function step(name, cond, detail) {
  const pass = !!cond;
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
  return pass;
}

/** Süti-tárcás kliens — egy böngésző-lapot játszik. */
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
    const payload = ct.includes('application/json') ? await res.json() : await res.text();
    return { status: res.status, headers: res.headers, body: payload };
  }
  get(path) { return this.call('GET', path); }
  post(path, body) { return this.call('POST', path, body ?? {}); }
}

const dbPath = selfcheckDbPath();
const app = await startServer({ port: 0, dbPath });
const base = `http://127.0.0.1:${app.port}`;
console.log(`selfcheck: ${base}  · tároló: ${dbPath}`);

try {
  const anna = new Client(base, 'anna');
  const bela = new Client(base, 'bela');
  const mails = async () => (await anna.get('/dev/mailbox')).body.mails;
  const linkFor = async (to, subjectPart) => {
    const m = (await mails()).find((x) => x.to === to && x.subject.includes(subjectPart));
    return m ? m.link : null;
  };
  const tokenOf = (link, key) => new URL(link).searchParams.get(key);

  // ── ANNA ────────────────────────────────────────────────────────────────────────────────────
  let r = await anna.get('/api/me');
  step('névtelen munkamenet létezik belépés előtt', r.status === 200 && r.body.subject_id === null && anna.cookie && anna.cookie.startsWith('vs_session='), anna.cookie ? anna.cookie.slice(0, 20) + '…' : null);
  step('Cache-Control: no-store minden JSON-válaszon', r.headers.get('cache-control') === 'no-store');

  r = await anna.post('/api/register', { email: 'anna@csaladi.hu', password: 'anna-titok-1' });
  step('Anna regisztrál → semleges válasz', r.status === 200 && JSON.stringify(r.body) === JSON.stringify(NEUTRAL_REGISTER), r.body);
  const mailCountAfterAnna = (await mails()).length;
  step('a levél-fogadóban megerősítő levél Annának', mailCountAfterAnna === 1 && !!(await linkFor('anna@csaladi.hu', 'Erősítsd meg')));

  r = await anna.post('/api/register', { email: 'anna@csaladi.hu', password: 'masik-jelszo-9' });
  step('ugyanaz a cím újra → BÁJTRA azonos semleges válasz, ÚJ levél nélkül', r.status === 200 && JSON.stringify(r.body) === JSON.stringify(NEUTRAL_REGISTER) && (await mails()).length === mailCountAfterAnna, r.body);

  const annaVerify = await linkFor('anna@csaladi.hu', 'Erősítsd meg');
  r = await anna.get(new URL(annaVerify).pathname + new URL(annaVerify).search);
  step('Anna megerősítő hivatkozás → siker-lap', r.status === 200 && typeof r.body === 'string' && r.body.includes('data-ok="true"'));
  r = await anna.get(new URL(annaVerify).pathname + new URL(annaVerify).search);
  step('ugyanaz a hivatkozás másodszor → nevezett elutasítás (challenge_already_used)', r.status === 400 && r.body.includes('challenge_already_used'));

  r = await anna.post('/api/login', { email: 'anna@csaladi.hu', password: 'rossz-jelszo-00' });
  step('rossz jelszó → credentials_rejected (401)', r.status === 401 && r.body.reason === 'credentials_rejected');
  const anonCookie = anna.cookie;
  r = await anna.post('/api/login', { email: 'anna@csaladi.hu', password: 'anna-titok-1' });
  step('Anna belép → munkamenet-azonosító ROTÁLVA', r.status === 200 && r.body.ok === true && anna.cookie !== anonCookie, { subject: r.body.subject_id });
  const annaId = r.body.subject_id;
  r = await anna.get('/api/me');
  step('Anna /api/me: e-mail + csatorna bizonyítva', r.body.subject_id === annaId && r.body.email === 'anna@csaladi.hu' && r.body.channel_proven === true, r.body);

  r = await anna.post('/api/workspaces', { name: 'Családi Kft', plan: 'starter', business: { jurisdiction: 'HU', tax_id: '12345678-2-42' } });
  step('Anna létrehozza a „Családi Kft"-t (starter, HU adószám)', r.status === 201 && r.body.ok === true && r.body.workspace.plan === 'starter' && r.body.role === 'admin', { book: r.body.book_id });
  const csalad = r.body.book_id;
  step('a vállalkozási minőség ÖNBEVALLOTT: verification = none_available', r.body.business && r.body.business.ok === true && r.body.business.verification === 'none_available' && r.body.business.jurisdiction === 'HU', r.body.business);
  step('két minta-rekord véglegesítve a létrehozó nevében', r.body.samples.stock.ok === true && r.body.samples.price.ok === true && r.body.samples.stock.state === 'finalized');
  r = await anna.get('/api/me');
  // A SZEMÉLYES KÖR MÁR MEGVAN (SZK-01): a lista KETTŐ — a saját kör és a most indított cég.
  step('Anna aktuális munkakörnyezete a Családi Kft (admin), és a SZEMÉLYES köre is megvan',
    r.body.current_book_id === csalad && r.body.current_role === 'admin' && r.body.workspaces.length === 2
    && r.body.workspaces.filter((w) => w.personal === true).length === 1
    && r.body.personal_book_id !== null && r.body.current_personal === false,
    { ws: r.body.workspaces.map((w) => `${w.name}:${w.kind}`), acting_as: r.body.acting_as });

  r = await anna.post('/api/invites', { email: 'bela@csaladi.hu', role: 'user', scope: 'keszlet' });
  step('Anna meghívja Bélát (user / keszlet) → token + plafon', r.status === 201 && r.body.ok === true && /^[0-9a-f]{64}$/.test(r.body.token) && r.body.ceiling.roles.includes('user'), { ceiling: r.body.ceiling });
  const inviteToken = r.body.token;
  const inviteLink = await linkFor('bela@csaladi.hu', 'Meghívás');
  step('meghívó levél a levél-fogadóban, ?invite= hivatkozással', !!inviteLink && tokenOf(inviteLink, 'invite') === inviteToken, inviteLink);

  r = await anna.post('/api/invites', { email: 'cili@csaladi.hu', role: 'owner', scope: 'keszlet' });
  // A ZÁRT KÉSZLET A HATÁRON IS ZÁRT (HTP-01): a séma ELŐBB dönt, mint a mag — nevezett 400,
  // a választható értékekkel, ÍRÁS NÉLKÜL. (Korábban a mag adta a 403-at; a mag ítélete változatlan.)
  step('ismeretlen szerep a meghívón → nevezett elutasítás a HATÁRON (400 invalid_value)',
    r.status === 400 && r.body.ok === false && r.body.reason === 'invalid_value' && r.body.field === 'role' && r.body.refused_by === 'input_schema', r.body.reason);
  r = await anna.post('/api/invites', { email: 'cili@csaladi.hu', role: 'user', scope: 'penzugy' });
  step('ismeretlen adatkör a meghívón → nevezett elutasítás a HATÁRON (400 invalid_value)',
    r.status === 400 && r.body.reason === 'invalid_value' && r.body.field === 'scope' && r.body.refused_by === 'input_schema', r.body.reason);

  // ── BÉLA — ÚJ FIÓK A MEGHÍVÓN ÁT ────────────────────────────────────────────────────────────
  r = await bela.get(`/api/invites/observe?token=${inviteToken}`);
  step('Béla névtelenül figyeli a meghívót → needs_invitee_identity', r.body.status === 'needs_invitee_identity' && r.body.account_exists === null, r.body.status);
  r = await bela.get('/api/invites/observe?token=nemletezo');
  step('nem létező tokenre UGYANAZ a válasz (nem szivárog)', r.body.status === 'needs_invitee_identity' && r.body.account_exists === null);

  r = await bela.post('/api/invites/pending', { token: inviteToken });
  step('Béla függő szándéka a szerveren', r.body.ok === true);
  r = await bela.post('/api/register', { email: 'bela@csaladi.hu', password: 'bela-titok-1' });
  step('Béla regisztrál → semleges válasz', JSON.stringify(r.body) === JSON.stringify(NEUTRAL_REGISTER));
  const belaVerify = await linkFor('bela@csaladi.hu', 'Erősítsd meg');
  r = await bela.get(new URL(belaVerify).pathname + new URL(belaVerify).search);
  step('Béla megerősít', r.status === 200);
  r = await bela.post('/api/login', { email: 'bela@csaladi.hu', password: 'bela-titok-1' });
  step('Béla belép → a függő meghívó ÁTKERÜL az új munkamenetre', r.body.ok === true && r.body.pending_invite_token === inviteToken, { pending: r.body.pending_invite_token === inviteToken });
  const belaId = r.body.subject_id;

  r = await bela.get(`/api/invites/observe?token=${inviteToken}`);
  step('Béla (bizonyított csatorna) figyeli → redeem_as_existing', r.body.status === 'redeem_as_existing', r.body);
  r = await anna.get(`/api/invites/observe?token=${inviteToken}`);
  step('Anna (nem címzett) figyeli → needs_invitee_identity', r.body.status === 'needs_invitee_identity');

  r = await bela.post('/api/invites/redeem', { token: inviteToken });
  step('Béla beváltja → membership_only / granted', r.status === 200 && r.body.ok === true && r.body.shape === 'membership_only' && r.body.book_id === csalad, r.body);
  const scopeAtRedeem = r.body.read_scope_granted;
  r = await bela.post('/api/invites/redeem', { token: inviteToken });
  step('ugyanaz a meghívó másodszor → nevezett elutasítás', r.status === 403 && r.body.ok === false, r.body.error);

  r = await bela.post('/api/session/workspace', { book_id: csalad });
  step('Béla munkakörnyezetet vált → ok, role user', r.body.ok === true && r.body.role === 'user' && r.body.book_id === csalad);
  r = await bela.post('/api/session/workspace', { book_id: 'ws_idegen' });
  step('idegen könyvre váltás → not_a_member', r.status === 403 && r.body.reason === 'not_a_member');
  r = await bela.get('/api/members');
  step('Béla (user) tag-lista → admin_required', r.status === 403 && r.body.reason === 'admin_required', r.body.reason);
  r = await bela.post('/api/workspaces/plan', { plan: 'pro' });
  step('Béla (user) tervet váltana → admin_required', r.status === 403 && r.body.reason === 'admin_required');

  // A MAG MAI SZABÁLYA (invite.mjs, R63): a meghívó adatköre PLAFON, nem automatikus olvasási jog.
  r = await bela.get('/api/data/stock');
  const stockBeforeGrant = r.body;
  console.log(`      (mérve: beváltáskor read_scope_granted=${JSON.stringify(scopeAtRedeem)}; készlet-nézet a kimondott adatkör-adás ELŐTT: ok=${r.body.ok}, refused_by=${r.body.refused_by}, reason=${r.body.reason})`);
  step('Béla készlet-nézete a kimondott adatkör-adás ELŐTT: a mag dönt (a válasz nevezett, nem 500)', r.status === 200 && typeof r.body.ok === 'boolean' && (r.body.ok || r.body.refused_by === 'right'));

  r = await anna.post('/api/members/scope', { subject_id: belaId, scope: 'keszlet' });
  step('Anna kimondottan megadja Bélának a keszlet adatkört', r.body.ok === true && r.body.scope === 'keszlet', r.body);
  r = await anna.get('/api/members');
  const belaRow = r.body.ok ? r.body.members.find((m) => m.subject_id === belaId) : null;
  step('Anna tag-listája: Béla user, hatályos, keszlet=van, arak=nincs', !!belaRow && belaRow.role === 'user' && belaRow.effective === true && belaRow.scopes.keszlet.granted === true && belaRow.scopes.arak.granted === false, belaRow && belaRow.scopes);

  r = await bela.get('/api/data/stock');
  step('Béla /api/data/stock → ok, qty "12" (kanonikus decimális szöveg)', r.body.ok === true && r.body.result && r.body.result.qty === '12' && r.body.refused_by === null, r.body.result);
  step('  (kimondva) a beváltás önmagában NEM adott olvasási jogot — az admin adatkör-adása kellett', stockBeforeGrant.ok === false && stockBeforeGrant.refused_by === 'right' && scopeAtRedeem === null, { before: stockBeforeGrant.reason });

  r = await bela.get('/api/data/price');
  step('Béla /api/data/price starter terven → a JOG-kapu zár (arak nincs) ÉS az előfizetés-kapu is zár ⇒ refused_by "both"', r.body.ok === false && r.body.refused_by === 'both' && r.body.right_reason && r.body.entitlement_reason === 'feature_not_in_plan', { refused_by: r.body.refused_by, right: r.body.right_reason, ent: r.body.entitlement_reason });

  r = await anna.get('/api/data/price');
  step('Anna /api/data/price starter terven → refused_by "entitlement" (a jog megvan)', r.body.ok === false && r.body.refused_by === 'entitlement' && r.body.entitlement_reason === 'feature_not_in_plan' && r.body.right_reason === null, { refused_by: r.body.refused_by, ent: r.body.entitlement_reason });

  r = await anna.post('/api/workspaces/plan', { plan: 'pro' });
  step('Anna tervet vált: pro', r.body.ok === true && r.body.plan === 'pro' && r.body.features.includes('price_view'));
  r = await anna.post('/api/workspaces/plan', { plan: 'enterprise' });
  step('ismeretlen terv → nevezett elutasítás a HATÁRON (400 invalid_value, a választható tervekkel)',
    r.status === 400 && r.body.reason === 'invalid_value' && r.body.field === 'plan' && /starter/.test(String(r.body.message)), r.body.reason);

  r = await anna.get('/api/data/price');
  step('Anna /api/data/price pro terven → ok, unit_price 3490', r.body.ok === true && r.body.result.unit_price === 3490 && r.body.result.qty === '12' && r.body.refused_by === null, r.body.result);
  r = await bela.get('/api/data/price');
  // A nyitott előfizetés-kapu is NEVEZI az okát (feature_entitled) — a két kapu külön jelent (ENT-02).
  step('Béla /api/data/price pro terven → refused_by "right" (csak a jog-kapu zár, az előfizetés nyitva: feature_entitled)', r.body.ok === false && r.body.refused_by === 'right' && r.body.entitlement_reason === 'feature_entitled' && r.body.right_reason === 'not_available', { refused_by: r.body.refused_by, right: r.body.right_reason, ent: r.body.entitlement_reason });

  r = await bela.post('/api/members/scope', { subject_id: belaId, scope: 'arak' });
  step('Béla (user) magának adna adatkört → nevezett elutasítás (role_not_delegable)', r.status === 403 && r.body.ok === false && typeof r.body.reason === 'string', r.body.reason);
  r = await bela.post('/api/members/revoke', { subject_id: annaId });
  step('Béla (user) megvonná Annát → nevezett elutasítás (nincs alter_right hatásköre)', r.status === 403 && r.body.ok === false && typeof r.body.reason === 'string', r.body.reason);

  // ── MEGVONÁS ────────────────────────────────────────────────────────────────────────────────
  r = await anna.post('/api/members/revoke', { subject_id: belaId });
  step('Anna megvonja Béla tagságát → revocation_recorded', r.body.ok === true && r.body.revocation.changed === true && r.body.revocation.reason === 'revocation_recorded' && r.body.delegation && r.body.delegation.ok === true, { delegation: r.body.delegation.reason });

  r = await bela.get('/api/data/stock');
  step('Béla /api/data/stock megvonás után → elutasítva (nem tag)', r.body.ok === false && r.body.refused_by === 'right' && r.body.reason === 'not_a_member', { reason: r.body.reason, detail: r.body.detail });
  r = await bela.get('/api/me');
  // A MEGVONÁS A CÉGES TAGSÁGOT VITTE EL — a SAJÁT köre megmarad (SZK-01): a fiók nem szűnik meg
  // attól, hogy egy cégben már nincs tagsága, és a váltóban van hova visszalépnie.
  step('Béla /api/me megvonás után → a céges kör eltűnt, a SZEMÉLYES köre megmaradt',
    r.body.workspaces.length === 1 && r.body.workspaces[0].personal === true
    && r.body.current_book_id === null && r.body.current_role === null,
    { ws: r.body.workspaces.map((w) => `${w.name}:${w.kind}`) });

  r = await bela.get(`/api/data/stock?book_id=${csalad}`);
  step('Béla ?book_id=<csalad> paramétere FIGYELMEN KÍVÜL (param_ignored true), továbbra is elutasítva', r.body.param_ignored === true && r.body.ignored_params.includes('book_id') && r.body.ok === false, { ignored: r.body.ignored_params, reason: r.body.reason });
  r = await bela.get(`/api/data/price?book_id=${csalad}&actor=${annaId}&role=admin`);
  step('Béla ?book_id&actor&role → mind figyelmen kívül, elutasítva', r.body.param_ignored === true && r.body.ignored_params.length === 3 && r.body.ok === false, r.body.ignored_params);
  r = await anna.get(`/api/data/stock?book_id=ws_masik`);
  step('Anna idegen ?book_id-je figyelmen kívül — a SAJÁT könyvének adata jön', r.body.param_ignored === true && r.body.ok === true && r.body.result.qty === '12');

  r = await bela.post('/api/session/workspace', { book_id: csalad });
  step('Béla visszaváltana a Családi Kft-re → not_a_member (membership_revoked)', r.status === 403 && r.body.reason === 'not_a_member' && r.body.detail === 'membership_revoked', r.body.detail);

  // ── STATIKUS ÉS HÉJ-ŐRÖK ────────────────────────────────────────────────────────────────────
  r = await anna.get('/');
  // A KERET ÜRES VÁZ (R81): a levél-fogadó listája ÁTKÖLTÖZÖTT a „Próbaüzenetek" panelbe, amit a
  // lap rajzol — a kiszolgált HTML-ben ezért a KERET jelei mérhetők, nem a panel tartalma.
  step('GET / → index.html (a keret váza)', r.status === 200 && typeof r.body === 'string'
    && r.body.includes('data-testid="app"') && r.body.includes('data-testid="demo-marker"')
    && r.body.includes('/app.js'));
  r = await anna.get('/../package.json');
  step('útvonal-átlépés elutasítva', r.status === 403 || r.status === 404, r.status);
  r = await anna.get('/%2e%2e/package.json');
  step('kódolt útvonal-átlépés elutasítva', r.status === 403 || r.status === 404, r.status);
  r = await anna.post('/api/logout');
  step('kilépés → új névtelen munkamenet', r.body.ok === true);
  r = await anna.get('/api/me');
  step('kilépés után /api/me üres', r.body.subject_id === null);
} finally {
  await app.close();
  for (const suffix of ['', '-wal', '-shm']) { if (existsSync(dbPath + suffix)) rmSync(dbPath + suffix, { force: true }); }
}

const failed = results.filter((x) => !x.pass).length;
console.log(`\nselfcheck: ${results.length - failed}/${results.length} PASS${failed ? ` · ${failed} FAIL` : ''}`);
process.exit(failed ? 1 : 0);
