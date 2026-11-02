set -euo pipefail
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
TASK=/root/cof-audits/extras-20261101
cp "$REPO/tools/e2e/extras_persistence.mjs" "$TASK/"
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
/root/emsdk/node/24.19.0_64bit/bin/node "$TASK/extras_persistence.mjs" http://127.0.0.1:8115/ "$REPO/build/validation/extras-2026-11-01/persistence-repeat"