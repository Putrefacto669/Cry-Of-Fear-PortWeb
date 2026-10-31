import fs from 'node:fs';import assert from 'node:assert/strict';import {chromium} from 'playwright';
const dir=process.env.COF_AUDIT_OUTPUT;fs.mkdirSync(dir,{recursive:true});const lines=[],errors=[];let serial=0;
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
try{const p=await browser.newPage();p.on('console',m=>lines.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
const command=async c=>{const i=lines.length,t='probe_'+(++serial);await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes('COF/FENCE '+t+' '),timeout:30000}),p.evaluate(c=>CoFDebug.cmd(c),c+'\ncof_fence '+t)]);return lines.slice(i).join('\n')};
await p.goto('http://127.0.0.1:8096/?map=c_start&timer=1&sw=0&prefetch=1&debug=1');await p.waitForFunction(()=>typeof CoFDebug!=='undefined'&&typeof Module!=='undefined'&&Module.calledRun);
await p.waitForEvent('console',{predicate:m=>m.text().includes('client connected'),timeout:30000}).catch(()=>assert.ok(lines.some(l=>l.includes('client connected'))));
await command('sv_cheats 1');const before=await command('cof_inspect *35\ncof_inspect *43\ncof_inspect doorclose2');await command('save scene_probe');let n=lines.filter(l=>l.includes('client connected')).length;
await p.evaluate(()=>CoFDebug.cmd('load scene_probe'));await p.waitForFunction(n=>true,n);const start=Date.now();while(lines.filter(l=>l.includes('client connected')).length<=n){assert.ok(Date.now()-start<30000);await p.waitForTimeout(100)}
const after=await command('cof_inspect *35\ncof_inspect *43\ncof_inspect doorclose2');fs.writeFileSync(dir+'/comparison.json',JSON.stringify({before,after,errors},null,2));console.log(before+'\nAFTER\n'+after);assert.deepEqual(errors,[]);
}finally{fs.writeFileSync(dir+'/engine.log',lines.join('\n'));await browser.close()}
