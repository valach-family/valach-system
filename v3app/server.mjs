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
import { randomBytes } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve, join, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { openStoreAt } from '../v3ref/store.mjs';
import {
  registerAccount, authenticate, issueChannelChallenge, redeemChannelChallenge, provenEmailOf,
} from '../v3ref/account.mjs';
import { createWorkspace, bootstrapOf, workspacesOf } from '../v3ref/workspace.mjs';
import { inviteColleague, grantScopeToMember, revokeDelegationsOf } from '../v3ref/delegation.mjs';
import { observeInvite, redeemInvite, rememberIntent, resumeIntent } from '../v3ref/invite.mjs';
import { rightAt, revokeMembership, KNOWN_ROLES } from '../v3ref/authz.mjs';
import { submitCommand, readCommandResult } from '../v3ref/command.mjs';
import { KNOWN_DATA_SCOPES } from '../v3ref/resultScope.mjs';
import { entitlementFor, twoGateVerdict, setEntitlementProfile, PLANS } from '../v3ref/entitlement.mjs';
import { attachBusinessIdentity, businessIdentityOf, JURISDICTION_PROFILES } from '../v3ref/externalId.mjs';
import { membershipAsOf } from '../v3ref/bitemporal.mjs';
import { readScopeGrantAt } from '../v3ref/scopeGrant.mjs';

const require = createRequire(import.meta.url);
const { artifactPath } = require('../contracts/artifactNaming.js');

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const PUBLIC_DIR = resolve(HERE, 'public');
const PKG_VERSION = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')).version;

export const DEV_MAILBOX_LABEL = 'FEJLESZTŐI LEVÉL-FOGADÓ — nem küld külső személynek';
export const NEUTRAL_REGISTER = Object.freeze({ ok: true, message: 'Ha a cím szabad, megerősítő levelet küldtünk.' });

const SESSION_COOKIE = 'vs_session';
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 64 * 1024;

// A KLIENS ÁLTAL KÜLDHETŐ, DE A CSELEKVŐT VAGY A KÖNYVET MEGNEVEZŐ MEZŐK — ezeket egyetlen
// adat-végpont sem olvassa. Ahol egy mező LEGITIM bemenet (a meghívó FELAJÁNLOTT szerepe, a
// munkakörnyezet-választó könyve), ott a végpont NEVEZETTEN engedi (allow-lista).
const CLIENT_AUTHORITY_PARAMS = Object.freeze(['book_id', 'workspace_id', 'workspace', 'current_book_id', 'actor', 'actor_id', 'role', 'subject']);

const hex = (bytes) => randomBytes(bytes).toString('hex');
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

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

// ── AZ ALKALMAZÁS ────────────────────────────────────────────────────────────────────────────────
/**
 * Létrehozza a HTTP-szervert (még nem figyel). EGY tároló folyamatonként.
 * @param {{dbPath?:string, clock?:{now:()=>string}}} opts
 */
