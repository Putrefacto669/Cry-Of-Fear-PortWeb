set -eu
repo='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
work=/root/cof-audits/flashlight-20261031
cp "$repo/tools/e2e/flashlight_probe.mjs" "$work/"
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export COF_FRAME_DELAY_MS=160
node=/root/emsdk/node/24.19.0_64bit/bin/node
"$node" "$work/flashlight_probe.mjs" http://127.0.0.1:8097/ "$repo/build/validation/flashlight-2026-10-31/index-wall90-delay160" > "$repo/build/validation/flashlight-2026-10-31/index-wall90-delay160.log" 2>&1
echo 'index-wall90-delay160 DONE'
COF_EXPECT_FIXED=1 COF_PERSISTENCE=1 "$node" "$work/flashlight_probe.mjs" http://127.0.0.1:8098/ "$repo/build/validation/flashlight-2026-10-31/view-wall90-delay160" > "$repo/build/validation/flashlight-2026-10-31/view-wall90-delay160.log" 2>&1
echo 'view-wall90-delay160 PASS'
