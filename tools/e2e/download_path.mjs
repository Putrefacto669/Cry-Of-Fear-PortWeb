// The download path of a first visit with the Service Worker (16/11/2026, slow on other computers):
//  A. the launcher downloads the engine, boot, shared packs and the menu map into the worker's cache
//     before "Jugar", without starting the engine; "Jugar" then downloads nothing heavy again;
//  B. "Jugar" pressed at once: every heavy file is downloaded once (the worker joins the launcher's
//     download) and the loading screen shows the progress in MB;
//  C. the interface pictures left out of boot come from vgui/*.png when shown (IMAGE, the bag...);
//  D. a second visit downloads no heavy file.
// node download_path.mjs <url> <out>
import assert from 'node:assert/strict'; import fs from 'node:fs'; import { chromium } from 'playwright';
const [base, out] = process.argv.slice(2);
assert.ok(base && out && !fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const result = { scenarios: {}, errors: [] };
const HEAVY = /\/(xash3d\.wasm|packs\/[^/?]+\.data)(\.gz)?(\?|$)/;
const browser = await chromium.launch({ args: ['--mute-audio'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('cofLanguage', 'spanish'); localStorage.setItem('cofLauncherLanguage', 'spanish');
    localStorage.setItem('cof-input-device-v1', 'pc'); // the first-visit device question (mobile.js)
    window.__progress = [];
    const watch = () => new MutationObserver(() => {
      const t = document.querySelector('#cof-loading small')?.textContent;
      if (t && window.__progress.at(-1) !== t) window.__progress.push(t);
    }).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
    if (document.documentElement) watch(); else addEventListener('DOMContentLoaded', watch);
  });
  const net = [];
  // the worker's own requests too (Chromium reports them to the context)
  ctx.on('request', (r) => net.push({ url: r.url(), sw: !!r.serviceWorker(), at: Date.now() }));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => result.errors.push(e.message));
  return { ctx, page, net };
}
const heavyNet = (net) => net.filter((r) => r.sw && HEAVY.test(r.url)).map((r) => new URL(r.url).pathname.split('/').slice(-2).join('/'));
const counts = (list) => list.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
const cached = (page) => page.evaluate(async () => (await (await caches.open('cof-web-v1')).keys()).map((r) => r.url.split('/').pop()));
async function waitMenu(page) {
  await page.waitForFunction(() => window.CoFHUD?.menuOpen === true, null, { timeout: 240000 });
}

