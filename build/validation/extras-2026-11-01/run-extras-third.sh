set -euo pipefail
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
TASK=/root/cof-audits/extras-20261101
cp "$REPO/tools/e2e/extras_entities.mjs" "$TASK/"
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
/root/emsdk/node/24.19.0_64bit/bin/node "$TASK/extras_entities.mjs" http://127.0.0.1:8113/ "$REPO/build/validation/extras-2026-11-01/extras-third"