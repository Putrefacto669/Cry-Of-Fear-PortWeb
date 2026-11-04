#!/usr/bin/env bash
set -euo pipefail
# Historical distributions must first be extracted/prepared with sw_prepare.py.
# Run only against an isolated sw_fixture.py instance, never GitHub Pages.
repo=$(cd "$(dirname "$0")/../.." && pwd)
base=$1
task_root=$2
out=$3
export PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH:-/root/cof-audits/browser-1.64.1/browsers}
node_bin=${NODE_BIN:-/root/emsdk/node/24.19.0_64bit/bin/node}
test ! -e "$out/game-final"
for test_name in sw_game_update sw_matrix; do cp "$repo/tools/e2e/$test_name.mjs" "$task_root/$test_name.mjs"; done
for iteration in 2 3; do
    "$node_bin" "$task_root/sw_matrix.mjs" "$base" "$out/matrix-final-$iteration"
done
"$node_bin" "$task_root/sw_game_update.mjs" "$base" "$out/game-final" "$task_root/profile-final"
manifest=$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["fixed"]["version"])' "$out/fixture.json")
bash "$repo/tools/e2e/sw_regressions.sh" "$base" "$out/regressions-final" "$task_root" "$manifest"
"$node_bin" "$repo/tools/e2e/pointer_lock.mjs" "$repo/platform/web/loader.js"
