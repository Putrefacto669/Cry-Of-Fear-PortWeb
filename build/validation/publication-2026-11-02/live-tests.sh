set -uo pipefail
R='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
T=/root/cof-audits/dual-20261102
O="$R/build/validation/publication-2026-11-02"
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export PATH=/root/emsdk/node/24.19.0_64bit/bin:$PATH
export COF_SW=1 COF_EXPECT_MANIFEST=03fd8c160749
for t in phone_singleplayer_punch dual_hands extras_persistence;do cp "$R/tools/e2e/$t.mjs" "$T/";done
for pair in 'phone_singleplayer_punch live-sp' 'dual_hands live-hands' 'extras_persistence live-extras';do
 read -r t label <<< "$pair"
 if node "$T/$t.mjs" https://putrefacto669.github.io/Cry-Of-Fear-PortWeb/ "$O/$label" > "$O/$label.log" 2>&1;then echo "$label PASS";else echo "$label FAIL";fi
done