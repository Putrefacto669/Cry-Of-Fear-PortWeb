// Real BSP triggers, native save/load. Inspections do not activate entities.
// This callback regression does not credit a natural campaign walkthrough.
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";

const dir=process.env.COF_AUDIT_OUTPUT||`trigger-persistence-${Date.now()}`;
fs.mkdirSync(dir,{recursive:true});
assert.ok(!fs.existsSync(`${dir}/engine.log`),"Choose a new evidence directory");
const browser=await chromium.launch({args:["--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"]});
const output=[],errors=[],states=[];let serial=0;
try {
 const page=await browser.newPage({viewport:{width:640,height:480}});
 page.on("console",m=>output.push(m.text()));
 page.on("pageerror",e=>errors.push(e.message));
 const until=async fn=>{const start=Date.now();while(!await fn()){assert.ok(Date.now()-start<60000,"trigger state timeout");await page.waitForTimeout(100);}};
 const command=async text=>{
  const start=output.length,token=`trigger_${++serial}`;
  await Promise.all([page.waitForEvent("console",{predicate:m=>m.text().includes(`COF/FENCE ${token} `),timeout:30000}),page.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${token}`)]);
  return output.slice(start).join("\n");
 };
 const inspect=async()=>{
  const text=await command("cof_inspect *35\ncof_inspect *43\ncof_inspect *157\ncof_inspect doorclose2");
  states.push(text);
  for(const model of ["*35","*43","*157"]) {
   const line=text.split("\n").find(l=>l.includes(`COF/ENTITY ${model} `));
   assert.ok(line,text);
   assert.match(line,/class=trigger_(once|multiple) /);
   assert.match(line,/touch=1 /,"unconsumed trigger must retain MultiTouch");
   assert.match(line,/think=0 /,"idle trigger must not acquire a scheduled callback");
   assert.match(line,/next=0 /,"idle deadline must remain zero");
  }
  const door=text.split("\n").find(l=>l.includes("COF/ENTITY doorclose2 "));
  assert.match(door,/class=func_door_rotating /);
  assert.match(door,/touch=1 /);
  assert.match(door,/toggle=1 next=0 /,"original start-open door state must persist");
 };
 await page.goto(`${process.argv[2]||"http://127.0.0.1:8097/"}?map=c_start&timer=1&sw=0&prefetch=1&debug=1`);
 await until(()=>output.some(l=>l.includes("client connected")));
 await command("sv_cheats 1");
 assert.match(await command("cof_count multi_manager"),/COF\/COUNT multi_manager 29/);
 await inspect();
 for(let i=0;i<3;i++) {
  const name=`trigger_idle_${i}`;
  await command(`save ${name}`);
  assert.ok(await page.evaluate(n=>FS.analyzePath(`/rwdir/cryoffear/save/${n}.sav`).exists,name));
  const count=output.filter(l=>l.includes("client connected")).length;
  await page.evaluate(n=>CoFDebug.cmd(`load ${n}`),name);
  await until(()=>output.filter(l=>l.includes("client connected")).length>count);
  await inspect();
 }
 // Diagnostic remote Use tests native moving-door persistence, not progression.
 assert.match(await command("cof_camera ckamera1"),/state=0 /);
 // Save is a client command; forwarded entity commands must finish first.
 const moving=await command("cof_usemodel *42\ncof_inspect doorclose2");
 assert.match(moving,/class=func_door_rotating .*think=1 toggle=[23] /);
 await command("save door_moving");
 let count=output.filter(l=>l.includes("client connected")).length;
 await page.evaluate(()=>CoFDebug.cmd("load door_moving"));
 await until(()=>output.filter(l=>l.includes("client connected")).length>count);
 await until(async()=>/toggle=0 next=-1 /.test(await command("cof_inspect doorclose2")));
 assert.match(await command("cof_camera ckamera1"),/state=0 /,"native door Use must not start multiscene3");
 await command("save door_closed");
 count=output.filter(l=>l.includes("client connected")).length;
 await page.evaluate(()=>CoFDebug.cmd("load door_closed"));
 await until(()=>output.filter(l=>l.includes("client connected")).length>count);
 assert.match(await command("cof_inspect doorclose2"),/toggle=0 next=-1 /);
 assert.deepEqual(errors,[]);
 fs.writeFileSync(`${dir}/result.json`,JSON.stringify({passed:true,restorations:3,models:["*35","*43","*157"],states},null,2));
 console.log("OK real c_start trigger callbacks survive three restores; rotating door preserves idle state, moving completion and stopped clock without firing the scene");
} finally {
 fs.writeFileSync(`${dir}/engine.log`,output.join("\n"));
 fs.writeFileSync(`${dir}/page-errors.json`,JSON.stringify(errors));
 await browser.close();
}
