// v3app/public/help.mjs — SEG-01: A SEGÍTSÉGPANEL (R89 §4).
//
// NÉGY NÉZET EGY PANELBEN: Kérdezz · Útmutatók · Gyakori kérdések · Oldaltérkép. A panelt a
// FELHASZNÁLÓ nyitja: magától soha nem ugrik fel, és a megnyitása MODELLHÍVÁST NEM indít — a
// súgó, a GYIK, az oldaltérkép és a bemutató a már letöltött nyelvcsomagból dolgozik.
//
// MI JÖN HONNAN, ÉS MIÉRT ÍGY:
//   · a SZÖVEG a nyelvcsomagokból (`i18n/<nyelv>.mjs`) — ez NYILVÁNOS terméksúgó, megosztható
//     gyorsítótár; a lap már letöltötte, tehát a panel megnyitása nem kér hálózatot;
//   · az ELÉRHETŐSÉG a SZERVERTŐL (`GET /api/assistant/knowledge` index + `GET /api/me`) — hogy mi
//     látható ebben a fiókban és szerepkörben, azt a SZERVER mondja meg, nem ez a fájl. A panel
//     KIÍRJA, hogy a hozzáférést a szerver döntötte el (R89 §4 · KUKA-047);
//   · a SZEMÉLYES beszélgetés NEM ide tartozik: azt a `chat.mjs` tartja, külön (R89 §6: „A nyilvános
//     terméksúgó megosztható gyorsítótára és a személyes munkamenet külön tárolandó").
//
// TISZTA RAJZOLÓ: ez a modul HTML-t ad vissza, és SEMMIT nem kér le. A lekérést az `app.js` végzi,
// egy helyen — a rajzolás soha nem kérdez (KUKA-209).
import { PAGE, NAV_GROUPS, NAV_ADMIN, NAV_PERSONAL, HELP, UI, STATE, ROLE, tpl, knowledgeText, currentLang, dict } from './texts.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** A négy nézet — a sorrend a terv §4 sorrendje. */
export const VIEWS = Object.freeze(['ask', 'guides', 'faq', 'sitemap']);

/** Az állapot-szó emberi megfelelője és a hozzá tartozó mondat. */
function statusLabel(status) {
  if (status === 'working') return { label: HELP.statusWorking, note: null, cls: 'ok' };
  if (status === 'demo') return { label: HELP.statusDemo, note: HELP.statusDemoNote, cls: 'wait' };
  if (status === 'planned') return { label: HELP.statusPlanned, note: HELP.statusPlannedNote, cls: 'gray' };
  if (status === 'retired') return { label: HELP.statusRetired, note: HELP.statusRetiredNote, cls: 'gray' };
  return { label: status || '—', note: null, cls: 'gray' };
}

/** A szó-egyezés a helyi kereséshez — ugyanaz az előtag-szabály, mint a szerveren (AST-01). */
function hits(needle, haystack) {
  const norm = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const words = [...new Set(norm(needle).split(/[^a-z0-9]+/).filter((w) => w.length >= 3))];
  if (!words.length) return true;
  const hay = norm(haystack).split(/[^a-z0-9]+/).filter(Boolean);
  return words.every((w) => hay.some((h) => h === w || (Math.min(h.length, w.length) >= 4 && (h.startsWith(w) || w.startsWith(h)))));
}

/**
 * AZ ÚTMUTATÓK SORRENDJE: az AKTUÁLIS képernyő témái ELŐRE (a terv §4 kikötése), utána a többi.
 * A KIVEZETETT bejegyzés nem kerül a listába — de a keresés MEGTALÁLJA, és a részletezőben a
 * „helyette ezt használd" sor viszi tovább (R89 §3).
 */
export function guidesFor({ index, page, search }) {
  const rows = (index || []).filter((r) => r.visible !== false || r.why === 'plan_limited');
  const match = (r) => {
    const k = knowledgeText(r.id, r.version, currentLang());
    const t = (k.text || {});
    return hits(search || '', `${r.id} ${t.title || ''} ${t.purpose || ''} ${t.prereq || ''} ${t.result || ''}`);
  };
  const filtered = search ? rows.filter(match) : rows;
  const here = filtered.filter((r) => r.screen && r.screen === page);
  const rest = filtered.filter((r) => !(r.screen && r.screen === page));
  return { here, rest, population: rows.length, shown: filtered.length };
}

