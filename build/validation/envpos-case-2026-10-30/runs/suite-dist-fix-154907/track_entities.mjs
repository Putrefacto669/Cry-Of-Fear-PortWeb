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
  await page.goto(`${base}?map=c_intro&timer=1&fx=0&sw=0&prefetch=0&debug=1`,{waitUntil:"domcontentloaded"});
  await until(()=>output.some(l=>l.includes("client connected")));
  await command("sv_cheats 1\nr_norefresh 1\npausable 0");
  const track=async()=>{
    const text=await command("cof_train infokus2");
    const line=text.split("\n").find(l=>l.includes("COF/TRACKTRAIN infokus2 "));
    assert.ok(line,text);
    return Object.fromEntries([...line.matchAll(/(\w+)=([^\s]*)/g)].map(([,k,v])=>[k,v]));
  };
  let before;
  await until(async()=>{before=await track();return before.think==="1" && +before.speed!==0;});
  await command("cof_use 2inkamera2 on");
  assert.equal((await camera("2inkamera2")).look,"infokus2");
  await save("track_moving");
  await load("track_moving");
  let restored=await track();
  for(const k of ["think","maxspeed","start","dir","height","length"])
    assert.equal(restored[k],before[k],`tracktrain lost ${k}: ${JSON.stringify(restored)}`);
  // This real path is a 3-point loop only a few units wide: a node can
  // legitimately change between the command snapshots while moving at 10 u/s.
  assert.ok(["instopp1","instopp2","instopp3"].includes(restored.path));
  assert.ok(Math.abs((+restored.next- +restored.local)-(+before.next- +before.local))<0.6);
  assert.equal((await camera("2inkamera2")).look,"infokus2");
  assert.equal((await camera("2inkamera2")).state,"1");
  await until(async()=>+(await track()).now> +restored.now+1);
  assert.notEqual((await track()).pos,restored.pos);
  console.log("OK real c_intro infokus2: path reference, configuration and Next survive restore; paired camera keeps following");
  await command("cof_use infokus2 off");
  const stopped=await track();
  assert.equal(stopped.vel,"0,0,0");
  await save("track_stopped");
  await load("track_stopped");
  restored=await track();
  assert.equal(restored.pos,stopped.pos);
  assert.equal(restored.vel,"0,0,0");
  assert.equal(+restored.next,0);
  assert.equal(restored.path,stopped.path);
  await until(async()=>+(await track()).now> +restored.now+0.4);
  assert.equal((await track()).pos,stopped.pos);
  await command("cof_use infokus2 on");
  await until(async()=>(await track()).pos!==stopped.pos);
  console.log("OK tracktrain stopped state remains idle and an explicit normal Use resumes the same track");
  assert.deepEqual(errors,[]);
  fs.writeFileSync("track-entities.log",output.join("\n"));
} catch(e) {
  fs.writeFileSync("track-entities-failure.log",output.join("\n")+"\nPAGE_ERRORS "+JSON.stringify(errors));
  throw e;
} finally {await browser.close();}
