// Real original models and WASM; equipment/position helpers isolate contracts, not progression.
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(base&&out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),ctx=await browser.newContext({viewport:{width:800,height:600},screen:{width:800,height:600}}),p=await ctx.newPage(),logs=[],errors=[],r={diagnosticOnly:true};let serial=0;
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
const deployment=async page=>{
 const d=await page.evaluate(async()=>{const text=await(await fetch('sw-manifest.js',{cache:'no-store'})).text();const manifest=JSON.parse(text.match(/=\s*(\{[\s\S]*\});/)[1]);return {manifest:manifest.version,controller:navigator.serviceWorker?.controller?.scriptURL||null};});
 if(process.env.COF_SW==='1')assert.ok(d.controller,'Service Worker must control the actual runtime');
 if(process.env.COF_EXPECT_MANIFEST)assert.equal(d.manifest,process.env.COF_EXPECT_MANIFEST);
 return d;
};
try{
 const wait=async fn=>{const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<60000,'hands state timeout');await p.waitForTimeout(100);}};
 const cmd=async text=>{const i=logs.length,t=`hands_${++serial}`;await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${t} `),timeout:30000}),p.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${t}`)]);return logs.slice(i).join('\n');};
 const weapon=()=>cmd('cof_weapon_status');
 const load=async name=>{const n=logs.filter(l=>l.includes('client connected')).length;await p.evaluate(n=>CoFDebug.cmd(`load ${n}`),name);await wait(()=>logs.filter(l=>l.includes('client connected')).length>n);};
 await p.goto(`${base}?map=c_apartment1&sw=${process.env.COF_SW||'0'}&fx=0&timer=1&prefetch=0&debug=1`);await wait(()=>logs.some(l=>l.includes('client connected')));r.deployment=await deployment(p);await cmd('sv_cheats 1\nr_norefresh 1\ncof_weapon_debug 1');await wait(async()=>/frozen=0 /.test(await cmd('cof_inspect !player')));
 // Real gameplay starts with mouse capture. Acquire it while unarmed so this click
 // cannot change phone mode or consume a pistol round before the inventory fixture.
 await p.mouse.click(400,200);await p.waitForFunction(()=>document.pointerLockElement?.id==='canvas');
 await cmd('cof_give weapon_mobile\ncof_give weapon_switchblade\ncof_give weapon_glock');r.bagBefore=await cmd('cof_dump\ncof_weapon_status\ncl_lw');
 const slots=Object.fromEntries([...r.bagBefore.matchAll(/bag (\d+): (weapon_\w+)/g)].map(m=>[m[2],+m[1]]));assert.equal(Object.keys(slots).length,3);
 // Actual inventory DUAL WIELD, then the other item. Neither slot is consumed.
 await p.locator('canvas').focus();await p.keyboard.press('Tab');await p.locator('#cof-bag.on').waitFor();await p.locator(`[data-item="${slots.weapon_mobile}"]`).click();await p.locator('#cof-bag .menu.on [data-act="dual"]').click();await p.locator(`[data-item="${slots.weapon_switchblade}"]`).click();await p.locator('#cof-bag.on').waitFor({state:'hidden'});
 r.blade=await weapon();assert.match(r.blade,/class=weapon_switchblade/);assert.match(r.blade,/dual=1/);
 await cmd('r_norefresh 0');await p.waitForTimeout(1500);r.bladeRender=await cmd('cof_hands_render');assert.match(r.bladeRender,/on=1 right=1/);assert.match(r.bladeRender,/draws=[1-9]/);assert.match(r.bladeRender,/mirrors=[1-9]/);await p.screenshot({path:`${out}/blade-phone.png`});
 // The secondary button changes only the phone mode, and leaves the blade selected.
 await p.mouse.down({button:'right'});await p.waitForTimeout(80);await p.mouse.up({button:'right'});await wait(async()=>/mode=1 light=1 dual=1/.test(await weapon()));r.afterPhoneToggle=await weapon();assert.match(r.afterPhoneToggle,/class=weapon_switchblade/);
 // An invalid pair cannot silently clear the working pair.
 r.invalid=await cmd(`cof_dualwield ${slots.weapon_mobile} ${slots.weapon_mobile}`);assert.match(r.invalid,/DUALSELECT 0/);assert.match(await weapon(),/dual=1/);
 // Reverse slot order also canonicalizes phone left / pistol right.
 await cmd(`cof_dualwield ${slots.weapon_glock} ${slots.weapon_mobile}`);await p.waitForTimeout(1300);r.glock=await weapon();assert.match(r.glock,/class=weapon_glock clip=15/);assert.match(r.glock,/dual=1/);
 r.glockRender=await cmd('cof_hands_render');assert.match(r.glockRender,/on=1 right=2/);await p.screenshot({path:`${out}/glock-phone.png`});
 await cmd('r_norefresh 1');await p.mouse.click(400,200,{button:'left',delay:30});await wait(async()=>/clip=(?:[0-9]|1[0-4]) /.test(await weapon()));r.shot=await weapon();r.shotClip=+r.shot.match(/clip=(\d+)/)[1];assert.ok(r.shotClip<15);
 await cmd('save hands_active');await load('hands_active');await p.waitForTimeout(2200);r.restored=await weapon();assert.match(r.restored,new RegExp(`class=weapon_glock clip=${r.shotClip} `));assert.match(r.restored,/mode=1 light=1 dual=1/);assert.match(await cmd('cof_hands_render'),/on=1 right=2/);
 r.bagAfter=await cmd('cof_dump');for(const name of Object.keys(slots))assert.equal([...r.bagAfter.matchAll(new RegExp(`bag \\d+: ${name} `,'g'))].length,1);
 // Save a delayed phone light switch, then restore it in a fresh WASM runtime.
 const mark=logs.length;
 await p.mouse.down({button:'right'});
 await wait(()=>logs.slice(mark).some(l=>/COF\/HANDS .*phoneSeq=8 /.test(l)));
 r.pendingSave=await cmd('save hands_switch');await p.mouse.up({button:'right'});
 const snapshot=await p.evaluate(()=>FS.readdir('/rwdir/cryoffear/save').filter(n=>/\.(sav|HL[123])$/i.test(n)).map(n=>[n,[...FS.readFile(`/rwdir/cryoffear/save/${n}`)]]));
 await wait(async()=>/mode=0 light=0 dual=1/.test(await weapon()));
 const beforeCold=logs.filter(l=>l.includes('client connected')).length;
 await p.goto(`${base}?map=c_game_menu1&sw=${process.env.COF_SW||'0'}&fx=0&timer=1&prefetch=0&debug=1`);await wait(()=>logs.filter(l=>l.includes('client connected')).length>beforeCold);
 await cmd('sv_cheats 1\nr_norefresh 1');
 assert.ok(await p.evaluate(()=>CoFPreload('c_apartment1')));
 await p.evaluate(files=>{FS.mkdirTree('/rwdir/cryoffear/save');for(const[n,b]of files)FS.writeFile(`/rwdir/cryoffear/save/${n}`,new Uint8Array(b));},snapshot);
 await load('hands_switch');await wait(async()=>/mode=0 light=0 dual=1/.test(await weapon()));await p.waitForTimeout(2200);
 r.cold=await weapon();assert.match(r.cold,new RegExp(`class=weapon_glock clip=${r.shotClip} `));assert.match(r.cold,/mode=0 light=0 dual=1/);assert.match(await cmd('cof_hands_render'),/on=1 right=2/);
 await cmd('r_norefresh 0');await p.waitForTimeout(500);r.gl=await p.evaluate(()=>{const c=document.querySelector('canvas'),g=c.getContext('webgl2')||c.getContext('webgl');return g?{lost:g.isContextLost(),error:g.getError()}:null;});assert.deepEqual(r.gl,{lost:false,error:0});
 // Pick up a real original ammunition entity, then save/load the right-hand reload.
 await cmd('r_norefresh 1');const rows=await cmd('cof_callbacks !all');const ammo=rows.split('\n').find(l=>/class=ammo_glock /.test(l)&&!/touch=0:0 /.test(l));assert.ok(ammo);
 await cmd(`cof_goto #${ammo.match(/id=(\d+)/)[1]}`);await wait(async()=>/ammo=[1-9]/.test(await weapon()));r.beforeReload=await weapon();const total=+r.beforeReload.match(/clip=(\d+)/)[1]+ +r.beforeReload.match(/ammo=(\d+)/)[1];
 await p.keyboard.press('r');await wait(async()=>/reload=1 /.test(await weapon()));r.reloadSave=await cmd('save hands_reload');const reloadFiles=await p.evaluate(()=>FS.readdir('/rwdir/cryoffear/save').filter(n=>/\.(sav|HL[123])$/i.test(n)).map(n=>[n,[...FS.readFile(`/rwdir/cryoffear/save/${n}`)]]));await load('hands_reload');await wait(async()=>/clip=15 .*reload=0 /.test(await weapon()));r.reloaded=await weapon();assert.equal(+r.reloaded.match(/ammo=(\d+)/)[1],total-15);assert.match(r.reloaded,/dual=1/);assert.match(await cmd('cof_hands_render'),/on=1 right=2/);
 const coldReloadCount=logs.filter(l=>l.includes('client connected')).length;
 await p.goto(`${base}?map=c_game_menu1&sw=${process.env.COF_SW||'0'}&fx=0&timer=1&prefetch=0&debug=1`);await wait(()=>logs.filter(l=>l.includes('client connected')).length>coldReloadCount);await cmd('sv_cheats 1\nr_norefresh 1');assert.ok(await p.evaluate(()=>CoFPreload('c_apartment1')));
 await p.evaluate(files=>{FS.mkdirTree('/rwdir/cryoffear/save');for(const[n,b]of files)FS.writeFile(`/rwdir/cryoffear/save/${n}`,new Uint8Array(b));},reloadFiles);await load('hands_reload');r.coldReloadPending=await weapon();assert.match(r.coldReloadPending,/reload=1 /);assert.ok(+r.coldReloadPending.match(/playernext=([-\d.e+]+)/)[1]>0);
 await wait(async()=>/clip=15 .*reload=0 /.test(await weapon()));r.coldReloaded=await weapon();assert.equal(+r.coldReloaded.match(/ammo=(\d+)/)[1],total-15);assert.match(r.coldReloaded,/dual=1/);
 // Explicit single equip exits dual mode; returning to the phone restores its own right-hand view.
 await cmd(`cof_equip ${slots.weapon_mobile}`);await p.waitForTimeout(2200);r.single=await weapon();assert.match(r.single,/class=weapon_mobile/);assert.match(r.single,/dual=0/);assert.match(await cmd('cof_hands_render'),/on=0/);
 r.modules=await p.evaluate(async()=>{const o={};for(const f of ['server.wasm','client.wasm'])o[f]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',FS.readFile('/lib/'+f))),b=>b.toString(16).padStart(2,'0')).join('');return o;});
 assert.deepEqual(errors,[]);r.passed=true;console.log('PASS phone+blade and phone+Glock: real bag UI, independent toggle/shoot, save/load, no duplicate inventory');
}catch(e){r.passed=false;r.failure=String(e.stack||e);console.error(e);process.exitCode=1;}finally{r.errors=errors;r.chromium=browser.version();fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await ctx.close();await browser.close();}