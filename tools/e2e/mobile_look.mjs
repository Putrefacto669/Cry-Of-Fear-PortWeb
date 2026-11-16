// Mobile: looking around by dragging on the right half, the way a finger does it (many small moves over time),
// not one 90 px jump (mobile_controls.mjs). Records the yaw/pitch change of each drag style and speed, and the
// frame rate while dragging. Usage: node mobile_look.mjs <base url> <out> [map]
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out,map='c_start2']=process.argv.slice(2);assert.ok(base&&out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage(),logs=[],errors=[],r={map,drags:[]};let serial=0;
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
const cmd=async text=>{const i=logs.length,t=`ml_${++serial}`;await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${t} `),timeout:60000}),p.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${t}`)]);return logs.slice(i).join('\n');};
const ang=async()=>(await cmd('viewpos')).match(/ang \( ([^)]+) \)/)?.[1].trim().split(/ +/).map(Number);
try{
 await p.goto(`${base}?map=${map}&sw=0&fx=0&timer=1&debug=1&input=mobile`);
 const t=Date.now();while(!logs.some(l=>l.includes('client connected'))){assert.ok(Date.now()-t<180000,'connect');await p.waitForTimeout(500);}
 await cmd('sv_cheats 1');
 while(!/frozen=0 /.test(await cmd('cof_inspect !player'))){assert.ok(Date.now()-t<300000,'unfrozen');await p.waitForTimeout(1000);}
 await p.waitForSelector('#cof-touch-controls:not([hidden]) [data-action="use"]',{timeout:60000});await p.waitForTimeout(1500);
 r.touchList=(await cmd('touch_list')).split('\n').filter(l=>/cof_web|_look|_joy/.test(l)).slice(0,6);
 r.sensitivity=(await cmd('touch_yaw\ntouch_pitch\nsensitivity')).split('\n').filter(l=>/touch_yaw|touch_pitch|sensitivity/.test(l)).slice(0,6);
 const cdp=await ctx.newCDPSession(p);
 const box=await p.locator('#canvas').boundingBox();
 const x0=box.x+box.width*.70,y0=box.y+box.height*.55;
 const fps=async ms=>p.evaluate(ms=>new Promise(res=>{let n=0;const s=performance.now();const f=()=>{n++;if(performance.now()-s<ms)requestAnimationFrame(f);else res(n*1000/(performance.now()-s));};requestAnimationFrame(f);}),ms);
 // the same 160 px to the right, three ways: one jump, 20 steps over 0.4 s, 40 steps over 1.2 s
 for(const [name,steps,ms] of [['one move',1,0],['finger 0.4 s',20,400],['slow finger 1.2 s',40,1200]]){
  const a0=await ang();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0,id:7}]});
  const fpsP=fps(Math.max(ms,300));
  for(let k=1;k<=steps;k++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+160*k/steps,y:y0,id:7}]});if(ms)await p.waitForTimeout(ms/steps);}
  const f=await fpsP;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(500);
  const a1=await ang();const d={name,steps,ms,yaw:+(a1[1]-a0[1]).toFixed(2),pitch:+(a1[0]-a0[0]).toFixed(2),fps:+f.toFixed(1)};r.drags.push(d);console.log(JSON.stringify(d));
 }
 r.jsErrors=errors;
}catch(e){r.failure=String(e.stack||e);process.exitCode=1;}finally{fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await browser.close();}
console.log(JSON.stringify({drags:r.drags,touch:r.touchList,sens:r.sensitivity,failure:r.failure?.slice(0,200)}));
