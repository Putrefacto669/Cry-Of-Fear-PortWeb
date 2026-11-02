set -euo pipefail
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
TASK=/root/cof-audits/phone-hud-20261101
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export PATH=/root/emsdk/node/24.19.0_64bit/bin:$PATH
COF_EXPECT_CONTROLS=1 COF_SW=1 node "$TASK/phone_secondary_probe.mjs" https://putrefacto669.github.io/Cry-Of-Fear-PortWeb/ "$REPO/build/validation/phone-hud-publication-2026-11-01/live-browser" > "$REPO/build/validation/phone-hud-publication-2026-11-01/live-browser.log" 2>&1