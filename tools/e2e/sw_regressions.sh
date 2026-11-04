#!/usr/bin/env bash
set -euo pipefail
# Run against the isolated server while it is held on the fixed candidate.
repo=$(cd "$(dirname "$0")/../.." && pwd)
base=$1
out=$2
task_root=$3
export COF_EXPECT_MANIFEST=$4 COF_SW=1
test ! -e "$out"
mkdir -p "$out"
export PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH:-/root/cof-audits/browser-1.64.1/browsers}
node_bin=${NODE_BIN:-/root/emsdk/node/24.19.0_64bit/bin/node}
for test_name in phone_singleplayer_punch dual_hands extras_persistence; do
    cp "$repo/tools/e2e/$test_name.mjs" "$task_root/$test_name.mjs"
    "$node_bin" "$task_root/$test_name.mjs" "$base" "$out/$test_name" > "$out/$test_name.log" 2>&1
    echo "PASS $test_name"
done
