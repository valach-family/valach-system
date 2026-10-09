// v3app/public/tour.mjs — TUR-01: A KATTINTHATÓ BEMUTATÓ (R89 §4).
//
// MIT TESZ: a VALÓDI képernyőn, stabil azonosítóval jelölt elemre mutat, lépésenként egy célt
// magyaráz, és a Vissza · Tovább · Befejezés · Kilépés úton végig billentyűzettel is használható.
//
// ÉS AMIT SOHA NEM TESZ — ez a lényeg, kódban:
//   · NEM kattint mentésre, meghívásra, jóváhagyásra, jogadásra vagy törlésre. A modul a DOM-ban
//     semmit nem aktivál: csak KIEMEL és MAGYARÁZ (`highlight`), a műveletet a felhasználó végzi el
//     a rendes felületen;
//   · a FELADATHOZ KÖTÖTT lépés (`task`) CSAK igazolt siker után halad tovább: a gomb megnyomása
//     önmagában NEM siker. Az igazolást az `app.js` adja meg (`taskDone`), és azt a SZERVER válasza
//     alapján teszi — nem a kattintás alapján (KUKA-129: a nyugtának is igazat kell mondania);
//   · az „ÁTUGROTT" NEM „ELVÉGEZETT": a lépés állapota három szó (`pending` · `done` · `skipped`),
//     és a zárás KIÍRJA, mi maradt el;
//   · a HIÁNYZÓ CÉL, a MEGSZŰNT JOG és a MÁSIK FIÓK nevezetten MEGSZAKÍTJA a bemutatót — nem
//     mutogat a semmibe (KUKA-201: a nemleges válasz vigye a működő folytatást).
//
// AZ ELŐREHALADÁS MINIMÁLIS ÁLLAPOT, és a SZEMÉLYHEZ + FIÓKHOZ + BEMUTATÓ-VERZIÓHOZ kötött. Nem
// tároljuk el a böngészőben: kijelentkezés vagy személyváltás után más NEM láthatja (R89 §4).
import { TOURUI, PAGE } from './texts.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** A lépés HÁROM állapota — az „átugrott" nem „elvégezett". */
export const STEP_STATES = Object.freeze(['pending', 'done', 'skipped']);

/**
 * A TÁJÉKOZTATÓ VÁRAKOZÁS — EGY OTTHON, MERT HÁROM OLVASÓJA VAN (R158/2 · KUKA-003 · KUKA-039).
 *
 * A `tour-pending` eddig EGYET jelentett: „a felhasználónak tennie kell valamit". Az elvégzett lépés
 * becsukott panelje viszont NEM teendő, csak tájékoztatás — a dolga megtörtént, a Tovább visz. Ezt a
 * különbséget HÁROM hely olvassa: a lap (a mondat), és KÉT próba-járó (`tests/e2e/v3app-r93.spec.mjs`
 * és `tools/v3_demo_walk_proof.mjs`). MÉRVE: amíg a különbség nem állt a DOM-ban, mindkét járó a
 * kezelőt hívta újra meg újra, és a pörgés-őrön bukott ki — a lelet helyett a mérő hibájáról beszélt.
 * Ezért a tény a KIMENETBEN áll (`data-actionable`), és a lista ITT, egy helyen.
 */
export const INFORMATIONAL_PENDING = Object.freeze(['targetPendingDone']);

/** A bemutató futó állapota. `null` = nincs futó bemutató. */
export function newTourRun({ def, view, role }) {
  if (!def || !Array.isArray(def.steps) || !def.steps.length) return null;
  return {
    id: def.id,
    version: def.version,
    feature: def.feature,
    page: def.page ?? null,
    requires_role: def.requires_role ?? null,
    // A MEGHÍVÓ KÉPERNYŐJÉHEZ KÖTÖTT bemutató (P109-01): a képernyője a beváltás után megszűnik, ezért
    // a lezárása nem kínál újraindítást, és a belépés felé elhagyott futás NEVEZETTEN ér véget.
    requires_invite: def.requires_invite === true,
    steps: def.steps.map((s) => ({ ...s, state: 'pending' })),
    text: def.text || null,
    at: 0,
    // A NÉZET, AMIBEN INDULT — a bemutató ehhez tartozik, és nézet-váltásnál MEGÁLL (KTX-03 alakja).
    view: { book: view.book ?? null, subject: view.subject ?? null },
    /**
     * ÉS A TÖRTÉNET OTTHONA KÜLÖN IS MEGMARAD (R176, külső review P2 · `KUKA-441`).
     *
     * A `view` a futás közben ÁTKÖTŐDIK (`rebindView`), tehát nem mondja meg, HOL indult a
     * történet. A FIÓK-tengelyes lépések célja viszont mind ugyanaz: a történet CÉGE — oda tér
     * vissza a belépő a személyes köréből. Ez a mező ezért a KEZDŐ könyvet őrzi, és SOHA nem
     * kötődik át: a fiók-váltó kapu ehhez mér.
     */
    origin_book: view.book ?? null,
    /**
     * ÉS A KEZDŐ ALANY IS MEGMARAD (R186 §2) — ugyanaz az indok, mint az `origin_book`-nál.
     *
     * A `view.subject` a futás közben ÁTKÖTŐDIK (`rebindView`), tehát nem mondja meg, KI indította
     * a történetet. A VISSZATÉRŐ váltás-lépések célja viszont pontosan ő: a kezelő, aki a meghívást
     * visszavonta, majd a levél megtekintése után visszajön. Ez a mező ezért a KEZDŐ alanyt őrzi,
     * és SOHA nem kötődik át — a személy-tengelyes kapu ehhez mér, ha a lépés `origin_actor`-t kér.
     */
    origin_subject: view.subject ?? null,
    /**
     * A TÖRTÉNET CÉL-KÖTÉSE — a SZERVER választotta ki, a lap csak hordozza (R186 §2 · AST-01).
     *
     * `{ kind: 'invite' | 'member', ref, actor }`. A `ref` a választott meghívó stabil jelölője
     * (a token sha256-lenyomatának első tíz jegye — a token NEM állítható vissza belőle), illetve a
     * választott tag azonosítója; az `actor` a történetben VÁRT résztvevő. Jogot egyik sem ad: a
     * bemutató állapota nem jogosultság, a szerver saját ellenőrzése minden műveleten lefut
     * (`KUKA-227`). Nyilatkozat nélkül `null`, és akkor a rá épülő kapuk ZÁRNAK (`KUKA-236`).
     */
    story: def.story && typeof def.story === 'object'
      ? { kind: def.story.kind ?? null, ref: def.story.ref ?? null, actor: def.story.actor ?? null,
        // A MÁSODIK KÖTÉS-REKESZ (R186 §5): a történet SAJÁT lépése által kiállított meghívó
        // jelölője. A kiszolgáló ezt NEM adja — a futás közben születik, igazolt művelet után.
        invite_ref: null }
      : null,
    role: role ?? null,
    endedBy: null,
  };
}

/**
 * A LÉPÉS CÉLJÁNAK FELOLDÁSA — EGY HELYEN (R140, ACT-01).
 *
 * A felületi pontok túlnyomó része `data-testid`-del áll, és ez marad az alapeset. Van viszont
 * olyan cél, ami NEM egyetlen konkrét elem, hanem SZEREP: „az a vezérlő, amivel a néző átvált a
 * másik szereplőre". Ezt a lap mondja meg magáról (`data-tour-anchor`), mert felületenként MÁS
 * elem tölti be — a bemutató lapján a váltó gomb, éles üzemben pedig nincs ilyen vezérlő, mert
 * ott a másik ember a SAJÁT eszközén lép be. A szemantikus horgony tehát nem kibúvó a testid alól:
 * a cél NEVE a szerződés, a megvalósítója a lapé. Egy feloldó, négy hívó (KUKA-003 · KUKA-039).
 */
/**
 * …ÉS A SZEMANTIKUS HORGONYT TÖBB VEZÉRLŐ IS BETÖLTHETI — A LÁTHATÓ AZ ÉRVÉNYES (R176 §1, MÉRVE).
 *
 * A LELET. A szereplő-váltás vezérlője az alkalmazás-héjban a profil-menü kijelentkezése, a
 * MEGHÍVÓ-KÉPERNYŐN viszont a saját „kijelentkezés és belépés más fiókkal" gombja — ugyanaz a
 * SZEREP, két képernyő, két elem. A régi alak az ELSŐ találatot adta vissza, a `targetOf` pedig a
 * rejtett elemre `null`-t ad: a bemutató így a meghívó-képernyőn a HÉJ (épp rejtett) gombját
 * találta meg, és a váltás-lépés egy ÉP képernyőn vált elérhetetlenné. MÉRVE: a két szereplős
 * történet a 9. lépésén állt meg, pont a visszaváltás előtt.
 *
 * A VÁLASZ: a horgony SZEREP, és egy képernyőn pontosan egy vezérlő tölti be — tehát a feloldó a
 * LÁTHATÓT választja. Ha egy sincs látható, az ELSŐ találat jön vissza változatlanul: így a
 * „rejtett cél" és a „nem létező cél" különbsége megmarad (`targetPending` vs `targetMissing`),
 * és az egy-jelöltes eset viselkedése betűre ugyanaz (`KUKA-003`: egy feloldó, négy hívó).
 */
function elementFor(name) {
  if (!name) return null;
  const jeloltek = [
    ...document.querySelectorAll(`[data-testid="${name}"]`),
    ...document.querySelectorAll(`[data-tour-anchor="${name}"]`),
  ];
  if (jeloltek.length === 0) return null;
  return jeloltek.find((el) => isShown(el)) || jeloltek[0];
}

/**
 * LÁTSZIK-E AZ ELEM — EGY FELOLDÓ, NÉGY HÍVÓ (KUKA-003 · KUKA-039).
 *
 * Ugyanez a feltétel eddig NÉGY helyen állt szó szerint lemásolva (`targetOf`, az `appears_after`
 * ág, a menü-cél és a ☰ vizsgálata). A másolat azért veszélyes, mert a `revealerOf` és a
 * `targetOf` döntése EGYMÁSHOZ van mérve: ha a kettő nem UGYANAZT a szót használja a
 * „látszik"-ra, akkor keletkezik olyan állapot, amiben a cél nem cél, de feltárni sem kell —
 * és a bemutató egy ÉP képernyőn áll meg. Ezért innentől egy név.
 */
