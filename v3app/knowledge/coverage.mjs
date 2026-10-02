// v3app/knowledge/coverage.mjs — LEF-01: A NÉPESSÉG A TÉNYLEGES ALKALMAZÁSBÓL JÖN (R142 §4).
//
// MIÉRT VAN EZ A FÁJL, ÉS MIT CSERÉL LE.
//
// Az R142 kikötése szó szerint: „A lefedést ne a meglévő tudásjegyzék önellenőrzése jelentse: a
// tényleges alkalmazásból kell felfedezni, ami kimaradt." Eddig a mérés a `FEATURES` regiszterből
// indult, és azt kérdezte, hogy minden BEJEGYZÉSNEK van-e súgója, GYIK-je, bemutatója. Ez a kérdés
// zöld maradhat akkor is, ha egy VALÓDI oldal vagy művelet soha be sem került a regiszterbe — az
// ilyen hiány a régi alakban nem is létezett, mert a mérés alapsokasága maga a regiszter volt
// (KUKA-051: a mérés hatóköre nem lista, hanem SZABÁLY; a kézzel felsorolt alany-halmazból a
// rendszer következő darabja némán kimarad).
//
// MOSTANTÓL AZ ALAPSOKASÁG A FORRÁS: a szerver route-táblája, a nyelvcsomag oldal-listája (amiből a
// menü ÉS a fülek épülnek), a felületi `data-action` műveletek, az űrlapok és a belépés előtti
// nézetek. A regiszter ehhez MÉRVE lesz, nem önmagához.
//
// AMIT EZ A MODUL NEM TESZ — KIMONDVA:
//   · nem fut le semmit: a népesség FORRÁSBÓL van kivonva, nem futtatásból. Ezért minden lefedési
//     tény MELLÉ ODAÍRJUK a bizonyíték SZINTJÉT (lásd `EVIDENCE`), és a négy szintet soha nem
//     mossuk össze (R142 §4 utolsó pontja);
//   · nem dönt jogosultságról (azt a szerver és az `availabilityOf` teszi — KUKA-047);
//   · nem olvas fájlt és nem hálózik: a hívó adja át a forrásokat (a `verify` és a riport UGYANEZT
//     futtatja — KUKA-207).
//
// A HIÁNY NEM „KIS HIÁNY": a lefedési őr ezt a modult HÍVJA (KUKA-009), és a néma zsugorodás ellen
// PADLÓ áll minden népességen (KUKA-012).

/**
 * A BIZONYÍTÉK NÉGY SZINTJE — az R142 §4 kikötése: „deklarált / forrásból ellenőrzött / futtatott /
 * hiányzó; ne mosd össze". Ez a modul a két középső szintet tudja kiadni; a `futtatott` szintet a
 * böngészős tanúk és a próbák adják, és a riport ODA hivatkozik, nem ide.
 */
export const EVIDENCE = Object.freeze({
  declared: 'deklarált',                 // a regiszter állítja, forrás-oldali ellenőrzés nélkül
  source: 'forrásból ellenőrzött',       // a tényleges forrásban MEGTALÁLT kötés
  run: 'futtatott',                      // élő futás tanúsítja (NEM ez a modul adja)
  missing: 'hiányzó',                    // nincs kötés — ez a LELET
});

/** A népesség-fajták. Mindegyik a SAJÁT forrásából jön, és mindegyiknek van padlója. */
export const KINDS = Object.freeze(['route', 'page', 'action', 'form', 'authview']);

/**
 * A PADLÓ — a MA MÉRT népesség-számok (R142). Csökkenni NEM szabad: ha egy kivonatoló minta
 * elromlik (átnevezés, formázás-váltás), a népesség némán összezsugorodna, és a lefedés „javulni"
 * látszana attól, hogy kevesebbet mértünk (KUKA-012 · KUKA-131). A padló FELETT szabad nőni —
 * minden új darab új lefedési sor.
 */
export const FLOOR = Object.freeze({ route: 32, page: 17, action: 42, form: 6, authview: 3 });

