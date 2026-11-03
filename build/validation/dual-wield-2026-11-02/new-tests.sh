set -uo pipefail
R='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
T=/root/cof-audits/dual-20261102
O="$R/build/validation/dual-wield-2026-11-02"
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export PATH=/root/emsdk/node/24.19.0_64bit/bin:$PATH
cp "$R/tools/e2e/phone_punch.mjs" "$R/tools/e2e/phone_punch_impact.mjs" "$R/tools/e2e/dual_hands.mjs" "$T/"
cd "$T"
COF_EXPECT_PUNCH=0 node phone_punch.mjs http://127.0.0.1:8117/ "$O/baseline-final" > "$O/baseline-final.log" 2>&1; echo "baseline exit=$?"
node phone_punch_impact.mjs http://127.0.0.1:8121/ "$O/punch-impact-first" > "$O/punch-impact-first.log" 2>&1; echo "impact exit=$?"
node dual_hands.mjs http://127.0.0.1:8121/ "$O/hands-cold-first" > "$O/hands-cold-first.log" 2>&1; echo "hands exit=$?"