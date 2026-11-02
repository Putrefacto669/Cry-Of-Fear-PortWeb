// Real WASM save/load audit; diagnostic map loads do not certify campaign progression.
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});const results=[];
try{for(const seconds of (process.env.COF_SAVE_TIMES||'1').split(',').map(Number)){
 const dir=`${out}/at-${seconds}`;fs.mkdirSync(dir);const context=await browser.newContext({viewport:{width:640,height:480}}),page=await context.newPage(),logs=[],errors=[];page.on('console',m=>logs.push(m.text()));page.on('pageerror',e=>errors.push(e.message));let serial=0;
 const wait=async fn=>{const start=Date.now();while(!await fn()){assert.ok(Date.now()-start<60000,'state timeout');await page.waitForTimeout(100);}};
 const cmd=async text=>{const start=logs.length,token=`persist_${++serial}`;await Promise.all([page.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${token} `),timeout:30000}),page.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${token}`)]);return logs.slice(start).join('\n');};
 const r={seconds,map:'c_apartment1',browser:browser.version(),kind:'diagnostic save/load; original entities active'};
 try{await page.goto(`${base}?map=c_apartment1&sw=0&fx=0&prefetch=0&timer=1&debug=1`);const start=Date.now();while(!logs.some(l=>l.includes('client connected'))){assert.ok(Date.now()-start<180000);await page.waitForTimeout(100);}
 r.serverHash=await page.evaluate(async()=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',FS.readFile('/lib/server.wasm'))),b=>b.toString(16).padStart(2,'0')).join(''));
 await cmd('sv_cheats 1\nr_norefresh 1');if(process.env.COF_CALLBACK_TRACE)await cmd('cof_save_debug 1');await page.waitForTimeout(seconds*1000);
 const inspect=process.env.COF_CALLBACK_TRACE?'cof_callbacks !all':'cof_inspect !player\ncof_dump\ncof_list monster_faster\ncof_list monster_slower3\ncof_list trigger_camera';r.before=await cmd(inspect);
 r.save=await cmd(`save persistence_${seconds}`);r.warningCount=(r.save.match(/Invalid function pointer in entity!/g)||[]).length;r.afterSave=await cmd(inspect);
 const connected=logs.filter(l=>l.includes('client connected')).length;await page.evaluate(n=>CoFDebug.cmd(`load persistence_${n}`),seconds);await wait(()=>logs.filter(l=>l.includes('client connected')).length>connected);r.afterLoad=await cmd(inspect);await page.waitForTimeout(1200);r.later=await cmd(inspect);r.errors=errors;assert.deepEqual(errors,[]);r.result='OBSERVED';console.log(`OBSERVED at ${seconds}: ${r.warningCount} invalid function warnings`);
 }catch(e){r.result='FAILED';r.failure=String(e.stack||e);console.error(r.failure);process.exitCode=1;}finally{fs.writeFileSync(`${dir}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${dir}/engine.log`,logs.join('\n'));results.push(r);await context.close();}
}}finally{fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));await browser.close();}

