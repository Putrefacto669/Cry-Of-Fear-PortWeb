// The prologue's natural end: c_intro must hand over to c_nightmare by itself (user report of 09/11/2026: "after
// the intro the nightmare does not load, it gets stuck"). No commands, no keys: the page plays as a user would, with
// next-map prefetch on, and the run records the console, page errors and a screenshot every 20 s.
//   node intro_to_nightmare.mjs http://127.0.0.1:8097/ <out> [minutes=8] [extra query]
//   COF_FAIL_PACK=c_nightmare: the first request for that pack fails (a server briefly unreachable);
//   with COF_FAIL_MODE=until-change, every request fails until the game asks for the level change
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const [base, out, minutes = '8', extra = ''] = process.argv.slice(2);
assert.ok(base && out && !fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const p = await b.newPage({ viewport: { width: 960, height: 600 } });
const logs = [], errors = [], r = { timeline: [] };
const t0 = Date.now(), at = () => Math.round((Date.now() - t0) / 1000);
p.on('console', m => { const t = m.text(); logs.push(`${at()}s ${t}`); if (/client connected|precarg|changelevel|no se pudo|Host_Error|ERROR|error|COF\/HUD (LOADING|MAP|INTRO)|level loaded|map /i.test(t)) r.timeline.push(`${at()}s ${t.slice(0, 200)}`); });
p.on('pageerror', e => errors.push(`${at()}s ${e}`));
// COF_FAIL_PACK=<map>: the first request for that map's pack fails, as when the server is briefly unreachable
if (process.env.COF_FAIL_PACK) {
  let failed = 0;
  // COF_FAIL_MODE=until-change: every request fails until the game asks for the level change (the safety net)
  const failing = () => process.env.COF_FAIL_MODE === 'until-change' ? !logs.some(l => /CHANGE LEVEL:/.test(l)) : failed < 1;
  await p.route(`**/packs/map_${process.env.COF_FAIL_PACK}.*`, route => failing() ? (failed++, r.timeline.push(`${at()}s ROUTE aborted ${route.request().url()}`), route.abort('connectionrefused')) : route.continue());
}
try {
  await p.goto(`${base}?map=c_intro&fx=0&timer=1&debug=1${extra || "&sw=0"}`);
  let shot = 0;
  while (Date.now() - t0 < +minutes * 60000) {
    await p.waitForTimeout(2000);
    if (at() >= shot * 20) {
      await p.screenshot({ path: `${out}/t${String(at()).padStart(4, '0')}.png` }).catch(() => {}); shot++;
      r.status = await p.evaluate(() => [document.getElementById('status')?.textContent, window.CoFCurrentMap?.()]).catch(e => String(e));
      r.timeline.push(`${at()}s STATUS ${JSON.stringify(r.status)}`);
    }
    if (logs.filter(l => /client connected/.test(l)).length >= 2 && (r.status?.[1] === 'c_nightmare')) { await p.waitForTimeout(15000); break; }
  }
  r.status = await p.evaluate(() => [document.getElementById('status')?.textContent, window.CoFCurrentMap?.()]);
  r.connected = logs.filter(l => /client connected/.test(l));
  r.errors = errors;
  await p.screenshot({ path: `${out}/final.png` });
  assert.equal(r.status[1], 'c_nightmare', `still on ${r.status[1]} after ${minutes} min: ${r.status[0]}`);
  assert.deepEqual(errors, []);
  r.passed = true; console.log(`PASS c_intro reached c_nightmare naturally (${at()} s)`);
} catch (e) { r.passed = false; r.failure = String(e.stack || e); console.error(e); process.exitCode = 1; }
fs.writeFileSync(`${out}/result.json`, JSON.stringify(r, null, 2)); fs.writeFileSync(`${out}/engine.log`, logs.join('\n'));
await b.close();
