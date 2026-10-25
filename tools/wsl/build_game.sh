#!/usr/bin/env bash
# build_game.sh - Compila la lógica del juego (client + server) como SIDE_MODULEs de WebAssembly.
#
#   wsl -d Ubuntu -- bash "/mnt/c/Users/josue/OneDrive/Desktop/cof web/tools/wsl/build_game.sh" [configure|build|all]
#   BUILD=debug|asan ... build_game.sh
#
# De momento compila hlsdk-portable (Half-Life). Cuando exista game/cof-logic, SDK_DIR apuntará allí.
set -euo pipefail

WORK="${COF_WORK:-$HOME/cof-web}"
SDK_DIR="${SDK_DIR:-$WORK/game/hlsdk-portable}"
MODE="${1:-all}"
BUILD="${BUILD:-release}"

# shellcheck disable=SC1091
source "${EMSDK_DIR:-$HOME/emsdk}/emsdk_env.sh" > /dev/null 2>&1
cd "$SDK_DIR"

# Igual que en build_engine.sh: el nivel de optimización del enlace también cuenta en los SIDE_MODULEs.
# Con ASan, motor y módulos deben compilarse con -fsanitize=address: comparten el mismo runtime.
SAN_FLAGS=""
case "$BUILD" in
    release) WAF_TYPE=release; LINK_OPT="-O3"; BUILD_DIR="$WORK/build" ;;
    debug)   WAF_TYPE=debug;   LINK_OPT="-O0 -g"; BUILD_DIR="$WORK/build" ;;
    asan)
        WAF_TYPE=none
        SAN_FLAGS="-O1 -g -fsanitize=address -fno-omit-frame-pointer"
        LINK_OPT="-O1 -gseparate-dwarf -fsanitize=address" # ver build_engine.sh
        BUILD_DIR="$WORK/build-asan"
        export WAFLOCK=.lock-waf_asan
        ;;
    *) echo "BUILD debe ser release, debug o asan" >&2; exit 2 ;;
esac
OUT="$BUILD_DIR/game"

if [ "$MODE" = configure ] || [ "$MODE" = all ]; then
    CFLAGS="$SAN_FLAGS" CXXFLAGS="$SAN_FLAGS" LINKFLAGS="$LINK_OPT" \
        ./waf configure -o "$OUT" -T "$WAF_TYPE" --emscripten
fi
if [ "$MODE" = build ] || [ "$MODE" = all ]; then
    ./waf build -j"$(nproc)"
fi
