// Natural-input audit. Read-only cheat-gated diagnostics never advance progression.
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";
const dir=process.env.COF_AUDIT_OUTPUT||".";
fs.mkdirSync(dir,{recursive:true});
for(const name of ["engine.log","steps.json","page-errors.json","padlock-before-use.png","padlock-after-use.png"])
 if(fs.existsSync(`${dir}/${name}`)) throw Error(`Refusing to overwrite audit evidence: ${dir}/${name}. Choose a new COF_AUDIT_OUTPUT.`);
const browser=await chromium.launch({args:["--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"]});
const output=[],errors=[],steps=[];let serial=0;
try {
 const page=await browser.newPage({viewport:{width:320,height:240}});
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
 await page.goto(`${process.argv[2]||"http://127.0.0.1:8095/"}?map=c_start&timer=1&fx=0&sw=0&prefetch=1&debug=1`,{waitUntil:"domcontentloaded"});
 await until(()=>output.some(l=>l.includes("client connected")));
 await command("sv_cheats 1"); // Diagnostic access only. No state-changing gameplay helpers.
 assert.match(await command("cof_count multi_manager"),/COF\/COUNT multi_manager 29/);
 await until(async()=>{const t=await command("cof_camera kamera3");return /state=0 /.test(t)&&+(t.match(/ now=([\d.]+)/)||[])[1]>48;});
 assert.equal((await inspect()).frozen,0);console.log("OK original introduction returns control with four multiscene1 managers retained");
 for(const [x,y] of [[641,-2720],[641,-2520],[840,-2520],[840,-2240],[1100,-2170],[1250,-2170],[1250,-2195],[1700,-2195],[1740,-2195],[1740,-1250],[2060,-1250],[2100,-1250]])await walk(x,y);
 assert.ok(output.some(l=>l.includes("COF/HUD HINT inventory")));
 assert.ok(output.some(l=>l.includes("COF/HUD SUB 13")));
 assert.ok(output.some(l=>l.includes("COF/HUD OBJECTIVE objective_a")));
 console.log("OK normal walking crosses inventory hint, multiblack and the padlock objective");
 await walk(2100,-1325);await turn(270);
 await page.screenshot({path:`${dir}/padlock-before-use.png`});
 const before=await inspect();await page.keyboard.press("e");await page.waitForTimeout(1500);
 const after=await inspect(),button=await command("cof_inspect padbutton");
 await page.screenshot({path:`${dir}/padlock-after-use.png`});
 steps.push({before,after,button});
 assert.deepEqual(errors,[]);
 if(after.y < -1400 && /class=func_button/.test(button)) {
  console.log("CONFIRMED INCOMPATIBILITY: normal E crosses sd_door1 while original padbutton remains; mandatory puzzle was bypassed");
  process.exitCode=2; // Known progression incompatibility, not a successful campaign test.
 }else {console.log("No bypass reproduced; see position and interaction evidence");process.exitCode=3;}
} catch(e){console.error(e.stack);process.exitCode=1;}
finally {fs.writeFileSync(`${dir}/engine.log`,output.join("\n"));fs.writeFileSync(`${dir}/steps.json`,JSON.stringify(steps,null,2));fs.writeFileSync(`${dir}/page-errors.json`,JSON.stringify(errors));await browser.close();}
