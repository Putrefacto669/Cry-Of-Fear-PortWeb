// Reproduces "the Glock does not reload in dual": phone + Glock from the real bag, shoot, press R
// (with a partial and with an empty magazine), and record clip/ammo/reload state, the view model
// sequence and screenshots during the reload. Usage: node dual_glock_reload_probe.mjs <base url> <new output dir>
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(base&&out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),ctx=await browser.newContext({viewport:{width:800,height:600},screen:{width:800,height:600}}),p=await ctx.newPage(),logs=[],errors=[],r={steps:[]};let serial=0;
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
try{
 const wait=async(fn,what)=>{const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<60000,`${what} timeout`);await p.waitForTimeout(100);}};
 const cmd=async text=>{const i=logs.length,t=`gr_${++serial}`;await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${t} `),timeout:30000}),p.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${t}`)]);return logs.slice(i).join('\n');};
 const state=async label=>{const w=await cmd('cof_weapon_status');const h=await cmd('cof_hands_render');
  const s={label,weapon:(w.match(/COF\/WEAPON .*/)||[''])[0],phone:(w.match(/COF\/PHONE .*/)||[''])[0],hands:(h.match(/COF\/HANDSCLIENT .*/)||[''])[0]};r.steps.push(s);return s;};
 const num=(s,k)=>Number(s.weapon.match(new RegExp(`${k}=(-?[\\d.]+)`))?.[1]);
 await p.goto(`${base}?map=c_apartment1&sw=0&fx=0&timer=1&prefetch=0&debug=1`);await wait(()=>logs.some(l=>l.includes('client connected')),'connect');
 await cmd('sv_cheats 1\nr_norefresh 0\ncof_weapon_debug 1');await wait(async()=>/frozen=0 /.test(await cmd('cof_inspect !player')),'unfrozen');
 await p.mouse.click(400,200);await p.waitForFunction(()=>document.pointerLockElement?.id==='canvas');
 await cmd('cof_give weapon_mobile\ncof_give weapon_glock\ncof_give ammo_glock\ncof_give ammo_glock');const bag=await cmd('cof_dump');
 const slots=Object.fromEntries([...bag.matchAll(/bag (\d+): (weapon_\w+)/g)].map(m=>[m[2],+m[1]]));
 await p.locator('#canvas').focus();await p.keyboard.press('Tab');await p.locator('#cof-bag.on').waitFor();await p.locator(`[data-item="${slots.weapon_mobile}"]`).click();await p.locator('#cof-bag .menu.on [data-act="dual"]').click();await p.locator(`[data-item="${slots.weapon_glock}"]`).click();await p.locator('#cof-bag.on').waitFor({state:'hidden'});
 await wait(async()=>/class=weapon_glock/.test(await cmd('cof_weapon_status')),'glock dual');await p.waitForTimeout(2000);
 await p.locator('#canvas').focus();
 // Real original ammunition entity of the map (as Codex's hands_arm_regression does).
 const rows=await cmd('cof_callbacks !all');const box=rows.split('\n').find(l=>/class=ammo_glock /.test(l)&&!/touch=0:0 /.test(l));assert.ok(box,'ammo_glock entity');
 await cmd(`cof_goto #${box.match(/id=(\d+)/)[1]}`);await wait(async()=>/ammo=[1-9]/.test(await cmd('cof_weapon_status')),'ammo pickup');await p.waitForTimeout(500);
 let s=await state('dual ready');r.dual=/dual=1/.test(s.phone);
 // shoot three rounds with the real mouse button
 for(let i=0;i<3;i++){await p.mouse.down();await p.waitForTimeout(80);await p.mouse.up();await p.waitForTimeout(400);}
 s=await state('after 3 shots');
 // real R key, partial magazine
 await p.keyboard.down('r');await p.waitForTimeout(120);await p.keyboard.up('r');
 for(let i=0;i<8;i++){await p.waitForTimeout(450);await state(`partial reload t+${(i+1)*0.45}s`);await p.screenshot({path:`${out}/partial-${i}.png`});}
 s=await state('partial reload end');r.partial={clip:num(s,'clip'),ammo:num(s,'ammo'),reload:num(s,'reload')};
 // empty the magazine, then R again
 for(let i=0;i<20 && num(await state('emptying'),'clip')>0;i++){await p.mouse.down();await p.waitForTimeout(80);await p.mouse.up();await p.waitForTimeout(330);}
 s=await state('empty');
 await p.keyboard.down('r');await p.waitForTimeout(120);await p.keyboard.up('r');
 for(let i=0;i<10;i++){await p.waitForTimeout(450);await state(`empty reload t+${(i+1)*0.45}s`);await p.screenshot({path:`${out}/empty-${i}.png`});}
 s=await state('empty reload end');r.empty={clip:num(s,'clip'),ammo:num(s,'ammo'),reload:num(s,'reload')};
 r.errors=errors;
}catch(e){r.failure=String(e.stack||e);console.error(e);process.exitCode=1;}finally{r.chromium=browser.version();fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await ctx.close();await browser.close();}
console.log(JSON.stringify({partial:r.partial,empty:r.empty}));
