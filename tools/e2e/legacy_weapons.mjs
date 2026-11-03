// Import only local historical saves; no native resources enter repository evidence.
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out,root]=process.argv.slice(2);assert.ok(base&&out&&root&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),results=[];
try{for(const [label,map,dir,save,wanted] of [
 ['old-phone-blade','c_start',`${root}/build/validation/continuation-2026-10-31/natural-fixed-3/checkpoints/natural_gate`,'natural_gate',['weapon_mobile','weapon_switchblade']],
 ['old-glock','c_apartment1',`${root}/build/validation/extras-2026-11-01/extended-final/callback_behavior/snapshot`,'callback_active',['weapon_glock']]
]){const ctx=await b.newContext(),p=await ctx.newPage(),logs=[],errors=[],r={label,map,diagnosticOnly:true};let serial=0;p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
try{
 const wait=async fn=>{const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<60000);await p.waitForTimeout(100);}};
 const cmd=async text=>{const i=logs.length,t=`legacy_${++serial}`;await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes(`COF/FENCE ${t} `),timeout:30000}),p.evaluate(c=>CoFDebug.cmd(c),`${text}\ncof_fence ${t}`)]);return logs.slice(i).join('\n');};
 await p.goto(`${base}?map=c_game_menu1&sw=0&fx=0&timer=1&prefetch=0&debug=1`);await wait(()=>logs.some(l=>l.includes('client connected')));await cmd('sv_cheats 1\nr_norefresh 1');assert.ok(await p.evaluate(m=>CoFPreload(m),map));
 const files=fs.readdirSync(dir).filter(n=>/\.(sav|HL[123])$/i.test(n)).map(n=>[n,[...fs.readFileSync(`${dir}/${n}`)]]);assert.ok(files.length>=4);await p.evaluate(files=>{FS.mkdirTree('/rwdir/cryoffear/save');for(const[n,data]of files)FS.writeFile(`/rwdir/cryoffear/save/${n}`,new Uint8Array(data));},files);
 const n=logs.filter(l=>l.includes('client connected')).length;await p.evaluate(s=>CoFDebug.cmd(`load ${s}`),save);await wait(()=>logs.filter(l=>l.includes('client connected')).length>n);r.inventory=await cmd('cof_dump\ncof_weapon_status');
 for(const name of wanted){assert.match(r.inventory,new RegExp(`carried \\d+: ${name}`));const slot=r.inventory.match(new RegExp(`bag (\\d+): ${name} `));assert.ok(slot);await cmd(`cof_equip ${slot[1]}`);r[name]=await cmd('cof_weapon_status');assert.match(r[name],new RegExp(`class=${name} `));}
 assert.deepEqual(errors,[]);r.passed=true;console.log(`PASS historical save ${label}: ${wanted.join(', ')}`);
}catch(e){r.passed=false;r.failure=String(e.stack||e);console.error(e);process.exitCode=1;}finally{r.errors=errors;results.push(r);fs.writeFileSync(`${out}/${label}.log`,logs.join('\n'));await ctx.close();}}
}finally{fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));await b.close();}