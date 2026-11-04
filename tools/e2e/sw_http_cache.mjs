// Exact historic SW/import bytes with the max-age=600 headers observed on Pages.
import assert from 'node:assert/strict';import fs from 'node:fs';import{chromium}from'playwright';
const[base,out]=process.argv.slice(2);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});const r={cases:[]};
const control=async version=>assert.ok((await fetch(base+'__control',{method:'POST',body:JSON.stringify({version,fault:{},cache:'max-age=600'})})).ok);
const b=await chromium.launch({args:['--mute-audio']});
try{
 for(const mode of ['imports','none']){
  await control('old');const ctx=await b.newContext(),p=await ctx.newPage();await p.goto(base+'probe.html');
  await p.evaluate(async mode=>{await navigator.serviceWorker.register('sw.js',{updateViaCache:mode});await navigator.serviceWorker.ready;},mode);await p.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:30000});
  await control('new');await p.evaluate(()=>{window.ack='pending';navigator.serviceWorker.getRegistration().then(r=>r.update()).then(()=>window.ack='resolved',e=>window.ack=String(e));});
  await p.waitForFunction(()=>window.ack!=='pending',null,{timeout:30000});await p.waitForTimeout(1000);
  const result=await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return{mode:r.updateViaCache,update:window.ack,waiting:r.waiting?.state||null,installing:r.installing?.state||null};});r.cases.push(result);
  if(mode==='none')await p.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting,null,{timeout:30000});await ctx.close();
 }
 r.passed=true;
}catch(e){r.passed=false;r.failure=String(e.stack);console.error(e);process.exitCode=1;}
finally{fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));await b.close();}
