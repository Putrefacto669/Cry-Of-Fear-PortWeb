// Fresh installed Service Worker, actual runtime modules and menu preview on local/public builds.
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out,version]=process.argv.slice(2);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({executablePath:'/root/cof-audits/browser-1.64.1/browsers/chromium-1248/chrome-linux64/chrome',args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),p=await b.newPage({viewport:{width:1280,height:900}}),logs=[],errors=[],r={base,expectedVersion:version};
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
async function wait(fn,limit=30000){const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<limit,'release condition deadline');await p.waitForTimeout(100);}}
try{
 await p.goto(base);await p.locator('[data-language=spanish]').click();assert.match(await p.locator('#launcher-update').innerText(),/Simon/);await p.screenshot({path:out+'/launcher.png'});
 await p.goto(base+'?map=c_game_menu1&sw=1&timer=1&prefetch=0&debug=1');await wait(()=>logs.some(l=>l.includes('client connected')),60000);
 r.version=await p.evaluate(()=>new Promise((resolve,reject)=>{const c=new MessageChannel(),t=setTimeout(()=>reject(Error('SW version deadline')),30000);c.port1.onmessage=e=>{clearTimeout(t);resolve(e.data.version);};navigator.serviceWorker.controller.postMessage('cof-version',[c.port2]);}));assert.equal(r.version,version);
 await p.locator('#cof-menu.on [data-action=clothes]').click();await p.locator('#cof-clothes.on').waitFor();await wait(()=>p.evaluate(()=>CoFPostFX.preview().id>0&&CoFPostFX.stats().msPerFrame>0));assert.equal(await p.locator('#cof-clothes [data-costume]:enabled').count(),1);assert.equal(await p.evaluate(()=>!!document.pointerLockElement),false);
 r.preview=await p.evaluate(()=>CoFPostFX.preview());assert.ok(r.preview.width>0&&r.preview.height>0);await p.screenshot({path:out+'/clothes.png'});
 r.modules=await p.evaluate(async()=>{const o={};for(const n of ['server.wasm','client.wasm','libref_gles3compat.wasm','filesystem_stdio.wasm','menu.wasm'])o[n]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',FS.readFile('/lib/'+n))),v=>v.toString(16).padStart(2,'0')).join('');return o;});
 assert.equal(r.modules['client.wasm'],process.env.COF_EXPECT_CLIENT||'45294e1e911c5c2caf3c8c022f1555b21fe02c8e4524acca3a76684f51fd6b4f');assert.equal(r.modules['server.wasm'],'91ca7418dcdcb520cd1479d77ca6646af79e455158c23f179661a1f46f7954f4');
 assert.equal(r.modules['libref_gles3compat.wasm'],process.env.COF_EXPECT_RENDERER||'8db286f9132d53133c1a9887ef78bf0735dd264962846f2db6b66350d11e0eec');
 assert.equal(r.modules['filesystem_stdio.wasm'],'85e8f987a23b86f6dcabc92acda5e2818653bb155e84b7fab25fdbd3ec507a95');
 assert.equal(r.modules['menu.wasm'],'bbde8c4bcdfc8b61ed538fbcd86c5d92693a35277a7955fa502f5232285e6051');
 await p.locator('#cof-clothes [data-close]').scrollIntoViewIfNeeded();await p.locator('#cof-clothes [data-close]').click();await p.locator('#cof-menu.on').waitFor();assert.deepEqual(errors,[]);r.passed=true;
}catch(e){r.failure=String(e.stack);await p.screenshot({path:out+'/failure.png'}).catch(()=>{});process.exitCode=1;}
finally{r.browser=b.version();r.errors=errors;fs.writeFileSync(out+'/result.json',JSON.stringify(r,null,2));fs.writeFileSync(out+'/engine.log',logs.join('\n'));await b.close();}
console.log(r.passed?'PASS release launcher, active SW version, native Clothes and actual module hashes':r.failure);
