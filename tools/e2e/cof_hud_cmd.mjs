import { chromium } from "playwright";
const base = process.argv[2] || "http://127.0.0.1:8080/";
const map = process.argv[3] || "c_intro";
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required", "--disable-dev-shm-usage", "--no-sandbox"],
});
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 300)); });
  await page.goto(`${base}?map=${map}&timer=1&sw=0&dev=1&debug=1&prefetch=0`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    if (!window.CoFRuntimeReady) return false;
    try { return FS.readFile("/rwdir/engine.log", { encoding: "utf8" }).includes("client connected"); } catch (_) { return false; }
  }, null, { timeout: 150000, polling: 1000 });
  console.log("ready", await page.evaluate(() => ({ hud: typeof window.CoFHUD, debug: typeof window.CoFDebug, scripts: [...document.scripts].map(s => s.src.split("/").pop()) })));
  for (const cmd of ["ent_fire introductiontxt Use", "ent_fire credits1 Use", "ent_fire white Use"]) {
    console.log("cmd", cmd);
    await page.evaluate((c) => CoFDebug.cmd(c), cmd);
    await page.waitForTimeout(1500);
    const s = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll("#cof-hud img")];
      let log = [];
      try { log = FS.readFile("/rwdir/engine.log", "utf8").split("\n").filter(l => l.includes("COF/HUD")); } catch (_) { }
      return {
        hud: log,
        imgs: imgs.map((img, i) => ({ i, hidden: img.hidden, op: img.style.opacity, nw: img.naturalWidth, nh: img.naturalHeight })),
        post: window.CoFPostFX && CoFPostFX.get(),
      };
    });
    console.log(JSON.stringify(s));
  }
  await page.waitForTimeout(1000);
  const dom = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("#cof-hud img")];
    return imgs.map(img => ({ hidden: img.hidden, op: img.style.opacity, nw: img.naturalWidth, nh: img.naturalHeight, len: img.src.length }));
  });
  console.log("dom", JSON.stringify(dom));
  console.log("errs", errs.slice(0, 8));
} finally {
  await browser.close();
}
