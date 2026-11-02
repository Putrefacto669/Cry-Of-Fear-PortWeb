set -euo pipefail
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
TASK=/root/cof-audits/phone-hud-20261101
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export PATH=/root/emsdk/node/24.19.0_64bit/bin:$PATH
cp "$REPO/tools/e2e/phone_secondary_probe.mjs" "$REPO/tools/e2e/hud_lifecycle.mjs" "$TASK/"
COF_EXPECT_CONTROLS=1 node "$TASK/phone_secondary_probe.mjs" http://127.0.0.1:8111/ "$REPO/build/validation/phone-hud-2026-11-01/controls-fixed"
node "$TASK/hud_lifecycle.mjs" http://127.0.0.1:8111/ "$REPO/build/validation/phone-hud-2026-11-01/hud-lifecycle"