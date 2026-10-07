// tests/e2e/v3app-r166-minta-kapu.spec.mjs — A MINTAADAT-KAPU VISELKEDÉS-ŐRE (R166, HETEDIK KÖR).
//
// MIÉRT VAN EZ A LAP, ÉS MIÉRT NEM EGY ÚJABB STATIKUS PIN.
//
// A `KUKA-413` javításához írtam egy „általános" őrt (`aq8`), ami a MINTAADATTÓL függő horgonyokat a
// lap forrásából vezette le. A hetedik review-kör megmutatta, hogy az őröm KÉT okból volt vak:
//   1. CSAK a `tablePage()` függvényt olvasta — a `stockCardPage()` és a `movementsPage()` ugyanúgy
//      ÜRES ÁLLAPOTTAL tér vissza korán, és azokat nem nézte (`KUKA-239`: a fájl nem a függvény);
//   2. a `sample-document` · `sample-document-full` · `sample-supplier` horgony a forrásban
//      SEHOL nem szerepel betű szerint — DINAMIKUSAN születik (`data-testid="sample-${kulcs}"`),
//      egy olyan segédből (`serverSamples`), amit a tábla-lap az ÜRES ÁLLAPOT korai visszatérése
//      UTÁN hív meg. Egy betű-egyeztető letapogató ezt SOHA nem látja meg.
//
// TEHÁT A SZABÁLYT NEM SZÖVEGBŐL, HANEM VISELKEDÉSBŐL MÉRJÜK (`KUKA-237` · `KUKA-207`): egy olyan
// vállalkozásban, ahol NINCS kiosztott bemutató-minta, MINDAZ, amit a KISZOLGÁLÓ felkínál, legyen
// VÉGIGVIHETŐ. Ez az állítás nem tud elcsúszni a felület átírásával, nem kell hozzá horgony-névsor,
// és a dinamikus horgonyt is méri — mert a böngészőt kérdezi, nem a forrást.
//
// A HELYZET ELŐÁLLÍTÁSA A TERMÉK SAJÁT SZABÁLYÁBÓL JÖN: a bemutató-mintából KETTŐ van, és az
// `assignDemoFixture()` a létrehozónak sorban osztja — a HARMADIK vállalkozása tehát minta nélkül
// születik. Nem állítunk be semmit kézzel: a felhasználó útján hozunk létre három céget.
import { test, expect } from '@playwright/test';
import { World, createWorkspaceUI, gotoPage, switchUI } from './helpers.mjs';
import { TOURS } from '../../v3app/knowledge/features.mjs';
import { closeModals, startTourViaHelp, walkTour } from './tourWalk.mjs';

test.describe.configure({ mode: 'serial' });

let world; let anna; let elsoBook; let harmadikBook;

test.beforeAll(async ({ browser }) => {
  world = new World(browser, 'r166mk');
  anna = await world.person('anna');
  // HÁROM vállalkozás UGYANATTÓL a létrehozótól: az első kettő kap mintát, a harmadik NEM.
  const w1 = await createWorkspaceUI(anna.page, { name: 'Minta Egy Kft', business: { jurisdiction: 'HU', tax_id: '82345671-2-42' } });
  await createWorkspaceUI(anna.page, { name: 'Minta Kettő Kft', business: { jurisdiction: 'HU', tax_id: '12345676-2-42' } });
  const w3 = await createWorkspaceUI(anna.page, { name: 'Minta Nélkül Kft', business: { jurisdiction: 'HU', tax_id: '10779224-2-44' } });
  elsoBook = w1.bookId;
  harmadikBook = w3.bookId;
  expect(Boolean(elsoBook) && Boolean(harmadikBook) && elsoBook !== harmadikBook,
    'mindhárom vállalkozás létrejött, és a kettő KÜLÖN könyv').toBe(true);
  // A HARMADIK a vizsgált nézet — a létrehozás után már ez az aktuális, de kimondjuk.
  if ((await anna.page.getByTestId('header-workspace').textContent() || '').indexOf('Minta Nélkül') < 0) {
    await switchUI(anna.page, harmadikBook);
  }
});

test.afterAll(async () => { if (world) await world.close(); });

test('R166-MK0 — a helyzet ELLENPÁRRAL mérve: az ELSŐ cégnek VAN mintája, a HARMADIKNAK NINCS', async () => {
  /**
   * EZ AZ ELLENPÁR A LAP ALAPJA. A `demo-empty` puszta jelenléte önmagában nem bizonyítja, hogy a
   * MINTA hiánya okozta — ugyanazt rajzolná egy üres lista is. Ezért UGYANAZT az állítást mérjük a
   * két fiókban, és a kettőnek MÁST kell adnia: enélkül egy olyan mérés maradna, ami akkor is zöld,
   * ha a minta-kiosztás elromlik (KUKA-215 · KUKA-216 — a mérésnek tudnia kell PIROSRA fordulni).
   */
  await switchUI(anna.page, elsoBook);
  await gotoPage(anna.page, 'warehouses');
  const elsoUres = await anna.page.getByTestId('demo-empty').count();

  await switchUI(anna.page, harmadikBook);
  await gotoPage(anna.page, 'warehouses');
  const harmadikUres = await anna.page.getByTestId('demo-empty').count();

  expect(`első:${elsoUres > 0 ? 'ÜRES' : 'van minta'} · harmadik:${harmadikUres > 0 ? 'ÜRES' : 'van minta'}`,
    'a bemutató-mintából KETTŐ van: az első cég kap, a harmadik nem').toBe('első:van minta · harmadik:ÜRES');
});

