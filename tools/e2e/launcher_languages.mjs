// No game startup needed: first choice, seven translations, persistence and keyboard access.
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium,firefox} from 'playwright';
const [base,out]=process.argv.slice(2);assert.ok(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});
const result={browsers:[],errors:[],physicalMobileTest:false};
try {
for(const [name,type] of [['chromium',chromium],['firefox',firefox]]){
 const b=await type.launch(name==='chromium'?{executablePath:'/root/cof-audits/browser-1.64.1/browsers/chromium-1248/chrome-linux64/chrome',args:['--mute-audio']}:{firefoxUserPrefs:{'media.volume_scale':'0.0'}});
 try{
  const ctx=await b.newContext({viewport:{width:1280,height:900}}),p=await ctx.newPage(),requests=[];
  await ctx.addInitScript(()=>{if(!localStorage.getItem('cofLanguage'))localStorage.setItem('cofLanguage','spanish');});
  p.on('pageerror',e=>result.errors.push(e.message));p.on('request',r=>requests.push(r.url()));
  await p.goto(base);await p.locator('#launcher-language').waitFor({state:'visible'});
  assert.equal(await p.locator('#launcher-language button').count(),7);assert.ok(await p.locator('#play').isDisabled());
  assert.ok(await p.locator('.lb-wrap').evaluate(e=>e.inert));
  await p.locator('[data-language="english"]').focus();await p.keyboard.press('Shift+Tab');
  assert.equal(await p.evaluate(()=>document.activeElement.dataset.language),'swedish');await p.keyboard.press('Tab');
  assert.equal(await p.evaluate(()=>document.activeElement.dataset.language),'english');
  const expected={english:['en','Play'],spanish:['es','Jugar'],french:['fr','Jouer'],german:['de','Spielen'],dutch:['nl','Spelen'],norwegian:['no','Spill'],swedish:['sv','Spela']};
  const locales=[];
  for(const [language,[code,play]] of Object.entries(expected)){
   if(await p.locator('#launcher-language').isHidden())await p.locator('#launcher-language-change').click();
   await p.locator(`[data-language="${language}"]`).click();assert.equal(await p.locator('#play').textContent(),play);
   assert.equal(await p.locator('html').getAttribute('lang'),code);
   assert.equal(await p.evaluate(()=>localStorage.getItem('cofLanguage')),'spanish','launcher must not replace game preference');
   assert.equal(await p.evaluate(()=>localStorage.getItem('cofLauncherLanguage')),language);
   const content=await p.locator('.lb-wrap').innerText();assert.ok(!content.includes('undefined'));assert.equal(await p.locator('.lb-credits a').count(),4);
   locales.push({language,code,play});
  }
  await p.reload();await p.locator('#launcher').waitFor({state:'visible'});assert.ok(await p.locator('#launcher-language').isHidden());assert.equal(await p.locator('#play').textContent(),'Spela');
  await p.locator('#launcher-language-change').click();await p.keyboard.press('Escape');assert.ok(await p.locator('#launcher-language').isHidden());
  await p.screenshot({path:out+'/'+name+'-launcher.png'});
  await p.setViewportSize({width:320,height:568});await p.locator('#launcher-language-change').click();
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  for(const button of await p.locator('#launcher-language button').all())assert.ok(await button.isVisible());
  await p.screenshot({path:out+'/'+name+'-language-narrow.png'});
  assert.equal(requests.filter(s=>/\/packs\/|xash3d\.(js|wasm)/.test(s)).length,0,'choosing launcher language must not start the game');
  result.browsers.push({browser:name,version:b.version(),locales,firstChoice:true,persistence:true,gamePreferencePreserved:true,keyboard:true,narrowLayout:true,noEngineDownload:true});
  await ctx.close();
 }finally{await b.close();}
}
assert.deepEqual(result.errors,[]);result.passed=true;
}catch(e){result.failure=String(e.stack);process.exitCode=1;}
finally{fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));}
if(result.passed)console.log('PASS seven launcher languages, first choice, persistence, independent game preference and keyboard in Chromium/Firefox');else console.error(result.failure);
