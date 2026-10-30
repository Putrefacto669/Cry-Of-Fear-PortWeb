// Natural-input audit. Read-only cheat-gated diagnostics never advance progression.
import assert from "node:assert/strict";
import fs from "node:fs";
import readline from "node:readline";
import {chromium} from "playwright";
const dir=process.env.COF_AUDIT_OUTPUT||".";
fs.mkdirSync(dir,{recursive:true});
for(const name of ["engine.log","steps.json","page-errors.json","padlock-before-use.png","padlock-after-use.png"])
 if(fs.existsSync(`${dir}/${name}`)) throw Error(`Refusing to overwrite audit evidence: ${dir}/${name}. Choose a new COF_AUDIT_OUTPUT.`);
const browser=await chromium.launch({args:["--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"]});
const output=[],errors=[],steps=[];let serial=0;
try {
 const page=await browser.newPage({viewport:{width:640,height:480}});
 page.on("console",m=>output.push(m.text()));page.on("pageerror",e=>errors.push(e.message));
 const command=async text=>{const start=output.length,token=`walk_${++serial}`;
  await Promise.all([page.waitForEvent("console",{predicate:m=>m.text().includes(`COF/FENCE ${token} `),timeout:30000}),page.evaluate(c=>CoFDebug.cmd(c),text+`\ncof_fence ${token}`)]);return output.slice(start).join("\n");};
 const until=async fn=>{const start=Date.now();while(!await fn()){if(Date.now()-start>60000)throw Error("state timeout");await page.waitForTimeout(100);}};
 const inspect=async()=>{const text=await command("cof_inspect !player\nviewpos");
  const p=/COF\/ENTITY !player .*origin=([-\d.]+),([-\d.]+),([-\d.]+).*frozen=(\d)/.exec(text);
  const a=/ang \(\s*([-\d.]+)\s+([-\d.]+)/.exec(text);assert.ok(p&&a,text);return {x:+p[1],y:+p[2],z:+p[3],frozen:+p[4],yaw:+a[2]};};
 const hold=async(key,ms)=>{steps.push({key,ms});await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);};
 const turn=async target=>{for(let i=0;i<12;i++){const p=await inspect();let d=(target-p.yaw+540)%360-180;if(Math.abs(d)<4)return;
   await hold(d>0?"ArrowLeft":"ArrowRight",Math.min(450,Math.max(8,Math.abs(d)/210*1000)));}throw Error("keyboard turning did not converge");};
 const walk=async(x,y)=>{let stuck=0,previous=Infinity;
  for(let i=0;i<50;i++){const p=await inspect(),distance=Math.hypot(x-p.x,y-p.y);if(distance<18){steps.push({arrived:[x,y],actual:p});return;}
   if(distance>previous-2)stuck++;else stuck=0;if(stuck>6)throw Error(`route obstructed before ${x},${y}: ${JSON.stringify(p)}`);previous=distance;
   await turn((Math.atan2(y-p.y,x-p.x)*180/Math.PI+360)%360);
   await hold("w",Math.min(900,Math.max(50,(distance-8)/150*1000)));
  }throw Error("walking deadline");};
 await page.goto("http://127.0.0.1:8095/?map=c_start2&timer=1&fx=0&sw=0&prefetch=1&debug=1",{waitUntil:"domcontentloaded"});
 await until(()=>output.some(l=>l.includes("client connected")));
 await command("sv_cheats 1");
 const before=await command("cof_inspect *19");console.log("BEFORE",before);assert.match(before,/ use=1 /);
 await command("save button_idle");
 const count=output.filter(l=>l.includes("client connected")).length;
 await page.evaluate(()=>CoFDebug.cmd("load button_idle"));
 await until(()=>output.filter(l=>l.includes("client connected")).length>count);
 const after=await command("cof_inspect *19");console.log("AFTER",after);
 const expected=process.env.COF_BUTTON_EXPECT||"0";assert.match(after,new RegExp(" use="+expected+" "));
 if(expected==="1") {
  assert.match(after,/next=0 /);
  assert.match(await command("cof_usemodel *19"),/COF\/HUD COMPUTER /);
  assert.match(await command("cof_inspect *19"),/ use=1 think=1/);
  await command("save button_waiting");
  const n=output.filter(l=>l.includes("client connected")).length;
  await page.evaluate(()=>CoFDebug.cmd("load button_waiting"));
  await until(()=>output.filter(l=>l.includes("client connected")).length>n);
  assert.match(await command("cof_inspect *19"),/ use=1 think=1/);
  await until(async()=>/ toggle=1 /.test(await command("cof_inspect *19")));
  await command("save button_returned");
  const j=output.filter(l=>l.includes("client connected")).length;
  await page.evaluate(()=>CoFDebug.cmd("load button_returned"));
  await until(()=>output.filter(l=>l.includes("client connected")).length>j);
  assert.match(await command("cof_inspect *19"),/toggle=1 next=-1 /);
  assert.match(await command("cof_usemodel *19"),/COF\/HUD COMPUTER /);
  console.log("OK original button idle and return callback survive without Spawn or Use during restoration");
 }
 // Direct activation is diagnostic only. It never credits natural progression.
 await command("cof_use computeron on");
 await page.locator("#cof-dialog input").pressSequentially("wrong-password");
 const mark=output.length;await page.keyboard.press("Enter");
 await until(()=>output.slice(mark).some(l=>l.includes("COF/HUD DENIED")));
 console.log("OK actual keyboard typing and Enter reach server validation");
 assert.deepEqual(errors,[]);
 await page.screenshot({path:`${dir}/denied.png`});
} catch(e){console.error(e.stack);process.exitCode=1;}
finally {fs.writeFileSync(`${dir}/engine.log`,output.join("\n"));fs.writeFileSync(`${dir}/steps.json`,JSON.stringify(steps,null,2));fs.writeFileSync(`${dir}/page-errors.json`,JSON.stringify(errors));await browser.close();}