/**
 * A „LÁTSZIK" EGY SZÓ — ÉS MOSTANTÓL A BÖNGÉSZŐ MONDJA KI (R176, külső review P2 — MÉRVE).
 *
 * A LELET. Ez a feloldó eddig HEURISZTIKÁVAL döntött (`hidden` · `offsetParent` · kliens-keret), és
 * egy CSUKOTT `<details>` ezt megcsalja: a lenyíló tartalma MEGTARTJA a layout-keretét. MÉRVE a
 * profilmenü kijelentkezés-gombján, csukott menü mellett: `hidden=false` · `offsetParent≠null` ·
 * `rects=1` · `box=258×42` · `visibility=visible` — tehát a régi alak szerint „LÁTSZIK", miközben a
 * böngésző hiteles válasza `checkVisibility() = false`, és a Playwright is `latszik=false`-ot mond.
 *
 * A KÁR. Az R176 §1-ben a szereplő-váltó horgony a VALÓDI kijelentkezés lett — az pedig ebben a
 * csukott menüben áll. A `targetOf` így a REJTETT gombot adta célként, a buborék KIEMELTE, és azt
 * írta, hogy „válts át a kiemelt gombbal" — egy olyan vezérlőre, amit a néző nem lát és nem tud
 * megnyomni. Zsákutca, pontosan a `KUKA-335` tünetével, csak egy ÚJ ajtón. A saját bejáró próbám
 * ELREJTETTE, mert maga nyitotta ki a menüt (`KUKA-120`).
 *
 * MOSTANTÓL a kérdést a BÖNGÉSZŐ dönti el (`Element.checkVisibility`), és a heurisztika csak
 * TARTALÉK azokra a futtatókra, ahol az API nincs meg — mérni kell, nem kitalálni (`KUKA-215`).
 */
function isShown(el) {
  if (!el) return false;
  if (el.hidden) return false;
  if (typeof el.checkVisibility === 'function') {
    return el.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true });
  }
  return !(el.offsetParent === null && el.getClientRects().length === 0);
}

/** A célelem a MAI képernyőn — `null`, ha nem látható (akkor a bemutató nevezetten megáll). */
export function targetOf(run) {
  if (!run) return null;
  const step = run.steps[run.at];
  if (!step) return null;
  const el = elementFor(step.target);
  if (!el) return null;
  // A REJTETT ELEM NEM CÉL: egy `hidden` gombra mutatni ugyanolyan hazugság, mint a nem létezőre.
  if (!isShown(el)) return null;
  return el;
}

/**
 * A CÉLT FELTÁRÓ ELEM — `null`, ha a lépés nem deklarál feltárót, vagy az sincs a lapon.
 *
 * MIÉRT KELL (KUKA-228). A bemutató SOHA nem kattint, tehát a panelen belüli cél (a meghívó
 * e-mail mezője, a súgó fülei, a céges adószám-mező) a lépés pillanatában MÉG NEM LÉTEZIK — a
 * felhasználónak előbb meg kell nyitnia. A régi alak ezt `targetMissing`-nek minősítette, és
 * MEGSZAKÍTOTTA a bemutatót egy teljesen ép képernyőn: a mondat („eltűnt a képernyőről") HAMIS
 * volt, a cél nem eltűnt, hanem még nem jelent meg. Ezért a lépés KIMONDJA, mi tárja fel
 * (`appears_after`), és a bemutató a feltáró gombot emeli ki, majd MEGVÁRJA a felhasználót.
 */
export function revealerOf(run) {
  if (!run) return null;
  const step = run.steps[run.at];
  if (!step) return null;
  if (step.appears_after) {
    const el = elementFor(step.appears_after);
    if (!el) return null;
    if (!isShown(el)) return null;
    return el;
  }
  /**
   * A CSUKOTT LENYÍLÓ NYITÓJA IS FELTÁRÓ (R176, külső review P2 — MÉRVE).
   *
   * A LELET (chatgpt-codex, az `fb231e6` fejen): az R176 §1-ben a szereplő-váltó horgonyt a VALÓDI
   * kijelentkezésre tettem — az viszont a profilmenü `<details>`-ében áll, ami ALAPBÓL CSUKOTT.
   * A `targetOf` így nem látja, a két addigi feltáró-ág (deklarált `appears_after` · bal menü) nem
   * fogja meg, tehát a lépés `targetMissing`-gel megszakadt: a buborék egy olyan vezérlőre küldte a
   * nézőt, ami a lapon OTT VAN, de egy csukott lenyíló belsejében — és a saját bejáró próbám ezt
   * ELREJTETTE, mert maga nyitotta ki a menüt. MÉRVE: a próba a néző útján 15 s lejárattal bukott,
   * pontosan a `KUKA-335` tünetével.
   *
   * A SZABÁLY UGYANAZ, MINT A MOBIL MENÜNÉL, csak általánosabban: ha a cél egy CSUKOTT `<details>`
   * belsejében van, és a NYITÓJA látszik, akkor a nyitó a feltáró. Így a profilmenü, a fiókválasztó
   * és minden későbbi lenyíló EGY szabályból kap feltárást (`KUKA-003` · `KUKA-039`), és a bemutató
   * továbbra sem kattint a néző helyett (`KUKA-228`).
   */
  {
    const t0 = elementFor(step.target);
    if (t0 && !isShown(t0)) {
      const d = t0.closest('details');
      if (d && d.open !== true) {
        const sum = d.querySelector('summary');
        if (sum && isShown(sum)) return sum;
      }
    }
  }
  // ── A MOBIL MENÜ UGYANEZ A FOGALOM (R138, MÉRVE 390 px-en) ─────────────────────────────────
  //
  // A LELET (saját mérés a bemutató átvételi bejárásán): keskeny képernyőn a bal menü a ☰ gomb
  // mögé csukódik, tehát a `nav-members` a lapon OTT VAN, de NEM LÁTHATÓ. A bemutató emiatt
  // `targetMissing`-gel MEGÁLLT — „az útmutatóban megnevezett elem nem látható ezen a képernyőn" —,
  // és a KÉT történet EGYIKE SEM volt végigvihető telefonon. A felület ép volt: a cél nem eltűnt.
  //
  // AZ OK VISZONT NEM EZ AZ ÁG VOLT, ÉS EZT KI KELL MONDANI (saját mérés, ugyanaz a kör). A MA
  // szállított bemutatók MINDEGYIKÉNEK a menü-célja a SAJÁT oldalára mutat (`tour.invite` ·
  // `tour.stock` · `tour.grant` · `tour.scopeLifecycle` · `tour.inviteRevoke` · `tour.reentry` ·
  // `tour.plan` — mérve a `v3app/knowledge/features.mjs`-ből), tehát a cél MINDIG
  // `aria-current="page"`, és a lenti kilépés miatt ez az ág egyetlen mai bemutatóval sem érhető el.
  // A 390 px-es megszakadást a HARMADIK ÁLLAPOT hiánya okozta (`navIntentFulfilled`, lentebb).
  //
  // EZ AZ ÁG EZÉRT NEVEZETTEN ELŐRE SZÓL: akkor lép működésbe, ha egy bemutató MÁS oldal
  // menüpontjára mutat. Mivel a történet-bejárás nem fedi, a viselkedését a tanú KÖZVETLENÜL hívja
  // meg (`proof:demo-walk` g6–g8) — amit próba nem tud MEGHÍVNI, azt bizalomból hinnénk (KUKA-207).
  // A hiba-osztály ugyanaz, amire az `appears_after` született (KUKA-228), csak itt a feltáró nem a
  // lépésben deklarált gomb, hanem a menü-nyitó.
  //
  // ÉS AZ ŐR SZELLEME VÁLTOZATLAN: a bemutató a menüt sem nyitja ki a felhasználó helyett — a ☰-t
  // KIEMELI, és MEGVÁRJA. A meglévő mondat (`targetPending`) szó szerint ezt mondja ki.
  const target = elementFor(step.target);
  if (!target) return null;                       // tényleg nincs a lapon: ez nem feltárás-eset
  if (isShown(target)) return null;               // látszik: nincs mit feltárni
  if (!target.closest('[data-testid="nav"]')) return null;   // nem a bal menüben van
  // AMI MÁR MEGTÖRTÉNT, AZT NEM KÉRJÜK EL ÚJRA (saját lelet, 390 px-en MÉRVE). A menüpontra mutató
  // lépés CÉLJA az, hogy a felhasználó ODAJUSSON. Telefonon a menü a navigálás UTÁN BECSUKÓDIK,
  // tehát a menüpont megint rejtett lesz — az első alakom emiatt ÚJRA feltárást kért, és a lépés
  // SOHA nem volt lezárható: a „Tovább" minden körben visszaesett a ☰-re. Mérve: a bemutató az
  // 1/4-nél ragadt, akárhányszor nyomták. Ha a menüpont a MAI oldalt jelöli (`aria-current="page"`),
  // a lépés szándéka teljesült — nincs mit feltárni (KUKA-231: a kapu ne kérje el kétszer ugyanazt).
  if (target.getAttribute('aria-current') === 'page') return null;
  const toggle = document.querySelector('[data-testid="nav-toggle"]');
  if (!toggle) return null;
  return isShown(toggle) ? toggle : null;
}

