#!/usr/bin/env node
/**
 * MCN-01 — A VALÓDI TÖBBKAPCSOLATOS VÉGLEGESÍTÉSI HATÁR (OB-1 · R63 §5.2 · §5.3/14).
 *
 * MIT MÉR. Két VALÓDI, KÜLÖN OS-FOLYAMATBAN nyitott kapcsolat (`openStoreAt`: WAL napló,
 * `BEGIN IMMEDIATE`, foglalt-várakozás) versenyez UGYANAZON a tartós SQLite-fájlon, és három
 * kérdésre felel — menetenként, friss kapcsolatról visszaolvasva:
 *
 *   (1) MEGHÍVÓ-BEVÁLTÁS VERSENYE — ugyanazt a lepecsételt meghívót két kapcsolat egyszerre váltja
 *       be: pontosan EGY tagság, EGY tagságadó esemény és EGY `grant_basis` sor születik; a vesztes
 *       NEVEZETT elutasítást kap (`invite_not_actionable` / `invite_already_redeemed`), nem
 *       összeomlást.
 *   (2) MEGVONÁS ↔ VÉGLEGESÍTÉS — az A kapcsolaton a helyi kezelő (`alter_right`, az indulási
 *       szabályból) megvonja a tag tagságát, a B kapcsolaton UGYANAZ a tag készlet-bevétet ad be. A
 *       parancs az AKTUÁLIS szabály szerint véglegesül vagy bukik. MINDKÉT sorrend érvényes; az
 *       invariáns sorrendenként más: ha a megvonás ért előbb célba ⇒ NULLA parancs-, nyugta- és
 *       mozgás-sor (a kimenet `not_available`); ha a parancs ⇒ egy-egy sor, és a KÉSŐBBI visszaolvasás
 *       már elutasított.
 *   (3) A VISSZAJÁTSZÁS NEM KERÜLI MEG A MAI ADATJOGOT — a megvonás ELŐTT véglegesített parancs
 *       (`pre`) eredménye a megvonás előtt kiadható volt (POZITÍV ELLENPÁR), a megvonás UTÁN
 *       `readCommandResult` ⇒ `not_available`, a kulcs ismétlése (`submitCommand`, azonos tartalom) ⇒
 *       `not_available`, ÚJ kiadási leltár-sor nem születik, a parancs története viszont érintetlen.
 *
 * MIÉRT KÜLÖN FOLYAMATOK. A `node:sqlite` `DatabaseSync` SZINKRON: egy folyamaton belül két „kapcsolat"
 * soha nem várhat egymásra, tehát az egyszálú közbeiktatás csak SORRENDET szimulál. Az R63 §5.2 ezt
 * kimondva nem fogadja el: „Egyírós közbeiktatást továbbra sem nevezünk többfelhasználós
 * bizonyítéknak." Itt a két munkás két gyermek-folyamat (`child_process.spawn`), mindegyik SAJÁT
 * `openStoreAt` kapcsolattal; a szülő csak a világot építi fel (a mag saját belépési pontjain), a
 * rajtot adja, és a végén FRISS kapcsolatról olvassa vissza a sorokat.
 *
 * A VERSENY VALÓDISÁGÁNAK TANÚI — MENETENKÉNT, nem összesítve (KUKA-093):
 *   · három különböző PID (szülő + két munkás), és mindkét munkás a SAJÁT kapcsolatán méri a
 *     `PRAGMA journal_mode`-ot;
 *   · a munkás a hívás ELŐTT megnézi a versengő tényt (a meghívó még beváltatlan · a tagság még él ·
 *     még nincs parancs-sor): ha a vesztes ezt NYITVA látta, a döntés a két kapcsolat KÖZÖTT, az
 *     írás-határon dőlt el, nem egy már lezárt állapot puszta újraolvasásán;
 *   · a munkás a SAJÁT tároló-fogantyúján időbélyegzi a `BEGIN IMMEDIATE` belépését/kilépését és a
 *     `COMMIT`-ot (MEGFIGYELÉS: egyetlen utasítás sem változik, csak átmegy) — így a vesztes bukása
 *     HÁROM nevezett alak egyike: a zárra VÁRVA (a BEGIN-je a nyertes COMMIT-ja előtt lépett be) ·
 *     várakozás nélkül, de a tranzakción BELÜLI újraolvasás fogta meg (a változás a hívás előtti
 *     megfigyelés és a BEGIN közé esett) · a tranzakció ELŐTT (a nyitott olvasás már lezártat látott).
 *   Ha egy menetben a verseny nem jött létre (a vesztes már lezártnak látta a tényt), a menet
 *   „nem versengett" néven ÚJRA fut (legfeljebb háromszor), és ezt a lap KIÍRJA — az invariánst
 *   viszont az ilyen kísérleten is mérjük, és ha sérül, az HIBA, nem újrapróbálás (KUKA-049).
 *
 * AMIT NEM BIZONYÍT — KIMONDVA (KUKA-033 · KUKA-015):
 *   · NEM Postgres és NEM hálózati kérésfogadási határ: egy gépen, egy fájlon, a magot közvetlenül
 *     hívó két folyamat. Az OB-1 „Postgres (vagy egyenértékű) tárolón" zárófeltétele ettől nem
 *     teljesül — ez a §5.2 szerinti, izolált, VALÓDI többkapcsolatos tárolón mért próba;
 *   · kettőnél több író, terhelés, skála és hosszú távú stabilitás nincs mérve;
 *   · a folyamatközi időbélyegek a gép faliórájából jönnek (ugyanaz a gép) — TANÚNAK jók,
 *     invariánsnak nem: az invariáns a SOROK SZÁMA és a NEVEZETT kimenet, friss kapcsolatról mérve;
 *   · hogy a parancs a lánc MELYIK kapuján bukott (bejárati kapu · belső bebocsátás · tranzakción
 *     belül), azt a munkás fogantyúján látott `BEGIN` megléte és az `access_refusal` sor alapján
 *     soroljuk be — ez a mag KÍVÜLRŐL megfigyelt nyoma, nem belső mérés.
 *
 * NYERS SQL CSAK VISSZAOLVASÁSRA. A mért viselkedés a mag saját belépési pontjain fut:
 * registerAccount · issueChannelChallenge · redeemChannelChallenge · createWorkspace ·
 * inviteColleague · registerItem · redeemInvite · grantScopeToMember · submitCommand ·
 * submitStockReceipt · revokeMembership · readCommandResult. A versenyző parancs SZÁNDÉKOSAN a
 * kanonikus bevét-út (`submitStockReceipt` = `submitCommand` + VALÓDI hatás), hogy a „nulla
 * hatás-sor" MÉRÉS legyen, ne szerkezeti tautológia (KUKA-015); a visszajátszott parancs (`pre`) az
 * r77 külső program alakját követi (`stock.receipt` · `1` · `{qty:'1'}`), mert azt olvassuk vissza.
 *
 * KILÉPÉS: 0 = minden invariáns minden menetben tartott · 1 = bármi más. A lap három szót nem mos
 * össze: HIBA (a rendszer) · ELAKADT MÉRÉS (a próba nem tudott mérni) · NEM VERSENGETT (a menet
 * nem hozott létre versenyt, és az újrapróbálások sem) — KUKA-093.
 *
 * Használat: npm run proof:multiconn  [-- --n=20 --keep]
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStoreAt, instantMs } from '../v3ref/store.mjs';
import { registerAccount, issueChannelChallenge, redeemChannelChallenge } from '../v3ref/account.mjs';
import { createWorkspace } from '../v3ref/workspace.mjs';
import { inviteColleague, grantScopeToMember } from '../v3ref/delegation.mjs';
import { redeemInvite } from '../v3ref/invite.mjs';
import { revokeMembership } from '../v3ref/authz.mjs';
import { submitCommand, readCommandResult } from '../v3ref/command.mjs';
import { submitStockReceipt } from '../v3ref/ledger.mjs';
import { registerItem } from '../v3ref/catalog.mjs';

// A SAJÁT ÚT AZ `import.meta.url`-BŐL — beégetett gép-út soha (KUKA-031).
const SELF = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SELF), '..');
const require = createRequire(import.meta.url);
const { artifactPath } = require(join(ROOT, 'contracts', 'artifactNaming.js'));
// A VERZIÓ A package.json-BÓL, NEM GÉPELVE (KUKA-005 · KUKA-033).
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

const DEFAULT_ITERATIONS = 20;
// A vesztes ennyit várhat a zárra — a nyertes tranzakciója ezredmásodpercekig tart, a tartalék bő.
const BUSY_TIMEOUT_MS = 10000;
const BARRIER_TIMEOUT_MS = 10000;
const WORKER_TIMEOUT_MS = 30000;
const CONTENTION_ATTEMPTS = 3;

// A VILÁG NEVEI — szintetikus, jelölt próba-adat (R63 §5.2: „egyértelműen jelölt szintetikus mintarekord").
const WORLD = Object.freeze({
  owner: 'sub_owner', ownerEmail: 'owner@example.test',
  member: 'sub_member', memberEmail: 'member@example.test',
  book: 'book_a', bookName: 'Próba munkakörnyezet (szintetikus)',
  token: 'inv_multiconn_0001',
  role: 'user', scope: 'keszlet',
  sku: 'ALMA', unit: 'db', warehouse: 'wh_1',
  preKey: 'pre', raceKey: 'race',
});

// VALÓDI ÓRA. A magpróbák determinisztikus órát használnak; itt a KÉT FOLYAMAT egymáshoz képesti
// sorrendje a mért tény, és a rögzített `finalized_at` / `recorded_at` a valódi hatályosulási
// pillanatot viseli. A bizonyíték nem az órán áll, hanem a sorokon és a nevezett kimeneten.
const wallClock = () => ({ now: () => new Date().toISOString() });
// Folyamatok között összevethető, tört-ezredmásodperces falióra (ugyanaz a gép).
const nowMs = () => performance.timeOrigin + performance.now();

// ═══ A MUNKÁS — külön folyamat, saját kapcsolat ══════════════════════════════════════════════════

/** A RAJT: szoros várakozás a rajt-fájlra. A szülő csak akkor írja ki, ha MINDKÉT munkás készen áll. */
function spinUntilExists(path, deadlineMs) {
  while (!existsSync(path)) { if (Date.now() > deadlineMs) return false; }
  return true;
}

