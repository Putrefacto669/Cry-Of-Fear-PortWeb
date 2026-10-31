// Run alongside Playwright's node_modules, against a freshly packaged build.
// node entities.mjs http://127.0.0.1:8095/
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";

const base = process.argv[2] || "http://127.0.0.1:8095/";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
let page;
try {
  const context = await browser.newContext({ viewport: { width: 640, height: 360 } });
  page = await context.newPage();
  const errors = [];
  const runtime = [];
  page.on("console", m => runtime.push(m.text()));
  page.on("pageerror", e => errors.push(e.message));
  const until = async (predicate, timeout = 30000) => {
    const start = Date.now();
    while (!predicate()) {
      if (Date.now() - start > timeout) throw new Error("timeout waiting for live server output");
      await new Promise(r => setTimeout(r, 100));
    }
  };
  const live = () => runtime.join("\n");
  await page.goto(`${base}?map=c_start&timer=1&fx=0&sw=0&prefetch=0&debug=1`, { waitUntil: "domcontentloaded" });
  await until(() => live().includes("client connected"), 180000);
  // Server stdout reaches the browser immediately. engine.log is buffered and
  // must not be used as a command fence (small writes can appear much later).
  const log = async () => live();
  let serial = 0;
  const command = async text => {
    const before = await log();
    const marker = `COF/FENCE entity_test_${++serial} `;
    await Promise.all([
      page.waitForEvent("console", { predicate: m => m.text().includes(marker), timeout: 30000 }),
      page.evaluate(c => CoFDebug.cmd(c), `${text}\ncof_fence entity_test_${serial}`),
    ]);
    return (await log()).slice(before.length);
  };
  // Keep the real server simulation running; skip expensive software rendering
  // after the first frames. This is not a performance or visual regression test.
  await page.evaluate(() => CoFDebug.cmd("sv_cheats 1\nr_norefresh 1"));
  await command("host_framerate 0");
  assert.doesNotMatch(await log(), /No spawn function for "trigger_changevalue"/);
  assert.match(await command("cof_inspect fittsa"), /gate=1/, "iuser1 must be read from the real BSP");

  for (const [name, value] of [["bchange1", 13], ["slower_subbchange1", 2], ["slower_subbchange2", 3], ["slower_subbchange3", 4]]) {
    assert.match(await command(`cof_setkey sub1 linenumber 9\ncof_fire ${name}\ncof_fire sub1`), new RegExp(`COF/HUD SUB ${value}\\b`));
    console.log(`OK ${name}: sub1.linenumber=${value}`);
  }
  assert.match(await command("cof_setkey simon3 body 0\ncof_fire cchange2\ncof_inspect simon3"), /COF\/ENTITY simon3 class=env_model body=1\b/);
  console.log("OK cchange2: simon3.body=1");

  // The real multi_manager should apply replacements before firing sub1.
  const managerStart = (await log()).length;
  await command("cof_fire slower_cam2_mm");
  await until(() => /COF\/HUD SUB 2\b[\s\S]*COF\/HUD SUB 3\b[\s\S]*COF\/HUD SUB 4\b/.test(live().slice(managerStart)));
  const managerLog = (await log()).slice(managerStart);
  assert.match(managerLog, /COF\/HUD SUB 2\b[\s\S]*COF\/HUD SUB 3\b[\s\S]*COF\/HUD SUB 4\b/);
  console.log("OK slower_cam2_mm: timed subtitles 2 -> 3 -> 4");
  const blackStart = (await log()).length;
  await command("cof_fire multiblack");
  await until(() => /COF\/HUD SUB 13\b/.test(live().slice(blackStart)));
  console.log("OK multiblack: replacement precedes subtitle 13");

  for (const value of ["bad", "-1", "2147483648", "1.5"]) {
    await command(`cof_setkey cchange2 m_iszNewValue ${value}`);
    assert.match(await command("cof_fire cchange2"), /unsupported replacement/);
    assert.match(await command("cof_inspect simon3"), /body=1\b/);
  }
  await command("cof_setkey cchange2 m_iszNewValue 1");
  await command("cof_setkey cchange2 netname health");
  assert.match(await command("cof_fire cchange2"), /unsupported replacement/);
  await command("cof_setkey cchange2 netname body");
  console.log("OK invalid values and unknown property leave model unchanged");

  await command("cof_spawn subtitle_main cv_probe\ncof_setkey cv_probe linenumber 9\ncof_spawn trigger_changevalue cv_change\ncof_setkey cv_change target cv_probe\ncof_setkey cv_change netname linenumber\ncof_setkey cv_change m_iszNewValue 4242");
  assert.doesNotMatch(await command("cof_fire cv_change"), /COF\/HUD SUB 4242\b/);
  assert.match(await command("cof_fire cv_probe"), /COF\/HUD SUB 4242\b/);
  console.log("OK replacement does not activate its subtitle destination");
  await command("cof_spawn subtitle_main cv_second\ncof_setkey cv_second linenumber 9999\ncof_setkey cv_second targetname cv_probe");
  const duplicates = await command("cof_fire cv_change\ncof_fire cv_probe");
  assert.equal((duplicates.match(/COF\/HUD SUB 4242\b/g) || []).length, 1);
  assert.equal((duplicates.match(/COF\/HUD SUB 9999\b/g) || []).length, 1);
  const zero = await command("cof_setkey cv_change m_iszNewValue 0\ncof_fire cv_change\ncof_fire cv_probe");
  assert.doesNotMatch(zero, /COF\/HUD SUB 4242/);
  assert.match(zero, /COF\/HUD SUB 9999/);
  await command("cof_setkey cv_change m_iszNewValue 4242\ncof_fire cv_change");
  assert.match(await command("cof_setkey cv_change target simon3\ncof_fire cv_change"), /unsupported target env_model/);
  await command("cof_setkey cv_change target absent_entity\ncof_fire cv_change\ncof_setkey cv_change target cv_probe");
  console.log("OK first matching target only, zero, wrong target type and missing target");

  // Real c_start brush: solid, use-only message, one response per cooldown.
  assert.match(await command("cof_inspect *159"), /class=trigger_checkbrush body=0 solid=4/);
  const brush = await command("cof_setkey *159 message entity_regression_check\ncof_usemodel *159\ncof_usemodel *159");
  assert.equal((brush.match(/COF\/HUD CENTER entity_regression_check/g) || []).length, 1);
  console.log("OK trigger_checkbrush: solid brush, use and cooldown");

  await command("cof_setkey fittsa iuser1 1\ncof_setkey fittsa target cv_probe");
  assert.doesNotMatch(await command("cof_touch fittsa"), /COF\/HUD SUB 4242/);
  assert.match(await command("cof_inspect fittsa"), /gate=1/);
  assert.match(await command("cof_fire enablefitta\ncof_inspect fittsa"), /gate=0/);
  const gateStart = (await log()).length;
  await command("cof_touch fittsa");
  await until(() => live().slice(gateStart).includes("COF/HUD SUB 4242"), 10000);
  console.log("OK cof_triggeron: real trigger_once remains gated until enabled");

  assert.match(await command("cof_inspect *184"), /class=func_stairs body=0 solid=1/);
  await command("cof_unfreeze !player\ncof_setkey !player movetype 8\ncof_goto *184");
  await page.waitForTimeout(250);
  assert.match(await command("cof_inspect !player"), /speed=50\.0/);
  await command("cof_goto 10000 10000 10000\ncof_unfreeze !player");
  await page.waitForTimeout(250);
  assert.match(await command("cof_inspect !player"), /speed=150\.0/);
  console.log("OK func_stairs: 50 inside, normal walking speed outside");

  await command("cof_give weapon_glock\ncof_dump");
  assert.match(await command("cof_dump"), /carried 1: weapon_glock/);
  // save is an engine command; wait for the forwarded server mutation first.
  await command("cof_setkey cv_change iuser1 7");
  await command("save entity_regression");
  assert.ok(await page.evaluate(() => FS.analyzePath("/rwdir/cryoffear/save/entity_regression.sav").exists));
  const connections = ((await log()).match(/client connected/g) || []).length;
  await page.evaluate(() => CoFDebug.cmd("load entity_regression"));
  await until(() => (live().match(/client connected/g) || []).length > connections, 60000);
  assert.match(await command("cof_fire cchange2\ncof_inspect simon3"), /body=1/);
  assert.match(await command("cof_setkey cv_probe linenumber 9\ncof_fire cv_change\ncof_fire cv_probe"), /COF\/HUD SUB 4242/);
  assert.match(await command("cof_dump"), /carried 1: weapon_glock/);
  assert.match(await command("cof_inspect cv_change"), /gate=7/, "custom entvar must survive save/restore");
  assert.deepEqual(errors, [], "no JavaScript runtime errors");
  console.log("OK inventory, game save and JavaScript runtime");
  fs.writeFileSync("entities-engine.log", await log());
} catch (e) {
  if (page) {
    try { fs.writeFileSync("entities-failure.log", await page.evaluate(() => FS.readFile("/rwdir/engine.log", { encoding: "utf8" }))); } catch (_) { }
  }
  throw e;
} finally {
  await browser.close();
}
