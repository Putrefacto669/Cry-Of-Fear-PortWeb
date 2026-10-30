#!/usr/bin/env bash
REPO="/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
B=/root/cof-audits/browser-1.64.1; DIST=${1:-/root/cof-audits/audit-D3Kl5uly/dist-fix}
OUT=/root/cof-envpos/smoke-$(basename $DIST)-$(date +%H%M%S); mkdir -p $OUT
source /root/emsdk/emsdk_env.sh >/dev/null 2>&1
ln -s $B/node_modules $OUT/node_modules; cp $B/package.json $OUT/
cp "$REPO/tools/e2e/smoke.mjs" "$REPO/tools/e2e/pointer_lock.mjs" $OUT/
cd $OUT; export PLAYWRIGHT_BROWSERS_PATH=$B/browsers
node pointer_lock.mjs "$REPO/platform/web/loader.js" > pointer_lock.out 2>&1; echo "pointer_lock exit=$? $(tail -1 pointer_lock.out | cut -c1-120)"
python3 "$REPO/tools/serve.py" "$DIST" --port 8098 > http.log 2>&1 & SERVER=$!; sleep 2
for m in c_game_menu1 c_start; do
  timeout 600 node smoke.mjs http://127.0.0.1:8098/ $m > smoke-$m.out 2>&1; echo "smoke $m exit=$? $(tail -2 smoke-$m.out | tr '\n' ' ' | cut -c1-200)"
done
kill $SERVER; echo "OUT=$OUT"
