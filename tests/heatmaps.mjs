import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(msg.text().slice(0, 350));
  });
  for (const renderer of ['mui-heatmap', 'base-heatmap']) {
    await page.goto(`${process.env.DEMO_URL ?? 'http://127.0.0.1:5186'}/?renderer=${renderer}`);
    await page.getByLabel('Resolution', { exact: true }).selectOption('96x60');
    await expect(page.locator('.stage .chart-pixel')).toHaveCount(5760, { timeout: 60000 });
    await page.getByRole('button', { name: 'Start DOOM' }).click();
    await expect(page.locator('.stage .chart-pixel[style*="fill"]')).toHaveCount(5760, {
      timeout: 30000,
    });
    const bounds = await page.locator('.stage .chart-pixel').evaluateAll((nodes) =>
      [nodes[0], nodes.at(-1)].map((n) => {
        const b = n.getBBox();
        return { x: b.x, y: b.y, width: b.width, height: b.height };
      }),
    );
    console.log(renderer, 'bounds', bounds);
    expect(bounds[0].x).toBeCloseTo(0, 0);
    expect(bounds[0].y).toBeCloseTo(0, 0);
    expect(bounds[1].x).toBeCloseTo(95 * 6, 0);
    expect(bounds[1].y).toBeCloseTo(59 * 6, 0);
    const before = await page
      .locator('.chart-pixel')
      .evaluateAll((nodes) => nodes.map((n) => n.style.fill).join(','));
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1000);
    await page.keyboard.up('ArrowRight');
    const after = await page
      .locator('.chart-pixel')
      .evaluateAll((nodes) => nodes.map((n) => n.style.fill).join(','));
    expect(before).not.toEqual(after);
    await page.screenshot({ path: `/tmp/doom-${renderer}.png`, fullPage: true });
    await page.getByLabel('Resolution', { exact: true }).selectOption('192x120');
    await expect(page.locator('.stage .chart-pixel[style*="fill"]')).toHaveCount(23040, {
      timeout: 60000,
    });
    console.log(
      'PASS',
      renderer,
      '5760 and 23040 SVG cells, correct geometry, changing game frames',
    );
  }
  expect(errors).toEqual([]);
} finally {
  await browser.close();
}
