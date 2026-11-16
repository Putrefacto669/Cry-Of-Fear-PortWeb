import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const [origin='http://127.0.0.1:8136']=process.argv.slice(2);
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:540}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto(origin+'/?sw=0');
 await page.locator('[data-language="english"]').click();
 await page.getByRole('button',{name:'PC · Keyboard and mouse'}).click();
 await page.reload();
 assert.equal(await page.evaluate(()=>localStorage.getItem('cof-input-device-v1')),'pc');
 await page.goto(origin+'/?map=c_start2&sw=0&fx=0&timer=1&prefetch=0&debug=1');
 await page.waitForEvent('console',{predicate:m=>m.text().includes('client connected'),timeout:90000});
 await page.locator('#canvas').click();
 await page.waitForFunction(()=>document.pointerLockElement?.id==='canvas');
 assert.equal(await page.locator('#cof-touch-controls').isVisible(),false);
 assert.equal(await page.evaluate(()=>document.body.classList.contains('cof-mobile-active')),false);
 const modules=await page.evaluate(async()=>{
   const result={};
   for(const name of ['client','server','filesystem_stdio','menu','libref_gles3compat']){
     const bytes=await crypto.subtle.digest('SHA-256',FS.readFile('/lib/'+name+'.wasm'));
     result[name]=Array.from(new Uint8Array(bytes), byte=>byte.toString(16).padStart(2,'0')).join('');
   }
   return result;
 });
 console.log('MODULES',JSON.stringify(modules));
 const cmd=async text=>{
   await Promise.all([page.waitForEvent('console',{predicate:m=>m.text().includes('COF/FENCE desktop '),timeout:30000}),
     page.evaluate(text=>CoFDebug.cmd(text+'\ncof_fence desktop'),text)]);
 };
 await cmd('sv_cheats 1\ncof_goto 2428 -880 -731');
 const position=async()=>{
   const [message]=await Promise.all([page.waitForEvent('console',{predicate:m=>m.text().includes('org ( '),timeout:30000}),cmd('viewpos')]);
   return message.text().match(/org \( (.*?) \)/)?.[1].split(' ').map(Number);
 };
 const before=await position();
 await page.keyboard.down('s');await page.waitForTimeout(850);await page.keyboard.up('s');
 const after=await position();
 assert.ok(Math.hypot(...after.map((axis,i)=>axis-before[i]))>3,{before,after});
 assert.deepEqual(errors,[]);
 console.log('PASS desktop',before,after);
} finally { await browser.close(); }
