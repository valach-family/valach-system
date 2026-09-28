#!/usr/bin/env node
// Valach System — TELJES VERIFIER-SÖPRÉS EGY PARANCSBAN (a V2-ből átjött, D-VS-406).
//
// MIÉRT: a kör-végi ellenőrzés eddig a CÉL-verifiereket futtatta, és két szomszéd-pin (PRV06, SS11)
// három körön át némán piroslott — a battéria csak ott zöld, ahol nézik. Ez a futtató MINDEN verify:*
// scriptet lefuttat; a DB-t kívánó ellenőrzések DATABASE_URL nélkül NEVESÍTETT env-kihagyást kapnak
// (nem néma zöldet és nem hamis pirosat — a KUKA-012 némaság-elve a söprésre alkalmazva).
//
// Használat: npm run verify:sweep  (minden kör vége előtt — agent-fegyelem, CLAUDE.md ÁLLANDÓK)

import { readFileSync } from 'node:fs';
// CHR-01 (F95-02, R97): a gyermek SAJÁT folyamatcsoportban indul, és a lezárása IGAZOLT — az
// `execSync` időtúllépése csak a KÖZVETLEN gyermeknek küldött jelet, az unokák életben maradtak, és a
// gép a KÖVETKEZŐ ellenőrzés alatt is terhelt volt (chatgpt-v3 mérése, R95 §F95-02).
// SHD-01/F101-01 (R103): a MEGSZAKÍTÁS a sorozat MÁSODIK megállási oka — külön szóval, és a
// jelentés MEGVÁRJA a rendezett lezárást, hogy a kimaradó tételek ne némán vesszenek el.
import { runGuarded, PLATFORM_LIMIT, interruptState, shutdownSettled } from './lib/vs_child_runner.mjs';
import { runSequence } from './lib/vs_sweep_sequence.mjs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
// SWV-01 (OB-10, R16 §2): a verdikt a gyermek GÉPI deklarációjából dől el, nem részszövegből.
import { sweepVerdict } from './lib/vs_sweep_verdict.mjs';
// SRU-01 (R69 F69-01): a kihagyás döntése a KÖZÖS feloldóé — a söprés hívja, nem maga méri.
import { assessReuse, reuseLine } from './lib/vs_sweep_reuse.mjs';

// CÉLZOTT SÖPRÉS (R67 F67-03 → R69 F69-01): a több-tízperces láncok NEVESÍTETT kihagyása — de a kihagyás
// CSAK akkor „ÚJRAHASZNÁLT BIZONYÍTÉK", ha a feloldó (SRU-01, `tools/lib/vs_sweep_reuse.mjs`) mind a négy
// feltételt MÉRTE: feloldott commit · zöld, tiszta bizonyíték a commitban · a lánc bemenete a MUNKAFÁN
// (munkafa + index + követetlen) azonos a bizonyíték forrásával · lánc-szkriptek, függőségek, futtató azonosak.
//   npm run verify:sweep -- --skip verify:external-checks,verify:v3ref --reuse <commit>
// Ha bármelyik hiányzik: „NEM FUTOTT — NEM IGAZOLT", az összverdikt NEM zöld (kilépés 1), és a láncot a
// söprés NEM indítja el magától — a sor megmondja, mit kell külön futtatni. (Az R68-as alak két COMMITOT
// hasonlított és a bizonyítékot meg sem nézte — módosított munkafán, bukott bizonyíték mellett is „érvényes"-t
// írt: KUKA-200.) A mag-battéria olcsó fele (a próbák) újrahasználat mellett is lefut (`cheap_part`).
const argv = process.argv.slice(2);
const argOf = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
// `--root` CSAK a szintetikus próbának (verify:sweep-reuse): a söprést egy másik repó-gyökéren futtatja.
const ROOT = argOf('--root') ? resolve(argOf('--root')) : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const allScripts = Object.keys(pkg.scripts || {})
  .filter((s) => s.startsWith('verify:') && s !== 'verify:sweep')
  .sort();
const skipReq = String(argOf('--skip') || '').split(',').map((x) => x.trim()).filter(Boolean);
const reuse = argOf('--reuse');
const reused = []; const unverified = [];
for (const s of skipReq) {
  const a = assessReuse({ root: ROOT, chain: s, reuseRef: reuse === null ? '' : reuse });
  (a.status === 'reused' ? reused : unverified).push(a);
}
// A kihagyott lánc SEMELYIK ágon nem indul a söprésből (R69: az elutasítás nem indíthat húszperces láncot).
const scripts = allScripts.filter((s) => !skipReq.includes(s));
const cheapParts = reused.filter((a) => a.cheap_part).map((a) => ({ s: `${a.chain} (olcsó fele: ${a.cheap_part})`, cmd: a.cheap_part }));

