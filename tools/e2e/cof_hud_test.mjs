import { chromium } from "playwright";
const base = process.argv[2] || "http://127.0.0.1:8080/";
const map = process.argv[3] || "c_intro";
const url = `${base}?map=${map}&timer=1&sw=0&dev=1`;
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const logs = [];
page.on("console", m => { if (m.type() === "error") logs.push("console: " + m.text()); });
page.on("pageerror", e => logs.push("pageerror: " + e.message));
const t0 = Date.now();
await page.goto(url, { waitUntil: "domcontentloaded" });
let ready = false;
try {
  await page.waitForFunction(() => {
    if (!window.CoFRuntimeReady) return false;
    try { return FS.readFile("/rwdir/engine.log", { encoding: "utf8" }).includes("client connected"); } catch (_) { return false; }
  }, null, { timeout: 200000, polling: 1000 });
  ready = true;
} catch (e) { logs.push("load: " + e.message.split("\n")[0]); }
console.log("ready", ready, "ms", Date.now() - t0);
const samples = [];
for (let i = 0; i < 75; i++) {
  const s = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("#cof-hud img")];
    const vis = imgs.map((img, i) => ({ i, hidden: img.hidden, opacity: img.style.opacity, src: img.src.slice(0, 30), w: img.naturalWidth, h: img.naturalHeight })).filter(x => !x.hidden);
    let log = [];
    try { log = FS.readFile("/rwdir/engine.log", "utf8").split("\n").filter(l => l.includes("COF/HUD")).slice(-10); } catch (_) { }
    return { t: Math.round(performance.now()), vis, log };
  });
  if (s.vis.length || s.log.length) samples.push(s);
  if (s.log.some(l => l.includes(" LOGO "))) break;
  await page.waitForTimeout(1000);
}
console.log("samples", JSON.stringify(samples, null, 1));
console.log("errors", logs.slice(0, 10));
await browser.close();
