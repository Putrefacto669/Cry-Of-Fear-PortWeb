// Independent integration diagnostics; no claim of native visual equivalence or natural progression.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,firefox} from 'playwright';
const [base,out,metadataPath,engine='chromium']=process.argv.slice(2);
assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const expected=JSON.parse(fs.readFileSync(metadataPath));
const b=await(engine==='firefox'?firefox:chromium).launch(engine==='firefox'
 ?{headless:false,firefoxUserPrefs:{'webgl.force-enabled':true,'media.volume_scale':'0.0'}}
 :{executablePath:'/root/cof-audits/browser-1.64.1/browsers/chromium-1248/chrome-linux64/chrome',args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:800,height:600}}),logs=[],errors=[],result={browser:b.version(),engine,expectedManifest:expected.manifest,scenes:[],diagnostic:true};let serial=0,connections=0;
const auditDraws=process.env.COF_AUDIT_DRAWS!=='0';
if(auditDraws)await p.addInitScript(()=>{
 globalThis.StudioAuditDraws={scales:{},invalidScale:0};const contexts=new WeakMap(),locations=new WeakMap(),scales=new WeakMap();
 const proto=WebGL2RenderingContext.prototype,oldLocation=proto.getUniformLocation,oldUniform=proto.uniform1f,oldUse=proto.useProgram;
 proto.getUniformLocation=function(program,name){const location=Reflect.apply(oldLocation,this,[program,name]);if(name==='uRGBScale'&&location!==null){locations.set(location,program);if(!scales.has(program))scales.set(program,0);}return location;};
 proto.uniform1f=function(location,value){if(location&&locations.has(location))scales.set(locations.get(location),value);return Reflect.apply(oldUniform,this,[location,value]);};
 proto.useProgram=function(program){contexts.set(this,program);return Reflect.apply(oldUse,this,[program]);};
 for(const name of ['drawArrays','drawElements']){const original=WebGL2RenderingContext.prototype[name];
  WebGL2RenderingContext.prototype[name]=function(...args){
   const program=contexts.get(this);
   if(program){if(scales.has(program)){const scale=scales.get(program);
     StudioAuditDraws.scales[scale]=(StudioAuditDraws.scales[scale]||0)+1;if(scale!==1&&scale!==2)StudioAuditDraws.invalidScale++;
    }}return Reflect.apply(original,this,args);
  };
 }
});
p.on('console',m=>{logs.push(m.text());if(m.text().includes('client connected'))connections++;});p.on('pageerror',e=>errors.push(e.message));
async function cmd(text){const start=logs.length,token='studio_audit_'+(++serial);await Promise.all([
 p.waitForEvent('console',{predicate:m=>m.text().includes('COF/FENCE '+token+' '),timeout:30000}),
 p.evaluate(c=>CoFDebug.cmd(c),text+'\ncof_fence '+token)]);return logs.slice(start).join('\n');}