/** EGY útmutató teljes nézete — mire való · mi kell · mi lesz · mi történhet · folytatás. */
export function topicHtml({ row, tours, actions }) {
  const k = knowledgeText(row.id, row.version, currentLang());
  const t = k.text || {};
  const st = statusLabel(row.status);
  const line = (title, body) => (body ? `<div class="topicline"><span>${esc(title)}</span><p>${esc(body)}</p></div>` : '');
  const outcomes = t.outcomes && typeof t.outcomes === 'object' ? t.outcomes : {};
  const outcomeLabel = {
    success: HELP.outcomeSuccess, empty: HELP.outcomeEmpty, missing: HELP.outcomeMissing,
    refused: HELP.outcomeRefused, error: HELP.outcomeError, uncertain: HELP.outcomeUncertain,
  };
  // A FORDÍTÁS ÁLLAPOTA A PANELEN LÁTSZIK (R89 §3): az elavult és a hiányzó fordítás nem néma.
  const transl = k.translation === 'checked'
    ? `<span class="badge ok" data-testid="help-transl-ok">${esc(HELP.translationChecked)}</span>`
    : k.translation === 'stale'
      ? `<span class="badge wait" data-testid="help-transl-stale">${esc(HELP.translationStale)}</span>`
      : `<span class="badge gray" data-testid="help-transl-missing">${esc(HELP.translationMissing)}</span>`;
  const tour = row.tour ? (tours || []).find((x) => x.id === row.tour) : null;
  const action = row.visible !== false && row.screen ? (actions || []).find((a) => a.page === row.screen && a.kind === 'open_page') : null;
  return `<article class="topic" data-testid="help-topic-${esc(row.id)}">
    <header><h3>${esc(t.title || row.id)}</h3>
      <span class="badge ${st.cls}" data-testid="help-status-${esc(row.id)}">${esc(st.label)}</span>${transl}</header>
    ${st.note ? `<p class="notice warn" data-testid="help-statusnote-${esc(row.id)}">${esc(st.note)}</p>` : ''}
    ${row.replaced_by ? `<p class="helpbox" data-testid="help-replaced-${esc(row.id)}">${esc(HELP.replacedBy)}: <strong>${esc(row.replaced_by)}</strong></p>` : ''}
    ${line(HELP.whatFor, t.purpose)}
    ${line(HELP.prerequisites, t.prereq)}
    ${line(HELP.result, t.result)}
    ${Object.keys(outcomes).length ? `<div class="topicline"><span>${esc(HELP.outcomes)}</span>
      <ul class="outcomes">${Object.entries(outcomes).map(([kind, text]) => `<li data-testid="help-outcome-${esc(row.id)}-${esc(kind)}"><strong>${esc(outcomeLabel[kind] || kind)}:</strong> ${esc(text)}</li>`).join('')}</ul></div>` : ''}
    <footer class="buttonrow">
      ${action ? `<button type="button" data-action="help-go" data-page="${esc(action.page)}" data-testid="help-open-${esc(row.id)}">${esc(HELP.openScreen)}</button>` : ''}
      ${tour ? `<button type="button" class="primary" data-action="tour-start" data-tour="${esc(tour.id)}" data-testid="help-tour-${esc(row.id)}">${esc(HELP.startTour)}</button>` : ''}
    </footer>
    <p class="muted" style="font-size:12px">${esc(HELP.sourceVersion)}: ${esc(row.version)} · ${esc(row.id)}</p>
  </article>`;
}

/**
 * AZ OLDALTÉRKÉP — a navigációból ÉS a szerver által igazolt hozzáférésből (R89 §4).
 *
 * A `me` a SZERVER válasza: a szerep, a személyes jelleg és a csomag onnan jön. Ez a függvény NEM
 * dönt jogról: megmutatja, mi érhető el, és ami nem, annál KIMONDJA az OKOT — a „miért nem látom"
 * kérdés így nem marad válasz nélkül (a KUKA-011 alakja az oldaltérképen).
 */
