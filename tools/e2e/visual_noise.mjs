// Actual WASM HUD sprite: control, tint and tile coverage, without changing game lighting.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/root/cof-audits/browser-1.64.1/browsers/chromium-1248/chrome-linux64/chrome',args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await browser.newPage({viewport:{width:960,height:720}}),logs=[],errors=[],result={};let serial=0;
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
async function cmd(c){const start=logs.length,token='noise_'+(++serial);await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes('COF/FENCE '+token+' '),timeout:30000}),p.evaluate(c=>CoFDebug.cmd(c),c+'\ncof_fence '+token)]);return logs.slice(start).join('\n');}
async function status(){const text=await cmd('cof_visual_status');const m=text.match(/COF\/VISUAL noise=([\d.]+) amount=([\d.]+) alpha=(\d+) draws=(\d+) tiles=(\d+) sprite=(-?\d+)/);assert.ok(m,text);return Object.fromEntries(['noise','amount','alpha','draws','tiles','sprite'].map((k,i)=>[k,Number(m[i+1]) ]));}
try{
 await p.goto(base+'?map=c_start&sw=0&timer=1&prefetch=0&debug=1');await p.waitForFunction(()=>window.CoFRuntimeReady,{},{timeout:60000});
 const start=Date.now();while(!logs.some(l=>l.includes('client connected'))){assert.ok(Date.now()-start<60000,'real client connection');await p.waitForTimeout(100);}
 await cmd('sv_cheats 1\ncl_noiseeffect 1\ncl_noiseamount 0.6');await p.waitForTimeout(500);result.on=await status();assert.equal(result.on.alpha,153);assert.ok(result.on.draws>0&&result.on.sprite>=0);
 result.later=await status();const size=await p.locator('#canvas').evaluate(e=>({w:e.width,h:e.height}));assert.ok(result.later.draws>result.on.draws);assert.equal((result.later.tiles-result.on.tiles)/(result.later.draws-result.on.draws),Math.ceil(size.w/256)*Math.ceil(size.h/256));
 await cmd('cl_noiseeffect 0');result.off=await status();await p.waitForTimeout(500);assert.deepEqual(await status(),result.off);
 await cmd('cl_noiseeffect 1\ncl_noiseamount 0.5');await p.waitForTimeout(300);result.resumed=await status();assert.equal(result.resumed.alpha,127);assert.ok(result.resumed.draws>result.off.draws);
 result.settings=await cmd('gamma\nbrightness\nr_fullbright');assert.deepEqual(errors,[]);result.passed=true;
}catch(e){result.failure=String(e.stack);process.exitCode=1;}
finally{result.errors=errors;result.browser=browser.version();fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));fs.writeFileSync(out+'/engine.log',logs.join('\n'));await browser.close();}
console.log(JSON.stringify(result));
