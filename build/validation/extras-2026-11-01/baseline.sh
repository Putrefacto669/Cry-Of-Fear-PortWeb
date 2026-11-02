set -euo pipefail
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
TASK=/root/cof-audits/extras-20261101
mkdir -p "$TASK"
ln -s /root/cof-audits/browser-1.64.1/node_modules "$TASK/node_modules"
cp "$REPO/tools/e2e/map_spawn_inventory.mjs" "$TASK/"
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
/root/emsdk/node/24.19.0_64bit/bin/node "$TASK/map_spawn_inventory.mjs" http://127.0.0.1:8110/ "$REPO/build/validation/extras-2026-11-01/baseline" > "$REPO/build/validation/extras-2026-11-01/baseline.log" 2>&1