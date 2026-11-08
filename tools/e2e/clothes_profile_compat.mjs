// Actual old/new WASM readers. Private profile fixtures; no gameplay saves are migrated.
import fs from 'node:fs';import assert from 'node:assert/strict';import {chromium} from 'playwright';
const [current,historical,out]=process.argv.slice(2);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({executablePath:'/root/cof-audits/browser-1.64.1/browsers/chromium-1248/chrome-linux64/chrome',args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),result={cases:[],errors:[]};
try{for(const test of [
 {name:'new-reader-legacy-unlocks',base:current,profile:'COF_EXTRAS 1 4096\n',mask:4096,choice:0},
 {name:'new-reader-blocked-preference',base:current,profile:'COF_EXTRAS 1 0 6\n',mask:0,choice:0},
 {name:'old-reader-extended-profile',base:historical,profile:'COF_EXTRAS 1 4096 6\n',mask:4096,choice:0}
]){
 const ctx=await b.newContext(),p=await ctx.newPage(),logs=[];let connected=0,serial=0;p.on('console',m=>{logs.push(m.text());if(m.text().includes('client connected'))connected++;});p.on('pageerror',e=>result.errors.push(e.message));
 const wait=async fn=>{const t=Date.now();while(!await fn()){assert.ok(Date.now()-t<60000);await p.waitForTimeout(100);}};
 const cmd=async c=>{const start=logs.length,token='profile_'+(++serial);await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes('COF/FENCE '+token+' '),timeout:30000}),p.evaluate(c=>CoFDebug.cmd(c),c+'\ncof_fence '+token)]);return logs.slice(start).join('\n');};
 try{
  await p.goto(test.base+'?map=c_game_menu1&sw=0&fx=0&prefetch=0&timer=1&debug=1');await wait(()=>connected>0);
  await p.evaluate(async profile=>{FS.writeFile('/rwdir/cryoffear/cof_extras_profile.cfg',profile);await new Promise((resolve,reject)=>FS.syncfs(false,e=>e?reject(e):resolve()));},test.profile);
  const n=connected;await p.reload();await wait(()=>connected>n);await cmd('sv_cheats 1');const state=await cmd('cof_extras_status');assert.match(state,new RegExp('unlocks='+test.mask+' costume='+test.choice+' '));
  const after=await p.evaluate(()=>new TextDecoder().decode(FS.readFile('/rwdir/cryoffear/cof_extras_profile.cfg')));assert.equal(after,test.profile,'reading must not rewrite or auto-migrate the profile');result.cases.push({...test,state,unchanged:true});
 }finally{fs.writeFileSync(out+'/'+test.name+'.log',logs.join('\n'));await ctx.close();}
}}
catch(e){result.failure=String(e.stack);process.exitCode=1;}
finally{result.passed=!result.failure&&result.cases.length===3&&result.errors.length===0;fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));await b.close();}
console.log(result.passed?'PASS actual legacy/current profile readers and rejection of a locked stored preference':result.failure);
