// Prelude with the camera handed over by the level, then the point where the error was seen.
// Reports GL2DBG lines (who draws multi-quad batches) and draws whose vertex buffers are too small.
// node glquads.mjs <base url> <out dir>
import fs from "node:fs";
import { chromium } from "playwright";
const [base, dir] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const out = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("console", m => out.push(m.text()));
  await page.addInitScript(() => {
    window.__oob = { armed: false, draws: 0, small: 0, sample: null };
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
      const ctx = getContext.call(this, type, attrs);
      if (!ctx || !/webgl2/.test(type) || ctx.__oobWrapped) return ctx;
      ctx.__oobWrapped = true;
      const draw = Object.getPrototypeOf(ctx).drawElements;
      ctx.drawElements = function (mode, count, type, offset) {
        const g = window.__oob;
        if (g.armed) {
          g.draws++;
          // any enabled attribute whose buffer cannot hold even one vertex per triangle index
          for (let loc = 0; loc < 4; loc++) {
            if (!ctx.getVertexAttrib(loc, ctx.VERTEX_ATTRIB_ARRAY_ENABLED)) continue;
            const b = ctx.getVertexAttrib(loc, ctx.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
            const prev = ctx.getParameter(ctx.ARRAY_BUFFER_BINDING);
            ctx.bindBuffer(ctx.ARRAY_BUFFER, b);
            const bytes = ctx.getBufferParameter(ctx.ARRAY_BUFFER, ctx.BUFFER_SIZE);
            ctx.bindBuffer(ctx.ARRAY_BUFFER, prev);
            if (bytes < 16) { g.small++; if (!g.sample) g.sample = { count, loc, bytes }; break; }
          }
        }
        return draw.call(ctx, mode, count, type, offset);
      };
      return ctx;
    };
  });
  const until = async (fn, ms) => { const t = Date.now(); while (!(await fn())) { if (Date.now() - t > ms) throw new Error("timeout"); await page.waitForTimeout(250); } };
  await page.goto(`${base}?map=c_nightmare&timer=1&fx=0&sw=0&prefetch=0&debug=1`, { waitUntil: "domcontentloaded" });
  await until(() => out.some(l => l.includes("client connected")), 90000);
  const cmd = c => page.evaluate(t => CoFDebug.cmd(t), c);
  await cmd("sv_cheats 1");
  const t0 = Date.now();
  while (Date.now() - t0 < 300000 && !out.some(l => /carried \d+: weapon_camera/.test(l))) { await page.waitForTimeout(3000); await cmd("cof_dump"); }
  const phase = async (name, setup, ms) => {
    await cmd(setup); await page.waitForTimeout(1500);
    await page.evaluate(() => { const g = window.__oob; g.draws = 0; g.small = 0; g.sample = null; g.armed = true; });
    await page.waitForTimeout(ms);
    const r = await page.evaluate(() => { const g = window.__oob; g.armed = false; return { draws: g.draws, small: g.small, sample: g.sample }; });
    console.log(`PHASE ${name}: drawElements=${r.draws} tooSmallBuffers=${r.small} ${r.sample ? JSON.stringify(r.sample) : ""}`);
  };
  await phase("camera in hand (start room)", "echo", 4000);
  await phase("noclip -620 800 40 facing spott1", "noclip\ncof_goto -620 800 40\ncof_face spott1", 5000);
  if (process.env.PARTICLES_TEST) {
    await phase("same point, r_drawparticles 0", "r_drawparticles 0", 4000);
    await phase("same point, r_drawparticles 1", "r_drawparticles 1", 4000);
    await phase("same point, r_drawentities 0", "r_drawentities 0", 4000);
    await cmd("r_drawentities 1");
  }
  if (process.env.SPOT_TEST) {
    // which entity: the X in front of the player first, then every other X
    await phase("spott1 hidden (effects nodraw)", "cof_setkey spott1 effects 128", 4000);
    await phase("spott1 visible again", "cof_setkey spott1 effects 0", 4000);
    await phase("spott1 rendermode 0", "cof_setkey spott1 rendermode 0", 4000);
    await phase("spott1 rendermode 5 again", "cof_setkey spott1 rendermode 5", 4000);
  }
  if (process.env.WALK_TEST) {
    // the 11 X in order from open standing points, photographed, then the screamer and c_start
    await cmd("noclip");
    const spots = [["spot2", "-384 -136 21"], ["spot3", "-664 -94 21"], ["spot4", "-664 560 21"], ["spot5", "-520 684 40"],
      ["spott1", "-678 825 40"], ["spot6", "-154 684 -139"], ["spot7", "26 728 -139"], ["spot8", "70 944 -139"],
      ["spot9", "-428 944 -139"], ["spot10", "-738 854 -299"], ["spot11", "-738 -102 -299"]];
    for (const [n, pos] of spots) {
      await phase(`walk ${n}`, `cof_goto ${pos}\ncof_face ${n}`, 1500);
      await cmd("+attack"); await page.waitForTimeout(250); await cmd("-attack"); await page.waitForTimeout(2200);
    }
    await cmd("cof_count camera_spot_trigger"); await page.waitForTimeout(800);
    console.log(out.filter(l => /COF\/COUNT camera_spot_trigger/.test(l)).slice(-1)[0]);
    await cmd("cof_goto -738 -1280 -290\ncof_face headdy\n+forward"); await page.waitForTimeout(1300); await cmd("-forward");
    const t1 = Date.now();
    while (Date.now() - t1 < 40000 && !out.some(l => /Spawn Server: c_start/.test(l))) await page.waitForTimeout(500);
    console.log(`changelevel to c_start: ${out.some(l => /Spawn Server: c_start/.test(l))}`);
  }
  await page.waitForTimeout(500);
  fs.writeFileSync(`${dir}/console.log`, out.join("\n"));
  for (const l of out.filter(l => l.includes("GL2DBG")).slice(0, 3)) console.log(l);
  console.log(`page errors: ${out.filter(l => /pageerror|Uncaught/.test(l)).length}`);
} finally { await browser.close(); }
