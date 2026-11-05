// Control experiment: CDP pipe directly; no Playwright import or worker auto-attach.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
const [base,out,privateOut,launchFile]=process.argv.slice(2);
assert.ok(!fs.existsSync(out)&&!fs.existsSync(privateOut));
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(privateOut,{recursive:true});
fs.copyFileSync(import.meta.filename,path.join(out,'harness.mjs'));
const launch=JSON.parse(fs.readFileSync(launchFile));
const args=launch.slice(1).filter(x=>!x.startsWith('--user-data-dir=')&&!x.startsWith('--log-net-log=')&&!x.startsWith('--log-file='));
args.push('--user-data-dir='+privateOut+'/profile','--log-net-log='+privateOut+'/netlog.json');
const result={controller:'direct-CDP-pipe',args,updateLimitMs:30000};
const control=async version=>assert.ok((await fetch(base+'__control',{method:'POST',body:JSON.stringify({version})})).ok);
await control('old');
const child=spawn(launch[0],args,{stdio:['ignore','ignore','pipe','pipe','pipe']});
child.stderr.pipe(fs.createWriteStream(path.join(out,'browser.log')));
const event=(name,data)=>fs.appendFileSync(path.join(out,'events.jsonl'),JSON.stringify({time:Date.now(),name,...data})+'\n');
let id=0,buffer=Buffer.alloc(0);const pending=new Map(),trace=[];
child.stdio[4].on('data',data=>{buffer=Buffer.concat([buffer,data]);for(let i;(i=buffer.indexOf(0))>=0;){const msg=JSON.parse(buffer.subarray(0,i));buffer=buffer.subarray(i+1);if(msg.id){const p=pending.get(msg.id);if(p){pending.delete(msg.id);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}}else{if(msg.method==='Tracing.dataCollected')trace.push(...msg.params.value);else event(msg.method,{params:msg.params,sessionId:msg.sessionId});}}});
function send(method,params={},sessionId){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});child.stdio[3].write(JSON.stringify({id:n,method,params,sessionId})+'\0');});}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const bounded=async(fn,limit)=>{const t=Date.now();while(!await fn()){if(Date.now()-t>=limit)return false;await pause(100);}return true;};
let session;
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},session);if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
const hashExpression=`(async()=>{const r={};for(const n of ['server.wasm','client.wasm','libref_gles3compat.wasm','filesystem_stdio.wasm','menu.wasm'])r[n]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',FS.readFile('/lib/'+n))),b=>b.toString(16).padStart(2,'0')).join('');return r;})()`;
try{
 result.browser=await send('Browser.getVersion');
 const {browserContextId}=await send('Target.createBrowserContext');
 const {targetId}=await send('Target.createTarget',{url:'about:blank',browserContextId});
 session=(await send('Target.attachToTarget',{targetId,flatten:true})).sessionId;
 await send('Page.enable',{},session);await send('Runtime.enable',{},session);await send('Network.enable',{},session);
 await send('Emulation.setDeviceMetricsOverride',{width:800,height:600,deviceScaleFactor:1,mobile:false},session);
 await send('Page.navigate',{url:base+'game/?map=c_apartment1&sw=1&timer=1&fx=0&prefetch=0&debug=1'},session);
 assert.ok(await bounded(()=>evaluate(`!!(window.CoFRuntimeReady&&window.CoFCurrentMap?.()==='c_apartment1')`),60000),'runtime boot');
 result.modulesBefore=await evaluate(hashExpression);
 await send('Tracing.start',{categories:'ServiceWorker,startup,toplevel,disabled-by-default-toplevel.flow',transferMode:'ReportEvents'});
 await control('new');
 result.callEpoch=Date.now();
 await evaluate(`window.rawUpdate={phase:'calling',start:performance.now()};navigator.serviceWorker.getRegistration().then(r=>r.update()).then(()=>{rawUpdate.phase='resolved';rawUpdate.end=performance.now()},e=>{rawUpdate.phase='rejected';rawUpdate.error=String(e)});true`);
 result.complete=await bounded(async()=>['resolved','rejected'].includes((await evaluate('rawUpdate')).phase),30000);
 result.state=await evaluate('rawUpdate');
 result.modulesAfter=await evaluate(hashExpression);assert.deepEqual(result.modulesAfter,result.modulesBefore);
 await send('Tracing.end');await pause(1000);
 fs.writeFileSync(path.join(out,'chromium-trace.json.gz'),zlib.gzipSync(JSON.stringify({traceEvents:trace})));result.traceEventCount=trace.length;
}catch(e){result.failure=String(e.stack);}
finally{
 await Promise.race([send('Browser.close').catch(()=>{}),pause(5000)]);
 if(child.exitCode===null)child.kill('SIGTERM');
 await pause(1000);
 const net=path.join(privateOut,'netlog.json');if(fs.existsSync(net))fs.writeFileSync(path.join(out,'netlog.json.gz'),zlib.gzipSync(fs.readFileSync(net)));
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));
}
