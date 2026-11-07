import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch();
try {
 const page = await browser.newPage({viewport:{width:1280,height:1000}});
 page.setDefaultTimeout(120000);
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.DEMO_URL ?? 'http://127.0.0.1:5186'}/?renderer=scheduler`);
 await expect(page.locator('.stage .scheduler-pixel')).toHaveCount(5760,{timeout:60000});
 expect(await page.locator('.stage .scheduler-pixel').first().evaluate(node => getComputedStyle(node, '::before').display)).toBe('none');
 const geometry=await page.locator('.stage').evaluate(stage=>{
   const origin=stage.getBoundingClientRect();
   return [0,1,95,96,5759].map(id=>{const n=stage.querySelector('.pixel-index-'+id);const b=n.getBoundingClientRect();return {id,x:b.x-origin.x,y:b.y-origin.y,w:b.width,h:b.height};});
 });
 console.log(geometry);
 for(const b of geometry){expect(b.x).toBeCloseTo((b.id%96)*12,0);expect(b.y).toBeCloseTo(Math.floor(b.id/96)*12,0);expect(b.w).toBeCloseTo(12,0);expect(b.h).toBeCloseTo(12,0);}
 await page.getByRole('button',{name:'Start DOOM'}).click();
 await expect(page.locator('.stage .scheduler-pixel[style*=background]')).toHaveCount(5760,{timeout:60000});
 const before=await page.locator('.scheduler-pixel').evaluateAll(ns=>ns.map(n=>n.style.backgroundColor).join(','));
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(1200);await page.keyboard.up('ArrowRight');
 const after=await page.locator('.scheduler-pixel').evaluateAll(ns=>ns.map(n=>n.style.backgroundColor).join(','));expect(before).not.toEqual(after);
 await page.getByLabel('Resolution',{exact:true}).selectOption('192x120');
 await expect(page.locator('.stage .scheduler-pixel[style*=background]')).toHaveCount(23040,{timeout:90000});
 expect(errors).toEqual([]);
 console.log('PASS Scheduler geometry, gameplay, resolution change, no page errors');
} finally {await browser.close();}