const uniq = (a) => [...new Set(a)];

/**
 * A SZERVER VÉGPONTJAI — a route-tábla kulcsaiból.
 *
 * MIÉRT FORRÁS-OLVASÁS, ÉS EZT KI IS MONDJUK: a `handlers` tábla a `createApp()` belső változója,
 * tehát futásidőben nem kérhető el kívülről. A kulcs alakja viszont kötött (`'METHOD /út':`), és a
 * padló megfogja, ha az illesztés elromlik. A `dev`-végpontok KÜLÖN jelölve jönnek: azok nem
 * felhasználói képességek, hanem fejlesztői felület, és a lefedésben sem azok (KUKA-015).
 */
export function routesFrom(serverSource) {
  const out = [];
  const re = /^\s*'(GET|POST|PUT|DELETE|PATCH) (\/[A-Za-z0-9/_:-]+)':/gm;
  let m;
  while ((m = re.exec(String(serverSource || ''))) !== null) {
    out.push({ kind: 'route', id: `${m[1]} ${m[2]}`, method: m[1], path: m[2], dev: m[2].startsWith('/dev/') });
  }
  return out;
}

/**
 * A FELÜLETI MŰVELETEK — a `data-action="…"` attribútumokból, MINDEN szállított lap-modulból.
 *
 * Ez a felhasználó tényleges kattintás-felülete: amit nem lehet megnyomni, az nincs; amit meg lehet,
 * annak van helye a tudásban (KUKA-011 a tudásra fordítva).
 */
export function actionsFrom(sources) {
  const ids = [];
  for (const src of sources) {
    const re = /data-action="([a-z0-9-]+)"/g;
    let m;
    while ((m = re.exec(String(src || ''))) !== null) ids.push(m[1]);
  }
  return uniq(ids).sort().map((id) => ({ kind: 'action', id }));
}

/** AZ ŰRLAPOK — a `…-form` próba-azonosítókból (a kitöltés a felhasználó munkája, nem a segédé). */
export function formsFrom(sources) {
  const ids = [];
  for (const src of sources) {
    const re = /data-testid="([a-z0-9-]*-form)"/g;
    let m;
    while ((m = re.exec(String(src || ''))) !== null) ids.push(m[1]);
  }
  return uniq(ids).sort().map((id) => ({ kind: 'form', id }));
}

/** A BELÉPÉS ELŐTTI NÉZETEK — a `data-auth="…"` váltókból. */
export function authViewsFrom(sources) {
  const ids = [];
  for (const src of sources) {
    const re = /data-auth="([a-z]+)"/g;
    let m;
    while ((m = re.exec(String(src || ''))) !== null) ids.push(m[1]);
  }
  return uniq(ids).sort().map((id) => ({ kind: 'authview', id }));
}

/**
 * AZ OLDALAK — a NYELVCSOMAG `PAGE` csoportjából, mert EBBŐL épül a menü, a fül-sáv ÉS az
 * oldalválasztó is (`renderNav` · `renderTabs` · `go`). Ugyanaz a regiszter, amiből a KÉPERNYŐ áll,
 * tehát a mérés nem tud elcsúszni a felülettől (KUKA-051).
 *
 * A MENÜ-CSOPORT is jön: a lefedési sor meg tudja mondani, HOL találja a felhasználó az oldalt, és
 * hogy a menüből egyáltalán elérhető-e (a `new` például külön belépőből is nyílik).
 */
export function pagesFrom({ pageLabels, navGroups = [], navAdmin = null, navPersonal = [] }) {
  const inMenu = new Map();
  const add = (group, pages, which) => { for (const p of pages || []) inMenu.set(p, { group: group || null, menu: which }); };
  for (const g of navGroups) add(g.group, g.pages, 'business');
  if (navAdmin) add(navAdmin.group, navAdmin.pages, 'admin');
  for (const g of navPersonal) add(g.group, g.pages, 'personal');
  return Object.keys(pageLabels || {}).map((id) => ({
    kind: 'page', id, label: pageLabels[id],
    menu: inMenu.has(id) ? inMenu.get(id).menu : null,
    group: inMenu.has(id) ? inMenu.get(id).group : null,
  }));
}

