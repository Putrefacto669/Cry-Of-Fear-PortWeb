set -euo pipefail
R='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
T=/root/cof-audits/extras-20261101
cp "$R/tools/e2e/extras_interactions.mjs" "$T/"
PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers /root/emsdk/node/24.19.0_64bit/bin/node "$T/extras_interactions.mjs" http://127.0.0.1:8117/ "$R/build/validation/extras-2026-11-01/interactions-repeat"