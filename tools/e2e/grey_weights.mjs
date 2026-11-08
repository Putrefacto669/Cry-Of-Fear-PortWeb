// Actual production fragment shader against the original float-combiner grayscale contract.
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium,firefox} from 'playwright';
const [shaderPath,out]=process.argv.slice(2);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const shader=fs.readFileSync(shaderPath,'utf8'),result={rows:[],errors:[],reference:'client.dll 1005d7a0 / 1014c920: float combiner, not the quantized DOT3 fallback'};
try{for(const [name,type] of [['chromium',chromium],['firefox',firefox]]){
 const b=await type.launch(name==='chromium'?{executablePath:'/root/cof-audits/browser-1.64.1/browsers/chromium-1248/chrome-linux64/chrome',args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{headless:false,firefoxUserPrefs:{'webgl.force-enabled':true,'media.volume_scale':'0.0'}});
 try{const p=await b.newPage();p.on('pageerror',e=>result.errors.push(e.message));await p.setContent('<canvas width="1" height="1"></canvas>');
 const rows=await p.evaluate(fragment=>{
  const gl=document.querySelector('canvas').getContext('webgl2',{antialias:false,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL2 unavailable');
  function program(source){function compile(type,text){const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
   const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,'#version 300 es\nprecision highp float;out vec2 vUV;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vUV=p;gl_Position=vec4(p*2.-1.,0.,1.);}'));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,source));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
  const output=[];gl.bindVertexArray(gl.createVertexArray());gl.viewport(0,0,1,1);const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  for(const [version,source] of [['historical',fragment.replace('vec3( 0.32, 0.59, 0.09 )','vec3( 0.299, 0.587, 0.114 )')],['candidate',fragment]]){
   const p=program(source);gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'uScene'),0);gl.uniform2f(gl.getUniformLocation(p,'uResolution'),1,1);
   for(const rgb of [[255,0,0],[0,255,0],[0,0,255],[255,255,255],[0,0,0],[32,91,187]])for(const amount of [0,.5,1]){
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([...rgb,255]));gl.uniform1f(gl.getUniformLocation(p,'uGrey'),amount);gl.drawArrays(gl.TRIANGLES,0,3);const pixel=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);output.push({version,rgb,amount,pixel:[...pixel],glError:gl.getError()});
   }
  }return output;
 },shader);
 let oldFailures=0;for(const r of rows){const y=r.rgb.reduce((s,c,i)=>s+c*[.32,.59,.09][i],0),expected=r.rgb.map(c=>Math.round(c*(1-r.amount)+y*r.amount));const error=Math.max(...expected.map((v,i)=>Math.abs(v-r.pixel[i])));assert.equal(r.glError,0);assert.equal(r.pixel[3],255);if(r.version==='candidate')assert.ok(error<=1,JSON.stringify(r));else if(error>1)oldFailures++;}
 assert.ok(oldFailures>=4,'historical coefficients must fail the original contract');result.rows.push({browser:name,version:b.version(),oldFailures,checks:rows});
 }finally{await b.close();}
}assert.deepEqual(result.errors,[]);result.passed=true;}catch(e){result.failure=String(e.stack);process.exitCode=1;}finally{fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));}
console.log(result.passed?'PASS original float grayscale weights, historical mismatch, mix 0/0.5/1 in Chromium/Firefox':result.failure);
