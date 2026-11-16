// Mobile performance trace: phone viewport, CPU throttled (CDP), real requestAnimationFrame (no ?timer=1).
// Records every frame interval and every long task (> 50 ms) with the engine log line nearest in time, so a hitch
// can be tied to what the page was doing (map prefetch, texture uploads, saves...). SwiftShader draws on the CPU,
// so absolute FPS is not a phone's; the comparison between variants and the hitch timeline are what count.
// Usage: node mobile_perf.mjs <base url> <out> [map] [seconds] [query extra, e.g. "fx=0&prefetch=0"] [cpu rate]
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out,map='c_start2',secs='40',extra='',rate='4']=process.argv.slice(2);assert.ok(base&&out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true});
await ctx.addInitScript(()=>{
 window.__perf={frames:[],long:[],marks:[]};
 const tick=t=>{window.__perf.frames.push(t);requestAnimationFrame(tick);};requestAnimationFrame(tick);
 try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__perf.long.push([e.startTime,e.duration]);}).observe({type:'longtask',buffered:true});}catch(_){}
});
const p=await ctx.newPage(),logs=[],errors=[],r={map,extra,cpuRate:+rate};
p.on('console',m=>logs.push([Date.now(),m.text()]));p.on('pageerror',e=>errors.push(e.message));
try{
 const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:+rate});
 await p.goto(`${base}?map=${map}&sw=0&debug=1&input=mobile${extra?'&'+extra:''}`);
 const t=Date.now();while(!logs.some(([,l])=>l.includes('client connected'))){assert.ok(Date.now()-t<400000,'connect');await p.waitForTimeout(500);}
 const t0wall=Date.now(),t0=await p.evaluate(()=>performance.now());
 await p.waitForTimeout(+secs*1000);
 const perf=await p.evaluate(t0=>{const P=window.__perf;return {frames:P.frames.filter(t=>t>=t0),long:P.long.filter(([s])=>s>=t0)};},t0);
 const d=perf.frames.slice(1).map((t,i)=>t-perf.frames[i]);const sorted=[...d].sort((a,b)=>a-b);
 const q=x=>+sorted[Math.min(sorted.length-1,Math.floor(sorted.length*x))].toFixed(1);
 r.frames=d.length;r.fps=+(d.length/(+secs)).toFixed(1);r.p50=q(.5);r.p95=q(.95);r.p99=q(.99);r.max=+Math.max(...d).toFixed(1);
 r.hitches=d.map((v,i)=>[perf.frames[i]-t0,v]).filter(([,v])=>v>120).map(([at,v])=>{const wall=t0wall+at;const near=logs.filter(([w])=>Math.abs(w-wall)<1500).map(([,l])=>l.replace(/^\[[^\]]*\]\s*/,'')).filter(l=>!/COF\/HANDS|COF\/HUD (STAT|EXTRAS)/.test(l)).slice(0,4);return {atS:+(at/1000).toFixed(1),ms:+v.toFixed(0),near};});
 r.longTasks=perf.long.length;r.longTotalMs=+perf.long.reduce((s,[,v])=>s+v,0).toFixed(0);
 r.prefetch=logs.filter(([,l])=>/precarg/.test(l)).map(([w,l])=>[+((w-t0wall)/1000).toFixed(1),l.replace(/^\[[^\]]*\]\s*/,'')]);
 r.heapMB=await p.evaluate(()=>performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null);
 r.wasmMB=await p.evaluate(()=>typeof HEAPU8!=='undefined'?Math.round(HEAPU8.length/1048576):null);
 r.jsErrors=errors;
}catch(e){r.failure=String(e.stack||e);process.exitCode=1;}finally{fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.map(([,l])=>l).join('\n'));await browser.close();}
console.log(JSON.stringify({extra,fps:r.fps,p50:r.p50,p95:r.p95,p99:r.p99,max:r.max,hitches:r.hitches?.length,long:r.longTasks,longMs:r.longTotalMs,prefetch:r.prefetch,heapMB:r.heapMB,wasmMB:r.wasmMB,failure:r.failure?.slice(0,200)}));
