// Launcher/UI lifecycle plus diagnostic map changes. Not a natural campaign playthrough.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const [base, out] = process.argv.slice(2);
assert.ok(base && out && !fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p = await context.newPage(), logs = [], errors = [], rows = [];
p.on('console', m => logs.push(m.text())); p.on('pageerror', e => errors.push(e.message));
let serial = 0;
const cmd = async text => {
  const token = `hudlife_${++serial}`, start = logs.length;
  await Promise.all([p.waitForEvent('console', { predicate: m => m.text().includes(`COF/FENCE ${token} `), timeout: 30000 }),
    p.evaluate(c => CoFDebug.cmd(c), `${text}\ncof_fence ${token}`)]);
  return logs.slice(start).join('\n');
};
const wait = async fn => { const start = Date.now(); while (!await fn()) {
  assert.ok(Date.now() - start < 60000, 'State timeout'); await p.waitForTimeout(100);
} };
const capture = async (name, visible) => {
  if (visible) await p.waitForFunction(() => document.querySelector('#cof-loading.off'), {}, { timeout: 30000 });
  await p.waitForTimeout(600);
  const row = await p.evaluate(() => ({ map: CoFCurrentMap(), controlled: !!navigator.serviceWorker.controller,
    bars: [...document.querySelectorAll('#cof-status > *')].map(e => ({ classes: e.className,
      opacity: +getComputedStyle(e).opacity, width: e.getBoundingClientRect().width,
      height: e.getBoundingClientRect().height,
      images: [...e.querySelectorAll('img')].map(i => ({ complete: i.complete, width: i.naturalWidth })) })),
    loading: document.querySelector('#cof-loading')?.className,
    bag: document.querySelector('#cof-bag')?.className,
    pause: document.querySelector('#cof-pause')?.className,
    hud: __hud.slice(-20) }));
  rows.push({ name, ...row });
  await p.screenshot({ path: `${out}/${name}.png` });
  assert.equal(row.bars.length, 2, name);
  for (const bar of row.bars) {
    assert.equal(bar.opacity, visible ? 1 : 0, name);
    assert.ok(bar.width > 0 && bar.height > 0, name);
    for (const image of bar.images) assert.ok(image.complete && image.width > 0, `${name}: missing bar resource`);
  }
};
const hook = () => p.evaluate(() => { window.__hud = []; const original = CoFHUD.handle;
  CoFHUD.handle = function(...args) { __hud.push(args); return original.apply(this, args); }; });
try {
  await p.goto(`${base}?sw=1&timer=1&fx=0&prefetch=0&debug=1`);
  await p.locator('#play').click();
  await p.waitForFunction(() => window.CoFRuntimeReady, {}, { timeout: 180000 });
  await p.locator('#cof-menu.on').waitFor({ timeout: 60000 });
  await hook();
  await p.locator('[data-action="new"]').click();
  await p.locator('#cof-menu .board.on .hit').first().click();
  await wait(() => p.evaluate(() => CoFCurrentMap() === 'c_intro'));
  await wait(() => p.evaluate(() => __hud.some(a => /^STAT /.test(a[0]))));
  await capture('new-game-intro-camera', false);
  await p.evaluate(() => CoFPreload('c_apartment1'));
  let count = logs.filter(l => l.includes('client connected')).length;
  await p.evaluate(() => CoFDebug.cmd('map c_apartment1'));
  await wait(() => logs.filter(l => l.includes('client connected')).length > count);
  await p.waitForTimeout(1000);
  await cmd('sv_cheats 1\ncof_give weapon_switchblade');
  const bag = await cmd('cof_dump'), knife = bag.match(/bag (\d+): weapon_switchblade/); assert.ok(knife, bag);
  await cmd(`cof_equip ${knife[1]}`);
  assert.match(await cmd('cof_weapon_status'), /COF\/WEAPON class=weapon_switchblade /);
  await capture('apartment-camera', false);
  await p.waitForTimeout(20000);
  await capture('apartment-knife', true);
  await p.keyboard.press('Tab'); await capture('inventory-open', true);
  assert.match(rows.at(-1).bag, /\bon\b/);
  await p.keyboard.press('Tab'); await capture('inventory-closed', true);
  assert.doesNotMatch(rows.at(-1).bag, /\bon\b/);
  await p.keyboard.press('Escape'); await capture('paused', true);
  await p.keyboard.press('Escape');
  await cmd('save hud_lifecycle');
  count = logs.filter(l => l.includes('client connected')).length;
  await p.evaluate(() => CoFDebug.cmd('load hud_lifecycle'));
  await wait(() => logs.filter(l => l.includes('client connected')).length > count);
  await cmd('cof_weapon_status');
  await capture('restored-knife', true);
  await p.evaluate(() => CoFPreload('c_apartment2'));
  await p.evaluate(() => CoFDebug.cmd('cof_use changelevel1 on'));
  await wait(() => p.evaluate(() => CoFCurrentMap() === 'c_apartment2'));
  await p.waitForTimeout(3000);
  await capture('native-changelevel-apartment2', true);
  assert.ok(await p.evaluate(() => !!navigator.serviceWorker.controller), 'SW must control this test');
  await p.goto(`${base}?map=c_apartment1&sw=1&timer=1&fx=0&prefetch=0&debug=1`);
  await p.waitForFunction(() => window.CoFRuntimeReady, {}, { timeout: 180000 });
  await hook();
  await wait(() => p.evaluate(() => CoFCurrentMap() === 'c_apartment1'));
  await p.waitForTimeout(22000);
  await capture('sw-second-visit', true);
  assert.equal(errors.length, 0);
  console.log('PASS HUD launcher, new game, camera, knife, inventory, pause, restore and SW second visit');
} finally {
  fs.writeFileSync(`${out}/result.json`, JSON.stringify({ rows, errors, chromium: browser.version() }, null, 2));
  fs.writeFileSync(`${out}/console.log`, logs.join('\n'));
  await browser.close();
}
