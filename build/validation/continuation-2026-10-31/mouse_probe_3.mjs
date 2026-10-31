// Natural-input audit. Read-only cheat-gated diagnostics never advance progression.
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";
const dir=process.env.COF_AUDIT_OUTPUT||`padlock-natural-${Date.now()}`;
fs.mkdirSync(dir,{recursive:true});
for(const name of ["engine.log","steps.json","page-errors.json","padlock-before-use.png","padlock-after-use.png"])
 if(fs.existsSync(`${dir}/${name}`)) throw Error(`Refusing to overwrite audit evidence: ${dir}/${name}. Choose a new COF_AUDIT_OUTPUT.`);
const browser=await chromium.launch({args:["--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"]});
const output=[],errors=[],steps=[];let serial=0;
try {
 const page=await browser.newPage({viewport:{width:640,height:480}});
 page.on("console",m=>output.push(m.text()));page.on("pageerror",e=>errors.push(e.message));
 const command=async text=>{steps.push({command:text});const start=output.length,token=`walk_${++serial}`;
  await Promise.all([page.waitForEvent("console",{predicate:m=>m.text().includes(`COF/FENCE ${token} `),timeout:30000}),page.evaluate(c=>CoFDebug.cmd(c),text+`\ncof_fence ${token}`)]);return output.slice(start).join("\n");};
 const until=async fn=>{const start=Date.now();while(!await fn()){if(Date.now()-start>60000)throw Error("state timeout");await page.waitForTimeout(100);}};
 const inspect=async()=>{const text=await command("cof_inspect !player\nviewpos");
  const p=/COF\/ENTITY !player .*origin=([-\d.eE+]+),([-\d.eE+]+),([-\d.eE+]+).*frozen=(\d)/.exec(text);
  const a=/ang \(\s*([-\d.eE+]+)\s+([-\d.eE+]+)/.exec(text);assert.ok(p&&a,text);return {x:+p[1],y:+p[2],z:+p[3],frozen:+p[4],pitch:+a[1],yaw:+a[2]};};
 const hold=async(key,ms)=>{steps.push({key,ms});await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);await page.waitForTimeout(50);
  if(key==="w")await until(async()=>{const t=await command("cof_kinematics !player"),m=/vel=([-\d.e+]+),([-\d.e+]+),/.exec(t);assert.ok(m,t);return Math.hypot(+m[1],+m[2])<1;});
 };
 const turn=async target=>{for(let i=0;i<12;i++){const p=await inspect();let d=(target-p.yaw+540)%360-180;if(Math.abs(d)<2)return;
   await hold(d>0?"ArrowLeft":"ArrowRight",Math.min(450,Math.max(8,Math.abs(d)/280*1000)));}throw Error("keyboard turning did not converge");};
 const look=async target=>{for(let i=0;i<12;i++){const p=await inspect(),d=target-p.pitch;if(Math.abs(d)<2)return;await hold(d>0?"Delete":"PageDown",Math.min(300,Math.max(8,Math.abs(d)/280*1000)));}throw Error("keyboard pitch did not converge");};
 const walk=async(x,y,tolerance=18)=>{let stuck=0,previous=Infinity;
  for(let i=0;i<50;i++){const p=await inspect(),distance=Math.hypot(x-p.x,y-p.y);if(distance<tolerance){steps.push({arrived:[x,y],actual:p});return;}
   if(distance>previous-2)stuck++;else stuck=0;if(stuck>6)throw Error(`route obstructed before ${x},${y}: ${JSON.stringify(p)}`);previous=distance;
   await turn((Math.atan2(y-p.y,x-p.x)*180/Math.PI+360)%360);
   await hold("w",Math.min(900,Math.max(tolerance<=6?16:50,(distance-(tolerance<=6?2:8))/150*1000)));
  }throw Error("walking deadline");};
 const walkRoute=async points=>{for(const p of points)await walk(...p);};
 const use=async()=>hold("e",120);
 const milestone=async name=>{await page.screenshot({path:`${dir}/${name}.png`});fs.writeFileSync(`${dir}/engine.log`,output.join("\n"));fs.writeFileSync(`${dir}/steps.json`,JSON.stringify(steps,null,2));console.log("OK",name);};
 const checkpoint=async(name,meta)=>{await command(`save ${name}`);const target=`${dir}/checkpoints/${name}`;fs.mkdirSync(target,{recursive:true});const files=await page.evaluate(()=>FS.readdir("/rwdir/cryoffear/save").filter(n=>/\.(sav|HL[123])$/i.test(n)).map(n=>[n,[...FS.readFile(`/rwdir/cryoffear/save/${n}`)]]));for(const [n,b] of files)fs.writeFileSync(`${target}/${n}`,Buffer.from(b));fs.writeFileSync(`${target}/provenance.json`,JSON.stringify({save:name,map:await page.evaluate(()=>CoFCurrentMap()),source:"normal-input traversal",...meta},null,2));console.log("CHECKPOINT",name);};
 const padState=async()=>{const t=await command("cof_padlock");return +(t.match(/state=(\d)/)||[])[1];};
 const mapUse=async expected=>{const n=output.filter(l=>l.includes("client connected")).length;await use();await until(()=>output.filter(l=>l.includes("client connected")).length>n);await until(async()=>await page.evaluate(()=>CoFCurrentMap())===expected);await until(async()=>(await inspect()).frozen===0);};
 const closePaper=async()=>{await page.keyboard.press("Escape");await page.locator("#cof-dialog").waitFor({state:"hidden",timeout:30000});};

 const cpDir=process.env.COF_PROGRESS_FIXTURE;
 const cp=JSON.parse(fs.readFileSync(`${cpDir}/provenance.json`,"utf8"));
 assert.equal(cp.source,"normal-input traversal");assert.equal(cp.map,"c_start2");assert.match(cp.code,/^[1-9]{4}$/);
 await page.goto(`${process.argv[2]||"http://127.0.0.1:8099/"}?map=c_start2&timer=1&fx=0&sw=0&prefetch=1&debug=1`,{waitUntil:"domcontentloaded"});
 await until(()=>output.some(l=>l.includes("client connected")));
 await page.evaluate(()=>CoFPreload("c_start"));await command("sv_cheats 1");
 const checkpointFiles=fs.readdirSync(cpDir).filter(n=>/\.(sav|HL[123])$/i.test(n)).map(n=>[n,[...fs.readFileSync(`${cpDir}/${n}`)]]);
 await page.evaluate(files=>{FS.mkdirTree("/rwdir/cryoffear/save");for(const [n,b] of files)FS.writeFile(`/rwdir/cryoffear/save/${n}`,new Uint8Array(b));},checkpointFiles);
 const nc=output.filter(l=>l.includes("client connected")).length;
 await page.evaluate(n=>CoFDebug.cmd(`load ${n}`),cp.save);
 await until(()=>output.filter(l=>l.includes("client connected")).length>nc);
 const number=cp.note,code=cp.code;
 console.log("RESUMED unmodified native PC checkpoint",cp.save);

 const canvas=page.locator("#canvas");await canvas.waitFor({state:"visible",timeout:30000});
 const box=await canvas.boundingBox();console.log("CANVAS",JSON.stringify(box));
 await page.keyboard.press("Tab");await page.locator("#cof-bag").waitFor({state:"visible",timeout:30000});await page.keyboard.press("Tab");
 await until(()=>page.evaluate(()=>!!document.pointerLockElement));
 await page.evaluate(()=>{window.__mouseMoves=[];addEventListener("mousemove",e=>window.__mouseMoves.push({x:e.clientX,y:e.clientY,dx:e.movementX,dy:e.movementY}));});
 let x=box.x+box.width/2,y=box.y+box.height/2;
 const readings=[await inspect()];
 for(const dx of [100,-100,1,-1]){x+=dx;await page.mouse.move(x,y);await page.waitForTimeout(150);readings.push(await inspect());}

 for(const dx of [100,-100,1,-1]){await page.evaluate(dx=>document.getElementById("canvas").dispatchEvent(new MouseEvent("mousemove",{bubbles:true,movementX:dx,movementY:0,clientX:0,clientY:0})),dx);await page.waitForTimeout(150);readings.push(await inspect());}
 const events=await page.evaluate(()=>window.__mouseMoves);
 fs.writeFileSync(`${dir}/mouse-result.json`,JSON.stringify({readings,events,box},null,2));
 console.log("MOUSE",JSON.stringify({readings,events,box}));
} catch(e){console.error(e.stack);process.exitCode=1;}
finally {fs.writeFileSync(`${dir}/engine.log`,output.join("\n"));fs.writeFileSync(`${dir}/steps.json`,JSON.stringify(steps,null,2));fs.writeFileSync(`${dir}/page-errors.json`,JSON.stringify(errors));await browser.close();}
