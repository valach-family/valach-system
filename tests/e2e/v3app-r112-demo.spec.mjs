// tests/e2e/v3app-r112-demo.spec.mjs — A TÖRTÉNETEK BEMUTATÓ-LAPJA TÉNYLEGESEN HASZNÁLHATÓ (R112 §3 · P109-03).
//
// A KÖVETELMÉNY: „Az átadás előtt ténylegesen nyisd meg a kész belépőoldalt, ellenőrizd a kapcsolódó
// fájlokat/linkeket, valamint asztali és keskeny nézetben az alapvető használhatóságot. Ne maradjon
// »page not found«." Ez a próba EZT teszi, a generált lapon (`docs/_olvashato/V3_R112_TORTENETEK_BEMUTATO.html`,
// az e2e előkészítése állítja elő):
//   R112-D1  asztali nézet, magyarul: MINDEN történet MINDEN lépése kattintható, a kattintás után LÁTHATÓ
//            eredmény van, a végén lezárás, az újrakezdés és a visszalépés működik
//   R112-D2  keskeny nézet (390×844), angolul és németül: ugyanez, vízszintes kilógás nélkül, és egyetlen
//            FELOLDATLAN szöveg-hivatkozás sem marad a lapon (`[UI.…]` · `[KB:…]` alak)
//   R112-D3  a lap nem hivatkozik nem létező fájlra, és a szimuláció/bizonyíték jelölése ott van
// AMIT NEM MÉR: a valódi alkalmazást — azt a lap alján felsorolt böngésző-próbák mérik.
import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { STORIES } from '../../v3app/knowledge/stories.mjs';
import { STORY_STEPS } from '../../tools/lib/v3_tortenet_lejatszo.mjs';

const FILE = resolve(process.cwd(), 'docs/_olvashato/V3_R112_TORTENETEK_BEMUTATO.html');
const UNRESOLVED = /\[(UI|STATE|TPL|REASON|SRV|PAGE|ROLE|SCOPE|TOURUI|KB|FAQ|TOUR|STORY|NAME)[.:][^\]]*\]/;

async function openDemo(browser, viewport) {
  const ctx = await browser.newContext(viewport ? { viewport } : {});
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`file://${FILE}`);
  return { ctx, page, errors };
}
async function pickLang(page, code) { await page.locator('#lang').selectOption(code); await expect(page.locator('html')).toHaveAttribute('lang', code); }

/** Egy történet végigkattintása: minden lépésnél a művelet, a látható eredmény, majd tovább. */
async function walkStory(page, id) {
  await page.getByTestId(`story-start-${id}`).click();
  const steps = STORY_STEPS[id];
  for (let i = 0; i < steps.length; i += 1) {
    await expect(page.getByTestId('story-explain')).toContainText(`${i + 1}/${steps.length}.`);
    await page.getByTestId('story-act').click();
    // A MŰVELET UTÁN a képernyő MÁS, és a folytatás gombja ott van (a látható eredmény).
    await expect(page.getByTestId('story-act')).toHaveCount(0);
    await expect(page.getByTestId('story-next')).toBeVisible();
    const text = await page.locator('#stories').innerText();
    expect(text, `feloldatlan szöveg: ${id} ${i + 1}. lépés`).not.toMatch(UNRESOLVED);
    await page.getByTestId('story-next').click();
  }
  await expect(page.getByTestId('story-finished')).toBeVisible();
}

test.describe('R112 — a történetek bemutató-lapja', () => {
  test('R112-D1 — asztali nézet: minden történet végigkattintható, újrakezdhető, visszaléphető', async ({ browser }) => {
    expect(existsSync(FILE), 'a bemutató-lapot az e2e előkészítése állítja elő').toBe(true);
    const { ctx, page, errors } = await openDemo(browser, { width: 1280, height: 860 });
    await expect(page.getByTestId('stories')).toBeVisible();
    for (const s of STORIES) await expect(page.getByTestId(`story-card-${s.id}`)).toBeVisible();
    for (const s of STORIES) {
      await walkStory(page, s.id);
      // ÚJRAKEZDÉS: az első lépésre áll vissza, a művelet újra kattintható.
      await page.getByTestId('story-restart').click();
      await expect(page.getByTestId('story-explain')).toContainText(`1/${STORY_STEPS[s.id].length}.`);
      await expect(page.getByTestId('story-act')).toBeVisible();
      await page.getByTestId('story-back-top').click();
      await expect(page.getByTestId(`story-card-${s.id}`)).toBeVisible();
    }
    // A BIZONYÍTÉK és a SZIMULÁCIÓ jelölése a lejátszóban.
    await page.getByTestId('story-start-story.growing').click();
    await expect(page.locator('.simtag')).toContainText('SZIMULÁCIÓ');
    await expect(page.getByTestId('story-evidence')).toBeVisible();
    expect(errors, 'nincs konzol-hiba').toEqual([]);
    await ctx.close();
  });

  for (const code of ['en', 'de']) {
    test(`R112-D2/${code} — keskeny nézet: végigkattintható, kilógás és feloldatlan szöveg nélkül`, async ({ browser }) => {
      const { ctx, page, errors } = await openDemo(browser, { width: 390, height: 844 });
      await pickLang(page, code);
      for (const s of STORIES) {
        await walkStory(page, s.id);
        const tul = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(tul, `vízszintes kilógás: ${s.id}`).toBeLessThanOrEqual(1);
        await page.getByTestId('story-back').click();
      }
      expect(errors, 'nincs konzol-hiba').toEqual([]);
      await ctx.close();
    });
  }

  test('R112-D3 — nincs hivatkozás nem létező fájlra; a súgó-bemutató mód is működik', async ({ browser }) => {
    const { ctx, page, errors } = await openDemo(browser);
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href], link[href], script[src], img[src]')]
      .map((a) => a.getAttribute('href') || a.getAttribute('src')));
    for (const h of hrefs) {
      if (/^(https?:|mailto:|#|data:)/.test(h)) continue;
      expect(existsSync(resolve(dirname(FILE), h)), `hivatkozott fájl: ${h}`).toBe(true);
    }
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).not.toMatch(/page not found|404|nem található oldal/i);
    // A MÁSODIK MÓD (R89 súgó-bemutató) ugyanazon a lapon él tovább.
    await page.getByTestId('mode-help').click();
    await expect(page.locator('#techbox')).toBeVisible();
    await page.locator('#help').click();
    await expect(page.locator('.panel')).toBeVisible();
    expect(errors).toEqual([]);
    await ctx.close();
  });
});
