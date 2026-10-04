#!/usr/bin/env node
// V3 — TÁROLÓ-PARITÁS ÉLŐ BIZONYÍTÉKA (PAR-01). `npm run proof:pg-parity`
//
// MIT BIZONYÍT. UGYANAZT a felhasználói utat végigviszi KÉTSZER — egyszer a referencia
// SQLite-tárolón, egyszer VALÓDI PostgreSQL-en —, és a két kimenetet ÖSSZEMÉRI. Ha a
// tárolóváltás bárhol más viselkedést okozna, az itt ELTÉRÉSKÉNT jelenik meg, nem egy hónap
// múlva egy éles képernyőn.
//
// MIÉRT ÍGY, ÉS NEM „a PG-n lefutott, tehát jó". Mert a „lefutott" nem mérce: egy néma eltérés
// (más sorrend, más típus, más hibaág) ugyanúgy „lefut". A mérce a KÉT kimenet EGYEZÉSE — ez az
// egyetlen alak, ami a RÉGI viselkedést bizonyítottan megőrzi (KUKA-033: a minősítés MÉRÉS).
//
// A MÉRÉS SZAVAI (D-VS-693). Három, soha össze nem mosott kimenet:
//   ELTÉRÉS           — a két tároló MÁST adott; ez LELET.
//   ELAKADT MÉRÉS     — a próba maga bukott el; a rendszerről NEM tudunk semmit.
//   nincs alkalmazható eset — a lépés ezen a tárolón fogalmilag nem értelmezhető.
// Az ALAPSOKASÁG (hány lépést mértünk) minden esetben kiíródik: a nulla eltérés csak akkor
// bizonyíték, ha mellette ott a megmért lépések száma.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rmSync } from 'node:fs';
import { loadRepoEnv } from './lib/vs_tool_env.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadRepoEnv(ROOT);

const { startServer } = await import('../v3app/server.mjs');

class Client {
  constructor(base, name) { this.base = base; this.name = name; this.cookie = null; }
  async call(method, path, body) {
    const headers = { 'content-type': 'application/json' };
    if (this.cookie) headers.cookie = this.cookie;
    const res = await fetch(this.base + path, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    });
    const sc = res.headers.get('set-cookie');
    if (sc) this.cookie = sc.split(';')[0];
    const ct = res.headers.get('content-type') || '';
    return { status: res.status, body: ct.includes('application/json') ? await res.json() : await res.text() };
  }
  get(p) { return this.call('GET', p); }
  post(p, b) { return this.call('POST', p, b ?? {}); }
}

/**
 * A FORGATÓKÖNYV. Minden lépés egy NEVET és egy ÖSSZEMÉRHETŐ kimenetet ad. A kimenetbe
 * SZÁNDÉKOSAN nem kerül azonosító, token vagy időbélyeg: azok tárolónként különböznek (más
 * véletlen, más óra), és a KÜLÖNBÖZŐSÉGÜK nem lelet. Amit mérünk: az ÁLLAPOT és az OK.
 */
