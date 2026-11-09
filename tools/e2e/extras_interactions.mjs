// Diagnostic positioning only; E and bag clicks are actual player input, not a natural route claim.
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(base&&out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),p=await b.newPage({viewport:{width:800,height:600}}),logs=[],errors=[],r={diagnosticOnly:true};let serial=0;
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
try{
 const wait=async fn=>{const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<60000,'interaction timeout');await p.waitForTimeout(100);}};
 const cmd=async text=>{const i=logs.length,t=`extra_input_${++serial}`;await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${t} `),timeout:30000}),p.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${t}`)]);return logs.slice(i).join('\n');};
 await p.goto(`${base}?map=c_apartment1&sw=0&fx=0&timer=1&prefetch=0&debug=1`);await wait(()=>logs.some(l=>l.includes('client connected')));await cmd('sv_cheats 1\nr_norefresh 1');await p.waitForTimeout(17000);
 r.modules=await p.evaluate(async()=>{const o={};for(const f of ['server.wasm','client.wasm','libref_gles3compat.wasm'])o[f]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',FS.readFile('/lib/'+f))),b=>b.toString(16).padStart(2,'0')).join('');return o;});
 r.hrtf=await p.evaluate(()=>Module.cofAudio.hrtf);assert.equal(r.hrtf,false);
 // The original ceiling button: player body's distance exceeds the old 64-unit fallback.
 await cmd('cof_goto -960 748 164\ncof_face *132');await p.waitForTimeout(100);r.hatchBefore=await cmd('cof_inspect *132\ncof_useaim !player');
 await p.keyboard.press('e',{delay:120});await p.waitForTimeout(400);r.hatchAfter=await cmd('cof_inspect *132\ncof_inspect weapon_glock');
 assert.doesNotMatch(r.hatchAfter,/toggle=1 /);assert.match(r.hatchAfter,/toggle=(?:0|2|3) /); // TS_AT_BOTTOM is 1 in SDK.
 // Obtain the original apartment key with E, then use it from the actual inventory menu.
 await p.waitForTimeout(2500);await cmd('cof_unfreeze !player\ncof_goto 1091 1088 164\ncof_face ap1_key1');await p.keyboard.press('e',{delay:120});
 let bag;await wait(async()=>{bag=await cmd('cof_dump');return /bag \d+: apartmentkey /.test(bag);});r.keyCollected=bag;
 await cmd('cof_goto 36 -155 164\ncof_face *66');const lockedMark=logs.length;await p.keyboard.press('e',{delay:120});await p.waitForTimeout(100);assert.match(logs.slice(lockedMark).join('\n'),/The door is locked/);
 await p.keyboard.press('Tab');await p.locator('#cof-bag.on').waitFor();const slot=bag.match(/bag (\d+): apartmentkey /)[1];
 await p.locator(`#cof-bag .slot[data-item="${slot}"]`).click();await p.locator('#cof-bag .menu.on [data-act="use"]').click();
 await wait(()=>logs.some(l=>l.includes('COF/HUD ITEMUSED 1')));r.doorAfter=await cmd('cof_inspect *66');
 const serverTime=s=>Number((s.match(/COF\/FENCE \S+ time=([\d.]+)/)||[])[1]);r.unlockTime=serverTime(r.doorAfter);r.bagAfter=await cmd('cof_dump');assert.doesNotMatch(r.bagAfter,/bag \d+: apartmentkey /);
 await p.locator('#cof-bag.on').waitFor({state:'hidden'});await cmd('save extras_interactions');let n=logs.filter(l=>l.includes('client connected')).length;await p.evaluate(()=>CoFDebug.cmd('load extras_interactions'));await wait(()=>logs.filter(l=>l.includes('client connected')).length>n);const before=await cmd('cof_inspect !player');await p.waitForTimeout(600);await cmd('cof_useaim !player');
 // Timing in game time, not wall clock (diagnosis of 09/11/2026, docs/CLAUDE_INTERMITENCIAS_Y_STUDIO3_2026_11_09.md,
 // and Codex's review): the unlock leaves the door locked for 1 s (hl.dll 10048e40 writes time + 1.0f, 10048f70
 // rejects the Use until then; saved with the game), and the pass (fade + PassThink) takes ~0.4 s of game time.
 // Success is Simon unfrozen at the door's exit, 3_exit1 (inter_door_exit at -312,480,141; the hull trace puts
 // his origin at -312,480,177), within 8 units: any other displacement is not the door (Codex's control).
 const atExit=s=>{const pose=s.match(/origin=([-\d.]+),([-\d.]+),([-\d.]+)/);assert.ok(pose,'missing player pose after load');
  const [x,y,z]=pose.slice(1).map(Number);return /frozen=0 /.test(s)&&Math.hypot(x+312,y-480,z-177)<=8;};
 await wait(async()=>serverTime(await cmd('echo lockout'))>=r.unlockTime+1.0);
 r.presses=[];
 for(let i=0;i<3&&!atExit(r.afterReload=await cmd('cof_inspect !player'));i++){
  await p.keyboard.press('e',{delay:120});const pressed=serverTime(await cmd('echo pressed'));r.presses.push(pressed);
  await wait(async()=>{r.afterReload=await cmd('cof_inspect !player');return atExit(r.afterReload)||serverTime(r.afterReload)>=pressed+1.5;});
 }
 assert.ok(atExit(r.afterReload),`player did not reach 3_exit1 unfrozen: ${r.afterReload.match(/origin=\S+ .*frozen=\d/)?.[0]}`);
 assert.deepEqual(errors,[]);r.passed=true;console.log('PASS actual E ceiling hatch and original apartment key via bag Use; unlocked state survives load');
}catch(e){r.passed=false;r.failure=String(e.stack||e);console.error(e);process.exitCode=1;}finally{r.errors=errors;r.chromium=b.version();fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await b.close();}