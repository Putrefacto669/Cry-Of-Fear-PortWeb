// Ladders of c_start (cof_ladder_manager nerdclimb2/3/4) against the original contract (hl.dll
// CCoFLadderManager 1004fb50/1004ed40/1004f470/1004f780, client.dll AttachCam 1006f890/1008cee0):
// using the bottom area starts the ladder_climb.mdl camera, W climbs step by step, the view sits on the
// model's attachments, the climb ends on topent unfrozen; from the top, S climbs down to bottoment;
// a save during the climb loads with the player free. Usage: node ladder_climb.mjs <base url> <new output dir> [ladder]
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out,ladder='nerdclimb3']=process.argv.slice(2);assert.ok(base&&out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),ctx=await browser.newContext({viewport:{width:800,height:600}}),p=await ctx.newPage(),logs=[],errors=[],r={ladder,steps:[]};let serial=0,shots=0;
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
try{
 const wait=async(fn,what,ms=60000)=>{const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<ms,`${what} timeout`);await p.waitForTimeout(150);}};
 const cmd=async text=>{const i=logs.length,t=`ld_${++serial}`;await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${t} `),timeout:30000}),p.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${t}`)]);return logs.slice(i).join('\n');};
 const ent=async name=>{const t=await cmd(`cof_inspect ${name}`);const m=t.match(/COF\/ENTITY \S+ class=(\S+) .*?origin=([-\d.]+),([-\d.]+),([-\d.]+) gate=(-?\d+) .*?frozen=(\d+)/);assert.ok(m,`inspect ${name}`);return {cls:m[1],origin:[+m[2],+m[3],+m[4]],gate:+m[5],frozen:+m[6]};};
 const view=async()=>{const t=await cmd('cof_ladder_view');const m=t.match(/COF\/LADDERCLIENT cam=(\d+) model=(\S+) seq=(-?\d+) views=(\d+) captures=(\d+) setups=(\d+) recoveries=(\d+) org=(\S+) angles=(\S+)/);assert.ok(m,'ladder view status');return {cam:+m[1],model:m[2],seq:+m[3],views:+m[4],captures:+m[5],setups:+m[6],recoveries:+m[7],org:m[8].split(',').map(Number),angles:m[9].split(',').map(Number)};};
 const shot=async label=>{await p.screenshot({path:`${out}/${String(++shots).padStart(2,'0')}-${label}.png`});};
 const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
 await p.goto(`${base}?map=c_start&sw=0&fx=0&timer=1&prefetch=0&debug=1`);await wait(()=>logs.some(l=>l.includes('client connected')),'connect');
 await cmd('sv_cheats 1\nr_norefresh 0');await wait(async()=>/frozen=0 /.test(await cmd('cof_inspect !player')),'unfrozen');
 await p.mouse.click(400,200);await p.waitForFunction(()=>document.pointerLockElement?.id==='canvas');
 // the use areas of this ladder: iuser1 ("gate") 0 at the bottom, 1 at the top
 const list=await cmd('cof_list cof_ladder_manager_use');const ids=[...list.matchAll(/COF\/LIST cof_ladder_manager_use #(\d+)/g)].map(m=>+m[1]);
 r.list=list.split('\n').filter(l=>/ladder/.test(l));
 const areas=[];for(const id of [...new Set(ids)]){const e=await ent(`#${id}`);const t=(await cmd(`cof_inspect #${id}`)).match(/target=(\S*)/)?.[1];if(t===ladder)areas.push({id,...e});}
 r.areas=areas;const bottom=areas.find(a=>a.gate===0),top=areas.find(a=>a.gate===1);assert.ok(bottom&&top,'both use areas of '+ladder);
 const topEnt=await ent(ladder.replace('nerdclimb','nerd')+'exittop'),bottomEnt=await ent(ladder.replace('nerdclimb','nerd')+'exitbot');r.topEnt=topEnt;r.bottomEnt=bottomEnt;

 // 1. up: bottom area, then W until the climb ends
 await cmd(`cof_goto #${bottom.id}`);await p.waitForTimeout(1500);await shot('bottom');
 await cmd(`cof_usemodel #${bottom.id}`);await p.waitForTimeout(400);
 let v=await view();r.steps.push({at:'started up',v});assert.ok(v.cam>0,'AttachCam sent');assert.match(v.model,/ladder_climb\.mdl$/);
 // held still (MOVETYPE_NONE: Xash drops the buttons of FL_FROZEN clients, and W/S drive the climb)
 let pl=await ent('!player');r.startPos=pl.origin;
 await p.waitForTimeout(600);v=await view();assert.ok(v.views>0,'view taken from the camera attachments');await shot('up-start');
 await cmd('+forward');
 // W is released once the final animation plays (it needs no more input), so the player does not walk on at the top
 let held=true;
 for(let i=0;i<40;i++){await p.waitForTimeout(500);v=await view();r.steps.push({at:`up t+${(i+1)*0.5}`,v:{cam:v.cam,seq:v.seq,captures:v.captures,setups:v.setups,recoveries:v.recoveries,org:v.org}});if(i%3===1)await shot(`up-${i}`);
  if(i===1&&v.cam){const mid=await ent('!player');r.midPos=mid.origin;assert.ok(dist(mid.origin,r.startPos)<1,'player held still while W climbs');}
  if(held&&v.cam&&![0,1].includes(v.seq)){await cmd('-forward');held=false;r.releasedAt=v.seq;}
  if(!v.cam)break;}
 if(held)await cmd('-forward');assert.equal(v.cam,0,'climb up finished');await p.waitForTimeout(800);
 pl=await ent('!player');r.afterUp=pl;assert.equal(pl.frozen,0,'unfrozen at the top');
 assert.ok(dist(pl.origin,[topEnt.origin[0],topEnt.origin[1],topEnt.origin[2]+37])<40,`player on topent: ${pl.origin} vs ${topEnt.origin}`);await shot('top');

 // 2. down: top area, then S until the climb ends
 await cmd(`cof_goto #${top.id}`);await p.waitForTimeout(1500);
 await cmd(`cof_usemodel #${top.id}`);await p.waitForTimeout(600);v=await view();assert.ok(v.cam>0,'down camera');await shot('down-start');
 await cmd('+back');
 held=true;
 for(let i=0;i<40;i++){await p.waitForTimeout(500);v=await view();r.steps.push({at:`down t+${(i+1)*0.5}`,v:{cam:v.cam,seq:v.seq,captures:v.captures,setups:v.setups,recoveries:v.recoveries,org:v.org}});if(i%3===1)await shot(`down-${i}`);
  // 9 climb_end_down, 10 climb_end_sewer2_2_down (ladder_climb.mdl): the descent's last animation
  if(held&&v.cam&&[9,10].includes(v.seq)){await cmd('-back');held=false;}
  if(!v.cam)break;}
 if(held)await cmd('-back');assert.equal(v.cam,0,'climb down finished');await p.waitForTimeout(800);
 // the camera must keep being sent and drawn all the way (its PVS follows it): captures keep growing
 const live=r.steps.filter(s=>s.v.cam>0&&s.v.captures!==undefined);
 // (over any 1 s window: under SwiftShader some areas run at ~4 fps, so a 0.5 s sample may hold 2 frames)
 for(let i=2;i<live.length;i++)if(live[i].at.split(' ')[0]===live[i-2].at.split(' ')[0])assert.ok(live[i].v.captures>live[i-2].v.captures,`camera drawn by ${live[i].at}`);
 pl=await ent('!player');r.afterDown=pl;assert.equal(pl.frozen,0,'unfrozen at the bottom');
 assert.ok(dist(pl.origin,[bottomEnt.origin[0],bottomEnt.origin[1],bottomEnt.origin[2]+37])<40,`player on bottoment: ${pl.origin} vs ${bottomEnt.origin}`);await shot('bottom-again');

 // 3. save in the middle of a climb, load: the player must not stay frozen or attached
 await cmd(`cof_goto #${bottom.id}`);await p.waitForTimeout(1500);await cmd(`cof_usemodel #${bottom.id}`);await p.waitForTimeout(800);
 assert.ok((await view()).cam>0);await cmd('save ladder_mid');
 const n=logs.filter(l=>l.includes('client connected')).length;await p.evaluate(()=>CoFDebug.cmd('load ladder_mid'));await wait(()=>logs.filter(l=>l.includes('client connected')).length>n,'load');
 await p.waitForTimeout(2500);v=await view();pl=await ent('!player');r.afterLoad={v,pl};assert.equal(v.cam,0,'no camera after load');assert.equal(pl.frozen,0,'free after load');await shot('after-load');

 assert.deepEqual(errors,[]);r.passed=true;console.log(`PASS ${ladder}: climb up with W to topent, down with S to bottoment, camera on ladder_climb attachments, save/load frees the player`);
}catch(e){r.passed=false;r.failure=String(e.stack||e);console.error(e);process.exitCode=1;}finally{r.errors=errors;r.chromium=browser.version();fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await ctx.close();await browser.close();}