test('R166-MK1 — minta NÉLKÜL a kiszolgáló EGY mintához kötött útmutatót sem kínál fel', async () => {
  const kinalt = await anna.page.evaluate(async () => {
    const r = await fetch('/api/assistant/status', { headers: { accept: 'application/json' } });
    const j = await r.json();
    return (j.tours || []).map((t) => t.id);
  });
  const mintahoz = Object.values(TOURS).filter((t) => t.requires_demo_fixture === true).map((t) => t.id);
  expect(mintahoz.length, 'van mintához kötött útmutató a regiszterben').toBeGreaterThan(0);
  const tevesen = mintahoz.filter((id) => kinalt.includes(id));
  expect(tevesen.join(' · ') || 'egy sem',
    `minta nélkül NEM kínálhatók fel — a kiszolgáló ${kinalt.length} útmutatót kínált`).toBe('egy sem');
});

test('R166-MK2 — ÁLTALÁNOS ŐR: minta nélkül MINDEN felkínált útmutató VÉGIGVIHETŐ (a viselkedés mérve, nem a forrás)', async () => {
  const kinalt = await anna.page.evaluate(async () => {
    const r = await fetch('/api/assistant/status', { headers: { accept: 'application/json' } });
    const j = await r.json();
    return (j.tours || []).map((t) => t.id);
  });
  // A BELÉPETT nézetben indítható útmutatókat járjuk be; a névtelen képernyőre kötötteket a
  // kiszolgáló belépve ki is zárja, a `page: null`-osokat pedig a súgóból indítjuk, ahogy az ember.
  const bejarando = kinalt.filter((id) => TOURS[id] && TOURS[id].requires_anonymous !== true);
  expect(bejarando.length, 'van mit bejárni').toBeGreaterThan(0);
  const jelentes = [];
  for (const t of bejarando) {
    if (await anna.page.getByTestId('tour-exit').count()) await anna.page.getByTestId('tour-exit').click();
    await closeModals(anna.page);
    await gotoPage(anna.page, 'overview');
    const elindult = await startTourViaHelp(anna.page, t);
    if (elindult !== true) {
      // A SÚGÓ NEM KÍNÁLTA FEL: ez NEM bukás — a súgó nézet-szűrése szűkebb lehet, mint a
      // kiszolgáló listája. A NEM INDULÓ viszont nevezetten látszik a jelentésben (KUKA-216).
      jelentes.push(`${t}: nem indult a súgóból — ${elindult && elindult.nemIndult ? elindult.nemIndult : 'a súgó nem kínálta fel'}`);
      continue;
    }
    const r = await walkTour(anna.page, t);
    /**
     * HÁROM KIMENET, ÉS CSAK AZ EGYIK BUKÁS (`KUKA-216`):
     *   · végigvihető                → `OK`
     *   · a FELHASZNÁLÓ műveletére vár (`task`) → `TASK-IG` — MÉRT tény, nem bukás: a bejáró nem
     *     tud meghívót létrehozni vagy jogot kiadni, tehát a lépésen TÚL nem tud mérni;
     *   · NEVEZETT megszakadás vagy nem létező cél → `MEGSZAKADT` — EZ a bukás.
     */
    if (r.bajok.length) jelentes.push(`${t}: MEGSZAKADT — ${r.bajok.join(' · ')}`);
    else if (r.taskStop) jelentes.push(`${t}: TASK-IG ${r.elert}/${r.lepes} — a felhasználó műveletére vár (${r.taskStop})`);
    else jelentes.push(`${t}: ${r.lepes}/${r.lepes} OK`);
    if (await anna.page.getByTestId('tour-exit').count()) await anna.page.getByTestId('tour-exit').click();
  }
  const megszakadt = jelentes.filter((x) => /MEGSZAKADT/.test(x));
  expect(megszakadt.join(' | ') || 'egy sem szakadt meg',
    `minta nélkül minden felkínált útmutató végigvihető a felhasználó műveletét NEM igénylő lépéseken — mérve: ${jelentes.join(' | ')}`).toBe('egy sem szakadt meg');

  /**
   * ÉS A MÉRÉS NEM LEHET ÜRES: ha minden útmutató már az ELSŐ lépésén task-ra várna, a fenti
   * állítás üresen is zöld lenne. Ezért kimondjuk, hogy VAN teljesen bejárt útmutató — és hogy a
   * MINTÁHOZ KÖTÖTT hét közül egy sem hordoz task-ot, tehát a lelet osztálya tényleg mérve van.
   */
  const teljes = jelentes.filter((x) => / OK$/.test(x));
  expect(teljes.length, `van teljesen bejárt útmutató ebben a fiókban — mérve: ${jelentes.join(' | ')}`).toBeGreaterThan(4);
  const mintasTask = Object.values(TOURS).filter((t) => t.requires_demo_fixture === true)
    .filter((t) => t.steps.some((l) => l.task !== null && l.task !== undefined)).map((t) => t.id);
  expect(mintasTask.join(' · ') || 'egyik sem',
    'a mintához kötött útmutatók közül EGY SEM vár a felhasználó műveletére — tehát a task-megállás nem fedi el ezt az osztályt').toBe('egyik sem');
});
