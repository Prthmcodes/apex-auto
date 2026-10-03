import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport:{width:1440,height:900} });
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push('pageerror: '+e.message));
p.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
await p.emulateMedia({ reducedMotion:'reduce' });
await p.goto('http://localhost:3000',{waitUntil:'load'});
await p.waitForFunction(()=>document.querySelector('[aria-hidden="true"]')!==null,{timeout:90000}).catch(()=>{});
await p.waitForTimeout(8000);
await p.evaluate(()=>window.__qaSetScrollProgress?.(0.4));
await p.waitForTimeout(4000);
const runs=[];
for(let r=0;r<3;r++){
  runs.push(await p.evaluate(()=>new Promise(res=>{
    let n=0; const t0=performance.now();
    function tick(){ n++; if(n>=24) return res(n/((performance.now()-t0)/1000)); requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  })));
}
console.log('fps:', runs.map(v=>v.toFixed(2)).join(', '), '| median', runs.slice().sort((a,b)=>a-b)[1].toFixed(2));
console.log(errs.length?('ERRORS: '+errs.slice(0,3).join(' | ')):'no console errors');
await b.close();
