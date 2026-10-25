#!/usr/bin/env bash
# build_engine.sh - Compila Xash3D FWGS a WebAssembly dentro de WSL.
#
#   wsl -d Ubuntu -- bash "/mnt/c/Users/josue/OneDrive/Desktop/cof web/tools/wsl/build_engine.sh" [configure|build|all]
set -euo pipefail

WORK="${COF_WORK:-$HOME/cof-web}"
ENGINE="$WORK/engine/xash3d-fwgs"
OUT="$WORK/build/engine"
MODE="${1:-all}"

# shellcheck disable=SC1091
source "${EMSDK_DIR:-$HOME/emsdk}/emsdk_env.sh" > /dev/null 2>&1
cd "$ENGINE"

# El wscript del motor exige una carpeta rodir/ con los datos que se precargan en MEMFS.
mkdir -p rodir

if [ "$MODE" = configure ] || [ "$MODE" = all ]; then
    # --emscripten carga scripts/waifulib/c_emscripten.py (restaurado por patches/xash3d/0001)
    ./waf configure -o "$OUT" -T release --emscripten \
        --enable-gles3compat --disable-gl
fi
if [ "$MODE" = build ] || [ "$MODE" = all ]; then
    ./waf build -j"$(nproc)"
fi
