// Exact historic SW/import bytes with the max-age=600 headers observed on Pages.
import assert from 'node:assert/strict';import fs from 'node:fs';import{chromium}from'playwright';
const[base,out,target='new',initial='old']=process.argv.slice(2);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});const r={initial,target,cases:[]};
const control=async version=>assert.ok((await fetch(base+'__control',{method:'POST',body:JSON.stringify({version,fault:{},cache:'max-age=600'})})).ok);
const b=await chromium.launch({args:['--mute-audio']});
try{
 for(const mode of ['imports','none']){
  await control(initial);const ctx=await b.newContext(),p=await ctx.newPage();await p.goto(base+'probe.html');
  await p.evaluate(async mode=>{await navigator.serviceWorker.register('sw.js',{updateViaCache:mode});await navigator.serviceWorker.ready;},mode);await p.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:30000});
  await control(target);await p.evaluate(()=>{window.ack='pending';navigator.serviceWorker.getRegistration().then(r=>r.update()).then(()=>window.ack='resolved',e=>window.ack=String(e));});
  await p.waitForFunction(()=>window.ack!=='pending',null,{timeout:30000});await p.waitForTimeout(1000);
  const result=await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return{mode:r.updateViaCache,update:window.ack,waiting:r.waiting?.state||null,installing:r.installing?.state||null};});r.cases.push(result);
  if(mode==='none'||target==='fixed')await p.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting,null,{timeout:30000});
  if(target==='fixed'){
   result.waitingManifest=await p.evaluate(async()=>{const w=(await navigator.serviceWorker.getRegistration()).waiting;return new Promise((resolve,reject)=>{const c=new MessageChannel(),t=setTimeout(()=>reject(Error('waiting version timeout')),30000);c.port1.onmessage=e=>{clearTimeout(t);resolve(e.data.version);};w.postMessage('cof-version',[c.port2]);});});
   assert.equal(result.waitingManifest,'d071fd1b614e');
  }
  await ctx.close();
 }
 r.passed=true;
}catch(e){r.passed=false;r.failure=String(e.stack);console.error(e);process.exitCode=1;}
finally{fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));await b.close();}
