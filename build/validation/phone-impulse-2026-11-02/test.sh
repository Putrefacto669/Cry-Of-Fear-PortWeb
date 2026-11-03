set -uo pipefail
R='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
T=/root/cof-audits/dual-20261102
O="$R/build/validation/phone-impulse-2026-11-02"
cp "$R/tools/e2e/phone_view_punch.mjs" "$T/"
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export PATH=/root/emsdk/node/24.19.0_64bit/bin:$PATH
node "$T/phone_view_punch.mjs" http://127.0.0.1:8123/ "$O/view-first" > "$O/view-first.log" 2>&1;echo "view exit=$?"
COF_EXPECT_VIEW=0 node "$T/phone_view_punch.mjs" http://127.0.0.1:8122/ "$O/baseline" > "$O/baseline.log" 2>&1;echo "baseline exit=$?"