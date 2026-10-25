#!/usr/bin/env bash
# build_asan.sh - Build web de depuración de memoria: motor con AddressSanitizer/LeakSanitizer.
#
#   build_asan.sh            -> ~/cof-web/dist-asan  (servir con: serve.py ~/cof-web/dist-asan --port 8083)
#   ASAN_GAME=1 build_asan.sh   también instrumenta client/server (ver la limitación abajo)
#
# Usa su propia configuración de waf (WAFLOCK) y su propio directorio: no toca el build de producción.
# En la página: ?debug=1 y CoFDebug.leakCheck() / CoFDebug.leakTest(). Ver docs/DEBUGGING.md.
#
# Limitación (emsdk 4.0.11): cuando ASan detecta un error DENTRO de un SIDE_MODULE instrumentado,
# el informe aborta con "nested bug in the same thread" y no se ve nada. Por eso, por defecto, los
# módulos del juego van sin instrumentar (mezclar es válido: todos usan el malloc de ASan). Para
# la lógica del juego el análisis fiable es el nativo: build_native_asan.sh + leak_growth.sh.
set -euo pipefail

T="$(cd "$(dirname "$0")" && pwd)"
WORK="${COF_WORK:-$HOME/cof-web}"

BUILD=asan bash "$T/build_engine.sh" all
if [ "${ASAN_GAME:-0}" = 1 ]; then
    BUILD=asan bash "$T/build_game.sh" all
else
    BUILD=release bash "$T/build_game.sh" build
    mkdir -p "$WORK/build-asan/game/dlls" "$WORK/build-asan/game/cl_dll"
    cp "$WORK/build/game/dlls/hl_emscripten_wasm32.wasm" "$WORK/build-asan/game/dlls/"
    cp "$WORK/build/game/cl_dll/client_emscripten_wasm32.wasm" "$WORK/build-asan/game/cl_dll/"
fi
COF_BUILD="$WORK/build-asan" COF_DIST="$WORK/dist-asan" bash "$T/package.sh"
