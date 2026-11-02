// Observe factory failures in original prepared maps, without removing entities.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const [base, out] = process.argv.slice(2);
assert.ok(base && out && !fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const rows = [];
try {
  for (const map of ['c_game_menu1', 'c_intro', 'c_nightmare', 'c_start', 'c_start2',
    'c_apartment1', 'c_apartment2', 'c_apartment3', 'c_apartment4', 'c_apartment5', 'c_apartmentsick']) {
    const page = await browser.newPage({ viewport: { width: 320, height: 240 } }), logs = [], errors = [];
    page.on('console', m => logs.push(m.text())); page.on('pageerror', e => errors.push(e.message));
    try {
      await page.goto(`${base}?map=${map}&sw=0&fx=0&timer=1&prefetch=0&debug=1`);
      await page.waitForFunction(() => window.CoFRuntimeReady, {}, { timeout: 180000 });
      const start = Date.now();
      while (!logs.some(l => l.includes('client connected'))) {
        assert.ok(Date.now() - start < 60000, `${map}: client connection timeout`); await page.waitForTimeout(100);
      }
      await page.evaluate(() => CoFDebug.cmd('r_norefresh 1'));
      await page.waitForTimeout(300);
      const missing = {};
      for (const line of logs) for (const m of line.matchAll(/No spawn function for "([^"]+)"/g)) missing[m[1]] = (missing[m[1]] || 0) + 1;
      rows.push({ map, missing, errors }); assert.equal(errors.length, 0);
      console.log(`${map}: ${JSON.stringify(missing)}`);
    } finally { fs.writeFileSync(`${out}/${map}.log`, logs.join('\n')); await page.close(); }
  }
} finally {
  fs.writeFileSync(`${out}/result.json`, JSON.stringify({ chromium: browser.version(), rows }, null, 2));
  await browser.close();
}
