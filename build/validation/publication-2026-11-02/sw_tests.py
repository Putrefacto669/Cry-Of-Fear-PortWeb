from pathlib import Path
r=Path('/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web')
helper='''const deployment=async page=>{
 const d=await page.evaluate(async()=>{const text=await(await fetch('sw-manifest.js',{cache:'no-store'})).text();const manifest=JSON.parse(text.match(/=\\s*(\\{[\\s\\S]*\\});/)[1]);return {manifest:manifest.version,controller:navigator.serviceWorker?.controller?.scriptURL||null};});
 if(process.env.COF_SW==='1')assert.ok(d.controller,'Service Worker must control the actual runtime');
 if(process.env.COF_EXPECT_MANIFEST)assert.equal(d.manifest,process.env.COF_EXPECT_MANIFEST);
 return d;
};
'''
for name in ['phone_singleplayer_punch','dual_hands','extras_persistence']:
 p=r/'tools/e2e'/f'{name}.mjs';s=p.read_text();assert 'const deployment=' not in s;s=s.replace('sw=0',"sw=${process.env.COF_SW||'0'}")
 if name=='extras_persistence':s=s.replace('try {',helper+'try {',1);needle='await wait(()=>count()>0);';s=s.replace(needle,needle+'result.deployment=await deployment(p);',1)
 else:s=s.replace('try{',helper+'try{',1);needle="await wait(()=>logs.some(l=>l.includes('client connected')));";assert needle in s;s=s.replace(needle,needle+'r.deployment=await deployment(p);',1)
 p.write_text(s)