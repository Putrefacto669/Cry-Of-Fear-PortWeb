// Real-map diagnostic: granted equipment does not certify natural progression.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const [base, out] = process.argv.slice(2);
assert.ok(base && out && !fs.existsSync(out), 'Use a new results directory');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
const logs = [], errors = [], results = [];
let modules;
let serviceWorkerControlled;
page.on('console', m => logs.push(m.text()));
page.on('pageerror', e => errors.push(e.message));
let serial = 0;
const cmd = async text => {
  const start = logs.length, token = `phone_${++serial}`;
  await Promise.all([
    page.waitForEvent('console', { predicate: m => m.text().includes(`COF/FENCE ${token} `), timeout: 30000 }),
    page.evaluate(c => CoFDebug.cmd(c), `${text}\ncof_fence ${token}`),
  ]);
  return logs.slice(start).join('\n');
};
const snapshot = async name => {
  await page.waitForTimeout(1200);
  const state = await cmd('cof_dump\ncof_weapon_status\ncof_inspect !player\nr_cofspot_fov\nbind MOUSE2');
  const ui = await page.evaluate(() => ({ fx: CoFPostFX.get(), pointer: !!document.pointerLockElement,
    bars: [...document.querySelectorAll('#cof-status > *')].map(e => ({ classes: e.className,
      display: getComputedStyle(e).display, opacity: getComputedStyle(e).opacity,
      bounds: { x: e.getBoundingClientRect().x, y: e.getBoundingClientRect().y,
        width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height } })) }));
  const pixels = await page.evaluate(() => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Frame timeout')), 30000);
    const fn = () => {
      MainLoop.postMainLoop.splice(MainLoop.postMainLoop.indexOf(fn), 1); clearTimeout(timer);
      const gl = GL.currentContext.GLctx, w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      const p = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, p);
      let sum = 0, n = 0;
      // Upper wall excludes the phone viewmodel and the HTML HUD.
      for (let y = h * .55 | 0; y < (h * .8 | 0); y++) for (let x = w * .3 | 0; x < (w * .7 | 0); x++) {
        const i = (y * w + x) * 4; sum += .2126 * p[i] + .7152 * p[i + 1] + .0722 * p[i + 2]; n++;
      }
      resolve({ mean: sum / n, glError: gl.getError() });
    }; MainLoop.postMainLoop.push(fn);
  }));
  await page.screenshot({ path: `${out}/${name}.png` });
  const phone = state.match(/COF\/PHONE mode=(\d+) light=(\d+) dual=(\d+) message=(\d+)/);
  results.push({ name, state, phone: phone ? { mode: +phone[1], light: +phone[2], dual: +phone[3], message: +phone[4] } : null, ui, pixels });
};
try {
  await page.goto(`${base}?map=c_apartment1&timer=1&sw=${process.env.COF_SW === '1' ? '1' : '0'}&fx=1&prefetch=0&debug=1`);
  await page.waitForFunction(() => window.CoFRuntimeReady, {}, { timeout: 180000 });
  const start = Date.now();
  while (!logs.some(l => l.includes('client connected'))) {
    assert.ok(Date.now() - start < 180000); await page.waitForTimeout(100);
  }
  await cmd('sv_cheats 1\npausable 0');
  modules = await page.evaluate(async () => Object.fromEntries(await Promise.all(
    ['/lib/server.wasm', '/lib/client.wasm', '/lib/libref_gles3compat.wasm'].map(async path => [path,
      [...new Uint8Array(await crypto.subtle.digest('SHA-256', FS.readFile(path)))].map(v => v.toString(16).padStart(2, '0')).join('')]))));
  await page.waitForTimeout(20000);
  await page.evaluate(() => { const original = CoFHUD.handle; window.__hud = [];
    CoFHUD.handle = function(...args) { __hud.push(args); return original.apply(this, args); }; });
  await cmd('cof_give weapon_mobile\ncof_give weapon_switchblade');
  const bag = await cmd('cof_dump'), phone = bag.match(/bag (\d+): weapon_mobile/), knife = bag.match(/bag (\d+): weapon_switchblade/);
  assert.ok(phone && knife, bag);
  await cmd(`cof_equip ${phone[1]}`);
  await page.waitForTimeout(1000);
  await page.mouse.click(400, 200); // Acquire Pointer Lock; record actual input effects below.
  await page.waitForTimeout(1500);
  await snapshot('phone-before');
  await page.mouse.click(400, 200, { button: 'right' });
  await snapshot('phone-after-right');
  await page.mouse.click(400, 200);
  await snapshot('phone-other-mode');
  await page.mouse.click(400, 200, { button: 'right' });
  await snapshot('phone-other-after-right');
  await page.keyboard.press('f');
  await snapshot('phone-after-f');
  await cmd(`cof_equip ${knife[1]}`);
  await snapshot('knife-before');
  await page.keyboard.press('f');
  await snapshot('knife-after-f');
  await page.keyboard.press('f');
  await snapshot('knife-after-second-f');
  if (process.env.COF_EXPECT_CONTROLS === '1') {
    const by = Object.fromEntries(results.map(r => [r.name, r]));
    for (const [a, b] of [['phone-before', 'phone-after-right'], ['phone-other-mode', 'phone-other-after-right'],
      ['phone-other-after-right', 'phone-after-f']]) assert.deepEqual(by[a].phone, by[b].phone, `${a} -> ${b}: unexpected light/mode change`);
    assert.notEqual(by['phone-before'].phone.mode, by['phone-other-mode'].phone.mode, 'Primary must switch modes');
    assert.equal(by['phone-other-mode'].phone.light, by['phone-other-mode'].phone.mode);
    assert.equal(by['knife-before'].phone.light, 0);
    assert.equal(by['knife-after-f'].phone.light, 1);
    assert.equal(by['knife-after-second-f'].phone.light, 0);
    for (const r of results) {
      assert.equal(r.ui.fx.flashlight, false, `${r.name}: independent postfx flashlight`);
      assert.equal(r.ui.bars.length, 2);
      for (const bar of r.ui.bars) { assert.match(bar.classes, /\bon\b/); assert.equal(bar.opacity, '1'); assert.ok(bar.bounds.width > 0 && bar.bounds.height > 0); }
    }
  }
  fs.writeFileSync(`${out}/hud.json`, JSON.stringify(await page.evaluate(() => __hud), null, 2));
  serviceWorkerControlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
  if (process.env.COF_SW === '1') assert.ok(serviceWorkerControlled, 'Service Worker must control the publication test');
  assert.equal(errors.length, 0);
  for (const r of results) assert.equal(r.pixels.glError, 0);
} finally {
  fs.writeFileSync(`${out}/result.json`, JSON.stringify({ base, chromium: browser.version(), modules, serviceWorkerControlled, results, errors }, null, 2));
  fs.writeFileSync(`${out}/console.log`, logs.join('\n'));
  await browser.close();
}
console.log('PASS diagnostic captured; lighting semantics require comparison');
