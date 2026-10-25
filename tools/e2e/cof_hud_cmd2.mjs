import { chromium } from "playwright";
const base = process.argv[2] || "http://127.0.0.1:8080/";
const map = process.argv[3] || "c_intro";
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required", "--disable-dev-shm-usage", "--no-sandbox"],
});
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.goto(`${base}?map=${map}&timer=1&sw=0&dev=2&debug=1&prefetch=0`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    if (!window.CoFRuntimeReady) return false;
    try { return FS.readFile("/rwdir/engine.log", { encoding: "utf8" }).includes("client connected"); } catch (_) { return false; }
  }, null, { timeout: 150000, polling: 1000 });
  await page.waitForTimeout(3000);
  for (const cmd of ["sv_cheats 1", "ent_fire introductiontxt use", "ent_fire credits1 use", "ent_fire white use"]) {
    console.log("cmd", cmd);
    await page.evaluate((c) => CoFDebug.cmd(c), cmd);
    await page.waitForTimeout(1000);
    const s = await page.evaluate(() => {
      let log = [];
      try { log = FS.readFile("/rwdir/engine.log", "utf8").split("\n"); } catch (_) { }
      return { hud: log.filter(l => l.includes("COF/HUD")), tail: log.slice(-25) };
    });
    console.log(JSON.stringify(s, null, 1));
  }
} finally {
  await browser.close();
}
