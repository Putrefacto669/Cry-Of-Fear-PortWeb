// Real-map checks for the remaining campaign entities. Requires prepared assets.
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
  let serial = 0;
  const log = async () => runtime.join("\n");
  const command = async text => {
    const start = (await log()).length;
    const token = `campaign_${++serial}`;
    await Promise.all([
      page.waitForEvent("console", { predicate: m => m.text().includes(`COF/FENCE ${token} `), timeout: 30000 }),
      page.evaluate(c => CoFDebug.cmd(c), `${text}\ncof_fence ${token}`),
    ]);
    return (await log()).slice(start);
  };
  const load = async map => {
    runtime.length = 0;
    const connected = page.waitForEvent("console", { predicate: m => m.text().includes("client connected"), timeout: 180000 });
    await page.goto(`${base}?map=${map}&timer=1&fx=0&sw=0&prefetch=0&debug=1`, { waitUntil: "domcontentloaded" });
    await connected;
    await page.evaluate(() => CoFDebug.cmd("sv_cheats 1\nr_norefresh 1"));
    await command("cof_unfreeze !player\ncof_setkey !player movetype 8");
  };
  const position = text => {
    const m = /COF\/ENTITY !player .*origin=([-\d.]+),([-\d.]+),([-\d.]+)/.exec(text);
    assert.ok(m, text); return m.slice(1).map(Number);
  };

  await load("c_start2");
  assert.doesNotMatch(await log(), /No spawn function for "inter_door_disable"/);
  await command("cof_goto 0 0 0");
  const before = position(await command("cof_inspect !player"));
  await command("cof_fire cafedoors2");
  await page.waitForTimeout(1000);
  assert.deepEqual(position(await command("cof_inspect !player")), before, "spawnflag 4 starts the real cafe door disabled");
  await command("cof_fire cafedoors2en\ncof_fire cafedoors2");
  await page.waitForTimeout(1200);
  const after = position(await command("cof_inspect !player"));
  assert.equal(after[0], 972); assert.equal(after[1], 1986);
  await command("cof_setkey cafedoors2en frags 0\ncof_fire cafedoors2en\ncof_goto 0 0 0\ncof_fire cafedoors2");
  await page.waitForTimeout(1000);
  const disabled = position(await command("cof_inspect !player"));
  assert.equal(disabled[0], 0); assert.equal(disabled[1], 0);
  console.log("OK inter_door_disable: initial flag 4, enable frags=1, disable frags=0, actual cafe exit");
  fs.writeFileSync("entities-c_start2.log", await log());

  await load("c_apartmentsick");
  assert.doesNotMatch(await log(), /No spawn function for "(trigger_cofteleport|cof_bosshealthbar)"/);
  assert.match(await command("cof_inspect *9"), /class=trigger_cofteleport body=0 solid=1/);
  // Capture the actual server origin inside the callback as well as the later
  // position: movement processing can nudge the hull near elevator geometry.
  const proof = await command("cof_inspect hiss1_land1\ncof_inspect *9\ncof_touch *9\ncof_inspect !player");
  const teleported = position(proof);
  assert.match(proof, /COF\/TELEPORT hiss1_land1 origin=-2572\.0,3074\.0,485\.0 minsZ=-36\.0 yaw=270\.0 velocity=0\.0/);
  assert.ok(Math.abs(teleported[0] + 2572) <= 16 && Math.abs(teleported[1] - 3074) <= 16 && Math.abs(teleported[2] - 485) <= 16, "player remains within a hull radius of the actual exit");
  console.log("OK trigger_cofteleport: real elevator trigger and destination, standing hull adjustment");

  await command("cof_setkey theboss movetype 0\ncof_fire bossbar");
  await page.waitForFunction(() => { const b = document.getElementById("cof-bossbar"); return b && !b.hidden && Number(b.getAttribute("aria-valuemax")) > 0; }, null, { timeout: 10000, polling: 100 });
  const maximum = await page.$eval("#cof-bossbar", b => Number(b.getAttribute("aria-valuemax")));
  await command(`cof_setkey theboss health ${maximum / 2}`);
  await page.waitForFunction(h => Number(document.getElementById("cof-bossbar").getAttribute("aria-valuenow")) === h, maximum / 2, { timeout: 10000, polling: 100 });
  assert.equal(await page.$eval("#cof-bossbar .fill", b => b.style.clipPath), "inset(0px 50% 0px 0px)");
  await page.screenshot({ path: "entities-bossbar.png", timeout: 60000 });
  await command("cof_setkey theboss health 0");
  await page.waitForFunction(() => document.getElementById("cof-bossbar").hidden, null, { timeout: 10000, polling: 100 });
  console.log("OK cof_bosshealthbar: real boss, max health, half health, hidden on death");
  fs.writeFileSync("entities-c_apartmentsick.log", await log());
  assert.deepEqual(errors, [], "no JavaScript runtime errors");
} catch (e) {
  if (page) try { fs.writeFileSync("campaign-entities-failure.log", await page.evaluate(() => FS.readFile("/rwdir/engine.log", { encoding: "utf8" }))); } catch (_) { }
  throw e;
} finally { await browser.close(); }