async function connected(previous){const start=Date.now();while(connections<=previous){assert.ok(Date.now()-start<60000,'connection deadline');await p.waitForTimeout(100);}}
async function inspect(label){
 await p.waitForTimeout(350);
 let stats='',started=Date.now();
 do {stats=await cmd('cof_model_light');if(/cof_model_light .*calls=[1-9]\d*/.test(stats))break;
  assert.ok(Date.now()-started<30000,'Studio draw deadline: '+stats);await p.waitForTimeout(150);
 }while(true);
 const gpu=await p.evaluate(()=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('frame deadline')),30000);
  const callback=()=>{MainLoop.postMainLoop.splice(MainLoop.postMainLoop.indexOf(callback),1);clearTimeout(timer);
   const gl=GL.currentContext.GLctx,px=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
   gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,px);
   let min=255,max=0,total=0;for(let i=0;i<px.length;i+=4){const y=(px[i]+px[i+1]+px[i+2])/3;min=Math.min(min,y);max=Math.max(max,y);total+=y;}
   resolve({error:gl.getError(),width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,min,max,mean:total/(px.length/4),blend:gl.isEnabled(gl.BLEND),depth:gl.isEnabled(gl.DEPTH_TEST),depthWrite:gl.getParameter(gl.DEPTH_WRITEMASK),activeTexture:gl.getParameter(gl.ACTIVE_TEXTURE)});
  };MainLoop.postMainLoop.push(callback);
 }));
 assert.equal(gpu.error,0);assert.ok(gpu.max>gpu.min,'frame must contain rendered content');
 assert.ok(Number.isFinite(gpu.mean));await p.locator('#canvas').screenshot({path:out+'/'+label+'.png'});
 result.scenes.push({label,stats,gpu});
}
try{
 await p.goto(base+'?map=c_apartment1&sw=0&timer=1&prefetch=0&debug=1&fx=1');await connected(0);
 result.modules=await p.evaluate(async()=>{const out={};for(const name of ['client.wasm','server.wasm','libref_gles3compat.wasm','filesystem_stdio.wasm','menu.wasm'])out[name]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',FS.readFile('/lib/'+name))),v=>v.toString(16).padStart(2,'0')).join('');return out;});
 assert.deepEqual(result.modules,expected.modules);
 await cmd('sv_cheats 1\nr_cof_modellight 1\ngl_gamma 1\ngl_brightness 0');
 const dump=await cmd('cof_give weapon_mobile\ncof_dump');const slot=[...dump.matchAll(/carried (\d+): (\S+)/g)].find(m=>m[2]==='weapon_mobile')?.[1];assert.ok(slot!==undefined);await cmd('cof_equip '+slot);
 await inspect('apartment-default');
 // The original command deliberately does nothing while the phone is the active weapon;
 // its primary attack switches that viewmodel instead. Exercise the F command with the knife,
 // matching the existing flashlight fixture, while preserving a separate phone render capture.
 const knifeDump=await cmd('cof_give weapon_switchblade\ncof_dump');
 const knifeSlot=[...knifeDump.matchAll(/carried (\d+): (\S+)/g)].find(m=>m[2]==='weapon_switchblade')?.[1];assert.ok(knifeSlot!==undefined);
 await cmd('cof_equip '+knifeSlot);
 assert.match(await cmd('cof_weapon_status'),/COF\/PHONE mode=\d+ light=0 /);
 assert.match(await cmd('flashlight\ncof_weapon_status'),/COF\/PHONE mode=\d+ light=1 /);await inspect('apartment-flashlight-on');
 assert.match(await cmd('flashlight\ncof_weapon_status'),/COF\/PHONE mode=\d+ light=0 /);await inspect('apartment-flashlight-off');
 await cmd('gl_brightness 0.1');await inspect('apartment-brightness-01');
 assert.match(await cmd('gl_brightness 0\nflashlight\ncof_weapon_status'),/COF\/PHONE mode=\d+ light=1 /);
 await cmd('save studio_audit');
 let previous=connections;await p.evaluate(()=>CoFDebug.cmd('load studio_audit'));await connected(previous);await inspect('apartment-restored');
 assert.match(await cmd('cof_weapon_status'),/COF\/PHONE mode=\d+ light=1 /);
 await p.evaluate(()=>CoFPreload('c_nightmare'));previous=connections;await p.evaluate(()=>CoFDebug.cmd('map c_nightmare'));await connected(previous);await inspect('nightmare-transition');
 await p.evaluate(()=>CoFPreload('c_apartment1'));previous=connections;await p.evaluate(()=>CoFDebug.cmd('map c_apartment1'));await connected(previous);await inspect('apartment-return');
 if(auditDraws){result.draws=await p.evaluate(()=>StudioAuditDraws);assert.equal(result.draws.invalidScale,0);
 assert.ok(result.draws.scales[1]>0&&result.draws.scales[2]>0,'actual draws must use both normal and Studio x2 combines');}
 assert.deepEqual(errors,[]);result.passed=true;
}catch(e){result.failure=String(e.stack);process.exitCode=1;}
finally{result.errors=errors;fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));fs.writeFileSync(out+'/engine.log',logs.join('\n'));await b.close();}
console.log(result.passed?'PASS Studio integration, mounted hashes, save/load, map transitions and GL readback':result.failure);
