// c_basement critical path, part 1: the magazine number (543-214) dialled on the mobile's panel ("*"), the call
// basementcall (cof_phonecall: ringing, subtitles 286..), its EndCall -> addnotemm (cof_keypad4 code 5247 + the
// "Phone code" note), then the keypad keypanel3 -> multielecdoor -> unlockelec (toggles elecdoor's lock).
// Negative checks first: wrong number, the keypad code before the call. Save/load after the call.
// The probe starts with ?map=c_basement and gives the mobile with cof_give (a fixture, not a natural run).
// Usage: node basement_phone_probe.mjs <base url> <new output dir>
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(base&&out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),ctx=await browser.newContext({viewport:{width:800,height:600}}),p=await ctx.newPage(),logs=[],stamps=[],errors=[],r={checks:{}};let serial=0;
p.on('console',m=>{logs.push(m.text());stamps.push(Date.now());});p.on('pageerror',e=>errors.push(e.message));
const wait=async(fn,what,ms=120000)=>{const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<ms,`${what} timeout`);await p.waitForTimeout(250);}};
const cmd=async text=>{const i=logs.length,t=`bp_${++serial}`;await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${t} `),timeout:60000}),p.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${t}`)]);return logs.slice(i).join('\n');};
const check=(k,v)=>{r.checks[k]=v;};
const since=(i,re)=>logs.slice(i).filter(l=>re.test(l)).map(l=>l.replace(/^\[[^\]]*\]\s*/,''));
const door=async()=>(await cmd('cof_door elecdoor')).match(/COF\/DOOR elecdoor .*/)?.[0];
try{
 await p.goto(`${base}?map=c_basement&sw=0&fx=0&timer=1&debug=1`);await wait(()=>logs.some(l=>l.includes('client connected')),'connect');
 await cmd('sv_cheats 1\nr_norefresh 0\ncof_weapon_debug 1');
 // the entry cutscene (chapter title at ~52 s) freezes the player
 await wait(async()=>/frozen=0 /.test(await cmd('cof_inspect !player')),'unfrozen',240000);
 await p.mouse.click(400,200);await p.waitForFunction(()=>document.pointerLockElement?.id==='canvas');
 await cmd('cof_give weapon_mobile');await p.waitForTimeout(500);await cmd('weapon_mobile');await p.waitForTimeout(1500);
 r.weapon=(await cmd('cof_weapon_status')).match(/COF\/WEAPON .*/)?.[0];
 r.doorStart=await door();check('elecdoor locked at start',/locked=1/.test(r.doorStart||''));
 // cof_list prints no targetname: c_basement has a single cof_keypad, keypanel3
 const kps=(await cmd('cof_list cof_keypad')).split('\n').filter(l=>/COF\/LIST cof_keypad #/.test(l));assert.equal(kps.length,1,'one cof_keypad (keypanel3)');const kp=kps[0];let kid=kp.match(/#(\d+)/)[1];
 // negative 1: a wrong code is denied and the door stays locked. (The entry scene multibass1 fires cof_keypad4 at
 // 0 s, so in the original 5247 is already the code before the call: the call only gives the note.)
 let i=logs.length;await cmd(`cof_keypad ${kid} 1234`);r.keypadWrongStart=since(i,/COF\/HUD (GRANTED|DENIED)/);
 check('wrong code denied at start',r.keypadWrongStart.includes('COF/HUD DENIED'));
 check('door still locked after denied keypad',/locked=1/.test(await door()||''));
 // negative 2: a wrong number does nothing
 i=logs.length;await cmd('phonenumber 111111');await p.waitForTimeout(6000);
 r.wrongNumber=since(i,/COF\/HUD SUB|phone_ring|basementcall|COF\/HUD CODE/);check('wrong number: no call',r.wrongNumber.length===0);
 // the entry scene (silent ~20 s, then its dialogue: subtitles 25..39) runs after the player is unfrozen:
 // wait for its last subtitle so the call's own timing can be measured apart
 await wait(()=>logs.some(l=>l.includes('COF/HUD SUB 39')),'entry scene subtitle 39',240000);await p.waitForTimeout(6000);
 r.entrySubtitles=since(0,/COF\/HUD SUB /).map(l=>+l.split(' ').pop());
 // the panel: "*" with the mobile in the hand
 await p.keyboard.press('*');await p.waitForSelector('#cof-dialog .phone',{state:'visible',timeout:10000});
 await p.waitForTimeout(800);await p.screenshot({path:`${out}/01-phone-panel.png`});check('panel opens with *',true);
 i=logs.length;const t0=Date.now();
 for(const d of '543214'){await p.keyboard.press(d);await p.waitForTimeout(250);}
 r.panelScreen=await p.$eval('#cof-dialog .phone .screen',e=>e.textContent);check('panel shows the digits',r.panelScreen==='543214');
 await p.screenshot({path:`${out}/02-phone-digits.png`});
 await p.keyboard.press('Enter');
 await wait(()=>logs.slice(i).some(l=>l.includes('COF/HUD SUB ')),'first subtitle',30000);
 r.ringing=since(i,/phone_ring|tone_send/i);r.firstSubtitleAfter=((stamps[logs.findIndex((l,k)=>k>=i&&l.includes('COF/HUD SUB '))]-t0)/1000).toFixed(1);
 await p.waitForTimeout(1500);await p.screenshot({path:`${out}/03-call.png`});
 await wait(()=>logs.slice(i).some(l=>l.includes('COF/HUD CODE ')),'code note',180000);
 r.call=logs.slice(i).map((l,k)=>[((stamps[i+k]-t0)/1000).toFixed(1),l.replace(/^\[[^\]]*\]\s*/,'')]).filter(([,l])=>/COF\/HUD (SUB|CODE|SUBTITLE)|phone|SUBTITLE CHANGE/i.test(l));
 r.subtitles=since(i,/COF\/HUD SUB /).map(l=>+l.split(' ').pop());
 // the entry scene's own subtitles (25..39) may still be running: keep the call's numbers only
 const want=[286,287,288,289,290,291,292,293,294,295,296,313];r.callSubtitles=r.subtitles.filter(n=>want.includes(n));
 check('call subtitles 286..296, 313 in order',JSON.stringify(r.callSubtitles)===JSON.stringify(want));
 r.codeLine=since(i,/COF\/HUD CODE /)[0];check('code note 5247 kind 4',r.codeLine==='COF/HUD CODE 5247 4');
 await p.waitForTimeout(1500);await p.screenshot({path:`${out}/04-after-call.png`});
 // the check removes itself (no spawnflag 1): a second dial does nothing
 i=logs.length;await cmd('phonenumber 543214');await p.waitForTimeout(5000);r.secondDial=since(i,/COF\/HUD SUB|COF\/HUD CODE/);
 check('second dial: no second call',r.secondDial.length===0);
 // save/load after the call: the code persists
 await cmd('save basement_phone');const n=logs.filter(l=>l.includes('client connected')).length;
 await p.evaluate(()=>CoFDebug.cmd('load basement_phone'));await wait(()=>logs.filter(l=>l.includes('client connected')).length>n,'load');
 await p.waitForTimeout(2500);await cmd('sv_cheats 1');
 const kid2=(await cmd('cof_list cof_keypad')).match(/COF\/LIST cof_keypad #(\d+)/)?.[1];r.keypadIndex=[kid,kid2];kid=kid2;
 r.doorAfterLoad=await door();check('door locked after load',/locked=1/.test(r.doorAfterLoad||''));
 i=logs.length;await cmd(`cof_keypad ${kid} 1234`);check('wrong code denied after load',since(i,/COF\/HUD (GRANTED|DENIED)/).includes('COF/HUD DENIED'));
 i=logs.length;await cmd(`cof_keypad ${kid} 5247`);await p.waitForTimeout(1000);r.keypadAfter=since(i,/COF\/HUD (GRANTED|DENIED)/);
 check('keypad granted with 5247 after load',r.keypadAfter.includes('COF/HUD GRANTED'));
 r.doorEnd=await door();check('elecdoor unlocked',/locked=0/.test(r.doorEnd||''));
 // 100e5890 sets the code to 9999 after use: a second 5247 is denied and does not toggle the lock back
 i=logs.length;await cmd(`cof_keypad ${kid} 5247`);r.keypadReuse=since(i,/COF\/HUD (GRANTED|DENIED)/);
 check('keypad used once: second 5247 denied',r.keypadReuse.includes('COF/HUD DENIED'));
 check('elecdoor stays unlocked',/locked=0/.test(await door()||''));
 await p.screenshot({path:`${out}/05-unlocked.png`});
 r.problems=[...new Set(logs.filter(l=>/can't|cannot|couldn't|could not|not found|missing|unknown|null ent|error|failed|SUBTITLE CHANGE/i.test(l)).map(l=>l.replace(/^\[[^\]]*\]\s*/,'')))].slice(0,80);
 r.jsErrors=errors;r.done=true;
}catch(e){r.failure=String(e.stack||e);console.error(e);process.exitCode=1;}finally{r.chromium=browser.version();fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await ctx.close();await browser.close();}
console.log(JSON.stringify({checks:r.checks,subtitles:r.subtitles,first:r.firstSubtitleAfter,failure:r.failure?.slice(0,300)}));
