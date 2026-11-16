// c_basement: monster_crab (hl.dll CCrab, the crawling slower). Checks:
// - the map's four crabs spawn (no "No spawn function", no missing activity), with their body variants;
// - skill 1 health 20 (sk_krypande_health1);
// - left near one, a crab notices the player and its slash takes sk_krypande_dmg_one_slash1 (2) of health;
// - the nightstick (11) kills it in two hits, crouched next to it;
// - the scripted fence scene (multi_manager fisteehslwo) makes the three monstermakers spawn a crab each;
// - save/load keeps the living crabs.
// Reaching the crabs uses cof_goto and the fence scene is fired with cof_fire: fixtures, not a natural run.
// Usage: node basement_crab_probe.mjs <base url> <new output dir>
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(base&&out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),ctx=await browser.newContext({viewport:{width:800,height:600}}),p=await ctx.newPage(),logs=[],errors=[],r={checks:{}};let serial=0;
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
const wait=async(fn,what,ms=120000)=>{const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<ms,`${what} timeout`);await p.waitForTimeout(250);}};
const cmd=async text=>{const i=logs.length,t=`cr_${++serial}`;await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${t} `),timeout:60000}),p.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${t}`)]);return logs.slice(i).join('\n');};
const check=(k,v)=>{r.checks[k]=v;};
const strip=l=>l.replace(/^\[[^\]]*\]\s*/,'');
const since=(i,re)=>logs.slice(i).filter(l=>re.test(l)).map(strip);
const field=(l,k)=>(l.match(new RegExp(`\\b${k}=(\\S+)`))||[])[1];
const crabs=async()=>(await cmd('cof_list monster_crab')).split('\n').filter(l=>/COF\/LIST monster_crab #/.test(l)).map(l=>({id:l.match(/#(\d+)/)[1],origin:field(l,'origin').split(',').map(Number)}));
const inspect=async id=>(await cmd(`cof_inspect #${id}`)).split('\n').find(l=>/COF\/ENTITY/.test(l))||'';
const playerHealth=async()=>+field((await cmd('cof_weapon_status')).match(/COF\/WEAPON .*/)?.[0]||'','health');
const hold=async ms=>{const i=logs.length;await p.evaluate(()=>CoFDebug.cmd('+attack\n'));await p.waitForTimeout(ms);await p.evaluate(()=>CoFDebug.cmd('-attack\n'));await p.waitForTimeout(1000);return since(i,/COF\/NIGHTSTICK (impact|miss)/);};
try{
 await p.goto(`${base}?map=c_basement&sw=0&fx=0&timer=1&debug=1`);await wait(()=>logs.some(l=>l.includes('client connected')),'connect');
 await cmd('sv_cheats 1\nr_norefresh 0\ncof_weapon_debug 1');
 await wait(()=>logs.some(l=>/COF\/TELEPORT landada/.test(l)),'entry scene teleport',240000);await p.waitForTimeout(3000);
 await p.mouse.click(400,200);await p.waitForFunction(()=>document.pointerLockElement?.id==='canvas');
 r.noSpawn=logs.filter(l=>/No spawn function.*crab|crab.*No spawn/i.test(l)).map(strip);check('monster_crab spawns',r.noSpawn.length===0);
 r.noSequence=[...new Set(logs.filter(l=>/has no sequence for act/i.test(l)).map(strip))];check('no missing activity',r.noSequence.length===0);
 const list=await crabs();r.crabs=list;check('four crabs in the map',list.length===4);
 r.inspect=[];for(const c of list)r.inspect.push(await inspect(c.id));
 r.bodies=r.inspect.map(l=>+field(l,'body'));r.health=r.inspect.map(l=>+field(l,'health'));
 check('body variants of the map (2,1,0,1)',JSON.stringify([...r.bodies].sort())===JSON.stringify([0,1,1,2]));
 check('health 20 at skill 1',r.health.every(h=>h===20));
 // left near the crab of the corridor (-1169,1225,424): it comes and slashes
 const target=list.reduce((a,b)=>Math.hypot(a.origin[0]+1169,a.origin[1]-1225)<Math.hypot(b.origin[0]+1169,b.origin[1]-1225)?a:b);r.target=target;
 const h0=await playerHealth();r.healthBefore=h0;
 // in front of it: the BSP gives this crab yaw 180 (looking to -x) and a field of view of 0.5
 await cmd(`cof_goto ${target.origin[0]-120} ${target.origin[1]} ${target.origin[2]+37}`);
 let hurt=false;const t0=Date.now();while(Date.now()-t0<40000){await p.waitForTimeout(1000);const h=await playerHealth();if(h<h0){hurt=true;r.healthAfter=h;r.hurtAfterSeconds=(Date.now()-t0)/1000;break;}}
 r.crabMoved=await inspect(target.id);
 check('the crab attacks the player',hurt);
 check('slash damage 2 (sk_krypande_dmg_one_slash1)',hurt&&(h0-r.healthAfter)%2===0&&h0-r.healthAfter>=2);
 await p.screenshot({path:`${out}/01-crab-attack.png`});
 // the nightstick against it, crouched (the crab is 36 units high)
 await cmd('god\ncof_give weapon_nightstick');await p.waitForTimeout(500);await cmd('weapon_nightstick');await p.waitForTimeout(1500);
 await p.evaluate(()=>CoFDebug.cmd('+duck\n'));await p.waitForTimeout(700);
 const hits=[];
 for(let k=0;k<6&&!r.killed;k++){
  const o=(await inspect(target.id)).match(/origin=([-\d.]+),([-\d.]+),([-\d.]+)/).slice(1).map(Number);
  await cmd(`cof_goto ${o[0]+22} ${o[1]} ${o[2]+19}\ncof_face #${target.id}`);await p.waitForTimeout(300);
  hits.push(...await hold(300));
  const st=await inspect(target.id);if(+field(st,'dead')>0)r.killed=st;
 }
 await p.evaluate(()=>CoFDebug.cmd('-duck\n'));
 r.nightstickHits=hits;const onCrab=hits.filter(l=>/impact target=monster_crab/.test(l));
 check('nightstick hits the crab for 11',onCrab.length>=1&&onCrab.every(l=>+field(l,'damage')===11));
 check('two hits kill it',!!r.killed&&onCrab.length===2);
 await p.waitForTimeout(2500);await p.screenshot({path:`${out}/02-crab-dead.png`});
 // the fence scene: three monstermakers, one crab each
 const before=(await crabs()).length;let i=logs.length;await cmd('cof_fire fisteehslwo');await p.waitForTimeout(5000);
 const afterList=await crabs();r.fenceCrabs=afterList.length-before;check('fence scene spawns three crabs',r.fenceCrabs===3);
 r.makerErrors=since(i,/monstermaker|can't|cannot|failed/i);
 // save / load
 const living=[];for(const c of afterList){const l=await inspect(c.id);if(+field(l,'dead')===0)living.push(c.id);}r.livingBeforeSave=living.length;
 await cmd('save crab_probe');const n=logs.filter(l=>l.includes('client connected')).length;
 await p.evaluate(()=>CoFDebug.cmd('load crab_probe'));await wait(()=>logs.filter(l=>l.includes('client connected')).length>n,'load');
 await p.waitForTimeout(2500);await cmd('sv_cheats 1');
 const reloaded=await crabs();let alive=0;for(const c of reloaded){const l=await inspect(c.id);if(+field(l,'dead')===0)alive++;}r.livingAfterLoad=alive;
 check('living crabs kept by save/load',alive===living.length);
 await p.screenshot({path:`${out}/03-after-load.png`});
 r.problems=[...new Set(logs.filter(l=>/crab|slower2|slower\//i.test(l)&&/can't|cannot|couldn't|could not|not found|missing|unknown|error|failed/i.test(l)).map(strip))];
 check('no crab load errors',r.problems.length===0);
 r.jsErrors=errors;check('no JS errors',errors.length===0);r.done=true;
}catch(e){r.failure=String(e.stack||e);console.error(e);process.exitCode=1;}finally{r.chromium=browser.version();fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await ctx.close();await browser.close();}
console.log(JSON.stringify({checks:r.checks,health:r.health,bodies:r.bodies,hurt:[r.healthBefore,r.healthAfter,r.hurtAfterSeconds],fence:r.fenceCrabs,failure:r.failure?.slice(0,300)}));
