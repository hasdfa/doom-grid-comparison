import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (process.env.BENCHMARK_MODE === 'doom') {
    await page.addInitScript(() => {
      window.benchmarkWorkers = new Set();
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        constructor(...args) {
          super(...args);
          window.benchmarkWorkers.add(this);
        }
        terminate() {
          window.benchmarkWorkers.delete(this);
          return super.terminate();
        }
      };
    });
  }
  await page.goto(process.env.DEMO_URL ?? 'http://127.0.0.1:5186');
  if (process.env.BENCHMARK_MODE === 'doom') {
    await page.getByLabel('Benchmark test').selectOption('doom');
    await page.getByRole('button', { name: 'Start DOOM' }).click();
    await expect(page.locator('.stage .premium-pixel[style*=background]')).toHaveCount(23040, {
      timeout: 30000,
    });
  }
  await page.getByLabel('Benchmark resolution', { exact: true }).selectOption('96x60');
  await page.getByRole('button', { name: 'Run benchmark' }).click();
  await expect(page.getByRole('status')).toContainText(/Testing|Loading DOOM|Walking and shooting/);
  await expect(page.getByLabel('Benchmark resolution', { exact: true })).toBeDisabled();
  await expect(page.locator('.benchmark figcaption')).toContainText('96 × 60');
  if (process.env.BENCHMARK_MODE === 'doom')
    await expect(page.getByRole('status')).toContainText('Walking and shooting', {
      timeout: 30000,
    });
  await page.getByRole('button', { name: 'Cancel benchmark' }).click();
  await expect(page.getByRole('status')).toContainText('cancelled');
  await page.getByRole('button', { name: 'Run benchmark' }).click();
  await expect(page.getByRole('status')).toContainText('Complete.', { timeout: 240000 });
  if (process.env.BENCHMARK_MODE === 'doom') {
    expect(await page.evaluate(() => window.benchmarkWorkers.size)).toBe(1);
    await page.getByRole('button', { name: 'Resume game' }).click();
    await expect(page.locator('.overlay')).toHaveCount(0);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
  }
  const results = await page.locator('.benchmark-table tbody tr').allTextContents();
  expect(results).toHaveLength(7);
  expect(results.every((row) => !row.includes('—'))).toBe(true);
  console.log('Results', results);
  await expect(page.getByRole('button', { name: 'MUI X Premium', exact: true })).toBeEnabled();
  await page.screenshot({ path: '/tmp/doom-benchmark.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/doom-benchmark-mobile.png', fullPage: true });
  await page.getByLabel('Benchmark resolution', { exact: true }).selectOption('128x80');
  await expect(page.locator('.benchmark figcaption')).toContainText('128 × 80');
  await expect(page.getByLabel('Resolution', { exact: true })).toHaveValue('192x120');
  expect(await page.locator('.benchmark-table tbody tr').allTextContents()).toEqual(
    expect.arrayContaining([expect.stringContaining('—')]),
  );
  expect(errors).toEqual([]);
  console.log(
    'PASS: cancel, rerun, seven measured chart rows, controls restored, mobile overflow, no page errors',
  );
} finally {
  await browser.close();
}
