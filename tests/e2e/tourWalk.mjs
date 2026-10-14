// tests/e2e/tourWalk.mjs — AZ ÚTMUTATÓ-BEJÁRÁS KÖZÖS OTTHONA.
//
// MIÉRT NEM EGY PRÓBA-LAPON ÁLL (R166, HETEDIK KÖR · `KUKA-003`). Két próba járja be az
// útmutatókat: a pótoltak élő tanúja (`v3app-r166-utmutatok.spec.mjs`) és a MINTAADAT-KAPU
// viselkedés-őre (`v3app-r166-minta-kapu.spec.mjs`, ami a kiosztott minta NÉLKÜLI vállalkozásban
// járja be MINDAZT, amit a KISZOLGÁLÓ felkínál). Ha a bejáró két helyen állna, a kettő elcsúszna —
// és pont a szigorítások (a kattintó bejáró, az újrarajzolás kivárása) csúsznának el, amik a
// `KUKA-407` és a `KUKA-409` leleteit megfogták. A Playwright NEVEZETTEN tiltja, hogy egy próba-lap
// egy másikat importáljon, tehát a közös otthon CSAK ez a modul lehet.
import { expect } from '@playwright/test';
import { TOURS } from '../../v3app/knowledge/features.mjs';
import { dictFor } from '../../v3app/public/i18n/dict.mjs';

const HU = dictFor('hu');

/** Az útmutató indítása a VALÓDI úton: súgó → Útmutatók fül → az útmutató saját gombja. */
export async function closeHelp(page) {
  // A súgó MODÁLIS panel: nyitva a lap többi része nem kattintható — a felhasználó is becsukja
  // (× vagy Esc), mielőtt továbbmegy. A saját első alakom ezt nem tette, és a MÁSODIK útmutató
  // indítása „intercepts pointer events"-be futott: a próba a saját előkészítését mérte (KUKA-120).
  if (await page.getByTestId('help-close').count()) {
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('help-close')).toHaveCount(0);
  }
}

/**
 * MINDEN NYITOTT MODÁLIS PANEL BEZÁRÁSA — a felhasználó útján (Esc). SAJÁT LELET a próbán: a
 * `tour.verify` bejárása megnyitja a levél-fogadót, és a NYITOTT párbeszéd mellett a következő
 * útmutató indítása „intercepts pointer events"-be fut. A próba a saját előkészítését mérte volna,
 * nem a rendszert (KUKA-120).
 */
export async function closeModals(page) {
  for (let i = 0; i < 5; i += 1) {
    if (await page.locator('dialog[open]').count() === 0) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
  }
}

