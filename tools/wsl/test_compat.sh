#!/usr/bin/env bash
# test_compat.sh - Prueba game/cof-logic/compat/win32_compat.h en Linux nativo y en WebAssembly.
#
#   wsl -d Ubuntu -- bash "/mnt/c/Users/josue/OneDrive/Desktop/cof web/tools/wsl/test_compat.sh"
set -euo pipefail

SRC="$(cd "$(dirname "$0")/../.." && pwd)/game/cof-logic/compat"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

# shellcheck disable=SC1091
source "${EMSDK_DIR:-$HOME/emsdk}/emsdk_env.sh" > /dev/null 2>&1
NODE="$(command -v node)"

echo "== nativo (gcc)"
gcc -std=gnu11 -Wall -Wextra -Werror -pthread "$SRC/test_win32_compat.c" -o "$OUT/native"
"$OUT/native"

echo "== wasm sin hilos (emcc + node, MEMFS)"
emcc -std=gnu11 -Wall -Werror -O2 "$SRC/test_win32_compat.c" -o "$OUT/nothreads.js"
"$NODE" "$OUT/nothreads.js"

# PROXY_TO_PTHREAD: main() corre en un worker, el único sitio donde se puede esperar a un hilo
echo "== wasm con -pthread (emcc + node, main en worker)"
emcc -std=gnu11 -Wall -Werror -O2 -pthread -sPROXY_TO_PTHREAD -sEXIT_RUNTIME -sPTHREAD_POOL_SIZE=5 \
    "$SRC/test_win32_compat.c" -o "$OUT/threads.js"
"$NODE" "$OUT/threads.js"

echo "== wasm con -pthread, main en el hilo principal (esperar debe fallar sin bloquear)"
emcc -std=gnu11 -Wall -Werror -O2 -pthread -sPTHREAD_POOL_SIZE=4 -DTEST_MAIN_THREAD_WAIT \
    "$SRC/test_win32_compat.c" -o "$OUT/mainwait.js"
"$NODE" "$OUT/mainwait.js"