/**
 * A LÉPÉS SZÁNDÉKA MÁR TELJESÜLT — A HARMADIK ÁLLAPOT (R138, 390 px-en MÉRVE, SAJÁT LELET).
 *
 * A LELET. A mobil menü-feltárás és a „ne kérjük el kétszer ugyanazt" szabály EGYMÁSNAK FESZÜLT,
 * és a bemutató emiatt telefonon AZONNAL megállt — a MÁSODIK lépésig sem jutott el. A bemutató a
 * tagok képernyőjén indul, tehát a `nav-members` ott áll `aria-current="page"`-dzsel, viszont a
 * csukott menü miatt REJTETT. Így: `targetOf` → `null` (rejtett, helyesen), `revealerOf` → `null`
 * (nincs mit feltárni, hiszen a felhasználó MÁR ezen az oldalon van — ez is helyes). A `checkRun`
 * viszont csak KÉT szót ismert, ezért a maradékot `targetMissing`-nek minősítette, és azt a
 * HAMIS mondatot írta ki, hogy „az útmutatóban megnevezett elem nem látható ezen a képernyőn".
 * MÉRVE: 390 px-en mindkét történet a 0. lépésen megszakadt, 1280 px-en mindkettő hibátlan volt.
 *
 * A TANULSÁG, amiért ez külön NÉV és nem egy `||`: két igaz tagadásból nem következik a hiba.
 * A „nem cél" és a „nincs feltáró" együtt HÁROM helyzetet takar — a cél eltűnt · a célt fel kell
 * tárni · a cél DOLGA MÁR MEGTÖRTÉNT —, és a harmadiknak is kell SAJÁT szava (KUKA-171: ami
 * megállít, annak neve is legyen; KUKA-201: a nemleges válasz vigye a MŰKÖDŐ folytatást).
 *
 * ÉS AMIT EZ NEM IGAZOL — ez a kapu szűk, szándékosan: csak NAVIGÁCIÓS lépésre áll
 * (`step.task` nélkül). A feladathoz kötött lépést EZ SOHA nem viszi `done`-ra: azt kizárólag a
 * szerver igazolt válasza teheti (`taskDone`) — különben pont azt a hibát építenénk újra, amiért a
 * „Tovább" nem helyettesítheti a visszavonást (KUKA-129 · KUKA-231).
 */
export function navIntentFulfilled(run) {
  if (!run) return false;
  const step = run.steps[run.at];
  if (!step) return false;
  if (step.task) return false;                    // feladatot EZ nem igazol — csak a szerver
  if (step.appears_after) return false;           // deklarált feltáró van: az az út, nem ez
  const el = elementFor(step.target);
  if (!el) return false;                          // tényleg nincs a lapon: ez nem teljesülés
  if (isShown(el)) return false;                  // látszik: a rendes út érvényes, nem ez
  if (!el.closest('[data-testid="nav"]')) return false;
  return el.getAttribute('aria-current') === 'page';
}

/** A lépés VÁRAKOZIK-e a feltárásra: a cél még nincs, de a feltáró elem ott van a lapon. */
export function isPending(run) { return !targetOf(run) && Boolean(revealerOf(run)); }

/**
 * A BEMUTATÓ ÉRVÉNYESSÉGE a MAI állapotban. `ok: false` esetén a `why` a KIÍRANDÓ mondat kulcsa.
 * A négy megszakítási ok kimondva: nézet-váltás · megszűnt jog · hiányzó cél · nincs lépés.
 */
export function checkRun(run, { view, role }) {
  if (!run) return { ok: false, why: 'no_run' };
  if (!run.steps[run.at]) return { ok: false, why: 'no_run' };
  const step = run.steps[run.at];

  /**
   * A SZEREP A LÉPÉSÉ, NEM A BEMUTATÓÉ (R140 — ACT-01).
   *
   * MIÉRT VÁLTOZOTT. Egy teljes történet ÁTÍVEL a szereplőkön: a fiókkezelő visszavon, a MEGHÍVOTT
   * elfogad, a fiókkezelő jogot ad, és a végeredményt megint a meghívott látja. A régi alak a
   * szerepet a bemutatóra kötötte (`requires_role`), ezért egy ilyen történet a második
   * szereplőnél `rightLost`-tal szakadt volna meg — pedig éppen AZ a lépés dolga, hogy más
   * nézzen. A tour szintű `requires_role` MEGMARAD: az az INDÍTÁS feltétele, és a lépés-szint
   * csak ott írja felül, ahol a lépés kimondja.
   */
  // A LÉPÉS SZEREPE CSAK AZ, AMIT A LÉPÉS KIMOND — nincs visszaesés a bemutató szintjére.
  //
  // SAJÁT LELET a végigjáráson. Az első alakom a `run.requires_role`-ra esett vissza, ha a lépés nem
  // mondott szerepet. Egy ÁTÍVELŐ történetben ez hamis: a meghívott ember a saját lépéseinél MÉG NEM
  // TAG (épp azért hívjuk meg), tehát semmilyen cégbeli szerepe nincs — a visszaesés viszont
  // „fiókkezelőt" követelt volna tőle, és a bemutató a váltás-lépésen OSZCILLÁLT (MÉRVE: oda-vissza
  // váltott `actorPending` és `actorWrongRole` között, vég nélkül). A `requires_role` az INDÍTÁS
  // feltétele (ezt az `allowedToursFor` érvényesíti), nem minden lépésé.
  const wantRole = step.role ?? null;
  const sameView = (view.book ?? null) === run.view.book && (view.subject ?? null) === run.view.subject;

  /**
   * A VÁLTÁS-LÉPÉS: ITT A NÉZET VÁLTOZÁSA A FELADAT (ACT-01).
   *
   * Az alany-váltás őre (KTX-03 · KUKA-204 · KUKA-211) VÁLTOZATLANUL érvényes minden MÁS lépésen:
   * ha a néző menet közben mást választ, a bemutató megáll. Ez az ág CSAK ott nyílik ki, ahol a
   * lépés MAGA deklarálja a váltást — tehát a védelem nem tűnik el, hanem NEVEZETT határt kap.
   * A lépés lezárását innen sem ez adja: a `switch_actor` lépés feladathoz kötött (`actor.switched`),
   * és az `app.js` csak a TÉNYLEGES váltás megfigyelése után igazolja (KUKA-231).
   */
  /**
   * AMI MÁR ELVÉGZETT, AZ NEM VÁR SEMMIRE — MINDKÉT ÁGRA (R138 lelete, R140-ben KITERJESZTVE).
   *
   * Az R138-ban ezt a szabályt csak a rendes ágra tettem be, a váltás-ág elé nem. SAJÁT LELET a
   * végigjáráson: a váltás-lépés az ÚJ nézőhöz újrakötve megint „azonos nézetet" látott, ezért egy
   * MÁR ELVÉGZETT lépésre újra váltást kért — a bemutató vég nélkül ugyanazon a lépésen állt.
   * Ugyanaz a hiba-osztály, mint az R138-ban: ha egy szabály két ágon igaz, EGY helyen álljon
   * (KUKA-003 · KUKA-039), különben a következő ág megint kimarad.
   */
  if (step.state === 'done') {
    // ── DE AZ ELVÉGZETT LÉPÉS SEM HALLGAT EL (R158/2 — a SAJÁT R89-06 pirosunk, MÉRVE) ──────────
    //
    // A LELET. A meghívás elküldése után a lépés IGAZOLTAN elvégzett, és a felhasználó Esc-cel
    // becsukja a panelt. A buborék ilyenkor a FELTÁRÓ gombot emelte ki (`highlight` ezt teszi), de
    // MONDATOT nem írt hozzá: a lap némán állt egy olyan kiemelés mellett, aminek a felhasználó nem
    // tudta az okát. „Kiemel VAGY nevezetten vár" — a némaság a harmadik, meg nem engedett válasz
    // (KUKA-228 · KUKA-201: a nemleges válasz is vigye a MŰKÖDŐ folytatást).
    //
    // ÉS A MONDAT MÁS, MERT A HELYZET MÁS (KUKA-050: a szöveg a valóságot követi). A `targetPending`
    // azt mondja, hogy „ez a lépés még nem érhető el" — egy MÁR ELVÉGZETT lépésről ez hazugság
    // volna. Ezért külön mondat (`targetPendingDone`): elvégzett, a részlete a bezárt panelben van,
    // és a Tovább VISZ (a `advance` a `done` lépést átengedi) — a kiút tehát kimondott.
    if (step.switch_actor !== true && isPending(run)) {
      return { ok: true, why: null, pending: 'targetPendingDone' };
    }
    return { ok: true, why: null, pending: null };
  }

  if (step.switch_actor === true) {
    // ── A VÁLTÁS-VEZÉRLŐNEK LÉTEZNIE KELL, KÜLÖNBEN A MONDAT HAZUDIK (R158/2, MÉRVE) ────────────
    //
    // A LELET. A `actorPending` mondata azt írja ki, hogy „válts át a KIEMELT gombbal" — a kiemelés
    // viszont a `targetOf() || revealerOf()` elemre kerül, és ha a váltás-vezérlő nincs a lapon
    // (az alkalmazás-héjban nincs „váltás a másik nézetére" gomb — ezt a `requires_demo` kapu
    // indoklása maga mondja ki), akkor a buborék egy NEM LÉTEZŐ gombra küldi a felhasználót.
    // Zsákutca, működő folytatás nélkül (KUKA-201), és a szöveg nem a valóságot követi (KUKA-050).
    // MÉRVE: a `tour.inviteRevoke` s6 lépése a héjban pontosan ezt tette, és a próba-járó 15
    // másodperces időtúllépéssel bukott — a LELET helyett a mérő hibájáról beszélt.
    //
    // A VÁLASZ: NEVEZETT megszakítás. A `targetMissing` szó szerint azt mondja, ami igaz — „az
    // útmutatóban megnevezett elem nem látható ezen a képernyőn" —, és a lezáró lap kiírja a
    // folytatást (a leírás a Súgóban olvasható marad).
    if (!targetOf(run) && !revealerOf(run)) return { ok: false, why: 'targetMissing' };
    /**
     * ÉS HA A VÁLTÓ VEZÉRLŐ CSAK REJTVE VAN, A MONDAT IS MÁST MOND (R176, külső review P2).
     *
     * Az `actorPending` szövege: „válts át a KIEMELT gombbal". Egy csukott lenyíló nyitójára ez
     * HAMIS volna — a nyitó nem vált, hanem feltár. Ezért amíg a vezérlő nincs kint, a már meglévő
     * `targetPending` mondat jár („előbb nyisd meg a kiemelt gombbal"), és a váltás mondata csak
     * akkor, amikor a vezérlő TÉNYLEGESEN ott van (`KUKA-050` · `KUKA-201`).
     */
    if (sameView && !targetOf(run)) return { ok: true, why: null, pending: 'targetPending' };
    if (sameView) return { ok: true, why: null, pending: 'actorPending' };
    if (wantRole && role !== wantRole) return { ok: true, why: null, pending: 'actorWrongRole' };
    return { ok: true, why: null, pending: null };
  }

  if (!sameView) return { ok: false, why: 'contextChanged' };
  if (wantRole === 'admin' && role !== 'admin') return { ok: false, why: 'rightLost' };

  // A HIÁNYZÓ CÉL KÉT KÜLÖN HELYZET, és a felhasználó teendője is más: FELTÁRÁSRA VÁR (ő nyitja
  // meg) VAGY valóban eltűnt (a bemutató megáll). A kettőt nem mossuk össze (KUKA-228).
  if (!targetOf(run)) {
    if (revealerOf(run)) return { ok: true, why: null, pending: 'targetPending' };
    // A HARMADIK ÁLLAPOT: a lépés dolga már megtörtént (a menüpont a mai oldalt jelöli, csak a
    // csukott mobil menü rejti el). Ez NEM megszakítás — a bemutató mehet tovább.
    if (navIntentFulfilled(run)) return { ok: true, why: null, pending: null };
    return { ok: false, why: 'targetMissing' };
  }
  /**
   * ÉS A TÖRTÉNET CÉLJÁHOZ KÖTÖTT KÉPERNYŐ A VÁLASZTOTT MEGHÍVÓT MUTATJA (R186 §2).
   *
   * A LELET HARMADIK FELE (külső review, Codex, R176 — P2 · a jelentés 7.5/c pontja): a levél-fogadó
   * MINDEN levelet kilistáz. Két függő meghívó mellett a néző az EGYIKET vonja vissza, a bemutató
   * viszont a MÁSIK, még ÉLŐ levelet nyithatja meg — és azt állítja róla, hogy a visszavont meghívó.
   * A visszavonás kötése (`story_bound`) ezt NEM fogja meg: ott a MŰVELET szól egy célra, itt a
   * KÉPERNYŐ.
   *
   * A LÉPÉS KIMONDJA (`story_ref`), hogy a célnak a történet meghívóját kell hordoznia, és a
   * jelölőt a LAP írja ki arról a képernyőről, amit a szerver a bizonyított címzettnek adott
   * (`data-ref`). Eltérésnél NEVEZETT megszakítás — nem csendes továbbmenés (`KUKA-012`).
   *
   * FAIL-CLOSED, ÉS KIMONDOTTAN: ha nincs cél-kötés, vagy a képernyő nem hordoz jelölőt, a kapu
   * ZÁR. A „nem tudom" nem eshet némán „jó lesz"-re (`KUKA-049` · `KUKA-236`).
   */
  if (step.story_ref === true) {
    const kell = (run.story && run.story.ref) || null;
    const kint = targetOf(run).getAttribute('data-ref') || null;
    if (!kell || !kint || String(kint) !== String(kell)) return { ok: false, why: 'storyTargetMismatch' };
  }
  return { ok: true, why: null, pending: null };
}