// A SÖPRÉS TÜRELME NEM MÉRCE (a SAJÁT söprésem lelete, R81). A régi 180 000 ms a `verify:external-
// checks` láncát PONT akkor vágta el, amikor az R81-es programokkal ~200 mp-re nőtt — és a
// kivágást a söprés PIROSNAK jelentette, holott a verifier külön futtatva NULLÁVAL zárt. Két külön
// dolog csúszott egy csatornára (KUKA-002): „a verifier ELBUKOTT" és „a söprés nem várta meg".
// Ezért (1) a türelem akkora, hogy a leghosszabb lánc kétszerese beleférjen, és (2) a KIVÁGÁS
// SAJÁT, nevezett válasz — nem piros, hanem „NEM FEJEZŐDÖTT BE", a futási idővel együtt, hogy
// látszódjon, mennyivel nőtt túl (KUKA-124/2 · KUKA-064: a nemleges válasz mondja meg a teendőt).
const PATIENCE_MS = 900000;
// A TÜRELMI IDŐ A SZABÁLYOS LEÁLLÍTÁSNAK (F95-02): ennyit várunk a SIGTERM után, mielőtt a csoport
// kényszerleállítást kap. Nem küszöb-emelés: a türelem VÉGES, és a végén IGAZOLT üresség áll.
const GRACE_MS = 5000;
const t0 = Date.now();
let pass = 0;
const envSkips = [];
const timedOut = [];
const fails = [];
const runs = [...scripts.map((s) => ({ s, cmd: `npm run -s ${s}` })), ...cheapParts];
const leftovers = [];
// A SORRENDET A KÖZÖS VEZÉRLŐ BIRTOKOLJA (SEQ-01, F98-01/A): igazolatlan lezárás után a KÖVETKEZŐ
// ellenőrzés NEM indul el. A régi alak a maradványt csak FELJEGYEZTE, és futott tovább — a következő
// mérés egy olyan gépen zajlott, amelyen az előző fa lezárása nem volt igazolt. A vezérlés azért él
// külön fájlban, hogy a próba a TÉNYLEGES utat hívhassa, ne a másolatát (KUKA-207).
const seq = await runSequence(runs, {
  run: ({ cmd }) => runGuarded(cmd, { cwd: ROOT, timeoutMs: PATIENCE_MS, graceMs: GRACE_MS, verifyMs: GRACE_MS }),
  onResult: ({ item, result: r, ms, cleanup_state: state, cleanup_why: why, cleanup_steps: steps }) => {
    const { s } = item;
    const exitCode = r.exitCode;
    const killed = r.timedOut;
    // A GYERMEK GÉPI DEKLARÁCIÓJA a kimenetén jön (SWV-01), a hibacsatorna a jelentéshez kell.
    const out = r.timedOut || exitCode !== 0 ? r.output : r.stdout;
    // A LEZÁRÁS ÁLLAPOTA KÜLÖN TÉNY a feladat eredményétől: ezt akkor is ki kell írni, ha a verifier
    // egyébként zöld volt (KUKA-012 · F95-02).
    if (state !== 'igazolt') leftovers.push({ s, state, verdict: why, steps });
    // A DÖNTÉST A KÖZÖS FELOLDÓ HOZZA (SWV-01). A régi alak itt, helyben keresett részszöveget: ha a
    // bukott gyermek kimenetében BÁRHOL szerepelt az „ENV-KIHAGYÁS", az EGÉSZ ellenőrző kihagyássá
    // vált — és a `verify:external-checks` SAJÁT, szabályos jelentése épp ezt a szót tartalmazza.
    // Hiba és kihagyás együtt nem lehet tiszta kihagyás (OB-10).
    const v = sweepVerdict({ exitCode, timedOut: killed, stdout: out });
    if (v.verdict === 'green') { pass += 1; return; }
    if (v.verdict === 'unfinished') { timedOut.push({ s, ms }); return; }
    if (v.verdict === 'env_skipped') { envSkips.push({ s, reason: v.reason }); return; }
    fails.push(s);
    console.error(`\n=== PIROS: ${s} === (${v.why})`);
    console.error(String(out).trim().split('\n').slice(-12).join('\n'));
  },
  // AZONNAL LÁTHATÓ: a megállás a pillanatában kiíródik, nem a futás végén (R98 előírása).
  onHalt: (h) => {
    // A MEGÁLLÁSNAK KÉT OKA LEHET, ÉS A KETTŐ NEM UGYANAZ (KUKA-002): igazolatlan LEZÁRÁS vagy
    // MEGSZAKÍTÁS. Megszakításnál az `after` üres is lehet (a jel az első feladat ELŐTT érkezett).
    const utana = h.after ? `${h.after.s} után` : 'az első ellenőrzés előtt';
    if (h.kind === 'megszakitas') {
      console.error(`\n=== A SOROZAT MEGÁLL: MEGSZAKÍTÁS (${h.signal}) — ${utana}`);
      console.error('  A leállítás alatt új ellenőrzés nem indul. Ami nem futott le, az NEM zöld és nem kihagyás.');
      return;
    }
    console.error(`\n=== A SOROZAT MEGÁLL: ${utana} a lezárás ${h.state === 'maradvany' ? 'MARADVÁNYT hagyott' : 'NEM IGAZOLHATÓ'} (${h.why})`);
    for (const st of h.steps || []) console.error(`  · ${st}`);
    console.error('  A következő ellenőrzés egy terhelt/ismeretlen állapotú gépen mérne — ezért nem indul el.');
  },
});
const notStarted = seq.notStarted;

