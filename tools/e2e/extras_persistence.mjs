// Cold profile / in-flight nightvision contract. No natural progression claim.
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(base&&out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),ctx=await b.newContext(),logs=[],errors=[],result={naturalProgression:false};let p,serial=0;
const deployment=async page=>{
 const d=await page.evaluate(async()=>{const text=await(await fetch('sw-manifest.js',{cache:'no-store'})).text();const manifest=JSON.parse(text.match(/=\s*(\{[\s\S]*\});/)[1]);return {manifest:manifest.version,controller:navigator.serviceWorker?.controller?.scriptURL||null};});
 if(process.env.COF_SW==='1')assert.ok(d.controller,'Service Worker must control the actual runtime');
 if(process.env.COF_EXPECT_MANIFEST)assert.equal(d.manifest,process.env.COF_EXPECT_MANIFEST);
 return d;
};
try {
 const attach=async()=>{p=await ctx.newPage();p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));};await attach();
 const wait=async fn=>{const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<60000,'extras persistence timeout');await p.waitForTimeout(25);}};
 const count=()=>logs.filter(l=>l.includes('client connected')).length;
 const cmd=async text=>{const i=logs.length,t=`extra_persist_${++serial}`;await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${t} `),timeout:30000}),p.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${t}`)]);return logs.slice(i).join('\n');};
 const load=async name=>{const n=count();await p.evaluate(n=>CoFDebug.cmd(`load ${n}`),name);await wait(()=>count()>n);await cmd('r_norefresh 1');};
 const map=async name=>{await p.evaluate(n=>CoFPreload(n),name);const n=count();await p.evaluate(n=>CoFDebug.cmd(`map ${n}`),name);await wait(()=>count()>n);await cmd('sv_cheats 1\nr_norefresh 1');};
 const status=()=>cmd('cof_extras_status');
 await p.goto(`${base}?map=c_start&sw=${process.env.COF_SW||'0'}&fx=0&timer=1&prefetch=0&debug=1`);await wait(()=>count()>0);result.deployment=await deployment(p);await cmd('sv_cheats 1\nr_norefresh 1');await p.waitForTimeout(350);
 assert.match(await cmd('cof_count cof_developer_commentary\ncof_count item_nightvision'),/cof_developer_commentary 0[\s\S]*item_nightvision 0/);
 await cmd('save extras_before_unlock');await cmd('cof_extras_unlock 0x1400000');
 await map('c_apartment1');const h=await cmd('cof_list cof_hoodie'),hid=h.match(/cof_hoodie #(\d+)/)?.[1];assert.ok(hid);await cmd(`cof_use #${hid} toggle`);
 assert.match(await status(),/unlocks=20975616/);await p.waitForTimeout(1000);
 await p.close();const n=count();await attach();await p.goto(`${base}?map=c_apartment1&sw=${process.env.COF_SW||'0'}&fx=0&timer=1&prefetch=0&debug=1`);await wait(()=>count()>n);await cmd('sv_cheats 1\nr_norefresh 1');
 result.coldProfile=await status();assert.match(result.coldProfile,/unlocks=20975616/);await p.waitForTimeout(350);assert.match(await cmd('cof_count cof_hoodie'),/cof_hoodie 0/);
 await p.evaluate(()=>CoFPreload('c_start'));await load('extras_before_unlock');result.oldSave=await status();assert.match(result.oldSave,/unlocks=20975616/);
 await map('c_start');
 // Original multiscene1 managers finish normally before testing a player-selected weapon.
 await wait(async()=>{const t=await cmd('cof_camera kamera3');return /state=0 /.test(t)&&+(t.match(/ now=([\d.]+)/)||[])[1]>48;});
 const text=await cmd('cof_list item_nightvision');const m=text.match(/#(\d+) origin=([-\d.]+),([-\d.]+),([-\d.]+)/);assert.ok(m,text);
 await cmd(`cof_unfreeze !player\ncof_goto ${m[2]} ${m[3]} ${+m[4]+12}`);await p.keyboard.down('e');await p.waitForTimeout(150);await p.keyboard.up('e');await wait(async()=>/nightOwned=1/.test(await status()));
 await cmd('cof_give weapon_glock\nweapon_glock');await p.waitForTimeout(1100);await cmd('flashlight');
 let pending;await wait(async()=>{pending=await status();return /nightState=101 .*stored=1/.test(pending);});result.pending=pending;
 result.pendingSave=await cmd('cof_save_debug 1\nsave extras_pending\ncof_extras_status');await load('extras_pending');
 result.pendingAfterLoad=await status();
 // The absolute transition deadline must survive restoration, independently of SDK player timers.
 const deadline=+result.pendingSave.match(/deadline=([-\d.]+)/)?.[1],at=+result.pendingSave.match(/COF\/FENCE \S+ time=([-\d.]+)/)?.[1];
 assert.ok(deadline>at,'holster transition has no persistent deadline');
 await wait(async()=>/nightState=1(?:\s|$)/.test(await status()));await wait(async()=>/class=weapon_glock/.test(await cmd('cof_weapon_status')));
 result.after=await status();
 await p.waitForTimeout(1000);await p.close();const coldConnections=count();await attach();
 await p.goto(`${base}?map=c_game_menu1&sw=${process.env.COF_SW||'0'}&fx=0&timer=1&prefetch=0&debug=1`);await wait(()=>count()>coldConnections);
 await cmd('sv_cheats 1\nr_norefresh 1');await p.evaluate(()=>CoFPreload('c_start'));await load('extras_pending');
 result.coldPending=await status();assert.match(result.coldPending,/nightState=101 .*stored=1/);
 assert.match(await cmd('cof_count multi_manager'),/multi_manager 29/);
 await wait(async()=>/nightState=1(?:\s|$)/.test(await status()));await wait(async()=>/class=weapon_glock/.test(await cmd('cof_weapon_status')));
 result.coldAfter=await status();assert.deepEqual(errors,[]);result.passed=true;console.log('PASS cold unlock profile, old save, nightvision transition deadline and weapon');
}catch(e){result.passed=false;result.failure=String(e.stack||e);console.error(e);process.exitCode=1;}finally{result.errors=errors;result.chromium=b.version();fs.writeFileSync(`${out}/result.json`,JSON.stringify(result,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await ctx.close();await b.close();}