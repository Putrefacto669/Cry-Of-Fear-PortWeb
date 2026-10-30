#!/usr/bin/env bash
# Full browser regression suite against dist-fix, in a new folder
REPO="/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
B=/root/cof-audits/browser-1.64.1; DIST=${1:-/root/cof-audits/audit-D3Kl5uly/dist-fix}
OUT=/root/cof-envpos/suite-$(basename $DIST)-$(date +%H%M%S); mkdir -p $OUT
source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
ln -s $B/node_modules $OUT/node_modules; cp $B/package.json $OUT/
T="entities campaign_entities motion_entities model_entities manager_entities sound_entities camera_entities train_entities track_entities envpos_entities button_entities changelevel_entities"
for t in $T; do cp "$REPO/tools/e2e/$t.mjs" $OUT/; done
python3 "$REPO/tools/serve.py" "$DIST" --port 8095 > $OUT/http.log 2>&1 & SERVER=$!; sleep 2
cd $OUT; export PLAYWRIGHT_BROWSERS_PATH=$B/browsers
for t in $T; do
  s=$(date +%s); timeout 900 node $t.mjs http://127.0.0.1:8095/ > $t.out 2>&1; c=$?
  echo "$t exit=$c $(( $(date +%s) - s ))s $(grep -m1 -E 'Error' $t.out | cut -c1-120)" | tee -a summary.txt
done
kill $SERVER; echo "OUT=$OUT"
