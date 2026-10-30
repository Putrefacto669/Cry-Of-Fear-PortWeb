// Acoustic-zone regression against prepared BSPs and real client/server WASM.
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
  const until = async (fn, timeout = 30000) => {
    const start = Date.now();
    while (!await fn()) {
      if (Date.now() - start > timeout) throw new Error("timeout waiting for acoustic zone state");
      await new Promise(r => setTimeout(r, 100));
    }
  };
  let serial = 0;
  const command = async text => {
    const start = output.length, token = `sound_test_${++serial}`;
    await Promise.all([
      page.waitForEvent("console", { predicate: m => m.text().includes(`COF/FENCE ${token} `), timeout: 30000 }),
      page.evaluate(c => CoFDebug.cmd(c), `${text}\ncof_fence ${token}`),
    ]);
    return output.slice(start).join("\n");
  };
  const key = (name, field, value) => `cof_setkey ${name} ${field} ${JSON.stringify(String(value))}`;
  const cvar = async name => {
    const text = await command(name);
    const m = new RegExp(`"${name}" is "([^\"]+)"`).exec(text);
    assert.ok(m, text); return Number(m[1]);
  };
  const dspChecked = new Set();
  const room = async expected => {
    await until(async () => await cvar("room_type") === expected);
    assert.match(await command("cof_soundstate !player"), new RegExp(`COF/SOUND room=${expected} range=0 source=\\*`));
    if (!dspChecked.has(expected)) {
      // Values from the engine's built-in GoldSrc preset table, not UI state.
      const [size, reflection] = ({ 0: [0, 0], 2: [0, 0], 8: [0.05, 0.84], 17: [0.05, 0.8], 23: [0.05, 0.9] })[expected];
      await until(async () => Math.abs(await cvar("room_size") - size) < 0.001 && Math.abs(await cvar("room_refl") - reflection) < 0.001);
      dspChecked.add(expected);
    }
  };
  const loadMap = async name => {
    const start = output.length;
    await page.goto(`${base}?map=${name}&timer=1&fx=0&sw=0&prefetch=0&debug=1`, { waitUntil: "domcontentloaded" });
    await until(() => output.slice(start).some(s => s.includes("client connected")), 180000);
    await command("sv_cheats 1\nr_norefresh 1\npausable 0\ncof_unfreeze !player\ncof_setkey !player movetype 8\ncof_goto 10000 10000 10000");
    assert.doesNotMatch(output.slice(start).join("\n"), /No spawn function for "trigger_sound"/);
  };
  await loadMap("c_start");
  assert.match(await command("cof_count trigger_sound"), /COF\/COUNT trigger_sound 14/);
  assert.equal(await cvar("room_off"), 0, "engine DSP must be enabled");
  const values = [17, 0, 17, 8, 17, 23, 23, 17, 0, 8, 0, 0, 0, 2];
  for (let i = 0; i < values.length; i++) {
    const model = `*${222 + i}`, expected = values[i];
    assert.match(await command(`cof_inspect ${model}`), /class=trigger_sound body=0 solid=1/);
    assert.match(await command(`cof_touch ${model}`), new RegExp(`COF/ROOM \\*${222+i} player=1 room=${expected}\\b`));
    await room(expected);
    assert.doesNotMatch(await command(`cof_touch ${model}\ncof_touch ${model}`), /COF\/ROOM/);
  }
  console.log("OK all 14 c_start brushes: server preset, client room_type, DSP coefficients and no repeated messages on same zone");

  await command("cof_spawn info_target sound_nonplayer");
  assert.doesNotMatch(await command("cof_touch *223 sound_nonplayer\ncof_use *222 on"), /COF\/ROOM/);
  await room(2);
  console.log("OK non-player touch and Use cannot change the acoustic preset");

  await command(`cof_spawn subtitle_main sound_event\n${key("sound_event", "linenumber", 6101)}\n${key("*222", "target", "sound_event")}`);
  const event = await command("cof_touch *222\ncof_touch *222");
  assert.equal((event.match(/COF\/HUD SUB 6101/g) || []).length, 1);
  await room(17);
  assert.match(await command(key("*222", "delay", 5)), /handled=0/);
  console.log("OK target dispatch happens once per accepted zone change; delay is not guessed as an audio timer");

  // Existing SDK masters: one closed by globalstate, one without that condition.
  await command(`cof_spawn multisource sound_master_closed\n${key("sound_master_closed", "globalstate", "sound_unknown_global")}\ncof_spawn multisource sound_master\n${key("*225", "master", "sound_master_closed")}`);
  await page.waitForTimeout(200);
  assert.doesNotMatch(await command("cof_touch *225"), /COF\/ROOM/);
  await room(17);
  await command(key("*225", "master", "sound_master"));
  assert.match(await command("cof_touch *225"), /COF\/ROOM \*225 player=1 room=8/);
  await room(8);
  await command(key("*225", "master", "missing_master"));
  assert.match(await command("cof_touch *225"), /unsupported or missing master/);
  await command(key("*225", "master", "~unsupported_expression"));
  assert.match(await command("cof_touch *225"), /unsupported or missing master/);
  await command(key("*225", "master", ""));
  console.log("OK closed/open named SDK master; missing and unsupported masters fail without changing audio");

  for (const invalid of ["bad", "nan", "inf", "1e999", "-1", "29", "17 trailing"]) {
    await command(key("*222", "roomtype", invalid));
    assert.match(await command("cof_touch *222"), /unsupported roomtype/);
    await room(8);
  }
  await command(key("*222", "roomtype", "17.5"));
  assert.match(await command("cof_touch *222"), /COF\/ROOM \*222 player=1 room=17/);
  await until(async () => await cvar("room_type") === 17);
  assert.match(await command("cof_soundstate !player"), /room=17\.5/);
  await command(key("*222", "roomtype", 17));
  console.log("OK invalid preset values are rejected; finite fractional values truncate in the standard short message");

  // Real engine overlap contacts, rather than calling Touch directly.
  for (const [model, expected] of [["*223", 0], ["*222", 17], ["*225", 8], ["*227", 23]]) {
    const start = output.length;
    await command(`cof_unfreeze !player\ncof_goto ${model}`);
    await until(() => output.slice(start).some(s => s.includes(`COF/ROOM ${model} player=1 room=${expected}`)));
    await room(expected);
    await command("cof_goto 10000 10000 10000");
    await page.waitForTimeout(150);
    await room(expected);
  }
  console.log("OK real brush overlap selects presets 0/17/8/23; leaving a zone preserves the last preset");

  await command(`${key("*222", "roomtype", 23)}\n${key("*222", "master", "sound_master")}`);
  await command("save sound_regression");
  assert.ok(await page.evaluate(() => FS.analyzePath("/rwdir/cryoffear/save/sound_regression.sav").exists));
  await command(key("*222", "roomtype", 2));
  const connections = (live().match(/client connected/g) || []).length;
  await page.evaluate(() => CoFDebug.cmd("load sound_regression"));
  await until(() => (live().match(/client connected/g) || []).length > connections, 60000);
  await command("r_norefresh 1\ncof_unfreeze !player\ncof_goto 10000 10000 10000");
  await command("cof_touch *222");
  await room(23);
  await command(key("sound_master", "globalstate", "sound_unknown_global"));
  assert.doesNotMatch(await command("cof_touch *223\ncof_touch *222"), /COF\/ROOM \*222/);
  await room(0);
  console.log("OK zone room/master survive save/load and virtual Touch works after restore");

  await loadMap("c_apartment1");
  assert.match(await command("cof_count trigger_sound"), /COF\/COUNT trigger_sound 1/);
  await command("room_type 17");
  await command("cof_touch *202");
  await room(0);
  console.log("OK c_apartment1 missing roomtype defaults to 0; new map contacts work");
  assert.deepEqual(errors, []);
  fs.writeFileSync("sound-entities.log", live());
} catch (error) {
  fs.writeFileSync("sound-entities-failure.log", live());
  throw error;
} finally { await browser.close(); }
