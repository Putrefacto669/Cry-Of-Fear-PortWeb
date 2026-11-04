// A fresh installation with a failed precache must not silently start without integrity checks.
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out,expect='unsafe']=process.argv.slice(2);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const control=async fault=>assert.ok((await fetch(base+'__control',{method:'POST',body:JSON.stringify({version:'fixed',fault})})).ok);
const b=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),p=await b.newPage(),logs=[],errors=[],result={expect};p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
try{
 await control({path:'packs/map_c_intro.js',mode:'fail'});await p.goto(base+'?map=c_game_menu1&sw=1&timer=1&fx=0&prefetch=0&debug=1');
 await p.waitForFunction(()=>window.CoFRuntimeReady||document.getElementById('status').textContent.startsWith('Error:'),null,{timeout:30000});
 result.initial=await p.evaluate(()=>({runtime:!!window.CoFRuntimeReady,controller:!!navigator.serviceWorker.controller,status:document.getElementById('status').textContent}));
 if(expect==='unsafe'){assert.ok(result.initial.runtime&&!result.initial.controller);}
 else{
  assert.ok(!result.initial.runtime&&!result.initial.controller&&result.initial.status.startsWith('Error:'));
  await control({});await p.reload();await p.waitForFunction(()=>window.CoFRuntimeReady&&navigator.serviceWorker.controller,null,{timeout:30000});result.recovered=true;
 }
 assert.deepEqual(errors,[]);result.passed=true;
}catch(e){result.passed=false;result.failure=String(e.stack);console.error(e);process.exitCode=1;}
finally{result.errors=errors;fs.writeFileSync(`${out}/result.json`,JSON.stringify(result,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await control({});await b.close();}
