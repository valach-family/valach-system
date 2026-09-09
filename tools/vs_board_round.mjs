#!/usr/bin/env node
// VS — BOARD-KÖR eszköz (BRD-02, D-VS-520 — tiszta lap): a sáv EGY paranccsal tartja frissen a boardot.
//
// AZ ÚJ REND (operátori parancs 2026-08-22):
//   · parancsot BÁRKI adhat (operátor · Claude · Claude-Aux) — az operátor chat-parancsa az Ő nevében
//     kerül fel R1-ként, a válasz a következő kör (R2, R3, …);
//   · CMD = egy lépés kis darabja · STEP = rész-projekt · PR = terület (pl. „Support");
//   · zárás: cmd-t a 13 cmd-hatókörű gépi tétel zöldjével zárunk; step-et a 3 lépés-tétel
//     (i18n+szöveg-frissesség · AI · tutor) állításával — a step zárása KASZKÁDOL a nyitott cmd-kre;
//   · a PR-számok 200-tól nőnek (999 a plafon), a lépések PR-onként 001-től, a cmd-k lépésenként 001-től.
//
// KULCS-RÖVIDÍTÉS: --pr 200 → PR-VS-200 · --step 1 → STEP-VS-200-001 · --cmd 2 → CMD-VS-200-001-002
// (sorozat: --series, alap VS; teljes kulcs ugyanígy elfogadott).
//
// Alparancsok:
//   open        új objektum: --type PR|STEP|CMD --pr [--step --cmd] --title "…" [--desc "…"]
//   cmd         parancs regisztrálása R1-ként az adó nevében: --pr --step --cmd --title "…"
//               --by operator|Claude|Claude-Aux --text-file <fájl> [--step-title --step-desc --cmd-desc]
//   reply       kör hozzáfűzése: --pr --step --cmd --type NOTE|EXECUTION_REPORT|… --by … --text-file <fájl>
//               [--summary "…"] [--round Rn] [--status open|closed] [--agent-result completed_recommended]
//   close-cmd   parancs zárása: --pr --step --cmd --summary "…" [--dvs D-VS-…] [--report-file <fájl>]
//               [--no-matrix]  (riport + 13 cmd-tétel ok + két-lépcső + kiértékelő)
//   close-step  lépés zárása: --pr --step --summary "…" [--i18n-note --ai-note --tutor-note] [--dvs …]
//               (a 3 lépés-tétel állítása + zárás; a nyitott cmd-ket a board kaszkádja zárja)
//   close-pr    PR zárása: --pr --summary "…" [--dvs …]
//   status      állapot: --pr [--step --cmd]
//
// Környezet: CHATOPS_BASE_URL + CHATOPS_WRITE_TOKEN (a .env-ből is betöltődik — KUKA-040).
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadRepoEnv } from './lib/vs_tool_env.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadRepoEnv(ROOT);

const BASE = String(process.env.CHATOPS_BASE_URL || '').trim().replace(/\/+$/, '');
const TOKEN = String(process.env.CHATOPS_WRITE_TOKEN || '').trim();
if (!BASE || !TOKEN) {
  console.error('HIÁNYZIK: CHATOPS_BASE_URL és/vagy CHATOPS_WRITE_TOKEN (a .env-ben vagy a környezetben).');
  process.exit(2);
}

const args = process.argv.slice(2);
const sub = args[0];
const opt = (name, def = null) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = args[i + 1];
  return (v === undefined || v.startsWith('--')) ? true : v;
};

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', 'x-chatops-write-token': TOKEN },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

// ── Kulcs-összerakás: a rövid szám a SZÜLŐBŐL kapja a helyét (KUKA-036: nem gépeljük kétszer). ──
const SERIES = String(opt('series', 'VS')).toUpperCase();
const p3 = (n) => String(parseInt(n, 10)).padStart(3, '0');
function keys() {
  const rawPr = opt('pr'); const rawStep = opt('step'); const rawCmd = opt('cmd');
  let pr = null, step = null, cmd = null;
  if (rawPr) pr = /^PR-/i.test(rawPr) ? String(rawPr).toUpperCase() : `PR-${SERIES}-${p3(rawPr)}`;
  const prNo = pr ? pr.split('-').pop() : null;
  if (rawStep) step = /^STEP-/i.test(rawStep) ? String(rawStep).toUpperCase() : `STEP-${SERIES}-${prNo}-${p3(rawStep)}`;
  const stepNo = step ? step.split('-').pop() : null;
  if (rawCmd) cmd = /^CMD-/i.test(rawCmd) ? String(rawCmd).toUpperCase() : `CMD-${SERIES}-${prNo}-${stepNo}-${p3(rawCmd)}`;
  return { pr, step, cmd };
}

