#!/usr/bin/env bash
REPO="/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
S=/mnt/c/Users/josue/AppData/Local/Temp/claude/C--Users-josue/c2c79a05-c4b9-45e7-9a8b-0ec4623056ec/scratchpad
B=/root/cof-audits/browser-1.64.1; DIST=${1:-/root/cof-audits/audit-D3Kl5uly/dist-fix}
source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
OUT=/root/cof-screamer/run-$(date +%H%M%S); mkdir -p $OUT
ln -s $B/node_modules $OUT/node_modules; cp $B/package.json $OUT/; cp $S/screamer_capture.mjs $OUT/
python3 "$REPO/tools/serve.py" "$DIST" --port 8099 > $OUT/http.log 2>&1 & SERVER=$!; sleep 2
cd $OUT; export PLAYWRIGHT_BROWSERS_PATH=$B/browsers
timeout 600 node screamer_capture.mjs http://127.0.0.1:8099/ $OUT; echo "exit=$?"
kill $SERVER
mkdir -p $S/screamer; cp $OUT/*.png $S/screamer/ 2>/dev/null; echo "OUT=$OUT"; ls $OUT