try {
  // A
  {
    const { ctx, page, net } = await open();
    const t0 = Date.now();
    await page.goto(base);
    await page.locator('#play').waitFor({ state: 'visible' });
    const playVisible = (Date.now() - t0) / 1000;
    // (waitForFunction would take the promise of an async predicate as true at once)
    const warmed = async () => {
      const keys = await cached(page);
      return ['packs/boot.data', 'packs/engine.data', 'packs/extras.data', 'packs/map_c_game_menu1.data', 'xash3d.wasm']
        .every((f) => keys.some((k) => k.startsWith(`${f.split('/').pop()}?rev=`)));
    };
    while (!(await warmed())) {
      assert.ok(Date.now() - t0 < 240000, 'the launcher did not download the boot files');
      await sleep(500);
    }
    const warmSeconds = (Date.now() - t0) / 1000;
    // the page's own script loads (the worker precaches these light files when it installs)
    const started = net.filter((r) => !r.sw && /\/(xash3d|packs\/[^/?]+)\.js(\?|$)/.test(r.url)).map((r) => r.url);
    assert.deepEqual(started, [], 'the launcher must not start the engine');
    const clickAt = Date.now();
    await page.locator('#play').click();
    await waitMenu(page);
    await sleep(3000);
    // Playwright may deliver the worker's request events late: count every download of the scenario
    // instead of splitting them at the click. Once each means "Jugar" downloaded nothing again.
    const all = counts(heavyNet(net));
    const repeatedA = Object.entries(all).filter(([, n]) => n > 1);
    assert.deepEqual(repeatedA, [], `"Jugar" downloaded again: ${JSON.stringify(repeatedA)}`);
    // the five the launcher warms, and maybe c_intro (the menu prefetches the first chapter after 4 s)
    for (const f of ['/xash3d.wasm.gz', 'packs/engine.data.gz', 'packs/boot.data.gz', 'packs/extras.data.gz', 'packs/map_c_game_menu1.data.gz'])
      assert.equal(all[f], 1, `${f}: ${JSON.stringify(all)}`);
    assert.ok(Object.keys(all).every((f) => f !== 'packs/map_c_intro.data' && (f.endsWith('.gz'))), `uncompressed download: ${JSON.stringify(all)}`);
    const afterPlay = net.filter((r) => r.sw && HEAVY.test(r.url) && r.at > clickAt).map((r) => r.url.split('/').pop());
    // C: pictures out of boot, fetched when shown
    await sleep(2500); // the menu's picture prefetch (hud.js, 1.5 s)
    const prefetched = net.filter((r) => /\/vgui\/.+\.png$/.test(r.url)).map((r) => new URL(r.url).pathname.split('/vgui/')[1]);
    for (const f of ['640_difficulty.png', 'backgroundtoall.png', '640_inventory.png']) assert.ok(prefetched.includes(f), `menu prefetch ${f}`);
    await page.evaluate(() => window.CoFHUD.handle('IMAGE gfx/vgui/640_pass3.tga'));
    const pic = page.locator('img.picture');
    await page.waitForFunction(() => { const i = document.querySelector('img.picture'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 30000 });
    const size = await pic.evaluate((i) => [i.naturalWidth, i.naturalHeight, i.src.slice(0, 5)]);
    assert.ok(net.some((r) => r.url.endsWith('/vgui/640_pass3.png')), 'IMAGE fetched vgui/640_pass3.png');
    await page.screenshot({ path: `${out}/a-image.png` });
    result.scenarios.A = { playVisible, warmSeconds, heavy: all, eventsAfterClick: afterPlay, prefetched, image: size };
    // D: second visit
    const mark = net.length;
    await page.goto(`${base}?nc=1`);
    await page.locator('#play').waitFor({ state: 'visible' });
    await page.locator('#play').click();
    await waitMenu(page);
    const again = heavyNet(net.slice(mark));
    assert.deepEqual(again, [], `second visit downloaded ${again}`);
    result.scenarios.D = { heavy: again, cached: (await cached(page)).length };
    await ctx.close();
  }
  // B
  {
    const { ctx, page, net } = await open();
    await page.goto(base);
    await page.locator('#play').waitFor({ state: 'visible' });
    await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30000 });
    await page.locator('#play').click();
    await waitMenu(page);
    const c = counts(heavyNet(net));
    const repeated = Object.entries(c).filter(([, n]) => n > 1);
    assert.deepEqual(repeated, [], `downloaded more than once: ${JSON.stringify(repeated)}`);
    const progress = await page.evaluate(() => window.__progress);
    assert.ok(progress.some((t) => /^Descargando \d+,\d de \d+,\d MB/.test(t)), `progress on the loading screen: ${progress.slice(0, 5)}`);
    result.scenarios.B = { downloads: c, progressSamples: progress.length, firstProgress: progress.slice(0, 3), lastProgress: progress.slice(-2) };
    await ctx.close();
  }
  assert.deepEqual(result.errors, []);
  result.passed = true;
} catch (e) { result.failure = String(e.stack); process.exitCode = 1; }
finally { await browser.close(); fs.writeFileSync(`${out}/result.json`, JSON.stringify(result, null, 2)); }
console.log(result.passed ? `PASS download path ${JSON.stringify(result.scenarios.A?.warmSeconds)} s launcher warm-up` : result.failure);
