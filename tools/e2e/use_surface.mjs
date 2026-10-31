// Diagnostic E-selection regression; debug player positioning reproduces float inputs.
// This test never credits natural progression and never moves an enemy or disables collision.
// Relative mouse events enter SDL normally; no game angle setters are used.
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";

const fixtureDir=process.env.COF_USE_FIXTURE;
assert.ok(fixtureDir,"Set COF_USE_FIXTURE to the natural_gate checkpoint directory");
const fixture=JSON.parse(fs.readFileSync(`${fixtureDir}/provenance.json`,"utf8"));
assert.equal(fixture.source,"normal-input traversal");
assert.equal(fixture.map,"c_start");
assert.match(fixture.save,/^[a-zA-Z0-9_]+$/);
const dir=process.env.COF_AUDIT_OUTPUT||`use-surface-${Date.now()}`;
fs.mkdirSync(dir,{recursive:true});
assert.ok(!fs.existsSync(`${dir}/engine.log`),"Choose a new evidence directory");
const browser=await chromium.launch({args:["--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"]});
const output=[],errors=[],aims=[];let serial=0;
try {
 const page=await browser.newPage({viewport:{width:640,height:480}});
 page.on("console",m=>output.push(m.text()));page.on("pageerror",e=>errors.push(e.message));
 const until=async fn=>{const start=Date.now();while(!await fn()){assert.ok(Date.now()-start<60000,"use surface state timeout");await page.waitForTimeout(100);}};
 const command=async text=>{const start=output.length,token=`surface_${++serial}`;
  await Promise.all([page.waitForEvent("console",{predicate:m=>m.text().includes(`COF/FENCE ${token} `),timeout:30000}),page.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${token}`)]);return output.slice(start).join("\n");};
 const hold=async(key,ms)=>{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);await page.waitForTimeout(50);};
 await page.goto(`${process.argv[2]||"http://127.0.0.1:8099/"}?map=c_start&timer=1&sw=0&prefetch=1&debug=1`);
 await until(()=>output.some(l=>l.includes("client connected")));
 const files=fs.readdirSync(fixtureDir).filter(n=>/\.(sav|HL[123])$/i.test(n)).map(n=>[n,[...fs.readFileSync(`${fixtureDir}/${n}`)]]);
 await page.evaluate(files=>{FS.mkdirTree("/rwdir/cryoffear/save");for(const [n,b] of files)FS.writeFile(`/rwdir/cryoffear/save/${n}`,new Uint8Array(b));},files);
 const connected=output.filter(l=>l.includes("client connected")).length;
 await page.evaluate(n=>CoFDebug.cmd(`load ${n}`),fixture.save);
 await until(()=>output.filter(l=>l.includes("client connected")).length>connected);
 await command("sv_cheats 1");
 assert.match(await command("cof_padlock"),/state=0 owner=0 /);
 if(!await page.evaluate(()=>!!document.pointerLockElement)) {
  await page.keyboard.press("Tab");
  await page.locator("#cof-bag").waitFor({state:"visible",timeout:30000});
  await page.keyboard.press("Tab");
  await until(()=>page.evaluate(()=>!!document.pointerLockElement));
 }
 let edge;
 for(let i=0;i<40;i++) {
  const y=-1320.8125+(i%16)*0.0625;
  await command(`cof_goto 2105.1875 ${y} -731`);
  const text=await command("cof_useaim !player\nviewpos");aims.push(text);
  const door=+text.match(/candidate=sd_door1 class=inter_door dot=([-\d.eE+]+)/)?.[1];
  const button=+text.match(/candidate=padbutton class=func_button dot=([-\d.eE+]+)/)?.[1];
  if(/hit=padbutton class=func_button /.test(text)&&door>button&&door-button<=2*2**-23) {edge={door,button,difference:door-button,text};break;}
  // Headless CDP absolute movement produces a cancelling warp under Pointer Lock.
  // Send the same relative DOM input SDL receives from a mouse, without that warp.
  await page.evaluate(dx=>document.getElementById("canvas").dispatchEvent(new MouseEvent("mousemove",{bubbles:true,movementX:dx,movementY:0,clientX:0,clientY:0})),i%16<8?15:-15);
  await page.waitForTimeout(100);

 }
 assert.ok(edge,"Did not reproduce a nonzero float near-tie; exact ties do not cover this regression");
 await page.screenshot({path:`${dir}/before-e.png`});
 await hold("e",120);
 await until(async()=>/state=1 owner=1 /.test(await command("cof_padlock")));
 await page.locator("#cof-padlock").waitFor({state:"visible",timeout:30000});
 await page.screenshot({path:`${dir}/after-e.png`});
 assert.deepEqual(errors,[]);
 fs.writeFileSync(`${dir}/result.json`,JSON.stringify({passed:true,diagnosticOnly:true,fixture,edge,browser:browser.version(),aims},null,2));
 console.log("OK native E selects the visible padbutton despite a slightly larger rounded dot product for the door behind it");
} finally {
 fs.writeFileSync(`${dir}/engine.log`,output.join("\n"));
 fs.writeFileSync(`${dir}/page-errors.json`,JSON.stringify(errors));
 await browser.close();
}
