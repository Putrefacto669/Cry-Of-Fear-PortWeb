// Lighting fixtures are diagnostic map loads, not a campaign progression test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const base=process.argv[2]||'http://127.0.0.1:8100/';
const out=process.argv[3];
assert.ok(out&&!fs.existsSync(out),'Use a new output directory');
fs.mkdirSync(out,{recursive:true});
const maps=process.argv.slice(4);
if(!maps.length)maps.push(...[1,2,3,4,5].map(i=>`c_apartment${i}`));
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const results=[];
try { for(const map of maps){
 const dir=`${out}/${map}`;fs.mkdirSync(dir);
 const context=await browser.newContext({viewport:{width:800,height:600}});
 const page=await context.newPage(),logs=[],errors=[];
 page.on('console',m=>logs.push(m.text()));page.on('pageerror',e=>errors.push(e.message));
 let serial=0,on=false;
 const cmd=async text=>{const start=logs.length,token=`alpha_${++serial}`;await Promise.all([
  page.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${token} `),timeout:30000}),
  page.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${token}`)]);return logs.slice(start).join('\n');};
 const wait=async(fn,timeout=60000)=>{const start=Date.now();while(!await fn()){if(Date.now()-start>timeout)throw Error('state timeout');await page.waitForTimeout(100);}};
 const light=async value=>{if(on!==value){await cmd('flashlight');on=value;}await page.waitForTimeout(600);};
 const aim=async yaw=>{
  await page.mouse.click(400,200);await page.waitForTimeout(250);
  if(!await page.evaluate(()=>!!document.pointerLockElement)){await page.keyboard.press('Tab');await page.keyboard.press('Tab');}
  assert.ok(await page.evaluate(()=>!!document.pointerLockElement),'Pointer Lock');
  const settings=await cmd('sensitivity\nm_yaw\nm_pitch');
  const cv=n=>Number(settings.match(new RegExp('"'+n+'" is "([^"]+)"'))?.[1]);
  const sx=cv('sensitivity')*cv('m_yaw'),sy=cv('sensitivity')*cv('m_pitch');assert.ok(sx>0&&sy>0);
  for(let n=0;n<12;n++){
   const pose=await cmd('viewpos'),m=pose.match(/ang \(\s*([-\d.eE+]+)\s+([-\d.eE+]+)/);assert.ok(m,pose);
   const pitch=Number(m[1]),error=((yaw-Number(m[2])+540)%360)-180;
   if(Math.abs(error)<.04&&Math.abs(pitch)<.04)return;
   await page.evaluate(({dx,dy})=>document.querySelector('canvas').dispatchEvent(new MouseEvent('mousemove',{bubbles:true,movementX:dx,movementY:dy,clientX:0,clientY:0})),{dx:Math.round(-error/sx),dy:Math.round(-pitch/sy)});
   await page.waitForTimeout(150);
  }throw Error('aim did not settle');
 };
 const capture=async(name,png=false)=>{
  const data=await page.evaluate(()=>new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('frame timeout')),30000);
   const fn=()=>{MainLoop.postMainLoop.splice(MainLoop.postMainLoop.indexOf(fn),1);clearTimeout(timer);
    const gl=GL.currentContext.GLctx,w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,p=new Uint8Array(w*h*4);
    gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,p);
    const values=[];let sum=0,dark=0;
    for(let y=h*.35|0;y<(h*.65|0);y++)for(let x=w*.35|0;x<(w*.65|0);x++){
     const i=(y*w+x)*4,v=.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];values.push(v);sum+=v;dark+=v<20;
    }values.sort((a,b)=>a-b);
    resolve({width:w,height:h,mean:sum/values.length,darkFraction:dark/values.length,p10:values[values.length*.1|0],p90:values[values.length*.9|0],glError:gl.getError()});
   };MainLoop.postMainLoop.push(fn);
  }));
  data.pose=await cmd('viewpos');
  if(png)await page.screenshot({path:`${dir}/${name}.png`});
  assert.equal(data.glError,0);return data;
 };
 const profile=async()=>page.evaluate(()=>new Promise((resolve,reject)=>{
  const p=window.__alphaProfile;p.rows=[];p.active=true;
  const timer=setTimeout(()=>{p.active=false;reject(Error('profile timeout'));},30000);
  p.done=()=>{clearTimeout(timer);resolve(p.rows.slice());};
 }));
 const result={map,base,chromium:browser.version(),kind:'automated lighting fixture; no natural progression claim'};
 try{
  console.log(`START ${map}`);
  await page.goto(`${base}?map=${map}&timer=1&fx=0&sw=0&prefetch=0&debug=1`);
  await wait(()=>logs.some(l=>l.includes('client connected')),180000);
  result.serverHash=await page.evaluate(async()=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',FS.readFile('/lib/server.wasm'))),v=>v.toString(16).padStart(2,'0')).join(''));
  if(process.env.COF_EXPECT_SERVER)assert.equal(result.serverHash,process.env.COF_EXPECT_SERVER,'Wrong server module served');
  await cmd('sv_cheats 1\npausable 0');
  await page.waitForTimeout(Number(process.env.COF_LIGHT_WARM_MS||20000));
  await wait(async()=>/frozen=0/.test(await cmd('cof_inspect !player')));
  result.initial=await cmd('cof_inspect !player\nviewpos\ngamma\nbrightness\ngl_overbright\ngl_vbo\nr_dynamic');
  await cmd('cof_give weapon_mobile\ncof_give weapon_switchblade');
  const bag=await cmd('cof_dump'),knife=bag.match(/bag (\d+): weapon_switchblade/);assert.ok(knife,bag);
  await cmd(`cof_equip ${knife[1]}`);
  if(process.env.COF_LIGHT_COMBAT_FIRST==='1'){
   // Diagnostic setup grants an existing weapon; all damage uses normal mouse attacks.
   // This is not evidence of obtaining that weapon through natural progression.
   await cmd('cof_give weapon_glock');
   const dump=await cmd('cof_dump'),slot=dump.match(/bag (\d+): weapon_glock/);assert.ok(slot,dump);
   await cmd(`cof_equip ${slot[1]}`);
   await page.mouse.click(400,200);await page.waitForTimeout(250);
   if(!await page.evaluate(()=>!!document.pointerLockElement)){await page.keyboard.press('Tab');await page.keyboard.press('Tab');}
   const settings=await cmd('sensitivity\nm_yaw\nm_pitch');
   const cv=n=>Number(settings.match(new RegExp('"'+n+'" is "([^"]+)"'))?.[1]);
   const sx=cv('sensitivity')*cv('m_yaw'),sy=cv('sensitivity')*cv('m_pitch');
   result.weaponConfiguration=await cmd('skill\nsk_plr_9mm_bullet1\nsk_cof_glock1');
   if(process.env.COF_TEST_GLOCK_DAMAGE){
    const damage=Number(process.env.COF_TEST_GLOCK_DAMAGE);assert.ok(Number.isInteger(damage)&&damage>0&&damage<25);
    result.configurationProbe=await cmd(`sk_cof_glock1 ${damage}\nsk_cof_glock1`);
   }
   result.combat=[];let held=false,quiet=false;const start=Date.now();
   result.combatScope=process.env.COF_COMBAT_LOCAL==='1'?'Defeat the approaching attacker; other living NPCs remain active beyond 256 units':'All living Faster NPCs within the 512-unit diagnostic dump';
   try{while(Date.now()-start<Number(process.env.COF_COMBAT_MS||45000)){
    const text=await cmd('cof_dump\ncof_list monster_faster\ncof_inspect !player\nviewpos\ncof_weapon_status\ncof_useaim !player');
    const living=[...text.matchAll(/monster monster_faster health ([-\d.]+) dead (\d+) dist ([\d.]+)/g)].filter(m=>Number(m[1])>0&&Number(m[2])===0).map(m=>Number(m[3])).sort((a,b)=>a-b);
    if(!living.length){quiet=true;break;}
    if(process.env.COF_COMBAT_LOCAL==='1'&&living[0]>256&&/monster monster_faster health [-\d.]+ dead [12]/.test(text)){quiet=true;break;}
    const origin=text.match(/COF\/ENTITY !player .*?origin=([-\d.]+),([-\d.]+),([-\d.]+)/),view=text.match(/org \(\s*([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s*\)/),angles=text.match(/ang \(\s*([-\d.eE+]+)\s+([-\d.eE+]+)/);
    assert.ok(origin&&view&&angles,text);
    const po=origin.slice(1).map(Number),eye=view.slice(1).map(Number);
    const targets=[...text.matchAll(/COF\/LIST monster_faster #(\d+) origin=([-\d.]+),([-\d.]+),([-\d.]+)/g)].map(m=>({id:Number(m[1]),p:m.slice(2).map(Number)}));
    for(const t of targets)t.distance=Math.hypot(...t.p.map((v,i)=>v-po[i]));
    const target=targets.sort((a,b)=>Math.abs(a.distance-living[0])-Math.abs(b.distance-living[0]))[0];assert.ok(target);
    const dx=target.p[0]-eye[0],dy=target.p[1]-eye[1],dz=target.p[2]+40-eye[2];
    const yaw=Math.atan2(dy,dx)*180/Math.PI,pitch=-Math.atan2(dz,Math.hypot(dx,dy))*180/Math.PI;
    const error=((yaw-Number(angles[2])+540)%360)-180;
    await page.evaluate(({dx,dy})=>document.querySelector('canvas').dispatchEvent(new MouseEvent('mousemove',{bubbles:true,movementX:dx,movementY:dy,clientX:0,clientY:0})),{dx:Math.round(-error/sx),dy:Math.round((pitch-Number(angles[1]))/sy)});
    const shoot=target.distance<120&&Math.abs(target.p[2]-po[2])<72;
    if(shoot&&!held){await page.mouse.down();held=true;}else if(!shoot&&held){await page.mouse.up();held=false;}
    result.combat.push({elapsedMs:Date.now()-start,target:target.id,distance:target.distance,shoot,livingDistances:living,weapon:text.match(/COF\/WEAPON .*/)?.[0],trace:text.match(/COF\/USEAIM .*/)?.[0],monsters:[...text.matchAll(/monster monster_faster health [-\d.]+ dead \d+ dist [\d.]+/g)].map(m=>m[0])});
    await page.waitForTimeout(150);
   }}finally{if(held)await page.mouse.up();}
   await page.screenshot({path:`${dir}/combat-end.png`});
   assert.ok(quiet,'Nearby enemies were not defeated with normal weapon input');
   result.combatAfter=await cmd('cof_dump\ncof_inspect !player');
   if(process.env.COF_COMBAT_ONLY==='1'){
    assert.match(result.weaponConfiguration,/"sk_cof_glock1" is "13"/);
    // Sampling may miss a nonfatal frame (two shots or a headshot can kill
    // between observations). Require an actual death, never just an ammo delta.
    // HLSDK may assign positive corpse health in Killed; deadflag is the
    // lifecycle state. Do not require a corpse to retain negative health.
    assert.match(result.combatAfter,/monster monster_faster health [-\d.]+ dead [12]/,'No observed lethal damage');
    result.weaponBeforeSave=await cmd('cof_weapon_status');
    const state=s=>s.match(/COF\/WEAPON class=(\S+) clip=(-?\d+) ammo=(-?\d+)/)?.slice(1);
    const before=state(result.weaponBeforeSave);assert.ok(before&&before[0]==='weapon_glock'&&Number(before[1])>0&&Number(before[1])<15);
    await cmd('save alpha_glock');await page.waitForTimeout(700);
    const connected=logs.filter(l=>l.includes('client connected')).length;
    await page.evaluate(()=>CoFDebug.cmd('load alpha_glock'));
    await wait(()=>logs.filter(l=>l.includes('client connected')).length>connected);
    await page.waitForTimeout(1200);result.weaponAfterLoad=await cmd('cof_weapon_status');
    assert.deepEqual(state(result.weaponAfterLoad),before,'Weapon or ammunition changed on restore');
    await page.mouse.down();await page.waitForTimeout(180);await page.mouse.up();await page.waitForTimeout(350);
    result.weaponAfterShot=await cmd('cof_weapon_status');
    assert.ok(Number(state(result.weaponAfterShot)[1])<Number(before[1]),'Restored weapon cannot fire');
    result.errors=errors;assert.equal(errors.length,0);result.result='PASS';
    console.log(`PASS ${map}: actual Glock damage, ammunition, save/load and continued firing`);
    continue;
   }
   await cmd(`cof_equip ${knife[1]}`);await page.waitForTimeout(1500);
  }
  await page.evaluate(()=>{
   const p=window.__alphaProfile={active:false,rows:[],draws:0,uploadCalls:0,uploadBytes:0,uploadMs:0,start:0};
   const gl=GL.currentContext.GLctx;
   for(const name of ['drawArrays','drawElements']){const original=gl[name].bind(gl);gl[name]=(...args)=>{p.draws++;return original(...args);};}
   const upload=gl.texSubImage2D.bind(gl);
   gl.texSubImage2D=(...args)=>{const start=performance.now(),v=upload(...args);p.uploadCalls++;p.uploadMs+=performance.now()-start;
    if(args[6]===gl.RGBA&&args[7]===gl.UNSIGNED_BYTE)p.uploadBytes+=args[4]*args[5]*4;return v;};
   MainLoop.preMainLoop.push(()=>{p.start=performance.now();p.draws=p.uploadCalls=p.uploadBytes=p.uploadMs=0;});
   MainLoop.postMainLoop.push(()=>{if(p.active&&p.draws){p.rows.push({cpuMs:performance.now()-p.start,draws:p.draws,uploadCalls:p.uploadCalls,uploadBytes:p.uploadBytes,uploadMs:p.uploadMs});
    if(p.rows.length===32){p.active=false;p.done();}}});
  });
  await light(true);await cmd('r_cofspot_debug 1');await light(false);
  result.healthBefore=await cmd('cof_weapon_status');
  result.survey=[];
  for(const yaw of [0,90,180,270]){
   await aim(yaw);await light(false);const off=await capture('survey-off');await light(true);const lit=await capture('survey-on');
   result.survey.push({yaw,off,on:lit,gain:lit.mean-off.mean});await light(false);
  }
  const selected=process.env.COF_LIGHT_YAW!==undefined?{yaw:Number(process.env.COF_LIGHT_YAW)}:result.survey.slice().sort((a,b)=>b.gain-a.gain)[0];result.selectedYaw=selected.yaw;
  await aim(selected.yaw);result.profiles=[];
  for(const overbright of [0,1]){
   await light(false);await cmd(`gl_overbright ${overbright}\nr_dynamic 1\nr_cofspot_debug 0`);await page.waitForTimeout(700);
   const off=await capture(`ob${overbright}-off`,true),offCost=await profile();
   await light(true);const lit=await capture(`ob${overbright}-on`,true),onCost=await profile();
   await cmd('r_cofspot_debug 1');await page.waitForTimeout(500);const stats=await cmd('cof_spot_stats\nr_cofspot_fov');
   await cmd('r_cofspot_debug 0\nr_dynamic 0');await page.waitForTimeout(600);const disabled=await capture(`ob${overbright}-disabled`);
   await cmd('r_dynamic 1');
   const nativeTiming=[];
   if(process.env.COF_NATIVE_TIMING==='1'){
    await cmd('r_cofspot_debug 1');const seen=new Set(),start=Date.now();
    while(nativeTiming.length<16){
     if(Date.now()-start>30000)throw Error('native timing sample timeout');
     const text=await cmd('cof_spot_stats'),m=text.match(/COF\/SPOT .*?frame=(\d+).*?lightmapMs=([\d.eE+-]+) spotMs=([\d.eE+-]+)/);
     if(m&&!seen.has(m[1])){seen.add(m[1]);nativeTiming.push({frame:Number(m[1]),lightmapMs:Number(m[2]),spotMs:Number(m[3])});}
    }await cmd('r_cofspot_debug 0');
   }
   result.profiles.push({overbright,off,on:lit,disabled,gain:lit.mean-off.mean,offCost,onCost,stats,nativeTiming});
  }
  await page.waitForTimeout(600);result.beforeSave=await capture('before-save');await cmd(`save alpha_light_${map}`);
  const connected=logs.filter(l=>l.includes('client connected')).length;
  await page.evaluate(n=>CoFDebug.cmd(`load alpha_light_${n}`),map);
  await wait(()=>logs.filter(l=>l.includes('client connected')).length>connected);
  await cmd('viewpos');await page.waitForTimeout(2500);result.afterLoad=await capture('after-load',true);
  await light(false);result.finalOff=await capture('final-off');result.finalPlayer=await cmd('cof_inspect !player');
  result.healthAfter=await cmd('cof_weapon_status');
  const hp=s=>Number(s.match(/COF\/WEAPON .*?health=([-\d.]+)/)?.[1]);
  assert.ok(Number.isFinite(hp(result.healthBefore))&&hp(result.healthBefore)===hp(result.healthAfter),'Health changed during the lighting measurement');
  assert.ok(Math.abs(result.afterLoad.mean-result.beforeSave.mean)<1,'Lighting did not persist through save/load');
  for(const p of result.profiles)assert.ok(Math.abs(p.disabled.mean-p.off.mean)<1,'Dynamic-light negative control differs from baseline');
  result.errors=errors;assert.equal(errors.length,0);result.result='MEASURED';
  console.log(`MEASURED ${map} yaw=${result.selectedYaw} gains=${result.profiles.map(p=>p.gain.toFixed(3))}`);
 }catch(e){result.result='FAILED';result.failure=String(e.stack||e);console.log(`FAIL ${map}: ${e}`);}
 finally{fs.writeFileSync(`${dir}/result.json`,JSON.stringify(result,null,2));fs.writeFileSync(`${dir}/console.log`,logs.join('\n'));results.push(result);await context.close();}
 }}finally{await browser.close();fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));}
if(results.some(r=>r.result==='FAILED'))process.exitCode=1;