export async function startTourViaHelp(page, tourId) {
  const featureId = TOURS[tourId].feature;
  if (await page.getByTestId('tour-exit').count()) await page.getByTestId('tour-exit').click();
  await closeModals(page);
  await closeHelp(page);
  /**
   * EGY MINTAVÉTEL NEM MÉRÉS — ÉS EZ A MÉRÉS HIBÁJA VOLT, NEM A TERMÉKÉ (R186 §5).
   *
   * A LELET, MÉRVE: a kötelező kapu `R176-K3` sora PIROS lett egy olyan futásban, ami a külső
   * ellenőrző lánccal EGYIDőBEN ment (4 vCPU, telített gép): a verdikt „NEM indult" volt, 4,2 s
   * alatt. UGYANAZ a próba csendes gépen 36,3 s alatt ZÖLD. Az ok nem a termék: a súgó sorai a
   * `/api/assistant/status` és a `/api/assistant/knowledge` VÁLASZÁBÓL rajzolódnak ki, tehát a panel
   * megnyitása után még nincsenek ott — a `count() === 0` egyetlen mintavétele pedig ebből azt
   * állította, hogy „a súgó nem kínálja fel". Ez a `KUKA-445` osztálya a MÉRÉS oldalán, és a saját
   * `vezess` leletének párja: egy pillanatkép nem dönthet egy FOLYAMATRÓL.
   *
   * ÉS AMIT EZ NEM TESZ: nem lazít. Ha a sor VALÓBAN nem jön ki, a várakozás lejár, és a verdikt
   * ugyanaz a `false` — csak már MÉRT tény mögötte áll, nem egy időzítési véletlen.
   */
  await page.getByTestId('help-open').first().waitFor({ state: 'attached', timeout: 8000 }).catch(() => {});
  if (await page.getByTestId('help-open').count() === 0) return false;
  await page.getByTestId('help-open').click();
  await expect(page.getByTestId('help-close')).toBeVisible();
  await page.getByTestId('help-tab-guides').click();
  // A FELHASZNÁLÓ ÚTJA: a súgó-sort előbb KI KELL NYITNI — az útmutató gombja a sor alatt áll,
  // tehát a zárt sor mellett nem létezik (a `appears_after` elve a súgóban is érvényes).
  const sor = page.getByTestId(`help-guide-${featureId}`);
  // A SOROK A KISZOLGÁLÓ VÁLASZÁBÓL JÖNNEK (lásd a fenti leletet): VÁRUNK, és csak utána mondjuk ki.
  await sor.first().waitFor({ state: 'attached', timeout: 8000 }).catch(() => {});
  if (await sor.count() === 0) return false;          // a súgó ebben a nézetben nem kínálja fel
  await sor.getByRole('button').first().click();
  const gomb = page.getByTestId(`help-tour-${featureId}`);
  await gomb.first().waitFor({ state: 'attached', timeout: 8000 }).catch(() => {});
  if (await gomb.count() === 0) return false;         // nincs útmutatója ebben a nézetben
  await gomb.click();
  // A LAP MAGA CSUKJA BE A SÚGÓT (`startTour` → `closeHelp`) — a próba NE nyomjon rá még egy Esc-et,
  // mert az már a MEGNYÍLT útmutató panelt zárná be. Saját lelet: emiatt futott időtúllépésbe a
  // lépés-cím olvasása (KUKA-209: a rajzolás és a művelet két külön tény).
  if (await page.getByTestId('tour').count() === 0) return false;
  if (await page.getByTestId('tour-step-title').count() === 0) {
    // DIAGNOSZTIKA: a panel kint van, de lépés nincs — a panel maga mondja meg, miért (megszakítás).
    const miert = ((await page.getByTestId('tour').textContent()) || '').trim().replace(/\s+/g, ' ').slice(0, 90);
    const elsoCel = TOURS[tourId].steps[0].target;
    const vanE = await page.getByTestId(elsoCel).count();
    const lathato = vanE ? await page.getByTestId(elsoCel).first().isVisible() : false;
    const jelenlevo = await page.evaluate(() => [...document.querySelectorAll('[data-testid]')]
      .map((e) => e.getAttribute('data-testid')).filter((x) => /^(auth|login|register|resend|nav-|app|tour)/.test(x)).slice(0, 14).join(','));
    return { nemIndult: `${miert} [első cél: ${elsoCel} · a lapon: ${vanE} · látható: ${lathato} · jelen: ${jelenlevo}]` };
  }
  return true;
}

/**
 * VÉGIGKATTINTÁS. A „Tovább" minden lépésen, az utolsóig. A mérés HÁROM dolgot gyűjt: hol állt meg,
 * volt-e nevezett megszakítás, és minden lépés szövege a nyelvcsomagból jött-e.
 */
/**
 * A `perform` A VALÓDI MŰVELETET RENDELI A FELADATHOZ KÖTÖTT LÉPÉSHEZ (R186 §1).
 *
 * MIÉRT KELLETT. A régi alak a `task`-ot deklaráló lépésen MEGÁLLT (`TASK-IG`), és ez őszinte volt —
 * de az R186 §1 azt kéri, hogy *„a teljes bejárásként számolt történetnél valódi művelet után
 * MINDEN későbbi lépést is mérj"*. Amíg a bejáró nem tudja ELVÉGEZNI a feladatot, a feladat UTÁNI
 * lépésekről semmit nem mér — tehát egy ott keletkező hibát nem is tud észrevenni.
 *
 * NEM ÚJ MECHANIZMUS (`KUKA-003`): a `perform`-os bejárás a `v3app-r93.spec.mjs` SAJÁT járójában
 * már öt éve ezt teszi (`walkTour(page, perform)`), csak a KÖZÖS otthonból maradt ki — pontosan az
 * a hiba-osztály, amiért ez a modul létrejött. Most a közös otthon kapja meg, és a két alak egy.
 *
 * A HATÁR, AMIT EZ NEM MOZDÍT. Művelet NÉLKÜL a megállás VÁLTOZATLAN: `TASK-IG`, nevezett lépéssel.
 * A bejáró tehát nem lett „megengedőbb" — csak ott mér tovább, ahol a hívó a valódi műveletet
 * ODAADJA. És a folytatás FELTÉTELE a LAP SAJÁT igazolása (`data-state="done"`, amit kizárólag a
 * szerver nyugtázott `taskDone` ad meg): ha a művelet lefutott, de a feladat nem teljesült, az
 * NEVEZETT bukás — nem csendes továbblépés (`KUKA-231` · `KUKA-041`).
 *
 * @param {Record<string, (ctx:{page,tourId,step,index}) => Promise<void>>} perform
 *   lépés-azonosító → a VALÓDI felhasználói művelet. Ami nincs benne, ott a bejárás megáll.
 * @param {Record<string, (ctx:{page,tourId,step,index}) => Promise<void>>} reveal
 *   lépés-azonosító → az a FELTÁRÓ művelet, amit a regiszter NEM tud megnevezni.
 *
 *   MIÉRT KELL, ÉS MIÉRT A HÍVÓ ADJA (R186 §1 — SAJÁT LELET, MÉRVE). A `tour.grant` és a
 *   `tour.scopeLifecycle` harmadik lépésének célja (`member-scope-row-keszlet` ·
 *   `member-scope-row-dokumentumok`) a TAG hozzáférés-paneljében rajzolódik, amit a sor
 *   `member-open-<alany>` gombja nyit — és azt a regiszter SZÁNDÉKOSAN nem nevezi meg lépés-célnak,
 *   mert minden fióknál más (`KUKA-225`). A lépés deklarált feltárója ezért a `members-list` tábla,
 *   ami a célt NEM tárja fel. MÉRVE egy egytagú vállalkozásban: a tábla ott van, a sor
 *   `member-open-…` gombja is, és a megnyitása UTÁN a cél LÁTHATÓ — tehát az útmutató végigvihető,
 *   csak a BEJÁRÓM nem jutott el odáig.
 *
 *   EZÉRT NEM A JÁRÓBA ÉPÜL BE: egy általános bejáró nem tudhat a tag-panelről (az útmutató-függő
 *   tudás a járóban `KUKA-003` szerinti második otthon volna). A hívó adja oda, ugyanazon az úton,
 *   mint a `perform`-ot — és ha nem adja, a bejárás NEVEZETTEN megáll, nem állít teljesítést.
 */
