// Real WebGL 2 state contract, synthetic colors only; no game assets.
import fs from 'node:fs';import assert from 'node:assert/strict';import {chromium,firefox} from 'playwright';
const [source,baseline,shaders,out]=process.argv.slice(2);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const r={rows:[],errors:[]};
for(const [name,type] of [['chromium',chromium],['firefox',firefox]]){
 const b=await type.launch(name==='chromium'?{executablePath:'/root/cof-audits/browser-1.64.1/browsers/chromium-1248/chrome-linux64/chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{headless:false,firefoxUserPrefs:{'webgl.force-enabled':true}});
 try{for(const [version,file] of [['baseline',baseline],['candidate',source]]){
  const p=await b.newPage();p.on('pageerror',e=>r.errors.push(e.message));
  await p.route('http://postfx.test/**',route=>{const n=route.request().url().split('/').at(-1);return route.fulfill({contentType:n.endsWith('.glsl')?'text/plain':'text/html',body:n.endsWith('.glsl')?fs.readFileSync(shaders+'/'+n,'utf8'):'<!doctype html><canvas id="canvas" width="64" height="64"></canvas>'});});
  await p.goto('http://postfx.test/');await p.evaluate(()=>{window.GLctx=document.querySelector('canvas').getContext('webgl2');if(!GLctx)throw Error('WebGL 2 unavailable');window.MainLoop={postMainLoop:[]};window.FS={readFile(){throw Error('synthetic cookie fallback');}};});
  await p.addScriptTag({content:fs.readFileSync(file,'utf8')});await p.evaluate(()=>CoFPostFX.attach());
  const state=await p.evaluate(()=>{
   const g=GLctx,texture=g.createTexture();g.activeTexture(g.TEXTURE3);g.bindTexture(g.TEXTURE_2D,texture);g.pixelStorei(g.UNPACK_ALIGNMENT,8);g.viewport(3,4,60,50);g.enable(g.SCISSOR_TEST);g.scissor(7,8,40,40);g.colorMask(true,false,true,false);
   const before={viewport:[...g.getParameter(g.VIEWPORT)],mask:[...g.getParameter(g.COLOR_WRITEMASK)]};MainLoop.postMainLoop[0]();
   g.activeTexture(g.TEXTURE3);const after={viewport:[...g.getParameter(g.VIEWPORT)],mask:[...g.getParameter(g.COLOR_WRITEMASK)]};
   return {textureRetained:g.getParameter(g.TEXTURE_BINDING_2D)===texture,alignment:g.getParameter(g.UNPACK_ALIGNMENT),scissor:g.isEnabled(g.SCISSOR_TEST),before,after,error:g.getError()};
  });r.rows.push({browser:name,version,...state});
  if(version==='baseline')assert.equal(state.textureRetained,false,'reproduce first-frame texture binding leak');
  else {assert.equal(state.textureRetained,true);assert.equal(state.alignment,8);assert.equal(state.scissor,true);assert.deepEqual(state.before,state.after);assert.equal(state.error,0);await p.evaluate(()=>CoFPostFX.attach());assert.equal(await p.evaluate(()=>MainLoop.postMainLoop.length),1);}
  await p.close();
 }}finally{await b.close();}
}
assert.deepEqual(r.errors,[]);r.passed=true;fs.writeFileSync(out+'/result.json',JSON.stringify(r,null,2));console.log('PASS original first-frame GL leak reproduced and candidate GL state/idempotent attach in both browsers');
