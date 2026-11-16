// c_basement: weapon_nightstick (hl.dll CNightstick + CBasePlayer::MeleeHitThinkNightStick2). Picks up the map's own
// nightstick by walking onto it (cof_goto: a fixture), selects it and checks:
// - it spawned (no "No spawn function"), skill sk_cof_nightstick is known, the bag gets weapon_nightstick.txt;
// - holding the attack swings once per second, the hit comes 0.31 s after each swing, each hit kicks the view;
// - crouched and looking at the floor the hit lands on the world; save/load keeps it in the hand.
// The hit on a monster is not checked here: c_basement has no other monster than monster_crab (not ported yet).
// Usage: node basement_nightstick_probe.mjs <base url> <new output dir>
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(base&&out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),ctx=await browser.newContext({viewport:{width:800,height:600}}),p=await ctx.newPage(),logs=[],errors=[],r={checks:{}};let serial=0;
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
const wait=async(fn,what,ms=120000)=>{const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<ms,`${what} timeout`);await p.waitForTimeout(250);}};
const cmd=async text=>{const i=logs.length,t=`ns_${++serial}`;await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${t} `),timeout:60000}),p.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${t}`)]);return logs.slice(i).join('\n');};
const check=(k,v)=>{r.checks[k]=v;};
const strip=l=>l.replace(/^\[[^\]]*\]\s*/,'');
const since=(i,re)=>logs.slice(i).filter(l=>re.test(l)).map(strip);
const num=(l,k)=>+(l.match(new RegExp(`${k}=([-\\d.]+)`))||[])[1];
const weapon=async()=>(await cmd('cof_weapon_status')).match(/COF\/WEAPON class=(\S+)/)?.[1];
// hold the attack for ms and return the swings and hits it produced
// (a console line runs only once it ends with a newline)
const hold=async ms=>{const i=logs.length;await p.evaluate(()=>CoFDebug.cmd('+attack\n'));await p.waitForTimeout(ms);await p.evaluate(()=>CoFDebug.cmd('-attack\n'));await p.waitForTimeout(1200);
 return {swings:since(i,/COF\/NIGHTSTICK swing/),hits:since(i,/COF\/NIGHTSTICK (impact|miss)/),kicks:since(i,/COF\/NIGHTSTICK kick/)};};
