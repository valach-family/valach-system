// v3app/public/chat.mjs — A CHATES SEGÉD FELÜLETE (AST-01 kliens-oldala, R89 §6).
//
// MIT RAJZOL: szabad szöveges kérdés-mezőt, választható kérdéseket, a választ a FORRÁSÁVAL, és
// legfeljebb néhány VALÓDI következő lépést. A mérés (hívás · token · késleltetés · költség) a
// „Technikai részletek" alatt látszik — a `null` ott „nincs adat"-ként, SOHA nem nullaként (AST-03).
//
// AMIT KIMOND, ÉS AMIT SOHA NEM ÁLLÍT:
//   · a HELYI keresés eredménye NEM AI-válasz, és a panel ezt KIÍRJA (`localOnlyNote`) — mockolt
//     vagy helyi válasz nem nevezhető működő AI-nak (R89 §6 · KUKA-127);
//   · ha a szolgáltatói csatlakozás hiányzik, a panel megnevezi a HIÁNYT és megmondja, mi MŰKÖDIK
//     helyette (útmutatók · GYIK · oldaltérkép · bemutató) — nem üres képernyő (KUKA-201);
//   · jelszót és megerősítő kódot a mező MELLETT kiírt mondat kifejezetten kizár (R89 §6).
//
// A BESZÉLGETÉS A NÉZETHEZ TARTOZIK. A `view` (alany + könyv) a küldéskor rögzül, és a lap CSAK
// akkor rajzolja ki a választ, ha a nézet változatlan — a KÉSVE érkező válasz nem jelenhet meg új
// kontextusban (R89 §6 · KTX-03 · KUKA-041). Az ürítés az `app.js` közös tár-ürítőjében fut
// (KUKA-218: minden nézethez kötött tár EGY helyen ürül).
import { CHAT, HELP, UI, STATE, reasonText, tpl } from './texts.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Az üres beszélgetés — a lap ezt teszi az állapotba, és a nézet-váltás ezt állítja vissza. */
export function emptyChat() {
  return { turns: [], sending: false, draft: '', lastUsage: null };
}

/** A mérés emberi alakja: ami `null`, az „nincs adat" — nem nulla (AST-03). */
function usageRows(u) {
  if (!u) return '';
  const val = (v) => (v === null || v === undefined ? CHAT.measuredUnknown : String(v));
  const cost = u.cost ? `${u.cost.amount.toFixed(4)} ${u.cost.currency}` : CHAT.measuredUnknown;
  return `<dl class="usage" data-testid="chat-usage">
    <dt>${esc(CHAT.measuredCalls)}</dt><dd data-testid="chat-usage-calls">${esc(String(u.model_calls))}</dd>
    <dt>${esc(CHAT.measuredTokens)}</dt><dd data-testid="chat-usage-tokens">${esc(val(u.input_tokens))} / ${esc(val(u.output_tokens))}</dd>
    <dt>${esc(CHAT.measuredLatency)}</dt><dd>${esc(val(u.latency_ms))}</dd>
    <dt>${esc(CHAT.measuredCost)}</dt><dd data-testid="chat-usage-cost">${esc(cost)}</dd>
    </dl>${u.missing && u.missing.length ? `<p class="muted" style="font-size:12px" data-testid="chat-usage-missing">${esc(u.missing.join(' · '))}</p>` : ''}`;
}

/** EGY forrás-sor: melyik útmutató, milyen forrásváltozattal. */
function sourceLine(s, titles) {
  if (s.faq) return `<li data-testid="chat-source-${esc(s.faq)}">${esc(HELP.tabFaq)}: ${esc(s.faq)}</li>`;
  const title = (titles && titles[s.feature]) || s.title || s.feature;
  return `<li data-testid="chat-source-${esc(s.feature)}">${esc(tpl('chatSourceLine', { cim: title, verzio: s.version }))}</li>`;
}

