// Compile the real GLES shim shaders and measure fog in eye space, with no game assets.
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium,firefox} from 'playwright';
const [oldRoot,newRoot,out]=process.argv.slice(2);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const shader=(root,name)=>fs.readFileSync(root+'/'+name+'.glsl.inc','utf8').split('\n').filter(s=>s.startsWith('"')).map(s=>JSON.parse(s)).join('');
const sources=[['historical',oldRoot],['candidate',newRoot]].map(([name,root])=>({name,vertex:shader(root,'vertex'),fragment:shader(root,'fragment')})),result={rows:[],errors:[]};
try{for(const [name,type] of [['chromium',chromium],['firefox',firefox]]){
 const b=await type.launch(name==='chromium'?{executablePath:'/root/cof-audits/browser-1.64.1/browsers/chromium-1248/chrome-linux64/chrome',args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{headless:false,firefoxUserPrefs:{'webgl.force-enabled':true,'media.volume_scale':'0.0'}});
 try{const p=await b.newPage();p.on('pageerror',e=>result.errors.push(e.message));await p.setContent('<canvas width="1" height="1"></canvas>');
 const rows=await p.evaluate(sources=>{
  const gl=document.querySelector('canvas').getContext('webgl2',{antialias:false,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL2 unavailable');gl.viewport(0,0,1,1);
  const header='#version 300 es\nprecision highp float;\n#define VER 300\n#define FEAT_FOG 1\n#define LOC_ATTR_POSITION 0\n#define ATTR_COLOR 0\n#define ATTR_TEXCOORD0 0\n#define ATTR_TEXCOORD1 0\n#define ATTR_NORMAL 0\n#define FEAT_ALPHA_TEST 0\n';
  const rows=[];for(const source of sources){
   function compile(type,s){const shader=gl.createShader(type);gl.shaderSource(shader,header+s);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;}
   const prog=gl.createProgram();gl.attachShader(prog,compile(gl.VERTEX_SHADER,source.vertex));gl.attachShader(prog,compile(gl.FRAGMENT_SHADER,source.fragment));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));gl.useProgram(prog);
   const vao=gl.createVertexArray();gl.bindVertexArray(vao);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),gl.STATIC_DRAW);const location=gl.getAttribLocation(prog,'inPosition');gl.vertexAttribPointer(location,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(location);
   gl.uniform4f(gl.getUniformLocation(prog,'uColor'),.8,.6,.4,1);
   for(const projection of ['orthographic','perspective'])for(const [start,end] of [[100,1000],[200,1500],[500,1500]])for(const linear of [0,1])for(const distance of [start*.5,start,(start+end)/2,end,end*1.2]){
    const mv=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,-distance,1]);let mvp=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
    if(projection==='perspective'){const clipZ=(4001*distance-8000)/3999;mvp=new Float32Array([distance,0,0,0,0,distance,0,0,0,0,1,0,0,0,clipZ,distance]);}
    gl.uniformMatrix4fv(gl.getUniformLocation(prog,'uMVP'),false,mvp);gl.uniformMatrix4fv(gl.getUniformLocation(prog,'uModelView'),false,mv);gl.uniform4f(gl.getUniformLocation(prog,'uFog'),.1,.2,.3,1.73/end);gl.uniform4f(gl.getUniformLocation(prog,'uFogParams'),start,end,linear,0);gl.drawArrays(gl.TRIANGLES,0,3);const bytes=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,bytes);rows.push({version:source.name,projection,start,end,linear,distance,pixel:[...bytes],glError:gl.getError()});
   }
  }return rows;
 },sources);
 let oldFailures=0;const legacy=new Map();for(const r of rows){assert.equal(r.glError,0);const key=JSON.stringify([r.projection,r.start,r.end,r.linear,r.distance]);if(!r.linear){if(r.version==='historical')legacy.set(key,r.pixel);else assert.deepEqual(r.pixel,legacy.get(key),'preserve existing exponential path');continue;}
  const factor=Math.max(0,Math.min(1,(r.end-r.distance)/(r.end-r.start))),expected=[.8,.6,.4].map((v,i)=>Math.round(255*([.1,.2,.3][i]*(1-factor)+v*factor)));const error=Math.max(...expected.map((v,i)=>Math.abs(v-r.pixel[i])));if(r.version==='candidate')assert.ok(error<=2,JSON.stringify(r));else if(error>2)oldFailures++;
 }assert.ok(oldFailures>20);result.rows.push({browser:name,version:b.version(),oldFailures,checks:rows});
 }finally{await b.close();}
}assert.deepEqual(result.errors,[]);result.passed=true;}catch(e){result.failure=String(e.stack);process.exitCode=1;}finally{fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));}
console.log(result.passed?'PASS native linear fog start/mid/end and eye distance; historical failure reproduced; exponential path preserved in both browsers':result.failure);
