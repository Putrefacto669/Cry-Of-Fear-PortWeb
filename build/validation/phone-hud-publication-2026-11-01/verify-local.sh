set -euo pipefail
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
TASK=/root/cof-audits/phone-hud-20261101
OUT="$REPO/build/validation/phone-hud-publication-2026-11-01"
python3 -B "$OUT/verify_dist.py" > "$OUT/verify-dist.log" 2>&1
cp "$REPO/tools/e2e/phone_secondary_probe.mjs" "$TASK/"
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export PATH=/root/emsdk/node/24.19.0_64bit/bin:$PATH
COF_EXPECT_CONTROLS=1 COF_SW=1 node "$TASK/phone_secondary_probe.mjs" http://127.0.0.1:8110/ "$OUT/local-browser" > "$OUT/local-browser.log" 2>&1
printf 'PASS promoted dist: manifest and actual browser with Service Worker\n'