/**
 * A TRANZAKCIÓ-HATÁR IDŐBÉLYEGZÉSE A MUNKÁS SAJÁT FOGANTYÚJÁN. Megfigyelés: minden utasítás
 * változatlanul megy tovább; csak a `BEGIN IMMEDIATE` belépését/kilépését (⇒ mennyit várt a zárra)
 * és a `COMMIT`/`ROLLBACK` pillanatát jegyezzük fel. Az ELSŐ `BEGIN` és az UTOLSÓ `COMMIT` marad.
 */
function traceTransactions(store) {
  const trace = { begin: null, commit: null, rollback: null, begin_failed: null };
  const original = store.db.exec.bind(store.db);
  store.db.exec = function tracedExec(sql) {
    const text = String(sql).trim();
    const enter = nowMs();
    try {
      return original(sql);
    } catch (e) {
      if (text === 'BEGIN IMMEDIATE') trace.begin_failed = { t_enter: enter, t_exit: nowMs(), error: String(e && e.message) };
      throw e;
    } finally {
      const exit = nowMs();
      if (text === 'BEGIN IMMEDIATE' && !trace.begin) trace.begin = { t_enter: enter, t_exit: exit, wait_ms: exit - enter };
      else if (text === 'COMMIT') trace.commit = { t: exit };
      else if (text === 'ROLLBACK') trace.rollback = { t: exit };
    }
  };
  return trace;
}

/** A VERSENGŐ TÉNY A HÍVÁS ELŐTT — ebből látszik, hogy a döntés a két kapcsolat KÖZÖTT dőlt el. */
function observeBefore(store, job) {
  switch (job.role) {
    case 'redeem': {
      const r = store.get('SELECT redeemed_at FROM invite WHERE token = ?', job.token);
      return { invite_redeemed_at: r ? r.redeemed_at : undefined, saw_open: Boolean(r) && r.redeemed_at === null };
    }
    case 'command': {
      const r = store.get('SELECT revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', job.actor, job.bookId);
      return { membership_revoked_at: r ? r.revoked_at : undefined, saw_open: Boolean(r) && r.revoked_at === null };
    }
    case 'revoke': {
      const r = store.get('SELECT COUNT(*) AS n FROM command WHERE book_id = ? AND actor = ? AND idem_key = ?',
        job.bookId, job.subjectId, job.raceKey);
      return { race_command_rows: Number(r.n), saw_open: Number(r.n) === 0 };
    }
    default:
      throw new Error(`ismeretlen munkás-szerep: ${job.role}`);
  }
}

/** A MÉRT MŰVELET — a mag SAJÁT belépési pontja, nyers írás nélkül. */
function act(store, job, clock) {
  switch (job.role) {
    case 'redeem':
      return redeemInvite({ store, token: job.token, actingSubjectId: job.actingSubjectId, newCredential: null, clock });
    case 'revoke':
      return revokeMembership({ store, subjectId: job.subjectId, bookId: job.bookId, clock, actorSubjectId: job.actorSubjectId });
    case 'command':
      // A KANONIKUS BEVÉT-ÚT: `stock.receipt` · '1' · qty kanonikus decimális SZÖVEG · VALÓDI hatás.
      return submitStockReceipt({
        store, idemKey: job.raceKey, actor: job.actor, bookId: job.bookId,
        ownerId: job.ownerId, warehouseId: job.warehouseId,
        input: { item_id: job.itemId, qty: '1', effective_at: clock.now() },
        clock,
      });
    default:
      throw new Error(`ismeretlen munkás-szerep: ${job.role}`);
  }
}

