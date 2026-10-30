// Real server-WASM tests for motion_manager. No game resources are bundled here.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
const base = process.argv[2] || "http://127.0.0.1:8095/";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
let page;
const output = [];
const live = () => output.join("\n");
try {
  const context = await browser.newContext({ viewport: { width: 640, height: 360 } });
  page = await context.newPage();
  const errors = [];
  page.on("console", m => output.push(m.text()));
  page.on("pageerror", e => errors.push(e.message));
  const until = async (predicate, timeout = 10000) => {
    const start = Date.now();
    while (!predicate()) {
      if (Date.now() - start > timeout) throw new Error("timeout waiting for motion state");
      await new Promise(r => setTimeout(r, 50));
    }
  };
  let serial = 0;
  const command = async text => {
    const start = output.length, token = `motion_test_${++serial}`;
    await Promise.all([
      page.waitForEvent("console", { predicate: m => m.text().includes(`COF/FENCE ${token} `), timeout: 30000 }),
      page.evaluate(c => CoFDebug.cmd(c), `${text}\ncof_fence ${token}`),
    ]);
    return output.slice(start).join("\n");
  };
  const count = async classname => {
    const text = await command(`cof_count ${classname}`);
    const m = new RegExp(`COF/COUNT ${classname} (\\d+)`).exec(text);
    assert.ok(m, text); return Number(m[1]);
  };
  const expectCount = async expected => {
    for (let i = 0; i < 30; i++) {
      if (await count("cof_motion_thread") === expected) return;
      await page.waitForTimeout(50);
    }
    assert.equal(await count("cof_motion_thread"), expected);
  };
  const vec = s => s.split(",").map(Number);
  const parse = (text, prefix) => {
    const m = new RegExp(`${prefix} (?:dt=([^ ]+) )?pos=([^ ]+) vel=([^ ]+) angles=([^ ]+) avel=([^\\s]+)`).exec(text);
    assert.ok(m, text);
    return { dt: Number(m[1]), pos: vec(m[2]), vel: vec(m[3]), angles: vec(m[4]), avel: vec(m[5]) };
  };
  const records = (name, start = 0) => output.slice(start).filter(s => s.includes(`COF/MOTION ${name} `)).map(s => parse(s, `COF/MOTION ${name}`));
  const near = (actual, expected, epsilon = 0.002) => actual.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) <= epsilon, `${actual} != ${expected}`));
  const inspect = async name => parse(await command(`cof_kinematics ${name}`), `COF/KIN ${name}`);
  const key = (name, field, value) => `cof_setkey ${name} ${field} ${JSON.stringify(String(value))}`;
  const fixture = async (name, channel, mode, value, target = name) => {
    await command([
      `cof_spawn info_target ${name}`, key(name, "origin", "10 20 30"), key(name, "velocity", "7 8 9"), key(name, "angles", "11 12 13"),
      `cof_spawn motion_manager ${name}_manager`, key(`${name}_manager`, "target", target), key(`${name}_manager`, "spawnflags", 1),
      ...(channel ? [key(`${name}_manager`, channel === "pos" ? "m_iszPosition" : "m_iszFacing", value), key(`${name}_manager`, channel === "pos" ? "m_iPosMode" : "m_iFaceMode", mode)] : []),
    ].join("\n"));
  };
  const clean = async name => {
    await command(`cof_remove ${name}\ncof_remove ${name}_manager`);
    await expectCount(1);
  };

  await page.goto(`${base}?map=c_intro&timer=1&fx=0&sw=0&prefetch=0&debug=1`, { waitUntil: "domcontentloaded" });
  await until(() => live().includes("client connected"), 180000);
  await page.evaluate(() => CoFDebug.cmd("sv_cheats 1\nr_norefresh 1\npausable 0"));
  await command("cof_unfreeze !player\ncof_setkey !player movetype 8");
  assert.doesNotMatch(live(), /No spawn function for "motion_manager"/);
  assert.equal(await count("motion_manager"), 1);
  assert.equal(await count("cof_motion_thread"), 1, "unnamed c_intro manager must auto-activate with *locus=self");
  console.log("OK c_intro: real unnamed manager auto-activates; empty channels have no motion");

  for (const mode of [0, 1, 2, 3]) {
    const name = `motion_pos${mode}`;
    await fixture(name, "pos", mode, "3 6 9");
    const start = output.length;
    await command(`cof_fire ${name}_manager`);
    await until(() => records(name, start).length >= 3);
    const r = records(name, start), a = r[r.length - 2], b = r[r.length - 1];
    if (mode === 0) { near(b.pos, [3, 6, 9]); near(b.vel, [7, 8, 9]); }
    if (mode === 1) near(b.pos.map((v, i) => v - a.pos[i]), [3, 6, 9].map(v => v * b.dt));
    if (mode === 2) { near(b.vel, [3, 6, 9]); near(b.pos, [10, 20, 30]); }
    if (mode === 3) near(b.vel.map((v, i) => v - a.vel[i]), [3, 6, 9].map(v => v * b.dt));
    near(b.angles, [11, 12, 13]);
    console.log(`OK position mode ${mode}: real server state and frame-time scaling`);
    await clean(name);
  }

  for (const mode of [0, 1, 2, 3]) {
    const name = `motion_face${mode}`;
    await fixture(name, "face", mode, mode < 2 ? "0 1 0" : "10 20 30");
    const start = output.length;
    await command(`cof_fire ${name}_manager`);
    await until(() => records(name, start).length >= 3);
    const r = records(name, start), a = r[r.length - 2], b = r[r.length - 1];
    if (mode === 0) near(b.angles, [0, 90, 0]);
    if (mode === 1) near(b.angles.map((v, i) => v - a.angles[i]), [0, 90, 0].map(v => v * b.dt));
    if (mode === 2) near(b.angles.map((v, i) => v - a.angles[i]), [10, 20, 30].map(v => v * b.dt));
    if (mode === 3) { near(b.avel, [10, 20, 30]); near(b.angles, [11, 12, 13]); }
    near(b.pos, [10, 20, 30]);
    console.log(`OK facing mode ${mode}: real server angles/angular velocity`);
    await clean(name);
  }
  await fixture("motion_zero", "face", 0, "0 0 0");
  await command("cof_fire motion_zero_manager");
  await until(() => records("motion_zero").length >= 2);
  near((await inspect("motion_zero")).angles, [11, 12, 13]);
  await clean("motion_zero");
  console.log("OK zero direction preserves angles");

  // Destination expressions use the activator; this fixture never moves the player.
  await fixture("motion_locus", "pos", 0, "1 2 3", "*locus");
  await command("cof_fire motion_locus_manager motion_locus");
  await until(() => records("motion_locus").length >= 2);
  near((await inspect("motion_locus")).pos, [1, 2, 3]);
  await clean("motion_locus");
  console.log("OK *locus selects the actual activator");

  await fixture("motion_first", "pos", 0, "4 5 6", "motion_shared");
  await command(`cof_spawn info_target motion_second\n${key("motion_second", "origin", "90 90 90")}\n${key("motion_first", "targetname", "motion_shared")}\n${key("motion_second", "targetname", "motion_shared")}`);
  await command("cof_fire motion_first_manager");
  await expectCount(3);
  const shared = records("motion_shared");
  await until(() => records("motion_shared").length >= shared.length + 2);
  records("motion_shared").slice(-2).forEach(r => near(r.pos, [4, 5, 6]));
  await command("cof_remove motion_shared");
  await expectCount(2);
  await command("cof_remove motion_shared\ncof_remove motion_first_manager");
  await expectCount(1);
  console.log("OK every targetname match receives an independent worker");

  await fixture("motion_snapshot", "pos", 0, "7 8 9");
  await command("cof_fire motion_snapshot_manager");
  await until(() => records("motion_snapshot").length >= 2);
  await command(key("motion_snapshot_manager", "m_iszPosition", "99 98 97"));
  near((await inspect("motion_snapshot")).pos, [7, 8, 9]);
  await command("cof_remove motion_snapshot_manager");
  await page.waitForTimeout(100);
  near((await inspect("motion_snapshot")).pos, [7, 8, 9]);
  await command("cof_remove motion_snapshot");
  await expectCount(1);
  console.log("OK configuration snapshot; worker survives manager removal and stops with target");

  await fixture("motion_orphan", "pos", 0, "1 2 3");
  await command("cof_spawn info_target motion_activator\ncof_fire motion_orphan_manager motion_activator");
  await expectCount(2);
  await command("cof_remove motion_activator");
  await expectCount(1);
  await clean("motion_orphan");
  await fixture("motion_repeat", "pos", 0, "1 2 3");
  await command("cof_fire motion_repeat_manager\ncof_fire motion_repeat_manager");
  await expectCount(3);
  await clean("motion_repeat");
  console.log("OK locus removal disposes workers; repeated Use creates separate workers");

  await fixture("motion_bad", "pos", 0, "1 2 3");
  for (const invalid of ["calc_position_unknown", "1 2", "1 2 3 trailing", "1 nan 3", "1 inf 3", "1e999 2 3"]) {
    await command(key("motion_bad_manager", "m_iszPosition", invalid));
    assert.match(await command("cof_fire motion_bad_manager"), /motion_manager: unsupported/);
    assert.equal(await count("cof_motion_thread"), 1);
    near((await inspect("motion_bad")).pos, [10, 20, 30]);
  }
  for (const mode of ["4", "-1", "bad", "2147483648"]) {
    await command(`${key("motion_bad_manager", "m_iszPosition", "1 2 3")}\n${key("motion_bad_manager", "m_iPosMode", mode)}`);
    assert.match(await command("cof_fire motion_bad_manager"), /motion_manager: unsupported/);
    assert.equal(await count("cof_motion_thread"), 1);
  }
  await command(`${key("motion_bad_manager", "m_iPosMode", 0)}\n${key("motion_bad_manager", "spawnflags", 2)}`);
  assert.match(await command("cof_fire motion_bad_manager"), /motion_manager: unsupported/);
  await command(`${key("motion_bad_manager", "spawnflags", 0)}\n${key("motion_bad_manager", "m_iszFacing", "0 1 0")}\n${key("motion_bad_manager", "m_iFaceMode", 4)}`);
  assert.match(await command("cof_fire motion_bad_manager"), /motion_manager: unsupported/);
  await command(key("motion_bad_manager", "m_iFaceMode", 0));
  await command(`${key("motion_bad_manager", "spawnflags", 0)}\n${key("motion_bad_manager", "target", "absent_destination")}`);
  assert.match(await command("cof_fire motion_bad_manager"), /motion_manager: no destination/);
  await clean("motion_bad");
  console.log("OK invalid/unsupported expressions, modes, flags and absent targets have no side effects");

  await fixture("motion_save", "pos", 0, "4 5 6");
  await command(`${key("motion_save_manager", "m_iszFacing", "0 1 0")}\ncof_fire motion_save_manager`);
  await until(() => records("motion_save").length >= 2);
  await command("save motion_regression");
  assert.ok(await page.evaluate(() => FS.analyzePath("/rwdir/cryoffear/save/motion_regression.sav").exists));
  await command(key("motion_save_manager", "m_iszPosition", "999 888 777"));
  const connections = (live().match(/client connected/g) || []).length;
  await page.evaluate(() => CoFDebug.cmd("load motion_regression"));
  await until(() => (live().match(/client connected/g) || []).length > connections, 60000);
  await expectCount(2);
  const restoredStart = output.length;
  await command(`${key("motion_save", "origin", "40 50 60")}\n${key("motion_save", "angles", "1 2 3")}`);
  await until(() => records("motion_save", restoredStart).length >= 2);
  near((await inspect("motion_save")).pos, [4, 5, 6]);
  near((await inspect("motion_save")).angles, [0, 90, 0]);
  await command("cof_remove motion_save");
  await expectCount(1);
  await command("cof_spawn info_target motion_save\ncof_fire motion_save_manager");
  await expectCount(2);
  await page.waitForTimeout(100);
  near((await inspect("motion_save")).pos, [4, 5, 6]);
  await clean("motion_save");
  console.log("OK save/restore: live handles, manager configuration and worker count without auto-start duplication");

  // Explicitly mount the next map before asking the engine to change levels.
  assert.equal(await page.evaluate(() => CoFPreload("c_start2")), true);
  const start2 = output.length;
  await page.evaluate(() => CoFDebug.cmd("map c_start2"));
  await until(() => output.slice(start2).some(s => s.includes("client connected")), 60000);
  assert.equal(await count("cof_motion_thread"), 0);
  assert.deepEqual(errors, []);
  console.log("OK map load clears level-local workers; no JavaScript errors");
  fs.writeFileSync("motion-entities.log", live());
} catch (e) {
  if (page) try {
    await page.evaluate(() => CoFDebug.cmd("cof_motion_dump debug"));
    await new Promise(r => setTimeout(r, 200));
    fs.writeFileSync("motion-entities-failure.log", live());
  } catch (_) { }
  throw e;
} finally { await browser.close(); }