/**
 * A VÁLTÁS MEGTÖRTÉNT-E (ACT-01). Az `app.js` ezzel dönti el, igazolhatja-e a váltás-lépést.
 * NEM elég, hogy a szerep stimmel: az ALANYNAK is másnak kell lennie, különben a „váltás" egy
 * helyben állás volna (KUKA-129: a nyugtának is igazat kell mondania).
 */
/**
 * A VÁLTÁS TENGELYEINEK ZÁRT KÉSZLETE (R176 · `KUKA-423`): `subject` = MÁS EMBER nézete,
 * `book` = ugyanaz az ember MÁSIK fiókja. Egy új érték új, MÉRT szabályt kíván — addig a kapu zár.
 */
export const SWITCH_AXES = Object.freeze(['subject', 'book']);

/**
 * KIT VÁR A SZEMÉLY-TENGELYES VÁLTÁS — ZÁRT KÉSZLET (R186 §2 · `KUKA-236`).
 *
 * A LELET (külső review, Codex, R176 — P2 · a jelentés 7.5/a pontja): a személy-váltó lépésen a
 * kapu BÁRMELY másik belépett embert elfogadta, pedig a két átívelő történet a MEGNEVEZETT
 * résztvevőt kéri. Ha ugyanabban a fülben egy HARMADIK fiókkal lépnek be, a visszaállás ELHASZNÁLJA
 * az átadást, az `actor.switched` elvégzettnek könyvelődik, a futás ahhoz a fiókhoz kötődik, és
 * később a meghívás-feladatnál elakad — a SZÁNT résztvevő pedig már nem tudja folytatni.
 *
 * A `actorSwitchReady` SAJÁT megjegyzése ezt előre ki is mondta: *„AMIT EZ NEM ÁLLÍT: hogy a
 * SZEMÉLY-tengelyre is deriválható a cél. A következő SZEREPLŐ kilétét ma semmi nem deklarálja."*
 * Az R186 §2 döntött: épüljön meg. A deklaráció ezért a LÉPÉSÉ, zárt készletből:
 *   · `story_actor`  — a történetben VÁRT résztvevő (a választott meghívó címzettje, illetve a
 *                      választott tag). A futás a szerver cél-kötéséből tudja (`run.story.actor`).
 *   · `origin_actor` — AKI a történetet INDÍTOTTA (a kezelő, aki visszajön). `run.origin_subject`.
 * Új érték új, MÉRT szabályt kíván — addig a kapu ZÁR.
 */
export const SWITCH_TO = Object.freeze(['story_actor', 'origin_actor']);

/**
 * KI A VÁRT RÉSZTVEVŐ EZEN A LÉPÉSEN — `null`, ha a lépés nem nyilatkozik vagy nem tudható.
 *
 * FAIL-CLOSED, ÉS EZ KIMONDOTT: ha a lépés `switch_to`-t deklarál, de a futás nem tudja, kit
 * jelent (nincs cél-kötés, vagy a kezdő alany ismeretlen), akkor `null` — és a hívó kapu ZÁR.
 * Enélkül a „nem tudom" némán „bárki jó"-ra esne vissza, ami pont a lelet (`KUKA-049`).
 */
export function expectedActorOf(run) {
  if (!run) return null;
  const step = run.steps[run.at];
  if (!step) return null;
  const kit = step.switch_to ?? null;
  if (!SWITCH_TO.includes(kit)) return null;
  if (kit === 'origin_actor') return run.origin_subject ?? null;
  return (run.story && run.story.actor) || null;
}

/**
 * A KILÉPÉS MINT ÁTADÁSI HATÁR — EGY FELOLDÓ, MÉRHETŐEN (R176, külső review P2 · `KUKA-433`).
 *
 * Ez a döntés eddig a lap belső `saveTourHandover`-ében, zárt függvényben állt — tehát próba nem
 * tudta MEGHÍVNI, csak forrás-mintával hinni (`KUKA-207`). Ezért a szabály ITT áll, a többi
 * bemutató-szabály mellett, és a lap INNEN kérdezi.
 *
 * MIT MOND: a NEM kilépéses nézet-váltás (belépés · fiókváltás · az elfogadás utáni frissítés)
 * határát a hívó felsőbb feltétele adja (az ELSŐ váltás-lépés elérése, `KUKA-416`); a KILÉPÉS
 * viszont a SZEMÉLYT váltja, tehát csak ott átadás, ahol a történet ÉPP SZEMÉLY-váltást kér.
 * Nyilatkozat nélkül ZÁRVA (`KUKA-236`).
 */
/**
 * AZOK A FELADATOK, AMELYEK IGAZOLT SIKERE A NÉZETET IS ELMOZDÍTJA (R176, külső review P2 · `KUKA-435`).
 *
 * A LELET: a futás új nézethez kötése eddig abból következtetett okozatisságra, hogy az ELŐZŐ
 * lépés feladathoz kötött volt és `done` — az pedig MARADÓ ÁLLAPOT. Egy későbbi, a bemutatótól
 * FÜGGETLEN fiók- vagy személyváltás (például egy másik fülben) tehát úgy látszott, mintha a
 * korábbi feladat mozdította volna el, és a bemutató a ROSSZ fiókban folytatódott — ott, ahol a
 * következő lépés célja is létezik (`nav-stock` · `data-stock`), tehát még csak meg sem állt.
 *
 * A SZABÁLY: nem minden igazolt feladat mozdítja el a nézetet — MÉRVE a lapon pontosan KETTŐ:
 *   · `invite.redeemed`     — a kiszolgáló az elfogadót a MÁSIK könyvbe állítja;
 *   · `workspace.created`   — a `refreshMe` az ÚJ cégre vált.
 * Minden más feladat (`invite.created` · `grant.saved` · `member.revoked` · `plan.saved` …) a
 * nézetet HELYBEN hagyja, és az `actor.switched`-et a váltás-kapu kezeli, nem ez.
 * Nyilatkozat nélkül a visszakötés ZÁRVA (`KUKA-236`), és a jegy EGYSZER használható (`KUKA-424`
 * lecke: a feltétel az ÁTMENETRE szól, nem az ÁLLAPOTRA).
 */
export const VIEW_MOVING_TASKS = Object.freeze(['invite.redeemed', 'workspace.created']);

export function viewMovingTask(taskId) {
  return typeof taskId === 'string' && VIEW_MOVING_TASKS.includes(taskId);
}

export function handoverBoundaryOk(step, { kilepes = false } = {}) {
  if (!kilepes) return true;
  if (!step || step.switch_actor !== true) return false;
  return step.switch_axis === 'subject';
}

