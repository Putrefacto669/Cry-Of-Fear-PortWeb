// c_basement from the arrival to the change to c_sewer, played with the normal controls: W held to walk,
// E on doors, buttons and the ladder, S down the ladder, quick select keys, mouse clicks to shoot, "*" and the
// keyboard for the mobile, clicks on the keypad. The routes inside each area come from the map's own player
// hull (tools/bsp_walk.py, saved in natural-route/leg-*.json); nothing is teleported with cof_goto.
// Debug aids, all reported: the chapter 1 kit given at the start (mobile, switchblade, Glock: what
// c_apartmentsick carries over), the view turned with cof_face (towards the next waypoint, a door or a crab),
// and state read with cof_inspect / cof_list / cof_door / cof_ladder_view. No god mode, no cof_goto, no cof_fire.
// Usage: node basement_natural_run.mjs <base url> <new output dir> <route dir>
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out,routes]=process.argv.slice(2);assert.ok(base&&out&&routes&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const leg=n=>JSON.parse(fs.readFileSync(`${routes}/leg-${n}.json`,'utf8'));
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),ctx=await browser.newContext({viewport:{width:800,height:600}}),p=await ctx.newPage(),logs=[],errors=[],r={checks:{},events:[],fights:[]};let serial=0,shots=0;
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
const t0=Date.now();const ev=(what,extra={})=>{const e={t:+((Date.now()-t0)/1000).toFixed(1),what,...extra};r.events.push(e);console.log(JSON.stringify(e));};
const wait=async(fn,what,ms=120000)=>{const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<ms,`${what} timeout`);await p.waitForTimeout(200);}};
const cmd=async text=>{const i=logs.length,t=`nr_${++serial}`;await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${t} `),timeout:60000}),p.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${t}`)]);return logs.slice(i).join('\n');};
const check=(k,v)=>{r.checks[k]=v;ev('check',{k,v});};
const strip=l=>l.replace(/^\[[^\]]*\]\s*/,'');
const since=(i,re)=>logs.slice(i).filter(l=>re.test(l)).map(strip);
const field=(l,k)=>(l.match(new RegExp(`\\b${k}=(\\S+)`))||[])[1];
const shot=async label=>{await p.screenshot({path:`${out}/${String(++shots).padStart(2,'0')}-${label}.png`});};
const pos=async()=>{const l=(await cmd('cof_inspect !player')).split('\n').find(x=>/COF\/ENTITY !player/.test(x));return field(l,'origin').split(',').map(Number);};
const health=async()=>+field((await cmd('cof_weapon_status')).match(/COF\/WEAPON .*/)?.[0]||'','health');
const d2=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
// --- fights: a living crab within reach of the walk is shot with the Glock (quick slot of weapon_glock)
let quick=[];const slotKey=w=>String(quick.indexOf(w)+1);
const crabsNear=async(at,range)=>{const out=[];for(const l of (await cmd('cof_list monster_crab')).split('\n').filter(x=>/COF\/LIST monster_crab #/.test(x))){
 const id=l.match(/#(\d+)/)[1],o=field(l,'origin').split(',').map(Number);if(d2(o,at)>range||Math.abs(o[2]-(at[2]-36))>80)continue;
 const st=(await cmd(`cof_inspect #${id}`)).split('\n').find(x=>/COF\/ENTITY/.test(x))||'';if(+field(st,'dead')===0)out.push({id,o,d:d2(o,at)});}return out.sort((a,b)=>a.d-b.d);};
// The crab crawls (36 units high): melee, crouched (C held), with the switchblade of quick select. The Glock
// barely works on it: bullets hit the model's hitboxes near the floor (natural-run-102345: 1 hit in 24 tries)
// and the kit carries 15 rounds with no spare. Each swing re-aims at the crab, which keeps moving.
const crabState=async id=>{const st=(await cmd(`cof_inspect #${id}`)).split('\n').find(x=>/COF\/ENTITY/.test(x))||'';return {hp:+field(st,'health'),dead:+field(st,'dead'),o:(field(st,'origin')||'0,0,0').split(',').map(Number)};};
const fight=async(crab)=>{await p.keyboard.up('w');const f={crab:crab.id,at:crab.o,dist:+crab.d.toFixed(0),swings:0,hBefore:await health(),hp:[]};
 await p.keyboard.press(slotKey('weapon_switchblade'));await p.keyboard.down('c');await p.waitForTimeout(1200);
 let st=await crabState(crab.id);
 for(let k=0;k<30;k++){await cmd(`cof_face ${st.o[0]} ${st.o[1]} ${st.o[2]+12}`);
  await p.mouse.down();await p.waitForTimeout(80);await p.mouse.up();f.swings++;await p.waitForTimeout(560);
  st=await crabState(crab.id);f.hp.push(st.hp);if(st.dead>0){f.killed=true;break;}
  // three swings without damage: the crab is out of the knife's 48 units, a short step towards it
  if(f.hp.length>=3&&f.hp.slice(-3).every(h=>h===f.hp[f.hp.length-1])&&f.hp.length%3===0){await p.keyboard.down('w');await p.waitForTimeout(250);await p.keyboard.up('w');}}
 await p.keyboard.up('c');await p.waitForTimeout(400);
 f.hAfter=await health();r.fights.push(f);ev('fight',f);await shot(`fight-${crab.id}`);return f.killed;};
// --- walking a route: W held, the view kept on the next waypoint
// A waypoint counts as reached at 12 units (at 18 the walk turned early and snagged on a corner,
// natural-run-103229). Without progress for 3 s: S for 0.4 s and try again, three times, then give up.
// Crabs: only fought when closer than 90 units; the fence crabs 160-220 away cost a minute each before.
const walk=async(name,pts,{fightRange=0}={})=>{ev('leg',{name,points:pts.length});let lastCheck=0;
 for(let i=1;i<pts.length;i++){const w=pts[i];let best=1e9,bestAt=Date.now(),retries=0;
  while(true){const at=await pos();const dd=d2(at,w);
   if(dd<12)break;
   if(dd<best-4){best=dd;bestAt=Date.now();}
   if(Date.now()-bestAt>3000){
    if(retries<3){retries++;ev('unstick',{leg:name,waypoint:i,at});await p.keyboard.up('w');await p.keyboard.down('s');await p.waitForTimeout(400);await p.keyboard.up('s');best=1e9;bestAt=Date.now();continue;}
    await p.keyboard.up('w');r.stuck={leg:name,waypoint:i,target:w,at};await shot(`stuck-${name}-${i}`);throw new Error(`stuck on ${name} at waypoint ${i}: at ${at} for ${w}`);}
   if(fightRange&&Date.now()-lastCheck>1500){lastCheck=Date.now();const c=(await crabsNear(at,fightRange)).filter(c=>c.d<90);if(c.length){await fight(c[0]);best=1e9;bestAt=Date.now();continue;}}
   await cmd(`cof_face ${w[0]} ${w[1]} ${w[2]+28-(dd<120?0:0)}`);await p.keyboard.down('w');await p.waitForTimeout(150);}
  }
 await p.keyboard.up('w');ev('arrived',{name,at:await pos()});};
// --- using something: the view on it, then E (+use) for a moment
const use=async target=>{await cmd(`cof_face ${target}`);await p.waitForTimeout(250);await p.keyboard.down('e');await p.waitForTimeout(250);await p.keyboard.up('e');await p.waitForTimeout(400);};
// inter_door: E, a fade and the player appears on its inter_door_exit (the BSP's exits, passed in). First a
// short walk to "front": the exit of the door that comes back the other way, which the map puts right in
// front of this one. E is tried up to three times (the use check needs the door in front and in reach).
const door=async(model,name,exit,front)=>{if(front)await walk(`${name} front`,[await pos(),[front[0],front[1],(await pos())[2]]]);
 const before=await pos();let after=before;
 for(let k=0;k<3;k++){await use(model);try{await wait(async()=>{after=await pos();return d2(after,exit)<40;},`${name} teleport`,5000);break;}catch(e){if(k===2)throw e;ev('door retry',{name,at:await pos()});}}
 await p.waitForTimeout(1800);ev('door',{name,model,from:before,to:after});return after;};
try{
 await p.goto(`${base}?map=c_basement&sw=0&fx=0&timer=1&debug=1`);await wait(()=>logs.some(l=>l.includes('client connected')),'connect');
 await cmd('sv_cheats 1\nr_norefresh 0\ncof_weapon_debug 1');
 await wait(()=>logs.some(l=>/COF\/TELEPORT landada/.test(l)),'entry scene teleport',240000);await p.waitForTimeout(3000);
 await p.mouse.click(400,200);await p.waitForFunction(()=>document.pointerLockElement?.id==='canvas');
 // fixture: the chapter 1 kit c_apartmentsick carries over (basement-probe-001826 showed it crossing the real transition)
 await cmd('cof_give weapon_mobile\ncof_give weapon_switchblade\ncof_give weapon_glock');await p.waitForTimeout(800);
 const q=logs.filter(l=>/COF\/HUD QUICK /.test(l)).pop();quick=strip(q).split(' ').slice(2);r.quick=quick;ev('kit',{quick,health:await health()});
 await shot('start');
 // A: the arrival room, door *4
 await walk('A',leg('A'));await door('*4','A->B',[-2325,1380],[-2947,2936]);
 // B: the corridor of the side rooms; its crab waits at the exit door *7
 await walk('B',leg('B'),{fightRange:260});
 for(const c of await crabsNear(await pos(),260))await fight(c);
 await door('*7','B->C',[-1061,1227],[-1139,1227]);
 // C: the short passage, door *44
 await walk('C',leg('C'));await door('*44','C->D',[1072,1435],[-1016,1296]);
 // D: up to the magazine (the fence scene and its crabs are on the way)
 let i0=logs.length;
 await walk('D1',leg('D1'),{fightRange:260});
 r.fenceScene=since(i0,/crabappears|fisteehslwo|bushslower/).slice(0,3);
 i0=logs.length;await use('*126');await p.waitForTimeout(1500);r.magazine=since(i0,/COF\/HUD (NOTE|IMAGE|DOC)/);await shot('magazine');
 check('the magazine opens with E',r.magazine.length>0);
 await p.keyboard.press('Escape');await p.waitForTimeout(800);
 r.hintPhone=logs.filter(l=>/usemobilephone/i.test(l)).map(strip).slice(0,2);
 // the number of the magazine with the mobile: quick key, "*", the digits, Enter
 await p.keyboard.press(slotKey('weapon_mobile'));await p.waitForTimeout(1500);
 i0=logs.length;await p.keyboard.press('*');await p.waitForSelector('#cof-dialog .phone',{state:'visible',timeout:10000});
 for(const dgt of '543214'){await p.keyboard.press(dgt);await p.waitForTimeout(200);}await shot('dial');await p.keyboard.press('Enter');
 await wait(()=>logs.slice(i0).some(l=>/COF\/HUD CODE 5247/.test(l)),'the call and its code note',150000);
 r.call=since(i0,/COF\/HUD (SUB|CODE)/);check('the call ends with the code note 5247',true);await shot('after-call');
 await p.keyboard.press('Escape');await p.waitForTimeout(500);
 // to the electric door: first locked (the keypad has not been used yet)
 await walk('D2',leg('D2'),{fightRange:200});await walk('D3',leg('D3'));
 i0=logs.length;await use('*63');await p.waitForTimeout(1500);
 const stay=await pos();r.lockedTry=since(i0,/locked|keypad next to it|COF\/HUD (CENTER|HINT)/i).slice(0,3);
 check('electric door locked before the keypad',d2(stay,leg('D3').slice(-1)[0])<60&&/locked=1/.test(await cmd('cof_door elecdoor')));
 // the keypad: E on its button, then the keys 5 2 4 7 of keypad3.tga
 i0=logs.length;await use('*127');await p.waitForSelector('#cof-dialog .keypad',{state:'visible',timeout:10000});
 for(const dgt of [5,2,4,7]){await p.locator('#cof-dialog .keypad .key').nth(dgt-1).click();await p.waitForTimeout(250);}
 await wait(()=>logs.slice(i0).some(l=>/COF\/HUD (GRANTED|DENIED)/.test(l)),'keypad answer',10000);
 r.keypad=since(i0,/COF\/HUD (GRANTED|DENIED)/);check('keypad accepts 5247',r.keypad.includes('COF/HUD GRANTED'));await shot('keypad');
 await p.keyboard.press('Escape');await p.waitForTimeout(800);
 check('electric door unlocked',/locked=0/.test(await cmd('cof_door elecdoor')));
 await door('*63','D->E',[1573,1448],[1663,1449]);
 // E: down through the basement to the top of the ladder
 i0=logs.length;
 // the route's last point (917,-232) is at the mouth of the ladder shaft: walking on with W held dropped Simon the
 // 184 units to the bottom (no fall damage at that height) and skipped the ladder (natural-run-194802). Stop short.
 const routeE=leg('E');routeE[routeE.length-1]=[917,-275,120];
 await walk('E',routeE,{fightRange:200});
 const top=await pos();check('still at the top of the ladder shaft',top[2]>100);
 r.legE=since(i0,/doorapb1|chainsaw|horkuke|checkbrush|fallen apart/i).slice(0,6);
 // the ladder: E on its top area, S held until the descent's last animation
 i0=logs.length;await use('*122');await p.waitForTimeout(800);
 const view=async()=>{const m=(await cmd('cof_ladder_view')).match(/COF\/LADDERCLIENT cam=(\d+) model=(\S+) seq=(-?\d+)/);return m?{cam:+m[1],seq:+m[3]}:{cam:0,seq:-1};};
 let v=await view();check('the ladder starts from its top',v.cam>0);if(!v.cam)throw new Error('the ladder did not start from the top');await shot('ladder-top');
 await p.keyboard.down('s');let held=true;
 for(let k=0;k<60;k++){await p.waitForTimeout(500);v=await view();if(held&&v.cam&&[9,10].includes(v.seq)){await p.keyboard.up('s');held=false;}if(!v.cam)break;}
 if(held)await p.keyboard.up('s');await p.waitForTimeout(1000);
 const bottom=await pos();ev('ladder',{bottom});check('down the ladder to its bottom',v.cam===0&&Math.abs(bottom[2]-(-64))<20);
 // F: to the last door, which leads into the change trigger
 await walk('F',leg('F'));
 i0=logs.length;await use('*101');
 await wait(()=>logs.slice(i0).some(l=>/CHANGE LEVEL:\s*c_sewer|changelevel: map c_sewer/i.test(l)),'change to c_sewer',20000);
 await p.waitForTimeout(2000);r.changeLines=since(i0,/CHANGE LEVEL|changelevel|c_sewer/i).slice(0,6);
 check('chsw1 asks for c_sewer (landmark swheh1)',r.changeLines.some(l=>/CHANGE LEVEL:\s*c_sewer\s+swheh1/i.test(l)));
 check('c_sewer is not packaged yet: the port stays in c_basement',r.changeLines.some(l=>/changelevel: map c_sewer doesn't exist/i.test(l)));
 await shot('end');
 r.healthEnd=await health();r.crabsKilled=r.fights.filter(f=>f.killed).length;
 r.problems=[...new Set(logs.filter(l=>/can't|cannot|couldn't|could not|not found|missing|unknown|failed|Invalid/i.test(l)&&!/Unknown command "sk_|Could not load (model|sound)|Delta_ParseField|SV_LoadProgs|game directory/i.test(l)).map(strip))].slice(0,60);
 r.jsErrors=errors;check('no JS errors',errors.length===0);r.done=true;
}catch(e){r.failure=String(e.stack||e);console.error(e);process.exitCode=1;try{r.lastPos=await pos();await shot('failure');}catch(_){}}
finally{r.seconds=(Date.now()-t0)/1000;r.chromium=browser.version();fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await ctx.close();await browser.close();}
console.log(JSON.stringify({checks:r.checks,fights:r.fights.length,killed:r.crabsKilled,health:r.healthEnd,seconds:r.seconds,stuck:r.stuck,failure:r.failure?.slice(0,300)}));
