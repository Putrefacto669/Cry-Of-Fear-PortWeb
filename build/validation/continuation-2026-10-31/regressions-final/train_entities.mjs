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
  const train=async name=>{
    const text=await command(`cof_train ${name}`);
    const line=text.split("\n").find(l=>l.includes(`COF/TRAIN ${name} `));
    assert.ok(line,text);
    return Object.fromEntries([...line.matchAll(/(\w+)=([^\s]*)/g)].map(([,k,v])=>[k,v]));
  };
  let before;
  await until(async()=>{before=await train("fokus3");return before.think==="2";});
  assert.equal(before.done,"1");
  assert.equal(before.current,"1stopp2");
  assert.equal((await camera("kamera3")).look,"fokus3");
  await save("train_moving");
  await load("train_moving");
  const restored=await train("fokus3");
  for(const k of ["think","done","active","current","target","final","vel"])
    assert.equal(restored[k],before[k],`train lost ${k}: ${JSON.stringify(restored)}`);
  assert.ok(Math.abs((+restored.next- +restored.local)-(+before.next- +before.local))<1);
  assert.equal((await camera("kamera3")).look,"fokus3");
  await until(async()=>+(await train("fokus3")).now> +restored.now+1);
  assert.notEqual((await train("fokus3")).pos,restored.pos);
  await until(async()=>(await train("fokus3")).current==="1stopp1");
  console.log("OK real fokus3: in-flight callbacks, destination, local deadline, arrival and next segment survive load; kamera3 keeps its target");
  // A user stop may retain callback pointers with nextthink=0; that must stay idle.
  await command("cof_fire fokus3");
  const stopped=await train("fokus3");
  assert.equal(+stopped.next,0);
  assert.equal(stopped.vel,"0,0,0");
  await save("train_stopped");
  await load("train_stopped");
  let after=await train("fokus3");
  assert.equal(after.pos,stopped.pos);
  assert.equal(after.current,stopped.current);
  assert.equal(+after.next,0);
  await until(async()=>+(await train("fokus3")).now> +after.now+0.4);
  assert.equal((await train("fokus3")).pos,after.pos);
  console.log("OK user-stopped train restores without automatic departure or teleport");

  // Use the actual BSP train/brush with controlled runtime path_corner fixtures.
  // The original managers and camera references remain present.
  const center=after.center.split(",").map(Number);
  const key=(name,k,v)=>`cof_setkey ${name} ${k} ${JSON.stringify(String(v))}`;
  const points=[[12,0,0],[24,0,0],[36,0,0],[120,40,0]].map(v=>v.map((x,i)=>x+center[i]));
  const cmds=[];
  for(let i=0;i<4;i++) {
    const name=`train_path${i}`, mark=`train_mark${i}`;
    cmds.push(`cof_spawn path_corner ${name}`,key(name,"origin",points[i].join(" ")),
      key(name,"speed",12),key(name,"wait",i===0?3:0),
      key(name,"spawnflags",4+(i===1?1:i===3?3:0)),
      key(name,"message",mark),`cof_spawn subtitle_main ${mark}`,key(mark,"linenumber",7101+i));
    if(i<3)cmds.push(key(name,"target",`train_path${i+1}`));
  }
  cmds.push(key("fokus3","target","train_path0"),"cof_fire fokus3");
  const start=output.length;
  await command(cmds.join("\n"));
  const marks=n=>[...output.slice(n).join("\n").matchAll(/COF\/HUD SUB (710[1-4])/g)].map(m=>+m[1]);
  await until(async()=>{const t=await train("fokus3");return t.current==="train_path0"&&t.think==="1";});
  const waiting=await train("fokus3");
  assert.equal(waiting.vel,"0,0,0");
  assert.deepEqual(marks(start),[7101]);
  await save("train_waiting");
  const resuming=output.length;
  await load("train_waiting");
  after=await train("fokus3");
  assert.equal(after.think,"1");
  assert.equal(after.current,waiting.current);
  assert.equal(after.pos,waiting.pos);
  assert.ok(Math.abs((+after.next- +after.local)-(+waiting.next- +waiting.local))<1);
  assert.deepEqual(marks(resuming),[],"arrival must not replay on load");
  await until(async()=>{const t=await train("fokus3");return t.current==="train_path1"&&+t.next===0;});
  assert.deepEqual(marks(resuming),[7102]);
  const parked=await train("fokus3");
  await save("train_retrigger");
  await load("train_retrigger");
  after=await train("fokus3");
  assert.equal(after.pos,parked.pos);
  assert.equal(+after.next,0);
  assert.equal(after.vel,"0,0,0");
  console.log("OK timed wait resumes its remaining local delay; wait-for-trigger remains parked; pass targets do not replay");
  await command("cof_fire fokus3"); // Explicit normal retrigger, after verifying restored idle state.
  assert.equal((await train("fokus3")).current,"train_path2");
  await save("train_before_teleport");
  const tele=output.length;
  await load("train_before_teleport");
  await until(()=>marks(tele).includes(7104));
  assert.deepEqual(marks(tele),[7103,7104]);
  const final=await train("fokus3");
  assert.equal(final.current,"train_path3");
  assert.equal(+final.next,0);
  assert.equal(final.vel,"0,0,0");
  final.center.split(",").map(Number).forEach((x,i)=>assert.ok(Math.abs(x-points[3][i])<0.15));
  console.log("OK moving restore reaches next node then honors the original teleport/retrigger flags and target order");
  assert.deepEqual(errors,[]);
  fs.writeFileSync("train-entities.log",output.join("\n"));
} catch(e) {
  fs.writeFileSync("train-entities-failure.log",output.join("\n")+"\nPAGE_ERRORS "+JSON.stringify(errors));
  throw e;
} finally {await browser.close();}
