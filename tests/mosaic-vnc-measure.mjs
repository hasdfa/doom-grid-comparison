import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const output=process.env.BENCHMARK_OUTPUT ?? '/tmp/doom-mosaic-vnc-ten-passes.json';
const results=existsSync(output)?JSON.parse(readFileSync(output,'utf8')):[];
const context=await chromium.launchPersistentContext(process.env.BENCHMARK_PROFILE ?? '/tmp/doom-mosaic-vnc-profile',{
 channel:'chrome',headless:false,viewport:{width:1280,height:800},deviceScaleFactor:2,
 env:{...process.env,DISPLAY:process.env.DISPLAY ?? ':1'},
 args:['--window-size=1320,890'],
});
const page=context.pages()[0]??await context.newPage();
await page.bringToFront();
console.log('VNC Chrome started',await context.browser()?.version());
for(let trial=11;trial<=20;trial++)for(const res of ['96x60','320x200'])for(const mode of ['doom','colors'])for(const version of trial%2?['master','branch']:['branch','master']){
 if(results.some(r=>r.trial===trial&&r.res===res&&r.mode===mode&&r.version===version&&r.complete))continue;
 const start=Date.now(),errors=[];
 const onerror=e=>errors.push(e.message);page.on('pageerror',onerror);
 const result={trial,res,mode,version,browserGroup:'vnc-chrome',startedAt:new Date(start).toISOString()};
 try{
  await page.goto(`https://v1--doom-mosaic-${version}-bench-nov9-a419.seemyslop.online/?renderer=tanstack`,{timeout:60000});
  await page.getByLabel('Resolution',{exact:true}).selectOption('96x60');
  await page.getByLabel('Benchmark resolution',{exact:true}).selectOption(res);
  await page.getByLabel('Benchmark test',{exact:true}).selectOption(mode);
  await page.getByRole('button',{name:'Run benchmark',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent?.startsWith('Complete.')||![...document.querySelectorAll('button')].some(b=>b.textContent==='Cancel benchmark'),{},{timeout:300000,polling:2000});
  Object.assign(result,await page.evaluate(()=>({
   status:document.querySelector('[role="status"]')?.textContent,
   values:[...[...document.querySelectorAll('.benchmark-table tbody tr')][1].querySelectorAll('th,td')].map(n=>n.innerText),
   hidden:document.hidden,ua:navigator.userAgent,dpr:devicePixelRatio,viewport:[innerWidth,innerHeight],
  })));
  result.complete=result.status?.startsWith('Complete.')&&!result.hidden;
 }catch(e){result.complete=false;result.error=String(e)}
 result.durationMs=Date.now()-start;result.serverLoad=readFileSync('/proc/loadavg','utf8').trim();result.errors=errors;page.off('pageerror',onerror);
 results.push(result);writeFileSync(output,JSON.stringify(results,null,2));console.log(JSON.stringify({done:results.filter(r=>r.complete).length,total:80,...result}));
 if(!result.complete)throw Error('Incomplete benchmark; checkpoint saved');
}
await page.goto('https://doom-mosaic-ten-passes-nov9-a419.seemyslop.online/');
console.log('ALL 80 VNC OBSERVATIONS COMPLETE');
await context.close();
