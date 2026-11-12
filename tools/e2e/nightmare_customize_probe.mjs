// env_customize with an omitted body/skin (applied as 0, as hl.dll 10108f00) and the camera flash that no longer
// cancels a scripted monster (11/11/2026). Checks, in the game:
//   corpses   c_nightmare: multispott1/multiwrong6 make spott1m/wrongm6 visible (body 1 = empty submodel -> 0),
//             killed 0.3 s later
//   mirror    c_nightmare: a real photo of spot9 with the camera; wrongm8's wait script must not be cancelled, so
//             its "action" (2.03 s, from 1 s after the photo) runs to the end before SF_MONSTER_WAIT_FOR_SCRIPT clears
//   scenes    c_apartment3 tvframe_b0, c_apartment5 rope_vis and badcustier2, c_intro skyblixt_0
//   oldsave   [published base] a c_nightmare game saved by the published build, loaded here: the corpse still shows
//   node nightmare_customize_probe.mjs <base url> <out> [published base url] [part ...]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const [base, out, published, ...wanted] = process.argv.slice(2);
assert.ok(base && out && !fs.existsSync(out));
fs.mkdirSync(out, { recursive: true });
const parts = wanted.length ? wanted : ['corpses', 'mirror', 'scenes', ...(published && published !== '-' ? ['oldsave'] : [])];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const result = { base, published, parts: {} };

