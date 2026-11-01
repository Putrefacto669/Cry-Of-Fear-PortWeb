// Real apartment graphics diagnostic. Inventory setup does not certify progression.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const require = createRequire(import.meta.url);
const base = process.argv[2] || 'http://127.0.0.1:8098/';
const out = process.argv[3] || `/tmp/cof-light-${Date.now()}`;
if (fs.existsSync(out)) throw Error(`Output directory already exists: ${out}`);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: [
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required',
] });
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
const logs = [], errors = [];
page.on('console', m => logs.push(m.text()));
page.on('pageerror', e => errors.push(e.message));
let serial = 0;
const cmd = async text => {
  const start = logs.length, token = `light_${++serial}`;
  await Promise.all([
    page.waitForEvent('console', { predicate: m => m.text().includes(`COF/FENCE ${token} `), timeout: 30000 }),
    page.evaluate(c => CoFDebug.cmd(c), `${text}\ncof_fence ${token}`),
  ]);
  return logs.slice(start).join('\n');
};
const until = async (fn, timeout) => {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeout) throw Error('State timeout');
    await page.waitForTimeout(100);
  }
};
// Use the SDL relative mouse path; never set player angles or teleport.
const turnTo = async yaw => {
  await page.mouse.click(400, 200);
  await page.waitForTimeout(300);
  if (!await page.evaluate(() => !!document.pointerLockElement)) {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
  }
  assert.ok(await page.evaluate(() => !!document.pointerLockElement), 'Pointer Lock missing');
  const settings = await cmd('sensitivity\nm_yaw\nm_pitch');
  const cv = n => Number(settings.match(new RegExp('"' + n + '" is "([^"]+)"'))?.[1]);
  const sx = cv('sensitivity') * cv('m_yaw'), sy = cv('sensitivity') * cv('m_pitch');
  assert.ok(sx > 0 && sy > 0, settings);
  for (let i = 0; i < 10; i++) {
    const pose = await cmd('viewpos');
    const m = pose.match(/ang \(\s*([-\d.eE+]+)\s+([-\d.eE+]+)/);
    assert.ok(m, pose);
    const pitch = Number(m[1]), current = Number(m[2]);
    const error = ((yaw - current + 540) % 360) - 180;
    if (Math.abs(error) < .035 && Math.abs(pitch) < .035) return;
    await page.evaluate(({ dx, dy }) => document.querySelector('canvas').dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, movementX: dx, movementY: dy, clientX: 0, clientY: 0 }),
    ), { dx: Math.round(-error / sx), dy: Math.round(-pitch / sy) });
    await page.waitForTimeout(150);
  }
  throw Error('Could not aim with relative mouse input');
};
try {
  await page.goto(`${base}?map=c_apartment1&timer=1&fx=1&sw=${process.env.COF_SW === '1' ? '1' : '0'}&prefetch=0&debug=1`);
  await page.waitForFunction(() => typeof CoFDebug !== 'undefined' && document.querySelector('canvas')?.width > 0,
    {}, { timeout: 180000 });
  await until(() => logs.some(s => s.includes('client connected')), 180000);
  const configuration = await cmd('sv_cheats 1\npausable 0\ncof_unfreeze !player\nr_dynamic\ngl_overbright\ngl_vbo');
  await page.evaluate(() => CoFPostFX.set({ flashlight: false, grain: 0, grey: 0, vignette: 0, blur: 0 }));
  // Let the original introduction return the view to the player.
  await page.waitForTimeout(30000);
  const inventory = await cmd('cof_give weapon_mobile\ncof_give weapon_switchblade\ncof_equip 1\ncof_dump');
  assert.match(inventory, /carried \d+: weapon_mobile/);
  assert.match(inventory, /carried \d+: weapon_switchblade/);
  if (process.env.COF_OVERBRIGHT !== undefined) await cmd(`gl_overbright ${Number(process.env.COF_OVERBRIGHT)}`);
  await page.evaluate(delay => {
    window.__frameIntervals = [];
    let last = performance.now();
    MainLoop.postMainLoop.push(() => {
      const now = performance.now();
      __frameIntervals.push(now - last); last = now;
      if (__frameIntervals.length > 32) __frameIntervals.shift();
      // Optional diagnostic stall, never installed by the product.
      const end = performance.now() + delay;
      while (performance.now() < end) {}
    });
  }, Number(process.env.COF_FRAME_DELAY_MS || 0));
  await page.evaluate(() => {
    const gl = GL.currentContext.GLctx, original = gl.texSubImage2D.bind(gl);
    window.__uploads = { calls: 0, formats: {} };
    gl.texSubImage2D = (...args) => {
      __uploads.calls++;
      const key = `${args[6]},${args[7]}`;
      __uploads.formats[key] = (__uploads.formats[key] || 0) + 1;
      return original(...args);
    };
  });
  const capture = async name => {
    console.log(`capture ${name}`);
    const frame = await page.evaluate(() => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error('Frame timeout')), 30000);
      const callback = () => {
        MainLoop.postMainLoop.splice(MainLoop.postMainLoop.indexOf(callback), 1);
        clearTimeout(timeout);
        const gl = GL.currentContext.GLctx, w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
        const pixels = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const stats = (x0, y0, x1, y1) => {
          let sum = 0, count = 0, dark = 0;
          for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
            const i = (y * w + x) * 4;
            const value = .2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2];
            sum += value; dark += value < 10; count++;
          }
          return { mean: sum / count, dark: dark / count };
        };
        const chunks = Array.from({ length: Math.ceil(pixels.length / 16384) }, (_, i) =>
          String.fromCharCode(...pixels.subarray(i * 16384, (i + 1) * 16384)));
        resolve({ width: w, height: h,
          center: stats(w * .35 | 0, h * .35 | 0, w * .65 | 0, h * .65 | 0),
          world: stats(0, h * .2 | 0, w, h * .85 | 0),
          frameIntervals: __frameIntervals.slice(), uploads: structuredClone(__uploads),
          pixels: btoa(chunks.join('')), glError: gl.getError() });
      };
      MainLoop.postMainLoop.push(callback);
    }));
    fs.writeFileSync(`${out}/${name}.rgba`, Buffer.from(frame.pixels, 'base64'));
    delete frame.pixels;
    await page.screenshot({ path: `${out}/${name}.png` });
    frame.pose = await cmd('viewpos');
    return frame;
  };
  const settleCapture = async name => { await page.waitForTimeout(1500); return capture(name); };
  const result = { base, playwright: require('playwright/package.json').version, chromium: browser.version(),
    configuration, settings: await cmd('cof_inspect !player\nviewpos\ngl_overbright'), off: await capture('off') };
  await page.evaluate(() => CoFPostFX.set({ flashlight: true }));
  result.old = await settleCapture('old');
  await page.evaluate(() => CoFPostFX.set({ flashlight: false }));
  await cmd('flashlight'); result.spot = await settleCapture('spot');
  await cmd('flashlight'); await turnTo(90);
  result.wallOff = await settleCapture('wall-off');
  await cmd('flashlight'); result.wallSpot = await settleCapture('wall-spot');
  result.wallSettings = await cmd('viewpos\nr_cofspot_fov');
  await cmd('r_dynamic 0'); result.noDynamic = await settleCapture('no-dynamic');
  await cmd('r_dynamic 1'); result.dynamicAgain = await settleCapture('dynamic-again');
  if (process.env.COF_PERSISTENCE) {
    await cmd('save light_view_on');
    const connected = logs.filter(s => s.includes('client connected')).length;
    await page.evaluate(() => CoFDebug.cmd('load light_view_on'));
    await until(() => logs.filter(s => s.includes('client connected')).length > connected, 60000);
    await cmd('viewpos'); await page.waitForTimeout(2500);
    result.restoredOn = await capture('restored-on');
  }
  await cmd('flashlight'); result.wallOffAgain = await settleCapture('wall-off-again');
  result.serviceWorkerControlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
  result.loadedModules = await page.evaluate(async () => {
    const pairs = await Promise.all(['/lib/client.wasm', '/lib/server.wasm', '/lib/libref_gles3compat.wasm'].map(async path => {
      const digest = await crypto.subtle.digest('SHA-256', FS.readFile(path));
      return [path, Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')];
    }));
    return Object.fromEntries(pairs);
  });
  if (process.env.COF_SW === '1') assert.ok(result.serviceWorkerControlled, 'Service Worker must control the published page');
  result.errors = errors;
  fs.writeFileSync(`${out}/result.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (process.env.COF_EXPECT_FIXED) {
    assert.equal(errors.length, 0);
    assert.ok(result.wallSpot.center.mean > result.wallOff.center.mean + 5, 'Spot must light the wall');
    assert.ok(Math.abs(result.noDynamic.center.mean - result.wallOff.center.mean) < 1, 'r_dynamic=0 must remove world lighting');
    assert.ok(result.dynamicAgain.center.mean > result.wallOff.center.mean + 5, 'Dynamic upload must resume');
    assert.ok(Math.abs(result.wallOffAgain.center.mean - result.wallOff.center.mean) < 1, 'Switch off must restore baseline');
    if (result.restoredOn) assert.ok(Math.abs(result.restoredOn.center.mean - result.wallSpot.center.mean) < 1, 'Restore must preserve illumination');
    for (const frame of [result.wallOff, result.wallSpot, result.noDynamic, result.dynamicAgain, result.wallOffAgain, ...(result.restoredOn ? [result.restoredOn] : [])]) {
      assert.equal(frame.glError, 0);
      const angles = frame.pose.match(/ang \(\s*([-\d.eE+]+)\s+([-\d.eE+]+)/);
      assert.ok(angles, frame.pose);
      assert.ok(Math.abs(Number(angles[1])) < .04 && Math.abs(Number(angles[2]) - 90) < .04, frame.pose);
    }
    console.log('PASS world spotlight, dynamic updates, switch off and optional persistence');
  }
} finally {
  fs.writeFileSync(`${out}/console.log`, logs.join('\n'));
  await browser.close();
}
