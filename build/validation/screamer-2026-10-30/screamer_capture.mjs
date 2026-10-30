// Capture the port's final screamer of c_nightmare as the player sees it (teleported to beforetelet).
// node screamer_capture.mjs <base url> <out dir>
import fs from "node:fs";
import { chromium } from "playwright";
const [base, dir] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const out = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("console", m => out.push(m.text()));
  const until = async (fn, ms) => { const t = Date.now(); while (!(await fn())) { if (Date.now() - t > ms) throw new Error("timeout"); await page.waitForTimeout(200); } };
  // fx=0: no post-processing (grain, vignette), so the frame is what the engine renders
  await page.goto(`${base}?map=c_nightmare&timer=1&fx=0&sw=0&prefetch=0&debug=1`, { waitUntil: "domcontentloaded" });
  await until(() => out.some(l => l.includes("client connected")), 90000);
  const cmd = c => page.evaluate(t => CoFDebug.cmd(t), c);
  // let the introduction (multiintro3 + nightmulti) hand the camera over, as in normal play
  await until(() => out.some(l => /COF\/HUD .*weapon_camera|weapon_camera/.test(l)), 240000).catch(() => {});
  await page.waitForTimeout(8000);
  await cmd("sv_cheats 1\nhud_draw 1");
  const capture = name => page.evaluate(() => new Promise(resolve => {
    const fn = () => { MainLoop.postMainLoop.splice(MainLoop.postMainLoop.indexOf(fn), 1); resolve(document.getElementById("canvas").toDataURL("image/png")); };
    MainLoop.postMainLoop.push(fn);
  })).then(d => fs.writeFileSync(`${dir}/${name}.png`, Buffer.from(d.split(",")[1], "base64")));
  // the corridor trigger fires multispotea; everything after it is the level's own logic
  await cmd("cof_fire multispotea");
  const t0 = Date.now();
  for (const ms of [100, 200, 300, 400, 500, 700, 900, 1100, 1400]) {
    while (Date.now() - t0 < ms) await page.waitForTimeout(20);
    await capture(`port-screamer-${ms}ms`);
  }
  await cmd("viewpos\ngl_overbright\nr_lighting_extended\nr_lighting_ambient\nr_lighting_modulate\nbrightness\ngamma\nlightgamma\ndirect");
  await page.waitForTimeout(800);
  fs.writeFileSync(`${dir}/console.log`, out.join("\n"));
  console.log(out.filter(l => /org \(|ang \(|gl_overbright|r_lighting|brightness|gamma|direct/.test(l)).slice(-14).join("\n"));
} finally { await browser.close(); }
