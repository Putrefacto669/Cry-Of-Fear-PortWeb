set -euo pipefail
R='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
T=/root/cof-audits/extras-20261101
cp "$R/build/validation/extras-2026-11-01/pointer-probe.mjs" "$T/pointer-probe.mjs"
PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers /root/emsdk/node/24.19.0_64bit/bin/node "$T/pointer-probe.mjs" "$R/build/validation/extras-2026-11-01/pointer-probe-before.json"