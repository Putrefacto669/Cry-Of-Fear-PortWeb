import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:Number(process.env.WIDTH||844),height:Number(process.env.HEIGHT||390)},hasTouch:true,isMobile:true});
page.on('pageerror',e=>console.log('PAGE_ERROR',e.message));
page.on('console',m=>{if(/clientonly|cof_web|touch_|\[mobile\]/.test(m.text())) console.log(m.text());});
const [origin, evidence]=process.argv.slice(2);
assert.ok(origin && evidence, 'usage: mobile_controls.mjs ORIGIN NEW_EVIDENCE_DIR');
fs.mkdirSync(evidence, {recursive:false});
const errors=[];
page.on('pageerror', error=>errors.push(error.message));
try {
 await page.goto(origin+'/?sw=0');
 await page.locator('[data-language="spanish"]').tap();
 await page.getByRole('button',{name:'Móvil · Pantalla táctil'}).tap();
 await page.screenshot({path:path.join(evidence,'guide.png')});
 await page.getByRole('button',{name:'Omitir guía'}).tap();
 await page.reload();
 if(!await page.getByRole('button',{name:'Ver guía nuevamente'}).isVisible())throw Error('choice not persisted');
 await page.goto(origin+'/?map=c_start2&input=mobile&sw=0&fx=0&timer=1&prefetch=0&debug=1');
 await page.locator('[data-action="attack"]').waitFor({timeout:90000});
 const cdp=await page.context().newCDPSession(page);
 const r=await page.locator('#canvas').boundingBox();
 console.log('CANVAS',r);
 const logs=[];page.on('console',m=>logs.push(m.text()));
 let serial=0;
 const cmd=async txt=>{
  const mark=logs.length, fence='mobile_'+(++serial);
  await Promise.all([page.waitForEvent('console',{predicate:m=>m.text().includes('COF/FENCE '+fence+' '),timeout:30000}),
   page.evaluate(txt=>CoFDebug.cmd(txt),txt+'\ncof_fence '+fence)]);
  return logs.slice(mark).join('\n');
 };
 await page.waitForTimeout(4000);
 const stickBox=await page.locator('.cof-touch-stick').boundingBox();
 console.log('STICK',stickBox);
 await page.evaluate(()=>{
   window.coftest=[];
   const native=Module.ccall;
   Module.ccall=function(...args){if(args[0]==='Xash_Cmd') window.coftest.push(args[3][0]);return native.apply(this,args);};
 });
 await cmd('sv_cheats 1\ncof_unfreeze !player\ncof_goto 2428 -880 -731');
 const pos=()=>cmd('viewpos');
 const parse=(text,key)=>text.match(new RegExp(key+' \\( ([^)]+) \\)'))?.[1].trim().split(/ +/).map(Number);

 const x=stickBox.x+stickBox.width/2, y=stickBox.y+stickBox.height/2;
 const move=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
 const buttons=await page.locator('.cof-touch-actions button').evaluateAll(nodes=>nodes.map(node=>{
   const {x,y,width,height}=node.getBoundingClientRect();
   return {name:node.dataset.action,x,y,width,height};
 }));
 for(const a of buttons) {
   assert.ok(a.x>=r.x-1&&a.y>=r.y-1&&a.x+a.width<=r.x+r.width+1&&a.y+a.height<=r.y+r.height+1,a.name+' outside canvas');
   for(const d of buttons.filter(d=>d.name!==a.name)) {
      const overlapX=Math.min(a.x+a.width,d.x+d.width)-Math.max(a.x,d.x);
      const overlapY=Math.min(a.y+a.height,d.y+d.height)-Math.max(a.y,d.y);
      if(overlapX>0&&overlapY>0) {
       const gap=Math.hypot(a.x+a.width/2-d.x-d.width/2,a.y+a.height/2-d.y-d.height/2);
       assert.ok(gap>=(a.width+d.width)/2-.3,a.name+' overlaps '+d.name);
      }
   }
 }
 console.log('LAYOUT',JSON.stringify(buttons));
 await page.screenshot({path:path.join(evidence,'layout.png')});
 console.log(await cmd('touch_list'));
 const initial=await pos();
 await move('touchStart',[{x,y,id:1}]);
 await move('touchMove',[{x,y:y+r.height*.10,id:1}]);
 await page.waitForTimeout(1000);
 const moving=await cmd('cof_inspect !player');console.log('MOVING',moving);
 await move('touchEnd',[]);
 const moved=await pos();
 console.log('COMMANDS',await page.evaluate(()=>window.coftest));
 const lookX=r.x+r.width*.63,lookY=r.y+r.height*.32;
 await move('touchStart',[{x:lookX,y:lookY,id:2}]);
 await move('touchMove',[{x:lookX+90,y:lookY+15,id:2}]);
 await move('touchEnd',[]);
 await page.waitForTimeout(400);
 const looked=await pos();
 console.log('POSES',initial,moved,looked);
 assert.ok(Math.hypot(...parse(initial,'org').map((x,i)=>x-parse(moved,'org')[i]))>5,'joystick moves player');
 assert.ok(Math.abs(parse(moved,'ang')[1]-parse(looked,'ang')[1])>5,'drag changes yaw');
 const bag=await cmd('cof_give weapon_glock\ncof_dump');
 const slot=bag.match(/bag (\d+): weapon_glock /)?.[1];assert.ok(slot,bag);
 await cmd('cof_equip '+slot);
 await page.waitForTimeout(1200);
 const clip=async()=>+(await cmd('cof_weapon_status')).match(/class=weapon_glock clip=(\d+)/)?.[1];
 const before=await clip();
 const fire=await page.locator('[data-action="attack"]').boundingBox();
 const firePoint={x:fire.x+fire.width/2,y:fire.y+fire.height/2,id:3};
 const beforeMulti=await pos();
 await move('touchStart',[{x,y,id:1}]);
 await move('touchMove',[{x,y:y+r.height*.10,id:1}]);
 await move('touchStart',[{x,y:y+r.height*.10,id:1},{x:lookX,y:lookY,id:2}]);
 await move('touchStart',[{x,y:y+r.height*.10,id:1},{x:lookX,y:lookY,id:2},firePoint]);
 await move('touchMove',[{x,y:y+r.height*.10,id:1},{x:lookX+60,y:lookY-30,id:2},firePoint]);
 await page.waitForTimeout(400);
 const afterMulti=await pos();
 await move('touchCancel',[]);
 const after=await clip();
 assert.ok(after<before && after>=0); console.log('ATTACK',before,after);
 await page.waitForTimeout(650); assert.equal(await clip(),after,'cancel must release fire');
 assert.ok(Math.abs(parse(beforeMulti,'ang')[1]-parse(afterMulti,'ang')[1])>5);
 assert.ok(Math.hypot(...parse(beforeMulti,'org').map((axis,i)=>axis-parse(afterMulti,'org')[i]))>2);
 const held=await page.evaluate(()=>window.coftest.filter(x=>/^[-+]attack\n$/.test(x)));
 assert.deepEqual(held.slice(-2),['+attack\n','-attack\n']);
 console.log('MULTITOUCH',beforeMulti,afterMulti,held);
 const cancelPosition=await pos();
 await page.waitForTimeout(300);
 const stopped=await pos();
 assert.ok(Math.hypot(...parse(cancelPosition,'org').map((axis,i)=>axis-parse(stopped,'org')[i]))<3,'stick still dragging after cancellation');
 await page.locator('[data-action=quick1]').tap();
 assert.ok(await page.locator('[data-action=quick1].quick-selected').isVisible());
 await page.screenshot({path:path.join(evidence,'game.png')});
 await move('touchStart',[firePoint]);
 await page.waitForTimeout(120);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 assert.ok(await page.locator('[data-action=attack].pressed').count()===0);
 await move('touchEnd',[]);
 console.log('PASS cancellation and blur release');
 assert.equal(await page.evaluate(()=>!!document.pointerLockElement),false);
 await page.locator('[data-action="inventory"]').tap();
 await page.locator('#cof-bag.on').waitFor({timeout:10000});
 await page.locator('[data-action="inventory-close"]').tap();
 await page.locator('#cof-bag.on').waitFor({state:'hidden',timeout:10000});
 console.log("PASS bag opens and closes by touch");
 assert.deepEqual(errors,[]);
 console.log('PASS mobile controls');
} finally {await browser.close();}
