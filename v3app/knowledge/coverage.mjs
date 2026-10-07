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

/**
 * A REGRESSZIÓ-ALAPVONAL — FIX, NEVESÍTETT, ÉS NEM A TELJESSÉG MÉRCÉJE (R144 — F144-01(c)).
 *
 * MI VOLT A BAJ. Az R143-as alakom `OPEN_GAPS_CEILING = OPEN_GAPS.length` volt: a plafon ÖNMAGÁT
 * növelte, mert egy új kivétel felvétele egyszerre emelte a listát ÉS a plafont. A külső ellenőrző
 * fél (chatgpt-v3, R144) ezt nevezte meg: „Az ismert eltéréseket engedő regresszióőr nem azonos a
 * teljességvizsgálattal." Igaza van: a zöld őr azt a látszatot adta, hogy a lefedés rendben van,
 * miközben huszonegy valódi hiány állt (KUKA-041 alakja a mérőn).
 *
 * A MAI SZABÁLY — KÉT KÜLÖN VERDIKT, SOHA NEM ÖSSZEMOSVA:
 *   · **TELJESSÉG**: PIROS, amíg EGY valódi, alkalmazható hiány is van. Nincs kivétel-lista, nincs
 *     plafon. A cél NULLA hiány. Ezt a `verify:lefedes` külön állítása mondja ki.
 *   · **REGRESSZIÓ**: az alábbi alapvonal FIX szöveges verzióhoz van kötve (nem a lista hosszához),
 *     és csak egyet mér: jelent-e meg OLYAN hiány, ami ekkor még nem volt. Ez diagnosztika —
 *     megmondja, hogy egy piros ÚJ-e vagy örökölt —, és SOHA nem tesz zölddé egy hiányos lefedést.
 *
 * Az alapvonal szerkesztése önmagában NEM javítás: a teljesség tőle nem lesz zöld.
 */
export const GAP_BASELINE = Object.freeze({
  version: 'R164-potolt',
  at: '2026-10-07',
  note: 'az R164/3 PÓTLÁSA UTÁN mért hiány-halmaz. HÁROM lap kikerült (fiók · folyamatok · raktárak: '
    + 'megkapta a leírását, a GYIK-jét és a lépésenkénti útmutatóját három nyelven). EGY lap BEKERÜLT '
    + '(`outbox`): nem új hiány, hanem egy korábbi HAMIS ZÖLD — a lefedés-őr addig a KÖZÖS tábla-horgonyt '
    + '(`list-rows`) lap-azonosítónak fogadta el, ezért egy szomszéd lap bemutatója ezt is „bejártnak" '
    + 'mondta (KUKA-239 osztálya, SAJÁT lelet R164). Az R158 jelentésem kézi számolása épp ezért jelzett '
    + '11 lapot a gépi 10 helyett: a KÉZI szám volt a helyes, és most a gép is azt mondja. KÉT bemutató-sor '
    + 'BEKERÜLT (`data.stockcard` · `data.movements`): ezek MOST kaptak leírást, tehát most lett MÉRHETŐ, '
    + 'hogy saját útmutatójuk nincs — a hiány INDOKA a regiszterben áll (engedélyhez kötött nézet).',
  keys: Object.freeze([
    // OLDAL — négynek nincs leírása, GYIK-je és bemutatója sem; négynek csak bemutatója nincs.
    'page:documents', 'page:movements', 'page:outbox', 'page:partners', 'page:personal',
    'page:products', 'page:security', 'page:stockcard',
    // VÉGPONT — AZ R144-BEN MEGSZÜNTETVE (a `reads` deklarációval), ezért innen KIKERÜLT. A sorok
    // törlése önmagában nem javítás: az `LR2` állítás PIROS lenne, ha a hiány még állna.
    // BEMUTATÓ — a JAVÍTOTT mérés szerint (az R143-as négy hamis „shared" is ide került).
    'tour:account.personal', 'tour:auth.login', 'tour:auth.logout', 'tour:auth.resend',
    'tour:auth.verify', 'tour:data.documentSample', 'tour:data.supplierSample',
    'tour:shell.assistant', 'tour:shell.profile', 'tour:shell.sample_pages',
    // BEMUTATÓ — az R164/3-ban LEÍRT, engedélyhez kötött két készlet-nézet (az indok a regiszterben).
    'tour:data.stockcard', 'tour:data.movements',
  ]),
});

