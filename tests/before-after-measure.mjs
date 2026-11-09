import { chromium } from '@playwright/test';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const renderers = ['premium', 'mosaic', 'aggrid', 'tanstack', 'mui-heatmap', 'base-heatmap', 'scheduler'];
const output = '/tmp/doom-before-after-nov7/isolated-results.json';
const results = existsSync(output) ? JSON.parse(readFileSync(output, "utf8")) : [];
for (const trial of [1]) {
  for (const res of ['96x60', '320x200']) {
    for (const mode of ['doom', 'colors']) {
      for (const renderer of renderers) {
        for (const version of trial === 1 ? [10, 11] : [11, 10]) {
          if (results.some(r => r.trial === trial && r.res === res && r.mode === mode && r.renderer === renderer && r.version === version && r.status?.startsWith("Complete."))) continue;
          const result = { trial, res, mode, renderer, version };
          results.push(result);
          let browser;
          try {
            browser = await chromium.launch();
            const page = await browser.newPage({ viewport: { width: 1440, height: 1400 }, deviceScaleFactor: 2 });
            let instrumented = false;
            await page.route('**/assets/index-*.js', async route => {
              const response = await route.fetch();
              let code = await response.text();
              const name = code.match(/(?:const|let|var)\s+([\w$]+)=\[\{id:"premium",label:"MUI X Premium"/)?.[1];
              if (!name) throw new Error('Renderer list not found');
              const loop = new RegExp('for\\(const ([\\w$]+) of ' + name.replaceAll('$', '\\$') + '\\)', 'g');
              let matches = 0;
              code = code.replace(loop, (_, item) => {
                matches++;
                return `for(const ${item} of ${name}.filter(item=>item.id===${JSON.stringify(renderer)}))`;
              });
              if (matches !== 1) throw new Error(`Expected one benchmark loop, found ${matches}`);
              instrumented = true;
              await route.fulfill({ response, body: code });
            });
            const errors = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.goto(`https://v${version}--doom-grid-comparison-nov5-a419.seemyslop.online/?renderer=tanstack`, { timeout: 60000 });
            if (!instrumented) throw new Error('Instrumentation did not run');
            await page.getByLabel('Resolution', { exact: true }).selectOption('96x60');
            await page.getByLabel('Benchmark resolution', { exact: true }).selectOption(res);
            await page.getByLabel('Benchmark test', { exact: true }).selectOption(mode);
            await page.getByRole('button', { name: 'Run benchmark' }).click({ timeout: 180000 });
            await page.waitForFunction(() => {
              const status = document.querySelector('[role="status"]')?.textContent;
              return status?.startsWith('Complete.') || (status && !status.startsWith('Run the') && ![...document.querySelectorAll('button')].some(b => b.textContent === 'Cancel benchmark'));
            }, { }, { timeout: 300000 });
            Object.assign(result, await page.evaluate(index => ({
              status: document.querySelector('[role="status"]')?.textContent,
              row: [...document.querySelectorAll('.benchmark-table tbody tr')][index]?.innerText,
              cells: [...document.querySelectorAll('.benchmark-table tbody tr')][index] ? [...document.querySelectorAll('.benchmark-table tbody tr')][index].querySelectorAll('th,td').length : 0,
              values: [...[...document.querySelectorAll('.benchmark-table tbody tr')][index].querySelectorAll('th,td')].map(n => n.innerText),
              hidden: document.hidden,
              dpr: devicePixelRatio,
              ua: navigator.userAgent,
            }), renderers.indexOf(renderer)));
            result.errors = errors;
          } catch (error) {
            result.error = String(error);
          } finally {
            await browser?.close();
            writeFileSync(output, JSON.stringify(results, null, 2));
            console.log(JSON.stringify(result));
          }
        }
      }
    }
  }
}
