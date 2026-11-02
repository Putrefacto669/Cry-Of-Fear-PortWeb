set -uo pipefail
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
TASK=/root/cof-audits/phone-hud-20261101
OUT="$REPO/build/validation/phone-hud-2026-11-01"
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export PATH=/root/emsdk/node/24.19.0_64bit/bin:$PATH
cd "$TASK"
for test in phone_secondary_probe hud_lifecycle map_spawn_inventory callback_behavior zoom_persistence entity_persistence_audit; do cp "$REPO/tools/e2e/$test.mjs" "$TASK/"; done
if COF_LIGHT_WARM_MS=500 COF_LIGHT_COMBAT_FIRST=1 COF_COMBAT_LOCAL=1 node "$TASK/flashlight_maps.mjs" http://127.0.0.1:8111/ "$OUT/lighting-apartment3-combat" c_apartment3 > "$OUT/lighting-apartment3-combat.log" 2>&1; then echo 'lighting-apartment3-combat PASS'; else echo 'lighting-apartment3-combat FAIL'; fi
if COF_EXPECT_CONTROLS=1 node phone_secondary_probe.mjs http://127.0.0.1:8111/ "$OUT/controls-repeat" > "$OUT/controls-repeat.log" 2>&1; then echo 'controls-repeat PASS'; else echo 'controls-repeat FAIL'; fi
if node hud_lifecycle.mjs http://127.0.0.1:8111/ "$OUT/hud-transition" > "$OUT/hud-transition.log" 2>&1; then echo 'hud-transition PASS'; else echo 'hud-transition FAIL'; fi
if node map_spawn_inventory.mjs http://127.0.0.1:8111/ "$OUT/runtime-inventory" > "$OUT/runtime-inventory.log" 2>&1; then echo 'runtime-inventory PASS'; else echo 'runtime-inventory FAIL'; fi
if COF_SAVE_TIMES=3,20 COF_CALLBACK_TRACE=1 node entity_persistence_audit.mjs http://127.0.0.1:8111/ "$OUT/persistence" > "$OUT/persistence.log" 2>&1; then echo 'persistence OBSERVED'; else echo 'persistence FAIL'; fi
if node callback_behavior.mjs http://127.0.0.1:8111/ "$OUT/callback-behavior" > "$OUT/callback-behavior.log" 2>&1; then echo 'callback-behavior PASS'; else echo 'callback-behavior FAIL'; fi
if node zoom_persistence.mjs http://127.0.0.1:8111/ "$OUT/zoom" > "$OUT/zoom.log" 2>&1; then echo 'zoom PASS'; else echo 'zoom FAIL'; fi