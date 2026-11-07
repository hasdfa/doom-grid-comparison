import { chromium, expect } from '@playwright/test';
const renderer = process.argv[2] ?? 'aggrid';
const url = process.env.DEMO_URL ?? 'http://127.0.0.1:5186';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${url}/?renderer=${renderer}`);
  await page.getByRole('button', { name: 'Start DOOM' }).click();
  await expect(page.locator('.pixel[style*="background"]')).toHaveCount(23040, { timeout: 30000 });
  await expect(page.locator('.overlay')).toHaveCount(0);
  const first = await page
    .locator('.pixel')
    .evaluateAll((nodes) => nodes.map((n) => n.style.backgroundColor).join(','));
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1200);
  await page.keyboard.up('ArrowRight');
  const second = await page
    .locator('.pixel')
    .evaluateAll((nodes) => nodes.map((n) => n.style.backgroundColor).join(','));
  expect(first).not.toEqual(second);
  await page.screenshot({ path: `/tmp/doom-${renderer}.png`, fullPage: true });
  console.log(renderer, await page.locator('.readout').innerText());
  console.log(
    'grid dimensions',
    await page
      .locator('.grid-scale')
      .evaluate((n) => ({ width: n.scrollWidth, height: n.scrollHeight })),
  );
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume game' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume game' }).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start DOOM' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `/tmp/doom-${renderer}-mobile.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  console.log(
    'PASS: 23,040 colored cells, changing frames, controls, mobile width, no page errors',
  );
} finally {
  await browser.close();
}