function runWorker(job) {
  const emit = (o) => process.stdout.write(`${JSON.stringify(o)}\n`);
  let store = null;
  try {
    store = openStoreAt(job.dbPath, { timeoutMs: BUSY_TIMEOUT_MS });
    const jm = store.get('PRAGMA journal_mode');
    const trace = traceTransactions(store);
    emit({ phase: 'ready', worker: job.name, role: job.role, pid: process.pid, journal_mode: String(Object.values(jm)[0]) });
    if (!spinUntilExists(job.goFile, Date.now() + BARRIER_TIMEOUT_MS)) throw new Error('a rajt-fájl nem érkezett meg időben');
    if (job.delay_ms) { const until = nowMs() + job.delay_ms; while (nowMs() < until) { /* lépcsőztetett rajt */ } }
    const clock = wallClock();
    const observed = observeBefore(store, job);
    const t0 = nowMs();
    const result = act(store, job, clock);
    const t1 = nowMs();
    emit({ phase: 'done', worker: job.name, role: job.role, pid: process.pid, observed_before: observed, t_start: t0, t_end: t1, trace, result });
    process.exitCode = 0;
  } catch (e) {
    emit({ phase: 'crash', worker: job.name, role: job.role, pid: process.pid, error: String((e && e.message) || e), code: (e && e.code) || null });
    process.exitCode = 2;
  } finally {
    try { if (store) store.close(); } catch { /* a kimenet már kiment */ }
  }
}

// ═══ A SZÜLŐ — világ · rajt · visszaolvasás ══════════════════════════════════════════════════════

function spawnWorker(job) {
  const child = spawn(process.execPath, ['--no-warnings', SELF, '--worker', JSON.stringify(job)],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  const lines = [];
  let buf = '';
  let stderr = '';
  let readyResolve;
  const ready = new Promise((r) => { readyResolve = r; });
  child.stdout.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      let o;
      try { o = JSON.parse(line); } catch { o = { phase: 'noise', line }; }
      lines.push(o);
      if (o.phase === 'ready') readyResolve(o);
    }
  });
  child.stderr.on('data', (d) => { stderr += d; });
  const exited = new Promise((r) => child.on('exit', (code, signal) => r({ code, signal })));
  return { job, child, ready, exited, lines, stderr: () => stderr };
}

const after = (ms, label) => new Promise((_, rej) => { setTimeout(() => rej(new Error(label)), ms).unref(); });

/** Két munkás, egy rajt: mindkettő készen áll ⇒ rajt-fájl ⇒ mindkettő lefut ⇒ az eredményük. */
async function runRace({ goFile, jobs }) {
  const workers = jobs.map(spawnWorker);
  try {
    await Promise.race([Promise.all(workers.map((w) => w.ready)), after(BARRIER_TIMEOUT_MS, 'a munkások nem jelentkeztek készre időben')]);
    writeFileSync(goFile, 'go');
    const exits = await Promise.race([Promise.all(workers.map((w) => w.exited)), after(WORKER_TIMEOUT_MS, 'a munkások nem fejezték be időben')]);
    return workers.map((w, i) => ({
      name: w.job.name, role: w.job.role, exit: exits[i],
      ready: w.lines.find((l) => l.phase === 'ready') || null,
      final: w.lines.find((l) => l.phase === 'done' || l.phase === 'crash') || null,
      stderr: w.stderr().trim(),
    }));
  } catch (e) {
    for (const w of workers) { try { w.child.kill('SIGKILL'); } catch { /* már kilépett */ } }
    throw e;
  }
}

/**
 * A VILÁG — a mag saját belépési pontjain: két bizonyított csatornájú fiók, saját munkakörnyezet
 * (indulási szabály ⇒ a létrehozó `alter_right` hatásköre), egy készlet-adatkörű munkatársi meghívó,
 * egy cikk. `redeemed: true` esetén a tag már beváltott, olvasási jogot kapott, és a `pre` parancsa
 * véglegesült — a POZITÍV ELLENPÁRRAL együtt (a megvonás előtt az olvasás MŰKÖDIK).
 */
function buildWorld(dbPath, { redeemed }) {
  const store = openStoreAt(dbPath, { timeoutMs: BUSY_TIMEOUT_MS });
  const clock = wallClock();
  const must = (label, r) => {
    if (!r || r.ok !== true) throw new Error(`a világ felépítése elakadt: ${label} → ${JSON.stringify(r)}`);
    return r;
  };
  try {
    must('registerAccount(owner)', registerAccount({ store, subjectId: WORLD.owner, email: WORLD.ownerEmail, secret: 'multiconn-owner-secret', at: clock.now() }));
    const c1 = must('issueChannelChallenge(owner)', issueChannelChallenge({ store, subjectId: WORLD.owner, value: WORLD.ownerEmail, token: 'chal_owner_multiconn_0001', at: clock.now() }));
    must('redeemChannelChallenge(owner)', redeemChannelChallenge({ store, token: c1.token, at: clock.now() }));
    must('createWorkspace', createWorkspace({ store, creatorSubjectId: WORLD.owner, bookId: WORLD.book, name: WORLD.bookName, at: clock.now() }));
    must('registerAccount(member)', registerAccount({ store, subjectId: WORLD.member, email: WORLD.memberEmail, secret: 'multiconn-member-secret', at: clock.now() }));
    const c2 = must('issueChannelChallenge(member)', issueChannelChallenge({ store, subjectId: WORLD.member, value: WORLD.memberEmail, token: 'chal_member_multiconn_0001', at: clock.now() }));
    must('redeemChannelChallenge(member)', redeemChannelChallenge({ store, token: c2.token, at: clock.now() }));
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    must('inviteColleague', inviteColleague({
      store, inviterSubjectId: WORLD.owner, bookId: WORLD.book, inviteeEmail: WORLD.memberEmail,
      offeredRole: WORLD.role, scope: WORLD.scope, token: WORLD.token, expiresAt, at: clock.now(),
    }));
    const item = must('registerItem', registerItem({ store, bookId: WORLD.book, sku: WORLD.sku, unit: WORLD.unit, at: clock.now() }));
    const world = { itemId: item.itemId, control_read: null };
    if (redeemed) {
      must('redeemInvite(member)', redeemInvite({ store, token: WORLD.token, actingSubjectId: WORLD.member, newCredential: null, clock }));
      must('grantScopeToMember(keszlet)', grantScopeToMember({ store, granterSubjectId: WORLD.owner, bookId: WORLD.book, targetSubjectId: WORLD.member, scope: WORLD.scope, at: clock.now() }));
      must('submitCommand(pre)', submitCommand({
        store, idemKey: WORLD.preKey, actor: WORLD.member, bookId: WORLD.book,
        type: 'stock.receipt', typeVersion: '1', declared: { qty: '1' }, resolve: () => ({ qty: '1' }), clock,
      }));
      // POZITÍV ELLENPÁR: a megvonás ELŐTT a kiadás MŰKÖDIK — enélkül a későbbi elutasítás üres
      // alapsokaságon zöldülne (KUKA-093), és az „elutasítás" egy sosem működött út is lehetne.
      const control = must('readCommandResult(pre) a megvonás ELŐTT', readCommandResult({
        store, idemKey: WORLD.preKey, requester: WORLD.member, bookId: WORLD.book, actor: WORLD.member, clock,
      }));
      if (!control.result || control.result.qty !== '1') {
        throw new Error(`a világ felépítése elakadt: a megvonás előtti visszaolvasás nem a várt eredményt adta → ${JSON.stringify(control)}`);
      }
      world.control_read = { ok: true, qty: control.result.qty, effect_id: control.effect_id };
    }
    return world;
  } finally {
    store.close();
  }
}

