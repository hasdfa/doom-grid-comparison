import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') console.log('console', message.text().slice(0, 600));
});
await page.goto('http://127.0.0.1:5186');
await page.getByRole('button', { name: 'Start DOOM' }).click();
await page.waitForTimeout(5000);
console.log('premium', await page.locator('main').innerText());
console.log(
  'pixels',
  await page.locator('.pixel').count(),
  'colored',
  await page.locator('.pixel[style*="background"]').count(),
);
await page.keyboard.down('ArrowUp');
await page.waitForTimeout(1200);
await page.keyboard.up('ArrowUp');
await page.screenshot({ path: '/tmp/doom-premium.png', fullPage: true });
await page.getByRole('button', { name: 'Base UI Mosaic' }).click();
await page.waitForTimeout(4000);
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1200);
await page.keyboard.up('ArrowRight');
console.log('mosaic', await page.locator('main').innerText());
console.log(
  'pixels',
  await page.locator('.pixel').count(),
  'colored',
  await page.locator('.pixel[style*="background"]').count(),
);
await page.screenshot({ path: '/tmp/doom-mosaic.png', fullPage: true });
await page.getByRole('button', { name: 'Pause', exact: true }).click();
await page.getByRole('button', { name: 'Resume game' }).click();
await page.getByRole('button', { name: 'Restart', exact: true }).click();
await page.getByRole('button', { name: 'Start DOOM' }).click();
await page.waitForTimeout(3000);
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: '/tmp/doom-mobile.png', fullPage: true });
console.log(
  'overflow',
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
);
console.log('errors', errors);
await browser.close();
if (errors.length) process.exitCode = 1;
