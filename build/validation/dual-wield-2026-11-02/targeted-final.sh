set -uo pipefail
R='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
T=/root/cof-audits/dual-20261102
O="$R/build/validation/dual-wield-2026-11-02"
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export PATH=/root/emsdk/node/24.19.0_64bit/bin:$PATH
cd "$T"
for t in dual_hands phone_punch_impact extras_persistence voice_mix_probe callback_behavior; do cp "$R/tools/e2e/$t.mjs" "$T/"; done
for pair in 'dual_hands hands-final-cold-reload' 'phone_punch_impact punch-final-reload' 'extras_persistence extras-final' 'voice_mix_probe voice-final' 'callback_behavior callbacks-final'; do
 read -r t label <<< "$pair"
 if node "$t.mjs" http://127.0.0.1:8122/ "$O/$label" > "$O/$label.log" 2>&1; then echo "$label PASS"; else echo "$label FAIL"; fi
done