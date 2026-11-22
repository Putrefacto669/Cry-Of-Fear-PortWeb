// c_sewer: func_fogfield (hl.dll CFuncFogField, game/cof-logic/cof/fogfield.cpp). Four brushes, spawnflag 2
// ("Start on"), nothing triggers them. Every 0.1 s each puts max(size.x, size.y) / 170 puffs at random points of
// its footprint, at its origin's height, and only where a player is within sv_fogradius (384): additive
// sprites/mist1..5.spr that fade in and out and are removed. Checks:
// - the four exist, sv_fogradius is 384;
// - far from the canal (the spawn) no mist appears;
// - in the canal mist appears: cof_mist, model sprites/mistN.spr, rendermode 5, at the fields' height, inside
//   their footprint;
// - back away from it, the mist is gone a few seconds later (the fade ends with SUB_Remove);
// - save/load in the canal: no unknown callback, and the mist goes on.
// Usage: node sewer_fog_probe.mjs <base url> <out>
import assert from 'node:assert/strict'; import fs from 'node:fs'; import { chromium } from 'playwright';
const [base, out] = process.argv.slice(2); assert.ok(base && out && !fs.existsSync(out)); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } }), p = await ctx.newPage();
const logs = [], errors = [], r = { checks: {} }; let serial = 0, shots = 0;
p.on('console', (m) => logs.push(m.text())); p.on('pageerror', (e) => errors.push(e.message));
const wait = async (fn, what, ms = 120000) => { const t = Date.now(); while (!await fn()) { assert.ok(Date.now() - t < ms, `${what} timeout`); await p.waitForTimeout(200); } };
const cmd = async (text) => { const i = logs.length, t = `fog_${++serial}`; await Promise.all([p.waitForEvent('console', { predicate: (m) => m.text().includes(`COF/FENCE ${t} `), timeout: 60000 }), p.evaluate((c) => CoFDebug.cmd(c), `${text}\ncof_fence ${t}`)]); return logs.slice(i).join('\n'); };
const check = (k, v) => { r.checks[k] = v; console.log(JSON.stringify({ k, v })); };
const field = (l, k) => (l.match(new RegExp(`\\b${k}=(\\S+)`)) || [])[1];
const shot = async (label) => { await p.screenshot({ path: `${out}/${String(++shots).padStart(2, '0')}-${label}.png` }); };
const list = async (cls) => (await cmd(`cof_list ${cls}`)).split('\n').filter((l) => l.includes(`COF/LIST ${cls} #`))
  .map((l) => ({ o: field(l, 'origin').split(',').map(Number), rendermode: +field(l, 'rendermode'), model: field(l, 'model') }));
try {
  await p.goto(`${base}?map=c_sewer&sw=0&fx=0&timer=1&debug=1`); await wait(() => logs.some((l) => l.includes('client connected')), 'connect');
  await cmd('sv_cheats 1\nr_norefresh 0'); await p.waitForTimeout(3000);
  r.noSpawn = [...new Set(logs.filter((l) => /No spawn function/i.test(l)).map((l) => l.replace(/^\[[^\]]*\]\s*/, '')))];
  check('func_fogfield spawns', !r.noSpawn.some((l) => /func_fogfield/.test(l)));
  const fields = await list('func_fogfield'); r.fields = fields;
  check('four fog fields', fields.length === 4);
  const radius = (await cmd('sv_fogradius')).match(/"sv_fogradius" is "([^"]+)"/)?.[1]; r.radius = radius;
  check('sv_fogradius 384', radius === '384');
  // the spawn is far from the canal (y 1952-2869, z -489)
  await p.waitForTimeout(3000);
  const atSpawn = await list('cof_mist'); r.atSpawn = atSpawn.length;
  check('no mist far from the canal', atSpawn.length === 0);
  // into the canal, between *49 (1656,1952) and *50 (1728,2652), floating (noclip) just above the water
  await cmd('noclip\ncof_goto 1700 2300 -440\ncof_face 1700 2900 -470'); await p.waitForTimeout(3000);
  const inCanal = await list('cof_mist'); r.inCanal = inCanal.length; r.sample = inCanal.slice(0, 5);
  check('mist appears in the canal', inCanal.length > 0);
  check('mist sprites: sprites/mistN.spr, additive (5)', inCanal.length > 0 && inCanal.every((m) => /^sprites\/mist[1-5]\.spr$/.test(m.model) && m.rendermode === 5));
  // made at -489 and drifting up 2-5 units/s for at most ~4.5 s
  check('at the fields\' height', inCanal.every((m) => m.o[2] >= -490 && m.o[2] <= -460));
  const minX = Math.min(...fields.map((f) => f.o[0])) - 600, maxX = Math.max(...fields.map((f) => f.o[0])) + 600;
  const minY = Math.min(...fields.map((f) => f.o[1])) - 600, maxY = Math.max(...fields.map((f) => f.o[1])) + 600;
  check('within the fields\' footprint', inCanal.every((m) => m.o[0] >= minX && m.o[0] <= maxX && m.o[1] >= minY && m.o[1] <= maxY));
  await shot('canal');
  // save/load while there is mist
  await cmd('save fogprobe'); await p.waitForTimeout(1500);
  const before = logs.length;
  await cmd('load fogprobe'); await wait(() => logs.slice(before).some((l) => l.includes('client connected')), 'load');
  await cmd('sv_cheats 1\nnoclip\ncof_goto 1700 2300 -440'); await p.waitForTimeout(3000);
  const afterLoad = await list('cof_mist'); r.afterLoad = afterLoad.length;
  r.saveErrors = logs.filter((l) => /COF\/SAVE (unknown|unsupported)/.test(l));
  check('save/load: no unknown callback', r.saveErrors.length === 0);
  check('the mist goes on after loading', afterLoad.length > 0);
  // away from the canal: the puffs stop, the ones made fade and are removed (in at most ~4.5 s)
  await cmd('cof_goto 1945 175 -88'); await p.waitForTimeout(6000);
  const away = await list('cof_mist'); r.away = away.length;
  check('gone a few seconds after leaving', away.length === 0);
  r.errors = errors; check('no page errors', errors.length === 0);
  r.passed = Object.values(r.checks).every(Boolean);
} catch (e) { r.failure = String(e.stack); }
finally { fs.writeFileSync(`${out}/result.json`, JSON.stringify(r, null, 2)); fs.writeFileSync(`${out}/engine.log`, logs.join('\n')); await browser.close(); }
console.log(r.passed ? `PASS sewer fog ${r.inCanal} mist sprites in the canal` : `FAIL ${r.failure || JSON.stringify(r.checks)}`);
process.exitCode = r.passed ? 0 : 1;
