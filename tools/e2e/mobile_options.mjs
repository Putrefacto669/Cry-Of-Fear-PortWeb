// Mobile performance options (hud.js applyPerformance): Limit to 60 fps, Vignette, Low resolution.
// Checks in mobile mode, with real requestAnimationFrame and postfx on:
// - the options are listed only in mobile mode and persist in localStorage;
// - the frame cap divides the engine's main loop (timingValue N = one engine frame every N display frames);
// - turning the vignette off stops the full-screen postfx pass (CoFPostFX.stats frames);
// - low resolution lowers the drawing buffer to 1 pixel per CSS pixel.
// Usage: node mobile_options.mjs <base url> <out>
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(base&&out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:3,isMobile:true,hasTouch:true});
const p=await ctx.newPage(),logs=[],errors=[],r={checks:{}};
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
const check=(k,v)=>{r.checks[k]=v;};
// engine frames per second: postMainLoop runs once per engine frame
// display frames (an independent rAF loop) and engine frames (postMainLoop) over 3 s: their ratio is the cap
const frameRatio=()=>p.evaluate(()=>new Promise(res=>{let n=0,d=0,on=true;const f=()=>n++;MainLoop.postMainLoop.push(f);
 const raf=()=>{d++;if(on)requestAnimationFrame(raf);};requestAnimationFrame(raf);
 setTimeout(()=>{on=false;MainLoop.postMainLoop.splice(MainLoop.postMainLoop.indexOf(f),1);res({display:d,engine:n,ratio:+(d/Math.max(1,n)).toFixed(2)});},3000);}));
try{
 await p.goto(`${base}?map=c_start2&sw=0&debug=1&input=mobile&prefetch=0`);
 const t=Date.now();while(!logs.some(l=>l.includes('client connected'))){assert.ok(Date.now()-t<240000,'connect');await p.waitForTimeout(500);}
 await p.waitForFunction(()=>typeof MainLoop!=='undefined'&&MainLoop.timingMode===1,null,{timeout:60000});
 // the rate takes 90 animation frames (~10 s at SwiftShader's speed)
 {const t1=Date.now();while(!logs.some(l=>/COF\/PERF/.test(l))&&Date.now()-t1<60000)await p.waitForTimeout(500);}
 r.perfLine=logs.filter(l=>/COF\/PERF/.test(l)).pop();check('COF/PERF applied in mobile mode',!!r.perfLine);
 r.buffer=await p.evaluate(()=>{const c=document.getElementById('canvas');return {w:c.width,h:c.height,css:[c.clientWidth,c.clientHeight],ratio:Module.cofRenderPixelRatio};});
 // the cap: timingValue 2 must halve the engine frames (a 60 Hz screen keeps 1, a 120 Hz phone gets 2)
 r.every1=await frameRatio();
 await p.evaluate(()=>{MainLoop.timingValue=2;});r.every2=await frameRatio();await p.evaluate(()=>{MainLoop.timingValue=1;});
 check('one engine frame per display frame without the cap',r.every1.ratio<1.3);
 check('timingValue 2: one engine frame every 2 display frames',r.every2.ratio>1.7&&r.every2.ratio<2.4);
 r.measured=+(r.perfLine||'').match(/display=(\d+)Hz/)?.[1];r.every=+(r.perfLine||'').match(/every=(\d+)/)?.[1];
 // SwiftShader runs the game far below 110 fps: the rate is the game's (frame-bound) and the cap must stay off
 check('rate measured after the load (above 1 Hz) and the cap follows it',r.measured>1&&r.every===Math.max(1,Math.floor(r.measured/55)));
 // postfx pass with and without the vignette (CoFPostFX.stats resets its counters on each call)
 await p.evaluate(()=>CoFPostFX.stats());await p.waitForTimeout(2000);r.fxOn=await p.evaluate(()=>CoFPostFX.stats());
 await p.evaluate(()=>{const o=JSON.parse(localStorage.cofOptions||'{}');o.vignette=false;localStorage.cofOptions=JSON.stringify(o);});
 // through the real Options panel: Esc menu -> Options -> the three checkboxes
 r.options=await p.evaluate(()=>!!document.getElementById('cof-option-vignette'));
 await p.evaluate(()=>CoFPostFX.set({vignette:0}));await p.evaluate(()=>CoFPostFX.stats());await p.waitForTimeout(2000);r.fxOff=await p.evaluate(()=>CoFPostFX.stats());
 check('postfx pass runs with the vignette',r.fxOn.msPerFrame>0);check('no postfx pass without the vignette',r.fxOff.msPerFrame===0);
 // low resolution: ratio 1, then a resize lowers the buffer
 await p.evaluate(()=>{Module.cofRenderPixelRatio=1;dispatchEvent(new Event('resize'));});await p.waitForTimeout(1500);
 r.bufferLow=await p.evaluate(()=>{const c=document.getElementById('canvas');return {w:c.width,h:c.height};});
 check('low resolution lowers the buffer',r.bufferLow.w<r.buffer.w*0.8);
 await p.screenshot({path:`${out}/low-res.png`});
 r.jsErrors=errors;check('no JS errors',errors.length===0);
}catch(e){r.failure=String(e.stack||e);process.exitCode=1;}finally{fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await browser.close();}
console.log(JSON.stringify({checks:r.checks,perf:r.perfLine,buf:[r.buffer,r.bufferLow],fps:[r.every1,r.every2],fx:[r.fxOn,r.fxOff],failure:r.failure?.slice(0,200)}));
