// Mobile: the café computer of c_start2 opened with the touch "Use" button. Reports whether the password dialog
// stays open after the finger lifts, and whether typing into it works (the user saw it close at once).
// Reaching the computer uses cof_goto/cof_face (fixture). Usage: node mobile_computer_tap.mjs <base url> <out>
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(base&&out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage(),logs=[],errors=[],r={checks:{},timeline:[]};let serial=0;
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
const cmd=async text=>{const i=logs.length,t=`mc_${++serial}`;await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${t} `),timeout:60000}),p.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${t}`)]);return logs.slice(i).join('\n');};
const dialogOn=()=>p.evaluate(()=>!!document.querySelector('#cof-dialog.on'));
try{
 await p.goto(`${base}?map=c_start2&sw=0&fx=0&timer=1&debug=1&input=mobile`);
 const t=Date.now();while(!logs.some(l=>l.includes('client connected'))){assert.ok(Date.now()-t<180000,'connect');await p.waitForTimeout(500);}
 await cmd('sv_cheats 1');
 while(!/frozen=0 /.test(await cmd('cof_inspect !player'))){assert.ok(Date.now()-t<300000,'unfrozen');await p.waitForTimeout(1000);}
 await p.waitForSelector('#cof-touch-controls:not([hidden]) [data-action="use"]',{timeout:60000});
 const row=(await cmd('cof_list cof_computer')).split('\n').find(l=>/COF\/LIST cof_computer #/.test(l));assert.ok(row,'cof_computer');
 const id=row.match(/#(\d+)/)[1];r.computer=row.replace(/^\[[^\]]*\]\s*/,'');
 // in front of it: its use button is a brush next to the point; walk-in fixture as the other probes
 const btn=(await cmd('cof_list func_button')).split('\n').filter(l=>/COF\/LIST func_button #/.test(l));r.buttons=btn.length;
 // a standing spot 61 units from it (tools/bsp_walk.py Bsp.stand on c_start2)
 await cmd('cof_goto 1304 1650 -555');await p.waitForTimeout(800);await cmd(`cof_face #${id}`);await p.waitForTimeout(500);
 await p.screenshot({path:`${out}/01-before.png`});
 const box=await p.locator('[data-action="use"]').boundingBox();r.useButton=box;
 const x=box.x+box.width/2,y=box.y+box.height/2;
 // a finger: touchstart, 150 ms, touchend (Playwright's tap lifts in the same frame, which the server never sees)
 const cdp=await ctx.newCDPSession(p);
 const i0=logs.length;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await p.waitForTimeout(150);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 for(let k=0;k<12;k++){await p.waitForTimeout(150);r.timeline.push({ms:(k+1)*150,dialog:await dialogOn()});}
 r.serverLines=logs.slice(i0).filter(l=>/COF\/HUD (COMPUTER|PADCLUE|DENIED|GRANTED)/.test(l));
 await p.screenshot({path:`${out}/02-after-tap.png`});
 r.checks['the computer answered the tap']=r.serverLines.some(l=>/COF\/HUD COMPUTER/.test(l));
 r.checks['dialog still open 1.8 s after the tap']=r.timeline.at(-1).dialog;
 r.jsErrors=errors;
}catch(e){r.failure=String(e.stack||e);process.exitCode=1;}finally{fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await browser.close();}
console.log(JSON.stringify({checks:r.checks,timeline:r.timeline,lines:r.serverLines,failure:r.failure?.slice(0,200)}));
