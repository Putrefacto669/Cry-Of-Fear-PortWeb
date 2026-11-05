// Diagnostic only: exact releases, real API promises, separate clients, no game-code changes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {chromium} from 'playwright';
const [base,out,privateOut,kind='dual-game',browserType='shell',profile='-',initial='old',target='new',saveMode='none']=process.argv.slice(2);
assert.ok(!fs.existsSync(out)&&!fs.existsSync(privateOut));fs.mkdirSync(out,{recursive:true});fs.mkdirSync(privateOut,{recursive:true});
const event=(name,data={})=>fs.appendFileSync(path.join(out,'events.jsonl'),JSON.stringify({time:Date.now(),name,...data})+'\n');
const result={kind,browserType,profile,initial,target,saveMode,updateLimitMs:30000,phases:[]};
result.disableServiceWorkerNetworkInspection=process.env.PLAYWRIGHT_DISABLE_SERVICE_WORKER_NETWORK||null;
const harness=fs.readFileSync(import.meta.filename);fs.writeFileSync(path.join(out,'harness.mjs'),harness);result.harnessSHA256=crypto.createHash('sha256').update(harness).digest('hex');
const scope=base+'game/';
const control=async version=>assert.ok((await fetch(base+'__control',{method:'POST',body:JSON.stringify({version})})).ok);
await control(initial);
const opts={viewport:{width:800,height:600},args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader',`--log-net-log=${privateOut}/netlog.json`,'--net-log-capture-mode=Default','--enable-logging',`--log-file=${privateOut}/browser.log`,'--vmodule=service_worker*=2']};
if(browserType==='full')opts.executablePath='/root/cof-audits/browser-1.64.1/browsers/chromium-1248/chrome-linux64/chrome';
const browser=profile==='-'?await chromium.launch(opts):null;
const ctx=browser?await browser.newContext({viewport:opts.viewport}):await chromium.launchPersistentContext(profile,opts);
const cdpBrowser=await (browser||ctx.browser()).newBrowserCDPSession();
result.browser=await cdpBrowser.send('Browser.getVersion');
try{result.commandLine=(await cdpBrowser.send('Browser.getBrowserCommandLine')).arguments;}catch(e){result.commandLineError=String(e);}
result.traceCategories=(await cdpBrowser.send('Tracing.getCategories')).categories;
let tracing=false,traceSession;const traceEvents=[];
const errors=[],pending=new Set(),connections=new Map();const sessions=[],sessionByPage=new Map();
ctx.on('request',q=>{pending.add(q);event('request',{url:q.url(),worker:!!q.serviceWorker(),range:q.headers().range||null});});
ctx.on('response',q=>event('response',{url:q.url(),status:q.status(),worker:!!q.request().serviceWorker()}));
ctx.on('requestfinished',q=>{pending.delete(q);event('requestfinished',{url:q.url()});});
ctx.on('requestfailed',q=>{pending.delete(q);event('requestfailed',{url:q.url(),error:q.failure()});});
ctx.on('console',m=>{const p=m.page();if(m.text().includes('client connected'))connections.set(p,(connections.get(p)||0)+1);if(m.text().startsWith('SWJOB '))event('client',{url:p?.url(),text:m.text()});else fs.appendFileSync(path.join(out,'engine.log'),m.text()+'\n');});
ctx.on('pageerror',e=>{errors.push(e.message);event('pageerror',{text:e.message});});
async function attach(p,label){
 const c=await ctx.newCDPSession(p);sessions.push(c);sessionByPage.set(p,c);await c.send('Network.enable');
 if(!traceSession&&!kind.includes('bare')){
  traceSession=c;c.on('Tracing.dataCollected',d=>traceEvents.push(...d.value));
 }
 if(!kind.includes('bare')){
  await c.send('ServiceWorker.enable');
  for(const name of ['workerRegistrationUpdated','workerVersionUpdated','workerErrorReported'])c.on('ServiceWorker.'+name,data=>event(name,{label,...data}));
 }
 await p.addInitScript(()=>{window.swJobStates={};navigator.serviceWorker.addEventListener('controllerchange',()=>console.log('SWJOB controllerchange'));});
}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function bounded(fn,limit=30000){const t=Date.now();while(!await fn()){if(Date.now()-t>=limit)return false;await pause(100);}return true;}
async function watch(p){
 return p.evaluate(async scope=>{const r=await navigator.serviceWorker.getRegistration(scope);if(!r)return null;
  if(!window.swJobWatched){window.swJobWatched=true;r.addEventListener('updatefound',()=>{console.log('SWJOB updatefound');const w=r.installing;w?.addEventListener('statechange',()=>console.log('SWJOB '+w.state));});}
  return{scope:r.scope,updateViaCache:r.updateViaCache,installing:r.installing?.state,waiting:r.waiting?.state,active:r.active?.state,controller:navigator.serviceWorker.controller?.scriptURL,readyState:document.readyState,secure:isSecureContext,origin:window.origin};
 },scope);
}
async function start(p,label){
 await p.evaluate(({scope,label})=>{
  const state=window.swJobStates[label]={phase:'lookup',start:performance.now()};
  navigator.serviceWorker.getRegistration(scope).then(reg=>{state.phase='calling';console.log('SWJOB update-call '+label);return reg.update();}).then(()=>{state.phase='resolved';state.end=performance.now();console.log('SWJOB update-resolved '+label);},e=>{state.phase='rejected';state.error=String(e);state.end=performance.now();console.log('SWJOB update-rejected '+label+' '+e);});
 },{scope,label});event('update-dispatched',{label});
}
const state=(p,label)=>p.evaluate(label=>window.swJobStates[label],label);
async function phase(p,label){
 await start(p,label);const complete=await bounded(async()=>['resolved','rejected'].includes((await state(p,label)).phase));
 const row={label,complete,state:await state(p,label),registration:await watch(p),pendingRequests:[...pending].map(q=>q.url())};result.phases.push(row);event('phase-result',row);return complete;
}
async function hashes(p){return p.evaluate(async()=>{const r={};for(const n of['server.wasm','client.wasm','libref_gles3compat.wasm','filesystem_stdio.wasm','menu.wasm'])r[n]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',FS.readFile('/lib/'+n))),b=>b.toString(16).padStart(2,'0')).join('');return r;});}
async function saveHashes(p){return p.evaluate(async()=>{const dir='/rwdir/cryoffear/save',r={};for(const n of FS.readdir(dir).filter(n=>n.startsWith('sw_jobs.')))r[n]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',FS.readFile(dir+'/'+n))),b=>b.toString(16).padStart(2,'0')).join('');return r;});}
let game,observer;
try{
 const first=ctx.pages()[0]||await ctx.newPage();
 if(kind.startsWith('minimal')){
  observer=first;await attach(observer,'minimal');await observer.goto(base+'observer.html');
  await observer.evaluate(async scope=>{await navigator.serviceWorker.register(scope+'sw.js',{scope});},scope);
  assert.ok(await bounded(async()=>(await watch(observer))?.active==='activated'),'observer registration active');
 }else{
  game=first;await attach(game,'game');await game.goto(scope+'?map=c_apartment1&sw=1&timer=1&fx=0&prefetch=0&debug=1');
  assert.ok(await bounded(()=>game.evaluate(()=>window.CoFRuntimeReady&&window.CoFCurrentMap?.()==='c_apartment1'),60000),'runtime boot');
  result.modulesBefore=await hashes(game);
  if(saveMode==='create'){
   assert.ok(await bounded(()=>(connections.get(game)||0)>0));
   await Promise.all([game.waitForEvent('console',{predicate:m=>m.text().includes('COF/FENCE sw_jobs_ready '),timeout:30000}),game.evaluate(()=>CoFDebug.cmd('sv_cheats 1\nsave sw_jobs\ncof_fence sw_jobs_ready'))]);
   await game.evaluate(()=>new Promise((resolve,reject)=>FS.syncfs(false,e=>e?reject(String(e)):resolve())));
  }
  if(saveMode!=='none')result.savesBefore=await saveHashes(game);
  if(kind.startsWith('dual')){observer=await ctx.newPage();await attach(observer,'minimal');await observer.goto(base+'observer.html');assert.equal(await observer.evaluate(()=>window.swObserver),true);}
 }
 result.initialRegistration=await watch(game||observer);assert.ok(result.initialRegistration?.active);
 if(observer)result.observerRegistration=await watch(observer);
 if(traceSession){
  try{await (browser||ctx.browser()).startTracing(undefined,{categories:['ServiceWorker','startup','toplevel','disabled-by-default-toplevel.flow']});tracing=true;}catch(e){result.tracingError=String(e);}
 }
 await control(target);
 const primary=kind==='dual-minimal'||!game?observer:game;
 const done=await phase(primary,'primary');
 if(!done&&kind==='game-then-minimal'){
  observer=await ctx.newPage();result.afterNewClient=await state(primary,'primary');
  await attach(observer,'minimal');result.afterInspector=await state(primary,'primary');
  await observer.goto(base+'observer.html');await pause(500);result.afterMinimalLoad=await state(primary,'primary');
 }
 if(!done&&game&&observer){
  const secondary=primary===game?observer:game;await phase(secondary,'secondary');
  result.primaryAfterSecondary=await state(primary,'primary');
  if(kind==='dual-game-close'&&(await state(secondary,'secondary')).phase==='calling'){
   result.modulesBeforeClose=await hashes(game);assert.deepEqual(result.modulesBeforeClose,result.modulesBefore);
   event('diagnostic-close-game');await game.close();result.gameClosedForDiagnosis=true;
   result.observerReleasedAfterGameClose=await bounded(async()=>['resolved','rejected'].includes((await state(observer,'secondary')).phase));
   result.observerAfterGameClose=await state(observer,'secondary');
  }
 }
 if(game&&!game.isClosed()){result.modulesAfter=await hashes(game);assert.deepEqual(result.modulesAfter,result.modulesBefore);if(saveMode!=='none'){result.savesAfter=await saveHashes(game);assert.deepEqual(result.savesAfter,result.savesBefore);}}
 result.observationsComplete=true;result.errors=errors;
}catch(e){result.failure=String(e.stack);event('failure',{text:result.failure});process.exitCode=1;}
finally{
 if(tracing){
  try{
   const raw=await Promise.race([(browser||ctx.browser()).stopTracing(),new Promise((_,reject)=>setTimeout(()=>reject(Error('trace finish')),10000).unref())]);
   fs.writeFileSync(path.join(out,'chromium-trace.json.gz'),zlib.gzipSync(raw));result.traceEventCount=JSON.parse(raw).traceEvents.length;
  }catch(e){result.traceError=String(e);}
 }
 await ctx.close();if(browser)await browser.close();
 const net=path.join(privateOut,'netlog.json');if(fs.existsSync(net)){const raw=fs.readFileSync(net);fs.writeFileSync(path.join(out,'netlog.json.gz'),zlib.gzipSync(raw));result.netlogBytes=raw.length;}
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));
}