/** A TELJES NÉPESSÉG EGY HÍVÁSBAN — a riport és az őr UGYANEZT kapja (KUKA-039). */
export function populationFrom({ serverSource, uiSources, pageLabels, navGroups, navAdmin, navPersonal }) {
  return Object.freeze({
    route: Object.freeze(routesFrom(serverSource)),
    page: Object.freeze(pagesFrom({ pageLabels, navGroups, navAdmin, navPersonal })),
    action: Object.freeze(actionsFrom(uiSources)),
    form: Object.freeze(formsFrom(uiSources)),
    authview: Object.freeze(authViewsFrom(uiSources)),
  });
}

/**
 * EGY OLDAL LEFEDÉSE. Négy kérdés, és MINDEGYIKRE külön válasz — mert a „van róla tudás" mondat
 * elfedi, hogy épp a bemutató vagy a GYIK hiányzik (R142 §4).
 *
 * `screen_feature` — melyik funkció leírása szól EZRŐL a képernyőről (`FEATURES.screen`);
 * `faq`            — van-e hozzá kötött gyakori kérdés;
 * `tour`           — van-e bemutató, ami EZT az oldalt tényleg érinti (saját VAGY közös);
 * `sitemap`        — a menüből elérhető-e (az oldaltérkép a navigációból épül).
 */
export function pageCoverage(page, { features, tours }) {
  const own = features.filter((f) => f.screen === page.id);
  const faq = own.flatMap((f) => f.faq || []);
  // A KÖZÖS TÚRA IS LEFEDÉS — DE CSAK HA TÉNYLEG ODAVISZ (R142 §4): nem a `tour_note` hossza
  // dönt, hanem hogy egy LÉPÉS célja az oldal menüpontja vagy az oldal saját horgonya.
  const anchors = new Set(own.flatMap((f) => f.anchors || []));
  const touring = Object.values(tours).filter((t) => (t.steps || []).some((s) => s.target === `nav-${page.id}` || anchors.has(s.target))
    || t.page === page.id);
  return {
    kind: 'page', id: page.id, label: page.label, menu: page.menu, group: page.group,
    screen_feature: own.length ? own.map((f) => f.id) : [],
    faq: uniq(faq),
    tour: touring.map((t) => t.id),
    sitemap: page.menu !== null,
    gaps: [
      ...(own.length ? [] : ['nincs funkció-leírás erre a képernyőre (FEATURES.screen)']),
      ...(faq.length ? [] : ['nincs hozzá kötött gyakori kérdés']),
      ...(touring.length ? [] : ['nincs bemutató, ami ezt az oldalt érinti']),
    ],
    evidence: own.length ? EVIDENCE.source : EVIDENCE.missing,
  };
}

/**
 * EGY FELÜLETI MŰVELET LEFEDÉSE. A művelet akkor fedett, ha valamelyik funkció BELÉPŐJE vagy
 * HORGONYA ráutal, vagy ha a művelet a funkció nyitható `action`-jével azonos fogalom.
 *
 * AMIT EZ A SZABÁLY KIMOND, ÉS AMIT NEM: a kötést a REGISZTER deklarálja (`entry` · `anchors`), a
 * MŰVELET a FORRÁSBÓL jön — tehát a hiány azt jelenti, hogy egy megnyomható gombról a tudás nem
 * beszél. Azt NEM állítja, hogy a gomb rossz: lehet, hogy a tudásnak nincs is róla mondandója (a
 * `panel-close` ilyen). Ezért a modul a HÁZTARTÁSI műveleteket NEVEZETTEN kiveszi, nem némán.
 */