const count = (store, sql, ...p) => Number(store.get(sql, ...p).n);

// ═══ VISSZAOLVASÁS — nyers SQL, friss kapcsolat, CSAK olvasás ═══════════════════════════════════

function commonChecks(prefix, workers, parentPid, check) {
  const done = workers.every((w) => w.final && w.final.phase === 'done' && w.exit && w.exit.code === 0);
  check(`${prefix}01`, 'mindkét munkás lefutott, kivétel nélkül (phase=done, exit 0)', done,
    workers.map((w) => `${w.name}:${w.final ? w.final.phase : 'nincs kimenet'}/exit=${w.exit ? w.exit.code : '?'}${w.final && w.final.phase === 'crash' ? ` ${w.final.error}` : ''}`).join(' · '));
  check(`${prefix}02`, 'mindkét munkás a SAJÁT kapcsolatán journal_mode = wal',
    workers.every((w) => w.ready && w.ready.journal_mode === 'wal'),
    workers.map((w) => `${w.name}:${w.ready ? w.ready.journal_mode : '?'}`).join(' · '));
  const pids = new Set([parentPid, ...workers.map((w) => w.ready && w.ready.pid)]);
  check(`${prefix}03`, 'három különböző folyamat (szülő + 2 munkás), tehát három valódi kapcsolat',
    pids.size === 3 && [...pids].every((p) => Number.isInteger(p)), [...pids].join(' · '));
  return done;
}

function verifyRedeem(dbPath, workers, parentPid) {
  const store = openStoreAt(dbPath, { timeoutMs: BUSY_TIMEOUT_MS });
  const checks = [];
  const check = (id, what, ok, detail = '') => checks.push({ id, what, ok: Boolean(ok), detail });
  try {
    const done = commonChecks('RED', workers, parentPid, check);
    const results = workers.map((w) => (w.final && w.final.result) || null);
    const winners = workers.filter((w, i) => results[i] && results[i].ok === true);
    const losers = workers.filter((w, i) => !(results[i] && results[i].ok === true));
    check('RED04', 'PONTOSAN EGY beváltás sikeres', done && winners.length === 1,
      results.map((r, i) => `${workers[i].name}:${r ? (r.ok ? 'ok' : `${r.error}/${r.reason}`) : '—'}`).join(' · '));
    const loser = losers.length === 1 ? losers[0] : null;
    const loserResult = loser ? loser.final && loser.final.result : null;
    check('RED05', 'a vesztes NEVEZETT elutasítást kapott: invite_not_actionable / invite_already_redeemed (nem összeomlás)',
      loserResult && loserResult.ok === false && loserResult.error === 'invite_not_actionable' && loserResult.reason === 'invite_already_redeemed',
      loserResult ? JSON.stringify(loserResult) : '—');
    const mem = count(store, 'SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ?', WORLD.member, WORLD.book);
    check('RED06', 'a tag tagsági sora PONTOSAN 1 (membership)', mem === 1, `mért: ${mem}`);
    const grants = store.all('SELECT id FROM membership_grant WHERE subject_id = ? AND book_id = ? ORDER BY id', WORLD.member, WORLD.book);
    check('RED07', 'a tagságadó esemény PONTOSAN 1 (membership_grant)', grants.length === 1, `mért: ${grants.length}`);
    const gb = store.all('SELECT grant_event_id, token FROM grant_basis ORDER BY grant_event_id');
    check('RED08', 'grant_basis PONTOSAN 1, a meghívó tokenjével, a tag tagságadó eseményére mutatva',
      gb.length === 1 && gb[0].token === WORLD.token && grants.length === 1 && Number(gb[0].grant_event_id) === Number(grants[0].id),
      `mért: ${gb.length} sor${gb.length ? ` (token=${gb[0].token}, esemény=${gb[0].grant_event_id})` : ''}`);
    const inv = store.get('SELECT redeemed_at FROM invite WHERE token = ?', WORLD.token);
    check('RED09', 'a meghívó elfogyott (redeemed_at kitöltve) — egyszer', Boolean(inv && inv.redeemed_at), inv ? String(inv.redeemed_at) : '—');
    const totalMem = count(store, 'SELECT COUNT(*) AS n FROM membership');
    check('RED10', 'összesen 2 tagság (a létrehozó admin + a tag) — más sor nem született', totalMem === 2, `mért: ${totalMem}`);

    // A VERSENY TANÚJA — külön minősítés, nem invariáns: „nem versengett" ⇒ újrapróbálás.
    const loserSawOpen = Boolean(loser && loser.final && loser.final.observed_before && loser.final.observed_before.saw_open === true);
    const winner = winners[0] || null;
    const lt = loser && loser.final ? loser.final.trace : null;
    const wt = winner && winner.final ? winner.final.trace : null;
    // HÁROM NEVEZETT ALAK, folyamatközi időbélyeggel (tanú, nem invariáns):
    //   a zárra VÁRVA      — a vesztes BEGIN-je a nyertes COMMIT-ja ELŐTT lépett be, és utána tért vissza;
    //   várakozás nélkül   — a vesztes BEGIN-je a nyertes COMMIT-ja UTÁN lépett be: a változás a hívás
    //                        előtti megfigyelés és a BEGIN közé esett, és a tranzakción BELÜLI
    //                        újraolvasás fogta meg (a véglegesítési kapu, nem a zár);
    //   a tranzakció ELŐTT — a vesztes a tranzakción kívüli olvasásokon már a lezárt tényt látta.
    const enteredBeforeCommit = lt && lt.begin && wt && wt.commit ? lt.begin.t_enter < wt.commit.t : null;
    const stage = !(lt && lt.begin) ? 'before_transaction'
      : (enteredBeforeCommit ? 'inside_after_lock_wait' : 'inside_no_wait');
    const witness = {
      contended: loserSawOpen,
      winner: winner ? winner.name : null,
      loser: loser ? loser.name : null,
      loser_stage: loser ? stage : null,
      loser_begin_wait_ms: lt && lt.begin ? Number(lt.begin.wait_ms.toFixed(3)) : null,
      handoff_gap_ms: lt && lt.begin && wt && wt.commit ? Number((lt.begin.t_exit - wt.commit.t).toFixed(3)) : null,
      pids: workers.map((w) => `${w.name}=${w.ready ? w.ready.pid : '?'}`).join(' '),
      journal: workers.map((w) => (w.ready ? w.ready.journal_mode : '?')).join('/'),
    };
    return { checks, witness };
  } finally {
    store.close();
  }
}