const secs = Math.round((Date.now() - t0) / 1000);
console.log(`\nSÖPRÉS (${runs.length} verifier${reused.length ? ` + ${reused.length} újrahasznált bizonyíték` : ''}${unverified.length ? ` + ${unverified.length} NEM IGAZOLT kihagyás` : ''}, ${secs}s): ${pass} zöld · ${envSkips.length} env-kihagyás`
  + `${timedOut.length ? ` · ${timedOut.length} NEM FEJEZŐDÖTT BE` : ''} · ${fails.length} piros`
  + `${notStarted.length ? ` · ${notStarted.length} NEM INDULT` : ''}`);
// A SZÁM NEM MOSHATJA ÖSSZE A NEM FUTOTTAT A ZÖLDDEL (KUKA-093): ha a sorozat megállt, a lefutott
// darabszám KIMONDOTTAN kevesebb a tervezettnél.
if (notStarted.length) console.error(`A SÖPRÉS NEM TELJES: ${runs.length - notStarted.length}/${runs.length} ellenőrző futott le.`);
for (const a of reused) console.log(reuseLine(a));
for (const a of unverified) console.log(reuseLine(a));
if (unverified.length) console.error(`ÖSSZVERDIKT: NEM ZÖLD — ${unverified.length} lánc nem futott és nem igazolt (${unverified.map((a) => a.chain).join(', ')})`);
if (timedOut.length) {
  console.error(`NEM FEJEZŐDÖTT BE a söprés türelmén (${Math.round(PATIENCE_MS / 1000)}s) belül: `
    + timedOut.map((t) => `${t.s} (${Math.round(t.ms / 1000)}s)`).join(', '));
  console.error('  Ez NEM azt jelenti, hogy a verifier elbukott — futtasd külön, és nézd meg a saját eredményét.');
}
if (envSkips.length) {
  console.log('ENV-KIHAGYÁS (a gyermek MAGA deklarálta, gépi alakban — a söprés nem szövegből következtet):');
  for (const e of envSkips) console.log(`  · ${e.s} — ${e.reason}`);
}
if (leftovers.length) {
  console.error(`NEM IGAZOLT LEZÁRÁS (F95-02 · F98-01/A — a következő ellenőrzés terhelt/ismeretlen gépen mérne): `
    + leftovers.map((l) => `${l.s} (${l.state}: ${l.verdict})`).join(', '));
  for (const l of leftovers) console.error(`  · ${l.s}: ${(l.steps || []).join(' → ')}`);
}
// A KIMARADT FELADAT NEVET KAP, nem néma kihagyást és végképp nem zöldet (F98-01/A).
if (notStarted.length) {
  const elso = notStarted[0];
  const utana = elso.after ? `a(z) ${elso.after.s}` : 'az első ellenőrzés';
  console.error(elso.kind === 'megszakitas'
    ? `NEM INDULT EL (${notStarted.length}): a sorozat MEGSZAKÍTÁS (${elso.signal}) miatt állt meg ${utana} után`
    : `NEM INDULT EL (${notStarted.length}): a sorozat ${utana} lezárásának hiánya miatt megállt`);
  for (const n of notStarted) console.error(`  · ${n.item.s} — ${n.reason}`);
}
if (PLATFORM_LIMIT) console.log(`NEVEZETT PLATFORM-KORLÁT: ${PLATFORM_LIMIT}`);
if (fails.length) console.error(`PIROS: ${fails.join(', ')}`);
// MEGSZAKÍTÁS: a jelentés MÁR kiíródott (fent), és a KILÉPÉS OKA a jelé — nem „1-es hiba" és
// végképp nem siker (F101-01/4). A rendezett lezárást MEGVÁRJUK: az ígéret a `process.exit`-tel
// zárul, tehát ez a sor a lezárás után adja vissza a vezérlést a jelnek (véges lánc, CHR-01).
const megszakitas = interruptState();
if (megszakitas) {
  console.error(`\nA SÖPRÉS MEGSZAKADT (${megszakitas.signal}) — a fenti lista mondja meg, mi futott le és mi nem.`);
  const zaras = shutdownSettled();
  if (zaras) await zaras;
  process.exit(megszakitas.code);
}
// A FUTTATÓ HIBÁVAL ZÁR, ha bármi nem igazolt — a meg nem indult feladat is ide tartozik (F98-01/A).
if (fails.length || timedOut.length || unverified.length || leftovers.length || notStarted.length) process.exit(1);
