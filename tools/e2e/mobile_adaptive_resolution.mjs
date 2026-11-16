import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:3,hasTouch:true,isMobile:true});
const logs=[];
const pageErrors=[];
p.on('console',m=>logs.push(m.text()));
p.on('pageerror',e=>{pageErrors.push(e.message);console.log('ERROR',e.message);});
const [origin='http://127.0.0.1:8142',map='c_start2',scenario]=process.argv.slice(2);
const debug=()=>p.evaluate(()=>({width:canvas.width,height:canvas.height,rect:canvas.getBoundingClientRect().toJSON(),status:document.getElementById('status').textContent}));
let serial=0;
const cmd=async text=>{
 const mark=logs.length,token='jump_'+(++serial);
 await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes('COF/FENCE '+token+' '),timeout:30000}),
 p.evaluate(text=>CoFDebug.cmd(text),text+'\ncof_fence '+token)]);
 return logs.slice(mark).join('\n');
};
const measure=()=>p.evaluate(()=>new Promise(resolve=>{
 const frames=[];
 function next(t){frames.push(t);if(frames.length<40)requestAnimationFrame(next);
 else{const diffs=frames.slice(1).map((t,i)=>t-frames[i]).sort((a,b)=>a-b);resolve({p50:diffs[19],p95:diffs[36],max:diffs.at(-1)});}}
 requestAnimationFrame(next);
}));
try{
 await p.goto(origin+'/?map='+map+'&input=mobile&sw=0&prefetch=0&debug=1');
 const button=a=>p.locator('[data-action='+a+']');
 await button('jump').waitFor({timeout:90000});
 await cmd('sv_cheats 1');
 console.log('VIDEO',JSON.stringify(await debug()),'FRAMES',JSON.stringify(await measure()));
 const cdp=await p.context().newCDPSession(p);
 const touch=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
 const yaw=async()=>Number((await cmd('viewpos')).match(/ang \(\s+[-\d.]+\s+([-\d.]+)/)?.[1]);
 if (scenario === 'resolution') {
   const setMode=mode=>p.evaluate(mode=>CoFMobileResolution.setMode(mode),mode);
   const expectSize=(width,height)=>p.waitForFunction(([width,height])=>
     canvas.width===width&&canvas.height===height&&canvas.clientWidth===844&&canvas.clientHeight===390,[width,height]);
   await p.locator('[data-action=pause]').tap();
   await p.locator('#cof-pause [data-action=options]').tap();
   await p.locator('#cof-option-resolution').selectOption('sharp');
   await p.locator('#cof-sheet .actions button').tap();
   await p.locator('#cof-pause [data-action=resume]').tap();
   await button('jump').waitFor();
   await expectSize(1266,585);
   console.log('SHARP',JSON.stringify(await debug()),JSON.stringify(await measure()));
   const hold={x:530,y:120,id:55};
   const beforeResize=await yaw();
   await touch('touchStart',[hold]);
   await p.waitForFunction(()=>CoFMobile.touchActive);
   await setMode('performance');
   await touch('touchMove',[{...hold,x:590}]);
   assert.equal((await debug()).width,1266);
   await touch('touchEnd',[]);
   await expectSize(675,312);
   const afterResize=await yaw();
   assert.ok(Number.isFinite(afterResize)&&Math.abs(((afterResize-beforeResize+540)%360)-180)>4);
   console.log('PERFORMANCE',JSON.stringify(await debug()),JSON.stringify(await measure()));
   assert.equal(await p.evaluate(()=>localStorage.getItem('cofMobileResolution')),'performance');
   await setMode('auto');
   await expectSize(844,390);
   console.log('AUTO',JSON.stringify(await debug()));
 }
 const r=await p.locator('#canvas').boundingBox();
 const angleDelta=(a,b)=>Math.abs(((b-a+540)%360)-180);
 let before=await yaw();
 const results=[];
 for(let i=0;i<5;i++){
   const point={id:10+i,x:r.x+r.width*.59,y:r.y+r.height*.31};
   await touch('touchStart',[point]);
   await touch('touchMove',[{...point,x:point.x+70,y:point.y+10}]);
   await touch('touchEnd',[]);
   let after=before;
   for(let frame=0;frame<4&&after===before;frame++)after=await yaw();
   assert.ok(Number.isFinite(after)&&angleDelta(before,after)>4,{i,before,after});
   results.push([before,after]);
   before=after;
 }
 await touch('touchStart',[{x:r.x+r.width*.6,y:r.y+r.height*.3,id:25}]);
 await touch('touchCancel',[]);
 const point={x:r.x+r.width*.6,y:r.y+r.height*.3,id:26};
 await touch('touchStart',[point]);await touch('touchMove',[{...point,x:point.x-65,y:point.y+5}]);await touch('touchEnd',[]);
 let after=before;
 for(let frame=0;frame<4&&after===before;frame++)after=await yaw();
 assert.ok(angleDelta(before,after)>4);
 assert.deepEqual(pageErrors,[]);
 console.log('PASS five short gestures and recovery after cancellation',JSON.stringify(results),before,after);
}finally{await browser.close()}
