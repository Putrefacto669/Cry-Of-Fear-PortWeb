import { chromium } from "playwright";
const base = process.argv[2] || "http://127.0.0.1:8080/";
const map = process.argv[3] || "c_intro";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
page.on("pageerror", e => { const s = e.message.split("\n")[0]; if (!s.includes("map_c_nightmare.data")) console.log("pageerror", s); });
await page.goto(`${base}?map=${map}&timer=1&sw=0&dev=1`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => {
  if (!window.CoFRuntimeReady) return false;
  try { return FS.readFile("/rwdir/engine.log", { encoding: "utf8" }).includes("client connected"); } catch (_) { return false; }
}, null, { timeout: 200000, polling: 1000 });
await page.waitForTimeout(15000);
const out = await page.evaluate(() => {
  let text = "";
  try { text = FS.readFile("/rwdir/engine.log", { encoding: "utf8" }); } catch (_) { }
  const lines = text.split("\n");
  return {
    total: lines.length,
    hud: lines.filter(l => l.includes("COF/HUD")),
    cof: lines.filter(l => /cof_|CoF|introduction|Spawn Server|client connected|unknown entity|not found/i.test(l)).slice(-120),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