export async function walkTour(page, tourId, { perform = {}, reveal = {} } = {}) {
  const D = HU.TOUR[tourId];
  const steps = TOURS[tourId].steps;
  const bajok = [];
  /** A VALÓDI műveletek, amiket a bejárás ELVÉGZETT — a jelentés ezt is kimondja (`KUKA-216`). */
  const elvegzett = [];
  /**
   * A LÉPÉSENKÉNTI MÉRT TÉNYEK — hogy a verdikt VISSZAKERESHETŐ legyen (`KUKA-131`: a mérésnek a
   * nyersanyagát is meg kell tudni nézni, különben a szám nem ellenőrizhető). A hívó kiírhatja a
   * jelentésbe; a verdiktet NEM ez adja, hanem a `bajok` · `taskStop` · `elert`.
   */
  const naplo = [];
  /**
   * A MÉRT ELÉRÉS — ÉS AMIÉRT NEM A REGISZTER SZÁMA (SAJÁT LELET a javításon, `KUKA-443` alakja).
   *
   * A régi alak a hurok UTÁN `elert: steps.length`-et adott vissza — AKKOR IS, ha a hurok `break`-kel
   * szakadt meg. A verdikt ettől még piros volt (`bajok` nem üres), de a SZÁM a teljes bejárást
   * mondta: egy megszakadt futás „elért 18/18"-at jelentett. Ma a szám azt mondja, ameddig a mérés
   * tényleg eljutott (`KUKA-216`: a verdikt nem mutathat a mérés hatókörén túl).
   */
  let elert = 0;
  for (let i = 0; i < steps.length; i += 1) {
    const varhatoCim = D && D[steps[i].id] ? D[steps[i].id].title : null;
    if (!varhatoCim) { bajok.push(`${steps[i].id}: nincs szöveg a nyelvcsomagban`); break; }
    /**
     * A FELTÁRÓ VEZÉRLŐT A FELHASZNÁLÓ NYOMJA MEG — tehát a próba is (KUKA-228: amit az útmutató nem
     * nyom meg helyettünk, arra várni kell). Ha a lépés célja csak egy másik vezérlő használata UTÁN
     * létezik (`appears_after`), a bejárás előbb azt nyomja meg, ahogy az ember.
     */
    /**
     * ÉS A FELTÁRÁS A LÁTHATÓSÁGHOZ KÖTÖTT, NEM A LÉTEZÉSHEZ (R186 §1 — SAJÁT LELET, MÉRVE).
     *
     * A LELET, AHOGY ELŐJÖTT. A `tour-pending` olvasása (lentebb) a `tour.logout` MÁSODIK lépését
     * pirosra váltotta: *„a lépés a FELHASZNÁLÓ műveletére VÁR (targetPending) [cél(logout): 1 ·
     * feltáró: profile]"* — a cél tehát OTT VAN a lapon (`count: 1`), de a CSUKOTT profil-lenyíló
     * belsejében, vagyis NEM LÁTHATÓ. A motor ezt helyesen `targetPending`-nek mondja (`KUKA-228`),
     * a bejáró viszont a feltárót CSAK akkor nyomta meg, ha a cél NEM LÉTEZETT (`count() === 0`).
     * Így a profil-menü csukva maradt, a lépés a felhasználóra várt — és a mérés eddig `2/2 OK`-ot
     * írt rá. Hamis zöld a KÖTELEZŐ kapuban.
     *
     * UGYANAZ A LECKE, HARMADSZOR, EGY SORRAL ARRÉBB (`KUKA-237` · `KUKA-003`). A modul feje maga
     * írja le ezt a hibát a KATTINTÓ ágon: *„a feltáró vezérlőt CSAK akkor nyomtam meg, ha a lépés
     * célja még nem létezett"* — ott a `logout` lépésnél javítva. A FELTÁRÓ ágon viszont a
     * `count() === 0` feltétel maradt: a létezés nem láthatóság (`KUKA-038` alakja a felületen).
     * A kérdés mostantól ugyanaz, mint amit a MOTOR kérdez: LÁTJA-e a felhasználó a célt.
     */
    const feltaro = steps[i].appears_after;
    const celLathato = await page.getByTestId(steps[i].target).first().isVisible().catch(() => false);
    if (feltaro && !celLathato
        && await page.getByTestId(feltaro).count() > 0
        && await page.getByTestId(feltaro).first().isVisible()) {
      await page.getByTestId(feltaro).first().click();
    }
    // A BUBORÉK a lépés SAJÁT szövegét mutatja — a panel újrarajzolására várunk, nem egy pillanatot
    // mérünk (KUKA-121: a próba ne a saját türelmetlenségét mérje).
    try {
      await expect(page.getByTestId('tour-step-title')).toHaveText(varhatoCim, { timeout: 8000 });
    } catch {
      const kint = ((await page.getByTestId('tour-step-title').textContent().catch(() => null)) || '(nincs lépés-cím)').trim();
      // DIAGNOSZTIKA: ha a cím HIÁNYZIK, a panel állapota mondja meg, miért (megszakítás vagy eltűnt panel).
      const panelVan = await page.getByTestId('tour').count();
      const panelSzoveg = panelVan ? ((await page.getByTestId('tour').textContent()) || '').trim().replace(/\s+/g, ' ').slice(0, 90) : '(nincs panel)';
      const nextVan = await page.getByTestId('tour-next').count();
      const celVan = await page.getByTestId(steps[i].target).count();
      bajok.push(`${steps[i].id}: a buborék „${kint.slice(0, 50)}”, a csomag szerint „${varhatoCim}” [panel:${panelVan} next:${nextVan} cél(${steps[i].target}):${celVan} · ${panelSzoveg}]`);
      break;
    }
    // A NEVEZETT MEGSZAKÍTÁS a bukás: azt mondja, hogy a megnevezett elem nem látható ezen a képernyőn.
    if (await page.getByTestId('tour-blocked').count() > 0) {
      bajok.push(`${steps[i].id}: NEVEZETT megszakítás — ${((await page.getByTestId('tour-blocked').textContent()) || '').trim().slice(0, 70)}`);
      break;
    }
    /**
     * ÉS A LÉPÉS NEM TELJES, AMÍG A FELHASZNÁLÓRA VÁR (R186 §1 — SAJÁT LELET, az ELLENPRÓBA mérte ki).
     *
     * A LELET, AHOGY ELŐJÖTT. Az R186 §1 célzott ellenpróbáját megírtam (`R166-U7`): a bejárás
     * elvégzi a `tour.invite` ötödik lépésének VALÓDI műveletét, majd a HATODIK lépés célját
     * vezérelten elvesszük. A mérés erre **`6/6 OK`**-ot adott — tehát a feladat utáni hibát NEM
     * észlelte, pontosan az, amit a parancs tilt.
     *
     * AZ OK, MÉRVE a panel állapotán. A hiányzó cél KÉT külön helyzet a motorban (`KUKA-228`):
     * `targetMissing` (megszakít) és `targetPending` („előbb nyisd meg a kiemelt gombbal" — a
     * bemutató MEHET tovább, mert a felhasználó még tehet valamit). A `checkRun` a hatodik lépésnél
     * az UTÓBBIT adta, mert a lépés feltárója (`appears_after: invite-submit`) ott maradt a lapon:
     * a panel kiírta a hatodik lépés CÍMÉT egy várakozás-mondattal, megszakítás NÉLKÜL. A bejáró
     * pedig csak a CÍMET és a `tour-blocked`-ot olvasta, a `tour-pending`-et SOHA — és az UTOLSÓ
     * lépésnél nincs „Tovább", ami a várakozást felfedte volna.
     *
     * AMIT EZ KIMOND, ÉS AMI TÚLMUTAT AZ ELLENPRÓBÁN: ez nem az injektált hiba sajátja. BÁRMELY
     * útmutató, aminek az UTOLSÓ lépése a felhasználó műveletére vár, „teljes bejárás"-ként
     * jelent volna meg — a részleges futás a teljes mérés lapját írva felül (`KUKA-206`), a
     * verdikt a mérés hatókörén túl (`KUKA-216`), a kötelező kapu mellett ZÖLDEN.
     *
     * A MAI SZABÁLY: a `tour-pending` a LAP döntése (`data-actionable`, egy otthonból —
     * `INFORMATIONAL_PENDING`, `v3app/public/tour.mjs`), tehát a bejáró NEM dönti el maga, mi
     * teendő és mi tájékoztatás (`KUKA-003` · `KUKA-039`). Ami TEENDŐ, az nem teljesült lépés:
     * NEVEZETT baj, nem csendes zöld. Ez ugyanaz a döntés, amit az `r93` járója is kérdez.
     */
    const lepesAllapot = await page.locator(`[data-testid="tour-step-${steps[i].id}"]`).first()
      .getAttribute('data-state').catch(() => null);
    const celLathatoMost = await page.getByTestId(steps[i].target).first().isVisible().catch(() => false);
    const varakozasMiert = await page.getByTestId('tour-pending').count() > 0
      ? await page.getByTestId('tour-pending').getAttribute('data-why')
      : null;
    naplo.push(`${steps[i].id}: cél(${steps[i].target}) látható=${celLathatoMost} · állapot=${lepesAllapot ?? '?'}`
      + ` · várakozás=${varakozasMiert ?? 'nincs'}`);
    /**
     * ÉS A LÉPÉS CSAK AKKOR TELJES, HA A CÉLJA LÁTHATÓ (R186 §1 — SAJÁT LELET, az ELLENPRÓBA mérte ki).
     *
     * A LELET, AHOGY ELŐJÖTT. Az R186 §1 célzott ellenpróbáját megírtam (`R166-U7`): a bejárás
     * elvégzi a `tour.invite` ötödik lépésének VALÓDI műveletét, majd a HATODIK lépés célját
     * vezérelten LÁTHATATLANNÁ tesszük. A mérés erre **`6/6 OK`**-ot adott — tehát a feladat utáni
     * hibát NEM észlelte, pontosan az, amit a parancs tilt.
     *
     * AZ OK, MÉRVE a panel állapotán. A bejáró eddig CSAK a buborék CÍMÉT és a `tour-blocked`-ot
     * olvasta. A hiányzó cél viszont KÉT külön helyzet a motorban (`KUKA-228`): `targetMissing`
     * (megszakít — ezt a `tour-blocked` megfogja) és `targetPending` („előbb nyisd meg a kiemelt
     * gombbal" — a bemutató MEHET tovább). A hatodik lépésnél az UTÓBBI állt elő, mert a lépés
     * feltárója ott maradt a lapon: a panel kiírta a hatodik lépés CÍMÉT, megszakítás NÉLKÜL. És az
     * UTOLSÓ lépésnél nincs „Tovább", ami a várakozást felfedte volna.
     *
     * AMIT EZ KIMOND, ÉS AMI TÚLMUTAT AZ ELLENPRÓBÁN: ez nem az injektált hiba sajátja. BÁRMELY
     * útmutató, aminek az UTOLSÓ lépése a felhasználó műveletére vár, „teljes bejárás"-ként
     * jelent volna meg — a részleges futás a teljes mérés lapját írva felül (`KUKA-206`), a verdikt
     * a mérés hatókörén túl (`KUKA-216`), a KÖTELEZŐ kapu mellett ZÖLDEN.
     *
     * A KÉRDÉST UGYANÚGY TESSZÜK FEL, AHOGY A MOTOR (`KUKA-003` · `KUKA-039`): LÁTJA-E a néző a
     * célt (`targetOf` → `isShown`). És NEM a `tour-pending` feliratot olvassuk, mert az a RAJZOLÁS
     * pillanatának állapota — a néző a lenyílót azóta kinyithatta, és a felirat csak a következő
     * rajzolásnál frissül (`app.js`: „a feltárásra várás a MAI DOM-ból dől el"). A felirat tehát
     * ELAVULHAT; a cél láthatósága MA igaz (`KUKA-038`: a létezés nem bizonyíték a működésre).
     *
     * A KIMONDOTT KIVÉTEL: az IGAZOLTAN elvégzett lépésnek NINCS szüksége a céljára. Ezt a motor
     * `advance`-e is így tudja (a meghívás elfogadása után a meghívó-képernyő megszűnik), ezért a
     * `data-state="done"` lépést nem kérdőre vonjuk — különben a SAJÁT történetünket állítanánk
     * meg (`KUKA-394`).
     */
    let celLathato2 = celLathatoMost;
    if (!celLathato2 && lepesAllapot !== 'done' && typeof reveal[steps[i].id] === 'function') {
      // A HÍVÓ FELTÁRÓ MŰVELETE — az, amit a regiszter nem tud megnevezni (lásd a fenti `reveal`).
      try {
        await reveal[steps[i].id]({ page, tourId, step: steps[i], index: i });
        celLathato2 = await page.getByTestId(steps[i].target).first().isVisible().catch(() => false);
        naplo.push(`${steps[i].id}: hívói feltárás után látható=${celLathato2}`);
      } catch (e) {
        const miert = String((e && e.message) || e).replace(/\s+/g, ' ').slice(0, 90);
        bajok.push(`${steps[i].id}: a hívói FELTÁRÓ művelet bukott — ${miert}`);
        break;
      }
    }
    if (!celLathato2 && lepesAllapot !== 'done') {
      bajok.push(`${steps[i].id}: a lépés célja (${steps[i].target}) NEM LÁTHATÓ a lapon, és a lépés `
        + `nincs elvégezve (állapot: ${lepesAllapot ?? '(nincs ilyen lépés a panelen)'} · `
        + `várakozás: ${varakozasMiert ?? 'nincs'} · feltáró: ${steps[i].appears_after || '(nincs)'}) `
        + '— a bejárás tehát NEM teljes');
      break;
    }
    // ESZERTŐL A LÉPÉS TELJES: a buborék a SAJÁT szövegét mutatja, nincs nevezett megszakítás, és
    // nem vár a felhasználóra. A szám MÉRT tény — ezt írja ki a jelentés, nem a regiszter hosszát.
    elert = i + 1;
    /**
     * ÉS A FELHASZNÁLÓ A KIEMELT VEZÉRLŐT IS MEGNYOMJA (R166, külső review, Codex, P2 · KUKA-407).
     *
     * A MÉRŐM HIBÁJA: a feltáró vezérlőt CSAK akkor nyomtam meg, ha a lépés célja még nem létezett.
     * A `tour.logout` közbülső lépésének célja (`profile-menu-security`) viszont LÉTEZETT — így a
     * bejárás egyszerűen továbblépett, és soha nem aktiválta. A felhasználó megnyomja, a navigáció
     * BEZÁRJA a profil-menüt, és a következő lépés célja (`logout`) ELTŰNIK. A próbám tehát egy
     * olyan utat mért, amit ember nem jár be (KUKA-237: a mérés a VISELKEDÉST mérje).
     *
     * MOSTANTÓL a bejárás minden lépés SAJÁT célját megnyomja — az UTOLSÓT kivéve, mert az a CÉL
     * (a kijelentkezés megnyomása véget vetne a munkamenetnek, a mentés elküldené az űrlapot).
     * Ha a cél nem megnyomható (szöveg, tábla, panel), a kattintás elmarad: nem a próba dönti el,
     * mi vezérlő, hanem a lap.
     */
    /**
     * ÉS AHOL A LÉPÉS A FELHASZNÁLÓ SAJÁT MŰVELETÉRE VÁR, OTT A BEJÁRÁS MEGÁLL — MÉRT TÉNYKÉNT, NEM
     * BUKÁSKÉNT (R166, hetedik kör · SAJÁT LELET, a minta-kapu viselkedés-őre mérte ki).
     *
     * A LELET: az általános őröm a `tour.invite` és a `tour.scopeLifecycle` bejárását MEGSZAKADÁSNAK
     * írta. Megmértem: mindkettőnél a megálló lépés `task`-ot DEKLARÁL (`invite.created` ·
     * `grant.saved`), tehát az útmutató SZÁNDÉKOSAN vár — a `KUKA-228` szabálya szerint amit a
     * bemutató nem nyom meg helyettünk, arra VÁRNI kell. A bejáró nem tud meghívót létrehozni és
     * jogot kiadni, tehát a lépésen TÚL nem tud mérni: a „Tovább" megnyomása ilyenkor HAMIS
     * megszakadást gyártott volna, és a mérés a saját korlátját mondta volna a rendszer hibájának
     * (`KUKA-216`: a verdikt nem mutathat a mérés hatókörén túl).
     *
     * A MEGÁLLÁS NEM NÉMA (`KUKA-012`): a visszatérés megnevezi a lépést, tehát a jelentésben
     * látszik, meddig jutott a mérés — és a hívó dönti el, hogy az elég-e neki.
     */
    if (steps[i].task !== null && steps[i].task !== undefined) {
      const muvelet = perform[steps[i].id];
      /**
       * MŰVELET NÉLKÜL A MEGÁLLÁS VÁLTOZATLAN (`TASK-IG`) — a fenti bekezdés szabálya áll.
       * A bejáró nem nyomja meg a „Tovább"-ot a felhasználó helyett, és nem állít teljesítést.
       */
      if (typeof muvelet !== 'function') {
        return { bajok, lepes: steps.length, elert: i + 1, taskStop: `${steps[i].id} (${steps[i].task})`, elvegzett, naplo };
      }
      /**
       * VAN MŰVELET → ELVÉGEZZÜK, ÉS A MÉRÉS A FELADAT UTÁN IS FOLYTATÓDIK (R186 §1).
       *
       * A művelet a HÍVÓ dolga, mert a valódi lépés (meghívó kiállítása, jogadás, elfogadás) a
       * próba világához tartozik — a bejáró nem tudja kitalálni, KINEK és MIT. Ami itt eldől: a
       * művelet bukása NEVEZETT baj, nem időtúllépés (`KUKA-215`), és a továbblépés FELTÉTELE a lap
       * saját igazolása.
       */
      try {
        await muvelet({ page, tourId, step: steps[i], index: i });
      } catch (e) {
        const miert = String((e && e.message) || e).replace(/\s+/g, ' ').slice(0, 90);
        bajok.push(`${steps[i].id}: a VALÓDI művelet (${steps[i].task}) elvégzése BUKOTT — ${miert}`);
        break;
      }
      /**
       * ÉS A LAP IGAZOLÁSA A FELTÉTEL, NEM A MŰVELET LEFUTÁSA (`KUKA-231` · `KUKA-227`).
       *
       * A lépés `done` állapotát KIZÁRÓLAG a szerver által nyugtázott `taskDone` adja meg
       * (`v3app/public/tour.mjs`). Ha a művelet lefutott, de a feladat nem teljesült, a bejárás
       * NEVEZETTEN bukik — különben pont azt a hamis zöldet gyártanánk újra, amit az R186 §1 tilt:
       * a részleges eredmény teljes zölddé fordítását.
       */
      const lezart = page.locator(`[data-testid="tour-step-${steps[i].id}"][data-state="done"]`);
      try {
        await expect(lezart).toHaveCount(1, { timeout: 8000 });
      } catch {
        const allapot = await page.locator(`[data-testid="tour-step-${steps[i].id}"]`).first()
          .getAttribute('data-state').catch(() => null);
        bajok.push(`${steps[i].id}: a művelet lefutott, de a LAP NEM igazolta a feladatot `
          + `(${steps[i].task}) — a lépés állapota: ${allapot ?? '(nincs ilyen lépés a panelen)'}`);
        break;
      }
      elvegzett.push(`${steps[i].id} (${steps[i].task})`);
      /**
       * A TOVÁBBLÉPÉS UGYANAZON AZ ÚTON MEGY, MINT A TÖBBI LÉPÉSNÉL — DE A CÉLT NEM NYOMJUK MEG
       * MÉGEGYSZER: a valódi műveletet a `perform` MÁR elvégezte, egy második kattintás ugyanarra a
       * vezérlőre (mentés, elküldés) a műveletet ISMÉTELNÉ meg. A következő lépés céljának
       * megjelenésére viszont itt is várunk (`KUKA-121`: a próba ne a saját türelmetlenségét mérje).
       */
      if (i + 1 < steps.length) {
        await page.getByTestId(steps[i + 1].target).first()
          .waitFor({ state: 'visible', timeout: 3000 })
          .catch(() => { /* nem jelent meg — a következő kör állítása ezt MÉRI, nem elfedi */ });
        await page.getByTestId('tour-next').click();
      }
      continue;
    }
    if (i + 1 < steps.length) {
      const cel = page.getByTestId(steps[i].target).first();
      if (await cel.count() > 0 && await cel.isVisible()) {
        const megnyomhato = await cel.evaluate((el) => {
          const t = el.tagName.toLowerCase();
          return t === 'button' || t === 'a' || t === 'summary' || el.hasAttribute('data-go')
            || el.hasAttribute('data-action') || el.hasAttribute('data-auth');
        }).catch(() => false);
        if (megnyomhato) await cel.click({ trial: false }).catch(() => { /* a lap elvette — a következő állítás méri */ });
      }
      /**
       * ÉS A LAP ÚJRARAJZOLÁSÁRA VÁRUNK, MIELŐTT TOVÁBBLÉPÜNK (SAJÁT LELET a kattintó bejáróm első
       * alakján, a böngészős kapu mérte ki).
       *
       * A LELET: a kattintás után AZONNAL nyomtam a „Tovább"-ot. A `tour.resend` első lépése a
       * nézetet váltja (`auth-resend-open` → a megerősítés-újraküldő lap), és a következő lépés célja
       * csak az ÚJRARAJZOLÁS után létezik. A „Tovább" így a RÉGI lapon értékelte a következő lépést,
       * és nevezetten megszakadt — a cél a diagnosztika szerint EKKOR MÁR ott volt (`cél:1`), csak a
       * kiértékelés pillanatában még nem. Vagyis a próba a SAJÁT türelmetlenségét mérte (KUKA-121).
       *
       * MOSTANTÓL megvárjuk, hogy a KÖVETKEZŐ lépés célja látható legyen — ahogy az ember is látja a
       * változást, mielőtt továbblép. A várakozás KORLÁTOS, és a lejárata NEM bukás: ha a cél tényleg
       * nem jelenik meg, a „Tovább" megy, és az ÚTMUTATÓ MAGA mondja ki a megszakítást — azt mérjük.
       */
      const kovetkezoCel = steps[i + 1].target;
      await page.getByTestId(kovetkezoCel).first()
        .waitFor({ state: 'visible', timeout: 3000 })
        .catch(() => { /* nem jelent meg — a következő állítás ezt MÉRI, nem elfedi */ });
      await page.getByTestId('tour-next').click();
    }
  }
  return { bajok, lepes: steps.length, elert, taskStop: null, elvegzett, naplo };
}


