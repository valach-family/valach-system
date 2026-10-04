#!/usr/bin/env node
// V3 — SZINTETIKUS TESZTFIÓK A STAGINGHEZ (STA-01). `npm run staging:test-account`
//
// MIRE VALÓ. A telepített staging hozzáférés-védett, a fejlesztői levél-fogadó pedig KI van
// kapcsolva (és nyílt interneten nem is kapcsolható be). Így viszont nincs út, amin a bemutató
// bejelentkezne és végigjárna egy tartós műveletet. Ez az eszköz EZT az egy hiányt tölti be:
// a NORMÁL domain-utakon előállít egy KIMONDOTTAN SZINTETIKUS fiókot és munkakörnyezetet.
//
// ═══ AMIT NEM CSINÁL — ez a fontosabb fele ═══════════════════════════════════════════════════
//
//   · NEM kerüli meg a jogosultsági szabályokat. Ugyanazokat az írókat hívja, amiket a HTTP-héj
//     (`registerAccount` · `issueChannelChallenge` · `redeemChannelChallenge` ·
//     `provisionWorkspace`) — nincs nyers SQL, nincs „kis kivétel" a magban.
//   · NEM nyitja vissza a fejlesztői levél-fogadót. A csatorna bizonyítása úgy történik, hogy az
//     eszköz MAGA váltja be a kihívást — ugyanaz a művelet, amit a felhasználó a levélben lévő
//     hivatkozásra kattintva indít. Levél NEM megy ki, és a publikus szolgáltatáson semmi nem
//     nyílik ki.
//   · NEM küld külső levelet, és NEM vet éles mintaadatot.
//   · NEM állítja be magát VALÓDI, igazolt céges szereplőnek: a cím a szabvány szerint SOHA nem
//     kézbesíthető `.invalid` végződésű (RFC 2606), a megnevezés pedig kimondja, hogy próba.
//   · ÉRTÉKET NEM ÍR KI. A jelszót a futtató adja környezeti változóban; az eszköz vissza nem
//     olvassa és nem naplózza (ÁLLANDÓ: kulcs nem kerül chatbe, lapra, naplóba).
//
// ═══ A KAPU ══════════════════════════════════════════════════════════════════════════════════
//
// Két, egymástól FÜGGETLEN feltétel — egy elgépelés ne tudjon éles adatbázison fiókot nyitni
// (a D-VS-703 elve: ami véglegesít, ahhoz kapu kell):
//   1. `VS_APP_ENV=staging` — `production` esetén az eszköz MEGÁLL;
//   2. `--confirm <adatbázis-név>` — és a nevet a VALÓDI kapcsolatról olvassuk vissza
//      (`current_database()`), nem a kapcsolati szövegből.
//
// HASZNÁLAT (a Railway staging app konzoljáról, a szolgáltatás környezetében):
//
//   VS_TEST_ACCOUNT_PASSWORD='<az operátor választja>' \
//   npm run staging:test-account -- --confirm <adatbázis-név> [--label bemutato-1]
//
// A kimenet: a belépéshez használható E-MAIL CÍM és a munkakörnyezet neve. A jelszó NEM.
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRepoEnv } from './lib/vs_tool_env.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadRepoEnv(ROOT);
const { openPgStore } = await import('../v3ref/pgStore.mjs');
const { registerAccount, issueChannelChallenge, redeemChannelChallenge } = await import('../v3ref/account.mjs');
const { provisionWorkspace } = await import('../v3ref/workspace.mjs');

const argv = process.argv.slice(2);
const opt = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };

function stop(msg, code = 2) { console.error(`staging:test-account — ${msg}`); process.exit(code); }

// ── 1. KÖRNYEZET-KAPU ─────────────────────────────────────────────────────────────────────────
const env = String(process.env.VS_APP_ENV || '').trim().toLowerCase();
if (env !== 'staging') {
  stop(`CSAK stagingben futtatható. A mért környezet: "${env || '(nincs beállítva)'}". `
    + 'Éles vagy ismeretlen környezetben szintetikus fiókot nem nyitunk.');
}
const url = String(process.env.DATABASE_URL || '').trim();
if (!url) stop('nincs DATABASE_URL — az eszköz a szolgáltatás saját környezetében fut.');
const password = String(process.env.VS_TEST_ACCOUNT_PASSWORD || '');
if (password.length < 12) {
  stop('a VS_TEST_ACCOUNT_PASSWORD hiányzik vagy túl rövid (legalább 12 karakter). '
    + 'Az eszköz NEM talál ki jelszót, és nem is ír ki egyet sem.');
}

// ── 2. CÉL-KAPU: a nevet a VALÓDI kapcsolatról olvassuk vissza ────────────────────────────────
const confirm = opt('confirm');
if (typeof confirm !== 'string' || !confirm.trim()) {
  stop('hiányzik a `--confirm <adatbázis-név>`. A célt KI KELL MONDANI — a kapcsolati szöveget '
    + 'nem fogadjuk el önmagában.');
}
const store = openPgStore(url);
const actual = store.get('SELECT current_database() AS db').db;
if (actual !== confirm.trim()) {
  store.close();
  stop(`a megerősített név ("${confirm.trim()}") NEM egyezik a valódi kapcsolat adatbázisával `
    + `("${actual}"). Megálltam.`);
}

