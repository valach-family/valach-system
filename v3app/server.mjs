// v3app/server.mjs — A V3 MAGREFERENCIA ELSŐ FELHASZNÁLÓI FOLYAMATA (R63 · CMD-VS-300-002-002).
//
// EZ EGY VÉKONY HTTP-HÉJ A `v3ref/` MAG FÖLÖTT. Minden DÖNTÉST a mag hoz (jog · tagság · meghívó ·
// kiadás · előfizetés); ez a fájl csak azt teszi, amit egy héjnak kell:
//   · a CSELEKVŐ ALANYT a szerveroldali munkamenetből (süti) veszi — SOHA nem a kliens által
//     küldött actor/role/book_id mezőből; ha ilyen mező érkezik, azt NEVEZETTEN figyelmen kívül
//     hagyja (`param_ignored: true`), nem némán;
//   · az AKTUÁLIS munkakörnyezetet egy külön végpont állítja, a mag ÉLŐ tagság-feloldójával
//     (`membershipAsOf`) ellenőrizve; az adat-végpontok CSAK a munkamenetből tudják a könyvet;
//   · VALÓDI LEVÉL SOHA NEM MEGY KI: a kimenő leveleket a fejlesztői levél-fogadó (memóriabeli
//     tömb) gyűjti, és a `/dev/mailbox` úton meg a képernyőn látszanak;
//   · a jelszó NYERSEN SOHA nem áll a tárolóban — a lenyomatot az `account.mjs` képzi és méri;
//   · a regisztráció válasza SEMLEGES (anti-enumeráció): ugyanaz a JSON, akár szabad a cím, akár nem.
//
// FÜGGŐSÉG: NULLA új futásidejű csomag — node:http · node:crypto · node:fs · node:path · node:url
// (+ node:module a CommonJS `artifactNaming.js` behúzásához, ahogy a feladat kimondta).
import http from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve, join, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { openStoreAt } from '../v3ref/store.mjs';
import {
  registerAccount, authenticate, issueChannelChallenge, redeemChannelChallenge, provenEmailOf,
  reissueChannelChallenge, subjectByEmail, CHALLENGE_POLICY,
} from '../v3ref/account.mjs';
import { bootstrapOf, workspacesOf, ensurePersonalSpace, personalSpaceOf, provisionWorkspace } from '../v3ref/workspace.mjs';
import { inviteColleague, grantScopeToMember, revokeDelegationsOf } from '../v3ref/delegation.mjs';
import { observeInvite, redeemInvite, rememberIntent, resumeIntent } from '../v3ref/invite.mjs';
import { rightAt, revokeMembership, KNOWN_ROLES } from '../v3ref/authz.mjs';
import { submitCommand, readCommandResult } from '../v3ref/command.mjs';
import { KNOWN_DATA_SCOPES } from '../v3ref/resultScope.mjs';
import { scopeReleaseDecision } from '../v3ref/releaseScope.mjs';
import { entitlementFor, twoGateVerdict, setEntitlementProfile, PLANS } from '../v3ref/entitlement.mjs';
import { businessIdentityOf, businessIdentityProblem, JURISDICTION_PROFILES } from '../v3ref/externalId.mjs';
import { membershipAsOf } from '../v3ref/bitemporal.mjs';
import { readScopeGrantAt } from '../v3ref/scopeGrant.mjs';
import { representationCheck } from '../v3ref/representation.mjs';
import { validateRequest, schemaForEndpoint, isGated, endpointsWithoutSchema, CONTEXT_FIELD, CONTEXT_SUBJECT_FIELD } from './httpSchema.mjs';

const require = createRequire(import.meta.url);
const { artifactPath } = require('../contracts/artifactNaming.js');

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const PUBLIC_DIR = resolve(HERE, 'public');
const PKG_VERSION = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')).version;

export const DEV_MAILBOX_LABEL = 'FEJLESZTŐI LEVÉL-FOGADÓ — nem küld külső személynek';
export const DEV_CLOCK_LABEL = 'FEJLESZTŐI ÓRA — a lejárati ágak próbájához; élesben nem létezhet';
export const NEUTRAL_REGISTER = Object.freeze({ ok: true, message: 'Ha a cím szabad, megerősítő levelet küldtünk.' });

const SESSION_COOKIE = 'vs_session';
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 64 * 1024;

// A CSELEKVŐT VAGY A KÖNYVET MEGNEVEZŐ KLIENS-MEZŐK — a lista ma DOKUMENTÁCIÓ és próba-bemenet,
// nem kapu: a kapu a séma-regiszter (HTP-01). Állapotváltoztató végponton az ilyen mező NEVEZETT
// elutasítás (`unknown_field`), olvasón NEVEZETTEN figyelmen kívül marad (`param_ignored`) — a
// cselekvőt és a könyvet változatlanul KIZÁRÓLAG a szerveroldali munkamenet adja.
export const CLIENT_AUTHORITY_PARAMS = Object.freeze(['book_id', 'workspace_id', 'workspace', 'current_book_id', 'actor', 'actor_id', 'role', 'subject']);

const hex = (bytes) => randomBytes(bytes).toString('hex');
/**
 * A LISTA-SOR JELÖLŐJE — EGYIRÁNYÚ lenyomat, nem a titok rövidítése (R83/F83-04). A meghívó-token
 * ELSŐ karakterei maguk is titok-részletek; egy lenyomat viszont a kiadott hivatkozást nem
 * állítja vissza. A beváltás továbbra is a TELJES tokenhez kötött.
 */
const shortRef = (token) => createHash('sha256').update(String(token)).digest('hex').slice(0, 10);
const nowIso = () => new Date().toISOString();

/** A tároló útja: env, különben a generált-fájl szabály szerinti név a `var/tmp` alatt (ART-01). */
export function resolveDbPath(env = process.env) {
  if (env.VS_APP_DB && String(env.VS_APP_DB).trim()) return resolve(REPO_ROOT, String(env.VS_APP_DB).trim());
  const rel = artifactPath({ area: 'tmp', kind: 'v3app_dev_tarolo', ext: 'sqlite', version: PKG_VERSION });
  return resolve(REPO_ROOT, rel);
}

/** Ugyanaz a névképző, más „mit" — a selfcheck ideiglenes tárolójához. */
export function selfcheckDbPath() {
  return resolve(REPO_ROOT, artifactPath({ area: 'tmp', kind: 'v3app_selfcheck', ext: 'sqlite', version: PKG_VERSION }));
}

// ── SÜTI ÉS MUNKAMENET ───────────────────────────────────────────────────────────────────────────
function parseCookies(header) {
  const out = new Map();
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    out.set(part.slice(0, i).trim(), part.slice(i + 1).trim());
  }
  return out;
}

function sessionCookie(id) {
  return `${SESSION_COOKIE}=${id}; HttpOnly; SameSite=Strict; Path=/`;
}