export function actorSwitchReady(run, { view, role }) {
  if (!run) return false;
  const step = run.steps[run.at];
  if (!step || step.switch_actor !== true) return false;
  const wantRole = step.role ?? null;   // ugyanaz a szabály, mint a checkRun-ban
  if (wantRole && role !== wantRole) return false;
  /**
   * A VÁLTÁS KÉT FAJTA NÉZET-VÁLTÁS (R140 — SAJÁT LELET, MÉRVE).
   *
   * Nemcsak MÁSIK EMBER nézetére lehet váltani, hanem UGYANAZ az ember másik FIÓKJÁRA is. A
   * meghívás elfogadása után a belépő a SAJÁT személyes körében marad (mérve: `current_book_name`
   * = „béla személyes köre", és a bal menü a személyes menü) — a cég képernyőihez külön át kell
   * váltania. Ha a váltás fogalma csak az alanyra állna, ez a lépés sosem teljesülne, a
   * fiók-váltást pedig az alany-váltás őre MEGSZAKÍTÁSNAK minősítené. A nézet a KETTŐ EGYÜTT:
   * alany ÉS fiók (KUKA-208: a kontextus PÁR).
   */
  /**
   * …DE A LÉPÉS KIMONDJA, MELYIK TENGELYEN (R176, külső review P2 — `KUKA-423`).
   *
   * A LELET: a „vagy" alak MINDEN váltást minden váltásnak elfogadott. Egy SZEMÉLY-váltó lépésen
   * (`actor-switch`) elég volt FIÓKOT váltani — tehát UGYANAZ a fiókkezelő mehetett tovább a
   * meghívott lépésein (levél, elfogadás) a MÁSIK ember helyett; és fordítva: egy FIÓK-váltó
   * lépésen (`account-switcher`) egy belépés-csere is teljesítette, a kért cég kiválasztása nélkül.
   * A nézet továbbra is PÁR (`KUKA-208`), de hogy MELYIK felének kell változnia, azt a LÉPÉS
   * deklarálja — zárt készletből, nyilatkozat nélkül ZÁRVA (`KUKA-236`).
   */
  /**
   * …ÉS A PÁR NEM MOZGÓ FELÉT IS MEGMÉRJÜK (R176, külső review P2 — `KUKA-432`).
   *
   * A LELET, MÉRVE. A fenti alak a FIÓK-tengelyen CSAK azt kérdezte meg, hogy a könyv más lett-e.
   * Egy másik EMBER belépése viszont a könyvet is megváltoztatja (a belépő a saját személyes
   * körében landol) — tehát egy `switch_axis: 'book'` lépésen a KILÉPÉS + MÁS EMBER BELÉPÉSE is
   * „teljesített”-nek számított. MÉRVE: `actorSwitchReady` = `true` arra az átmenetre, ahol
   * `S_bela → S_anna` és `B_sajat → B_anna_sajat`. A futás ekkor a ROSSZ emberhez kötődik át
   * (`rebindView`), az `actor.switched` elvégzettnek könyvelődik, és a történet a következő,
   * céges képernyőn szakad meg — egy nevezett hibával, a HELYES út közepén.
   *
   * A SZABÁLY: a váltás a pár EGYIK felét mozgatja, a MÁSIKAT pedig HELYBEN tartja (`KUKA-208`
   * teljes alakja). A két tengely ezért NEM tükrös, és ez mért tény, nem kényelem:
   *   · `book`    — UGYANAZ az ember vált a SAJÁT másik fiókjára: az alanynak HELYBEN kell maradnia.
   *     A négy fiók-tengelyes lépés (`s9` · `s10b` · `s12b` · `s15b`) mind ezt kéri: a belépés a
   *     személyes körbe visz, a történet folytatása viszont a cég fiókjában áll.
   *   · `subject` — MÁS ember lép be: a könyv ilyenkor JOGGAL más lesz, tehát a könyv
   *     állandóságát NEM követeljük meg — azért lett a párból tengely (`KUKA-423`).
   */
  const tengely = step.switch_axis ?? null;
  if (!SWITCH_AXES.includes(tengely)) return false;
  /**
   * A SZEMÉLY-TENGELY: A VÁLTÁS TÉNYE KEVÉS — A VÁRT RÉSZTVEVŐ KELL (R186 §2).
   *
   * A korábbi alak annyit kért, hogy az alany MÁS legyen. Egy HARMADIK ember belépése tehát
   * teljesítette a váltást: elhasználta az átadást, az `actor.switched` elvégzettnek könyvelődött,
   * a futás ahhoz a fiókhoz kötődött át (`rebindView`), és a történet később, a meghívás-feladatnál
   * akadt el — a SZÁNT résztvevő pedig már nem tudta folytatni.
   *
   * MOSTANTÓL a lépés KIMONDJA, kit vár (`switch_to`), és a kapu AHHOZ mér. FAIL-CLOSED: ha nem
   * nyilatkozik, vagy a várt résztvevő nem tudható, a kapu ZÁR (`expectedActorOf` → `null`) — a
   * „nem tudom" nem eshet némán „bárki jó"-ra (`KUKA-049`).
   */
  if (tengely === 'subject') {
    const most = view.subject ?? null;
    if (most === run.view.subject) return false;   // a váltás TÉNYE: az alany MÁS lett
    const vart = expectedActorOf(run);
    if (!vart) return false;                       // nyilatkozat vagy ismeret nélkül ZÁRUNK
    return most === vart;                          // és pontosan a VÁRT résztvevő lépett be
  }
  /**
   * …ÉS A FIÓK-TENGELYEN A CÉL SEM BÁRMI (R176, külső review P2 · `KUKA-441`).
   *
   * A LELET: a kapu eddig csak azt kérte, hogy a könyv MÁS legyen (és az alany ugyanaz). Aki több
   * cégben tag, az viszont a `s9` · `s10b` · `s12b` · `s15b` lépésen BÁRMELYIK másik fiókot
   * kiválaszthatta — a `rebindView` aztán azt az IDEGEN céget vette át, és mivel a következő
   * lépés célja (`nav-stock` · `data-stock`) ott is létezik, a bemutató a ROSSZ fiókban
   * folytatódott — és még csak meg sem állt.
   *
   * A CÉL VISZONT DERIVÁLHATÓ, és ez mért tény (`as31`): mind a négy fiók-tengelyes lépés a
   * történet CÉGÉBE vezet vissza — abba a könyvbe, amelyben a bemutató INDULT. Ezért a futás a
   * kezdő könyvet külön őrzi (`origin_book`), és a kapu AHHOZ mér. Nyilatkozat nélkül (ha a
   * kezdő könyv ismeretlen) a kapu ZÁR (`KUKA-236`).
   *
   * A PÁRJA MA MÁR ZÁRVA (R186 §2 — a szöveg a valóságot követi, `KUKA-050`). Ez a bekezdés
   * korábban azt mondta, hogy „a SZEMÉLY-tengelyre nem deriválható a cél, a következő szereplő
   * kilétét ma semmi nem deklarálja". Az R186 §2 ezt megépíttette: a lépés `switch_to`-t
   * deklarál, a szerver a cél-kötésben átadja a várt résztvevőt, és a személy-tengelyes ág AHHOZ
   * mér (lásd fentebb). A két tengely tehát ma UGYANAZON az elven áll: a váltás a pár egyik felét
   * mozgatja egy NEVEZETT célra, a másikat helyben tartja.
   */
  if ((view.subject ?? null) !== run.view.subject) return false;
  const cel = run.origin_book ?? null;
  if (!cel) return false;
  return (view.book ?? null) !== run.view.book && (view.book ?? null) === cel;
}

/**
 * A FUTÁS ÚJRAKÖTÉSE AZ ÚJ NÉZŐHÖZ (ACT-01) — KIZÁRÓLAG igazolt váltás után hívható.
 * Ettől kezdve az alany-váltás őre az ÚJ nézőhöz mér, tehát a védelem a következő lépéstől
 * ugyanúgy éles, mint korábban.
 */
export function rebindView(run, { view, role }) {
  if (!run) return null;
  run.view = { book: view.book ?? null, subject: view.subject ?? null };
  run.role = role ?? null;
  return run;
}

export function advance(run) {
  const step = run.steps[run.at];
  if (!step) return { moved: false, why: 'no_run' };
  // A CÉL NÉLKÜLI LÉPÉS NEM HALAD, és két külön okkal: FELTÁRÁSRA VÁR (a felhasználó nyitja meg —
  // a mondat megmondja a folytatást, KUKA-201) VAGY a cél eltűnt (a rajzolás NEVEZETTEN megszakít).
  // MIÉRT NEM LÉPÜNK TOVÁBB egyszerűen: a régi alak a nem létező célú lépést `done`-ra állította és
  // átugrotta — vagyis „elvégzett"-nek könyvelt egy lépést, ami meg sem történhetett (KUKA-129).
  /**
   * AZ ELVÉGZETT LÉPÉSNEK NINCS SZÜKSÉGE A CÉLJÁRA (R140 — SAJÁT LELET, MÉRVE).
   *
   * A LELET. A meghívás elfogadása UTÁN a meghívó képernyője megszűnik, tehát a lépés célja
   * (`invite-actions`) eltűnik a lapról. A lépés viszont IGAZOLTAN elvégzett — a szerver nyugtázta.
   * A továbblépés mégis `targetMissing`-gel elakadt, és a 18 lépéses történet a 17.-en állt meg,
   * közvetlenül a végeredmény előtt.
   *
   * UGYANAZ A SZABÁLY, KÉT HELYEN. Ezt a kivételt a `checkRun`-ba már betettem (R138), ide nem —
   * és pontosan ez a hiba-osztály ismétlődött meg, amire a KUKA-003/KUKA-039 figyelmeztet: ha egy
   * szabály két ágon igaz, az egyik ág előbb-utóbb kimarad. Most mindkettő ugyanazt mondja.
   */
  if (step.state !== 'done' && !targetOf(run)) {
    if (isPending(run)) return { moved: false, why: 'targetPending' };
    // A TELJESÜLT NAVIGÁCIÓS LÉPÉS HALAD — de a lezárást a lenti rendes út végzi, tehát a
    // feladathoz kötött lépés továbbra is csak igazolt szerver-válasszal zárul.
    if (!navIntentFulfilled(run)) return { moved: false, why: 'targetMissing' };
  }
  if (step.task && step.state !== 'done') return { moved: false, why: 'taskNotDone' };
  if (!step.task) step.state = 'done';
  if (run.at + 1 >= run.steps.length) return { moved: false, why: 'finished' };
  run.at += 1;
  return { moved: true, why: null };
}

/** VISSZALÉPÉS — a már elvégzett lépés állapotát NEM írja vissza „hátravan"-ra (a tény tény). */
export function back(run) {
  if (run.at <= 0) return { moved: false };
  run.at -= 1;
  return { moved: true };
}

