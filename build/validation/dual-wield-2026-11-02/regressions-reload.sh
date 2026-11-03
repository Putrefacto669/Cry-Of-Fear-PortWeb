set -uo pipefail
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
TASK=/root/cof-audits/dual-20261102
OUT="$REPO/build/validation/dual-wield-2026-11-02/regressions-reload"
mkdir "$OUT"
export PLAYWRIGHT_BROWSERS_PATH=/root/cof-audits/browser-1.64.1/browsers
export PATH=/root/emsdk/node/24.19.0_64bit/bin:$PATH
export COF_STAGE=/root/cof-audits/extras-20261101/stage
RUN="$TASK/runs/regressions-reload"
mkdir -p "$RUN"
cd "$RUN"
for test in test_entity_maps test_envpos_maps test_padlock_maps; do
 if python3 -B "$REPO/tools/e2e/$test.py" > "$OUT/$test.log" 2>&1; then echo "$test PASS"; else echo "$test FAIL"; fi
done
if node "$REPO/tools/e2e/pointer_lock.mjs" > "$OUT/pointer_lock.log" 2>&1; then echo 'pointer_lock PASS'; else echo 'pointer_lock FAIL'; fi
for test in entities campaign_entities motion_entities model_entities manager_entities sound_entities camera_entities train_entities track_entities envpos_entities button_entities changelevel_entities trigger_persistence ambient_persistence; do
 python3 - "$REPO/tools/e2e/$test.mjs" "$RUN/$test.mjs" <<'PY'
import sys
from pathlib import Path
s=Path(sys.argv[1]).read_text().replace('args: [','args: ["--mute-audio",').replace('args:[','args:["--mute-audio",')
Path(sys.argv[2]).write_text(s)
PY
 if node "$RUN/$test.mjs" http://127.0.0.1:8122/ > "$OUT/$test.log" 2>&1; then echo "$test PASS"; else echo "$test FAIL"; fi
done