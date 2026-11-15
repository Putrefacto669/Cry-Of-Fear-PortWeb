// c_nightmare's last scare: trigger_once *125 -> multispotea: cof_teleport beforetele puts Simon at (-739,-1416)
// facing -y, the head (env_model headdy, -738,-1474) shows for 1.5 s, then the level teleports him on.
// Walks into the trigger holding forward (touch joystick on mobile, W on PC) and records where Simon is and looks
// every 0.2 s, plus screenshots. Start point (-738,-1300) via cof_goto (fixture). Usage:
// node mobile_screamer.mjs <base url> <out> [mobile|pc] [release ms after the scare starts, -1 = keep holding]
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out,mode='mobile',release='-1']=process.argv.slice(2);assert.ok(base&&out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const mobile=mode==='mobile';
const ctx=await browser.newContext(mobile?{viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:{width:960,height:540}});
const p=await ctx.newPage(),logs=[],errors=[],r={mode,samples:[]};let serial=0;
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
const cmd=async text=>{const i=logs.length,t=`ms_${++serial}`;await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${t} `),timeout:60000}),p.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${t}`)]);return logs.slice(i).join('\n');};
const view=async()=>{const t=await cmd('viewpos');const o=t.match(/org \( ([^)]+) \)/)?.[1].trim().split(/ +/).map(Number),a=t.match(/ang \( ([^)]+) \)/)?.[1].trim().split(/ +/).map(Number);return {o,a};};
try{
 await p.goto(`${base}?map=c_nightmare&sw=0&fx=0&timer=1&debug=1&input=${mobile?'mobile':'pc'}`);
 const t=Date.now();while(!logs.some(l=>l.includes('client connected'))){assert.ok(Date.now()-t<180000,'connect');await p.waitForTimeout(500);}
 await cmd('sv_cheats 1');
 while(!/frozen=0 /.test(await cmd('cof_inspect !player'))){assert.ok(Date.now()-t<400000,'unfrozen');await p.waitForTimeout(1000);}
 let cdp,stick;
 if(mobile){await p.waitForSelector('#cof-touch-controls:not([hidden]) .cof-touch-stick',{timeout:60000});cdp=await ctx.newCDPSession(p);stick=await p.locator('.cof-touch-stick').boundingBox();}
 else{await p.mouse.click(480,270);await p.waitForFunction(()=>document.pointerLockElement?.id==='canvas');}
 await cmd('cof_goto -738 -1300 -290');await p.waitForTimeout(600);await cmd('cof_face headdy');await p.waitForTimeout(600);
 const hold=async on=>{if(mobile){const x=stick.x+stick.width/2,y=stick.y+stick.height/2;await cdp.send('Input.dispatchTouchEvent',on?{type:'touchStart',touchPoints:[{x,y,id:3}]}:{type:'touchEnd',touchPoints:[]});if(on)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-stick.height*.45,id:3}]});}else{if(on)await p.keyboard.down('w');else await p.keyboard.up('w');}};
 // PC only: SCARE_KEY=s|a|d switches to that key the moment the scare starts (does the cage of walltoggle hold?)
 const scareKey=process.env.SCARE_KEY;let switched=false;
 const i0=logs.length;await hold(true);let started=0,released=false,shots=0;
 const t1=Date.now();
 while(Date.now()-t1<12000){const v=await view();const scare=logs.slice(i0).some(l=>/TELEPORT beforetele|beforetelet|b_screamclose|headdy/i.test(l));
  if(scare&&!started)started=Date.now();
  if(started&&scareKey&&!mobile&&!switched){await p.keyboard.up('w');await p.keyboard.down(scareKey);switched=true;}
  const since=started?Date.now()-started:null;
  r.samples.push({ms:Date.now()-t1,sinceScare:since,org:v.o,ang:v.a});
  // one screenshot ~0.7 s into the scare (each costs ~2 s under SwiftShader and would hide the movement)
  if(started&&since>=700&&!shots){await p.screenshot({path:`${out}/scare-${String(since).padStart(4,'0')}.png`});shots++;}
  if(started&&+release>=0&&!released&&since>=+release){await hold(false);released=true;}
  if(started&&since>2500)break;
  await p.waitForTimeout(60);}
 if(!released)await hold(false);
 if(switched)await p.keyboard.up(scareKey);
 r.scareLines=logs.slice(i0).filter(l=>/TELEPORT|headdy|scream/i.test(l)).map(l=>l.replace(/^\[[^\]]*\]\s*/,'')).slice(0,8);
 // distance from Simon's eye to the head and the angle between the view and the head, through the scare
 const head=[-738,-1474,-259];
 r.track=r.samples.filter(s=>s.sinceScare!==null&&s.org).map(s=>{const dx=head[0]-s.org[0],dy=head[1]-s.org[1];const yawTo=Math.atan2(dy,dx)*180/Math.PI;let off=((yawTo-s.ang[1])%360+540)%360-180;return {ms:s.sinceScare,dist:+Math.hypot(dx,dy).toFixed(0),yawOff:+off.toFixed(1),x:+s.org[0].toFixed(0),y:+s.org[1].toFixed(0)};});
 r.jsErrors=errors;
}catch(e){r.failure=String(e.stack||e);process.exitCode=1;}finally{fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await browser.close();}
console.log(JSON.stringify({mode,lines:r.scareLines,track:r.track,failure:r.failure?.slice(0,200)}));