/**
 * A FELADAT IGAZOLÁSA. Az `app.js` hívja, a SZERVER válasza után — nem a kattintás után. Ha a futó
 * lépés épp erre a feladatra vár, `done` lesz; különben nem történik semmi (nem „előre" igazolunk).
 */
/**
 * …ÉS A TÖRTÉNETHEZ KÖTÖTT LÉPÉS CSAK A VÁLASZTOTT CÉLON TELJESÜL (R186 §2).
 *
 * A LELET (külső review, Codex, R176 — P2 · a jelentés 7.5/c pontja): a `doRevokeInvite`
 * BÁRMELYIK sikeres visszavonásra készre könyvelte az `invite.revoked` feladatot. KÉT függő
 * meghívó mellett tehát a néző az EGYIKET vonta vissza, a bemutató viszont a MÁSIK, még ÉLŐ levelet
 * nyitotta meg — és azt állította róla, hogy a visszavont meghívó. Az R186 §2: *„A visszavonás, a
 * levél és az elfogadás ugyanarra a megfelelő meghívóra vonatkozzon."*
 *
 * A LÉPÉS KIMONDJA, hogy a történet céljához kötött (`story_bound`), és akkor a nyugtának a
 * VÁLASZTOTT cél jelölőjét kell hoznia. FAIL-CLOSED: cél-kötés nélkül (`run.story.ref` hiányzik) a
 * lépés NEM teljesül — a „nem tudom" nem eshet némán „bármi jó"-ra (`KUKA-049` · `KUKA-236`).
 *
 * ÉS AMIT EZ NEM VÁLLAL: nem jogosultság. A visszavonást a szerver a saját plafon-ellenőrzésével
 * engedi vagy tiltja, tőlünk függetlenül (`KUKA-227`); ez itt a BEMUTATÓ elszámolása.
 */
/**
 * A KÖTÉS-REKESZEK ZÁRT KÉSZLETE (R186 §5). A `true` a FŐ célt jelenti; a szöveg egy megnevezett
 * rekeszt. Ami nincs a készletben, az NEM rekesz — és a hívó fail-closed zár (`KUKA-236`).
 */
export const STORY_SLOTS = Object.freeze(['ref', 'invite_ref']);
/**
 * A REKESZ FELOLDÓJA EGY HELYEN — ÉS A HATÁRON IS EZ DÖNT (`KUKA-467` · `D-VS-3249`).
 *
 * A LELET (külső review, Codex, P2): a nyilatkozat REKESZT nevezhet meg (`STORY_SLOTS`), a
 * HTTP-határ szerializálója viszont `=== true`-val mérte — tehát a `'invite_ref'` SZÖVEG a
 * böngszőbe `false`-ként érkezett, és a nevezett rekesz NÉMÁN kikapcsolt. Ezért a feloldó
 * EXPORTÁLT: a motor, a lap ÉS a határ UGYANEZT kérdezi (`KUKA-003` · `KUKA-039` · `KUKA-227`).
 *
 * A KÉSZLET ZÁRT (`KUKA-236`): a `true` a `ref` rekeszt jelenti (visszamenős alak), egy ismert
 * rekesz-név önmagát, minden más — kitalált név, tömb, szám — `null`, és a hívói oldalon ZÁR.
 */
export function storySlotOf(decl) {
  if (decl === true) return 'ref';
  if (typeof decl === 'string' && STORY_SLOTS.includes(decl)) return decl;
  return null;
}
const rekeszOf = storySlotOf;

export function taskDone(run, taskId, { ref = null, auth = null } = {}) {
  if (!run) return false;
  const step = run.steps[run.at];
  if (!step || step.task !== taskId) return false;
  /**
   * A KÖTÉS-NYILATKOZAT REKESZT NEVEZHET MEG (R186 §5, külső review P2).
   *
   * `true` → a történet FŐ célja (`story.ref`); egy SZÖVEG → a megnevezett rekesz (ma:
   * `invite_ref`, a történet saját lépése által kiállított meghívó). A visszatérés-történetben a
   * két kötés KÜLÖN jár: a megvonás és az újbóli meghívás a TAGRA szól, az elfogadás viszont az
   * ÉPPEN KIÁLLÍTOTT meghívóra — egy rekeszben a kettő nem fér el. Zárt készlet, fail-closed: egy
   * kitalált rekesz-név nem esik némán engedélyre (`KUKA-236`).
   */
  if (step.story_bound) {
    const rekesz = rekeszOf(step.story_bound);
    if (!rekesz) return false;
    const kell = (run.story && run.story[rekesz]) || null;
    if (!kell) return false;
    if (String(ref ?? '') !== String(kell)) return false;
  }
  /**
   * ÉS A TÖRTÉNET SAJÁT VÁLASZTÁSI LÉPÉSE ÁTKÖTI A CÉLT (R186 §2).
   *
   * Az R186 §2 ezt nevezetten megengedi: *„Indításkor VAGY a történet saját, egyértelmű választási
   * lépésében azonosítsd az alkalmas célt."* A visszavonás-történet a 13. lépésen ÚJ meghívót állít
   * ki — innentől az a történet célja, és az elfogadásnak (`s17`) ERRE kell szólnia. A kötés tehát
   * a történet ELŐREHALADÁSÁVAL mozog, de MINDIG egy nevezett, IGAZOLT művelet eredményére — soha
   * nem „bármire" (`KUKA-231`: csak igazolt siker után).
   */
  /**
   * …ÉS AZ ÁTKÖTÉS A CÉL MINDKÉT FELÉT KÉRI (R186 §5, külső review P2).
   *
   * A LELET: az átkötés csak a JELÖLŐT mozdította. Ha a kezelő a 13. lépésen MÁS ember címét írja
   * be, a kiállítás sikeres, a lépés `done` lett, a futás viszont a RÉGI várt résztvevőnél maradt:
   * a 14. lépés attól az embertől kért belépést, aki az ÚJ meghívót nem válthatja be, az ÚJ
   * címzettet pedig a váltás-kapu elutasítja. A történet tehát KÉT emberre hasadt — és a lépés
   * mégis teljesítésnek látszott.
   *
   * A VÁLASZ: az átkötés a KISZOLGÁLÓ saját válaszához van kötve (`auth` — a friss
   * `/api/assistant/status` cél-kötése). Két dolgot kell igazolnia: hogy a kiszolgáló UGYANEZT a
   * most kiállított meghívót választotta (`auth.ref === ref`), és hogy az UGYANARRA az emberre
   * szól, akit a történet eddig követett (`auth.actor === run.story.actor`). Ha bármelyik nem áll,
   * NINCS átkötés és NINCS teljesítés: a lépés `pending` marad, és a bemutató nevezetten megáll
   * (`KUKA-012` · `KUKA-049`) — nem „jó lesz"-re esik.
   *
   * ÉS AMIT EZ NEM TESZ: új mezőt NEM kér a kiállítás válaszából, tehát NEM lesz belőle fiók-létet
   * eláruló jel (`KUKA-084`). A cél-kötést a bemutató-kapu amúgy is csak a két átívelő történetnél
   * számolja ki, demó-jel és fejlesztői levélfogadó mellett.
   */
  if (step.story_rebind) {
    const rekesz = rekeszOf(step.story_rebind);
    if (!rekesz) return false;
    if (!run.story) return false;
    const h = auth && typeof auth === 'object' ? auth : null;
    if (!h || typeof h.ref !== 'string' || !h.ref) return false;
    if (String(h.actor ?? '') !== String(run.story.actor ?? '')) return false;
    // A FŐ CÉL ÁTKÖTÉSÉNÉL a lépés `ref` argumentuma MAGA az új cél, tehát a kiszolgáló
    // választásának EGYEZNIE kell vele. A MÁSODIK rekesznél a `ref` a `story_bound`-ot szolgálja
    // (a történet tagját), ezért ott ez az egyezés nem értelmezhető — a résztvevő kötése marad.
    if (rekesz === 'ref' && String(h.ref) !== String(ref ?? '')) return false;
    run.story = { ...run.story, [rekesz]: h.ref };
  }
  step.state = 'done';
  return true;
}

/**
 * EGY LÉPÉS TUDATOS KIHAGYÁSA (F91-01). A felhasználó nincs bezárva: ha nem akarja elvégezni a
 * feladatot, KIMONDVA átugorhatja — a lépés `skipped` lesz, és az elszámolásban is annak látszik.
 * A hallgatólagos „továbbengedés" volt a hiba, nem a továbbmenés lehetősége (KUKA-092).
 */
export function skipStep(run) {
  if (!run) return { moved: false, why: 'no_run' };
  const step = run.steps[run.at];
  if (!step) return { moved: false, why: 'no_run' };
  step.state = 'skipped';
  if (run.at + 1 >= run.steps.length) return { moved: false, why: 'finished' };
  run.at += 1;
  return { moved: true, why: null };
}

/**
 * A BEFEJEZÉS — UGYANAZT AZ ÁLLAPOTELLENŐRZÉST FUTTATJA, MINT A TOVÁBB (F91-01).
 *
 * A LELET (a külső ellenőrző fél, chatgpt-v3, R91): a csomagváltás bemutatójának harmadik,
 * `plan.saved` feladathoz kötött lépése `pending` maradt (a felhasználó nem mentett), a Befejezés
 * mégis kiírta, hogy „A bemutató végére értél", **2 elvégezve · 0 kihagyva** — a HÁROM lépéses
 * bemutató harmadik lépése eltűnt az elszámolásból. A hiba nem a bemutató haladása volt, hanem a
 * ZÁRÓ ÁLLÍTÁS: a lap sikert mondott arról, ami meg sem történt (KUKA-041 · KUKA-129).
 *
 * A MAI SZABÁLY: a Befejezés csak akkor zárul sikerrel, ha az UTOLSÓ lépés is el van számolva
 * (`done` vagy kimondottan `skipped`). Függő feladatnál NEVEZETT elakadás — ugyanaz a mondat, mint a
 * Továbbnál —, és mellette a kimondott kihagyás útja.
 */