/**
 * A BEJÁRÁS VERDIKTJE ÉS JELENTÉS-SORA — EGY OTTHONBÓL (R176, külső review P2 · `KUKA-443`).
 *
 * A LELET (Codex, a tizenkettedik külső kör): a `walkTour` a `task`-ra váró lépésen MEGÁLL, és a
 * megállást nevezetten vissza is adja (`taskStop` · `elert < lepes`) — a HÍVÓ viszont két helyen
 * MÁSKÉNT olvasta. A minta-kapu őre a három kimenetet szétválasztotta; a pótolt útmutatók lapja
 * ellenben CSAK a `bajok`-at nézte, és minden más esetben `r.lepes/r.lepes OK`-ot írt. Egy
 * task-on megálló bejárás tehát „7/7 OK"-ként jelent volna meg: a verdikt a mérés HATÓKÖRÉN TÚL
 * mutatott volna (`KUKA-216`), és a részleges futás a teljes mérés lapját írta volna felül
 * (`KUKA-206`) — a kötelező kapu mellett ZÖLDEN.
 *
 * MÉRT HATÓKÖR, KIMONDVA: a pótolt tizenkettő közül MA egyetlen lépés sem deklarál `task`-ot
 * (mérve: `R166-U5`), tehát a hamis `OK` ma nem keletkezik — a lelet LAPPANGÓ. A javítás ezért nem
 * egy mai hamis zöldet szüntet meg, hanem a CSAPDÁT: az első `task`-ot kapó lépésnél a lap
 * nevezetten mondaná ki a részleges mérést, nem némán zöldet.
 *
 * ÉS AZÉRT ITT ÁLL, NEM A LAPOKON (`KUKA-003` · a modul fejének saját figyelmeztetése): ha a
 * verdikt-olvasás két helyen áll, a kettő elcsúszik — pontosan ez csúszott el. A számot is a
 * MÉRÉS adja (`r.elert`), nem a regiszter (`r.lepes`): így a sor nem tud olyan számot kiírni,
 * amit nem járt be.
 */
