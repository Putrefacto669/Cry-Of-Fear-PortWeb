// Real prepared BSP/models and server WASM; no original resources are bundled.
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
const base = process.argv[2] || "http://127.0.0.1:8095/";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
const output = [], errors = [];
const live = () => output.join("\n");
let page;
try {
  page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  page.on("console", m => output.push(m.text()));
  page.on("pageerror", e => errors.push(e.message));
  const until = async (fn, timeout = 15000) => {
    const start = Date.now();
    while (!await fn()) {
      if (Date.now() - start > timeout) throw new Error("timeout waiting for model state");
      await new Promise(r => setTimeout(r, 100));
    }
  };
  let serial = 0;
  const command = async text => {
    const start = output.length, token = `model_test_${++serial}`;
    await Promise.all([
      page.waitForEvent("console", { predicate: m => m.text().includes(`COF/FENCE ${token} `), timeout: 30000 }),
      page.evaluate(c => CoFDebug.cmd(c), `${text}\ncof_fence ${token}`),
    ]);
    return output.slice(start).join("\n");
  };
  const key = (name, field, value) => `cof_setkey ${name} ${field} ${JSON.stringify(String(value))}`;
  const inspect = async name => {
    const text = await command(`cof_animation ${name}`);
    const line = text.split("\n").find(s => s.includes(`COF/ANIM ${name} `));
    assert.ok(line, text);
    return Object.fromEntries([...line.matchAll(/(\w+)=([^\s]+)/g)].map(m => [m[1], Number(m[2])]));
  };
  const advances = async name => {
    const a = await inspect(name);
    await until(async () => (await inspect(name)).frame !== a.frame);
  };
  await page.goto(`${base}?map=c_start&timer=1&fx=0&sw=0&prefetch=0&debug=1`, { waitUntil: "domcontentloaded" });
  await until(() => live().includes("client connected"), 180000);
  await command("sv_cheats 1\nr_norefresh 1\npausable 0\ncof_unfreeze !player\ncof_setkey !player movetype 8");
  // Derive sequence IDs from the actual mounted MDL, independent of C++ lookup.
  const sequences = await page.evaluate(() => {
    const out = {};
    for (const file of ["player3", "blacker", "slower_arm_door"]) {
      const bytes = FS.readFile(`/rodir/cryoffear/models/cutscene/${file}.mdl`);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      if (view.getInt32(0, true) !== 0x54534449 || view.getInt32(4, true) !== 10) throw new Error("unexpected studio model");
      const count = view.getInt32(164, true), offset = view.getInt32(168, true);
      const entries = {};
      for (let i = 0; i < count; i++) {
        const start = offset + i * 176;
        const label = new TextDecoder().decode(bytes.slice(start, start + 32)).split("\0")[0];
        entries[label] = i;
      }
      out[file] = entries;
    }
    return out;
  });
  const initial = [
    ["sequence1", sequences.player3.lieonground, 1, 1],
    ["sequence2", sequences.player3.look_idle, 1, 1],
    ["simon3", sequences.player3.idlegetsms2, 1, 1],
    ["sblacker", sequences.blacker.idle, 1, 1],
    ["slower_arms", sequences.slower_arm_door.idle, 0, 1],
  ];
  for (const [name, seq, on, loops] of initial) {
    assert.ok(Number.isInteger(seq), name);
    const s = await inspect(name);
    assert.equal(s.seq, seq, name); assert.equal(s.on, on, name); assert.equal(s.loops, loops, name);
    await advances(name);
  }
  console.log("OK c_start: named initial sequences, flag 1 selects Off, five real models animate");

  const prop = await inspect("padlock_air");
  await command("cof_use padlock_air toggle");
  await page.waitForTimeout(250);
  const propAfter = await inspect("padlock_air");
  assert.equal(propAfter.seq, prop.seq); assert.equal(propAfter.frame, prop.frame);
  assert.equal(propAfter.body, prop.body); assert.equal(propAfter.skin, prop.skin);
  console.log("OK static prop with only a numeric sequence remains static and preserves body/skin");

  await command(`${key("sequence1", "framerate", 0)}\n${key("sequence1", "frame", 123)}\ncof_use sequence1 on`);
  assert.equal((await inspect("sequence1")).frame, 123, "USE_ON on an active model must not restart it");
  await command("cof_use sequence1 off");
  let s = await inspect("sequence1");
  assert.equal(s.seq, sequences.player3.getup1); assert.equal(s.on, 0); assert.equal(s.loops, 0);
  await advances("sequence1");
  await command(key("sequence1", "framerate", 100));
  await until(async () => (await inspect("sequence1")).finished === 1);
  s = await inspect("sequence1");
  assert.equal(s.frame, 255); assert.equal(s.next, 0);
  await command("cof_use sequence1 off");
  assert.equal((await inspect("sequence1")).frame, 255);
  await command("cof_use sequence1 on");
  assert.equal((await inspect("sequence1")).loops, 1);
  await advances("sequence1");
  console.log("OK action 0 clamps/stops; action 1 loops; typed Use is idempotent and can restart a stopped model");

  await command(`${key("sequence1", "m_iAction_Off", 2)}\ncof_use sequence1 off\n${key("sequence1", "framerate", 100)}`);
  await until(async () => (await inspect("sequence1")).on === 1);
  s = await inspect("sequence1");
  assert.equal(s.seq, sequences.player3.lieonground); assert.equal(s.loops, 1);
  await command(`${key("sequence1", "m_iAction_Off", 0)}\n${key("sequence1", "m_iAction_On", 2)}\ncof_use sequence1 off\ncof_use sequence1 on\n${key("sequence1", "framerate", 100)}`);
  await until(async () => (await inspect("sequence1")).on === 0);
  assert.equal((await inspect("sequence1")).seq, sequences.player3.getup1);
  await command(`${key("sequence1", "m_iAction_On", 1)}\ncof_use sequence1 on`);
  console.log("OK action 2 switches to the other named state in both directions after completion");

  await command(key("sequence2", "m_iszSequence_Off", ""));
  const beforeAbsent = await inspect("sequence2");
  await command("cof_use sequence2 off");
  assert.equal((await inspect("sequence2")).seq, beforeAbsent.seq);
  await command(`${key("sequence2", "m_iszSequence_On", "unknown_sequence_regression")}\ncof_use sequence2 on`);
  assert.match(live(), /env_model sequence2: unknown sequence "unknown_sequence_regression"/);
  assert.equal((await inspect("sequence2")).seq, 0);
  await command(`${key("sequence2", "m_iszSequence_On", "look_idle")}\n${key("sequence2", "m_iszSequence_Off", "getsms1")}`);
  console.log("OK absent named channel preserves sequence; unknown label reports and falls back to sequence 0");

  await command("cof_fire slower_arms_mm");
  await until(async () => (await inspect("slower_arms")).on === 1);
  assert.equal((await inspect("slower_arms")).seq, sequences.slower_arm_door.open_door);
  await advances("slower_arms");
  await command("cof_fire multiblack");
  await until(async () => (await inspect("sblacker")).on === 0);
  assert.equal((await inspect("sblacker")).seq, sequences.blacker.walk);
  await advances("sblacker");
  console.log("OK real c_start multi_managers select open_door and walk and advance their frames");

  await command(`cof_use sequence2 off\n${key("sequence2", "framerate", 100)}`);
  await until(async () => (await inspect("sequence2")).finished === 1);
  assert.equal((await inspect("sequence2")).next, 0);
  await command(`cof_use sequence1 on\n${key("sequence1", "body", 1)}\n${key("sequence1", "skin", 0)}\n${key("sequence1", "framerate", 0)}\n${key("sequence1", "frame", 77)}`);
  await command("save model_regression");
  assert.ok(await page.evaluate(() => FS.analyzePath("/rwdir/cryoffear/save/model_regression.sav").exists));
  await command(`${key("sequence1", "m_iszSequence_Off", "unknown_after_save")}\n${key("sequence1", "body", 0)}`);
  const connections = (live().match(/client connected/g) || []).length;
  await page.evaluate(() => CoFDebug.cmd("load model_regression"));
  await until(() => (live().match(/client connected/g) || []).length > connections, 60000);
  s = await inspect("sequence1");
  assert.equal(s.frame, 77); assert.equal(s.body, 1); assert.equal(s.skin, 0); assert.equal(s.loops, 1);
  const stopped = await inspect("sequence2");
  assert.equal(stopped.frame, 255); assert.equal(stopped.finished, 1); assert.equal(stopped.next, 0);
  await command("cof_use sequence2 on");
  assert.equal((await inspect("sequence2")).seq, sequences.player3.look_idle);
  await advances("sequence2");
  await command(key("sequence1", "framerate", 1));
  await advances("sequence1");
  await command("cof_use sequence1 off");
  s = await inspect("sequence1");
  assert.equal(s.seq, sequences.player3.getup1); assert.equal(s.loops, 0); assert.equal(s.body, 1);
  await advances("sequence1");
  console.log("OK save/restore: frame, body, skin, animation state and named configuration; playback resumes and Use works");

  assert.deepEqual(errors, []);
  fs.writeFileSync("model-entities.log", live());
} catch (error) {
  fs.writeFileSync("model-entities-failure.log", live());
  throw error;
} finally { await browser.close(); }