export function sitemapHtml({ me }) {
  const personal = me && me.current_personal === true;
  const admin = me && me.current_role === 'admin';
  const plan = (me && me.current_plan) || 'starter';
  const groups = personal ? NAV_PERSONAL : [...NAV_GROUPS, NAV_ADMIN];
  const row = (p) => {
    let available = true; let why = null;
    if (!personal && NAV_ADMIN.pages.includes(p) && !admin) { available = false; why = HELP.sitemapWhyRole; }
    if (personal && !NAV_PERSONAL.some((g) => g.pages.includes(p))) { available = false; why = HELP.sitemapWhyPersonal; }
    return `<li data-testid="sitemap-${esc(p)}" data-available="${available}">
      ${available
    ? `<button type="button" data-action="help-go" data-page="${esc(p)}">${esc(PAGE[p])}</button>`
    : `<span class="muted">${esc(PAGE[p])}</span> <small>${esc(HELP.sitemapNotAvailable)} — ${esc(why || '')}</small>`}</li>`;
  };
  const extra = personal ? [] : ['profile', 'security', 'new'];
  return `<div data-testid="help-sitemap">
    <p class="muted">${esc(HELP.sitemapLead)}</p>
    ${groups.map((g) => `<section><h4>${esc(g.group || PAGE.overview)}</h4>
      <ul class="menu-list">${g.pages.map(row).join('')}</ul></section>`).join('')}
    ${extra.length ? `<section><h4>${esc(NAV_PERSONAL[2].group)}</h4><ul class="menu-list">${extra.map(row).join('')}</ul></section>` : ''}
    <p class="muted" style="font-size:12px">${esc(tpl('scopeViewOf', { mit: plan === 'pro' ? UI.planField : UI.planField }))} · ${esc(ROLE[me && me.current_role] || '—')}</p>
  </div>`;
}

/** A GYAKORI KÉRDÉSEK — kereshető, modellhívás nélkül. */
export function faqHtml({ index, search, open }) {
  /**
   * A GYIK SOROK A LÁTHATÓ FUNKCIÓKBÓL (F91-05). A régi alak az index MINDEN sorának GYIK-jét
   * felsorolta — a `visible: false` sorokét is —, tehát a fiók nélküli vagy belépés előtti
   * felhasználó a fiókhoz kötött kérdéseket is látta. A szerver is ugyanezt a halmazt keresi
   * (`searchableFaqIds`), így a képernyő és a segéd NEM tud elcsúszni (KUKA-018 · KUKA-039).
   * A `plan_limited` sor LÁTHATÓ marad: annak a tudása kiadható, a mondata mondja ki a két kaput.
   */
  const rows_ = (index || []).filter((r) => r.visible !== false || r.why === 'plan_limited');
  const ids = [...new Set(rows_.flatMap((r) => r.faq || []))];
  const lang = currentLang();
  // A GYIK SZÖVEGE A SZÓTÁRBÓL — EGY otthon (`i18n/<nyelv>.mjs` → `FAQ`), a visszaesési lánccal.
  const box = (dict().FAQ) || {};
  void lang;
  const rows = ids.map((id) => ({ id, q: (box[id] || {}).q || null, a: (box[id] || {}).a || '' })).filter((r) => r.q);
  const shown = search ? rows.filter((r) => hits(search, `${r.q} ${r.a}`)) : rows;
  return `<div data-testid="help-faq">
    <p class="muted">${esc(HELP.faqLead)}</p>
    <input data-testid="faq-search" aria-label="${esc(HELP.faqSearchPlaceholder)}" placeholder="${esc(HELP.faqSearchPlaceholder)}" value="${esc(search || '')}">
    ${shown.length ? `<ul class="faqlist">${shown.map((r) => `<li data-testid="faq-${esc(r.id)}">
        <button type="button" class="plain" data-action="faq-open" data-faq="${esc(r.id)}" aria-expanded="${open === r.id}">${esc(r.q)}</button>
        ${open === r.id ? `<p data-testid="faq-answer-${esc(r.id)}">${esc(r.a)}</p>` : ''}</li>`).join('')}</ul>`
    : `<div class="empty" data-testid="faq-empty"><h3>${esc(HELP.searchNoHit)}</h3><p>${esc(HELP.searchNoHitLead)}</p></div>`}
    <p class="muted" style="font-size:12px" data-testid="faq-population">${esc(tpl('itemCount', { n: rows.length }))}</p>
  </div>`;
}

