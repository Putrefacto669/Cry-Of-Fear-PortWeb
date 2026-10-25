#!/usr/bin/env bash
# build_engine.sh - Compila Xash3D FWGS a WebAssembly dentro de WSL.
#
#   wsl -d Ubuntu -- bash "/mnt/c/Users/josue/OneDrive/Desktop/cof web/tools/wsl/build_engine.sh" [configure|build|all]
#   BUILD=debug ... build_engine.sh      # -O0 con DWARF para depurar en DevTools
#   BUILD=asan  ... build_engine.sh      # AddressSanitizer + LeakSanitizer, ver tools/wsl/build_asan.sh
#
# Salida en build/engine/engine/ (build-asan/ con BUILD=asan): xash3d.html, xash3d.js, xash3d.wasm
# Flags de Emscripten (WebGL 2, memoria, sin ASYNCIFY): engine/wscript, parche patches/xash3d/0001.
set -euo pipefail

WORK="${COF_WORK:-$HOME/cof-web}"
ENGINE="$WORK/engine/xash3d-fwgs"
MODE="${1:-all}"
BUILD="${BUILD:-release}"

# shellcheck disable=SC1091
source "${EMSDK_DIR:-$HOME/emsdk}/emsdk_env.sh" > /dev/null 2>&1
cd "$ENGINE"

# waf solo pone -O3 al compilar; en Emscripten el nivel del enlace es el que activa wasm-opt
# y decide si el DWARF se queda dentro del .wasm, así que se pasa también por LINKFLAGS.
SAN_FLAGS=""
case "$BUILD" in
    release) WAF_TYPE=release; LINK_OPT="-O3"; BUILD_DIR="$WORK/build" ;;
    debug)   WAF_TYPE=debug;   LINK_OPT="-O0 -g"; BUILD_DIR="$WORK/build" ;;
    asan)
        # -T none: waf no añade optimización propia. Su tipo "asan" metería -pthread, que en
        # Emscripten activa los hilos. -O1 es lo recomendado para ASan.
        # -gseparate-dwarf: el DWARF va a <módulo>.debug.wasm. Dentro del .wasm haría que el
        # server superase los 8 MB que Chrome deja compilar de forma síncrona (dlopen fallaría),
        # y con MAIN_MODULE los nombres que pone el navegador en las pilas no son fiables:
        # los informes se simbolizan con tools/wsl/asan_symbolize.sh (emsymbolizer).
        # Memoria: ASan reserva sombra (1/8) y cuarentena, se arranca con 512 MiB.
        WAF_TYPE=none
        SAN_FLAGS="-O1 -g -fsanitize=address -fno-omit-frame-pointer"
        LINK_OPT="-O1 -gseparate-dwarf -fsanitize=address -sINITIAL_MEMORY=536870912"
        BUILD_DIR="$WORK/build-asan"
        export WAFLOCK=.lock-waf_asan # configuración aparte: no pisa la de release
        ;;
    *) echo "BUILD debe ser release, debug o asan" >&2; exit 2 ;;
esac
OUT="$BUILD_DIR/engine"

# rodir/ en la raíz del motor se precarga en xash3d.data si tiene contenido; vacío = sin precarga
mkdir -p rodir

if [ "$MODE" = configure ] || [ "$MODE" = all ]; then
    # --emscripten carga scripts/waifulib/c_emscripten.py (restaurado por patches/xash3d/0001)
    CFLAGS="$SAN_FLAGS" CXXFLAGS="$SAN_FLAGS" LINKFLAGS="$LINK_OPT" \
        ./waf configure -o "$OUT" -T "$WAF_TYPE" --emscripten --enable-gles3compat --disable-gl
fi
if [ "$MODE" = build ] || [ "$MODE" = all ]; then
    ./waf build -j"$(nproc)"
fi