try{
 await p.goto(`${base}?map=c_basement&sw=0&fx=0&timer=1&debug=1`);await wait(()=>logs.some(l=>l.includes('client connected')),'connect');
 await cmd('sv_cheats 1\nr_norefresh 0\ncof_weapon_debug 1');
 await wait(async()=>/frozen=0 /.test(await cmd('cof_inspect !player')),'unfrozen',240000);
 // the entry scene keeps its cameras until it teleports the player (cof_teleport landada, ~65 s)
 await wait(()=>logs.some(l=>/COF\/TELEPORT landada/.test(l)),'entry scene teleport',240000);await p.waitForTimeout(3000);
 await p.mouse.click(400,200);await p.waitForFunction(()=>document.pointerLockElement?.id==='canvas');
 r.noSpawnFunction=logs.filter(l=>/No spawn function.*nightstick|nightstick.*No spawn/i.test(l)).map(strip);
 check('weapon_nightstick spawns',r.noSpawnFunction.length===0);
 r.unknownSkill=logs.filter(l=>/Unknown command "sk_cof_nightstick/.test(l)).map(strip);
 check('sk_cof_nightstick registered',r.unknownSkill.length===0);
 const row=(await cmd('cof_list weapon_nightstick')).split('\n').find(l=>/COF\/LIST weapon_nightstick #/.test(l));assert.ok(row,'weapon_nightstick in the map');
 r.weaponRow=strip(row);const id=row.match(/#(\d+)/)[1];
 // walk onto it: the weapon's own touch puts it in the bag
 let i=logs.length;await cmd(`cof_goto #${id}`);await wait(()=>logs.slice(i).some(l=>/COF\/HUD PICKUP .*weapon_nightstick/.test(l)),'pickup',20000);
 await p.waitForTimeout(1000);r.pickup=since(i,/COF\/HUD (PICKUP|INV|QUICK)/);check('picked up into the bag',r.pickup.some(l=>/PICKUP inventoryitems\/weapons\/weapon_nightstick\.txt/.test(l)));
 check('quick select has it',r.pickup.some(l=>/COF\/HUD QUICK .*weapon_nightstick/.test(l)));
 await cmd('weapon_nightstick');await p.waitForTimeout(1500);r.active=await weapon();check('nightstick in the hand',r.active==='weapon_nightstick');
 await p.screenshot({path:`${out}/01-deployed.png`});
 // 2.6 s of attack held: swings at 0, 1 and 2 s; each hit 0.31 s after its swing
 const a=await hold(2600);r.held=a;
 const sw=a.swings.map(l=>num(l,'now')),imp=a.swings.map(l=>num(l,'impact')),hitT=a.hits.map(l=>num(l,'time'));
 r.swingGaps=sw.slice(1).map((t,k)=>+(t-sw[k]).toFixed(3));r.hitDelays=hitT.map((t,k)=>+(t-sw[k]).toFixed(3));
 check('one swing per second while held',sw.length===3&&r.swingGaps.every(g=>g>=0.99&&g<=1.15));
 check('every swing has its hit',a.hits.length===sw.length);
 check('hit 0.31 s after the swing',r.hitDelays.every(d=>d>=0.30&&d<=0.40)&&imp.every((t,k)=>Math.abs(t-sw[k]-0.31)<0.001));
 check('view kick on every hit',a.kicks.length===sw.length);
 r.firstKick=a.kicks[0];
 // crouched, looking at the floor: the 32-unit line reaches it (eye ~30 units over the floor when ducked)
 // +duck and +lookdown are the engine's own commands (crouch; pitch down to cl_pitchdown)
 await p.evaluate(()=>CoFDebug.cmd('+duck\n+lookdown\n'));await p.waitForTimeout(2500);await p.evaluate(()=>CoFDebug.cmd('-lookdown\n'));
 await p.waitForTimeout(500);await p.screenshot({path:`${out}/02-floor.png`});
 const f=await hold(400);r.floor=f;await p.evaluate(()=>CoFDebug.cmd('-duck\n'));
 check('floor hit lands on the world',f.hits.some(l=>/impact target=world/.test(l)));
 r.floorSounds=since(0,/nightstick_hit/).slice(-3);
 // save / load with the nightstick in the hand
 await cmd('save nightstick_probe');const n=logs.filter(l=>l.includes('client connected')).length;
 await p.evaluate(()=>CoFDebug.cmd('load nightstick_probe'));await wait(()=>logs.filter(l=>l.includes('client connected')).length>n,'load');
 await p.waitForTimeout(2500);await cmd('sv_cheats 1\ncof_weapon_debug 1');
 r.afterLoad=await weapon();check('still in the hand after load',r.afterLoad==='weapon_nightstick');
 const b=await hold(400);check('swings after load',b.swings.length===1&&b.hits.length===1);r.afterLoadSwing=b;
 await p.screenshot({path:`${out}/03-after-load.png`});
 r.problems=[...new Set(logs.filter(l=>/nightstick/i.test(l)&&/can't|cannot|couldn't|could not|not found|missing|unknown|error|failed/i.test(l)).map(strip))];
 check('no nightstick load errors',r.problems.length===0);
 r.jsErrors=errors;check('no JS errors',errors.length===0);r.done=true;
}catch(e){r.failure=String(e.stack||e);console.error(e);process.exitCode=1;}finally{r.chromium=browser.version();fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await ctx.close();await browser.close();}
console.log(JSON.stringify({checks:r.checks,gaps:r.swingGaps,delays:r.hitDelays,failure:r.failure?.slice(0,300)}));