async function open(url, map, settle = 8000) {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const logs = [], errors = [];
  page.on('console', (m) => logs.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  let serial = 0;
  const cmd = async (text) => {
    const i = logs.length, t = `nc_${++serial}`;
    await Promise.all([page.waitForEvent('console', { predicate: (m) => m.text().includes(`COF/FENCE ${t} `), timeout: 30000 }),
      page.evaluate((c) => CoFDebug.cmd(c), `${text}\ncof_fence ${t}`)]);
    return logs.slice(i).join('\n');
  };
  const connected = () => logs.filter((l) => l.includes('client connected')).length;
  await page.goto(`${url}?map=${map}&sw=0&fx=0&timer=1&prefetch=0&debug=1`);
  const t0 = Date.now();
  while (!connected()) { assert.ok(Date.now() - t0 < 180000, `connect ${map}`); await page.waitForTimeout(200); }
  await page.waitForTimeout(settle);
  await cmd('sv_cheats 1');
  const field = async (name, key) => {
    const s = await cmd(`cof_inspect ${name}`);
    if (/missing/.test(s.split('\n').find((l) => l.includes('COF/ENTITY')) || '')) return 'missing';
    return Number((s.match(new RegExp(`${key}=(-?\\d+)`)) || [])[1]);
  };
  const skin = async (name) => Number(((await cmd(`cof_animation ${name}`)).match(/skin=(-?\d+)/) || [])[1]);
  return { page, logs, errors, cmd, connected, field, skin };
}

async function corpse(g, multi, monster) {
  const before = await g.field(monster, 'body');
  await g.cmd(`cof_use ${multi} on`);
  const during = await g.field(monster, 'body');
  await g.page.waitForTimeout(1200);
  const after = await g.field(monster, 'body');
  return { before, during, after };
}

for (const part of parts) {
  const r = (result.parts[part] = {});
  try {
    if (part === 'corpses') {
      const g = await open(base, 'c_nightmare');
      r.spott1m = await corpse(g, 'multispott1', 'spott1m');
      r.wrongm6 = await corpse(g, 'multiwrong6', 'wrongm6');
      r.errors = g.errors; await g.page.close();
      for (const k of ['spott1m', 'wrongm6']) {
        assert.equal(r[k].before, 1, `${k} starts on the empty submodel`);
        assert.equal(r[k].during, 0, `${k} not made visible`);
        assert.equal(r[k].after, 'missing', `${k} not removed`);
      }
    } else if (part === 'mirror') {
      const g = await open(base, 'c_nightmare');
      // the street intro owns the view first
      for (let k = 0; k < 120; k++) { if (/frozen=0 /.test(await g.cmd('cof_inspect !player')) && k > 20) break; await g.page.waitForTimeout(1000); }
      await g.page.waitForTimeout(5000);
      await g.cmd('con_notifytime 0\nhud_draw 0\nnoclip\ncl_noiseeffect 0\ncof_goto -440 944 -160');
      await g.cmd('cof_give weapon_camera'); await g.page.waitForTimeout(1500);
      await g.cmd('weapon_camera'); await g.page.waitForTimeout(2500);
      await g.cmd('cof_face spot9'); await g.page.waitForTimeout(1500);
      r.before = await g.field('wrongm8', 'spawn');
      const at = (s) => Number((s.match(/time=([\d.]+)/) || [])[1]);
      const tPhoto = at(await g.cmd('+attack')); await g.page.waitForTimeout(150); await g.cmd('-attack');
      r.samples = [];
      for (let k = 0; k < 40; k++) {
        const s = await g.cmd('cof_inspect wrongm8');
        const flags = Number((s.match(/spawn=(\d+)/) || [])[1]);
        r.samples.push([+(at(s) - tPhoto).toFixed(2), flags]);
        if (k === 6 || k === 9) await g.page.locator('#canvas').screenshot({ path: `${out}/mirror-${k}.png` });
        if (!(flags & 128)) break;
        await g.page.waitForTimeout(150);
      }
      r.spot9 = await g.field('spot9', 'body'); r.glass = await g.field('break8w', 'body');
      const cleared = r.samples.find(([, f]) => !(f & 128));
      r.scriptEndsAfter = cleared ? cleared[0] : null;
      r.errors = g.errors; await g.page.close();
      assert.equal(r.before, 164, 'reflection not waiting on its script before the photo');
      assert.equal(r.spot9, 'missing', 'the photo did not fire spot9');
      assert.equal(r.glass, 'missing', 'the glass did not break');
      // "action" starts 1 s after the photo (multispot9) and lasts 61 frames at 30 fps
      assert.ok(cleared && cleared[0] >= 2.9, `the reflection left its script too early: ${JSON.stringify(r.samples.slice(-4))}`);
    } else if (part === 'scenes') {
      const a3 = await open(base, 'c_apartment3');
      await a3.cmd('cof_setkey tvframe body 3\ncof_setkey tvframe2 body 3\ncof_setkey tvframe3 body 3');
      r.tvBefore = [await a3.field('tvframe', 'body'), await a3.field('tvframe2', 'body'), await a3.field('tvframe3', 'body')];
      // three env_customize share the name tvframe_b0, one per frame: fire the name as the level does (cof_use would
      // reach only the first one; first run, 11/11/2026)
      await a3.cmd('cof_fire tvframe_b0');
      r.tvAfter = [await a3.field('tvframe', 'body'), await a3.field('tvframe2', 'body'), await a3.field('tvframe3', 'body')];
      await a3.page.close();
      const a5 = await open(base, 'c_apartment5');
      r.ropeBefore = await a5.field('rope2', 'body');
      await a5.cmd('cof_use rope_vis on'); r.ropeAfter = await a5.field('rope2', 'body');
      await a5.cmd('cof_setkey badseq1 body 2'); await a5.cmd('cof_use badcustier2 on'); r.badseqAfter = await a5.field('badseq1', 'body');
      await a5.page.close();
      const intro = await open(base, 'c_intro');
      await intro.cmd('cof_setkey skyblixt skin 5'); r.skyBefore = await intro.skin('skyblixt');
      await intro.cmd('cof_use skyblixt_0 on'); r.skyAfter = await intro.skin('skyblixt');
      await intro.page.close();
      assert.deepEqual(r.tvBefore, [3, 3, 3]); assert.deepEqual(r.tvAfter, [0, 0, 0], 'tvframe_b0');
      assert.equal(r.ropeBefore, 1); assert.equal(r.ropeAfter, 0, 'rope_vis');
      assert.equal(r.badseqAfter, 0, 'badcustier2');
      assert.equal(r.skyBefore, 5); assert.equal(r.skyAfter, 0, 'skyblixt_0');
    } else if (part === 'oldsave') {
      const old = await open(published, 'c_nightmare');
      r.oldManifest = await old.page.evaluate(async () => (await (await fetch('sw-manifest.js')).text()).match(/"version": "(\w+)"/)[1]);
      await old.cmd('save nm_customize'); await old.page.waitForTimeout(2000);
      const files = await old.page.evaluate(() => FS.readdir('/rwdir/cryoffear/save').filter((n) => /nm_customize/i.test(n)).map((n) => [n, [...FS.readFile(`/rwdir/cryoffear/save/${n}`)]]));
      await old.page.close();
      const g = await open(base, 'c_nightmare');
      await g.page.evaluate((fl) => { FS.mkdirTree('/rwdir/cryoffear/save'); for (const [n, b] of fl) FS.writeFile(`/rwdir/cryoffear/save/${n}`, new Uint8Array(b)); }, files);
      const n = g.connected(); await g.page.evaluate(() => CoFDebug.cmd('load nm_customize'));
      const t1 = Date.now(); while (g.connected() <= n) { assert.ok(Date.now() - t1 < 120000, 'load'); await g.page.waitForTimeout(200); }
      await g.page.waitForTimeout(5000); await g.cmd('sv_cheats 1');
      r.spott1m = await corpse(g, 'multispott1', 'spott1m');
      r.errors = g.errors; await g.page.close();
      assert.equal(r.spott1m.during, 0, 'a game saved by the published build does not show the corpse');
    }
    r.passed = true;
  } catch (e) { r.passed = false; r.failure = String(e.message || e); }
  console.log(part, JSON.stringify(r).slice(0, 900));
}
result.passed = Object.values(result.parts).every((p) => p.passed);
fs.writeFileSync(`${out}/result.json`, JSON.stringify(result, null, 2));
await browser.close();
process.exitCode = result.passed ? 0 : 1;
