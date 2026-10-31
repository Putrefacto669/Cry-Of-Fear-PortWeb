#!/usr/bin/env bash
# glerr_run.sh <dist> <tag>: serve a dist and run the WebGL error trace in the prelude
REPO="/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
S=/mnt/c/Users/josue/AppData/Local/Temp/claude/C--Users-josue/c2c79a05-c4b9-45e7-9a8b-0ec4623056ec/scratchpad/glerr
B=/root/cof-audits/browser-1.64.1; DIST=${1:-/root/cof-audits/audit-D3Kl5uly/dist-fix}; TAG=${2:-trace}
source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
OUT=/root/cof-glerr/$TAG-$(date +%H%M%S); mkdir -p $OUT
ln -s $B/node_modules $OUT/node_modules; cp $B/package.json $OUT/; cp $S/glerr_trace.mjs $OUT/
python3 "$REPO/tools/serve.py" "$DIST" --port 8100 > $OUT/http.log 2>&1 & SERVER=$!; sleep 2
cd $OUT; export PLAYWRIGHT_BROWSERS_PATH=$B/browsers
timeout 900 node glerr_trace.mjs http://127.0.0.1:8100/ $OUT; echo "exit=$?"
kill $SERVER; echo "OUT=$OUT"