export function finishRun(run) {
  if (!run) return { ok: false, why: 'no_run' };
  const step = run.steps[run.at];
  if (!step) return { ok: false, why: 'no_run' };
  if (step.state === 'pending') {
    if (step.task) return { ok: false, why: 'taskNotDone' };
    if (!targetOf(run)) return { ok: false, why: isPending(run) ? 'targetPending' : 'targetMissing' };
    step.state = 'done';
  }
  run.endedBy = 'finish';
  return { ok: true, why: null };
}

/**
 * A LEZÁRT FUTÁS HORDOZHATÓ PÉLDÁNYA (TUR-02, F93-01).
 *
 * MIÉRT KELL. A fiók LÉTREHOZÁSÁNAK bemutatója a saját sikerétől veszítette el az elszámolását: a
 * szerver `ok` válasza után a lap ÁTVÁLT az ÚJ cégre, a váltás pedig a nézethez kötött tárakkal
 * együtt a FUTÓ BEMUTATÓT is üríti (`resetViewCaches`). A buborék a képernyőn maradt, mögötte
 * viszont már nem volt állapot: a Befejezés gomb egy nem létező futást zárt volna le, és a
 * felhasználó SEMMILYEN lezárást nem kapott arra, amit ténylegesen elvégzett (a külső ellenőrző
 * fél lelete, R93/F93-01).
 *
 * A MEGOLDÁS NEM SORRENDCSERE — azzal a váltás utáni takarítás ugyanúgy elvinné. Ehelyett a
 * BIZONYÍTOTT eredményről készül egy sima, olvasható pillanatkép, ami túléli a nézet-ürítést, és a
 * záró lapot UGYANAZ a rajzoló írja ki belőle (`finishedHtml`) — tehát a két úton megjelenő
 * elszámolás nem tud elcsúszni (KUKA-018: egy fogalom, egy otthon).
 *
 * AMIT EZ NEM VISZ ÁT — kimondva: se szerkesztő-állapotot, se félbehagyott kitöltést, se lépés-célt,
 * se jogot. Csak a MÁR MEGTÖRTÉNT lépések elszámolását, és azt is a SZEMÉLYHEZ kötve — a hívó
 * ürítni köteles, ha más ember kerül a munkamenetbe (R83/F83-01 marad érvényben).
 */
export function carrySnapshot(run, { via = null } = {}) {
  if (!run) return null;
  return {
    id: run.id,
    version: run.version,
    feature: run.feature,
    text: run.text || null,
    steps: run.steps.map((s) => ({ id: s.id, state: s.state })),
    endedBy: run.endedBy || null,
    // MI ZÁRTA LE (F111-01): a lezárás mondata ettől függ — a meghívás elfogadása nem „a vállalkozás
    // létrehozása". A szó a KÓDON áll, nem a feliraton (KUKA-221).
    via: CARRIED_LEAD[via] ? via : null,
    requires_invite: run.requires_invite === true,
    carried: true,
  };
}

/** A hordozott lezárás mondata AZ OK szerint — ismeretlen ok a régi, általános mondatot kapja. */
const CARRIED_LEAD = Object.freeze({ workspace_created: 'carriedLead', invite_redeemed: 'carriedLeadInvite' });

/** A futás ELSZÁMOLÁSA — egy helyen, mert a záró lap és a gépi mérés is ezt olvassa. */
export function runSummary(run) {
  const steps = (run && run.steps) || [];
  const done = steps.filter((s) => s.state === 'done').length;
  const skipped = steps.filter((s) => s.state === 'skipped').length;
  const pending = steps.filter((s) => s.state === 'pending').length;
  return { done, skipped, pending, total: steps.length, whole: steps.length > 0 && done === steps.length };
}

/** A KILÉPÉS: a hátralévő lépések „átugrott"-ak — NEM „elvégezett"-ek. */
export function exitRun(run, by) {
  if (!run) return null;
  for (const s of run.steps) if (s.state === 'pending') s.state = 'skipped';
  run.endedBy = by || 'exit';
  return run;
}

/** A lépés szövege a nyelvcsomagból (a `text` a szerver válaszában jött, a kért nyelven). */
function stepText(run) {
  const step = run.steps[run.at];
  const box = run.text || {};
  const t = step ? box[step.id] : null;
  return { title: (t && t.title) || '', body: (t && t.body) || '' };
}

/**
 * A BUBORÉK. Nem párbeszéd (`aria-modal="false"`): a valódi képernyő MÖGÖTTE kattintható marad —
 * különben a feladathoz kötött lépést nem lehetne elvégezni (R89 §4: a panel ne fedje el a fő
 * műveletet). A lépések RÖVID SZÖVEGES LISTÁBÓL is követhetők (nem csak képen).
 */
export function tourHtml(run, { blocked, pending } = {}) {
  if (!run) return '';
  const { title, body } = stepText(run);
  const n = run.at + 1;
  const total = run.steps.length;
  const last = run.at + 1 >= total;
  const stateWord = { pending: TOURUI.pending, done: TOURUI.done, skipped: TOURUI.skipped };
  /**
   * A CÉL-KÖTÉS A KIMENETBEN IS LÁTSZIK (R186 §2 · `KUKA-131`).
   *
   * MIÉRT: a történet cél-kötése (`run.story`) a futás belsejében él, tehát egy mérés CSAK a
   * következményeit látta (a lépés teljesül-e), az OKÁT nem. Egy eltérésnél így nem volt
   * megállapítható, hogy a KÉPERNYŐ mutat más meghívót, vagy a KÖTÉS csúszott el. A nyersanyagot
   * ezért kiírjuk: a jelölő NEM titok (egyirányú lenyomat, jogot nem ad — `KUKA-006`), és nélküle a
   * verdikt nem ellenőrizhető.
   */
  return `<div class="tourhead" data-story-ref="${esc((run.story && run.story.ref) || '')}"><small data-testid="tour-progress">${esc(run.text && run.text.title ? run.text.title : run.id)} · ${esc(String(n))}/${esc(String(total))}</small>
      <button type="button" class="x" data-action="tour-exit" aria-label="${esc(TOURUI.exit)}" data-testid="tour-exit">×</button></div>
    <h3 data-testid="tour-step-title">${esc(title)}</h3>
    <p data-testid="tour-step-body">${esc(body)}</p>
    ${pending ? `<p class="notice" data-testid="tour-pending" data-why="${esc(pending)}" data-actionable="${INFORMATIONAL_PENDING.includes(pending) ? 'false' : 'true'}">${esc(TOURUI[pending] || pending)}</p>` : ''}
    ${blocked ? `<p class="notice warn" data-testid="tour-blocked">${esc(TOURUI[blocked] || blocked)}</p>` : ''}
    <ol class="tourlist" data-testid="tour-steps" aria-label="${esc(TOURUI.stepList)}">
      ${run.steps.map((s, i) => `<li data-testid="tour-step-${esc(s.id)}" data-state="${esc(s.state)}" ${i === run.at ? 'aria-current="step"' : ''}>
        ${esc((run.text && run.text[s.id] && run.text[s.id].title) || s.id)} <small>${esc(stateWord[s.state] || s.state)}</small></li>`).join('')}
    </ol>
    <p class="muted" style="font-size:12px" data-testid="tour-note">${esc(TOURUI.simulationNote)}</p>
    <div class="buttonrow">
      <button type="button" data-action="tour-back" data-testid="tour-back" ${run.at === 0 ? 'disabled' : ''}>${esc(TOURUI.back)}</button>
      ${last
    ? `<button type="button" class="primary" data-action="tour-finish" data-testid="tour-finish">${esc(TOURUI.finish)}</button>`
    : `<button type="button" class="primary" data-action="tour-next" data-testid="tour-next">${esc(TOURUI.next)}</button>`}
      <button type="button" data-action="tour-restart" data-testid="tour-restart">${esc(TOURUI.restart)}</button>
    </div>
    ${blocked === 'taskNotDone' ? `<div class="buttonrow"><button type="button" class="plain" data-action="tour-skip"
      data-testid="tour-skip">${esc(TOURUI.skipStep)}</button></div>` : ''}`;
}

/**
 * A ZÁRÓ LAP — a BEFEJEZÉS és a KILÉPÉS két külön mondat, és MINDEN lépés el van számolva (F91-01).
 *
 * A lap KIÍRJA a három számot (elvégezve · átugorva · hátravan), és az összegük SOHA nem lehet
 * kevesebb a lépések számánál: a „végére értél" mondat csak akkor áll ott, ha semmi nem maradt ki.
 */
export function finishedHtml(run) {
  const { done, skipped, pending: pendingCount, whole } = runSummary(run);
  const carried = Boolean(run && run.carried);
  // A HORDOZOTT LEZÁRÁS MÁS MONDATTAL ÁLL (F93-01): kimondja, hogy az összegzés az ELŐZŐ képernyőn
  // megtett lépésekről szól — a felhasználó ne higgye, hogy az ÚJ fiókban járt végig valamit. A
  // mondatot a lezárás OKA választja (F111-01): a meghívás elfogadása más mondat, mint a létrehozás.
  const lead = carried ? (TOURUI[CARRIED_LEAD[run.via] || 'carriedLead'] || TOURUI.finishedLead)
    : (whole ? TOURUI.finishedLead : TOURUI.endedLead);
  // A HORDOZOTT, DE NEM TELJES futás nem „kilépés": a felhasználó nem lépett ki, a művelete zárta le
  // a bemutatót — a cím ezt mondja, az összegzés pedig a kimaradt lépéseket (F111-01).
  const title = whole ? TOURUI.finishedTitle : (carried ? TOURUI.carriedEndedTitle : TOURUI.endedTitle);
  // AZ ÚJRAINDÍTÁS CSAK OTT, AHOL VAN MIT ÚJRAINDÍTANI: a meghívóhoz kötött bemutató képernyője a
  // beváltással megszűnt, egy felkínált újraindítás zsákutcába vinne (KUKA-201).
  const restartable = !(carried && run.requires_invite === true);
  return `<div class="tourhead"><small data-testid="tour-progress">${esc(run.text && run.text.title ? run.text.title : run.id)}</small>
      <button type="button" class="x" data-action="tour-exit" aria-label="${esc(TOURUI.exit)}" data-testid="tour-exit">×</button></div>
    <h3 data-testid="tour-finished" data-whole="${whole ? 'true' : 'false'}" data-carried="${carried ? 'true' : 'false'}" data-via="${esc(carried && run.via ? run.via : '')}">${esc(title)}</h3>
    <p data-testid="tour-finished-lead">${esc(lead)}</p>
    <p data-testid="tour-summary" data-done="${done}" data-skipped="${skipped}" data-pending="${pendingCount}">${esc(TOURUI.done)}: ${esc(String(done))} · ${esc(TOURUI.skipped)}: ${esc(String(skipped))} · ${esc(TOURUI.pending)}: ${esc(String(pendingCount))}</p>
    <div class="buttonrow">${restartable ? `<button type="button" data-action="tour-restart" data-testid="tour-restart">${esc(TOURUI.restart)}</button>
      ` : ''}<button type="button" class="primary" data-action="tour-exit" data-testid="tour-close">${esc(TOURUI.exit)}</button></div>`;
}

