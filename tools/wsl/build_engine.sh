#!/usr/bin/env bash
# build_engine.sh - Compila Xash3D FWGS a WebAssembly dentro de WSL.
#
#   wsl -d Ubuntu -- bash "/mnt/c/Users/josue/OneDrive/Desktop/cof web/tools/wsl/build_engine.sh" [configure|build|all]
#   BUILD=debug ... build_engine.sh      # -O0 con DWARF para depurar en DevTools
#
# Salida en build/engine/engine/: xash3d.html, xash3d.js, xash3d.wasm
# Flags de Emscripten (WebGL 2, memoria, sin ASYNCIFY): engine/wscript, parche patches/xash3d/0001.
set -euo pipefail

WORK="${COF_WORK:-$HOME/cof-web}"
ENGINE="$WORK/engine/xash3d-fwgs"
OUT="$WORK/build/engine"
MODE="${1:-all}"
BUILD="${BUILD:-release}"

# shellcheck disable=SC1091
source "${EMSDK_DIR:-$HOME/emsdk}/emsdk_env.sh" > /dev/null 2>&1
cd "$ENGINE"

# waf solo pone -O3 al compilar; en Emscripten el nivel del enlace es el que activa wasm-opt
# y decide si el DWARF se queda dentro del .wasm, así que se pasa también por LINKFLAGS.
case "$BUILD" in
    release) WAF_TYPE=release; LINK_OPT="-O3" ;;
    debug)   WAF_TYPE=debug;   LINK_OPT="-O0 -g" ;;
    *) echo "BUILD debe ser release o debug" >&2; exit 2 ;;
esac

# rodir/ en la raíz del motor se precarga en xash3d.data si tiene contenido; vacío = sin precarga
mkdir -p rodir

if [ "$MODE" = configure ] || [ "$MODE" = all ]; then
    # --emscripten carga scripts/waifulib/c_emscripten.py (restaurado por patches/xash3d/0001)
    LINKFLAGS="$LINK_OPT" ./waf configure -o "$OUT" -T "$WAF_TYPE" --emscripten \
        --enable-gles3compat --disable-gl
fi
if [ "$MODE" = build ] || [ "$MODE" = all ]; then
    ./waf build -j"$(nproc)"
fi
