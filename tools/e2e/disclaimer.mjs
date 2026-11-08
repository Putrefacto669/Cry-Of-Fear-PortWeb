// Content warning of the original's first startup video (media/startupvideo1.avi), shown from the launcher.
// Checks: it fades in and out over ~4.84 s and then hands focus to the canvas; a key skips it;
// links with ?map= (tests, shortcuts) never show it.
//   node disclaimer.mjs http://127.0.0.1:8091/ /tmp/out
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:8091/';
const out = process.argv[3] || `/tmp/cof-disclaimer-${Date.now()}`;
if (fs.existsSync(out)) throw Error(`Output directory already exists: ${out}`);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const open = async query => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}${query}`);
  return page;
};
// The engine loads behind the warning and keeps the main thread busy, so each sample carries the
// animation's own clock (ms) instead of the test's.
const state = page => page.evaluate(() => {
  const d = document.getElementById('disclaimer'), img = d.querySelector('img');
  const animation = img.getAnimations()[0];
  return { hidden: d.hidden, animationMs: animation ? Math.round(animation.currentTime) : null,
    opacity: Number(getComputedStyle(img).opacity),
    launcherHidden: document.getElementById('launcher').hidden,
    focus: document.activeElement?.id || document.activeElement?.tagName };
});
// Keyframes of index.html (#disclaimer): black to 0.3 s, in to 1.15 s, hold to 3.7 s, out to 4.6 s
const expected = ms => ms <= 300 ? 0 : ms <= 1150 ? (ms - 300) / 850 : ms <= 3700 ? 1 : ms <= 4600 ? (4600 - ms) / 900 : 0;
const play = async page => {
  if (await page.locator('#launcher-language').isVisible()) await page.locator('.lb-language-choices button').first().click();
  await page.locator('#play').click();
  return Date.now();
};
const result = { base, samples: [] };
try {
  // Full run
  let page = await open('?sw=0&timer=1');
  const t0 = await play(page);
  let shot = false;
  while (Date.now() - t0 < 9000) {
    const s = await state(page);
    result.samples.push({ testMs: Date.now() - t0, ...s });
    if (s.hidden) break;
    await page.waitForTimeout(100);
  }
  const shown = result.samples.filter(s => !s.hidden && s.animationMs !== null);
  for (const s of shown)
    assert.ok(Math.abs(s.opacity - expected(s.animationMs)) < 0.05, `opacity ${s.opacity} at ${s.animationMs} ms`);
  assert.ok(shown.some(s => s.opacity > 0.99), 'holds the warning');
  assert.ok(shown.some(s => s.opacity > 0.05 && s.opacity < 0.95), 'fades');
  const end = result.samples.at(-1);
  assert.ok(end.hidden && end.launcherHidden, 'closes after the video length');
  assert.equal(end.focus, 'canvas', 'the game gets the keyboard');
  result.closedAfterMs = end.testMs;
  await page.close();

  // Picture: without the engine (its script blocked) the screenshot is taken while the warning holds
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.route('**/xash3d.js', route => route.abort());
  await page.goto(`${base}?sw=0&timer=1`);
  await play(page);
  await page.waitForTimeout(2000);
  result.picture = await state(page);
  await page.screenshot({ path: `${out}/hold.png` });
  result.pictureAfterShot = await state(page);
  assert.ok(!result.picture.hidden && result.picture.opacity > 0.99 && !result.pictureAfterShot.hidden, 'screenshot of the held warning');
  // Nothing of the page (canvas, HUD loading screen) may cover it: hit-test the whole screen
  result.covered = await page.evaluate(() => {
    const d = document.getElementById('disclaimer'), hits = [];
    for (let y = 5; y < innerHeight; y += 50) for (let x = 5; x < innerWidth; x += 80) {
      const e = document.elementFromPoint(x, y);
      if (e && !d.contains(e)) hits.push(`${x},${y} ${e.tagName}#${e.id}.${e.className}`);
    }
    return hits;
  });
  assert.deepEqual(result.covered, [], 'nothing covers the warning');
  await page.close();

  // Skip with a key
  page = await open('?sw=0&timer=1');
  const t1 = await play(page);
  await page.waitForTimeout(1200);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  result.skip = { ms: Date.now() - t1, ...(await state(page)) };
  assert.ok(result.skip.hidden, 'a key skips it');
  await page.close();

  // Direct links
  page = await open('?map=c_game_menu1&sw=0&timer=1');
  await page.waitForTimeout(1500);
  result.direct = await state(page);
  assert.ok(result.direct.hidden, '?map= never shows it');
  await page.close();

  result.errors = errors;
  assert.equal(errors.length, 0, errors.join('\n'));
  result.passed = true;
  console.log('PASS content warning: fades, closes, skips and stays out of ?map= links');
} finally {
  fs.writeFileSync(`${out}/result.json`, JSON.stringify(result, null, 2));
  await browser.close();
}
