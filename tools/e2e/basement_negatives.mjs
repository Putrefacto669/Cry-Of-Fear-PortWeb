// c_basement negative checks: what must NOT let the player through, and what the game says instead.
// - trigger_checkbrush *3 (back up the arrival stairs), *123 (destroyed interior), *124 (the ledge overhead),
//   *87 (the fallen stairs): solid, and E shows its message (checkbrush.cpp), not again before checkdelay (2 s);
// - inter_door *16 (lockedby dsadas, a key the map never gives): E shows "He locked the door..." and no teleport.
// Walking: W held with the view turned by cof_face (as basement_natural_run.mjs), routes from tools/bsp_walk.py.
// Fixtures, all reported: zones D and E are entered with cof_goto at the inter_door_exit the map uses
// (bas6_ex2, bas7_ex1), and notarget keeps the crabs out of the way.
// Usage: node basement_negatives.mjs <base url> <out> <route dir>
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out,routes]=process.argv.slice(2);assert.ok(base&&out&&routes&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const leg=n=>JSON.parse(fs.readFileSync(`${routes}/leg-${n}.json`,'utf8'));
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),ctx=await browser.newContext({viewport:{width:800,height:600}}),p=await ctx.newPage(),logs=[],errors=[],r={checks:{},cases:[]};let serial=0,shots=0;
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
const wait=async(fn,what,ms=120000)=>{const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<ms,`${what} timeout`);await p.waitForTimeout(200);}};
const cmd=async text=>{const i=logs.length,t=`ng_${++serial}`;await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${t} `),timeout:60000}),p.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${t}`)]);return logs.slice(i).join('\n');};
const check=(k,v)=>{r.checks[k]=v;console.log(JSON.stringify({k,v}));};
const strip=l=>l.replace(/^\[[^\]]*\]\s*/,'');
const since=(i,re)=>logs.slice(i).filter(l=>re.test(l)).map(strip);
const field=(l,k)=>(l.match(new RegExp(`\\b${k}=(\\S+)`))||[])[1];
const shot=async label=>{await p.screenshot({path:`${out}/${String(++shots).padStart(2,'0')}-${label}.png`});};
const pos=async()=>{const l=(await cmd('cof_inspect !player')).split('\n').find(x=>/COF\/ENTITY !player/.test(x));return field(l,'origin').split(',').map(Number);};
const d2=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const walk=async(pts)=>{for(let i=1;i<pts.length;i++){const w=pts[i];let best=1e9,bestAt=Date.now(),retries=0;
 while(true){const at=await pos();const dd=d2(at,w);if(dd<12)break;if(dd<best-4){best=dd;bestAt=Date.now();}
  if(Date.now()-bestAt>3000){if(retries++<3){await p.keyboard.up('w');await p.keyboard.down('s');await p.waitForTimeout(400);await p.keyboard.up('s');best=1e9;bestAt=Date.now();continue;}
   await p.keyboard.up('w');throw new Error(`stuck at ${at} for ${w}`);}
  await cmd(`cof_face ${w[0]} ${w[1]} ${w[2]+28}`);await p.keyboard.down('w');await p.waitForTimeout(150);}}
 await p.keyboard.up('w');};