export const HOUSEKEEPING_ACTIONS = Object.freeze([
  // Ezek a felület SAJÁT kezelő-mozdulatai: nem üzleti képességek, hanem a panel/súgó/bemutató
  // nyitása-zárása és a lista-kezelés. A tudásnak nincs róluk külön mondandója, és ezt KIMONDJUK —
  // a néma kihagyás ugyanaz a hazugság, mint a néma felülírás (KUKA-012).
  'panel-close', 'help-close', 'help-open', 'help-view', 'help-topic', 'help-go', 'faq-open',
  'clear-search', 'row-open', 'member-open', 'members-tab', 'nav-close', 'dismiss-after-create',
  'tour-start', 'tour-next', 'tour-back', 'tour-exit', 'tour-finish', 'tour-restart', 'tour-skip',
  'unsaved-keep', 'unsaved-discard', 'reload-stock', 'reload-price', 'mail-refresh',
  'chat-new', 'chat-clear', 'chat-suggest', 'chat-do',
  'invite-revoke-start', 'revoke-start', 'reinvite-start', 'invite-open', 'invite-from-create',
]);

export function actionCoverage(action, { features }) {
  if (HOUSEKEEPING_ACTIONS.includes(action.id)) {
    return { kind: 'action', id: action.id, housekeeping: true, features: [], gaps: [], evidence: EVIDENCE.source };
  }
  const hit = features.filter((f) => f.entry === action.id
    || (f.anchors || []).includes(action.id)
    || (f.anchors || []).some((a) => a === `${action.id}` || a.startsWith(`${action.id}-`)));
  return {
    kind: 'action', id: action.id, housekeeping: false,
    features: hit.map((f) => f.id),
    gaps: hit.length ? [] : ['megnyomható művelet, amiről a tudás nem beszél'],
    evidence: hit.length ? EVIDENCE.source : EVIDENCE.missing,
  };
}

/**
 * EGY VÉGPONT LEFEDÉSE. A kötés a funkció `authority.endpoint` mezője — ez mondja meg, HOL dől el a
 * kérdés (KUKA-047). A `dev`-végpontok NEVEZETTEN kimaradnak: fejlesztői felület, nem képesség.
 */
export function routeCoverage(route, { features }) {
  if (route.dev) {
    return { kind: 'route', id: route.id, dev: true, features: [], gaps: [], evidence: EVIDENCE.source };
  }
  const hit = features.filter((f) => f.authority && String(f.authority.endpoint || '').startsWith(route.id));
  return {
    kind: 'route', id: route.id, dev: false,
    features: hit.map((f) => f.id),
    gaps: hit.length ? [] : ['végpont, amire egyetlen funkció-leírás sem hivatkozik'],
    evidence: hit.length ? EVIDENCE.source : EVIDENCE.missing,
  };
}

/** EGY ŰRLAP LEFEDÉSE — a funkció BELÉPŐJE vagy horgonya mutat rá. */
export function formCoverage(form, { features }) {
  const hit = features.filter((f) => f.entry === form.id || (f.anchors || []).includes(form.id));
  return {
    kind: 'form', id: form.id, features: hit.map((f) => f.id),
    gaps: hit.length ? [] : ['űrlap, amiről a tudás nem beszél'],
    evidence: hit.length ? EVIDENCE.source : EVIDENCE.missing,
  };
}

/** EGY BELÉPÉS ELŐTTI NÉZET LEFEDÉSE — nyilvános funkcióhoz kell tartoznia. */
export function authViewCoverage(view, { features }) {
  const hit = features.filter((f) => f.audience === 'public' && (f.entry === `${view.id}-form` || f.id === `auth.${view.id}`));
  return {
    kind: 'authview', id: view.id, features: hit.map((f) => f.id),
    gaps: hit.length ? [] : ['belépés előtti nézet nyilvános funkció-leírás nélkül'],
    evidence: hit.length ? EVIDENCE.source : EVIDENCE.missing,
  };
}

