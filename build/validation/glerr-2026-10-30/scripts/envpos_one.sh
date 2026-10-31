#!/usr/bin/env bash
# envpos regression alone against one dist; usage: envpos_one.sh <dist> <port>
REPO="/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
B=/root/cof-audits/browser-1.64.1; DIST=$1; PORT=$2
OUT=/root/cof-envpos/envpos-$(basename $DIST)-$(date +%H%M%S); mkdir -p $OUT
ln -s $B/node_modules $OUT/node_modules; cp $B/package.json $OUT/; cp "$REPO/tools/e2e/envpos_entities.mjs" $OUT/
python3 "$REPO/tools/serve.py" "$DIST" --port $PORT > $OUT/http.log 2>&1 & SERVER=$!; sleep 2
cd $OUT; export PLAYWRIGHT_BROWSERS_PATH=$B/browsers
s=$(date +%s); timeout 900 node envpos_entities.mjs http://127.0.0.1:$PORT/ > out.txt 2>&1; c=$?
echo "$(basename $DIST) envpos exit=$c $(( $(date +%s) - s ))s"; grep -E '^OK|Error' out.txt
kill $SERVER; echo "OUT=$OUT"