/** EGY kör (kérdés + válasz) rajzolása. */
function turnHtml(t, i, titles) {
  const answered = t.answer !== null && t.answer !== undefined;
  return `<li class="chatturn" data-testid="chat-turn-${i}">
    <p class="question" data-testid="chat-question-${i}">${esc(t.question)}</p>
    ${t.injection ? `<p class="notice warn" data-testid="chat-injection-${i}">${esc(CHAT.instructionIgnored)}</p>` : ''}
    ${answered
    ? `<div class="answer" data-testid="chat-answer-${i}">
        <p>${esc(t.answer)}</p>
        ${t.kind === 'local' ? `<p class="muted" style="font-size:12px" data-testid="chat-localonly-${i}">${esc(CHAT.localOnlyNote)}</p>` : ''}
        ${t.sources && t.sources.length ? `<div class="sources"><strong>${esc(CHAT.source)}</strong>
          <ul>${t.sources.map((s) => sourceLine(s, titles)).join('')}</ul></div>` : ''}
        ${t.actions && t.actions.length ? `<div class="buttonrow" data-testid="chat-actions-${i}">
          ${t.actions.map((a) => (a.kind === 'tour'
    ? `<button type="button" class="primary" data-action="tour-start" data-tour="${esc(a.tour)}" data-testid="chat-tour-${i}">${esc(a.label || HELP.startTour)}</button>`
    : `<button type="button" data-action="chat-do" data-do="${esc(a.id)}" data-testid="chat-do-${i}-${esc(a.id)}">${esc(a.label || CHAT.openAction)}</button>`)).join('')}</div>
          <p class="muted" style="font-size:12px">${esc(CHAT.prepareNote)}</p>` : ''}
      </div>`
    : `<div class="answer" data-testid="chat-answer-${i}">
        <p class="notice warn">${esc(reasonText(t.reason, CHAT.noAnswer))}</p>
        <p class="muted">${esc(CHAT.noAnswerLead)}</p>
        ${t.faq && t.faq.length ? `<ul class="faqlist">${t.faq.map((f) => `<li><button type="button" class="plain" data-action="faq-open" data-faq="${esc(f.id)}">${esc(f.q)}</button></li>`).join('')}</ul>` : ''}
      </div>`}
    ${t.usage ? `<details class="tech"><summary>${esc(UI.technicalDetails)}</summary>${usageRows(t.usage)}</details>` : ''}
  </li>`;
}

/**
 * A KÉRDEZZ NÉZET. A `status` a szerver `GET /api/assistant/status` válasza: ebből tudjuk, hogy van-e
 * engedélyezett szolgáltatói csatlakozás — a képernyő NEM találgat (KUKA-089).
 */
export function chatHtml({ chat, status, titles }) {
  const configured = Boolean(status && status.provider && status.provider.configured);
  const missing = (status && status.provider && status.provider.missing) || [];
  return `<div data-testid="help-chat">
    ${configured ? '' : `<div class="notice warn" data-testid="chat-not-configured">
      <strong>${esc(CHAT.notConfigured)}</strong> ${esc(CHAT.notConfiguredLead)}
      ${missing.length ? `<br><small data-testid="chat-missing-config">${esc(missing.join(' · '))}</small>` : ''}</div>`}
    ${chat.turns.length ? `<ul class="chatlist" data-testid="chat-list">${chat.turns.map((t, i) => turnHtml(t, i, titles)).join('')}</ul>`
    : `<div class="chatintro" data-testid="chat-intro"><h3>${esc(CHAT.intro)}</h3><p class="muted">${esc(CHAT.introLead)}</p>
        <p class="muted" style="font-size:12px">${esc(CHAT.suggested)}</p>
        <div class="buttonrow">${[CHAT.q1, CHAT.q2, CHAT.q3].map((q, i) => `<button type="button" class="plain" data-action="chat-suggest" data-q="${esc(q)}" data-testid="chat-suggest-${i}">${esc(q)}</button>`).join('')}</div></div>`}
    <form class="form chatform" data-testid="chat-form" data-keep="chat">
      <label class="sr-only" for="chat-input-el">${esc(CHAT.placeholder)}</label>
      <textarea id="chat-input-el" name="question" rows="2" maxlength="${esc(String((status && status.limits && status.limits.question_chars) || 500))}"
        data-testid="chat-input" placeholder="${esc(CHAT.placeholder)}">${esc(chat.draft || '')}</textarea>
      <p class="muted" style="font-size:12px" data-testid="chat-nosecrets">${esc(CHAT.noSecrets)}</p>
      <div class="buttonrow">
        <button type="submit" class="primary" data-testid="chat-send" ${chat.sending ? 'disabled' : ''}>${esc(chat.sending ? CHAT.sending : CHAT.send)}</button>
        <button type="button" data-action="chat-new" data-testid="chat-new">${esc(CHAT.newConversation)}</button>
        ${chat.turns.length ? `<button type="button" data-action="chat-clear" data-testid="chat-clear">${esc(CHAT.clearLocal)}</button>` : ''}
      </div>
      <p class="notice" data-testid="chat-result" hidden></p>
    </form>
    <p class="muted" style="font-size:12px" data-testid="chat-nomodel">${esc(HELP.faqLead)}</p>
    ${chat.cleared ? `<p class="notice" data-testid="chat-cleared">${esc(CHAT.cleared)}</p>` : ''}
    ${!chat.turns.length ? `<p class="muted" style="font-size:12px">${esc(STATE.empty)}</p>` : ''}
  </div>`;
}

export const CHAT_CONTRACT = Object.freeze({
  id: 'AST-01/kliens',
  owns: 'a Kérdezz nézet rajzolása, a beszélgetés helyi állapota és a mérés megjelenítése',
  says_out_loud: 'a helyi keresés NEM AI-válasz · a hiányzó csatlakozás NEVEZVE · a null „nincs adat"',
  view_bound: 'a beszélgetés a nézethez (alany + könyv) kötött; az ürítés a közös tár-ürítőben fut',
  never: 'jelszót nem kér · írást nem végez · a modell javaslatát nem futtatja',
});
