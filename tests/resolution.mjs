import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch();
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.DEMO_URL ?? 'http://127.0.0.1:5186');
 await page.getByRole('button',{name:'Start DOOM'}).click();
 for(const name of ['MUI X Premium','Base UI Mosaic','AG Grid','TanStack Table']) {
  await page.getByRole('button',{name,exact:true}).click();
  for(const [w,h] of [[96,60],[320,200]]) {
   await page.getByLabel('Resolution', { exact: true }).selectOption(`${w}x${h}`);
   await expect(page.locator('.stage .pixel[style*="background"]')).toHaveCount(w*h,{timeout:30000});
   await expect(page.locator('.overlay')).toHaveCount(0);
   console.log(name,`${w}x${h}`,w*h,'painted cells');
  }
 }
 expect(errors).toEqual([]);console.log('PASS: all four renderers at both resolution extremes, game continues');
}finally{await browser.close();}
