// Uses an unmodified save made at the padlock after a natural trip to the PC.
// fixture.json records the code read from the PC UI, never a replacement code.
// Game/save assets remain local; no teleport, forced Use or code setter is used.
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";
const fixtureDir=process.env.COF_PADLOCK_FIXTURE;
assert.ok(fixtureDir,"Set COF_PADLOCK_FIXTURE to a natural-run save directory with fixture.json");
const fixture=JSON.parse(fs.readFileSync(`${fixtureDir}/fixture.json`,"utf8"));
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
 const player=async()=>{const text=await command("cof_inspect !player\nviewpos");const p=/origin=([-\d.eE+]+),([-\d.eE+]+),([-\d.eE+]+).*frozen=(\d)/.exec(text),a=/ang \(\s*([-\d.eE+]+)\s+([-\d.eE+]+)/.exec(text);assert.ok(p&&a,text);return {x:+p[1],y:+p[2],z:+p[3],frozen:+p[4],yaw:+a[2]};};
 let mouseScale;
 const captureMouse=async()=>{if(await page.evaluate(()=>!!document.pointerLockElement))return;await page.keyboard.press("Tab");await page.locator("#cof-bag").waitFor({state:"visible",timeout:30000});await page.keyboard.press("Tab");await until(()=>page.evaluate(()=>!!document.pointerLockElement));};
 const turn=async target=>{
  if(!mouseScale){const text=await command("sensitivity\nm_yaw");const a=+text.match(/"sensitivity" is "([\d.eE+-]+)"/)?.[1],b=+text.match(/"m_yaw" is "([\d.eE+-]+)"/)?.[1];assert.ok(a>0&&b>0,text);mouseScale=a*b;}
  await captureMouse();
  for(let i=0;i<12;i++){const p=await player(),d=(target-p.yaw+540)%360-180;if(Math.abs(d)<0.3)return;
   // Standard relative mouse events enter SDL; no game angle setters are used.
   const dx=Math.round(Math.max(-2000,Math.min(2000,-d/mouseScale)));
   await page.evaluate(dx=>document.getElementById("canvas").dispatchEvent(new MouseEvent("mousemove",{bubbles:true,movementX:dx,movementY:0,clientX:0,clientY:0})),dx);
   await page.waitForTimeout(100);
  }throw Error("mouse turning did not converge");
 };

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
 assert.match(await command("cof_count multi_manager"),/COF\/COUNT multi_manager 29/);
 assert.equal((await state()).state,"0");assert.equal((await player()).frozen,0);
 assert.match(await command("cof_door sd_door1"),/locked=1 disabled=0/);
 assert.equal(await hidden("padlock_air"),false);assert.equal(await hidden("padlock_gr"),true);
 assert.match(await command("cof_inspect padbutton"),/target=padlock .*use=1 /);
 await save("pad_before");await load("pad_before");await enter();
 assert.equal((await player()).frozen,1);
 assert.match(await command("viewpos"),/1677 -1635 -1238/);
 assert.match(await command("cof_sky_render_status"),/COF\/SKY_RENDER active=1 /);
 const rendered=await frame();assert.ok(rendered.colored>500,"padlock must render with the original sky enabled");
 await cancel();await enter();assert.equal((await state()).angles,"0,0,0,0");
 const wrong=String((+fixture.code[0]%9)+1)+fixture.code.slice(1);
 const angles=[...wrong].map(d=>d==="1"?0:(10-+d)*40);
 for(let i=0;i<4;i++)for(let n=0;n<angles[i]/40;n++)await wheel(i+1);
 assert.equal((await state()).state,"1","wrong combination must not unlock");
 assert.equal((await state()).angles,angles.join(","));
 assert.match(await command("cof_door sd_door1"),/locked=1 disabled=0/);
 // A known-wrong first wheel guards the other three full rotations.
 for(let i=1;i<4;i++) {
  await wheel(i+1);const step=[...angles];step[i]=(step[i]+40)%360;
  assert.equal((await state()).angles,step.join(","));await controllers(step);
  for(let n=0;n<8;n++)await wheel(i+1);
  assert.equal((await state()).angles,angles.join(","));
 }
 // Guard with a wrong second wheel while testing the first wheel's wrap.
 for(let n=0;n<8;n++)await wheel(2);
 await wheel(1);const step=[...angles];step[0]=(step[0]+40)%360;step[1]=(step[1]+320)%360;
 assert.equal((await state()).angles,step.join(","));await controllers(step);
 for(let n=0;n<8;n++)await wheel(1);
 await wheel(2);
 assert.equal((await state()).state,"1");assert.equal((await state()).angles,angles.join(","));
 await controllers(angles);
 assert.equal(await hidden("padlock_air"),false);assert.equal(await hidden("padlock_gr"),true);
 assert.match(await command("cof_inspect padbutton"),/class=func_button/);
 await save("pad_active");await cancel();await load("pad_active");
 assert.equal((await state()).angles,angles.join(","));assert.equal((await state()).owner,"1");assert.equal((await player()).frozen,1);
 await page.locator("#cof-padlock").waitFor({state:"visible",timeout:30000});
 const desired=fixture.code[0]==="1"?0:(10-+fixture.code[0])*40;
 const turns=(desired-angles[0]+360)%360/40;
 for(let n=0;n<turns;n++)await wheel(1);
 assert.equal((await state()).state,"2","the original PC code must start opening");
 await save("pad_opening");await load("pad_opening");
 assert.ok(["2","3"].includes((await state()).state));
 await until(async()=>(await state()).state==="3");
 await until(async()=>/COF\/ENTITY padbutton missing/.test(await command("cof_inspect padbutton")));
 assert.equal((await player()).frozen,0);
 assert.match(await command("cof_door sd_door1"),/locked=0 disabled=0/);
 assert.equal(await hidden("padlock_air"),true);assert.equal(await hidden("padlock_gr"),false);
 await save("pad_solved");await load("pad_solved");
 assert.equal((await state()).state,"3");assert.equal((await state()).owner,"0");
 assert.match(await command("cof_door sd_door1"),/locked=0 disabled=0/);
 assert.equal(await hidden("padlock_air"),true);assert.equal(await hidden("padlock_gr"),false);
 assert.match(await command("cof_inspect padbutton"),/missing/);
 const before=await player();await turn(270);await page.keyboard.press("e",{delay:120});
 await until(async()=>{const p=await player();return Math.hypot(p.x-before.x,p.y-before.y)>100;});
 assert.deepEqual(errors,[]);
 console.log("OK original code, wrong combination, cancel, before/active/opening/solved persistence and normal door use");
 fs.writeFileSync(`${dir}/result.json`,JSON.stringify({fixture,wrong,rendered,after:await player(),passed:true},null,2));
 // Continue the same natural-input run to the original scene volume.
 const hold=async(key,ms)=>{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);await page.waitForTimeout(50);
  if(key==="w")await until(async()=>{const t=await command("cof_kinematics !player"),m=/vel=([-\d.e+]+),([-\d.e+]+),/.exec(t);return m&&Math.hypot(+m[1],+m[2])<1;});};
 const walk=async(x,y)=>{let previous=Infinity,stuck=0;for(let i=0;i<50;i++){const p=await player(),d=Math.hypot(x-p.x,y-p.y);if(d<18)return;if(d>previous-2)stuck++;else stuck=0;assert.ok(stuck<=6,`route obstructed ${x},${y}: ${JSON.stringify(p)}`);previous=d;await turn((Math.atan2(y-p.y,x-p.x)*180/Math.PI+360)%360);await hold("w",Math.min(900,Math.max(50,(d-8)/150*1000)));}throw Error("walking deadline")};
 await save("scene_gate");
 const snapshot=`${dir}/gate-snapshot`;fs.mkdirSync(snapshot);
 const data=await page.evaluate(()=>FS.readdir("/rwdir/cryoffear/save").filter(n=>/\.(sav|HL[123])$/i.test(n)).map(n=>[n,[...FS.readFile(`/rwdir/cryoffear/save/${n}`)]]));
 for(const [n,b] of data)fs.writeFileSync(`${snapshot}/${n}`,Buffer.from(b));
 fs.writeFileSync(`${snapshot}/provenance.json`,JSON.stringify({save:"scene_gate",source:"normal-input padlock route and PC clue",fixture},null,2));

 for(const [x,y] of [[2112,-1700],[2240,-1700],[2384,-1700],[2384,-1980],[2896,-1980],[3104,-1980],[3104,-2360]])await walk(x,y);
