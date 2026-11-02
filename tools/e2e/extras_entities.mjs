// Private original BSPs + actual WASM. Debug activation is contract testing, not campaign progression.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(base&&out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const logs=[],errors=[],results={naturalProgression:false,commentaries:[]};let page,serial=0;
try {
 page=await browser.newPage({viewport:{width:800,height:600},screen:{width:800,height:600}});
 page.on('console',m=>logs.push(m.text()));page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const Original=window.Audio;window.__extrasAudio=[];window.Audio=function(...a){const x=new Original(...a);window.__extrasAudio.push(x);return x;};window.Audio.prototype=Original.prototype;});
 const wait=async(fn,limit=60000)=>{const start=Date.now();while(!await fn()){assert.ok(Date.now()-start<limit,'extras state timeout');await page.waitForTimeout(100);}};
 const cmd=async text=>{const start=logs.length,token=`extras_${++serial}`;await Promise.all([page.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${token} `),timeout:30000}),page.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${token}`)]);return logs.slice(start).join('\n');};
 const connected=()=>logs.filter(l=>l.includes('client connected')).length;
 const load=async name=>{const n=connected();await page.evaluate(n=>CoFDebug.cmd(`load ${n}`),name);await wait(()=>connected()>n);await cmd('r_norefresh 1');};
 const map=async name=>{await page.evaluate(n=>CoFPreload(n),name);const n=connected();await page.evaluate(n=>CoFDebug.cmd(`map ${n}`),name);await wait(()=>connected()>n);await cmd('sv_cheats 1\nr_norefresh 1\npausable 0');};
 const list=async cls=>[...(await cmd(`cof_list ${cls}`)).matchAll(/COF\/LIST \S+ #(\d+) origin=([^ ]+).*model=([^ ]+)/g)].map(m=>({id:+m[1],origin:m[2],model:m[3]}));
 const status=()=>cmd('cof_extras_status');
 await page.goto(`${base}?map=c_game_menu1&sw=0&fx=0&prefetch=0&timer=1&debug=1`);await wait(()=>connected()>0,180000);
 
 await cmd('sv_cheats 1\ncof_extras_unlock 0x1400000\ndev_commentary 1');
 await map('c_start');
 assert.match(await cmd('cof_count multi_manager'),/multi_manager 29/);
 assert.equal((await list('cof_developer_commentary')).length,4);
 assert.equal((await list('item_nightvision')).length,1);
 // All original instances: real noise path, playable source, original quarter-volume and Enter cancellation.
 for(const name of ['c_start','c_nightmare','c_start2','c_apartment1','c_apartment3','c_apartment4','c_apartment5','c_apartmentsick']) {
  if(name!=='c_start')await map(name);
  const comments=await list('cof_developer_commentary');
  for(const original of comments) {
   const e=(await list('cof_developer_commentary')).find(e=>e.origin===original.origin);assert.ok(e);
   const start=logs.length;await cmd(`volume 0.8\ncof_use #${e.id} toggle`);
   await wait(()=>page.evaluate(()=>document.querySelector('#cof-commentary')?.classList.contains('on')));
   await wait(()=>page.evaluate(()=>window.__extrasAudio.some(a=>a.src.startsWith('blob:')&&!a.paused&&a.currentTime>.05)));
   const event=logs.slice(start).find(l=>l.includes('COF/HUD COMMENTARY '));assert.ok(event);
   assert.match(await cmd('volume'),/0\.2/);
   if(results.commentaries.length===0) {
    await cmd('save extras_commentary');await page.keyboard.press('Enter');await load('extras_commentary');
    await wait(()=>page.evaluate(()=>document.querySelector('#cof-commentary')?.classList.contains('on')));
    results.commentaryRestored=await status();assert.match(results.commentaryRestored,/commentary=1/);
   }
   await page.keyboard.press('Enter');await wait(async()=>/commentary=0/.test(await status()));
   assert.match(await cmd('volume'),/0\.8/);
   results.commentaries.push({map:name,id:e.id,event,passed:true});console.log('OK commentary',name,e.id);
  }
  if(name==='c_apartment1') {
   const hoodie=(await list('cof_hoodie'))[0];assert.ok(hoodie);
   await cmd(`cof_use #${hoodie.id} toggle`);assert.match(await status(),/unlocks=20975616/); // 0x1401000
   assert.equal((await list('cof_hoodie')).length,0);results.hoodie=true;
  }
 }
 assert.equal(results.commentaries.length,22);
 // Visual contracts start in a fresh runtime; retain the earned profile through IndexedDB.
 // The eight-map accumulation run is recorded separately, not presented as a campaign performance pass.
 const n=connected();await page.goto(`${base}?map=c_start&sw=0&fx=0&prefetch=0&timer=1&debug=1`);await wait(()=>connected()>n,180000);
 await cmd('sv_cheats 1\nr_norefresh 1\npausable 0');assert.match(await status(),/unlocks=20975616/);results.freshRuntimeForVisuals=true;
 // Preserve the full original introduction before entering the actual clothes camera.
 await wait(async()=>{const text=await cmd('cof_camera kamera3');return /state=0 /.test(text)&&+(text.match(/ now=([\d.]+)/)||[])[1]>48;});
 // Attach the real postprocessor after the original timed introduction; software GL is expensive.
 if(process.env.COF_EXTRAS_FX){await page.evaluate(()=>document.exitPointerLock());await wait(()=>page.evaluate(()=>!document.pointerLockElement));await page.locator('#fullscreen').click();await page.evaluate(()=>CoFPostFX.attach());}
 // Clothing menu binds to the real camera and Simon model, selection rejects a locked costume.
 await cmd('cof_use clothes toggle');await page.locator('#cof-clothes.on').waitFor();
 assert.equal(await page.locator('[data-costume="6"]').isEnabled(),true);
 assert.equal(await page.locator('[data-costume="1"]').isEnabled(),false);
 await cmd('setclothes 1');assert.match(await status(),/costume=0/);
 await page.locator('[data-costume="6"]').click();await wait(async()=>/costume=6/.test(await status()));
 await cmd('r_norefresh 0');await page.waitForTimeout(8000);
 await cmd('setclothes 0');await page.waitForTimeout(300);await page.screenshot({path:out+'/clothes-default.png'});
 await cmd('setclothes 6');await page.waitForTimeout(300);
 results.clothesCamera=await cmd('cof_camera clothescamera\ncof_inspect simonclothes\ncof_extras_render');
 await page.screenshot({path:`${out}/clothes-hlc.png`});
 assert.match(results.clothesCamera,/COF\/EXTRASCLIENT costume=6/);
 assert.match(results.clothesCamera,/replacements=[1-9]/);
 results.screen=await page.evaluate(()=>({width:innerWidth,height:innerHeight,screen:[screen.width,screen.height],fullscreen:document.fullscreenElement?.tagName,lock:document.pointerLockElement?.id||null}));
 await cmd('save extras_clothes');await page.locator('[data-close]').click();await load('extras_clothes');
 await page.locator('#cof-clothes.on').waitFor();assert.match(await status(),/costume=6/);
 await page.locator('[data-close]').click();await wait(()=>page.locator('#cof-clothes.on').count().then(n=>n===0));results.clothesRestored=true;
 // Nightvision is only collectible with E. Positioning isolates the original item contract.
 const nv=(await list('item_nightvision'))[0];assert.ok(nv);const xyz=nv.origin.split(',').map(Number);
 await cmd(`cof_unfreeze !player\ncof_goto ${xyz[0]} ${xyz[1]} ${xyz[2]+12}`);
 await page.waitForTimeout(300);assert.match(await status(),/nightOwned=0/);
 await page.keyboard.down('e');await page.waitForTimeout(200);await page.keyboard.up('e');
 await wait(async()=>/nightOwned=1/.test(await status()));
 await cmd('cof_give weapon_glock\nweapon_glock');await page.waitForTimeout(1100);
 results.weaponBefore=await cmd('cof_weapon_status');
 await cmd('flashlight');await wait(async()=>/nightState=1(?:\s|$)/.test(await status()));
 await page.waitForTimeout(2100);await cmd('r_norefresh 0');await page.waitForTimeout(500);
 if(process.env.COF_EXTRAS_FX){await wait(()=>page.evaluate(()=>CoFPostFX.get().nightvision===true));results.postfx=await page.evaluate(()=>({settings:CoFPostFX.get(),stats:CoFPostFX.stats()}));assert.ok(results.postfx.stats.msPerFrame>0);}
 results.nightActive=await cmd('cof_extras_status\ncof_extras_render\nroom_type\ncof_weapon_status');
 assert.match(results.nightActive,/night=1 lit=1/);assert.match(results.nightActive,/class=weapon_glock/);
 await cmd('save extras_night');await cmd('flashlight');await wait(async()=>/nightState=0/.test(await status()));
 await load('extras_night');await page.waitForTimeout(2200);assert.match(await status(),/nightOwned=1 nightState=1/);
 await cmd('r_norefresh 0');await page.waitForTimeout(300);await page.screenshot({path:`${out}/nightvision.png`});
 await cmd('flashlight');await wait(async()=>/nightState=0/.test(await status()));await page.waitForTimeout(2100);
 results.nightOff=await cmd('cof_extras_render\ncof_weapon_status\nroom_type');assert.match(results.nightOff,/night=0 lit=0/);assert.match(results.nightOff,/class=weapon_glock/);
 results.nightRestored=true;assert.deepEqual(errors,[]);results.passed=true;console.log('PASS all 22 commentary streams; HLC unlock; clothes selection/save/load/render; nightvision E/F/save/load/weapon');
} catch(e){results.passed=false;results.failure=String(e.stack||e);console.error(e);process.exitCode=1;}
finally{results.errors=errors;results.chromium=browser.version();fs.writeFileSync(`${out}/result.json`,JSON.stringify(results,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await browser.close();}