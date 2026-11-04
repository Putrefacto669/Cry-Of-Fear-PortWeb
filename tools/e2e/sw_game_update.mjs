// Real WASM + native saves, persistent Chromium profile. No resource or save-system changes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const [base,out,profile]=process.argv.slice(2);assert.ok(!fs.existsSync(out)&&!fs.existsSync(profile));fs.mkdirSync(out,{recursive:true});
const versions=JSON.parse(fs.readFileSync(`${out}/../fixture.json`,'utf8'));
const trace=(event,data={})=>fs.appendFileSync(`${out}/trace.jsonl`,JSON.stringify({time:Date.now(),event,...data})+'\n');
const control=async(version,fault={})=>{assert.ok((await fetch(base+'__control',{method:'POST',body:JSON.stringify({version,fault})})).ok);};
const options={viewport:{width:800,height:600},args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']};
let ctx,p,serial=0;const logs=[],errors=[],r={checks:[]};
const check=(name,data={})=>{r.checks.push({name,...data});trace('PASS',{name,...data});console.log('PASS',name);};
const open=async()=>{
 ctx=await chromium.launchPersistentContext(profile,options);
 ctx.on('request',q=>trace('request',{url:q.url(),worker:!!q.serviceWorker()}));
 ctx.on('requestfailed',q=>trace('requestfailed',{url:q.url(),error:q.failure()}));
 ctx.on('response',q=>trace('response',{url:q.url(),status:q.status(),worker:!!q.request().serviceWorker()}));
 ctx.on('console',m=>{logs.push(m.text());fs.appendFileSync(`${out}/engine.log`,m.text()+'\n');});
 ctx.on('pageerror',e=>{errors.push(e.message);trace('pageerror',{message:e.message});});
 p=ctx.pages()[0]||await ctx.newPage();
 const cdp=await ctx.newCDPSession(p);await cdp.send('ServiceWorker.enable');
 for(const e of ['workerRegistrationUpdated','workerVersionUpdated','workerErrorReported'])cdp.on('ServiceWorker.'+e,d=>trace(e,d));
 await ctx.addInitScript(()=>{
  navigator.serviceWorker.addEventListener('controllerchange',()=>console.log('SWTRACE controllerchange'));
  const register=navigator.serviceWorker.register.bind(navigator.serviceWorker);
  navigator.serviceWorker.register=async(...args)=>{const r=await register(...args);r.addEventListener('updatefound',()=>{console.log('SWTRACE updatefound');const w=r.installing;w.addEventListener('statechange',()=>console.log('SWTRACE '+w.state));});return r;};
 });
};
const poll=async fn=>{const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<30000,'30-second update/fence contract');await new Promise(r=>setTimeout(r,80));}};
const connected=()=>logs.filter(l=>l.includes('client connected')).length;
const ready=async action=>{const n=connected();await action();await poll(()=>connected()>n);assert.ok(await p.evaluate(()=>!!navigator.serviceWorker.controller));};
const cmd=async text=>{const id=`sw_${++serial}`,start=logs.length;trace('command-start',{id,text});await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${id} `),timeout:30000}),p.evaluate(c=>CoFDebug.cmd(c),`sv_cheats 1\n${text}\ncof_fence ${id}`)]);trace('command-end',{id});return logs.slice(start).join('\n');};
const controllerVersion=()=>p.evaluate(()=>new Promise((resolve,reject)=>{const c=new MessageChannel(),t=setTimeout(()=>reject(Error('controller version acknowledgement')),30000);c.port1.onmessage=e=>{clearTimeout(t);resolve(e.data.version);};navigator.serviceWorker.controller.postMessage('cof-version',[c.port2]);}));
const clickUpdate=async()=>{
 // Pointer Lock redirects mouse events to the game, including header coordinates.
 // Release it before a real UI click; do not force or invoke the update handler.
 if(await p.evaluate(()=>!!document.pointerLockElement)){
  await p.keyboard.press('Escape');
  if(await p.evaluate(()=>!!document.pointerLockElement)){
   trace('headless-pointer-release');await p.evaluate(()=>document.exitPointerLock());
  }
  await poll(()=>p.evaluate(()=>!document.pointerLockElement));
 }
 trace('update-click');await p.locator('#update').click({timeout:30000});
};
const hashes=()=>p.evaluate(async()=>{const result={};for(const n of ['server.wasm','client.wasm','libref_gles3compat.wasm','filesystem_stdio.wasm','menu.wasm']){const bytes=FS.readFile('/lib/'+n);result[n]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');}return result;});
const saved=()=>p.evaluate(async()=>{const b=FS.readFile('/rwdir/cryoffear/save/sw_update.sav');return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');});
const update=async()=>{await p.evaluate(()=>{window.updateResult='pending';navigator.serviceWorker.getRegistration().then(r=>r.update()).then(()=>window.updateResult='resolved',e=>window.updateResult=String(e));});await poll(()=>p.evaluate(()=>window.updateResult!=='pending'));assert.equal(await p.evaluate(()=>window.updateResult),'resolved');await poll(()=>p.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting));await p.locator('#update').waitFor({state:'visible',timeout:30000});};
try{
 await control('new');await open();await ready(()=>p.goto(base+'?map=c_apartment1&sw=1&timer=1&fx=0&prefetch=0&debug=1'));
 r.modules=await hashes();await cmd('sv_cheats 1\nr_norefresh 1\ncof_give weapon_glock\nweapon_glock');await p.waitForTimeout(1200);await cmd('save sw_update');
 // Establish the native historical save in IDBFS before testing legacy-loader upgrade.
 await p.evaluate(()=>new Promise((resolve,reject)=>FS.syncfs(false,e=>e?reject(String(e)):resolve())));r.save=await saved();
 await control('fixed');await update();await cmd('cof_weapon_status');await p.waitForTimeout(500);assert.deepEqual(await hashes(),r.modules);assert.equal(await saved(),r.save);check('open game defers update with original modules and save');
 await ready(()=>Promise.all([p.waitForNavigation({waitUntil:'domcontentloaded',timeout:30000}),clickUpdate()]));r.candidateVersion=await controllerVersion();assert.equal(r.candidateVersion,versions.fixed.version);assert.equal(await p.evaluate(async()=>(await navigator.serviceWorker.getRegistration()).updateViaCache),'none');assert.deepEqual(await hashes(),r.modules);assert.equal(await saved(),r.save);check('accept from active game upgrades frontend without changing native save',{version:r.candidateVersion});
 await ready(()=>p.evaluate(()=>CoFDebug.cmd('load sw_update')));assert.match(await cmd('cof_weapon_status'),/class=weapon_glock/);check('native save restores after legacy-to-candidate update');
 await ready(()=>p.reload());assert.deepEqual(await hashes(),r.modules);assert.equal(await saved(),r.save);check('normal reload retains candidate modules and IndexedDB save');
 // An obsolete network index must not replace the candidate HTML under its hash.
 await control('old',{path:'sw.js',mode:'fail'});await ready(()=>p.reload());assert.deepEqual(await hashes(),r.modules);assert.equal(await saved(),r.save);assert.equal(await controllerVersion(),r.candidateVersion);check('old network HTML falls back to coherent cached candidate');await control('fixed');
 await ctx.close();await open();await ready(()=>p.goto(base+'?map=c_game_menu1&sw=1&timer=1&fx=0&prefetch=0&debug=1'));assert.deepEqual(await hashes(),r.modules);assert.equal(await saved(),r.save);assert.equal(await controllerVersion(),r.candidateVersion);check('browser close/reopen retains registration, five module hashes and native save');
 // The synthetic next fixture changes only a debug comment, not any game bytes.
 await control('next');await update();
 const other=await ctx.newPage();await other.goto(base+'probe.html');await clickUpdate();await poll(()=>p.locator('#status').textContent().then(s=>s.includes('otras pestañas')));assert.ok(await p.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting));assert.equal(await p.locator('#update').isEnabled(),true);await other.close();check('blocked multi-tab acceptance resets real update button');
 // Deliberately pending browser storage changes: only the actual update handler flushes them.
 await p.evaluate(()=>FS.writeFile('/rwdir/sw-update-marker.txt','pending-before-accept'));
 await p.evaluate(()=>{window.originalSync=FS.syncfs;FS.syncfs=(_,cb)=>setTimeout(()=>cb(Error('injected browser-storage failure')),0);});await clickUpdate();await poll(()=>p.locator('#status').textContent().then(s=>s.includes('No se pudo guardar')));assert.ok(await p.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting));assert.equal(await p.locator('#update').isEnabled(),true);await p.evaluate(()=>{FS.syncfs=window.originalSync;delete window.originalSync;});check('browser-storage failure prevents reload and allows retry');
 await ready(()=>Promise.all([p.waitForNavigation({waitUntil:'domcontentloaded',timeout:30000}),clickUpdate()]));r.nextVersion=await controllerVersion();assert.equal(r.nextVersion,versions.next.version);assert.equal(await p.evaluate(()=>FS.readFile('/rwdir/sw-update-marker.txt',{encoding:'utf8'})),'pending-before-accept');assert.equal(await saved(),r.save);assert.deepEqual(await hashes(),r.modules);check('accept from menu flushes pending IDBFS before controller change',{version:r.nextVersion});
 await p.evaluate(()=>CoFPreload('c_apartment1'));await ready(()=>p.evaluate(()=>CoFDebug.cmd('load sw_update')));assert.match(await cmd('cof_weapon_status'),/class=weapon_glock/);check('save loads after menu update');
 assert.deepEqual(errors,[]);r.passed=true;
}catch(e){r.passed=false;r.failure=String(e.stack);console.error(e);await p?.screenshot({path:`${out}/failure.png`}).catch(()=>{});process.exitCode=1;}
finally{r.errors=errors;fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));if(ctx)await ctx.close();await control('fixed');}