function verifyRevoke(dbPath, workers, parentPid, world) {
  const store = openStoreAt(dbPath, { timeoutMs: BUSY_TIMEOUT_MS });
  const checks = [];
  const check = (id, what, ok, detail = '') => checks.push({ id, what, ok: Boolean(ok), detail });
  try {
    const done = commonChecks('REV', workers, parentPid, check);
    const revoker = workers.find((w) => w.role === 'revoke');
    const commander = workers.find((w) => w.role === 'command');
    const rr = revoker && revoker.final ? revoker.final.result : null;
    const cr = commander && commander.final ? commander.final.result : null;
    check('REV04', 'a megvonás sikeres (ok · changed · revocation_recorded)',
      rr && rr.ok === true && rr.changed === true && rr.reason === 'revocation_recorded', rr ? JSON.stringify(rr) : '—');
    const m = store.get('SELECT revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', WORLD.member, WORLD.book);
    const revEvents = store.all('SELECT recorded_at, effective_at, transition FROM membership_revocation WHERE subject_id = ? AND book_id = ? ORDER BY id', WORLD.member, WORLD.book);
    check('REV05', 'a tagság megvonva (revoked_at kitöltve) és PONTOSAN 1 megvonás-esemény',
      Boolean(m && m.revoked_at) && revEvents.length === 1, `revoked_at=${m ? m.revoked_at : '—'} · események: ${revEvents.length}`);

    // A SORREND A KIMENETBŐL, NEM AZ ÓRÁBÓL: a parancs vagy véglegesült, vagy `not_available`.
    let ordering = null;
    if (cr && cr.ok === true && cr.state === 'finalized') ordering = 'command_before_revoke';
    else if (cr && cr.ok === false && cr.error === 'not_available') ordering = 'revoke_before_command';
    check('REV06', 'a parancs kimenete a két ÉRVÉNYES alak egyike: véglegesült VAGY not_available (nevezett, nem összeomlás)',
      done && ordering !== null, cr ? JSON.stringify(cr) : '—');

    const raceCmd = store.all('SELECT effect_id, state, finalized_at FROM command WHERE book_id = ? AND actor = ? AND idem_key = ?', WORLD.book, WORLD.member, WORLD.raceKey);
    const raceEvt = count(store, 'SELECT COUNT(*) AS n FROM command_event WHERE book_id = ? AND actor = ? AND idem_key = ?', WORLD.book, WORLD.member, WORLD.raceKey);
    const moves = count(store, 'SELECT COUNT(*) AS n FROM stock_movement');
    if (ordering === 'revoke_before_command') {
      check('REV07', '[megvonás ELŐBB] parancs 0 · nyugta 0 · mozgás-sor 0 — a bukott parancs semmit nem hagyott maga után',
        raceCmd.length === 0 && raceEvt === 0 && moves === 0, `parancs=${raceCmd.length} nyugta=${raceEvt} mozgás=${moves}`);
    } else if (ordering === 'command_before_revoke') {
      const fin = raceCmd.length === 1 ? instantMs(raceCmd[0].finalized_at) : { ok: false };
      const rec = revEvents.length === 1 ? instantMs(revEvents[0].recorded_at) : { ok: false };
      const moveOfRace = raceCmd.length === 1
        ? count(store, 'SELECT COUNT(*) AS n FROM stock_movement WHERE effect_id = ?', raceCmd[0].effect_id) : 0;
      check('REV07', '[parancs ELŐBB] parancs 1 · nyugta 1 · mozgás-sor 1 (a parancs hatásával), és finalized_at ≤ a megvonás recorded_at',
        raceCmd.length === 1 && raceCmd[0].state === 'finalized' && raceEvt === 1 && moves === 1 && moveOfRace === 1
          && fin.ok && rec.ok && fin.ms <= rec.ms,
        `parancs=${raceCmd.length} nyugta=${raceEvt} mozgás=${moves} finalized_at=${raceCmd[0] ? raceCmd[0].finalized_at : '—'} megvonás=${revEvents[0] ? revEvents[0].recorded_at : '—'}`);
    } else {
      check('REV07', 'sorrend-függő sor-invariáns', false, 'a sorrend nem dönthető el (lásd REV06)');
    }

    // (3) A VISSZAJÁTSZÁS NEM KERÜLI MEG A MAI ADATJOGOT — friss kapcsolatról, a megvonás UTÁN.
    const clock = wallClock();
    const disclosuresBefore = count(store, 'SELECT COUNT(*) AS n FROM disclosure WHERE recipient = ?', WORLD.member);
    const cmdRowsBefore = count(store, 'SELECT COUNT(*) AS n FROM command');
    const evtRowsBefore = count(store, 'SELECT COUNT(*) AS n FROM command_event');
    const readRace = readCommandResult({ store, idemKey: WORLD.raceKey, requester: WORLD.member, bookId: WORLD.book, actor: WORLD.member, clock });
    check('REV08', 'a verseny-parancs visszaolvasása a megvonás után: not_available (akár véglegesült, akár nem)',
      readRace && readRace.ok === false && readRace.error === 'not_available' && readRace.result === null, JSON.stringify(readRace));
    const readPre = readCommandResult({ store, idemKey: WORLD.preKey, requester: WORLD.member, bookId: WORLD.book, actor: WORLD.member, clock });
    check('REV09', 'a megvonás ELŐTT véglegesített parancs (pre) visszaolvasása a megvonás UTÁN: not_available — a megvonás előtt ugyanez kiadta (ellenpár)',
      world.control_read && world.control_read.ok === true && world.control_read.qty === '1'
        && readPre && readPre.ok === false && readPre.error === 'not_available' && readPre.result === null,
      `előtte: ${JSON.stringify(world.control_read)} · utána: ${JSON.stringify(readPre)}`);
    const replay = submitCommand({
      store, idemKey: WORLD.preKey, actor: WORLD.member, bookId: WORLD.book,
      type: 'stock.receipt', typeVersion: '1', declared: { qty: '1' }, resolve: () => ({ qty: '1' }), clock,
    });
    const cmdRowsAfter = count(store, 'SELECT COUNT(*) AS n FROM command');
    const evtRowsAfter = count(store, 'SELECT COUNT(*) AS n FROM command_event');
    check('REV10', 'a kulcs ismétlése (submitCommand, azonos tartalom) a megvonás után: not_available, és NEM született új parancs- vagy nyugta-sor',
      replay && replay.ok === false && replay.error === 'not_available' && replay.effect_id === null
        && cmdRowsAfter === cmdRowsBefore && evtRowsAfter === evtRowsBefore,
      `${JSON.stringify(replay)} · parancs ${cmdRowsBefore}→${cmdRowsAfter} · nyugta ${evtRowsBefore}→${evtRowsAfter}`);
    const disclosuresAfter = count(store, 'SELECT COUNT(*) AS n FROM disclosure WHERE recipient = ?', WORLD.member);
    check('REV11', 'kiadási leltár: a megvonás után NULLA új kiadás a tagnak (csak a megvonás előtti ellenpár egy sora áll)',
      disclosuresBefore === 1 && disclosuresAfter === 1, `előtte=${disclosuresBefore} utána=${disclosuresAfter}`);
    const pre = store.get('SELECT state FROM command WHERE book_id = ? AND actor = ? AND idem_key = ?', WORLD.book, WORLD.member, WORLD.preKey);
    const preEvt = count(store, 'SELECT COUNT(*) AS n FROM command_event WHERE book_id = ? AND actor = ? AND idem_key = ?', WORLD.book, WORLD.member, WORLD.preKey);
    check('REV12', 'a pre parancs története érintetlen (finalized, 1 nyugta) — a múlt nem íródik át, csak a KIADÁS tilos',
      Boolean(pre) && pre.state === 'finalized' && preEvt === 1, `state=${pre ? pre.state : '—'} nyugta=${preEvt}`);

    // A VERSENY TANÚJA — külön minősítés: mindkét munkás NYITVA látta a versengő tényt a hívás előtt.
    const cSaw = Boolean(commander && commander.final && commander.final.observed_before && commander.final.observed_before.saw_open === true);
    const rSaw = Boolean(revoker && revoker.final && revoker.final.observed_before && revoker.final.observed_before.saw_open === true);
    const ct = commander && commander.final ? commander.final.trace : null;
    const rt = revoker && revoker.final ? revoker.final.trace : null;
    const refusals = count(store, 'SELECT COUNT(*) AS n FROM access_refusal WHERE subject_id = ? AND book_id = ? AND operation = ?', WORLD.member, WORLD.book, 'stock.receipt');
    let lossStage = null;
    if (ordering === 'revoke_before_command') {
      if (refusals > 0) lossStage = 'entry_gate';                 // authorizeBookAction — a lánc bejáratán
      else if (ct && ct.begin) lossStage = 'inside_transaction';  // a tranzakción belüli hatályosulási kapu
      else lossStage = 'inner_admission';                         // submitCommand tranzakción kívüli jog-kérdései
    }
    // KI VÁRT A ZÁRRA — folyamatközi időbélyeg (tanú, nem invariáns): a vesztes BEGIN-je a nyertes
    // COMMIT-ja ELŐTT lépett be ⇒ a zárra várt; UTÁN ⇒ várakozás nélkül, de a tranzakción belüli
    // újraolvasás már az AKTUÁLIS szabályt látta.
    const commandWaited = ordering === 'revoke_before_command' && ct && ct.begin && rt && rt.commit
      ? ct.begin.t_enter < rt.commit.t : null;
    const revokeWaited = ordering === 'command_before_revoke' && rt && rt.begin && ct && ct.commit
      ? rt.begin.t_enter < ct.commit.t : null;
    const witness = {
      contended: cSaw && rSaw,
      ordering,
      loss_stage: lossStage,
      command_waited_for_lock: commandWaited,
      revoke_waited_for_lock: revokeWaited,
      command_begin_wait_ms: ct && ct.begin ? Number(ct.begin.wait_ms.toFixed(3)) : null,
      revoke_begin_wait_ms: rt && rt.begin ? Number(rt.begin.wait_ms.toFixed(3)) : null,
      access_refusal_rows: refusals,
      pids: workers.map((w) => `${w.name}=${w.ready ? w.ready.pid : '?'}`).join(' '),
      journal: workers.map((w) => (w.ready ? w.ready.journal_mode : '?')).join('/'),
    };
    return { checks, witness };
  } finally {
    store.close();
  }
}

