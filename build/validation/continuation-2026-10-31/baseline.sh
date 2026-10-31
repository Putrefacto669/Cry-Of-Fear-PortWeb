set -eu
source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
OUT="$REPO/build/validation/continuation-2026-10-31/baseline"
mkdir "$OUT"
ln -s /root/cof-audits/browser-1.64.1/node_modules "$OUT/node_modules"
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
node -e 'console.log("Node",process.version,"Playwright",require("/root/cof-audits/browser-1.64.1/node_modules/playwright/package.json").version)'
for t in entities campaign_entities motion_entities model_entities manager_entities sound_entities camera_entities train_entities track_entities envpos_entities button_entities changelevel_entities; do
 cp "$REPO/tools/e2e/$t.mjs" "$OUT/"
 cd "$OUT"
 s=$(date +%s)
 set +e
 timeout 900 node "$t.mjs" http://127.0.0.1:8096/ > "$t.out" 2>&1
 result=$?
 set -e
 echo "$t exit=$result seconds=$(( $(date +%s)-s ))" | tee -a summary.txt
 done