// A hatókörönkénti mátrix-tételek a KATALÓGUSBÓL jönnek, nem kézzel másolt listából (KUKA-051:
// a mérés hatóköre nem LISTA, hanem SZABÁLY — a kézi másolat a következő új tételről nem tudna,
// és a hiánya NÉMA lenne). A katalógus CommonJS, ez a fájl ESM: createRequire a híd.
const requireCjs = createRequire(import.meta.url);
const FRM = requireCjs(resolve(ROOT, 'tools/chatops-board/src/frmCatalog.js'));
const byScope = (s) => (FRM.DEFAULT_FRM_CATALOG || []).filter((i) => i.scope === s).map((i) => i.item_key);
const CMD_MATRIX = byScope('cmd');
const STEP_MATRIX = byScope('step');
const PR_MATRIX = byScope('pr');

async function postMatrix(objectType, objectKey, pr, items, notes, by) {
  // --na tétel1,tétel2 → azok NEM-RELEVÁNS státuszt kapnak (indok a --na-note-ból) — ami nem érinti
  // a kört, az ne „ok"-nak hazudja magát (KUKA-041 dísz-pipa elve a mátrixon).
  const naList = String(opt('na', '') || '').split(',').map((x) => x.trim()).filter(Boolean);
  const naNote = opt('na-note', 'Ez a kör nem érintette ezt a területet — nem releváns, indoklással a riportban.');
  for (const item of items) {
    const na = naList.includes(item);
    await call('POST', '/api/chatops/frm/status', {
      object_type: objectType, object_key: objectKey, pr, repo: opt('repo', 'valach-family/vs'),
      item_key: item, status: na ? 'not_applicable' : 'ok', updated_by: by,
      note: na ? naNote : (notes[item] || notes._default || 'Kör-záró gépi futás zölden; részletek a repo söprésében és a riportban.'),
    }).catch((e) => console.warn(`  mátrix ${item}: ${e.message.slice(0, 90)}`));
  }
}

async function nextRound(cmd) {
  try {
    const r = await call('GET', `/api/chatops/next-number?type=ROUND&cmd=${encodeURIComponent(cmd)}`);
    return 'R' + (r.next || 1);
  } catch { return 'R1'; }
}

async function postMessage(m) { return call('POST', '/api/chatops/messages', m); }

async function twoStepClose(type, key, note) {
  for (const to of ['reported', 'done']) {
    await call('POST', '/api/chatops/object-status', {
      object_type: type, object_key: key, to_status: to, repo: opt('repo', 'valach-family/vs'),
      actor: opt('by', 'Claude-DEV'), note, skipCatalogGate: false,
    }).catch((e) => console.warn(`  állapot ${key}→${to}: ${e.message.slice(0, 120)}`));
  }
}

