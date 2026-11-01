#!/usr/bin/env bash
# Requires a freshly built, packaged and served game. Does not package assets.
set -euo pipefail
WORK="${COF_WORK:-$HOME/cof-web}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
source "${EMSDK_DIR:-$HOME/emsdk}/emsdk_env.sh" >/dev/null 2>&1
node "$REPO/tools/e2e/pointer_lock.mjs"
[ -d "$WORK/e2e/node_modules/playwright" ] || { echo "Run e2e_setup.sh first" >&2; exit 2; }
COF_STAGE="${COF_STAGE:-$WORK/stage}" python3 -B "$REPO/tools/e2e/test_entity_maps.py"
COF_STAGE="${COF_STAGE:-$WORK/stage}" python3 -B "$REPO/tools/e2e/test_envpos_maps.py"
COF_STAGE="${COF_STAGE:-$WORK/stage}" python3 -B "$REPO/tools/e2e/test_padlock_maps.py"
COF_WORK="$WORK" python3 -B "$REPO/tools/e2e/test_flashlight_lightmap.py"
cp "$REPO/tools/e2e/entities.mjs" "$REPO/tools/e2e/campaign_entities.mjs" "$REPO/tools/e2e/motion_entities.mjs" "$REPO/tools/e2e/model_entities.mjs" "$WORK/e2e/"
cp "$REPO/tools/e2e/button_entities.mjs" "$REPO/tools/e2e/changelevel_entities.mjs" "$WORK/e2e/"
cp "$REPO/tools/e2e/trigger_persistence.mjs" "$REPO/tools/e2e/ambient_persistence.mjs" "$WORK/e2e/"
cp "$REPO/tools/e2e/camera_entities.mjs" "$REPO/tools/e2e/envpos_entities.mjs" "$WORK/e2e/"
cp "$REPO/tools/e2e/manager_entities.mjs" "$REPO/tools/e2e/sound_entities.mjs" "$WORK/e2e/"
cp "$REPO/tools/e2e/train_entities.mjs" "$REPO/tools/e2e/track_entities.mjs" "$WORK/e2e/"
cd "$WORK/e2e"
node entities.mjs "${1:-http://127.0.0.1:8080/}"
node campaign_entities.mjs "${1:-http://127.0.0.1:8080/}"
node motion_entities.mjs "${1:-http://127.0.0.1:8080/}"
node model_entities.mjs "${1:-http://127.0.0.1:8080/}"
node manager_entities.mjs "${1:-http://127.0.0.1:8080/}"
node sound_entities.mjs "${1:-http://127.0.0.1:8080/}"

node camera_entities.mjs "${1:-http://127.0.0.1:8080/}"

node train_entities.mjs "${1:-http://127.0.0.1:8080/}"
node track_entities.mjs "${1:-http://127.0.0.1:8080/}"

node envpos_entities.mjs "${1:-http://127.0.0.1:8080/}"

node button_entities.mjs "${1:-http://127.0.0.1:8080/}"

node changelevel_entities.mjs "${1:-http://127.0.0.1:8080/}"

node trigger_persistence.mjs "${1:-http://127.0.0.1:8080/}"
node ambient_persistence.mjs "${1:-http://127.0.0.1:8080/}"
