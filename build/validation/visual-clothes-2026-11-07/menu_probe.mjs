import fs from 'node:fs';import {chromium} from 'playwright';
const [base,out]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({executablePath:'/root/cof-audits/browser-1.64.1/browsers/chromium-1248/chrome-linux64/chrome',args:['--mute-audio','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),p=await b.newPage({viewport:{width:960,height:720}}),logs=[],errors=[],result={};
p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto(base+'?map=c_game_menu1&sw=0&timer=1&prefetch=0&debug=1');await p.locator('#cof-menu.on').waitFor({timeout:60000});
 await p.locator('[data-action=clothes]').click();await p.locator('#cof-clothes.on').waitFor({timeout:30000});await p.waitForTimeout(1500);
 await Promise.all([p.waitForEvent('console',{predicate:m=>m.text().includes('COF/FENCE probe '),timeout:30000}),p.evaluate(()=>CoFDebug.cmd('sv_cheats 1\ncof_extras_status\ncof_clothes_render\ncof_visual_status\ncof_fence probe'))]);
 result.map=await p.evaluate(()=>CoFCurrentMap());await p.screenshot({path:out+'/preview.png'});result.passed=true;
}catch(e){result.failure=String(e.stack);await p.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{result.errors=errors;fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));fs.writeFileSync(out+'/engine.log',logs.join('\n'));await b.close();}console.log(result);
