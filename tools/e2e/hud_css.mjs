// Real HUD script and synthetic TGA fixtures: cross-engine geometry and visibility contracts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,firefox} from 'playwright';
const [source,out,baseline]=process.argv.slice(2);
assert.ok(source&&out&&baseline&&!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const result={rows:[],errors:[]};
for(const [name,type] of [['chromium',chromium],['firefox',firefox]]){
 const browser=await type.launch(name==='chromium'?{executablePath:'/root/cof-audits/browser-1.64.1/browsers/chromium-1248/chrome-linux64/chrome'}:{});
 try{
  for(const [version,file] of [['published',baseline],['candidate',source]]){
   const p=await browser.newPage({viewport:{width:1280,height:800}});
   p.on('pageerror',e=>result.errors.push(e.message));
   await p.route('http://hud-css.test/**', route => route.fulfill({contentType:'text/html',body:'<!doctype html><title>HUD fixture</title>'}));
   await p.goto('http://hud-css.test/');await p.setContent('<main style="position:relative;height:100vh"><canvas id="canvas"></canvas></main>');
   await p.evaluate(()=>{
    window.mapValue='c_apartment1';window.CoFCurrentMap=()=>mapValue;
    window.Module={ccall(){}};
    window.FS={analyzePath:()=>({exists:true}),readFile(path){
     const fill=/_(barempty|bar)\.tga$/.test(path),w=fill?11:32,h=fill?118:160;
     const d=new Uint8Array(18+w*h*4);d[2]=2;d[12]=w;d[14]=h;d[16]=32;d[17]=32;d.fill(255,18);return d;
    }};
   });
   await p.addScriptTag({content:fs.readFileSync(file,'utf8')});
   for(const height of [360,480,800,1440]){
    await p.setViewportSize({width:1280,height});await p.evaluate(()=>CoFHUD.handle('STAT 50 75 0 0'));await p.waitForTimeout(650);
    const row=await p.evaluate(()=>({bars:[...document.querySelectorAll('.cof-bar')].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,opacity:+getComputedStyle(e).opacity,clipHeight:e.querySelector('.clip').getBoundingClientRect().height,fullHeight:e.querySelector('.full').getBoundingClientRect().height,images:[...e.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0)}))}));
    result.rows.push({browser:name,version,viewportHeight:height,...row});
    const scale=Math.max(1,Math.min(2.4,height/480));
    if(name==='firefox'&&version==='published')assert.equal(row.bars[0].height,0,'reproduce Gecko collapse');
    else for(const [i,bar] of row.bars.entries()){
     assert.ok(Math.abs(bar.width-32*scale)<.05);assert.ok(Math.abs(bar.height-160*scale)<.05);
     assert.ok(Math.abs(bar.fullHeight-118*scale)<.05);assert.ok(Math.abs(bar.clipHeight-118*scale*(i===0?.5:.75))<.05);
     assert.equal(bar.opacity,1);assert.ok(bar.images);
    }
   }
   if(version==='candidate')for(const [map,hide,visible] of [['c_apartment1',8,false],['c_nightmare',0,false],['c_apartment2',0,true]]){
    await p.evaluate(({map,hide})=>{mapValue=map;CoFHUD.handle('STAT 100 100 0 '+hide);},{map,hide});await p.waitForTimeout(650);
    const visibleBars=await p.evaluate(()=>[...document.querySelectorAll('.cof-bar')].every(e=>+getComputedStyle(e).opacity===1));assert.equal(visibleBars,visible);
   }
   await p.close();
  }
 }finally{await browser.close();}
}
assert.deepEqual(result.errors,[]);result.passed=true;fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));console.log('PASS published Gecko collapse, candidate geometry/health/stamina scaling and original hide flags in Chromium/Firefox');