export const WALK_OK = 'OK';
export const WALK_TASK = 'TASK-IG';
export const WALK_BROKEN = 'MEGSZAKADT';

export function walkOutcome(r) {
  if (!r || typeof r !== 'object') return WALK_BROKEN;
  if (Array.isArray(r.bajok) && r.bajok.length) return WALK_BROKEN;
  if (r.taskStop) return WALK_TASK;
  if (r.elert !== r.lepes) return WALK_BROKEN;   // kevesebbet járt be, és NINCS nevezett oka
  return WALK_OK;
}

export function walkReport(tourId, r) {
  const k = walkOutcome(r);
  if (k === WALK_BROKEN) {
    const miert = Array.isArray(r && r.bajok) && r.bajok.length
      ? r.bajok.join(' · ')
      : `elért ${r && r.elert}/${r && r.lepes}, nevezett ok nélkül`;
    return `${tourId}: ${WALK_BROKEN} — ${miert}`;
  }
  if (k === WALK_TASK) return `${tourId}: ${WALK_TASK} ${r.elert}/${r.lepes} — a felhasználó műveletére vár (${r.taskStop})`;
  /**
   * ÉS A TELJES BEJÁRÁS KIMONDJA, HOGY VALÓDI MŰVELETET IS VÉGZETT (R186 §1).
   *
   * MIÉRT: a feladat UTÁNI lépések mérése csak akkor jelent valamit, ha a feladat tényleg
   * elvégződött — és egy jelentés-sorból ez eddig nem látszott. A sor ezért megnevezi az elvégzett
   * műveleteket; ahol nincs ilyen, a sor VÁLTOZATLAN (`tourId: n/n OK`), tehát a művelet nélküli
   * bejárás nem állít magáról többet, mint eddig (`KUKA-216`).
   */
  const muveletek = Array.isArray(r && r.elvegzett) && r.elvegzett.length
    ? ` · elvégezve: ${r.elvegzett.join(' · ')}`
    : '';
  return `${tourId}: ${r.elert}/${r.lepes} ${WALK_OK}${muveletek}`;
}
