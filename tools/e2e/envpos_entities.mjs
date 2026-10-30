// Sky marker integration against the actual server WASM and prepared maps.
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
      if(Date.now()-start>60000) throw new Error("sky state timeout");
      await page.waitForTimeout(100);
    }
  };
  const command=async text=>{
    const start=output.length, token=`envpos_${++serial}`;
    await Promise.all([
      page.waitForEvent("console",{predicate:m=>m.text().includes(`COF/FENCE ${token} `),timeout:30000}),
      page.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${token}`),
    ]);
    return output.slice(start).join("\n");
  };
  const save=async name=>{
    await command(`save ${name}`);
    assert.ok(await page.evaluate(n=>FS.analyzePath(`/rwdir/cryoffear/save/${n}.sav`).exists,name));
  };
  const load=async name=>{
    const count=output.filter(l=>l.includes("client connected")).length;
    await page.evaluate(n=>CoFDebug.cmd(`load ${n}`),name);
    await until(()=>output.filter(l=>l.includes("client connected")).length>count);
    await command("r_norefresh 0");
  };
  const state=async()=>{
    const text=await command("cof_sky_status\ncof_sky_render_status");
    return {text,client:text.split("\n").find(l=>l.includes("COF/SKY mask=")),renderer:text.split("\n").find(l=>l.includes("COF/SKY_RENDER "))};
  };
  const parse=line=>Object.fromEntries([...line.matchAll(/(\w+)=([^\s]*)/g)].map(([,k,v])=>[k,v]));
  await page.goto(`${base}?map=c_start&timer=1&fx=0&sw=0&prefetch=0&debug=1`,{waitUntil:"domcontentloaded"});
  await until(()=>output.some(l=>l.includes("client connected")));
  await command("sv_cheats 1\nr_norefresh 0\npausable 0");
  let current;
  await until(async()=>{current=await state();return current.renderer&&parse(current.renderer).draws>0;});
  const c=parse(current.client),r=parse(current.renderer);
  assert.equal(c.valid,"3");assert.equal(+c.scale,80);
  assert.equal(+c.ambient,32);assert.equal(+c.direct,25);
  assert.equal(+r.active,1);assert.ok(+r.polys>0);
  assert.equal(+r.ambient,32);assert.equal(+r.direct,25);
  const view=r.view.split(",").map(Number),world=c.world.split(",").map(Number),sky=c.sky.split(",").map(Number);
  r.offset.split(",").map(Number).forEach((v,i)=>assert.ok(Math.abs(v-(view[i]-sky[i]-(view[i]-world[i])/80))<0.02));
  console.log("OK c_start: original marker protocol, ambient/direct values, parallax equation and actual sky model polygons");
  assert.match(await command("cof_count multi_manager"),/COF\/COUNT multi_manager 29/);
  // Save the real markers while all four startup managers remain active.
  await save("envpos_original");
  await load("envpos_original");
  await until(async()=>{current=await state();return current.client&&parse(current.client).valid==="3"&&+parse(current.renderer).polys>0;});
  for(const key of ["scale","world","sky","ambient","direct"]) assert.equal(parse(current.client)[key],c[key],`restored ${key}`);
  console.log("OK original markers and sky rendering restored during multiscene1");
  // Named, disposable point fixtures exercise field persistence without editing the BSP.
  await command('cof_spawn envpos_world sky_test_world\ncof_spawn envpos_sky sky_test_sky\ncof_setkey sky_test_world origin "100 200 300"\ncof_setkey sky_test_world health 40\ncof_setkey sky_test_sky origin "10 20 30"\ncof_setkey sky_test_sky spawnflags 3\ncof_setkey sky_test_sky skin 41\ncof_setkey sky_test_sky body 17\ncof_sky_sync !player');
  await until(async()=>parse((await state()).client).scale==="40");
  await save("envpos_fields");
  await command("cof_setkey sky_test_world health 0\ncof_setkey sky_test_sky spawnflags 0\ncof_sky_sync !player");
  await until(async()=>parse((await state()).client).scale==="0");
  current=await state();
  // The original map pair is sent first; omitted fields retain its light values.
  assert.equal(parse(current.client).ambient,"32");assert.equal(parse(current.client).direct,"25");
  await command("cof_setkey sky_test_sky spawnflags 1\ncof_setkey sky_test_sky skin 19\ncof_setkey sky_test_sky body 99\ncof_sky_sync !player");
  await until(async()=>parse((await state()).client).ambient==="19");
  assert.equal(parse((await state()).client).direct,"25");
  await command("cof_setkey sky_test_sky spawnflags 2\ncof_setkey sky_test_sky skin 99\ncof_setkey sky_test_sky body 23\ncof_sky_sync !player");
  await until(async()=>parse((await state()).client).direct==="23");
  assert.equal(parse((await state()).client).ambient,"32");
  const zero=parse(current.renderer);zero.offset.split(",").map(Number).forEach((v,i)=>assert.ok(Math.abs(v-(+zero.view.split(",")[i]-[10,20,30][i]))<.02));
  await load("envpos_fields");
  await until(async()=>parse((await state()).client).scale==="40");
  const restored=parse((await state()).client);
  for(const [key,value] of Object.entries({world:"100,200,300",sky:"10,20,30",ambient:"41",direct:"17"})) assert.equal(restored[key],value);
  console.log("OK marker fields, optional-light flags, zero divisor, updates and saved field restoration");
  // Return to the original markers, and let the unmodified introduction finish.
  await load("envpos_original");
  await until(async()=>+(parse((await command("cof_camera kamera3")).split("\n").find(l=>l.includes("COF/CAMERA kamera3 "))).now)>48);
  await command('cof_setkey !player movetype 8\ncof_goto 992 -2178 -739\ncof_setkey !player v_angle "-85 0 0"\ncof_setkey !player angles "-85 0 0"\ncof_setkey !player fixangle 1\nhud_draw 0\nr_drawviewmodel 0');
  await command("+lookup");await page.waitForTimeout(800);await command("-lookup\nviewpos");
  const capture=async name=>{
    const data=await page.evaluate(()=>new Promise(resolve=>{
      const fn=()=>{const i=MainLoop.postMainLoop.indexOf(fn);MainLoop.postMainLoop.splice(i,1);resolve(document.getElementById("canvas").toDataURL("image/png"));};
      MainLoop.postMainLoop.push(fn);
    }));
    fs.writeFileSync(name,Buffer.from(data.split(",")[1],"base64"));
    return page.evaluate(async data=>{
      const image=new Image();image.src=data;await image.decode();const canvas=document.createElement("canvas");canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext("2d");ctx.drawImage(image,0,0);return [...ctx.getImageData(0,0,canvas.width,Math.floor(canvas.height*.75)).data];
    },data);
  };
  await command("gl_customsky 1");await page.waitForTimeout(200);
  const enabled=await capture("envpos-sky-enabled.png");
  await command("gl_customsky 0");await page.waitForTimeout(200);
  assert.equal(parse((await state()).renderer).active,"0");
  const disabled=await capture("envpos-sky-disabled.png");
  let different=0;for(let i=0;i<enabled.length;i+=4) if(Math.abs(enabled[i]-disabled[i])+Math.abs(enabled[i+1]-disabled[i+1])+Math.abs(enabled[i+2]-disabled[i+2])>15) different++;
  assert.ok(different>500,`sky must affect rendered pixels: ${different}`);
  await command("gl_customsky 1");
  console.log(`OK actual canvas comparison: ${different} pixels change with the original gl_customsky switch`);
  for(const [map,world,sky] of [
    ["c_start2","678,1542,-503","612,2910,-1173"],
    ["c_intro","2737,-1742,-643","2671,-374,-1313"],
    ["c_game_menu1","-1965,342,75","-2058,1710,-1121"],
  ]) {
    assert.ok(await page.evaluate(name=>CoFPreload(name),map),`mount ${map}`);
    const count=output.filter(l=>l.includes("client connected")).length;
    await page.evaluate(name=>CoFDebug.cmd(`changelevel ${name}`),map);
    await until(()=>output.filter(l=>l.includes("client connected")).length>count);
    await command("sv_cheats 1\nr_norefresh 0\npausable 0\ngl_customsky 1");
    await until(async()=>{current=await state();return current.renderer&&+parse(current.renderer).polys>0;});
    const info=parse(current.client);
    assert.equal(info.valid,"3");assert.equal(info.world,world);assert.equal(info.sky,sky);
    assert.equal(info.scale,"80");assert.equal(info.ambient,"32");assert.equal(info.direct,"25");
    console.log(`OK map transition ${map}: actual marker pair and rendered sky polygons`);
  }
  assert.ok(await page.evaluate(()=>CoFPreload("c_apartment1")));
  const count=output.filter(l=>l.includes("client connected")).length;
  await page.evaluate(()=>CoFDebug.cmd("changelevel c_apartment1"));
  await until(()=>output.filter(l=>l.includes("client connected")).length>count);
  await command("r_norefresh 0");
  const empty=await state();assert.equal(parse(empty.client).valid,"0");assert.equal(parse(empty.renderer).active,"0");
  assert.equal(parse(empty.client).ambient,"-1");assert.equal(parse(empty.client).direct,"-1");
  console.log("OK transition without markers clears client and renderer state");
  assert.deepEqual(errors,[]);
  fs.writeFileSync("envpos-entities.log",output.join("\n"));
} catch(e) {
  fs.writeFileSync("envpos-entities-failure.log",output.join("\n")+"\nPAGE_ERRORS "+JSON.stringify(errors));
  throw e;
} finally {await browser.close();}

