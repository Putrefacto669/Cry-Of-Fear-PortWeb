// Studio model lighting: Cry of Fear client lighting (r_cof_modellight 1) against the engine's previous
// lighting (0), same session, same view, same frame state. Port-internal evidence only: it does not
// compare with the native game.
//   node model_light.mjs http://127.0.0.1:8092/ /tmp/out [map...]
// For each map: the view after the opening (no teleport), a weapon in hand, the game paused, and
// captures with both lightings plus two masks: r_drawentities 0 (world only) and r_drawviewmodel 0.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8092/';
const out = process.argv[3] || `/tmp/cof-model-light-${Date.now()}`;
const maps = process.argv.slice(4).length ? process.argv.slice(4)
  : ['c_intro', 'c_nightmare', 'c_start', 'c_apartment1', 'c_apartmentsick'];
const weapons = (process.env.COF_WEAPONS || 'weapon_glock').split(',');
if (fs.existsSync(out)) throw Error(`Output directory already exists: ${out}`);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const lum = (p, i) => .2126 * p[i] + .7152 * p[i + 1] + .0722 * p[i + 2];
const result = { base, maps: {} };

for (const map of maps) {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const logs = [], errors = [];
  page.on('console', m => logs.push(m.text()));
  page.on('pageerror', e => errors.push(e.message));
  let serial = 0;
  const cmd = async text => {
    const start = logs.length, token = `ml_${++serial}`;
    await Promise.all([
      page.waitForEvent('console', { predicate: m => m.text().includes(`COF/FENCE ${token} `), timeout: 30000 }),
      page.evaluate(c => CoFDebug.cmd(c), `${text}\ncof_fence ${token}`),
    ]);
    return logs.slice(start).join('\n');
  };
  const frame = async name => {
    await page.waitForTimeout(700);
    const data = await page.evaluate(() => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error('Frame timeout')), 30000);
      const callback = () => {
        MainLoop.postMainLoop.splice(MainLoop.postMainLoop.indexOf(callback), 1);
        clearTimeout(timeout);
        const gl = GL.currentContext.GLctx, w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
        const px = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const chunks = Array.from({ length: Math.ceil(px.length / 16384) }, (_, i) =>
          String.fromCharCode(...px.subarray(i * 16384, (i + 1) * 16384)));
        resolve({ w, h, px: btoa(chunks.join('')), glError: gl.getError() });
      };
      MainLoop.postMainLoop.push(callback);
    }));
    if (name) await page.locator('#canvas').screenshot({ path: `${out}/${map}-${name}.png` });
    return { ...data, px: Buffer.from(data.px, 'base64') };
  };
  const mask = (a, b) => {
    const m = new Uint8Array(a.w * a.h);
    for (let i = 0, j = 0; j < m.length; i += 4, j++)
      m[j] = Math.abs(a.px[i] - b.px[i]) + Math.abs(a.px[i + 1] - b.px[i + 1]) + Math.abs(a.px[i + 2] - b.px[i + 2]) > 12;
    return m;
  };
  const stats = (f, m, want) => {
    let sum = 0, n = 0, dark = 0;
    for (let i = 0, j = 0; j < m.length; i += 4, j++) if (m[j] === want) { const v = lum(f.px, i); sum += v; n++; dark += v < 16; }
    return { pixels: n, mean: n ? +(sum / n).toFixed(2) : null, dark: n ? +(dark / n).toFixed(3) : null };
  };
  try {
    await page.goto(`${base}?map=${map}&sw=0&timer=1&fx=0&prefetch=0&debug=1`);
    await page.waitForFunction(() => typeof CoFDebug !== 'undefined' && document.querySelector('canvas')?.width > 0, {}, { timeout: 180000 });
    const t0 = Date.now();
    while (!logs.some(s => s.includes('client connected'))) { assert.ok(Date.now() - t0 < 180000, 'connect'); await page.waitForTimeout(200); }
    await page.waitForTimeout(Number(process.env.COF_SETTLE_MS || 30000)); // the map's opening
    // the original film noise is redrawn every frame: off for the measurement only
    const setup = await cmd('sv_cheats 1\npausable 1\ncl_noiseeffect 0\nr_cof_lightmaps\ngl_brightness\ngl_contrast\ngl_lambert');
    const entry = { setup: setup.split('\n').filter(s => s.includes('" is "')), weapons: {} };
    const pose = await cmd('cof_inspect !player');
    const origin = (pose.match(/origin=([-\d.]+),([-\d.]+),([-\d.]+)/) || []).slice(1).map(Number);
    // the nearest env_model, and the nearest one whose renderfx sets its ambient light (101-200)
    const listed = [...(await cmd('cof_list env_model')).matchAll(/#(\d+) origin=([-\d]+),([-\d]+),([-\d]+) \S+ renderfx=(\d+) \S+ \S+ model=(\S+)/g)]
      .map(m => ({ index: m[1], fx: +m[5], model: m[6], d: Math.round(Math.hypot(m[2] - origin[0], m[3] - origin[1], m[4] - origin[2])) }))
      .filter(m => m.fx !== 137).sort((a, b) => a.d - b.d);
    const nearFx = listed.find(m => m.fx > 100 && m.fx <= 200);
    entry.origin = origin; entry.envmodel = listed[0] || null; entry.envmodelFx = nearFx || null;
    // simon: Simon's own model from the SDK's third person camera (debug view, restored afterwards)
    const scenes = [['spawn', ''], ['simon', 'thirdperson\ncam_idealdist 80'], ['monster', 'firstperson\ncof_face'],
      ...(listed[0] ? [['envmodel', `cof_face #${listed[0].index}`]] : []),
      ...(nearFx && nearFx !== listed[0] ? [['envmodelfx', `cof_face #${nearFx.index}`]] : [])];
    for (const weapon of weapons) {
      const dump = await cmd(`cof_give ${weapon}\ncof_dump`);
      const slot = [...dump.matchAll(/carried (\d+): (\S+)/g)].find(m => m[2] === weapon)?.[1];
      if (slot !== undefined) await cmd(`cof_equip ${slot}`);
      await page.waitForTimeout(2500); // draw animation
     for (const [scene, look] of scenes) {
      const key = `${weapon}-${scene}`;
      if (look) { await cmd(look); await page.waitForTimeout(1200); }
      const view = ((await cmd('cof_inspect !player')).match(/origin=\S+/) || [''])[0];
      await cmd('pause');
      await cmd('r_cof_modellight 1\nr_drawentities 1\nr_drawviewmodel 1\ncof_model_light');
      const cof = await frame(`${key}-cof`);
      const lightStats = (await cmd('cof_model_light')).split('\n').find(s => s.includes('cof_model_light active=')) || '';
      await cmd('r_cof_modellight 0');
      const xash = await frame(`${key}-previous`);
      await cmd('r_cof_modellight 1\nr_drawentities 0');
      const world = await frame();
      await cmd('r_drawentities 1\nr_drawviewmodel 0');
      const noView = await frame();
      await cmd('r_drawviewmodel 1');
      const again = await frame(); // stability control: same state as the first capture
      await cmd('pause');

      const viewMask = mask(cof, noView);
      const entMaskAll = mask(cof, world);
      const entMask = entMaskAll.map((v, j) => v && !viewMask[j] ? 1 : 0);
      const worldMask = entMaskAll.map(v => v ? 0 : 1);
      let drift = 0; for (let i = 0; i < cof.px.length; i++) drift += Math.abs(cof.px[i] - again.px[i]);
      entry.weapons[key] = {
        slot, view, lightStats,
        viewmodel: { cof: stats(cof, viewMask, 1), previous: stats(xash, viewMask, 1) },
        entities: { cof: stats(cof, entMask, 1), previous: stats(xash, entMask, 1) },
        world: { cof: stats(cof, worldMask, 1), previous: stats(xash, worldMask, 1) },
        stabilityMeanAbs: +(drift / cof.px.length).toFixed(3),
        glErrors: [cof.glError, xash.glError, world.glError, noView.glError, again.glError],
      };
     }
    }
    entry.errors = errors;
    result.maps[map] = entry;
    console.log(map, JSON.stringify(entry));
  } catch (e) {
    result.maps[map] = { error: String(e), errors, tail: logs.slice(-15) };
    console.log(map, 'ERROR', e.message);
  } finally {
    fs.writeFileSync(`${out}/result.json`, JSON.stringify(result, null, 2));
    await page.close();
  }
}
await browser.close();
