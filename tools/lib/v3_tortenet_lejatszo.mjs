// tools/lib/v3_tortenet_lejatszo.mjs — AZ ÖT HASZNÁLATI TÖRTÉNET KATTINTHATÓ LEJÁTSZÓJA (R112 §3 · P109-03).
//
// MIT AD: a meglévő bemutató-generátor (`tools/v3_r89_bemutato.mjs`) EGYETLEN HTML-lapjába egy közös
// belépőt („Történetek"): az öt használati út és a meghívó-helyzetek közül lehet választani, minden
// lépésnél rövid magyarázat, egy valóban kattintható művelet, a LÁTHATÓ eredmény, újrakezdés — és
// külön megnevezve, mi SZIMULÁCIÓ itt, és mit bizonyít a VALÓDI alkalmazásban futó böngésző-próba.
//
// AMI VALÓDI BENNE: a SZÖVEG és a KÖTÉS. Minden felirat, magyarázat és eredmény-mondat a TÉNYLEGES
// nyelvcsomagokból jön (`UI` · `STATE` · `TPL` · `REASON` · `SRV` · `KB` · `FAQ` · `TOUR` · `TOURUI` ·
// `STORY`), a lépések magyarázata a MEGLÉVŐ bemutató- és súgószövegekből — nincs második, azonos
// tartalmú változat (R112 §2). A történetek funkciói, bemutatói és bizonyító próbái a közös
// regiszterből (`v3app/knowledge/stories.mjs`, STR-01) jönnek.
//
// AMI NEM VALÓDI, KIMONDVA: a lap nem hív szervert, nem ír adatot, nem küld levelet, nem fogad el
// meghívót. A képernyők a valódi alkalmazás EGYSZERŰSÍTETT képei, szintetikus adattal (pelda.hu
// címek, „Minta Kft"). Hogy a valódi alkalmazás ugyanezt teszi-e, azt a lap alján felsorolt
// böngésző-próbák bizonyítják, a mért eredményükkel (`V3_R112_TORTENETEK_BIZONYITEK.json`).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A LÉPÉSEK — deklaratív leírás. Minden lépés: magyarázat (szöveg-hivatkozás) · a képernyő a művelet
 * ELŐTT · a kattintható művelet felirata · a képernyő a művelet UTÁN (a látható eredmény).
 * A szöveg-hivatkozás alakjai: `UI.kulcs` · `TPL:kulcs` · `KB:funkció:mező` · `FAQ:kérdés:a` ·
 * `TOUR:bemutató:lépés.mező` · `STORY:történet:mező` — a lap a KIVÁLASZTOTT nyelven oldja fel.
 */
const PERSONAL = { personal: true };
const BIZ_ADMIN = { name: 'Minta Kft', role: 'admin' };
const BIZ_MEMBER = { name: 'Minta Kft', role: 'user' };
const OWN_ADMIN = { name: 'Saját Bt', role: 'admin' };

