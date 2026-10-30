// Callback regression on real c_start2 buttons. Remote uses isolate server operations;
// this test does not credit natural player progression.
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";
const dir=process.env.COF_AUDIT_OUTPUT||`button-regression-${Date.now()}`;
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
 await page.goto(`${process.argv[2]||"http://127.0.0.1:8095/"}?map=c_start2&timer=1&fx=0&sw=0&prefetch=1&debug=1`,{waitUntil:"domcontentloaded"});
 await until(()=>output.some(l=>l.includes("client connected")));
 await command("sv_cheats 1");
 const before=await command("cof_inspect *19");console.log("BEFORE",before);assert.match(before,/ use=1 /);
 await command("save button_idle");
 const count=output.filter(l=>l.includes("client connected")).length;
 await page.evaluate(()=>CoFDebug.cmd("load button_idle"));
 await until(()=>output.filter(l=>l.includes("client connected")).length>count);
 const after=await command("cof_inspect *19");console.log("AFTER",after);
 const expected="1";assert.match(after,new RegExp(" use="+expected+" "));
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
