set -euo pipefail
R='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
T=/root/cof-audits/dual-20261102
cp "$R/tools/e2e/phone_singleplayer_punch.mjs" "$T/"
PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers /root/emsdk/node/24.19.0_64bit/bin/node "$T/phone_singleplayer_punch.mjs" http://127.0.0.1:8125/ "$R/build/validation/phone-singleplayer-2026-11-02/sp-second"