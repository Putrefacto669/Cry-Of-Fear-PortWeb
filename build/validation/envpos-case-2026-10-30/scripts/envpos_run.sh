#!/usr/bin/env bash
# envpos_run.sh <dist dir> <tag> [test.mjs]: serve a dist read-only and run one e2e test in a new folder
REPO="/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
B=/root/cof-audits/browser-1.64.1
DIST="$1"; TAG="$2"; TEST="${3:-$REPO/tools/e2e/envpos_entities.mjs}"
OUT=/root/cof-envpos/$TAG-$(date +%H%M%S)
mkdir -p "$OUT"
source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
ln -s "$B/node_modules" "$OUT/node_modules"; cp "$B/package.json" "$OUT/"
cp "$TEST" "$OUT/test.mjs"
python3 "$REPO/tools/serve.py" "$DIST" --port 8096 > "$OUT/http.log" 2>&1 &
SERVER=$!; sleep 2
cd "$OUT"; export PLAYWRIGHT_BROWSERS_PATH="$B/browsers"
start=$(date +%s)
timeout 900 node test.mjs http://127.0.0.1:8096/ > test.out 2>&1; code=$?
kill $SERVER
echo "exit=$code $(( $(date +%s) - start ))s OUT=$OUT"; tail -12 test.out