/**
 * A KÖZÖS TÚRA LEFEDÉSE NEM SZÖVEG, HANEM LÉPÉS (R142 §4 kikötése).
 *
 * „A »mindenhez tutor« nem 31 egymást ismétlő túrát jelent: közös út elfogadható, ha a funkció
 * valóban benne van és indítható. … puszta »tour_note kellően hosszú« többé nem teljesítési
 * feltétel. A közös túra lefedését gépi hivatkozás és tényleges lépés bizonyítsa."
 *
 * Ezért minden funkcióra megmondjuk, MELYIK bemutató melyik LÉPÉSE fedi — a saját `tour`-ja, vagy
 * egy olyan közös túra, aminek EGY LÉPÉSE a funkció belépőjére/horgonyára mutat. Ami csak
 * `tour_note`-tal áll, az `note_only` — és az R142 óta ez NEM teljesítés, hanem nevezett hiány.
 */
export function tourCoverage(feature, { tours }) {
  if (feature.tour && tours[feature.tour]) {
    return { feature: feature.id, how: 'own', tour: feature.tour, steps: (tours[feature.tour].steps || []).map((s) => s.id), evidence: EVIDENCE.source };
  }
  const anchors = new Set([feature.entry, ...(feature.anchors || [])].filter(Boolean));
  for (const t of Object.values(tours)) {
    const steps = (t.steps || []).filter((s) => anchors.has(s.target));
    if (steps.length) {
      return { feature: feature.id, how: 'shared', tour: t.id, steps: steps.map((s) => s.id), evidence: EVIDENCE.source };
    }
  }
  const note = typeof feature.tour_note === 'string' && feature.tour_note.length > 20;
  return {
    feature: feature.id, how: note ? 'note_only' : 'none', tour: null, steps: [],
    evidence: EVIDENCE.missing,
  };
}

/**
 * A TELJES LEFEDÉSI LELTÁR. A hívó a forrásokat és a regisztereket adja; a modul a SOROKAT.
 * `gaps` = minden nevezett hiány, fajtánként csoportosítva — ez a lefedési őr bemenete.
 */
export function inventory({ population, features, tours }) {
  const rows = {
    route: population.route.map((r) => routeCoverage(r, { features })),
    page: population.page.map((p) => pageCoverage(p, { features, tours })),
    action: population.action.map((a) => actionCoverage(a, { features })),
    form: population.form.map((f) => formCoverage(f, { features })),
    authview: population.authview.map((v) => authViewCoverage(v, { features })),
  };
  const tourRows = features
    .filter((f) => f.status === 'working' || f.status === 'demo')
    .map((f) => tourCoverage(f, { tours }));
  const counts = {};
  const floorBreaks = [];
  for (const k of KINDS) {
    counts[k] = { total: population[k].length, gaps: rows[k].filter((r) => r.gaps.length).length };
    if (population[k].length < FLOOR[k]) {
      floorBreaks.push(`${k}: a népesség ${population[k].length}, a MÉRT padló ${FLOOR[k]} — a kivonatolás zsugorodott, nem a rendszer`);
    }
  }
  return Object.freeze({ rows, tourRows, counts, floorBreaks });
}

export const LEF_CONTRACT = Object.freeze({
  id: 'LEF-01',
  owns: 'a lefedési NÉPESSÉG kivonása a TÉNYLEGES forrásból (route · oldal · művelet · űrlap · '
    + 'belépési nézet) és a regiszterhez mérése — fajtánként, nevezett hiányokkal',
  does_not_own: 'a jogosultsági döntést (szerver + availabilityOf) · a futtatott bizonyítékot '
    + '(böngészős tanúk és próbák) · a szavakat (nyelvcsomagok)',
  never: 'a regisztert NEM a saját állításához méri (az R142 előtti alak hibája), és a népesség '
    + 'néma zsugorodását PADLÓ fogja meg',
  stated_limit: 'a népesség FORRÁSBÓL van kivonva, nem futtatásból — ezért minden sor viszi a '
    + 'bizonyíték SZINTJÉT, és a `futtatott` szintet nem ez a modul adja',
});
