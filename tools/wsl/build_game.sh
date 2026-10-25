#!/usr/bin/env bash
# build_game.sh - Compila la lógica del juego (client + server) como SIDE_MODULEs de WebAssembly.
#
#   wsl -d Ubuntu -- bash "/mnt/c/Users/josue/OneDrive/Desktop/cof web/tools/wsl/build_game.sh" [configure|build|all]
#
# De momento compila hlsdk-portable (Half-Life). Cuando exista game/cof-logic, SDK_DIR apuntará allí.
set -euo pipefail

WORK="${COF_WORK:-$HOME/cof-web}"
SDK_DIR="${SDK_DIR:-$WORK/game/hlsdk-portable}"
OUT="$WORK/build/game"
MODE="${1:-all}"

# shellcheck disable=SC1091
source "${EMSDK_DIR:-$HOME/emsdk}/emsdk_env.sh" > /dev/null 2>&1
cd "$SDK_DIR"

if [ "$MODE" = configure ] || [ "$MODE" = all ]; then
    ./waf configure -o "$OUT" -T release --emscripten
fi
if [ "$MODE" = build ] || [ "$MODE" = all ]; then
    ./waf build -j"$(nproc)"
fi
