// Camera persistence against the actual server WASM and prepared maps.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
const browser = await chromium.launch({args:["--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"]});
const output=[], errors=[];
const base=process.argv[2] || "http://127.0.0.1:8095/";
let serial=0;
try {
  const page=await browser.newPage({viewport:{width:640,height:360}});
  page.on("console",m=>output.push(m.text()));
  page.on("pageerror",e=>errors.push(e.message));
  const until=async fn=>{
    const start=Date.now();
    while(!await fn()) {
      if(Date.now()-start>60000) throw new Error("camera state timeout");
      await page.waitForTimeout(100);
    }
  };
  const command=async text=>{
    const start=output.length, token=`camera_${++serial}`;
    await Promise.all([
      page.waitForEvent("console",{predicate:m=>m.text().includes(`COF/FENCE ${token} `),timeout:30000}),
      page.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${token}`),
    ]);
    return output.slice(start).join("\n");
  };
  const camera=async name=>{
    const text=await command(`cof_camera ${name}`);
    const line=text.split("\n").find(l=>l.includes(`COF/CAMERA ${name} `));
    assert.ok(line,`camera diagnostic missing: ${text}`);
    return Object.fromEntries([...line.matchAll(/(\w+)=([^\s]*)/g)].map(([,k,v])=>[k,v]));
  };
  const save=async name=>{
    await command(`save ${name}`);
    assert.ok(await page.evaluate(n=>FS.analyzePath(`/rwdir/cryoffear/save/${n}.sav`).exists,name));
  };
  const load=async name=>{
    const count=output.filter(l=>l.includes("client connected")).length;
    await page.evaluate(n=>CoFDebug.cmd(`load ${n}`),name);
    await until(()=>output.filter(l=>l.includes("client connected")).length>count);
    await command("r_norefresh 1"); // Do not unfreeze: camera control is under test.
  };
  await page.goto(`${base}?map=c_start&timer=1&fx=0&sw=0&prefetch=0&debug=1`,{waitUntil:"domcontentloaded"});
  await until(()=>output.some(l=>l.includes("client connected")));
  await command("sv_cheats 1\nr_norefresh 1\npausable 0");
  assert.match(await command("cof_count multi_manager"),/COF\/COUNT multi_manager 29/);
  let before;
  await until(async()=>{before=await camera("kamera3");return before.state==="1";});
  assert.equal(before.think,"1");
  assert.equal(before.look,"fokus3");
  assert.equal(before.route,"1stop1");
  assert.equal(before.path,"1stop2");
  assert.equal(+before.wait,44);
  assert.match(await command("cof_inspect !player"),/frozen=1/);
  await save("camera_active");
  await load("camera_active");
  const restored=await camera("kamera3");
  for(const key of ["state","think","look","route","path","player","wait","initial","accel","decel"])
    assert.equal(restored[key],before[key],`active camera lost ${key}: ${JSON.stringify(restored)}`);
  assert.ok(Math.abs(+restored.remaining- +before.remaining)<1,"remaining duration must survive restore");
  assert.match(await command("cof_inspect !player"),/frozen=1/);
  await until(async()=>+(await camera("kamera3")).now > +restored.now+1);
  const progressed=await camera("kamera3");
  assert.notEqual(progressed.pos,restored.pos,"camera path must continue moving");
  assert.ok(+progressed.distance < +restored.distance,"current segment must continue, not restart");
  console.log("OK real kamera3: active callback, target, player, path, configuration and remaining time survive load; movement continues");
  await command("cof_use kamera3 off");
  await until(async()=>+(await camera("kamera3")).next===0);
  assert.equal((await camera("kamera3")).state,"0");
  await save("camera_stopped");
  await load("camera_stopped");
  assert.equal((await camera("kamera3")).state,"0");
  assert.equal(+(await camera("kamera3")).next,0);
  console.log("OK interrupted camera remains stopped after restore");
  // Allow all original startup managers to complete before independent uses.
  await until(async()=>+(await camera("kamera3")).now>48);
  await save("camera_idle");
  await load("camera_idle");
  assert.equal((await camera("ckamera3")).state,"0");
  await command("cof_use ckamera3 on");
  const started=await camera("ckamera3");
  assert.equal(started.state,"1");
  assert.equal(started.look,"cfokus3");
  await save("camera_short");
  await load("camera_short");
  assert.equal((await camera("ckamera3")).state,"1");
  await until(async()=> (await camera("ckamera3")).state==="0");
  assert.match(await command("cof_inspect !player"),/frozen=0/);
  await save("camera_finished");
  await load("camera_finished");
  assert.equal((await camera("ckamera3")).state,"0");
  assert.equal(+(await camera("ckamera3")).next,0);
  await command("cof_use ckamera3 on");
  assert.equal((await camera("ckamera3")).state,"1");
  await command("cof_use ckamera3 off");
  console.log("OK real ckamera3: idle Use, active save/load, natural completion, control return and reuse");
  assert.deepEqual(errors,[]);
  fs.writeFileSync("camera-entities.log",output.join("\n"));
} catch(e) {
  fs.writeFileSync("camera-entities-failure.log",output.join("\n")+"\nPAGE_ERRORS "+JSON.stringify(errors));
  throw e;
} finally {await browser.close();}
