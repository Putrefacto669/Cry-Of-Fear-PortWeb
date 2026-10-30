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
 const hold=async(key,ms)=>{steps.push({key,ms});await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);await page.waitForTimeout(50);};
 const turn=async target=>{for(let i=0;i<12;i++){const p=await inspect();let d=(target-p.yaw+540)%360-180;if(Math.abs(d)<8)return;
   await hold(d>0?"ArrowLeft":"ArrowRight",Math.min(450,Math.max(8,Math.abs(d)/280*1000)));}throw Error("keyboard turning did not converge");};
 const walk=async(x,y)=>{let stuck=0,previous=Infinity;
  for(let i=0;i<50;i++){const p=await inspect(),distance=Math.hypot(x-p.x,y-p.y);if(distance<18){steps.push({arrived:[x,y],actual:p});return;}
   if(distance>previous-2)stuck++;else stuck=0;if(stuck>6)throw Error(`route obstructed before ${x},${y}: ${JSON.stringify(p)}`);previous=distance;
   await turn((Math.atan2(y-p.y,x-p.x)*180/Math.PI+360)%360);
   await hold("w",Math.min(900,Math.max(50,(distance-8)/150*1000)));
  }throw Error("walking deadline");};
 await page.goto(`http://127.0.0.1:8095/?map=c_start2&timer=1&fx=0&sw=0&prefetch=1&debug=1`,{waitUntil:"domcontentloaded"});
 await until(()=>output.some(l=>l.includes("client connected")));
 await command("sv_cheats 1");
 const source=process.env.COF_NATURAL_SNAPSHOT;
 assert.ok(source,"A checkpoint from the natural run is required");
 const files=fs.readdirSync(source).map(n=>[n,[...fs.readFileSync(`${source}/${n}`)]]);
 await page.evaluate(files=>{FS.mkdirTree("/rwdir/cryoffear/save");for(const [n,b] of files)FS.writeFile(`/rwdir/cryoffear/save/${n}`,new Uint8Array(b));},files);
 const count=output.filter(l=>l.includes("client connected")).length;
 await page.evaluate(()=>CoFDebug.cmd("load natural_pc_before_login"));
 await until(()=>output.filter(l=>l.includes("client connected")).length>count);
 await page.waitForTimeout(100);
 console.log("READY natural checkpoint",await inspect());
 for await(const line of readline.createInterface({input:process.stdin,terminal:false})) {
  try {const q=JSON.parse(line);steps.push({interaction:q});let result;
   if(q.js) result=await page.evaluate(q.js);
   if(q.walks) for(const pos of q.walks) await walk(...pos);
   if(q.hold) await hold(...q.hold);
   if(q.walk) await walk(...q.walk);
   if(q.turn!==undefined) await turn(q.turn);
   if(q.key) await page.keyboard.press(q.key);
   if(q.click) await page.locator(q.click).click();
   if(q.fill) await page.locator(q.fill[0]).fill(q.fill[1]);
   if(q.type) await page.locator(q.type[0]).pressSequentially(q.type[1]);
   if(q.wait) await page.waitForTimeout(q.wait);
   if(q.cmd) {if(!/^(cof_inspect|cof_padlock|viewpos|save |load )/.test(q.cmd))throw Error("read-only diagnostics/save/load only");result=await command(q.cmd);}
   if(q.shot) {await page.screenshot({path:`${dir}/${q.shot}.png`});result={pose:await inspect(),dom:await page.locator("#cof-dialog,#cof-padlock").evaluateAll(es=>es.map(e=>({id:e.id,visible:getComputedStyle(e).display,text:e.textContent}))),tail:output.slice(-8)};}
   if(q.frame) {
 const data=await page.evaluate(()=>new Promise(resolve=>{const fn=()=>{MainLoop.postMainLoop.splice(MainLoop.postMainLoop.indexOf(fn),1);resolve(document.getElementById("canvas").toDataURL("image/png"));};MainLoop.postMainLoop.push(fn);}));
 fs.writeFileSync(`${dir}/${q.frame}.png`,Buffer.from(data.split(",")[1],"base64"));
 }
 if(q.export) {
 const files=await page.evaluate(()=>FS.readdir("/rwdir/cryoffear/save").filter(n=>n!=="."&&n!=="..").map(n=>[n,[...FS.readFile(`/rwdir/cryoffear/save/${n}`)]]));
 fs.mkdirSync(`${dir}/snapshot`,{recursive:true});for(const [name,bytes] of files)fs.writeFileSync(`${dir}/snapshot/${name}`,Buffer.from(bytes));
 }
 if(q.close) break;
   if(q.load) {const count=output.filter(l=>l.includes("client connected")).length;await page.evaluate(n=>CoFDebug.cmd(`load ${n}`),q.load);await until(()=>output.filter(l=>l.includes("client connected")).length>count);await page.waitForTimeout(100); }
   fs.writeFileSync(`${dir}/engine.log`,output.join("\n"));fs.writeFileSync(`${dir}/steps.json`,JSON.stringify(steps,null,2));console.log(JSON.stringify({ok:true,result,errors}));
  }catch(e){console.log(JSON.stringify({ok:false,error:e.stack}));}
 }
} catch(e){console.error(e.stack);process.exitCode=1;}
finally {fs.writeFileSync(`${dir}/engine.log`,output.join("\n"));fs.writeFileSync(`${dir}/steps.json`,JSON.stringify(steps,null,2));fs.writeFileSync(`${dir}/page-errors.json`,JSON.stringify(errors));await browser.close();}
