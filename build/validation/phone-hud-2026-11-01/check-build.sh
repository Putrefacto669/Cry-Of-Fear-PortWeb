set -euo pipefail
REPO='/mnt/c/Users/josue/OneDrive/Desktop/Cry Of Fear Web Alpha Version/Cry-Of-Fear-Port-Web'
WORK=/root/cof-audits/audit-D3Kl5uly
OUT="$REPO/build/validation/phone-hud-2026-11-01"
git -C "$WORK/game/hlsdk-portable" apply --check --reverse "$REPO/patches/hlsdk/0001-root.patch"
git -C "$WORK/engine/xash3d-fwgs" apply --check --reverse "$REPO/patches/xash3d/0001-root.patch"
COF_WORK="$WORK" python3 -B "$REPO/tools/e2e/test_flashlight_lightmap.py"
sha256sum "$WORK/build/game/dlls/hl_emscripten_wasm32.wasm" "$WORK/build/game/cl_dll/client_emscripten_wasm32.wasm"