// ── VÁLASZ-SEGÉDEK ───────────────────────────────────────────────────────────────────────────────
function sendJson(res, status, body, setCookie) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (setCookie) headers['Set-Cookie'] = setCookie;
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function sendHtml(res, status, html, setCookie) {
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' };
  if (setCookie) headers['Set-Cookie'] = setCookie;
  res.writeHead(status, headers);
  res.end(html);
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) { reject(Object.assign(new Error('body_too_large'), { code: 'body_too_large' })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

// ── AZ ALKALMAZÁS ────────────────────────────────────────────────────────────────────────────────
/**
 * Létrehozza a HTTP-szervert (még nem figyel). EGY tároló folyamatonként.
 * @param {{dbPath?:string, clock?:{now:()=>string}}} opts
 */
export function createApp({ dbPath, clock = { now: nowIso }, devSurface = process.env.VS_APP_DEV !== '0' } = {}) {
  const path = dbPath || resolveDbPath();
  mkdirSync(dirname(path), { recursive: true });
  const store = openStoreAt(path, { timeoutMs: 2000 });
  const sessions = new Map();        // id → { id, subject_id, current_book_id, created_at }
  const mailbox = [];                // a FEJLESZTŐI LEVÉL-FOGADÓ — memóriában, kifelé soha

  // ── FEJLESZTŐI ÓRA (DEV-CLOCK, R75 §3/6) ────────────────────────────────────────────────────
  // MIÉRT KELL. A lejárati ágakat (megerősítő hivatkozás 24 óra · meghívó 7 nap) BÖNGÉSZŐBŐL is
  // bizonyítani kell, és „várjunk egy napot" nem próba. A héj ezért TÁMOGATOTT idővezérlést ad: a
  // dolgozó óra a valódi idő + egy eltolás, amit egyetlen fejlesztői végpont állít.
  // AMI EZ NEM: nem éles képesség. A `devSurface` kapcsoló mögött áll (a fejlesztői levél-fogadóval
  // együtt), és a lap is kimondja, hogy ez a próba-alkalmazás nyilvánosan nem tehető ki.
  let devClockOffsetMs = 0;
  const baseClock = clock;
  const appClock = {
    now: () => (devClockOffsetMs === 0 ? baseClock.now() : new Date(Date.parse(baseClock.now()) + devClockOffsetMs).toISOString()),
  };
  clock = appClock;

  /**
   * DEM-02 — A BEMUTATÓ-CSOMAG A FIÓKHOZ TARTOZIK, NEM A NÉZŐHÖZ (R85/F85-03).
   *
   * A LELET: a felület a néző SAJÁT fiók-listájában elfoglalt sorszámból választott csomagot, ezért
   * UGYANAZ a cég Annának „Szenzormodul 120 db"-ot, Bélának „Rögzítőelem M8 840 db"-ot mutatott. A
   * korábbi karakter-összeg-paritás (KUKA-213) helyére így egy MÁSIK, ugyanolyan törékeny szabály
   * lépett: az új tagság vagy a lista átrendezése ugyanezt sértené.
   *
   * A MAI ALAK: a hozzárendelés a fiók LÉTREHOZÁSAKOR születik, a tárolóban áll, és a jogosult
   * nézethez kötött szerver-válasz adja vissza. Nem a böngésző tárolója, nem a NÉZŐ lista-sorrendje,
   * és nem az azonosítóból számolt találgatás dönt. A bemutatóhoz KÉT csomag tartozik — a bemutatót
   * végigjáró ember ELSŐ KÉT saját fiókja kapja meg őket, EGYSZER, a létrehozás pillanatában —,
   * minden további fiók (és minden személyes fiók) JELÖLT ÜRES mintanézetet kap.
   *
   * MIÉRT A LÉTREHOZÓ ÉS NEM A TÁROLÓ ELEJE: a bemutató-alkalmazás egyetlen tárolón több embert is
   * kiszolgál (a próbáinkban tucatnyit). A „tároló első két fiókja" szabály ott az első próba
   * fiókjainak adná a két csomagot, a többi ember végig üres mintanézetet látna — a bemutató pedig
   * pont a KÉT eltérő adatú cég váltását akarja megmutatni. A LÉNYEG ettől nem változik: a
   * hozzárendelés a FIÓK tulajdonsága, egyszer születik, és MINDEN néző ugyanazt kapja.
   *
   * EZ NEM ÜZLETI MODUL: csak a bemutató szintetikus sorainak azonosítója, üzleti végrehajtás nélkül.
   */
  const DEMO_FIXTURES = ['bemutato-A', 'bemutato-B'];
  store.run(`CREATE TABLE IF NOT EXISTS app_demo_fixture (
    book_id     TEXT PRIMARY KEY REFERENCES book(id),
    fixture     TEXT NOT NULL,
    created_by  TEXT NOT NULL,
    assigned_at TEXT NOT NULL
  )`);
  function demoFixtureOf(bookId) {
    if (!bookId) return null;
    const row = store.get('SELECT fixture FROM app_demo_fixture WHERE book_id = ?', bookId);
    return row ? row.fixture : null;
  }
  function assignDemoFixture(bookId, creatorSubjectId, at) {
    const used = store.all('SELECT fixture FROM app_demo_fixture WHERE created_by = ? ORDER BY assigned_at, book_id', creatorSubjectId)
      .map((r) => r.fixture);
    const free = DEMO_FIXTURES.find((f) => !used.includes(f));
    if (!free) return null;                 // a bemutató KÉT cége megvan — a többi üres mintanézet
    store.run('INSERT INTO app_demo_fixture (book_id, fixture, created_by, assigned_at) VALUES (?,?,?,?)',
      bookId, free, creatorSubjectId, at);
    return free;
  }

  function pushMail({ to, subject, link, body }) {
    mailbox.push(Object.freeze({ id: mailbox.length + 1, at: clock.now(), to, subject, link, body: body || '' }));
  }

  /** A MEGERŐSÍTŐ LEVÉL — egy helyen, hogy a regisztráció és az újrakérés ne tudjon elcsúszni. */
  function sendVerification({ subjectId, value, at, host }) {
    const token = hex(32);
    const ch = issueChannelChallenge({ store, subjectId, value, token, at });
    if (!ch.ok) return null;
    pushMail({ to: value, subject: 'Erősítsd meg az e-mail címedet', link: `http://${host}/api/verify?token=${token}`,
      body: `Kattints a hivatkozásra, hogy bizonyítsd: ez a cím a tiéd. A hivatkozás ${Math.round(CHALLENGE_POLICY.ttl_ms / 3600000)} óráig él. Ha lejár, a bejelentkező képernyőn kérhetsz újat.` });
    return ch;
  }

  function newSession() {
    const s = { id: hex(32), subject_id: null, current_book_id: null, created_at: clock.now() };
    sessions.set(s.id, s);
    return s;
  }

  // ── OLVASÓ-SEGÉDEK (nem jogosultsági döntés — a döntéseket a mag hozza) ──────────────────────
  const emailOf = (subjectId) => {
    const row = store.get(
      `SELECT value_raw FROM external_id WHERE subject_id = ? AND namespace = 'email' AND valid_to IS NULL ORDER BY valid_from LIMIT 1`,
      subjectId);
    return row ? row.value_raw : null;
  };
  const bookNameOf = (bookId) => { const r = store.get('SELECT name FROM book WHERE id = ?', bookId); return r ? r.name : null; };

  /** Az aktuális könyv — CSAK a munkamenetből, és CSAK ha a tagság MA hatályos (a mag feloldójával). */
  function currentBookOf(session) {
    if (!session.subject_id || !session.current_book_id) return { book_id: null, reason: 'no_current_workspace' };
    const at = clock.now();
    const m = membershipAsOf({ store, subjectId: session.subject_id, bookId: session.current_book_id, validAt: at, knownAt: at });
    if (m.effective !== true) {
      // A fejléc nem mutat olyan munkakörnyezetet, amiben az alany már nem tag (a /api/me a tagságok
      // listájából számol) — de a munkamenet könyv-választását NEM töröljük: így a következő
      // adat-kérés a VALÓDI okot mondja („nem tag: megvonva"), nem azt, hogy „nincs munkakörnyezet"
      // (KUKA-064: a nemleges válasz vigye magával az okot; az R64 böngésző-próba lelete).
      return { book_id: null, reason: 'not_a_member', detail: m.reason };
    }
    return { book_id: session.current_book_id, reason: 'membership_effective' };
  }

  function roleIn(subjectId, bookId, at) {
    const ws = workspacesOf({ store, subjectId, at }).find((w) => w.book_id === bookId);
    return ws ? ws.role : null;
  }

  /** ADMIN-KAPU: a mag `rightAt`-ja dönt a tagságról ÉS a szerepről; a héj csak összeolvassa. */
  function adminGate(session, bookId) {
    const right = rightAt({ store, subjectId: session.subject_id, bookId, opClass: 'own_book', nowIso: clock.now() });
    if (!right.allowed) return { ok: false, status: 403, reason: right.reason, message: right.message };
    if (right.detail.role !== 'admin') {
      return { ok: false, status: 403, reason: 'admin_required', message: `ehhez a művelethez admin szerep kell — a tiéd: "${right.detail.role}"` };
    }
    return { ok: true, role: right.detail.role };
  }

  /**
   * KTX-01 — A KONTEXTUS MEGERŐSÍTÉSE (R75/F75-02).
   *
   * A LELET: egy RÉGI képernyőn maradt gomb (pl. a korábbi cég taglistájának „megvonás" gombja) a
   * váltás után is ÍRHATOTT volna — a szerver ugyanis csak azt nézte, mi a munkamenet MAI könyve.
   * A kliens generáció-őre ezt önmagában nem tudja megfogni: a második lap ugyanabban a
   * munkamenetben válthat, és a `/me` előzetes lekérése NEM atomikus kötés.
   *
   * A MEGOLDÁS ALAKJA — MEGERŐSÍTÉS, NEM FELHATALMAZÁS (ugyanaz a minta, mint a sémaverziónál,
   * SVR-01): a kliens elküldheti, MELYIK könyvben állt (`expected_book_id`). Ha ez ELTÉR a
   * munkamenet mai könyvétől, a kérés NEVEZETTEN elakad, írás nélkül. A mező SOHA nem VÁLASZT
   * könyvet — a hatóság marad a munkameneté (KUKA-047), a megerősítés csak SZŰKÍTHET.
   */
  function contextGate(body, session, currentBookId) {
    const served = { served_book_id: currentBookId ?? null, served_subject_id: session.subject_id ?? null };
    const raw = body && typeof body === 'object' ? body : {};
    const expectedBook = raw[CONTEXT_FIELD] === undefined || raw[CONTEXT_FIELD] === null ? null : String(raw[CONTEXT_FIELD]);
    const expectedSubject = raw[CONTEXT_SUBJECT_FIELD] === undefined || raw[CONTEXT_SUBJECT_FIELD] === null ? null : String(raw[CONTEXT_SUBJECT_FIELD]);
    const bookMismatch = expectedBook !== null && expectedBook !== String(currentBookId ?? '');
    const subjectMismatch = expectedSubject !== null && expectedSubject !== String(session.subject_id ?? '');
    if (!bookMismatch && !subjectMismatch) {
      return { ok: true, served, confirmed: { book: expectedBook !== null, subject: expectedSubject !== null } };
    }
    return {
      ok: false,
      status: 409,
      body: {
        ok: false, wrote: false, refused_by: 'context', reason: 'context_mismatch',
        expected_book_id: expectedBook, expected_subject_id: expectedSubject,
        current_book_id: currentBookId ?? null, current_subject_id: session.subject_id ?? null,
        ...served,
        message: 'közben megváltozott a munkakörnyezet vagy a belépett fiók ebben a böngészőben — ez a '
          + 'művelet a korábbi nézetben indult, ezért NEM hajtottuk végre; frissítsd a képernyőt, és '
          + 'indítsd újra abban a nézetben, amelyikben dolgozni akarsz',
      },
    };
  }

  /**
   * KTX-02 — A KONTEXTUSFÜGGŐ OLVASÁS A NÉZETHEZ KÖTVE (R77/F77-01).
   *
   * A LELET: a lap A-ra szóló `/me`-t kapott, a MÁSIK lap (közös süti) közben B-re váltott, és a
   * rákövetkező adat-kérést a szerver MÁR B-re szolgálta ki — a fejléc A-t mutatott, a panel B
   * adatát. A taglistának VOLT könyv-kötése (a válasz `book_id`-ja), az adat-utaknak nem.
   *
   * A JAVÍTÁS KÉT IRÁNYBAN, EGY KISZOLGÁLÁSON BELÜL:
   *   · a kérés MEGMONDHATJA, melyik nézetben indult (`expected_book_id` · `expected_subject_id`);
   *     eltérésnél a válasz NEVEZETTEN elakad (409), és ADATOT NEM AD;
   *   · a válasz MINDIG kimondja a TÉNYLEGES kontextust (`served_book_id` · `served_subject_id`),
   *     tehát a kliens a kötés nélkül is össze tudja vetni, mit kapott azzal, amit hitt.
   *
   * AMI EZ NEM: jogosultsági forrás. A mező csak SZŰKÍT (ugyanaz a minta, mint a KTX-01-nél és a
   * sémaverziónál): a könyvet és a cselekvőt továbbra is KIZÁRÓLAG a szerveroldali munkamenet adja,
   * idegen könyvre hivatkozva semmi nem nyílik meg (KUKA-047).
   */
  function readContextGate(query, session, servedBookId) {
    const servedSubject = session.subject_id ?? null;
    const served = { served_book_id: servedBookId ?? null, served_subject_id: servedSubject };
    const expectedBook = query && query.expected_book_id !== undefined ? String(query.expected_book_id) : null;
    const expectedSubject = query && query.expected_subject_id !== undefined ? String(query.expected_subject_id) : null;
    const bookMismatch = expectedBook !== null && expectedBook !== String(servedBookId ?? '');
    const subjectMismatch = expectedSubject !== null && expectedSubject !== String(servedSubject ?? '');
    if (!bookMismatch && !subjectMismatch) return { ok: true, served };
    return {
      ok: false,
      status: 409,
      body: {
        ok: false, result: null, refused_by: 'context', reason: 'context_mismatch',
        expected_book_id: expectedBook, expected_subject_id: expectedSubject, ...served,
        message: 'közben megváltozott a munkakörnyezet vagy a belépett fiók (például egy másik lapon), '
          + 'ezért ezt a kérést nem szolgáltuk ki — a képernyő frissül, és utána megismételheted',
      },
    };
  }

  /** A KÉT SZINTETIKUS MINTA-REKORD — minden könyv ugyanazt kapja (a jelöltsége kimondott). */
  function seedSamples(bookId, actorSubjectId) {
    return {
      stock: submitCommand({ store, idemKey: 'minta-keszlet', actor: actorSubjectId, bookId, type: 'stock.receipt', typeVersion: '1', declared: { qty: '12' }, resolve: () => ({ qty: '12' }), clock }),
      price: submitCommand({ store, idemKey: 'minta-ar', actor: actorSubjectId, bookId, type: 'stock.receipt', typeVersion: '1', declared: { qty: '12' }, resolve: () => ({ qty: '12', unit_price: 3490 }), clock }),
    };
  }

  /**
   * SZK-01 — A SZEMÉLYES KÖR MEGSZÜLETÉSE (R64 L11 · R75 §3/1).
   *
   * MIKOR: amint a csatorna BIZONYÍTOTT (a megerősítő hivatkozás beváltásakor), és — a korábban
   * megerősített fiókok miatt — belépéskor is, idempotensen. Nevet nem kér: a cím helyi részéből
   * képezzük, mert a magánszemélynek nincs mit „elnevezni" (ez volt az L11 lelete).
   * AMIT NEM CSINÁL: nem ad új jogot és nem új jogosultsági motor — ugyanaz a `createWorkspace`.
   */
  function ensurePersonal(subjectId) {
    const proven = provenEmailOf(store, subjectId);
    if (!proven) return null;
    const existing = personalSpaceOf({ store, subjectId });
    if (existing) return { ...existing, created: false };
    const local = String(proven).split('@')[0] || 'saját';
    const r = ensurePersonalSpace({ store, subjectId, bookId: `ps_${hex(4)}`, name: `${local} személyes köre`, at: clock.now() });
    if (!r.ok) return null;
    if (r.created) seedSamples(r.book_id, subjectId);
    return { book_id: r.book_id, name: r.name, created: Boolean(r.created) };
  }

  // ── A VÉGPONTOK ──────────────────────────────────────────────────────────────────────────────
  // Minden kezelő {status, body, setCookie?} alakot ad vissza; a boríték egy helyen épül.
  const loginRequired = () => ({ status: 401, body: { ok: false, reason: 'login_required', message: 'ehhez be kell jelentkezned' } });
  const workspaceRequired = (cur) => ({ status: 409, body: { ok: false, reason: cur.reason, detail: cur.detail ?? null, message: 'nincs kiválasztott munkakörnyezet — válassz vagy hozz létre egyet' } });

  const handlers = {
    // ── FIÓK ─────────────────────────────────────────────────────────────────────────────────
    // A mezők ALAKJÁT a séma mérte (HTP-01) — itt már csak a mag dönt (K03).
    'POST /api/register': ({ input, host }) => {
      const email = String(input.email).trim();
      const password = input.password;
      const at = clock.now();
      const r = registerAccount({ store, subjectId: `sub_${hex(8)}`, email, secret: password, at });
      if (r.ok) {
        sendVerification({ subjectId: r.subject_id, value: r.email, at, host });
      } else if (r.reason === 'address_already_registered') {
        // AZ ÚJRAREGISZTRÁCIÓ NEM ZSÁKUTCA TÖBBÉ (F75-01). A cím foglalt — kifelé ettől semleges
        // marad a válasz —, BEFELÉ viszont ez egy megerősítés-újrakérés: ha a fiók csatornája még
        // bizonyítatlan, ÚJ hivatkozás megy a CÍMRE (a korlátokkal), a jelszóhoz pedig senki nem
        // nyúl (a `registerAccount` az `address_already_registered` ágon nem írt semmit).
        const existing = subjectByEmail(store, email);
        if (existing) {
          const again = reissueChannelChallenge({ store, subjectId: existing, value: email, token: hex(32), at });
          if (again.ok) {
            pushMail({ to: email, subject: 'Új megerősítő hivatkozás', link: `http://${host}/api/verify?token=${again.token}`,
              body: 'Új hivatkozást kértél a cím megerősítéséhez. A korábbi hivatkozás ettől érvénytelen, ez a hivatkozás 24 óráig él. A jelszavad nem változott.' });
          }
        }
      } else {
        // A SAJÁT bemenet hibája nevezett (KUKA-070); a cím foglaltsága viszont NEM (anti-enumeráció).
        return { status: 400, body: { ok: false, reason: r.reason, message: 'a regisztráció adatai hiányosak' } };
      }
      // SEMLEGES VÁLASZ: ugyanaz a JSON, akár született fiók, akár nem (K03).
      return { status: 200, body: { ...NEUTRAL_REGISTER } };
    },

    /**
     * ÚJ MEGERŐSÍTŐ HIVATKOZÁS KÉRÉSE (F75-01) — a lejárt hivatkozás FOLYTATÁSA.
     *
     * A VÁLASZ SEMLEGES, MINDEN ÁGON: nem árulja el, hogy a címhez tartozik-e fiók, hogy az már
     * bizonyított-e, és azt sem, hogy a korlát miatt maradt-e el a levél (K03 · KUKA-084). Ami
     * BEFELÉ történik, az nevezett, és a fejlesztői levél-fogadóban MÉRHETŐ.
     */
    'POST /api/verification/resend': ({ input, host }) => {
      const email = String(input.email).trim();
      const at = clock.now();
      const subjectId = subjectByEmail(store, email);
      if (subjectId) {
        const again = reissueChannelChallenge({ store, subjectId, value: email, token: hex(32), at });
        if (again.ok) {
          pushMail({ to: email, subject: 'Új megerősítő hivatkozás', link: `http://${host}/api/verify?token=${again.token}`,
            body: 'Új hivatkozást kértél a cím megerősítéséhez. A korábbi hivatkozás ettől érvénytelen, ez a hivatkozás 24 óráig él. A jelszavad nem változott.' });
        }
      }
      return { status: 200, body: { ok: true, message: 'Ha a címhez megerősítésre váró fiók tartozik, új hivatkozást küldtünk. Nézd meg a leveleidet.' } };
    },

    'GET /api/verify': ({ url }) => {
      const token = url.searchParams.get('token') || '';
      const r = redeemChannelChallenge({ store, token, at: clock.now() });
      const ok = r.ok === true;
      // A BIZONYÍTOTT CSATORNA ELSŐ KÖVETKEZMÉNYE A SZEMÉLYES KÖR (SZK-01): a magánszemélynek
      // innentől van hova belépnie, és nem kell „céget" kitalálnia a saját irataihoz (R64 L11).
      const personal = ok ? ensurePersonal(r.subject_id) : null;
      // A KUDARC IS FOLYTATÁS (F75-01 · KUKA-064 · KUKA-201): minden nemleges ág megmondja, mi a
      // KÖVETKEZŐ lépés, és a lap gombot ad hozzá — a régi „regisztrálj újra" mondat nem működött.
      //
      // R81 §5/02 ÉS §5/04: ez a lap ELHAGYJA a belső szavakat. Korábban a hibakódot
      // (`challenge_superseded`) és a „bizonyítva" szót mutatta a felhasználónak; most azt mondja
      // meg, MI TÖRTÉNT és MI A TEENDŐ — a gépi ok a „Technikai részletek" alatt marad meg.
      const REASONS = {
        challenge_expired: 'A hivatkozás 24 óráig élt, és ez az idő letelt.',
        challenge_already_used: 'Ezt a hivatkozást már felhasználták. Ha te voltál, egyszerűen jelentkezz be.',
        challenge_superseded: 'Ehhez a címhez újabb megerősítő levelet kértek, ezért ez a hivatkozás már nem él. A LEGUTÓBBI levélben lévő hivatkozás működik.',
        challenge_unknown: 'Ez a hivatkozás nem használható — lehet, hogy hiányosan másolódott ki a levélből.',
      };
      const detail = ok ? '' : (Object.prototype.hasOwnProperty.call(REASONS, r.reason) ? REASONS[r.reason] : 'Ez a hivatkozás nem használható.');
      const title = ok ? 'Az e-mail-címed megerősítve' : 'Ez a megerősítő hivatkozás már nem él';
      const msg = ok
        ? `A(z) ${esc(r.value_norm)} cím megerősítve. Mostantól be tudsz jelentkezni${personal ? `, és a személyes fiókod („${esc(personal.name)}") is készen áll` : ''}.`
        : `${esc(detail)} Kérj új megerősítő levelet a címedre — a jelszavad nem változik, és új fiókot sem kell létrehoznod.`;
      const next = ok
        ? '<p><a class="primary" href="/" data-testid="verify-back">Tovább a bejelentkezéshez</a></p>'
        : `<p data-testid="verify-next"><a class="primary" href="/?megerosites=${esc(r.reason)}" data-testid="verify-resend-link">Új megerősítő levél kérése</a></p>
           <p class="authfoot"><a href="/" data-testid="verify-back">Vissza a bejelentkezéshez</a></p>`;
      const html = `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
        + `<title>E-mail-cím megerősítése — VS</title><link rel="stylesheet" href="/style.css"></head><body>`
        + `<main class="verify"><div class="card"><div class="status-icon${ok ? '' : ' warn'}">${ok ? '✓' : '!'}</div>`
        + `<h1>${title}</h1><p data-testid="verify-result" data-ok="${ok}">${msg}</p>${next}`
        + `${ok ? '' : `<details class="tech"><summary>Technikai részletek</summary><pre>${esc(r.reason)}</pre></details>`}`
        + `</div></main></body></html>`;
      return { status: ok ? 200 : 400, html };
    },

    'POST /api/login': ({ session, input }) => {
      const r = authenticate({ store, email: input.email, secret: input.password });
      if (!r.ok) return { status: 401, body: { ok: false, reason: r.reason, message: 'a belépés nem sikerült — ellenőrizd a címet és a jelszót' } };
      // A FÜGGŐ MEGHÍVÓ-SZÁNDÉK A RÉGI munkamenet-azonosítón áll — átvisszük az ÚJRA (K03).
      const pending = resumeIntent({ store, sessionId: session.id });
      const fresh = newSession();                       // ROTÁLT azonosító
      fresh.subject_id = r.subject_id;
      sessions.delete(session.id);
      if (pending) {
        rememberIntent({ store, sessionId: fresh.id, token: pending, clock });
        store.run('DELETE FROM pending_intent WHERE session_id = ?', session.id);
      }
      // A KORÁBBAN megerősített fiókok is megkapják a személyes körüket — idempotens (SZK-01).
      const personal = ensurePersonal(r.subject_id);
      if (personal && !fresh.current_book_id) fresh.current_book_id = personal.book_id;
      return { status: 200, body: { ok: true, subject_id: r.subject_id, pending_invite_token: pending || null, personal_book_id: personal ? personal.book_id : null }, setCookie: sessionCookie(fresh.id), session: fresh };
    },

    'POST /api/logout': ({ session }) => {
      sessions.delete(session.id);
      const fresh = newSession();
      return { status: 200, body: { ok: true }, setCookie: sessionCookie(fresh.id), session: fresh };
    },

    'GET /api/me': ({ session }) => {
      if (!session.subject_id) {
        return { status: 200, body: { ok: true, subject_id: null, email: null, channel_proven: false, workspaces: [], current_book_id: null, current_role: null, current_book_name: null, current_kind: null, personal_book_id: null, acting_as: 'nincs bejelentkezve' } };
      }
      const at = clock.now();
      const ws = workspacesOf({ store, subjectId: session.subject_id, at });
      const cur = currentBookOf(session);
      const current = cur.book_id ? ws.find((w) => w.book_id === cur.book_id) : null;
      return { status: 200, body: {
        ok: true, subject_id: session.subject_id, email: emailOf(session.subject_id),
        channel_proven: !!provenEmailOf(store, session.subject_id),
        workspaces: ws.map((w) => {
          const biz = businessIdentityOf({ store, bookId: w.book_id });
          return { ...w, plan: (store.get('SELECT plan FROM entitlement_profile WHERE book_id = ?', w.book_id) || {}).plan ?? null,
            // A FIÓKHOZ RÖGZÍTETT bemutató-csomag azonosítója (DEM-02): MINDEN néző ugyanazt kapja.
            demo_fixture: demoFixtureOf(w.book_id),
            business: biz && biz.attached ? { namespace: biz.namespace, jurisdiction: biz.jurisdiction, verification: biz.verification ?? 'none_available' } : null };
        }),
        current_book_id: current ? current.book_id : null,
        current_role: current ? current.role : null,
        current_book_name: current ? current.name : null,
        current_kind: current ? current.kind : null,
        current_personal: current ? current.personal === true : null,
        personal_book_id: (personalSpaceOf({ store, subjectId: session.subject_id }) || {}).book_id ?? null,
        // A KÉPERNYŐ MONDJA KI, KI NEVÉBEN JÁRSZ EL (R75 §4) — egy mondat, a SZERVER igazságából.
        // A FELÜLET SZAVAIVAL (R81 §6 · R83/F83-04): „személyes kör" → Személyes fiók, és a
        // személyes fiók BELSŐ neve nem kerül a mondatba — ott a nevezett szó áll.
        acting_as: current
          ? (current.personal
            ? `${emailOf(session.subject_id) ?? session.subject_id} · Személyes fiók · szerep: ${current.role}`
            : `${emailOf(session.subject_id) ?? session.subject_id} · fiók: ${current.name} · szerep: ${current.role}`)
          : `${emailOf(session.subject_id) ?? session.subject_id} · nincs kiválasztott fiók`,
        current_plan: current ? ((store.get('SELECT plan FROM entitlement_profile WHERE book_id = ?', current.book_id) || {}).plan ?? null) : null,
      } };
    },

    // ── MUNKAKÖRNYEZET ───────────────────────────────────────────────────────────────────────
    /**
     * ÚJ FIÓK — ÉS A MEGNYITÁSKORI SZEMÉLY KÖTÉSE (R85/F85-01).
     *
     * A LELET (a külső ellenőrző fél, chatgpt-v3, R85): Anna megnyitotta és kitöltötte az új fiók
     * űrlapját; ugyanabban a böngészőben (közös süti) egy MÁSIK belépés Bélára váltott; Anna régi
     * lapjának beküldése HTTP 201-et kapott, és a fiók BÉLÁHOZ jött létre. A kliens-oldali
     * generáció-bélyeg (PNL-01) ezt NEM fogja meg: a másik fül belépése a régi lap helyi
     * állapotát nem mozdítja, és egy előzetes `/api/me`-frissítés sem zárja le a frissítés és az
     * írás közötti versenyhelyzetet. A kötésnek a SZERVEREN, az írás ELŐTT kell állnia.
     *
     * Itt NINCS célkönyv (a könyv még nem létezik), ezért az elsődleges kötés a SZEMÉLY. A mező
     * csak SZŰKÍT: a cselekvőt továbbra is KIZÁRÓLAG a munkamenet adja (KUKA-047).
     */
    'POST /api/workspaces': ({ session, input, body }) => {
      if (!session.subject_id) return loginRequired();
      const ctx = contextGate(body, session, null);
      if (!ctx.ok) return { status: ctx.status, body: ctx.body };
      // A NÉV, A TERV ÉS A VÁLLALKOZÁSI MINŐSÉG ALAKJÁT A SÉMA MÉRTE (HTP-01): a régi
      // `String(body.name ?? '')` kényszerítés helyén most nevezett elutasítás áll, ÍRÁS ELŐTT.
      const name = String(input.name).trim();
      const plan = input.plan;
      const biz = input.business ?? null;
      // A KÉPVISELETI HATÁR KIMONDVA (REP-01 · R75 §3/3): ez ÖNBEVALLOTT saját munkatér — hatósági
      // igazolást nem kérünk hozzá, és ebből NEM következik más jogalany képviselete.
      const representation = representationCheck({ operationClass: 'own_self_declared_work', actorSubjectId: session.subject_id, at: clock.now() });
      if (!representation.allowed) {
        return { status: 403, body: { ok: false, reason: representation.reason, message: representation.message } };
      }
      const at = clock.now();
      const bookId = `ws_${hex(4)}`;
      // A VÁLLALKOZÁSI MINŐSÉG BAJÁT ÍRÁS ELŐTT KÉRDEZZÜK MEG (R77/F77-02): a szabály a mag
      // normalizálójáé, nem új „adóellenőrzés" — a normalizálva ÜRES azonosító nevezett 400, és a
      // könyv MEG SEM SZÜLETIK. (A régi alak 500-at adott, és ottfelejtett egy félkész könyvet.)
      const businessInput = biz && String(biz.tax_id ?? '').trim()
        ? { namespace: 'tax_id', jurisdiction: String(biz.jurisdiction ?? ''), valueRaw: String(biz.tax_id) }
        : null;
      if (businessInput) {
        const problem = businessIdentityProblem(businessInput);
        if (problem) {
          return { status: 400, body: {
            ok: false, reason: problem.error === 'value_required' ? 'tax_id_value_required' : problem.error,
            field: 'business.tax_id', refused_by: 'input_schema', message: problem.detail, wrote: false,
          } };
        }
      }
      // A KÖNYV · AZ INDULÁSI TÉNYEK · A VÁLLALKOZÁSI MINŐSÉG EGY EGYSÉG (PRV-01): bármelyik lépés
      // bukása MINDENT visszagörget — félkész könyv és félkész jog nem maradhat hátra.
      const provisioned = provisionWorkspace({
        store, creatorSubjectId: session.subject_id, bookId, name, at, plan, kind: 'shared',
        business: businessInput,
        // A MINTA-REKORDOK az egység UTÁN íródnak (a parancs-út saját, mért tranzakció-határa —
        // azt nem mozdítjuk el); a hiányuk NEVEZETT, nem néma.
        seed: () => seedSamples(bookId, session.subject_id),
      });
      if (!provisioned.ok) {
        const status = provisioned.reason === 'creator_channel_unproven' ? 403 : 400;
        return { status, body: {
          ok: false, reason: provisioned.reason, at: provisioned.at,
          message: provisioned.message ?? 'a munkakörnyezet nem jött létre', wrote: provisioned.wrote === true,
        } };
      }
      const ws = provisioned.workspace;
      const business = provisioned.business;
      const samples = provisioned.seeded;
      session.current_book_id = bookId;
      return { status: 201, body: {
        ok: true, workspace: ws, business, samples, book_id: bookId, name, role: 'admin', kind: 'shared',
        ...ctx.served, demo_fixture: assignDemoFixture(bookId, session.subject_id, at),
        seeded: provisioned.seeded !== null, seed_failed: provisioned.seed_failed ?? null,
        representation: { basis: representation.basis, verification: 'none_available', stated_limit: representation.stated_limit },
      } };
    },

    'POST /api/session/workspace': ({ session, input }) => {
      if (!session.subject_id) return loginRequired();
      const bookId = String(input.book_id).trim();
      const at = clock.now();
      const m = membershipAsOf({ store, subjectId: session.subject_id, bookId, validAt: at, knownAt: at });
      if (m.effective !== true) {
        return { status: 403, body: { ok: false, reason: 'not_a_member', detail: m.reason, message: 'ebben a munkakörnyezetben nincs hatályos tagságod' } };
      }
      session.current_book_id = bookId;
      const ws = workspacesOf({ store, subjectId: session.subject_id, at }).find((w) => w.book_id === bookId) || null;
      return { status: 200, body: { ok: true, book_id: bookId, role: roleIn(session.subject_id, bookId, at), name: bookNameOf(bookId), kind: ws ? ws.kind : null, personal: ws ? ws.personal : null } };
    },

    'POST /api/workspaces/plan': ({ session, input, body }) => {
      if (!session.subject_id) return loginRequired();
      const cur = currentBookOf(session);
      if (!cur.book_id) return workspaceRequired(cur);
      const ctx = contextGate(body, session, cur.book_id);
      if (!ctx.ok) return { status: ctx.status, body: ctx.body };
      const gate = adminGate(session, cur.book_id);
      if (!gate.ok) return { status: gate.status, body: { ok: false, reason: gate.reason, message: gate.message } };
      const r = setEntitlementProfile({ store, bookId: cur.book_id, plan: input.plan, at: clock.now() });
      return { status: r.ok ? 200 : 400, body: { ...r, ...ctx.served } };
    },

    // ── MUNKATÁRSAK ──────────────────────────────────────────────────────────────────────────
    'GET /api/members': ({ session, query }) => {
      if (!session.subject_id) return loginRequired();
      const cur = currentBookOf(session);
      const ctx = readContextGate(query, session, cur.book_id);
      if (!ctx.ok) return { status: ctx.status, body: ctx.body };
      if (!cur.book_id) return workspaceRequired(cur);
      const gate = adminGate(session, cur.book_id);
      if (!gate.ok) return { status: gate.status, body: { ok: false, reason: gate.reason, message: gate.message } };
      const at = clock.now();
      const rows = store.all('SELECT subject_id, role FROM membership WHERE book_id = ? ORDER BY granted_at, subject_id', cur.book_id);
      const members = rows.map((row) => {
        const m = membershipAsOf({ store, subjectId: row.subject_id, bookId: cur.book_id, validAt: at, knownAt: at });
        const scopes = {};
        for (const scope of KNOWN_DATA_SCOPES) {
          const g = readScopeGrantAt({ store, subjectId: row.subject_id, bookId: cur.book_id, scope, validAt: at, knownAt: at });
          scopes[scope] = { granted: g.granted === true, reason: g.reason };
        }
        return { subject_id: row.subject_id, email: emailOf(row.subject_id), role: row.role, effective: m.effective === true, effective_reason: m.reason, scopes };
      });
      return { status: 200, body: { ok: true, book_id: cur.book_id, ...ctx.served, members, known_scopes: [...KNOWN_DATA_SCOPES], known_roles: [...KNOWN_ROLES] } };
    },

    'POST /api/invites': ({ session, input, body, host }) => {
      if (!session.subject_id) return loginRequired();
      const cur = currentBookOf(session);
      if (!cur.book_id) return workspaceRequired(cur);
      const ctx = contextGate(body, session, cur.book_id);
      if (!ctx.ok) return { status: ctx.status, body: ctx.body };
      const token = hex(32);
      const at = clock.now();
      const expiresAt = new Date(Date.parse(at) + INVITE_TTL_MS).toISOString();
      const r = inviteColleague({
        store, inviterSubjectId: session.subject_id, bookId: cur.book_id,
        inviteeEmail: input.email, offeredRole: input.role, scope: input.scope,
        token, expiresAt, at,
      });
      if (!r.ok) return { status: 403, body: { ok: false, reason: r.reason, message: r.message ?? 'a meghívó nem adható ki', ceiling: r.ceiling ?? null, ...ctx.served } };
      pushMail({ to: String(input.email).trim(), subject: `Meghívás: ${bookNameOf(cur.book_id) ?? cur.book_id}`, link: `http://${host}/?invite=${token}`,
        body: `${emailOf(session.subject_id) ?? session.subject_id} meghívott a(z) „${bookNameOf(cur.book_id) ?? cur.book_id}" munkakörnyezetbe (${input.role} szerep; adatkör: ${input.scope} — a jogot a kezelő a beváltás után külön adja meg). A meghívó 7 napig él.` });
      return { status: 201, body: { ok: true, token, ceiling: r.ceiling, basis_id: r.basis_id, basis_version: r.basis_version, expires_at: expiresAt, ...ctx.served } };
    },

    /**
     * A VÁRAKOZÓ MEGHÍVÁSOK LISTÁJA (R83/F83-04).
     *
     * A LELET: a Felhasználók képernyő CSAK a már belépett tagokat mutatta, a kiadott, még be nem
     * váltott meghívások SEHOL nem látszottak — a fiókkezelő nem tudta, kire vár. Ez a végpont
     * MEGLÉVŐ tényekből olvas, UGYANAZON a joghatáron: bejelentkezés · a nézet kötése · fiókkezelői
     * jog · CSAK az aktuális könyv sorai.
     *
     * AMIT NEM AD KI: a NYERS meghívó-tokent. A token a levél titka; egy listában megjelenve
     * bárki, aki a képernyőt látja, más nevében beváltható hivatkozást kapna (KUKA-006: a szerver
     * titka nem kerül a kliensbe). A lista helyette az ÁLLAPOTOT mondja meg.
     */
    'GET /api/invites/waiting': ({ session, query }) => {
      if (!session.subject_id) return loginRequired();
      const cur = currentBookOf(session);
      const ctx = readContextGate(query, session, cur.book_id);
      if (!ctx.ok) return { status: ctx.status, body: ctx.body };
      if (!cur.book_id) return workspaceRequired(cur);
      const gate = adminGate(session, cur.book_id);
      if (!gate.ok) return { status: gate.status, body: { ok: false, reason: gate.reason, message: gate.message } };
      const at = clock.now();
      const rows = store.all(
        `SELECT token, invitee_namespace, invitee_value, offered_role, issuer_subject, expires_at, redeemed_at
           FROM invite WHERE book_id = ? ORDER BY expires_at DESC`, cur.book_id);
      const invites = rows.filter((r) => !r.redeemed_at).map((r) => ({
        // AZONOSÍTÓ A KÉPERNYŐNEK, DE NEM A TOKEN: a lista-sor jelölője a token RÖVID lenyomata,
        // amiből a hivatkozás nem állítható vissza (a beváltás a teljes tokenhez kötött).
        ref: shortRef(r.token),
        email: r.invitee_namespace === 'email' ? r.invitee_value : null,
        role: r.offered_role,
        invited_by: emailOf(r.issuer_subject) ?? null,
        expires_at: r.expires_at,
        expired: Date.parse(r.expires_at) <= Date.parse(at),
      }));
      return { status: 200, body: { ok: true, book_id: cur.book_id, ...ctx.served, invites, at } };
    },

    /**
     * A MEGFIGYELÉS — ÉS A MINIMÁLIS KIADÁS A BIZONYÍTOTT CÍMZETTNEK (R83/F83-04).
     *
     * A mag két állapota (`redeem_as_existing` · `redeem_as_new`) CSAK akkor születik, ha a néző
     * BIZONYÍTOTTA a meghívás címzetti csatornáját — minden más esetben bájt-azonos, semleges
     * választ ad (KUKA-084). Ezért a jogos címzettnek kiadható a MINIMÁLIS tény: MELYIK fiókba és
     * MILYEN szerepre szól a meghívás. Ennél több nem: nincs általános, anonim cégnév-lekérdező, és
     * a meghívó SZEMÉLYÉT sem találjuk ki — a ténylegesen tárolt e-mail-címét adjuk, vagy semmit.
     */
    'GET /api/invites/observe': ({ session, url }) => {
      const token = url.searchParams.get('token') || '';
      const r = observeInvite({ store, token, viewerSubjectId: session.subject_id, clock });
      const proven = r.status === 'redeem_as_existing' || r.status === 'redeem_as_new';
      if (!proven) return { status: 200, body: { ...r } };
      const inv = store.get('SELECT book_id, offered_role, issuer_subject FROM invite WHERE token = ?', token);
      if (!inv) return { status: 200, body: { ...r } };
      return { status: 200, body: { ...r,
        account: { name: bookNameOf(inv.book_id) ?? null, role: inv.offered_role },
        invited_by: emailOf(inv.issuer_subject) ?? null } };
    },

    'POST /api/invites/pending': ({ session, input }) => {
      rememberIntent({ store, sessionId: session.id, token: String(input.token).trim(), clock });
      return { status: 200, body: { ok: true } };
    },

    'POST /api/invites/redeem': ({ session, input }) => {
      if (!session.subject_id) return loginRequired();
      const token = String(input.token).trim();
      const r = redeemInvite({ store, token, actingSubjectId: session.subject_id, clock });
      if (r.ok) {
        session.current_book_id = r.book_id;
        store.run('DELETE FROM pending_intent WHERE session_id = ?', session.id);
      }
      return { status: r.ok ? 200 : 403, body: { ...r } };
    },

    'POST /api/members/scope': ({ session, input, body }) => {
      if (!session.subject_id) return loginRequired();
      const cur = currentBookOf(session);
      if (!cur.book_id) return workspaceRequired(cur);
      const ctx = contextGate(body, session, cur.book_id);
      if (!ctx.ok) return { status: ctx.status, body: ctx.body };
      const r = grantScopeToMember({ store, granterSubjectId: session.subject_id, bookId: cur.book_id, targetSubjectId: input.subject_id, scope: input.scope, at: clock.now() });
      return { status: r.ok ? 200 : 403, body: { ...r, ...ctx.served } };
    },

    'POST /api/members/revoke': ({ session, input, body }) => {
      if (!session.subject_id) return loginRequired();
      const cur = currentBookOf(session);
      if (!cur.book_id) return workspaceRequired(cur);
      const ctx = contextGate(body, session, cur.book_id);
      if (!ctx.ok) return { status: ctx.status, body: ctx.body };
      const target = String(input.subject_id).trim();
      const revocation = revokeMembership({ store, subjectId: target, bookId: cur.book_id, clock, actorSubjectId: session.subject_id });
      const delegation = revocation.ok ? revokeDelegationsOf({ store, subjectId: target, bookId: cur.book_id, at: clock.now() }) : null;
      return { status: revocation.ok ? 200 : 403, body: { ok: revocation.ok, reason: revocation.reason, message: revocation.message ?? null, revocation, delegation, ...ctx.served } };
    },

    // ── ADATOK ───────────────────────────────────────────────────────────────────────────────
    'GET /api/data/stock': ({ session, query }) => {
      if (!session.subject_id) return loginRequired();
      const cur = currentBookOf(session);
      // A KONTEXTUS ELŐBB DÖNT, MINT AZ ADAT (KTX-02): eltérő nézetből érkező kérésre NEM olvasunk
      // — így a kiadás sem születik meg, nem csak a rajzolás marad el (KUKA-002: a döntés és a
      // megjelenítés két külön tény; a védelemnek a DÖNTÉSNÉL kell állnia).
      const ctx = readContextGate(query, session, cur.book_id);
      if (!ctx.ok) return { status: ctx.status, body: ctx.body };
      if (!cur.book_id) return { status: 200, body: { ok: false, result: null, refused_by: 'right', reason: cur.reason, detail: cur.detail ?? null, ...ctx.served, message: 'nincs hatályos tagságod a kiválasztott munkakörnyezetben' } };
      const r = readSample(cur.book_id, session.subject_id, 'minta-keszlet');
      return { status: 200, body: { ok: r.ok, result: r.ok ? r.result : null, refused_by: r.ok ? null : 'right', reason: r.ok ? null : r.error, ...ctx.served, message: r.message ?? null } };
    },

    'GET /api/data/price': ({ session, query }) => {
      if (!session.subject_id) return loginRequired();
      const cur = currentBookOf(session);
      const ctx = readContextGate(query, session, cur.book_id);
      if (!ctx.ok) return { status: ctx.status, body: ctx.body };
      if (!cur.book_id) return { status: 200, body: { ok: false, result: null, refused_by: 'right', reason: cur.reason, right_reason: cur.reason, entitlement_reason: null, ...ctx.served, message: 'nincs hatályos tagságod a kiválasztott munkakörnyezetben' } };
      // KÉT KAPU, KÜLÖN MÉRVE, KÜLÖN JELENTVE — egy mezőbe vonni tilos (ENT-02 · KUKA-002).
      // A JOG-KAPU KIADÁS NÉLKÜL MÉRVE (az R64 ellenséges felülvizsgálat H11 lelete): a régi alak
      // ELŐBB olvasta ki a mintát (és a mag KIADÁSKÉNT könyvelte a leltárban), és csak utána
      // kérdezte az előfizetést — így egy előfizetés-kapun elutasított kérés is kiadási nyomot
      // hagyott. Most: a döntés két olvasó kapuja előbb, a tényleges kiadás csak ha mindkettő enged.
      const at = clock.now();
      const rightDecision = scopeReleaseDecision({ store, subjectId: session.subject_id, bookId: cur.book_id, scope: 'arak', nowIso: at, knownAt: at });
      const entitlement = entitlementFor({ store, bookId: cur.book_id, feature: 'price_view' });
      const verdict = twoGateVerdict({ right: { allowed: rightDecision.allowed === true, reason: rightDecision.allowed ? null : (rightDecision.reason === 'no_scope_grant' ? 'not_available' : rightDecision.reason) }, entitlement });
      const r = verdict.allowed ? readSample(cur.book_id, session.subject_id, 'minta-ar') : { ok: false, result: null, message: null };
      // A FELIRAT ÉS A DÖNTÉS EGYEZZEN (R77 §4 · KUKA-050). A régi alak az ELUTASÍTOTT ágon a mag
      // kiadás-mondatát (`az eredmény kiadva`) vitte tovább, mert a `readSample` üzenetét adta
      // vissza — a képernyőn így az ELUTASÍTVA felirat alatt „kiadva" állt. Most az elutasítás
      // mondatát a ZÁRÓ KAPU adja, névvel; a „kiadva" csak akkor hangzik el, ha tényleg kiadtuk.
      const refusalMessage = () => {
        if (verdict.refused_by === 'entitlement') return `az ár-nézet nincs a mai terv (${entitlement.plan ?? '—'}) képességei között — az előfizetés-kapu zárt, a jogod megvan`;
        if (verdict.refused_by === 'right') return 'az ár adatköre nincs megadva neked — ezt a munkakörnyezet kezelője adja meg külön lépésben';
        if (verdict.refused_by === 'both') return 'két kapu is zárt: az ár adatköre nincs megadva neked, és a mai terv sem tartalmazza az ár-nézetet';
        return r.message ?? null;
      };
      return { status: 200, body: {
        ok: verdict.allowed && r.ok === true, result: verdict.allowed && r.ok ? r.result : null,
        refused_by: verdict.refused_by,
        right_reason: verdict.allowed ? null : verdict.right_reason,
        entitlement_reason: verdict.allowed ? null : verdict.entitlement_reason,
        entitlement: { available: entitlement.available, reason: entitlement.reason, plan: entitlement.plan },
        ...ctx.served,
        message: verdict.allowed && r.ok === true ? 'az ár-nézet kiadva' : refusalMessage(),
      } };
    },

    'GET /dev/mailbox': () => ({ status: 200, body: { ok: true, label: DEV_MAILBOX_LABEL, mails: [...mailbox].reverse() } }),

    // ── FEJLESZTŐI ÓRA — a lejárati ágak böngészőből is bizonyíthatók (R75 §3/6) ──────────────
    'GET /dev/clock': () => ({ status: 200, body: { ok: true, label: DEV_CLOCK_LABEL, now: clock.now(), real_now: baseClock.now(), offset_ms: devClockOffsetMs } }),
    'POST /dev/clock': ({ input }) => {
      devClockOffsetMs += input.advance_ms;
      return { status: 200, body: { ok: true, label: DEV_CLOCK_LABEL, now: clock.now(), real_now: baseClock.now(), offset_ms: devClockOffsetMs } };
    },
  };

  /** A minta-rekord kiadása: a kérő a munkamenet alanya, a cselekvő a könyv LÉTREHOZÓJA. */
  function readSample(bookId, requester, idemKey) {
    const boot = bootstrapOf({ store, bookId });
    if (!boot) return { ok: false, error: 'no_bootstrap', message: 'ehhez a könyvhöz nincs indulási tény' };
    return readCommandResult({ store, idemKey, requester, bookId, actor: boot.creator_subject_id, clock });
  }

  // A MEZŐ-SZERZŐDÉS OTTHONA A SÉMA-REGISZTER (HTP-01, `v3app/httpSchema.mjs`) — itt nincs második
  // másolat. A korábbi `ACCEPTS` tábla ezt a végponton kívül, kézzel ismételte: megengedő szabály
  // volt ugyan (KUKA-057), de nem KAPU — a nem deklarált mező némán kimaradt, a DEKLARÁLT mező
  // rossz típusa pedig `String()`-gel „megjavult" (R75/F75-03). Ma: a séma kapuz az
  // állapotváltoztató végpontokon, és NEVEZETTEN hagy ki az olvasókon.
  //
  // FAIL-CLOSED INDULÁSKOR: ha egy kezelőnek nincs deklarált sémája, azt nem futás közben vesszük
  // észre — a héj indulásakor kimondjuk (KUKA-051: a hiányzó őr zöldnek látszik).
  const missingSchemas = endpointsWithoutSchema(Object.keys(handlers));
  if (missingSchemas.length) {
    throw new Error(`v3app: deklarált bemeneti séma nélküli végpont(ok): ${missingSchemas.join(' · ')} — a szerződés hiánya ZÁR (HTP-01)`);
  }

  // ── A KÉRÉS-CIKLUS ───────────────────────────────────────────────────────────────────────────
  async function handle(req, res) {
    const url = new URL(req.url, 'http://x');
    const cookies = parseCookies(req.headers.cookie);
    let session = sessions.get(cookies.get(SESSION_COOKIE) || '');
    let setCookie = null;
    if (!session) { session = newSession(); setCookie = sessionCookie(session.id); }   // névtelen munkamenet is létezik
    const host = req.headers.host || 'localhost';
    const key = `${req.method} ${url.pathname}`;

    try {
      // A KEZELŐ FELOLDÁSA SAJÁT KULCSON (SOP-01 alakja a héjon): az örökölt tulajdonság-nevek
      // (`toString` · `constructor` · `__proto__`) nem adhatnak vissza „kezelőt".
      const handler = Object.prototype.hasOwnProperty.call(handlers, key) ? handlers[key] : undefined;
      if (typeof handler === 'function') {
        // A FEJLESZTŐI FELÜLET KAPCSOLÓ MÖGÖTT (levél-fogadó · óra): kikapcsolva NEM LÉTEZIK —
        // ugyanazt a választ adja, mint bármely ismeretlen út (nem árulja el, hogy létezne).
        if (key.includes(' /dev/') && !devSurface) {
          return sendJson(res, 404, { ok: false, reason: 'unknown_endpoint', message: `nincs ilyen végpont: ${key}` }, setCookie);
        }
        let body = {};
        if (req.method === 'POST') {
          const raw = await readBody(req);
          if (raw.trim()) {
            try { body = JSON.parse(raw); } catch { return sendJson(res, 400, { ok: false, reason: 'invalid_json', message: 'a kérés törzse nem JSON' }, setCookie); }
          }
          // A NEM-OBJEKTUM TÖRZS SEM NÉMÁN ÜRÜL KI: a séma-motor mondja ki (`invalid_body`).
          if (body === undefined) body = {};
        }
        const query = Object.fromEntries(url.searchParams.entries());
        // A BEMENETI SÉMA — a HATÁRON (HTP-01). Állapotváltoztató végponton KAPU: nevezett
        // elutasítás, ÍRÁS NÉLKÜL (a kezelő meg sem hívódik). Olvasón: nevezett figyelmen kívül.
        const checked = validateRequest({ key, body, query });
        if (!checked.ok) {
          return sendJson(res, 400, {
            ok: false, reason: checked.error, message: checked.detail,
            field: checked.at, where: checked.where, refused_by: 'input_schema',
          }, setCookie);
        }
        const out = handler({ session, body: (body && typeof body === 'object' && !Array.isArray(body)) ? body : {}, input: checked.value, query: checked.query, url, host });
        if (out.html !== undefined) return sendHtml(res, out.status, out.html, setCookie);
        let envelope = out.body;
        if (checked.ignored_params.length) envelope = { ...envelope, param_ignored: true, ignored_params: [...checked.ignored_params] };
        // A DEKLARÁLT ALAPÉRTELMEZÉS KIMONDVA (BEM-01): ha egy mezőt nem a beadó küldött, hanem a
        // séma tette hozzá, azt a válasz FELSOROLJA — különben pont az a némaság születne vissza,
        // amit a szerződés tilt.
        if (checked.defaults_applied && checked.defaults_applied.length) envelope = { ...envelope, defaults_applied: [...checked.defaults_applied] };
        return sendJson(res, out.status, envelope, out.setCookie || setCookie);
      }
      if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/dev/')) {
        return sendJson(res, 404, { ok: false, reason: 'unknown_endpoint', message: `nincs ilyen végpont: ${key}` }, setCookie);
      }
      if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(url.pathname, res, setCookie);
      return sendJson(res, 405, { ok: false, reason: 'method_not_allowed' }, setCookie);
    } catch (e) {
      if (e && e.code === 'body_too_large') return sendJson(res, 413, { ok: false, reason: 'body_too_large' }, setCookie);
      // PROGRAMHIBA — nem üzleti elutasítás; a mag nevezett válaszai ide nem jutnak (KUKA-020).
      return sendJson(res, 500, { ok: false, reason: 'internal_error', message: String(e && e.message || e) }, setCookie);
    }
  }

  function serveStatic(pathname, res, setCookie) {
    const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.replace(/^\/+/, ''));
    const target = resolve(PUBLIC_DIR, rel);
    // ÚTVONAL-ÁTLÉPÉS TILOS: a feloldott út a public mappán BELÜL kell álljon.
    if (target !== PUBLIC_DIR && !target.startsWith(PUBLIC_DIR + sep)) return sendJson(res, 403, { ok: false, reason: 'path_rejected' }, setCookie);
    if (!existsSync(target) || !statSync(target).isFile()) return sendJson(res, 404, { ok: false, reason: 'not_found' }, setCookie);
    const headers = { 'Content-Type': MIME[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' };
    if (setCookie) headers['Set-Cookie'] = setCookie;
    res.writeHead(200, headers);
    res.end(readFileSync(target));
  }

  const server = http.createServer((req, res) => { handle(req, res); });
  server.on('close', () => { try { store.close(); } catch { /* már zárva */ } });
  return { server, store, mailbox, sessions, dbPath: path, clock };
}

/** Elindítja a szervert; `port: 0` ⇒ szabad port. */
export function startServer({ port = Number(process.env.VS_APP_PORT || 3300), dbPath, clock, devSurface } = {}) {
  const app = createApp({ dbPath, clock, ...(devSurface === undefined ? {} : { devSurface }) });
  return new Promise((resolveStart, reject) => {
    app.server.once('error', reject);
    app.server.listen(port, '127.0.0.1', () => {
      const actual = app.server.address().port;
      resolveStart({ ...app, port: actual, close: () => new Promise((r) => app.server.close(() => r())) });
    });
  });
}

// KÖZVETLEN INDÍTÁS: `node v3app/server.mjs` (npm run app:dev).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().then((app) => {
    console.log(`[v3app] fut: http://127.0.0.1:${app.port}/  · tároló: ${app.dbPath}`);
    console.log(`[v3app] ${DEV_MAILBOX_LABEL}: http://127.0.0.1:${app.port}/dev/mailbox`);
    console.log(`[v3app] ismert tervek: ${Object.keys(PLANS).join(' · ')} · joghatósági profilok: ${Object.keys(JURISDICTION_PROFILES).join(' · ')} · businessIdentityOf elérhető: ${typeof businessIdentityOf === 'function'}`);
  }).catch((e) => { console.error('[v3app] nem indult el:', e.message); process.exit(1); });
}
