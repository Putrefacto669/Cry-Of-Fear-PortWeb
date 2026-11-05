import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'/root/cof-audits/browser-1.64.1/browsers/chromium-1248/chrome-linux64/chrome'});
const p=await b.newPage();await p.goto('http://127.0.0.1:8138');await p.locator('[data-language=swedish]').click();await p.reload();await p.locator('#launcher-language-change').click();
console.log(await p.evaluate(()=>({gate:document.querySelector('#launcher-language').hidden,api:CoFLauncher.language})));
await p.keyboard.press('Escape');console.log(await p.evaluate(()=>({gate:document.querySelector('#launcher-language').hidden,focus:document.activeElement.outerHTML})));
await p.waitForTimeout(200);console.log(await p.locator('#launcher-language').isHidden());await b.close();
