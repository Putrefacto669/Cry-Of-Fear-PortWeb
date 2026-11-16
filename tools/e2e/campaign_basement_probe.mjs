// Chapter 1 -> 2: c_apartmentsick's real exit (trigger_once *227 -> trigger_changelevel changekuk, landmark landkuk)
// into c_basement. Records the transition, landmark offset, inventory/ammo carried over, load errors, entities
// that did not spawn, the entry cutscene and save/load. Reaching *227 uses cof_goto (a fixture, not a natural run).
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
 await p.goto(`${base}?map=c_apartmentsick&sw=0&fx=0&timer=1&debug=1`);await wait(()=>logs.some(l=>l.includes('client connected')),'connect');
 await cmd('sv_cheats 1\nr_norefresh 0\ncof_weapon_debug 1');await wait(async()=>/frozen=0 /.test(await cmd('cof_inspect !player')),'unfrozen');
 await p.mouse.click(400,200);await p.waitForFunction(()=>document.pointerLockElement?.id==='canvas');
 await cmd('cof_give weapon_mobile\ncof_give weapon_switchblade\ncof_give weapon_glock');await p.waitForTimeout(500);
 r.before={dump:(await cmd('cof_dump')).split('\n').filter(l=>/bag \d+:|COF\/INV|ammo/i.test(l)),weapon:(await cmd('cof_weapon_status')).match(/COF\/WEAPON .*/)?.[0]};
 const lmA=origin(await cmd('cof_inspect landkuk'));r.landmarkSick=lmA;
 // the exit trigger: trigger_once with model *227
 const list=await cmd('cof_list trigger_once');const row=list.split('\n').find(l=>/model=\*227\b/.test(l));assert.ok(row,'trigger_once *227');
 const id=row.match(/#(\d+)/)[1];r.exitTrigger=row.replace(/^\[[^\]]*\]\s*/,'');
 const connects=logs.filter(l=>l.includes('client connected')).length;const mark=logs.length;
 await cmd(`cof_goto #${id}`);
 r.playerAtExit=origin(await cmd('cof_inspect !player'));
 await wait(()=>logs.filter(l=>l.includes('client connected')).length>connects,'changelevel to c_basement',180000);
 r.transitionLines=logs.slice(mark).filter(l=>/CHANGE LEVEL|Spawn Server|changelevel|doesn't exist|landmark/i.test(l)).slice(0,12);
 check('arrived c_basement',logs.slice(mark).some(l=>/Spawn Server:\s*c_basement/i.test(l)));
 await p.waitForTimeout(3000);await p.screenshot({path:`${out}/00-arrival.png`});
 await cmd('sv_cheats 1');
 r.after={dump:(await cmd('cof_dump')).split('\n').filter(l=>/bag \d+:|COF\/INV|ammo/i.test(l)),weapon:(await cmd('cof_weapon_status')).match(/COF\/WEAPON .*/)?.[0]};
 const lmB=origin(await cmd('cof_inspect landkuk'));r.landmarkBasement=lmB;r.playerArrival=origin(await cmd('cof_inspect !player'));
 if(lmA&&lmB&&r.playerAtExit&&r.playerArrival){r.landmarkOffsetBefore=r.playerAtExit.map((v,i)=>+(v-lmA[i]).toFixed(1));r.landmarkOffsetAfter=r.playerArrival.map((v,i)=>+(v-lmB[i]).toFixed(1));}
 // entities: which original classes exist in the running map
 r.counts={};for(const c of ['monster_crab','monstermaker','weapon_nightstick','cof_phonecall','cof_phonecheck','cof_keypad4','cof_keypad','cof_addcodenote','cof_document','cof_ladder_manager','cof_teleport','cof_chapter','trigger_changelevel','cof_interdooronoff','cof_hint']){const t=await cmd(`cof_count ${c}`);r.counts[c]=t.match(/COF\/COUNT\s+\S+\s+(\d+)/)?.[1]??t.split('\n').filter(l=>l.includes(c)).slice(-1)[0];}
 // the entry cutscene (multiirlap -> multibass1, chapter title at 52 s): screenshots
 for(let i=1;i<=7;i++){await p.waitForTimeout(9000);await p.screenshot({path:`${out}/${String(i).padStart(2,'0')}-entry-${i*9}s.png`});}
 r.chapter=logs.slice(mark).filter(l=>/Chapter 2|CHAPTER|Who is that doctor/i.test(l)).slice(0,4);
 // save / load in the new map
 await cmd('save basement_probe');const n=logs.filter(l=>l.includes('client connected')).length;
 await p.evaluate(()=>CoFDebug.cmd('load basement_probe'));await wait(()=>logs.filter(l=>l.includes('client connected')).length>n,'load');
 await p.waitForTimeout(2000);r.afterLoad={map:logs.filter(l=>/Spawn Server:/.test(l)).slice(-1)[0],weapon:(await cmd('cof_weapon_status')).match(/COF\/WEAPON .*/)?.[0]};
 check('load stays in c_basement',/c_basement/i.test(r.afterLoad.map||''));
 await p.screenshot({path:`${out}/08-after-load.png`});
 r.problems=[...new Set(logs.slice(mark).filter(l=>/can't|cannot|couldn't|could not|not found|missing|unknown|null ent|no sequence|error|failed|doesn't exist/i.test(l)).map(l=>l.replace(/^\[[^\]]*\]\s*/,'')))].slice(0,120);
 r.jsErrors=errors;r.done=true;
}catch(e){r.failure=String(e.stack||e);console.error(e);process.exitCode=1;}finally{r.chromium=browser.version();fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await ctx.close();await browser.close();}
console.log(JSON.stringify({checks:r.checks,counts:r.counts,landmark:[r.landmarkOffsetBefore,r.landmarkOffsetAfter],failure:r.failure?.slice(0,200)}));
