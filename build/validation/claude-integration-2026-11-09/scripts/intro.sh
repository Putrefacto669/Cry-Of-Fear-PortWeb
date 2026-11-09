# $1 = label, $2 = url
export PATH=/root/emsdk/node/24.19.0_64bit/bin:$PATH PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
REPO="/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web"; E=/root/cof-audits/browser-1.64.1/e2e/claude; T=/root/cof-audits/integ-20261109
cp "$REPO/tools/e2e/intro_to_nightmare.mjs" $E/
cd /root/cof-audits/browser-1.64.1; O=$T/intro-$1-$(date +%H%M%S); timeout 700 node $E/intro_to_nightmare.mjs $2 $O 9 > $O.log 2>&1; echo "intro $1 exit $?"; grep -E "PASS|Error" $O.log | head -2
python3 -c "import json;r=json.load(open('$O/result.json'));print(r.get('status'));print('\n'.join(r['timeline'][-25:]));print('errors',r.get('errors'))"