/** AZ ÚTMUTATÓK NÉZETE — az aktuális képernyő témái előre. */
export function guidesHtml({ index, page, search, topic, tours, actions }) {
  if (topic) {
    const row = (index || []).find((r) => r.id === topic);
    if (row) {
      return `<div data-testid="help-guides">
        <button type="button" class="plain" data-action="help-topic" data-topic="" data-testid="help-back">← ${esc(HELP.backToList)}</button>
        ${topicHtml({ row, tours, actions })}</div>`;
    }
  }
  const { here, rest, population, shown } = guidesFor({ index, page, search });
  const item = (r) => {
    const k = knowledgeText(r.id, r.version, currentLang());
    const t = k.text || {};
    const st = statusLabel(r.status);
    return `<li data-testid="help-guide-${esc(r.id)}">
      <button type="button" class="plain" data-action="help-topic" data-topic="${esc(r.id)}">${esc(t.title || r.id)}</button>
      <span class="badge ${st.cls}">${esc(st.label)}</span></li>`;
  };
  return `<div data-testid="help-guides">
    <input data-testid="guide-search" aria-label="${esc(HELP.searchGuides)}" placeholder="${esc(HELP.searchGuidesPlaceholder)}" value="${esc(search || '')}">
    <p class="muted" style="font-size:12px" data-testid="guide-localonly">${esc(HELP.searchGuides)}</p>
    ${here.length ? `<section><h4>${esc(HELP.currentScreenFirst)}${page ? ` — ${esc(PAGE[page] || page)}` : ''}</h4>
      <ul class="menu-list" data-testid="help-here">${here.map(item).join('')}</ul></section>` : ''}
    ${rest.length ? `<section><h4>${esc(HELP.otherTopics)}</h4>
      <ul class="menu-list" data-testid="help-rest">${rest.map(item).join('')}</ul></section>` : ''}
    ${!here.length && !rest.length ? `<div class="empty" data-testid="help-noguide"><h3>${esc(search ? HELP.searchNoHit : HELP.noTopics)}</h3>
      <p>${esc(search ? HELP.searchNoHitLead : STATE.empty)}</p></div>` : ''}
    <p class="muted" style="font-size:12px" data-testid="guide-population">${esc(tpl('itemCount', { n: shown }))} / ${esc(String(population))}</p>
  </div>`;
}

/** A PANEL KERETE — fejléc, fülek, és a választott nézet törzse. */
export function helpPanelHtml({ view, body, page }) {
  const tab = (key, label, testid) => `<button type="button" role="tab" data-action="help-view" data-view="${key}"
    data-testid="${testid}" aria-selected="${view === key}" class="${view === key ? 'current' : ''}">${esc(label)}</button>`;
  return `<div class="dialoghead"><div>
      <small data-testid="help-context">${esc(page ? tpl('helpForScreen', { oldal: PAGE[page] || page }) : HELP.title)}</small>
      <h2>${esc(HELP.title)}</h2></div>
    <button type="button" class="x" data-action="help-close" aria-label="${esc(HELP.close)}" data-testid="help-close">×</button></div>
  <div class="subtabs" role="tablist">
    ${tab('ask', HELP.tabAsk, 'help-tab-ask')}${tab('guides', HELP.tabGuides, 'help-tab-guides')}
    ${tab('faq', HELP.tabFaq, 'help-tab-faq')}${tab('sitemap', HELP.tabSitemap, 'help-tab-sitemap')}</div>
  <div class="helpbody" data-testid="help-view-${esc(view)}">${body}</div>`;
}

export const SEG_CONTRACT = Object.freeze({
  id: 'SEG-01',
  owns: 'a segítségpanel négy nézetének RAJZOLÁSA — tisztán, lekérés nélkül',
  text_from: 'a nyelvcsomagok (nyilvános terméksúgó, megosztható gyorsítótár)',
  availability_from: 'a SZERVER (GET /api/assistant/knowledge index + GET /api/me) — a panel ezt kimondja',
  zero_model_calls: 'a megnyitás, a keresés, a GYIK és az oldaltérkép modellhívást NEM indít',
  never: 'a panel magától nem nyílik ki, és jogosultságot nem dönt el',
});