/**
 * ════════════════════════════════════════════════════════════════════════════════════════════════
 * A HIÁNY KÉT CSOPORTJA (R164/3) — ÉS A CSOPORT MÉRT ÁLLÍTÁS, NEM PRÓZA
 * ════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * AZ R164/3 KIKÖTÉSE: *„A lefedettségi réseket bontsd a VALÓDI kód szerint: ahol létező
 * felülethez/funkcióhoz tartozik hiányzó HU/EN/DE leírás/GYIK/súgó/segéd/tutor/demo, ott pótolj;
 * ahol a mögöttes üzleti képesség még nem létezik, az maradjon nevesített fejlesztési rés. Ne töröld
 * a zöld szám érdekében, és ne állítsd, hogy minden rés ebből jön."*
 *
 * MIÉRT KÓDBAN: egy jelentés-bekezdés, ami azt mondja „ez pótolható, az fejlesztési rés", az
 * ÁLLÍTÁS — és a KUKA-050 szerint a szöveg a valóságot követi, nem fordítva. Ezért a csoportot a
 * REGISZTER állapotából vezetjük le:
 *
 *   · PÓTOLHATÓ (`fillable`) — a képernyőhöz tartozik `working` vagy `demo` állapotú funkció, tehát
 *     a felület MA is dolgozik; ami hiányzik, az a leírás/GYIK/bemutató, és az megírható.
 *   · NEVESÍTETT FEJLESZTÉSI RÉS (`capability_missing`) — nincs működő funkció a képernyőre, DE a
 *     regiszterben áll `planned` bejegyzés, ami MEGNEVEZI, mi hiányzik. A hiány marad, nevesítve.
 *   · OSZTÁLYOZATLAN (`unclassified`) — se működő funkció, se nevesített terv. EZ PIROS: egy hiányt
 *     nem lehet „majd valahogy" sávba tenni. A kettő közül pontosan az egyikbe kell esnie.
 *
 * ÉS AMIT EZ NEM ÁLLÍT (KUKA-216): a „pótolható" nem azt jelenti, hogy pótolva VAN — azt a hiány
 * eltűnése mondja meg. A csoport csak azt mondja meg, MELYIK fajta munkát kéri.
 */
export const GAP_CLASSES = Object.freeze(['fillable', 'capability_missing', 'unclassified']);

