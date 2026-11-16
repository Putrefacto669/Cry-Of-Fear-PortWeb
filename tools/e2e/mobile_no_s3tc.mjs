// Mobile GPUs (Adreno, Mali, PowerVR, Apple) usually lack WEBGL_compressed_texture_s3tc. stage_map.py --texcomp
// ships the world textures as DDS (BC1/BC3). This hides the extension the way such a phone does and records what
// the renderer reports and draws, with and without it. Usage: node mobile_no_s3tc.mjs <base url> <out> [map] [hide 0|1]
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out,map='c_intro',hide='1']=process.argv.slice(2);assert.ok(base&&out&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true});
if(hide==='1')await ctx.addInitScript(()=>{
 const hidden=new Set(['WEBGL_compressed_texture_s3tc','WEBGL_compressed_texture_s3tc_srgb','EXT_texture_compression_bptc','EXT_texture_compression_rgtc']);
 for(const C of [WebGLRenderingContext,WebGL2RenderingContext]){
  const ge=C.prototype.getExtension,gs=C.prototype.getSupportedExtensions;
  C.prototype.getExtension=function(n){return hidden.has(n)?null:ge.call(this,n);};
  C.prototype.getSupportedExtensions=function(){return (gs.call(this)||[]).filter(n=>!hidden.has(n));};
 }});
const p=await ctx.newPage(),logs=[],errors=[],r={map,hidden:hide==='1'};
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto(`${base}?map=${map}&sw=0&fx=0&timer=1&debug=1&input=mobile`);
 const t=Date.now();while(!logs.some(l=>l.includes('client connected'))){assert.ok(Date.now()-t<180000,'connect');await p.waitForTimeout(500);}
 r.extensions=await p.evaluate(()=>{const c=document.createElement('canvas').getContext('webgl2');return c?c.getSupportedExtensions().filter(n=>/compress/i.test(n)):null;});
 const total=+(process.env.SHOT_SECONDS||24),step=+(process.env.SHOT_STEP||8);for(let s=step;s<=total;s+=step){await p.waitForTimeout(step*1000);await p.screenshot({path:`${out}/${map}-${String(s).padStart(3,'0')}s.png`});}
 r.textureLines=[...new Set(logs.filter(l=>/dds|dxt|compress|texture|s3tc|notexture|unsupported/i.test(l)).map(l=>l.replace(/^\[[^\]]*\]\s*/,'')))].slice(0,40);
 r.glErrors=logs.filter(l=>/GL_INVALID|WebGL:/i.test(l)).slice(0,10);r.jsErrors=errors;
}catch(e){r.failure=String(e.stack||e);process.exitCode=1;}finally{fs.writeFileSync(`${out}/result.json`,JSON.stringify(r,null,2));fs.writeFileSync(`${out}/engine.log`,logs.join('\n'));await browser.close();}
console.log(JSON.stringify({ext:r.extensions,lines:r.textureLines?.slice(0,12),failure:r.failure?.slice(0,200)}));
