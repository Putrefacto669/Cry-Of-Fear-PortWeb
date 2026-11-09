// Options -> Rain (hud.js, 09/11/2026): the HUD's rain streaks stay off by default even when the level's
// rain_settings asks for them (COF/HUD RAIN with drips > 0), and they are drawn when the saved option is on.
//   node rain_option.mjs http://127.0.0.1:8097/ <out> [map]   (c_intro: the prologue's rain from its start;
//   c_start2 only asks for it when Simon stands under open sky)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
const [base, out, map = 'c_intro'] = process.argv.slice(2);
assert.ok(base && out && !fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const r = {};
// painted pixels of the rain canvas, sampled a few times (the streaks move)
const painted = p => p.evaluate(async () => {
  const c = document.getElementById('cof-rain'); if (!c || !c.width) return { canvas: !!c, max: 0 };
  let max = 0;
  for (let i = 0; i < 6; i++) {
    await new Promise(f => setTimeout(f, 250));
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0;
    for (let k = 3; k < d.length; k += 4) if (d[k]) n++;
    max = Math.max(max, n);
  }
  return { canvas: true, max };
});
const run = async (label, option) => {
  const p = await b.newPage({ viewport: { width: 960, height: 600 } });
  const logs = []; p.on('console', m => logs.push(m.text()));
  const errors = []; p.on('pageerror', e => errors.push(String(e)));
  if (option !== undefined) await p.addInitScript(v => localStorage.setItem('cofOptions', JSON.stringify({ rain: v })), option);
  await p.goto(`${base}?map=${map}&sw=0&fx=0&timer=1&prefetch=0&debug=1`);
  const t0 = Date.now();
  while (!logs.some(l => /COF\/HUD RAIN [1-9]/.test(l))) {
    if (Date.now() - t0 > 120000) { fs.writeFileSync(`${out}/${label}.log`, logs.join('\n')); assert.fail(`${label}: no RAIN request`); }
    await p.waitForTimeout(200);
  }
  await p.waitForTimeout(1500);
  r[label] = { request: logs.find(l => /COF\/HUD RAIN [1-9]/.test(l)), ...(await painted(p)), errors };
  if (label !== 'default') await p.screenshot({ path: `${out}/${label}.png` });
  else {
    // the real interface at 960x600 (Codex's review: the page header took the click, and the checkbox had no
    // name): Esc -> pause -> Options, a mouse click on the "Rain" label, then Space on the focused checkbox
    await p.keyboard.press('Escape'); await p.locator('#cof-pause.on').waitFor();
    await p.locator('#cof-pause [data-action="options"]').click(); await p.locator('#cof-sheet.on').waitFor();
    const box = p.getByRole('checkbox', { name: /^(Lluvia|Rain)$/ });
    assert.equal(await box.count(), 1, 'the rain checkbox has no accessible name');
    r.geometry = await p.evaluate(() => {
      const rect = e => { if (!e) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round); };
      const label = document.querySelector('label[for="cof-option-rain"]'), b = label.getBoundingClientRect();
      return { viewport: [innerWidth, innerHeight], scroll: [scrollX, scrollY], header: rect(document.querySelector('header')),
        main: rect(document.querySelector('main')), box: rect(document.querySelector('#cof-sheet .box')), label: rect(label),
        hit: document.elementFromPoint((b.left + b.right) / 2, (b.top + b.bottom) / 2)?.outerHTML.slice(0, 80),
        visual: [visualViewport.offsetLeft, visualViewport.offsetTop, visualViewport.scale], dpr: devicePixelRatio,
        pointerLock: document.pointerLockElement?.id ?? null,
        zoom: [...document.querySelectorAll('*')].filter(e => getComputedStyle(e).zoom !== '1').map(e => e.tagName + '#' + e.id + ' ' + getComputedStyle(e).zoom).slice(0, 5) };
    });
    const lb = r.geometry.playwrightBox = await p.getByText(/^(Lluvia|Rain)$/).boundingBox();
    // A real mouse click at the label's centre, and the element that really receives it. Playwright's own
    // actionability check reported <header> as intercepting in this run although the DOM, CDP and the browser
    // pane put the label there (09/11/2026, unexplained); the result is checked by state below, not by the check.
    await p.evaluate(() => addEventListener('pointerdown', e => { window.__cofRainHit = e.target.outerHTML.slice(0, 80); }, { capture: true, once: true }));
    await p.mouse.click(lb.x + lb.width / 2, lb.y + lb.height / 2); await p.waitForTimeout(1500);
    r.geometry.received = await p.evaluate(() => window.__cofRainHit);
    r.uiOn = { checked: await box.isChecked(), ...(await painted(p)) };
    await p.screenshot({ path: `${out}/ui-on.png` });
    await box.focus(); await p.keyboard.press('Space'); await p.waitForTimeout(2500); // fades out 8 drops a frame
    r.uiOff = { checked: await box.isChecked(), ...(await painted(p)), saved: await p.evaluate(() => JSON.parse(localStorage.getItem('cofOptions')).rain) };
  }
  fs.writeFileSync(`${out}/${label}.log`, logs.join('\n'));
  await p.close();
};
try {
  await run('default', undefined);
  await run('on', true);
  assert.equal(r.default.max, 0, `rain drawn by default: ${r.default.max} pixels`);
  assert.ok(r.uiOn.checked && r.uiOn.max > 500, `the Options label did not turn the rain on: ${JSON.stringify(r.uiOn)}`);
  assert.ok(!r.uiOff.checked && r.uiOff.max === 0 && r.uiOff.saved === false, `Space did not turn it off: ${JSON.stringify(r.uiOff)}`);
  assert.ok(r.on.max > 500, `rain not drawn with the option on: ${r.on.max} pixels`);
  assert.deepEqual([...r.default.errors, ...r.on.errors], []);
  r.passed = true;
  console.log(`PASS rain off by default (0 px); Options label on (${r.uiOn.max} px), Space off (0 px, saved); saved option on (${r.on.max} px)`);
} catch (e) { r.passed = false; r.failure = String(e.stack || e); console.error(e); process.exitCode = 1; }
fs.writeFileSync(`${out}/result.json`, JSON.stringify(r, null, 2)); await b.close();
