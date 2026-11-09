SP=/mnt/c/Users/josue/AppData/Local/Temp/claude/5ca423ac58aab436/c2c79a05-c4b9-45e7-9a8b-0ec4623056ec/scratchpad
T=/root/cof-audits/integ-20261109
REPO="/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"
E=/root/cof-audits/browser-1.64.1/e2e/claude; URL=http://127.0.0.1:8097/
export PATH=/root/emsdk/node/24.19.0_64bit/bin:$PATH PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
MAN=$(grep -o '"version": "[0-9a-f]*"' $T/merge/sw-manifest.js | cut -d'"' -f4); echo "MANIFEST $MAN"
for i in $(seq 1 30); do curl -s -o /dev/null $URL && break; sleep 1; done
cd /root/cof-audits/browser-1.64.1
cp "$REPO/tools/e2e/pointer_lock.mjs" "$REPO/tools/e2e/rain_option.mjs" $E/
echo "--- pointer lock"; node $E/pointer_lock.mjs "$REPO/platform/web/loader.js" 2>&1 | tail -1
echo "--- rain option"; O=$T/rain-$(date +%H%M%S); timeout 600 node $E/rain_option.mjs $URL $O > $O.log 2>&1; echo "rain exit $?"; grep -E "PASS|Error" $O.log | head -3
/usr/bin/python3 $SP/ri_r.py $URL $MAN