export function classifyGaps({ rows, tourRows, features }) {
  const byScreen = {};
  for (const f of features) {
    if (!f.screen) continue;
    byScreen[f.screen] = byScreen[f.screen] || [];
    byScreen[f.screen].push(f);
  }
  const byId = {};
  for (const f of features) byId[f.id] = f;
  const out = { fillable: [], capability_missing: [], unclassified: [] };

  for (const k of KINDS) {
    for (const r of rows[k]) {
      if (!r.gaps.length) continue;
      const key = `${k}:${r.id}`;
      if (k !== 'page') {
        // A nem-lap tengelyeken a népesség MAGA a kódból jön (végpont · művelet · űrlap · nézet),
        // tehát a funkció létezik — ami hiányzik, az a leírás. Ezek definíció szerint pótolhatók.
        out.fillable.push(Object.freeze({ key, gaps: r.gaps, basis: `a ${k} tengely népessége a KÓDBÓL jön, tehát a funkció létezik — a leírás pótolható` }));
        continue;
      }
      const sajat = byScreen[r.id] || [];
      const mukodo = sajat.filter((f) => f.status === 'working' || f.status === 'demo');
      const tervezett = sajat.filter((f) => f.status === 'planned');
      if (mukodo.length) {
        out.fillable.push(Object.freeze({ key, gaps: r.gaps,
          basis: `a képernyőn MŰKÖDŐ funkció áll (${mukodo.map((f) => f.id).join(', ')}) — a hiányzó leírás/GYIK/bemutató megírható` }));
      } else if (tervezett.length && tervezett.every((f) => typeof f.missing_capability === 'string' && f.missing_capability.length > 20)) {
        out.capability_missing.push(Object.freeze({ key, gaps: r.gaps,
          basis: `nincs működő funkció a képernyőn; a hiány NEVESÍTVE a regiszterben (${tervezett.map((f) => f.id).join(', ')})`,
          reason: tervezett.map((f) => f.missing_capability).join(' · ') }));
      } else {
        out.unclassified.push(Object.freeze({ key, gaps: r.gaps,
          basis: tervezett.length
            ? `TERVEZETT bejegyzés van (${tervezett.map((f) => f.id).join(', ')}), de nem NEVEZI MEG a hiányzó képességet (\`missing_capability\`)`
            : 'se MŰKÖDŐ funkció, se NEVESÍTETT terv nem tartozik a képernyőhöz' }));
      }
    }
  }

  // A BEMUTATÓ-TENGELY: a hiány MŰKÖDŐ funkciókon áll (a leltár csak azokat kérdezi), tehát
  // pótolható. A `tour_note` ettől nem lesz teljesítés (CLAUDE.md: a `tour: null` nem teljesítés) —
  // viszont MEGKÜLÖNBÖZTETJÜK a NEVEZETT és a NÉMA hiányt: amiről nincs indok, az osztályozatlan.
  for (const t of tourRows) {
    if (t.how !== 'note_only' && t.how !== 'none') continue;
    const f = byId[t.feature];
    const indok = f && typeof f.tour_note === 'string' && f.tour_note.length > 10;
    const key = `tour:${t.feature}`;
    if (indok) {
      out.fillable.push(Object.freeze({ key, gaps: Object.freeze(['nincs saját bemutató']),
        basis: 'MŰKÖDŐ funkció, a hiány INDOKA a regiszterben áll — a bemutató pótolható (az indok nem teljesítés)', reason: f.tour_note }));
    } else {
      out.unclassified.push(Object.freeze({ key, gaps: Object.freeze(['nincs saját bemutató']),
        basis: 'MŰKÖDŐ funkció bemutató NÉLKÜL, és a regiszterben nincs kimondott indok (`tour_note`)' }));
    }
  }
  const total = out.fillable.length + out.capability_missing.length + out.unclassified.length;
  return Object.freeze({
    fillable: Object.freeze(out.fillable),
    capability_missing: Object.freeze(out.capability_missing),
    unclassified: Object.freeze(out.unclassified),
    total,
  });
}

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
export function pagesFrom({ pageLabels, navGroups = [], navAdmin = null, navPersonal = [], sitemap = null, uiSources = [] }) {
  const inMenu = new Map();
  const add = (group, pages, which) => { for (const p of pages || []) if (!inMenu.has(p)) inMenu.set(p, { group: group || null, menu: which }); };
  for (const g of navGroups) add(g.group, g.pages, 'business');
  if (navAdmin) add(navAdmin.group, navAdmin.pages, 'admin');
  for (const g of navPersonal) add(g.group, g.pages, 'personal');
  /**
   * AZ ELÉRHETŐSÉG HÁROM KÜLÖN TÉNY (R144 — F144-02). A régi alak EGYET mért (benne van-e a
   * menüben), és abból vont következtetést az oldaltérképre — ráadásul a menü-listát a NYELVCSOMAGBÓL
   * kérte, ahol nincs is (mérve: 0 menütalálat 17 oldalon). A SPEC kikötése: „A külön belépőből
   * elérhető `new` oldal nem lesz hibás pusztán attól, hogy nincs főmenüben; a valós elérési út
   * számít. A menüben szereplés önmagában sem bizonyít működő oldaltérkép-linket."
   *
   * Ezért három MÉRT tény, soha nem összemosva:
   *   · `menu`    — benne van-e valamelyik menü-csoportban (és melyikben);
   *   · `sitemap` — benne van-e a SÚGÓ oldaltérképének népességében (ezt a `help.mjs` SAJÁT
   *     feloldója adja — `sitemapPages`, SMP-01 —, tehát a mérés nem tud elcsúszni a lapétól);
   *   · `entry`   — van-e rá a felületen belépő (`data-go="<oldal>"`), a menün kívül is.
   * Az oldal akkor ELÉRHETETLEN, ha mindhárom hiányzik.
   */
  const smp = sitemap && Array.isArray(sitemap.all) ? new Set(sitemap.all) : null;
  const goTargets = new Set();
  for (const src of uiSources) {
    const re = /data-go="([a-z]+)"/g;
    let m;
    while ((m = re.exec(String(src || ''))) !== null) goTargets.add(m[1]);
  }
  return Object.keys(pageLabels || {}).map((id) => ({
    kind: 'page', id, label: pageLabels[id],
    menu: inMenu.has(id) ? inMenu.get(id).menu : null,
    group: inMenu.has(id) ? inMenu.get(id).group : null,
    // `null` = nem MÉRTÜK (nem adtak oldaltérkép-népességet) — ez NEM azonos a `false`-szal (KUKA-093).
    sitemap: smp ? smp.has(id) : null,
    entry: goTargets.has(id),
  }));
}