/** A MEGSZAKÍTÁS lapja — NEVEZETT ok, és működő folytatás. */
export function abortedHtml(why) {
  return `<div class="tourhead"><small>${esc(TOURUI.title)}</small>
      <button type="button" class="x" data-action="tour-exit" aria-label="${esc(TOURUI.exit)}" data-testid="tour-exit">×</button></div>
    <p class="notice warn" data-testid="tour-aborted" data-why="${esc(why)}">${esc(TOURUI[why] || TOURUI.targetMissing)}</p>
    <p class="muted">${esc(TOURUI.targetMissingNext)}</p>
    <div class="buttonrow"><button type="button" class="primary" data-action="tour-exit" data-testid="tour-close">${esc(TOURUI.exit)}</button>
      <button type="button" data-action="tour-restart" data-testid="tour-restart">${esc(TOURUI.restart)}</button></div>`;
}

/** A KIEMELÉS: osztályt tesz a cél-elemre, a korábbit leveszi. AKTIVÁLÁS NINCS (nem kattint). */
export function highlight(run) {
  for (const el of document.querySelectorAll('.tourtarget')) el.classList.remove('tourtarget');
  // FELTÁRÁSRA VÁRVA a FELTÁRÓ gombot emeljük ki — arra kell kattintania, nem a még nem létező célra.
  const el = targetOf(run) || revealerOf(run);
  if (el) {
    el.classList.add('tourtarget');
    if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center', behavior: 'auto' });
  }
  return el;
}
export function clearHighlight() {
  for (const el of document.querySelectorAll('.tourtarget')) el.classList.remove('tourtarget');
}

/**
 * A BUBORÉK KITÉR A CÉL ELŐL (TUR-03, F93-01 — SAJÁT LELET a teljes végigjárásból).
 *
 * A LELET, ÉS MIÉRT CSAK MOST JÖTT KI. A buborék szerződése kimondta, hogy „a valódi képernyő
 * MÖGÖTTE kattintható marad" (`aria-modal="false"`) — ez viszont csak ott igaz, ahol a buborék NEM
 * takar. A hozzáférés-bemutató végigjárásakor a buborék pontosan a tag-sor gombjára ült rá, és a
 * kattintást ELNYELTE: a bemutató arra az elemre mutatott, amit ő maga tett elérhetetlenné
 * (KUKA-011: hol kattint? · KUKA-160: amit a képernyő felkínál, annak végig kell mennie). Az
 * eddigi próbák ezt nem foghatták meg, mert a bemutatót elindították, de nem VITTÉK VÉGIG — pont
 * ezért kérte a külső ellenőrző fél a tényleges végigjárást (R93 §4).
 *
 * A MEGOLDÁS: a rajzolás után megmérjük, fedi-e a buborék a KIEMELT elemet, és ha igen, a buborék
 * átmegy a szemközti sarokba. Négy sarkot próbálunk, és az ELSŐT választjuk, amelyik nem fedi a
 * célt; ha egyik sem jó (a cél nagyobb, mint a szabad hely), marad az alapértelmezett — de akkor
 * sem hazudunk: a helyzetet a hívó a `false` visszatéréssel megkapja.
 */
/**
 * A SARKOK — az ELSŐ a lehorgonyzás alapállása (nincs osztálya), a többi a kitérő.
 *
 * ÉS EGY SAJÁT LELET, AMIT A VÉGIGJÁRÁS FOGOTT MEG: az első alakomban az alapállást ÜRES SZTRING
 * jelölte, és a `classList.remove('')` a böngészőben KIVÉTELT DOB. A kivétel a meghívás mentése
 * UTÁN, de a „levélhez" gomb felfedése ELŐTT szállt el — vagyis a mentés sikerült, a felhasználó
 * pedig nem kapta meg a következő lépést. A hiba NÉMA volt: a szerver oldalán minden rendben, a
 * képernyőn semmi. Pontosan ezért kell a bemutatót VÉGIG járni, nem elindítani (R93 §4 · KUKA-220:
 * a böngésző kivétele nem bizonyít semmit, ha senki nem méri).
 */
export const BUBBLE_CORNERS = Object.freeze([null, 'tour-top', 'tour-top-start', 'tour-bottom-start']);

/** Két téglalap metszi-e egymást. Külön függvény, mert a próba EZT hívja meg (KUKA-207). */
export function rectsOverlap(a, b) {
  if (!a || !b) return false;
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

export const PASSTHROUGH = 'tour-passthrough';

export function avoidOverlap(box, target) {
  if (!box) return true;
  for (const c of BUBBLE_CORNERS) if (c) box.classList.remove(c);
  box.classList.remove(PASSTHROUGH);
  if (!target || typeof box.getBoundingClientRect !== 'function') return true;
  for (const corner of BUBBLE_CORNERS) {
    if (corner) box.classList.add(corner);
    const clash = rectsOverlap(box.getBoundingClientRect(), target.getBoundingClientRect());
    if (!clash) return true;
    if (corner) box.classList.remove(corner);
  }
  /**
   * NINCS SZABAD SAROK — ÉS EZ NEM RITKA HATÁRESET (saját lelet, R93 végigjárás). A hozzáférés-
   * bemutató célja egy EGÉSZ LISTA: akárhova tesszük a buborékot, rá fog érni. A kitérés ilyenkor
   * fogalmilag nem megoldható, a szerződés viszont áll: „a valódi képernyő MÖGÖTTE kattintható
   * marad". Ezért a kártya ÁTENGEDI a kattintást (`pointer-events: none`), a SAJÁT gombjai pedig
   * továbbra is fogadják — a bemutató így se nem takar, se nem tűnik el.
   */
  box.classList.add(PASSTHROUGH);
  return false;
}
/**
 * AZ ÁTENGEDÉS ÁRA, KIMONDVA (nem elhallgatott mellékhatás): amíg a kártya átengedi a kattintást,
 * a SZÖVEG-törzse nem fogadja el a görgetést sem — csak a GOMBJAI és a hivatkozásai. (A lépés-lista
 * az R121-ig szintén fogadta, de az HIBA volt: egy nem interaktív `<ol>` fogta el a kattintást a
 * valódi képernyő elől — lásd a `style.css` `tour-passthrough` szabályát.) Ez a
 * bemutató mai méreteinél (3–6 lépés) nem jelent elvesztett tartalmat, és csak abban a ritka
 * esetben lép életbe, amikor a cél akkora, hogy egyetlen sarok sem szabad. A választás tudatos:
 * egy nem kattintható CÉL teljesen megállítja a bemutatót, egy nem görgethető SZÖVEG-törzs nem.
 */

/** A bemutatóhoz tartozó oldal neve — a lap ide visz, mielőtt az első lépés kiemel. */
export function pageOf(run) { return run && run.page && PAGE[run.page] ? run.page : null; }

export const TUR_CONTRACT = Object.freeze({
  id: 'TUR-01',
  owns: 'a bemutató lépés-állapota, a cél feloldása, a továbblépés szabálya és a buborék rajzolása',
  never_clicks: 'nem aktivál DOM-elemet: se mentést, se meghívást, se jogadást, se törlést',
  task_rule: 'a feladathoz kötött lépés CSAK a szerver által igazolt siker után halad (taskDone)',
  skipped_is_not_done: 'három állapot: pending · done · skipped — a zárás kiírja, mi maradt el',
  finish_rule: 'a Befejezés UGYANAZT az állapotellenőrzést futtatja, mint a Tovább (finishRun): '
    + 'függő feladat mellett NEM zárul sikerrel, és a záró lap csak akkor mondja, hogy „a végére '
    + 'értél", ha MINDEN lépés elvégezve — különben kimondja az átugrott és a hátralévő számot',
  skip_rule: 'a tudatos kihagyás KÜLÖN állapot és külön gomb (skipStep): a felhasználó nincs '
    + 'bezárva, de az átugrott lépés az elszámolásban is átugrottnak látszik',
  abort_reasons: Object.freeze(['contextChanged', 'rightLost', 'targetMissing', 'inviteSignInFirst']),
  overlap_rule: 'a buborék KITÉR a kiemelt cél elől (avoidOverlap), és ha nincs szabad sarok (a cél '
    + 'egy egész lista), a kártya ÁTENGEDI a kattintást, miközben a saját gombjai működnek — a '
    + 'szerződés („a képernyő mögötte kattintható marad") így minden célméretnél igaz',
  pending_rule: 'a panelen belüli cél FELTÁRÓJA deklarált (appears_after): amíg a felhasználó meg '
    + 'nem nyitja, a bemutató VÁR (targetPending) és a FELTÁRÓT emeli ki — nem szakít meg, és nem '
    + 'kattint helyette',
  carry_rule: 'a fiók LÉTREHOZÁSÁVAL vagy a MEGHÍVÁS ELFOGADÁSÁVAL lezárt futás összegzése HORDOZHATÓ '
    + 'pillanatképként éli túl a nézet-ürítést (carrySnapshot, a lezárás OKÁVAL), és UGYANAZ a '
    + 'rajzoló írja ki (finishedHtml) — de csak az összegzés megy át, szerkesztő-állapot és jog SOHA, '
    + 'a félbehagyott futás nem lesz „egész", és a hívó üríti, ha MÁS ember kerül a munkamenetbe',
  progress: 'memóriában, személy + fiók + bemutató-verzió kötéssel; böngészőben NEM tároljuk',
});
