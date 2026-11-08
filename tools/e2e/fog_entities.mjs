// Real BSP env_fog -> saved server state -> client TriFog -> the shader used by actual draws.
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({executablePath:'/root/cof-audits/browser-1.64.1/browsers/chromium-1248/chrome-linux64/chrome',args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),p=await b.newPage({viewport:{width:800,height:600}}),logs=[],errors=[],r={diagnosticActivation:true,scenes:[]};let serial=0,connected=0;
p.on('console',m=>{logs.push(m.text());if(m.text().includes('client connected'))connected++;});p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>{const style=document.createElement('style');style.textContent='html,body{width:800px;height:600px}body{display:block}header,#log,footer{display:none}main{width:800px;height:600px}';document.head.append(style);}));
async function wait(fn,limit=30000){const start=Date.now();while(!await fn()){assert.ok(Date.now()-start<limit,'fog condition deadline');await p.waitForTimeout(100);}}
async function cmd(s){const n=logs.length,token='fog_'+(++serial);await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes('COF/FENCE '+token+' '),timeout:30000}),p.evaluate(c=>CoFDebug.cmd(c),s+'\ncof_fence '+token)]);return logs.slice(n).join('\n');}
async function draws(){return p.evaluate(async()=>{
 const gl=GLctx,seen=new Set(),r={calls:0,programs:[]},original={};
 for(const name of ['drawElements','drawArrays']){original[name]=gl[name];gl[name]=function(...args){r.calls++;const prog=gl.getParameter(gl.CURRENT_PROGRAM);if(prog&&!seen.has(prog)){seen.add(prog);const loc=gl.getUniformLocation(prog,'uFogParams');if(loc!==null)r.programs.push({params:[...gl.getUniform(prog,loc)],color:[...gl.getUniform(prog,gl.getUniformLocation(prog,'uFog'))]});}return original[name].apply(gl,args);};}
 try{await new Promise(resolve=>setTimeout(resolve,250));}finally{for(const name of Object.keys(original))gl[name]=original[name];}
 return r;
});}
const matches=(d,start,end,color)=>d.calls>0&&d.programs.some(v=>v.params[2]===1&&Math.abs(v.params[0]-start)<.1&&Math.abs(v.params[1]-end)<.1&&color.every((c,i)=>Math.abs(v.color[i]-c/255)<.0001));
async function on(start,end,color){let d;await wait(async()=>matches(d=await draws(),start,end,color));return d;}
async function map(name){await p.evaluate(n=>CoFPreload(n),name);const n=connected;await p.evaluate(n=>CoFDebug.cmd('map '+n),name);await wait(()=>connected>n,60000);await cmd('sv_cheats 1');}
try{
 await p.goto(base+'?map=c_start&sw=0&timer=1&prefetch=0&debug=1');await wait(()=>connected>0,60000);await cmd('sv_cheats 1');r.managers=await cmd('cof_list multi_manager');
 for(const [mapName,target,start,end,color] of [['c_start','ackelfaden',500,1500,[10,10,12]],['c_nightmare','nkakelaeie',200,1500,[10,10,12]],['c_apartment1','ingenfog',100,1000,[0,0,0]]]){
  if(mapName!=='c_start')await map(mapName);await cmd('cof_use '+target+' on');const row={map:mapName,target,expectedColor:color,on:await on(start,end,color)};r.scenes.push(row);row.canvas=await p.evaluate(()=>[canvas.width,canvas.height]);assert.deepEqual(row.canvas,[800,600]);await p.locator('#canvas').screenshot({path:out+'/'+mapName+'-linear.png'});
  if(mapName==='c_nightmare'){
   await cmd('save graphics_fog');await cmd('cof_use '+target+' off');await p.waitForTimeout(1400);await wait(async()=>{row.off=await draws();return row.off.calls>0&&row.off.programs.length===0;});
   const before=connected;await p.evaluate(()=>CoFDebug.cmd('load graphics_fog'));await wait(()=>connected>before,60000);await cmd('sv_cheats 1');row.restored=await on(start,end,color);
  }
 }
 r.modules=await p.evaluate(async()=>{const o={};for(const n of ['client.wasm','libref_gles3compat.wasm','server.wasm'])o[n]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',FS.readFile('/lib/'+n))),v=>v.toString(16).padStart(2,'0')).join('');return o;});assert.equal(r.modules['client.wasm'],process.env.COF_EXPECT_CLIENT);assert.equal(r.modules['libref_gles3compat.wasm'],process.env.COF_EXPECT_RENDERER);assert.equal(r.modules['server.wasm'],'91ca7418dcdcb520cd1479d77ca6646af79e455158c23f179661a1f46f7954f4');assert.deepEqual(errors,[]);r.passed=true;
}catch(e){r.failure=String(e.stack);await p.screenshot({path:out+'/failure.png'}).catch(()=>{});process.exitCode=1;}
finally{r.errors=errors;r.browser=b.version();fs.writeFileSync(out+'/result.json',JSON.stringify(r,null,2));fs.writeFileSync(out+'/engine.log',logs.join('\n'));await b.close();}
console.log(r.passed?'PASS actual BSP linear fog GPU draws, off and native restoration without reactivation':r.failure);
