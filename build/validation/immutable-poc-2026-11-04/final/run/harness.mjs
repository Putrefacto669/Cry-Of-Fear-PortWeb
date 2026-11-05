// Private distribution tests. Debug commands exercise save/map contracts, not natural progression.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const [base,out,privateRoot,sourceTools]=process.argv.slice(2);
assert.ok(!fs.existsSync(out)&&!fs.existsSync(privateRoot));
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(privateRoot,{recursive:true});
fs.copyFileSync(import.meta.filename,path.join(out,'harness.mjs'));
const result={checks:[],errors:[],naturalProgression:false,mobilePhysicalTests:false};
const stamp=(stage,data={})=>fs.appendFileSync(path.join(out,'stages.jsonl'),JSON.stringify({time:Date.now(),stage,...data})+'\n');
const check=(name,value=true)=>{assert.ok(value,name);result.checks.push(name);stamp('pass',{name});};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn,limit=60000){const start=Date.now();while(true){try{if(await fn())return;}catch(e){if(!String(e).includes('Execution context was destroyed'))throw e;}assert.ok(Date.now()-start<limit,'condition deadline');await pause(100);}}
const catalog=await(await fetch(base+'catalog.json')).json();
const [old,latest]=catalog;
const manifests={};
for(const r of catalog){const raw=Buffer.from(await(await fetch(base+r.url.slice(1)+'release.json')).arrayBuffer());assert.equal(sha(raw),r.releaseId);manifests[r.label]=JSON.parse(raw);
 for(const [template,file] of [['index.html','index.html'],['worker.js','sw.js'],['boot.js','poc_boot.js']]){const bytes=Buffer.from(await(await fetch(base+r.url.slice(1)+file)).arrayBuffer());assert.equal(sha(bytes),manifests[r.label].templates[template]);assert.equal(sha(bytes),r.envelope[file]);}
}
fs.writeFileSync(path.join(out,'catalog.json'),JSON.stringify(catalog,null,2));
for(const r of catalog)fs.writeFileSync(path.join(out,r.label+'-manifest.json'),JSON.stringify(manifests[r.label],null,2));
check('release IDs equal full manifest hashes');
check('generated bootstrap bytes agree with pinned manifest and envelope');
check('releases distinct',old.releaseId!==latest.releaseId);
const profile=path.join(privateRoot,'profile');
const monitor=spawn('python3',[path.join(sourceTools,'memory.py'),profile,path.join(out,'rss.jsonl')],{stdio:'ignore'});
const opts={executablePath:'/root/cof-audits/browser-1.64.1/browsers/chromium-1248/chrome-linux64/chrome',viewport:{width:800,height:600},args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']};
let ctx,otherContext,serial=0;
async function closeContext(context,label){
 if(!context)return;
 const done=await Promise.race([context.close().then(()=>true),pause(10000).then(()=>false)]);
 if(!done){(result.cleanupWarnings||=[]).push(label+' close pending after 10 seconds');stamp('cleanup-pending',{label});}
 return done;
}
function terminatePrivateBrowser(){for(const name of fs.readdirSync('/proc').filter(n=>/^\d+$/.test(n))){try{const args=fs.readFileSync('/proc/'+name+'/cmdline','utf8').split('\0');if(args.includes('--user-data-dir='+profile)&&!args.some(a=>a.startsWith('--type=')))process.kill(Number(name),'SIGTERM');}catch{}}}
const logs=new Map(),connections=new Map();
const attach=p=>{logs.set(p,[]);connections.set(p,0);p.on('console',m=>{logs.get(p).push(m.text());if(m.text().includes('client connected'))connections.set(p,connections.get(p)+1);fs.appendFileSync(path.join(out,'engine.log'),m.text()+'\n');});p.on('pageerror',e=>result.errors.push(e.message));};
const url=(r,prepare=false)=>base+r.url.slice(1)+'?map=c_apartment1&timer=1&fx=0&debug=1'+(prepare?'&prepare=1':'');
async function prepared(p,r){attach(p);await p.goto(url(r,true));await wait(()=>p.evaluate(()=>!!window.ImmutablePoC&&document.getElementById('status').textContent.startsWith('Lanzamiento preparado')));}
async function boot(p){const before=connections.get(p)||0;await p.evaluate(()=>ImmutablePoC.start());await wait(()=>p.evaluate(()=>!!window.CoFRuntimeReady));await wait(()=>(connections.get(p)||0)>before);}
async function cmd(p,text){const token='immutable_'+(++serial),start=logs.get(p).length;await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes('COF/FENCE '+token+' '),timeout:30000}),p.evaluate(t=>CoFDebug.cmd(t),text+'\ncof_fence '+token)]);return logs.get(p).slice(start).join('\n');}
async function modules(p){return p.evaluate(async()=>{const r={};for(const n of ['server.wasm','client.wasm','libref_gles3compat.wasm','filesystem_stdio.wasm','menu.wasm'])r['/lib/'+n]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',FS.readFile('/lib/'+n))),b=>b.toString(16).padStart(2,'0')).join('');return r;});}
function expected(label){return Object.fromEntries(Object.entries(manifests[label].modules).map(([k,v])=>[k,v.sha256]));}
async function saved(p){return p.evaluate(async()=>{const r={},names=['/rwdir/cryoffear/save/immutable.sav','/rwdir/cryoffear/cof_extras_profile.cfg'];for(const name of names)if(FS.analyzePath(name).exists)r[name]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',FS.readFile(name))),b=>b.toString(16).padStart(2,'0')).join('');return r;});}
async function stored(p){return p.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('/rwdir');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});try{const r={};for(const name of ['/rwdir/cryoffear/save/immutable.sav','/rwdir/cryoffear/cof_extras_profile.cfg']){const data=await new Promise((resolve,reject)=>{const q=db.transaction('FILE_DATA','readonly').objectStore('FILE_DATA').get(name);q.onsuccess=()=>resolve(q.result?.contents);q.onerror=()=>reject(q.error);});if(!data)continue;r[name]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');}return r;}finally{db.close();}});}
async function metrics(p){return p.evaluate(()=>({metrics:ImmutablePoC.metrics,storage:null,wasmBytes:window.HEAPU8?.byteLength||null}));}
async function fault(entry,mode){assert.ok((await fetch(base+'__fault',{method:'POST',body:JSON.stringify({path:entry.url,mode})})).ok);}
async function evict(p,entry){await p.evaluate(async url=>{await(await caches.open('cof-immutable-poc-wire-v1')).delete(url);},new URL(entry.url,base).href);}
try{
 ctx=await chromium.launchPersistentContext(profile,opts);result.browser=ctx.browser().version();
 const p=ctx.pages()[0]||await ctx.newPage();
 stamp('old-initial-start');const initialStart=Date.now();await prepared(p,old);result.initialPreparedMs=Date.now()-initialStart;
 result.initial=await metrics(p);result.initial.storage=await p.evaluate(()=>ImmutablePoC.storage());
 const initialMaps=new Set(result.initial.metrics.filter(m=>m.logical.startsWith('packs/map_')).map(m=>m.logical));
 check('initial dependency download contains only selected map',[...initialMaps].every(n=>n.includes('map_c_apartment1.')));
 await boot(p);result.oldModules=await modules(p);assert.deepEqual(result.oldModules,expected('old'));check('old mounts exact five modules');
 await cmd(p,'sv_cheats 1');await cmd(p,'save immutable');await p.evaluate(()=>ImmutablePoC.flush());result.saved=await saved(p);assert.deepEqual(await stored(p),result.saved);check('old native save synchronized');

 const duplicate=await ctx.newPage();await prepared(duplicate,old);
 const lockError=await duplicate.evaluate(()=>ImmutablePoC.start().then(()=>null,e=>String(e)));assert.match(lockError,/Another runtime owns/);check('second writer blocked');await duplicate.close();
 stamp('prepare-new-with-old-open');const q=await ctx.newPage();await prepared(q,latest);result.newPrepared=await metrics(q);result.newPrepared.storage=await q.evaluate(()=>ImmutablePoC.storage());
 check('identical objects reused across releases',result.newPrepared.metrics.some(m=>m.hit));
 assert.deepEqual(await modules(p),result.oldModules);check('old runtime unchanged while new release prepared');
 result.scopes=await q.evaluate(async()=>Promise.all((await navigator.serviceWorker.getRegistrations()).map(async r=>({scope:r.scope,active:r.active?.scriptURL}))));
 check('two independent worker scopes',result.scopes.length===2&&result.scopes.every(r=>r.active.startsWith(r.scope)));
 const frozen=await p.evaluate(()=>{const value=ImmutablePoC.releaseId;try{ImmutablePoC.releaseId='changed';}catch{}return value===ImmutablePoC.releaseId&&Object.isFrozen(ImmutablePoC.manifest.resources);});check('session graph fixed',frozen);
 stamp('download-faults');result.faults=[];
 for(const [map,mode] of [['c_apartment3','missing'],['c_apartment4','corrupt'],['c_apartment5','interrupt']]){
   const entry=manifests.new.resources['packs/map_'+map+'.data'];await evict(q,entry);await fault(entry,mode);
   const error=await q.evaluate(map=>ImmutablePoC.prepare(map).then(()=>null,e=>String(e)),map);assert.ok(error,mode+' must fail');
   const cached=await q.evaluate(async url=>!!await(await caches.open('cof-immutable-poc-wire-v1')).match(url),new URL(entry.url,base).href);check(mode+' object not cached',!cached);
   await fault(entry,'clear');await q.evaluate(map=>ImmutablePoC.prepare(map),map);result.faults.push({map,mode,error,recovered:true});check(mode+' download recovers');
 }
 const cacheEntry=manifests.new.resources['packs/engine.js'];await q.evaluate(async url=>{await(await caches.open('cof-immutable-poc-wire-v1')).put(url,new Response('bad cached bytes'));},new URL(cacheEntry.url,base).href);
 const bad=await q.evaluate(async()=>({status:(await fetch('packs/engine.js')).status}));assert.equal(bad.status,503);check('corrupt cache rejected');
 assert.equal(await q.evaluate(async()=>(await fetch('packs/engine.js')).status),200);check('corrupt cache evicted and retry recovers');
 assert.deepEqual(await modules(p),result.oldModules);check('faults never replace mounted old modules');
 // A separate browser storage context allows a second real runtime without a second writer to /rwdir.
 otherContext=await ctx.browser().newContext({viewport:opts.viewport});const n=await otherContext.newPage();await prepared(n,latest);await boot(n);result.newModules=await modules(n);assert.deepEqual(result.newModules,expected('new'));check('new runtime mounts own exact modules in independent profile');
 stamp('second-map-download');const t=Date.now(),count=connections.get(n);await n.evaluate(()=>CoFPreload('c_apartment2'));await n.evaluate(()=>CoFDebug.cmd('map c_apartment2'));await wait(()=>connections.get(n)>count);await wait(()=>n.evaluate(()=>CoFCurrentMap()==='c_apartment2'));result.secondMapMs=Date.now()-t;result.newRuntime=await metrics(n);check('second map downloaded and mounted from pinned graph');
 result.newRuntime.storage=await n.evaluate(()=>ImmutablePoC.storage());await cmd(n,'sv_cheats 1');await cmd(n,'cof_extras_unlock 0x1400000\nsave immutable');await n.evaluate(()=>ImmutablePoC.flush());result.newProfileSaved=await saved(n);assert.equal(Object.keys(result.newProfileSaved).length,2);
 await n.evaluate(next=>ImmutablePoC.transition(next),url(old,true));await wait(()=>n.evaluate(()=>!!window.ImmutablePoC&&document.getElementById('status').textContent.startsWith('Lanzamiento preparado')));assert.deepEqual(await stored(n),result.newProfileSaved);check('new unlock profile and native slot survive route transition');
 const newToOld=await n.evaluate(()=>ImmutablePoC.start().then(()=>null,e=>String(e)));assert.match(newToOld,/compatibility unverified/);check('reverse incompatible contract rejected');
 await n.goto(url(latest,true));await wait(()=>n.evaluate(()=>!!window.ImmutablePoC&&document.getElementById('status').textContent.startsWith('Lanzamiento preparado')));await boot(n);assert.deepEqual(await saved(n),result.newProfileSaved);assert.match(await cmd(n,'sv_cheats 1\ncof_extras_status'),/unlocks=20971520/);check('new release reopens persisted unlock profile');
 await closeContext(otherContext,'independent context');otherContext=null;
 const flushFailure=await p.evaluate(async next=>{const original=FS.syncfs;FS.syncfs=(_,cb)=>cb(Error('injected IDB failure'));try{await ImmutablePoC.transition(next);return null;}catch(e){return String(e);}finally{FS.syncfs=original;}},url(latest,true));assert.match(flushFailure,/injected IDB failure/);assert.ok(p.url().includes(old.releaseId));check('failed IDB sync prevents navigation');
 stamp('cross-release-transition');await p.evaluate(next=>ImmutablePoC.transition(next),url(latest,true));await wait(()=>p.evaluate(()=>!!window.ImmutablePoC&&document.getElementById('status').textContent.startsWith('Lanzamiento preparado')));
 assert.deepEqual(await stored(p),result.saved);check('IndexedDB native slot survives release path change');
 const incompatible=await p.evaluate(()=>ImmutablePoC.start().then(()=>null,e=>String(e)));assert.match(incompatible,/compatibility unverified/);check('unverified native save contract blocked before runtime/migration');result.incompatible=incompatible;
 assert.deepEqual(await stored(p),result.saved);check('incompatible transition does not modify save files');
 await q.close();if(!await closeContext(ctx,'before cold reopen')){terminatePrivateBrowser();await pause(1000);}ctx=null;
 stamp('cold-reopen');ctx=await chromium.launchPersistentContext(profile,opts);const cold=ctx.pages()[0]||await ctx.newPage();await prepared(cold,old);await boot(cold);assert.deepEqual(await saved(cold),result.saved);await cmd(cold,'sv_cheats 1');check('cold reopen preserves old native save');
 const c=connections.get(cold);await cold.evaluate(()=>CoFDebug.cmd('load immutable'));await wait(()=>connections.get(cold)>c);await cmd(cold,'sv_cheats 1');check('same-release native saved game loads');
 result.finalStorage=await cold.evaluate(()=>ImmutablePoC.storage());result.passed=true;check('no new JavaScript page errors',result.errors.length===0);
}catch(e){result.failure=String(e.stack);stamp('failure',{error:result.failure});process.exitCode=1;}
finally{
 fs.writeFileSync(path.join(out,'result-before-cleanup.json'),JSON.stringify(result,null,2));
 await closeContext(otherContext,'final independent context');await closeContext(ctx,'final persistent context');
 // Dispose can itself remain pending in Chromium. Only terminate this exact private browser.
 terminatePrivateBrowser();
 monitor.kill('SIGTERM');
 const samples=path.join(out,'rss.jsonl');if(fs.existsSync(samples)){const rows=fs.readFileSync(samples,'utf8').trim().split('\n').map(JSON.parse);result.rssSumPeakBytes=Math.max(...rows.map(r=>r.rssSumBytes));result.rssSampleCount=rows.length;}
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));
}
