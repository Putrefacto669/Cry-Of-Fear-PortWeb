set -uo pipefail
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
TASK=/root/cof-audits/extras-20261101
OUT="$REPO/build/validation/extras-2026-11-01/extended-second"
mkdir "$OUT"
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export PATH=/root/emsdk/node/24.19.0_64bit/bin:$PATH
cd "$TASK"
for t in callback_behavior zoom_persistence entity_persistence_audit voice_mix_probe use_surface; do
 python3 - "$REPO/tools/e2e/$t.mjs" "$TASK/$t.mjs" <<'PY'
import sys
from pathlib import Path
s=Path(sys.argv[1]).read_text().replace('args: [','args: ["--mute-audio",').replace('args:[','args:["--mute-audio",')
Path(sys.argv[2]).write_text(s)
PY
done
for t in callback_behavior zoom_persistence voice_mix_probe; do
 if node "$t.mjs" http://127.0.0.1:8113/ "$OUT/$t" > "$OUT/$t.log" 2>&1; then echo "$t PASS"; else echo "$t FAIL"; fi
done
if COF_SAVE_TIMES=3,20 COF_CALLBACK_TRACE=1 node entity_persistence_audit.mjs http://127.0.0.1:8113/ "$OUT/persistence" > "$OUT/persistence.log" 2>&1; then echo 'persistence OBSERVED'; else echo 'persistence FAIL'; fi
export COF_USE_FIXTURE="$REPO/build/validation/continuation-2026-10-31/natural-fixed-3/checkpoints/natural_gate"
export COF_AUDIT_OUTPUT="$OUT/use_surface"
if node use_surface.mjs http://127.0.0.1:8113/ > "$OUT/use_surface.log" 2>&1; then echo 'use_surface PASS'; else echo 'use_surface FAIL'; fi