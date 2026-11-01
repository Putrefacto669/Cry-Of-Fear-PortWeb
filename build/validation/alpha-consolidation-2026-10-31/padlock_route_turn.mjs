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
 const walk=async(x,y)=>{let stuck=0,previous=Infinity;
  for(let i=0;i<50;i++){const p=await inspect(),distance=Math.hypot(x-p.x,y-p.y);if(distance<18){steps.push({arrived:[x,y],actual:p});return;}
   if(distance>previous-2)stuck++;else stuck=0;if(stuck>6)throw Error(`route obstructed before ${x},${y}: ${JSON.stringify(p)}`);previous=distance;
   await turn((Math.atan2(y-p.y,x-p.x)*180/Math.PI+360)%360);
   await hold("w",Math.min(900,Math.max(50,(distance-8)/150*1000)));
  }throw Error("walking deadline");};
 const walkRoute=async points=>{for(const p of points)await walk(...p);};
 const use=async()=>hold("e",120);
 const milestone=async name=>{await page.screenshot({path:`${dir}/${name}.png`});fs.writeFileSync(`${dir}/engine.log`,output.join("\n"));fs.writeFileSync(`${dir}/steps.json`,JSON.stringify(steps,null,2));console.log("OK",name);};
 const padState=async()=>{const t=await command("cof_padlock");return +(t.match(/state=(\d)/)||[])[1];};
 const mapUse=async expected=>{const n=output.filter(l=>l.includes("client connected")).length;await use();await until(()=>output.filter(l=>l.includes("client connected")).length>n);await until(async()=>await page.evaluate(()=>CoFCurrentMap())===expected);await until(async()=>(await inspect()).frozen===0);};
 const closePaper=async()=>{await page.keyboard.press("Escape");await page.locator("#cof-dialog").waitFor({state:"hidden",timeout:30000});};
 await page.goto(`${process.argv[2]||"http://127.0.0.1:8095/"}?map=c_start&timer=1&fx=0&sw=0&prefetch=1&debug=1`,{waitUntil:"domcontentloaded"});
 await until(()=>output.some(l=>l.includes("client connected")));
 await command("sv_cheats 1");
 assert.match(await command("cof_count multi_manager"),/COF\/COUNT multi_manager 29/);
 await until(async()=>{const t=await command("cof_camera kamera3");return /state=0 /.test(t)&&+(t.match(/ now=([\d.]+)/)||[])[1]>48;});
 assert.equal((await inspect()).frozen,0);
 await walkRoute([[641,-2720],[641,-2520],[840,-2520],[840,-2240],[1100,-2170],[1250,-2170],[1250,-2195],[1700,-2195],[1740,-2195],[1740,-1250],[2060,-1250],[2100,-1250],[2105,-1325]]);
 await turn(270);await command("cof_useaim !player");await use();
 await until(async()=>await padState()===1);
 await page.locator("#cof-padlock").waitFor({state:"visible",timeout:30000});
 assert.equal((await inspect()).frozen,1);
 assert.match(await command("cof_sky_render_status"),/COF\/SKY_RENDER active=1 /);
 const colored=await page.evaluate(()=>new Promise((resolve,reject)=>{let timer;const fn=()=>{MainLoop.postMainLoop.splice(MainLoop.postMainLoop.indexOf(fn),1);clearTimeout(timer);const gl=GL.currentContext.GLctx,w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,bw=Math.floor(w*.1),bh=Math.floor(h*.7),p=new Uint8Array(bw*bh*4);gl.readPixels(Math.floor(w*.45),Math.floor(h*.15),bw,bh,gl.RGBA,gl.UNSIGNED_BYTE,p);let n=0;for(let i=0;i<p.length;i+=4)if(p[i]+p[i+1]+p[i+2]>0)n++;resolve(n);};timer=setTimeout(()=>reject(Error("frame timeout")),30000);MainLoop.postMainLoop.push(fn);}));
 assert.ok(colored>500,"fresh off-map camera must render the padlock, with sky enabled");
 await milestone("01-padlock-before-clue");
 await page.keyboard.press("Escape");await until(async()=>await padState()===0);assert.equal((await inspect()).frozen,0);
 await walkRoute([[2100,-1250],[2380,-1250],[2423,-950]]);await turn(90);await mapUse("c_start2");
 await milestone("02-original-level-exit");
 await walkRoute([[2425,-800],[2825,-850],[2890,-940],[3050,-1010],[3300,-1010],[3655,-1010],[3655,-1240]]);await turn(270);await use();await until(async()=>{const p=await inspect();return p.x<1100&&p.y<-1600;});
 await walkRoute([[1040,-1870],[1680,-1870],[1680,-1500],[1680,-450],[1830,-80],[1840,20],[1430,20],[1430,270],[1552,270],[1552,450],[1552,650],[1552,740],[825,740],[825,1250],[500,1400],[220,1600],[25,1600],[25,2025]]);
 await turn(90);await look(55);await use();
 await page.locator("#cof-dialog img.picture").waitFor({state:"visible",timeout:30000});
 await until(()=>page.locator("#cof-dialog img.picture").evaluate(e=>e.naturalWidth>0));
 const note=output.filter(l=>l.includes("COF/HUD IMAGE gfx/vgui/640_pass")).at(-1);
 const number=+(note?.match(/640_pass([1-8])\.tga/)||[])[1];assert.ok(number>=1&&number<=8,note);
 const passwords=["apple45","cloudyday","rosesarered","junesummer","unforgettable","thebeatles54","marriageinapril","jillanddavid"];
 // Map the displayed original note resource to its verified printed password.
 // The padlock code itself is read only from the PC's visible paper dialog below.
 await milestone("03-original-note");await closePaper();await look(0);
 await walkRoute([[25,1600],[220,1600],[220,1400],[950,1400],[970,1986]]);await turn(0);await use();await until(async()=>{const p=await inspect();return p.x>1030&&p.x<1150&&p.y>1900;});
 await walkRoute([[1100,1620],[1180,1600],[1260,1590],[1360,1620],[1350,1700]]);await turn(180);await use();
 const input=page.locator("#cof-dialog input");await input.waitFor({state:"visible",timeout:30000});
 await input.pressSequentially("wrong-password");let mark=output.length;await page.keyboard.press("Enter");await until(()=>output.slice(mark).some(l=>l.includes("COF/HUD DENIED")));
 await input.fill("");await input.pressSequentially(passwords[number-1]);await page.keyboard.press("Enter");
 const paper=page.locator("#cof-dialog .paper");await paper.waitFor({state:"visible",timeout:30000});
 const clue=await paper.textContent(),code=clue.match(/\b([1-9]{4})\b/)?.[1];assert.ok(code,clue);
 await milestone("04-original-PC-code");await closePaper();
 await walkRoute([[1360,1620],[1260,1590],[1180,1600],[1100,1620],[1100,1987],[970,1986],[825,1250],[825,1000],[825,740],[1552,740],[1552,450],[1552,270],[1430,270],[1430,20],[1840,20],[1830,-80],[1680,-450],[1680,-1500],[1680,-1870],[1040,-1870],[1040,-1720]]);
 await turn(90);await use();await until(async()=>{const p=await inspect();return p.x>3500;});
 await walkRoute([[3655,-1010],[3300,-1010],[3050,-1010],[2890,-940],[2825,-850],[2425,-800],[2424,-870]]);
 await turn(270);await command("cof_changelevel haehecl");await mapUse("c_start");
 assert.match(await command("cof_changelevel haehecl"),/map=c_start2 landmark=hahaland use=1 touch=1/);
 assert.match(await command("cof_count multi_manager"),/COF\/COUNT multi_manager 29/);
 await walkRoute([[2423,-950],[2380,-1250],[2100,-1250],[2105,-1325]]);await turn(270);
 assert.equal(await padState(),0);assert.equal((await inspect()).frozen,0);
 await milestone("05-natural-return-to-padlock");
 await command("save natural_pad_before");
 const snapshot=`${dir}/snapshot`;fs.mkdirSync(snapshot,{recursive:true});
 const files=await page.evaluate(()=>FS.readdir("/rwdir/cryoffear/save").filter(n=>/\.(sav|HL[123])$/i.test(n)).map(n=>[n,[...FS.readFile(`/rwdir/cryoffear/save/${n}`)]]));
 for(const [name,bytes] of files)fs.writeFileSync(`${snapshot}/${name}`,Buffer.from(bytes));
 const fixture={save:"natural_pad_before",code,source:"cof_computer UI in c_start2",note:`gfx/vgui/640_pass${number}.tga`};
 fs.writeFileSync(`${snapshot}/fixture.json`,JSON.stringify(fixture,null,2));
 assert.deepEqual(errors,[]);
 fs.writeFileSync(`${dir}/natural-result.json`,JSON.stringify({fixture,colored,passed:true},null,2));
 console.log("OK natural round trip; original PC clue",code,"prepared for save/restore regression");
} catch(e){console.error(e.stack);process.exitCode=1; for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:`${dir}/failure.png`}).catch(()=>{});}
finally {fs.writeFileSync(`${dir}/engine.log`,output.join("\n"));fs.writeFileSync(`${dir}/steps.json`,JSON.stringify(steps,null,2));fs.writeFileSync(`${dir}/page-errors.json`,JSON.stringify(errors));await browser.close();}
if(!process.exitCode){process.env.COF_PADLOCK_FIXTURE=`${dir}/snapshot`;process.env.COF_AUDIT_OUTPUT=`${dir}/operations`;await import("./padlock_entities.mjs");}
