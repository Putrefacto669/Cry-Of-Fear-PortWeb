// Dual wield phone + knife/Glock against the original contract (original phone + Glock capture, hl.dll 10031020,
// client.dll 1008c7e0/10066e40): the weapon is mirrored into the left hand at the camera (knife with the p2 set),
// the phone stays the ordinary right-hand view model, both lose the l_ arm.
// Based on Codex's hands_arm_mask.mjs. Real original models and WASM; give/equip helpers isolate the contract.
// Usage: node dual_hands_contract.mjs <base url> <new output dir>
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(base&&out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),ctx=await browser.newContext({viewport:{width:800,height:600},screen:{width:800,height:600}}),p=await ctx.newPage(),logs=[],errors=[],r={};let serial=0;
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
const P2={draw:6,idle:5,holster:7,attacks:[8,18,19]},P1={draw:1,idle:0,fidget:20};
try{
 const wait=async(fn,what='hands state')=>{const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<60000,`${what} timeout`);await p.waitForTimeout(100);}};
 const cmd=async text=>{const i=logs.length,t=`dh_${++serial}`;await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${t} `),timeout:30000}),p.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${t}`)]);return logs.slice(i).join('\n');};
 const weapon=()=>cmd('cof_weapon_status');
 const hands=async()=>{const t=await cmd('cof_hands_render');const m=t.match(/COF\/HANDSCLIENT .*/);assert.ok(m,'hands status line');const l=m[0];
  const n=k=>Number(l.match(new RegExp(`${k}=(-?\\d+)`))?.[1]);return {line:l,on:n('on'),right:n('right'),draws:n('draws'),mirrors:n('mirrors'),masked:n('masked'),maskedview:n('maskedview'),viewseq:n('viewseq'),viewmodel:l.match(/viewmodel=(\S+)/)?.[1]};};
 const shot=async name=>{await p.screenshot({path:`${out}/${name}.png`});};
 const load=async name=>{const n=logs.filter(l=>l.includes('client connected')).length;await p.evaluate(n=>CoFDebug.cmd(`load ${n}`),name);await wait(()=>logs.filter(l=>l.includes('client connected')).length>n,'load');};
 await p.goto(`${base}?map=c_apartment1&sw=0&fx=0&timer=1&prefetch=0&debug=1`);await wait(()=>logs.some(l=>l.includes('client connected')),'connect');
 r.manifest=await p.evaluate(async()=>{const t=await(await fetch('sw-manifest.js',{cache:'no-store'})).text();return JSON.parse(t.match(/=\s*(\{[\s\S]*\});/)[1]).version;});
 await cmd('sv_cheats 1\nr_norefresh 0\ncof_weapon_debug 1');await wait(async()=>/frozen=0 /.test(await cmd('cof_inspect !player')),'unfrozen');
 await p.mouse.click(400,200);await p.waitForFunction(()=>document.pointerLockElement?.id==='canvas');
 await cmd('cof_give weapon_mobile\ncof_give weapon_switchblade\ncof_give weapon_glock');r.bag=await cmd('cof_dump');
 const slots=Object.fromEntries([...r.bag.matchAll(/bag (\d+): (weapon_\w+)/g)].map(m=>[m[2],+m[1]]));assert.equal(Object.keys(slots).length,3);

 // 1. Single knife first: p1 set, no mirror, no filter.
 await cmd(`cof_equip ${slots.weapon_switchblade}`);await wait(async()=>/class=weapon_switchblade/.test(await weapon()),'single knife');await p.waitForTimeout(1500);
 r.singleBefore=await hands();assert.equal(r.singleBefore.on,0);assert.ok([P1.draw,P1.idle,P1.fidget].includes(r.singleBefore.viewseq),`single knife p1, got ${r.singleBefore.viewseq}`);
 await shot('0-single-knife-before');

 // 2. Real inventory DUAL WIELD phone + knife.
 await p.locator('#canvas').focus();await p.keyboard.press('Tab');await p.locator('#cof-bag.on').waitFor();await p.locator(`[data-item="${slots.weapon_mobile}"]`).click();await p.locator('#cof-bag .menu.on [data-act="dual"]').click();await p.locator(`[data-item="${slots.weapon_switchblade}"]`).click();await p.locator('#cof-bag.on').waitFor({state:'hidden'});
 r.dual=await weapon();assert.match(r.dual,/class=weapon_switchblade/);assert.match(r.dual,/dual=1/);
 r.draw=await hands();assert.equal(r.draw.on,1);assert.equal(r.draw.right,1);
 assert.ok([P2.draw,P2.idle].includes(r.draw.viewseq),`dual knife draws with p2draw (6), got ${r.draw.viewseq}`);
 await wait(async()=>(await hands()).viewseq===P2.idle,'p2idle');await p.waitForTimeout(800);
 r.idle=await hands();assert.equal(r.idle.viewseq,P2.idle);assert.match(r.idle.viewmodel,/v_switchblade\.mdl$/);
 assert.ok(r.idle.draws>0 && r.idle.mirrors>0 && r.idle.masked>0,'phone drawn, mirrored, arms filtered');
 // The knife view model is mirrored every frame. It goes through StudioSetUpTransform twice per frame
 // (events and render passes, each rebuilding the matrix), so mirrors is about twice the phone draws;
 // the phone itself is never mirrored (g_drawing guard). First run: dualhands-185210.
 assert.ok(r.idle.mirrors>=r.idle.draws,'knife mirrored every frame');
 await shot('1-dual-idle-sms');

 // 3. Phone light on (right click operates the phone), same pose.
 await cmd('+attack2');await p.waitForTimeout(150);await cmd('-attack2');
 await wait(async()=>/mode=1 light=1 dual=1/.test(await weapon()),'flash mode');await p.waitForTimeout(1500);
 r.flash=await hands();assert.equal(r.flash.viewseq,P2.idle);await shot('2-dual-idle-flash');

 // 4. A/B of the l_ filter in the same runtime and pose.
 await cmd('cof_dual_armmask 0');await p.waitForTimeout(250);r.maskOff=await hands();await shot('3-mask-off');
 await cmd('cof_dual_armmask 1');await p.waitForTimeout(250);r.maskOn=await hands();await shot('4-mask-on');
 assert.ok(r.maskOn.masked>r.maskOff.masked,'filter only counts when enabled');

 // 4b. Mirrored weapon placement (client.dll 1008c7e0): final camera, no view model bob. A/B while
 // standing, walking (bob) and looking down (pitch sign: the knife keeps its place on screen).
 await cmd('cof_dual_extraview 0');await p.waitForTimeout(250);await shot('4b-extraview-old-still');
 await cmd('cof_dual_extraview 1');await p.waitForTimeout(250);await shot('4c-extraview-camera-still');
 for(const v of [0,1]){await cmd(`cof_dual_extraview ${v}`);await cmd('+forward');await p.waitForTimeout(700);await shot(`4d-extraview-${v?"camera":"old"}-walking`);await cmd('-forward');await p.waitForTimeout(400);}
 await cmd('+lookdown');await p.waitForTimeout(350);await cmd('-lookdown');await p.waitForTimeout(300);r.lookDown=await hands();await shot('4e-extraview-camera-lookdown');
 await cmd('+lookup');await p.waitForTimeout(350);await cmd('-lookup');await p.waitForTimeout(300);
 assert.equal(r.lookDown.viewseq,P2.idle);

 // 5. Knife attack in dual uses the p2 attacks (8/18/19).
 await cmd('+attack');await p.waitForTimeout(120);await cmd('-attack');r.attack=await hands();await shot('5-dual-attack');
 assert.ok(P2.attacks.includes(r.attack.viewseq),`dual attack p2 (8/18/19), got ${r.attack.viewseq}`);
 await wait(async()=>(await hands()).viewseq===P2.idle,'idle after attack');

 // 6. Save and load: dual state, p2 and mirror come back.
 await cmd('save dual_hands');await load('dual_hands');
 await wait(async()=>{const h=await hands();return h.on===1 && h.masked>0 && h.draws>0;},'restored hands');
 await wait(async()=>[P2.draw,P2.idle].includes((await hands()).viewseq),'restored p2');await p.waitForTimeout(800);
 r.restored=await hands();assert.match(await weapon(),/dual=1/);await shot('6-restored');

 // 7. Back to the single knife: p1 again, nothing mirrored or filtered any more.
 await cmd(`cof_equip ${slots.weapon_switchblade}`);await wait(async()=>/dual=0/.test(await weapon()),'single again');await p.waitForTimeout(1500);
 r.singleAfter1=await hands();await p.waitForTimeout(400);r.singleAfter2=await hands();
 assert.equal(r.singleAfter1.on,0);
 assert.ok([P1.draw,P1.idle,P1.fidget].includes(r.singleAfter2.viewseq),`single knife back to p1, got ${r.singleAfter2.viewseq}`);
 assert.equal(r.singleAfter1.masked,r.singleAfter2.masked,'no filtering for the single knife');
 assert.equal(r.singleAfter1.mirrors,r.singleAfter2.mirrors,'no mirroring for the single knife');
 await shot('7-single-knife-after');

 // 8. Phone + Glock: the Glock view model (ID 3) also loses the l_ arm (10066e40), sequences unchanged.
 await p.locator('#canvas').focus();await p.keyboard.press('Tab');await p.locator('#cof-bag.on').waitFor();await p.locator(`[data-item="${slots.weapon_mobile}"]`).click();await p.locator('#cof-bag .menu.on [data-act="dual"]').click();await p.locator(`[data-item="${slots.weapon_glock}"]`).click();await p.locator('#cof-bag.on').waitFor({state:'hidden'});
 await wait(async()=>/class=weapon_glock/.test(await weapon()),'glock dual');await p.waitForTimeout(2000);
 r.glock=await hands();assert.equal(r.glock.on,1);assert.equal(r.glock.right,2);assert.match(r.glock.viewmodel,/v_glock\.mdl$/);
 await cmd('cof_dual_armmask 0');await p.waitForTimeout(250);r.glockOff=await hands();await shot('8-glock-mask-off');
 await cmd('cof_dual_armmask 1');await p.waitForTimeout(250);r.glockOn=await hands();await shot('9-glock-mask-on');
 // maskedview counts only the view model (the Glock here), apart from the phone.
 await cmd('cof_dual_armmask 0');let a=await hands();await p.waitForTimeout(500);let b=await hands();r.glockViewOff=b.maskedview-a.maskedview;
 await cmd('cof_dual_armmask 1');a=await hands();await p.waitForTimeout(500);b=await hands();r.glockViewOn=b.maskedview-a.maskedview;
 assert.equal(r.glockViewOff,0,'nothing filtered with the mask off');
 assert.ok(r.glockViewOn>0,'Glock view model loses the l_ arm with the mask on');
 assert.ok(r.idle.maskedview>0 && r.idle.maskedview<r.idle.masked,'knife and phone both filtered');

 r.modules=await p.evaluate(async()=>{const o={};for(const f of ['client.wasm','server.wasm'])o[f]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',FS.readFile('/lib/'+f))),b=>b.toString(16).padStart(2,'0')).join('');return o;});
 assert.deepEqual(errors,[]);r.passed=true;console.log('PASS dual hands contract: mirrored p2 knife at the camera, unmirrored phone, l_ filter A/B (knife, Glock), p2 attack, save/load, single knife p1');
}catch(e){r.passed=false;r.failure=String(e.stack||e);console.error(e);process.exitCode=1;}finally{r.errors=errors;r.chromium=browser.version();fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await ctx.close();await browser.close();}
