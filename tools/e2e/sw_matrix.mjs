// Browser-level SW failure/recovery and integrity contracts; no game resources are changed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const trace=(event,data={})=>fs.appendFileSync(`${out}/trace.jsonl`,JSON.stringify({time:Date.now(),event,...data})+'\n');
const control=async(version,fault={})=>{assert.ok((await fetch(base+'__control',{method:'POST',body:JSON.stringify({version,fault})})).ok);};
const b=await chromium.launch({args:['--mute-audio']});const ctx=await b.newContext();const p=await ctx.newPage();const r={checks:[]},errors=[];
ctx.on('request',q=>trace('request',{url:q.url(),worker:!!q.serviceWorker()}));
ctx.on('response',q=>trace('response',{url:q.url(),status:q.status(),worker:!!q.request().serviceWorker()}));
ctx.on('requestfailed',q=>trace('requestfailed',{url:q.url(),error:q.failure()}));
p.on('pageerror',e=>errors.push(e.message));
const cdp=await ctx.newCDPSession(p);await cdp.send('ServiceWorker.enable');
for(const e of ['workerRegistrationUpdated','workerVersionUpdated','workerErrorReported'])cdp.on('ServiceWorker.'+e,d=>trace(e,d));
const poll=async(fn)=>{const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<30000,'30-second SW contract');await new Promise(r=>setTimeout(r,50));}};
const state=()=>p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return {installing:r.installing?.state,waiting:r.waiting?.state,active:r.active?.state,update:window.updateResult};});
const update=()=>p.evaluate(()=>{window.updateResult='pending';navigator.serviceWorker.getRegistration().then(r=>r.update()).then(()=>window.updateResult='resolved',e=>window.updateResult=String(e));});
const waitUpdate=async()=>{await poll(async()=>(await state()).update!=='pending');assert.equal((await state()).update,'resolved');};
const waitWaiting=()=>poll(async()=>!!(await state()).waiting);
const check=(name,data={})=>{r.checks.push({name,...data});trace('PASS',{name,...data});console.log('PASS',name);};
const body=path=>p.evaluate(async path=>{try{const res=await fetch(path),buf=await res.arrayBuffer();return {status:res.status,bytes:buf.byteLength,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buf)),v=>v.toString(16).padStart(2,'0')).join('')};}catch(e){return {error:String(e)};}},path);
const deleteEntry=path=>p.evaluate(async path=>{const c=await caches.open('cof-web-v1');for(const q of await c.keys())if(new URL(q.url).pathname.endsWith('/'+path))await c.delete(q);},path);
try{
 await control('new');await p.goto(base+'probe.html');await p.evaluate(async()=>{await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;});await p.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:30000});
 const engine=await body('packs/engine.data');assert.equal(engine.hash,'f6017f6e937f9f6b14f3ca6f8dee1eb523ba3be002977bc0fc242d6a30c7bf84');
 await control('fixed',{path:'loader.js',mode:'fail'});await update();await waitUpdate();await poll(async()=>!(await state()).installing);assert.ok(!(await state()).waiting);assert.deepEqual(await body('packs/engine.data'),engine);check('failed precache preserves active version and cached engine');
 await control('fixed');await update();await waitUpdate();await waitWaiting();check('failed installation retries successfully');
 const other=await ctx.newPage();await other.goto(base+'probe.html');
 await p.evaluate(async()=>{window.blocked=false;navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='cof-update-blocked')window.blocked=true;});(await navigator.serviceWorker.getRegistration()).waiting.postMessage('skip-waiting');});
 await poll(()=>p.evaluate(()=>window.blocked));assert.ok((await state()).waiting);check('another open client prevents unconsented activation');await other.close();
 await p.evaluate(async()=>{window.changed=false;navigator.serviceWorker.addEventListener('controllerchange',()=>window.changed=true);(await navigator.serviceWorker.getRegistration()).waiting.postMessage('skip-waiting');});await poll(()=>p.evaluate(()=>window.changed));check('single consenting client can activate candidate');
 // A corrupted historical entry must not be trusted just because its key has a revision.
 await p.evaluate(async()=>{const c=await caches.open('cof-web-v1');for(const q of await c.keys())if(new URL(q.url).pathname.endsWith('/packs/engine.data'))await c.put(q,new Response('bad'));});
 assert.deepEqual(await body('packs/engine.data'),engine);check('poisoned cache entry is evicted and repaired from verified bytes');
 await deleteEntry('packs/engine.data');await control('fixed',{path:'packs/engine.data.gz',mode:'truncate'});assert.ok((await body('packs/engine.data')).error);await control('fixed');assert.deepEqual(await body('packs/engine.data'),engine);check('interrupted gzip is not cached; retry recovers');
 // The old origin bytes are deliberately incompatible with the active candidate manifest.
 await deleteEntry('packs/engine.data');await control('old');assert.ok((await body('packs/engine.data')).error);check('cache miss rejects a different release instead of mixing engine modules');
 await control('fixed');assert.deepEqual(await body('packs/engine.data'),engine);check('correct release recovers after revision mismatch');
 await control('next',{path:'sw-manifest.js',mode:'hold'});await update();await new Promise(r=>setTimeout(r,1000));r.held=await state();assert.equal(r.held.update,'pending');assert.ok(!r.held.waiting);assert.deepEqual(await body('packs/engine.data'),engine);check('held update-script request explains a pending promise without stopping active client',r.held);
 await control('next');await waitUpdate();await waitWaiting();await new Promise(r=>setTimeout(r,500));assert.ok((await state()).waiting);check('declining update keeps old controller and coherent cached resources');
 assert.deepEqual(errors,[]);r.passed=true;
}catch(e){r.passed=false;r.failure=String(e.stack);console.error(e);process.exitCode=1;}
finally{r.errors=errors;r.finalState=await state().catch(e=>String(e));fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));await control('fixed');await b.close();}