export const STORY_STEPS = Object.freeze({
  'story.private': [
    { explain: 'KB:auth.register:purpose', before: { screen: 'register' }, act: 'UI.registerTitle', after: { screen: 'sent' } },
    { explain: 'KB:auth.verify:purpose', before: { screen: 'mailbox', mail: 'SRV.mailVerifySubject' }, act: 'SRV.mailVerifySubject', after: { screen: 'verified' } },
    { explain: 'KB:auth.login:purpose', before: { screen: 'login' }, act: 'UI.loginTitle', after: { screen: 'overview', header: PERSONAL } },
    { explain: 'TOUR:tour.language:s2.body', before: { screen: 'language', header: PERSONAL }, act: 'LANG', after: { screen: 'overview', header: PERSONAL, langChanged: true } },
    { explain: 'FAQ:faq.logout.language:a', before: { screen: 'overview', header: PERSONAL }, act: 'UI.logout', after: { screen: 'login' } },
    { explain: 'KB:account.personal:purpose', before: { screen: 'login' }, act: 'UI.loginTitle', after: { screen: 'overview', header: PERSONAL, langKept: true } },
  ],
  'story.solo': [
    { explain: 'KB:account.add_business:purpose', before: { screen: 'overview', header: PERSONAL }, act: 'PAGE.new', after: { screen: 'newBusiness', header: PERSONAL } },
    { explain: 'TOUR:tour.addBusiness:s4.body', before: { screen: 'newBusiness', header: PERSONAL }, act: 'PAGE.new', after: { screen: 'overview', header: BIZ_ADMIN, notice: { tpl: 'accountCreated', nev: 'Minta Kft' } } },
    { explain: 'TOUR:tour.shell:s1.body', before: { screen: 'switcher', header: BIZ_ADMIN, target: 'personal' }, act: 'STATE.personalAccount', after: { screen: 'overview', header: PERSONAL } },
    { explain: 'KB:account.switch:result', before: { screen: 'switcher', header: PERSONAL, target: 'Minta Kft' }, act: 'NAME:Minta Kft', after: { screen: 'overview', header: BIZ_ADMIN } },
  ],
  'story.growing': [
    { explain: 'TOUR:tour.invite:s2.body', before: { screen: 'members', header: BIZ_ADMIN, who: 'anna' }, act: 'UI.inviteUserButton', after: { screen: 'inviteForm', header: BIZ_ADMIN, who: 'anna' } },
    { explain: 'TOUR:tour.invite:s4.body', before: { screen: 'inviteForm', header: BIZ_ADMIN, who: 'anna' }, act: 'UI.inviteCreate', after: { screen: 'inviteReady', header: BIZ_ADMIN, who: 'anna' } },
    { explain: 'TOUR:tour.inviteAccept:s1.body', before: { screen: 'mailbox', mail: 'SRV.mailInviteSubject', who: 'bea' }, act: 'SRV.mailInviteSubject', after: { screen: 'invitePage', situation: 'anon', who: 'bea' } },
    { explain: 'TOUR:tour.inviteAccept:s2.body', before: { screen: 'invitePage', situation: 'anon', who: 'bea' }, act: 'UI.loginTitle', after: { screen: 'invitePage', situation: 'ready', who: 'bea' } },
    { explain: 'TOUR:tour.inviteAccept:s4.body', before: { screen: 'invitePage', situation: 'ready', who: 'bea' }, act: 'UI.inviteAcceptButton', after: { screen: 'overview', header: BIZ_MEMBER, who: 'bea', joined: true } },
  ],
  'story.multi': [
    { explain: 'FAQ:faq.account.whichAccount:a', before: { screen: 'overview', header: BIZ_MEMBER, who: 'bea' }, act: 'NAME:Saját Bt', after: { screen: 'overview', header: OWN_ADMIN, who: 'bea' } },
    { explain: 'FAQ:faq.account.unsaved:a', before: { screen: 'switcher', header: OWN_ADMIN, target: 'personal', who: 'bea' }, act: 'STATE.personalAccount', after: { screen: 'overview', header: PERSONAL, who: 'bea' } },
    { explain: 'KB:account.switch:result', before: { screen: 'switcher', header: PERSONAL, target: 'Minta Kft', who: 'bea' }, act: 'NAME:Minta Kft', after: { screen: 'overview', header: BIZ_MEMBER, who: 'bea' } },
  ],
  'story.team': [
    { explain: 'FAQ:faq.members.membershipVsScope:a', before: { screen: 'stock', header: BIZ_MEMBER, who: 'bea', access: false }, act: 'UI.refresh', after: { screen: 'stock', header: BIZ_MEMBER, who: 'bea', access: false } },
    { explain: 'TOUR:tour.grant:s3.body', before: { screen: 'grantPanel', header: BIZ_ADMIN, who: 'anna' }, act: 'UI.grantView', after: { screen: 'members', header: BIZ_ADMIN, who: 'anna', notice: { tpl: 'memberCanSee', ki: 'bea@pelda.hu', scope: 'keszlet' } } },
    { explain: 'KB:data.stock:purpose', before: { screen: 'stock', header: BIZ_MEMBER, who: 'bea', access: false }, act: 'UI.refresh', after: { screen: 'stock', header: BIZ_MEMBER, who: 'bea', access: true } },
    { explain: 'KB:members.revoke:purpose', before: { screen: 'revokeConfirm', header: BIZ_ADMIN, who: 'anna' }, act: 'UI.revokeConfirm', after: { screen: 'members', header: BIZ_ADMIN, who: 'anna', notice: { tpl: 'memberRevoked', ki: 'bea@pelda.hu', nev: 'Minta Kft' } } },
    { explain: 'KB:members.revoke:result', before: { screen: 'stock', header: BIZ_MEMBER, who: 'bea', access: true }, act: 'UI.refresh', after: { screen: 'lost', header: { none: true }, who: 'bea' } },
  ],
  'story.invites': [
    { explain: 'UI.inviteNeedsIdentityLead', before: { screen: 'invitePage', situation: 'anon', who: 'bea' }, act: 'UI.registerTitle', after: { screen: 'register' } },
    { explain: 'UI.inviteAsExistingLead', before: { screen: 'invitePage', situation: 'ready', who: 'bea' }, act: 'UI.inviteAcceptButton', after: { screen: 'overview', header: BIZ_MEMBER, who: 'bea', joined: true } },
    { explain: 'FAQ:faq.invite.wrongAddress:a', before: { screen: 'invitePage', situation: 'other', who: 'cecil' }, act: 'UI.logout', after: { screen: 'login' } },
    { explain: 'REASON.invite_expired', before: { screen: 'invitePage', situation: 'expired', who: 'bea' }, act: 'UI.inviteFaqOpen', after: { screen: 'faq', faq: 'faq.invite.expiry' } },
    { explain: 'REASON.invite_already_redeemed', before: { screen: 'invitePage', situation: 'used', who: 'bea' }, act: 'UI.inviteFaqOpen', after: { screen: 'faq', faq: 'faq.invite.accept' } },
  ],
});

/**
 * A MÉRT BIZONYÍTÉK betöltése. Ha a generátor `--from-report <e2e-jelentés.json>`-t kap, a futás
 * jelentéséből ÚJRAÉPÍTI a (tartalom nélküli) bizonyíték-lapot; különben a repóban álló lapot olvassa.
 * Ami nincs mérve, az „NEM MÉRT" — nem zöld (KUKA-094: a hiányzó tanú nem zöld).
 */
export function evidenceFromReport(report, stories) {
  const rows = [];
  const walk = (suite, file) => {
    const f = suite.file || file;
    for (const sp of suite.specs || []) {
      const results = (sp.tests || []).flatMap((t) => t.results || []);
      const last = results.length ? results[results.length - 1].status : 'nincs';
      rows.push({ file: f, title: sp.title, status: sp.ok === true && last === 'passed' ? 'passed' : last });
    }
    for (const s of suite.suites || []) walk(s, f);
  };
  for (const s of report.suites || []) walk(s, s.file);
  const out = {};
  for (const story of stories) {
    out[story.id] = story.evidence.map((e) => {
      const base = e.spec.replace(/^tests\/e2e\//, '');
      const hits = rows.filter((r) => String(r.file || '').endsWith(base) && String(r.title).startsWith(e.title));
      return { spec: e.spec, title: e.title, runs: hits.length,
        passed: hits.filter((h) => h.status === 'passed').length,
        titles: hits.map((h) => h.title) };
    });
  }
  return out;
}

export function loadEvidence(root, path) {
  const p = join(root, path);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}
