// Exact historical distributions, real Chromium SW, isolated switchable HTTP origin.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const [base,out,mode='probe']=process.argv.slice(2);
const map=mode.startsWith('apartment')?'c_apartment1':'c_game_menu1';
assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const trace=(event,data={})=>fs.appendFileSync(`${out}/trace.jsonl`,JSON.stringify({time:Date.now(),event,...data})+'\n');
const control=async(version,fault={})=>{const r=await fetch(base+'__control',{method:'POST',body:JSON.stringify({version,fault})});assert.ok(r.ok);};
await control('old');
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext();const page=await context.newPage();const errors=[],result={mode};
const pending=new Set();
context.on('request',r=>{pending.add(r);trace('request',{url:r.url(),worker:!!r.serviceWorker(),range:r.headers().range||null});});
context.on('requestfinished',r=>{pending.delete(r);trace('requestfinished',{url:r.url(),worker:!!r.serviceWorker()});});
context.on('response',r=>trace('response',{url:r.url(),status:r.status(),worker:!!r.request().serviceWorker()}));
context.on('requestfailed',r=>{pending.delete(r);trace('requestfailed',{url:r.url(),failure:r.failure()});});
page.on('console',m=>{if(m.text().includes('SWTRACE'))trace('lifecycle',{text:m.text()});else fs.appendFileSync(`${out}/engine.log`,m.text()+'\n');});
page.on('pageerror',e=>{errors.push(e.message);trace('pageerror',{text:e.message});});
const cdp=await context.newCDPSession(page);await cdp.send('ServiceWorker.enable');
for(const event of ['workerRegistrationUpdated','workerVersionUpdated','workerErrorReported'])cdp.on('ServiceWorker.'+event,data=>trace(event,data));
await context.addInitScript(({forceNone})=>{
 window.testAudios=[];const play=HTMLMediaElement.prototype.play;
 HTMLMediaElement.prototype.play=function(...args){if(!window.testAudios.includes(this))window.testAudios.push(this);return play.apply(this,args);};
 const log=(event,data={})=>console.log('SWTRACE '+JSON.stringify({event,...data}));
 const watch=w=>{if(w){log('worker',{url:w.scriptURL,state:w.state});w.addEventListener('statechange',()=>log('statechange',{state:w.state}));}};
 const proto=ServiceWorkerRegistration.prototype,update=proto.update;
 proto.update=function(){log('update-start');return update.call(this).then(r=>{log('update-resolve');return r;},e=>{log('update-reject',{error:String(e)});throw e;});};
 const sw=navigator.serviceWorker,register=sw.register.bind(sw);
 sw.register=async(...args)=>{if(forceNone)args[1]={...args[1],updateViaCache:'none'};const r=await register(...args);log('register',{updateViaCache:r.updateViaCache});watch(r.installing);watch(r.waiting);watch(r.active);r.addEventListener('updatefound',()=>{log('updatefound');watch(r.installing);});return r;};
 sw.addEventListener('controllerchange',()=>log('controllerchange',{url:sw.controller?.scriptURL}));
},{forceNone:mode==='apartment-none'});
const poll=async(fn,ms=30000)=>{const start=Date.now();while(!await fn()){assert.ok(Date.now()-start<ms,'bounded lifecycle wait');await new Promise(r=>setTimeout(r,100));}};
const workerVersion=async()=>{const r=await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return {installing:r.installing?.state,waiting:r.waiting?.state,active:r.active?.state,controller:navigator.serviceWorker.controller?.scriptURL};});trace('snapshot',r);return r;};
const mounted=()=>page.evaluate(async()=>{const result={};for(const name of ['server.wasm','client.wasm','libref_gles3compat.wasm'])result[name]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',FS.readFile('/lib/'+name))),v=>v.toString(16).padStart(2,'0')).join('');return result;});
try{
 await page.goto(base+(mode==='probe'?'probe.html':`?map=${map}&sw=1&timer=1&fx=0&prefetch=0&debug=1`));
 if(mode==='probe')await page.evaluate(async()=>{await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;});
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:30000});
 if(mode!=='probe'){
  await page.waitForFunction(map=>window.CoFRuntimeReady&&window.CoFCurrentMap?.()===map,map,{timeout:60000});
  result.modulesBefore=await mounted();
 }
 result.before=await workerVersion();await control('new');
 // Do not block the protocol client on the promise under investigation.
 await page.evaluate(()=>{window.updateResult='pending';navigator.serviceWorker.getRegistration().then(r=>r.update()).then(()=>window.updateResult='resolved',e=>window.updateResult=String(e));});
 try{await poll(async()=>await page.evaluate(()=>window.updateResult!=='pending'));result.update=await page.evaluate(()=>window.updateResult);}catch(e){result.update='pending after 30 seconds';}
 result.pendingRequests=[...pending].map(q=>({url:q.url(),worker:!!q.serviceWorker(),range:q.headers().range||null}));
 result.browserState=await page.evaluate(()=>({readyState:document.readyState,audio:window.testAudios.map(a=>({src:a.currentSrc,paused:a.paused,networkState:a.networkState,readyState:a.readyState,buffered:a.buffered.length}))}));
 if(result.update==='pending after 30 seconds'&&['apartment-diagnose','apartment-norefresh','apartment-cdp','apartment-register'].includes(mode)){
  trace('intervention',{action:mode});
  if(mode==='apartment-diagnose')await page.evaluate(()=>{for(const a of window.testAudios){a.pause();a.removeAttribute('src');a.load();}});
  if(mode==='apartment-norefresh')await page.evaluate(()=>CoFDebug.cmd('sv_cheats 1\nr_norefresh 1\ncof_fence sw_diagnostic'));
  if(mode==='apartment-cdp'){
   result.cdpAck='pending';
   cdp.send('ServiceWorker.updateRegistration',{scopeURL:base}).then(()=>{result.cdpAck='resolved';trace('cdp-update-resolved');},e=>{result.cdpAck=String(e);trace('cdp-update-rejected',{error:String(e)});});
  }
  if(mode==='apartment-register')await page.evaluate(()=>{window.registerAck='pending';navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(()=>window.registerAck='resolved',e=>window.registerAck=String(e));});
  try{await poll(async()=>await page.evaluate(()=>window.updateResult!=='pending'));result.afterIntervention=await page.evaluate(()=>window.updateResult);}catch(e){result.afterIntervention='still pending after a separate 30-second diagnostic phase';}
  if(mode==='apartment-register')result.registerAck=await page.evaluate(()=>window.registerAck);
 }
 result.after=await workerVersion();
 if(mode!=='probe'){result.modulesWaiting=await mounted();assert.deepEqual(result.modulesWaiting,result.modulesBefore);}
 if(result.after.waiting){
  const path=mode==='probe'?'packs/engine.data':'packs/map_c_start.data';
  result.uncached=await page.evaluate(async path=>{const r=await fetch(path);const b=await r.arrayBuffer();return {path,status:r.status,bytes:b.byteLength,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('')};},path);
 }
 result.errors=errors;trace('result',result);
}catch(e){result.failure=String(e.stack);trace('failure',{text:result.failure});process.exitCode=1;}
finally{fs.writeFileSync(`${out}/result.json`,JSON.stringify(result,null,2));await browser.close();}