const expected=await page.evaluate(()=>{const b=FS.readFile('/rodir/cryoffear/sound/subtitles/start/sub1.wav'),v=new DataView(b.buffer,b.byteOffset,b.byteLength);let o=12,len=0,rate=0,hash=2166136261;while(o+8<=b.length){const tag=String.fromCharCode(...b.slice(o,o+4)),n=v.getUint32(o+4,true);if(tag==='fmt ')rate=v.getUint32(o+12,true);if(tag==='data'){len=n/2;for(let i=0;i<n;i+=2)hash=Math.imul(hash^v.getUint16(o+8+i,true),16777619)>>>0;}o+=8+n+(n&1)}
window.__voice={len,rate,hash,starts:[]};const original=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){const r=Reflect.apply(original,this,args),w=window.__voice;if(this.buffer?.length===w.len&&this.buffer.sampleRate===w.rate){let h=2166136261;for(const x of this.buffer.getChannelData(0))h=Math.imul(h^(Math.round(x*32768)&65535),16777619)>>>0;if(h===w.hash){const record={at:this.context.currentTime,state:this.context.state};w.starts.push(record);const source=this;setTimeout(()=>{const a=Module.cofAudio,v=[...a.voices.values()].find(v=>v.src===source),l=a.ctx.listener;if(v)Object.assign(record,{gain:v.gain.gain.value,master:a.master.gain.value,world:a.world.gain.value,panner:v.panner?{x:v.panner.positionX.value,y:v.panner.positionY.value,z:v.panner.positionZ.value,maxDistance:v.panner.maxDistance}:null,listener:{x:l.positionX.value,y:l.positionY.value,z:l.positionZ.value}});},80);}}return r};return {len,rate,hash};});

 const beforeScene=await command("cof_inspect *35\ncof_inspect *43\ncof_inspect whatthesub\ncof_camera ckamera1\ncof_animation simon3\ncof_inspect !player");
 assert.match(beforeScene,/COF\/ENTITY \*35 .*touch=1 /);
 assert.match(beforeScene,/COF\/CAMERA ckamera1 .*state=0 /,"passing *43 must close the door without starting the scene early");
 await turn(270);await hold("e",120);
 const afterE=await command("cof_camera ckamera1\ncof_animation simon3");
 await page.screenshot({path:`${dir}/scene-after-e.png`});
 if(!/COF\/CAMERA ckamera1 .*state=1 /.test(afterE))await hold("w",800);
 await until(async()=>/state=1 /.test(await command("cof_camera ckamera1")));
 const animation=async()=>{const t=await command("cof_animation simon3");return {text:t,seq:+t.match(/seq=(\d+)/)?.[1],frame:+t.match(/frame=([\d.]+)/)?.[1]};};
 await until(async()=>(await animation()).seq===4);
 const a=await animation();await until(async()=>Math.abs((await animation()).frame-a.frame)>1);
 await page.screenshot({path:`${dir}/scene-active.png`});
 const mark=output.length;
 await save("scene_active");await load("scene_active");
 const resumedAnimation=await animation();assert.equal(resumedAnimation.seq,4);assert.ok(resumedAnimation.frame>=a.frame);
 await until(()=>output.slice(mark).some(l=>l.includes("COF/HUD SMSICON 1")));
 await until(async()=>{if((await player()).frozen!==0)return false;for(const name of ["ckamera1","ckamera2","ckamera3"])if(!/state=0 /.test(await command(`cof_camera ${name}`)))return false;return true;});
 for(const name of ["ckamera1","ckamera2","ckamera3"])assert.match(await command(`cof_camera ${name}`),/state=0 /);
 assert.match(await command("cof_inspect *35"),/missing/);
 const completed=await command("cof_animation simon3\ncof_inspect simon3\ncof_inspect !player");
 await save("scene_completed");await load("scene_completed");
 await hold("e",120);await page.waitForTimeout(1000);
 assert.match(await command("cof_camera ckamera1"),/state=0 /);
 assert.equal((await player()).frozen,0);

 const invLine=output.filter(l=>/COF\/HUD INV [1-9]/.test(l)).at(-1);
 const entries=invLine.split("COF/HUD INV ")[1].trim().split(/\s+/).slice(1);
 const phoneIndex=entries.findIndex(n=>/mobile\.txt/i.test(n));assert.ok(phoneIndex>=0,invLine);
 const smsMark=output.length;
 await page.keyboard.press("Tab");await page.locator("#cof-bag").waitFor({state:"visible",timeout:30000});
 await page.locator(`#cof-bag .slot[data-item="${phoneIndex}"]`).click();
 await page.locator('#cof-bag .menu.on .row[data-act="equip"]').click();
 await until(()=>output.slice(smsMark).some(l=>l.includes("COF/HUD SMSREAD 1")));
 await page.screenshot({path:`${dir}/scene-phone-message.png`});
 const voice=await page.evaluate(()=>({expected:{len:window.__voice.len,rate:window.__voice.rate,hash:window.__voice.hash},starts:window.__voice.starts,context:Module.cofAudio.ctx.state}));
 fs.writeFileSync(`${dir}/voice-observation.json`,JSON.stringify(voice,null,2));
 assert.equal(voice.starts.length,1,"original voice must start exactly once, including both restores");
 assert.equal(voice.context,"running");
 assert.match(await command("cof_inspect whatthesub"),/use=1 think=1 /);
 fs.writeFileSync(`${dir}/scene-result.json`,JSON.stringify({passed:true,beforeScene,afterE,completed,after:await player(),animation:a},null,2));
 assert.deepEqual(errors,[]);
 console.log("OK natural scene proximity/E interaction, animated Simon, SMS, active/completed restore and no replay");
} catch(e){console.error(e.stack);process.exitCode=1;}
finally {fs.writeFileSync(`${dir}/engine.log`,output.join("\n"));fs.writeFileSync(`${dir}/steps.json`,JSON.stringify(steps,null,2));fs.writeFileSync(`${dir}/page-errors.json`,JSON.stringify(errors));await browser.close();}
