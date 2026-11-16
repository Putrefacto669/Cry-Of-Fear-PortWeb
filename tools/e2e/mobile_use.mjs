import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const [origin,capture]=process.argv.slice(2);
assert.ok(origin&&capture);
const b=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
const logs=[],errors=[];
p.on('console',m=>logs.push(m.text()));
p.on('pageerror',e=>errors.push(e.message));
try {
 await p.goto(origin+'/?map=c_apartment1&input=mobile&sw=0&fx=0&timer=1&prefetch=0&debug=1');
 const use=p.locator('[data-action="use"]');
 await use.waitFor({timeout:90000});
 await p.waitForTimeout(17000);
 let serial=0;
 const cmd=async text=>{
   const mark=logs.length,fence='touch_use_'+(++serial);
   await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes('COF/FENCE '+fence+' '),timeout:30000}),
    p.evaluate(text=>CoFDebug.cmd(text),text+'\ncof_fence '+fence)]);
   return logs.slice(mark).join('\n');
 };
 await cmd('sv_cheats 1\ncof_unfreeze !player\ncof_goto -960 748 164\ncof_face *132');
 const before=await cmd('cof_inspect *132');
 const box=await use.boundingBox();
 const session=await p.context().newCDPSession(p);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:3}]});
 await p.waitForTimeout(250);
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const after=await cmd('cof_inspect *132');
 console.log(before,after);
 assert.match(before,/toggle=1 /);
 assert.match(after,/toggle=(?:0|2|3) /);
 assert.deepEqual(errors,[]);
 await p.screenshot({path:capture});
 console.log('PASS mobile use');
} finally { await b.close(); }