async function main() {
  const repo = opt('repo', 'valach-family/vs');
  const K = keys();
  const by = opt('by', 'Claude-DEV');
  const readText = () => (opt('text-file') ? readFileSync(String(opt('text-file')), 'utf8') : String(opt('text', '')));

  if (sub === 'open') {
    const type = String(opt('type', '')).toUpperCase();
    const key = type === 'PR' ? K.pr : (type === 'STEP' ? K.step : K.cmd);
    const title = opt('title', '');
    if (!type || !key) { console.error('open: --type PR|STEP|CMD és a hozzá tartozó kulcs kötelező'); process.exit(2); }
    await postMessage({
      repo, pr: K.pr, step: type !== 'PR' ? K.step : undefined, cmd: type === 'CMD' ? K.cmd : undefined,
      ...(title ? { [`${type.toLowerCase()}_title`]: title } : {}),
      round: 'R1', round_type: 'NOTE', source_agent: by, status: 'closed',
      summary: `Kör nyitva: ${key}${title ? ' — ' + title : ''}`,
      full_message: `NOTE — ${key} nyitva.\n${title || ''}`.trim(),
    });
    const patch = {};
    if (opt('desc')) patch.description = opt('desc');
    if (opt('title-en')) patch.title_en = opt('title-en');
    if (opt('desc-en')) patch.description_en = opt('desc-en');
    // KI DOLGOZIK RAJTA (D-VS-522): a gazda-sáv a nyitáskor rögzül (a --by sáv-nevéből vagy --lane-ből).
    const lane = opt('lane') || (/^Claude-(DEV|AUX)$/.test(by) ? by : null);
    if (lane) patch.owner_lane = lane;
    if (Object.keys(patch).length) await call('PATCH', `/api/chatops/objects/${encodeURIComponent(key)}`, patch);
    console.log(`NYITVA: ${key}`);
    return;
  }

  if (sub === 'cmd') {
    // Parancs regisztrálása az ADÓ nevében (R1). Az operátor chat-parancsa így kerül a naplóba.
    if (!K.pr || !K.step || !K.cmd) { console.error('cmd: --pr --step --cmd kötelező'); process.exit(2); }
    const title = opt('title', '');
    if (!title) { console.error('cmd: --title kötelező (a parancs rövid neve)'); process.exit(2); }
    const body = readText();
    await postMessage({
      repo, pr: K.pr, step: K.step, cmd: K.cmd,
      cmd_title: title,
      ...(opt('step-title') ? { step_title: opt('step-title') } : {}),
      ...(opt('pr-title') ? { pr_title: opt('pr-title') } : {}),
      round: 'R1', round_type: 'COMMAND', source_agent: by, status: 'open',
      summary: title.slice(0, 200),
      full_message: body || title,
    });
    // KI DOLGOZIK RAJTA (D-VS-522): a végrehajtó sávja a PR-en (ha még nincs gazdája). Az operátor
    // parancs-ADÓ — a gazda a sáv, amelyik dolgozik rajta, ezért a --lane (vagy a futtató sávja) számít.
    const laneC = opt('lane') || 'Claude-DEV';
    await call('PATCH', `/api/chatops/objects/${encodeURIComponent(K.pr)}`, { owner_lane: laneC }).catch(() => { });
    // Kétnyelvű tartalom (D-VS-521): cím + leírás angolul is mehet (--cmd-desc-en, --cmd-title-en, …).
    for (const [k, base] of [[K.cmd, 'cmd'], [K.step, 'step'], [K.pr, 'pr']]) {
      const patch = {};
      if (opt(base + '-desc')) patch.description = opt(base + '-desc');
      if (opt(base + '-desc-en')) patch.description_en = opt(base + '-desc-en');
      if (opt(base + '-title-en')) patch.title_en = opt(base + '-title-en');
      if (Object.keys(patch).length) await call('PATCH', `/api/chatops/objects/${encodeURIComponent(k)}`, patch).catch(() => { });
    }
    console.log(`PARANCS REGISZTRÁLVA: ${K.cmd} (R1, ${by} nevében)`);
    return;
  }

  if (sub === 'reply') {
    if (!K.cmd) { console.error('reply: --pr --step --cmd kötelező'); process.exit(2); }
    const round = opt('round') || await nextRound(K.cmd);
    const type = String(opt('type', 'NOTE')).toUpperCase();
    const body = readText();
    const summary = opt('summary', body.split('\n')[0].slice(0, 180) || type);
    await postMessage({
      repo, pr: K.pr, step: K.step, cmd: K.cmd, round, round_type: type,
      source_agent: by, status: opt('status', type === 'EXECUTION_REPORT' ? 'closed' : 'open'),
      ...(opt('agent-result') ? { agent_result: opt('agent-result') } : {}),
      summary, full_message: body || summary,
    });
    console.log(`KÖR FELTÉVE: ${K.cmd} ${round} (${type}, ${by} nevében)`);
    return;
  }

  if (sub === 'close-cmd') {
    if (!K.cmd || !opt('summary')) { console.error('close-cmd: --pr --step --cmd --summary kötelező'); process.exit(2); }
    const dvs = opt('dvs', '');
    const report = opt('report-file') ? readFileSync(String(opt('report-file')), 'utf8') : '';
    const round = opt('round') || await nextRound(K.cmd);
    // ELŐBB a mátrix, UTÁNA a záró riport — a board üzenet-kapuja a záró riportot csak teljesített
    // mátrix mellett engedi be (helyesen: a zöld állítás előbb legyen könyvelve, mint a „kész" szó).
    if (!opt('no-matrix')) {
      await postMatrix('CMD', K.cmd, K.pr, CMD_MATRIX,
        { _default: `Kör-záró gépi futás zölden (${dvs || 'lásd a riportot'}); részletek a repo söprésében.` }, by);
    }
    await postMessage({
      repo, pr: K.pr, step: K.step, cmd: K.cmd, round, round_type: 'EXECUTION_REPORT',
      // Az explicit agent_result-ból olvas a kiértékelő (a status a kanonizálón 'closed'-dá válik).
      source_agent: by, status: 'closed', agent_result: 'completed_recommended',
      summary: String(opt('summary')).slice(0, 200),
      full_message: `EXECUTION_REPORT — ${K.cmd}\n${opt('summary')}${dvs ? `\nDöntés-napló: ${dvs}` : ''}${report ? `\n\n${report}` : ''}\nSöprés + böngésző-próbák: zölden (a repo a bizonyíték).`,
    });
    await twoStepClose('CMD', K.cmd, `${opt('summary')}${dvs ? ` (${dvs})` : ''}`);
    await call('POST', '/api/chatops/workflow/evaluate', { object_type: 'CMD', object_key: K.cmd });
    console.log(`ZÁRVA-JELENTVE: ${K.cmd} (a végső állapotot a kiértékelő + a mátrix-kapu dönti)`);
    return;
  }

  if (sub === 'close-step') {
    if (!K.step || !opt('summary')) { console.error('close-step: --pr --step --summary kötelező'); process.exit(2); }
    const dvs = opt('dvs', '');
    const notes = {
      frm_i18n: opt('i18n-note', 'A két i18n-őr zölden; a lépésben érintett képernyők meglévő szövegei átnézve (elavult állítás nem maradt — részletek a lépés riportjaiban).'),
      frm_ai: opt('ai-note', 'AI-szándékok a lépés újdonságaihoz igazítva; a gépi AI-próbák zölden.'),
      frm_tutor: opt('tutor-note', 'A súgó/tutor-tartalom a lépés változásaihoz igazítva (vagy kimondva: a lépés nem érintett magyarázó szöveget).'),
    };
    await postMatrix('STEP', K.step, K.pr, STEP_MATRIX, notes, by);
    await twoStepClose('STEP', K.step, `${opt('summary')}${dvs ? ` (${dvs})` : ''} — a lépés zárása a nyitott parancsait is zárja (kaszkád)`);
    console.log(`LÉPÉS ZÁRVA: ${K.step} (a nyitott cmd-ket a kaszkád zárta)`);
    return;
  }

  if (sub === 'close-pr') {
    if (!K.pr || !opt('summary')) { console.error('close-pr: --pr --summary kötelező'); process.exit(2); }
    const dvs = opt('dvs', '');
    // FRISSESSÉG-KÖRÚT (operátori R3, D-VS-521): a PR zárásakor a TELJES régi állomány (i18n-szövegek ·
    // AI-bejegyzések · tutor/súgó) átnézve a mai rendszerhez — a tétel bizonyítéka a körút jegyzéke.
    await postMatrix('PR', K.pr, K.pr, PR_MATRIX, {
      frm_frissesseg_korut: opt('frissesseg-note', 'A régi i18n-szövegek + AI-bejegyzések + tutor/súgó átnézve a mai rendszerhez mérve; a részletek a PR-záró riportban.'),
      frm_legal_frissesseg: opt('legal-note', 'A három jogi dokumentum (ÁSZF · GDPR · cookie) átnézve a mai rendszerhez mérve, mindhárom nyelven; review_log-bejegyzés a regiszterben, verify:legal zölden.'),
    }, by);
    await twoStepClose('PR', K.pr, `${opt('summary')}${dvs ? ` (${dvs})` : ''}`);
    await call('POST', '/api/chatops/workflow/evaluate', { object_type: 'PR', object_key: K.pr });
    console.log(`PR ZÁRVA-JELENTVE: ${K.pr}`);
    return;
  }

  if (sub === 'status') {
    for (const [t, k] of [['PR', K.pr], ['STEP', K.step], ['CMD', K.cmd]]) {
      if (!k) continue;
      const d = await call('GET', `/api/chatops/workflow/status?object_type=${t}&object_key=${encodeURIComponent(k)}`).catch(() => null);
      const o = await call('GET', `/api/chatops/objects/${encodeURIComponent(k)}`).catch(() => null);
      console.log(`${t} ${k}: életciklus=${o ? o.lifecycle : '?'} · munka-állapot=${d ? (d.work_status || '?') + (d.closed ? ' (zárva)' : '') : '?'} «${o ? String(o.title || '').slice(0, 60) : ''}»`);
    }
    return;
  }

  console.error('Használat: vs_board_round.mjs open|cmd|reply|close-cmd|close-step|close-pr|status … (fejléc-komment a részletekkel)');
  process.exit(2);
}
main().catch((e) => { console.error('HIBA:', e.message); process.exit(1); });