async function journey(base, mark) {
  const out = [];
  const step = (name, value) => out.push({ name, value });
  const anna = new Client(base, 'anna');
  const bela = new Client(base, 'bela');

  const mails = async () => (await anna.get('/dev/mailbox')).body.mails;
  // A CÍM ÖSSZEHASONLÍTÁSA KISBETŰS. A rendszer a címet normalizálja (`annaS@…` → `annas@…`),
  // ezért a szigorú egyenlőség a PRÓBÁN bukott el, nem a rendszeren — és a próba ettől NÉMÁN
  // sekély lett: a 18 „egyező" lépés 18 EGYFORMÁN ELBUKOTT lépés volt. Ez a saját mérőm hibája
  // (KUKA-127 · KUKA-120: a kivágott próbapad a saját versenyhelyzetét mérte, és az üres
  // eredményt helyesnek látta).
  const linkFor = async (to, part) => {
    const want = String(to).toLowerCase();
    const m = (await mails()).find((x) => String(x.to).toLowerCase() === want && x.subject.includes(part));
    return m ? m.link : null;
  };
  const signUp = async (c, email, pw) => {
    const reg = await c.post('/api/register', { email, password: pw });
    const link = await linkFor(email, 'Erősítsd meg');
    // A MEGERŐSÍTŐ HIVATKOZÁS VÁLASZÁT IS RÖGZÍTJÜK (R152 tanulsága a SAJÁT mérőmön).
    //
    // Az előző alak csak azt nézte, LÉTEZIK-E a hivatkozás (`verified: Boolean(link)`), a
    // VÁLASZT eldobta. Emiatt a mérő NEM vette észre, hogy a `/api/verify` PostgreSQL-en
    // 500-at adott — a lánc attól még továbbment, a belépés sikerült, és a paritás „0 eltérést"
    // mutatott. Egy nem rögzített válasz nem mérés (KUKA-215: a választ MEG KELL MÉRNI).
    let verifyStatus = null;
    if (link) { const u = new URL(link); verifyStatus = (await c.get(u.pathname + u.search)).status; }
    const r = await c.post('/api/login', { email, password: pw });
    return {
      reg_status: reg.status, reg_ok: reg.body?.ok,
      verify_status: verifyStatus,
      login_ok: r.body?.ok, has_subject: Boolean(r.body?.subject_id),
    };
  };

  // ── 1. FIÓK ÉS CSATORNA ────────────────────────────────────────────────────────────────────
  step('register+verify+login (anna)', await signUp(anna, `anna${mark}@parity.hu`, 'anna-titok-1'));
  // ANTI-ENUMERÁCIÓ: a MÁSODSZORI regisztráció válasza UGYANAZ a semleges mondat.
  const dup = await anna.post('/api/register', { email: `anna${mark}@parity.hu`, password: 'masik-jelszo-9' });
  step('register again is neutral', { status: dup.status, ok: dup.body?.ok, message: dup.body?.message });
  const badLogin = await new Client(base, 'x').post('/api/login', { email: `anna${mark}@parity.hu`, password: 'rossz' });
  step('login with wrong password', { status: badLogin.status, ok: badLogin.body?.ok, reason: badLogin.body?.reason });

  // ── 2. MUNKATÉR (indulási alap · személyes kör · tagság) ───────────────────────────────────
  const ws = await anna.post('/api/workspaces', { name: 'Paritas Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '12345678-2-42' } });
  step('create workspace', { status: ws.status, ok: ws.body?.ok, reason: ws.body?.reason, has_book: Boolean(ws.body?.book_id) });
  const me = await anna.get('/api/me');
  step('me after workspace', { status: me.status, ok: me.body?.ok, workspaces: (me.body?.workspaces || []).length, plan: me.body?.current_plan });

  // ── 3. MEGHÍVÓ (a PECSÉTELŐ trigger és a kiadott feltétel) ─────────────────────────────────
  const inv = await anna.post('/api/invites', { email: `bela${mark}@parity.hu`, role: 'user', scope: 'keszlet' });
  step('issue invite', { status: inv.status, ok: inv.body?.ok, reason: inv.body?.reason, has_token: Boolean(inv.body?.token) });
  const token = inv.body?.token;
  step('signup invitee', await signUp(bela, `bela${mark}@parity.hu`, 'bela-titok-1'));
  if (token) {
    await bela.post('/api/invites/pending', { token });
    const red = await bela.post('/api/invites/redeem', { token });
    step('redeem invite', { status: red.status, ok: red.body?.ok, reason: red.body?.reason, shape: red.body?.shape });
    // UGYANAZT A MEGHÍVÓT MÁSODSZOR — az EGYSZERISÉG próbája a HTTP-határon.
    const again = await bela.post('/api/invites/redeem', { token });
    step('redeem the SAME invite again', { status: again.status, ok: again.body?.ok, reason: again.body?.reason });
  } else step('redeem invite', 'nincs alkalmazható eset (nem született token)');

  const members = await anna.get('/api/members');
  step('members after redeem', { status: members.status, ok: members.body?.ok, n: (members.body?.members || []).length });

  // ── 4. JOGOSULTSÁG ÉS ADATKÖR (a hatáskör regressziója) ────────────────────────────────────
  const belaStock = await bela.get('/api/data/stock');
  step('invitee reads granted scope (keszlet)', { status: belaStock.status, ok: belaStock.body?.ok, reason: belaStock.body?.reason });
  const belaPrice = await bela.get('/api/data/price');
  step('invitee reads NOT granted scope (arak)', { status: belaPrice.status, ok: belaPrice.body?.ok, reason: belaPrice.body?.reason });
  const grant = await anna.post('/api/members/scope', { subject_id: (members.body?.members || []).find((x) => x.role !== 'owner')?.subject_id, scope: 'arak' });
  step('owner grants scope arak', { status: grant.status, ok: grant.body?.ok, reason: grant.body?.reason });
  const belaPrice2 = await bela.get('/api/data/price');
  step('invitee reads arak AFTER grant', { status: belaPrice2.status, ok: belaPrice2.body?.ok, reason: belaPrice2.body?.reason });
  const rev = await anna.post('/api/members/scope/revoke', { subject_id: (members.body?.members || []).find((x) => x.role !== 'owner')?.subject_id, scope: 'arak' });
  step('owner revokes scope arak', { status: rev.status, ok: rev.body?.ok, reason: rev.body?.reason });
  const belaPrice3 = await bela.get('/api/data/price');
  step('invitee reads arak AFTER revoke', { status: belaPrice3.status, ok: belaPrice3.body?.ok, reason: belaPrice3.body?.reason });

  // ── 5. A KLIENS NEM ADHAT MAGÁNAK JOGOT (a héj szerződése) ─────────────────────────────────
  const spoof = await bela.get('/api/data/price?book_id=akarmi&actor=anna&role=owner');
  step('client-supplied authority params ignored', { status: spoof.status, ok: spoof.body?.ok, reason: spoof.body?.reason, param_ignored: spoof.body?.param_ignored });

  // ── 6. MEGVONÁS ────────────────────────────────────────────────────────────────────────────
  const memberId = (members.body?.members || []).find((x) => x.role !== 'owner')?.subject_id;
  const revoke = await anna.post('/api/members/revoke', { subject_id: memberId });
  step('revoke membership', { status: revoke.status, ok: revoke.body?.ok, reason: revoke.body?.reason });
  const afterRevoke = await bela.get('/api/data/stock');
  step('revoked member reads stock', { status: afterRevoke.status, ok: afterRevoke.body?.ok, reason: afterRevoke.body?.reason });

  return out;
}

// ── A KÉT FUTÁS ÖSSZEMÉRÉSE ────────────────────────────────────────────────────────────────────
const sqlitePath = resolve(ROOT, 'var/tmp/parity_sqlite.sqlite');
try { rmSync(sqlitePath, { force: true }); rmSync(`${sqlitePath}-wal`, { force: true }); rmSync(`${sqlitePath}-shm`, { force: true }); } catch { /* nincs mit törölni */ }

const url = String(process.env.DATABASE_URL || '').trim();
if (!url) {
  console.error('proof:pg-parity — nincs DATABASE_URL: a PostgreSQL-oldal NEM mérhető.');
  console.error('  Ez ELAKADT MÉRÉS, nem zöld: a paritásról így semmit nem állítunk.');
  process.exit(2);
}

console.log('TÁROLÓ-PARITÁS — ugyanaz az út, két tárolón');
console.log('='.repeat(78));

// A FUTÁS-JELÖLŐ EGYEDI (PAR-02). Az első alak rögzített jelölőt használt ('sq'/'pg'), ezért a
// MÁSODIK futás ugyanazokra a címekre regisztrált volna — a rendszer (helyesen) semleges választ
// ad egy foglalt címre, a lánc pedig a csatorna-bizonyításnál elakadt. A próba így NEM volt
// ismételhető ugyanazon az adatbázison, és a lefedés-kapu ezt KI IS MONDTA (ez a kapu dolga).
// A jelölő mostantól futásonként egyedi — a mérés nem a tároló múltjától függ (KUKA-134).
const RUN = Date.now().toString(36);
const sqliteApp = await startServer({ port: 0, host: '127.0.0.1', dbPath: sqlitePath, devSurface: true });
const pgApp = await startServer({ port: 0, host: '127.0.0.1', devSurface: true });
if (pgApp.store.dialect !== 'postgres') {
  console.error('  ELAKADT MÉRÉS: a második példány NEM PostgreSQL-en fut — nincs mit összemérni.');
  process.exit(2);
}

let a; let b;
try {
  a = await journey(`http://127.0.0.1:${sqliteApp.port}`, `sq${RUN}`);
  b = await journey(`http://127.0.0.1:${pgApp.port}`, `pg${RUN}`);
} catch (e) {
  console.error(`  ELAKADT MÉRÉS: ${e.message}`);
  await sqliteApp.close(); await pgApp.close();
  process.exit(2);
}

// A LEFEDÉS KAPUJA (KUKA-216: a verdikt nem mutathat a mérés hatókörén túl). Ha az út KORÁN
// elakad, a „0 eltérés" igaz, de SEMMIT nem bizonyít a tárolóváltásról — két egyforma kudarc is
// egyezik. Ezért a próba megköveteli, hogy a lánc KULCS-LÉPÉSEI tényleg sikerüljenek.
const REQUIRED_OK = Object.freeze([
  ['register+verify+login (anna)', (v) => v && v.verify_status === 200 && v.login_ok === true],
  ['create workspace', (v) => v && v.ok === true && v.has_book === true],
  ['issue invite', (v) => v && v.ok === true && v.has_token === true],
  ['redeem invite', (v) => v && v.ok === true],
  ['members after redeem', (v) => v && v.n >= 2],
]);
const coverage = [];
for (const [name, pred] of REQUIRED_OK) {
  const hit = b.find((x) => x.name === name);
  coverage.push({ name, ok: Boolean(hit && pred(hit.value)), value: hit ? hit.value : null });
}

const diffs = [];
for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
  const x = a[i]; const y = b[i];
  if (!x || !y) { diffs.push({ name: (x || y).name, sqlite: x?.value, postgres: y?.value }); continue; }
  const sx = JSON.stringify(x.value); const sy = JSON.stringify(y.value);
  // A KIMENET IS LÁTSZIK, NEM CSAK AZ EGYEZÉS. Két EGYFORMÁN ELBUKOTT lépés is „egyezik" —
  // a paritás önmagában tehát nem mond semmit a LEFEDÉSRŐL (KUKA-127: a piros/zöld mellett a
  // mérés HARMADIK szava az, hogy MIT mértünk). Ezért a vizsgált érték kiíródik.
  console.log(`  ${sx === sy ? '=' : '≠'} ${x.name.padEnd(42)} ${sx.slice(0, 150)}`);
  if (sx !== sy) diffs.push({ name: x.name, sqlite: x.value, postgres: y.value });
}

console.log('='.repeat(78));
const shallow = coverage.filter((c) => !c.ok);
console.log('LEFEDÉS — a lánc kulcs-lépései VALÓBAN sikerültek-e a PostgreSQL-oldalon:');
for (const c of coverage) console.log(`  ${c.ok ? 'OK ' : 'NEM'} ${c.name}${c.ok ? '' : `  → ${JSON.stringify(c.value)}`}`);
console.log(`ALAPSOKASÁG: ${a.length} mért lépés mindkét tárolón.`);
if (diffs.length === 0) {
  console.log('ELTÉRÉS: 0 — a két tároló ugyanazt a viselkedést adta a mért lépéseken.');
} else {
  console.log(`ELTÉRÉS: ${diffs.length} — LELET:`);
  for (const d of diffs) {
    console.log(`  · ${d.name}`);
    console.log(`      SQLite:     ${JSON.stringify(d.sqlite)}`);
    console.log(`      PostgreSQL: ${JSON.stringify(d.postgres)}`);
  }
}
await sqliteApp.close(); await pgApp.close();
if (shallow.length) {
  console.log(`\nA MÉRÉS SEKÉLY: ${shallow.length} kulcs-lépés nem futott végig — a „0 eltérés" ezekre `
    + 'NEM bizonyíték (két egyforma kudarc is egyezik).');
  process.exit(4);
}
process.exit(diffs.length === 0 ? 0 : 3);
