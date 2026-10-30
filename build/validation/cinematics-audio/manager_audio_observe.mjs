// Regression for real SDK multi_manager callbacks in the browser server WASM.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
const base = process.argv[2] || "http://127.0.0.1:8095/";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
const output = [], errors = [];
const diagnostics = process.env.COF_MANAGER_DIAGNOSTICS;
const trace = (event, data = {}) => {
  if (diagnostics) fs.appendFileSync(diagnostics, JSON.stringify({ wall: Date.now(), event, ...data }) + "\n");
};
const live = () => output.join("\n");
let page, profiler, timeline;
try {
  page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  page.on("console", m => {
    output.push(m.text());
    if (/COF\/FENCE|COF\/DIAG|client connected|COF\/HUD SUB/.test(m.text())) trace("console", { text: m.text() });
  });
  page.on("crash", () => trace("crash"));
  if (process.env.COF_MANAGER_TIMELINE) {
    timeline = await page.context().newCDPSession(page);
    await timeline.send("Tracing.start", {
      categories: "devtools.timeline,gpu,blink,renderer.scheduler",
      transferMode: "ReturnAsStream",
    });
  }
  if (process.env.COF_MANAGER_PROFILE) {
    profiler = await page.context().newCDPSession(page);
    await profiler.send("Profiler.enable");
    await profiler.send("Profiler.setSamplingInterval", { interval: 10000 });
    await profiler.send("Profiler.start");
  }
  if (diagnostics) await page.addInitScript(() => {
    let last = performance.now();
    setInterval(() => {
      const now = performance.now(), gap = now - last;
      if (gap > 1000) {
        console.log(`COF/DIAG event-loop gap=${gap.toFixed(1)}ms`);
        const a = typeof Module !== "undefined" && Module.cofAudio;
        if (a) console.log("COF/DIAG audio " + JSON.stringify({state:a.ctx.state,time:a.ctx.currentTime,voices:a.voices.size,buffers:a.buffers.size}));
      }
      last = now;
    }, 250);
  });
  page.on("pageerror", e => { errors.push(e.message); trace("pageerror", { text: e.message }); });
  const until = async (fn, timeout = 60000) => {
    const start = Date.now();
    while (!await fn()) {
      if (Date.now() - start > timeout) throw new Error("timeout waiting for restored multi_manager");
      await new Promise(r => setTimeout(r, 100));
    }
  };
  let serial = 0;
  const command = async text => {
    const start = output.length, token = `manager_test_${++serial}`;
    trace("command-start", { token, text });
    await Promise.all([
      page.waitForEvent("console", { predicate: m => m.text().includes(`COF/FENCE ${token} `), timeout: 30000 }),
      page.evaluate(c => { CoFDebug.cmd(c); }, `${text}\ncof_fence ${token}`).then(() => trace("command-enqueued", { token })),
    ]);
    trace("command-end", { token });
    return output.slice(start).join("\n");
  };
  const key = (name, field, value) => `cof_setkey ${name} ${field} ${JSON.stringify(String(value))}`;
  const save = async name => {
    await command(`save ${name}`);
    assert.ok(await page.evaluate(n => FS.analyzePath(`/rwdir/cryoffear/save/${n}.sav`).exists, name));
  };
  const load = async name => {
    const connections = (live().match(/client connected/g) || []).length;
    const start = output.length;
    trace("load-start", { name });
    await page.evaluate(n => CoFDebug.cmd(`load ${n}`), name);
    await until(() => (live().match(/client connected/g) || []).length > connections, 60000);
    await command("r_norefresh 1\ncof_unfreeze !player");
    trace("load-end", { name });
    return start;
  };
  const lines = start => [...output.slice(start).join("\n").matchAll(/COF\/HUD SUB (\d+)/g)].map(m => Number(m[1]));
  const count = async () => {
    const text = await command("cof_count multi_manager");
    return Number(/COF\/COUNT multi_manager (\d+)/.exec(text)[1]);
  };
  const fixture = async (name, targets, threaded = false) => {
    const cmds = [`cof_spawn multi_manager ${name}`];
    if (threaded) cmds.push(key(name, "spawnflags", 1));
    for (let i = 0; i < targets.length; i++) {
      const [line, delay] = targets[i], sub = `${name}_sub${i}`;
      cmds.push(`cof_spawn subtitle_main ${sub}`, key(sub, "linenumber", line), key(name, sub, delay));
    }
    await command(cmds.join("\n"));
  };
  await page.goto(`${base}?map=c_start&timer=1&fx=0&sw=0&prefetch=0&debug=1`, { waitUntil: "domcontentloaded" });
  await until(() => live().includes("client connected"), 180000);
  await command("sv_cheats 1\nr_norefresh 1\npausable 0\ncof_unfreeze !player\ncof_setkey !player movetype 8");
  if (diagnostics) await command("cof_manager_trace 1");

  // Keep all four original startup managers active during save/restore.
  assert.match(await command("cof_inspect multiscene1"), /class=multi_manager/);

  // Original failure: an idle real BSP manager loses both callback fields.
  await save("manager_idle");
  await load("manager_idle");
  await command("cof_fire slower_arms_mm");
  await until(async () => /COF\/ANIM slower_arms seq=1 .*on=1/.test(await command("cof_animation slower_arms")));
  console.log("OK idle real c_start multi_manager fires model sequence after save/load");
  const subtitleStart = output.length;
  await command("cof_fire slower_cam2_mm");
  await until(() => [2, 3, 4].every(n => lines(subtitleStart).includes(n)));
  assert.deepEqual(lines(subtitleStart).filter(n => [2, 3, 4].includes(n)), [2, 3, 4]);
  console.log("OK real c_start delayed replacements and subtitle order survive save/load");

  await fixture("mm_pending", [[5101, 0], [5102, 2], [5103, 4]]);
  const before = output.length;
  await command("cof_fire mm_pending");
  await until(() => lines(before).includes(5101));
  await save("manager_pending");
  const resumed = await load("manager_pending");
  assert.deepEqual(lines(resumed).filter(n => n >= 5101 && n <= 5103), [], "pending delays must not fire immediately on restore");
  await command("cof_fire mm_pending"); // Busy normal manager must ignore re-use.
  await until(() => lines(resumed).includes(5103));
  assert.deepEqual(lines(resumed).filter(n => n >= 5101 && n <= 5103), [5102, 5103]);
  console.log("OK active manager resumes only pending targets in order and stays busy");

  await save("manager_finished");
  const finished = await load("manager_finished");
  await page.waitForTimeout(250);
  assert.deepEqual(lines(finished).filter(n => n >= 5101 && n <= 5103), []);
  const reused = output.length;
  await command("cof_fire mm_pending");
  await until(() => lines(reused).includes(5103));
  assert.deepEqual(lines(reused).filter(n => n >= 5101 && n <= 5103), [5101, 5102, 5103]);
  console.log("OK completed manager remains idle on restore and can be used again");

  await command([
    "cof_spawn info_target mm_actor", key("mm_actor", "origin", "10 20 30"),
    "cof_spawn motion_manager mm_locus_motion", key("mm_locus_motion", "target", "*locus"),
    key("mm_locus_motion", "m_iszPosition", "111 222 333"),
    "cof_spawn multi_manager mm_locus", key("mm_locus", "mm_locus_motion", 2),
    "cof_fire mm_locus mm_actor",
  ].join("\n"));
  await save("manager_activator");
  await load("manager_activator");
  await until(async () => /pos=111,222,333\b/.test(await command("cof_kinematics mm_actor")));
  console.log("OK restored pending manager preserves its actual activator EHANDLE through *locus");

  await fixture("mm_threads", [[5201, 0], [5202, 3]], true);
  const originalCount = await count();
  const threads = output.length;
  await command("cof_fire mm_threads\ncof_fire mm_threads");
  await until(() => lines(threads).filter(n => n === 5201).length === 2);
  assert.equal(await count(), originalCount + 2);
  await save("manager_threads");
  const restoredThreads = await load("manager_threads");
  await until(() => lines(restoredThreads).filter(n => n === 5202).length === 2);
  assert.deepEqual(lines(restoredThreads).filter(n => n === 5201), []);
  await until(async () => await count() === originalCount);
  const newThread = output.length;
  await command("cof_fire mm_threads");
  await until(() => lines(newThread).includes(5202));
  await until(async () => await count() === originalCount);
  console.log("OK threaded clones resume independently, dispose themselves and leave source reusable");

  assert.deepEqual(errors, []);
  fs.writeFileSync("manager-entities.log", live());
} catch (error) {
  trace("failure", { text: String(error) });
  fs.writeFileSync("manager-entities-failure.log", live() + "\nPAGE_ERRORS " + JSON.stringify(errors));
  throw error;
} finally {
  if (timeline) {
    try {
      const complete = new Promise(resolve => timeline.once("Tracing.tracingComplete", resolve));
      await timeline.send("Tracing.end");
      const { stream } = await complete;
      const fd = fs.openSync(process.env.COF_MANAGER_TIMELINE, "wx");
      try {
        let chunk;
        do {
          chunk = await timeline.send("IO.read", { handle: stream });
          fs.writeSync(fd, chunk.data);
        } while (!chunk.eof);
      } finally { fs.closeSync(fd); await timeline.send("IO.close", { handle: stream }); }
    } catch (e) { trace("timeline-error", { text: String(e) }); }
  }
  if (profiler) {
    try {
      const result = await Promise.race([
        profiler.send("Profiler.stop"),
        new Promise((_, reject) => setTimeout(() => reject(new Error("profile stop timeout")), 5000)),
      ]);
      fs.writeFileSync(process.env.COF_MANAGER_PROFILE, JSON.stringify(result.profile));
    } catch (e) { trace("profile-error", { text: String(e) }); }
  }
  await browser.close();
}
