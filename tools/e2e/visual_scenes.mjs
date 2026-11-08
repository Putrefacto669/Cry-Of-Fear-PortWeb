// Observational scene audit. Original events run; no entity removal, teleport or fullbright.
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/root/cof-audits/browser-1.64.1/browsers/chromium-1248/chrome-linux64/chrome',args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const result={browser:browser.version(),nativeOriginalComparison:false,scenes:[]};
try{for(const map of ['c_intro','c_nightmare','c_start','c_apartment1','c_apartmentsick','c_game_menu1']){
 const ctx=await browser.newContext({viewport:{width:960,height:720}}),p=await ctx.newPage(),logs=[],errors=[];let serial=0;
 p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
 const cmd=async text=>{const n=logs.length,token='visual_'+(++serial);await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes('COF/FENCE '+token+' '),timeout:30000}),p.evaluate(c=>CoFDebug.cmd(c),text+'\ncof_fence '+token)]);return logs.slice(n).join('\n');};
 const row={map,snapshots:[],errors};result.scenes.push(row);
 try{
  await p.goto(base+'?map='+map+'&sw=0&timer=1&prefetch=0&debug=1');await p.waitForFunction(()=>window.CoFRuntimeReady,{},{timeout:60000});
  const start=Date.now();while(!logs.some(l=>l.includes('client connected'))){assert.ok(Date.now()-start<60000);await p.waitForTimeout(100);}
  await cmd('sv_cheats 1');
  for(const seconds of [1,15]){
   await p.waitForTimeout(seconds===1?1000:14000);
   const state=await cmd('gamma\nbrightness\ngl_fog\nr_fullbright\ncof_sky_status\ncof_inspect !player');
   const snapshot=await p.evaluate(()=>({map:CoFCurrentMap(),postfx:CoFPostFX.get(),postfxStats:CoFPostFX.stats(),canvas:[canvas.width,canvas.height],loading:document.querySelector('#cof-loading')?.className}));
   row.snapshots.push({secondsAfterConnection:seconds,state,...snapshot});await p.locator('#canvas').screenshot({path:out+'/'+map+'-'+seconds+'.png'});
  }
  assert.deepEqual(errors,[]);row.passed=true;
 }catch(e){row.failure=String(e.stack);}finally{fs.writeFileSync(out+'/'+map+'.log',logs.join('\n'));await ctx.close();}
}}
finally{result.passed=result.scenes.length===6&&result.scenes.every(s=>s.passed);fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));await browser.close();}
assert.ok(result.passed,JSON.stringify(result.scenes.filter(s=>!s.passed)));console.log('PASS six real scene captures and diagnostics; no native pixel-equivalence claim');
