// Transition persistence on the real paired c_start/c_start2 BSPs. Remote uses isolate server operations;
// this test does not credit natural player progression.
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";
const dir=process.env.COF_AUDIT_OUTPUT||`transition-regression-${Date.now()}`;
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
 const before=await command("cof_changelevel haehecl");assert.match(before,/map=c_start landmark=hahaland use=1 touch=1/);
 await command("save level_idle");
 let n=output.filter(l=>l.includes("client connected")).length;
 await page.evaluate(()=>CoFDebug.cmd("load level_idle"));
 await until(()=>output.filter(l=>l.includes("client connected")).length>n);
 assert.match(await command("cof_changelevel haehecl"),/map=c_start landmark=hahaland use=1 touch=1/);
 await page.evaluate(()=>CoFPreload("c_start"));
 // Leave the arrival volume with ordinary movement, as in the original route.
 await page.keyboard.down("w");await page.waitForTimeout(700);await page.keyboard.up("w");await page.waitForTimeout(200);
 for(let cycle=0;cycle<2;cycle++) {
  n=output.filter(l=>l.includes("client connected")).length;
  await page.evaluate(()=>CoFDebug.cmd("cof_use haehecl on"));
  await until(()=>output.filter(l=>l.includes("client connected")).length>n);
  await until(async()=>await page.evaluate(()=>CoFCurrentMap())==="c_start");
  assert.match(await command("cof_count multi_manager"),/COF\/COUNT multi_manager 29/);
  assert.match(await command("cof_changelevel haehecl"),/map=c_start2 landmark=hahaland use=1 touch=1/);
  n=output.filter(l=>l.includes("client connected")).length;
  await page.evaluate(()=>CoFDebug.cmd("cof_use haehecl on"));
  await until(()=>output.filter(l=>l.includes("client connected")).length>n);
  await until(async()=>await page.evaluate(()=>CoFCurrentMap())==="c_start2");
  assert.match(await command("cof_changelevel haehecl"),/map=c_start landmark=hahaland use=1 touch=1/);
  console.log("OK original transition round trip",cycle+1);
 }
 assert.deepEqual(errors,[]);
} catch(e){console.error(e.stack);process.exitCode=1;}
finally {fs.writeFileSync(`${dir}/engine.log`,output.join("\n"));fs.writeFileSync(`${dir}/steps.json`,JSON.stringify(steps,null,2));fs.writeFileSync(`${dir}/page-errors.json`,JSON.stringify(errors));await browser.close();}