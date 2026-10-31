// Uses an unmodified save made at the padlock after a natural trip to the PC.
// fixture.json records the code read from the PC UI, never a replacement code.
// Game/save assets remain local; no teleport, forced Use or code setter is used.
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";
const fixtureDir=process.env.COF_PADLOCK_FIXTURE;
assert.ok(fixtureDir,"Set COF_PADLOCK_FIXTURE to a natural-run save directory with fixture.json");
const provenance=JSON.parse(fs.readFileSync(`${fixtureDir}/provenance.json`,"utf8"));
const fixture={...provenance.fixture,save:provenance.save};
assert.match(fixture.code,/^[1-9]{4}$/);
assert.equal(fixture.source,"cof_computer UI in c_start2");
assert.match(fixture.save,/^[a-zA-Z0-9_]+$/);
const dir=process.env.COF_AUDIT_OUTPUT||`padlock-regression-${Date.now()}`;
fs.mkdirSync(dir,{recursive:true});
assert.ok(!fs.existsSync(`${dir}/engine.log`),"Choose a new evidence directory");
const browser=await chromium.launch({args:["--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"]});
const output=[],errors=[],steps=[];let serial=0;
try {
 const page=await browser.newPage({viewport:{width:640,height:480}});
 page.on("console",m=>output.push(m.text()));page.on("pageerror",e=>errors.push(e.message));
 const until=async fn=>{const start=Date.now();while(!await fn()){if(Date.now()-start>60000)throw Error("padlock state timeout");await page.waitForTimeout(100);}};
 const command=async text=>{steps.push({command:text});const start=output.length,token=`pad_${++serial}`;
  await Promise.all([page.waitForEvent("console",{predicate:m=>m.text().includes(`COF/FENCE ${token} `),timeout:30000}),page.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${token}`)]);
  return output.slice(start).join("\n");};
 const state=async()=>{const text=await command("cof_padlock");const line=text.split("\n").find(l=>l.includes("COF/PADLOCK "));assert.ok(line,text);
  return Object.fromEntries([...line.matchAll(/(\w+)=([^\s]*)/g)].map(([,k,v])=>[k,v]));};
 const player=async()=>{const text=await command("cof_inspect !player\nviewpos");const p=/origin=([-\d.]+),([-\d.]+),([-\d.]+).*frozen=(\d)/.exec(text),a=/ang \(\s*([-\d.]+)\s+([-\d.]+)/.exec(text);assert.ok(p&&a,text);return {x:+p[1],y:+p[2],z:+p[3],frozen:+p[4],yaw:+a[2]};};
 const turn=async target=>{for(let i=0;i<12;i++){const p=await player(),d=(target-p.yaw+540)%360-180;if(Math.abs(d)<8)return;
  const key=d>0?"ArrowLeft":"ArrowRight";await page.keyboard.down(key);await page.waitForTimeout(Math.min(450,Math.max(8,Math.abs(d)/280*1000)));await page.keyboard.up(key);await page.waitForTimeout(50);}throw Error("keyboard turn did not converge");};
 const save=async name=>{await command(`save ${name}`);assert.ok(await page.evaluate(n=>FS.analyzePath(`/rwdir/cryoffear/save/${n}.sav`).exists,name));};
 const load=async name=>{const n=output.filter(l=>l.includes("client connected")).length;await page.evaluate(n=>CoFDebug.cmd(`load ${n}`),name);await until(()=>output.filter(l=>l.includes("client connected")).length>n);await command("cof_padlock");};
 const enter=async()=>{await turn(270);await until(async()=>/toggle=1 next=(?:0|-1) /.test(await command("cof_inspect padbutton")));await page.keyboard.press("e",{delay:120});await until(async()=>(await state()).state==="1");await page.locator("#cof-padlock").waitFor({state:"visible",timeout:30000});};
 const cancel=async()=>{await page.keyboard.press("Escape");await until(async()=>(await state()).state==="0");assert.equal((await player()).frozen,0);};
 const wheel=async i=>{steps.push({wheel:i});await page.locator(`#cof-padlock button[data-wheel="${i}"]`).click();await command("cof_padlock");};
 const controllers=async angles=>until(async()=>{const text=await command("cof_padlock_render");return text.includes(`controller=${angles.map(a=>Math.floor(a*255/360)).join(",")}`);});
 const hidden=async name=>{const text=await command(`cof_inspect ${name}`),m=/effects=(\d+)/.exec(text);assert.ok(m,text);return !!(+m[1]&128);};
 const frame=async()=>page.evaluate(()=>new Promise((resolve,reject)=>{
  let timer;const done=()=>{MainLoop.postMainLoop.splice(MainLoop.postMainLoop.indexOf(done),1);clearTimeout(timer);
   const gl=GL.currentContext.GLctx,w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
   const width=Math.floor(w*.1),height=Math.floor(h*.7),pixels=new Uint8Array(width*height*4);
   gl.readPixels(Math.floor(w*.45),Math.floor(h*.15),width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   let colored=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]+pixels[i+1]+pixels[i+2]>0)colored++;
   resolve({colored,total:width*height});};
  timer=setTimeout(()=>{MainLoop.postMainLoop.splice(MainLoop.postMainLoop.indexOf(done),1);reject(Error("frame timeout"));},30000);
  MainLoop.postMainLoop.push(done);
 }));
 await page.goto(`${process.argv[2]||"http://127.0.0.1:8095/"}?map=c_start&timer=1&fx=0&sw=0&prefetch=1&debug=1`,{waitUntil:"domcontentloaded"});
 await until(()=>output.some(l=>l.includes("client connected")));
 await page.evaluate(()=>CoFPreload("c_start2"));
 await command("sv_cheats 1");
 const files=fs.readdirSync(fixtureDir).filter(n=>/\.(sav|HL[123])$/i.test(n)).map(n=>[n,[...fs.readFileSync(`${fixtureDir}/${n}`)]]);
 await page.evaluate(files=>{FS.mkdirTree("/rwdir/cryoffear/save");for(const [n,b] of files)FS.writeFile(`/rwdir/cryoffear/save/${n}`,new Uint8Array(b));},files);
 await load(fixture.save);
 const hold=async(key,ms)=>{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);await page.waitForTimeout(50);
  if(key==="w")await until(async()=>{const t=await command("cof_kinematics !player"),m=/vel=([-\d.e+]+),([-\d.e+]+),/.exec(t);return m&&Math.hypot(+m[1],+m[2])<1;});};
 const walk=async(x,y)=>{let previous=Infinity,stuck=0;for(let i=0;i<50;i++){const p=await player(),d=Math.hypot(x-p.x,y-p.y);if(d<18)return;if(d>previous-2)stuck++;else stuck=0;assert.ok(stuck<=6,`route obstructed ${x},${y}: ${JSON.stringify(p)}`);previous=d;await turn((Math.atan2(y-p.y,x-p.x)*180/Math.PI+360)%360);await hold("w",Math.min(900,Math.max(50,(d-8)/150*1000)));}throw Error("walking deadline")};

 for(const [x,y] of [[2112,-1700],[2240,-1700],[2384,-1700],[2384,-1968],[2896,-1968],[2896,-1984],[3104,-1984],[3104,-2384]])await walk(x,y);
 await turn(270);
 const beforeScene=await command("cof_inspect *35\ncof_inspect *43\ncof_camera ckamera1\ncof_animation simon3\ncof_inspect !player");
 await page.screenshot({path:`${dir}/scene-before-e.png`});
 await hold("e",120);await page.waitForTimeout(2000);
 const afterScene=await command("cof_camera ckamera1\ncof_animation simon3\ncof_inspect !player");
 await page.screenshot({path:`${dir}/scene-after-e.png`});
 fs.writeFileSync(`${dir}/scene-observation.json`,JSON.stringify({beforeScene,afterScene,position:await player()},null,2));
 console.log("SCENE_OBSERVATION",beforeScene,afterScene);
 assert.deepEqual(errors,[]);
} catch(e){console.error(e.stack);process.exitCode=1;}
finally {fs.writeFileSync(`${dir}/engine.log`,output.join("\n"));fs.writeFileSync(`${dir}/steps.json`,JSON.stringify(steps,null,2));fs.writeFileSync(`${dir}/page-errors.json`,JSON.stringify(errors));await browser.close();}
