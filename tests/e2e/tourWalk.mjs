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
  if (await page.getByTestId('help-open').count() === 0) return false;
  await page.getByTestId('help-open').click();
  await expect(page.getByTestId('help-close')).toBeVisible();
  await page.getByTestId('help-tab-guides').click();
  // A FELHASZNÁLÓ ÚTJA: a súgó-sort előbb KI KELL NYITNI — az útmutató gombja a sor alatt áll,
  // tehát a zárt sor mellett nem létezik (a `appears_after` elve a súgóban is érvényes).
  const sor = page.getByTestId(`help-guide-${featureId}`);
  if (await sor.count() === 0) return false;          // a súgó ebben a nézetben nem kínálja fel
  await sor.getByRole('button').first().click();
  const gomb = page.getByTestId(`help-tour-${featureId}`);
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
export async function walkTour(page, tourId) {
  const D = HU.TOUR[tourId];
  const steps = TOURS[tourId].steps;
  const bajok = [];
  for (let i = 0; i < steps.length; i += 1) {
    const varhatoCim = D && D[steps[i].id] ? D[steps[i].id].title : null;
    if (!varhatoCim) { bajok.push(`${steps[i].id}: nincs szöveg a nyelvcsomagban`); break; }
    /**
     * A FELTÁRÓ VEZÉRLŐT A FELHASZNÁLÓ NYOMJA MEG — tehát a próba is (KUKA-228: amit az útmutató nem
     * nyom meg helyettünk, arra várni kell). Ha a lépés célja csak egy másik vezérlő használata UTÁN
     * létezik (`appears_after`), a bejárás előbb azt nyomja meg, ahogy az ember.
     */
    const feltaro = steps[i].appears_after;
    if (feltaro && await page.getByTestId(steps[i].target).count() === 0
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
      return { bajok, lepes: steps.length, elert: i + 1, taskStop: `${steps[i].id} (${steps[i].task})` };
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
  return { bajok, lepes: steps.length, elert: steps.length, taskStop: null };
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
  return `${tourId}: ${r.elert}/${r.lepes} ${WALK_OK}`;
}
