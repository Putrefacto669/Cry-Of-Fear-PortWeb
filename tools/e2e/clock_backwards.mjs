// The intermittent start-up failure on demand: the wall clock (Date.now, what gettimeofday reads in
// Emscripten) steps back 2 s while c_start loads, as WSL's clock sync did in the failed runs
// ("Time to first frame: 18446744073709 seconds", "level loaded at -18446744073707.29 sec", then no
// "client connected"). The engine clock must stay monotonic and the client must connect.
//   node clock_backwards.mjs <base url> <out dir>
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const [base, out] = process.argv.slice(2);
assert.ok(base && out, 'usage: node clock_backwards.mjs <base url> <out dir>');
assert.ok(!fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/root/cof-audits/browser-1.64.1/browsers/chromium-1248/chrome-linux64/chrome',
  args: ['--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const result = { stepBackMs: 2000, passed: false };
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  // Date.now goes back 2 s as soon as the engine prints its first line, that is right after its first
  // clock reading (the wrap needs a reading earlier than that first one), and stays shifted
  await page.addInitScript(() => {
    const realNow = Date.now.bind(Date);
    let shift = 0;
    const timer = setInterval(() => {
      if ((document.getElementById('log')?.textContent || '').length > 0) {
        shift = 2000; window.__cofClockStepped = realNow(); clearInterval(timer);
      }
    }, 2);
    Date.now = () => realNow() - shift;
  });
  await page.goto(`${base}?map=c_start&sw=0&timer=1`);
  const log = () => page.evaluate(() => document.getElementById('log')?.textContent || '');
  const t0 = Date.now();
  while (Date.now() - t0 < 120000 && !/client connected/.test(await log())) await page.waitForTimeout(1000);
  const text = await log();
  fs.writeFileSync(`${out}/engine.log`, text);
  result.clockStepped = await page.evaluate(() => !!window.__cofClockStepped);
  result.connected = /client connected/.test(text);
  result.wrapped = /18446744073\d+/.test(text);
  result.firstFrame = (text.match(/Time to first frame: [-\d.]+ seconds/) || [null])[0];
  result.levelLoaded = (text.match(/level loaded at [-\d.]+ sec/) || [null])[0];
  assert.ok(result.clockStepped, 'the clock step was not injected');
  assert.ok(!result.wrapped, `engine time wrapped: ${result.firstFrame} / ${result.levelLoaded}`);
  assert.ok(result.connected, 'client did not connect');
  result.passed = true;
} finally {
  fs.writeFileSync(`${out}/result.json`, JSON.stringify(result, null, 2));
  await browser.close();
}
console.log('PASS monotonic engine clock: client connects with the wall clock stepping back 2 s');