// ── 3. A SZINTETIKUS AZONOSSÁG — kimondottan nem valódi ───────────────────────────────────────
const label = String(opt('label', 'bemutato') || 'bemutato').replace(/[^a-z0-9-]/gi, '').slice(0, 24) || 'bemutato';
const run = randomBytes(4).toString('hex');
// `.invalid` — az RFC 2606 szerint SOHA nem létező felső szintű tartomány: erre a címre levél
// fogalmilag nem kézbesíthető. Ez nem óvatosság, hanem szerkezeti garancia.
const email = `proba-${label}-${run}@staging.valach.invalid`;
const subjectId = `sub_proba_${run}`;
const bookId = `ws_proba_${run}`;
const at = new Date().toISOString();
// A JELSZÓ NYERSEN MEGY A MAGNAK — a lenyomatot a `registerAccount` képzi (`hashCredential`),
// és a belépés ugyanazzal a feloldóval ellenőrzi. Az első alakom ELŐRE hasholt, és a belépés
// `credentials_rejected`-re futott: a hívó a mag szerződésén KÍVÜL dolgozott (KUKA-118). A
// nyers érték innen SEHOVÁ nem kerül ki — se naplóba, se kimenetre.

const out = { email, workspace: null, steps: [] };
const step = (name, r) => { out.steps.push({ name, ok: Boolean(r && r.ok), reason: r && r.reason }); return r; };

try {
  const reg = step('fiók létrehozása', registerAccount({ store, subjectId, email, secret: password, at }));
  if (!reg.ok) throw new Error(`a fiók nem jött létre: ${reg.reason}`);

  // A CSATORNA BIZONYÍTÁSA A NORMÁL ÚTON: kihívás kiadása, majd BEVÁLTÁSA. Ez ugyanaz a két
  // művelet, ami egy valódi felhasználónál a levél kiküldése és a hivatkozásra kattintás —
  // csak a levél marad el. A `redeemChannelChallenge` ugyanazt a kaput futtatja.
  const token = randomBytes(24).toString('hex');
  const ch = step('csatorna-kihívás kiadása', issueChannelChallenge({ store, subjectId, value: email, token, at }));
  if (!ch.ok) throw new Error(`a kihívás nem jött létre: ${ch.reason}`);
  const pr = step('csatorna bizonyítása (a levél helyett az eszköz váltja be)',
    redeemChannelChallenge({ store, token, at: new Date().toISOString() }));
  if (!pr.ok) throw new Error(`a csatorna nem bizonyítható: ${pr.reason}`);

  const ws = step('munkakörnyezet indítása', provisionWorkspace({
    store, creatorSubjectId: subjectId, bookId,
    // A NÉV KIMONDJA, HOGY PRÓBA — a képernyőn is ez látszik, nem egy valódinak tűnő cégnév.
    name: `PRÓBA — ${label} (szintetikus, nem valódi cég)`,
    at: new Date().toISOString(), plan: 'pro',
    // A VÁLLALKOZÁSI MINŐSÉG ALAKJA UGYANAZ, AMIT A HÉJ ÁTAD (`namespace`/`jurisdiction`/
    // `valueRaw`) — nem egy kényelmi rövidítés. Az első alakom a HTTP-kérés mezőneveit adta át
    // a magnak, és `unknown_namespace`-re futott: a héj NORMALIZÁL, mielőtt hív. Aki a magot
    // közvetlenül hívja, annak ezt a normalizálást is el kell végeznie (KUKA-118: a mag
    // szerződése kész volt, a hívó nem adta át).
    business: { namespace: 'tax_id', jurisdiction: 'HU', valueRaw: '12345678-2-42' },
  }));
  if (!ws.ok) throw new Error(`a munkakörnyezet nem jött létre: ${ws.reason}`);
  out.workspace = `PRÓBA — ${label} (szintetikus, nem valódi cég)`;
} catch (e) {
  console.error('');
  console.error('A SZINTETIKUS FIÓK NEM KÉSZÜLT EL.');
  for (const s of out.steps) console.error(`  ${s.ok ? 'kész ' : 'NEM  '} ${s.name}${s.reason ? ` — ${s.reason}` : ''}`);
  console.error(`  ok: ${e.message}`);
  store.close();
  process.exit(1);
}
store.close();

console.log('');
console.log('SZINTETIKUS TESZTFIÓK — KÉSZ'.padEnd(70, ' '));
console.log('='.repeat(70));
for (const s of out.steps) console.log(`  kész  ${s.name}`);
console.log('');
console.log(`  BELÉPÉSI CÍM:        ${out.email}`);
console.log(`  MUNKAKÖRNYEZET:      ${out.workspace}`);
console.log('  JELSZÓ:              amit a VS_TEST_ACCOUNT_PASSWORD-ben megadtál');
console.log('                       (az eszköz NEM írja ki és nem naplózza)');
console.log('');
console.log('  A cím `.invalid` végű: erre levél fogalmilag nem kézbesíthető (RFC 2606).');
console.log('  A fiók a NORMÁL domain-utakon született — jogosultsági kivétel nincs mögötte.');
