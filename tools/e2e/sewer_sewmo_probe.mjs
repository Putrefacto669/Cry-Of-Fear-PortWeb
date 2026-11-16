// c_sewer: monster_sewmo (hl.dll CSewmo). All nine of the map have spawnflag 32: they wait in "appearidle", not yet
// monsters (no AI, not damageable), and rise ("appear", sewmo/out_water.wav) when a player is within 128 units,
// becoming monsters 0.8 s later (InactiveThink 10058b30 / ActivateSewmo 10058600). Checks:
// - the nine spawn dormant: sequence appearidle, takedamage 0, health 40 (sk_sewmo_health1);
// - at 250 units one stays dormant; at 100 it plays "appear", then takes damage and attacks for 4 (dmg_one_slash1);
// - the nightstick (11) kills it in four hits;
// - a dormant one stays dormant through save/load, and still rises afterwards.
// The player is placed with cof_goto at spots tools/bsp_walk.py found standable (fixtures).
// Usage: node sewer_sewmo_probe.mjs <base url> <out>
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(base&&out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),ctx=await browser.newContext({viewport:{width:800,height:600}}),p=await ctx.newPage(),logs=[],errors=[],r={checks:{}};let serial=0,shots=0;
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
const wait=async(fn,what,ms=120000)=>{const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<ms,`${what} timeout`);await p.waitForTimeout(200);}};
const cmd=async text=>{const i=logs.length,t=`sw_${++serial}`;await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${t} `),timeout:60000}),p.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${t}`)]);return logs.slice(i).join('\n');};
const check=(k,v)=>{r.checks[k]=v;console.log(JSON.stringify({k,v}));};
const field=(l,k)=>(l.match(new RegExp(`\\b${k}=(\\S+)`))||[])[1];
const shot=async label=>{await p.screenshot({path:`${out}/${String(++shots).padStart(2,'0')}-${label}.png`});};
const state=async id=>{const l=(await cmd(`cof_inspect #${id}`)).split('\n').find(x=>/COF\/ENTITY/.test(x))||'';return {seq:+field(l,'seq'),dmg:+field(l,'takedamage'),hp:+field(l,'health'),dead:+field(l,'dead'),o:(field(l,'origin')||'0,0,0').split(',').map(Number)};};
const health=async()=>+field((await cmd('cof_weapon_status')).match(/COF\/WEAPON .*/)?.[0]||'','health');
const sewmos=async()=>(await cmd('cof_list monster_sewmo')).split('\n').filter(l=>/COF\/LIST monster_sewmo #/.test(l)).map(l=>({id:l.match(/#(\d+)/)[1],o:field(l,'origin').split(',').map(Number)}));
const near=(list,x,y)=>list.reduce((a,b)=>Math.hypot(a.o[0]-x,a.o[1]-y)<Math.hypot(b.o[0]-x,b.o[1]-y)?a:b);
try{
 await p.goto(`${base}?map=c_sewer&sw=0&fx=0&timer=1&debug=1`);await wait(()=>logs.some(l=>l.includes('client connected')),'connect');
 await cmd('sv_cheats 1\nr_norefresh 0\ncof_weapon_debug 1');await p.waitForTimeout(3000);
 await p.mouse.click(400,200);await p.waitForFunction(()=>document.pointerLockElement?.id==='canvas');
 r.noSpawn=[...new Set(logs.filter(l=>/No spawn function/i.test(l)).map(l=>l.replace(/^\[[^\]]*\]\s*/,'')))];
 check('monster_sewmo spawns',!r.noSpawn.some(l=>/monster_sewmo/.test(l)));
 const list=await sewmos();r.count=list.length;check('nine sewmo in the map',list.length===9);
 const st=[];for(const s of list)st.push(await state(s.id));r.initial=st;
 const idleSeq=st[0]?.seq;r.idleSeq=idleSeq;
 check('all dormant: same sequence, not damageable, health 40',st.every(s=>s.seq===idleSeq&&s.dmg===0&&s.hp===40));
 await cmd('cof_give weapon_mobile\ncof_give weapon_switchblade\ncof_give weapon_glock\ncof_give weapon_nightstick');await p.waitForTimeout(800);await cmd('weapon_nightstick');await p.waitForTimeout(1200);
 // the one at (1695,175): standable spots at 250 (1945,175, feet -124) and 100 (1795,175, feet -140)
 const a=near(list,1695,175);r.target=a;
 await cmd('cof_goto 1945 175 -88');await p.waitForTimeout(2500);
 const far=await state(a.id);r.far=far;check('at 250 units it stays dormant',far.seq===idleSeq&&far.dmg===0);
 const h0=await health();r.h0=h0;
 await cmd('cof_goto 1795 175 -104');await p.waitForTimeout(500);
 const rising=await state(a.id);r.rising=rising;check('at 100 units it rises: another sequence (appear)',rising.seq!==idleSeq);
 await shot('rising');
 await p.waitForTimeout(1200);const up=await state(a.id);r.up=up;check('0.8 s later it is a monster (takes damage)',up.dmg>0);
 // in front of it (it faces yaw 180, -x, with a field of view of 0.5): 1615,175 is standable, feet -140
 // (behind it and silent it never noticed the player: sewmo-probe-211219)
 await cmd('cof_goto 1615 175 -104');await p.waitForTimeout(300);
 // it attacks: health drops by multiples of 4
 let hurt=null;const t0=Date.now();while(Date.now()-t0<25000){await p.waitForTimeout(800);const h=await health();if(h<h0){hurt={h,after:(Date.now()-t0)/1000};break;}}
 r.hurt=hurt;check('it attacks the player',!!hurt);check('slash damage 4 (sk_sewmo_dmg_one_slash1)',!!hurt&&(h0-hurt.h)%4===0);
 await shot('attack');
 // the nightstick: four hits of 11 against 40
 const hits=[];let killed=false;
 // the nightstick reaches 32 units: right up to it, on its own spot each swing (it may have moved)
 for(let k=0;k<12&&!killed;k++){const sp=await state(a.id);await cmd(`cof_goto ${sp.o[0]-26} ${sp.o[1]} ${sp.o[2]+36}
cof_face #${a.id}`);await p.evaluate(()=>CoFDebug.cmd('+attack\n'));await p.waitForTimeout(300);await p.evaluate(()=>CoFDebug.cmd('-attack\n'));await p.waitForTimeout(900);
  const s=await state(a.id);hits.push(s.hp);if(s.dead>0)killed=true;}
 r.hits=hits;r.nightstickLines=logs.filter(l=>/COF\/NIGHTSTICK impact target=monster_sewmo/.test(l)).length;
 check('the nightstick kills it',killed);check('four hits of 11 (40 -> dead)',killed&&r.nightstickLines===4);
 await shot('dead');
 // save/load with a dormant one: it stays dormant, then rises
 const b=near(list,3052,2712);r.saveTarget=b;
 const before=await state(b.id);
 await cmd('save sewmo_probe');const n=logs.filter(l=>l.includes('client connected')).length;
 await p.evaluate(()=>CoFDebug.cmd('load sewmo_probe\n'));await wait(()=>logs.filter(l=>l.includes('client connected')).length>n,'load');
 await p.waitForTimeout(2500);await cmd('sv_cheats 1');
 // entity indices change on load: find it again by position
 const b2=near(await sewmos(),3052,2712);r.saveTargetAfterLoad=b2;
 const after=await state(b2.id);r.afterLoad=after;check('dormant after save/load',after.seq===before.seq&&after.dmg===0);
 await cmd('cof_goto 3052 2812 -492');await p.waitForTimeout(2200);
 const risen=await state(b2.id);r.risenAfterLoad=risen;check('and it still rises after the load',risen.dmg>0);
 r.jsErrors=errors;check('no JS errors',errors.length===0);r.done=true;
}catch(e){r.failure=String(e.stack||e);console.error(e);process.exitCode=1;}finally{fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await browser.close();}
console.log(JSON.stringify({checks:r.checks,hits:r.hits,hurt:r.hurt,failure:r.failure?.slice(0,300)}));
