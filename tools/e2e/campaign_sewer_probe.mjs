// c_basement -> c_sewer: c_basement's real exit (trigger_multiple *102 -> trigger_changelevel chsw1, landmark swheh1)
// into c_sewer, carrying the nightstick picked up in c_basement. Records the transition, landmark offset, inventory/ammo carried over, load errors, entities
// that did not spawn, the entry cutscene and save/load. Reaching *102 uses cof_goto and the kit is given with cof_give (fixtures; basement_natural_run.mjs walks it).
// Usage: node campaign_basement_probe.mjs <base url> <new output dir>
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(base&&out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),ctx=await browser.newContext({viewport:{width:800,height:600}}),p=await ctx.newPage(),logs=[],errors=[],r={checks:{}};let serial=0;
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
const wait=async(fn,what,ms=120000)=>{const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<ms,`${what} timeout`);await p.waitForTimeout(250);}};
const cmd=async text=>{const i=logs.length,t=`cb_${++serial}`;await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${t} `),timeout:60000}),p.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${t}`)]);return logs.slice(i).join('\n');};
const origin=t=>{const m=t.match(/origin=([-\d.]+),([-\d.]+),([-\d.]+)/);return m?[+m[1],+m[2],+m[3]]:null;};
const check=(k,v)=>{r.checks[k]=v;};
try{
 await p.goto(`${base}?map=c_basement&sw=0&fx=0&timer=1&debug=1`);await wait(()=>logs.some(l=>l.includes('client connected')),'connect');
 await cmd('sv_cheats 1\nr_norefresh 0\ncof_weapon_debug 1');await wait(()=>logs.some(l=>/COF\/TELEPORT landada/.test(l)),'entry scene teleport',240000);await p.waitForTimeout(2000);
 await p.mouse.click(400,200);await p.waitForFunction(()=>document.pointerLockElement?.id==='canvas');
 await cmd('cof_give weapon_mobile\ncof_give weapon_switchblade\ncof_give weapon_glock\ncof_give weapon_nightstick');await p.waitForTimeout(800);
 await cmd('weapon_nightstick');await p.waitForTimeout(1500);
 r.before={dump:(await cmd('cof_dump')).split('\n').filter(l=>/bag \d+:|COF\/INV|ammo/i.test(l)),weapon:(await cmd('cof_weapon_status')).match(/COF\/WEAPON .*/)?.[0]};
 const lmA=origin(await cmd('cof_inspect swheh1'));r.landmarkSick=lmA;
 // the exit trigger: trigger_multiple with model *102
 const list=await cmd('cof_list trigger_multiple');const row=list.split('\n').find(l=>/model=\*102\b/.test(l));assert.ok(row,'trigger_multiple *102');
 const id=row.match(/#(\d+)/)[1];r.exitTrigger=row.replace(/^\[[^\]]*\]\s*/,'');
 const connects=logs.filter(l=>l.includes('client connected')).length;const mark=logs.length;
 // the change starts as soon as the trigger is touched: no fence (its answer is lost with the old server); the
 // position printed right after the goto, if it makes it, gives the landmark offset
 const gi=logs.length;await p.evaluate(c=>CoFDebug.cmd(c),`cof_goto #${id}\ncof_inspect !player\n`);
 await p.waitForTimeout(800);
 r.playerAtExit=origin(logs.slice(gi).find(l=>/COF\/ENTITY !player/.test(l))||'');
 await wait(()=>logs.filter(l=>l.includes('client connected')).length>connects,'changelevel to c_sewer',180000);
 r.transitionLines=logs.slice(mark).filter(l=>/CHANGE LEVEL|Spawn Server|changelevel|doesn't exist|landmark/i.test(l)).slice(0,12);
 check('arrived c_sewer',logs.slice(mark).some(l=>/Spawn Server:\s*c_sewer/i.test(l)));
 await p.waitForTimeout(3000);await p.screenshot({path:`${out}/00-arrival.png`});
 await cmd('sv_cheats 1');
 r.after={dump:(await cmd('cof_dump')).split('\n').filter(l=>/bag \d+:|COF\/INV|ammo/i.test(l)),weapon:(await cmd('cof_weapon_status')).match(/COF\/WEAPON .*/)?.[0]};
 const lmB=origin(await cmd('cof_inspect swheh1'));r.landmarkBasement=lmB;r.playerArrival=origin(await cmd('cof_inspect !player'));
 if(lmA&&lmB&&r.playerAtExit&&r.playerArrival){r.landmarkOffsetBefore=r.playerAtExit.map((v,i)=>+(v-lmA[i]).toFixed(1));r.landmarkOffsetAfter=r.playerArrival.map((v,i)=>+(v-lmB[i]).toFixed(1));}
 // entities: which original classes exist in the running map
 r.counts={};for(const c of ['monster_sewmo','func_fogfield','func_breakable','inter_door','trigger_checkbrush','tape_recorder','trigger_changelevel','env_model','cof_developer_commentary','rain_settings']){const t=await cmd(`cof_count ${c}`);r.counts[c]=t.match(/COF\/COUNT\s+\S+\s+(\d+)/)?.[1]??t.split('\n').filter(l=>l.includes(c)).slice(-1)[0];}
 r.noSpawn=[...new Set(logs.slice(mark).filter(l=>/No spawn function/i.test(l)).map(l=>l.replace(/^\[[^\]]*\]\s*/,'')))];
 // the nightstick carried in: still in the hand and swinging
 await cmd('cof_weapon_debug 1');let si=logs.length;await p.evaluate(()=>CoFDebug.cmd('+attack\n'));await p.waitForTimeout(400);await p.evaluate(()=>CoFDebug.cmd('-attack\n'));await p.waitForTimeout(1200);
 r.nightstickSwing=logs.slice(si).filter(l=>/COF\/NIGHTSTICK (swing|impact|miss)/.test(l));check('nightstick carried in and swinging',r.nightstickSwing.some(l=>/swing/.test(l)));
 // the first seconds in the sewer
 for(let i=1;i<=3;i++){await p.waitForTimeout(5000);await p.screenshot({path:`${out}/${String(i).padStart(2,'0')}-arrival-${i*5}s.png`});}
 // save / load in the new map
 await cmd('save sewer_probe');const n=logs.filter(l=>l.includes('client connected')).length;
 await p.evaluate(()=>CoFDebug.cmd('load sewer_probe'));await wait(()=>logs.filter(l=>l.includes('client connected')).length>n,'load');
 await p.waitForTimeout(2000);r.afterLoad={map:logs.filter(l=>/Spawn Server:/.test(l)).slice(-1)[0],weapon:(await cmd('cof_weapon_status')).match(/COF\/WEAPON .*/)?.[0]};
 check('load stays in c_sewer',/c_sewer/i.test(r.afterLoad.map||''));check('nightstick still in the hand after load',/weapon_nightstick/.test(r.afterLoad.weapon||''));
 await p.screenshot({path:`${out}/08-after-load.png`});
 r.problems=[...new Set(logs.slice(mark).filter(l=>/can't|cannot|couldn't|could not|not found|missing|unknown|null ent|no sequence|error|failed|doesn't exist/i.test(l)).map(l=>l.replace(/^\[[^\]]*\]\s*/,'')))].slice(0,120);
 r.jsErrors=errors;r.done=true;
}catch(e){r.failure=String(e.stack||e);console.error(e);process.exitCode=1;}finally{r.chromium=browser.version();fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await ctx.close();await browser.close();}
console.log(JSON.stringify({checks:r.checks,counts:r.counts,noSpawn:r.noSpawn,landmark:[r.landmarkOffsetBefore,r.landmarkOffsetAfter],failure:r.failure?.slice(0,200)}));
