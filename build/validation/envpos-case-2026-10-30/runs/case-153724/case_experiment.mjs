// Causal check: does a lowercase models/props directory in the VFS hide models/Props/sky_sphere4.mdl?
// node case_experiment.mjs <base url> <control|lowercase>
import { chromium } from "playwright";
const base = process.argv[2], mode = process.argv[3];
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const out = [];
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  page.on("console", m => out.push(m.text()));
  const until = async (fn, ms = 60000) => { const t = Date.now(); while (!(await fn())) { if (Date.now() - t > ms) throw new Error("timeout"); await page.waitForTimeout(100); } };
  const connected = () => out.filter(l => l.includes("client connected")).length;
  await page.goto(`${base}?map=c_intro&timer=1&fx=0&sw=0&prefetch=0&debug=1`, { waitUntil: "domcontentloaded" });
  await until(() => connected() > 0);
  if (mode === "lowercase") {
    // the same directory a pack with "models/props/..." paths would create next to models/Props
    await page.evaluate(() => FS.mkdirTree("/rodir/cryoffear/models/props/inomhusd"));
  }
  await page.evaluate(() => CoFPreload("c_game_menu1"));
  const before = connected();
  await page.evaluate(() => CoFDebug.cmd("changelevel c_game_menu1"));
  await until(() => connected() > before);
  await page.waitForTimeout(4000);
  const start = out.length;
  await page.evaluate(() => CoFDebug.cmd("sv_cheats 1\ncof_sky_entities\ncof_sky_render_status"));
  await page.waitForTimeout(1500);
  const dirs = await page.evaluate(() => FS.readdir("/rodir/cryoffear/models").filter(d => d.toLowerCase() === "props"));
  const menu = out.slice(out.findIndex(l => l.includes("Spawn Server: c_game_menu1")));
  console.log(`MODE ${mode}`);
  console.log(`props dirs: ${JSON.stringify(dirs)}`);
  console.log(`load errors: ${menu.filter(l => l.includes("sky_sphere4")).length}`);
  for (const l of out.slice(start)) if (/SKY_ENTITY|SKY_RENDER/.test(l)) console.log(l);
} finally { await browser.close(); }