/**
 * A HIÁNY-HALMAZ VERDIKTJE — EGY FELOLDÓ, MINDKÉT IRÁNY (LEF-01).
 *
 * KÜLÖN FÜGGVÉNY, mert az ELLENPÁRNAK ezt kell MEGHÍVNIA, nem egy másolatát: egy tükör-implementáció
 * a saját másolatát igazolná vissza (KUKA-068), és amit próba nem tud meghívni, azt bizalomból
 * hinnénk (KUKA-207).
 *
 * `unexpected` = hiány, ami NINCS deklarálva → visszacsúszás vagy új, lefedetlen képesség.
 * `dead`       = deklarált tétel, aminek MÁR NINCS hiánya → a lista nem követte a javítást.
 * A kettő SOHA nincs összemosva: más a teendő (javíts vs. vedd ki a listáról).
 */
export function gapVerdict(gapKeys, declared) {
  const g = [...new Set(gapKeys || [])];
  const d = [...new Set(declared || [])];
  return Object.freeze({
    gapKeys: Object.freeze([...g].sort()),
    unexpected: Object.freeze(g.filter((x) => !d.includes(x)).sort()),
    dead: Object.freeze(d.filter((x) => !g.includes(x)).sort()),
  });
}

/** A TELJES NÉPESSÉG EGY HÍVÁSBAN — a riport és az őr UGYANEZT kapja (KUKA-039). */
export function populationFrom({ serverSource, uiSources, pageLabels, navGroups, navAdmin, navPersonal, sitemap }) {
  return Object.freeze({
    route: Object.freeze(routesFrom(serverSource)),
    page: Object.freeze(pagesFrom({ pageLabels, navGroups, navAdmin, navPersonal, sitemap, uiSources })),
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
export function pageCoverage(page, { features, tours, shellAnchors = new Set() }) {
  const own = features.filter((f) => f.screen === page.id);
  const faq = own.flatMap((f) => f.faq || []);
  // A KÖZÖS TÚRA IS LEFEDÉS — DE CSAK HA TÉNYLEG ODAVISZ (R142 §4): nem a `tour_note` hossza
  // dönt, hanem hogy egy LÉPÉS célja az oldal menüpontja vagy az oldal saját horgonya.
  const anchors = new Set(own.flatMap((f) => f.anchors || []));
  /**
   * ÉS A HORGONYNAK LAP-SPECIFIKUSNAK KELL LENNIE (R164/3 — SAJÁT LELET, KUKA-239 osztálya).
   *
   * A LELET, AMIT A SAJÁT MÉRÉSEM ADOTT: a `list-rows` és a `list-search` horgonyt ÖT lap funkciói
   * deklarálják (termékek · partnerek · bizonylatok · raktárak · folyamatok), mert mind ugyanazon a
   * tábla-rajzolón megy át. Amikor az R164-ben megírtam a `tour.warehouses` bemutatót, és annak egy
   * lépése a `list-rows`-ra mutatott, a régi szabály a TERMÉKEK, a PARTNEREK és a BIZONYLATOK lapját
   * is „bejártnak" mondta — pedig a bemutató oda SOHA nem ment el. Három lap zöldült ki egy olyan
   * bizonyítéktól, ami nem róluk szól (KUKA-239: a hatókör nélküli minta a szomszéd sort igazolja).
   *
   * A SZABÁLY: horgony CSAK akkor azonosít lapot, ha MÁS lap funkciói NEM deklarálják. A menüpont
   * (`nav-<lap>`) és a bemutató kimondott lapja (`t.page`) változatlanul azonosít.
   */
  const masLapHorgonyai = new Set();
  for (const f of features) {
    if (f.screen === page.id) continue;
    for (const h of f.anchors || []) masLapHorgonyai.add(h);
  }
  // ÉS A HÉJ VEZÉRLŐI SEM AZONOSÍTANAK LAPOT (R164/3): a profil-menü, a kijelentkezés, a
  // fiókválasztó és a súgó-nyitó MINDEN lapon ott áll — egy rájuk mutató lépés nem bizonyítja,
  // hogy a bemutató EZEN a lapon volt. A lista a regiszterben, kimondva (`SHELL_ANCHORS`).
  const lapSpecifikus = new Set([...anchors]
    .filter((h) => !masLapHorgonyai.has(h) && !shellAnchors.has(h)));
  const touring = Object.values(tours).filter((t) => (t.steps || []).some((s) => s.target === `nav-${page.id}` || lapSpecifikus.has(s.target))
    || t.page === page.id);
  /**
   * AZ ELÉRHETŐSÉG MOST MÁR A HIÁNYOK KÖZÉ IS BEKERÜL (R144 — F144-02). A régi alak kiírta a
   * `sitemap` mezőt, de SOHA nem tette a `gaps`-be — tehát az oldaltérkép ellenőrzése nem volt
   * igazolt: egy elérhetetlen oldal is zöldnek látszott (KUKA-012: a kimondatlan hiány néma).
   * A három tény külön szerepel, és a hiány CSAK akkor áll be, ha MINDHÁROM út hiányzik.
   * A NEM MÉRT (`null`) oldaltérkép nem „hiányzik": azt nevezetten kimondjuk.
   */
  const elerheto = page.menu !== null || page.sitemap === true || page.entry === true;
  const smpMert = page.sitemap !== null && page.sitemap !== undefined;
  return {
    kind: 'page', id: page.id, label: page.label, menu: page.menu, group: page.group,
    screen_feature: own.length ? own.map((f) => f.id) : [],
    faq: uniq(faq),
    tour: touring.map((t) => t.id),
    sitemap: page.sitemap ?? null,
    entry: page.entry === true,
    reachable: elerheto,
    gaps: [
      ...(own.length ? [] : ['nincs funkció-leírás erre a képernyőre (FEATURES.screen)']),
      ...(faq.length ? [] : ['nincs hozzá kötött gyakori kérdés']),
      ...(touring.length ? [] : ['nincs bemutató, ami ezt az oldalt érinti']),
      ...(elerheto ? [] : ['az oldal SEHONNAN nem érhető el: nincs a menüben, nincs az oldaltérképen, és nincs rá belépő']),
      ...(smpMert ? [] : ['az oldaltérkép-népesség NEM volt megmérve (a hívó nem adta át) — ez nem hiány, hanem ELAKADT MÉRÉS']),
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
/**
 * A TISZTÁN TECHNIKAI MŰVELETEK — KIMONDVA, NEM NÉMÁN KIVÉVE (R144 — F144-01).
 *
 * MI VOLT A BAJ. A régi `HOUSEKEEPING_ACTIONS` harmincnégy műveletet vett ki a vizsgálatból, és
 * köztük VALÓDI FELHASZNÁLÓI mozdulatok is voltak — keresés, sor- és részlet-megnyitás, új chat.
 * A SPEC kikötése: ezek „a szülőfunkció sorában kaphatnak lefedést, de ne tűnjenek el a
 * vizsgálatból. Belső technikai művelethez nem kell külön súgóoldal."
 *
 * MOSTANTÓL KÉT KÜLÖN OSZTÁLY, és mindkettő LÁTSZIK:
 *   · a felületi mozdulatok a SZÜLŐFUNKCIÓ deklarációjából kapnak kötést (`FEATURES.ui_actions`),
 *     tehát a funkció sorában elszámolva, nem kivéve;
 *   · és CSAK az alábbi kettő tisztán technikai — a panel és a menü bezárása nem képesség.
 * Ami egyikbe sem esik, az HIÁNY (nem „valószínűleg rendben").
 */
export const TECHNICAL_ACTIONS = Object.freeze([
  Object.freeze({ id: 'panel-close', why: 'a modális panel bezárása — a panelt megnyitó KÉPESSÉG sorában számol el' }),
  Object.freeze({ id: 'nav-close', why: 'a mobil menü bezárása — a menü maga a héj navigációja (shell.navigation)' }),
]);
export const TECHNICAL_ACTION_IDS = Object.freeze(TECHNICAL_ACTIONS.map((x) => x.id));

/**
 * EGY FELÜLETI MŰVELET LEFEDÉSE — KIZÁRÓLAG DEKLARÁCIÓBÓL (R144 — F144-01, MÉRVE).
 *
 * A KIVEZETETT ALAK ÉS A MÉRT KÁR. Az R143-ban kötőjellel határolt rész-szóra illesztettem
 * (`revoke` ↔ `member-revoke`), hogy egy hamis hiányt megszüntessek. A külső ellenőrző fél
 * (chatgpt-v3, R144/F144-01) ezt ELLENPÁRRAL megfogta, és itt visszamértem:
 * `actionCoverage({id:'revoke'}, { features: FEATURES.filter(f => f.id !== 'members.revoke') })`
 * **továbbra is `gaps: []`-t adott** — a `members.scopeRevoke` (`member-scope-revoke-`) és az
 * `invite.revoke` (`invite-revoke-confirm`) horgonyai alapján. Vagyis a tagság-megszüntetés
 * kötésének ELTÁVOLÍTÁSA zöld maradt, mert két MÁS visszavonás létezik: a rész-szó összekeverte a
 * külön műveleteket. Egy hamis negatívot hamis pozitívra cseréltem (KUKA-066 · KUKA-285 rokona:
 * amit egy karakter-szabály mér, az hasonlóság, nem azonosság).
 *
 * A MAI SZABÁLY: a kötést a FUNKCIÓ MONDJA KI (`ui_actions`), és a mérés CSAK ezt fogadja el. Így a
 * művelet → képesség kötés pontos és forrásból ellenőrizhető: a művelet-azonosítók a FORRÁSBÓL
 * jönnek (`data-action`), a kötés a REGISZTERBŐL, és a verifier MINDKÉT irányban mér — egy
 * deklarált, de nem létező művelet ugyanúgy piros, mint egy nem deklarált létező.
 */
export function actionCoverage(action, { features }) {
  const tech = TECHNICAL_ACTIONS.find((x) => x.id === action.id);
  if (tech) {
    return {
      kind: 'action', id: action.id, technical: true, why: tech.why,
      features: [], gaps: [], evidence: EVIDENCE.source,
    };
  }
  const hit = features.filter((f) => (f.ui_actions || []).includes(action.id));
  return {
    kind: 'action', id: action.id, technical: false,
    features: hit.map((f) => f.id),
    gaps: hit.length ? [] : ['megnyomható művelet, amit egyetlen funkció sem mond a magáénak (FEATURES.ui_actions)'],
    evidence: hit.length ? EVIDENCE.source : EVIDENCE.missing,
  };
}

/**
 * A DEKLARÁCIÓ MÁSIK IRÁNYA (R144): deklarált művelet, ami a FORRÁSBAN nem létezik. Elírás vagy
 * kivezetett gomb — mindkettő azt jelenti, hogy a tudás nem létező dologról beszél (KUKA-050).
 */
export function declaredReadsNotInSource(features, population) {
  const letezo = new Set((population || []).map((r) => r.id));
  const out = [];
  for (const f of features) for (const e of f.reads || []) if (!letezo.has(e)) out.push(`${f.id} → ${e}`);
  return Object.freeze(out.sort());
}

export function declaredActionsNotInSource(features, population) {
  const letezo = new Set((population || []).map((a) => a.id));
  const out = [];
  for (const f of features) for (const a of f.ui_actions || []) if (!letezo.has(a)) out.push(`${f.id} → ${a}`);
  return Object.freeze(out.sort());
}


/**
 * EGY VÉGPONT LEFEDÉSE. A kötés a funkció `authority.endpoint` mezője — ez mondja meg, HOL dől el a
 * kérdés (KUKA-047). A `dev`-végpontok NEVEZETTEN kimaradnak: fejlesztői felület, nem képesség.
 */
export function routeCoverage(route, { features }) {
  if (route.dev) {
    return { kind: 'route', id: route.id, dev: true, features: [], gaps: [], evidence: EVIDENCE.source };
  }
  /**
   * A KÖTÉS KÉT HELYRŐL JÖHET (R144): az `authority.endpoint` azt mondja meg, HOL DŐL EL a jog (egy
   * végpont), a `reads` pedig a funkciót kiszolgáló TÁMOGATÓ olvasásokat. A felület több végpontot
   * hív, mint amennyit a jog-kérdés megnevez — a mérés joggal mondta, hogy ezekről a tudás nem
   * beszél, de a megoldás NEM egy második jog-forrás, hanem a kiszolgáló hívások KIMONDÁSA.
   */
  const hit = features.filter((f) => (f.authority && String(f.authority.endpoint || '').startsWith(route.id))
    || (f.reads || []).includes(route.id));
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
 * A BEMUTATÓ-LEFEDÉS: EXPLICIT KÖTÉS, ÉS CSAK A VALÓDI LÉPÉS SZÁMÍT (R144 — F144-01(a), MÉRVE).
 *
 * A KIVEZETETT ALAK ÉS A MÉRT KÁR. Az R143-as alakom AZ ELSŐ egyező horgonyból minősített „shared"-nek,
 * és a külső ellenőrző fél (chatgpt-v3, R144) három hamis pozitívot mutatott, amiket itt visszamértem:
 *   · `shell.assistant` → `tour.shell` s5, cél `help-open` — a SÚGÓGOMB kiemelése nem chat-használat;
 *   · `members.revoke` → `tour.invite` s1, cél `nav-members` — a Felhasználók MENÜPONTJA nem tagság-megszüntetés;
 *   · `auth.verify` → `tour.inviteRevoke` demólevél-lépések — a LEVÉLABLAK nem az e-mail-azonosítás tanítása.
 * Mindhárom MENÜ- vagy MEGNYITÓ-horgonyon állt: a lépés a funkció KÖZELÉBE vitt, de nem végezte el és
 * nem is tanította (KUKA-041: a díszpipa sikert jelent arról, ami meg sem történt).
 *
 * A MAI SZABÁLY — HÁROM FELTÉTEL, MIND KIMONDOTT:
 *   1. a kötést a FUNKCIÓ deklarálja (`shared_tour: { tour, steps }`) — nincs találgatás;
 *   2. a bemutató és MINDEN deklarált lépés LÉTEZIK (elírás és kivezetett lépés egyformán piros);
 *   3. és legalább egy deklarált lépés VALÓDI: vagy `task`-ot hordoz (TÉNYLEGESEN elvégzi a műveletet),
 *      vagy a funkció kimondott MUNKAFELÜLETÉRE mutat (`surface`) — ami nem menü és nem megnyitó.
 *
 * MIÉRT KELL a `surface`, és miért nem elég a `task`: egy OLVASÓ képességnél (ár-panel, tag-lista,
 * levél-fogadó) nincs task, a megtekintés MAGA a használat. A `surface` ezt KIMONDJA, a funkció
 * oldalán — így ugyanaz a lépés a `shell.demo_mail`-t fedi (a levélablak a funkciója), az
 * `auth.verify`-t viszont NEM (annak a munkafelülete a levélben lévő hivatkozás).
 *
 * AMIT EZ NEM: nem „31 túra" (az R142 kikötése). A közös út továbbra is elfogadható — csak
 * KIMONDOTTAN és valódi lépéssel.
 */
export function tourCoverage(feature, { tours }) {
  if (feature.tour && tours[feature.tour]) {
    return { feature: feature.id, how: 'own', tour: feature.tour, steps: (tours[feature.tour].steps || []).map((s) => s.id), evidence: EVIDENCE.source, problems: Object.freeze([]) };
  }
  const d = feature.shared_tour || null;
  if (!d) {
    return { feature: feature.id, how: 'none', tour: null, steps: [], evidence: EVIDENCE.missing, problems: Object.freeze([]) };
  }
  const t = tours[d.tour];
  const problems = [];
  if (!t) problems.push(`a deklarált bemutató nem létezik: ${d.tour}`);
  const steps = [];
  const surface = feature.surface || null;
  let valodi = null;
  for (const id of d.steps || []) {
    const st = t ? (t.steps || []).find((x) => x.id === id) : null;
    if (!st) { problems.push(`a deklarált lépés nem létezik: ${d.tour}/${id}`); continue; }
    steps.push(id);
    if (st.task) { valodi = valodi || `task:${st.task}`; continue; }
    if (surface && st.target === surface) { valodi = valodi || `surface:${st.target}`; continue; }
  }
  if (!problems.length && !valodi) {
    problems.push('a deklarált lépések egyike sem VALÓDI: nincs köztük task-ot hordozó, és egyik sem a '
      + `kimondott munkafelületre mutat (surface: ${surface || 'NINCS deklarálva'})`);
  }
  if (problems.length) {
    return { feature: feature.id, how: 'declared_invalid', tour: d.tour, steps, evidence: EVIDENCE.missing, problems: Object.freeze(problems) };
  }
  return { feature: feature.id, how: 'shared', tour: d.tour, steps: Object.freeze(steps), proof: valodi, evidence: EVIDENCE.source, problems: Object.freeze([]) };
}


/**
 * A TELJES LEFEDÉSI LELTÁR. A hívó a forrásokat és a regisztereket adja; a modul a SOROKAT.
 * `gaps` = minden nevezett hiány, fajtánként csoportosítva — ez a lefedési őr bemenete.
 */
export function inventory({ population, features, tours, shellAnchors = new Set() }) {
  const rows = {
    route: population.route.map((r) => routeCoverage(r, { features })),
    page: population.page.map((p) => pageCoverage(p, { features, tours, shellAnchors })),
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
  // A HIÁNY-KULCSOK — a deklarált nyitott halmazhoz mérve, MINDKÉT irányban (LEF-01).
  const gapKeys = [];
  for (const k of KINDS) for (const r of rows[k]) if (r.gaps.length) gapKeys.push(`${k}:${r.id}`);
  for (const t of tourRows) if (t.how === 'note_only' || t.how === 'none') gapKeys.push(`tour:${t.feature}`);
  const verdict = gapVerdict(gapKeys, GAP_BASELINE.keys);
  const classes = classifyGaps({ rows, tourRows, features });
  return Object.freeze({ rows, tourRows, counts, floorBreaks, classes, ...verdict });
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
