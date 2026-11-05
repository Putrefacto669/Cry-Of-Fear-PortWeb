// Gecko native-rendering contract. Diagnostic commands, not a mouse-input or progression test.
import assert from 'node:assert/strict';import fs from 'node:fs';import {firefox} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const b=await firefox.launch({headless:false,firefoxUserPrefs:{'media.volume_scale':'0.0','webgl.force-enabled':true}});
const p=await b.newPage({viewport:{width:1280,height:800}}),logs=[],errors=[],r={diagnosticOnly:true,inputTest:false};let serial=0,connections=0;
p.on('console',m=>{logs.push(m.text());if(m.text().includes('client connected'))connections++;});p.on('pageerror',e=>errors.push(e.message));
async function wait(fn,limit=30000){const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<limit,'Gecko HUD deadline');await p.waitForTimeout(100);}}
async function cmd(c){const start=logs.length,token='gecko_'+(++serial);await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes('COF/FENCE '+token+' '),timeout:30000}),p.evaluate(c=>CoFDebug.cmd(c),c+'\ncof_fence '+token)]);return logs.slice(start).join('\n');}
try{
 await p.goto(base+'?map=c_apartment1&sw=1&timer=1&fx=0&prefetch=0&debug=1');await wait(()=>connections>0,60000);
 const inventory=await cmd('sv_cheats 1\ncof_give weapon_glock\ncof_dump'),slot=inventory.match(/bag (\d+): weapon_glock/);assert.ok(slot);await cmd('cof_equip '+slot[1]);
 await wait(async()=>/clip=15 .*visible=1 /.test(await cmd('cof_ammo_render')));r.loaded=await cmd('cof_ammo_render\ncof_weapon_status');assert.match(r.loaded,/mag=\d+ icon=\d+ cross=\d+/);await p.screenshot({path:out+'/glock-loaded.png'});
 await cmd('+attack');await p.waitForTimeout(100);await cmd('-attack');await wait(async()=>/clip=14 /.test(await cmd('cof_ammo_render')));r.shot=await cmd('cof_ammo_render\ncof_weapon_status');await p.screenshot({path:out+'/glock-shot.png'});
 await cmd('save gecko_ammo');const n=connections;await p.evaluate(()=>CoFDebug.cmd('load gecko_ammo'));await wait(()=>connections>n,60000);await cmd('sv_cheats 1');await wait(async()=>/clip=14 .*visible=1 /.test(await cmd('cof_ammo_render')));r.restored=await cmd('cof_ammo_render\ncof_weapon_status');
 r.bars=await p.evaluate(()=>[...document.querySelectorAll('.cof-bar')].map(e=>({height:e.getBoundingClientRect().height,images:[...e.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0)})));for(const bar of r.bars)assert.ok(bar.height>0&&bar.images);
 r.clientHash=await p.evaluate(async()=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',FS.readFile('/lib/client.wasm'))),b=>b.toString(16).padStart(2,'0')).join(''));assert.equal(r.clientHash,'5e9d0053e3d2baf50673362bfcf555e5667224838f223ebde01679d84fe38c26');assert.deepEqual(errors,[]);r.passed=true;
}catch(e){r.failure=String(e.stack);r.pageText=await p.locator('body').innerText();await p.screenshot({path:out+'/failure.png'});process.exitCode=1;}
finally{r.errors=errors;r.browser=b.version();fs.writeFileSync(out+'/result.json',JSON.stringify(r,null,2));fs.writeFileSync(out+'/engine.log',logs.join('\n'));await b.close();}
console.log(r.passed?'PASS Gecko real WASM Glock sprites, shot and save/load':r.failure);