export function createApp({ dbPath, clock = { now: nowIso } } = {}) {
  const path = dbPath || resolveDbPath();
  mkdirSync(dirname(path), { recursive: true });
  const store = openStoreAt(path, { timeoutMs: 2000 });
  const sessions = new Map();        // id → { id, subject_id, current_book_id, created_at }
  const mailbox = [];                // a FEJLESZTŐI LEVÉL-FOGADÓ — memóriában, kifelé soha

  function pushMail({ to, subject, link, body }) {
    mailbox.push(Object.freeze({ id: mailbox.length + 1, at: clock.now(), to, subject, link, body: body || '' }));
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
      // A fejléc nem mutathat olyan munkakörnyezetet, amiben az alany már nem tag (KUKA-050).
      session.current_book_id = null;
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

  /** A kliens által küldött cselekvő/könyv-mezők — NEVEZETTEN figyelmen kívül hagyva. */
  function ignoredParamsOf(url, body, allow = []) {
    const found = new Set();
    for (const k of CLIENT_AUTHORITY_PARAMS) {
      if (allow.includes(k)) continue;
      if (url.searchParams.has(k)) found.add(k);
      if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, k)) found.add(k);
    }
    return [...found];
  }

  // ── A VÉGPONTOK ──────────────────────────────────────────────────────────────────────────────
  // Minden kezelő {status, body, setCookie?} alakot ad vissza; a boríték egy helyen épül.
  const loginRequired = () => ({ status: 401, body: { ok: false, reason: 'login_required', message: 'ehhez be kell jelentkezned' } });
  const workspaceRequired = (cur) => ({ status: 409, body: { ok: false, reason: cur.reason, detail: cur.detail ?? null, message: 'nincs kiválasztott munkakörnyezet — válassz vagy hozz létre egyet' } });

  const handlers = {
    // ── FIÓK ─────────────────────────────────────────────────────────────────────────────────
    'POST /api/register': ({ body, host }) => {
      const email = String(body.email ?? '').trim();
      const password = typeof body.password === 'string' ? body.password : '';
      if (!email.includes('@')) return { status: 400, body: { ok: false, reason: 'email_required', message: 'adj meg egy e-mail címet' } };
      if (password.length < 8) return { status: 400, body: { ok: false, reason: 'secret_too_short', message: 'a jelszó legalább 8 karakter' } };
      const at = clock.now();
      const r = registerAccount({ store, subjectId: `sub_${hex(8)}`, email, secret: password, at });
      if (r.ok) {
        const token = hex(32);
        const ch = issueChannelChallenge({ store, subjectId: r.subject_id, value: r.email, token, at });
        if (ch.ok) {
          pushMail({ to: r.email, subject: 'Erősítsd meg az e-mail címedet', link: `http://${host}/api/verify?token=${token}`,
            body: 'Kattints a hivatkozásra, hogy bizonyítsd: ez a cím a tiéd. A hivatkozás 24 óráig él.' });
        }
      } else if (r.reason !== 'address_already_registered') {
        // A SAJÁT bemenet hibája nevezett (KUKA-070); a cím foglaltsága viszont NEM (anti-enumeráció).
        return { status: 400, body: { ok: false, reason: r.reason, message: 'a regisztráció adatai hiányosak' } };
      }
      // SEMLEGES VÁLASZ: ugyanaz a JSON, akár született fiók, akár nem (K03).
      return { status: 200, body: { ...NEUTRAL_REGISTER } };
    },

    'GET /api/verify': ({ url }) => {
      const token = url.searchParams.get('token') || '';
      const r = redeemChannelChallenge({ store, token, at: clock.now() });
      const ok = r.ok === true;
      const msg = ok
        ? `Az e-mail címed (${esc(r.value_norm)}) bizonyítva. Most már bejelentkezhetsz és indíthatsz munkakörnyezetet.`
        : `A megerősítés nem sikerült: <code>${esc(r.reason)}</code>. ${r.reason === 'challenge_already_used' ? 'Ezt a hivatkozást már beváltották.' : (r.reason === 'challenge_expired' ? 'A hivatkozás lejárt — regisztrálj újra.' : 'Ismeretlen vagy hibás hivatkozás.')}`;
      const html = `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>E-mail megerősítés — VS3</title><link rel="stylesheet" href="/style.css"></head><body><main class="verify"><h1>${ok ? 'Megerősítve' : 'Nem sikerült'}</h1><p data-testid="verify-result" data-ok="${ok}">${msg}</p><p><a href="/" data-testid="verify-back">Vissza az alkalmazáshoz</a></p></main></body></html>`;
      return { status: ok ? 200 : 400, html };
    },

    'POST /api/login': ({ session, body }) => {
      const r = authenticate({ store, email: String(body.email ?? ''), secret: typeof body.password === 'string' ? body.password : '' });
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
      return { status: 200, body: { ok: true, subject_id: r.subject_id, pending_invite_token: pending || null }, setCookie: sessionCookie(fresh.id), session: fresh };
    },

    'POST /api/logout': ({ session }) => {
      sessions.delete(session.id);
      const fresh = newSession();
      return { status: 200, body: { ok: true }, setCookie: sessionCookie(fresh.id), session: fresh };
    },

    'GET /api/me': ({ session }) => {
      if (!session.subject_id) {
        return { status: 200, body: { ok: true, subject_id: null, email: null, channel_proven: false, workspaces: [], current_book_id: null, current_role: null, current_book_name: null } };
      }
      const at = clock.now();
      const ws = workspacesOf({ store, subjectId: session.subject_id, at });
      const cur = currentBookOf(session);
      const current = cur.book_id ? ws.find((w) => w.book_id === cur.book_id) : null;
      return { status: 200, body: {
        ok: true, subject_id: session.subject_id, email: emailOf(session.subject_id),
        channel_proven: !!provenEmailOf(store, session.subject_id),
        workspaces: ws.map((w) => ({ ...w, plan: (store.get('SELECT plan FROM entitlement_profile WHERE book_id = ?', w.book_id) || {}).plan ?? null })),
        current_book_id: current ? current.book_id : null,
        current_role: current ? current.role : null,
        current_book_name: current ? current.name : null,
        current_plan: current ? ((store.get('SELECT plan FROM entitlement_profile WHERE book_id = ?', current.book_id) || {}).plan ?? null) : null,
      } };
    },

    // ── MUNKAKÖRNYEZET ───────────────────────────────────────────────────────────────────────
    'POST /api/workspaces': ({ session, body }) => {
      if (!session.subject_id) return loginRequired();
      const name = String(body.name ?? '').trim();
      const plan = body.plan === undefined || body.plan === null || body.plan === '' ? 'starter' : String(body.plan);
      const at = clock.now();
      const bookId = `ws_${hex(4)}`;
      const ws = createWorkspace({ store, creatorSubjectId: session.subject_id, bookId, name, at, plan });
      if (!ws.ok) return { status: ws.reason === 'creator_channel_unproven' ? 403 : 400, body: { ok: false, reason: ws.reason, message: ws.message ?? 'a munkakörnyezet nem jött létre' } };

      let business = null;
      const biz = body.business && typeof body.business === 'object' ? body.business : null;
      if (biz && String(biz.tax_id ?? '').trim()) {
        // ÖNBEVALLOTT ÁLLÍTÁS — hatósági igazolás nincs, és ezt a válasz kimondja (verification: none_available).
        business = attachBusinessIdentity({ store, bookId, namespace: 'tax_id', jurisdiction: String(biz.jurisdiction ?? ''), valueRaw: String(biz.tax_id), at: clock.now() });
      }

      // KÉT SZINTETIKUS MINTA-REKORD a létrehozó nevében — a mennyiség KANONIKUS DECIMÁLIS SZÖVEG (MNY-01).
      const samples = {
        stock: submitCommand({ store, idemKey: 'minta-keszlet', actor: session.subject_id, bookId, type: 'stock.receipt', typeVersion: '1', declared: { qty: '12' }, resolve: () => ({ qty: '12' }), clock }),
        price: submitCommand({ store, idemKey: 'minta-ar', actor: session.subject_id, bookId, type: 'stock.receipt', typeVersion: '1', declared: { qty: '12' }, resolve: () => ({ qty: '12', unit_price: 3490 }), clock }),
      };
      session.current_book_id = bookId;
      return { status: 201, body: { ok: true, workspace: ws, business, samples, book_id: bookId, name, role: 'admin' } };
    },

    'POST /api/session/workspace': ({ session, body }) => {
      if (!session.subject_id) return loginRequired();
      const bookId = String(body.book_id ?? '').trim();
      if (!bookId) return { status: 400, body: { ok: false, reason: 'book_id_required', message: 'add meg, melyik munkakörnyezetre váltasz' } };
      const at = clock.now();
      const m = membershipAsOf({ store, subjectId: session.subject_id, bookId, validAt: at, knownAt: at });
      if (m.effective !== true) {
        return { status: 403, body: { ok: false, reason: 'not_a_member', detail: m.reason, message: 'ebben a munkakörnyezetben nincs hatályos tagságod' } };
      }
      session.current_book_id = bookId;
      return { status: 200, body: { ok: true, book_id: bookId, role: roleIn(session.subject_id, bookId, at), name: bookNameOf(bookId) } };
    },

    'POST /api/workspaces/plan': ({ session, body }) => {
      if (!session.subject_id) return loginRequired();
      const cur = currentBookOf(session);
      if (!cur.book_id) return workspaceRequired(cur);
      const gate = adminGate(session, cur.book_id);
      if (!gate.ok) return { status: gate.status, body: { ok: false, reason: gate.reason, message: gate.message } };
      const r = setEntitlementProfile({ store, bookId: cur.book_id, plan: String(body.plan ?? ''), at: clock.now() });
      return { status: r.ok ? 200 : 400, body: { ...r } };
    },

    // ── MUNKATÁRSAK ──────────────────────────────────────────────────────────────────────────
    'GET /api/members': ({ session }) => {
      if (!session.subject_id) return loginRequired();
      const cur = currentBookOf(session);
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
      return { status: 200, body: { ok: true, book_id: cur.book_id, members, known_scopes: [...KNOWN_DATA_SCOPES], known_roles: [...KNOWN_ROLES] } };
    },

    'POST /api/invites': ({ session, body, host }) => {
      if (!session.subject_id) return loginRequired();
      const cur = currentBookOf(session);
      if (!cur.book_id) return workspaceRequired(cur);
      const token = hex(32);
      const at = clock.now();
      const expiresAt = new Date(Date.parse(at) + INVITE_TTL_MS).toISOString();
      const r = inviteColleague({
        store, inviterSubjectId: session.subject_id, bookId: cur.book_id,
        inviteeEmail: String(body.email ?? ''), offeredRole: String(body.role ?? ''), scope: String(body.scope ?? ''),
        token, expiresAt, at,
      });
      if (!r.ok) return { status: 403, body: { ok: false, reason: r.reason, message: r.message ?? 'a meghívó nem adható ki', ceiling: r.ceiling ?? null } };
      pushMail({ to: String(body.email).trim(), subject: `Meghívás: ${bookNameOf(cur.book_id) ?? cur.book_id}`, link: `http://${host}/?invite=${token}`,
        body: `${emailOf(session.subject_id) ?? session.subject_id} meghívott a(z) „${bookNameOf(cur.book_id) ?? cur.book_id}" munkakörnyezetbe (${String(body.role)} szerep, ${String(body.scope)} adatkör-plafon). A meghívó 7 napig él.` });
      return { status: 201, body: { ok: true, token, ceiling: r.ceiling, basis_id: r.basis_id, basis_version: r.basis_version, expires_at: expiresAt } };
    },

    'GET /api/invites/observe': ({ session, url }) => {
      const token = url.searchParams.get('token') || '';
      const r = observeInvite({ store, token, viewerSubjectId: session.subject_id, clock });
      return { status: 200, body: { ...r } };
    },

    'POST /api/invites/pending': ({ session, body }) => {
      const token = String(body.token ?? '').trim();
      if (!token) return { status: 400, body: { ok: false, reason: 'token_required', message: 'hiányzik a meghívó azonosítója' } };
      rememberIntent({ store, sessionId: session.id, token, clock });
      return { status: 200, body: { ok: true } };
    },

    'POST /api/invites/redeem': ({ session, body }) => {
      if (!session.subject_id) return loginRequired();
      const token = String(body.token ?? '').trim();
      if (!token) return { status: 400, body: { ok: false, reason: 'token_required', message: 'hiányzik a meghívó azonosítója' } };
      const r = redeemInvite({ store, token, actingSubjectId: session.subject_id, clock });
      if (r.ok) {
        session.current_book_id = r.book_id;
        store.run('DELETE FROM pending_intent WHERE session_id = ?', session.id);
      }
      return { status: r.ok ? 200 : 403, body: { ...r } };
    },

    'POST /api/members/scope': ({ session, body }) => {
      if (!session.subject_id) return loginRequired();
      const cur = currentBookOf(session);
      if (!cur.book_id) return workspaceRequired(cur);
      const r = grantScopeToMember({ store, granterSubjectId: session.subject_id, bookId: cur.book_id, targetSubjectId: String(body.subject_id ?? ''), scope: String(body.scope ?? ''), at: clock.now() });
      return { status: r.ok ? 200 : 403, body: { ...r } };
    },

    'POST /api/members/revoke': ({ session, body }) => {
      if (!session.subject_id) return loginRequired();
      const cur = currentBookOf(session);
      if (!cur.book_id) return workspaceRequired(cur);
      const target = String(body.subject_id ?? '').trim();
      if (!target) return { status: 400, body: { ok: false, reason: 'subject_id_required', message: 'add meg, kinek a tagságát vonod meg' } };
      const revocation = revokeMembership({ store, subjectId: target, bookId: cur.book_id, clock, actorSubjectId: session.subject_id });
      const delegation = revocation.ok ? revokeDelegationsOf({ store, subjectId: target, bookId: cur.book_id, at: clock.now() }) : null;
      return { status: revocation.ok ? 200 : 403, body: { ok: revocation.ok, reason: revocation.reason, message: revocation.message ?? null, revocation, delegation } };
    },

    // ── ADATOK ───────────────────────────────────────────────────────────────────────────────
    'GET /api/data/stock': ({ session }) => {
      if (!session.subject_id) return loginRequired();
      const cur = currentBookOf(session);
      if (!cur.book_id) return { status: 200, body: { ok: false, result: null, refused_by: 'right', reason: cur.reason, detail: cur.detail ?? null, message: 'nincs hatályos tagságod a kiválasztott munkakörnyezetben' } };
      const r = readSample(cur.book_id, session.subject_id, 'minta-keszlet');
      return { status: 200, body: { ok: r.ok, result: r.ok ? r.result : null, refused_by: r.ok ? null : 'right', reason: r.ok ? null : r.error, message: r.message ?? null } };
    },

    'GET /api/data/price': ({ session }) => {
      if (!session.subject_id) return loginRequired();
      const cur = currentBookOf(session);
      if (!cur.book_id) return { status: 200, body: { ok: false, result: null, refused_by: 'right', reason: cur.reason, right_reason: cur.reason, entitlement_reason: null, message: 'nincs hatályos tagságod a kiválasztott munkakörnyezetben' } };
      // KÉT KAPU, KÜLÖN MÉRVE, KÜLÖN JELENTVE — egy mezőbe vonni tilos (ENT-02 · KUKA-002).
      const r = readSample(cur.book_id, session.subject_id, 'minta-ar');
      const entitlement = entitlementFor({ store, bookId: cur.book_id, feature: 'price_view' });
      const verdict = twoGateVerdict({ right: { allowed: r.ok === true, reason: r.ok ? null : r.error }, entitlement });
      return { status: 200, body: {
        ok: verdict.allowed, result: verdict.allowed ? r.result : null,
        refused_by: verdict.refused_by,
        right_reason: verdict.allowed ? null : verdict.right_reason,
        entitlement_reason: verdict.allowed ? null : verdict.entitlement_reason,
        entitlement: { available: entitlement.available, reason: entitlement.reason, plan: entitlement.plan },
        message: verdict.allowed ? 'az ár-nézet kiadva' : (r.message ?? null),
      } };
    },

    'GET /dev/mailbox': () => ({ status: 200, body: { ok: true, label: DEV_MAILBOX_LABEL, mails: [...mailbox].reverse() } }),
  };

  /** A minta-rekord kiadása: a kérő a munkamenet alanya, a cselekvő a könyv LÉTREHOZÓJA. */
  function readSample(bookId, requester, idemKey) {
    const boot = bootstrapOf({ store, bookId });
    if (!boot) return { ok: false, error: 'no_bootstrap', message: 'ehhez a könyvhöz nincs indulási tény' };
    return readCommandResult({ store, idemKey, requester, bookId, actor: boot.creator_subject_id, clock });
  }

  const ALLOW = { 'POST /api/invites': ['role'], 'POST /api/session/workspace': ['book_id'] };

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
      const handler = handlers[key];
      if (handler) {
        let body = {};
        if (req.method === 'POST') {
          const raw = await readBody(req);
          if (raw.trim()) {
            try { body = JSON.parse(raw); } catch { return sendJson(res, 400, { ok: false, reason: 'invalid_json', message: 'a kérés törzse nem JSON' }, setCookie); }
          }
          if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
        }
        const ignored = ignoredParamsOf(url, body, ALLOW[key] || []);
        const out = handler({ session, body, url, host });
        if (out.html !== undefined) return sendHtml(res, out.status, out.html, setCookie);
        const envelope = ignored.length ? { ...out.body, param_ignored: true, ignored_params: ignored } : out.body;
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
export function startServer({ port = Number(process.env.VS_APP_PORT || 3300), dbPath, clock } = {}) {
  const app = createApp({ dbPath, clock });
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
