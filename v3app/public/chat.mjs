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
/**
 * ÚJ BESZÉLGETÉS — SAJÁT AZONOSÍTÓVAL (F91-03, a külső ellenőrző fél R91-es lelete).
 *
 * A LELET: a kérdésre adott VALÓDI HTTP-választ a mérés visszatartotta → „Új beszélgetés" → a lista
 * kiürült → a régi választ felengedte, és az MEGJELENT az új beszélgetésben (`chat-list: 0 → 1`). A
 * fiók nem változott, tehát a nézet-generáció ezt nem fogta meg: a beszélgetésnek SAJÁT azonosítója
 * kell, és a válasz csak akkor rajzolódik, ha ugyanahhoz a beszélgetéshez tartozik.
 *
 * A KÉRÉS-SORSZÁM (`seq`) a MÁSODIK tengely: ugyanabban a beszélgetésben is eldobjuk a régi,
 * késve érkező választ, ha közben újabb kérdés indult.
 */
let convCounter = 0;
export function emptyChat() {
  convCounter += 1;
  return { id: `c${convCounter}`, seq: 0, turns: [], sending: false, draft: '', lastUsage: null };
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
function sourceLine(s, titles, faqTitles, openable) {
  /**
   * A SOR EMBERI CÍMMEL ÁLL (F91-06, a külső fél lelete: „a chat forrásai között nyers
   * `faq.invite.who` azonosító jelenik meg"). A gépi azonosító a `data-testid`-ben és a technikai
   * részben marad — ott MÉRHETŐ —, a felhasználó a kérdés SZÖVEGÉT látja.
   *
   * ÉS A FORRÁS MEGNYITHATÓ (F93-03, a külső ellenőrző fél R93-as kikötése: „A chat forráscíme
   * kattintásra nyissa meg a megfelelő útmutatót/GYIK-t"). Eddig sima listasor volt: a felhasználó
   * látta, MIRE épül a válasz, de nem tudott eljutni oda — a megnevezett forrás zsákutca volt
   * (KUKA-011 a forrás-soron). A megnyitás a MEGLÉVŐ, csak olvasó műveleteket használja
   * (`help-topic` · `faq-open`), tehát üzleti írás nem történik, és a nyelv sem vált.
   *
   * ÉS AMIT NEM TESZÜNK: nem gyártunk gombot oda, ahol nincs mit megnyitni. Ha az útmutató ennek a
   * kérőnek NEM elérhető (nincs a tudás-indexében), a sor SZÖVEG marad — a letiltott vagy üresre
   * nyíló gomb rosszabb, mint a gomb hiánya (KUKA-160: amit a képernyő felkínál, annak végig kell
   * mennie).
   */
  if (s.faq) {
    const q = (faqTitles && faqTitles[s.faq]) || null;
    const label = `${HELP.tabFaq}: ${q || HELP.tabFaq}`;
    if (!q) return `<li data-testid="chat-source-${esc(s.faq)}">${esc(label)}</li>`;
    return `<li data-testid="chat-source-${esc(s.faq)}"><button type="button" class="plain" data-action="faq-open"
      data-faq="${esc(s.faq)}" data-testid="chat-source-open-${esc(s.faq)}">${esc(label)}</button></li>`;
  }
  const title = (titles && titles[s.feature]) || s.title || s.feature;
  const label = tpl('chatSourceLine', { cim: title, verzio: s.version });
  const canOpen = typeof openable === 'function' ? openable(s.feature) : false;
  if (!canOpen) return `<li data-testid="chat-source-${esc(s.feature)}">${esc(label)}</li>`;
  return `<li data-testid="chat-source-${esc(s.feature)}"><button type="button" class="plain" data-action="help-topic"
    data-topic="${esc(s.feature)}" data-testid="chat-source-open-${esc(s.feature)}">${esc(label)}</button></li>`;
}

/** EGY kör (kérdés + válasz) rajzolása. */
function turnHtml(t, i, titles, faqTitles, openable) {
  const answered = t.answer !== null && t.answer !== undefined;
  return `<li class="chatturn" data-testid="chat-turn-${i}">
    <p class="question" data-testid="chat-question-${i}">${esc(t.question)}</p>
    ${t.injection ? `<p class="notice warn" data-testid="chat-injection-${i}">${esc(CHAT.instructionIgnored)}</p>` : ''}
    ${answered
    ? `<div class="answer" data-testid="chat-answer-${i}">
        <p>${esc(t.answer)}</p>
        ${t.kind === 'local' ? `<p class="muted" style="font-size:12px" data-testid="chat-localonly-${i}">${esc(CHAT.localOnlyNote)}</p>` : ''}
        ${t.discarded ? `<p class="notice warn" data-testid="chat-discarded-${i}" data-why="${esc(t.discarded.reason || '')}">${esc(CHAT.modelDiscarded)} ${esc((CHAT.modelDiscardedWhy || {})[t.discarded.reason] || '')}</p>` : ''}
        ${t.sources && t.sources.length ? `<div class="sources"><strong>${esc(CHAT.source)}</strong>
          <ul>${t.sources.map((s) => sourceLine(s, titles, faqTitles, openable)).join('')}</ul></div>` : ''}
        ${t.related && t.related.length ? `<div class="sources" data-testid="chat-related-${i}"><strong>${esc(CHAT.related)}</strong>
          <ul>${t.related.map((s) => sourceLine(s, titles, faqTitles, openable)).join('')}</ul></div>` : ''}
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
export function chatHtml({ chat, status, titles, faqTitles, limits, openable }) {
  const configured = Boolean(status && status.provider && status.provider.configured);
  const missing = (status && status.provider && status.provider.missing) || [];
  const keep = (limits && limits.history_turns) || (status && status.limits && status.limits.history_turns) || 6;
  return `<div data-testid="help-chat">
    ${configured ? '' : `<div class="notice warn" data-testid="chat-not-configured">
      <strong>${esc(CHAT.notConfigured)}</strong> ${esc(CHAT.notConfiguredLead)}
      <br><small>${esc(CHAT.singleTurnNote)}</small>
      ${missing.length ? `<details class="tech" data-testid="chat-operator-details"><summary>${esc(UI.technicalDetails)}</summary>
        <p class="muted" style="font-size:12px" data-testid="chat-missing-config">${esc(missing.join(' · '))}</p></details>` : ''}</div>`}
    ${chat.turns.length ? `<ul class="chatlist" data-testid="chat-list">${chat.turns.map((t, i) => turnHtml(t, i, titles, faqTitles, openable)).join('')}</ul>
      <p class="muted" style="font-size:12px" data-testid="chat-history-note">${esc(tpl('chatHistoryNote', { n: keep }))}</p>`
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
