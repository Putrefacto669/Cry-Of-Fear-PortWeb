set -euo pipefail
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
TASK=/root/cof-audits/phone-hud-20261101
mkdir -p "$TASK"
ln -sfn /root/cof-audits/browser-1.64.1/node_modules "$TASK/node_modules"
cp "$REPO/tools/e2e/phone_secondary_probe.mjs" "$TASK/"
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
/root/emsdk/node/24.19.0_64bit/bin/node "$TASK/phone_secondary_probe.mjs" http://127.0.0.1:8110/ "$REPO/build/validation/phone-hud-2026-11-01/baseline"