// ═══ EGY MENET ══════════════════════════════════════════════════════════════════════════════════

function cleanup(dbPath, goFile) {
  for (const p of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`, goFile]) {
    try { rmSync(p, { force: true }); } catch { /* takarítási hiba nem fedheti el a mérést */ }
  }
}

async function runAttempt(scenario, iteration, attempt, { keep }) {
  const rel = artifactPath({ area: 'tmp', kind: `multiconn_${scenario}_${iteration}_${attempt}`, ext: 'sqlite', version: VERSION });
  const dbPath = join(ROOT, rel);
  const goFile = `${dbPath}.go`;
  cleanup(dbPath, goFile);
  const record = { scenario, iteration, attempt, db: rel, verdict: null, reason: null, checks: [], witness: null, spawn_order: null };
  try {
    const world = buildWorld(dbPath, { redeemed: scenario === 'revoke' });
    let jobs;
    if (scenario === 'redeem') {
      jobs = [
        { name: 'A', role: 'redeem', dbPath, goFile, token: WORLD.token, actingSubjectId: WORLD.member },
        { name: 'B', role: 'redeem', dbPath, goFile, token: WORLD.token, actingSubjectId: WORLD.member },
      ];
    } else {
      jobs = [
        { name: 'A', role: 'revoke', dbPath, goFile, subjectId: WORLD.member, bookId: WORLD.book, actorSubjectId: WORLD.owner, raceKey: WORLD.raceKey },
        { name: 'B', role: 'command', dbPath, goFile, actor: WORLD.member, bookId: WORLD.book, ownerId: WORLD.owner, warehouseId: WORLD.warehouse, itemId: world.itemId, raceKey: WORLD.raceKey },
      ];
    }
    // A RAJT-SORREND VÁLTAKOZIK: páratlan menetben B indul előbb — így nem az indítás sorrendje
    // választja meg a nyertest, és mindkét sorrend esélyt kap (a mintavétel ne igazolja vissza önmagát).
    if (iteration % 2 === 0) jobs.reverse();
    // A MEGVONÁS-ÁG LÉPCSŐZTETÉSE (az R64 ellenséges felülvizsgálat H14 lelete): nyugodt gépen a
    // megvonás rövidebb útja MINDIG előbb ér célba, tehát a „parancs előbb" sorrend mérése elmaradt
    // volna. Páros menetekben a megvonó munkás a rajt UTÁN néhány ms-ot vár — ez a FIXTÚRA
    // időzítése (a rajt része), nem a mag viselkedése; a sor-invariánsok változatlanul mérve.
    if (scenario === 'revoke' && iteration % 2 === 0) {
      const rj = jobs.find((j) => j.role === 'revoke');
      // 1–5 ms; az újrapróbálásnál CSÖKKEN (a túl nagy lépcső mellett a parancs a megvonás előtt teljesen
      // lefut, és a menet nem versengett — mérve: +8 ms-tól már nem volt verseny).
      rj.delay_ms = Math.max(0, 1 + ((iteration / 2) % 5) - (attempt - 1) * 2);
    }
    record.spawn_order = jobs.map((j) => `${j.name}${j.delay_ms ? `(+${j.delay_ms}ms)` : ''}`).join('→');
    const workers = await runRace({ goFile, jobs });
    const v = scenario === 'redeem' ? verifyRedeem(dbPath, workers, process.pid) : verifyRevoke(dbPath, workers, process.pid, world);
    record.checks = v.checks;
    record.witness = v.witness;
    const failed = v.checks.filter((c) => !c.ok);
    if (failed.length) {
      // Összeomlás / időtúllépés / hiányzó kimenet = a mérés akadt el; sor-invariáns = a rendszer hibája.
      const measurement = failed.every((c) => /01$/.test(c.id));
      record.verdict = measurement ? 'elakadt' : 'hiba';
      record.reason = failed.map((c) => `${c.id} ${c.what} — ${c.detail}`).join(' | ');
    } else if (!v.witness.contended) {
      record.verdict = 'nem_versengett';
      record.reason = 'a vesztes már lezártnak látta a versengő tényt a hívás előtt — a menet nem hozott létre versenyt';
    } else {
      record.verdict = 'ok';
    }
  } catch (e) {
    record.verdict = 'elakadt';
    record.reason = String((e && e.message) || e);
  }
  if (!keep && record.verdict !== 'hiba') cleanup(dbPath, goFile);
  return record;
}

async function runScenario(scenario, iterations, opts) {
  const records = [];
  for (let i = 1; i <= iterations; i += 1) {
    let rec = null;
    for (let attempt = 1; attempt <= CONTENTION_ATTEMPTS; attempt += 1) {
      rec = await runAttempt(scenario, i, attempt, opts);
      if (rec.verdict !== 'nem_versengett') break;
    }
    records.push(rec);
    console.log(lineFor(rec));
  }
  return records;
}

// ═══ A LAP ═══════════════════════════════════════════════════════════════════════════════════════

const fmtMs = (v) => (v === null || v === undefined ? '—' : `${v} ms`);

function lineFor(r) {
  const tag = `[${r.scenario === 'redeem' ? 'beváltás' : 'megvonás'} #${String(r.iteration).padStart(2, '0')}]`;
  const verdict = { ok: 'OK', hiba: 'HIBA', elakadt: 'ELAKADT MÉRÉS', nem_versengett: 'NEM VERSENGETT' }[r.verdict];
  const w = r.witness || {};
  let detail;
  if (r.scenario === 'redeem') {
    const stage = {
      inside_after_lock_wait: `a tranzakción BELÜL bukott, a zárra várt ${fmtMs(w.loser_begin_wait_ms)}`,
      inside_no_wait: 'a tranzakción BELÜL bukott, várakozás nélkül — a belső újraolvasás fogta meg',
      before_transaction: 'a tranzakció ELŐTT bukott',
    }[w.loser_stage] || '?';
    detail = `nyertes=${w.winner ?? '?'} vesztes=${w.loser ?? '?'} (${stage})`;
  } else {
    const ord = w.ordering === 'revoke_before_command' ? 'megvonás ELŐBB' : (w.ordering === 'command_before_revoke' ? 'parancs ELŐBB' : '?');
    const stage = { entry_gate: 'bejárati kapu', inside_transaction: 'tranzakción belül', inner_admission: 'belső bebocsátás' }[w.loss_stage] || null;
    let waited = '';
    if (w.ordering === 'revoke_before_command' && w.command_waited_for_lock !== null && w.command_waited_for_lock !== undefined) {
      waited = w.command_waited_for_lock ? `, a zárra várt ${fmtMs(w.command_begin_wait_ms)}` : ', várakozás nélkül — a belső újraolvasás fogta meg';
    } else if (w.ordering === 'command_before_revoke' && w.revoke_waited_for_lock !== null && w.revoke_waited_for_lock !== undefined) {
      waited = w.revoke_waited_for_lock ? ` · a megvonás a zárra várt ${fmtMs(w.revoke_begin_wait_ms)}` : ' · a megvonás várakozás nélkül ért be';
    }
    detail = `${ord}${stage ? ` · a parancs itt bukott: ${stage}${waited}` : waited}`;
  }
  const attempts = r.attempt > 1 ? ` · ${r.attempt}. kísérlet` : '';
  const spawn = r.spawn_order ? ` · rajt ${r.spawn_order}` : '';
  const ids = w.pids ? ` · PID ${w.pids} · napló ${w.journal}` : '';
  return `  ${tag} ${verdict} · ${detail}${spawn}${ids}${attempts}${r.verdict !== 'ok' ? `\n      ↳ ${r.reason}` : ''}`;
}

function tally(records, pick) {
  const out = new Map();
  for (const r of records) { const k = pick(r); if (k === null || k === undefined) continue; out.set(k, (out.get(k) || 0) + 1); }
  return out;
}

function summary(redeem, revoke, iterations) {
  const line = (s) => console.log(s);
  const okOf = (rs) => rs.filter((r) => r.verdict === 'ok').length;
  const bar = '═'.repeat(96);
  line('');
  line(bar);
  line('MCN-01 — TÖBBKAPCSOLATOS VÉGLEGESÍTÉSI HATÁR (OB-1 · R63 §5.2 · §5.3/14) — VALÓDI, KÜLÖN FOLYAMATOK');
  line(bar);
  line(`Tároló: openStoreAt (WAL · BEGIN IMMEDIATE · foglalt-várakozás ${BUSY_TIMEOUT_MS} ms) · menetenként ÚJ fájl a var/tmp alatt · ${iterations} menet feladatonként`);
  line('');
  const rw = tally(redeem, (r) => r.witness && r.witness.winner);
  const rs = tally(redeem, (r) => r.witness && r.witness.loser_stage);
  const rAttempts = redeem.filter((r) => r.attempt > 1).length;
  line('(1) MEGHÍVÓ-BEVÁLTÁS VERSENYE — ugyanaz a lepecsételt meghívó, két kapcsolat, egyszerre');
  line(`    invariáns tartott (1 tagság · 1 tagságadó esemény · 1 grant_basis · a vesztes nevezett elutasítása): ${okOf(redeem)}/${redeem.length}`);
  line(`    nyertes: A ${rw.get('A') || 0} · B ${rw.get('B') || 0}`);
  line(`    a vesztes a TRANZAKCIÓN BELÜL bukott — a zárra várva (a BEGIN-je a nyertes COMMIT-ja előtt lépett be): ${rs.get('inside_after_lock_wait') || 0} · várakozás nélkül, a belső újraolvasás fogta meg: ${rs.get('inside_no_wait') || 0} · a tranzakció ELŐTT: ${rs.get('before_transaction') || 0}`);
  line(`    újrapróbált menet (nem versengett): ${rAttempts}`);
  line('');
  const vo = tally(revoke, (r) => r.witness && r.witness.ordering);
  const vs = tally(revoke, (r) => r.witness && r.witness.loss_stage);
  const vAttempts = revoke.filter((r) => r.attempt > 1).length;
  line('(2) MEGVONÁS ↔ VÉGLEGESÍTÉS — A: a kezelő megvon · B: ugyanaz a tag bevétet ad be (stock.receipt, qty \'1\', VALÓDI hatás)');
  line(`    invariáns tartott: ${okOf(revoke)}/${revoke.length}`);
  line(`    sorrend — megvonás ELŐBB (0 parancs · 0 nyugta · 0 mozgás-sor, not_available): ${vo.get('revoke_before_command') || 0} · parancs ELŐBB (1 · 1 · 1, utána a visszaolvasás elutasítva): ${vo.get('command_before_revoke') || 0}`);
  line(`    a bukott parancs itt állt meg — bejárati kapu: ${vs.get('entry_gate') || 0} · belső bebocsátás: ${vs.get('inner_admission') || 0} · tranzakción belül (hatályosulás): ${vs.get('inside_transaction') || 0}`);
  const cw = tally(revoke, (r) => r.witness && r.witness.command_waited_for_lock);
  const rvw = tally(revoke, (r) => r.witness && r.witness.revoke_waited_for_lock);
  line(`    zár-várakozás (folyamatközi időbélyeg, tanú): a parancs BEGIN-je a megvonás COMMIT-ja ELŐTT ${cw.get(true) || 0} · UTÁN ${cw.get(false) || 0} · a megvonás BEGIN-je a parancs COMMIT-ja ELŐTT ${rvw.get(true) || 0} · UTÁN ${rvw.get(false) || 0}`);
  line(`    újrapróbált menet (nem versengett): ${vAttempts}`);
  line('');
  const rep = (id) => revoke.filter((r) => r.checks.some((c) => c.id === id && c.ok)).length;
  line('(3) VISSZAJÁTSZÁS A MEGVONÁS UTÁN — a megvonás ELŐTT véglegesített `pre` parancson (előtte kiadva: ellenpár)');
  line(`    readCommandResult(pre) ⇒ not_available: ${rep('REV09')}/${revoke.length} · a kulcs ismétlése ⇒ not_available, új sor nélkül: ${rep('REV10')}/${revoke.length} · nulla új kiadás a leltárban: ${rep('REV11')}/${revoke.length} · a történet érintetlen: ${rep('REV12')}/${revoke.length}`);
  line('');
  const verdicts = tally([...redeem, ...revoke], (r) => r.verdict);
  line(`Menetek: OK ${verdicts.get('ok') || 0} · HIBA ${verdicts.get('hiba') || 0} · ELAKADT MÉRÉS ${verdicts.get('elakadt') || 0} · NEM VERSENGETT ${verdicts.get('nem_versengett') || 0}`);
  line('');
  line('AMIT EZ BIZONYÍT: két VALÓDI, külön folyamatban nyitott kapcsolat versenyén az egyszeri hatás és az aktuális szabály');
  line('  szerinti véglegesítés tartott, és a visszajátszás nem adta vissza a megvont jogot — menetenként, friss kapcsolatról mérve.');
  line('AMIT NEM BIZONYÍT (kimondva): nem Postgres, nem hálózati határ, nem kettőnél több író, nem terhelés; az OB-1 „Postgres');
  line('  vagy egyenértékű" zárófeltétele NEM teljesül ettől. A folyamatközi időbélyeg tanú, nem invariáns; a bukás helye a');
  line('  fogantyún látott BEGIN és az access_refusal sor alapján KÍVÜLRŐL besorolt. Egyírós közbeiktatás itt sehol nem szerepel.');
}

async function main() {
  const args = process.argv.slice(2);
  const nArg = args.find((a) => /^--n=\d+$/.test(a));
  const iterations = nArg ? Math.max(1, Number(nArg.slice(4))) : DEFAULT_ITERATIONS;
  const keep = args.includes('--keep');
  mkdirSync(join(ROOT, 'var', 'tmp'), { recursive: true });

  console.log(`MCN-01 — szülő PID ${process.pid} · Node ${process.version} · ${iterations} menet feladatonként (--n=<szám>) ${keep ? '· a fájlok megmaradnak (--keep)' : ''}`);
  console.log('(1) meghívó-beváltás versenye:');
  const redeem = await runScenario('redeem', iterations, { keep });
  console.log('(2)+(3) megvonás ↔ véglegesítés, majd visszajátszás:');
  const revoke = await runScenario('revoke', iterations, { keep });
  summary(redeem, revoke, iterations);
  const allOk = [...redeem, ...revoke].every((r) => r.verdict === 'ok');
  // MINDKÉT SORREND KÖTELEZŐ (az R64 ellenséges felülvizsgálat H14 lelete): ha a megvonás MINDIG
  // előbb ér célba, a „parancs előbb, utána a visszaolvasás elutasítva" ág mérése HIÁNYZIK, és a
  // zöld a saját gép ütemezését igazolná vissza (KUKA-054 · KUKA-093). Ilyenkor a mérés nem zöld,
  // hanem HIÁNYOS — nevezett kilépési kóddal.
  const orderings = new Set(revoke.filter((r) => r.witness && r.witness.ordering).map((r) => r.witness.ordering));
  const bothOrders = orderings.has('revoke_before_command') && orderings.has('command_before_revoke');
  if (allOk && !bothOrders) {
    console.log(`RESULT: HIÁNYOS MÉRÉS — minden menet OK, de a megvonás ↔ véglegesítés versenyben csak EGY sorrend fordult elő (${[...orderings].join(', ') || 'egyik sem'}); a másik ág mérése hiányzik — futtasd újra (--n=<több menet>)`);
    process.exit(3);
  }
  console.log(`RESULT: ${allOk ? 'PASS' : 'FAIL'} — ${redeem.length + revoke.length} menet, ${[...redeem, ...revoke].filter((r) => r.verdict === 'ok').length} OK${allOk ? ' · mindkét sorrend mérve' : ''}`);
  if (!allOk) console.log('A hibás menetek fájljai (verdict=HIBA) a var/tmp alatt maradnak a diagnózishoz.');
  process.exit(allOk ? 0 : 1);
}

if (process.argv[2] === '--worker') {
  runWorker(JSON.parse(process.argv[3]));
} else {
  main().catch((e) => { console.error(`ELAKADT MÉRÉS: ${(e && e.stack) || e}`); process.exit(1); });
}
