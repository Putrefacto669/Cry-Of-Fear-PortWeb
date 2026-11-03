set -euo pipefail
R='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
T=/root/cof-audits/dual-20261102
mkdir -p "$T"
ln -s /root/cof-audits/browser-1.64.1/node_modules "$T/node_modules"
cp "$R/tools/e2e/phone_punch.mjs" "$T/"
PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers COF_EXPECT_PUNCH=0 /root/emsdk/node/24.19.0_64bit/bin/node "$T/phone_punch.mjs" http://127.0.0.1:8117/ "$R/build/validation/dual-wield-2026-11-02/baseline-punch"