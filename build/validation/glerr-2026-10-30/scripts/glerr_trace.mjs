// Find the exact WebGL call that raises GL_INVALID_OPERATION in the prelude with the camera equipped.
// Wraps every WebGL2 method: after each call, getError(); the first calls that fail are recorded with
// their arguments and the JS/WASM stack. node glerr_trace.mjs <base url> <out dir>
import fs from "node:fs";
import { chromium } from "playwright";
const [base, dir] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const out = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("console", m => out.push(m.text()));
  await page.addInitScript(() => {
    const names = { 0x500: "INVALID_ENUM", 0x501: "INVALID_VALUE", 0x502: "INVALID_OPERATION", 0x505: "OUT_OF_MEMORY", 0x506: "INVALID_FRAMEBUFFER_OPERATION" };
    window.__glerr = { armed: false, total: 0, byCall: {}, first: [], frames: 0 };
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
      const ctx = getContext.call(this, type, attrs);
      if (!ctx || !/webgl2/.test(type) || ctx.__wrapped) return ctx;
      ctx.__wrapped = true;
      const proto = Object.getPrototypeOf(ctx);
      const realGetError = proto.getError.bind(ctx);
      const describe = a => a === null ? "null" : typeof a === "object" ? (a.constructor && a.constructor.name) + (a.length !== undefined ? `[${a.length}]` : "") : String(a);
      for (const key of Object.getOwnPropertyNames(proto)) {
        // getters such as canvas/drawingBufferWidth throw when read from the prototype
        const desc = Object.getOwnPropertyDescriptor(proto, key);
        const f = desc && desc.value;
        if (typeof f !== "function" || key === "getError" || key === "constructor") continue;
        ctx[key] = function (...args) {
          const r = f.apply(ctx, args);
          if (!window.__glerr.armed) return r; // no cost until armed
          const e = realGetError();
          if (e && window.__glerr.armed) {
            const g = window.__glerr; g.total++;
            const k = `${key}:${names[e] || e}`;
            g.byCall[k] = (g.byCall[k] || 0) + 1;
            if (g.first.length < 12) {
              // state that matters for draw-call errors
              const st = {};
              try {
                const p = ctx.getParameter(ctx.CURRENT_PROGRAM); st.program = !!p;
                st.vao = !!ctx.getParameter(ctx.VERTEX_ARRAY_BINDING);
                st.arrayBuffer = !!ctx.getParameter(ctx.ARRAY_BUFFER_BINDING);
                st.elementBuffer = !!ctx.getParameter(ctx.ELEMENT_ARRAY_BUFFER_BINDING);
                st.fbo = !!ctx.getParameter(ctx.FRAMEBUFFER_BINDING);
                st.activeTexture = ctx.getParameter(ctx.ACTIVE_TEXTURE) - ctx.TEXTURE0;
                st.blend = ctx.isEnabled(ctx.BLEND);
                st.depthTest = ctx.isEnabled(ctx.DEPTH_TEST);
                if (p) {
                  st.attribs = [];
                  for (let i = 0; i < ctx.getProgramParameter(p, ctx.ACTIVE_ATTRIBUTES); i++) {
                    const a = ctx.getActiveAttrib(p, i), loc = ctx.getAttribLocation(p, a.name);
                    st.attribs.push(`${a.name}@${loc}:${loc >= 0 && ctx.getVertexAttrib(loc, ctx.VERTEX_ATTRIB_ARRAY_ENABLED) ? "on" : "off"}` +
                      (loc >= 0 && ctx.getVertexAttrib(loc, ctx.VERTEX_ATTRIB_ARRAY_ENABLED) ? `(buf=${!!ctx.getVertexAttrib(loc, ctx.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING)})` : ""));
                  }
                  st.samplers = [];
                  for (let i = 0; i < ctx.getProgramParameter(p, ctx.ACTIVE_UNIFORMS); i++) {
                    const u = ctx.getActiveUniform(p, i);
                    if (u.type === ctx.SAMPLER_2D || u.type === ctx.SAMPLER_CUBE) st.samplers.push(`${u.name}=${ctx.getUniform(p, ctx.getUniformLocation(p, u.name))}`);
                  }
                }
                realGetError();
              } catch (x) { st.err = String(x); }
              g.first.push({ call: key, error: names[e] || e, args: args.map(describe), state: st, frame: g.frames, stack: new Error().stack.split("\n").slice(2, 14).map(s => s.trim()) });
            }
          }
          return r;
        };
      }
      ctx.getError = () => 0; // the engine's checks see nothing while this trace is installed
      return ctx;
    };
  });
  const until = async (fn, ms) => { const t = Date.now(); while (!(await fn())) { if (Date.now() - t > ms) throw new Error("timeout"); await page.waitForTimeout(250); } };
  await page.goto(`${base}?map=c_nightmare&timer=1&fx=0&sw=0&prefetch=0&debug=1`, { waitUntil: "domcontentloaded" });
  await until(() => out.some(l => l.includes("client connected")), 90000);
  await page.evaluate(() => MainLoop.postMainLoop.push(() => window.__glerr.frames++));
  const cmd = c => page.evaluate(t => CoFDebug.cmd(t), c);
  const snapshot = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__glerr)));
  // phase A: a short armed sample during the introduction, before the camera
  await page.evaluate(() => { window.__glerr.armed = true; });
  await page.waitForTimeout(8000);
  await page.evaluate(() => { window.__glerr.armed = false; });
  const intro = await snapshot();
  // phase B: let the level hand over the camera (cof_giveitems kakkaej at the end of the intro), unarmed
  await cmd("sv_cheats 1");
  const t0 = Date.now();
  let given = false;
  while (Date.now() - t0 < 300000) {
    if (out.some(l => /carried \d+: weapon_camera/.test(l))) { given = true; break; }
    await page.waitForTimeout(3000);
    await cmd("cof_dump");
  }
  await page.waitForTimeout(3000); // the draw animation
  await page.evaluate(() => { const g = window.__glerr; g.total = 0; g.byCall = {}; g.first = []; g.frames = 0; g.armed = true; });
  await page.waitForTimeout(20000);
  await page.evaluate(() => { window.__glerr.armed = false; });
  const camera = await snapshot();
  // per-phase sampling: clear the sticky error first so nothing older is attributed to the phase
  const phase = async (name, setup, ms) => {
    await cmd(setup);
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const g = window.__glerr; g.total = 0; g.byCall = {}; g.first = []; g.frames = 0; });
    await page.evaluate(() => { const c = document.getElementById("canvas").getContext("webgl2"); }); // same context
    await page.evaluate(() => { window.__glerr.armed = true; });
    await page.waitForTimeout(ms);
    await page.evaluate(() => { window.__glerr.armed = false; });
    const s = await snapshot();
    return { name, total: s.total, frames: s.frames, byCall: s.byCall, first: s.first.slice(0, 3) };
  };
  const phases = [];
  // B: the 11 X from open standing points in front of each one (computed from the BSP), no noclip
  const spots = [["spot2", "-384 -136 21"], ["spot3", "-664 -94 21"], ["spot4", "-664 560 21"], ["spot5", "-520 684 40"],
    ["spott1", "-678 825 40"], ["spot6", "-154 684 -139"], ["spot7", "26 728 -139"], ["spot8", "70 944 -139"],
    ["spot9", "-428 944 -139"], ["spot10", "-738 854 -299"], ["spot11", "-738 -102 -299"]];
  for (const [n, pos] of spots) phases.push(await phase(`walk ${n}`, `cof_goto ${pos}\ncof_face ${n}`, 2500));
  // C: the conditions where the error was first seen: noclip at -620 800 40 looking at spott1
  phases.push(await phase("noclip -620 800 40", "noclip\ncof_goto -620 800 40\ncof_face spott1", 5000));
  phases.push(await phase("noclip, viewmodel hidden", "r_drawviewmodel 0", 4000));
  phases.push(await phase("noclip off, same point", "r_drawviewmodel 1\nnoclip", 4000));
  for (const p of phases) console.log(`PHASE ${p.name}: errors=${p.total} frames=${p.frames} ${JSON.stringify(p.byCall)}`);
  const result = { given, intro: { total: intro.total, byCall: intro.byCall, frames: intro.frames }, camera, phases };
  fs.writeFileSync(`${dir}/glerr.json`, JSON.stringify(result, null, 1));
  fs.writeFileSync(`${dir}/console.log`, out.join("\n"));
  console.log(JSON.stringify({ given, introErrors: intro.total, introByCall: intro.byCall, cameraErrors: camera.total, cameraFrames: camera.frames, cameraByCall: camera.byCall }, null, 1));
} finally { await browser.close(); }
