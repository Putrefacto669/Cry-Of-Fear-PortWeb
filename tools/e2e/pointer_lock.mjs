// Exercise the actual loader adapter, including callers that ignore its promise.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source = fs.readFileSync(process.argv[2] || new URL("../../platform/web/loader.js", import.meta.url), "utf8");
const begin = source.indexOf("  const nativeRequestLock =");
const end = source.indexOf("  const nativeExitLock =", begin);
assert.ok(begin >= 0 && end > begin);
const adapter = (handler, extras, hud) => {
  class Element { requestPointerLock(options) { return handler(options); } }
  vm.runInNewContext(source.slice(begin, end), { Element, CoFExtras: extras, CoFHUD: hud });
  return new Element();
};
const error = name => Object.assign(new Error(name), { name });
const unhandled = [];
const collect = e => unhandled.push(e);
process.on("unhandledRejection", collect);
try {
  let wardrobeCalls = 0;
  const extras = { clothesOpen: true };
  const wardrobe = adapter(() => { wardrobeCalls++; return Promise.resolve(); }, extras);
  wardrobe.id = 'canvas';
  await assert.rejects(wardrobe.requestPointerLock(), e => e.name === 'InvalidStateError');
  wardrobe.requestPointerLock(); // legacy SDL ignores the rejected promise
  assert.equal(wardrobeCalls, 0, 'the wardrobe must keep its UI cursor');
  extras.clothesOpen = false;
  await wardrobe.requestPointerLock();assert.equal(wardrobeCalls, 1);
  const hud = { menuOpen: true };
  const mainMenu = adapter(() => Promise.resolve('captured'), undefined, hud);mainMenu.id='canvas';
  await assert.rejects(mainMenu.requestPointerLock(), e => e.name === 'InvalidStateError');
  hud.menuOpen=false;assert.equal(await mainMenu.requestPointerLock(),'captured');
  let calls = [];
  const ok = adapter(options => { calls.push(options); return Promise.resolve(); });
  await ok.requestPointerLock();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].unadjustedMovement, true);
  calls = [];
  const unsupported = adapter(options => {
    calls.push(options);
    return options ? Promise.reject(error("NotSupportedError")) : Promise.resolve();
  });
  await unsupported.requestPointerLock();
  assert.equal(calls.length, 2);
  assert.equal(calls[1], undefined);
  let attempts = 0;
  const deniedError = error("InvalidStateError");
  const denied = adapter(() => { attempts++; return Promise.reject(deniedError); });
  await assert.rejects(denied.requestPointerLock(), e => e === deniedError);
  assert.equal(attempts, 1, "an already locked request must not be retried");
  denied.requestPointerLock(); // SDL does not await or attach a catch.
  const failedFallback = adapter(options => Promise.reject(options ? error("NotSupportedError") : deniedError));
  failedFallback.requestPointerLock();
  const legacy = adapter(() => undefined);
  assert.equal(legacy.requestPointerLock(), undefined);
  let syncCalls = 0;
  const sync = adapter(options => {
    syncCalls++;
    if (options) throw error("NotSupportedError");
    return undefined;
  });
  assert.equal(sync.requestPointerLock(), undefined);
  assert.equal(syncCalls, 2);
  await new Promise(r => setTimeout(r, 30));
  assert.deepEqual(unhandled, [], "ignored SDL promises must not cause unhandled rejections");
  console.log("OK pointer lock: raw movement, unsupported fallback, rejection preserved, legacy APIs and ignored SDL promises");
} finally { process.off("unhandledRejection", collect); }