const pressE=async()=>{await p.keyboard.down('e');await p.waitForTimeout(250);await p.keyboard.up('e');await p.waitForTimeout(600);};
// push against a brush for 2 s toward "beyond", then E twice on it
// E twice from where the player stands, then push against the brush for 2 s toward "beyond".
// (Pushing first moved the player along angled brushes out of use range: negatives-201624.)
// Blocked: a thin wall must not be crossed on its axis; any brush: the player never stands inside its box
// (shrunk by the hull) and never reaches the point behind it.
const brushCase=async({name,model,message,beyond,axis,limit,sign,box})=>{
 const c={name,model};
 await cmd(`cof_face ${model}`);await p.waitForTimeout(300);
 let i=logs.length;await pressE();c.firstUse=since(i,/COF\/HUD CENTER/);
 i=logs.length;await pressE();c.secondUse=since(i,/COF\/HUD CENTER/);
 const at0=await pos();const path=[at0];
 await cmd(`cof_face ${beyond[0]} ${beyond[1]} ${at0[2]+28}`);await p.keyboard.down('w');
 for(let k=0;k<10;k++){await p.waitForTimeout(200);path.push(await pos());}
 await p.keyboard.up('w');await p.waitForTimeout(300);
 const at1=await pos();c.pushedFrom=at0;c.pushedTo=at1;
 const inside=q=>box&&q[0]>box[0]+16&&q[0]<box[3]-16&&q[1]>box[1]+16&&q[1]<box[4]-16&&q[2]-36<box[5]&&q[2]+36>box[2];
 c.enteredBox=path.some(inside);c.reachedBeyond=path.some(q=>d2(q,beyond)<48);
 const held=sign>0?Math.max(...path.map(q=>q[axis]))<=limit:at1[axis]>=limit;
 // up (axis 2): only the height counts; the point "beyond" a ledge is just the wall under it
 c.blocked=axis===2?held:held&&!c.enteredBox&&!c.reachedBeyond;
 await shot(name);r.cases.push(c);
 check(`${name}: blocks the way`,c.blocked);
 check(`${name}: E says "${message}"`,c.firstUse.some(l=>l.includes(message)));
 check(`${name}: no repeat within checkdelay`,c.secondUse.length===0);
};
try{
 await p.goto(`${base}?map=c_basement&sw=0&fx=0&timer=1&debug=1`);await wait(()=>logs.some(l=>l.includes('client connected')),'connect');
 await cmd('sv_cheats 1\nr_norefresh 0');
 await wait(()=>logs.some(l=>/COF\/TELEPORT landada/.test(l)),'entry scene teleport',240000);await p.waitForTimeout(3000);
 await p.mouse.click(400,200);await p.waitForFunction(()=>document.pointerLockElement?.id==='canvas');
 await cmd('notarget');
 // arrival room: the stairs back up (*3 at x -3253..-3252) and the locked door (*16 at y 2733..2736)
 const start=await pos();
 await walk([start,[-3212,2906,483]]);
 await brushCase({name:'arrival stairs *3',model:'*3',message:"I don't need to go back up again.",beyond:[-3330,2906],axis:0,limit:-3253+16,sign:-1});
 await walk([await pos(),...leg('N16').slice(1)]);
 {const at0=await pos();await cmd('cof_face *16');await p.waitForTimeout(300);const i=logs.length;await pressE();await p.waitForTimeout(1500);
  const lines=since(i,/COF\/HUD CENTER/);const at1=await pos();r.cases.push({name:'locked door *16',lines,at0,at1});await shot('locked-door');
  check('locked door *16: E says "He locked the door. Better find another way."',lines.some(l=>l.includes('He locked the door. Better find another way.')));
  check('locked door *16: no teleport',d2(at0,at1)<40);}
 // zone D, entered at bas6_ex2 (fixture). *123 is the box around a car in the street ("interior destroyed") and
 // *124 a ledge overhead: what they forbid is getting on/up (the car's front step lifts the player 5 units,
 // 582 -> 587), so "blocked" is the height staying under 600 (negatives-202002 measured the box outline instead).
 await cmd('cof_goto 1072 1435 453');await p.waitForTimeout(1200);
 await walk(leg('N123'));
 await brushCase({name:'destroyed interior *123',model:'*123',message:"The interior is destroyed. It's not going to work.",beyond:[1000,1738],axis:2,limit:600,sign:1});
 await walk([await pos(),...leg('N124').slice(1)]);
 await brushCase({name:'ledge *124',model:'*124',message:"It's too dark and dangerous to climb up there.",beyond:[1373,1850],axis:2,limit:600,sign:1});
 // zone E, entered at bas7_ex1 (fixture)
 await cmd('cof_goto 1573 1448 453');await p.waitForTimeout(1200);
 await walk(leg('N87'));
 await walk([await pos(),[1556,584,461]]);
 await brushCase({name:'fallen stairs *87',model:'*87',message:"The stairs has fallen apart. I can't go up.",beyond:[1556,400],axis:1,limit:544+16,sign:-1});
 r.jsErrors=errors;check('no JS errors',errors.length===0);r.done=true;
}catch(e){r.failure=String(e.stack||e);console.error(e);process.exitCode=1;try{r.lastPos=await pos();await shot('failure');}catch(_){}}
finally{fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await browser.close();}
console.log(JSON.stringify({checks:r.checks,failure:r.failure?.slice(0,300)}));
